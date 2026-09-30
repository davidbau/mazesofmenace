// @ts-nocheck
// fastforward.js — Auto-generated RNG replay for seed8000 starter session.
// Split into pre-mklev and post-mklev phases.
// The mklev RNG calls are now consumed by the real mklev.js implementation.
//
// Generated from: seed8000-tourist-starter.session.json
import { rn2, rnd, d, rn1, rnl, pushRngLogEntry } from "./rng.js";
import { dochug, m_canseeu } from "./dochug.js";
import monsPack from "./makemon_mons.json" with { type: "json" };
import { gethungry, morehungry, opentin } from "./eat.js";
import { make_confused, make_stunned, vomit, cantvomit } from "./potion.js";
import { age_spells } from "./spell.js";
import { exerchk, exercise, acurr } from "./attrib.js";
import { overexert_hp } from "./uhitm.js";
import { t_at, registerTrapMksobj, m_dowear } from "./trap.js";
import { newsym, feel_location, feel_newsym, pline, flush_screen, _topl_merge_result, _topl_joins_snapshot, _topline_more_pending, You_hear } from "./display.js";
/* Runtime-only edge, same rule as the allmain/monmove/mklev imports below:
 * end.js does not import this module, so the cycle is one-directional and
 * do_death_sequence is only ever REFERENCED at call time. */
import { do_death_sequence } from "./end.js";
import { TIMEOUT, JUMPING, FROMOUTSIDE, REGENERATION, SLEEPY, MAGICAL_BREATHING, HALF_PHDAM, DEAF, VOMITING, CONFUSION, STUNNED, FAINTING, A_WIS, A_CON, A_DEX, MOD_ENCUMBER, EXT_ENCUMBER, MAXULEV, M_AP_TYPE, M_AP_FURNITURE, M_AP_OBJECT, VAULT, ANY_SHOP, ZOO, MORGUE, NECK, HEAD, HAIR, ROOMOFFSET, HALLUC, HALLUC_RES, WM_MASK, D_NODOOR, D_CLOSED, D_LOCKED, Is_rogue_level, Is_oracle_level, Upolyd, Is_waterlevel } from "./const.js";
import { is_pool } from "./look.js";
import { can_reach_floor } from "./hold_another_object.js";
/* nomul: C detect.c:2049/2058 calls it from dosearch0 when a hidden door or
 * passage is found (hack.c:4068).  allmain.js does not import fastforward.js
 * back through this edge at module-init time, and nomul is a hoisted function
 * declaration called only at runtime, so this cycle resolves. */
import { nomul, stop_occupation, interrupt_multi, night } from "./allmain.js";
import { obj_here, pooleffects_breathless, body_part, check_leash, cmdq_clear } from "./cmd.js";
import { vtense } from "./objnam.js";
import { rehumanize, polyself, set_uasmon } from "./polyself.js";
import { you_were } from "./were.js";
import { tele, next_to_u } from "./teleport.js";
import { TELEPORT, POLYMORPH, UNCHANGING, NON_PM, POLY_NOFLAGS, CQ_CANNED, CQ_REPEAT, ismnum } from "./const.js";
import { search_special } from "./mkroom.js";
/* C ref: mon.c:1230 — movemon_singlemon calls monmove.c's m_everyturn_effect
 * for every live monster.  Same runtime-only-reference cycle rule as nomul
 * above (monmove.js does not import fastforward.js at module-init time). */
import { m_everyturn_effect, dochugw } from "./monmove.js";
/* C ref: mon.c:1285 — movemon_singlemon's hider re-hide roll. Same
 * runtime-only-reference cycle rule as the imports above. */
import { restrap, mcalcdistress, hideunder as hideunder_ff, get_iter_mons } from "./mklev.js";
/* C ref: mon.c:2487 dmonsfree() — end-of-movemon purge of dead-but-linked
 * (MON_DETACH / mhp<1, non-guard) monsters from fmon.  mkmaze.js does not
 * import fastforward.js, so this static edge introduces no cycle (same rule
 * as the mklev/monmove imports above). */
import { dmonsfree } from "./mkmaze.js";
import { vision_recalc } from "./vision.js";
import { any_light_source } from "./light.js";
/* C prop.h:44 I_SPECIAL — mon.c:1269 borrows the bit in misc_worn_check as the
 * "re-check worn gear next turn" flag (check_gear_next_turn, mon.c:5903). */
const I_SPECIAL_FF = 0x20000000;
/* C hack.h dist2(x0,y0,x1,y1). */
function _dist2_ff(x0, y0, x1, y1) {
    const dx = x0 - x1, dy = y0 - y1;
    return dx * dx + dy * dy;
}
import { canseemon as canseemon_ff } from "./display.js";
/* C defsym.h:362 MONSYM(57, ';', EEL, S_EEL, "sea monster") — the same 57 that
 * js/monmove.js:2511 and js/mklev.js hideunder() already carry. */
const S_EEL_FF_MV = 57;
/* C mondata.h m_next2u(mon) — dist2(mon, hero) <= 2, i.e. adjacent-or-on-top.
 * Same one-liner js/makemon.js:3724 uses. */
function _m_next2u_ff(mon) {
    const u = game.u || {};
    const dx = (mon.mx | 0) - (u.ux | 0), dy = (mon.my | 0) - (u.uy | 0);
    return (dx * dx + dy * dy) <= 2;
}
import { gd_sound, vault_occupied, invault } from "./vault.js";
import { consumeDungeonInitRng } from "./dungeon_rng.js";
import { consumeQuestNemesisGenderRng, consumeRolePantheonPickRng, ROLE_HAS_LGOD, } from "./role_init_rng.js";
import { NUM_ROLES, resolveRandomChargenInit, role_init, ROLE_GODS } from "./roles.js";
import { consumeUInitMiscHeroInitRng } from "./exper.js";
import { randomize_gem_colors, init_objects, shuffle_all } from "./o_init.js";
import { u_init_inventory_attrs } from "./u_init.js";
import { mksobj, mkobj, makemon, place_object, make_corpse, wake_nearto, minliquid } from "./mklev.js";
/* dosounds()'s shop branch (sounds.c:313-329) needs tended_shop/inhishop, which
 * live in js/shk.js.  shk.js does not import this module, so the edge is safe;
 * the indirect shk.js -> cmd.js -> fastforward.js cycle resolves the same way
 * the existing allmain.js/monmove.js edges above do — the bindings are only
 * dereferenced at call time, never at module-init time. */
import { tended_shop, inhishop } from "./shk.js";
import { game } from "./gstate.js";
import { fightm } from "./dogmove.js";
/* C macro Conflict (youprop.h:218) := HConflict || EConflict, i.e.
 * u.uprops[CONFLICT].{intrinsic,extrinsic}.  Same reader js/monmove.js
 * _conflict_mv() and js/dogmove.js _conflict_dm() use. */
function _conflict_ff() {
    const p = game.u?.uprops?.[CONFLICT_FF];
    return !!(p && (p.intrinsic || p.extrinsic));
}
import { cansee as cansee_ff, recalc_block_point, unblock_point } from "./vision.js";
import { BOLT_LIM as BOLT_LIM_FF, CONFLICT as CONFLICT_FF } from "./const.js";
import { near_capacity } from "./weight.js";
import { settrack } from "./track.js";
import { depth as dungeon_depth, dist2 as dist2_ff } from "./hacklib.js";

/* C ref: allmain.c:160-168 maybe_generate_rnd_mon()
 *     if (!rn2(u.uevent.udemigod ? 25
 *              : (depth(&u.uz) > depth(&stronghold_level)) ? 50
 *              : 70))
 *         (void) makemon((struct permonst *) 0, 0, 0, NO_MM_FLAGS);
 * The modulus was hardcoded 70 at all three JS call sites — the shallow,
 * pre-castle value.  Below the stronghold C halves it to 50 and once the hero
 * is a demigod to 25, so every session that gets past Dlvl ~29 was drawing
 * from the wrong distribution ON EVERY TURN.  Measured on seed0360 at Dlvl 47
 * (first RNG divergence leaf 41768, C rn2(50) vs JS rn2(70)).
 * game.stronghold_level is written by js/dungeon_rng.js:583 during dungeon
 * init and is {dnum:0, dlevel:29} in a normal game (probed at runtime), so the
 * shallow arm is unchanged: depth 1 is not > depth 29. */
async function maybe_generate_rnd_mon() {
    const u = game.u;
    const sl = game.stronghold_level;
    const modulus = u?.uevent?.udemigod ? 25
        : (sl && dungeon_depth(u?.uz) > dungeon_depth(sl)) ? 50
            : 70;
    if (!rn2(modulus))
        await makemon(null, 0, 0, 0);
}
import { nhlib_com_pager_rng } from "./nhlib.js";
import { ENV } from './hostenv.js';
/* C ref: nethack-c-v5/upstream/src/role.c roles[] [lgod, ngod, cgod].  The
 * table itself now lives with roles[] in js/roles.js (ROLE_GODS) so role_init()
 * and this legacy replay arm cannot drift apart. */
const ROLE_GODS_FF = ROLE_GODS;
/**
 * C ref: role.c:2063-2085 — populate urole.lgod/ngod/cgod from the pantheon role,
 * then store on game.u for display by com_pager_legacy (questpgr.c convert_arg 'd').
 * Called after all roleInitRng has been consumed, so the PRNG is already advanced past
 * the pantheon randrole() picks.  pantheon is the final role index chosen.
 */
function applyPantheonGods(initrole, pantheon) {
    const g = game;
    if (initrole < 0 || initrole >= NUM_ROLES) return;
    const effectivePantheon = (pantheon >= 0 && pantheon < NUM_ROLES) ? pantheon : initrole;
    g.flags = g.flags || {};
    g.flags.pantheon = effectivePantheon;
    g.u = g.u || {};
    /* C ref: role.c:2078-2083 — gu.urole.lgod/ngod/cgod always carry the hero's
     * OWN role gods (roles[].lgod copied when the role struct was assigned); the
     * `if (!gu.urole.lgod)` borrow only fires for Priest (roles[].lgod == null),
     * which then copies the pantheon role's gods.  Mirror both: a role with its
     * own gods stores them directly; a god-less role (Priest) borrows the
     * pantheon's.  These feed align_gname() (cmd.js) for prayer/altar deity text. */
    const roleGods = ROLE_GODS_FF[initrole];
    const gods = (roleGods && roleGods[0] !== null)
        ? roleGods                          /* own gods (Sam: Amaterasu/Raijin/Susanowo) */
        : ROLE_GODS_FF[effectivePantheon];  /* Priest: borrow pantheon */
    if (!gods) return;
    g.u.lgod = gods[0];
    g.u.ngod = gods[1];
    g.u.cgod = gods[2];
}
// Pre-mklev startup: o_init shuffles, dungeon init, u_init_misc
// 303 leaf RNG calls (session indices 0-308)
/** @param {number} [initrole] C roles[] index from OPTIONS (for role_init RNG).
 *  @param {number} [initrace] C races[] index from OPTIONS (newhp/newpw in u_init_misc). */
