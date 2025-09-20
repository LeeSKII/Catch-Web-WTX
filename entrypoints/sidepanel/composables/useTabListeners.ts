import { onUnmounted } from 'vue';
import { browser } from 'wxt/browser';
import { debounce } from '../utils/debounce';
import { createLogger } from '../utils/logger';
import { UI_CONFIG, PERFORMANCE_CONFIG } from '../constants';
import { useAbortController } from './useAbortController';

const logger = createLogger('TabListeners');

/**
 * 标签页监听逻辑
 * @param refreshDataForNewTab 刷新数据的函数
 * @param loadAndDisplayAISummary 加载AI总结的函数
 * @param clearPanelData 清空面板数据的函数
 */
export function useTabListeners(
  refreshDataForNewTab: () => Promise<void>,
  loadAndDisplayAISummary: (url: string, source?: string) => Promise<any>,
  clearPanelData: () => void
) {
  // 记录上一次处理的URL，避免重复处理
  let lastProcessedUrl = '';
  let isProcessing = false;
  
  // 使用 AbortController
  const { abortAllRequests } = useAbortController();

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

  // 监听网页 DOM loading 状态变化
  const setupDOMLoadingListener = (callback: (isLoading: boolean) => void) => {
    // 使用 webNavigation API 监听网页导航状态
    if (browser.webNavigation) {
      const handleNavigationStart = (details: any) => {
        // 只处理主框架的导航开始
        if (details.frameId === 0) {
          logger.debug('检测到网页导航开始', { url: details.url });
          callback(true); // 设置 loading 状态为 true
        }
      };

      const handleNavigationComplete = async (details: any) => {
        // 只处理主框架的导航完成
        if (details.frameId === 0) {
          logger.debug('检测到网页导航完成', { url: details.url });
          callback(false); // 设置 loading 状态为 false
          
          // 获取当前活动标签页
          try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            // 放宽URL匹配条件，只要当前活动标签页存在且URL不为空，并且不是正在处理中，就触发数据提取
            if (tabs[0] && tabs[0].url && !isProcessing) {
              logger.debug('webNavigation完成时触发数据提取', {
                webNavigationUrl: details.url,
                tabUrl: tabs[0].url,
                urlMatch: tabs[0].url === details.url
              });
              lastProcessedUrl = details.url;
              isProcessing = true;

              try {
                // 清空面板内容
                clearPanelData();
                
                // 刷新数据
                await refreshDataForNewTab();
                
                // AI总结的加载现在在 AISummaryPanel 组件内部处理
              } catch (error) {
                logger.error('webNavigation完成时处理数据出错', error);
              } finally {
                isProcessing = false;
              }
            } else {
              logger.debug('webNavigation完成时跳过数据提取', {
                hasTab: !!tabs[0],
                hasUrl: !!tabs[0]?.url,
                isProcessing,
                webNavigationUrl: details.url,
                tabUrl: tabs[0]?.url
              });
            }
          } catch (error) {
            logger.error('获取当前活动标签页时出错', error);
          }
        }
      };

      const handleNavigationError = (details: any) => {
        // 只处理主框架的导航错误
        if (details.frameId === 0) {
          logger.debug('检测到网页导航错误', { url: details.url, error: details.error });
          callback(false); // 设置 loading 状态为 false
        }
      };

      // 处理SPA路由变化（history.pushState/replaceState）
      const handleHistoryStateUpdated = async (details: any) => {
        // 只处理主框架的历史状态更新
        if (details.frameId === 0) {
          logger.debug('检测到SPA路由变化', { url: details.url });
          
          // 获取当前活动标签页
          try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            // 放宽URL匹配条件，只要当前活动标签页存在且URL不为空，并且不是正在处理中，就触发数据提取
            if (tabs[0] && tabs[0].url && !isProcessing) {
              logger.debug('SPA路由变化时触发数据提取', {
                historyStateUrl: details.url,
                tabUrl: tabs[0].url,
                urlMatch: tabs[0].url === details.url
              });
              lastProcessedUrl = details.url;
              isProcessing = true;

              try {
                // 清空面板内容
                clearPanelData();
                
                // 刷新数据
                await refreshDataForNewTab();
                
                // AI总结的加载现在在 AISummaryPanel 组件内部处理
              } catch (error) {
                logger.error('SPA路由变化时处理数据出错', error);
              } finally {
                isProcessing = false;
              }
            } else {
              logger.debug('SPA路由变化时跳过数据提取', {
                hasTab: !!tabs[0],
                hasUrl: !!tabs[0]?.url,
                isProcessing,
                historyStateUrl: details.url,
                tabUrl: tabs[0]?.url
              });
            }
          } catch (error) {
            logger.error('获取当前活动标签页时出错', error);
          }
        }
      };

      // 添加事件监听器
      browser.webNavigation.onCommitted.addListener(handleNavigationStart);
      browser.webNavigation.onCompleted.addListener(handleNavigationComplete);
      browser.webNavigation.onErrorOccurred.addListener(handleNavigationError);
      browser.webNavigation.onHistoryStateUpdated.addListener(handleHistoryStateUpdated);

      // 返回清理函数
      return () => {
        browser.webNavigation.onCommitted.removeListener(handleNavigationStart);
        browser.webNavigation.onCompleted.removeListener(handleNavigationComplete);
        browser.webNavigation.onErrorOccurred.removeListener(handleNavigationError);
        browser.webNavigation.onHistoryStateUpdated.removeListener(handleHistoryStateUpdated);
      };
    }

    // 如果 webNavigation API 不可用，返回空清理函数
    return () => {};
  };

  // 设置标签页监听器
  const setupTabListeners = (onDOMLoadingChange?: (isLoading: boolean) => void) => {
    // 设置 DOM loading 状态监听器
    cleanupDOMListener = setupDOMLoadingListener((isLoading: boolean) => {
      if (onDOMLoadingChange) {
        onDOMLoadingChange(isLoading);
      }
    });

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
                // AI总结的加载现在在 AISummaryPanel 组件内部处理
              } catch (error) {
                logger.error('新标签页创建时处理数据出错', error);
              } finally {
                isProcessing = false;
                // 确保在新标签页创建处理完成后，隐藏loading状态
                if (onDOMLoadingChange) {
                  onDOMLoadingChange(false);
                }
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

        if (tab && tab.url) {
          // 优先处理新tab的切换，中断所有正在进行的网络请求
          logger.debug('Tab切换，中断所有正在进行的网络请求', { url: tab.url });
          abortAllRequests();

          // 重置处理状态，确保新tab能够被处理
          isProcessing = false;
          lastProcessedUrl = tab.url;
          isProcessing = true;

          // 显示loading状态
          if (onDOMLoadingChange) {
            onDOMLoadingChange(true);
          }
          clearPanelData();

          try {
            // 当用户切换到不同的tab时，自动执行数据提取和AI总结加载
            await refreshDataForNewTab();
            // AI总结的加载现在在 AISummaryPanel 组件内部处理
          } catch (error) {
            logger.error('Tab切换时处理数据出错', error);
          } finally {
            isProcessing = false;
            // 隐藏loading状态
            if (onDOMLoadingChange) {
              onDOMLoadingChange(false);
            }
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

        // 处理当前活动标签页的URL变化（包括页面状态变化和URL变化）
        if (
          tab.active &&
          tab.url &&
          (changeInfo.status === 'complete' || changeInfo.url) &&
          !isProcessing
        ) {
          // 优先处理URL更新，中断所有正在进行的网络请求
          logger.debug('检测到URL变化且页面加载完成，中断所有正在进行的网络请求', { url: tab.url });
          abortAllRequests();
          
          // 重置处理状态，确保新URL能够被处理
          isProcessing = false;
          lastProcessedUrl = tab.url;
          isProcessing = true;

          try {
            // 清空面板内容
            clearPanelData();

            // 刷新数据
            await refreshDataForNewTab();

            // AI总结的加载现在在 AISummaryPanel 组件内部处理
          } catch (error) {
            logger.error('URL更新时处理数据出错', error);
          } finally {
            isProcessing = false;
            // 确保在URL更新处理完成后，隐藏loading状态
            if (onDOMLoadingChange) {
              onDOMLoadingChange(false);
            }
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
  let cleanupDOMListener: (() => void) | null = null;

  const removeTabListeners = () => {
    browser.tabs.onCreated.removeListener(() => {});
    browser.tabs.onActivated.removeListener(() => {});
    browser.tabs.onUpdated.removeListener(() => {});

    // 清理 DOM loading 监听器
    if (cleanupDOMListener) {
      cleanupDOMListener();
      cleanupDOMListener = null;
    }
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