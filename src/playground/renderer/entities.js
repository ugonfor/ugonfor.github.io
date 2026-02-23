import * as THREE from 'three';

/**
 * Low-poly box characters in Crossy Road style with emotion-based animations.
 */

const HAIR_COLORS = {
  human_a: '#2d2a2a', human_b: '#4a2f1f', human_c: '#5b3f2e',
  human_d: '#1f1f26', human_e: '#6a4a2c', human_f: '#2a3248',
  human_g: '#3f2b1e', human_h: '#26282f', human_i: '#5a3c2b',
};

const SKIN_PLAYER = '#f6d5ba';
const SKIN_NPC = '#f2cfb1';

export class CharacterFactory {
  constructor() {
    const gradientData = new Uint8Array([60, 130, 255]);
    this.gradientMap = new THREE.DataTexture(gradientData, 3, 1, THREE.RedFormat);
    this.gradientMap.minFilter = THREE.NearestFilter;
    this.gradientMap.magFilter = THREE.NearestFilter;
    this.gradientMap.needsUpdate = true;
  }

  _toon(color) {
    return new THREE.MeshToonMaterial({ color, gradientMap: this.gradientMap });
  }

  createCharacter(species, color, isPlayer) {
    const group = new THREE.Group();
    group.userData = {
      type: 'character', isPlayer, species,
      parts: {},
      _anim: 'idle',       // current animation
      _animTime: 0,
    };

    const skinColor = isPlayer ? SKIN_PLAYER : SKIN_NPC;
    const hairColor = HAIR_COLORS[species] || '#2d2a2a';

    // --- Head ---
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), this._toon(skinColor));
    head.position.y = 1.15;
    head.castShadow = true;
    group.add(head);
    group.userData.parts.head = head;

    // --- Hair ---
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.12, 0.37), this._toon(hairColor));
    hair.position.y = 1.35;
    hair.castShadow = true;
    group.add(hair);
    group.userData.parts.hair = hair;

    // --- Eyes (head의 자식으로 — head 이동 시 함께 이동) ---
    const eyeGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
    const eyeMat = this._toon('#1a1a1a');
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.08, 0.01, 0.18);
    head.add(leftEye);
    group.userData.parts.leftEye = leftEye;
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.08, 0.01, 0.18);
    head.add(rightEye);
    group.userData.parts.rightEye = rightEye;

    // --- Body ---
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.2), this._toon(color));
    body.position.y = 0.75;
    body.castShadow = true;
    group.add(body);
    group.userData.parts.body = body;

    // --- Arms (pivot at shoulder) ---
    const armGeo = new THREE.BoxGeometry(0.08, 0.35, 0.08);
    const armMat = this._toon(color);

    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.geometry = armGeo.clone();
    leftArm.geometry.translate(0, -0.175, 0);
    leftArm.position.set(-0.22, 0.9, 0);
    leftArm.castShadow = true;
    group.add(leftArm);
    group.userData.parts.leftArm = leftArm;

    const rightArm = new THREE.Mesh(armGeo.clone(), armMat);
    rightArm.geometry.translate(0, -0.175, 0);
    rightArm.position.set(0.22, 0.9, 0);
    rightArm.castShadow = true;
    group.add(rightArm);
    group.userData.parts.rightArm = rightArm;

    // --- Legs (pivot at hip) ---
    const legGeo = new THREE.BoxGeometry(0.1, 0.35, 0.1);
    const legMat = this._toon('#3d3d5c');

    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.geometry = legGeo.clone();
    leftLeg.geometry.translate(0, -0.175, 0);
    leftLeg.position.set(-0.08, 0.55, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);
    group.userData.parts.leftLeg = leftLeg;

    const rightLeg = new THREE.Mesh(legGeo.clone(), legMat);
    rightLeg.geometry.translate(0, -0.175, 0);
    rightLeg.position.set(0.08, 0.55, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);
    group.userData.parts.rightLeg = rightLeg;

    // --- Shadow ---
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.3),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    group.add(shadow);

    return group;
  }

  // ─── Animation Methods ───

  /** Walk cycle: swing arms and legs */
  animateWalk(group, time) {
    const p = group.userData.parts;
    if (!p) return;
    const swing = Math.sin(time * 8) * 0.3;
    if (p.leftArm)  p.leftArm.rotation.x = swing;
    if (p.rightArm) p.rightArm.rotation.x = -swing;
    if (p.leftLeg)  p.leftLeg.rotation.x = -swing;
    if (p.rightLeg) p.rightLeg.rotation.x = swing;
    // Reset head/body from other anims
    if (p.head) p.head.rotation.x = 0;
    if (p.head) p.head.rotation.z = 0;
    if (p.body) p.body.position.y = 0.75;
    group.position.y = 0;
    group.userData._anim = 'walk';
  }

  /** Idle pose: reset all rotations */
  animateIdle(group) {
    const p = group.userData.parts;
    if (!p) return;
    if (p.leftArm)  p.leftArm.rotation.x = 0;
    if (p.rightArm) p.rightArm.rotation.x = 0;
    if (p.leftLeg)  { p.leftLeg.rotation.x = 0; p.leftLeg.position.y = 0.55; }
    if (p.rightLeg) { p.rightLeg.rotation.x = 0; p.rightLeg.position.y = 0.55; }
    if (p.head) { p.head.rotation.x = 0; p.head.rotation.z = 0; p.head.position.y = 1.15; }
    if (p.body) p.body.position.y = 0.75;
    if (p.hair) p.hair.position.y = 1.35;
    group.position.y = 0;
    group.userData._anim = 'idle';
  }

  /** Sitting pose: bend legs forward, lower body onto bench */
  animateSit(group) {
    const p = group.userData.parts;
    if (!p) return;
    // 다리를 앞으로 꺾기
    if (p.leftLeg)  { p.leftLeg.rotation.x = -Math.PI / 2; p.leftLeg.position.y = 0.35; }
    if (p.rightLeg) { p.rightLeg.rotation.x = -Math.PI / 2; p.rightLeg.position.y = 0.35; }
    if (p.leftArm)  { p.leftArm.rotation.x = -0.3; }  // 살짝 무릎 위에
    if (p.rightArm) { p.rightArm.rotation.x = -0.3; }
    // 몸통과 머리를 벤치 높이로
    if (p.body) p.body.position.y = 0.55;
    if (p.head) { p.head.position.y = 0.95; p.head.rotation.x = 0; p.head.rotation.z = 0; }
    if (p.hair) p.hair.position.y = 1.15;
    group.position.y = -0.15;
    group.userData._anim = 'sit';
  }

  /** Lying down pose: rotate whole character sideways */
  animateLie(group) {
    const p = group.userData.parts;
    if (!p) return;
    // Reset parts first
    this.animateIdle(group);
    // Rotate body on side
    group.rotation.z = Math.PI / 2;
    group.position.y = 0.4;
    group.userData._anim = 'lie';
  }

  /** Happy emotion: bounce + wave one arm */
  animateHappy(group, time) {
    const p = group.userData.parts;
    if (!p) return;
    const bounce = Math.abs(Math.sin(time * 5)) * 0.12;
    group.position.y = bounce;
    // Wave right arm
    if (p.rightArm) p.rightArm.rotation.x = -Math.PI / 3 + Math.sin(time * 6) * 0.3;
    if (p.leftArm) p.leftArm.rotation.x = 0;
    // Legs idle
    if (p.leftLeg)  p.leftLeg.rotation.x = 0;
    if (p.rightLeg) p.rightLeg.rotation.x = 0;
    // Slight head tilt
    if (p.head) { p.head.rotation.x = 0; p.head.rotation.z = Math.sin(time * 4) * 0.08; }
    if (p.body) p.body.position.y = 0.75;
    group.userData._anim = 'happy';
  }

  /** Sad emotion: droop head, arms hang */
  animateSad(group, time) {
    const p = group.userData.parts;
    if (!p) return;
    group.position.y = 0;
    // Head droops forward
    if (p.head) { p.head.rotation.x = 0.25; p.head.rotation.z = 0; }
    // Arms hang slightly forward
    if (p.leftArm)  p.leftArm.rotation.x = 0.15;
    if (p.rightArm) p.rightArm.rotation.x = 0.15;
    // Slight body sway
    if (p.body) p.body.position.y = 0.73;
    if (p.leftLeg)  p.leftLeg.rotation.x = 0;
    if (p.rightLeg) p.rightLeg.rotation.x = 0;
    group.userData._anim = 'sad';
  }

  /** Angry emotion: rapid body shake */
  animateAngry(group, time) {
    const p = group.userData.parts;
    if (!p) return;
    const shake = Math.sin(time * 20) * 0.03;
    group.position.y = 0;
    group.position.x = (group.userData._baseX || 0) + shake;
    // Fists clenched (arms slightly out)
    if (p.leftArm)  p.leftArm.rotation.x = -0.4;
    if (p.rightArm) p.rightArm.rotation.x = -0.4;
    if (p.head) { p.head.rotation.x = -0.1; p.head.rotation.z = 0; }
    if (p.body) p.body.position.y = 0.75;
    if (p.leftLeg)  p.leftLeg.rotation.x = 0;
    if (p.rightLeg) p.rightLeg.rotation.x = 0;
    group.userData._anim = 'angry';
  }

  /** Surprised: quick jump up */
  animateSurprised(group, time) {
    const p = group.userData.parts;
    if (!p) return;
    const jump = Math.max(0, Math.sin(time * 6)) * 0.25;
    group.position.y = jump;
    // Arms up
    if (p.leftArm)  p.leftArm.rotation.x = -Math.PI / 2.5;
    if (p.rightArm) p.rightArm.rotation.x = -Math.PI / 2.5;
    if (p.head) { p.head.rotation.x = -0.15; p.head.rotation.z = 0; }
    if (p.body) p.body.position.y = 0.75;
    if (p.leftLeg)  p.leftLeg.rotation.x = 0;
    if (p.rightLeg) p.rightLeg.rotation.x = 0;
    group.userData._anim = 'surprised';
  }

  /** Chatting: gentle gestures with hands */
  animateChat(group, time) {
    const p = group.userData.parts;
    if (!p) return;
    group.position.y = 0;
    // Gesture with arms
    if (p.leftArm)  p.leftArm.rotation.x = -0.3 + Math.sin(time * 3) * 0.15;
    if (p.rightArm) p.rightArm.rotation.x = -0.3 + Math.sin(time * 3 + 1.5) * 0.15;
    // Slight head nod
    if (p.head) { p.head.rotation.x = Math.sin(time * 2) * 0.06; p.head.rotation.z = 0; }
    if (p.body) p.body.position.y = 0.75;
    if (p.leftLeg)  p.leftLeg.rotation.x = 0;
    if (p.rightLeg) p.rightLeg.rotation.x = 0;
    group.userData._anim = 'chat';
  }

  /** Wave hello: raise one arm and wave */
  animateWave(group, time) {
    const p = group.userData.parts;
    if (!p) return;
    group.position.y = 0;
    if (p.rightArm) p.rightArm.rotation.x = -Math.PI / 2 + Math.sin(time * 8) * 0.25;
    if (p.leftArm)  p.leftArm.rotation.x = 0;
    if (p.head) { p.head.rotation.x = 0; p.head.rotation.z = Math.sin(time * 4) * 0.05; }
    if (p.body) p.body.position.y = 0.75;
    if (p.leftLeg)  p.leftLeg.rotation.x = 0;
    if (p.rightLeg) p.rightLeg.rotation.x = 0;
    group.userData._anim = 'wave';
  }

  /**
   * Animate based on NPC state, mood, and pose.
   * @param {THREE.Group} group
   * @param {string} state - 'idle' | 'moving' | 'chatting'
   * @param {string} mood - 'neutral' | 'happy' | 'sad'
   * @param {number} time - elapsed time
   * @param {boolean} isMoving - position changed this frame
   * @param {string} [pose='standing'] - 'standing' | 'sitting' | 'lying' | 'waving'
   */
  animateByState(group, state, mood, time, isMoving, pose = 'standing') {
    if (isMoving) {
      this.animateWalk(group, time);
      return;
    }
    // 자세에 따른 포즈
    if (pose === 'sitting') {
      this.animateSit(group);
      return;
    }
    if (pose === 'lying') {
      this.animateLie(group);
      return;
    }
    if (pose === 'waving') {
      this.animateHappy(group, time);
      return;
    }
    if (state === 'chatting') {
      if (mood === 'happy') {
        this.animateHappy(group, time);
      } else if (mood === 'sad') {
        this.animateSad(group, time);
      } else {
        this.animateChat(group, time);
      }
      return;
    }
    // Idle with mood
    if (mood === 'happy') {
      this.animateHappy(group, time);
    } else if (mood === 'sad') {
      this.animateSad(group, time);
    } else {
      this.animateIdle(group);
    }
  }

  // ─── Animal Factory Methods ───

  /** Create a small box cat */
  createCat(color) {
    const group = new THREE.Group();
    group.userData = { type: 'animal', animalType: 'cat' };

    const c = color || ['#444444', '#ff9900', '#ffffff'][Math.floor(Math.random() * 3)];
    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.35), this._toon(c));
    body.position.y = 0.15;
    body.castShadow = true;
    group.add(body);
    group.userData.body = body;

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.15), this._toon(c));
    head.position.set(0, 0.2, 0.2);
    head.castShadow = true;
    group.add(head);

    // Ears
    const earGeo = new THREE.BoxGeometry(0.04, 0.06, 0.04);
    const earMat = this._toon(c);
    const leftEar = new THREE.Mesh(earGeo, earMat);
    leftEar.position.set(-0.05, 0.3, 0.2);
    group.add(leftEar);
    const rightEar = new THREE.Mesh(earGeo.clone(), earMat);
    rightEar.position.set(0.05, 0.3, 0.2);
    group.add(rightEar);

    // Eyes
    const eyeGeo = new THREE.BoxGeometry(0.025, 0.025, 0.025);
    const eyeMat = this._toon('#1a1a1a');
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.03, 0.22, 0.275);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo.clone(), eyeMat);
    rightEye.position.set(0.03, 0.22, 0.275);
    group.add(rightEye);

    // Tail
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.25), this._toon(c));
    tail.position.set(0, 0.22, -0.2);
    tail.rotation.x = -0.4;
    group.add(tail);

    return group;
  }

  /** Create a small box dog */
  createDog() {
    const group = new THREE.Group();
    group.userData = { type: 'animal', animalType: 'dog' };

    const c = '#8b6842';
    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.4), this._toon(c));
    body.position.y = 0.2;
    body.castShadow = true;
    group.add(body);
    group.userData.body = body;

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), this._toon(c));
    head.position.set(0, 0.28, 0.25);
    head.castShadow = true;
    group.add(head);

    // Ears (floppy — rotated slightly)
    const earGeo = new THREE.BoxGeometry(0.05, 0.08, 0.04);
    const earMat = this._toon('#6b4e2a');
    const leftEar = new THREE.Mesh(earGeo, earMat);
    leftEar.position.set(-0.08, 0.36, 0.25);
    leftEar.rotation.z = 0.3;
    group.add(leftEar);
    const rightEar = new THREE.Mesh(earGeo.clone(), earMat);
    rightEar.position.set(0.08, 0.36, 0.25);
    rightEar.rotation.z = -0.3;
    group.add(rightEar);

    // Eyes
    const eyeGeo = new THREE.BoxGeometry(0.03, 0.03, 0.03);
    const eyeMat = this._toon('#1a1a1a');
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.04, 0.3, 0.34);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo.clone(), eyeMat);
    rightEye.position.set(0.04, 0.3, 0.34);
    group.add(rightEye);

    // Tail (angled up)
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.15, 0.03), this._toon(c));
    tail.position.set(0, 0.32, -0.22);
    tail.rotation.x = 0.4;
    group.add(tail);

    return group;
  }

  /** Create or update a name tag sprite */
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
      const isMobile = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
      tag.scale.set(isMobile ? 2.2 : 1.6, isMobile ? 0.42 : 0.3, 1);
      tag.position.set(0, 1.8, 0);
      group.add(tag);
      group.userData._nameTag = tag;
      group.userData._nameTagCanvas = canvas;
    }
    tag.visible = isVisible;
    if (!isVisible) return;

    const canvas = group.userData._nameTagCanvas;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    const isMobile = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    ctx.font = isMobile ? 'bold 28px sans-serif' : 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, canvas.width / 2, canvas.height / 2);
    tag.material.map.needsUpdate = true;
  }
}
