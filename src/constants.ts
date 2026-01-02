// EVE coordinates are in meters. This converts to manageable scene units.
export const EVE_COORDINATE_SCALE = 1e-15

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
