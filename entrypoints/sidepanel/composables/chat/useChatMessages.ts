/**
 * 消息管理模块
 *
 * @description
 * 处理聊天消息的增删改查操作，协调流式传输和历史管理模块。
 *
 * @module composables/chat/useChatMessages
 *
 * @example
 * ```ts
 * const {
 *   messages,
 *   isChatLoading,
 *   sendMessage,
 *   editMessage,
 *   resendMessage,
 *   truncateMessagesAfter
 * } = useChatMessages()
 *
 * // 发送消息
 * await sendMessage('你好')
 *
 * // 编辑消息
 * editMessage('msg-id', '新内容')
 * ```
 */

import { ref, computed, watch } from 'vue'
import { createLogger } from '../../utils/logger'
import { useToast } from '../useToast'
import { useStores } from '../../stores'
import { useChatStream } from './useChatStream'
import { useChatHistory } from './useChatHistory'
import { useChatReference } from './useChatReference'
import type { ChatMessage, ChatMessageRole } from './types'

const logger = createLogger('ChatMessages')
const { success, error, warning, info } = useToast()

/**
 * 消息管理 Composable
 *
 * @description
 * 提供聊天消息的完整管理功能，包括发送、编辑、重新发送等
 *
 * @param reference - 引用管理实例（可选，如果不传则创建新实例）
 *
 * @returns 消息管理状态和方法
 */
