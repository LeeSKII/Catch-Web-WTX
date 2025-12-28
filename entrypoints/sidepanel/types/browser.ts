/**
 * 浏览器 API 类型扩展
 *
 * @description
 * 为浏览器扩展 API 提供额外的类型定义
 *
 * @module types/browser
 */

/**
 * WebNavigation 事件详情类型
 *
 * @description
 * browser.webNavigation API 事件的通用详情类型
 * 注意：不同事件的属性有所不同，这里定义为全可选以兼容所有事件
 */
export interface WebNavigationDetails {
  /** 发生导航的标签页 ID */
  tabId?: number;
  /** 导航的 URL */
  url?: string;
  /** 框架 ID，0 表示主框架 */
  frameId?: number;
  /** 父框架 ID */
  parentFrameId?: number;
  /** 导航转换类型（如 'link', 'typed', 'form_submit' 等） */
  transitionType?: string;
  /** 导航转换限定符（如 'client_redirect', 'server_redirect' 等） */
  transitionQualifiers?: string[];
  /** 服务器重定向信息 */
  serverRedirect?: WebNavigationParentedDetails[];
  /** 错误信息（仅 onErrorOccurred 事件） */
  error?: string;
}

/**
 * WebNavigation 父级详情类型
 */
export interface WebNavigationParentedDetails {
  tabId: number;
  url: string;
}

/**
 * WebNavigation 已完成事件详情
 *
 * @description
 * onCompleted 事件的额外属性
 */
export interface WebNavigationCompletedDetails extends WebNavigationDetails {
  /** 加载耗时（毫秒） */
  duration: number;
  /** 导航是否成功 */
  status: number;
}
