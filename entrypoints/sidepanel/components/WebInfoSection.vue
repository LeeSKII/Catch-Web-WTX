<template>
  <div class="section">
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
</template>

<script lang="ts" setup>
import type { ExtractedData } from '../types';

defineProps<{
  extractedData: ExtractedData;
}>();

defineEmits<{
  'copy-all-data': [];
  'export-data': [];
}>();
</script>

<style scoped>
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

.btn:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}
</style>