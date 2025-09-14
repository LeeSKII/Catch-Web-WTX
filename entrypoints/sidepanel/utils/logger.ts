/**
 * 日志工具函数
 */

// 日志级别枚举
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// 日志级别名称
const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

// 从环境变量获取日志级别，默认为ERROR级别
const getLogLevel = (): LogLevel => {
  // 在实际应用中，这里可以从环境变量或用户设置中获取
  return process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.ERROR;
};

/**
 * 格式化日志消息
 * @param level 日志级别
 * @param message 日志消息
 * @param data 附加数据
 * @returns 格式化后的日志消息
 */
const formatLogMessage = (
  level: LogLevel,
  message: string,
  data?: any
): string => {
  const timestamp = new Date().toISOString();
  const levelName = LOG_LEVEL_NAMES[level];
  const dataStr = data ? ` | Data: ${JSON.stringify(data)}` : '';
  return `[${timestamp}] [${levelName}] ${message}${dataStr}`;
};

/**
 * 输出日志
 * @param level 日志级别
 * @param message 日志消息
 * @param data 附加数据
 */
const log = (level: LogLevel, message: string, data?: any): void => {
  const currentLevel = getLogLevel();
  
  // 只输出当前级别及以上的日志
  if (level >= currentLevel) {
    const formattedMessage = formatLogMessage(level, message, data);
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
    }
  }
};

/**
 * 调试日志
 * @param message 日志消息
 * @param data 附加数据
 */
export const debug = (message: string, data?: any): void => {
  log(LogLevel.DEBUG, message, data);
};

/**
 * 信息日志
 * @param message 日志消息
 * @param data 附加数据
 */
export const info = (message: string, data?: any): void => {
  log(LogLevel.INFO, message, data);
};

/**
 * 警告日志
 * @param message 日志消息
 * @param data 附加数据
 */
export const warn = (message: string, data?: any): void => {
  log(LogLevel.WARN, message, data);
};

/**
 * 错误日志
 * @param message 日志消息
 * @param data 附加数据
 */
export const error = (message: string, data?: any): void => {
  log(LogLevel.ERROR, message, data);
};

/**
 * 创建带前缀的日志器
 * @param prefix 日志前缀
 * @returns 带前缀的日志函数
 */
export const createLogger = (prefix: string) => {
  return {
    debug: (message: string, data?: any) => debug(`[${prefix}] ${message}`, data),
    info: (message: string, data?: any) => info(`[${prefix}] ${message}`, data),
    warn: (message: string, data?: any) => warn(`[${prefix}] ${message}`, data),
    error: (message: string, data?: any) => error(`[${prefix}] ${message}`, data),
  };
};