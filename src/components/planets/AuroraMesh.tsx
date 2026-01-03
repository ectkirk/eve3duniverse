import { useMemo } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { type ShaderPreset } from './types'
import auroraVertexShader from '../../shaders/planet/auroraVertex.glsl'
import auroraFragmentShader from '../../shaders/planet/auroraFragment.glsl'

interface AuroraMeshProps {
  preset: ShaderPreset
  planetRadius: number
}

const AURORA_TEXTURE_BASE = '/models/planets/textures/aurora/'

function getAuroraGradient(presetType: string): string {
  const gradientMap: Record<string, string> = {
    gasgiant: 'gradient_gasgiant.webp',
    terrestrial: 'gradient_temperate.webp',
    ocean: 'gradient_ocean.webp',
    ice: 'gradient_ice.webp',
    lava: 'gradient_lava.webp',
    plasma: 'gradient_plasma.webp',
    thunderstorm: 'gradient_thunderstorm.webp',
    sandstorm: 'gradient_barren.webp',
    shattered: 'gradient_shattered.webp',
  }
  return AURORA_TEXTURE_BASE + (gradientMap[presetType] || 'gradient_temperate.webp')
}

export function AuroraMesh({ preset, planetRadius }: AuroraMeshProps) {
  const gradientPath = getAuroraGradient(preset.type)

  const [gradientTex, colorShapeTex, maskTex, noiseTex] = useLoader(THREE.TextureLoader, [
    gradientPath,
    AURORA_TEXTURE_BASE + 'colorshape.webp',
    AURORA_TEXTURE_BASE + 'caustics.webp',
    AURORA_TEXTURE_BASE + 'auroranoise.webp',
  ])

  useMemo(() => {
    ;[gradientTex, colorShapeTex, maskTex, noiseTex].forEach((tex) => {
      if (tex) {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping
      }
    })
  }, [gradientTex, colorShapeTex, maskTex, noiseTex])

  const params = preset.parameters

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: auroraVertexShader,
      fragmentShader: auroraFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uGeometry: {
          value: new THREE.Vector4(
            params?.Geometry?.[0] ?? 1.0,
            params?.Geometry?.[1] ?? 0.0,
            params?.Geometry?.[2] ?? 0.0,
            params?.Geometry?.[3] ?? 0.0
          ),
        },
        uGeometryDeformation: {
          value: new THREE.Vector4(
            params?.GeometryDeformation?.[0] ?? 0.02,
            params?.GeometryDeformation?.[1] ?? 0.003,
            params?.GeometryDeformation?.[2] ?? 0.0018,
            params?.GeometryDeformation?.[3] ?? 0.0
          ),
        },
        uGeometryAnimation: {
          value: new THREE.Vector4(
            params?.GeometryAnimation?.[0] ?? 32.0,
            params?.GeometryAnimation?.[1] ?? 0.001,
            params?.GeometryAnimation?.[2] ?? 0.0833,
            params?.GeometryAnimation?.[3] ?? 0.033
          ),
        },
        uColorParams: {
          value: new THREE.Vector4(
            params?.ColorParams?.[0] ?? 1.0,
            params?.ColorParams?.[1] ?? 0.0,
            params?.ColorParams?.[2] ?? 1.0,
            params?.ColorParams?.[3] ?? 0.0
          ),
        },
        uMaskParams0: {
          value: new THREE.Vector4(
            params?.MaskParams0?.[0] ?? 2.0,
            params?.MaskParams0?.[1] ?? 0.0,
            params?.MaskParams0?.[2] ?? 0.0,
            params?.MaskParams0?.[3] ?? 0.0
          ),
        },
        uMaskParams1: {
          value: new THREE.Vector4(
            params?.MaskParams1?.[0] ?? 1.0,
            params?.MaskParams1?.[1] ?? 0.1,
            params?.MaskParams1?.[2] ?? 0.0,
            params?.MaskParams1?.[3] ?? 0.0
          ),
        },
        uGradientMap: { value: gradientTex },
        uColorShapeMap: { value: colorShapeTex },
        uMaskMap: { value: maskTex },
        uNoiseMap: { value: noiseTex },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  }, [params, gradientTex, colorShapeTex, maskTex, noiseTex])

  useFrame(({ clock }) => {
    if (material.uniforms.uTime) {
      material.uniforms.uTime.value = clock.elapsedTime
    }
  })

  const auroraScale = planetRadius * 1.05

  return (
    <mesh material={material}>
      <sphereGeometry args={[auroraScale, 64, 32, 0, Math.PI * 2, 0, Math.PI * 0.4]} />
    </mesh>
  )
}
