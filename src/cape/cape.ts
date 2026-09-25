import {
    CanvasTexture,
    LinearFilter,
    LinearMipmapLinearFilter,
    NearestFilter,
    SRGBColorSpace,
} from 'three';

import { type SkinFilter, type SkinSource, sizeOf, toDrawable } from '@/skin/skin';

/** Cape sources use the same inputs as skins: URL, File, Blob, image, canvas, or ImageBitmap. */
export type CapeSource = SkinSource;

export interface CapeInfo {
    /** Original loaded image dimensions in pixels. */
    width: number;

    height: number;

    /** Standard 64x32 or compact 22x17 format, including supported multiples. */
    format: 'standard' | 'compact';

    /** Texture resolution multiplier: 1 = 64x32, 2 = 128x64, and so on. */
    scale: number;

    isDefault: boolean;

    /** True when the image was reduced to fit the GPU texture limit. */
    downscaled: boolean;
}

export interface CapeTextureOptions {
    /** Maximum texture side in pixels. Larger capes are reduced. Defaults to 4096. */
    maxSize?: number;

    filter?: SkinFilter;
}

function mulberry32(seed: number): () => number {
    return () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Creates a canvas and THREE.CanvasTexture for a Minecraft cape.
 * The layout uses a 64x32 grid with a 10x16x1 box.
 * Resolution follows the source image unless it exceeds the GPU texture limit.
 * Compact 22x17 images are placed in the canvas's top-left corner.
 */
export class CapeTexture {
    readonly canvas: HTMLCanvasElement;
    readonly texture: CanvasTexture;
    info: CapeInfo = {
        width: 64,
        height: 32,
        format: 'standard',
        scale: 1,
        isDefault: true,
        downscaled: false,
    };

    private ctx: CanvasRenderingContext2D;
    private maxSize: number;
    private filter: SkinFilter;
    private loadToken = 0;

    constructor(opts: CapeTextureOptions = {}) {
        this.maxSize = Math.max(64, opts.maxSize ?? 4096);
        this.filter = opts.filter ?? 'auto';
        this.canvas = document.createElement('canvas');
        this.canvas.width = 64;
        this.canvas.height = 32;
        const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Canvas 2D tidak tersedia.');
        this.ctx = ctx;
        ctx.imageSmoothingEnabled = false;
        this.texture = new CanvasTexture(this.canvas);
        this.texture.colorSpace = SRGBColorSpace;
        this.paintDefault();
    }

    setFilter(filter: SkinFilter): void {
        this.filter = filter;
        this.applyFilter();
    }

    private applyFilter() {
        const t = this.texture;
        const mip =
            this.filter === 'smooth' || (this.filter === 'auto' && this.info.scale > 1);
        t.magFilter = this.filter === 'smooth' ? LinearFilter : NearestFilter;
        t.minFilter = mip ? LinearMipmapLinearFilter : NearestFilter;
        t.generateMipmaps = mip;
        t.anisotropy = mip ? 8 : 1;
        t.dispose();
        t.needsUpdate = true;
    }

    private resize(width: number, height: number): void {
        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
        this.ctx.imageSmoothingEnabled = false;
    }

    /** Cancels an in-progress load so it cannot overwrite a hidden or replaced cape. */
    cancelPending(): void {
        this.loadToken++;
    }

    /** Draws the procedural default cape: red with gold trim at 64x32 resolution. */
    paintDefault(): CapeInfo {
        this.loadToken++;
        this.resize(64, 32);
        const ctx = this.ctx;
        const rand = mulberry32(4242);
        ctx.clearRect(0, 0, 64, 32);
        const px = (
            x: number,
            y: number,
            color: readonly [number, number, number],
            brightness = 1,
        ): void => {
            ctx.fillStyle = `rgb(${(color[0] * brightness) | 0},${(color[1] * brightness) | 0},${(color[2] * brightness) | 0})`;
            ctx.fillRect(x, y, 1, 1);
        };
        const red: readonly [number, number, number] = [170, 28, 36];
        const dark: readonly [number, number, number] = [96, 14, 20];
        const gold: readonly [number, number, number] = [232, 186, 60];

        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 10; x++) {
                const edge = x === 0 || x === 9 || y === 0 || y === 15;
                const diamondDistance = Math.abs(x - 4.5) + Math.abs(y - 7.5);
                const diamond = diamondDistance < 3.2;

                if (edge || (diamond && diamondDistance > 1.6)) {
                    px(1 + x, 1 + y, gold, 1 - rand() * 0.1);
                } else {
                    px(1 + x, 1 + y, red, 1.1 - y * 0.02 - rand() * 0.1);
                }
            }
        }

        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 10; x++) {
                px(12 + x, 1 + y, dark, 1 - rand() * 0.08);
            }
        }

        for (let x = 0; x < 10; x++) {
            px(1 + x, 0, dark);
            px(11 + x, 0, dark);
        }

        for (let y = 0; y < 16; y++) {
            px(0, 1 + y, dark);
            px(11, 1 + y, dark);
        }

        this.info = {
            width: 64,
            height: 32,
            format: 'standard',
            scale: 1,
            isDefault: true,
            downscaled: false,
        };
        this.applyFilter();

        return this.info;
    }

    /**
     * Loads a cape in standard 64x32 or compact 22x17 format, including supported multiples.
     * Source resolution is preserved unless it exceeds the GPU texture limit.
     * When called repeatedly, only the latest load is applied.
     */
    async load(source: CapeSource): Promise<CapeInfo> {
        const token = ++this.loadToken;
        const img = await toDrawable(source);
        const owned =
            typeof ImageBitmap !== 'undefined' &&
            img instanceof ImageBitmap &&
            !(source instanceof ImageBitmap);
        try {
            if (token !== this.loadToken) return this.info;

            const { w, h } = sizeOf(img);
            let scale: number;
            let format: CapeInfo['format'];

            if (w >= 64 && w % 64 === 0 && h * 2 === w) {
                scale = w / 64;
                format = 'standard';
            } else if (w >= 22 && w % 22 === 0 && h * 22 === w * 17) {
                scale = w / 22;
                format = 'compact';
            } else {
                throw new Error(
                    `Unsupported cape dimensions: ${w}x${h}. Use 64x32 (or 128x64, 256x128, ...) or compact 22x17 (or 44x34, ...).` +
                        (w === h ? ' Square images are usually skins, not capes.' : ''),
                );
            }

            const maxScale = Math.max(1, Math.floor(this.maxSize / 64));
            const targetScale = Math.min(scale, maxScale);
            const downscaled = targetScale < scale;

            this.resize(64 * targetScale, 32 * targetScale);
            const ctx = this.ctx;
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.imageSmoothingEnabled = downscaled;

            if (format === 'standard') {
                ctx.drawImage(img, 0, 0, w, h, 0, 0, 64 * targetScale, 32 * targetScale);
            } else {
                ctx.drawImage(img, 0, 0, w, h, 0, 0, 22 * targetScale, 17 * targetScale);
            }

            ctx.imageSmoothingEnabled = false;

            this.info = {
                width: w,
                height: h,
                format,
                scale: targetScale,
                isDefault: false,
                downscaled,
            };
            this.applyFilter();

            return this.info;
        } finally {
            if (owned) (img as ImageBitmap).close();
        }
    }

    dispose(): void {
        this.texture.dispose();
    }
}
