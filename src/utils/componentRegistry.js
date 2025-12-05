// 组件注册表
import { 
  ElButton, 
  ElInput, 
  ElImage, 
  ElDivider, 
  ElSwitch, 
  ElSelect,
  ElCheckbox,
  ElRadio,
  ElCard,
  ElIcon,
  ElDatePicker,
} from 'element-plus'

// 组件映射表
export const componentMap = {
  Button: ElButton,
  Input: ElInput,
  Textarea: ElInput,
  Image: ElImage,
  Divider: ElDivider,
  Switch: ElSwitch,
  Select: ElSelect,
  Checkbox: ElCheckbox,
  Radio: ElRadio,
  Card: ElCard,
  Icon: 'div',
  Video: 'div',
  DatePicker: ElDatePicker,
  Container: 'div',
  Flex: 'div',
  Grid: 'div',
  Text: 'span',
  Heading: 'h2',
  Link: 'a',
  Teleport: 'teleport',
  Suspense: 'Suspense',
}

// 组件定义
export const components = {
  // === 容器组件 ===
  Container: {
    name: 'Container',
    displayName: '容器',
    category: '容器组件',
    icon: '📦',
    type: 'Container',
    defaultProps: {},
    canHaveChildren: true,
    slots: ['header', 'default', 'footer'],
    package: 'builtin',
  },

  Flex: {
    name: 'Flex',
    displayName: 'Flex容器',
    category: '容器组件',
    icon: '↔️',
    type: 'Flex',
    defaultProps: {},
    canHaveChildren: true,
    slots: ['header', 'default', 'footer'],
    package: 'builtin',
  },

  Grid: {
    name: 'Grid',
    displayName: 'Grid容器',
    category: '容器组件',
    icon: '⊞',
    type: 'Grid',
    defaultProps: {},
    canHaveChildren: true,
    slots: ['header', 'default', 'footer'],
    package: 'builtin',
  },

  Card: {
    name: 'Card',
    displayName: '卡片',
    category: '容器组件',
    icon: '🃏',
    type: 'Card',
    defaultProps: {
      header: '卡片标题',
    },
    canHaveChildren: true,
    slots: ['header', 'default', 'footer'],
    package: 'element-plus',
  },

  // === 基础组件 ===
  Button: {
    name: 'Button',
    displayName: '按钮',
    category: '基础组件',
    icon: '🔘',
    type: 'Button',
    defaultProps: {
      label: '按钮',
      type: 'primary',
      size: 'default',
    },
    canHaveChildren: false,
    package: 'element-plus',
  },

  Text: {
    name: 'Text',
    displayName: '文本',
    category: '基础组件',
    icon: '📄',
    type: 'Text',
    defaultProps: {
      text: '文本内容',
    },
    canHaveChildren: false,
    package: 'builtin',
  },

  Heading: {
    name: 'Heading',
    displayName: '标题',
    category: '基础组件',
    icon: '📰',
    type: 'Heading',
    defaultProps: {
      text: '这是标题',
    },
    canHaveChildren: false,
    package: 'builtin',
  },

  Image: {
    name: 'Image',
    displayName: '图片',
    category: '基础组件',
    icon: '🖼️',
    type: 'Image',
    defaultProps: {
      src: '',
      fit: 'cover',
      alt: '图片',
    },
    styles: {
      width: '100%',
      minHeight: '200px',
      borderRadius: '4px',
      overflow: 'hidden',
    },
    canHaveChildren: false,
    package: 'element-plus',
  },

  Divider: {
    name: 'Divider',
    displayName: '分割线',
    category: '基础组件',
    icon: '➖',
    type: 'Divider',
    defaultProps: {},
    canHaveChildren: false,
    package: 'element-plus',
  },

  Link: {
    name: 'Link',
    displayName: '链接',
    category: '基础组件',
    icon: '🔗',
    type: 'Link',
    defaultProps: {
      text: '链接文本',
      href: '#',
    },
    canHaveChildren: false,
    package: 'element-plus',
  },

  // === 表单组件 ===
  Input: {
    name: 'Input',
    displayName: '输入框',
    category: '表单组件',
    icon: '📝',
    type: 'Input',
    defaultProps: {
      placeholder: '请输入',
      modelValue: '',
    },
    canHaveChildren: false,
    vModelProp: 'modelValue',
    package: 'element-plus',
  },

  Textarea: {
    name: 'Textarea',
    displayName: '文本域',
    category: '表单组件',
    icon: '📋',
    type: 'Textarea',
    defaultProps: {
      placeholder: '请输入文本',
      modelValue: '',
      type: 'textarea',
      rows: 4,
    },
    canHaveChildren: false,
    vModelProp: 'modelValue',
    package: 'element-plus',
  },

  Select: {
    name: 'Select',
    displayName: '下拉框',
    category: '表单组件',
    icon: '📋',
    type: 'Select',
    defaultProps: {
      placeholder: '请选择',
    },
    canHaveChildren: false,
    vModelProp: 'modelValue',
    package: 'element-plus',
  },

  Checkbox: {
    name: 'Checkbox',
    displayName: '复选框',
    category: '表单组件',
    icon: '☑️',
    type: 'Checkbox',
    defaultProps: {
      label: '复选框',
    },
    canHaveChildren: false,
    vModelProp: 'modelValue',
    package: 'element-plus',
  },

  Radio: {
    name: 'Radio',
    displayName: '单选框',
    category: '表单组件',
    icon: '🔘',
    type: 'Radio',
    defaultProps: {
      label: '单选框',
    },
    canHaveChildren: false,
    vModelProp: 'modelValue',
    package: 'element-plus',
  },

  Switch: {
    name: 'Switch',
    displayName: '开关',
    category: '表单组件',
    icon: '🔀',
    type: 'Switch',
    defaultProps: {},
    canHaveChildren: false,
    vModelProp: 'modelValue',
    package: 'element-plus',
  },

  DatePicker: {
    name: 'DatePicker',
    displayName: '日期选择器',
    category: '表单组件',
    icon: '📅',
    type: 'DatePicker',
    defaultProps: {
      placeholder: '选择日期',
    },
    canHaveChildren: false,
    vModelProp: 'modelValue',
    package: 'element-plus',
  },

  // === 媒体组件 ===
  Icon: {
    name: 'Icon',
    displayName: '图标',
    category: '媒体组件',
    icon: '⭐',
    type: 'Icon',
    defaultProps: {
      name: 'VideoPlay',
      size: 24,
    },
    canHaveChildren: false,
    package: 'element-plus',
  },

  Video: {
    name: 'Video',
    displayName: '视频',
    category: '媒体组件',
    icon: '📹',
    type: 'Video',
    defaultProps: {
      src: '',
      controls: true,
      width: '100%',
    },
    canHaveChildren: false,
    package: 'builtin',
  },

  // === 结构组件 / Vue 核心 ===
  Teleport: {
    name: 'Teleport',
    displayName: 'Teleport',
    category: '结构组件',
    icon: '🛰️',
    type: 'Teleport',
    defaultProps: {
      to: 'body',
      disabled: false,
    },
    canHaveChildren: true,
    slots: ['default'],
    package: 'vue',
  },

  Suspense: {
    name: 'Suspense',
    displayName: 'Suspense',
    category: '结构组件',
    icon: '⏳',
    type: 'Suspense',
    defaultProps: {},
    canHaveChildren: true,
    slots: ['default', 'fallback'],
    package: 'vue',
  },
}

// 按类别分组
export const componentsByCategory = {
  容器组件: [
    components.Container, 
    components.Flex, 
    components.Grid,
    components.Card,
  ],
  基础组件: [
    components.Button, 
    components.Text, 
    components.Heading,
    components.Image,
    components.Divider,
    components.Link,
  ],
  表单组件: [
    components.Input,
    components.Textarea,
    components.Select,
    components.Checkbox,
    components.Radio,
    components.Switch,
    components.DatePicker,
  ],
  媒体组件: [
    components.Icon,
    components.Video,
  ],
  结构组件: [
    components.Teleport,
    components.Suspense,
  ],
}

export default {
  map: componentMap,
  components,
  byCategory: componentsByCategory,
}

