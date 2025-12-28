<!--
  @component ChatPanel
  @description
    AI 对话面板组件，提供完整的聊天交互界面。
    支持消息发送、编辑、引用管理、对话历史等功能。

  @features
    - 消息发送与接收
    - 流式响应实时显示
    - 用户消息编辑（编辑后重新发送）
    - 添加/查看/删除网页引用
    - 清空对话
    - 保存对话到历史
    - 聊天历史侧边栏
    - 自动滚动到最新消息
    - 手动滚动时暂停自动滚动
    - 空状态提示
    - 消息编辑状态管理
    - 确认对话框（删除聊天等操作）

  @usage
    <ChatPanel />

  @events
    无直接事件，内部通过 useChat composable 处理所有逻辑

  @example
    <script setup>
    import ChatPanel from '@/components/ChatPanel.vue'
    </script>

    <template>
      <ChatPanel />
    </template>

  @see
    - MessageItem.vue - 消息项子组件
    - ReferenceList.vue - 引用列表模态框
    - ReferenceDetail.vue - 引用详情模态框
    - Confirm.vue - 确认对话框组件
    - composables/chat/index.ts - 聊天功能组合模块
-->

<template>
  <div class="chat-panel">
    <div class="chat-header">
      <div class="chat-actions">
        <button
          class="btn btn-primary"
          @click="addReference"
          :disabled="isChatLoading || isEditing"
        >
          添加引用
        </button>
        <button
          class="btn btn-secondary"
          @click="showReferenceList"
          :disabled="isChatLoading || isEditing || referenceList.length === 0"
        >
          查看引用
        </button>
        <button
          class="btn btn-secondary"
          :class="{ 'btn-disabled': filteredMessages.length === 0 }"
          @click="clearChat"
          :disabled="isChatLoading || isEditing || filteredMessages.length === 0"
        >
          清空对话
        </button>
        <button
          class="btn btn-primary"
          :class="{ 'btn-disabled': filteredMessages.length === 0 }"
          @click="saveChat"
          :disabled="isChatLoading || isEditing || filteredMessages.length === 0"
        >
          保存对话
        </button>
      </div>
    </div>

    <div
      class="chat-messages"
      ref="messagesContainer"
      @scroll="handleScroll"
      @wheel="handleWheel"
      @touchmove="handleTouchMove"
    >
      <MessageItem
        v-for="(message, index) in filteredMessages"
        :key="message.id || index"
        :message="message"
        :is-streaming="message.isStreaming"
        @stop-streaming="stopStreaming"
        @edit-message="handleEditMessage"
      />

      <div v-if="messages.length === 0 && !isChatLoading" class="empty-chat">
        <div class="empty-chat-icon">💬</div>
        <div class="empty-chat-text">开始与AI对话吧</div>
      </div>
    </div>

    <div class="chat-input">
      <div class="input-container">
        <textarea
          v-model="userInput"
          :placeholder="isEditing ? '正在编辑消息，请稍候...' : '输入您的问题...'"
          @keydown="handleKeyDown"
          @input="adjustTextareaHeight"
          :disabled="isChatLoading || isEditing"
          :rows="textareaRows"
          ref="inputTextarea"
        ></textarea>
      </div>
      <div class="input-info">
        <span>{{ isEditing ? '正在编辑消息...' : '按 Enter 发送，Shift + Enter 换行' }}</span>
      </div>
    </div>
  </div>

  <!-- 引用列表模态对话框 -->
  <ReferenceList
    :visible="modalState.showReferenceListModal"
    :reference-list="referenceList"
    @show-detail="showReferenceDetail"
    @remove-reference="removeReference"
    @update:visible="hideReferenceList"
  />

  <!-- 引用详情模态对话框 -->
  <ReferenceDetail
    :visible="modalState.showReferenceModal"
    :reference-info="referenceInfo"
    :reference-preview="referencePreview"
    @update:visible="hideReferenceDetail"
  />

  <!-- 确认对话框 -->
  <Confirm
    v-model:visible="showConfirmDialog"
    :title="confirmDialogTitle"
    :message="confirmDialogMessage"
    @confirm="handleConfirm"
    @cancel="handleCancel"
  />
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from "vue";
import { browser } from "wxt/browser";
import Confirm from "./Confirm.vue";
import MessageItem from "./MessageItem.vue";
import ReferenceList from "./ReferenceList.vue";
import ReferenceDetail from "./ReferenceDetail.vue";
import { useChat } from "../composables/chat";
import { useStores } from "../stores";
import { createLogger } from "../utils/logger";
import type { ExtractedData } from "../types";

