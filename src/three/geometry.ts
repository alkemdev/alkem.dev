import * as THREE from 'three'
import vertexShader from './shaders/vertex.glsl?raw'
import fragmentShader from './shaders/fragment.glsl?raw'

export interface FractalUniforms {
  uTime: THREE.IUniform<number>
  uOpacity: THREE.IUniform<number>
}

/**
 * Builds a lathe-profile Erlenmeyer flask from triangulated polyhedral faces,
 * then adds wireframe edges, inner liquid glow, orbiting polyhedra, and particle dust.
 */
export function createFractalGeometry(): { group: THREE.Group; uniforms: FractalUniforms } {
  const group = new THREE.Group()

  const uniforms: FractalUniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 1 },
  }

  // --- Flask body (lathe geometry with low-poly faceted look) ---
  const flaskProfile = buildFlaskProfile()
  const radialSegments = 10
  const flaskGeo = new THREE.LatheGeometry(flaskProfile, radialSegments, 0, Math.PI * 2)
  flaskGeo.computeVertexNormals()

  // Convert to flat-shaded indexed geometry for faceted look
  const flatFlask = toFlatShaded(flaskGeo)
  addSphericalUVs(flatFlask, 1.6)

  const flaskMat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const flaskMesh = new THREE.Mesh(flatFlask, flaskMat)
  group.add(flaskMesh)

  // --- Wireframe edges (visible polyhedral structure) ---
  const edgesGeo = new THREE.EdgesGeometry(flatFlask, 15)
  const edgesMat = new THREE.LineBasicMaterial({
    color: 0xbb77dd,
    transparent: true,
    opacity: 0.7,
  })
  const edgeLines = new THREE.LineSegments(edgesGeo, edgesMat)
  group.add(edgeLines)

  // --- Vertex points (glowing dots at vertices) ---
  const vertPoints = extractUniqueVertices(flatFlask)
  const vertGeo = new THREE.BufferGeometry()
  vertGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertPoints, 3))
  const vertMat = new THREE.PointsMaterial({
    color: 0x60a879,
    size: 0.05,
    transparent: true,
    opacity: 1.0,
    sizeAttenuation: true,
  })
  const vertDots = new THREE.Points(vertGeo, vertMat)
  group.add(vertDots)

  // --- Inner liquid glow (smaller flask shape with emission) ---
  const liquidProfile = buildLiquidProfile()
  const liquidGeo = new THREE.LatheGeometry(liquidProfile, radialSegments, 0, Math.PI * 2)
  const flatLiquid = toFlatShaded(liquidGeo)
  const liquidMat = new THREE.MeshBasicMaterial({
    color: 0x60a879,
    transparent: true,
    opacity: 0.04,
    side: THREE.DoubleSide,
  })
  const liquidMesh = new THREE.Mesh(flatLiquid, liquidMat)
  group.add(liquidMesh)

  // Liquid wireframe
  const liquidEdges = new THREE.EdgesGeometry(flatLiquid, 15)
  const liquidEdgeMat = new THREE.LineBasicMaterial({
    color: 0x70c08a,
    transparent: true,
    opacity: 0.45,
  })
  group.add(new THREE.LineSegments(liquidEdges, liquidEdgeMat))

  // --- Orbiting mini polyhedra ---
  const orbitGroup = new THREE.Group()
  const miniShapes = [
    { geo: new THREE.TetrahedronGeometry(0.08, 0), color: 0x9955bb, dist: 2.2, speed: 0.7, phase: 0 },
    { geo: new THREE.OctahedronGeometry(0.06, 0), color: 0x60a879, dist: 2.5, speed: -0.5, phase: 1.2 },
    { geo: new THREE.IcosahedronGeometry(0.07, 0), color: 0xd9bf60, dist: 1.9, speed: 0.9, phase: 2.4 },
    { geo: new THREE.TetrahedronGeometry(0.05, 0), color: 0x9955bb, dist: 2.8, speed: -0.4, phase: 3.8 },
    { geo: new THREE.OctahedronGeometry(0.09, 0), color: 0x60a879, dist: 2.1, speed: 0.6, phase: 5.0 },
    { geo: new THREE.DodecahedronGeometry(0.06, 0), color: 0xd9bf60, dist: 2.6, speed: -0.8, phase: 0.7 },
  ]

  for (const s of miniShapes) {
    const edges = new THREE.EdgesGeometry(s.geo)
    const lineMat = new THREE.LineBasicMaterial({
      color: s.color,
      transparent: true,
      opacity: 0.7,
    })
    const lineSegs = new THREE.LineSegments(edges, lineMat)
    lineSegs.userData = { dist: s.dist, speed: s.speed, phase: s.phase }
    orbitGroup.add(lineSegs)
  }
  group.add(orbitGroup)
  ;(group as any)._orbitGroup = orbitGroup

  // --- Particle dust cloud ---
  const particleCount = 350
  const particlePositions = new Float32Array(particleCount * 3)
  const particleSizes = new Float32Array(particleCount)
  for (let i = 0; i < particleCount; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = 2.0 + Math.random() * 2.5
    particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    particlePositions[i * 3 + 2] = r * Math.cos(phi)
    particleSizes[i] = 0.01 + Math.random() * 0.03
  }
  const particleGeo = new THREE.BufferGeometry()
  particleGeo.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions, 3))
  particleGeo.setAttribute('size', new THREE.Float32BufferAttribute(particleSizes, 1))
  const particleMat = new THREE.PointsMaterial({
    color: 0x9955bb,
    size: 0.02,
    transparent: true,
    opacity: 0.5,
    sizeAttenuation: true,
  })
  const particles = new THREE.Points(particleGeo, particleMat)
  group.add(particles)

  // Second particle layer (green)
  const particlePositions2 = new Float32Array(150 * 3)
  for (let i = 0; i < 150; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = 1.5 + Math.random() * 1.0
    particlePositions2[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    particlePositions2[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    particlePositions2[i * 3 + 2] = r * Math.cos(phi)
  }
  const particleGeo2 = new THREE.BufferGeometry()
  particleGeo2.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions2, 3))
  const particleMat2 = new THREE.PointsMaterial({
    color: 0x60a879,
    size: 0.015,
    transparent: true,
    opacity: 0.4,
    sizeAttenuation: true,
  })
  group.add(new THREE.Points(particleGeo2, particleMat2))

  return { group, uniforms }
}

