<template>
  <div class="top-bar">
    <div class="top-bar-left">
      <div class="window-controls-placeholder"></div> <!-- Placeholder for window controls if needed -->
      <span class="app-title">VueDrag Builder</span>
      <span class="separator">-</span>
      <span class="project-name">{{ projectStore.projectName }}</span>
    </div>

    <div class="top-bar-center">
      <div class="device-switcher">
        <button 
          class="icon-btn" 
          :class="{ active: editorStore.deviceMode === 'desktop' }"
          @click="editorStore.setDeviceMode('desktop')"
          title="桌面端 (1280px)"
        >
          <el-icon><Monitor /></el-icon>
        </button>
        <button 
          class="icon-btn" 
          :class="{ active: editorStore.deviceMode === 'tablet' }"
          @click="editorStore.setDeviceMode('tablet')"
          title="平板 (768px)"
        >
          <el-icon><Iphone style="transform: rotate(90deg)" /></el-icon>
        </button>
        <button 
          class="icon-btn" 
          :class="{ active: editorStore.deviceMode === 'mobile' }"
          @click="editorStore.setDeviceMode('mobile')"
          title="移动端 (375px)"
        >
          <el-icon><Iphone /></el-icon>
        </button>
      </div>
    </div>

    <div class="top-bar-right">
      <div class="action-group">
        <button class="icon-btn" @click="handleUndo" :disabled="!historyStore.canUndo" title="撤销 (Ctrl+Z)">
          <el-icon><RefreshLeft /></el-icon>
        </button>
        <button class="icon-btn" @click="handleRedo" :disabled="!historyStore.canRedo" title="重做 (Ctrl+Shift+Z)">
          <el-icon><RefreshRight /></el-icon>
        </button>
      </div>

      <div class="action-group">
        <button class="icon-btn" @click="handleSave" title="保存 (Ctrl+S)">
          <el-icon><DocumentCopy /></el-icon>
        </button>
        <button class="icon-btn" @click="handlePreview" title="预览">
          <el-icon><View /></el-icon>
        </button>
        <button class="icon-btn" @click="handleExportCommand('source-zip')" title="导出">
          <el-icon><Download /></el-icon>
        </button>
        <button class="icon-btn" @click="showCanvasSettings = true" title="画布设置">
          <el-icon><Setting /></el-icon>
        </button>
      </div>

      <div class="layout-controls">
        <button
          class="icon-btn"
          :class="{ active: editorStore.mode === 'visual' }"
          @click="handleViewChange('visual')"
          title="可视化模式"
        >
          <el-icon><Monitor /></el-icon>
        </button>
        <button
          class="icon-btn"
          :class="{ active: editorStore.mode === 'code' }"
          @click="handleViewChange('code')"
          title="代码模式"
        >
          <el-icon><files /></el-icon>
        </button>
        <button
          class="icon-btn"
          :class="{ active: editorStore.terminalVisible }"
          @click="toggleTerminalPanel"
          title="切换面板 (Ctrl+`)"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M14 1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zm0 13H2V5h12v9zM2 4V2h12v2H2z"/>
            <path d="M4 8l3 2-3 2V8z"/>
            <path d="M8 11h4v1H8z"/>
          </svg>
        </button>
      </div>
    </div>
  </div>

  <!-- 画布设置对话框 -->
  <el-dialog
    v-model="showCanvasSettings"
    title="画布设置"
    width="400px"
    append-to-body
  >
    <el-form label-position="top">
      <el-form-item label="固定大小">
        <el-switch
          v-model="canvasStore.canvasSize.isFixed"
          @change="handleCanvasSizeChange"
        />
      </el-form-item>
      
      <template v-if="canvasStore.canvasSize.isFixed">
        <el-form-item label="宽度 (px)">
          <el-input-number 
            v-model="canvasStore.canvasSize.width" 
            :min="300" 
            :max="3840"
            @change="handleCanvasSizeChange"
          />
        </el-form-item>
        <el-form-item label="高度 (px)">
          <el-input-number 
            v-model="canvasStore.canvasSize.height" 
            :min="300" 
            :max="3840"
            @change="handleCanvasSizeChange"
          />
        </el-form-item>
      </template>

      <el-form-item label="背景颜色">
        <el-color-picker 
          v-model="canvasStore.globalStyles" 
          show-alpha
          @change="canvasStore.updateGlobalStyles"
        />
      </el-form-item>
    </el-form>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useEditorStore } from '@/stores/editor'
