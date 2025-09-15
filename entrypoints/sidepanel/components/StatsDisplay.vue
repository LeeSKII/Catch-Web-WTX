<template>
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
    <div class="stat-item">
      <div v-if="extractedData.isBookmarked !== undefined" class="bookmark-icon">
        <svg v-if="extractedData.isBookmarked" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="bookmarked">
          <path d="M5 5v14l7-7 7 7V5z"/>
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="not-bookmarked">
          <path d="M5 5v14l7-7 7 7V5z"/>
        </svg>
        <div class="stat-label">收藏</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { ExtractedData } from '../types';

defineProps<{
  stats: {
    imagesCount: number;
    linksCount: number;
    wordsCount: number;
  };
  extractedData: ExtractedData;
}>();
</script>

<style scoped>
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

.bookmark-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.bookmarked {
  color: #ffc107;
}

.not-bookmarked {
  color: var(--markdown-text-light);
}
</style>