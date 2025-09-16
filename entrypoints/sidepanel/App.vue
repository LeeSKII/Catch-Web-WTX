<script lang="ts" setup>
import { ref, reactive, onMounted, onUnmounted, computed, watch } from "vue";
import { useToast } from "./composables/useToast";
import { useTheme } from "./composables/useTheme";
import { useSettings } from "./composables/useSettings";
import { useDataExtractor } from "./composables/useDataExtractor";
import { useBookmark } from "./composables/useBookmark";
import { useAISummary } from "./composables/useAISummary";
import { browser } from "wxt/browser";
import { debounce } from "./utils/debounce";
import { createLogger } from "./utils/logger";
import { UI_CONFIG, PERFORMANCE_CONFIG } from "./constants";
import { createClient } from "@supabase/supabase-js";

// 导入组件
import TabNavigation from "./components/TabNavigation.vue";
import StatsDisplay from "./components/StatsDisplay.vue";
import WebInfoSection from "./components/WebInfoSection.vue";
import type { ExtractedData } from "./types";
import ImageGrid from "./components/ImageGrid.vue";
import LinkList from "./components/LinkList.vue";
import AISummaryPanel from "./components/AISummaryPanel.vue";
import SettingsPanel from "./components/SettingsPanel.vue";

// 创建日志器
const logger = createLogger("App");

// Supabase初始化
const client = createClient(
  "https://jnzoquhmgpjbqcabgxrd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impuem9xdWhtZ3BqYnFjYWJneHJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MDc4OTgsImV4cCI6MjA3MjA4Mzg5OH0.BKMFZNbTgGf5yxfAQuFbA912fISlbbL3GE6YDn-OkaA"
);

// 使用 Composables
const { success, error, warning, info } = useToast();
const { isDarkMode, toggle, initialize: initializeTheme } = useTheme();
const {
  settings,
  loadSettings,
  saveSettings,
  updateSetting,
  cleanExpiredData,
} = useSettings();
const {
  extractedData,
  isLoading: isExtracting,
  extractData,
  saveExtractedData,
  clearExtractedData,
} = useDataExtractor();
const { checkBookmarkStatus, isCheckingBookmark } = useBookmark();
const {
  isLoadingAISummary,
  isQueryingDatabase,
  aiSummaryContent,
  aiSummaryStatus,
  aiSummaryType,
  generateAISummary,
  loadAISummary,
  getNews,
  loadAndDisplayAISummary,
  clearAISummaryCache,
  preloadDataToStorage,
  switchSummaryType,
} = useAISummary();

// 响应式数据
const currentTab = ref("results");
const imageFilter = ref("");
const linkFilter = ref("");
const isDarkModeToggle = ref(false);
const isPageLoading = ref(false); // 新增：页面加载状态
const webInfoSectionRef = ref<InstanceType<typeof WebInfoSection> | null>(null);

// 计算属性
const stats = computed(() => ({
  imagesCount: extractedData.value.images?.length || 0,
  linksCount: extractedData.value.links?.length || 0,
  wordsCount: extractedData.value.wordCount || 0,
}));

// 方法
const switchTab = (tabName: string) => {
  currentTab.value = tabName;
};

const handleExtractData = async () => {
  try {
    const options = {
      html: settings.extractHtml,
      text: settings.extractText,
      images: settings.extractImages,
      links: settings.extractLinks,
      meta: settings.extractMeta,
      styles: settings.extractStyles,
      scripts: settings.extractScripts,
      article: settings.extractArticle,
    };

    // 并行调用 extractData 和 checkBookmarkStatus
    const [extractResult, tabs] = await Promise.all([
      extractData(options),
      browser.tabs.query({ active: true, currentWindow: true })
    ]);

    if (extractResult.success && extractResult.data) {
      success("数据提取成功！");
      saveExtractedData(extractResult.data);

      // 检查收藏状态
      if (tabs && tabs[0] && tabs[0].url) {
        const url = tabs[0].url;
        const isBookmarked = await checkBookmarkStatus(url);
        extractedData.value.isBookmarked = isBookmarked;
        
        // 如果是收藏数据，预加载数据库中的summarizer和ai_key_info到storage
        if (isBookmarked) {
          logger.debug("检测到收藏数据，预加载summarizer和ai_key_info到storage");
          await preloadDataToStorage(url);
        }
        
        // 加载并显示AI总结
        await loadAndDisplayAISummary(url, "数据提取");
      }
    } else {
      error(extractResult.message || "数据提取失败");
    }
  } catch (err) {
    logger.error("数据提取过程中出错", err);
    error("数据提取失败，请重试");
  } finally {
    // 重置刷新按钮状态
    if (webInfoSectionRef.value) {
      webInfoSectionRef.value.resetButtonStates();
    }
  }
};

