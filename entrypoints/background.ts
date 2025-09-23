export default defineBackground(() => {
  console.log("Background script loaded", { id: browser.runtime.id });

  // 监听插件图标点击事件
  browser.action.onClicked.addListener(async (tab) => {
    try {
      console.log("Action clicked, opening side panel");
      await browser.sidePanel.open({ windowId: tab.windowId });
    } catch (error) {
      console.error("Failed to open side panel:", error);
    }
  });
});
