varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vDisplacement;

uniform float uTime;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);

  vec3 pos = position;

  // Multi-frequency vertex displacement for organic breathing
  float d1 = sin(pos.x * 4.0 + uTime * 0.6) * cos(pos.y * 3.0 + uTime * 0.4) * 0.025;
  float d2 = sin(pos.y * 5.0 + uTime * 0.8) * cos(pos.z * 4.0 + uTime * 0.5) * 0.015;
  float d3 = sin((pos.x + pos.z) * 6.0 + uTime * 1.0) * 0.008;
  float displacement = d1 + d2 + d3;

  // Stronger breathing at the base of the flask (lower y)
  float baseFactor = smoothstep(0.5, -1.0, pos.y) * 0.6 + 0.4;
  displacement *= baseFactor;

  pos += normal * displacement;

  vPosition = pos;
  vDisplacement = displacement;
  vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
