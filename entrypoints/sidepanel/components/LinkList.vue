<template>
  <div v-if="extractedData.links && extractedData.links.length > 0" class="section">
    <div class="section-title">
      <span>链接</span>
      <button class="btn btn-secondary" @click="$emit('view-all-links')">
        查看全部
      </button>
    </div>
    <div class="filter-box">
      <input
        type="text"
        class="filter-input"
        :value="linkFilter"
        @input="$emit('update:linkFilter', ($event.target as HTMLInputElement).value)"
        placeholder="过滤链接..."
      />
    </div>
    <div class="section-content">
      <div v-for="(link, index) in filteredLinks" :key="index">
        <strong :title="link.text"
          >{{
            link.text.length > 30
              ? link.text.substring(0, 30) + "..."
              : link.text
          }}:</strong
        >
        <a :href="link.href" target="_blank" :title="link.href">
          {{
            link.href.length > 50
              ? link.href.substring(0, 50) + "..."
              : link.href
          }}
        </a>
      </div>
      <div
        v-if="
          extractedData.links.length > 10 && filteredLinks.length === 10
        "
      >
        ... 还有 {{ extractedData.links.length - 10 }} 个链接
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { LinkData } from '../types';
import { computed } from 'vue';

const props = defineProps<{
  extractedData: {
    links?: LinkData[];
  };
  linkFilter: string;
}>();

const emit = defineEmits<{
  'view-all-links': [];
  'update:linkFilter': [value: string];
}>();

const filteredLinks = computed(() => {
  if (!props.extractedData.links) return [];

  if (!props.linkFilter) {
    return props.extractedData.links.slice(0, 10);
  }

  return props.extractedData.links.filter(
    (link) =>
      link.href.toLowerCase().includes(props.linkFilter.toLowerCase()) ||
      (link.text &&
        link.text.toLowerCase().includes(props.linkFilter.toLowerCase()))
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

.btn:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}

/* 链接样式防止溢出 */
.section-content a {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>