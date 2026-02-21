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
    const bodyH = bDef.z; // building height -> three.y
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

    // Position in world: game(x,y) -> three(x, 0, y)
    // Building origin at center of base
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
    } else if (id === 'ksa_main' || id === 'ksa_dorm') {
      // Flat roof with parapet
      this._flatRoof(group, w, h, d, roofColor);
    } else if (id === 'market') {
      // Hip roof (4-sided cone)
      this._hipRoof(group, w, h, d, '#c0392b');
    } else if (id === 'library') {
      // Pediment (classical triangle)
      this._pedimentRoof(group, w, h, d, roofColor);
    } else if (id === 'cafe' || id === 'bakery' || id === 'florist') {
      // Mansard: two-tier
      this._mansardRoof(group, w, h, d, roofColor);
    } else if (id === 'office') {
      // Modern flat with accent stripe
      this._modernRoof(group, w, h, d, roofColor);
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
    const winMat = this._toonMat('#d4eeff');
    const winSize = 0.25;
    const winGeo = new THREE.PlaneGeometry(winSize, winSize);

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

        // Back face (north, -z)
        const wBack = new THREE.Mesh(winGeo, winMat);
        wBack.position.set(wx, wy, -d / 2 - 0.01);
        wBack.rotation.y = Math.PI;
        group.add(wBack);
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

        // Right face (+x)
        const wRight = new THREE.Mesh(winGeo, winMat);
        wRight.position.set(w / 2 + 0.01, wy, wz);
        wRight.rotation.y = Math.PI / 2;
        group.add(wRight);
      }
    }
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

  _addLabel(group, text, height) {
    if (!text) return;
    const canvas = document.createElement('canvas');
    const size = 256;
    canvas.width = size;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, size, 64);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, size / 2, 32);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.5, 0.6, 1);
    sprite.position.set(0, height + 1.2, 0);
    group.add(sprite);
  }
}
