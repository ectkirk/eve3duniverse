import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { useUniverseData } from './hooks/useUniverseData'
import { PLANET_TYPES } from './types/universe'
import { Stars } from './components/Stars'
import { RegionLabels, ccpRound } from './components/RegionLabels'
import { CameraController } from './components/CameraController'
import { PostProcessing } from './components/PostProcessing'
import { FocusSystem, type FocusInfo } from './components/FocusSystem'
import { FocusedStar } from './components/FocusedStar'
import * as styles from './styles'

export function App() {
  const { systems, regions, constellations, stargatesBySystem, loading, error } = useUniverseData()
  const [focusInfo, setFocusInfo] = useState<FocusInfo>({ state: 'normal', target: null, dwellProgress: 0 })
  const [showEscapeMenu, setShowEscapeMenu] = useState(false)
  const [colorMode, setColorMode] = useState(0)
  const [showLabels, setShowLabels] = useState(true)
  const [showOrbits, setShowOrbits] = useState(false)
  const [showOrbitLines, setShowOrbitLines] = useState(false)
  const [focusedBodyId, setFocusedBodyId] = useState<string | null>(null)
  const bodyPositionsRef = useRef<Record<string, THREE.Vector3>>({})

  const handleOrbitExit = useCallback(() => {
    setFocusInfo({ state: 'normal', target: null, dwellProgress: 0 })
    setFocusedBodyId(null)
    bodyPositionsRef.current = {}
  }, [])

  const orbitTarget = useMemo(() => {
    if (focusInfo.state === 'locked' && focusInfo.target) {
      const systemPos = focusInfo.target.scenePosition
      const system = focusInfo.target.system
      const star = system.star
      const starRadius = star ? Math.max(0.04, Math.min(0.25, (star.radius / 696340000) * 0.08)) : 0.08

      return {
        getPosition: () => {
          if (focusedBodyId && bodyPositionsRef.current[focusedBodyId]) {
            return systemPos.clone().add(bodyPositionsRef.current[focusedBodyId])
          }
          return systemPos
        },
        getRadius: () => {
          if (!focusedBodyId || focusedBodyId === 'star') {
            return starRadius
          }
          if (focusedBodyId.startsWith('planet-')) {
            const planetId = parseInt(focusedBodyId.replace('planet-', ''), 10)
            const planet = system.planets.find((p) => p.id === planetId)
            if (planet && star) {
              const planetRadiusRatio = planet.radius / star.radius
              return Math.max(0.003, Math.min(0.03, planetRadiusRatio * 0.08 * 2))
            }
            return 0.01
          }
          if (focusedBodyId.startsWith('stargate-')) {
            return 0.005
          }
          return 0.01
        },
        onExit: handleOrbitExit,
      }
    }
    return null
  }, [focusInfo.state, focusInfo.target, focusedBodyId, handleOrbitExit])

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
            stargates={stargatesBySystem.get(focusInfo.target.system.id) ?? []}
            showOrbits={showOrbits}
            showOrbitLines={showOrbitLines}
            bodyPositionsRef={bodyPositionsRef}
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
        <div style={styles.systemControlPanel}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>{focusInfo.target.system.name}</div>
            <div style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>{focusInfo.target.region.name}</div>
            <div style={{ fontSize: '13px', marginTop: '4px', color: (() => {
              const sec = ccpRound(focusInfo.target.system.securityStatus)
              if (sec >= 0.5) return '#5f5'
              if (sec > 0) return '#ff5'
              return '#f55'
            })() }}>
              {ccpRound(focusInfo.target.system.securityStatus).toFixed(1)}
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Display</div>
            <label style={styles.toggleRow}>
              <input
                type="checkbox"
                checked={showOrbits}
                onChange={(e) => setShowOrbits(e.target.checked)}
                style={styles.checkbox}
              />
              <span>Animate Orbits</span>
            </label>
            <label style={styles.toggleRow}>
              <input
                type="checkbox"
                checked={showOrbitLines}
                onChange={(e) => setShowOrbitLines(e.target.checked)}
                style={styles.checkbox}
              />
              <span>Orbit Lines</span>
            </label>

            <div style={{ fontSize: '12px', color: '#888', margin: '16px 0 12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Focus</div>
            <div style={styles.bodyList}>
              <div
                style={{ ...styles.bodyListItem, ...(focusedBodyId === null ? styles.bodyListItemActive : {}) }}
                onClick={() => setFocusedBodyId(null)}
              >
                ★ {focusInfo.target.system.star?.spectralClass || 'Star'}
              </div>
              {focusInfo.target.system.planets.slice(0, 8).map((planet) => (
                <div
                  key={planet.id}
                  style={{ ...styles.bodyListItem, ...(focusedBodyId === `planet-${planet.id}` ? styles.bodyListItemActive : {}) }}
                  onClick={() => setFocusedBodyId(`planet-${planet.id}`)}
                >
                  ● Planet {planet.celestialIndex}
                </div>
              ))}
              {(stargatesBySystem.get(focusInfo.target.system.id) ?? []).map((sg) => (
                <div
                  key={sg.id}
                  style={{ ...styles.bodyListItem, ...(focusedBodyId === `stargate-${sg.id}` ? styles.bodyListItemActive : {}) }}
                  onClick={() => setFocusedBodyId(`stargate-${sg.id}`)}
                >
                  ◇ Stargate
                </div>
              ))}
            </div>

            {focusedBodyId?.startsWith('planet-') && (() => {
              const planetId = parseInt(focusedBodyId.replace('planet-', ''), 10)
              const planet = focusInfo.target!.system.planets.find((p) => p.id === planetId)
              if (!planet) return null
              const planetType = PLANET_TYPES[planet.typeId] || 'unknown'
              return (
                <div style={{ marginTop: '16px', borderTop: '1px solid #333', paddingTop: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Details</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#888' }}>Type</span>
                      <span style={{ color: '#fff', textTransform: 'capitalize' }}>{planetType}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#888' }}>Radius</span>
                      <span style={{ color: '#fff' }}>{(planet.radius / 1000).toLocaleString()} km</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#888' }}>Temperature</span>
                      <span style={{ color: '#fff' }}>{Math.round(planet.temperature)} K</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#888' }}>Orbit</span>
                      <span style={{ color: '#fff' }}>{(planet.orbitRadius / 149597870.7).toFixed(2)} AU</span>
                    </div>
                    {planet.population && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#888' }}>Status</span>
                        <span style={{ color: '#5f5' }}>Populated</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}
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
