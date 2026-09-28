import {
    Bone,
    BoxGeometry,
    BufferAttribute,
    Float32BufferAttribute,
    Group,
    Material,
    MathUtils,
    Mesh,
    MeshBasicMaterial,
    MeshLambertMaterial,
    Object3D,
    Skeleton,
    SkinnedMesh,
    Texture,
    Uint16BufferAttribute,
    Vector3,
} from 'three';

import { CapeTexture } from '@/cape/cape';
import { CapeDynamics, CapeMesh, type CapePhysicsOptions } from '@/cape/capeRig';
import type { SkinTexture } from '@/skin/skin';
import { type Region, remapUV } from '@/texture/uv';
import type { JointPose, LimbName, Pose, Rot3 } from '@/types/types';

export type ArmModel = 'auto' | 'classic' | 'slim';

const SEGMENTS = 16;
const D2R = Math.PI / 180;

interface RigState {
    skin: SkinTexture;

    blend: number;

    overlay: boolean;

    wireframe: boolean;

    /** True uses MeshBasicMaterial without lighting; false uses MeshLambertMaterial. */
    unlit: boolean;
}

type SkinMaterial = MeshLambertMaterial | MeshBasicMaterial;

function makeMaterial(state: RigState, texture?: Texture): SkinMaterial {
    const params = {
        map: texture ?? state.skin.texture,
        alphaTest: 0.5,
        wireframe: state.wireframe,
    };
    return state.unlit ? new MeshBasicMaterial(params) : new MeshLambertMaterial(params);
}

/** Replace a mesh material for the current mode and dispose of the old material. */
function swapMaterial(mesh: Mesh, state: RigState) {
    const old = mesh.material as Material;
    mesh.material = makeMaterial(state);
    old.dispose();
}

interface LimbConfig {
    w: number;
    h: number;
    d: number;

    jointRatio: number;

    region: [number, number];

    overlayRegion: [number, number];
}

/**
 * One arm or leg: a SkinnedMesh with two bones (root and joint) plus an outer layer
 * that shares the same skeleton. No extra objects are needed for elbows or knees.
 */
export class Limb {
    readonly holder = new Group();
    base!: SkinnedMesh;
    overlay!: SkinnedMesh;
    /** Root bone (shoulder or hip). */
    root!: Bone;
    /** Joint bone (elbow or knee). */
    joint!: Bone;
    private jointY = 0;

    constructor(
        public cfg: LimbConfig,
        private state: RigState,
    ) {
        this.build(cfg);
    }

    build(cfg: LimbConfig = this.cfg) {
        this.cfg = cfg;
        const prev = this.root ? { root: this.root, joint: this.joint } : null;
        this.disposeMeshes();
        this.holder.clear();
        this.jointY = -cfg.h * cfg.jointRatio;

        this.base = this.makeMesh(0, cfg.region);
        this.overlay = this.makeMesh(0.5, cfg.overlayRegion);

        this.root = new Bone();
        this.joint = new Bone();
        this.joint.position.y = this.jointY;
        this.root.add(this.joint);
        this.base.add(this.root);
        this.holder.add(this.base, this.overlay);
        this.holder.updateMatrixWorld(true);

        const skeleton = new Skeleton([this.root, this.joint]);
        this.base.bind(skeleton);
        this.overlay.bind(skeleton, this.base.matrixWorld);
        this.setBlend(this.state.blend);
        this.overlay.visible = this.state.overlay;

        // Rebuilding (for example, classic <-> slim) must preserve motion: bind the skeleton
        // in its neutral pose first, then restore bone rotations and move attached objects
        // (for example, a sword on a hand joint) to the new bones.
        if (prev) {
            this.root.rotation.copy(prev.root.rotation);
            this.joint.rotation.copy(prev.joint.rotation);
            for (const child of [...prev.joint.children]) this.joint.add(child);
            for (const child of [...prev.root.children])
                if (child !== prev.joint) this.root.add(child);
        }
    }

