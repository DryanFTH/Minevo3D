import {
    CircleGeometry,
    Color,
    GridHelper,
    Material,
    Mesh,
    MeshBasicMaterial,
    Object3D,
    PerspectiveCamera,
    Scene,
    SkeletonHelper,
    WebGLRenderer,
} from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import type { AnimationFn, AnimationSource } from '@/animation/animations';
import { AnimationController, type PlayOptions } from '@/animation/controller';
import { type CapeInfo, type CapeSource, CapeTexture } from '@/cape/cape';
import type { CapePhysicsOptions } from '@/cape/capeRig';
import { CapeSwitcher, type SetCapeOptions } from '@/cape/capeSwitcher';
import { type ArmModel, CharacterRig } from '@/character/rig';
import {
    type AutoRotateInput,
    type AutoRotateOptions,
    AutoRotator,
} from '@/rendering/autorotate';
import {
    type CameraAnimateOptions,
    type CameraAnimateTarget,
    CameraController,
    type CameraOptions,
    type CameraSetOptions,
    type CameraState,
    type OrbitControlsOptions,
} from '@/rendering/camera';
import {
    type CameraLightOptions,
    type GlobalLightOptions,
    LightRig,
    type LightState,
    type Shading,
} from '@/rendering/lights';
import {
    type SkinFilter,
    type SkinInfo,
    type SkinSource,
    SkinTexture,
} from '@/skin/skin';
import { type SetSkinOptions, SkinSwitcher } from '@/skin/skinSwitcher';
import type { PartialPartOffsets, PartialPose, Pose } from '@/types/types';

/**
 * User input settings. Includes every `OrbitControlsOptions` field (rotate, zoom, pan, speeds, damping,
 * distance limits, mouse and touch mapping, ...) plus the options below. For anything not listed, change the
 * live `OrbitControls` instance available as `viewer.controls`.
 */
export interface ControlsOptions extends OrbitControlsOptions {
    /** Alias for the top-level `autoRotate` option. The top-level option takes precedence. */
    autoRotate?: AutoRotateInput;
    /** Double-clicking the canvas resets the camera to its starting view. Default: false. */
    resetOnDoubleClick?: boolean;
}

export interface FrameInfo {
    /** Seconds since the previous frame. */
    delta: number;
    /** Pose applied in this frame. */
    pose: Pose;

    viewer: CharacterViewer;
}

/** Options for changing the camera through the API. `silent` prevents calling onCameraChange. */
export interface ViewerCameraOptions extends CameraSetOptions {
    silent?: boolean;
}

/** Options for animating the camera through the API. `silent` prevents calling onCameraChange. */
export interface ViewerCameraAnimateOptions extends CameraAnimateOptions {
    silent?: boolean;
}

export interface ViewerOptions {
    skin?: SkinSource | null;

    /** Skin texture filter. Default: 'auto' (see SkinFilter). */
    skinFilter?: SkinFilter;

    /**
     * Cape: URL, File, Blob, image, or canvas (64x32, 22x17, or a multiple of these sizes).
     * `true` uses the default cape; `null`, `false`, or an empty value hides the cape.
     */
    cape?: CapeSource | boolean | null;

    /** Cape secondary spring motion. `false` makes the cape follow its target directly. Enabled by default. */
    capePhysics?: boolean | CapePhysicsOptions;

    armModel?: ArmModel;

    showOverlay?: boolean;

    blendWidth?: number;

    /**
     * Position offsets for body parts (head, torso, armL, armR, legL, legR) in skin pixels, added to each
     * part's normal position. Animations add to these (`pose.offset`) instead of replacing them. Change them
     * later with `viewer.rig.setPartOffset()` / `setPartOffsets()`.
     */
    partOffsets?: PartialPartOffsets;

    animation?: AnimationSource;

    animations?: Record<string, AnimationFn>;

    animationSpeed?: number;

    intensity?: number;

    transition?: number;

    pose?: PartialPose;

    paused?: boolean;

    camera?: CameraOptions;

    controls?: boolean | ControlsOptions;

