import { ref } from 'vue';
import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../utils/logger';
import type { NewsData } from '../types';

// 创建日志器
const logger = createLogger('Bookmark');

// Supabase初始化
const client = createClient(
  "https://jnzoquhmgpjbqcabgxrd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impuem9xdWhtZ3BqYnFjYWJneHJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MDc4OTgsImV4cCI6MjA3MjA4Mzg5OH0.BKMFZNbTgGf5yxfAQuFbA912fISlbbL3GE6YDn-OkaA"
);

export function useBookmark() {
  // bookmark 请求状态
  const isCheckingBookmark = ref(false);
  
  // 查询URL是否在News表中，并获取相关数据
  const checkBookmarkStatus = async (url: string): Promise<boolean> => {
    isCheckingBookmark.value = true;
    try {
      const { data, error } = await client
        .from("News")
        .select("url, summarizer, ai_key_info")
        .eq("url", url);

      if (error) {
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