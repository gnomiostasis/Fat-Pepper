import * as THREE from 'three';
import { PAL } from '../art/palette';
import { ModelBuilder, inkedMesh } from './toon';

/** Draw order: the house, then Pepper's see-through shadow, then Pepper herself. */
export const ORDER_SILHOUETTE = 1;
export const ORDER_DOG = 2;

/** Everything about Pepper's pose for one frame. */
export interface DogPose {
  x: number;
  y: number;
  /** Facing angle in the 2D layout (radians, 0 = east, y down). */
  heading: number;
  /** Collision radius in cm. */
  r: number;
  /** 0 = skinny puppy, 1 = absolute unit. */
  fat: number;
  /** 0 standing still, 1 at full speed. */
  moving: number;
  /** Walk cycle angle. */
  gait: number;
  /** Tail angle, radians. */
  wag: number;
  /** 0..1, how far into a bite her head is. */
  chomp: number;
  /** Forward hop during a bite, in cm. */
  lunge: number;
}

/**
 * Pepper, a black-and-white border collie, built from rounded shapes. She faces
 * +x in her own space and is about one unit long, with her body centre at x=0.
 */
export class Dog3D {
  readonly root = new THREE.Group();
  private body = new THREE.Group();
  private torso = new THREE.Group();
  private head = new THREE.Group();
  private collar = new THREE.Group();
  private tail = new THREE.Group();
  private legs: { pivot: THREE.Group; x: number; z: number; ph: number }[] = [];
  private silMat = new THREE.MeshBasicMaterial({
    color: PAL.ink, opacity: 0.35, transparent: false, depthWrite: false, depthFunc: THREE.GreaterDepth,
    blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });

  constructor() {
    this.root.add(this.body);
    this.body.add(this.torso, this.head, this.collar, this.tail);
    this.torso.position.y = 0.45;

    this.part(this.torso, (b) => b
      .ball(0, 0, 0, 0.5, PAL.dogBlack, { sy: 0.62, sz: 0.66 })
      // White neck and shoulders, and the small patch on her lower back
      .ball(0.3, 0.04, 0, 0.33, PAL.dogWhite, { sx: 0.8, sy: 0.95, sz: 1.03 })
      .ball(-0.27, 0.285, 0, 0.11, PAL.dogWhite, { sx: 1.1, sy: 0.3, ink: false }));

    this.head.position.set(0.6, 0.74, 0);
    this.part(this.head, (b) => {
      b.ball(0, 0, 0, 0.26, PAL.dogBlack, { sx: 1.1, sy: 0.95, sz: 0.95 })
        .ball(0.12, 0.2, 0, 0.08, PAL.dogWhite, { sx: 2.2, sy: 0.5, sz: 0.55, ink: false })
        .ball(0.24, -0.07, 0, 0.15, PAL.dogWhite, { sx: 1.25, sy: 0.85, sz: 0.95 })
        .ball(0.43, -0.02, 0, 0.045, PAL.ink);
      for (const s of [-1, 1]) {
        b.ball(0.17, 0.08, 0.13 * s, 0.036, PAL.white, { ink: false })
          .ball(0.195, 0.085, 0.145 * s, 0.022, PAL.ink, { ink: false })
          .coneAt(-0.05, 0.25, 0.14 * s, 0.085, 0.2, PAL.dogBlack, { sz: 0.6, rx: 0.35 * s, rz: -0.25 });
      }
    });

    this.collar.position.set(0.43, 0.62, 0);
    this.part(this.collar, (b) => b
      .ring(0, 0, 0, 0.2, 0.04, PAL.collar, { rz: Math.PI / 2 })
      .ball(0.06, -0.2, 0, 0.045, PAL.tag));

    for (const [x, z, ph] of [[0.3, 0.19, 0], [0.3, -0.19, Math.PI], [-0.3, 0.19, Math.PI], [-0.3, -0.19, 0]]) {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.42, z);
      this.body.add(pivot);
      this.part(pivot, (b) => b
        .cyl(0, 0, 0.075, -0.36, 0.36, PAL.dogBlack)
        .ball(0.02, -0.36, 0, 0.1, PAL.dogWhite, { sx: 1.3, sy: 0.6 }));
      this.legs.push({ pivot, x, z, ph });
    }

    this.tail.position.set(-0.48, 0.58, 0);
    this.part(this.tail, (b) => b
      .rod(-0.21, 0, 0, 0.065, 0.42, 'x', PAL.dogBlack)
      .ball(-0.44, 0, 0, 0.075, PAL.dogWhite, { sx: 1.3 }));
  }

  /** Adds one painted, inked part, plus its see-through copy for when furniture hides her. */
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

  pose(p: DogPose) {
    const f = p.fat;
    // Scale so her body's half-length matches her collision radius
    const s = p.r / (0.5 * (1 + 0.3 * f));
    const sq = p.chomp * 0.14;
    this.root.position.set(p.x + Math.cos(p.heading) * p.lunge, Math.abs(Math.sin(p.gait)) * 0.03 * s * p.moving, p.y + Math.sin(p.heading) * p.lunge);
    this.root.rotation.y = -p.heading;
    this.body.scale.set(s * (1 - sq * 0.6), s * (1 - sq * 0.3), s * (1 + sq));

    this.torso.scale.set(1 + 0.3 * f, 1 + 0.75 * f, 1 + 0.9 * f);
    this.torso.position.y = 0.45 + 0.12 * f;
    this.head.position.set(0.6 + 0.15 * f, 0.74 + 0.1 * f, 0);
    this.head.rotation.z = -p.chomp * 0.45;
    this.head.scale.setScalar(1 + 0.2 * f);
    this.collar.position.set(0.43 + 0.15 * f, 0.62 + 0.1 * f, 0);
    this.collar.scale.setScalar(1 + 0.5 * f);
    this.tail.position.set(-0.48 - 0.15 * f, 0.58 + 0.08 * f, 0);
    this.tail.rotation.set(0, p.wag, 0.25);

    // Trot: diagonal legs swing together; fat pushes them out to the sides.
    for (const l of this.legs) {
      l.pivot.position.set(l.x * (1 + 0.25 * f), 0.42, l.z * (1 + 0.8 * f));
      l.pivot.rotation.z = Math.sin(p.gait + l.ph) * 0.6 * p.moving;
    }
  }
}
