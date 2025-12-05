import { defineStore } from 'pinia'

export const useEditorStore = defineStore('editor', {
  state: () => ({
    mode: 'visual', // 'visual' | 'code'
    selectedComponentId: null,
    hoveredComponentId: null,
    zoom: 100,
    deviceMode: 'desktop', // 'desktop' | 'tablet' | 'mobile'
    showGrid: false,
    showRuler: false,
    terminalVisible: false,
    terminalPreferredTab: 'terminal',
    cursorLine: 1,
    cursorColumn: 1,
    logicBoardVisible: false,
    logicBoardPageId: null,
    
    // 响应式数据管理
    reactiveState: [], // { name, type: 'ref'|'reactive', value: any }
    computedDefs: [], // { name, code: string }
  }),

  getters: {
    isVisualMode: state => state.mode === 'visual',
    isCodeMode: state => state.mode === 'code',
    hasSelection: state => !!state.selectedComponentId,
  },

  actions: {
    // 切换模式
    toggleMode() {
      this.mode = this.mode === 'visual' ? 'code' : 'visual'
    },

    // 设置模式
    setMode(mode) {
      if (['visual', 'code'].includes(mode)) {
        this.mode = mode
      }
    },

    // 选中组件
    selectComponent(id) {
      this.selectedComponentId = id
    },

    // 悬停组件
    hoverComponent(id) {
      this.hoveredComponentId = id
    },

    // 设置缩放
    setZoom(zoom) {
      this.zoom = Math.max(10, Math.min(200, zoom))
    },

    // 重置缩放
    resetZoom() {
      this.zoom = 100
    },

    // 设置设备模式
    setDeviceMode(mode) {
      if (['desktop', 'tablet', 'mobile'].includes(mode)) {
        this.deviceMode = mode
      }
    },

    // 切换网格显示
    toggleGrid() {
      this.showGrid = !this.showGrid
    },

    // 切换标尺显示
    toggleRuler() {
      this.showRuler = !this.showRuler
    },

    // 终端控制
    openTerminal(tab = 'terminal') {
      this.terminalPreferredTab = tab
      this.terminalVisible = true
    },

    closeTerminal() {
      this.terminalVisible = false
    },

    toggleTerminal(tab = 'terminal') {
      if (this.terminalVisible) {
        this.closeTerminal()
      } else {
        this.openTerminal(tab)
      }
    },

    // 逻辑编排视图控制
    openLogicBoard(pageId = null) {
      this.logicBoardVisible = true
      this.logicBoardPageId = pageId
    },
    closeLogicBoard() {
      this.logicBoardVisible = false
    },
    toggleLogicBoard(pageId = null) {
      if (this.logicBoardVisible) {
        this.closeLogicBoard()
      } else {
        this.openLogicBoard(pageId)
      }
    },
    setLogicBoardPage(pageId) {
      this.logicBoardPageId = pageId
    },

    // === 数据管理 Actions ===
    addReactiveItem(item) {
      this.reactiveState.push(item)
    },
    updateReactiveItem(index, item) {
      if (index >= 0 && index < this.reactiveState.length) {
        this.reactiveState[index] = item
      }
    },
    removeReactiveItem(index) {
      this.reactiveState.splice(index, 1)
    },
    addComputed(item) {
      this.computedDefs.push(item)
    },
    updateComputed(index, item) {
      if (index >= 0 && index < this.computedDefs.length) {
        this.computedDefs[index] = item
      }
    },
    removeComputed(index) {
      this.computedDefs.splice(index, 1)
    },
  },
})
