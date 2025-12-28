/**
 * 聊天功能组合模块
 *
 * @description
 * 组合所有聊天相关的子模块，提供统一的访问接口。
 * 这是对外的主要导出点，保持与原 useChat.ts 的接口兼容性。
 *
 * @module composables/chat
 *
 * @example
 * ```ts
 * import { useChat } from '@/composables/chat'
 *
 * const {
 *   messages,
 *   chatHistory,
 *   referenceList,
 *   sendMessage,
 *   createNewChat,
 *   addReference
 * } = useChat()
 *
 * // 发送消息
 * await sendMessage('你好')
 *
 * // 创建新聊天
 * createNewChat()
 *
 * // 添加引用
 * await addReference(extractedData)
 * ```
 */

import { useChatMessages } from './useChatMessages'
import { useChatHistory } from './useChatHistory'
import { useChatReference } from './useChatReference'
import { useChatStream } from './useChatStream'

// 类型导出
export type {
  ChatMessage,
  ChatMessageRole,
  ChatHistory,
  ReferenceItemPreview,
  ReferenceModalState,
  StreamState,
  OpenAIResponse,
  APICallResult,
} from './types'

/**
 * 聊天功能组合函数
 *
 * @description
 * 组合所有聊天相关的子模块，提供统一的访问接口。
 * 此函数保持与原 useChat.ts 的完全兼容性。
 *
 * @returns 聊天功能状态和方法的完整集合
 *
 * @example
 * ```ts
 * // 基本使用
 * const {
 *   // 消息相关
 *   messages,
 *   isChatLoading,
 *   sendMessage,
 *   editMessage,
 *   resendMessage,
 *
 *   // 历史相关
 *   chatHistory,
 *   currentChatId,
 *   createNewChat,
 *   loadChat,
 *   deleteChat,
 *
 *   // 引用相关
 *   referenceList,
 *   referenceInfo,
 *   systemPrompt,
 *   addReference,
 *   removeReference,
 *
 *   // 流式传输相关
 *   isStreaming,
 *   streamingContent,
 *   abortCurrentRequest,
 * } = useChat()
 * ```
 */
export function useChat() {
  const messages = useChatMessages()
  const history = useChatHistory()
  const reference = useChatReference()
  const stream = useChatStream()

  // ========================================================================
  // 返回完整接口（保持与原 useChat.ts 的兼容性）
  // ========================================================================

  return {
    // ========== 消息相关 ==========
    /** 当前消息列表 */
    messages: messages.messages,
    /** 是否正在加载/发送 */
    isChatLoading: messages.isChatLoading,
    /** 系统消息 */
    systemMessage: messages.systemMessage,
    /** 过滤后的消息列表 */
    filteredMessages: messages.filteredMessages,

    /** 发送消息 */
    sendMessage: messages.sendMessage,
    /** 编辑消息 */
    editMessage: messages.editMessage,
    /** 重新发送消息 */
    resendMessage: messages.resendMessage,
    /** 编辑并重新发送消息 */
    editAndResendMessage: messages.editAndResendMessage,
    /** 截断指定索引后的消息 */
    truncateMessagesAfter: messages.truncateMessagesAfter,
    /** 清空消息 */
    clearMessages: messages.clearMessages,
    /** 添加消息 */
    addMessage: messages.addMessage,
    /** 中断当前请求 */
    abortCurrentRequest: messages.abortCurrentRequest,
    /** 更新系统消息 */
    updateSystemMessage: messages.updateSystemMessage,

    // ========== 历史相关 ==========
    /** 聊天历史列表 */
    chatHistory: history.chatHistory,
    /** 当前聊天 ID */
    currentChatId: history.currentChatId,

    /** 加载聊天历史 */
    loadChatHistory: history.loadChatHistory,
    /** 保存聊天历史 */
    saveChatHistory: history.saveChatHistory,
    /** 创建新聊天 */
    createNewChat: history.createNewChat,
    /** 加载指定聊天 */
    loadChat: history.loadChat,
    /** 删除聊天 */
    deleteChat: history.deleteChat,
    /** 更新聊天标题 */
    updateChatTitle: history.updateChatTitle,
    /** 更新当前聊天消息 */
    updateCurrentChatMessages: history.updateCurrentChatMessages,
    /** 清空当前对话 */
    clearChat: history.clearChat,
    /** 保存当前对话 */
    saveChat: history.saveChat,
    /** 导出对话 */
    exportChat: history.exportChat,
    /** 生成聊天标题 */
    generateChatTitle: history.generateChatTitle,

    // ========== 引用相关 ==========
    /** 引用列表 */
    referenceList: reference.referenceList,
    /** 当前选中引用信息 */
    referenceInfo: reference.referenceInfo,
    /** 引用模态框状态 */
    modalState: reference.modalState,
    /** 引用文本 */
    referenceText: reference.referenceText,
    /** 系统提示词 */
    systemPrompt: reference.systemPrompt,
    /** 引用预览 */
    referencePreview: reference.referencePreview,

    /** 加载引用列表 */
    loadReferenceList: reference.loadReferenceList,
    /** 保存引用列表 */
    saveReferenceList: reference.saveReferenceList,
    /** 添加引用 */
    addReference: reference.addReference,
    /** 删除引用 */
    removeReference: reference.removeReference,
    /** 清空引用 */
    clearReferences: reference.clearReferences,
    /** 显示引用列表 */
    showReferenceList: reference.showReferenceList,
    /** 隐藏引用列表 */
    hideReferenceList: reference.hideReferenceList,
    /** 显示引用详情 */
    showReferenceDetail: reference.showReferenceDetail,
    /** 隐藏引用详情 */
    hideReferenceDetail: reference.hideReferenceDetail,
    /** 获取引用项预览 */
    getReferenceItemPreview: reference.getReferenceItemPreview,
    /** 获取引用列表预览 */
    getReferenceListPreviews: reference.getReferenceListPreviews,

    // ========== 流式传输相关 ==========
    /** 是否正在流式传输 */
    isStreaming: stream.isStreaming,
    /** 当前流式传输内容 */
    streamingContent: stream.streamingContent,
    /** 当前使用的 AI 模型 */
    currentModel: stream.currentModel,
    /** 最大 token 数 */
    maxTokens: stream.maxTokens,
    /** 温度参数 */
    temperature: stream.temperature,
  }
}

// 导出所有子模块（供高级用法）
export { useChatMessages } from './useChatMessages'
export { useChatHistory } from './useChatHistory'
export { useChatReference } from './useChatReference'
export { useChatStream } from './useChatStream'
