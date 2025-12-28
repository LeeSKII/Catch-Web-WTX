/**
 * UI Store - UI 状态管理模块
 *
 * @description
 * 管理 UI 相关的状态，包括当前标签页、暗色模式和 Toast 通知。
 *
 * @module stores/uiStore
 *
 * @example
 * ```ts
 * import { useStores } from './stores'
 *
 * const { uiStore } = useStores()
 *
 * // 切换标签页
 * uiStore.switchTab('chat')
 *
 * // 显示通知
 * uiStore.showToast('操作成功', 'success')
 *
 * // 切换暗色模式
 * uiStore.toggleDarkMode()
 * ```
 */

import { reactive } from 'vue'
import type { UIStore, UIStoreFactory, UIStoreState } from './types'

/**
 * Toast 默认显示时长（毫秒）
 *
 * @internal
 */
const TOAST_DURATION = 3000

/**
 * UIStore 工厂函数
 *
 * @description
 * 创建一个新的 UI 状态存储实例。
 *
 * 在应用中通常只需要一个全局实例，通过 useStores() 获取。
 * 此函数主要用于测试场景。
 *
 * @returns UIStore 实例
 *
 * @example
 * ```ts
 * const uiStore = useUIStore()
 * uiStore.switchTab('chat')
 * ```
 */
export const useUIStore: UIStoreFactory = () => {
  // ========================================================================
  // 状态
  // ========================================================================

  /**
   * 响应式状态
   *
   * @description
   * 存储 UI 相关的响应式状态。
   *
   * @internal
   */
  const state: UIStoreState = reactive({
    /** 当前激活的标签页 */
    currentTab: 'results',
    /** 是否暗色模式 */
    isDarkMode: false,
    /** 是否显示 Toast 通知 */
    showToast: false,
    /** Toast 消息内容 */
    toastMessage: '',
    /** Toast 类型 */
    toastType: 'info',
  })

  // ========================================================================
  // 操作方法
  // ========================================================================

  /**
   * 切换标签页
   *
   * @param tabName - 目标标签页名称
   *
   * @example
   * ```ts
   * // 切换到聊天标签页
   * uiStore.switchTab('chat')
   *
   * // 切换到设置标签页
   * uiStore.switchTab('settings')
   * ```
   */
  const switchTab = (tabName: 'results' | 'ai' | 'chat' | 'settings') => {
    state.currentTab = tabName
  }

  /**
   * 切换暗色模式
   *
   * @description
   * 在亮色模式和暗色模式之间切换。
   * 实际的主题切换逻辑由 useTheme composable 处理。
   *
   * @example
   * ```ts
   * uiStore.toggleDarkMode()
   * ```
   */
  const toggleDarkMode = () => {
    state.isDarkMode = !state.isDarkMode
  }

  /**
   * 显示 Toast 通知
   *
   * @param message - 通知消息内容
   * @param type - 通知类型，默认为 'info'
   *
   * @description
   * 显示一个临时通知，3 秒后自动消失。
   * 如果已有通知正在显示，会被替换。
   *
   * @example
   * ```ts
   * // 显示成功通知
   * uiStore.showToast('保存成功', 'success')
   *
   * // 显示错误通知
   * uiStore.showToast('操作失败', 'error')
   *
   * // 显示警告通知
   * uiStore.showToast('请先配置 API 密钥', 'warning')
   *
   * // 显示信息通知
   * uiStore.showToast('正在加载...', 'info')
   * ```
   */
  const showToast = (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info'
  ) => {
    state.toastMessage = message
    state.toastType = type
    state.showToast = true

    // 3 秒后自动隐藏
    setTimeout(() => {
      state.showToast = false
    }, TOAST_DURATION)
  }

  // ========================================================================
  // 返回接口
  // ========================================================================

  return {
    state,
    switchTab,
    toggleDarkMode,
    showToast,
  }
}
