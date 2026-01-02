const { contextBridge, ipcRenderer } = require('electron')

const electronAPI = {
  onToggleEscapeMenu: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('toggle-escape-menu', handler)
    return () => ipcRenderer.removeListener('toggle-escape-menu', handler)
  },
  quitApp: () => ipcRenderer.send('quit-app'),
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
