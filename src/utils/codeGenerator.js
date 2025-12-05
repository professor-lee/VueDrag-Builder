import { cloneDeep } from 'lodash-es'

/**
 * 代码生成器
 * 将组件树转换为 Vue SFC 代码
 */

/**
 * 生成完整的 Vue SFC 代码
 * @param {Object} page - 页面数据
 * @param {Object} project - 项目配置
 * @returns {string} Vue SFC 代码
 */
export function generateVueSFC(page, project = {}) {
  const componentTree = resolveComponentTree(page)
  const logicResolver = buildLogicResolver(page?.composables || [])
  const template = generateTemplate(componentTree, logicResolver)
  const script = generateScript(componentTree, page, project)
  const style = generateStyle(componentTree, page.globalStyles)

  return `<template>
${template}
</template>

<script setup>
${script}
</script>

<style scoped>
${style}
</style>
`
}

/**
 * 生成 template 部分
 * @param {Array} components - 组件树
 * @returns {string} template 代码
 */
export function generateTemplate(components, logicResolver) {
  if (!components || !Array.isArray(components) || components.length === 0) {
    return '  <div class="page-container">\n    <!-- 页面内容 -->\n  </div>'
  }

  const lines = ['  <div class="page-container">']
  components.forEach(component => {
    lines.push(...generateComponentTemplate(component, 2, logicResolver))
  })
  lines.push('  </div>')

  return lines.join('\n')
}

/**
 * 递归生成单个组件的 template
 * @param {Object} component - 组件数据
 * @param {number} indent - 缩进级别
 * @returns {Array} template 行数组
 */
function generateComponentTemplate(component, indent = 0, logicResolver) {
  const lines = []
  const indentStr = '  '.repeat(indent)
  
  // 获取组件标签名
  const tagName = getTemplateTagName(component.type)
  
  // 构建属性字符串
  const attrs = generateAttributes(component, logicResolver)
  const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : ''
  
  // 判断是否有子组件或文本内容
  const hasChildren = component.children && component.children.length > 0
  const hasText = component.props?.text || component.props?.label
  
  if (!hasChildren && !hasText && isSelfClosingTag(component.type)) {
    // 自闭合标签
    lines.push(`${indentStr}<${tagName}${attrStr} />`)
  } else if (!hasChildren && hasText) {
    // 单行文本内容
    const text = component.props?.text || component.props?.label || ''
    lines.push(`${indentStr}<${tagName}${attrStr}>${escapeHtml(text)}</${tagName}>`)
  } else {
    // 有子组件或多行内容
    lines.push(`${indentStr}<${tagName}${attrStr}>`)
    
    // 递归渲染子组件
    if (hasChildren && Array.isArray(component.children)) {
      const slotGroups = groupChildrenBySlot(component.children)
      if (slotGroups) {
        slotGroups.forEach(group => {
          const children = group.children || []
          if (group.slot === 'default') {
            children.forEach(child => {
              if (child && typeof child === 'object') {
                lines.push(...generateComponentTemplate(child, indent + 1, logicResolver))
              }
            })
          } else {
            lines.push(`${indentStr}  <template #${group.slot}>`)
            children.forEach(child => {
              if (child && typeof child === 'object') {
                lines.push(...generateComponentTemplate(child, indent + 2, logicResolver))
              }
            })
            lines.push(`${indentStr}  </template>`)
          }
        })
      } else {
        component.children.forEach(child => {
          if (child && typeof child === 'object') {
            lines.push(...generateComponentTemplate(child, indent + 1, logicResolver))
          }
        })
      }
    }
    
    lines.push(`${indentStr}</${tagName}>`)
  }
  
  return lines
}

/**
 * 获取组件对应的 template 标签名
 */
function getTemplateTagName(type) {
  const tagMap = {
    'Container': 'div',
    'Flex': 'div',
    'Grid': 'div',
    'Card': 'el-card',
    'Button': 'el-button',
    'Text': 'span',
    'Heading': 'h2',
    'Image': 'el-image',
    'Divider': 'el-divider',
    'Link': 'el-link',
    'Input': 'el-input',
    'Select': 'el-select',
    'Checkbox': 'el-checkbox',
    'Radio': 'el-radio',
    'Switch': 'el-switch',
    'Teleport': 'teleport',
    'Suspense': 'Suspense',
  }
  return tagMap[type] || 'div'
}

