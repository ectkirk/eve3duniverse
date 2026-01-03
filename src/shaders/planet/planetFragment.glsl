// Planet Fragment Shader - supports all planet types via branching
// Constants are passed as uniforms from src/constants/planets.ts
#include "../lib/common.glsl"
#include "../lib/lighting.glsl"
#include "../lib/noise.glsl"

uniform mat4 modelMatrix;

// Texture samplers
uniform sampler2D uDiffuse;
uniform sampler2D uGradient;
uniform sampler2D uPoleMask;
uniform sampler2D uCityLight;
uniform sampler2D uScatterLight;
uniform sampler2D uScatterHue;
uniform sampler2D uHeightMap1;
uniform sampler2D uHeightMap2;
uniform sampler2D uClouds;
uniform sampler2D uCloudCap;
uniform sampler2D uBakedHeightMap;
uniform sampler2D uLavaNoise;
uniform sampler2D uLightning;
uniform sampler2D uGasGiantMixer;
uniform sampler2D uGasGiantNoise;

// Feature flags
uniform float uHasCityLights;
uniform float uHasScatter;
uniform float uHasHeightMap;
uniform float uHasClouds;
uniform float uHasBakedHeightMap;
uniform float uHasLavaNoise;
uniform float uHasLightning;
uniform float uHasGasGiantMixer;
uniform float uHasGasGiantNoise;

// Dynamic uniforms
uniform float uTime;
uniform vec3 uStarPosition;
uniform vec3 uStarColor;
uniform float uPlanetType;
uniform float uTemperature;

// Preset parameters (from shader-presets.json)
uniform vec4 uWindFactors;
uniform vec4 uCapColor;
uniform vec4 uDistoFactors;
uniform vec4 uSaturation;

// Constants from src/constants/planets.ts (LIGHTING, ANIMATION groups)
uniform float uShadowFloor;       // LIGHTING.SHADOW_FLOOR
uniform float uShadowRange;       // LIGHTING.SHADOW_RANGE
uniform float uFresnelPower;      // LIGHTING.FRESNEL_POWER
uniform float uNightThreshold;    // LIGHTING.NIGHT_THRESHOLD
uniform float uCityGlowIntensity; // LIGHTING.CITY_GLOW_INTENSITY
uniform float uCloudAlpha;        // LIGHTING.CLOUD_ALPHA
uniform float uScatterStrength;   // LIGHTING.SCATTER_STRENGTH
uniform float uHeightSampleDelta; // LIGHTING.HEIGHT_SAMPLE_DELTA
uniform float uNormalStrength;    // LIGHTING.NORMAL_STRENGTH
uniform float uSurfaceSpeed;      // ANIMATION.SURFACE_SPEED
uniform float uCloudSpeed;        // ANIMATION.CLOUD_SPEED
uniform float uCloudCapSpeed;     // ANIMATION.CLOUD_CAP_SPEED

// Gas giant constants (GAS_GIANT group)
uniform float uLatFactorScale;
uniform float uLatVariationScale;
uniform float uMixerDefault;
uniform float uPatternIntensityBase;
uniform float uPatternIntensityRange;
uniform float uPoleDarkenBase;
uniform float uPoleDarkenRange;
uniform float uCapTintScale;
uniform float uNoiseColorStrength;
uniform float uHeightInfluenceBase;
uniform float uHeightInfluenceRange;
uniform float uNoiseSpeedScale;

// Lava constants (LAVA group)
uniform float uTempScale;
uniform float uTempClampMin;
uniform float uTempClampMax;
uniform float uPulseBase;
uniform float uPulseRange;
uniform float uPulseFreq;
uniform float uSecondaryGlow;
uniform float uSecondaryFreq;
uniform vec3 uGlowColor;
uniform float uNoiseGlowStrength;
uniform float uNoiseOffsetScale;
uniform float uLavaAnimSpeedFactor;

// Thunderstorm constants (THUNDERSTORM group)
uniform float uFlashFreq;
uniform float uFlashPower;
uniform float uFlashThreshold;
uniform float uFlashTimingPeriod;
uniform float uLightningFreq;
uniform float uLightningPower;
uniform float uLightningThreshold;
uniform float uLightningTimingPeriod;
uniform vec3 uLightningColor;
uniform vec3 uLightningColorAlt;
uniform float uLightningIntensity;
uniform float uLightningIntensityProc;
uniform vec2 uLightningUvScale;
uniform float uLightningAnimSpeed;
uniform float uHashConstant;

