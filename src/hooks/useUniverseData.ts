import { useState, useEffect } from 'react'
import type { SolarSystem, Region, Constellation, Stargate } from '../types/universe'
import { ALLOWED_REGIONS } from '../data/allowedRegions'
import universeData from '../data/universe.json'

interface UseUniverseDataResult {
  systems: SolarSystem[]
  regions: Record<string, Region>
  constellations: Record<string, Constellation>
  stargates: Stargate[]
  loading: boolean
  error: string | null
}

export function useUniverseData(): UseUniverseDataResult {
  const [result, setResult] = useState<UseUniverseDataResult>({
    systems: [],
    regions: {},
    constellations: {},
    stargates: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    try {
      const regions = universeData.regions as Record<string, Region>
      const constellations = universeData.constellations as Record<string, Constellation>
      const allSystems = Object.values(universeData.systems) as SolarSystem[]
      const stargates = universeData.stargates as Stargate[]

      const filteredSystems = allSystems.filter((system) => {
        const region = regions[system.regionId]
        return region && ALLOWED_REGIONS.has(region.name)
      })

      setResult({
        systems: filteredSystems,
        regions,
        constellations,
        stargates,
        loading: false,
        error: null,
      })
    } catch (err) {
      setResult((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      }))
    }
  }, [])

  return result
}
