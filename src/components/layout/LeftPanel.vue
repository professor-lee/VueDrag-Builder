<template>
  <div class="left-panel">
    <div class="sidebar-header">
      <span class="header-title">资源管理器</span>
      <div class="header-actions">
        <!-- Placeholder for actions like collapse, refresh -->
      </div>
    </div>
    
    <el-tabs v-model="activeTab" class="sidebar-tabs">
      <el-tab-pane label="组件库" name="components">
        <ComponentLibrary />
      </el-tab-pane>

      <el-tab-pane label="大纲" name="tree">
        <ComponentTree />
      </el-tab-pane>

      <el-tab-pane label="页面" name="pages">
        <PageManager />
      </el-tab-pane>

      <el-tab-pane label="逻辑" name="logic">
        <LogicLibrary />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ComponentLibrary from '@/components/left-panel/ComponentLibrary.vue'
import ComponentTree from '@/components/left-panel/ComponentTree.vue'
import PageManager from '@/components/left-panel/PageManager.vue'
import LogicLibrary from '@/components/left-panel/LogicLibrary.vue'

const activeTab = ref('components')
</script>

<style scoped>
.left-panel {
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
  justify-content: space-between;
  background-color: var(--vscode-sidebar-sectionHeader-bg);
  color: var(--vscode-sidebar-sectionHeader-fg);
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
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
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
  background-color: var(--vscode-sidebar-bg);
}

.sidebar-tabs :deep(.el-tab-pane) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
  height: 100%;
}

/* Ensure children scroll */
.sidebar-tabs :deep(.el-tab-pane > div) {
  flex: 1;
  overflow-y: auto;
  height: 100%;
}
</style>
