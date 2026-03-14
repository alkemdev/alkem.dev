# Three.js Hero Scene

The landing page hero renders a polyhedral flask modeled after the
[logo SVG](../../public/images/flask.svg). The flask rotates slowly,
responds to mouse movement, and fades out on scroll.

## Architecture

```
scene.ts        Entry point — camera, renderer, post-processing, animation loop
geometry.ts     Flask mesh construction from SVG coordinates
scroll.ts       GSAP ScrollTrigger integration
shaders/
  vertex.glsl   Pass-through vertex shader (no displacement)
  fragment.glsl Region-based coloring: glass neck, purple shoulder, green liquid
```

## How the flask is built

The flask shape is defined by a 2D profile derived from the SVG logo's
outline path. Key SVG coordinates are mapped into 3D space with a scale
factor and y-axis transformation, then passed to `THREE.LatheGeometry`
to create a surface of revolution.

The geometry is flat-shaded (`toNonIndexed()` + `computeVertexNormals()`)
so each polygon face is visually distinct.

### Layers (bottom to top in the scene graph)

1. **Flask body** — ShaderMaterial with custom GLSL (glass + liquid regions)
2. **Wireframe edges** — `EdgesGeometry` with purple `LineBasicMaterial`
3. **Vertex dots** — `Points` at unique vertices (green)
4. **Collar ring** — `TorusGeometry` wireframe at the neck opening
5. **Inner liquid** — Slightly inset `LatheGeometry` with green fill
6. **Liquid wireframe** — Green edge lines on the liquid mesh
7. **Meniscus ring** — `Line` loop at the liquid surface level
8. **Orbiting polyhedra** — Wireframe tetrahedra, octahedra, etc.
9. **Particle dust** — Two `Points` clouds (purple outer, green inner)

## Camera

Uses `THREE.OrthographicCamera` for an isometric look — no perspective
distortion. The camera sits above and in front of the flask, looking
slightly down.

## Post-processing

- `RenderPass` — standard scene render
- `UnrealBloomPass` — subtle glow on bright edges
- `OutputPass` — tone mapping and color space conversion

## Fragment shader regions

The fragment shader divides the flask into three zones based on `vPosition.y`:

| Zone | Y range | Color |
|------|---------|-------|
| Neck (glass) | Above 0.84 | Deep purple, very transparent |
| Shoulder (purple liquid) | 0.42 – 0.84 | Swirling purple |
| Body (green liquid) | Below 0.42 | Bright green with bubbles |

Fresnel rim lighting adds edge glow, and a noise-based sparkle adds
subtle gold highlights.

## Modifying the flask shape

Edit the `rawPoints` array in `buildFlaskProfileFromSVG()` in
`geometry.ts`. Points are `[svgRadius, svgY]` pairs that get mapped to
3D coordinates. After changing the flask profile, update the matching
`buildLiquidProfile()` to keep the liquid aligned with the shell.
