<template>
  <div v-if="extractedData.images && extractedData.images.length > 0" class="section">
    <div class="section-title">
      <span>图片</span>
      <div>
        <button class="btn btn-secondary" @click="$emit('view-all-images')">
          查看全部
        </button>
        <button class="btn btn-success" @click="$emit('download-all-images')">
          下载全部
        </button>
      </div>
    </div>
    <div class="filter-box">
      <input
        type="text"
        class="filter-input"
        :value="imageFilter"
        @input="$emit('update:imageFilter', ($event.target as HTMLInputElement).value)"
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
          background: var(--markdown-bg-light);
        "
      >
        <div>+{{ extractedData.images.length - 12 }}更多</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { ImageData } from '../types';
import { computed } from 'vue';

const props = defineProps<{
  extractedData: {
    images?: ImageData[];
  };
  imageFilter: string;
}>();

const emit = defineEmits<{
  'view-all-images': [];
  'download-all-images': [];
  'update:imageFilter': [value: string];
}>();

const filteredImages = computed(() => {
  if (!props.extractedData.images) return [];

  if (!props.imageFilter) {
    return props.extractedData.images.slice(0, 12);
  }

  return props.extractedData.images.filter(
    (img) =>
      img.src.toLowerCase().includes(props.imageFilter.toLowerCase()) ||
      (img.alt &&
        img.alt.toLowerCase().includes(props.imageFilter.toLowerCase()))
  );
});
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

.btn-secondary {
  background: var(--accent-color);
  color: white;
}

.btn-success {
  background: var(--success-color);
  color: white;
}

.btn:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}
</style>