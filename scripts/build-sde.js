#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SDE_DIR = path.join(__dirname, '../.tmp')
const OUTPUT_FILE = path.join(__dirname, '../src/data/universe.json')
const GRAPHICS_OUTPUT = path.join(__dirname, '../src/data/planet-graphics.json')

async function parseJsonl(filename) {
  const filepath = path.join(SDE_DIR, filename)
  if (!fs.existsSync(filepath)) {
    throw new Error(`File not found: ${filepath}`)
  }

  const items = []
  const rl = readline.createInterface({
    input: fs.createReadStream(filepath),
    crlfDelay: Infinity,
  })

  for await (const line of rl) {
    if (line.trim()) {
      items.push(JSON.parse(line))
    }
  }

  return items
}

async function buildUniverseData() {
  console.log('Parsing SDE files...')

  const [rawRegions, rawConstellations, rawSystems, rawStars, rawStargates, rawPlanets, rawGraphics] =
    await Promise.all([
      parseJsonl('mapRegions.jsonl'),
      parseJsonl('mapConstellations.jsonl'),
      parseJsonl('mapSolarSystems.jsonl'),
      parseJsonl('mapStars.jsonl'),
      parseJsonl('mapStargates.jsonl'),
      parseJsonl('mapPlanets.jsonl'),
      parseJsonl('graphics.jsonl'),
    ])

  console.log(`  Regions: ${rawRegions.length}`)
  console.log(`  Constellations: ${rawConstellations.length}`)
  console.log(`  Systems: ${rawSystems.length}`)
  console.log(`  Stars: ${rawStars.length}`)
  console.log(`  Stargates: ${rawStargates.length}`)
  console.log(`  Planets: ${rawPlanets.length}`)
  console.log(`  Graphics: ${rawGraphics.length}`)

  const starsById = new Map()
  for (const star of rawStars) {
    starsById.set(star._key, star)
  }

  const graphicsById = new Map()
  for (const g of rawGraphics) {
    if (g.graphicFile) {
      graphicsById.set(g._key, g.graphicFile)
    }
  }

  const planetsBySystemId = new Map()
  const usedGraphicIds = new Set()
  for (const planet of rawPlanets) {
    const systemId = planet.solarSystemID
    if (!planetsBySystemId.has(systemId)) {
      planetsBySystemId.set(systemId, [])
    }
    const attrs = planet.attributes ?? {}
    if (attrs.heightMap1) usedGraphicIds.add(attrs.heightMap1)
    if (attrs.heightMap2) usedGraphicIds.add(attrs.heightMap2)
    if (attrs.shaderPreset) usedGraphicIds.add(attrs.shaderPreset)

    planetsBySystemId.get(systemId).push({
      id: planet._key,
      typeId: planet.typeID,
      celestialIndex: planet.celestialIndex,
      radius: planet.radius,
      orbitRadius: planet.statistics?.orbitRadius ?? 0,
      orbitPeriod: planet.statistics?.orbitPeriod ?? 0,
      temperature: planet.statistics?.temperature ?? 0,
      eccentricity: planet.statistics?.eccentricity ?? 0,
      rotationRate: planet.statistics?.rotationRate ?? 0,
      locked: planet.statistics?.locked ?? false,
      position: planet.position,
      heightMap1: attrs.heightMap1 ?? null,
      heightMap2: attrs.heightMap2 ?? null,
      shaderPreset: attrs.shaderPreset ?? null,
      population: attrs.population ?? false,
    })
  }

  const regions = {}
  for (const r of rawRegions) {
    regions[r._key] = {
      id: r._key,
      name: r.name?.en ?? `Region ${r._key}`,
      position: r.position,
    }
  }

  const constellations = {}
  for (const c of rawConstellations) {
    constellations[c._key] = {
      id: c._key,
      name: c.name?.en ?? `Constellation ${c._key}`,
      regionId: c.regionID,
      position: c.position,
    }
  }

  const systems = {}
  for (const s of rawSystems) {
    const star = starsById.get(s.starID)
    const planets = planetsBySystemId.get(s._key) ?? []
    planets.sort((a, b) => a.celestialIndex - b.celestialIndex)

    systems[s._key] = {
      id: s._key,
      name: s.name?.en ?? `System ${s._key}`,
      constellationId: s.constellationID,
      regionId: s.regionID,
      securityStatus: s.securityStatus,
      position: s.position,
      star: star
        ? {
            id: star._key,
            typeId: star.typeID,
            radius: star.radius,
            spectralClass: star.statistics?.spectralClass ?? 'G',
            temperature: star.statistics?.temperature ?? 5000,
            luminosity: star.statistics?.luminosity ?? 1,
            age: star.statistics?.age ?? 0,
            life: star.statistics?.life ?? 0,
          }
        : null,
      planets,
    }
  }

  const stargates = {}
  for (const sg of rawStargates) {
    if (!sg.solarSystemID || !sg.destination?.solarSystemID) continue

    stargates[sg._key] = {
      id: sg._key,
      systemId: sg.solarSystemID,
      destinationSystemId: sg.destination.solarSystemID,
      destinationStargateId: sg.destination.stargateID,
      typeId: sg.typeID,
      position: sg.position,
    }
  }

  const universeData = { regions, constellations, systems, stargates }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(universeData))

  const stats = fs.statSync(OUTPUT_FILE)
  console.log(`\nOutput: ${OUTPUT_FILE}`)
  console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`)

  const planetGraphics = {}
  for (const gid of usedGraphicIds) {
    const resPath = graphicsById.get(gid)
    if (resPath) {
      let webpPath = resPath.toLowerCase()
      if (webpPath.includes('/worldobject/planet/')) {
        webpPath = webpPath.split('/worldobject/planet/')[1]
      } else if (webpPath.includes('/planet/')) {
        webpPath = webpPath.split('/planet/')[1]
      }
      webpPath = webpPath.replace('.red', '.black').replace('.dds', '.webp')
      planetGraphics[gid] = webpPath
    }
  }

  fs.writeFileSync(GRAPHICS_OUTPUT, JSON.stringify(planetGraphics, null, 2))
  console.log(`\nPlanet graphics: ${GRAPHICS_OUTPUT}`)
  console.log(`  GraphicIDs mapped: ${Object.keys(planetGraphics).length}`)

  console.log(`\nSummary:`)
  console.log(`  Regions: ${Object.keys(regions).length}`)
  console.log(`  Constellations: ${Object.keys(constellations).length}`)
  console.log(`  Systems: ${Object.keys(systems).length}`)
  console.log(`  Stargates: ${Object.keys(stargates).length}`)
}

buildUniverseData().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
