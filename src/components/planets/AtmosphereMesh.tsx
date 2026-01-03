import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { type ShaderPreset, getTexturePath, getAtmosphereParams } from './types'
import atmosphereVertexShader from '../../shaders/planet/atmosphereVertex.glsl'
import atmosphereFragmentShader from '../../shaders/planet/atmosphereFragment.glsl'

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

  const params = getAtmosphereParams(preset)

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
        uAtmosphereFactors: { value: new THREE.Vector4(...params.atmosphereFactors) },
        uScatteringFactors: { value: new THREE.Vector4(...params.scatteringFactors) },
        uWavelengths: { value: new THREE.Vector3(...params.wavelengths) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    })
  }, [textures, starPosition, starColor, params, placeholderTexture])

  const atmosphereRadius = planetRadius * ATMOSPHERE_SCALE

  return (
    <mesh material={material}>
      <sphereGeometry args={[atmosphereRadius, 32, 32]} />
    </mesh>
  )
}
