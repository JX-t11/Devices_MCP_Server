import net from 'net';
import { redisService } from '@/services/redisService';

// const crypto = require('crypto');
import crypto from 'crypto'

/**
 * ipv6ToIPv4(ipv6)
 */
function ipv6ToIPv4(ipv6: string) {
  // 检查是否为IPv6地址
  if (!net.isIPv6(ipv6)) {
    return ipv6;
  }
  
  // IPv4-mapped IPv6地址的前缀
  const ipv4MappedPrefix = '::ffff:';
  
  // 检查是否是IPv4映射的IPv6地址
  if (ipv6.startsWith(ipv4MappedPrefix)) {
    // 提取并返回IPv4部分
    return ipv6.slice(ipv4MappedPrefix.length);
  }
  
  // 检查是否是另一种形式的映射地址（不带前缀但包含IPv4）
  // 例如 ::ffff:192.168.1.1 或 ::192.168.1.1
  const ipv4Match = ipv6.match(/([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)$/);
  if (ipv4Match && net.isIPv4(ipv4Match[1])) {
    return ipv4Match[1];
  }
  
  // 不是可转换的IPv6地址
  return ipv6;
}

// 随机字符串
function randomString (len:number) {
  len = len || 32
  let t = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz123456789'
  let a = t.length
  let n = ''
  for(let i=0;i<len;i++)
    n += t.charAt(Math.floor(Math.random() * a))
  return n
}


// mcp调用频率检查
async function checkActionRateLimit(deviceKey: string, action: string): Promise<boolean> {
  const MIN_INTERVAL = 1
  const key = `rate_limit:${deviceKey}:${action}`;
    
  // 尝试设置键，只有当键不存在时才设置成功，并设置过期时间
  const isSet = await redisService.setIfNotExists(key, '1', MIN_INTERVAL);
  return isSet;
}



// token频率检查，20分钟
async function checkTokenActionRateLimit(deviceKey: string):  Promise<boolean> {
  const MIN_INTERVAL = 1200
  const key = `rate_limit:token:${deviceKey}`;
    
  // 尝试设置键，只有当键不存在时才设置成功，并设置过期时间
  const isSet = await redisService.setIfNotExists(key, '1', MIN_INTERVAL);
  return isSet;
}

// 验证sign
function checkSign(data: any, app_key: string, sign: string) {
  // 自行实现签名验证逻辑
  return true
}

export { ipv6ToIPv4, randomString, checkActionRateLimit, checkTokenActionRateLimit, checkSign };