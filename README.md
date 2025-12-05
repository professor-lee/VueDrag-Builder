# VueDrag Builder

零配置的Vue3可视化开发平台

## 项目概述

VueDrag Builder 是一个基于 Electron + Vue3 + Vite 的桌面应用，提供组件拖拽 + 基础属性/样式编辑 + 简单代码同步的可视化搭建体验，支持导出标准 Vue3 工程。

## 技术栈

- **桌面框架**: Electron 39+
- **前端框架**: Vue 3.4+
- **构建工具**: Vite 7+
- **状态管理**: Pinia 2.1+
- **UI 组件库**: Element Plus 2.5+
- **代码编辑器**: Monaco Editor 0.45+

## 功能特性

### MVP 版本 (v1.5.3)

- ✅ 项目管理系统（新建/打开/保存到 `.vuedrag/builder.project.json`；旧 `.vueproject` 仅提示兼容）
- ✅ IDE 风格布局（左侧组件库 + 中间画布 + 右侧属性/样式/事件面板）
- ✅ 多页面支持（导出时生成路由，运行时固定 `/editor`）
- ✅ 拖拽式组件搭建（支持跨容器插入与排序；Grid 精确格子插入未实现）
- ✅ 组件库（容器/基础/表单组件，未含业务模板）
- ✅ 可视化属性/样式面板（基础字段、尺寸/布局/颜色等）
- ✅ 代码模式 + 预览（Monaco；仅解析 `<template>` 基础结构，复杂指令/脚本不回填）
- ✅ 实时预览（代码/可视化变更即时渲染）
- ✅ 导出源码（Vite + Vue3 工程）；构建导出依赖本地 Node/npm，界面无进度/日志
- ✅ 底部面板占位（无实时日志挂接）
- ⚠️ 触控板/滚轮：代码模式预览支持滚轮平移，未实现缩放/设备切换
- ⚠️ 响应式预览、视图居中/网格背景等高级交互未实现

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
│   ├── main.js            # 主进程入口
│   ├── preload.js         # 预加载脚本
│   └── menu.js            # 菜单配置
├── src/                   # Vue3 渲染进程
│   ├── assets/            # 静态资源
│   ├── components/
│   │   ├── layout/        # TopBar/StatusBar/LeftPanel/RightPanel/BottomPanel
│   │   ├── left-panel/    # ComponentLibrary/PageManager/ComponentTree
│   │   ├── canvas/        # CanvasArea/DynamicComponent
│   │   ├── right-panel/   # PropertyPanel/StyleEditor/EventBinder
│   │   ├── code-mode/     # CodeEditor（Monaco + 预览）
│   │   └── terminal/      # XTerminal 占位
│   ├── composables/       # useAutoSave/useComponentResize/useDragAndDrop/useProjectExport
│   ├── stores/            # project/canvas/editor/history/errors
│   ├── utils/             # codeGenerator/componentRegistry/fileExporter
│   ├── views/             # WelcomeView/EditorView
│   ├── router/            # 路由配置
│   ├── App.vue            # 根组件
│   └── main.js            # 应用入口
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
- **CodeEditor**: 代码模式（Monaco + 预览）
- **BottomPanel/XTerminal**: 底部面板占位

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
- [x] 导出功能（源码；构建依赖本地 Node/npm，界面无进度/日志）
- [ ] 表单校验库集成
- [ ] 主题系统
- [ ] 插件系统

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

AGPL-3.0-or-later
