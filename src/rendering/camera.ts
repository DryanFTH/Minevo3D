import { MathUtils, PerspectiveCamera, Vector3 } from 'three';

import { EASINGS, type EaseFn, type EaseName } from '@/character/pose';
import type { CameraPose } from '@/types/types';

const D2R = Math.PI / 180;

/** Reference FOV for `keepFraming`: `distance` is measured at this FOV. */
export const REFERENCE_FOV = 40;
export const FOV_MIN = 5;
export const FOV_MAX = 120;
/** Effective zoom safety limits (after applying animation). User limits (minZoom/maxZoom) do not apply to animation. */
export const ZOOM_ABS_MIN = 0.05;
export const ZOOM_ABS_MAX = 50;

export interface CameraOptions {
    /** Base camera-to-target distance (units), measured at zoom 1. Default: 62. */
    distance?: number;

    /** Horizontal angle (degrees), 0 = front, + = character’s left side. Default: 40. */
    azimuth?: number;

    /** Vertical angle (degrees), 90 = level, smaller = from above. Default: 72. */
    polar?: number;

    /** Camera target [x, y, z]. Default: [0, 16, 0]. */
    target?: [number, number, number];

    /** Vertical field of view (degrees), 5–120. Smaller values flatten perspective; larger values create a wide-angle effect. Default: 40. */
    fov?: number;

    /** Zoom multiplier: 1 = normal, 2 = twice as close. Default: 1. */
    zoom?: number;

    /** Minimum zoom for user input / props. Default: 0.3. */
    minZoom?: number;

    /** Maximum zoom for user input / props. Default: 5. */
    maxZoom?: number;

    /**
     * When true, the character's screen size stays constant as FOV changes (the camera moves automatically),
     * changing only perspective strength ("dolly zoom"). Default: false.
     */
    keepFraming?: boolean;

    /** Zoom/FOV changes are smoothly animated (damped). Default: true. */
    smoothing?: boolean;
}

/** Camera destination values (not values midway through easing/tween). */
export interface CameraState {
    distance: number;

    azimuth: number;

    polar: number;

    zoom: number;

    fov: number;

    keepFraming: boolean;
}

export interface CameraSetOptions {
    /** Apply immediately without easing. */
    immediate?: boolean;

    /** Use these values as the “home” target for resetCamera(). */
    asHome?: boolean;
}

/** Camera animation target. All fields are optional; unspecified values remain unchanged. */
export interface CameraAnimateTarget {
    zoom?: number;

    fov?: number;

    azimuth?: number;

    polar?: number;

    distance?: number;

    target?: [number, number, number];
}

export interface CameraAnimateOptions {
    /** Duration (seconds). Default: 1. 0 = immediate. */
    duration?: number;

    /** Easing. Default: 'easeInOut'. */
    ease?: EaseName | EaseFn;

    /** Delay before starting (seconds). Default: 0. */
    delay?: number;
}

const IDENTITY: CameraPose = {
    zoom: 1,
    fov: 0,
    azimuth: 0,
    polar: 0,
    target: { x: 0, y: 0, z: 0 },
};
const clamp = MathUtils.clamp;

function ease(cur: number, goal: number, k: number) {
    const d = goal - cur;
    return Math.abs(d) < 1e-4 * Math.max(1, Math.abs(goal)) ? goal : cur + d * k;
}

type TweenKey = 'zoom' | 'fov' | 'azimuth' | 'polar' | 'distance' | 'tx' | 'ty' | 'tz';
type TweenGroup = {
    pending: number;
    interrupted: boolean;
    resolve: (completed: boolean) => void;
};

type Tween = {
    from: number;

    to: number;

    elapsed: number;

    delay: number;

    duration: number;

    ease: EaseFn;

    group: TweenGroup;
};

/**
 * DOM-free orbit camera with azimuth, polar angle, distance, zoom, FOV, damping, timed tweens,
 * animation offsets, limits, and reset support. Kept separate from the viewer for reuse and testing.
 *
 * Final camera values combine base values (props, user input, or tweens) with offsets from the
 * `camera` channel of the animation pose (zoom is multiplied; FOV, angles, and target are added).
 */
export class CameraController {
    readonly camera = new PerspectiveCamera(REFERENCE_FOV, 1, 0.5, 5000);
    readonly target = new Vector3(0, 16, 0);
    /** Point the camera actually looks at this frame (target + animation offset). Used by CameraLight. */
    readonly focus = new Vector3(0, 16, 0);

