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
import type {
    JointPose,
    LimbName,
    PartName,
    PartOffsets,
    PartRotation,
    PartRotations,
    PartialPartOffsets,
    PartialPartRotations,
    Pose,
    Rot3,
    Vec3,
} from '@/types/types';

export type ArmModel = 'auto' | 'classic' | 'slim';

const SEGMENTS = 16;
const D2R = Math.PI / 180;

const PART_NAMES: readonly PartName[] = ['head', 'torso', 'armL', 'armR', 'legL', 'legR'];

const zeroOffsets = (): PartOffsets => ({
    head: { x: 0, y: 0, z: 0 },
    torso: { x: 0, y: 0, z: 0 },
    armL: { x: 0, y: 0, z: 0 },
    armR: { x: 0, y: 0, z: 0 },
    legL: { x: 0, y: 0, z: 0 },
    legR: { x: 0, y: 0, z: 0 },
});

const zeroRot = (): Rot3 => ({ pitch: 0, yaw: 0, roll: 0 });
const zeroJoint = (): JointPose => ({ forward: 0, out: 0, bend: 0, bendIn: 0 });

const zeroRotations = (): PartRotations => ({
    head: zeroRot(),
    torso: zeroRot(),
    armL: zeroJoint(),
    armR: zeroJoint(),
    legL: zeroJoint(),
    legR: zeroJoint(),
});

/** Used when no pose has been applied yet, so manual rotations still take effect on their own. */
const REST_ROT: Readonly<Rot3> = Object.freeze(zeroRot());
const REST_JOINT: Readonly<JointPose> = Object.freeze(zeroJoint());

