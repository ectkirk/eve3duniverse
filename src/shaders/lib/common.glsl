// Common shader utilities - sRGB, gamma, coordinates
// Matches EVE Online's exact thresholds from DXBC decompilation

// Linear to sRGB conversion (EVE thresholds: 0.0031308, 12.92, 1.055, 2.4)
vec3 linearToSRGB(vec3 c) {
  return mix(
    c * 12.92,
    1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055,
    step(0.0031308, c)
  );
}

// sRGB to Linear conversion (EVE thresholds: 0.04045, 12.92, 1.055, 2.4)
vec3 sRGBToLinear(vec3 c) {
  return mix(
    c / 12.92,
    pow((c + 0.055) / 1.055, vec3(2.4)),
    step(0.04045, c)
  );
}

// Apply gamma with power adjustment (from EVE cb2[21].w)
vec3 applyGamma(vec3 color, float gamma) {
  color = max(color, vec3(1e-35));
  return pow(color, vec3(gamma));
}

// Spherical UV from normalized direction
vec2 directionToSphericalUV(vec3 dir) {
  float u = atan(dir.z, dir.x) / (2.0 * 3.14159265) + 0.5;
  float v = asin(clamp(dir.y, -1.0, 1.0)) / 3.14159265 + 0.5;
  return vec2(u, v);
}

// Saturate helper
float saturate(float x) {
  return clamp(x, 0.0, 1.0);
}

vec3 saturate(vec3 x) {
  return clamp(x, vec3(0.0), vec3(1.0));
}
