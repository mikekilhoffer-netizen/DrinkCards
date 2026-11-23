import { app, shell, BrowserWindow, ipcMain, dialog, protocol, net, session } from 'electron'
import { join, resolve, sep, extname } from 'path'
import { readFile } from 'fs/promises'
import { pathToFileURL } from 'url'
import { isSafeLocalImagePath, isAllowedExternalUrl, isAllowedFeed } from './safety.mjs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import {
  initDatabase,
  getAllRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe
} from './database.js'
import { getApiKey, setApiKey, getUpdateFeed, setUpdateFeed, resetUpdateFeed } from './settings.js'
import { importRecipeFromPhoto } from './ai.js'
import { checkForUpdate, DEFAULT_UPDATE_FEED } from './updates.js'

// Drink photos are shown through this scheme instead of file://, so the page
// itself can't load arbitrary files. Every request is checked against
// isSafeLocalImagePath - local drive, image extension, no UNC paths (which
// would make Windows send the user's credentials to a remote server).
const PHOTO_SCHEME = 'dc-photo'

// The packaged app's own pages are served from app://drinkcards/ rather than
// file://. Under file://, the page's "same origin" is the entire disk, so
// script in the page could read any local file. Here it is one folder.
const APP_SCHEME = 'app'
const APP_HOST = 'drinkcards'
const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`
const RENDERER_ROOT = join(__dirname, '../renderer')

// Sent as a header as well as in index.html's <meta>, so it applies from the
// first byte and can't be dropped by anything that rewrites the document.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' ${PHOTO_SCHEME}: data:`,
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-src 'none'",
  "frame-ancestors 'none'"
].join('; ')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.json': 'application/json'
}

protocol.registerSchemesAsPrivileged([
  { scheme: APP_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
  { scheme: PHOTO_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }
])

async function serveAppFile(request) {
  let url
  try {
    url = new URL(request.url)
  } catch {
    return new Response(null, { status: 400 })
  }
  if (url.host !== APP_HOST) return new Response(null, { status: 404 })
  const rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)
  const file = resolve(RENDERER_ROOT, '.' + rel)
  // No escaping the renderer folder with ../ or an absolute path.
  if (file !== RENDERER_ROOT && !file.startsWith(RENDERER_ROOT + sep)) return new Response(null, { status: 403 })
  try {
    const body = await readFile(file)
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
        'Content-Security-Policy': CSP,
        'X-Content-Type-Options': 'nosniff'
      }
    })
  } catch {
    return new Response(null, { status: 404 })
  }
}

// The only file the AI import may read is the one the person just picked in
// the "Select photo of recipe card" dialog - not any path the page names.
let pendingRecipePhoto = null

const cleanRecipe = (data) => {
  const d = data && typeof data === 'object' ? data : {}
  return { ...d, photo_path: isSafeLocalImagePath(d.photo_path) ? d.photo_path : '' }
}

const isAppUrl = (url) => {
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    return url.startsWith(process.env['ELECTRON_RENDERER_URL'])
  }
  return url.startsWith(`${APP_ORIGIN}/`)
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Links (e.g. the donation button) open in the browser - https only.
  // Other protocols handed to the OS (file:, ms-msdt:, search-ms:, ...)
  // have been used to launch programs.
  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (isAllowedExternalUrl(details.url)) shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // The window never navigates away from the app. Without this, dropping a
  // file onto it would load that file in place of the app - with the app's
  // privileges.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAppUrl(url)) event.preventDefault()
  })
  mainWindow.webContents.on('will-redirect', (event, url) => {
    if (!isAppUrl(url)) event.preventDefault()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadURL(`${APP_ORIGIN}/index.html`)
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.drinkcards')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // The app needs no camera, microphone, location, notifications, etc.
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, callback) => callback(false))
  session.defaultSession.setPermissionCheckHandler(() => false)

  // No <webview> tags, ever.
  app.on('web-contents-created', (_, contents) => {
    contents.on('will-attach-webview', (event) => event.preventDefault())
  })

  protocol.handle(APP_SCHEME, serveAppFile)

  protocol.handle(PHOTO_SCHEME, (request) => {
    let p = null
    try {
      p = new URL(request.url).searchParams.get('p')
    } catch {}
    if (!isSafeLocalImagePath(p)) return new Response(null, { status: 403 })
    return net.fetch(pathToFileURL(p).toString())
  })

  await initDatabase()

  // Recipe CRUD. photo_path is checked here as well as when it's displayed,
  // so nothing unsafe is ever written to the database.
  ipcMain.handle('recipe:getAll', () => getAllRecipes())
  ipcMain.handle('recipe:getById', (_, id) => getRecipeById(Number(id)))
  ipcMain.handle('recipe:create', (_, data) => createRecipe(cleanRecipe(data)))
  ipcMain.handle('recipe:update', (_, id, data) => updateRecipe(Number(id), cleanRecipe(data)))
  ipcMain.handle('recipe:delete', (_, id) => deleteRecipe(Number(id)))

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
    pendingRecipePhoto = result.canceled ? null : result.filePaths[0]
    return pendingRecipePhoto
  })

  // Settings
  ipcMain.handle('settings:getApiKey', () => getApiKey())
  ipcMain.handle('settings:setApiKey', (_, key) => setApiKey(key))

  // App info + updates. Errors come back as { ok:false } rather than throwing,
  // so the launch check can fail silently (offline, host down) without noise.
  ipcMain.handle('app:getVersion', () => app.getVersion())
  ipcMain.handle('updates:check', async () => {
    try {
      return { ok: true, data: await checkForUpdate() }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })
  ipcMain.handle('updates:getFeed', () => ({
    feed: getUpdateFeed(DEFAULT_UPDATE_FEED),
    defaultFeed: DEFAULT_UPDATE_FEED
  }))
  ipcMain.handle('updates:setFeed', (_, url) => {
    if (!isAllowedFeed(String(url ?? ''))) {
      throw new Error('The update location must be an https:// address or a folder path.')
    }
    setUpdateFeed(url)
  })
  ipcMain.handle('updates:resetFeed', () => resetUpdateFeed())
  // Only ever opens the address the check itself produced (https URL or a
  // file path on a share) - never an arbitrary string from the page.
  ipcMain.handle('updates:openDownload', async () => {
    const result = await checkForUpdate()
    if (!result.downloadUrl) throw new Error('The update has no installer listed.')
    if (/^https?:\/\//i.test(result.downloadUrl)) {
      await shell.openExternal(result.downloadUrl)
    } else {
      const err = await shell.openPath(result.downloadUrl)
      if (err) throw new Error(err)
    }
  })

  // AI import
  ipcMain.handle('ai:importFromPhoto', async (_, imagePath) => {
    // Only the file just chosen in the dialog, and only once.
    if (!pendingRecipePhoto || imagePath !== pendingRecipePhoto) {
      return { ok: false, error: 'Please choose the photo again.' }
    }
    pendingRecipePhoto = null
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
