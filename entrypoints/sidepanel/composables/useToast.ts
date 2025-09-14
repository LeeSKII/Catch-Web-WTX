import { ref, Ref } from 'vue';
import { ToastOptions } from '../types';

export function useToast() {
  const toasts: Ref<HTMLDivElement[]> = ref([]);
  const container: Ref<HTMLDivElement | null> = ref(null);

  const initContainer = () => {
    if (!container.value) {
      container.value = document.getElementById('toast-container') as HTMLDivElement;
      if (!container.value) {
        container.value = document.createElement('div');
        container.value.id = 'toast-container';
        container.value.className = 'toast-container';
        document.body.appendChild(container.value);
      }
    }
  };

  const show = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', duration: number = 3000) => {
    initContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;

    const closeBtn = document.createElement('span');
    closeBtn.className = 'toast-close';
    closeBtn.textContent = '×';
    closeBtn.onclick = () => remove(toast);

    toast.appendChild(messageSpan);
    toast.appendChild(closeBtn);

    if (container.value) {
      container.value.appendChild(toast);
      toasts.value.push(toast);
    }

    // 自动移除
    if (duration > 0) {
      setTimeout(() => remove(toast), duration);
    }

    return toast;
  };

  const remove = (toast: HTMLDivElement) => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      const index = toasts.value.indexOf(toast);
      if (index > -1) {
        toasts.value.splice(index, 1);
      }
    }, 300);
  };

  const success = (message: string, duration?: number) => {
    return show(message, 'success', duration);
  };

  const error = (message: string, duration?: number) => {
    return show(message, 'error', duration);
  };

  const warning = (message: string, duration?: number) => {
    return show(message, 'warning', duration);
  };

  const info = (message: string, duration?: number) => {
    return show(message, 'info', duration);
  };

  return {
    show,
    remove,
    success,
    error,
    warning,
    info,
    toasts
  };
}