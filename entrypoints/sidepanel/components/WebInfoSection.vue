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
          :stats="stats"
          :extracted-data="props.extractedData"
          :is-checking-bookmark="props.isCheckingBookmark"
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
                    isCheckingBookmark ||
                    extractedData.isBookmarked === undefined,
                },
              ]"
              @click="handleBookmarkAction"
              :disabled="
                isBookmarkButtonDisabled ||
                isCheckingBookmark ||
                extractedData.isBookmarked === undefined
              "
            >
              <span
                v-if="
                  isBookmarkButtonDisabled ||
                  isCheckingBookmark ||
                  extractedData.isBookmarked === undefined
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
import { ref } from "vue";
import type { ExtractedData } from "../types";
import StatsDisplay from "./StatsDisplay.vue";
import ImageGrid from "./ImageGrid.vue";
import ImageModal from "./ImageModal.vue";
import LinkModal from "./LinkModal.vue";
import LinkList from "./LinkList.vue";
import { computed } from "vue";

const props = defineProps<{
  extractedData: ExtractedData;
  isCheckingBookmark: boolean;
  isPageLoading: boolean;
}>();

const emit = defineEmits<{
  "copy-all-data": [];
  "refresh-data": [];
  "export-data": [];
  "bookmark-action": [isBookmarked: boolean];
  "download-all-images": [];
  "update:image-filter": [value: string];
  "update:link-filter": [value: string];
}>();

// 按钮禁用状态
const isBookmarkButtonDisabled = ref(false);
const isRefreshButtonDisabled = ref(false);
const imageFilter = ref("");
const linkFilter = ref("");
const showAllImagesModal = ref(false); // 新增：显示所有图片模态框
const showAllLinksModal = ref(false); // 新增：显示所有链接模态框

const handleBookmarkAction = () => {
  if (
    props.extractedData.isBookmarked !== undefined &&
    !isBookmarkButtonDisabled.value
  ) {
    isBookmarkButtonDisabled.value = true;
    emit("bookmark-action", props.extractedData.isBookmarked);
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
};

// 暴露方法给父组件
defineExpose({
  resetButtonStates,
});

// 计算属性
const stats = computed(() => ({
  imagesCount: props.extractedData.images?.length || 0,
  linksCount: props.extractedData.links?.length || 0,
  wordsCount: props.extractedData.wordCount || 0,
}));

// 事件处理函数
const handleViewAllImages = () => {
  if (!props.extractedData.images || props.extractedData.images.length === 0) {
    return;
  }

  // 直接在组件内部管理模态框状态
  showAllImagesModal.value = true;
};

const handleDownloadAllImages = () => {
  emit("download-all-images");
};

const handleViewAllLinks = () => {
  if (!props.extractedData.links || props.extractedData.links.length === 0) {
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
