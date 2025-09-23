# Catch Web WTX

一个基于 WXT 和 Vue 3 的浏览器扩展，用于提取网页信息并提供 AI 总结和对话功能。

## TODO

- [ ] 总结 tab 中的提示词增强
- [ ] i18 支持，vue-i18
- [ ] 优化侧边栏界面
- [ ] 插件版本以及介绍页面
- [ ] 联系和使用说明介绍，主要是 AI 部分

## 功能特性

- **网页信息提取**：提取当前网页的 HTML、文本、图片、链接、元数据、样式、脚本和文章内容
- **AI 总结**：使用 OpenAI API 对提取的网页内容进行智能总结
- **对话功能**：基于网页内容与 AI 进行对话
- **侧边栏界面**：优雅的侧边栏界面，支持深色模式
- **数据导出**：支持导出提取的数据

## 技术栈

- **WXT**：现代浏览器扩展开发框架
- **Vue 3**：前端框架
- **TypeScript**：类型安全的 JavaScript
- **OpenAI API**：AI 功能支持
- **Supabase**：数据存储（可选）

## 安装与开发

### 环境要求

- Node.js 18+
- pnpm（推荐）

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
# Chrome
pnpm dev

# Firefox
pnpm dev:firefox
```

### 构建扩展

```bash
# Chrome
pnpm build

# Firefox
pnpm build:firefox
```

### 打包扩展

```bash
# Chrome
pnpm zip

# Firefox
pnpm zip:firefox
```

## 使用说明

1. 安装扩展后，点击工具栏图标打开侧边栏

### 功能标签页

- **网页**：查看和提取当前网页信息
- **总结**：使用 AI 对网页内容进行总结
- **对话**：基于网页内容与 AI 对话
- **设置**：配置扩展选项和 API 密钥

## 配置

在设置页面中，您可以配置：

- 数据提取选项（HTML、文本、图片、链接等）
- AI API 密钥和模型设置
- 界面主题（深色/浅色模式）
- 数据保留策略

## 权限说明

扩展需要以下权限：

- `activeTab`：访问当前活动标签页
- `storage`：本地数据存储
- `scripting`：在网页上执行脚本
- `sidePanel`：侧边栏功能
- `tabs`：标签页管理
- `webNavigation`：网页导航监控
- `downloads`：文件下载功能

## 贡献

欢迎提交 Issue 和 Pull Request！
