import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PAL } from '../art/palette';

// The "ink and paint" look: three-step cel shading plus ink outlines that stay
// a steady width on screen however far the camera pulls back.

let gradient: THREE.DataTexture | null = null;
function toonGradient() {
  if (!gradient) {
    gradient = new THREE.DataTexture(new Uint8Array([105, 185, 255]), 3, 1, THREE.RedFormat);
    gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
    gradient.needsUpdate = true;
  }
  return gradient;
}

/** Cel-shaded paint: either vertex colours (models) or a flat colour / texture. */
export function paint(opts: { color?: THREE.ColorRepresentation; map?: THREE.Texture } = {}) {
  return new THREE.MeshToonMaterial({
    gradientMap: toonGradient(),
    vertexColors: opts.color === undefined && !opts.map,
    color: opts.color ?? 0xffffff,
    map: opts.map ?? null,
  });
}

/** Screen size of the canvas in pixels, shared by every ink material. */
export const inkResolution = { value: new THREE.Vector2(1, 1) };

/**
 * Ink outline: the model's back faces, pushed out along their normals by a fixed
 * number of pixels. Small things get thinner lines so a crumb never becomes a blot.
 * `objSize` is the model's longest side in its own units.
 */
export function ink(objSize: number, maxPx = 3) {
  return new THREE.ShaderMaterial({
    uniforms: {
      res: inkResolution,
      objSize: { value: objSize },
      maxPx: { value: maxPx },
      color: { value: new THREE.Color(PAL.ink) },
    },
    vertexShader: /* glsl */ `
      uniform vec2 res;
      uniform float objSize;
      uniform float maxPx;
      void main() {
        mat4 m = modelMatrix;
        #ifdef USE_INSTANCING
          m = m * instanceMatrix;
        #endif
        vec4 clip = projectionMatrix * viewMatrix * m * vec4(position, 1.0);
        vec3 vn = mat3(viewMatrix) * normalize(mat3(m) * normal);
        vec2 dir = (projectionMatrix * vec4(vn, 0.0)).xy;
        float dl = length(dir);
        dir = dl > 1e-5 ? dir / dl : vec2(0.0);
        float objPx = objSize * length(m[0].xyz) * projectionMatrix[1][1] * res.y * 0.5 / max(clip.w, 1e-4);
        float w = min(maxPx, objPx * 0.06);
        clip.xy += dir * w * 2.0 / res * clip.w;
        gl_Position = clip;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      void main() {
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide,
  });
}

export interface PartOpts {
  /** Leave this part out of the outline (for flat details sitting on another part). */
  ink?: boolean;
  sx?: number; sy?: number; sz?: number;
  rx?: number; ry?: number; rz?: number;
}

/**
 * Builds a model out of simple shapes, each with its own colour, and merges them
 * into one mesh for paint and one for ink. x is right, y is up, z is toward the
 * camera (south), matching the top-down 2D layout where y ran down the screen.
 */
export class ModelBuilder {
  private fills: THREE.BufferGeometry[] = [];
  private inks: THREE.BufferGeometry[] = [];

  /** Any geometry, centred on its own origin, moved to x,y,z. */
  add(geo: THREE.BufferGeometry, color: string, x: number, y: number, z: number, o: PartOpts = {}) {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0)),
      new THREE.Vector3(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1),
    );
    geo.applyMatrix4(m);
    geo.deleteAttribute('uv');
    const c = new THREE.Color(color), n = geo.attributes.position.count, rgb = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { rgb[i * 3] = c.r; rgb[i * 3 + 1] = c.g; rgb[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(rgb, 3));
    this.fills.push(geo);
    if (o.ink !== false) this.inks.push(geo);
    return this;
  }

  /** A box whose footprint is centred on x,z, from height y0 up by h. */
  box(x: number, z: number, w: number, d: number, y0: number, h: number, color: string, o?: PartOpts) {
    return this.add(new THREE.BoxGeometry(w, h, d), color, x, y0 + h / 2, z, o);
  }

  /** An upright cylinder centred on x,z, from y0 up by h. `r2` is the bottom radius. */
  cyl(x: number, z: number, r: number, y0: number, h: number, color: string, o: PartOpts & { r2?: number } = {}) {
    return this.add(new THREE.CylinderGeometry(r, o.r2 ?? r, h, 20), color, x, y0 + h / 2, z, o);
  }

  /** A cylinder lying on its side along x (`axis` 'x') or z. Centre at x,y,z. */
  rod(x: number, y: number, z: number, r: number, len: number, axis: 'x' | 'z', color: string, o: PartOpts = {}) {
    const rot = axis === 'x' ? { rz: Math.PI / 2 } : { rx: Math.PI / 2 };
    return this.add(new THREE.CylinderGeometry(r, r, len, 14), color, x, y, z, { ...rot, ...o });
  }

  ball(x: number, y: number, z: number, r: number, color: string, o?: PartOpts) {
    return this.add(new THREE.SphereGeometry(r, 18, 12), color, x, y, z, o);
  }

  /** A flat ring (like a donut lying on the table) centred at x,y,z. */
  ring(x: number, y: number, z: number, R: number, t: number, color: string, o?: PartOpts & { arc?: number }) {
    const g = new THREE.TorusGeometry(R, t, 10, 24, o?.arc ?? Math.PI * 2);
    g.rotateX(Math.PI / 2);
    return this.add(g, color, x, y, z, o);
  }

  cone(x: number, z: number, r: number, y0: number, h: number, color: string, o?: PartOpts) {
    return this.add(new THREE.ConeGeometry(r, h, 16), color, x, y0 + h / 2, z, o);
  }

  /** A cone centred at x,y,z, pointing wherever the rotation sends +y. */
  coneAt(x: number, y: number, z: number, r: number, h: number, color: string, o?: PartOpts) {
    return this.add(new THREE.ConeGeometry(r, h, 16), color, x, y, z, o);
  }

  /** Merged paint geometry, and the outline shell with smoothed normals so corners stay closed. */
  build() {
    const fill = mergeGeometries(this.fills)!;
    let line: THREE.BufferGeometry | null = null;
    if (this.inks.length) {
      const shells = this.inks.map((g) => {
        const s = new THREE.BufferGeometry();
        s.setAttribute('position', g.attributes.position.clone());
        if (g.index) s.setIndex(g.index.clone());
        return s;
      });
      line = mergeVertices(mergeGeometries(shells)!, 1e-4);
      line.computeVertexNormals();
    }
    fill.computeBoundingBox();
    const b = fill.boundingBox!;
    return { fill, line, size: Math.max(b.max.x - b.min.x, b.max.z - b.min.z, b.max.y - b.min.y) };
  }
}

/** A model as one painted mesh with its ink shell as a child. */
export function inkedMesh(built: ReturnType<ModelBuilder['build']>) {
  const mesh = new THREE.Mesh(built.fill, paint());
  mesh.castShadow = true; mesh.receiveShadow = true;
  if (built.line) mesh.add(new THREE.Mesh(built.line, ink(built.size)));
  return mesh;
}
