import {
    CanvasTexture,
    LinearFilter,
    LinearMipmapLinearFilter,
    NearestFilter,
    SRGBColorSpace,
} from 'three';

/** Accepted skin sources. Remote URLs must allow CORS requests. */
export type SkinSource =
    string | Blob | File | HTMLImageElement | HTMLCanvasElement | ImageBitmap;

/**
 * Skin texture filtering:
 * - 'auto': 64px stays pixelated; HD uses mipmaps when reduced to avoid flickering.
 * - 'nearest': always pixelated, without mipmaps.
 * - 'smooth': linear filtering with mipmaps for a smoother look.
 */
export type SkinFilter = 'auto' | 'nearest' | 'smooth';

export interface SkinInfo {
    /** Original image size in pixels. */
    width: number;

    height: number;

    /** True if the skin uses the legacy 64x32 format or a multiple of it. Left limbs are copied from the right limbs. */
    legacy: boolean;

    /** True if slim (3px / Alex model) arms are detected. */
    slim: boolean;

    isDefault: boolean;

    /** Texture resolution scale: 1 = 64px, 2 = 128px, 4 = 256px, and so on. */
    scale: number;

    /** True if the skin was reduced because it exceeded the GPU texture size limit. */
    downscaled: boolean;
}

export interface SkinTextureOptions {
    /** Maximum texture size in pixels. Larger skins are reduced. Default: 4096. */
    maxSize?: number;

    filter?: SkinFilter;
}

export type Drawable = HTMLImageElement | HTMLCanvasElement | ImageBitmap;
type RGB = readonly [number, number, number];
type SkinRect = readonly [number, number, number, number];
type LimbPosition = readonly [number, number];

/** @internal Also used by cape.ts. */
export async function toDrawable(src: SkinSource): Promise<Drawable> {
    if (typeof src === 'string') {
        return new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () =>
                reject(new Error(`Failed to load skin from: ${src.slice(0, 80)}`));
            img.src = src;
        });
    }
    if (typeof Blob !== 'undefined' && src instanceof Blob) {
        if (typeof createImageBitmap === 'function') {
            try {
                return await createImageBitmap(src, {
                    premultiplyAlpha: 'none',
                    colorSpaceConversion: 'none',
                });
            } catch {
                return await createImageBitmap(src);
            }
        }
        const url = URL.createObjectURL(src);
        try {
            return await toDrawable(url);
        } finally {
            URL.revokeObjectURL(url);
        }
    }
    if (
        typeof HTMLImageElement !== 'undefined' &&
        src instanceof HTMLImageElement &&
        !src.complete
    ) {
        await src.decode();
    }
    return src as Drawable;
}

/** @internal Also used by cape.ts. */
export function sizeOf(d: Drawable): { w: number; h: number } {
    if (typeof HTMLImageElement !== 'undefined' && d instanceof HTMLImageElement) {
        return { w: d.naturalWidth, h: d.naturalHeight };
    }
    return { w: d.width, h: d.height };
}

