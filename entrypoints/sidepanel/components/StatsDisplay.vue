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
defineProps<{
  stats: {
    imagesCount: number;
    linksCount: number;
    wordsCount: number;
  };
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