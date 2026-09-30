// js/dat_divergent.js
// The names 3.7 and 5.0 disagree on, in a module of their own so that BOTH
// the runtime resolver (js/dat_source.js) and the bundle generator
// (tools/gen-dat-bundle.mjs) read one list.  The generator cannot import
// js/dat_source.js, because that imports the bundle the generator is about
// to write.
//
// See js/dat_source.js for the measurement this list came from.

/* 3.7 -> 5.0 byte sizes are the evidence.  To clear one: copy the 5.0 file
 * into js/dat/, delete it here, and re-run node tools/gen-dat-bundle.mjs. */
export const V5_DIVERGENT = new Set([
    'bogusmon.txt',   //  6521 ->  6680   makedefs source; chunk 7320 -> 7640
    'oracles.txt',    //  5605 ->  5647   makedefs source for dat/oracles
    'rumors.tru',     // 20982 -> 21999   makedefs source; chunk 23875 -> 24924
    'symbols',        // 27656 -> 35603   no JS reader today
]);