// 创建日志器
const logger = createLogger("ChatPanel");

// 使用全局状态管理
const { dataStore, uiStore, settingsStore } = useStores();

// 使用聊天composable
const {
  messages,
  isChatLoading,
  referenceInfo,
  referenceList,
  referenceText,
  systemPrompt,
  systemMessage,
  streamingContent,
  isStreaming,
  sendMessage: sendChatMessage,
  clearChat: clearChatMessages,
  saveChat: saveChatMessages,
  createNewChat,
  loadChat,
  deleteChat,
  updateChatTitle,
  exportChat,
  abortCurrentRequest,
  modalState,
  referencePreview,
  addReference: addReferenceToChat,
  showReferenceList,
  hideReferenceList,
  showReferenceDetail,
  hideReferenceDetail,
  removeReference,
  editAndResendMessage,
} = useChat();

// 组件内部状态
const userInput = ref("");
const messagesContainer = ref<HTMLElement | null>(null);
const inputTextarea = ref<HTMLTextAreaElement | null>(null);
const textareaRows = ref(1);

// 编辑状态管理
const editingMessageId = ref<string | null>(null);
const isEditing = ref(false);

// 跟踪用户是否正在滚动，用于控制自动滚动行为
const isUserScrolling = ref(false);
// 保存上一次的滚动位置，用于检测用户滚动方向
const lastScrollPosition = ref(0);

// 保存原始标题和引用状态
const originalTitle = ref("");
const hasReferences = ref(false);
// 保存所有标签页的原始标题，以URL为键
const originalTitlesMap = ref<Record<string, string>>({});
// 跟踪哪些URL已经被添加了引用前缀，避免重复添加
const referencedUrlsMap = ref<Record<string, boolean>>({});
// 引用前缀常量
const REFERENCE_PREFIX = "[📌已引用] ";

// 确认对话框相关状态
const showConfirmDialog = ref(false);
const confirmDialogTitle = ref("确认");
const confirmDialogMessage = ref("确定要执行此操作吗？");
const pendingReferenceIndex = ref<number | null>(null);

// 从store获取数据
const extractedData = computed(() => dataStore.state.extractedData);

// 定义emit事件
const emit = defineEmits<{
  "add-reference": [];
}>();