export function useChatMessages(reference?: ReturnType<typeof useChatReference>) {
  const { settingsStore } = useStores()
  const stream = useChatStream()
  const history = useChatHistory()
  const referenceInstance = reference || useChatReference()

  // ========================================================================
  // 状态
  // ========================================================================

  /** 当前消息列表 */
  const messages = ref<ChatMessage[]>([])

  /** 是否正在加载/发送 */
  const isChatLoading = ref(false)

  /** 单独的系统消息引用 */
  const systemMessage = ref<ChatMessage | null>(null)

  // ========================================================================
  // 监听器
  // ========================================================================

  /**
   * 监听引用列表变化，更新系统消息
   */
  watch(
    () => referenceInstance.referenceList.value,
    () => {
      if (referenceInstance.referenceList.value.length > 0) {
        updateSystemMessage()
      } else {
        messages.value = messages.value.filter((msg) => msg.role !== 'system')
        systemMessage.value = null
      }
    },
    { deep: true }
  )

  // ========================================================================
  // 计算属性
  // ========================================================================

  /** 过滤后的消息列表（排除系统消息和流式传输中的消息） */
  const filteredMessages = computed(() => {
    return messages.value.filter(
      (msg) => msg.role !== 'system' && !msg.isStreaming
    )
  })

  // ========================================================================
  // 方法
  // ========================================================================

  /**
   * 更新系统消息
   *
   * @description
   * 根据当前引用列表更新系统消息内容
   */
  const updateSystemMessage = () => {
    if (referenceInstance.referenceList.value.length === 0) {
      messages.value = messages.value.filter((msg) => msg.role !== 'system')
      systemMessage.value = null
      return
    }

    systemMessage.value = {
      role: 'system',
      content: referenceInstance.systemPrompt.value,
      timestamp: new Date(),
    }

    const existingIndex = messages.value.findIndex((msg) => msg.role === 'system')

    if (existingIndex !== -1) {
      messages.value[existingIndex] = systemMessage.value
    } else {
      messages.value.unshift(systemMessage.value)
    }
  }

  /**
   * 准备发送给 API 的消息历史
   *
   * @returns 格式化后的消息数组
   */
  const prepareMessages = (): Array<{ role: string; content: string }> => {
    const messageHistory = messages.value
      .filter((msg) => msg.role !== 'system' && !msg.isStreaming)
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

    if (systemMessage.value) {
      messageHistory.unshift({
        role: systemMessage.value.role,
        content: systemMessage.value.content,
      })
    }

    return messageHistory
  }

  /**
   * 发送消息
   *
   * @param content - 消息内容
   *
   * @description
   * 发送用户消息并获取 AI 流式响应
   */
  const sendMessage = async (content: string) => {
    if (!content.trim()) return

    if (isChatLoading.value) {
      warning('请等待当前消息处理完成')
      return
    }

    // 如果没有当前聊天，创建新聊天
    if (!history.currentChatId) {
      history.createNewChat(messages.value.filter(m => m.role === 'system'))
    }

    // 添加用户消息
    const userMessage: ChatMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      id: Date.now().toString(),
    }

    messages.value.push(userMessage)

    // 更新聊天历史
    const chat = history.chatHistory.value.find(
      (c) => c.id === history.currentChatId.value
    )
    if (chat) {
      chat.messages = [...messages.value]
      chat.updatedAt = new Date()

      // 如果是第一条消息，更新标题
      if (chat.messages.length === 1) {
        history.generateChatTitle(content, chat.id)
      }
    }

    await processStreamResponse(userMessage)
  }

  /**
   * 处理流式响应
   *
   * @param userMessage - 用户消息（用于错误时移除）
   */
  const processStreamResponse = async (userMessage?: ChatMessage) => {
    isChatLoading.value = true
    stream.setStreaming(true)
    stream.streamingContent.value = ''

    logger.debug('开始新的流式传输，重置用户滚动状态')

    // 创建临时 AI 消息
    const streamingMessage: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      id: Date.now().toString(),
    }

    messages.value.push(streamingMessage)
    let streamingMessageIndex = messages.value.length - 1

    try {
      // 重新加载设置，确保获取最新的 API 密钥
      settingsStore.loadSettings()

      const apiKey = settingsStore.state.settings.openaiApiKey
      const baseUrl =
        settingsStore.state.settings.openaiBaseUrl ||
        'https://dashscope.aliyuncs.com/compatible-mode/v1'

      if (!apiKey) {
        throw new Error('请先在设置中配置 OpenAI API 密钥')
      }

      const messageHistory = prepareMessages()

      logger.debug('对话内容', {
        systemPrompt: referenceInstance.systemPrompt.value,
        messages: messageHistory,
      })

      logger.debug('开始调用 OpenAI API 进行流式传输')
      const result = await stream.callOpenAI(
        apiKey,
        baseUrl,
        messageHistory,
        (content) => {
          stream.streamingContent.value = content
          if (
            streamingMessageIndex >= 0 &&
            streamingMessageIndex < messages.value.length
          ) {
            messages.value[streamingMessageIndex].content = content
            logger.debug('流式传输内容更新，长度:', content.length)
          }
        }
      )

      if (result.success && result.content) {
        logger.debug('流式传输成功完成，最终内容长度:', result.content.length)

        if (
          streamingMessageIndex >= 0 &&
          streamingMessageIndex < messages.value.length
        ) {
          messages.value[streamingMessageIndex].content = result.content
          messages.value[streamingMessageIndex].isStreaming = false
          logger.debug('已将临时消息标记为完成状态')
        }

        // 更新聊天历史
        const chat = history.chatHistory.value.find(
          (c) => c.id === history.currentChatId.value
        )
        if (chat) {
          chat.messages = [...messages.value]
          chat.updatedAt = new Date()
        }

        await history.saveChatHistory()
      } else {
        logger.debug('流式传输失败:', result.message)
        if (
          streamingMessageIndex >= 0 &&
          streamingMessageIndex < messages.value.length
        ) {
          messages.value.splice(streamingMessageIndex, 1)
        }
        throw new Error(result.message || '发送消息失败')
      }
    } catch (err: unknown) {
      logger.error('发送消息失败', err)

      const abortController = (
        stream as any
      ).getAbortController?.('chat')
      if (
        abortController?.signal.aborted ||
        (err instanceof Error && err.name === 'AbortError')
      ) {
        info('请求已取消')
      } else {
        error(err instanceof Error ? err.message : '发送消息失败，请重试')
      }

      // 移除用户消息和临时消息
      if (userMessage) {
        messages.value = messages.value.filter((msg) => msg !== userMessage)
      }
      if (
        streamingMessageIndex >= 0 &&
        streamingMessageIndex < messages.value.length
      ) {
        messages.value.splice(streamingMessageIndex, 1)
      }
    } finally {
      logger.debug('流式传输会话结束，重置状态')
      isChatLoading.value = false
      stream.setStreaming(false)
      stream.streamingContent.value = ''
    }
  }

  /**
   * 编辑消息
   *
   * @param messageId - 消息 ID
   * @param newContent - 新内容
   *
   * @description
   * 编辑用户消息的内容
   */
  const editMessage = (messageId: string, newContent: string) => {
    const messageIndex = messages.value.findIndex((msg) => msg.id === messageId)
    if (messageIndex === -1) {
      logger.error('未找到要编辑的消息', { messageId })
      return
    }

    const message = messages.value[messageIndex]
    if (message.role !== 'user') {
      logger.error('只能编辑用户消息', { messageId, role: message.role })
      return
    }

    messages.value[messageIndex].content = newContent

    // 更新聊天历史
    const chat = history.chatHistory.value.find(
      (c) => c.id === history.currentChatId.value
    )
    if (chat) {
      chat.messages = [...messages.value]
      chat.updatedAt = new Date()
      history.saveChatHistory()
    }

    logger.debug('消息已编辑', { messageId, newContent })
  }

  /**
   * 截断指定索引后的所有消息
   *
   * @param messageIndex - 消息索引
   */
  const truncateMessagesAfter = (messageIndex: number) => {
    if (messageIndex < 0 || messageIndex >= messages.value.length) {
      logger.error('无效的消息索引', {
        messageIndex,
        totalMessages: messages.value.length,
      })
      return
    }

    const systemMessages = messages.value.filter((msg) => msg.role === 'system')
    const nonSystemMessages = messages.value.filter((msg) => msg.role !== 'system')

    const targetMessage = messages.value[messageIndex]
    const targetIndexInNonSystem = nonSystemMessages.findIndex(
      (msg) => msg.id === targetMessage.id
    )

    if (targetIndexInNonSystem === -1) {
      logger.error('无法在非系统消息中找到目标消息', {
        messageIndex,
        targetMessage,
      })
      return
    }

    const truncatedNonSystemMessages = nonSystemMessages.slice(
      0,
      targetIndexInNonSystem + 1
    )

    messages.value = [...systemMessages, ...truncatedNonSystemMessages]

    // 更新聊天历史
    const chat = history.chatHistory.value.find(
      (c) => c.id === history.currentChatId.value
    )
    if (chat) {
      chat.messages = [...messages.value]
      chat.updatedAt = new Date()
      history.saveChatHistory()
    }

    logger.debug('消息历史已截断', {
      messageIndex,
      remainingMessages: messages.value.length,
    })
  }

  /**
   * 重新发送消息
   *
   * @param messageId - 消息 ID
   *
   * @description
   * 截断该消息后的所有消息，然后重新发送
   */
  const resendMessage = async (messageId: string) => {
    const messageIndex = messages.value.findIndex((msg) => msg.id === messageId)
    if (messageIndex === -1) {
      logger.error('未找到要重新发送的消息', { messageId })
      return
    }

    const message = messages.value[messageIndex]
    if (message.role !== 'user') {
      logger.error('只能重新发送用户消息', { messageId, role: message.role })
      return
    }

    truncateMessagesAfter(messageIndex)
    await sendMessage(message.content)
  }

  /**
   * 编辑并重新发送消息
   *
   * @param messageId - 消息 ID
   * @param newContent - 新内容
   *
   * @description
   * 编辑消息内容，截断后续消息，然后重新发送获取新回复
   */
  const editAndResendMessage = async (messageId: string, newContent: string) => {
    const messageIndex = messages.value.findIndex((msg) => msg.id === messageId)
    if (messageIndex === -1) {
      logger.error('未找到要编辑的消息', { messageId })
      return
    }

    const message = messages.value[messageIndex]
    if (message.role !== 'user') {
      logger.error('只能编辑用户消息', { messageId, role: message.role })
      return
    }

    // 更新消息内容
    messages.value[messageIndex].content = newContent

    // 截断后续消息并重新发送
    await processStreamResponse(message)
  }

  /**
   * 清空当前对话的所有非系统消息
   */
  const clearMessages = () => {
    messages.value = messages.value.filter((msg) => msg.role === 'system')
  }

  /**
   * 添加消息到列表
   *
   * @param message - 要添加的消息
   */
  const addMessage = (message: ChatMessage) => {
    messages.value.push(message)
  }

  /**
   * 中断当前请求
   */
  const abortCurrentRequest = () => {
    stream.abortCurrentRequest('chat')
    isChatLoading.value = false
    stream.setStreaming(false)
    stream.streamingContent.value = ''
  }

  // ========================================================================
  // 返回接口
  // ========================================================================

  return {
    // 状态
    messages,
    isChatLoading,
    systemMessage,

    // 计算属性
    filteredMessages,

    // 方法
    sendMessage,
    editMessage,
    resendMessage,
    editAndResendMessage,
    truncateMessagesAfter,
    clearMessages,
    addMessage,
    abortCurrentRequest,
    updateSystemMessage,
    prepareMessages,
  }
}
