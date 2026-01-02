import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CAMERA_DEFAULTS } from '../constants'

export function CameraController() {
  const { camera, gl } = useThree()
  const velocity = useRef(new THREE.Vector3())
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  const keys = useRef({ w: false, a: false, s: false, d: false })
  const isDragging = useRef(false)
  const prevMouse = useRef({ x: 0, y: 0 })

  useEffect(() => {
    camera.near = CAMERA_DEFAULTS.minZ
    camera.far = CAMERA_DEFAULTS.maxZ
    ;(camera as THREE.PerspectiveCamera).updateProjectionMatrix()

    euler.current.setFromQuaternion(camera.quaternion)

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key in keys.current) {
        keys.current[key as keyof typeof keys.current] = true
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key in keys.current) {
        keys.current[key as keyof typeof keys.current] = false
      }
    }

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isDragging.current = true
        prevMouse.current = { x: e.clientX, y: e.clientY }
      }
    }

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        isDragging.current = false
      }
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return

      const deltaX = e.clientX - prevMouse.current.x
      const deltaY = e.clientY - prevMouse.current.y
      prevMouse.current = { x: e.clientX, y: e.clientY }

      const sensitivity = 1 / CAMERA_DEFAULTS.angularSensibility
      euler.current.y -= deltaX * sensitivity
      euler.current.x -= deltaY * sensitivity
      euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x))

      camera.quaternion.setFromEuler(euler.current)
    }

    const canvas = gl.domElement
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mousemove', onMouseMove)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [camera, gl])

  useFrame((_, delta) => {
    const direction = new THREE.Vector3()
    const { w, a, s, d } = keys.current

    if (w) direction.z -= 1
    if (s) direction.z += 1
    if (a) direction.x -= 1
    if (d) direction.x += 1

    if (direction.lengthSq() > 0) {
      direction.normalize()
      direction.multiplyScalar(CAMERA_DEFAULTS.speed * delta * 60)
      direction.applyQuaternion(camera.quaternion)
      velocity.current.add(direction)
    }

    velocity.current.multiplyScalar(CAMERA_DEFAULTS.inertia)
    camera.position.add(velocity.current)
  })

  return null
}
