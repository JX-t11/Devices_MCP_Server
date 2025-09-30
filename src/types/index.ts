import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

// 设备信息
export interface DeviceInfo {
  device_key: string;
  mac: string;
  product_key: string;
  product_version: string;
}

// 服务器配置类型
export interface ServerConfig {
  port: number;
  name: string;
  version: string;
}

// 传输层管理类型
export interface TransportManager {
  [sessionId: string]: StreamableHTTPServerTransport;
}

// 工具函数参数类型
export interface WeatherParams {
  city?: string;
  unit: 'celsius' | 'fahrenheit';
  days?: number; // 新增，查询未来几天的天气，1为仅今日，最大7天
}

export interface CalculatorParams {
  operation: 'add' | 'subtract' | 'multiply' | 'divide';
  a: number;
  b: number;
}

export interface SearchParams {
  query: string;
  limit: number;
}

// 工具函数返回类型 - 匹配MCP SDK要求
export interface ToolResponse {
  [x: string]: unknown;
  content: Array<{
    [x: string]: unknown;
    type: 'text';
    text: string;
    _meta?: { [x: string]: unknown };
  }>;
  _meta?: { [x: string]: unknown };
}

// 健康检查响应类型
export interface HealthResponse {
  status: string;
  timestamp: string;
  activeSessions: number;
}

// IoT 设备控制参数类型
export interface IotControlParams {
  deviceKey: string; // 设备唯一标识
  action: string; // 控制动作
  value?: string | number; // 动作参数
}

// IoT 设备控制响应类型
export interface IotControlResponse extends ToolResponse {
  success: boolean;
  deviceKey: string;
  // action: string;
  // value?: string | number;
  message?: string;
}

// tools 注册参数
export interface CommonMcpToolParams {
  name: string;
  desc: string;
  type?: string;
  actType?: string;
  actions: Array<{
    name: string;
    desc: string;
    value: string | number | boolean;
  }>;
}

// 返回
export interface ApiResponse {
  code: number;
  message?: string;
}