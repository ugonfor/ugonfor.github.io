import * as THREE from 'three';

/**
 * Factory for 3D building groups with toon-shaded materials.
 * Crossy Road style low-poly buildings.
 */
export class BuildingFactory {
  constructor() {
    // Shared 3-step gradient map for MeshToonMaterial
    const gradientData = new Uint8Array([60, 130, 255]);
    this.gradientMap = new THREE.DataTexture(gradientData, 3, 1, THREE.RedFormat);
    this.gradientMap.minFilter = THREE.NearestFilter;
    this.gradientMap.magFilter = THREE.NearestFilter;
    this.gradientMap.needsUpdate = true;
  }

  _toonMat(color) {
    return new THREE.MeshToonMaterial({
      color,
      gradientMap: this.gradientMap,
    });
  }

  /**
   * @param {object} bDef - Building definition from constants.
   *   { id, x, y, w, h, z, color, roof, label }
   *   w = width (x-axis), h = depth (z-axis in game y), z = height (three.y)
   * @returns {THREE.Group}
   */
  createBuilding(bDef) {
    const group = new THREE.Group();
    group.userData = { type: 'building', id: bDef.id };

    const bodyW = bDef.w;
    // Height multipliers for distinctive buildings
    const heightScale = bDef.id === 'korea_univ' ? 1.3
                      : bDef.id === 'kaist_ai'   ? 1.15
                      : 1.0;
    const bodyH = bDef.z * heightScale; // building height -> three.y
    const bodyD = bDef.h; // building depth -> three.z

    // --- Body ---
    const bodyGeo = new THREE.BoxGeometry(bodyW, bodyH, bodyD);
    const bodyMesh = new THREE.Mesh(bodyGeo, this._toonMat(bDef.color));
    bodyMesh.position.set(0, bodyH / 2, 0);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    // --- Roof ---
    this._addRoof(group, bDef, bodyW, bodyH, bodyD);

    // --- Windows ---
    this._addWindows(group, bodyW, bodyH, bodyD, bDef.color);

    // --- Door ---
    this._addDoor(group, bodyW, bodyD);

    // --- Label sprite ---
    this._addLabel(group, bDef.label, bodyH);

    // --- Building-specific decorations ---
    this._addDecorations(group, bDef, bodyW, bodyH, bodyD);

    // Position in world: game(x,y) -> three(x, 0, y)
    group.position.set(
      bDef.x + bodyW / 2,
      0,
      bDef.y + bodyD / 2
    );

    return group;
  }

  _addRoof(group, bDef, w, h, d) {
    const id = bDef.id;
    const roofColor = bDef.roof;

    if (id === 'houseA' || id === 'houseB' || id === 'houseC') {
      // Gable roof: triangular prism
      this._gableRoof(group, w, h, d, roofColor);
    } else if (id === 'ksa_main' || id === 'ksa_dorm' || id === 'kaist_ai') {
      // Flat roof with parapet
      this._flatRoof(group, w, h, d, roofColor);
    } else if (id === 'market') {
      // Hip roof (4-sided cone)
      this._hipRoof(group, w, h, d, '#c0392b');
    } else if (id === 'library' || id === 'korea_univ') {
      // Pediment (classical triangle)
      this._pedimentRoof(group, w, h, d, roofColor);
    } else if (id === 'cafe' || id === 'bakery' || id === 'florist' || id === 'restaurant') {
      // Mansard: two-tier
      this._mansardRoof(group, w, h, d, roofColor);
    } else if (id === 'office' || id === 'krafton_ai' || id === 'gym') {
      // Modern flat with accent stripe
      this._modernRoof(group, w, h, d, roofColor);
    } else if (id === 'hospital') {
      // White flat roof
      this._flatRoof(group, w, h, d, roofColor);
    } else if (id === 'convenience') {
      // Flat roof with green accent
      this._modernRoof(group, w, h, d, roofColor);
    } else if (id === 'police') {
      // Flat roof
      this._flatRoof(group, w, h, d, roofColor);
    } else {
      // Default flat
      this._flatRoof(group, w, h, d, roofColor);
    }
  }

  _gableRoof(group, w, h, d, color) {
    const ridgeH = w * 0.35;
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0);
    shape.lineTo(w / 2, 0);
    shape.lineTo(0, ridgeH);
    shape.closePath();

