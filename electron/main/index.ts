import { app, BrowserWindow, Tray, Menu, nativeImage, nativeTheme, ipcMain } from 'electron'
import path from 'path'
import { registerIpcHandlers } from './ipc-handlers'

nativeTheme.themeSource = 'dark'

// Required for Windows toast notifications to work
app.setAppUserModelId('com.iptv.playerx')

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let forceQuit = false
let currentChannel: string | null = null

function getTrayIcon() {
  const iconPath = path.join(__dirname, '../../resources/tray-icon.png')
  const img = nativeImage.createFromPath(iconPath)
  return img.isEmpty() ? nativeImage.createEmpty() : img
}

function buildTrayMenu(): Electron.Menu {
  return Menu.buildFromTemplate([
    { label: 'IPTV PlayerX', enabled: false },
    {
      label: currentChannel ? `▶  ${currentChannel}` : 'Not playing',
      enabled: false
    },
    { type: 'separator' },
    {
      label: mainWindow?.isVisible() ? 'Hide Window' : 'Show Window',
      click: () => {
        toggleWindow()
        tray?.setContextMenu(buildTrayMenu())
      }
    },
    { type: 'separator' },
    {
      label: 'Quit IPTV PlayerX',
      click: () => {
        forceQuit = true
        app.quit()
      }
    }
  ])
}

function toggleWindow() {
  if (!mainWindow) return
  if (mainWindow.isVisible() && mainWindow.isFocused()) {
    mainWindow.hide()
  } else {
    mainWindow.show()
    mainWindow.focus()
  }
}

function createTray() {
  tray = new Tray(getTrayIcon())
  tray.setToolTip('IPTV PlayerX')
  tray.setContextMenu(buildTrayMenu())
  tray.on('click', () => {
    toggleWindow()
    tray?.setContextMenu(buildTrayMenu())
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0d0d12',
    show: false,
    icon: getTrayIcon(),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  })

  mainWindow.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({
      requestHeaders: {
        ...details.requestHeaders,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': undefined as any,
        'Referer': undefined as any
      }
    })
  })

  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Access-Control-Allow-Origin': ['*'],
        'Access-Control-Allow-Methods': ['GET, POST, OPTIONS'],
        'Access-Control-Allow-Headers': ['*']
      }
    })
  })

  registerIpcHandlers(mainWindow)

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    // electron-vite builds renderer to out/renderer/index.html
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => mainWindow?.show())

  // Minimize to tray on close instead of quitting
  mainWindow.on('close', (e) => {
    if (!forceQuit) {
      e.preventDefault()
      mainWindow?.hide()
      tray?.setContextMenu(buildTrayMenu())
    }
  })

  // Keep tray menu label (Show/Hide) in sync
  mainWindow.on('show', () => tray?.setContextMenu(buildTrayMenu()))
  mainWindow.on('hide', () => tray?.setContextMenu(buildTrayMenu()))

  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(() => {
  createWindow()
  createTray()

  // Tray channel update — registered here where tray is in scope
  ipcMain.handle('tray:setChannel', (_, channelName: string | null) => {
    currentChannel = channelName
    tray?.setToolTip(channelName ? `▶  ${channelName}  —  IPTV PlayerX` : 'IPTV PlayerX')
    tray?.setContextMenu(buildTrayMenu())
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Mark as force-quit so the close handler lets the window actually close
app.on('before-quit', () => { forceQuit = true })

app.on('window-all-closed', () => {
  // On non-macOS, only quit if explicitly requested (not on window close)
  if (process.platform !== 'darwin' && forceQuit) app.quit()
})
