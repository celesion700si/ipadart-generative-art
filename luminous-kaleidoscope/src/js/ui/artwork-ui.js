export class ArtworkUI {
  constructor(renderer, memory) {
    this.renderer = renderer;
    this.memory = memory;
    this.infoButton = document.querySelector("#info-button");
    this.closeButton = document.querySelector("#close-button");
    this.panel = document.querySelector("#info-panel");
    this.backdrop = document.querySelector("#panel-backdrop");
    this.pauseButton = document.querySelector("#pause-button");
    this.resetButton = document.querySelector("#reset-button");
    this.status = document.querySelector("#live-status");
    this.bindEvents();
  }

  bindEvents() {
    this.infoButton.addEventListener("click", () => this.open());
    this.closeButton.addEventListener("click", () => this.close());
    this.backdrop.addEventListener("click", () => this.close());
    this.pauseButton.addEventListener("click", () => this.togglePause());
    this.resetButton.addEventListener("click", () => this.slowReset());
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") this.close();
      if (event.code === "Space" && event.target === document.body) {
        event.preventDefault();
        this.togglePause();
      }
      if (event.key.toLowerCase() === "r" && event.target === document.body) {
        this.slowReset();
      }
    });
  }

  open() {
    this.panel.hidden = false;
    this.backdrop.hidden = false;
    requestAnimationFrame(() => {
      this.panel.classList.add("is-open");
      this.backdrop.classList.add("is-open");
    });
    this.infoButton.setAttribute("aria-expanded", "true");
    this.closeButton.focus();
  }

  close() {
    if (this.panel.hidden) return;
    this.panel.classList.remove("is-open");
    this.backdrop.classList.remove("is-open");
    this.infoButton.setAttribute("aria-expanded", "false");
    window.setTimeout(() => {
      this.panel.hidden = true;
      this.backdrop.hidden = true;
    }, 560);
    this.infoButton.focus();
  }

  togglePause() {
    const isPaused = this.renderer.togglePause();
    this.pauseButton.textContent = isPaused ? "Continue" : "Pause";
    this.status.textContent = isPaused ? "作品已暫停" : "作品繼續流動";
  }

  slowReset() {
    this.memory.slowReset();
    this.status.textContent = "微光正在緩慢重置";
    this.close();
  }
}
