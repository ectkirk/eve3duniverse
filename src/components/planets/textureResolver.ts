import { type ShaderPreset, getShaderType, getTexturePath } from './types'
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
}

export function getTexturePathsForPreset(
  preset: ShaderPreset,
  heightMap1Id?: number,
  heightMap2Id?: number
): TexturePathsResult {
  const paths: string[] = []
  const tex = preset.textures
  const shaderType = getShaderType(preset.type)

  if (shaderType === 'gasgiant') {
    if (tex.DistortionMap) paths.push(getTexturePath(tex.DistortionMap))
    else if (tex.FillTexture) paths.push(getTexturePath(tex.FillTexture))
  } else {
    if (tex.FillTexture) paths.push(getTexturePath(tex.FillTexture))
    else if (tex.CloudsTexture) paths.push(getTexturePath(tex.CloudsTexture))
  }

  if (tex.ColorGradientMap) paths.push(getTexturePath(tex.ColorGradientMap))
  if (tex.PolesGradient) paths.push(getTexturePath(tex.PolesGradient))
  else if (tex.PolesMaskMap) paths.push(getTexturePath(tex.PolesMaskMap))

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
  if (tex.CityLight) paths.push(getTexturePath(tex.CityLight))
  if (tex.GroundScattering1) paths.push(getTexturePath(tex.GroundScattering1))
  if (tex.GroundScattering2) paths.push(getTexturePath(tex.GroundScattering2))

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

  return {
    paths,
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
  }
}

export function getPlanetTypeNum(presetType: string): number {
  switch (presetType) {
    case 'gasgiant': return 0
    case 'terrestrial': return 1
    case 'ocean': return 2
    case 'lava': return 3
    case 'ice': return 4
    case 'thunderstorm': return 5
    case 'sandstorm': return 6
    default: return 1
  }
}
