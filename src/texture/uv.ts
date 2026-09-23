import { BufferAttribute, BufferGeometry, MathUtils } from 'three';

/** [u0, v0, W, H, D] in pixels on the base grid (64x64 skin / 64x32 cape). */
export type Region = [number, number, number, number, number];

export interface RemapOptions {
    /** Texture width on the base grid. Default: 64. */
    texW?: number;

    /** Texture height on the base grid. Default: 64 for skin, 32 for cape. */
    texH?: number;

    /**
     * Map the box as if it were rotated 180° around the Y axis. The texture's front side is placed on the -z surface.
     * Used for capes, whose outer side faces the back of the character.
     */
    yaw180?: boolean;
}

/**
 * Map UVs on a BoxGeometry centered at the origin to the Minecraft texture layout.
 * Each vertex is mapped using its normal, so this works with geometry that has multiple segments.
 * The character faces +z. The character's right side is -x, and the left side is +x.
 */
export function remapUV(
    geo: BufferGeometry,
    w: number,
    h: number,
    d: number,
    region: Region,
    opts: RemapOptions = {},
) {
    const [u0, v0, W, H, D] = region;
    const texW = opts.texW ?? 64;
    const texH = opts.texH ?? 64;

    const pos = geo.attributes.position as BufferAttribute;
    const nor = geo.attributes.normal as BufferAttribute;
    const uv = geo.attributes.uv as BufferAttribute;

    const E = 0.02; // Small inset to prevent texture bleeding into neighboring pixels.
    const clamp = MathUtils.clamp;

    for (let i = 0; i < pos.count; i++) {
        let lx = pos.getX(i) / w + 0.5;
        const ly = pos.getY(i) / h + 0.5;
        let lz = pos.getZ(i) / d + 0.5;

        let nx = nor.getX(i);
        const ny = nor.getY(i);
        let nz = nor.getZ(i);

        if (opts.yaw180) {
            lx = 1 - lx;
            lz = 1 - lz;
            nx = -nx;
            nz = -nz;
        }

        let rx: number, ry: number, rw: number, rh: number, u: number, v: number;

        if (nx > 0.5) {
            rx = u0 + D + W;
            ry = v0 + D;
            rw = D;
            rh = H;
            u = 1 - lz;
            v = 1 - ly;
        } // Character's left side
        else if (nx < -0.5) {
            rx = u0;
            ry = v0 + D;
            rw = D;
            rh = H;
            u = lz;
            v = 1 - ly;
        } // Character's right side
        else if (ny > 0.5) {
            rx = u0 + D;
            ry = v0;
            rw = W;
            rh = D;
            u = lx;
            v = lz;
        } // Top
        else if (ny < -0.5) {
            rx = u0 + D + W;
            ry = v0;
            rw = W;
            rh = D;
            u = lx;
            v = 1 - lz;
        } // Bottom
        else if (nz > 0.5) {
            rx = u0 + D;
            ry = v0 + D;
            rw = W;
            rh = H;
            u = lx;
            v = 1 - ly;
        } // Front
        else {
            rx = u0 + 2 * D + W;
            ry = v0 + D;
            rw = W;
            rh = H;
            u = 1 - lx;
            v = 1 - ly;
        } // Back
        u = clamp(u, 0, 1);
        v = clamp(v, 0, 1);

        const px = rx + (E + u * (1 - 2 * E)) * rw;
        const py = ry + (E + v * (1 - 2 * E)) * rh;

        uv.setXY(i, px / texW, 1 - py / texH);
    }

    uv.needsUpdate = true;
}
