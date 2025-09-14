<script lang="ts" setup>
import { ref, reactive, onMounted, onUnmounted, computed, watch } from "vue";
import { useToast } from "./composables/useToast";
import { useTheme } from "./composables/useTheme";
import { useSettings } from "./composables/useSettings";
import { useDataExtractor } from "./composables/useDataExtractor";
import { useAISummary } from "./composables/useAISummary";
import { marked } from 'marked';

// 声明全局变量
declare const chrome: any;

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
const {
  isLoadingAISummary,
  aiSummaryContent,
  aiSummaryStatus,
  aiSummaryType,
  generateAISummary,
  loadAndDisplayAISummary,
  clearAISummaryCache,
} = useAISummary();

// 响应式数据
const currentTab = ref("results");
const imageFilter = ref("");
const linkFilter = ref("");
const isDarkModeToggle = ref(false);

// 计算属性
const filteredImages = computed(() => {
  if (!extractedData.value.images) return [];

  if (!imageFilter.value) {
    return extractedData.value.images.slice(0, 12);
  }

  return extractedData.value.images.filter(
    (img) =>
      img.src.toLowerCase().includes(imageFilter.value.toLowerCase()) ||
      (img.alt &&
        img.alt.toLowerCase().includes(imageFilter.value.toLowerCase()))
  );
});

