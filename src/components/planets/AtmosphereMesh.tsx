import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { type ShaderPreset, getTexturePath } from './types'
import { atmosphereVertexShader, atmosphereFragmentShader } from '../../shaders/planetShaders'

interface AtmosphereMeshProps {
  preset: ShaderPreset
  planetRadius: number
  starPosition: THREE.Vector3
  starColor: THREE.Color
}

const ATMOSPHERE_SCALE = 1.025

function createPlaceholderTexture(): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 2
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#4488ff'
  ctx.fillRect(0, 0, 2, 2)
  return new THREE.CanvasTexture(canvas)
}

const DEFAULT_ATMOSPHERE_COLOR: [number, number, number, number] = [0.4, 0.6, 1.0, 1.0]

const ATMOSPHERE_COLORS: Record<string, [number, number, number, number]> = {
  terrestrial: [0.4, 0.6, 1.0, 1.0],
  ocean: [0.3, 0.5, 0.9, 1.0],
  ice: [0.5, 0.7, 1.0, 1.0],
  lava: [1.0, 0.3, 0.1, 1.0],
  gasgiant: [0.6, 0.5, 0.4, 1.0],
  sandstorm: [0.8, 0.6, 0.3, 1.0],
  thunderstorm: [0.4, 0.4, 0.6, 1.0],
}

export function AtmosphereMesh({
  preset,
  planetRadius,
  starPosition,
  starColor,
}: AtmosphereMeshProps) {
  const placeholderTexture = useMemo(() => createPlaceholderTexture(), [])

  const texturePaths = useMemo(() => {
    const paths: string[] = []
    if (preset.textures.GroundScattering1) {
      paths.push(getTexturePath(preset.textures.GroundScattering1))
    }
    if (preset.textures.GroundScattering2) {
      paths.push(getTexturePath(preset.textures.GroundScattering2))
    }
    return paths.length > 0 ? paths : null
  }, [preset.textures])

  const textures = texturePaths ? useLoader(THREE.TextureLoader, texturePaths) : null

  const atmosphereColor = ATMOSPHERE_COLORS[preset.type] ?? DEFAULT_ATMOSPHERE_COLOR
  const scatteringFactors: [number, number, number, number] = [1.5, 1.0, 0.0, 0.0]

  const material = useMemo(() => {
    const scatterLight = textures?.[0] ?? placeholderTexture
    const scatterHue = textures?.[1] ?? textures?.[0] ?? placeholderTexture

    return new THREE.ShaderMaterial({
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      uniforms: {
        uScatterLight: { value: scatterLight },
        uScatterHue: { value: scatterHue },
        uStarPosition: { value: starPosition },
        uStarColor: { value: starColor },
        uAtmosphereColor: { value: new THREE.Vector4(atmosphereColor[0], atmosphereColor[1], atmosphereColor[2], atmosphereColor[3]) },
        uScatteringFactors: { value: new THREE.Vector4(scatteringFactors[0], scatteringFactors[1], scatteringFactors[2], scatteringFactors[3]) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    })
  }, [textures, starPosition, starColor, atmosphereColor, scatteringFactors, placeholderTexture])

  const atmosphereRadius = planetRadius * ATMOSPHERE_SCALE

  return (
    <mesh material={material}>
      <sphereGeometry args={[atmosphereRadius, 32, 32]} />
    </mesh>
  )
}
