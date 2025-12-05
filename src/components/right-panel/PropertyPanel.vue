<template>
  <div class="property-panel">
    <!-- 选中组件时显示组件属性 -->
    <el-form v-if="component" label-position="top">
      <el-form-item label="组件ID">
        <el-input :value="component.id" disabled />
      </el-form-item>

      <el-form-item label="组件类型">
        <el-input :value="component.type" disabled />
      </el-form-item>

      <!-- 指令配置 -->
      <div class="section-header">指令 (Directives)</div>
      <el-form-item label="v-if 条件渲染">
        <el-input 
          :model-value="component.directives?.vIf" 
          @update:model-value="val => handleUpdateDirective('vIf', val)"
          placeholder="表达式 (如: isVisible)" 
        />
      </el-form-item>
      <el-form-item label="v-show 显示切换">
        <el-input 
          :model-value="component.directives?.vShow" 
          @update:model-value="val => handleUpdateDirective('vShow', val)"
          placeholder="表达式 (如: isShow)" 
        />
      </el-form-item>
      <el-form-item label="v-for 列表渲染">
        <el-input 
          :model-value="component.directives?.vFor" 
          @update:model-value="val => handleUpdateDirective('vFor', val)"
          placeholder="item in list" 
        />
        <el-input 
          :model-value="component.directives?.vForKey" 
          @update:model-value="val => handleUpdateDirective('vForKey', val)"
          placeholder="Key (如: item.id)" 
          style="margin-top: 5px;" 
        />
      </el-form-item>

      <!-- v-model 配置 -->
      <div class="section-header">双向绑定 (v-model)</div>
      <el-form-item label="绑定变量">
        <el-select 
          :model-value="component.directives?.vModel" 
          @update:model-value="val => handleUpdateDirective('vModel', val)"
          placeholder="选择变量" 
          clearable 
        >
          <el-option
            v-for="item in editorStore.reactiveState"
            :key="item.name"
            :label="item.name"
            :value="item.name"
          >
            <span style="float: left">{{ item.name }}</span>
            <span style="float: right; color: var(--el-text-color-secondary); font-size: 12px">{{ item.type }}</span>
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item v-if="component.directives?.vModel" label="修饰符">
        <el-checkbox-group 
          :model-value="component.directives?.vModelModifiers || []" 
          @update:model-value="val => handleUpdateDirective('vModelModifiers', val)"
        >
          <el-checkbox label="trim" />
          <el-checkbox label="number" />
          <el-checkbox label="lazy" />
        </el-checkbox-group>
      </el-form-item>

      <template v-if="slotOptions.length">
        <div class="section-header">插槽 Slot</div>
        <el-form-item label="所属插槽">
          <el-select
            :model-value="component.slotName || 'default'"
            @update:model-value="handleUpdateSlot"
          >
            <el-option v-for="slot in slotOptions" :key="slot" :label="slot" :value="slot" />
          </el-select>
        </el-form-item>
      </template>

      <div class="section-header">逻辑引用</div>
      <div v-if="logicOptions.length" class="logic-binding-list">
        <div
          v-for="propKey in bindableProps"
          :key="propKey"
          :class="['logic-binding-row', { flash: !!flashBindings[propKey] }]"
        >
          <span class="binding-prop">{{ propKey }}</span>
          <el-select
            clearable
            filterable
            placeholder="选择逻辑输出"
            :model-value="component.logicBindings?.[propKey] ? `${component.logicBindings[propKey].composableId}::${component.logicBindings[propKey].returnKey}` : ''"
            @update:model-value="val => handleLogicBinding(propKey, val)"
          >
            <el-option
              v-for="opt in logicOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </div>
      </div>
      <div v-else class="logic-binding-empty">
        当前页面暂无逻辑，
        <el-button link type="primary" @click="goCreateLogic">去创建</el-button>
      </div>

      <div class="section-header">组件属性 (Props)</div>
      <!-- 动态属性配置 -->
      <el-form-item
        v-for="(value, key) in component.props"
        :key="key"
        :label="getPropertyLabel(key)"
      >
        <el-input
          v-if="getInputType(key, value) === 'text'"
          :model-value="value"
          @update:model-value="handleUpdateProp(key, $event)"
          :placeholder="getPlaceholder(key)"
        />
        <el-input
          v-else-if="getInputType(key, value) === 'textarea'"
          type="textarea"
          :model-value="value"
          @update:model-value="handleUpdateProp(key, $event)"
          :rows="3"
        />
        <el-input-number
          v-else-if="getInputType(key, value) === 'number'"
          :model-value="value"
          @update:model-value="handleUpdateProp(key, $event)"
        />
        <el-switch
          v-else-if="getInputType(key, value) === 'boolean'"
          :model-value="value"
          @update:model-value="handleUpdateProp(key, $event)"
        />
        <el-input
          v-else
          :model-value="value"
          @update:model-value="handleUpdateProp(key, $event)"
        />
      </el-form-item>
    </el-form>

    <!-- 未选中组件时显示画布设置 -->
    <div v-else class="canvas-settings">
      <div class="section-title">画布设置</div>
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
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { useCanvasStore } from '@/stores/canvas'
import { useEditorStore } from '@/stores/editor'
import componentRegistry from '@/utils/componentRegistry'
import { computed, ref } from 'vue'