const filteredLinks = computed(() => {
  if (!extractedData.value.links) return [];

  if (!linkFilter.value) {
    return extractedData.value.links.slice(0, 10);
  }

  return extractedData.value.links.filter(
    (link) =>
      link.href.toLowerCase().includes(linkFilter.value.toLowerCase()) ||
      (link.text &&
        link.text.toLowerCase().includes(linkFilter.value.toLowerCase()))
  );
});

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

  const result = await extractData(options);

  if (result.success && result.data) {
    success("数据提取成功！");
    saveExtractedData(result.data);

    // 加载当前页面的AI总结
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0] && tabs[0].url) {
      await loadAndDisplayAISummary(tabs[0].url, "数据提取");
    }
  } else {
    error(result.message || "数据提取失败");
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
      console.error("复制失败:", err);
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
      console.error("复制失败:", err);
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

  chrome.downloads.download({
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
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
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

  chrome.tabs.create({
    url: chrome.runtime.getURL("image-viewer.html"),
  });
};

const handleDownloadAllImages = () => {
  if (!extractedData.value.images || extractedData.value.images.length === 0) {
    warning("没有可下载的图片");
    return;
  }

  success(`开始下载 ${extractedData.value.images.length} 张图片`);

  extractedData.value.images?.forEach((img, index) => {
    if (img && img.src) {
      chrome.downloads.download({
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

  chrome.tabs.create({
    url: chrome.runtime.getURL("link-viewer.html"),
  });
};

const handleToggleDarkMode = () => {
  toggle();
  isDarkModeToggle.value = !isDarkModeToggle.value;
};

const handleSaveSettings = () => {
  saveSettings();
  success("设置已保存！");
};

const handleSaveExtractSettings = () => {
  saveSettings();
  success("提取设置已保存！");
};

// 监听器
const setupTabListeners = () => {
  // 监听浏览器tab切换事件
  chrome.tabs.onActivated.addListener(async (activeInfo: any) => {
    console.log(
      "[DEBUG-AI] chrome.tabs.onActivated 被调用，tabId:",
      activeInfo.tabId
    );

    // 当用户切换到不同的tab时，自动执行数据提取和AI总结加载
    await refreshDataForNewTab();

    // 获取当前tab的URL并调用统一的AI总结加载函数
    chrome.tabs.get(activeInfo.tabId, async (tab: any) => {
      if (tab && tab.url) {
        console.log("[DEBUG-AI] Tab切换时URL:", tab.url);
        await loadAndDisplayAISummary(tab.url, "Tab切换");
      }
    });
  });

  // 监听当前tab的URL变化
  chrome.tabs.onUpdated.addListener(
    async (tabId: number, changeInfo: any, tab: any) => {
      console.log(
        "[DEBUG-AI] chrome.tabs.onUpdated 被调用，tabId:",
        tabId,
        "changeInfo:",
        changeInfo,
        "tab.active:",
        tab.active
      );

      // 如果URL发生变化且是当前活动标签页，立即清空面板内容
      if (changeInfo.url && tab.active) {
        console.log("[DEBUG-AI] 检测到URL变化，立即清空面板内容");
        clearPanelData();
      }

      // 立即刷新数据
      await refreshDataForNewTab();

      // 获取当前URL并调用统一的AI总结加载函数
      if (tab.url) {
        console.log("[DEBUG-AI] URL更新时处理URL:", tab.url);
        await loadAndDisplayAISummary(tab.url, "URL更新");
      }
    }
  );
};

const removeTabListeners = () => {
  chrome.tabs.onActivated.removeListener(() => {});
  chrome.tabs.onUpdated.removeListener(() => {});
};

const clearPanelData = () => {
  // 清空提取的数据
  clearExtractedData();

  // 清空AI总结区域
  aiSummaryContent.value = "";
  aiSummaryStatus.value = "";
};

const refreshDataForNewTab = async () => {
  console.log("[DEBUG] refreshDataForNewTab() 函数被调用");

  // 立即清空当前panel数据
  clearPanelData();

  // 获取当前tab的加载状态
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs || !tabs[0]) {
    console.log("[DEBUG] 无法获取当前tab信息");
    return;
  }

  const currentTab = tabs[0];
  console.log("[DEBUG] 当前tab状态:", currentTab.status);

  // 检查页面是否正在加载
  if (currentTab.status === "loading") {
    console.log("[DEBUG] 页面正在加载中，保持loading状态");

    // 等待页面加载完成
    await waitForPageLoadComplete(currentTab.id);
  } else {
    console.log("[DEBUG] 页面已加载完成，立即提取数据");

    // 延迟执行以确保新页面已完全加载
    setTimeout(async () => {
      console.log(
        "[DEBUG] 在refreshDataForNewTab的setTimeout中调用extractData()"
      );
      // 提取新页面的数据
      await handleExtractData();
    }, 500);
  }
};

const waitForPageLoadComplete = (tabId: number) => {
  console.log("[DEBUG] 开始等待页面加载完成，tabId:", tabId);

  // 设置超时时间，防止无限等待
  const timeout = setTimeout(() => {
    console.log("[DEBUG] 页面加载超时，强制执行数据提取");
    proceedWithDataExtraction();
  }, 30000); // 30秒超时

  // 监听tab更新事件
  const updateListener = (updatedTabId: number, changeInfo: any, tab: any) => {
    if (updatedTabId === tabId && changeInfo.status === "complete") {
      console.log("[DEBUG] 检测到页面加载完成");
      clearTimeout(timeout);
      chrome.tabs.onUpdated.removeListener(updateListener);
      proceedWithDataExtraction();
    }
  };

  chrome.tabs.onUpdated.addListener(updateListener);

  // 检查当前tab是否已经加载完成（防止在添加监听器之前就已经完成）
  chrome.tabs.get(tabId, (tab: any) => {
    if (chrome.runtime.lastError) {
      console.error("[DEBUG] 获取tab信息失败:", chrome.runtime.lastError);
      clearTimeout(timeout);
      chrome.tabs.onUpdated.removeListener(updateListener);
      return;
    }

    if (tab.status === "complete") {
      console.log("[DEBUG] 当前tab已经加载完成");
      clearTimeout(timeout);
      chrome.tabs.onUpdated.removeListener(updateListener);
      proceedWithDataExtraction();
    }
  });
};

const proceedWithDataExtraction = async () => {
  console.log("[DEBUG-AI] proceedWithDataExtraction() 开始执行");

  // 提取新页面的数据
  await handleExtractData();

  // 获取当前URL的新闻数据
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs && tabs[0] && tabs[0].url) {
    console.log("[DEBUG-AI] proceedWithDataExtraction中处理URL:", tabs[0].url);
    await loadAndDisplayAISummary(tabs[0].url, "proceedWithDataExtraction");
  }
};

// 生命周期钩子
onMounted(async () => {
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

  // 默认自动提取
  await handleExtractData();
});

onUnmounted(() => {
  // 移除标签页监听器
  removeTabListeners();
});

// 监听器
watch(aiSummaryType, async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs && tabs[0] && tabs[0].url) {
    await loadAndDisplayAISummary(tabs[0].url, "总结类型切换");
  }
});

watch(isDarkMode, (newValue) => {
  isDarkModeToggle.value = newValue;
});
</script>

<template>
  <div class="container">
    <!-- 标签页导航 -->
    <div class="tabs">
      <button
        class="tab"
        :class="{ active: currentTab === 'results' }"
        @click="switchTab('results')"
      >
        网页
      </button>
      <button
        class="tab"
        :class="{ active: currentTab === 'ai' }"
        @click="switchTab('ai')"
      >
        AI
      </button>
      <button
        class="tab"
        :class="{ active: currentTab === 'settings' }"
        @click="switchTab('settings')"
      >
        设置
      </button>
    </div>

    <!-- 网页标签页内容 -->
    <div v-show="currentTab === 'results'" class="tab-content active">
      <!-- 统计信息 -->
      <div class="stats">
        <div class="stat-item">
          <div class="stat-value">{{ stats.imagesCount }}</div>
          <div class="stat-label">图片</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ stats.linksCount }}</div>
          <div class="stat-label">链接</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ stats.wordsCount }}</div>
          <div class="stat-label">字数</div>
        </div>
      </div>

      <!-- 网页信息 -->
      <div class="section">
        <div class="section-title">
          <span>网页信息</span>
          <div>
            <button class="btn btn-secondary" @click="handleCopyAllData">
              复制全部
            </button>
            <button class="btn btn-primary" @click="handleExportData">
              导出数据
            </button>
          </div>
        </div>
        <div class="section-content">
          <div v-if="extractedData.title">
            <strong>标题:</strong>
            <span :title="extractedData.title">
              {{
                extractedData.title.length > 50
                  ? extractedData.title.substring(0, 50) + "..."
                  : extractedData.title
              }}
            </span>
          </div>
          <div v-if="extractedData.host">
            <strong>主域名:</strong> {{ extractedData.host }}
          </div>
          <div v-if="extractedData.wordCount">
            <strong>字数:</strong> {{ extractedData.wordCount }}
          </div>
          <div v-if="extractedData.article !== undefined">
            <strong>文章内容:</strong>
            <span v-if="extractedData.article" :title="extractedData.article">
              {{
                extractedData.article.length > 100
                  ? extractedData.article.substring(0, 100) + "..."
                  : extractedData.article
              }}
            </span>
            <span v-else>未找到article标签</span>
          </div>
        </div>
      </div>

      <!-- 图片 -->
      <div
        v-if="extractedData.images && extractedData.images.length > 0"
        class="section"
      >
        <div class="section-title">
          <span>图片</span>
          <div>
            <button class="btn btn-secondary" @click="handleViewAllImages">
              查看全部
            </button>
            <button class="btn btn-success" @click="handleDownloadAllImages">
              下载全部
            </button>
          </div>
        </div>
        <div class="filter-box">
          <input
            type="text"
            class="filter-input"
            v-model="imageFilter"
            placeholder="过滤图片..."
          />
        </div>
        <div class="image-grid">
          <div
            v-for="(img, index) in filteredImages"
            :key="index"
            class="image-item"
          >
            <img :src="img.src" :alt="img.alt || '无描述'" />
            <div class="image-info">{{ img.width }}x{{ img.height }}</div>
          </div>
          <div
            v-if="
              extractedData.images.length > 12 && filteredImages.length === 12
            "
            class="image-item"
            style="
              display: flex;
              align-items: center;
              justify-content: center;
              background: #f0f0f0;
            "
          >
            <div>+{{ extractedData.images.length - 12 }}更多</div>
          </div>
        </div>
      </div>

      <!-- 链接 -->
      <div
        v-if="extractedData.links && extractedData.links.length > 0"
        class="section"
      >
        <div class="section-title">
          <span>链接</span>
          <button class="btn btn-secondary" @click="handleViewAllLinks">
            查看全部
          </button>
        </div>
        <div class="filter-box">
          <input
            type="text"
            class="filter-input"
            v-model="linkFilter"
            placeholder="过滤链接..."
          />
        </div>
        <div class="section-content">
          <div v-for="(link, index) in filteredLinks" :key="index">
            <strong :title="link.text"
              >{{
                link.text.length > 30
                  ? link.text.substring(0, 30) + "..."
                  : link.text
              }}:</strong
            >
            <a :href="link.href" target="_blank" :title="link.href">
              {{
                link.href.length > 50
                  ? link.href.substring(0, 50) + "..."
                  : link.href
              }}
            </a>
          </div>
          <div
            v-if="
              extractedData.links.length > 10 && filteredLinks.length === 10
            "
          >
            ... 还有 {{ extractedData.links.length - 10 }} 个链接
          </div>
        </div>
      </div>
    </div>

    <!-- AI标签页内容 -->
    <div v-show="currentTab === 'ai'" class="tab-content active">
      <div class="section">
        <div class="section-title">
          <span>AI总结选项</span>
        </div>

        <div style="display: flex; gap: 10px; margin-bottom: 15px">
          <label style="flex: 1; text-align: center; margin: 0">
            <input type="radio" v-model="aiSummaryType" value="full" /> 全文总结
          </label>
          <label style="flex: 1; text-align: center; margin: 0">
            <input type="radio" v-model="aiSummaryType" value="keyinfo" />
            关键信息
          </label>
        </div>

        <div style="display: flex; gap: 10px">
          <button
            class="btn btn-primary"
            style="flex: 1"
            @click="handleGenerateAISummary"
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
            v-html="marked.parse(aiSummaryContent)"
          ></div>
          <div v-else style="text-align: center; color: #666; padding: 20px">
            点击"AI总结"按钮开始生成网页内容总结
          </div>
        </div>
        <!-- 缓存状态和生成时间显示区域 -->
        <div
          v-if="aiSummaryStatus"
          style="
            font-size: 12px;
            color: #666;
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

    <!-- 设置标签页内容 -->
    <div v-show="currentTab === 'settings'" class="tab-content active">
      <div class="section">
        <div class="section-title">提取选项</div>

        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" v-model="settings.extractHtml" /> HTML内容
          </label>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" v-model="settings.extractText" /> 文本内容
          </label>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" v-model="settings.extractImages" /> 图片信息
          </label>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" v-model="settings.extractLinks" /> 链接信息
          </label>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" v-model="settings.extractMeta" /> 元数据
          </label>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" v-model="settings.extractArticle" /> 文章内容
          </label>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" v-model="settings.extractStyles" /> CSS样式
          </label>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" v-model="settings.extractScripts" /> 脚本信息
          </label>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 10px">
          <button
            class="btn btn-primary"
            style="flex: 1"
            @click="handleExtractData"
          >
            <span>🔍</span> 开始提取
          </button>
          <button
            class="btn btn-secondary"
            style="flex: 1"
            @click="handleSaveExtractSettings"
          >
            <span>💾</span> 保存设置
          </button>
        </div>
      </div>

      <div class="section">
        <div class="section-title">应用设置</div>

        <div class="setting-item">
          <label class="setting-label">显示图片预览</label>
          <label class="toggle-switch">
            <input type="checkbox" v-model="settings.showPreviews" />
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <label class="setting-label">暗色模式</label>
          <label class="toggle-switch">
            <input
              type="checkbox"
              v-model="isDarkModeToggle"
              @change="handleToggleDarkMode"
            />
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <label class="setting-label">数据保留时间</label>
          <select v-model="settings.dataRetention" class="filter-input">
            <option value="1">1天</option>
            <option value="7">7天</option>
            <option value="30">30天</option>
            <option value="0">永久</option>
          </select>
        </div>
      </div>

      <div class="section">
        <div class="section-title">AI设置</div>

        <div class="setting-item">
          <label class="setting-label">OpenAI API密钥</label>
          <input
            type="password"
            v-model="settings.openaiApiKey"
            class="filter-input"
            placeholder="输入您的OpenAI API密钥"
          />
          <div style="font-size: 11px; color: #666; margin-top: 5px">
            您的API密钥将安全存储在本地，不会上传到任何服务器
          </div>
        </div>

        <div class="setting-item">
          <label class="setting-label">OpenAI Base URL</label>
          <input
            type="text"
            v-model="settings.openaiBaseUrl"
            class="filter-input"
            placeholder="https://api.openai.com/v1"
          />
          <div style="font-size: 11px; color: #666; margin-top: 5px">
            如需使用自定义API端点，请修改此URL
          </div>
        </div>

        <div class="setting-item">
          <label class="setting-label">AI模型</label>
          <input
            type="text"
            v-model="settings.aiModel"
            class="filter-input"
            placeholder="gpt-3.5-turbo"
          />
          <div style="font-size: 11px; color: #666; margin-top: 5px">
            输入要使用的AI模型名称，如：gpt-3.5-turbo, gpt-4,
            claude-3-sonnet-20240229等
          </div>
        </div>

        <button class="btn btn-primary" @click="handleSaveSettings">
          保存设置
        </button>
        <button
          class="btn btn-warning"
          style="margin-top: 10px"
          @click="handleClearData"
        >
          清除数据
        </button>
      </div>
    </div>
  </div>

  <!-- Toast通知容器 -->
  <div id="toast-container" class="toast-container"></div>