    /**
     * Automatic camera rotation: `true` (15°/second), a speed in degrees per second (negative rotates in reverse),
     * or `{ speed, resumeDelay, ramp, pauseOnHover }`. Works even when `controls` is disabled.
     */
    autoRotate?: AutoRotateInput;

    /** CSS background color. Null means transparent. */
    background?: string | null;

    grid?: boolean;

    shadow?: boolean;

    wireframe?: boolean;

    showBones?: boolean;

    /** Global light fixed in the world (ambient and directional). `false` disables it. Enabled by default. */
    globalLight?: boolean | GlobalLightOptions;

    /** Camera light that follows the camera. `true` enables it. Disabled by default. */
    cameraLight?: boolean | CameraLightOptions;

    /** 'auto' (default) uses unlit shading when all lights are off. 'lit' and 'unlit' force a mode. */
    shading?: Shading;

    /** @deprecated Use `globalLight`. */
    lights?: { ambient?: number; directional?: number };

    maxPixelRatio?: number;

    antialias?: boolean;

    onFrame?: (info: FrameInfo) => void;

    /** Called when the camera changes through user input or an API call. */
    onCameraChange?: (state: CameraState) => void;
}

/**
 * Standalone three.js viewer (without React) for rendering, camera, lighting, animation, and orbit controls.
 * Can be used directly with vanilla JavaScript or another framework.
 */
export class CharacterViewer {
    readonly scene = new Scene();
    readonly renderer: WebGLRenderer;
    readonly cameraController: CameraController;
    /**
     * The camera used for rendering: the orbit view plus offsets from the animation `camera` channel.
     * Read it (for raycasting, projection, ...) but do not move it; use `controls` or the camera methods instead.
     */
    readonly camera: PerspectiveCamera;
    readonly skin: SkinTexture;
    readonly capeTexture: CapeTexture;
    readonly rig: CharacterRig;
    readonly controller: AnimationController;
    private skinSwitcher!: SkinSwitcher;
    private capeSwitcher!: CapeSwitcher;
    onFrame?: (info: FrameInfo) => void;
    onCameraChange?: (state: CameraState) => void;
    paused = false;

    private container: HTMLElement;
    readonly lightRig: LightRig;
    private gridHelper: GridHelper;
    private shadowMesh: Mesh;
    private shadowEnabled = true;
    private helpers: SkeletonHelper[] = [];
    private showBones = false;

    private ctl = { rotate: true, zoom: false, pan: false, resetOnDoubleClick: false };
    readonly rotator = new AutoRotator();
    private autoRotateExplicit = false;
    private controlsAutoRotate: AutoRotateInput | undefined;

    private raf = 0;
    private last = 0;
    private visible = true;
    private disposed = false;
    private skinToken = 0;
    private resizeObserver: ResizeObserver;
    private intersectionObserver?: IntersectionObserver;

