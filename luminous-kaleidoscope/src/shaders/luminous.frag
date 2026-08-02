precision highp float;

#define MAX_TRACES 14
#define PI 3.14159265359

uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uPointer;
uniform float uPresence;
uniform float uPressed;
uniform float uHold;
uniform vec2 uTracePositions[MAX_TRACES];
uniform vec2 uTraceData[MAX_TRACES];
uniform int uTraceCount;
uniform int uFoldCount;
uniform float uPortrait;
uniform float uReducedMotion;

varying vec2 vTexCoord;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

float noise21(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
             mix(hash21(i + vec2(0.0, 1.0)), hash21(i + 1.0), f.x), f.y);
}

mat2 rotate2d(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

vec2 foldSpace(vec2 p, float count, float phase) {
  float angle = atan(p.y, p.x) + phase;
  float radius = length(p);
  float sector = PI * 2.0 / count;
  angle = abs(mod(angle + sector * 0.5, sector) - sector * 0.5);
  angle += sin(radius * 5.2 + uTime * 0.07) * 0.025;
  return vec2(cos(angle), sin(angle)) * radius;
}

float veil(vec2 p, vec2 center, float width, float phase) {
  vec2 q = p - center;
  float curve = q.y + sin(q.x * 3.0 + phase) * 0.11;
  float band = exp(-abs(curve) / width);
  float radial = exp(-length(q * vec2(0.78, 1.18)) * 1.35);
  return band * radial;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  vec2 p = uv - 0.5;
  float aspect = uResolution.x / uResolution.y;
  p.x *= aspect;

  float portraitShift = uPortrait * 0.105;
  p.y += portraitShift;

  float slowTime = uTime * mix(0.055, 0.022, uReducedMotion);
  vec2 drift = vec2(
    noise21(vec2(slowTime, 2.4)) - 0.5,
    noise21(vec2(7.2, slowTime * 0.83)) - 0.5
  ) * mix(0.085, 0.035, uReducedMotion);

  vec2 pointer = uPointer - 0.5;
  pointer.x *= aspect;
  pointer.y += portraitShift;
  vec2 attention = mix(drift, pointer * 0.23, uPresence);

  vec3 voidColor = vec3(0.027, 0.031, 0.043);
  vec3 depthColor = vec3(0.063, 0.082, 0.133);
  vec3 violet = vec3(0.129, 0.106, 0.173);
  vec3 moss = vec3(0.090, 0.141, 0.125);
  vec3 cyan = vec3(0.604, 0.863, 0.878);
  vec3 lilac = vec3(0.780, 0.710, 0.910);
  vec3 amber = vec3(0.902, 0.780, 0.580);

  float vignette = smoothstep(0.92, 0.12, length(p * vec2(0.82, 1.0)));
  float atmosphere = noise21(p * 1.45 + vec2(slowTime, -slowTime * 0.6));
  vec3 color = mix(voidColor, depthColor, atmosphere * 0.22 * vignette);
  color += mix(violet, moss, noise21(p * 2.1 - slowTime)) * 0.035 * vignette;

  float foldCount = float(uFoldCount);
  vec2 foldedA = foldSpace((p - attention) * rotate2d(slowTime * 0.42), foldCount, 0.08);
  vec2 foldedB = foldSpace((p + attention * 0.42) * rotate2d(-slowTime * 0.31), max(3.0, foldCount - 2.0), 0.29);
  vec2 foldedC = foldSpace(p + vec2(0.028, -0.017), foldCount, -0.17 + sin(slowTime) * 0.03);

  float breath = 0.5 + 0.5 * sin(uTime * 0.23);
  float core = exp(-length(foldedA * vec2(0.82, 1.18)) * (5.1 - breath * 0.45));
  float veilA = veil(foldedA, vec2(0.17, 0.02), 0.042, uTime * 0.12);
  float veilB = veil(foldedB, vec2(0.11, -0.025), 0.028, -uTime * 0.09 + 1.8);
  float veilC = veil(foldedC, vec2(0.23, 0.035), 0.02, uTime * 0.07 + 4.1);

  color += cyan * veilA * (0.11 + breath * 0.045);
  color += lilac * veilB * 0.095;
  color += mix(cyan, lilac, 0.42) * veilC * 0.055;
  color += mix(cyan, lilac, atmosphere) * core * (0.075 + uPresence * 0.05);

  float memoryLight = 0.0;
  float warmMemory = 0.0;
  for (int i = 0; i < MAX_TRACES; i++) {
    if (i >= uTraceCount) break;
    vec2 tracePosition = uTracePositions[i] - 0.5;
    tracePosition.x *= aspect;
    tracePosition.y += portraitShift;
    float remaining = uTraceData[i].x;
    float speed = uTraceData[i].y;
    vec2 traceFold = foldSpace(p - tracePosition * 0.16, foldCount, float(i) * 0.071);
    float distanceToTrace = length(traceFold - tracePosition * 0.78);
    float softness = mix(0.018, 0.052, 1.0 - speed);
    float glow = exp(-distanceToTrace / softness) * remaining;
    memoryLight += glow * mix(0.035, 0.092, 1.0 - speed);
    warmMemory += glow * (1.0 - speed) * remaining;
  }

  color += mix(cyan, lilac, 0.58) * memoryLight;
  color += amber * warmMemory * (0.012 + uHold * 0.025);

  float pointerDistance = length(p - pointer);
  float contact = exp(-pointerDistance * (9.5 - uHold * 2.0)) * uPresence;
  color += mix(cyan, lilac, 0.34) * contact * (0.018 + uPressed * 0.04 + uHold * 0.035);

  color *= 0.56 + vignette * 0.44;
  float grain = hash21(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5;
  color += grain * 0.007 * (1.0 - uReducedMotion * 0.4);
  color = color / (1.0 + color * 0.42);
  color = pow(max(color, 0.0), vec3(0.93));

  gl_FragColor = vec4(color, 1.0);
}
