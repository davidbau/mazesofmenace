/* NetHack 5.0	pcunix.c	$NHDT-Date: 1596498285 2020/08/03 23:44:45 $  $NHDT-Branch: NetHack-5.0 $:$NHDT-Revision: 1.42 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Michael Allison, 2006. */
/* NetHack may be freely redistributed.  See license for details. */

/* This file collects some Unix dependencies; pager.c contains some more */

import { C } from './pcunix-scope.js';

export function regularize(s)
/*
 * normalize file name - we don't like .'s, /'s, spaces, and
 * lots of other things
 */
{
    let lp;

    for (lp = s; C.char(lp); lp++)
        if (C.char(lp) <= ' '.charCodeAt(0) || C.char(lp) == '"'.charCodeAt(0)
            || (C.char(lp) >= '*'.charCodeAt(0) && C.char(lp) <= ','.charCodeAt(0))
            || C.char(lp) == '.'.charCodeAt(0) || C.char(lp) == '/'.charCodeAt(0)
            || (C.char(lp) >= ':'.charCodeAt(0) && C.char(lp) <= '?'.charCodeAt(0))
            || C.char(lp) == '|'.charCodeAt(0) || C.char(lp) >= 127
            || (C.char(lp) >= '['.charCodeAt(0) && C.char(lp) <= ']'.charCodeAt(0)))
            C.storeChar(lp, '_'.charCodeAt(0));
}