    constructor(container: HTMLElement, opts: ViewerOptions = {}) {
        this.container = container;
        this.renderer = new WebGLRenderer({
            antialias: opts.antialias ?? true,
            alpha: true,
            preserveDrawingBuffer: false,
        });
        this.renderer.setPixelRatio(
            Math.min(window.devicePixelRatio || 1, opts.maxPixelRatio ?? 2),
        );
        const el = this.renderer.domElement;
        el.style.display = 'block';
        el.style.width = '100%';
        el.style.height = '100%';
        container.appendChild(el);

        this.cameraController = new CameraController(el, opts.camera);
        this.camera = this.cameraController.camera;
        this.cameraController.onUserChange = () => {
            this.rotator.interact();
            this.emitCamera();
        };
        this.controls.addEventListener('start', this.onControlsStart);
        this.controls.addEventListener('end', this.onControlsEnd);

        // three.js r152-r154 uses legacy lights; r155 and later use physically based units (scaled by PI).
        const lightScale =
            'useLegacyLights' in this.renderer && this.renderer.useLegacyLights
                ? 1
                : Math.PI;
        const legacy = opts.lights ?? {};
        const globalOpts: boolean | GlobalLightOptions =
            typeof opts.globalLight === 'boolean'
                ? { enabled: opts.globalLight, ...legacy }
                : { ...legacy, ...opts.globalLight };
        this.lightRig = new LightRig(lightScale, {
            global: globalOpts,
            camera: opts.cameraLight,
            shading: opts.shading,
        });
        this.scene.add(this.lightRig.group);

        this.gridHelper = new GridHelper(80, 20, 0x8899aa, 0x8899aa);
        const gm = this.gridHelper.material as Material;
        gm.transparent = true;
        gm.opacity = 0.25;
        this.gridHelper.visible = false;
        this.scene.add(this.gridHelper);

        this.shadowMesh = new Mesh(
            new CircleGeometry(9, 24),
            new MeshBasicMaterial({
                color: 0x000000,
                transparent: true,
                opacity: 0.18,
                depthWrite: false,
            }),
        );
        this.shadowMesh.rotation.x = -Math.PI / 2;
        this.shadowMesh.position.y = 0.05;
        this.scene.add(this.shadowMesh);

        this.skin = new SkinTexture({
            maxSize: this.renderer.capabilities.maxTextureSize,
            filter: opts.skinFilter,
        });
        this.capeTexture = new CapeTexture({
            maxSize: this.renderer.capabilities.maxTextureSize,
            filter: opts.skinFilter,
        });
        this.rig = new CharacterRig(this.skin, {
            capeTexture: this.capeTexture,
            capePhysics: opts.capePhysics,
            armModel: opts.armModel,
            showOverlay: opts.showOverlay,
            blendWidth: opts.blendWidth,
            partOffsets: opts.partOffsets,
            wireframe: opts.wireframe,
            unlit: this.lightRig.unlit,
        });
        this.lightRig.onUnlitChange = unlit => this.rig.setUnlit(unlit);
        this.rig.onRebuild = () => this.rebuildHelpers();
        this.scene.add(this.rig.object);

        this.controller = new AnimationController(this.rig);
        this.skinSwitcher = new SkinSwitcher(this.skin, this.rig, this.controller);
        this.capeSwitcher = new CapeSwitcher(this.capeTexture, this.rig, this.controller);
        if (opts.animations) this.controller.registry = opts.animations;
        this.controller.speed = opts.animationSpeed ?? 1;
        this.controller.intensity = opts.intensity ?? 1;
        this.controller.transition = opts.transition ?? 0.25;
        this.controller.override = opts.pose;
        this.controller.play(opts.animation === undefined ? 'idle' : opts.animation, {
            transition: 0,
        });

        this.controller.getCameraState = () => this.cameraController.getState();
        this.paused = opts.paused ?? false;
        this.onFrame = opts.onFrame;
        this.onCameraChange = opts.onCameraChange;
        this.setBackground(opts.background ?? null);
        this.setGrid(opts.grid ?? false);
        this.setShadow(opts.shadow ?? true);
        this.setShowBones(opts.showBones ?? false);
        this.setControls(opts.controls);
        if (opts.autoRotate !== undefined) this.setAutoRotate(opts.autoRotate);

        el.addEventListener('dblclick', this.onDoubleClick);
        el.addEventListener('pointerenter', this.onPointerEnter);
        el.addEventListener('pointerleave', this.onPointerLeave);

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(container);
        if (typeof IntersectionObserver !== 'undefined') {
            this.intersectionObserver = new IntersectionObserver(entries => {
                this.visible = entries[entries.length - 1]?.isIntersecting ?? true;
            });
            this.intersectionObserver.observe(container);
        }
        this.resize();

        if (opts.skin) void this.setSkin(opts.skin).catch(() => {});
        if (opts.cape) void this.setCape(opts.cape).catch(() => {});
        this.last = performance.now();
        this.raf = requestAnimationFrame(this.tick);
    }

    // -------------------------------------------------------------------- API

    /**
     * Change the skin. `options.resetAnimation` supports two modes:
     * - `false` (default): animation and movement continue without interruption; only the skin changes.
     * - `true`: the current animation restarts when the new skin is applied.
     * The current skin stays visible while the new one loads. If loading fails, the promise rejects and nothing changes.
     * If called multiple times, only the most recent request is applied. `null` uses the default skin.
     */
    setSkin(source: SkinSource | null, options?: SetSkinOptions): Promise<SkinInfo> {
        return this.skinSwitcher.set(source, options);
    }

