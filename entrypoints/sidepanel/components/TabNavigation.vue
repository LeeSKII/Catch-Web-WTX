<template>
  <div class="tabs">
    <button
      class="tab"
      :class="{ active: currentTab === 'results' }"
      @click="switchTab('results')"
    >
      网页
    </button>
    <button
      class="tab"
      :class="{ active: currentTab === 'ai' }"
      @click="switchTab('ai')"
    >
      AI
    </button>
    <button
      class="tab"
      :class="{ active: currentTab === 'chat' }"
      @click="switchTab('chat')"
    >
      对话
    </button>
    <button
      class="tab"
      :class="{ active: currentTab === 'settings' }"
      @click="switchTab('settings')"
    >
      设置
    </button>
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  currentTab: string;
}>();

const emit = defineEmits<{
  'tab-change': [tabName: string];
}>();

const switchTab = (tabName: string) => {
  emit('tab-change', tabName);
};
</script>

<style scoped>
.tabs {
  display: flex;
  margin-bottom: 15px;
  background: var(--tab-bg);
  border-radius: var(--border-radius);
  overflow: hidden;
  box-shadow: var(--box-shadow);
  flex-wrap: wrap;
  flex-shrink: 0;
}

.tab {
  flex: 1;
  padding: 10px;
  text-align: center;
  cursor: pointer;
  background: var(--tab-bg);
  border: none;
  font-weight: 600;
  min-width: 80px;
  color: var(--tab-text-color);
}

.tab.active {
  background: var(--primary-color);
  color: white;
}
</style>