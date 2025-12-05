<template>
  <div class="data-panel">
    <!-- 响应式状态 -->
    <div class="section">
      <div class="section-header">
        <span>响应式状态 (State)</span>
        <el-button size="small" text @click="openStateDialog()">
          <el-icon><Plus /></el-icon>
        </el-button>
      </div>
      <div class="item-list">
        <div v-for="(item, index) in editorStore.reactiveState" :key="index" class="data-item">
          <div class="item-info">
            <span class="item-name" :title="item.value">{{ item.name }}</span>
            <el-tag size="small" :type="item.type === 'ref' ? 'success' : 'warning'">{{ item.type }}</el-tag>
          </div>
          <div class="item-actions">
            <el-button size="small" link @click="openStateDialog(item, index)"><el-icon><Edit /></el-icon></el-button>
            <el-button size="small" link type="danger" @click="deleteState(index)"><el-icon><Delete /></el-icon></el-button>
          </div>
        </div>
        <div v-if="editorStore.reactiveState.length === 0" class="empty-tip">暂无数据</div>
      </div>
    </div>

    <!-- 计算属性 -->
    <div class="section">
      <div class="section-header">
        <span>计算属性 (Computed)</span>
        <el-button size="small" text @click="openComputedDialog()">
          <el-icon><Plus /></el-icon>
        </el-button>
      </div>
      <div class="item-list">
        <div v-for="(item, index) in editorStore.computedDefs" :key="index" class="data-item">
          <div class="item-info">
            <span class="item-name" :title="item.code">{{ item.name }}</span>
            <el-tag size="small" type="info">computed</el-tag>
          </div>
          <div class="item-actions">
            <el-button size="small" link @click="openComputedDialog(item, index)"><el-icon><Edit /></el-icon></el-button>
            <el-button size="small" link type="danger" @click="deleteComputed(index)"><el-icon><Delete /></el-icon></el-button>
          </div>
        </div>
        <div v-if="editorStore.computedDefs.length === 0" class="empty-tip">暂无计算属性</div>
      </div>
    </div>

    <!-- State Dialog -->
    <el-dialog v-model="stateDialogVisible" :title="editingStateIndex === -1 ? '新增状态' : '编辑状态'" width="300px" append-to-body>
      <el-form :model="stateForm" label-width="60px">
        <el-form-item label="名称">
          <el-input v-model="stateForm.name" placeholder="变量名" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="stateForm.type">
            <el-option label="ref" value="ref" />
            <el-option label="reactive" value="reactive" />
          </el-select>
        </el-form-item>
        <el-form-item label="默认值">
          <el-input v-model="stateForm.value" placeholder="JSON或字符串" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="stateDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveState">确定</el-button>
      </template>
    </el-dialog>

    <!-- Computed Dialog -->
    <el-dialog v-model="computedDialogVisible" :title="editingComputedIndex === -1 ? '新增计算属性' : '编辑计算属性'" width="300px" append-to-body>
      <el-form :model="computedForm" label-width="60px">
        <el-form-item label="名称">
          <el-input v-model="computedForm.name" placeholder="属性名" />
        </el-form-item>
        <el-form-item label="表达式">
          <el-input type="textarea" v-model="computedForm.code" placeholder="return ..." :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="computedDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveComputed">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'

const editorStore = useEditorStore()

// State Management
const stateDialogVisible = ref(false)
const editingStateIndex = ref(-1)
const stateForm = reactive({ name: '', type: 'ref', value: '' })

const openStateDialog = (item = null, index = -1) => {
  editingStateIndex.value = index
  if (item) {
    stateForm.name = item.name
    stateForm.type = item.type
    stateForm.value = item.value
  } else {
    stateForm.name = ''
    stateForm.type = 'ref'
    stateForm.value = ''
  }
  stateDialogVisible.value = true
}

const saveState = () => {
  if (!stateForm.name) return
  const newItem = { ...stateForm }
  if (editingStateIndex.value === -1) {
    editorStore.addReactiveItem(newItem)
  } else {
    editorStore.updateReactiveItem(editingStateIndex.value, newItem)
  }
  stateDialogVisible.value = false
}

const deleteState = (index) => {
  ElMessageBox.confirm('确定删除该状态吗？', '提示', { type: 'warning' }).then(() => {
    editorStore.removeReactiveItem(index)
  })
}

// Computed Management
const computedDialogVisible = ref(false)
const editingComputedIndex = ref(-1)
const computedForm = reactive({ name: '', code: '' })

const openComputedDialog = (item = null, index = -1) => {
  editingComputedIndex.value = index
  if (item) {
    computedForm.name = item.name
    computedForm.code = item.code
  } else {
    computedForm.name = ''
    computedForm.code = ''
  }
  computedDialogVisible.value = true
}

const saveComputed = () => {
  if (!computedForm.name) return
  const newItem = { ...computedForm }
  if (editingComputedIndex.value === -1) {
    editorStore.addComputed(newItem)
  } else {
    editorStore.updateComputed(editingComputedIndex.value, newItem)
  }
  computedDialogVisible.value = false
}

const deleteComputed = (index) => {
  ElMessageBox.confirm('确定删除该计算属性吗？', '提示', { type: 'warning' }).then(() => {
    editorStore.removeComputed(index)
  })
}
</script>

<style scoped>
.data-panel {
  padding: 10px;
  background-color: var(--vscode-sidebar-bg);
}
.section {
  margin-bottom: 15px;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: bold;
  color: #cccccc;
}
.item-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.data-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-widget-border);
  border-radius: 4px;
  font-size: 12px;
}
.item-info {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}
.item-name {
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100px;
  color: #cccccc;
}
.empty-tip {
  text-align: center;
  color: #888888;
  font-size: 12px;
  padding: 10px 0;
}
</style>
