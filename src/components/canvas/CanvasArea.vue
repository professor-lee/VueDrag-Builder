<template>
  <div 
    class="canvas-area" 
    @mousedown="handleMouseDown"
    :style="{ cursor: isPanning ? 'grabbing' : (isSpacePressed ? 'grab' : 'default') }"
    @wheel="handleWheel"
  >
    <div class="canvas-background"></div>
    <div class="canvas-stage">
      <div 
        class="canvas-transform-layer" 
        :style="transformStyle"
      >
        <div 
          class="canvas-page"
          :style="pageStyle"
          @drop="handleDrop"
          @dragover="handleDragOver"
          @dragenter="handleDragEnter"
          @dragleave="handleDragLeave"
          :class="{ 'drag-over': isDragOver }"
        >
          <div 
            class="canvas-content" 
            ref="canvasContentRef"
            :style="{ pointerEvents: isSpacePressed ? 'none' : 'auto' }"
          >
            <DynamicComponent
              v-for="component in rootComponents"
              :key="component.id"
              :component="component"
            />
            
            <!-- 空状态提示 -->
            <div v-if="!rootComponents || rootComponents.length === 0" class="empty-canvas">
              <el-empty description="从左侧拖拽组件到这里开始设计">
                <template #image>
                  <div class="empty-icon">🎨</div>
                </template>
              </el-empty>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 平移遮罩层 -->
    <div 
      v-if="isSpacePressed || isPanning"
      class="panning-overlay"
      @mousedown="handleMouseDown"
      :style="{ cursor: isPanning ? 'grabbing' : 'grab' }"
    ></div>

    <div class="logic-fab">
      <el-button size="small" type="primary" plain @click="openLogicBoard">
        <el-icon><Plus /></el-icon>
        添加逻辑
      </el-button>
    </div>

    <!-- 重置视图按钮 -->
    <div class="canvas-controls">
      <el-button circle :icon="Aim" @click="resetView" title="重置视图" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useCanvasStore } from '@/stores/canvas'
import { useEditorStore } from '@/stores/editor'
import { ElMessage } from 'element-plus'
import { Aim, Plus } from '@element-plus/icons-vue'
import DynamicComponent from './DynamicComponent.vue'

const canvasStore = useCanvasStore()
const editorStore = useEditorStore()

const canvasContentRef = ref(null)

const isDragOver = ref(false)
// 画布平移状态
const isPanning = ref(false)
const isSpacePressed = ref(false)
const panX = ref(0)
const panY = ref(0)
const startX = ref(0)
const startY = ref(0)

const handleKeyDown = (e) => {
  if (e.code === 'Space' && !e.repeat && !e.target.matches('input, textarea')) {
    isSpacePressed.value = true
    // 不阻止默认行为，否则可能无法输入空格
  }
}

const handleKeyUp = (e) => {
  if (e.code === 'Space') {
    isSpacePressed.value = false
    // 不在这里取消 isPanning，允许用户在松开空格后继续拖动直到松开鼠标
  }
}

const openLogicBoard = () => {
  if (!canvasStore.currentPageId) {
    ElMessage.warning('请先选择页面')
    return
  }
  editorStore.openLogicBoard(canvasStore.currentPageId)
}

const resetView = () => {
  panX.value = 0
  panY.value = 0
  editorStore.resetZoom()
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
  }
})

// 根组件（没有父组件的组件）
const rootComponents = computed(() => {
  const hierarchy = canvasStore.componentTreeHierarchy
  return Array.isArray(hierarchy) ? hierarchy : []
})

const getRootDropIndex = (clientY) => {
  const container = canvasContentRef.value
  if (!container) return rootComponents.value.length

  const rootIdSet = new Set(rootComponents.value.map(comp => comp.id))
  const children = Array.from(container.children || [])
    .filter(el => rootIdSet.has(el.dataset?.componentId))

  for (let i = 0; i < children.length; i += 1) {
    const rect = children[i].getBoundingClientRect()
    if (clientY < rect.top + rect.height / 2) {
      return i
    }
  }

  return children.length
}

const pageBackground = computed(() => {
  const styles = canvasStore.globalStyles
  if (!styles) return '#ffffff'

  // 如果是颜色字符串 (hex, rgb, rgba)
  if (typeof styles === 'string') {
    if (styles.startsWith('#') || styles.startsWith('rgb')) {
      return styles
    }
    // 尝试解析 CSS 字符串
    const match = styles.match(/background(?:-color)?:\s*([^;]+);?/i)
    if (match && match[1]) {
      return match[1].trim()
    }
  }

  if (typeof styles === 'object' && styles.backgroundColor) {
    return styles.backgroundColor
  }

  return '#ffffff'
})

// 变换层样式 (负责平移和缩放)
const transformStyle = computed(() => {
  return {
    transform: `translate(${panX.value}px, ${panY.value}px) scale(${editorStore.zoom / 100})`,
    transformOrigin: 'center top', // 缩放原点
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingTop: '40px', // 顶部留白
    paddingBottom: '40px', // 底部留白
  }
})

