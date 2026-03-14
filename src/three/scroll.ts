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
      const p = self.progress
      scene.uniforms.uOpacity.value = 1 - p
      scene.group.scale.setScalar(1 - p * 0.3)
    },
  })

  return trigger
}
