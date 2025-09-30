import { MqttClient, Packet } from 'mqtt';
import mqttClient, { connectMqtt, disconnectMqtt } from '../mqtt-client';
import { logger } from '../utils/logger';


export class MqttService {
  private client: MqttClient;

  constructor(clientId: string) {
    this.client = mqttClient.client(clientId);
  }

  /**
   * 订阅主题
   * @param topic 订阅的主题（支持通配符，如 sensor/#）
   * @param qos 服务质量等级（0, 1, 2）
   * @param callback 消息处理回调
   */
  subscribe(
    topic: string | string[],
    qos: 0 | 1 | 2 = 0,
    callback?: (topic: string, message: string, packet: Packet) => void
  ): Promise<{ [topic: string]: number }> {
    return new Promise((resolve, reject) => {
      // 确保客户端已连接
      if (!this.client.connected) {
        reject(new Error('MQTT 客户端未连接'));
        return;
      }

      this.client.subscribe(topic, { qos }, (err, granted: any) => {
        if (err) {
          logger.error(`订阅失败 (${topic}):`, err);
          reject(err);
          return;
        }

        logger.info(`订阅成功:`, granted);
        resolve(granted);

        // 如果提供了回调，为该主题单独注册消息处理
        if (callback && typeof topic === 'string') {
          this.client.on('message', (t, message, packet) => {
            if (t === topic) {
              callback(t, message.toString(), packet);
            }
          });
        }
      });
    });
  }

  /**
   * 发布消息
   * @param topic 发布的主题
   * @param message 消息内容（字符串或对象）
   * @param qos 服务质量等级（0, 1, 2）
   * @param retain 是否保留消息
   */
  publish(
    topic: string,
    message: string | object,
    qos: 0 | 1 | 2 = 0,
    retain = false
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client.connected) {
        reject(new Error('MQTT 客户端未连接'));
        return;
      }

      // 如果消息是对象，转换为 JSON 字符串
      const payload = typeof message === 'object' 
        ? JSON.stringify(message) 
        : message;

      this.client.publish(topic, payload, { qos, retain }, (err) => {
        if (err) {
          logger.error(`发布失败 (${topic}):`, err);
          reject(err);
          return;
        }

        logger.info(`发布成功 - 主题: ${topic}, 内容: ${payload}`);
        resolve();
      });
    });
  }

  /**
   * 取消订阅
   * @param topic 要取消订阅的主题
   */
  unsubscribe(topic: string | string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client.connected) {
        reject(new Error('MQTT 客户端未连接'));
        return;
      }

      this.client.unsubscribe(topic, (err) => {
        if (err) {
          logger.error(`取消订阅失败 (${topic}):`, err);
          reject(err);
          return;
        }

        logger.info(`取消订阅成功: ${topic}`);
        resolve();
      });
    });
  }

  /**
   * 断开 MQTT 连接
   */
  disconnect(): void {
    disconnectMqtt();
  }
}

export const mqttService = new MqttService(`mcp_${Math.random().toString(16).substr(2, 8)}`);

