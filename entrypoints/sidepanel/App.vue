<script lang="ts" setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useTheme } from "./composables/useTheme";
import { useDataExtractor } from "./composables/useDataExtractor";
import { useTabListeners } from "./composables/useTabListeners";
import { browser } from "wxt/browser";
import { createLogger } from "./utils/logger";
import { PERFORMANCE_CONFIG } from "./constants";
import { useStores } from "./stores";
import { cleanupAllExpiredData } from "./utils/dataCleanup";

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
const { isDarkMode, initialize: initializeTheme } = useTheme();
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

  // 应用初始化时调用清理函数
  try {
    logger.info("应用初始化，开始清理过期数据");
    await cleanupAllExpiredData();
    logger.info("应用初始化，数据清理完成");
  } catch (error) {
    logger.error("应用初始化时数据清理失败", error);
  }

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
      <ChatPanel />
    </div>

    <!-- 设置标签页内容 -->
    <div
      v-show="uiStore.state.currentTab === 'settings'"
      class="tab-content active"
    >
      <SettingsPanel />
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

/* 加载动画和Markdown样式已移至全局 style.css */

/* 响应式设计已移至全局 style.css */


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