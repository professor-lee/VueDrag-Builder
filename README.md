# VueDrag Builder

零配置的Vue3可视化开发平台

## 项目概述

VueDrag Builder 是一个基于 Electron + Vue3 + Vite 的桌面应用，旨在为前端开发者提供零配置的可视化开发体验。通过拖拽和简单配置，快速构建专业级的 Vue3 应用。

## 技术栈

- **桌面框架**: Electron 28+
- **前端框架**: Vue 3.4+
- **构建工具**: Vite 5+
- **状态管理**: Pinia 2.1+
- **UI 组件库**: Element Plus 2.5+
- **代码编辑器**: Monaco Editor 0.45+

## 功能特性

### MVP 版本 (v1.0)

- ✅ 项目管理系统（新建/打开/保存）
- ✅ IDE 风格布局（左侧组件库 + 中间画布 + 右侧属性面板）
- ✅ 多页面支持与路由管理
- ✅ 拖拽式组件搭建（支持组件重排与跨容器移动）
- ✅ 画布交互优化（支持 Photoshop 风格的空格平移）
- ✅ 组件库（容器、基础、表单、业务组件）
- ✅ 可视化属性配置面板
- ✅ 双向同步（可视化 ↔ 代码）
- ✅ 实时预览与热重载
- ✅ 导出功能（源码 + dist）
- ✅ VSCode 风格底部面板
- ✅ 触控板手势支持（双指平移）
- ✅ 多端响应式预览（桌面/平板/手机）
- ✅ 增强的代码同步（支持 v-model）
- ✅ 代码模式高级预览（支持平移/缩放/设备切换）
- ✅ 智能自动同步（代码模式切换回可视化模式时自动保存）
- ✅ 视图重置与居中功能
- ✅ 统一的深色预览背景与网格系统

## 开发环境设置

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# 启动 Vite 开发服务器
npm run dev

# 启动 Electron 应用（开发模式）
npm run electron:dev
```

### 构建

```bash
# 构建 Web 应用
npm run build

# 构建并打包 Electron 应用
npm run electron:build
```

## 项目结构

```
vue-drag-builder/
├── electron/              # Electron 主进程
│   ├── main.js           # 主进程入口
│   ├── preload.js        # 预加载脚本
│   └── menu.js           # 菜单配置
├── src/                  # Vue3 渲染进程
│   ├── assets/           # 静态资源
│   ├── components/       # 核心组件
│   │   ├── layout/       # 布局组件
│   │   ├── canvas/       # 画布相关
│   │   ├── left-panel/   # 左侧面板
│   │   └── right-panel/  # 右侧面板
│   ├── stores/           # Pinia 状态管理
│   ├── utils/            # 工具函数
│   ├── views/            # 页面视图
│   ├── router/           # 路由配置
│   ├── App.vue           # 根组件
│   └── main.js           # 应用入口
├── index.html
├── package.json
└── vite.config.js
```

## 核心模块

### 状态管理 (Pinia Stores)

- **projectStore**: 项目元信息管理
- **canvasStore**: 组件树与页面管理
- **editorStore**: 编辑器状态管理
- **historyStore**: 撤销/重做历史记录
- **errorsStore**: 错误与警告管理

### 组件系统

- **DynamicComponent**: 递归渲染组件树
- **ComponentLibrary**: 可拖拽的组件库
- **PropertyPanel**: 属性配置面板
- **StyleEditor**: 样式编辑器
- **EventBinder**: 事件绑定器

## 快捷键

- `Ctrl/Cmd + S`: 保存项目
- `Ctrl/Cmd + Z`: 撤销
- `Ctrl/Cmd + Shift + Z`: 重做
- `Ctrl/Cmd + N`: 新建项目
- `Ctrl/Cmd + O`: 打开项目
- `Ctrl/Cmd + E`: 导出项目

## 路线图

- [x] MVP 基础框架搭建
- [x] 拖拽放置功能完善
- [x] 代码模式与 Monaco Editor 集成
- [x] 双向代码同步 (Visual <-> Code)
- [x] 响应式预览与设备切换
- [x] 触控板手势与画布交互优化
- [x] 完善的预览体验 (缩放/平移/触控板)
- [ ] 导出功能实现
- [ ] 表单校验库集成
- [ ] 主题系统
- [ ] 插件系统

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT
