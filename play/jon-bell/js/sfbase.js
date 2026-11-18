// js/sfbase.js — Port of nethack-c-v5/upstream/src/sfbase.c
//
// In the JS port, save/level/bones persistence uses game.levelStore and
// encode_save_graph/decode_save_graph over js/storage.js VFS (see js/save.js)
// rather than C's NHFILE binary/fieldlevel struct I/O. Accordingly, sfo_*/sfi_*
// dispatchers, SAVEFILE_DEBUGGING logging (sf_log/sfvalue_*/*_dump), and
// empty norm_ptrs_* no-ops are at the representation boundary; this module
// models C's save-format proc table globals and initialization/setter API.

// C ref: include/hack.h:974-979 enum saveformats
export const SAVEFORMATS = Object.freeze({
    invalid: 0,
    historical: 1,
    exportascii: 2,
    NUM_SAVEFORMATS: 3,
});

// C ref: include/hack.h:963 UNCONVERTING = 0x10; sfbase.c:15
export const TURN_OFF_LOGGING = 0x10 << 1;

// C ref: sfbase.c:17-20 — BSS zero-initialized proc arrays of length NUM_SAVEFORMATS
const zerosfoprocs = Object.freeze({});
const zerosfiprocs = Object.freeze({});
const zerosfoflprocs = Object.freeze({});
const zerosfiflprocs = Object.freeze({});

// Historical save format procs (structlevel binary I/O lives at representation boundary)
const historical_sfo_procs = Object.freeze({});
const historical_sfi_procs = Object.freeze({});

export const sfoprocs = Array.from({ length: SAVEFORMATS.NUM_SAVEFORMATS }, () => ({}));
export const sfiprocs = Array.from({ length: SAVEFORMATS.NUM_SAVEFORMATS }, () => ({}));
export const sfoflprocs = Array.from({ length: SAVEFORMATS.NUM_SAVEFORMATS }, () => ({}));
export const sfiflprocs = Array.from({ length: SAVEFORMATS.NUM_SAVEFORMATS }, () => ({}));

/**
 * sf_init - Initialize the function pointers for save format processing.
 * Called from initoptions_init() in C (options.c:7129).
 *
 * C ref: nethack-c-v5/upstream/src/sfbase.c:647-655
 */
export function sf_init() {
    sfoprocs[SAVEFORMATS.invalid] = { ...zerosfoprocs };
    sfiprocs[SAVEFORMATS.invalid] = { ...zerosfiprocs };
    sfoprocs[SAVEFORMATS.historical] = { ...historical_sfo_procs };
    sfiprocs[SAVEFORMATS.historical] = { ...historical_sfi_procs };
    sfoflprocs[SAVEFORMATS.exportascii] = { ...zerosfoflprocs };
    sfiflprocs[SAVEFORMATS.exportascii] = { ...zerosfiflprocs };
}

/**
 * sf_setprocs - Set struct-level input/output proc tables for saveformat idx.
 *
 * C ref: nethack-c-v5/upstream/src/sfbase.c:658-662
 */
export function sf_setprocs(idx, sfi, sfo) {
    sfoprocs[idx] = { ...sfo };
    sfiprocs[idx] = { ...sfi };
}

/**
 * sf_setflprocs - Set field-level input/output proc tables for saveformat idx.
 *
 * C ref: nethack-c-v5/upstream/src/sfbase.c:664-669
 */
export function sf_setflprocs(idx, flsfi, flsfo) {
    sfoflprocs[idx] = { ...flsfo };
    sfiflprocs[idx] = { ...flsfi };
}
