import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { McpServerService } from '@/services/mcpService';
import { logger } from '@/utils/logger';
import requestIp from 'request-ip';
import { tokenGenerator } from '@/utils/oauth2TokenGenerator';

export class McpRoutes {
  private mcpService: McpServerService;

  constructor() {
    this.mcpService = new McpServerService();
  }

  /**
 * 从Authorization头中提取token
 */
  private extractTokenFromHeader(authorizationHeader?: string): string | null {
    if (!authorizationHeader) return null;
    return authorizationHeader.startsWith('Bearer ') 
      ? authorizationHeader.substring(7).trim() 
      : null;
  }

  /**
   * 发送标准化的错误响应
   */
  private sendErrorResponse(res: Response, statusCode: number, message: string): void {
    res.status(statusCode).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: message,
      },
      id: null,
    });
  }
  
  // 处理POST请求（客户端到服务器通信）
  async handlePost(req: Request, res: Response): Promise<void> {
    
    // 获取真实IP
    const realIp = requestIp.getClientIp(req) || req.ip;
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    const token = this.extractTokenFromHeader(req.headers['authorization']);

    req.headers['x-real-ip'] = realIp;
    (req as any).realIp = realIp;

    const sessionManager = this.mcpService.getSessionManager();
    let transport: StreamableHTTPServerTransport;

    try {
      if (!token) {
        this.sendErrorResponse(res, 400, 'Unauthorized: Token is required');
        logger.error('Unauthorized: Token is required');
        return;
      }

      let tokenInfo = await tokenGenerator.validateToken(token);
      // 验证token
      if (!tokenInfo) {
        this.sendErrorResponse(res, 401, 'Unauthorized: Invalid token');
        logger.error('Unauthorized: Invalid token')
        return;
      }

      if (sessionId && sessionManager.getSession(sessionId)) {
        // 重用现有传输层
        transport = sessionManager.getSession(sessionId)!;
        sessionManager.refreshSession(sessionId);
        // logger.info('Reusing existing session', { sessionId });
      } 
      else if (!sessionId && McpServerService.isValidInitializationRequest(req.body)) {
        // 新的初始化请求
        const newSessionId = randomUUID();
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => newSessionId,
          onsessioninitialized: (sessionId) => {
            sessionManager.addSession(sessionId, transport);
          },
        });
        await this.mcpService.handleInitialization(transport, newSessionId, tokenInfo.device_key);
        logger.info('New MCP session initialized', { sessionId: newSessionId });
      }
      else {
        // 无效请求
        logger.warn('Invalid MCP request', {
          hasSessionId: !!sessionId,
          isInitRequest: McpServerService.isValidInitializationRequest(req.body),
          realIp
        });
        this.sendErrorResponse(res, 400, 'Bad Request: No valid session ID provided');
        return;
      }

      // 处理请求
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      logger.error('Error handling MCP request', {
        error: error instanceof Error ? error.message : String(error),
        sessionId: sessionId || 'unknown',
        realIp
      });
      this.sendErrorResponse(res, 500, 'Internal server error');
    }
  }

  // 处理GET和DELETE请求的通用处理器
  async handleSessionRequest(req: Request, res: Response): Promise<void> {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    const sessionManager = this.mcpService.getSessionManager();

    if (!sessionId || !sessionManager.getSession(sessionId)) {
      logger.warn('Invalid session request', {
        sessionId: sessionId || 'missing',
        method: req.method,
        hasSession: sessionId ? !!sessionManager.getSession(sessionId) : false,
      });
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    const transport = sessionManager.getSession(sessionId)!;
    sessionManager.refreshSession(sessionId);

    try {
      await transport.handleRequest(req, res);
      logger.debug('Session request handled', {
        sessionId,
        method: req.method,
      });
    } catch (error) {
      logger.error('Error handling session request', {
        error: error instanceof Error ? error.message : String(error),
        sessionId: sessionId || 'unknown',
        method: req.method,
      });
      res.status(500).send('Internal server error');
    }
  }

  // 获取健康检查信息
  getHealthInfo(): any {
    const sessionManager = this.mcpService.getSessionManager();
    const healthInfo = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      activeSessions: sessionManager.getActiveSessionsCount(),
    };

    logger.debug('Health check requested', healthInfo);
    return healthInfo;
  }
}
