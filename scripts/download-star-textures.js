#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import https from 'https'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const RESFILE_INDEX = path.join(ROOT, 'resfileindex.txt')
const OUTPUT_DIR = path.join(ROOT, 'assets', 'stars')
const EVE_CDN = 'https://resources.eveonline.com'

const STAR_TEXTURES = {
  surface: [
    'sunsurface_01a.dds',
    'sunsurface_01b.dds',
    'sunsurface_01c.dds',
    'sunsurface_01a_mod.dds',
    'sunsurface_01b_mod.dds',
  ],
  surfacePole: [
    'sunsurfacepole_01a.dds',
    'sunsurfacepole_01b.dds',
    'sunsurfacepole_01c.dds',
  ],
  ramp: [
    'sunramp_blue_01a.dds',
    'sunramp_blue_01b.dds',
    'sunramp_blue_01c.dds',
    'sunramp_orange_01a.dds',
    'sunramp_orange_01b.dds',
    'sunramp_orange_01c.dds',
    'sunramp_pink_01a.dds',
    'sunramp_pink_01b.dds',
    'sunramp_purple_01a.dds',
    'sunramp_red_01a.dds',
    'sunramp_redblue_01a.dds',
    'sunramp_white_01a.dds',
    'sunramp_white_01b.dds',
    'sunramp_yellow_01a.dds',
  ],
  corona: [
    'sunrampcorona_blue_01a.dds',
    'sunrampcorona_blue_01b.dds',
    'sunrampcorona_blue_01c.dds',
    'sunrampcorona_orange_01a.dds',
    'sunrampcorona_orange_01b.dds',
    'sunrampcorona_orange_01c.dds',
    'sunrampcorona_pink_01a.dds',
    'sunrampcorona_pink_01b.dds',
    'sunrampcorona_purple_01a.dds',
    'sunrampcorona_purple_01b.dds',
    'sunrampcorona_red_01a.dds',
    'sunrampcorona_white_01a.dds',
    'sunrampcorona_white_01b.dds',
    'sunrampcorona_yellow_01a.dds',
    'sunrampcorona_yellow_01c.dds',
  ],
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

async function downloadStarAssets() {
  if (!fs.existsSync(RESFILE_INDEX)) {
    console.error('Error: resfileindex.txt not found in project root')
    console.error('Copy it from: C:\\Users\\<User>\\Documents\\Sharedcache\\tq\\resfileindex.txt')
    process.exit(1)
  }

  console.log('Parsing resfileindex.txt...')
  const resIndex = parseResFileIndex()

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  for (const [category, files] of Object.entries(STAR_TEXTURES)) {
    console.log(`\n=== ${category.toUpperCase()} ===`)

    for (const filename of files) {
      const resPath = `res:/dx9/model/celestial/sun/${filename}`
      const hashPath = resIndex.get(resPath)

      if (!hashPath) {
        console.log(`  ✗ ${filename} (not found in index)`)
        continue
      }

      const destPath = path.join(OUTPUT_DIR, filename)

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

  console.log('\n=== Download Complete ===')
  console.log(`\nFiles saved to: ${OUTPUT_DIR}`)
  console.log('\nNext steps:')
  console.log('1. Convert .dds textures to .png using Python Pillow')
  console.log('2. Copy to public/models/stars/')
}

downloadStarAssets().catch(console.error)
