import {C} from './bmp2iff-host-scope.mjs';

/*
 * bmp2iff_host.c - Convert a BMP to Amiga BMAP IFF.
 * Copyright (c) 2026 by Ingo Paschke.
 * NetHack may be freely redistributed.  See license for details.
 *
 * IFF BMAP format matches sys/amiga/xpm2iff.c by Gregg Wonderly.
 *
 * Usage: bmp2iff_host -planes N input.bmp output.iff
 *
 * This is a HOST tool -- runs on the build machine.
 */


const TILE_X = 16;
const TILE_Y = 16;

/* --------------------------------------------------------- */
/*  Fixed 16-color AMIV UI palette                          */
/*  Must match amiv_init_map[] in winami.c                   */
/* --------------------------------------------------------- */

export const amiv_pal = [
    {r:0x00,g:0x00,b:0x00}, /*  0 black    */
    {r:0xFF,g:0xFF,b:0xFF}, /*  1 white    */
    {r:0x00,g:0xBB,b:0xFF}, /*  2 cyan     */
    {r:0xFF,g:0x66,b:0x00}, /*  3 orange   */
    {r:0x00,g:0x00,b:0xFF}, /*  4 blue     */
    {r:0x00,g:0x99,b:0x00}, /*  5 green    */
    {r:0x66,g:0x99,b:0xBB}, /*  6 grey     */
    {r:0xFF,g:0x00,b:0x00}, /*  7 red      */
    {r:0x66,g:0xFF,b:0x00}, /*  8 ltgreen  */
    {r:0xFF,g:0xFF,b:0x00}, /*  9 yellow   */
    {r:0xFF,g:0x00,b:0xFF}, /* 10 magenta  */
    {r:0x99,g:0x44,b:0x00}, /* 11 brown    */
    {r:0x44,g:0x66,b:0x66}, /* 12 greyblue */
    {r:0xCC,g:0x44,b:0x00}, /* 13 ltbrown  */
    {r:0xDD,g:0xDD,b:0xBB}, /* 14 ltgrey   */
    {r:0xFF,g:0xBB,b:0x99}, /* 15 peach    */
];

/* --------------------------------------------------------- */
/*  Colour helpers                                           */
/* --------------------------------------------------------- */

export function coldist(a, b)
{
    let dr = a.r - b.r;
    let dg = a.g - b.g;
    let db = a.b - b.b;
    return dr*dr + dg*dg + db*db;
}

export function nearest(c, pal, n)
{
    let best = 0, bestd = 0x7fffffff, i;
    for (i = 0; i < n; i++) {
        let d = coldist(c, pal[i]);
        if (d < bestd) { bestd = d; best = i; }
    }
    return best;
}

/* --------------------------------------------------------- */
/*  IFF output                                               */
/* --------------------------------------------------------- */



export function wr32(v)
{
    v = C.uint(v);
    let b = C.array('u8', 4, [v>>>24, v>>>16, v>>>8, v]);
    C.fwrite(b, 1, 4, C.iff_fp);
}

export function wr_chunk(id, d, len)
{
    len = C.uint(len);
    C.fwrite(id, 1, 4, C.iff_fp);
    C.callLocal(wr32, len);
    C.fwrite(d, 1, len, C.iff_fp);
    if (len & 1) C.fputc(0, C.iff_fp);
}

export function iff_write(nplanes, ncolors, cmap, w, h, planes, ntiles, across, down)
{
    let spos;
    let plsz = C.uint(C.div(w, 8) * h);
    let i;

    C.fwrite("FORM", 1, 4, C.iff_fp);
    spos = C.ftell(C.iff_fp);
    C.callLocal(wr32, 0);
    C.fwrite("BMAP", 1, 4, C.iff_fp);

    /* BMHD */
    {
        let bm = C.array('u8', 20);
        C.memset(bm, 0, 20);
        bm[0] = w >> 8;  bm[1] = w;
        bm[2] = h >> 8;  bm[3] = h;
        bm[8] = C.uchar(nplanes);
        bm[14] = 100; bm[15] = 100;
        wr_chunk("BMHD", bm, 20);
    }

    /* CAMG */
    {
        let c = C.array('u8', 4, [0,0,0x80,0x04]);
        wr_chunk("CAMG", c, 4);
    }

    /* CMAP */
    wr_chunk("CMAP", cmap, C.uint(ncolors) * 3);

    /* PDAT */
    {
        let pd = C.array('u8', 28), p = pd;
        let v = C.array('u32', 7);
        v[0] = nplanes;
        v[1] = plsz;
        v[2] = across;
        v[3] = down;
        v[4] = ntiles;
        v[5] = TILE_X;
        v[6] = TILE_Y;
        for (i = 0; i < 7; i++) {
            p[0] = (v[i]>>>24); p[1] = (v[i]>>>16);
            p[2] = (v[i]>>> 8); p[3] =  v[i];
            p = C.bytes(C.ptrAdd(p, 4));
        }
        wr_chunk("PDAT", pd, 28);
    }

    /* PLNE */
    C.fwrite("PLNE", 1, 4, C.iff_fp);
    C.callLocal(wr32, plsz * nplanes);
    for (i = 0; i < nplanes; i++)
        C.fwrite(planes[i], 1, plsz, C.iff_fp);

    /* fix FORM size */
    {
        let end = C.ftell(C.iff_fp);
        let sz = C.uint(end - spos - 4n);
        C.fseek(C.iff_fp, spos, C.SEEK_SET);
        C.callLocal(wr32, sz);
        C.fseek(C.iff_fp, 0, C.SEEK_END);
    }
}

