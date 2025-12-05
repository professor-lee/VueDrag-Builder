<template>
  <div class="editor-view" @mousemove="handleMouseMove" @mouseup="handleMouseUp">
    <!-- 顶部工具栏 -->
    <TopBar @toggle-view="handleToggleView" />

    <!-- 主要内容区域 -->
    <div class="editor-main">
      <!-- 可视化编辑模式 -->
      <template v-if="editorStore.mode === 'visual'">
        <!-- 左侧面板 -->
        <section 
          class="pane left-pane" 
          :style="{ width: isLeftCollapsed ? '0px' : `${leftWidth}px` }"
          :class="{ collapsed: isLeftCollapsed }"
        >
          <LeftPanel v-show="!isLeftCollapsed" />
        </section>

        <!-- 左侧调整手柄 -->
        <div 
          class="resizer left-resizer" 
          @mousedown.prevent="startResize('left')"
          title="拖动调整宽度"
        >
          <div class="resizer-handle"></div>
          <div class="collapse-trigger top-trigger" @click.stop="toggleLeftPanel" title="折叠/展开">
            <el-icon :size="14"><component :is="isLeftCollapsed ? ArrowRight : ArrowLeft" /></el-icon>
          </div>
        </div>

        <!-- 中间画布 -->
        <section class="pane center-pane">
          <div class="canvas-container">
            <CanvasArea v-if="!editorStore.logicBoardVisible" />
            <LogicBoard v-else />
          </div>
          <BottomPanel v-if="editorStore.terminalVisible" class="panel-in-center" />
        </section>

        <!-- 右侧调整手柄 -->
        <div 
          class="resizer right-resizer" 
          @mousedown.prevent="startResize('right')"
          title="拖动调整宽度"
        >
          <div class="resizer-handle"></div>
          <div class="collapse-trigger top-trigger" @click.stop="toggleRightPanel" title="折叠/展开">
            <el-icon :size="14"><component :is="isRightCollapsed ? ArrowLeft : ArrowRight" /></el-icon>
          </div>
        </div>

        <!-- 右侧面板 -->
        <section 
          class="pane right-pane" 
          :style="{ width: isRightCollapsed ? '0px' : `${rightWidth}px` }"
          :class="{ collapsed: isRightCollapsed }"
        >
          <RightPanel v-show="!isRightCollapsed" />
        </section>
      </template>

      <!-- 代码编辑模式 -->
      <template v-else>
        <div class="code-container">
          <CodeEditor style="flex: 1; min-height: 0;" />
          <BottomPanel v-if="editorStore.terminalVisible" class="panel-in-code" />
        </div>
      </template>
    </div>

    <!-- 状态栏 -->
    <StatusBar />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { useHistoryStore } from '@/stores/history'
import { useEditorStore } from '@/stores/editor'
import { useCanvasStore } from '@/stores/canvas'
import { useAutoSave } from '@/composables/useAutoSave'
import { useProjectExport } from '@/composables/useProjectExport'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, ArrowRight, Fold, Expand } from '@element-plus/icons-vue'

import TopBar from '@/components/layout/TopBar.vue'
import LeftPanel from '@/components/layout/LeftPanel.vue'
import CanvasArea from '@/components/canvas/CanvasArea.vue'
import RightPanel from '@/components/layout/RightPanel.vue'
import BottomPanel from '@/components/layout/BottomPanel.vue'
import CodeEditor from '@/components/code-mode/CodeEditor.vue'
import StatusBar from '@/components/layout/StatusBar.vue'
import LogicBoard from '@/components/logic/LogicBoard.vue'

const router = useRouter()
const projectStore = useProjectStore()
const historyStore = useHistoryStore()
const editorStore = useEditorStore()
const {
  exportSourceFolder,
  exportSourceZip,
  exportBuildFolder,
  exportBuildZip,
} = useProjectExport()

// 启用自动保存
const { saveNow } = useAutoSave()

// 面板状态管理
const leftWidth = ref(280)
const rightWidth = ref(300)
const isLeftCollapsed = ref(false)
const isRightCollapsed = ref(false)
const isResizing = ref(false)
const resizeTarget = ref(null) // 'left' or 'right'

// 切换视图模式
const handleToggleView = (view) => {
  editorStore.setMode(view)
  if (view === 'code') {
    editorStore.closeLogicBoard()
  }
}

