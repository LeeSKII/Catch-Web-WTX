import { reactive } from 'vue';
import { Settings } from '../types';
import { API_CONFIG } from '../constants';

export function useSettings() {
  const settings = reactive<Settings>({
    showPreviews: localStorage.getItem('showPreviews') !== 'false',
    darkMode: localStorage.getItem('darkMode') === 'true',
    dataRetention: localStorage.getItem('dataRetention') || '7',
    extractHtml: localStorage.getItem('extractHtml') !== 'false',
    extractText: localStorage.getItem('extractText') !== 'false',
    extractImages: localStorage.getItem('extractImages') !== 'false',
    extractLinks: localStorage.getItem('extractLinks') !== 'false',
    extractMeta: localStorage.getItem('extractMeta') !== 'false',
    extractStyles: localStorage.getItem('extractStyles') === 'true',
    extractScripts: localStorage.getItem('extractScripts') === 'true',
    extractArticle: localStorage.getItem('extractArticle') !== 'false',
    openaiApiKey: localStorage.getItem('openaiApiKey') || '',
    openaiBaseUrl: localStorage.getItem('openaiBaseUrl') || API_CONFIG.DEFAULT_BASE_URL,
    aiModel: localStorage.getItem('aiModel') || API_CONFIG.DEFAULT_MODEL
  });

  const loadSettings = () => {
    settings.showPreviews = localStorage.getItem('showPreviews') !== 'false';
    settings.darkMode = localStorage.getItem('darkMode') === 'true';
    settings.dataRetention = localStorage.getItem('dataRetention') || '7';
    settings.extractHtml = localStorage.getItem('extractHtml') !== 'false';
    settings.extractText = localStorage.getItem('extractText') !== 'false';
    settings.extractImages = localStorage.getItem('extractImages') !== 'false';
    settings.extractLinks = localStorage.getItem('extractLinks') !== 'false';
    settings.extractMeta = localStorage.getItem('extractMeta') !== 'false';
    settings.extractStyles = localStorage.getItem('extractStyles') === 'true';
    settings.extractScripts = localStorage.getItem('extractScripts') === 'true';
    settings.extractArticle = localStorage.getItem('extractArticle') !== 'false';
    settings.openaiApiKey = localStorage.getItem('openaiApiKey') || '';
    settings.openaiBaseUrl = localStorage.getItem('openaiBaseUrl') || API_CONFIG.DEFAULT_BASE_URL;
    settings.aiModel = localStorage.getItem('aiModel') || API_CONFIG.DEFAULT_MODEL;
  };

  const saveSettings = () => {
    localStorage.setItem('showPreviews', settings.showPreviews.toString());
    localStorage.setItem('darkMode', settings.darkMode.toString());
    localStorage.setItem('dataRetention', settings.dataRetention);
    localStorage.setItem('extractHtml', settings.extractHtml.toString());
    localStorage.setItem('extractText', settings.extractText.toString());
    localStorage.setItem('extractImages', settings.extractImages.toString());
    localStorage.setItem('extractLinks', settings.extractLinks.toString());
    localStorage.setItem('extractMeta', settings.extractMeta.toString());
    localStorage.setItem('extractStyles', settings.extractStyles.toString());
    localStorage.setItem('extractScripts', settings.extractScripts.toString());
    localStorage.setItem('extractArticle', settings.extractArticle.toString());
    
    // 对于API密钥，即使为空也要保存，以确保能正确清除旧值
    localStorage.setItem('openaiApiKey', settings.openaiApiKey.trim());
    localStorage.setItem('openaiBaseUrl', settings.openaiBaseUrl.trim());
    localStorage.setItem('aiModel', settings.aiModel.trim());
  };

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    settings[key] = value;
  };

  const resetSettings = () => {
    // 重置为默认设置
    settings.showPreviews = true;
    settings.darkMode = false;
    settings.dataRetention = '7';
    settings.extractHtml = true;
    settings.extractText = true;
    settings.extractImages = true;
    settings.extractLinks = true;
    settings.extractMeta = true;
    settings.extractStyles = false;
    settings.extractScripts = false;
    settings.extractArticle = true;
    settings.openaiApiKey = '';
    settings.openaiBaseUrl = API_CONFIG.DEFAULT_BASE_URL;
    settings.aiModel = API_CONFIG.DEFAULT_MODEL;
    
    saveSettings();
  };

  const clearData = () => {
    localStorage.removeItem('extractedData');
    
    // 清理AI总结数据
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('aiSummary_')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
  };

  const cleanExpiredData = () => {
    // 获取数据保留时间设置（天）
    const retentionDays = parseInt(settings.dataRetention || '7');

    // 如果设置为永久保留（0天），则不进行清理
    if (retentionDays === 0) {
      return;
    }

    // 计算截止时间（毫秒）
    const cutoffTime = new Date().getTime() - retentionDays * 24 * 60 * 60 * 1000;

    // 清理提取的数据
    const extractedDataStr = localStorage.getItem('extractedData');
    if (extractedDataStr) {
      try {
        const extractedData = JSON.parse(extractedDataStr);
        if (extractedData.extractedAt) {
          const extractedTime = new Date(extractedData.extractedAt).getTime();
          if (extractedTime < cutoffTime) {
            localStorage.removeItem('extractedData');
          }
        }
      } catch (e) {
        console.error('解析提取数据时出错:', e);
      }
    }

    // 清理AI总结数据
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      // 检查是否是AI总结数据的key
      if (key && key.startsWith('aiSummary_')) {
        try {
          const summaryDataStr = localStorage.getItem(key);
          if (summaryDataStr) {
            const summaryData = JSON.parse(summaryDataStr);
            if (summaryData.createdAt) {
              const createdTime = new Date(summaryData.createdAt).getTime();
              if (createdTime < cutoffTime) {
                localStorage.removeItem(key);
              }
            }
          }
        } catch (e) {
          console.error('解析AI总结数据时出错:', e, 'key:', key);
        }
      }
    }
  };

  return {
    settings,
    loadSettings,
    saveSettings,
    updateSetting,
    resetSettings,
    clearData,
    cleanExpiredData
  };
}