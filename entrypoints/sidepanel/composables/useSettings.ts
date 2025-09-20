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
    // 优先从appSettings加载
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings) as Partial<Settings>;
        // 更新所有设置
        if (parsed.showPreviews !== undefined) settings.showPreviews = parsed.showPreviews;
        if (parsed.darkMode !== undefined) settings.darkMode = parsed.darkMode;
        if (parsed.dataRetention !== undefined) settings.dataRetention = parsed.dataRetention;
        if (parsed.extractHtml !== undefined) settings.extractHtml = parsed.extractHtml;
        if (parsed.extractText !== undefined) settings.extractText = parsed.extractText;
        if (parsed.extractImages !== undefined) settings.extractImages = parsed.extractImages;
        if (parsed.extractLinks !== undefined) settings.extractLinks = parsed.extractLinks;
        if (parsed.extractMeta !== undefined) settings.extractMeta = parsed.extractMeta;
        if (parsed.extractStyles !== undefined) settings.extractStyles = parsed.extractStyles;
        if (parsed.extractScripts !== undefined) settings.extractScripts = parsed.extractScripts;
        if (parsed.extractArticle !== undefined) settings.extractArticle = parsed.extractArticle;
        if (parsed.openaiApiKey !== undefined) settings.openaiApiKey = parsed.openaiApiKey;
        if (parsed.openaiBaseUrl !== undefined) settings.openaiBaseUrl = parsed.openaiBaseUrl;
        if (parsed.aiModel !== undefined) settings.aiModel = parsed.aiModel;
      } catch (error) {
        console.error('解析设置失败，使用默认设置:', error);
      }
    }
    
    // 特别处理API相关设置，确保从单独的localStorage项中读取（如果存在）
    const separateApiKey = localStorage.getItem('openaiApiKey');
    if (separateApiKey !== null) {
      settings.openaiApiKey = separateApiKey;
    }
    
    const separateBaseUrl = localStorage.getItem('openaiBaseUrl');
    if (separateBaseUrl !== null) {
      settings.openaiBaseUrl = separateBaseUrl;
    } else if (!settings.openaiBaseUrl) {
      settings.openaiBaseUrl = API_CONFIG.DEFAULT_BASE_URL;
    }
    
    const separateModel = localStorage.getItem('aiModel');
    if (separateModel !== null) {
      settings.aiModel = separateModel;
    } else if (!settings.aiModel) {
      settings.aiModel = API_CONFIG.DEFAULT_MODEL;
    }
  };

  const saveSettings = () => {
    // 保存所有设置到appSettings对象中
    const settingsToSave = {
      showPreviews: settings.showPreviews,
      darkMode: settings.darkMode,
      dataRetention: settings.dataRetention,
      extractHtml: settings.extractHtml,
      extractText: settings.extractText,
      extractImages: settings.extractImages,
      extractLinks: settings.extractLinks,
      extractMeta: settings.extractMeta,
      extractStyles: settings.extractStyles,
      extractScripts: settings.extractScripts,
      extractArticle: settings.extractArticle,
      openaiApiKey: String(settings.openaiApiKey || '').trim(),
      openaiBaseUrl: String(settings.openaiBaseUrl || '').trim(),
      aiModel: String(settings.aiModel || '').trim()
    };
    
    localStorage.setItem('appSettings', JSON.stringify(settingsToSave));
    
    // 同时为了兼容性，也单独保存关键设置
    localStorage.setItem('openaiApiKey', settingsToSave.openaiApiKey);
    localStorage.setItem('openaiBaseUrl', settingsToSave.openaiBaseUrl);
    localStorage.setItem('aiModel', settingsToSave.aiModel);
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
    
    // 清除单独存储的API密钥
    localStorage.removeItem('openaiApiKey');
    localStorage.removeItem('openaiBaseUrl');
    localStorage.removeItem('aiModel');
    
    saveSettings();
  };

  const clearData = () => {
    localStorage.removeItem('extractedData');
    localStorage.removeItem('appSettings');
    localStorage.removeItem('openaiApiKey');
    localStorage.removeItem('openaiBaseUrl');
    localStorage.removeItem('aiModel');
    
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