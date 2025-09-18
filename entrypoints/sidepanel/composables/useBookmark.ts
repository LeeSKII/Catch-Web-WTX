import { ref } from 'vue';
import { getSupabaseClient } from './useSupabase';
import { createLogger } from '../utils/logger';
import type { NewsData } from '../types';
import { useAbortController } from './useAbortController';

// 创建日志器
const logger = createLogger('Bookmark');

// 获取Supabase客户端单例实例
const client = getSupabaseClient();

export function useBookmark() {
  // bookmark 请求状态
  const isCheckingBookmark = ref(false);
  const { createAbortController, cleanupAbortController } = useAbortController();
  
  // 查询URL是否在News表中，并获取相关数据
  const checkBookmarkStatus = async (url: string): Promise<boolean> => {
    isCheckingBookmark.value = true;
    
    // 创建AbortController用于可能的中断
    const abortController = createAbortController('bookmarkCheck');
    
    try {
      // 使用Promise.race来处理中止信号
      const queryPromise = client
        .from("News")
        .select("url, summarizer, ai_key_info")
        .eq("url", url);
      
      let abortHandler: (() => void) | null = null;
      const abortPromise = new Promise((_, reject) => {
        abortHandler = () => {
          reject(new Error("bookmarkCheck请求被中止"));
        };
        
        if (abortController.signal.aborted) {
          abortHandler();
        } else {
          abortController.signal.addEventListener("abort", abortHandler);
        }
      });

      const result = await Promise.race([
        queryPromise,
        abortPromise
      ]) as any;

      // 清理事件监听器
      if (abortHandler) {
        abortController.signal.removeEventListener("abort", abortHandler);
      }

      // 如果是中止导致的reject，result会是undefined
      if (!result) {
        logger.debug("bookmarkCheck请求被中止");
        return false;
      }

      const { data, error } = result;

      // 检查请求是否被中止
      if (abortController.signal.aborted) {
        logger.debug("bookmarkCheck请求被中止");
        return false;
      }

      if (error) {
        // 检查是否是中止错误
        if (abortController.signal.aborted) {
          logger.debug("bookmarkCheck请求被中止");
          return false;
        }
        logger.error("数据库查询错误", error);
        return false;
      }

      if (data && data.length > 0) {
        const newsData = data[0] as NewsData;
        
        // 如果有summarizer数据，保存到storage中
        if (newsData.summarizer) {
          const summaryData = {
            content: newsData.summarizer,
            summaryType: "full",
            createdAt: new Date().toISOString(),
            url: url,
          };
          localStorage.setItem(`aiSummary_${url}_full`, JSON.stringify(summaryData));
          logger.debug("已将summarizer数据保存到storage", { url });
        }
        
        // 如果有ai_key_info数据，保存到storage中
        if (newsData.ai_key_info) {
          const keyInfoData = {
            content: newsData.ai_key_info,
            summaryType: "keyinfo",
            createdAt: new Date().toISOString(),
            url: url,
          };
          localStorage.setItem(`aiSummary_${url}_keyinfo`, JSON.stringify(keyInfoData));
          logger.debug("已将ai_key_info数据保存到storage", { url });
        }
        
        return true;
      }

      return false;
    } catch (error) {
      // 检查是否是中止错误
      if (abortController.signal.aborted || (error instanceof Error && error.message === "bookmarkCheck请求被中止")) {
        logger.debug("bookmarkCheck请求被中止");
        return false;
      }
      logger.error("checkBookmarkStatus() 异常", error);
      return false;
    } finally {
      isCheckingBookmark.value = false;
      cleanupAbortController('bookmarkCheck');
    }
  };

  return {
    checkBookmarkStatus,
    isCheckingBookmark,
  };
}