/**
 * Planet Rendering Constants
 *
 * Sources:
 * - ccpwgl: https://github.com/ccpgames/ccpwgl/blob/master/src/eve/object/EvePlanet.js
 * - EVE .black files: Parsed shader presets from EVE CDN
 * - DXBC decompilation: Disassembled EVE shader bytecode
 *
 * All magic numbers should be documented with their source.
 */

/**
 * Height map baking constants
 * Source: ccpwgl EvePlanet.js MeshLoaded() method
 */
export const HEIGHT_MAP = {
  WIDTH: 2048,
  HEIGHT: 1024,
  RANDOM_SEED_MOD: 100, // itemID % 100 for procedural variation
} as const

/**
 * Animation speed constants
 * Source: EVE .black file analysis and shader decompilation
 */
export const ANIMATION = {
  /** Base UV animation speed per time unit */
  SURFACE_SPEED: 0.002,
  /** Cloud layer horizontal drift speed */
  CLOUD_SPEED: 0.008,
  /** Polar cloud cap drift speed (slower than main clouds) */
  CLOUD_CAP_SPEED: 0.004,
  /** Gas giant band animation multiplier */
  GAS_BAND_SPEED_SCALE: 0.002,
  /** Gas giant turbulence noise animation */
  NOISE_SPEED_SCALE: 0.05,
  /** Lava surface flow animation speed */
  LAVA_NOISE_SPEED: 0.02,
} as const

/**
 * Lighting model constants
 * Source: DXBC shader decompilation (atmosphere.sm_hi, earthlikeplanet.sm_hi)
 */
export const LIGHTING = {
  /** Minimum shadow intensity on night side (ambient) */
  SHADOW_FLOOR: 0.15,
  /** Shadow depth variation range (1 - SHADOW_FLOOR) */
  SHADOW_RANGE: 0.85,
  /** Fresnel rim effect exponent */
  FRESNEL_POWER: 3.0,
  /** NdotL threshold for city light visibility */
  NIGHT_THRESHOLD: -0.15,
  /** City light glow intensity multiplier */
  CITY_GLOW_INTENSITY: 2.0,
  /** Cloud layer base opacity */
  CLOUD_ALPHA: 0.7,
  /** Atmospheric scatter rim strength */
  SCATTER_STRENGTH: 0.8,
  /** Height map sampling offset for normal calculation */
  HEIGHT_SAMPLE_DELTA: 0.002,
  /** Normal perturbation strength */
  NORMAL_STRENGTH: 2.0,
} as const

/**
 * Gas giant rendering constants
 * Source: shader-presets.json parameter analysis, ccpwgl gasgiant.fx
 */
export const GAS_GIANT = {
  /** Default WindFactors when not in preset [baseSpeed, latVariation, noiseSpeed, distortion] */
  DEFAULT_WIND_FACTORS: [0.3, 0.5, 0.2, 0.12] as const,
  /** Default DistoFactors (distortion scale / 10 in shader) */
  DEFAULT_DISTO_FACTORS: [4.0, 0, 0, 0] as const,
  /** Default saturation boost - ccpwgl uses 2.0 for all gas giants */
  DEFAULT_SATURATION: [2.0, 0, 0, 0] as const,
  /** Latitude factor scale for band position */
  LAT_FACTOR_SCALE: 2.0,
  /** Wind speed variation by latitude multiplier */
  LAT_VARIATION_SCALE: 4.0,
  /** Default mixer value when no mixer texture available */
  MIXER_DEFAULT: 0.5,
  /** Base band luminance intensity */
  PATTERN_INTENSITY_BASE: 0.8,
  /** Band alpha contribution to intensity */
  PATTERN_INTENSITY_RANGE: 0.4,
  /** Minimum brightness at poles */
  POLE_DARKEN_BASE: 0.7,
  /** Pole mask influence on brightness */
  POLE_DARKEN_RANGE: 0.3,
  /** Polar cap tint multiplier */
  CAP_TINT_SCALE: 4.0,
  /** Noise contribution to color */
  NOISE_COLOR_STRENGTH: 0.1,
  /** Height map influence on brightness */
  HEIGHT_INFLUENCE_BASE: 0.85,
  HEIGHT_INFLUENCE_RANGE: 0.3,
} as const

