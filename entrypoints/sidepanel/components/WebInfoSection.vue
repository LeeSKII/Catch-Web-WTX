<template>
  <div class="settings-container">
    <!-- 页面加载状态指示器 -->
    <div v-if="isPageLoading" class="loading-indicator">
      <div class="loading-spinner"></div>
      <div class="loading-text">页面加载中，请稍候...</div>
    </div>

    <!-- 结果内容（在加载时隐藏） -->
    <div v-show="!isPageLoading">
      <div class="section">
        <!-- 统计信息 -->
        <StatsDisplay
          :stats="stats.value"
          :extracted-data="extractedData"
          :is-checking-bookmark="isCheckingBookmark"
        />
        <div class="action-section">
          <div class="action-title">数据管理</div>
          <div class="action-buttons">
            <button
              :class="[
                'btn btn-refresh',
                { 'btn-loading': isRefreshButtonDisabled },
              ]"
              @click="handleRefreshData"
              :disabled="isRefreshButtonDisabled"
            >
              {{ isRefreshButtonDisabled ? "刷新中" : "刷新数据" }}
            </button>
            <button
              :class="[
                extractedData.isBookmarked
                  ? 'btn btn-update'
                  : 'btn btn-bookmark',
                {
                  'btn-loading':
                    isBookmarkButtonDisabled ||
                    isCheckingBookmark,
                },
              ]"
              @click="handleBookmarkAction"
              :disabled="
                isBookmarkButtonDisabled ||
                isCheckingBookmark
              "
            >
              <span
                v-if="
                  isBookmarkButtonDisabled ||
                  isCheckingBookmark
                "
                class="loading-icon"
              >
                <svg class="spinner" viewBox="0 0 50 50">
                  <circle
                    class="path"
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke-width="5"
                  ></circle>
                </svg>
              </span>
              <span v-else>{{
                extractedData.isBookmarked ? "更新" : "收藏"
              }}</span>
            </button>
          </div>
        </div>
        <div class="section-title">
          <span>网页信息</span>
          <div>
            <button class="btn btn-secondary" @click="$emit('copy-all-data')">
              复制全部
            </button>
            <button class="btn btn-primary" @click="$emit('export-data')">
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

    <!-- 查看全部图片模态框 -->
    <ImageModal
      :show="showAllImagesModal"
      :images="extractedData.images"
      @close="showAllImagesModal = false"
    />

    <!-- 查看全部链接模态框 -->
    <LinkModal
      :show="showAllLinksModal"
      :links="extractedData.links"
      :link-filter="linkFilter"
      @close="showAllLinksModal = false"
      @update:link-filter="(value) => linkFilter = value"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from "vue";
import type { ExtractedData } from "../types";
import StatsDisplay from "./StatsDisplay.vue";
import ImageGrid from "./ImageGrid.vue";
import ImageModal from "./ImageModal.vue";
import LinkModal from "./LinkModal.vue";
import LinkList from "./LinkList.vue";
import { useStores } from "../stores";
import { useBookmark } from "../composables/useBookmark";
import { getSupabaseClient } from "../composables/useSupabase";
import { useAISummary } from "../composables/useAISummary";
import { createLogger } from "../utils/logger";

// 创建日志器
const logger = createLogger("WebInfoSection");

// 使用全局状态管理
const { dataStore, uiStore } = useStores();

// 使用 composables
const { checkBookmarkStatus, isCheckingBookmark } = useBookmark();
const { getNews, preloadDataToStorage, loadAISummary, generateAISummary, aiSummaryContent, aiSummaryType } = useAISummary();

// 获取Supabase客户端单例实例
const client = getSupabaseClient();

const emit = defineEmits<{
  "copy-all-data": [];
  "refresh-data": [];
  "export-data": [];
  "bookmark-action": [isBookmarked: boolean];
  "download-all-images": [];
}>();

// 组件内部状态
const isBookmarkButtonDisabled = ref(false);
const isRefreshButtonDisabled = ref(false);
const imageFilter = ref("");
const linkFilter = ref("");
const showAllImagesModal = ref(false);
const showAllLinksModal = ref(false);

// 从store获取数据
const extractedData = computed(() => dataStore.state.extractedData);
const isPageLoading = computed(() => dataStore.state.isPageLoading);
const stats = computed(() => dataStore.stats);

// 智能监听数据提取完成并检查收藏状态
watch(
  [() => extractedData.value.url, () => extractedData.value.title, () => isPageLoading.value],
  async ([url, title, pageLoading], [prevUrl, prevTitle, prevPageLoading]) => {
    // 当URL和标题都存在，且页面不在加载状态时，检查收藏状态
    if (url && title && !pageLoading) {
      // 避免重复检查：只有当URL发生变化或者从加载状态变为非加载状态时才检查
      const urlChanged = url !== prevUrl;
      const loadingFinished = prevPageLoading === true && pageLoading === false;
      
      if (urlChanged || loadingFinished) {
        try {
          logger.debug("开始检查收藏状态", { url, urlChanged, loadingFinished });
          const isBookmarked = await checkBookmarkStatus(url);
          // 更新本地状态中的收藏状态
          dataStore.updateExtractedData({
            ...extractedData.value,
            isBookmarked
          });
          logger.debug("收藏状态检查完成", { url, isBookmarked });
        } catch (error) {
          logger.error("检查收藏状态失败", error);
        }
      }
    }
  },
  { immediate: true }
);