// 设置标签页监听器
const setupTabListeners = () => {
  // 监听新标签页创建事件
  browser.tabs.onCreated.addListener(async (tab) => {
    console.log("新标签页创建:", tab);

    // 等待一小段时间确保标签页信息已经更新
    setTimeout(async () => {
      try {
        if (tab.url && tab.id) {
          // 检查新标签页的URL是否在引用列表中
          const isInReferenceList = isUrlInReferenceList(tab.url);

          // 获取更新后的标签页信息
          const updatedTab = await browser.tabs.get(tab.id);
          if (updatedTab && updatedTab.title) {
            // 保存原始标题（干净的标题，不包含前缀）
            if (!originalTitlesMap.value[tab.url]) {
              originalTitlesMap.value[tab.url] = getCleanTitle(
                updatedTab.title
              );
            }

            if (isInReferenceList) {
              console.log("新标签页URL匹配引用列表，将更新标题:", tab.url);

              // 添加前缀
              const newTitle = addReferencePrefix(
                originalTitlesMap.value[tab.url]
              );

              // 更新标签页标题
              if (newTitle !== updatedTab.title) {
                try {
                  await browser.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: (title: string) => {
                      document.title = title;
                    },
                    args: [newTitle],
                  });
                  console.log("新标签页标题已更新:", newTitle);
                } catch (error) {
                  console.error("更新新标签页标题失败:", error);
                }
              }
            } else {
              // 如果URL不在引用列表中，确保标题没有引用前缀
              const cleanTitle = getCleanTitle(updatedTab.title);
              if (cleanTitle !== updatedTab.title) {
                try {
                  await browser.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: (title: string) => {
                      document.title = title;
                    },
                    args: [cleanTitle],
                  });
                  console.log("新标签页标题已恢复为原始标题:", cleanTitle);
                } catch (error) {
                  console.error("恢复新标签页标题失败:", error);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("处理新标签页时出错:", error);
      }
    }, 500); // 等待500ms确保标签页加载完成
  });

  // 监听标签页更新事件（URL变化）
  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // 只处理URL变化且页面加载完成的情况
    if (changeInfo.status === "complete" && tab.url && tab.id) {
      console.log("标签页URL更新:", tab.url);

      // 检查更新后的URL是否在引用列表中
      const isInReferenceList = isUrlInReferenceList(tab.url);

      // 保存原始标题（干净的标题，不包含前缀）
      if (!originalTitlesMap.value[tab.url] && tab.title) {
        originalTitlesMap.value[tab.url] = getCleanTitle(tab.title);
      }

      if (isInReferenceList) {
        console.log("标签页URL更新后匹配引用列表，将更新标题:", tab.url);

        // 添加前缀
        const originalTitleForUrl =
          originalTitlesMap.value[tab.url] || getCleanTitle(tab.title || "");
        const newTitle = addReferencePrefix(originalTitleForUrl);

        // 更新标签页标题
        if (newTitle !== tab.title) {
          try {
            await browser.scripting.executeScript({
              target: { tabId: tab.id },
              func: (title: string) => {
                document.title = title;
              },
              args: [newTitle],
            });
            console.log("URL更新后标签页标题已更新:", newTitle);
          } catch (error) {
            console.error("URL更新后标签页标题更新失败:", error);
          }
        }
      } else {
        // 如果URL不在引用列表中，确保标题没有引用前缀
        const cleanTitle = getCleanTitle(tab.title || "");
        if (cleanTitle !== tab.title) {
          try {
            await browser.scripting.executeScript({
              target: { tabId: tab.id },
              func: (title: string) => {
                document.title = title;
              },
              args: [cleanTitle],
            });
            console.log("URL更新后标签页标题已恢复为原始标题:", cleanTitle);
          } catch (error) {
            console.error("URL更新后标签页标题恢复失败:", error);
          }
        }
      }
    }
  });
};

// 移除标签页监听器
const removeTabListeners = () => {
  browser.tabs.onCreated.removeListener(() => {});
  browser.tabs.onUpdated.removeListener(() => {});
};

// 检查URL是否匹配引用列表中的URL
const isUrlInReferenceList = (url: string): boolean => {
  if (!url || !referenceList.value.length) return false;

  return referenceList.value.some((item) => {
    if (!item.url) return false;

    // 只进行精确匹配，确保URL完全相同
    return url === item.url;
  });
};

// 更新引用URL状态映射
const updateReferencedUrlsMap = () => {
  // 重置映射
  referencedUrlsMap.value = {};

  // 根据当前引用列表更新映射
  referenceList.value.forEach((item) => {
    if (item.url) {
      referencedUrlsMap.value[item.url] = true;
    }
  });
};

