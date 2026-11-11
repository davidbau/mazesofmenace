/* NetHack 5.0	tiletext.c	$NHDT-Date: 1596498342 2020/08/03 23:45:42 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.17 $ */
/*      Copyright (c) 2016 by Pasi Kallinen                       */
/* NetHack may be freely redistributed.  See license for details. */
import { C } from './scope.mjs';

export const text_sets = [ 'monsters.txt', 'objects.txt', 'other.txt' ];
export const graymappings = [
    /* .  A  B   C   D   E   F   G   H   I   J   K   L   M   N   O   P */
    0, 1, 17, 18, 19, 20, 27, 22, 23, 24, 25, 26, 21, 15, 13, 14, 14,
    /* Q  R   S   T   U   V   W   X   Y   Z   0 */
    1, 17, 18, 19, 20, 27, 22, 23, 24, 25, 20
];
const MONSTER_SET = 0, OBJECT_SET = 1, OTHER_SET = 2;

export function set_grayscale(gs)
{
    C.grayscale = gs;
}

/* read next line; repeat until it's a non-comment; populates 'inbuf[]';
   the buffer might already have data (first line after colormap)  */
export function get_next_line(txtfile, force)
{
    let ch;

    for (;;) {
        if (force || !C.inbuf[0]) {
            /* skip leading whitespace */
            do {
                ch = C.fgetc(txtfile);
            } while (ch === ' '.charCodeAt(0));
            C.ungetc(ch, txtfile);
            /* get rest of line */
            if (!C.fgets(C.inbuf, C.BUFSZ, txtfile))
                break;
            force = 1;
            /* ignore blank lines;
               the old fscanf() processing did that, possibly by accident */
            if (!C.inbuf[0] || (C.inbuf[0] === '\n'.charCodeAt(0) && !C.inbuf[1]))
                continue;
        }
        if (C.inbuf[0] !== '#'.charCodeAt(0) || !C.strncmp(C.inbuf, '# tile ', 7))
            return 1;
    }
    C.inbuf[0] = 0;
    return 0;
}

export function read_text_colormap(txtfile)
{
    let i, r = C.intLocal(), g = C.intLocal(), b = C.intLocal();
    let c = C.charLocal(2);

    for (i = 0; i < C.MAXCOLORMAPSIZE; i++)
        C.color_index[i] = -1;

    C.num_colors = 0;
    while (get_next_line(txtfile, 1)) {
        if (C.sscanfPalette(C.inbuf,
            '%1[ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.] = (%d, %d, %d) ',
            c, r, g, b) !== 4)
            break;
        C.color_index[c[0]] = C.num_colors;
        C.ColorMap[C.CM_RED][C.num_colors] = r.value;
        C.ColorMap[C.CM_GREEN][C.num_colors] = g.value;
        C.ColorMap[C.CM_BLUE][C.num_colors] = b.value;
        C.num_colors++;
    }
    C.colorsinmap = C.num_colors;
}

export function write_text_colormap(txtfile)
{
    let i;
    let c;

    C.num_colors = C.colorsinmainmap;
    if (C.num_colors > 62) {
        C.Fprintf(C.stderr, 'too many colors (%d)\n', C.num_colors);
        return 0;
    }
    for (i = 0; i < C.num_colors; i++) {
        if (i < 26)
            c = 'A'.charCodeAt(0) + i;
        else if (i < 52)
            c = 'a'.charCodeAt(0) + i - 26;
        else
            c = '0'.charCodeAt(0) + i - 52;

        C.charcolors[i] = c;
        C.Fprintf(txtfile, '%c = (%d, %d, %d)\n', c,
            C.MainColorMap[C.CM_RED][i], C.MainColorMap[C.CM_GREEN][i],
            C.MainColorMap[C.CM_BLUE][i]);
    }
    return 1;
}

