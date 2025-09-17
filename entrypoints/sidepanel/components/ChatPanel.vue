<template>
  <div class="chat-panel">
    <div class="chat-header">
      <h3>AI 对话</h3>
      <div class="chat-actions">
        <button
          class="btn btn-secondary"
          @click="clearChat"
          :disabled="isChatLoading"
        >
          清空对话
        </button>
        <button
          class="btn btn-secondary"
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
          显示引用
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
      <div
        v-for="(message, index) in filteredMessages"
        :key="index"
        :class="['message', message.role]"
      >
        <div class="message-avatar">
          {{ message.role === "user" ? "👤" : "🤖" }}
        </div>
        <div class="message-content">
          <div class="message-role">
            {{ message.role === "user" ? "User" : "AI" }}
          </div>
          <div
            class="message-text"
            v-if="message.role === 'user'"
            v-html="formatMessage(message.content)"
          ></div>
          <div
            class="message-text"
            v-else
            v-html="parseMarkdown(message.content)"
          ></div>
          <div class="message-time">{{ formatTime(message.timestamp) }}</div>
        </div>
      </div>

      <div v-if="isChatLoading" class="message assistant loading">
        <div class="message-avatar">🤖</div>
        <div class="message-content">
          <div class="message-role">AI</div>
          <div class="message-text">
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>

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
          @keydown.enter.prevent="handleEnterKey"
          :disabled="isChatLoading"
          rows="3"
          ref="inputTextarea"
        ></textarea>
      </div>
      <div class="input-info">
        <span>按 Enter 发送，Shift + Enter 换行</span>
      </div>
    </div>
  </div>

  <!-- 引用列表模态对话框 -->
  <div v-if="showReferenceListModal" class="modal-overlay" @click="hideReferenceList">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>引用列表</h3>
        <button class="modal-close" @click="hideReferenceList">&times;</button>
      </div>
      <div class="modal-body">
        <div v-if="referenceList.length > 0" class="reference-list">
          <div
            v-for="(item, index) in referenceList"
            :key="index"
            class="reference-list-item"
          >
            <div class="reference-item-content" @click="showReferenceDetail(index)">
              <div class="reference-item-title">{{ item.title || '无标题' }}</div>
              <div class="reference-item-url">{{ item.url || '无URL' }}</div>
              <div class="reference-item-preview">{{ getReferenceItemPreview(item) }}</div>
            </div>
            <button
              class="reference-item-delete"
              @click.stop="removeReference(index)"
              title="删除引用"
            >
              &times;
            </button>
          </div>
        </div>
        <div v-else class="no-reference">
          <p>暂无引用信息</p>
        </div>
      </div>
    </div>
  </div>

  <!-- 引用详情模态对话框 -->
  <div v-if="showReferenceModal" class="modal-overlay" @click="hideReferenceDetail">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>引用信息</h3>
        <button class="modal-close" @click="hideReferenceDetail">&times;</button>
      </div>
      <div class="modal-body">
        <div v-if="referenceInfo" class="reference-info">
          <div class="reference-section">
            <h4>标题</h4>
            <p>{{ referenceInfo.title || '无标题' }}</p>
          </div>
          <div class="reference-section">
            <h4>URL</h4>
            <p>{{ referenceInfo.url || '无URL' }}</p>
          </div>
          <div class="reference-section">
            <h4>主机</h4>
            <p>{{ referenceInfo.host || '无主机信息' }}</p>
          </div>
          <div class="reference-section">
            <h4>内容预览</h4>
            <p>{{ getReferencePreview }}</p>
          </div>
          <div class="reference-section" v-if="referenceInfo.wordCount">
            <h4>字数统计</h4>
            <p>{{ referenceInfo.wordCount }} 字</p>
          </div>
          <div class="reference-section" v-if="referenceInfo.extractedAt">
            <h4>提取时间</h4>
            <p>{{ new Date(referenceInfo.extractedAt).toLocaleString() }}</p>
          </div>
          <div class="reference-section" v-if="referenceInfo.url">
            <button
              class="btn btn-primary"
              @click="navigateToOriginalPage(referenceInfo.url)"
            >
              跳转到原文
            </button>
          </div>
        </div>
        <div v-else class="no-reference">
          <p>暂无引用信息</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, nextTick, watch, computed } from "vue";
import { marked } from "marked";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

const props = defineProps<{
  isChatLoading: boolean;
  messages: ChatMessage[];
  referenceInfo: any;
  referenceList: any[];
  showReferenceModal: boolean;
  showReferenceListModal: boolean;
  selectedReferenceIndex: number;
  getReferencePreview: string;
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
}>();

const userInput = ref("");
const messagesContainer = ref<HTMLElement | null>(null);
const inputTextarea = ref<HTMLTextAreaElement | null>(null);

