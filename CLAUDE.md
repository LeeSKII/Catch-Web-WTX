# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 项目概述

**Catch-Web-WTX** 是一个基于 WXT 框架的浏览器扩展，用于智能提取网页内容并提供 AI 总结功能。

- **框架**: WXT 0.20 + Vue 3 (Composition API) + TypeScript
- **包管理**: pnpm
- **主界面**: 浏览器侧边栏 (Side Panel)
- **AI 集成**: OpenAI SDK（兼容阿里云 DashScope 等兼容接口）

---

## 常用命令

```bash
# 开发模式 (Chrome/Edge)
pnpm dev

# 开发模式 (Firefox)
pnpm dev:firefox

# 生产构建
pnpm build
pnpm build:firefox

# 类型检查
pnpm compile

# 打包扩展
pnpm zip
pnpm zip:firefox

# 自动准备 WXT 类型（postinstall 后自动执行）
wxt prepare
```

### 调试扩展
1. 运行 `pnpm dev` 生成 `.output/chrome-mv3`
2. 在浏览器中打开 `chrome://extensions/`
3. 启用"开发者模式"，点击"加载已解压的扩展程序"
4. 选择 `.output/chrome-mv3` 目录

---

## 架构关键点

### 入口点结构

```
entrypoints/
├── sidepanel/          # Vue 3 侧边栏应用（主界面）
│   ├── App.vue         # 应用根组件
│   ├── main.ts         # 启动文件
│   ├── style.css       # 全局样式（CSS 变量、通用类）
│   ├── components/     # UI 组件
│   ├── composables/    # 组合式函数（业务逻辑）
│   ├── stores/         # 响应式状态管理
│   ├── types/          # TypeScript 类型定义
│   └── constants/      # 常量配置
├── background.ts       # 后台脚本（监听扩展图标点击、打开侧边栏）
└── content.ts          # 内容脚本（注入到网页，用于 DOM 操作）
```

### 数据流架构

```
用户操作 → Sidepanel UI
              ↓
         Composables (业务逻辑)
              ↓
         browser.tabs.executeScript
              ↓
         Content Script (DOM 提取)
              ↓
         返回 ExtractedData
              ↓
         Store (状态管理)
              ↓
         UI 更新
```

### 状态管理 (Stores)

三个独立的 Store，使用 Vue 3 Reactivity API：

| Store | 文件 | 职责 |
|-------|------|------|
| dataStore | `stores/dataStore.ts` | 提取的数据、加载状态、错误信息 |
| settingsStore | `stores/settingsStore.ts` | 用户设置（API 密钥、提取选项） |
| uiStore | `stores/uiStore.ts` | UI 状态（当前标签页、Toast、主题） |

**推荐访问方式** - 使用 `useStores()` hook：
```ts
import { useStores } from '@/stores'
const { dataStore, uiStore, settingsStore } = useStores()

dataStore.updateExtractedData({ ... })
uiStore.switchTab('chat')
settingsStore.updateSettings({ darkMode: true })
```

**直接导入方式**（向后兼容）：
```ts
import { dataStore, uiStore, settingsStore } from '@/stores'
```

### 核心 Composables

| Composable | 文件 | 职责 |
|------------|------|------|
| useDataExtractor | `composables/useDataExtractor.ts` | 从当前标签页提取数据 |
| useAISummary | `composables/useAISummary.ts` | AI 总结生成和流式输出 |
| useChat | `composables/chat/index.ts` | AI 对话功能（模块化入口） |
| useTabListeners | `composables/useTabListeners.ts` | 监听标签页切换自动提取数据 |
| useDataExport | `composables/useDataExport.ts` | 数据导出（复制、JSON 导出、图片下载） |
| useAbortController | `composables/useAbortController.ts` | 网络请求中止控制（自动清理防止内存泄漏） |

### 工具模块 (utils/)

