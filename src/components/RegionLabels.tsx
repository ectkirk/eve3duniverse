import { useMemo, memo } from 'react'
import { Text } from '@react-three/drei'
import type { Region, SolarSystem } from '../types/universe'
import { EVE_COORDINATE_SCALE } from '../constants'
import { ALLOWED_REGIONS } from '../data/allowedRegions'
import { FONT_PATHS } from '../fonts'

interface RegionLabelsProps {
  regions: Record<string, Region>
  systems: SolarSystem[]
  colorMode: number
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2

  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x }
  else if (h < 120) { r = x; g = c }
  else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c }
  else if (h < 300) { r = x; b = c }
  else { r = c; b = x }

  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function regionColor(x: number, y: number, z: number): string {
  const scale = 0.15
  const hue = Math.abs(((x + y * 1.7 + z * 2.3) * scale * 360) % 360)
  const sat = Math.max(0.6, Math.min(1.0, 0.7 + 0.3 * Math.sin(x * scale * 3.0)))
  const lit = Math.max(0.35, Math.min(0.6, 0.45 + 0.15 * Math.sin(y * scale * 2.5)))
  return hslToHex(hue, sat, lit)
}

export function ccpRound(sec: number): number {
  if (sec < 0) return 0
  if (sec <= 0.05) return Math.ceil(sec * 10) / 10
  return Math.round(sec * 10) / 10
}

function securityColor(sec: number): string {
  const rounded = ccpRound(sec)
  if (rounded >= 0.5) {
    const intensity = (rounded - 0.5) / 0.5
    const hue = 60 + intensity * 180
    const lit = (50 - intensity * 20) / 100
    return hslToHex(hue, 1.0, lit)
  } else if (rounded > 0) {
    const intensity = (rounded - 0.1) / 0.3
    const sat = (60 + intensity * 40) / 100
    const lit = (30 + intensity * 20) / 100
    return hslToHex(30, sat, lit)
  }
  return hslToHex(0, 1.0, 0.4)
}

interface LabelData {
  id: number
  name: string
  position: [number, number, number]
  regionColor: string
  securityColor: string
}

const RegionLabel = memo(function RegionLabel({ label, colorMode }: { label: LabelData; colorMode: number }) {
  const color = colorMode === 2 ? label.regionColor : colorMode === 1 ? label.securityColor : '#ffffff'
  return (
    <Text
      position={label.position}
      fontSize={3}
      color={color}
      anchorX="center"
      anchorY="middle"
      font={FONT_PATHS.regular}
    >
      {label.name}
    </Text>
  )
})

export const RegionLabels = memo(function RegionLabels({ regions, systems, colorMode }: RegionLabelsProps) {
  const labels = useMemo(() => {
    const secByRegion = new Map<number, number[]>()
    for (const sys of systems) {
      const arr = secByRegion.get(sys.regionId) ?? []
      arr.push(sys.securityStatus)
      secByRegion.set(sys.regionId, arr)
    }

    return Object.values(regions)
      .filter((r) => ALLOWED_REGIONS.has(r.name))
      .map((region): LabelData => {
        const px = region.position.x * EVE_COORDINATE_SCALE
        const py = region.position.y * EVE_COORDINATE_SCALE
        const pz = region.position.z * EVE_COORDINATE_SCALE
        const secArr = secByRegion.get(region.id) ?? [0]
        const avgSec = secArr.reduce((a, b) => a + b, 0) / secArr.length
        return {
          id: region.id,
          name: region.name,
          position: [px, py, pz],
          regionColor: regionColor(px, py, pz),
          securityColor: securityColor(avgSec),
        }
      })
  }, [regions, systems])

  return (
    <>
      {labels.map((label) => (
        <RegionLabel key={label.id} label={label} colorMode={colorMode} />
      ))}
    </>
  )
})
