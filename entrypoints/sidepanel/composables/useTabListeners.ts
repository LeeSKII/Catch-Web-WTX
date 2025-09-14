import { onUnmounted } from 'vue';
import { browser } from 'wxt/browser';
import { debounce } from '../utils/debounce';
import { createLogger } from '../utils/logger';
import { UI_CONFIG, PERFORMANCE_CONFIG } from '../constants';

const logger = createLogger('TabListeners');

/**
 * 标签页监听逻辑
 * @param refreshDataForNewTab 刷新数据的函数
 * @param loadAndDisplayAISummary 加载AI总结的函数
 * @param clearPanelData 清空面板数据的函数
 */
export function useTabListeners(
  refreshDataForNewTab: () => Promise<void>,
  loadAndDisplayAISummary: (url: string, source: string) => Promise<void>,
  clearPanelData: () => void
) {
  // 记录上一次处理的URL，避免重复处理
  let lastProcessedUrl = '';
  let isProcessing = false;

  // 等待标签页加载完成的函数
  const waitForTabToLoad = (tabId: number): Promise<void> => {
    return new Promise<void>((resolve) => {
      const checkTabStatus = async () => {
        try {
          const tab = await browser.tabs.get(tabId);
          if (tab && tab.status === 'complete') {
            resolve();
          } else {
            // 继续检查
            setTimeout(checkTabStatus, PERFORMANCE_CONFIG.DOM_READY_CHECK_INTERVAL);
          }
        } catch (error) {
          logger.error('检查标签页状态时出错', error);
          resolve(); // 出错时也resolve，避免无限等待
        }
      };
      
      checkTabStatus();
    });
  };

  // 设置标签页监听器
  const setupTabListeners = () => {
    // 监听新标签页创建事件
    browser.tabs.onCreated.addListener(async (tab: any) => {
      logger.debug('chrome.tabs.onCreated 被调用', {
        id: tab.id,
        url: tab.url,
        active: tab.active,
        openerTabId: tab.openerTabId
      });

      // 如果新创建的标签页是活动标签页，说明是自动跳转的情况
      if (tab.active) {
        logger.debug('新创建的标签页是活动标签页，等待加载完成');
        
        // 等待一小段时间确保tab信息已经更新
        setTimeout(async () => {
          try {
            const currentTab = await browser.tabs.get(tab.id);
            logger.debug('获取新创建的tab信息', {
              id: currentTab.id,
              url: currentTab.url,
              status: currentTab.status
            });

            if (currentTab && currentTab.url && currentTab.url !== lastProcessedUrl && !isProcessing) {
              logger.debug('处理新创建的活动标签页', { url: currentTab.url });
              lastProcessedUrl = currentTab.url;
              isProcessing = true;

              try {
                await refreshDataForNewTab();
                await loadAndDisplayAISummary(currentTab.url, '新标签页创建');
              } finally {
                isProcessing = false;
              }
            }
          } catch (error) {
            logger.error('处理新创建标签页时出错', error);
          }
        }, PERFORMANCE_CONFIG.TAB_PROCESSING_DELAY);
      }
    });

    // 监听浏览器tab切换事件
    browser.tabs.onActivated.addListener(async (activeInfo: any) => {
      logger.debug('chrome.tabs.onActivated 被调用', { tabId: activeInfo.tabId });

      // 获取当前tab的URL
      browser.tabs.get(activeInfo.tabId, async (tab: any) => {
        logger.debug('Tab切换时获取到的tab信息', {
          id: tab.id,
          url: tab.url,
          status: tab.status,
          title: tab.title,
          lastProcessedUrl,
          isProcessing
        });

        if (tab && tab.url && !isProcessing) {
          logger.debug('Tab切换时URL', { url: tab.url });
          lastProcessedUrl = tab.url;
          isProcessing = true;

          try {
            // 当用户切换到不同的tab时，自动执行数据提取和AI总结加载
            await refreshDataForNewTab();
            await loadAndDisplayAISummary(tab.url, 'Tab切换');
          } finally {
            isProcessing = false;
          }
        } else {
          logger.debug('Tab切换时跳过处理', {
            hasTab: !!tab,
            hasUrl: !!tab?.url,
            isProcessing
          });
        }
      });
    });

    // 监听当前tab的URL变化 - 使用防抖
    const debouncedUpdateHandler = debounce(
      async (tabId: number, changeInfo: any, tab: any) => {
        logger.debug('chrome.tabs.onUpdated 被调用（防抖后）', {
          tabId,
          changeInfo,
          tabActive: tab.active,
          tabUrl: tab.url,
          lastProcessedUrl,
          isProcessing
        });

        // 只处理当前活动标签页的URL变化，且页面加载完成时
        if (
          tab.active &&
          changeInfo.status === 'complete' &&
          tab.url &&
          !isProcessing
        ) {
          logger.debug('检测到URL变化且页面加载完成，处理URL', { url: tab.url });
          lastProcessedUrl = tab.url;
          isProcessing = true;

          try {
            // 清空面板内容
            clearPanelData();

            // 刷新数据
            await refreshDataForNewTab();

            // 加载AI总结
            await loadAndDisplayAISummary(tab.url, 'URL更新');
          } finally {
            isProcessing = false;
          }
        } else {
          logger.debug('onUpdated跳过处理', {
            isActive: tab.active,
            statusComplete: changeInfo.status === 'complete',
            hasUrl: !!tab.url,
            isProcessing
          });
        }
      },
      UI_CONFIG.DEBOUNCE_DELAY
    );

    browser.tabs.onUpdated.addListener(debouncedUpdateHandler);
  };

  // 移除标签页监听器
  const removeTabListeners = () => {
    browser.tabs.onCreated.removeListener(() => {});
    browser.tabs.onActivated.removeListener(() => {});
    browser.tabs.onUpdated.removeListener(() => {});
  };

  // 在组件卸载时移除监听器
  onUnmounted(() => {
    removeTabListeners();
  });

  return {
    setupTabListeners,
    removeTabListeners
  };
}