export const planetVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const terrestrialFragmentShader = `
  uniform sampler2D uDiffuse;
  uniform sampler2D uGradient;
  uniform sampler2D uCityLight;
  uniform sampler2D uScatterLight;
  uniform sampler2D uScatterHue;
  uniform sampler2D uPoleMask;
  uniform vec3 uAtmosphereColor;
  uniform float uAtmosphereIntensity;
  uniform float uTime;
  uniform vec3 uStarPosition;
  uniform vec3 uStarColor;
  uniform float uHasCityLights;
  uniform float uHasScatter;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 viewDir = normalize(-vPosition);
    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);

    vec4 diffuse = texture2D(uDiffuse, vUv);

    float gradientSample = dot(vNormal, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;
    vec3 gradientColor = texture2D(uGradient, vec2(gradientSample, 0.5)).rgb;

    float poleMask = texture2D(uPoleMask, vec2(0.5, abs(vUv.y - 0.5) * 2.0)).r;

    vec3 baseColor = diffuse.rgb * gradientColor * 1.5 * (0.7 + 0.3 * poleMask);

    vec3 lightDir = normalize(uStarPosition - vWorldPosition);
    float NdotL = dot(normalize(vWorldNormal), lightDir);
    float shadow = 0.15 + 0.85 * max(NdotL, 0.0);

    vec3 litColor = baseColor * shadow * uStarColor;

    // City lights on night side
    float nightMask = smoothstep(0.0, -0.15, NdotL) * uHasCityLights;
    vec3 cityGlow = texture2D(uCityLight, vUv).rgb * nightMask * 2.0;

    // Atmosphere from scatter textures
    vec3 atmosphere = uAtmosphereColor * fresnel * uAtmosphereIntensity;
    if (uHasScatter > 0.5) {
      vec3 scatterLight = texture2D(uScatterLight, vec2(fresnel, 0.5)).rgb;
      vec3 scatterHue = texture2D(uScatterHue, vec2(fresnel, 0.5)).rgb;
      float sunInfluence = max(0.0, dot(lightDir, viewDir));
      atmosphere = mix(scatterHue, scatterLight, sunInfluence) * fresnel * uAtmosphereIntensity * 2.0;
    }

    gl_FragColor = vec4(litColor + cityGlow + atmosphere, 1.0);
  }
`

export const gasGiantFragmentShader = `
  uniform sampler2D uDiffuse;
  uniform sampler2D uDetail;
  uniform sampler2D uMixer;
  uniform sampler2D uGradient;
  uniform sampler2D uPoleMask;
  uniform vec3 uAtmosphereColor;
  uniform float uAtmosphereIntensity;
  uniform float uTime;
  uniform float uBandSpeed;
  uniform vec3 uStarPosition;
  uniform vec3 uStarColor;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 viewDir = normalize(-vPosition);
    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);

    // Animated bands - slower near poles
    float latitudeFactor = 1.0 - pow(abs(vUv.y - 0.5) * 2.0, 2.0);
    vec2 animUv = vUv;
    animUv.x += uTime * uBandSpeed * latitudeFactor;

    vec4 diffuse = texture2D(uDiffuse, animUv);
    vec4 detail = texture2D(uDetail, animUv * 4.0);
    vec4 mixer = texture2D(uMixer, vUv);

    // Blend diffuse with detail based on mixer
    vec3 surfaceColor = mix(diffuse.rgb, diffuse.rgb * detail.rgb * 2.0, mixer.r * 0.5);

    float gradientSample = dot(vNormal, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;
    vec3 gradientColor = texture2D(uGradient, vec2(gradientSample, 0.5)).rgb;

    // Pole darkening
    float poleMask = texture2D(uPoleMask, vec2(0.5, abs(vUv.y - 0.5) * 2.0)).r;

    vec3 baseColor = surfaceColor * gradientColor * 1.3 * (0.6 + 0.4 * poleMask);

    vec3 lightDir = normalize(uStarPosition - vWorldPosition);
    float NdotL = max(dot(normalize(vWorldNormal), lightDir), 0.0);
    float shadow = 0.15 + 0.85 * NdotL;

    vec3 litColor = baseColor * shadow * uStarColor;
    vec3 atmosphere = uAtmosphereColor * fresnel * uAtmosphereIntensity;

    gl_FragColor = vec4(litColor + atmosphere, 1.0);
  }
`

