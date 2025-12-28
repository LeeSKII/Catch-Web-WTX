/**
 * Data Store - 数据存储模块
 *
 * @description
 * 管理从网页提取的数据状态，包括提取的内容、加载状态和错误信息。
 *
 * @module stores/dataStore
 *
 * @example
 * ```ts
 * import { useStores } from './stores'
 *
 * const { dataStore } = useStores()
 *
 * // 更新提取的数据
 * dataStore.updateExtractedData({ title: '...', url: '...' })
 *
 * // 设置加载状态
 * dataStore.setLoading(true)
 *
 * // 获取统计信息
 * console.log(dataStore.stats.imagesCount)
 *
 * // 清除数据
 * dataStore.clearData()
 * ```
 */

import { reactive, computed } from 'vue'
import type { ExtractedData } from '../types'
import type { DataStore, DataStoreFactory } from './types'

/**
 * DataStore 工厂函数
 *
 * @description
 * 创建一个新的数据存储实例。
 *
 * 在应用中通常只需要一个全局实例，通过 useStores() 获取。
 * 此函数主要用于测试场景。
 *
 * @returns DataStore 实例
 *
 * @example
 * ```ts
 * const dataStore = useDataStore()
 * dataStore.updateExtractedData({ ... })
 * ```
 */
export const useDataStore: DataStoreFactory = () => {
  // ========================================================================
  // 状态
  // ========================================================================

  /**
   * 响应式状态
   *
   * @description
   * 存储数据相关的响应式状态。
   *
   * @internal
   */
  const state = reactive({
    /** 提取的网页数据 */
    extractedData: {} as ExtractedData,
    /** 是否正在提取数据 */
    isLoading: false,
    /** 页面是否正在加载 */
    isPageLoading: false,
    /** 最后的错误信息 */
    lastError: null as string | null
  })

  // ========================================================================
  // 计算属性
  // ========================================================================

  /**
   * 数据统计信息
   *
   * @description
   * 提供提取数据的统计信息，包括图片数量、链接数量和字数。
   */
  const stats = computed(() => ({
    /** 图片数量 */
    imagesCount: state.extractedData.images?.length || 0,
    /** 链接数量 */
    linksCount: state.extractedData.links?.length || 0,
    /** 字数统计 */
    wordsCount: state.extractedData.wordCount || 0,
  }))

  // ========================================================================
  // 操作方法
  // ========================================================================

  /**
   * 更新提取的数据
   *
   * @param data - 从网页提取的数据
   *
   * @example
   * ```ts
   * dataStore.updateExtractedData({
   *   title: '页面标题',
   *   url: 'https://example.com',
   *   images: [...]
   * })
   * ```
   */
  const updateExtractedData = (data: ExtractedData) => {
    state.extractedData = { ...data }
  }

  /**
   * 设置加载状态
   *
   * @param loading - 是否正在加载
   *
   * @example
   * ```ts
   * dataStore.setLoading(true)
   * // ... 执行异步操作
   * dataStore.setLoading(false)
   * ```
   */
  const setLoading = (loading: boolean) => {
    state.isLoading = loading
  }

  /**
   * 设置页面加载状态
   *
   * @param loading - 页面是否正在加载
   *
   * @description
   * 用于跟踪目标网页的加载状态，
   * 在标签页切换或页面导航时使用。
   *
   * @example
   * ```ts
   * dataStore.setPageLoading(true)
   * ```
   */
  const setPageLoading = (loading: boolean) => {
    state.isPageLoading = loading
  }

  /**
   * 设置错误信息
   *
   * @param error - 错误信息，传入 null 表示清除错误
   *
   * @example
   * ```ts
   * try {
   *   await fetchData()
   * } catch (err) {
   *   dataStore.setError(err.message)
   * }
   *
   * // 清除错误
   * dataStore.setError(null)
   * ```
   */
  const setError = (error: string | null) => {
    state.lastError = error
  }

  /**
   * 清除所有数据
   *
   * @description
   * 重置所有提取的数据和错误状态，
   * 但不影响加载状态。
   *
   * @example
   * ```ts
   * dataStore.clearData()
   * ```
   */
  const clearData = () => {
    state.extractedData = {} as ExtractedData
    state.lastError = null
  }

  // ========================================================================
  // 返回接口
  // ========================================================================

  return {
    state,
    stats,
    updateExtractedData,
    setLoading,
    setPageLoading,
    setError,
    clearData,
  }
}