// 面板调整逻辑
const startResize = (target) => {
  isResizing.value = true
  resizeTarget.value = target
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const handleMouseMove = (e) => {
  if (!isResizing.value) return

  if (resizeTarget.value === 'left') {
    const newWidth = e.clientX
    if (newWidth >= 150 && newWidth <= 500) {
      leftWidth.value = newWidth
      if (isLeftCollapsed.value) isLeftCollapsed.value = false
    }
  } else if (resizeTarget.value === 'right') {
    const newWidth = window.innerWidth - e.clientX
    if (newWidth >= 200 && newWidth <= 600) {
      rightWidth.value = newWidth
      if (isRightCollapsed.value) isRightCollapsed.value = false
    }
  }
}

const handleMouseUp = () => {
  if (isResizing.value) {
    isResizing.value = false
    resizeTarget.value = null
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
}

const toggleLeftPanel = () => {
  isLeftCollapsed.value = !isLeftCollapsed.value
}

const toggleRightPanel = () => {
  isRightCollapsed.value = !isRightCollapsed.value
}

// 检查是否有打开的项目
onMounted(() => {
  if (!projectStore.hasProject) {
    ElMessage.warning('请先创建或打开一个项目')
    router.push('/')
    return
  }

  // 监听菜单事件
  setupMenuListeners()
})

onUnmounted(() => {
  removeMenuListeners()
})

// 菜单事件处理
const handleMenuNewProject = async () => {
  const confirmed = await window.electron.showMessage({
    type: 'warning',
    title: '新建项目',
    message: '是否保存当前项目?',
    buttons: ['保存', '不保存', '取消'],
    defaultId: 0,
    cancelId: 2,
  })

  if (confirmed.response === 2) return // 取消

  if (confirmed.response === 0) {
    // 保存
    await saveNow()
  }

  // 跳转到欢迎页
  router.push('/')
}

const handleMenuOpen = async () => {
  const confirmed = await window.electron.showMessage({
    type: 'warning',
    title: '打开项目',
    message: '是否保存当前项目?',
    buttons: ['保存', '不保存', '取消'],
    defaultId: 0,
    cancelId: 2,
  })

  if (confirmed.response === 2) return // 取消

  if (confirmed.response === 0) {
    // 保存
    await saveNow()
  }

  // 选择项目目录
  const result = await window.electron.selectFolder()
  if (result && !result.canceled && result.path && result.success !== false) {
    await projectStore.loadProject(result.path)
  }
}

const handleMenuSave = () => {
  saveNow()
}

const handleMenuSaveAs = async () => {
  if (!window.electron) return

  const result = await window.electron.selectFolder()
  if (!result || result.canceled || !result.path || result.success === false) return

  const normalizedPath = result.path.replace(/[\\/]+$/, '') || result.path
  projectStore.projectPath = normalizedPath
  await projectStore.saveProject()
}

const handleMenuToggleMode = () => {
  editorStore.toggleMode()
}

const handleMenuAbout = () => {
  ElMessageBox.alert(
    `
    <div style="text-align: center;">
      <h3>VueDrag Builder</h3>
      <p>版本: v1.5.3</p>
      <p>零配置的Vue3可视化开发平台</p>
      <p>Copyright © 2025 professor-lee</p>
    </div>
    `,
    '关于',
    {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '确定',
    }
  )
}

const handleMenuExport = async () => {
  await promptExportType()
}

const promptExportType = async () => {
  try {
    await ElMessageBox.confirm('请选择导出方式', '导出项目', {
      distinguishCancelAndClose: true,
      confirmButtonText: '导出源代码',
      cancelButtonText: '导出构建版本',
      type: 'info',
    })
    await promptExportFormat('source')
  } catch (action) {
    if (action === 'cancel') {
      await promptExportFormat('build')
    }
  }
}

const promptExportFormat = async type => {
  try {
    await ElMessageBox.confirm('请选择导出格式', '导出格式', {
      distinguishCancelAndClose: true,
      confirmButtonText: '导出为文件夹',
      cancelButtonText: '导出为 ZIP',
      type: 'info',
    })

    if (type === 'source') {
      await exportSourceFolder()
    } else {
      await exportBuildFolder()
    }
  } catch (action) {
    if (action === 'cancel') {
      if (type === 'source') {
        await exportSourceZip()
      } else {
        await exportBuildZip()
      }
    }
  }
}

const handleMenuUndo = () => {
  historyStore.undo()
}

const handleMenuRedo = () => {
  historyStore.redo()
}

// 菜单事件清理函数
let cleanupFunctions = []

const setupMenuListeners = () => {
  // 键盘快捷键
  document.addEventListener('keydown', handleKeydown)

  // Electron 菜单事件
  if (window.electron) {
    cleanupFunctions.push(window.electron.onMenuNewProject(handleMenuNewProject))
    cleanupFunctions.push(window.electron.onMenuOpen(handleMenuOpen))
    cleanupFunctions.push(window.electron.onMenuOpenProject(handleMenuOpen))
    cleanupFunctions.push(window.electron.onMenuSave(handleMenuSave))
    cleanupFunctions.push(window.electron.onMenuSaveAs(handleMenuSaveAs))
    cleanupFunctions.push(window.electron.onMenuExport(handleMenuExport))
    cleanupFunctions.push(window.electron.onMenuToggleMode(handleMenuToggleMode))
    cleanupFunctions.push(window.electron.onMenuAbout(handleMenuAbout))
    cleanupFunctions.push(window.electron.onMenuUndo(handleMenuUndo))
    cleanupFunctions.push(window.electron.onMenuRedo(handleMenuRedo))
  }
}

const removeMenuListeners = () => {
  document.removeEventListener('keydown', handleKeydown)
  
  // 清理 Electron 监听器
  cleanupFunctions.forEach(cleanup => cleanup && cleanup())
  cleanupFunctions = []
}

const handleKeydown = e => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey

  // Ctrl/Cmd 快捷键
  if (cmdOrCtrl) {
    if (e.key === 's') {
      e.preventDefault()
      handleMenuSave()
    } else if (e.key === 'z') {
      e.preventDefault()
      if (e.shiftKey) {
        handleMenuRedo()
      } else {
        handleMenuUndo()
      }
    }
  }
  
  // Delete/Backspace 删除组件
  if ((e.key === 'Delete' || e.key === 'Backspace') && !e.target.matches('input, textarea')) {
    e.preventDefault()
    const editorStore = useEditorStore()
    const canvasStore = useCanvasStore()
    
    if (editorStore.selectedComponentId) {
      canvasStore.deleteComponent(editorStore.selectedComponentId)
    }
  }
}
</script>

<style scoped>
.editor-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--vscode-bg);
}

