import {
    EASINGS,
    type EaseFn,
    type EaseName,
    POSE_FLOATING,
    POSE_SITTING,
    lerpPose,
    mergePartial,
    resolvePose,
} from '@/character/pose';
import type { CharacterRig } from '@/character/rig';
import type { CameraState } from '@/rendering/camera';
import type { JointPose, PartialPose, Pose } from '@/types/types';

export interface AnimationContext {
    /** Seconds since the animation started (already multiplied by animationSpeed). */
    time: number;

    /** This frame's time delta in seconds (already multiplied by animationSpeed). */
    delta: number;

    /** Amplitude multiplier (`intensity` prop). */
    intensity: number;

    /** Rig access when needed (for example, to read hand positions). */
    rig: CharacterRig;

    /** Current base camera state (zoom/FOV target, angles, etc.), for example for dolly zoom animations. */
    camera: CameraState;
}

/**
 * An animation is called every frame and returns a PARTIAL pose.
 * Joints not specified follow the neutral pose.
 */
export type AnimationFn = (ctx: AnimationContext) => PartialPose;

export type BuiltInAnimationName = 'idle' | 'walk' | 'run' | 'float' | 'wave' | 'sit';

/** Built-in name, custom animation name (from the `animations` prop), direct function, or null (neutral pose). */
export type AnimationSource = BuiltInAnimationName | (string & {}) | AnimationFn | null;

const sin = Math.sin;
const PI2 = Math.PI * 2;

// ---------------------------------------------------------------------------
// Built-in animations (all have factories so their parameters can be changed)
// ---------------------------------------------------------------------------

export interface IdleOptions {
    /** Breathing motion strength (1 = default). */
    breathing?: number;

    /** Slow head-turn strength (1 = default). */
    look?: number;
}

export function createIdleAnimation({
    breathing = 1,
    look = 1,
}: IdleOptions = {}): AnimationFn {
    return ({ time: t, intensity: k }) => {
        const b = sin(t * 1.8);
        return {
            torso: { pitch: b * 0.8 * breathing * k },
            head: {
                yaw: sin(t * 0.5) * 6 * look * k,
                pitch: sin(t * 0.9) * 2 * look * k,
            },
            armL: { forward: b * 2 * breathing * k, out: 3 + b * breathing * k },
            armR: { forward: -b * 2 * breathing * k, out: 3 + b * breathing * k },
            cape: { swing: sin(t * 1.1) * 1.5 * breathing * k },
        };
    };
}

export interface WalkOptions {
    /** Full cycles (2 steps) per second. */
    frequency?: number;

    /** Maximum thigh swing (degrees). */
    legSwing?: number;

    /** Maximum knee bend while swinging the leg forward. */
    knee?: number;

    /** Maximum arm swing. */
    armSwing?: number;

    /** Additional elbow bend while the arm is forward. */
    elbow?: number;

    /** Base elbow bend. */
    elbowBase?: number;

    /** Body bob (units). */
    bob?: number;

    /** Body twist (degrees). */
    twist?: number;

    /** Forward body lean (degrees, + = forward). */
    lean?: number;

    /** Cape swing strength while walking (degrees). Default 6. Only applies when a cape is loaded. */
    cape?: number;
}

export function createWalkAnimation(o: WalkOptions = {}): AnimationFn {
    const {
        frequency = 1,
        legSwing = 30,
        knee = 55,
        armSwing = 27,
        elbow = 35,
        elbowBase = 8,
        bob = 0.35,
        twist = 4,
        lean = 0,
        cape = 6,
    } = o;
    return ({ time, intensity: k }) => {
        const p = time * PI2 * frequency;
        const leg = (ph: number): Partial<JointPose> => ({
            forward: legSwing * k * sin(ph),
            bend: knee * k * Math.max(0, Math.cos(ph)), // The knee bends as the leg swings forward.
        });
        const arm = (ph: number): Partial<JointPose> => {
            const a = -sin(ph); // The arm moves opposite to the leg on the same side.
            return {
                forward: armSwing * k * a,
                bend: (elbowBase + elbow * Math.max(0, a)) * k,
            };
        };
        return {
            position: { y: Math.abs(Math.cos(p)) * bob * k },
            torso: { yaw: twist * k * sin(p), pitch: lean * k },
            legL: leg(p),
            legR: leg(p + Math.PI),
            armL: arm(p),
            armR: arm(p + Math.PI),
            // The cape flutters twice per cycle (once per step), with its tip trailing slightly.
            cape: {
                swing: cape * k * (0.7 + 0.3 * Math.cos(2 * p)),
                bend: cape * 0.6 * k * (0.5 + 0.5 * sin(2 * p)),
                sway: twist * 0.5 * k * sin(p),
            },
        };
    };
}

export function createRunAnimation(o: WalkOptions = {}): AnimationFn {
    return createWalkAnimation({
        frequency: 1.8,
        legSwing: 50,
        knee: 90,
        armSwing: 45,
        elbow: 70,
        elbowBase: 50,
        bob: 1,
        twist: 8,
        lean: 12,
        cape: 22,
        ...o,
    });
}

