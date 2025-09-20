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
        } catch (error) {
          console.error('解析设置失败，使用默认设置:', error)
          state.settings = { ...defaultSettings }
        }
      } else {
        state.settings = { ...defaultSettings }
      }
      state.isLoaded = true
    },
    
    saveSettings() {
      localStorage.setItem('appSettings', JSON.stringify(state.settings))
    },
    
    clearData() {
      localStorage.removeItem('appSettings')
      state.settings = { ...defaultSettings }
    }
  }

  return {
    state,
    ...actions
  }
}