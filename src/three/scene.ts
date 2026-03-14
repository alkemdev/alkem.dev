import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { createFractalGeometry, type FractalUniforms } from './geometry'

export class HeroScene {
  readonly renderer: THREE.WebGLRenderer
  readonly camera: THREE.PerspectiveCamera
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

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 0.9

    this.scene = new THREE.Scene()

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
    this.camera.position.z = 5.5
    this.camera.position.y = 0.3

    const { group, uniforms } = createFractalGeometry()
    this.group = group
    this.uniforms = uniforms
    this.scene.add(group)

    // Post-processing with bloom
    const rect = canvas.getBoundingClientRect()
    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))

    const bloom = new UnrealBloomPass(
      new THREE.Vector2(rect.width, rect.height),
      0.35,  // strength - subtle glow, not blowout
      0.6,   // radius - wider, softer spread
      0.6,   // threshold - only bright areas bloom
    )
    this.composer.addPass(bloom)
    this.composer.addPass(new OutputPass())

    // Resize handling
    this.resizeObserver = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      this.renderer.setSize(width, height, false)
      this.composer.setSize(width, height)
      this.camera.aspect = width / height
      this.camera.updateProjectionMatrix()
    })
    this.resizeObserver.observe(canvas)

    // Initial size
    this.renderer.setSize(rect.width, rect.height, false)
    this.composer.setSize(rect.width, rect.height)
    this.camera.aspect = rect.width / rect.height
    this.camera.updateProjectionMatrix()

    // Mouse parallax
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

    const elapsed = this.clock.getElapsedTime()
    this.uniforms.uTime.value = elapsed

    // Smooth mouse follow
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.05
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.05

    // Slow rotation with mouse influence
    this.group.rotation.y = elapsed * 0.12 + this.mouseX * 0.3
    this.group.rotation.x = Math.sin(elapsed * 0.08) * 0.08 + this.mouseY * 0.15

    // Animate orbiting mini polyhedra
    const orbitGroup = (this.group as any)._orbitGroup as THREE.Group | undefined
    if (orbitGroup) {
      for (const child of orbitGroup.children) {
        const { dist, speed, phase } = child.userData
        const angle = elapsed * speed + phase
        child.position.x = Math.cos(angle) * dist
        child.position.y = Math.sin(angle * 0.7 + phase) * dist * 0.3
        child.position.z = Math.sin(angle) * dist
        child.rotation.x = elapsed * speed * 2
        child.rotation.z = elapsed * speed * 1.5
      }
    }

    // Subtle camera parallax
    this.camera.position.x = this.mouseX * 0.3
    this.camera.position.y = -this.mouseY * 0.3
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
        if (Array.isArray(mat)) {
          mat.forEach((m) => m.dispose())
        } else {
          (mat as THREE.Material).dispose()
        }
      }
    })
  }
}
