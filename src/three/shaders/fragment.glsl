varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vDisplacement;

uniform float uTime;
uniform float uOpacity;

const vec3 PURPLE = vec3(0.6, 0.333, 0.733);
const vec3 GREEN = vec3(0.376, 0.659, 0.475);
const vec3 GOLD = vec3(0.85, 0.75, 0.45);
const vec3 DEEP_PURPLE = vec3(0.25, 0.1, 0.35);
const vec3 DARK_GREEN = vec3(0.1, 0.25, 0.15);

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fractalPattern(vec2 p) {
  vec2 z = p;
  float d = 1e10;
  for (int i = 0; i < 10; i++) {
    z = abs(z) / dot(z, z) - 0.65;
    float angle = uTime * 0.08 + float(i) * 0.3;
    z *= mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    d = min(d, length(z));
  }
  return d;
}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;

  // Liquid region detection: lower part of the flask
  float liquidMask = smoothstep(0.6, 0.2, vPosition.y);

  // Fractal pattern for surface detail
  float pattern = fractalPattern(uv * 1.8);
  float edge = smoothstep(0.0, 0.35, pattern);

  // Base glass color: deep purple, semi-transparent
  vec3 glassColor = mix(DEEP_PURPLE * 0.8, PURPLE * 0.6, edge * 0.5);

  // Liquid color: rich green with swirling noise
  float swirl = noise(uv * 3.0 + vec2(uTime * 0.15, uTime * 0.1));
  vec3 liquidColor = mix(GREEN * 0.55, DARK_GREEN, swirl * 0.7);
  liquidColor += GOLD * smoothstep(0.65, 0.95, swirl) * 0.12;

  // Subtle bubbles
  float bubbles = noise(vPosition.xz * 8.0 + vec2(0.0, uTime * 0.5));
  bubbles = smoothstep(0.75, 0.85, bubbles);
  liquidColor += GREEN * bubbles * 0.15;

  // Blend glass and liquid
  vec3 color = mix(glassColor, liquidColor, liquidMask * 0.65);

  // Fresnel rim: the key to the polyhedral / geometric look
  float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
  vec3 rimColor = mix(PURPLE * 0.8, GREEN * 0.6, liquidMask);
  color += rimColor * fresnel * 0.4;

  // Fractal edge glow
  float patternGlow = smoothstep(0.25, 0.0, pattern) * 0.15;
  color += GOLD * patternGlow;

  // Pulsing energy in liquid
  float pulse = sin(uTime * 0.6 + vPosition.y * 3.0) * 0.5 + 0.5;
  color += GREEN * pulse * 0.04 * liquidMask;

  // Displacement highlight
  color += abs(vDisplacement) * PURPLE * 1.5;

  // Very transparent faces so wireframe structure dominates
  float baseAlpha = mix(0.1, 0.22, liquidMask);
  float alpha = (baseAlpha + fresnel * 0.15) * uOpacity;

  gl_FragColor = vec4(color, alpha);
}