.editor-main {
  flex: 1;
  display: flex;
  background-color: var(--vscode-bg);
  overflow: hidden;
  position: relative;
}

.pane {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  transition: width 0.1s ease-out;
}

.left-pane {
  background-color: var(--vscode-sidebar-bg);
  border-right: 1px solid var(--vscode-border);
}

.center-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--vscode-editor-bg);
  min-height: 0;
  min-width: 0; /* 防止 flex 子项溢出 */
}

.canvas-container {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.right-pane {
  background-color: var(--vscode-sidebar-bg);
  border-left: 1px solid var(--vscode-border);
}

.code-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--vscode-editor-bg);
  min-height: 0;
}

.panel-in-center,
.panel-in-code {
  flex-shrink: 0;
  height: 200px; /* Ensure terminal has height */
  border-top: 1px solid var(--vscode-border);
}

/* Resizer Styles */
.resizer {
  width: 4px;
  background-color: transparent;
  cursor: col-resize;
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.resizer:hover,
.resizer:active {
  background-color: var(--vscode-focusBorder);
}

.resizer-handle {
  width: 2px;
  height: 100%;
}

.collapse-trigger {
  position: absolute;
  width: 20px;
  height: 20px;
  background-color: var(--vscode-titlebar-bg);
  border: 1px solid var(--vscode-border);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 1;
  z-index: 20;
  border-radius: 2px;
  color: var(--vscode-fg-muted);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.collapse-trigger.top-trigger {
  top: 0;
  transform: none;
  border-top: none;
}

.left-resizer .collapse-trigger {
  left: 0;
  border-left: none;
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
}

.right-resizer .collapse-trigger {
  right: 0;
  border-right: none;
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
}

.resizer:hover .collapse-trigger {
  color: var(--vscode-fg);
  background-color: var(--vscode-list-hover);
}
</style>