export async function fastforward_pre_mklev(initrole = -1, initrace = -1) {
    /* Random-role chargen: the role/race/align were unspecified by OPTIONS
     * (initrole < 0) AND the C trace shows role_init() actually ran — i.e. it
     * captured the randrole_filtered/randrace/randalign RNG into _roleInitRng.
     * A chargen-INCOMPLETE session (e.g. seed1300, player quit before the game
     * started) has initrole < 0 but an EMPTY _roleInitRng (role_init never ran);
     * for those we must NOT resolve a role — u_init_misc()'s initrole<0 bail is
     * the correct behaviour there (C never called u_init_misc either). */
    const roleInitRngList = Array.isArray(game._roleInitRng) ? game._roleInitRng : null;
    const roleWasRandom = (initrole < 0) && roleInitRngList != null && roleInitRngList.length > 0;
    // randomize_gem_colors — now called via real function (o_init.ts)
    randomize_gem_colors();
    // shuffle_all() — C o_init.c:230,320-347.  The REAL Fisher-Yates description
    // shuffle.  Fires the identical rn2 sequence the old discard stub fired
    // (rn2(11..1), rn2(25..1), rn2(28..1), rn2(41..1)x2, rn2(28..1), then VENOM
    // rn2(2..1), helm/gloves/cloak rn2(4..1), boots rn2(7..1)) but now APPLIES
    // the permutation, populating game._objDescriptions so getObjDescr() returns
    // the real shuffled appearances (objnam.js).  RNG count/order unchanged.
    shuffle_all();
    // init_objects — C o_init.c:234: objects[WAN_NOTHING].oc_dir = rn2(2) ? NODIR : IMMEDIATE
    init_objects();
    /* role_init() RNG: nemesis gender + pantheon randrole. When game._roleInitRng is set
       (extracted from session trace by gameFromSession), replay it directly for exact
       parity. Otherwise fall back to initrole-derived computation (seed8000 path).
       C ref: role.c:2063-2083 — pantheon selected here; god names copied to urole. */
    const roleInitRng = game._roleInitRng;
    let pantheonResult = initrole; /* default: own pantheon (has lgod) */
    if (roleInitRng == null) {
        /* THE REAL PORT (v5 runSegment path).  C ref: allmain.c:785-787 —
         *     flags.pantheon = -1;  role_init();
         * runs here, after init_objects() and before init_dungeons().  There is
         * no recorded trace to scaffold from under the v5 contract, so run the
         * whole of role.c:1980-2090: facet resolution (randrole_filtered /
         * randrace / randalign for anything chargen left unset), the quest
         * leader and nemesis ambiguous-gender rn2(100) rolls, the Priest
         * pantheon reroll loop, and the lgod/ngod/cgod copy.  role_init() also
         * assigns gu.urole/gu.urace with their real mnum (a PM_ index), which
         * u_init_misc()'s set_uasmon() needs for racial infravision.
         *
         * The three leaves below (resolveRandomChargenInit /
         * consumeQuestNemesisGenderRng / consumeRolePantheonPickRng) are the
         * decomposed stand-ins this replaces; they survive only on the legacy
         * trace-replay arm. */
        game.flags = game.flags || {};
        game.flags.pantheon = -1;
        role_init();
        initrole = (game.flags?.initrole ?? -1) | 0;
        initrace = (game.flags?.initrace ?? -1) | 0;
        /* role_init() already published the gods; skip applyPantheonGods. */
        pantheonResult = -1;
    }
    else if (roleWasRandom) {
        /* LEGACY gameFromSession() path, non-interactive random chargen (fuzz
         * corpus / AFL recorder, OPTIONS with a random facet).  C role_init()
         * resolves the unspecified role/race/gender/alignment HERE — after
         * init_objects(), before the nemesis-gender + pantheon picks
         * (role.c:1991-2069).  We resolve them live (consuming the same
         * randrole_filtered rn2(13) / randrace rn2(300) / randalign rn2(1)
         * calls the recorder logged) and STORE the resolved indices in g.flags
         * so u_init_misc()/newpw()/ini_inv()/pet_type() see a valid role
         * instead of -1.
         * C ref: role.c:1991-2020 (resolveRandomChargenInit). */
        resolveRandomChargenInit(game);
        initrole = (game.flags?.initrole ?? -1) | 0;
        initrace = (game.flags?.initrace ?? -1) | 0;
        /* C ref: role.c:2050-2061 nemesis gender (rn2(100) for Arch/Wiz), then
         * role.c:2063-2069 pantheon randrole loop (Priest only).  Both fire AFTER
         * facet resolution; run them live now that initrole is valid. */
        consumeQuestNemesisGenderRng(initrole);
        pantheonResult = consumeRolePantheonPickRng(initrole);
    }
    else {
        /* Simulate the C pantheon-pick loop while consuming the same RNG values.
         * Nemesis-gender calls are rn2(100); pantheon-pick calls are rn2(NUM_ROLES).
         * For roles with lgod (non-Priest): no pantheon rn2 calls present.
         * For Priest: consecutive rn2(NUM_ROLES) until a role-with-lgod is found. */
        let simPantheon = initrole;
        let simTrycnt = 0;
        for (const { fn, n } of roleInitRng) {
            if (fn === 'rn2') {
                const result = rn2(n);
                if (n === NUM_ROLES && !ROLE_HAS_LGOD[simPantheon] && simTrycnt < 100) {
                    simPantheon = result;
                    simTrycnt++;
                }
            }
            else if (fn === 'rnd')
                rnd(n);
            else if (fn === 'd')
                d(n);
        }
        pantheonResult = simPantheon;
    }
    /* C ref: role.c:2079-2083 — copy gods to urole when !urole.lgod (i.e. Priest).
     * Skipped on the role_init() arm, which published the gods itself. */
    if (pantheonResult >= 0)
        applyPantheonGods(initrole, pantheonResult);
    /* init_dungeons: nhl_init loads nhlib.lua top-level shuffle(align) */
    rn2(3);
    rn2(2);
    // init_dungeons(...) — RNG from dungeon.lua (debug/wizard skips chance rolls like C wizard macro)
    consumeDungeonInitRng();
    // C ref: dungeon.c:1111 init_castle_tune() — svt.tune[i] = 'A' + rn2(7) for
    // i in 0..4; tune[5] = 0.  Store the tune so print_dungeon's Is_stronghold
    // branch can render " (tune <svt.tune>)" on the castle line.
    {
        let tune = '';
        for (let i = 0; i < 5; i++)
            tune += String.fromCharCode('A'.charCodeAt(0) + rn2(7));
        game._tune = tune;
    }
    // u_init_misc ? newhp()/newpw() at u.ulevel==0 then handedness rn2(10) (u_init.c:996?1028)
    await consumeUInitMiscHeroInitRng(initrole, initrace);
    /* l_nhcore_init() nhlib shuffle(rn2(3),rn2(2)) — consumed only by real
     * l_nhcore_init() in allmain.js / rng-trace.mjs (not replayed here; C has one call). */
}
// Post-mklev startup: u_init_role, ini_inv, attributes, moveloop_preamble
// Inventory creation delegates to the actual shared startup phase.
/** @param {number} [initrole] C roles[] index from OPTIONS */
export async function fastforward_post_mklev(initrole = -1) {
    // The actual C-shaped inventory phase owns role money, moves and objects.
    /* Register mksobj for trap.js missile traps (t_missile → mksobj).
     * Also register place_object so thitm() can drop a missed missile onto the
     * floor (C trap.c:6747-6750 place_object + stackobj on miss), and make_corpse
     * so a trap-killed monster (monkilled_trap → corpse_chance + make_corpse)
     * drops its cadaver with the correct creation RNG. */
    registerTrapMksobj(mksobj, place_object, make_corpse);
    await u_init_inventory_attrs();
    /* C ref: allmain.c newgame():911-913 — if (flags.legacy) com_pager(...)
     * com_pager_core (questpgr.c:487) calls nhl_init() which loads nhlib.lua fresh,
     * running the module-level shuffle(align) at nhlib.lua:25: rn2(3) then rn2(2).
     * flags.legacy defaults TRUE; sessions with OPTIONS=!legacy (e.g. seed8000) skip this. */
    if (game.flags?.legacy !== false)
        nhlib_com_pager_rng();
    rnd(9000);
    /* C ref: allmain.c:82 moveloop_preamble — svc.context.seer_turn = (long) rnd(30);
     * Initialise seer_turn from rnd(30) (1..30) consumed here; store on g.context
     * so the seer_turn check in moveloop_core can compare svm.moves >= seer_turn. */
    const seerInit = rnd(30);
    game.context = game.context || {};
    game.context.seer_turn = seerInit;
    /* C ref: allmain.c:849 moveloop_preamble — svc.context.tribute.enabled = TRUE.
     * Unconditionally enable 3.6 tribute so stock_room fires rnd(stockcount) for
     * the specialspot before the item-placement loop (C shknam.c:768-778). */
    game.context.tribute = game.context.tribute || {};
    game.context.tribute.enabled = true;
    /* C ref: allmain.c:85 moveloop_preamble — u.umovement = NORMAL_SPEED for new game.
     * C comment: "give hero initial movement points; new game only".
     * u_init.js sets u.umovement=0 (the post_init value before moveloop_preamble runs);
     * we set it to NORMAL_SPEED here to match C's running balance at moveloop entry.
     * Stage 1 scaffold: purely additive — for a non-Fast hero the per-turn engine
     * fires u_calc_moveamt which adds NORMAL_SPEED and the -= NORMAL_SPEED in the
     * head cancels it, keeping the balance at NORMAL_SPEED. No behavioural change. */
    game.u = game.u || {};
    game.u.umovement = NORMAL_SPEED;
    /* C ref: allmain.c:101 moveloop_preamble — svc.context.move = 0 at the end of
     * moveloop_preamble, so the FIRST moveloop_core skips the per-turn block
     * (mcalcmove, makemon, gethungry, exerchk). The hero must act first. */
    game.context.move = 0;
    /* C ref: decl globals zero-init — gm.multi/gm.multi_reason/ga.afternmv/
     * gn.nomovemsg all start 0/NULL.  These drive the multi<0 occupation
     * countdown (moveloop_core allmain.c:433-441, nomul/unmul hack.c:4068-4117).
     * The `while (g.multi < 0)` countdown loop in moveloop_core is fully gated on
     * g.multi < 0, so these defaults make it a no-op for every session that
     * never schedules a nomul (all 8 passing sessions + the bulk of the corpus). */
    game.multi = 0;
    game.multi_reason = null;
    game.afternmv = null;
    game.nomovemsg = null;
}
const MONS = /** @type {number[][]} */ (monsPack.mons);
export const NORMAL_SPEED = 12; /* C permonst.h:80 */
const MSLOW = 1; /* C monst.h:205 */
const MFAST = 2; /* C monst.h:206 */
/* C ref: mon.c:1108-1150 mcalcmove(mon, m_moving).
 * Computes the movement allotment for one monster and, ONLY when m_moving is
 * true, fires exactly one rn2(NORMAL_SPEED) for the random rounding —
 * unconditionally within that arm, even when mmove is already a multiple of
 * NORMAL_SPEED (mmove_adj == 0). Every real caller in this file passes
 * m_moving=TRUE (the fmon reallocation loop and u_calc_moveamt's steed arm,
 * both allmain.c call sites); the parameter and its default are kept to match
 * C's actual two-argument signature (worm_move's `mcalcmove(worm, FALSE)`,
 * worm.c:222, is the one caller that passes FALSE and skips the rounding arm
 * entirely — see js/worm.js, which still carries its own copy pending
 * consolidation onto this export).
 * mmove (move speed) is column 9 of makemon_mons.json (LVL(lvl, mov, ...)).
 * mspeed MSLOW/MFAST adjustments mirror C; usteed gallop branch (rn2(2)) is
 * guarded — fmon monsters are never u.usteed, so it never fires here. */
export function mcalcmove(mon, m_moving = true) {
    const mndx = (mon.data?.pmidx ?? mon.mndx ?? mon.mnum ?? 0) | 0;
    let mmove = (mndx >= 0 && mndx < MONS.length) ? ((MONS[mndx][9] ?? 0) | 0) : 0;
    const mspeed = (mon.mspeed | 0);
    if (mspeed === MSLOW) {
        if (mmove < NORMAL_SPEED)
            mmove = Math.trunc((2 * mmove + 1) / 3);
        else
            mmove = 4 + Math.trunc(mmove / 3);
    } else if (mspeed === MFAST) {
        mmove = Math.trunc((4 * mmove + 2) / 3);
    }
    /* C mon.c:1148-1153 —
     *     if (mon == u.usteed && u.ugallop && svc.context.mv)
     *         mmove = ((rn2(2) ? 4 : 5) * mmove) / 3;
     * The fmon reallocation loop never reaches it (its monsters are never the
     * steed), but u_calc_moveamt's `mcalcmove(u.usteed, TRUE)` does, so the arm
     * is live now that that call exists.  u.ugallop is set only by kick_steed()
     * (steed.c spurring), which nothing in this port writes yet, so the rn2(2)
     * cannot fire on the corpus — it is here so that landing kick_steed later
     * does not silently drop a draw. */
    if (mon === game.u?.usteed && (game.u?.ugallop | 0) && (game.context?.mv | 0)) {
        mmove = Math.trunc(((rn2(2) ? 4 : 5) * mmove) / 3);
    }
    /* C mon.c:1137-1148 — only when m_moving: random rounding to a
     * NORMAL_SPEED multiple. When m_moving is false (worm_move's call), C
     * skips this whole block and draws nothing here. */
    if (m_moving) {
        const mmove_adj = mmove % NORMAL_SPEED;
        mmove -= mmove_adj;
        if (rn2(NORMAL_SPEED) < mmove_adj)
            mmove += NORMAL_SPEED;
    }
    return mmove;
}
/* C ref: allmain.c:274-281 — per-turn movement reallocation loop.
 *   for (mtmp = fmon; mtmp; mtmp = mtmp->nmon)
 *       mtmp->movement += mcalcmove(mtmp, TRUE);
 * Fires one rn2(NORMAL_SPEED) per live monster (inside mcalcmove) and
 * accumulates the result into mtmp->movement so the next turn's movemon()
 * loop can gate dochug on movement >= NORMAL_SPEED.
 * Returns count of live monsters processed. */
/* C ref: allmain.c:227-228 — the FIRST statements of the new-turn block, ahead
 * of the mcalcmove reallocation loop:
 *     gw.were_changes = 0L;
 *     mcalcdistress();            / * adjust monsters' trap, blind, etc * /
 * mcalcdistress (mon.c:1174) is iter_mons(m_calcdistress), and m_calcdistress
 * (mon.c:1180-1209) ends with the three per-turn countdowns:
 *     if (mtmp->mblinded && !--mtmp->mblinded) mtmp->mcansee = 1;
 *     if (mtmp->mfrozen && !--mtmp->mfrozen) mtmp->mcanmove = 1;
 *     if (mtmp->mfleetim && !--mtmp->mfleetim) mtmp->mflee = 0;
 *
 * HISTORY: only those three countdowns were ported here at first, because
 * m_calcdistress's earlier body — minliquid for mmove==0 monsters, mon_regen,
 * decide_to_shapeshift, were_change — existed nowhere on a live path.  That
 * partial wiring was landable on its own precisely because the missing arms
 * draw RNG in C and drew none here, so the stream stayed where it was.
 *
 * Why the countdowns had to land then: until js/uhitm.js's do_attack called the
 * real monflee, NOTHING in this port ever set mfleetim, so an unwired countdown
 * was invisible.  With monflee wired, a pet scared out of the hero's way stayed
 * mflee FOREVER, and dochug's `mtmp->mflee && !rn2(40)` teleport gate
 * (monmove.c:745) then fired an rn2(40) on every later turn that C does not
 * draw — seed0014's first RNG divergence, at leaf 8647 / step 211, two turns
 * after the pet was scared at step 209.  (The general shape: landing the first
 * writer of a dormant field turns every unwired reader of it into a live bug.)
 *
 * NOW: the whole of m_calcdistress is ported, in js/mklev.js (next to the
 * minliquid / healmon / newcham arms it needs), and mcalcdistress() there is the
 * real iter_mons(m_calcdistress).  The local countdown-only stand-in is gone —
 * its three countdowns are the tail of the ported m_calcdistress. */

async function fmon_mcalcmove() {
    /* C allmain.c:227-228 — `gw.were_changes = 0L; mcalcdistress();` immediately
     * precede the mcalcmove reallocation loop in the same new-turn block; every
     * caller of this function is that block, so the pairing lives here. */
    game.gw = game.gw || {};
    game.gw.were_changes = 0;
    await mcalcdistress();
    const g = game;
    let n = 0;
    for (let m = g.fmon; m; m = m.nmon) {
        /* C purges dead monsters at end of their round; skip any still-dead
         * ones that may linger in the JS chain. */
        if ((m.mhp ?? 1) > 0) {
            if (m.movement == null)
                m.movement = 0;
            m.movement += mcalcmove(m, true); /* C allmain.c:277 — fires rn2(12) */
            n++;
        }
        /* NO CAP.  C allmain.c:274-281 walks the whole fmon chain and draws one
         * rn2(12) per live monster; there is no upper bound on the roster.  A
         * `if (n >= 64) break; /_* safety cap *_/` used to sit here and silently
         * truncated the loop at 64 monsters, which is not a scaffold that fails
         * loudly — it just stops drawing.  Witness: seed0360-wizard-world-tour
         * step 160 (Dlvl:25, arrived by level teleport the step before, whose
         * 14103 generation draws all matched).  C's step-160 bucket opens with a
         * run of 106 consecutive rn2(12) @mcalcmove(mon.c:1164) — a 106-monster
         * roster — and JS stopped after exactly 64 of them, so the 65th JS draw
         * was the NEXT phase's rn2(70) @maybe_generate_rnd_mon(allmain.c:166)
         * against C's 65th rn2(12).  First value divergence, global leaf 22874. */
    }
    return n;
}
/* C ref: mon.c:1313-1338 movemon() + mon.c:1196-1310 movemon_singlemon,
 * driven by allmain.c:252-256 do { monscanmove = movemon(); ... } while (monscanmove).
 *
 * movemon() walks fmon once: for each live monster with movement >= NORMAL_SPEED
 * it calls dochug (via dochugw), decrements NORMAL_SPEED, and sets
 * somebody_can_move when the monster STILL has movement >= NORMAL_SPEED after the
 * decrement.  The outer do-while repeats movemon() while somebody_can_move, so a
 * fast monster (movement >= 24) gets dochug'd 2-3× in one turn.  Monsters with
 * movement < NORMAL_SPEED are skipped entirely (no RNG) — this is the gate that
 * was missing: the old dispatch called dochug once per monster unconditionally,
 * firing distfleeck rn2(5) for monsters C never moved.
 *
 * dochug fires the per-monster RNG: distfleeck rn2(5), action-class selectors, etc. */
/* C mon.c:1314 movemon() — ONE pass over fmon (iter_mons_safe(movemon_singlemon)):
 * each monster with movement >= NORMAL_SPEED is decremented and dochug'd exactly
 * once; returns whether ANY monster still has a full move left (gs.somebody_can_move).
 * This is the single-pass primitive; the outer do{...}while(somebody_can_move) that
 * drains banked monster movement lives in the caller (allmain.c:252-256), where it
 * is interleaved with the hero-banked break (u.umovement >= NORMAL_SPEED).  The
 * faithful per-turn loop (faithful_moveloop_turn) runs that inner do-while WITH the
 * break; the calibrated path (fmon_dochug_dispatch) runs it WITHOUT (the hero never
 * banks on its non-Fast canary sessions, so draining in one call is equivalent). */
