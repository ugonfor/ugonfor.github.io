import * as THREE from 'three';

/**
 * Weather particle system using Three.js Points.
 * Rain, snow, fog, cloudy haze, lightning.
 * Particles use sizeAttenuation:false for consistent size in ortho camera.
 */
export class WeatherFX {
  constructor(scene, opts = {}) {
    this._scene = scene;
    const mobile = opts.mobile || false;

    // --- Rain ---
    const rainCount = mobile ? 200 : 400;
    this._rainCount = rainCount;
    const rainGeo = new THREE.BufferGeometry();
    this._rainPos = new Float32Array(rainCount * 3);
    rainGeo.setAttribute('position', new THREE.BufferAttribute(this._rainPos, 3));
    this._rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({
      color: 0xaaccff,
      size: 3,                   // screen pixels (sizeAttenuation off)
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    }));
    this._rain.visible = false;
    this._rain.renderOrder = 999;
    scene.add(this._rain);

    // --- Snow ---
    const snowCount = mobile ? 80 : 160;
    this._snowCount = snowCount;
    const snowGeo = new THREE.BufferGeometry();
    this._snowPos = new Float32Array(snowCount * 3);
    snowGeo.setAttribute('position', new THREE.BufferAttribute(this._snowPos, 3));
    this._snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({
      color: 0xffffff,
      size: 5,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    }));
    this._snow.visible = false;
    this._snow.renderOrder = 999;
    scene.add(this._snow);

    // --- Cloudy overlay (semi-transparent plane above scene) ---
    const cloudGeo = new THREE.PlaneGeometry(120, 120);
    cloudGeo.rotateX(-Math.PI / 2);
    this._cloudPlane = new THREE.Mesh(cloudGeo, new THREE.MeshBasicMaterial({
      color: 0x889099,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    }));
    this._cloudPlane.position.set(30, 12, 32);
    this._cloudPlane.renderOrder = 998;
    this._cloudPlane.visible = false;
    scene.add(this._cloudPlane);

    // Pre-allocate random offsets — cover entire map (60x65)
    const spread = 65;
    this._rainSpread = [];
    for (let i = 0; i < rainCount; i++) {
      this._rainSpread.push(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread,
        Math.random() * 12,   // initial Y phase
      );
    }
    this._snowSpread = [];
    for (let i = 0; i < snowCount; i++) {
      this._snowSpread.push(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread,
        Math.random() * 12,
        Math.random() * Math.PI * 2,  // wobble phase
      );
    }

    this._prevWeather = null;
  }

  update(weather, cameraTarget, time, zoom) {
    const zoomScale = (zoom || 3.2) / 3.2; // 1.0 at default zoom
    const type = weather.current;
    const windX = weather.windX || 0;

    const showRain = type === 'rain' || type === 'storm';
    const showSnow = type === 'snow';
    this._rain.visible = showRain;
    this._snow.visible = showSnow;

    // Cloudy overlay
    const showCloud = type === 'cloudy' || type === 'rain' || type === 'storm';
    this._cloudPlane.visible = showCloud;
    if (showCloud) {
      const targetOpacity = type === 'storm' ? 0.25 : type === 'rain' ? 0.15 : 0.1;
      this._cloudPlane.material.opacity += (targetOpacity - this._cloudPlane.material.opacity) * 0.05;
      this._cloudPlane.position.set(30, 12, 32);
    }

    // Fog
    if (type === 'fog') {
      if (!this._scene.fog || !(this._scene.fog instanceof THREE.FogExp2)) {
        this._scene.fog = new THREE.FogExp2(0xaabbcc, 0.025);
      } else {
        this._scene.fog.density = 0.025;
      }
    } else if (type === 'storm') {
      if (!this._scene.fog || !(this._scene.fog instanceof THREE.FogExp2)) {
        this._scene.fog = new THREE.FogExp2(0x667788, 0.006);
      } else {
        this._scene.fog.density = 0.006;
      }
    } else {
      if (this._scene.fog && this._prevWeather !== type) {
        this._scene.fog = null;
      }
    }
    this._prevWeather = type;

    // Fix particles to world center, not camera — prevents "following player" effect
    const cx = 30;  // world center x (worldWidth/2)
    const cz = 32;  // world center z (worldHeight/2)

    // --- Rain ---
    if (showRain) {
      const arr = this._rainPos;
      const speed = type === 'storm' ? 14 : 9;
      for (let i = 0; i < this._rainCount; i++) {
        const ox = this._rainSpread[i * 3];
        const oz = this._rainSpread[i * 3 + 1];
        const yPhase = this._rainSpread[i * 3 + 2];
        let y = yPhase - (time * speed) % 12;
        y = ((y % 12) + 12) % 12;
        arr[i * 3]     = cx + ox + windX * (12 - y) * 0.08;
        arr[i * 3 + 1] = y;
        arr[i * 3 + 2] = cz + oz;
      }
      this._rain.geometry.attributes.position.needsUpdate = true;
      this._rain.material.opacity = type === 'storm' ? 0.65 : 0.5;
      this._rain.material.size = (type === 'storm' ? 4 : 3) * zoomScale;
    }

    // --- Snow ---
    if (showSnow) {
      const arr = this._snowPos;
      for (let i = 0; i < this._snowCount; i++) {
        const ox = this._snowSpread[i * 4];
        const oz = this._snowSpread[i * 4 + 1];
        const yPhase = this._snowSpread[i * 4 + 2];
        const wobPhase = this._snowSpread[i * 4 + 3];
        let y = yPhase - (time * 1.2) % 12;
        y = ((y % 12) + 12) % 12;
        const wobble = Math.sin(time * 0.8 + wobPhase) * 1.2;
        arr[i * 3]     = cx + ox + wobble;
        arr[i * 3 + 1] = y;
        arr[i * 3 + 2] = cz + oz;
      }
      this._snow.geometry.attributes.position.needsUpdate = true;
      this._snow.material.size = 5 * zoomScale;
    }
  }

  dispose() {
    this._rain.geometry.dispose();
    this._rain.material.dispose();
    this._scene.remove(this._rain);
    this._snow.geometry.dispose();
    this._snow.material.dispose();
    this._scene.remove(this._snow);
    this._cloudPlane.geometry.dispose();
    this._cloudPlane.material.dispose();
    this._scene.remove(this._cloudPlane);
  }
}