// 页面样式 (负责尺寸和背景)
const pageStyle = computed(() => {
  const baseStyle = {
    backgroundColor: pageBackground.value,
    boxShadow: '0 0 20px rgba(0, 0, 0, 0.15)',
    position: 'relative',
    transition: 'width 0.3s, height 0.3s, background-color 0.3s',
  }

  if (canvasStore.canvasSize.isFixed) {
    return {
      ...baseStyle,
      width: `${canvasStore.canvasSize.width}px`,
      height: `${canvasStore.canvasSize.height}px`,
      flexShrink: 0, // 防止被压缩
    }
  }

  // 响应式模式
  const deviceSizes = {
    desktop: '1280px',
    tablet: '768px',
    mobile: '375px',
  }

  return {
    ...baseStyle,
    width: deviceSizes[editorStore.deviceMode] || '100%',
    minHeight: '800px', // 最小高度
    height: 'auto', // 自适应高度
  }
})

// 平移处理（仅空格 + 左键）
const handleMouseDown = (e) => {
  if (!isSpacePressed.value || e.button !== 0) {
    return
  }

  isPanning.value = true
  startX.value = e.clientX - panX.value
  startY.value = e.clientY - panY.value
  e.preventDefault()

  // 使用 window 监听以支持移出画布区域
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
}

const handleMouseMove = (e) => {
  if (isPanning.value) {
    panX.value = e.clientX - startX.value
    panY.value = e.clientY - startY.value
  }
}

const handleMouseUp = () => {
  isPanning.value = false
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
}

// 缩放处理
const handleWheel = (e) => {
  e.preventDefault()

  // Ctrl + 滚轮 或 触控板捏合 -> 缩放
  if (e.ctrlKey || e.metaKey) {
    const delta = -e.deltaY
    const zoomFactor = delta > 0 ? 1.1 : 0.9
    let newZoom = editorStore.zoom * zoomFactor
    newZoom = Math.max(10, Math.min(200, newZoom))
    if (Math.abs(newZoom - editorStore.zoom) > 0.5) {
      editorStore.setZoom(Math.round(newZoom))
    }
  } else {
    // 普通滚动 -> 平移 (支持触控板双指移动)
    panX.value -= e.deltaX
    panY.value -= e.deltaY
  }
}

// 拖拽处理
const handleDragOver = (e) => {
  e.preventDefault()
  // 在 dragover 中无法读取 data，使用 types 判断
  const isMove = e.dataTransfer.types.includes('move-component-id')
  const isComposable = e.dataTransfer.types.includes('composable') || e.dataTransfer.types.includes('text/plain') && e.dataTransfer.getData('type') === 'composable'
  e.dataTransfer.dropEffect = isComposable ? 'copy' : (isMove ? 'move' : 'copy')
}

const handleDragEnter = (e) => {
  e.preventDefault()
  isDragOver.value = true
}

const handleDragLeave = (e) => {
  e.preventDefault()
  if (e.target.classList.contains('canvas-page')) {
    isDragOver.value = false
  }
}

const handleDrop = (e) => {
  e.preventDefault()
  isDragOver.value = false

  // 处理逻辑拖入 -> 打开逻辑编排并新增实例
  const composableStr = e.dataTransfer.getData('composable')
  if (composableStr) {
    try {
      const item = JSON.parse(composableStr)
      canvasStore.addComposable({
        name: item.name,
        source: item.source,
        params: item.params || [],
        returns: item.returns || [],
        bindings: [],
      })
      editorStore.openLogicBoard(canvasStore.currentPageId)
      ElMessage.success(`已添加逻辑 ${item.name}`)
    } catch (err) {
      console.error('添加逻辑失败', err)
      ElMessage.error('添加逻辑失败')
    }
    return
  }

  const dropIndex = getRootDropIndex(e.clientY)

  // 处理组件移动（重新排序到根级别）
  const moveId = e.dataTransfer.getData('move-component-id')
  if (moveId) {
    canvasStore.moveComponent(moveId, null, dropIndex)
    return
  }

  try {
    const componentDataStr = e.dataTransfer.getData('component')
    if (!componentDataStr) return

    const componentData = JSON.parse(componentDataStr)
    
    if (!componentData || !componentData.type) {
      throw new Error('无效的组件数据')
    }

    // 添加组件到画布（根级别，没有父组件）
    const componentId = canvasStore.addComponent(componentData, null, dropIndex)
    
    if (componentId) {
      editorStore.selectComponent(componentId)
      ElMessage.success(`已添加 ${componentData.displayName}`)
    }
  } catch (error) {
    console.error('添加组件失败:', error)
    ElMessage.error(`添加组件失败: ${error.message}`)
  }
}
</script>

<style scoped>
.canvas-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  background-color: var(--vscode-editor-bg);
  width: 100%;
  height: 100%;
}

.canvas-background {
  position: absolute;
  top: -450%;
  left: -450%;
  width: 1000%;
  height: 1000%;
  background-image: radial-gradient(var(--vscode-editor-lineHighlight) 1px, transparent 1px);
  background-size: 20px 20px;
  opacity: 0.8;
  pointer-events: none;
}

.canvas-stage {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 40px;
  box-sizing: border-box;
}

.canvas-transform-layer {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  will-change: transform;
}

.canvas-page {
  background-color: #ffffff;
  transition: box-shadow 0.2s;
}

.canvas-page.drag-over {
  box-shadow: 0 0 0 2px var(--vscode-focusBorder);
}

.canvas-content {
  width: 100%;
  height: 100%;
  position: relative;
  padding: 1px; /* 防止 margin collapse */
}

.empty-canvas {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
}

.empty-canvas :deep(.el-empty__description) {
  color: var(--vscode-fg-muted);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.panning-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  /* cursor 样式通过 style 绑定动态控制 */
}

.canvas-controls {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 100;
}

.logic-fab {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 101;
  pointer-events: auto;
}
</style>