export interface FloatOptions {
    /** Base floating pose (default: POSE_FLOATING). */
    pose?: PartialPose;

    /** Height above the floor (units). */
    height?: number;

    /** Bob amplitude (units). */
    bob?: number;

    /** Bob speed (rad/s). */
    bobSpeed?: number;

    /** Body sway (degrees). */
    sway?: number;

    /** Sway speed (rad/s). */
    swaySpeed?: number;
}

export function createFloatAnimation(o: FloatOptions = {}): AnimationFn {
    const {
        pose = POSE_FLOATING,
        height = 7,
        bob = 0.9,
        bobSpeed = 1.6,
        sway = 7,
        swaySpeed = 0.6,
    } = o;
    return ({ time: t, intensity: k }) => {
        const b = sin(t * bobSpeed);
        return mergePartial(pose, {
            position: { y: height + b * bob * k },
            rotation: { yaw: sin(t * swaySpeed) * sway * k },
            armR: { forward: (pose.armR?.forward ?? 0) + b * 2.3 * k },
            cape: { swing: b * 3 * k },
        });
    };
}

export interface WaveOptions {
    /** Arm to wave. */
    side?: 'L' | 'R';

    /** Wave speed (rad/s). */
    speed?: number;

    /** Wave angle (degrees). */
    amplitude?: number;
}

/** Controls one arm and slightly moves the head; combine with walk/idle using combineAnimations. */
export function createWaveAnimation({
    side = 'R',
    speed = 9,
    amplitude = 28,
}: WaveOptions = {}): AnimationFn {
    const key = side === 'R' ? 'armR' : 'armL';
    return ({ time: t, intensity: k }) => ({
        [key]: {
            forward: 0,
            out: 130,
            bend: 20,
            bendIn: sin(t * speed) * amplitude * k,
        },
        head: { roll: sin(t * speed * 0.5) * 3 * k },
        offset: {
            armR: {
                x: 1.6,
                y: -2,
            },
        },
    });
}

// ---------------------------------------------------------------------------
// Camera animations (fill the `camera` channel in the pose and can be combined with body animations)
// ---------------------------------------------------------------------------

export interface DollyZoomOptions {
    /** Starting FOV (degrees). Defaults to the base camera FOV when the animation runs. */
    from?: number;

    /** Target FOV (degrees). */
    to: number;

    /** One-way duration (seconds). */
    duration: number;

    /** Go back and forth from -> to -> from. Defaults to false. */
    yoyo?: boolean;

    /** Repeat continuously. Defaults to false (stops at `to`, or at `from` when using yoyo). */
    loop?: boolean;

    ease?: EaseName | EaseFn;
}

/**
 * "Dolly zoom" (Vertigo effect): the FOV changes while the character stays the same size on screen,
 * so only the background/body perspective expands or contracts. Zoom is compensated automatically;
 * when `camera.keepFraming` is enabled, the camera handles the compensation.
 */
export function createDollyZoomAnimation(o: DollyZoomOptions): AnimationFn {
    const { to, duration, yoyo = false, loop = false, ease } = o;
    const easeFn: EaseFn =
        typeof ease === 'function' ? ease : EASINGS[ease ?? 'easeInOut'];
    const cycle = yoyo ? duration * 2 : duration;
    const tanHalf = (deg: number) => Math.tan((deg * Math.PI) / 360);
    const fromOption = o.from;

    return ({ time, camera }) => {
        const base = camera.fov;
        const from = fromOption ?? base;
        const t = loop ? time % cycle : Math.min(time, cycle);
        const raw = yoyo
            ? t <= duration
                ? t / duration
                : 2 - t / duration
            : t / duration;
        const f = from + (to - from) * easeFn(Math.min(1, Math.max(0, raw)));

        return {
            camera: {
                fov: f - base,
                zoom: camera.keepFraming ? 1 : tanHalf(f) / tanHalf(base),
            },
        };
    };
}

export interface CameraShakeOptions {
    /** Maximum deviation (degrees). Defaults to 1.2. */
    amplitude?: number;

    /** Shake frequency (Hz). Defaults to 18. */
    frequency?: number;

    /** Duration (seconds). Without a duration, shaking continues indefinitely. The camera stops afterward. */
    duration?: number;

    /** Fade amplitude to 0 over the duration. Defaults to true. */
    decay?: boolean;
}

/** Camera shake (earthquake/explosion). Deterministic (no randomness), so it can be replayed and tested. */
export function createCameraShake({
    amplitude = 1.2,
    frequency = 18,
    duration,
    decay = true,
}: CameraShakeOptions = {}): AnimationFn {
    return ({ time, intensity }) => {
        let amp = amplitude * intensity;

        if (duration !== undefined) {
            if (time >= duration) {
                return { camera: { azimuth: 0, polar: 0 } };
            }

            if (decay) amp *= (1 - time / duration) ** 2;
        }

        const w = time * frequency * PI2;

        return {
            camera: {
                azimuth: amp * (0.6 * sin(w) + 0.4 * sin(1.7 * w + 1.3)),
                polar: amp * (0.6 * sin(1.3 * w + 0.7) + 0.4 * sin(2.3 * w + 2.1)),
            },
        };
    };
}