</template>

<style scoped>
/* 从 sidepanel.css 迁移样式 */
:root {
  --primary-color: #4361ee;
  --secondary-color: #3a0ca3;
  --accent-color: #7209b7;
  --light-color: #f8f9fa;
  --dark-color: #212529;
  --success-color: #4cc9f0;
  --warning-color: #f72585;
  --border-radius: 8px;
  --box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  --section-bg: white;
  --section-content-bg: #f9f9f9;
  --border-color: #eee;
  --tab-bg: white;
  --section-title-color: var(--secondary-color);
  --section-title-dark-color: #8b9cff;
  --tab-text-color: var(--dark-color);
  --tab-text-dark-color: #ffffff;
  --markdown-bg-light: #f0f0f0;
  --markdown-bg-dark: #2d2d2d;
  --markdown-border-light: #ddd;
  --markdown-border-dark: #555;
  --markdown-text-light: #666;
  --markdown-text-dark: #ccc;
}

* {
  box-sizing: border-box;
  transition: all 0.3s ease;
}

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
  border: 1px solid #ddd;
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
  color: #666;
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
  background: #f5f5f5;
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

/* 加载动画 */
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Markdown样式 */
#streaming-content h1,
#streaming-content h2,
#streaming-content h3,
#streaming-content h4,
#streaming-content h5,
#streaming-content h6 {
  color: var(--section-title-color);
  margin-top: 4px;
  margin-bottom: 2px;
  font-size: 1.05em;
}

