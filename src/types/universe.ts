export interface Position {
  x: number
  y: number
  z: number
}

export interface Star {
  id: number
  typeId: number
  radius: number
  spectralClass: string
  temperature: number
  luminosity: number
  age: number
  life: number
}

export interface Planet {
  id: number
  typeId: number
  celestialIndex: number
  radius: number
  orbitRadius: number
  orbitPeriod: number
  temperature: number
  eccentricity: number
  locked: boolean
  position: Position
}

export interface Region {
  id: number
  name: string
  position: Position
}

export interface Constellation {
  id: number
  name: string
  regionId: number
  position: Position
}

export interface SolarSystem {
  id: number
  name: string
  constellationId: number
  regionId: number
  securityStatus: number
  position: Position
  star: Star | null
  planets: Planet[]
}

export interface Stargate {
  id: number
  systemId: number
  destinationSystemId: number
  destinationStargateId: number
  typeId: number
  position: Position
}

export const STARGATE_MODELS: Record<number, string> = {
  16: 'csg',      // Caldari System
  17: 'asmg',     // Amarr Constellation
  3873: 'cbg',    // Caldari Border
  3874: 'gsmg',   // Gallente Constellation
  3875: 'gsg',    // Gallente System
  3876: 'gbg',    // Gallente Border
  3877: 'msmg',   // Minmatar Constellation
  12292: 'ssg',   // Smuggler Route
  29624: 'asg',   // Amarr System
  29625: 'abg',   // Amarr Border
  29626: 'ahg',   // Amarr Region
  29627: 'csmg',  // Caldari Constellation
  29629: 'chg',   // Caldari Region
  29632: 'ghg',   // Gallente Region
  29633: 'msg',   // Minmatar System
  29634: 'mbg',   // Minmatar Border
  29635: 'mhg',   // Minmatar Region
  56317: 'tgg2',  // Pochven Conduit
}

export interface UniverseData {
  regions: Record<string, Region>
  constellations: Record<string, Constellation>
  systems: Record<string, SolarSystem>
  stargates: Record<string, Stargate>
}

export interface StarTextureSet {
  ramp: string
  corona: string
}

export function getStarTextures(spectralClass: string): StarTextureSet {
  const letter = spectralClass.charAt(0).toUpperCase()
  switch (letter) {
    case 'O':
    case 'B':
      return { ramp: 'sunramp_blue_01a', corona: 'sunrampcorona_blue_01a' }
    case 'A':
      return { ramp: 'sunramp_white_01a', corona: 'sunrampcorona_white_01a' }
    case 'F':
      return { ramp: 'sunramp_white_01b', corona: 'sunrampcorona_white_01b' }
    case 'G':
      return { ramp: 'sunramp_yellow_01a', corona: 'sunrampcorona_yellow_01a' }
    case 'K':
      return { ramp: 'sunramp_orange_01a', corona: 'sunrampcorona_orange_01a' }
    case 'M':
      return { ramp: 'sunramp_red_01a', corona: 'sunrampcorona_red_01a' }
    case 'W':
      return { ramp: 'sunramp_blue_01c', corona: 'sunrampcorona_blue_01c' }
    case 'D':
      return { ramp: 'sunramp_white_01a', corona: 'sunrampcorona_white_01a' }
    default:
      return { ramp: 'sunramp_yellow_01a', corona: 'sunrampcorona_yellow_01a' }
  }
}
