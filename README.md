<p align="center">
  <img src="icon.svg" alt="VueDrag Builder Logo" width="256">
</p>

<h1 align="center">VueDrag Builder</h1>

<p align="center" style="color:gray;">
  🚀 零配置的 Vue3 可视化前端搭建平台
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-39.0%2B-47848F?logo=electron&logoColor=white" alt="Electron">
  <img src="https://img.shields.io/badge/Vue-3.4%2B-4FC08D?logo=vue.js&logoColor=white" alt="Vue">
  <img src="https://img.shields.io/badge/Vite-6.0%2B-646CFF?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Element_Plus-2.5%2B-409EFF?logo=element-plus&logoColor=white" alt="Element Plus">
  <img src="https://img.shields.io/badge/License-AGPL--3.0-blue" alt="License">
</p>

---

<h2 align="center">📋 项目概述</h2>

**VueDrag Builder** 是一个基于 **Electron** + **Vue3** + **Vite** 的现代化桌面应用，旨在提供极致的 **所见即所得 (WYSIWYG)** 前端搭建体验。

它不仅支持直观的**组件拖拽**、**属性/样式可视化编辑**和**事件编排**，更核心的是实现了**双向代码同步**——你既可以在画布上自由创作，也可以直接编辑生成的源代码，两者实时互通。最终，你可以将项目导出为标准的 Vue3 工程代码，或直接生成构建后的产物。

---

<h2 align="center">✨ 已有功能</h2>

- **🎨 可视化拖拽布局**：内置丰富的基础组件，通过拖拽即可快速搭建页面结构。
- **🔧 属性与样式编辑器**：直观的侧边栏面板，轻松调整组件属性、样式（CSS）及绑定事件。
- **💻 双向代码同步**：集成 Monaco Editor，支持 Vue SFC 代码实时编辑，修改代码即刻反映在画布上，反之亦然。
- **📱 响应式预览**：支持多种设备尺寸（桌面、平板、手机）切换预览，确保多端适配。
- **⌨️ 快捷键支持**：完善的快捷键系统，提升开发效率。
- **💾 自动保存与历史记录**：支持项目自动保存，以及完善的撤销/重做（Undo/Redo）功能。
- **📤 灵活导出**：支持导出 Vue3 源码工程，或直接构建生成 dist 产物。

---

<h2 align="center">🕹️ 技术栈</h2>

我们采用了最新的前端技术栈来构建这个高性能的桌面应用：