#streaming-content p {
  margin-bottom: 3px;
  line-height: 1.5;
}

#streaming-content ul,
#streaming-content ol {
  margin-bottom: 3px;
  padding-left: 16px;
}

#streaming-content li {
  margin-bottom: 1px;
}

#streaming-content blockquote {
  border-left: 3px solid var(--primary-color);
  padding-left: 6px;
  margin: 3px 0;
  color: var(--markdown-text-light);
  font-size: 0.9em;
}

#streaming-content code {
  background-color: var(--markdown-bg-light);
  padding: 1px 2px;
  border-radius: 2px;
  font-family: monospace;
  font-size: 0.85em;
}

#streaming-content pre {
  background-color: var(--markdown-bg-light);
  padding: 4px;
  border-radius: 3px;
  overflow-x: auto;
  margin-bottom: 4px;
  font-size: 0.85em;
}

#streaming-content pre code {
  background-color: transparent;
  padding: 0;
}

#streaming-content strong {
  font-weight: bold;
}

#streaming-content em {
  font-style: italic;
}

#streaming-content hr {
  border: none;
  border-top: 1px solid var(--markdown-border-light);
  margin: 5px 0;
}

#streaming-content table {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 4px;
  font-size: 0.85em;
}

#streaming-content th,
#streaming-content td {
  border: 1px solid var(--markdown-border-light);
  padding: 2px 4px;
  text-align: left;
}

