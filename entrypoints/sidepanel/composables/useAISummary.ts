import { ref, Ref } from "vue";
import { AISummaryData } from "../types";
import { createLogger } from "../utils/logger";
import { API_CONFIG } from "../constants";
import { browser } from "wxt/browser";
import { useAbortController } from "./useAbortController";
import { useSettings } from "./useSettings";
import OpenAI from "openai";

// 创建日志器
const logger = createLogger("AISummary");

export function useAISummary() {
  const { settings, loadSettings } = useSettings();
  const isLoadingAISummary: Ref<boolean> = ref(false);
  const aiSummaryContent: Ref<string> = ref("");
  const aiSummaryStatus: Ref<string> = ref("");
  const aiSummaryType: Ref<string> = ref("full");

  // 防重复调用：记录当前正在处理的URL
  const currentProcessingUrl: Ref<string> = ref("");

  const { createAbortController, cleanupAbortController } =
    useAbortController();

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

      // 在检查API密钥前重新加载设置，确保获取到最新的API密钥
      loadSettings();
      
      // 检查API密钥，每次都从最新的设置中获取
      const apiKey = settings.openaiApiKey;
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
    // 每次调用时都从最新的设置中获取配置，确保使用最新的配置
    const model = settings.aiModel || API_CONFIG.DEFAULT_MODEL;
    const baseUrl = settings.openaiBaseUrl || API_CONFIG.DEFAULT_BASE_URL;

    logger.debug("使用最新的AI配置", {
      model: model,
      baseUrl: baseUrl,
      apiKey: apiKey ? "***" : "未设置"
    });

    // 创建AbortController用于AI总结请求
    const abortController = createAbortController("aiSummary");

    try {
      // 初始化OpenAI客户端
      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: baseUrl,
        dangerouslyAllowBrowser: true, // 允许在浏览器中使用
      });

      // 检查请求是否被中止
      if (abortController.signal.aborted) {
        logger.debug("AI总结请求被中止");
        return { success: false, message: "请求被中止" };
      }

      // 创建流式请求，传递abort signal
      const stream = await openai.chat.completions.create({
        model: model,
        messages: [
          { role: "system", content: system_prompt },
          { role: "user", content: input },
        ],
        stream: true,
        max_tokens: API_CONFIG.MAX_TOKENS,
        temperature: API_CONFIG.TEMPERATURE,
      }, { signal: abortController.signal });

      let accumulatedContent = "";

      // 处理流式响应
      for await (const chunk of stream) {
        // 在每次处理前检查是否被中止
        if (abortController.signal.aborted) {
          logger.debug("AI总结流读取被中止");
          return { success: false, message: "请求被中止" };
        }

        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          accumulatedContent += content;
          aiSummaryContent.value = accumulatedContent;
        }
      }

      // 流结束后保存AI总结到localStorage
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
    } catch (error) {
      // 检查是否是中止错误
      if (abortController.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
        logger.debug("AI总结请求被中止");
        return { success: false, message: "请求被中止" };
      }
      logger.error("OpenAI API调用失败", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "API调用失败",
      };
    } finally {
      cleanupAbortController("aiSummary");
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
      try {
        return JSON.parse(summaryDataStr);
      } catch (error) {
        logger.error('解析AI总结数据失败', error);
        return null;
      }
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

    try {
      // 首先尝试从storage加载AI总结（立即显示，不阻塞UI）
      const summaryData = loadAISummary(url, aiSummaryType.value);

      if (summaryData) {
        logger.debug(`从${source}的storage中找到总结数据`);
        aiSummaryContent.value = summaryData.content;
        aiSummaryStatus.value = `缓存内容 - ${new Date(
          summaryData.createdAt
        ).toLocaleString()}`;
        // 立即显示缓存内容，不设置isLoading状态
        return { success: true, fromCache: true };
      } else {
        logger.debug(`从${source}的storage中没有数据`);

        // 关键修复：当storage中没有数据时，立即清空显示的内容
        // 这样可以避免显示上一个页面的AI总结
        aiSummaryContent.value = "";
        aiSummaryStatus.value = "";

        return { success: true };
      }
    } catch (error) {
      logger.error(`从${source}加载AI总结时出错`, error);
      // 出错时清空内容
      aiSummaryContent.value = "";
      aiSummaryStatus.value = "";
      return { success: false, message: "加载AI总结时出错" };
    }
  };

  // 新增函数：仅在storage中查找总结数据，不查询数据库
  const switchSummaryType = async (url: string, summaryType: string) => {
    logger.debug("switchSummaryType() 被调用", { url, summaryType });

    // 防重复调用：如果正在处理同一个URL，直接跳过
    if (currentProcessingUrl.value === url && isLoadingAISummary.value) {
      logger.debug(`正在处理URL ${url}，跳过重复调用`, { source: "switchSummaryType" });
      return { success: true, skipped: true };
    }

    if (isLoadingAISummary.value) {
      logger.debug("正在加载AI总结，跳过此次请求");
      return { success: false, message: "正在加载AI总结" };
    }

    // 设置当前正在处理的URL
    currentProcessingUrl.value = url;
    isLoadingAISummary.value = true;

    try {
      // 仅从storage中查找总结数据，不查询数据库
      const summaryData = loadAISummary(url, summaryType);

      if (summaryData) {
        logger.debug(`从storage中找到${summaryType}类型的总结数据`);
        aiSummaryContent.value = summaryData.content;
        aiSummaryStatus.value = `缓存内容 - ${new Date(
          summaryData.createdAt
        ).toLocaleString()}`;
        isLoadingAISummary.value = false;
        // 清空当前处理的URL
        currentProcessingUrl.value = "";
        return { success: true, fromCache: true };
      } else {
        logger.debug(`storage中没有找到${summaryType}类型的总结数据`);
        // 关键修复：当storage中没有数据时，立即清空显示的内容
        aiSummaryContent.value = "";
        aiSummaryStatus.value = "没有找到缓存数据";
        isLoadingAISummary.value = false;
        // 清空当前处理的URL
        currentProcessingUrl.value = "";
        return { success: false, message: "没有找到缓存数据" };
      }
    } catch (error) {
      logger.error("切换总结类型时出错", error);
      // 出错时清空内容
      aiSummaryContent.value = "";
      aiSummaryStatus.value = "";
      isLoadingAISummary.value = false;
      // 清空当前处理的URL
      currentProcessingUrl.value = "";
      return { success: false, message: "切换总结类型时出错" };
    }
  };


  return {
    isLoadingAISummary,
    aiSummaryContent,
    aiSummaryStatus,
    aiSummaryType,
    generateAISummary,
    saveAISummary,
    loadAISummary,
    clearAISummaryCache,
    loadAndDisplayAISummary,
    switchSummaryType,
  };
}