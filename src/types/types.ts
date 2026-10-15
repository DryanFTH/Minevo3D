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

    /**
     * Position offsets per body part, in skin pixels. These are ADDED to the offsets set on the rig
     * (`rig.setPartOffset`), never replacing them: the rig holds the base position and the animation only
     * moves the part away from it and back. Changing the rig offset while an animation plays therefore
     * takes effect immediately and the animation keeps working on top of it. 0 means "no change".
     * See PartOffsets for the coordinate space.
     */
    offset: PartOffsets;
}

export type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/** Partial pose: only specified joints change; the rest follow the base pose. */
export type PartialPose = DeepPartial<Pose>;

export type LimbName = 'armL' | 'armR' | 'legL' | 'legR';

/** Body parts that can be moved: the head, the torso (everything above the waist), and the four limbs. */
export type PartName = 'head' | 'torso' | LimbName;

/**
 * A position offset for every body part (skin pixels). Each offset is in the LOCAL space of the part's
 * parent, so it follows the parent's rotation:
 * - `torso` and the legs are relative to the whole character (affected by `pose.rotation`).
 * - `head` and the arms are relative to the torso (they also follow `pose.torso` rotation), and moving the
 *   torso moves the head, arms, and cape with it.
 * The character faces +z, its LEFT side is +x, and +y is up.
 */
export type PartOffsets = Record<PartName, Vec3>;

/** Partial offsets: unspecified parts and axes are 0. */
export type PartialPartOffsets = { [K in PartName]?: Partial<Vec3> };

/**
 * Manual rotation for every body part, set on the rig (`rig.setPartRotation`). `head` and `torso` use
 * {@link Rot3}; the four limbs use {@link JointPose} (the same fields as in a pose). All angles are in degrees.
 *
 * These are the BASE rotation of each part. The animation / pose never replaces them: the value in the pose
 * (`pose.head`, `pose.armL`, ...) is ADDED on top, so the animation only adds to or subtracts from what was set
 * manually. 0 means "no manual rotation".
 */
export type PartRotations = {
    head: Rot3;
    torso: Rot3;
    armL: JointPose;
    armR: JointPose;
    legL: JointPose;
    legR: JointPose;
};

/** Rotation type used by one part: {@link Rot3} for `head` / `torso`, {@link JointPose} for the limbs. */
export type PartRotation<P extends PartName = PartName> = PartRotations[P];

/** Partial manual rotations: unspecified parts and fields are 0. */
export type PartialPartRotations = { [K in PartName]?: Partial<PartRotations[K]> };
