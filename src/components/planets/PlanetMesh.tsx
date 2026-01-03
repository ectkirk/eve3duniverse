import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { type ShaderPreset } from './types'
import { getTexturePathsForPreset, getPlanetTypeNum } from './textureResolver'
import { SCENE } from '../../constants'
import {
  LIGHTING,
  ANIMATION,
  GAS_GIANT,
  LAVA,
  THUNDERSTORM,
  PLASMA,
} from '../../constants/planets'
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
      // Dynamic uniforms
      uTime: { value: 0 },
      uStarPosition: { value: starPosition },
      uStarColor: { value: starColor },
      uPlanetType: { value: getPlanetTypeNum(presetType) },
      uTemperature: { value: temperature },

      // Texture samplers
      uDiffuse: { value: diffuseTex },
      uGradient: { value: gradientIndex >= 0 ? getTexture(gradientIndex) : placeholderTexture },
      uPoleMask: { value: poleMaskIndex >= 0 ? getTexture(poleMaskIndex) : placeholderTexture },
      uCityLight: { value: placeholderTexture },
      uScatterLight: { value: placeholderTexture },
      uScatterHue: { value: placeholderTexture },
      uHeightMap1: { value: placeholderTexture },
      uHeightMap2: { value: placeholderTexture },
      uClouds: { value: placeholderTexture },
      uCloudCap: { value: placeholderTexture },
      uBakedHeightMap: { value: placeholderTexture },
      uLavaNoise: { value: placeholderTexture },
      uLightning: { value: placeholderTexture },
      uGasGiantMixer: { value: placeholderTexture },
      uGasGiantNoise: { value: placeholderTexture },
      uColorizeMap: { value: placeholderTexture },

      // Feature flags
      uHasCityLights: { value: 0.0 },
      uHasScatter: { value: 0.0 },
      uHasHeightMap: { value: 0.0 },
      uHasClouds: { value: 0.0 },
      uHasBakedHeightMap: { value: 0.0 },
      uHasLavaNoise: { value: 0.0 },
      uHasLightning: { value: 0.0 },
      uHasGasGiantMixer: { value: 0.0 },
      uHasGasGiantNoise: { value: 0.0 },
      uHasColorizeMap: { value: 0.0 },

      // Preset parameters (from shader-presets.json)
      uWindFactors: { value: new THREE.Vector4(
        preset.parameters?.WindFactors?.[0] ?? GAS_GIANT.DEFAULT_WIND_FACTORS[0],
        preset.parameters?.WindFactors?.[1] ?? GAS_GIANT.DEFAULT_WIND_FACTORS[1],
        preset.parameters?.WindFactors?.[2] ?? GAS_GIANT.DEFAULT_WIND_FACTORS[2],
        preset.parameters?.WindFactors?.[3] ?? GAS_GIANT.DEFAULT_WIND_FACTORS[3]
      ) },
      uCapColor: { value: new THREE.Vector4(
        preset.parameters?.CapColor?.[0] ?? 0.0,
        preset.parameters?.CapColor?.[1] ?? 0.0,
        preset.parameters?.CapColor?.[2] ?? 0.0,
        preset.parameters?.CapColor?.[3] ?? 0.0
      ) },
      uDistoFactors: { value: new THREE.Vector4(
        preset.parameters?.DistoFactors?.[0] ?? GAS_GIANT.DEFAULT_DISTO_FACTORS[0],
        preset.parameters?.DistoFactors?.[1] ?? GAS_GIANT.DEFAULT_DISTO_FACTORS[1],
        preset.parameters?.DistoFactors?.[2] ?? GAS_GIANT.DEFAULT_DISTO_FACTORS[2],
        preset.parameters?.DistoFactors?.[3] ?? GAS_GIANT.DEFAULT_DISTO_FACTORS[3]
      ) },
      uSaturation: { value: new THREE.Vector4(
        preset.parameters?.Saturation?.[0] ?? GAS_GIANT.DEFAULT_SATURATION[0],
        preset.parameters?.Saturation?.[1] ?? GAS_GIANT.DEFAULT_SATURATION[1],
        preset.parameters?.Saturation?.[2] ?? GAS_GIANT.DEFAULT_SATURATION[2],
        preset.parameters?.Saturation?.[3] ?? GAS_GIANT.DEFAULT_SATURATION[3]
      ) },
      uBandingSpeed: { value: new THREE.Vector4(
        preset.parameters?.BandingSpeed?.[0] ?? 0.0,
        preset.parameters?.BandingSpeed?.[1] ?? 0.0,
        preset.parameters?.BandingSpeed?.[2] ?? 0.0,
        preset.parameters?.BandingSpeed?.[3] ?? 0.0
      ) },

      // Ice preset parameters
      uIceRampColorLow: { value: new THREE.Vector4(
        preset.parameters?.IceRampColorLow?.[0] ?? 0.8,
        preset.parameters?.IceRampColorLow?.[1] ?? 0.85,
        preset.parameters?.IceRampColorLow?.[2] ?? 0.9,
        preset.parameters?.IceRampColorLow?.[3] ?? 1.0
      ) },
      uIceRampColorMiddle: { value: new THREE.Vector4(
        preset.parameters?.IceRampColorMiddle?.[0] ?? 0.4,
        preset.parameters?.IceRampColorMiddle?.[1] ?? 0.5,
        preset.parameters?.IceRampColorMiddle?.[2] ?? 0.6,
        preset.parameters?.IceRampColorMiddle?.[3] ?? 1.0
      ) },
      uIceRampColorHigh: { value: new THREE.Vector4(
        preset.parameters?.IceRampColorHigh?.[0] ?? 0.1,
        preset.parameters?.IceRampColorHigh?.[1] ?? 0.15,
        preset.parameters?.IceRampColorHigh?.[2] ?? 0.2,
        preset.parameters?.IceRampColorHigh?.[3] ?? 1.0
      ) },

      // Lava preset parameters
      uAnimationFactors: { value: new THREE.Vector4(
        preset.parameters?.AnimationFactors?.[0] ?? 0.0,
        preset.parameters?.AnimationFactors?.[1] ?? 0.2,
        preset.parameters?.AnimationFactors?.[2] ?? 0.0,
        preset.parameters?.AnimationFactors?.[3] ?? 1.0
      ) },
      uLavaColor1: { value: new THREE.Vector4(
        preset.parameters?.LavaColor1?.[0] ?? 24.0,
        preset.parameters?.LavaColor1?.[1] ?? 5.7,
        preset.parameters?.LavaColor1?.[2] ?? 0.0,
        preset.parameters?.LavaColor1?.[3] ?? 1.0
      ) },
      uLavaColor2: { value: new THREE.Vector4(
        preset.parameters?.LavaColor2?.[0] ?? 0.0,
        preset.parameters?.LavaColor2?.[1] ?? 0.0,
        preset.parameters?.LavaColor2?.[2] ?? 0.0,
        preset.parameters?.LavaColor2?.[3] ?? 1.0
      ) },

      // LIGHTING constants (from src/constants/planets.ts)
      uShadowFloor: { value: LIGHTING.SHADOW_FLOOR },
      uShadowRange: { value: LIGHTING.SHADOW_RANGE },
      uFresnelPower: { value: LIGHTING.FRESNEL_POWER },
      uNightThreshold: { value: LIGHTING.NIGHT_THRESHOLD },
      uCityGlowIntensity: { value: LIGHTING.CITY_GLOW_INTENSITY },
      uCloudAlpha: { value: LIGHTING.CLOUD_ALPHA },
      uScatterStrength: { value: LIGHTING.SCATTER_STRENGTH },
      uHeightSampleDelta: { value: LIGHTING.HEIGHT_SAMPLE_DELTA },
      uNormalStrength: { value: LIGHTING.NORMAL_STRENGTH },

      // ANIMATION constants
      uSurfaceSpeed: { value: ANIMATION.SURFACE_SPEED },
      uCloudSpeed: { value: ANIMATION.CLOUD_SPEED },
      uCloudCapSpeed: { value: ANIMATION.CLOUD_CAP_SPEED },

      // GAS_GIANT constants
      uLatFactorScale: { value: GAS_GIANT.LAT_FACTOR_SCALE },
      uLatVariationScale: { value: GAS_GIANT.LAT_VARIATION_SCALE },
      uMixerDefault: { value: GAS_GIANT.MIXER_DEFAULT },
      uPatternIntensityBase: { value: GAS_GIANT.PATTERN_INTENSITY_BASE },
      uPatternIntensityRange: { value: GAS_GIANT.PATTERN_INTENSITY_RANGE },
      uPoleDarkenBase: { value: GAS_GIANT.POLE_DARKEN_BASE },
      uPoleDarkenRange: { value: GAS_GIANT.POLE_DARKEN_RANGE },
      uCapTintScale: { value: GAS_GIANT.CAP_TINT_SCALE },
      uNoiseColorStrength: { value: GAS_GIANT.NOISE_COLOR_STRENGTH },
      uHeightInfluenceBase: { value: GAS_GIANT.HEIGHT_INFLUENCE_BASE },
      uHeightInfluenceRange: { value: GAS_GIANT.HEIGHT_INFLUENCE_RANGE },
      uNoiseSpeedScale: { value: ANIMATION.NOISE_SPEED_SCALE },

      // LAVA constants
      uTempScale: { value: LAVA.TEMP_SCALE },
      uTempClampMin: { value: LAVA.TEMP_CLAMP_MIN },
      uTempClampMax: { value: LAVA.TEMP_CLAMP_MAX },
      uPulseBase: { value: LAVA.PULSE_BASE },
      uPulseRange: { value: LAVA.PULSE_RANGE },
      uPulseFreq: { value: LAVA.PULSE_FREQ },
      uSecondaryGlow: { value: LAVA.SECONDARY_GLOW },
      uSecondaryFreq: { value: LAVA.SECONDARY_FREQ },
      uGlowColor: { value: new THREE.Vector3(...LAVA.GLOW_COLOR) },
      uNoiseGlowStrength: { value: LAVA.NOISE_GLOW_STRENGTH },
      uNoiseOffsetScale: { value: LAVA.NOISE_OFFSET_SCALE },
      uLavaAnimSpeedFactor: { value: LAVA.ANIM_SPEED_FACTOR },

      // THUNDERSTORM constants
      uFlashFreq: { value: THUNDERSTORM.FLASH_FREQ },
      uFlashPower: { value: THUNDERSTORM.FLASH_POWER },
      uFlashThreshold: { value: THUNDERSTORM.FLASH_THRESHOLD },
      uFlashTimingPeriod: { value: THUNDERSTORM.FLASH_TIMING_PERIOD },
      uLightningFreq: { value: THUNDERSTORM.LIGHTNING_FREQ },
      uLightningPower: { value: THUNDERSTORM.LIGHTNING_POWER },
      uLightningThreshold: { value: THUNDERSTORM.LIGHTNING_THRESHOLD },
      uLightningTimingPeriod: { value: THUNDERSTORM.LIGHTNING_TIMING_PERIOD },
      uLightningColor: { value: new THREE.Vector3(...THUNDERSTORM.LIGHTNING_COLOR) },
      uLightningColorAlt: { value: new THREE.Vector3(...THUNDERSTORM.LIGHTNING_COLOR_ALT) },
      uLightningIntensity: { value: THUNDERSTORM.LIGHTNING_INTENSITY },
      uLightningIntensityProc: { value: THUNDERSTORM.LIGHTNING_INTENSITY_PROC },
      uLightningUvScale: { value: new THREE.Vector2(...THUNDERSTORM.LIGHTNING_UV_SCALE) },
      uLightningAnimSpeed: { value: THUNDERSTORM.LIGHTNING_ANIM_SPEED },
      uHashConstant: { value: THUNDERSTORM.HASH_CONSTANT },

      // PLASMA glow color override
      uPlasmaGlowColor: { value: new THREE.Vector3(...PLASMA.GLOW_COLOR) },
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

    const { colorizeMapIndex } = textureResult
    if (colorizeMapIndex >= 0) {
      const colorizeTex = getTexture(colorizeMapIndex)
      colorizeTex.wrapS = colorizeTex.wrapT = THREE.RepeatWrapping
      uniforms.uColorizeMap = { value: colorizeTex }
      uniforms.uHasColorizeMap = { value: 1.0 }
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
