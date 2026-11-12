/* NetHack 5.0	tile2bmp.c	$NHDT-Date: 1737281026 2025/01/19 02:03:46 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.51 $ */
/*   Copyright (c) NetHack PC Development Team 1995                 */
/*   NetHack may be freely redistributed.  See license for details. */

/*
 * Edit History:
 *
 *      Initial Creation                        M.Allison   1994/01/11
 *      256 colour bmp and statue support       M.Allison   2015/04/19
 *
 */








/* GCC fix by Paolo Bonzini 1999/03/28 */


export function leshort(x)
{
    x = C.short(x);
    return x;

}

export function lelong(x)
{
    x = C.int(x);
    return x;

}

/* __GNUC__ */

/* start */

/* monsters must be first because main uses it twice */
export const relative_tiledir = "../win/share/";
export const tilefilenames = [["monsters.txt", "objects.txt", "other.txt"]];
import { C } from '../../c-runtime/context.js';

export function main(argc, argv)
{
    let i, j, number_of_rows, number_in_final_row;
    let c;
    const tilefile_full_path = C.bytesLocal(256, true);

    if (argc != 2) {
        C.Fprintf(C.stderr, "usage: %s outfile.bmp\n", argv[0]);
        C.exit(C.EXIT_FAILURE);
    } else if (argv[1] == 0 || C.strlen(argv[1]) >= C.bmpnameSize - 1n) {
        C.Fprintf(C.stderr, "invalid output bmp file name %s, aborting.\n",
                argv[0]);
        C.exit(C.EXIT_FAILURE);
    } else {
        C.strcpy(C.bmpname, argv[1]);
    }

    C.objects_globals_init();
    C.monst_globals_init();

/*    tilefileset = (TILE_X == 64) ? 2 : (TILE_X == 32) ? 1 : 0; */
    C.tilefileset = 0;
    if (!C.callLocal(examine_tilefiles)) {
        C.Fprintf(C.stderr, "unable to open all of the tile files, aborting.\n");
        C.exit(C.EXIT_FAILURE);
    }
    for (i = 0; i < C.tilecnt.length; ++i)
        C.magictileno += C.tilecnt[i];
    /* count monsters twice for grayscale variation */
    C.magictileno += C.tilecnt[0];

    C.max_x = C.TILE_X * C.max_tiles_in_row;
    C.max_y = C.div((C.TILE_Y * C.magictileno), C.max_tiles_in_row) + C.TILE_Y;
    C.bmpsize = C.int((C.bmpSize - 1n)
                  + (BigInt(C.max_y) * (BigInt(C.max_x) * 1n)));
    C.newbmp = C.malloc(C.bmpsize);
    if (!C.newbmp) {
        C.printf("memory allocation failure, %d %d, aborting.\n",
                C.bmpsize, C.magictileno);
        C.exit(C.EXIT_FAILURE);
    }
    C.tiles_counted = 0;
    C.xoffset = C.yoffset = 0;
    C.initflag = 0;
    C.filenum = 0;
    C.pass = 0;
    C.fp = C.fopen(C.bmpname, "wb");
    if (!C.fp) {
        C.printf("Error creating tile file %s, aborting.\n", C.bmpname);
        C.exit(C.EXIT_FAILURE);
    }
    while (C.pass < 4) {
        C.filenum = C.pass % tilefilenames[C.tilefileset].length;
        if (!set_tilefile_path(relative_tiledir,
                               tilefilenames[C.tilefileset][C.filenum],
                               tilefile_full_path, 256n)) {
            C.Fprintf(C.stderr, "tile2bmp path issue %s %s %d\n",
                    relative_tiledir, tilefilenames[C.tilefileset][C.filenum],
                    256);
            C.exit(C.EXIT_FAILURE);
        }
        if (!C.fopen_text_file(tilefile_full_path, C.RDTMODE)) {
            C.Fprintf(C.stderr, "usage: tile2bmp (from the util directory)\n");
            C.exit(C.EXIT_FAILURE);
        }
        C.num_colors = C.colorsinmap;
        if (C.num_colors > 62) {
            C.Fprintf(C.stderr, "too many colors (%d), aborting.\n", C.num_colors);
            C.exit(C.EXIT_FAILURE);
        }
        if (!C.initflag) {
            let bmih;

            build_bmfh(C.bmfh);
            bmih = C.bmih;
            build_bmih(bmih);
            for (i = 0; i < C.num_colors; i++) {
                C.bmaColors[i].rgbRed = C.ColorMap[C.CM_RED][i];
                C.bmaColors[i].rgbGreen = C.ColorMap[C.CM_GREEN][i];
                C.bmaColors[i].rgbBlue = C.ColorMap[C.CM_BLUE][i];
                C.bmaColors[i].rgbReserved = 0;
            }
            C.copyBmp(C.newbmp);
            for (i = 0; i < C.max_y; ++i)
                for (j = 0; j < C.max_x; ++j) {
                    c = C.packtile(C.newbmp) + ((i * C.max_x) + j);
                    C.storeByte(c, 0);
                }
            C.initflag = 1;
        }
        C.set_grayscale(C.pass == 3);
        /* printf("Colormap initialized\n"); */
        while (C.read_text_tile(C.tilepixels)) {
            if (C.tiles_counted >= C.magictileno) {
                C.Fprintf(C.stderr, "tile2bmp: more than %d tiles!\n",
                        C.magictileno);
                C.exit(C.EXIT_FAILURE);
            }
            build_bmptile(C.tilepixels);
            C.tiles_counted++;
            C.xoffset += C.TILE_X;
            if (C.xoffset >= C.max_x) {
                C.yoffset += C.TILE_Y;
                C.xoffset = 0;
            }
        }
        C.fclose_text_file();
        ++C.pass;
    }
    C.fwrite(C.newbmp, C.bmpsize, 1, C.fp);
    C.fclose(C.fp);
    number_of_rows = C.div(C.tiles_counted, C.max_tiles_in_row);
    number_in_final_row = C.tiles_counted % C.max_tiles_in_row;

    C.Fprintf(C.stderr, "Total of %d tiles written to %s, " +
            "%d full rows of %d tiles",
            C.tiles_counted, C.bmpname,
            number_of_rows, C.max_tiles_in_row);
    if (number_in_final_row != 0) {
        C.Fprintf(C.stderr, ", final row %d has %d tile%s",
                number_of_rows + 1, number_in_final_row,
                number_in_final_row > 1 ? "s" : "");
    }
    C.fputs(".\n\n", C.stderr);
    C.free(C.newbmp);

    C.exit(C.EXIT_SUCCESS);
    /*NOTREACHED*/
    return 0;
}



