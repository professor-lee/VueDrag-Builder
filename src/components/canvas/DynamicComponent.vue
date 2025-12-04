<template>
  <component
    v-if="component && component.type"
    :is="componentTag"
    :data-component-id="component.id"
    :class="[
      'dynamic-component', 
      { 
        selected: isSelected, 
        hovered: isHovered,
        'is-container': isContainer,
        'drag-over': isDragOverContainer
      }
    ]"
    :style="componentStyles"
    draggable="true"
    @dragstart.stop="handleDragStart"
    @click.stop="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @drop="handleDrop"
    @dragover="handleDragOver"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    v-bind="componentProps"
  >
    <!-- 选中时的操作按钮 -->
    <div v-if="isSelected" class="component-toolbar">
      <el-button-group size="small">
        <el-button @click.stop="handleDelete" type="danger" size="small">
          <el-icon><Delete /></el-icon>
        </el-button>
      </el-button-group>
    </div>

    <!-- Icon 组件特殊处理 -->
    <template v-if="component.type === 'Icon'">
      <component :is="iconComponent" :size="component.props?.size || 24" />
    </template>

    <!-- Video 组件特殊处理 -->
    <template v-else-if="component.type === 'Video'">
      <div v-if="!component.props?.src" class="video-placeholder">
        <div class="loading-spinner"></div>
        <span>视频加载中...</span>
      </div>
      <video
        v-else
        :src="component.props?.src"
        :controls="component.props?.controls"
        :width="component.props?.width"
        :height="component.props?.height"
        style="max-width: 100%;"
      ></video>
    </template>

    <!-- Image 组件特殊处理 -->
    <template v-else-if="component.type === 'Image'">
      <div v-if="!component.props?.src" class="image-placeholder">
        <el-icon :size="32"><Picture /></el-icon>
        <span>请设置图片源</span>
      </div>
      <el-image
        v-else
        :src="component.props?.src"
        :fit="component.props?.fit"
        :alt="component.props?.alt"
        style="width: 100%; height: 100%;"
      />
    </template>

    <!-- 拖拽指示线 -->
    <div 
      v-if="isDragOverContainer && dragOverPosition" 
      class="drop-indicator"
      :class="dragOverPosition"
    ></div>

    <!-- 递归渲染子组件 -->
    <template v-else-if="hasChildren">
      <template v-for="(child, idx) in component.children" :key="child.id || idx">
        <DynamicComponent
          v-if="getChildComponent(child)"
          :component="getChildComponent(child)"
        />
      </template>
    </template>

    <!-- 容器为空时的提示 -->
    <div v-else-if="isContainer" class="empty-container-hint">
      拖拽组件到这里
    </div>

    <!-- 文本内容（仅当没有子组件且有文本时显示） -->
    <template v-else-if="componentText">
      {{ componentText }}
    </template>
  </component>

  <!-- 无效组件提示 -->
  <div v-else class="invalid-component">
    <el-alert type="error" :closable="false">
      无效组件: {{ component?.id || 'unknown' }}
    </el-alert>
  </div>
</template>

<script setup>
// 支持自引用递归渲染
defineOptions({ name: 'DynamicComponent' })
import { computed, ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useCanvasStore } from '@/stores/canvas'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Delete, VideoPlay, Star, Setting, Picture } from '@element-plus/icons-vue'
import componentRegistry from '@/utils/componentRegistry'

const props = defineProps({
  component: {
    type: Object,
    required: true,
    validator: (value) => {
      return value && value.type && value.id
    }
  },
})

const editorStore = useEditorStore()
const canvasStore = useCanvasStore()

// 确保组件数据完整性
if (!props.component || !props.component.type) {
  console.error('Invalid component data:', props.component)
}

const isDragOverContainer = ref(false)
const dragOverPosition = ref(null) // 'top' | 'bottom' | 'inside'

// 图标组件映射
const iconMap = {
  VideoPlay,
  Star,
  Setting,
}

// 获取图标组件
const iconComponent = computed(() => {
  const iconName = props.component.props?.name || 'Star'
  return iconMap[iconName] || Star
})

// 获取组件标签
const componentTag = computed(() => {
  if (!props.component || !props.component.type) {
    console.warn('Component missing type:', props.component)
    return 'div'
  }
  // Icon 和 Video 需要特殊处理,使用 div 容器
  if (props.component.type === 'Icon' || props.component.type === 'Video') {
    return 'div'
  }
  return componentRegistry.map[props.component.type] || 'div'
})

// 当前组件是否被选中
const isSelected = computed(() => editorStore.selectedComponentId === props.component.id)

// 当前组件是否被悬停
const isHovered = computed(() => editorStore.hoveredComponentId === props.component.id)

