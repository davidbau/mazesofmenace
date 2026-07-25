// fastforward.js — the shrinking remainder of seed8000's replayed PRNG stream.
//
// This file is scaffolding, not a port. Every call in it is a literal value
// recorded from ONE session, replayed into every session, so it is exactly the
// thing that cannot generalise to the held-out set. Deleting it is the work;
// each block goes when the C it stands in for is ported.
//
// Gone so far:
//   o_init shuffles + gem colours   -> js/o_init.js        (199 calls)
//   nhlib.lua align shuffle          -> js/mklev.js
//   dungeon.c initialisation         -> js/dungeon.js       (294 calls)
//   mklev structural phase           -> js/mklev.js
//   room fill + mineralize           -> js/mklev.js       (1,448 calls)
//   u_init_role + ini_inv            -> js/u_init.js         (87 calls)
//   init_attr + vary_init_attr       -> js/attrib.js         (37 calls)
//   the per-turn move loop           -> js/allmain.js       (127 calls)
//   u_init_misc's handedness roll    -> js/allmain.js          (1 call)
//
// Remaining, in the order they should go:
//   fastforward_post_mklev    2 calls  <- allmain.c moveloop_preamble
//
// Generated from: seed8000-tourist-starter.session.json

import { rn2, rnd, d, rne, rnz } from "./rng.js";


// Post-mklev startup: allmain.c moveloop_preamble() only.
//
// src/attrib.c init_attr()/rnd_attr()/vary_init_attr() used to be replayed here
// too; they are now produced by the real port in js/attrib.js. 2 leaf calls
// left in this block.
export function fastforward_post_mklev() {
    rnd(9000); rnd(30);
}

