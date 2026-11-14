// src/exper_pure.ts
// @ts-nocheck — sibling imports from hand-maintained js/*.js (no .d.ts yet).
// Literal port of pure-ish functions from nethack-c/src/exper.c, isolated
// from the rest of the engine so they can be exercised by the per-function
//
// Source of truth: nethack-c/src/exper.c
//
// "Pure-ish" because rndexp() consumes the RNG and reads two pieces of
// player state (u.ulevel, u.uexp). We expose those as explicit arguments
// rather than wiring through `game` so equiv-test stays self-contained.
//
// JavaScript Number can't represent the full range of C `long` exactly for
// some of the upper-bound values (mul by 10_000_000 against lev=...) so we
// use BigInt throughout for return values.
import { rn2 } from './rnd.js';
import { clong } from './integer.js';
export { newuexp, rndexp } from './exper.js'; // relocate-fns