// 是否是容器组件
const isContainer = computed(() => {
  if (!props.component || !props.component.type) return false
  const containerTypes = ['Container', 'Flex', 'Grid', 'Card']
  return containerTypes.includes(props.component.type)
})

// 是否有子组件
const hasChildren = computed(() => {
  return props.component.children && Array.isArray(props.component.children) && props.component.children.length > 0
})

// 组件文本内容
const componentText = computed(() => {
  return props.component.props?.label || props.component.props?.text || ''
})

// 组件属性
const componentProps = computed(() => {
  const baseProps = { ...props.component.props }
  const type = props.component.type
  
  // 对于 Button，保留 label 作为显示文本
  if (type === 'Button' || type === 'Link' || type === 'Checkbox' || type === 'Radio') {
    // 这些组件保留 label
  } else if (type === 'Text' || type === 'Heading') {
    // Text 和 Heading 移除 text，因为会通过 slot 显示
    delete baseProps.text
  }
  
  return baseProps
})

// 组件样式
const componentStyles = computed(() => {
  if (!props.component) return {}
  
  const styles = { ...props.component.styles }
  const type = props.component.type
  
  // 为容器组件添加默认样式
  if (type === 'Container') {
    if (!styles.padding) styles.padding = '16px'
    if (!styles.minHeight) styles.minHeight = '100px'
  }
  
  if (type === 'Flex') {
    if (!styles.display) styles.display = 'flex'
    if (!styles.padding) styles.padding = '16px'
    if (!styles.minHeight) styles.minHeight = '100px'
    if (!styles.gap) styles.gap = '12px'
  }
  
  if (type === 'Grid') {
    if (!styles.display) styles.display = 'grid'
    if (!styles.padding) styles.padding = '16px'
    if (!styles.minHeight) styles.minHeight = '100px'
    if (!styles.gridTemplateColumns) styles.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))'
    if (!styles.gap) styles.gap = '12px'
  }
  
  return styles
})

// 获取子组件数据
const getChildComponent = childRef => {
  if (!childRef) {
    console.warn('子组件引用为空')
    return null
  }

  // 如果 childRef 是对象（来自 componentTreeHierarchy），直接返回
  if (typeof childRef === 'object' && childRef.id) {
    return childRef
  }

  // 否则按 ID 查找
  const child = canvasStore.getComponentById(childRef)
  if (!child || !child.type) {
    console.warn(`子组件未找到或无效: ${childRef}`, child)
    return null
  }
  return child
}

// 点击处理
const handleClick = (e) => {
  if (e && props.component.type === 'Link') {
    e.preventDefault()
  }
  e?.stopPropagation()
  editorStore.selectComponent(props.component.id)
}

// 鼠标进入
const handleMouseEnter = () => {
  editorStore.hoverComponent(props.component.id)
}

// 鼠标离开
const handleMouseLeave = () => {
  editorStore.hoverComponent(null)
}

// 拖拽开始（用于重新排序）
const handleDragStart = (e) => {
  // 允许所有操作，以兼容不同的 dropEffect
  e.dataTransfer.effectAllowed = 'all'
  e.dataTransfer.setData('move-component-id', props.component.id)
  e.dataTransfer.setData('type', 'move')
  // 阻止事件冒泡，避免触发父组件的拖拽
  e.stopPropagation()
}

// 删除组件
const handleDelete = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这个组件吗？',
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    canvasStore.deleteComponent(props.component.id)
  } catch {
    // 用户取消删除
  }
}

// 容器拖放处理
const handleDragOver = (e) => {
  e.preventDefault()
  e.stopPropagation()
  
  // 根据操作类型设置 dropEffect
  const isMove = e.dataTransfer.types.includes('move-component-id')
  e.dataTransfer.dropEffect = isMove ? 'move' : 'copy'

  // 计算鼠标在组件中的相对位置，决定插入位置
  const rect = e.currentTarget.getBoundingClientRect()
  const offsetY = e.clientY - rect.top
  const height = rect.height
  
  // 如果是容器，且在中间区域，则认为是插入到容器内部
  // 如果在边缘区域（上下20%），则认为是插入到容器前后（排序）
  // 如果不是容器，则只能是前后
  
  const threshold = isContainer.value ? 0.2 : 0.5
  
  if (offsetY < height * threshold) {
    dragOverPosition.value = 'top'
    isDragOverContainer.value = true
  } else if (offsetY > height * (1 - threshold)) {
    dragOverPosition.value = 'bottom'
    isDragOverContainer.value = true
  } else {
    if (isContainer.value) {
      dragOverPosition.value = 'inside'
      isDragOverContainer.value = true
    } else {
      // 非容器的中间区域，默认为 bottom
      dragOverPosition.value = 'bottom'
      isDragOverContainer.value = true
    }
  }
}

