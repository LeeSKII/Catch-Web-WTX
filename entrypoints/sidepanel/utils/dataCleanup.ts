import { browser } from 'wxt/browser';
import { createLogger } from './logger';

/**
 * 数据清理工具函数
 * 统一管理所有数据的清理逻辑
 */

// 创建日志器
const logger = createLogger('DataCleanup');

/**
 * 清理过期数据的配置接口
 */
interface CleanupConfig {
  retentionDays: number;
  cutoffDate: Date;
}

/**
 * 获取清理配置
 * @returns Promise<CleanupConfig> 清理配置
 */
export async function getCleanupConfig(): Promise<CleanupConfig> {
  try {
    // 获取当前设置
    const result = await browser.storage.local.get('appSettings');
    const settings = result.appSettings || {};
    const retentionDays = parseInt(settings.dataRetention || '7');
    
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
    // 默认保留7天
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    return {
      retentionDays: 7,
      cutoffDate
    };
  }
}

/**
 * 清理过期的提取数据
 * @param cutoffDate 截止日期
 */
export async function cleanupExtractedData(cutoffDate: Date): Promise<void> {
  try {
    const result = await browser.storage.local.get('extractedData');
    const extractedData = result.extractedData;
    
    if (extractedData && extractedData.extractedAt) {
      const extractedDate = new Date(extractedData.extractedAt);
      if (extractedDate < cutoffDate) {
        await browser.storage.local.remove('extractedData');
        logger.info('已清理过期的提取数据');
      }
    }
  } catch (error) {
    logger.error('清理提取数据失败', error);
  }
}

/**
 * 清理过期的AI总结数据
 * @param cutoffDate 截止日期
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
              logger.info(`已清理过期的AI总结数据: ${key}`);
            }
          }
        } catch (error) {
          logger.error(`清理AI总结数据 ${key} 时出错`, error);
        }
      }
    }
  } catch (error) {
    logger.error('清理AI总结数据失败', error);
  }
}

/**
 * 清理过期的聊天历史
 * @param cutoffDate 截止日期
 */
export async function cleanupChatHistory(cutoffDate: Date): Promise<void> {
  try {
    const result = await browser.storage.local.get('chatHistory');
    const chatHistory = result.chatHistory || [];
    
    const filteredHistory = chatHistory.filter((chat: any) => {
      if (chat.updatedAt) {
        const updatedDate = new Date(chat.updatedAt);
        return updatedDate >= cutoffDate;
      }
      return true; // 如果没有时间戳，保留
    });
    
    if (filteredHistory.length !== chatHistory.length) {
      await browser.storage.local.set({ chatHistory: filteredHistory });
      logger.info(`已清理过期的聊天历史，从 ${chatHistory.length} 条减少到 ${filteredHistory.length} 条`);
    }
  } catch (error) {
    logger.error('清理聊天历史失败', error);
  }
}

/**
 * 清理过期的引用列表
 * @param cutoffDate 截止日期
 */
export async function cleanupReferenceList(cutoffDate: Date): Promise<void> {
  try {
    const result = await browser.storage.local.get('referenceList');
    const referenceList = result.referenceList || [];
    
    const filteredList = referenceList.filter((item: any) => {
      if (item.extractedAt) {
        const extractedDate = new Date(item.extractedAt);
        return extractedDate >= cutoffDate;
      }
      return true; // 如果没有时间戳，保留
    });
    
    if (filteredList.length !== referenceList.length) {
      await browser.storage.local.set({ referenceList: filteredList });
      logger.info(`已清理过期的引用列表，从 ${referenceList.length} 条减少到 ${filteredList.length} 条`);
    }
  } catch (error) {
    logger.error('清理引用列表失败', error);
  }
}

/**
 * 统一清理所有过期数据
 * @returns Promise<void>
 */
export async function cleanupAllExpiredData(): Promise<void> {
  try {
    const config = await getCleanupConfig();
    
    if (config.retentionDays === 0) {
      logger.info('数据保留设置为了永久保存，跳过清理');
      return;
    }
    
    logger.info(`开始清理超过 ${config.retentionDays} 天的数据，截止日期: ${config.cutoffDate.toISOString()}`);
    
    // 清理过期的提取数据
    await cleanupExtractedData(config.cutoffDate);
    
    // 清理过期的AI总结数据
    await cleanupAISummaryData(config.cutoffDate);
    
    // 清理过期的聊天历史
    await cleanupChatHistory(config.cutoffDate);
    
    // 清理过期的引用列表
    await cleanupReferenceList(config.cutoffDate);
    
    logger.info('数据清理完成');
  } catch (error) {
    logger.error('数据清理失败', error);
  }
}

/**
 * 手动触发清理，可以指定保留天数
 * @param retentionDays 保留天数，0表示永久保存
 * @returns Promise<void>
 */
export async function manualCleanup(retentionDays: number): Promise<void> {
  try {
    if (retentionDays === 0) {
      logger.info('手动清理：数据保留设置为了永久保存，跳过清理');
      return;
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    logger.info(`手动清理：开始清理超过 ${retentionDays} 天的数据，截止日期: ${cutoffDate.toISOString()}`);
    
    // 清理过期的提取数据
    await cleanupExtractedData(cutoffDate);
    
    // 清理过期的AI总结数据
    await cleanupAISummaryData(cutoffDate);
    
    // 清理过期的聊天历史
    await cleanupChatHistory(cutoffDate);
    
    // 清理过期的引用列表
    await cleanupReferenceList(cutoffDate);
    
    logger.info('手动清理完成');
  } catch (error) {
    logger.error('手动清理失败', error);
  }
}

/**
 * 获取存储使用情况统计
 * @returns Promise<Object> 存储使用情况
 */
export async function getStorageStats(): Promise<any> {
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
      totalKeys: Object.keys(allData).length
    };
  } catch (error) {
    console.error('获取存储统计失败:', error);
    return {
      extractedDataCount: 0,
      aiSummaryCount: 0,
      chatHistoryCount: 0,
      referenceListCount: 0,
      otherDataCount: 0,
      totalKeys: 0
    };
  }
}