/**
 * 文件导出器
 * 将项目导出为完整的 Vite + Vue3 源代码
 */

import { generateVueSFC } from './codeGenerator'

/**
 * 构建项目文件映射
 * @param {Object} project - 项目数据
 * @returns {Object} 文件映射 { path: content }
 */
export function generateProjectFileMap(project) {
  const files = {}

  // 1. package.json
  files['package.json'] = JSON.stringify(generatePackageJson(project), null, 2)

  // 2. vite.config.js
  files['vite.config.js'] = generateViteConfig(project)

  // 3. index.html
  files['index.html'] = generateIndexHtml(project)

  // 4. src/main.js
  files['src/main.js'] = generateMainJs(project)

  // 5. src/App.vue
  files['src/App.vue'] = generateAppVue(project)

  // 6. src/router/index.js
  files['src/router/index.js'] = generateRouter(project)

  // 7. 生成所有页面组件
  if (project.pages && Array.isArray(project.pages)) {
    project.pages.forEach(page => {
      const pageName = page.name || page.id
      const fileName = `src/views/${pageName}.vue`
      files[fileName] = generateVueSFC(page, project)
    })
  }

  // 8. .gitignore
  files['.gitignore'] = generateGitignore()

  // 9. README.md
  files['README.md'] = generateReadme(project)

  // 10. Builder 元数据，便于再次导入
  const metaPayload = {
    metaVersion: project.metaVersion || 1,
    ...project,
  }
  files['.vuedrag/builder.project.json'] = JSON.stringify(metaPayload, null, 2)

  return files
}

/**
 * 生成 package.json
 */
function generatePackageJson(project) {
  const packageName = project.name || project.projectName || 'vue-drag-app'
  const needVueUse = projectUsesVueUse(project)
  return {
    name: packageName,
    version: '1.0.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: {
      vue: '^3.4.0',
      'vue-router': '^4.2.5',
      'element-plus': '^2.5.0',
      '@element-plus/icons-vue': '^2.3.1',
      ...(needVueUse ? { '@vueuse/core': '^10.7.0' } : {}),
    },
    devDependencies: {
      '@vitejs/plugin-vue': '^5.0.0',
      vite: '^5.0.0',
      'unplugin-vue-components': '^0.26.0',
      'unplugin-auto-import': '^0.17.3',
    },
  }
}

function projectUsesVueUse(project) {
  if (!project || !Array.isArray(project.pages)) return false
  return project.pages.some(page => Array.isArray(page.composables) && page.composables.some(c => c?.source === '@vueuse/core'))
}

/**
 * 生成 vite.config.js
 */
function generateViteConfig(project) {
  return `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  base: './',
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
`
}

/**
 * 生成 index.html
 */
function generateIndexHtml(project) {
  const title = project.name || project.projectName || 'Vue Drag App'
  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <link rel="icon" type="image/svg+xml" href="/vite.svg">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
`
}

/**
 * 生成 src/main.js
 */
function generateMainJs(project) {
  return `import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(ElementPlus)
app.use(router)
app.mount('#app')
`
}

/**
 * 生成 src/App.vue
 */
function generateAppVue(project) {
  return `<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup>
// 全局配置和初始化
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
`
}

/**
 * 生成 src/router/index.js
 */
function generateRouter(project) {
  const routes = []

  if (project.pages && Array.isArray(project.pages)) {
    project.pages.forEach((page, index) => {
      const pageName = page.name || page.id
      const path = page.route || (index === 0 ? '/' : `/${pageName.toLowerCase()}`)
      routes.push({
        path,
        name: pageName,
        component: `() => import('@/views/${pageName}.vue')`,
      })
    })
  }

  // 如果没有页面，添加默认路由
  if (routes.length === 0) {
    routes.push({
      path: '/',
      name: 'Home',
      component: `() => import('@/views/Home.vue')`,
    })
  }

  const routesStr = routes
    .map(
      route => `  {
    path: '${route.path}',
    name: '${route.name}',
    component: ${route.component}
  }`
    )
    .join(',\n')

  return `import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
${routesStr}
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
`
}

/**
 * 生成 .gitignore
 */
function generateGitignore() {
  return `# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
`
}

/**
 * 生成 README.md
 */
function generateReadme(project) {
  const name = project.name || project.projectName || 'Vue Drag App'
  return `# ${name}

使用 VueDrag Builder 生成的 Vue 3 + Vite 项目。

## 安装依赖

\`\`\`bash
npm install
\`\`\`

## 开发模式

\`\`\`bash
npm run dev
\`\`\`

## 构建生产版本

\`\`\`bash
npm run build
\`\`\`

## 预览生产版本

\`\`\`bash
npm run preview
\`\`\`

## 技术栈

- Vue 3
- Vite 5
- Vue Router 4
- Element Plus 2.5
- Composition API

---

由 VueDrag Builder 自动生成
`
}

