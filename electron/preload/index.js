import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

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
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
