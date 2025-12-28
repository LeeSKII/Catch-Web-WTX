/**
 * Settings Store - 设置管理模块
 *
 * @description
 * 管理用户设置，包括数据提取选项、AI API 配置和数据保留策略。
 * 设置数据持久化存储在 browser.storage.local 中。
 *
 * @module stores/settingsStore
 *
 * @example
 * ```ts
 * import { useStores } from './stores'
 *
 * const { settingsStore } = useStores()
 *
 * // 加载设置
 * await settingsStore.loadSettings()
 *
 * // 更新设置
 * settingsStore.updateSettings({ darkMode: true })
 *
 * // 保存设置
 * await settingsStore.saveSettings()
 *
 * // 清理过期数据
 * await settingsStore.cleanupExpiredData()
 * ```
 */

import { reactive } from 'vue'
import type { Settings } from '../types'
import type { SettingsStore, SettingsStoreFactory } from './types'
import { browser } from 'wxt/browser'
import { STORAGE_CONFIG, DATA_RETENTION } from '../constants'
import { createLogger } from '../utils/logger'
import { cleanupAllExpiredData } from '../utils/dataCleanup'

const logger = createLogger('SettingsStore')

// ============================================================================
// 常量定义
// ============================================================================

/**
 * 默认设置
 *
 * @description
 * 应用的默认配置，当没有保存的设置时使用。
 *
 * @internal
 */
const defaultSettings: Settings = {
  /** 是否显示预览 */
  showPreviews: true,
  /** 是否暗色模式 */
  darkMode: false,
  /** 数据保留天数 */
  dataRetention: '7',
  /** 是否提取 HTML */
  extractHtml: true,
  /** 是否提取文本 */
  extractText: true,
  /** 是否提取图片 */
  extractImages: true,
  /** 是否提取链接 */
  extractLinks: true,
  /** 是否提取元数据 */
  extractMeta: true,
  /** 是否提取样式 */
  extractStyles: false,
  /** 是否提取脚本 */
  extractScripts: false,
  /** 是否提取文章内容 */
  extractArticle: true,
  /** OpenAI API 密钥 */
  openaiApiKey: '',
  /** OpenAI API 基础地址 */
  openaiBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  /** AI 模型 */
  aiModel: 'qwen-turbo',
}

/**
 * Storage 存储键名
 *
 * @internal
 */
const STORAGE_KEYS = {
  /** 应用设置主键 */
  APP_SETTINGS: 'appSettings',
  /** API 密钥键 */
  API_KEY: 'openaiApiKey',
  /** API 基础地址键 */
  BASE_URL: 'openaiBaseUrl',
  /** AI 模型键 */
  AI_MODEL: 'aiModel',
  /** 提取数据键 */
  EXTRACTED_DATA: 'extractedData',
  /** 聊天历史键 */
  CHAT_HISTORY: 'chatHistory',
} as const

// ============================================================================
// SettingsStore 工厂函数
// ============================================================================

/**
 * SettingsStore 工厂函数
 *
 * @description
 * 创建一个新的设置存储实例。
 *
 * 在应用中通常只需要一个全局实例，通过 useStores() 获取。
 * 此函数主要用于测试场景。
 *
 * @returns SettingsStore 实例
 *
 * @example
 * ```ts
 * const settingsStore = useSettingsStore()
 * await settingsStore.loadSettings()
 * ```
 */
