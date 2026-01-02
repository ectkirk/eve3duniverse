import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CAMERA_DEFAULTS } from '../constants'

interface OrbitTarget {
  position: THREE.Vector3
  onExit: () => void
}

interface CameraControllerProps {
  orbitTarget?: OrbitTarget | null
}

const ORBIT_CONFIG = {
  minDistance: 0.2,
  maxDistance: 50,
  lockDistance: 0.5,
  zoomSpeed: 0.1,
  transitionSpeed: 3,
}

export function CameraController({ orbitTarget }: CameraControllerProps) {
  const { camera, gl } = useThree()
  const velocity = useRef(new THREE.Vector3())
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  const keys = useRef({ w: false, a: false, s: false, d: false })
  const isDragging = useRef(false)
  const prevMouse = useRef({ x: 0, y: 0 })

  const orbitState = useRef({
    theta: 0,
    phi: Math.PI / 2,
    distance: ORBIT_CONFIG.lockDistance,
    transitioning: false,
  })

  const isOrbiting = orbitTarget != null

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

      if (isOrbiting) {
        orbitState.current.theta -= deltaX * sensitivity
        orbitState.current.phi -= deltaY * sensitivity
        orbitState.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, orbitState.current.phi))
      } else {
        euler.current.y -= deltaX * sensitivity
        euler.current.x -= deltaY * sensitivity
        euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x))
        camera.quaternion.setFromEuler(euler.current)
      }
    }

    const onWheel = (e: WheelEvent) => {
      if (!isOrbiting) return
      e.preventDefault()

      const delta = e.deltaY > 0 ? 1 : -1
      orbitState.current.distance *= 1 + delta * ORBIT_CONFIG.zoomSpeed

      if (orbitState.current.distance > ORBIT_CONFIG.maxDistance) {
        orbitTarget?.onExit()
      }
      orbitState.current.distance = Math.max(
        ORBIT_CONFIG.minDistance,
        Math.min(ORBIT_CONFIG.maxDistance, orbitState.current.distance)
      )
    }

    const canvas = gl.domElement
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('wheel', onWheel)
    }
  }, [camera, gl, isOrbiting, orbitTarget])

  useEffect(() => {
    if (orbitTarget) {
      const offset = camera.position.clone().sub(orbitTarget.position)
      orbitState.current.theta = Math.atan2(offset.x, offset.z)
      orbitState.current.phi = Math.acos(Math.max(-1, Math.min(1, offset.y / offset.length())))
      orbitState.current.distance = ORBIT_CONFIG.lockDistance
      orbitState.current.transitioning = true
      velocity.current.set(0, 0, 0)
      camera.near = 0.01
      ;(camera as THREE.PerspectiveCamera).updateProjectionMatrix()
    } else {
      camera.near = CAMERA_DEFAULTS.minZ
      ;(camera as THREE.PerspectiveCamera).updateProjectionMatrix()
    }
  }, [orbitTarget, camera])

  useFrame((_, delta) => {
    if (isOrbiting && orbitTarget) {
      const { theta, phi, distance } = orbitState.current
      const targetPos = new THREE.Vector3(
        orbitTarget.position.x + distance * Math.sin(phi) * Math.sin(theta),
        orbitTarget.position.y + distance * Math.cos(phi),
        orbitTarget.position.z + distance * Math.sin(phi) * Math.cos(theta)
      )

      const lerpFactor = orbitState.current.transitioning
        ? Math.min(1, delta * ORBIT_CONFIG.transitionSpeed)
        : 1

      camera.position.lerp(targetPos, lerpFactor)
      camera.lookAt(orbitTarget.position)

      if (orbitState.current.transitioning && camera.position.distanceTo(targetPos) < 0.01) {
        orbitState.current.transitioning = false
      }
    } else {
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
    }
  })

  return null
}
