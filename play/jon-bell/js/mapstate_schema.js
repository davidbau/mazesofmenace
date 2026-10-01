// @ts-nocheck
// mapstate_schema.js — single source of truth for the mapstate schema
//
// The first 40 keys (the "build_mapdump core") mirror the non-grid
// portion of nethack-c/src/cmd.c build_mapdump() (lines 296-453), in the
// same insertion order. That is the same set of keys js/mapstate.js's
// replayed through these protocol primitives lines up by name with the
// keys the dev runner already surfaces in firstStateDivergence reports.
//
// Each entry is { key, default }. `default` is the value the table holds
// dump_mapstate(["*"]) and get this exact list back. Defaults reflect
// C zero-init except where C explicitly seeds a non-zero value:
//   - "v"               = "2"     — emitted as `v=2` by build_mapdump.
//   - "phase"           = "turn"  — default `phase` argument; emitted as
//                                   `phase="turn"` (pb_str adds quotes
//                                   only at emit-time — the stored value
//                                   here is the unquoted payload).
//   - "hero.ublesscnt"  = "300"   — u_init.c:1005 sets u.ublesscnt = 300
//                                   (`no prayers just yet`) in
//                                   u_init_misc; everything else memsets
//                                   to zero.
// All other fields default to "0" (C struct zero-init: long fields, char
// fields, boolean flags).
//
// in the same order. Both lists are mechanically mirrored from this file
// and from build_mapdump's body. If you add a key here, add it there too
// (the C-side compile already fails the build if the table length and
// indexed lookups disagree, so drift is caught at build time).
//
// APPEND-ONLY CONVENTION
// ----------------------
// (build_mapdump targets turn-boundary state replay; per-function
// different keys). 13/27 input buckets for u_init_misc were collapsing
// onto the same input hash despite producing different outputs
// (Valkyrie + Wizard look identical in 40-key state but newhp/newpw
// read gu.urole.* which differs).
//
// NEW KEYS GO AT THE END, NEVER INSERTED MID-LIST. Reasoning:
//   - load_mapstate is additive (unknown keys throw, known keys
//     validateSchemaOrder) compares position-by-position against
//     record 0's order. Inserting a key mid-list would mis-position
//     every following key in old records and break dedup of any pre-
//     (g_values[i], g_before[i]). Appending preserves all existing
//     indices; inserting would shift them.
//   - C build_mapdump emit order is fixed by upstream NetHack. New
//     keys are NOT part of build_mapdump's wire format — they're
//     order constraint.
//
// If you genuinely need to reorder the existing 40, that's a separate
// "schema migration" task: bump the schema version, regenerate every
export const MAPSTATE_SCHEMA = Object.freeze([
    // header — build_mapdump cmd.c:296-298
    { key: 'v', default: '2' },
    { key: 'phase', default: 'turn' },
    { key: 'turn', default: '0' },
    // dungeon — cmd.c:299-300
    { key: 'dungeon.dnum', default: '0' },
    { key: 'dungeon.dlevel', default: '0' },
    // hero block — cmd.c:302-326
    { key: 'hero.ux', default: '0' },
    { key: 'hero.uy', default: '0' },
    { key: 'hero.dx', default: '0' },
    { key: 'hero.dy', default: '0' },
    { key: 'hero.dz', default: '0' },
    { key: 'hero.uhp', default: '0' },
    { key: 'hero.uhpmax', default: '0' },
    { key: 'hero.uen', default: '0' },
    { key: 'hero.uenmax', default: '0' },
    { key: 'hero.ulevel', default: '0' },
    { key: 'hero.uac', default: '0' },
    { key: 'hero.uhunger', default: '0' },
    { key: 'hero.uhs', default: '0' },
    { key: 'hero.multi', default: '0' },
    { key: 'hero.context_move', default: '0' },
    { key: 'hero.hero_seq', default: '0' },
    { key: 'hero.umovement', default: '0' },
    { key: 'hero.str', default: '0' },
    { key: 'hero.int', default: '0' },
    { key: 'hero.wis', default: '0' },
    { key: 'hero.dex', default: '0' },
    { key: 'hero.con', default: '0' },
    { key: 'hero.cha', default: '0' },
    { key: 'hero.uluck', default: '0' },
    { key: 'hero.ublesscnt', default: '300' },
    // display block — cmd.c:328-334
    { key: 'display.botl', default: '0' },
    { key: 'display.botlx', default: '0' },
    { key: 'display.time_botl', default: '0' },
    { key: 'display.toplin', default: '0' },
    { key: 'display.inmore', default: '0' },
    // chain counts — cmd.c:337-443 (counts only; per-entry detail not
    // round-tripped through the protocol)
    { key: 'fmon.count', default: '0' },
    { key: 'fobj.count', default: '0' },
    { key: 'invent.count', default: '0' },
    { key: 'traps.count', default: '0' },
    { key: 'stairs.count', default: '0' },
    // gm.migrating_objs / gm.migrating_mons / gm.mydogs, gb.billobjs,
    // go.objs_deleted. The 40-key build_mapdump core is blind to these
    // transfer chains, so a fn whose primary effect is splicing a node onto
    // one of them (obj_delivery, deliver_obj_to_mon, migrate_to_level,
    // keepdogs, losedogs, dobjsfree, discard_migrations, ...) recorded an
    // EMPTY state_after_diff — a state-diff-blind vacuous green (WS10 audit).
    // Counting each chain head makes that mutation observable. Bridge
    // migration fn flips vacuous→red-for-real until its port builds the
    { key: 'migrating_objs.count', default: '0' },
    { key: 'migrating_mons.count', default: '0' },
    { key: 'mydogs.count', default: '0' },
    { key: 'billobjs.count', default: '0' },
    { key: 'objs_deleted.count', default: '0' },
    //
    // role/race/align/gender identifiers read by u_init_misc + its
    // transitive callees (newhp at attrib.c:1086, newpw at exper.c:45,
    // adjabil at attrib.c:1011, max_rank_sz at botl.c:408). None of
    // input-identity inputs, not turn-boundary replay state.
    //
    // role.mnum  = gu.urole.mnum (PM_VALKYRIE=13, PM_WIZARD=14, etc.).
    //              Drives ALL of urole.hpadv / urole.enadv / urole.rank /
    //              urole.initrecord through the const roles[] table.
    //              were hashing identical despite producing 16/12 HP).
    // race.mnum  = gu.urace.mnum (PM_HUMAN=53, PM_ELF=55, etc.). Drives
    //              urace.hpadv / urace.enadv. Race contributes <=4
    //              points of HP/Pw on average; tail-end of false-ND.
    // flags.initrole/initrace/initgend/initalign — the index forms
    //              (0..12 / 0..4 / 0..1 / 0..2). u_init_misc reads
    //              flags.initalign at line 1006; flags.initgend at 949
    //              (assigned into flags.female). The JS port keys off
    //              these (g.flags.init*) rather than urole.mnum, so
    //              both surface for symmetry.
    // flags.female = 0/1 — set by u_init_misc:949 from initgend; not
    //              read by u_init_misc itself but read by callers.
    // uroleplay.blind = 0/1 — u_init_misc:1024 reads u.uroleplay.blind
    //              and conditionally sets HBlinded. None of the 64
    //              function reads, so it belongs in the input vector.
    { key: 'role.mnum', default: '0' },
    { key: 'race.mnum', default: '0' },
    { key: 'flags.initrole', default: '0' },
    { key: 'flags.initrace', default: '0' },
    { key: 'flags.initgend', default: '0' },
    { key: 'flags.initalign', default: '0' },
    { key: 'flags.female', default: '0' },
    { key: 'uroleplay.blind', default: '0' },
    // shared between monster m_id and object o_id allocation.  Including it in
    // makemon/mkobj call fires, disambiguating "ident counter drift" from
    // (NOT in build_mapdump) — same append-only extension pattern as the T5.5
    // JS source: g.context?.ident in mapstate_game_bridge.js.
    { key: 'context.ident', default: '0' },
    // fields set_move_cmd(dir, run) writes (cmd.c:2058). They are the ONLY
    // difference between do_move_<dir> / do_run_<dir> / do_rush_<dir>, whose
    // bodies are otherwise identical, so without them all 24 movement commands
    // share a byte-identical fixture and a run ported as a walk replays CLEAN
    // gap sat directly across the fleet's one score-bearing target.
    // Append-only positional extension, same as the keys above: old fixtures
    // JS source: g.context?.run / g.domove_attempting in
    // mapstate_game_bridge.js.
    { key: 'context.run', default: '0' },
    { key: 'context.forcefight', default: '0' },
    { key: 'domove_attempting', default: '0' },
    // (dig.c reads u.utrap [TT_PIT check] + u.utraptype). trap->tseen landed
    // in V2; these complete the gap. Append-only positional extension — old
    { key: 'hero.utrap', default: '0' },
    { key: 'hero.utraptype', default: '0' },
    // AMAX(i)=u.amax.a[i]). Parallel to hero.str/int/... (ABASE); attribute
    // order. Append-only; old fixtures pad to '0'.
    { key: 'hero.amax_str', default: '0' },
    { key: 'hero.amax_int', default: '0' },
    { key: 'hero.amax_wis', default: '0' },
    { key: 'hero.amax_dex', default: '0' },
    { key: 'hero.amax_con', default: '0' },
    { key: 'hero.amax_cha', default: '0' },
    // draws rn2(19)/rn2(2) ONLY while abs(AEXE(i)) < AVAL(50), so without these
    // an isolated replay always started from BSS-zero, never saturated, and drew
    // where C did not. Append-only; old fixtures pad to '0'.
    // NOTE these are in C's A_* order (A_STR=0 .. A_CHA=5), NOT the DISPLAY
    // order the hero.amax_*/attribute keys above use — js/attrib.js's
    // exercise(i) indexes u.aexe.a directly by the C constant.
    { key: 'hero.aexe_str', default: '0' },
    { key: 'hero.aexe_int', default: '0' },
    { key: 'hero.aexe_wis', default: '0' },
    { key: 'hero.aexe_dex', default: '0' },
    { key: 'hero.aexe_con', default: '0' },
    { key: 'hero.aexe_cha', default: '0' },
    // ATEMP(x)=u.atemp.a[x], ABON(x)=u.abon.a[x]). acurr(x) is
    // replay computed acurr(A_DEX) from ABASE alone while C's ATEMP(A_DEX) is -1
    // whenever Wounded_legs is active (do.c:2435/2452, its only writers) —
    // mhitm_ad_legs rnd(50) vs rnd(49) on the mhitm_adtyping/mattacku boards.
    // Same DISPLAY-order slot mapping as hero.amax_* (js/attrib.js's acurr()
    // reads u.atemp.a/u.abon.a via C_ATTR_TO_DISP). Append-only; old fixtures
    // pad to '0'.
    { key: 'hero.atemp_str', default: '0' },
    { key: 'hero.atemp_int', default: '0' },
    { key: 'hero.atemp_wis', default: '0' },
    { key: 'hero.atemp_dex', default: '0' },
    { key: 'hero.atemp_con', default: '0' },
    { key: 'hero.atemp_cha', default: '0' },
    { key: 'hero.abon_str', default: '0' },
    { key: 'hero.abon_int', default: '0' },
    { key: 'hero.abon_wis', default: '0' },
    { key: 'hero.abon_dex', default: '0' },
    { key: 'hero.abon_con', default: '0' },
    { key: 'hero.abon_cha', default: '0' },
    // always took the wrong arm). pickup_types is a char[MAXOCLASSES] STRING.
    { key: 'flags.pickup', default: '0' },
    { key: 'flags.pickup_thrown', default: '0' },
    { key: 'flags.pickup_stolen', default: '0' },
    { key: 'flags.nopick_dropped', default: '0' },
    { key: 'flags.mention_decor', default: '0' },
    { key: 'flags.verbose', default: '0' },
    { key: 'flags.showexp', default: '0' },
    { key: 'flags.debug', default: '0' },
    { key: 'hero.uswallow', default: '0' },
    { key: 'hero.ugangr', default: '0' },
    { key: 'hero.ulycn', default: '0' },
    { key: 'flags.showscore', default: '0' },
    { key: 'flags.pickup_burden', default: '0' },
    { key: 'flags.sortloot', default: '0' },
    { key: 'flags.pickup_types', default: '' },
    // u.ualign.type (schar: A_CHAOTIC=-1/A_NEUTRAL=0/A_LAWFUL=1) and
    // u.ualign.record (int: piety). Append-only; old fixtures pad to '0'.
    { key: 'hero.ualign_type',   default: '0' },
    { key: 'hero.ualign_record', default: '0' },
    // Read by unpaid_cost (shk.c:3285) to iterate shops. Empty string = not in shop.
    { key: 'hero.ushops',        default: '' },
    // and u.uz0 (d_level {dnum,dlevel}, marshalled as two scalars). Read
    // unconditionally by spoteffects (hack.c:3262 levl[u.ux0][u.uy0].typ +
    // on_level(&u.uz,&u.uz0)) and the prev-position consumer class
    // (u_left_shop, u_entered_shop, teleds, domove_*, m_postmove_effect, ...).
    // Append-only; old fixtures pad to '0'.
    { key: 'hero.ux0',        default: '0' },
    { key: 'hero.uy0',        default: '0' },
    { key: 'hero.uz0_dnum',   default: '0' },
    { key: 'hero.uz0_dlevel', default: '0' },
    // (overexert_hp/losehp `Upolyd ? u.mh : u.uhp` readers, the #monster
    // domonability family). hero.umonnum = u.umonnum (you.h:412, current
    // monster number); hero.upolyd = the you.h:547 macro (u.umonnum !=
    // u.umonster) sampled as 0/1; hero.umh/umhmax = u.mh/u.mhmax (you.h:414,
    // hit points while polymorphed). Append-only; old fixtures pad to '0'.
    { key: 'hero.umonnum',    default: '0' },
    { key: 'hero.upolyd',     default: '0' },
    { key: 'hero.umh',        default: '0' },
    { key: 'hero.umhmax',     default: '0' },
    // sampled 0/1 — the pointer value itself is unportable). The dotrap
    // SQKY_BOARD falsifier discriminator: stop_occupation()/nomul(0) fire on
    // an active occupation even when multi==0 (allmain.c:755-767). JS slot is
    // g.occupation truthiness (js/mapstate_game_bridge.js). Append-only; old
    // fixtures pad to '0'.
    { key: 'hero.occupation', default: '0' },
    // (more_experienced, exper.c:169), gu.unweapon (setuwep, wield.c:100),
    // u.twoweap (set_twoweap), u.uinwater (set_uinwater). Append-only at the
    // END — old fixtures pad to '0'; 3-mirror with SCHEMA/SETTERS in
    { key: 'hero.uexp', default: '0' },
    { key: 'hero.urexp', default: '0' },
    { key: 'hero.unweapon', default: '0' },
    { key: 'hero.twoweap', default: '0' },
    { key: 'hero.uinwater', default: '0' },
    // a plain scalar, so it is carried as the stable m_id of the monster u is
    // uhitm.c's attack_checks() opens with
    //   if (engulfing_u(mtmp)) return FALSE;   /* u.uswallow && u.ustuck==mtmp */
    // consuming ZERO RNG, and without this key an isolated do_attack/mattacku
    // replay always read game.u.ustuck === undefined, so that short-circuit
    // could never fire even though js/uhitm.js:1224 (`u.ustuck === mtmp`) is
    // (u.ustuck ? u.ustuck->m_id : -1). JS resolution: the bridge cannot
    // resolve an m_id to a live fmon-chain reference at apply time (fmon is
    // seeded AFTER applyMapstateToGame -- see
    // round-trips through the real game.u.ustuck slot once resolved (same
    // hero.hero_seq exception as above), or a __bridge__ placeholder before
    // that. Append-only; old fixtures pad to '-1' (no monster).
    { key: 'hero.ustuck_m_id', default: '-1' },
    // as hero.ustuck_m_id above): two more hero scalars the port reads
    // production slots game.u.usleep / game.u.uinvulnerable), so a direct
    // numSlot bridge mapping, not a deferred m_id resolution.
    //     unmul's trampoline only; every other trampoline (mattacku
    //     included) never carried it.
    //     returns FALSE before the attack loop starts, consuming zero RNG.
    //     incubus/succubus fix (main bd1963429) making the attack loop run
    //     for real on records that used to no-op on an empty attack row.
    { key: 'hero.usleep', default: '0' },
    { key: 'hero.uinvulnerable', default: '0' },
    // (decl.h:536), the rolling invlet cursor assigninvlet (invent.c:721-731)
    // scans FROM. Real slot: game._lastinvnr, read by every assigninvlet port
    // (js/hold_another_object.js, pickup_container.js, wizcmds.js, u_init.js)
    // replayed addinv guessed the cursor: 4 of 5 residuals were invlet exp
    // 107..110 got 100 on identical free-letter sets. Appended at the END
    // (4-mirror: patch 010 SCHEMA + SETTERS, bridge SLOTS).
    { key: 'hero.lastinvnr', default: '0' },
    // sounds.c:206 `Deaf || !flags.acoustics || ...` (dosounds), dokick.c's
    // `(Deaf && !Unaware) || !flags.acoustics`, mhitu.c. Deaf's HDeaf/EDeaf
    // half rides the "uprops" side-channel (index DEAF=16); these two were
    // suffix, not SCHEMA[] entries). 4-mirror: patch 010 getter+SCHEMA+setter+
    // SETTERS, js/mapstate_game_bridge.js SLOTS.
    { key: 'uroleplay.deaf', default: '0' },
    { key: 'flags.acoustics', default: '1' },
    // menu_requested -- the 'm' command prefix (cmd.c do_reqmenu sets it
    // nowhere, so every 'm'-prefixed doeat replayed onto the prompt path C
    // slot: game.iflags.menu_requested (boolSlot). Appended at the END of
    // the C SCHEMA order, after flags.acoustics. 4-mirror: patch 010
    // getter+SCHEMA+setter+SETTERS, js/mapstate_game_bridge.js SLOTS.
    { key: 'iflags.menu_requested', default: '0' },
    // (gr.rect_cnt) and the four coordinates of the rectangle C returned.
    // rect.cnt is a REAL slot (game.rect_cnt, js/rect.js); rect.ret.* are
    // return descriptors compared under pointer-identity and round-trip
    // through __bridge__ placeholders. Append-only; old fixtures pad to 0.
    { key: 'rect.cnt', default: '0' },
    { key: 'rect.ret.lx', default: '0' },
    { key: 'rect.ret.ly', default: '0' },
    { key: 'rect.ret.hx', default: '0' },
    { key: 'rect.ret.hy', default: '0' },
]);
export const MAPSTATE_KEYS = Object.freeze(MAPSTATE_SCHEMA.map(e => e.key));
// Compile a shell-glob into a RegExp anchored at both ends. Supports:
//   *  any run of characters (including dots — same as `find -name`)
//   ?  one character
// All other regex metacharacters in the input are escaped. This is the
// minimum needed for the protocol's documented use case
// (`["hero.*", "u.*"]`); we explicitly do NOT support character classes
// or brace alternation — keep one parser, keep it tiny.
export function globToRegExp(glob) {
    let re = '^';
    for (let i = 0; i < glob.length; i++) {
        const c = glob[i];
        if (c === '*')
            re += '.*';
        else if (c === '?')
            re += '.';
        else
            re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
    re += '$';
    return new RegExp(re);
}
// Expand an array of glob patterns to the matching schema keys, in
// schema-insertion order, deduped. Used by both the dump_mapstate JS
export function expandGlobs(globs) {
    if (!Array.isArray(globs) || globs.length === 0)
        return [];
    const regexps = globs.map(globToRegExp);
    const out = [];
    const seen = new Set();
    for (const key of MAPSTATE_KEYS) {
        for (const re of regexps) {
            if (re.test(key)) {
                if (!seen.has(key)) {
                    seen.add(key);
                    out.push(key);
                }
                break;
            }
        }
    }
    return out;
}
