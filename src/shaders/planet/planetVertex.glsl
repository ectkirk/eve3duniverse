// Planet Vertex Shader - calculates TBN for normal mapping
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;
varying vec3 vTangent;
varying vec3 vBitangent;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;

  vec3 n = normalize(normal);
  vec3 up = abs(n.y) < 0.999 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vTangent = normalize(cross(up, n));
  vBitangent = normalize(cross(n, vTangent));

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