export async function ff_movemon_one_pass() {
    const g = game;
    if (!g)
        return false;
    /* FF_RUNBANK_TRACE (RNG-neutral): one marker per movemon pass, recording
     * g.moves and the live hero square at the moment this pass runs.  Diff
     * target for tools/hero-run-fastbank-diff.mjs — compares against C's
     * ^mapstate[turn=N] + the first ^distfleeck[...] ux/uy immediately after
     * it (mon.c:1314 movemon() called once per do-while pass, allmain.c:243-
     * 256).  A Fast hero (u.umovement banks > NORMAL_SPEED, e.g. a monk) can
     * take TWO domove()s between two movemon passes in C; this marker exposes
     * whether the JS multi>0 run loop (allmain.js) reproduces that pairing. */
    if (ENV.FF_RUNBANK_TRACE === '1') {
        pushRngLogEntry(`^ff_worldtick[moves=${g.moves | 0} ux=${g.u ? g.u.ux | 0 : -1} uy=${g.u ? g.u.uy | 0 : -1}]`);
    }
    let somebody_can_move = false;
    /* A death flagged BEFORE this pass began was raised by the hero own command
     * (js/zap.js _buzz_losehp on a self-zap, js/dokick.js), and C runs done() there,
     * inside dozap/dokick, BEFORE movemon.  Draining such a death here would run it
     * one monster too late and, worse, after monsters C never moved: seed5006
     * segment 0 self-zaps a wand of death at step 183 and C never reaches movemon
     * at all, so pulling the drain into the pass moved the pet one square on the
     * "You die.--More--" frame.  Only a death raised DURING this pass — i.e. by a
     * monster attack, which is the case C resolves inside movemon — is drained here;
     * anything already pending stays with the command-read-boundary drain in
     * cmd.js rhack. */
    const _deathBeforePass = game._pendingDeath || null;
    /* C mon.c:1318 iter_mons_safe(movemon_singlemon): ONE pass over fmon.
     * iter_mons_safe (mon.c:4490) snapshots the entire fmon chain into an array
     * FIRST, then iterates the snapshot — so a monster removed mid-pass (e.g. a
     * pet dying in a pit, which m_detach's it from fmon) does NOT truncate the
     * iteration: monsters that were after it in the chain are still processed.
     * A naive `m = m.nmon` walk would follow the dead monster's nulled nmon and
     * stop early.  Snapshot to mirror C exactly. */
    const roster = [];
    for (let m = g.fmon; m; m = m.nmon)
        roster.push(m);
    if (ENV.FF_MFNDTRACE === '1') {
        const census = roster.slice(0, 128).map(m => `${m.m_id | 0}:${m.mnum ?? m.data?.pmidx ?? -1}@${m.mx | 0},${m.my | 0}`).join(';');
        pushRngLogEntry(`^fmon_census[moves=${g.moves | 0} count=${roster.length} mons=${census}]`);
    }
    for (let i = 0; i < roster.length; i++) {
        const m = roster[i];
        /* FF_MLTRACE cursor telemetry: unlike ^ff_movemon_mon (which marks the
         * gate before a monster spends movement), this records the resumable
         * iterator position around the awaited dochug call.  A pager can yield
         * from inside dochug; capturing both sides makes it possible to prove
         * whether a future continuation resumes at the same roster index. */
        if (ENV.FF_MLTRACE === '1') {
            game._ffMlCursor = { pass: game._ffMlPass | 0, roster: i | 0,
                count: roster.length | 0, phase: 'before-dochug',
                mid: m.m_id | 0, moves: game.moves | 0 };
            pushRngLogEntry(`^ff_movemon_cursor[phase=before-dochug pass=${game._ffMlPass|0}`
                + ` roster=${i|0}/${roster.length|0} mid=${m.m_id|0}`
                + ` pending=${_topline_more_pending() ? 1 : 0}`
                + ` force=${game._topl_force_breaks?.length|0}]`);
        }
        /* C mon.c:1216-1224 — the FIRST statement of movemon_singlemon:
         *     if (u.utotype ...) { gs.somebody_can_move = FALSE; return TRUE; }
         * "end monster movement early if hero is flagged to leave the level".
         * Returning TRUE breaks iter_mons_safe's loop (mon.c:4517), so once a
         * level change is scheduled NO further monster moves in this pass, and
         * the somebody_can_move any earlier monster set is DISCARDED.
         *
         * Absent here, so a level change scheduled from inside a monster's own
         * move (quest.c:353 expulsion() via leader_speaks -> chat_with_leader,
         * teleport.c level_tele, mhitu's level-teleport attacks) let every
         * remaining monster take a move C never gives it.  seed0361 step 185:
         * the Archeologist quest leader expels the hero on the badalign arm at
         * global leaf 4368; C leaves movemon immediately and generates Dlvl:14,
         * this port ran the next monster's distfleeck rn2(5) (js/monmove.js:141)
         * instead and never changed level at all. */
        if ((g.u && (g.u.utotype | 0))) {
            somebody_can_move = false;
            break;
        }
        if ((m.mhp | 0) <= 0)
            continue; /* C mon.c:1223 DEADMONSTER(mtmp) — no RNG (also skips a
                       * monster killed earlier in this same pass) */
        /* C mon.c:1230 m_everyturn_effect(mtmp) — sits BETWEEN the
         * DEADMONSTER/mon_offmap checks above and the movement >= NORMAL_SPEED
         * gate below, so it runs for every live monster each pass, including
         * ones with no movement banked.  Its only body is the PM_FOG_CLOUD
         * vapour-trail arm (monmove.c:674-684), which draws one rn1(3,4)
         * (region.c:1303) per cloud actually created.  Inert for every other
         * monster, and no session in the 64-session corpus reaches it with any
         * monster other than a fog cloud. */
        m_everyturn_effect(m);
        if (m.movement == null)
            m.movement = 0;
        /* C mon.c:1233 movemon gate — only monsters with movement >= NORMAL_SPEED
         * are dochug'd; decrement NORMAL_SPEED and re-queue if still able to move. */
        if ((m.movement | 0) < NORMAL_SPEED)
            continue;
        /* ── FF_MLTRACE (env-gated, RNG-NEUTRAL telemetry) ─────────────────────────
         * The per-monster-per-pass counterpart of C's ^movemon_turn (mon.c:1236,
         * emitted in movemon_singlemon AFTER the movement>=NORMAL_SPEED gate and
         * BEFORE `movement -= NORMAL_SPEED`).  Emitting HERE — same gate, same
         * pre-decrement point — gives the movemon-pass differ a JS marker at C's
         * exact granularity (one line per monster that actually moves, per pass),
         * carrying the SAME identity C records: <mnum>#<m_id>@<x>,<y> plus the
         * mv=<A>-><B> drain.  This lets tools/movemon-pass-diff.mjs ALIGN the C and
         * JS per-pass monster-move sequence leaf-for-leaf, instead of only the
         * coarse per-turn ^ff_herotrace pass count.  Emitted ONLY when FF_MLTRACE=1;
         * pushRngLogEntry is a no-op unless the rng log is enabled (dev/diff tooling
         * only) → ZERO effect on scored runs, consumes NO rng. */
        if (typeof process !== 'undefined' && ENV
            && ENV.FF_MLTRACE === '1') {
            const _mnum = (m.mndx ?? m.mnum ?? 0) | 0;
            const _mid = (m.m_id | 0);
            const _mv0 = (m.movement | 0);
            pushRngLogEntry(
                `^ff_movemon_mon[${_mnum}#${_mid}@${m.mx | 0},${m.my | 0}`
                + ` mv=${_mv0}->${_mv0 - NORMAL_SPEED}`
                + ` moves=${game.moves | 0} pass=${game._ffMlPass | 0} roster=${i | 0}]`);
        }
        m.movement -= NORMAL_SPEED;
        if ((m.movement | 0) >= NORMAL_SPEED)
            somebody_can_move = true;
        /* C mon.c:1246-1247 — a preceding monster can have changed an
         * obstruction or light source.  Refresh before this monster makes
         * visibility-dependent decisions, at C's per-monster boundary. */
        if (g.vision_full_recalc)
            vision_recalc(0);
        /* C mon.c:1256 — `if (minliquid(mtmp)) return FALSE;`, between the
         * movement decrement above and the hider gate below.  A monster whose
         * square is water or lava is dealt with there and does NOT reach
         * dochugw at all.  This call site did not exist (and minliquid_core
         * was a `return 0` stub), so a monster C had already burned away ran a
         * full dochug here.  seed0360-wizard-world-tour, Dlvl 42: a mumak in
         * the lava at (55,9) drew an extra rn2(3) at session step 368 and then
         * walked to (55,8), where the hero's Warning glyph painted a digit on a
         * square C leaves blank.  See js/mklev.js minliquid_core for exactly
         * which arm is ported and which are still gaps. */
        if (await minliquid(m))
            continue;
        /* C mon.c:1268-1284 — "after losing equipment, try to put on
         * replacement":
         *     if (mtmp->misc_worn_check & I_SPECIAL) {
         *         long oldworn;
         *         if (mtmp->mpeaceful || mtmp->mtame
         *             || dist2(mx,my, mux,muy) > (3 * 3)) {
         *             mtmp->misc_worn_check &= ~I_SPECIAL;
         *             oldworn = mtmp->misc_worn_check;
         *             m_dowear(mtmp, FALSE);
         *             if (mtmp->misc_worn_check != oldworn || !mtmp->mcanmove)
         *                 return FALSE;   / * is spending this turn equipping * /
         *         }
         *     }
         * The I_SPECIAL bit is set by check_gear_next_turn() (mon.c:5903 —
         * js/makemon.js), which m_search_items and the trap paths already call,
         * so this port has been SETTING the flag and never reading it: a
         * monster that picked armor up last turn took a full dochug turn where
         * C spends the turn putting it on and draws nothing at all.
         *
         * MEASURED on the whole public corpus with a probe at mon.c:1281: the
         * block runs 54 times and skips the turn TWICE — seed0383 leaf 10373
         * (mnum 165 at <46,2> puts on levitation boots, m_delay 2) and seed0399
         * leaf 11217 (mnum 46 puts on banded mail under a worn cloak,
         * m_delay 7).  seed0383's skip is what makes C's dochug run stop at
         * leaf 10373 instead of running one more monster's distfleeck.
         *
         * dochug (monmove.c:717) would ALSO return 0 with no draws for the
         * !mcanmove the m_dowear sets — the two are not redundant, because the
         * skip must happen for the misc_worn_check-changed case as well, and
         * because C's return here also bypasses the hider / eel / Conflict
         * blocks below. */
        if (((m.misc_worn_check | 0) & I_SPECIAL_FF) !== 0) {
            if ((m.mpeaceful | 0) || (m.mtame | 0)
                || _dist2_ff(m.mx | 0, m.my | 0, m.mux | 0, m.muy | 0) > (3 * 3)) {
                m.misc_worn_check = (m.misc_worn_check | 0) & ~I_SPECIAL_FF;
                const oldworn = m.misc_worn_check | 0;
                await m_dowear(m, false);
                if ((m.misc_worn_check | 0) !== oldworn || !(m.mcanmove | 0))
                    continue; /* is spending this turn equipping */
            }
        }
        /* C mon.c:1274-1280 — a hider (is_hider: mflags1 & M1_HIDE — mimics,
         * piercers, eels, …) that is currently disguised as furniture or an
         * object skips its entire move: movemon_singlemon returns before
         * dochugw() is ever called, consuming ZERO rng.  Without this gate JS
         * runs full dochug on a disguised mimic and fires an extra
         * distfleeck rn2(5) that C never fires (seed0003 first divergence
         * leaf 8894: mid=127 small mimic @14,15, disguised as STRANGE_OBJECT
         * in the shop — C skips it, JS was firing rn2(5)).
         *   C order is:  if (restrap(mtmp)) return;   // mon.c:1276
         *                if (M_AP_TYPE == FURNITURE || OBJECT) return;  // 1278
         *                if (mtmp->mundetected) return;                 // 1281
         * restrap() (mon.c:4660) SHORT-CIRCUITS at `M_AP_TYPE(mtmp)` for an
         * already-disguised monster → returns FALSE with NO rng.
         *
         * The rn2(3) re-hide roll is now ported (js/mklev.js restrap), so the
         * full C order runs here: an UNSEEN, undisguised hider pays rn2(3) at
         * the top of its move and forfeits the move on a 0.  seed4500 PRNG
         * index 7833: C draws rn2(3)=1 @restrap(mon.c:4667) between two
         * distfleeck rn2(5)s; JS drew neither and slid the whole stream. */
        const M1_HIDE = 0x00000100; /* C monflag.h:93 */
        if ((((m.data && m.data.mflags1) | 0) & M1_HIDE) !== 0) {
            /* C mon.c:1285-1287: if (restrap(mtmp)) return FALSE; */
            if ((await restrap(m)))
                continue;
            const apt = M_AP_TYPE(m);
            if (apt === M_AP_FURNITURE || apt === M_AP_OBJECT)
                continue;
            /* C mon.c:1292-1293: if (mtmp->mundetected) return FALSE; */
            if (m.mundetected)
                continue;
        } else if (((m.data && m.data.mlet) | 0) === S_EEL_FF_MV
                   && !m.mundetected && (m.mflee || !_m_next2u_ff(m))
                   && !canseemon_ff(m) && !rn2(4)) {
            /* C mon.c:1294-1302 — the ELSE of the hider branch:
             *     } else if (mtmp->data->mlet == S_EEL && !mtmp->mundetected
             *                && (mtmp->mflee || !m_next2u(mtmp))
             *                && !canseemon(mtmp) && !rn2(4)) {
             *         / * some eels end up stuck in isolated pools ... * /
             *         if (hideunder(mtmp)) return FALSE;
             *     }
             * Eels are NOT is_hider (no M1_HIDE), so this arm is reached
             * whenever the first one is not — and it DRAWS rn2(4) on the way,
             * gated by three RNG-free predicates.  Absent here, so a beached or
             * pooled eel never paid it: seed4500-knight-coverage leaf 101608,
             * step 1576. */
            if (hideunder_ff(m))
                continue;
        }
        /* C mon.c:1305-1318 — "continue if the monster died fighting":
         *     if (Conflict && !mtmp->iswiz && m_canseeu(mtmp)) {
         *         if (cansee(mtmp->mx, mtmp->my)
         *             && (mdistu(mtmp) <= BOLT_LIM * BOLT_LIM)
         *             && fightm(mtmp))
         *             return FALSE;
         *     }
         * fightm()'s FIRST statement is resist_conflict(), which draws rnd(20)
         * (mondata.c:1612) — so this block is load-bearing on the RNG axis for
         * every monster the conflicted hero can see, whether or not any fight
         * actually happens.  It had no JS counterpart at all, which is why
         * seed0004 lost the stream one leaf per visible monster per turn from
         * the moment the hero put its ring of conflict on (step 283).
         * mdistu(mon) = distu(mon->mx, mon->my) = dist2 to the hero (hack.h:1532).
         * Every conjunct short-circuits exactly as C's `&&` does, so a hero
         * without Conflict pays nothing here. */
        if (_conflict_ff() && !m.iswiz && m_canseeu(m)
            && cansee_ff(m.mx | 0, m.my | 0)
            && dist2_ff(m.mx | 0, m.my | 0, g.u.ux | 0, g.u.uy | 0)
               <= BOLT_LIM_FF * BOLT_LIM_FF
            && await fightm(m))
            continue; /* C: return FALSE — mon might have died */
        /* C mon.c:1320 — `(void) dochugw(mtmp, TRUE);`.  This call site read
         * `dochug(m)` and so skipped dochugw's OWN body: the
         * "hero notices monster and stops current activity" check
         * (monmove.c:222-235), whose only effect is stop_occupation().
         * js/monmove.js:2991 carries a full dochugw() port whose comment
         * records that the stop branch "executes ZERO times across all 44
         * public sessions" — measured on a function the movemon loop never
         * called.  Its only other caller is js/teleport.js:1160 with
         * chug=false, where the `!rd` and canspotmon terms are a different
         * question entirely.
         * MEASURED on seed0012-monk-vault-escort step 226 (`9s`, a counted
         * search = a timed occupation): C stops the search after six turns and
         * prints "You stop searching." because a newt walks into view four
         * squares away; this port ran all nine turns, banked the extra turns
         * against the next five single-`s` keystrokes, and rendered nine
         * frames with the pet and the newt in the wrong places.
         * AWAITED: dochug is async since the AT_BREA port (mattacku ->
         * breamu -> dobuzz, whose plines page).  An unawaited call would
         * resume the breath ray AFTER the next monster had moved. */
        await dochugw(m, true);
        if (ENV.FF_MLTRACE === '1') {
            game._ffMlCursor = { pass: game._ffMlPass | 0, roster: i | 0,
                count: roster.length | 0, phase: 'after-dochug',
                mid: m.m_id | 0, moves: game.moves | 0 };
            pushRngLogEntry(`^ff_movemon_cursor[phase=after-dochug pass=${game._ffMlPass|0}`
                + ` roster=${i|0}/${roster.length|0} mid=${m.m_id|0}`
                + ` pending=${_topline_more_pending() ? 1 : 0}`
                + ` force=${game._topl_force_breaks?.length|0}]`);
        }
        /* ── C end.c:1023 done(), reached IN PLACE from inside this monster move ──
         * A monster whose attack takes the hero last hit point reaches
         * mdamageu -> done_in_by -> done() DEEP inside dochug, and in
         * wizard/explore mode done() opens the blocking "Die?" prompt RIGHT
         * THERE, prints "OK, so you don't die.", calls savelife() and RETURNS
         * (end.c:1121-1127 survive = TRUE ... return) — so movemon carries on
         * with the REMAINING monsters afterwards.
         *
         * The JS damage sites are synchronous and cannot open a blocking read,
         * so js/end.js deadhero() only FLAGS the death; the whole interaction
         * used to be deferred to the next command read (cmd.js rhack).  That
         * deferral puts every monster that moves AFTER the killer ahead of the
         * death in the message stream.  Measured on seed5002 segment 1: C pages
         *     "...The giant bat bites!--More--" | "You die...--More--"
         *     | "Die? [yn] (n)" | "OK, so you don't die.  The kitten bites the
         *       giant bat.--More--" | "You survived that attempt on your life."
         * while this port emitted the kitten and bat NEXT round first and was
         * one whole --More-- page behind from step 132 to the end of the run.
         *
         * Draining here — after the killer dochug returns, before the next
         * monster — is C boundary at movemon granularity.  RNG-FREE: the death
         * interaction draws nothing, so the leaf stream is untouched; inert on
         * every turn where no monster kills the hero. */
        if (game._pendingDeath && game._pendingDeath !== _deathBeforePass) {
            await drain_pending_death_in_place();
        }
    }
    /* C mon.c:1333-1334 — moving monsters can carry a light source, so mark
     * vision dirty after every complete movemon pass.  C deliberately tests
     * for any source (rather than whether one moved); its next per-monster
     * boundary or the enclosing loop consumes this flag. */
    if (any_light_source())
        g.vision_full_recalc = 1;
    /* C mon.c:1340 — the end-of-movemon() purge: after every monster has moved
     * (iter_mons_safe(movemon_singlemon)) C runs dmonsfree() to reap the
     * dead-but-linked nodes that the death paths (mondied/monkilled/... ->
     * m_detach) left in fmon with MON_DETACH set and the map cell already
     * cleared.  js/ deferred those unlinks to match C's m_detach but had NO
     * per-turn purge (only the level-gen dmonsfree at mkmaze.js), so dead nodes
     * lingered at <0,0> for the rest of the level (fmon-chain-diff seed0015:
     * dead m_id=27 lingering from turn 21).  This is the load-bearing prereq
     * for the KEYSTONE-A eager-unlink deferrals.  RNG-free (dmonsfree draws
     * nothing) and screen-neutral (nodes are already off-map, newsym'd at
     * m_detach time). */
    dmonsfree();
    if (ENV.FF_MLTRACE === '1')
        pushRngLogEntry(`^ff_movemon_pass[moves=${g.moves | 0} pass=${g._ffMlPass | 0} roster=${roster.length | 0} somebody=${somebody_can_move ? 1 : 0}]`);
    return somebody_can_move;
}

