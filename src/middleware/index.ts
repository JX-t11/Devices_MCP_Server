import { Request, Response, NextFunction } from 'express';
import { config, isDevelopment } from '@/config';
import { logger } from '@/utils/logger';

// 请求日志中间件
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
};

// 错误处理中间件
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
  });

  res.status(500).json({
    jsonrpc: '2.0',
    error: {
      code: -32603,
      message: 'Internal server error',
      data: isDevelopment ? err.message : undefined,
    },
    id: null,
  });
};

// 会话验证中间件
export const validateSession = (req: Request, res: Response, next: NextFunction) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  if (!sessionId) {
    logger.warn('Missing session ID', { path: req.path });
    return res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Missing session ID',
      },
      id: null,
    });
  }

  next();
};

// CORS 配置
export const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'mcp-session-id'],
  // enableDnsRebindingProtection: true
};
