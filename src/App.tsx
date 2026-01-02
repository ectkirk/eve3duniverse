import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useUniverseData } from './hooks/useUniverseData'
import { Stars } from './components/Stars'
import { CameraController } from './components/CameraController'
import { PostProcessing } from './components/PostProcessing'
import * as styles from './styles'

export function App() {
  const { systems, loading, error } = useUniverseData()
  const [showEscapeMenu, setShowEscapeMenu] = useState(false)
  const [colorMode, setColorMode] = useState(0)

  useEffect(() => {
    return window.electronAPI.onToggleEscapeMenu(() => {
      setShowEscapeMenu((prev) => !prev)
    })
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'c' && !e.repeat) {
        setColorMode((prev) => (prev === 0 ? 1 : 0))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 100], fov: 75 }}
        style={{ width: '100%', height: '100%', background: '#000' }}
      >
        <CameraController />
        {systems.length > 0 && <Stars systems={systems} colorMode={colorMode} />}
        <PostProcessing />
      </Canvas>

      {loading && (
        <div style={{ ...styles.centered, color: '#fff', fontSize: '24px', fontFamily: 'sans-serif' }}>
          Loading universe data...
        </div>
      )}

      {error && (
        <div style={{ ...styles.centered, ...styles.panelBackground, color: '#f55', fontSize: '18px', fontFamily: 'sans-serif', textAlign: 'center' }}>
          <div>Error loading universe data</div>
          <div style={{ fontSize: '14px', marginTop: '10px', color: '#aaa' }}>{error}</div>
        </div>
      )}

      {!loading && !error && (
        <div style={{ ...styles.hudPanel, color: '#fff', fontSize: '14px', fontFamily: 'monospace' }}>
          <div>Systems: {systems.length.toLocaleString()}</div>
          <div>Color: {colorMode === 0 ? 'Star Temperature' : 'Security Status'}</div>
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
            WASD: move | Mouse: look | C: color | ESC: menu
          </div>
        </div>
      )}

      {showEscapeMenu && (
        <div style={{ ...styles.overlay, background: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
          <h1 style={{ color: '#fff', fontFamily: 'sans-serif', margin: 0 }}>EVE 3D Universe</h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button onClick={() => setShowEscapeMenu(false)} style={{ ...styles.button, background: '#333' }}>
              Resume
            </button>
            <button onClick={() => window.electronAPI.quitApp()} style={{ ...styles.button, background: '#500', borderColor: '#700' }}>
              Exit
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
