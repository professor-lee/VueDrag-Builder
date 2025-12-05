import { ElLoading, ElMessage, ElMessageBox } from 'element-plus'
import { exportProject, exportAndBuild, exportProjectArchive, exportBuildArchive } from '@/utils/fileExporter'
import { useProjectStore } from '@/stores/project'
import { useCanvasStore } from '@/stores/canvas'
import { useEditorStore } from '@/stores/editor'

function buildProjectPayload(projectStore, canvasStore, editorStore) {
  return {
    ...projectStore.projectSnapshot,
    pages: canvasStore.pages,
    globalStyles: canvasStore.globalStyles,
    reactiveState: editorStore.reactiveState || [],
    computedDefs: editorStore.computedDefs || [],
  }
}

export function useProjectExport() {
  const projectStore = useProjectStore()
  const canvasStore = useCanvasStore()
  const editorStore = useEditorStore()

  const ensureProjectAvailable = () => {
    if (!projectStore.hasProject) {
      ElMessage.warning('请先创建或打开一个项目')
      return false
    }
    return true
  }

  const withLoading = async (text, runner) => {
    const loading = ElLoading.service({
      lock: true,
      text,
      background: 'rgba(0, 0, 0, 0.7)',
    })

    try {
      const result = await runner(loading)
      loading.close()
      return result
    } catch (error) {
      loading.close()
      throw error
    }
  }

  const exportSourceFolder = async () => {
    if (!ensureProjectAvailable()) {
      return { success: false, message: '项目未就绪' }
    }

    try {
      return await withLoading('正在导出源代码...', async () => {
        const project = buildProjectPayload(projectStore, canvasStore, editorStore)
        const result = await exportProject(project)

        if (!result.success) {
          throw new Error(result.message || '导出失败')
        }

        await ElMessageBox.alert(
          `成功导出 ${result.fileCount} 个文件到:\n${result.targetDir}\n\n请在该目录下运行:\nnpm install\nnpm run dev`,
          '导出成功',
          {
            confirmButtonText: '确定',
            type: 'success',
          }
        )

        return result
      })
    } catch (error) {
      console.error('导出源代码失败:', error)
      ElMessage.error(`导出失败: ${error.message || '未知错误'}`)
      return { success: false, message: error.message }
    }
  }

  const exportSourceZip = async () => {
    if (!ensureProjectAvailable()) {
      return { success: false, message: '项目未就绪' }
    }

    try {
      return await withLoading('正在生成源代码 ZIP...', async loading => {
        const project = buildProjectPayload(projectStore, canvasStore, editorStore)
        const result = await exportProjectArchive(project, ({ message, progress }) => {
          loading.setText(`${message} (${progress}%)`)
        })

        if (!result.success) {
          throw new Error(result.message || '打包失败')
        }

        await ElMessageBox.alert(
          `已生成源代码 ZIP 文件:\n${result.outputPath}`,
          '导出成功',
          {
            confirmButtonText: '确定',
            type: 'success',
          }
        )

        return result
      })
    } catch (error) {
      console.error('导出源代码 ZIP 失败:', error)
      ElMessage.error(`导出失败: ${error.message || '未知错误'}`)
      return { success: false, message: error.message }
    }
  }

  const exportBuildFolder = async () => {
    if (!ensureProjectAvailable()) {
      return { success: false, message: '项目未就绪' }
    }

    try {
      return await withLoading('正在导出并构建项目...', async loading => {
        const project = buildProjectPayload(projectStore, canvasStore, editorStore)
        const result = await exportAndBuild(project, ({ message, progress }) => {
          loading.setText(`${message} (${progress}%)`)
        })

        if (!result.success) {
          throw new Error(result.message || '构建失败')
        }

        await ElMessageBox.alert(
          `项目已构建完成！\n源代码: ${result.projectDir}\n构建产物: ${result.distDir}`,
          '构建成功',
          {
            confirmButtonText: '确定',
            type: 'success',
          }
        )

        return result
      })
    } catch (error) {
      console.error('导出构建版本失败:', error)
      ElMessage.error(`构建失败: ${error.message || '未知错误'}`)
      return { success: false, message: error.message }
    }
  }

  const exportBuildZip = async () => {
    if (!ensureProjectAvailable()) {
      return { success: false, message: '项目未就绪' }
    }

    try {
      return await withLoading('正在构建并打包 ZIP...', async loading => {
        const project = buildProjectPayload(projectStore, canvasStore, editorStore)
        const result = await exportBuildArchive(project, ({ message, progress }) => {
          loading.setText(`${message} (${progress}%)`)
        })

        if (!result.success) {
          throw new Error(result.message || '构建失败')
        }

        await ElMessageBox.alert(
          `已生成构建 ZIP 文件:\n${result.outputPath}`,
          '导出成功',
          {
            confirmButtonText: '确定',
            type: 'success',
          }
        )

        return result
      })
    } catch (error) {
      console.error('导出构建 ZIP 失败:', error)
      ElMessage.error(`导出失败: ${error.message || '未知错误'}`)
      return { success: false, message: error.message }
    }
  }

  return {
    exportSourceFolder,
    exportSourceZip,
    exportBuildFolder,
    exportBuildZip,
  }
}
