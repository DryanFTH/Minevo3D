import type { JointPose, PartialPose, Pose, Rot3, Vec3 } from '@/types/types';

const rot = (): Rot3 => ({ pitch: 0, yaw: 0, roll: 0 });
const joint = (): JointPose => ({ forward: 0, out: 0, bend: 0, bendIn: 0 });
const vec = (): Vec3 => ({ x: 0, y: 0, z: 0 });

/** Neutral pose: standing straight with arms hanging. */
export const REST_POSE: Pose = {
    position: { x: 0, y: 0, z: 0 },
    rotation: rot(),
    torso: rot(),
    head: rot(),
    armL: joint(),
    armR: joint(),
    legL: joint(),
    legR: joint(),
    camera: {
        zoom: 1,
        fov: 0,
        azimuth: 0,
        polar: 0,
        target: { x: 0, y: 0, z: 0 },
    },
    cape: { swing: 0, bend: 0, sway: 0 },
    offset: {
        head: vec(),
        torso: vec(),
        armL: vec(),
        armR: vec(),
        legL: vec(),
        legR: vec(),
    },
};

/** Relaxed floating pose: leaning back, one hand at the cheek, and one arm raised. */
export const POSE_FLOATING: PartialPose = {
    position: { y: 7 },
    torso: { pitch: -15, yaw: 14 },
    head: { pitch: 8, yaw: 12 },
    armL: { forward: 58, out: 11, bend: 115, bendIn: 17 },
    armR: { forward: 5, out: 118, bend: 60, bendIn: -15 },
    legL: { forward: 70, out: 8, bend: 90 },
    legR: { forward: 40, out: 25, bend: 60 },
    offset: {
        armR: {
            x: 2,
            y: -2,
        },
    },
};

/** Sitting pose with horizontal thighs and vertical shins. */
export const POSE_SITTING: PartialPose = {
    position: { y: -6 },
    armL: { forward: 25, out: 4, bend: 55 },
    armR: { forward: 25, out: 4, bend: 55 },
    legL: { forward: 90, out: 3, bend: 90 },
    legR: { forward: 90, out: 3, bend: 90 },
};

/** Face close-up camera (3x zoom, focused on the head). Combine with any animation using mergePartial or a keyframe. */
export const CAMERA_FACE_CLOSEUP: PartialPose = {
    camera: {
        zoom: 3,
        target: { y: 12 },
    },
};

type Obj = Record<string, any>;

/** Merge partial poses, with later sources overriding earlier ones. Always returns a new object. */
export function mergePartial(...sources: Array<PartialPose | undefined>): PartialPose {
    const out: Obj = {};

    for (const src of sources) {
        if (!src) continue;

        for (const key of Object.keys(src)) {
            const v = (src as Obj)[key];
            if (v === undefined) continue;

            if (typeof v === 'number') {
                out[key] = v;
            } else if (typeof v === 'string') {
                // Numeric strings (for example, from an <input>) count as numbers. Anything else is ignored
                // instead of being walked character by character, which never terminates.
                const n = Number(v);
                if (v.trim() !== '' && Number.isFinite(n)) out[key] = n;
            } else if (typeof v === 'object' && v !== null) {
                out[key] = mergePartial(out[key], v);
            }
        }
    }

    return out as PartialPose;
}

/** Complete a partial pose using values from REST_POSE. */
export function resolvePose(partial?: PartialPose): Pose {
    return mergePartial(REST_POSE, partial) as Pose;
}

function deepMap(a: Obj, b: Obj, f: (x: number, y: number) => number): Obj {
    const out: Obj = {};

    for (const k of Object.keys(a)) {
        out[k] = typeof a[k] === 'number' ? f(a[k], b[k]) : deepMap(a[k], b[k], f);
    }

    return out;
}

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
    const out = deepMap(a, b, (x, y) => x + (y - x) * t) as Pose;

    // Zoom is a multiplier, so geometric interpolation keeps its rate constant (1x to 4x passes through 2x halfway).
    if (a.camera.zoom > 0 && b.camera.zoom > 0) {
        out.camera.zoom = a.camera.zoom * Math.pow(b.camera.zoom / a.camera.zoom, t);
    }

    return out;
}

export type EaseName = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'step';

export type EaseFn = (t: number) => number;

export const EASINGS: Record<EaseName, EaseFn> = {
    linear: t => t,
    easeIn: t => t * t,
    easeOut: t => 1 - (1 - t) * (1 - t),
    easeInOut: t => t * t * (3 - 2 * t),
    step: t => (t >= 1 ? 1 : 0),
};
