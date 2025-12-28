/**
 * 浏览器 API 工具函数
 *
 * @description
 * 提供常用的浏览器 API 操作封装，避免重复代码
 *
 * @module utils/browser
 */

import { browser } from 'wxt/browser'

// Tab 类型定义
interface Tab {
  id?: number
  url?: string
  title?: string
  index?: number
  active?: boolean
  windowId?: number
}

/**
 * 获取当前活动标签页
 *
 * @description
 * 获取当前窗口中处于活动状态的标签页
 *
 * @returns 当前活动标签页对象，如果不存在则返回 undefined
 *
 * @example
 * ```ts
 * import { getCurrentTab } from '@/utils/browser'
 *
 * const tab = await getCurrentTab()
 * if (tab?.url) {
 *   console.log('当前页面:', tab.url)
 * }
 * ```
 */
export async function getCurrentTab(): Promise<Tab | undefined> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
  return tab
}

/**
 * 获取当前标签页的 URL
 *
 * @description
 * 获取当前活动标签页的 URL，不存在时返回空字符串
 *
 * @returns 当前标签页的 URL
 *
 * @example
 * ```ts
 * import { getCurrentUrl } from '@/utils/browser'
 *
 * const url = await getCurrentUrl()
 * console.log('当前 URL:', url)
 * ```
 */
export async function getCurrentUrl(): Promise<string> {
  const tab = await getCurrentTab()
  return tab?.url || ''
}

/**
 * 获取所有标签页
 *
 * @description
 * 获取浏览器中所有打开的标签页列表
 *
 * @returns 所有标签页的数组
 */
export async function getAllTabs(): Promise<Tab[]> {
  return await browser.tabs.query({})
}

/**
 * 创建新标签页并激活
 *
 * @description
 * 在新标签页中打开指定 URL，并切换到该标签页
 *
 * @param url - 要打开的 URL
 *
 * @example
 * ```ts
 * import { openTab } from '@/utils/browser'
 *
 * await openTab('https://example.com')
 * ```
 */
export async function openTab(url: string): Promise<void> {
  await browser.tabs.create({ url })
}

/**
 * 检查 URL 是否已存在于打开的标签页中
 *
 * @description
 * 搜索所有标签页，检查是否已有标签页打开指定 URL
 *
 * @param url - 要检查的 URL
 * @returns 匹配的标签页，如果不存在则返回 undefined
 */
export async function findTabByUrl(url: string): Promise<Tab | undefined> {
  const tabs = await getAllTabs()
  return tabs.find((tab) => tab.url === url)
}

/**
 * 激活指定标签页
 *
 * @description
 * 将指定标签页设为活动状态并切换到该标签页所在窗口
 *
 * @param tabId - 标签页 ID
 */
export async function activateTab(tabId: number): Promise<void> {
  await browser.tabs.update(tabId, { active: true })
}
