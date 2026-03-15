/**
 * Scene config: drives flask shape, wireframe style, vertex emphasis, and optional toggles.
 * Single source of truth for materializing the 3D hero (flask + orbits, etc.).
 */

export type WireframeStyle = 'full' | 'triangular'
// 'full' = all edges above angle threshold (current behavior)
// 'triangular' = fewer radial segments + higher edge angle so facets read as triangles

export interface FlaskConfig {
  /** Horizontal resolution: segments around the axis (azimuthal). */
  radialSegments: number
  /** Vertical resolution: number of rings along the profile (height). */
  verticalSegments: number
  /** Subdivisions along profile before resampling (feeds into arc-length resampling). */
  profileSubdivisions: number
  /** When true, place vertices for roughly equal edge length on the surface (arc-length profile + radius-proportional rings). */
  equidistantMesh: boolean
  /** Min/max azimuthal segments per ring when using equidistant mesh (ring count scales with radius). */
  equidistantMinSegments: number
  equidistantMaxSegments: number
  /** Random vertex jitter (0 = smooth). Small values give a hacky/low-poly look. */
  meshJitter: number
  /** Wireframe style: full edges vs triangular/faceted emphasis. */
  wireframeStyle: WireframeStyle
  /** EdgesGeometry angle threshold (degrees). 0 = show all triangle edges (full triangular mesh). */
  wireframeAngleThreshold: number
  /** Wireframe line opacity. */
  wireframeOpacity: number
  /** Vertex point size (world units, with sizeAttenuation). */
  vertexSize: number
  /** Vertex point opacity. */
  vertexOpacity: number
  /** Optional second vertex layer: larger, dimmer (halo). 0 = off. */
  vertexHaloSize: number
  vertexHaloOpacity: number
  /** Show liquid fill, meniscus, collar. */
  showLiquid: boolean
  showCollar: boolean
}

export interface OrbitsConfig {
  /** Scale factor for the orbiting Platonic solids (comets). */
  cometScale: number
  /** Trail ribbon width at head (world units). */
  trailRibbonWidth: number
  /** Trail ribbon opacity (0–1). */
  trailRibbonOpacity: number
  /** Trail outer glow ribbon width (0 = off). */
  trailGlowWidth: number
  /** Trail outer glow opacity. */
  trailGlowOpacity: number
  /** Trail core line opacity. */
  trailLineOpacity: number
  /** Trail point sprites opacity. */
  trailPointsOpacity: number
  /** Trail point sprites size scale. */
  trailPointsSize: number
}

export interface SceneConfig {
  flask: FlaskConfig
  orbits: OrbitsConfig
}

const defaultOrbits: OrbitsConfig = {
  cometScale: 1.95,
  trailRibbonWidth: 0.065,
  trailRibbonOpacity: 0.42,
  trailGlowWidth: 0.11,
  trailGlowOpacity: 0.14,
  trailLineOpacity: 0.65,
  trailPointsOpacity: 0.4,
  trailPointsSize: 0.7,
}

const defaultFlask: FlaskConfig = {
  radialSegments: 16,
  verticalSegments: 28,
  profileSubdivisions: 3,
  equidistantMesh: true,
  equidistantMinSegments: 5,
  equidistantMaxSegments: 42,
  meshJitter: 0.003,
  wireframeStyle: 'triangular',
  wireframeAngleThreshold: 0,
  wireframeOpacity: 0.96,
  vertexSize: 0.08,
  vertexOpacity: 1,
  vertexHaloSize: 0.14,
  vertexHaloOpacity: 0.4,
  showLiquid: true,
  showCollar: true,
}

export const defaultSceneConfig: SceneConfig = {
  flask: defaultFlask,
  orbits: defaultOrbits,
}
