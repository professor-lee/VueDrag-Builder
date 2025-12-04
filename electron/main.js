import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import archiver from 'archiver'
import * as pty from 'node-pty'
import { createMenu } from './menu.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 禁用硬件加速（可选，根据需要）
app.disableHardwareAcceleration()

let mainWindow = null
let ptyProcess = null
const defaultShell = process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/bash'

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'VueDrag Builder',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  })

  // 开发环境加载 Vite 开发服务器
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    // 生产环境加载构建产物
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // 设置应用菜单
  createMenu(mainWindow)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// ========== IPC 通信处理 ==========

// 读取文件
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const data = await fs.readFile(filePath, 'utf-8')
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 写入文件
ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    // 确保目录存在
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, content, 'utf-8')
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 选择文件夹
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: '选择项目文件夹',
  })

  if (result.canceled) {
    return { success: false, canceled: true }
  }

  return { success: true, path: result.filePaths[0] }
})

// 选择项目文件
// 选择导出路径
ipcMain.handle('select-export-path', async (event, defaultPath) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '选择导出文件',
    defaultPath: defaultPath || path.join(app.getPath('documents'), 'project.zip'),
    filters: [{ name: 'Zip Archive', extensions: ['zip'] }],
    buttonLabel: '保存',
  })

  if (result.canceled || !result.filePath) {
    return { success: false, canceled: true }
  }

  return { success: true, path: result.filePath }
})

// 读取目录内容
ipcMain.handle('read-directory', async (event, dirPath) => {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const items = entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      path: path.join(dirPath, entry.name),
    }))
    return { success: true, items }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 执行命令（用于 npm install / build）
import { spawn } from 'node:child_process'

ipcMain.handle('exec-command', async (event, command, args, options = {}) => {
  return new Promise(resolve => {
    const child = spawn(command, Array.isArray(args) ? args : [], {
      cwd: options.cwd,
      shell: true,
      env: { ...process.env, ...options.env },
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', data => {
      const text = data.toString()
      stdout += text
      // 实时发送日志到渲染进程
      mainWindow?.webContents.send('command-output', text)
    })

    child.stderr.on('data', data => {
      const text = data.toString()
      stderr += text
      mainWindow?.webContents.send('command-output', text)
    })

    child.on('close', code => {
      resolve({
        success: code === 0,
        code,
        stdout,
        stderr,
      })
    })

    child.on('error', error => {
      resolve({
        success: false,
        error: error.message,
      })
    })
  })
})

// 显示消息框
ipcMain.handle('show-message', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options)
  return result
})

// 获取应用路径
ipcMain.handle('get-app-path', async (event, name) => {
  return app.getPath(name)
})

// 批量写入项目文件（基于相对路径）
ipcMain.handle('write-project-files', async (event, rootPath, files = {}) => {
  try {
    if (!rootPath) {
      throw new Error('缺少项目根路径')
    }

    await fs.mkdir(rootPath, { recursive: true })

    await Promise.all(
      Object.entries(files).map(async ([relativePath, content]) => {
        const targetPath = path.join(rootPath, relativePath)
        await fs.mkdir(path.dirname(targetPath), { recursive: true })

        if (content instanceof Uint8Array || content instanceof Buffer) {
          await fs.writeFile(targetPath, content)
        } else {
          await fs.writeFile(targetPath, content ?? '', 'utf-8')
        }
      })
    )

    return { success: true, written: Object.keys(files).length }
  } catch (error) {
    console.error('write-project-files error:', error)
    return { success: false, error: error.message }
  }
})

// 打包目录为 zip
ipcMain.handle('zip-directory', async (event, options) => {
  try {
    const { sourceDir, outputPath, includeDistOnly = false } = options || {}
    if (!sourceDir || !outputPath) {
      throw new Error('缺少 sourceDir 或 outputPath')
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true })

    await new Promise((resolve, reject) => {
      const output = createWriteStream(outputPath)
      const archive = archiver('zip', { zlib: { level: 9 } })

      output.on('close', resolve)
      output.on('error', reject)
      archive.on('error', reject)

      archive.pipe(output)

      if (includeDistOnly) {
        archive.directory(path.join(sourceDir, 'dist'), 'dist')
      } else {
        archive.directory(sourceDir, false)
      }

      archive.finalize()
    })

    return { success: true, outputPath }
  } catch (error) {
    console.error('zip-directory error:', error)
    return { success: false, error: error.message }
  }
})

// 读取项目内的相对文件
ipcMain.handle('read-project-file', async (event, rootPath, relativePath) => {
  try {
    if (!rootPath || !relativePath) {
      throw new Error('缺少必要的路径参数')
    }

    const targetPath = path.join(rootPath, relativePath)
    const data = await fs.readFile(targetPath, 'utf-8')
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// ========== PTY 终端 ==========

// 创建 PTY 终端
ipcMain.handle('pty-create', async (event, options = {}) => {
  try {
    if (ptyProcess) {
      ptyProcess.kill()
      ptyProcess = null
    }

    const shell = options.shell || defaultShell
    const cwd = options.cwd || app.getPath('home')
    const cols = options.cols || 80
    const rows = options.rows || 24

    ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd,
      env: { ...process.env, TERM: 'xterm-256color' },
    })

    ptyProcess.onData(data => {
      mainWindow?.webContents.send('pty-data', data)
    })

    ptyProcess.onExit(({ exitCode }) => {
      mainWindow?.webContents.send('pty-exit', exitCode)
      ptyProcess = null
    })

    return { success: true, pid: ptyProcess.pid }
  } catch (error) {
    console.error('pty-create error:', error)
    return { success: false, error: error.message }
  }
})

// 向 PTY 终端写入数据
ipcMain.handle('pty-write', async (event, data) => {
  if (ptyProcess) {
    ptyProcess.write(data)
    return { success: true }
  }
  return { success: false, error: 'No active terminal' }
})

// 调整 PTY 终端大小
ipcMain.handle('pty-resize', async (event, cols, rows) => {
  if (ptyProcess) {
    ptyProcess.resize(cols, rows)
    return { success: true }
  }
  return { success: false, error: 'No active terminal' }
})

// 销毁 PTY 终端
ipcMain.handle('pty-destroy', async () => {
  if (ptyProcess) {
    ptyProcess.kill()
    ptyProcess = null
    return { success: true }
  }
  return { success: false, error: 'No active terminal' }
})