/* C end.c:1023 done(), reached IN PLACE — the blocking death interaction, run
 * where C runs it rather than at the next command read.  Extracted from
 * ff_movemon_one_pass below so js/mhitu.js hitmu_je() can run it at C's OWN
 * position (immediately after mdamageu, before passiveum and before the
 * attacker's remaining attacks) instead of only at movemon granularity.
 *
 * MEASURED on seed4500-knight-coverage step 1005: the fourth of a monster's
 * attacks takes the hero's last hit point, and C pages
 *   "You hit it.  It bites!  It bites!  It misses!  It bites!--More--"
 *   | "You die...--More--" | "Die? [yn] (n)"
 *   | "OK, so you don't die.  It misses!--More--"
 * i.e. the FIFTH attack's message lands AFTER the death prompt.  Draining only
 * at the movemon boundary put it before, and every later page was one behind
 * (that is 3 frames there and the whole 28-frame tail from step 1786).
 *
 * RNG-FREE: the death interaction draws nothing. */
export async function drain_pending_death_in_place() {
        /* C has ONE topline: the hero command own message and the movemon
         * plines share it, because update_topl (win/tty/topl.c:257-266)
         * CONCATENATES until the line overflows.  This port keeps them in two
         * channels — _resultMessage (the command result, restored at the next
         * nhgetch) and _pending_message (this turn movemon plines) — and merges
         * them AFTER the turn (js/allmain.js, "tty topline concatenation").
         * Paging mid-turn here therefore has to run that merge FIRST, or the
         * command result is both missing from these pages and re-shown, glued
         * in front of the post-death text, at the next command read: seed5002
         * segment 1 step 140 read "You hit the small mimic.  OK, so you don't
         * die.--More--" where C reads "OK, so you don't die.  The kitten bites
         * the giant bat.--More--". */
        if (game._resultMessage) {
            /* The single-slot `_topl_joins_src` is keyed to whatever string
             * was last built by pline(), which by now is THIS turn's movemon
             * plines — so the snapshot of the COMMAND RESULT misses, and the
             * result collapses to one atomic pline with no page boundaries.
             * js/allmain.js persists the pre-movemon snapshot in
             * `_resultMessageJoins` (same `{src, joins}` record
             * js/cmd.js:_result_append_join writes); fall back to it, with
             * the same src keying every other reader of that field uses. */
            const _rmj = (game._resultMessageJoins
                          && game._resultMessageJoins.src === game._resultMessage)
                ? game._resultMessageJoins.joins.slice() : null;
            game._pending_message = game._pending_message
                ? _topl_merge_result(game._resultMessage, game._pending_message,
                                     _topl_joins_snapshot(game._resultMessage) || _rmj)
                : game._resultMessage;
            game._resultMessage = null;
            game._resultMessageJoins = null;
        }
        /* The turn accumulated plines are still on _pending_message; C had
         * already paged them at each width boundary as they arrived
         * (win/tty/topl.c update_topl), so page them before the death line. */
        await flush_screen(1);
        await do_death_sequence({ inPlace: true });
}

export async function fmon_dochug_dispatch() {
    const g = game;
    if (!g || !g.fmon)
        return;
    /* C allmain.c:252-256 outer loop: do { movemon() } while (somebody_can_move).
     * The calibrated path drains all banked monster movement in one dispatch (its
     * canary sessions are non-Fast, so the hero never banks → no break needed). */
    let somebody_can_move;
    let guard = 0;
    /* FF_MLTRACE: pass index for the per-monster marker (RNG-neutral; see
     * ff_movemon_one_pass).  Reset at the dispatch entry, bumped per pass. */
    game._ffMlPass = 0;
    do {
        somebody_can_move = await ff_movemon_one_pass();
        if (++guard >= 64)
            break; /* safety cap against a broken chain */
        game._ffMlPass = guard;
    } while (somebody_can_move);
}
/* C ref: allmain.c:117-162 u_calc_moveamt() — computes hero movement for this turn,
 * consuming rn2(3) when Fast or Very_fast and banking the result into g.u.umovement.
 * Very_fast: (HFast & ~INTRINSIC) || EFast — speed boots/potion (timeout-based).
 * Fast: HFast || EFast — any fast intrinsic or extrinsic.
 * When hero is on a steed, mcalcmove() handles movement (no rn2(3) from here).
 * C prop.h: FAST=64; HFast=u.uprops[FAST].intrinsic; EFast=u.uprops[FAST].extrinsic.
 * C prop.h: INTRINSIC=0x07000000 (FROMOUTSIDE|FROMRACE|FROMEXPER).
 * C call site: allmain.c:292 — between makemon(rn2(70)) and settrack/svm.moves++.
 *
 * Stage 1 (RNG-neutral scaffold): the rn2(3) was already fired by the old
 * u_calc_moveamt_rng() and is still fired in the same position.  Now we apply
 * the result to compute moveamt and bank it into g.u.umovement exactly as C does.
 * For a non-Fast hero the function returns early before rn2(3) — identical to
 * the old stub.  wtcap defaults to UNENCUMBERED (0) — the common case for all
 * passing/canary sessions; Stage 3 ports near_capacity if needed.
 *
 * RISK 3: rn2(3) position is unchanged (between makemon and dosounds); only the
 * result is now applied.  For non-Fast hero: no rn2(3), no change.
 * RISK 4: UNENCUMBERED assumed; encumbrance scaling deferred to Stage 3. */
const FAST_PROP = 64; /* C prop.h FAST = 64 */
const INTRINSIC_BITS = 0x07000000; /* FROMOUTSIDE|FROMRACE|FROMEXPER */
const UNENCUMBERED = 0; /* C botl.h — encumbrance level 0 */
function u_calc_moveamt(wtcap = UNENCUMBERED) {
    const g = game;
    const u = g.u;
    if (!u) return;
    /* C ref: allmain.c:119-122 —
     *     if (u.usteed && u.umoved) {
     *         / * your speed doesn't augment steed's speed * /
     *         moveamt = mcalcmove(u.usteed, TRUE);
     *     } else { ... }
     * This function used to `return` outright on u.usteed, which is NOT the C
     * shape twice over: it skipped the steed's rn2(12) AND — because the return
     * came before the `u.umovement += moveamt` at the bottom — it banked NOTHING
     * for the hero on ANY mounted turn, u.umoved or not.  A hero who never banks
     * a full move can never break allmain.c:254's `if (u.umovement >=
     * NORMAL_SPEED) break`, so faithful_moveloop_turn kept re-running the
     * new-turn block: seed0104 step 11 (the '#ride' east) drew 920 leaves where
     * C draws 17, and its goblin walked 20 squares in one keystroke and reached
     * the hero to attack ("The goblin hits!  The goblin hits!--More--" over C's
     * bare "You mount the saddled pony.").  The missing rn2(12) is separately
     * the session's first RNG divergence, leaf 2654. */
    const _riding = !!(u.usteed && (u.umoved | 0));
    /* C ref: allmain.c:127 — `moveamt = gy.youmonst.data->mmove;`.
     * youmonst.data is `&mons[u.umonnum]` (polyself.c:38-42 set_uasmon, which is
     * NOT gated on Upolyd — rehumanize resets u.umonnum to u.umonster), so this is
     * the CURRENT FORM's speed, not a constant.  It happens to equal NORMAL_SPEED
     * for every role monster (monsters.h: wizard LVL(10, 12, ...)), which is why
     * the old hardcoded 12 held for an un-polymorphed hero — but a hero
     * polymorphed into a warhorse has mons[PM_WARHORSE].mmove = 24
     * (monsters.h:1042-1043 LVL(7, 24, 4, 0, 0)) and therefore banks TWO hero
     * actions per turn.  Column 9 of makemon_mons.json is LVL's `mov` field (the
     * same column mcalcmove reads above).
     * seed5500: the hero is a warhorse from turn 53 on; with the constant 12 the
     * JS hero took ONE key per turn where C takes TWO, so from step 899 the JS
     * world ran ahead of C — the Warning glyph was painted at the monster's
     * FUTURE square on all 9 remaining render-divergent steps. */
    const umnum = u.umonnum;
    /* A replay path that never reached u_init (u.umonnum unset) keeps the old
     * NORMAL_SPEED reading rather than indexing mons[0]. */
    let moveamt;
    if (_riding) {
        /* C allmain.c:120-121 — "your speed doesn't augment steed's speed":
         * the whole youmonst/Fast block below is SKIPPED, so a Fast rider draws
         * no rn2(3) either. */
        moveamt = mcalcmove(u.usteed, true);
    } else {
    moveamt = (umnum == null)
        ? NORMAL_SPEED
        : (((umnum | 0) >= 0 && (umnum | 0) < MONS.length)
            ? ((MONS[umnum | 0][9] ?? 0) | 0)
            : NORMAL_SPEED);
    /* C ref: allmain.c:129-137 — Very_fast or Fast triggers rn2(3) */
    const hFast = (u.uprops && u.uprops[FAST_PROP]) ? (u.uprops[FAST_PROP].intrinsic | 0) : 0;
    const eFast = (u.uprops && u.uprops[FAST_PROP]) ? (u.uprops[FAST_PROP].extrinsic | 0) : 0;
    /* Very_fast = (HFast & ~INTRINSIC) || EFast: speed potion/boots = timeout bits */
    const Very_fast = !!(hFast & ~INTRINSIC_BITS) || !!eFast;
    /* Fast = HFast || EFast: any fast source */
    const Fast = !!hFast || !!eFast;
    if (Very_fast) {
        /* C allmain.c:131: gain a free action on 2/3 of turns (rn2(3) != 0) */
        if (rn2(3) !== 0) moveamt += NORMAL_SPEED;
    } else if (Fast) {
        /* C allmain.c:135: gain a free action on 1/3 of turns (rn2(3) == 0) */
        if (rn2(3) === 0) moveamt += NORMAL_SPEED;
    }
    }
    /* C allmain.c:140-157 — encumbrance scaling of moveamt.
     * Stage 1/2 pass wtcap=UNENCUMBERED (0) → no scaling (identity).
     * Stage 3 ports near_capacity; deferred per plan. */
    switch (wtcap) {
        case 0: /* UNENCUMBERED */ break;
        case 1: /* SLT_ENCUMBER */ moveamt -= Math.trunc(moveamt / 4); break;
        case 2: /* MOD_ENCUMBER */ moveamt -= Math.trunc(moveamt / 2); break;
        case 3: /* HVY_ENCUMBER */ moveamt -= Math.trunc((moveamt * 3) / 4); break;
        case 4: /* EXT_ENCUMBER */ moveamt -= Math.trunc((moveamt * 7) / 8); break;
        default: break;
    }
    /* C allmain.c:159-161 — bank moveamt into u.umovement */
    u.umovement = ((u.umovement || 0) + moveamt) | 0;
    if (u.umovement < 0) u.umovement = 0;
    /* Stage 2 signal: record whether THIS u_calc_moveamt banked the Fast bonus
     * (moveamt == 2*NORMAL_SPEED).  C ref: a Fast hero who rolled the bonus gets
     * moveamt=24, which after the moveloop_core -=NORMAL_SPEED leaves
     * u.umovement >= NORMAL_SPEED — the next moveloop_core then runs movemon()
     * (banked-monster movement) WITHOUT a new-turn block and the hero acts a
     * second time (the banked double-move).  moveloop_core's banked-turn gate in
     * allmain.js reads this flag to fire that movemon at the C-faithful position.
     * (Encumbrance can yield a non-NORMAL_SPEED bonus, but Stage 1/2 are
     * UNENCUMBERED so moveamt is exactly NORMAL_SPEED or 2*NORMAL_SPEED.) */
    g._umv_bonus = (moveamt >= 2 * NORMAL_SPEED);
}
/* C ref: attrib.c:23-105 innate ability tables + youprop.h:177
 *   Searching = (HSearching || ESearching).
 * HSearching is granted from experience (FROMEXPER) once u.ulevel reaches
 * the role's innate threshold (attrib.c check_innate_abil, role_abil tables):
 *   Arc(0):1  Mon(5):9  Rog(7):10  Ran(8):1  Tou(10):10
 * (no race table grants SEARCHING).  This is a permanent intrinsic once the
 * level threshold is met — same bootstrap pattern as Fast (jsmain.js).
 * Extrinsic Searching (ring of searching, ESearching) is not yet tracked in
 * JS game state and is OR'd via g.u.uprops[SEARCHING] when a future port wires
 * it up. */
const SEARCHING_PROP = 34; /* prop.h:54 SEARCHING = 34 */
/* role index → innate HSearching ulevel threshold (0 = not granted). */
const SEARCHING_ROLE_LEVEL = {
    0: 1,   /* Arc */
    5: 9,   /* Mon */
    7: 10,  /* Rog */
    8: 1,   /* Ran */
    10: 10, /* Tou */
};
function ff_Searching() {
    const g = game;
    const u = g.u || {};
    /* HSearching (FROMEXPER): role+level innate grant. */
    const role = (g.flags && g.flags.initrole != null) ? (g.flags.initrole | 0) : -1;
    const ulevel = (u.ulevel | 0);
    const thresh = SEARCHING_ROLE_LEVEL[role];
    const hSearching = thresh != null && ulevel >= thresh;
    /* ESearching (extrinsic) — and any FROMOUTSIDE intrinsic set via uprops. */
    let eSearching = false;
    if (u.uprops && u.uprops[SEARCHING_PROP]) {
        const p = u.uprops[SEARCHING_PROP];
        eSearching = !!((p.intrinsic | 0) || (p.extrinsic | 0));
    }
    return hSearching || eSearching;
}
/* C ref: detect.c:2017 dosearch0(aflag=1) — intrinsic autosearch.  Fired
 * once per turn from moveloop_core (allmain.c:395-397) when
 *   Searching && !svl.level.flags.noautosearch && gm.multi >= 0.
 * For aflag=1 (intrinsic) the !aflag branches (feel_location, m_at/mfind0,
 * unmap_invisible) are skipped, so the scan consumes RNG only via:
 *   SDOOR  → rnl(7 - fund)
 *   SCORR  → rnl(7 - fund)
 *   unseen trap → rnl(8)
 * over the hero's 3x3 (x outer ux-1..ux+1, y inner uy-1..uy+1, skipping
 * self and !isok).  This is the RNG-consuming subset of cmd.js's full
 * dosearch0; the message/vision side-effects are screen-only and omitted.
 * fund stubbed to 0 (no artifact-SPFX_SEARCH uwep or LENSES in the
 * autosearch corpus; same stub as cmd.js dosearch0). */
