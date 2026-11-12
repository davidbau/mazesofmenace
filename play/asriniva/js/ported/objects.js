/* NetHack 5.0	objects.c	$NHDT-Date: 1596498192 2020/08/03 23:43:12 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.66 $ */
/* Copyright (c) Mike Threepoint, 1989.                           */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from '../c-runtime/context.js';
import { obj_descr_init, obj_init } from './objects-data.js';
export { catalogue, obj_descr_init, obj_init } from './objects-data.js';

/* in hack.h but we're using config.h */

export function objects_globals_init()
{
    C.memcpy(C.obj_descr, obj_descr_init, C.sizeof_obj_descr);
    C.memcpy(C.objects, obj_init, C.sizeof_objects);
}

/*objects.c*/
