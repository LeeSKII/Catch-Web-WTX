/**
 * Store 统一导出模块
 *
 * @description
 * 提供全局 Store 实例和访问接口。
 *
 * 本应用使用 Vue 3 的 reactive API 实现轻量级状态管理，
 * 无需额外引入 Vuex 或 Pinia 等状态管理库。
 *
 * @module stores/index
 *
 * @example
 * ```ts
 * // 推荐方式：使用 useStores() hook
 * const { dataStore, uiStore, settingsStore } = useStores()
 * dataStore.updateExtractedData({ ... })
 * ```
 */

import { useDataStore } from './dataStore'
import { useUIStore } from './uiStore'
import { useSettingsStore } from './settingsStore'

// ============================================================================
// 全局 Store 单例实例
// ============================================================================

/**
 * 全局 store 单例实例
 *
 * @description
 * 应用启动时创建，作为唯一的真理来源（Single Source of Truth）。
 * 所有组件都应通过 useStores() hook 访问这些实例。
 *
 * @internal
 */
const globalStores = {
  /** 数据存储单例 */
  data: useDataStore(),
  /** UI 状态存储单例 */
  ui: useUIStore(),
  /** 设置存储单例 */
  settings: useSettingsStore(),
}

// ============================================================================
// Store 实例导出（向后兼容）
// ============================================================================

/**
 * 数据 Store 实例
 *
 * @description
 * 直接导出的单例实例，用于快速访问。
 *
 * @deprecated 推荐使用 useStores() hook 获取 store 实例
 *
 * @example
 * ```ts
 * import { dataStore } from '@/stores'
 * dataStore.updateExtractedData({ ... })
 * ```
 */
export const dataStore = globalStores.data

/**
 * UI Store 实例
 *
 * @description
 * 直接导出的单例实例，用于快速访问。
 *
 * @deprecated 推荐使用 useStores() hook 获取 store 实例
 *
 * @example
 * ```ts
 * import { uiStore } from '@/stores'
 * uiStore.switchTab('chat')
 * ```
 */
export const uiStore = globalStores.ui

/**
 * 设置 Store 实例
 *
 * @description
 * 直接导出的单例实例，用于快速访问。
 *
 * @deprecated 推荐使用 useStores() hook 获取 store 实例
 *
 * @example
 * ```ts
 * import { settingsStore } from '@/stores'
 * await settingsStore.loadSettings()
 * ```
 */
export const settingsStore = globalStores.settings

// ============================================================================
// 导出的 Store 构造函数
// ============================================================================

/**
 * 导出各个 store 的构造函数
 *
 * @description
 * 用于测试场景或需要创建独立 store 实例的情况。
 *
 * @example
 * ```ts
 * import { useDataStore } from '@/stores'
 * const testStore = useDataStore()
 * ```
 */
export { useDataStore, useUIStore, useSettingsStore }

// ============================================================================
// 主要导出：useStores() Hook
// ============================================================================

/**
 * 获取 store 实例的 hook
 *
 * @description
 * 返回全局 store 单例对象的函数。
 *
 * 这是访问 store 的推荐方式，具有以下优势：
 * - 统一的访问入口
 * - 支持代码重构（如改为依赖注入模式）
 * - 更好的 IDE 提示
 *
 * @returns 包含所有 store 的对象
 *
 * @example
 * ```ts
 * // 在组件或 composable 中使用
 * const { dataStore, uiStore, settingsStore } = useStores()
 *
 * // 使用 dataStore
 * dataStore.updateExtractedData({ ... })
 * dataStore.setLoading(true)
 *
 * // 使用 uiStore
 * uiStore.switchTab('chat')
 * uiStore.showToast('操作成功', 'success')
 *
 * // 使用 settingsStore
 * await settingsStore.loadSettings()
 * settingsStore.updateSettings({ darkMode: true })
 * ```
 */
export const useStores = () => ({
  dataStore: globalStores.data,
  uiStore: globalStores.ui,
  settingsStore: globalStores.settings,
})

// ============================================================================
// 类型导出
// ============================================================================

/**
 * 导出 Store 相关类型
 *
 * @description
 * 用于类型注解、泛型约束或测试类型定义
 *
 * @example
 * ```ts
 * import type { DataStore, UIStore, SettingsStore } from '@/stores'
 *
 * function mockStore<T extends DataStore>(store: T) { ... }
 * ```
 */
export type {
  DataStore,
  DataStoreState,
  DataStoreStats,
  DataStoreActions,
  UIStore,
  UIStoreState,
  UIStoreActions,
  SettingsStore,
  SettingsStoreState,
  SettingsStoreActions,
  TabName,
  ToastType,
  DataStoreFactory,
  UIStoreFactory,
  SettingsStoreFactory,
} from './types'