| 模块 | 文件 | 职责 |
|------|------|------|
| logger | `utils/logger.ts` | 统一日志记录器（createLogger） |
| dataCleanup | `utils/dataCleanup.ts` | 数据清理策略（过期数据清理） |
| debounce | `utils/debounce.ts` | 防抖函数 |
| throttle | `utils/throttle.ts` | 节流函数 |

### 常量配置 (constants/)

所有常量定义在 `constants/index.ts`：

- `API_CONFIG` - API 配置（Base URL、模型、超时）
- `TIMEOUTS` - 超时配置（请求超时、数据提取超时）
- `UI_CONFIG` - UI 配置（显示数量、防抖延迟）
- `STORAGE_CONFIG` - 存储配置（键名、前缀）
- `DATA_RETENTION` - 数据保留策略（最小/最大天数）
- `PERFORMANCE_CONFIG` - 性能配置（延迟、并发限制）

### 聊天模块架构（composables/chat/）

`useChat` 已拆分为多个专注的子模块：

```
composables/chat/
├── index.ts                 # 主入口，组合所有子模块
├── types.ts                 # 聊天相关类型定义
├── useChatMessages.ts       # 消息 CRUD 和发送
├── useChatHistory.ts        # 聊天会话历史管理
├── useChatReference.ts      # 网页引用上下文管理
└── useChatStream.ts         # OpenAI API 流式调用
```

**使用方式**：
```ts
import { useChat } from '@/composables/chat'
const { messages, sendMessage, addReference } = useChat()
```

---

## 样式架构

### 全局样式 (style.css)

**CSS 变量** - 定义在 `:root` 和 `[data-theme="dark"]`：
- 主题颜色：`--primary-color`, `--secondary-color`, `--accent-color`
- 布局变量：`--border-radius`, `--box-shadow`
- 组件背景：`--section-bg`, `--section-content-bg`, `--border-color`
- 滚动条颜色：`--scrollbar-track`, `--scrollbar-thumb`, `--scrollbar-thumb-hover`

**通用类**：
- `.custom-scrollbar` - 通用自定义滚动条样式（4px 宽度，支持 Firefox 和 Webkit）
- `.toast-*` - Toast 通知系统样式
- `@keyframes spin/slideIn/slideOut` - 全局动画

### 组件样式原则

| 类型 | 位置 | 示例 |
|------|------|------|
| 通用样式 | `style.css` | CSS 变量、`.custom-scrollbar`、动画关键帧 |
| 组件特定样式 | `*.vue` `<style scoped>` | 布局、组件特有交互效果 |

**注意**：滚动条样式使用全局 `.custom-scrollbar` 类。组件需要自定义滚动条时，添加该类到容器元素。但有特殊视觉需求（如不同颜色、宽度）的组件可保留自己的滚动条样式（如 `ChatPanel.vue` 的 `.chat-messages` 使用 8px 宽度和 primary 颜色）。

---

## 重要类型定义

所有类型定义在 `entrypoints/sidepanel/types/index.ts`：

- `ExtractedData`: 提取的网页数据
- `Settings`: 用户设置
- `AISummaryData`: AI 总结数据
- `StructuredSummaryItem` / `StructuredSummaryData`: 结构化总结
- `HtmlBlock`: HTML 区块信息

---

## 添加新功能的典型流程

### 添加新的数据提取类型
1. 在 `types/index.ts` 中更新 `ExtractedData` 和 `Settings` 接口
2. 在 `useDataExtractor.ts` 的 `getPageData` 函数中添加提取逻辑
3. 在 `SettingsPanel.vue` 中添加配置选项

### 添加新的 AI 功能
1. 在 `useAISummary.ts` 中添加新函数
2. 在 `AISummaryPanel.vue` 中添加 UI 组件
3. 在 `constants/index.ts` 中添加配置常量（如需要）

### 添加新的标签页
1. 在 `components/` 中创建新组件
2. 在 `App.vue` 中注册组件和标签
3. 更新 `TabNavigation.vue` 的标签列表

---

## 关键配置文件

