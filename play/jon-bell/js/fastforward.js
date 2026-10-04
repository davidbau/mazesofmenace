// @ts-nocheck
// Split into pre-mklev and post-mklev phases.
// The mklev RNG calls are now consumed by the real mklev.js implementation.
//
import { rn2, rnd, d, rn1, rnl, pushRngLogEntry } from "./rng.js";
import { dochug, m_canseeu } from "./dochug.js";
import monsPack from "./makemon_mons.json" with { type: "json" };
import { gethungry, morehungry, opentin } from "./eat.js";
import { make_confused, make_stunned, vomit, cantvomit } from "./potion.js";
import { age_spells } from "./spell.js";
import { exerchk, exercise, acurr } from "./attrib.js";
import { overexert_hp } from "./uhitm.js";
import { t_at, registerTrapMksobj, m_dowear, activate_statue_trap } from "./trap.js";
import { Warning, newsym, feel_location, feel_newsym, pline, flush_screen, _topl_merge_result, _topl_joins_snapshot, _topline_more_pending, You_hear } from "./display.js";
/* Runtime-only edge, same rule as the allmain/monmove/mklev imports below:
 * end.js does not import this module, so the cycle is one-directional and
 * do_death_sequence is only ever REFERENCED at call time. */
import { do_death_sequence } from "./end.js";
import { MON_MIGRATING, TIMEOUT, JUMPING, FROMOUTSIDE, REGENERATION, SLEEPY, MAGICAL_BREATHING, HALF_PHDAM, DEAF, VOMITING, CONFUSION, STUNNED, FAINTING, A_WIS, A_CON, A_DEX, MOD_ENCUMBER, EXT_ENCUMBER, MAXULEV, M_AP_TYPE, M_AP_FURNITURE, M_AP_OBJECT, VAULT, ANY_SHOP, ZOO, MORGUE, NECK, HEAD, HAIR, ROOMOFFSET, HALLUC, HALLUC_RES, WM_MASK, D_NODOOR, D_CLOSED, D_LOCKED, Is_rogue_level, Is_oracle_level, Upolyd, Is_waterlevel, Is_airlevel } from "./const.js";
import { is_pool } from "./look.js";
import { can_reach_floor } from "./hold_another_object.js";
/* nomul: C detect.c:2049/2058 calls it from dosearch0 when a hidden door or
 * passage is found (hack.c:4068).  allmain.js does not import fastforward.js
 * back through this edge at module-init time, and nomul is a hoisted function
 * declaration called only at runtime, so this cycle resolves. */
import { nomul, stop_occupation, interrupt_multi, night } from "./allmain.js";
import { warnreveal, halu_gname, obj_here, pooleffects_breathless, body_part, check_leash, cmdq_clear, find_trap } from "./cmd.js";
import { vtense } from "./objnam.js";
import { rehumanize, polyself, set_uasmon } from "./polyself.js";
import { you_were } from "./were.js";
import { tele, next_to_u } from "./teleport.js";
import { TELEPORT, POLYMORPH, UNCHANGING, NON_PM, POLY_NOFLAGS, CQ_CANNED, CQ_REPEAT, ismnum, STATUE_TRAP } from "./const.js";
import { search_special } from "./mkroom.js";
import { inhistemple, temple_occupied } from "./priest.js";
import { helpless } from "./mhitm.js";
import { EPRI, Is_astralevel } from "./const.js";
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
import { dmonsfree, movebubbles, fumaroles } from "./mkmaze.js";
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
import { gd_sound, vault_occupied, invault, gd_move } from "./vault.js";
import { consumeDungeonInitRng } from "./dungeon_rng.js";
import { consumeQuestNemesisGenderRng, consumeRolePantheonPickRng, ROLE_HAS_LGOD, } from "./role_init_rng.js";
import { NUM_ROLES, resolveRandomChargenInit, role_init, ROLE_GODS } from "./roles.js";
import { consumeUInitMiscHeroInitRng } from "./exper.js";
import { randomize_gem_colors, init_objects, shuffle_all } from "./o_init.js";
import { u_init_inventory_attrs } from "./u_init.js";
import { wipe_engr_at } from "./mklev.js";
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
import { do_storms } from './timeout.js';
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
/** @param {number} [initrole] C roles[] index from OPTIONS (for role_init RNG).
 *  @param {number} [initrace] C races[] index from OPTIONS (newhp/newpw in u_init_misc). */
