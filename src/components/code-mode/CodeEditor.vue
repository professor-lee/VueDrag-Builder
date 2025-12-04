<template>
  <div class="code-editor">
    <div class="editor-tabs-container">
      <div class="file-tabs">
        <button
          v-for="tab in fileTabs"
          :key="tab.key"
          class="tab-button"
          :class="{ active: activeSection === tab.key }"
          @click="jumpToSection(tab)"
        >
          <span class="tab-icon" :class="tab.iconClass">{{ tab.icon }}</span>
          {{ tab.label }}
        </button>
      </div>
      
      <div class="editor-actions">
        <button class="action-btn" @click="formatCode" title="格式化代码">
          <el-icon><MagicStick /></el-icon>
        </button>
        <button class="action-btn" @click="copyCode" title="复制代码">
          <el-icon><CopyDocument /></el-icon>
        </button>
        <button class="action-btn" @click="syncFromCanvas" title="从画布同步">
          <el-icon><RefreshRight /></el-icon>
        </button>
        <button class="action-btn" @click="syncToCanvas" title="同步到画布 (实验性)">
          <el-icon><RefreshLeft /></el-icon>
        </button>
        <button class="action-btn" @click="resetView" title="重置视图">
          <el-icon><Aim /></el-icon>
        </button>
        <div class="view-toggle">
          <button 
            class="toggle-btn" 
            :class="{ active: viewMode === 'split' }" 
            @click="viewMode = 'split'"
            title="分屏"
          >
            <el-icon><Reading /></el-icon>
          </button>
          <button 
            class="toggle-btn" 
            :class="{ active: viewMode === 'code' }" 
            @click="viewMode = 'code'"
            title="仅代码"
          >
            <el-icon><Document /></el-icon>
          </button>
          <button 
            class="toggle-btn" 
            :class="{ active: viewMode === 'preview' }" 
            @click="viewMode = 'preview'"
            title="仅预览"
          >
            <el-icon><Monitor /></el-icon>
          </button>
        </div>
      </div>
    </div>

    <div class="editor-content" :class="`view-mode-${viewMode}`">
      <!-- Monaco 编辑器 -->
      <div v-show="viewMode !== 'preview'" class="editor-panel">
        <div ref="monacoContainer" class="monaco-container"></div>
      </div>

      <!-- 预览面板 -->
      <div 
        v-show="viewMode !== 'code'" 
        class="preview-panel"
        @mousedown="handleMouseDown"
        @wheel="handleWheel"
        :style="{ cursor: isPanning ? 'grabbing' : (isSpacePressed ? 'grab' : 'default') }"
      >
        <div class="preview-header">
          <span>Preview</span>
        </div>
        <div class="preview-viewport">
          <div class="preview-transform-layer" :style="transformStyle">
            <div class="preview-page" :style="pageStyle">
              <iframe
                ref="previewFrame"
                class="preview-iframe"
                sandbox="allow-scripts allow-same-origin allow-modals"
                :srcdoc="previewSrcDoc"
              ></iframe>
              <!-- 遮罩层，防止拖拽时事件被 iframe 捕获 -->
              <div v-if="isPanning || isSpacePressed" class="iframe-overlay"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useCanvasStore } from '@/stores/canvas'
import { useProjectStore } from '@/stores/project'
import { useEditorStore } from '@/stores/editor'
import { generateVueSFC } from '@/utils/codeGenerator'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MagicStick, CopyDocument, RefreshRight, RefreshLeft, Reading, Document, Monitor, Aim } from '@element-plus/icons-vue'
import * as monaco from 'monaco-editor'
import { cloneDeep } from 'lodash-es'
import { v4 as uuidv4 } from 'uuid'

// 配置 Monaco Editor 的工作线程
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') {
      return new jsonWorker()
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new cssWorker()
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker()
    }
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker()
    }
    return new editorWorker()
  }
}

const canvasStore = useCanvasStore()
const projectStore = useProjectStore()
const editorStore = useEditorStore()

// --- 预览交互状态 ---
const isPanning = ref(false)
const isSpacePressed = ref(false)
const panX = ref(0)
const panY = ref(0)
const startX = ref(0)
const startY = ref(0)

