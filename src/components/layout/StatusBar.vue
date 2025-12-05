<template>
  <div class="status-bar">
    <div class="status-left">
      <div class="status-item" @click="togglePanel('terminal')">
        <el-icon><Platform /></el-icon>
        <span>main*</span>
      </div>
      <div class="status-item" @click="togglePanel('problems')">
        <el-icon><CircleClose /></el-icon>
        <span>{{ errorsStore.errorCount }}</span>
        <el-icon><Warning /></el-icon>
        <span>{{ errorsStore.warningCount }}</span>
      </div>
      <div class="status-item" :class="{ active: editorStore.logicBoardVisible }" @click="handleLogicClick">
        <span>Logic:</span>
        <span>{{ logicSummary }}</span>
      </div>
    </div>
    <div class="status-right">
      <div class="status-item">
        <span>Ln {{ editorStore.cursorLine }}, Col {{ editorStore.cursorColumn }}</span>
      </div>
      <div class="status-item">
        <span>UTF-8</span>
      </div>
      <div class="status-item">
        <span>JavaScript</span>
      </div>
      <div class="status-item">
        <el-icon><Bell /></el-icon>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useErrorsStore } from '@/stores/errors'
import { useCanvasStore } from '@/stores/canvas'
import { Platform, CircleClose, Warning, Bell } from '@element-plus/icons-vue'

const editorStore = useEditorStore()
const errorsStore = useErrorsStore()
const canvasStore = useCanvasStore()

const logicSummary = computed(() => {
  const page = canvasStore.pages.find(p => p.id === canvasStore.currentPageId)
  if (!page || !Array.isArray(page.composables) || page.composables.length === 0) {
    return '无'
  }
  return page.composables.map(item => item.name).join(', ')
})

const handleLogicClick = () => {
  if (!canvasStore.currentPageId) {
    return
  }
  editorStore.openLogicBoard(canvasStore.currentPageId)
}

const togglePanel = (tab) => {
  // Just a hint/toggle, logic matches VS Code (toggles panel visibility)
  if (editorStore.terminalVisible && editorStore.terminalPreferredTab === tab) {
    editorStore.closeTerminal()
  } else {
    editorStore.openTerminal(tab)
  }
}
</script>

<style scoped>
.status-bar {
  height: 22px;
  background-color: var(--vscode-statusbar-bg);
  color: var(--vscode-statusbar-fg);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  user-select: none;
  z-index: 100;
}

.status-left,
.status-right {
  display: flex;
  align-items: center;
  height: 100%;
}

.status-item {
  padding: 0 10px;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.status-item:hover {
  background-color: var(--vscode-statusbar-item-hover);
}

.status-item.active {
  background-color: var(--vscode-statusbar-item-hover);
  color: var(--vscode-statusbar-activeFg, var(--vscode-statusbar-fg));
}

.status-item .el-icon {
  font-size: 14px;
}

.status-right .status-item {
  cursor: default;
  pointer-events: none;
}
</style>
