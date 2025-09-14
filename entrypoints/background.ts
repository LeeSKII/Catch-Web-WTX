export default defineBackground(() => {
  console.log("Hello background!", { id: browser.runtime.id });

  // 监听插件图标点击事件
  browser.action.onClicked.addListener(async (tab) => {
    try {
      // 打开 sidepanel
      await browser.sidePanel.open({ windowId: tab.windowId });
    } catch (error) {
      console.error("Failed to open side panel:", error);
    }
  });
});
