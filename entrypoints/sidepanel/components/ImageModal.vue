<!--
  @component ImageModal
  @description
    图片全量查看模态框组件，以弹窗形式展示所有提取的图片。
    使用响应式网格布局，适配不同屏幕尺寸。

  @features
    - 全屏模态框展示所有图片
    - 响应式网格布局（自动填充列）
    - 显示图片尺寸和描述信息
    - 点击遮罩层关闭模态框
    - 自定义滚动条样式

  @usage
    <ImageModal
      :show="showModal"
      :images="extractedData.images"
      @close="showModal = false"
    />

  @props
    @param {boolean} show - 控制模态框显示/隐藏
    @param {ImageData[]} images - 图片数据数组

  @emits
    @event {void} close - 用户点击关闭按钮或遮罩层时触发

  @see
    - ImageGrid.vue - 图片网格预览组件
    - types/index.ts - ImageData 类型定义
-->

<template>
  <div v-if="show" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>所有图片 ({{ images?.length || 0 }})</h3>
        <button class="modal-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="modal-body">
        <div class="all-images-grid">
          <div v-for="(img, index) in images" :key="index" class="all-image-item">
            <img :src="img.src" :alt="img.alt || '无描述'" />
            <div class="all-image-info">
              <div class="image-size">{{ img.width }}x{{ img.height }}</div>
              <div class="image-alt" :title="img.alt || '无描述'">{{ img.alt || '无描述' }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { ImageData } from '../types';

defineProps<{
  show: boolean;
  images?: ImageData[];
}>();

defineEmits<{
  close: [];
}>();
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--section-bg);
  border-radius: var(--border-radius);
  max-width: 90vw;
  max-height: 90vh;
  width: 90vw;
  height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--box-shadow);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  color: var(--section-title-color);
  font-size: 18px;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-color);
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.3s;
}

.modal-close:hover {
  background: rgba(0, 0, 0, 0.1);
}

.modal-body {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.all-images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.all-image-item {
  border-radius: var(--border-radius);
  overflow: hidden;
  border: 1px solid var(--border-color);
  background: var(--section-content-bg);
}

.all-image-item img {
  width: 100%;
  height: 150px;
  object-fit: contain;
  background: var(--markdown-bg-light);
}

.all-image-info {
  padding: 10px;
  background: var(--section-content-bg);
}

.image-size {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 5px;
}

.image-alt {
  font-size: 14px;
  color: var(--text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>