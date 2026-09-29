// js/dat_source.js
// The ONE place the port resolves a `dat/<name>` file at runtime.
//
// WHY THIS EXISTS
// ---------------
// `nethack-c/` is the NetHack 3.7 reference tree.  The contest has scored
// NetHack 5.0.0_Release since 2026-08-10, and its tree is
// `nethack-c-v5/upstream` — which is GITIGNORED (.gitignore:183), so the
// judge's checkout does not have it.  A runtime read therefore cannot simply
// be repointed at the 5.0 tree: doing so would read 5.0 on a dev box and 3.7
// at the judge, which is the worst of the three options because it makes a
// local test pass and the remote one fail.
//
// The only tracked source of 5.0 dat content is `js/dat/`, which already
// vendors `history` and `opthelp` for exactly this reason.  So:
//
//     js/dat/<name>          the tracked 5.0 override, when we have vendored it
//     nethack-c/dat/<name>   3.7 — correct ONLY where the trees agree
//
// and the second root is ALLOWED only for names where 3.7 and 5.0 are the same
// bytes.  `V5_DIVERGENT` below is that guard, as data rather than as a comment.
//
// THE MEASUREMENT (2026-08-13)
// ----------------------------
// Diffed nethack-c/dat against nethack-c-v5/upstream/dat, then counted the
// runtime reads across all 44 public sessions under frozen/ps_test_runner.mjs.
//
// A NOTE ON HOW, because the first attempt was wrong.  Patching
// `fs.readFileSync` from a NODE_OPTIONS=--import module DOES catch
// js/dispfile.js's reads but SILENTLY MISSES js/sp_lev.js's — it reported the
// level loader as never reached, when in fact it runs 25 times.  A green
// instrument measuring nothing is the failure mode CLAUDE.md warns about, so
// the numbers below come from an appendFileSync counter written into the
// function bodies themselves and diffed across both revisions, not from an fs
// patch.
//
// 21 dat files differ between the trees.  NINE of them differ ONLY in a
// version banner or a comment line — `# NetHack 3.7` -> `# NetHack 5.0`,
// `-- 3.7.0: minend changed...` -> `-- 5.0.0: ...` — in files whose readers
// drop comments (makedefs' `#` lines; Lua's `--`).  Those nine are inert and
// are deliberately NOT listed below: GENFILES, data.base, dungeon.lua,
// engrave.txt, epitaph.txt, hellfill.lua, luahelper, minetn-1.lua, tribute.
//
// The other TWELVE differ in content, and are the list.
//
// What the corpus actually reads at runtime is far narrower than that static
// upper bound.  js/dispfile.js is reached by ONE session of 44 (seed2200) and
// asks only for history (vendored 5.0) and help/hh/license/optmenu/usagehlp
// (byte-identical).  js/data_base.js reads data.base (banner-only diff).
//
// js/sp_lev.js's level loader IS live — 13 of the 44 sessions, 25 calls — but
// every name it asks for is a file the two trees agree on:
//
//     minefill.lua x4   oracle.lua x3   hellfill.lua x3   valley.lua x2
//     tut-1.lua x2      bigrm-{2,4,7,8,9,12}.lua          Arc-strt.lua
//     Bar-strt.lua
//
// (hellfill.lua is in the banner-only group; the other twelve are `cmp`-equal.)
//
// So NOT ONE of the twelve content-differing files is read today, and this
// file is worth 0 step points as it stands — no session enters Sokoban.  It is
// still worth closing, and more so than "latent" suggests: the loader is not
// dead code waiting to be admitted, it runs on a quarter of the corpus.  5.0
// adds a rolling boulder trap to soko1-1, so the first recording that descends
// into Sokoban would silently desync the RNG on arrival.

/* The dat files whose CONTENT differs between NetHack 3.7 and 5.0, with the
 * 3.7 -> 5.0 byte sizes as the evidence.  Serving any of these out of
 * nethack-c/dat means running the port on 3.7 data.
 *
 * To clear one: copy the 5.0 file into js/dat/ (tracked, so the judge's
 * checkout gets it) and delete it from this set. */
export const V5_DIVERGENT = new Set([
    'bogusmon.txt',   //  6521 ->  6680   makedefs source; chunk 7320 -> 7640
    'oracles.txt',    //  5605 ->  5647   makedefs source for dat/oracles
    'rumors.tru',     // 20982 -> 21999   makedefs source; chunk 23875 -> 24924
    'symbols',        // 27656 -> 35603   no JS reader today
]);

/* The tracked 5.0 overrides, then the 3.7 tree.  Returns a path (string or
 * URL) that readFileSync accepts, or throws if the only candidate left is a
 * 3.7 file we know to be wrong.
 *
 * Resolution is two-step the way js/data_base.js and js/dispfile.js already
 * do it: cwd-relative first (the repo root, for every runner in this project),
 * then relative to this module so a runner started elsewhere still finds dat/.
 * `probe` is injected rather than imported so this module stays free of a
 * hard dependency on node:fs for callers that already have one. */
export function resolve_dat(fname, probe) {
    for (const rel of [`js/dat/${fname}`, `nethack-c/dat/${fname}`]) {
        if (!probe(rel))
            continue;
        if (rel.startsWith('nethack-c/') && V5_DIVERGENT.has(fname))
            break;   /* 3.7 content we know is wrong — fall through to the throw */
        return rel;
    }
    for (const own of [new URL(`./dat/${fname}`, import.meta.url),
                       new URL(`../nethack-c/dat/${fname}`, import.meta.url)]) {
        if (!probe(own))
            continue;
        if (String(own).includes('/nethack-c/') && V5_DIVERGENT.has(fname))
            break;
        return own;
    }
    if (V5_DIVERGENT.has(fname))
        throw new Error(
            `dat/${fname} differs between NetHack 3.7 and 5.0 and has not been `
            + `vendored: nethack-c/dat holds the 3.7 content and the contest scores `
            + `5.0.  Copy nethack-c-v5/upstream/dat/${fname} to js/dat/${fname} `
            + `(js/dat is tracked; nethack-c-v5/upstream is gitignored, so the `
            + `judge's checkout only sees js/dat) and remove it from V5_DIVERGENT `
            + `in js/dat_source.js.`);
    return null;
}
