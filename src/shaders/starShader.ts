export const starVertexShader = `
attribute float size;
attribute float temperature;
attribute float security;
attribute float luminosity;

uniform float colorMode;

varying vec3 vColor;
varying float vAlpha;
varying float vLuminosity;

vec3 hslToRgb(float h, float s, float l) {
  float c = (1.0 - abs(2.0 * l - 1.0)) * s;
  float x = c * (1.0 - abs(mod(h / 60.0, 2.0) - 1.0));
  float m = l - c / 2.0;

  vec3 rgb;
  if (h < 60.0) rgb = vec3(c, x, 0.0);
  else if (h < 120.0) rgb = vec3(x, c, 0.0);
  else if (h < 180.0) rgb = vec3(0.0, c, x);
  else if (h < 240.0) rgb = vec3(0.0, x, c);
  else if (h < 300.0) rgb = vec3(x, 0.0, c);
  else rgb = vec3(c, 0.0, x);

  return rgb + m;
}

vec3 securityToRGB(float sec) {
  float rounded = floor(sec * 10.0 + 0.5) / 10.0;

  if (rounded >= 0.5) {
    float intensity = (rounded - 0.5) / 0.5;
    float hue = 60.0 + intensity * 180.0;
    float lightness = (50.0 - intensity * 20.0) / 100.0;
    return hslToRgb(hue, 1.0, lightness);
  } else if (rounded > 0.0) {
    float intensity = (rounded - 0.1) / 0.3;
    float saturation = (60.0 + intensity * 40.0) / 100.0;
    float lightness = (30.0 + intensity * 20.0) / 100.0;
    return hslToRgb(30.0, saturation, lightness);
  }
  return hslToRgb(0.0, 1.0, 0.4);
}

vec3 stellarColor(float tempK) {
  float t = clamp(tempK, 2000.0, 11000.0);

  // M class: deep red-orange (2000-3500K)
  if (t < 3500.0) {
    float f = (t - 2000.0) / 1500.0;
    vec3 coolM = vec3(1.0, 0.4, 0.2);
    vec3 warmM = vec3(1.0, 0.55, 0.25);
    return mix(coolM, warmM, f);
  }
  // K class: orange (3500-5000K)
  if (t < 5000.0) {
    float f = (t - 3500.0) / 1500.0;
    vec3 coolK = vec3(1.0, 0.6, 0.3);
    vec3 warmK = vec3(1.0, 0.8, 0.5);
    return mix(coolK, warmK, f);
  }
  // G class: yellow-white (5000-6000K)
  if (t < 6000.0) {
    float f = (t - 5000.0) / 1000.0;
    vec3 coolG = vec3(1.0, 0.9, 0.6);
    vec3 warmG = vec3(1.0, 0.95, 0.85);
    return mix(coolG, warmG, f);
  }
  // F class: white with warm tint (6000-7500K)
  if (t < 7500.0) {
    float f = (t - 6000.0) / 1500.0;
    vec3 coolF = vec3(1.0, 0.98, 0.9);
    vec3 warmF = vec3(0.95, 0.95, 1.0);
    return mix(coolF, warmF, f);
  }
  // A class: white to blue-white (7500-10000K)
  if (t < 10000.0) {
    float f = (t - 7500.0) / 2500.0;
    vec3 coolA = vec3(0.9, 0.92, 1.0);
    vec3 warmA = vec3(0.7, 0.8, 1.0);
    return mix(coolA, warmA, f);
  }
  // B/O class: blue (10000K+)
  float f = clamp((t - 10000.0) / 5000.0, 0.0, 1.0);
  vec3 coolB = vec3(0.6, 0.75, 1.0);
  vec3 hotB = vec3(0.5, 0.6, 1.0);
  return mix(coolB, hotB, f);
}

void main() {
  if (colorMode > 0.5) {
    vColor = securityToRGB(security);
  } else {
    vColor = stellarColor(temperature);
  }
  vLuminosity = luminosity;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float dist = -mvPosition.z;

  float baseSize = size * 3.0;
  float attenuation = 80.0 / max(dist, 1.0);
  float finalSize = baseSize + attenuation;

  gl_PointSize = clamp(finalSize, 2.0, 80.0);
  vAlpha = smoothstep(50000.0, 3000.0, dist);

  gl_Position = projectionMatrix * mvPosition;
}
`

export const starFragmentShader = `
varying vec3 vColor;
varying float vAlpha;
varying float vLuminosity;

void main() {
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);

  if (dist > 0.5) discard;

  float core = 1.0 - smoothstep(0.0, 0.08, dist);
  float innerGlow = exp(-dist * 8.0);
  float outerGlow = exp(-dist * 3.0) * 0.5;
  float shape = core + innerGlow * 0.7 + outerGlow * 0.3;

  float lumFactor = 0.6 + clamp(log(vLuminosity + 1.0) * 0.4, 0.0, 2.0);

  vec3 coreColor = mix(vColor, vec3(1.0), core * 0.6);
  vec3 finalColor = coreColor * lumFactor;

  float alpha = shape * vAlpha;

  gl_FragColor = vec4(finalColor * shape, alpha);
}
`
