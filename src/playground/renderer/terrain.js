import * as THREE from 'three';

/**
 * Ground plane with vertex-colored grass, road, and animated water.
 */
export class Terrain {
  constructor(worldWidth, worldHeight, roadTileFn, waterTileFn) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;

    // --- Ground mesh ---
    const segX = worldWidth * 2;
    const segZ = worldHeight * 2;
    const groundGeo = new THREE.PlaneGeometry(worldWidth, worldHeight, segX, segZ);
    groundGeo.rotateX(-Math.PI / 2);

    // Vertex colors
    const pos = groundGeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const grassBase = new THREE.Color(0x7db85a);
    const parkGrass = new THREE.Color(0x8ecc6a);
    const parkBorder = new THREE.Color(0x6aaa4a);
    const parkPath = new THREE.Color(0xd4c4a0);
    const roadColor = new THREE.Color(0xc8b48a);
    const crosswalkColor = new THREE.Color(0xe8e0d0);
    const waterColor = new THREE.Color(0x5fb8e8);
    const tmpColor = new THREE.Color();

    // Crosswalk intersection points
    const crosswalkPts = [[25, 12], [25, 25], [25, 35], [25, 45]];

    for (let i = 0; i < pos.count; i++) {
      // Vertices are in local space; plane center is at origin
      const lx = pos.getX(i);
      const lz = pos.getZ(i);
      // Map to game coords
      const gx = lx + worldWidth / 2;
      const gy = lz + worldHeight / 2;

      if (waterTileFn && waterTileFn(gx, gy)) {
        tmpColor.copy(waterColor);
      } else if (roadTileFn && roadTileFn(gx, gy)) {
        // Check for crosswalk stripes near intersections
        let isCrosswalk = false;
        for (const [cx, cy] of crosswalkPts) {
          if (Math.abs(gx - cx) < 2 && Math.abs(gy - cy) < 2) {
            if (Math.floor(gx * 4) % 2 === 0) {
              isCrosswalk = true;
            }
            break;
          }
        }
        tmpColor.copy(isCrosswalk ? crosswalkColor : roadColor);
      } else {
        // Park zone: y 3–13, x 10–50
        const inPark = gx >= 10 && gx <= 50 && gy >= 3 && gy <= 13;
        const onParkBorder = inPark && (
          Math.abs(gx - 10) < 0.6 || Math.abs(gx - 50) < 0.6 ||
          Math.abs(gy - 3) < 0.6 || Math.abs(gy - 13) < 0.6
        );
        // Cross-shaped park paths
        const onParkPath = inPark && (
          (Math.abs(gx - 30) < 0.4 && gy >= 3 && gy <= 13) ||
          (Math.abs(gy - 8) < 0.4 && gx >= 10 && gx <= 50)
        );

        const noise = (Math.sin(gx * 3.7 + gy * 2.3) * 0.5 + 0.5) * 0.08;
        if (onParkPath) {
          tmpColor.copy(parkPath);
          tmpColor.r += noise * 0.3 - 0.02;
          tmpColor.g += noise * 0.2;
        } else if (onParkBorder) {
          tmpColor.copy(parkBorder);
          tmpColor.r += noise - 0.04;
          tmpColor.g += noise * 0.4;
        } else if (inPark) {
          tmpColor.copy(parkGrass);
          tmpColor.r += noise - 0.03;
          tmpColor.g += noise * 0.5;
          tmpColor.b -= noise * 0.2;
        } else {
          // Default grass with noise variation
          tmpColor.copy(grassBase);
          tmpColor.r += noise - 0.04;
          tmpColor.g += noise * 0.6;
          tmpColor.b -= noise * 0.3;
        }
      }
      colors[i * 3] = tmpColor.r;
      colors[i * 3 + 1] = tmpColor.g;
      colors[i * 3 + 2] = tmpColor.b;
    }
    groundGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const groundMat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: true,
    });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.position.set(worldWidth / 2, 0, worldHeight / 2);
    this.ground.receiveShadow = true;

    // --- Water overlay (separate animated mesh) ---
    this.waterVertices = [];
    const waterSegX = worldWidth;
    const waterSegZ = worldHeight;
    const waterGeo = new THREE.PlaneGeometry(worldWidth, worldHeight, waterSegX, waterSegZ);
    waterGeo.rotateX(-Math.PI / 2);

    const waterPos = waterGeo.attributes.position;
    const waterColors = new Float32Array(waterPos.count * 3);
    const waterA = new THREE.Color(0x5fb8e8);
    let hasWater = false;

    for (let i = 0; i < waterPos.count; i++) {
      const lx = waterPos.getX(i);
      const lz = waterPos.getZ(i);
      const gx = lx + worldWidth / 2;
      const gy = lz + worldHeight / 2;

      if (waterTileFn && waterTileFn(gx, gy)) {
        this.waterVertices.push(i);
        hasWater = true;
        waterColors[i * 3] = waterA.r;
        waterColors[i * 3 + 1] = waterA.g;
        waterColors[i * 3 + 2] = waterA.b;
      } else {
        // Transparent via alpha not available in basic — just set color to 0
        waterColors[i * 3] = 0;
        waterColors[i * 3 + 1] = 0;
        waterColors[i * 3 + 2] = 0;
      }
    }
    waterGeo.setAttribute('color', new THREE.BufferAttribute(waterColors, 3));

    const waterMat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      transparent: true,
      opacity: hasWater ? 0.6 : 0,
      flatShading: true,
    });
    this.water = new THREE.Mesh(waterGeo, waterMat);
    this.water.position.set(worldWidth / 2, 0.05, worldHeight / 2);
    this.water.receiveShadow = true;
    this.water.visible = hasWater;

    this._baseWaterY = [];
    for (const idx of this.waterVertices) {
      this._baseWaterY.push(waterPos.getY(idx));
    }
  }

  updateWater(time) {
    if (this.waterVertices.length === 0) return;
    const pos = this.water.geometry.attributes.position;
    for (let i = 0; i < this.waterVertices.length; i++) {
      const idx = this.waterVertices[i];
      const bx = pos.getX(idx);
      const bz = pos.getZ(idx);
      const wave = Math.sin(time * 2 + bx * 0.5 + bz * 0.3) * 0.08;
      pos.setY(idx, this._baseWaterY[i] + wave);
    }
    pos.needsUpdate = true;
  }

  getMeshes() {
    return [this.ground, this.water];
  }
}
