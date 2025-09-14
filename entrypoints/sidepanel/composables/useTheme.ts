import { ref, Ref } from 'vue';
import { ThemeConfig } from '../types';

export function useTheme() {
  const isDarkMode: Ref<boolean> = ref(localStorage.getItem('darkMode') === 'true');
  // 颜色变量已移至全局 style.css，此处保留主题切换功能

  const applyTheme = (theme: 'light' | 'dark') => {
    const root = document.documentElement;

    // 设置data-theme属性，CSS变量已在全局style.css中定义
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }

    isDarkMode.value = theme === 'dark';
    localStorage.setItem('darkMode', isDarkMode.value.toString());
  };

  const toggle = () => {
    const newTheme = isDarkMode.value ? 'light' : 'dark';
    applyTheme(newTheme);
  };

  const initialize = () => {
    applyTheme(isDarkMode.value ? 'dark' : 'light');
  };

  return {
    isDarkMode,
    applyTheme,
    toggle,
    initialize
  };
}