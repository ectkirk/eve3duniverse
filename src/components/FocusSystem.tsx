import { useRef, useMemo, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { SolarSystem, Region, Constellation } from '../types/universe'
import { EVE_COORDINATE_SCALE } from '../constants'

export type FocusState = 'normal' | 'dwelling' | 'locked' | 'focused'

export interface FocusTarget {
  system: SolarSystem
  region: Region
  constellation: Constellation
  screenDistance: number
  scenePosition: THREE.Vector3
}

export interface FocusInfo {
  state: FocusState
  target: FocusTarget | null
  dwellProgress: number
}

interface FocusSystemProps {
  systems: SolarSystem[]
  regions: Record<string, Region>
  constellations: Record<string, Constellation>
  onFocusChange: (info: FocusInfo) => void
  enabled?: boolean
}

const FOCUS_CONFIG = {
  centerThreshold: 50,
  velocityThreshold: 0.02,
  dwellTime: 1500,
  maxDistance: 500,
}

export function FocusSystem({
  systems,
  regions,
  constellations,
  onFocusChange,
  enabled = true,
}: FocusSystemProps) {
  const { camera, size } = useThree()

  const prevPosition = useRef(new THREE.Vector3())
  const velocity = useRef(0)
  const state = useRef<FocusState>('normal')
  const dwellStart = useRef<number | null>(null)
  const currentTarget = useRef<FocusTarget | null>(null)

  useEffect(() => {
    if (enabled) {
      state.current = 'normal'
      currentTarget.current = null
      dwellStart.current = null
    }
  }, [enabled])

  const scaledPositions = useMemo(() => {
    return systems.map((system) => ({
      system,
      position: new THREE.Vector3(
        system.position.x * EVE_COORDINATE_SCALE,
        system.position.y * EVE_COORDINATE_SCALE,
        system.position.z * EVE_COORDINATE_SCALE
      ),
    }))
  }, [systems])

  useFrame(() => {
    if (!enabled) {
      return
    }

    const currentVelocity = camera.position.distanceTo(prevPosition.current)
    velocity.current = velocity.current * 0.8 + currentVelocity * 0.2
    prevPosition.current.copy(camera.position)

    const screenCenter = new THREE.Vector2(size.width / 2, size.height / 2)
    let nearestSystem: FocusTarget | null = null
    let nearestScreenDist = Infinity

    for (const { system, position } of scaledPositions) {
      const distance = camera.position.distanceTo(position)
      if (distance > FOCUS_CONFIG.maxDistance) continue

      const screenPos = position.clone().project(camera)
      const screenX = (screenPos.x * 0.5 + 0.5) * size.width
      const screenY = (-screenPos.y * 0.5 + 0.5) * size.height

      if (screenPos.z > 1) continue

      const screenDist = Math.sqrt(
        Math.pow(screenX - screenCenter.x, 2) + Math.pow(screenY - screenCenter.y, 2)
      )

      if (screenDist < nearestScreenDist) {
        const region = regions[system.regionId]
        const constellation = constellations[system.constellationId]
        if (!region || !constellation) continue

        nearestScreenDist = screenDist
        nearestSystem = {
          system,
          region,
          constellation,
          screenDistance: screenDist,
          scenePosition: position.clone(),
        }
      }
    }

    const isNearCenter = nearestScreenDist < FOCUS_CONFIG.centerThreshold
    const isSlowEnough = velocity.current < FOCUS_CONFIG.velocityThreshold
    const canDwell = isNearCenter && isSlowEnough && nearestSystem

    if (state.current === 'normal') {
      if (canDwell) {
        state.current = 'dwelling'
        dwellStart.current = performance.now()
        currentTarget.current = nearestSystem
        onFocusChange({ state: 'dwelling', target: nearestSystem, dwellProgress: 0 })
      }
    } else if (state.current === 'dwelling') {
      if (!canDwell || nearestSystem?.system.id !== currentTarget.current?.system.id) {
        state.current = 'normal'
        dwellStart.current = null
        currentTarget.current = null
        onFocusChange({ state: 'normal', target: null, dwellProgress: 0 })
      } else {
        const elapsed = performance.now() - dwellStart.current!
        const progress = Math.min(1, elapsed / FOCUS_CONFIG.dwellTime)
        onFocusChange({ state: 'dwelling', target: currentTarget.current, dwellProgress: progress })

        if (progress >= 1) {
          state.current = 'focused'
          onFocusChange({ state: 'focused', target: currentTarget.current, dwellProgress: 1 })
        }
      }
    }
  })

  return null
}
