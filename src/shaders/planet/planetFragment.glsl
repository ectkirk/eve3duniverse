// Planet Fragment Shader - supports all planet types via branching
#include "../lib/common.glsl"
#include "../lib/lighting.glsl"
#include "../lib/noise.glsl"

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
uniform float uHasCityLights;
uniform float uHasScatter;
uniform float uHasHeightMap;
uniform float uHasClouds;
uniform float uHasBakedHeightMap;
uniform float uHasLavaNoise;
uniform float uHasLightning;
uniform float uHasGasGiantMixer;
uniform float uHasGasGiantNoise;
uniform float uTime;
uniform vec3 uStarPosition;
uniform vec3 uStarColor;
uniform float uPlanetType;
uniform float uTemperature;
uniform vec4 uWindFactors;
uniform vec4 uCapColor;
uniform vec4 uDistoFactors;
uniform vec4 uSaturation;

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
  float delta = 0.002;
  float hx = texture2D(uBakedHeightMap, uv + vec2(delta, 0.0)).r;
  float hy = texture2D(uBakedHeightMap, uv + vec2(0.0, delta)).r;

  float dx = hx - height;
  float dy = hy - height;

  vec3 bumpNormal = normalize(vec3(-dx * 2.0, -dy * 2.0, 1.0));
  mat3 TBN = mat3(vTangent, vBitangent, normal);
  return normalize(TBN * bumpNormal);
}

