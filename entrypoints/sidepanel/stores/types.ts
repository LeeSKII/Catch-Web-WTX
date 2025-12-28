/**
 * Store 类型定义
 *
 * @description
 * 定义所有 Store 的接口类型，用于类型导出、文档生成和测试。
 *
 * @module stores/types
 */

import type { ExtractedData, Settings } from '../types'
import type { ComputedRef } from 'vue'

/**
 * Toast 通知类型
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info'

/**
 * 标签页类型
 */
export type TabName = 'results' | 'ai' | 'chat' | 'settings'

// ============================================================================
// DataStore - 数据存储类型
// ============================================================================

/**
 * DataStore 状态接口
 *
 * @description
 * 存储从网页提取的数据和加载状态
 */
export interface DataStoreState {
  /** 提取的网页数据 */
  extractedData: ExtractedData
  /** 是否正在提取数据 */
  isLoading: boolean
  /** 页面是否正在加载 */
  isPageLoading: boolean
  /** 最后的错误信息 */
  lastError: string | null
}

/**
 * DataStore 统计信息接口
 *
 * @description
 * 提取数据的统计信息
 */
export interface DataStoreStats {
  /** 图片数量（计算属性） */
  imagesCount: number
  /** 链接数量（计算属性） */
  linksCount: number
  /** 字数统计（计算属性） */
  wordsCount: number
}

/**
 * DataStore 统计信息类型（ComputedRef）
 *
 * @description
 * stats 属性的实际类型，是一个 ComputedRef
 */
export type DataStoreStatsRef = Readonly<DataStoreStats>

/**
 * DataStore 操作方法接口
 *
 * @description
 * 数据存储的所有操作方法
 */
export interface DataStoreActions {
  /**
   * 更新提取的数据
   *
   * @param data - 提取的网页数据
   */
  updateExtractedData(data: ExtractedData): void

  /**
   * 设置加载状态
   *
   * @param loading - 是否正在加载
   */
  setLoading(loading: boolean): void

  /**
   * 设置页面加载状态
   *
   * @param loading - 页面是否正在加载
   */
  setPageLoading(loading: boolean): void

  /**
   * 设置错误信息
   *
   * @param error - 错误信息，null 表示清除错误
   */
  setError(error: string | null): void

  /**
   * 清除所有数据
   */
  clearData(): void
}

/**
 * DataStore 完整接口
 *
 * @description
 * 数据存储的完整类型定义，包含状态、计算属性和操作方法
 *
 * @example
 * ```ts
 * const { state, stats, updateExtractedData, clearData } = useDataStore()
 * ```
 */
export interface DataStore {
  /** 状态 */
  state: DataStoreState
  /** 统计信息（计算属性） */
  stats: ComputedRef<DataStoreStats>
  /** 操作方法 */
  updateExtractedData: DataStoreActions['updateExtractedData']
  setLoading: DataStoreActions['setLoading']
  setPageLoading: DataStoreActions['setPageLoading']
  setError: DataStoreActions['setError']
  clearData: DataStoreActions['clearData']
}

// ============================================================================
// UIStore - UI 状态类型
// ============================================================================

/**
 * UIStore 状态接口
 *
 * @description
 * 存储 UI 相关的状态
 */
export interface UIStoreState {
  /** 当前激活的标签页 */
  currentTab: TabName
  /** 是否暗色模式 */
  isDarkMode: boolean
  /** 是否显示 Toast 通知 */
  showToast: boolean
  /** Toast 消息内容 */
  toastMessage: string
  /** Toast 类型 */
  toastType: ToastType
}

/**
 * UIStore 操作方法接口
 *
 * @description
 * UI 状态的所有操作方法
 */
export interface UIStoreActions {
  /**
   * 切换标签页
   *
   * @param tabName - 目标标签页名称
   */
  switchTab(tabName: TabName): void

  /**
   * 切换暗色模式
   */
  toggleDarkMode(): void

  /**
   * 显示 Toast 通知
   *
   * @param message - 通知消息
   * @param type - 通知类型
   */
  showToast(message: string, type?: ToastType): void
}

/**
 * UIStore 完整接口
 *
 * @description
 * UI 状态的完整类型定义
 *
 * @example
 * ```ts
 * const { state, switchTab, toggleDarkMode, showToast } = useUIStore()
 * ```
 */
export interface UIStore {
  /** 状态 */
  state: UIStoreState
  /** 操作方法 */
  switchTab: UIStoreActions['switchTab']
  toggleDarkMode: UIStoreActions['toggleDarkMode']
  showToast: UIStoreActions['showToast']
}

// ============================================================================
// SettingsStore - 设置存储类型
// ============================================================================

/**
 * SettingsStore 状态接口
 *
 * @description
 * 存储用户设置和加载状态
 */
export interface SettingsStoreState {
  /** 用户设置 */
  settings: Settings
  /** 设置是否已加载 */
  isLoaded: boolean
}

/**
 * SettingsStore 操作方法接口
 *
 * @description
 * 设置管理的所有操作方法
 */
export interface SettingsStoreActions {
  /**
   * 更新设置
   *
   * @param newSettings - 新的设置（部分更新）
   */
  updateSettings(newSettings: Partial<Settings>): void

  /**
   * 从 browser.storage.local 加载设置
   *
   * @description
   * 加载保存的用户设置，合并默认设置确保所有字段都有值
   */
  loadSettings(): Promise<void>

  /**
   * 保存设置到 browser.storage.local
   *
   * @description
   * 保存当前设置到浏览器存储，同时保存 API 相关设置到单独的键
   */
  saveSettings(): Promise<void>

  /**
   * 清除设置数据
   *
   * @description
   * 从 browser.storage.local 删除所有设置相关数据
   */
  clearData(): Promise<void>

  /**
   * 清理过期数据
   *
   * @description
   * 委托给 dataCleanup 模块处理所有清理逻辑。
   * 根据数据保留设置清理过期的提取数据、AI 总结、聊天历史和引用列表。
   */
  cleanupExpiredData(): Promise<void>
}

/**
 * SettingsStore 完整接口
 *
 * @description
 * 设置管理的完整类型定义
 *
 * @example
 * ```ts
 * const { state, updateSettings, loadSettings, saveSettings } = useSettingsStore()
 * ```
 */
export interface SettingsStore {
  /** 状态 */
  state: SettingsStoreState
  /** 操作方法 */
  updateSettings: SettingsStoreActions['updateSettings']
  loadSettings: SettingsStoreActions['loadSettings']
  saveSettings: SettingsStoreActions['saveSettings']
  clearData: SettingsStoreActions['clearData']
  cleanupExpiredData: SettingsStoreActions['cleanupExpiredData']
}

// ============================================================================
// Store 工厂函数类型
// ============================================================================

/**
 * DataStore 工厂函数类型
 */
export type DataStoreFactory = () => DataStore

/**
 * UIStore 工厂函数类型
 */
export type UIStoreFactory = () => UIStore

/**
 * SettingsStore 工厂函数类型
 */
export type SettingsStoreFactory = () => SettingsStore