import { useHistoryStore } from '@/stores/history'
import { useProjectExport } from '@/composables/useProjectExport'
import { ElMessage } from 'element-plus'
import {
  RefreshLeft,
  RefreshRight,
  DocumentCopy,
  View,
  Download,
  Search,
  Monitor,
  Files,
  Setting,
  Iphone
} from '@element-plus/icons-vue'
import { useCanvasStore } from '@/stores/canvas'

const emit = defineEmits(['toggle-view'])
const projectStore = useProjectStore()
const editorStore = useEditorStore()
const historyStore = useHistoryStore()
const canvasStore = useCanvasStore()
const {
  exportSourceFolder,
  exportSourceZip,
  exportBuildFolder,
  exportBuildZip,
} = useProjectExport()

const showCanvasSettings = ref(false)

const handleViewChange = (view) => {
  editorStore.setMode(view)
  emit('toggle-view', view)
}

const handleUndo = () => historyStore.undo()
const handleRedo = () => historyStore.redo()

const handleSave = async () => {
  if (!projectStore.hasProject) {
    ElMessage.warning('请先创建或打开一个项目')
    return
  }
  
  try {
    await projectStore.saveProject()
  } catch (error) {
    console.error('保存失败:', error)
  }
}

const handlePreview = () => {
  ElMessage.info('预览功能开发中...')
}

const handleExportCommand = async command => {
  switch (command) {
    case 'source-folder':
      await exportSourceFolder()
      break
    case 'source-zip':
      await exportSourceZip()
      break
    case 'build-folder':
      await exportBuildFolder()
      break
    case 'build-zip':
      await exportBuildZip()
      break
    default:
      break
  }
}

const toggleTerminalPanel = () => {
  editorStore.toggleTerminal()
}

const handleCanvasSizeChange = () => {
  canvasStore.updateCanvasSize(canvasStore.canvasSize)
}
</script>



<style scoped>
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 30px; /* VS Code standard title bar height */
  padding: 0 8px;
  background-color: var(--vscode-titlebar-bg);
  color: var(--vscode-titlebar-fg);
  user-select: none;
  font-size: 13px;
}

.top-bar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.window-controls-placeholder {
  width: 0; /* Adjust if custom window controls are added */
}

.app-title {
  font-weight: 600;
  font-size: 12px;
}

.separator {
  color: var(--vscode-fg-muted);
}

.project-name {
  font-size: 12px;
  color: var(--vscode-titlebar-fg);
}

.top-bar-center {
  flex: 2;
  display: flex;
  justify-content: center;
  gap: 16px;
}

.device-switcher {
  display: flex;
  align-items: center;
  gap: 2px;
  background-color: var(--vscode-input-bg);
  border-radius: 4px;
  padding: 2px;
}

.command-palette-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 2px 20px;
  width: 400px;
  max-width: 100%;
  height: 22px;
  cursor: pointer;
  color: var(--vscode-fg-muted);
  font-size: 12px;
  border: 1px solid transparent;
}

.command-palette-trigger:hover {
  background-color: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.2);
  color: var(--vscode-fg);
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  justify-content: flex-end;
}

.action-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.layout-controls {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: 8px;
  padding-left: 8px;
  border-left: 1px solid var(--vscode-fg-muted);
}

.icon-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--vscode-titlebar-fg);
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.1s;
}

.icon-btn:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.1);
}

.icon-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.icon-btn.active {
  background-color: rgba(255, 255, 255, 0.2);
  color: #fff;
}
</style>
