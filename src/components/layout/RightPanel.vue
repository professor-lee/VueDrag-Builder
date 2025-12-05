<template>
  <div class="right-panel">
    <div class="sidebar-header">
      <span class="header-title">属性检查器</span>
    </div>

    <div class="panel-content">
      <!-- Global Data Management -->
      <el-collapse v-model="activeNames" class="data-collapse">
        <el-collapse-item title="数据管理 (Data)" name="data">
          <DataPanel />
        </el-collapse-item>
      </el-collapse>

      <!-- Component Properties -->
      <div v-if="selectedComponent" class="component-section">
        <el-tabs v-model="activeTab" class="sidebar-tabs">
          <el-tab-pane label="属性" name="props">
            <PropertyPanel :component="selectedComponent" />
          </el-tab-pane>

          <el-tab-pane label="样式" name="styles">
            <StyleEditor :component="selectedComponent" />
          </el-tab-pane>

          <el-tab-pane label="事件" name="events">
            <EventBinder :component="selectedComponent" />
          </el-tab-pane>
        </el-tabs>
      </div>

      <div v-else class="empty-state">
        <el-empty description="请选择一个组件" :image-size="60" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useCanvasStore } from '@/stores/canvas'
import PropertyPanel from '@/components/right-panel/PropertyPanel.vue'
import StyleEditor from '@/components/right-panel/StyleEditor.vue'
import EventBinder from '@/components/right-panel/EventBinder.vue'
import DataPanel from '@/components/right-panel/DataPanel.vue'

const editorStore = useEditorStore()
const canvasStore = useCanvasStore()

const activeTab = ref('props')
const activeNames = ref(['data'])

const selectedComponent = computed(() => {
  if (!editorStore.selectedComponentId) return null
  return canvasStore.getComponentById(editorStore.selectedComponentId)
})
</script>

<style scoped>
.right-panel {
  width: 100%;
  height: 100%;
  background-color: var(--vscode-sidebar-bg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.sidebar-header {
  height: 35px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  background-color: var(--vscode-sidebar-sectionHeader-bg);
  color: var(--vscode-sidebar-sectionHeader-fg);
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.panel-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.data-collapse {
  flex-shrink: 0;
  border-bottom: 1px solid var(--vscode-widget-border);
  overflow-y: auto;
  max-height: 40%;
}

.data-collapse :deep(.el-collapse-item__header) {
  background-color: var(--vscode-sidebar-bg);
  color: var(--vscode-foreground);
  padding-left: 10px;
  height: 35px;
  line-height: 35px;
  font-size: 12px;
  border-bottom: 1px solid var(--vscode-widget-border);
}

.data-collapse :deep(.el-collapse-item__content) {
  padding-bottom: 0;
  background-color: var(--vscode-sidebar-bg);
}

.component-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.sidebar-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.sidebar-tabs :deep(.el-tabs__header) {
  margin: 0;
  background-color: var(--vscode-sidebar-bg);
  padding: 0;
  flex-shrink: 0;
}

.sidebar-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.sidebar-tabs :deep(.el-tabs__item) {
  height: 30px;
  line-height: 30px;
  font-size: 12px;
  color: var(--vscode-fg-muted);
  border: none;
  padding: 0 16px;
  font-weight: normal;
}

.sidebar-tabs :deep(.el-tabs__item:hover) {
  color: var(--vscode-fg);
}

.sidebar-tabs :deep(.el-tabs__item.is-active) {
  color: var(--vscode-fg);
  font-weight: bold;
}

.sidebar-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  background-color: var(--vscode-sidebar-bg);
}

.sidebar-tabs :deep(.el-tab-pane) {
  padding: 10px;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--vscode-sidebar-bg);
}

.empty-state :deep(.el-empty__description) {
  color: var(--vscode-fg-muted);
}
</style>
