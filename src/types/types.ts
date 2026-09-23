/**
 * Base types for character poses.
 *
 * Length unit: 1 unit = 1 skin pixel (the character is 32 units tall, with feet at y = 0).
 * All angles are in degrees.
 * The character faces +z. The character's LEFT side is +x (shown on the right when viewed from the front).
 */

export interface Vec3 {
    x: number;

    y: number;

    z: number;
}

export interface Rot3 {
    /** Positive values lean or bow forward. */
    pitch: number;

    /** Positive values turn toward the character's LEFT. */
    yaw: number;

    /** Positive values tilt toward the character's LEFT. */
    roll: number;
}

/** Pose for one arm or leg (2 rigid segments and 1 joint: elbow or knee). */
export interface JointPose {
    /** Raise forward from the shoulder or hip. 0 = hanging straight, 90 = horizontal forward. */
    forward: number;

    /** Move sideways, away from the body. 90 = horizontal sideways, >90 = above the shoulder. */
    out: number;

    /** Bend the elbow (arm: forward) or knee (leg: backward). */
    bend: number;

    /** Move the lower segment inward, toward the body (negative = away). */
    bendIn: number;
}

/**
 * Camera channel within a pose. Values are RELATIVE to the base camera (prop / user interaction),
 * so animation does not override the user's current zoom: 1 / 0 means "no change".
 */
export interface CameraPose {
    /** Zoom MULTIPLIER. 1 = unchanged, 2 = twice as close as the base zoom. */
    zoom: number;

    /** ADDITIONAL FOV in degrees (0 = unchanged). */
    fov: number;

    /** Additional horizontal orbit angle in degrees. */
    azimuth: number;

    /** Additional vertical orbit angle in degrees. */
    polar: number;

    /** Camera focus offset in units, e.g. y = 12 to focus on the head. */
    target: Vec3;
}

/**
 * Cape channel within a pose. Values are RELATIVE to the cape's normal hanging angle (6°) and pass through the spring
 * simulation (secondary motion), so the cape lags and bounces smoothly. 0 means "hanging normally".
 */
export interface CapePose {
    /** Additional backward swing at the cape's base (degrees; + = the tip moves away from the back). */
    swing: number;

    /** Additional bend at the bottom of the cape (degrees; + = the tip trails farther behind). */
    bend: number;

    /** Side-to-side sway (degrees; + = the cape tip moves to the character's left). */
    sway: number;
}

export interface Pose {
    /** Offset for the whole character (e.g. y > 0 to hover). */
    position: Vec3;

    /** Rotation of the whole character. */
    rotation: Rot3;

    /** Torso rotation relative to the waist. */
    torso: Rot3;

    /** Head rotation relative to the body. */
    head: Rot3;

    armL: JointPose;

    armR: JointPose;

    legL: JointPose;

    legR: JointPose;

    /** Camera animation (zoom, FOV, orbit, focus). See CameraPose. */
    camera: CameraPose;

    /** Cape motion (only applies when a cape is loaded). See CapePose. */
    cape: CapePose;
}

export type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/** Partial pose: only specified joints change; the rest follow the base pose. */
export type PartialPose = DeepPartial<Pose>;

export type LimbName = 'armL' | 'armR' | 'legL' | 'legR';
