import { ref, Ref } from 'vue';
import { ExtractedData } from '../types';
import { browser } from 'wxt/browser';

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
      const results = await browser.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          function: getPageData,
          args: [options],
        }
      );

      if (results && results[0]) {
        extractedData.value = results[0].result;
        isLoading.value = false;
        return { success: true, data: extractedData.value };
      } else {
        isLoading.value = false;
        return { success: false, message: '提取数据失败' };
      }
    } catch (error) {
      console.error('提取错误:', error);
      isLoading.value = false;
      return { success: false, message: '提取数据时发生错误' };
    }
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

    if (options.html) {
      data.html = document.documentElement.outerHTML;
    }

    if (options.text) {
      data.text = document.body.innerText;
      data.wordCount = data.text.length;
    }

    if (options.images) {
      data.images = Array.from(document.images).map(img => ({
        src: img.src,
        alt: img.alt,
        width: img.width,
        height: img.height,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      }));
    }

    if (options.links) {
      data.links = Array.from(document.links)
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
      const metaTags = document.querySelectorAll('meta');
      metaTags.forEach(tag => {
        const name =
          tag.getAttribute('name') || tag.getAttribute('property') || 'unknown';
        const content = tag.getAttribute('content');
        if (content) {
          data.meta![name] = content;
        }
      });
      data.title = document.title;
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
      data.styles = {
        styleSheets: Array.from(document.styleSheets).map(
          sheet => sheet.href || 'inline'
        ),
        styles: Array.from(document.querySelectorAll('style')).map(
          style => style.innerHTML
        ),
      };
    }

    if (options.scripts) {
      data.scripts = Array.from(document.scripts).map(script => ({
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