/**
 * 判断是否是自闭合标签
 */
function isSelfClosingTag(type) {
  // 为了兼容 DOMParser 解析，尽量不使用自闭合标签，除非是标准 HTML void 元素
  // 这里我们全部返回 false，强制生成闭合标签
  return false
}

/**
 * 生成组件属性
 */
function generateAttributes(component, logicResolver) {
  const attrs = []
  const directives = component.directives || {}
  
  // 1. 指令 (v-if, v-show, v-for)
  if (directives.vFor) {
    attrs.push(`v-for="${directives.vFor}"`)
    if (directives.vForKey) {
      attrs.push(`:key="${directives.vForKey}"`)
    }
  }
  
  if (directives.vIf) attrs.push(`v-if="${directives.vIf}"`)
  else if (directives.vShow) attrs.push(`v-show="${directives.vShow}"`)
  
  // 2. 双向绑定 (v-model)
  if (directives.vModel) {
    let vModelStr = `v-model`
    if (directives.vModelModifiers && directives.vModelModifiers.length > 0) {
      vModelStr += '.' + directives.vModelModifiers.join('.')
    }
    vModelStr += `="${directives.vModel}"`
    attrs.push(vModelStr)
  }
  
  // 3. Class
  if (component.props?.className) {
    attrs.push(`class="${component.props.className}"`)
  }
  
  // 4. 常规属性 (Props)
  const props = component.props || {}
  Object.entries(props).forEach(([key, value]) => {
    if (['text', 'label', 'className'].includes(key)) return
    if (directives.vModel && key === 'modelValue') return
    if (component.logicBindings && component.logicBindings[key]) return
    
    if (typeof value === 'boolean') {
      if (value) attrs.push(`:${key}="true"`)
    }
    else if (typeof value === 'number') {
      attrs.push(`:${key}="${value}"`)
    }
    else if (value) {
      attrs.push(`${key}="${escapeAttr(String(value))}"`)
    }
  })
  
  // 5. 事件绑定
  if (component.events) {
    Object.entries(component.events).forEach(([event, handler]) => {
      if (handler && handler.action) {
        attrs.push(`@${event}="handle${capitalizeFirst(event)}_${component.id.slice(0, 4)}"`)
      }
    })
  }
  
  // 6. 内联样式
  if (component.styles && Object.keys(component.styles).length > 0) {
    const styleStr = generateInlineStyle(component.styles)
    if (styleStr) {
      attrs.push(`style="${escapeAttr(styleStr)}"`)
    }
  }
  
  // 7. 逻辑绑定 (composables)
  if (component.logicBindings) {
    Object.entries(component.logicBindings).forEach(([propKey, binding]) => {
      const alias = logicResolver
        ? logicResolver(binding.composableId, binding.returnKey)
        : buildLogicAlias(binding.composableId, binding.returnKey)
      if (alias) {
        attrs.push(`:${propKey}="${alias}"`)
      }
    })
  }

  return attrs
}

/**
 * 生成内联样式字符串
 */
function generateInlineStyle(styles) {
  const parts = []
  Object.entries(styles).forEach(([key, value]) => {
    if (value) {
      // 转换驼峰命名为短横线命名
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
      parts.push(`${cssKey}: ${value}`)
    }
  })
  return parts.join('; ')
}

/**
 * 生成 script 部分
 */
