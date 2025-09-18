<template>
  <div class="chat-panel">
    <div class="chat-header">
      <h3>AI 对话</h3>
      <div class="chat-actions">
        <button
          class="btn btn-primary"
          @click="addReference"
          :disabled="isChatLoading"
        >
          添加引用
        </button>
        <button
          class="btn btn-secondary"
          @click="showReferenceList"
          :disabled="isChatLoading || referenceList.length === 0"
        >
          查看引用
        </button>
        <button
          class="btn btn-secondary"
          @click="clearChat"
          :disabled="isChatLoading"
        >
          清空对话
        </button>
        <button
          class="btn btn-primary"
          @click="saveChat"
          :disabled="isChatLoading || messages.length === 0"
        >
          保存对话
        </button>
      </div>
    </div>

    <div class="chat-messages" ref="messagesContainer">
      <MessageItem
        v-for="(message, index) in filteredMessages"
        :key="index"
        :message="message"
        :is-streaming="message.isStreaming"
        @stop-streaming="stopStreaming"
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
          placeholder="输入您的问题..."
          @keydown="handleKeyDown"
          @input="adjustTextareaHeight"
          :disabled="isChatLoading"
          :rows="textareaRows"
          ref="inputTextarea"
        ></textarea>
      </div>
      <div class="input-info">
        <span>按 Enter 发送，Shift + Enter 换行</span>
      </div>
    </div>
  </div>

  <!-- 引用列表模态对话框 -->
  <ReferenceList
    :visible="showReferenceListModal"
    :reference-list="referenceList"
    @show-detail="showReferenceDetail"
    @remove-reference="removeReference"
    @update:visible="hideReferenceList"
  />

  <!-- 引用详情模态对话框 -->
  <ReferenceDetail
    :visible="showReferenceModal"
    :reference-info="referenceInfo"
    :reference-preview="getReferencePreview"
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
import { marked } from 'marked';
import Confirm from "./Confirm.vue";
import MessageItem from "./MessageItem.vue";
import ReferenceList from "./ReferenceList.vue";
import ReferenceDetail from "./ReferenceDetail.vue";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  isStreaming?: boolean; // 标记消息是否正在流式传输中
}

const props = defineProps<{
  isChatLoading: boolean;
  messages: ChatMessage[];
  referenceInfo: any;
  referenceList: any[];
  referenceText: string;
  systemPrompt: string;
  showReferenceModal: boolean;
  showReferenceListModal: boolean;
  selectedReferenceIndex: number;
  getReferencePreview: string;
  streamingContent: string;
  isStreaming: boolean;
}>();

const emit = defineEmits<{
  "send-message": [message: string];
  "clear-chat": [];
  "save-chat": [];
  "add-reference": [];
  "show-reference-list": [];
  "hide-reference-list": [];
  "show-reference-detail": [index: number];
  "hide-reference-detail": [];
  "remove-reference": [index: number];
  "abort-current-request": [];
}>();

