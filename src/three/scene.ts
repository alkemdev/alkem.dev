import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { createFractalGeometry, type FractalUniforms } from './geometry'
import { defaultSceneConfig } from './config'

export class HeroScene {
  readonly renderer: THREE.WebGLRenderer
  readonly camera: THREE.OrthographicCamera
  readonly scene: THREE.Scene
  readonly uniforms: FractalUniforms
  readonly group: THREE.Group

  private composer: EffectComposer
  private animationId = 0
  private timer = new THREE.Timer()
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
    // Lower DPR cap on narrow viewports — Three + bloom on a high-DPR
    // phone (e.g., DPR 3) is enough to stutter on low-end devices.
    const narrow = window.innerWidth < 640
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, narrow ? 1.5 : 2))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0

    this.scene = new THREE.Scene()

    // True orthographic camera for isometric projection
    const rect = canvas.getBoundingClientRect()
    const aspect = rect.width / rect.height
    const half = this.frustumSize / 2
    this.camera = new THREE.OrthographicCamera(-half * aspect, half * aspect, half, -half, 0.1, 100)
    // Isometric-ish angle: elevated, looking down
    this.camera.position.set(0, 2.5, 6)
    this.camera.lookAt(0, 0, 0)

    const { group, uniforms } = createFractalGeometry(defaultSceneConfig)
    this.group = group
    this.uniforms = uniforms
    this.scene.add(group)

    // Post-processing
    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    const bloom = new UnrealBloomPass(new THREE.Vector2(rect.width, rect.height), 0.3, 0.7, 0.65)
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

    // Auto-pause time advancement while the tab is hidden — saves battery
    // and prevents a big frame-time jump when returning to the page.
    this.timer.connect(document)

    this.animate()
  }

  private _cleanupMouse: (() => void) | null = null

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate)

    this.timer.update()
    const t = this.timer.getElapsed()
    this.uniforms.uTime.value = t

    this.mouseX += (this.targetMouseX - this.mouseX) * 0.04
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.04

    // Gentle rotation + mouse
    this.group.rotation.y = t * 0.08 + this.mouseX * 0.2
    this.group.rotation.x = this.mouseY * 0.08

    // Animate orbiting Platonic solids on Lissajous curves
    const orbitGroup = (this.group as any)._orbitGroup as THREE.Group | undefined
    if (orbitGroup) {
      const speed = 0.25
      for (const child of orbitGroup.children) {
        const { orbit, spinRate, pairA, pairB, solidIndex } = child.userData

        if (orbit && solidIndex === undefined) {
          const s = t * speed
          child.position.set(
            orbit.a * Math.sin(orbit.freqX * s),
            orbit.b * Math.sin(orbit.freqY * s + orbit.phaseY),
            orbit.c * Math.sin(orbit.freqZ * s + orbit.phaseZ),
          )
          child.rotation.x = t * spinRate
          child.rotation.y = t * spinRate * 0.7
          child.rotation.z = t * spinRate * 0.3
        }

        if (pairA !== undefined && pairB !== undefined && child instanceof THREE.Line) {
          const a = orbitGroup.children[pairA]
          const b = orbitGroup.children[pairB]
          if (a && b) {
            const pos = child.geometry.getAttribute('position') as THREE.BufferAttribute
            pos.setXYZ(0, a.position.x, a.position.y, a.position.z)
            pos.setXYZ(1, b.position.x, b.position.y, b.position.z)
            pos.needsUpdate = true
          }
        }

        // Update trail: record path in ring buffer, build line from last path (oldest→newest), taper off
        if (solidIndex !== undefined && child instanceof THREE.Line) {
          const pathHistory = child.userData.pathHistory as Float32Array
          const linePositions = child.userData.linePositions as Float32Array
          if (!pathHistory || !linePositions) continue
          const solid = orbitGroup.children[solidIndex]
          if (!solid) continue

          const TRAIL_INTERVAL = 0.016
          const lastPush = (child.userData.lastPushTime as number) ?? -1
          if (lastPush < 0 || t - lastPush >= TRAIL_INTERVAL) {
            child.userData.lastPushTime = t
            const mx = child.userData.maxCount as number
            let wi = (child.userData.writeIndex as number) ?? 0
            let cnt = (child.userData.count as number) ?? 0
            pathHistory[wi * 3] = solid.position.x
            pathHistory[wi * 3 + 1] = solid.position.y
            pathHistory[wi * 3 + 2] = solid.position.z
            wi = (wi + 1) % mx
            cnt = Math.min(cnt + 1, mx)
            child.userData.writeIndex = wi
            child.userData.count = cnt
          }

          const mx = child.userData.maxCount as number
          const cnt = child.userData.count as number
          const wi = child.userData.writeIndex as number
          const oldest = cnt > 0 ? (wi - cnt + mx) % mx : 0
          for (let i = 0; i < cnt; i++) {
            const k = (oldest + i) % mx
            linePositions[i * 3] = pathHistory[k * 3]!
            linePositions[i * 3 + 1] = pathHistory[k * 3 + 1]!
            linePositions[i * 3 + 2] = pathHistory[k * 3 + 2]!
          }
          const n = cnt

          const posAttr = child.geometry.getAttribute('position') as THREE.BufferAttribute
          const tAttr = child.userData.tBuffer as THREE.BufferAttribute
          for (let i = 0; i < n; i++) {
            posAttr.setXYZ(
              i,
              linePositions[i * 3]!,
              linePositions[i * 3 + 1]!,
              linePositions[i * 3 + 2]!,
            )
            tAttr.setX(i, n > 1 ? i / (n - 1) : 1)
          }
          tAttr.needsUpdate = true
          posAttr.needsUpdate = true
          child.geometry.setDrawRange(0, n)

          const trailPoints = child.userData.trailPoints as THREE.Points
          const trailPointsT = child.userData.trailPointsT as THREE.BufferAttribute
          if (trailPoints?.geometry) {
            const pp = trailPoints.geometry.getAttribute('position') as THREE.BufferAttribute
            for (let i = 0; i < n; i++) {
              pp.setXYZ(
                i,
                linePositions[i * 3]!,
                linePositions[i * 3 + 1]!,
                linePositions[i * 3 + 2]!,
              )
              trailPointsT.setX(i, n > 1 ? i / (n - 1) : 1)
            }
            pp.needsUpdate = true
            trailPointsT.needsUpdate = true
            trailPoints.geometry.setDrawRange(0, n)
          }

          const trailRibbon = child.userData.trailRibbon as THREE.Mesh
          const ribbonPos = child.userData.ribbonPos as Float32Array
          const ribbonT = child.userData.ribbonT as Float32Array
          const baseWidth = (child.userData.trailRibbonWidth as number) ?? 0.12
          const glowWidth = (child.userData.trailGlowWidth as number) ?? 0
          if (trailRibbon && ribbonPos && n >= 2) {
            const worldUp = new THREE.Vector3(0.2, 1, 0.15).normalize()
            const fillRibbon = (outPos: Float32Array, outT: Float32Array, width: number) => {
              for (let i = 0; i < n; i++) {
                const ti = n > 1 ? i / (n - 1) : 1
                const px = linePositions[i * 3]!
                const py = linePositions[i * 3 + 1]!
                const pz = linePositions[i * 3 + 2]!
                let tx: number, ty: number, tz: number
                if (i === 0) {
                  tx = linePositions[3]! - px
                  ty = linePositions[4]! - py
                  tz = linePositions[5]! - pz
                } else if (i === n - 1) {
                  tx = px - linePositions[(n - 2) * 3]!
                  ty = py - linePositions[(n - 2) * 3 + 1]!
                  tz = pz - linePositions[(n - 2) * 3 + 2]!
                } else {
                  tx = linePositions[(i + 1) * 3]! - linePositions[(i - 1) * 3]!
                  ty = linePositions[(i + 1) * 3 + 1]! - linePositions[(i - 1) * 3 + 1]!
                  tz = linePositions[(i + 1) * 3 + 2]! - linePositions[(i - 1) * 3 + 2]!
                }
                const len = Math.hypot(tx, ty, tz) || 1
                tx /= len
                ty /= len
                tz /= len
                const upX = worldUp.x + 0.25 * tx
                const upY = worldUp.y + 0.25 * ty
                const upZ = worldUp.z + 0.25 * tz
                const ulen = Math.hypot(upX, upY, upZ) || 1
                let sx = ty * (upZ / ulen) - tz * (upY / ulen)
                let sy = tz * (upX / ulen) - tx * (upZ / ulen)
                let sz = tx * (upY / ulen) - ty * (upX / ulen)
                const slen = Math.hypot(sx, sy, sz) || 1
                sx /= slen
                sy /= slen
                sz /= slen
                const w = width * (0.05 + 0.95 * ti * ti)
                const l = 2 * i
                outPos[l * 3] = px - sx * w
                outPos[l * 3 + 1] = py - sy * w
                outPos[l * 3 + 2] = pz - sz * w
                outPos[(l + 1) * 3] = px + sx * w
                outPos[(l + 1) * 3 + 1] = py + sy * w
                outPos[(l + 1) * 3 + 2] = pz + sz * w
                outT[l] = ti
                outT[l + 1] = ti
              }
            }
            fillRibbon(ribbonPos, ribbonT, baseWidth)
            const ribPosAttr = trailRibbon.geometry.getAttribute(
              'position',
            ) as THREE.BufferAttribute
            const ribTAttr = trailRibbon.geometry.getAttribute('trailT') as THREE.BufferAttribute
            for (let i = 0; i < n * 2; i++) {
              ribPosAttr.setXYZ(i, ribbonPos[i * 3]!, ribbonPos[i * 3 + 1]!, ribbonPos[i * 3 + 2]!)
              ribTAttr.setX(i, ribbonT[i]!)
            }
            ribPosAttr.needsUpdate = true
            ribTAttr.needsUpdate = true
            trailRibbon.geometry.setDrawRange(0, (n - 1) * 6)
            const ribMat = trailRibbon.material as THREE.ShaderMaterial
            if (ribMat.uniforms?.uTime) ribMat.uniforms.uTime.value = t

            const trailGlowRibbon = child.userData.trailGlowRibbon as THREE.Mesh | null
            const ribbonGlowPos = child.userData.ribbonGlowPos as Float32Array | undefined
            const ribbonGlowT = child.userData.ribbonGlowT as Float32Array | undefined
            if (trailGlowRibbon && glowWidth > 0 && ribbonGlowPos && ribbonGlowT) {
              fillRibbon(ribbonGlowPos, ribbonGlowT, glowWidth)
              const glowPosAttr = trailGlowRibbon.geometry.getAttribute(
                'position',
              ) as THREE.BufferAttribute
              const glowTAttr = trailGlowRibbon.geometry.getAttribute(
                'trailT',
              ) as THREE.BufferAttribute
              for (let i = 0; i < n * 2; i++) {
                glowPosAttr.setXYZ(
                  i,
                  ribbonGlowPos[i * 3]!,
                  ribbonGlowPos[i * 3 + 1]!,
                  ribbonGlowPos[i * 3 + 2]!,
                )
                glowTAttr.setX(i, ribbonGlowT[i]!)
              }
              glowPosAttr.needsUpdate = true
              glowTAttr.needsUpdate = true
              trailGlowRibbon.geometry.setDrawRange(0, (n - 1) * 6)
              const glowMat = trailGlowRibbon.material as THREE.ShaderMaterial
              if (glowMat.uniforms?.uTime) glowMat.uniforms.uTime.value = t
            }
          }
        }
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
    this.timer.dispose()
    this.composer.dispose()
    this.renderer.dispose()
    this.scene.traverse((obj) => {
      if (
        obj instanceof THREE.Mesh ||
        obj instanceof THREE.LineSegments ||
        obj instanceof THREE.Line ||
        obj instanceof THREE.Points
      ) {
        obj.geometry.dispose()
        const mat = obj.material
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
        else (mat as THREE.Material).dispose()
      }
    })
  }
}
