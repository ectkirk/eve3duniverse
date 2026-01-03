// Atmosphere Vertex Shader
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec3 vViewDir;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - vWorldPosition);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
