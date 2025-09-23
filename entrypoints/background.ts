export default defineBackground(() => {
  console.log("Background script loaded", { id: browser.runtime.id });

  // 监听插件安装事件，设置定时清理任务
  browser.runtime.onInstalled.addListener(async () => {
    // 创建每日清理任务
    await browser.alarms.create('dailyCleanup', {
      delayInMinutes: 24 * 60, // 24小时后首次执行
      periodInMinutes: 24 * 60 // 每24小时执行一次
    });
    
    // 立即执行一次清理
    await cleanupExpiredData();
  });

  // 监听定时清理任务
  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'dailyCleanup') {
      await cleanupExpiredData();
    }
  });

  // 监听插件启动事件，检查是否需要清理
  browser.runtime.onStartup.addListener(async () => {
    await cleanupExpiredData();
  });

  // 监听设置变化，立即触发清理
  browser.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName === 'local' && changes.appSettings) {
      const newSettings = changes.appSettings.newValue;
      if (newSettings && newSettings.dataRetention) {
        await cleanupExpiredData();
      }
    }
  });

  // 监听插件图标点击事件
  browser.action.onClicked.addListener(async (tab) => {
    try {
      console.log("Action clicked, opening side panel");
      await browser.sidePanel.open({ windowId: tab.windowId });
    } catch (error) {
      console.error("Failed to open side panel:", error);
    }
  });
});

// 数据清理函数
async function cleanupExpiredData() {
  try {
    // 获取当前设置
    const result = await browser.storage.local.get('appSettings');
    const settings = result.appSettings || {};
    const retentionDays = parseInt(settings.dataRetention || '7');
    
    if (retentionDays === 0) return; // 永久保存，不清理
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    console.log(`开始清理超过 ${retentionDays} 天的数据，截止日期: ${cutoffDate.toISOString()}`);
    
    // 清理过期的提取数据
    await cleanupExtractedData(cutoffDate);
    
    // 清理过期的AI总结数据
    await cleanupAISummaryData(cutoffDate);
    
    // 清理过期的聊天历史
    await cleanupChatHistory(cutoffDate);
    
    console.log('数据清理完成');
  } catch (error) {
    console.error('数据清理失败:', error);
  }
}

async function cleanupExtractedData(cutoffDate: Date) {
  const result = await browser.storage.local.get('extractedData');
  const extractedData = result.extractedData;
  
  if (extractedData && extractedData.extractedAt) {
    const extractedDate = new Date(extractedData.extractedAt);
    if (extractedDate < cutoffDate) {
      await browser.storage.local.remove('extractedData');
      console.log('已清理过期的提取数据');
    }
  }
}

async function cleanupAISummaryData(cutoffDate: Date) {
  const allData = await browser.storage.local.get(null);
  
  for (const key in allData) {
    if (key.startsWith('aiSummary_')) {
      try {
        const summaryData = allData[key];
        if (summaryData && summaryData.createdAt) {
          const createdDate = new Date(summaryData.createdAt);
          if (createdDate < cutoffDate) {
            await browser.storage.local.remove(key);
            console.log(`已清理过期的AI总结数据: ${key}`);
          }
        }
      } catch (error) {
        console.error(`清理AI总结数据 ${key} 时出错:`, error);
      }
    }
  }
}

async function cleanupChatHistory(cutoffDate: Date) {
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
    console.log(`已清理过期的聊天历史，从 ${chatHistory.length} 条减少到 ${filteredHistory.length} 条`);
  }
}