    const extrudeSettings = { depth: d, bevelEnabled: false };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const mesh = new THREE.Mesh(geo, this._toonMat(color));
    mesh.rotation.y = Math.PI / 2;
    mesh.position.set(-d / 2, h, 0);
    mesh.castShadow = true;
    group.add(mesh);
  }

  _flatRoof(group, w, h, d, color) {
    const parapetH = 0.15;
    const overhang = 0.1;
    const geo = new THREE.BoxGeometry(w + overhang * 2, parapetH, d + overhang * 2);
    const mesh = new THREE.Mesh(geo, this._toonMat(color));
    mesh.position.set(0, h + parapetH / 2, 0);
    mesh.castShadow = true;
    group.add(mesh);
  }

  _hipRoof(group, w, h, d, color) {
    const roofH = Math.min(w, d) * 0.4;
    const radius = Math.max(w, d) * 0.72;
    const geo = new THREE.ConeGeometry(radius, roofH, 4);
    const mesh = new THREE.Mesh(geo, this._toonMat(color));
    mesh.position.set(0, h + roofH / 2, 0);
    mesh.rotation.y = Math.PI / 4;
    mesh.castShadow = true;
    group.add(mesh);
  }

  _pedimentRoof(group, w, h, d, color) {
    const ridgeH = w * 0.3;
    // Front pediment triangle
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0);
    shape.lineTo(w / 2, 0);
    shape.lineTo(0, ridgeH);
    shape.closePath();

    const extrudeSettings = { depth: d, bevelEnabled: false };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const mesh = new THREE.Mesh(geo, this._toonMat(color));
    mesh.rotation.y = Math.PI / 2;
    mesh.position.set(-d / 2, h, 0);
    mesh.castShadow = true;
    group.add(mesh);

    // Pediment accent: thin ledge at roofline
    const ledgeGeo = new THREE.BoxGeometry(w + 0.2, 0.08, d + 0.1);
    const ledge = new THREE.Mesh(ledgeGeo, this._toonMat('#e0d0c0'));
    ledge.position.set(0, h, 0);
    group.add(ledge);
  }

  _mansardRoof(group, w, h, d, color) {
    // Lower tier: wider box
    const lowerH = 0.3;
    const lowerGeo = new THREE.BoxGeometry(w + 0.15, lowerH, d + 0.15);
    const lower = new THREE.Mesh(lowerGeo, this._toonMat(color));
    lower.position.set(0, h + lowerH / 2, 0);
    lower.castShadow = true;
    group.add(lower);

    // Upper tier: smaller cone/pyramid
    const upperH = w * 0.25;
    const radius = Math.max(w, d) * 0.55;
    const upperGeo = new THREE.ConeGeometry(radius, upperH, 4);
    const upper = new THREE.Mesh(upperGeo, this._toonMat(color));
    upper.position.set(0, h + lowerH + upperH / 2, 0);
    upper.rotation.y = Math.PI / 4;
    upper.castShadow = true;
    group.add(upper);
  }

  _modernRoof(group, w, h, d, color) {
    // Flat slab
    const slabH = 0.12;
    const slabGeo = new THREE.BoxGeometry(w + 0.2, slabH, d + 0.2);
    const slab = new THREE.Mesh(slabGeo, this._toonMat(color));
    slab.position.set(0, h + slabH / 2, 0);
    slab.castShadow = true;
    group.add(slab);

    // Accent stripe near top of building
    const stripeGeo = new THREE.BoxGeometry(w + 0.02, 0.1, d + 0.02);
    const stripe = new THREE.Mesh(stripeGeo, this._toonMat('#3498db'));
    stripe.position.set(0, h - 0.2, 0);
    group.add(stripe);
  }

  _addWindows(group, w, h, d, bodyColor) {
    const winMat = new THREE.MeshBasicMaterial({
      color: 0xc8e6ff,
      transparent: true,
      opacity: 0.75,
    });
    const winSize = 0.25;
    const winGeo = new THREE.PlaneGeometry(winSize, winSize);
    const windows = [];

    // Calculate window positions along front and back faces (z-axis)
    const cols = Math.max(1, Math.floor(w / 0.8));
    const rows = Math.max(1, Math.floor(h / 1.0));

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = -w / 2 + (c + 0.5) * (w / cols);
        const wy = 0.5 + (r + 0.5) * ((h - 0.5) / rows);

        // Front face (south, +z)
        const wFront = new THREE.Mesh(winGeo, winMat);
        wFront.position.set(wx, wy, d / 2 + 0.01);
        group.add(wFront);
        windows.push(wFront);

        // Back face (north, -z)
        const wBack = new THREE.Mesh(winGeo, winMat);
        wBack.position.set(wx, wy, -d / 2 - 0.01);
        wBack.rotation.y = Math.PI;
        group.add(wBack);
        windows.push(wBack);
      }
    }

    // Side windows
    const sideCols = Math.max(1, Math.floor(d / 0.8));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < sideCols; c++) {
        const wz = -d / 2 + (c + 0.5) * (d / sideCols);
        const wy = 0.5 + (r + 0.5) * ((h - 0.5) / rows);

        // Left face (-x)
        const wLeft = new THREE.Mesh(winGeo, winMat);
        wLeft.position.set(-w / 2 - 0.01, wy, wz);
        wLeft.rotation.y = -Math.PI / 2;
        group.add(wLeft);
        windows.push(wLeft);

        // Right face (+x)
        const wRight = new THREE.Mesh(winGeo, winMat);
        wRight.position.set(w / 2 + 0.01, wy, wz);
        wRight.rotation.y = Math.PI / 2;
        group.add(wRight);
        windows.push(wRight);
      }
    }

    group.userData.windows = windows;
  }

  _addDoor(group, w, d) {
    const doorW = 0.35;
    const doorH = 0.6;
    const doorGeo = new THREE.BoxGeometry(doorW, doorH, 0.05);
    const doorMat = this._toonMat('#8b6914');
    const door = new THREE.Mesh(doorGeo, doorMat);
    // Door on south face (+z), centered x
    door.position.set(0, doorH / 2, d / 2 + 0.025);
    group.add(door);
  }

  _addDecorations(group, bDef, w, h, d) {
    const id = bDef.id;
    const t = (c) => this._toonMat(c);

    if (id === 'bakery') {
      // Bread display shelf outside south face
      // Shelf
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.08, 0.25), t('#a07840'));
      shelf.position.set(0, 0.55, d / 2 + 0.18);
      group.add(shelf);
      // Baguettes (3 cylinders)
      for (let i = -1; i <= 1; i++) {
        const bread = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 6), t('#d4a040'));
        bread.rotation.z = Math.PI / 2;
        bread.position.set(i * 0.22, 0.63, d / 2 + 0.18);
        group.add(bread);
      }
      // Round breads (2 spheres)
      const bun1 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), t('#c89030'));
      bun1.position.set(-0.15, 0.66, d / 2 + 0.28);
      group.add(bun1);
      const bun2 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), t('#d8a848'));
      bun2.position.set(0.15, 0.65, d / 2 + 0.28);
      group.add(bun2);
      // Awning over display
      const awning = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.04, 0.4), t('#f4a460'));
      awning.position.set(0, 0.85, d / 2 + 0.2);
      group.add(awning);
    }

    if (id === 'cafe') {
      // Outdoor table + chairs (south side)
      const table = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 8), t('#a07040'));
      table.position.set(-0.5, 0.45, d / 2 + 0.5);
      group.add(table);
      const tableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 6), t('#806030'));
      tableLeg.position.set(-0.5, 0.22, d / 2 + 0.5);
      group.add(tableLeg);
      // Cup on table
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.06, 6), t('#ffffff'));
      cup.position.set(-0.5, 0.5, d / 2 + 0.5);
      group.add(cup);
      // 2 chairs
      for (const cx of [-0.75, -0.25]) {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.03, 0.15), t('#6a5040'));
        seat.position.set(cx, 0.3, d / 2 + 0.5);
        group.add(seat);
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.03), t('#6a5040'));
        back.position.set(cx, 0.4, d / 2 + 0.62);
        group.add(back);
      }
      // Awning
      const awning = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.04, 0.6), t('#e68a84'));
      awning.position.set(0, h * 0.7, d / 2 + 0.3);
      group.add(awning);
    }

    if (id === 'florist') {
      // Flower buckets outside
      const colors = ['#ff6b9d', '#ffd93d', '#ff4444', '#9966ff', '#6bcf7f'];
      for (let i = 0; i < 5; i++) {
        const bx = -0.5 + i * 0.25;
        // Bucket
        const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.12, 6), t('#8a7060'));
        bucket.position.set(bx, 0.06, d / 2 + 0.25);
        group.add(bucket);
        // Flowers
        const flower = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), t(colors[i]));
        flower.position.set(bx, 0.18, d / 2 + 0.25);
        group.add(flower);
      }
      // Hanging basket from roof
      const basket = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), t('#ff6b9d'));
      basket.position.set(0.4, h * 0.8, d / 2 + 0.15);
      group.add(basket);
      // Pink awning overhang
      const awning = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 0.04, 0.5), t('#ff85b3'));
      awning.position.set(0, h * 0.7, d / 2 + 0.25);
      group.add(awning);
    }

    if (id === 'library') {
      // Column pillars on south face (classical look)
      for (const px of [-w / 3, w / 3]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, h * 0.9, 8), t('#c8c0b0'));
        col.position.set(px, h * 0.45, d / 2 + 0.08);
        group.add(col);
      }
      // Book stack near door
      for (let i = 0; i < 3; i++) {
        const book = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.08), t(['#c04040', '#4080c0', '#40a040'][i]));
        book.position.set(0.35, 0.02 + i * 0.035, d / 2 + 0.15);
        group.add(book);
      }
    }

    if (id === 'market') {
      // Fruit/vegetable crates outside
      const crateColors = ['#ff6b4a', '#ffa040', '#6bcf40', '#f0e040'];
      for (let i = 0; i < 4; i++) {
        const cx = -w / 3 + i * (w / 4);
        // Crate
        const crate = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.15), t('#a08050'));
        crate.position.set(cx, 0.06, d / 2 + 0.2);
        group.add(crate);
        // Produce spheres
        for (let j = 0; j < 3; j++) {
          const produce = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 4), t(crateColors[i]));
          produce.position.set(cx + (j - 1) * 0.06, 0.16, d / 2 + 0.2);
          group.add(produce);
        }
      }
      // Awning
      const awning = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, 0.8), t('#c0392b'));
      awning.position.set(0, h * 0.7, d / 2 + 0.4);
      group.add(awning);
    }

    if (id === 'office') {
      // AC unit on side
      const ac = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.15), t('#cccccc'));
      ac.position.set(w / 2 + 0.01, h * 0.6, -d / 4);
      group.add(ac);
      // Entrance planter
      const planter = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.25), t('#808080'));
      planter.position.set(0.4, 0.1, d / 2 + 0.2);
      group.add(planter);
      const plant = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), t('#4a9a40'));
      plant.position.set(0.4, 0.28, d / 2 + 0.2);
      group.add(plant);
    }

    if (id === 'ksa_main') {
      // Flagpole
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.5, 6), t('#aaaaaa'));
      pole.position.set(0, 1.25, d / 2 + 0.5);
      group.add(pole);
      // Flag
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), t('#003478'));
      flag.position.set(0.25, 2.3, d / 2 + 0.5);
      group.add(flag);
      // Entrance columns (2 thin white cylinders at front)
      for (const cx of [-w / 4, w / 4]) {
        const column = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, h * 0.85, 8), t('#f0ebe0'));
        column.position.set(cx, h * 0.425, d / 2 + 0.12);
        column.castShadow = true;
        group.add(column);
      }
      // Entrance steps
      const step = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.08, 0.3), t('#c0b8a8'));
      step.position.set(0, 0.04, d / 2 + 0.15);
      group.add(step);
    }

    if (id === 'ksa_dorm') {
      // Bicycle rack
      for (let i = 0; i < 3; i++) {
        const bike = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.01, 4, 8), t('#555555'));
        bike.rotation.x = Math.PI / 2;
        bike.position.set(-0.3 + i * 0.3, 0.1, d / 2 + 0.25);
        group.add(bike);
      }
    }

    if (id === 'houseA' || id === 'houseB' || id === 'houseC') {
      // Mailbox
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), t('#666666'));
      post.position.set(w / 2 + 0.3, 0.25, d / 2 + 0.1);
      group.add(post);
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.08), t('#cc3333'));
      box.position.set(w / 2 + 0.3, 0.52, d / 2 + 0.1);
      group.add(box);
      // Doormat
      const mat = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.01, 0.15), t('#8a7a60'));
      mat.position.set(0, 0.005, d / 2 + 0.12);
      group.add(mat);
    }

    if (id === 'korea_univ') {
      // Rooftop flag (red banner/flag on top)
      const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 6), t('#aaaaaa'));
      flagPole.position.set(0, h + 0.5, 0);
      group.add(flagPole);
      const roofFlag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), t('#cc0033'));
      roofFlag.position.set(0.25, h + 0.85, 0);
      group.add(roofFlag);
      // Entrance gate arch (2 pillars + top beam)
      for (const px of [-w / 2 + 0.3, w / 2 - 0.3]) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.15, h * 0.7, 0.15), t('#8B0029'));
        pillar.position.set(px, h * 0.35, d / 2 + 0.5);
        group.add(pillar);
      }
      const archBeam = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.12, 0.15), t('#6a0020'));
      archBeam.position.set(0, h * 0.7, d / 2 + 0.5);
      group.add(archBeam);
      // Crimson banner
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.8), t('#8B0029'));
      banner.position.set(w / 2 + 0.01, h * 0.6, 0);
      banner.rotation.y = Math.PI / 2;
      group.add(banner);
      // Entrance steps
      const step = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.08, 0.3), t('#c0b0a0'));
      step.position.set(0, 0.04, d / 2 + 0.15);
      group.add(step);
    }

    if (id === 'kaist_ai') {
      // KAIST letters on front (simple colored box representing sign)
      const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 0.3, 0.05), t('#003478'));
      sign.position.set(0, h * 0.7, d / 2 + 0.03);
      group.add(sign);
      // Modern planter
      const planter = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.4), t('#505050'));
      planter.position.set(w / 3, 0.1, d / 2 + 0.3);
      group.add(planter);
      const plant = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 4), t('#3a8a30'));
      plant.position.set(w / 3, 0.3, d / 2 + 0.3);
      group.add(plant);
    }

    if (id === 'krafton_ai') {
      // LED sign (glowing box on front)
      const ledSign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.2, 0.06),
        new THREE.MeshBasicMaterial({ color: '#00ffcc', transparent: true, opacity: 0.8 }));
      ledSign.position.set(0, h * 0.75, d / 2 + 0.04);
      group.add(ledSign);
      // Glowing accent line around building base (emissive cyan)
      const accentMat = new THREE.MeshStandardMaterial({
        color: '#00e5cc', emissive: '#00e5cc', emissiveIntensity: 0.6,
      });
      const accentFront = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.06, 0.04), accentMat);
      accentFront.position.set(0, 0.03, d / 2 + 0.02);
      group.add(accentFront);
      const accentBack = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.06, 0.04), accentMat);
      accentBack.position.set(0, 0.03, -d / 2 - 0.02);
      group.add(accentBack);
      const accentLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, d + 0.04), accentMat);
      accentLeft.position.set(-w / 2 - 0.02, 0.03, 0);
      group.add(accentLeft);
      const accentRight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, d + 0.04), accentMat);
      accentRight.position.set(w / 2 + 0.02, 0.03, 0);
      group.add(accentRight);
      // Entrance planter
      const planter = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.3), t('#333333'));
      planter.position.set(-w / 3, 0.09, d / 2 + 0.25);
      group.add(planter);
      const plant = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), t('#4a9a40'));
      plant.position.set(-w / 3, 0.25, d / 2 + 0.25);
      group.add(plant);
    }

    if (id === 'restaurant') {
      // Lantern (small glowing sphere)
      const lanternPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6), t('#8a6030'));
      lanternPole.position.set(-w / 3, 0.3, d / 2 + 0.3);
      group.add(lanternPole);
      const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4),
        new THREE.MeshBasicMaterial({ color: '#ffaa44', transparent: true, opacity: 0.9 }));
      lantern.position.set(-w / 3, 0.65, d / 2 + 0.3);
      group.add(lantern);
      // Menu board outside
      const menuBoard = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.05), t('#5c3a1a'));
      menuBoard.position.set(w / 3, 0.3, d / 2 + 0.25);
      group.add(menuBoard);
      const menuFace = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.35), t('#f5e8d0'));
      menuFace.position.set(w / 3, 0.3, d / 2 + 0.28);
      group.add(menuFace);
      // Awning
      const awning = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 0.04, 0.5), t('#c88040'));
      awning.position.set(0, h * 0.7, d / 2 + 0.25);
      group.add(awning);
    }

    if (id === 'hospital') {
      // Red cross on roof (small red box cross on top)
      const roofCrossH = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.15), t('#ff0000'));
      roofCrossH.position.set(0, h + 0.25, 0);
      group.add(roofCrossH);
      const roofCrossV = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.5), t('#ff0000'));
      roofCrossV.position.set(0, h + 0.25, 0);
      group.add(roofCrossV);
      // Red cross symbol on front face
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.05), t('#ff0000'));
      crossH.position.set(0, h * 0.7, d / 2 + 0.03);
      group.add(crossH);
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.05), t('#ff0000'));
      crossV.position.set(0, h * 0.7, d / 2 + 0.03);
      group.add(crossV);
      // Ambulance-colored box near entrance
      const ambulance = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.3), t('#ffffff'));
      ambulance.position.set(w / 3, 0.125, d / 2 + 0.35);
      group.add(ambulance);
      const ambStripe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.31), t('#ff3333'));
      ambStripe.position.set(w / 3, 0.15, d / 2 + 0.35);
      group.add(ambStripe);
    }

    if (id === 'convenience') {
      // Illuminated sign box
      const signBox = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.25, 0.08),
        new THREE.MeshBasicMaterial({ color: '#00ff66', transparent: true, opacity: 0.85 }));
      signBox.position.set(0, h * 0.8, d / 2 + 0.05);
      group.add(signBox);
      // Small product display outside
      const display = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.2), t('#a09080'));
      display.position.set(-w / 4, 0.15, d / 2 + 0.2);
      group.add(display);
      for (let i = 0; i < 3; i++) {
        const item = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.06), t(['#ff6b4a', '#4488ff', '#ffd040'][i]));
        item.position.set(-w / 4 + (i - 1) * 0.12, 0.35, d / 2 + 0.2);
        group.add(item);
      }
    }

    if (id === 'police') {
      // Blue lamp on top
      const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8), t('#333333'));
      lampBase.position.set(0, h + 0.2, 0);
      group.add(lampBase);
      const blueLamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6),
        new THREE.MeshBasicMaterial({ color: '#4488ff', transparent: true, opacity: 0.85 }));
      blueLamp.position.set(0, h + 0.35, 0);
      group.add(blueLamp);
      // Badge emblem on front
      const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 6), t('#c0a030'));
      badge.rotation.x = Math.PI / 2;
      badge.position.set(0, h * 0.6, d / 2 + 0.02);
      group.add(badge);
    }

    if (id === 'gym') {
      // Dumbbell prop outside (2 small spheres + cylinder)
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), t('#555555'));
      bar.rotation.z = Math.PI / 2;
      bar.position.set(w / 3, 0.15, d / 2 + 0.3);
      group.add(bar);
      const weight1 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), t('#333333'));
      weight1.position.set(w / 3 - 0.2, 0.15, d / 2 + 0.3);
      group.add(weight1);
      const weight2 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), t('#333333'));
      weight2.position.set(w / 3 + 0.2, 0.15, d / 2 + 0.3);
      group.add(weight2);
      // Sports banner
      const sportsBanner = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), t('#ff6600'));
      sportsBanner.position.set(-w / 4, h * 0.65, d / 2 + 0.02);
      group.add(sportsBanner);
    }
  }

  _addLabel(group, text, height) {
    if (!text) return;
    const canvas = document.createElement('canvas');
    const isMobile = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    const size = isMobile ? 512 : 256;
    canvas.width = size;
    canvas.height = isMobile ? 128 : 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, size, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = isMobile ? 'bold 56px sans-serif' : 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, size / 2, canvas.height / 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(isMobile ? 3.5 : 2.5, isMobile ? 0.85 : 0.6, 1);
    sprite.position.set(0, height + 1.2, 0);
    group.add(sprite);
  }
}
