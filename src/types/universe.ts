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
}

export interface UniverseData {
  regions: Record<string, Region>
  constellations: Record<string, Constellation>
  systems: Record<string, SolarSystem>
}

export interface Stargate {
  fromSystemId: number
  toSystemId: number
}
