<template>
  <div
    :class="['message', message.role, { 'streaming': isStreaming }]"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <div class="message-header">
      <div class="message-avatar">
        {{ message.role === "user" ? "👤" : "🤖" }}
      </div>
      <div class="message-role">
        {{ message.role === "user" ? "User" : "AI" }}
        <button
          v-if="isStreaming"
          :class="['stop-btn', { 'streaming': isStreaming }]"
          @click="$emit('stop-streaming')"
          title="停止生成"
        >
          ⏹️
        </button>
      </div>
    </div>
    <div class="message-content">
      <!-- 编辑模式 -->
      <div v-if="isEditing" class="message-editor-container">
        <textarea
          v-model="editContent"
          class="message-edit-textarea"
          :rows="textareaRows"
          @input="adjustTextareaHeight"
          @keydown="handleKeyDown"
          ref="editTextarea"
          placeholder="编辑消息..."
        ></textarea>
        <div class="edit-actions">
          <button
            class="btn btn-save"
            @click="saveEdit"
            :disabled="!editContent.trim()"
          >
            保存
          </button>
          <button
            class="btn btn-cancel"
            @click="cancelEdit"
          >
            取消
          </button>
        </div>
      </div>
      
      <!-- 正常显示模式 -->
      <template v-else>
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
        
        <!-- 编辑按钮 - 仅在用户消息且hover时显示 -->
        <button
          v-if="message.role === 'user' && isHovered && !isStreaming"
          class="edit-btn"
          @click="startEdit"
          title="编辑消息"
        >
          ✏️
        </button>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, nextTick, onMounted, onUnmounted } from "vue";
import { marked } from "marked";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  isStreaming?: boolean; // 标记消息是否正在流式传输中
  id?: string; // 消息唯一标识
}

const props = defineProps<{
  message: ChatMessage;
  isStreaming?: boolean;
}>();

const emit = defineEmits<{
  "stop-streaming": [];
  "edit-message": [messageId: string, newContent: string];
}>();

// 编辑相关状态
const isHovered = ref(false);
const isEditing = ref(false);
const editContent = ref("");
const textareaRows = ref(1);
const editTextarea = ref<HTMLTextAreaElement | null>(null);

// 开始编辑
const startEdit = () => {
  isEditing.value = true;
  editContent.value = props.message.content;
  textareaRows.value = Math.max(1, props.message.content.split('\n').length);
  
  // 下一个tick聚焦到textarea
  nextTick(() => {
    if (editTextarea.value) {
      editTextarea.value.focus();
      // 将光标移动到末尾
      editTextarea.value.selectionStart = editTextarea.value.selectionEnd = editContent.value.length;
    }
  });
};

// 保存编辑
const saveEdit = () => {
  if (!editContent.value.trim()) return;
  
  // 发送编辑事件
  emit("edit-message", props.message.id || Date.now().toString(), editContent.value.trim());
  
  // 退出编辑模式
  isEditing.value = false;
  editContent.value = "";
};

// 取消编辑
const cancelEdit = () => {
  isEditing.value = false;
  editContent.value = "";
};

// 调整文本域高度
const adjustTextareaHeight = () => {
  if (editTextarea.value) {
    // 计算行数：基于换行符数量 + 1
    const lineCount = editContent.value.split("\n").length;
    // 限制在1-10行之间
    textareaRows.value = Math.min(Math.max(lineCount, 1), 10);

    // 强制重新渲染textarea
    nextTick(() => {
      if (editTextarea.value) {
        // 重置高度为auto，然后设置新的行高
        editTextarea.value.style.height = "auto";
        // 计算最大高度（10行 * 每行1.5em）
        const maxHeight = 1.5 * 10 * parseFloat(getComputedStyle(editTextarea.value).fontSize);
        // 让浏览器自然计算高度，但不超过最大高度
        const newHeight = Math.min(editTextarea.value.scrollHeight, maxHeight);
        editTextarea.value.style.height = newHeight + "px";
      }
    });
  }
};

// 处理键盘事件
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === "Enter" && event.ctrlKey) {
    // Ctrl+Enter 保存
    event.preventDefault();
    saveEdit();
  } else if (event.key === "Escape") {
    // Esc 取消
    event.preventDefault();
    cancelEdit();
  }
};

