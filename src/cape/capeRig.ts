import {
    Bone,
    BoxGeometry,
    BufferAttribute,
    Float32BufferAttribute,
    Group,
    Material,
    MathUtils,
    MeshBasicMaterial,
    MeshLambertMaterial,
    Skeleton,
    SkinnedMesh,
    Uint16BufferAttribute,
} from 'three';

import { remapUV } from '@/texture/uv';
import type { Pose } from '@/types/types';

const D2R = Math.PI / 180;
const clamp = MathUtils.clamp;

/** Resting cape angle in degrees, slightly away from the back as in Minecraft. */
export const CAPE_REST_SWING = 6;

const W = 10;
const H = 16;
const D = 1;
const SEGMENTS = 24;
const BONES = 3;
const BLEND = 1.6;

type CapeMaterial = MeshLambertMaterial | MeshBasicMaterial;

/**
 * A cape made from a single SkinnedMesh with a chain of 3 bones, allowing it to bend instead of remaining rigid.
 * Attached to the upper back, with the outer side facing backward (-z).
 */
export class CapeMesh {
    /** Attached to the torso and hidden until a cape is loaded. */
    readonly holder = new Group();
    readonly mesh: SkinnedMesh;
    /** [root, middle, tip] */
    readonly bones: [Bone, Bone, Bone];

    constructor(private makeMaterial: () => CapeMaterial) {
        const g = new BoxGeometry(W, H, D, 1, SEGMENTS, 1);
        // The outer side (the texture's "front" region) faces -z; cape textures are 64x32.
        remapUV(g, W, H, D, [0, 0, W, H, D], { texW: 64, texH: 32, yaw180: true });
        g.translate(0, -H / 2, -D / 2);

        // Cumulative weights measure how far a vertex passes each joint; bone i gets c_i - c_(i+1).
        const seg = H / BONES;
        const pos = g.attributes.position as BufferAttribute;
        const n = pos.count;
        const idx = new Uint16Array(n * 4);
        const wgt = new Float32Array(n * 4);
        const crossed = (y: number, joint: number) => {
            const t = clamp((-seg * joint + BLEND - y) / (2 * BLEND), 0, 1);
            return t * t * (3 - 2 * t);
        };
        for (let i = 0; i < n; i++) {
            const y = pos.getY(i);
            const c1 = crossed(y, 1);
            const c2 = crossed(y, 2);

            idx[i * 4] = 0;
            idx[i * 4 + 1] = 1;
            idx[i * 4 + 2] = 2;
            wgt[i * 4] = 1 - c1;
            wgt[i * 4 + 1] = c1 - c2;
            wgt[i * 4 + 2] = c2;
        }
        g.setAttribute('skinIndex', new Uint16BufferAttribute(idx, 4));
        g.setAttribute('skinWeight', new Float32BufferAttribute(wgt, 4));

        this.mesh = new SkinnedMesh(g, makeMaterial());
        this.mesh.frustumCulled = false;

        const root = new Bone();
        const middle = new Bone();
        const tip = new Bone();
        this.bones = [root, middle, tip];
        middle.position.y = -seg;
        tip.position.y = -seg;
        root.add(middle);
        middle.add(tip);
        this.mesh.add(root);
        this.holder.add(this.mesh);
        this.holder.updateMatrixWorld(true);
        const skeleton = new Skeleton(this.bones);
        this.mesh.bind(skeleton);
        this.holder.visible = false;
    }

    get visible() {
        return this.holder.visible;
    }

    set visible(visible: boolean) {
        this.holder.visible = visible;
    }

    /**
     * @param swing Backward rotation at the base (degrees; + = cape tip moves away from the back)
     * @param bend Additional bend at the lower section (degrees), split evenly between the middle and tip bones
     * @param sway Side-to-side rotation (degrees; + = cape tip moves to the character's left)
     */
    apply(swing: number, bend: number, sway: number) {
        const [root, middle, tip] = this.bones;
        root.rotation.set(swing * D2R, 0, sway * D2R);
        middle.rotation.set(bend * 0.5 * D2R, 0, sway * 0.3 * D2R);
        tip.rotation.set(bend * 0.5 * D2R, 0, sway * 0.3 * D2R);
    }

