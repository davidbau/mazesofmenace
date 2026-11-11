/* NetHack 5.0  ppmwrite.c	$NHDT-Date: 1596498336 2020/08/03 23:45:36 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.7 $ */
/* this produces a raw ppm file, with a 15-character header of
 * "P6 3-digit-width 3-digit-height 255\n"
 */
import {C} from './scope.js';

export function write_header()
{
    C.fprintf(C.ppm_file, "P6 %03d %03d 255\n", C.PpmScreen.Width,
                   C.PpmScreen.Height);
}

export function WriteTileStrip()
{
    let i, j;

    for (j = 0; j < C.TILE_Y; j++) {
        for (i = 0; i < C.PpmScreen.Width; i++) {
            C.fputc(C.char(C.pixel(C.imageAt(j, i)).r), C.ppm_file);
            C.fputc(C.char(C.pixel(C.imageAt(j, i)).g), C.ppm_file);
            C.fputc(C.char(C.pixel(C.imageAt(j, i)).b), C.ppm_file);
        }
    }
}

export function fopen_ppm_file(filename, type)
{
    let i;

    if (C.strcmp(type, C.WRBMODE)) {
        C.fprintf(C.stderr, "using writing routine for non-writing?\n");
        return 0;
    }
    C.ppm_file = C.fopen(filename, type);
    if (C.ppm_file == 0) {
        C.fprintf(C.stderr, "cannot open ppm file %s\n", filename);
        return 0;
    }

    if (!C.colorsinmainmap) {
        C.fprintf(C.stderr, "no colormap set yet\n");
        return 0;
    }

    C.tiles_across = 20;
    C.curr_tiles_across = 0;
    C.PpmScreen.Width = 20 * C.TILE_X;

    C.tiles_down = 0;
    C.PpmScreen.Height = 0; /* will be rewritten later */

    C.callLocal(write_header);

    C.image = C.alloc(BigInt(C.TILE_Y) * BigInt(C.pointerSize));
    for (i = 0; i < C.TILE_Y; i++) {
        C.setPointer(C.image + i * C.pointerSize,
                    C.alloc(BigInt(C.PpmScreen.Width) * BigInt(C.pixelSize)));
    }

    return 1;
}

export function write_ppm_tile(pixels)
{
    let i, j;

    for (j = 0; j < C.TILE_Y; j++) {
        for (i = 0; i < C.TILE_X; i++) {
            C.copyPixel(C.imageAt(j, C.curr_tiles_across * C.TILE_X + i),
                        pixels + (j * C.TILE_X + i) * C.pixelSize);
        }
    }
    C.curr_tiles_across++;
    if (C.curr_tiles_across == C.tiles_across) {
        C.callLocal(WriteTileStrip);
        C.curr_tiles_across = 0;
        C.tiles_down++;
    }
    return 1;
}

export function fclose_ppm_file()
{
    let i, j;

    if (C.curr_tiles_across) { /* partial row */
        /* fill with checkerboard, for lack of a better idea */
        for (j = 0; j < C.TILE_Y; j++) {
            for (i = C.curr_tiles_across * C.TILE_X; i < C.PpmScreen.Width;
                 i += 2) {
                C.pixel(C.imageAt(j, i)).r = C.MainColorMap(C.CM_RED, 0);
                C.pixel(C.imageAt(j, i)).g = C.MainColorMap(C.CM_GREEN, 0);
                C.pixel(C.imageAt(j, i)).b = C.MainColorMap(C.CM_BLUE, 0);
                C.pixel(C.imageAt(j, i + 1)).r = C.MainColorMap(C.CM_RED, 1);
                C.pixel(C.imageAt(j, i + 1)).g = C.MainColorMap(C.CM_GREEN, 1);
                C.pixel(C.imageAt(j, i + 1)).b = C.MainColorMap(C.CM_BLUE, 1);
            }
        }
        C.callLocal(WriteTileStrip);
        C.curr_tiles_across = 0;
        C.tiles_down++;
    }

    for (i = 0; i < C.TILE_Y; i++) {
        C.free(C.pointerAt(C.image + i * C.pointerSize));
    }
    C.free(C.image);

    C.PpmScreen.Height = C.tiles_down * C.TILE_Y;
    C.rewind(C.ppm_file);
    C.callLocal(write_header); /* update size */

    return (C.fclose(C.ppm_file));
}

export function main(argc, argv)
{
    const pixels = C.stackAlloc(C.TILE_Y * C.TILE_X * C.pixelSize);

    if (argc != 3) {
        C.fprintf(C.stderr, "usage: txt2ppm txtfile ppmfile\n");
        C.exit(C.EXIT_FAILURE);
    }

    if (!C.fopen_text_file(C.pointerAt(argv + C.pointerSize), C.RDTMODE))
        C.exit(C.EXIT_FAILURE);

    C.init_colormap();

    if (!C.callLocal(fopen_ppm_file, C.pointerAt(argv + 2 * C.pointerSize), C.WRBMODE)) {
        C.fclose_text_file();
        C.exit(C.EXIT_FAILURE);
    }

    while (C.read_text_tile(pixels))
        C.callLocal(write_ppm_tile, pixels);

    C.fclose_text_file();
    C.callLocal(fclose_ppm_file);
    C.exit(C.EXIT_SUCCESS);
    /*NOTREACHED*/
    return 0;
}
