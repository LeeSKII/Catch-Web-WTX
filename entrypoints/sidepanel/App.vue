<script lang="ts" setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useTheme } from "./composables/useTheme";
import { useDataExtractor } from "./composables/useDataExtractor";
import { useTabListeners } from "./composables/useTabListeners";
import { browser } from "wxt/browser";
import { createLogger } from "./utils/logger";
import { PERFORMANCE_CONFIG } from "./constants";
import { useStores } from "./stores";

// 导入组件
import TabNavigation from "./components/TabNavigation.vue";
import WebInfoSection from "./components/WebInfoSection.vue";
import AISummaryPanel from "./components/AISummaryPanel.vue";
import SettingsPanel from "./components/SettingsPanel.vue";
import ChatPanel from "./components/ChatPanel.vue";

// 创建日志器
const logger = createLogger("App");

// 使用全局状态管理
const { dataStore, uiStore, settingsStore } = useStores();

// 使用 Composables
const { isDarkMode, toggle, initialize: initializeTheme } = useTheme();
const { extractData } = useDataExtractor();

// 响应式数据
const webInfoSectionRef = ref<InstanceType<typeof WebInfoSection> | null>(null);

// 方法
const switchTab = (tabName: string) => {
  uiStore.switchTab(tabName);
};

const handleExtractData = async () => {
  try {
    dataStore.setLoading(true);
    
    const options = {
      html: settingsStore.state.settings.extractHtml,
      text: settingsStore.state.settings.extractText,
      images: settingsStore.state.settings.extractImages,
      links: settingsStore.state.settings.extractLinks,
      meta: settingsStore.state.settings.extractMeta,
      styles: settingsStore.state.settings.extractStyles,
      scripts: settingsStore.state.settings.extractScripts,
      article: settingsStore.state.settings.extractArticle,
    };

    const extractResult = await extractData(options);

    if (extractResult.success && extractResult.data) {
      dataStore.updateExtractedData(extractResult.data);
      uiStore.showToast("数据提取成功！", "success");
    } else {
      dataStore.setError(extractResult.message || "数据提取失败");
      uiStore.showToast(extractResult.message || "数据提取失败", "error");
    }
  } catch (err) {
    logger.error("数据提取过程中出错", err);
    dataStore.setError("数据提取失败，请重试");
    uiStore.showToast("数据提取失败，请重试", "error");
  } finally {
    dataStore.setLoading(false);
    dataStore.setPageLoading(false);
    
    // 重置刷新按钮状态
    if (webInfoSectionRef.value) {
      webInfoSectionRef.value.resetButtonStates();
    }
  }
};


const handleToggleDarkMode = () => {
  toggle();
  uiStore.toggleDarkMode();
};

const handleSaveSettings = () => {
  settingsStore.saveSettings();
  uiStore.showToast("设置已保存！设置将立即生效。", "success");
};

const handleBookmarkAction = async (isBookmarked: boolean) => {
  // 收藏功能逻辑移至 WebInfoSection 组件内部
  // 这里只提供事件转发
  logger.debug("收藏操作事件转发", { isBookmarked });
};

const handleAddReference = async () => {
  if (!dataStore.state.extractedData.text) {
    uiStore.showToast("没有可引用的文本内容，请先提取数据", "warning");
    return;
  }
  
  // 引用添加逻辑移至 ChatPanel 组件内部
  // 这里只提供事件转发
  logger.debug("添加引用操作事件转发");
};

const clearPanelData = () => {
  dataStore.clearData();
};

const refreshDataForNewTab = async () => {
  logger.debug("refreshDataForNewTab() 函数被调用");

  // 获取当前tab的加载状态
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tabs || !tabs[0]) {
    logger.debug("无法获取当前tab信息");
    return;
  }

  const currentTab = tabs[0];
  logger.debug("当前tab状态", { status: currentTab.status });

  // 检查页面是否正在加载
  if (currentTab.status === "loading") {
    logger.debug("页面正在加载中，等待页面加载完成");
    // 等待页面加载完成
    if (currentTab.id) {
      await waitForTabToLoad(currentTab.id);
      logger.debug("页面加载完成，开始提取数据");
      // 页面加载完成，提取数据
      await handleExtractData();
    } else {
      logger.debug("无法获取tab ID，直接尝试提取数据");
      await handleExtractData();
    }
  } else {
    logger.debug("页面已加载完成，立即提取数据");
    // 页面已加载完成，直接提取数据
    await handleExtractData();
  }
  
  // 确保在数据提取完成后，将页面加载状态设置为 false
  dataStore.setPageLoading(false);
};

// 等待标签页加载完成的函数
const waitForTabToLoad = (tabId: number) => {
  return new Promise<void>((resolve) => {
    const checkTabStatus = async () => {
      try {
        const tab = await browser.tabs.get(tabId);
        if (tab && tab.status === "complete") {
          resolve();
        } else {
          // 继续检查
          setTimeout(
            checkTabStatus,
            PERFORMANCE_CONFIG.DOM_READY_CHECK_INTERVAL
          );
        }
      } catch (error) {
        logger.error("检查标签页状态时出错", error);
        resolve(); // 出错时也resolve，避免无限等待
      }
    };

    checkTabStatus();
  });
};

// 使用 useTabListeners composable
const { setupTabListeners, removeTabListeners } = useTabListeners(
  refreshDataForNewTab,
  async (url: string, source?: string) => {
    // AI总结的加载现在在 AISummaryPanel 组件内部处理
    return Promise.resolve();
  },
  clearPanelData
);

