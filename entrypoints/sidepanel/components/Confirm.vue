<template>
  <BaseModal
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    :title="title"
    width="90%"
    maxWidth="400px"
    :show-footer="true"
    :show-cancel-button="true"
    :show-confirm-button="true"
    :cancel-text="cancelText"
    :confirm-text="confirmText"
    :close-on-click-overlay="closeOnOverlayClick"
    @confirm="handleConfirm"
    @cancel="handleCancel"
  >
    <p>{{ message }}</p>
  </BaseModal>
</template>

<script lang="ts" setup>
import { watch } from 'vue';
import BaseModal from './BaseModal.vue';

interface Props {
  visible: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  closeOnOverlayClick?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  title: '确认',
  message: '确定要执行此操作吗？',
  confirmText: '确定',
  cancelText: '取消',
  closeOnOverlayClick: true
});

const emit = defineEmits<{
  'update:visible': [visible: boolean];
  'confirm': [];
  'cancel': [];
}>();

const handleConfirm = () => {
  emit('confirm');
  emit('update:visible', false);
};

const handleCancel = () => {
  emit('cancel');
  emit('update:visible', false);
};

// 监听 visible 属性变化，可以在这里添加动画逻辑
watch(() => props.visible, (newVal) => {
  if (newVal) {
    // 当对话框显示时，可以添加一些初始化逻辑
    document.body.style.overflow = 'hidden';
  } else {
    // 当对话框隐藏时，恢复页面滚动
    document.body.style.overflow = '';
  }
});
</script>

<style scoped>
/* 确认对话框内容样式 */
p {
  margin: 0;
  color: var(--text-color);
  line-height: 1.5;
}
</style>