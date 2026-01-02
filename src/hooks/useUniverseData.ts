import { useState, useEffect, useMemo } from 'react'
import type { SolarSystem, Region, Constellation, Stargate } from '../types/universe'
import { ALLOWED_REGIONS } from '../data/allowedRegions'
import universeData from '../data/universe.json'

interface UseUniverseDataResult {
  systems: SolarSystem[]
  regions: Record<string, Region>
  constellations: Record<string, Constellation>
  stargates: Record<string, Stargate>
  stargatesBySystem: Map<number, Stargate[]>
  loading: boolean
  error: string | null
}

export function useUniverseData(): UseUniverseDataResult {
  const [baseResult, setBaseResult] = useState<{
    systems: SolarSystem[]
    regions: Record<string, Region>
    constellations: Record<string, Constellation>
    stargates: Record<string, Stargate>
    loading: boolean
    error: string | null
  }>({
    systems: [],
    regions: {},
    constellations: {},
    stargates: {},
    loading: true,
    error: null,
  })

  useEffect(() => {
    try {
      const regions = universeData.regions as Record<string, Region>
      const constellations = universeData.constellations as Record<string, Constellation>
      const allSystems = Object.values(universeData.systems) as SolarSystem[]
      const stargates = universeData.stargates as Record<string, Stargate>

      const filteredSystems = allSystems.filter((system) => {
        const region = regions[system.regionId]
        return region && ALLOWED_REGIONS.has(region.name)
      })

      setBaseResult({
        systems: filteredSystems,
        regions,
        constellations,
        stargates,
        loading: false,
        error: null,
      })
    } catch (err) {
      setBaseResult((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      }))
    }
  }, [])

  const stargatesBySystem = useMemo(() => {
    const map = new Map<number, Stargate[]>()
    for (const sg of Object.values(baseResult.stargates)) {
      const list = map.get(sg.systemId) || []
      list.push(sg)
      map.set(sg.systemId, list)
    }
    return map
  }, [baseResult.stargates])

  return { ...baseResult, stargatesBySystem }
}
