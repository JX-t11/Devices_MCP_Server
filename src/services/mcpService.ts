import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { config } from '@/config';
import { SessionManager } from '@/services/sessionManager';
import { registerTools, registerResources, registerPrompts } from '@/tools';

export class McpServerService {
  private sessionManager: SessionManager;

  constructor() {
    this.sessionManager = new SessionManager();
  }

  // 处理初始化请求
  async handleInitialization(
    transport: StreamableHTTPServerTransport,
    sessionId: string,
    device_key: string
  ): Promise<void> {
    // 设置传输层关闭回调
    transport.onclose = () => {
      this.sessionManager.removeSession(sessionId);
    };

    await this.createServer(transport, device_key);
  }

  // 创建新的MCP服务器实例
  async createServer(transport: StreamableHTTPServerTransport, device_key: string): Promise<void> {
    const server = new McpServer({
      name: config.name,
      version: config.version,
    }, {
      debouncedNotificationMethods: [
        'notifications/tools/list_changed',
        'notifications/resources/list_changed',
        'notifications/prompts/list_changed'
      ]
    });

    // 注册所有工具
    await registerTools(server, device_key);

    // 注册资源
    registerResources(server);
    
    // 注册提示词
    registerPrompts(server);

    // 连接到传输层
    await server.connect(transport);
  }


  // 获取会话管理器
  getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  // 验证初始化请求
  static isValidInitializationRequest(body: any): boolean {
    return isInitializeRequest(body);
  }
}
