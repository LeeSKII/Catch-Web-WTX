import { browser } from 'wxt/browser';
import { createLogger } from '../utils/logger';
import type { ExtractedData } from '../types';

const logger = createLogger('DataExport');

/**
 * 数据导出逻辑
 */
export function useDataExport() {
  /**
   * 处理复制全部数据
   * @param extractedData 提取的数据
   * @param success 成功回调
   * @param error 错误回调
   */
  const handleCopyAllData = (
    extractedData: ExtractedData,
    success: (message: string) => void,
    error: (message: string) => void
  ) => {
    const text = JSON.stringify(extractedData, null, 2);

    navigator.clipboard
      .writeText(text)
      .then(() => {
        success('数据已复制到剪贴板！');
      })
      .catch((err) => {
        logger.error('复制失败', err);
        error('复制失败，请重试');
      });
  };

  /**
   * 处理导出数据
   * @param extractedData 提取的数据
   * @param success 成功回调
   * @param error 错误回调
   */
  const handleExportData = (
    extractedData: ExtractedData,
    success: (message: string) => void,
    error: (message: string) => void
  ) => {
    if (Object.keys(extractedData).length === 0) {
      error('没有数据可导出');
      return;
    }

    try {
      const blob = new Blob([JSON.stringify(extractedData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);

      // 获取标题和URL来构建文件名
      let title = extractedData.title || 'untitled';
      let urlPart = extractedData.url || 'no-url';

      // 清理标题，移除不适合文件名的字符
      title = title.replace(/[\\/:*?"<>|]/g, '-').substring(0, 50);

      // 从URL中提取域名部分
      try {
        const urlObj = new URL(urlPart);
        urlPart = urlObj.hostname.replace(/^www\./, '');
      } catch (e) {
        urlPart = 'invalid-url';
      }

      const date = new Date().toISOString().slice(0, 10);
      const filename = `${title}-${urlPart}-${date}.json`;

      browser.downloads.download({
        url: url,
        filename: filename,
        saveAs: true,
      });

      success('数据导出成功！');
    } catch (err) {
      logger.error('导出失败', err);
      error('导出失败，请重试');
    }
  };

  /**
   * 处理下载所有图片
   * @param extractedData 提取的数据
   * @param success 成功回调
   * @param warning 警告回调
   */
  const handleDownloadAllImages = (
    extractedData: ExtractedData,
    success: (message: string) => void,
    warning: (message: string) => void
  ) => {
    if (!extractedData.images || extractedData.images.length === 0) {
      warning('没有可下载的图片');
      return;
    }

    success(`开始下载 ${extractedData.images.length} 张图片`);

    extractedData.images?.forEach((img, index) => {
      if (img && img.src) {
        browser.downloads.download({
          url: img.src,
          filename: `image-${index + 1}.${
            img.src.split('.').pop()?.split('?')[0] || 'jpg'
          }`,
          saveAs: false,
        });
      }
    });
  };

  return {
    handleCopyAllData,
    handleExportData,
    handleDownloadAllImages,
  };
}