    private makeMesh(inflate: number, reg: [number, number]) {
        const { w, h, d } = this.cfg;
        const g = new BoxGeometry(w + inflate, h + inflate, d + inflate, 1, SEGMENTS, 1);
        remapUV(g, w + inflate, h + inflate, d + inflate, [reg[0], reg[1], w, h, d]);
        g.translate(0, -h / 2, 0);

        const position = g.getAttribute('position');

        if (!(position instanceof BufferAttribute)) {
            throw new Error('Limb geometry is missing its position attribute.');
        }

        const n = position.count;
        g.setAttribute('skinIndex', new Uint16BufferAttribute(new Uint16Array(n * 4), 4));
        g.setAttribute(
            'skinWeight',
            new Float32BufferAttribute(new Float32Array(n * 4), 4),
        );
        const mesh = new SkinnedMesh(g, makeMaterial(this.state));
        mesh.frustumCulled = false;
        return mesh;
    }

    /** Width of the bone-weight transition around the joint. Smaller values make a stiffer hinge. */
    setBlend(blend: number) {
        const b = Math.max(0.01, blend);
        const jointY = this.jointY;
        for (const mesh of [this.base, this.overlay]) {
            const g = mesh.geometry;
            const pos = g.getAttribute('position');
            const si = g.getAttribute('skinIndex');
            const sw = g.getAttribute('skinWeight');

            if (
                !(pos instanceof BufferAttribute) ||
                !(si instanceof BufferAttribute) ||
                !(sw instanceof BufferAttribute)
            ) {
                throw new Error('Limb geometry is missing required skinning attributes.');
            }

            for (let i = 0; i < pos.count; i++) {
                let t = MathUtils.clamp((jointY + b - pos.getY(i)) / (2 * b), 0, 1);
                t = t * t * (3 - 2 * t);
                si.setXYZW(i, 0, 1, 0, 0);
                sw.setXYZW(i, 1 - t, t, 0, 0);
            }
            si.needsUpdate = true;
            sw.needsUpdate = true;
        }
    }

    setWireframe(v: boolean) {
        (this.base.material as SkinMaterial).wireframe = v;
        (this.overlay.material as SkinMaterial).wireframe = v;
    }

    /** Switch between lit and unlit materials without rebuilding geometry or the skeleton. */
    refreshMaterials() {
        swapMaterial(this.base, this.state);
        swapMaterial(this.overlay, this.state);
    }

    private disposeMeshes() {
        for (const m of [this.base, this.overlay]) {
            if (!m) continue;
            m.geometry.dispose();
            (m.material as Material).dispose();
        }
    }

    dispose() {
        this.disposeMeshes();
    }
}

export interface RigOptions {
    armModel?: ArmModel;

    showOverlay?: boolean;

    blendWidth?: number;

    wireframe?: boolean;

    /** Use MeshBasicMaterial without lighting; usually controlled by the viewer's LightRig. */
    unlit?: boolean;

    /** Cape texture used by the rig; created automatically if not provided. */
    capeTexture?: CapeTexture;

    /** Cape spring simulation settings. */
    capePhysics?: boolean | CapePhysicsOptions;
}

/**
 * Minecraft character with a head, body, two arms, and two legs that bend at the joints.
 * Add `rig.object` to your own scene when not using CharacterViewer.
 */
export class CharacterRig {
    /** Root group with its origin at the soles of the feet. */
    readonly object = new Group();
    readonly torso = new Group();
    readonly head = new Group();
    readonly limbs: Record<LimbName, Limb>;
    /** Cape texture, empty until a cape is loaded. */
    readonly capeTexture: CapeTexture;
    /** Three-bone cape mesh on the back, hidden until loaded. See setCapeVisible. */
    readonly cape: CapeMesh;
    private capeDynamics = new CapeDynamics();
    /** Called whenever an arm is rebuilt (for example, when switching classic/slim). */
    onRebuild?: () => void;

    private state: RigState;
    private armMode: ArmModel;
    private statics: Mesh[] = [];
    private overlays: Mesh[] = [];