/**
 * 将文件映射写入磁盘
 * @param {Object} files - 文件映射
 * @param {string} targetDir - 目标目录
 */
export async function exportProject(project, options = {}) {
  if (!window.electron) {
    throw new Error('需要在 Electron 环境中运行')
  }

  try {
    let resolvedDir = normalizeDirectoryInput(options.targetDir)

    if (!resolvedDir) {
      // 选择保存目录
      const targetDir = await window.electron.selectFolder()
      if (!targetDir || targetDir.canceled || !targetDir.success) {
        return { success: false, message: '用户取消了选择' }
      }

      resolvedDir = normalizeDirectoryInput(targetDir)
    }

    if (!resolvedDir) {
      throw new Error('无法解析导出目录')
    }

    // 生成文件
    const files = generateProjectFileMap(project)

    const result = await window.electron.writeProjectFiles(resolvedDir, files)
    if (!result.success) {
      return {
        success: false,
        message: result.error || '写入项目文件失败',
      }
    }

    return {
      success: true,
      message: `成功导出 ${Object.keys(files).length} 个文件到: ${resolvedDir}`,
      targetDir: resolvedDir,
      fileCount: Object.keys(files).length,
    }
  } catch (error) {
    console.error('导出项目失败:', error)
    return {
      success: false,
      message: error.message,
    }
  }
}

/**
 * 导出并构建项目
 * @param {Object} project - 项目数据
 * @param {Function} onProgress - 进度回调
 * @returns {Object} 构建结果
 */
export async function exportAndBuild(project, onProgress = () => {}, options = {}) {
  if (!window.electron) {
    throw new Error('需要在 Electron 环境中运行')
  }

  try {
    // 1. 导出源代码
    onProgress({ stage: 'export', progress: 0, message: '正在导出源代码...' })
    const exportResult = await exportProject(project, {
      targetDir: normalizeDirectoryInput(options.targetDir),
    })
    
    if (!exportResult.success) {
      throw new Error(exportResult.message)
    }

    const projectDir = exportResult.targetDir
    const npmEnv = buildNpmEnv(project)

    // 2. 安装依赖
    onProgress({ stage: 'install', progress: 30, message: '正在安装依赖（可能需要几分钟）...' })
    const stopInstallPulse = startProgressPulse(onProgress, {
      stage: 'install',
      from: 30,
      to: 64,
      message: '正在安装依赖（可能需要几分钟）...'
    })

    const installResult = await window.electron.execCommand('npm', buildNpmArgs('install', project), {
      cwd: projectDir,
      env: npmEnv,
    })
    stopInstallPulse()
    if (!installResult.success) {
      throw new Error(installResult.stderr || '依赖安装失败')
    }
    onProgress({ stage: 'install', progress: 65, message: '依赖安装完成' })

    // 3. 构建项目
    onProgress({ stage: 'build', progress: 70, message: '正在构建项目...' })
    const stopBuildPulse = startProgressPulse(onProgress, {
      stage: 'build',
      from: 70,
      to: 95,
      message: '正在构建项目...'
    })

    const buildResult = await window.electron.execCommand('npm', ['run', 'build'], {
      cwd: projectDir,
      env: npmEnv,
    })
    stopBuildPulse()
    if (!buildResult.success) {
      throw new Error(buildResult.stderr || '构建失败')
    }

    onProgress({ stage: 'complete', progress: 100, message: '构建完成！' })

    return {
      success: true,
      message: '项目构建成功',
      projectDir,
      distDir: `${projectDir}/dist`,
    }
  } catch (error) {
    console.error('构建项目失败:', error)
    return {
      success: false,
      message: error.message,
    }
  }
}

export async function exportProjectArchive(project, onProgress = () => {}) {
  if (!window.electron) {
    throw new Error('需要在 Electron 环境中运行')
  }

  try {
    onProgress({ stage: 'prepare', progress: 0, message: '正在准备项目文件...' })

    const workingDir = await createWorkingDirectory('source', project)
    const exportResult = await exportProject(project, { targetDir: workingDir })

    if (!exportResult.success) {
      return exportResult
    }

    const zipPath = await selectZipDestination(`${getProjectSlug(project)}-source.zip`)
    if (!zipPath) {
      return { success: false, message: '用户取消了保存路径选择' }
    }

    onProgress({ stage: 'zip', progress: 70, message: '正在打包源代码...' })
    const zipResult = await window.electron.zipDirectory({
      sourceDir: exportResult.targetDir,
      outputPath: zipPath,
      includeDistOnly: false,
    })

    if (!zipResult.success) {
      throw new Error(zipResult.error || '压缩源代码失败')
    }

    onProgress({ stage: 'complete', progress: 100, message: '导出完成' })

    return {
      success: true,
      message: `ZIP 文件已导出到: ${zipPath}`,
      outputPath: zipPath,
      projectDir: exportResult.targetDir,
    }
  } catch (error) {
    console.error('导出源代码 ZIP 失败:', error)
    return {
      success: false,
      message: error.message,
    }
  }
}

