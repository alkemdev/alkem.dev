import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { HeroScene } from './scene'

gsap.registerPlugin(ScrollTrigger)

export function initScrollAnimation(scene: HeroScene): ScrollTrigger {
  const trigger = ScrollTrigger.create({
    trigger: '#hero',
    start: 'top top',
    end: 'bottom top',
    scrub: 1,
    onUpdate: (self) => {
      const progress = self.progress
      // Pull camera back as user scrolls
      scene.camera.position.z = 5.5 + progress * 4
      // Fade out the geometry
      scene.uniforms.uOpacity.value = 1 - progress
      // Scale down slightly
      const scale = 1 - progress * 0.3
      scene.group.scale.setScalar(scale)
    },
  })

  return trigger
}
