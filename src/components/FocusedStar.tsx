import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import * as THREE from 'three'
import type { SolarSystem, Planet, Star } from '../types/universe'

interface FocusedStarProps {
  system: SolarSystem
  position: THREE.Vector3
}

const SUN_RADIUS = 696340000
const SUN_LUMINOSITY = 1.0
const SCENE_STAR_RADIUS = 0.08
const ORBIT_VISUAL_SCALE = 3e-12

function spectralClassToColor(spectralClass: string, temperature: number): THREE.Color {
  const classLetter = spectralClass.charAt(0).toUpperCase()

  switch (classLetter) {
    case 'O': return new THREE.Color(0.6, 0.7, 1.0)
    case 'B': return new THREE.Color(0.7, 0.8, 1.0)
    case 'A': return new THREE.Color(0.9, 0.92, 1.0)
    case 'F': return new THREE.Color(1.0, 0.98, 0.9)
    case 'G': return new THREE.Color(1.0, 0.95, 0.7)
    case 'K': return new THREE.Color(1.0, 0.8, 0.5)
    case 'M': return new THREE.Color(1.0, 0.5, 0.3)
    default: {
      const t = Math.max(2000, Math.min(40000, temperature))
      let r, g, b
      if (t < 6600) {
        r = 1
        g = Math.max(0, Math.min(1, 0.39 * Math.log(t / 100) - 0.634))
        b = t < 2000 ? 0 : Math.max(0, Math.min(1, 0.543 * Math.log(t / 100 - 10) - 1.186))
      } else {
        r = Math.max(0, Math.min(1, 1.29 * Math.pow(t / 100 - 60, -0.133)))
        g = Math.max(0, Math.min(1, 1.13 * Math.pow(t / 100 - 60, -0.0755)))
        b = 1
      }
      return new THREE.Color(r, g, b)
    }
  }
}

function getStarProperties(star: Star | null) {
  const defaults = {
    radius: SUN_RADIUS,
    temperature: 5778,
    luminosity: SUN_LUMINOSITY,
    spectralClass: 'G2 V',
  }

  if (!star) return defaults

  return {
    radius: star.radius || defaults.radius,
    temperature: star.temperature || defaults.temperature,
    luminosity: star.luminosity || defaults.luminosity,
    spectralClass: star.spectralClass || defaults.spectralClass,
  }
}

function getPlanetAppearance(typeId: number): { color: THREE.Color; emissive?: THREE.Color } {
  switch (typeId) {
    case 11: return { color: new THREE.Color(0.2, 0.5, 0.3) }
    case 12: return { color: new THREE.Color(0.85, 0.92, 1.0) }
    case 13: return { color: new THREE.Color(0.8, 0.7, 0.5) }
    case 2014: return { color: new THREE.Color(0.1, 0.3, 0.7) }
    case 2015: return { color: new THREE.Color(0.3, 0.1, 0.05), emissive: new THREE.Color(1, 0.3, 0.1) }
    case 2016: return { color: new THREE.Color(0.5, 0.45, 0.4) }
    case 2017: return { color: new THREE.Color(0.3, 0.25, 0.4) }
    case 2063: return { color: new THREE.Color(0.4, 0.1, 0.5), emissive: new THREE.Color(0.8, 0.2, 1.0) }
    case 30889: return { color: new THREE.Color(0.35, 0.3, 0.25) }
    case 73911: return { color: new THREE.Color(0.3, 0.15, 0.1), emissive: new THREE.Color(0.6, 0.2, 0.1) }
    default: return { color: new THREE.Color(0.5, 0.5, 0.5) }
  }
}

const starVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const starFragmentShader = `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uTemperature;
  uniform float uLuminosity;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p, int octaves) {
    float f = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 6; i++) {
      if (i >= octaves) break;
      f += amp * noise(p);
      p *= 2.01;
      amp *= 0.5;
    }
    return f;
  }

  void main() {
    vec3 viewDir = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 2.5);

    // Limb darkening - stronger for cooler stars
    float limbFactor = mix(0.4, 0.7, clamp((uTemperature - 3000.0) / 7000.0, 0.0, 1.0));
    float limbDarkening = 1.0 - fresnel * limbFactor;

    // Surface granulation - more prominent on cooler stars
    float granulationStrength = mix(0.25, 0.08, clamp((uTemperature - 3000.0) / 7000.0, 0.0, 1.0));
    vec2 noiseCoord = vUv * 12.0 + uTime * 0.015;
    float surface = fbm(noiseCoord, 5) * granulationStrength;

    // Sunspots for cooler stars
    float spotStrength = mix(0.15, 0.0, clamp((uTemperature - 4000.0) / 3000.0, 0.0, 1.0));
    vec2 spotCoord = vUv * 4.0 + uTime * 0.002;
    float spots = smoothstep(0.55, 0.65, fbm(spotCoord, 3)) * spotStrength;

    // Base color with surface detail
    vec3 color = uColor * limbDarkening * (1.0 + surface - spots);

    // Edge glow - intensity based on luminosity
    float glowIntensity = 0.2 + 0.3 * clamp(log(uLuminosity + 1.0), 0.0, 1.0);
    color += uColor * fresnel * glowIntensity;

    // Boost brightness for high luminosity stars
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
  uniform vec3 uColor;
  uniform float uLuminosity;
  uniform float uTime;

  varying vec2 vUv;

  void main() {
    vec2 center = vUv - 0.5;
    float dist = length(center) * 2.0;

    float coreFalloff = 1.0 - smoothstep(0.0, 0.35, dist);
    float glowFalloff = exp(-dist * 2.5) * 0.6;
    float outerGlow = exp(-dist * 1.2) * 0.3;

    float glow = coreFalloff + glowFalloff + outerGlow;
    glow *= 1.0 - smoothstep(0.8, 1.0, dist);

    float intensity = 0.6 + 0.3 * clamp(log(uLuminosity + 1.0), 0.0, 1.5);
    float flicker = 1.0 + 0.015 * sin(uTime * 3.0);

    vec3 color = uColor * intensity * flicker;

    gl_FragColor = vec4(color, glow * intensity);
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

function OrbitingPlanet({ planet, starRadius }: { planet: Planet; starRadius: number }) {
  const meshRef = useRef<THREE.Mesh>(null)

  const planetRadiusRatio = planet.radius / starRadius
  const scaledRadius = Math.max(0.003, Math.min(0.03, planetRadiusRatio * SCENE_STAR_RADIUS * 2))

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

  const appearance = useMemo(() => getPlanetAppearance(planet.typeId), [planet.typeId])

  const emissiveIntensity = useMemo(() => {
    if (!appearance.emissive) return 0
    const tempFactor = Math.max(0, (planet.temperature - 400) / 1500)
    return Math.min(1.5, 0.3 + tempFactor)
  }, [appearance.emissive, planet.temperature])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const period = Math.max(30, planet.orbitPeriod * 1e-6)
    const angle = initialAngle + (clock.elapsedTime / period) * Math.PI * 2
    const { semiMajor, semiMinor, inclination, longitudeOfAscending } = orbitParams
    const x = Math.cos(angle) * semiMajor
    const z = Math.sin(angle) * semiMinor
    const cosInc = Math.cos(inclination)
    const sinInc = Math.sin(inclination)
    const cosLon = Math.cos(longitudeOfAscending)
    const sinLon = Math.sin(longitudeOfAscending)
    meshRef.current.position.x = x * cosLon - z * sinLon * cosInc
    meshRef.current.position.y = z * sinInc
    meshRef.current.position.z = x * sinLon + z * cosLon * cosInc
  })

  return (
    <>
      <OrbitRing orbit={orbitParams} />
      <mesh ref={meshRef}>
        <sphereGeometry args={[scaledRadius, 24, 24]} />
        <meshStandardMaterial
          color={appearance.color}
          emissive={appearance.emissive ?? new THREE.Color(0, 0, 0)}
          emissiveIntensity={emissiveIntensity}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
    </>
  )
}

export function FocusedStar({ system, position }: FocusedStarProps) {
  const starProps = useMemo(() => getStarProperties(system.star), [system.star])

  const starColor = useMemo(
    () => spectralClassToColor(starProps.spectralClass, starProps.temperature),
    [starProps.spectralClass, starProps.temperature]
  )

  const starMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      uniforms: {
        uColor: { value: starColor },
        uTime: { value: 0 },
        uTemperature: { value: starProps.temperature },
        uLuminosity: { value: starProps.luminosity },
      },
    })
  }, [starColor, starProps.temperature, starProps.luminosity])

  const glowMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: glowVertexShader,
      fragmentShader: glowFragmentShader,
      uniforms: {
        uColor: { value: starColor },
        uLuminosity: { value: starProps.luminosity },
        uTime: { value: 0 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [starColor, starProps.luminosity])

  const starRadius = useMemo(() => {
    const solarRadii = starProps.radius / SUN_RADIUS
    return Math.max(0.04, Math.min(0.25, solarRadii * SCENE_STAR_RADIUS))
  }, [starProps.radius])

  const glowScale = useMemo(() => {
    const lumFactor = 1.0 + 0.15 * Math.log(starProps.luminosity + 1)
    return Math.min(4.0, 2.5 * lumFactor)
  }, [starProps.luminosity])

  useFrame(({ clock }) => {
    if (starMaterial.uniforms.uTime) starMaterial.uniforms.uTime.value = clock.elapsedTime
    if (glowMaterial.uniforms.uTime) glowMaterial.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <group position={position}>
      <ambientLight intensity={0.1} />
      <pointLight
        position={[0, 0, 0]}
        intensity={1.5 + starProps.luminosity * 0.5}
        color={starColor}
        distance={10}
      />

      <mesh material={starMaterial}>
        <sphereGeometry args={[starRadius, 64, 64]} />
      </mesh>

      <Billboard>
        <mesh material={glowMaterial}>
          <planeGeometry args={[starRadius * glowScale, starRadius * glowScale]} />
        </mesh>
      </Billboard>

      {system.planets.slice(0, 8).map((planet) => (
        <OrbitingPlanet key={planet.id} planet={planet} starRadius={starProps.radius} />
      ))}
    </group>
  )
}
