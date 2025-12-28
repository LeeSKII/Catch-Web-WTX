/**
 * 数据清理工具模块
 *
 * @description
 * 统一管理所有数据的清理逻辑，包括：
 * - 提取数据清理
 * - AI 总结数据清理
 * - 聊天历史清理
 * - 引用列表清理
 *
 * @module utils/dataCleanup
 *
 * @example
 * ```ts
 * import { cleanupAllExpiredData, manualCleanup } from './utils/dataCleanup'
 *
 * // 自动清理（使用设置的保留天数）
 * await cleanupAllExpiredData()
 *
 * // 手动清理（指定保留天数）
 * await manualCleanup(7)
 * ```
 */

import { browser } from 'wxt/browser';
import { createLogger } from './logger';
import { DATA_RETENTION } from '../constants';

const logger = createLogger('DataCleanup');

/**
 * 清理配置接口
 */
export interface CleanupConfig {
  /** 保留天数 */
  retentionDays: number;
  /** 截止日期 */
  cutoffDate: Date;
}

/**
 * 获取清理配置
 *
 * @description
 * 从浏览器存储中读取用户设置的数据保留天数，
 * 计算截止日期。如果保留天数为 0，表示永久保存。
 *
 * @returns 清理配置
 */
export async function getCleanupConfig(): Promise<CleanupConfig> {
  try {
    const result = await browser.storage.local.get('appSettings');
    const settings = result.appSettings || {};
    const retentionDays = parseInt(settings.dataRetention || String(DATA_RETENTION.DEFAULT_DAYS));
    
    if (retentionDays === 0) {
      // 永久保存，不清理
      return {
        retentionDays: 0,
        cutoffDate: new Date(0) // 设置为很早的日期，这样不会清理任何数据
      };
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    return {
      retentionDays,
      cutoffDate
    };
  } catch (error) {
    logger.error('获取清理配置失败', error);
    // 默认保留天数
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DATA_RETENTION.DEFAULT_DAYS);
    return {
      retentionDays: DATA_RETENTION.DEFAULT_DAYS,
      cutoffDate
    };
  }
}

/**
 * 清理过期的提取数据
 *
 * @param cutoffDate - 截止日期，早于此日期的数据将被清理
 *
 * @description
 * 检查并删除存储中过期的提取数据。
 */
export async function cleanupExtractedData(cutoffDate: Date): Promise<void> {
  try {
    const result = await browser.storage.local.get('extractedData');
    const extractedData = result.extractedData;

    if (extractedData && extractedData.extractedAt) {
      const extractedDate = new Date(extractedData.extractedAt);
      if (extractedDate < cutoffDate) {
        await browser.storage.local.remove('extractedData');
        logger.debug('已清理过期的提取数据');
      }
    }
  } catch (error) {
    logger.error('清理提取数据失败', error);
  }
}

/**
 * 清理过期的 AI 总结数据
 *
 * @param cutoffDate - 截止日期，早于此日期的数据将被清理
 *
 * @description
 * 遍历所有以 'aiSummary_' 开头的 storage 项，
 * 清理创建时间早于截止日期的数据。
 */
export async function cleanupAISummaryData(cutoffDate: Date): Promise<void> {
  try {
    const allData = await browser.storage.local.get(null);

    for (const key in allData) {
      if (key.startsWith('aiSummary_')) {
        try {
          const summaryData = allData[key];
          if (summaryData && summaryData.createdAt) {
            const createdDate = new Date(summaryData.createdAt);
            if (createdDate < cutoffDate) {
              await browser.storage.local.remove(key);
              logger.debug(`已清理过期的 AI 总结数据: ${key}`);
            }
          }
        } catch (error) {
          logger.error(`清理 AI 总结数据 ${key} 时出错`, error);
        }
      }
    }
  } catch (error) {
    logger.error('清理 AI 总结数据失败', error);
  }
}

/**
 * 清理过期的聊天历史
 *
 * @param cutoffDate - 截止日期，早于此日期的数据将被清理
 *
 * @description
 * 过滤聊天历史，保留更新时间晚于截止日期的记录。
 */
export async function cleanupChatHistory(cutoffDate: Date): Promise<void> {
  try {
    const result = await browser.storage.local.get('chatHistory');
    const chatHistory = result.chatHistory || [];

    const filteredHistory = chatHistory.filter((chat: { updatedAt?: string }) => {
      if (chat.updatedAt) {
        const updatedDate = new Date(chat.updatedAt);
        return updatedDate >= cutoffDate;
      }
      return true; // 如果没有时间戳，保留
    });

    if (filteredHistory.length !== chatHistory.length) {
      await browser.storage.local.set({ chatHistory: filteredHistory });
      logger.debug(
        `已清理过期的聊天历史，从 ${chatHistory.length} 条减少到 ${filteredHistory.length} 条`
      );
    }
  } catch (error) {
    logger.error('清理聊天历史失败', error);
  }
}

