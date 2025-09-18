<template>
  <div :class="['message', message.role]">
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
</template>

<script lang="ts" setup>
import { marked } from "marked";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

const props = defineProps<{
  message: ChatMessage;
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
</style>