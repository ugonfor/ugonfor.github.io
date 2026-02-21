import * as THREE from 'three';
import { CameraRig } from './camera-rig.js';
import { Terrain } from './terrain.js';
import { LightingSystem } from './lighting.js';
import { BuildingFactory } from './buildings.js';
import { PropFactory } from './props.js';
import { CharacterFactory } from './entities.js';
import { InteriorRenderer } from './interior.js';
import { WeatherFX } from './weather-fx.js';
import { SpeechOverlay } from './speech-overlay.js';
import { buildings, props, interiorDefs } from '../core/constants.js';

/**
 * Main Three.js renderer orchestrator for the playground game.
 * Manages scene, camera, lighting, terrain, buildings, props, entities.
 */
export class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;

    // Mobile detection
    this.isMobile = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

    // WebGL renderer
    this.webglRenderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.webglRenderer.setPixelRatio(this.isMobile ? 1 : Math.min(window.devicePixelRatio, 2));
    const initW = canvas.clientWidth || canvas.width || 960;
    const initH = canvas.clientHeight || canvas.height || 540;
    this.webglRenderer.setSize(initW, initH);
    this.webglRenderer.shadowMap.enabled = true;
    this.webglRenderer.shadowMap.type = THREE.PCFShadowMap;
    this.webglRenderer.outputColorSpace = THREE.SRGBColorSpace;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8fd8ff);
    // No fog by default — will be set dynamically for weather
    this.scene.fog = null;

    // Camera rig
    const aspect = (initW / initH) || (960 / 540);
    this.cameraRig = new CameraRig(aspect);

    // Factories
    this.buildingFactory = new BuildingFactory();
    this.propFactory = new PropFactory();
    this.characterFactory = new CharacterFactory();

    // Lighting
    this.lighting = new LightingSystem(this.scene);

    // Interior renderer
    this.interior = new InteriorRenderer(this.scene);

    // Weather FX
    this.weatherFX = new WeatherFX(this.scene, { mobile: this.isMobile });

    // Speech overlay container
    this._speechContainer = document.createElement('div');
    this._speechContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:2;';
    canvas.parentElement.appendChild(this._speechContainer);
    this.speechOverlay = new SpeechOverlay(this._speechContainer, canvas);

    // Entity mesh maps: npcId -> THREE.Group
    this.entityMeshes = new Map();
    this.playerMesh = null;

    // Lamp lights for night toggle
    this.lampLights = [];

    // Outdoor groups (for indoor/outdoor toggle)
    this.outdoorGroups = [];

    // Terrain reference
    this.terrain = null;

    // Scene state tracking for enter/exit transitions
    this._currentScene = 'outdoor';

    // Lightning flash state
    this._lightningBoost = 0;

    // Raycaster for click detection
    this._raycaster = new THREE.Raycaster();
    this._mouseVec = new THREE.Vector2();

    // Reduce shadow map on mobile
    if (this.isMobile) {
      this.lighting.sun.shadow.mapSize.width = 1024;
      this.lighting.sun.shadow.mapSize.height = 1024;
    }
  }

  /**
   * Initialize the 3D scene from game state.
   * Called once after the game world is ready.
   * @param {object} gameState - { player, npcs, world, roadTileFn, waterTileFn }
   */
  init(gameState) {
    const { player, npcs, world, roadTileFn, waterTileFn } = gameState;

    // --- Terrain ---
    this.terrain = new Terrain(world.width, world.height, roadTileFn, waterTileFn);
    const terrainMeshes = this.terrain.getMeshes();
    for (const m of terrainMeshes) {
      this.scene.add(m);
      this.outdoorGroups.push(m);
    }

    // --- Buildings ---
    for (const bDef of buildings) {
      const bGroup = this.buildingFactory.createBuilding(bDef);
      this.scene.add(bGroup);
      this.outdoorGroups.push(bGroup);
    }

    // --- Props ---
    for (const pDef of props) {
      const pGroup = this.propFactory.createProp(pDef.type, pDef.x, pDef.y);
      this.scene.add(pGroup);
      this.outdoorGroups.push(pGroup);

      // Collect lamp lights
      if (pDef.type === 'lamp' && pGroup.userData.lampLight) {
        this.lampLights.push(pGroup.userData.lampLight);
      }
    }

    // --- Cache sit/lie positions from props ---
    this._benchPositions = props.filter(p => p.type === 'bench').map(p => ({ x: p.x, y: p.y }));
    this._bedPositions = []; // populated from interiorDefs
    for (const [id, def] of Object.entries(interiorDefs)) {
      if (def.furniture) {
        for (const f of def.furniture) {
          if (f.type === 'bed' || f.type === 'bunk_bed') {
            this._bedPositions.push({ x: f.x, y: f.y, scene: id });
          }
        }
      }
    }

    // --- Player ---
    this.playerMesh = this.characterFactory.createCharacter(
      player.species || 'human_a',
      player.color,
      true
    );
    this.playerMesh.position.set(player.x, 0, player.y);
    this.scene.add(this.playerMesh);
    this.characterFactory.updateNameTag(this.playerMesh, player.name, true);

    // --- NPCs ---
    if (npcs) {
      for (const npc of npcs) {
        this._addNpcMesh(npc);
      }
    }

    // Register outdoor groups for interior toggling
    this.interior.setOutdoorGroups(this.outdoorGroups);

    // Initial camera position
    this.cameraRig.smoothTarget.set(player.x, 0, player.y);
    this.cameraRig.setZoom(world.zoom || 3.2);

  }

  /**
   * Add an NPC mesh to the scene.
   */
  _addNpcMesh(npc) {
    const mesh = this.characterFactory.createCharacter(
      npc.species || 'human_a',
      npc.color,
      false
    );
    mesh.position.set(npc.x, 0, npc.y);
    this.scene.add(mesh);
    this.entityMeshes.set(npc.id, mesh);
    this.characterFactory.updateNameTag(mesh, npc.name, true);
  }

  /**
   * Called every frame.
   * @param {object} gameState - Current game state
   * @param {number} dt - Delta time in seconds
   * @param {number} time - Total elapsed time in seconds
   */
  render(gameState, dt, time) {
    const { player, npcs, world, weather, sceneState, speechBubbles } = gameState;

    // --- Scene state transitions ---
    if (sceneState) {
      const targetScene = sceneState.current || 'outdoor';
      if (targetScene !== this._currentScene) {
        if (targetScene === 'outdoor') {
          this.exitInterior();
        } else {
          this.enterInterior(targetScene);
        }
        this._currentScene = targetScene;
      }
    }

    // --- Update entity positions ---
    if (this.playerMesh) {
      const prevPX = this.playerMesh.position.x;
      const prevPZ = this.playerMesh.position.z;
      this.playerMesh.position.set(player.x, 0, player.y);

      // Detect movement by position change (works for keyboard + click-to-move)
      const pdx = player.x - prevPX;
      const pdy = player.y - prevPZ;
      const playerMoving = Math.abs(pdx) > 0.001 || Math.abs(pdy) > 0.001;
      if (playerMoving) {
        this.playerMesh.rotation.y = Math.atan2(pdx, pdy);
        this.characterFactory.animateWalk(this.playerMesh, time);
      } else {
        this.characterFactory.animateIdle(this.playerMesh);
      }
    }

    if (npcs) {
      for (const npc of npcs) {
        let mesh = this.entityMeshes.get(npc.id);
        if (!mesh) {
          this._addNpcMesh(npc);
          mesh = this.entityMeshes.get(npc.id);
        }
        if (mesh) {
          const prevNX = mesh.position.x;
          const prevNZ = mesh.position.z;
          mesh.position.set(npc.x, 0, npc.y);

          // NPC visibility based on scene
          if (sceneState) {
            const npcScene = npc.currentScene || 'outdoor';
            mesh.visible = npcScene === this._currentScene;
          }

          // Detect movement
          const ndx = npc.x - prevNX;
          const ndy = npc.y - prevNZ;
          const npcMoving = Math.abs(ndx) > 0.005 || Math.abs(ndy) > 0.005;

          // Face direction if moving
          if (npcMoving) {
            mesh.rotation.y = Math.atan2(ndx, ndy);
          }

          // Animate by state + mood + proximity to furniture
          const npcMood = (npc.moodUntil > performance.now()) ? npc.mood : 'neutral';
          const npcState = npc.state || 'idle';
          if (!npcMoving && npcState === 'idle') {
            const nearBench = this._isNearProp(npc.x, npc.y, this._benchPositions, 1.2);
            const npcScene = npc.currentScene || 'outdoor';
            const nearBed = npcScene !== 'outdoor' && this._isNearBed(npc.x, npc.y, npcScene, 1.5);
            if (nearBed) {
              this.characterFactory.animateLie(mesh);
            } else if (nearBench) {
              this.characterFactory.animateSit(mesh);
            } else {
              this.characterFactory.animateByState(mesh, npcState, npcMood, time, false);
            }
          } else {
            // Reset lie rotation if was lying
            if (mesh.rotation.z !== 0) { mesh.rotation.z = 0; mesh.position.y = 0; }
            this.characterFactory.animateByState(mesh, npcState, npcMood, time, npcMoving);
          }
        }
      }
    }

    // --- Camera follow ---
    this.cameraRig.setZoom(world.zoom || 3.2);
    this.cameraRig.follow(player.x, player.y, dt);

    // --- Lighting update ---
    const hour = (world.totalMinutes / 60) % 24;
    const weatherType = (weather && weather.current) || world.weather || 'clear';
    this.lighting.update(hour, weatherType);

    const isNight = hour >= 20 || hour < 5;
    this.lighting.updateLamps(this.lampLights, isNight);

    // --- Weather FX (outdoor only) ---
    const isIndoor = sceneState && sceneState.current !== "outdoor";
    if (weather && !isIndoor) {
      const camTarget = this.cameraRig.smoothTarget || { x: player.x, z: player.y };
      this.weatherFX.update(weather, camTarget, time, world.zoom);

      // Lightning flash: brief white ambient boost
      if (weather.lightningFlash > 0) {
        this._lightningBoost = weather.lightningFlash;
      }
    } else if (isIndoor) {
      // Hide all weather particles indoors
      this.weatherFX.update({ current: "clear", intensity: 0, windX: 0, lightningFlash: 0 }, { x: 0, z: 0 }, time, world.zoom);
    }
    if (this._lightningBoost > 0 && !isIndoor) {
      this.lighting.ambient.intensity += this._lightningBoost * 1.5;
      this._lightningBoost *= 0.85;
      if (this._lightningBoost < 0.01) this._lightningBoost = 0;
    }

    // --- Sky color based on time ---
    this._updateSkyColor(hour);

    // --- Water animation ---
    if (this.terrain) {
      this.terrain.updateWater(time);
    }

    // --- Render ---
    this.webglRenderer.render(this.scene, this.cameraRig.getActive());

    // --- Speech bubbles (after render, needs camera matrices updated) ---
    // Map bubble IDs to entity world positions
    const mappedBubbles = [];
    if (speechBubbles && speechBubbles.length > 0) {
      const curScene = this._currentScene || 'outdoor';
      for (const b of speechBubbles) {
        let bx = b.x, by = b.y;
        if (bx == null || by == null) {
          if (b.id === "player" || b.id === player.name) {
            bx = player.x; by = player.y;
          } else {
            const npc = npcs && npcs.find(n => n.id === b.id);
            if (!npc) continue;
            // Only show bubbles from NPCs in the same scene
            const npcScene = npc.currentScene || 'outdoor';
            if (npcScene !== curScene) continue;
            bx = npc.x; by = npc.y;
          }
        }
        mappedBubbles.push({ speakerId: b.id, text: b.text, until: b.until, x: bx, y: by });
      }
    }
    this.speechOverlay.update(mappedBubbles, this.cameraRig.getActive());
  }

  _updateSkyColor(hour) {
    const sky = this.scene.background;
    if (hour >= 5 && hour < 8) {
      const t = (hour - 5) / 3;
      sky.setHex(0xff9966).lerp(new THREE.Color(0x8fd8ff), t);
    } else if (hour >= 8 && hour < 17) {
      sky.setHex(0x8fd8ff);
    } else if (hour >= 17 && hour < 20) {
      const t = (hour - 17) / 3;
      sky.copy(new THREE.Color(0x8fd8ff)).lerp(new THREE.Color(0x1a1a3a), t);
    } else {
      sky.setHex(0x1a1a3a);
    }
    // Fog color sync (if fog is active for weather)
    if (this.scene.fog) this.scene.fog.color.copy(sky);
  }

  /**
   * Convert screen coordinates to world position via raycasting.
   * @param {number} clientX
   * @param {number} clientY
   * @returns {{ x: number, z: number } | null}
   */
  screenToWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    this._mouseVec.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this._mouseVec.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this._raycaster.setFromCamera(this._mouseVec, this.cameraRig.getActive());

    // Intersect with a ground plane at y=0
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();
    const ray = this._raycaster.ray;
    if (ray.intersectPlane(groundPlane, intersection)) {
      return { x: intersection.x, z: intersection.z };
    }
    return null;
  }

  /**
   * Enter a building interior.
   * @param {string} buildingId
   * @returns {object|null} room info
   */
  enterInterior(buildingId) {
    const info = this.interior.enterRoom(buildingId);
    if (info) {
      // Also hide player/NPC meshes in outdoor
      // (they will be re-positioned inside the room by game logic)
      this.cameraRig.transitionToInterior({
        x: info.width / 2,
        z: info.height / 2,
      });
    }
    return info;
  }

  /**
   * Exit building interior, restore outdoor.
   */
  exitInterior() {
    this.interior.exitRoom();
    this.cameraRig.transitionToOutdoor();
  }

  /**
   * Handle canvas resize.
   */
  resize() {
    const w = this.canvas.clientWidth || this.canvas.width || 960;
    const h = this.canvas.clientHeight || this.canvas.height || 540;
    this.webglRenderer.setSize(w, h);
    this.cameraRig.resize(w / h || 960 / 540);
  }

  _isNearProp(x, y, positions, radius) {
    for (const p of positions) {
      const dx = x - p.x, dy = y - p.y;
      if (dx * dx + dy * dy < radius * radius) return true;
    }
    return false;
  }

  _isNearBed(x, y, scene, radius) {
    for (const b of this._bedPositions) {
      if (b.scene !== scene) continue;
      const dx = x - b.x, dy = y - b.y;
      if (dx * dx + dy * dy < radius * radius) return true;
    }
    return false;
  }

  /**
   * Clean up all Three.js resources.
   */
  dispose() {
    this.weatherFX.dispose();
    this.speechOverlay.dispose();
    this.scene.traverse((child) => {
      if (child.isMesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else if (child.material) {
          child.material.dispose();
        }
      }
      if (child.isLight && child.shadow && child.shadow.map) {
        child.shadow.map.dispose();
      }
    });
    this.webglRenderer.dispose();
    this.entityMeshes.clear();
  }
}
