# Catch Web WTX

<div align="center">

**智能网页内容提取与 AI 分析工具**

[![WXT](https://img.shields.io/badge/WXT-0.20-blue)](https://wxt.dev/)
[![Vue](https://img.shields.io/badge/Vue-3.5-green)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[功能特性](#功能特性) • [快速开始](#快速开始) • [配置说明](#配置说明) • [使用指南](#使用指南) • [常见问题](#常见问题)

</div>

---

## 项目简介

**Catch Web WTX** 是一款功能强大的浏览器扩展，专为需要快速提取、分析和总结网页内容的用户设计。它结合了先进的数据提取技术和 AI 智能分析能力，帮助用户高效处理网络信息。

### 适用场景

- **学术研究**：快速提取论文、文章的核心内容
- **内容创作**：收集和整理网络资源，获取灵感
- **数据分析**：批量获取网页结构化数据
- **信息聚合**：将重要网页内容保存并导出

---

## 功能特性

### 核心功能

| 功能 | 描述 |
|------|------|
| **智能数据提取** | 提取 HTML、纯文本、图片、链接、元数据、样式、脚本和文章全文 |
| **AI 智能总结** | 使用 OpenAI API 对网页内容进行全文总结和关键信息提取 |
| **上下文对话** | 基于当前网页内容与 AI 进行多轮对话，深入探讨 |
| **数据导出** | 支持导出提取的数据为 JSON 文件 |

### 界面特性

- 优雅的侧边栏界面，不干扰正常浏览
- 深色/浅色主题切换
- 响应式设计，适配不同屏幕尺寸
- 流畅的 Markdown 渲染支持

---

## 快速开始

### 环境要求

- **Node.js**: >= 18.0.0
- **包管理器**: pnpm >= 8.0.0（推荐）或 npm

### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/your-username/Catch-Web-WTX.git
cd Catch-Web-WTX

# 2. 安装依赖
pnpm install

# 3. 启动开发模式
pnpm dev
```

### 加载扩展到浏览器

#### Chrome / Edge

1. 打开浏览器，访问 `chrome://extensions/`（Edge 为 `edge://extensions/`）
2. 开启右上角的「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择项目的 `.output/chrome-mv3` 目录

#### Firefox

1. 打开浏览器，访问 `about:debugging#/runtime/this-firefox`
2. 点击「临时载入附加组件」
3. 选择项目的 `.output/firefox-mv3/build.zip` 文件

---

## 配置说明

### AI 功能配置

扩展支持 OpenAI API 及兼容接口（如阿里云 DashScope）。

#### 获取 API Key

1. **OpenAI 官方**: 访问 [platform.openai.com](https://platform.openai.com/api-keys)
2. **阿里云 DashScope**: 访问 [dashscope.aliyun.com](https://dashscope.aliyun.com/)

#### 配置步骤

1. 打开扩展侧边栏
2. 切换到「设置」标签
3. 填写以下配置：

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| API Key | OpenAI API 密钥 | - |
| Base URL | API 基础地址 | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| 模型名称 | AI 模型标识 | `qwen-turbo` |
| 最大 Token | 单次请求最大 tokens | 4000 |

#### 支持的模型示例

| 提供商 | 模型名称 |
|--------|----------|
| OpenAI | `gpt-4o`, `gpt-4o-mini`, `gpt-3.5-turbo` |
| 阿里云 | `qwen-turbo`, `qwen-plus`, `qwen-max` |
| 其他兼容接口 | 根据服务商文档填写 |

---

## 使用指南

### 界面概览

```
┌─────────────────────────────────────┐
│  🌐 网页  │  📝 总结  │  💬 对话  │  ⚙️ 设置  │
├─────────────────────────────────────┤
│                                     │
│           [ 功能面板区域 ]           │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

### 功能标签说明

#### 网页标签

显示当前网页的详细提取信息：

- **HTML**: 网页原始 HTML 代码
- **文本**: 提取的纯文本内容
- **图片**: 页面中的所有图片链接
- **链接**: 页面中的所有超链接
- **元数据**: title、description、keywords 等
- **样式**: CSS 样式信息
- **脚本**: JavaScript 脚本信息
- **文章**: 提取的正文内容

#### 总结标签

使用 AI 对网页内容进行智能总结：

1. 点击「开始总结」按钮
2. 等待 AI 处理（支持流式输出）
3. 查看总结结果，支持 Markdown 渲染

#### 对话标签

基于网页内容与 AI 进行多轮对话：

- 支持上下文理解
- 可询问页面相关问题
- 支持复制和导出对话内容

#### 设置标签

配置扩展的各项选项：

- 数据提取选项开关
- AI API 配置
- 主题切换
- 数据保留策略

---

## 开发指南

### 项目结构

```
Catch-Web-WTX/
├── entrypoints/
│   ├── sidepanel/          # 侧边栏主界面 (Vue 3)
│   │   ├── components/     # UI 组件
│   │   │   ├── AISummaryPanel.vue    # AI 总结面板
│   │   │   ├── ChatPanel.vue         # 对话面板
│   │   │   ├── SettingsPanel.vue     # 设置面板
│   │   │   ├── WebInfoSection.vue    # 网页信息展示
│   │   │   └── ...                   # 其他组件
│   │   ├── composables/    # 组合式函数 (业务逻辑)
│   │   │   ├── chat/                  # 对话模块子目录
│   │   │   │   ├── useChatMessage.ts  # 消息管理
│   │   │   │   ├── useChatStream.ts   # 流式响应
│   │   │   │   ├── useChatHistory.ts  # 历史记录
│   │   │   │   ├── useChatReference.ts# 参考内容
│   │   │   │   └── useChatExport.ts   # 对话导出
│   │   │   ├── useAISummary.ts        # AI 总结
│   │   │   ├── useDataExtractor.ts    # 数据提取
│   │   │   ├── useTabListeners.ts     # 标签页监听
│   │   │   ├── useTheme.ts            # 主题切换
│   │   │   └── ...                    # 其他 composables
│   │   ├── stores/         # 状态管理
│   │   │   ├── dataStore.ts           # 数据状态
│   │   │   ├── settingsStore.ts       # 设置状态
│   │   │   ├── uiStore.ts             # UI 状态
│   │   │   └── index.ts               # 统一导出
│   │   ├── utils/          # 工具函数
│   │   │   ├── browser.ts             # 浏览器 API 封装
│   │   │   ├── logger.ts              # 日志记录
│   │   │   ├── debounce.ts            # 防抖
│   │   │   ├── throttle.ts            # 节流
│   │   │   └── dom.ts                 # DOM 操作
│   │   ├── types/          # TypeScript 类型定义
│   │   ├── constants/      # 常量配置
│   │   │   ├── index.ts               # 通用常量
│   │   │   └── prompts.ts             # AI Prompt 模板
│   │   ├── App.vue          # 根组件
│   │   ├── main.ts          # 入口文件
│   │   └── style.css        # 全局样式
│   ├── background.ts       # 后台脚本
│   └── content.ts          # 内容脚本
├── .wxt/                   # WXT 生成的类型定义
├── public/                 # 静态资源
├── wxt.config.ts           # WXT 配置
├── tsconfig.json           # TypeScript 配置
├── package.json            # 项目配置
└── CLAUDE.md               # Claude Code 项目指南
```

### 架构设计原则

项目遵循以下软件工程最佳实践：

| 原则 | 应用 |
|------|------|
| **SOLID** | 单一职责：Composable、组件、Store 各司其职 |
| **DRY** | 提取公共逻辑到工具函数 (`utils/browser.ts`) |
| **KISS** | 简洁的 API 设计，易于理解和使用 |
| **YAGNI** | 仅实现必需功能，避免过度设计 |

### 数据流架构

```
用户操作 → Sidepanel UI
              ↓
         Composables (业务逻辑)
              ↓
         browser.scripting.executeScript
              ↓
         Content Script (DOM 提取)
              ↓
         返回 ExtractedData
              ↓
         Store (状态管理)
              ↓
         UI 更新
```

### 常用命令

```bash
# 开发模式 (Chrome)
pnpm dev

# 开发模式 (Firefox)
pnpm dev:firefox

# 构建 (Chrome)
pnpm build

# 构建 (Firefox)
pnpm build:firefox

# 打包为 ZIP
pnpm zip

# 类型检查
pnpm compile
```

### 添加新功能

#### 1. 添加新的数据提取类型
```typescript
// 1. 在 types/index.ts 中更新类型
interface ExtractedData {
  newField?: string;
}

// 2. 在 composables/useDataExtractor.ts 中添加提取逻辑
function extractNewField() { ... }

// 3. 在 stores/settingsStore.ts 中添加配置选项
interface Settings {
  extractNewField: boolean;
}

// 4. 在 components/SettingsPanel.vue 中添加 UI 开关
```

#### 2. 添加新的 Composable
```typescript
// 在 composables/ 目录下创建 useXxx.ts
import { ref } from 'vue';

export function useXxx() {
  const state = ref('');

  function doSomething() {
    // 业务逻辑
  }

  return { state, doSomething };
}
```

#### 3. 添加新的 UI 组件
```vue
<!-- 在 components/ 目录下创建 XxxPanel.vue -->
<script setup lang="ts">
// 导入需要的 composables
import { useXxx } from '../composables/useXxx';

const { state, doSomething } = useXxx();
</script>

<template>
  <div class="xxx-panel">
    <!-- 组件内容 -->
  </div>
</template>
```

#### 4. 添加常量配置
```typescript
// 在 constants/ 目录下添加或更新配置文件
export const NEW_CONFIG = {
  value: 'default',
} as const;
```

---

## 常见问题

### Q: AI 总结功能不工作？

**A**: 请检查：
1. API Key 是否正确填写
2. Base URL 是否可访问
3. 账户是否有足够的 API 配额
4. 网络连接是否正常

### Q: 某些网站数据提取不完整？

**A**: 部分网站使用动态加载或反爬虫机制，可以尝试：
1. 刷新页面后重新提取
2. 在设置中开启更多提取选项
3. 使用内容脚本模式

### Q: 如何卸载扩展？

**A**:
- **Chrome**: `chrome://extensions/` → 找到扩展 → 点击「移除」
- **Firefox**: `about:addons` → 找到扩展 → 点击「...」→ 「移除」

### Q: 数据保存在哪里？

**A**:
- 所有数据使用浏览器 `localStorage` 本地存储
- 数据完全保存在本地，不上传任何第三方服务器

### Q: 支持哪些浏览器？

**A**:
- Chrome / Edge (推荐)
- Firefox
- 其他基于 Chromium 的浏览器（Brave、Opera 等）

---

## 待办事项

- [ ] 总结提示词增强与优化
- [ ] i18n 国际化支持（vue-i18n）
- [ ] 优化侧边栏界面交互
- [ ] 添加插件版本展示与介绍页面
- [ ] AI 总结栏目增加元素选择功能（缩小输入范围）
- [ ] 增加搜索模式（锚点定位匹配内容）
- [ ] 添加自动化测试

---

## 贡献指南

欢迎贡献代码、报告问题或提出建议！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: add some amazing feature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 提交规范

使用约定式提交（Conventional Commits）：

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具链更新

---

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

---

## 致谢

- [WXT](https://wxt.dev/) - 现代浏览器扩展开发框架
- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [OpenAI](https://openai.com/) - AI 能力支持

---

## 联系方式

- 问题反馈: [GitHub Issues](https://github.com/your-username/Catch-Web-WTX/issues)
- 邮箱: your-email@example.com

---

<div align="center">

**如果这个项目对你有帮助，请给它一个 ⭐️**

</div>
