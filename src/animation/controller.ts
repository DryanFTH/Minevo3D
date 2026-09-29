import type { AnimationFn, AnimationSource } from '@/animation/animations';
import { BUILT_IN_ANIMATIONS } from '@/animation/animations';
import { EASINGS, lerpPose, mergePartial, resolvePose } from '@/character/pose';
import type { CharacterRig } from '@/character/rig';
import type { CameraState } from '@/rendering/camera';
import type { PartialPose, Pose } from '@/types/types';

export interface PlayOptions {
    /** Transition duration in seconds from the current pose to the new animation. Defaults to controller.transition. */
    transition?: number;

    /** Restart the animation timeline even if the same animation is already playing. */
    restart?: boolean;
}

/**
 * Controls the active animation, timing, cross-fades, and pose overrides.
 */
export class AnimationController {
    /** Custom animations take precedence over built-in animations. */
    registry: Record<string, AnimationFn> = {};
    speed = 1;
    intensity = 1;
    transition = 0.25;

    /** Pose values that override the animation; unspecified joints remain unchanged. */
    override: PartialPose | undefined;

    /** Camera state provider used by animation contexts. */
    getCameraState: () => CameraState = () => ({
        distance: 62,
        azimuth: 40,
        polar: 72,
        zoom: 1,
        fov: 40,
        keepFraming: false,
    });

    private current: AnimationFn | null = null;
    private currentSource: AnimationSource | undefined = undefined;
    private time = 0;
    private from: Pose | null = null;
    private blend = 1;
    private duration = 0;
    private lastOut: Pose = resolvePose();

    constructor(private rig: CharacterRig) {}

    resolve(source: AnimationSource): AnimationFn | null {
        if (source == null) {
            return null;
        }

        if (typeof source === 'function') {
            return source;
        }

        return (
            this.registry[source] ??
            (BUILT_IN_ANIMATIONS as Record<string, AnimationFn>)[source] ??
            null
        );
    }

    play(source: AnimationSource, opts: PlayOptions = {}) {
        if (!opts.restart && source === this.currentSource && this.current) {
            return;
        }

        const next = this.resolve(source);

        if (source != null && typeof source === 'string' && !next) {
            console.warn(`[MinecraftCharacter] Animation "${source}" was not found.`);
        }

        const duration = opts.transition ?? this.transition;
        this.from = duration > 0 ? this.lastOut : null;
        this.duration = duration;
        this.blend = duration > 0 ? 0 : 1;
        this.current = next;
        this.currentSource = source;
        this.time = 0;
    }

    /**
     * Restarts the current animation from the beginning without changing it.
     * A positive transition cross-fades from the current pose; the default is immediate.
     */
    restart(opts: { transition?: number } = {}) {
        const duration = Math.max(0, opts.transition ?? 0);
        this.time = 0;
        this.from = duration > 0 ? this.lastOut : null;
        this.duration = duration;
        this.blend = duration > 0 ? 0 : 1;
    }

    /** Calculates the final pose for this frame. */
    update(dt: number, paused = false): Pose {
        const delta = paused ? 0 : dt;
        const scaledDelta = delta * this.speed;
        this.time += scaledDelta;

        let pose = resolvePose(
            this.current
                ? this.current({
                      time: this.time,
                      delta: scaledDelta,
                      intensity: this.intensity,
                      rig: this.rig,
                      camera: this.getCameraState(),
                  })
                : undefined,
        );

        if (this.from && this.blend < 1) {
            this.blend = Math.min(1, this.blend + delta / Math.max(this.duration, 1e-6));
            pose = lerpPose(this.from, pose, EASINGS.easeInOut(this.blend));

            if (this.blend >= 1) {
                this.from = null;
            }
        }

        this.lastOut = pose;

        return this.override ? resolvePose(mergePartial(pose, this.override)) : pose;
    }
}