    setWireframe(v: boolean) {
        (this.mesh.material as CapeMaterial).wireframe = v;
    }

    /** Switch material type (lit/unlit) without rebuilding the geometry. */
    refreshMaterials() {
        const old = this.mesh.material as Material;
        this.mesh.material = this.makeMaterial();
        old.dispose();
    }

    dispose() {
        this.mesh.geometry.dispose();
        (this.mesh.material as Material).dispose();
    }
}

export interface CapePhysicsOptions {
    /** Disable to apply targets directly without spring motion. Defaults to true. */
    enabled?: boolean;
    /** Spring stiffness. Higher values track targets faster. Defaults to 60. */
    stiffness?: number;
    /** Damping. Lower values produce more bounce. Defaults to 7 (slightly underdamped). */
    damping?: number;
    /** How strongly the cape hangs vertically when the torso leans (0 = follows the torso rigidly, 1 = fully vertical). Defaults to 0.7. */
    gravity?: number;
}

/**
 * Secondary cape motion: a damped spring for each angle (swing, bend, sway) that tracks targets derived from the pose.
 * Target = hanging angle + the pose's `cape` channel + gravity compensation for torso tilt.
 * The cape lags and bounces slightly when the torso or animation moves quickly. Deterministic.
 */
export class CapeDynamics {
    enabled = true;
    stiffness = 60;
    damping = 7;
    gravity = 0.7;
    swing = CAPE_REST_SWING;
    bend = 0;
    sway = 0;
    private v = { swing: 0, bend: 0, sway: 0 };
    private ready = false;

    set(o: boolean | CapePhysicsOptions) {
        if (typeof o === 'boolean') {
            this.enabled = o;
            return;
        }

        if (typeof o.enabled === 'boolean') this.enabled = o.enabled;

        const { stiffness, damping, gravity } = o;

        if (
            typeof stiffness === 'number' &&
            Number.isFinite(stiffness) &&
            stiffness > 0
        ) {
            this.stiffness = stiffness;
        }

        if (typeof damping === 'number' && Number.isFinite(damping) && damping >= 0) {
            this.damping = damping;
        }

        if (
            typeof gravity === 'number' &&
            Number.isFinite(gravity) &&
            gravity >= 0 &&
            gravity <= 1.5
        ) {
            this.gravity = gravity;
        }
    }

    /** Start at the next target without an initial swing, such as when a cape is shown. */
    reset() {
        this.ready = false;
    }

    /** Target angles in degrees for a pose. */
    targets(p: Pose) {
        // Gravity keeps the cape vertical as the torso tilts, without letting it clip through the body.
        const swing = clamp(
            CAPE_REST_SWING + p.cape.swing - this.gravity * p.torso.pitch,
            0,
            85,
        );
        const bend = clamp(p.cape.bend + 0.4 * (swing - CAPE_REST_SWING), -30, 70);
        const sway = clamp(p.cape.sway, -60, 60);

        return { swing, bend, sway };
    }

    update(p: Pose, dt: number) {
        const t = this.targets(p);

        if (!this.enabled || !(dt > 0) || !this.ready) {
            this.swing = t.swing;
            this.bend = t.bend;
            this.sway = t.sway;
            this.v.swing = this.v.bend = this.v.sway = 0;
            this.ready = true;

            return;
        }

        const steps = Math.max(1, Math.ceil(dt * 120));
        const h = dt / steps;
        const k = this.stiffness;
        const c = this.damping;

        for (let s = 0; s < steps; s++) {
            for (const key of ['swing', 'bend', 'sway'] as const) {
                const a = k * (t[key] - this[key]) - c * this.v[key];
                this.v[key] += a * h;
                this[key] += this.v[key] * h;
            }
        }

        const lim = (key: 'swing' | 'bend' | 'sway', lo: number, hi: number) => {
            const c2 = clamp(this[key], lo, hi);
            if (c2 !== this[key]) {
                this[key] = c2;
                this.v[key] = 0;
            }
        };

        lim('swing', 0, 85);
        lim('bend', -30, 70);
        lim('sway', -60, 60);
    }
}
