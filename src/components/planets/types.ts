import {
  ATMOSPHERE,
  ATMOSPHERE_SCALES,
  ATMOSPHERE_PARAMS,
} from '../../constants/planets'

/**
 * Shader preset types as they appear in shader-presets.json
 * Note: plasma/shattered use 'lava' in presets but get different type IDs
 */
export type PresetType =
  | 'gasgiant'
  | 'terrestrial'
  | 'ocean'
  | 'ice'
  | 'lava'
  | 'sandstorm'
  | 'thunderstorm'
  | 'plasma'
  | 'shattered'

export type ShaderType = 'terrestrial' | 'gasgiant' | 'ice' | 'lava' | 'basic'

export interface ShaderPresetParameters {
  WindFactors?: number[]
  ringColor1?: number[]
  ringColor2?: number[]
  ringColor3?: number[]
  CapColor?: number[]
  DistoFactors?: number[]
  Saturation?: number[]
  RingsFactors?: number[]
  GeometryDeformation?: number[]
  GeometryAnimation?: number[]
  ColorParams?: number[]
  MaskParams0?: number[]
  MaskParams1?: number[]
  Geometry?: number[]
  AtmosphereFactors?: [number, number, number, number]
  ScatteringFactors?: [number, number, number, number]
  Wavelengths?: [number, number, number]
}

export interface AtmosphereParams {
  atmosphereFactors: readonly [number, number, number, number]
  scatteringFactors: readonly [number, number, number, number]
  wavelengths: readonly [number, number, number]
  scale: number
}

export const DEFAULT_ATMOSPHERE_PARAMS: AtmosphereParams = {
  atmosphereFactors: ATMOSPHERE_PARAMS.standard.atmosphereFactors,
  scatteringFactors: ATMOSPHERE_PARAMS.standard.scatteringFactors,
  wavelengths: ATMOSPHERE_PARAMS.standard.wavelengths,
  scale: ATMOSPHERE.DEFAULT_SCALE,
}

export const ATMOSPHERE_PARAMS_BY_TYPE: Record<string, AtmosphereParams> = {
  standard: DEFAULT_ATMOSPHERE_PARAMS,
  terrestrial: {
    atmosphereFactors: ATMOSPHERE_PARAMS.terrestrial.atmosphereFactors,
    scatteringFactors: ATMOSPHERE_PARAMS.terrestrial.scatteringFactors,
    wavelengths: ATMOSPHERE_PARAMS.terrestrial.wavelengths,
    scale: ATMOSPHERE_SCALES.terrestrial ?? ATMOSPHERE.DEFAULT_SCALE,
  },
  ocean: {
    atmosphereFactors: ATMOSPHERE_PARAMS.ocean.atmosphereFactors,
    scatteringFactors: ATMOSPHERE_PARAMS.ocean.scatteringFactors,
    wavelengths: ATMOSPHERE_PARAMS.ocean.wavelengths,
    scale: ATMOSPHERE_SCALES.ocean ?? ATMOSPHERE.DEFAULT_SCALE,
  },
  gasgiant: {
    atmosphereFactors: ATMOSPHERE_PARAMS.gasgiant.atmosphereFactors,
    scatteringFactors: ATMOSPHERE_PARAMS.gasgiant.scatteringFactors,
    wavelengths: ATMOSPHERE_PARAMS.gasgiant.wavelengths,
    scale: ATMOSPHERE_SCALES.gasgiant ?? ATMOSPHERE.DEFAULT_SCALE,
  },
  ice: {
    atmosphereFactors: ATMOSPHERE_PARAMS.ice.atmosphereFactors,
    scatteringFactors: ATMOSPHERE_PARAMS.ice.scatteringFactors,
    wavelengths: ATMOSPHERE_PARAMS.ice.wavelengths,
    scale: ATMOSPHERE_SCALES.ice ?? ATMOSPHERE.DEFAULT_SCALE,
  },
  lava: {
    atmosphereFactors: ATMOSPHERE_PARAMS.lava.atmosphereFactors,
    scatteringFactors: ATMOSPHERE_PARAMS.lava.scatteringFactors,
    wavelengths: ATMOSPHERE_PARAMS.lava.wavelengths,
    scale: ATMOSPHERE_SCALES.lava ?? ATMOSPHERE.DEFAULT_SCALE,
  },
  plasma: {
    atmosphereFactors: ATMOSPHERE_PARAMS.plasma.atmosphereFactors,
    scatteringFactors: ATMOSPHERE_PARAMS.plasma.scatteringFactors,
    wavelengths: ATMOSPHERE_PARAMS.plasma.wavelengths,
    scale: ATMOSPHERE_SCALES.plasma ?? ATMOSPHERE.DEFAULT_SCALE,
  },
  sandstorm: {
    atmosphereFactors: ATMOSPHERE_PARAMS.sandstorm.atmosphereFactors,
    scatteringFactors: ATMOSPHERE_PARAMS.sandstorm.scatteringFactors,
    wavelengths: ATMOSPHERE_PARAMS.sandstorm.wavelengths,
    scale: ATMOSPHERE_SCALES.sandstorm ?? ATMOSPHERE.DEFAULT_SCALE,
  },
  thunderstorm: {
    atmosphereFactors: ATMOSPHERE_PARAMS.thunderstorm.atmosphereFactors,
    scatteringFactors: ATMOSPHERE_PARAMS.thunderstorm.scatteringFactors,
    wavelengths: ATMOSPHERE_PARAMS.thunderstorm.wavelengths,
    scale: ATMOSPHERE_SCALES.thunderstorm ?? ATMOSPHERE.DEFAULT_SCALE,
  },
  shattered: {
    atmosphereFactors: ATMOSPHERE_PARAMS.lava.atmosphereFactors,
    scatteringFactors: ATMOSPHERE_PARAMS.lava.scatteringFactors,
    wavelengths: ATMOSPHERE_PARAMS.lava.wavelengths,
    scale: ATMOSPHERE_SCALES.lava ?? ATMOSPHERE.DEFAULT_SCALE,
  },
}

export function getAtmosphereParams(preset: ShaderPreset): AtmosphereParams {
  const params = preset.parameters
  const baseParams = ATMOSPHERE_PARAMS_BY_TYPE[preset.type] ?? DEFAULT_ATMOSPHERE_PARAMS
  if (params?.AtmosphereFactors && params?.ScatteringFactors && params?.Wavelengths) {
    return {
      atmosphereFactors: params.AtmosphereFactors,
      scatteringFactors: params.ScatteringFactors,
      wavelengths: params.Wavelengths,
      scale: baseParams.scale,
    }
  }
  return baseParams
}

export interface ShaderPreset {
  type: PresetType
  textures: Record<string, string>
  parameters?: ShaderPresetParameters
}

export interface OrbitParams {
  semiMajor: number
  semiMinor: number
  inclination: number
  longitudeOfAscending: number
}


export function getShaderType(presetType: PresetType): ShaderType {
  switch (presetType) {
    case 'terrestrial':
    case 'ocean':
      return 'terrestrial'
    case 'gasgiant':
      return 'gasgiant'
    case 'ice':
      return 'ice'
    case 'lava':
    case 'plasma':
    case 'shattered':
      return 'lava'
    default:
      return 'basic'
  }
}

const TEXTURE_BASE = '/models/planets/textures/'

export function getTexturePath(relativePath: string): string {
  return TEXTURE_BASE + relativePath
}