function autosearch_rng() {
    const g = game;
    const u = g.u || {};
    /* C: if (Searching && !noautosearch && gm.multi >= 0) dosearch0(1); */
    if (!ff_Searching()) return;
    if (g.level && g.level.flags && g.level.flags.noautosearch) return;
    if ((g.multi | 0) < 0) return;
    /* C: if (u.uswallow) { ... } — no RNG when engulfed for aflag=1. */
    if (u.uswallow) return;
    /* C: fund = (uwep && oartifact && SPFX_SEARCH ? uwep->spe : 0)
     *           + (LENSES && !Blind ? 2 : 0), capped 5.  Stub: 0. */
    let fund = 0;
    if (fund > 5) fund = 5;
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    const COLNO_L = 80;
    const ROWNO_L = 21;
    const SDOOR_T = 14, SCORR_T = 15, CORR_T = 24, DOOR_T = 23;
    /* C: for (x = u.ux - 1; x < u.ux + 2; x++)
     *        for (y = u.uy - 1; y < u.uy + 2; y++) — x outer, y inner */
    for (let x = ux - 1; x < ux + 2; x++) {
        for (let y = uy - 1; y < uy + 2; y++) {
            if (x < 1 || x >= COLNO_L || y < 0 || y >= ROWNO_L) continue; /* !isok */
            if (x === ux && y === uy) continue; /* u_at */
            const loc = g.level && g.level.at ? g.level.at(x, y) : null;
            const typ = loc ? (loc.typ | 0) : 0;
            if (typ === SDOOR_T) {
                /* C: if (rnl(7 - fund)) continue; */
                if (rnl(7 - fund)) continue;
                /* C ref: detect.c:1590 cvt_sdoor_to_door(&levl[x][y]) — sets
                 * .typ = DOOR **and normalises doormask**.  doormask and
                 * wall_info share one flags bitfield (rm.h:202), so
                 * xy_set_wall_state's junction computation can clobber the
                 * D_CLOSED bit sel_set_ter set at map-load; C defensively
                 * strips WM_MASK and reasserts D_CLOSED unless already
                 * D_LOCKED.  Identical to js/cmd.js dosearch0's port of the
                 * same C call — without it the revealed door has doormask 0
                 * and the hero silently walks through it with no bump/open
                 * message (the seed0500 step-78 divergence documented there;
                 * on seed1100 it let the hero stand ON the just-found door at
                 * (30,12) instead of getting "This door is locked."). */
                if (loc) {
                    let newmask = (loc.doormask | 0) & ~WM_MASK;
                    if (Is_rogue_level(g.u?.uz)) {
                        newmask = D_NODOOR;
                    } else if (!(newmask & D_LOCKED)) {
                        newmask |= D_CLOSED;
                    }
                    loc.typ = DOOR_T;
                    loc.doormask = newmask;
                    loc.candig = false; /* C: lev->arboreal_sdoor = 0 */
                }
                recalc_block_point(x, y);
                exercise(A_WIS, true);     /* C: exercise(A_WIS, TRUE) — no RNG */
                /* C detect.c:2049-2052: nomul(0); feel_location(x,y);
                 * set_msg_xy(x,y); You("find a hidden door.").  RNG-free.
                 * The pline is what raises C's --More-- on seed1100 step 11:
                 * it joins the already-committed "Something is written here in
                 * the dust.  You read: ..." topline (64 cols), overflowing the
                 * reserve, so C pages there and eats keystroke 12.  Suppressing
                 * it left JS with no blocking read and leaked every key from
                 * step 12 into rhack as spurious commands. */
                nomul(0);
                feel_location(x, y);
                pline("You find a hidden door.");
            } else if (typ === SCORR_T) {
                /* C: if (rnl(7 - fund)) continue; */
                if (rnl(7 - fund)) continue;
                if (loc) loc.typ = CORR_T;
                unblock_point(x, y);
                exercise(A_WIS, true);
                /* C detect.c:2058-2062: nomul(0); feel_newsym(x,y);
                 * set_msg_xy(x,y); You("find a hidden passage."). */
                nomul(0);
                feel_newsym(x, y);
                pline("You find a hidden passage.");
            } else {
                /* aflag=1: m_at/mfind0 and unmap_invisible (!aflag) skipped. */
                /* C: if ((trap = t_at(x,y)) && !trap->tseen && !rnl(8)) {...} */
                const trap = t_at(x, y);
                if (trap && !trap.tseen && !rnl(8)) {
                    /* C detect.c:2087 find_trap(trap): trap->tseen=1 then
                     * feel_newsym(tx,ty)/map_trap — render the trap glyph so it
                     * shows on the map (RNG-free; the rnl(8) gate above already
                     * fired).  Without the newsym the trap stayed invisible on the
                     * JS map — seed0001 step6 screen divergence (C '^' magenta vs
                     * JS '.').  nomul(0)/messages are screen-only and omitted. */
                    trap.tseen = 1;
                    newsym(x, y);
                }
            }
        }
    }
}
/* C ref: youprop.h:169 Hallucination —
 *   ((HHallucination || EHallucination) && !Halluc_resistance)
 * with Halluc_resistance = (HHalluc_resistance || EHalluc_resistance). */
function Hallucination() {
    const up = game.u?.uprops;
    const h = up?.[HALLUC];
    const hres = up?.[HALLUC_RES];
    if (hres?.intrinsic || hres?.extrinsic)
        return false;
    return !!(h?.intrinsic || h?.extrinsic);
}

/* C ref: pline.c:435-452 You_hear — imported from js/display.js.  The note that
 * used to sit here deferred the guard because "neither Deaf nor Unaware nor
 * Underwater has a canonical ported predicate, and inventing one would be
 * fallback state"; the shared body invents nothing — Deaf is the reading the
 * status line's Deaf condition is validated on, and both leaves of Unaware are
 * ported.  dosounds()'s OWN top guard (sounds.c:206, `Deaf || !flags.acoustics
 * || u.uswallow || Underwater`) is a DIFFERENT predicate set and is still
 * missing; that one is left where it is, unmeasured.
 *
 * The shared body is async and, like pline (js/display.js), contains no await
 * before its side effect, so it still runs to completion synchronously — which
 * is what the sync per-turn HEAD block needs. */

/* C ref: mkroom.h:83 ROOM_INDEX(x) == ((int) ((x) - svr.rooms)) — the room's
 * index within svr.rooms[].  The port stores rooms in an array, so pointer
 * arithmetic becomes the array index. */
function ROOM_INDEX(croom) {
    return (game.level?.rooms ?? []).indexOf(croom);
}

/* C ref: sounds.c:318 `strchr(u.ushops, (int) (ROOM_INDEX(sroom)+ROOMOFFSET))`
 * — u.ushops is a char[5] of the shop room numbers the hero currently occupies.
 * The port stores it as a JS string of those raw char codes (mapstate_schema
 * 'hero.ushops', strSlot); js/shk.js:929 reads its first byte the same way, so
 * this is that read generalised to strchr's whole-buffer membership test. */
function _ushops_has(roomch) {
    const us = game.u?.ushops;
    if (!us) return false;
    const want = roomch | 0;
    if (typeof us === 'string') {
        for (let i = 0; i < us.length; i++)
            if (us.charCodeAt(i) === want) return true;
        return false;
    }
    if (Array.isArray(us))
        return us.some((c) => (typeof c === 'string' ? c.charCodeAt(0) : (c | 0)) === want);
    return (us | 0) === want;
}

/* C ref: shk.c:1125-1133 noisy_shop(sroom)
 *   struct monst *mtmp = sroom->resident;
 *   if (mtmp && inhishop(mtmp)) wake_nearto(mtmp->mx, mtmp->my, 11 * 11);
 * wake_nearto_core (mon.c:4374) consumes no RNG; js/mklev.js's wake_nearto is
 * still a no-op stub, so this is RNG- and state-neutral today and activates
 * automatically when that stub lands. */
function noisy_shop(sroom) {
    const mtmp = sroom?.resident;
    if (mtmp && inhishop(mtmp))
        wake_nearto(mtmp.mx | 0, mtmp.my | 0, 11 * 11);
}

/* C ref: invent.c:1612 g_at(x, y) — first COIN_CLASS object on the tile's
 * nexthere chain.  js/cmd.js exports the same function, but cmd.js already
 * imports THIS module, and a cmd.js import here would close that cycle for a
 * helper used on one branch; kept local for the same reason js/mklev.js:1520
 * and js/vault.js's BOULDER/GOLD_PIECE/MON_WEP are local. */
const COIN_CLASS = 12; /* objclass.h */
function g_at(x, y) {
    let obj = game.level?.levelObjects?.[x | 0]?.[y | 0] ?? null;
    while (obj) {
        if ((obj.oclass | 0) === COIN_CLASS)
            return obj;
        obj = obj.nexthere ?? null;
    }
    return null;
}

/* C ref: sounds.c:201-339 dosounds() — ambient dungeon-sound generator.
 * Called once per turn from moveloop_core (allmain.c:405).
 *
 * Each active level flag rolls a gate rn2(N); when the gate returns 0 the
 * matching sound fires, which for the branches that emit rn2 directly inside
 * dosounds() also consumes a message-selection roll. C source order:
 *   nfountains → rn2(400), then if 0: rn2(3)            [sounds.c:213-219]
 *   nsinks     → rn2(300), then if 0: rn2(2)            [sounds.c:220-225]
 *   has_court  → rn2(200), then get_iter_mons(throne_mon_sound) [226-229]
 *   has_swamp  → rn2(200), then if 0: rn2(2), return    [230-237]
 *   has_vault  → rn2(200), then (gd_sound branch), return [238-277]
 *   has_beehive→ rn2(200), then get_iter_mons(beehive_mon_sound) [278-281]
 *   has_morgue → rn2(200), then get_iter_mons(morgue_mon_sound)  [282-285]
 *   has_barracks→rn2(200), then mercenary loop, conditional rn2(3)+return [286-308]
 *   has_zoo    → rn2(200), then get_iter_mons(zoo_mon_sound)     [309-312]
 *   has_shop   → rn2(200), then conditional rn2(2), return [313-329]
 *   has_temple → rn2(200), then get_iter_mons(temple_priest_sound) [330-334]
 *   oracle lvl → rn2(400), then get_iter_mons(oracle_sound)      [335-338]
 *
 * The message roll's bound is independent of Hallucination for fountain/sink/
 * swamp (hallu only shifts the result INDEX, not the rn2 bound), so the rn2
 * call we emit is identical regardless of hallu state.
 *
 * The monster-iteration branches (court/beehive/morgue/barracks/zoo/temple/
 * oracle) only fire their inner rn2 when a qualifying monster sits in the
 * special room (and may early-return); porting those helpers
 * (throne_mon_sound etc.) is a separate task, so this stub fires the gate
 * roll only for those branches. The direct branches (fountain, sink, swamp)
 * are ported faithfully including the message roll and C's early return. */
/* C sounds.c:19-26 mon_in_room(mon, rmtyp) —
 *     int rno = levl[mon->mx][mon->my].roomno;
 *     if (rno >= ROOMOFFSET)
 *         return svr.rooms[rno - ROOMOFFSET].rtype == rmtyp;
 *     return FALSE;
 * RNG-free. */
function mon_in_room(mon, rmtyp) {
    const loc = game.level?.at?.(mon.mx | 0, mon.my | 0);
    const rno = (loc?.roomno) | 0;
    if (rno >= ROOMOFFSET) {
        const croom = (game.level?.rooms ?? [])[rno - ROOMOFFSET];
        return !!croom && (croom.rtype | 0) === (rmtyp | 0);
    }
    return false;
}
/* C sounds.c:68-91 beehive_mon_sound(). */
function beehive_mon_sound(mtmp) {
    const data = mtmp.data;
    if ((data?.mlet | 0) !== 1 /* S_ANT */
        || !((data?.mflags1 | 0) & 0x00000001) /* M1_FLY */
        || !mon_in_room(mtmp, 5 /* BEEHIVE; const.js */))
        return false;
    const selection = rn2(2) + (Hallucination() ? 1 : 0);
    You_hear(selection === 0 ? 'a low buzzing.'
        : selection === 1 ? 'an angry drone.'
            : `bees in your ${game.u?.uarmh ? '' : '(nonexistent) '}bonnet!`);
    return true;
}
/* C mondata.h:66 is_animal(ptr) — `(ptr->mflags1 & M1_ANIMAL) != 0`.
 * Declared locally (monflag.h:103) the same way js/makemon.js:1341 and
 * js/trap.js:1953 declare it; it is not exported from anywhere. */
const M1_ANIMAL_FF = 0x00040000;
/* C sounds.c:113-127 zoo_mon_sound(mtmp) — the get_iter_mons predicate behind
 * dosounds' has_zoo branch.  It draws rn2(2) for EVERY qualifying monster it is
 * handed, and get_iter_mons stops at the first one that returns TRUE, so the
 * draw fires at most once per dosounds call.
 *     if ((mtmp->msleeping || is_animal(mtmp->data))
 *         && mon_in_room(mtmp, ZOO)) {
 *         int hallu = Hallucination ? 1 : 0, selection = rn2(2) + hallu;
 *         You_hear1(zoo_msg[selection]);
 *         return TRUE;
 *     }
 *     return FALSE;
 * The rn2(2) is INSIDE the guard, so a non-qualifying monster draws nothing. */
function zoo_mon_sound(mtmp) {
    if (((mtmp.msleeping | 0)
         || (((mtmp.data?.mflags1 | 0) & M1_ANIMAL_FF) !== 0))
        && mon_in_room(mtmp, ZOO)) {
        const hallu = Hallucination() ? 1 : 0;
        const selection = rn2(2) + hallu;
        const zoo_msg = [
            "a sound reminiscent of an elephant stepping on a peanut.",
            "a sound reminiscent of a seal barking.", "Doctor Dolittle!",
        ];
        You_hear(zoo_msg[selection]);
        return true;
    }
    return false;
}

/* C sounds.c:83-107 morgue_mon_sound().  Keep this predicate local to the
 * ambient-sound replay module: the source helper is static and the needed
 * monster flags are already present on the reconstructed permonst records. */
