import type { AnimationController } from '@/animation/controller';
import type { CharacterRig } from '@/character/rig';
import type { SkinInfo, SkinSource, SkinTexture } from '@/skin/skin';

export interface SetSkinOptions {
    /**
     * false (default): The current animation, pose, and movement continue without interruption; only the skin changes.
     * true: The current animation restarts when the new skin is applied, not when the request starts.
     * This prevents a restart while the skin is loading or if loading fails.
     */
    resetAnimation?: boolean;

    /** Used only when resetAnimation is true: cross-fade duration in seconds from the current pose to the animation start. Default: 0 (immediate). */
    transition?: number;
}

/**
 * Changes the skin of an animated character. Kept separate from the viewer so it can be tested without WebGL.
 *
 * Steps: load the image (the current skin stays visible while loading) -> update the texture -> update the arm model
 * (rebuild only when switching between classic and slim) -> optionally restart the animation.
 */
export class SkinSwitcher {
    private token = 0;

    constructor(
        private skin: SkinTexture,
        private rig: CharacterRig,
        private controller: AnimationController,
    ) {}

    /**
     * @param source The new skin, or null to use the default skin.
     * If a newer call starts first, this call applies nothing, including an animation reset.
     * If loading fails, the promise rejects and the skin and animation remain unchanged.
     */
    async set(source: SkinSource | null, opts: SetSkinOptions = {}): Promise<SkinInfo> {
        const token = ++this.token;
        const info =
            source == null ? this.skin.paintDefault() : await this.skin.load(source);

        if (token !== this.token) return info;

        this.rig.refreshArms();

        if (opts.resetAnimation) this.controller.restart({ transition: opts.transition });

        return info;
    }

    /** Ignore any pending load result. Called when the viewer is disposed. */
    cancel() {
        this.token++;
    }
}