/** Rotation fields of every part, used to validate and copy manual rotations. */
const ROT_FIELDS: readonly (keyof Rot3)[] = ['pitch', 'yaw', 'roll'];
const JOINT_FIELDS: readonly (keyof JointPose)[] = ['forward', 'out', 'bend', 'bendIn'];

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

    pivotX: number;
    pivotDrop: number;
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
        this.jointY = -cfg.h * cfg.jointRatio + cfg.pivotDrop;

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
        const { w, h, d, pivotX, pivotDrop } = this.cfg;
        const g = new BoxGeometry(w + inflate, h + inflate, d + inflate, 1, SEGMENTS, 1);
        remapUV(g, w + inflate, h + inflate, d + inflate, [reg[0], reg[1], w, h, d]);
        g.translate(-pivotX, -h / 2 + pivotDrop, 0);

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

    /**
     * Position offsets for body parts (skin pixels), added to each part's normal position. Animations
     * add their own offsets (`pose.offset`) on top of these instead of replacing them. See PartOffsets.
     */
    partOffsets?: PartialPartOffsets;

    /**
     * Manual rotation (degrees) of the head, torso, and the arm and leg joints. This is the BASE rotation of
     * each part: animations and poses (`pose.head`, `pose.armL`, ...) are added on top of it instead of
     * replacing it. Change it later with `rig.setPartRotation()` / `setPartRotations()`. See PartRotations.
     */
    partRotations?: PartialPartRotations;
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

    /** Normal (structural) position of each part, before any offsets. */
    private readonly base: Record<PartName, Vector3> = {
        head: new Vector3(0, 12, 0),
        torso: new Vector3(0, 12, 0),
        armL: new Vector3(5, 10, 0),
        armR: new Vector3(-5, 10, 0),
        legL: new Vector3(2, 12, 0),
        legR: new Vector3(-2, 12, 0),
    };
    /** Offsets set on the rig. Animations never write to these. */
    private readonly offsets: PartOffsets = zeroOffsets();
    /** Offsets from the pose applied last (the animation's part), kept so a rig change can re-place parts at once. */
    private poseOffset: PartOffsets | undefined;

    /** Manual (base) rotation of each part. Animations never write to these; they are added to by the pose. */
    private readonly rotations: PartRotations = zeroRotations();
    /** The pose applied last, kept so a manual rotation change can take effect at once, even while paused. */
    private lastPose: Pose | undefined;

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
        this.assignOffsets(opts.partOffsets);
        this.assignRotations(opts.partRotations);

        const headBase = this.box(8, 8, 8, 0, [0, 0, 8, 8, 8]);
        const headOver = this.box(8, 8, 8, 1, [32, 0, 8, 8, 8], true);

        headBase.position.y = 4;
        headOver.position.y = 4;

        this.head.add(headBase, headOver);

        const bodyBase = this.box(8, 12, 4, 0, [16, 16, 8, 12, 4]);
        const bodyOver = this.box(8, 12, 4, 0.5, [16, 32, 8, 12, 4], true);
        const body = new Group();
        body.position.set(0, 6, 0);
        body.add(bodyBase, bodyOver);

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

        const leg = { w: 4, h: 12, d: 4, jointRatio: 0.5, pivotX: 0, pivotDrop: 0 };
        const arm = { w: 4, h: 12, d: 4, jointRatio: 0.5, pivotDrop: 2 };
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
                { ...arm, pivotX: -1, region: [32, 48], overlayRegion: [48, 48] },
                this.state,
            ),
            armR: new Limb(
                { ...arm, pivotX: 1, region: [40, 16], overlayRegion: [40, 32] },
                this.state,
            ),
        };
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
     * Head, torso, and limb rotations are the manual rotation of the rig (`setPartRotation`) plus the
     * rotation in the pose, so the animation adds to the manual value instead of overwriting it.
     * @param dt Seconds since the previous frame for cape spring simulation. 0 disables spring motion.
     */
    applyPose(p: Pose, dt = 0) {
        const setRot = (o: Object3D, r: Rot3) =>
            o.rotation.set(r.pitch * D2R, r.yaw * D2R, -r.roll * D2R, 'YXZ');

        this.lastPose = p;

        this.object.position.set(p.position.x, p.position.y, p.position.z);
        setRot(this.object, p.rotation);

        // Part positions: normal position + rig offset + animation offset (the animation only adds to the rig).
        this.poseOffset = p.offset;
        this.placeParts();

        // Part rotations: manual rotation + animation rotation.
        this.placeRotations();

        if (this.cape.visible) {
            // The cape follows the real torso angle, which includes the manual rotation.
            const tilt = this.rotations.torso.pitch;
            const cp =
                tilt === 0
                    ? p
                    : { ...p, torso: { ...p.torso, pitch: p.torso.pitch + tilt } };
            this.capeDynamics.update(cp, dt);
            this.cape.apply(
                this.capeDynamics.swing,
                this.capeDynamics.bend,
                this.capeDynamics.sway,
            );
        }
    }

    // ---------------------------------------------------------------- Part rotations

    /** Set the rotation of the head, torso, and limb joints to: manual rotation + the last pose's rotation. */
    private placeRotations() {
        const p = this.lastPose;
        const r = this.rotations;

        const setRot = (o: Object3D, base: Rot3, a: Readonly<Rot3>) =>
            o.rotation.set(
                (base.pitch + a.pitch) * D2R,
                (base.yaw + a.yaw) * D2R,
                -(base.roll + a.roll) * D2R,
                'YXZ',
            );
        setRot(this.torso, r.torso, p?.torso ?? REST_ROT);
        setRot(this.head, r.head, p?.head ?? REST_ROT);

        const apply = (
            limb: Limb,
            side: 1 | -1,
            base: JointPose,
            a: Readonly<JointPose>,
            bendSign: 1 | -1,
        ) => {
            const forward = base.forward + a.forward;
            const out = base.out + a.out;
            const bend = base.bend + a.bend;
            const bendIn = base.bendIn + a.bendIn;
            limb.root.rotation.set(-forward * D2R, 0, out * D2R * side);
            limb.joint.rotation.set(bendSign * bend * D2R, 0, -bendIn * D2R * side);
        };
        apply(this.limbs.armL, 1, r.armL, p?.armL ?? REST_JOINT, -1);
        apply(this.limbs.armR, -1, r.armR, p?.armR ?? REST_JOINT, -1);
        apply(this.limbs.legL, 1, r.legL, p?.legL ?? REST_JOINT, 1);
        apply(this.limbs.legR, -1, r.legR, p?.legR ?? REST_JOINT, 1);
    }

    /** Copy the finite numeric fields of `src` into `cur`. Anything else (NaN, strings, undefined) is ignored. */
    private assignRotation<T extends Rot3 | JointPose>(
        cur: T,
        src: Partial<T> | undefined,
        fields: readonly (keyof T)[],
    ) {
        if (!src) return;
        for (const f of fields) {
            const v = src[f];
            if (typeof v === 'number' && Number.isFinite(v)) cur[f] = v as T[keyof T];
        }
    }

    private assignRotations(src: PartialPartRotations | undefined) {
        if (!src) return;
        this.assignRotation(this.rotations.head, src.head, ROT_FIELDS);
        this.assignRotation(this.rotations.torso, src.torso, ROT_FIELDS);
        this.assignRotation(this.rotations.armL, src.armL, JOINT_FIELDS);
        this.assignRotation(this.rotations.armR, src.armR, JOINT_FIELDS);
        this.assignRotation(this.rotations.legL, src.legL, JOINT_FIELDS);
        this.assignRotation(this.rotations.legR, src.legR, JOINT_FIELDS);
    }

    /**
     * Set the manual rotation of one part, in degrees. `head` and `torso` take `{ pitch, yaw, roll }`; the
     * arms and legs take `{ forward, out, bend, bendIn }` (the same fields as in a pose). Only the fields you
     * pass change; the others keep their current value. Takes effect immediately and keeps working while an
     * animation plays: the animation's own rotation (`pose.head`, `pose.armL`, ...) is ADDED on top, so it
     * only adds to or subtracts from this value. See PartRotations.
     */
    setPartRotation<P extends PartName>(part: P, rotation: Partial<PartRotation<P>>) {
        this.assignRotations({ [part]: rotation } as PartialPartRotations);
        this.placeRotations();
    }

    /**
     * Replace all manual rotations. Parts and fields that are not given go back to 0, so the result depends
     * only on the object passed in (`undefined` clears everything).
     */
    setPartRotations(rotations?: PartialPartRotations) {
        const zero = zeroRotations();
        for (const part of PART_NAMES) Object.assign(this.rotations[part], zero[part]);
        this.assignRotations(rotations);
        this.placeRotations();
    }

    /** Manual rotation of one part (a copy; does not include the animation's rotation). */
    getPartRotation<P extends PartName>(part: P): PartRotation<P> {
        return { ...this.rotations[part] };
    }

    /** Manual rotations of all parts (a copy; does not include the animation's rotations). */
    getPartRotations(): PartRotations {
        const out = zeroRotations();
        for (const part of PART_NAMES) Object.assign(out[part], this.rotations[part]);
        return out;
    }

    /** Set all manual rotations back to 0. */
    resetPartRotations() {
        this.setPartRotations();
    }

    // ---------------------------------------------------------------- Part offsets

    private objectOf(part: PartName): Object3D {
        switch (part) {
            case 'head':
                return this.head;
            case 'torso':
                return this.torso;
            default:
                return this.limbs[part].holder;
        }
    }

    /** Set every part's position to: normal position + rig offset + the animation's offset. */
    private placeParts() {
        for (const part of PART_NAMES) {
            const b = this.base[part];
            const o = this.offsets[part];
            const a = this.poseOffset?.[part];
            this.objectOf(part).position.set(
                b.x + o.x + (a?.x ?? 0),
                b.y + o.y + (a?.y ?? 0),
                b.z + o.z + (a?.z ?? 0),
            );
        }
    }

    private assignOffsets(src: PartialPartOffsets | undefined) {
        for (const part of PART_NAMES) {
            const v = src?.[part];
            const cur = this.offsets[part];
            if (v?.x !== undefined && Number.isFinite(v.x)) cur.x = v.x;
            if (v?.y !== undefined && Number.isFinite(v.y)) cur.y = v.y;
            if (v?.z !== undefined && Number.isFinite(v.z)) cur.z = v.z;
        }
    }

    /**
     * Move one body part away from its normal position by `offset` (skin pixels). Only the axes you pass
     * change; the others keep their current value. Takes effect immediately and keeps working while an
     * animation plays: the animation's own offsets (`pose.offset`) are added on top.
     * See PartOffsets for the coordinate space.
     */
    setPartOffset(part: PartName, offset: Partial<Vec3>) {
        this.assignOffsets({ [part]: offset });
        this.placeParts();
    }

    /**
     * Replace all rig offsets. Parts and axes that are not given go back to 0, so the result depends only
     * on the object passed in (`undefined` clears everything).
     */
    setPartOffsets(offsets?: PartialPartOffsets) {
        const zero = zeroOffsets();
        for (const part of PART_NAMES) Object.assign(this.offsets[part], zero[part]);
        this.assignOffsets(offsets);
        this.placeParts();
    }

    /** Offset set on the rig for one part (a copy; does not include the animation's offset). */
    getPartOffset(part: PartName): Vec3 {
        return { ...this.offsets[part] };
    }

    /** Offsets set on the rig for all parts (a copy; does not include the animation's offsets). */
    getPartOffsets(): PartOffsets {
        const out = zeroOffsets();
        for (const part of PART_NAMES) Object.assign(out[part], this.offsets[part]);
        return out;
    }

    /** Set all rig offsets back to 0. */
    resetPartOffsets() {
        this.setPartOffsets();
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
            this.base[name].set(side * 5, 10, 0);
        }
        this.placeParts();
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
