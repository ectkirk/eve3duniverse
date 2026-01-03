// Atmospheric scattering functions - EVE Online exact formulas from DXBC decompilation
// Based on Sean O'Neil's atmospheric scattering model

// EVE's optical depth polynomial approximation
// From vertex shader: 5.25x - 6.8 -> x*d + 3.83 -> x*d + 0.459 -> x*d - 0.00287 -> exp2(d)
// Input: view angle (0 = horizon, 1 = zenith)
float eveOpticalDepth(float x) {
  float d = 5.25 * x - 6.8;
  d = x * d + 3.83;
  d = x * d + 0.459;
  d = x * d - 0.00287;
  return exp2(d);  // EVE uses exp2, not exp (1.4427 factor in bytecode)
}

// Rayleigh scattering coefficient: 1/λ^4
// wavelengths in micrometers (typical: 0.650, 0.570, 0.475 for RGB)
vec3 rayleighCoefficient(vec3 wavelengths) {
  vec3 l4 = wavelengths * wavelengths * wavelengths * wavelengths;
  return 1.0 / l4;
}

// Rayleigh phase function
// Standard formula: (3/4) * (1 + cos²θ)
float rayleighPhase(float cosTheta) {
  return 0.75 * (1.0 + cosTheta * cosTheta);
}

// EVE's Mie phase function (Henyey-Greenstein with g=0.995)
// From pixel shader: (1 + cos²θ) / (2(1 - 0.995*cosθ))^1.5
// Constants from bytecode: -1.99 → 1.99003, then pow 1.5
float eveMiePhase(float cosTheta) {
  float g = 0.995;
  float numerator = 1.0 + cosTheta * cosTheta;
  float denomBase = 2.0 * (1.0 - g * cosTheta);
  return numerator / pow(denomBase, 1.5);
}

// Mie phase with configurable asymmetry parameter
float miePhase(float cosTheta, float g) {
  float g2 = g * g;
  float numerator = 1.0 - g2;
  float denominator = pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5);
  return (3.0 / (8.0 * 3.14159265)) * numerator / denominator;
}

// Combined atmosphere scattering calculation
// Matches EVE vertex shader output to pixel shader inputs (v9=Rayleigh, v10=Mie)
struct ScatteringResult {
  vec3 rayleigh;  // v9 in EVE shader
  vec3 mie;       // v10 in EVE shader
};

// Simple single-scatter approximation (no ray marching)
// For full accuracy, use ray marching in vertex shader
vec3 simpleAtmosphereScatter(
  vec3 viewDir,
  vec3 lightDir,
  vec3 wavelengths,
  vec4 atmosphereFactors,
  vec4 scatteringFactors,
  float atmosphereScale
) {
  float cosTheta = dot(viewDir, lightDir);
  float viewAngle = max(0.0, viewDir.y);  // Simplified: use Y as up

  vec3 rayleighCoeff = rayleighCoefficient(wavelengths);
  float rayleighPh = rayleighPhase(cosTheta);
  float miePh = eveMiePhase(cosTheta);

  float opticalDepth = eveOpticalDepth(1.0 - viewAngle);

  vec3 Kr = scatteringFactors.xxx * rayleighCoeff;
  float Km = scatteringFactors.y;
  float ESun = scatteringFactors.z;

  vec3 extinction = exp(-opticalDepth * (Kr + vec3(Km)));
  vec3 inScatter = (1.0 - extinction) * atmosphereFactors.rgb;

  vec3 rayleighColor = inScatter * rayleighCoeff * rayleighPh * Kr * ESun;
  vec3 mieColor = inScatter * miePh * Km * ESun;

  return rayleighColor + mieColor;
}

// Final atmosphere color composition (pixel shader)
// Combines pre-computed Rayleigh and Mie with phase function
vec3 composeAtmosphere(
  vec3 rayleighScatter,
  vec3 mieScatter,
  vec3 viewDir,
  vec3 lightDir
) {
  float cosTheta = dot(normalize(viewDir), normalize(lightDir));
  float phase = eveMiePhase(cosTheta);

  vec3 color = rayleighScatter + mieScatter * phase;
  return min(color, vec3(1.0));  // EVE clamps to 1.0
}
