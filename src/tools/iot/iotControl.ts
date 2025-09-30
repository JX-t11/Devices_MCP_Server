import { z } from 'zod';
import { IotControlParams, IotControlResponse, DeviceInfo } from '@/types';
import { redisService } from '@/services/redisService';
import { logIotAction } from '@/tools/iot/iotLogger';
import { operateDevice, queryDevice } from '@/tools/iot/iotDeviceAdapter';
import { tokenGenerator } from '@/utils/oauth2TokenGenerator';
import { checkActionRateLimit } from '@/utils/index';
import { DeviceService } from '@/services/deviceService';
import { CodeEnum } from '@/utils/codeEnum';

async function handleDeviceOperation(
  { deviceKey, action, value, token }: IotControlParams & { token: string },
  operation: (deviceKey: string, action: string, value: any, productKey: string) => Promise<{ status: string; message: string; data?: any }>
): Promise<IotControlResponse> {
  let success = true;
  let message = '';
  let status = '';
  let data = null;

  // 验证token
  const tokenInfo = await tokenGenerator.validateToken(token);
  
  // 鉴权检查
  if (!tokenInfo) {
    success = false;
    message = CodeEnum.AUTHENTICATION_FAILED.message;         // 鉴权失败，禁止操作
    status = CodeEnum.AUTHENTICATION_FAILED.status;
    const errMsg =  message + ' token=' + token
    logIotAction({ deviceKey, action, value, success, message: errMsg });
    return createResponse({ deviceKey, success, message, status, data });
  }

  if (tokenInfo.device_key !== deviceKey) {
    const deviceService = new DeviceService();
    // 获取有权操作的其他设备列表
    const otherDevices = await deviceService.getAuthorizedDevices(tokenInfo.device_key)
    if (!otherDevices.length || !otherDevices.some(item => item.authorizing_device_key === deviceKey)) {
      success = false;
      message = CodeEnum.AUTHENTICATION_FAILED.message;       // 鉴权失败，禁止操作
      status = CodeEnum.AUTHENTICATION_FAILED.status;
      logIotAction({ deviceKey, action, value, success, message });
      return createResponse({ deviceKey, success, message, status, data });
    }
  }

  // 频控检查
  if (!await checkActionRateLimit(deviceKey, action)) {
    success = false;
    message = CodeEnum.TOO_MANY_REQUESTS.message;
    status = CodeEnum.TOO_MANY_REQUESTS.status;
    logIotAction({ deviceKey, action, value, success, message });
    return createResponse({ deviceKey, success, message, status, data });
  }
  
  const deviceInfo = await redisService.get<DeviceInfo>(`device:info:${deviceKey}`, true);

  if (!deviceInfo) {
    success = false;
    message = CodeEnum.DEVICE_NOT_FOUND.message;
    status = CodeEnum.DEVICE_NOT_FOUND.status;
    logIotAction({ deviceKey, action, value, success, message });
    return createResponse({ deviceKey, success, message, status, data });
  }

  // 执行具体操作（控制或查询）
  const result = await operation(deviceKey, action, value, deviceInfo.product_key);
  status = result.status;
  message = result.message;
  data = result.data;
  success = status !== 'unknown';

  // 记录日志
  logIotAction({ deviceKey, action, value, success, message });

  return createResponse({ deviceKey, success, message, status, data });
}

function createResponse({
  deviceKey,
  success,
  message,
  status,
  data
}: {
  deviceKey: string;
  success: boolean;
  message: string;
  status: string;
  data: any;
}): IotControlResponse {
  return {
    success,
    deviceKey,
    message,
    content: [
      {
        type: 'text',
        text: message,
        _meta: { status, data },
      },
    ],
    _meta: { status },
  };
}

// 控制
export async function iotControl(params: IotControlParams & { token: string }): Promise<IotControlResponse> {
  return handleDeviceOperation(params, operateDevice);
}

// 查询
export async function iotQuery(params: IotControlParams & { token: string }): Promise<IotControlResponse> {
  return handleDeviceOperation(params, queryDevice);
}
