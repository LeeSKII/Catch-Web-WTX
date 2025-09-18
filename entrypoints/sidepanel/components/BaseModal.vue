<template>
  <!-- 通用模态对话框 -->
  <div
    v-if="visible"
    class="modal-overlay"
    @click="handleOverlayClick"
  >
    <div
      class="modal-content"
      :style="{ width: width, maxWidth: maxWidth }"
      @click.stop
    >
      <div class="modal-header">
        <h3>{{ title }}</h3>
        <button class="modal-close" @click="handleClose">&times;</button>
      </div>
      <div class="modal-body">
        <slot></slot>
      </div>
      <div v-if="showFooter" class="modal-footer">
        <slot name="footer">
          <button
            v-if="showCancelButton"
            class="btn btn-cancel"
            @click="handleCancel"
          >
            {{ cancelText }}
          </button>
          <button
            v-if="showConfirmButton"
            class="btn btn-confirm"
            @click="handleConfirm"
          >
            {{ confirmText }}
          </button>
        </slot>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { watch, nextTick } from 'vue';

// 组件属性
interface Props {
  visible: boolean;
  title?: string;
  width?: string;
  maxWidth?: string;
  showFooter?: boolean;
  showCancelButton?: boolean;
  showConfirmButton?: boolean;
  cancelText?: string;
  confirmText?: string;
  closeOnClickOverlay?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  width: '90%',
  maxWidth: '600px',
  showFooter: false,
  showCancelButton: true,
  showConfirmButton: true,
  cancelText: '取消',
  confirmText: '确认',
  closeOnClickOverlay: true
});

// 组件事件
const emit = defineEmits<{
  'update:visible': [value: boolean];
  'close': [];
  'cancel': [];
  'confirm': [];
}>();

// 处理关闭
const handleClose = () => {
  emit('update:visible', false);
  emit('close');
};

// 处理取消
const handleCancel = () => {
  emit('update:visible', false);
  emit('cancel');
};

// 处理确认
const handleConfirm = () => {
  emit('confirm');
};

// 处理遮罩层点击
const handleOverlayClick = () => {
  if (props.closeOnClickOverlay) {
    handleClose();
  }
};

// 监听visible变化，当模态框显示时，聚焦到模态框
watch(() => props.visible, (newVal) => {
  if (newVal) {
    nextTick(() => {
      // 可以在这里添加聚焦逻辑
    });
  }
});
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
  max-width: 90%;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--section-bg);
  flex-shrink: 0;
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
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid var(--border-color);
  background: var(--section-bg);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-shrink: 0;
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
  transition: all 0.2s;
}

.btn-cancel {
  background: var(--border-color);
  color: var(--text-color);
}

.btn-confirm {
  background: var(--primary-color);
  color: white;
}

.btn:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}
</style>