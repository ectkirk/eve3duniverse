import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { type ShaderPreset, getShaderType, getTexturePath } from './types'
import { createLogger } from '../../utils/logger'
import { planetVertexShader } from '../../shaders/planetShaders'
import planetGraphics from '../../data/planet-graphics.json'

const log = createLogger('PlanetMesh')

const graphicsData = planetGraphics as Record<string, string>

function getHeightMapPath(graphicId: number | undefined): string | null {
  if (!graphicId) return null
  const path = graphicsData[graphicId.toString()]
  if (!path || !path.endsWith('.webp')) return null
  return getTexturePath(path)
}

interface PlanetMeshProps {
  preset: ShaderPreset
  population: boolean
  scaledRadius: number
  starPosition: THREE.Vector3
  starColor: THREE.Color
  heightMap1?: number
  heightMap2?: number
}

const planetFragmentShader = `
  uniform sampler2D uDiffuse;
  uniform sampler2D uGradient;
  uniform sampler2D uPoleMask;
  uniform sampler2D uCityLight;
  uniform sampler2D uScatterLight;
  uniform sampler2D uScatterHue;
  uniform sampler2D uHeightMap1;
  uniform sampler2D uHeightMap2;
  uniform sampler2D uClouds;
  uniform sampler2D uCloudCap;
  uniform float uHasCityLights;
  uniform float uHasScatter;
  uniform float uHasHeightMap;
  uniform float uHasClouds;
  uniform float uTime;
  uniform vec3 uStarPosition;
  uniform vec3 uStarColor;
  uniform float uPlanetType;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 viewDir = normalize(-vPosition);
    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);

    vec2 animatedUv = vUv;
    float surfaceSpeed = 0.002;
    if (uPlanetType < 0.5) {
      // Gas giant - swirling bands
      float latitude = vUv.y - 0.5;
      float bandSpeed = surfaceSpeed * (1.0 + abs(latitude) * 2.0);
      animatedUv.x = vUv.x + uTime * bandSpeed * sign(latitude);
      animatedUv.y = vUv.y + sin(vUv.x * 12.0 + uTime * 0.5) * 0.003;
    } else if (uPlanetType > 2.5 && uPlanetType < 3.5) {
      // Lava - slow crawl with pulse
      animatedUv.x = vUv.x + uTime * surfaceSpeed * 0.3;
    }

    vec4 diffuse = texture2D(uDiffuse, animatedUv);

    float gradientSample = dot(vNormal, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;
    vec3 gradientColor = texture2D(uGradient, vec2(gradientSample, 0.5)).rgb;

    float poleMask = texture2D(uPoleMask, vec2(0.5, abs(vUv.y - 0.5) * 2.0)).r;

    vec3 baseColor = diffuse.rgb * gradientColor * 1.5 * (0.7 + 0.3 * poleMask);

    if (uHasHeightMap > 0.5) {
      float h1 = texture2D(uHeightMap1, animatedUv).r;
      float h2 = texture2D(uHeightMap2, animatedUv).r;
      float heightBlend = mix(h1, h2, 0.5);
      baseColor *= 0.8 + 0.4 * heightBlend;
    }

    // Lava glow pulse
    if (uPlanetType > 2.5 && uPlanetType < 3.5) {
      float lavaPulse = 0.85 + 0.15 * sin(uTime * 0.8 + diffuse.r * 6.28);
      baseColor *= lavaPulse;
      baseColor += diffuse.rgb * 0.15 * (0.5 + 0.5 * sin(uTime * 1.2));
    }

    vec3 lightDir = normalize(uStarPosition - vWorldPosition);
    float NdotL = dot(normalize(vWorldNormal), lightDir);
    float shadow = 0.15 + 0.85 * max(NdotL, 0.0);

    vec3 litColor = baseColor * shadow * uStarColor;

    // Clouds layer
    if (uHasClouds > 0.5) {
      vec2 cloudUv = vUv;
      cloudUv.x += uTime * 0.008;
      vec4 clouds = texture2D(uClouds, cloudUv);

      vec2 capUv = vUv;
      capUv.x += uTime * 0.004;
      float capMask = smoothstep(0.3, 0.0, abs(vUv.y - 0.5));
      vec4 cloudCap = texture2D(uCloudCap, capUv) * (1.0 - capMask);

      float cloudAlpha = max(clouds.a, cloudCap.a) * 0.7;
      vec3 cloudColor = mix(clouds.rgb, cloudCap.rgb, cloudCap.a);
      cloudColor *= shadow * uStarColor;
      litColor = mix(litColor, cloudColor, cloudAlpha);
    }

    float nightMask = smoothstep(0.0, -0.15, NdotL) * uHasCityLights;
    vec3 cityGlow = texture2D(uCityLight, vUv).rgb * nightMask * 2.0;

    vec3 scatter = vec3(0.0);
    if (uHasScatter > 0.5) {
      vec3 scatterLight = texture2D(uScatterLight, vec2(fresnel, 0.5)).rgb;
      vec3 scatterHue = texture2D(uScatterHue, vec2(fresnel, 0.5)).rgb;
      float sunInfluence = max(0.0, dot(lightDir, viewDir));
      scatter = mix(scatterHue, scatterLight, sunInfluence) * fresnel * 0.8;
    }

    // Thunderstorm lightning
    if (uPlanetType > 4.5 && uPlanetType < 5.5) {
      float lightning = pow(fract(sin(uTime * 15.0 + vUv.x * 50.0) * 43758.5453), 20.0);
      lightning *= step(0.97, fract(uTime * 0.3 + vUv.y));
      litColor += vec3(0.8, 0.85, 1.0) * lightning * 2.0;
    }

    gl_FragColor = vec4(litColor + cityGlow + scatter, 1.0);
  }
`