/**
 * 清理过期的引用列表
 *
 * @param cutoffDate - 截止日期，早于此日期的数据将被清理
 *
 * @description
 * 过滤引用列表，保留提取时间晚于截止日期的记录。
 */
export async function cleanupReferenceList(cutoffDate: Date): Promise<void> {
  try {
    const result = await browser.storage.local.get('referenceList');
    const referenceList = result.referenceList || [];

    const filteredList = referenceList.filter((item: { extractedAt?: string }) => {
      if (item.extractedAt) {
        const extractedDate = new Date(item.extractedAt);
        return extractedDate >= cutoffDate;
      }
      return true; // 如果没有时间戳，保留
    });

    if (filteredList.length !== referenceList.length) {
      await browser.storage.local.set({ referenceList: filteredList });
      logger.debug(
        `已清理过期的引用列表，从 ${referenceList.length} 条减少到 ${filteredList.length} 条`
      );
    }
  } catch (error) {
    logger.error('清理引用列表失败', error);
  }
}

/**
 * 清理所有过期数据
 *
 * @description
 * 主清理函数，根据用户设置的数据保留天数，
 * 清理所有过期的数据（提取数据、AI 总结、聊天历史、引用列表）。
 *
 * 如果保留天数为 0，则表示永久保存，跳过清理。
 */
export async function cleanupAllExpiredData(): Promise<void> {
  try {
    const config = await getCleanupConfig();

    if (config.retentionDays === 0) {
      logger.debug('数据保留设置为了永久保存，跳过清理');
      return;
    }

    logger.debug(`开始清理超过 ${config.retentionDays} 天的数据，截止日期: ${config.cutoffDate.toISOString()}`);

    // 清理过期的提取数据
    await cleanupExtractedData(config.cutoffDate);

    // 清理过期的 AI 总结数据
    await cleanupAISummaryData(config.cutoffDate);

    // 清理过期的聊天历史
    await cleanupChatHistory(config.cutoffDate);

    // 清理过期的引用列表
    await cleanupReferenceList(config.cutoffDate);

    logger.debug('数据清理完成');
  } catch (error) {
    logger.error('数据清理失败', error);
  }
}

/**
 * 手动触发清理
 *
 * @param retentionDays - 保留天数，0 表示永久保存
 *
 * @description
 * 允许手动指定保留天数进行清理，不依赖用户设置。
 */
export async function manualCleanup(retentionDays: number): Promise<void> {
  try {
    if (retentionDays === 0) {
      logger.debug('手动清理：数据保留设置为了永久保存，跳过清理');
      return;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    logger.debug(`手动清理：开始清理超过 ${retentionDays} 天的数据，截止日期: ${cutoffDate.toISOString()}`);

    // 清理过期的提取数据
    await cleanupExtractedData(cutoffDate);

    // 清理过期的 AI 总结数据
    await cleanupAISummaryData(cutoffDate);

    // 清理过期的聊天历史
    await cleanupChatHistory(cutoffDate);

    // 清理过期的引用列表
    await cleanupReferenceList(cutoffDate);

    logger.debug('手动清理完成');
  } catch (error) {
    logger.error('手动清理失败', error);
  }
}

/**
 * 获取存储使用情况统计
 *
 * @returns 存储使用情况
 *
 * @description
 * 统计各种类型数据的数量，用于显示存储使用情况。
 */
export async function getStorageStats(): Promise<{
  extractedDataCount: number;
  aiSummaryCount: number;
  chatHistoryCount: number;
  referenceListCount: number;
  otherDataCount: number;
  totalKeys: number;
}> {
  try {
    const allData = await browser.storage.local.get(null);

    let extractedDataCount = 0;
    let aiSummaryCount = 0;
    let chatHistoryCount = 0;
    let referenceListCount = 0;
    let otherDataCount = 0;

    for (const key in allData) {
      if (key === 'extractedData') {
        extractedDataCount++;
      } else if (key.startsWith('aiSummary_')) {
        aiSummaryCount++;
      } else if (key === 'chatHistory') {
        const chatHistory = allData[key] || [];
        chatHistoryCount = Array.isArray(chatHistory) ? chatHistory.length : 0;
      } else if (key === 'referenceList') {
        const referenceList = allData[key] || [];
        referenceListCount = Array.isArray(referenceList) ? referenceList.length : 0;
      } else {
        otherDataCount++;
      }
    }

    return {
      extractedDataCount,
      aiSummaryCount,
      chatHistoryCount,
      referenceListCount,
      otherDataCount,
      totalKeys: Object.keys(allData).length,
    };
  } catch (error) {
    logger.error('获取存储统计失败', error);
    return {
      extractedDataCount: 0,
      aiSummaryCount: 0,
      chatHistoryCount: 0,
      referenceListCount: 0,
      otherDataCount: 0,
      totalKeys: 0,
    };
  }
}