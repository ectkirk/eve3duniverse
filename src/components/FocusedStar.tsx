import { useRef, useMemo, Suspense } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import type { SolarSystem, Planet, Star, Stargate } from '../types/universe'
import { STARGATE_MODELS, getStarTextures } from '../types/universe'

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

type PlanetCategory = 'gasgiant' | 'terrestrial' | 'ice' | 'lava' | 'oceanic' | 'barren' | 'storm' | 'plasma' | 'shattered'

interface PlanetTextureConfig {
  category: PlanetCategory
  diffuse?: string
  detail?: string
  gradient: string
  emissive?: string
  hasAtmosphere: boolean
  hasClouds: boolean
}

function getPlanetConfig(typeId: number): PlanetTextureConfig {
  switch (typeId) {
    case 11: return { category: 'terrestrial', diffuse: 'terrestrialdetail01_p', gradient: 'gradient_temperate', hasAtmosphere: true, hasClouds: true }
    case 12: return { category: 'ice', diffuse: 'icedetail01_p', gradient: 'gradient_ice', hasAtmosphere: true, hasClouds: false }
    case 13: return { category: 'gasgiant', diffuse: 'gasgiant01_d', detail: 'gasgiantdetail01_m', gradient: 'gradient_gasgiant', hasAtmosphere: true, hasClouds: false }
    case 2014: return { category: 'oceanic', diffuse: 'terrestrialdetail02_p', gradient: 'gradient_ocean', hasAtmosphere: true, hasClouds: true }
    case 2015: return { category: 'lava', diffuse: 'lavamagma01_p', gradient: 'gradient_lava', emissive: 'lavamagma02_p', hasAtmosphere: false, hasClouds: false }
    case 2016: return { category: 'barren', diffuse: 'terrestrialdetail01_p', gradient: 'gradient_barren', hasAtmosphere: false, hasClouds: false }
    case 2017: return { category: 'storm', diffuse: 'clouddense01_m', gradient: 'gradient_thunderstorm', hasAtmosphere: true, hasClouds: true }
    case 2063: return { category: 'plasma', diffuse: 'terrestrialdetail02_p', gradient: 'gradient_plasma', hasAtmosphere: true, hasClouds: false }
    case 30889: return { category: 'barren', diffuse: 'terrestrialdetail01_p', gradient: 'gradient_barren', hasAtmosphere: false, hasClouds: false }
    case 73911: return { category: 'lava', diffuse: 'lavamagma02_p', gradient: 'gradient_lava', emissive: 'lavamagma01_p', hasAtmosphere: false, hasClouds: false }
    default: return { category: 'barren', diffuse: 'terrestrialdetail01_p', gradient: 'gradient_barren', hasAtmosphere: false, hasClouds: false }
  }
}

function getTexturePath(category: PlanetCategory, filename: string): string {
  const categoryMap: Record<string, string> = {
    gasgiant: 'gasgiant',
    terrestrial: 'terrestrial',
    ice: 'ice',
    lava: 'lava',
    oceanic: 'terrestrial',
    barren: 'terrestrial',
    storm: 'terrestrial',
    plasma: 'terrestrial',
    shattered: 'shattered',
  }
  if (filename.startsWith('gradient_')) return `/models/planets/aurora/${filename}.png`
  return `/models/planets/${categoryMap[category]}/${filename}.png`
}

const starVertexShader = `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec2 vUv;

  void main() {
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const starFragmentShader = `
  uniform sampler2D uSurface;
  uniform sampler2D uRamp;
  uniform float uTime;
  uniform float uLuminosity;

  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec2 vUv;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float NdotV = max(dot(vWorldNormal, viewDir), 0.0);

    vec2 surfaceUv = vUv * 2.0 + vec2(uTime * 0.01, uTime * 0.005);
    vec4 surfaceDetail = texture2D(uSurface, surfaceUv);

    float rampCoord = NdotV * 0.8 + surfaceDetail.r * 0.2;
    vec3 starColor = texture2D(uRamp, vec2(rampCoord, 0.5)).rgb;

    float limbDarkening = 0.6 + 0.4 * NdotV;
    vec3 color = starColor * limbDarkening * (1.0 + surfaceDetail.r * 0.3);

    float brightnessMult = 1.0 + 0.3 * clamp(log(uLuminosity + 1.0), 0.0, 2.0);
    color *= brightnessMult;

    gl_FragColor = vec4(color, 1.0);
  }
`

const glowVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const glowFragmentShader = `
  uniform sampler2D uCoronaRamp;
  uniform float uLuminosity;
  uniform float uTime;

  varying vec2 vUv;

  void main() {
    vec2 center = vUv - 0.5;
    float dist = length(center) * 2.0;

    float rampCoord = 1.0 - smoothstep(0.0, 1.0, dist);
    vec3 coronaColor = texture2D(uCoronaRamp, vec2(rampCoord, 0.5)).rgb;

    float coreFalloff = 1.0 - smoothstep(0.0, 0.35, dist);
    float glowFalloff = exp(-dist * 2.5) * 0.6;
    float outerGlow = exp(-dist * 1.2) * 0.3;

    float glow = coreFalloff + glowFalloff + outerGlow;
    glow *= 1.0 - smoothstep(0.85, 1.0, dist);

    float intensity = 0.6 + 0.3 * clamp(log(uLuminosity + 1.0), 0.0, 1.5);
    float flicker = 1.0 + 0.015 * sin(uTime * 3.0);

    vec3 color = coronaColor * intensity * flicker;

    gl_FragColor = vec4(color, glow * intensity);
  }
