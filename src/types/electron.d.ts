import type { UniverseData, Stargate } from './universe'

type RefResult<T> = T | { error: string }

interface StargatesResponse {
  stargates: Stargate[]
}

interface ElectronAPI {
  refSystems3D: () => Promise<RefResult<UniverseData>>
  refStargates: () => Promise<RefResult<StargatesResponse>>
  onToggleEscapeMenu: (callback: () => void) => () => void
  quitApp: () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
