import { ref, reactive, onMounted, computed } from "vue";
import { browser } from "wxt/browser";
import { createLogger } from "../utils/logger";
import { useToast } from "./useToast";
import { useSettings } from "./useSettings";
import { useAbortController } from "./useAbortController";
import OpenAI from "openai";
import { API_CONFIG } from "../constants";
import { ExtractedData } from "../types";

const logger = createLogger("Chat");
const { success, error, warning, info } = useToast();
const { settings } = useSettings();
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
  // 使用全局设置
  const currentModel = computed(() => settings.aiModel || "qwen-turbo");
  const maxTokens = computed(() => 8000); // 固定值，可根据需要调整
  const temperature = computed(() => 0.7); // 固定值，可根据需要调整

  // 初始化
  onMounted(async () => {
    await loadChatHistory();
  });

  /**
   * 加载聊天历史
   */
  const loadChatHistory = async () => {
    try {
      const result = await browser.storage.local.get(["chatHistory"]);
      if (result.chatHistory) {
        chatHistory.value = result.chatHistory.map((chat: any) => ({
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
      await browser.storage.local.set({
        chatHistory: chatHistory.value,
      });
    } catch (err) {
      logger.error("保存聊天历史失败", err);
    }
  };

  /**
   * 创建新聊天
   */
  const createNewChat = () => {
    const chatId = Date.now().toString();
    currentChatId.value = chatId;
    messages.value = [];

    const newChat: ChatHistory = {
      id: chatId,
      title: "新对话",
      messages: [],
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
    messages: Array<{ role: string; content: string }>
  ) => {
    // 创建AbortController用于聊天请求
    const abortController = createAbortController("chat");

    try {
      // 初始化OpenAI客户端
      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: baseUrl,
        dangerouslyAllowBrowser: true, // 允许在浏览器中使用
      });

      // 检查请求是否被中止
      if (abortController.signal.aborted) {
        logger.debug("聊天请求被中止");
        return { success: false, message: "请求被中止" };
      }

      // 创建流式请求
      const stream = await openai.chat.completions.create({
        model: currentModel.value,
        messages: messages as any,
        stream: true,
        max_tokens: maxTokens.value,
        temperature: temperature.value,
      });

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
        }
      }

      return { success: true, content: accumulatedContent };
    } catch (error) {
      // 检查是否是中止错误
      if (error instanceof Error && error.name === "AbortError") {
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

    try {
      // 获取API密钥和baseUrl
      const apiKey = settings.openaiApiKey;
      const baseUrl = settings.openaiBaseUrl || API_CONFIG.DEFAULT_BASE_URL;

      if (!apiKey) {
        throw new Error("请先在设置中配置OpenAI API密钥");
      }

      logger.debug("使用API配置", {
        model: currentModel.value,
        baseUrl: baseUrl,
        maxTokens: maxTokens.value,
        temperature: temperature.value,
      });

      // 准备消息历史
      const messageHistory = messages.value.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // 调用OpenAI API
      const result = await callOpenAI(apiKey, baseUrl, messageHistory);

      if (result.success && result.content) {
        // 添加AI回复
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: result.content,
          timestamp: new Date(),
        };

        messages.value.push(assistantMessage);

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
        throw new Error(result.message || "发送消息失败");
      }
    } catch (err: any) {
      logger.error("发送消息失败", err);

      // 如果是取消请求的错误，不显示错误提示
      if (err.name === "AbortError") {
        info("请求已取消");
      } else {
        error(err.message || "发送消息失败，请重试");
      }

      // 移除用户消息
      messages.value = messages.value.filter((msg) => msg !== userMessage);
    } finally {
      isChatLoading.value = false;
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
      messages.value = [];

      // 更新聊天历史
      const chat = chatHistory.value.find((c) => c.id === currentChatId.value);
      if (chat) {
        chat.messages = [];
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
  };

  // 添加引用到聊天上下文
  const addReferenceToChat = (referenceTextParam: string, extractedData?: ExtractedData): boolean => {
    if (!referenceTextParam.trim()) return false;

    // 检查是否已经存在相同URL的引用
    if (extractedData && extractedData.url) {
      const isDuplicate = referenceList.value.some(item => item.url === extractedData.url);
      if (isDuplicate) {
        warning("该网页引用已经存在，请勿重复添加");
        return false;
      }
    }

    // 如果没有当前聊天，创建新聊天
    if (!currentChatId.value) {
      createNewChat();
    }

    // 保存引用信息到列表
    if (extractedData) {
      referenceList.value.push(extractedData);
      referenceInfo.value = extractedData;
    }

    // 创建系统消息，使用动态生成的引用文本
    const systemMessage: ChatMessage = {
      role: "system",
      content: referenceText.value,
      timestamp: new Date(),
    };

    // 将系统消息添加到消息列表的开头
    messages.value.unshift(systemMessage);

    // 更新聊天历史
    const chat = chatHistory.value.find((c) => c.id === currentChatId.value);
    if (chat) {
      chat.messages = [...messages.value];
      chat.updatedAt = new Date();
      saveChatHistory();
    }
    
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
    return referenceInfo.value.text.substring(0, 200) + (referenceInfo.value.text.length > 200 ? "..." : "");
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

  // 获取引用列表项的预览文本
  const getReferenceItemPreview = (item: ExtractedData) => {
    if (!item.text) return "";
    return item.text.substring(0, 100) + (item.text.length > 100 ? "..." : "");
  };

  // 删除引用
  const removeReference = (index: number) => {
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
    
    // 显示删除成功的提示
    success("引用已删除");
  };

  // 更新系统消息中的引用内容
  const updateSystemMessages = () => {
    // 找到所有的系统消息
    const systemMessages = messages.value.filter(msg => msg.role === 'system');
    
    if (systemMessages.length === 0) return;
    
    // 如果引用列表为空，删除所有系统消息
    if (referenceList.value.length === 0) {
      messages.value = messages.value.filter(msg => msg.role !== 'system');
      return;
    }
    
    // 使用 referenceText 计算属性更新系统消息内容
    const firstSystemMessage = systemMessages[0];
    if (firstSystemMessage) {
      firstSystemMessage.content = referenceText.value;
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
    showReferenceModal,
    showReferenceListModal,
    selectedReferenceIndex,
    currentModel,
    maxTokens,
    temperature,
    getReferencePreview,

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