const pageBackground = computed(() => {
  const styles = canvasStore.globalStyles
  if (!styles) return '#ffffff'
  if (typeof styles === 'string') {
    if (styles.startsWith('#') || styles.startsWith('rgb')) return styles
    const match = styles.match(/background(?:-color)?:\s*([^;]+);?/i)
    if (match && match[1]) return match[1].trim()
  }
  if (typeof styles === 'object' && styles.backgroundColor) return styles.backgroundColor
  return '#ffffff'
})

const transformStyle = computed(() => {
  return {
    transform: `translate(${panX.value}px, ${panY.value}px) scale(${editorStore.zoom / 100})`,
    transformOrigin: 'center top',
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingTop: '40px',
    paddingBottom: '40px',
  }
})

const pageStyle = computed(() => {
  const baseStyle = {
    backgroundColor: pageBackground.value,
    boxShadow: '0 0 20px rgba(0, 0, 0, 0.15)',
    position: 'relative',
    transition: 'width 0.3s, height 0.3s, background-color 0.3s',
    display: 'flex',
    flexDirection: 'column',
  }

  const deviceSizes = {
    desktop: '1280px',
    tablet: '768px',
    mobile: '375px',
  }

  return {
    ...baseStyle,
    width: deviceSizes[editorStore.deviceMode] || '100%',
    minHeight: '800px',
    height: 'auto',
  }
})

const handleKeyDown = (e) => {
  if (e.code === 'Space' && !e.repeat && !e.target.matches('input, textarea')) {
    isSpacePressed.value = true
  }
}

const handleKeyUp = (e) => {
  if (e.code === 'Space') {
    isSpacePressed.value = false
  }
}

const handleMouseDown = (e) => {
  if (!isSpacePressed.value || e.button !== 0) return
  
  isPanning.value = true
  startX.value = e.clientX - panX.value
  startY.value = e.clientY - panY.value
  e.preventDefault()

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

const resetView = () => {
  panX.value = 0
  panY.value = 0
  editorStore.resetZoom()
}

const handleWheel = (e) => {
  // 只有在预览区域才响应
  if (viewMode.value === 'code') return

  if (e.ctrlKey || e.metaKey) {
    e.preventDefault()
    const delta = -e.deltaY
    const zoomFactor = delta > 0 ? 1.1 : 0.9
    let newZoom = editorStore.zoom * zoomFactor
    newZoom = Math.max(10, Math.min(200, newZoom))
    if (Math.abs(newZoom - editorStore.zoom) > 0.5) {
      editorStore.setZoom(Math.round(newZoom))
    }
  } else {
    // 触控板平移支持 (通过 iframe 转发的水平滚动或直接在遮罩层上的滚动)
    // 如果是垂直滚动，通常是页面内部滚动，但如果是触控板双指，可能会有水平分量
    // 或者如果是在遮罩层上(拖拽时)，我们允许平移
    
    // 简单的策略：如果有水平分量，或者是在遮罩层上触发的(非iframe内部)，则平移
    // 注意：iframe 内部的垂直滚动已被过滤（除非我们想接管垂直平移，但这会破坏页面滚动）
    // 这里我们只处理水平平移，或者当页面无法滚动时的垂直平移（太复杂，暂只处理水平）
    
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
       panX.value -= e.deltaX
    }
    // 垂直方向 panY.value -= e.deltaY; // 暂时禁用垂直平移以优先页面滚动
  }
}
// -------------------

const viewMode = ref('split')
const activeSection = ref('template')
const monacoContainer = ref(null)
const previewFrame = ref(null)
let editor = null
let unsubscribeCanvas = null
const lastSyncedCode = ref('')
const previewSrcDoc = ref('')

const fileTabs = [
  { key: 'template', label: 'template', token: '<template>', icon: '< >', iconClass: 'icon-blue' },
  { key: 'script', label: 'script', token: '<script setup>', icon: 'JS', iconClass: 'icon-yellow' },
  { key: 'style', label: 'style', token: '<style', icon: '#', iconClass: 'icon-pink' },
]

