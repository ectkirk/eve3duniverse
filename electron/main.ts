import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { app, BrowserWindow, screen, ipcMain, session } from 'electron'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

import { logger, initLogger } from './services/logger.js'

const APP_ROOT = path.join(__dirname, '..')
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
const RENDERER_DIST = path.join(APP_ROOT, 'dist')

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  mainWindow = new BrowserWindow({
    width,
    height,
    fullscreen: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    title: 'EVE 3D Universe',
    backgroundColor: '#000000',
  })

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
    mainWindow.webContents.on('console-message', ((event: unknown) => {
      const e = event as { level: number; message: string; line: number; sourceId: string }
      const levelNames: Record<number, string> = { 0: 'debug', 1: 'info', 2: 'warn', 3: 'error' }
      console.log(`[Renderer:${levelNames[e.level] ?? e.level}] ${e.message} (${e.sourceId}:${e.line})`)
    }) as never)
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' blob:",
          "worker-src 'self' blob:",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data:",
          "connect-src 'self' ws: wss: https:",
        ].join('; '),
      },
    })
  })

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'Escape' && input.type === 'keyDown') {
      mainWindow?.webContents.send('toggle-escape-menu')
      event.preventDefault()
      return
    }

    if (input.key === 'F11' && input.type === 'keyDown') {
      mainWindow?.setFullScreen(!mainWindow.isFullScreen())
      event.preventDefault()
      return
    }

    if (!app.isPackaged && input.key === 'F12' && input.type === 'keyDown') {
      mainWindow?.webContents.toggleDevTools()
      event.preventDefault()
      return
    }
  })
}

app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
app.commandLine.appendSwitch('ignore-gpu-blocklist')
app.commandLine.appendSwitch('enable-webgl2-compute-context')
app.commandLine.appendSwitch('use-angle', 'gl')

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', err, { module: 'Main' })
  })
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', reason, { module: 'Main' })
  })

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  ipcMain.on('quit-app', () => app.quit())

  app.whenReady().then(() => {
    initLogger()
    logger.info('App starting', { module: 'Main', version: app.getVersion() })

    createWindow()

    logger.info('Main window created', { module: 'Main' })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })

  app.on('window-all-closed', () => {
    logger.info('All windows closed', { module: 'Main' })
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
