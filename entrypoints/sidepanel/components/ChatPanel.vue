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
        v-for="(message, index) in messages" 
        :key="index"
        :class="['message', message.role]"
      >
        <div class="message-avatar">
          {{ message.role === 'user' ? '👤' : '🤖' }}
        </div>
        <div class="message-content">
          <div class="message-role">{{ message.role === 'user' ? '用户' : 'AI' }}</div>
          <div class="message-text" v-html="formatMessage(message.content)"></div>
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
        <button 
          class="send-button"
          @click="sendMessage"
          :disabled="isChatLoading || !userInput.trim()"
        >
          发送
        </button>
      </div>
      <div class="input-info">
        <span>按 Enter 发送，Shift + Enter 换行</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, nextTick, watch } from 'vue';
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const props = defineProps<{
  isChatLoading: boolean;
  messages: ChatMessage[];
}>();

const emit = defineEmits<{
  'send-message': [message: string];
  'clear-chat': [];
  'save-chat': [];
}>();

const userInput = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const inputTextarea = ref<HTMLTextAreaElement | null>(null);

const sendMessage = () => {
  if (!userInput.value.trim() || props.isChatLoading) return;
  
  emit('send-message', userInput.value.trim());
  userInput.value = '';
};

const clearChat = () => {
  emit('clear-chat');
};

const saveChat = () => {
  emit('save-chat');
};

const handleEnterKey = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
};

const formatMessage = (content: string): string => {
  // 简单的Markdown格式化
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
};

const formatTime = (timestamp: Date): string => {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
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
watch(() => props.messages, () => {
  scrollToBottom();
}, { deep: true });

// 监听加载状态变化，自动滚动到底部
watch(() => props.isChatLoading, () => {
  scrollToBottom();
});

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
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid var(--border-color);
  background: var(--section-content-bg);
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
  overflow-y: auto;
  padding: 15px;
  background: var(--section-content-bg);
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
  0%, 60%, 100% {
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

.send-button {
  padding: 10px 20px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-weight: 600;
  height: fit-content;
  align-self: flex-end;
}

.send-button:hover:not(:disabled) {
  opacity: 0.9;
}

.send-button:disabled {
  background: var(--disabled-color);
  cursor: not-allowed;
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
    height: calc(100vh - 200px);
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
</style>