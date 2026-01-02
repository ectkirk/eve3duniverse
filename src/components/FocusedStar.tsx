import { useRef, useMemo, Suspense } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import type { SolarSystem, Planet, Star, Stargate } from '../types/universe'
import { STARGATE_MODELS, getStarTextures } from '../types/universe'
import { PlanetMesh, getPlanetConfig, type OrbitParams } from './planets'
import {
  starVertexShader,
  starFragmentShader,
  glowVertexShader,
  glowFragmentShader,
} from '../shaders/planetShaders'

interface FocusedStarProps {
  system: SolarSystem
  position: THREE.Vector3
  stargates: Stargate[]
  showOrbits: boolean
  showOrbitLines: boolean
  bodyPositionsRef: React.MutableRefObject<Record<string, THREE.Vector3>>
}

const SCENE_BASE_RADIUS = 0.08
const ORBIT_VISUAL_SCALE = 3e-12

function OrbitRing({ orbit }: { orbit: OrbitParams }) {
  const lineRef = useRef<THREE.Line>(null)

  const geometry = useMemo(() => {
    const segments = 64
    const pts = []
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      const x = Math.cos(angle) * orbit.semiMajor
      const z = Math.sin(angle) * orbit.semiMinor
      const cosInc = Math.cos(orbit.inclination)
      const sinInc = Math.sin(orbit.inclination)
      const cosLon = Math.cos(orbit.longitudeOfAscending)
      const sinLon = Math.sin(orbit.longitudeOfAscending)
      const rotX = x * cosLon - z * sinLon * cosInc
      const rotY = z * sinInc
      const rotZ = x * sinLon + z * cosLon * cosInc
      pts.push(new THREE.Vector3(rotX, rotY, rotZ))
    }
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [orbit])

  const material = useMemo(
    () => new THREE.LineBasicMaterial({ color: 0x333344, transparent: true, opacity: 0.3 }),
    []
  )

  return <primitive ref={lineRef} object={new THREE.Line(geometry, material)} />
}

interface OrbitingPlanetProps {
  planet: Planet
  starRadius: number
  showOrbits: boolean
  showOrbitLines: boolean
  bodyPositionsRef: React.MutableRefObject<Record<string, THREE.Vector3>>
  starPosition: THREE.Vector3
  starColor: THREE.Color
}

function OrbitingPlanet({ planet, starRadius, showOrbits, showOrbitLines, bodyPositionsRef, starPosition, starColor }: OrbitingPlanetProps) {
  const groupRef = useRef<THREE.Group>(null)

  const planetRadiusRatio = planet.radius / starRadius
  const scaledRadius = Math.max(0.003, Math.min(0.03, planetRadiusRatio * SCENE_BASE_RADIUS * 2))

  const orbitParams = useMemo((): OrbitParams => {
    const semiMajor = planet.orbitRadius * ORBIT_VISUAL_SCALE
    const semiMinor = semiMajor * Math.sqrt(1 - planet.eccentricity * planet.eccentricity)
    const pos = planet.position
    const horizontalDist = Math.sqrt(pos.x * pos.x + pos.z * pos.z)
    const inclination = Math.atan2(pos.y, horizontalDist)
    const longitudeOfAscending = Math.atan2(-pos.x, pos.z)
    return { semiMajor, semiMinor, inclination, longitudeOfAscending }
  }, [planet.orbitRadius, planet.eccentricity, planet.position])

  const initialAngle = useMemo(() => {
    const pos = planet.position
    return Math.atan2(-pos.x, pos.z)
  }, [planet.position])

  const initialPosition = useMemo(() => {
    const { semiMajor, semiMinor, inclination, longitudeOfAscending } = orbitParams
    const x = Math.cos(initialAngle) * semiMajor
    const z = Math.sin(initialAngle) * semiMinor
    const cosInc = Math.cos(inclination)
    const sinInc = Math.sin(inclination)
    const cosLon = Math.cos(longitudeOfAscending)
    const sinLon = Math.sin(longitudeOfAscending)
    return new THREE.Vector3(
      x * cosLon - z * sinLon * cosInc,
      z * sinInc,
      x * sinLon + z * cosLon * cosInc
    )
  }, [orbitParams, initialAngle])

  const config = useMemo(() => getPlanetConfig(planet.typeId), [planet.typeId])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    if (!showOrbits) {
      groupRef.current.position.copy(initialPosition)
      bodyPositionsRef.current[`planet-${planet.id}`] = initialPosition.clone()
      return
    }
    const period = Math.max(30, planet.orbitPeriod * 1e-6)
    const angle = initialAngle + (clock.elapsedTime / period) * Math.PI * 2
    const { semiMajor, semiMinor, inclination, longitudeOfAscending } = orbitParams
    const x = Math.cos(angle) * semiMajor
    const z = Math.sin(angle) * semiMinor
    const cosInc = Math.cos(inclination)
    const sinInc = Math.sin(inclination)
    const cosLon = Math.cos(longitudeOfAscending)
    const sinLon = Math.sin(longitudeOfAscending)
    groupRef.current.position.x = x * cosLon - z * sinLon * cosInc
    groupRef.current.position.y = z * sinInc
    groupRef.current.position.z = x * sinLon + z * cosLon * cosInc
    bodyPositionsRef.current[`planet-${planet.id}`] = groupRef.current.position.clone()
  })

  return (
    <>
      {showOrbitLines && <OrbitRing orbit={orbitParams} />}
      <group ref={groupRef}>
        <Suspense fallback={
          <mesh>
            <sphereGeometry args={[scaledRadius, 16, 16]} />
            <meshBasicMaterial color={0x444444} />
          </mesh>
        }>
          <PlanetMesh config={config} scaledRadius={scaledRadius} starPosition={starPosition} starColor={starColor} />
        </Suspense>
      </group>
    </>
  )
}

