export const planetVertexShader = `
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

    // Calculate tangent and bitangent for normal mapping on sphere
    vec3 n = normalize(normal);
    vec3 up = abs(n.y) < 0.999 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vTangent = normalize(cross(up, n));
    vBitangent = normalize(cross(n, vTangent));

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const starVertexShader = `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec2 vUv;

  void main() {
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const starFragmentShader = `
  uniform sampler2D uSurface;
  uniform sampler2D uRamp;
  uniform float uTime;
  uniform float uLuminosity;

  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec2 vUv;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float NdotV = max(dot(vWorldNormal, viewDir), 0.0);

    vec2 surfaceUv = vUv * 2.0 + vec2(uTime * 0.01, uTime * 0.005);
    vec4 surfaceDetail = texture2D(uSurface, surfaceUv);

    float rampCoord = NdotV * 0.8 + surfaceDetail.r * 0.2;
    vec3 starColor = texture2D(uRamp, vec2(rampCoord, 0.5)).rgb;

    float limbDarkening = 0.6 + 0.4 * NdotV;
    vec3 color = starColor * limbDarkening * (1.0 + surfaceDetail.r * 0.3);

    float brightnessMult = 1.0 + 0.3 * clamp(log(uLuminosity + 1.0), 0.0, 2.0);
    color *= brightnessMult;

    gl_FragColor = vec4(color, 1.0);
  }
`

export const glowVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const glowFragmentShader = `
  uniform sampler2D uCoronaRamp;
  uniform float uLuminosity;
  uniform float uTime;

  varying vec2 vUv;

  void main() {
    vec2 center = vUv - 0.5;
    float dist = length(center) * 2.0;

    float rampCoord = 1.0 - smoothstep(0.0, 1.0, dist);
    vec3 coronaColor = texture2D(uCoronaRamp, vec2(rampCoord, 0.5)).rgb;

    float coreFalloff = 1.0 - smoothstep(0.0, 0.35, dist);
    float glowFalloff = exp(-dist * 2.5) * 0.6;
    float outerGlow = exp(-dist * 1.2) * 0.3;

    float glow = coreFalloff + glowFalloff + outerGlow;
    glow *= 1.0 - smoothstep(0.85, 1.0, dist);

    float intensity = 0.6 + 0.3 * clamp(log(uLuminosity + 1.0), 0.0, 1.5);
    float flicker = 1.0 + 0.015 * sin(uTime * 3.0);

    vec3 color = coronaColor * intensity * flicker;

    gl_FragColor = vec4(color, glow * intensity);
  }
`

export const heightBlitVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

export const heightBlitFragmentShader = `
  uniform sampler2D uNormalHeight1;
  uniform sampler2D uNormalHeight2;
  uniform float uRandom;

  varying vec2 vUv;

  void main() {
    vec4 h1 = texture2D(uNormalHeight1, vUv);
    vec4 h2 = texture2D(uNormalHeight2, vUv);
    float blend = fract(uRandom * 0.01 + 0.5);
    vec4 blended = mix(h1, h2, blend);
    gl_FragColor = blended;
  }
`

export const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const atmosphereFragmentShader = `
  uniform sampler2D uScatterLight;
  uniform sampler2D uScatterHue;
  uniform vec3 uStarPosition;
  uniform vec3 uStarColor;
  uniform vec4 uAtmosphereFactors;
  uniform vec4 uScatteringFactors;
  uniform vec3 uWavelengths;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  vec3 rayleighPhase(float cosAngle, vec3 wavelengths) {
    vec3 lambda4 = wavelengths * wavelengths * wavelengths * wavelengths;
    vec3 scatter = 1.0 / (lambda4 + 0.0001);
    float maxScatter = max(max(scatter.r, scatter.g), scatter.b);
    scatter /= maxScatter;
    float phase = 0.75 * (1.0 + cosAngle * cosAngle);
    return mix(vec3(1.0), scatter, 0.3) * phase;
  }

  void main() {
    vec3 viewDir = normalize(-vPosition);
    vec3 normal = normalize(vNormal);
    vec3 worldNormal = normalize(vWorldNormal);

    float NdotV = max(dot(normal, viewDir), 0.0);
    float fresnel = pow(1.0 - NdotV, 3.0);

    vec3 lightDir = normalize(uStarPosition - vWorldPosition);
    float NdotL = dot(worldNormal, lightDir);

    float viewAngle = 1.0 - NdotV;
    float sunAngle = max(0.0, dot(lightDir, -viewDir));

    vec3 scatterLight = texture2D(uScatterLight, vec2(viewAngle, 0.5)).rgb;
    vec3 scatterHue = texture2D(uScatterHue, vec2(viewAngle, 0.5)).rgb;
    vec3 textureScatter = mix(scatterHue, scatterLight, sunAngle);

    vec3 rayleigh = rayleighPhase(sunAngle, uWavelengths);

    vec3 atmosphereColor = uAtmosphereFactors.rgb;
    vec3 scatterTint = uScatteringFactors.rgb;
    vec3 scatterColor = textureScatter * atmosphereColor * scatterTint * rayleigh;

    float scatterIntensity = uScatteringFactors.a * 1.5;

    float horizonGlow = pow(fresnel, 2.0) * max(NdotL + 0.3, 0.0);
    float sunGlow = pow(max(0.0, dot(reflect(-viewDir, normal), lightDir)), 8.0) * 0.5;
    float dayIntensity = horizonGlow + sunGlow;

    float nightLimb = pow(fresnel, 4.0) * 0.12 * max(-NdotL, 0.0);

    vec3 finalColor = scatterColor * (dayIntensity + nightLimb) * scatterIntensity;
    finalColor *= uStarColor;

    float dayFactor = 0.5 + 0.5 * max(NdotL, 0.0);
    float alpha = fresnel * uAtmosphereFactors.a * max(dayFactor, nightLimb * 2.0);
    alpha = clamp(alpha, 0.0, 0.85);

    gl_FragColor = vec4(finalColor, alpha);
  }
`
