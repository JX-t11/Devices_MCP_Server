import { ServerConfig } from '@/types';

// 环境变量配置 - 热重载测试
export const config: ServerConfig = {
  port: parseInt(process.env.PORT || '9090'),
  name: process.env.SERVER_NAME || 'mcp-server',
  version: process.env.SERVER_VERSION || '1.0.0'
};

// 开发环境配置
export const isDevelopment = process.env.NODE_ENV === 'development';

// 日志配置
export const logConfig = {
  level: process.env.LOG_LEVEL || 'info',
  enableConsole: isDevelopment
};

// 会话配置
export const sessionConfig = {
  maxSessions: parseInt(process.env.MAX_SESSIONS || '100'),
  sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '300000') // 5分钟
};

// mysql配置
export const mysqlConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  username: process.env.MYSQL_USERNAME || 'root',
  password: process.env.MYSQL_PASSWORD || '123456',
  database: process.env.MYSQL_DATABASE || 'mcp'
};

// redis配置
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || '',
  db: parseInt(process.env.REDIS_DB || '0')
};

// mqtt配置
export const mqttConfig = {
  host: process.env.MQTT_HOST || 'localhost',
  port: parseInt(process.env.MQTT_PORT || '1883'),
  username: process.env.MQTT_USERNAME || 'admin',
  password: process.env.MQTT_PASSWORD || 'admin'
};