/**
 * Lava/Plasma planet constants
 * Source: DXBC lavaplanet.sm_hi decompilation
 */
export const LAVA = {
  /** Temperature normalization divisor */
  TEMP_SCALE: 1500.0,
  /** Minimum temperature factor (clamped) */
  TEMP_CLAMP_MIN: 0.5,
  /** Maximum temperature factor (clamped) */
  TEMP_CLAMP_MAX: 2.0,
  /** Primary pulse minimum intensity */
  PULSE_BASE: 0.85,
  /** Primary pulse variation range */
  PULSE_RANGE: 0.15,
  /** Primary pulse oscillation frequency */
  PULSE_FREQ: 0.8,
  /** Secondary emissive glow base */
  SECONDARY_GLOW: 0.15,
  /** Secondary glow oscillation frequency */
  SECONDARY_FREQ: 1.2,
  /** Lava glow color (orange-red) */
  GLOW_COLOR: [1.0, 0.3, 0.1] as const,
  /** Noise texture influence on glow */
  NOISE_GLOW_STRENGTH: 0.2,
  /** Noise contribution to pulse phase offset */
  NOISE_OFFSET_SCALE: 0.3,
  /** Animation speed reduction for lava (slower than base) */
  ANIM_SPEED_FACTOR: 0.3,
} as const

/**
 * Thunderstorm planet constants
 * Source: Shader analysis, EVE thunderstorm.black presets
 */
export const THUNDERSTORM = {
  /** Base flash pulse frequency (Hz) */
  FLASH_FREQ: 8.0,
  /** Flash sharpness exponent (higher = sharper peaks) */
  FLASH_POWER: 15.0,
  /** Flash probability threshold [0-1] */
  FLASH_THRESHOLD: 0.92,
  /** Flash timing period divisor */
  FLASH_TIMING_PERIOD: 0.2,
  /** Procedural lightning pulse frequency */
  LIGHTNING_FREQ: 15.0,
  /** Lightning sharpness exponent */
  LIGHTNING_POWER: 20.0,
  /** Lightning probability threshold */
  LIGHTNING_THRESHOLD: 0.97,
  /** Lightning timing period */
  LIGHTNING_TIMING_PERIOD: 0.3,
  /** Primary lightning color (blue-white) */
  LIGHTNING_COLOR: [0.7, 0.8, 1.0] as const,
  /** Alternative lightning color (brighter) */
  LIGHTNING_COLOR_ALT: [0.8, 0.85, 1.0] as const,
  /** Lightning brightness multiplier with texture */
  LIGHTNING_INTENSITY: 3.0,
  /** Lightning brightness without texture */
  LIGHTNING_INTENSITY_PROC: 2.0,
  /** Lightning texture UV scale [x, y] */
  LIGHTNING_UV_SCALE: [2.0, 1.0] as const,
  /** Lightning texture horizontal drift speed */
  LIGHTNING_ANIM_SPEED: 0.1,
  /** Hash constant for pseudo-random lightning */
  HASH_CONSTANT: 43758.5453,
} as const

/**
 * Plasma planet constants (variant of lava with lightning)
 * Source: EVE plasma.black presets, distinct atmosphere color
 */
export const PLASMA = {
  /** Plasma uses same pulse as lava but with lightning overlay */
  ...LAVA,
  /** Blue-tinted glow instead of orange */
  GLOW_COLOR: [0.3, 0.5, 1.0] as const,
} as const

/**
 * Atmosphere rendering constants
 * Source: DXBC atmosphere.sm_hi, EVE atmosphere.black files
 */
export const ATMOSPHERE = {
  /** Default atmosphere shell radius multiplier */
  DEFAULT_SCALE: 1.025,
  /** Henyey-Greenstein asymmetry parameter for Mie scattering */
  MIE_G: 0.995,
  /** Maximum atmosphere opacity */
  ALPHA_MAX: 0.85,
  /** Rayleigh phase function coefficient */
  RAYLEIGH_PHASE_COEFF: 0.75,
} as const

