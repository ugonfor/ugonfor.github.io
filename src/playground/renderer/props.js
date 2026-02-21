import * as THREE from 'three';

/**
 * Factory for 3D prop meshes: trees, bushes, flowers, fences, lamps, benches,
 * rocks, signposts, fountains, questboards.
 */
export class PropFactory {
  constructor() {
    // Shared 3-step gradient map for MeshToonMaterial
    const gradientData = new Uint8Array([60, 130, 255]);
    this.gradientMap = new THREE.DataTexture(gradientData, 3, 1, THREE.RedFormat);
    this.gradientMap.minFilter = THREE.NearestFilter;
    this.gradientMap.magFilter = THREE.NearestFilter;
    this.gradientMap.needsUpdate = true;
  }

  _toon(color) {
    return new THREE.MeshToonMaterial({ color, gradientMap: this.gradientMap });
  }

  /**
   * @param {string} type - Prop type name
   * @param {number} worldX - Game X coord
   * @param {number} worldY - Game Y coord (maps to three.z)
   * @returns {THREE.Group}
   */
  createProp(type, worldX, worldY) {
    const group = new THREE.Group();
    group.userData = { type: 'prop', propType: type };
    group.position.set(worldX, 0, worldY);

    switch (type) {
      case 'tree': this._tree(group); break;
      case 'bush': this._bush(group); break;
      case 'flower': this._flower(group, worldX, worldY); break;
      case 'fence': this._fence(group); break;
      case 'lamp': this._lamp(group); break;
      case 'bench': this._bench(group); break;
      case 'rock': this._rock(group); break;
      case 'signpost': this._signpost(group); break;
      case 'fountain': this._fountain(group); break;
      case 'questboard': this._questboard(group); break;
    }

    return group;
  }

  _tree(g) {
    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.2, 6);
    const trunk = new THREE.Mesh(trunkGeo, this._toon('#8B5E3C'));
    trunk.position.y = 0.6;
    trunk.castShadow = true;
    g.add(trunk);

