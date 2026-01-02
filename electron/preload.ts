const { contextBridge, ipcRenderer } = require('electron')

const electronAPI = {
  refSystems3D: () => ipcRenderer.invoke('ref:systems-3d'),
  refStargates: () => ipcRenderer.invoke('ref:stargates'),
  onToggleEscapeMenu: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('toggle-escape-menu', handler)
    return () => ipcRenderer.removeListener('toggle-escape-menu', handler)
  },
  quitApp: () => ipcRenderer.send('quit-app'),
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
