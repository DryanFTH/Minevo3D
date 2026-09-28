import {
    AmbientLight,
    Camera,
    Color,
    type ColorRepresentation,
    DirectionalLight,
    Euler,
    Group,
    Quaternion,
    Vector3,
} from 'three';

const D2R = Math.PI / 180;

/** Distance of the directional light from the focus. Only its direction matters. */
const LIGHT_DISTANCE = 100;

export type ColorInput = string | number | Color;

/**
 * Shading mode:
 * - 'auto': lit when a light is active; switches to unlit when both lights are disabled
 * - 'lit': always uses lighting; the character appears dark when no lights are active
 * - 'unlit': always flat-shaded without lighting; all lights are excluded from rendering
 */
export type Shading = 'auto' | 'lit' | 'unlit';

/** World-fixed lights: ambient and directional sunlight. */
export interface GlobalLightOptions {
    /** Disabled lights are excluded from rendering, not merely set to intensity 0. Default: true. */
    enabled?: boolean;

    /** Ambient intensity. Default: 0.7. */
    ambient?: number;

    /** Directional sunlight intensity. Default: 0.45. */
    directional?: number;

    color?: ColorInput;

    /** Sun position [x, y, z], pointing toward the origin. Default: [20, 40, 30]. */
    position?: [number, number, number];
}

/** Camera-following headlight that keeps the visible front illuminated as the camera rotates. */
export interface CameraLightOptions {
    /** Disabled lights are excluded from rendering. Default: false. */
    enabled?: boolean;

    /** Default: 0.6. */
    intensity?: number;

    color?: ColorInput;

    /** Light direction relative to the view, in degrees. Positive values come from screen-right. Default: 0. */
    yaw?: number;

    /** Positive values come from above. Default: 0. */
    pitch?: number;
}

export interface LightingOptions {
    global?: boolean | GlobalLightOptions;

    camera?: boolean | CameraLightOptions;

    shading?: Shading;
}

export interface LightState {
    global: { enabled: boolean; ambient: number; directional: number };

    camera: { enabled: boolean; intensity: number; yaw: number; pitch: number };

    shading: Shading;

    /** True when the character should be rendered without lighting (MeshBasicMaterial). */
    unlit: boolean;

    /** Number of directional lights actually evaluated by the shader (0–2). */
    directionalLights: number;
}

/**
 * Manages GlobalLight (ambient and sunlight) and CameraLight (headlight), each of which can be enabled or disabled.
 *
 * Performance notes:
 * - Disabled lights are excluded by setting `visible = false`; setting intensity to 0 still makes the shader evaluate them.
 * - At most two directional lights are used (sunlight and headlight), with no shadow maps.
 * - Changing the number of directional lights causes three.js to compile a shader once and cache it; the first toggle may
 *   cause a brief hitch, while subsequent toggles are free.
 * - Ambient lighting only adds a uniform and is effectively free.
 * - When all lights are disabled in 'auto' mode, the character switches to an unlit material with no lighting calculations.
 */
export class LightRig {
    /** Add this group to the scene. */
    readonly group = new Group();

    readonly ambient: AmbientLight;

    readonly sun: DirectionalLight;

    readonly cameraLight: DirectionalLight;

    /** Called when the unlit state changes, for example to swap the character material. */
    onUnlitChange?: (unlit: boolean) => void;

    private g = { enabled: true, ambient: 0.7, directional: 0.45 };

    private c = { enabled: false, intensity: 0.6, yaw: 0, pitch: 0 };

    private shading: Shading = 'auto';

    private isUnlit = false;

    private scale: number;

    private euler = new Euler(0, 0, 0, 'YXZ');

    private vec = new Vector3();

    private quat = new Quaternion();

    /** @param scale Intensity multiplier (1 for three.js r152–r154 legacy lights, Math.PI for r155+). */
    constructor(scale = Math.PI, opts: LightingOptions = {}) {
        this.scale = scale;
        this.ambient = new AmbientLight(0xffffff, 0);
        this.sun = new DirectionalLight(0xffffff, 0);
        this.sun.position.set(20, 40, 30);
        this.cameraLight = new DirectionalLight(0xffffff, 0);
        this.group.add(this.ambient, this.sun, this.cameraLight, this.cameraLight.target);
        this.assign(this.g, opts.global, true);
        this.assign(this.c, opts.camera, false);
        if (opts.shading) this.shading = opts.shading;
        this.apply(false);
    }