    distance = 62;
    azimuth = 40;
    polar = 72;

    minZoom = 0.3;
    maxZoom = 5;

    keepFraming = false;
    smoothing = true;

    private zoom = 1;
    private zoomGoal = 1;

    private fov = REFERENCE_FOV;
    private fovGoal = REFERENCE_FOV;

    private home = { distance: 62, azimuth: 40, polar: 72, zoom: 1, fov: REFERENCE_FOV };
    private tweens = new Map<TweenKey, Tween>();
    private lastOffset: CameraPose = IDENTITY;

    constructor(opts: CameraOptions = {}) {
        this.set(opts, { immediate: true, asHome: true });
        this.update(0);
    }

    /** Current base zoom (may differ from the destination during easing/tween; excludes animation offsets). */
    get currentZoom() {
        return this.zoom;
    }

    /** Current base FOV (excludes animation offsets). */
    get currentFov() {
        return this.fov;
    }

    /** Zoom actually used for this frame (includes animation multipliers). */
    get appliedZoom() {
        return this.zoomWith(this.lastOffset);
    }

    /** FOV actually used for this frame (includes animation offsets). */
    get appliedFov() {
        return this.fovWith(this.lastOffset);
    }

    /** Actual camera distance after zoom, keepFraming, and animation offsets. */
    get effectiveDistance() {
        return this.distanceFor(this.lastOffset);
    }

    /** Whether a camera tween is currently running. */
    get isAnimating() {
        return this.tweens.size > 0;
    }

    private zoomWith(o: CameraPose) {
        return clamp(this.zoom * o.zoom, ZOOM_ABS_MIN, ZOOM_ABS_MAX);
    }

    private fovWith(o: CameraPose) {
        return clamp(this.fov + o.fov, FOV_MIN, FOV_MAX);
    }

    private distanceFor(o: CameraPose) {
        const base = this.distance / this.zoomWith(o);
        if (!this.keepFraming) return base;
        return (
            (base * Math.tan((REFERENCE_FOV * D2R) / 2)) /
            Math.tan((this.fovWith(o) * D2R) / 2)
        );
    }

    set(c: CameraOptions, o: CameraSetOptions = {}) {
        if (c.minZoom !== undefined && c.minZoom > 0) this.minZoom = c.minZoom;
        if (c.maxZoom !== undefined && c.maxZoom > 0) this.maxZoom = c.maxZoom;
        if (this.minZoom > this.maxZoom) {
            [this.minZoom, this.maxZoom] = [this.maxZoom, this.minZoom];
        }

        if (c.keepFraming !== undefined) this.keepFraming = c.keepFraming;
        if (c.smoothing !== undefined) this.smoothing = c.smoothing;

        if (c.distance !== undefined && c.distance > 0) {
            this.cancelTween('distance');
            this.distance = c.distance;
            if (o.asHome) this.home.distance = this.distance;
        }
        if (c.azimuth !== undefined) {
            this.cancelTween('azimuth');
            this.azimuth = c.azimuth;
            if (o.asHome) this.home.azimuth = this.azimuth;
        }
        if (c.polar !== undefined) {
            this.cancelTween('polar');
            this.polar = clamp(c.polar, 1, 179);
            if (o.asHome) this.home.polar = this.polar;
        }
        if (c.target) {
            this.cancelTween('tx');
            this.cancelTween('ty');
            this.cancelTween('tz');
            this.target.set(...c.target);
        }

        // New zoom limits also apply to current values.
        this.zoomGoal = clamp(this.zoomGoal, this.minZoom, this.maxZoom);
        this.zoom = clamp(this.zoom, this.minZoom, this.maxZoom);
        if (c.zoom !== undefined) this.setZoom(c.zoom, o);
        if (c.fov !== undefined) this.setFov(c.fov, o);
    }

    setZoom(z: number, o: CameraSetOptions = {}) {
        if (!Number.isFinite(z)) {
            return;
        }

        this.cancelTween('zoom');
        this.zoomGoal = clamp(z, this.minZoom, this.maxZoom);
        if (o.immediate || !this.smoothing) this.zoom = this.zoomGoal;
        if (o.asHome) this.home.zoom = this.zoomGoal;
    }

    zoomBy(factor: number, o: CameraSetOptions = {}) {
        this.setZoom(this.zoomGoal * factor, o);
    }
    getZoom() {
        return this.zoomGoal;
    }

