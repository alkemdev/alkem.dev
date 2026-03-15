varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vWorldPosition;

uniform float uTime;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);

  vec3 pos = position;

  // Very subtle breathing — sinusoidal pulse along the normal
  float breath = sin(uTime * 0.4) * 0.003;
  pos += normal * breath;

  vPosition = pos;
  vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
