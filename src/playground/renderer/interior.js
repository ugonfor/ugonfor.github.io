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
  // cafe
  espresso_machine: '#606060',
  menu_board: '#4a3520',
  window_seat: '#b89060',
  hanging_plant: '#5a9a3a',
  painting: '#c8a870',
  // office
  filing_cabinet: '#808890',
  printer: '#909090',
  clock: '#d0c8b0',
  coat_rack: '#8b6914',
  // market
  sign_board: '#c0a060',
  basket_display: '#c8a060',
  freezer: '#c0d0e0',
  scale: '#a0a0a0',
  // school
  projector: '#707070',
  trophy_case: '#c8a040',
  notice_board: '#b09878',
  lab_equipment: '#8090a0',
  university_banner: '#8B0029',
  // dorm
  study_lamp: '#e0d060',
  mini_fridge: '#a0b0c0',
  shoe_rack: '#9e8060',
  poster: '#d0a0b0',
  // bakery
  cake_display: '#d4a0a0',
  mixer: '#b0b0b0',
  bread_rack: '#a08060',
  rolling_pin_rack: '#c0a080',
  apron_hook: '#808080',
  // florist
  seed_display: '#90b070',
  watering_can: '#70a090',
  ribbon_rack: '#d0a0c0',
  hanging_basket: '#5a9a3a',
  // library
  study_carrel: '#9e8060',
  globe: '#5080b0',
  newspaper_rack: '#a08060',
  ladder: '#b89060',
  // houses
  floor_cushion: '#c06040',
  kitchen_island: '#a09070',
  spice_rack: '#b08050',
  herb_garden: '#5aaa3a',
  gaming_chair: '#4060c0',
  led_strip: '#a040ff',
  // krafton
  standing_desk: '#9e8060',
  neon_sign: '#ff40a0',
  bean_bag: '#7090b0',
  // kaist
  lab_bench: '#808890',
  computer_cluster: '#505060',
  paper_wall: '#e0d8c8',
  coffee_machine: '#606060',
  // hospital
  exam_bed: '#e0e0f0',
  curtain_divider: '#d0d8e0',
  medicine_cabinet: '#e0e0e8',
  sink: '#c0d0e0',
  // police
  evidence_board: '#8b6914',
  radio_equipment: '#606060',
  holding_area: '#b0b0b8',
  // gym
  treadmill: '#505050',
  weight_rack: '#707070',
  bench_press: '#606060',
  mirror_wall: '#d0e0f0',
  water_fountain: '#a0c0e0',
  bench: '#b89060',
  // convenience
  magazine_rack: '#a08060',
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
    const HEIGHTS = {
      // tall (1.5)
      bookshelf: 1.5, shelf: 1.5, fridge: 1.5, vending_machine: 1.5,
      filing_cabinet: 1.5, medicine_cabinet: 1.5, trophy_case: 1.5,
      coat_rack: 1.5, weight_rack: 1.5, bread_rack: 1.5,
      curtain_divider: 1.5, holding_area: 1.5, freezer: 1.5,
      // wall-mounted (1.2)
      blackboard: 1.2, whiteboard: 1.2, mirror_wall: 1.2,
      evidence_board: 1.2, notice_board: 1.2, menu_board: 1.2,
      university_banner: 1.2, paper_wall: 1.2, poster: 1.0,
      // medium-tall (1.0)
      treadmill: 1.0, computer_cluster: 1.0, radio_equipment: 1.0,
      ladder: 1.0, neon_sign: 0.3,
      // beds (0.8)
      bed: 0.8, bunk_bed: 0.8, exam_bed: 0.8, bench_press: 0.7,
      // seating (0.4)
      chair: 0.4, stool: 0.4, armchair: 0.4, gaming_chair: 0.5,
      bean_bag: 0.35, floor_cushion: 0.15, bench: 0.4,
      window_seat: 0.4,
      // low items (0.5)
      plant_pot: 0.5, hanging_plant: 0.3, hanging_basket: 0.3,
      herb_garden: 0.4, watering_can: 0.3, globe: 0.5,
      // flat
      rug: 0.02, led_strip: 0.05,
      // small items
      hanging_pots: 0.15, flour_sack: 0.4, espresso_machine: 0.4,
      mixer: 0.4, scale: 0.3, rolling_pin_rack: 0.3, apron_hook: 0.2,
      ribbon_rack: 0.5, seed_display: 0.6, shoe_rack: 0.5,
      study_lamp: 0.5, mini_fridge: 0.7, magazine_rack: 0.8,
      newspaper_rack: 0.8, basket_display: 0.5, cake_display: 0.8,
      sign_board: 1.0, spice_rack: 0.8, printer: 0.5,
      clock: 0.3, projector: 0.25, coffee_machine: 0.6,
      sink: 0.6, water_fountain: 0.9, standing_desk: 0.8,
      lab_bench: 0.7, lab_equipment: 0.7, study_carrel: 0.8,
      kitchen_island: 0.6,
    };
    let height = HEIGHTS[fDef.type] ?? 0.6;

    const geo = new THREE.BoxGeometry(fw, height, fh);
    const mesh = new THREE.Mesh(geo, toon(color));
    mesh.position.set(fDef.x, height / 2, fDef.y);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { type: 'furniture', furnitureType: fDef.type };

    // Special: flat items on ground
    if (fDef.type === 'rug' || fDef.type === 'led_strip') {
      mesh.position.y = 0.01;
    }
    // Special: hanging items up high
    if (fDef.type === 'hanging_pots' || fDef.type === 'hanging_plant'
        || fDef.type === 'hanging_basket') {
      mesh.position.y = 2.3;
    }
    // Wall-mounted items
    if (fDef.type === 'painting' || fDef.type === 'poster'
        || fDef.type === 'clock' || fDef.type === 'projector'
        || fDef.type === 'neon_sign' || fDef.type === 'apron_hook') {
      mesh.position.y = 1.8;
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