// 获取干净的标题（移除引用前缀）
const getCleanTitle = (title: string): string => {
  if (!title) return title;

  // 处理可能存在的多种前缀格式
  let cleanTitle = title;

  // 移除标准前缀 "[📌已引用] "
  if (cleanTitle.startsWith(REFERENCE_PREFIX)) {
    cleanTitle = cleanTitle.substring(REFERENCE_PREFIX.length);
  }

  // 移除不带空格的前缀 "[📌已引用]"
  const prefixWithoutSpace = "[📌已引用]";
  if (cleanTitle.startsWith(prefixWithoutSpace)) {
    cleanTitle = cleanTitle.substring(prefixWithoutSpace.length);
    // 如果移除后开头有空格，也一并移除
    if (cleanTitle.startsWith(" ")) {
      cleanTitle = cleanTitle.substring(1);
    }
  }

  // 处理可能存在的前缀重复情况
  while (
    cleanTitle.startsWith(REFERENCE_PREFIX) ||
    cleanTitle.startsWith(prefixWithoutSpace)
  ) {
    if (cleanTitle.startsWith(REFERENCE_PREFIX)) {
      cleanTitle = cleanTitle.substring(REFERENCE_PREFIX.length);
    } else if (cleanTitle.startsWith(prefixWithoutSpace)) {
      cleanTitle = cleanTitle.substring(prefixWithoutSpace.length);
      if (cleanTitle.startsWith(" ")) {
        cleanTitle = cleanTitle.substring(1);
      }
    }
  }

  return cleanTitle;
};

// 添加引用前缀到标题
const addReferencePrefix = (title: string): string => {
  if (!title) return title;
  const cleanTitle = getCleanTitle(title);
  // 确保不会重复添加前缀
  if (cleanTitle.startsWith(REFERENCE_PREFIX)) {
    return cleanTitle; // 如果已经有前缀，直接返回
  }
  return REFERENCE_PREFIX + cleanTitle;
};

// 更新所有标签页标题
const updateAllTabTitles = async () => {
  try {
    // 更新引用URL状态映射
    updateReferencedUrlsMap();

    // 获取所有标签页
    const tabs = await browser.tabs.query({});

    if (!tabs || tabs.length === 0) return;

    // 遍历所有标签页
    for (const tab of tabs) {
      if (!tab.url || !tab.id) continue;

      // 检查该标签页URL是否在引用列表中
      const isInReferenceList = isUrlInReferenceList(tab.url);

      // 保存原始标题（如果是第一次遇到这个URL）
      if (!originalTitlesMap.value[tab.url] && tab.title) {
        originalTitlesMap.value[tab.url] = getCleanTitle(tab.title);
      }

      // 获取该URL的原始标题
      const originalTitleForUrl =
        originalTitlesMap.value[tab.url] || getCleanTitle(tab.title || "");

      // 决定新标题
      let newTitle = originalTitleForUrl;

      if (isInReferenceList && originalTitleForUrl) {
        // 如果URL在引用列表中且原始标题存在，添加前缀
        newTitle = addReferencePrefix(originalTitleForUrl);
      } else {
        // 如果URL不在引用列表中，使用原始标题（已经去除了前缀）
        newTitle = originalTitleForUrl;
      }

      // 使用脚本执行来修改标签页标题
      if (newTitle && newTitle !== tab.title) {
        try {
          await browser.scripting.executeScript({
            target: { tabId: tab.id },
            func: (title: string) => {
              document.title = title;
            },
            args: [newTitle],
          });
          console.log(`标签页 ${tab.id} 标题已更新为: ${newTitle}`);
        } catch (error) {
          console.error(`更新标签页 ${tab.id} 标题失败:`, error);
        }
      }
    }
  } catch (error) {
    console.error("更新所有标签页标题失败:", error);
  }
};

// 修改标签页标题（保留原函数名以兼容现有代码）
const updateTabTitle = async () => {
  await updateAllTabTitles();
};

