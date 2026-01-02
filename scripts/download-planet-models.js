#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import https from 'https'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const RESFILE_INDEX = path.join(ROOT, 'resfileindex.txt')
const OUTPUT_DIR = path.join(ROOT, 'assets', 'planets')
const EVE_CDN = 'https://resources.eveonline.com'

const PLANET_TEXTURES = {
  gasgiant: {
    diffuse: ['gasgiant01_d.dds', 'gasgiant02_d.dds', 'gasgiant03_d.dds'],
    detail: ['gasgiantdetail01_m.dds', 'gasgiantdetail02_m.dds'],
    rings: ['gasgiantring01_d.dds', 'gasgiantring02_d.dds', 'gasgiantring03_d.dds'],
    mixer: ['gasgiant_mixer_tex.dds'],
  },
  ice: {
    height: ['ice01_h.dds', 'ice02_h.dds'],
    detail: ['icedetail01_p.dds', 'icedetail02_p.dds'],
    colorize: ['iceplanetcolorizemap01_p.dds', 'iceplanetcolorizemap_blue_p.dds'],
  },
  lava: {
    height: ['lava01_h.dds', 'lava02_h.dds'],
    magma: ['lavamagma01_p.dds', 'lavamagma02_p.dds'],
  },
  terrestrial: {
    height: ['terrestrial01_h.dds', 'terrestrial02_h.dds', 'terrestrial03_h.dds'],
    detail: ['terrestrialdetail01_p.dds', 'terrestrialdetail02_p.dds'],
    clouds: ['clouddense01_m.dds', 'cloudsparse01_m.dds'],
    citylight: ['citylight01_g.dds'],
  },
  thunderstorm: {
    height: ['thunderstorm01_h.dds', 'thunderstorm02_h.dds'],
    detail: ['thunderstormdetail01_p.dds'],
  },
  sandstorm: {
    height: ['sandstorm01_h.dds', 'sandstorm02_h.dds'],
  },
  shattered: {
    diffuse: ['shatteredplanet_d.dds'],
    normal: ['shatteredplanet_n.dds'],
  },
  aurora: {
    gradients: [
      'gradient_barren.dds',
      'gradient_gasgiant.dds',
      'gradient_ice.dds',
      'gradient_lava.dds',
      'gradient_ocean.dds',
      'gradient_plasma.dds',
      'gradient_temperate.dds',
      'gradient_thunderstorm.dds',
    ],
  },
  preset: {
    scatterHue: [
      'terrestrialscatterhue01_d.dds',
      'terrestrialscatterhue02_d.dds',
      'icescatterhue01_d.dds',
      'icescatterhue02_d.dds',
      'lavascatterhue01_d.dds',
      'lavascatterhue02_d.dds',
      'plasmascatterhue01_d.dds',
      'plasmascatterhue02_d.dds',
      'sandstormscatterhue01_d.dds',
    ],
    scatterLight: [
      'terrestrialscatterlight01_d.dds',
      'icescatterlight01_d.dds',
      'lavascatterlight01_d.dds',
      'plasmascatterlight01_d.dds',
      'sandstormscatterlight01_d.dds',
    ],
  },
  worldobject: {
    masks: ['gradient01_m.dds'],
  },
}

function parseResFileIndex() {
  const content = fs.readFileSync(RESFILE_INDEX, 'utf-8')
  const entries = new Map()

  for (const line of content.split('\n')) {
    if (!line.trim()) continue
    const [resPath, hashPath] = line.split(',')
    if (resPath && hashPath) {
      entries.set(resPath, hashPath)
    }
  }

  return entries
}

function download(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath)
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close()
        fs.unlinkSync(destPath)
        download(response.headers.location, destPath).then(resolve).catch(reject)
        return
      }
      if (response.statusCode !== 200) {
        file.close()
        fs.unlinkSync(destPath)
        reject(new Error(`HTTP ${response.statusCode} for ${url}`))
        return
      }
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', (err) => {
      file.close()
      fs.unlinkSync(destPath)
      reject(err)
    })
  })
}

async function downloadPlanetAssets() {
  if (!fs.existsSync(RESFILE_INDEX)) {
    console.error('Error: resfileindex.txt not found in project root')
    console.error('Copy it from: C:\\Users\\<User>\\Documents\\Sharedcache\\tq\\resfileindex.txt')
    process.exit(1)
  }

  console.log('Parsing resfileindex.txt...')
  const resIndex = parseResFileIndex()

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  for (const [planetType, categories] of Object.entries(PLANET_TEXTURES)) {
    const typeDir = path.join(OUTPUT_DIR, planetType)
    fs.mkdirSync(typeDir, { recursive: true })

    console.log(`\n=== ${planetType.toUpperCase()} ===`)

    for (const [, files] of Object.entries(categories)) {
      for (const filename of files) {
        let resPath
        if (planetType === 'aurora') {
          resPath = `res:/dx9/model/worldobject/planet/aurora/${filename}`
        } else if (planetType === 'preset') {
          resPath = `res:/dx9/model/worldobject/planet/preset/${filename}`
        } else if (planetType === 'shattered' || planetType === 'worldobject') {
          resPath = `res:/dx9/model/worldobject/planet/${filename}`
        } else if (planetType === 'gasgiant' && filename === 'gasgiant_mixer_tex.dds') {
          resPath = `res:/dx9/model/worldobject/planet/gasgiant/${filename}`
        } else {
          resPath = `res:/dx9/model/worldobject/planet/${planetType}/${filename}`
        }

        const hashPath = resIndex.get(resPath)
        if (!hashPath) {
          console.log(`  ✗ ${filename} (not found in index)`)
          continue
        }

        const destPath = path.join(typeDir, filename)

        if (fs.existsSync(destPath)) {
          const stats = fs.statSync(destPath)
          console.log(`  ✓ ${filename} (${(stats.size / 1024 / 1024).toFixed(1)}MB exists)`)
          continue
        }

        const url = `${EVE_CDN}/${hashPath}`
        process.stdout.write(`  ↓ ${filename}...`)

        try {
          await download(url, destPath)
          const stats = fs.statSync(destPath)
          console.log(` ${(stats.size / 1024 / 1024).toFixed(1)}MB`)
        } catch (err) {
          console.log(` FAILED: ${err.message}`)
        }
      }
    }
  }

  // Also download the planet sphere mesh
  const spherePath = 'res:/dx9/model/celestial/environment/planet/planetspheredoublesided.gr2'
  const sphereHash = resIndex.get(spherePath)
  if (sphereHash) {
    const sphereDest = path.join(OUTPUT_DIR, 'planetsphere.gr2')
    if (!fs.existsSync(sphereDest)) {
      console.log('\n=== MESH ===')
      process.stdout.write('  ↓ planetsphere.gr2...')
      try {
        await download(`${EVE_CDN}/${sphereHash}`, sphereDest)
        console.log(' done')
      } catch (err) {
        console.log(` FAILED: ${err.message}`)
      }
    }
  }

  console.log('\n=== Download Complete ===')
  console.log(`\nFiles saved to: ${OUTPUT_DIR}`)
  console.log('\nNext steps:')
  console.log('1. Convert .dds textures to .png using Python Pillow')
  console.log('2. Copy to public/models/planets/')
}

downloadPlanetAssets().catch(console.error)