| 文件 | 用途 |
|------|------|
| `wxt.config.ts` | WXT 框架配置、权限声明、快捷键 |
| `tsconfig.json` | TypeScript 配置 |
| `entrypoints/manifest.ts` | 扩展 manifest 配置（如需自定义） |

### 快捷键配置
- `Ctrl+B` (Mac: `Command+B`): 点击扩展图标
- `Ctrl+Shift+B` (Mac: `Command+Shift+B`): 打开侧边栏

---

## AI API 配置

扩展支持 OpenAI 及兼容接口（如阿里云 DashScope）：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| Base URL | `https://dashscope.aliyuncs.com/compatible-mode/v1` | API 基础地址 |
| 模型 | `qwen-turbo` | AI 模型标识 |
| 最大 Token | 4000 | 单次请求最大 tokens |

用户在侧边栏"设置"标签中配置 API Key 和其他参数。

---

## 数据存储策略

- **提取数据**: 内存 (dataStore)，刷新页面后丢失
- **AI 总结**: browser.storage.local (键名: `aiSummary_<url>_<type>`)
- **用户设置**: browser.storage.local (键名: `appSettings`)
- **聊天历史**: browser.storage.local (键名: `chatHistory`)
- **引用列表**: browser.storage.local (键名: `referenceList`)

### 数据清理策略

使用 `utils/dataCleanup` 模块统一管理：

```ts
import { cleanupAllExpiredData, manualCleanup } from '@/utils/dataCleanup'

// 自动清理（使用设置的保留天数）
await cleanupAllExpiredData()

// 手动清理（指定保留天数）
await manualCleanup(7)  // 清理7天前的数据
```

清理逻辑在应用初始化时自动执行（`App.vue:onMounted`）。

---

## 组件命名约定

- **组件文件**: PascalCase (如 `AISummaryPanel.vue`)
- **Composables**: `use` 前缀 (如 `useDataExtractor.ts`)
- **Stores**: `*Store` 后缀 (如 `dataStore.ts`)
- **类型文件**: `index.ts` 统一导出

---

## 浏览器扩展权限

在 `wxt.config.ts` 中配置：
- `activeTab`: 访问当前活动标签页
- `scripting`: 在页面中注入脚本
- `storage`: 本地数据存储
- `sidePanel`: 侧边栏功能
- `tabs`: 标签页管理
- `webNavigation`: 网页导航监听
- `host_permissions`: `https://*/*`, `http://*/*`
- `downloads`: 下载文件（图片、导出数据）
- `declarativeContent`: 声明式内容

---

## 当前测试状态

项目暂无自动化测试。手动测试通过加载未打包的扩展进行。

---

## 架构设计原则

本项目由 AI 辅助开发，代码结构遵循以下原则：

### 模块化与可维护性
- **单一职责**：每个 composable 和组件只负责一个明确的功能域
- **模块拆分**：大型模块（如 useChat）按上下文拆分为多个子模块
- **类型优先**：所有核心数据结构都有明确的 TypeScript 类型定义

### 内存管理
- **自动清理**：使用 `useAbortController` 时，组件卸载会自动清理所有请求
- **数据清理**：应用初始化时自动清理过期数据

### 代码组织
- **组件文档**：每个 `.vue` 组件文件顶部都有 JSDoc 风格的文档注释
- **模块文档**：核心模块（stores、composables）包含完整的 JSDoc 文档
- **命名规范**：
  - 组件：PascalCase（如 `AISummaryPanel.vue`）
  - Composables：`use` 前缀（如 `useDataExtractor.ts`）
  - Stores：`*Store` 后缀（如 `dataStore.ts`）

### 状态管理模式
- 使用 Vue 3 `reactive` API 实现轻量级状态管理
- 全局单例 Store 模式，通过 `useStores()` hook 统一访问
- 类型导出完整，支持严格的 TypeScript 类型检查

### 日志规范
- 使用 `createLogger` 创建命名日志器
- 开发环境：`logger.debug()` 用于调试信息
- 生产环境：仅记录 `logger.error()` 错误信息
- 避免直接使用 `console.log/error`
