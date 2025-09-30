import crypto from 'crypto';
import { redisService } from '@/services/redisService';

// 令牌类型定义
export type TokenType = 'access_token' | 'refresh_token';

// 令牌信息接口
export interface TokenInfo {
  token: string;
  type: TokenType;
  expires_in: number; // 有效期（秒）
  created_at: number; // 创建时间戳
  device_key: string;
  scope?: string;
}

// 令牌存储接口
interface TokenStorage {
  saveToken(tokenInfo: TokenInfo): Promise<void>;
  getToken(token: string): Promise<TokenInfo | null>;
  invalidateToken(token: string, device_key?: string, type?: TokenType): Promise<boolean>;
  invalidateTokensForUser(userId: string, clientId?: string): Promise<number>;
  findTokensForUser(userId: string, tokenType?: TokenType): Promise<string[]>;
}

class RedisServiceTokenStorage implements TokenStorage {
  private prefix: string;

  constructor(prefix: string = 'oauth2:token:') {
    this.prefix = prefix;
  }

  /**
   * 生成Redis键名
   */
  private getKey(token: string): string {
    return `${this.prefix}${token}`;
  }

  /**
   * 生成用户令牌索引键名
   */
  private getUserTokenIndexKey(userId: string, clientId?: string, tokenType?: TokenType): string {
    let key = `${this.prefix}user:${userId}`;
    if (clientId) key += `:${clientId}`;
    if (tokenType) key += `:${tokenType}`;
    return key;
  }

  async saveToken(tokenInfo: TokenInfo): Promise<void> {
    const key = this.getKey(tokenInfo.token);
    const userIndexKey = this.getUserTokenIndexKey(
      tokenInfo.device_key, 
      undefined, 
      tokenInfo.type
    );
    
    // 保存令牌信息
    const saveSuccess = await redisService.set(
      key, 
      tokenInfo, 
      tokenInfo.expires_in
    );
    
    if (!saveSuccess) {
      throw new Error('Failed to save token to Redis');
    }
    
    // 将令牌添加到用户的令牌集合中（按类型区分）
    await redisService.sadd(userIndexKey, tokenInfo.token);
  }

  async getToken(token: string): Promise<TokenInfo | null> {
    const key = this.getKey(token);
    return redisService.get<TokenInfo>(key, true);
  }

  async invalidateToken(token: string, device_key?: string, type?: TokenType): Promise<boolean> {
    // 先获取令牌信息
    let deleteSuccess = false
    const tokenInfo = await this.getToken(token);
    if (tokenInfo) {
      const key = this.getKey(token);
      const userIndexKey = this.getUserTokenIndexKey(
        tokenInfo.device_key, 
        undefined, 
        tokenInfo.type
      );
      
      // 删除令牌
      deleteSuccess = await redisService.delete(key);
      // 从用户令牌集合中移除
      await redisService.srem(userIndexKey, token);
    } 
    else if (device_key && type) {
      const userIndexKey = this.getUserTokenIndexKey(
        device_key, 
        undefined, 
        type
      );
      // 从用户令牌集合中移除
      await redisService.srem(userIndexKey, token);
      deleteSuccess = true
    }
    
    return deleteSuccess;
  }

  async invalidateTokensForUser(userId: string, clientId?: string): Promise<number> {
    // 先获取该用户的所有令牌类型
    const accessTokens = await this.findTokensForUser(userId, 'access_token');
    const refreshTokens = await this.findTokensForUser(userId, 'refresh_token');
    const allTokens = [...accessTokens, ...refreshTokens];
    
    if (allTokens.length === 0) {
      return 0;
    }
    
    // 批量删除所有令牌
    const deletePromises = allTokens.map(token => 
      this.invalidateToken(token)
    );
    
    await Promise.all(deletePromises);
    
    // 清除用户所有类型的令牌集合
    await redisService.delete(this.getUserTokenIndexKey(userId, clientId, 'access_token'));
    await redisService.delete(this.getUserTokenIndexKey(userId, clientId, 'refresh_token'));
    
    return allTokens.length;
  }

  /**
   * 查找用户的特定类型令牌
   */
  async findTokensForUser(userId: string, tokenType?: TokenType): Promise<string[]> {
    const userIndexKey = this.getUserTokenIndexKey(userId, undefined, tokenType);
    // 确保返回值始终是数组，处理可能的null
    const tokens = await redisService.smembers(userIndexKey);

    return tokens || [];
  }

}

// OAuth2.0 令牌生成器类
export class OAuth2TokenGenerator {
  private storage: TokenStorage;
  
  constructor(storage?: TokenStorage) {
    this.storage = storage || new RedisServiceTokenStorage();
  }

