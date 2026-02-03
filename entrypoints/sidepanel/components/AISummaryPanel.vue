<!--
  @component AISummaryPanel
  @description
    AI 总结面板组件，提供智能网页内容总结功能。
    支持全文总结和关键信息提取两种模式，使用流式输出实时显示 AI 响应。

  @features
    - 折叠式控制面板，默认折叠节省空间
    - 两种总结模式：全文总结、关键信息提取
    - 自定义 Prompt 编辑功能
    - 流式输出，实时显示 AI 响应内容
    - 支持暂停和恢复总结生成
    - Markdown 格式渲染
    - 总结内容缓存（按 URL 和类型存储）
    - 标签页切换时自动加载对应页面的缓存总结
    - 复制总结内容到剪贴板
    - 清除缓存功能

  @usage
    <AISummaryPanel />

  @events
    无直接事件，内部通过 composables 处理所有逻辑

  @example
    <script setup>
    import AISummaryPanel from '@/components/AISummaryPanel.vue'
    </script>

    <template>
      <AISummaryPanel />
    </template>

  @see
    - composables/useAISummary.ts - AI 总结核心逻辑
    - PromptEditModal.vue - Prompt 编辑模态框
    - stores/dataStore.ts - 数据存储
    - stores/settingsStore.ts - API 配置
-->

<template>
  <div class="ai-summary-panel">
    <!-- 折叠式控制栏 -->
    <div class="control-panel" :class="{ 'collapsed': isControlPanelCollapsed }">
      <!-- 折叠态 - 紧凑单行 -->
      <div v-if="isControlPanelCollapsed" class="control-panel-collapsed">
        <div class="collapsed-left">
          <span class="current-type-badge">
            {{ aiSummaryType === 'full' ? '全文总结' : '关键信息' }}
          </span>
          <span class="status-hint" v-if="aiSummaryContent">
            已生成
          </span>
        </div>
        <div class="collapsed-right">
          <button
            class="icon-btn"
            @click="isGeneratingAISummary ? handlePauseAISummary() : handleGenerateAISummary()"
            :disabled="(isLoadingAISummary && !isGeneratingAISummary) || dataStore.state.isLoading || dataStore.state.isPageLoading"
            :title="isGeneratingAISummary ? '暂停' : 'AI总结'"
          >
            <span v-if="isGeneratingAISummary" class="pause-icon">⏸</span>
            <span v-else class="generate-icon">✨</span>
          </button>
          <button
            class="icon-btn"
            @click="isControlPanelCollapsed = false"
            title="展开选项"
          >
            <span class="expand-icon">▾</span>
          </button>
        </div>
      </div>

      <!-- 展开态 - 完整控制 -->
      <div v-else class="control-panel-expanded">
        <div class="type-selector">
          <label
            class="type-option"
            :class="{ 'active': aiSummaryType === 'full' }"
          >
            <input type="radio" :value="'full'" v-model="aiSummaryType" />
            <span>全文总结</span>
          </label>
          <label
            class="type-option"
            :class="{ 'active': aiSummaryType === 'keyinfo' }"
          >
            <input type="radio" :value="'keyinfo'" v-model="aiSummaryType" />
            <span>关键信息</span>
          </label>
        </div>

        <div class="action-buttons">
          <button
            class="btn btn-secondary"
            @click="showPromptModal = true"
          >
            编辑 Prompt
          </button>
          <button
            class="btn"
            :class="isGeneratingAISummary ? 'btn-warning' : 'btn-primary'"
            @click="isGeneratingAISummary ? handlePauseAISummary() : handleGenerateAISummary()"
            :disabled="(isLoadingAISummary && !isGeneratingAISummary) || dataStore.state.isLoading || dataStore.state.isPageLoading"
          >
            <span v-if="isGeneratingAISummary">⏸ 暂停</span>
            <span v-else-if="isLoadingAISummary">⏳ 生成中...</span>
            <span v-else>✨ AI总结</span>
          </button>
        </div>

        <button
          class="collapse-btn"
          @click="isControlPanelCollapsed = true"
          title="折叠"
        >
          <span>▴</span>
        </button>
      </div>
    </div>

    <!-- 结果区域 -->
    <div class="result-section">
      <div
        v-if="aiSummaryContent"
        id="streaming-content"
        v-html="parsedMarkdown"
        class="result-content custom-scrollbar markdown-content"
      ></div>
      <div v-else class="result-empty">
        <div v-if="isLoadingAISummary" class="loading-state">
          <div class="loading-spinner"></div>
          <span>正在生成AI总结...</span>
        </div>
        <div v-else class="empty-hint">
          点击 AI总结 按钮开始生成网页内容总结
        </div>
      </div>
    </div>

    <!-- 底部状态栏 -->
    <div v-if="aiSummaryStatus || aiSummaryContent" class="status-bar">
      <span class="status-text">{{ aiSummaryContent ? aiSummaryStatus || '已生成总结' : '' }}</span>
      <div class="status-actions">
        <button
          v-if="aiSummaryContent"
          class="text-btn"
          @click="handleCopySummary"
          title="复制总结"
        >
          📋 复制
        </button>
        <button
          v-if="aiSummaryContent"
          class="text-btn"
          @click="handleClearCache"
          title="清除缓存"
        >
          🗑 清除
        </button>
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
const isControlPanelCollapsed = ref(true); // 默认折叠以提高信息密度
const isUserPaused = ref(false); // 标记是否由用户主动暂停

