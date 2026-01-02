import { useEffect, useState, useCallback, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { useUniverseData } from './hooks/useUniverseData'
import { Stars } from './components/Stars'
import { RegionLabels } from './components/RegionLabels'
import { CameraController } from './components/CameraController'
import { PostProcessing } from './components/PostProcessing'
import { FocusSystem, type FocusInfo } from './components/FocusSystem'
import { FocusedStar } from './components/FocusedStar'
import * as styles from './styles'

export function App() {
  const { systems, regions, constellations, loading, error } = useUniverseData()
  const [focusInfo, setFocusInfo] = useState<FocusInfo>({ state: 'normal', target: null, dwellProgress: 0 })
  const [showEscapeMenu, setShowEscapeMenu] = useState(false)
  const [colorMode, setColorMode] = useState(0)
  const [showLabels, setShowLabels] = useState(true)

  const handleOrbitExit = useCallback(() => {
    setFocusInfo({ state: 'normal', target: null, dwellProgress: 0 })
  }, [])

  const orbitTarget = useMemo(() => {
    if (focusInfo.state === 'locked' && focusInfo.target) {
      return {
        position: focusInfo.target.scenePosition,
        onExit: handleOrbitExit,
      }
    }
    return null
  }, [focusInfo.state, focusInfo.target, handleOrbitExit])

  useEffect(() => {
    return window.electronAPI.onToggleEscapeMenu(() => {
      setShowEscapeMenu((prev) => !prev)
    })
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.key === '1') setColorMode(0)
      else if (e.key === '2') setColorMode(1)
      else if (e.key === '3') setColorMode(2)
      else if (e.key.toLowerCase() === 'l') setShowLabels((prev) => !prev)
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
        <CameraController orbitTarget={orbitTarget} />
        {systems.length > 0 && (
          <>
            <Stars systems={systems} regions={regions} colorMode={colorMode} />
            <FocusSystem
              systems={systems}
              regions={regions}
              constellations={constellations}
              onFocusChange={setFocusInfo}
              enabled={focusInfo.state !== 'locked'}
            />
          </>
        )}
        {showLabels && <RegionLabels regions={regions} systems={systems} colorMode={colorMode} />}
        {focusInfo.state === 'locked' && focusInfo.target && (
          <FocusedStar
            system={focusInfo.target.system}
            position={focusInfo.target.scenePosition}
          />
        )}
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
          <div>Color: {['Star Type', 'Security', 'Region'][colorMode]}</div>
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
            WASD: move | Mouse: look | 1/2/3: color | L: labels | ESC: menu
          </div>
        </div>
      )}

      {focusInfo.state === 'dwelling' && focusInfo.target && (
        <div style={{ ...styles.centered, pointerEvents: 'none' }}>
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r="35"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="2"
            />
            <circle
              cx="40"
              cy="40"
              r="35"
              fill="none"
              stroke="rgba(100,200,255,0.8)"
              strokeWidth="2"
              strokeDasharray={`${focusInfo.dwellProgress * 220} 220`}
              strokeLinecap="round"
              transform="rotate(-90 40 40)"
            />
          </svg>
        </div>
      )}

      {focusInfo.state === 'locked' && focusInfo.target && (
        <div style={{ ...styles.centered, pointerEvents: 'none' }}>
          <div style={{ color: '#6cf', fontFamily: 'monospace', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{focusInfo.target.system.name}</div>
            <div style={{ fontSize: '14px', color: '#888', marginTop: '4px' }}>
              {focusInfo.target.region.name}
            </div>
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