const handleDragEnter = (e) => {
  e.preventDefault()
  e.stopPropagation()
  isDragOverContainer.value = true
}

const handleDragLeave = (e) => {
  e.preventDefault()
  e.stopPropagation()
  
  if (e.target === e.currentTarget) {
    isDragOverContainer.value = false
    dragOverPosition.value = null
  }
}

const handleDrop = (e) => {
  e.preventDefault()
  e.stopPropagation()
  isDragOverContainer.value = false
  const position = dragOverPosition.value
  dragOverPosition.value = null

  // 处理组件移动（重新排序）
  const moveId = e.dataTransfer.getData('move-component-id')
  if (moveId) {
    if (moveId === props.component.id) return // 不能移动到自己里面
    
    // 确定目标父组件和索引
    let targetParentId = null
    let targetIndex = 0
    
    if (position === 'inside' && isContainer.value) {
      // 插入到当前容器内部末尾
      targetParentId = props.component.id
      targetIndex = props.component.children ? props.component.children.length : 0
    } else {
      // 插入到当前组件的前面或后面
      targetParentId = props.component.parentId
      const parentComponent = targetParentId ? canvasStore.getComponentById(targetParentId) : null
      
      let currentIndex = 0
      if (parentComponent) {
        currentIndex = parentComponent.children.indexOf(props.component.id)
      } else {
        // 根组件
        const rootComponents = canvasStore.componentTreeHierarchy
        currentIndex = rootComponents.findIndex(c => c.id === props.component.id)
      }
      
      if (currentIndex === -1) currentIndex = 0
      targetIndex = position === 'top' ? currentIndex : currentIndex + 1
    }
    
    canvasStore.moveComponent(moveId, targetParentId, targetIndex)
    return
  }

  // 处理新组件添加
  try {
    const componentData = JSON.parse(e.dataTransfer.getData('component'))
    if (!componentData || !componentData.type) return

    let targetParentId = null
    let targetIndex = 0

    if (position === 'inside' && isContainer.value) {
      targetParentId = props.component.id
      targetIndex = props.component.children ? props.component.children.length : 0
    } else {
      targetParentId = props.component.parentId
      const parentComponent = targetParentId ? canvasStore.getComponentById(targetParentId) : null
      
      let currentIndex = 0
      if (parentComponent) {
        currentIndex = parentComponent.children.indexOf(props.component.id)
      } else {
        const rootComponents = canvasStore.componentTreeHierarchy
        currentIndex = rootComponents.findIndex(c => c.id === props.component.id)
      }
      
      if (currentIndex === -1) currentIndex = 0
      targetIndex = position === 'top' ? currentIndex : currentIndex + 1
    }

    const newId = canvasStore.addComponent(componentData, targetParentId, targetIndex)
    if (newId) {
      editorStore.selectComponent(newId)
      ElMessage.success(`已添加 ${componentData.displayName}`)
    }
  } catch (error) {
    console.error('添加组件失败:', error)
  }
}
</script>

<style scoped>
.dynamic-component {
  position: relative;
  transition: all 0.2s;
  box-sizing: border-box;
}

.dynamic-component.selected {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  z-index: 10;
}

.dynamic-component.hovered:not(.selected) {
  outline: 1px dashed var(--color-primary);
  outline-offset: 2px;
  z-index: 5;
}

.component-toolbar {
  position: absolute;
  top: -36px;
  right: 0;
  z-index: 1000;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  padding: 4px;
}

.dynamic-component.is-container {
  min-height: 80px;
  min-width: 100px;
  border: 1px dashed rgba(128, 128, 128, 0.3);
  padding: 12px;
  background-color: rgba(255, 255, 255, 0.02);
}

.is-container.drag-over {
  background-color: rgba(0, 122, 204, 0.1) !important;
  border-color: var(--vscode-highlight) !important;
  border-style: solid !important;
}

.empty-container-hint {
  padding: 24px;
  text-align: center;
  color: rgba(128, 128, 128, 0.6);
  font-size: 12px;
  user-select: none;
  pointer-events: none;
}

.video-placeholder,
.image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #f0f2f5;
  color: #909399;
  height: 100%;
  min-height: 150px;
  width: 100%;
  gap: 8px;
  font-size: 12px;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #dcdfe6;
  border-top-color: #409eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.drop-indicator {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background-color: var(--color-primary);
  z-index: 100;
  pointer-events: none;
}

.drop-indicator.top {
  top: 0;
}

.drop-indicator.bottom {
  bottom: 0;
}

.drop-indicator.inside {
  top: 0;
  bottom: 0;
  height: auto;
  background-color: rgba(64, 158, 255, 0.1);
  border: 2px solid var(--color-primary);
}
</style>
