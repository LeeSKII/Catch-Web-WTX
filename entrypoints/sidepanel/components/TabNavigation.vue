<!--
  @component TabNavigation
  @description
    侧边栏标签页导航组件，用于在四个主要功能标签之间切换：
    网页信息、AI 总结、对话、设置。

  @features
    - 响应式标签页布局，自适应容器宽度
    - 活动标签高亮显示
    - 支持键盘导航和鼠标点击
    - 使用 CSS 变量主题，自动适配明暗模式

  @usage
    <TabNavigation
      :current-tab="currentTab"
      @tab-change="handleTabChange"
    />

  @props
    @param {TabName} currentTab - 当前活动标签名称

  @emits
    @event {TabName} tab-change - 用户点击标签时触发，传递新标签名称

  @example
    <script setup>
    import { ref } from 'vue'
    import TabNavigation from '@/components/TabNavigation.vue'

    const currentTab = ref('results')

    const handleTabChange = (tabName) => {
      currentTab.value = tabName
    }
    </script>

    <template>
      <TabNavigation
        :current-tab="currentTab"
        @tab-change="handleTabChange"
      />
    </template>

  @see
    - App.vue - 使用此组件进行标签页切换
    - stores/types.ts - TabName 类型定义
-->

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
      总结
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
import type { TabName } from '../stores/types'

defineProps<{
  currentTab: TabName;
}>();

const emit = defineEmits<{
  "tab-change": [tabName: TabName];
}>();

const switchTab = (tabName: TabName) => {
  emit("tab-change", tabName);
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
