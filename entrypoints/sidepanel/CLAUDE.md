[根目录](../../CLAUDE.md) > [entrypoints](../) > **sidepanel**

# sidepanel 模块文档

## 变更记录 (Changelog)

- 2025-09-18: 初始化模块AI上下文文档

## 模块职责

sidepanel 模块是本浏览器扩展的核心用户界面模块，负责提供用户交互界面和实现主要功能。它包含了数据提取、AI总结、智能对话等核心功能的前端实现。

## 入口与启动

- **main.ts**: 模块入口文件，负责初始化Vue应用并挂载到DOM
- **App.vue**: 主应用组件，包含所有主要功能的UI布局和逻辑协调

## 对外接口

本模块作为浏览器扩展的侧边栏面板，通过以下方式与外部交互：

1. 通过 `browser.tabs` API 与当前浏览页面交互
2. 通过 `browser.storage` API 存储用户设置和缓存数据
3. 通过 HTTP 请求与 AI 服务提供商的 API 接口通信
4. 通过 `browser.downloads` API 实现文件下载功能

## 关键依赖与配置

### 依赖库

- **vue**: 前端框架
- **wxt**: 浏览器扩展开发框架
- **@wxt-dev/module-vue**: WXT的Vue支持模块
- **@supabase/supabase-js**: Supabase客户端库
- **openai**: OpenAI Node.js SDK
- **marked**: Markdown解析库

### 配置文件

- **wxt.config.ts**: WXT框架配置文件
- **constants/index.ts**: 项目常量配置

## 数据模型

### 核心数据结构

1. **ExtractedData**: 提取的网页数据
2. **ChatMessage**: 聊天消息
3. **ChatHistory**: 聊天历史
4. **AISummaryData**: AI总结数据
5. **NewsData**: 新闻数据

## 测试与质量

目前项目未包含自动化测试。建议添加：

1. 单元测试：针对 composables 中的核心逻辑函数
2. 组件测试：测试 Vue 组件的渲染和交互
3. 集成测试：测试各模块间的协作

## 常见问题 (FAQ)

### 1. 如何配置AI服务？

在设置面板中配置API密钥和基础URL。默认使用阿里云百炼平台的qwen-turbo模型。

### 2. 如何清除缓存数据？

在设置面板中可以清除提取的数据和AI总结缓存。

### 3. 如何导出聊天记录？

在聊天面板中可以导出当前对话为文本文件。

## 相关文件清单

- `main.ts`: 模块入口
- `App.vue`: 主应用组件
- `components/`: UI组件目录
- `composables/`: 业务逻辑封装
- `utils/`: 工具函数
- `constants/`: 常量配置
- `types/`: TypeScript类型定义