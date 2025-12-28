/**
 * AI Prompt 模板配置
 *
 * @description
 * 统一管理所有 AI 相关的 Prompt 模板
 *
 * @module constants/prompts
 */

/**
 * 默认 AI 总结 Prompt 模板
 */
export const DEFAULT_PROMPTS = {
  /**
   * 全文总结 Prompt
   */
  FULL_SUMMARY:
    "对用户提供的内容进行总结，要求简洁明了，突出重点，禁止遗漏任何关键和重要信息，回复语言：简体中文。",

  /**
   * 关键信息提取 Prompt
   */
  KEY_INFO:
    "对用户提供的内容提取关键信息，包括：主要主题、重要数据、关键人物、时间地点等核心信息，回复语言：简体中文。",
} as const

/**
 * 获取指定类型的默认 Prompt
 *
 * @param type - Prompt 类型 ('full' | 'keyinfo')
 * @returns 对应的 Prompt 模板
 */
export function getDefaultPrompt(type: 'full' | 'keyinfo'): string {
  return type === 'full' ? DEFAULT_PROMPTS.FULL_SUMMARY : DEFAULT_PROMPTS.KEY_INFO
}