const userInput = ref("");
const messagesContainer = ref<HTMLElement | null>(null);
const inputTextarea = ref<HTMLTextAreaElement | null>(null);
const textareaRows = ref(1);

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

          if (isInReferenceList) {
            console.log("新标签页URL匹配引用列表，将更新标题:", tab.url);

            // 获取更新后的标签页信息
            const updatedTab = await browser.tabs.get(tab.id);
            if (updatedTab && updatedTab.title) {
              // 保存原始标题（干净的标题，不包含前缀）
              if (!originalTitlesMap.value[tab.url]) {
                originalTitlesMap.value[tab.url] = getCleanTitle(updatedTab.title);
              }

              // 添加前缀
              const newTitle = addReferencePrefix(originalTitlesMap.value[tab.url]);

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

      if (isInReferenceList) {
        console.log("标签页URL更新后匹配引用列表，将更新标题:", tab.url);

        // 保存原始标题（干净的标题，不包含前缀）
        if (!originalTitlesMap.value[tab.url] && tab.title) {
          originalTitlesMap.value[tab.url] = getCleanTitle(tab.title);
        }

        // 添加前缀
        const originalTitleForUrl = originalTitlesMap.value[tab.url] || getCleanTitle(tab.title || "");
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
        // 如果URL不在引用列表中，检查是否需要恢复原始标题
        const originalTitleForUrl = originalTitlesMap.value[tab.url];
        if (originalTitleForUrl) {
          const newTitle = originalTitleForUrl; // 使用保存的干净标题

          if (newTitle !== tab.title) {
            try {
              await browser.scripting.executeScript({
                target: { tabId: tab.id },
                func: (title: string) => {
                  document.title = title;
                },
                args: [newTitle],
              });
              console.log("URL更新后标签页标题已恢复:", newTitle);
            } catch (error) {
              console.error("URL更新后标签页标题恢复失败:", error);
            }
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
  if (!url || !props.referenceList.length) return false;

  return props.referenceList.some((item) => {
    if (!item.url) return false;

    // 尝试精确匹配
    if (url === item.url) return true;

    // 尝试标准化URL后匹配（去除末尾斜杠）
    const normalizedUrl = url.endsWith("/") ? url.slice(0, -1) : url;
    const normalizedItemUrl = item.url.endsWith("/")
      ? item.url.slice(0, -1)
      : item.url;
    if (normalizedUrl === normalizedItemUrl) return true;

    // 尝试匹配URL对象
    try {
      const urlObj = new URL(url);
      const itemUrlObj = new URL(item.url);

      // 比较协议、主机名和路径
      return (
        urlObj.protocol === itemUrlObj.protocol &&
        urlObj.hostname === itemUrlObj.hostname &&
        urlObj.pathname === itemUrlObj.pathname
      );
    } catch {
      return false;
    }
  });
};

// 更新引用URL状态映射
const updateReferencedUrlsMap = () => {
  // 重置映射
  referencedUrlsMap.value = {};
  
  // 根据当前引用列表更新映射
  props.referenceList.forEach(item => {
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
  
  return cleanTitle;
};

// 添加引用前缀到标题
const addReferencePrefix = (title: string): string => {
  if (!title) return title;
  const cleanTitle = getCleanTitle(title);
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
  if (!userInput.value.trim() || props.isChatLoading) return;

  emit("send-message", userInput.value.trim());
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
  emit("clear-chat");
};

const saveChat = () => {
  emit("save-chat");
};

const addReference = () => {
  emit("add-reference");
};

const showReferenceList = () => {
  emit("show-reference-list");
};

const hideReferenceList = () => {
  emit("hide-reference-list");
};

const showReferenceDetail = (index: number) => {
  emit("show-reference-detail", index);
};

const hideReferenceDetail = () => {
  emit("hide-reference-detail");
};

// 停止流式输出
const stopStreaming = () => {
  emit("abort-current-request");
};

// 删除引用
const removeReference = (index: number) => {
  pendingReferenceIndex.value = index;
  confirmDialogTitle.value = "删除引用";
  confirmDialogMessage.value = "确定要删除这个引用吗？";
  showConfirmDialog.value = true;
};

// 处理确认对话框的确认操作
const handleConfirm = () => {
  if (pendingReferenceIndex.value !== null) {
    emit("remove-reference", pendingReferenceIndex.value);
    pendingReferenceIndex.value = null;
  }
};

// 处理确认对话框的取消操作
const handleCancel = () => {
  pendingReferenceIndex.value = null;
};

// 过滤掉系统消息，只显示用户和AI的消息
const filteredMessages = computed(() => {
  const filtered = props.messages.filter((message) => message.role !== "system");
  console.log("ChatPanel: 过滤后的消息数量:", filtered.length);
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

// 自动滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

// 监听消息变化，自动滚动到底部
watch(
  () => props.messages,
  () => {
    scrollToBottom();
  },
  { deep: true }
);

// 监听加载状态变化，自动滚动到底部
watch(
  () => props.isChatLoading,
  (newVal, oldVal) => {
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
  () => props.referenceList,
  (newVal, oldVal) => {
    console.log(
      "ChatPanel: 引用列表发生变化，新数量:",
      newVal.length,
      "旧数量:",
      oldVal?.length
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
  console.log("ChatPanel onMounted: 引用列表数量:", props.referenceList.length);

  // 初始化引用状态和标题
  hasReferences.value = props.referenceList.length > 0;

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

      console.log(
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
}

.chat-header h3 {
  margin: 0;
  color: var(--section-title-color);
  font-size: 16px;
}

.chat-actions {
  display: flex;
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
}




.empty-chat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--markdown-text-light);
}

.empty-chat-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-chat-text {
  font-size: 16px;
}

.chat-input {
  padding: 15px;
  border-top: 1px solid var(--border-color);
  background: var(--section-content-bg);
  flex-shrink: 0;
  position: sticky;
  bottom: 0;
  z-index: 10;
}

.input-container {
  display: flex;
  gap: 10px;
}

textarea {
  flex: 1;
  padding: 10px;
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
}

/* 当内容超过最大高度时显示滚动条 */
textarea.overflowing {
  overflow-y: auto;
}

textarea:focus {
  outline: none;
  border-color: var(--primary-color);
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
}

.chat-actions .btn:disabled {
  background: #cccccc;
  color: #666666;
  cursor: not-allowed;
  opacity: 0.6;
}

.chat-actions .btn:disabled:hover {
  opacity: 0.6;
  transform: none;
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
}

/* 响应式设计 */
@media (max-width: 600px) {
  .chat-panel {
    height: 100%;
  }
}
</style>
