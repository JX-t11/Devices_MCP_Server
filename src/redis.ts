import Redis from 'ioredis';
import { config, redisConfig } from '@/config';
import { logger } from '@/utils/logger';

// 创建 Redis 客户端实例
const redisClient = new Redis({
  host: redisConfig.host,    // Redis 服务器地址
  port: redisConfig.port,           // 端口号
  password: redisConfig.password,         // 密码（如无密码可省略）
  db: redisConfig.db,               // 数据库编号
  retryStrategy(times) {
    // 重试策略：随着重试次数增加，重试间隔逐渐延长
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError(err) {
    return false;
  },
  maxRetriesPerRequest: 3, // 每个请求的最大重试次数
  enableReadyCheck: true,  // 启用就绪检查
});

// 监听连接事件
redisClient.on('connect', () => {
  logger.info('Redis connecting...');
});

// 监听就绪事件（连接成功并可以开始操作）
redisClient.on('ready', () => {
  logger.info('Redis connected');
});

// 监听错误事件
redisClient.on('error', (err) => {
  logger.error('Redis 错误:', err);
});

// 监听重连事件
redisClient.on('reconnecting', (delay: number, attempt: number) => {
  logger.info(`Redis 正在重连（第 ${attempt} 次），延迟 ${delay}ms`);
});

// 监听断开连接事件
redisClient.on('end', () => {
  logger.info('Redis 连接已关闭');
});

export default redisClient;