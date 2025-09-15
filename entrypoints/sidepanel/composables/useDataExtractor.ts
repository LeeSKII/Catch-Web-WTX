import { ref, Ref } from 'vue';
import { ExtractedData } from '../types';
import { browser } from 'wxt/browser';
import { createLogger } from '../utils/logger';
import { createClient } from '@supabase/supabase-js';

// 创建日志器
const logger = createLogger('DataExtractor');

// Supabase初始化
const client = createClient(
  "https://jnzoquhmgpjbqcabgxrd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impuem9xdWhtZ3BqYnFjYWJneHJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MDc4OTgsImV4cCI6MjA3MjA4Mzg5OH0.BKMFZNbTgGf5yxfAQuFbA912fISlbbL3GE6YDn-OkaA"
);

export function useDataExtractor() {
  const extractedData: Ref<ExtractedData> = ref({});
  const isLoading: Ref<boolean> = ref(false);

  const extractData = async (options: {
    html: boolean;
    text: boolean;
    images: boolean;
    links: boolean;
    meta: boolean;
    styles: boolean;
    scripts: boolean;
    article: boolean;
  }) => {
    // 如果没有选中任何选项，提示用户
    if (!Object.values(options).some(opt => opt)) {
      return { success: false, message: '请至少选择一个提取选项！' };
    }

    isLoading.value = true;

    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      
      // 检查tab是否存在且URL是否有效
      if (!tabs[0] || !tabs[0].url) {
        isLoading.value = false;
        return { success: false, message: '无法获取当前页面URL' };
      }

      const currentUrl = tabs[0].url;

      // 检查URL是否为http或https协议
      const urlProtocol = currentUrl.split(':')[0].toLowerCase();
      if (urlProtocol !== 'http' && urlProtocol !== 'https') {
        isLoading.value = false;
        return { success: false, message: '非http/https页面，无法提取数据' };
      }

      // 如果通过了所有检查，则执行提取
      // 先注入一个函数来确保DOM完全加载
      if (tabs[0].id) {
        await browser.scripting.executeScript(
          {
            target: { tabId: tabs[0].id },
            func: waitForDOMReady,
          }
        );

        // DOM准备就绪后，执行数据提取
        const results = await browser.scripting.executeScript(
          {
            target: { tabId: tabs[0].id },
            func: getPageData,
            args: [options],
          }
        );

        if (results && results[0] && results[0].result) {
          extractedData.value = results[0].result as ExtractedData;
          
          // 查询收藏状态
          if (extractedData.value.url) {
            const isBookmarked = await checkBookmarkStatus(extractedData.value.url);
            extractedData.value.isBookmarked = isBookmarked;
          }
          
          isLoading.value = false;
          return { success: true, data: extractedData.value };
        } else {
          isLoading.value = false;
          return { success: false, message: '提取数据失败' };
        }
      } else {
        isLoading.value = false;
        return { success: false, message: '无法获取标签页ID' };
      }
    } catch (error) {
      logger.error('提取错误', error);
      isLoading.value = false;
      return { success: false, message: '提取数据时发生错误' };
    }
  };

  // 查询URL是否在News表中
  const checkBookmarkStatus = async (url: string): Promise<boolean> => {
    try {
      const { data, error } = await client
        .from("News")
        .select("url")
        .eq("url", url);

      if (error) {
        logger.error("数据库查询错误", error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      logger.error("checkBookmarkStatus() 异常", error);
      return false;
    }
  };

  // 等待DOM完全加载的函数
  const waitForDOMReady = () => {
    return new Promise<void>((resolve) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
      } else {
        // 如果已经加载完成，直接resolve
        resolve();
      }
    });
  };

  // 在页面上执行的数据提取函数
  const getPageData = (options: {
    html: boolean;
    text: boolean;
    images: boolean;
    links: boolean;
    meta: boolean;
    styles: boolean;
    scripts: boolean;
    article: boolean;
  }): ExtractedData => {
    const data: ExtractedData = {};

    // 缓存常用DOM查询结果
    const documentElement = document.documentElement;
    const documentBody = document.body;
    const documentTitle = document.title;

    if (options.html) {
      data.html = documentElement.outerHTML;
    }

    if (options.text) {
      data.text = documentBody.innerText;
      data.wordCount = data.text.length;
    }

    if (options.images) {
      // 使用Array.from一次性转换HTMLCollection，减少多次访问
      const images = Array.from(document.images);
      data.images = images.map(img => ({
        src: img.src,
        alt: img.alt,
        width: img.width,
        height: img.height,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      }));
    }

    if (options.links) {
      // 使用Array.from一次性转换HTMLCollection，减少多次访问
      const links = Array.from(document.links);
      data.links = links
        .map(link => ({
          href: link.href,
          text: link.textContent.trim(),
          title: link.title,
          rel: link.rel,
        }))
        .filter(link => link.href && !link.href.startsWith('javascript:'));
    }

    if (options.meta) {
      data.meta = {};
      // 缓存meta标签查询结果
      const metaTags = document.querySelectorAll('meta');
      metaTags.forEach(tag => {
        const name =
          tag.getAttribute('name') || tag.getAttribute('property') || 'unknown';
        const content = tag.getAttribute('content');
        if (content) {
          data.meta![name] = content;
        }
      });
      data.title = documentTitle;
      data.url = window.location.href;

      // 提取主域名
      try {
        const urlObj = new URL(window.location.href);
        data.host = urlObj.hostname.replace(/^www\./, '');
      } catch (e) {
        data.host = 'invalid-host';
      }
    }

    if (options.styles) {
      // 缓存样式表查询结果
      const styleSheets = Array.from(document.styleSheets);
      const styleElements = Array.from(document.querySelectorAll('style'));
      
      data.styles = {
        styleSheets: styleSheets.map(sheet => sheet.href || 'inline'),
        styles: styleElements.map(style => style.innerHTML),
      };
    }

    if (options.scripts) {
      // 缓存脚本查询结果
      const scripts = Array.from(document.scripts);
      data.scripts = scripts.map(script => ({
        src: script.src,
        type: script.type,
        async: script.async,
        defer: script.defer,
      }));
    }

    if (options.article) {
      // 查找article标签并提取内容
      const articleElements = document.querySelectorAll('article');
      if (articleElements.length > 0) {
        // 如果找到article标签，提取第一个article标签的innerText
        data.article = articleElements[0].innerText;
      } else {
        // 如果没有找到article标签，设置为null
        data.article = null;
      }
    }

    data.extractedAt = new Date().toISOString();

    return data;
  };

  const saveExtractedData = (data: ExtractedData) => {
    // 只保存必要的数据，避免存储过大
    const dataToSave = {
      meta: data.meta,
      title: data.title,
      url: data.url,
      wordCount: data.wordCount,
      imagesCount: data.images ? data.images.length : 0,
      linksCount: data.links ? data.links.length : 0,
      article: data.article,
      extractedAt: data.extractedAt,
    };

    localStorage.setItem('extractedData', JSON.stringify(dataToSave));
  };

  const clearExtractedData = () => {
    extractedData.value = {};
  };

  return {
    extractedData,
    isLoading,
    extractData,
    saveExtractedData,
    clearExtractedData
  };
}