export const iceFragmentShader = `
  uniform sampler2D uDiffuse;
  uniform sampler2D uColorize;
  uniform sampler2D uGradient;
  uniform sampler2D uScatterLight;
  uniform sampler2D uScatterHue;
  uniform sampler2D uPoleMask;
  uniform vec3 uAtmosphereColor;
  uniform float uAtmosphereIntensity;
  uniform float uTime;
  uniform vec3 uStarPosition;
  uniform vec3 uStarColor;
  uniform vec3 uIceColorHigh;
  uniform vec3 uIceColorMid;
  uniform vec3 uIceColorLow;
  uniform float uHasScatter;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 viewDir = normalize(-vPosition);
    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);

    vec4 diffuse = texture2D(uDiffuse, vUv);
    vec4 colorize = texture2D(uColorize, vUv);

    // Ice color ramp based on colorize map
    float colorVal = colorize.r;
    vec3 iceColor;
    if (colorVal < 0.5) {
      iceColor = mix(uIceColorLow, uIceColorMid, colorVal * 2.0);
    } else {
      iceColor = mix(uIceColorMid, uIceColorHigh, (colorVal - 0.5) * 2.0);
    }

    float gradientSample = dot(vNormal, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;
    vec3 gradientColor = texture2D(uGradient, vec2(gradientSample, 0.5)).rgb;

    float poleMask = texture2D(uPoleMask, vec2(0.5, abs(vUv.y - 0.5) * 2.0)).r;

    vec3 baseColor = diffuse.rgb * iceColor * gradientColor * 1.5 * (0.7 + 0.3 * poleMask);

    vec3 lightDir = normalize(uStarPosition - vWorldPosition);
    float NdotL = max(dot(normalize(vWorldNormal), lightDir), 0.0);
    float shadow = 0.15 + 0.85 * NdotL;

    // Specular for ice
    vec3 halfVec = normalize(lightDir + viewDir);
    float spec = pow(max(dot(vWorldNormal, halfVec), 0.0), 32.0);

    vec3 litColor = baseColor * shadow * uStarColor + spec * uStarColor * 0.3;

    // Atmosphere
    vec3 atmosphere = uAtmosphereColor * fresnel * uAtmosphereIntensity;
    if (uHasScatter > 0.5) {
      vec3 scatterLight = texture2D(uScatterLight, vec2(fresnel, 0.5)).rgb;
      vec3 scatterHue = texture2D(uScatterHue, vec2(fresnel, 0.5)).rgb;
      float sunInfluence = max(0.0, dot(lightDir, viewDir));
      atmosphere = mix(scatterHue, scatterLight, sunInfluence) * fresnel * uAtmosphereIntensity * 2.0;
    }

    gl_FragColor = vec4(litColor + atmosphere, 1.0);
  }
`

export const lavaFragmentShader = `
  uniform sampler2D uDiffuse;
  uniform sampler2D uHeight;
  uniform sampler2D uGradient;
  uniform sampler2D uScatterLight;
  uniform sampler2D uScatterHue;
  uniform vec3 uLavaColor1;
  uniform vec3 uLavaColor2;
  uniform float uTime;
  uniform vec3 uStarPosition;
  uniform vec3 uStarColor;
  uniform float uHasScatter;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 viewDir = normalize(-vPosition);
    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);

    vec4 diffuse = texture2D(uDiffuse, vUv);
    float height = texture2D(uHeight, vUv).r;

    float gradientSample = dot(vNormal, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;
    vec3 gradientColor = texture2D(uGradient, vec2(gradientSample, 0.5)).rgb;

    vec3 baseColor = diffuse.rgb * gradientColor;

    vec3 lightDir = normalize(uStarPosition - vWorldPosition);
    float NdotL = max(dot(normalize(vWorldNormal), lightDir), 0.0);
    float shadow = 0.15 + 0.85 * NdotL;

    vec3 litColor = baseColor * shadow * uStarColor;

    // Animated lava glow - low areas glow more
    float lavaAnim = 0.7 + 0.3 * sin(uTime * 1.5 + vUv.x * 10.0 + vUv.y * 8.0);
    float lavaMask = (1.0 - height) * lavaAnim;
    vec3 lavaGlow = mix(uLavaColor1, uLavaColor2, sin(uTime * 0.5) * 0.5 + 0.5);
    vec3 emissive = lavaGlow * lavaMask * 1.5;

    // Subtle atmosphere from scatter
    vec3 atmosphere = vec3(0.0);
    if (uHasScatter > 0.5) {
      vec3 scatterLight = texture2D(uScatterLight, vec2(fresnel, 0.5)).rgb;
      vec3 scatterHue = texture2D(uScatterHue, vec2(fresnel, 0.5)).rgb;
      atmosphere = mix(scatterHue, scatterLight, 0.5) * fresnel * 0.3;
    }

    gl_FragColor = vec4(litColor + emissive + atmosphere, 1.0);
  }
`

export const basicPlanetFragmentShader = `
  uniform sampler2D uDiffuse;
  uniform sampler2D uGradient;
  uniform vec3 uAtmosphereColor;
  uniform float uAtmosphereIntensity;
  uniform float uEmissiveIntensity;
  uniform float uTime;
  uniform vec3 uStarPosition;
  uniform vec3 uStarColor;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 viewDir = normalize(-vPosition);
    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);

    vec4 diffuse = texture2D(uDiffuse, vUv);

    float gradientSample = dot(vNormal, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;
    vec3 gradientColor = texture2D(uGradient, vec2(gradientSample, 0.5)).rgb;

    vec3 baseColor = diffuse.rgb * gradientColor * 1.5;

    vec3 lightDir = normalize(uStarPosition - vWorldPosition);
    float NdotL = max(dot(normalize(vWorldNormal), lightDir), 0.0);
    float shadow = 0.15 + 0.85 * NdotL;

    vec3 litColor = baseColor * shadow * uStarColor;
    vec3 atmosphere = uAtmosphereColor * fresnel * uAtmosphereIntensity;
    vec3 emissive = diffuse.rgb * uEmissiveIntensity * (0.8 + 0.2 * sin(uTime * 2.0));

    gl_FragColor = vec4(litColor + atmosphere + emissive, 1.0);
  }
`

export const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const atmosphereFragmentShader = `
  uniform vec3 uColor;
  uniform float uIntensity;

  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 viewDir = normalize(-vPosition);
    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.5);
    float alpha = fresnel * uIntensity;
    gl_FragColor = vec4(uColor, alpha * 0.6);
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
