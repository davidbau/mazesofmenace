/* NetHack 5.0	thintile.c	$NHDT-Date: 1596498337 2020/08/03 23:45:37 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.11 $ */
/*   Copyright (c) NetHack Development Team 1995                    */
/*   NetHack may be freely redistributed.  See license for details. */

/* Create a set of overview tiles by eliminating even pixels in original */

import { C } from './scope.js';

// pixels has native zero-initialized addressable storage.

export const tilefiles = [ "../win/share/monsters.txt",
                             "../win/share/objects.txt",
                             "../win/share/other.txt" ];

export const thinfiles = [ "../win/share/monthin.txt",
                             "../win/share/objthin.txt",
                             "../win/share/oththin.txt" ];
// C.infile, C.outfile, counts and C.comment belong to the current Module.

export function copy_colormap()
{
    let r = C.intLocal(), g = C.intLocal(), b = C.intLocal();
    const c = C.bytesLocal(2);

    while (C.fscanf(C.infile, "%[A-Za-z0-9.] = (%d, %d, %d) ", c, r, g, b)
           == 4) {
        C.Fprintf(C.outfile, "%c = (%d, %d, %d)\n", C.loadChar(c), r.value, g.value, b.value);
    }
}

export function read_txttile()
{
    let i = C.intLocal(), j;
    const buf = C.bytesLocal(C.BUFSZ);
    const buf2 = C.bytesLocal(C.BUFSZ);

    const c = C.bytesLocal(2);

    if (C.fscanf(C.infile, "# %s %d (%[^)])", buf2, i, buf) <= 0)
        return C.FALSE;

    C.Sprintf(C.comment, "# tile %d (%s)", i.value, buf);

    /* look for non-whitespace at each stage */
    if (C.fscanf(C.infile, "%1s", c) < 0) {
        C.Fprintf(C.stderr, "unexpected EOF\n");
        return C.FALSE;
    }
    if (C.loadChar(c) != '{'.charCodeAt(0)) {
        C.Fprintf(C.stderr, "didn't find expected '{'\n");
        return C.FALSE;
    }
    for (j = 0; j < C.TILE_Y; j++) {
        for (i.value = 0; i.value < C.TILE_X; i.value++) {
            if (C.fscanf(C.infile, "%1s", c) < 0) {
                C.Fprintf(C.stderr, "unexpected EOF\n");
                return C.FALSE;
            }
            C.storeChar(C.pixels + j * C.TILE_X + i.value, C.loadChar(c));
        }
    }
    if (C.fscanf(C.infile, "%1s ", c) < 0) {
        C.Fprintf(C.stderr, "unexpected EOF\n");
        return C.FALSE;
    }
    if (C.loadChar(c) != '}'.charCodeAt(0)) {
        C.Fprintf(C.stderr, "didn't find expected '}'\n");
        return C.FALSE;
    }
    return C.TRUE;
}

export function write_thintile()
{
    let i, j;

    C.Fprintf(C.outfile, "%s\n", C.comment);
    C.Fprintf(C.outfile, "{\n");
    for (j = 0; j < C.TILE_Y; j++) {
        C.Fprintf(C.outfile, "  ");
        for (i = 0; i < C.TILE_X; i += 2) {
            C.fputc(C.loadChar(C.pixels + j * C.TILE_X + i), C.outfile);
        }
        C.Fprintf(C.outfile, "\n");
    }
    C.Fprintf(C.outfile, "}\n");
}
export function main(argc, argv)
{
    while (C.filenum < 3) {
        C.tilecount_per_file = 0;
        C.infile = C.fopen(tilefiles[C.filenum], C.RDTMODE);
        C.outfile = C.fopen(thinfiles[C.filenum], C.WRTMODE);
        C.callLocal(copy_colormap);
        while (C.callLocal(read_txttile)) {
            write_thintile();
            C.tilecount_per_file++;
            C.tilecount++;
        }
        C.fclose(C.outfile);
        C.fclose(C.infile);
        C.printf("%d tiles processed from %s\n", C.tilecount_per_file,
               tilefiles[C.filenum]);
        ++C.filenum;
    }
    C.printf("Grand total of %d tiles processed.\n", C.tilecount);
    C.exit(C.EXIT_SUCCESS);
    /*NOTREACHED*/
    return 0;
}

/*thintile.c*/
