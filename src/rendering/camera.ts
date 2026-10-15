import {
    MOUSE,
    MathUtils,
    PerspectiveCamera,
    Quaternion,
    Spherical,
    TOUCH,
    Vector3,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

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

/**
 * User input settings, applied to three.js `OrbitControls`. Every field is a plain value (no functions or
 * class instances), so the object can be serialized, compared, and passed as a React prop.
 *
 * Names that are not listed here are still reachable: the live `OrbitControls` instance is available as
 * `viewer.controls` (or `CameraController.controls`), so any property it supports can be changed directly.
 *
 * Settings that are omitted fall back to the defaults documented on each field.
 */
export interface OrbitControlsOptions {
    /** Rotate the camera by dragging (`OrbitControls.enableRotate`). Default: true. */
    rotate?: boolean;

    /** Zoom with the scroll wheel or pinch (`enableZoom`). Default: false, so page scrolling is not affected. */
    zoom?: boolean;

    /** Pan (move the focus point) with right-drag or two-finger drag (`enablePan`). Default: false. */
    pan?: boolean;

    /** Rotation sensitivity (`rotateSpeed`). Default: 1. */
    rotateSpeed?: number;

    /** Scroll and pinch zoom sensitivity (`zoomSpeed`). Default: 1. */
    zoomSpeed?: number;

    /** Pan sensitivity (`panSpeed`). Default: 1. */
    panSpeed?: number;

    /** Inertia after releasing a drag (`enableDamping`). Default: false. */
    enableDamping?: boolean;

    /** Inertia strength when `enableDamping` is on, 0-1 (`dampingFactor`). Default: 0.05. */
    dampingFactor?: number;

    /** Panning moves parallel to the screen (true) or to the ground plane (false) (`screenSpacePanning`). Default: true. */
    screenSpacePanning?: boolean;

    /** Zoom toward the pointer position instead of the focus point (`zoomToCursor`). Default: false. */
    zoomToCursor?: boolean;

    /**
     * Absolute camera-to-target distance limits in units (`minDistance` / `maxDistance`). They apply in addition to
     * the zoom limits `camera.minZoom` / `camera.maxZoom`. Default: 0 and Infinity.
     */
    minDistance?: number;
    maxDistance?: number;

    /** Mouse button mapping (`mouseButtons`), using three.js `MOUSE` values. Unspecified buttons keep the defaults. */
    mouseButtons?: OrbitControls['mouseButtons'];

    /** Touch mapping (`touches`), using three.js `TOUCH` values. Unspecified entries keep the defaults. */
    touches?: OrbitControls['touches'];
}

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

    /** Minimum polar angle in degrees. Default: 10. */
    minPolar?: number;

    /** Maximum polar angle in degrees. Default: 170. */
    maxPolar?: number;

    /**
     * Minimum azimuth angle in degrees. Default: -Infinity (unlimited).
     * When both limits are finite they must lie within -360..360 and span less than 360 degrees (OrbitControls rule).
     */
    minAzimuth?: number;

    /** Maximum azimuth angle in degrees. Default: Infinity (unlimited). */
    maxAzimuth?: number;

    /**
     * When true, the character's screen size stays constant as FOV changes (the camera moves automatically),
     * changing only perspective strength ("dolly zoom"). Default: false.
     */
    keepFraming?: boolean;

    /** Programmatic zoom/FOV changes are smoothly animated (damped). Default: true. */
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

    /** Focus point [x, y, z] (changes when panning is enabled). */
    target: [number, number, number];
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
const Y_AXIS = new Vector3(0, 1, 0);
/** Smallest orbit radius used when converting radius to zoom (avoids division by zero). */
const MIN_RADIUS = 1e-6;
/** Differences below these values count as floating-point noise, not as user input. */
const ANGLE_EPS = 1e-6;
const TARGET_EPS_SQ = 1e-10;

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
 * Orbit camera built on three.js `OrbitControls`.
 *
 * - `OrbitControls` is the input layer: it handles mouse, touch, and keyboard, plus damping, panning, and limits.
 *   The live instance is exposed as `controls`, so library users can customize everything it supports.
 * - This class adds what OrbitControls does not have: zoom as a multiplier, FOV smoothing, `keepFraming`
 *   (dolly zoom), timed camera tweens, `reset()`, and the animation `camera` channel.
 *
 * Two cameras are used:
 * - `orbitCamera` is the camera OrbitControls drives. It only contains the base view (props, user input, tweens).
 * - `camera` is the camera used for rendering: the base view plus offsets from the animation pose
 *   (zoom is multiplied; FOV, angles, and target are added). Do not move it manually; change `controls`
 *   (or call the methods of this class) instead.
 *
 * The orbit state (azimuth, polar, zoom, target) is always read back from `orbitCamera`, so changes made
 * directly through `controls` are respected. Input on a property cancels running tweens of that property.
 */
export class CameraController {
    /** Camera used for rendering (base view + animation offsets). Updated by `update()`. */
    readonly camera = new PerspectiveCamera(REFERENCE_FOV, 1, 0.5, 5000);
    /** Camera driven by `controls` (base view without animation offsets). */
    readonly orbitCamera = new PerspectiveCamera(REFERENCE_FOV, 1, 0.5, 5000);
    /** three.js OrbitControls instance. Change any of its properties for full customization. */
    readonly controls: OrbitControls;
    /** The orbit center (the same object as `controls.target`). */
    readonly target: Vector3;
    /** Point the camera actually looks at this frame (target + animation offset). Used by CameraLight. */
    readonly focus = new Vector3(0, 16, 0);

    /** Called when the camera was changed by user input (drag, wheel, touch, keyboard, damping inertia). */
    onUserChange?: () => void;

    /** Base distance (units) at zoom 1. The actual camera-to-target distance is `distance / zoom`. */
    distance = 62;
    /** Last known horizontal angle in degrees (continuous, may exceed ±180). */
    azimuth = 40;
    /** Last known vertical angle in degrees. */
    polar = 72;

    minZoom = 0.3;
    maxZoom = 5;

    keepFraming = false;
    smoothing = true;

    private zoom = 1;
    private zoomGoal = 1;

    private fov = REFERENCE_FOV;
    private fovGoal = REFERENCE_FOV;

    private home = {
        distance: 62,
        azimuth: 40,
        polar: 72,
        zoom: 1,
        fov: REFERENCE_FOV,
        target: [0, 16, 0] as [number, number, number],
    };
    private tweens = new Map<TweenKey, Tween>();
    private lastOffset: CameraPose = IDENTITY;

    /** Target as of our last write, used to detect panning. */
    private targetSnap = new Vector3(0, 16, 0);
    private pendingSpin = 0;
    /** True when our own code (not the user) moved the camera since the last frame. */
    private apiDirty = false;
    private suppressChange = false;

    private readonly qUp = new Quaternion();
    private readonly qUpInv = new Quaternion();
    private readonly vec = new Vector3();
    private readonly sph = new Spherical();

    constructor(domElement: HTMLElement, opts: CameraOptions = {}) {
        this.controls = new OrbitControls(this.orbitCamera, domElement);
        this.target = this.controls.target;
        this.target.set(0, 16, 0);
        this.focus.copy(this.target);
        this.controls.minPolarAngle = 10 * D2R;
        this.controls.maxPolarAngle = 170 * D2R;
        this.configureControls({});
        this.controls.addEventListener('change', this.onControlsChange);

        this.commit();
        this.set(opts, { immediate: true, asHome: true });
        this.update(0);
    }

    // ------------------------------------------------------------ Limits (stored in OrbitControls)

    /** Minimum polar angle in degrees. Same as `controls.minPolarAngle` (which is in radians). */
    get minPolar() {
        return this.controls.minPolarAngle / D2R;
    }
    set minPolar(v: number) {
        this.controls.minPolarAngle = v * D2R;
    }

    get maxPolar() {
        return this.controls.maxPolarAngle / D2R;
    }
    set maxPolar(v: number) {
        this.controls.maxPolarAngle = v * D2R;
    }

    get minAzimuth() {
        return this.controls.minAzimuthAngle / D2R;
    }
    set minAzimuth(v: number) {
        this.controls.minAzimuthAngle = v * D2R;
    }

    get maxAzimuth() {
        return this.controls.maxAzimuthAngle / D2R;
    }
    set maxAzimuth(v: number) {
        this.controls.maxAzimuthAngle = v * D2R;
    }

    // ------------------------------------------------------------ Read-only state

    /** Current base zoom (may differ from the destination during easing/tween; excludes animation offsets). */
    get currentZoom() {
        return this.zoomFromCamera();
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

    // ------------------------------------------------------------ OrbitControls settings

    /**
     * Apply input settings to `controls`. Settings that are omitted return to their defaults, so the result
     * depends only on the object passed in. Properties of `controls` that are not part of
     * `OrbitControlsOptions` are left unchanged.
     */
    configureControls(o: OrbitControlsOptions = {}) {
        const c = this.controls;
        c.enableRotate = o.rotate ?? true;
        c.enableZoom = o.zoom ?? false;
        c.enablePan = o.pan ?? false;
        c.rotateSpeed = o.rotateSpeed ?? 1;
        c.zoomSpeed = o.zoomSpeed ?? 1;
        c.panSpeed = o.panSpeed ?? 1;
        c.enableDamping = o.enableDamping ?? false;
        c.dampingFactor = o.dampingFactor ?? 0.05;
        c.screenSpacePanning = o.screenSpacePanning ?? true;
        c.zoomToCursor = o.zoomToCursor ?? false;
        c.minDistance = o.minDistance ?? 0;
        c.maxDistance = o.maxDistance ?? Number.POSITIVE_INFINITY;
        c.mouseButtons = {
            LEFT: MOUSE.ROTATE,
            MIDDLE: MOUSE.DOLLY,
            RIGHT: MOUSE.PAN,
            ...o.mouseButtons,
        };
        c.touches = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN, ...o.touches };
        // With every kind of input off, OrbitControls should not react to (or swallow) any event.
        c.enabled = c.enableRotate || c.enableZoom || c.enablePan;
    }

    // ------------------------------------------------------------ Set values

    set(c: CameraOptions, o: CameraSetOptions = {}) {
        this.readCamera(true);

        if (c.minZoom !== undefined && c.minZoom > 0) this.minZoom = c.minZoom;
        if (c.maxZoom !== undefined && c.maxZoom > 0) this.maxZoom = c.maxZoom;
        if (this.minZoom > this.maxZoom) {
            [this.minZoom, this.maxZoom] = [this.maxZoom, this.minZoom];
        }

        if (c.minPolar !== undefined && Number.isFinite(c.minPolar))
            this.minPolar = clamp(c.minPolar, 1, 179);
        if (c.maxPolar !== undefined && Number.isFinite(c.maxPolar))
            this.maxPolar = clamp(c.maxPolar, 1, 179);
        if (this.minPolar > this.maxPolar) {
            [this.minPolar, this.maxPolar] = [this.maxPolar, this.minPolar];
        }

        if (c.minAzimuth !== undefined && !Number.isNaN(c.minAzimuth))
            this.minAzimuth = c.minAzimuth;
        if (c.maxAzimuth !== undefined && !Number.isNaN(c.maxAzimuth))
            this.maxAzimuth = c.maxAzimuth;
        if (this.minAzimuth > this.maxAzimuth) {
            [this.minAzimuth, this.maxAzimuth] = [this.maxAzimuth, this.minAzimuth];
        }

        this.polar = clamp(this.polar, this.minPolar, this.maxPolar);
        this.azimuth = clamp(this.azimuth, this.minAzimuth, this.maxAzimuth);

        if (c.keepFraming !== undefined) this.keepFraming = c.keepFraming;
        if (c.smoothing !== undefined) this.smoothing = c.smoothing;

        if (c.distance !== undefined && c.distance > 0) {
            this.cancelTween('distance');
            this.distance = c.distance;
            if (o.asHome) this.home.distance = this.distance;
        }
        if (c.azimuth !== undefined) {
            this.cancelTween('azimuth');
            this.azimuth = clamp(c.azimuth, this.minAzimuth, this.maxAzimuth);
            if (o.asHome) this.home.azimuth = this.azimuth;
        }
        if (c.polar !== undefined) {
            this.cancelTween('polar');
            this.polar = clamp(c.polar, this.minPolar, this.maxPolar);
            if (o.asHome) this.home.polar = this.polar;
        }
        if (c.target) {
            this.cancelTween('tx');
            this.cancelTween('ty');
            this.cancelTween('tz');
            this.target.set(...c.target);
            if (o.asHome) this.home.target = [...c.target];
        }

        // New zoom limits also apply to current values.
        this.zoomGoal = clamp(this.zoomGoal, this.minZoom, this.maxZoom);
        this.zoom = clamp(this.zoom, this.minZoom, this.maxZoom);

        // Write everything first: setZoom/setFov read the camera back and must not see stale values.
        this.commit();
        if (c.zoom !== undefined) this.setZoom(c.zoom, o);
        if (c.fov !== undefined) this.setFov(c.fov, o);
    }

    setZoom(z: number, o: CameraSetOptions = {}) {
        if (!Number.isFinite(z)) {
            return;
        }

        this.readCamera(true);
        this.cancelTween('zoom');
        this.zoomGoal = clamp(z, this.minZoom, this.maxZoom);
        if (o.immediate || !this.smoothing) {
            this.zoom = this.zoomGoal;
            this.commit();
        }
        if (o.asHome) this.home.zoom = this.zoomGoal;
        this.apiDirty = true;
    }

    zoomBy(factor: number, o: CameraSetOptions = {}) {
        this.readCamera(true);
        this.setZoom(this.zoomGoal * factor, o);
    }
    getZoom() {
        this.readCamera(true);
        return this.zoomGoal;
    }

    setFov(f: number, o: CameraSetOptions = {}) {
        if (!Number.isFinite(f)) {
            return;
        }

        this.readCamera(true);
        this.cancelTween('fov');
        this.fovGoal = clamp(f, FOV_MIN, FOV_MAX);
        if (o.immediate || !this.smoothing) {
            this.fov = this.fovGoal;
            this.commit();
        }
        if (o.asHome) this.home.fov = this.fovGoal;
        this.apiDirty = true;
    }

    getFov() {
        return this.fovGoal;
    }

    /** Rotate the orbit (degrees) as if the user dragged, canceling azimuth/polar tweens. */
    rotateBy(dAzimuth: number, dPolar: number) {
        this.readCamera(true);
        this.cancelTween('azimuth');
        this.cancelTween('polar');
        this.azimuth = clamp(this.azimuth + dAzimuth, this.minAzimuth, this.maxAzimuth);
        this.polar = clamp(this.polar + dPolar, this.minPolar, this.maxPolar);
        this.commit();
    }
    /** Auto-rotate: like rotateBy, but does not cancel tweens. Applied on the next `update()`. */
    spin(dAzimuth: number) {
        this.pendingSpin += dAzimuth;
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
        this.readCamera(true);
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
            entries.push([
                'azimuth',
                clamp(to.azimuth, this.minAzimuth, this.maxAzimuth),
            ]);
        if (to.polar !== undefined && Number.isFinite(to.polar))
            entries.push(['polar', clamp(to.polar, this.minPolar, this.maxPolar)]);
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
        if (instant) this.commit();
        this.apiDirty = true;
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
     * Return to the “home” values (initial values / from the `camera` prop), including the focus point.
     * Without options, angles and distance change immediately; zoom/FOV use damping.
     * With `{ duration }`, animate everything (returns a Promise like animateTo).
     */
    reset(opts?: CameraAnimateOptions): Promise<boolean> {
        this.readCamera(true);
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
                    target: h.target,
                },
                opts,
            );
            return done.then(completed => {
                if (completed && !this.tweens.has('azimuth')) {
                    this.azimuth = h.azimuth;
                    this.commit();
                }
                return completed;
            });
        }
        this.stopAnimations();
        this.distance = h.distance;
        this.azimuth = h.azimuth;
        this.polar = h.polar;
        this.target.set(...h.target);
        this.commit();
        this.setZoom(h.zoom);
        this.setFov(h.fov);
        return Promise.resolve(true);
    }

    getState(): CameraState {
        this.readCamera(true);
        return {
            distance: this.distance,
            azimuth: this.azimuth,
            polar: this.polar,
            zoom: this.zoomGoal,
            fov: this.fovGoal,
            keepFraming: this.keepFraming,
            target: [this.target.x, this.target.y, this.target.z],
        };
    }

    setAspect(aspect: number) {
        this.orbitCamera.aspect = aspect;
        this.orbitCamera.updateProjectionMatrix();
        this.camera.aspect = aspect;
        this.camera.updateProjectionMatrix();
    }

    /** Remove event listeners and stop animations. */
    dispose() {
        this.stopAnimations();
        this.controls.removeEventListener('change', this.onControlsChange);
        this.controls.dispose();
    }

    /**
     * Call each frame. `offset` is the `camera` channel from the animation pose (default: no changes).
     * Order: read user input → tween → zoom/FOV damping → spin → OrbitControls → apply offsets to the render camera.
     */
    update(dt: number, offset: CameraPose = IDENTITY) {
        this.lastOffset = offset;
        dt = Math.max(0, dt);

        // 1. Pick up what the user did through OrbitControls since the last frame.
        this.readCamera(true);

        // 2. Advance everything that is driven by code.
        let driven = this.apiDirty;
        this.apiDirty = false;

        if (this.tweens.size > 0) {
            this.stepTweens(dt);
            driven = true;
        }
        const k = this.smoothing ? 1 - Math.exp(-dt * 12) : 1;
        if (!this.tweens.has('zoom') && this.zoom !== this.zoomGoal) {
            this.zoom = ease(this.zoom, this.zoomGoal, k);
            driven = true;
        }
        if (!this.tweens.has('fov') && this.fov !== this.fovGoal) {
            this.fov = ease(this.fov, this.fovGoal, k);
            driven = true;
        }
        if (this.pendingSpin !== 0) {
            const d = this.pendingSpin;
            this.pendingSpin = 0;
            if (!this.tweens.has('azimuth')) {
                this.azimuth = clamp(
                    (this.azimuth + d) % 360,
                    this.minAzimuth,
                    this.maxAzimuth,
                );
                driven = true;
            }
        }

        // 3. Write our values to the orbit camera only when something changed, so OrbitControls keeps
        //    full ownership of the camera while the user is interacting (including damping inertia).
        if (driven) this.commit(true);

        // 4. Let OrbitControls apply limits, damping, and pending input. Movement that we caused is not
        //    reported as user input.
        this.suppressChange = driven;
        try {
            this.controls.update(dt);
        } finally {
            this.suppressChange = false;
        }
        this.readCamera(false);

        this.buildRenderCamera();
    }

    // ------------------------------------------------------------------ Internal

    private onControlsChange = () => {
        if (!this.suppressChange) this.onUserChange?.();
    };

    private zoomFromCamera() {
        const s = this.orbitOf();
        return this.distance / Math.max(s.radius, MIN_RADIUS);
    }

    /** Spherical coordinates of `orbitCamera` around the target, in "y is up" space like OrbitControls uses. */
    private orbitOf(): Spherical {
        this.qUp.setFromUnitVectors(this.orbitCamera.up, Y_AXIS);
        this.vec
            .copy(this.orbitCamera.position)
            .sub(this.target)
            .applyQuaternion(this.qUp);
        return this.sph.setFromVector3(this.vec);
    }

    /** Place `cam` on a sphere (radius, phi, theta in radians) around `center`. */
    private place(
        cam: PerspectiveCamera,
        center: Vector3,
        r: number,
        phi: number,
        theta: number,
    ) {
        this.qUpInv.setFromUnitVectors(cam.up, Y_AXIS).invert();
        this.sph.set(r, phi, theta).makeSafe();
        this.vec.setFromSpherical(this.sph).applyQuaternion(this.qUpInv);
        cam.position.copy(center).add(this.vec);
    }

    /** Pick the representation of an angle that is closest to the last known azimuth (continuous, not wrapped). */
    private unwrapAzimuth(deg: number) {
        const d = ((((deg - this.azimuth) % 360) + 540) % 360) - 180;
        return this.azimuth + d;
    }

    /**
     * Read azimuth, polar, zoom, and target back from the orbit camera.
     * With `detectInput`, a value that changed since our last write was changed by the user (or by code that
     * moved `controls` directly): the running tween or easing of that property is canceled, and the zoom
     * limits are enforced.
     */
    private readCamera(detectInput: boolean) {
        const s = this.orbitOf();
        const radius = Math.max(s.radius, MIN_RADIUS);
        const az = this.unwrapAzimuth(s.theta / D2R);
        const po = s.phi / D2R;
        const zoom = this.distance / radius;

        if (Math.abs(az - this.azimuth) > ANGLE_EPS) {
            if (detectInput) this.cancelTween('azimuth');
            this.azimuth = az;
        }
        if (Math.abs(po - this.polar) > ANGLE_EPS) {
            if (detectInput) this.cancelTween('polar');
            this.polar = po;
        }
        if (Math.abs(zoom - this.zoom) > ANGLE_EPS * Math.max(1, zoom)) {
            if (detectInput) this.cancelTween('zoom');
            this.zoom = zoom;
            this.zoomGoal = zoom;
        }
        if (this.target.distanceToSquared(this.targetSnap) > TARGET_EPS_SQ) {
            if (detectInput) {
                this.cancelTween('tx');
                this.cancelTween('ty');
                this.cancelTween('tz');
            }
            this.targetSnap.copy(this.target);
        }

        if (detectInput) {
            const z = clamp(this.zoom, this.minZoom, this.maxZoom);
            if (z !== this.zoom) {
                this.zoom = z;
                this.zoomGoal = z;
                this.commit();
            }
        }
    }

    /** Write our values to the orbit camera. */
    private commit(fromFrame = false) {
        if (!fromFrame) this.apiDirty = true;
        const r = this.distance / Math.max(this.zoom, MIN_RADIUS);
        this.place(
            this.orbitCamera,
            this.target,
            r,
            this.polar * D2R,
            this.azimuth * D2R,
        );
        if (this.orbitCamera.fov !== this.fov) {
            this.orbitCamera.fov = this.fov;
            this.orbitCamera.updateProjectionMatrix();
        }
        this.orbitCamera.lookAt(this.target);
        this.targetSnap.copy(this.target);
    }

    /** Compute the render camera: the orbit camera plus the animation offsets. */
    private buildRenderCamera() {
        const o = this.lastOffset;
        const base = this.orbitCamera;
        const cam = this.camera;

        // Projection settings and layers follow the orbit camera so that customizing it carries over.
        cam.up.copy(base.up);
        cam.near = base.near;
        cam.far = base.far;
        cam.aspect = base.aspect;
        cam.zoom = base.zoom;
        cam.filmGauge = base.filmGauge;
        cam.filmOffset = base.filmOffset;
        cam.view = base.view;
        cam.layers.mask = base.layers.mask;
        cam.fov = this.fovWith(o);
        cam.updateProjectionMatrix();

        const s = this.orbitOf();
        const theta = s.theta + o.azimuth * D2R;
        const phi = clamp(s.phi + o.polar * D2R, 1 * D2R, 179 * D2R);
        this.focus.set(
            this.target.x + o.target.x,
            this.target.y + o.target.y,
            this.target.z + o.target.z,
        );
        this.place(cam, this.focus, this.distanceFor(o), phi, theta);
        cam.lookAt(this.focus);
        cam.updateMatrixWorld(true);
    }
}
