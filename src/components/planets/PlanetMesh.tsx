import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { type ShaderPreset } from './types'
import { getTexturePathsForPreset, getPlanetTypeNum } from './textureResolver'
import { SCENE } from '../../constants'
import { createLogger } from '../../utils/logger'
import { useHeightMapBaker } from '../../hooks/useHeightMapBaker'
import planetVertexShader from '../../shaders/planet/planetVertex.glsl'
import planetFragmentShader from '../../shaders/planet/planetFragment.glsl'

const log = createLogger('PlanetMesh')

interface PlanetMeshProps {
  preset: ShaderPreset
  population: boolean
  scaledRadius: number
  starPosition: THREE.Vector3
  starColor: THREE.Color
  heightMap1?: number
  heightMap2?: number
  temperature: number
  rotationRate: number
  planetId: number
}

function createPlaceholderTexture(): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 2
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#888888'
  ctx.fillRect(0, 0, 2, 2)
  return new THREE.CanvasTexture(canvas)
}

export function PlanetMesh({
  preset,
  population,
  scaledRadius,
  starPosition,
  starColor,
  heightMap1,
  heightMap2,
  temperature,
  rotationRate,
  planetId,
}: PlanetMeshProps) {
  const presetType = preset.type

  const textureResult = useMemo(
    () => getTexturePathsForPreset(preset, heightMap1, heightMap2),
    [preset, heightMap1, heightMap2]
  )

  const textures = useLoader(THREE.TextureLoader, textureResult.paths)
  const placeholderTexture = useMemo(() => createPlaceholderTexture(), [])

  const { normalHeight1Index, normalHeight2Index } = textureResult
  const normalHeight1Tex = normalHeight1Index >= 0 ? textures[normalHeight1Index] ?? null : null
  const normalHeight2Tex = normalHeight2Index >= 0 ? (textures[normalHeight2Index] ?? normalHeight1Tex) : normalHeight1Tex

  const heightSeed = useMemo(() => planetId % 100, [planetId])
  const bakedHeightMap = useHeightMapBaker(normalHeight1Tex, normalHeight2Tex, heightSeed)


  const material = useMemo(() => {
    const getTexture = (i: number): THREE.Texture => textures[i] ?? placeholderTexture

    const { diffuseIndex, gradientIndex, poleMaskIndex } = textureResult
    const diffuseTex = diffuseIndex >= 0 ? getTexture(diffuseIndex) : placeholderTexture
    diffuseTex.wrapS = diffuseTex.wrapT = THREE.RepeatWrapping

    const uniforms: Record<string, { value: unknown }> = {
      uTime: { value: 0 },
      uStarPosition: { value: starPosition },
      uStarColor: { value: starColor },
      uDiffuse: { value: diffuseTex },
      uGradient: { value: gradientIndex >= 0 ? getTexture(gradientIndex) : placeholderTexture },
      uPoleMask: { value: poleMaskIndex >= 0 ? getTexture(poleMaskIndex) : placeholderTexture },
      uCityLight: { value: placeholderTexture },
      uHasCityLights: { value: 0.0 },
      uScatterLight: { value: placeholderTexture },
      uScatterHue: { value: placeholderTexture },
      uHasScatter: { value: 0.0 },
      uHeightMap1: { value: placeholderTexture },
      uHeightMap2: { value: placeholderTexture },
      uHasHeightMap: { value: 0.0 },
      uClouds: { value: placeholderTexture },
      uCloudCap: { value: placeholderTexture },
      uHasClouds: { value: 0.0 },
      uBakedHeightMap: { value: placeholderTexture },
      uHasBakedHeightMap: { value: 0.0 },
      uLavaNoise: { value: placeholderTexture },
      uHasLavaNoise: { value: 0.0 },
      uLightning: { value: placeholderTexture },
      uHasLightning: { value: 0.0 },
      uGasGiantMixer: { value: placeholderTexture },
      uGasGiantNoise: { value: placeholderTexture },
      uHasGasGiantMixer: { value: 0.0 },
      uHasGasGiantNoise: { value: 0.0 },
      uPlanetType: { value: getPlanetTypeNum(presetType) },
      uTemperature: { value: temperature },
      uWindFactors: { value: new THREE.Vector4(
        preset.parameters?.WindFactors?.[0] ?? 0.3,
        preset.parameters?.WindFactors?.[1] ?? 0.5,
        preset.parameters?.WindFactors?.[2] ?? 0.2,
        preset.parameters?.WindFactors?.[3] ?? 0.12
      ) },
      uCapColor: { value: new THREE.Vector4(
        preset.parameters?.CapColor?.[0] ?? 0.0,
        preset.parameters?.CapColor?.[1] ?? 0.0,
        preset.parameters?.CapColor?.[2] ?? 0.0,
        preset.parameters?.CapColor?.[3] ?? 0.0
      ) },
      uDistoFactors: { value: new THREE.Vector4(
        preset.parameters?.DistoFactors?.[0] ?? 4.0,
        preset.parameters?.DistoFactors?.[1] ?? 0.0,
        preset.parameters?.DistoFactors?.[2] ?? 0.0,
        preset.parameters?.DistoFactors?.[3] ?? 0.0
      ) },
      uSaturation: { value: new THREE.Vector4(
        preset.parameters?.Saturation?.[0] ?? 1.0,
        preset.parameters?.Saturation?.[1] ?? 0.0,
        preset.parameters?.Saturation?.[2] ?? 0.0,
        preset.parameters?.Saturation?.[3] ?? 0.0
      ) },
    }

    const { cityLightIndex, scatterLightIndex, scatterHueIndex } = textureResult
    if (cityLightIndex >= 0 && population) {
      uniforms.uCityLight = { value: getTexture(cityLightIndex) }
      uniforms.uHasCityLights = { value: 1.0 }
    }

    if (scatterLightIndex >= 0 && scatterHueIndex >= 0) {
      uniforms.uScatterLight = { value: getTexture(scatterLightIndex) }
      uniforms.uScatterHue = { value: getTexture(scatterHueIndex) }
      uniforms.uHasScatter = { value: 1.0 }
    }

    const { heightMap1Index, heightMap2Index, cloudsIndex, cloudCapIndex } = textureResult
    if (heightMap1Index >= 0 || heightMap2Index >= 0) {
      const h1Tex = heightMap1Index >= 0 ? getTexture(heightMap1Index) : placeholderTexture
      const h2Tex = heightMap2Index >= 0 ? getTexture(heightMap2Index) : h1Tex
      h1Tex.wrapS = h1Tex.wrapT = THREE.RepeatWrapping
      h2Tex.wrapS = h2Tex.wrapT = THREE.RepeatWrapping
      uniforms.uHeightMap1 = { value: h1Tex }
      uniforms.uHeightMap2 = { value: h2Tex }
      uniforms.uHasHeightMap = { value: 1.0 }
    }

    if (cloudsIndex >= 0) {
      const cloudsTex = getTexture(cloudsIndex)
      cloudsTex.wrapS = cloudsTex.wrapT = THREE.RepeatWrapping
      uniforms.uClouds = { value: cloudsTex }
      uniforms.uHasClouds = { value: 1.0 }

      if (cloudCapIndex >= 0) {
        const cloudCapTex = getTexture(cloudCapIndex)
        cloudCapTex.wrapS = cloudCapTex.wrapT = THREE.RepeatWrapping
        uniforms.uCloudCap = { value: cloudCapTex }
      }
    }

    if (bakedHeightMap) {
      uniforms.uBakedHeightMap = { value: bakedHeightMap.texture }
      uniforms.uHasBakedHeightMap = { value: 1.0 }
    }

    const { lavaNoiseIndex, lightningIndex } = textureResult

    if (lavaNoiseIndex >= 0) {
      const lavaNoiseTex = getTexture(lavaNoiseIndex)
      lavaNoiseTex.wrapS = lavaNoiseTex.wrapT = THREE.RepeatWrapping
      uniforms.uLavaNoise = { value: lavaNoiseTex }
      uniforms.uHasLavaNoise = { value: 1.0 }
    }

    if (lightningIndex >= 0) {
      const lightningTex = getTexture(lightningIndex)
      lightningTex.wrapS = lightningTex.wrapT = THREE.RepeatWrapping
      uniforms.uLightning = { value: lightningTex }
      uniforms.uHasLightning = { value: 1.0 }
    }

    const { gasGiantMixerIndex, gasGiantNoiseIndex } = textureResult
    if (gasGiantMixerIndex >= 0) {
      const mixerTex = getTexture(gasGiantMixerIndex)
      mixerTex.wrapS = mixerTex.wrapT = THREE.RepeatWrapping
      uniforms.uGasGiantMixer = { value: mixerTex }
      uniforms.uHasGasGiantMixer = { value: 1.0 }
    }

    if (gasGiantNoiseIndex >= 0) {
      const noiseTex = getTexture(gasGiantNoiseIndex)
      noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping
      uniforms.uGasGiantNoise = { value: noiseTex }
      uniforms.uHasGasGiantNoise = { value: 1.0 }
    }

    if (planetFragmentShader.includes('#include')) {
      console.error('[PlanetMesh] GLSL includes not processed!')
    }
    const mat = new THREE.ShaderMaterial({
      vertexShader: planetVertexShader,
      fragmentShader: planetFragmentShader,
      uniforms,
    })
    mat.needsUpdate = true
    return mat
  }, [textures, preset, presetType, starPosition, starColor, placeholderTexture, population, textureResult, temperature, bakedHeightMap])

  const meshRef = useRef<THREE.Mesh>(null)

  useEffect(() => {
    const checkShader = () => {
      if (!meshRef.current) return
      const gl = meshRef.current.parent?.parent?.parent as unknown as { __r3f?: { gl?: THREE.WebGLRenderer } }
      const renderer = gl?.__r3f?.gl
      if (!renderer) return

      const props = renderer.properties.get(material) as { program?: { program: WebGLProgram } } | undefined
      if (props?.program) {
        const gl2 = renderer.getContext()
        const linked = gl2.getProgramParameter(props.program.program, gl2.LINK_STATUS)
        if (!linked) {
          log.error(`Shader link failed for ${presetType}:`, gl2.getProgramInfoLog(props.program.program))
        }
      }
    }
    const timer = setTimeout(checkShader, 100)
    return () => clearTimeout(timer)
  }, [material, presetType])

  const rotationSpeed = useMemo(() => {
    if (!rotationRate || rotationRate === 0) return 0.01
    return rotationRate * SCENE.ROTATION_SCALE
  }, [rotationRate])

  useFrame(({ clock }) => {
    if (material.uniforms.uTime) {
      material.uniforms.uTime.value = clock.elapsedTime
    }
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.elapsedTime * rotationSpeed
    }
  })

  return (
    <mesh ref={meshRef} material={material}>
      <sphereGeometry args={[scaledRadius, 32, 32]} />
    </mesh>
  )
}
