import { ref, watch } from 'vue';
import { browser } from 'wxt/browser';
import { createLogger } from '../utils/logger';
import type { ExtractedData } from '../types';

const logger = createLogger('TabNavigation');

/**
 * 标签导航逻辑
 * @param initialTab 初始标签
 * @param loadAndDisplayAISummary 加载AI总结的函数
 */
export function useTabNavigation(
  initialTab: string = 'results',
  loadAndDisplayAISummary: (url: string, source: string) => Promise<void>
) {
  // 当前选中的标签
  const currentTab = ref(initialTab);

  /**
   * 切换标签
   * @param tabName 标签名
   */
  const switchTab = (tabName: string) => {
    currentTab.value = tabName;
  };

  /**
   * 刷新当前标签页的数据
   * @param extractedData 提取的数据
   */
  const refreshCurrentTabData = async (extractedData: ExtractedData) => {
    // 获取当前标签页的URL
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0] && tabs[0].url) {
      const url = tabs[0].url;
      
      // 根据当前标签刷新数据
      switch (currentTab.value) {
        case 'ai':
          // 如果是AI标签，刷新AI总结
          await loadAndDisplayAISummary(url, '标签切换');
          break;
        case 'chat':
          // 如果是对话标签，不需要额外操作
          logger.debug('对话标签不需要刷新数据');
          break;
        case 'results':
          // 如果是结果标签，数据已经是最新的，不需要额外操作
          logger.debug('结果标签数据已是最新');
          break;
        case 'settings':
          // 如果是设置标签，不需要额外操作
          logger.debug('设置标签不需要刷新数据');
          break;
        default:
          logger.warn('未知标签类型', { tab: currentTab.value });
      }
    }
  };

  // 监听标签切换，刷新数据
  watch(currentTab, async (newTab, oldTab) => {
    logger.debug('标签切换', { from: oldTab, to: newTab });
    
    // 获取当前提取的数据
    // 注意：这里需要从外部传入，因为extractedData是在父组件中管理的
    // 这个功能将在App.vue中实现
  });

  return {
    currentTab,
    switchTab,
    refreshCurrentTabData,
  };
}