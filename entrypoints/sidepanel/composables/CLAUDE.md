[根目录](../../../CLAUDE.md) > [entrypoints](../../) > [sidepanel](../) > **composables**

# composables 模块文档

## 变更记录 (Changelog)

- 2025-09-18: 初始化模块AI上下文文档

## 模块职责

composables 模块包含了项目的核心业务逻辑，使用Vue 3的Composition API模式将功能逻辑封装成可复用的函数。每个composable负责特定的功能领域。

## 入口与启动

本模块作为功能逻辑库，没有独立的入口文件。各composable在需要的组件或其它composable中被引入和使用。

## 对外接口

各composable通过返回响应式数据和方法提供功能接口：

1. **useAISummary.ts**: AI总结相关功能
2. **useBookmark.ts**: 书签相关功能
3. **useChat.ts**: 聊天相关功能
4. **useDataExtractor.ts**: 数据提取相关功能
5. **useSettings.ts**: 设置管理相关功能
6. **useTheme.ts**: 主题管理相关功能
7. **useToast.ts**: 消息提示相关功能
8. **useAbortController.ts**: 请求中止控制相关功能
9. **useSupabase.ts**: Supabase数据库相关功能

## 关键依赖与配置

### 依赖库

- **vue**: Vue 3 Composition API
- **wxt/browser**: WXT浏览器API
- **@supabase/supabase-js**: Supabase客户端
- **openai**: OpenAI SDK

### 配置依赖

- **constants/index.ts**: 项目常量配置
- **types/index.ts**: TypeScript类型定义

## 数据模型

各composable处理和管理以下核心数据模型：

1. **ExtractedData**: 网页提取数据
2. **ChatMessage**: 聊天消息
3. **AISummaryData**: AI总结数据
4. **Settings**: 用户设置
5. **NewsData**: 新闻数据

## 测试与质量

建议为各composable添加单元测试，测试内容包括：

1. 数据处理逻辑正确性
2. 异步操作处理
3. 错误处理机制
4. 与其他composable的协作

## 常见问题 (FAQ)

### 1. 如何添加新的业务逻辑？

创建新的composable文件，遵循现有的模式，将相关功能逻辑封装在内，通过返回响应式数据和方法提供接口。

### 2. 如何处理异步操作？

使用async/await处理异步操作，合理使用try/catch处理错误，并提供加载状态反馈。

### 3. 如何管理状态共享？

通过Vue的响应式系统和composable的工厂模式实现状态共享，避免全局状态管理的复杂性。

## 相关文件清单

- `useAISummary.ts`: AI总结功能逻辑
- `useBookmark.ts`: 书签功能逻辑
- `useChat.ts`: 聊天功能逻辑
- `useDataExtractor.ts`: 数据提取功能逻辑
- `useSettings.ts`: 设置管理功能逻辑
- `useTheme.ts`: 主题管理功能逻辑
- `useToast.ts`: 消息提示功能逻辑
- `useAbortController.ts`: 请求中止控制功能逻辑
- `useSupabase.ts`: Supabase数据库功能逻辑
- `useDataExport.ts`: 数据导出功能逻辑
- `useTabListeners.ts`: 标签页监听功能逻辑
- `useTabNavigation.ts`: 标签页导航功能逻辑