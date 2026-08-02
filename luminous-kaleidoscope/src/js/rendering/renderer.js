import { CONFIG } from "../config.js";

export class LuminousRenderer {
  constructor(container, memory, interaction, preferences) {
    this.container = container;
    this.memory = memory;
    this.interaction = interaction;
    this.preferences = preferences;
    this.isPaused = false;
    this.elapsed = 0;
    this.quality = this.chooseQuality();
    this.createSketch();
  }

  chooseQuality() {
    const area = window.innerWidth * window.innerHeight;
    const memory = navigator.deviceMemory || 4;
    if (area > 1_700_000 && memory >= 6) return CONFIG.quality.high;
    if (area < 480_000 || memory <= 2) return CONFIG.quality.efficient;
    return CONFIG.quality.balanced;
  }

  createSketch() {
    const self = this;
    this.instance = new window.p5((p) => {
      p.preload = () => {
        self.shader = p.loadShader("./src/shaders/luminous.vert", "./src/shaders/luminous.frag");
      };

      p.setup = () => {
        const canvas = p.createCanvas(self.container.clientWidth, self.container.clientHeight, p.WEBGL);
        canvas.parent(self.container);
        canvas.elt.setAttribute("role", "img");
        canvas.elt.setAttribute("aria-label", "會記住手勢的互動微光場");
        p.pixelDensity(Math.min(window.devicePixelRatio || 1, self.quality.pixelDensity));
        p.noStroke();
      };

      p.draw = () => {
        const dt = Math.min(p.deltaTime / 1000, 0.05);
        if (!self.isPaused) {
          self.elapsed += dt * (self.preferences.reducedMotion ? 0.45 : 1);
          self.interaction.update(dt);
          self.memory.update(dt);
        }

        const traceUniforms = self.memory.uniforms();
        const isPortrait = p.height > p.width;
        p.shader(self.shader);
        self.shader.setUniform("uResolution", [p.width, p.height]);
        self.shader.setUniform("uTime", self.elapsed);
        self.shader.setUniform("uPointer", [self.interaction.position.x, self.interaction.position.y]);
        self.shader.setUniform("uPresence", self.interaction.isPresent ? 1 : 0);
        self.shader.setUniform("uPressed", self.interaction.isPressed ? 1 : 0);
        self.shader.setUniform("uHold", self.interaction.hold);
        self.shader.setUniform("uTracePositions", traceUniforms.positions);
        self.shader.setUniform("uTraceData", traceUniforms.data);
        self.shader.setUniform("uTraceCount", traceUniforms.count);
        self.shader.setUniform("uFoldCount", self.quality.foldCount);
        self.shader.setUniform("uPortrait", isPortrait ? 1 : 0);
        self.shader.setUniform("uReducedMotion", self.preferences.reducedMotion ? 1 : 0);
        p.rect(-p.width / 2, -p.height / 2, p.width, p.height);
      };

      p.windowResized = () => {
        p.resizeCanvas(self.container.clientWidth, self.container.clientHeight);
      };
    }, this.container);
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }
}
