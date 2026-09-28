/**
 * Automatically rotates the camera horizontally without DOM dependencies, making it easy to test.
 * Returns the angle increment for each frame; the viewer applies it.
 */

export interface AutoRotateOptions {
    /** Whether rotation is enabled. Defaults to enabled when omitted from an options object. */
    enabled?: boolean;

    /** Degrees per second. Negative values rotate in the opposite direction. Defaults to 15. */
    speed?: number;

    /**
     * Seconds to wait after user interaction (drag, pinch, scroll, double-click) before rotating again.
     * 0 resumes immediately on release; Infinity disables automatic resumption. Defaults to 2.
     */
    resumeDelay?: number;

    /** Seconds to accelerate from rest to full speed. 0 starts immediately. Defaults to 0.6. */
    ramp?: number;

    /** Whether to pause while the mouse cursor is over the canvas. Defaults to false. */
    pauseOnHover?: boolean;
}

/** True uses the current options, a number sets speed (0 disables rotation), or pass an options object. */
export type AutoRotateInput = boolean | number | AutoRotateOptions;

const finite = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value);

export class AutoRotator {
    enabled = false;
    speed = 15;
    resumeDelay = 2;
    ramp = 0.6;
    pauseOnHover = false;

    private idle = Infinity;
    private factor = 0;
    private holding = false;
    private hovering = false;

    /**
     * Updates options. Booleans only enable or disable rotation, preserving other options.
     * Numbers set the speed and enable rotation, except 0, which disables it.
     * Objects update only specified fields and enable rotation unless `enabled` is false.
     */
    set(options: AutoRotateInput) {
        const wasEnabled = this.enabled;

        if (typeof options === 'boolean') {
            this.enabled = options;
        } else if (typeof options === 'number') {
            if (finite(options)) {
                if (options === 0) {
                    this.enabled = false;
                } else {
                    this.speed = options;
                    this.enabled = true;
                }
            }
        } else {
            if (finite(options.speed)) this.speed = options.speed;

            if (
                typeof options.resumeDelay === 'number' &&
                !Number.isNaN(options.resumeDelay) &&
                options.resumeDelay >= 0
            ) {
                this.resumeDelay = options.resumeDelay;
            }

            if (finite(options.ramp) && options.ramp >= 0) this.ramp = options.ramp;
            if (typeof options.pauseOnHover === 'boolean') {
                this.pauseOnHover = options.pauseOnHover;
            }

            this.enabled = options.enabled ?? true;
        }

        if (!this.enabled) {
            this.factor = 0;
        } else if (!wasEnabled) {
            this.idle = Infinity;
        }
    }

    /** Enables rotation immediately without waiting for `resumeDelay`. */
    start() {
        if (!this.enabled) this.factor = 0;

        this.enabled = true;
        this.idle = Infinity;
    }

    stop() {
        this.enabled = false;
        this.factor = 0;
    }

    /** Toggles `enabled` and returns its new value. */
    toggle(): boolean {
        if (this.enabled) {
            this.stop();
        } else {
            this.start();
        }

        return this.enabled;
    }

    /** Stops rotation on interaction and resumes after `resumeDelay`. */
    interact() {
        this.idle = 0;
        this.factor = 0;
    }

    /** Holds rotation while the pointer is pressed. */
    setHold(holding: boolean) {
        this.holding = holding;

        if (holding) this.factor = 0;
    }

    setHover(hovering: boolean) {
        this.hovering = hovering;
    }

    /** Whether rotation is currently in progress, rather than merely enabled. */
    get active() {
        return this.enabled && this.factor > 0;
    }

    /**
     * Calculates the azimuth increment in degrees for this frame.
     * @param blocked Whether the camera is being animated by a tween.
     */
    step(dt: number, blocked = false): number {
        if (!(dt > 0)) return 0;

        if (!this.enabled) {
            this.factor = 0;
            return 0;
        }

        this.idle += dt;

        const canSpin =
            !blocked &&
            !this.holding &&
            !(this.pauseOnHover && this.hovering) &&
            this.idle >= this.resumeDelay;

        if (!canSpin) {
            this.factor = 0;
            return 0;
        }

        this.factor = this.ramp > 0 ? Math.min(1, this.factor + dt / this.ramp) : 1;

        const eased = this.factor * this.factor * (3 - 2 * this.factor);

        return this.speed * eased * dt;
    }
}