export function generateScript(components, page = {}, project = {}) {
  const lines = []
  
  const state = project.reactiveState || []
  const computedDefs = project.computedDefs || []
  const composablesRaw = Array.isArray(page.composables) ? page.composables : []
  // 兜底 source，避免 useMouse 等无来源时报未定义
  const composables = composablesRaw
    .filter(comp => comp && comp.name)
    .map(comp => {
      const source = comp.source || (comp.name && comp.name.startsWith('use') ? '@vueuse/core' : '')
      return { ...comp, source }
    })
  
  // 1. 收集 Imports
  const usedImports = new Set()
  if (state.some(s => s.type === 'ref')) usedImports.add('ref')
  if (state.some(s => s.type === 'reactive')) usedImports.add('reactive')
  if (computedDefs.length > 0) usedImports.add('computed')
  
  const hasNavigation = checkHasNavigation(components)
  if (hasNavigation) usedImports.add('useRouter')
  
  // 生成 Import 语句
  const vueImports = []
  if (usedImports.has('ref')) vueImports.push('ref')
  if (usedImports.has('reactive')) vueImports.push('reactive')
  if (usedImports.has('computed')) vueImports.push('computed')
  
  if (vueImports.length > 0) {
    lines.push(`import { ${vueImports.join(', ')} } from 'vue'`)
  }
  
  if (usedImports.has('useRouter')) {
    lines.push("import { useRouter } from 'vue-router'")
  }

  // 组合式函数导入（按来源聚合）
  const composableImports = new Map()
  composables.forEach(comp => {
    if (!comp?.name || !comp?.source) return
    if (!composableImports.has(comp.source)) {
      composableImports.set(comp.source, new Set())
    }
    composableImports.get(comp.source).add(comp.name)
  })

  composableImports.forEach((names, source) => {
    lines.push(`import { ${Array.from(names).join(', ')} } from '${source}'`)
  })
  
  lines.push('')
  
  if (usedImports.has('useRouter')) {
    lines.push('const router = useRouter()')
    lines.push('')
  }
  
  // 2. 生成响应式状态
  if (state.length > 0) {
    lines.push('// 响应式状态')
    state.forEach(item => {
      const value = item.value || (item.type === 'ref' ? "''" : '{}')
      lines.push(`const ${item.name} = ${item.type}(${value})`)
    })
    lines.push('')
  }
  
  // 3. 生成计算属性
  if (computedDefs.length > 0) {
    lines.push('// 计算属性')
    computedDefs.forEach(item => {
      lines.push(`const ${item.name} = computed(() => {`)
      const codeLines = item.code ? item.code.split('\n') : []
      codeLines.forEach(line => lines.push(`  ${line}`))
      lines.push('})')
    })
    lines.push('')
  }
  
  // 4. 生成逻辑 (composables)
  if (composables.length > 0) {
    lines.push('// 逻辑 (composables)')
    composables
      .filter(comp => comp.name && comp.source)
      .forEach(comp => {
      const aliasList = Array.isArray(comp.returns)
        ? comp.returns.map(ret => `${ret}: ${buildLogicAlias(comp.id, ret)}`).join(', ')
        : ''
      const params = buildComposableParams(comp.params)
      if (aliasList) {
        lines.push(`const { ${aliasList} } = ${comp.name}(${params})`)
      } else {
        const varName = buildLogicAlias(comp.id, comp.name || 'logic')
        lines.push(`const ${varName} = ${comp.name}(${params})`)
      }
      })
    lines.push('')
  }

  // 5. 生成事件处理函数
  const handlers = generateEventHandlers(components)
  if (handlers.length > 0) {
    lines.push('// 事件处理函数')
    handlers.forEach(handler => {
      lines.push(handler)
      lines.push('')
    })
  }
  
  return lines.join('\n')
}

/**
 * 检查是否有导航事件
 */
function checkHasNavigation(components) {
  if (!Array.isArray(components)) {
    console.warn('checkHasNavigation: components is not an array', components)
    return false
  }
  
  for (const component of components) {
    if (!component) continue
    
    if (component.events) {
      const hasNav = Object.values(component.events).some(
        handler => handler?.action === 'navigateTo'
      )
      if (hasNav) return true
    }
    
    if (component.children && component.children.length > 0) {
      if (checkHasNavigation(component.children)) return true
    }
  }
  return false
}


/**
 * 生成事件处理函数
 */