const M2_UNDEAD_FF = 0x00000002;
const PM_VAMPIRE_FF = 226;
const PM_VAMPIRE_LORD_FF = 227;
const PM_VLAD_THE_IMPALER_FF = 228;
function morgue_mon_sound(mtmp) {
    const data = mtmp.data;
    const undead = ((data?.mflags2 | 0) & M2_UNDEAD_FF) !== 0;
    const vampshifter = (mtmp.cham | 0) === PM_VAMPIRE_FF
        || (mtmp.cham | 0) === PM_VAMPIRE_LORD_FF
        || (mtmp.cham | 0) === PM_VLAD_THE_IMPALER_FF;
    if ((undead || vampshifter) && mon_in_room(mtmp, MORGUE)) {
        const selection = rn2(2) + (Hallucination() ? 1 : 0);
        const hair = body_part(HAIR);
        if (selection === 0) {
            pline("You suddenly realize it is unnaturally quiet.");
        } else if (selection === 1) {
            pline(`The ${hair} on the back of your ${body_part(NECK)} ${vtense(hair, "stand")} up.`);
        } else {
            pline(`The ${hair} on your ${body_part(HEAD)} ${vtense(hair, "seem")} to stand up.`);
        }
        return true;
    }
    return false;
}
export function dosounds_rng() {
    const lf = game.level && game.level.flags;
    if (!lf)
        return;
    /* C sounds.c:206-207 — the FIRST thing dosounds() does:
     *     if (Deaf || !flags.acoustics || u.uswallow || Underwater) return;
     * This guard was missing entirely.  It was inert only because nothing in
     * js/ ever set HDeaf; js/eat.js rottenfood()'s knockout arm now does
     * (eat.c:1845 incr_itimeout(&HDeaf, duration)), and without the guard JS
     * drew a dosounds gate roll on each of seed4500's three unconscious turns
     * where C, being deaf, drew none -- an EXTRA rn2(200) per turn, which is
     * the first RNG divergence after the rotten-food port (leaf 50121).
     * Deaf = (HDeaf || EDeaf || u.uroleplay.deaf) (youprop.h:125), the same
     * expression js/cmd.js:8016 and js/monmove.js:1762 read. */
    const _u = game.u || {};
    if ((_u.HDeaf | 0) || !!(_u.uprops?.[DEAF]?.extrinsic | 0)
        || (_u.uroleplay && _u.uroleplay.deaf)
        || (game.flags && game.flags.acoustics === false)
        || (_u.uswallow | 0) || (_u.uinwater | 0))
        return;
    /* C sounds.c:210 — hallu = Hallucination ? 1 : 0.  For fountain/sink/swamp
     * it only shifts the message INDEX (the rn2 bound is unchanged), but in the
     * vault branch below it selects the switch CASE, so it must be computed. */
    const hallu = Hallucination() ? 1 : 0;
    if (lf.nfountains && !rn2(400)) {
        /* C sounds.c:213-218 — You_hear1(fountain_msg[rn2(3) + hallu]).  The
         * roll was already consumed here; the MESSAGE was dropped, which costs
         * screen points even though the RNG stream stayed aligned (seed0030
         * segment 7 step 21: C "You hear bubbling water.", JS a blank topline). */
        const fountain_msg = [
            "bubbling water.", "water falling on coins.",
            "the splashing of a naiad.", "a soda fountain!",
        ];
        You_hear(fountain_msg[rn2(3) + hallu]);
    }
    if (lf.nsinks && !rn2(300)) {
        /* C sounds.c:220-224 — You_hear1(sink_msg[rn2(2) + hallu]). */
        const sink_msg = [
            "a slow drip.", "a gurgling noise.", "dishes being washed!",
        ];
        You_hear(sink_msg[rn2(2) + hallu]);
    }
    if (lf.has_court && !rn2(200)) {
        /* C sounds.c:226-229 — `if (get_iter_mons(throne_mon_sound)) return;`.
         * The return is INSIDE the get_iter_mons test: C falls through to
         * has_swamp when no qualifying COURT monster is found (the common
         * case — throne_mon_sound's own rn2(3) is WIRE_PENDING, not modelled
         * here).  This branch used to `return` unconditionally on the gate
         * alone, which desyncs the tape by however many draws the REST of
         * dosounds would have made on a no-monster turn (e.g. the oracle
         * rn2(400) at sounds.c:335 goes unconsumed — same defect class as the
         * has_beehive/has_morgue/has_barracks/has_temple branches below). */
    }
    if (lf.has_swamp && !rn2(200)) {
        /* C sounds.c:230-236 — You1(swamp_msg[rn2(2) + hallu]).  Note C uses
         * You1 (prefix "You "), not You_hear1: the strings carry their own
         * "hear"/"smell" verb. */
        const swamp_msg = [
            "hear mosquitoes!", "smell marsh gas!", /* so it's a smell... */
            "hear Donald Duck!",
        ];
        pline("You " + swamp_msg[rn2(2) + hallu]);
        return; /* C: unconditional return after swamp sound (sounds.c:236) */
    }
    if (lf.has_vault && !rn2(200)) {
        /* C sounds.c:238-277 — the vault branch, now ported in full.
         *
         *   if (!(sroom = search_special(VAULT))) {
         *       svl.level.flags.has_vault = 0;   /_ "strange ..." _/
         *       return;
         *   }
         *   if (gd_sound())
         *       switch (rn2(2) + hallu) { ... }
         *   return;
         *
         * The rn2(2) is INSIDE the gd_sound() gate, so it fires only when no
         * guard is active and the hero is not standing in the vault.  This is
         * the call seed0005 was missing at turn 46 (leaf 3595: C rn2(2)=0 here
         * vs JS falling straight through to gethungry's rn2(20)). */
        const sroom = search_special(VAULT);
        if (!sroom) {
            /* strange ... */
            lf.has_vault = 0;
            return;
        }
        if (gd_sound()) {
            switch (rn2(2) + hallu) {
            case 1: {
                let gold_in_vault = false;

                for (let vx = sroom.lx | 0; vx <= (sroom.hx | 0); vx++)
                    for (let vy = sroom.ly | 0; vy <= (sroom.hy | 0); vy++)
                        if (g_at(vx, vy))
                            gold_in_vault = true;
                /* C: ROOM_INDEX(sroom) is the pointer offset of sroom within
                 * svr.rooms[]; the port's equivalent is its array index. */
                if (vault_occupied(game.u.urooms)
                    !== (ROOM_INDEX(sroom) + ROOMOFFSET)) {
                    if (gold_in_vault) {
                        You_hear(!hallu
                                 ? "someone counting gold coins."
                                 : "the quarterback calling the play.");
                    } else {
                        /* C: Soundeffect(se_someone_searching, 30) — audio
                         * only, no screen or RNG effect. */
                        You_hear("someone searching.");
                    }
                    break;
                }
            }
            /* FALLTHRU (C sounds.c:265-266) */
            case 0:
                /* C: Soundeffect(se_guards_footsteps, 30) — audio only. */
                You_hear("the footsteps of a guard on patrol.");
                break;
            case 2:
                You_hear("Ebenezer Scrooge!");
                break;
            }
        }
        return; /* C sounds.c:277 */
    }
    if (lf.has_beehive && !rn2(200)) {
        if (get_iter_mons(beehive_mon_sound))
            return;
    }
    if (lf.has_morgue && !rn2(200)) {
        /* C sounds.c:282-285 — the callback's rn2(2) is conditional on a
         * live undead or vampire-shifter in the morgue. */
        if (get_iter_mons(morgue_mon_sound))
            return;
    }
    if (lf.has_barracks && !rn2(200)) {
        /* C sounds.c:286-308 — the mercenary loop only `return`s once it finds
         * a qualifying mercenary (drawing barracks_msg's rn2(3) at that point);
         * with no such monster it falls through to has_zoo, same as above
         * (WIRE_PENDING: the fmon mercenary scan). */
    }
    if (lf.has_zoo && !rn2(200)) {
        /* C sounds.c:309-312:
         *     if (svl.level.flags.has_zoo && !rn2(200)) {
         *         if (get_iter_mons(zoo_mon_sound))
         *             return;
         *     }
         * Note the return is INSIDE the get_iter_mons test — when no monster
         * qualifies, C falls through to the has_shop gate.  This branch used to
         * be `return;` with a WIRE_PENDING note; both halves were wrong for the
         * same reason, since zoo_mon_sound's rn2(2) is exactly the draw the
         * unconditional return skipped.
         *
         * MEASURED on gen104-reseed-seed289322 (train) at session step 334:
         * C draws rn2(200)=0 @dosounds(sounds.c:309) — which this port matched —
         * and then rn2(2)=0 @zoo_mon_sound(sounds.c:119), global leaf 54364.
         * This port returned from dosounds there and its next draw was
         * gethungry's rn2(20); that was the first RNG-value divergence after
         * link 3. */
        if (get_iter_mons(zoo_mon_sound))
            return;
    }
    if (lf.has_shop && !rn2(200)) {
        /* C sounds.c:313-329 — the shop branch, now ported in full.
         *
         *   if (!(sroom = search_special(ANY_SHOP))) {
         *       svl.level.flags.has_shop = 0;   /_ "strange..." _/
         *       return;
         *   }
         *   if (tended_shop(sroom)
         *       && !strchr(u.ushops, (int) (ROOM_INDEX(sroom) + ROOMOFFSET))) {
         *       You_hear1(shop_msg[rn2(2) + hallu]);
         *       noisy_shop(sroom);
         *   }
         *   return;
         *
         * The rn2(2) is INSIDE the tended_shop gate AND the "hero is not
         * standing in this shop" gate, exactly like the vault branch's
         * gd_sound() gate above.  Firing only the rn2(200) here was
         * seed0030 segment 3's first RNG divergence: C draws rn2(2)=0 at
         * sounds.c:325 and JS fell straight through to gethungry's rn2(20). */
        const sroom = search_special(ANY_SHOP);
        if (!sroom) {
            /* strange... */
            lf.has_shop = 0;
            return;
        }
        if (tended_shop(sroom) && !_ushops_has(ROOM_INDEX(sroom) + ROOMOFFSET)) {
            /* C sounds.c:319-323 — static shop_msg[3]. */
            const shop_msg = [
                "someone cursing shoplifters.",
                "the chime of a cash register.",
                "Neiman and Marcus arguing!",
            ];
            /* C pline.c You_hear1(str) — You_hear with a literal string. */
            You_hear(shop_msg[rn2(2) + hallu]);
            noisy_shop(sroom);
        }
        return; /* C sounds.c:328 */
    }
    if (lf.has_temple && !rn2(200)) {
        /* C sounds.c:330-334 — `has_temple && !rn2(200)
         *   && !(Is_astralevel || Is_sanctum)) { if (get_iter_mons(...)) return; }`.
         * The rn2(200) draw fires regardless of astral/sanctum (C's && evaluates
         * left-to-right, so the draw happens before that conjunct is checked);
         * only the RETURN is conditional on finding a qualifying priest, so this
         * falls through on Astral/Sanctum or no qualifying monster
         * (WIRE_PENDING: temple_priest_sound port). */
    }
    /* C sounds.c:335-338:
     *     if (Is_oracle_level(&u.uz) && !rn2(400)) {
     *         if (get_iter_mons(oracle_sound)) return;
     *     }
     * The gate roll is unconditional on the Oracle level and was previously
     * omitted entirely, so JS skipped a draw C made. Measured on
     * seed4500-knight-coverage step 211, once the Oracle level actually
     * generates: C draws rn2(400)=100 here and JS went straight on to
     * gethungry(eat.c:3191).
     * The INNER get_iter_mons(oracle_sound) rn2(3) (sounds.c:326) is not
     * modelled — same WIRE_PENDING convention as the eight monster-iteration
     * branches above (court/beehive/morgue/barracks/zoo/shop/temple), which all
     * fire only their gate roll. It is unreachable whenever rn2(400) != 0, and
     * porting get_iter_mons plus the *_sound helpers is a separate task. */
    if (Is_oracle_level(game.u?.uz) && !rn2(400)) {
        return; /* C: get_iter_mons(oracle_sound) — see above. */
    }
}
/* C ref: allmain.c:413 u_wipe_engr condition — rn2(40 + ACURR(A_DEX)*3).
 * ACURR(A_DEX) = clamp(u.abon.a[DEX] + u.atemp.a[DEX] + u.acurr.a[DEX], 3, 25)
 * (attrib.c:1206 acurr()) — must go through the canonical acurr() helper,
 * not read u.acurr.a[] alone, or bonuses/temp deltas and the clamp are lost. */
function u_wipe_engr_rng() {
    const g = game;
    const dex = (g.u) ? (acurr(g.u, A_DEX) | 0) : 14;
    /* C allmain.c:413-414 — `if (!rn2(40 + ACURR(A_DEX)*3)) u_wipe_engr(rnd(3));`.
     * The rnd(3) is the call ARGUMENT, evaluated (and thus consumed) ONLY when the
     * gate fires (rn2(...)==0).  u_wipe_engr()->wipe_engr_at() consumes further RNG
     * (rn2 in wipe_engr_at, engrave.c:279/281) only when an engraving exists at the
     * hero's square AND can_reach_floor; the engraving subsystem is not yet ported,
     * so that branch (no engraving on the floor here) consumes nothing more — which
     * matches C's stream on this session (rnd(3) then straight to distfleeck). */
    if (!rn2(40 + dex * 3))
        rnd(3);
}
/* C timeout.c:197-253 vomiting_dialogue, at the head of the once-per-turn
 * block before sounds.c.  Tripe sets this timeout in eat.c:2144; omitting the
 * dialogue lost both its topline and exercise(A_CON,FALSE)'s rn2(2), so the
 * following dosounds gate became the apparent first RNG divergence. */
/* C eat.c:3920-3955 Popeye(VOMITING): only an unknown accessible tin
 * might help; no known tin cures vomiting. */
function vomiting_tin_might_help() {
    if (game.occupation !== opentin) return false;
    const tin = game.context?.tin?.tin;
    if (!tin) return false;
    if (tin.where !== 3 && (!obj_here(tin, game.u.ux, game.u.uy)
        || !can_reach_floor(true))) return false;
    return !tin.known;
}
export async function vomiting_dialogue_ff() {
    const u = game.u;
    const p = u?.uprops?.[VOMITING];
    if (!p || !((p.intrinsic | 0) & TIMEOUT)) return;
    const i = ((p.intrinsic | 0) & TIMEOUT) - 1;
    const cant = cantvomit(game.youmonst?.data);
    const hallu = !!(u.uprops?.[HALLUC]?.intrinsic | 0)
        && !((u.uprops?.[HALLUC_RES]?.intrinsic | 0)
            || (u.uprops?.[HALLUC_RES]?.extrinsic | 0));
    let text = null;
    switch (i) {
    case 14: text = 'You are feeling mildly nauseated.'; break;
    case 11:
        text = (u.uprops?.[CONFUSION]?.intrinsic | 0)
            ? 'You feel slightly more confused.' : 'You feel slightly confused.';
        break;
    case 6:
        await make_stunned(((u.uprops?.[STUNNED]?.intrinsic | 0) & TIMEOUT) + d(2, 4), false);
        if (!vomiting_tin_might_help()) await stop_occupation();
        // C FALLTHROUGH.
    case 9:
        await make_confused(((u.uprops?.[CONFUSION]?.intrinsic | 0) & TIMEOUT) + d(2, 4), false);
        if ((game.multi | 0) > 0) nomul(0);
        break;
    case 8:
        text = (u.uprops?.[STUNNED]?.intrinsic | 0)
            ? "You can't think straight." : "You can't seem to think straight.";
        break;
    case 5: text = 'You feel incredibly sick.'; break;
    case 2:
        text = cant ? 'You gag uncontrollably.'
            : hallu ? 'You are about to hurl!' : 'You are about to vomit.';
        break;
    case 0:
        await stop_occupation();
        if (!cant) {
            await morehungry(20);
            if ((u.uhs | 0) < FAINTING)
                await pline(hallu ? 'You hurl chunks!' : 'You vomit!');
        }
        await vomit();
        break;
    }
    if (text) await pline(text);
    exercise(A_CON, false);
}

// Per-step leaf RNG calls
// C ref: allmain.c moveloop_core() — per-turn block fires in order:
//   mcalcmove×N (rn2(12) per monster), rn2(70) makemon,
//   dosounds (rn2(400) if nfountains, rn2(300) if nsinks, rn2(200) if has_court/has_swamp/has_vault),
//   gethungry() [eat.c:3191 rn2(20) + newuhs], exerchk (rn2(19) or rn2(2)),
//   u_wipe_engr condition rn2(40 + DEX*3).
// gethungry() replaces the former hardcoded rn2(20) at that position.
export async function fastforward_step(stepNum) {
    const steps = [
        /* step 1: use no-dochug generic turn — at the initial mapstate checkpoint all
         * monsters have movement=0 so C's movemon() fires 0 RNG. Generic no-dochug
         * variant fires only mcalcmove (rn2(12)/monster) + rest of per-turn block.
         * C ref: allmain.c:274-290 mcalcmove+makemon, allmain.c:405 dosounds,
         * allmain.c:407 gethungry, allmain.c:413 u_wipe_engr. */
        async () => { await fastforward_step_generic_turn_nodochug(); },
        /* steps 2-10: C ref allmain.c:262-414 — the full per-turn block driven
         * uniformly by the real movemon dispatch.
         * W26 (gate flip): the former seed8000-pinned m_move rn2 prefixes
         * (rn2(5)+rn2(32)+… etc.) are REMOVED. With GATE_ON the movemon dispatch
         * (fmon_dochug_dispatch) drives dochug exactly once per movement>=NORMAL_SPEED
         * monster and m_move/distfleeck fire their own RNG against accurate monster
         * state + the C-faithful mfndpos cnt. fastforward_step_generic_turn() runs
         * dochug-dispatch → mcalcmove → makemon → u_calc_moveamt → dosounds →
         * gethungry → exerchk → u_wipe_engr in C order. */
        async () => { await fastforward_step_generic_turn(); },
        async () => { await fastforward_step_generic_turn(); },
        async () => { await fastforward_step_generic_turn(); },
        async () => { await fastforward_step_generic_turn(); },
        async () => { await fastforward_step_generic_turn(); },
        async () => { await fastforward_step_generic_turn(); },
        async () => { await fastforward_step_generic_turn(); },
        async () => { await fastforward_step_generic_turn(); },
        async () => { await fastforward_step_generic_turn(); },
    ];
    if (stepNum > 0 && stepNum <= steps.length) {
        await steps[stepNum - 1]();
        return;
    }
    if (stepNum > steps.length) {
        /* Generic per-turn block for steps beyond the calibrated table.
         * Mirrors C allmain.c:262-414 with minimum monster count = 1
         * (the pet from makedog) and no special level flags. */
        await fastforward_step_generic_turn();
    }
}
// C ref: allmain.c:262-414 moveloop_core per-turn block.
// Steps 1-10 use a calibrated table (per-monster mcalcmove counts known
// from seed8000). Steps 11+ use a generic per-turn block: walk the live
// fmon chain for dochug+mcalcmove, then makemon, then dosounds using actual level
// flags (nfountains → rn2(400), nsinks → rn2(300), has_court/has_swamp/has_vault → rn2(200)),
// then gethungry(), then u_wipe_engr using actual hero DEX. Mirrors C allmain.c:274-414 order.
//
// NOTE: step 1 uses fastforward_step_generic_turn_nodochug() because monsters start at
// movement=0 (from the initial mapstate checkpoint) and C's movemon() fires 0 RNG when
// no monster has movement >= NORMAL_SPEED. Steps 11+ use fastforward_step_generic_turn()
// which includes dochug dispatch, since by then monsters have accumulated movement.
/* Generic turn for step 1 only — no dochug dispatch because monsters have
 * movement=0 at the initial mapstate checkpoint (C's movemon fires 0 RNG).
 * C ref: allmain.c:263 — movemon() returns FALSE immediately (no monster can move),
 * then mcalcmove allocates movement for the next turn. */
