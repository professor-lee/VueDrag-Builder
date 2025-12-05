import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { cloneDeep } from 'lodash-es'

export const useCanvasStore = defineStore('canvas', {
  state: () => ({
    pages: [],
    currentPageId: null,
    globalStyles: '',
    canvasSize: {
      width: 1280,
      height: 800,
      isFixed: false, // 是否使用固定大小
    },
  }),

  getters: {
    // 当前页面对象
    currentPage: state => {
      return state.pages.find(p => p.id === state.currentPageId)
    },

    // 当前页面的组件树
    currentComponents: state => {
      const page = state.pages.find(p => p.id === state.currentPageId)
      return page ? page.componentTree : []
    },

    // 构建树形结构（用于显示）
    componentTreeHierarchy: state => {
      const page = state.pages.find(p => p.id === state.currentPageId)
      if (!page) return []

      const nodeMap = new Map()
      const originalMap = new Map()

      page.componentTree.forEach(comp => {
        originalMap.set(comp.id, comp)
        nodeMap.set(comp.id, { ...comp })
      })

      originalMap.forEach((comp, id) => {
        const childIds = Array.isArray(comp.children) && comp.children.length > 0
          ? comp.children
          : page.componentTree
              .filter(child => child.parentId === comp.id)
              .map(child => child.id)

        const node = nodeMap.get(id)
        node.children = childIds
          .map(childId => nodeMap.get(childId))
          .filter(Boolean)
      })

      const rootNodes = page.componentTree
        .filter(comp => !comp.parentId)
        .map(comp => nodeMap.get(comp.id))
        .filter(Boolean)

      if (Array.isArray(page.rootOrder) && page.rootOrder.length) {
        const orderMap = new Map(page.rootOrder.map((id, idx) => [id, idx]))
        rootNodes.sort((a, b) => {
          const ai = orderMap.has(a.id) ? orderMap.get(a.id) : Number.MAX_SAFE_INTEGER
          const bi = orderMap.has(b.id) ? orderMap.get(b.id) : Number.MAX_SAFE_INTEGER
          return ai - bi
        })
      }

      return rootNodes
    },

    // 根据ID获取组件
    getComponentById: state => id => {
      const page = state.pages.find(p => p.id === state.currentPageId)
      return page?.componentTree.find(comp => comp.id === id)
    },

    // 获取所有后代组件ID
    getDescendants: state => id => {
      const page = state.pages.find(p => p.id === state.currentPageId)
      if (!page) return []

      const descendants = []
      const traverse = compId => {
        const comp = page.componentTree.find(c => c.id === compId)
        if (comp && comp.children) {
          comp.children.forEach(childId => {
            descendants.push(childId)
            traverse(childId)
          })
        }
      }
      traverse(id)
      return descendants
    },
  },

  actions: {
    // 重置状态
    reset() {
      this.pages = []
      this.currentPageId = null
      this.globalStyles = ''
    },

    // 从项目数据加载
    loadFromProject(project) {
      this.pages = Array.isArray(project.pages) ? project.pages : []
      this.globalStyles = project.globalStyles || ''
      this.currentPageId = this.pages.length > 0 ? this.pages[0].id : null
      
      // 确保每个页面的 componentTree 是数组
      this.pages.forEach(page => {
        if (!Array.isArray(page.composables)) {
          page.composables = []
        }
        page.composables.forEach(comp => {
          if (!Array.isArray(comp.bindings)) comp.bindings = []
        })
        if (!Array.isArray(page.componentTree)) {
          page.componentTree = []
        }
        // 确保每个组件的 children 是数组
        page.componentTree.forEach(comp => {
          if (!Array.isArray(comp.children)) {
            comp.children = []
          }
          if (!comp.props) comp.props = {}
          if (!comp.styles) comp.styles = {}
          if (!comp.directives) comp.directives = {} // 初始化指令
          if (!Array.isArray(comp.events)) comp.events = []
          if (typeof comp.slotName === 'undefined') comp.slotName = null
          if (!comp.logicBindings || typeof comp.logicBindings !== 'object') {
            comp.logicBindings = {}
          }
        })

        if (!Array.isArray(page.rootOrder)) {
          page.rootOrder = page.componentTree
            .filter(comp => !comp.parentId)
            .map(comp => comp.id)
        } else {
          const known = new Set(page.rootOrder)
          page.componentTree
            .filter(comp => !comp.parentId && !known.has(comp.id))
            .forEach(comp => page.rootOrder.push(comp.id))
        }
      })
    },

    // 创建新页面
    createPage(name, route) {
      const page = {
        id: uuidv4(),
        name,
        route,
        componentTree: [],
        rootOrder: [],
        composables: [],
      }
      if (!Array.isArray(this.pages)) {
        this.pages = []
      }
      this.pages.push(page)
      this.currentPageId = page.id

      // 标记项目已修改
      const projectStore = useProjectStore()
      projectStore.markDirty()

      return page.id
    },

    // 删除页面
    deletePage(pageId) {
      const index = this.pages.findIndex(p => p.id === pageId)
      if (index === -1) return

      this.pages.splice(index, 1)

      // 切换到第一个页面
      if (this.currentPageId === pageId) {
        this.currentPageId = this.pages[0]?.id || null
      }

      const projectStore = useProjectStore()
      projectStore.markDirty()
    },

    // 切换当前页面
    switchPage(pageId) {
      if (this.pages.find(p => p.id === pageId)) {
        this.currentPageId = pageId
        const editorStore = useEditorStore()
        editorStore.setLogicBoardPage(pageId)
      }
    },

    // 添加组件
    addComponent(componentData, parentId = null, index = -1) {
      const page = this.pages.find(p => p.id === this.currentPageId)
      if (!page) return null

      // 确保 componentData 有必需的字段
      if (!componentData || !componentData.type) {
        console.error('Invalid componentData:', componentData)
        return null
      }

      const component = {
        id: uuidv4(),
        type: componentData.type,
        parentId,
        props: cloneDeep(componentData.defaultProps || componentData.props || {}),
        styles: cloneDeep(componentData.styles || {}),
        directives: cloneDeep(componentData.directives || {}),
        events: componentData.events || [],
        children: [],
        locked: false,
        slotName: componentData.slotName || null,
        logicBindings: componentData.logicBindings || {},
      }

      // 添加到父组件的children数组或根序列
      if (parentId) {
        const parent = page.componentTree.find(c => c.id === parentId)
        if (parent) {
          if (!Array.isArray(parent.children)) {
            parent.children = []
          }
          if (index >= 0) {
            parent.children.splice(index, 0, component.id)
          } else {
            parent.children.push(component.id)
          }
        }
      } else {
        if (!Array.isArray(page.rootOrder)) {
          page.rootOrder = page.componentTree
            .filter(comp => !comp.parentId)
            .map(comp => comp.id)
        }
        const safeIndex = typeof index === 'number' && index >= 0
          ? Math.min(index, page.rootOrder.length)
          : page.rootOrder.length
        page.rootOrder.splice(safeIndex, 0, component.id)
      }

      page.componentTree.push(component)

      // 记录历史
      const historyStore = useHistoryStore()
      historyStore.record({
        type: 'add',
        pageId: this.currentPageId,
        componentId: component.id,
        data: cloneDeep(component),
      })

      const projectStore = useProjectStore()
      projectStore.markDirty()

      return component.id
    },

    // 删除组件
    deleteComponent(id) {
      const page = this.pages.find(p => p.id === this.currentPageId)
      if (!page) return

      const comp = page.componentTree.find(c => c.id === id)
      if (!comp) return

      // 获取所有后代
      const descendants = this.getDescendants(id)
      const toDelete = [id, ...descendants]

      // 保存删除前的数据用于撤销
      const deletedData = toDelete.map(cid => ({
        id: cid,
        data: cloneDeep(page.componentTree.find(c => c.id === cid)),
      }))

      // 从父组件的children中移除
      if (comp.parentId) {
        const parent = page.componentTree.find(c => c.id === comp.parentId)
        if (parent) {
          parent.children = parent.children.filter(cid => cid !== id)
        }
      } else if (Array.isArray(page.rootOrder)) {
        page.rootOrder = page.rootOrder.filter(rootId => rootId !== id)
      }

      // 从componentTree中移除
      page.componentTree = page.componentTree.filter(c => !toDelete.includes(c.id))

      // 清理逻辑绑定引用
      this.cleanupBindingsForComponents(page, toDelete)

      // 取消选中
      const editorStore = useEditorStore()
      if (toDelete.includes(editorStore.selectedComponentId)) {
        editorStore.selectComponent(null)
      }

      // 记录历史
      const historyStore = useHistoryStore()
      historyStore.record({
        type: 'delete',
        pageId: this.currentPageId,
        componentId: id,
        data: deletedData,
      })

      const projectStore = useProjectStore()
      projectStore.markDirty()
    },

    // 更新组件
    updateComponent(id, updates) {
      const page = this.pages.find(p => p.id === this.currentPageId)
      if (!page) return

      const comp = page.componentTree.find(c => c.id === id)
      if (!comp) return

      const oldData = cloneDeep(comp)
      Object.assign(comp, updates)

      // 记录历史
      const historyStore = useHistoryStore()
      historyStore.record({
        type: 'update',
        pageId: this.currentPageId,
        componentId: id,
        oldData,
        newData: cloneDeep(comp),
      })

      const projectStore = useProjectStore()
      projectStore.markDirty()
    },

    // 移动组件
    moveComponent(id, newParentId, newIndex, slotName = undefined) {
      const page = this.pages.find(p => p.id === this.currentPageId)
      if (!page) return

      const comp = page.componentTree.find(c => c.id === id)
      if (!comp) return

      const oldParentId = comp.parentId
      const oldParent = oldParentId
        ? page.componentTree.find(c => c.id === oldParentId)
        : null
      const oldIndex = oldParentId
        ? (oldParent?.children.indexOf(id) ?? -1)
        : (Array.isArray(page.rootOrder) ? page.rootOrder.indexOf(id) : -1)

      const ensureRootOrder = () => {
        if (!Array.isArray(page.rootOrder)) {
          page.rootOrder = page.componentTree
            .filter(component => !component.parentId)
            .map(component => component.id)
        }
      }

      const removeFromRootOrder = () => {
        if (!Array.isArray(page.rootOrder)) return
        const idx = page.rootOrder.indexOf(id)
        if (idx !== -1) {
          page.rootOrder.splice(idx, 1)
        }
      }

      const insertIntoRootOrder = () => {
        ensureRootOrder()
        const targetIndex = typeof newIndex === 'number' && newIndex >= 0
          ? Math.min(newIndex, page.rootOrder.length)
          : page.rootOrder.length
        page.rootOrder.splice(targetIndex, 0, id)
      }

      // 从旧父组件移除或从根序列移除
      if (oldParentId && oldParent) {
        oldParent.children = oldParent.children.filter(cid => cid !== id)
      } else {
        removeFromRootOrder()
      }

      if (newParentId) {
        const newParent = page.componentTree.find(c => c.id === newParentId)
        if (newParent) {
          if (!Array.isArray(newParent.children)) {
            newParent.children = []
          }
          const targetIndex = typeof newIndex === 'number' && newIndex >= 0
            ? Math.min(newIndex, newParent.children.length)
            : newParent.children.length
          newParent.children.splice(targetIndex, 0, id)
          comp.parentId = newParentId
          if (typeof slotName !== 'undefined') {
            comp.slotName = slotName
          }
        }
      } else {
        comp.parentId = null
        comp.slotName = null
        insertIntoRootOrder()
      }

      // 记录历史
      const historyStore = useHistoryStore()
      historyStore.record({
        type: 'move',
        pageId: this.currentPageId,
        componentId: id,
        oldParentId,
        oldIndex,
        newParentId,
        newIndex,
      })

      const projectStore = useProjectStore()
      projectStore.markDirty()
    },

    // 更新画布设置
    updateCanvasSize(size) {
      this.canvasSize = { ...this.canvasSize, ...size }
      const projectStore = useProjectStore()
      projectStore.markDirty()
    },

    // 更新全局样式
    updateGlobalStyles(css) {
      this.globalStyles = css
      const projectStore = useProjectStore()
      projectStore.markDirty()
    },

    // === 逻辑 (composables) 管理 ===
    addComposable(composableData) {
      const page = this.pages.find(p => p.id === this.currentPageId)
      if (!page) return null

      const composable = {
        id: uuidv4(),
        name: composableData.name,
        source: composableData.source || '',
        params: Array.isArray(composableData.params) ? composableData.params : [],
        returns: Array.isArray(composableData.returns) ? composableData.returns : [],
        bindings: Array.isArray(composableData.bindings) ? composableData.bindings : [],
      }

      page.composables.push(composable)

      const historyStore = useHistoryStore()
      historyStore.record({
        type: 'add-composable',
        pageId: this.currentPageId,
        composable: cloneDeep(composable),
      })

      const projectStore = useProjectStore()
      projectStore.markDirty()
      return composable.id
    },

    updateComposable(id, updates) {
      const page = this.pages.find(p => p.id === this.currentPageId)
      if (!page) return
      const target = page.composables.find(c => c.id === id)
      if (!target) return

      const oldData = cloneDeep(target)
      Object.assign(target, updates)

      const historyStore = useHistoryStore()
      historyStore.record({
        type: 'update-composable',
        pageId: this.currentPageId,
        composableId: id,
        oldData,
        newData: cloneDeep(target),
      })

      const projectStore = useProjectStore()
      projectStore.markDirty()
    },

    removeComposable(id, { force = false } = {}) {
      const page = this.pages.find(p => p.id === this.currentPageId)
      if (!page) return false
      const idx = page.composables.findIndex(c => c.id === id)
      if (idx === -1) return false

      const target = page.composables[idx]
      if (!force && Array.isArray(target.bindings) && target.bindings.length > 0) {
        return false
      }

      const deleted = page.composables.splice(idx, 1)[0]

      // 清理组件上的逻辑绑定引用
      page.componentTree.forEach(comp => {
        if (!comp.logicBindings) return
        const next = { ...comp.logicBindings }
        Object.entries(next).forEach(([key, val]) => {
          if (val?.composableId === id) {
            delete next[key]
            this.syncLogicBinding(comp.id, key, null)
          }
        })
        comp.logicBindings = next
      })

      const historyStore = useHistoryStore()
      historyStore.record({
        type: 'remove-composable',
        pageId: this.currentPageId,
        composable: cloneDeep(deleted),
      })

      const projectStore = useProjectStore()
      projectStore.markDirty()
      return true
    },

    syncLogicBinding(componentId, propKey, binding) {
      const page = this.pages.find(p => p.id === this.currentPageId)
      if (!page) return

      page.composables.forEach(comp => {
        if (!Array.isArray(comp.bindings)) comp.bindings = []
        comp.bindings = comp.bindings.filter(b => !(b.componentId === componentId && b.prop === propKey))
      })

      if (binding && binding.composableId) {
        const target = page.composables.find(c => c.id === binding.composableId)
        if (target) {
          if (!Array.isArray(target.bindings)) target.bindings = []
          target.bindings.push({ componentId, prop: propKey, returnKey: binding.returnKey })
        }
      }

      const projectStore = useProjectStore()
      projectStore.markDirty()
    },

    cleanupBindingsForComponents(page, componentIds) {
      if (!page || !Array.isArray(page.composables)) return
      page.composables.forEach(comp => {
        if (!Array.isArray(comp.bindings)) comp.bindings = []
        comp.bindings = comp.bindings.filter(b => !componentIds.includes(b.componentId))
      })
    },
  },
})

// 导入其他stores
import { useProjectStore } from './project'
import { useHistoryStore } from './history'
import { useEditorStore } from './editor'