const DEFAULT_STARGATE_MODEL = 'asg'
const STARGATE_MODEL_SCALE = 0.00002

function StargateModel({ stargate }: { stargate: Stargate }) {
  const modelCode = STARGATE_MODELS[stargate.typeId] || DEFAULT_STARGATE_MODEL
  const basePath = `/models/stargates/${modelCode}`

  const obj = useLoader(OBJLoader, `${basePath}.obj`)
  const [albedo, normal, roughness, metalness, glow] = useLoader(THREE.TextureLoader, [
    `${basePath}_albedo.png`,
    `${basePath}_normal.png`,
    `${basePath}_roughness.png`,
    `${basePath}_metalness.png`,
    `${basePath}_glow.png`,
  ])

  const cloned = useMemo(() => {
    const c = obj.clone()
    c.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.computeVertexNormals()
        child.material = new THREE.MeshStandardMaterial({
          map: albedo,
          normalMap: normal,
          roughnessMap: roughness,
          metalnessMap: metalness,
          emissiveMap: glow,
          emissive: new THREE.Color(0xffffff),
          emissiveIntensity: 0.5,
          side: THREE.DoubleSide,
          metalness: 1.0,
          roughness: 1.0,
        })
      }
    })
    return c
  }, [obj, albedo, normal, roughness, metalness, glow])

  const scenePosition = useMemo(() => {
    return new THREE.Vector3(
      stargate.position.x * ORBIT_VISUAL_SCALE,
      stargate.position.y * ORBIT_VISUAL_SCALE,
      stargate.position.z * ORBIT_VISUAL_SCALE
    )
  }, [stargate.position])

  return (
    <primitive
      object={cloned}
      position={scenePosition}
      scale={[STARGATE_MODEL_SCALE, STARGATE_MODEL_SCALE, STARGATE_MODEL_SCALE]}
    />
  )
}

