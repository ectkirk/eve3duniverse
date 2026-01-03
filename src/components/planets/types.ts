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