export const useSettingsStore: SettingsStoreFactory = () => {
  // ========================================================================
  // 状态
  // ========================================================================

  /**
   * 响应式状态
   *
   * @description
   * 存储设置相关的响应式状态。
   *
   * @internal
   */
  const state = reactive({
    /** 用户设置 */
    settings: { ...defaultSettings },
    /** 设置是否已加载 */
    isLoaded: false,
  })

  // ========================================================================
  // 操作方法
  // ========================================================================

  /**
   * 更新设置
   *
   * @param newSettings - 新的设置（部分更新）
   *
   * @description
   * 将传入的设置与现有设置合并。
   * 注意：此方法只更新内存中的状态，
   * 要持久化需要调用 saveSettings()。
   *
   * @example
   * ```ts
   * // 更新单个设置
   * settingsStore.updateSettings({ darkMode: true })
   *
   * // 更新多个设置
   * settingsStore.updateSettings({
   *   darkMode: true,
   *   extractImages: false
   * })
   *
   * // 保存到存储
   * await settingsStore.saveSettings()
   * ```
   */
  const updateSettings = (newSettings: Partial<Settings>) => {
    state.settings = { ...state.settings, ...newSettings }
  }

  /**
   * 从 storage 加载 API 设置
   *
   * @description
   * 辅助函数，用于从单独的 storage 项中加载 API 相关设置
   *
   * @internal
   */
  const loadAPISettings = async () => {
    const apiResult = await browser.storage.local.get([
      STORAGE_KEYS.API_KEY,
      STORAGE_KEYS.BASE_URL,
      STORAGE_KEYS.AI_MODEL,
    ])

    if (apiResult[STORAGE_KEYS.API_KEY] !== null) {
      state.settings.openaiApiKey = apiResult[STORAGE_KEYS.API_KEY]
    }

    if (apiResult[STORAGE_KEYS.BASE_URL] !== null) {
      state.settings.openaiBaseUrl = apiResult[STORAGE_KEYS.BASE_URL]
    }

    if (apiResult[STORAGE_KEYS.AI_MODEL] !== null) {
      state.settings.aiModel = apiResult[STORAGE_KEYS.AI_MODEL]
    }
  }

  /**
   * 从 browser.storage.local 加载设置
   *
   * @description
   * 加载保存的用户设置，合并默认设置确保所有字段都有值。
   *
   * API 相关设置会从单独的 storage 项中读取（向后兼容）。
   *
   * @example
   * ```ts
   * await settingsStore.loadSettings()
   * console.log(settingsStore.state.settings.darkMode)
   * ```
   */
  const loadSettings = async () => {
    // 从 browser.storage.local 加载设置
    const result = await browser.storage.local.get(STORAGE_KEYS.APP_SETTINGS)
    const savedSettings = result[STORAGE_KEYS.APP_SETTINGS]

    if (savedSettings) {
      try {
        // 合并默认设置和保存的设置，确保所有字段都有值
        state.settings = { ...defaultSettings, ...savedSettings }
      } catch (error) {
        logger.error('解析设置失败，使用默认设置:', error)
        state.settings = { ...defaultSettings }
      }
    } else {
      state.settings = { ...defaultSettings }
    }

    // 加载 API 相关设置（从单独的 storage 项中读取，向后兼容）
    await loadAPISettings()

    state.isLoaded = true
  }

  /**
   * 保存设置到 browser.storage.local
   *
   * @description
   * 保存当前设置到浏览器存储。
   *
   * 为了向后兼容，API 相关设置会同时保存到单独的键。
   *
   * @example
   * ```ts
   * settingsStore.updateSettings({ darkMode: true })
   * await settingsStore.saveSettings()
   * ```
   */
  const saveSettings = async () => {
    // 确保设置被正确保存，处理空字符串情况
    const settingsToSave = { ...state.settings }

    // 明确确保 API 相关字段被包含并去除空格
    if (STORAGE_KEYS.API_KEY in settingsToSave) {
      settingsToSave.openaiApiKey = String(settingsToSave.openaiApiKey || '').trim()
    }
    if (STORAGE_KEYS.BASE_URL in settingsToSave) {
      settingsToSave.openaiBaseUrl = String(settingsToSave.openaiBaseUrl || '').trim()
    }
    if (STORAGE_KEYS.AI_MODEL in settingsToSave) {
      settingsToSave.aiModel = String(settingsToSave.aiModel || '').trim()
    }

    // 保存主设置对象
    await browser.storage.local.set({ [STORAGE_KEYS.APP_SETTINGS]: settingsToSave })

    // 同时为了兼容性，也单独保存 API 相关设置
    await browser.storage.local.set({
      [STORAGE_KEYS.API_KEY]: settingsToSave.openaiApiKey,
      [STORAGE_KEYS.BASE_URL]: settingsToSave.openaiBaseUrl,
      [STORAGE_KEYS.AI_MODEL]: settingsToSave.aiModel,
    })
  }

  /**
   * 清除设置数据
   *
   * @description
   * 从 browser.storage.local 删除所有设置相关数据，
   * 并重置为默认值。
   *
   * @example
   * ```ts
   * await settingsStore.clearData()
   * ```
   */
  const clearData = async () => {
    await browser.storage.local.remove([
      STORAGE_KEYS.APP_SETTINGS,
      STORAGE_KEYS.API_KEY,
      STORAGE_KEYS.BASE_URL,
      STORAGE_KEYS.AI_MODEL,
    ])
    state.settings = { ...defaultSettings }
  }

  /**
   * 清理过期数据
   *
   * @description
   * 委托给 dataCleanup 模块处理所有清理逻辑。
   *
   * 如果保留天数设置为 0，则表示永久保存，不执行清理。
   *
   * @example
   * ```ts
   * await settingsStore.cleanupExpiredData()
   * ```
   */
  const cleanupExpiredData = async () => {
    await cleanupAllExpiredData()
  }

  // ========================================================================
  // 返回接口
  // ========================================================================

  return {
    state,
    updateSettings,
    loadSettings,
    saveSettings,
    clearData,
    cleanupExpiredData,
  }
}
