import * as THREE from 'three';
import { interiorDefs } from '../core/constants.js';

/**
 * Interior room renderer: creates rooms from interiorDefs on demand.
 * Manages showing/hiding outdoor vs indoor scene groups.
 */

// Furniture type -> color mapping
const FURNITURE_COLORS = {
  counter: '#8b6914',
  checkout_counter: '#8b6914',
  table: '#b8845a',
  table_round: '#b8845a',
  dining_table: '#b8845a',
  coffee_table: '#b8845a',
  reading_table: '#b8845a',
  shared_table: '#b8845a',
  work_table: '#b8845a',
  student_desk: '#9e8060',
  desk: '#9e8060',
  desk_with_monitor: '#9e8060',
  shelf: '#a08060',
  display_case: '#a08060',
  flower_display: '#c898b0',
  bookshelf: '#6b4e32',
  bed: '#c0a080',
  bunk_bed: '#c0a080',
  sofa: '#7090b0',
  chair: '#b89060',
  armchair: '#7090b0',
  stool: '#b89060',
  oven: '#808080',
  stove: '#808080',
  fridge: '#b0b0b0',
  vending_machine: '#6080a0',
  podium: '#9e8060',
  blackboard: '#3a5a3a',
  whiteboard: '#e8e8e8',
  water_cooler: '#a0c0e0',
  workbench: '#9e8060',
  plant_pot: '#7aaa5a',
  rug: '#c0a0a0',
  fireplace: '#8b4513',
  kitchen_counter: '#a09070',
  hanging_pots: '#808080',
  flour_sack: '#d4c8a0',
  // fallback handled in code
};

export class InteriorRenderer {
  constructor(scene) {
    this._scene = scene;
    this.currentRoom = null;
    this.roomGroup = null;
    this._outdoorGroups = []; // refs to hide/show
  }

  /**
   * Register outdoor groups so we can toggle visibility.
   */
  setOutdoorGroups(groups) {
    this._outdoorGroups = groups;
  }

  /**
   * Build and show an interior room.
   * @param {string} buildingId
   * @returns {{ spawnPoint: {x,y}, width: number, height: number }} room info
   */
  enterRoom(buildingId) {
    const def = interiorDefs[buildingId];
    if (!def) return null;

    // Clean up previous room if any
    this.exitRoom();

    this.currentRoom = buildingId;
    this.roomGroup = new THREE.Group();
    this.roomGroup.userData = { type: 'interior', id: buildingId };

    const w = def.width;
    const h = def.height;

    // Shared gradient map
    const gradientData = new Uint8Array([60, 130, 255]);
    const gradientMap = new THREE.DataTexture(gradientData, 3, 1, THREE.RedFormat);
    gradientMap.minFilter = THREE.NearestFilter;
    gradientMap.magFilter = THREE.NearestFilter;
    gradientMap.needsUpdate = true;

    const toon = (color) => new THREE.MeshToonMaterial({ color, gradientMap });

    // --- Floor ---
    const floorGeo = new THREE.PlaneGeometry(w, h);
    floorGeo.rotateX(-Math.PI / 2);
    const floor = new THREE.Mesh(floorGeo, toon(def.floorColor));
    floor.position.set(w / 2, 0, h / 2);
    floor.receiveShadow = true;
    this.roomGroup.add(floor);

    // --- Walls (north and west for visibility in isometric) ---
    // North wall (-z face)
    const northGeo = new THREE.PlaneGeometry(w, 3);
    const northWall = new THREE.Mesh(northGeo, toon(def.wallColor));
    northWall.position.set(w / 2, 1.5, 0);
    northWall.receiveShadow = true;
    this.roomGroup.add(northWall);

    // West wall (-x face)
    const westGeo = new THREE.PlaneGeometry(h, 3);
    const westWall = new THREE.Mesh(westGeo, toon(def.wallColor));
    westWall.rotation.y = Math.PI / 2;
    westWall.position.set(0, 1.5, h / 2);
    westWall.receiveShadow = true;
    this.roomGroup.add(westWall);

    // --- Furniture ---
    if (def.furniture) {
      for (const f of def.furniture) {
        const fGroup = this._createFurniture(f, toon, gradientMap);
        if (fGroup) this.roomGroup.add(fGroup);
      }
    }

    // --- Interior point light (warm) ---
    const roomLight = new THREE.PointLight(0xffe8cc, 1.0, w * 2, 1.5);
    roomLight.position.set(w / 2, 2.5, h / 2);
    this.roomGroup.add(roomLight);

    // --- Exit mat indicator ---
    if (def.exitPoint) {
      const matGeo = new THREE.PlaneGeometry(0.8, 0.4);
      matGeo.rotateX(-Math.PI / 2);
      const matMesh = new THREE.Mesh(matGeo, new THREE.MeshBasicMaterial({
        color: 0xcc4444,
        transparent: true,
        opacity: 0.5,
      }));
      matMesh.position.set(def.exitPoint.x, 0.02, def.exitPoint.y);
      matMesh.userData = { type: 'exitMat' };
      this.roomGroup.add(matMesh);
    }

    this._scene.add(this.roomGroup);

    // Hide outdoor groups
    for (const g of this._outdoorGroups) {
      g.visible = false;
    }

    return {
      spawnPoint: def.spawnPoint,
      width: w,
      height: h,
    };
  }

  _createFurniture(fDef, toon, gradientMap) {
    const fw = fDef.w || 0.8;
    const fh = fDef.h || 0.8;
    const color = FURNITURE_COLORS[fDef.type] || '#a09080';

    // Height based on type
    let height = 0.6;
    if (fDef.type === 'bookshelf' || fDef.type === 'shelf' || fDef.type === 'fridge'
        || fDef.type === 'vending_machine') {
      height = 1.5;
    } else if (fDef.type === 'blackboard' || fDef.type === 'whiteboard') {
      height = 1.2;
    } else if (fDef.type === 'bed' || fDef.type === 'bunk_bed') {
      height = 0.8;
    } else if (fDef.type === 'chair' || fDef.type === 'stool' || fDef.type === 'armchair') {
      height = 0.4;
    } else if (fDef.type === 'plant_pot') {
      height = 0.5;
    } else if (fDef.type === 'rug') {
      height = 0.02;
    } else if (fDef.type === 'hanging_pots') {
      height = 0.15;
    } else if (fDef.type === 'flour_sack') {
      height = 0.4;
    }

    const geo = new THREE.BoxGeometry(fw, height, fh);
    const mesh = new THREE.Mesh(geo, toon(color));
    mesh.position.set(fDef.x, height / 2, fDef.y);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { type: 'furniture', furnitureType: fDef.type };

    // Special: rug is flat on ground
    if (fDef.type === 'rug') {
      mesh.position.y = 0.01;
    }
    // Special: hanging_pots are up high
    if (fDef.type === 'hanging_pots') {
      mesh.position.y = 2.3;
    }

    return mesh;
  }

  /**
   * Remove current interior and restore outdoor.
   */
  exitRoom() {
    if (this.roomGroup) {
      this._scene.remove(this.roomGroup);
      // Dispose geometries and materials
      this.roomGroup.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          if (child.material.dispose) child.material.dispose();
        }
      });
      this.roomGroup = null;
    }
    this.currentRoom = null;

    // Show outdoor groups
    for (const g of this._outdoorGroups) {
      g.visible = true;
    }
  }

  isActive() {
    return this.currentRoom !== null;
  }
}
