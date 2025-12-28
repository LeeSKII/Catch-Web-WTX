/**
 * 流式传输模块
 *
 * @description
 * 处理 OpenAI API 调用和流式响应，
 * 支持请求中止和错误处理。
 *
 * @module composables/chat/useChatStream
 *
 * @example
 * ```ts
 * const { isStreaming, streamingContent, callOpenAI, abortRequest } = useChatStream()
 *
 * // 发起流式请求
 * await callOpenAI(apiKey, baseUrl, messages, (content) => {
 *   console.log('收到内容:', content)
 * })
 *
 * // 中止请求
 * abortRequest('chat')
 * ```
 */

import { ref, computed } from 'vue'
import OpenAI from 'openai'
import { createLogger } from '../../utils/logger'
import { API_CONFIG } from '../../constants'
import { useAbortController } from '../useAbortController'
import { useStores } from '../../stores'
import type { APICallResult, StreamState } from './types'

const logger = createLogger('ChatStream')

/**
 * Abort 控制器键名类型
 */
type AbortKeyType = 'dataExtraction' | 'bookmarkCheck' | 'aiSummary' | 'chat'

/**
 * 流式传输 Composable
 *
 * @description
 * 提供 OpenAI API 流式调用功能
 *
 * @returns 流式传输状态和方法
 */
export function useChatStream() {
  const { settingsStore } = useStores()
  const { createAbortController, cleanupAbortController, abortRequest } =
    useAbortController()

  // ========================================================================
  // 状态
  // ========================================================================

  /** 是否正在流式传输 */
  const isStreaming = ref(false)

  /** 当前流式传输累积的内容 */
  const streamingContent = ref('')

  /** 当前使用的 AI 模型（计算属性） */
  const currentModel = computed(
    () => settingsStore.state.settings.aiModel || API_CONFIG.DEFAULT_MODEL
  )

  /** 最大 token 数 */
  const maxTokens = computed(() => API_CONFIG.MAX_TOKENS)

  /** 温度参数 */
  const temperature = computed(() => API_CONFIG.TEMPERATURE)

  // ========================================================================
  // 方法
  // ========================================================================

  /**
   * 调用 OpenAI API 进行流式传输
   *
   * @param apiKey - OpenAI API 密钥
   * @param baseUrl - API 基础地址
   * @param messages - 消息历史
   * @param onStreamUpdate - 流式更新回调函数
   * @param abortKey - 中止控制器键名，默认为 'chat'
   * @returns API 调用结果
   */
  const callOpenAI = async (
    apiKey: string,
    baseUrl: string,
    messages: Array<{ role: string; content: string }>,
    onStreamUpdate?: (content: string) => void,
    abortKey: AbortKeyType = 'chat'
  ): Promise<APICallResult> => {
    // 每次调用时都从最新的设置中获取配置，确保使用最新的配置
    const model = settingsStore.state.settings.aiModel || API_CONFIG.DEFAULT_MODEL
    const actualBaseUrl =
      settingsStore.state.settings.openaiBaseUrl ||
      baseUrl ||
      API_CONFIG.DEFAULT_BASE_URL

    logger.debug('使用最新的 AI 配置', {
      model: model,
      baseUrl: actualBaseUrl,
      apiKey: apiKey ? '***' : '未设置',
    })

    // 创建 AbortController 用于聊天请求
    const abortController = createAbortController(abortKey)

    try {
      // 初始化 OpenAI 客户端
      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: actualBaseUrl,
        dangerouslyAllowBrowser: true, // 允许在浏览器中使用
      })

      // 检查请求是否被中止
      if (abortController.signal.aborted) {
        logger.debug('聊天请求被中止')
        return { success: false, message: '请求被中止' }
      }

      // 创建流式请求，传递 abort signal
      const stream = await openai.chat.completions.create({
        model: model,
        messages: messages as any,
        stream: true,
        max_tokens: maxTokens.value,
        temperature: temperature.value,
      }, { signal: abortController.signal })

      let accumulatedContent = ''

      // 处理流式响应
      for await (const chunk of stream) {
        // 在每次处理前检查是否被中止
        if (abortController.signal.aborted) {
          logger.debug('聊天流读取被中止')
          return { success: false, message: '请求被中止' }
        }

        const content = chunk.choices[0]?.delta?.content || ''
        if (content) {
          accumulatedContent += content
          streamingContent.value = accumulatedContent
          // 调用回调函数，实时更新流式内容
          onStreamUpdate?.(accumulatedContent)
        }
      }

      return { success: true, content: accumulatedContent }
    } catch (error) {
      // 检查是否是中止错误
      if (
        abortController.signal.aborted ||
        (error instanceof Error && error.name === 'AbortError')
      ) {
        logger.debug('聊天请求被中止')
        return { success: false, message: '请求被中止' }
      }
      logger.error('OpenAI API 调用失败', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'API 调用失败',
      }
    } finally {
      cleanupAbortController(abortKey)
    }
  }

  /**
   * 中止当前请求
   *
   * @param abortKey - 中止控制器键名，默认为 'chat'
   *
   * @example
   * ```ts
   * abortRequest('chat')
   * ```
   */
  const abortCurrentRequest = (abortKey: AbortKeyType = 'chat') => {
    abortRequest(abortKey)
    isStreaming.value = false
    streamingContent.value = ''
  }

  /**
   * 重置流式传输状态
   *
   * @description
   * 重置流式传输相关的所有状态
   */
  const resetStreamState = () => {
    isStreaming.value = false
    streamingContent.value = ''
  }

  /**
   * 设置流式传输状态
   *
   * @param streaming - 是否正在流式传输
   */
  const setStreaming = (streaming: boolean) => {
    isStreaming.value = streaming
  }

  // ========================================================================
  // 返回接口
  // ========================================================================

  return {
    // 状态
    isStreaming,
    streamingContent,
    currentModel,
    maxTokens,
    temperature,

    // 方法
    callOpenAI,
    abortCurrentRequest,
    resetStreamState,
    setStreaming,
  }
}
