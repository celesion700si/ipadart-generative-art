import { CONFIG } from "../config.js";

export class MemoryBuffer {
  constructor(maxTraces = CONFIG.maxTraces) {
    this.maxTraces = maxTraces;
    this.traces = [];
    this.isResetting = false;
    this.resetProgress = 0;
  }

  add(position, speed, hold = 0) {
    const normalizedSpeed = Math.min(speed / CONFIG.speedReference, 1);
    const life = CONFIG.maxTraceLife -
      normalizedSpeed * (CONFIG.maxTraceLife - CONFIG.minTraceLife);
    const trace = {
      x: position.x,
      y: position.y,
      age: 0,
      life,
      energy: 0.42 + (1 - normalizedSpeed) * 0.38 + hold * 0.2,
      speed: normalizedSpeed
    };

    const previous = this.traces[this.traces.length - 1];
    if (previous && Math.hypot(previous.x - trace.x, previous.y - trace.y) < 0.025) {
      previous.energy = Math.min(1, previous.energy + 0.12);
      previous.life = Math.max(previous.life, life);
      previous.age *= 0.78;
      return;
    }

    this.traces.push(trace);
    if (this.traces.length > this.maxTraces) this.traces.shift();
  }

  update(dt) {
    const resetMultiplier = this.isResetting ? 5 : 1;
    for (const trace of this.traces) trace.age += dt * resetMultiplier;
    this.traces = this.traces.filter((trace) => trace.age < trace.life);

    if (this.isResetting) {
      this.resetProgress += dt / CONFIG.resetDuration;
      if (this.resetProgress >= 1 || this.traces.length === 0) {
        this.traces = [];
        this.isResetting = false;
        this.resetProgress = 0;
      }
    }
  }

  slowReset() {
    this.isResetting = true;
    this.resetProgress = 0;
  }

  uniforms() {
    const positions = [];
    const data = [];
    for (let i = 0; i < CONFIG.maxTraces; i += 1) {
      const trace = this.traces[i];
      positions.push(trace?.x ?? -2, trace?.y ?? -2);
      if (trace) {
        const remaining = Math.max(0, 1 - trace.age / trace.life);
        data.push(remaining * trace.energy, trace.speed);
      } else {
        data.push(0, 0);
      }
    }
    return { positions, data, count: this.traces.length };
  }
}
