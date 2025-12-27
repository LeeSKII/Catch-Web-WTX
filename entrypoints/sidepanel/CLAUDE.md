# Sidepanel 模块文档

[根目录](../../CLAUDE.md) > [entrypoints](../CLAUDE.md) > **sidepanel**

---

## 变更记录 (Changelog)

### 2025-12-27
- 初始化模块文档

---

## 模块职责

`sidepanel/` 是 Catch-Web-WTX 扩展的核心用户界面，基于 Vue 3 构建，运行在浏览器侧边栏中。

### 主要功能
1. **网页数据提取**：从当前标签页提取 HTML、文本、图片、链接、元数据等
2. **AI 智能总结**：调用 OpenAI API（兼容阿里云等）生成全文总结和关键信息提取
3. **对话功能**：基于提取的内容进行 AI 对话
4. **设置管理**：管理 API 密钥、提取选项、主题等配置
5. **书签管理**：保存和管理提取的数据
6. **数据导出**：导出提取的数据为 JSON/CSV 格式

---

## 入口与启动

### 主入口文件

**主应用**：`App.vue`（316 行）
- 负责标签页切换和全局布局
- 集成所有子组件
- 管理生命周期钩子

**启动文件**：`main.ts`（6 行）
```typescript
import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";

createApp(App).mount("#app");
```

**入口 HTML**：`index.html`
```html
<div id="app"></div>
```

### 启动流程

```
1. 用户打开侧边栏
   ↓
2. 加载 index.html
   ↓
3. 执行 main.ts
   ↓
4. 挂载 Vue 应用 (App.vue)
   ↓
5. 初始化主题 (useTheme)
   ↓
6. 加载设置 (settingsStore.loadSettings)
   ↓
7. 设置标签页监听器 (useTabListeners)
   ↓
8. 自动提取当前页面数据 (refreshDataForNewTab)
```

---

## 对外接口

### 组件接口

#### App.vue
**Props**：无
**Events**：无
**Slots**：无

#### 主要子组件

| 组件名 | 文件路径 | Props | Events | 职责 |
|--------|---------|-------|--------|------|
| TabNavigation | components/TabNavigation.vue | `currentTab: string` | `@tab-change` | 标签页导航 |
| WebInfoSection | components/WebInfoSection.vue | 无 | `@refresh-data` | 网页信息展示 |
| AISummaryPanel | components/AISummaryPanel.vue | `extractedData: ExtractedData` | 无 | AI 总结面板 |
| ChatPanel | components/ChatPanel.vue | 无 | 无 | 对话面板 |
| SettingsPanel | components/SettingsPanel.vue | 无 | 无 | 设置面板 |

### Composables 接口

#### useDataExtractor
```typescript
export function useDataExtractor() {
  return {
    extractedData: Ref<ExtractedData>,
    isLoading: Ref<boolean>,
    extractData: (options: ExtractionOptions) => Promise<ExtractResult>,
    saveExtractedData: (data: ExtractedData) => void,
    clearExtractedData: () => void,
  };
}
```

#### useAISummary
```typescript
export function useAISummary() {
  return {
    isLoadingAISummary: Ref<boolean>,
    aiSummaryContent: Ref<string>,
    aiSummaryStatus: Ref<string>,
    aiSummaryType: Ref<string>,
    generateAISummary: (content: string, extractedData: any) => Promise<Result>,
    pauseAISummary: () => Promise<Result>,
    saveAISummary: (url: string, content: string, summaryType: string) => void,
    loadAISummary: (url: string, summaryType: string) => AISummaryData | null,
    // ...更多方法
  };
}
```

#### useChat
```typescript
export function useChat() {
  return {
    messages: Ref<Message[]>,
    isLoading: Ref<boolean>,
    sendMessage: (content: string) => Promise<void>,
    clearMessages: () => void,
  };
}
```

---

## 关键依赖与配置

### 内部依赖

#### 状态管理（Stores）
- **dataStore**：提取的数据、加载状态、错误信息
- **settingsStore**：用户设置（API 密钥、提取选项等）
- **uiStore**：UI 状态（当前标签页、Toast 通知、主题）

#### Composables（逻辑复用）
- **useDataExtractor**：数据提取逻辑（303 行）
- **useAISummary**：AI 总结逻辑（499 行）
- **useChat**：对话功能
- **useBookmark**：书签管理
- **useSupabase**：Supabase 客户端
- **useTheme**：主题切换
- **useTabListeners**：标签页监听
- **useAbortController**：请求中止控制
- **useToast**：Toast 通知
- **useDataExport**：数据导出

#### 工具函数（Utils）
- **logger.ts**：日志记录器
- **debounce.ts**：防抖函数
- **throttle.ts**：节流函数
- **dom.ts**：DOM 操作辅助

### 外部依赖

#### 生产依赖
- `vue`：前端框架
- `openai`：OpenAI SDK
- `@supabase/supabase-js`：Supabase 客户端
- `marked`：Markdown 解析器

#### 开发依赖
- `typescript`：TypeScript 编译器
- `vue-tsc`：Vue TypeScript 类型检查

---

## 数据模型

### 核心类型定义

#### ExtractedData
```typescript
interface ExtractedData {
  html?: string;              // HTML 源码
  text?: string;              // 纯文本内容
  wordCount?: number;         // 字数统计
  images?: ImageData[];       // 图片列表
  links?: LinkData[];         // 链接列表
  meta?: Record<string, string>;  // 元数据
  title?: string;             // 页面标题
  url?: string;               // 页面 URL
  host?: string;              // 主机名
  styles?: StylesData;        // 样式信息
  scripts?: ScriptData[];     // 脚本列表
  article?: string | null;    // 文章内容
  extractedAt?: string;       // 提取时间
  isBookmarked?: boolean;     // 是否已收藏
}
```

