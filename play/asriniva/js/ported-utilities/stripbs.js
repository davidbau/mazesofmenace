/* NetHack 5.0  stripbs.c                                         */
/* Copyright (c) Michael Allison, 2025.                                */
/* NetHack may be freely redistributed.  See license for details. */

/*
 * a simple filter to strip character-backspace-character
 * from stdin and write the final character to stdout.
 */

import { C } from '../ported/c-runtime.js';

/* Native includes stdio/stdlib/string/errno and inert UNUSED annotation. */
export function main(argc, argv)
{
    let stop = 0, trouble = 0;
    const buf = C.charBuffer(2);
    let cp = buf, prev = buf + 1;

    C.storeChar(prev, 0);
    while (!stop) {
        if ((C.fread(buf, 1, 1, C.stdin)) > 0) {
            if (C.loadChar(cp) == 8) {
                C.storeChar(prev, 0);
            } else {
                if (C.loadChar(prev))
                    C.fputc(C.loadChar(prev), C.stdout);
                C.storeChar(prev, C.loadChar(cp));
            }
        } else {
            if (C.errno != C.EOF)
                trouble = 1;
            if (C.loadChar(prev))
                C.fputc(C.loadChar(prev), C.stdout);
            stop = 1;
        }
    }
    C.fflush(C.stdout);
    C.fclose(C.stdout);
    return trouble ? C.EXIT_FAILURE : C.EXIT_SUCCESS;
}
