import { nowMs } from '../utils/helpers.js';
import { places } from '../core/constants.js';

/**
 * Weather system: Seoul real-time weather sync + particle simulation.
 */

export function createWeatherState() {
  return {
    current: "clear",
    next: "clear",
    intensity: 0,
    targetIntensity: 0,
    windX: 0,
    transitionProgress: 1,
    nextChangeAt: 0,
    lightningFlash: 0,
  };
}

export function createWeatherParticles() {
  return { rain: [], snow: [], fireflies: [], leaves: [], splashes: [] };
}

let weatherApiNextFetch = 0;

export async function fetchSeoulWeather(weather, apiUrl) {
  if (!apiUrl) return;
  try {
    const res = await fetch(apiUrl);
    if (!res.ok) return;
    const data = await res.json();
    if (data.weather && data.weather !== weather.current) {
      weather.next = data.weather;
      weather.targetIntensity = data.weather === "clear" ? 0 : 0.5;
      weather.transitionProgress = 0;
    }
  } catch { /* 실패 시 현재 날씨 유지 */ }
}

export function updateWeather(weather, dt, apiUrl) {
  const now = nowMs();
  if (now > weatherApiNextFetch) {
    weatherApiNextFetch = now + 600_000;
    fetchSeoulWeather(weather, apiUrl);
  }
  if (weather.transitionProgress < 1) {
    weather.transitionProgress = Math.min(1, weather.transitionProgress + dt * 0.12);
    if (weather.transitionProgress >= 1) weather.current = weather.next;
  }
  weather.intensity += (weather.targetIntensity - weather.intensity) * dt * 2;
  const targetWind = weather.current === "storm" ? -3.5 : weather.current === "rain" ? -1.5 : weather.current === "snow" ? -0.6 : 0;
  weather.windX += (targetWind - weather.windX) * dt * 0.8;
  if (weather.current === "storm" && Math.random() < dt * 0.12) weather.lightningFlash = 1;
  weather.lightningFlash *= 0.82;
}

export function updateWeatherParticles(weather, particles, dt, canvasWidth, canvasHeight, hourOfDay) {
  const w = canvasWidth;
  const h = canvasHeight;
  const inten = weather.intensity;
  // Rain
  if (weather.current === "rain" || weather.current === "storm") {
    const maxP = weather.current === "storm" ? 300 : 150;
    const target = Math.floor(maxP * inten);
    while (particles.rain.length < target) {
      particles.rain.push({ x: Math.random() * (w + 200) - 100, y: -Math.random() * h, speed: 400 + Math.random() * 300, len: 8 + Math.random() * 12 });
    }
    if (particles.rain.length > target) particles.rain.length = target;
    for (const p of particles.rain) {
      p.x += weather.windX * 60 * dt;
      p.y += p.speed * dt;
      if (p.y > h) { p.y = -10; p.x = Math.random() * (w + 200) - 100; particles.splashes.push({ x: p.x, y: h - Math.random() * 40, life: 0.3 }); }
    }
  } else {
    particles.rain.length = 0;
  }
  // Snow
  if (weather.current === "snow") {
    const target = Math.floor(120 * inten);
    while (particles.snow.length < target) {
      particles.snow.push({ x: Math.random() * w, y: -Math.random() * h, speed: 30 + Math.random() * 50, size: 2 + Math.random() * 4, wobble: Math.random() * Math.PI * 2 });
    }
    if (particles.snow.length > target) particles.snow.length = target;
    for (const p of particles.snow) {
      p.wobble += dt * 2;
      p.x += Math.sin(p.wobble) * 20 * dt + weather.windX * 15 * dt;
      p.y += p.speed * dt;
      if (p.y > h) { p.y = -10; p.x = Math.random() * w; }
    }
  } else {
    particles.snow.length = 0;
  }
  // Splashes
  for (let i = particles.splashes.length - 1; i >= 0; i--) {
    particles.splashes[i].life -= dt;
    if (particles.splashes[i].life <= 0) particles.splashes.splice(i, 1);
  }
  // Fireflies (night only)
  const isNight = hourOfDay >= 20 || hourOfDay < 5;
  if (isNight) {
    while (particles.fireflies.length < 18) {
      const pp = places.park;
      particles.fireflies.push({ x: pp.x - 4 + Math.random() * 8, y: pp.y - 4 + Math.random() * 8, phase: Math.random() * Math.PI * 2, dx: (Math.random() - 0.5) * 0.3, dy: (Math.random() - 0.5) * 0.3 });
    }
    for (const f of particles.fireflies) {
      f.phase += dt * 1.8;
      f.x += f.dx * dt + Math.sin(f.phase * 0.7) * 0.3 * dt;
      f.y += f.dy * dt + Math.cos(f.phase * 0.5) * 0.3 * dt;
      if (f.x < 2 || f.x > 30 || f.y < 2 || f.y > 30) { f.dx = -f.dx; f.dy = -f.dy; }
    }
  } else {
    particles.fireflies.length = 0;
  }
  // Leaves (always, gentle)
  while (particles.leaves.length < 8) {
    particles.leaves.push({ x: Math.random() * w, y: -20 - Math.random() * h * 0.5, speed: 15 + Math.random() * 25, rot: Math.random() * Math.PI * 2, size: 3 + Math.random() * 4 });
  }
  for (let i = particles.leaves.length - 1; i >= 0; i--) {
    const l = particles.leaves[i];
    l.rot += dt * 1.5;
    l.x += (weather.windX * 10 + Math.sin(l.rot) * 15) * dt;
    l.y += l.speed * dt;
    if (l.y > h + 20 || l.x < -40 || l.x > w + 40) { particles.leaves.splice(i, 1); }
  }
}