// 生命周期钩子
onMounted(async () => {
  console.log("[DEBUG MODE:browser]", browser);
  
  // 初始化主题
  initializeTheme();

  // 加载设置
  settingsStore.loadSettings();

  // 设置标签页监听器，传递 DOM loading 状态变化的回调函数
  setupTabListeners((isLoading: boolean) => {
    dataStore.setPageLoading(isLoading);
    if (isLoading) {
      clearPanelData();
    }
  });

  // 初始加载时自动提取当前页面数据
  await refreshDataForNewTab();
  
  // 确保在初始数据加载完成后，将页面加载状态设置为 false
  dataStore.setPageLoading(false);
});

onUnmounted(() => {
  // 移除标签页监听器
  removeTabListeners();
});

// 监听器
watch(() => uiStore.state.currentTab, async (newTab, oldTab) => {
  logger.debug('标签页切换', { from: oldTab, to: newTab });

  // 当切换到聊天标签时，重新加载设置以确保获取最新的API密钥
  if (newTab === 'chat') {
    settingsStore.loadSettings();
    logger.debug('切换到聊天标签页，已重新加载设置');
  }
});

watch(isDarkMode, (newValue) => {
  uiStore.state.isDarkMode = newValue;
});
</script>

<template>
  <div class="container">
    <!-- 标签页导航 -->
    <TabNavigation :current-tab="uiStore.state.currentTab" @tab-change="switchTab" />

    <!-- 网页标签页内容 -->
    <div
      v-show="uiStore.state.currentTab === 'results'"
      class="tab-content active"
    >
      <!-- 网页信息 -->
      <WebInfoSection
        ref="webInfoSectionRef"
        @refresh-data="handleExtractData"
        @bookmark-action="handleBookmarkAction"
      />
    </div>

    <!-- AI标签页内容 -->
    <div
      v-show="uiStore.state.currentTab === 'ai'"
      class="tab-content active"
    >
      <AISummaryPanel :extracted-data="dataStore.state.extractedData" />
    </div>

    <!-- 对话标签页内容 -->
    <div
      v-show="uiStore.state.currentTab === 'chat'"
      class="tab-content active"
    >
      <ChatPanel
        @add-reference="handleAddReference"
      />
    </div>

    <!-- 设置标签页内容 -->
    <div
      v-show="uiStore.state.currentTab === 'settings'"
      class="tab-content active"
    >
      <SettingsPanel
        @save-settings="handleSaveSettings"
        @toggle-dark-mode="handleToggleDarkMode"
      />
    </div>
  </div>

  <!-- Toast通知容器 -->
  <div v-if="uiStore.state.showToast" id="toast-container" class="toast-container">
    <div class="toast" :class="`toast-${uiStore.state.toastType}`">
      {{ uiStore.state.toastMessage }}
    </div>
  </div>

</template>

<style scoped>
/* 组件特定样式 - 全局颜色变量已移至 style.css */

.container {
  padding: 15px;
  flex: 1;
  overflow: hidden;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tabs {
  display: flex;
  margin-bottom: 15px;
  background: var(--tab-bg);
  border-radius: var(--border-radius);
  overflow: hidden;
  box-shadow: var(--box-shadow);
  flex-wrap: wrap;
}

.tab {
  flex: 1;
  padding: 10px;
  text-align: center;
  cursor: pointer;
  background: var(--tab-bg);
  border: none;
  font-weight: 600;
  min-width: 80px;
  color: var(--tab-text-color);
}

.tab.active {
  background: var(--primary-color);
  color: white;
}

.tab-content {
  display: none;
}

.tab-content.active {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

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

.btn-success {
  background: var(--success-color);
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

.filter-box {
  margin-bottom: 10px;
  display: flex;
  gap: 10px;
}

.filter-input {
  flex: 1;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  font-size: 13px;
}

.stats {
  display: flex;
  justify-content: space-around;
  margin: 15px 0;
  text-align: center;
}

.stat-item {
  flex: 1;
  padding: 10px;
}

.stat-value {
  font-size: 20px;
  font-weight: bold;
  color: var(--primary-color);
}

.stat-label {
  font-size: 12px;
  color: var(--markdown-text-light);
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-top: 10px;
  max-width: 100%;
  overflow: hidden;
}

.image-item {
  border-radius: var(--border-radius);
  overflow: hidden;
  position: relative;
}

.image-item img {
  width: 100%;
  height: 80px;
  object-fit: cover;
  max-width: 100%;
}

.image-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 5px;
  font-size: 10px;
  opacity: 0;
  transition: opacity 0.3s;
}

.image-item:hover .image-info {
  opacity: 1;
}

.settings-panel {
  background: var(--section-content-bg);
  padding: 15px;
  border-radius: var(--border-radius);
  margin-top: 15px;
}

.setting-item {
  margin-bottom: 10px;
}

.setting-label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
  font-size: 13px;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.4s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--primary-color);
}

input:checked + .slider:before {
  transform: translateX(26px);
}

/* 加载动画和Markdown样式已移至全局 style.css */

/* 响应式设计已移至全局 style.css */

/* 防止内容溢出 */
.section-title {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.section-title span {
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
  display: inline-block;
}

/* 链接样式防止溢出 */
.section-content a {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 页面加载状态指示器 */
.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border-color);
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

.loading-text {
  color: var(--markdown-text-light);
  font-size: 14px;
  font-weight: 500;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

</style>