    constructor(skin: SkinTexture, opts: RigOptions = {}) {
        this.state = {
            skin,
            blend: opts.blendWidth ?? 1.5,
            overlay: opts.showOverlay ?? true,
            wireframe: opts.wireframe ?? false,
            unlit: opts.unlit ?? false,
        };
        this.armMode = opts.armModel ?? 'auto';

        const headBase = this.box(8, 8, 8, 0, [0, 0, 8, 8, 8]);
        const headOver = this.box(8, 8, 8, 1, [32, 0, 8, 8, 8], true);
        this.head.position.set(0, 16, 0);
        this.head.add(headBase, headOver);

        const bodyBase = this.box(8, 12, 4, 0, [16, 16, 8, 12, 4]);
        const bodyOver = this.box(8, 12, 4, 0.5, [16, 32, 8, 12, 4], true);
        const body = new Group();
        body.position.set(0, 6, 0);
        body.add(bodyBase, bodyOver);

        this.torso.position.set(0, 12, 0);
        this.torso.add(this.head, body);
        this.object.add(this.torso);

        // Attach the cape to the upper back behind the jacket layer; keep it hidden until loaded.
        this.capeTexture = opts.capeTexture ?? new CapeTexture();
        this.cape = new CapeMesh(() =>
            makeMaterial(this.state, this.capeTexture.texture),
        );
        this.cape.holder.position.set(0, 12, -2.3);
        this.torso.add(this.cape.holder);
        if (opts.capePhysics !== undefined) this.capeDynamics.set(opts.capePhysics);

        const leg = { w: 4, h: 12, d: 4, jointRatio: 0.5 };
        const arm = { w: 4, h: 12, d: 4, jointRatio: 0.5 };
        // L is the character's left side (+x).
        this.limbs = {
            legL: new Limb(
                { ...leg, region: [16, 48], overlayRegion: [0, 48] },
                this.state,
            ),
            legR: new Limb(
                { ...leg, region: [0, 16], overlayRegion: [0, 32] },
                this.state,
            ),
            armL: new Limb(
                { ...arm, region: [32, 48], overlayRegion: [48, 48] },
                this.state,
            ),
            armR: new Limb(
                { ...arm, region: [40, 16], overlayRegion: [40, 32] },
                this.state,
            ),
        };
        this.limbs.legL.holder.position.set(2, 12, 0);
        this.limbs.legR.holder.position.set(-2, 12, 0);
        this.object.add(this.limbs.legL.holder, this.limbs.legR.holder);
        this.torso.add(this.limbs.armL.holder, this.limbs.armR.holder);
        this.refreshArms();
    }

    private box(
        w: number,
        h: number,
        d: number,
        inflate: number,
        region: Region,
        overlay = false,
    ) {
        const g = new BoxGeometry(w + inflate, h + inflate, d + inflate);
        remapUV(g, w + inflate, h + inflate, d + inflate, region);
        const mesh = new Mesh(g, makeMaterial(this.state));
        this.statics.push(mesh);
        if (overlay) {
            this.overlays.push(mesh);
            mesh.visible = this.state.overlay;
        }
        return mesh;
    }

    /**
     * Apply a full pose to every bone. Called each frame by the viewer.
     * @param dt Seconds since the previous frame for cape spring simulation. 0 disables spring motion.
     */
    applyPose(p: Pose, dt = 0) {
        const setRot = (o: Object3D, r: Rot3) =>
            o.rotation.set(r.pitch * D2R, r.yaw * D2R, -r.roll * D2R, 'YXZ');

        this.object.position.set(p.position.x, p.position.y, p.position.z);
        setRot(this.object, p.rotation);
        setRot(this.torso, p.torso);
        setRot(this.head, p.head);

        const apply = (limb: Limb, side: 1 | -1, j: JointPose, bendSign: 1 | -1) => {
            limb.root.rotation.set(-j.forward * D2R, 0, j.out * D2R * side);
            limb.joint.rotation.set(bendSign * j.bend * D2R, 0, -j.bendIn * D2R * side);
        };
        apply(this.limbs.armL, 1, p.armL, -1);
        apply(this.limbs.armR, -1, p.armR, -1);
        apply(this.limbs.legL, 1, p.legL, 1);
        apply(this.limbs.legR, -1, p.legR, 1);

        if (this.cape.visible) {
            this.capeDynamics.update(p, dt);
            this.cape.apply(
                this.capeDynamics.swing,
                this.capeDynamics.bend,
                this.capeDynamics.sway,
            );
        }
    }