`

const planetVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const planetFragmentShader = `
  uniform sampler2D uDiffuse;
  uniform sampler2D uGradient;
  uniform vec3 uAtmosphereColor;
  uniform float uAtmosphereIntensity;
  uniform float uEmissiveIntensity;
  uniform float uTime;
  uniform vec3 uStarPosition;
  uniform vec3 uStarColor;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 viewDir = normalize(-vPosition);
    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);

    vec2 uv = vUv;
    vec4 diffuse = texture2D(uDiffuse, uv);

    float gradientSample = dot(vNormal, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;
    vec3 gradientColor = texture2D(uGradient, vec2(gradientSample, 0.5)).rgb;

    vec3 baseColor = diffuse.rgb * gradientColor * 1.5;

    vec3 atmosphere = uAtmosphereColor * fresnel * uAtmosphereIntensity;

    vec3 emissive = diffuse.rgb * uEmissiveIntensity * (0.8 + 0.2 * sin(uTime * 2.0));

    vec3 lightDir = normalize(uStarPosition - vWorldPosition);
    float NdotL = max(dot(normalize(vWorldNormal), lightDir), 0.0);
    float shadow = 0.15 + 0.85 * NdotL;

    vec3 litColor = baseColor * shadow * uStarColor;

    gl_FragColor = vec4(litColor + atmosphere + emissive, 1.0);
  }
`

const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const atmosphereFragmentShader = `
  uniform vec3 uColor;
  uniform float uIntensity;

  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 viewDir = normalize(-vPosition);
    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.5);
    float alpha = fresnel * uIntensity;
    gl_FragColor = vec4(uColor, alpha * 0.6);
  }
`

interface OrbitParams {
  semiMajor: number
  semiMinor: number
  inclination: number
  longitudeOfAscending: number
}

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

const ATMOSPHERE_COLORS: Record<PlanetCategory, THREE.Color> = {
  gasgiant: new THREE.Color(0.8, 0.7, 0.5),
  terrestrial: new THREE.Color(0.5, 0.7, 1.0),
  ice: new THREE.Color(0.7, 0.9, 1.0),
  lava: new THREE.Color(1.0, 0.3, 0.1),
  oceanic: new THREE.Color(0.3, 0.6, 1.0),
  barren: new THREE.Color(0.6, 0.5, 0.4),
  storm: new THREE.Color(0.5, 0.4, 0.7),
  plasma: new THREE.Color(0.8, 0.3, 1.0),
  shattered: new THREE.Color(0.5, 0.5, 0.5),
}

interface TexturedPlanetMeshProps {
  config: PlanetTextureConfig
  scaledRadius: number
  starPosition: THREE.Vector3
  starColor: THREE.Color
}

function TexturedPlanetMesh({ config, scaledRadius, starPosition, starColor }: TexturedPlanetMeshProps) {
  const diffusePath = config.diffuse ? getTexturePath(config.category, config.diffuse) : null
  const gradientPath = getTexturePath(config.category, config.gradient)

  const defaultTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 2
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#888888'
    ctx.fillRect(0, 0, 2, 2)
    return new THREE.CanvasTexture(canvas)
  }, [])

  const diffuse = useLoader(
    THREE.TextureLoader,
    diffusePath || '/models/planets/aurora/gradient_barren.png'
  )
  const gradient = useLoader(THREE.TextureLoader, gradientPath)

  const atmosphereColor = ATMOSPHERE_COLORS[config.category]
  const isLava = config.category === 'lava'
  const isPlasma = config.category === 'plasma'

  const material = useMemo(() => {
    const tex = diffusePath ? diffuse : defaultTexture
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping

    return new THREE.ShaderMaterial({
      vertexShader: planetVertexShader,
      fragmentShader: planetFragmentShader,
      uniforms: {
        uDiffuse: { value: tex },
        uGradient: { value: gradient },
        uAtmosphereColor: { value: atmosphereColor },
        uAtmosphereIntensity: { value: config.hasAtmosphere ? 0.4 : 0.0 },
        uEmissiveIntensity: { value: isLava || isPlasma ? 0.8 : 0.0 },
        uTime: { value: 0 },
        uStarPosition: { value: starPosition },
        uStarColor: { value: starColor },
      },
    })
  }, [diffuse, gradient, atmosphereColor, config.hasAtmosphere, isLava, isPlasma, diffusePath, defaultTexture, starPosition, starColor])

  const atmosphereMaterial = useMemo(() => {
    if (!config.hasAtmosphere) return null
    return new THREE.ShaderMaterial({
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      uniforms: {
        uColor: { value: atmosphereColor },
        uIntensity: { value: 1.0 },
      },
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [config.hasAtmosphere, atmosphereColor])

  useFrame(({ clock }) => {
    if (material.uniforms.uTime) {
      material.uniforms.uTime.value = clock.elapsedTime
    }
  })

  return (
    <>
      <mesh material={material}>
        <sphereGeometry args={[scaledRadius, 32, 32]} />
      </mesh>
      {atmosphereMaterial && (
        <mesh material={atmosphereMaterial}>
          <sphereGeometry args={[scaledRadius * 1.05, 32, 32]} />
        </mesh>
      )}
    </>
  )
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
          <TexturedPlanetMesh config={config} scaledRadius={scaledRadius} starPosition={starPosition} starColor={starColor} />
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