// 调整文本域高度
const adjustTextareaHeight = () => {
  if (inputTextarea.value) {
    // 计算行数：基于换行符数量 + 1
    const lineCount = userInput.value.split("\n").length;
    // 限制在1-10行之间
    textareaRows.value = Math.min(Math.max(lineCount, 1), 10);

    // 强制重新渲染textarea
    nextTick(() => {
      if (inputTextarea.value) {
        // 重置高度为auto，然后设置新的行高
        inputTextarea.value.style.height = "auto";
        // 计算最大高度（10行 * 每行1.5em）
        const maxHeight =
          1.5 * 10 * parseFloat(getComputedStyle(inputTextarea.value).fontSize);
        // 让浏览器自然计算高度，但不超过最大高度
        const newHeight = Math.min(inputTextarea.value.scrollHeight, maxHeight);
        inputTextarea.value.style.height = newHeight + "px";

        // 检查是否需要显示滚动条
        if (inputTextarea.value.scrollHeight > maxHeight) {
          inputTextarea.value.classList.add("overflowing");
        } else {
          inputTextarea.value.classList.remove("overflowing");
        }
      }
    });
  }
};

const sendMessage = () => {
  if (!userInput.value.trim() || isChatLoading.value) return;

  sendChatMessage(userInput.value.trim());
  userInput.value = "";
  // 重置行高为1行
  textareaRows.value = 1;

  // 重置textarea的DOM样式高度
  nextTick(() => {
    if (inputTextarea.value) {
      inputTextarea.value.style.height = "auto";
    }
  });
};

const clearChat = () => {
  pendingReferenceIndex.value = -1; // 使用-1表示清空对话操作
  confirmDialogTitle.value = "清空对话";
  confirmDialogMessage.value = "确定要清空当前对话吗？";
  showConfirmDialog.value = true;
};

const saveChat = () => {
  saveChatMessages();
};

const addReference = () => {
  if (extractedData.value.text) {
    addReferenceToChat(extractedData.value);
  } else {
    uiStore.showToast("没有可引用的文本内容，请先提取数据", "warning");
  }
};

// 停止流式输出
const stopStreaming = () => {
  abortCurrentRequest();
};

// 处理消息编辑事件
const handleEditMessage = async (messageId: string, newContent: string) => {
  try {
    // 设置编辑状态
    editingMessageId.value = messageId;
    isEditing.value = true;
    
    // 显示编辑中的提示
    uiStore.showToast("正在编辑消息...", "info");
    
    // 调用编辑并重新发送消息的方法
    await editAndResendMessage(messageId, newContent);
    
    // 显示成功提示
    uiStore.showToast("消息已编辑并重新发送", "success");
  } catch (error) {
    console.error("编辑消息失败:", error);
    uiStore.showToast("编辑消息失败，请重试", "error");
  } finally {
    // 重置编辑状态
    editingMessageId.value = null;
    isEditing.value = false;
  }
};

// 删除引用
const deleteReference = (index: number) => {
  pendingReferenceIndex.value = index;
  confirmDialogTitle.value = "删除引用";
  confirmDialogMessage.value = "确定要删除这个引用吗？";
  showConfirmDialog.value = true;
};

// 处理确认对话框的确认操作
const handleConfirm = () => {
  if (pendingReferenceIndex.value === -1) {
    // 清空对话操作
    clearChatMessages();
    uiStore.showToast("对话已清空", "success");
  } else if (pendingReferenceIndex.value !== null) {
    // 删除引用操作
    removeReference(pendingReferenceIndex.value);
    uiStore.showToast("引用已删除", "success");
  }
  pendingReferenceIndex.value = null;
};

// 处理确认对话框的取消操作
const handleCancel = () => {
  pendingReferenceIndex.value = null;
};

// 过滤掉系统消息，只显示用户和AI的消息
const filteredMessages = computed(() => {
  const filtered = messages.value.filter(
    (message) => message.role !== "system"
  );
  logger.debug("ChatPanel: 过滤后的消息数量:", filtered.length);
  return filtered;
});

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === "Enter") {
    if (!event.shiftKey) {
      // 直接按 Enter，发送消息
      event.preventDefault();
      sendMessage();
    }
    // 如果是 Shift+Enter，不阻止默认行为，让浏览器自然处理换行
    // @input 事件会触发行高调整
  }
};