    // 3 canopy spheres at different heights
    const greens = [0x4a8c3f, 0x5a9e4f, 0x3d7a35];
    const radii = [0.7, 0.55, 0.5];
    const heights = [1.5, 1.9, 1.6];
    const offsets = [
      [0, 0], [0.2, 0.15], [-0.15, -0.2]
    ];
    for (let i = 0; i < 3; i++) {
      const canopyGeo = new THREE.IcosahedronGeometry(radii[i], 1);
      const canopy = new THREE.Mesh(canopyGeo, this._toon(greens[i]));
      canopy.position.set(offsets[i][0], heights[i], offsets[i][1]);
      canopy.castShadow = true;
      g.add(canopy);
    }
  }

  _bush(g) {
    const colors = [0x5a9e4f, 0x4a8c3f, 0x6aae5f];
    const count = 2 + Math.floor(Math.random() * 2); // 2 or 3
    for (let i = 0; i < count; i++) {
      const r = 0.3 + Math.random() * 0.1;
      const geo = new THREE.SphereGeometry(r, 6, 5);
      const mesh = new THREE.Mesh(geo, this._toon(colors[i % colors.length]));
      mesh.position.set(
        (Math.random() - 0.5) * 0.3,
        r * 0.8,
        (Math.random() - 0.5) * 0.3
      );
      mesh.castShadow = true;
      g.add(mesh);
    }
  }

  _flower(g, wx, wy) {
    // Stem
    const stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.35, 4);
    const stem = new THREE.Mesh(stemGeo, this._toon('#4a8c3f'));
    stem.position.y = 0.175;
    g.add(stem);

    // Petals
    const isPink = Math.round(wx + wy) % 2 === 0;
    const petalColor = isPink ? 0xff95b7 : 0xffd96f;
    const petalGeo = new THREE.SphereGeometry(0.08, 5, 4);
    const petal = new THREE.Mesh(petalGeo, this._toon(petalColor));
    petal.position.y = 0.38;
    g.add(petal);

    // Second petal ring
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Mesh(petalGeo, this._toon(petalColor));
      const angle = (i / 4) * Math.PI * 2;
      p.position.set(Math.cos(angle) * 0.06, 0.36, Math.sin(angle) * 0.06);
      g.add(p);
    }
  }

  _fence(g) {
    const slatMat = this._toon('#d8a569');
    // 3 vertical slats
    for (let i = -1; i <= 1; i++) {
      const slat = new THREE.BoxGeometry(0.06, 0.6, 0.04);
      const mesh = new THREE.Mesh(slat, slatMat);
      mesh.position.set(i * 0.25, 0.3, 0);
      mesh.castShadow = true;
      g.add(mesh);
    }
    // Horizontal rail
    const rail = new THREE.BoxGeometry(0.7, 0.05, 0.04);
    const railMesh = new THREE.Mesh(rail, slatMat);
    railMesh.position.y = 0.45;
    g.add(railMesh);

    const railBottom = new THREE.Mesh(rail, slatMat);
    railBottom.position.y = 0.15;
    g.add(railBottom);
  }

  _lamp(g) {
    // Pole
    const poleGeo = new THREE.CylinderGeometry(0.04, 0.06, 2.0, 6);
    const pole = new THREE.Mesh(poleGeo, this._toon('#888888'));
    pole.position.y = 1.0;
    pole.castShadow = true;
    g.add(pole);

    // Head (housing)
    const headGeo = new THREE.BoxGeometry(0.25, 0.15, 0.25);
    const headMat = this._toon('#ffdd66');
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.1;
    head.castShadow = true;
    g.add(head);

    // PointLight (warm, off by default)
    const light = new THREE.PointLight(0xffcc66, 0, 6, 2);
    light.position.y = 2.0;
    g.add(light);
    g.userData.lampLight = light;
  }

  _bench(g) {
    const woodMat = this._toon('#8B6B4F');

    // Seat
    const seatGeo = new THREE.BoxGeometry(0.8, 0.06, 0.3);
    const seat = new THREE.Mesh(seatGeo, woodMat);
    seat.position.y = 0.35;
    seat.castShadow = true;
    g.add(seat);

    // Back
    const backGeo = new THREE.BoxGeometry(0.8, 0.35, 0.04);
    const back = new THREE.Mesh(backGeo, woodMat);
    back.position.set(0, 0.52, -0.13);
    back.castShadow = true;
    g.add(back);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.05, 0.35, 0.25);
    for (const xOff of [-0.35, 0.35]) {
      const leg = new THREE.Mesh(legGeo, woodMat);
      leg.position.set(xOff, 0.175, 0);
      g.add(leg);
    }
  }

  _rock(g) {
    const detail = 1;
    const geo = new THREE.DodecahedronGeometry(0.35, detail);
    // Randomize vertices slightly for organic look
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * 0.08);
      pos.setY(i, pos.getY(i) + (Math.random() - 0.5) * 0.08);
      pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * 0.08);
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, this._toon('#999999'));
    mesh.position.y = 0.2;
    mesh.castShadow = true;
    g.add(mesh);
  }

  _signpost(g) {
    // Pole
    const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.4, 5);
    const pole = new THREE.Mesh(poleGeo, this._toon('#8B6B4F'));
    pole.position.y = 0.7;
    pole.castShadow = true;
    g.add(pole);

    // Sign plate
    const plateGeo = new THREE.BoxGeometry(0.6, 0.3, 0.04);
    const plate = new THREE.Mesh(plateGeo, this._toon('#c0965a'));
    plate.position.set(0, 1.3, 0);
    plate.castShadow = true;
    g.add(plate);
  }

  _fountain(g) {
    // Base basin
    const baseGeo = new THREE.CylinderGeometry(0.7, 0.8, 0.4, 12);
    const baseMat = this._toon('#aaaaaa');
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.2;
    base.castShadow = true;
    g.add(base);

    // Water surface inside basin
    const waterGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.05, 12);
    const waterMat = new THREE.MeshLambertMaterial({
      color: 0x5fb8e8,
      transparent: true,
      opacity: 0.7,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.y = 0.38;
    g.add(water);

    // Center pillar
    const pillarGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.8, 8);
    const pillar = new THREE.Mesh(pillarGeo, baseMat);
    pillar.position.y = 0.6;
    pillar.castShadow = true;
    g.add(pillar);

    // Top torus ring
    const torusGeo = new THREE.TorusGeometry(0.15, 0.04, 8, 12);
    const torus = new THREE.Mesh(torusGeo, baseMat);
    torus.position.y = 1.0;
    torus.rotation.x = Math.PI / 2;
    g.add(torus);
  }

  _questboard(g) {
    const woodMat = this._toon('#8B6B4F');

    // Two poles
    for (const xOff of [-0.25, 0.25]) {
      const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.3, 5);
      const pole = new THREE.Mesh(poleGeo, woodMat);
      pole.position.set(xOff, 0.65, 0);
      pole.castShadow = true;
      g.add(pole);
    }

    // Board
    const boardGeo = new THREE.BoxGeometry(0.65, 0.5, 0.04);
    const board = new THREE.Mesh(boardGeo, woodMat);
    board.position.set(0, 1.1, 0);
    board.castShadow = true;
    g.add(board);

    // Small colored "notice" squares on the board
    const noticeColors = [0xff6b6b, 0x6bff6b, 0x6b6bff, 0xffff6b];
    for (let i = 0; i < noticeColors.length; i++) {
      const nGeo = new THREE.BoxGeometry(0.08, 0.08, 0.005);
      const n = new THREE.Mesh(nGeo, this._toon(noticeColors[i]));
      const col = i % 2;
      const row = Math.floor(i / 2);
      n.position.set(-0.12 + col * 0.24, 1.15 - row * 0.15, 0.025);
      g.add(n);
    }
  }
}
