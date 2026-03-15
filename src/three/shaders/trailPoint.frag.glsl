uniform vec3 uColor;
uniform float uOpacity;

varying float vTrailT;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c) * 2.0;
  float circle = 1.0 - smoothstep(0.2, 1.0, r);
  float alpha = uOpacity * circle * smoothstep(0.0, 0.3, vTrailT) * (0.2 + 0.8 * vTrailT);
  gl_FragColor = vec4(uColor, alpha);
}
