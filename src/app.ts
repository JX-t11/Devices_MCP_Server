import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import ds from  '@/data-source';
import { config } from '@/config';
import { requestLogger, errorHandler, corsOptions } from '@/middleware';
import { McpRoutes } from '@/routes/mcp';
import { ApiRoutes } from '@/routes/api';
import { PluginRoutes } from '@/routes/plugin';
import { redisService } from '@/services/redisService';
import { mqttService } from '@/services/mqttService';
import { logger } from '@/utils/logger';

export class App {
  private app: express.Application;
  private mcpRoutes: McpRoutes;
  private apiRoutes: ApiRoutes;
  private pluginRoutes: PluginRoutes;

  constructor() {
    this.app = express();
    this.mcpRoutes = new McpRoutes();
    this.apiRoutes = new ApiRoutes();
    this.pluginRoutes = new PluginRoutes();
    this.initDB();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private async initDB(): Promise<void> {
    try {
      await ds.initialize()
      logger.info('Database connected');
    } catch (e) {
      logger.error("Error during Data Source initialization:", e);
      if (e instanceof Error) {
        logger.error("Error message:", e.message);
        logger.error("Error stack:", e.stack);
      }
    }
  };

  private setupMiddleware(): void {
    // 基础中间件
    this.app.use(express.json());
    this.app.use(cors(corsOptions));
    this.app.use(requestLogger);
  }

  private setupRoutes(): void {
    // MCP 路由
    this.app.post('/mcp', (req, res) => this.mcpRoutes.handlePost(req, res));
    this.app.get('/mcp', (req, res) => this.mcpRoutes.handleSessionRequest(req, res));
    this.app.delete('/mcp', (req, res) => this.mcpRoutes.handleSessionRequest(req, res));

    // 申请token，限制请求频率
    this.app.post('/token/get', (req, res) => this.apiRoutes.getToken(req, res));
    // 获取refresh token
    this.app.post('/token/getRefreshToken', (req, res) => this.apiRoutes.getRefreshToken(req, res));
    // 刷新token
    this.app.post('/token/refresh', (req, res) => this.apiRoutes.refreshToken(req, res));

    /** 设备 路由 **/
    // 注册产品
    this.app.post('/product/register', (req, res) => this.apiRoutes.registerProduct(req, res));
    // 注册设备
    this.app.post('/device/register', (req, res) => this.apiRoutes.registerDevice(req, res));
    // 更新设备产品信息
    this.app.post('/device/update', (req, res) => this.apiRoutes.updateDevice(req, res));
    // 设备间授权
    this.app.post('/device/authorize', (req, res) => this.apiRoutes.authorizeDevice(req, res));
    // 获取设备的有权操作（被授权）列表
    this.app.post('/device/authorizedList', (req, res) => this.apiRoutes.getAuthorizedDevices(req, res));
    // 获取设备的授权列表
    this.app.post('/device/authorizingList', (req, res) => this.apiRoutes.getAuthorizingDevices(req, res));
    // 获取设备的token
    this.app.post('/device/getToken', (req, res) => this.apiRoutes.getDeviceToken(req, res));

    // 健康检查
    this.app.get('/health', (req, res) => {
      res.json(this.mcpRoutes.getHealthInfo());
    });

    // 错误处理中间件
    this.app.use(errorHandler);
  }

  public start(): void {
    this.app.listen(config.port, () => {
      logger.info('MCP Server started', {
        port: config.port,
        name: config.name,
        version: config.version,
        healthCheck: `http://localhost:${config.port}/health`,
      });
    });
  }

  public getApp(): express.Application {
    return this.app;
  }
}
