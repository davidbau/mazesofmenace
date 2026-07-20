// fastforward.js — Auto-generated RNG replay for seed8000 starter session.
// Split into pre-mklev and post-mklev phases.
// The mklev RNG calls are now consumed by the real mklev.js implementation.
//
// Generated from: seed8000-tourist-starter.session.json

// Pre-mklev: peeled — real init_dungeons (dungeon.js) + u_init_misc (u_init.js)
export function fastforward_pre_mklev() {
    /* deleted — dungeon topology + castle tune + handedness now run for real */
}

// Post-mklev startup: peeled — real u_init_inventory_attrs + moveloop_preamble
export function fastforward_post_mklev() {
    /* deleted — u_init / attrib / moveloop_preamble now run for real */
}

// Per-step leaf RNG calls — peeled: real moveloop / m_move / mcalcmove path
export function fastforward_step(_stepNum) {
    /* deleted — end-of-turn RNG now runs in allmain.moveloop_core */
}
// Fill + mineralize: peeled — real path in mklev.js makelevel/level_finalize_topology
export function fastforward_fill_mineralize() {
    /* deleted — fill_ordinary_room + mineralize now run for real */
}
