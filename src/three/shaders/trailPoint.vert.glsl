attribute float trailT;
varying float vTrailT;

uniform float uPointSizeScale;

void main() {
  vTrailT = trailT;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float scale = 120.0 / length(mv.xyz);
  gl_PointSize = 0.12 * uPointSizeScale * scale * (0.5 + 0.5 * trailT);
}
