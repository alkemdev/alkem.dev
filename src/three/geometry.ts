import * as THREE from 'three'
import vertexShader from './shaders/vertex.glsl?raw'
import fragmentShader from './shaders/fragment.glsl?raw'
import trailLineVert from './shaders/trailLine.vert.glsl?raw'
import trailLineFrag from './shaders/trailLine.frag.glsl?raw'
import trailPointVert from './shaders/trailPoint.vert.glsl?raw'
import trailPointFrag from './shaders/trailPoint.frag.glsl?raw'
import trailRibbonVert from './shaders/trailRibbon.vert.glsl?raw'
import trailRibbonFrag from './shaders/trailRibbon.frag.glsl?raw'
import { defaultSceneConfig, type SceneConfig } from './config'

function hexToVec3(hex: number): THREE.Vector3 {
  return new THREE.Vector3(
    ((hex >> 16) & 0xff) / 255,
    ((hex >> 8) & 0xff) / 255,
    (hex & 0xff) / 255,
  )
}

export interface FractalUniforms {
  uTime: THREE.IUniform<number>
  uOpacity: THREE.IUniform<number>
}

export function createFractalGeometry(config: SceneConfig = defaultSceneConfig): { group: THREE.Group; uniforms: FractalUniforms } {
  const group = new THREE.Group()
  const cfg = config.flask

  const uniforms: FractalUniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 1 },
  }

  const horizontalSegments = cfg.radialSegments
  const verticalSegments = Math.max(2, cfg.verticalSegments)
  const subdiv = Math.max(1, cfg.profileSubdivisions)

  // --- Flask body built from the SVG outline ---
  // Vertical resolution = verticalSegments (rings along profile).
  // Horizontal resolution = radialSegments (segments around the axis).
  const baseProfile = buildFlaskProfileFromSVG()
  const profile = subdivideProfile(baseProfile, subdiv)
  const numRings = verticalSegments
  const profileUniform = resampleProfileByArcLength(profile, numRings)
  const flaskGeo = buildRegularGridLathe(profileUniform, horizontalSegments)
  const flatFlask = toFlatShaded(flaskGeo)
  addCylindricalUVs(flatFlask, profileUniform)

  const flaskMat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  group.add(new THREE.Mesh(flatFlask, flaskMat))

  // --- Wireframe: every triangle edge, pronounced ---
  const wireframeGeo = new THREE.WireframeGeometry(flatFlask)
  const wireframeMat = new THREE.LineBasicMaterial({
    color: 0xcc99ee,
    transparent: true,
    opacity: cfg.wireframeOpacity,
  })
  group.add(new THREE.LineSegments(wireframeGeo, wireframeMat))

  // --- Junction points: where wireframe edges meet (on top of wireframe) ---
  const verts = extractUniqueVertices(flatFlask)
  const vGeo = new THREE.BufferGeometry()
  vGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  group.add(new THREE.Points(vGeo.clone(), new THREE.PointsMaterial({
    color: 0xcc99ee,
    size: 0.045,
    transparent: true,
    opacity: 1,
    sizeAttenuation: true,
  })))
  if (cfg.vertexHaloSize > 0) {
    group.add(new THREE.Points(vGeo.clone(), new THREE.PointsMaterial({
      color: 0x88ddaa,
      size: cfg.vertexHaloSize,
      transparent: true,
      opacity: cfg.vertexHaloOpacity,
      sizeAttenuation: true,
    })))
  }
  group.add(new THREE.Points(vGeo, new THREE.PointsMaterial({
    color: 0x88ddaa,
    size: cfg.vertexSize,
    transparent: true,
    opacity: cfg.vertexOpacity,
    sizeAttenuation: true,
  })))

  // --- Collar / lip ring at neck top ---
  if (cfg.showCollar) {
    const collarGeo = new THREE.TorusGeometry(0.297, 0.02, 6, horizontalSegments)
    const collarEdges = new THREE.EdgesGeometry(collarGeo)
    const collar = new THREE.LineSegments(collarEdges,
      new THREE.LineBasicMaterial({ color: 0xaa66cc, transparent: true, opacity: cfg.wireframeOpacity }))
    collar.position.y = 1.43
    collar.rotation.x = Math.PI / 2
    group.add(collar)
  }

  // --- Inner liquid geometry (green, filling lower portion) ---
  if (cfg.showLiquid) {
    const baseLiquid = buildLiquidProfile()
    const liquidProfile = subdivideProfile(baseLiquid, subdiv)
    const liquidNumRings = Math.max(4, Math.floor(verticalSegments * 0.55))
    const liquidProfileUniform = resampleProfileByArcLength(liquidProfile, liquidNumRings)
    const liquidGeo = buildRegularGridLathe(liquidProfileUniform, horizontalSegments)
    const flatLiquid = toFlatShaded(liquidGeo)
    group.add(new THREE.Mesh(flatLiquid, new THREE.MeshBasicMaterial({
      color: 0x306844, // Darker green
      transparent: true,
      opacity: 0.35, // Increased opacity
      side: THREE.DoubleSide,
    })))
    const liqEdges = new THREE.EdgesGeometry(flatLiquid, cfg.wireframeAngleThreshold)
    group.add(new THREE.LineSegments(liqEdges,
      new THREE.LineBasicMaterial({ color: 0x306844, transparent: true, opacity: 0.9 }))) // Increased opacity

    // --- Meniscus ring (liquid surface line) ---
    const meniscusR = liquidProfileUniform[1]!.x
    const meniscusY = liquidProfileUniform[1]!.y
    const meniscusSegs = horizontalSegments
    const mPts: THREE.Vector3[] = []
    for (let i = 0; i <= meniscusSegs; i++) {
      const a = (i / meniscusSegs) * Math.PI * 2
      mPts.push(new THREE.Vector3(Math.cos(a) * meniscusR, meniscusY, Math.sin(a) * meniscusR))
    }
    group.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(mPts),
      new THREE.LineBasicMaterial({ color: 0x306844, transparent: true, opacity: 0.8 }),
    ))
  }

  // --- All 5 Platonic solids on mathematical orbits ---
  // Dual pairs: cube↔octa, dodeca↔icosa. Colors from config.platonicColors schema.
  const orbitGroup = new THREE.Group()
  const orbitsCfg = config.orbits ?? defaultSceneConfig.orbits
  const colors = orbitsCfg.platonicColors

  const platonics: {
    geo: THREE.BufferGeometry
    color: number
    size: number
    orbit: { a: number; b: number; c: number; freqX: number; freqY: number; freqZ: number; phaseY: number; phaseZ: number }
    spinRate: number
  }[] = [
    {
      geo: new THREE.TetrahedronGeometry(0.07, 0),
      color: colors[0],
      size: 0.07,
      orbit: { a: 2.2, b: 0.5, c: 1.9, freqX: 3, freqY: 5, freqZ: 2, phaseY: Math.PI / 2, phaseZ: Math.PI / 4 },
      spinRate: 1.1,
    },
    {
      geo: new THREE.BoxGeometry(0.09, 0.09, 0.09),
      color: colors[1],
      size: 0.09,
      orbit: { a: 2.5, b: 0.6, c: 2.2, freqX: 2, freqY: 3, freqZ: 2, phaseY: 0, phaseZ: Math.PI / 2 },
      spinRate: -0.6,
    },
    {
      geo: new THREE.OctahedronGeometry(0.065, 0),
      color: colors[2],
      size: 0.065,
      orbit: { a: 1.9, b: 0.75, c: 1.7, freqX: 4, freqY: 2, freqZ: 3, phaseY: Math.PI / 3, phaseZ: -Math.PI / 6 },
      spinRate: 0.8,
    },
    {
      geo: new THREE.DodecahedronGeometry(0.06, 0),
      color: colors[3],
      size: 0.06,
      orbit: { a: 2.4, b: 0.45, c: 2.0, freqX: 1, freqY: 4, freqZ: 3, phaseY: Math.PI * 0.7, phaseZ: Math.PI / 6 },
      spinRate: -0.5,
    },
    {
      geo: new THREE.IcosahedronGeometry(0.055, 0),
      color: colors[4],
      size: 0.055,
      orbit: { a: 1.7, b: 0.85, c: 1.8, freqX: 5, freqY: 3, freqZ: 4, phaseY: Math.PI / 5, phaseZ: Math.PI / 3 },
      spinRate: 1.2,
    },
  ]

  const cometScale = orbitsCfg.cometScale

  for (const p of platonics) {
    const solidGroup = new THREE.Group()
    solidGroup.scale.setScalar(cometScale)
    const edges = new THREE.EdgesGeometry(p.geo)
    const wireframe = new THREE.LineSegments(edges,
      new THREE.LineBasicMaterial({ color: p.color, transparent: true, opacity: 0.75, depthWrite: true }))
    solidGroup.add(wireframe)
    const faceMat = new THREE.MeshBasicMaterial({
      color: p.color, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: true,
    })
    solidGroup.add(new THREE.Mesh(p.geo.clone(), faceMat))
    solidGroup.userData = { orbit: p.orbit, spinRate: p.spinRate }
    orbitGroup.add(solidGroup)
  }

  // Connection lines between dual pairs (updated each frame)
  const connectionMat = new THREE.LineBasicMaterial({
    color: 0x555577, transparent: true, opacity: 0.18,
  })
  const dualPairs = [[1, 2], [3, 4]]
  for (const [i, j] of dualPairs) {
    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3))
    const line = new THREE.Line(lineGeo, connectionMat)
    line.userData = { pairA: i, pairB: j }
    orbitGroup.add(line)
  }

  // Per-solid trails: path history → ribbon (+ optional glow) + line + points. Controllable width/opacity.
  const TRAIL_LENGTH = 128
  const speed = 0.25
  const RIBBON_MAX = (TRAIL_LENGTH + 1) * 2
  const trailRibbonWidth = orbitsCfg.trailRibbonWidth
  const trailGlowWidth = orbitsCfg.trailGlowWidth

  for (let idx = 0; idx < platonics.length; idx++) {
    const p = platonics[idx]!
    const pathHistory = new Float32Array(TRAIL_LENGTH * 3)
    const linePositions = new Float32Array((TRAIL_LENGTH + 1) * 3)
    const tBuffer = new Float32Array(TRAIL_LENGTH + 1)

    const trailGeo = new THREE.BufferGeometry()
    trailGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
    trailGeo.setAttribute('trailT', new THREE.BufferAttribute(tBuffer, 1))
    trailGeo.setDrawRange(0, 0)

    const trailLineMat = new THREE.ShaderMaterial({
      vertexShader: trailLineVert,
      fragmentShader: trailLineFrag,
      uniforms: {
        uColor: { value: hexToVec3(p.color) },
        uOpacity: { value: orbitsCfg.trailLineOpacity },
      },
      transparent: true,
      depthWrite: false,
    })
    const trailLine = new THREE.Line(trailGeo, trailLineMat)

    const trailPointsGeo = new THREE.BufferGeometry()
    trailPointsGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((TRAIL_LENGTH + 1) * 3), 3))
    trailPointsGeo.setAttribute('trailT', new THREE.BufferAttribute(new Float32Array(TRAIL_LENGTH + 1), 1))
    trailPointsGeo.setDrawRange(0, 0)
    const trailPointsMat = new THREE.ShaderMaterial({
      vertexShader: trailPointVert,
      fragmentShader: trailPointFrag,
      uniforms: {
        uColor: { value: hexToVec3(p.color) },
        uOpacity: { value: orbitsCfg.trailPointsOpacity },
        uPointSizeScale: { value: orbitsCfg.trailPointsSize },
      },
      transparent: true,
      depthWrite: false,
    })
    const trailPoints = new THREE.Points(trailPointsGeo, trailPointsMat)

    const ribbonIndices: number[] = []
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const a = i * 2
      ribbonIndices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }

    const ribbonPos = new Float32Array(RIBBON_MAX * 3)
    const ribbonT = new Float32Array(RIBBON_MAX)
    const ribbonGeo = new THREE.BufferGeometry()
    ribbonGeo.setAttribute('position', new THREE.BufferAttribute(ribbonPos, 3))
    ribbonGeo.setAttribute('trailT', new THREE.BufferAttribute(ribbonT, 1))
    ribbonGeo.setIndex(ribbonIndices)
    ribbonGeo.setDrawRange(0, 0)
    const ribbonMat = new THREE.ShaderMaterial({
      vertexShader: trailRibbonVert,
      fragmentShader: trailRibbonFrag,
      uniforms: {
        uColor: { value: hexToVec3(p.color) },
        uOpacity: { value: orbitsCfg.trailRibbonOpacity },
        uTime: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    const trailRibbon = new THREE.Mesh(ribbonGeo, ribbonMat)

    const userData: Record<string, unknown> = {
      solidIndex: idx,
      pathHistory,
      linePositions,
      tBuffer: trailGeo.getAttribute('trailT') as THREE.BufferAttribute,
      writeIndex: 0,
      count: 0,
      maxCount: TRAIL_LENGTH,
      orbit: p.orbit,
      speed,
      lastPushTime: -1,
      trailPoints,
      trailPointsT: trailPointsGeo.getAttribute('trailT') as THREE.BufferAttribute,
      trailRibbon,
      ribbonPos,
      ribbonT,
      trailRibbonWidth,
      trailGlowWidth,
    }

    let trailGlowRibbon: THREE.Mesh | null = null
    if (trailGlowWidth > 0) {
      const glowPos = new Float32Array(RIBBON_MAX * 3)
      const glowT = new Float32Array(RIBBON_MAX)
      const glowGeo = new THREE.BufferGeometry()
      glowGeo.setAttribute('position', new THREE.BufferAttribute(glowPos, 3))
      glowGeo.setAttribute('trailT', new THREE.BufferAttribute(glowT, 1))
      glowGeo.setIndex([...ribbonIndices])
      glowGeo.setDrawRange(0, 0)
      const glowMat = new THREE.ShaderMaterial({
        vertexShader: trailRibbonVert,
        fragmentShader: trailRibbonFrag,
        uniforms: {
          uColor: { value: hexToVec3(p.color) },
          uOpacity: { value: orbitsCfg.trailGlowOpacity },
          uTime: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
      trailGlowRibbon = new THREE.Mesh(glowGeo, glowMat)
      userData.trailGlowRibbon = trailGlowRibbon
      userData.ribbonGlowPos = glowPos
      userData.ribbonGlowT = glowT
      orbitGroup.add(trailGlowRibbon)
    }

    trailLine.userData = userData
    orbitGroup.add(trailRibbon)
    orbitGroup.add(trailPoints)
    orbitGroup.add(trailLine)
  }

  group.add(orbitGroup)
  ;(group as any)._orbitGroup = orbitGroup

  // --- Particle dust ---
  group.add(makeParticleCloud(250, 2.0, 3.0, 0x9955bb, 0.015, 0.4))
  group.add(makeParticleCloud(100, 1.0, 0.8, 0x60a879, 0.012, 0.3, -0.3))

  return { group, uniforms }
}

/** Subdivide profile with linear interpolation so the lathe has more rings → finer triangular mesh. */
function subdivideProfile(profile: THREE.Vector2[], segmentsPerSpan: number): THREE.Vector2[] {
  if (segmentsPerSpan <= 1) return profile
  const out: THREE.Vector2[] = []
  for (let i = 0; i < profile.length - 1; i++) {
    const a = profile[i]!
    const b = profile[i + 1]!
    for (let k = 0; k < segmentsPerSpan; k++) {
      const t = k / segmentsPerSpan
      out.push(new THREE.Vector2(
        a.x + (b.x - a.x) * t,
        a.y + (b.y - a.y) * t,
      ))
    }
  }
  out.push(profile[profile.length - 1]!)
  return out
}

/** Resample profile so consecutive points are evenly spaced by arc length along the curve. */
function resampleProfileByArcLength(profile: THREE.Vector2[], numPoints: number): THREE.Vector2[] {
  if (numPoints <= 1) return profile.length ? [profile[0]!.clone()] : []
  const lengths: number[] = [0]
  for (let i = 1; i < profile.length; i++) {
    const a = profile[i - 1]!
    const b = profile[i]!
    lengths.push(lengths[lengths.length - 1]! + Math.hypot(b.x - a.x, b.y - a.y))
  }
  const total = lengths[lengths.length - 1]!
  if (total <= 0) return profile
  const out: THREE.Vector2[] = []
  for (let k = 0; k < numPoints; k++) {
    const s = (k / (numPoints - 1)) * total
    let i = 0
    while (i < lengths.length - 1 && lengths[i + 1]! < s) i++
    const t = i < lengths.length - 1
      ? (s - lengths[i]!) / (lengths[i + 1]! - lengths[i]!)
      : 1
    const a = profile[i]!
    const b = profile[Math.min(i + 1, profile.length - 1)]!
    out.push(new THREE.Vector2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t))
  }
  return out
}

/** Regular M×N grid lathe: one vertex per (ring, angle). No variable n, no jitter — robust geometry. */
function buildRegularGridLathe(profile: THREE.Vector2[], radialSegments: number): THREE.BufferGeometry {
  if (profile.length < 2 || radialSegments < 3) return new THREE.LatheGeometry(profile, radialSegments, 0, Math.PI * 2)
  const M = profile.length
  const N = radialSegments
  const positions: number[] = []
  for (let j = 0; j < M; j++) {
    const r = Math.max(profile[j]!.x, 1e-6)
    const y = profile[j]!.y
    const halfStep = (j % 2) * (Math.PI / N)
    for (let k = 0; k < N; k++) {
      const theta = (k / N) * Math.PI * 2 + halfStep
      positions.push(r * Math.cos(theta), y, r * Math.sin(theta))
    }
  }
  const indices: number[] = []
  for (let j = 0; j < M - 1; j++) {
    for (let k = 0; k < N; k++) {
      const k1 = (k + 1) % N
      const i0 = j * N + k
      const i1 = (j + 1) * N + k
      const i2 = (j + 1) * N + k1
      const i3 = j * N + k1
      indices.push(i0, i1, i2, i0, i2, i3)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  return geo
}

function buildFlaskProfileFromSVG(): THREE.Vector2[] {
  // Derived from the SVG outline path.
  // SVG coordinate key points (x from center = radius, y):
  //   Collar top: r≈1.3, y=1.33
  //   Collar bottom/neck top: r≈1.37, y=2.46
  //   Neck is straight: r=1.37, y=2.46 to y≈5.9
  //   Shoulder: r grows from 1.37 -> 5.3 as y goes 5.9 -> 8.8
  //   Body: r≈5.4..6.5, y=8.8..13.5
  //   Bottom rounds off: y≈15.16
  //
  // Map into 3D: scale so max radius = 1.0, total height ≈ 3.0
  // SVG max radius ≈ 6.5, SVG height range ≈ 13.8 (y=1.33 to 15.16)
  // rScale = 1.0 / 6.5, yScale maps [1.33, 15.16] -> [1.8, -1.3]

  // The logo is essentially a triangle/cone with a cylinder neck on top.
  // Straight diagonal sides from the neck base to a wide, slightly rounded base.
  const rScale = 1.0 / 32.0
  const yTop = 1.33
  const yBot = 15.16
  const yRange = yBot - yTop
  const mapY = (svgY: number) => 1.8 - ((svgY - yTop) / yRange) * 3.1

  const rawPoints: [number, number][] = [
    // Collar / lip — 5% wider, lower
    [0.01, 3.0],
    [9.50, 3.0],
    [10.28, 3.2],
    [9.50, 3.4],
    // Neck
    [9.50, 3.8],
    [9.50, 4.5],
    [9.50, 5.2],
    [9.50, 5.8],
    // Shoulder
    [10.50, 6.05],
    [12.50, 6.4],
    // Sides — slightly less steep
    [17.00, 7.2],
    [21.50, 8.0],
    [26.00, 9.0],
    // Wide flat base (same as before)
    [32.00, 11.0],
    [32.00, 12.0],
    [32.00, 12.8],
    // Base curves under
    [31.00, 13.3],
    [28.30, 13.8],
    [22.40, 14.2],
    [12.80, 14.5],
    [0.01, 14.65],
  ]

  return rawPoints.map(([r, y]) =>
    new THREE.Vector2(r * rScale, mapY(y))
  )
}

function buildLiquidProfile(): THREE.Vector2[] {
  // Liquid fills up to roughly the SVG liquid top line at y≈6.84 -> mapped y
  // which is in the shoulder area. Use the flask profile but inset and cut at liquid line.
  const rScale = 1.0 / 32.0
  const yTop = 1.33
  const yBot = 15.16
  const yRange = yBot - yTop
  const mapY = (svgY: number) => 1.8 - ((svgY - yTop) / yRange) * 3.1

  // Liquid tracks outer shell minus small inset; surface lowered (less full)
  const inset = 0.04
  const rawPoints: [number, number][] = [
    [0.01, 9.5],
    [21.00, 9.5],     // liquid surface lower
    [26.00, 10.0],
    [31.90, 11.0],
    [31.90, 12.0],
    [31.90, 12.8],
    [30.90, 13.3],
    [28.20, 13.8],
    [22.30, 14.2],
    [12.70, 14.45],
    [0.01, 14.6],
  ]

  return rawPoints.map(([r, y]) =>
    new THREE.Vector2(Math.max(0.01, r * rScale - inset), mapY(y))
  )
}

function makeParticleCloud(
  count: number, rMin: number, rRange: number,
  color: number, size: number, opacity: number, yOffset = 0,
): THREE.Points {
  const pos = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = rMin + Math.random() * rRange
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) + yOffset
    pos[i * 3 + 2] = r * Math.cos(phi)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  return new THREE.Points(geo, new THREE.PointsMaterial({
    color, size, transparent: true, opacity, sizeAttenuation: true,
  }))
}

function toFlatShaded(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const flat = geometry.toNonIndexed()
  flat.computeVertexNormals()
  return flat
}

function addCylindricalUVs(geometry: THREE.BufferGeometry, profile: THREE.Vector2[]) {
  const pos = geometry.getAttribute('position')
  const yMin = profile[profile.length - 1]!.y
  const yMax = profile[0]!.y
  const uvs = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    uvs[i * 2] = Math.atan2(z, x) / (2 * Math.PI) + 0.5
    uvs[i * 2 + 1] = (y - yMin) / (yMax - yMin)
  }
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
}

function extractUniqueVertices(geometry: THREE.BufferGeometry): number[] {
  const pos = geometry.getAttribute('position')
  const seen = new Set<string>()
  const out: number[] = []
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const key = `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`
    if (!seen.has(key)) {
      seen.add(key)
      out.push(x, y, z)
    }
  }
  return out
}
