<template>
  <div :class="['message', message.role, { 'streaming': isStreaming }]">
    <div class="message-avatar">
      {{ message.role === "user" ? "👤" : "🤖" }}
    </div>
    <div class="message-content">
      <div class="message-role">
        {{ message.role === "user" ? "User" : "AI" }}
        <button
          v-if="isStreaming"
          class="stop-btn"
          @click="$emit('stop-streaming')"
          title="停止生成"
        >
          ■
        </button>
      </div>
      <div
        class="message-text"
        v-if="message.role === 'user'"
        v-html="formatMessage(message.content)"
      ></div>
      <div
        v-else-if="message.role === 'assistant'"
        class="message-text"
        v-html="parseMarkdown(message.content)"
      ></div>
      <div
        v-else-if="isStreaming && !message.content"
        class="message-text typing-indicator"
      >
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div class="message-time">{{ formatTime(message.timestamp) }}</div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { marked } from "marked";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  isStreaming?: boolean; // 标记消息是否正在流式传输中
}

const props = defineProps<{
  message: ChatMessage;
  isStreaming?: boolean;
}>();

const emit = defineEmits<{
  "stop-streaming": [];
}>();

// 简单的Markdown格式化
const formatMessage = (content: string): string => {
  // 简单的Markdown格式化
  return content
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");
};

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

// 调试日志：组件挂载和更新时的消息状态
console.log("MessageItem: 渲染消息", {
  role: props.message.role,
  contentLength: props.message.content?.length || 0,
  isStreaming: props.isStreaming,
  timestamp: props.message.timestamp
});

const formatTime = (timestamp: Date): string => {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
};
</script>

<style scoped>
.message {
  display: flex;
  margin-bottom: 15px;
  animation: fadeIn 0.3s ease-in;
}

.message.streaming {
  animation: pulse 2s infinite;
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

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
  100% {
    opacity: 1;
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
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stop-btn {
  background: none;
  border: none;
  color: var(--error-color, #ff4757);
  cursor: pointer;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.stop-btn:hover {
  background: rgba(255, 71, 87, 0.1);
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

/* 响应式设计 */
@media (max-width: 600px) {
  .message-avatar {
    width: 30px;
    height: 30px;
    font-size: 14px;
  }

  .message-text {
    font-size: 13px;
  }
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
</style>