    /** True when the character should be rendered unlit. */
    get unlit() {
        return this.isUnlit;
    }

    /** Number of active directional lights evaluated by the shader. */
    get directionalLights() {
        return (this.sun.visible ? 1 : 0) + (this.cameraLight.visible ? 1 : 0);
    }

    /** `false` disables, `true` enables without changing other options, or an options object updates only specified fields. */
    setGlobal(o: boolean | GlobalLightOptions) {
        this.assign(this.g, o, true);
        this.apply(true);
    }

    setCamera(o: boolean | CameraLightOptions) {
        this.assign(this.c, o, false);
        this.apply(true);
    }

    setShading(s: Shading) {
        this.shading = s;
        this.apply(true);
    }

    getState(): LightState {
        return {
            global: { ...this.g },
            camera: { ...this.c },
            shading: this.shading,
            unlit: this.isUnlit,
            directionalLights: this.directionalLights,
        };
    }

    /**
     * Call every frame after updating the camera. Does nothing when CameraLight is disabled.
     * @param focus Point the camera is looking at (CameraController.focus).
     */
    update(camera: Camera, focus: Vector3) {
        if (!this.cameraLight.visible) return;
        this.euler.set(-this.c.pitch * D2R, this.c.yaw * D2R, 0, 'YXZ');
        camera.getWorldQuaternion(this.quat);
        // The camera's local +z points from the target toward the camera; apply yaw/pitch, then transform to world space.
        this.vec
            .set(0, 0, 1)
            .applyEuler(this.euler)
            .applyQuaternion(this.quat)
            .multiplyScalar(LIGHT_DISTANCE);
        this.cameraLight.target.position.copy(focus);
        this.cameraLight.position.copy(focus).add(this.vec);
    }

    // Internal methods

    private assign(
        dst: Record<string, number | boolean>,
        o: boolean | GlobalLightOptions | CameraLightOptions | undefined,
        isGlobal: boolean,
    ) {
        if (o === undefined) return;
        if (typeof o === 'boolean') {
            dst.enabled = o;
            return;
        }

        for (const key of [
            'enabled',
            'ambient',
            'directional',
            'intensity',
            'yaw',
            'pitch',
        ] as const) {
            const value = (o as Record<string, unknown>)[key];
            const isValid =
                key === 'enabled'
                    ? typeof value === 'boolean'
                    : typeof value === 'number' && Number.isFinite(value);

            if (isValid && key in dst) dst[key] = value as number | boolean;
        }

        if (o.color !== undefined) {
            if (isGlobal) {
                this.ambient.color.set(o.color as ColorRepresentation);
                this.sun.color.set(o.color as ColorRepresentation);
            } else {
                this.cameraLight.color.set(o.color as ColorRepresentation);
            }
        }

        if (isGlobal && 'position' in o && o.position)
            this.sun.position.set(...o.position);
    }

    private apply(notify: boolean) {
        const g = this.g;
        const c = this.c;
        const lit = this.shading !== 'unlit';
        this.ambient.intensity = g.ambient * this.scale;
        this.sun.intensity = g.directional * this.scale;
        this.cameraLight.intensity = c.intensity * this.scale;
        // `visible = false` excludes lights from shader calculations; intensity 0 alone does not.
        this.ambient.visible = lit && g.enabled && g.ambient > 0;
        this.sun.visible = lit && g.enabled && g.directional > 0;
        this.cameraLight.visible = lit && c.enabled && c.intensity > 0;

        const unlit =
            this.shading === 'unlit' ||
            (this.shading === 'auto' && !(g.enabled || c.enabled));

        if (unlit !== this.isUnlit) {
            this.isUnlit = unlit;

            if (notify) this.onUnlitChange?.(unlit);
        }
    }
}