    setSkinFilter(filter: SkinFilter) {
        this.skin.setFilter(filter);
        this.capeTexture.setFilter(filter);
    }

    /**
     * Load, change, or hide the cape. `options.resetAnimation` supports two modes:
     * - `false` (default): animation and movement continue without interruption; only the cape changes.
     * - `true`: the current animation restarts when the change is applied.
     * `true` uses the default cape; `null` or `false` hides it and returns `null`.
     * The current cape stays visible while the new one loads. If called multiple times, only the latest request is applied.
     */
    async setCape(
        source: CapeSource | boolean | null,
        options?: SetCapeOptions,
    ): Promise<CapeInfo | null> {
        const info = await this.capeSwitcher.set(source, options);
        if (this.showBones) this.rebuildHelpers();
        return info;
    }

    /** Set cape spring motion to `false` or configure it with { stiffness, damping, gravity }. */
    setCapePhysics(o: boolean | CapePhysicsOptions) {
        this.rig.setCapePhysics(o);
    }

    play(source: AnimationSource, opts?: PlayOptions) {
        this.controller.play(source, opts);
    }

    setPose(pose: PartialPose | undefined) {
        this.controller.override = pose;
    }

    setBackground(color: string | null) {
        if (color) this.renderer.setClearColor(new Color(color), 1);
        else this.renderer.setClearColor(0x000000, 0);
    }

    // ----- Lighting -----

    /** Set global lighting to `false`, `true`, or a partial options object. */
    setGlobalLight(o: boolean | GlobalLightOptions) {
        this.lightRig.setGlobal(o);
    }
    /** Set the camera-following headlight to `true`, `false`, or a partial options object. */
    setCameraLight(o: boolean | CameraLightOptions) {
        this.lightRig.setCamera(o);
    }
    /** 'auto' | 'lit' | 'unlit'. */
    setShading(s: Shading) {
        this.lightRig.setShading(s);
    }
    getLightState(): LightState {
        return this.lightRig.getState();
    }
    /** @deprecated Use setGlobalLight. */
    setLights(l?: { ambient?: number; directional?: number }) {
        if (l) this.lightRig.setGlobal(l);
    }

    setGrid(v: boolean) {
        this.gridHelper.visible = v;
    }
    setShadow(v: boolean) {
        this.shadowEnabled = v;
        this.shadowMesh.visible = v;
    }

    setShowBones(v: boolean) {
        this.showBones = v;
        this.rebuildHelpers();
    }

    // ----- Camera: OrbitControls -----

    /**
     * The three.js `OrbitControls` instance that handles user input. Use it for full customization, e.g.
     * `viewer.controls.enableDamping = true`, `viewer.controls.minDistance = 20`,
     * `viewer.controls.listenToKeyEvents(window)`, or `viewer.controls.addEventListener('change', ...)`.
     *
     * It drives `controls.object` (the orbit camera, without animation offsets), not `viewer.camera`.
     * Settings passed through the `controls` option are applied again by `setControls()`; properties
     * you change directly stay as they are until then.
     */
    get controls(): OrbitControls {
        return this.cameraController.controls;
    }

    // ----- Camera: FOV and zoom -----

    /** Set multiple camera options at once. */
    setCamera(c: CameraOptions, o?: ViewerCameraOptions) {
        this.cameraController.set(c, o);
        this.emitCamera(o);
    }

    /** Set the zoom multiplier, clamped to minZoom..maxZoom. */
    setZoom(zoom: number, o?: ViewerCameraOptions) {
        this.cameraController.setZoom(zoom, o);
        this.emitCamera(o);
    }
    /** Multiply the current zoom. For example, zoomBy(1.25) moves 25% closer. */
    zoomBy(factor: number, o?: ViewerCameraOptions) {
        this.cameraController.zoomBy(factor, o);
        this.emitCamera(o);
    }
    getZoom() {
        return this.cameraController.getZoom();
    }

    /** Set the vertical field of view in degrees (5-120). */
    setFov(fov: number, o?: ViewerCameraOptions) {
        this.cameraController.setFov(fov, o);
        this.emitCamera(o);
    }
    getFov() {
        return this.cameraController.getFov();
    }

