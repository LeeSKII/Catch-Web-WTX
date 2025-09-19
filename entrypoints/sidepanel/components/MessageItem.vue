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
          ⏹️
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

.message-role .stop-btn {
  margin-left: 8px;
}

.stop-btn {
  background: linear-gradient(135deg, #ff6b6b, #ff4757);
  border: none;
  color: white;
  cursor: pointer;
  font-size: 16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(255, 71, 87, 0.3);
  position: relative;
  overflow: hidden;
}

.stop-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.1);
  transform: translateX(-100%);
  transition: transform 0.3s ease;
}

.stop-btn:hover {
  box-shadow: 0 6px 16px rgba(255, 71, 87, 0.4);
  transform: translateY(-2px);
}

.stop-btn:hover::before {
  transform: translateX(100%);
}

.stop-btn:active {
  transform: translateY(0) scale(0.95);
  box-shadow: 0 2px 8px rgba(255, 71, 87, 0.2);
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
}
</style>