// Atmosphere Fragment Shader - EVE Online exact formulas
#include "../lib/common.glsl"
#include "../lib/scattering.glsl"
#include "../lib/lighting.glsl"

uniform sampler2D uScatterLight;
uniform sampler2D uScatterHue;
uniform vec3 uStarPosition;
uniform vec3 uStarColor;
uniform vec4 uAtmosphereFactors;   // RGB color + alpha
uniform vec4 uScatteringFactors;   // Kr, Km, ESun, intensity
uniform vec3 uWavelengths;         // RGB wavelengths in micrometers

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec3 vViewDir;

void main() {
  vec3 viewDir = normalize(-vPosition);
  vec3 normal = normalize(vNormal);
  vec3 worldNormal = normalize(vWorldNormal);

  // Light direction from star
  vec3 lightDir = normalize(uStarPosition - vWorldPosition);

  // View and light angles
  float NdotV = max(dot(normal, viewDir), 0.0);
  float NdotL = dot(worldNormal, lightDir);
  float cosTheta = dot(lightDir, -viewDir);

  // EVE's Rayleigh coefficient: 1/λ^4
  vec3 rayleighCoeff = rayleighCoefficient(uWavelengths);

  // EVE's phase functions
  float rayleighPh = rayleighPhase(cosTheta);
  float miePh = eveMiePhase(cosTheta);

  // Optical depth based on view angle (fresnel-like falloff)
  float viewAngle = 1.0 - NdotV;
  float opticalDepth = eveOpticalDepth(viewAngle);

  // Sample scattering textures
  vec3 scatterLight = texture2D(uScatterLight, vec2(viewAngle, 0.5)).rgb;
  vec3 scatterHue = texture2D(uScatterHue, vec2(viewAngle, 0.5)).rgb;
  float sunFactor = saturateF(cosTheta * 0.5 + 0.5);
  vec3 textureScatter = mix(scatterHue, scatterLight, sunFactor);

  // Apply scattering coefficients from preset
  float Kr = uScatteringFactors.x;
  float Km = uScatteringFactors.y;
  float ESun = uScatteringFactors.z;
  float intensity = uScatteringFactors.w;

  // Rayleigh scattering (wavelength-dependent, blue sky)
  vec3 rayleighColor = textureScatter * rayleighCoeff * rayleighPh * Kr * ESun;

  // Mie scattering (forward scattering, sun halo)
  vec3 mieColor = textureScatter * miePh * Km * ESun * 0.1;

  // Combine with atmosphere base color
  vec3 atmosphereColor = uAtmosphereFactors.rgb;
  vec3 scatterColor = (rayleighColor + mieColor) * atmosphereColor;

  // Fresnel rim effect
  float fresnel = fresnelPower(NdotV, 3.0);

  // Day/night intensity modulation
  float horizonGlow = pow(fresnel, 2.0) * saturateF(NdotL + 0.3);
  float sunGlow = pow(saturateF(dot(reflect(-viewDir, normal), lightDir)), 8.0) * 0.5;
  float dayIntensity = horizonGlow + sunGlow;

  // Night side limb glow
  float nightLimb = pow(fresnel, 4.0) * 0.12 * saturateF(-NdotL);

  // Final color composition
  vec3 finalColor = scatterColor * (dayIntensity + nightLimb) * intensity;
  finalColor *= uStarColor;

  // Alpha based on fresnel and day/night
  float dayFactor = 0.5 + 0.5 * saturateF(NdotL);
  float alpha = fresnel * uAtmosphereFactors.a * max(dayFactor, nightLimb * 2.0);
  alpha = clamp(alpha, 0.0, 0.85);

  gl_FragColor = vec4(finalColor, alpha);
}
