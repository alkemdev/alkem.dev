varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vWorldPosition;

uniform float uTime;
uniform float uOpacity;

const vec3 PURPLE = vec3(0.6, 0.333, 0.733);
const vec3 GREEN = vec3(0.188, 0.408, 0.267); // Darker, richer green
const vec3 GOLD = vec3(0.85, 0.75, 0.45);
const vec3 DEEP_PURPLE = vec3(0.2, 0.08, 0.3);

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

void main() {
  // Region masks derived from the SVG outline mapped to 3D coordinates.
  // Liquid surface (SVG y=6.84) -> 3D y ≈ 0.53
  // Neck bottom (SVG y=5.5) -> 3D y ≈ 0.84
  float liquidLine = 0.42;
  float neckLine = 0.84;

  float inLiquid = smoothstep(liquidLine + 0.06, liquidLine - 0.06, vPosition.y);
  float inNeck = smoothstep(neckLine - 0.05, neckLine + 0.1, vPosition.y);

  // Purple zone between liquid surface and neck
  float purpleZone = smoothstep(liquidLine - 0.03, liquidLine + 0.2, vPosition.y)
                   * smoothstep(neckLine + 0.05, neckLine - 0.15, vPosition.y);

  // --- Glass (neck and above) ---
  vec3 glassColor = DEEP_PURPLE * 0.7;

  // --- Green liquid ---
  float swirl = noise(vPosition.xz * 4.0 + vec2(uTime * 0.1, uTime * 0.07));
  vec3 greenLiquid = mix(GREEN * 1.0, GREEN * 0.7, swirl * 0.5);
  float bubbles = noise(vPosition.xz * 10.0 + vec2(0.0, uTime * 0.35));
  greenLiquid += GREEN * 0.2 * smoothstep(0.73, 0.83, bubbles);

  // --- Purple liquid (shoulder zone) ---
  float pSwirl = noise(vPosition.xz * 3.0 + vec2(uTime * 0.08, -uTime * 0.06));
  vec3 purpleLiquid = mix(PURPLE * 0.85, PURPLE * 0.55, pSwirl);

  // Compose
  vec3 color = glassColor;
  color = mix(color, purpleLiquid, purpleZone * 0.85);
  color = mix(color, greenLiquid, inLiquid * 0.9);

  // Fresnel rim
  float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
  vec3 rimColor = mix(PURPLE, GREEN, inLiquid);
  color += rimColor * fresnel * 0.25;

  // Subtle gold sparkle
  float spark = noise(vUv * 8.0 + uTime * 0.05);
  color += GOLD * smoothstep(0.85, 0.95, spark) * 0.08;

  // Alpha: neck nearly invisible, liquid more present
  float alphaBase = mix(0.15, 0.3, purpleZone);
  alphaBase = mix(alphaBase, 0.6, inLiquid);
  alphaBase = mix(alphaBase, 0.1, inNeck);
  float alpha = (alphaBase + fresnel * 0.15) * uOpacity;

  gl_FragColor = vec4(color, alpha);
}
