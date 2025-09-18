<template>
  <div
    v-if="visible"
    class="modal-overlay"
    @click="$emit('update:visible', false)"
  >
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>引用信息</h3>
        <button class="modal-close" @click="$emit('update:visible', false)">
          &times;
        </button>
      </div>
      <div class="modal-body">
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
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { browser } from "wxt/browser";

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

    // 检查是否已经有标签页打开了该URL
    const existingTab = tabs.find((tab) => tab.url === url);

    if (existingTab && existingTab.id) {
      // 如果已存在，激活该标签页
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
    console.error("跳转到原文失败:", error);
    // 如果出错，尝试直接打开新标签页
    try {
      await browser.tabs.create({ url });
    } catch (fallbackError) {
      console.error("打开新标签页失败:", fallbackError);
    }
  }
};
</script>

<style scoped>
/* 模态对话框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--section-content-bg);
  border-radius: var(--border-radius);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--section-bg);
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
  cursor: pointer;
  color: var(--text-color);
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.modal-close:hover {
  background: var(--border-color);
}

.modal-body {
  padding: 20px;
  max-height: calc(80vh - 70px);
  overflow-y: auto;
}

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