#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import https from 'https'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const RESFILE_INDEX = path.join(ROOT, 'resfileindex.txt')
const OUTPUT_DIR = path.join(ROOT, 'assets', 'stargates')
const EVE_CDN = 'https://resources.eveonline.com'

const STARGATE_MODELS = [
  { faction: 'amarr', code: 'asg', name: 'Amarr System' },
  { faction: 'amarr', code: 'asmg', name: 'Amarr System-Medium' },
  { faction: 'amarr', code: 'ahg', name: 'Amarr Huge' },
  { faction: 'amarr', code: 'abg', name: 'Amarr Border' },
  { faction: 'caldari', code: 'csg', name: 'Caldari System' },
  { faction: 'caldari', code: 'csmg', name: 'Caldari System-Medium' },
  { faction: 'caldari', code: 'chg', name: 'Caldari Huge' },
  { faction: 'caldari', code: 'cbg', name: 'Caldari Border' },
  { faction: 'gallente', code: 'gsg', name: 'Gallente System' },
  { faction: 'gallente', code: 'gsmg', name: 'Gallente System-Medium' },
  { faction: 'gallente', code: 'ghg', name: 'Gallente Huge' },
  { faction: 'gallente', code: 'gbg', name: 'Gallente Border' },
  { faction: 'minmatar', code: 'msg', name: 'Minmatar System' },
  { faction: 'minmatar', code: 'msmg', name: 'Minmatar System-Medium' },
  { faction: 'minmatar', code: 'mhg', name: 'Minmatar Huge' },
  { faction: 'minmatar', code: 'mbg', name: 'Minmatar Border' },
  { faction: 'triglavian', code: 'tgg2', name: 'Triglavian' },
  { faction: 'smuggler', code: 'ssg', name: 'Smuggler' },
]

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

async function downloadStargateAssets() {
  if (!fs.existsSync(RESFILE_INDEX)) {
    console.error('Error: resfileindex.txt not found in project root')
    console.error('Copy it from: C:\\Users\\<User>\\Documents\\Sharedcache\\tq\\resfileindex.txt')
    process.exit(1)
  }

  console.log('Parsing resfileindex.txt...')
  const resIndex = parseResFileIndex()

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  for (const gate of STARGATE_MODELS) {
    const gateDir = path.join(OUTPUT_DIR, gate.code)
    fs.mkdirSync(gateDir, { recursive: true })

    const basePath = `res:/dx9/model/jumpgate/${gate.faction}/${gate.code}/`

    const filesToDownload = []

    for (const [resPath, hashPath] of resIndex.entries()) {
      if (!resPath.startsWith(basePath)) continue
      if (resPath.includes('lowdetail')) continue
      if (resPath.includes('/effect/')) continue
      if (resPath.includes('/construction/')) continue
      if (resPath.includes('/wreck/')) continue
      if (resPath.includes('/debris/')) continue

      const filename = path.basename(resPath)
      const ext = path.extname(filename).toLowerCase()

      if (['.gr2', '.dds', '.png', '.jpg'].includes(ext)) {
        filesToDownload.push({ resPath, hashPath, filename })
      }
    }

    if (filesToDownload.length === 0) {
      console.log(`  ${gate.name}: No files found`)
      continue
    }

    console.log(`\n${gate.name} (${gate.code}):`)

    for (const { hashPath, filename } of filesToDownload) {
      const destPath = path.join(gateDir, filename)

      if (fs.existsSync(destPath)) {
        console.log(`  ✓ ${filename} (exists)`)
        continue
      }

      const url = `${EVE_CDN}/${hashPath}`
      process.stdout.write(`  ↓ ${filename}...`)

      try {
        await download(url, destPath)
        console.log(' done')
      } catch (err) {
        console.log(` FAILED: ${err.message}`)
      }
    }
  }

  console.log('\n=== Download Complete ===')
  console.log(`\nFiles saved to: ${OUTPUT_DIR}`)
  console.log('\nNext steps:')
  console.log('1. Copy the .gr2 files to Windows')
  console.log('2. Run evegr2toobj.exe to convert to .obj:')
  console.log('   evegr2toobj.exe asmg.gr2 asmg.obj')
  console.log('3. Copy .obj files back to assets/stargates/<code>/')
  console.log('4. Optionally convert .obj to .glb for web:')
  console.log('   npx obj2gltf -i asmg.obj -o asmg.glb')
}

downloadStargateAssets().catch(console.error)