export async function exportBuildArchive(project, onProgress = () => {}) {
  if (!window.electron) {
    throw new Error('需要在 Electron 环境中运行')
  }

  try {
    const zipPath = await selectZipDestination(`${getProjectSlug(project)}-dist.zip`)
    if (!zipPath) {
      return { success: false, message: '用户取消了保存路径选择' }
    }

    const workingDir = await createWorkingDirectory('build', project)

    const buildResult = await exportAndBuild(
      project,
      data => {
        onProgress(data)
      },
      { targetDir: workingDir }
    )

    if (!buildResult.success) {
      return buildResult
    }

    onProgress({ stage: 'zip', progress: 90, message: '正在打包构建产物...' })
    const zipResult = await window.electron.zipDirectory({
      sourceDir: buildResult.projectDir,
      outputPath: zipPath,
      includeDistOnly: true,
    })

    if (!zipResult.success) {
      throw new Error(zipResult.error || '压缩构建目录失败')
    }

    onProgress({ stage: 'complete', progress: 100, message: '导出完成' })

    return {
      success: true,
      message: `构建 ZIP 已导出到: ${zipPath}`,
      outputPath: zipPath,
      distDir: buildResult.distDir,
    }
  } catch (error) {
    console.error('导出构建 ZIP 失败:', error)
    return {
      success: false,
      message: error.message,
    }
  }
}

function sanitizeFileName(name) {
  const cleaned = (name || 'project')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

  return cleaned || 'project'
}

function normalizeDirectoryInput(input) {
  if (!input) return ''
  if (typeof input === 'string') return input
  if (typeof input === 'object' && input.path) return input.path
  return ''
}

function getProjectSlug(project) {
  return sanitizeFileName(project?.name || project?.projectName || 'project')
}

async function createWorkingDirectory(type, project) {
  const tempRoot = await window.electron.getAppPath('temp')
  const folderName = `VueDrag-${getProjectSlug(project)}-${type}-${Date.now()}`
  return joinPath(tempRoot, folderName)
}

async function selectZipDestination(defaultFileName) {
  try {
    const documentsPath = await window.electron.getAppPath('documents')
    const defaultPath = joinPath(documentsPath, defaultFileName)
    const result = await window.electron.selectExportPath(defaultPath)

    if (!result || result.canceled || result.success === false) {
      return ''
    }

    const rawPath = result.path || result.filePath
    if (!rawPath) {
      return ''
    }

    return ensureZipExtension(rawPath)
  } catch (error) {
    console.error('选择导出路径失败:', error)
    return ''
  }
}

function ensureZipExtension(filePath) {
  if (!filePath) return filePath
  return filePath.toLowerCase().endsWith('.zip') ? filePath : `${filePath}.zip`
}

function joinPath(base, segment) {
  if (!base) return segment

  const trimmedBase = base.replace(/[\\/]+$/, '')
  if (!trimmedBase) {
    return segment
  }

  const separator = trimmedBase.includes('\\') && !trimmedBase.includes('/') ? '\\' : '/'
  return `${trimmedBase}${separator}${segment}`
}

function buildNpmArgs(command, project) {
  const args = [command]
  if (command === 'install') {
    args.push('--legacy-peer-deps', '--prefer-offline', '--no-audit', '--progress=false')
  }

  const registry = resolveNpmRegistry(project)
  if (registry) {
    args.push('--registry', registry)
  }

  return args
}

function buildNpmEnv(project) {
  const registry = resolveNpmRegistry(project)
  if (!registry) return undefined
  return {
    npm_config_registry: registry,
    NPM_CONFIG_REGISTRY: registry,
  }
}

function resolveNpmRegistry(project) {
  if (!project) return ''
  if (project.customRegistry) return project.customRegistry
  if (project.registryUrl) return project.registryUrl
  if (project.npmRegistry) return project.npmRegistry
  return ''
}

function startProgressPulse(onProgress, { stage, from = 0, to = 100, message }) {
  if (typeof onProgress !== 'function' || to <= from) {
    return () => {}
  }

  let current = from
  const step = Math.max(1, Math.floor((to - from) / 10))
  const interval = setInterval(() => {
    current = Math.min(to - 1, current + step)
    onProgress({ stage, progress: current, message })
  }, 1500)

  return () => clearInterval(interval)
}

export default {
  generateProjectFileMap,
  exportProject,
  exportAndBuild,
  exportProjectArchive,
  exportBuildArchive,
}