// 处理滚动事件
const handleScroll = () => {
  if (!messagesContainer.value) return;

  const container = messagesContainer.value;
  const currentScrollPosition = container.scrollTop;
  const scrollHeight = container.scrollHeight;
  const clientHeight = container.clientHeight;

  // 检查用户是否向上滚动
  if (currentScrollPosition < lastScrollPosition.value) {
    // 用户向上滚动，暂停自动滚动
    isUserScrolling.value = true;
  }

  // 检查用户是否滚动到底部
  const isAtBottom = scrollHeight - currentScrollPosition <= clientHeight + 5; // 5px的容差
  if (isAtBottom) {
    // 用户滚动到底部，恢复自动滚动
    isUserScrolling.value = false;
  }

  // 保存当前滚动位置
  lastScrollPosition.value = currentScrollPosition;
};

// 处理鼠标滚轮事件
const handleWheel = () => {
  // 用户使用滚轮，暂停自动滚动
  isUserScrolling.value = true;
};

// 处理触摸移动事件
const handleTouchMove = () => {
  // 用户触摸滚动，暂停自动滚动
  isUserScrolling.value = true;
};

// 自动滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value && !isUserScrolling.value) {
      const container = messagesContainer.value;
      const isAtBottom =
        container.scrollHeight - container.scrollTop <=
        container.clientHeight + 5;

      // 只有当用户没有滚动且容器已经在底部时才自动滚动
      if (!isUserScrolling.value || isAtBottom) {
        container.scrollTop = container.scrollHeight;
      }
    }
  });
};

// 重置用户滚动状态，用于下一次流式传输开始时
const resetUserScrolling = () => {
  isUserScrolling.value = false;
};

// 监听消息变化，自动滚动到底部
watch(
  () => messages.value,
  () => {
    // 如果是新的用户消息，重置用户滚动状态
    const lastMessage = messages.value[messages.value.length - 1];
    if (lastMessage && lastMessage.role === "user") {
      resetUserScrolling();
    }
    scrollToBottom();
  },
  { deep: true }
);

// 监听加载状态变化，自动滚动到底部
watch(
  () => isChatLoading.value,
  (newVal, oldVal) => {
    // 当开始加载时（开始流式传输），重置用户滚动状态
    if (oldVal === false && newVal === true) {
      resetUserScrolling();
    }

    scrollToBottom();

    // 当AI回复完成时，自动聚焦到输入框
    if (oldVal === true && newVal === false) {
      nextTick(() => {
        if (inputTextarea.value) {
          inputTextarea.value.focus();
        }
      });
    }
  }
);

// 监听引用列表变化
watch(
  () => referenceList.value,
  (newVal, oldVal) => {
    logger.debug(
      "ChatPanel: 引用列表发生变化，新数量:" +
        newVal.length +
        ", 旧数量:" +
        (oldVal?.length || 0)
    );

    // 更新引用状态
    hasReferences.value = newVal.length > 0;

    // 更新引用URL状态映射
    updateReferencedUrlsMap();

    // 更新所有标签页标题
    updateAllTabTitles();
  },
  { deep: true }
);

onMounted(async () => {
  // 聚焦到输入框
  if (inputTextarea.value) {
    inputTextarea.value.focus();
  }
  scrollToBottom();

  // 添加调试日志
  logger.debug(
    "ChatPanel onMounted: 引用列表数量:",
    referenceList.value.length
  );

  // 初始化引用状态和标题
  hasReferences.value = referenceList.value.length > 0;

  // 初始化引用URL状态映射
  updateReferencedUrlsMap();

  // 设置标签页监听器
  setupTabListeners();

  // 初始化所有标签页的标题
  try {
    // 获取所有标签页
    const tabs = await browser.tabs.query({});
    if (tabs && tabs.length > 0) {
      // 保存所有标签页的原始标题（干净的标题，不包含前缀）
      for (const tab of tabs) {
        if (tab.url && tab.title) {
          originalTitlesMap.value[tab.url] = getCleanTitle(tab.title);
        }
      }

      logger.debug(
        "ChatPanel onMounted: 已保存所有标签页原始标题，数量:",
        Object.keys(originalTitlesMap.value).length
      );

      // 如果已经有引用，更新所有相关标签页的标题
      if (hasReferences.value) {
        updateAllTabTitles();
      }
    }
  } catch (error) {
    console.error("初始化标签页标题失败:", error);
  }
});

