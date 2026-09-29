// js/objects.js
//
// Ported functions from nethack-c/src/objects.c.
// Auto-created as a header-only scaffold by tools/equiv-test/gen-port-tasks.mjs
// --emit-module-scaffolds. Porters add one exported function per task.

// Global arrays (C: objects.c globals, initialized by objects_globals_init)
let obj_descr = [];
let obj_descr_init = [];
let objects = [];
let obj_init = [];

export function objects_globals_init() {
    // memcpy(obj_descr, obj_descr_init, sizeof(obj_descr));
    for (let i = 0; i < obj_descr_init.length; i++) {
        obj_descr[i] = { ...obj_descr_init[i] };
    }
    // memcpy(objects, obj_init, sizeof(objects));
    for (let i = 0; i < obj_init.length; i++) {
        objects[i] = { ...obj_init[i] };
    }
}
