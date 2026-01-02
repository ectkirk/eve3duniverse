import { useState, useEffect } from 'react'
import type { SolarSystem, Region } from '../types/universe'
import { ALLOWED_REGIONS } from '../data/allowedRegions'

interface UseUniverseDataResult {
  systems: SolarSystem[]
  regions: Record<string, Region>
  loading: boolean
  error: string | null
}

export function useUniverseData(): UseUniverseDataResult {
  const [systems, setSystems] = useState<SolarSystem[]>([])
  const [regions, setRegions] = useState<Record<string, Region>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const result = await window.electronAPI.refSystems3D()

        if ('error' in result) {
          setError(result.error)
          return
        }

        const allSystems = Object.values(result.systems)
        const filtered = allSystems.filter((system) => {
          const region = result.regions[system.regionId]
          return region && ALLOWED_REGIONS.has(region.name)
        })

        setSystems(filtered)
        setRegions(result.regions)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return { systems, regions, loading, error }
}