/* --------------------------------------------------------- */
/*  Pixel-to-bitplane conversion                             */
/* --------------------------------------------------------- */

export function to_planes(pix, w, h, np, pl)
{
    let rb = C.div(w, 8);
    let x, y, p;

    for (p = 0; p < np; p++)
        C.memset(pl[p], 0, rb * h);

    for (y = 0; y < h; y++)
        for (x = 0; x < w; x++) {
            let v = pix[y * w + x];
            let off = y * rb + C.div(x, 8);
            let bit = 7 - (x & 7);
            for (p = 0; p < np; p++)
                if (v & (1 << p))
                    pl[p][off] |= (1 << bit);
        }
}

/* --------------------------------------------------------- */
/*  Palette building                                         */
/* --------------------------------------------------------- */

/*
 * Build an output palette of 'maxcol' entries:
 *   - slots 0-15:  fixed AMIV UI colors
 *   - slots 16+:   tile colors from the BMP
 *
 * Returns remap[0..nsrc-1] mapping BMP palette index
 * to output palette index.
 */
export function build_palette(src, nsrc, pix, npix, maxcol, out, remap)
{
    let freq = C.array('i32', 256, [0], true);
    let order = C.array('i32', 256);
    let i, j, nfree, nuniq;

    /* count pixel frequency per BMP palette entry */
    for (i = 0; i < npix; i++)
        freq[pix[i]]++;

    /* sort BMP colors by frequency (descending) */
    for (i = 0; i < nsrc; i++) order[i] = i;
    for (i = 1; i < nsrc; i++) {
        let k = order[i], kf = freq[k];
        j = i - 1;
        while (j >= 0 && freq[order[j]] < kf) {
            order[j+1] = order[j];
            j--;
        }
        order[j+1] = k;
    }

    /* count unique colors actually used */
    nuniq = 0;
    for (i = 0; i < nsrc; i++)
        if (freq[i] > 0) nuniq++;

    /* first 16 slots are AMIV UI */
    for (i = 0; i < 16 && i < maxcol; i++)
        out[i] = amiv_pal[i];
    for (i = 16; i < maxcol; i++)
        C.memset(out[i], 0, C.layout.RGB_SIZE);

    nfree = maxcol - 16;
    if (nfree < 0) nfree = 0;

    /*
     * Case 1: enough free slots for all unique colors.
     * Assign each unique BMP color its own pen, exact
     * AMIV matches share the UI pen.
     */
    if (nuniq <= nfree) {
        let next = 16;
        for (i = 0; i < nsrc; i++) {
            if (freq[i] == 0) {
                remap[i] = 0;
                continue;
            }
            /* exact match to an AMIV pen? */
            let best = nearest(src[i], amiv_pal, 16);
            if (coldist(src[i], amiv_pal[best]) == 0) {
                remap[i] = best;
            } else {
                remap[i] = next;
                out[next] = src[i];
                next++;
            }
        }
        return;
    }

    /*
     * Case 2: more unique colors than free slots.
     * - Direct/near AMIV matches use UI pens.
     * - Remaining slots filled by most-frequent colors.
     * - Leftovers mapped to nearest in final palette.
     */
    {
        let next = 16;
        let assigned = C.array('i32', 256);
        C.memset(assigned, 0, assigned.byteLength);

        /* pass 1: exact/near AMIV matches */
        for (i = 0; i < nsrc; i++) {
            if (freq[i] == 0) {
                remap[i] = 0;
                assigned[i] = 1;
                continue;
            }
            let best = nearest(src[i], amiv_pal, 16);
            let d = coldist(src[i], amiv_pal[best]);
            if (d < 200) {  /* near match threshold */
                remap[i] = best;
                assigned[i] = 1;
            }
        }

        /* pass 2: fill free slots with most-frequent
         * unassigned colors (order[] is freq-sorted) */
        for (i = 0; i < nsrc && next < maxcol; i++) {
            let idx = order[i];
            if (assigned[idx] || freq[idx] == 0)
                continue;
            remap[idx] = next;
            out[next] = src[idx];
            assigned[idx] = 1;
            next++;
        }

        /* pass 3: map remaining to nearest in palette */
        for (i = 0; i < nsrc; i++) {
            if (!assigned[i])
                remap[i] = nearest(src[i], out, next);
        }
    }
}

/* --------------------------------------------------------- */
/*  Main                                                     */
/* --------------------------------------------------------- */

