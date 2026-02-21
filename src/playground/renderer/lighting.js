import * as THREE from 'three';

/**
 * Day/night cycle lighting with weather adjustments.
 */
export class LightingSystem {
  constructor(scene) {
    // Ambient base light
    this.ambient = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(this.ambient);

    // Hemisphere: sky / ground
    this.hemi = new THREE.HemisphereLight(0x87ceeb, 0x556b2f, 0.4);
    scene.add(this.hemi);

    // Directional: sun
    this.sun = new THREE.DirectionalLight(0xfff4e0, 0.8);
    this.sun.position.set(30, 60, 30);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.width = 2048;
    this.sun.shadow.mapSize.height = 2048;
    this.sun.shadow.camera.left = -40;
    this.sun.shadow.camera.right = 40;
    this.sun.shadow.camera.top = 40;
    this.sun.shadow.camera.bottom = -40;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 150;
    this.sun.shadow.bias = -0.002;
    scene.add(this.sun);
    scene.add(this.sun.target);

    // Directional: moon (weaker, blue-ish)
    this.moon = new THREE.DirectionalLight(0x8899cc, 0);
    this.moon.position.set(-20, 40, -20);
    scene.add(this.moon);

    this._scene = scene;
  }

  /**
   * @param {number} hour - Game hour (0-24, fractional)
   * @param {string} weatherType - 'clear','cloudy','rain','storm','snow','fog'
   */
  update(hour, weatherType) {
    let sunIntensity = 0;
    let moonIntensity = 0;
    let ambientIntensity = 0;
    let hemiIntensity = 0;
    const sunColor = new THREE.Color(0xfff4e0);
    const ambientColor = new THREE.Color(0xffffff);

    if (hour >= 5 && hour < 8) {
      // Dawn
      const t = (hour - 5) / 3;
      sunIntensity = t * 0.8;
      ambientIntensity = 0.15 + t * 0.15;
      hemiIntensity = 0.2 + t * 0.2;
      sunColor.setHex(0xff9944).lerp(new THREE.Color(0xfff4e0), t);
      ambientColor.setHex(0xffccaa).lerp(new THREE.Color(0xffffff), t);
      // Sun rises from east
      const angle = (-Math.PI / 2) + t * (Math.PI / 3);
      this.sun.position.set(Math.cos(angle) * 60, Math.sin(angle) * 60 + 10, 30);
    } else if (hour >= 8 && hour < 17) {
      // Day
      sunIntensity = 0.8;
      ambientIntensity = 0.3;
      hemiIntensity = 0.4;
      // Sun arc across sky
      const t = (hour - 8) / 9;
      const angle = (-Math.PI / 6) + t * (Math.PI / 3);
      this.sun.position.set(Math.cos(angle) * 60, 60, Math.sin(angle) * 40 + 10);
    } else if (hour >= 17 && hour < 20) {
      // Dusk
      const t = (hour - 17) / 3;
      sunIntensity = 0.8 * (1 - t);
      moonIntensity = t * 0.25;
      ambientIntensity = 0.3 - t * 0.15;
      hemiIntensity = 0.4 - t * 0.2;
      sunColor.setHex(0xfff4e0).lerp(new THREE.Color(0xff6633), t);
      ambientColor.setHex(0xffffff).lerp(new THREE.Color(0x334466), t);
      const angle = (Math.PI / 6) + t * (Math.PI / 3);
      this.sun.position.set(Math.cos(angle) * 60, Math.sin(Math.PI - angle) * 40 + 10, 30);
    } else {
      // Night (20-5) — bright enough to always see clearly
      sunIntensity = 0;
      moonIntensity = 0.8;
      ambientIntensity = 0.55;
      hemiIntensity = 0.4;
      ambientColor.setHex(0x8899bb);
    }

    // Weather modifiers — keep bright enough to see
    let weatherMul = 1.0;
    if (weatherType === 'storm') weatherMul = 0.7;
    else if (weatherType === 'rain') weatherMul = 0.8;
    else if (weatherType === 'cloudy') weatherMul = 0.9;
    else if (weatherType === 'fog') weatherMul = 0.85;
    else if (weatherType === 'snow') weatherMul = 0.85;

    this.sun.intensity = sunIntensity * weatherMul;
    this.sun.color.copy(sunColor);
    this.moon.intensity = moonIntensity;
    // Ensure minimum brightness — never too dark to see
    this.ambient.intensity = Math.max(0.4, ambientIntensity * weatherMul);
    this.ambient.color.copy(ambientColor);
    this.hemi.intensity = Math.max(0.25, hemiIntensity * weatherMul);
  }

  /**
   * Toggle lamp point lights on/off based on night.
   * @param {THREE.PointLight[]} lampLights - Array of PointLight refs from lamp props
   * @param {boolean} isNight - true if hour >= 20 or hour < 5
   */
  updateLamps(lampLights, isNight) {
    const targetIntensity = isNight ? 1.2 : 0;
    for (const light of lampLights) {
      light.intensity = targetIntensity;
    }
  }
}