function mulberry32(seed: number): () => number {
    return (): number => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * A canvas and THREE.CanvasTexture shared by all body parts.
 *
 * The texture matches the loaded skin resolution (64, 128, 256, 512, ...): it is not reduced,
 * and the image is copied to the canvas at a 1:1 scale. The layout is the same at every resolution
 * (all coordinates are multiplied by `scale`). Supports 1.8+ skins (64x64, outer layer, and slim arms)
 * and the legacy 64x32 format.
 */
export class SkinTexture {
    readonly canvas: HTMLCanvasElement;
    readonly texture: CanvasTexture;
    info: SkinInfo = {
        width: 64,
        height: 64,
        legacy: false,
        slim: false,
        isDefault: true,
        scale: 1,
        downscaled: false,
    };

    private ctx: CanvasRenderingContext2D;
    private maxSize: number;
    private filter: SkinFilter;
    private loadToken = 0;

    constructor(opts: SkinTextureOptions = {}) {
        this.maxSize = Math.max(64, opts.maxSize ?? 4096);
        this.filter = opts.filter ?? 'auto';

        this.canvas = document.createElement('canvas');
        this.canvas.width = this.canvas.height = 64;
        const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Canvas 2D is not available.');

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

    /** Apply filtering for the current resolution, then upload the texture to the GPU again. */
    private applyFilter(): void {
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

    private resize(size: number): void {
        if (this.canvas.width !== size || this.canvas.height !== size) {
            this.canvas.width = this.canvas.height = size;
        }
        this.ctx.imageSmoothingEnabled = false;
    }

    /** Draw the default skin procedurally in a simple Steve style at 64x64. */
    paintDefault(): SkinInfo {
        this.loadToken++;

        this.resize(64);
        const ctx = this.ctx;
        const rand = mulberry32(1337);
        ctx.clearRect(0, 0, 64, 64);
        const skin: RGB = [224, 172, 132];
        const hair: RGB = [78, 50, 30];
        const teal: RGB = [37, 168, 160];
        const pants: RGB = [58, 74, 160];
        const shoe: RGB = [72, 72, 80];
        const rgb = (color: RGB, variation: number): string =>
            `rgb(${(color[0] * variation) | 0},${(color[1] * variation) | 0},${(color[2] * variation) | 0})`;
        const fillN = (x: number, y: number, w: number, h: number, color: RGB): void => {
            for (let j = 0; j < h; j++)
                for (let i = 0; i < w; i++) {
                    ctx.fillStyle = rgb(color, 1 - rand() * 0.12);
                    ctx.fillRect(x + i, y + j, 1, 1);
                }
        };
        const boxAll = (
            u0: number,
            v0: number,
            W: number,
            H: number,
            D: number,
            color: RGB,
        ): void => {
            fillN(u0 + D, v0, W * 2, D, color);
            fillN(u0, v0 + D, 2 * D + 2 * W, H, color);
        };
        // Head
        boxAll(0, 0, 8, 8, 8, skin);
        fillN(8, 0, 8, 8, hair);
        fillN(0, 8, 8, 4, hair);
        fillN(16, 8, 8, 4, hair);
        fillN(24, 8, 8, 8, hair);
        fillN(8, 8, 8, 2, hair);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(9, 11, 2, 1);
        ctx.fillRect(13, 11, 2, 1);
        ctx.fillStyle = '#3b4fd0';
        ctx.fillRect(10, 11, 1, 1);
        ctx.fillRect(13, 11, 1, 1);
        ctx.fillStyle = '#9a5a4a';
        ctx.fillRect(11, 13, 2, 1);
        // Body
        boxAll(16, 16, 8, 12, 4, teal);
        // Right arm (40,16) and left arm (32,48)
        const armPositions: readonly LimbPosition[] = [
            [40, 16],
            [32, 48],
        ];
        for (const [u, v] of armPositions) {
            boxAll(u, v, 4, 12, 4, skin);
            fillN(u, v + 4, 16, 4, teal);
            fillN(u + 4, v, 4, 4, teal);
        }
        // Right leg (0,16) and left leg (16,48)
        const legPositions: readonly LimbPosition[] = [
            [0, 16],
            [16, 48],
        ];
        for (const [u, v] of legPositions) {
            boxAll(u, v, 4, 12, 4, pants);
            fillN(u, v + 4 + 12 - 3, 16, 3, shoe);
            fillN(u + 8, v, 4, 4, shoe);
        }
        this.info = {
            width: 64,
            height: 64,
            legacy: false,
            slim: false,
            isDefault: true,
            scale: 1,
            downscaled: false,
        };
        this.applyFilter();
        return this.info;
    }

    /**
     * Load a skin from a URL, File, Blob, image, or canvas.
     * The size must be 64x64 (1.8+ format), 64x32 (legacy format), or a multiple of either
     * (128x128, 256x256, 512x512, ... / 128x64, 256x128, ...). The original resolution is preserved.
     * If called multiple times, only the most recent call is applied.
     */
    async load(source: SkinSource): Promise<SkinInfo> {
        const token = ++this.loadToken;
        const img = await toDrawable(source);
        const owned =
            typeof ImageBitmap !== 'undefined' &&
            img instanceof ImageBitmap &&
            !(source instanceof ImageBitmap);
        try {
            if (token !== this.loadToken) return this.info;

            const { w, h } = sizeOf(img);
            const legacy = w === h * 2;
            if (w < 64 || !(w === h || legacy) || w % 64 !== 0) {
                throw new Error(
                    `Skin size ${w}x${h} is not supported. Use 64x64 or 64x32, or a multiple of 64 (for example, 128x128, 256x256, or 512x512).`,
                );
            }

            // Keep the original resolution unless it exceeds the GPU texture size limit.
            let size = w;
            let downscaled = false;
            if (size > this.maxSize) {
                size = Math.max(64, Math.floor(this.maxSize / 64) * 64);
                downscaled = true;
            }
            const s = size / 64;

            this.resize(size);
            const ctx = this.ctx;
            ctx.clearRect(0, 0, size, size);
            ctx.imageSmoothingEnabled = downscaled;
            ctx.drawImage(img, 0, 0, w, h, 0, 0, size, legacy ? size / 2 : size);
            ctx.imageSmoothingEnabled = false;
            if (legacy) this.mirrorLegacy(s);

            this.info = {
                width: w,
                height: h,
                legacy,
                isDefault: false,
                scale: s,
                downscaled,
                slim: legacy ? false : this.detectSlim(s),
            };
            this.applyFilter();
            return this.info;
        } finally {
            if (owned) (img as ImageBitmap).close();
        }
    }

    /** For legacy skins, mirror the right arms and legs to create the left limbs. Coordinates are scaled by s. */
    private mirrorLegacy(s: number): void {
        const ctx = this.ctx,
            src = this.canvas;
        const flip = (
            sx: number,
            sy: number,
            w: number,
            h: number,
            dx: number,
            dy: number,
        ) => {
            ctx.save();
            ctx.translate(dx + w, dy);
            ctx.scale(-1, 1);
            ctx.drawImage(src, sx, sy, w, h, 0, 0, w, h);
            ctx.restore();
        };
        const limb = (u0: number, v0: number, tu: number, tv: number) => {
            const W = 4 * s,
                H = 12 * s,
                D = 4 * s;
            u0 *= s;
            v0 *= s;
            tu *= s;
            tv *= s;
            flip(u0 + D, v0, W, D, tu + D, tv);
            flip(u0 + D + W, v0, W, D, tu + D + W, tv);
            flip(u0 + D, v0 + D, W, H, tu + D, tv + D);
            flip(u0 + 2 * D + W, v0 + D, W, H, tu + 2 * D + W, tv + D);
            flip(u0, v0 + D, D, H, tu + D + W, tv + D);
            flip(u0 + D + W, v0 + D, D, H, tu, tv + D);
        };
        limb(0, 16, 16, 48);
        limb(40, 16, 32, 48);
    }

    /** Slim arms have a fully transparent fourth column in the arm texture areas. Coordinates are scaled by s for HD skins. */
    private detectSlim(s: number): boolean {
        const rects: readonly SkinRect[] = [
            [50, 16, 2, 4],
            [54, 20, 2, 12],
            [42, 48, 2, 4],
            [46, 52, 2, 12],
        ];
        return rects.every(([x, y, w, h]) => {
            const d = this.ctx.getImageData(x * s, y * s, w * s, h * s).data;
            for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) return false;
            return true;
        });
    }

    dispose(): void {
        this.texture.dispose();
    }
}
