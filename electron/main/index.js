import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import {
  initDatabase,
  getAllRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe
} from './database.js'
import { getApiKey, setApiKey } from './settings.js'
import { importRecipeFromPhoto } from './ai.js'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.drinkcards')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  await initDatabase()

  // Recipe CRUD
  ipcMain.handle('recipe:getAll', () => getAllRecipes())
  ipcMain.handle('recipe:getById', (_, id) => getRecipeById(id))
  ipcMain.handle('recipe:create', (_, data) => createRecipe(data))
  ipcMain.handle('recipe:update', (_, id, data) => updateRecipe(id, data))
  ipcMain.handle('recipe:delete', (_, id) => deleteRecipe(id))

  // File dialogs
  ipcMain.handle('dialog:openPhoto', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select drink photo',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }]
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('dialog:openRecipePhoto', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select photo of recipe card',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }]
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // Settings
  ipcMain.handle('settings:getApiKey', () => getApiKey())
  ipcMain.handle('settings:setApiKey', (_, key) => setApiKey(key))

  // AI import
  ipcMain.handle('ai:importFromPhoto', async (_, imagePath) => {
    try {
      const data = await importRecipeFromPhoto(imagePath)
      return { ok: true, data }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // Printing — routes through Electron's native print (not window.print()/Chromium's
  // dialog) so we can set duplex mode and an exact half-letter page size.
  ipcMain.handle('print:job', (event, options = {}) => {
    return new Promise((resolve) => {
      event.sender.print(
        {
          silent: options.silent ?? false,
          printBackground: true, // without this, the black header bars print white
          // Electron wants custom page sizes in microns: 5.5in x 8.5in = 139700 x 215900
          pageSize: { width: 139700, height: 215900 },
          // marginType 'none' — the page's own @page CSS already reserves 0.4in
          // margins, so we don't want Electron adding a second layer on top of that
          margins: { marginType: 'PrintableArea' },
          duplexMode: options.duplex ? 'longEdge' : 'simplex'
        },
        (success, errorType) => {
          resolve({ success, errorType: success ? null : errorType })
        }
      )
    })
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
