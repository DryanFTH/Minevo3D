// Core (without React): can be used with other frameworks.
export { CharacterViewer } from '@/rendering/viewer';
export type {
    ViewerOptions,
    ViewerCameraOptions,
    ViewerCameraAnimateOptions,
    ControlsOptions,
    FrameInfo,
} from '@/rendering/viewer';

// Camera and automatic rotation
export {
    CameraController,
    REFERENCE_FOV,
    FOV_MIN,
    FOV_MAX,
    ZOOM_ABS_MIN,
    ZOOM_ABS_MAX,
} from '@/rendering/camera';
export type {
    OrbitControlsOptions,
    CameraOptions,
    CameraState,
    CameraSetOptions,
    CameraAnimateTarget,
    CameraAnimateOptions,
} from '@/rendering/camera';
export { AutoRotator } from '@/rendering/autorotate';
export type { AutoRotateOptions, AutoRotateInput } from '@/rendering/autorotate';

// Character rig
export { CharacterRig, Limb } from '@/character/rig';
export type { ArmModel, RigOptions } from '@/character/rig';

// Skin
export { SkinTexture } from '@/skin/skin';
export type { SkinSource, SkinInfo, SkinFilter, SkinTextureOptions } from '@/skin/skin';
export { SkinSwitcher } from '@/skin/skinSwitcher';
export type { SetSkinOptions } from '@/skin/skinSwitcher';

// Cape
export { CapeTexture } from '@/cape/cape';
export type { CapeSource, CapeInfo, CapeTextureOptions } from '@/cape/cape';
export { CapeMesh, CapeDynamics, CAPE_REST_SWING } from '@/cape/capeRig';
export type { CapePhysicsOptions } from '@/cape/capeRig';
export { CapeSwitcher } from '@/cape/capeSwitcher';
export type { SetCapeOptions } from '@/cape/capeSwitcher';

// Lighting: global light, camera light, and shading
export { LightRig } from '@/rendering/lights';
export type {
    GlobalLightOptions,
    CameraLightOptions,
    LightingOptions,
    LightState,
    Shading,
} from '@/rendering/lights';

// Pose types
export * from '@/types/types';

// Poses and easing
export {
    REST_POSE,
    POSE_FLOATING,
    POSE_SITTING,
    CAMERA_FACE_CLOSEUP,
    mergePartial,
    resolvePose,
    lerpPose,
    EASINGS,
} from '@/character/pose';
export type { EaseName, EaseFn } from '@/character/pose';

// Animations
export { AnimationController } from '@/animation/controller';
export type { PlayOptions } from '@/animation/controller';
export {
    idle,
    walk,
    run,
    float,
    wave,
    sit,
    BUILT_IN_ANIMATIONS,
    createIdleAnimation,
    createWalkAnimation,
    createRunAnimation,
    createFloatAnimation,
    createWaveAnimation,
    createKeyframeAnimation,
    combineAnimations,
    createDollyZoomAnimation,
    createCameraShake,
    createCameraKeyframeAnimation,
} from '@/animation/animations';
export type {
    AnimationFn,
    AnimationContext,
    AnimationSource,
    BuiltInAnimationName,
    IdleOptions,
    WalkOptions,
    FloatOptions,
    WaveOptions,
    Keyframe,
    KeyframeAnimationOptions,
    DollyZoomOptions,
    CameraShakeOptions,
    CameraKeyframe,
    CameraKeyframeAnimationOptions,
} from '@/animation/animations';