async function fastforward_step_generic_turn_nodochug() {
    /* C ref: allmain.c:274-281 mcalcmove loop: one rn2(12) per monster in fmon. */
    await fmon_mcalcmove();
    /* C ref: allmain.c:286-290 — makemon probability.
     * When rn2(70)===0, C calls makemon(NULL,0,0,NO_MM_FLAGS) which fires
     * makemon_rnd_goodpos (rn1(77)+2, rn2(21) per attempt) + next_ident + newmonhp etc.
     * makemon is declared async but contains no awaits, so it resolves synchronously. */
    await maybe_generate_rnd_mon();
    /* C ref: allmain.c:292 u_calc_moveamt() — rn2(3) when Fast or Very_fast;
     * Stage 1: applies result to g.u.umovement (RNG position unchanged). */
    /* C allmain.c:261 mvl_wtcap = near_capacity() — recomputed after the
     * monster-move loop; threaded into u_calc_moveamt (consumes no RNG). */
    u_calc_moveamt(near_capacity());
    /* C ref: allmain.c:395-397 — intrinsic autosearch: if (Searching &&
     * !noautosearch && gm.multi >= 0) dosearch0(1).  Fires BEFORE dosounds. */
    autosearch_rng();
    /* C ref: allmain.c:405 dosounds() — dynamic level-flag dispatch. */
    dosounds_rng();
    /* C ref: allmain.c:407 gethungry(). */
    await gethungry();
    /* C ref: allmain.c:408 age_spells() — decrement spell retention (no RNG). */
    age_spells();
    /* C ref: allmain.c:409 exerchk(). */
    exerchk();
    /* C ref: allmain.c:413 u_wipe_engr condition — dynamic DEX lookup. */
    u_wipe_engr_rng();
}
/* Generic turn for steps 11+ — includes dochug dispatch before mcalcmove.
 * C ref: allmain.c:253 movemon() loop fires dochug for each monster with
 * movement >= NORMAL_SPEED (allocated in the previous turn's mcalcmove),
 * then allmain.c:274-281 mcalcmove refills monster movement.
 * W24.2: fmon_dochug_dispatch replaces the step-prefix-mmove-pin pattern. */
async function fastforward_step_generic_turn() {
    /* C ref: allmain.c:253 movemon() loop → dochugw → dochug per monster.
     * Fires before mcalcmove: monsters use movement accumulated in previous turn. */
    await fmon_dochug_dispatch();
    /* C ref: allmain.c:274-281 mcalcmove loop: one rn2(12) per monster in fmon. */
    await fmon_mcalcmove();
    /* C ref: allmain.c:286-290 — makemon probability.
     * !udemigod and not deeper than stronghold (common case) → rn2(70).
     * When rn2(70)===0, C calls makemon(NULL,0,0,NO_MM_FLAGS) which fires
     * makemon_rnd_goodpos + next_ident + newmonhp + peaceMinded etc. */
    await maybe_generate_rnd_mon();
    /* C ref: allmain.c:292 u_calc_moveamt() — rn2(3) when Fast or Very_fast;
     * Stage 1: applies result to g.u.umovement (RNG position unchanged). */
    /* C allmain.c:261 mvl_wtcap = near_capacity() — recomputed after the
     * monster-move loop; threaded into u_calc_moveamt (consumes no RNG). */
    u_calc_moveamt(near_capacity());
    /* C ref: allmain.c:395-397 — intrinsic autosearch: if (Searching &&
     * !noautosearch && gm.multi >= 0) dosearch0(1).  Fires BEFORE dosounds. */
    autosearch_rng();
    /* C ref: allmain.c:405 dosounds() — dynamic level-flag dispatch. */
    dosounds_rng();
    /* C ref: allmain.c:407 gethungry(). */
    await gethungry();
    /* C ref: allmain.c:408 age_spells() — decrement spell retention (no RNG). */
    age_spells();
    /* C ref: allmain.c:409 exerchk() — exercise/abuse attribute roll.
     * exerchk loops over 4 physical attributes (STR/CON/DEX/WIS) and
     * fires rn2(19) (gain branch) or rn2(2) (loss branch) per attribute
     * conditionally on u.aexe[i] state. Per L9 P3 seed2200 (92.2%) first
     * divergence is rn2(2) @ exercise(attrib.c:509) — exerchk loss branch. */
    exerchk();
    /* C ref: allmain.c:413 u_wipe_engr condition — dynamic DEX lookup. */
    u_wipe_engr_rng();
}

/* ════════════════════════════════════════════════════════════════════════════
 * FAITHFUL moveloop_core per-turn path (docs/replay-core-rewrite-plan.md Stage A)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * FLAG-GATED OFF by default.  When FF_FAITHFUL is falsy the calibrated
 * fastforward_step() table above runs unchanged (the 11 passing stay
 * leaf-identical).  When truthy, allmain.js's moveloop_core drives the NEW
 * faithful path below: it reproduces C's moveloop_core (allmain.c:241-476)
 * per-turn block from the REAL game state (u.umovement do-while, the live fmon
 * roster) sliced at C's per-turn (svm.moves) boundaries, NOT the g.moves-indexed
 * calibrated step table.
 *
 * The leaf functions are NOT re-ported: the faithful path REUSES the same
 * fmon_dochug_dispatch (MOVEMON), fmon_mcalcmove / makemon / u_calc_moveamt /
 * autosearch_rng / dosounds_rng / gethungry / exerchk / u_wipe_engr_rng (HEAD)
 * the calibrated path uses.  The rewrite is the ORCHESTRATION + slicing.
 *
 * The C structure (allmain.c:241-296), sliced into the two RNG-bearing phases:
 *
 *   if (svc.context.move) {
 *     u.umovement -= NORMAL_SPEED;           // allmain.c:245
 *     do {                                   // "hero can't move this turn" outer
 *       do {                                 // movemon inner loop
 *         monscanmove = movemon();           //  ── PHASE: MOVEMON ──
 *         if (u.umovement >= NORMAL_SPEED) break;   // banked: hero acts again
 *       } while (monscanmove);
 *       if (!monscanmove && u.umovement < NORMAL_SPEED) {
 *         mcalcmove loop over fmon;          //  ── PHASE: HEAD ──
 *         if (!rn2(70)) makemon();
 *         u_calc_moveamt(wtcap);
 *         svm.moves++;                       //  <-- THE TURN COUNTER
 *         dosounds(); gethungry(); ...
 *         if (!rn2(40+DEX*3)) u_wipe_engr();
 *         harness_emit_mapstate_turn("turn_end");   // <-- CAPTURE
 *       }
 *     } while (u.umovement < NORMAL_SPEED);
 *     // ── PHASE: SEER ── (driven in allmain.js, the moveloop_core owner)
 *     if (svm.moves >= seer_turn) seer_turn = svm.moves + rn1(31,15);
 *   }
 *
 * KEY SLICING FACT (verified against tools/c-turn-spec.mjs on seed8000): in ONE
 * moveloop_core invocation for a time-consuming key, C runs MOVEMON FIRST (the
 * monsters spend the rations the PREVIOUS turn's HEAD allotted), THEN the HEAD
 * new-turn block (allots THIS turn's rations + svm.moves++).  So the leaves of
 * one invocation are  MOVEMON(prev turn) ... HEAD(new turn) ... capture(new) ...
 * SEER.  c-turn-spec attributes those MOVEMON leaves to the PRIOR turn (whose
 * rations they spend) — turn N owns  HEAD(N) ^mapstate(N) SEER(N) MOVEMON(N),
 * with MOVEMON(N) physically firing at the START of the NEXT invocation.  The
 * faithful orchestration below preserves that exact emission order.
 *
 * ── FF_FAITHFUL flag ──────────────────────────────────────────────────────── */
/* DEFAULT ON (2026-06-01): the faithful moveloop_core is the scored path.  It
 * holds the 12 PASSes (the 11 prior + seed1900 PASS#12) leaf-for-leaf and is
 * net +643 sequential-depth vs the retired calibrated step-table.  Set
 * FF_FAITHFUL=0 in the env to fall back to the calibrated path (11/64) for
 * comparison/rollback.  The only sessions below the calibrated path under the
 * faithful default are seed0362/seed0363 (−47, both already-failing), blocked
 * by the unported Ctrl-V wizard level-teleport command — tracked separately,
 * not a moveloop regression (per-turn faithfulness verified; see GATES.md). */
export const FF_FAITHFUL = !(typeof process !== 'undefined'
    && ENV && ENV.FF_FAITHFUL === '0');

/* PHASE: MOVEMON — ONE movemon() pass (mon.c:1314), the body of the inner
 * do-while of allmain.c:252-256:
 *   do { monscanmove = movemon(); if (u.umovement >= NORMAL_SPEED) break; }
 *   while (monscanmove);
 * ff_movemon_phase is the single-pass primitive (ff_movemon_one_pass): it walks
 * fmon once, dochug's every monster with movement >= NORMAL_SPEED, decrements, and
 * returns gs.somebody_can_move.  The somebody_can_move REPEAT and the hero-banked
 * `if (u.umovement >= NORMAL_SPEED) break` are run by the CALLER
 * (faithful_moveloop_turn), so the break correctly stops the drain BETWEEN passes
 * — a Fast hero's banked move ends monster movement after one pass, carrying any
 * leftover monster movement to the next turn (the door-arrival coupling: collapsing
 * the repeat into this function drained the pet's second move at the wrong turn,
 * firing a spurious obj_resists food scan).  Returns monscanmove for the inner
 * do-while gate. */
export async function ff_movemon_phase() {
    /* C mon.c:1314 movemon() — ONE pass.  Returns gs.somebody_can_move (whether a
     * monster still has a banked move).  The faithful per-turn loop
     * (faithful_moveloop_turn, allmain.c:252-256) runs the do{...}while(monscanmove)
     * repeat AND breaks it on the hero-banked condition (u.umovement >= NORMAL_SPEED),
     * so a Fast hero's banked turn drains exactly ONE monster pass before the hero
     * acts again — leftover monster movement carries to the next turn (seed0017
     * turn 4: the pet moves once at the door square, its second move is turn 5). */
    return await ff_movemon_one_pass();
}

/* PHASE: HEAD, PART A — the pre-svm.moves++ portion of the new-turn block
 * (allmain.c:274-294): mcalcmove×roster (rn2(12) each), makemon gate rn2(70),
 * u_calc_moveamt (rn2(3) if Fast, banks the hero ration the do-while gate reads).
 * These run BEFORE the turn counter increments (C allmain.c:295 svm.moves++). */
/* C allmain.c:173 `static int mvl_wtcap = 0;` — the turn block's ONE
 * encumbrance reading.  C computes it once (allmain.c:220, after the monster
 * loop, "in case monster actions affected burden") and threads the SAME value
 * into u_calc_moveamt(), regen_hp(), the overexert gate and regen_pw().  This
 * port recomputed it for u_calc_moveamt and then passed a hardcoded
 * UNENCUMBERED to both regen calls, which is not a conservative default: it is
 * the value that makes their gates PASS.  seed4500-knight-coverage is
 * Overloaded as a brown mold from step 1441, so C's regen_pw() returns without
 * drawing and this port drew its rn1(upper,1) every eligible turn (leaf
 * 100557, one turn's worth of drift per draw). */
let mvl_wtcap = 0;
export async function ff_head_phase_pre() {
    /* C allmain.c:274-281 — reallocate movement rations: one rn2(12) per live mon. */
    await fmon_mcalcmove();
    /* C allmain.c:286-290 — occasional makemon: rn2(70) gate. */
    await maybe_generate_rnd_mon();
    /* C allmain.c:292 — u_calc_moveamt(): rn2(3) when Fast/Very_fast, banks
     * moveamt into u.umovement (the do-while gate the orchestrator reads). */
    /* C allmain.c:220 mvl_wtcap = near_capacity() — recomputed after the
     * monster-move loop ("in case monster actions affected burden"), then
     * threaded into u_calc_moveamt AND the once-per-turn block in
     * ff_head_phase_post (consumes no RNG). */
    mvl_wtcap = near_capacity();
    u_calc_moveamt(mvl_wtcap);
    /* C allmain.c:293 — settrack(): record hero footstep into the track ring
     * buffer (no RNG).  Pet AI (dog_goal FARAWAY -> gettrack) reads this.
     * Runs AFTER u_calc_moveamt, BEFORE svm.moves++. */
    settrack();
}

/* C ref: allmain.c:621 — #define U_CAN_REGEN() (Regeneration || (Sleepy && u.usleep)),
 * with youprop.h:345 #define Regeneration (HRegeneration || ERegeneration), i.e.
 * u.uprops[REGENERATION].intrinsic || u.uprops[REGENERATION].extrinsic.
 *
 * This used to `return false` under a comment claiming "the Regeneration
 * intrinsic (ring/property) is not yet ported (no property infrastructure)".
 * That claim was FALSE when it was written: js/do_wear.js setworn_ring() has
 * been conferring `u.uprops[MKOBJ_OC_OPROP[otyp]].extrinsic |= mask` for every
 * property ring (oc_oprop for the ring of regeneration is 57 = REGENERATION),
 * js/eat.js:328 already reads both halves of the same record, and
 * js/polyself.js:285 PROPSET()s it from M1_REGEN on polymorph.  The stub cost
 * seed5006 segment 0 outright: the Tourist wishes for and wears a ring of
 * regeneration, so C heals 1 hp on every turn spent below full health
 * (`heal = (u.ulevel + ACURR(A_CON)) > rn2(100); if (U_CAN_REGEN()) heal += 1`)
 * and is back at full HP by the end of the turn a sewer rat bites her.  This
 * port drew the same rn2(100)=96 — which loses, 1+15 > 96 being false — and
 * then did NOT add the ring's +1, so it sat one hp below C from step 127 to the
 * end of the segment.  That in turn kept the regen_hp CALL-SITE gate
 * (u.uhp < u.uhpmax) true for the rest of the run, so this port drew an extra
 * rn2(100) every turn where C, at full health, drew none: the segment's first
 * RNG divergence at leaf 8468, JS rn2(100)@regen_hp against C
 * rn2(400)@dosounds(sounds.c:213).  One dead predicate, both axes.
 *
 * Sleepy is the SLEEPY property (restful-sleep amulet) and u.usleep is the
 * timeout.c fall_asleep marker; both are live state fields here. */
function u_can_regen(u) {
    return _has_regeneration(u) || _restful_sleep(u);
}
function _has_regeneration(u) {
    const p = u && u.uprops ? u.uprops[REGENERATION] : null;
    return !!p && (((p.intrinsic | 0) | (p.extrinsic | 0)) !== 0);
}
function _has_prop(u, prop) {
    const p = u && u.uprops ? u.uprops[prop] : null;
    return !!p && (((p.intrinsic | 0) | (p.extrinsic | 0)) !== 0);
}
function _restful_sleep(u) {
    const p = u && u.uprops ? u.uprops[SLEEPY] : null;
    return !!u?.usleep && !!p
        && (((p.intrinsic | 0) | (p.extrinsic | 0)) !== 0);
}