export const idle = createIdleAnimation();
export const walk = createWalkAnimation();
export const run = createRunAnimation();
export const float = createFloatAnimation();
export const wave = createWaveAnimation();
export const sit: AnimationFn = ctx => mergePartial(idle(ctx), POSE_SITTING);

export const BUILT_IN_ANIMATIONS: Record<BuiltInAnimationName, AnimationFn> = {
    idle,
    walk,
    run,
    float,
    wave,
    sit,
};

// ---------------------------------------------------------------------------
// Animation utilities
// ---------------------------------------------------------------------------

/** Combine animations; later animations override shared joints. For example, combineAnimations(walk, wave). */
export function combineAnimations(...anims: AnimationFn[]): AnimationFn {
    return ctx => mergePartial(...anims.map(a => a(ctx)));
}

export interface Keyframe {
    /** Seconds since the animation started. */
    time: number;

    pose: PartialPose;

    /** Easing toward the NEXT keyframe (defaults to the global easing). */
    ease?: EaseName | EaseFn;
}

export interface KeyframeAnimationOptions {
    /** Total duration (seconds). When looping, the last keyframe connects back to the first. */
    duration: number;

    keyframes: Keyframe[];

    loop?: boolean;

    /** Base pose for joints not specified in keyframes. */
    base?: PartialPose;

    /** Default easing between keyframes. */
    ease?: EaseName | EaseFn;

    /**
     * Return only these channels (for example, ['camera']). Without this, the animation returns a FULL POSE,
     * overriding all other joints with neutral values when combined using combineAnimations.
     */
    channels?: ReadonlyArray<keyof Pose>;
}

/** Create an animation from pose keyframes. */
export function createKeyframeAnimation(opts: KeyframeAnimationOptions): AnimationFn {
    const { duration, loop = true, base, ease: defaultEase = 'easeInOut' } = opts;
    const keyframes = opts.keyframes;

    if (!keyframes.length) {
        throw new Error('createKeyframeAnimation: keyframes cannot be empty.');
    }

    const toFn = (ease: EaseName | EaseFn | undefined): EaseFn =>
        typeof ease === 'function' ? ease : EASINGS[ease ?? 'easeInOut'];

    type Frame = {
        time: number;
        pose: Pose;
        ease: EaseFn;
    };

    const frames = keyframes
        .slice()
        .sort((a, b) => a.time - b.time)
        .map((keyframe): Frame => ({
            time: keyframe.time,
            pose: resolvePose(mergePartial(base, keyframe.pose)),
            ease: toFn(keyframe.ease ?? defaultEase),
        }));

    const first = frames.at(0);
    const last = frames.at(-1);

    if (!first || !last) {
        throw new Error('createKeyframeAnimation: keyframes cannot be empty.');
    }

    const track: readonly Frame[] = loop
        ? [
              { ...last, time: last.time - duration },
              ...frames,
              { ...first, time: first.time + duration },
          ]
        : frames;

    const evalAt = ({ time }: AnimationContext): Pose => {
        const t = loop
            ? ((time % duration) + duration) % duration
            : Math.min(Math.max(time, 0), duration);

        if (!loop) {
            if (t <= first.time) return first.pose;
            if (t >= last.time) return last.pose;
        }

        for (let i = 0; i < track.length - 1; i++) {
            const a = track[i];
            const b = track[i + 1];

            if (!a || !b) continue;

            if (t >= a.time && t < b.time) {
                const u = (t - a.time) / (b.time - a.time);

                return lerpPose(a.pose, b.pose, a.ease(u));
            }
        }
        return last.pose;
    };

    const channels = opts.channels;

    return c => {
        const p = evalAt(c);

        if (!channels) return p;

        const out: Record<string, unknown> = {};

        for (const channel of channels) {
            out[channel] = p[channel];
        }

        return out as PartialPose;
    };
}

export interface CameraKeyframe {
    /** Seconds since the animation started. */
    time: number;

    /** Camera channel (zoom multiplier, FOV/azimuth/polar offsets, target shift). */
    camera: PartialPose['camera'];

    /** Easing toward the NEXT keyframe. */
    ease?: EaseName | EaseFn;
}

export interface CameraKeyframeAnimationOptions {
    duration: number;

    keyframes: CameraKeyframe[];

    loop?: boolean;

    ease?: EaseName | EaseFn;
}

/**
 * Camera animation from keyframes (zoom, FOV, orbit, focus). Only fills the `camera` channel,
 * so it is safe to combine with body animations: combineAnimations(walk, createCameraKeyframeAnimation({...})).
 * Zoom is interpolated geometrically.
 */
export function createCameraKeyframeAnimation(
    o: CameraKeyframeAnimationOptions,
): AnimationFn {
    return createKeyframeAnimation({
        duration: o.duration,
        loop: o.loop,
        ease: o.ease,
        channels: ['camera'],
        keyframes: o.keyframes.map(keyframe => ({
            time: keyframe.time,
            ease: keyframe.ease,
            pose: { camera: keyframe.camera },
        })),
    });
}