void main() {
  vec3 viewDir = normalize(-vPosition);
  vec3 normal = normalize(vNormal);
  float fresnel = fresnelPower(max(dot(normal, viewDir), 0.0), 3.0);

  vec2 animatedUv = vUv;
  float surfaceSpeed = 0.002;
  if (uPlanetType > 2.5 && uPlanetType < 3.5) {
    animatedUv.x = vUv.x + uTime * surfaceSpeed * 0.3;
  }

  vec3 perturbedNormal = perturbNormal(normal, animatedUv);
  vec4 diffuse = texture2D(uDiffuse, animatedUv);
  vec3 baseColor;

  // Gas Giant rendering (type 0)
  if (uPlanetType < 0.5) {
    float latitude = vUv.y - 0.5;
    float baseSpeed = uWindFactors.x > 0.0 ? uWindFactors.x : 0.3;
    float latVariation = uWindFactors.y > 0.0 ? uWindFactors.y : 0.5;
    float latFactor = latitude * 2.0;
    float bandSpeed = baseSpeed * surfaceSpeed * (1.0 + abs(latitude) * latVariation * 4.0);
    vec2 bandUv = vUv;
    bandUv.x += uTime * bandSpeed * latFactor;

    vec4 pattern = texture2D(uDiffuse, bandUv);

    float mixer = 0.5;
    if (uHasGasGiantMixer > 0.5) {
      mixer = texture2D(uGasGiantMixer, bandUv).r;
    }

    float noise = 0.0;
    float noiseSpeed = uWindFactors.z > 0.0 ? uWindFactors.z : 0.2;
    if (uHasGasGiantNoise > 0.5) {
      vec2 noiseUv = bandUv * 2.0 + vec2(uTime * noiseSpeed * 0.05, 0.0);
      noise = texture2D(uGasGiantNoise, noiseUv).r;
      float baseDistortion = uWindFactors.w > 0.0 ? uWindFactors.w : 0.12;
      float distoScale = uDistoFactors.x > 0.0 ? uDistoFactors.x / 10.0 : 0.4;
      float distortion = baseDistortion * distoScale;
      bandUv.y += (noise - 0.5) * distortion * mixer;
      pattern = texture2D(uDiffuse, bandUv);
    }

    float gradientSample = pattern.r * mixer + (1.0 - mixer) * pattern.g;
    vec3 gradientColor = texture2D(uGradient, vec2(gradientSample, 0.5)).rgb;

    float satBoost = uSaturation.x > 0.0 ? uSaturation.x : 1.0;
    float gray = dot(gradientColor, vec3(0.299, 0.587, 0.114));
    gradientColor = mix(vec3(gray), gradientColor, satBoost);

    float poleMask = texture2D(uPoleMask, vec2(0.5, abs(vUv.y - 0.5) * 2.0)).r;
    float poleBlend = 1.0 - poleMask;
    float capTint = uCapColor.x > 0.0 ? uCapColor.x : 0.0;
    vec3 polarTint = vec3(1.0 + capTint * poleBlend * 4.0, 1.0 - capTint * poleBlend, 1.0 - capTint * poleBlend);

    float intensity = 0.8 + 0.4 * pattern.a;
    baseColor = gradientColor * intensity * polarTint;
    baseColor *= 0.7 + 0.3 * poleMask;

    if (uHasGasGiantNoise > 0.5) {
      baseColor += gradientColor * noise * 0.1;
    }

    if (uHasHeightMap > 0.5) {
      vec3 h1 = texture2D(uHeightMap1, bandUv * 0.5).rgb;
      vec3 h2 = texture2D(uHeightMap2, bandUv * 0.5 + vec2(0.25, 0.0)).rgb;
      vec3 heightBlend = mix(h1, h2, mixer);
      baseColor *= 0.85 + 0.3 * dot(heightBlend, vec3(0.333));
    }
  } else {
    // Terrestrial/Ocean/Ice/Lava/Sandstorm rendering
    float gradientSample = dot(perturbedNormal, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;
    vec3 gradientColor = texture2D(uGradient, vec2(gradientSample, 0.5)).rgb;

    float poleMask = texture2D(uPoleMask, vec2(0.5, abs(vUv.y - 0.5) * 2.0)).r;

    baseColor = diffuse.rgb * gradientColor * 1.5 * (0.7 + 0.3 * poleMask);

    if (uHasHeightMap > 0.5) {
      float h1 = texture2D(uHeightMap1, animatedUv).r;
      float h2 = texture2D(uHeightMap2, animatedUv).r;
      float heightBlend = mix(h1, h2, 0.5);
      baseColor *= 0.8 + 0.4 * heightBlend;
    }
  }

  // Lava planet effects (type 3)
  if (uPlanetType > 2.5 && uPlanetType < 3.5) {
    float tempFactor = clamp(uTemperature / 1500.0, 0.5, 2.0);

    float noiseOffset = 0.0;
    if (uHasLavaNoise > 0.5) {
      vec2 noiseUv = animatedUv * 2.0 + vec2(uTime * 0.02, uTime * 0.015);
      float noise = texture2D(uLavaNoise, noiseUv).r;
      noiseOffset = noise * 0.3 * tempFactor;
      baseColor += vec3(1.0, 0.3, 0.1) * noise * 0.2 * tempFactor;
    }

    float lavaPulse = 0.85 + 0.15 * tempFactor * sin(uTime * 0.8 + diffuse.r * 6.28 + noiseOffset);
    baseColor *= lavaPulse;
    baseColor += diffuse.rgb * 0.15 * tempFactor * (0.5 + 0.5 * sin(uTime * 1.2));
  }

  // Lighting
  vec3 lightDir = normalize(uStarPosition - vWorldPosition);
  float NdotL = dot(normalize(vWorldNormal), lightDir);
  float shadow = 0.15 + 0.85 * max(NdotL, 0.0);

  if (uHasBakedHeightMap > 0.5) {
    vec3 worldPerturbedNormal = normalize(mat3(1.0) * perturbedNormal);
    float bumpLight = max(dot(worldPerturbedNormal, lightDir), 0.0);
    shadow = 0.15 + 0.85 * mix(max(NdotL, 0.0), bumpLight, 0.5);
  }

  vec3 litColor = baseColor * shadow * uStarColor;

  // Clouds
  if (uHasClouds > 0.5) {
    vec2 cloudUv = vUv;
    cloudUv.x += uTime * 0.008;
    vec4 clouds = texture2D(uClouds, cloudUv);

    vec2 capUv = vUv;
    capUv.x += uTime * 0.004;
    float capMask = smoothstep(0.3, 0.0, abs(vUv.y - 0.5));
    vec4 cloudCap = texture2D(uCloudCap, capUv) * (1.0 - capMask);

    float cloudAlpha = max(clouds.a, cloudCap.a) * 0.7;
    vec3 cloudColor = mix(clouds.rgb, cloudCap.rgb, cloudCap.a);
    cloudColor *= shadow * uStarColor;
    litColor = mix(litColor, cloudColor, cloudAlpha);
  }

  // City lights (night side)
  float nightMask = smoothstep(0.0, -0.15, NdotL) * uHasCityLights;
  vec3 cityGlow = texture2D(uCityLight, vUv).rgb * nightMask * 2.0;

  // Atmospheric scattering
  vec3 scatter = vec3(0.0);
  if (uHasScatter > 0.5) {
    vec3 scatterLight = texture2D(uScatterLight, vec2(fresnel, 0.5)).rgb;
    vec3 scatterHue = texture2D(uScatterHue, vec2(fresnel, 0.5)).rgb;
    float sunInfluence = max(0.0, dot(lightDir, viewDir));
    scatter = mix(scatterHue, scatterLight, sunInfluence) * fresnel * 0.8;
  }

  // Thunderstorm lightning (type 5)
  if (uPlanetType > 4.5 && uPlanetType < 5.5) {
    float flash = pow(fract(sin(uTime * 8.0) * 43758.5453), 15.0);
    flash *= step(0.92, fract(uTime * 0.2 + vUv.y * 0.5));

    if (uHasLightning > 0.5) {
      vec2 lightningUv = vUv * vec2(2.0, 1.0) + vec2(uTime * 0.1, 0.0);
      float lightningPattern = texture2D(uLightning, lightningUv).r;
      float bolt = lightningPattern * flash * 3.0;
      litColor += vec3(0.7, 0.8, 1.0) * bolt;
    } else {
      float lightning = pow(fract(sin(uTime * 15.0 + vUv.x * 50.0) * 43758.5453), 20.0);
      lightning *= step(0.97, fract(uTime * 0.3 + vUv.y));
      litColor += vec3(0.8, 0.85, 1.0) * lightning * 2.0;
    }
  }

  gl_FragColor = vec4(litColor + cityGlow + scatter, 1.0);
}