function generateEventHandlers(components) {
  const handlers = []
  const handlerSet = new Set()
  
  function traverse(comps) {
    if (!Array.isArray(comps)) {
      console.warn('generateEventHandlers traverse: comps is not an array', comps)
      return
    }
    comps.forEach(component => {
      if (!component) return
      if (component.events) {
        Object.entries(component.events).forEach(([event, handler]) => {
          if (handler && handler.action) {
            const funcName = `handle${capitalizeFirst(event)}_${component.id.slice(0, 4)}`
            
            if (!handlerSet.has(funcName)) {
              handlerSet.add(funcName)
              
              if (handler.action === 'navigateTo' && handler.params?.path) {
                handlers.push(`const ${funcName} = () => {
  router.push('${handler.params.path}')
}`)
              } else if (handler.action === 'toggleComponent' && handler.params?.targetId) {
                handlers.push(`const ${funcName} = () => {
  // TODO: 实现组件显示/隐藏逻辑
  console.log('Toggle component: ${handler.params.targetId}')
}`)
              } else if (handler.action === 'customCode' && handler.params?.code) {
                handlers.push(`const ${funcName} = () => {
${handler.params.code.split('\n').map(line => '  ' + line).join('\n')}
}`)
              } else {
                handlers.push(`const ${funcName} = () => {
  console.log('${event} triggered')
}`)
              }
            }
          }
        })
      }
      
      if (component.children && component.children.length > 0) {
        traverse(component.children)
      }
    })
  }
  
  if (Array.isArray(components)) {
    traverse(components)
  }
  return handlers
}

/**
 * 生成 style 部分
 */
export function generateStyle(components, globalStyles = {}) {
  const lines = []
  
  // 全局样式
  if (globalStyles && Object.keys(globalStyles).length > 0) {
    lines.push('/* 全局样式 */')
    lines.push('.page-container {')
    Object.entries(globalStyles).forEach(([key, value]) => {
      if (value) {
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
        lines.push(`  ${cssKey}: ${value};`)
      }
    })
    lines.push('}')
    lines.push('')
  }
  
  // 组件特定样式 (如果需要)
  // 这里可以根据组件类型生成一些默认样式
  
  return lines.join('\n')
}

/**
 * 工具函数
 */
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, m => map[m])
}

function escapeAttr(text) {
  return text.replace(/"/g, '&quot;')
}

function buildLogicAlias(composableId, returnKey) {
  if (!composableId || !returnKey) return null
  const safeId = String(composableId).replace(/[^a-zA-Z0-9_]/g, '_')
  const safeKey = String(returnKey).replace(/[^a-zA-Z0-9_]/g, '_')
  return `${safeId}_${safeKey}`
}

function buildComposableParams(params) {
  if (!Array.isArray(params) || params.length === 0) return ''
  return params.map(p => {
    const val = (p && typeof p === 'object' && 'value' in p) ? p.value : p
    const stringified = JSON.stringify(val)
    return stringified === undefined ? 'undefined' : stringified
  }).join(', ')
}

function buildLogicResolver(composables = []) {
  return (composableId, returnKey) => {
    const exists = composables.find(c => c.id === composableId)
    if (!exists) return null
    return buildLogicAlias(composableId, returnKey)
  }
}

function resolveComponentTree(page = {}) {
  if (Array.isArray(page.components)) {
    return cloneDeep(page.components)
  }
  if (!Array.isArray(page.componentTree)) return []

  const map = new Map()
  page.componentTree.forEach(comp => {
    map.set(comp.id, { ...cloneDeep(comp), children: [] })
  })

  page.componentTree.forEach(comp => {
    const node = map.get(comp.id)
    const childIds = Array.isArray(comp.children) ? comp.children : []
    childIds.forEach(cid => {
      const childNode = map.get(cid)
      if (node && childNode) {
        node.children.push(childNode)
      }
    })
  })

  const roots = []
  const rootIds = Array.isArray(page.rootOrder) && page.rootOrder.length
    ? page.rootOrder
    : page.componentTree.filter(c => !c.parentId).map(c => c.id)
  rootIds.forEach(id => {
    const node = map.get(id)
    if (node) roots.push(node)
  })
  return roots
}

function groupChildrenBySlot(children) {
  if (!Array.isArray(children)) return null
  const hasSlot = children.some(c => c && typeof c.slotName !== 'undefined')
  if (!hasSlot) return null
  const buckets = new Map()
  children.forEach(child => {
    const slot = child?.slotName || 'default'
    if (!buckets.has(slot)) buckets.set(slot, [])
    buckets.get(slot).push(child)
  })
  return Array.from(buckets.entries()).map(([slot, list]) => ({ slot, children: list }))
}

export default {
  generateVueSFC,
  generateTemplate,
  generateScript,
  generateStyle,
}
