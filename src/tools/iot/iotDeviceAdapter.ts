// iotDeviceAdapter.ts
import { IotControlParams } from '@/types';
import { mqttService } from '@/services/mqttService';
import { randomString } from '@/utils';
import { logger } from '@/utils/logger';

/**
 * 控制设备
 */
export async function operateDevice(
  deviceKey: string,
  action: string,
  value: string | number,
  productKey: string
): Promise<{ status: string; message: string, data: any }> {

  const deviceKeyStrs = deviceKey.split('_')
  if (deviceKeyStrs.length === 0) {
    throw new Error(`设备 key 格式无效: ${deviceKey}`);
  }

  const msg = {
    // 填写消息内容
  }
    
  // 主题
  const topic = `your-publish/topic`;
  
  await mqttService.publish(topic, JSON.stringify(msg), 1);

  return { status: 'success', message: '操作已完成', data: null };
}


/**
 * 查询设备
 */
export async function queryDevice(
  deviceKey: string,
  action: string,
  value: string | number,
  productKey: string,
  timeout: number = 5000     // 超时时间：5s
): Promise<{ status: string; message: string, data: any }> {
  const traceId = randomString(8)

  const msg = {
    // 填写消息内容
  }
    
  // 发布主题
  const pubTopic = `your-publish/topic`;
  // 订阅主题
  const subTopic = `your-subscribe/topic`
  
  return new Promise((resolve, reject) => {
    const timeoutTimer = setTimeout(() => {
      mqttService.unsubscribe(subTopic).catch(err => {
        logger.error(`取消订阅主题${subTopic}失败（超时后）:`, err);
      });
      reject(new Error(`查询设备超时（${timeout}ms）：设备未上报响应，设备ID=${deviceKey}`));
    }, timeout);

    const onMessageReceived = (topic: string, message: string) => {
      if (topic !== subTopic) return;

      try {
        const reportData = JSON.parse(message);
        
        if (reportData.header?.traceId !== traceId) {
          return;
        }

        clearTimeout(timeoutTimer);
        mqttService.unsubscribe(subTopic).catch(err => {
          logger.error(`取消订阅主题${subTopic}失败（成功后）:`, err);
        });

        const queryResult = reportData.body?.properties?.find((p: any) => p.id === action);
        if (queryResult) {
          resolve({
            status: 'success',
            message: '查询成功，已收到设备响应',
            data: queryResult.value
          });
        } else {
          resolve({
            status: 'warning',
            message: '查询成功，但设备未返回目标属性值',
            data: null
          });
        }

      } catch (err) {
        clearTimeout(timeoutTimer);
        mqttService.unsubscribe(subTopic).catch(unsubErr => {
          logger.error(`取消订阅主题${subTopic}失败（解析错误后）:`, unsubErr);
        });
        reject(new Error(`解析设备上报消息失败：${(err as Error).message}，原始消息=${message.toString()}`));
      }
    };

    mqttService.subscribe(subTopic, 1, onMessageReceived)
      .then(async () => {
        await mqttService.publish(pubTopic, JSON.stringify(msg), 1);
      })
      .catch(err => {
        clearTimeout(timeoutTimer);
        reject(new Error(`订阅设备上报主题${subTopic}失败：${(err as Error).message}`));
      });
  });
}