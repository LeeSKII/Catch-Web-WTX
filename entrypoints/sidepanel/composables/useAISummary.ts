import { ref, Ref } from "vue";
import { browser } from "wxt/browser";
import { AISummaryData, ExtractedData } from "../types";
import { createLogger } from "../utils/logger";
import { API_CONFIG, STORAGE_CONFIG } from "../constants";
import { getDefaultPrompt } from "../constants/prompts";
import { getCurrentTab } from "../utils/browser";
import { useAbortController } from "./useAbortController";
import { useStores } from "../stores";
import OpenAI from "openai";

// 创建日志器
const logger = createLogger("AISummary");

/**
 * 生成 AI 总结存储键
 *
 * @description
 * 根据 URL 和总结类型生成统一的存储键名
 *
 * @param url - 页面 URL
 * @param summaryType - 总结类型 ('full' | 'keyinfo')
 * @returns 存储键名
 */
const getStorageKey = (url: string, summaryType: string): string => {
  return `${STORAGE_CONFIG.AI_SUMMARY_PREFIX}${url}_${summaryType}`;
};

export function useAISummary() {
  const { settingsStore } = useStores();
  const isLoadingAISummary: Ref<boolean> = ref(false);
  const aiSummaryContent: Ref<string> = ref("");
  const aiSummaryStatus: Ref<string> = ref("");
  const aiSummaryType: Ref<string> = ref("full");
  const customPrompts: Ref<{ full: string; keyinfo: string }> = ref({
    full: "",
    keyinfo: ""
  });
  const isGeneratingAISummary: Ref<boolean> = ref(false);

  // 防重复调用：记录当前正在处理的URL
  const currentProcessingUrl: Ref<string> = ref("");

  const { createAbortController, cleanupAbortController, abortRequest } =
    useAbortController();

  const generateAISummary = async (content: string, extractedData: ExtractedData) => {
    if (isLoadingAISummary.value) {
      return;
    }

    isLoadingAISummary.value = true;
    isGeneratingAISummary.value = true;

    try {
      if (!content) {
        logger.debug("未识别到任何需要总结的数据");
        isLoadingAISummary.value = false;
        isGeneratingAISummary.value = false;
        return { success: false, message: "未识别到任何需要总结的数据" };
      }

      // 检查是否已提取数据
      if (Object.keys(extractedData).length === 0) {
        logger.debug("请先提取网页数据");
        isLoadingAISummary.value = false;
        isGeneratingAISummary.value = false;
        return { success: false, message: "请先提取网页数据" };
      }

      // 在检查API密钥前重新加载设置，确保获取到最新的API密钥
      settingsStore.loadSettings();
      
      // 检查API密钥，每次都从最新的设置中获取
      const apiKey = settingsStore.state.settings.openaiApiKey;
      if (!apiKey) {
        logger.debug("请先在设置中配置OpenAI API密钥");
        isLoadingAISummary.value = false;
        isGeneratingAISummary.value = false;
        return { success: false, message: "请先在设置中配置OpenAI API密钥" };
      }

      // 获取总结类型
      const summaryType = aiSummaryType.value;

      // 根据总结类型获取 prompt
      const system_prompt = getCurrentPrompt(summaryType);

      // 调用OpenAI API
      const result = await callOpenAI(apiKey, system_prompt, content);
      isLoadingAISummary.value = false;
      isGeneratingAISummary.value = false;
      return result;
    } catch (error) {
      logger.error("生成AI总结时出错", error);
      isLoadingAISummary.value = false;
      isGeneratingAISummary.value = false;
      return { success: false, message: "生成AI总结时出错" };
    }
  };

  const callOpenAI = async (
    apiKey: string,
    system_prompt: string,
    input: string
  ) => {
    // 每次调用时都从最新的设置中获取配置，确保使用最新的配置
    const model = settingsStore.state.settings.aiModel || API_CONFIG.DEFAULT_MODEL;
    const baseUrl = settingsStore.state.settings.openaiBaseUrl || API_CONFIG.DEFAULT_BASE_URL;

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
      const tab = await getCurrentTab();
      if (tab?.url) {
        saveAISummary(tab.url, accumulatedContent, aiSummaryType.value);
        aiSummaryStatus.value = `已保存 - ${new Date().toLocaleString()}`;
      }

      // 流结束后，确保生成状态为false
      isGeneratingAISummary.value = false;
      return { success: true, content: accumulatedContent };
    } catch (error) {
      // 检查是否是中止错误
      if (abortController.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
        logger.debug("AI总结请求被中止");
        isGeneratingAISummary.value = false;
        return { success: false, message: "请求被中止" };
      }
      logger.error("OpenAI API调用失败", error);
      isGeneratingAISummary.value = false;
      return {
        success: false,
        message: error instanceof Error ? error.message : "API调用失败",
      };
    } finally {
      cleanupAbortController("aiSummary");
    }
  };

  const pauseAISummary = async () => {
    if (!isGeneratingAISummary.value) {
      return { success: false, message: "没有正在进行的AI总结" };
    }

    try {
      // 中止AI总结请求
      abortRequest("aiSummary");

      // 保存当前已生成的内容
      const tab = await getCurrentTab();

      if (tab?.url && aiSummaryContent.value) {
        saveAISummary(tab.url, aiSummaryContent.value, aiSummaryType.value);
        aiSummaryStatus.value = `已暂停并保存 - ${new Date().toLocaleString()}`;
      }
      
      isGeneratingAISummary.value = false;
      isLoadingAISummary.value = false;
      
      return { success: true, message: "AI总结已暂停并保存" };
    } catch (error) {
      logger.error("暂停AI总结时出错", error);
      isGeneratingAISummary.value = false;
      isLoadingAISummary.value = false;
      return { success: false, message: "暂停AI总结时出错" };
    }
  };

  const saveAISummary = async (url: string, content: string, summaryType: string) => {
    const summaryData: AISummaryData = {
      content: content,
      summaryType: summaryType,
      createdAt: new Date().toISOString(),
      url: url,
    };

    const key = getStorageKey(url, summaryType);
    await browser.storage.local.set({ [key]: summaryData });
  };

  const loadAISummary = async (
    url: string,
    summaryType: string
  ): Promise<AISummaryData | null> => {
    const key = getStorageKey(url, summaryType);
    const result = await browser.storage.local.get(key);

    if (result[key]) {
      try {
        return result[key] as AISummaryData;
      } catch (error) {
        logger.error('解析AI总结数据失败', error);
        return null;
      }
    }

    return null;
  };

  const clearAISummaryCache = async (url: string, summaryType: string) => {
    const key = getStorageKey(url, summaryType);
    await browser.storage.local.remove(key);
    aiSummaryStatus.value = "";
  };

  const loadAndDisplayAISummary = async (
    url: string,
    source: string = "unknown"
  ) => {
    logger.debug("loadAndDisplayAISummary() 被调用", { source, url });

    try {
      // 首先尝试从storage加载AI总结（立即显示，不阻塞UI）
      const summaryData = await loadAISummary(url, aiSummaryType.value);

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
      const summaryData = await loadAISummary(url, summaryType);

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


  // 保存自定义 prompts 到 browser.storage.local
  const saveCustomPrompts = async (prompts: { full: string; keyinfo: string }) => {
    customPrompts.value = prompts;
    await browser.storage.local.set({ customAIPrompts: prompts });
    logger.debug("自定义 prompts 已保存", prompts);
  };

  // 从 browser.storage.local 加载自定义 prompts
  const loadCustomPrompts = async () => {
    try {
      const result = await browser.storage.local.get('customAIPrompts');
      const savedPrompts = result.customAIPrompts;
      if (savedPrompts) {
        customPrompts.value = {
          full: savedPrompts.full || "",
          keyinfo: savedPrompts.keyinfo || ""
        };
        logger.debug("自定义 prompts 已加载", customPrompts.value);
      } else {
        // 如果没有保存的 prompts，使用默认值
        customPrompts.value = {
          full: "",
          keyinfo: ""
        };
      }
    } catch (error) {
      logger.error("加载自定义 prompts 失败", error);
      customPrompts.value = {
        full: "",
        keyinfo: ""
      };
    }
  };

  // 获取当前类型的 prompt
  const getCurrentPrompt = (summaryType: string): string => {
    const customPrompt = customPrompts.value[summaryType as keyof typeof customPrompts.value];
    if (customPrompt && customPrompt.trim()) {
      return customPrompt;
    }

    // 如果没有自定义 prompt，使用默认的
    return getDefaultPrompt(summaryType as 'full' | 'keyinfo');
  };

  // 恢复默认 prompts（清空自定义 prompts，将使用内置默认值）
  const restoreDefaultPrompts = async () => {
    customPrompts.value = { full: "", keyinfo: "" };
    await browser.storage.local.set({ customAIPrompts: customPrompts.value });
    logger.debug("已恢复默认 prompts");
  };

  // 获取默认 prompts（从常量配置中获取）
  const getDefaultPrompts = () => {
    return {
      full: getDefaultPrompt('full'),
      keyinfo: getDefaultPrompt('keyinfo')
    };
  };

  return {
    isLoadingAISummary,
    aiSummaryContent,
    aiSummaryStatus,
    aiSummaryType,
    customPrompts,
    isGeneratingAISummary,
    generateAISummary,
    pauseAISummary,
    saveAISummary,
    loadAISummary,
    clearAISummaryCache,
    loadAndDisplayAISummary,
    switchSummaryType,
    saveCustomPrompts,
    loadCustomPrompts,
    getCurrentPrompt,
    restoreDefaultPrompts,
    getDefaultPrompts,
  };
}