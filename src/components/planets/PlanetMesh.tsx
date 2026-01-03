import { useMemo, useEffect } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { type ShaderPreset, getShaderType, getTexturePath } from './types'
import { createLogger } from '../../utils/logger'
import { planetVertexShader } from '../../shaders/planetShaders'

const log = createLogger('PlanetMesh')

interface PlanetMeshProps {
  preset: ShaderPreset
  population: boolean
  scaledRadius: number
  starPosition: THREE.Vector3
  starColor: THREE.Color
}

const planetFragmentShader = `
  uniform sampler2D uDiffuse;
  uniform sampler2D uGradient;
  uniform sampler2D uPoleMask;
  uniform sampler2D uCityLight;
  uniform sampler2D uScatterLight;
  uniform sampler2D uScatterHue;
  uniform float uHasCityLights;
  uniform float uHasScatter;
  uniform float uTime;
  uniform vec3 uStarPosition;
  uniform vec3 uStarColor;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 viewDir = normalize(-vPosition);
    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);

    vec4 diffuse = texture2D(uDiffuse, vUv);

    float gradientSample = dot(vNormal, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;
    vec3 gradientColor = texture2D(uGradient, vec2(gradientSample, 0.5)).rgb;

    float poleMask = texture2D(uPoleMask, vec2(0.5, abs(vUv.y - 0.5) * 2.0)).r;

    vec3 baseColor = diffuse.rgb * gradientColor * 1.5 * (0.7 + 0.3 * poleMask);

    vec3 lightDir = normalize(uStarPosition - vWorldPosition);
    float NdotL = dot(normalize(vWorldNormal), lightDir);
    float shadow = 0.15 + 0.85 * max(NdotL, 0.0);

    vec3 litColor = baseColor * shadow * uStarColor;

    float nightMask = smoothstep(0.0, -0.15, NdotL) * uHasCityLights;
    vec3 cityGlow = texture2D(uCityLight, vUv).rgb * nightMask * 2.0;

    vec3 scatter = vec3(0.0);
    if (uHasScatter > 0.5) {
      vec3 scatterLight = texture2D(uScatterLight, vec2(fresnel, 0.5)).rgb;
      vec3 scatterHue = texture2D(uScatterHue, vec2(fresnel, 0.5)).rgb;
      float sunInfluence = max(0.0, dot(lightDir, viewDir));
      scatter = mix(scatterHue, scatterLight, sunInfluence) * fresnel * 0.8;
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

function getTexturePathsForPreset(preset: ShaderPreset): string[] {
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

  return paths
}

export function PlanetMesh({ preset, population, scaledRadius, starPosition, starColor }: PlanetMeshProps) {
  const presetType = preset.type

  const texturePaths = useMemo(() => getTexturePathsForPreset(preset), [preset])

  const textures = useLoader(THREE.TextureLoader, texturePaths)
  const placeholderTexture = useMemo(() => createPlaceholderTexture(), [])

  useEffect(() => {
    log.debug(`Loaded ${texturePaths.length} textures for ${presetType}`)
  }, [texturePaths, presetType])

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

    log.debug(`Creating shader for ${presetType}`)
    return new THREE.ShaderMaterial({
      vertexShader: planetVertexShader,
      fragmentShader: planetFragmentShader,
      uniforms,
    })
  }, [textures, preset, presetType, starPosition, starColor, placeholderTexture, population])

  useFrame(({ clock }) => {
    if (material.uniforms.uTime) {
      material.uniforms.uTime.value = clock.elapsedTime
    }
  })

  return (
    <mesh material={material}>
      <sphereGeometry args={[scaledRadius, 32, 32]} />
    </mesh>
  )
}