export function main(argc, argv)
{
    argc = C.int(argc);
    argv = C.argv(argv);
    let bmpfp;
    let fhdr = C.record('BMPFILEHEADER');
    let ihdr = C.record('BMPINFOHEADER');
    let palette = C.array('RGB', 256);
    let ncolors, img_w, img_h, rowstride;
    let bmpdata, pixels;
    let ntiles, across, down;
    let nplanes, maxcol;
    let i, y;
    let outpal = C.array('RGB', 256);
    let remap = C.array('i32', 256);
    let remapped;
    let plane_data = C.array('ptr', 8);
    let cmap_rgb = C.array('u8', 256 * 3);
    let planesize;

    /* parse args */
    if (argc != 5
        || C.strcmp(argv[1], "-planes") != 0) {
        C.fprintf(C.stderr,
                "Usage: %s -planes N input.bmp output.iff\n",
                argv[0]);
        return 1;
    }
    nplanes = C.atoi(argv[2]);
    if (nplanes < 1 || nplanes > 8) {
        C.fprintf(C.stderr, "planes must be 1-8\n");
        return 1;
    }
    maxcol = 1 << nplanes;

    /* read BMP */
    bmpfp = C.fopen(argv[3], "rb");
    if (!bmpfp) { C.perror(argv[3]); return 1; }

    if (C.fread(fhdr, C.layout.BMPFILEHEADER_SIZE, 1, bmpfp) != 1
        || C.fread(ihdr, C.layout.BMPINFOHEADER_SIZE, 1, bmpfp) != 1) {
        C.fprintf(C.stderr, "Failed to read BMP header\n");
        return 1;
    }
    if (fhdr.bfType != 0x4D42) {
        C.fprintf(C.stderr, "Not a BMP file\n");
        return 1;
    }
    if (ihdr.biBitCount != 8) {
        C.fprintf(C.stderr,
                "Expected 8-bit BMP, got %d-bit\n",
                ihdr.biBitCount);
        return 1;
    }

    img_w = ihdr.biWidth;
    img_h = C.abs(ihdr.biHeight);
    ncolors = C.int(ihdr.biClrUsed ? ihdr.biClrUsed : 256);
    if (ncolors > 256) ncolors = 256;

    /* read palette (BMP stores BGRx) */
    {
        let raw = C.rows(256, 4);
        if (C.fread(raw, 4, ncolors, bmpfp)
            != C.size_t(ncolors)) {
            C.fprintf(C.stderr, "Failed to read palette\n");
            return 1;
        }
        for (i = 0; i < ncolors; i++) {
            palette[i].r = raw[i][2];
            palette[i].g = raw[i][1];
            palette[i].b = raw[i][0];
        }
    }

    /* read pixel data */
    rowstride = (img_w + 3) & ~3;
    bmpdata = C.malloc(rowstride * img_h);
    C.fseek(bmpfp, fhdr.bfOffBits, C.SEEK_SET);
    if (C.fread(bmpdata, 1, rowstride * img_h, bmpfp)
        != C.size_t(rowstride * img_h)) {
        C.fprintf(C.stderr, "Failed to read pixel data\n");
        return 1;
    }
    C.fclose(bmpfp);

    /* flip bottom-up to top-down */
    pixels = C.malloc(img_w * img_h);
    if (ihdr.biHeight > 0) {
        for (y = 0; y < img_h; y++)
            C.memcpy(pixels + y * img_w,
                   bmpdata + (img_h-1-y) * rowstride,
                   img_w);
    } else {
        for (y = 0; y < img_h; y++)
            C.memcpy(pixels + y * img_w,
                   bmpdata + y * rowstride, img_w);
    }
    C.free(bmpdata);

    across = C.div(img_w, TILE_X);
    down   = C.div(img_h, TILE_Y);
    ntiles = across * down;

    /* build palette and remap pixels */
    C.callLocal(build_palette, palette, ncolors,
                  pixels, img_w * img_h,
                  maxcol, outpal, remap);

    remapped = C.malloc(img_w * img_h);
    for (i = 0; i < img_w * img_h; i++)
        remapped[i] = C.uchar(remap[pixels[i]]);

    /* convert to bitplanes */
    planesize = C.div(img_w, 8) * img_h;
    for (i = 0; i < nplanes; i++)
        plane_data[i] = C.calloc(1, planesize);

    to_planes(remapped, img_w, img_h,
              nplanes, plane_data);

    /* build CMAP */
    for (i = 0; i < maxcol; i++) {
        cmap_rgb[i*3+0] = outpal[i].r;
        cmap_rgb[i*3+1] = outpal[i].g;
        cmap_rgb[i*3+2] = outpal[i].b;
    }

    /* write IFF */
    C.iff_fp = C.fopen(argv[4], "wb");
    if (!C.iff_fp) { C.perror(argv[4]); return 1; }

    C.callLocal(iff_write, nplanes, maxcol, cmap_rgb,
              img_w, img_h, plane_data,
              ntiles, across, down);
    C.fclose(C.iff_fp);

    C.printf("%s: %dx%d, %d colors (%d planes), " + "%d tiles\n",
           argv[4], img_w, img_h,
           maxcol, nplanes, ntiles);

    for (i = 0; i < nplanes; i++) C.free(plane_data[i]);
    C.free(remapped);
    C.free(pixels);
    return 0;
}