// 在组件卸载时清理监听器
onUnmounted(() => {
  removeTabListeners();
});
</script>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--section-bg);
  border-radius: var(--border-radius);
  overflow: hidden;
  flex: 1;
  min-height: 0;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid var(--border-color);
  background: var(--section-content-bg);
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.chat-header h3 {
  margin: 0;
  color: var(--section-title-color);
  font-size: 16px;
  font-weight: 600;
}

.chat-actions {
  display: flex;
  flex-direction: row;
  gap: 8px;
}

.chat-messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 15px;
  background: var(--section-content-bg);
  display: flex;
  flex-direction: column;
  scroll-behavior: smooth;
  /* 自定义滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: var(--primary-color) var(--scrollbar-track);
}

/* Webkit 浏览器滚动条样式 */
.chat-messages::-webkit-scrollbar {
  width: 8px;
}

.chat-messages::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
  border-radius: 4px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: var(--primary-color);
  border-radius: 4px;
  transition: background 0.3s ease;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: var(--primary-color-hover);
}

.empty-chat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--markdown-text-light);
  background: var(--section-bg);
  border-radius: var(--border-radius);
  margin: 20px 0;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.empty-chat:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.empty-chat-icon {
  font-size: 48px;
  margin-bottom: 16px;
  animation: pulse 2s infinite;
}

.empty-chat-text {
  font-size: 16px;
  font-weight: 500;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.05);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0.8;
  }
}

.chat-input {
  padding: 15px;
  border-top: 1px solid var(--border-color);
  background: var(--section-content-bg);
  flex-shrink: 0;
  position: sticky;
  bottom: 0;
  z-index: 10;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
}

.input-container {
  display: flex;
  gap: 10px;
}

textarea {
  flex: 1;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  resize: none;
  font-size: 14px;
  font-family: inherit;
  background: var(--section-bg);
  color: var(--text-color);
  min-height: auto;
  max-height: calc(1.5em * 10); /* 10行高度，每行1.5em */
  line-height: 1.5;
  height: auto;
  overflow-y: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

/* 当内容超过最大高度时显示滚动条 */
textarea.overflowing {
  overflow-y: auto;
}

textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.2);
}

/* 自定义 textarea 滚动条样式 */
textarea::-webkit-scrollbar {
  width: 6px;
}

textarea::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
  border-radius: 3px;
}

textarea::-webkit-scrollbar-thumb {
  background: var(--primary-color);
  border-radius: 3px;
}

textarea::-webkit-scrollbar-thumb:hover {
  background: var(--primary-color-hover);
}

/* 确保按钮样式正确应用 */
.chat-actions .btn {
  padding: 8px 15px;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin: 2px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.chat-actions .btn-primary {
  background: var(--primary-color);
  color: white;
}

.chat-actions .btn-secondary {
  background: var(--accent-color);
  color: white;
}

.chat-actions .btn:hover {
  opacity: 0.9;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.chat-actions .btn:disabled,
.chat-actions .btn-disabled {
  background: #cccccc;
  color: #666666;
  cursor: not-allowed;
  opacity: 0.6;
  box-shadow: none;
}

.chat-actions .btn:disabled:hover,
.chat-actions .btn-disabled:hover {
  opacity: 0.6;
  transform: none;
  box-shadow: none;
}

/* 发送按钮使用全局 btn 样式，这里只需要添加特定布局调整 */
.input-container .btn-primary {
  height: fit-content;
  align-self: flex-end;
}

.input-info {
  margin-top: 8px;
  font-size: 12px;
  color: var(--markdown-text-light);
  text-align: right;
  transition: color 0.3s ease;
}

.input-info:hover {
  color: var(--primary-color);
}
</style>
