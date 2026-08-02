export const CONFIG = Object.freeze({
  version: "0.1.0",
  maxTraces: 14,
  reducedMotionTraces: 7,
  speedReference: 1.35,
  minTraceLife: 1.8,
  maxTraceLife: 8.0,
  holdRisePerSecond: 0.34,
  holdFallPerSecond: 0.17,
  resetDuration: 2.8,
  pointerSpring: 8.5,
  pointerDamping: 0.82,
  quality: {
    high: { pixelDensity: 1.6, foldCount: 7, traceCount: 14 },
    balanced: { pixelDensity: 1.25, foldCount: 5, traceCount: 10 },
    efficient: { pixelDensity: 1.0, foldCount: 3, traceCount: 7 }
  }
});
