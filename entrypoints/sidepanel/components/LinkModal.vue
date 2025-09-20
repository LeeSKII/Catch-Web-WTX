<template>
  <div v-if="show" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>所有链接 ({{ links?.length || 0 }})</h3>
        <button class="modal-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="modal-body">
        <div class="filter-box">
          <input
            type="text"
            class="filter-input"
            :value="linkFilter"
            @input="$emit('update:linkFilter', ($event.target as HTMLInputElement).value)"
            placeholder="过滤链接..."
          />
        </div>
        <div class="all-links-list">
          <div v-for="(link, index) in filteredLinks" :key="index" class="all-link-item">
            <div class="link-text" :title="link.text">
              {{ link.text || '无文本' }}
            </div>
            <a 
              :href="link.href" 
              target="_blank" 
              :title="link.href"
              class="link-href"
              @click.stop
            >
              {{ link.href }}
            </a>
          </div>
          <div v-if="filteredLinks.length === 0" class="no-links">
            没有找到匹配的链接
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { LinkData } from '../types';
import { computed } from 'vue';

const props = defineProps<{
  show: boolean;
  links?: LinkData[];
  linkFilter: string;
}>();

defineEmits<{
  close: [];
  'update:linkFilter': [value: string];
}>();

const filteredLinks = computed(() => {
  if (!props.links) return [];

  if (!props.linkFilter) {
    return props.links;
  }

  return props.links.filter(
    (link) =>
      link.href.toLowerCase().includes(props.linkFilter.toLowerCase()) ||
      (link.text &&
        link.text.toLowerCase().includes(props.linkFilter.toLowerCase()))
  );
});
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
  display: flex;
  flex-direction: column;
}

.filter-box {
  margin-bottom: 15px;
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

.all-links-list {
  flex: 1;
  overflow-y: auto;
}

.all-link-item {
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
  background: var(--section-content-bg);
  margin-bottom: 10px;
  padding: 12px;
  transition: box-shadow 0.3s;
}

.all-link-item:hover {
  box-shadow: var(--box-shadow);
}

.link-text {
  font-weight: 600;
  color: var(--section-title-color);
  margin-bottom: 5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link-href {
  color: var(--primary-color);
  text-decoration: none;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  padding: 4px 0;
}

.link-href:hover {
  text-decoration: underline;
}

.no-links {
  text-align: center;
  color: var(--text-secondary);
  padding: 20px;
  font-style: italic;
}
</style>