// 记录上一次处理的URL，避免重复处理
let lastProcessedUrl = '';
let isProcessing = false;

// 从store获取数据
const extractedData = computed(() => dataStore.state.extractedData);

// 处理生成 AI 总结
const handleGenerateAISummary = async () => {
  // 重置用户暂停标志
  isUserPaused.value = false;

  const result = await generateAISummary(
    extractedData.value.text || "",
    extractedData.value
  );

  if (result) {
    if (result.success) {
      uiStore.showToast("AI总结生成成功！", "success");
    } else {
      // 如果是用户主动暂停，不显示错误提示（pauseAISummary 已经显示了成功提示）
      if (!isUserPaused.value) {
        uiStore.showToast(result.message || "AI总结生成失败", "error");
      }
    }
  }
};

// 处理暂停 AI 总结
const handlePauseAISummary = async () => {
  // 设置用户主动暂停标志
  isUserPaused.value = true;

  const result = await pauseAISummary();

  if (result) {
    if (result.success) {
      uiStore.showToast("AI总结已暂停并保存", "success");
    } else {
      uiStore.showToast(result.message || "暂停AI总结失败", "error");
      // 暂停失败时重置标志
      isUserPaused.value = false;
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
/* ============= 主容器 ============= */
.ai-summary-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* ============= 控制面板（折叠栏） ============= */
.control-panel {
  background: var(--section-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  margin-bottom: 12px;
  box-shadow: var(--box-shadow);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 折叠态 - 紧凑单行 */
.control-panel-collapsed {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  min-height: 40px;
  gap: 10px;
}

.collapsed-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.current-type-badge {
  font-size: 13px;
  font-weight: 600;
  color: var(--primary-color);
  background: var(--primary-color-hover);
  padding: 5px 12px;
  border-radius: 12px;
  border: 1px solid var(--primary-color);
  white-space: nowrap;
}

.status-hint {
  font-size: 12px;
  color: var(--markdown-text-light);
  opacity: 0.8;
}

.collapsed-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 图标按钮 */
.icon-btn {
  width: 34px;
  height: 34px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--section-content-bg);
  color: var(--primary-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.icon-btn:hover:not(:disabled) {
  background: var(--primary-color);
  color: #ffffff;
  border-color: var(--primary-color);
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  border-color: transparent;
}

.icon-btn .generate-icon {
  font-size: 16px;
}

.icon-btn .pause-icon {
  font-size: 14px;
}

.icon-btn .expand-icon {
  font-size: 12px;
  color: var(--markdown-text-light);
}

/* 展开态 - 完整控制 */
.control-panel-expanded {
  padding: 12px 40px 12px 12px; /* 右侧留出折叠按钮空间 */
  position: relative;
}

.type-selector {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.type-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border: 2px solid var(--border-color);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--section-content-bg);
  font-size: 14px;
  font-weight: 500;
  position: relative;
}

/* 暗色模式增强边框可见度 */
.type-option::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--border-radius);
  padding: 1px;
  background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0.5;
  pointer-events: none;
}

.type-option input {
  display: none;
}

.type-option:hover {
  border-color: var(--primary-color);
  background: var(--section-bg);
  box-shadow: 0 0 0 1px var(--primary-color);
}

.type-option.active {
  border-color: var(--primary-color);
  background: var(--primary-color);
  color: #ffffff;
  box-shadow: 0 0 0 2px var(--primary-color-hover);
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.collapse-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--section-content-bg);
  color: var(--markdown-text-light);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.2s ease;
  z-index: 10;
}

.collapse-btn:hover {
  background: var(--primary-color);
  color: #ffffff;
  border-color: var(--primary-color);
  transform: scale(1.05);
}

/* ============= 结果区域 ============= */
.result-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.result-content {
  flex: 1;
  max-height: calc(100vh - 180px);
  font-size: 15px;
  overflow-y: auto;
  overflow-x: hidden;
  border: 1px solid var(--border-color);
  padding: 12px;
  border-radius: var(--border-radius);
  background: var(--section-content-bg);
  word-wrap: break-word;
  word-break: break-word;
  scroll-behavior: smooth;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
}

.result-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: var(--markdown-text-light);
  border: 1px dashed var(--border-color);
  border-radius: var(--border-radius);
  background: var(--section-content-bg);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.empty-hint {
  font-size: 14px;
  color: var(--markdown-text-light);
}

/* ============= 状态栏 ============= */
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  margin-top: 8px;
  background: var(--section-content-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  font-size: 12px;
}

.status-text {
  color: var(--markdown-text-light);
}

.status-actions {
  display: flex;
  gap: 4px;
}

.text-btn {
  background: none;
  border: none;
  color: var(--markdown-text-light);
  cursor: pointer;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.text-btn:hover {
  background: var(--section-bg);
  color: var(--primary-color);
}

/* ============= 按钮样式 ============= */
.btn {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid transparent;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 14px;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--primary-color);
  color: #ffffff;
  border-color: var(--primary-color);
}

.btn-secondary {
  background: var(--accent-color);
  color: #ffffff;
  border-color: var(--accent-color);
}

.btn-warning {
  background: var(--warning-color);
  color: #ffffff;
  border-color: var(--warning-color);
}

.btn:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.btn:active:not(:disabled) {
  transform: translateY(0);
}

.btn:disabled {
  background: var(--border-color);
  color: var(--markdown-text-light);
  cursor: not-allowed;
  opacity: 0.5;
  box-shadow: none;
}

.btn:disabled:hover {
  transform: none;
  filter: none;
}

/* ============= 加载动画 ============= */
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

/* ============= Markdown 内容样式（保留原有） ============= */
#streaming-content {
  line-height: 1.7;
}

#streaming-content h1,
#streaming-content h2,
#streaming-content h3,
#streaming-content h4,
#streaming-content h5,
#streaming-content h6 {
  margin-top: 16px;
  margin-bottom: 8px;
  font-weight: 600;
}

#streaming-content h1 { font-size: 1.5em; }
#streaming-content h2 { font-size: 1.3em; }
#streaming-content h3 { font-size: 1.15em; }

#streaming-content p {
  margin-bottom: 12px;
}

#streaming-content ul,
#streaming-content ol {
  margin-bottom: 12px;
  padding-left: 24px;
}

#streaming-content li {
  margin-bottom: 6px;
}

#streaming-content code {
  background: var(--section-bg);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}

#streaming-content pre {
  background: var(--section-bg);
  padding: 12px;
  border-radius: var(--border-radius);
  overflow-x: auto;
  margin-bottom: 12px;
}

#streaming-content pre code {
  background: none;
  padding: 0;
}

#streaming-content blockquote {
  border-left: 3px solid var(--primary-color);
  padding-left: 12px;
  margin: 12px 0;
  color: var(--markdown-text-light);
}
</style>