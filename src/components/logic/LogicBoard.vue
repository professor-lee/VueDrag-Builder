<template>
  <div class="logic-board" @dragover.prevent @drop.prevent>
    <div class="board-header">
      <div class="title-block">
        <div class="title">逻辑工作区</div>
        <div class="subtitle">页面：{{ currentPage?.name || '未选择' }}</div>
      </div>
      <div class="header-actions">
        <el-button size="small" @click="addSample">快速添加 useMouse</el-button>
        <el-button size="small" type="primary" @click="backToCanvas">返回画布</el-button>
      </div>
    </div>

    <div class="board-body">
      <div v-if="!composables.length" class="empty-state">
        <el-empty description="请使用左侧“添加逻辑”入口创建逻辑" :image-size="120" />
      </div>

      <div v-else class="logic-layout">
        <div class="logic-list-pane">
          <div class="list-toolbar">
            <el-input v-model="search" size="small" placeholder="搜索逻辑" clearable />
            <el-button size="small" text @click="addSample">快速添加</el-button>
          </div>
          <el-scrollbar class="list-scroll">
            <div
              v-for="item in filteredComposables"
              :key="item.id"
              :class="['logic-list-item', { active: item.id === selectedId } ]"
              @click="select(item)"
            >
              <div class="list-line">
                <span class="list-name">{{ item.name }}</span>
                <el-tag size="small" effect="plain">{{ item.source || 'local' }}</el-tag>
              </div>
              <div class="list-meta">
                <span>返回 {{ item.returns?.length || 0 }}</span>
                <span>绑定 {{ item.bindings?.length || 0 }}</span>
              </div>
            </div>
            <div v-if="!filteredComposables.length" class="empty-list">无匹配逻辑</div>
          </el-scrollbar>
        </div>

        <div class="logic-detail-pane">
          <div v-if="!selectedComposable" class="detail-empty">选择左侧逻辑查看详情</div>
          <div v-else class="detail-card">
            <div class="detail-header">
              <el-input v-model="editName" size="small" placeholder="逻辑名称" />
              <div class="detail-source">{{ selectedComposable.source || 'local' }}</div>
            </div>

            <div class="detail-section">
              <div class="section-title">返回值</div>
              <div class="tag-row">
                <el-tag v-for="ret in selectedComposable.returns" :key="ret" size="small">{{ ret }}</el-tag>
                <span v-if="!selectedComposable.returns?.length" class="muted">无返回值</span>
              </div>
            </div>

            <div class="detail-section">
              <div class="section-title">绑定</div>
              <div v-if="selectedComposable.bindings?.length" class="binding-list">
                <div
                  v-for="bind in selectedComposable.bindings"
                  :key="`${bind.componentId || 'component'}:${bind.prop || 'prop'}`"
                  class="binding-item"
                >
                  <span class="binding-target">{{ bind.componentId || 'component' }}</span>
                  <span class="binding-prop">· {{ bind.prop || 'prop' }}</span>
                  <span v-if="bind.returnKey" class="binding-return">→ {{ bind.returnKey }}</span>
                </div>
              </div>
              <div v-else class="muted">暂无绑定</div>
            </div>

            <div class="detail-actions">
              <el-button size="small" @click="saveName" :disabled="!canSaveName">重命名</el-button>
              <el-button size="small" type="danger" @click="remove(selectedComposable)">删除</el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCanvasStore } from '@/stores/canvas'
import { useEditorStore } from '@/stores/editor'

const canvasStore = useCanvasStore()
const editorStore = useEditorStore()

const currentPage = computed(() => {
  return canvasStore.pages.find(p => p.id === (editorStore.logicBoardPageId || canvasStore.currentPageId))
})

const composables = computed(() => currentPage.value?.composables || [])
const search = ref('')
const selectedId = ref(null)
const editName = ref('')

const filteredComposables = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  if (!keyword) return composables.value
  return composables.value.filter(item => {
    const text = `${item.name || ''} ${item.source || ''}`.toLowerCase()
    return text.includes(keyword)
  })
})

const selectedComposable = computed(() => composables.value.find(item => item.id === selectedId.value))

