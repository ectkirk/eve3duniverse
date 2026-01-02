import { useMemo } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { DDSLoader } from 'three/examples/jsm/loaders/DDSLoader.js'
import {
  type PlanetTextureConfig,
  ATMOSPHERE_COLORS,
  getTexturePath,
} from './types'
import {
  planetVertexShader,
  terrestrialFragmentShader,
  gasGiantFragmentShader,
  iceFragmentShader,
  lavaFragmentShader,
  basicPlanetFragmentShader,
  atmosphereVertexShader,
  atmosphereFragmentShader,
} from '../../shaders/planetShaders'

interface PlanetMeshProps {
  config: PlanetTextureConfig
  scaledRadius: number
  starPosition: THREE.Vector3
  starColor: THREE.Color
}

function createPlaceholderTexture(): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 2
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#888888'
  ctx.fillRect(0, 0, 2, 2)
  return new THREE.CanvasTexture(canvas)
}

function getShaderForCategory(category: string): string {
  switch (category) {
    case 'terrestrial':
    case 'oceanic':
      return 'terrestrial'
    case 'gasgiant':
      return 'gasgiant'
    case 'ice':
      return 'ice'
    case 'lava':
      return 'lava'
    default:
      return 'basic'
  }
}

export function PlanetMesh({ config, scaledRadius, starPosition, starColor }: PlanetMeshProps) {
  const shaderType = getShaderForCategory(config.category)

  const texturePaths = useMemo(() => {
    const paths: string[] = []
    const pathMap: Record<string, number> = {}

    const addPath = (key: string, filename: string | undefined) => {
      if (filename) {
        pathMap[key] = paths.length
        paths.push(getTexturePath(config.category, filename))
      }
    }

    addPath('diffuse', config.diffuse)
    addPath('gradient', config.gradient)
    addPath('detail', config.detail)
    addPath('height', config.height)
    addPath('citylight', config.citylight)
    addPath('clouds', config.clouds)
    addPath('colorize', config.colorize)
    addPath('scatterLight', config.scatterLight)
    addPath('scatterHue', config.scatterHue)
    addPath('poleMask', 'gradient01_m')

    return { paths, pathMap }
  }, [config])

  const textures = useLoader(DDSLoader, texturePaths.paths)
  const placeholderTexture = useMemo(() => createPlaceholderTexture(), [])

  const getTexture = (key: string): THREE.Texture => {
    const idx = texturePaths.pathMap[key]
    if (idx !== undefined && textures[idx]) {
      return textures[idx] as THREE.Texture
    }
    return placeholderTexture
  }

  const atmosphereColor = ATMOSPHERE_COLORS[config.category]

  const material = useMemo(() => {
    const diffuseTex = getTexture('diffuse')
    diffuseTex.wrapS = diffuseTex.wrapT = THREE.RepeatWrapping

    let fragmentShader: string
    const uniforms: Record<string, { value: unknown }> = {
      uDiffuse: { value: diffuseTex },
      uGradient: { value: getTexture('gradient') },
      uPoleMask: { value: getTexture('poleMask') },
      uAtmosphereColor: { value: atmosphereColor },
      uAtmosphereIntensity: { value: config.hasAtmosphere ? 0.4 : 0.0 },
      uTime: { value: 0 },
      uStarPosition: { value: starPosition },
      uStarColor: { value: starColor },
    }

    switch (shaderType) {
      case 'terrestrial':
        fragmentShader = terrestrialFragmentShader
        uniforms.uCityLight = { value: getTexture('citylight') }
        uniforms.uScatterLight = { value: getTexture('scatterLight') }
        uniforms.uScatterHue = { value: getTexture('scatterHue') }
        uniforms.uHasCityLights = { value: config.citylight ? 1.0 : 0.0 }
        uniforms.uHasScatter = { value: config.scatterLight ? 1.0 : 0.0 }
        break

      case 'gasgiant':
        fragmentShader = gasGiantFragmentShader
        uniforms.uDetail = { value: getTexture('detail') }
        uniforms.uMixer = { value: getTexture('detail') }
        uniforms.uBandSpeed = { value: 0.002 }
        break

      case 'ice':
        fragmentShader = iceFragmentShader
        uniforms.uColorize = { value: getTexture('colorize') }
        uniforms.uScatterLight = { value: getTexture('scatterLight') }
        uniforms.uScatterHue = { value: getTexture('scatterHue') }
        uniforms.uIceColorHigh = { value: new THREE.Color(0.9, 0.95, 1.0) }
        uniforms.uIceColorMid = { value: new THREE.Color(0.7, 0.85, 0.95) }
        uniforms.uIceColorLow = { value: new THREE.Color(0.5, 0.6, 0.8) }
        uniforms.uHasScatter = { value: config.scatterLight ? 1.0 : 0.0 }
        break

      case 'lava':
        fragmentShader = lavaFragmentShader
        uniforms.uHeight = { value: getTexture('height') }
        uniforms.uScatterLight = { value: getTexture('scatterLight') }
        uniforms.uScatterHue = { value: getTexture('scatterHue') }
        uniforms.uLavaColor1 = { value: new THREE.Color(1.0, 0.3, 0.0) }
        uniforms.uLavaColor2 = { value: new THREE.Color(1.0, 0.6, 0.0) }
        uniforms.uHasScatter = { value: config.scatterLight ? 1.0 : 0.0 }
        break

      default:
        fragmentShader = basicPlanetFragmentShader
        uniforms.uEmissiveIntensity = {
          value: config.category === 'plasma' ? 0.8 : 0.0,
        }
        break
    }

    return new THREE.ShaderMaterial({
      vertexShader: planetVertexShader,
      fragmentShader,
      uniforms,
    })
  }, [textures, atmosphereColor, config, shaderType, starPosition, starColor, placeholderTexture, texturePaths.pathMap])

  const atmosphereMaterial = useMemo(() => {
    if (!config.hasAtmosphere) return null
    return new THREE.ShaderMaterial({
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      uniforms: {
        uColor: { value: atmosphereColor },
        uIntensity: { value: 1.0 },
      },
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [config.hasAtmosphere, atmosphereColor])

  useFrame(({ clock }) => {
    if (material.uniforms.uTime) {
      material.uniforms.uTime.value = clock.elapsedTime
    }
  })

  return (
    <>
      <mesh material={material}>
        <sphereGeometry args={[scaledRadius, 32, 32]} />
      </mesh>
      {atmosphereMaterial && (
        <mesh material={atmosphereMaterial}>
          <sphereGeometry args={[scaledRadius * 1.05, 32, 32]} />
        </mesh>
      )}
    </>
  )
}
