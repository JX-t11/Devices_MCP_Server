import { logConfig } from '@/config';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private level: LogLevel;

  constructor() {
    this.level = this.getLogLevel();
  }

  private getLogLevel(): LogLevel {
    switch (logConfig.level.toLowerCase()) {
      case 'debug':
        return LogLevel.DEBUG;
      case 'info':
        return LogLevel.INFO;
      case 'warn':
        return LogLevel.WARN;
      case 'error':
        return LogLevel.ERROR;
      default:
        return LogLevel.INFO;
    }
  }

  // 格式化北京时间（UTC+8）
  private getBeijingTimeString(): string {
    const date = new Date();
    // 获取UTC时间戳并加上8小时的毫秒数
    const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    // 格式化为YYYY-MM-DD HH:mm:ss.sss格式
    return beijingTime.toISOString().replace('T', ' ').replace('Z', '');
  }
  
  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = this.getBeijingTimeString();
    const formattedArgs =
      args.length > 0
        ? ` ${args
            .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
            .join(' ')}`
        : '';
    return `[${timestamp}] [${level}] ${message}${formattedArgs}`;
  }

  debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG && logConfig.enableConsole) {
      console.debug(this.formatMessage('DEBUG', message, ...args));
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO && logConfig.enableConsole) {
      console.info(this.formatMessage('INFO', message, ...args));
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN && logConfig.enableConsole) {
      console.warn(this.formatMessage('WARN', message, ...args));
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR && logConfig.enableConsole) {
      console.error(this.formatMessage('ERROR', message, ...args));
    }
  }
}

export const logger = new Logger();