  /**
   * 生成随机令牌
   * @param byteLength 令牌字节长度
   * @returns 十六进制字符串令牌
   */
  private generateRandomToken(byteLength: number = 32): string {
    return crypto.randomBytes(byteLength).toString('hex');
  }

  /**
   * 使指定用户的特定类型令牌失效
   */
  private async invalidateUserTokensByType(device_key: string, type: TokenType): Promise<number> {
    const existingTokens = await this.storage.findTokensForUser(device_key, type);

    if (existingTokens.length === 0) return 0;
    
    let invalidatedCount = 0;
    for (const token of existingTokens) {
      console.log(token)
      const success = await this.storage.invalidateToken(token, device_key, type);
      if (success) invalidatedCount++;
    }
    
    return invalidatedCount;
  }

  /**
   * 生成访问令牌
   */
  async generateAccessToken(
    device_key: string,
    scope?: string,
    expires_in: number = 3600
  ): Promise<TokenInfo> {
    // 先使该用户所有现有的访问令牌失效
    await this.invalidateUserTokensByType(device_key, 'access_token');
    
    // 生成新的访问令牌
    let token = this.generateRandomToken();

    const tokenInfo: TokenInfo = {
      token,
      type: 'access_token',
      expires_in,
      created_at: Date.now(),
      device_key,
      scope
    };

    await this.storage.saveToken(tokenInfo);
    return tokenInfo;
  }

  /**
   * 生成刷新令牌
   */
  async generateRefreshToken(
    device_key: string,
    scope?: string,
    expires_in: number = 604800
  ): Promise<TokenInfo> {
    // 先使该用户所有现有的刷新令牌失效
    await this.invalidateUserTokensByType(device_key, 'refresh_token');
    
    // 生成新的刷新令牌
    const token = this.generateRandomToken(40);
    const tokenInfo: TokenInfo = {
      token,
      type: 'refresh_token',
      expires_in,
      created_at: Date.now(),
      device_key,
      scope
    };

    await this.storage.saveToken(tokenInfo);
    return tokenInfo;
  }

  /**
   * 同时生成访问令牌和刷新令牌
   */
  async generateTokens(
    device_key: string,
    scope?: string,
    accessTokenExpiresIn: number = 3600,
    refreshTokenExpiresIn: number = 604800
  ): Promise<{accessToken: TokenInfo, refreshToken: TokenInfo}> {
    // 先使该用户所有现有令牌失效
    await this.invalidateUserTokensByType(device_key, 'access_token');
    await this.invalidateUserTokensByType(device_key, 'refresh_token');
    
    // 生成新令牌
    const accessToken = await this.generateAccessToken(
      device_key, scope, accessTokenExpiresIn
    );
    const refreshToken = await this.generateRefreshToken(
      device_key, scope, refreshTokenExpiresIn
    );
    
    return { accessToken, refreshToken };
  }

  /**
   * 验证令牌是否有效
   */
  async validateToken(token: string): Promise<TokenInfo | null> {
    if (token.startsWith('Bearer ')) {
      token = token.substring(7);
    }
    const tokenInfo = await this.storage.getToken(token);
    if (!tokenInfo) return null;
    
    // 检查令牌是否过期
    const now = Date.now();
    const expirationTime = tokenInfo.created_at + (tokenInfo.expires_in * 1000);
    
    return now <= expirationTime ? tokenInfo : null;
  }

  /**
   * 使用刷新令牌获取新的访问令牌
   */
  async refreshAccessToken(refresh_token: string): Promise<TokenInfo | null> {
    const tokenInfo = await this.validateToken(refresh_token);
    
    if (!tokenInfo || tokenInfo.type !== 'refresh_token') {
      return null;
    }
    
    // 生成新的访问令牌（会自动使旧的访问令牌失效）
    return this.generateAccessToken(
      tokenInfo.device_key,
      tokenInfo.scope
    );
  }

  /**
   * 使指定令牌失效
   */
  async revokeToken(token: string): Promise<boolean> {
    return this.storage.invalidateToken(token);
  }

  /**
   * 使指定设备的所有令牌失效
   */
  async revokeAllTokensForUser(device_key: string): Promise<number> {
    const accessCount = await this.invalidateUserTokensByType(device_key, 'access_token');
    const refreshCount = await this.invalidateUserTokensByType(device_key, 'refresh_token');
    return accessCount + refreshCount;
  }

  /**
   * 获取指定用户的access_token令牌
   */
  async getAccessTokensForUser(device_key: string): Promise<string[]> {
    return this.storage.findTokensForUser(device_key, 'access_token');
  }
}

export const tokenGenerator = new OAuth2TokenGenerator();
