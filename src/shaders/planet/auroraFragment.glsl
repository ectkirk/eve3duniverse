// Aurora Fragment Shader
// Based on EVE Online aurora.fx from ccpwgl
// Renders the shimmering polar lights effect

uniform float uTime;
uniform vec4 uColorParams;         // [intensity, hueShift, saturation, ?]
uniform vec4 uMaskParams0;         // [maskScale, maskOffset, ?, ?]
uniform vec4 uMaskParams1;         // [noiseScale, noiseSpeed, ?, ?]
uniform vec4 uGeometryAnimation;   // [speed, scale, phase1, phase2]

uniform sampler2D uGradientMap;    // Color gradient (per planet type)
uniform sampler2D uColorShapeMap;  // Shape/pattern texture
uniform sampler2D uMaskMap;        // Caustics mask
uniform sampler2D uNoiseMap;       // Animation noise

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vPoleIntensity;

void main() {
  // Skip if not in polar region
  if (vPoleIntensity < 0.01) {
    discard;
  }

  float animTime = uTime * uGeometryAnimation.x * 0.1;

  // Sample noise for animation
  vec2 noiseUv = vUv * uMaskParams1.x + vec2(animTime * uMaskParams1.y, 0.0);
  float noise = texture2D(uNoiseMap, noiseUv).r;

  // Sample mask/caustics pattern
  vec2 maskUv = vUv * uMaskParams0.x + vec2(noise * 0.1, animTime * 0.05);
  float mask = texture2D(uMaskMap, maskUv).r;

  // Sample color shape
  vec2 shapeUv = vUv + vec2(noise * 0.05, animTime * 0.02);
  float shape = texture2D(uColorShapeMap, shapeUv).r;

  // Sample gradient for color
  float gradientPos = shape * 0.8 + noise * 0.2;
  vec3 auroraColor = texture2D(uGradientMap, vec2(gradientPos, 0.5)).rgb;

  // Calculate final intensity
  float intensity = vPoleIntensity * mask * shape;
  intensity *= uColorParams.x; // User-controlled intensity

  // Pulsing effect
  float pulse = 0.7 + 0.3 * sin(uTime * 2.0 + noise * 6.28);
  intensity *= pulse;

  // Apply color with intensity
  vec3 finalColor = auroraColor * intensity * 2.0;

  // Fresnel-like edge glow
  vec3 viewDir = normalize(-vPosition);
  float fresnel = 1.0 - abs(dot(normalize(vNormal), viewDir));
  fresnel = pow(fresnel, 2.0);
  finalColor += auroraColor * fresnel * intensity * 0.5;

  gl_FragColor = vec4(finalColor, intensity * 0.8);
}
