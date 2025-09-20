<template>
  <div class="settings-container">
    <div class="section">
      <div class="section-title">提取选项</div>

      <div class="setting-item">
        <label class="setting-label">
          <input type="checkbox" v-model="localSettings.extractHtml" /> HTML内容
        </label>
      </div>

      <div class="setting-item">
        <label class="setting-label">
          <input type="checkbox" v-model="localSettings.extractText" /> 文本内容
        </label>
      </div>

      <div class="setting-item">
        <label class="setting-label">
          <input type="checkbox" v-model="localSettings.extractImages" /> 图片信息
        </label>
      </div>

      <div class="setting-item">
        <label class="setting-label">
          <input type="checkbox" v-model="localSettings.extractLinks" /> 链接信息
        </label>
      </div>

      <div class="setting-item">
        <label class="setting-label">
          <input type="checkbox" v-model="localSettings.extractMeta" /> 元数据
        </label>
      </div>

      <div class="setting-item">
        <label class="setting-label">
          <input type="checkbox" v-model="localSettings.extractArticle" /> 文章内容
        </label>
      </div>

      <div class="setting-item">
        <label class="setting-label">
          <input type="checkbox" v-model="localSettings.extractStyles" /> CSS样式
        </label>
      </div>

      <div class="setting-item">
        <label class="setting-label">
          <input type="checkbox" v-model="localSettings.extractScripts" /> 脚本信息
        </label>
      </div>
    </div>

    <div class="section">
      <div class="section-title">应用设置</div>

      <div class="setting-item">
        <label class="setting-label">显示图片预览</label>
        <label class="toggle-switch">
          <input type="checkbox" v-model="localSettings.showPreviews" />
          <span class="slider"></span>
        </label>
      </div>

      <div class="setting-item">
        <label class="setting-label">暗色模式</label>
        <label class="toggle-switch">
          <input
            type="checkbox"
            v-model="isDarkModeToggle"
            @change="$emit('toggle-dark-mode')"
          />
          <span class="slider"></span>
        </label>
      </div>

      <div class="setting-item">
        <label class="setting-label">数据保留时间</label>
        <select v-model="localSettings.dataRetention" class="filter-input">
          <option value="1">1天</option>
          <option value="7">7天</option>
          <option value="30">30天</option>
          <option value="0">永久</option>
        </select>
      </div>
    </div>

    <div class="section">
      <div class="section-title">AI设置</div>

      <div class="setting-item">
        <label class="setting-label">OpenAI API密钥</label>
        <input
          type="password"
          v-model="localSettings.openaiApiKey"
          class="filter-input"
          placeholder="输入您的OpenAI API密钥"
        />
        <div
          style="
            font-size: 11px;
            color: var(--markdown-text-light);
            margin-top: 5px;
          "
        >
          您的API密钥将安全存储在本地，不会上传到任何服务器
        </div>
      </div>

      <div class="setting-item">
        <label class="setting-label">OpenAI Base URL</label>
        <input
          type="text"
          v-model="localSettings.openaiBaseUrl"
          class="filter-input"
          :placeholder="API_CONFIG.DEFAULT_BASE_URL"
        />
        <div
          style="
            font-size: 11px;
            color: var(--markdown-text-light);
            margin-top: 5px;
          "
        >
          如需使用自定义API端点，请修改此URL
        </div>
      </div>

      <div class="setting-item">
        <label class="setting-label">AI模型</label>
        <input
          type="text"
          v-model="localSettings.aiModel"
          class="filter-input"
          :placeholder="API_CONFIG.DEFAULT_MODEL"
        />
        <div
          style="
            font-size: 11px;
            color: var(--markdown-text-light);
            margin-top: 5px;
          "
        >
          输入要使用的AI模型名称，如：gpt-3.5-turbo, gpt-4,
          claude-3-sonnet-20240229等
        </div>
      </div>

      <button class="btn btn-primary" @click="handleSaveSettings">
        保存设置
      </button>
      <button
        class="btn btn-warning"
        style="margin-top: 10px"
        @click="handleClearData"
      >
        清除数据
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, computed } from 'vue';
import type { Settings } from '../types';
import { API_CONFIG } from '../constants';
import { useStores } from '../stores';
import { createLogger } from '../utils/logger';

// 创建日志器
const logger = createLogger("SettingsPanel");

// 使用全局状态管理
const { settingsStore, uiStore } = useStores();

// 本地设置副本，避免直接修改store
const localSettings = ref<Settings>({ ...settingsStore.state.settings });
const isDarkModeToggle = ref(settingsStore.state.settings.darkMode);

// 监听store.settings变化，更新本地副本
watch(() => settingsStore.state.settings, (newSettings) => {
  localSettings.value = { ...newSettings };
}, { deep: true });

// 监听store.settings.darkMode变化，更新本地副本
watch(() => settingsStore.state.settings.darkMode, (newIsDarkMode) => {
  isDarkModeToggle.value = newIsDarkMode;
});

// 移除自动保存监听器，改为手动保存
// watch(localSettings, (newSettings) => {
//   settingsStore.updateSettings({ ...newSettings });
// }, { deep: true });

// 组件内部方法
const handleSaveSettings = () => {
  // 先更新store中的设置
  settingsStore.updateSettings({ ...localSettings.value });
  // 然后保存到localStorage
  settingsStore.saveSettings();
  uiStore.showToast("设置已保存", "success");
};

const handleClearData = () => {
  if (confirm("确定要清除所有数据吗？此操作不可恢复。")) {
    settingsStore.clearData();
    uiStore.showToast("数据已清除", "success");
  }
};

const handleToggleDarkMode = () => {
  // 切换darkMode设置
  const newDarkMode = !settingsStore.state.settings.darkMode;
  settingsStore.updateSettings({ darkMode: newDarkMode });
  uiStore.showToast("已切换" + (newDarkMode ? "暗色" : "亮色") + "模式", "success");
};
</script>

<style scoped>
.settings-container {
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  padding-right: 10px;
}

/* 自定义滚动条样式 */
.settings-container::-webkit-scrollbar {
  width: 6px;
}

.settings-container::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
  border-radius: 3px;
}

.settings-container::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 3px;
}

.settings-container::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}

.section {
  background: var(--section-bg);
  border-radius: var(--border-radius);
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: var(--box-shadow);
}

.section-title {
  margin-bottom: 15px;
  font-weight: 600;
  color: var(--section-title-color);
}

.setting-item {
  margin-bottom: 15px;
}

.setting-label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
  font-size: 13px;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.4s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--primary-color);
}

input:checked + .slider:before {
  transform: translateX(26px);
}

.filter-input {
  width: 100%;
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

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-warning {
  background: var(--warning-color);
  color: white;
}

.btn:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}
</style>