/* read one tile from win/share/{monsters,objects,other}.txt */
export function read_txttile(txtfile, pixels)
{
    let ph, i = C.intLocal(0), j, k, reslt;
    let buf = C.charLocal(C.BUFSZ), ttype = C.charLocal(C.BUFSZ), gend = C.charLocal(C.BUFSZ);
    let p;
    let q;
    let res = 0;

    gend[0] = 0;
    reslt = 0;
    done: {
        if (get_next_line(txtfile, 0)) {
            if (C.tile_set === MONSTER_SET)
                reslt = C.sscanfTile(C.inbuf, '# %255s %d (%255[^,],%255[^)])',
                    ttype, i, buf, gend);
            else
                reslt = C.sscanfTile(C.inbuf, '# %255s %d (%255[^)])', ttype, i, buf, gend);
        }
        if (reslt <= 0)
            break done;

        ttype[C.BUFSZ - 1] = 0;
        buf[C.BUFSZ - 1] = 0;
        if (C.tile_set === MONSTER_SET && gend[0] === 'f'.charCodeAt(0))
            C.gidx = 1;

        ph = C.strcmp(ttype, 'placeholder') === 0;
        if (!ph && C.strcmp(ttype, 'tile') !== 0)
            C.Fprintf(C.stderr, 'Keyword "%s" unexpected for entry %d\n', ttype, i.value);

        /* check tile name, but not relative number, which will
         * change when tiles are added
         */
        p = C.tilename(C.tile_set, C.tile_set_indx, C.gidx);
        if (p && (q = C.strstr(p, ' {')) !== 0) {
            C.setChar(q, 0);
        }
        if (p && C.strcmp(p, buf)) {
            let other_mismatch = (C.tile_set === OTHER_SET
                && !C.acceptable_tilename(C.tile_set, C.tile_set_indx, buf, p));
            if (C.tile_set !== OTHER_SET || other_mismatch) {
                C.Fprintf(C.stderr, 'warning: for tile %d (numbered %d) of %s,\n',
                    C.tile_set_indx, i.value, text_sets[C.tile_set]);
                C.Fprintf(C.stderr, "\tfound '%s' while expecting '%s'\n", buf, p);
            }
        }
        C.tile_set_indx++;

        /* look for non-whitespace at each stage */
        if (!get_next_line(txtfile, 1)) {
            C.Fprintf(C.stderr, 'unexpected EOF\n');
            break done;
        }
        if (C.inbuf[0] !== '{'.charCodeAt(0)) {
            C.Fprintf(C.stderr, "didn't find expected '{'\n");
            break done;
        }
        for (j = 0; j < C.TILE_Y; j++) {
            /* read next line of color indices */
            if (!get_next_line(txtfile, 1)) {
                C.Fprintf(C.stderr, 'unexpected EOF\n');
                break done;
            }
            if ((q = C.strchr(C.inbuf, '\n'.charCodeAt(0))) === 0)
                q = C.inbuf.address + C.strlen(C.inbuf); /* eos(inbuf) */
            while (q < C.inbuf.address + C.TILE_X)
                C.setChar(q++, '.'.charCodeAt(0));
            C.setChar(q, 0);
            for (i.value = 0; i.value < C.TILE_X; i.value++) {
                k = C.color_index[C.inbuf[i.value] & 255];
                if (C.grayscale && k >= 0) {
                    if (k > graymappings.length - 1)
                        C.Fprintf(C.stderr, 'Gray mapping issue %d > %d.\n', k, graymappings.length - 1);
                    else
                        k = graymappings[k];
                }
                if (k === -1) {
                    C.Fprintf(C.stderr, 'color %c not in colormap!\n', C.inbuf[i.value]);
                } else if (k >= 0 && k < C.MAXCOLORMAPSIZE) {
                    pixels[j][i.value].r = C.ColorMap[C.CM_RED][k];
                    pixels[j][i.value].g = C.ColorMap[C.CM_GREEN][k];
                    pixels[j][i.value].b = C.ColorMap[C.CM_BLUE][k];
                } else {
                    C.Fprintf(C.stderr, '%d exceeds array boundary for ColorMap[][%d]!\n', k, C.MAXCOLORMAPSIZE);
                }
            }
        }
        if (ph) {
            /* remember it for later */
            C.copy(C.placeholder, pixels, C.placeholderSize);
        }
        if (!get_next_line(txtfile, 1)) {
            C.Fprintf(C.stderr, 'unexpected EOF\n');
            break done;
        }
        if (C.inbuf[0] !== '}'.charCodeAt(0)) {
            C.Fprintf(C.stderr, "didn't find expected '}'\n");
            break done;
        }
        res = 1;
    }
    C.inbuf[0] = 0;
    return res;
}

