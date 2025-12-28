<!--
  @component ReferenceDetail
  @description
    引用详情模态框组件，展示单个引用项的完整信息。
    包括标题、URL、主机、内容预览、字数统计、提取时间等。

  @features
    - 显示引用的完整信息
    - 跳转到原文页面（智能检测已打开的标签页）
    - 显示提取时间和字数统计
    - 内容预览自动截断
    - 空状态提示

  @usage
    <ReferenceDetail
      v-model:visible="modalState.showReferenceDetailModal"
      :reference-info="referenceInfo"
      :reference-preview="referencePreview"
    />

  @props
    @param {boolean} visible - 控制模态框显示/隐藏（支持 v-model）
    @param {ReferenceInfo | null} referenceInfo - 引用信息对象
    @param {string} referencePreview - 引用内容预览文本

  @emits
    @event {boolean} update:visible - 显示状态改变时触发

  @see
    - BaseModal.vue - 基础模态框组件
    - ReferenceList.vue - 引用列表组件
    - composables/chat/useChatReference.ts - 引用管理逻辑
-->

<template>
  <BaseModal
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    title="引用信息"
    width="90%"
    maxWidth="600px"
    @close="$emit('update:visible', false)"
  >
    <div v-if="referenceInfo" class="reference-info">
      <div class="reference-section">
        <h4>标题</h4>
        <p>{{ referenceInfo.title || "无标题" }}</p>
      </div>
      <div class="reference-section">
        <h4>URL</h4>
        <p>{{ referenceInfo.url || "无URL" }}</p>
      </div>
      <div class="reference-section">
        <h4>主机</h4>
        <p>{{ referenceInfo.host || "无主机信息" }}</p>
      </div>
      <div class="reference-section">
        <h4>内容预览</h4>
        <p>{{ referencePreview }}</p>
      </div>
      <div class="reference-section" v-if="referenceInfo.wordCount">
        <h4>字数统计</h4>
        <p>{{ referenceInfo.wordCount }} 字</p>
      </div>
      <div class="reference-section" v-if="referenceInfo.extractedAt">
        <h4>提取时间</h4>
        <p>{{ new Date(referenceInfo.extractedAt).toLocaleString() }}</p>
      </div>
      <div class="reference-section" v-if="referenceInfo.url">
        <button
          class="btn btn-primary"
          @click="navigateToOriginalPage(referenceInfo.url)"
        >
          跳转到原文
        </button>
      </div>
    </div>
    <div v-else class="no-reference">
      <p>暂无引用信息</p>
    </div>
  </BaseModal>
</template>

<script lang="ts" setup>
import { browser } from "wxt/browser";
import BaseModal from './BaseModal.vue';
import { useToast } from '../composables/useToast';
import { createLogger } from '../utils/logger';

const logger = createLogger("ReferenceDetail");

const { info } = useToast();

interface ReferenceInfo {
  title?: string;
  url?: string;
  host?: string;
  wordCount?: number;
  extractedAt?: string;
}

defineProps<{
  visible: boolean;
  referenceInfo: ReferenceInfo | null;
  referencePreview: string;
}>();

defineEmits<{
  "update:visible": [visible: boolean];
}>();

// 跳转到原文页面
const navigateToOriginalPage = async (url: string) => {
  if (!url) return;

  try {
    // 获取当前所有打开的标签页
    const tabs = await browser.tabs.query({});

    // 获取当前活动标签页
    const activeTabs = await browser.tabs.query({ active: true, currentWindow: true });
    const currentActiveTab = activeTabs[0];

    // 检查是否已经有标签页打开了该URL
    const existingTab = tabs.find((tab) => tab.url === url);

    if (existingTab && existingTab.id) {
      // 检查当前活动标签页是否已经是目标URL
      if (currentActiveTab && currentActiveTab.url === url) {
        // 如果已经是当前活动标签页，显示提示
        info('您已经在当前原文页面');
        return;
      }

      // 如果已存在但不是当前活动标签页，激活该标签页
      await browser.tabs.update(existingTab.id, { active: true });
      // 如果标签页在当前窗口，可能还需要切换到该标签页
      await browser.tabs.highlight({
        windowId: existingTab.windowId,
        tabs: existingTab.index,
      });
    } else {
      // 如果不存在，打开新标签页
      await browser.tabs.create({ url });
    }

    // 关闭模态框
    // 注意：这里我们无法直接访问父组件的emit，所以需要在父组件中处理这个事件
  } catch (error) {
    logger.error("跳转到原文失败:", error);
    // 如果出错，尝试直接打开新标签页
    try {
      await browser.tabs.create({ url });
    } catch (fallbackError) {
      logger.error("打开新标签页失败:", fallbackError);
    }
  }
};
</script>

<style scoped>
.reference-section {
  margin-bottom: 20px;
}

.reference-section:last-child {
  margin-bottom: 0;
}

.reference-section h4 {
  margin: 0 0 8px 0;
  color: var(--section-title-color);
  font-size: 14px;
  font-weight: 600;
}

.reference-section p {
  margin: 0;
  color: var(--text-color);
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
}

.no-reference {
  text-align: center;
  color: var(--markdown-text-light);
  padding: 20px;
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

.btn:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}
</style>