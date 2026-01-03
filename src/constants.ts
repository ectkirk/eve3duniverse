// EVE coordinates are in meters. This converts to manageable scene units.
export const EVE_COORDINATE_SCALE = 1e-15

// Physical constants
export const SOLAR_RADIUS_M = 696340000 // meters

// System view scene scaling (for focused star/planet view)
export const SCENE = {
  BASE_RADIUS: 0.08,
  ORBIT_SCALE: 3e-12,
  STARGATE_SCALE: 0.00002,
  PLANET_RADIUS_MIN: 0.003,
  PLANET_RADIUS_MAX: 0.03,
  STAR_RADIUS_MIN: 0.04,
  STAR_RADIUS_MAX: 0.25,
} as const

export const CAMERA_DEFAULTS = {
  speed: 1,
  minZ: 1,
  maxZ: 50000,
  angularSensibility: 500,
  inertia: 0.9,
} as const

export const STAR_VISUALS = {
  minSize: 1.0,
  maxSize: 8.0,
  defaultTemp: 5000,
  defaultLum: 0.1,
} as const
