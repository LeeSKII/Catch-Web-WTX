/**
 * 常量配置文件
 */

// API相关配置
export const API_CONFIG = {
  DEFAULT_BASE_URL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  DEFAULT_MODEL: "qwen-turbo",
  REQUEST_TIMEOUT: 30000,
  MAX_TOKENS: 8000,
  TEMPERATURE: 0.7,
} as const;

// UI相关配置
export const UI_CONFIG = {
  DEFAULT_IMAGE_DISPLAY_COUNT: 12,
  DEFAULT_LINK_DISPLAY_COUNT: 10,
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 100,
  TOAST_DURATION: 3000,
  MAX_TITLE_LENGTH: 50,
  MAX_TEXT_PREVIEW_LENGTH: 100,
  MAX_LINK_TEXT_LENGTH: 30,
  MAX_LINK_URL_LENGTH: 50,
} as const;

// 数据存储配置
export const STORAGE_CONFIG = {
  EXTRACTED_DATA_KEY: "extractedData",
  SETTINGS_PREFIX: "setting_",
  AI_SUMMARY_PREFIX: "aiSummary_",
  DEFAULT_DATA_RETENTION_DAYS: 7,
} as const;

// 调试配置
export const DEBUG_CONFIG = {
  ENABLED: process.env.NODE_ENV === "development",
  LOG_LEVEL: process.env.NODE_ENV === "development" ? "debug" : "error",
} as const;

// 性能配置
export const PERFORMANCE_CONFIG = {
  TAB_PROCESSING_DELAY: 500,
  DOM_READY_CHECK_INTERVAL: 100,
  MAX_CONCURRENT_REQUESTS: 3,
} as const;
