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
import { LabelOverlay } from './label-overlay.js';
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

    // Label overlay (NPC names, building labels) — same container, always crisp HTML
    this._labelContainer = document.createElement('div');
    this._labelContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:1;';
    canvas.parentElement.appendChild(this._labelContainer);
    this.labelOverlay = new LabelOverlay(this._labelContainer, canvas);

    // Entity mesh maps: npcId -> THREE.Group
    this.entityMeshes = new Map();
    // Remote player mesh map: sessionId -> THREE.Group
    this.remotePlayerMeshes = new Map();
    this.playerMesh = null;

    // Lamp lights for night toggle
    this.lampLights = [];

    // Building groups for window glow
    this.buildingGroups = [];

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
    const { player, npcs, world, roadTileFn, waterTileFn, translateFn, npcPersonas } = gameState;
    /** @type {Function|undefined} i18n translate function */
    this._translateFn = translateFn;
    this._npcPersonas = npcPersonas;

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
      this.buildingGroups.push(bGroup);
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
    // Name tags now rendered via HTML LabelOverlay (no 3D sprite needed)

    // --- NPCs ---
    if (npcs) {
      for (const npc of npcs) {
        this._addNpcMesh(npc);
      }
    }

    // --- Animals ---
    this._animals = [];
    const catPositions = [[12, 12], [28, 22], [40, 35]];
    for (const [ax, ay] of catPositions) {
      const mesh = this.characterFactory.createCat();
      mesh.position.set(ax, 0, ay);
      this.scene.add(mesh);
      this.outdoorGroups.push(mesh);
      this._animals.push({ mesh, x: ax, y: ay, targetX: ax, targetY: ay, speed: 0.8, waitUntil: 0 });
    }
    const dogPositions = [[18, 30], [35, 20]];
    for (const [ax, ay] of dogPositions) {
      const mesh = this.characterFactory.createDog();
      mesh.position.set(ax, 0, ay);
      this.scene.add(mesh);
      this.outdoorGroups.push(mesh);
      this._animals.push({ mesh, x: ax, y: ay, targetX: ax, targetY: ay, speed: 0.8, waitUntil: 0 });
    }

    // --- Building smoke/steam particle systems ---
    this._smokeSystems = [];
    const bakeryDef = buildings.find(b => b.id === 'bakery');
    const cafeDef = buildings.find(b => b.id === 'cafe');
    const houseDefs = buildings.filter(b => b.id.startsWith('house'));

    const createSmokeSystem = (bx, bz, tag) => {
      const count = 15;
      const positions = new Float32Array(count * 3);
      const lifetimes = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 0.3;
        positions[i * 3 + 1] = Math.random() * 2.5;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
        lifetimes[i] = Math.random();
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: 0xaaaaaa,
        size: 4,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      });
      const points = new THREE.Points(geo, mat);
      points.position.set(bx, 3.5, bz);
      points.visible = false;
      this.scene.add(points);
      this.outdoorGroups.push(points);
      return { points, lifetimes, tag };
    };

    if (bakeryDef) {
      this._smokeSystems.push(createSmokeSystem(
        bakeryDef.x + bakeryDef.w / 2, bakeryDef.y + bakeryDef.h / 2, 'bakery'
      ));
    }
    if (cafeDef) {
      this._smokeSystems.push(createSmokeSystem(
        cafeDef.x + cafeDef.w / 2, cafeDef.y + cafeDef.h / 2, 'cafe'
      ));
    }
    for (const h of houseDefs) {
      this._smokeSystems.push(createSmokeSystem(
        h.x + h.w / 2, h.y + h.h / 2, 'house'
      ));
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
    // Name tags now rendered via HTML LabelOverlay
  }

  /**
   * Called every frame.
   * @param {object} gameState - Current game state
   * @param {number} dt - Delta time in seconds
   * @param {number} time - Total elapsed time in seconds
   */
  render(gameState, dt, time) {
    const { player, npcs, world, weather, sceneState, speechBubbles, remotePlayers } = gameState;

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
      const playerPose = player.pose || 'standing';
      if (playerMoving) {
        this.playerMesh.rotation.y = Math.atan2(pdx, pdy);
        this.characterFactory.animateByState(this.playerMesh, 'moving', 'neutral', time, true, 'standing');
      } else {
        if (playerPose !== 'lying' && this.playerMesh.rotation.z !== 0) {
          this.playerMesh.rotation.z = 0;
          this.playerMesh.position.y = 0;
        }
        this.characterFactory.animateByState(this.playerMesh, 'idle', 'neutral', time, false, playerPose);
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

          // Face direction: moving → face movement, chatting → face player
          if (npcMoving) {
            mesh.rotation.y = Math.atan2(ndx, ndy);
          } else if (npc.state === 'chatting' && player) {
            const toPx = player.x - npc.x;
            const toPy = player.y - npc.y;
            if (Math.abs(toPx) > 0.1 || Math.abs(toPy) > 0.1) {
              mesh.rotation.y = Math.atan2(toPx, toPy);
            }
          }

          // Animate by state + mood + pose
          const npcMood = (npc.moodUntil > performance.now()) ? npc.mood : 'neutral';
          const npcState = npc.state || 'idle';
          const npcPose = npc.pose || 'standing';
          if (!npcMoving) {
            // Reset lie rotation if was lying and now standing
            if (npcPose !== 'lying' && mesh.rotation.z !== 0) { mesh.rotation.z = 0; mesh.position.y = 0; }
            // 앉을 때 벤치 방향으로 회전
            if (npcPose === 'sitting' && npc.seatFacing != null) {
              mesh.rotation.y = npc.seatFacing;
            }
            this.characterFactory.animateByState(mesh, npcState, npcMood, time, false, npcPose);
          } else {
            if (mesh.rotation.z !== 0) { mesh.rotation.z = 0; mesh.position.y = 0; }
            this.characterFactory.animateByState(mesh, npcState, npcMood, time, true, 'standing');
          }
        }
      }
    }

    // --- Remote players ---
    if (remotePlayers && remotePlayers.length > 0) {
      const activeRemoteIds = new Set();
      const isOutdoor = this._currentScene === 'outdoor';
      for (const rp of remotePlayers) {
        activeRemoteIds.add(rp.id);
        let mesh = this.remotePlayerMeshes.get(rp.id);
        if (!mesh) {
          mesh = this.characterFactory.createCharacter(rp.species || 'human_a', rp.color, false);
          mesh.position.set(rp.x, 0, rp.y);
          this.scene.add(mesh);
          this.remotePlayerMeshes.set(rp.id, mesh);
        }
        const prevRX = mesh.position.x;
        const prevRZ = mesh.position.z;
        mesh.position.set(rp.x, 0, rp.y);
        mesh.visible = isOutdoor;

        if (isOutdoor) {
          const rdx = rp.x - prevRX;
          const rdy = rp.y - prevRZ;
          const rpMoving = Math.abs(rdx) > 0.005 || Math.abs(rdy) > 0.005;
          if (rpMoving) {
            mesh.rotation.y = Math.atan2(rdx, rdy);
            this.characterFactory.animateByState(mesh, 'moving', 'neutral', time, true, 'standing');
          } else {
            this.characterFactory.animateByState(mesh, 'idle', 'neutral', time, false, 'standing');
          }
        }
      }
      // Remove meshes for disconnected remote players
      for (const [id, mesh] of this.remotePlayerMeshes) {
        if (!activeRemoteIds.has(id)) {
          this.scene.remove(mesh);
          this.remotePlayerMeshes.delete(id);
        }
      }
    } else if (this.remotePlayerMeshes.size > 0) {
      // All remote players gone — cleanup
      for (const [, mesh] of this.remotePlayerMeshes) {
        this.scene.remove(mesh);
      }
      this.remotePlayerMeshes.clear();
    }

    // --- Animal AI ---
    if (this._animals) {
      const now = performance.now() / 1000;
      for (const a of this._animals) {
        if (now > a.waitUntil) {
          // Pick new random target within 4 units of current position
          a.targetX = a.x + (Math.random() - 0.5) * 8;
          a.targetY = a.y + (Math.random() - 0.5) * 8;
          // Clamp to map (simple bounds)
          a.targetX = Math.max(5, Math.min(55, a.targetX));
          a.targetY = Math.max(5, Math.min(55, a.targetY));
          a.waitUntil = Infinity; // moving until arrival
        }
        const dx = a.targetX - a.x;
        const dy = a.targetY - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0.05) {
          const step = Math.min(a.speed * dt, dist);
          a.x += (dx / dist) * step;
          a.y += (dy / dist) * step;
          a.mesh.rotation.y = Math.atan2(dx, dy);
          // Waddle animation
          if (a.mesh.userData.body) {
            a.mesh.userData.body.rotation.z = Math.sin(time * 10) * 0.05;
          }
        } else {
          // Arrived — wait 2-5 seconds
          a.waitUntil = now + 2 + Math.random() * 3;
          if (a.mesh.userData.body) {
            a.mesh.userData.body.rotation.z = 0;
          }
        }
        a.mesh.position.set(a.x, 0, a.y);
      }
    }

    // --- Building smoke/steam ---
    if (this._smokeSystems) {
      const hour = (world.totalMinutes / 60) % 24;
      for (const sys of this._smokeSystems) {
        // Visibility rules
        let visible = false;
        if (sys.tag === 'cafe') visible = hour >= 8 && hour < 20;
        else if (sys.tag === 'bakery') visible = hour >= 6 && hour < 18;
        else if (sys.tag === 'house') visible = hour >= 20 || hour < 6;
        sys.points.visible = visible;

        if (!visible) continue;

        const posAttr = sys.points.geometry.getAttribute('position');
        for (let i = 0; i < posAttr.count; i++) {
          let py = posAttr.getY(i);
          py += 0.5 * dt;
          // Wobble on x/z
          const px = posAttr.getX(i) + Math.sin(time * 2 + i) * 0.01;
          const pz = posAttr.getZ(i) + Math.cos(time * 2 + i * 0.7) * 0.01;
          if (py > 2.5) {
            // Reset particle
            posAttr.setXYZ(i, (Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3);
          } else {
            posAttr.setXYZ(i, px, py, pz);
          }
        }
        posAttr.needsUpdate = true;
      }
    }

    // --- NPC emoji status indicators ---
    if (npcs) {
      for (const npc of npcs) {
        const mesh = this.entityMeshes.get(npc.id);
        if (!mesh) continue;

        // Determine emoji
        let emoji = '';
        const npcScene = npc.currentScene || 'outdoor';
        if (npc.state === 'chatting') {
          emoji = '\u{1F4AC}'; // 💬
        } else if (npcScene === 'cafe') {
          emoji = '\u2615'; // ☕
        } else if (npcScene === 'library') {
          emoji = '\u{1F4D6}'; // 📖
        } else if (npcScene === 'office' || npcScene === 'ksa_main') {
          emoji = '\u{1F4BC}'; // 💼
        } else {
          const npcMood = (npc.moodUntil > performance.now()) ? npc.mood : 'neutral';
          if (npcMood === 'happy') emoji = '\u{1F60A}'; // 😊
          else if (npcMood === 'sad') emoji = '\u{1F622}'; // 😢
        }

        // Update sprite
        const prevEmoji = mesh.userData._lastEmoji || '';
        if (emoji !== prevEmoji) {
          mesh.userData._lastEmoji = emoji;
          if (!emoji) {
            // Hide existing sprite
            if (mesh.userData._emojiSprite) mesh.userData._emojiSprite.visible = false;
          } else {
            let sprite = mesh.userData._emojiSprite;
            if (!sprite) {
              const canvas = document.createElement('canvas');
              canvas.width = 64;
              canvas.height = 64;
              const tex = new THREE.CanvasTexture(canvas);
              tex.minFilter = THREE.LinearFilter;
              const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
              sprite = new THREE.Sprite(mat);
              sprite.scale.set(0.4, 0.4, 1);
              sprite.position.set(0, 2.1, 0);
              mesh.add(sprite);
              mesh.userData._emojiSprite = sprite;
              mesh.userData._emojiCanvas = canvas;
            }
            sprite.visible = true;
            const ctx = mesh.userData._emojiCanvas.getContext('2d');
            ctx.clearRect(0, 0, 64, 64);
            ctx.font = '48px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(emoji, 32, 32);
            sprite.material.map.needsUpdate = true;
          }
        }
        // Hide emoji when speech bubble is active for this NPC
        const hasBubble = speechBubbles && speechBubbles.some(b => b.id === npc.id && b.until > performance.now());
        if (mesh.userData._emojiSprite) {
          mesh.userData._emojiSprite.visible = mesh.visible && !!emoji && !hasBubble;
        }
      }
    }

    // --- Camera follow ---
    this.cameraRig.setZoom(world.zoom || 3.2);
    // cameraFollowTarget: 인트로 등에서 카메라가 플레이어 대신 다른 위치를 따라가게
    const camTarget = this._cameraFollowTarget || player;
    this.cameraRig.follow(camTarget.x, camTarget.y, dt);

    // --- Lighting update ---
    const hour = (world.totalMinutes / 60) % 24;
    const weatherType = (weather && weather.current) || world.weather || 'clear';
    this.lighting.update(hour, weatherType);

    const isNight = hour >= 20 || hour < 5;
    this.lighting.updateLamps(this.lampLights, isNight);

    // --- Prop animations (tree sway, lamp glow, fountain particles) ---
    this.propFactory.updateAnimations(time, isNight);

    // --- Building window glow at night ---
    this._updateWindowGlow(isNight);

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
          } else if (typeof b.id === 'string' && b.id.startsWith('remote_')) {
            // Remote player speech bubble
            const rpMesh = this.remotePlayerMeshes.get(b.id.slice(7));
            if (!rpMesh || !rpMesh.visible) continue;
            bx = rpMesh.position.x; by = rpMesh.position.z;
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

    // --- HTML labels for NPC names and building labels ---
    const cam = this.cameraRig.getActive();
    const curScene = this._currentScene || 'outdoor';
    if (npcs) {
      const npcLabelData = npcs
        .filter(n => (n.currentScene || 'outdoor') === curScene)
        .map(n => ({ id: n.id, name: n.name, x: n.x, y: n.y, visible: true, isDocent: !!(this._npcPersonas && this._npcPersonas[n.id] && this._npcPersonas[n.id].isDocent) }));
      // Player label
      npcLabelData.push({ id: '_player_', name: player.name, x: player.x, y: player.y, visible: true });
      // Remote player labels
      if (remotePlayers && curScene === 'outdoor') {
        for (const rp of remotePlayers) {
          npcLabelData.push({ id: 'rp_' + rp.id, name: (rp.flag ? rp.flag + ' ' : '') + rp.name, x: rp.x, y: rp.y, visible: true, isRemotePlayer: true });
        }
      }
      this.labelOverlay.updateNpcLabels(npcLabelData, cam, this._translateFn);
    }
    this.labelOverlay.updateBuildingLabels(buildings, cam, curScene, this._translateFn);
  }

  _updateWindowGlow(isNight) {
    if (!this._windowNightState) this._windowNightState = null;
    if (this._windowNightState === isNight) return; // no change
    this._windowNightState = isNight;

    for (const bg of this.buildingGroups) {
      const wins = bg.userData.windows;
      if (!wins) continue;
      for (const w of wins) {
        if (isNight) {
          w.material.color.setHex(0xffdd88);
          w.material.opacity = 0.8;
        } else {
          w.material.color.setHex(0xc8e6ff);
          w.material.opacity = 0.75;
        }
      }
    }
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
    this.labelOverlay.dispose();
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
    this.remotePlayerMeshes.clear();
  }
}
