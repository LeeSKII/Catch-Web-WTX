import { ref } from 'vue';
import { browser } from 'wxt/browser';
import { createLogger } from '../utils/logger';
import { getSupabaseClient } from './useSupabase';

// 创建日志器
const logger = createLogger('Bookmark');

export function useBookmark() {
  // bookmark 请求状态
  const isCheckingBookmark = ref(false);

  // 查询URL是否在数据库中有记录
  const checkBookmarkStatus = async (url: string): Promise<boolean> => {
    isCheckingBookmark.value = true;

    try {
      // 获取Supabase客户端
      const client = getSupabaseClient();
      
      // 从数据库中查询该URL是否存在
      const { data, error } = await client
        .from('News')
        .select('url')
        .eq('url', url)
        .single();

      if (error) {
        // 如果查询出错且错误类型是'PGRST116'（表示未找到记录），则返回false
        if (error.code === 'PGRST116') {
          logger.debug("数据库中未找到该URL记录", { url });
          return false;
        }
        // 其他错误则抛出异常
        throw error;
      }

      // 如果查询到数据，说明已收藏
      if (data) {
        logger.debug("数据库中找到该URL记录", { url });
        return true;
      }

      logger.debug("数据库中未找到该URL记录", { url });
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