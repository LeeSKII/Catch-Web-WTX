/**
 * 聊天模块类型定义
 *
 * @description
 * 定义聊天功能相关的所有类型，包括消息、历史会话、引用等。
 *
 * @module composables/chat/types
 */

import type { ExtractedData } from '../../types'

// ============================================================================
// 聊天消息类型
// ============================================================================

/**
 * 聊天消息角色
 */
export type ChatMessageRole = 'user' | 'assistant' | 'system'

/**
 * 聊天消息
 *
 * @description
 * 表示单条聊天消息的数据结构
 */
export interface ChatMessage {
  /** 消息角色 */
  role: ChatMessageRole
  /** 消息内容 */
  content: string
  /** 消息时间戳 */
  timestamp: Date
  /** 是否正在流式传输 */
  isStreaming?: boolean
  /** 消息唯一标识 */
  id?: string
}

// ============================================================================
// 聊天历史类型
// ============================================================================

/**
 * 聊天会话历史
 *
 * @description
 * 表示一个完整的聊天会话
 */
export interface ChatHistory {
  /** 会话唯一标识 */
  id: string
  /** 会话标题 */
  title: string
  /** 消息列表 */
  messages: ChatMessage[]
  /** 创建时间 */
  createdAt: Date
  /** 更新时间 */
  updatedAt: Date
}

// ============================================================================
// 引用相关类型
// ============================================================================

/**
 * 引用项预览信息
 *
 * @description
 * 用于显示引用列表的简要信息
 */
export interface ReferenceItemPreview {
  /** 引用的 URL */
  url?: string
  /** 引用的标题 */
  title?: string
  /** 引用的主机名 */
  host?: string
  /** 预览文本（前100字符） */
  preview?: string
}

// ============================================================================
// 流式传输相关类型
// ============================================================================

/**
 * 流式传输状态
 */
export interface StreamState {
  /** 是否正在流式传输 */
  isStreaming: boolean
  /** 当前累积的内容 */
  streamingContent: string
}

// ============================================================================
// 模态框状态类型
// ============================================================================

/**
 * 引用模态框状态
 */
export interface ReferenceModalState {
  /** 是否显示引用详情模态框 */
  showReferenceModal: boolean
  /** 是否显示引用列表模态框 */
  showReferenceListModal: boolean
  /** 选中的引用索引 */
  selectedReferenceIndex: number
}

// ============================================================================
// OpenAI API 相关类型
// ============================================================================

/**
 * OpenAI API 响应
 *
 * @description
 * OpenAI chat.completions.create 的响应类型
 */
export interface OpenAIResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * API 调用结果
 *
 * @description
 * API 调用的统一返回类型
 */
export interface APICallResult {
  /** 是否成功 */
  success: boolean
  /** 返回内容 */
  content?: string
  /** 错误信息 */
  message?: string
}
