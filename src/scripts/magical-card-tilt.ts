/** 3D tilt for `.magical-card` links — one module, loaded once from Root. */
const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function setupCard(el: HTMLElement) {
  if (el.hasAttribute('data-tilt-bound')) return
  el.setAttribute('data-tilt-bound', 'true')
  if (prefersReducedMotion) return

  el.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = ((y - centerY) / centerY) * -4
    const rotateY = ((x - centerX) / centerX) * 4

    el.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`

    const inner = el.querySelector('.magical-card-inner') as HTMLElement | null
    if (!inner) return
    inner.style.transformStyle = 'preserve-3d'
    Array.from(inner.children).forEach((child, i) => {
      const z = 5 + (i % 4) * 4
      ;(child as HTMLElement).style.transform = `translateZ(${z}px)`
    })
  })

  el.addEventListener('mouseleave', () => {
    el.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)'
    const inner = el.querySelector('.magical-card-inner') as HTMLElement | null
    if (inner) {
      Array.from(inner.children).forEach((child) => {
        ;(child as HTMLElement).style.transform = 'translateZ(0px)'
      })
    }
  })
}

export function initMagicalCardTilt() {
  document.querySelectorAll<HTMLElement>('.magical-card').forEach(setupCard)
}

initMagicalCardTilt()
document.addEventListener('astro:page-load', initMagicalCardTilt)
