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
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { marked } from 'marked';
import { useAISummary } from '../composables/useAISummary';
import { useStores } from '../stores';
import { browser } from 'wxt/browser';
import PromptEditModal from './PromptEditModal.vue';
import { createLogger } from '../utils/logger';

// 创建日志器
const logger = createLogger("AISummaryPanel");

// 使用全局状态管理
const { dataStore, uiStore } = useStores();

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

// 组件内部状态
const showPromptModal = ref(false);

// 记录上一次处理的URL，避免重复处理
let lastProcessedUrl = '';
let isProcessing = false;

// 从store获取数据
const extractedData = computed(() => dataStore.state.extractedData);

// 处理生成 AI 总结
const handleGenerateAISummary = async () => {
  const result = await generateAISummary(
    extractedData.value.text || "",
    extractedData.value
  );

  if (result) {
    if (result.success) {
      uiStore.showToast("AI总结生成成功！", "success");
    } else {
      uiStore.showToast(result.message || "AI总结生成失败", "error");
    }
  }
};

// 处理暂停 AI 总结
const handlePauseAISummary = async () => {
  const result = await pauseAISummary();
  
  if (result) {
    if (result.success) {
      uiStore.showToast("AI总结已暂停并保存", "success");
    } else {
      uiStore.showToast(result.message || "暂停AI总结失败", "error");
    }
  }
};

// 处理复制总结
const handleCopySummary = () => {
  if (!aiSummaryContent.value) {
    uiStore.showToast("没有可复制的总结内容", "error");
    return;
  }

  navigator.clipboard
    .writeText(aiSummaryContent.value)
    .then(() => {
      uiStore.showToast("AI总结已复制到剪贴板！", "success");
    })
    .catch((err) => {
      logger.error("复制失败", err);
      uiStore.showToast("复制失败，请重试", "error");
    });
};

// 处理清除缓存
const handleClearCache = async () => {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  if (tabs && tabs[0] && tabs[0].url) {
    // 清除缓存
    clearAISummaryCache(tabs[0].url, aiSummaryType.value);
    // 立即清空显示内容
    aiSummaryContent.value = "";
    aiSummaryStatus.value = "";
    uiStore.showToast("缓存已清除", "success");
  }
};

// 处理保存 prompts
const handleSavePrompts = (prompts: { full: string; keyinfo: string }) => {
  saveCustomPrompts(prompts);
  uiStore.showToast("Prompt 已保存！", "success");
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
        logger.error("切换总结类型失败", error);
      });
    }
  }
});

// 监听URL变化的函数
const handleUrlChange = async (url: string, source: string = "unknown") => {
  logger.debug("handleUrlChange() 被调用", { url, source, lastProcessedUrl, isProcessing });
  
  // 防重复处理：如果URL没有变化或者正在处理中，则跳过
  if (url === lastProcessedUrl || isProcessing) {
    logger.debug("URL未变化或正在处理中，跳过", { url, lastProcessedUrl, isProcessing });
    return;
  }
  
  // 更新处理状态
  lastProcessedUrl = url;
  isProcessing = true;
  
  try {
    // 加载并显示新URL的AI总结
    await loadAndDisplayAISummary(url, source);
    logger.debug("URL变化时AI总结加载完成", { url, source });
  } catch (error) {
    logger.error("URL变化时加载AI总结失败", error);
  } finally {
    isProcessing = false;
  }
};

// 设置标签页更新监听器
const setupTabUpdateListener = () => {
  // 监听当前标签页的URL变化
  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // 只处理当前活动标签页的URL变化
    if (tab.active && tab.url && changeInfo.url) {
      logger.debug("检测到URL变化", { tabId, url: tab.url, changeInfo });
      await handleUrlChange(tab.url, "tabs.onUpdated");
    }
  });
  
  // 监听标签页切换事件
  browser.tabs.onActivated.addListener(async (activeInfo) => {
    try {
      const tab = await browser.tabs.get(activeInfo.tabId);
      if (tab && tab.url && tab.active) {
        logger.debug("检测到标签页切换", { tabId: tab.id, url: tab.url });
        await handleUrlChange(tab.url, "tabs.onActivated");
      }
    } catch (error) {
      logger.error("获取切换后的标签页信息失败", error);
    }
  });
};

// 移除标签页监听器
const removeTabUpdateListener = () => {
  browser.tabs.onUpdated.removeListener(() => {});
  browser.tabs.onActivated.removeListener(() => {});
};

// 生命周期钩子
onMounted(() => {
  // 加载自定义 prompts
  loadCustomPrompts();
  
  // 设置标签页更新监听器
  setupTabUpdateListener();
  
  // 初始加载当前页面的 AI 总结
  const loadInitialSummary = async () => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0] && tabs[0].url) {
      lastProcessedUrl = tabs[0].url; // 记录初始URL
      loadAndDisplayAISummary(tabs[0].url, "组件初始化").catch((error) => {
        logger.error("初始加载AI总结失败", error);
      });
    }
  };
  
  loadInitialSummary();
});

onUnmounted(() => {
  // 移除标签页监听器
  removeTabUpdateListener();
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