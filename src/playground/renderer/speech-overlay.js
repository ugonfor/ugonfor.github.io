import * as THREE from 'three';

/**
 * CSS-based speech bubbles projected from 3D world coordinates to screen.
 * Creates and manages div elements positioned over entities.
 */
export class SpeechOverlay {
  /**
   * @param {HTMLElement} containerEl - Parent element to append bubble divs to
   * @param {HTMLCanvasElement} canvas - WebGL canvas for size reference
   */
  constructor(containerEl, canvas) {
    this._container = containerEl;
    this._canvas = canvas;
    /** @type {Map<string, { el: HTMLDivElement, until: number }>} */
    this._bubbles = new Map();
    this._vec3 = new THREE.Vector3();
  }

  /**
   * Update speech bubbles each frame.
   * @param {Array<{ speakerId: string, text: string, until: number, x: number, y: number }>} speechBubbles
   * @param {THREE.Camera} camera
   */
  update(speechBubbles, camera) {
    const now = performance.now();
    const activeSpeakers = new Set();

    for (const bubble of speechBubbles) {
      if (now > bubble.until) continue;
      activeSpeakers.add(bubble.speakerId);

      let entry = this._bubbles.get(bubble.speakerId);
      if (!entry) {
        const el = document.createElement('div');
        el.className = 'pg-3d-bubble';
        this._container.appendChild(el);
        entry = { el, until: 0, text: '' };
        this._bubbles.set(bubble.speakerId, entry);
      }

      // Update text if changed
      if (entry.text !== bubble.text) {
        entry.el.textContent = bubble.text;
        entry.text = bubble.text;
      }
      entry.until = bubble.until;

      // Project world position to screen
      // entity.x -> three.js x, entity.y -> three.js z, height above head = 1.5
      this._vec3.set(bubble.x, 1.5, bubble.y);
      this._vec3.project(camera);

      // Check if behind camera
      if (this._vec3.z > 1) {
        entry.el.style.display = 'none';
        continue;
      }
      entry.el.style.display = '';

      const w = this._canvas.clientWidth;
      const h = this._canvas.clientHeight;
      const px = (this._vec3.x * 0.5 + 0.5) * w;
      const py = (-this._vec3.y * 0.5 + 0.5) * h;
      entry.el.style.left = px + 'px';
      entry.el.style.top = py + 'px';

      // Fade out in last 500ms
      const remaining = bubble.until - now;
      if (remaining < 500) {
        entry.el.style.opacity = String(remaining / 500);
      } else {
        entry.el.style.opacity = '1';
      }
    }

    // Remove expired bubbles
    for (const [id, entry] of this._bubbles) {
      if (!activeSpeakers.has(id)) {
        entry.el.remove();
        this._bubbles.delete(id);
      }
    }
  }

  /**
   * Wrap text with line breaks every 14 characters for Korean text.
   * @param {string} text
   * @returns {string}
   */
  _wrapText(text) {
    if (text.length <= 14) return text;
    let result = '';
    for (let i = 0; i < text.length; i += 14) {
      if (i > 0) result += '\n';
      result += text.slice(i, i + 14);
    }
    return result;
  }

  dispose() {
    for (const [, entry] of this._bubbles) {
      entry.el.remove();
    }
    this._bubbles.clear();
    if (this._container.parentElement) {
      this._container.remove();
    }
  }
}
