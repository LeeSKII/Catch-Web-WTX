import { ref, Ref } from "vue";
import { AISummaryData, NewsData } from "../types";
import { createClient } from "@supabase/supabase-js";
import { createLogger } from "../utils/logger";
import { API_CONFIG } from "../constants";
import { browser } from "wxt/browser";

// 创建日志器
const logger = createLogger("AISummary");

export function useAISummary() {
  const isLoadingAISummary: Ref<boolean> = ref(false);
  const isQueryingDatabase: Ref<boolean> = ref(false);
  const aiSummaryContent: Ref<string> = ref("");
  const aiSummaryStatus: Ref<string> = ref("");
  const aiSummaryType: Ref<string> = ref("full");

  // Supabase初始化
  const client = createClient(
    "https://jnzoquhmgpjbqcabgxrd.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impuem9xdWhtZ3BqYnFjYWJneHJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MDc4OTgsImV4cCI6MjA3MjA4Mzg5OH0.BKMFZNbTgGf5yxfAQuFbA912fISlbbL3GE6YDn-OkaA"
  );

  const getNews = async (url: string): Promise<NewsData[]> => {
    logger.debug("getNews() 被调用", { url });
    try {
      const { data, error } = await client
        .from("News")
        .select("url,summarizer")
        .eq("url", url);

      if (error) {
        logger.error("数据库查询错误", error);
        return [];
      }

      logger.debug("数据库查询结果", data);
      return data || [];
    } catch (error) {
      logger.error("getNews() 异常", error);
      return [];
    }
  };

  const displayNewsSummarizer = (summarizerData: NewsData[]): boolean => {
    logger.debug("displayNewsSummarizer() 被调用", { data: summarizerData });

    if (!summarizerData || summarizerData.length === 0) {
      logger.debug("没有summarizer数据，返回false");
      return false; // 没有数据，返回false
    }

    const summarizer = summarizerData[0].summarizer;
    if (!summarizer) {
      logger.debug("summarizer内容为空，返回false");
      return false; // 没有summarizer内容，返回false
    }

    // 显示summarizer内容
    aiSummaryContent.value = summarizer;
    aiSummaryStatus.value = "数据库内容";

    return true; // 成功显示，返回true
  };

  const generateAISummary = async (content: string, extractedData: any) => {
    if (isLoadingAISummary.value) {
      return;
    }

    isLoadingAISummary.value = true;

    try {
      if (!content) {
        logger.debug("未识别到任何需要总结的数据");
        isLoadingAISummary.value = false;
        return { success: false, message: "未识别到任何需要总结的数据" };
      }

      // 检查是否已提取数据
      if (Object.keys(extractedData).length === 0) {
        logger.debug("请先提取网页数据");
        isLoadingAISummary.value = false;
        return { success: false, message: "请先提取网页数据" };
      }

      // 检查API密钥
      const apiKey = localStorage.getItem("openaiApiKey");
      if (!apiKey) {
        logger.debug("请先在设置中配置OpenAI API密钥");
        isLoadingAISummary.value = false;
        return { success: false, message: "请先在设置中配置OpenAI API密钥" };
      }

      // 获取总结类型
      const summaryType = aiSummaryType.value;

      // 根据总结类型准备内容
      let system_prompt = "";

      switch (summaryType) {
        case "full":
          system_prompt =
            "对用户提供的内容进行总结，要求简洁明了，突出重点，禁止遗漏任何关键和重要信息，回复语言：简体中文。";
          break;
        case "keyinfo":
          system_prompt =
            "对用户提供的内容提取关键信息，包括：主要主题、重要数据、关键人物、时间地点等核心信息，回复语言：简体中文。";
          break;
      }

      // 调用OpenAI API
      const result = await callOpenAI(apiKey, system_prompt, content);
      isLoadingAISummary.value = false;
      return result;
    } catch (error) {
      logger.error("生成AI总结时出错", error);
      isLoadingAISummary.value = false;
      return { success: false, message: "生成AI总结时出错" };
    }
  };

  const callOpenAI = async (
    apiKey: string,
    system_prompt: string,
    input: string
  ) => {
    const model = localStorage.getItem("aiModel") || API_CONFIG.DEFAULT_MODEL;
    const baseUrl =
      localStorage.getItem("openaiBaseUrl") || API_CONFIG.DEFAULT_BASE_URL;
    const apiUrl = `${baseUrl}/chat/completions`;

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: system_prompt },
            {
              role: "user",
              content: input,
            },
          ],
          stream: true,
          max_tokens: API_CONFIG.MAX_TOKENS,
          temperature: API_CONFIG.TEMPERATURE,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "API请求失败");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("无法获取响应流");
      }

      const decoder = new TextDecoder();
      let accumulatedContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              // 保存AI总结到localStorage
              const tabs = await browser.tabs.query({
                active: true,
                currentWindow: true,
              });
              if (tabs && tabs[0]) {
                const url = tabs[0].url;
                if (url) {
                  saveAISummary(url, accumulatedContent, aiSummaryType.value);
                  aiSummaryStatus.value = `已保存 - ${new Date().toLocaleString()}`;
                }
              }
              return { success: true, content: accumulatedContent };
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || "";
              if (content) {
                accumulatedContent += content;
                aiSummaryContent.value = accumulatedContent;
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      logger.error("OpenAI API调用失败", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "API调用失败",
      };
    }
  };

  const saveAISummary = (url: string, content: string, summaryType: string) => {
    const summaryData: AISummaryData = {
      content: content,
      summaryType: summaryType,
      createdAt: new Date().toISOString(),
      url: url,
    };

    // 使用URL和总结类型作为key存储AI总结，这样不同类型的总结可以分别保存
    const key = `aiSummary_${url}_${summaryType}`;
    localStorage.setItem(key, JSON.stringify(summaryData));
  };

  const loadAISummary = (
    url: string,
    summaryType: string
  ): AISummaryData | null => {
    // 使用URL和总结类型作为key加载AI总结
    const key = `aiSummary_${url}_${summaryType}`;
    const summaryDataStr = localStorage.getItem(key);

    if (summaryDataStr) {
      return JSON.parse(summaryDataStr);
    }

    return null;
  };

  const clearAISummaryCache = (url: string, summaryType: string) => {
    // 使用URL和总结类型作为key清除AI总结缓存
    const key = `aiSummary_${url}_${summaryType}`;
    localStorage.removeItem(key);
    aiSummaryStatus.value = "";
  };

  const loadAndDisplayAISummary = async (
    url: string,
    source: string = "unknown"
  ) => {
    logger.debug("loadAndDisplayAISummary() 被调用", { source, url });

    if (isLoadingAISummary.value) {
      logger.debug("正在加载AI总结，跳过此次请求");
      return { success: false, message: "正在加载AI总结" };
    }

    isLoadingAISummary.value = true;

    try {
      // 首先尝试从storage加载AI总结
      const summaryData = loadAISummary(url, aiSummaryType.value);

      if (summaryData) {
        logger.debug(`从${source}的storage中找到总结数据`);
        aiSummaryContent.value = summaryData.content;
        aiSummaryStatus.value = `缓存内容 - ${new Date(
          summaryData.createdAt
        ).toLocaleString()}`;
        isLoadingAISummary.value = false;
        return { success: true, fromCache: true };
      } else {
        logger.debug(`从${source}的storage中没有数据，尝试从数据库加载`);
        // 如果storage中没有，先结束isLoadingAISummary状态，恢复按钮可用状态
        isLoadingAISummary.value = false;

        // 设置数据库查询状态
        isQueryingDatabase.value = true;

        // 从数据库加载summarizer
        const newsData = await getNews(url);

        // 结束数据库查询状态
        isQueryingDatabase.value = false;

        if (displayNewsSummarizer(newsData)) {
          logger.debug(`从${source}的数据库中成功显示summarizer数据`);
          return { success: true, fromDatabase: true };
        } else {
          logger.debug(`从${source}的数据库中也没有summarizer数据`);
          aiSummaryContent.value = "";
          aiSummaryStatus.value = "";
          return { success: false, message: "没有找到AI总结数据" };
        }
      }
    } catch (error) {
      logger.error(`从${source}加载AI总结时出错`, error);
      aiSummaryContent.value = "";
      aiSummaryStatus.value = "";
      isLoadingAISummary.value = false;
      isQueryingDatabase.value = false;
      return { success: false, message: "加载AI总结时出错" };
    }
  };

  return {
    isLoadingAISummary,
    isQueryingDatabase,
    aiSummaryContent,
    aiSummaryStatus,
    aiSummaryType,
    generateAISummary,
    saveAISummary,
    loadAISummary,
    getNews,
    clearAISummaryCache,
    loadAndDisplayAISummary,
  };
}
