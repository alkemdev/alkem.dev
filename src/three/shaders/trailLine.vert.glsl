attribute float trailT;
varying float vTrailT;

void main() {
  vTrailT = trailT;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