const handleGenerateAISummary = async () => {
  const result = await generateAISummary(
    extractedData.value.text || "",
    extractedData.value
  );

  if (result) {
    if (result.success) {
      success("AI总结生成成功！");
    } else {
      error(result.message || "AI总结生成失败");
    }
  }
};

const handleCopyAllData = () => {
  const text = JSON.stringify(extractedData.value, null, 2);

  navigator.clipboard
    .writeText(text)
    .then(() => {
      success("数据已复制到剪贴板！");
    })
    .catch((err) => {
      logger.error("复制失败", err);
      error("复制失败，请重试");
    });
};

const handleCopySummary = () => {
  if (!aiSummaryContent.value) {
    warning("没有可复制的总结内容");
    return;
  }

  navigator.clipboard
    .writeText(aiSummaryContent.value)
    .then(() => {
      success("AI总结已复制到剪贴板！");
    })
    .catch((err) => {
      logger.error("复制失败", err);
      error("复制失败，请重试");
    });
};

const handleExportData = () => {
  if (Object.keys(extractedData.value).length === 0) {
    warning("没有数据可导出");
    return;
  }

  const blob = new Blob([JSON.stringify(extractedData.value, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  // 获取标题和URL来构建文件名
  let title = extractedData.value.title || "untitled";
  let urlPart = extractedData.value.url || "no-url";

  // 清理标题，移除不适合文件名的字符
  title = title.replace(/[\\/:*?"<>|]/g, "-").substring(0, 50);

  // 从URL中提取域名部分
  try {
    const urlObj = new URL(urlPart);
    urlPart = urlObj.hostname.replace(/^www\./, "");
  } catch (e) {
    urlPart = "invalid-url";
  }

  const date = new Date().toISOString().slice(0, 10);
  const filename = `${title}-${urlPart}-${date}.json`;

  browser.downloads.download({
    url: url,
    filename: filename,
    saveAs: true,
  });
};

const handleClearData = () => {
  if (confirm("确定要清除所有提取的数据吗？")) {
    clearExtractedData();
    success("数据已清除");
  }
};

const handleClearCache = async () => {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  if (tabs && tabs[0] && tabs[0].url) {
    clearAISummaryCache(tabs[0].url, aiSummaryType.value);
    aiSummaryContent.value = "";
    aiSummaryStatus.value = "";
    success("缓存已清除");
  }
};

const handleViewAllImages = () => {
  if (!extractedData.value.images || extractedData.value.images.length === 0) {
    warning("没有可查看的图片");
    return;
  }

  // 功能暂未实现
  warning("查看全部图片功能正在开发中");
};

const handleDownloadAllImages = () => {
  if (!extractedData.value.images || extractedData.value.images.length === 0) {
    warning("没有可下载的图片");
    return;
  }

  success(`开始下载 ${extractedData.value.images.length} 张图片`);

  extractedData.value.images?.forEach((img, index) => {
    if (img && img.src) {
      browser.downloads.download({
        url: img.src,
        filename: `image-${index + 1}.${
          img.src.split(".").pop()?.split("?")[0] || "jpg"
        }`,
        saveAs: false,
      });
    }
  });
};

const handleViewAllLinks = () => {
  if (!extractedData.value.links || extractedData.value.links.length === 0) {
    warning("没有可查看的链接");
    return;
  }

  // 功能暂未实现
  warning("查看全部链接功能正在开发中");
};

const handleToggleDarkMode = () => {
  toggle();
  isDarkModeToggle.value = !isDarkModeToggle.value;
};

const handleSaveSettings = () => {
  saveSettings();
  success("设置已保存！");
};

const handleBookmarkAction = async (isBookmarked: boolean) => {
  try {
    if (!extractedData.value.url) {
      error("无法获取URL，请先提取数据");
      return;
    }

    // 获取AI关键信息总结
    let aiKeyInfo = null;
    if (aiSummaryType.value === "keyinfo" && aiSummaryContent.value) {
      aiKeyInfo = aiSummaryContent.value;
    } else if (aiSummaryContent.value) {
      // 如果当前不是keyinfo类型，但有AI总结内容，尝试获取keyinfo类型的总结
      const originalType = aiSummaryType.value;
      aiSummaryType.value = "keyinfo";
      
      try {
        // 生成关键信息总结
        const result = await generateAISummary(
          extractedData.value.text || "",
          extractedData.value
        );
        
        if (result && result.success) {
          aiKeyInfo = aiSummaryContent.value;
        }
      } catch (summaryError) {
        logger.error("生成关键信息总结失败", summaryError);
        // 继续执行，不阻止收藏/更新操作
      } finally {
        // 恢复原始类型
        aiSummaryType.value = originalType;
      }
    }

    // 获取AI全文总结
    let summarizer = null;
    
    // 首先尝试从缓存中获取全文总结
    const fullSummaryFromCache = loadAISummary(extractedData.value.url || "", "full");
    if (fullSummaryFromCache && fullSummaryFromCache.content) {
      summarizer = fullSummaryFromCache.content;
      logger.debug("从缓存中获取到全文总结");
    } else {
      // 如果缓存中没有，尝试从数据库获取
      try {
        const newsData = await getNews(extractedData.value.url || "");
        if (newsData && newsData.length > 0 && newsData[0].summarizer) {
          summarizer = newsData[0].summarizer;
          logger.debug("从数据库中获取到全文总结");
        } else if (aiSummaryType.value === "full" && aiSummaryContent.value) {
          // 如果数据库中没有，但当前显示的是全文总结，则使用当前内容
          summarizer = aiSummaryContent.value;
          logger.debug("使用当前显示的全文总结");
        } else if (extractedData.value.text) {
          // 如果以上都没有，但文本内容存在，尝试生成全文总结
          const originalType = aiSummaryType.value;
          aiSummaryType.value = "full";
          
          try {
            // 生成全文总结
            const result = await generateAISummary(
              extractedData.value.text,
              extractedData.value
            );
            
            if (result && result.success) {
              summarizer = aiSummaryContent.value;
              logger.debug("成功生成新的全文总结");
            }
          } catch (summaryError) {
            logger.error("生成全文总结失败", summaryError);
            // 继续执行，不阻止收藏/更新操作
          } finally {
            // 恢复原始类型
            aiSummaryType.value = originalType;
          }
        }
      } catch (error) {
        logger.error("获取全文总结时出错", error);
        // 继续执行，不阻止收藏/更新操作
      }
    }

    if (isBookmarked) {
      // 更新功能
      const { data, error: updateError } = await client
        .from("News")
        .update({
          text: extractedData.value.text,
          metadata: extractedData.value.meta ? JSON.stringify(extractedData.value.meta) : null,
          html: extractedData.value.html,
          images: extractedData.value.images,
          links: extractedData.value.links,
          title: extractedData.value.title,
          url: extractedData.value.url,
          article: extractedData.value.article,
          host: extractedData.value.host,
          word_count: extractedData.value.wordCount,
          ai_key_info: aiKeyInfo,
          summarizer: summarizer,
        })
        .eq("url", extractedData.value.url)
        .select();

      if (updateError) {
        logger.error("更新数据失败", updateError);
        error("更新数据失败");
      } else {
        success("数据更新成功！");
      }
    } else {
      // 收藏功能
      const { data, error: insertError } = await client
        .from("News")
        .insert({
          text: extractedData.value.text,
          metadata: extractedData.value.meta ? JSON.stringify(extractedData.value.meta) : null,
          html: extractedData.value.html,
          images: extractedData.value.images,
          links: extractedData.value.links,
          title: extractedData.value.title,
          url: extractedData.value.url,
          article: extractedData.value.article,
          host: extractedData.value.host,
          word_count: extractedData.value.wordCount,
          ai_key_info: aiKeyInfo,
          summarizer: summarizer,
        })
        .select();

      if (insertError) {
        logger.error("收藏失败", insertError);
        error("收藏失败");
      } else {
        success("收藏成功！");
        // 更新本地状态
        extractedData.value.isBookmarked = true;
        
        // 收藏成功后，将summarizer和ai_key_info数据保存到storage中
        if (extractedData.value.url) {
          logger.debug("收藏成功后，预加载summarizer和ai_key_info到storage");
          await preloadDataToStorage(extractedData.value.url);
        }
      }
    }
  } catch (err) {
    logger.error("收藏/更新操作出错", err);
    error("操作失败，请重试");
  } finally {
    // 重置收藏/更新按钮状态
    if (webInfoSectionRef.value) {
      webInfoSectionRef.value.resetButtonStates();
    }
  }
};

// 防抖函数已移至 utils/debounce.ts，这里直接导入使用

// 记录上一次处理的URL，避免重复处理
let lastProcessedUrl = "";
let isProcessing = false;

// 监听器
const setupTabListeners = () => {
  // 监听浏览器tab切换事件
  browser.tabs.onActivated.addListener(async (activeInfo: any) => {
    logger.debug("chrome.tabs.onActivated 被调用", { tabId: activeInfo.tabId });

    // 获取当前tab的URL
    browser.tabs.get(activeInfo.tabId, async (tab: any) => {
      logger.debug("Tab切换时获取到的tab信息", {
        id: tab.id,
        url: tab.url,
        status: tab.status,
        title: tab.title,
        lastProcessedUrl,
        isProcessing,
      });

      if (tab && tab.url && !isProcessing) {
        logger.debug("Tab切换时URL", { url: tab.url });
        lastProcessedUrl = tab.url;
        isProcessing = true;

        // 检查切换到的tab是否正在加载
        if (tab.status === "loading") {
          logger.debug("切换到的tab正在加载，设置loading状态");
          isPageLoading.value = true;
          clearPanelData();
        }

        try {
          // 当用户切换到不同的tab时，自动执行数据提取和AI总结加载
          await refreshDataForNewTab();
          
          // 检查是否是收藏数据，预加载数据库中的summarizer和ai_key_info到storage
          if (tab.url && extractedData.value.isBookmarked) {
            logger.debug("Tab切换时检测到收藏数据，预加载summarizer和ai_key_info到storage");
            await preloadDataToStorage(tab.url);
          }
          
          await loadAndDisplayAISummary(tab.url, "Tab切换");
        } finally {
          isProcessing = false;
          isPageLoading.value = false;
        }
      } else {
        logger.debug("Tab切换时跳过处理", {
          hasTab: !!tab,
          hasUrl: !!tab?.url,
          isProcessing,
        });
      }
    });
  });

  // 添加webNavigation API监听器
  if (browser.webNavigation) {
    console.log("webNavigation API is available");

    // 监听导航开始事件
    browser.webNavigation.onCommitted.addListener(async (details) => {
      logger.debug("webNavigation.onCommitted 被调用", {
        tabId: details.tabId,
        url: details.url,
        frameId: details.frameId,
        transitionType: details.transitionType,
        transitionQualifiers: details.transitionQualifiers,
      });

      // 只处理主框架的导航变化
      if (details.frameId === 0) {
        // 获取当前活动标签页
        const tabs = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tabs && tabs[0] && tabs[0].id === details.tabId && !isProcessing) {
          logger.debug("检测到导航开始，清空面板数据", { url: details.url });
          isPageLoading.value = true;
          clearPanelData();
          lastProcessedUrl = details.url;
        }
      }
    });

    // 监听导航完成事件
    browser.webNavigation.onCompleted.addListener(async (details) => {
      logger.debug("webNavigation.onCompleted 被调用", {
        tabId: details.tabId,
        url: details.url,
        frameId: details.frameId,
      });

      // 只处理主框架的导航完成
      if (details.frameId === 0) {
        // 获取当前活动标签页
        const tabs = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tabs && tabs[0] && tabs[0].id === details.tabId && !isProcessing) {
          logger.debug("检测到导航完成，重新提取数据", { url: details.url });
          isProcessing = true;
          isPageLoading.value = false;

          try {
            // 刷新数据
            await refreshDataForNewTab();

            // 检查是否是收藏数据，预加载数据库中的summarizer和ai_key_info到storage
            if (details.url && extractedData.value.isBookmarked) {
              logger.debug("导航完成时检测到收藏数据，预加载summarizer和ai_key_info到storage");
              await preloadDataToStorage(details.url);
            }

            // 加载AI总结
            await loadAndDisplayAISummary(details.url, "导航完成");
          } finally {
            isProcessing = false;
          }
        }
      }
    });

    // 监听导航错误事件
    browser.webNavigation.onErrorOccurred.addListener((details) => {
      logger.debug("webNavigation.onErrorOccurred 被调用", {
        tabId: details.tabId,
        url: details.url,
        frameId: details.frameId,
        error: details.error,
      });

      // 只处理主框架的导航错误
      if (details.frameId === 0) {
        // 获取当前活动标签页
        browser.tabs
          .query({ active: true, currentWindow: true })
          .then((tabs) => {
            if (tabs && tabs[0] && tabs[0].id === details.tabId) {
              logger.debug("检测到导航错误，取消加载状态", {
                url: details.url,
              });
              isPageLoading.value = false;
            }
          });
      }
    });
  } else {
    console.error("webNavigation API is not available");
  }
};

const removeTabListeners = () => {
  browser.tabs.onActivated.removeListener(() => {});

  // 移除webNavigation监听器
  if (browser.webNavigation) {
    browser.webNavigation.onCommitted.removeListener(() => {});
    browser.webNavigation.onCompleted.removeListener(() => {});
    browser.webNavigation.onErrorOccurred.removeListener(() => {});
  }
};

const clearPanelData = () => {
  // 清空提取的数据
  clearExtractedData();

  // 清空AI总结区域
  aiSummaryContent.value = "";
  aiSummaryStatus.value = "";
};

const refreshDataForNewTab = async () => {
  logger.debug("refreshDataForNewTab() 函数被调用");

  // 立即清空当前panel数据
  clearPanelData();

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
    // extractData函数内部会等待DOM完全加载
    await handleExtractData();
  }
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

// 生命周期钩子
onMounted(async () => {
  console.log("[DEBUG MODE:browser]", browser);
  // 初始化主题
  initializeTheme();

  // 加载设置
  loadSettings();

  // 同步暗色模式按钮状态与当前主题
  isDarkModeToggle.value = isDarkMode.value;

  // 清理过期数据
  cleanExpiredData();

  // 设置标签页监听器
  setupTabListeners();

  // 初始加载时自动提取当前页面数据
  await refreshDataForNewTab();

  // 加载当前页面的AI总结
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  if (tabs && tabs[0] && tabs[0].url) {
    await loadAndDisplayAISummary(tabs[0].url, "初始加载");
  }
});

onUnmounted(() => {
  // 移除标签页监听器
  removeTabListeners();
});

// 监听器
watch(aiSummaryType, async () => {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  if (tabs && tabs[0] && tabs[0].url) {
    const url = tabs[0].url;
    
    // 检查页面是否已收藏
    if (extractedData.value.isBookmarked) {
      // 如果页面已收藏，使用switchSummaryType函数，仅在storage中查找数据，不查询数据库
      const result = await switchSummaryType(url, aiSummaryType.value);
      
      // 如果storage中没有数据，则使用原来的loadAndDisplayAISummary函数（会查询数据库）
      if (!result.success) {
        logger.debug("storage中没有找到数据，尝试从数据库加载");
        await loadAndDisplayAISummary(url, "总结类型切换");
      }
    } else {
      // 如果页面未收藏，直接使用switchSummaryType函数，不查询数据库
      // 因为未收藏的页面必然没有在数据库内存储相关数据
      logger.debug("页面未收藏，仅从storage中查找数据，不查询数据库");
      await switchSummaryType(url, aiSummaryType.value);
    }
  }
});

watch(isDarkMode, (newValue) => {
  isDarkModeToggle.value = newValue;
});
</script>

<template>
  <div class="container">
    <!-- 标签页导航 -->
    <TabNavigation :current-tab="currentTab" @tab-change="switchTab" />

    <!-- 页面加载状态指示器 -->
    <div v-if="isPageLoading" class="loading-indicator">
      <div class="loading-spinner"></div>
      <div class="loading-text">页面加载中，请稍候...</div>
    </div>

    <!-- 网页标签页内容 -->
    <div
      v-show="currentTab === 'results' && !isPageLoading"
      class="tab-content active"
    >
      <!-- 统计信息 -->
      <StatsDisplay :stats="stats" :extracted-data="extractedData" :is-checking-bookmark="isCheckingBookmark" />

      <!-- 网页信息 -->
      <WebInfoSection
        ref="webInfoSectionRef"
        :extracted-data="extractedData"
        :is-checking-bookmark="isCheckingBookmark"
        @copy-all-data="handleCopyAllData"
        @refresh-data="handleExtractData"
        @export-data="handleExportData"
        @bookmark-action="handleBookmarkAction"
      />

      <!-- 图片 -->
      <ImageGrid
        :extracted-data="extractedData"
        :image-filter="imageFilter"
        @update:image-filter="(value) => (imageFilter = value)"
        @view-all-images="handleViewAllImages"
        @download-all-images="handleDownloadAllImages"
      />

      <!-- 链接 -->
      <LinkList
        :extracted-data="extractedData"
        :link-filter="linkFilter"
        @update:link-filter="(value) => (linkFilter = value)"
        @view-all-links="handleViewAllLinks"
      />
    </div>

    <!-- AI标签页内容 -->
    <div
      v-show="currentTab === 'ai' && !isPageLoading"
      class="tab-content active"
    >
      <AISummaryPanel
        :ai-summary-content="aiSummaryContent"
        :ai-summary-status="aiSummaryStatus"
        :ai-summary-type="aiSummaryType"
        :isLoadingAISummary="isLoadingAISummary"
        :isExtracting="isExtracting"
        :isPageLoading="isPageLoading"
        :isQueryingDatabase="isQueryingDatabase"
        @generate-ai-summary="handleGenerateAISummary"
        @copy-summary="handleCopySummary"
        @clear-cache="handleClearCache"
        @update:aiSummaryType="(value) => (aiSummaryType = value)"
      />
    </div>

    <!-- 设置标签页内容 -->
    <div
      v-show="currentTab === 'settings' && !isPageLoading"
      class="tab-content active"
    >
      <SettingsPanel
        :settings="settings"
        :is-dark-mode="isDarkModeToggle"
        @save-settings="handleSaveSettings"
        @clear-data="handleClearData"
        @toggle-dark-mode="handleToggleDarkMode"
        @update:settings="(value) => Object.assign(settings, value)"
      />
    </div>
  </div>

  <!-- Toast通知容器 -->
  <div id="toast-container" class="toast-container"></div>
</template>

<style scoped>
/* 组件特定样式 - 全局颜色变量已移至 style.css */

.container {
  padding: 15px;
  flex: 1;
  overflow-y: auto;
  min-width: 300px;
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
  display: block;
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
