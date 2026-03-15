uniform vec3 uColor;
uniform float uOpacity;

varying float vTrailT;

void main() {
  float alpha = uOpacity * smoothstep(0.0, 0.25, vTrailT) * (0.2 + 0.8 * vTrailT * vTrailT);
  gl_FragColor = vec4(uColor, alpha);
}
