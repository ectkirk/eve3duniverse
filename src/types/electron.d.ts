interface ElectronAPI {
  onToggleEscapeMenu: (callback: () => void) => () => void
  quitApp: () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
