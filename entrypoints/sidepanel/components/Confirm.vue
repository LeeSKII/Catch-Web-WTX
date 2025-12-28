<!--
  @component Confirm
  @description
    确认对话框组件，用于需要用户二次确认的操作。
    基于 BaseModal 封装，提供简化的 API。

  @features
    - 自定义标题和消息内容
    - 自定义确认/取消按钮文本
    - 支持点击遮罩层关闭（可配置）
    - 显示时自动禁用页面滚动
    - 使用 v-model 双向绑定显示状态

  @usage
    <Confirm
      v-model:visible="showConfirm"
      title="删除确认"
      message="确定要删除此项目吗？"
      confirm-text="删除"
      cancel-text="取消"
      @confirm="handleDelete"
    />

  @props
    @param {boolean} visible - 控制对话框显示/隐藏（支持 v-model）
    @param {string} title - 对话框标题，默认"确认"
    @param {string} message - 对话框消息内容
    @param {string} confirmText - 确认按钮文本，默认"确定"
    @param {string} cancelText - 取消按钮文本，默认"取消"
    @param {boolean} closeOnOverlayClick - 是否允许点击遮罩关闭，默认 true

  @emits
    @event {void} update:visible - 显示状态改变时触发
    @event {void} confirm - 用户点击确认按钮时触发
    @event {void} cancel - 用户点击取消按钮时触发

  @see
    - BaseModal.vue - 基础模态框组件
-->

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