import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { createFractalGeometry, type FractalUniforms } from './geometry'

export class HeroScene {
  readonly renderer: THREE.WebGLRenderer
  readonly camera: THREE.OrthographicCamera
  readonly scene: THREE.Scene
  readonly uniforms: FractalUniforms
  readonly group: THREE.Group

  private composer: EffectComposer
  private animationId = 0
  private clock = new THREE.Clock()
  private resizeObserver: ResizeObserver
  private mouseX = 0
  private mouseY = 0
  private targetMouseX = 0
  private targetMouseY = 0
  private frustumSize = 4.5

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0

    this.scene = new THREE.Scene()

    // True orthographic camera for isometric projection
    const rect = canvas.getBoundingClientRect()
    const aspect = rect.width / rect.height
    const half = this.frustumSize / 2
    this.camera = new THREE.OrthographicCamera(
      -half * aspect, half * aspect,
      half, -half,
      0.1, 100,
    )
    // Isometric-ish angle: elevated, looking down
    this.camera.position.set(0, 2.5, 6)
    this.camera.lookAt(0, 0, 0)

    const { group, uniforms } = createFractalGeometry()
    this.group = group
    this.uniforms = uniforms
    this.scene.add(group)

    // Post-processing
    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(rect.width, rect.height),
      0.3,
      0.7,
      0.65,
    )
    this.composer.addPass(bloom)
    this.composer.addPass(new OutputPass())

    // Resize
    this.resizeObserver = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      this.renderer.setSize(width, height, false)
      this.composer.setSize(width, height)
      const a = width / height
      const h = this.frustumSize / 2
      this.camera.left = -h * a
      this.camera.right = h * a
      this.camera.top = h
      this.camera.bottom = -h
      this.camera.updateProjectionMatrix()
    })
    this.resizeObserver.observe(canvas)

    this.renderer.setSize(rect.width, rect.height, false)
    this.composer.setSize(rect.width, rect.height)

    // Mouse
    const onMouseMove = (e: MouseEvent) => {
      this.targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2
      this.targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', onMouseMove, { passive: true })
    this._cleanupMouse = () => window.removeEventListener('mousemove', onMouseMove)

    this.animate()
  }

  private _cleanupMouse: (() => void) | null = null

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate)

    const t = this.clock.getElapsedTime()
    this.uniforms.uTime.value = t

    this.mouseX += (this.targetMouseX - this.mouseX) * 0.04
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.04

    // Gentle rotation + mouse
    this.group.rotation.y = t * 0.08 + this.mouseX * 0.2
    this.group.rotation.x = this.mouseY * 0.08

    // Animate orbiting polyhedra
    const orbitGroup = (this.group as any)._orbitGroup as THREE.Group | undefined
    if (orbitGroup) {
      for (const child of orbitGroup.children) {
        const { dist, speed, phase } = child.userData
        const a = t * speed + phase
        child.position.set(
          Math.cos(a) * dist,
          Math.sin(a * 0.6 + phase) * dist * 0.25,
          Math.sin(a) * dist,
        )
        child.rotation.x = t * speed * 1.5
        child.rotation.z = t * speed
      }
    }

    // Subtle camera sway
    this.camera.position.x = this.mouseX * 0.15
    this.camera.position.y = 2.5 - this.mouseY * 0.1
    this.camera.lookAt(0, 0, 0)

    this.composer.render()
  }

  dispose() {
    cancelAnimationFrame(this.animationId)
    this.resizeObserver.disconnect()
    this._cleanupMouse?.()
    this.composer.dispose()
    this.renderer.dispose()
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments || obj instanceof THREE.Points) {
        obj.geometry.dispose()
        const mat = obj.material
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
        else (mat as THREE.Material).dispose()
      }
    })
  }
}