export function write_txttile(txtfile, pixels)
{
    let p;
    let type;
    let i = 0, j, k;

    if (C.memcmp(C.placeholder, pixels, C.placeholderSize) === 0)
        type = 'placeholder';
    else
        type = 'tile';
    if (C.tile_set === MONSTER_SET) {
        for (i = 0; i < 2; ++i) {
            C.Fprintf(txtfile, '# %s %d (unknown,%s)\n', type, C.tile_set_indx, i ? 'female' : 'male');
            if (i === 0)
                C.tile_set_indx++;
        }
    } else {
        p = C.tilename(C.tile_set, C.tile_set_indx, i);
        if (p)
            C.Fprintf(txtfile, '# %s %d (%s)\n', type, C.tile_set_indx, p);
        else
            C.Fprintf(txtfile, '# %s %d (null)\n', type, C.tile_set_indx);
    }
    C.tile_set_indx++;
    C.Fprintf(txtfile, '{\n');
    for (j = 0; j < C.TILE_Y; j++) {
        C.Fprintf(txtfile, '  ');
        for (i = 0; i < C.TILE_X; i++) {
            for (k = 0; k < C.num_colors; k++) {
                if (C.ColorMap[C.CM_RED][k] === pixels[j][i].r
                    && C.ColorMap[C.CM_GREEN][k] === pixels[j][i].g
                    && C.ColorMap[C.CM_BLUE][k] === pixels[j][i].b)
                    break;
            }
            if (k >= C.num_colors)
                C.Fprintf(C.stderr, 'color not in colormap!\n');
            C.fputc(C.charcolors[k], txtfile);
        }
        C.Fprintf(txtfile, '\n');
    }
    C.Fprintf(txtfile, '}\n');
}

/* initialize main colormap from globally accessed ColorMap */
export function init_colormap()
{
    let i;
    C.colorsinmainmap = C.colorsinmap;
    for (i = 0; i < C.colorsinmap; i++) {
        C.MainColorMap[C.CM_RED][i] = C.ColorMap[C.CM_RED][i];
        C.MainColorMap[C.CM_GREEN][i] = C.ColorMap[C.CM_GREEN][i];
        C.MainColorMap[C.CM_BLUE][i] = C.ColorMap[C.CM_BLUE][i];
    }
}

/* merge new colors from ColorMap into MainColorMap */
export function merge_colormap()
{
    let i, j;
    for (i = 0; i < C.colorsinmap; i++) {
        for (j = 0; j < C.colorsinmainmap; j++) {
            if (C.MainColorMap[C.CM_RED][j] === C.ColorMap[C.CM_RED][i]
                && C.MainColorMap[C.CM_GREEN][j] === C.ColorMap[C.CM_GREEN][i]
                && C.MainColorMap[C.CM_BLUE][j] === C.ColorMap[C.CM_BLUE][i])
                break;
        }
        if (j >= C.colorsinmainmap) { /* new color */
            if (C.colorsinmainmap >= C.MAXCOLORMAPSIZE) {
                C.Fprintf(C.stderr, 'Too many colors to merge -- excess ignored.\n');
            }
            j = C.colorsinmainmap;
            C.MainColorMap[C.CM_RED][j] = C.ColorMap[C.CM_RED][i];
            C.MainColorMap[C.CM_GREEN][j] = C.ColorMap[C.CM_GREEN][i];
            C.MainColorMap[C.CM_BLUE][j] = C.ColorMap[C.CM_BLUE][i];
            C.colorsinmainmap++;
        }
    }
}