watch(
  () => composables.value,
  (list) => {
    if (!Array.isArray(list) || list.length === 0) {
      selectedId.value = null
      editName.value = ''
      return
    }
    if (!list.find(item => item.id === selectedId.value)) {
      selectedId.value = list[0].id
    }
    const target = list.find(item => item.id === selectedId.value)
    editName.value = target?.name || ''
  },
  { immediate: true }
)

watch(
  () => selectedComposable.value,
  (val) => {
    if (val) {
      editName.value = val.name
    }
  },
  { immediate: true }
)

const backToCanvas = () => {
  editorStore.closeLogicBoard()
}

const addSample = () => {
  addComposable({ name: 'useMouse', source: '@vueuse/core', params: [], returns: ['x', 'y'], bindings: [] })
}

const addComposable = (payload) => {
  if (!currentPage.value) {
    ElMessage.warning('请先选择页面')
    return
  }
  const id = canvasStore.addComposable(payload)
  if (id) {
    ElMessage.success(`已添加逻辑 ${payload.name}`)
  }
}

const remove = async (item) => {
  if (Array.isArray(item.bindings) && item.bindings.length > 0) {
    const confirmed = await ElMessageBox.confirm('该逻辑已被绑定，确认强制删除？', '删除确认', {
      confirmButtonText: '强制删除',
      cancelButtonText: '取消',
      type: 'warning',
    }).catch(() => null)
    if (!confirmed) return
    canvasStore.removeComposable(item.id, { force: true })
    return
  }
  canvasStore.removeComposable(item.id)
}

const select = (item) => {
  selectedId.value = item.id
  editName.value = item.name
}

const canSaveName = computed(() => !!selectedComposable.value && !!editName.value.trim() && editName.value.trim() !== selectedComposable.value.name)

const saveName = () => {
  if (!canSaveName.value || !selectedComposable.value) return
  const next = editName.value.trim()
  canvasStore.updateComposable(selectedComposable.value.id, { name: next })
  ElMessage.success('已重命名')
}
</script>

<style scoped>
.logic-board {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--vscode-editor-bg);
  color: var(--vscode-foreground);
}

.board-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--vscode-widget-border);
}

.title-block {
  display: flex;
  flex-direction: column;
}

.title {
  font-size: 16px;
  font-weight: 700;
}

.subtitle {
  font-size: 12px;
  color: var(--vscode-fg-muted);
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.board-body {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logic-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
  height: 100%;
}

.logic-list-pane {
  border: 1px solid var(--vscode-widget-border);
  border-radius: 6px;
  background: var(--vscode-editor-bg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.list-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid var(--vscode-widget-border);
}

.list-scroll {
  flex: 1;
  padding: 8px 0;
}

.logic-list-item {
  padding: 8px 12px;
  border-left: 3px solid transparent;
  cursor: pointer;
}

.logic-list-item:hover {
  background: var(--vscode-list-hover);
}

.logic-list-item.active {
  background: var(--vscode-list-activeSelectionBackground, var(--vscode-list-hover));
  border-left-color: var(--vscode-focusBorder);
}

.list-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.list-name {
  font-weight: 600;
}

.list-meta {
  color: var(--vscode-fg-muted);
  font-size: 12px;
  display: flex;
  gap: 12px;
  margin-top: 4px;
}

.empty-list {
  color: var(--vscode-fg-muted);
  font-size: 12px;
  padding: 12px;
}

.logic-detail-pane {
  border: 1px solid var(--vscode-widget-border);
  border-radius: 6px;
  background: var(--vscode-editor-bg);
  padding: 14px;
  overflow: auto;
}

.detail-empty {
  color: var(--vscode-fg-muted);
}

.detail-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-source {
  color: var(--vscode-fg-muted);
  font-size: 12px;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-title {
  font-weight: 600;
  font-size: 13px;
}

.tag-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.binding-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.binding-item {
  padding: 6px 8px;
  border: 1px solid var(--vscode-widget-border);
  border-radius: 4px;
  display: inline-flex;
  gap: 6px;
  align-items: center;
  width: fit-content;
}

.binding-target {
  font-weight: 600;
}

.binding-prop,
.binding-return {
  color: var(--vscode-fg-muted);
}

.muted {
  color: var(--vscode-fg-muted);
  font-size: 12px;
}

.detail-actions {
  display: flex;
  gap: 8px;
}
</style>
