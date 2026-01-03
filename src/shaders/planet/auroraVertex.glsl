// Aurora Vertex Shader
// Based on EVE Online aurora.fx from ccpwgl
// Aurora is a dome/shell mesh that sits above planet poles

uniform float uTime;
uniform vec4 uGeometry;           // [scale, ?, ?, ?]
uniform vec4 uGeometryDeformation; // [amplitude, freq1, freq2, ?]
uniform vec4 uGeometryAnimation;   // [speed, scale, phase1, phase2]

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vPoleIntensity;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);

  // Calculate pole intensity (stronger at poles)
  float latitude = abs(position.y);
  vPoleIntensity = smoothstep(0.3, 0.9, latitude);

  // Apply geometry deformation for aurora waviness
  vec3 deformedPos = position;
  float animTime = uTime * uGeometryAnimation.x;
  float deformAmp = uGeometryDeformation.x;
  float wave1 = sin(position.x * uGeometryDeformation.y * 10.0 + animTime) * deformAmp;
  float wave2 = sin(position.z * uGeometryDeformation.z * 10.0 + animTime * 0.7) * deformAmp;
  deformedPos += normal * (wave1 + wave2) * vPoleIntensity;

  vPosition = (modelViewMatrix * vec4(deformedPos, 1.0)).xyz;
  gl_Position = projectionMatrix * vec4(vPosition, 1.0);
}
