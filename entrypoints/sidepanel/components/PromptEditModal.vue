<template>
  <BaseModal
    :visible="visible"
    title="编辑 AI 总结 Prompt"
    width="90%"
    max-width="800px"
    :show-footer="true"
    :show-cancel-button="true"
    :show-confirm-button="true"
    cancel-text="取消"
    confirm-text="保存"
    @update:visible="$emit('update:visible', $event)"
    @confirm="handleSave"
    @cancel="$emit('update:visible', false)"
  >
    <div class="prompt-editor">
      <div class="prompt-controls">
        <div class="prompt-type-selector">
          <label>选择 Prompt 类型：</label>
          <select v-model="selectedPromptType" @change="loadPrompt">
            <option value="full">全文总结 Prompt</option>
            <option value="keyinfo">关键信息 Prompt</option>
          </select>
        </div>
        <div class="prompt-actions">
          <button class="btn btn-warning" @click="handleRestoreDefault">
            恢复默认
          </button>
        </div>
      </div>

      <div class="prompt-textarea">
        <label>Prompt 内容：</label>
        <textarea
          v-model="promptContent"
          placeholder="请输入自定义的 AI 总结 prompt..."
          rows="10"
          class="prompt-input"
        ></textarea>
      </div>
    </div>
  </BaseModal>
</template>

<script lang="ts" setup>
import { ref, watch } from "vue";
import BaseModal from "./BaseModal.vue";

interface Props {
  visible: boolean;
  currentPromptType: string;
  customPrompts: {
    full: string;
    keyinfo: string;
  };
  defaultPrompts: {
    full: string;
    keyinfo: string;
  };
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  currentPromptType: "full",
  customPrompts: () => ({
    full: "",
    keyinfo: "",
  }),
  defaultPrompts: () => ({
    full: "",
    keyinfo: "",
  }),
});

const emit = defineEmits<{
  "update:visible": [value: boolean];
  "save-prompts": [prompts: { full: string; keyinfo: string }];
}>();

const selectedPromptType = ref<"full" | "keyinfo">(
  (props.currentPromptType as "full" | "keyinfo") || "full"
);

// 使用两个响应式变量分别存储全文总结和关键信息的 prompt
const fullPrompt = ref("");
const keyinfoPrompt = ref("");

// 计算当前显示的 prompt 内容
const promptContent = computed({
  get: () => {
    return selectedPromptType.value === "full"
      ? fullPrompt.value
      : keyinfoPrompt.value;
  },
  set: (value: string) => {
    if (selectedPromptType.value === "full") {
      fullPrompt.value = value;
    } else {
      keyinfoPrompt.value = value;
    }
  },
});

// 加载指定类型的 prompt
const loadPrompt = () => {
  const customPrompt = props.customPrompts[selectedPromptType.value];
  const defaultPrompt = props.defaultPrompts[selectedPromptType.value];

  // 如果用户有自定义的 prompt，使用自定义的，否则使用默认的
  const currentPrompt =
    customPrompt && customPrompt.trim() ? customPrompt : defaultPrompt;

  if (selectedPromptType.value === "full") {
    fullPrompt.value = currentPrompt;
  } else {
    keyinfoPrompt.value = currentPrompt;
  }
};

// 更新 prompt 内容
const updatePromptContent = (value: string) => {
  if (selectedPromptType.value === "full") {
    fullPrompt.value = value;
  } else {
    keyinfoPrompt.value = value;
  }
};

// 保存 prompt
const handleSave = () => {
  const updatedPrompts = {
    ...props.customPrompts,
    full: fullPrompt.value,
    keyinfo: keyinfoPrompt.value,
  };
  emit("save-prompts", updatedPrompts);
  emit("update:visible", false);
};

// 恢复默认 prompt
const handleRestoreDefault = () => {
  const defaultPrompt =
    props.defaultPrompts[
      selectedPromptType.value as keyof typeof props.defaultPrompts
    ];
  if (selectedPromptType.value === "full") {
    fullPrompt.value = defaultPrompt;
  } else {
    keyinfoPrompt.value = defaultPrompt;
  }
};

// 监听 visible 变化，当模态框打开时加载所有类型的 prompt
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      selectedPromptType.value = props.currentPromptType as "full" | "keyinfo";

      // 初始化两个类型的 prompt
      const fullCustomPrompt = props.customPrompts.full;
      const fullDefaultPrompt = props.defaultPrompts.full;
      const keyinfoCustomPrompt = props.customPrompts.keyinfo;
      const keyinfoDefaultPrompt = props.defaultPrompts.keyinfo;

      // 如果用户有自定义的 prompt，使用自定义的，否则使用默认的
      fullPrompt.value =
        fullCustomPrompt && fullCustomPrompt.trim()
          ? fullCustomPrompt
          : fullDefaultPrompt;
      keyinfoPrompt.value =
        keyinfoCustomPrompt && keyinfoCustomPrompt.trim()
          ? keyinfoCustomPrompt
          : keyinfoDefaultPrompt;
    }
  }
);

// 监听当前 prompt 类型变化，更新选中的类型
watch(
  () => props.currentPromptType,
  (newVal) => {
    if (props.visible) {
      selectedPromptType.value = newVal as "full" | "keyinfo";
    }
  }
);
</script>

<style scoped>
.prompt-editor {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.prompt-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.prompt-type-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

.prompt-type-selector label {
  font-weight: 600;
  color: var(--section-title-color);
}

.prompt-type-selector select {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  background: var(--section-content-bg);
  color: var(--text-color);
  font-size: 14px;
  min-width: 150px;
}

.prompt-textarea {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prompt-textarea label {
  font-weight: 600;
  color: var(--section-title-color);
}

.prompt-input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  background: var(--section-content-bg);
  color: var(--text-color);
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  font-family: inherit;
}

.prompt-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.2);
}

.prompt-actions {
  display: flex;
}

.prompt-actions .btn {
  padding: 6px 12px;
  font-size: 13px;
  border-radius: var(--border-radius);
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.prompt-actions .btn-warning {
  background: var(--warning-color);
  color: white;
}

.prompt-actions .btn-warning:hover {
  background: color-mix(in srgb, var(--warning-color) 85%, black);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>
