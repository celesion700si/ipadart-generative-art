import { CONFIG } from "./config.js";
import { GestureEnergy } from "./interaction/gesture-energy.js";
import { MemoryBuffer } from "./scene/memory-buffer.js";
import { LuminousRenderer } from "./rendering/renderer.js";
import { ArtworkUI } from "./ui/artwork-ui.js";

class LuminousKaleidoscopeApp {
  constructor() {
    this.container = document.querySelector("#canvas-container");
    this.preferences = {
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches
    };
    const traceLimit = this.preferences.reducedMotion
      ? CONFIG.reducedMotionTraces
      : CONFIG.maxTraces;
    this.memory = new MemoryBuffer(traceLimit);
    this.interaction = new GestureEnergy(this.container);
    this.interaction.onTrace = (position, speed, hold) => {
      this.memory.add(position, speed, hold);
    };
    this.renderer = new LuminousRenderer(
      this.container,
      this.memory,
      this.interaction,
      this.preferences
    );
    this.ui = new ArtworkUI(this.renderer, this.memory);
    this.wasPausedByVisibility = false;

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && !this.renderer.isPaused) {
        this.renderer.togglePause();
        this.wasPausedByVisibility = true;
      } else if (!document.hidden && this.wasPausedByVisibility) {
        this.renderer.togglePause();
        this.wasPausedByVisibility = false;
      }
    });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  window.luminousKaleidoscope = new LuminousKaleidoscopeApp();
});
