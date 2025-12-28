// 类型定义文件

export interface ExtractedData {
  html?: string;
  text?: string;
  wordCount?: number;
  images?: ImageData[];
  links?: LinkData[];
  meta?: Record<string, string>;
  title?: string;
  url?: string;
  host?: string;
  styles?: StylesData;
  scripts?: ScriptData[];
  article?: string | null;
  extractedAt?: string;
}

export interface ImageData {
  src: string;
  alt: string;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
}

export interface LinkData {
  href: string;
  text: string;
  title: string;
  rel: string;
}

export interface StylesData {
  styleSheets: string[];
  styles: string[];
}

export interface ScriptData {
  src: string;
  type: string;
  async: boolean;
  defer: boolean;
}

export interface ToastOptions {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

export interface ThemeConfig {
  light: Record<string, string>;
  dark: Record<string, string>;
}

export interface Settings {
  showPreviews: boolean;
  darkMode: boolean;
  dataRetention: string;
  extractHtml: boolean;
  extractText: boolean;
  extractImages: boolean;
  extractLinks: boolean;
  extractMeta: boolean;
  extractStyles: boolean;
  extractScripts: boolean;
  extractArticle: boolean;
  openaiApiKey: string;
  openaiBaseUrl: string;
  aiModel: string;
}

export interface AISummaryData {
  content: string;
  summaryType: string;
  createdAt: string;
  url: string;
}

/**
 * Script 注入返回结果类型
 *
 * @description
 * browser.scripting.executeScript 的返回值类型
 */
export interface ScriptInjectionResult {
  result: ExtractedData;
}

/**
 * 聊天历史记录类型
 *
 * @description
 * 从 storage 加载的聊天会话记录
 */
export interface ChatHistoryRecord {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

