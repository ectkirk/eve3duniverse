import { type ShaderPreset, getShaderType, getTexturePath } from './types'
import { PLANET_TYPE } from '../../constants/planets'
import planetGraphics from '../../data/planet-graphics.json'

const graphicsData = planetGraphics as Record<string, string>

export function getHeightMapPath(graphicId: number | undefined): string | null {
  if (!graphicId) return null
  const path = graphicsData[graphicId.toString()]
  if (!path || !path.endsWith('.webp')) return null
  return getTexturePath(path)
}

export interface TexturePathsResult {
  paths: string[]
  diffuseIndex: number
  gradientIndex: number
  poleMaskIndex: number
  heightMap1Index: number
  heightMap2Index: number
  cloudsIndex: number
  cloudCapIndex: number
  normalHeight1Index: number
  normalHeight2Index: number
  lavaNoiseIndex: number
  lightningIndex: number
  gasGiantMixerIndex: number
  gasGiantNoiseIndex: number
  cityLightIndex: number
  scatterLightIndex: number
  scatterHueIndex: number
  colorizeMapIndex: number
}

export function getTexturePathsForPreset(
  preset: ShaderPreset,
  heightMap1Id?: number,
  heightMap2Id?: number
): TexturePathsResult {
  const paths: string[] = []
  const tex = preset.textures
  const shaderType = getShaderType(preset.type)

  let diffuseIndex = -1
  if (shaderType === 'gasgiant') {
    if (tex.DistortionMap) {
      diffuseIndex = paths.length
      paths.push(getTexturePath(tex.DistortionMap))
    } else if (tex.FillTexture) {
      diffuseIndex = paths.length
      paths.push(getTexturePath(tex.FillTexture))
    }
  } else {
    if (tex.FillTexture) {
      diffuseIndex = paths.length
      paths.push(getTexturePath(tex.FillTexture))
    } else if (tex.CloudsTexture) {
      diffuseIndex = paths.length
      paths.push(getTexturePath(tex.CloudsTexture))
    }
  }

  let gradientIndex = -1
  if (tex.ColorGradientMap) {
    gradientIndex = paths.length
    paths.push(getTexturePath(tex.ColorGradientMap))
  }

  let poleMaskIndex = -1
  if (tex.PolesGradient) {
    poleMaskIndex = paths.length
    paths.push(getTexturePath(tex.PolesGradient))
  } else if (tex.PolesMaskMap) {
    poleMaskIndex = paths.length
    paths.push(getTexturePath(tex.PolesMaskMap))
  }

  let gasGiantMixerIndex = -1
  let gasGiantNoiseIndex = -1
  if (shaderType === 'gasgiant') {
    if (tex.HeightMap) {
      gasGiantMixerIndex = paths.length
      paths.push(getTexturePath(tex.HeightMap))
    }
    if (tex.NoiseMap) {
      gasGiantNoiseIndex = paths.length
      paths.push(getTexturePath(tex.NoiseMap))
    }
  }
  let cityLightIndex = -1
  if (tex.CityLight) {
    cityLightIndex = paths.length
    paths.push(getTexturePath(tex.CityLight))
  }
  let scatterLightIndex = -1
  let scatterHueIndex = -1
  if (tex.GroundScattering1) {
    scatterLightIndex = paths.length
    paths.push(getTexturePath(tex.GroundScattering1))
  }
  if (tex.GroundScattering2) {
    scatterHueIndex = paths.length
    paths.push(getTexturePath(tex.GroundScattering2))
  }

  let heightMap1Index = -1
  let heightMap2Index = -1
  const h1Path = getHeightMapPath(heightMap1Id)
  const h2Path = getHeightMapPath(heightMap2Id)
  if (h1Path) {
    heightMap1Index = paths.length
    paths.push(h1Path)
  }
  if (h2Path) {
    heightMap2Index = paths.length
    paths.push(h2Path)
  }

  let cloudsIndex = -1
  let cloudCapIndex = -1
  if (tex.CloudsTexture && shaderType !== 'gasgiant') {
    cloudsIndex = paths.length
    paths.push(getTexturePath(tex.CloudsTexture))
  }
  if (tex.CloudCapTexture && shaderType !== 'gasgiant') {
    cloudCapIndex = paths.length
    paths.push(getTexturePath(tex.CloudCapTexture))
  }

  let normalHeight1Index = -1
  let normalHeight2Index = -1
  if (tex.NormalHeight1) {
    normalHeight1Index = paths.length
    paths.push(getTexturePath(tex.NormalHeight1))
  }
  if (tex.NormalHeight2) {
    normalHeight2Index = paths.length
    paths.push(getTexturePath(tex.NormalHeight2))
  }

  let lavaNoiseIndex = -1
  if (tex.Lava3DNoiseMap) {
    lavaNoiseIndex = paths.length
    paths.push(getTexturePath(tex.Lava3DNoiseMap))
  }

  let lightningIndex = -1
  if (tex.LightningMap) {
    lightningIndex = paths.length
    paths.push(getTexturePath(tex.LightningMap))
  }

  let colorizeMapIndex = -1
  if (tex.ColorizeMap) {
    colorizeMapIndex = paths.length
    paths.push(getTexturePath(tex.ColorizeMap))
  }

  return {
    paths,
    diffuseIndex,
    gradientIndex,
    poleMaskIndex,
    heightMap1Index,
    heightMap2Index,
    cloudsIndex,
    cloudCapIndex,
    normalHeight1Index,
    normalHeight2Index,
    lavaNoiseIndex,
    lightningIndex,
    gasGiantMixerIndex,
    gasGiantNoiseIndex,
    cityLightIndex,
    scatterLightIndex,
    scatterHueIndex,
    colorizeMapIndex,
  }
}

/**
 * Get planet type ID for shader branching
 * Maps preset type string to numeric ID used in fragment shader
 * Source: src/constants/planets.ts PLANET_TYPE
 */
export function getPlanetTypeNum(presetType: string): number {
  switch (presetType) {
    case 'gasgiant':
      return PLANET_TYPE.GAS_GIANT
    case 'terrestrial':
      return PLANET_TYPE.TERRESTRIAL
    case 'ocean':
      return PLANET_TYPE.OCEAN
    case 'lava':
      return PLANET_TYPE.LAVA
    case 'ice':
      return PLANET_TYPE.ICE
    case 'thunderstorm':
      return PLANET_TYPE.THUNDERSTORM
    case 'sandstorm':
      return PLANET_TYPE.SANDSTORM
    case 'plasma':
      return PLANET_TYPE.PLASMA
    case 'shattered':
      return PLANET_TYPE.SHATTERED
    default:
      return PLANET_TYPE.TERRESTRIAL
  }
}
