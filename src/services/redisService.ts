import redisClient from '../redis';
import { Redis } from 'ioredis';
import { logger } from '@/utils/logger';

class RedisService {
  private client: Redis;

  constructor(client: Redis) {
    this.client = client;
  }

  /**
   * 设置键值对，支持过期时间
   * @param key 键名
   * @param value 值
   * @param expiry 过期时间（秒），可选
   */
  async set(
    key: string,
    value: string | number | object,
    expiry?: number
  ): Promise<boolean> {
    try {
      const storedValue = typeof value === 'object' 
        ? JSON.stringify(value) 
        : String(value);

      if (expiry) {
        await this.client.set(key, storedValue, 'EX', expiry);
      } else {
        await this.client.set(key, storedValue);
      }
      return true;
    } catch (error) {
      logger.error(`Redis set error (key: ${key}):`, error);
      return false;
    }
  }

  /**
   * 仅在键不存在时设置键值对，支持过期时间
   * @param key 键名
   * @param value 值
   * @param expiry 过期时间（秒），可选
   * @returns 键是否被成功设置（不存在且设置成功返回true，否则返回false）
   */
  async setIfNotExists(
    key: string,
    value: string | number | object,
    expiry?: number
  ): Promise<boolean> {
    try {
      const storedValue = typeof value === 'object' 
        ? JSON.stringify(value) 
        : String(value);

      let result: string | null;
      
      if (expiry) {
        result = await this.client.set(key, storedValue, 'EX', expiry, 'NX');
      } else {
        result = await this.client.set(key, storedValue, 'NX');
      }
      
      // Redis的SET NX命令在成功时返回"OK"，失败时返回null
      return result === 'OK';
    } catch (error) {
      logger.error(`Redis setIfNotExists error (key: ${key}):`, error);
      return false;
    }
  }

  /**
   * 获取键值
   * @param key 键名
   * @param isJson 是否解析为 JSON 对象
   */
  async get<T = string>(key: string, isJson = false): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (!value) return null;

      return isJson ? JSON.parse(value) as T : value as unknown as T;
    } catch (error) {
      logger.error(`Redis get error (key: ${key}):`, error);
      return null;
    }
  }

  /**
   * 删除键
   * @param key 键名
   */
  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      logger.error(`Redis delete error (key: ${key}):`, error);
      return false;
    }
  }

  /**
   * 哈希表设置字段值
   * @param key 哈希表键名
   * @param field 字段名
   * @param value 字段值
   */
  async hset(key: string, field: string, value: string | number | object): Promise<boolean> {
    try {
      const storedValue = typeof value === 'object' 
        ? JSON.stringify(value) 
        : String(value);
      
      await this.client.hset(key, field, storedValue);
      return true;
    } catch (error) {
      logger.error(`Redis hset error (key: ${key}, field: ${field}):`, error);
      return false;
    }
  }

  /**
   * 获取哈希表字段值
   * @param key 哈希表键名
   * @param field 字段名
   * @param isJson 是否解析为 JSON 对象
   */
  async hget<T = string>(key: string, field: string, isJson = false): Promise<T | null> {
    try {
      const value = await this.client.hget(key, field);
      if (!value) return null;

      return isJson ? JSON.parse(value) as T : value as unknown as T;
    } catch (error) {
      logger.error(`Redis hget error (key: ${key}, field: ${field}):`, error);
      return null;
    }
  }

  /**
   * 发布消息到指定频道
   * @param channel 频道名
   * @param message 消息内容
   */
  async publish(channel: string, message: string | object): Promise<number> {
    try {
      const messageStr = typeof message === 'object' 
        ? JSON.stringify(message) 
        : String(message);
      
      return await this.client.publish(channel, messageStr);
    } catch (error) {
      logger.error(`Redis publish error (channel: ${channel}):`, error);
      return 0;
    }
  }

  /**
   * 订阅频道并处理消息
   * @param channel 频道名
   * @param handler 消息处理函数
   */
  subscribe(channel: string, handler: (message: string) => void): void {
    try {
      // 创建新的客户端进行订阅（避免与发布客户端冲突）
      const subscriber = new Redis(redisClient.options);
      
      subscriber.subscribe(channel, (err) => {
        if (err) {
          logger.error(`Redis 订阅失败 (channel: ${channel}):`, err);
        } else {
          logger.info(`已订阅频道: ${channel}`);
        }
      });
      
      subscriber.on('message', (subscribedChannel, message) => {
        if (subscribedChannel === channel) {
          handler(message);
        }
      });
      
      // 当主客户端关闭时，关闭订阅客户端
      redisClient.on('end', () => {
        subscriber.quit();
      });
    } catch (error) {
      logger.error(`Redis subscribe error (channel: ${channel}):`, error);
    }
  }

  /**
   * 向集合添加一个或多个成员
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.client.sadd(key, members);
    } catch (error) {
      logger.error(`Redis sadd error (key: ${key}):`, error);
      return 0;
    }
  }

  /**
   * 移除集合中的一个或多个成员
   */
  async srem(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.client.srem(key, members);
    } catch (error) {
      logger.error(`Redis srem error (key: ${key}):`, error);
      return 0;
    }
  }

  /**
   * 获取集合中的所有成员
   */
  async smembers(key: string): Promise<string[] | null> {
    try {
      return await this.client.smembers(key);
    } catch (error) {
      logger.error(`Redis smembers error (key: ${key}):`, error);
      return null;
    }
  }
}

export const redisService = new RedisService(redisClient);
