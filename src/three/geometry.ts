import * as THREE from 'three'
import vertexShader from './shaders/vertex.glsl?raw'
import fragmentShader from './shaders/fragment.glsl?raw'

export interface FractalUniforms {
  uTime: THREE.IUniform<number>
  uOpacity: THREE.IUniform<number>
}

export function createFractalGeometry(): { group: THREE.Group; uniforms: FractalUniforms } {
  const group = new THREE.Group()

  const uniforms: FractalUniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 1 },
  }

  const segments = 12

  // --- Flask body built from the SVG outline ---
  // The SVG viewbox is 16×16, centered at x=8.
  // Outline path key points (x, y) in SVG coords:
  //   Neck left: x=6.645 -> radius = 8 - 6.645 = 1.355
  //   Neck runs from y=2.457 to y≈5.9
  //   Shoulder flares: radius goes from 1.355 to ~5.3 over y=5.9..8.8
  //   Body widest: radius ~6.5 at y≈13
  //   Bottom: y≈15.16, radius tapers to ~5.4 then to 0
  //
  // Normalize to unit scale: divide radii by 6.5 and map y into [-1, top].
  // Total height in SVG: ~12.7 (from y=2.457 to y=15.16).
  // Let's map so center of body is at y=0.
  // Scale factor for radius: 1/6.5 ≈ 0.154
  // Scale factor for height: map [2.457, 15.16] -> [1.8, -1.15] (top to bottom)

  const profile = buildFlaskProfileFromSVG()
  const flaskGeo = new THREE.LatheGeometry(profile, segments, 0, Math.PI * 2)
  const flatFlask = toFlatShaded(flaskGeo)
  addCylindricalUVs(flatFlask, profile)

  const flaskMat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  group.add(new THREE.Mesh(flatFlask, flaskMat))

  // --- Wireframe edges (polyhedral structure) ---
  const edgesGeo = new THREE.EdgesGeometry(flatFlask, 10)
  const edgesMat = new THREE.LineBasicMaterial({
    color: 0xaa66cc,
    transparent: true,
    opacity: 0.5,
  })
  group.add(new THREE.LineSegments(edgesGeo, edgesMat))

  // --- Vertex dots ---
  const verts = extractUniqueVertices(flatFlask)
  const vGeo = new THREE.BufferGeometry()
  vGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  group.add(new THREE.Points(vGeo, new THREE.PointsMaterial({
    color: 0x88ddaa,
    size: 0.035,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
  })))

  // --- Collar / lip ring at neck top ---
  const collarGeo = new THREE.TorusGeometry(0.297, 0.02, 6, segments)
  const collarEdges = new THREE.EdgesGeometry(collarGeo)
  const collar = new THREE.LineSegments(collarEdges,
    new THREE.LineBasicMaterial({ color: 0xaa66cc, transparent: true, opacity: 0.5 }))
  collar.position.y = 1.43
  collar.rotation.x = Math.PI / 2
  group.add(collar)

  // --- Inner liquid geometry (green, filling lower portion) ---
  const liquidProfile = buildLiquidProfile()
  const liquidGeo = new THREE.LatheGeometry(liquidProfile, segments, 0, Math.PI * 2)
  const flatLiquid = toFlatShaded(liquidGeo)
  group.add(new THREE.Mesh(flatLiquid, new THREE.MeshBasicMaterial({
    color: 0x60a879,
    transparent: true,
    opacity: 0.05,
    side: THREE.DoubleSide,
  })))
  const liqEdges = new THREE.EdgesGeometry(flatLiquid, 10)
  group.add(new THREE.LineSegments(liqEdges,
    new THREE.LineBasicMaterial({ color: 0x60a879, transparent: true, opacity: 0.35 })))

  // --- Meniscus ring (liquid surface line) ---
  const meniscusR = liquidProfile[1]!.x
  const meniscusY = liquidProfile[1]!.y
  const mPts: THREE.Vector3[] = []
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2
    mPts.push(new THREE.Vector3(Math.cos(a) * meniscusR, meniscusY, Math.sin(a) * meniscusR))
  }
  group.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(mPts),
    new THREE.LineBasicMaterial({ color: 0x60a879, transparent: true, opacity: 0.6 }),
  ))

  // --- Orbiting mini polyhedra ---
  const orbitGroup = new THREE.Group()
  const minis = [
    { geo: new THREE.TetrahedronGeometry(0.06, 0), color: 0x9955bb, dist: 1.9, speed: 0.5, phase: 0 },
    { geo: new THREE.OctahedronGeometry(0.05, 0), color: 0x60a879, dist: 2.2, speed: -0.4, phase: 1.3 },
    { geo: new THREE.IcosahedronGeometry(0.055, 0), color: 0xd9bf60, dist: 1.7, speed: 0.7, phase: 2.6 },
    { geo: new THREE.TetrahedronGeometry(0.04, 0), color: 0x9955bb, dist: 2.5, speed: -0.3, phase: 4.0 },
    { geo: new THREE.OctahedronGeometry(0.06, 0), color: 0x60a879, dist: 1.8, speed: 0.5, phase: 5.2 },
  ]
  for (const s of minis) {
    const e = new THREE.EdgesGeometry(s.geo)
    const l = new THREE.LineSegments(e,
      new THREE.LineBasicMaterial({ color: s.color, transparent: true, opacity: 0.6 }))
    l.userData = { dist: s.dist, speed: s.speed, phase: s.phase }
    orbitGroup.add(l)
  }
  group.add(orbitGroup)
  ;(group as any)._orbitGroup = orbitGroup

  // --- Particle dust ---
  group.add(makeParticleCloud(250, 2.0, 3.0, 0x9955bb, 0.015, 0.4))
  group.add(makeParticleCloud(100, 1.0, 0.8, 0x60a879, 0.012, 0.3, -0.3))

  return { group, uniforms }
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

  // Liquid tracks outer shell minus small inset
  const inset = 0.04
  const rawPoints: [number, number][] = [
    [0.01, 7.5],
    [18.80, 7.5],     // matches shell at y=7.5 (~19 minus inset)
    [24.80, 8.8],     // matches shell at y=8.8 (25 minus inset)
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
