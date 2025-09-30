# Devices_MCP_Server

Devices MCP Server，一个基于 Model Context Protocol (MCP) 的服务端，提供设备控制、设备查询等能力，使AI应用能够与设备进行交互。通过本服务，开发者可以轻松实现对各种设备的开放式控制。

## ✨ 特性

- 动态工具 - 基于产品和设备的注册信息，动态生成工具列表
- AI互控 - 设备之间进行授权，通过自然语言指令实现设备联动

## 📁 目录结构

```
├── src/
│   ├── config/             # 配置
│   ├── types/              # 类型定义
│   ├── entities/           # 模型实体
│   ├── middleware/         # 中间件
│   ├── routes/             # 路由
│   ├── services/           # 业务服务
│   ├── tools/              # 工具函数
│   ├── utils/              # 通用工具
│   ├── app.ts              # 应用主类
│   ├── index.ts            # 启动入口
│   ├── mqtt-client.ts      # MQTT 客户端
│   └── redis.ts            # Redis 客户端
├── mcp.sql                 # 数据库文件
├── package.json            # 依赖与脚本
├── tsconfig.json           # TypeScript 配置
└── ...
```

## 🚀 快速开始

- node 版本 > 18

### 安装依赖

```bash
npm install
```

### 开发环境

```bash
npm run dev
```

### 生产环境

```bash
npm run build
npm run start:prod
```