#### Settings
```typescript
interface Settings {
  showPreviews: boolean;      // 显示预览
  darkMode: boolean;          // 暗色模式
  dataRetention: string;      // 数据保留天数
  extractHtml: boolean;       // 提取 HTML
  extractText: boolean;       // 提取文本
  extractImages: boolean;     // 提取图片
  extractLinks: boolean;      // 提取链接
  extractMeta: boolean;       // 提取元数据
  extractStyles: boolean;     // 提取样式
  extractScripts: boolean;    // 提取脚本
  extractArticle: boolean;    // 提取文章
  openaiApiKey: string;       // OpenAI API 密钥
  openaiBaseUrl: string;      // OpenAI Base URL
  aiModel: string;            // AI 模型
}
```

#### AISummaryData
```typescript
interface AISummaryData {
  content: string;            // 总结内容
  summaryType: string;        // 总结类型（full/keyinfo）
  createdAt: string;          // 创建时间
  url: string;                // 页面 URL
}
```

### 数据流

#### 数据提取流程
```
用户点击"提取数据"
  → useDataExtractor.extractData()
    → browser.scripting.executeScript()
      → 在页面中执行 getPageData()
        → 返回 ExtractedData
          → dataStore.updateExtractedData()
            → UI 更新
```

#### AI 总结流程
```
用户点击"生成总结"
  → useAISummary.generateAISummary()
    → 检查 API 密钥
      → callOpenAI()
        → OpenAI API 调用（流式）
          → 逐字显示总结内容
            → saveAISummary()（保存到 localStorage）
```

---

## 测试与质量

### 当前测试状态
- **无自动化测试**
- 依赖手动测试

### 推荐测试策略

#### 单元测试
使用 Vitest 测试以下内容：
- Composables（useDataExtractor, useAISummary 等）
- Utils（logger, debounce, throttle 等）
- Stores（dataStore, settingsStore, uiStore）

#### 组件测试
使用 Vue Test Utils 测试：
- 主要组件的渲染逻辑
- 用户交互（点击、输入等）
- Props 和 Events 传递

#### E2E 测试
使用 Playwright 测试：
- 完整的用户流程（数据提取 → AI 总结 → 对话）
- 跨标签页行为
- 数据持久化

---

## 常见问题 (FAQ)

### Q1: 如何添加新的提取选项？
**A**:
1. 在 `types/index.ts` 中更新 `ExtractedData` 和 `Settings` 接口
2. 在 `useDataExtractor.ts` 的 `getPageData` 函数中添加提取逻辑
3. 在 `SettingsPanel.vue` 中添加配置选项

### Q2: AI 总结支持自定义 Prompt 吗？
**A**: 是的。在 `AISummaryPanel.vue` 中可以编辑自定义 Prompt，支持全文总结（full）和关键信息提取（keyinfo）两种类型。

### Q3: 数据存储在哪里？
**A**:
- **提取的数据**：存储在 `dataStore.state.extractedData`（内存）
- **AI 总结**：存储在 `localStorage`（键名格式：`aiSummary_<url>_<summaryType>`）
- **用户设置**：存储在 `localStorage`（键名：`appSettings`）
- **书签**：存储在 Supabase 云端数据库（需配置）

### Q4: 如何调试 Sidepanel？
**A**:
1. 打开侧边栏
2. 右键点击侧边栏，选择"检查"
3. 在打开的 DevTools 中查看 console 和 network

### Q5: 如何处理 AI 总结的中止？
**A**: 使用 `useAbortController` composable 管理请求中止：
```typescript
const { abortRequest } = useAbortController();
abortRequest('aiSummary');  // 中止 AI 总结请求
```

---

## 相关文件清单

### 核心文件
- `App.vue`：主应用（316 行）
- `main.ts`：启动文件（6 行）
- `index.html`：入口 HTML
- `style.css`：全局样式

### 组件（components/）
- `TabNavigation.vue`：标签页导航
- `WebInfoSection.vue`：网页信息展示
- `AISummaryPanel.vue`：AI 总结面板
- `ChatPanel.vue`：对话面板
- `SettingsPanel.vue`：设置面板
- `LinkList.vue`：链接列表
- `ReferenceList.vue`：参考列表
- `StatsDisplay.vue`：统计显示
- `ImageGrid.vue`：图片网格
- `MessageItem.vue`：消息项
- 以及更多模态框组件...

### Composables（composables/）
- `useDataExtractor.ts`：数据提取（303 行）
- `useAISummary.ts`：AI 总结（499 行）
- `useChat.ts`：对话功能
- `useBookmark.ts`：书签管理
- `useSupabase.ts`：Supabase 客户端
- `useTheme.ts`：主题切换
- `useTabListeners.ts`：标签页监听
- `useAbortController.ts`：请求中止控制
- `useToast.ts`：Toast 通知
- `useDataExport.ts`：数据导出
- `useTabNavigation.ts`：标签页导航

### Stores（stores/）
- `dataStore.ts`：数据存储（51 行）
- `settingsStore.ts`：设置存储（120 行）
- `uiStore.ts`：UI 状态
- `index.ts`：Store 导出

### 类型定义（types/）
- `index.ts`：所有 TypeScript 类型定义（87 行）

### 工具函数（utils/）
- `logger.ts`：日志记录器
- `debounce.ts`：防抖函数
- `throttle.ts`：节流函数
- `dom.ts`：DOM 操作辅助

### 常量配置（constants/）
- `index.ts`：应用常量（API 配置、性能配置等）

---

[返回根目录](../../CLAUDE.md) | [返回 entrypoints](../CLAUDE.md)
