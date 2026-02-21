import * as THREE from 'three';

/**
 * Low-poly box characters in Crossy Road style.
 * Shared gradient map across all character materials.
 */

// Species hair colors
const HAIR_COLORS = {
  human_a: '#2d2a2a',
  human_b: '#4a2f1f',
  human_c: '#5b3f2e',
  human_d: '#1f1f26',
  human_e: '#6a4a2c',
  human_f: '#2a3248',
  human_g: '#3f2b1e',
  human_h: '#26282f',
  human_i: '#5a3c2b',
};

const SKIN_PLAYER = '#f6d5ba';
const SKIN_NPC = '#f2cfb1';

export class CharacterFactory {
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
   * Create a box-character group.
   * @param {string} species - e.g. 'human_a'
   * @param {string} color - Clothing color (hex)
   * @param {boolean} isPlayer
   * @returns {THREE.Group}
   */
  createCharacter(species, color, isPlayer) {
    const group = new THREE.Group();
    group.userData = {
      type: 'character',
      isPlayer,
      species,
      parts: {},
    };

    const skinColor = isPlayer ? SKIN_PLAYER : SKIN_NPC;
    const hairColor = HAIR_COLORS[species] || '#2d2a2a';
    const clothColor = color;

    // --- Head (0.35 cube) ---
    const headGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
    const head = new THREE.Mesh(headGeo, this._toon(skinColor));
    head.position.y = 1.15;
    head.castShadow = true;
    group.add(head);
    group.userData.parts.head = head;

    // --- Hair (0.37 x 0.12 x 0.37) ---
    const hairGeo = new THREE.BoxGeometry(0.37, 0.12, 0.37);
    const hair = new THREE.Mesh(hairGeo, this._toon(hairColor));
    hair.position.y = 1.35;
    hair.castShadow = true;
    group.add(hair);
    group.userData.parts.hair = hair;

    // --- Eyes (0.05 cubes, protruding on front face) ---
    const eyeGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
    const eyeMat = this._toon('#1a1a1a');
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.08, 1.16, 0.18);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.08, 1.16, 0.18);
    group.add(rightEye);

    // --- Body (0.3 x 0.4 x 0.2) ---
    const bodyGeo = new THREE.BoxGeometry(0.3, 0.4, 0.2);
    const body = new THREE.Mesh(bodyGeo, this._toon(clothColor));
    body.position.y = 0.75;
    body.castShadow = true;
    group.add(body);
    group.userData.parts.body = body;

    // --- Arms (0.08 x 0.35 x 0.08) ---
    const armGeo = new THREE.BoxGeometry(0.08, 0.35, 0.08);
    const armMat = this._toon(clothColor);

    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.22, 0.72, 0);
    leftArm.castShadow = true;
    // Set pivot to top of arm for swing animation
    leftArm.geometry.translate(0, -0.175, 0);
    leftArm.position.y = 0.9;
    group.add(leftArm);
    group.userData.parts.leftArm = leftArm;

    const rightArm = new THREE.Mesh(armGeo.clone(), armMat);
    rightArm.position.set(0.22, 0.72, 0);
    rightArm.castShadow = true;
    rightArm.geometry.translate(0, -0.175, 0);
    rightArm.position.y = 0.9;
    group.add(rightArm);
    group.userData.parts.rightArm = rightArm;

    // --- Legs (0.1 x 0.35 x 0.1) ---
    const legGeo = new THREE.BoxGeometry(0.1, 0.35, 0.1);
    const legMat = this._toon('#3d3d5c');

    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.08, 0.35, 0);
    leftLeg.castShadow = true;
    leftLeg.geometry.translate(0, -0.175, 0);
    leftLeg.position.y = 0.55;
    group.add(leftLeg);
    group.userData.parts.leftLeg = leftLeg;

    const rightLeg = new THREE.Mesh(legGeo.clone(), legMat);
    rightLeg.position.set(0.08, 0.35, 0);
    rightLeg.castShadow = true;
    rightLeg.geometry.translate(0, -0.175, 0);
    rightLeg.position.y = 0.55;
    group.add(rightLeg);
    group.userData.parts.rightLeg = rightLeg;

    // --- Shadow plane ---
    const shadowGeo = new THREE.PlaneGeometry(0.5, 0.3);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    group.add(shadow);

    return group;
  }

  /**
   * Animate walk cycle: swing arms and legs.
   */
  animateWalk(group, time) {
    const parts = group.userData.parts;
    if (!parts) return;
    const swing = Math.sin(time * 8) * 0.3;
    if (parts.leftArm) parts.leftArm.rotation.x = swing;
    if (parts.rightArm) parts.rightArm.rotation.x = -swing;
    if (parts.leftLeg) parts.leftLeg.rotation.x = -swing;
    if (parts.rightLeg) parts.rightLeg.rotation.x = swing;
  }

  /**
   * Reset to idle pose.
   */
  animateIdle(group) {
    const parts = group.userData.parts;
    if (!parts) return;
    if (parts.leftArm) parts.leftArm.rotation.x = 0;
    if (parts.rightArm) parts.rightArm.rotation.x = 0;
    if (parts.leftLeg) parts.leftLeg.rotation.x = 0;
    if (parts.rightLeg) parts.rightLeg.rotation.x = 0;
  }

  /**
   * Create or update a name tag sprite above the character.
   */
  updateNameTag(group, name, isVisible) {
    let tag = group.userData._nameTag;
    if (!tag) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 48;
      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.LinearFilter;
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      tag = new THREE.Sprite(mat);
      tag.scale.set(1.6, 0.3, 1);
      tag.position.set(0, 1.8, 0);
      group.add(tag);
      group.userData._nameTag = tag;
      group.userData._nameTagCanvas = canvas;
    }

    tag.visible = isVisible;
    if (!isVisible) return;

    // Re-draw text
    const canvas = group.userData._nameTagCanvas;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, canvas.width / 2, canvas.height / 2);
    tag.material.map.needsUpdate = true;
  }
}
