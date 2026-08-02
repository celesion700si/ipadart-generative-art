import { CONFIG } from "../config.js";

export class GestureEnergy {
  constructor(element) {
    this.element = element;
    this.position = { x: 0.5, y: 0.5 };
    this.target = { x: 0.5, y: 0.5 };
    this.previous = { x: 0.5, y: 0.5 };
    this.velocity = 0;
    this.hold = 0;
    this.isPresent = false;
    this.isPressed = false;
    this.onTrace = null;
    this.lastEventTime = performance.now();
    this.bindEvents();
  }

  bindEvents() {
    this.handleMove = (event) => {
      const bounds = this.element.getBoundingClientRect();
      const now = performance.now();
      const dt = Math.max((now - this.lastEventTime) / 1000, 1 / 120);
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = 1 - (event.clientY - bounds.top) / bounds.height;
      const dx = x - this.previous.x;
      const dy = y - this.previous.y;

      this.target.x = Math.max(0, Math.min(1, x));
      this.target.y = Math.max(0, Math.min(1, y));
      this.velocity = Math.min(Math.hypot(dx, dy) / dt, 4);
      this.previous = { ...this.target };
      this.lastEventTime = now;
      this.isPresent = true;

      if (this.isPressed && this.onTrace) {
        this.onTrace(this.target, this.velocity, this.hold);
      }
    };

    this.handleDown = (event) => {
      this.element.setPointerCapture?.(event.pointerId);
      this.isPressed = true;
      this.isPresent = true;
      this.handleMove(event);
      this.onTrace?.(this.target, this.velocity, this.hold);
    };

    this.handleUp = (event) => {
      this.element.releasePointerCapture?.(event.pointerId);
      this.isPressed = false;
    };

    this.handleLeave = () => {
      if (!this.isPressed) this.isPresent = false;
    };

    this.element.addEventListener("pointermove", this.handleMove, { passive: true });
    this.element.addEventListener("pointerdown", this.handleDown, { passive: true });
    this.element.addEventListener("pointerup", this.handleUp, { passive: true });
    this.element.addEventListener("pointercancel", this.handleUp, { passive: true });
    this.element.addEventListener("pointerleave", this.handleLeave, { passive: true });
  }

  update(dt) {
    const spring = 1 - Math.exp(-CONFIG.pointerSpring * dt);
    this.position.x += (this.target.x - this.position.x) * spring;
    this.position.y += (this.target.y - this.position.y) * spring;
    this.velocity *= Math.pow(CONFIG.pointerDamping, dt * 60);
    const holdDirection = this.isPressed ? CONFIG.holdRisePerSecond : -CONFIG.holdFallPerSecond;
    this.hold = Math.max(0, Math.min(1, this.hold + holdDirection * dt));
  }

  destroy() {
    this.element.removeEventListener("pointermove", this.handleMove);
    this.element.removeEventListener("pointerdown", this.handleDown);
    this.element.removeEventListener("pointerup", this.handleUp);
    this.element.removeEventListener("pointercancel", this.handleUp);
    this.element.removeEventListener("pointerleave", this.handleLeave);
  }
}