function createPlaceholderTexture(): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 2
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#888888'
  ctx.fillRect(0, 0, 2, 2)
  return new THREE.CanvasTexture(canvas)
}

interface TexturePathsResult {
  paths: string[]
  heightMap1Index: number
  heightMap2Index: number
  cloudsIndex: number
  cloudCapIndex: number
}

function getPlanetTypeNum(presetType: string): number {
  switch (presetType) {
    case 'gasgiant': return 0
    case 'terrestrial': return 1
    case 'ocean': return 2
    case 'lava': return 3
    case 'ice': return 4
    case 'thunderstorm': return 5
    case 'sandstorm': return 6
    case 'plasma': return 7
    default: return 1
  }
}

function getTexturePathsForPreset(
  preset: ShaderPreset,
  heightMap1Id?: number,
  heightMap2Id?: number
): TexturePathsResult {
  const paths: string[] = []
  const tex = preset.textures
  const shaderType = getShaderType(preset.type)

  if (shaderType === 'gasgiant') {
    if (tex.DistortionMap) paths.push(getTexturePath(tex.DistortionMap))
    else if (tex.FillTexture) paths.push(getTexturePath(tex.FillTexture))
  } else {
    if (tex.FillTexture) paths.push(getTexturePath(tex.FillTexture))
    else if (tex.CloudsTexture) paths.push(getTexturePath(tex.CloudsTexture))
  }

  if (tex.ColorGradientMap) paths.push(getTexturePath(tex.ColorGradientMap))
  if (tex.PolesGradient) paths.push(getTexturePath(tex.PolesGradient))
  else if (tex.PolesMaskMap) paths.push(getTexturePath(tex.PolesMaskMap))
  if (tex.CityLight) paths.push(getTexturePath(tex.CityLight))
  if (tex.GroundScattering1) paths.push(getTexturePath(tex.GroundScattering1))
  if (tex.GroundScattering2) paths.push(getTexturePath(tex.GroundScattering2))

  let heightMap1Index = -1
  let heightMap2Index = -1
  const h1Path = getHeightMapPath(heightMap1Id)
  const h2Path = getHeightMapPath(heightMap2Id)
  if (h1Path) {
    heightMap1Index = paths.length
    paths.push(h1Path)
  }
  if (h2Path) {
    heightMap2Index = paths.length
    paths.push(h2Path)
  }

  let cloudsIndex = -1
  let cloudCapIndex = -1
  if (tex.CloudsTexture && shaderType !== 'gasgiant') {
    cloudsIndex = paths.length
    paths.push(getTexturePath(tex.CloudsTexture))
  }
  if (tex.CloudCapTexture && shaderType !== 'gasgiant') {
    cloudCapIndex = paths.length
    paths.push(getTexturePath(tex.CloudCapTexture))
  }

  return { paths, heightMap1Index, heightMap2Index, cloudsIndex, cloudCapIndex }
}

