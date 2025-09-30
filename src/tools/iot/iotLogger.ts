// iotLogger.ts
import { IotControlParams } from '../../types/index.js';
import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import fs from "fs";
import path from "path";
import { dirname, join } from 'node:path';


// 定义日志输出目录
const LOG_DIR = join(__dirname,  "../../../logs");

function getBeijingTimeISO() {
  const now = new Date();
  const timestamp = now.getTime();
  const beijingTimestamp = timestamp + 8 * 60 * 60 * 1000;
  const beijingDate = new Date(beijingTimestamp);
  return beijingDate.toISOString();
}

// 存储不同用户的logger实例
const userLoggers: Record<string, ReturnType<typeof createLogger>> = {};

// 获取用户特定的logger
function getUserLogger(userId: string) {
  if (!userLoggers[userId]) {
    const userDir = path.join(LOG_DIR, userId);
    
    fs.mkdirSync(userDir, { recursive: true });
    
    // 创建用户特定的logger
    userLoggers[userId] = createLogger({
      level: "info",
      format: format.json(),
      defaultMeta: { },
      transports: [
        new DailyRotateFile({
          filename: path.join(userDir, "%DATE%.log"),
          datePattern: "YYYY-MM-DD",
          zippedArchive: true,
          maxSize: "20m",
          maxFiles: "14d",
          level: "error",
        }),
        new DailyRotateFile({
          filename: path.join(userDir, "%DATE%.log"),
          datePattern: "YYYY-MM-DD",
          zippedArchive: true,
          maxSize: "20m",
          maxFiles: "14d",
          level: "info",
          format: format.combine(
            format((info) => (info.level === "info" ? info : false))()
          ),
        }),
      ],
    });
    
    // 如果不是生产环境，也输出到控制台
    if (process.env.NODE_ENV !== "prod") {
      userLoggers[userId].add(
        new transports.Console({
          format: format.combine(
            format.colorize(),
            format.simple()
          ),
        })
      );
    }
  }
  
  return userLoggers[userId];
}

// 用户特定的日志方法
function logUserInfo(userId: string, message: string, meta = {}) {
  getUserLogger(userId).info("[" + getBeijingTimeISO() + "]", { message, ...meta });
}

function logUserError(userId: string, message: string, error: any, meta = {}) {
  const errorObj = error instanceof Error ? error : null;
  getUserLogger(userId).error("[" + getBeijingTimeISO() + "]", {
    message,
    error: errorObj ? errorObj.message : error,
    ...meta,
  });
}

function logUserWarn(userId: string, message: string, meta = {}) {
  getUserLogger(userId).warn("[" + getBeijingTimeISO() + "]", { message, ...meta });
}


export function logIotAction(params: IotControlParams & { success: boolean; message: string }) {
  // 可自行接入日志系统
  const { deviceKey, action, value, success, message } = params;
  logUserInfo(deviceKey, `[IOT] [${new Date().toISOString()}] deviceKey=${deviceKey}, action=${action}, value=${value}, success=${success}, message=${message}`);
}
