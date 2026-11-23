import { contextBridge, ipcRenderer } from 'electron'

// The page gets exactly these functions and nothing else - no raw
// ipcRenderer, no process info. Each maps to one handler in the main process.
const api = {
  recipe: {
    getAll: () => ipcRenderer.invoke('recipe:getAll'),
    getById: (id) => ipcRenderer.invoke('recipe:getById', id),
    create: (data) => ipcRenderer.invoke('recipe:create', data),
    update: (id, data) => ipcRenderer.invoke('recipe:update', id, data),
    delete: (id) => ipcRenderer.invoke('recipe:delete', id)
  },
  dialog: {
    openPhoto: () => ipcRenderer.invoke('dialog:openPhoto'),
    openRecipePhoto: () => ipcRenderer.invoke('dialog:openRecipePhoto')
  },
  settings: {
    getApiKey: () => ipcRenderer.invoke('settings:getApiKey'),
    setApiKey: (key) => ipcRenderer.invoke('settings:setApiKey', key)
  },
  ai: {
    importFromPhoto: (imagePath) => ipcRenderer.invoke('ai:importFromPhoto', imagePath)
  },
  print: {
    job: (options) => ipcRenderer.invoke('print:job', options)
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion')
  },
  updates: {
    check: () => ipcRenderer.invoke('updates:check'),
    getFeed: () => ipcRenderer.invoke('updates:getFeed'),
    setFeed: (url) => ipcRenderer.invoke('updates:setFeed', url),
    resetFeed: () => ipcRenderer.invoke('updates:resetFeed'),
    openDownload: () => ipcRenderer.invoke('updates:openDownload')
  }
}

contextBridge.exposeInMainWorld('api', api)
