#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SDE_DIR = path.join(__dirname, '../.tmp')
const OUTPUT_FILE = path.join(__dirname, '../src/data/universe.json')

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

  const [rawRegions, rawConstellations, rawSystems, rawStars, rawStargates, rawPlanets] =
    await Promise.all([
      parseJsonl('mapRegions.jsonl'),
      parseJsonl('mapConstellations.jsonl'),
      parseJsonl('mapSolarSystems.jsonl'),
      parseJsonl('mapStars.jsonl'),
      parseJsonl('mapStargates.jsonl'),
      parseJsonl('mapPlanets.jsonl'),
    ])

  console.log(`  Regions: ${rawRegions.length}`)
  console.log(`  Constellations: ${rawConstellations.length}`)
  console.log(`  Systems: ${rawSystems.length}`)
  console.log(`  Stars: ${rawStars.length}`)
  console.log(`  Stargates: ${rawStargates.length}`)
  console.log(`  Planets: ${rawPlanets.length}`)

  const starsById = new Map()
  for (const star of rawStars) {
    starsById.set(star._key, star)
  }

  const planetsBySystemId = new Map()
  for (const planet of rawPlanets) {
    const systemId = planet.solarSystemID
    if (!planetsBySystemId.has(systemId)) {
      planetsBySystemId.set(systemId, [])
    }
    planetsBySystemId.get(systemId).push({
      id: planet._key,
      typeId: planet.typeID,
      celestialIndex: planet.celestialIndex,
      radius: planet.radius,
      orbitRadius: planet.statistics?.orbitRadius ?? 0,
      orbitPeriod: planet.statistics?.orbitPeriod ?? 0,
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

  const stargates = []
  const seenConnections = new Set()
  for (const sg of rawStargates) {
    const from = sg.solarSystemID
    const to = sg.destination?.solarSystemID
    if (!from || !to) continue

    const key = from < to ? `${from}-${to}` : `${to}-${from}`
    if (seenConnections.has(key)) continue
    seenConnections.add(key)

    stargates.push({ fromSystemId: from, toSystemId: to })
  }

  const universeData = { regions, constellations, systems, stargates }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(universeData))

  const stats = fs.statSync(OUTPUT_FILE)
  console.log(`\nOutput: ${OUTPUT_FILE}`)
  console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`)
  console.log(`\nSummary:`)
  console.log(`  Regions: ${Object.keys(regions).length}`)
  console.log(`  Constellations: ${Object.keys(constellations).length}`)
  console.log(`  Systems: ${Object.keys(systems).length}`)
  console.log(`  Stargates: ${stargates.length}`)
}

buildUniverseData().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
