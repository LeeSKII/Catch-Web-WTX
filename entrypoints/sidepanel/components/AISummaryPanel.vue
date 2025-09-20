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
          class="btn btn-secondary"
          style="flex: 1"
          @click="showPromptModal = true"
        >
          编辑 Prompt
        </button>
        <button
          class="btn"
          :class="isGeneratingAISummary ? 'btn-warning' : 'btn-primary'"
          style="flex: 1"
          @click="isGeneratingAISummary ? handlePauseAISummary() : handleGenerateAISummary()"
          :disabled="isLoadingAISummary && !isGeneratingAISummary"
        >
          <span v-if="isGeneratingAISummary">暂停</span>
          <span v-else-if="isLoadingAISummary">生成中...</span>
          <span v-else>AI总结</span>
        </button>
      </div>
    </div>

    <div class="section">
      <div class="section-title">
        <span>AI总结结果</span>
        <div>
          <button class="btn btn-secondary" @click="handleCopySummary">
            复制
          </button>
          <button class="btn btn-warning" @click="handleClearCache">
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
          <div v-if="isQueryingDatabase && !isLoadingAISummary" style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 10px;">
            <div class="loading-spinner" style="width: 16px; height: 16px; border-width: 2px;"></div>
            <span style="font-size: 14px; color: var(--markdown-text-light);">正在查询数据库...</span>
          </div>
          <div v-else-if="isLoadingAISummary && !isQueryingDatabase" style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 10px;">
            <div class="loading-spinner" style="width: 16px; height: 16px; border-width: 2px;"></div>
            <span style="font-size: 14px; color: var(--markdown-text-light);">正在生成AI总结...</span>
          </div>
          <div v-else-if="isQueryingDatabase && isLoadingAISummary" style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 10px;">
            <div class="loading-spinner" style="width: 16px; height: 16px; border-width: 2px;"></div>
            <span style="font-size: 14px; color: var(--markdown-text-light);">正在处理中...</span>
          </div>
          <div v-else>
            点击"AI总结"按钮开始生成网页内容总结
          </div>
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

    <!-- Prompt 编辑模态框 -->
    <PromptEditModal
      v-model:visible="showPromptModal"
      :current-prompt-type="aiSummaryType"
      :custom-prompts="customPrompts"
      :default-prompts="getDefaultPrompts()"
      @save-prompts="handleSavePrompts"
    />

  </div>
</template>

<script lang="ts" setup>
import { computed, ref, onMounted, watch } from 'vue';
import { marked } from 'marked';
import { useAISummary } from '../composables/useAISummary';
import { useToast } from '../composables/useToast';
import { browser } from 'wxt/browser';
import PromptEditModal from './PromptEditModal.vue';
import type { ExtractedData } from '../types';

// 定义 props
const props = defineProps<{
  extractedData: ExtractedData;
}>();

// 使用 composables
const {
  isLoadingAISummary,
  isQueryingDatabase,
  aiSummaryContent,
  aiSummaryStatus,
  aiSummaryType,
  customPrompts,
  isGeneratingAISummary,
  generateAISummary,
  pauseAISummary,
  clearAISummaryCache,
  saveCustomPrompts,
  getDefaultPrompts,
  loadCustomPrompts,
  loadAndDisplayAISummary,
  switchSummaryType
} = useAISummary();

const { success, error } = useToast();

// 模态框显示状态
const showPromptModal = ref(false);

// 处理生成 AI 总结
const handleGenerateAISummary = async () => {
  const result = await generateAISummary(
    props.extractedData.text || "",
    props.extractedData
  );

  if (result) {
    if (result.success) {
      success("AI总结生成成功！");
    } else {
      error(result.message || "AI总结生成失败");
    }
  }
};

// 处理暂停 AI 总结
const handlePauseAISummary = async () => {
  const result = await pauseAISummary();
  
  if (result) {
    if (result.success) {
      success("AI总结已暂停并保存");
    } else {
      error(result.message || "暂停AI总结失败");
    }
  }
};

// 处理复制总结
const handleCopySummary = () => {
  if (!aiSummaryContent.value) {
    error("没有可复制的总结内容");
    return;
  }

  navigator.clipboard
    .writeText(aiSummaryContent.value)
    .then(() => {
      success("AI总结已复制到剪贴板！");
    })
    .catch((err) => {
      console.error("复制失败", err);
      error("复制失败，请重试");
    });
};

// 处理清除缓存
const handleClearCache = async () => {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  if (tabs && tabs[0] && tabs[0].url) {
    clearAISummaryCache(tabs[0].url, aiSummaryType.value);
    success("缓存已清除");
  }
};

// 处理保存 prompts
const handleSavePrompts = (prompts: { full: string; keyinfo: string }) => {
  saveCustomPrompts(prompts);
  success("Prompt 已保存！");
};

// 计算属性
const parsedMarkdown = computed(() => {
  return aiSummaryContent.value ? marked.parse(aiSummaryContent.value) : '';
});

// 监听 aiSummaryType 的变化
watch(aiSummaryType, async (newType, oldType) => {
  if (newType !== oldType) {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0] && tabs[0].url) {
      switchSummaryType(tabs[0].url, newType).catch((error) => {
        console.error("切换总结类型失败", error);
      });
    }
  }
});

// 生命周期钩子
onMounted(() => {
  // 加载自定义 prompts
  loadCustomPrompts();
  
  // 初始加载当前页面的 AI 总结
  const loadInitialSummary = async () => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0] && tabs[0].url) {
      loadAndDisplayAISummary(tabs[0].url, "组件初始化").catch((error) => {
        console.error("初始加载AI总结失败", error);
      });
    }
  };
  
  loadInitialSummary();
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
  max-height: calc(100vh - 300px);
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