const basePreviewStyle = `body {
  margin: 0;
  padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: #ffffff;
  color: #1f1f1f;
}

#app {
  min-height: 100vh;
  box-sizing: border-box;
}
`

const extractSfcSections = (code) => {
  if (!code) {
    return { template: '', script: '', style: '' }
  }

  const templateMatch = code.match(/<template>([\s\S]*?)<\/template>/)
  const scriptMatch = code.match(/<script setup>([\s\S]*?)<\/script>/)
  const styleMatch = code.match(/<style[^>]*>([\s\S]*?)<\/style>/)

  return {
    template: templateMatch ? templateMatch[1].trim() : '',
    script: scriptMatch ? scriptMatch[1].trim() : '',
    style: styleMatch ? styleMatch[1].trim() : '',
  }
}

const sanitizeScriptContent = (scriptContent) => {
  if (!scriptContent) {
    return {
      code: '',
      exportsStatement: 'return {}',
      usesRouter: false,
    }
  }

  const vueHelpers = new Set()
  const elementHelpers = new Set()
  let usesRouterImport = false
  const bodyLines = []

  const parseHelperNames = segment => {
    return segment
      .split(',')
      .map(name => name.trim())
      .filter(Boolean)
      .map(name => name.replace(/\sas\s.+$/, ''))
  }

  scriptContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (!trimmed.startsWith('import')) {
      bodyLines.push(line)
      return
    }

    const vueMatch = trimmed.match(/import\s+{([^}]+)}\s+from\s+['"]vue['"]/)
    if (vueMatch) {
      parseHelperNames(vueMatch[1]).forEach(name => vueHelpers.add(name))
      return
    }

    const elementMatch = trimmed.match(/import\s+{([^}]+)}\s+from\s+['"]element-plus['"]/)
    if (elementMatch) {
      parseHelperNames(elementMatch[1]).forEach(name => elementHelpers.add(name))
      return
    }

    const routerMatch = trimmed.match(/from\s+['"]vue-router['"]/)
    if (routerMatch) {
      usesRouterImport = true
      return
    }
  })

  const injectedHelpers = []
  if (vueHelpers.size > 0) {
    injectedHelpers.push(`const { ${Array.from(vueHelpers).join(', ')} } = Vue`)
  }
  if (elementHelpers.size > 0) {
    injectedHelpers.push(`const { ${Array.from(elementHelpers).join(', ')} } = ElementPlus`)
  }
  const cleaned = [...injectedHelpers, ...bodyLines].join('\n')
  const bindingRegex = /\b(?:const|let|var|function)\s+([A-Za-z0-9_]+)/g
  const bindings = new Set()
  const macroNames = new Set([
    'useRouter',
    'defineProps',
    'defineEmits',
    'defineExpose',
    'defineSlots',
    'defineModel',
    'defineOptions',
  ])
  let match
  while ((match = bindingRegex.exec(cleaned)) !== null) {
    const name = match[1]
    if (macroNames.has(name)) continue
    bindings.add(name)
  }

  const bindingList = Array.from(bindings)
  const exportsStatement = bindingList.length
    ? `return { ${bindingList.join(', ')} }`
    : 'return {}'

  return {
    code: cleaned,
    exportsStatement,
    usesRouter: usesRouterImport,
  }
}

const buildPreviewDocument = (code) => {
  const { template, script, style } = extractSfcSections(code)
  const scriptMeta = sanitizeScriptContent(script)
  const safeTemplate = template || '<div>当前暂无内容</div>'
  const combinedStyle = `${basePreviewStyle}\n${style || ''}`

  const sanitizedStyle = combinedStyle
    .replace(/<\/style>/gi, '<\\/style>')
    .replace(/`/g, '\\`')

  // 使用 npmmirror CDN 替代 unpkg，提高国内访问速度
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>预览</title>
  <link rel="stylesheet" href="https://registry.npmmirror.com/element-plus/2.4.4/files/dist/index.css">
  <style>${sanitizedStyle}</style>
</head>
<body>
  <div id="app"></div>
  <script src="https://registry.npmmirror.com/vue/3.3.4/files/dist/vue.global.prod.js"><\/script>
  <script src="https://registry.npmmirror.com/element-plus/2.4.4/files/dist/index.full.min.js"><\/script>
  <script src="https://registry.npmmirror.com/@element-plus/icons-vue/2.3.1/files/dist/index.iife.min.js"><\/script>
  <script>
    // 注入事件监听，处理缩放和触控板平移
    window.addEventListener('wheel', (e) => {
      // 如果按下了 Ctrl/Meta 键 (缩放) 或者 触控板双指滑动 (通常 deltaX/Y 较小且连续)
      // 我们将事件发送给父窗口处理
      
      // 简单的触控板检测逻辑：如果不是缩放，我们发送平移事件
      // 注意：在 iframe 内部，我们无法完全阻止默认滚动，除非我们接管所有滚动
      // 这里我们主要关注 Ctrl+滚轮 (缩放) 和 触控板平移 (如果父级需要接管)
      
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        window.parent.postMessage({
          type: 'preview-wheel',
          deltaX: e.deltaX,
          deltaY: e.deltaY,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey
        }, '*')
      } else {
        // 对于普通滚动，我们让它自然发生 (内部滚动)
        // 但如果是触控板平移想要移动整个画布视图而不是内部滚动，这会有冲突
        // 根据需求：代码模式预览添加触控板支持
        // 我们假设用户想要的是：如果内部没滚动到底，就内部滚动；如果到底了，或者用户意图是平移画布？
        // 通常代码预览模式下，用户更习惯内部滚动。
        // 但需求说 "为代码模式预览添加触控板支持"，结合上下文 "修正可视化模式...背景高度...代码模式预览...触控板支持"
        // 可能是指像可视化模式那样平移整个画布？
        // 如果是这样，我们需要一种方式区分内部滚动和画布平移。
        // 既然之前移除了普通滚轮平移以解决冲突，那么触控板支持可能指的是：
        // 当用户使用触控板时，能够像可视化模式一样平移视图。
        // 我们可以检测是否是触控板 (通常 deltaMode === 0 且 deltaX/Y 是小数或很小)
        // 或者我们简单地将所有非 Ctrl 滚轮事件也发出去，由父级决定是否消费？
        // 不，父级已经移除了普通滚轮处理。
        
        // 让我们重新审视需求："代码模式预览现在缩小放大与内部滚动存在冲突;为代码模式预览添加触控板支持"
        // 这意味着：
        // 1. Ctrl+滚轮应该缩放 (目前冲突或无效) -> 必须修复
        // 2. 触控板应该支持平移 (目前可能无效)
        
        // 策略：
        // 发送所有 wheel 事件给父级。
        // 父级判断：
        // - 如果是 Ctrl+Wheel -> 缩放
        // - 如果是 触控板 (如何判断? 也许通过 deltaX != 0) -> 平移?
        // - 如果是 普通垂直滚动 -> 忽略 (让 iframe 滚动)
        
        // 但是 iframe 的默认滚动会被 e.preventDefault() 阻止吗？
        // 如果我们在父级处理了，我们应该在 iframe 里 preventDefault。
        
        // 让我们只拦截 Ctrl+Wheel (缩放) 和 明显的水平滚动 (触控板/横向滚轮)
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
           // 主要是水平移动，可能是触控板平移或横向滚动
           // 发送给父级尝试平移
           e.preventDefault()
           window.parent.postMessage({
             type: 'preview-wheel',
             deltaX: e.deltaX,
             deltaY: e.deltaY,
             ctrlKey: e.ctrlKey,
             metaKey: e.metaKey
           }, '*')
        }
      }
    }, { passive: false })

    const template = ${JSON.stringify(safeTemplate)}
    const scriptMeta = ${JSON.stringify(scriptMeta)}

    const renderError = (err) => {
      console.error('[预览错误]', err)
      const host = document.getElementById('app')
      host.innerHTML = ''
      const pre = document.createElement('pre')
      pre.textContent = (err && err.stack) || err?.message || String(err)
      pre.style.padding = '20px'
      pre.style.whiteSpace = 'pre-wrap'
      pre.style.background = '#fff0f0'
      pre.style.color = '#ff0000'
      host.appendChild(pre)
    }

    const routerStub = () => ({
      push(path) {
        console.log('[预览] 跳转到:', path)
      }
    })

    const runner = new Function(
      'Vue',
      'ElementPlus',
      'useRouter',
      'defineProps',
      'defineEmits',
      'defineExpose',
      'defineSlots',
      'defineModel',
      'defineOptions',
      'console',
      scriptMeta.code + '\\n' + scriptMeta.exportsStatement
    )

    const noopObject = () => ({})
    const noopFn = () => () => {}
    const noopVoid = () => {}

    try {
      const component = {
        template,
        setup() {
          try {
            return runner(
              Vue,
              ElementPlus,
              routerStub,
              noopObject,
              noopFn,
              noopVoid,
              noopObject,
              () => Vue.ref ? Vue.ref(null) : null,
              noopVoid,
              console
            )
          } catch (error) {
            renderError(error)
            return {}
          }
        },
      }

      const app = Vue.createApp(component)
      app.use(ElementPlus)
      // 注册图标
      if (window.ElementPlusIconsVue) {
        for (const [key, component] of Object.entries(window.ElementPlusIconsVue)) {
          app.component(key, component)
        }
      }
      app.mount('#app')
    } catch (error) {
      renderError(error)
    }
  <\/script>
</body>
</html>`
}

const buildProjectContext = () => ({
  ...projectStore.projectSnapshot,
  globalStyles: canvasStore.globalStyles,
})

const buildPageSnapshot = () => {
  const currentPage = canvasStore.currentPage
  if (!currentPage) return null

  return {
    ...currentPage,
    components: cloneDeep(canvasStore.componentTreeHierarchy || []),
  }
}

const syncFromCanvas = (showToast = true) => {
  const pageSnapshot = buildPageSnapshot()
  if (!pageSnapshot) {
    if (showToast) {
      ElMessage.warning('没有可用的页面')
    }
    return
  }

  const code = generateVueSFC(pageSnapshot, buildProjectContext())
  if (!editor) {
    lastSyncedCode.value = code
    return
  }

  if (code !== lastSyncedCode.value) {
    editor.setValue(code)
    lastSyncedCode.value = code
    updatePreview(code)
  } else if (viewMode.value !== 'code') {
    updatePreview(code)
  }

  if (showToast) {
    ElMessage.success('已从画布同步代码')
  }
}

// 反向同步：代码 -> 画布
const syncToCanvas = async (silent = false) => {
  if (!editor) return
  
  try {
    if (!silent) {
      await ElMessageBox.confirm(
        '这将覆盖当前画布上的所有组件。此功能为实验性功能，仅支持基础结构同步。确定要继续吗？',
        '同步到画布',
        {
          confirmButtonText: '确定同步',
          cancelButtonText: '取消',
          type: 'warning',
        }
      )
    }

    const code = editor.getValue()
    const { template } = extractSfcSections(code)
    
    if (!template) {
      throw new Error('未找到 template 标签')
    }

    // 解析 HTML
    const parser = new DOMParser()
    const doc = parser.parseFromString(template, 'text/html')
    const rootDiv = doc.body.firstElementChild

    if (!rootDiv) {
      throw new Error('模板内容为空')
    }

    // 转换 DOM 树为组件树
    const components = []
    
    // 递归解析函数
    const parseNode = (node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return null
      
      // 映射标签名到组件类型
      const tagMap = {
        'DIV': 'Container', // 默认
        'EL-CARD': 'Card',
        'EL-BUTTON': 'Button',
        'SPAN': 'Text',
        'H2': 'Heading',
        'EL-IMAGE': 'Image',
        'EL-DIVIDER': 'Divider',
        'EL-LINK': 'Link',
        'EL-INPUT': 'Input',
        'EL-SELECT': 'Select',
        'EL-CHECKBOX': 'Checkbox',
        'EL-RADIO': 'Radio',
        'EL-SWITCH': 'Switch',
      }
      
      const tagName = node.tagName.toUpperCase()
      let type = tagMap[tagName] || 'Container'
      
      // 特殊处理：检查 class 来区分 Container, Flex, Grid
      if (tagName === 'DIV') {
        if (node.style.display === 'flex') type = 'Flex'
        else if (node.style.display === 'grid') type = 'Grid'
      }

      const component = {
        id: uuidv4(),
        type,
        props: {},
        styles: {},
        children: [],
        events: []
      }

      // 解析属性
      Array.from(node.attributes).forEach(attr => {
        const name = attr.name
        const value = attr.value
        
        if (name === 'style') {
          // 解析内联样式
          value.split(';').forEach(rule => {
            const [k, v] = rule.split(':').map(s => s.trim())
            if (k && v) {
              // 转换 css key 为驼峰
              const camelKey = k.replace(/-([a-z])/g, g => g[1].toUpperCase())
              component.styles[camelKey] = v
            }
          })
        } else if (name.startsWith(':') || name.startsWith('v-bind:')) {
          // 动态属性 (简化处理，作为字符串存储)
          const propName = name.replace(/^:|v-bind:/, '')
          component.props[propName] = value
        } else if (name === 'v-model') {
          // v-model 支持
          component.props['modelValue'] = value
        } else if (name.startsWith('@') || name.startsWith('v-on:')) {
          // 事件 (暂不处理反向同步)
        } else if (name === 'class') {
          component.props.className = value
        } else {
          // 普通属性
          component.props[name] = value
        }
      })

      // 解析文本内容
      if (type === 'Text' || type === 'Heading' || type === 'Button' || type === 'Link') {
        // 提取直接文本子节点
        const textContent = Array.from(node.childNodes)
          .filter(n => n.nodeType === Node.TEXT_NODE)
          .map(n => n.textContent.trim())
          .join(' ')
        
        if (textContent) {
          if (type === 'Button' || type === 'Link') {
            component.props.label = textContent
          } else {
            component.props.text = textContent
          }
        }
      }

      // 递归子节点
      Array.from(node.children).forEach(childNode => {
        const childComponent = parseNode(childNode)
        if (childComponent) {
          childComponent.parentId = component.id
          component.children.push(childComponent.id)
          components.push(childComponent) // 扁平化存储，稍后重建树
        }
      })
      
      return component
    }

    // 开始解析
    // 假设根元素是 page-container，我们解析它的子元素
    if (rootDiv.classList.contains('page-container')) {
      Array.from(rootDiv.children).forEach(child => {
        const comp = parseNode(child)
        if (comp) components.push(comp)
      })
    } else {
      // 如果没有 page-container，直接解析根元素
      const comp = parseNode(rootDiv)
      if (comp) components.push(comp)
    }

    // 扁平化组件列表 (parseNode 已经做了部分，但我们需要整理)
    // parseNode 返回的是树状结构的根，但我们也把子组件 push 到了 components 数组
    // 实际上 parseNode 的递归逻辑有点问题，因为它既返回对象又 push 到数组
    // 让我们修正一下：parseNode 只返回对象，我们在外部收集
    
    // 重新实现简单的递归收集
    const flatComponents = []
    const traverseCollect = (comp) => {
      flatComponents.push(comp)
      if (comp.childrenComponents) { // 临时属性
        comp.childrenComponents.forEach(child => {
          child.parentId = comp.id
          comp.children.push(child.id)
          traverseCollect(child)
        })
        delete comp.childrenComponents
      }
    }

    // 修正后的 parseNode
    const parseNodeV2 = (node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return null
      
      const tagMap = {
        'DIV': 'Container',
        'EL-CARD': 'Card',
        'EL-BUTTON': 'Button',
        'SPAN': 'Text',
        'H2': 'Heading',
        'EL-IMAGE': 'Image',
        'EL-DIVIDER': 'Divider',
        'EL-LINK': 'Link',
        'EL-INPUT': 'Input',
        'EL-SELECT': 'Select',
        'EL-CHECKBOX': 'Checkbox',
        'EL-RADIO': 'Radio',
        'EL-SWITCH': 'Switch',
      }
      
      const tagName = node.tagName.toUpperCase()
      let type = tagMap[tagName] || 'Container'
      
      if (tagName === 'DIV') {
        if (node.style.display === 'flex') type = 'Flex'
        else if (node.style.display === 'grid') type = 'Grid'
      }

      const component = {
        id: uuidv4(),
        type,
        props: {},
        styles: {},
        children: [],
        events: [],
        childrenComponents: [] // 临时存放子组件对象
      }

      Array.from(node.attributes).forEach(attr => {
        const name = attr.name
        const value = attr.value
        if (name === 'style') {
          value.split(';').forEach(rule => {
            const [k, v] = rule.split(':').map(s => s.trim())
            if (k && v) {
              const camelKey = k.replace(/-([a-z])/g, g => g[1].toUpperCase())
              component.styles[camelKey] = v
            }
          })
        } else if (name === 'class') {
          component.props.className = value
        } else if (name === 'v-model') {
          component.props['modelValue'] = value
        } else if (!name.startsWith('@') && !name.startsWith('v-on:')) {
          const propName = name.replace(/^:|v-bind:/, '')
          component.props[propName] = value
        }
      })

      if (['Text', 'Heading', 'Button', 'Link'].includes(type)) {
        const textContent = Array.from(node.childNodes)
          .filter(n => n.nodeType === Node.TEXT_NODE)
          .map(n => n.textContent.trim())
          .join(' ')
        if (textContent) {
          if (type === 'Button' || type === 'Link') component.props.label = textContent
          else component.props.text = textContent
        }
      }

      Array.from(node.children).forEach(childNode => {
        const childComp = parseNodeV2(childNode)
        if (childComp) {
          component.childrenComponents.push(childComp)
        }
      })

      return component
    }

    // 执行解析
    const newComponents = []
    if (rootDiv.classList.contains('page-container')) {
      Array.from(rootDiv.children).forEach(child => {
        const comp = parseNodeV2(child)
        if (comp) traverseCollect(comp)
      })
    } else {
      const comp = parseNodeV2(rootDiv)
      if (comp) traverseCollect(comp)
    }
    
    // 更新 Store
    // 我们需要直接替换当前页面的 componentTree
    const currentPage = canvasStore.currentPage
    if (currentPage) {
      currentPage.componentTree = flatComponents
      canvasStore.currentPageId = currentPage.id // 触发更新
      if (!silent) {
        ElMessage.success('同步成功')
      }
    }

  } catch (error) {
    if (error !== 'cancel') {
      console.error(error)
      if (!silent) {
        ElMessage.error(`同步失败: ${error.message}`)
      }
    }
  }
}

const formatCode = async () => {
  if (editor) {
    await editor.getAction('editor.action.formatDocument').run()
    ElMessage.success('代码已格式化')
  }
}

const copyCode = async () => {
  if (editor) {
    const code = editor.getValue()
    try {
      await navigator.clipboard.writeText(code)
      ElMessage.success('代码已复制到剪贴板')
    } catch (err) {
      ElMessage.error('复制失败')
    }
  }
}

const jumpToSection = (tab) => {
  activeSection.value = tab.key
  if (!editor) return
  const model = editor.getModel()
  if (!model) return
  const code = model.getValue()
  const index = code.indexOf(tab.token)
  if (index === -1) return

  const position = model.getPositionAt(index + tab.token.length)
  editor.revealPositionInCenter(position)
  editor.setPosition(position)
  editor.focus()
}

const updatePreview = (code) => {
  const html = buildPreviewDocument(code)
  previewSrcDoc.value = html
}

onMounted(() => {
  if (monacoContainer.value) {
    editor = monaco.editor.create(monacoContainer.value, {
      value: '<!-- 点击"从画布同步"按钮生成代码 -->',
      language: 'html',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: true },
      fontSize: 14,
      tabSize: 2,
      formatOnPaste: true,
      formatOnType: true,
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      fontFamily: "'Consolas', 'Courier New', monospace",
    })

    const initialPosition = editor.getPosition()
    editorStore.cursorLine = initialPosition?.lineNumber || 1
    editorStore.cursorColumn = initialPosition?.column || 1

    editor.onDidChangeModelContent(() => {
      const code = editor.getValue()
      if (viewMode.value !== 'code') {
        updatePreview(code)
      }
    })

    editor.onDidChangeCursorPosition(event => {
      editorStore.cursorLine = event.position.lineNumber
      editorStore.cursorColumn = event.position.column
    })

    nextTick(() => {
      syncFromCanvas(false)
    })

    unsubscribeCanvas = canvasStore.$subscribe(() => {
      syncFromCanvas(false)
    })
    
    // 监听 iframe 消息
    window.addEventListener('message', handleIframeMessage)
  }
  
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
  }
})

const handleIframeMessage = (event) => {
  if (event.data && event.data.type === 'preview-wheel') {
    const { deltaX, deltaY, ctrlKey, metaKey } = event.data
    // 构造一个伪造的事件对象传给 handleWheel
    handleWheel({
      deltaX,
      deltaY,
      ctrlKey,
      metaKey,
      preventDefault: () => {}
    })
  }
}

watch(viewMode, (newMode) => {
  if (newMode !== 'code' && editor) {
    updatePreview(editor.getValue())
  }
})

onBeforeUnmount(async () => {
  // 自动同步代码到画布 (防止修改丢失)
  if (editor) {
    await syncToCanvas(true)
    editor.dispose()
  }
  if (typeof unsubscribeCanvas === 'function') {
    unsubscribeCanvas()
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
    window.removeEventListener('message', handleIframeMessage)
  }
})
</script>

<style scoped>
.code-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--vscode-editor-bg);
}

.editor-tabs-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--vscode-titlebar-bg);
  height: 35px;
  border-bottom: 1px solid var(--vscode-border);
}

.file-tabs {
  display: flex;
  height: 100%;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--vscode-titlebar-bg);
  border: none;
  color: var(--vscode-fg-muted);
  padding: 0 12px;
  font-size: 13px;
  cursor: pointer;
  border-right: 1px solid var(--vscode-border);
  height: 100%;
}

.tab-button:hover {
  color: var(--vscode-fg);
  background: var(--vscode-list-hover);
}

.tab-button.active {
  color: var(--vscode-fg);
  background: var(--vscode-editor-bg);
  border-top: 1px solid var(--vscode-highlight);
}

.tab-icon {
  font-size: 12px;
  font-weight: bold;
  width: 16px;
  text-align: center;
}

.icon-blue { color: #569cd6; }
.icon-yellow { color: #dcdcaa; }
.icon-pink { color: #c586c0; }

.editor-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-right: 8px;
}

.action-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--vscode-fg-muted);
  border-radius: 3px;
  cursor: pointer;
}

.action-btn:hover {
  background: var(--vscode-list-hover);
  color: var(--vscode-fg);
}

.view-toggle {
  display: flex;
  background: var(--vscode-input-bg);
  border-radius: 3px;
  padding: 2px;
  margin-left: 8px;
}

.toggle-btn {
  width: 24px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--vscode-fg-muted);
  border-radius: 2px;
  cursor: pointer;
}

.toggle-btn:hover {
  color: var(--vscode-fg);
}

.toggle-btn.active {
  background: var(--vscode-button-bg);
  color: #fff;
}

.editor-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.view-mode-split .editor-panel {
  flex: 1;
  border-right: 1px solid var(--vscode-border);
}

.view-mode-split .preview-panel {
  flex: 1;
}

.view-mode-code .editor-panel {
  flex: 1;
}

.view-mode-preview .preview-panel {
  flex: 1;
}

.editor-panel {
  position: relative;
  overflow: hidden;
}

.monaco-container {
  width: 100%;
  height: 100%;
}

.preview-panel {
  background: #ffffff;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.preview-header {
  height: 24px;
  background: #f0f0f0;
  border-bottom: 1px solid #ddd;
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 11px;
  color: #666;
  text-transform: uppercase;
}

.preview-iframe {
  flex: 1;
  width: 100%;
  border: none;
  height: 100%; /* Ensure it fills the page */
}

.preview-viewport {
  flex: 1;
  overflow: hidden;
  position: relative;
  background-color: var(--vscode-editor-bg);
  background-image: radial-gradient(var(--vscode-editor-lineHighlight) 1px, transparent 1px);
  background-size: 20px 20px;
}

.iframe-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
}
</style>
