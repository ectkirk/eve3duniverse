// Lighting utilities - Fresnel, normal perturbation, shadows

// Fresnel effect using Schlick approximation
float fresnelSchlick(float NdotV, float F0) {
  return F0 + (1.0 - F0) * pow(1.0 - NdotV, 5.0);
}

// Simple fresnel with configurable power (for atmosphere rim)
float fresnelPower(float NdotV, float power) {
  return pow(1.0 - clamp(NdotV, 0.0, 1.0), power);
}

// Perturb normal from height map using finite differences
vec3 perturbNormalFromHeight(
  sampler2D heightMap,
  vec2 uv,
  vec3 normal,
  vec3 tangent,
  vec3 bitangent,
  float strength
) {
  float delta = 0.002;
  float height = texture2D(heightMap, uv).r;
  float hx = texture2D(heightMap, uv + vec2(delta, 0.0)).r;
  float hy = texture2D(heightMap, uv + vec2(0.0, delta)).r;

  float dx = hx - height;
  float dy = hy - height;

  vec3 bumpNormal = normalize(vec3(-dx * strength, -dy * strength, 1.0));
  mat3 TBN = mat3(tangent, bitangent, normal);
  return normalize(TBN * bumpNormal);
}

// Perturb normal from normal map (tangent space)
vec3 perturbNormalFromNormalMap(
  sampler2D normalMap,
  vec2 uv,
  vec3 normal,
  vec3 tangent,
  vec3 bitangent
) {
  vec3 mapNormal = texture2D(normalMap, uv).xyz * 2.0 - 1.0;
  mat3 TBN = mat3(tangent, bitangent, normal);
  return normalize(TBN * mapNormal);
}

// Simple diffuse lighting
float diffuseLighting(vec3 normal, vec3 lightDir) {
  return max(0.0, dot(normal, lightDir));
}

// Soft shadow transition for day/night
float dayShadowFactor(vec3 normal, vec3 lightDir, float softness) {
  float NdotL = dot(normal, lightDir);
  return smoothstep(-softness, softness, NdotL);
}

// City lights visibility (inverse of day shadow)
float cityLightsFactor(vec3 normal, vec3 lightDir) {
  float NdotL = dot(normal, lightDir);
  return smoothstep(0.1, -0.2, NdotL);
}

// Limb darkening for atmosphere edge
float limbDarkening(float NdotV, float power) {
  return pow(NdotV, power);
}
