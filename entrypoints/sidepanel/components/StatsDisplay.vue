<!--
  @component StatsDisplay
  @description
    统计信息展示组件，以卡片形式显示网页数据的统计指标。

  @features
    - 显示图片数量
    - 显示链接数量
    - 显示字数统计
    - 响应式布局，三个指标并排显示

  @usage
    <StatsDisplay
      :stats="stats"
      :extracted-data="extractedData"
    />

  @props
    @param {Object} stats - 统计数据对象
    @param {number} stats.imagesCount - 图片数量
    @param {number} stats.linksCount - 链接数量
    @param {number} stats.wordsCount - 字数统计
    @param {ExtractedData} extractedData - 提取的数据（预留，当前未使用）

  @see
    - WebInfoSection.vue - 使用此组件的父组件
    - stores/dataStore.ts - 统计数据来源
-->

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
</style>
