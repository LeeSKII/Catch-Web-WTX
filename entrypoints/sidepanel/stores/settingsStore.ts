import { reactive } from 'vue'
import type { Settings } from '../types'

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
  openaiBaseUrl: '',
  aiModel: ''
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
    
    loadSettings() {
      // 从localStorage加载设置
      const savedSettings = localStorage.getItem('appSettings')
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings)
          // 合并默认设置和保存的设置，确保所有字段都有值
          state.settings = { ...defaultSettings, ...parsed }
          
          // 特别处理openaiApiKey，确保从单独的localStorage项中读取（如果存在）
          const separateApiKey = localStorage.getItem('openaiApiKey')
          if (separateApiKey !== null) {
            state.settings.openaiApiKey = separateApiKey
          }
        } catch (error) {
          console.error('解析设置失败，使用默认设置:', error)
          state.settings = { ...defaultSettings }
        }
      } else {
        state.settings = { ...defaultSettings }
        
        // 如果没有appSettings，尝试从单独的localStorage项中加载openaiApiKey
        const separateApiKey = localStorage.getItem('openaiApiKey')
        if (separateApiKey !== null) {
          state.settings.openaiApiKey = separateApiKey
        }
      }
      state.isLoaded = true
    },
    
    saveSettings() {
      // 确保API密钥被正确保存，即使为空字符串
      const settingsToSave = { ...state.settings };
      // 明确确保openaiApiKey字段被包含
      if ('openaiApiKey' in settingsToSave) {
        // 确保字符串类型，去除可能的空格
        settingsToSave.openaiApiKey = String(settingsToSave.openaiApiKey || '').trim();
      }
      localStorage.setItem('appSettings', JSON.stringify(settingsToSave))
      
      // 同时为了兼容性，也单独保存openaiApiKey（这样其他地方读取时能获取到）
      localStorage.setItem('openaiApiKey', settingsToSave.openaiApiKey);
    },
    
    clearData() {
      localStorage.removeItem('appSettings')
      localStorage.removeItem('openaiApiKey')
      state.settings = { ...defaultSettings }
    }
  }

  return {
    state,
    ...actions
  }
}