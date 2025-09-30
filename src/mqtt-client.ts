import mqtt, { MqttClient, IClientOptions, Packet } from 'mqtt';
import { logger } from '@/utils/logger';
import { mqttConfig } from '@/config';

// MQTT 客户端配置
const mqttOptions: IClientOptions = {
  keepalive: 60,        // 默认60秒，设置0为禁用
  protocol: 'mqtt',     // 协议（mqtt, mqtts, ws, wss）
  protocolVersion: 4,
  clean: true,          // 断开连接时是否清除会话，设置为false以在脱机时接收QoS 1和2消息
  connectTimeout: 4000, // 连接超时时间（毫秒）
  reconnectPeriod: 3000, // 重连间隔（毫秒)
  username: mqttConfig.username,
  password: mqttConfig.password
};

// 创建 MQTT 客户端实例
let mqttClient: MqttClient;

/**
 * 连接到 MQTT 服务器
 * @returns MQTT 客户端实例
 */
export function connectMqtt(clientId: string): MqttClient {
  // 如果已存在客户端且已连接，则返回现有客户端
  if (mqttClient && mqttClient.connected) {
    return mqttClient;
  }

  // 创建新客户端
  mqttClient = mqtt.connect(`mqtt://${mqttConfig.host}:${mqttConfig.port}`,
    { ...mqttOptions, 
      clientId: clientId
    } 
  );

  // 监听连接成功事件
  mqttClient.on('connect', (connack: Packet) => {
    logger.info('MQTT connected:', connack);
  });

  // 监听连接错误事件
  mqttClient.on('error', (err) => {
    logger.error('MQTT 连接错误:', err);
    // 错误发生时关闭连接，触发重连机制
    if (!mqttClient.reconnecting) {
      mqttClient.end();
    }
  });

  // 监听重连事件
  mqttClient.on('reconnect', () => {
    logger.info('MQTT 客户端正在重连...');
  });

  // 监听断开连接事件
  mqttClient.on('close', () => {
    logger.info('MQTT 连接已关闭');
  });

  // 监听消息事件（全局消息处理，也可在订阅时单独处理）
  mqttClient.on('message', (topic, message, packet) => {
    logger.info(`收到消息 - 主题: ${topic}, 内容: ${message.toString()}`);
  });

  return mqttClient;
}

/**
 * 断开 MQTT 连接
 */
export function disconnectMqtt(): void {
  if (mqttClient && mqttClient.connected) {
    mqttClient.end(false, undefined, () => {
      logger.info('MQTT 客户端已主动断开连接');
    });
  }
}

// 导出默认客户端（延迟初始化）
export default {
  client(clientId: string): MqttClient {
    if (!mqttClient) {
      connectMqtt(clientId);
    }
    return mqttClient;
  }
};
    