/**
 * 数据处理工具模块
 *
 * @description
 * 提供数据处理相关的工具函数
 *
 * @module utils/dataUtils
 */

import type { ExtractedData } from '../types'

/**
 * 合并主文档和所有 iframe 的文本内容
 *
 * @param extractedData - 提取的数据
 * @returns 合并后的文本内容
 *
 * @description
 * 将主文档的 text 与所有 frame 的 text 合并，
 * 返回完整的网页文本内容。
 *
 * @example
 * ```ts
 * const fullText = mergeExtractedText(extractedData)
 * ```
 */
export function mergeExtractedText(extractedData: ExtractedData): string {
  const texts: string[] = []

  // 添加主文档文本
  if (extractedData.text) {
    texts.push(extractedData.text)
  }

  // 添加所有 iframe 的文本
  if (extractedData.frames && extractedData.frames.length > 0) {
    extractedData.frames.forEach((frame, index) => {
      if (frame.data.text) {
        texts.push(`\n\n--- [iframe ${index + 1}${frame.url ? `: ${frame.url}` : ''}] ---\n${frame.data.text}`)
      }
    })
  }

  return texts.join('\n')
}

/**
 * 获取提取数据的完整文本（包含 frame）
 *
 * @param extractedData - 提取的数据
 * @returns 完整的文本内容，如果没有文本则返回空字符串
 *
 * @description
 * 这是 mergeExtractedText 的别名，提供更语义化的命名
 */
export function getExtractedTextWithFrames(extractedData: ExtractedData): string {
  return mergeExtractedText(extractedData)
}