/**
 * Type-specific atmosphere scales
 * Source: EVE *atmosphere.black files, maxVertexScale parameter
 */
export const ATMOSPHERE_SCALES: Record<string, number> = {
  terrestrial: 1.015,
  ocean: 1.02563,
  ice: 1.015,
  lava: 1.025,
  plasma: 1.025,
  sandstorm: 1.025,
  thunderstorm: 1.025,
  gasgiant: 1.025,
}

/**
 * Planet type IDs for shader branching
 * Maps to uPlanetType uniform in fragment shader
 */
export const PLANET_TYPE = {
  GAS_GIANT: 0,
  TERRESTRIAL: 1,
  OCEAN: 2,
  LAVA: 3,
  ICE: 4,
  THUNDERSTORM: 5,
  SANDSTORM: 6,
  PLASMA: 7,
  SHATTERED: 8,
} as const

/**
 * Map preset type string to planet type ID
 */
export function getPlanetTypeId(presetType: string): number {
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

/**
 * Terrestrial-like planet types (share same base shader path)
 * Source: ccpwgl - these types use earthlikeplanet.fx with minor variations
 */
export const TERRESTRIAL_TYPES = new Set([
  PLANET_TYPE.TERRESTRIAL,
  PLANET_TYPE.OCEAN,
  PLANET_TYPE.ICE,
  PLANET_TYPE.SANDSTORM,
])

/**
 * Default atmosphere parameters by type
 * Source: EVE *atmosphere.black files
 */
export const ATMOSPHERE_PARAMS = {
  standard: {
    atmosphereFactors: [0.545, 0.604, 0.651, 1.0] as const,
    scatteringFactors: [1.0, 1.0, 1.0, 1.5] as const,
    wavelengths: [0.650, 0.570, 0.475] as const,
  },
  terrestrial: {
    atmosphereFactors: [0.545, 0.604, 0.651, 1.0] as const,
    scatteringFactors: [0.5451, 0.6039, 0.651, 1.0] as const,
    wavelengths: [0.650, 0.570, 0.475] as const,
  },
  ocean: {
    atmosphereFactors: [0.545, 0.584, 0.620, 1.0] as const,
    scatteringFactors: [0.5451, 0.5843, 0.6196, 1.0] as const,
    wavelengths: [0.650, 0.570, 0.475] as const,
  },
  ice: {
    atmosphereFactors: [0.498, 0.498, 0.498, 1.0] as const,
    scatteringFactors: [0.569, 0.663, 0.749, 1.5] as const,
    wavelengths: [0.650, 0.570, 0.475] as const,
  },
  lava: {
    atmosphereFactors: [0.902, 0.620, 0.137, 1.0] as const,
    scatteringFactors: [0.733, 0.714, 0.639, 1.5] as const,
    wavelengths: [0.600, 0.550, 0.500] as const,
  },
  plasma: {
    atmosphereFactors: [0.016, 0.329, 0.710, 1.0] as const,
    scatteringFactors: [0.733, 0.714, 0.639, 1.5] as const,
    wavelengths: [0.580, 0.530, 0.470] as const,
  },
  sandstorm: {
    atmosphereFactors: [0.9, 0.85, 0.75, 1.0] as const,
    scatteringFactors: [1.0, 1.0, 1.0, 1.5] as const,
    wavelengths: [0.600, 0.580, 0.560] as const,
  },
  thunderstorm: {
    atmosphereFactors: [0.6, 0.6, 0.7, 1.0] as const,
    scatteringFactors: [1.0, 1.0, 1.0, 1.5] as const,
    wavelengths: [0.650, 0.570, 0.475] as const,
  },
  gasgiant: {
    atmosphereFactors: [0.545, 0.604, 0.651, 1.0] as const,
    scatteringFactors: [1.0, 1.0, 1.0, 1.5] as const,
    wavelengths: [0.650, 0.570, 0.475] as const,
  },
} as const
