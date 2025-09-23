import { reactive } from 'vue'
import type { Settings } from '../types'
import { browser } from 'wxt/browser'

// 默认设置
const defaultSettings: Settings = {
  showPreviews: true,
  darkMode: false,
  dataRetention: '7',
  extractHtml: true,
  extractText: true,
  extractImages: true,
  extractLinks: true,
  extractMeta: true,
  extractStyles: false,
  extractScripts: false,
  extractArticle: true,
  openaiApiKey: '',
  openaiBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  aiModel: 'qwen-turbo'
}

export const useSettingsStore = () => {
  const state = reactive({
    settings: { ...defaultSettings },
    isLoaded: false
  })

  const actions = {
    updateSettings(newSettings: Partial<Settings>) {
      state.settings = { ...state.settings, ...newSettings }
    },
    
    async loadSettings() {
      // 从 browser.storage.local 加载设置
      const result = await browser.storage.local.get('appSettings')
      const savedSettings = result.appSettings
      
      if (savedSettings) {
        try {
          // 合并默认设置和保存的设置，确保所有字段都有值
          state.settings = { ...defaultSettings, ...savedSettings }
          
          // 特别处理API相关设置，确保从单独的 storage 项中读取（如果存在）
          const apiResult = await browser.storage.local.get(['openaiApiKey', 'openaiBaseUrl', 'aiModel'])
          if (apiResult.openaiApiKey !== null) {
            state.settings.openaiApiKey = apiResult.openaiApiKey
          }
          
          if (apiResult.openaiBaseUrl !== null) {
            state.settings.openaiBaseUrl = apiResult.openaiBaseUrl
          }
          
          if (apiResult.aiModel !== null) {
            state.settings.aiModel = apiResult.aiModel
          }
        } catch (error) {
          console.error('解析设置失败，使用默认设置:', error)
          state.settings = { ...defaultSettings }
        }
      } else {
        state.settings = { ...defaultSettings }
        
        // 如果没有appSettings，尝试从单独的 storage 项中加载API相关设置
        const apiResult = await browser.storage.local.get(['openaiApiKey', 'openaiBaseUrl', 'aiModel'])
        if (apiResult.openaiApiKey !== null) {
          state.settings.openaiApiKey = apiResult.openaiApiKey
        }
        
        if (apiResult.openaiBaseUrl !== null) {
          state.settings.openaiBaseUrl = apiResult.openaiBaseUrl
        }
        
        if (apiResult.aiModel !== null) {
          state.settings.aiModel = apiResult.aiModel
        }
      }
      state.isLoaded = true
    },
    
    async saveSettings() {
      // 确保API相关设置被正确保存，即使为空字符串
      const settingsToSave = { ...state.settings };
      // 明确确保API相关字段被包含
      if ('openaiApiKey' in settingsToSave) {
        // 确保字符串类型，去除可能的空格
        settingsToSave.openaiApiKey = String(settingsToSave.openaiApiKey || '').trim();
      }
      if ('openaiBaseUrl' in settingsToSave) {
        // 确保字符串类型，去除可能的空格
        settingsToSave.openaiBaseUrl = String(settingsToSave.openaiBaseUrl || '').trim();
      }
      if ('aiModel' in settingsToSave) {
        // 确保字符串类型，去除可能的空格
        settingsToSave.aiModel = String(settingsToSave.aiModel || '').trim();
      }
      
      // 使用 browser.storage.local 替代 localStorage
      await browser.storage.local.set({ appSettings: settingsToSave });
      
      // 同时为了兼容性，也单独保存API相关设置（这样其他地方读取时能获取到）
      await browser.storage.local.set({
        openaiApiKey: settingsToSave.openaiApiKey,
        openaiBaseUrl: settingsToSave.openaiBaseUrl,
        aiModel: settingsToSave.aiModel
      });
    },
    
    async clearData() {
      // 使用 browser.storage.local 替代 localStorage
      await browser.storage.local.remove(['appSettings', 'openaiApiKey', 'openaiBaseUrl', 'aiModel'])
      state.settings = { ...defaultSettings }
    },

    async cleanupExpiredData() {
      try {
        const retentionDays = parseInt(state.settings.dataRetention || '7');
        
        if (retentionDays === 0) return; // 永久保存，不清理
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        
        console.log(`开始清理超过 ${retentionDays} 天的数据，截止日期: ${cutoffDate.toISOString()}`);
        
        // 清理过期的提取数据
        await this.cleanupExtractedData(cutoffDate);
        
        // 清理过期的AI总结数据
        await this.cleanupAISummaryData(cutoffDate);
        
        // 清理过期的聊天历史
        await this.cleanupChatHistory(cutoffDate);
        
        console.log('数据清理完成');
      } catch (error) {
        console.error('数据清理失败:', error);
      }
    },

    async cleanupExtractedData(cutoffDate: Date) {
      const result = await browser.storage.local.get('extractedData');
      const extractedData = result.extractedData;
      
      if (extractedData && extractedData.extractedAt) {
        const extractedDate = new Date(extractedData.extractedAt);
        if (extractedDate < cutoffDate) {
          await browser.storage.local.remove('extractedData');
          console.log('已清理过期的提取数据');
        }
      }
    },

    async cleanupAISummaryData(cutoffDate: Date) {
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
    },

    async cleanupChatHistory(cutoffDate: Date) {
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
  }

  return {
    state,
    ...actions
  }
}