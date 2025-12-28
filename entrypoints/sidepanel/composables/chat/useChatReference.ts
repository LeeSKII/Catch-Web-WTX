/**
 * 引用管理模块
 *
 * @description
 * 处理网页内容的引用管理，包括添加、删除引用和生成系统提示词。
 *
 * @module composables/chat/useChatReference
 *
 * @example
 * ```ts
 * const {
 *   referenceList,
 *   referenceInfo,
 *   systemPrompt,
 *   addReference,
 *   removeReference,
 *   showReferenceDetail,
 *   hideReferenceDetail
 * } = useChatReference()
 *
 * // 添加引用
 * await addReference(extractedData)
 *
 * // 删除引用
 * await removeReference(0)
 * ```
 */

import { ref, computed, onMounted } from 'vue'
import { browser } from 'wxt/browser'
import { createLogger } from '../../utils/logger'
import { useToast } from '../useToast'
import type { ExtractedData } from '../../types'
import type { ReferenceItemPreview, ReferenceModalState } from './types'

const logger = createLogger('ChatReference')
const { success, warning } = useToast()

/**
 * 引用管理 Composable
 *
 * @description
 * 提供网页内容的引用管理功能
 *
 * @returns 引用管理状态和方法
 */
export function useChatReference() {
  // ========================================================================
  // 状态
  // ========================================================================

  /** 引用列表 */
  const referenceList = ref<ExtractedData[]>([])

  /** 当前选中的引用信息 */
  const referenceInfo = ref<ExtractedData | null>(null)

  /** 引用模态框状态 */
  const modalState = ref<ReferenceModalState>({
    showReferenceModal: false,
    showReferenceListModal: false,
    selectedReferenceIndex: -1,
  })

  // ========================================================================
  // 生命周期钩子
  // ========================================================================

  /**
   * 组件挂载时加载引用列表
   */
  onMounted(async () => {
    await loadReferenceList()
  })

  // ========================================================================
  // 计算属性
  // ========================================================================

  /**
   * 引用文本
   *
   * @description
   * 根据引用列表生成完整的引用文本
   */
  const referenceText = computed(() => {
    if (referenceList.value.length === 0) return ''

    let text = '请基于以下网页内容回答我的问题：\n\n'

    referenceList.value.forEach((item, index) => {
      if (item.text) {
        text += `网页 ${index + 1}：\n${item.text}\n\n`
      }
    })

    return text
  })

  /**
   * 系统提示词
   *
   * @description
   * 根据引用列表生成 AI 系统提示词
   */
  const systemPrompt = computed(() => {
    if (referenceList.value.length === 0) return ''

    let prompt = '请基于以下网页内容回答我的问题：\n\n'

    referenceList.value.forEach((item, index) => {
      if (item.text) {
        prompt += `网页 ${index + 1}：\n${item.text}\n\n`
      }
    })

    return prompt
  })

  /**
   * 引用预览
   *
   * @description
   * 当前选中引用的前200个字符
   */
  const referencePreview = computed(() => {
    if (!referenceInfo.value || !referenceInfo.value.text) return ''
    return (
      referenceInfo.value.text.substring(0, 200) +
      (referenceInfo.value.text.length > 200 ? '...' : '')
    )
  })

  // ========================================================================
  // 方法
  // ========================================================================

  /**
   * 加载引用列表
   *
   * @description
   * 从 browser.storage.local 加载保存的引用列表
   */
  const loadReferenceList = async () => {
    try {
      logger.debug('开始加载引用列表')
      const result = await browser.storage.local.get('referenceList')
      const referenceListData = result.referenceList
      logger.debug('从 storage 获取的引用列表数据:', referenceListData)

      if (referenceListData) {
        logger.debug(
          '找到引用列表数据，数量:',
          Array.isArray(referenceListData) ? referenceListData.length : '不是数组'
        )
        referenceList.value = Array.isArray(referenceListData)
          ? referenceListData
          : []
        logger.debug(
          '引用列表已加载到响应式变量，当前数量:',
          referenceList.value.length
        )
      } else {
        logger.debug('storage 中没有找到引用列表数据')
        referenceList.value = []
      }
    } catch (err) {
      logger.error('加载引用列表失败', err)
    }
  }

  /**
   * 保存引用列表
   *
   * @description
   * 将引用列表保存到 browser.storage.local
   */
  const saveReferenceList = async () => {
    try {
      logger.debug('开始保存引用列表，当前数量:', referenceList.value.length)
      logger.debug('引用列表内容:', JSON.stringify(referenceList.value))
      await browser.storage.local.set({
        referenceList: referenceList.value,
      })
      logger.debug('引用列表已保存到 storage')

      // 验证保存是否成功
      const result = await browser.storage.local.get('referenceList')
      logger.debug('验证保存结果:', result.referenceList)
    } catch (err) {
      logger.error('保存引用列表失败', err)
    }
  }

  /**
   * 添加引用到聊天上下文
   *
   * @param extractedData - 要添加的引用数据
   * @returns 是否成功添加
   *
   * @description
   * 添加网页内容作为引用，自动生成系统提示词
   */
  const addReference = async (extractedData: ExtractedData): Promise<boolean> => {
    console.log('addReference 被调用，参数:', { extractedData })

    if (!extractedData.url) {
      console.log('引用数据没有 URL，返回 false')
      return false
    }

    // 检查是否已经存在相同 URL 的引用
    const isDuplicate = referenceList.value.some(
      (item) => item.url === extractedData.url
    )
    if (isDuplicate) {
      console.log('检测到重复引用，URL:', extractedData.url)
      warning('该网页引用已经存在，请勿重复添加')
      return false
    }

    console.log(
      '将引用添加到列表，当前列表数量:',
      referenceList.value.length
    )
    referenceList.value.push(extractedData)
    referenceInfo.value = extractedData
    console.log('引用已添加到列表，新数量:', referenceList.value.length)

    // 保存引用列表到 storage
    console.log('准备保存引用列表到 storage')
    await saveReferenceList()
    console.log('引用列表已保存到 storage，函数即将返回 true')

    success('引用已添加')

    return true
  }

  /**
   * 删除引用
   *
   * @param index - 要删除的引用索引
   *
   * @description
   * 从引用列表中删除指定索引的引用，并更新系统提示词
   */
  const removeReference = async (index: number) => {
    // 从引用列表中删除
    referenceList.value.splice(index, 1)

    // 如果删除的是当前选中的引用，重置选中状态
    if (modalState.value.selectedReferenceIndex === index) {
      modalState.value.selectedReferenceIndex = -1
      referenceInfo.value = null
    } else if (
      modalState.value.selectedReferenceIndex > index
    ) {
      // 如果删除的引用在选中引用之前，需要调整选中索引
      modalState.value.selectedReferenceIndex--
    }

    // 保存引用列表到 storage
    await saveReferenceList()

    success('引用已删除')
  }

  /**
   * 清空所有引用
   *
   * @description
   * 清空引用列表
   */
  const clearReferences = async () => {
    referenceList.value = []
    referenceInfo.value = null
    modalState.value.selectedReferenceIndex = -1
    await saveReferenceList()
  }

  // ========================================================================
  // 模态框控制方法
  // ========================================================================

  /**
   * 显示引用列表模态框
   */
  const showReferenceList = () => {
    modalState.value.showReferenceListModal = true
  }

  /**
   * 隐藏引用列表模态框
   */
  const hideReferenceList = () => {
    modalState.value.showReferenceListModal = false
  }

  /**
   * 显示引用详情模态框
   *
   * @param index - 引用索引
   */
  const showReferenceDetail = (index: number) => {
    modalState.value.selectedReferenceIndex = index
    referenceInfo.value = referenceList.value[index]
    modalState.value.showReferenceModal = true
  }

  /**
   * 隐藏引用详情模态框
   */
  const hideReferenceDetail = () => {
    modalState.value.showReferenceModal = false
    modalState.value.selectedReferenceIndex = -1
  }

  /**
   * 获取引用列表项的预览文本
   *
   * @param item - 引用数据
   * @returns 预览文本（前100字符）
   */
  const getReferenceItemPreview = (item: ExtractedData): string => {
    if (!item.text) return ''
    return item.text.substring(0, 100) + (item.text.length > 100 ? '...' : '')
  }

  /**
   * 获取引用列表预览信息
   *
   * @returns 引用列表的预览信息数组
   */
  const getReferenceListPreviews = (): ReferenceItemPreview[] => {
    return referenceList.value.map((item) => ({
      url: item.url,
      title: item.title,
      host: item.host,
      preview: getReferenceItemPreview(item),
    }))
  }

  // ========================================================================
  // 返回接口
  // ========================================================================

  return {
    // 状态
    referenceList,
    referenceInfo,
    modalState,

    // 计算属性
    referenceText,
    systemPrompt,
    referencePreview,

    // 方法
    loadReferenceList,
    saveReferenceList,
    addReference,
    removeReference,
    clearReferences,
    showReferenceList,
    hideReferenceList,
    showReferenceDetail,
    hideReferenceDetail,
    getReferenceItemPreview,
    getReferenceListPreviews,
  }
}
