import * as THREE from 'three'

export type PlanetCategory =
  | 'gasgiant'
  | 'terrestrial'
  | 'ice'
  | 'lava'
  | 'oceanic'
  | 'barren'
  | 'storm'
  | 'plasma'
  | 'shattered'

export interface PlanetTextureConfig {
  category: PlanetCategory
  diffuse?: string
  detail?: string
  height?: string
  citylight?: string
  clouds?: string
  colorize?: string
  scatterLight?: string
  scatterHue?: string
  gradient: string
  emissive?: string
  hasAtmosphere: boolean
  hasClouds: boolean
}

export interface OrbitParams {
  semiMajor: number
  semiMinor: number
  inclination: number
  longitudeOfAscending: number
}

export const ATMOSPHERE_COLORS: Record<PlanetCategory, THREE.Color> = {
  gasgiant: new THREE.Color(0.8, 0.7, 0.5),
  terrestrial: new THREE.Color(0.5, 0.7, 1.0),
  ice: new THREE.Color(0.7, 0.9, 1.0),
  lava: new THREE.Color(1.0, 0.3, 0.1),
  oceanic: new THREE.Color(0.3, 0.6, 1.0),
  barren: new THREE.Color(0.6, 0.5, 0.4),
  storm: new THREE.Color(0.5, 0.4, 0.7),
  plasma: new THREE.Color(0.8, 0.3, 1.0),
  shattered: new THREE.Color(0.5, 0.5, 0.5),
}

export function getPlanetConfig(typeId: number): PlanetTextureConfig {
  switch (typeId) {
    case 11:
      return {
        category: 'terrestrial',
        diffuse: 'terrestrialdetail01_p',
        height: 'terrestrial01_h',
        citylight: 'citylight01_g',
        clouds: 'cloudsparse01_m',
        scatterLight: 'terrestrialscatterlight01_d',
        scatterHue: 'terrestrialscatterhue01_d',
        gradient: 'gradient_temperate',
        hasAtmosphere: true,
        hasClouds: true,
      }
    case 12:
      return {
        category: 'ice',
        diffuse: 'icedetail01_p',
        height: 'ice01_h',
        colorize: 'iceplanetcolorizemap01_p',
        scatterLight: 'icescatterlight01_d',
        scatterHue: 'icescatterhue01_d',
        gradient: 'gradient_ice',
        hasAtmosphere: true,
        hasClouds: false,
      }
    case 13:
      return {
        category: 'gasgiant',
        diffuse: 'gasgiant01_d',
        detail: 'gasgiantdetail01_m',
        gradient: 'gradient_gasgiant',
        hasAtmosphere: true,
        hasClouds: false,
      }
    case 2014:
      return {
        category: 'oceanic',
        diffuse: 'terrestrialdetail02_p',
        height: 'terrestrial02_h',
        clouds: 'clouddense01_m',
        scatterLight: 'terrestrialscatterlight01_d',
        scatterHue: 'terrestrialscatterhue02_d',
        gradient: 'gradient_ocean',
        hasAtmosphere: true,
        hasClouds: true,
      }
    case 2015:
      return {
        category: 'lava',
        diffuse: 'lavamagma01_p',
        height: 'lava01_h',
        scatterLight: 'lavascatterlight01_d',
        scatterHue: 'lavascatterhue01_d',
        gradient: 'gradient_lava',
        emissive: 'lavamagma02_p',
        hasAtmosphere: false,
        hasClouds: false,
      }
    case 2016:
      return {
        category: 'barren',
        diffuse: 'terrestrialdetail01_p',
        height: 'terrestrial01_h',
        gradient: 'gradient_barren',
        hasAtmosphere: false,
        hasClouds: false,
      }
    case 2017:
      return {
        category: 'storm',
        diffuse: 'clouddense01_m',
        scatterLight: 'sandstormscatterlight01_d',
        scatterHue: 'sandstormscatterhue01_d',
        gradient: 'gradient_thunderstorm',
        hasAtmosphere: true,
        hasClouds: true,
      }
    case 2063:
      return {
        category: 'plasma',
        diffuse: 'terrestrialdetail02_p',
        scatterLight: 'plasmascatterlight01_d',
        scatterHue: 'plasmascatterhue01_d',
        gradient: 'gradient_plasma',
        hasAtmosphere: true,
        hasClouds: false,
      }
    case 30889:
      return {
        category: 'barren',
        diffuse: 'terrestrialdetail01_p',
        gradient: 'gradient_barren',
        hasAtmosphere: false,
        hasClouds: false,
      }
    case 73911:
      return {
        category: 'lava',
        diffuse: 'lavamagma02_p',
        height: 'lava02_h',
        scatterLight: 'lavascatterlight01_d',
        scatterHue: 'lavascatterhue02_d',
        gradient: 'gradient_lava',
        emissive: 'lavamagma01_p',
        hasAtmosphere: false,
        hasClouds: false,
      }
    default:
      return {
        category: 'barren',
        diffuse: 'terrestrialdetail01_p',
        gradient: 'gradient_barren',
        hasAtmosphere: false,
        hasClouds: false,
      }
  }
}

const CATEGORY_TO_FOLDER: Record<PlanetCategory, string> = {
  gasgiant: 'gasgiant',
  terrestrial: 'terrestrial',
  ice: 'ice',
  lava: 'lava',
  oceanic: 'terrestrial',
  barren: 'terrestrial',
  storm: 'terrestrial',
  plasma: 'terrestrial',
  shattered: 'shattered',
}

export function getTexturePath(category: PlanetCategory, filename: string, useDDS = true): string {
  const ext = useDDS ? 'dds' : 'png'
  const base = useDDS ? '/models/planets/dds' : '/models/planets'

  if (filename.startsWith('gradient_')) {
    return `${base}/aurora/${filename}.${ext}`
  }
  if (filename.includes('scatter')) {
    return `${base}/preset/${filename}.${ext}`
  }
  if (filename === 'gradient01_m') {
    return `${base}/worldobject/${filename}.${ext}`
  }
  return `${base}/${CATEGORY_TO_FOLDER[category]}/${filename}.${ext}`
}