export function build_bmfh(pbmfh)
{
    pbmfh.bfType = leshort(0x4D42);
    pbmfh.bfSize = lelong(C.bmpsize);
    pbmfh.bfReserved1 = 0;
    pbmfh.bfReserved2 = 0;
    pbmfh.bfOffBits = lelong(C.bmfhSize + C.bmihSize
                              + (BigInt(C.RGBQUAD_COUNT) * C.rgbSize));
}

export function build_bmih(pbmih)
{
    let cClrBits;
    let w, h;
    pbmih.biSize = lelong(C.bmihSize);
    pbmih.biWidth = lelong(w = C.max_x);
    pbmih.biHeight = lelong(h = C.max_y);
    pbmih.biPlanes = leshort(1);
    pbmih.biBitCount = leshort(8);
    cClrBits = 8;
    if (cClrBits == 1)
        cClrBits = 1;
    else if (cClrBits <= 4)
        cClrBits = 4;
    else if (cClrBits <= 8)
        cClrBits = 8;
    else if (cClrBits <= 16)
        cClrBits = 16;
    else if (cClrBits <= 24)
        cClrBits = 24;
    else
        cClrBits = 32;
    pbmih.biCompression = lelong(C.BI_RGB);
    pbmih.biXPelsPerMeter = lelong(0);
    pbmih.biYPelsPerMeter = lelong(0);
    pbmih.biClrUsed = lelong(C.RGBQUAD_COUNT);

    pbmih.biSizeImage = lelong(C.div(((w * cClrBits + 31) & ~31), 8) * h);
    pbmih.biClrImportant = 0;
}

export function build_bmptile(pixels)
{
    let cur_x, cur_y, cur_color, apply_color;
    let x, y;
    let c;

    for (cur_y = 0; cur_y < C.TILE_Y; cur_y++) {
        for (cur_x = 0; cur_x < C.TILE_X; cur_x++) {
            for (cur_color = 0; cur_color < C.num_colors; cur_color++) {
                if (C.ColorMap[C.CM_RED][cur_color] == pixels[cur_y][cur_x].r
                    && C.ColorMap[C.CM_GREEN][cur_color] == pixels[cur_y][cur_x].g
                    && C.ColorMap[C.CM_BLUE][cur_color] == pixels[cur_y][cur_x].b)
                    break;
            }
            if (cur_color >= C.num_colors)
                C.Fprintf(C.stderr, "color not in colormap! (tile #%d)\n",
                        C.tiles_counted);
            y = (C.max_y - 1) - (cur_y + C.yoffset);
            apply_color = cur_color;
            x = cur_x + C.xoffset;
            c = C.packtile(C.newbmp) + ((y * C.max_x) + x);
            C.storeByte(c, C.uchar(apply_color));
        }
    }
}

export function set_tilefile_path(fdir, fname, buf, sz)
{
    sz = C.size_t(sz);
    let consuming = 0n;

    C.storeByte(buf, '\0'.charCodeAt(0));
    consuming = C.strlen(fdir) + C.strlen(fname) + 1n;
    if (consuming > sz)
        return 0;
    C.Strcpy(buf, fdir);
    C.Strcat(buf, fname);
    return 1;
}

export function examine_tilefiles()
{
    let fp2;
    let i, tiles_in_file;
    const tilefile_full_path = C.bytesLocal(256);

    for (i = 0; i < tilefilenames[0].length; ++i) {
        tiles_in_file = 0;
        if (!set_tilefile_path(relative_tiledir,
                               tilefilenames[C.tilefileset][i],
                               tilefile_full_path,
                               256n)) {
            C.Fprintf(C.stderr, "tile2bmp path issue %s/%s %d\n",
                    relative_tiledir, tilefilenames[C.tilefileset][i],
                    256);
            return 0;
        }
        fp2 = C.fopen(tilefile_full_path, "r");
        if (fp2) {
            const line = C.bytesLocal(256);

            while (C.fgets(line, 256, fp2)) {
                if (!C.strncmp(line, "# tile ", 7))
                    tiles_in_file++;
            }
            C.fclose(fp2);
            C.tilecnt[i] = tiles_in_file;
        }
    }
    return 1;
}

/*tile2bmp.c*/
