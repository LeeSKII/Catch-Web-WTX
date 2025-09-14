<template>
  <div>
    <div class="section">
      <div class="section-title">
        <span>AI总结选项</span>
      </div>

      <div style="display: flex; gap: 10px; margin-bottom: 15px">
        <label style="flex: 1; text-align: center; margin: 0">
          <input type="radio" :value="'full'" v-model="aiSummaryType" /> 全文总结
        </label>
        <label style="flex: 1; text-align: center; margin: 0">
          <input type="radio" :value="'keyinfo'" v-model="aiSummaryType" />
          关键信息
        </label>
      </div>

      <div style="display: flex; gap: 10px">
        <button
          class="btn btn-primary"
          style="flex: 1"
          @click="$emit('generate-ai-summary')"
          :disabled="isLoadingAISummary || isExtracting"
        >
          <span v-if="isLoadingAISummary">生成中...</span>
          <span v-else>AI总结</span>
        </button>
      </div>
    </div>

    <div class="section">
      <div class="section-title">
        <span>AI总结结果</span>
        <div>
          <button class="btn btn-secondary" @click="$emit('copy-summary')">
            复制
          </button>
          <button class="btn btn-warning" @click="$emit('clear-cache')">
            清除缓存
          </button>
        </div>
      </div>
      <div class="section-content">
        <div
          v-if="aiSummaryContent"
          id="streaming-content"
          v-html="parsedMarkdown"
        ></div>
        <div
          v-else
          style="
            text-align: center;
            color: var(--markdown-text-light);
            padding: 20px;
          "
        >
          点击"AI总结"按钮开始生成网页内容总结
        </div>
      </div>
      <!-- 缓存状态和生成时间显示区域 -->
      <div
        v-if="aiSummaryStatus"
        style="
          font-size: 12px;
          color: var(--markdown-text-light);
          margin-top: 10px;
          text-align: center;
          padding: 0 15px 15px;
        "
      >
        {{ aiSummaryStatus }}
      </div>
    </div>

    <div v-if="isLoadingAISummary" class="section">
      <div class="section-title">
        <span>处理状态</span>
      </div>
      <div>
        <div style="display: flex; align-items: center; gap: 10px">
          <div class="loading-spinner"></div>
          <span>正在生成AI总结...</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { marked } from 'marked';

const props = defineProps<{
  aiSummaryContent: string;
  aiSummaryStatus: string;
  aiSummaryType: string;
  isLoadingAISummary: boolean;
  isExtracting: boolean;
}>();

const emit = defineEmits<{
  'generate-ai-summary': [];
  'copy-summary': [];
  'clear-cache': [];
  'update:aiSummaryType': [value: string];
}>();

const aiSummaryType = computed({
  get: () => props.aiSummaryType,
  set: (value) => emit('update:aiSummaryType', value),
});

const parsedMarkdown = computed(() => {
  return props.aiSummaryContent ? marked.parse(props.aiSummaryContent) : '';
});
</script>

<style scoped>
.section {
  background: var(--section-bg);
  border-radius: var(--border-radius);
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: var(--box-shadow);
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
  font-weight: 600;
  color: var(--section-title-color);
}

.section-content {
  max-height: 900px;
  font-size: 15px;
  overflow-y: auto;
  overflow-x: hidden;
  border: 1px solid var(--border-color);
  padding: 0px 10px;
  border-radius: var(--border-radius);
  background: var(--section-content-bg);
  word-wrap: break-word;
  word-break: break-all;
}

.btn {
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

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-secondary {
  background: var(--accent-color);
  color: white;
}

.btn-warning {
  background: var(--warning-color);
  color: white;
}

.btn:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}

.btn:disabled {
  background: #cccccc;
  color: #666666;
  cursor: not-allowed;
  opacity: 0.6;
}

.btn:disabled:hover {
  opacity: 0.6;
  transform: none;
}

.loading-spinner {
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 3px solid var(--primary-color);
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>