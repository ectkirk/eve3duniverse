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