// 方法
const handleBookmarkAction = async () => {
  if (extractedData.value.isBookmarked === undefined || isBookmarkButtonDisabled.value) {
    return;
  }

  try {
    isBookmarkButtonDisabled.value = true;
    // isCheckingBookmarkStatus.value = true; // 不再需要，因为useBookmark中的isCheckingBookmark会自动管理

    if (!extractedData.value.url) {
      uiStore.showToast("无法获取URL，请先提取数据", "error");
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

    if (extractedData.value.isBookmarked) {
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
        uiStore.showToast("更新数据失败", "error");
      } else {
        uiStore.showToast("数据更新成功！", "success");
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
        uiStore.showToast("收藏失败", "error");
      } else {
        uiStore.showToast("收藏成功！", "success");
        // 更新本地状态
        dataStore.updateExtractedData({
          ...extractedData.value,
          isBookmarked: true
        });
        
        // 收藏成功后，将summarizer和ai_key_info数据保存到storage中
        if (extractedData.value.url) {
          logger.debug("收藏成功后，预加载summarizer和ai_key_info到storage");
          await preloadDataToStorage(extractedData.value.url);
        }
      }
    }
  } catch (err) {
    logger.error("收藏/更新操作出错", err);
    uiStore.showToast("操作失败，请重试", "error");
  } finally {
    isBookmarkButtonDisabled.value = false;
    // isCheckingBookmarkStatus.value = false; // 不再需要，因为useBookmark中的isCheckingBookmark会自动管理
  }
};

const handleRefreshData = () => {
  if (!isRefreshButtonDisabled.value) {
    isRefreshButtonDisabled.value = true;
    emit("refresh-data");
  }
};

// 重置按钮状态的方法
const resetButtonStates = () => {
  isBookmarkButtonDisabled.value = false;
  isRefreshButtonDisabled.value = false;
  // isCheckingBookmarkStatus.value = false; // 不再需要，因为useBookmark中的isCheckingBookmark会自动管理
};

// 暴露方法给父组件
defineExpose({
  resetButtonStates,
});

// 事件处理函数
const handleViewAllImages = () => {
  if (!extractedData.value.images || extractedData.value.images.length === 0) {
    return;
  }

  // 直接在组件内部管理模态框状态
  showAllImagesModal.value = true;
};

const handleDownloadAllImages = () => {
  emit("download-all-images");
};

const handleViewAllLinks = () => {
  if (!extractedData.value.links || extractedData.value.links.length === 0) {
    return;
  }

  // 直接在组件内部管理模态框状态
  showAllLinksModal.value = true;
};
</script>

<style scoped>
.settings-container {
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  padding-right: 10px;
}

/* 自定义滚动条样式 */
.settings-container::-webkit-scrollbar {
  width: 6px;
}

.settings-container::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
  border-radius: 3px;
}

.settings-container::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 3px;
}

.settings-container::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}
.section {
  background: var(--section-bg);
  border-radius: var(--border-radius);
  margin-bottom: 15px;
  box-shadow: var(--box-shadow);
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-weight: 600;
  color: var(--section-title-color);
}

.action-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding: 8px 12px;
  background: var(--section-bg);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
}

.action-title {
  font-weight: 600;
  color: var(--section-title-color);
  font-size: 14px;
}

.action-buttons {
  display: flex;
  gap: 8px;
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

.btn:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}

.btn-refresh {
  background: #ff6b35;
  color: white;
  font-weight: bold;
  border: 2px solid #ff6b35;
  box-shadow: 0 2px 5px rgba(255, 107, 53, 0.3);
}

.btn-refresh:hover {
  background: #e55a2b;
  border-color: #e55a2b;
  box-shadow: 0 4px 8px rgba(255, 107, 53, 0.4);
}

.btn-bookmark {
  background: #28a745;
  color: white;
}

.btn-bookmark:hover {
  background: #218838;
  border-color: #218838;
}

.btn-update {
  background: #17a2b8;
  color: white;
}

.btn-update:hover {
  background: #138496;
  border-color: #138496;
}

.btn-loading {
  background: #6c757d !important;
  color: white !important;
  border-color: #6c757d !important;
  cursor: not-allowed;
  opacity: 0.8;
}

.btn-loading:hover {
  background: #6c757d !important;
  border-color: #6c757d !important;
  transform: none;
}
.loading-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
}

.spinner {
  animation: rotate 2s linear infinite;
  width: 16px;
  height: 16px;
}

.spinner .path {
  stroke: white;
  stroke-linecap: round;
  animation: dash 1.5s ease-in-out infinite;
}

@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes dash {
  0% {
    stroke-dasharray: 1, 150;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -35;
  }
  100% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -124;
  }
}

/* Loading indicator styles */
.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 15px;
  color: var(--text-color);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border-color);
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  font-size: 14px;
  color: var(--text-secondary);
  text-align: center;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
