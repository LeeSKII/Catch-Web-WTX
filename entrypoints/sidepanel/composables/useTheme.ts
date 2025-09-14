import { ref, Ref } from 'vue';
import { ThemeConfig } from '../types';

export function useTheme() {
  const isDarkMode: Ref<boolean> = ref(localStorage.getItem('darkMode') === 'true');
  const themes: Ref<ThemeConfig> = ref({
    light: {
      '--light-color': '#f8f9fa',
      '--dark-color': '#212529',
      '--section-bg': 'white',
      '--section-content-bg': '#f9f9f9',
      '--border-color': '#eee',
      '--tab-bg': 'white',
      '--section-title-color': 'var(--secondary-color)',
      '--tab-text-color': 'var(--dark-color)',
      '--markdown-bg-light': '#f0f0f0',
      '--markdown-bg-dark': '#e0e0e0',
      '--markdown-border-light': '#ddd',
      '--markdown-border-dark': '#ccc',
      '--markdown-text-light': '#666',
      '--markdown-text-dark': '#555',
      '--primary-color': '#4361ee',
      '--secondary-color': '#3a0ca3',
      '--accent-color': '#7209b7',
      '--success-color': '#4cc9f0',
      '--warning-color': '#f72585',
    },
    dark: {
      '--light-color': '#212529',
      '--dark-color': '#f8f9fa',
      '--section-bg': '#2d2d2d',
      '--section-content-bg': '#3d3d3d',
      '--border-color': '#444',
      '--tab-bg': '#2d2d2d',
      '--section-title-color': '#8b9cff',
      '--tab-text-color': '#ffffff',
      '--markdown-bg-light': '#2d2d2d',
      '--markdown-bg-dark': '#1a1a1a',
      '--markdown-border-light': '#555',
      '--markdown-border-dark': '#666',
      '--markdown-text-light': '#ccc',
      '--markdown-text-dark': '#aaa',
      '--primary-color': '#6b8cff',
      '--secondary-color': '#5a4bd0',
      '--accent-color': '#9b4fd0',
      '--success-color': '#4db8d8',
      '--warning-color': '#e63946',
    },
  });

  const applyTheme = (theme: 'light' | 'dark') => {
    const root = document.documentElement;
    const themeVars = themes.value[theme];

    // 批量设置CSS变量
    Object.entries(themeVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // 设置data-theme属性
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
    themes,
    applyTheme,
    toggle,
    initialize
  };
}