// 解析 Markdown 内容
const parseMarkdown = (content: string): string => {
  try {
    // 使用 marked 的同步解析方式，参考 AISummaryPanel.vue
    return content ? (marked.parse(content, { async: false }) as string) : "";
  } catch (error) {
    console.error("Markdown parsing error:", error);
    return content;
  }
};

const sendMessage = () => {
  if (!userInput.value.trim() || props.isChatLoading) return;

  emit("send-message", userInput.value.trim());
  userInput.value = "";
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

// 跳转到原文页面
const navigateToOriginalPage = async (url: string) => {
  if (!url) return;
  
  try {
    // 获取当前所有打开的标签页
    const tabs = await browser.tabs.query({});
    
    // 检查是否已经有标签页打开了该URL
    const existingTab = tabs.find(tab => tab.url === url);
    
    if (existingTab && existingTab.id) {
      // 如果已存在，激活该标签页
      await browser.tabs.update(existingTab.id, { active: true });
      // 如果标签页在当前窗口，可能还需要切换到该标签页
      await browser.tabs.highlight({
        windowId: existingTab.windowId,
        tabs: existingTab.index
      });
    } else {
      // 如果不存在，打开新标签页
      await browser.tabs.create({ url });
    }
    
    // 关闭模态框
    hideReferenceDetail();
  } catch (error) {
    console.error('跳转到原文失败:', error);
    // 如果出错，尝试直接打开新标签页
    try {
      await browser.tabs.create({ url });
      hideReferenceDetail();
    } catch (fallbackError) {
      console.error('打开新标签页失败:', fallbackError);
    }
  }
};

// 获取引用列表项的预览文本
const getReferenceItemPreview = (item: any) => {
  if (!item.text) return "";
  return item.text.substring(0, 100) + (item.text.length > 100 ? "..." : "");
};

// 删除引用
const removeReference = (index: number) => {
  if (confirm('确定要删除这个引用吗？')) {
    emit("remove-reference", index);
  }
};

// 过滤掉系统消息，只显示用户和AI的消息
const filteredMessages = computed(() => {
  return props.messages.filter(message => message.role !== 'system');
});

const handleEnterKey = (event: KeyboardEvent) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
};

const formatMessage = (content: string): string => {
  // 简单的Markdown格式化
  return content
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");
};

const formatTime = (timestamp: Date): string => {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
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

onMounted(() => {
  // 聚焦到输入框
  if (inputTextarea.value) {
    inputTextarea.value.focus();
  }
  scrollToBottom();
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

.message {
  display: flex;
  margin-bottom: 15px;
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  margin-right: 12px;
  flex-shrink: 0;
}

.message.user .message-avatar {
  background: var(--primary-color);
  color: white;
}

.message.assistant .message-avatar {
  background: var(--accent-color);
  color: white;
}

.message-content {
  flex: 1;
}

.message-role {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--markdown-text-light);
}

.message-text {
  background: var(--section-bg);
  padding: 10px;
  border-radius: var(--border-radius);
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
}

.message.user .message-text {
  background: var(--primary-color);
  color: white;
}

.message-time {
  font-size: 11px;
  color: var(--markdown-text-light);
  margin-top: 4px;
}

.loading .message-text {
  padding: 15px 10px;
}

.typing-indicator {
  display: flex;
  gap: 4px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--markdown-text-light);
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%,
  60%,
  100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-10px);
  }
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
  resize: vertical;
  font-size: 14px;
  font-family: inherit;
  background: var(--section-bg);
  color: var(--text-color);
  min-height: 60px;
  max-height: 120px;
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

  .message-avatar {
    width: 30px;
    height: 30px;
    font-size: 14px;
  }

  .message-text {
    font-size: 13px;
  }
}

/* 模态对话框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--section-content-bg);
  border-radius: var(--border-radius);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--section-bg);
}

.modal-header h3 {
  margin: 0;
  color: var(--section-title-color);
  font-size: 18px;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-color);
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.modal-close:hover {
  background: var(--border-color);
}

.modal-body {
  padding: 20px;
  max-height: calc(80vh - 70px);
  overflow-y: auto;
}

.reference-section {
  margin-bottom: 20px;
}

.reference-section:last-child {
  margin-bottom: 0;
}

.reference-section h4 {
  margin: 0 0 8px 0;
  color: var(--section-title-color);
  font-size: 14px;
  font-weight: 600;
}

.reference-section p {
  margin: 0;
  color: var(--text-color);
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
}

.no-reference {
  text-align: center;
  color: var(--markdown-text-light);
  padding: 20px;
}

/* 引用列表样式 */
.reference-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reference-list-item {
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--section-bg);
}

.reference-list-item:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.reference-item-title {
  font-weight: 600;
  color: var(--section-title-color);
  margin-bottom: 4px;
  font-size: 14px;
}

.reference-item-url {
  color: var(--primary-color);
  font-size: 12px;
  margin-bottom: 8px;
  word-break: break-all;
}

.reference-item-preview {
  color: var(--text-color);
  font-size: 13px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