export function PlanetMesh({ preset, population, scaledRadius, starPosition, starColor, heightMap1, heightMap2 }: PlanetMeshProps) {
  const presetType = preset.type

  const textureResult = useMemo(
    () => getTexturePathsForPreset(preset, heightMap1, heightMap2),
    [preset, heightMap1, heightMap2]
  )

  const textures = useLoader(THREE.TextureLoader, textureResult.paths)
  const placeholderTexture = useMemo(() => createPlaceholderTexture(), [])

  useEffect(() => {
    log.debug(`Loaded ${textureResult.paths.length} textures for ${presetType}`)
  }, [textureResult.paths.length, presetType])

  const material = useMemo(() => {
    const tex = preset.textures
    let idx = 0

    const getTexture = (i: number): THREE.Texture => textures[i] ?? placeholderTexture

    const diffuseTex = getTexture(idx++)
    diffuseTex.wrapS = diffuseTex.wrapT = THREE.RepeatWrapping

    const uniforms: Record<string, { value: unknown }> = {
      uTime: { value: 0 },
      uStarPosition: { value: starPosition },
      uStarColor: { value: starColor },
      uDiffuse: { value: diffuseTex },
      uGradient: { value: tex.ColorGradientMap ? getTexture(idx++) : placeholderTexture },
      uPoleMask: { value: (tex.PolesGradient || tex.PolesMaskMap) ? getTexture(idx++) : placeholderTexture },
      uCityLight: { value: placeholderTexture },
      uHasCityLights: { value: 0.0 },
      uScatterLight: { value: placeholderTexture },
      uScatterHue: { value: placeholderTexture },
      uHasScatter: { value: 0.0 },
      uHeightMap1: { value: placeholderTexture },
      uHeightMap2: { value: placeholderTexture },
      uHasHeightMap: { value: 0.0 },
      uClouds: { value: placeholderTexture },
      uCloudCap: { value: placeholderTexture },
      uHasClouds: { value: 0.0 },
      uPlanetType: { value: getPlanetTypeNum(presetType) },
    }

    if (tex.CityLight && population) {
      uniforms.uCityLight = { value: getTexture(idx++) }
      uniforms.uHasCityLights = { value: 1.0 }
    } else if (tex.CityLight) {
      idx++
    }

    if (tex.GroundScattering1 && tex.GroundScattering2) {
      uniforms.uScatterLight = { value: getTexture(idx++) }
      uniforms.uScatterHue = { value: getTexture(idx++) }
      uniforms.uHasScatter = { value: 1.0 }
    }

    const { heightMap1Index, heightMap2Index, cloudsIndex, cloudCapIndex } = textureResult
    if (heightMap1Index >= 0 || heightMap2Index >= 0) {
      const h1Tex = heightMap1Index >= 0 ? getTexture(heightMap1Index) : placeholderTexture
      const h2Tex = heightMap2Index >= 0 ? getTexture(heightMap2Index) : h1Tex
      h1Tex.wrapS = h1Tex.wrapT = THREE.RepeatWrapping
      h2Tex.wrapS = h2Tex.wrapT = THREE.RepeatWrapping
      uniforms.uHeightMap1 = { value: h1Tex }
      uniforms.uHeightMap2 = { value: h2Tex }
      uniforms.uHasHeightMap = { value: 1.0 }
    }

    if (cloudsIndex >= 0) {
      const cloudsTex = getTexture(cloudsIndex)
      cloudsTex.wrapS = cloudsTex.wrapT = THREE.RepeatWrapping
      uniforms.uClouds = { value: cloudsTex }
      uniforms.uHasClouds = { value: 1.0 }

      if (cloudCapIndex >= 0) {
        const cloudCapTex = getTexture(cloudCapIndex)
        cloudCapTex.wrapS = cloudCapTex.wrapT = THREE.RepeatWrapping
        uniforms.uCloudCap = { value: cloudCapTex }
      }
    }

    log.debug(`Creating shader for ${presetType}`)
    return new THREE.ShaderMaterial({
      vertexShader: planetVertexShader,
      fragmentShader: planetFragmentShader,
      uniforms,
    })
  }, [textures, preset, presetType, starPosition, starColor, placeholderTexture, population, textureResult])

  const meshRef = useRef<THREE.Mesh>(null)

  const rotationSpeed = useMemo(() => {
    const typeNum = getPlanetTypeNum(presetType)
    if (typeNum === 0) return 0.015
    if (typeNum === 5) return 0.02
    return 0.008
  }, [presetType])

  useFrame(({ clock }) => {
    if (material.uniforms.uTime) {
      material.uniforms.uTime.value = clock.elapsedTime
    }
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.elapsedTime * rotationSpeed
    }
  })

  return (
    <mesh ref={meshRef} material={material}>
      <sphereGeometry args={[scaledRadius, 32, 32]} />
    </mesh>
  )
}