    /** Show or hide the cape. When shown, simulation starts at the target without an initial swing. */
    setCapeVisible(v: boolean) {
        if (v && !this.cape.visible) this.capeDynamics.reset();
        this.cape.visible = v;
    }

    get capeVisible() {
        return this.cape.visible;
    }

    /** Disable spring motion or configure it with stiffness, damping, and gravity. */
    setCapePhysics(o: boolean | CapePhysicsOptions) {
        this.capeDynamics.set(o);
    }

    /** World position of a limb's root, joint, or end, useful for attaching items and effects. */
    getJointWorldPosition(
        limb: LimbName,
        which: 'root' | 'joint' | 'end',
        target = new Vector3(),
    ) {
        this.object.updateMatrixWorld(true);
        const l = this.limbs[limb];
        if (which === 'root') return l.root.getWorldPosition(target);
        if (which === 'joint') return l.joint.getWorldPosition(target);
        target.set(0, -l.cfg.h * (1 - l.cfg.jointRatio), 0);
        return l.joint.localToWorld(target);
    }

    setBlendWidth(b: number) {
        this.state.blend = b;
        Object.values(this.limbs).forEach(l => l.setBlend(b));
    }

    setOverlayVisible(v: boolean) {
        this.state.overlay = v;
        this.overlays.forEach(m => (m.visible = v));
        Object.values(this.limbs).forEach(l => (l.overlay.visible = v));
    }

    setWireframe(v: boolean) {
        this.state.wireframe = v;
        this.statics.forEach(m => ((m.material as SkinMaterial).wireframe = v));
        this.cape.setWireframe(v);
        Object.values(this.limbs).forEach(l => l.setWireframe(v));
    }

    /**
     * Render the skin without lighting calculations using MeshBasicMaterial.
     * Called automatically by the viewer according to LightRig.
     */
    setUnlit(v: boolean) {
        if (this.state.unlit === v) return;
        this.state.unlit = v;
        this.statics.forEach(m => swapMaterial(m, this.state));
        Object.values(this.limbs).forEach(l => l.refreshMaterials());
        this.cape.refreshMaterials();
    }

    get unlit() {
        return this.state.unlit;
    }

    setArmModel(mode: ArmModel) {
        this.armMode = mode;
        this.refreshArms();
    }

    /**
     * Match arm width (classic 4px / slim 3px) to the selected mode and detected skin model.
     * Rebuild arms only when their width changes, preserving animation and attached objects
     * when switching between skins with the same model.
     */
    refreshArms() {
        const slim = this.isSlim();
        const w = slim ? 3 : 4;
        let rebuilt = false;
        for (const [name, side] of [
            ['armL', 1],
            ['armR', -1],
        ] as const) {
            const limb = this.limbs[name];
            if (limb.cfg.w !== w) {
                limb.build({ ...limb.cfg, w });
                rebuilt = true;
            }
            limb.holder.position.set(side * (4 + w / 2), 12, 0);
        }
        if (rebuilt) this.onRebuild?.();
    }

    isSlim() {
        return (
            this.armMode === 'slim' ||
            (this.armMode === 'auto' && this.state.skin.info.slim)
        );
    }

    dispose() {
        this.statics.forEach(m => {
            m.geometry.dispose();
            (m.material as Material).dispose();
        });
        Object.values(this.limbs).forEach(l => l.dispose());
        this.cape.dispose();
    }
}
