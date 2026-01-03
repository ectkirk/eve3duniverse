import atmospherePresetsData from '../../data/atmosphere-presets.json'

// Shader preset types as they appear in shader-presets.json
// Note: plasma/shattered planet typeIDs use 'lava' shader preset
export type PresetType =
  | 'gasgiant'
  | 'terrestrial'
  | 'ocean'
  | 'ice'
  | 'lava'
  | 'sandstorm'
  | 'thunderstorm'

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
  // Atmosphere parameters (from EVE .black files)
  AtmosphereFactors?: [number, number, number, number]   // RGB color + alpha
  ScatteringFactors?: [number, number, number, number]   // Kr, Km, ESun, intensity
  Wavelengths?: [number, number, number]                 // RGB wavelengths in micrometers
}

// Default atmosphere parameters by planet type (fallback when not in preset)
export interface AtmosphereParams {
  atmosphereFactors: [number, number, number, number]
  scatteringFactors: [number, number, number, number]
  wavelengths: [number, number, number]
  scale: number
}

type AtmospherePresetData = {
  maxVertexScale?: number
  ScatteringFactors?: number[]
  wavelengths?: number[]
  AtmosphereColor?: number[]
}
const atmospherePresets = atmospherePresetsData as Record<string, AtmospherePresetData>

const DEFAULT_SCALE = 1.025

export const DEFAULT_ATMOSPHERE_PARAMS: AtmosphereParams = {
  atmosphereFactors: [0.545, 0.604, 0.651, 1.0],
  scatteringFactors: [1.0, 1.0, 1.0, 1.5],
  wavelengths: [0.650, 0.570, 0.475],
  scale: DEFAULT_SCALE,
}

export const ATMOSPHERE_PARAMS_BY_TYPE: Record<string, AtmosphereParams> = {
  standard: DEFAULT_ATMOSPHERE_PARAMS,
  terrestrial: {
    ...DEFAULT_ATMOSPHERE_PARAMS,
    scale: atmospherePresets.terrestrial?.maxVertexScale ?? DEFAULT_SCALE,
  },
  ocean: {
    ...DEFAULT_ATMOSPHERE_PARAMS,
    scale: atmospherePresets.ocean?.maxVertexScale ?? DEFAULT_SCALE,
  },
  gasgiant: DEFAULT_ATMOSPHERE_PARAMS,
  ice: {
    atmosphereFactors: [0.498, 0.498, 0.498, 1.0],
    scatteringFactors: [0.569, 0.663, 0.749, 1.5],
    wavelengths: [0.650, 0.570, 0.475],
    scale: atmospherePresets.ice?.maxVertexScale ?? DEFAULT_SCALE,
  },
  lava: {
    atmosphereFactors: [0.902, 0.620, 0.137, 1.0],
    scatteringFactors: [0.733, 0.714, 0.639, 1.5],
    wavelengths: [0.600, 0.550, 0.500],
    scale: atmospherePresets.lava?.maxVertexScale ?? DEFAULT_SCALE,
  },
  plasma: {
    atmosphereFactors: [0.016, 0.329, 0.710, 1.0],
    scatteringFactors: [0.733, 0.714, 0.639, 1.5],
    wavelengths: [0.580, 0.530, 0.470],
    scale: DEFAULT_SCALE,
  },
  sandstorm: {
    atmosphereFactors: [0.9, 0.85, 0.75, 1.0],
    scatteringFactors: [1.0, 1.0, 1.0, 1.5],
    wavelengths: [0.600, 0.580, 0.560],
    scale: DEFAULT_SCALE,
  },
  thunderstorm: {
    atmosphereFactors: [0.6, 0.6, 0.7, 1.0],
    scatteringFactors: [1.0, 1.0, 1.0, 1.5],
    wavelengths: [0.650, 0.570, 0.475],
    scale: DEFAULT_SCALE,
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
      return 'lava'
    default:
      return 'basic'
  }
}

const TEXTURE_BASE = '/models/planets/textures/'

export function getTexturePath(relativePath: string): string {
  return TEXTURE_BASE + relativePath
}
