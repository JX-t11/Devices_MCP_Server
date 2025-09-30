import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { TransportManager } from '@/types';
import { sessionConfig } from '@/config';
import { logger } from '@/utils/logger';

export class SessionManager {
  private transports: TransportManager = {};
  private sessionTimeouts: { [sessionId: string]: NodeJS.Timeout } = {};

  // 添加会话
  addSession(sessionId: string, transport: StreamableHTTPServerTransport): void {
    if (Object.keys(this.transports).length >= sessionConfig.maxSessions) {
      logger.error('Maximum sessions reached', {
        current: this.transports.length,
        max: sessionConfig.maxSessions,
      });
      throw new Error('Maximum sessions reached');
    }

    this.transports[sessionId] = transport;
    this.setSessionTimeout(sessionId);
    logger.info('Session added', {
      sessionId,
      totalSessions: this.getActiveSessionsCount(),
    });
  }

  // 获取会话
  getSession(sessionId: string): StreamableHTTPServerTransport | undefined {
    return this.transports[sessionId];
  }

  // 移除会话
  removeSession(sessionId: string): void {
    if (this.transports[sessionId]) {
      delete this.transports[sessionId];

      // 清除超时定时器
      if (this.sessionTimeouts[sessionId]) {
        clearTimeout(this.sessionTimeouts[sessionId]);
        delete this.sessionTimeouts[sessionId];
      }

      logger.info('Session removed', {
        sessionId,
        totalSessions: this.getActiveSessionsCount(),
      });
    }
  }

  // 获取活跃会话数量
  getActiveSessionsCount(): number {
    return Object.keys(this.transports).length;
  }

  // 获取所有会话ID
  getSessionIds(): string[] {
    return Object.keys(this.transports);
  }

  // 设置会话超时
  private setSessionTimeout(sessionId: string): void {
    // 清除现有超时
    if (this.sessionTimeouts[sessionId]) {
      clearTimeout(this.sessionTimeouts[sessionId]);
    }

    // 设置新超时
    this.sessionTimeouts[sessionId] = setTimeout(() => {
      logger.warn('Session timed out', { sessionId });
      this.removeSession(sessionId);
    }, sessionConfig.sessionTimeout);
  }

  // 刷新会话超时
  refreshSession(sessionId: string): void {
    if (this.transports[sessionId]) {
      this.setSessionTimeout(sessionId);
      // logger.info('Session refreshed', { sessionId });
    }
  }

  // 清理所有会话
  clearAllSessions(): void {
    const sessionCount = this.getActiveSessionsCount();
    Object.keys(this.sessionTimeouts).forEach((sessionId) => {
      clearTimeout(this.sessionTimeouts[sessionId]);
    });

    this.transports = {};
    this.sessionTimeouts = {};
    logger.info('All sessions cleared', { clearedCount: sessionCount });
  }
}
