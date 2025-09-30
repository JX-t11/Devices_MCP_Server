import { McpServer, ResourceTemplate, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js';
import { weatherParams, getWeather } from '@/tools/weather';
import { calculatorParams, calculate } from '@/tools/calculator';
import { searchParams, search } from '@/tools/search';
import { iotControl, iotQuery } from '@/tools/iot/iotControl';
import { locationParams, getLocation } from '@/tools/location';
import { ipv6ToIPv4 } from '@/utils/index';
import { logger } from '@/utils/logger';
import { DeviceService } from '@/services/deviceService';
import { ProductService } from '@/services/productService';
import { CommonMcpToolParams } from '@/types/index';
import { array, z } from 'zod';

interface Tool {
  name: string;
  tool: RegisteredTool;
}

/**
 * 注册资源
 */
export function registerResources(server: McpServer) {

}

/**
 * 注册提示词模板
 */
export function registerPrompts(server: McpServer) {

}

/**
 * 注册工具
 * 1、移除工具 controlTool.remove()
 * 2、开启工具 controlTool.enable()
 * 3、禁用工具 controlTool.disable()
 * 4、更新工具 controlTool.update()
 * 产品的工具列表示例：
 * {
 *   "name": "switch_1",
 *   "desc": "控制灯光开关",
 *   "type": "number",
 *   "actType": "control",
 *   "actions": [
 *       {
 *           "name": "switch_1",
 *           "desc": "开灯",
 *           "value": 1
 *       },
 *       {
 *           "name": "switch_1",
 *           "desc": "关灯",
 *           "value": 0
 *       }
 *   ]
 * }
 * 
 */
export async function registerTools(server: McpServer, device_key: string) {
  logger.info('注册工具...');

  // 根据device_key查找工具
  const deviceService = new DeviceService()
  const deviceInfo = await deviceService.findOneByKey(device_key)
  if (!deviceInfo) {
    return []
  }

  const productService = new ProductService()
  const productInfo = await productService.findByKey(deviceInfo.product_key, deviceInfo.product_version)
  if (!productInfo) {
    return []
  }
  
  // 本设备工具列表
  const mcp_tools = JSON.parse(productInfo.mcp_tools)

  mcp_tools.map((tool: CommonMcpToolParams) => {
    const { name, desc, actions, type, actType } = tool;
    let toolDesc = desc

    // 添加设备名称到工具的描述里
    if (deviceInfo.name) {
      toolDesc = `(${deviceInfo.name})${desc}`
    }

    if (actions.length > 0) {
      let enumArr: [string] = [actions[0].name]
      let descText = `动作，可选 ${actions[0].name}(${actions[0].desc})`;
      let valueText = `参数，${actions[0].value}(${actions[0].desc})`;

      for (let i = 1; i < actions.length; i++) {
        const action = actions[i];

        if (!enumArr.includes(action.name)) {
          enumArr.push(action.name)
          descText += ` 、${action.name}(${action.desc})`
        }
        valueText += ` 、${action.value}(${action.desc})`
      }
      const iotControlParams = {
        deviceKey: z.string().describe('设备唯一标识'),
        action: z
          .enum(enumArr)
          .describe(descText),
        value: type == 'string' ? z.string().describe(valueText) : z.number().describe(valueText),
        token: z.string().describe('操作鉴权 token'),
      };

      if (actType && actType == 'query') {
        server.tool(
          name,
          toolDesc,
          iotControlParams,
          async (args) => iotQuery(args)
        );
      } else {
        server.tool(
          name,
          toolDesc,
          iotControlParams,
          async (args) => iotControl(args)
        );
      }
    }
  });

  // 获取有权操作的其他设备列表
  let otherDevices = await deviceService.getAuthorizedDevices(device_key)

  otherDevices.map(async (item) => {
    const otherDevice = item.authorizing_device_key
    const otherDeviceInfo = await deviceService.findOneByKey(otherDevice)
    if (!otherDeviceInfo) {
      return []
    }

    const productInfo = await productService.findByKey(otherDeviceInfo.product_key, otherDeviceInfo.product_version)
    if (!productInfo) {
      return []
    }

    // 获取其他设备的工具列表
    const other_mcp_tools = JSON.parse(productInfo.mcp_tools)

    other_mcp_tools.map((tool: CommonMcpToolParams) => {
      const { name, desc, actions, type, actType } = tool;
      let toolDesc = desc
  
      // 添加设备名称到工具的描述里
      if (otherDeviceInfo.name) {
        toolDesc = `(${otherDeviceInfo.name})${desc}`
      }
  
      if (actions.length > 0) {
        let enumArr: [string] = [actions[0].name]
        let descText = `动作，可选 ${actions[0].name}(${actions[0].desc})`;
        let valueText = `参数，${actions[0].value}(${actions[0].desc})`;
  
        for (let i = 1; i < actions.length; i++) {
          const action = actions[i];
  
          if (!enumArr.includes(action.name)) {
            enumArr.push(action.name)
            descText += ` 、${action.name}(${action.desc})`
          }
          valueText += ` 、${action.value}(${action.desc})`
        }
        const iotControlParams = {
          deviceKey: z
            .enum([otherDevice])
            .describe('设备唯一标识'),
          action: z
            .enum(enumArr)
            .describe(descText),
          value: type == 'string' ? z.string().describe(valueText) : z.number().describe(valueText),
          token: z.string().describe('操作鉴权 token'),
        };
  
        // 添加工具名称后缀，避免名称重复，只有其他设备才添加后缀
        const suffix = otherDevice
        if (actType && actType == 'query') {
          server.tool(
            name + '_' + suffix,
            toolDesc,
            iotControlParams,
            async (args) => iotQuery(args)
          );
        } else {
          server.tool(
            name + '_' + suffix,
            toolDesc,
            iotControlParams,
            async (args) => iotControl(args)
          );
        }
      }
    });
  })

}


