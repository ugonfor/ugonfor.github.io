import * as THREE from 'three';

/**
 * HTML-based label overlay for NPC names and building labels.
 * Same projection technique as SpeechOverlay — always crisp on any DPI.
 */
export class LabelOverlay {
  constructor(containerEl, canvas) {
    this._container = containerEl;
    this._canvas = canvas;
    /** @type {Map<string, HTMLDivElement>} */
    this._labels = new Map();
    this._vec3 = new THREE.Vector3();
  }

  /**
   * Update NPC name labels.
   * @param {Array<{ id: string, name: string, x: number, y: number, visible: boolean }>} entities
   * @param {THREE.Camera} camera
   */
  updateNpcLabels(entities, camera) {
    const activeIds = new Set();
    for (const e of entities) {
      activeIds.add('npc_' + e.id);
      const key = 'npc_' + e.id;
      let el = this._labels.get(key);
      if (!el) {
        el = document.createElement('div');
        el.className = 'pg-label pg-label-npc';
        this._container.appendChild(el);
        this._labels.set(key, el);
      }
      el.textContent = e.name;

      if (!e.visible) {
        el.style.display = 'none';
        continue;
      }

      this._vec3.set(e.x, 1.6, e.y);
      this._vec3.project(camera);
      if (this._vec3.z > 1) {
        el.style.display = 'none';
        continue;
      }
      el.style.display = '';
      const w = this._canvas.clientWidth;
      const h = this._canvas.clientHeight;
      el.style.left = ((this._vec3.x * 0.5 + 0.5) * w) + 'px';
      el.style.top = ((-this._vec3.y * 0.5 + 0.5) * h) + 'px';
    }
    // Remove stale
    for (const [key, el] of this._labels) {
      if (key.startsWith('npc_') && !activeIds.has(key)) {
        el.remove();
        this._labels.delete(key);
      }
    }
  }

  /**
   * Update building labels (called once or on scene change).
   * @param {Array<{ id: string, label: string, x: number, y: number, h: number, w: number, z: number }>} bldgs
   * @param {THREE.Camera} camera
   * @param {string} currentScene
   * @param {Function} [translateFn] - optional i18n function: key → localized string
   */
  updateBuildingLabels(bldgs, camera, currentScene, translateFn) {
    if (currentScene !== 'outdoor') {
      // Hide all building labels when indoors
      for (const [key, el] of this._labels) {
        if (key.startsWith('bld_')) el.style.display = 'none';
      }
      return;
    }
    const tr = typeof translateFn === 'function' ? translateFn : (v) => v;
    for (const b of bldgs) {
      if (!b.label) continue;
      const key = 'bld_' + b.id;
      let el = this._labels.get(key);
      if (!el) {
        el = document.createElement('div');
        el.className = 'pg-label pg-label-building';
        this._container.appendChild(el);
        this._labels.set(key, el);
      }
      el.textContent = tr(b.label);

      // Building center + above roof
      const cx = b.x + (b.w || 3) / 2;
      const cy = b.y + (b.h || 3) / 2;
      const height = (b.z || 2) + 1.2;
      this._vec3.set(cx, height, cy);
      this._vec3.project(camera);
      if (this._vec3.z > 1) {
        el.style.display = 'none';
        continue;
      }
      el.style.display = '';
      const w = this._canvas.clientWidth;
      const h = this._canvas.clientHeight;
      el.style.left = ((this._vec3.x * 0.5 + 0.5) * w) + 'px';
      el.style.top = ((-this._vec3.y * 0.5 + 0.5) * h) + 'px';
    }
  }

  dispose() {
    for (const [, el] of this._labels) {
      el.remove();
    }
    this._labels.clear();
  }
}
