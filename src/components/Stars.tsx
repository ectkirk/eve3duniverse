import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import type { SolarSystem } from '../types/universe'
import { EVE_COORDINATE_SCALE, STAR_VISUALS } from '../constants'
import { starVertexShader, starFragmentShader } from '../shaders/starShader'

interface StarsProps {
  systems: SolarSystem[]
  colorMode: number
}

const SUN_RADIUS = 696_340_000

function radiusToSize(radius: number): number {
  const solarRadii = radius / SUN_RADIUS
  const logRadius = Math.log10(Math.max(0.01, solarRadii))
  const minLog = Math.log10(0.05)
  const maxLog = Math.log10(4.0)
  const t = Math.max(0, Math.min(1, (logRadius - minLog) / (maxLog - minLog)))
  return STAR_VISUALS.minSize + t * (STAR_VISUALS.maxSize - STAR_VISUALS.minSize)
}

export function Stars({ systems, colorMode }: StarsProps) {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null)

  const geometry = useMemo(() => {
    const positions = new Float32Array(systems.length * 3)
    const sizes = new Float32Array(systems.length)
    const temperatures = new Float32Array(systems.length)
    const securities = new Float32Array(systems.length)
    const luminosities = new Float32Array(systems.length)

    systems.forEach((system, i) => {
      const radius = system.star?.radius ?? SUN_RADIUS * 0.5
      const lum = system.star?.luminosity ?? STAR_VISUALS.defaultLum
      positions[i * 3] = system.position.x * EVE_COORDINATE_SCALE
      positions[i * 3 + 1] = system.position.y * EVE_COORDINATE_SCALE
      positions[i * 3 + 2] = system.position.z * EVE_COORDINATE_SCALE
      sizes[i] = radiusToSize(radius)
      temperatures[i] = system.star?.temperature ?? STAR_VISUALS.defaultTemp
      securities[i] = system.securityStatus
      luminosities[i] = lum
    })

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('temperature', new THREE.BufferAttribute(temperatures, 1))
    geo.setAttribute('security', new THREE.BufferAttribute(securities, 1))
    geo.setAttribute('luminosity', new THREE.BufferAttribute(luminosities, 1))

    return geo
  }, [systems])

  const material = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      uniforms: {
        colorMode: { value: colorMode },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    materialRef.current = mat
    return mat
  }, [systems, colorMode])

  useEffect(() => {
    if (materialRef.current?.uniforms?.colorMode) {
      materialRef.current.uniforms.colorMode.value = colorMode
    }
  }, [colorMode])

  return <points geometry={geometry} material={material} />
}
