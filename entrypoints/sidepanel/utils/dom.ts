/**
 * DOM操作工具函数
 */

/**
 * 批量查询DOM元素，减少重复查询
 * @param selectors 选择器数组
 * @returns 查询结果数组
 */
export function batchQueryElements(selectors: string[]): Element[] {
  const results: Element[] = [];
  const fragment = document.createDocumentFragment();
  
  // 使用DocumentFragment减少重绘和回流
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      results.push(element);
      fragment.appendChild(element.cloneNode(true));
    });
  });
  
  return results;
}

/**
 * 优化的元素创建函数
 * @param tagName 标签名
 * @param attributes 属性对象
 * @param innerText 内部文本
 * @returns 创建的元素
 */
export function createElementOptimized(
  tagName: string,
  attributes: Record<string, string> = {},
  innerText: string = ''
): HTMLElement {
  const element = document.createElement(tagName);
  
  // 批量设置属性
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  
  if (innerText) {
    element.innerText = innerText;
  }
  
  return element;
}

/**
 * 检查元素是否在视口中
 * @param element 要检查的元素
 * @returns 是否在视口中
 */
export function isElementInViewport(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * 优化的滚动事件处理
 * @param callback 回调函数
 * @param options 选项
 * @returns 清理函数
 */
export function setupOptimizedScroll(
  callback: () => void,
  options: {
    throttleMs?: number;
    leading?: boolean;
  } = {}
): () => void {
  const { throttleMs = 100, leading = true } = options;
  
  let lastCall = 0;
  let ticking = false;
  
  const handleScroll = () => {
    const now = Date.now();
    
    if (leading && now - lastCall >= throttleMs) {
      callback();
      lastCall = now;
      return;
    }
    
    if (!ticking) {
      requestAnimationFrame(() => {
        if (now - lastCall >= throttleMs) {
          callback();
          lastCall = now;
        }
        ticking = false;
      });
      ticking = true;
    }
  };
  
  window.addEventListener('scroll', handleScroll, { passive: true });
  
  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
}