    /**
     * Reset the view to its starting angle, distance, zoom, and FOV. With `{ duration }`, the reset is animated.
     * The promise resolves to true when complete or false if interrupted.
     */
    resetCamera(o?: ViewerCameraAnimateOptions): Promise<boolean> {
        const p = this.cameraController.reset(o);
        this.emitCamera(o);
        return p;
    }

    /**
     * Animate the camera to the target values using the given duration and easing.
     * Supports zoom, FOV, azimuth, polar angle, distance, and target.
     * The promise resolves to true when complete or false if interrupted. `onCameraChange` fires once with the target values.
     */
    animateCamera(
        to: CameraAnimateTarget,
        o?: ViewerCameraAnimateOptions,
    ): Promise<boolean> {
        const p = this.cameraController.animateTo(to, o);
        this.emitCamera(o);
        return p;
    }
    /** Shorthand for animateCamera({ zoom }). */
    zoomTo(zoom: number, o?: ViewerCameraAnimateOptions) {
        return this.animateCamera({ zoom }, o);
    }
    /** Shorthand for animateCamera({ fov }). */
    fovTo(fov: number, o?: ViewerCameraAnimateOptions) {
        return this.animateCamera({ fov }, o);
    }
    /** Stop the current camera animation at its current values. */
    stopCameraAnimation() {
        this.cameraController.stopAnimations();
    }

    getCameraState(): CameraState {
        return this.cameraController.getState();
    }

    /**
     * Apply user input settings. Settings that are omitted return to their defaults (see `ControlsOptions`).
     * `false` disables all input; `true` or `undefined` uses the defaults (drag to rotate).
     */
    setControls(c?: boolean | ControlsOptions) {
        const o: ControlsOptions =
            c === false
                ? { rotate: false, zoom: false, pan: false }
                : c === true || c === undefined
                  ? {}
                  : c;
        this.ctl = {
            rotate: o.rotate ?? true,
            zoom: o.zoom ?? false,
            pan: o.pan ?? false,
            resetOnDoubleClick: o.resetOnDoubleClick ?? false,
        };
        this.cameraController.configureControls(o);
        // controls.autoRotate is used only when the top-level autoRotate option is not set.
        this.controlsAutoRotate = c && typeof c === 'object' ? c.autoRotate : undefined;
        if (!this.autoRotateExplicit) this.rotator.set(this.controlsAutoRotate ?? false);
        const el = this.renderer.domElement;
        el.style.touchAction =
            this.ctl.rotate || this.ctl.zoom || this.ctl.pan ? 'none' : 'auto';
        el.style.cursor = this.idleCursor();
    }

    // ----- Automatic rotation -----

    /**
     * Set automatic rotation to `true`, `false`, a speed in degrees per second, or
     * { speed, resumeDelay, ramp, pauseOnHover }. `undefined` follows `controls.autoRotate` again.
     */
    setAutoRotate(o: AutoRotateInput | undefined) {
        this.autoRotateExplicit = o !== undefined;
        this.rotator.set(o === undefined ? (this.controlsAutoRotate ?? false) : o);
    }
    /** Enable automatic rotation and start rotating immediately. */
    startAutoRotate() {
        this.autoRotateExplicit = true;
        this.rotator.start();
    }
    stopAutoRotate() {
        this.autoRotateExplicit = true;
        this.rotator.stop();
    }
    /** Return true if automatic rotation is enabled. */
    toggleAutoRotate(): boolean {
        this.autoRotateExplicit = true;
        return this.rotator.toggle();
    }
    /** Return true if the camera is currently rotating, not merely enabled. Rotation pauses during user interaction. */
    isAutoRotating() {
        return this.rotator.active;
    }
    getAutoRotate(): AutoRotateOptions & { enabled: boolean } {
        const r = this.rotator;
        return {
            enabled: r.enabled,
            speed: r.speed,
            resumeDelay: r.resumeDelay,
            ramp: r.ramp,
            pauseOnHover: r.pauseOnHover,
        };
    }