function buildFlaskProfile(): THREE.Vector2[] {
  // Erlenmeyer flask profile: narrow neck -> shoulder -> wide base (bottom)
  // Y goes from top (positive) to bottom (negative)
  return [
    new THREE.Vector2(0.001, 1.6),   // tip top (near zero radius)
    new THREE.Vector2(0.18, 1.6),    // neck top
    new THREE.Vector2(0.18, 1.0),    // neck bottom
    new THREE.Vector2(0.22, 0.9),    // start of shoulder
    new THREE.Vector2(0.4, 0.65),    // shoulder curve
    new THREE.Vector2(0.65, 0.35),   // mid shoulder
    new THREE.Vector2(0.85, 0.05),   // widening
    new THREE.Vector2(0.95, -0.25),  // near base
    new THREE.Vector2(1.0, -0.55),   // max width
    new THREE.Vector2(1.0, -0.8),    // bottom side
    new THREE.Vector2(0.95, -0.95),  // bottom bevel
    new THREE.Vector2(0.001, -0.95), // base center
  ]
}

function buildLiquidProfile(): THREE.Vector2[] {
  // Liquid fills the lower ~60% of the flask, slightly smaller radius
  const inset = 0.06
  return [
    new THREE.Vector2(0.001, 0.3),
    new THREE.Vector2(0.55 - inset, 0.3),
    new THREE.Vector2(0.8 - inset, 0.0),
    new THREE.Vector2(0.9 - inset, -0.3),
    new THREE.Vector2(0.95 - inset, -0.55),
    new THREE.Vector2(0.95 - inset, -0.8),
    new THREE.Vector2(0.9 - inset, -0.9),
    new THREE.Vector2(0.001, -0.9),
  ]
}

function toFlatShaded(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const flat = geometry.toNonIndexed()
  flat.computeVertexNormals()
  return flat
}

function addSphericalUVs(geometry: THREE.BufferGeometry, scale: number) {
  const pos = geometry.getAttribute('position')
  const uvs = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    uvs[i * 2] = Math.atan2(z, x) / (2 * Math.PI) + 0.5
    uvs[i * 2 + 1] = y / scale * 0.5 + 0.5
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
