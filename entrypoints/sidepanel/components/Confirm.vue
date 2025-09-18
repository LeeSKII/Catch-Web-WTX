<template>
  <div v-if="visible" class="confirm-overlay" @click="handleOverlayClick">
    <div class="confirm-content" @click.stop>
      <div class="confirm-header">
        <h3>{{ title }}</h3>
      </div>
      <div class="confirm-body">
        <p>{{ message }}</p>
      </div>
      <div class="confirm-footer">
        <button 
          class="btn btn-secondary" 
          @click="handleCancel"
        >
          {{ cancelText }}
        </button>
        <button 
          class="btn btn-primary" 
          @click="handleConfirm"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';

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

const handleOverlayClick = () => {
  if (props.closeOnOverlayClick) {
    handleCancel();
  }
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
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-in-out;
}

.confirm-content {
  background: var(--section-content-bg);
  border-radius: var(--border-radius);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 400px;
  animation: slideIn 0.2s ease-in-out;
}

.confirm-header {
  padding: 15px 20px;
  border-bottom: 1px solid var(--border-color);
}

.confirm-header h3 {
  margin: 0;
  color: var(--section-title-color);
  font-size: 16px;
}

.confirm-body {
  padding: 20px;
}

.confirm-body p {
  margin: 0;
  color: var(--text-color);
  line-height: 1.5;
}

.confirm-footer {
  padding: 15px 20px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  outline: none;
  position: relative;
  overflow: hidden;
  min-width: 80px;
}

.btn:focus {
  outline: 2px solid rgba(59, 130, 246, 0.5);
  outline-offset: 2px;
}

.btn:active {
  transform: scale(0.98);
}

.btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.btn:active::before {
  width: 300px;
  height: 300px;
}

.btn-secondary {
  background-color: var(--button-secondary-bg);
  color: var(--button-secondary-text);
  border-color: var(--button-secondary-border, rgba(0, 0, 0, 0.1));
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.btn-secondary:hover {
  background-color: var(--button-secondary-hover);
  border-color: var(--button-secondary-hover-border, rgba(0, 0, 0, 0.15));
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
}

.btn-secondary:focus {
  outline-color: var(--button-secondary-focus, rgba(59, 130, 246, 0.3));
}

.btn-primary {
  background-color: var(--button-primary-bg);
  color: var(--button-primary-text);
  border-color: var(--button-primary-border, transparent);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.btn-primary:hover {
  background-color: var(--button-primary-hover);
  border-color: var(--button-primary-hover-border, transparent);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
}

.btn-primary:focus {
  outline-color: var(--button-primary-focus, rgba(59, 130, 246, 0.5));
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>