    /** Capture the current canvas as a data URL. */
    screenshot(type = 'image/png', quality?: number): string {
        this.renderer.render(this.scene, this.camera);
        return this.renderer.domElement.toDataURL(type, quality);
    }

    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        cancelAnimationFrame(this.raf);
        this.skinSwitcher.cancel();
        this.capeSwitcher.cancel();
        this.controls.removeEventListener('start', this.onControlsStart);
        this.controls.removeEventListener('end', this.onControlsEnd);
        this.cameraController.dispose();
        this.resizeObserver.disconnect();
        this.intersectionObserver?.disconnect();
        const el = this.renderer.domElement;
        el.removeEventListener('dblclick', this.onDoubleClick);
        el.removeEventListener('pointerenter', this.onPointerEnter);
        el.removeEventListener('pointerleave', this.onPointerLeave);
        this.clearHelpers();
        this.rig.dispose();
        this.skin.dispose();
        this.capeTexture.dispose();
        this.gridHelper.geometry.dispose();
        (this.gridHelper.material as Material).dispose();
        this.shadowMesh.geometry.dispose();
        (this.shadowMesh.material as Material).dispose();
        this.renderer.dispose();
        this.renderer.forceContextLoss();
        el.parentNode?.removeChild(el);
    }

    // --------------------------------------------------------------- Internal

    private emitCamera(o?: { silent?: boolean }) {
        if (!o?.silent) this.onCameraChange?.(this.cameraController.getState());
    }

    private clearHelpers() {
        this.helpers.forEach(h => {
            this.scene.remove(h);
            h.geometry.dispose();
            (h.material as Material).dispose();
        });
        this.helpers = [];
    }

    private rebuildHelpers() {
        this.clearHelpers();
        if (!this.showBones) return;
        this.rig.object.updateMatrixWorld(true);
        const holders: Object3D[] = Object.values(this.rig.limbs).map(l => l.holder);
        if (this.rig.capeVisible) holders.push(this.rig.cape.holder);
        for (const holder of holders) {
            const h = new SkeletonHelper(holder);
            const m = h.material as Material;
            m.depthTest = false;
            h.renderOrder = 10;
            this.scene.add(h);
            this.helpers.push(h);
        }
    }

    private resize() {
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        if (w === 0 || h === 0) return;
        this.renderer.setSize(w, h, false);
        this.cameraController.setAspect(w / h);
    }

    private tick = () => {
        if (this.disposed) return;
        this.raf = requestAnimationFrame(this.tick);
        const now = performance.now();
        const dt = Math.min((now - this.last) / 1000, 0.1);
        this.last = now;
        if (!this.visible) return;

        const pose = this.controller.update(dt, this.paused);
        this.rig.applyPose(pose, dt);

        if (this.shadowEnabled) {
            const lift = Math.max(0, pose.position.y);
            this.shadowMesh.scale.setScalar(Math.max(0.4, 1 - lift * 0.02));
        }
        const spin = this.rotator.step(dt, this.cameraController.isAnimating);
        if (spin !== 0) this.cameraController.spin(spin);
        this.cameraController.update(dt, pose.camera);
        this.lightRig.update(this.camera, this.cameraController.focus);

        this.onFrame?.({ delta: dt, pose, viewer: this });
        this.renderer.render(this.scene, this.camera);
    };

    private idleCursor() {
        return this.ctl.rotate || this.ctl.pan ? 'grab' : 'default';
    }

    // OrbitControls fires 'start' on pointer down / wheel and 'end' when the interaction finishes.
    private onControlsStart = () => {
        this.renderer.domElement.style.cursor = 'grabbing';
        this.rotator.setHold(true);
        this.rotator.interact();
    };

    private onControlsEnd = () => {
        this.rotator.setHold(false);
        this.rotator.interact();
        this.renderer.domElement.style.cursor = this.idleCursor();
    };

    private onPointerEnter = (e: PointerEvent) => {
        if (e.pointerType !== 'touch') this.rotator.setHover(true);
    };
    private onPointerLeave = (e: PointerEvent) => {
        if (e.pointerType !== 'touch') this.rotator.setHover(false);
    };

    private onDoubleClick = () => {
        if (!this.ctl.resetOnDoubleClick) return;
        void this.cameraController.reset();
        this.rotator.interact();
        this.emitCamera();
    };
}