export function fopen_text_file(filename, type)
{
    let p;
    let i;
    if (C.tile_file !== 0) {
        C.Fprintf(C.stderr, 'can only open one text file at a time\n');
        return 0;
    }
    C.tile_file = C.fopen(filename, type);
    if (C.tile_file === 0) {
        C.Fprintf(C.stderr, 'cannot open text file %s\n', filename);
        return 0;
    }
    p = C.strrchr(filename, '/'.charCodeAt(0));
    if (p)
        p++;
    else
        p = filename;
    C.tile_set = 0;
    for (i = 0; i < text_sets.length; i++) {
        if (!C.strcmp(p, text_sets[i]))
            C.tile_set = i;
    }
    C.tile_set_indx = 0;
    if (!C.strcmp(type, C.RDTMODE)) {
        /* Fill placeholder with noise */
        if (!C.placeholder_init) {
            C.placeholder_init++;
            for (i = 0; i < C.placeholderSize; i++)
                C.placeholderBytes[i] = i % 256;
        }
        read_text_colormap(C.tile_file);
        if (!C.colorsinmainmap)
            init_colormap();
        else
            merge_colormap();
        return 1;
    } else if (!C.strcmp(type, C.WRTMODE)) {
        if (!C.colorsinmainmap) {
            C.Fprintf(C.stderr, 'no colormap set yet\n');
            return 0;
        }
        return write_text_colormap(C.tile_file);
    } else {
        C.Fprintf(C.stderr, 'bad mode (%s) for fopen_text_file\n', type);
        return 0;
    }
}

export function read_text_tile(pixels)
{
    return read_txttile(C.tile_file, pixels);
}

export function write_text_tile(pixels)
{
    write_txttile(C.tile_file, pixels);
    return 1;
}

export function fclose_text_file()
{
    let ret;
    ret = C.fclose(C.tile_file);
    C.tile_file = 0;
    return ret;
}

// Original preprocessor/palette documentation retained verbatim.
/* Ugh.  DICE doesn't like %[A-Z], so we have to spell it out... */
/*
-----------------------------------------------------------------------------
    Tile palette Feb 9, 2022

    [0]  . = (71, 108, 108)
    [1]  A = (0, 0, 0)        grayshade   maps to [1] itself
    [2]  B = (0, 182, 255)                maps to [17] or Q for shade of gray
    [3]  C = (255, 108, 0)                maps to [18] or R for shade of gray
    [4]  D = (255, 0, 0)                  maps to [19] or S for shade of gray
    [5]  E = (0, 0, 255)                  maps to [20] or T for shade of gray
    [6]  F = (0, 145, 0)                  maps to [27] or 0 for shade of gray
    [7]  G = (108, 255, 0)                maps to [22] or V for shade of gray
    [8]  H = (255, 255, 0)                maps to [23] or W for shade of gray
    [9]  I = (255, 0, 255)                maps to [24] or X for shade of gray
    [10] J = (145, 71, 0)                 maps to [25] or Y for shade of gray
    [11] K = (204, 79, 0)                 maps to [26] or Z for shade of gray
    [12] L = (255, 182, 145)              maps to [21] or U for shade of gray
    [13] M = (237, 237, 237)  grayshade   maps to [15] or O for shade of gray
    [14] N = (255, 255, 255)  grayshade   maps to [13] or M for shade of gray
    [15] O = (215, 215, 215)  grayshade   maps to [14] or N for shade of gray
    [16] P = (108, 145, 182)              maps to [14] or N for shade of gray
    [17] Q = (18, 18, 18)     grayshade   maps to [1]  or A for shade of gray
    [18] R = (54, 54, 54)     grayshade   maps to [17] or Q for shade of gray
    [19] S = (73, 73, 73)     grayshade   maps to [18] or R for shade of gray
    [20] T = (82, 82, 82)     grayshade   maps to [19] or S for shade of gray
    [21] U = (205,205,205)    grayshade   maps to [20] or T for shade of gray
    [22] V = (104, 104, 104)  grayshade   maps to [27] or 0 for shade of gray
    [23] W = (131, 131, 131)  grayshade   maps to [22] or V for shade of gray
    [24] X = (140, 140, 140)  grayshade   maps to [23] or W for shade of gray
    [25] Y = (149, 149, 149)  grayshade   maps to [24] or X for shade of gray
    [26] Z = (195, 195, 195)  grayshade   maps to [25] or Y for shade of gray
    [27] 0 = (100, 100, 100)  grayshade   maps to [20] or T for shade of gray
    [28] 1 = (72, 108, 108)               not mapped in graymappings
-----------------------------------------------------------------------------
*/
/* grayscale color mapping */
/* check tile name, but not relative number, which will
     * change when tiles are added
     */
