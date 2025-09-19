import { ref, reactive, onMounted, computed, watch } from "vue";
import { browser } from "wxt/browser";
import { storage } from "#imports";
import { createLogger } from "../utils/logger";
import { useToast } from "./useToast";
import { useSettings } from "./useSettings";
import { useAbortController } from "./useAbortController";
import OpenAI from "openai";
import { API_CONFIG } from "../constants";
import { ExtractedData } from "../types";

const logger = createLogger("Chat");
const { success, error, warning, info } = useToast();
const { settings, loadSettings } = useSettings();
const {
  createAbortController,
  abortRequest,
  getAbortController,
  cleanupAbortController,
} = useAbortController();

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  isStreaming?: boolean; // 标记消息是否正在流式传输中
}

interface ChatHistory {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 聊天功能逻辑
 */
export function useChat() {
  // 响应式数据
  const messages = ref<ChatMessage[]>([]);
  const isChatLoading = ref(false);
  const currentChatId = ref<string>("");
  const chatHistory = ref<ChatHistory[]>([]);
  const referenceInfo = ref<ExtractedData | null>(null);
  const referenceList = ref<ExtractedData[]>([]);
  const showReferenceModal = ref(false);
  const showReferenceListModal = ref(false);
  const selectedReferenceIndex = ref<number>(-1);
  // 单独的系统消息引用，确保只有一个系统消息
  const systemMessage = ref<ChatMessage | null>(null);
  // 流式输出相关
  const streamingContent = ref<string>("");
  const isStreaming = ref<boolean>(false);
  // 使用全局设置，确保实时响应设置变化
  const currentModel = computed(() => settings.aiModel || API_CONFIG.DEFAULT_MODEL);
  const maxTokens = computed(() => API_CONFIG.MAX_TOKENS); // 使用配置文件中的值
  const temperature = computed(() => API_CONFIG.TEMPERATURE); // 使用配置文件中的值

  // 初始化
  onMounted(async () => {
    await loadChatHistory();
    await loadReferenceList();
  });

  // 监听引用列表变化，确保系统消息始终与引用列表保持一致
  watch(referenceList, () => {
    // 如果引用列表不为空，更新系统消息
    if (referenceList.value.length > 0) {
      updateSystemMessages();
    } else {
      // 如果引用列表为空，移除系统消息
      messages.value = messages.value.filter((msg) => msg.role !== "system");
      systemMessage.value = null;
    }
  }, { deep: true });

  /**
   * 加载聊天历史
   */
  const loadChatHistory = async () => {
    try {
      const chatHistoryData = await storage.getItem("local:chatHistory");
      if (chatHistoryData) {
        const parsedData = JSON.parse(chatHistoryData as string);
        chatHistory.value = parsedData.map((chat: any) => ({
          ...chat,
          createdAt: new Date(chat.createdAt),
          updatedAt: new Date(chat.updatedAt),
        }));
      }
    } catch (err) {
      logger.error("加载聊天历史失败", err);
    }
  };

  /**
   * 保存聊天历史
   */
  const saveChatHistory = async () => {
    try {
      await storage.setItem(
        "local:chatHistory",
        JSON.stringify(chatHistory.value)
      );
    } catch (err) {
      logger.error("保存聊天历史失败", err);
    }
  };

  /**
   * 加载引用列表
   */
  const loadReferenceList = async () => {
    try {
      logger.debug("开始加载引用列表");
      const referenceListData = await storage.getItem("local:referenceList");
      logger.debug("从storage获取的引用列表数据:", referenceListData);

      if (referenceListData) {
        const parsedData = JSON.parse(referenceListData as string);
        logger.debug(
          "找到引用列表数据，数量:",
          Array.isArray(parsedData) ? parsedData.length : "不是数组"
        );
        // 确保 referenceList 是一个数组
        referenceList.value = Array.isArray(parsedData) ? parsedData : [];
        logger.debug(
          "引用列表已加载到响应式变量，当前数量:",
          referenceList.value.length
        );

        // 如果有引用列表，更新系统消息
        if (referenceList.value.length > 0) {
          updateSystemMessages();
          logger.debug("已更新系统消息");
        }
      } else {
        logger.debug("storage中没有找到引用列表数据");
        referenceList.value = [];
      }
    } catch (err) {
      logger.error("加载引用列表失败", err);
    }
  };

  /**
   * 保存引用列表
   */
  const saveReferenceList = async () => {
    try {
      logger.debug("开始保存引用列表，当前数量:", referenceList.value.length);
      logger.debug("引用列表内容:", JSON.stringify(referenceList.value));
      await storage.setItem(
        "local:referenceList",
        JSON.stringify(referenceList.value)
      );
      logger.debug("引用列表已保存到storage");

      // 验证保存是否成功
      const result = await storage.getItem("local:referenceList");
      logger.debug("验证保存结果:", result);
    } catch (err) {
      logger.error("保存引用列表失败", err);
    }
  };

  /**
   * 创建新聊天
   */
  const createNewChat = () => {
    const chatId = Date.now().toString();
    currentChatId.value = chatId;
    
    // 清空所有非系统消息
    messages.value = messages.value.filter((msg) => msg.role === "system");

    // 如果引用列表不为空，确保系统消息存在且内容正确
    if (referenceList.value.length > 0) {
      updateSystemMessages();
    }

    const newChat: ChatHistory = {
      id: chatId,
      title: "新对话",
      messages: [...messages.value],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    chatHistory.value.unshift(newChat);
    saveChatHistory();

    info("已创建新对话");
  };

  /**
   * 加载指定聊天
   */
  const loadChat = (chatId: string) => {
    const chat = chatHistory.value.find((c) => c.id === chatId);
    if (chat) {
      currentChatId.value = chatId;
      messages.value = [...chat.messages];
      
      // 确保系统消息与当前引用列表保持一致
      if (referenceList.value.length > 0) {
        updateSystemMessages();
      }
    }
  };

  /**
   * 删除聊天
   */
  const deleteChat = (chatId: string) => {
    chatHistory.value = chatHistory.value.filter((c) => c.id !== chatId);
    if (currentChatId.value === chatId) {
      createNewChat();
    }
    saveChatHistory();
    success("对话已删除");
  };

  /**
   * 更新聊天标题
   */
  const updateChatTitle = (chatId: string, title: string) => {
    const chat = chatHistory.value.find((c) => c.id === chatId);
    if (chat) {
      chat.title = title;
      chat.updatedAt = new Date();
      saveChatHistory();
    }
  };

  /**
   * 发送消息
   */
  const callOpenAI = async (
    apiKey: string,
    baseUrl: string,
    messages: Array<{ role: string; content: string }>,
    onStreamUpdate?: (content: string) => void
  ) => {
    // 每次调用时都从最新的设置中获取配置，确保使用最新的配置
    const model = settings.aiModel || API_CONFIG.DEFAULT_MODEL;
    const actualBaseUrl = settings.openaiBaseUrl || baseUrl || API_CONFIG.DEFAULT_BASE_URL;
    
    logger.debug("使用最新的AI配置", {
      model: model,
      baseUrl: actualBaseUrl,
      apiKey: apiKey ? "***" : "未设置"
    });

    // 创建AbortController用于聊天请求
    const abortController = createAbortController("chat");

    try {
      // 初始化OpenAI客户端
      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: actualBaseUrl,
        dangerouslyAllowBrowser: true, // 允许在浏览器中使用
      });

      // 检查请求是否被中止
      if (abortController.signal.aborted) {
        logger.debug("聊天请求被中止");
        return { success: false, message: "请求被中止" };
      }

      // 创建流式请求，传递abort signal
      const stream = await openai.chat.completions.create({
        model: model,
        messages: messages as any,
        stream: true,
        max_tokens: maxTokens.value,
        temperature: temperature.value,
      }, { signal: abortController.signal });

      let accumulatedContent = "";

      // 处理流式响应
      for await (const chunk of stream) {
        // 在每次处理前检查是否被中止
        if (abortController.signal.aborted) {
          logger.debug("聊天流读取被中止");
          return { success: false, message: "请求被中止" };
        }

        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          accumulatedContent += content;
          // 调用回调函数，实时更新流式内容
          onStreamUpdate?.(accumulatedContent);
        }
      }

      return { success: true, content: accumulatedContent };
    } catch (error) {
      // 检查是否是中止错误
      if (abortController.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
        logger.debug("聊天请求被中止");
        return { success: false, message: "请求被中止" };
      }
      logger.error("OpenAI API调用失败", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "API调用失败",
      };
    } finally {
      cleanupAbortController("chat");
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;
    
    // 防止在已经有消息正在处理时发送新消息
    if (isChatLoading.value) {
      warning("请等待当前消息处理完成");
      return;
    }

    // 如果没有当前聊天，创建新聊天
    if (!currentChatId.value) {
      createNewChat();
    }

    // 添加用户消息
    const userMessage: ChatMessage = {
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    messages.value.push(userMessage);

    // 更新聊天历史
    const chat = chatHistory.value.find((c) => c.id === currentChatId.value);
    if (chat) {
      chat.messages = [...messages.value];
      chat.updatedAt = new Date();

      // 如果是第一条消息，更新标题
      if (chat.messages.length === 1) {
        chat.title =
          content.length > 20 ? content.substring(0, 20) + "..." : content;
      }
    }

    // 设置加载状态
    isChatLoading.value = true;
    isStreaming.value = true;
    streamingContent.value = "";
    
    // 添加调试日志
    logger.debug("开始新的流式传输，重置用户滚动状态");

    // 创建一个临时的AI消息，用于流式传输
    const streamingMessage: ChatMessage = {
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true, // 标记为流式传输中
    };

    // 将临时消息添加到消息列表
    messages.value.push(streamingMessage);
    
    // 保存临时消息的索引，避免后续查找问题
    let streamingMessageIndex = messages.value.length - 1;

    try {
      // 在发送消息前重新加载设置，确保获取到最新的API密钥
      loadSettings();
      
      // 获取API密钥和baseUrl，每次都从最新的设置中获取
      const apiKey = settings.openaiApiKey;
      const baseUrl = settings.openaiBaseUrl || API_CONFIG.DEFAULT_BASE_URL;

      if (!apiKey) {
        throw new Error("请先在设置中配置OpenAI API密钥");
      }

      logger.debug("使用最新的API配置", {
        model: currentModel.value,
        baseUrl: baseUrl,
        maxTokens: maxTokens.value,
        temperature: temperature.value,
      });

      // 准备消息历史，确保只有一个系统消息
      const messageHistory = messages.value
        .filter((msg) => msg.role !== "system" && !msg.isStreaming) // 过滤掉系统消息和流式传输中的临时消息
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

      // 如果有系统消息，添加到消息历史的开头
      if (systemMessage.value) {
        messageHistory.unshift({
          role: systemMessage.value.role,
          content: systemMessage.value.content,
        });
      }

      // 输出日志：systemPrompt 和 messages 内容
      logger.debug("对话内容", {
        systemPrompt: systemPrompt.value,
        messages: messageHistory,
      });

      // 调用OpenAI API
      logger.debug("开始调用OpenAI API进行流式传输");
      const result = await callOpenAI(apiKey, baseUrl, messageHistory, (content) => {
        streamingContent.value = content;
        // 使用保存的索引更新临时消息的内容
        if (streamingMessageIndex >= 0 && streamingMessageIndex < messages.value.length) {
          messages.value[streamingMessageIndex].content = content;
          logger.debug("流式传输内容更新，长度:", content.length);
        }
      });

      if (result.success && result.content) {
        logger.debug("流式传输成功完成，最终内容长度:", result.content.length);
        
        // 流式传输完成，将临时消息标记为完成状态
        if (streamingMessageIndex >= 0 && streamingMessageIndex < messages.value.length) {
          messages.value[streamingMessageIndex].content = result.content;
          messages.value[streamingMessageIndex].isStreaming = false; // 标记为流式传输完成
          logger.debug("已将临时消息标记为完成状态");
        }

        // 更新聊天历史
        if (chat) {
          chat.messages = [...messages.value];
          chat.updatedAt = new Date();
        }

        // 保存聊天历史
        await saveChatHistory();

        // 取消消息发送成功的toast提示
        // success('消息发送成功');
      } else {
        logger.debug("流式传输失败:", result.message);
        // 如果失败，移除临时消息
        if (streamingMessageIndex >= 0 && streamingMessageIndex < messages.value.length) {
          messages.value.splice(streamingMessageIndex, 1);
        }
        throw new Error(result.message || "发送消息失败");
      }
    } catch (err: any) {
      logger.error("发送消息失败", err);

      // 如果是取消请求的错误，不显示错误提示
      const abortController = getAbortController("chat");
      if (abortController?.signal.aborted || (err instanceof Error && err.name === "AbortError")) {
        info("请求已取消");
      } else {
        error(err.message || "发送消息失败，请重试");
      }

      // 移除用户消息和临时消息
      messages.value = messages.value.filter((msg) => msg !== userMessage);
      // 使用索引移除临时消息
      if (streamingMessageIndex >= 0 && streamingMessageIndex < messages.value.length) {
        messages.value.splice(streamingMessageIndex, 1);
      }
    } finally {
      logger.debug("流式传输会话结束，重置状态");
      isChatLoading.value = false;
      isStreaming.value = false;
      streamingContent.value = "";
    }
  };

  /**
   * 清空当前对话
   */
  const clearChat = () => {
    if (messages.value.length === 0) {
      warning("当前对话已经是空的");
      return;
    }

    if (confirm("确定要清空当前对话吗？")) {
      // 清空所有非系统消息
      messages.value = messages.value.filter((msg) => msg.role === "system");

      // 如果引用列表不为空，确保系统消息存在且内容正确
      if (referenceList.value.length > 0) {
        updateSystemMessages();
      }

      // 更新聊天历史
      const chat = chatHistory.value.find((c) => c.id === currentChatId.value);
      if (chat) {
        chat.messages = [...messages.value];
        chat.updatedAt = new Date();
        saveChatHistory();
      }

      success("对话已清空");
    }
  };

  /**
   * 保存当前对话
   */
  const saveChat = () => {
    if (messages.value.length === 0) {
      warning("没有可保存的对话内容");
      return;
    }

    // 更新聊天历史
    const chat = chatHistory.value.find((c) => c.id === currentChatId.value);
    if (chat) {
      chat.messages = [...messages.value];
      chat.updatedAt = new Date();
      saveChatHistory();
      success("对话已保存");
    }
  };

  /**
   * 导出对话
   */
  const exportChat = (chatId: string) => {
    const chat = chatHistory.value.find((c) => c.id === chatId);
    if (!chat) {
      error("对话不存在");
      return;
    }

    const content = chat.messages
      .map(
        (msg) =>
          `${
            msg.role === "user" ? "User" : "AI"
          } (${msg.timestamp.toLocaleString()}):\n${msg.content}\n`
      )
      .join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    browser.downloads.download({
      url: url,
      filename: `chat-${chat.title}-${new Date()
        .toISOString()
        .slice(0, 10)}.txt`,
      saveAs: true,
    });

    success("对话导出成功");
  };

  /**
   * 中断当前请求
   */
  const abortCurrentRequest = () => {
    abortRequest("chat");
    isChatLoading.value = false;
    isStreaming.value = false;
    streamingContent.value = "";
  };

  // 添加引用到聊天上下文
  const addReferenceToChat = async (
    referenceTextParam: string,
    extractedData?: ExtractedData
  ): Promise<boolean> => {
    console.log("addReferenceToChat 被调用，参数:", {
      referenceTextParam,
      extractedData,
    });
    if (!referenceTextParam.trim()) {
      console.log("引用文本为空，返回 false");
      return false;
    }

    // 检查是否已经存在相同URL的引用
    if (extractedData && extractedData.url) {
      const isDuplicate = referenceList.value.some(
        (item) => item.url === extractedData.url
      );
      if (isDuplicate) {
        console.log("检测到重复引用，URL:", extractedData.url);
        warning("该网页引用已经存在，请勿重复添加");
        return false;
      }
    }

    // 如果没有当前聊天，创建新聊天
    if (!currentChatId.value) {
      console.log("没有当前聊天，创建新聊天");
      createNewChat();
    }

    // 保存引用信息到列表
    if (extractedData) {
      console.log(
        "将引用添加到列表，当前列表数量:",
        referenceList.value.length
      );
      referenceList.value.push(extractedData);
      referenceInfo.value = extractedData;
      console.log("引用已添加到列表，新数量:", referenceList.value.length);
    }

    // 创建或更新系统消息，使用 systemPrompt 计算属性
    systemMessage.value = {
      role: "system",
      content: systemPrompt.value,
      timestamp: new Date(),
    };

    // 检查是否已存在系统消息
    const existingSystemMessageIndex = messages.value.findIndex(
      (msg) => msg.role === "system"
    );

    if (existingSystemMessageIndex !== -1) {
      // 如果已存在系统消息，更新其内容
      messages.value[existingSystemMessageIndex] = systemMessage.value;
    } else {
      // 如果不存在系统消息，添加到消息列表的开头
      messages.value.unshift(systemMessage.value);
    }

    // 更新聊天历史
    const chat = chatHistory.value.find((c) => c.id === currentChatId.value);
    if (chat) {
      chat.messages = [...messages.value];
      chat.updatedAt = new Date();
      saveChatHistory();
    }

    // 保存引用列表到 storage
    console.log("准备保存引用列表到 storage");
    await saveReferenceList();
    console.log("引用列表已保存到 storage，函数即将返回 true");

    return true;
  };

  // 显示引用列表模态对话框
  const showReferenceList = () => {
    showReferenceListModal.value = true;
  };

  // 隐藏引用列表模态对话框
  const hideReferenceList = () => {
    showReferenceListModal.value = false;
  };

  // 显示引用详情模态对话框
  const showReferenceDetail = (index: number) => {
    selectedReferenceIndex.value = index;
    referenceInfo.value = referenceList.value[index];
    showReferenceModal.value = true;
  };

  // 隐藏引用详情模态对话框
  const hideReferenceDetail = () => {
    showReferenceModal.value = false;
    selectedReferenceIndex.value = -1;
  };

  // 获取引用文本的前200个字符
  const getReferencePreview = computed(() => {
    if (!referenceInfo.value || !referenceInfo.value.text) return "";
    return (
      referenceInfo.value.text.substring(0, 200) +
      (referenceInfo.value.text.length > 200 ? "..." : "")
    );
  });

  // 根据引用列表动态生成引用文本
  const referenceText = computed(() => {
    if (referenceList.value.length === 0) return "";

    let text = "请基于以下网页内容回答我的问题：\n\n";

    referenceList.value.forEach((item, index) => {
      if (item.text) {
        text += `网页 ${index + 1}：\n${item.text}\n\n`;
      }
    });

    return text;
  });

  // 专门用于生成系统消息内容的计算属性
  const systemPrompt = computed(() => {
    if (referenceList.value.length === 0) return "";

    let prompt = "请基于以下网页内容回答我的问题：\n\n";

    referenceList.value.forEach((item, index) => {
      if (item.text) {
        prompt += `网页 ${index + 1}：\n${item.text}\n\n`;
      }
    });

    return prompt;
  });

  // 获取引用列表项的预览文本
  const getReferenceItemPreview = (item: ExtractedData) => {
    if (!item.text) return "";
    return item.text.substring(0, 100) + (item.text.length > 100 ? "..." : "");
  };

  // 删除引用
  const removeReference = async (index: number) => {
    // 从引用列表中删除
    referenceList.value.splice(index, 1);

    // 如果删除的是当前选中的引用，重置选中状态
    if (selectedReferenceIndex.value === index) {
      selectedReferenceIndex.value = -1;
      referenceInfo.value = null;
    } else if (selectedReferenceIndex.value > index) {
      // 如果删除的引用在选中引用之前，需要调整选中索引
      selectedReferenceIndex.value--;
    }

    // 更新系统消息中的引用内容
    updateSystemMessages();

    // 更新聊天历史
    const chat = chatHistory.value.find((c) => c.id === currentChatId.value);
    if (chat) {
      chat.messages = [...messages.value];
      chat.updatedAt = new Date();
      saveChatHistory();
    }

    // 保存引用列表到 storage
    await saveReferenceList();

    // 显示删除成功的提示
    success("引用已删除");
  };

  // 更新系统消息中的引用内容
  const updateSystemMessages = () => {
    // 如果引用列表为空，删除所有系统消息
    if (referenceList.value.length === 0) {
      messages.value = messages.value.filter((msg) => msg.role !== "system");
      systemMessage.value = null;
      return;
    }

    // 如果引用列表不为空，创建或更新系统消息
    systemMessage.value = {
      role: "system",
      content: systemPrompt.value,
      timestamp: new Date(),
    };

    // 检查是否已存在系统消息
    const existingSystemMessageIndex = messages.value.findIndex(
      (msg) => msg.role === "system"
    );

    if (existingSystemMessageIndex !== -1) {
      // 如果已存在系统消息，更新其内容
      messages.value[existingSystemMessageIndex] = systemMessage.value;
    } else {
      // 如果不存在系统消息，添加到消息列表的开头
      messages.value.unshift(systemMessage.value);
    }
  };

  return {
    // 状态
    messages,
    isChatLoading,
    currentChatId,
    chatHistory,
    referenceInfo,
    referenceList,
    referenceText,
    systemPrompt,
    systemMessage,
    showReferenceModal,
    showReferenceListModal,
    selectedReferenceIndex,
    currentModel,
    maxTokens,
    temperature,
    getReferencePreview,
    streamingContent,
    isStreaming,

    // 方法
    sendMessage,
    clearChat,
    saveChat,
    createNewChat,
    loadChat,
    deleteChat,
    updateChatTitle,
    exportChat,
    abortCurrentRequest,
    addReferenceToChat,
    showReferenceList,
    hideReferenceList,
    showReferenceDetail,
    hideReferenceDetail,
    getReferenceItemPreview,
    removeReference,
  };
}
