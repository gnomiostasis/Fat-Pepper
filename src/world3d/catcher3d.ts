import * as THREE from 'three';
import { PAL } from '../art/palette';
import { ORDER_DOG, ORDER_SILHOUETTE } from './dog3d';
import { ModelBuilder, inkedMesh } from './toon';

/** Everything about the dog catcher's pose for one frame. */
export interface CatcherPose {
  x: number;
  y: number;
  /** Facing angle in the 2D layout (radians, 0 = east, y down). */
  heading: number;
  /** Walk cycle angle. */
  gait: number;
  /** 0 walking, 1 net swung all the way down. */
  swing: number;
  /** Shrinks him away when Pepper eats him. */
  scale: number;
}

/**
 * The dog catcher: a stocky man in a cap and uniform, carrying a big net.
 * Built in cm, facing +x, about 180 cm tall.
 */
export class Catcher3D {
  readonly root = new THREE.Group();
  private body = new THREE.Group();
  private legs: THREE.Group[] = [];
  private arm = new THREE.Group();
  private silMat = new THREE.MeshBasicMaterial({
    color: PAL.ink, opacity: 0.35, transparent: false, depthWrite: false, depthFunc: THREE.GreaterDepth,
    blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });

  constructor() {
    this.root.add(this.body);
    this.root.visible = false;

    for (const z of [-11, 11]) {
      const leg = new THREE.Group();
      leg.position.set(0, 88, z);
      this.part(leg, (b) => b.box(0, 0, 16, 15, -84, 84, PAL.navy).box(4, 0, 26, 15, -88, 8, PAL.ink));
      this.body.add(leg);
      this.legs.push(leg);
    }
    this.part(this.body, (b) => b
      .box(0, 0, 32, 50, 84, 62, PAL.white)
      .box(0, 0, 33, 51, 84, 8, PAL.navy)
      .box(12, -14, 2, 10, 128, 8, PAL.mustard, { ink: false })
      .ball(0, 158, 0, 15, PAL.bread)
      .ball(13, 154, 0, 4, PAL.bread)
      .box(14, 0, 2, 10, 147, 3, PAL.ink, { ink: false })
      // Cap with a bill sticking out over his face
      .cyl(0, 0, 15.5, 164, 10, PAL.collar)
      .box(15, 0, 16, 22, 165, 2.5, PAL.collar)
      .box(-23, 25, 12, 12, 116, 36, PAL.white));
    // His net arm, swinging the net out in front of him
    this.arm.position.set(0, 140, 25);
    this.part(this.arm, (b) => b
      .box(14, 3, 30, 10, -6, 12, PAL.white)
      .rod(55, 0, 5, 2, 90, 'x', PAL.woodLight)
      .ring(108, 0, 5, 20, 1.8, PAL.greyLight)
      .cyl(108, 5, 18, -14, 14, PAL.white, { ink: false, r2: 6 }));
    this.body.add(this.arm);
  }

  private part(parent: THREE.Object3D, draw: (b: ModelBuilder) => void) {
    const b = new ModelBuilder();
    draw(b);
    const built = b.build();
    const mesh = inkedMesh(built);
    mesh.renderOrder = ORDER_DOG;
    mesh.children.forEach((c) => { c.renderOrder = ORDER_DOG; });
    const sil = new THREE.Mesh(built.fill, this.silMat);
    sil.renderOrder = ORDER_SILHOUETTE;
    parent.add(mesh, sil);
  }

  show(on: boolean) {
    this.root.visible = on;
  }

  pose(p: CatcherPose) {
    this.root.position.set(p.x, 0, p.y);
    this.root.rotation.y = -p.heading;
    this.root.scale.setScalar(Math.max(0.001, p.scale));
    this.legs[0].rotation.z = Math.sin(p.gait) * 0.5;
    this.legs[1].rotation.z = -Math.sin(p.gait) * 0.5;
    this.body.position.y = Math.abs(Math.cos(p.gait)) * 3;
    // Net held up and forward, swung down toward the ground on a lunge
    this.arm.rotation.z = 0.5 - p.swing * 1.0;
    this.arm.rotation.y = -0.35 + p.swing * 0.35;
  }
}