export async function fastforward_pre_mklev(initrole = -1, initrace = -1) {
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
/** @param {number} [initrole] C roles[] index from OPTIONS */
export async function fastforward_post_mklev(initrole = -1) {
    // The actual C-shaped inventory phase owns role money, moves and objects.
    registerTrapMksobj(mksobj, place_object, make_corpse);
    await u_init_inventory_attrs();
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
    }
    return n;
}
export async function ff_movemon_one_pass() {
    const g = game;
    if (!g)
        return false;
    if (ENV.FF_RUNBANK_TRACE === '1') {
        pushRngLogEntry(`^ff_worldtick[moves=${g.moves | 0} ux=${g.u ? g.u.ux | 0 : -1} uy=${g.u ? g.u.uy | 0 : -1}]`);
    }
    let somebody_can_move = false;
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
        if (ENV.FF_MLTRACE === '1') {
            game._ffMlCursor = { pass: game._ffMlPass | 0, roster: i | 0,
                count: roster.length | 0, phase: 'before-dochug',
                mid: m.m_id | 0, moves: game.moves | 0 };
            pushRngLogEntry(`^ff_movemon_cursor[phase=before-dochug pass=${game._ffMlPass|0}`
                + ` roster=${i|0}/${roster.length|0} mid=${m.m_id|0}`
                + ` pending=${_topline_more_pending() ? 1 : 0}`
                + ` force=${game._topl_force_breaks?.length|0}]`);
        }
        if ((g.u && (g.u.utotype | 0))) {
            somebody_can_move = false;
            break;
        }
        /* C mon.c:1228-1240 movemon_singlemon: a vault guard parked at <0,0>
         * (not migrating) gets gd_move once per turn and is never dochug'd. */
        if (m.isgd && !m.mx && !((m.mstate | 0) & MON_MIGRATING)) {
            if ((game.moves | 0) > (m.mlstmv | 0)) {
                await gd_move(m);
                m.mlstmv = game.moves | 0;
            }
            continue;
        }
        if ((m.mstate | 0) !== 0) continue;
        if ((m.mhp | 0) <= 0)
            continue; /* C mon.c:1223 DEADMONSTER(mtmp) — no RNG (also skips a
                       * monster killed earlier in this same pass) */
        m_everyturn_effect(m);
        if (m.movement == null)
            m.movement = 0;
        if ((m.movement | 0) < NORMAL_SPEED)
            continue;
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
        if (await minliquid(m))
            continue;
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
            if (hideunder_ff(m))
                continue;
        }
        if (_conflict_ff() && !m.iswiz && m_canseeu(m)
            && cansee_ff(m.mx | 0, m.my | 0)
            && dist2_ff(m.mx | 0, m.my | 0, g.u.ux | 0, g.u.uy | 0)
               <= BOLT_LIM_FF * BOLT_LIM_FF
            && await fightm(m))
            continue; /* C: return FALSE — mon might have died */
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
    dmonsfree();
    if (ENV.FF_MLTRACE === '1')
        pushRngLogEntry(`^ff_movemon_pass[moves=${g.moves | 0} pass=${g._ffMlPass | 0} roster=${roster.length | 0} somebody=${somebody_can_move ? 1 : 0}]`);
    return somebody_can_move;
}

