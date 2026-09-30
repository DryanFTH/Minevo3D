import type { AnimationController } from '@/animation/controller';
import type { CapeInfo, CapeSource, CapeTexture } from '@/cape/cape';
import type { CharacterRig } from '@/character/rig';
import type { SetSkinOptions } from '@/skin/skinSwitcher';

export type SetCapeOptions = SetSkinOptions;

export class CapeSwitcher {
    private token = 0;

    constructor(
        private cape: CapeTexture,
        private rig: CharacterRig,
        private controller: AnimationController,
    ) {}

    async set(
        source: CapeSource | boolean | null,
        opts: SetCapeOptions = {},
    ): Promise<CapeInfo | null> {
        const token = ++this.token;
        let info: CapeInfo | null;

        if (source === null || source === false) {
            this.cape.cancelPending();
            this.rig.setCapeVisible(false);
            info = null;
        } else if (source === true) {
            info = this.cape.paintDefault();
            this.rig.setCapeVisible(true);
        } else {
            info = await this.cape.load(source);

            if (token !== this.token) return info;

            this.rig.setCapeVisible(true);
        }

        if (opts.resetAnimation) {
            this.controller.restart({ transition: opts.transition });
        }

        return info;
    }

    cancel() {
        this.token++;
        this.cape.cancelPending();
    }
}