// Plasma override glow color
uniform vec3 uPlasmaGlowColor;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;
varying vec3 vTangent;
varying vec3 vBitangent;

vec3 perturbNormal(vec3 normal, vec2 uv) {
  if (uHasBakedHeightMap < 0.5) return normal;

  float height = texture2D(uBakedHeightMap, uv).r;
  float hx = texture2D(uBakedHeightMap, uv + vec2(uHeightSampleDelta, 0.0)).r;
  float hy = texture2D(uBakedHeightMap, uv + vec2(0.0, uHeightSampleDelta)).r;

  float dx = hx - height;
  float dy = hy - height;

  vec3 bumpNormal = normalize(vec3(-dx * uNormalStrength, -dy * uNormalStrength, 1.0));
  mat3 TBN = mat3(vTangent, vBitangent, normal);
  return normalize(TBN * bumpNormal);
}

void main() {
  vec3 viewDir = normalize(-vPosition);
  vec3 normal = normalize(vNormal);
  float fresnel = fresnelPower(max(dot(normal, viewDir), 0.0), uFresnelPower);

  vec2 animatedUv = vUv;

  // Lava/Plasma types have slower surface animation
  // Type 3 = Lava, Type 7 = Plasma, Type 8 = Shattered
  if (uPlanetType > 2.5 && uPlanetType < 3.5) {
    animatedUv.x = vUv.x + uTime * uSurfaceSpeed * uLavaAnimSpeedFactor;
  } else if (uPlanetType > 6.5 && uPlanetType < 8.5) {
    animatedUv.x = vUv.x + uTime * uSurfaceSpeed * uLavaAnimSpeedFactor;
  }

  vec3 perturbedNormal = perturbNormal(normal, animatedUv);
  vec4 diffuse = texture2D(uDiffuse, animatedUv);
  vec3 baseColor;

  // Gas Giant rendering (type 0)
  if (uPlanetType < 0.5) {
    float latitude = vUv.y - 0.5;
    float baseSpeed = uWindFactors.x > 0.0 ? uWindFactors.x : 0.3;
    float latVariation = uWindFactors.y > 0.0 ? uWindFactors.y : 0.5;
    float latFactor = latitude * uLatFactorScale;
    float bandSpeed = baseSpeed * uSurfaceSpeed * (1.0 + abs(latitude) * latVariation * uLatVariationScale);
    vec2 bandUv = vUv;
    bandUv.x += uTime * bandSpeed * latFactor;

    vec4 pattern = texture2D(uDiffuse, bandUv);

    float mixer = uMixerDefault;
    if (uHasGasGiantMixer > 0.5) {
      mixer = texture2D(uGasGiantMixer, bandUv).r;
    }

    float noise = 0.0;
    float noiseSpeed = uWindFactors.z > 0.0 ? uWindFactors.z : 0.2;
    if (uHasGasGiantNoise > 0.5) {
      vec2 noiseUv = bandUv * 2.0 + vec2(uTime * noiseSpeed * uNoiseSpeedScale, 0.0);
      noise = texture2D(uGasGiantNoise, noiseUv).r;
      float baseDistortion = uWindFactors.w > 0.0 ? uWindFactors.w : 0.12;
      float distoScale = uDistoFactors.x > 0.0 ? uDistoFactors.x / 10.0 : 0.4;
      float distortion = baseDistortion * distoScale;
      bandUv.y += (noise - 0.5) * distortion * mixer;
      pattern = texture2D(uDiffuse, bandUv);
    }

    float gradientSample = pattern.r * mixer + (1.0 - mixer) * pattern.g;
    vec3 gradientColor = texture2D(uGradient, vec2(gradientSample, 0.5)).rgb;

    float satBoost = uSaturation.x > 0.0 ? uSaturation.x : 2.0;
    float gray = dot(gradientColor, vec3(0.299, 0.587, 0.114));
    gradientColor = mix(vec3(gray), gradientColor, satBoost);

    float poleMask = texture2D(uPoleMask, vec2(0.5, abs(vUv.y - 0.5) * 2.0)).r;
    float poleBlend = 1.0 - poleMask;
    float capTint = uCapColor.x > 0.0 ? uCapColor.x : 0.0;
    vec3 polarTint = vec3(
      1.0 + capTint * poleBlend * uCapTintScale,
      1.0 - capTint * poleBlend,
      1.0 - capTint * poleBlend
    );

    float intensity = uPatternIntensityBase + uPatternIntensityRange * pattern.a;
    baseColor = gradientColor * intensity * polarTint;
    baseColor *= uPoleDarkenBase + uPoleDarkenRange * poleMask;

    if (uHasGasGiantNoise > 0.5) {
      baseColor += gradientColor * noise * uNoiseColorStrength;
    }

    if (uHasHeightMap > 0.5) {
      vec3 h1 = texture2D(uHeightMap1, bandUv * 0.5).rgb;
      vec3 h2 = texture2D(uHeightMap2, bandUv * 0.5 + vec2(0.25, 0.0)).rgb;
      vec3 heightBlend = mix(h1, h2, mixer);
      baseColor *= uHeightInfluenceBase + uHeightInfluenceRange * dot(heightBlend, vec3(0.333));
    }
  } else {
    // Terrestrial/Ocean/Ice/Lava/Sandstorm/Plasma/Shattered rendering
    float gradientSample = dot(perturbedNormal, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;
    vec3 gradientColor = texture2D(uGradient, vec2(gradientSample, 0.5)).rgb;

    float poleMask = texture2D(uPoleMask, vec2(0.5, abs(vUv.y - 0.5) * 2.0)).r;

    baseColor = diffuse.rgb * gradientColor * 1.5 * (uPoleDarkenBase + uPoleDarkenRange * poleMask);

    if (uHasHeightMap > 0.5) {
      float h1 = texture2D(uHeightMap1, animatedUv).r;
      float h2 = texture2D(uHeightMap2, animatedUv).r;
      float heightBlend = mix(h1, h2, 0.5);
      baseColor *= 0.8 + 0.4 * heightBlend;
    }
  }

  // Lava planet effects (type 3)
  if (uPlanetType > 2.5 && uPlanetType < 3.5) {
    float tempFactor = clamp(uTemperature / uTempScale, uTempClampMin, uTempClampMax);

    float noiseOffset = 0.0;
    if (uHasLavaNoise > 0.5) {
      vec2 noiseUv = animatedUv * 2.0 + vec2(uTime * 0.02, uTime * 0.015);
      float noise = texture2D(uLavaNoise, noiseUv).r;
      noiseOffset = noise * uNoiseOffsetScale * tempFactor;
      baseColor += uGlowColor * noise * uNoiseGlowStrength * tempFactor;
    }

    float lavaPulse = uPulseBase + uPulseRange * tempFactor * sin(uTime * uPulseFreq + diffuse.r * 6.28 + noiseOffset);
    baseColor *= lavaPulse;
    baseColor += diffuse.rgb * uSecondaryGlow * tempFactor * (0.5 + 0.5 * sin(uTime * uSecondaryFreq));
  }

  // Plasma planet effects (type 7) - lava base with lightning
  if (uPlanetType > 6.5 && uPlanetType < 7.5) {
    float tempFactor = clamp(uTemperature / uTempScale, uTempClampMin, uTempClampMax);

    float noiseOffset = 0.0;
    if (uHasLavaNoise > 0.5) {
      vec2 noiseUv = animatedUv * 2.0 + vec2(uTime * 0.02, uTime * 0.015);
      float noise = texture2D(uLavaNoise, noiseUv).r;
      noiseOffset = noise * uNoiseOffsetScale * tempFactor;
      baseColor += uPlasmaGlowColor * noise * uNoiseGlowStrength * tempFactor;
    }

    float plasmaPulse = uPulseBase + uPulseRange * tempFactor * sin(uTime * uPulseFreq + diffuse.r * 6.28 + noiseOffset);
    baseColor *= plasmaPulse;
    baseColor += diffuse.rgb * uSecondaryGlow * tempFactor * (0.5 + 0.5 * sin(uTime * uSecondaryFreq));

    // Plasma gets lightning like thunderstorm
    if (uHasLightning > 0.5) {
      float flash = pow(fract(sin(uTime * uFlashFreq) * uHashConstant), uFlashPower);
      flash *= step(uFlashThreshold, fract(uTime * uFlashTimingPeriod + vUv.y * 0.5));
      vec2 lightningUv = vUv * uLightningUvScale + vec2(uTime * uLightningAnimSpeed, 0.0);
      float lightningPattern = texture2D(uLightning, lightningUv).r;
      float bolt = lightningPattern * flash * uLightningIntensity;
      baseColor += uLightningColor * bolt;
    }
  }

  // Shattered planet effects (type 8) - lava base with enhanced normal detail
  if (uPlanetType > 7.5 && uPlanetType < 8.5) {
    float tempFactor = clamp(uTemperature / uTempScale, uTempClampMin, uTempClampMax);

    float noiseOffset = 0.0;
    if (uHasLavaNoise > 0.5) {
      vec2 noiseUv = animatedUv * 2.0 + vec2(uTime * 0.02, uTime * 0.015);
      float noise = texture2D(uLavaNoise, noiseUv).r;
      noiseOffset = noise * uNoiseOffsetScale * tempFactor;
      baseColor += uGlowColor * noise * uNoiseGlowStrength * tempFactor;
    }

    float shatteredPulse = uPulseBase + uPulseRange * tempFactor * sin(uTime * uPulseFreq + diffuse.r * 6.28 + noiseOffset);
    baseColor *= shatteredPulse;
    // Shattered has more cracks/emissive details
    baseColor += diffuse.rgb * uSecondaryGlow * 1.5 * tempFactor * (0.5 + 0.5 * sin(uTime * uSecondaryFreq));
  }

  // Lighting
  vec3 lightDir = normalize(uStarPosition - vWorldPosition);
  float NdotL = dot(normalize(vWorldNormal), lightDir);
  float shadow = uShadowFloor + uShadowRange * max(NdotL, 0.0);

  if (uHasBakedHeightMap > 0.5) {
    vec3 worldPerturbedNormal = normalize(mat3(modelMatrix) * perturbedNormal);
    float bumpLight = max(dot(worldPerturbedNormal, lightDir), 0.0);
    shadow = uShadowFloor + uShadowRange * mix(max(NdotL, 0.0), bumpLight, 0.5);
  }

  vec3 litColor = baseColor * shadow * uStarColor;

  // Clouds (terrestrial types)
  if (uHasClouds > 0.5) {
    vec2 cloudUv = vUv;
    cloudUv.x += uTime * uCloudSpeed;
    vec4 clouds = texture2D(uClouds, cloudUv);

    vec2 capUv = vUv;
    capUv.x += uTime * uCloudCapSpeed;
    float capMask = smoothstep(0.3, 0.0, abs(vUv.y - 0.5));
    vec4 cloudCap = texture2D(uCloudCap, capUv) * (1.0 - capMask);

    float cloudAlpha = max(clouds.a, cloudCap.a) * uCloudAlpha;
    vec3 cloudColor = mix(clouds.rgb, cloudCap.rgb, cloudCap.a);
    cloudColor *= shadow * uStarColor;
    litColor = mix(litColor, cloudColor, cloudAlpha);
  }

  // City lights (night side)
  float nightMask = smoothstep(0.0, uNightThreshold, NdotL) * uHasCityLights;
  vec3 cityGlow = texture2D(uCityLight, vUv).rgb * nightMask * uCityGlowIntensity;

  // Atmospheric scattering
  vec3 scatter = vec3(0.0);
  if (uHasScatter > 0.5) {
    vec3 scatterLight = texture2D(uScatterLight, vec2(fresnel, 0.5)).rgb;
    vec3 scatterHue = texture2D(uScatterHue, vec2(fresnel, 0.5)).rgb;
    float sunInfluence = max(0.0, dot(lightDir, viewDir));
    scatter = mix(scatterHue, scatterLight, sunInfluence) * fresnel * uScatterStrength;
  }

  // Thunderstorm lightning (type 5)
  if (uPlanetType > 4.5 && uPlanetType < 5.5) {
    float flash = pow(fract(sin(uTime * uFlashFreq) * uHashConstant), uFlashPower);
    flash *= step(uFlashThreshold, fract(uTime * uFlashTimingPeriod + vUv.y * 0.5));

    if (uHasLightning > 0.5) {
      vec2 lightningUv = vUv * uLightningUvScale + vec2(uTime * uLightningAnimSpeed, 0.0);
      float lightningPattern = texture2D(uLightning, lightningUv).r;
      float bolt = lightningPattern * flash * uLightningIntensity;
      litColor += uLightningColor * bolt;
    } else {
      float lightning = pow(fract(sin(uTime * uLightningFreq + vUv.x * 50.0) * uHashConstant), uLightningPower);
      lightning *= step(uLightningThreshold, fract(uTime * uLightningTimingPeriod + vUv.y));
      litColor += uLightningColorAlt * lightning * uLightningIntensityProc;
    }
  }

  gl_FragColor = vec4(litColor + cityGlow + scatter, 1.0);
}