    setFov(f: number, o: CameraSetOptions = {}) {
        if (!Number.isFinite(f)) {
            return;
        }

        this.cancelTween('fov');
        this.fovGoal = clamp(f, FOV_MIN, FOV_MAX);
        if (o.immediate || !this.smoothing) this.fov = this.fovGoal;
        if (o.asHome) this.home.fov = this.fovGoal;
    }

    getFov() {
        return this.fovGoal;
    }

    /** Rotate the orbit (degrees) as user input, canceling azimuth/polar tweens. Polar is clamped to 10..170. */
    rotateBy(dAzimuth: number, dPolar: number) {
        this.cancelTween('azimuth');
        this.cancelTween('polar');
        this.azimuth += dAzimuth;
        this.polar = clamp(this.polar + dPolar, 10, 170);
    }
    /** Auto-rotate: like rotateBy, but does not cancel tweens. */
    spin(dAzimuth: number) {
        if (this.tweens.has('azimuth')) {
            return;
        }

        this.azimuth = (this.azimuth + dAzimuth) % 360; // Wrap to prevent unbounded growth during long auto-rotation.
    }

    // ------------------------------------------------------------------ Tweens

    /**
     * Animate the camera to the target values with a duration and easing. Returns a Promise:
     * `true` when completed, `false` when interrupted (e.g. by user zoom/rotation or another animation on the same property).
     * Zoom is interpolated geometrically; other values are linear. Zoom/FOV targets are clamped to user limits.
     */
    animateTo(
        to: CameraAnimateTarget,
        opts: CameraAnimateOptions = {},
    ): Promise<boolean> {
        const { duration = 1, delay = 0 } = opts;
        const easeFn: EaseFn =
            typeof opts.ease === 'function'
                ? opts.ease
                : EASINGS[opts.ease ?? 'easeInOut'];
        const entries: Array<[TweenKey, number]> = [];
        if (to.zoom !== undefined && Number.isFinite(to.zoom))
            entries.push(['zoom', clamp(to.zoom, this.minZoom, this.maxZoom)]);
        if (to.fov !== undefined && Number.isFinite(to.fov))
            entries.push(['fov', clamp(to.fov, FOV_MIN, FOV_MAX)]);
        if (to.azimuth !== undefined && Number.isFinite(to.azimuth))
            entries.push(['azimuth', to.azimuth]);
        if (to.polar !== undefined && Number.isFinite(to.polar))
            entries.push(['polar', clamp(to.polar, 1, 179)]);
        if (to.distance !== undefined && to.distance > 0)
            entries.push(['distance', to.distance]);
        if (to.target)
            entries.push(
                ['tx', to.target[0]],
                ['ty', to.target[1]],
                ['tz', to.target[2]],
            );
        if (!entries.length) return Promise.resolve(true);

        const instant = duration <= 0 && delay <= 0;
        let resolve!: (v: boolean) => void;
        const promise = new Promise<boolean>(r => (resolve = r));
        const group: TweenGroup = { pending: 0, interrupted: false, resolve };

        for (const [key, value] of entries) {
            this.cancelTween(key);
            if (key === 'zoom') this.zoomGoal = value; // getState() immediately reflects the destination
            if (key === 'fov') this.fovGoal = value;
            if (instant) {
                this.applyValue(key, value);
                continue;
            }
            group.pending++;
            this.tweens.set(key, {
                from: this.getValue(key),
                to: value,
                elapsed: 0,
                delay,
                duration,
                ease: easeFn,
                group,
            });
        }
        if (group.pending === 0) resolve(true);
        return promise;
    }

    /** Stop all camera tweens (their promises resolve to `false`). Values remain at their current positions. */
    stopAnimations() {
        for (const key of [...this.tweens.keys()]) this.cancelTween(key);
    }

    private cancelTween(key: TweenKey) {
        const tw = this.tweens.get(key);
        if (!tw) return;
        this.tweens.delete(key);
        // Stop in place; otherwise damping would continue toward the canceled zoom/FOV destination.
        if (key === 'zoom') this.zoomGoal = this.zoom;
        if (key === 'fov') this.fovGoal = this.fov;
        tw.group.interrupted = true;
        this.finish(tw.group);
    }

    private finish(g: TweenGroup) {
        g.pending--;
        if (g.pending <= 0) g.resolve(!g.interrupted);
    }

    private getValue(k: TweenKey): number {
        switch (k) {
            case 'zoom':
                return this.zoom;
            case 'fov':
                return this.fov;
            case 'azimuth':
                return this.azimuth;
            case 'polar':
                return this.polar;
            case 'distance':
                return this.distance;
            case 'tx':
                return this.target.x;
            case 'ty':
                return this.target.y;
            case 'tz':
                return this.target.z;
        }
    }

