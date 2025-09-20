import { ref } from 'vue';
import { createLogger } from '../utils/logger';

// 创建日志器
const logger = createLogger('Bookmark');

export function useBookmark() {
  // bookmark 请求状态
  const isCheckingBookmark = ref(false);

  // 查询URL是否在storage中有缓存的AI总结数据
  const checkBookmarkStatus = async (url: string): Promise<boolean> => {
    isCheckingBookmark.value = true;

    try {
      // 检查storage中是否有该URL的AI总结数据
      const fullSummary = localStorage.getItem(`aiSummary_${url}_full`);
      const keyInfoSummary = localStorage.getItem(`aiSummary_${url}_keyinfo`);

      // 如果有任何一种类型的总结数据，则认为已收藏
      if (fullSummary || keyInfoSummary) {
        logger.debug("在storage中找到缓存的AI总结数据", { url });
        return true;
      }

      logger.debug("在storage中未找到缓存的AI总结数据", { url });
      return false;
    } catch (error) {
      logger.error("checkBookmarkStatus() 异常", error);
      return false;
    } finally {
      isCheckingBookmark.value = false;
    }
  };

  return {
    checkBookmarkStatus,
    isCheckingBookmark,
  };
}