const props = defineProps({
  component: {
    type: Object,
    default: null,
  },
})

const canvasStore = useCanvasStore()
const editorStore = useEditorStore()
const flashBindings = ref({})

const parentComponent = computed(() => {
  if (!props.component?.parentId) return null
  return canvasStore.getComponentById(props.component.parentId)
})

const slotOptions = computed(() => {
  if (!parentComponent.value) return []
  const meta = componentRegistry.components?.[parentComponent.value.type]
  return meta?.slots || []
})

const logicOptions = computed(() => {
  const page = canvasStore.pages.find(p => p.id === canvasStore.currentPageId)
  if (!page || !Array.isArray(page.composables)) return []
  return page.composables.flatMap(comp => (comp.returns || []).map(ret => ({
    value: `${comp.id}::${ret}`,
    label: `${ret} (${comp.name})`,
  })))
})

const bindableProps = computed(() => Object.keys(props.component?.props || {}))

const handleCanvasSizeChange = () => {
  // 触发 store 更新以保存状态
  canvasStore.updateCanvasSize(canvasStore.canvasSize)
}

const handleUpdateProp = (key, value) => {
  canvasStore.updateComponent(props.component.id, {
    props: {
      ...props.component.props,
      [key]: value,
    },
  })
}

const handleUpdateDirective = (key, value) => {
  canvasStore.updateComponent(props.component.id, {
    directives: {
      ...props.component.directives,
      [key]: value,
    },
  })
}

const handleUpdateSlot = (value) => {
  canvasStore.updateComponent(props.component.id, {
    slotName: value === 'default' ? null : value,
  })
}

const handleLogicBinding = (propKey, value) => {
  const nextBindings = { ...(props.component.logicBindings || {}) }
  if (!value) {
    delete nextBindings[propKey]
  } else {
    const [composableId, returnKey] = value.split('::')
    nextBindings[propKey] = { composableId, returnKey }
  }
  canvasStore.updateComponent(props.component.id, {
    logicBindings: nextBindings,
  })
  canvasStore.syncLogicBinding(props.component.id, propKey, nextBindings[propKey])

  flashBindings.value = { ...flashBindings.value, [propKey]: true }
  setTimeout(() => {
    const next = { ...flashBindings.value }
    delete next[propKey]
    flashBindings.value = next
  }, 800)
}

const goCreateLogic = () => {
  if (!canvasStore.currentPageId) return
  editorStore.openLogicBoard(canvasStore.currentPageId)
}

const getPropertyLabel = (key) => {
  const labelMap = {
    text: '文本内容',
    label: '标签',
    placeholder: '提示文字',
    src: '图片/视频地址',
    href: '链接地址',
    size: '尺寸',
    type: '类型',
    controls: '显示控制条',
    width: '宽度',
    height: '高度',
    rows: '行数',
    name: '名称',
  }
  return labelMap[key] || key
}

const getInputType = (key, value) => {
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (key === 'text' && typeof value === 'string' && value.length > 50) return 'textarea'
  return 'text'
}

const getPlaceholder = (key) => {
  const placeholderMap = {
    text: '请输入文本内容',
    label: '请输入标签',
    placeholder: '请输入提示文字',
    src: '请输入图片/视频地址',
    href: '请输入链接地址',
  }
  return placeholderMap[key] || `请输入${key}`
}
</script>

<style scoped>
.property-panel {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}

.property-panel :deep(.el-form-item) {
  margin-bottom: 16px;
}

.property-panel :deep(.el-form-item__label) {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  padding-bottom: 4px;
}

.property-panel :deep(.el-input__wrapper) {
  font-size: 13px;
}

.section-title {
  font-size: 14px;
  font-weight: bold;
  color: var(--vscode-foreground);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--vscode-widget-border);
}

.section-header {
  font-size: 12px;
  font-weight: bold;
  margin: 15px 0 10px;
  padding-bottom: 5px;
  border-bottom: 1px solid var(--vscode-widget-border);
  color: var(--vscode-foreground);
}

.logic-binding-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.logic-binding-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logic-binding-row.flash {
  background: var(--vscode-editor-selectionHighlight, rgba(64, 158, 255, 0.15));
  border-radius: 6px;
  padding: 6px 6px;
  transition: background 0.3s ease;
}

.binding-prop {
  min-width: 80px;
  font-size: 12px;
  color: var(--vscode-fg-muted);
}

.logic-binding-empty {
  font-size: 12px;
  color: var(--vscode-fg-muted);
  margin-bottom: 8px;
}

.canvas-settings {
  padding: 10px 0;
}
</style>
