import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-vue"],
  manifest: () => ({
    action: {
      default_title: "网页信息提取器",
    },
    // 添加 side_panel 配置
    side_panel: {
      default_path: "sidepanel.html",
    },
    permissions: [
      "activeTab",
      "declarativeContent",
      "scripting",
      "downloads",
      "storage",
      "sidePanel",
      "tabs",
    ],
    host_permissions: ["https://*/*", "http://*/*"],
    commands: {
      _execute_action: {
        suggested_key: {
          default: "Ctrl+B",
          mac: "Command+B",
        },
      },
      open_side_panel: {
        suggested_key: {
          default: "Ctrl+Shift+B",
          mac: "Command+Shift+B",
        },
        description: "打开侧边栏",
      },
    },
  }),
});
