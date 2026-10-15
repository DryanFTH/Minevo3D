'use client';

import {
    type CSSProperties,
    type ForwardedRef,
    forwardRef,
    useEffect,
    useRef,
} from 'react';

import type { AnimationFn, AnimationSource } from '@/animation/animations';
import type { CapeInfo, CapeSource } from '@/cape/cape';
import type { CapePhysicsOptions } from '@/cape/capeRig';
import type { EaseFn, EaseName } from '@/character/pose';
import type { ArmModel } from '@/character/rig';
import type { AutoRotateInput } from '@/rendering/autorotate';
import type { CameraOptions, CameraState } from '@/rendering/camera';
import type { CameraLightOptions, GlobalLightOptions, Shading } from '@/rendering/lights';
import {
    CharacterViewer,
    type ControlsOptions,
    type FrameInfo,
} from '@/rendering/viewer';
import type { SkinFilter, SkinInfo, SkinSource } from '@/skin/skin';
import type { PartialPartRotations, PartialPose } from '@/types/types';

export type ReactMinevo3DProps = {
    /**
     * URL, File, Blob, image, or canvas. Supports 1.8+ skins (64x64) and legacy skins (64x32),
     * and HD sizes (128, 256, 512, ...) while preserving the original resolution.
     * null/undefined uses the default skin.
     */
    skin?: SkinSource | null;

    /**
     * Cape source: URL, File, Blob, image, canvas, or ImageBitmap. Supports 64x32, compact
     * 22x17, and HD multiples while preserving the original resolution. `true` uses the
     * default cape; `null`, `false`, or an empty value hides it.
     */
    cape?: CapeSource | boolean | null;

    /**
     * Controls behavior when the `cape` prop changes. `false` (default) preserves the current
     * animation and movement. `true` restarts the animation when the change is applied.
     * `{ transition }` also cross-fades over the specified duration in seconds. For per-call
     * control, use `ref.setCape(cape, { resetAnimation })`.
     */
    resetOnCapeChange?: boolean | { transition?: number };

    /**
     * Secondary cape spring motion makes the cape lag and gently bounce as the body moves.
     * `false` makes the cape follow its target directly. Options may specify `stiffness`,
     * `damping`, and `gravity`. There is no cost when no cape is loaded.
     */
    capePhysics?: boolean | CapePhysicsOptions;

    /**
     * Controls behavior when the `skin` prop changes. `false` (default) preserves the current
     * animation and movement. `true` restarts the animation when the new skin is applied.
     * `{ transition }` also cross-fades from the current pose over the specified duration in
     * seconds. For per-call control, use `ref.setSkin(skin, { resetAnimation })`.
     */
    resetOnSkinChange?: boolean | { transition?: number };

    /**
     * 'auto' (default) uses pixelation and mipmaps when reducing HD skins; 'nearest' always
     * pixelates; 'smooth' uses linear filtering.
     */
    skinFilter?: SkinFilter;

    /**
     * Arm model. 'auto' detects slim (Alex) skins. Defaults to 'auto'.
     */
    armModel?: ArmModel;

    /**
     * Show outer skin layers (jacket, trousers, and hat). Defaults to true.
     */
    showOverlay?: boolean;

    /**
     * Animation to play: a built-in name ('idle' | 'walk' | 'run' | 'float' | 'wave' | 'sit'),
     * a name from the `animations` prop, an AnimationFn, or null. Defaults to 'idle'.
     */
    animation?: AnimationSource;

    /**
     * Inline animation functions do not restart on every render. Change this value to restart
     * playback or switch to another function.
     */
    animationKey?: string | number;

    /**
     * Custom animation registry in the form `{ name: function }`.
     */
    animations?: Record<string, AnimationFn>;

    /**
     * Animation speed multiplier. Defaults to 1.
     */
    animationSpeed?: number;

    /**
     * Animation amplitude multiplier. Defaults to 1.
     */
    intensity?: number;

    /**
     * Cross-fade duration in seconds when changing animations. Defaults to 0.25.
     */
    transition?: number;

    /**
     * Override selected joints on top of the animation, for example, to make the head follow
     * the mouse.
     */
    pose?: PartialPose;

    /**
     * Manual rotation (degrees) of the head, torso, and arm and leg joints, for example from rotation
     * sliders. This is the base rotation of each part: the animation and `pose` are ADDED on top of it
     * (they only add to or subtract from it), so it keeps working while an animation plays. Fields that
     * are not given are 0. Changing the object updates the character immediately.
     *
     * `head` / `torso`: `{ pitch, yaw, roll }`. `armL` / `armR` / `legL` / `legR`:
     * `{ forward, out, bend, bendIn }`.
     */
    partRotations?: PartialPartRotations;

    /**
     * Freeze the animation.
     */
    paused?: boolean;

    /**
     * Joint blend zone width at elbows and knees. Smaller values create sharper joints;
     * larger values smooth them. Defaults to 1.5.
     */
    blendWidth?: number;

    /**
     * Camera options: distance, azimuth, polar, target, minZoom, maxZoom, keepFraming,
     * smoothing, and initial FOV/zoom.
     */
    camera?: CameraOptions;

    /**
     * Vertical field of view in degrees (5–120). Defaults to 40. Smaller values flatten
     * perspective; larger values widen it.
     */
    fov?: number;

    /**
     * Zoom multiplier (1 = normal, 2 = twice as close), clamped to camera.minZoom..maxZoom
     * (default 0.3–5).
     */
    zoom?: number;

    /**
     * When set, changes to the `fov` and `zoom` props use a tween with this duration instead
     * of the default damping, for example `{ duration: 0.8, ease: 'easeInOut' }`.
     */
    cameraTransition?: { duration?: number; ease?: EaseName | EaseFn; delay?: number };

    /**
     * Automatic camera rotation. `true` means 15°/second; a number specifies degrees per
     * second (negative values rotate in the opposite direction); or provide
     * `{ speed, resumeDelay, ramp, pauseOnHover }`. Rotation pauses during user interaction
     * and resumes after `resumeDelay` (default 2 seconds). Works when `controls` is disabled
     * and takes precedence over `controls.autoRotate`.
     */
    autoRotate?: AutoRotateInput;

    /**
     * Enable or disable controls, or specify options. Input is handled by three.js
     * `OrbitControls`, so the options mirror its settings: `rotate`, `zoom`, `pan`,
     * `rotateSpeed`, `zoomSpeed`, `panSpeed`, `enableDamping`, `dampingFactor`,
     * `screenSpacePanning`, `zoomToCursor`, `minDistance`, `maxDistance`, `mouseButtons`,
     * `touches`, plus `autoRotate` and `resetOnDoubleClick`. Defaults to drag-to-rotate with
     * scroll zoom and panning disabled.
     *
     * For anything else, use the live `OrbitControls` instance: `onReady={v => { v.controls... }}`
     * or `ref.current.controls`.
     */
    controls?: boolean | ControlsOptions;

    /**
     * CSS background color; null makes the background transparent (default).
     */
    background?: string | null;

    grid?: boolean;

    /**
     * Show the circular floor shadow. Defaults to true.
     */
    shadow?: boolean;

    wireframe?: boolean;

    showBones?: boolean;

    /**
     * Global light fixed in the world (ambient and directional). `false` removes lights from
     * rendering. Defaults to enabled.
     */
    globalLight?: boolean | GlobalLightOptions;

    /**
     * Camera light that follows the camera (headlight). Defaults to disabled.
     */
    cameraLight?: boolean | CameraLightOptions;

    /**
     * 'auto' (default) renders the character unlit when both global and camera lights are
     * disabled. 'lit' and 'unlit' force a mode; 'unlit' also removes all lights from rendering.
     */
    shading?: Shading;

    /**
     * @deprecated Use `globalLight` instead.
     */
    lights?: { ambient?: number; directional?: number };

    maxPixelRatio?: number;

    /**
     * Called once after the viewer is created AND all props (skin, cape, pose, camera, etc.)
     * have been applied. Receives the same `CharacterViewer` instance that the `ref` exposes.
     * Calls made on it here are not overwritten by the initial prop synchronization.
     */
    onReady?: (viewer: ReactMinevo3DHandle) => void;

    /**
     * Called on each frame after the pose has been applied.
     */
    onFrame?: (info: FrameInfo) => void;

    /**
     * Called when the camera changes through user interaction or the handle, but not through
     * props.
     */
    onCameraChange?: (state: CameraState) => void;

    onSkinLoad?: (info: SkinInfo) => void;

    /**
     * Called after a cape loads successfully; not called when the cape is hidden.
     */
    onCapeLoad?: (info: CapeInfo) => void;

    onCapeError?: (error: Error) => void;

    onSkinError?: (error: Error) => void;

    className?: string;

    style?: CSSProperties;

    alt?: string;
};