export async function drain_pending_death_in_place() {
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
const FAST_PROP = 64; /* C prop.h FAST = 64 */
const INTRINSIC_BITS = 0x07000000; /* FROMOUTSIDE|FROMRACE|FROMEXPER */
const UNENCUMBERED = 0; /* C botl.h — encumbrance level 0 */
function u_calc_moveamt(wtcap = UNENCUMBERED) {
    const g = game;
    const u = g.u;
    if (!u) return;
    const _riding = !!(u.usteed && (u.umoved | 0));
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
async function autosearch_rng() {
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
                    /* C detect.c:2079-2087: nomul(0); STATUE_TRAP ->
                     * activate_statue_trap (+exercise) and return; else
                     * find_trap(trap), which does tseen=1, exercise(A_WIS,
                     * TRUE) (the rn2(19) attrib.c:509), feel_newsym and the
                     * "You find ..." message. */
                    nomul(0);
                    if ((trap.ttyp | 0) === STATUE_TRAP) {
                        if (await activate_statue_trap(trap, x, y, false))
                            exercise(A_WIS, true);
                        return;
                    }
                    await find_trap(trap);
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
/* dungeon.h Is_sanctum(lev) = on_level(lev, &sanctum_level) */
function _is_sanctum(uz) {
    const s = game?.sanctum_level;
    return !!uz && !!s && uz.dnum === s.dnum && uz.dlevel === s.dlevel;
}
function oracle_sound(mtmp) {
    const mndx = (mtmp.data?.pmidx ?? mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
    if (mndx !== 274)
        return false;
    /* and don't produce silly effects when she's clearly visible */
    if (Hallucination() || !canseemon_ff(mtmp)) {
        const hallu = Hallucination() ? 1 : 0;
        const ora_msg = [
            "a strange wind.", "convulsive ravings.", "snoring snakes.",
            "someone say \"No more woodchucks!\"", "a loud ZOT!",
        ];
        You_hear(ora_msg[rn2(3) + hallu * 2]);
    }
    return true;
}
/* C sounds.c:147-198 temple_priest_sound(mtmp) — get_iter_mons predicate. */
function temple_priest_sound(mtmp) {
    if (mtmp.ispriest && inhistemple(mtmp)
        && !helpless(mtmp)
        && temple_occupied(game.u?.urooms || "") !== EPRI(mtmp).shroom) {
        const temple_msg = [
            "*someone praising %s.", "*someone beseeching %s.",
            "#an animal carcass being offered in sacrifice.",
            "*a strident plea for donations.",
        ];
        const hallu = Hallucination() ? 1 : 0;
        let trycount = 0;
        const ax = EPRI(mtmp).shrpos.x, ay = EPRI(mtmp).shrpos.y;
        const speechless = ((mtmp.data?.msound | 0) <= 17); /* MS_ANIMAL */
        const in_sight = canseemon_ff(mtmp) || cansee_ff(ax, ay);
        let msg;
        do {
            msg = temple_msg[rn2(temple_msg.length - 1 + hallu)];
            if (msg.includes('*') && speechless)
                continue;
            if (msg.includes('#') && in_sight)
                continue;
            break;
        } while (++trycount < 50);
        let i = 0;
        while (!/[A-Za-z]/.test(msg[i])) ++i; /* skip control flags */
        msg = msg.slice(i);
        if (msg.includes('%'))
            You_hear(msg.replace('%s', halu_gname(EPRI(mtmp).shralign)));
        else
            You_hear(msg);
        return true;
    }
    return false;
}

export function dosounds_rng() {
    const lf = game.level && game.level.flags;
    if (!lf)
        return;
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
        if (get_iter_mons(zoo_mon_sound))
            return;
    }
    if (lf.has_shop && !rn2(200)) {
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
    if (lf.has_temple && !rn2(200)
        && !(Is_astralevel(game.u?.uz) || _is_sanctum(game.u?.uz))) {
        /* C sounds.c:330-334 */
        if (get_iter_mons(temple_priest_sound))
            return;
    }
    if (Is_oracle_level(game.u?.uz) && !rn2(400)) {
        if (get_iter_mons(oracle_sound))
            return;
    }
}
/* C ref: allmain.c:413 u_wipe_engr condition — rn2(40 + ACURR(A_DEX)*3).
 * ACURR(A_DEX) = clamp(u.abon.a[DEX] + u.atemp.a[DEX] + u.acurr.a[DEX], 3, 25)
 * (attrib.c:1206 acurr()) — must go through the canonical acurr() helper,
 * not read u.acurr.a[] alone, or bonuses/temp deltas and the clamp are lost. */
function u_wipe_engr_rng() {
    const g = game;
    const dex = (g.u) ? (acurr(g.u, A_DEX) | 0) : 14;
    if (!rn2(40 + dex * 3)) {
        const cnt = rnd(3);
        if (can_reach_floor(true))
            wipe_engr_at(g.u.ux | 0, g.u.uy | 0, cnt, false);
    }
}
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
    await autosearch_rng();
    /* C ref: allmain.c:345-346 — if (Warning) warnreveal(). */
    if (Warning()) await warnreveal();
    /* C ref: allmain.c:405 dosounds() — dynamic level-flag dispatch. */
    dosounds_rng();
    /* C ref: allmain.c:353 do_storms() — Plane of Air lightning. */
    await do_storms();
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
    await autosearch_rng();
    /* C ref: allmain.c:345-346 — if (Warning) warnreveal(). */
    if (Warning()) await warnreveal();
    /* C ref: allmain.c:405 dosounds() — dynamic level-flag dispatch. */
    dosounds_rng();
    /* C ref: allmain.c:353 do_storms() — Plane of Air lightning. */
    await do_storms();
    /* C ref: allmain.c:407 gethungry(). */
    await gethungry();
    /* C ref: allmain.c:408 age_spells() — decrement spell retention (no RNG). */
    age_spells();
    exerchk();
    /* C ref: allmain.c:413 u_wipe_engr condition — dynamic DEX lookup. */
    u_wipe_engr_rng();
}

export const FF_FAITHFUL = !(typeof process !== 'undefined'
    && ENV && ENV.FF_FAITHFUL === '0');

export async function ff_movemon_phase() {
    return await ff_movemon_one_pass();
}

let mvl_wtcap = 0;
export async function ff_head_phase_pre() {
    /* C allmain.c:274-281 — reallocate movement rations: one rn2(12) per live mon. */
    await fmon_mcalcmove();
    await maybe_generate_rnd_mon();
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
    const moves = (game.moves | 0);
    if ((wtcap | 0) < MOD_ENCUMBER && period !== 0 && (moves % period) === 0) {
        /* C allmain.c:678 — upper = (ACURR(A_WIS)+ACURR(A_INT))/15 + 1. */
        let upper = ((acurr(u, A_WIS) | 0) + (acurr(u, 1 /*A_INT*/) | 0)) / 15 | 0;
        upper += 1;
        /* EMagical_breathing unported = false; no +2. */
        u.uen = uen + rn1(upper, 1);
        if ((u.uen | 0) > uenmax)
            u.uen = uenmax;
        if ((u.uen | 0) === uenmax)
            interrupt_multi("You feel full of energy.");
    }
}

export async function ff_head_phase_post() {
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
    {
        const u2 = game.u;
        if (u2 && (mvl_wtcap | 0) > MOD_ENCUMBER && u2.umoved) {
            const m = game.moves | 0;
            const tick = ((mvl_wtcap | 0) < EXT_ENCUMBER) ? (m % 30) : (m % 10);
            if (!tick)
                await overexert_hp();
        }
    }
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
    await autosearch_rng();
    /* C ref: allmain.c:345-346 — if (Warning) warnreveal(). */
    if (Warning()) await warnreveal();
    // C allmain.c:348-351: monster or hero were-changes can change innate
    // properties, even when no new hero transformation was requested.
    if (game.gw?.were_changes)
        set_uasmon();
    /* C allmain.c:405 — dosounds(). */
    dosounds_rng();
    /* C ref: allmain.c:353 do_storms() — Plane of Air lightning. */
    await do_storms();
    /* C allmain.c:407 — gethungry(). */
    await gethungry();
    /* C allmain.c:408 — age_spells() — decrement spell retention (no RNG). */
    age_spells();
    /* C allmain.c:409 — exerchk() (reads the POST-increment svm.moves). */
    exerchk();
    await invault();
    u_wipe_engr_rng();
    /* C allmain.c:374-377 — "vision will be updated as bubbles move":
     *     if (Is_waterlevel(&u.uz) || Is_airlevel(&u.uz)) movebubbles();
     *     else if (svl.level.flags.fumaroles) fumaroles(); */
    if (Is_waterlevel(game.u.uz) || Is_airlevel(game.u.uz))
        await movebubbles();
    else if (game.level?.flags?.fumaroles)
        await fumaroles();
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
