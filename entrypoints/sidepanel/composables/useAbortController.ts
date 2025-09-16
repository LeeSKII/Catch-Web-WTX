import { createLogger } from '../utils/logger';

const logger = createLogger('AbortController');

/**
 * 网络请求中断控制器
 * 用于管理和中断正在进行的网络请求
 */
export function useAbortController() {
  // 存储各种类型的AbortController
  const abortControllers = {
    dataExtraction: null as AbortController | null,
    bookmarkCheck: null as AbortController | null,
    aiSummary: null as AbortController | null,
    databaseQuery: null as AbortController | null,
    chat: null as AbortController | null,
  };

  /**
   * 创建并存储新的AbortController
   * @param type 控制器类型
   * @returns AbortController实例
   */
  const createAbortController = (type: keyof typeof abortControllers): AbortController => {
    // 如果已存在，先中止之前的请求
    if (abortControllers[type]) {
      abortControllers[type]!.abort();
      logger.debug(`已中止之前的${type}请求`);
    }

    // 创建新的AbortController
    const controller = new AbortController();
    abortControllers[type] = controller;
    logger.debug(`创建新的${type}AbortController`);
    
    return controller;
  };

  /**
   * 中止指定类型的请求
   * @param type 控制器类型
   */
  const abortRequest = (type: keyof typeof abortControllers) => {
    if (abortControllers[type]) {
      abortControllers[type]!.abort();
      abortControllers[type] = null;
      logger.debug(`已中止${type}请求`);
    }
  };

  /**
   * 中止所有正在进行的请求
   */
  const abortAllRequests = () => {
    Object.keys(abortControllers).forEach(type => {
      abortRequest(type as keyof typeof abortControllers);
    });
    logger.debug('已中止所有正在进行的请求');
  };

  /**
   * 获取指定类型的AbortController
   * @param type 控制器类型
   * @returns AbortController实例或null
   */
  const getAbortController = (type: keyof typeof abortControllers): AbortController | null => {
    return abortControllers[type];
  };

  /**
   * 清理指定类型的AbortController
   * @param type 控制器类型
   */
  const cleanupAbortController = (type: keyof typeof abortControllers) => {
    abortControllers[type] = null;
    logger.debug(`已清理${type}AbortController`);
  };

  return {
    createAbortController,
    abortRequest,
    abortAllRequests,
    getAbortController,
    cleanupAbortController,
  };
}