// 点击外部取消编辑
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node;
  const messageElement = (event.currentTarget as HTMLElement)?.closest('.message');
  
  if (isEditing.value && messageElement && !messageElement.contains(target)) {
    cancelEdit();
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

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
  flex-direction: column;
  margin-bottom: 15px;
}

.message.assistant {
  align-items: flex-end;
}

.message.assistant .message-header {
  flex-direction: row-reverse;
}

.message.assistant .message-avatar {
  margin-right: 0;
  margin-left: 12px;
}

.message.assistant .message-content {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;
  margin: 0 12px;
}

.message.assistant .message-text {
  background: #f0f4f8;
  color: #2c3e50;
  border-radius: 16px 4px 16px 16px;
  width: fit-content; /* 改为fit-content，根据内容自适应宽度 */
  max-width: 100%; /* 最大宽度不超过父容器 */
  text-align: left;
  border: 1px solid #e1e8ed;
}

/* 暗色模式下的AI消息样式 */
[data-theme="dark"] .message.assistant .message-text {
  background: #4a5568;
  color: #f7fafc;
  border: 1px solid #718096;
}

.message.user .message-text {
  border-radius: 4px 16px 16px 16px;
  text-align: left;
}

.message-header {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
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
  display: flex;
  flex-direction: column;
  margin: 0 12px;
  max-width: calc(100% - 20px); /* 减去头像和边距的宽度 */
}

.message.user .message-content {
  align-items: flex-start;
}

.message.assistant .message-content {
  align-items: flex-end;
}

.message-role {
  font-size: 12px;
  font-weight: 600;
  color: var(--markdown-text-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex: 1;
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
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(255, 71, 87, 0.3);
  position: relative;
  overflow: hidden;
  outline: none;
}

.stop-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.2);
  transform: translateX(-100%);
  transition: transform 0.4s ease;
}

.stop-btn:hover {
  box-shadow: 0 6px 16px rgba(255, 71, 87, 0.4);
  transform: translateY(-2px) scale(1.05);
}

.stop-btn:hover::before {
  transform: translateX(100%);
}

.stop-btn:active {
  transform: translateY(0) scale(0.95);
  box-shadow: 0 2px 8px rgba(255, 71, 87, 0.2);
}

.stop-btn:focus {
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.4);
  outline: none;
}

/* 添加脉冲动画效果 */
.stop-btn.streaming {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 71, 87, 0.4);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(255, 71, 87, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 71, 87, 0);
  }
}

.message-text {
  background: var(--section-bg);
  padding: 10px 14px;
  border-radius: var(--border-radius);
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
  width: fit-content; /* 改为fit-content，根据内容自适应宽度 */
  max-width: 100%; /* 最大宽度不超过父容器 */
  min-width: 20%; /* 添加最小宽度，确保消息框不会太窄 */
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

/* 编辑按钮样式 */
.edit-btn {
  position: absolute;
  bottom: 5px;
  right: 5px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  font-size: 12px;
  cursor: pointer;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 10;
}

.message:hover .edit-btn {
  opacity: 1;
  transform: scale(1);
}

.edit-btn:hover {
  background: var(--primary-color-hover);
  transform: scale(1.1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.edit-btn:active {
  transform: scale(0.95);
}

/* 编辑模式容器 */
.message-editor-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 编辑文本框样式 */
.message-edit-textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  font-size: 14px;
  font-family: inherit;
  background: var(--section-bg);
  color: var(--text-color);
  min-height: auto;
  max-height: calc(1.5em * 10); /* 10行高度，每行1.5em */
  line-height: 1.5;
  height: auto;
  overflow-y: hidden;
  resize: none;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.message-edit-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.2);
}

/* 编辑操作按钮容器 */
.edit-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.edit-actions .btn {
  padding: 6px 12px;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.edit-actions .btn-save {
  background: var(--primary-color);
  color: white;
}

.edit-actions .btn-save:hover:not(:disabled) {
  background: var(--primary-color-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.edit-actions .btn-cancel {
  background: var(--accent-color);
  color: white;
}

.edit-actions .btn-cancel:hover {
  background: var(--accent-color-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.edit-actions .btn:disabled {
  background: #cccccc;
  color: #666666;
  cursor: not-allowed;
  opacity: 0.6;
  box-shadow: none;
}

/* 用户消息内容区域相对定位，用于编辑按钮的绝对定位 */
.message.user .message-content {
  position: relative;
}
</style>