/**
 * What `ref` and `onReady` expose: the `CharacterViewer` itself. Kept as an alias so existing
 * type imports keep working.
 */
export type ReactMinevo3DHandle = CharacterViewer;

function assignRef<T>(ref: ForwardedRef<T>, value: T | null) {
    if (typeof ref === 'function') ref(value);
    else if (ref) ref.current = value;
}

export const ReactMinevo3D = forwardRef<ReactMinevo3DHandle, ReactMinevo3DProps>(
    function ReactMinevo3D(props, ref) {
        const {
            skin = null,
            skinFilter = 'auto',
            resetOnSkinChange = false,

            cape,
            resetOnCapeChange = false,
            capePhysics,

            armModel = 'auto',
            showOverlay = true,

            animation = 'idle',
            animationKey,
            animations,
            animationSpeed = 1,
            intensity = 1,
            transition = 0.25,
            pose,
            partRotations,
            paused = false,
            blendWidth = 1.5,

            camera,
            fov,
            zoom,
            cameraTransition,
            autoRotate,
            controls = true,

            background = null,
            grid = false,
            shadow = true,
            wireframe = false,
            showBones = false,
            globalLight,
            cameraLight,
            shading,
            lights,
            maxPixelRatio = 2,

            className,
            style,
            alt = 'Karakter Minecraft 3D',
        } = props;

        const containerRef = useRef<HTMLDivElement>(null);
        const viewerRef = useRef<CharacterViewer | null>(null);

        // Keep the latest props available to callbacks without restarting effects.
        const latest = useRef(props);
        latest.current = props;

        const animationRef = useRef(animation);
        animationRef.current = animation;

        const transitionRef = useRef(transition);
        transitionRef.current = transition;

        const cameraTransitionRef = useRef(cameraTransition);
        cameraTransitionRef.current = cameraTransition;

        // Create and dispose the viewer once per mount.
        useEffect(() => {
            const el = containerRef.current;

            if (!el) return;

            const p = latest.current;
            const initialAnim = p.animation === undefined ? 'idle' : p.animation;
            const viewer = new CharacterViewer(el, {
                skinFilter: p.skinFilter,
                capePhysics: p.capePhysics,
                armModel: p.armModel,
                showOverlay: p.showOverlay,
                blendWidth: p.blendWidth,
                animation:
                    typeof initialAnim === 'function'
                        ? ctx => {
                              const a = animationRef.current;
                              return typeof a === 'function' ? a(ctx) : {};
                          }
                        : initialAnim,
                animations: p.animations,
                animationSpeed: p.animationSpeed,
                intensity: p.intensity,
                transition: p.transition,
                pose: p.pose,
                partRotations: p.partRotations,
                paused: p.paused,
                camera: {
                    ...p.camera,
                    ...(p.fov !== undefined ? { fov: p.fov } : {}),
                    ...(p.zoom !== undefined ? { zoom: p.zoom } : {}),
                },
                controls: p.controls,
                autoRotate: p.autoRotate,
                onCameraChange: state => latest.current.onCameraChange?.(state),
                background: p.background,
                grid: p.grid,
                shadow: p.shadow,
                wireframe: p.wireframe,
                showBones: p.showBones,
                globalLight: p.globalLight,
                cameraLight: p.cameraLight,
                shading: p.shading,
                lights: p.lights,
                maxPixelRatio: p.maxPixelRatio,
                onFrame: info => latest.current.onFrame?.(info),
            });

            viewerRef.current = viewer;

            return () => {
                viewer.dispose();
                viewerRef.current = null;
            };
        }, []);

        useEffect(() => {
            assignRef(ref, viewerRef.current);

            return () => assignRef(ref, null);
        }, [ref]);

        // Load the skin and report load results.
        const firstSkin = useRef(true);
        useEffect(() => {
            const v = viewerRef.current;

            if (!v) return;

            const isFirst = firstSkin.current;
            firstSkin.current = false;
            const r = latest.current.resetOnSkinChange;
            let cancelled = false;
            v.setSkin(skin, {
                resetAnimation: !isFirst && !!r,
                transition: typeof r === 'object' ? r.transition : undefined,
            }).then(
                info => {
                    if (!cancelled) latest.current.onSkinLoad?.(info);
                },
                err => {
                    if (!cancelled)
                        latest.current.onSkinError?.(
                            err instanceof Error ? err : new Error(String(err)),
                        );
                },
            );

            return () => {
                cancelled = true;
            };
        }, [skin]);

        // Load the cape and report load results.
        const firstCape = useRef(true);
        useEffect(() => {
            const v = viewerRef.current;

            if (!v) return;

            const isFirst = firstCape.current;
            firstCape.current = false;
            const r = latest.current.resetOnCapeChange;
            let cancelled = false;
            v.setCape(cape ?? null, {
                resetAnimation: !isFirst && !!r,
                transition: typeof r === 'object' ? r.transition : undefined,
            }).then(
                info => {
                    if (!cancelled && info) latest.current.onCapeLoad?.(info);
                },
                err => {
                    if (!cancelled)
                        latest.current.onCapeError?.(
                            err instanceof Error ? err : new Error(String(err)),
                        );
                },
            );

            return () => {
                cancelled = true;
            };
        }, [cape]);

        // Update cape physics and character appearance.
        const capePhysicsKey = JSON.stringify(capePhysics);
        useEffect(() => {
            if (capePhysics === undefined) return;

            viewerRef.current?.setCapePhysics(capePhysics);
        }, [capePhysicsKey]); // eslint-disable-line react-hooks/exhaustive-deps

        useEffect(() => {
            viewerRef.current?.setSkinFilter(skinFilter);
        }, [skinFilter]);

        useEffect(() => {
            viewerRef.current?.rig.setArmModel(armModel);
        }, [armModel]);

        useEffect(() => {
            viewerRef.current?.rig.setOverlayVisible(showOverlay);
        }, [showOverlay]);

        useEffect(() => {
            viewerRef.current?.rig.setBlendWidth(blendWidth);
        }, [blendWidth]);

        useEffect(() => {
            viewerRef.current?.rig.setWireframe(wireframe);
        }, [wireframe]);

        useEffect(() => {
            viewerRef.current?.setShowBones(showBones);
        }, [showBones]);

        // Inline animation functions restart only when their identity or animationKey changes.
        const animIdentity =
            typeof animation === 'function'
                ? `fn:${animationKey ?? ''}`
                : String(animation);
        const firstAnim = useRef(true);
        useEffect(() => {
            const v = viewerRef.current;

            if (!v) return;

            if (firstAnim.current) {
                firstAnim.current = false;

                // The initial animation was already applied when the viewer was created.
                return;
            }

            const a = animationRef.current;
            v.play(
                typeof a === 'function'
                    ? ctx => {
                          const cur = animationRef.current;
                          return typeof cur === 'function' ? cur(ctx) : {};
                      }
                    : a,
                { transition: transitionRef.current, restart: typeof a === 'function' },
            );
        }, [animIdentity]);

        // Update animation settings and pose.
        useEffect(() => {
            const v = viewerRef.current;

            if (!v || !animations) return;

            v.controller.registry = animations;
        }, [animations]);

        useEffect(() => {
            const viewer = viewerRef.current;

            if (!viewer) return;

            viewer.controller.speed = animationSpeed;
        }, [animationSpeed]);

        useEffect(() => {
            const viewer = viewerRef.current;

            if (!viewer) return;

            viewer.controller.intensity = intensity;
        }, [intensity]);

        useEffect(() => {
            const viewer = viewerRef.current;

            if (!viewer) return;

            viewer.controller.transition = transition;
        }, [transition]);

        useEffect(() => {
            viewerRef.current?.setPose(pose);
        }, [pose]);

        useEffect(() => {
            viewerRef.current?.rig.setPartRotations(partRotations);
        }, [partRotations]);

        useEffect(() => {
            const viewer = viewerRef.current;

            if (!viewer) return;

            viewer.paused = paused;
        }, [paused]);

        // Top-level `fov` and `zoom` props take precedence over `camera.fov` and `camera.zoom`.
        const cameraKey = JSON.stringify(camera ?? {});
        useEffect(() => {
            const { fov: cf, zoom: cz, ...rest } = camera ?? {};
            viewerRef.current?.setCamera(
                {
                    ...rest,
                    ...(fov === undefined ? { fov: cf } : {}),
                    ...(zoom === undefined ? { zoom: cz } : {}),
                },
                { asHome: true, silent: true },
            );
        }, [cameraKey]); // eslint-disable-line react-hooks/exhaustive-deps

        useEffect(() => {
            if (fov === undefined) return;

            const t = cameraTransitionRef.current;

            if (t) void viewerRef.current?.animateCamera({ fov }, { ...t, silent: true });
            else viewerRef.current?.setFov(fov, { silent: true });
        }, [fov]);

        useEffect(() => {
            if (zoom === undefined) return;

            const t = cameraTransitionRef.current;

            if (t)
                void viewerRef.current?.animateCamera({ zoom }, { ...t, silent: true });
            else viewerRef.current?.setZoom(zoom, { silent: true });
        }, [zoom]);

        // `undefined` follows controls.autoRotate; any other value, including false, overrides it.
        const autoRotateKey = JSON.stringify(autoRotate) ?? 'undefined';
        useEffect(() => {
            viewerRef.current?.setAutoRotate(autoRotate);
        }, [autoRotateKey]); // eslint-disable-line react-hooks/exhaustive-deps

        const controlsKey = JSON.stringify(controls);
        useEffect(() => {
            viewerRef.current?.setControls(controls);
        }, [controlsKey]); // eslint-disable-line react-hooks/exhaustive-deps

        const lightsKey = JSON.stringify(lights ?? {});
        useEffect(() => {
            if (!lights) return;

            viewerRef.current?.setLights(lights);
        }, [lightsKey]); // eslint-disable-line react-hooks/exhaustive-deps

        // Apply light settings only when provided to preserve changes made through the viewer.
        const globalLightKey = JSON.stringify(globalLight);
        useEffect(() => {
            if (globalLight === undefined) return;

            viewerRef.current?.setGlobalLight(globalLight);
        }, [globalLightKey]); // eslint-disable-line react-hooks/exhaustive-deps

        const cameraLightKey = JSON.stringify(cameraLight);
        useEffect(() => {
            if (cameraLight === undefined) return;

            viewerRef.current?.setCameraLight(cameraLight);
        }, [cameraLightKey]); // eslint-disable-line react-hooks/exhaustive-deps

        useEffect(() => {
            if (shading === undefined) return;

            viewerRef.current?.setShading(shading);
        }, [shading]);

        // Update the scene background and helpers.
        useEffect(() => {
            viewerRef.current?.setBackground(background);
        }, [background]);

        useEffect(() => {
            viewerRef.current?.setGrid(grid);
        }, [grid]);

        useEffect(() => {
            viewerRef.current?.setShadow(shadow);
        }, [shadow]);

        // Keep this effect LAST: effects run in declaration order, so every prop has already
        // been applied when `onReady` fires and its changes are not overwritten.
        useEffect(() => {
            const viewer = viewerRef.current;

            if (!viewer) return;

            latest.current.onReady?.(viewer);
        }, []);

        return (
            <div
                ref={containerRef}
                role='img'
                aria-label={alt}
                className={className}
                style={{ position: 'relative', width: '100%', height: '100%', ...style }}
            />
        );
    },
);