#streaming-content th {
  background-color: var(--markdown-bg-light);
  font-weight: bold;
}

/* 暗色模式下的Markdown样式 */
:global([data-theme="dark"]) #streaming-content blockquote {
  color: var(--markdown-text-dark);
}

:global([data-theme="dark"]) #streaming-content code {
  background-color: var(--markdown-bg-dark);
  color: var(--markdown-text-dark);
}

:global([data-theme="dark"]) #streaming-content pre {
  background-color: var(--markdown-bg-dark);
  color: var(--markdown-text-dark);
}

:global([data-theme="dark"]) #streaming-content hr {
  border-top: 1px solid var(--markdown-border-dark);
}

:global([data-theme="dark"]) #streaming-content th,
:global([data-theme="dark"]) #streaming-content td {
  border: 1px solid var(--markdown-border-dark);
}

:global([data-theme="dark"]) #streaming-content th {
  background-color: var(--markdown-bg-dark);
  color: var(--markdown-text-dark);
}

:global([data-theme="dark"]) #streaming-content td {
  color: var(--markdown-text-dark);
}

/* Toast通知系统样式 */
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toast {
  min-width: 250px;
  padding: 12px 20px;
  border-radius: 8px;
  color: white;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: space-between;
  animation: slideIn 0.3s ease-out;
}

.toast-success {
  background-color: var(--success-color);
}

.toast-error {
  background-color: var(--warning-color);
}

.toast-warning {
  background-color: #ff9800;
}

.toast-info {
  background-color: var(--primary-color);
}

.toast-close {
  margin-left: 15px;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOut {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

/* 响应式设计 */
@media (max-width: 400px) {
  .tabs {
    flex-direction: row;
  }

  .tab {
    margin-bottom: 2px;
  }

  .image-grid {
    grid-template-columns: repeat(1, 1fr);
  }
}

@media (min-width: 401px) and (max-width: 600px) {
  .image-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 601px) {
  .image-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

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
</style>
