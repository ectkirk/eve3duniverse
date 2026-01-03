import { useMemo, useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { heightBlitVertexShader, heightBlitFragmentShader } from '../shaders/planetShaders'

const BAKE_WIDTH = 2048
const BAKE_HEIGHT = 1024

interface BakedHeightMap {
  texture: THREE.Texture
  dispose: () => void
}

export function useHeightMapBaker(
  normalHeight1: THREE.Texture | null,
  normalHeight2: THREE.Texture | null,
  randomSeed: number
): BakedHeightMap | null {
  const { gl } = useThree()
  const renderTargetRef = useRef<THREE.WebGLRenderTarget | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null)
  const materialRef = useRef<THREE.ShaderMaterial | null>(null)
  const meshRef = useRef<THREE.Mesh | null>(null)
  const bakedRef = useRef<boolean>(false)

  const result = useMemo(() => {
    if (!normalHeight1 || !normalHeight2) return null

    if (!renderTargetRef.current) {
      renderTargetRef.current = new THREE.WebGLRenderTarget(BAKE_WIDTH, BAKE_HEIGHT, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
      })
    }

    if (!sceneRef.current) {
      sceneRef.current = new THREE.Scene()
    }

    if (!cameraRef.current) {
      cameraRef.current = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    }

    const blitUniforms = {
      uNormalHeight1: { value: normalHeight1 },
      uNormalHeight2: { value: normalHeight2 },
      uRandom: { value: randomSeed },
    }

    if (!materialRef.current) {
      materialRef.current = new THREE.ShaderMaterial({
        vertexShader: heightBlitVertexShader,
        fragmentShader: heightBlitFragmentShader,
        uniforms: blitUniforms,
        depthTest: false,
        depthWrite: false,
      })
    } else {
      materialRef.current.uniforms = blitUniforms
    }

    if (!meshRef.current) {
      const geometry = new THREE.PlaneGeometry(2, 2)
      meshRef.current = new THREE.Mesh(geometry, materialRef.current)
      sceneRef.current.add(meshRef.current)
    }

    bakedRef.current = false

    return {
      texture: renderTargetRef.current.texture,
      dispose: () => {
        renderTargetRef.current?.dispose()
        materialRef.current?.dispose()
        meshRef.current?.geometry.dispose()
        renderTargetRef.current = null
        sceneRef.current = null
        cameraRef.current = null
        materialRef.current = null
        meshRef.current = null
      },
    }
  }, [normalHeight1, normalHeight2, randomSeed])

  useEffect(() => {
    if (!result || bakedRef.current) return
    if (!sceneRef.current || !cameraRef.current || !renderTargetRef.current) return

    const currentRenderTarget = gl.getRenderTarget()
    gl.setRenderTarget(renderTargetRef.current)
    gl.clear()
    gl.render(sceneRef.current, cameraRef.current)
    gl.setRenderTarget(currentRenderTarget)

    bakedRef.current = true
  }, [gl, result])

  useEffect(() => {
    return () => {
      result?.dispose()
    }
  }, [result])

  return result
}
