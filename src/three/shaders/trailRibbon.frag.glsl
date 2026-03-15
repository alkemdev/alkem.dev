uniform vec3 uColor;
uniform float uOpacity;
uniform float uTime;

varying float vTrailT;

void main() {
  float alpha = uOpacity * smoothstep(0.0, 0.35, vTrailT) * (0.15 + 0.85 * vTrailT * vTrailT);
  alpha *= 0.9 + 0.1 * sin(uTime * 2.0 + vTrailT * 6.28);
  gl_FragColor = vec4(uColor, alpha);
}
