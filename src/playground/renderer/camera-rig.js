import * as THREE from 'three';

/**
 * Dual camera system: orthographic for isometric outdoor, perspective for interior.
 */
export class CameraRig {
  constructor(aspect) {
    this.aspect = aspect;
    this.zoom = 3.2;
    this.distance = 80;
    this.target = new THREE.Vector3();
    this.smoothTarget = new THREE.Vector3();
    this.mode = 'outdoor'; // 'outdoor' | 'interior'

    // Isometric angle constants
    this.isoAngleY = Math.PI / 4;
    this.isoAngleX = Math.atan(1 / Math.sqrt(2));

    // Orthographic camera for outdoor isometric view
    const frustum = this._frustumSize();
    this.orthoCamera = new THREE.OrthographicCamera(
      -frustum * aspect / 2, frustum * aspect / 2,
      frustum / 2, -frustum / 2,
      0.1, 300
    );
    this._positionOrtho(new THREE.Vector3(30, 0, 32));

    // Perspective camera for interior 3rd person
    this.perspCamera = new THREE.PerspectiveCamera(50, aspect, 0.1, 200);
    this.perspCamera.position.set(5, 6, 10);
    this.perspCamera.lookAt(5, 0, 4);

    // Transition state
    this.transitioning = false;
    this.transitionProgress = 0;
  }

  _frustumSize() {
    return 85 / this.zoom;
  }

  _positionOrtho(lookAt) {
    const dir = new THREE.Vector3(
      Math.sin(this.isoAngleY) * Math.cos(this.isoAngleX),
      Math.sin(this.isoAngleX),
      Math.cos(this.isoAngleY) * Math.cos(this.isoAngleX)
    );
    this.orthoCamera.position.copy(lookAt).addScaledVector(dir, this.distance);
    this.orthoCamera.lookAt(lookAt);
  }

  setZoom(zoom) {
    this.zoom = zoom;
    const frustum = this._frustumSize();
    this.orthoCamera.left = -frustum * this.aspect / 2;
    this.orthoCamera.right = frustum * this.aspect / 2;
    this.orthoCamera.top = frustum / 2;
    this.orthoCamera.bottom = -frustum / 2;
    this.orthoCamera.updateProjectionMatrix();
  }

  follow(worldX, worldZ, dt) {
    this.target.set(worldX, 0, worldZ);
    const lerpFactor = 1 - Math.exp(-4 * dt);
    this.smoothTarget.lerp(this.target, lerpFactor);

    if (this.mode === 'outdoor') {
      this._positionOrtho(this.smoothTarget);
      this.orthoCamera.updateProjectionMatrix();
    } else {
      // Interior: 3rd person follow
      const camOffset = new THREE.Vector3(0, 6, 6);
      const desired = this.smoothTarget.clone().add(camOffset);
      this.perspCamera.position.lerp(desired, lerpFactor);
      this.perspCamera.lookAt(this.smoothTarget.x, 0.5, this.smoothTarget.z);
    }
  }

  getActive() {
    return this.mode === 'outdoor' ? this.orthoCamera : this.perspCamera;
  }

  transitionToInterior(center) {
    this.mode = 'interior';
    this.smoothTarget.set(center.x, 0, center.z);
    this.perspCamera.position.set(center.x, 6, center.z + 6);
    this.perspCamera.lookAt(center.x, 0.5, center.z);
  }

  transitionToOutdoor() {
    this.mode = 'outdoor';
    this._positionOrtho(this.smoothTarget);
  }

  resize(aspect) {
    this.aspect = aspect;
    const frustum = this._frustumSize();
    this.orthoCamera.left = -frustum * aspect / 2;
    this.orthoCamera.right = frustum * aspect / 2;
    this.orthoCamera.top = frustum / 2;
    this.orthoCamera.bottom = -frustum / 2;
    this.orthoCamera.updateProjectionMatrix();

    this.perspCamera.aspect = aspect;
    this.perspCamera.updateProjectionMatrix();
  }
}