function TexturedStar({ star, luminosity }: { star: Star; luminosity: number }) {
  const textures = useMemo(() => getStarTextures(star.spectralClass), [star.spectralClass])

  const [surfaceTexture, rampTexture, coronaTexture] = useLoader(THREE.TextureLoader, [
    '/models/stars/sunsurface_01a.png',
    `/models/stars/${textures.ramp}.png`,
    `/models/stars/${textures.corona}.png`,
  ])

  useMemo(() => {
    if (surfaceTexture) {
      surfaceTexture.wrapS = surfaceTexture.wrapT = THREE.RepeatWrapping
    }
  }, [surfaceTexture])

  const starMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      uniforms: {
        uSurface: { value: surfaceTexture },
        uRamp: { value: rampTexture },
        uTime: { value: 0 },
        uLuminosity: { value: luminosity },
      },
    })
  }, [surfaceTexture, rampTexture, luminosity])

  const glowMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: glowVertexShader,
      fragmentShader: glowFragmentShader,
      uniforms: {
        uCoronaRamp: { value: coronaTexture },
        uLuminosity: { value: luminosity },
        uTime: { value: 0 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [coronaTexture, luminosity])

  const starRadius = useMemo(() => {
    const radiusRatio = star.radius / 696340000
    return Math.max(0.04, Math.min(0.25, radiusRatio * SCENE_BASE_RADIUS))
  }, [star.radius])

  const glowScale = useMemo(() => {
    const lumFactor = 1.0 + 0.15 * Math.log(luminosity + 1)
    return Math.min(4.0, 2.5 * lumFactor)
  }, [luminosity])

  const rampColor = useMemo(() => {
    if (!rampTexture?.image) return new THREE.Color(1, 0.9, 0.7)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      const ctx = canvas.getContext('2d')
      if (!ctx) return new THREE.Color(1, 0.9, 0.7)
      ctx.drawImage(rampTexture.image, 128, 0, 1, 1, 0, 0, 1, 1)
      const pixel = ctx.getImageData(0, 0, 1, 1).data
      return new THREE.Color((pixel[0] ?? 255) / 255, (pixel[1] ?? 230) / 255, (pixel[2] ?? 180) / 255)
    } catch {
      return new THREE.Color(1, 0.9, 0.7)
    }
  }, [rampTexture])

  useFrame(({ clock }) => {
    if (starMaterial.uniforms.uTime) starMaterial.uniforms.uTime.value = clock.elapsedTime
    if (glowMaterial.uniforms.uTime) glowMaterial.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <>
      <pointLight position={[0, 0, 0]} intensity={1.5 + luminosity * 0.5} color={rampColor} distance={10} />
      <mesh material={starMaterial}>
        <sphereGeometry args={[starRadius, 64, 64]} />
      </mesh>
      <Billboard>
        <mesh material={glowMaterial}>
          <planeGeometry args={[starRadius * glowScale, starRadius * glowScale]} />
        </mesh>
      </Billboard>
    </>
  )
}

function getStarColorFromSpectralClass(spectralClass: string): THREE.Color {
  const letter = spectralClass.charAt(0).toUpperCase()
  switch (letter) {
    case 'O': return new THREE.Color(0.6, 0.7, 1.0)
    case 'B': return new THREE.Color(0.7, 0.8, 1.0)
    case 'A': return new THREE.Color(0.9, 0.92, 1.0)
    case 'F': return new THREE.Color(1.0, 0.98, 0.9)
    case 'G': return new THREE.Color(1.0, 0.95, 0.7)
    case 'K': return new THREE.Color(1.0, 0.8, 0.5)
    case 'M': return new THREE.Color(1.0, 0.5, 0.3)
    default: return new THREE.Color(1.0, 0.9, 0.7)
  }
}

export function FocusedStar({ system, position, stargates, showOrbits, showOrbitLines, bodyPositionsRef }: FocusedStarProps) {
  const star = system.star
  const luminosity = star?.luminosity ?? 1
  const starRadius = star?.radius ?? 696340000

  const starWorldPosition = useMemo(() => position.clone(), [position])
  const starColor = useMemo(
    () => getStarColorFromSpectralClass(star?.spectralClass ?? 'G'),
    [star?.spectralClass]
  )

  useMemo(() => {
    bodyPositionsRef.current['star'] = new THREE.Vector3(0, 0, 0)
    stargates.forEach((sg) => {
      bodyPositionsRef.current[`stargate-${sg.id}`] = new THREE.Vector3(
        sg.position.x * ORBIT_VISUAL_SCALE,
        sg.position.y * ORBIT_VISUAL_SCALE,
        sg.position.z * ORBIT_VISUAL_SCALE
      )
    })
  }, [stargates, bodyPositionsRef])

  return (
    <group position={position}>
      <ambientLight intensity={0.1} />

      {star && (
        <Suspense fallback={
          <mesh>
            <sphereGeometry args={[SCENE_BASE_RADIUS, 32, 32]} />
            <meshBasicMaterial color={0xffaa00} />
          </mesh>
        }>
          <TexturedStar star={star} luminosity={luminosity} />
        </Suspense>
      )}

      {system.planets.slice(0, 8).map((planet) => (
        <OrbitingPlanet
          key={planet.id}
          planet={planet}
          starRadius={starRadius}
          showOrbits={showOrbits}
          showOrbitLines={showOrbitLines}
          bodyPositionsRef={bodyPositionsRef}
          starPosition={starWorldPosition}
          starColor={starColor}
        />
      ))}

      <Suspense fallback={null}>
        {stargates.map((sg) => (
          <StargateModel key={sg.id} stargate={sg} />
        ))}
      </Suspense>
    </group>
  )
}
