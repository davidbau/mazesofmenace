// js/sfbase.js — Port of nethack-c/src/sfbase.c sf_init()

// Global arrays for save format processing
// These are declared at module scope to match C globals
// enum saveformats { invalid = 0, historical = 1, exportascii = 2, NUM_SAVEFORMATS }

// Placeholder structures (actual struct definitions not needed for sf_init)
// The function only initializes these arrays with zero-initialized or predefined values

let sfoprocs = [];
let sfiprocs = [];
let sfoflprocs = [];
let sfiflprocs = [];

// Zero-initialized struct placeholders
const zerosfoprocs = {};
const zerosfiprocs = {};
const zerosfoflprocs = {};
const zerosfiflprocs = {};

// Historical save format procs (stubbed for now)
const historical_sfo_procs = {};
const historical_sfi_procs = {};

/**
 * sf_init - Initialize the function pointers for save format processing.
 * Called from initoptions_init() in C.
 *
 * C source: nethack-c/src/sfbase.c:646
 *
 * void
 * sf_init(void)
 * {
 *     sfoprocs[invalid] = zerosfoprocs;
 *     sfiprocs[invalid] = zerosfiprocs;
 *     sfoprocs[historical] = historical_sfo_procs;
 *     sfiprocs[historical] = historical_sfi_procs;
 *     sfoflprocs[exportascii] = zerosfoflprocs;
 *     sfiflprocs[exportascii] = zerosfiflprocs;
 * }
 */
export function sf_init() {
    // enum saveformats indices: invalid = 0, historical = 1, exportascii = 2
    sfoprocs[0] = zerosfoprocs;           // invalid
    sfiprocs[0] = zerosfiprocs;           // invalid
    sfoprocs[1] = historical_sfo_procs;   // historical
    sfiprocs[1] = historical_sfi_procs;   // historical
    sfoflprocs[2] = zerosfoflprocs;       // exportascii
    sfiflprocs[2] = zerosfiflprocs;       // exportascii
}
