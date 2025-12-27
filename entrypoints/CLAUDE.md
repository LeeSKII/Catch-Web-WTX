# Entrypoints 模块文档

[根目录](../CLAUDE.md) > **entrypoints**

---

## 变更记录 (Changelog)

### 2025-12-27
- 初始化模块文档

---

## 模块职责

`entrypoints/` 是 Catch-Web-WTX 扩展的核心入口点目录，包含所有扩展运行时的入口文件。

### 子模块结构

- **sidepanel/**：侧边栏主界面（Vue 3 应用）
- **background.ts**：后台服务脚本
- **content.ts**：内容脚本（注入到网页中）

---

## 入口与启动

### 1. Sidepanel（侧边栏）

**主文件**：`entrypoints/sidepanel/main.ts`
```typescript
import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";

createApp(App).mount("#app");
```

**入口 HTML**：`entrypoints/sidepanel/index.html`
```html
<div id="app"></div>
```

**启动流程**：
1. 用户点击扩展图标或使用快捷键（Ctrl+Shift+B）
2. Background 脚本打开侧边栏
3. 加载 `index.html`
4. 执行 `main.ts`，挂载 Vue 应用

### 2. Background（后台脚本）

**主文件**：`entrypoints/background.ts`

**职责**：
- 监听扩展图标点击事件
- 打开侧边栏
- 处理跨标签页的全局状态

**生命周期**：
- 扩展安装时启动
- 持续在后台运行
- 扩展卸载时终止

### 3. Content（内容脚本）

**主文件**：`entrypoints/content.ts`

**职责**：
- 注入到所有网页（`<all_urls>`）
- 当前仅打印日志（"Hello content."）
- 预留用于 DOM 操作和数据提取

**匹配规则**：
```typescript
matches: ["<all_urls>"]
```

---

## 对外接口

### Background 脚本接口

**事件监听**：
- `browser.action.onClicked`：扩展图标点击
- `browser.sidePanel.open`：打开侧边栏

### Content 脚本接口

**当前状态**：暂无对外接口

**预留接口**：
- DOM 监听与数据提取
- 与 sidepanel 的消息通信

---

## 关键依赖与配置

### WXT 配置

**配置文件**：`wxt.config.ts`

**关键配置**：
```typescript
{
  modules: ["@wxt-dev/module-vue"],
  manifest: {
    action: {
      default_title: "网页信息提取器",
    },
    side_panel: {
      default_path: "sidepanel.html",
    },
    permissions: [...],
    host_permissions: ["https://*/*", "http://*/*"],
    commands: {
      _execute_action: {
        suggested_key: { default: "Ctrl+B", mac: "Command+B" },
      },
      open_side_panel: {
        suggested_key: { default: "Ctrl+Shift+B", mac: "Command+Shift+B" },
        description: "打开侧边栏",
      },
    },
  },
}
```

### 权限说明

| 权限 | 用途 |
|------|------|
| `activeTab` | 访问当前活动标签页 |
| `scripting` | 在页面中注入脚本（数据提取） |
| `storage` | 本地数据存储 |
| `sidePanel` | 侧边栏功能 |
| `tabs` | 标签页管理 |
| `webNavigation` | 网页导航监听 |

---

## 数据模型

### Background 脚本数据流

```
用户操作
  → browser.action.onClicked
    → browser.sidePanel.open
      → sidepanel 加载
```

### Content 脚本数据流

```
网页加载
  → content.ts 注入
    → (预留) DOM 操作
      → (预留) 消息发送到 sidepanel
```

---

## 测试与质量

### 当前测试状态
- **无自动化测试**
- 需手动在浏览器中测试

### 手动测试步骤

#### 测试 Background 脚本
1. 加载扩展到浏览器
2. 点击扩展图标
3. 验证侧边栏是否打开

#### 测试 Content 脚本
1. 打开任意网页
2. 打开浏览器控制台
3. 验证是否打印 "Hello content."

#### 测试 Sidepanel
1. 使用快捷键 Ctrl+Shift+B（Mac: Command+Shift+B）
2. 验证侧边栏是否打开
3. 验证数据提取功能

---

## 常见问题 (FAQ)

### Q1: 如何在 content script 和 sidepanel 之间通信？
**A**: 使用 `browser.runtime.sendMessage` 和 `browser.runtime.onMessage`。

### Q2: Background 脚本可以访问 DOM 吗？
**A**: 不可以。Background 脚本运行在独立的后台页面，无法直接访问网页 DOM。需要通过 content script 间接操作。

### Q3: 如何调试 background 脚本？
**A**:
1. 打开 `chrome://extensions/`
2. 找到扩展，点击"Service Worker"查看后台日志
3. 在侧边栏打开时，查看 background 脚本的 console 输出

---

## 相关文件清单

### 核心文件
- `entrypoints/background.ts`：后台脚本（14 行）
- `entrypoints/content.ts`：内容脚本（7 行）
- `wxt.config.ts`：WXT 配置（42 行）

### Sidepanel 子模块
详见：[entrypoints/sidepanel/CLAUDE.md](./sidepanel/CLAUDE.md)

---

[返回根目录](../CLAUDE.md)