    private applyValue(k: TweenKey, v: number) {
        switch (k) {
            case 'zoom':
                this.zoom = v;
                break;
            case 'fov':
                this.fov = v;
                break;
            case 'azimuth':
                this.azimuth = v;
                break;
            case 'polar':
                this.polar = v;
                break;
            case 'distance':
                this.distance = v;
                break;
            case 'tx':
                this.target.x = v;
                break;
            case 'ty':
                this.target.y = v;
                break;
            case 'tz':
                this.target.z = v;
                break;
        }
    }

    private stepTweens(dt: number) {
        for (const [key, tw] of [...this.tweens]) {
            tw.elapsed += dt;
            if (tw.elapsed < tw.delay) continue;
            const u =
                tw.duration <= 0 ? 1 : Math.min(1, (tw.elapsed - tw.delay) / tw.duration);
            const e = tw.ease(u);
            const v =
                key === 'zoom' && tw.from > 0 && tw.to > 0
                    ? tw.from * Math.pow(tw.to / tw.from, e)
                    : tw.from + (tw.to - tw.from) * e;
            this.applyValue(key, u >= 1 ? tw.to : v);
            if (u >= 1) {
                this.tweens.delete(key);
                this.finish(tw.group);
            }
        }
    }

    // ------------------------------------------------------------------ Other

    /**
     * Return to the “home” values (initial values / from the `camera` prop). Without options, angles and distance change immediately; zoom/FOV use damping.
     * With `{ duration }`, animate everything (returns a Promise like animateTo).
     */
    reset(opts?: CameraAnimateOptions): Promise<boolean> {
        const h = this.home;
        if (opts && (opts.duration ?? 0) > 0) {
            // Use the shortest azimuth path (auto-rotation may have moved far from the initial value), then normalize to the initial value.
            const delta = ((((h.azimuth - this.azimuth) % 360) + 540) % 360) - 180;
            const done = this.animateTo(
                {
                    distance: h.distance,
                    azimuth: this.azimuth + delta,
                    polar: h.polar,
                    zoom: h.zoom,
                    fov: h.fov,
                },
                opts,
            );
            return done.then(completed => {
                if (completed && !this.tweens.has('azimuth')) this.azimuth = h.azimuth;
                return completed;
            });
        }
        this.stopAnimations();
        this.distance = h.distance;
        this.azimuth = h.azimuth;
        this.polar = h.polar;
        this.setZoom(h.zoom);
        this.setFov(h.fov);
        return Promise.resolve(true);
    }

    getState(): CameraState {
        return {
            distance: this.distance,
            azimuth: this.azimuth,
            polar: this.polar,
            zoom: this.zoomGoal,
            fov: this.fovGoal,
            keepFraming: this.keepFraming,
        };
    }

    setAspect(aspect: number) {
        this.camera.aspect = aspect;
        this.camera.updateProjectionMatrix();
    }

    /**
     * Call each frame. `offset` is the `camera` channel from the animation pose (default: no changes).
     * Order: tween → zoom/FOV damping → combine offsets → position camera.
     */
    update(dt: number, offset: CameraPose = IDENTITY) {
        this.lastOffset = offset;
        this.stepTweens(Math.max(0, dt));
        const k = this.smoothing ? 1 - Math.exp(-Math.max(0, dt) * 12) : 1;
        if (!this.tweens.has('zoom')) this.zoom = ease(this.zoom, this.zoomGoal, k);
        if (!this.tweens.has('fov')) this.fov = ease(this.fov, this.fovGoal, k);

        const fov = this.fovWith(offset);
        if (this.camera.fov !== fov) {
            this.camera.fov = fov;
            this.camera.updateProjectionMatrix();
        }
        const az = (this.azimuth + offset.azimuth) * D2R;
        const po = clamp(this.polar + offset.polar, 1, 179) * D2R;
        const r = this.distanceFor(offset);
        const tx = this.target.x + offset.target.x,
            ty = this.target.y + offset.target.y,
            tz = this.target.z + offset.target.z;
        this.camera.position.set(
            tx + r * Math.sin(po) * Math.sin(az),
            ty + r * Math.cos(po),
            tz + r * Math.sin(po) * Math.cos(az),
        );
        this.focus.set(tx, ty, tz);
        this.camera.lookAt(tx, ty, tz);
    }
}