- **桌面运行时**: [Electron](https://www.electronjs.org/) 39+
- **前端框架**: [Vue](https://vuejs.org/) 3.4+
- **构建工具**: [Vite](https://vitejs.dev/) 6+
- **状态管理**: [Pinia](https://pinia.vuejs.org/) 2.1+
- **UI 组件库**: [Element Plus](https://element-plus.org/) 2.5+
- **代码编辑器**: [Monaco Editor](https://microsoft.github.io/monaco-editor/) 0.45+
- **拖拽库**: [SortableJS](https://sortablejs.github.io/Sortable/) / VueDraggable
- **AST 转换**: [Recast](https://github.com/benjamn/recast) (用于代码生成与解析)

---

<h2 align="center">🛠️ 开发环境设置</h2>

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发模式

```bash
# 同时启动 Vite 开发服务器和 Electron 主进程
npm run electron:dev
```

### 3. 构建应用

```bash
# 构建 Vue 应用并打包为 Electron 安装包
npm run electron:build
```

---

<h2 align="center">📂 项目结构</h2>

```
vue-drag-builder/
├── electron/              # Electron 主进程
│   ├── main.js            # 主进程入口
│   ├── preload.js         # 预加载脚本 (ContextBridge)
│   └── menu.js            # 原生应用菜单配置
├── src/                   # Vue3 渲染进程
│   ├── assets/            # 静态资源 (CSS, Images)
│   ├── components/        # 组件集合
│   │   ├── canvas/        # 画布区域 (CanvasArea, DynamicComponent)
│   │   ├── code-mode/     # 代码模式 (Monaco Editor + Preview)
│   │   ├── layout/        # 布局组件 (TopBar, StatusBar, Panels)
│   │   ├── left-panel/    # 左侧面板 (组件库, 页面管理, 组件树)
│   │   ├── library/       # 组件库核心逻辑
│   │   ├── logic/         # 逻辑处理组件
│   │   ├── right-panel/   # 右侧面板 (属性, 样式, 事件)
│   │   └── terminal/      # 终端组件
│   ├── composables/       # 组合式函数 (Hooks)
│   │   ├── useAutoSave.js       # 自动保存逻辑
│   │   ├── useComponentResize.js # 组件缩放逻辑
│   │   ├── useDragAndDrop.js    # 拖拽核心逻辑
│   │   └── useProjectExport.js  # 项目导出逻辑
│   ├── stores/            # Pinia 状态管理
│   │   ├── canvas.js      # 画布状态
│   │   ├── editor.js      # 编辑器全局状态
│   │   ├── errors.js      # 错误日志
│   │   ├── history.js     # 撤销重做历史栈
│   │   └── project.js     # 项目配置信息
│   ├── utils/             # 工具函数
│   │   ├── codeGenerator.js     # 代码生成器 (JSON -> Vue SFC)
│   │   ├── componentRegistry.js # 组件注册表
│   │   └── fileExporter.js      # 文件导出工具
│   ├── views/             # 页面视图
│   │   ├── WelcomeView.vue      # 欢迎页
│   │   └── EditorView.vue       # 主编辑器页
│   ├── router/            # Vue Router 路由配置
│   ├── App.vue            # 根组件
│   └── main.js            # 应用入口
├── index.html
├── package.json
└── vite.config.js
```

---

<h2 align="center">⌨️ 快捷键</h2>

| 功能 | Windows/Linux | macOS |
| :--- | :--- | :--- |
| **新建项目** | `Ctrl + N` | `Cmd + N` |
| **打开项目** | `Ctrl + O` | `Cmd + O` |
| **保存项目** | `Ctrl + S` | `Cmd + S` |
| **另存为** | `Ctrl + Shift + S` | `Cmd + Shift + S` |
| **导出项目** | `Ctrl + E` | `Cmd + E` |
| **撤销** | `Ctrl + Z` | `Cmd + Z` |
| **重做** | `Ctrl + Shift + Z` | `Cmd + Shift + Z` |
| **切换视图模式** | `Ctrl + M` | `Cmd + M` |
| **切换终端** | `Ctrl + \`` | `Cmd + \`` |
| **删除组件** | `Delete` / `Backspace` | `Delete` / `Backspace` |
| **画布缩放** | `Ctrl + 滚轮` | `Cmd + 滚轮` |
| **画布平移** | `Space + 拖拽` | `Space + 拖拽` |

---

<h2 align="center">🗺️ 路线图</h2>

- [x]  **MVP 基础框架搭建**
- [x]  **拖拽放置功能完善**
- [x]  **代码模式与 Monaco Editor 集成**
- [x]  **双向代码同步 (Visual <-> Code)**
- [x]  **响应式预览与设备切换**
- [x]  **触控板手势与画布交互优化**
- [x]  **完善的预览体验 (缩放/平移/触控板)**
- [x]  **导出功能（源码；构建依赖本地 Node/npm）**
- [ ] 🚧 **表单校验库集成**
- [ ] 🎨 **主题系统**
- [ ] 🧩 **插件系统**
- [ ] ☁️ **云端存储与分享**

---

<h3>🤝 贡献</h3>

欢迎提交 Issue 和 Pull Request！
如果你喜欢这个项目，请给它一个 ⭐️ Star！

<h3>⚖️ 许可证</h3>

[AGPL-3.0](LICENSE)
