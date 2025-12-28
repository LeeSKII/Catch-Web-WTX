/**
 * 聊天历史管理模块
 *
 * @description
 * 处理聊天会话的生命周期，包括创建、加载、删除、导出等。
 * 数据持久化存储在 browser.storage.local 中。
 *
 * @module composables/chat/useChatHistory
 *
 * @example
 * ```ts
 * const {
 *   chatHistory,
 *   currentChatId,
 *   createNewChat,
 *   loadChat,
 *   deleteChat,
 *   exportChat
 * } = useChatHistory()
 *
 * // 创建新聊天
 * createNewChat()
 *
 * // 切换聊天
 * loadChat('chat-id-123')
 * ```
 */

import { ref, onMounted } from 'vue'
import { browser } from 'wxt/browser'
import { createLogger } from '../../utils/logger'
import { useToast } from '../useToast'
import type { ChatHistory, ChatMessage } from './types'

const logger = createLogger('ChatHistory')
const { success, error, warning, info } = useToast()

/**
 * 聊天历史管理 Composable
 *
 * @description
 * 提供聊天会话的完整生命周期管理功能
 *
 * @returns 聊天历史状态和方法
 */
export function useChatHistory() {
  // ========================================================================
  // 状态
  // ========================================================================

  /** 聊天历史列表 */
  const chatHistory = ref<ChatHistory[]>([])

  /** 当前激活的聊天 ID */
  const currentChatId = ref<string>('')

  // ========================================================================
  // 生命周期钩子
  // ========================================================================

  /**
   * 组件挂载时加载聊天历史
   */
  onMounted(async () => {
    await loadChatHistory()
  })

  // ========================================================================
  // 方法
  // ========================================================================

  /**
   * 加载聊天历史
   *
   * @description
   * 从 browser.storage.local 加载所有聊天会话
   */
  const loadChatHistory = async () => {
    try {
      const result = await browser.storage.local.get('chatHistory')
      const chatHistoryData = result.chatHistory

      if (chatHistoryData) {
        chatHistory.value = chatHistoryData.map((chat: any) => ({
          ...chat,
          createdAt: new Date(chat.createdAt),
          updatedAt: new Date(chat.updatedAt),
        }))
      }
    } catch (err) {
      logger.error('加载聊天历史失败', err)
    }
  }

  /**
   * 保存聊天历史
   *
   * @description
   * 将当前聊天历史保存到 browser.storage.local
   */
  const saveChatHistory = async () => {
    try {
      await browser.storage.local.set({
        chatHistory: chatHistory.value,
      })
    } catch (err) {
      logger.error('保存聊天历史失败', err)
    }
  }

  /**
   * 创建新聊天
   *
   * @param initialMessages - 初始消息列表，默认为空数组
   * @returns 新创建的聊天 ID
   *
   * @example
   * ```ts
   * const chatId = createNewChat()
   * ```
   */
  const createNewChat = (initialMessages: ChatMessage[] = []): string => {
    const chatId = Date.now().toString()
    currentChatId.value = chatId

    const newChat: ChatHistory = {
      id: chatId,
      title: '新对话',
      messages: [...initialMessages],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    chatHistory.value.unshift(newChat)
    saveChatHistory()

    info('已创建新对话')

    return chatId
  }

  /**
   * 加载指定聊天
   *
   * @param chatId - 要加载的聊天 ID
   * @returns 是否成功加载
   *
   * @example
   * ```ts
   * loadChat('chat-id-123')
   * ```
   */
  const loadChat = (chatId: string): boolean => {
    const chat = chatHistory.value.find((c) => c.id === chatId)
    if (chat) {
      currentChatId.value = chatId
      return true
    }
    return false
  }

  /**
   * 删除聊天
   *
   * @param chatId - 要删除的聊天 ID
   *
   * @example
   * ```ts
   * deleteChat('chat-id-123')
   * ```
   */
  const deleteChat = (chatId: string) => {
    chatHistory.value = chatHistory.value.filter((c) => c.id !== chatId)

    // 如果删除的是当前聊天，创建新聊天
    if (currentChatId.value === chatId) {
      createNewChat()
    }

    saveChatHistory()
    success('对话已删除')
  }

  /**
   * 更新聊天标题
   *
   * @param chatId - 聊天 ID
   * @param title - 新标题
   *
   * @example
   * ```ts
   * updateChatTitle('chat-id-123', '新的标题')
   * ```
   */
  const updateChatTitle = (chatId: string, title: string) => {
    const chat = chatHistory.value.find((c) => c.id === chatId)
    if (chat) {
      chat.title = title
      chat.updatedAt = new Date()
      saveChatHistory()
    }
  }

  /**
   * 更新当前聊天的消息列表
   *
   * @param messages - 新的消息列表
   */
  const updateCurrentChatMessages = (messages: ChatMessage[]) => {
    const chat = chatHistory.value.find((c) => c.id === currentChatId.value)
    if (chat) {
      chat.messages = [...messages]
      chat.updatedAt = new Date()
      saveChatHistory()
    }
  }

  /**
   * 清空当前对话
   *
   * @description
   * 清空当前聊天的所有非系统消息
   *
   * @returns 是否成功清空
   */
  const clearChat = (): boolean => {
    const chat = chatHistory.value.find((c) => c.id === currentChatId.value)
    if (!chat) {
      warning('没有可清空的对话')
      return false
    }

    // 只保留系统消息
    const systemMessages = chat.messages.filter((msg) => msg.role === 'system')
    if (systemMessages.length === chat.messages.length) {
      warning('当前对话已经是空的')
      return false
    }

    chat.messages = systemMessages
    chat.updatedAt = new Date()
    saveChatHistory()

    success('对话已清空')
    return true
  }

  /**
   * 保存当前对话
   *
   * @description
   * 手动保存当前对话到存储
   *
   * @returns 是否成功保存
   */
  const saveChat = (): boolean => {
    const chat = chatHistory.value.find((c) => c.id === currentChatId.value)
    if (!chat) {
      warning('没有可保存的对话')
      return false
    }

    chat.updatedAt = new Date()
    saveChatHistory()
    success('对话已保存')
    return true
  }

  /**
   * 导出对话
   *
   * @param chatId - 要导出的聊天 ID
   *
   * @description
   * 将对话导出为文本文件并下载
   */
  const exportChat = (chatId: string) => {
    const chat = chatHistory.value.find((c) => c.id === chatId)
    if (!chat) {
      error('对话不存在')
      return
    }

    const content = chat.messages
      .map(
        (msg) =>
          `${msg.role === 'user' ? 'User' : 'AI'} (${msg.timestamp.toLocaleString()}):\n${
            msg.content
          }\n`
      )
      .join('\n')

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)

    browser.downloads.download({
      url: url,
      filename: `chat-${chat.title}-${new Date().toISOString().slice(0, 10)}.txt`,
      saveAs: true,
    })

    success('对话导出成功')
  }

  /**
   * 根据 first message 自动生成聊天标题
   *
   * @param content - 第一条消息内容
   * @param chatId - 聊天 ID
   */
  const generateChatTitle = (content: string, chatId: string) => {
    const title =
      content.length > 20 ? content.substring(0, 20) + '...' : content
    updateChatTitle(chatId, title)
  }

  // ========================================================================
  // 返回接口
  // ========================================================================

  return {
    // 状态
    chatHistory,
    currentChatId,

    // 方法
    loadChatHistory,
    saveChatHistory,
    createNewChat,
    loadChat,
    deleteChat,
    updateChatTitle,
    updateCurrentChatMessages,
    clearChat,
    saveChat,
    exportChat,
    generateChatTitle,
  }
}
