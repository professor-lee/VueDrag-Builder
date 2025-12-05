<template>
  <div class="logic-library">
    <div class="library-header">
      <span class="title">逻辑库 (Composables)</span>
      <div class="header-actions">
        <el-button size="small" type="primary" @click="openAddDialog">添加逻辑</el-button>
        <el-button size="small" text @click="openBoard">打开逻辑工作区</el-button>
      </div>
    </div>

    <el-input v-model="search" placeholder="搜索逻辑..." clearable class="search-input" />

    <div
      v-for="group in filteredCatalog"
      :key="group.name"
      class="logic-group"
    >
      <div class="group-title">{{ group.name }}</div>
      <div class="logic-list">
        <div
          v-for="item in group.items"
          :key="item.name"
          class="logic-item"
        >
          <div class="logic-main">
            <div class="logic-icon">{{ item.icon }}</div>
            <div class="logic-text">
              <div class="logic-name">{{ item.name }}</div>
              <div class="logic-desc">{{ item.desc }}</div>
              <div class="logic-meta">{{ item.source }} · returns: {{ item.returns.join(', ') }}</div>
            </div>
          </div>
          <div class="logic-actions">
            <el-button size="small" @click.stop="quickAdd(item)">添加</el-button>
          </div>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="addDialogVisible"
      title="添加逻辑"
      width="420px"
      append-to-body
    >
      <div class="add-dialog-body">
        <el-select
          v-model="selectedLogicName"
          filterable
          placeholder="选择逻辑"
          class="logic-select"
        >
          <el-option
            v-for="item in flatCatalog"
            :key="item.name"
            :label="`${item.name} · ${item.desc}`"
            :value="item.name"
          />
        </el-select>
        <div class="meta-preview" v-if="selectedLogic">
          <div class="meta-row">
            <span class="meta-label">来源</span>
            <span class="meta-value">{{ selectedLogic.source }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">返回</span>
            <span class="meta-value">{{ selectedLogic.returns.join(', ') }}</span>
          </div>
          <div class="meta-row" v-if="selectedLogic.params?.length">
            <span class="meta-label">参数</span>
            <span class="meta-value">{{ selectedLogic.params.map(p => p.key || p.name || 'param').join(', ') }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmAdd">添加并打开</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useCanvasStore } from '@/stores/canvas'
import { useEditorStore } from '@/stores/editor'

const canvasStore = useCanvasStore()
const editorStore = useEditorStore()

const search = ref('')
const addDialogVisible = ref(false)
const selectedLogicName = ref('')

const logicCatalog = [
  {
    name: '传感器',
    items: [
      { name: 'useMouse', source: '@vueuse/core', returns: ['x', 'y'], params: [], icon: '⚡', desc: '鼠标位置' },
      { name: 'useWindowSize', source: '@vueuse/core', returns: ['width', 'height'], params: [], icon: '📐', desc: '窗口尺寸' },
    ],
  },
  {
    name: '状态',
    items: [
      { name: 'useStorage', source: '@vueuse/core', returns: ['value'], params: [{ key: 'key', value: 'key' }], icon: '💾', desc: '本地存储' },
      { name: 'useToggle', source: '@vueuse/core', returns: ['state', 'toggle'], params: [], icon: '🔄', desc: '布尔切换' },
    ],
  },
  {
    name: '异步',
    items: [
      { name: 'useAsyncState', source: '@vueuse/core', returns: ['state', 'isLoading', 'error'], params: [], icon: '⏳', desc: '异步状态' },
    ],
  },
]

const filteredCatalog = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  if (!keyword) return logicCatalog
  return logicCatalog
    .map(group => ({
      ...group,
      items: group.items.filter(item => item.name.toLowerCase().includes(keyword) || item.desc.toLowerCase().includes(keyword)),
    }))
    .filter(group => group.items.length > 0)
})

const flatCatalog = computed(() => logicCatalog.flatMap(group => group.items))

const selectedLogic = computed(() => flatCatalog.value.find(item => item.name === selectedLogicName.value))

const openBoard = () => {
  if (!canvasStore.currentPageId) {
    ElMessage.warning('请先选择页面')
    return
  }
  editorStore.openLogicBoard(canvasStore.currentPageId)
}

const openAddDialog = () => {
  if (!flatCatalog.value.length) return
  selectedLogicName.value = flatCatalog.value[0].name
  addDialogVisible.value = true
}

const confirmAdd = () => {
  const item = selectedLogic.value
  if (!item) {
    ElMessage.warning('请选择逻辑')
    return
  }
  quickAdd(item)
  addDialogVisible.value = false
}

const quickAdd = (item) => {
  if (!canvasStore.currentPageId) {
    ElMessage.warning('请先选择页面')
    return
  }
  canvasStore.addComposable({
    name: item.name,
    source: item.source,
    params: item.params,
    returns: item.returns,
    bindings: [],
  })
  editorStore.openLogicBoard(canvasStore.currentPageId)
  ElMessage.success(`已添加逻辑 ${item.name}`)
}
</script>

<style scoped>
.logic-library {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  overflow-y: auto;
  padding-right: 4px;
  scrollbar-gutter: stable;
}

.library-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--vscode-fg-muted);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.search-input {
  margin-bottom: 4px;
}

.logic-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.group-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--vscode-fg-muted);
  letter-spacing: 0.6px;
  padding: 4px 8px;
  text-transform: uppercase;
}

.logic-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.logic-item {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 10px;
  background: var(--vscode-input-bg);
  border: 1px solid var(--vscode-border);
  cursor: grab;
}

.logic-item:hover {
  border-color: var(--vscode-focusBorder);
  background: var(--vscode-list-hover);
}

.logic-main {
  display: flex;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.logic-icon {
  font-size: 18px;
}

.logic-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.logic-name {
  font-weight: 600;
  color: var(--vscode-foreground);
}

.logic-desc {
  color: var(--vscode-fg-muted);
  font-size: 12px;
}

.logic-meta {
  color: var(--vscode-fg-muted);
  font-size: 11px;
}

.logic-actions {
  display: flex;
  align-items: center;
}

.add-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.logic-select {
  width: 100%;
}

.meta-preview {
  border: 1px solid var(--vscode-border);
  border-radius: 6px;
  padding: 10px;
  background: var(--vscode-input-bg);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--vscode-fg);
}

.meta-label {
  color: var(--vscode-fg-muted);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
