/* xpm2iff_host.c - host-side .xpm -> Amiga BMAP IFF converter.
 * Copyright (c) 2026 by Ingo Paschke.
 * NetHack may be freely redistributed.  See license for details.
 *
 * Adapted from sys/amiga/xpm2iff.c, Copyright (c) 1995 by Gregg Wonderly.
 * Rewritten for host-side cross-compilation using POSIX file I/O with
 * explicit big-endian output instead of AmigaOS IFFParse library calls.
 *
 * Input:  an XPM2 file, 1 char per pixel.
 * Output: a BMAP IFF file readable by sys/amiga/winchar.c (tomb.iff).
 */
export function createXpm2iff(S) {
/* ------------------------------------------------------------------
 * XPM screen descriptor and color translation table
 * ------------------------------------------------------------------ */
const XpmScreen = S.XpmScreen;
/* Translation table: indexed by the single XPM character code.
 * slot  = output palette index (0-based)
 * flag  = 1 if this entry is valid
 * r,g,b = RGB components (0-255) */
const ttable = S.ttable;
/* ------------------------------------------------------------------
 * XPM parsing
 * Adapted directly from sys/amiga/xpm2iff.c (already POSIX).
 * ------------------------------------------------------------------ */
const G = S.globals;
const XBUFSZ = 2048;
const xbuf = S.xbuf;
/* Read the next quoted line from the XPM file.
 * Returns a pointer to the content between the first pair of double-quotes,
 * or NULL on EOF.  Trailing ",  and whitespace are stripped. */
function xpmgetline() {
    let bp;
    do {
        if (S.fgets(xbuf, XBUFSZ, G.xpmfh) === 0)
            return 0;
    } while (S.u8(xbuf) !== 34);
    /* strip trailing <",> and whitespace */
    for (bp = xbuf; S.u8(bp); bp++)
        ;
    bp--;
    while (S.isspace(S.u8(bp)))
        bp--;
    if (S.u8(bp) === 44)
        bp--;
    if (S.u8(bp) === 34)
        bp--;
    bp++;
    S.put8(bp, 0);
    return xbuf + 1;
}
/* Open an XPM file and parse its header + color table.
 * Populates XpmScreen and ttable[].
 * Returns 1 on success, 0 on failure. */
function fopen_xpm_file(fn) {
    const temp = S.local(4);
    let xb;
    G.xpmfh = S.fopen(fn, S.lit('r'));
    if (!G.xpmfh)
        return 0;
    /* read dimensions header: "W H Colors 1" */
    xb = xpmgetline();
    if (!xb)
        return 0;
    if (S.scan_dimensions(xb, S.lit('%d %d %d %d'),
               S.screenAddress, S.screenAddress + 4,
               S.screenAddress + 8, temp) !== 4)
        return 0;
    if (S.i32(temp) !== 1) {
        S.fprintf_p(S.stderr(), S.lit('xpm2iff_host: only 1 char/pixel XPM files supported\n'), 0);
        return 0;
    }
    /* read color map: "%c c #rrggbb" */
    {
        let ccount = 0;
        while (ccount < XpmScreen.Colors) {
            const _localMark = S.stackSave();
            const idx = S.local(1);
            const r = S.local(4), g = S.local(4), b = S.local(4);
            xb = xpmgetline();
            if (!xb)
                return 0;
            if (S.scan_color(xb, S.lit('%c c #%2x%2x%2x'), idx, r, g, b) !== 4) {
                S.fprintf_p(S.stderr(), S.lit('xpm2iff_host: bad color entry: %s\n'), xb);
                return 0;
            }
            ttable[S.u8(idx)].flag = 1;
            ttable[S.u8(idx)].r    = S.i32(r) & 255;
            ttable[S.u8(idx)].g    = S.i32(g) & 255;
            ttable[S.u8(idx)].b    = S.i32(b) & 255;
            ttable[S.u8(idx)].slot = ccount;
            ccount++;
            S.stackRestore(_localMark);
        }
    }
    return 1;
}
/* ------------------------------------------------------------------
 * Bitplane packing
 * ------------------------------------------------------------------ */
function conv_image(nplanes) {
    let row, col, planeno;
    for (row = 0; row < XpmScreen.Height; row++) {
        let xb = xpmgetline();
        let plane_offset;
        if (!xb)
            return;
        plane_offset = Math.imul(row, XpmScreen.BytesPerRow);
        for (col = 0; col < XpmScreen.Width; col++) {
            let color = S.u8(xb + col);
            let slot;
            if (!ttable[color].flag) {
                S.fprintf_ii(S.stderr(), S.lit('xpm2iff_host: bad image data at row %d col %d\n'), row, col);
                continue;
            }
            slot = ttable[color].slot;
            for (planeno = 0; planeno < nplanes; planeno++) {
                do {
                    if (slot & (1 << planeno)) {
                        const at = S.pointer(G.planes + 8 * planeno) + plane_offset + Math.trunc(col / 8);
                        S.put8(at, S.u8(at) | (1 << (7 - (col & 7))));
                    }
                } while (0);
            }
        }
    }
}
/* ------------------------------------------------------------------
 * Big-endian IFF output helpers
 * ------------------------------------------------------------------ */
function wr32(v) {
    v >>>= 0;
    S.fputc((v >>> 24) & 0xff, G.iff_out);
    S.fputc((v >>> 16) & 0xff, G.iff_out);
    S.fputc((v >>>  8) & 0xff, G.iff_out);
    S.fputc( v         & 0xff, G.iff_out);
}
function write_chunk(id, data, size) {
    size >>>= 0;
    S.fwrite(id, 1, 4, G.iff_out);
    wr32(size);
    S.fwrite(data, 1, size, G.iff_out);
    if (size & 1)
        S.fputc(0, G.iff_out);
}
/* ------------------------------------------------------------------
 * main
 * ------------------------------------------------------------------ */
function main(argc, argv) {
    let i, nplanes, colors;
    let pbytes, plne_size, form_size;
    if (argc !== 3) {
        S.fprintf_p(S.stderr(), S.lit('Usage: %s source.xpm destination.iff\n'), S.pointer(argv));
        return 1;
    }
    if (!fopen_xpm_file(S.pointer(argv + 8))) {
        S.fprintf_p(S.stderr(), S.lit('%s: failed to open or parse XPM file\n'), S.pointer(argv + 8));
        return 1;
    }
    /* nplanes = ceil(log2(Colors)) */
    nplanes = 0;
    i = XpmScreen.Colors - 1;
    while (i > 0) { nplanes++; i >>= 1; }
    colors = 1 << nplanes;
    XpmScreen.BytesPerRow = Math.imul(Math.trunc((XpmScreen.Width + 15) / 16), 2);
    pbytes = Math.imul(XpmScreen.BytesPerRow >>> 0, XpmScreen.Height >>> 0) >>> 0;
    /* Allocate zero-initialised bitplane buffers */
    G.planes = S.malloc(BigInt.asUintN(64, BigInt(nplanes) * 8n));
    if (!G.planes) { S.perror(S.lit('malloc')); return 1; }
    for (i = 0; i < nplanes; ++i) {
        S.putPointer(G.planes + 8 * i, S.calloc(1, pbytes));
        if (!S.pointer(G.planes + 8 * i)) { S.perror(S.lit('calloc')); return 1; }
    }
    /* Pack pixel data into bitplanes */
    conv_image(nplanes);
    S.fclose(G.xpmfh);
    /* Open output IFF file */
    G.iff_out = S.fopen(S.pointer(argv + 16), S.lit('wb'));
    if (!G.iff_out) { S.perror(S.pointer(argv + 16)); return 1; }
    /* Pre-compute FORM size:
     *   4  (BMAP type tag)
     *   8 + 20  (BMHD)
     *   8 +  4  (CAMG)
     *   8 + colors*3  (CMAP; colors is a power of 2, so colors*3 is even)
     *   8 + 28  (PDAT: 7 x uint32_t)
     *   8 + nplanes*pbytes  (PLNE; pbytes is always even)
     */
    plne_size = Math.imul(nplanes >>> 0, pbytes) >>> 0;
    form_size = (4
              + (8 + 20)
              + (8 +  4)
              + (8 + Math.imul(colors >>> 0, 3))
              + (8 + 28)
              + (8 + plne_size)) >>> 0;
    /* FORM header */
    S.fwrite(S.lit('FORM'), 1, 4, G.iff_out);
    wr32(form_size);
    S.fwrite(S.lit('BMAP'), 1, 4, G.iff_out);
    /* BMHD chunk */
    {
        const bmhd = S.local(20);
        let p = bmhd;
        let w = XpmScreen.Width & 65535;
        let h = XpmScreen.Height & 65535;
        S.put8(p, w >> 8); S.put8(p + 1, w & 0xff); p += 2; /* w */
        S.put8(p, h >> 8); S.put8(p + 1, h & 0xff); p += 2; /* h */
        S.memset(p, 0, 4); p += 4; /* x=0, y=0 */
        S.put8(p++, nplanes); /* nPlanes */
        S.put8(p++, 0); /* masking: none */
        S.put8(p++, 0); /* compression: none */
        S.put8(p++, 0); /* reserved1 */
        S.put8(p, 0); S.put8(p + 1, 0); p += 2; /* transparentColor */
        S.put8(p++, 100); /* xAspect */
        S.put8(p++, 100); /* yAspect */
        S.put8(p, 0); S.put8(p + 1, 0); p += 2; /* pageWidth (not used) */
        S.put8(p, 0); S.put8(p + 1, 0); p += 2; /* pageHeight (not used) */
        write_chunk(S.lit('BMHD'), bmhd, 20);
    }
    /* CAMG chunk: HIRES | LACE = 0x00008004 */
    {
        const camg = S.local(4);
        S.put8(camg, 0x00); S.put8(camg + 1, 0x00); S.put8(camg + 2, 0x80); S.put8(camg + 3, 0x04);
        write_chunk(S.lit('CAMG'), camg, 4);
    }
    /* CMAP chunk: built from ttable (no color reordering for XPM images) */
    {
        let cmap = S.calloc(colors, 3);
        if (!cmap) { S.perror(S.lit('calloc')); return 1; }
        for (i = 0; i < 256; i++) {
            if (ttable[i].flag) {
                let s = ttable[i].slot;
                S.put8(cmap + s * 3 + 0, ttable[i].r);
                S.put8(cmap + s * 3 + 1, ttable[i].g);
                S.put8(cmap + s * 3 + 2, ttable[i].b);
            }
        }
        write_chunk(S.lit('CMAP'), cmap, Math.imul(colors >>> 0, 3) >>> 0);
        S.free(cmap);
    }
    /* PDAT chunk: 7 x uint32_t big-endian
     * nplanes, pbytes, across=0, down=0, npics=1, xsize=Width, ysize=Height */
    {
        const vals = S.local(28);
        const pdat = S.local(28);
        let p = pdat;
        S.put32(vals + 0, nplanes >>> 0);
        S.put32(vals + 4, pbytes);
        S.put32(vals + 8, 0); /* across: not a tile sheet */
        S.put32(vals + 12, 0); /* down */
        S.put32(vals + 16, 1); /* npics */
        S.put32(vals + 20, XpmScreen.Width >>> 0);
        S.put32(vals + 24, XpmScreen.Height >>> 0);
        for (i = 0; i < 7; i++) {
            S.put8(p, (S.u32(vals + i * 4) >>> 24) & 0xff);
            S.put8(p + 1, (S.u32(vals + i * 4) >>> 16) & 0xff);
            S.put8(p + 2, (S.u32(vals + i * 4) >>> 8) & 0xff);
            S.put8(p + 3, S.u32(vals + i * 4) & 0xff);
            p += 4;
        }
        write_chunk(S.lit('PDAT'), pdat, 28);
    }
    /* PLNE chunk: concatenated bitplane data */
    S.fwrite(S.lit('PLNE'), 1, 4, G.iff_out);
    wr32(plne_size);
    for (i = 0; i < nplanes; ++i)
        S.fwrite(S.pointer(G.planes + i * 8), 1, pbytes, G.iff_out);
    if (plne_size & 1)
        S.fputc(0, G.iff_out);
    S.fclose(G.iff_out);
    for (i = 0; i < nplanes; ++i) S.free(S.pointer(G.planes + i * 8));
    S.free(G.planes);
    S.printf5(S.lit('tomb.iff: %dx%d, %d colors (%d planes), %u bytes/plane\n'),
           XpmScreen.Width, XpmScreen.Height, colors, nplanes,
           pbytes >>> 0);
    return 0;
}
return { xpmgetline, fopen_xpm_file, conv_image, wr32, write_chunk, main };
}