/* C ref: allmain.c:695-750 regen_hp() — maybe recover some lost health.
 * Called once per turn from moveloop_core (allmain.c:347), GATED at the call
 * site (allmain.c:341-348) so it only runs when:
 *   !Upolyd ? (u.uhp < u.uhpmax) : (u.mh < u.mhmax || mlet==S_EEL)
 * The gate is replicated in ff_head_phase_post (the rn2(100) must NOT fire when
 * the hero is already at full HP — that is C's exact stream).
 *
 * The !Upolyd branch (allmain.c:724-745) is the one that consumes RNG:
 *   if (u.uhp < u.uhpmax && (encumbrance_ok || U_CAN_REGEN())) {
 *       heal = (u.ulevel + ACURR(A_CON)) > rn2(100);   <-- the rn2(100)
 *       if (U_CAN_REGEN()) heal += 1;
 *       if (Sleepy && u.usleep) heal++;
 *       if (heal) { u.uhp += heal; if (u.uhp > u.uhpmax) u.uhp = u.uhpmax; }
 *   }
 * encumbrance_ok = (wtcap < MOD_ENCUMBER || !u.umoved); wtcap=UNENCUMBERED(0)
 * here, so encumbrance_ok is TRUE and the rn2(100) fires whenever uhp<uhpmax.
 *
 * The Upolyd branch (allmain.c:702-721) heals u.mh instead, and — for every
 * poly form except an eel out of water — consumes NO RNG at all.  It used to be
 * left unported on the assumption that "no Upolyd hero state in replay"; that
 * became false the moment a session polymorphed the hero (seed5500 step 869
 * zaps a wand of polymorph at self and becomes a warhorse), and the !Upolyd
 * body then fired an rn2(100) C never draws — the session's first RNG-value
 * divergence right after the poly (C's next call is dosounds' rn2(400)). */
 // PARKED-NOTE: session=seed5500 citation-only
async function regen_hp(wtcap) {
    const u = game.u;
    if (!u)
        return;
    /* encumbrance_ok = (wtcap < MOD_ENCUMBER || !u.umoved) — C allmain.c:700. */
    const encumbrance_ok = ((wtcap | 0) < MOD_ENCUMBER) || !(u.umoved | 0);
    let heal = 0;
    /* C allmain.c:697 — boolean reached_full = FALSE. */
    let reached_full = false;
    if (Upolyd(u)) {
        /* C allmain.c:702-722 — the polymorphed hero heals u.mh, not u.uhp. */
        const mh = (u.mh | 0), mhmax = (u.mhmax | 0);
        if (mh < 1) {
            /* C allmain.c:703-704 "shouldn't happen..." → rehumanize(). */
            await rehumanize();
        } else if (_uasmon_mlet(u) === S_EEL_FF
                   && !_ff_is_pool(u.ux | 0, u.uy | 0) && !Is_waterlevel(u.uz)
                   && !_hero_breathless(u)) {
            /* C allmain.c:707-713 — an eel out of water LOSES hp, and this is
             * the ONLY Upolyd arm that draws RNG:
             *   if (u.mh > 1 && !Regeneration && rn2(u.mh) > rn2(8)
             *       && (!Half_physical_damage || !(svm.moves % 2L))) heal = -1;
             */
            const halfPhys = _has_prop(u, HALF_PHDAM);
            if (mh > 1 && !_has_regeneration(u) && rn2(mh) > rn2(8)
                && (!halfPhys || !((game.moves | 0) % 2)))
                heal = -1;
        } else if (mh < mhmax) {
            /* C allmain.c:714-717 — RNG-free regen: one hp every 20 moves. */
            if (u_can_regen(u)
                || (encumbrance_ok && ((game.moves | 0) % 20) === 0))
                heal = 1;
        }
        if (heal) {
            (game.disp ||= {}).botl = 1;
            u.mh = mh + heal;
            /* C allmain.c:717 — reached_full = (u.mh == u.mhmax). */
            reached_full = ((u.mh | 0) === mhmax);
        }
    } else {
        /* C allmain.c:729 — !Upolyd branch. */
        const uhp = (u.uhp | 0), uhpmax = (u.uhpmax | 0);
        if (uhp < uhpmax && (encumbrance_ok || u_can_regen(u))) {
            /* C allmain.c:730 — heal = (u.ulevel + ACURR(A_CON)) > rn2(100). */
            heal = ((u.ulevel | 0) + (acurr(u, A_CON) | 0)) > rn2(100) ? 1 : 0;
            if (u_can_regen(u))
                heal += 1;
            if (_restful_sleep(u))
                heal += 1;
            if (heal) {
                (game.disp ||= {}).botl = 1;
                u.uhp = uhp + heal;
                if ((u.uhp | 0) > uhpmax)
                    u.uhp = uhpmax;
                /* C allmain.c:738 — "stop voluntary multi-turn activity if now
                 * fully healed": reached_full = (u.uhp == u.uhpmax). */
                reached_full = ((u.uhp | 0) === uhpmax);
            }
        }
    }
    /* C allmain.c:742-743 — if (reached_full) interrupt_multi("You are in full
     * health.").  RNG-free, and with `!verbose` it prints nothing at all — its
     * whole observable effect is the nomul(0) that ends a counted rest early.
     * See js/allmain.js interrupt_multi for the seed4500 step-1067 measurement. */
    if (reached_full)
        interrupt_multi("You are in full health.");
}

/* C monst.h S_EEL — the eel monster class letter; only regen_hp's out-of-water
 * arm needs it here. */
const S_EEL_FF = 57;
/* C youprop.h Breathless = magical breathing or the current form's flag. */
function _hero_breathless(u) {
    return _has_prop(u, MAGICAL_BREATHING)
        || pooleffects_breathless(game.youmonst?.data);
}
/* C mondata.h — gy.youmonst.data->mlet for the polymorphed hero.  set_uasmon()
 * points youmonst.data at mons[u.umonnum]; column 0 of makemon_mons.json is
 * mlet (see js/makemon.js:1205 column map). */
function _uasmon_mlet(u) {
    const mndx = (u.umonnum | 0);
    const row = (mndx >= 0 && mndx < MONS.length) ? MONS[mndx] : null;
    return row ? (row[0] | 0) : -1;
}
/* C dbridge.c is_pool() — includes moat-under-drawbridge semantics, unlike a
 * raw tile-type check. */
function _ff_is_pool(x, y) {
    return is_pool(x, y);
}

/* C ref: allmain.c:670-690 regen_pw() — maybe recover some lost power.
 * Called once per turn from moveloop_core (allmain.c:358), UNCONDITIONALLY (no
 * call-site gate).  Consumes rn1(upper,1) ONLY when:
 *   u.uen < u.uenmax && ((wtcap < MOD_ENCUMBER && !(svm.moves % period)) || Energy_regeneration)
 *   where period = (MAXULEV + 8 - u.ulevel) * (Role_if(PM_WIZARD) ? 3 : 4) / 6
 * Energy_regeneration (ring) is unported = false.  When the gate fires it does
 * rn1(upper,1) with upper = (ACURR(A_WIS)+ACURR(A_INT))/15 + 1 (+2 if
 * EMagical_breathing, unported = false). */
function regen_pw(wtcap) {
    const u = game.u;
    if (!u)
        return;
    const uen = (u.uen | 0), uenmax = (u.uenmax | 0);
    if (uen >= uenmax)
        return;
    /* C allmain.c:674-677 — period depends on ulevel and Wizard role.
     * role.mnum: PM_WIZARD index — Healer is not Wizard, so factor=4. */
    /* PM_WIZARD is 343 in mons[], not the role ordinal 14. */
    const isWizard = (game.urole && (game.urole.mnum | 0) === 343);
    const ulevel = (u.ulevel | 0);
    const period = ((MAXULEV + 8 - ulevel) * (isWizard ? 3 : 4)) / 6 | 0;
    /* Energy_regeneration unported = false; gate is the moves%period branch. */
    const moves = (game.moves | 0);
    if ((wtcap | 0) < MOD_ENCUMBER && period !== 0 && (moves % period) === 0) {
        /* C allmain.c:678 — upper = (ACURR(A_WIS)+ACURR(A_INT))/15 + 1. */
        let upper = ((acurr(u, A_WIS) | 0) + (acurr(u, 1 /*A_INT*/) | 0)) / 15 | 0;
        upper += 1;
        /* EMagical_breathing unported = false; no +2. */
        u.uen = uen + rn1(upper, 1);
        if ((u.uen | 0) > uenmax)
            u.uen = uenmax;
        /* C allmain.c:616-617 — if (u.uen == u.uenmax)
         *     interrupt_multi("You feel full of energy.");
         * INSIDE the gate, so it can only fire on a turn that actually
         * regenerated power.  RNG-free. */
        if ((u.uen | 0) === uenmax)
            interrupt_multi("You feel full of energy.");
    }
}

/* PHASE: HEAD, PART B — the once-per-turn upkeep block (allmain.c:316-414),
 * which runs AFTER svm.moves++ (C :295).  Several of these read svm.moves
 * directly (exerchk's `svm.moves % 10` / `% 5` / next_attrib_check), so the
 * orchestrator MUST increment g.moves to this turn's value BEFORE calling this.
 * Fires, in C order: regen_hp (gated), regen_pw, autosearch (Searching gate),
 * dosounds, gethungry, exerchk, u_wipe_engr gate rn2(40 + DEX*3). */
export async function ff_head_phase_post() {
    /* C allmain.c:341-348 — regen_hp() call-site gate + the HP-regen rn2(100).
     *     } else if (!Upolyd ? (u.uhp < u.uhpmax)
     *                : (u.mh < u.mhmax || gy.youmonst.data->mlet == S_EEL)) {
     *         regen_hp(mvl_wtcap);
     * When at full HP regen_hp is NOT called and consumes no RNG (C's exact
     * stream).  The Upolyd half of the gate was missing: a polymorphed hero at
     * full form-hp (seed5500's warhorse, u.mh == u.mhmax == 20) must NOT reach
     * regen_hp at all, where the old !Upolyd-only body would have drawn an
     * rn2(100) against his still-damaged u.uhp.
     * u.uinvulnerable — the prayer window — is the FIRST arm of that if/else in
     * C (allmain.c:335-337): "for the moment at least, you're in tiptop shape",
     * which sets mvl_wtcap = UNENCUMBERED and, being an `else if` chain, skips
     * regen_hp ENTIRELY.  Leaving it out fired an rn2(100) on every turn of a
     * prayer that C does not draw: seed4500 prays at T:66 with HP 27(80), and
     * the extra roll landed one leaf before dosounds' rn2(400) (sounds.c:213)
     * — the session's first RNG divergence.  The mvl_wtcap half is a no-op
     * here because this port already passes UNENCUMBERED to regen_hp/regen_pw
     * unconditionally. */
    {
        const u = game.u;
        const gateOk = u && !u.uinvulnerable && (!Upolyd(u)
            ? ((u.uhp | 0) < (u.uhpmax | 0))
            : (((u.mh | 0) < (u.mhmax | 0)) || _uasmon_mlet(u) === S_EEL_FF));
        /* C allmain.c:288-290 — the uinvulnerable arm's OTHER half:
         * `mvl_wtcap = UNENCUMBERED;`.  It was noted here as "a no-op ...
         * because this port already passes UNENCUMBERED unconditionally";
         * threading the real reading makes it load-bearing again. */
        if (u && u.uinvulnerable)
            mvl_wtcap = UNENCUMBERED;
        else if (gateOk)
            await regen_hp(mvl_wtcap);
    }
    /* C allmain.c:298-303 — "moving around while encumbered is hard work":
     *     if (mvl_wtcap > MOD_ENCUMBER && u.umoved) {
     *         if (!(mvl_wtcap < EXT_ENCUMBER ? svm.moves % 30 : svm.moves % 10))
     *             overexert_hp();
     *     }
     * Absent entirely while wtcap was pinned to UNENCUMBERED, since the gate
     * could never fire.  overexert_hp (hack.c:3035) is RNG-free on the hp > 1
     * arm and draws exercise(A_CON, FALSE)'s rn2(2) on the pass-out arm. */
    {
        const u2 = game.u;
        if (u2 && (mvl_wtcap | 0) > MOD_ENCUMBER && u2.umoved) {
            const m = game.moves | 0;
            const tick = ((mvl_wtcap | 0) < EXT_ENCUMBER) ? (m % 30) : (m % 10);
            if (!tick)
                await overexert_hp();
        }
    }
    /* C allmain.c:305 — regen_pw() (unconditional call; rn1 gated internally). */
    regen_pw(mvl_wtcap);
    // C allmain.c:307-342. mvl_change survives turns, including paralysis and
    // Unchanging, but is cancelled if its underlying condition disappears.
    // Read each property at its C use site: tele() can change hero state.
    {
        const u = game.u;
        const property = index => !!(u.uprops?.[index]?.intrinsic
                                    || u.uprops?.[index]?.extrinsic);
        if (!u.uinvulnerable) {
            if (property(TELEPORT) && !rn2(85)) {
                const old_ux = u.ux, old_uy = u.uy;
                await tele();
                if (u.ux !== old_ux || u.uy !== old_uy) {
                    if (!next_to_u())
                        await check_leash(old_ux, old_uy);
                    cmdq_clear(CQ_CANNED);
                    cmdq_clear(CQ_REPEAT);
                }
            }
            if ((game.mvl_change === 1 && !property(POLYMORPH))
                || (game.mvl_change === 2 && (u.ulycn | 0) === NON_PM))
                game.mvl_change = 0;
            if (property(POLYMORPH) && !rn2(100))
                game.mvl_change = 1;
            else if (ismnum(u.ulycn | 0) && !Upolyd(u)
                     && !rn2(80 - (20 * night())))
                game.mvl_change = 2;
            if (game.mvl_change && !property(UNCHANGING)) {
                if ((game.multi | 0) >= 0) {
                    await stop_occupation();
                    if (game.mvl_change === 1)
                        await polyself(POLY_NOFLAGS);
                    else
                        await you_were();
                    game.mvl_change = 0;
                }
            }
        }
    }
    /* C allmain.c:395-397 — intrinsic autosearch (Searching gate). */
    autosearch_rng();
    // C allmain.c:348-351: monster or hero were-changes can change innate
    // properties, even when no new hero transformation was requested.
    if (game.gw?.were_changes)
        set_uasmon();
    /* C allmain.c:405 — dosounds(). */
    dosounds_rng();
    /* C allmain.c:407 — gethungry(). */
    await gethungry();
    /* C allmain.c:408 — age_spells() — decrement spell retention (no RNG). */
    age_spells();
    /* C allmain.c:409 — exerchk() (reads the POST-increment svm.moves). */
    exerchk();
    /* C allmain.c:410 — invault().  It had NO call site in js/ at all, which is
     * why js/vault.js:178 could say "invault() has no callers in js/ today".
     * The whole body is dead unless vault_occupied(u.urooms) is non-zero, i.e.
     * unless the hero is standing inside a vault: it returns on its first
     * statement on every other turn of every other session.
     * MEASURED on seed0012-monk-vault-escort step 266, the session's first RNG
     * divergence (leaf 13287): C draws rnd(2) @next_ident then d(11,8)
     * @newmonhp — the vault guard being made — and this port drew the
     * u_wipe_engr gate's rn2(94) instead, because the guard was never
     * summoned. */
    await invault();
    /* C allmain.c:413 — u_wipe_engr gate rn2(40 + DEX*3). */
    u_wipe_engr_rng();
}

/* Convenience wrapper: the full HEAD block as one call (PART A + svm.moves++ is
 * the caller's responsibility between the two when faithful slicing matters).
 * Kept for callers that don't need the mid-block increment split. */
export async function ff_head_phase() {
    await ff_head_phase_pre();
    await ff_head_phase_post();
}

// Fill + mineralize RNG is consumed by mklev.js makelevel() (fill_ordinary_room loop)
// and level_finalize_topology() (mineralize). Kept as no-op so allmain ordering unchanged.
export function fastforward_fill_mineralize() {
}
