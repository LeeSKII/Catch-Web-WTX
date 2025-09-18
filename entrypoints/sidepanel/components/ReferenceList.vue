<template>
  <!-- 引用列表模态对话框 -->
  <BaseModal
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    title="引用列表"
    width="90%"
    maxWidth="600px"
    @close="$emit('update:visible', false)"
  >
    <div v-if="referenceList.length > 0" class="reference-list">
      <div
        v-for="(item, index) in referenceList"
        :key="index"
        class="reference-list-item"
      >
        <div class="reference-item-header">
          <div
            class="reference-item-title"
            @click="$emit('show-detail', index)"
          >
            {{ item.title || "无标题" }}
          </div>
          <button
            class="reference-item-delete"
            @click.stop="handleRemoveReference(index)"
            title="删除引用"
          >
            &times;
          </button>
        </div>
        <div
          class="reference-item-content"
          @click="$emit('show-detail', index)"
        >
          <div class="reference-item-url">{{ item.url || "无URL" }}</div>
          <div class="reference-item-preview">
            {{ getReferenceItemPreview(item) }}
          </div>
        </div>
      </div>
    </div>
    <div v-else class="no-reference">
      <p>暂无引用信息</p>
    </div>
  </BaseModal>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import BaseModal from './BaseModal.vue';

// 定义接口
interface ReferenceItem {
  title?: string;
  url?: string;
  text?: string;
  [key: string]: any;
}

// 组件属性
const props = defineProps<{
  visible: boolean;
  referenceList: ReferenceItem[];
}>();

// 组件事件
const emit = defineEmits<{
  'update:visible': [value: boolean];
  'show-detail': [index: number];
  'remove-reference': [index: number];
}>();

// 获取引用列表项的预览文本
const getReferenceItemPreview = (item: ReferenceItem) => {
  if (!item.text) return "";
  return item.text.substring(0, 100) + (item.text.length > 100 ? "..." : "");
};

// 处理删除引用
const handleRemoveReference = (index: number) => {
  emit('remove-reference', index);
};
</script>

<style scoped>
.no-reference {
  text-align: center;
  color: var(--markdown-text-light);
  padding: 20px;
}

/* 引用列表样式 */
.reference-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reference-list-item {
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--section-bg);
}

.reference-list-item:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.reference-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.reference-item-title {
  font-weight: 600;
  color: var(--section-title-color);
  font-size: 14px;
  flex: 1;
  margin-right: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reference-item-delete {
  background: none;
  border: none;
  color: var(--text-color);
  font-size: 18px;
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.reference-item-delete:hover {
  background: var(--border-color);
  color: var(--danger-color, #ff4757);
}

.reference-item-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.reference-item-url {
  color: var(--primary-color);
  font-size: 12px;
  word-break: break-all;
}

.reference-item-preview {
  color: var(--text-color);
  font-size: 13px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>