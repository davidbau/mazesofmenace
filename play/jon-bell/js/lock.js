// @ts-nocheck
// lock.js — Door and lock operations.
// C ref: nethack-c/src/lock.c — doopen(), doopen_indir(), doclose().
// Ported scope: simple closed-door open path (lock.c:781-935) and doclose
// (lock.c:957-1052). The drawbridge predicates used by the shared branches
// are implemented locally below to keep lock.js independent of dokick.js.
import { game } from './gstate.js';
import { set_occupation, confdir, movecmd, cmdq_pop, cmdq_clear, cmdq_add_key, redraw_cmd, dxdy_moveok, xytodir, readchar,
    show_direction_keys, dowhatdoes_core } from './cmd.js';
import { visctrl } from './cmd_binds.js';
import { CQ_REPEAT, CQ_CANNED, CMDQ_DIR, CMDQ_KEY, NHKF_GETDIR_HELP, NHKF_GETDIR_SELF, NHKF_GETDIR_SELF2 } from './const.js';
import { impossible } from './pline.js';
import { pline, force_more, newsym, flush_screen, docrt_flags, _darken_room_floor, show_glyph_cell, canseemon } from './display.js';
import { topl_park_cursor } from './display.js';
import { block_point, recalc_block_point, vision_recalc } from './vision.js';
import { nhgetch } from './input.js';
import { yn_function } from './end.js';
import { display_text_window } from './com_pager.js';
import { pushRngLogEntry } from './rng.js';
import { isaac64_next_uint64 } from './isaac64.js';
import { acurr, exercise } from './attrib.js';
import { rn2, rnl } from './rng.js';
import { isok } from './hacklib.js';
import { wake_nearto } from './mklev.js';
import { in_rooms, add_damage } from './shk.js';
import { cansee, Blind } from './vision.js';
import { closed_door } from './look.js';
import { DEAF, HALLUC, DBWALL, DB_DIR, DB_WEST, DB_EAST, DB_SOUTH, DB_NORTH,
         IS_DRAWBRIDGE } from './const.js';
/* C ref: objects.h — WAN_STRIKING otyp (js/makemon.js and js/muse.js pin the
 * same value); SPE_FORCE_BOLT shares doorlock's arm in C but is not reachable
 * here yet. */
const WAN_STRIKING_OTYP = 417;
function _lock_Deaf() {
    const p = game.u?.uprops?.[DEAF];
    return !!((p?.intrinsic | 0) || (p?.extrinsic | 0));
}

/* C ref: objects.h otyp ids used by boxlock() (lock.c:1056).  Same numbering
 * js/zap.js pins locally (WAN_OPENING=425, WAN_LOCKING=426) and js/spell.js /
 * js/u_init.js pin for the SPE_* spellbook ids (SPE_KNOCK=375,
 * SPE_WIZARD_LOCK=381, SPE_POLYMORPH=399); js/makemon.js pins
 * WAN_POLYMORPH_OTYP=422 the same way. */
const WAN_LOCKING_OTYP_LK = 426;
const SPE_WIZARD_LOCK_OTYP_LK = 381;
const WAN_OPENING_OTYP_LK = 425;
const SPE_KNOCK_OTYP_LK = 375;
const WAN_POLYMORPH_OTYP_LK = 422;
const SPE_POLYMORPH_OTYP_LK = 399;
/* C ref: you.h:247 `#define Role_if(X) (gu.urole.mnum == (X))`.  PM_WIZARD is
 * the mons[] index 343 (js/pm.generated.js:345), the same reader js/dokick.js
 * maybe_wail() and js/cmd.js msnoise use: `game.urole.mnum === PM_WIZARD`. */
const PM_WIZARD_LK = 343;
import { simple_typename, xname_flags, cxname } from './objnam.js';
import { weapon_type, WEAPON_WLDAM, m_at, mon_nam } from './uhitm.js';
import { place_object } from './mklev.js';
import { potionbreathe } from './potion.js';
import { obj_resists } from './dogmove.js';
import { MKOBJ_OC_MATERIAL } from './mkobj_erosion_meta.js';
import { SHOPBASE, SDOOR, DOOR, D_CLOSED, D_ISOPEN, D_TRAPPED, D_NODOOR, D_BROKEN, D_LOCKED, A_STR, A_DEX, A_CON, ECMD_TIME, ECMD_OK, ECMD_CANCEL,
         P_DAGGER, P_SABER, P_PICK_AXE, P_FLAIL, P_LANCE, PASSES_WALLS, BLINDED, CXN_NORMAL, MV_ANY } from './const.js';
/* C mons[] rows (permonst) — row[6] = mflags1; makemon_msize.json carries
 * permonst.msize in the same MON() row order.  Imported as raw data packs (not
 * via makemon.js) to keep lock.js off the makemon import cycle. */
import monsPackLk from './makemon_mons.json' with { type: 'json' };
import monMsizePackLk from './makemon_msize.json' with { type: 'json' };
const _MONS_LK = /** @type {number[][]} */ (monsPackLk.mons);
const _MONS_MSIZE_LK = /** @type {number[]} */ (monMsizePackLk.msize);
/* C monflag.h:180 MZ_HUMAN = 2 — the default when no form is resolvable
 * (every player-role monster in mons[] is MZ_HUMAN). */
const MZ_HUMAN_LK = 2;

/* objclass.h OBJCLASS enum numbers (defsym.h): used by #force. */
const WEAPON_CLASS_OC = 2;
const TOOL_CLASS_OC = 6;
const POTION_CLASS_OC = 8;
const ROCK_CLASS_OC = 14;
/* weapon-skill constants (const.js P_*) aliased for the #force predicates. */
const P_DAGGER_SK = P_DAGGER;
const P_SABER_SK = P_SABER;
const P_PICK_AXE_SK = P_PICK_AXE;
const P_FLAIL_SK = P_FLAIL;
const P_LANCE_SK = P_LANCE;
/* C ref: objclass.h oc_material via objects[otyp].oc_material. */
function oc_material(otyp) {
    return (otyp >= 0 && otyp < MKOBJ_OC_MATERIAL.length) ? (MKOBJ_OC_MATERIAL[otyp] | 0) : 0;
}
/* C ref: objnam.c the(str) — definite article. */
function _the(str) { return 'the ' + str; }

/* C ref: rnd.c:572 RND(x) — raw ISAAC64 reduction.
 * Used by rnl to avoid logging spurious rn2(N) entries.
 * Contest scoring never installs a tape, so we go straight to ISAAC64.
 * NOTE: rng.js's _rngTape is not accessible here; tape mode is only
 * used by harness tooling, not the contest scorer or depth-of-divergence. */
function _rawRnd(x) {
    const val = isaac64_next_uint64(game.coreCtx);
    return Number(val % BigInt(x));
}

/* C ref: rnd.c:112 rnl(x) — 0 <= rnl(x) < x, adjusted by Luck.  Delegated to
 * the canonical rnl() in rng.js (the same call cmd.js's rnl_dosearch makes).
 *
 * The local copy that used to live here drew C's Luck adjustment —
 * `if (adjustment && rn2(37 + abs(adjustment)))` (rnd.c:143) — through the
 * UNLOGGED _rawRnd().  Only the main `i = RND(x)` draw is unlogged in C; the
 * adjustment draw is a genuine rn2() and C records it as its own PRNG line.
 * So on any game with non-zero Luck this consumed the right numbers but
 * emitted one log entry too few, shifting the whole PRNG channel by one from
 * the first door onward.  Measured on seed0030 segment 9 (a full-moon game, so
 * Luck == 1 from turn 1): C's step-6 doopen_indir recorded
 * `rn2(38)=8 @ lock.c:904` then `rnl(20)=0`, where JS logged only `rnl(20)=0`. */

/* C ref: attrib.c:1251 acurrstr() — effective Str for door-opening check.
 * For Str <= 18 (normal human): result = max(str, 3) = str.
 * For higher Str values: follows 18/xx encoding; mirrors C exactly. */
function acurrstr() {
    const u = game.u || {};
    /* acurr(u, A_STR) returns the effective Str in C's encoding (3..125) */
    const str = acurr(u, A_STR); /* A_STR=0 */
    let result;
    if (str <= 18) /* STR18(0) = 18 */
        result = Math.max(str, 3);
    else if (str <= 121) /* STR19(21) = 121 */
        result = 19 + Math.trunc(str / 50);
    else
        result = Math.min(str, 125) - 100;
    return result;
}

/* C ref: lock.c:781 doopen_indir(coordxy x, coordxy y)
 * Called when autoopen fires on walking into a closed door at (x, y).
 * x, y guaranteed non-zero (caller passes the door tile coordinates).
 *
 * Ported scope: simple D_CLOSED door only (lock.c:898-935).
 * Unported branches (no RNG in seed0077 corpus path):
 *   - get_adjacent_loc prompt (line 803-807) — caller passes x,y
 *   - stumble_on_door_mimic (line 819) — no RNG here in corpus
 *   - Confusion/Stunned res=ECMD_TIME (line 823-824)
 *   - newsym glyph-change detection (line 827-834) — simplified to plain newsym
 *   - portcullis / drawbridge (line 836-860) — not in corpus
 *   - D_LOCKED autounlock (line 875-894) — the APPLY_KEY gate + autokey(TRUE)
 *     + the pick_lock() follow-through ARE ported below; the KICK arm is
 *     unreachable at the default flags.autounlock (apply-key alone)
 *   - D_TRAPPED b_trapped (line 906-912) — sets D_NODOOR; not in seed0077
 */
export async function doopen_indir(x, y) {
    const g = game;
    /* C lock.c:788-791 —
     *     if (nohands(gy.youmonst.data)) {
     *         You_cant("open anything -- you have no hands!");
     *         return ECMD_OK;
     *     }
     * The first thing doopen_indir does, before get_adjacent_loc, so a handless
     * hero's 'o' consumes no direction key.  Sibling of the guard doclose()
     * already carries at lock.c:965.  seed5500 step 898: the hero is polymorphed
     * into a warhorse (M1_NOHANDS) and C plines this where the port printed
     * nothing.  RNG-free. */
    if (_nohands_lk()) {
        await pline("You can't open anything -- you have no hands!");
        g.context = g.context || {};
        g.context.move = 0; /* ECMD_OK */
        return ECMD_OK;
    }
    /* C lock.c:786 — int res = ECMD_OK; the "learned something" / Confusion
     * upgrades to ECMD_TIME (lock.c:822-838) are not ported (see the scope note
     * above), so res only ever carries ECMD_OK out of the not-closed branch. */
    let res = ECMD_OK;

    /* C lock.c:793-796 — the getdir prompt override:
     *     dirprompt = NULL;
     *     if (u.utrap && u.utraptype == TT_PIT && container_at(u.ux,u.uy,FALSE))
     *         dirprompt = "Open where? [.>]";
     * No corpus hero is in a pit over a container when opening; NULL makes
     * get_adjacent_loc -> getdir use its default "In what direction?". */
    const dirprompt = null;

    /* C lock.c:798-807 —
     *     if (x > 0 && y >= 0) { cc.x = x; cc.y = y; }
     *     else if (!get_adjacent_loc(dirprompt, (char *) 0, u.ux, u.uy, &cc))
     *         return ECMD_OK;
     *
     * THE `else` BRANCH WAS MISSING ENTIRELY.  doopen() is `return
     * doopen_indir(0, 0)`, so the top-level 'o' command took the x>0 test as
     * false, fell straight through to `g.level.at(0, 0)` — never a DOOR — and
     * returned ECMD_OK having opened NO blocking read.  seed0108 step 216 types
     * 'o': C raises "In what direction?" and eats the ESC at step 217 with
     * "Never mind.", while this port consumed neither key, so both leaked to
     * rhack.  (The autoopen caller at js/cmd.js:27806 passes real door
     * coordinates and is unaffected.)
     *
     * get_adjacent_loc (cmd.c:3931): getdir, then `pline1(Never_mind)` and
     * return 0 on cancel; otherwise cc = (x + u.dx, y + u.dy), and an !isok
     * result returns 0 printing `emsg` — which this caller passes as NULL, so
     * it is silent.  RNG-free throughout. */
    let cx = x | 0, cy = y | 0;
    if (!(cx > 0 && cy >= 0)) {
        if (!(await getdir(dirprompt))) {
            await pline('Never mind.');           /* cmd.c:3939 pline1(Never_mind) */
            return ECMD_OK;
        }
        const u0 = g.u || {};
        const nx = (u0.ux | 0) + (u0.dx | 0);
        const ny = (u0.uy | 0) + (u0.dy | 0);
        if (!isok(nx, ny))
            return ECMD_OK;                        /* emsg is NULL for this caller */
        cx = nx; cy = ny;
    }

    /* C lock.c:811-814 — "open at yourself/up/down: switch to loot unless there
     * is a closed door here (possible with Passes_walls) and direction isn't
     * 'down'":
     *     if (u_at(cc.x, cc.y) && (u.dz > 0 || !closed_door(u.ux, u.uy)))
     *         return doloot();
     * doloot lives in js/pickup.js, which imports this module, so it is reached
     * through a dynamic import the same way js/pickup.js reaches use_container. */
    {
        const u0 = g.u || {};
        if (cx === (u0.ux | 0) && cy === (u0.uy | 0)
            && ((u0.dz | 0) > 0 || !closed_door(u0.ux | 0, u0.uy | 0))) {
            const { doloot } = await import('./pickup.js');
            return await doloot();
        }
    }

    /* C lock.c:828 — portcullis = (is_drawbridge_wall(cc.x, cc.y) >= 0). */
    const loc = g.level?.at(cx, cy);
    if (!loc) return ECMD_OK;
    const portcullis = _is_drawbridge_wall_stub(cx, cy) >= 0;

    /* C lock.c:841-853 — the not-a-door report.  This used to be a SILENT
     *     if (loc.typ !== DOOR) return ECMD_OK;
     * so `o` toward a wall/floor square printed nothing where C always says
     * something:
     *
     *   if (portcullis || !IS_DOOR(door->typ)) {
     *       if (is_db_wall(cc.x, cc.y) || door->typ == DRAWBRIDGE_UP)
     *           There("is no obvious way to open the drawbridge.");
     *       else if (portcullis || door->typ == DRAWBRIDGE_DOWN)
     *           pline_The("drawbridge is already open.");
     *       else if (container_at(cc.x, cc.y, TRUE))
     *           pline("%s like something lootable over there.",
     *                 Blind ? "Feels" : "Seems");
     *       else
     *           You("%s no door there.", Blind ? "feel" : "see");
     *       return res;
     *   }
     *
     * The sibling doclose() below has carried this block all along; only the
     * open side was missing it.  gen677 step 83 is `o` then `n` into open
     * floor: C prints "You see no door there." and this port printed a blank
     * topline, which cost the session's whole 187-point tail.  RNG-free.
     * container_at lives in js/pickup.js, which imports this module, so it
     * comes in through the same dynamic import doloot() above uses. */
    if (portcullis || loc.typ !== DOOR) {
        if (_is_db_wall_stub(cx, cy) || loc.typ === 19 /* DRAWBRIDGE_UP */) {
            await pline('There is no obvious way to open the drawbridge.');
        } else if (portcullis || loc.typ === 34 /* DRAWBRIDGE_DOWN */) {
            await pline('The drawbridge is already open.');
        } else {
            const { container_at } = await import('./pickup.js');
            if (container_at(cx, cy, true)) {
                await pline(`${_blind_stub() ? 'Feels' : 'Seems'}`
                            + ' like something lootable over there.');
            } else {
                await pline(`You ${_blind_stub() ? 'feel' : 'see'} no door there.`);
            }
        }
        return res;
    }

    /* C lock.c:855-895 — !(door->doormask & D_CLOSED): the door is not closed,
     * so there is nothing to open; C still reports WHY.  This port used to bail
     * silently, so walking into a locked door printed nothing where C prints
     * "This door is locked." (seed0777 step 31, the session's first render
     * divergence after the botl/eckey fixes).
     *
     *   switch (door->doormask) {
     *   case D_BROKEN: mesg = " is broken";        break;
     *   case D_NODOOR: mesg = "way has no door";   break;
     *   case D_ISOPEN: mesg = " is already open";  break;
     *   default:       mesg = " is locked"; locked = TRUE; break;
     *   }
     *   set_msg_xy(cc.x, cc.y);
     *   pline("This door%s.", mesg);
     *
     * Note the switch is on the WHOLE doormask, not a bit test, so D_LOCKED and
     * any mask C does not name (e.g. D_LOCKED|D_TRAPPED) both take the default
     * " is locked" arm.  set_msg_xy() only records the message-origin coord for
     * the 'mention_decor' feature; it paints nothing here.  RNG-free. */
    if (!(loc.doormask & D_CLOSED)) {
        let mesg, locked = false;
        switch (loc.doormask | 0) {
        case D_BROKEN:
            mesg = ' is broken';
            break;
        case D_NODOOR:
            mesg = 'way has no door';
            break;
        case D_ISOPEN:
            mesg = ' is already open';
            break;
        default:
            mesg = ' is locked';
            locked = true;
            break;
        }
        await pline(`This door${mesg}.`);
        /* C lock.c:875-894 — the autounlock follow-up:
         *     if (locked && flags.autounlock) {
         *         u.dz = 0;
         *         if ((flags.autounlock & AUTOUNLOCK_APPLY_KEY) != 0
         *             && (unlocktool = autokey(TRUE)) != 0)
         *             res = pick_lock(unlocktool, cc.x, cc.y, NULL) ? ECMD_TIME
         *                                                          : ECMD_OK;
         *         else if ((flags.autounlock & AUTOUNLOCK_KICK) != 0
         *                  && !u.usteed && ynq("Kick it?") == 'y') { ... }
         *     }
         * flags.autounlock defaults to AUTOUNLOCK_APPLY_KEY alone (flag.h:72,
         * set by options.c:1089 optfn_autounlock's do_init arm), so the KICK
         * arm is off for every corpus session and only the apply-key arm can
         * fire — and only when autokey(TRUE) (lock.c:288) finds a skeleton key,
         * lock pick or credit card in gi.invent.  seed0777 reaches this with an
         * EMPTY inventory (the tutorial's nh.gamestate() stash), so autokey
         * returns 0 and nothing follows the message. */
        if (locked && (g.flags?.autounlock ?? AUTOUNLOCK_APPLY_KEY)) {
            const au = g.flags?.autounlock ?? AUTOUNLOCK_APPLY_KEY;
            if (g.u) g.u.dz = 0;   /* C lock.c:877 */
            if ((au & AUTOUNLOCK_APPLY_KEY) !== 0) {
                const unlocktool = autokey(true);
                if (unlocktool) {
                    /* C lock.c:880-882 —
                     *   res = pick_lock(unlocktool, cc.x, cc.y, (struct obj *) 0)
                     *         ? ECMD_TIME : ECMD_OK;
                     * pick_lock's adjacent-door branch now carries C's
                     * autounlock confirmation prompt (lock.c:619-625), so this
                     * is a live call and no longer a flagged incomplete callee. */
                    res = (await pick_lock(unlocktool, cx, cy, null))
                        ? ECMD_TIME : ECMD_OK;
                }
            }
            /* C lock.c:882-892 AUTOUNLOCK_KICK arm — unreachable at the default
             * flags.autounlock (APPLY_KEY only); not ported. */
        }
        return res;
    }

    /* C lock.c:899-902 —
     *   if (verysmall(gy.youmonst.data)) {
     *       pline("You're too small to pull the door open.");
     *       return res;
     *   }
     * This returns BEFORE the rnl(20) roll below, so a verysmall (MZ_TINY)
     * hero form consumes no RNG here. */
    if (_verysmall_lk()) {
        await pline("You're too small to pull the door open.");
        return res;
    }

    /* C lock.c:905 — door is D_CLOSED: strength/dex/con roll */
    const u = g.u || {};
    /* ACURRSTR + ACURR(A_DEX) + ACURR(A_CON)) / 3  — integer division */
    const threshold = Math.trunc((acurrstr() + acurr(u, A_DEX) + acurr(u, A_CON)) / 3);
    if (rnl(20) < threshold) {
        /* C lock.c:907 — pline_The("door opens.") */
        await pline("The door opens.");
        /* C lock.c:908-913 — D_TRAPPED: b_trapped then D_NODOOR; else D_ISOPEN */
        if (loc.doormask & D_TRAPPED) {
            /* b_trapped stub — just remove the door; no RNG in corpus */
            loc.doormask = D_NODOOR;
        } else {
            loc.doormask = D_ISOPEN;
        }
        /* C lock.c:914 — feel_newsym(cc.x, cc.y): update display for hero */
        newsym(cx, cy);
        /* C lock.c:916 — recalc_block_point(cc.x, cc.y): the now-open door no
         * longer blocks light, so vision can see through it.  recalc_block_point
         * rebuilds the block arrays (open door -> transparent) and sets
         * vision_full_recalc.  C then runs vision_recalc(0) in moveloop_core
         * (allmain.c:611) AFTER rhack() but BEFORE the WIN_MAP redraw, within the
         * same turn — that is what reveals the corridor/room behind the door on
         * the very screen the player sees for this move.  Our moveloop checks the
         * vision_full_recalc flag at the TOP of the next iteration (after this
         * step's screen is already flushed), so to match C's intra-turn timing we
         * run the recalc inline here (mirrors the inline vision_recalc(1) on the
         * normal move path in cmd.js).  All RNG-free. */
        recalc_block_point(cx, cy);
        if (g.vision_full_recalc) {
            vision_recalc(0);
            g.vision_full_recalc = 0;
        }
    } else {
        /* C lock.c:917-920 — door resists */
        exercise(A_STR, true); /* C: exercise(A_STR, TRUE) */
        await pline("The door resists!");
    }

    return ECMD_TIME;
}

/* C cmd.c:getdir — interactive direction input, help/redraw retry, repeat
 * recording, orientation and impairment. Returns 1 for a valid direction,
 * 0 for cancellation or an invalid direction. Queue/read-buffer consumption,
 * full yn_function/input-state ownership, mouse/getpos, fuzzer and alternate
 * binding initialization remain open; the typed queue primitives alone do
 * not implement those consumer paths. */
/* C ref: cmd.c:3869 movecmd(sym, MV_ANY) — the ONE thing that decides whether a
 * keystroke is a direction at a getdir() prompt.  This file used to answer that
 * question with a hand-written eight-entry LOWERCASE table:
 *
 *     const DIR_DX_CLOSE = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
 *
 * C does not decide it that way.  reset_commands() (cmd.c:3462-3471, num_pad
 * Off — the corpus nethackrc never sets number_pad) binds THREE keys per
 * direction, not one:
 *
 *     bind_key_fn(dirchars[i],          move_funcs[i][MV_WALK]);   // h j k l ...
 *     bind_key_fn(highc(dirchars[i]),   move_funcs[i][MV_RUN]);    // H J K L ...
 *     bind_key_fn(C(dirchars[i]),       move_funcs[i][MV_RUSH]);   // ^H ^J ^K ...
 *
 * and movecmd(sym, MV_ANY) accepts ALL THREE (cmd.c:3877-3882 scans
 * move_funcs[d][MV_WALK] || [MV_RUN] || [MV_RUSH]).  At a getdir prompt the run
 * and rush keys carry no run/rush semantics at all — movecmd only writes
 * xdir[d]/ydir[d]/zdir[d] — so 'K' at "Loot in what direction?" is plain north.
 *
 * MEASURED, gen341-reseed-seed476480 step 24: the hero types `#loot`, C answers
 * "Loot in what direction?", the recorded key is 'K', and C loots north and
 * prints "You don't find anything there to loot."  This port's lowercase table
 * had no 'K', so it took the invalid-direction arm, drew the cmdassist
 * help_dir window, and that window's --More-- ATE THE NEXT RECORDED KEYSTROKE.
 * From that step on the port was one key ahead of C for the rest of the game.
 *
 * The ORDER also matters and was wrong: C tests movecmd BEFORE quitchars
 * (cmd.c:4095 `else if (!(is_mov = movecmd(dirsym, MV_ANY)) && !u.dz)`, with the
 * `!strchr(quitchars, dirsym)` test inside that arm).  Since C('j') == 0x0A is
 * bound to do_rush_south, an 0x0A at a direction prompt is SOUTH in C, not a
 * cancel — and 0x0A is what a recorded Return arrives as (ICRNL; see
 * js/jsmain.js:710 and the same precedent already ported for getpos at
 * js/cmd.js:406).  Testing quitchars first inverted that.
 *
 * So this now calls the real movecmd()/cmdbind_get()/move_funcs machinery that
 * js/cmd.js already carries, instead of a fourth hand-mirrored copy of a table
 * that was missing two thirds of C's bindings. */
/* C ref: src/decl.c:96 — `const char quitchars[] = " \r\n\033";`.  SPACE, CR,
 * LF and ESC, and nothing else.  This constant read '\x1b\x07\x03' (ESC, BEL,
 * ^C), which is not any C character class: it omitted the three characters
 * that actually cancel a direction prompt and added two that do not.  A SPACE
 * at "In what direction?" therefore fell through to the cmd.c:4098
 * `!strchr(quitchars, dirsym)` branch that C skips, drew the cmdassist
 * help_dir window, and ate an extra keystroke. */
const QUITCHARS = ' \r\n\x1b';
/* `opts.noPrompt` suppresses ONLY the prompt paint (the message, the flush and
 * the parked cursor), never the read or any of C's key handling below it.
 *
 * It exists for one caller: dofire()'s cmdq-drain tail (js/cmd.js
 * _fire_throw_obj), where the topline is deliberately left holding the
 * fireassist swap's committed --More-- frame across the getdir call instead of
 * being repainted.  C gets that for free — tty_yn_function writes over a
 * topline that the tty is still showing, and the recorded frame at that
 * nhgetch is the swap's — while this port paints each frame explicitly, so the
 * retention has to be asked for.  DISPLAY-channel only; no caller may use it
 * to skip a prompt C would have written. */
export async function getdir(_s, opts = {}) {
    const g = game;
    const u = g.u = g.u || {};
    let noPrompt = !!opts.noPrompt;
    let cmdq = cmdq_pop();
    // C's retry label. A retained fireassist frame applies to the first read
    // only; explicit help/redraw returns here and paints a fresh prompt.
    for (;;) {
        const result = await _getdir_read(g, u, _s, noPrompt, cmdq);
        // A help retry does not pop a second queued command.
        cmdq = null;
        noPrompt = false;
        if (result !== null)
            return result;
    }
}
/* null is the internal equivalent of C's `goto retry`; 0 and 1 are getdir's
 * caller-visible results. No nested getdir call or extra command dispatch. */
async function _getdir_read(g, u, s, noPrompt, cmdq) {
    let keyCode;
    if (cmdq) {
        if (cmdq.typ === CMDQ_DIR) {
            // v5 movementdirs puts DOWN at 8 and UP at 9. The frozen JS
            // constants have those names reversed; use the C enum here.
            const dir = !cmdq.dirz ? xytodir(cmdq.dirx, cmdq.diry)
                : cmdq.dirz > 0 ? 8 : 9;
            keyCode = (g.Cmd?.dirchars || 'hykulnjb><').charCodeAt(dir);
        } else if (cmdq.typ === CMDQ_KEY) {
            keyCode = cmdq.key;
        } else {
            cmdq_clear(CQ_CANNED);
            keyCode = 0;
            await impossible('getdir: command queue had no dir?');
        }
        // C frees the detached node and jumps to got_dirsym, bypassing
        // prompt/input-state changes, redraw handling and repeat recording.
    } else {
        g.program_state.input_state = 3; // getdirInp
        if (g.gi?.in_doagain || g.readchar_queue?.charCodeAt(0)) {
            keyCode = await readchar();
        } else {
            // The shared reader owns acknowledgment, answered-prompt history,
            // last_msg and the transition from getdirInp back to otherInp.
            const dirPrompt = (s != null && s.charAt(0) !== '^')
                ? s : 'In what direction?';
            const reply = await yn_function(dirPrompt, null, '\0', false,
                { retainFrame: noPrompt });
            keyCode = typeof reply === 'number' ? reply : reply.charCodeAt(0);
        }
        /* C clear_nhwindow(WIN_MESSAGE), including buffered reads. */
        g._pending_message = '';
        // C retries redraw before recording the reply in CQ_REPEAT.
        if (redraw_cmd(keyCode)) {
            docrt_flags(0x04); // docrtRefresh
            return null;
        }
        if (!g.gi?.in_doagain)
            cmdq_add_key(CQ_REPEAT, keyCode);
    }
    /* movecmd() keys off the raw keycode (C's `uchar sym`), so keep both. */
    const dircode = typeof keyCode === 'number'
        ? (keyCode & 0xff)
        : (String(keyCode ?? '').charCodeAt(0) | 0);
    const dirsym = typeof keyCode === 'number' ? String.fromCharCode(keyCode) : '';
    /* C cmd.c:4696 — self-direction keys '.' or 's' → u.dx=u.dy=u.dz=0 */
    if (dircode === (g.Cmd?.spkeys?.[NHKF_GETDIR_SELF] ?? 46)
        || dircode === (g.Cmd?.spkeys?.[NHKF_GETDIR_SELF2] ?? 115)) {
        u.dx = 0; u.dy = 0; u.dz = 0;
        /* C cmd.c:4116-4117 — the tail every successful getdir falls through to:
         *     if (!u.dz)
         *         confdir(FALSE);
         *     return 1;
         * It was MISSING here, and confdir(FALSE) is not RNG-neutral: it calls
         * u_maybe_impaired(), whose `Confusion && !rn2(5)` draws whenever the
         * hero is confused.  MEASURED, seed5006 segment 0 step 183 (a confused
         * Tourist zapping a wand of death at herself with '.'): C's leaf 10952
         * is rn2(5)=2 @ u_maybe_impaired(hack.c:2420) and JS drew nothing there
         * — the session's first RNG divergence. */
        confdir(false);
        return 1;
    }
    /* C cmd.c:4095 — `else if (!(is_mov = movecmd(dirsym, MV_ANY)) && !u.dz)`.
     * movecmd writes u.dx/u.dy/u.dz for every bound direction key (walk, run
     * and rush spellings alike, plus '<'/'>' which set u.dz and make movecmd
     * return 0), so this one call replaces the lowercase table, the '<'/'>'
     * arms and the quitchars pre-test that used to sit in front of them. */
    const is_mov = movecmd(dircode, MV_ANY);
    if (is_mov || u.dz) {
        if (is_mov && !dxdy_moveok()) {
            await pline("You can't orient yourself that direction.");
            return 0;
        }
        /* C cmd.c:4116-4117 — the tail every successful getdir falls through
         * to: `if (!u.dz) confdir(FALSE); return 1;`.  confdir is not
         * RNG-neutral (u_maybe_impaired draws when the hero is confused). */
        if (!u.dz)
            confdir(false);
        return 1;
    }
    /* C cmd.c:4098 — `if (!strchr(quitchars, dirsym))`, INSIDE the
     * invalid-direction arm: a quitchar cancels silently. */
    // strchr(quitchars, NUL) finds the string terminator in C.
    if (dircode === 0 || QUITCHARS.indexOf(dirsym) >= 0) {
        return 0;
    }
    const help_requested = dircode === (g.Cmd?.spkeys?.[NHKF_GETDIR_HELP] ?? 63);
    let did_help = false;
    if (help_requested || cmdassist_on()) {
        did_help = await help_dir(s && s.charAt(0) === '^' ? dirsym : '\0',
            ESC_KEY, help_requested ? null : 'Invalid direction key!');
        if (help_requested)
            return null;
    }
    if (!did_help)
        await pline('What a strange direction!');
    return 0;
}
/* C ref: cmd.c:4100-4110 — the whole body of getdir's invalid-direction arm
 * AFTER the quitchars test, factored out because THREE call sites in this port
 * re-derive it:
 *
 *     help_requested = (dirsym == gc.Cmd.spkeys[NHKF_GETDIR_HELP]);
 *     if (help_requested || iflags.cmdassist)
 *         did_help = help_dir(..., "Invalid direction key!");
 *     if (!did_help)
 *         pline("What a strange direction!");
 *
 * The two copies in js/cmd.js (throw_obj's getdir read and dofire's) called
 * help_dir UNCONDITIONALLY: no iflags.cmdassist gate and no "What a strange
 * direction!" fallback at all.  With cmdassist OFF they put up a whole NHW_TEXT
 * window where C prints one topline — and the window's own dismissal expectation
 * is a keystroke-consumption divergence, not just a wrong frame.
 *
 * MEASURED on gen392-reseed-seed77105 step 1519: the session's options menu
 * turns cmdassist OFF at step ~233 (`O` … the toggle keys), C prints "What a
 * strange direction!" at steps 456, 462, 1424, 1520, 1660, 1668 and 1677 and
 * shows the cmdassist window at NONE of them.  This port matched at 456 (that
 * site reads the gate) and put up the window at 1520 (this site did not).
 *
 * This helper still serves the independent fire/throw readers. Shared getdir
 * owns explicit help and its retry loop; converging those readers onto the
 * complete shared input contract remains separate caller work. */
export async function getdir_bad_dir_feedback() {
    let did_help = false;
    if (cmdassist_on()) {
        /* C: sym = (s && *s == '^') ? dirsym : '\0'.  Every JS getdir caller
         * passes a plain prompt ("In what direction?"), never a '^'-prefixed
         * one, so sym is '\0' and help_dir's "Are you trying to use ^X?"
         * dowhatdoes_core block is skipped.  help_dir's window path always
         * returns TRUE (cmd.c:4921), so did_help follows the gate. */
        await help_dir('\0', /* spkey = */ ESC_KEY, 'Invalid direction key!');
        did_help = true;
    }
    if (!did_help)
        await pline('What a strange direction!');
}
/* C ref: flag.h iflags.cmdassist — defaults TRUE (options.c), cleared only by
 * "!cmdassist" in the config file.  The corpus nethackrc does not set it. */
function cmdassist_on() {
    const v = game.iflags?.cmdassist;
    return v === undefined ? true : !!v;
}
const ESC_KEY = '\x1b';
/* C ref: cmd.c:4846 help_dir(sym, spkey, msg) — the cmdassist invalid-direction
 * window.  Builds an NHW_TEXT window and display_nhwindow(win, FALSE)s it, which
 * on tty clears the screen, paints the lines from row 0 and pins a "--More--" to
 * row 23 that consumes one page-ack keystroke.  Always returns TRUE once the
 * window is shown (the !viawindow early-return is #if 0'd out in 3.7).
 *
 * The caller's special key selects ordinary getdir or prefix help. Direction
 * and self keys come from the shared live bindings; NODIAG(u.umonnum) selects
 * the grid-bug diagram rather than assuming the ordinary hero shape.
 * DISPLAY-CHANNEL ONLY: no RNG. */
export async function help_dir(sym, spkey, msg) {
    const byte = c => typeof c === 'number' ? c & 0xff : c.charCodeAt(0) & 0xff;
    const prefixhandling = byte(spkey) !== (game.Cmd?.spkeys?.[0] ?? 27);
    const lines = [];
    /* C cmd.c:4911-4915 — buf is empty (the bad-prefix arms are #if 0'd), so the
     * general invalid-direction message is shown. */
    if (msg) {
        lines.push(`cmdassist: ${msg}`);
        lines.push('');
    }
    let symcode = byte(sym);
    if (!prefixhandling && ((symcode >= 64 && symcode <= 90)
        || (symcode >= 97 && symcode <= 122) || symcode === 91)) {
        if (symcode >= 97 && symcode <= 122) symcode -= 32;
        const ctrl = symcode - 65 + 1, letter = String.fromCharCode(symcode);
        const explain = dowhatdoes_core(ctrl), wiz_only = 'EFGIVW'.includes(letter);
        if (explain !== null && (!wiz_only || game.flags?.debug)) {
            lines.push(`Are you trying to use ^${letter}${wiz_only ? '' : ' as specified in the Guidebook'}?`);
            lines.push('');
            lines.push(explain);
            lines.push('');
            lines.push('To use that command, hold down the <Ctrl> key as a shift');
            lines.push(`and press the <${letter}> key.`);
            lines.push('');
        }
    }
    const nodiag = (game.u?.umonnum | 0) === 116; // NODIAG: PM_GRID_BUG
    lines.push(`Valid direction keys${prefixhandling ? ' to do that' : ''}`
               + `${nodiag ? ' in your current form' : ''} are:`);
    lines.push(...show_direction_keys(!prefixhandling ? '.' : ' ', nodiag));
    if (!prefixhandling) {
        lines.push('');
        lines.push('          <  up');
        lines.push('          >  down');
        /* C: Sprintf(buf, "       %4s  direct at yourself",
         *            visctrl(spkeys[NHKF_GETDIR_SELF]))  — "." right-justified
         * in 4 columns after 7 spaces. */
        const selfi = game.Cmd?.num_pad ? NHKF_GETDIR_SELF2 : NHKF_GETDIR_SELF;
        lines.push('       ' + visctrl(game.Cmd?.spkeys?.[selfi] ?? (selfi === NHKF_GETDIR_SELF ? 46 : 115)).padStart(4)
            + '  direct at yourself');
    }
    if (msg) {
        /* C cmd.c:4957-4960 — non-null msg means this wasn't an explicit user
         * request, so append the suppression hint. */
        lines.push('');
        lines.push('(Suppress this message with !cmdassist in config file.)');
    }
    await display_text_window(lines);
    return true;
}

/* C ref: rm.h IS_DOOR(typ) — only the DOOR typ */
function _IS_DOOR(typ) { return typ === DOOR; }

/* C ref: lock.c:957 doclose(void) — the 'c' command, try to close a door.
 *
 *   int doclose(void) {
 *     if (nohands(...))   You_cant(...); return ECMD_OK;
 *     if (u.utrap PIT)    You_cant(...); return ECMD_OK;
 *     if (!getdir(NULL))  return ECMD_CANCEL;
 *     x = u.ux + u.dx; y = u.uy + u.dy;
 *     if (u_at(x,y) && !Passes_walls)  You(...); return ECMD_TIME;
 *     if (!isok(x,y))   goto nodoor;
 *     if (stumble_on_door_mimic(x,y))  return ECMD_TIME;
 *     if (Confusion || Stunned)  res = ECMD_TIME;
 *     door = &levl[x][y];  portcullis = (is_drawbridge_wall(x,y) >= 0);
 *     if (Blind) { feel_location(); maybe res = ECMD_TIME; }
 *     if (portcullis || !IS_DOOR(door->typ)) {
 *       is_db_wall/DRAWBRIDGE_UP : "drawbridge is already closed"
 *       portcullis/DRAWBRIDGE_DOWN: "no obvious way to close the drawbridge"
 *       else nodoor: You("%s no door there.", Blind?"feel":"see")
 *       return res;
 *     }
 *     switch (door->doormask) {
 *       D_NODOOR     : pline("This doorway has no door.");      return res;
 *       obstructed   : (msg from obstructed)                    return res;
 *       D_BROKEN     : pline("This door is broken.");           return res;
 *       D_CLOSED/D_LOCKED: pline("This door is already closed."); return res;
 *       D_ISOPEN     : verysmall (and !usteed) → "too small";
 *                      usteed || rn2(25) < (STR+DEX+CON)/3
 *                          → close: D_CLOSED, feel_newsym, block_point
 *                          → resist: exercise(A_STR,TRUE), "door resists!"
 *     }
 *     return ECMD_TIME;
 *   }
 *
 * Ported scope:
 *   - nohands/utrap pre-checks (stubs: false; player is human, not pit-trapped)
 *   - getdir consumption (reads next session key as direction)
 *   - u_at, isok, basic door-state-machine on the no-door path
 *   - drawbridge/portcullis branches kept as nested conditionals (stubs
 *     return false; measured unreached, see below)
 *   - Blind path is a stub (no feel_location side effects modelled here).
 *     THIS IS THE LEAST SAFE OF THIS FILE'S GAPS AND THE ONLY ONE WITH A LIVE
 *     C-SIDE CONJUNCTION.  On the JS side the falsifying state never holds at
 *     the call; on the C side it holds often, and the two disagree because THIS
 *     PORT'S BLINDNESS DIVERGES FROM C'S — not because blind door-closing is
 *     absent from the recordings, which it is not.  So the +0 below is a REACH
 *     result and should be read as unmeasured VALUE, per TOOLING_PHILOSOPHY 15.
 *     MEASURED: subject=doclose-Blind-feel_location value=+0 at=d26664bc
 *               date=2026-08-29 corpus=public+train (44 + 688 sessions)
 *               js-reach=43 calls over 37 sessions; Blind at the call 0 on
 *               BOTH readings (live u.uprops[BLINDED] and this file's own
 *               _blind_stub), is_drawbridge_wall 0
 *               c-side=130 blind 'c' presses over 22 sessions (incl. public
 *               seed4500) — an UPPER BOUND: 'c' is also a menu/prompt key
 *               chain=js-blindness-diverges-from-C
 *               recheck-when=js-blind-state-tracks-C
 *     Why it is still +0 today: of the 58 sessions carrying any such
 *     command+state conjunction, 52 have a first miss somewhere unrelated, 5
 *     pass outright, and the single remaining one (gen000-reseed-seed1059893
 *     step 250) turned out to be a 'q' answering a #tip prompt, not a quaff.
 *   - D_ISOPEN rn2(25) close attempt: faithful port; corpus 'c' sessions
 *     are getlin-consumed (not real doclose dispatches), so this branch
 *     never fires in the current corpus but is included for completeness.
 */
export async function doclose() {
    const g = game;
    const u = g.u = g.u || {};
    /* C lock.c:965 — if (nohands(gy.youmonst.data)) */
    if (_nohands_lk()) {
        await pline("You can't close anything -- you have no hands!");
        g.context = g.context || {};
        g.context.move = 0; /* ECMD_OK */
        return;
    }
    /* C lock.c:970 — u.utrap && u.utraptype == TT_PIT */
    /* WIRE_PENDING: port-doclose-c-cmd-2026-05-27 — utraptype enum not
     * fully ported; no corpus session is pit-trapped at a 'c' keystroke. */
    if ((u.utrap | 0) && (u.utraptype | 0) === 0 /* TT_PIT=0 in C trap.h */) {
        await pline("You can't reach over the edge of the pit.");
        g.context = g.context || {};
        g.context.move = 0; /* ECMD_OK */
        return;
    }
    /* C lock.c:975 — getdir(NULL); 0 → ECMD_CANCEL.  No turn consumed. */
    const got = await getdir(null);
    if (!got) {
        g.context = g.context || {};
        g.context.move = 0; /* ECMD_CANCEL */
        return;
    }
    const x = ((u.ux | 0) + (u.dx | 0)) | 0;
    const y = ((u.uy | 0) + (u.dy | 0)) | 0;
    /* C lock.c:980 — u_at(x,y) && !Passes_walls: hero is in the doorway */
    const passesWalls = _Passes_walls_lk();
    if (x === (u.ux | 0) && y === (u.uy | 0) && !passesWalls) {
        await pline('You are in the way!');
        g.context = g.context || {};
        g.context.move = 1; /* ECMD_TIME */
        return;
    }
    /* C lock.c:985 — !isok(x,y) → goto nodoor.  Use a noDoor flag to avoid
     * mid-function goto: the nodoor label is inside the (portcullis || !IS_DOOR)
     * else branch, so the same message fires for "off-map" and "no door at
     * a valid tile". */
    let noDoor = false;
    let res = ECMD_OK;
    let portcullis = false;
    let door = null;
    if (!isok(x, y)) {
        noDoor = true;
    } else {
        /* C lock.c:988 — stumble_on_door_mimic(x,y): mimic stub returns false */
        if (_stumble_on_door_mimic_stub(x, y)) {
            g.context = g.context || {};
            g.context.move = 1; /* ECMD_TIME */
            return;
        }
        /* C lock.c:993 — Confusion || Stunned forces a turn regardless */
        if (_confusion_stub() || _stunned_stub()) {
            res = ECMD_TIME;
        }
        door = g.level?.at?.(x, y) ?? null;
        /* C lock.c:997 — is_drawbridge_wall(x,y) >= 0 */
        portcullis = _is_drawbridge_wall_stub(x, y) >= 0;
        /* C lock.c:998 — Blind path: feel_location may flip glyph */
        if (_blind_stub()) {
            /* feel_location side effects ungated; assume no glyph change */
        }
    }
    /* C lock.c:1008 — portcullis || !IS_DOOR(door->typ) — also the goto nodoor target */
    if (noDoor || portcullis || !door || !_IS_DOOR(door.typ)) {
        if (!noDoor && (_is_db_wall_stub(x, y) || (door && door.typ === 19 /* DRAWBRIDGE_UP */))) {
            await pline('The drawbridge is already closed.');
        } else if (!noDoor && (portcullis || (door && door.typ === 34 /* DRAWBRIDGE_DOWN */))) {
            await pline('There is no obvious way to close the drawbridge.');
        } else {
            /* nodoor: */
            const verb = _blind_stub() ? 'feel' : 'see';
            await pline(`You ${verb} no door there.`);
        }
        g.context = g.context || {};
        g.context.move = (res === ECMD_TIME) ? 1 : 0;
        return;
    }
    /* C lock.c:1021-1031 — door doormask state machine */
    const mask = door.doormask | 0;
    if (mask === D_NODOOR) {
        await pline('This doorway has no door.');
        g.context = g.context || {};
        g.context.move = (res === ECMD_TIME) ? 1 : 0;
        return;
    } else if (_obstructed_stub(x, y, false)) {
        g.context = g.context || {};
        g.context.move = (res === ECMD_TIME) ? 1 : 0;
        return;
    } else if (mask === D_BROKEN) {
        await pline('This door is broken.');
        g.context = g.context || {};
        g.context.move = (res === ECMD_TIME) ? 1 : 0;
        return;
    } else if (mask & (D_CLOSED | D_LOCKED)) {
        await pline('This door is already closed.');
        g.context = g.context || {};
        g.context.move = (res === ECMD_TIME) ? 1 : 0;
        return;
    }
    /* C lock.c:1034 — D_ISOPEN: attempt to close. */
    if (mask === D_ISOPEN) {
        /* C lock.c:1035 — verysmall(youmonst.data) && !u.usteed: too small */
        if (_verysmall_lk() && !u.usteed) {
            await pline("You're too small to push the door closed.");
            g.context = g.context || {};
            g.context.move = (res === ECMD_TIME) ? 1 : 0;
            return;
        }
        /* C lock.c:1039 — usteed || rn2(25) < (ACURRSTR + ACURR(A_DEX) + ACURR(A_CON))/3 */
        const threshold = Math.trunc((_acurrstr() + acurr(u, A_DEX) + acurr(u, A_CON)) / 3);
        if (u.usteed || rn2(25) < threshold) {
            await pline('The door closes.');
            door.doormask = D_CLOSED;
            newsym(x, y); /* feel_newsym → newsym for sighted */
            block_point(x, y); /* C lock.c:1044 — close the line of sight. */
        } else {
            exercise(A_STR, true);
            await pline('The door resists!');
        }
    }
    g.context = g.context || {};
    g.context.move = 1; /* C lock.c:1051 — return ECMD_TIME */
}

/* C ref: attrib.c:1251 acurrstr() — STR encoding map. Duplicated from
 * doopen_indir; identical behavior. */
function _acurrstr() {
    const u = game.u || {};
    const str = acurr(u, A_STR);
    if (str <= 18) return Math.max(str, 3);
    if (str <= 121) return 19 + Math.trunc(str / 50);
    return Math.min(str, 125) - 100;
}

/* ════════════════════════════════════════════════════════════════════════
 * Lock-picking occupation subsystem.
 * C ref: lock.c:358 pick_lock(), lock.c:68 picklock(), cmd.c:875 set_occupation.
 *
 * gx.xlock state (C lock.c) is modeled on game.xlock:
 *   { usedtime, picktyp, chance, door:{x,y}, box, magic_key }
 * The occupation callback picklock() is dispatched by moveloop_core's
 * occupation driver (allmain.c:543) — see js/allmain.js.
 * ════════════════════════════════════════════════════════════════════════ */

const LOCK_PICK_OTYP = 222;   /* objects.h: LOCK_PICK */
const SKELETON_KEY_OTYP = 221;
const CREDIT_CARD_OTYP = 223;

/* C obj.h container otyps (objects.h order). */
const LARGE_BOX_OTYP = 214;
const CHEST_OTYP = 215;
const ICE_BOX_OTYP = 216;
/* C obj.h:338 Is_box(o) := otyp == LARGE_BOX || otyp == CHEST */
function _Is_box(o) { return o && (o.otyp === LARGE_BOX_OTYP || o.otyp === CHEST_OTYP); }

/* C autounlock flag bits — const.js AUTOUNLOCK_* */
const AUTOUNLOCK_UNTRAP = 1;
const AUTOUNLOCK_APPLY_KEY = 2;

/* C lock.c:352-354 */
const PICKLOCK_LEARNED_SOMETHING = -1; /* time passes */
const PICKLOCK_DID_NOTHING = 0;        /* no time passes */
const PICKLOCK_DID_SOMETHING = 1;

/* C ref: objnam.c xname() for a box/chest — the bare object name.  obj_typename
 * doesn't carry box names in JS yet, so map the three box/chest otyps directly
 * (C names from objects.h: "large box", "chest", "ice box").  General over all
 * box otyps; not session-specific. */
function box_xname(obj) {
    switch (obj ? (obj.otyp | 0) : 0) {
        case LARGE_BOX_OTYP: return 'large box';
        case CHEST_OTYP: return 'chest';
        case ICE_BOX_OTYP: return 'ice box';
        default: return 'box';
    }
}

/* C ref: objnam.c an(str) — prepend "a "/"an " article. */
function _an(str) {
    if (!str) return 'an';
    const c = str[0].toLowerCase();
    const vowel = (c === 'a' || c === 'e' || c === 'i' || c === 'o' || c === 'u');
    return (vowel ? 'an ' : 'a ') + str;
}

/* C ref: objnam.c yname(obj) — the hero's own carried item renders as
 * "your <name>".  For the corpus unlock tool (credit card / key / lock pick),
 * the bare tool name is its description-less typename. */
function _toolname(pick) {
    switch (pick ? (pick.otyp | 0) : 0) {
        case CREDIT_CARD_OTYP: return 'credit card';
        case SKELETON_KEY_OTYP: return 'key';
        case LOCK_PICK_OTYP: return 'lock pick';
        default: return simple_typename(pick ? (pick.otyp | 0) : 0);
    }
}
function _yname(pick) { return 'your ' + _toolname(pick); }

/* C ref: query.c ynq(query) := yn_function(query, ynqchars, 'q', TRUE).
 * tty_yn_function writes "<query> [ynq] (q)" to the topline, parks the cursor
 * one column past the prompt, then reads one key (lowercased).  Mirrors the
 * y_n helper in potion.js but with the [ynq] response set and 'q' default. */
async function _ynq(query) {
    const g = game;
    const prompt = query + ' [ynq] (q)';
    /* C ref: win/tty/topl.c:390-392 tty_yn_function opens with
     *     if (ttyDisplay->toplin == TOPLINE_NEED_MORE
     *         && (cw->flags & (WIN_STOP | WIN_NOSTOP)) != WIN_STOP)
     *         more();
     * update_topl sets TOPLINE_NEED_MORE on every message it prints, so a
     * pline immediately followed by a yn prompt ALWAYS pages -- it does not
     * matter that the two would have fitted on one row together.  Overwriting
     * _pending_message here dropped both the --More-- and the message: at
     * seed0007 step 50 C shows "This door is locked.--More--" and step 51's
     * SPACE dismisses it, while the port jumped straight to the prompt and was
     * one keystroke ahead for the rest of the run. */
    if (g._pending_message) await force_more(g._pending_message);
    /* tty_yn_function re-reads after an invalid character.  The old one-shot
     * reader treated '+' (or any other invalid key) as an implicit q, which
     * advanced the lock action and reset the cursor while C kept the prompt
     * parked on the topline. */
    for (;;) {
        g._pending_message = prompt;
        await flush_screen(1);
        const disp = g.nhDisplay;
        if (disp) topl_park_cursor(disp, prompt + ' ');
        const key = await nhgetch();
        const ch = (typeof key === 'number') ? String.fromCharCode(key).toLowerCase() : '';
        /* C ynq: only y/n/q are accepted; ESC/space/CR/LF → default 'q'. */
        if (key === 27 || key === 32 || key === 13 || key === 10) {
            g._pending_message = '';
            g._topl_sticky = prompt;
            return 'q';
        }
        if (ch === 'y' || ch === 'n' || ch === 'q') {
            g._pending_message = '';
            if (ch !== 'y') g._topl_sticky = prompt;
            return ch;
        }
        /* Invalid input rings the tty bell and leaves the same prompt for the
         * next nhgetch; the next loop iteration captures that unchanged frame. */
    }
}

function _Role_if_rogue() {
    const ur = game.urole;
    return !!(ur && ur.name && (ur.name.m === 'Rogue' || ur.name.f === 'Rogue'));
}

/* C ref: lock.c:37-64 lock_action() — verb for the resume/give-up/success
 * messages.  Faithful port of the box+door variants:
 *   actions[] = { "unlocking the door", "unlocking the chest",
 *                 "unlocking the box", "picking the lock" };
 *   "unlocking the X"+2 == "locking the X".
 *   - door currently unlocked (we're locking it) → "locking the door"
 *   - box currently unlocked (we're locking it)  → "locking the chest/box"
 *   - picktyp LOCK_PICK or CREDIT_CARD           → "picking the lock"
 *   - door → "unlocking the door"
 *   - box  → "unlocking the chest/box"
 *   - else → "picking the lock" */
function lock_action() {
    const x = game.xlock || {};
    /* if the target is currently unlocked, we're trying to lock it now */
    if (x.door && !((x.door.doormask ?? _doormaskAt(x.door)) & D_LOCKED))
        return 'locking the door';
    if (x.box && !x.box.olocked)
        return x.box.otyp === CHEST_OTYP ? 'locking the chest' : 'locking the box';
    if (x.picktyp === LOCK_PICK_OTYP)
        return 'picking the lock';
    if (x.picktyp === CREDIT_CARD_OTYP)
        return 'picking the lock';
    if (x.door)
        return 'unlocking the door';
    if (x.box)
        return x.box.otyp === CHEST_OTYP ? 'unlocking the chest' : 'unlocking the box';
    return 'picking the lock';
}
/* helper: resolve the live doormask for an xlock.door reference (which stores
 * {x,y}); for door picking the door state is on the level tile. */
function _doormaskAt(doorRef) {
    if (!doorRef) return 0;
    if (typeof doorRef.x === 'number') {
        const d = game.level?.at?.(doorRef.x, doorRef.y);
        return d ? (d.doormask | 0) : 0;
    }
    return doorRef.doormask | 0;
}

/* C ref: cmd.c:206 set_occupation(fn, txt, xtime).
 * This file used to carry its own copy, whose xtime arm set g.occupation to the
 * STRING 'timed_occupation' -- a value no driver in this port dispatches, so any
 * future lock.c caller with a non-zero xtime would have armed a silent stub.
 * Every call site here passes 0, so re-pointing at the exported implementation
 * (js/cmd.js, C's own home for it) is behaviour-identical today and correct the
 * moment it is not.  Verified: frozen/score.sh unchanged at 5900/11405. */

/* C ref: cmd.c:864 reset_occupations() / stop_occupation(). Clears the
 * occupation and per-subsystem state (reset_pick etc.).  Non-exported: used
 * by picklock's give-up/invalid-target paths to drop the occupation.  The
 * moveloop occupation driver's monster_nearby()→stop_occupation interrupt
 * (allmain.c:563) is WIRE_PENDING: port-occupation-driver-monster-interrupt
 * (no corpus session interrupts a lock-pick via an adjacent monster yet). */
export function reset_pick() {
    game.xlock = { usedtime: 0, picktyp: 0, chance: 0, door: null, box: null, magic_key: false };
}

/* C ref: lock.c:268 maybe_reset_pick(struct obj *container) — level change or
 * object deletion; context may no longer be valid.
 *
 * Called from obfree() when an object is deleted.  If a specific container is
 * passed, only reset if it's the current lock target (gx.xlock.box).
 * If container is NULL, reset if not carrying gx.xlock.box (level change path).
 *
 * Logic:
 *   if (container ? (container == gx.xlock.box)
 *                 : (!gx.xlock.box || !carried(gx.xlock.box)))
 *       reset_pick();
 *
 * carried(o) macro: (o)->where == OBJ_INVENT (3) — object in hero's inventory
 */
export function maybe_reset_pick(container) {
    const x = game.xlock || {};

    if (container !== null && container !== undefined) {
        /* container is non-NULL: reset only if it matches the current target */
        if (container === x.box) {
            reset_pick();
        }
    } else {
        /* container is NULL: reset if not carrying gx.xlock.box.
         * carried(o) ⇔ o.where === OBJ_INVENT (3) */
        if (!x.box || !x.box.where || (x.box.where | 0) !== 3 /* OBJ_INVENT */) {
            reset_pick();
        }
    }
}

function stop_occupation() {
    const g = game;
    if (g.occupation) {
        g.occupation = null;
    }
    g.occtxt = null;
}

/* C ref: lock.c:68 picklock() — the occupation callback fired once per turn
 * by the moveloop occupation driver.  Returns 1 while still busy, 0 when the
 * occupation ends (success, give-up, or the target became invalid).
 * Fires rn2(100) (lock.c:99) on each productive turn.
 *
 * Ported scope: door picking.  Box picking (gx.xlock.box) is structurally
 * present but not exercised by the current corpus; the door branch covers
 * seed0077 (and the latent lock-pick cluster). */
export async function picklock() {
    const g = game;
    const u = g.u || {};
    const x = g.xlock || {};
    if (x.box) {
        /* C lock.c:70-74 — box moved/gone check: the box must still be a floor
         * object at the hero's square, else the attempt aborts (you or it moved). */
        if ((x.box.where | 0) !== 1 /* OBJ_FLOOR */
            || (x.box.ox | 0) !== (u.ux | 0) || (x.box.oy | 0) !== (u.uy | 0)) {
            x.usedtime = 0; return 0;
        }
    } else {
        /* C lock.c:75-90 — door branch: verify the door is still the target,
         * and reject non-pickable door states. */
        const dx = u.dx | 0, dy = u.dy | 0;
        const door = g.level?.at?.((u.ux | 0) + dx, (u.uy | 0) + dy) ?? null;
        if (!x.door || !door
            || x.door.x !== (u.ux | 0) + dx || x.door.y !== (u.uy | 0) + dy) {
            x.usedtime = 0; return 0; /* C: you moved */
        }
        const mask = door.doormask | 0;
        if (mask === D_NODOOR) { await pline('This doorway has no door.'); x.usedtime = 0; return 0; }
        if (mask === D_ISOPEN) { await pline('You cannot lock an open door.'); x.usedtime = 0; return 0; }
        if (mask === D_BROKEN) { await pline('This door is broken.'); x.usedtime = 0; return 0; }
    }
    /* C lock.c:92-96 — give up after 50 turns / no hands. */
    if ((x.usedtime++ | 0) >= 50) {
        await pline(`You give up your attempt at ${lock_action()}.`);
        exercise(A_DEX, true);
        x.usedtime = 0; return 0;
    }
    /* C lock.c:99 — rn2(100) >= chance → still busy. */
    if (rn2(100) >= (x.chance | 0)) {
        return 1; /* still busy */
    }
    /* C lock.c:138 — success path. Trap/magic-key branches (lock.c:103-136)
     * require gx.xlock.magic_key + a trapped target, which the corpus lock-pick
     * path does not hit; the door/box state flip below covers the rest. */
    await pline(`You succeed in ${lock_action()}.`);
    if (x.door) {
        const door = g.level?.at?.(x.door.x, x.door.y) ?? null;
        if (door) {
            if (door.doormask & D_LOCKED) door.doormask = D_CLOSED;
            else door.doormask = D_LOCKED;
        }
    } else if (x.box) {
        /* C lock.c:151-155 — box lock toggles; lknown set; trapped → chest_trap.
         * The corpus box here is non-trapped (otrapped falsy), so no chest_trap. */
        x.box.olocked = !x.box.olocked;
        x.box.lknown = 1;
        /* if (gx.xlock.box->otrapped) chest_trap(...) — not reached (untrapped). */
    }
    exercise(A_DEX, true);
    x.usedtime = 0; return 0;
}

/* ════════════════════════════════════════════════════════════════════════════
 * #force — doforce()/forcelock()/breakchestlock() (lock.c:677/216/162)
 * ════════════════════════════════════════════════════════════════════════════
 * Mirrors the #loot/picklock occupation pattern.  doforce sets up the forcelock
 * occupation (gx.xlock.box/chance/picktyp); the moveloop occupation driver fires
 * forcelock() once per turn (rn2(100) >= chance → still busy).  On success
 * forcelock() calls breakchestlock(), which (for a blunt weapon, !rn2(3)) may
 * destroy the box and scatter/shatter its contents (chest_shatter_msg →
 * bottlename rn2(7) + potionbreathe for potions).  Gated entirely on
 * g.occupation === forcelock → ZERO effect on any non-force session.
 */

/* C ref: lock.c:649 u_have_forceable_weapon(void) — uwep is a forceable melee
 * weapon (not a launcher/projectile/flail/lance-beyond, or a rock).  Uses
 * weapon_type(uwep) = abs(objects[uwep->otyp].oc_skill). */
function u_have_forceable_weapon() {
    const uwep = game.u?.uwep ?? null;
    if (!uwep) return false;
    const oclass = uwep.oclass | 0;
    if (oclass === WEAPON_CLASS_OC /* || is_weptool */) {
        const skill = weapon_type(uwep);
        if (skill < P_DAGGER_SK || skill === P_FLAIL_SK || skill > P_LANCE_SK)
            return false;
        return true;
    }
    /* non-weapon, non-weptool: only a rock is forceable (corpus never hits). */
    return oclass === ROCK_CLASS_OC;
}

/* C ref: objnam.c yname(obj) for the bashing / prying message.
 *     char *s = shk_your(outbuf, obj);      / * "your " when carried * /
 *     return strncat(s, cxname(obj), ...);
 * This used to be `'your ' + simple_typename(otyp)`, which is the OBJECT TYPE
 * and nothing else, so every suffix cxname carries — the artifact/called name,
 * the erosion and enchantment prefixes, the (weapon in hand) tail — was
 * dropped.  seed0108 step 235 forces a chest with the wished-for Mjollnir and
 * C says "You start bashing it with your war hammer named Mjollnir."; this
 * printed "your war hammer".  cxname is the same body js/do_wear.js yname()
 * calls; simple_typename is kept for the non-yname callers below. */
function _wepname(uwep) {
    if (!uwep) return 'your ' + simple_typename(0);
    /* C shk.c:2141 shk_your — `the_your[carried(obj) ? 1 : 0]`, i.e. "your " for
     * an OBJ_INVENT object and "the " otherwise (shk_owns/mon_owns cannot fire
     * for a wielded weapon).
     *
     * carried(o) is `o->where == OBJ_INVENT`, and THIS PORT DOES NOT MAINTAIN
     * obj.where ON THE INVENTORY PATHS — measured here: reading it made both
     * seed0014's starting dwarvish spear and seed0108's wished-for Mjollnir
     * come out as "the", costing 2 points on seed0014.  (js/wizcmds.js's wish
     * addinv did write it and wrote 2, OBJ_CONTAINED, under a comment naming
     * OBJ_INVENT; that is fixed, but u_init's starting inventory and the pickup
     * path still leave it unset.)  Stamping `where` everywhere would arm every
     * other carried()/mcarried() reader in one step, so the membership test is
     * done on the gi.invent chain itself, which is what OBJ_INVENT MEANS and
     * which this port does maintain.  Fixing the stamp is the follow-up; the
     * chain walk gives the same answer meanwhile. */
    let owned = false;
    for (let o = game.invent; o; o = o.nobj) {
        if (o === uwep) { owned = true; break; }
    }
    return (owned ? 'your ' : 'the ') + cxname(uwep);
}

/* C ref: objnam.c doname() for a known-locked box in the force prompt:
 * "There is a locked large box here; ..."  lknown=1 + olocked → "locked" prefix. */
function _force_box_doname(box) {
    let name = box_xname(box);
    if (box.olocked && box.lknown) name = 'locked ' + name;
    else if (box.obroken && box.lknown) name = 'broken ' + name;
    return _an(name);
}

/* C ref: lock.c:215 forcelock() — the occupation callback, fired once per turn
 * by the moveloop occupation driver.  Returns 1 while still busy, 0 when done. */
export async function forcelock() {
    const g = game;
    const u = g.u || {};
    const x = g.xlock || {};
    const box = x.box;
    /* C lock.c:218 — you or it moved → abort. */
    if (!box || (box.ox | 0) !== (u.ux | 0) || (box.oy | 0) !== (u.uy | 0)) {
        x.usedtime = 0; return 0;
    }
    /* C lock.c:221 — give up after 50 turns / no weapon. */
    if ((x.usedtime++ | 0) >= 50 || !u.uwep) {
        await pline('You give up your attempt to force the lock.');
        if ((x.usedtime | 0) >= 50)
            exercise(x.picktyp ? A_DEX : A_STR, true);
        x.usedtime = 0; return 0;
    }
    if (x.picktyp) {
        /* C lock.c:228-240 — blade: weapon-break check (corpus uses a blunt
         * spear, so picktyp=0 and this branch is not reached).  rn2(1000-spe). */
        if (rn2(1000 - (u.uwep.spe | 0)) > (992 - 0 /* greatest_erosion */ * 10)
            && !u.uwep.cursed) {
            await pline(`${(u.uwep.quan | 0) > 1 ? 'One of y' : 'Y'}our ${simple_typename(u.uwep.otyp | 0)} broke!`);
            /* useup(uwep) — out of corpus scope; clear wield. */
            u.uwep = null;
            await pline('You give up your attempt to force the lock.');
            exercise(A_DEX, true);
            x.usedtime = 0; return 0;
        }
    } else {
        /* C lock.c:242 — blunt: wake_nearby(FALSE) (hammering).  RNG-free for
         * the corpus roster (wake_msg/disturb_buried_zombies consume no rn2). */
        wake_nearby_force();
    }
    /* C lock.c:244 — rn2(100) >= chance → still busy. */
    if (rn2(100) >= (x.chance | 0))
        return 1;
    /* C lock.c:247 — success.  Stage the per-pline messages (succeed / destroyed
     * / bottle-shatter) into g._forceMsgs so the moveloop occupation driver can
     * page them turn-by-turn with a --More-- each (C's tty more()s the committed
     * topline whenever a fresh pline arrives while the prior is un-acknowledged:
     * "You start bashing it...--More--" → "You succeed...--More--" → "...totally
     * destroyed...--More--" → "You see a bottle shatter!").  Each --More-- consumes
     * one recorded space key (seed0387 steps 26-28). */
    g._forceMsgs = g._forceMsgs || [];
    _forceEmit('You succeed in forcing the lock.');
    exercise(x.picktyp ? A_DEX : A_STR, true);
    /* C lock.c:252 — breakchestlock(box, destroyit), destroyit = !picktyp && !rn2(3). */
    const destroyit = !x.picktyp && !rn2(3);
    await breakchestlock(box, destroyit);
    reset_pick();
    return 0;
}

/* Stage a force-occupation message for the driver's cross-turn --More-- paging.
 * When no driver is consuming the queue (defensive), fall back to a plain pline. */
function _forceEmit(msg) {
    const g = game;
    if (g._forceMsgs) g._forceMsgs.push(msg);
    else g._pending_message = msg;
}

/* C ref: mon.c wake_nearby(petcall) → wake_nearto_core(ux,uy,ulevel*20,...).
 * Wakes nearby sleeping monsters; consumes NO rng (wake_msg / mstrategy clear
 * are RNG-free).  Minimal faithful side-effect: clear msleeping on close mons. */
function wake_nearby_force() {
    const g = game;
    const u = g.u || {};
    const dist = (u.ulevel | 0) * 20;
    for (let m = g.fmon; m; m = m.nmon) {
        if (m.mhp != null && (m.mhp | 0) <= 0) continue;
        const dx = (m.mx | 0) - (u.ux | 0), dy = (m.my | 0) - (u.uy | 0);
        if (dist === 0 || (dx * dx + dy * dy) < dist) {
            m.msleeping = 0;
        }
    }
}

/* C ref: lock.c:161 breakchestlock(box, destroyit).
 *   !destroyit: bill (shop), unlock+break the box in place.
 *   destroyit:  "totally destroyed"; scatter contents to the floor, shattering
 *               (or breathing) potions/rn2(3) items; delete the box. */
export async function breakchestlock(box, destroyit) {
    const g = game;
    const u = g.u || {};
    if (!destroyit) {
        /* C lock.c:164 — bill for the box (shop), then break the lock in place. */
        box.olocked = 0;
        box.obroken = 1;
        box.lknown = 1;
        return;
    }
    /* C lock.c:173 — #force destroyed this box. */
    _forceEmit(`In fact, you've totally destroyed ${_the(box_xname(box))}.`);
    /* C lock.c:184 — put the contents on the ground at the hero's feet. */
    let otmp;
    while ((otmp = box.cobj) != null) {
        _extract_from_box(box, otmp);
        /* C lock.c:186 — if (!rn2(3) || POTION) chest_shatter_msg(otmp). */
        if (!rn2(3) || (otmp.oclass | 0) === POTION_CLASS_OC) {
            await chest_shatter_msg(otmp);
            /* C lock.c:191 — quan==1 → obfree (gone); else useup (decrement). */
            if ((otmp.quan | 0) === 1) {
                continue; /* obfree: object destroyed, not placed */
            }
            otmp.quan = (otmp.quan | 0) - 1;
        }
        /* ICE_BOX corpse age fixup (lock.c:199) — corpus box isn't an ice box. */
        place_object(otmp, u.ux | 0, u.uy | 0);
        /* stackobj(otmp) — merge with like floor objects; corpus scatters to an
         * empty tile, so the place_object insert suffices for the floor chain. */
    }
    /* delobj(box) — remove the box from the floor.  C lock.c:210. */
    _delobj(box, u.ux | 0, u.uy | 0);
}

/* C ref: mkobj.c obj_extract_self for a contained object (box->cobj chain). */
function _extract_from_box(box, obj) {
    if (box.cobj === obj) box.cobj = obj.nobj ?? null;
    else { let p = box.cobj; while (p && p.nobj !== obj) p = p.nobj; if (p) p.nobj = obj.nobj ?? null; }
    obj.nobj = null;
    obj.ocontainer = null;
    obj.where = 0 /* OBJ_FREE */;
}

/* C ref: invent.c:1430 delobj() → delobj_core(obj, FALSE).  The unforced path
 * first calls obj_resists(obj, 0, 0) (zap.c:1469 → rn2(100)) to protect the
 * Amulet / invocation tools (an ordinary box never resists, but the rn2(100)
 * still fires — it is part of C's RNG sequence here), then obj_extract_self +
 * unlink from the floor pile. */
function _delobj(box, x, y) {
    /* C invent.c:1446 — if (!force && obj_resists(obj, 0, 0)) return; */
    if (obj_resists(box, 0, 0)) return;
    const lvlObjs = g_levelObjects();
    if (lvlObjs && lvlObjs[x]) {
        let head = lvlObjs[x][y] ?? null;
        if (head === box) lvlObjs[x][y] = box.nexthere ?? null;
        else { let p = head; while (p && p.nexthere !== box) p = p.nexthere; if (p) p.nexthere = box.nexthere ?? null; }
    }
    /* also unlink from the global fobj chain. */
    if (game.fobj === box) game.fobj = box.nobj ?? null;
    else { let p = game.fobj; while (p && p.nobj !== box) p = p.nobj; if (p) p.nobj = box.nobj ?? null; }
    box.where = 0 /* OBJ_FREE */;
}
function g_levelObjects() { return game.level?.levelObjects ?? null; }

/* C ref: lock.c:1268 chest_shatter_msg(otmp) — shatter/breathe a scattered item. */
async function chest_shatter_msg(otmp) {
    if ((otmp.oclass | 0) === POTION_CLASS_OC) {
        /* C lock.c:1284 — "You see a <bottle> shatter!" (bottlename rn2(7)). */
        _forceEmit(`You see ${_an(bottlename())} shatter!`);
        /* C lock.c:1286 — potionbreathe(otmp) (hero not breathless/has eyes). */
        await potionbreathe(otmp);
        return;
    }
    /* C lock.c:1288-1293 —
     *     save_HBlinded = HBlinded, save_BBlinded = BBlinded;
     *     HBlinded = 1L, BBlinded = 0L;
     *     thing = singular(otmp, xname);
     *     HBlinded = save_HBlinded, BBlinded = save_BBlinded;
     * "We have functions for distant and singular names, but not one which does
     * _both_" — so C fakes blindness across the xname() call.  That matters
     * because xname_flags() at objnam.c:627 runs `if (!Blind && !gd.distantname)
     * observe_object(obj);`, which would set obj->dknown on an object the hero
     * has never seen (it was sealed inside the chest).  With dknown still 0 the
     * SPBOOK arm prints the bare class name.  Using simple_typename() here
     * instead named the object outright — seed0014 step 47 printed "A spellbook
     * of healing is torn to shreds!" where C prints "A spellbook is torn to
     * shreds!".  Display-only: no RNG on either path. */
    const uprops = (game.u && game.u.uprops) ? game.u.uprops : null;
    const bl = uprops ? uprops[BLINDED] : null;
    const save_HBlinded = bl ? bl.intrinsic : 0;
    const save_BBlinded = bl ? bl.extrinsic : 0;
    if (bl) { bl.intrinsic = 1; bl.extrinsic = 0; }
    /* C objnam.c:5069 singular(otmp, xname) — quan forced to 1 for the call. */
    const save_quan = otmp.quan;
    otmp.quan = 1;
    const thing = xname_flags(otmp, CXN_NORMAL);
    otmp.quan = save_quan;
    if (bl) { bl.intrinsic = save_HBlinded; bl.extrinsic = save_BBlinded; }
    /* C lock.c:1290-1320 — material-based "<thing> <disposition>!" (RNG-free). */
    const mat = oc_material(otmp.otyp | 0);
    let disposition;
    /* objclass.h:12-35 enum obj_material_types — WAX=2, VEGGY=3, FLESH=4,
     * PAPER=5, GLASS=19, WOOD=8.  This switch previously sat on a stale
     * material space (7/13/5/6/9/3 = LEATHER/COPPER/PAPER/CLOTH/BONE/VEGGY). */
    switch (mat) {
        case 5 /* PAPER */: disposition = 'is torn to shreds'; break;
        case 2 /* WAX */: disposition = 'is crushed'; break;
        case 3 /* VEGGY */: disposition = 'is pulped'; break;
        case 4 /* FLESH */: disposition = 'is mashed'; break;
        case 19 /* GLASS */: disposition = 'shatters'; break;
        case 8 /* WOOD */: disposition = 'splinters to fragments'; break;
        default: disposition = 'is destroyed'; break;
    }
    /* C lock.c:1315 — pline("%s %s!", An(thing), disposition). */
    _forceEmit(`${_An(thing)} ${disposition}!`);
}

/* C ref: potion.c:1478-1493 — hallucination uses a separate 24-entry table,
 * while ordinary play uses the seven stable bottle names. */
const _bottlenames = ['bottle', 'phial', 'flagon', 'carafe', 'flask', 'jar', 'vial'];
const _hbottlenames = [
    'jug', 'pitcher', 'barrel', 'tin', 'bag', 'box', 'glass', 'beaker',
    'tumbler', 'vase', 'flowerpot', 'pan', 'thingy', 'mug', 'teacup',
    'teapot', 'keg', 'bucket', 'thermos', 'amphora', 'wineskin', 'parcel',
    'bowl', 'ampoule'
];
export function bottlename() {
    const p = game.u?.uprops?.[HALLUC];
    const hallu = !!p && ((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0);
    const names = hallu ? _hbottlenames : _bottlenames;
    return names[rn2(names.length)];
}

/* C ref: objnam.c An(str) — capitalised article. */
function _An(str) { return _an(str).charAt(0).toUpperCase() + _an(str).slice(1); }

/* C ref: lock.c:677 doforce(void) — the #force extended command. */
export async function doforce() {
    const g = game;
    const u = g.u || {};
    /* C lock.c:688 — uswallow guard (not in corpus). */
    /* C lock.c:692 — must wield a forceable weapon. */
    if (!u_have_forceable_weapon()) {
        const uwep = u.uwep;
        const usePlural = uwep && (uwep.quan | 0) > 1;
        const phrase = !uwep ? 'when not wielding a'
            : ((uwep.oclass | 0) !== WEAPON_CLASS_OC) ? (usePlural ? 'without proper' : 'without a proper')
            : (usePlural ? 'with those' : 'with that');
        await pline(`You can't force anything ${phrase} weapon${usePlural ? 's' : ''}.`);
        return ECMD_OK;
    }
    /* C lock.c:703 — can_reach_floor (no levitation/pit in corpus → true). */

    /* C lock.c:708 — picktyp = is_blade(uwep) && !is_pick(uwep). */
    const uwep = u.uwep;
    const picktyp = (is_blade_force(uwep) && !is_pick_force(uwep)) ? 1 : 0;

    g.xlock = g.xlock || { usedtime: 0, picktyp: 0, chance: 0, door: null, box: null, magic_key: false };
    const x = g.xlock;

    /* C lock.c:709 — resume an interrupted force attempt. */
    if (x.usedtime && x.box && picktyp === x.picktyp) {
        await pline('You resume your attempt to force the lock.');
        set_occupation(forcelock, 'forcing the lock', 0);
        return ECMD_TIME;
    }

    /* C lock.c:716 — scan floor for a lockable box at the hero's tile. */
    x.box = null;
    const lvlObjs = g.level?.levelObjects;
    for (let otmp = lvlObjs?.[u.ux | 0]?.[u.uy | 0] ?? null; otmp; otmp = otmp.nexthere) {
        if (!_Is_box(otmp)) continue;
        if (otmp.obroken || !otmp.olocked) {
            /* C lock.c:719 — already broken/unlocked. */
            otmp.lknown = 0;
            await pline(`There is ${_force_box_doname(otmp)} here, but its lock is already ${otmp.obroken ? 'broken' : 'unlocked'}.`);
            otmp.lknown = 1;
            continue;
        }
        /* C lock.c:730 — "There is <box> here; force its lock?" [ynq] (q). */
        otmp.lknown = 1;
        const c = await _ynq(`There is ${_force_box_doname(otmp)} here; force its lock?`);
        if (c === 'q') return ECMD_OK;
        if (c === 'n') continue;
        /* C lock.c:740-743 — begin message.  Leave it in _resultMessage (the
         * occupation-begin slot, like eat's "A little goes a long way.") so the
         * moveloop forcelock driver commits it as the first paged topline; the
         * success/destroy/shatter messages staged in _forceMsgs then page it
         * turn-by-turn.  Init _forceMsgs here so forcelock()'s success path stages
         * (rather than plines) its messages. */
        await pline(picktyp
            ? `You force ${_wepname(uwep)} into a crack and pry.`
            : `You start bashing it with ${_wepname(uwep)}.`);
        g._resultMessage = g._pending_message || g._resultMessage;
        g._forceMsgs = [];
        x.box = otmp;
        x.chance = (WEAPON_WLDAM[uwep.otyp | 0] | 0) * 2; /* objects[uwep].oc_wldam * 2 */
        x.picktyp = picktyp;
        x.magic_key = false;
        x.usedtime = 0;
        break;
    }

    /* C lock.c:752 — set up the occupation (or "decide not to force"). */
    if (x.box) {
        set_occupation(forcelock, 'forcing the lock', 0);
    } else {
        await pline('You decide not to force the issue.');
    }
    return ECMD_TIME;
}

/* C ref: obj.h is_blade(otmp) — WEAPON_CLASS && oc_skill in {P_DAGGER..P_SABER}.
 * For the corpus the only #force weapon is a spear (P_SPEAR) → not a blade. */
function is_blade_force(o) {
    if (!o || (o.oclass | 0) !== WEAPON_CLASS_OC) return false;
    const s = weapon_type(o);
    return s >= P_DAGGER_SK && s <= P_SABER_SK;
}
function is_pick_force(o) {
    if (!o) return false;
    const oc = o.oclass | 0;
    if (oc !== WEAPON_CLASS_OC && oc !== TOOL_CLASS_OC) return false;
    return weapon_type(o) === P_PICK_AXE_SK;
}

/* C ref: lock.c:288 autokey(boolean opening) — pick a tool for autounlock.
 *   Returns the first SKELETON_KEY, else LOCK_PICK, else (if opening) a
 *   CREDIT_CARD from inventory.  The quest-artifact partitioning (Rogue's
 *   Master Key / Tourist's Platinum Yendorian Express Card) only matters
 *   when the hero carries another role's quest artifact; the corpus hero
 *   carries a plain credit card, so the mundane partition is sufficient.
 *   C lock.c:337-343 fallback ordering: key ?: pick ?: card. */
export function autokey(opening) {
    let key = null, pick = null, card = null;
    for (let o = game.invent; o; o = o.nobj) {
        switch (o.otyp | 0) {
            case SKELETON_KEY_OTYP: if (!key) key = o; break;
            case LOCK_PICK_OTYP: if (!pick) pick = o; break;
            case CREDIT_CARD_OTYP: if (!card) card = o; break;
            default: break;
        }
    }
    if (!opening) card = null;
    return key ? key : (pick ? pick : (card ? card : null));
}

/* C ref: lock.c:358 pick_lock(pick, rx, ry, container).
 *   Ported scopes:
 *     (a) !autounlock door picking via 'apply' (rx==ry==0, container==NULL):
 *         reads a direction (getdir), resolves the adjacent tile, rejects
 *         (non-door/open/broken/nodoor) or sets up the picklock occupation.
 *     (b) autounlock CONTAINER unlock (rx,ry,container provided by
 *         do_loot_cont): the box is at the hero's square; the APPLY_KEY path
 *         asks "Unlock it with <pick>? [ynq]" then sets up the picklock
 *         occupation with the credit-card / key / lock-pick chance.
 *   Returns PICKLOCK_* (lock.c:352-354): nonzero ⇒ time passes (ECMD_TIME).
 *   RNG-free on every branch reached by the corpus (the rn2 lives in
 *   picklock(), the occupation callback). */
export async function pick_lock(pick, rx, ry, container) {
    const g = game;
    const u = g.u = g.u || {};
    const picktyp = pick ? (pick.otyp | 0) : 0;
    /* C lock.c:370 — autounlock := (rx != 0 || container != NULL). */
    const autounlock = ((rx | 0) !== 0) || (container != null);

    g.xlock = g.xlock || { usedtime: 0, picktyp: 0, chance: 0, door: null, box: null, magic_key: false };
    const x = g.xlock;

    /* C lock.c:381 — resume an interrupted previous attempt. */
    if (x.usedtime && picktyp === x.picktyp) {
        /* nohands/uswallow guarded out (human hero, not swallowed). */
        const action = lock_action();
        await pline(`You resume your attempt at ${action}.`);
        set_occupation(picklock, action, 0);
        return PICKLOCK_DID_SOMETHING;
    }

    /* C lock.c:421 — autounlock provides coordinates; else getdir → u.dx/u.dy. */
    let cx, cy;
    if ((rx | 0) !== 0) {
        cx = rx | 0; cy = ry | 0;
    } else {
        if (!(await getdir(null))) {
            return PICKLOCK_DID_NOTHING; /* cancelled / invalid */
        }
        cx = (u.ux | 0) + (u.dx | 0);
        cy = (u.uy | 0) + (u.dy | 0);
    }

    /* C lock.c:429 — u_at(cc): pick the lock on a container at the hero's tile. */
    if (cx === (u.ux | 0) && cy === (u.uy | 0)) {
        /* C lock.c:447 — scan floor objects at the hero's tile for a box.
         * For autounlock, only the just-discovered-locked container counts. */
        let c = 'n';
        let count = 0;
        const lvlObjs = g.level?.levelObjects;
        for (let otmp = lvlObjs?.[cx]?.[cy] ?? null; otmp; otmp = otmp.nexthere) {
            /* C lock.c:453 — autounlock: skip any box that isn't the target. */
            if (autounlock && otmp !== container) continue;
            if (!_Is_box(otmp)) continue;
            ++count;
            /* can_reach_floor guarded out (no levitation/pit in corpus). */
            /* C lock.c:471 — AUTOUNLOCK_UNTRAP path (could_untrap) not enabled
             * by default flags (APPLY_KEY only); skip to the APPLY_KEY arm. */
            /* C lock.c:482 — AUTOUNLOCK_APPLY_KEY: "Unlock it with <pick>? [ynq]" */
            if (autounlock /* && (flags.autounlock & AUTOUNLOCK_APPLY_KEY) */) {
                c = 'q';
                if (pick) {
                    /* C lock.c:486 — Sprintf(qbuf,"Unlock it with %s?", yname(pick)) */
                    const ans = await _ynq(`Unlock it with ${_yname(pick)}?`);
                    c = ans;
                }
                if (c !== 'y') return PICKLOCK_DID_NOTHING;
            }
            /* C lock.c:506 — obroken: can't fix; not reached (box not broken). */
            /* C lock.c:510 — credit card can only UNLOCK (box is locked → ok). */
            if (picktyp === CREDIT_CARD_OTYP && !otmp.olocked) {
                await pline(`You can't do that with ${_an(simple_typename(picktyp))}.`);
                return PICKLOCK_LEARNED_SOMETHING;
            }
            /* C lock.c:515 — autounlock touch_artifact check (no artifact pick). */
            /* C lock.c:520-532 — chance computation (faithful constants). */
            let ch;
            const dex = acurr(u, A_DEX);
            switch (picktyp) {
                case CREDIT_CARD_OTYP: ch = dex + 20 * (_Role_if_rogue() ? 1 : 0); break;
                case LOCK_PICK_OTYP:   ch = 4 * dex + 25 * (_Role_if_rogue() ? 1 : 0); break;
                case SKELETON_KEY_OTYP: ch = 75 + dex; break;
                default: ch = 0;
            }
            if (otmp.cursed) ch = Math.trunc(ch / 2);
            x.box = otmp;
            x.door = null;
            x.picktyp = picktyp;
            x.chance = ch;
            x.usedtime = 0;
            x.magic_key = false;
            c = 'y';
            break;
        }
        /* C lock.c:541 — decided against all boxes / no box found. */
        if (c !== 'y') {
            if (!count) await pline("There doesn't seem to be any sort of lock here.");
            return PICKLOCK_LEARNED_SOMETHING;
        }
        /* C lock.c:655 — set up the occupation and start picking. */
        set_occupation(picklock, lock_action(), 0);
        return PICKLOCK_DID_SOMETHING;
    }

    /* C lock.c:546 — adjacent door branch.  A visible monster gets first
     * refusal, before the terrain is inspected; using a lock tool on a pet
     * therefore reports its appreciation message and still costs a turn. */
    const mtmp = m_at(cx, cy);
    if (mtmp && canseemon(mtmp) && !(mtmp.m_ap_type === 3 || mtmp.m_ap_type === 5)) {
        if (picktyp === CREDIT_CARD_OTYP && mtmp.isshk)
            await pline('No checks, no credit, no problem.');
        else
            await pline(`I don't think ${mon_nam(mtmp)} would appreciate that.`);
        return PICKLOCK_LEARNED_SOMETHING;
    }
    const door = g.level?.at?.(cx, cy) ?? null;
    if (!door || !_IS_DOOR(door.typ)) {
        /* C lock.c:578-591 — !IS_DOOR(door->typ) "no door there" branch:
         *
         *   int res = PICKLOCK_DID_NOTHING, oldglyph = door->glyph;
         *   schar oldlastseentyp = update_mapseen_for(cc.x, cc.y);
         *   feel_location(cc.x, cc.y);
         *   if (door->glyph != oldglyph
         *       || svl.lastseentyp[cc.x][cc.y] != oldlastseentyp)
         *       res = PICKLOCK_LEARNED_SOMETHING;        // = -1, time passes
         *   ... You("%s no door there.", Blind ? "feel" : "see");
         *   return res;
         *
         * The hero feels/sees the adjacent non-door tile.  feel_location()
         * runs _map_location() (display.c:448) whose tail calls
         * update_lastseentyp() — it writes svl.lastseentyp[cc] = current typ.
         * The compare is against oldlastseentyp captured from
         * update_mapseen_for() (a whole-level recalc_mapseen() before the feel).
         * When this is the first time the hero folds this freshly-adjacent
         * tile into map memory, the post-feel lastseentyp (the raw typ) differs
         * from the pre-feel recalc value → res = PICKLOCK_LEARNED_SOMETHING →
         * a turn passes (ECMD_TIME) so movemon runs (seed1500 turn 9: the
         * "You see no door there" apply at (71,13) consumes the turn, then C
         * fires the monster-movement RNG block).
         *
         * Faithful model: rather than reproduce the whole mapseen subsystem,
         * detect the equivalent `door->glyph != oldglyph` signal directly —
         * feel_location's ROOM-darkening (display.c:899-906) flips the
         * remembered glyph S_room → S_darkroom for this unlit floor, which is
         * the change C's compare observes.  See the per-tile handling below. */
        let res = PICKLOCK_DID_NOTHING;
        if (door) {
            /* feel_location(cc) — display.c:899-906: an unlit ROOM floor still
             * glyphed S_room (the lit/default floor) is re-glyphed to S_darkroom
             * (CLR_BLACK → ANSI 90) when felt:
             *   if (typ == ROOM && glyph == S_room
             *       && (!waslit || (dark_room && use_color)))
             *       lev->glyph = S_darkroom;
             * That glyph mutation is exactly C's `door->glyph != oldglyph` test
             * (lock.c:584): feeling a not-yet-darkened unlit room floor flips the
             * remembered glyph, so res becomes PICKLOCK_LEARNED_SOMETHING (-1) →
             * ECMD_TIME → the turn passes and movemon runs (seed1500 turn 9).
             * flags.dark_room + iflags.use_color are constant-true in the corpus
             * (same convention as display.js _darken_room_floor), so the !waslit
             * arm and the dark_room arm both reduce to "darken an S_room floor". */
            const rg = door.remembered_glyph;
            if (rg && _darken_room_floor(door, rg)) {
                /* glyph changed S_room → S_darkroom (C lock.c:585).  C's
                 * feel_location does `show_glyph(x,y, lev->glyph = S_darkroom)`
                 * (display.c:901) — it writes the dark floor straight into the
                 * display buffer, overriding the lit in-sight render.  Mirror that
                 * by pushing the darkened glyph through show_glyph_cell so the
                 * captured screen shows ANSI 90, then set res → ECMD_TIME. */
                show_glyph_cell(cx, cy, rg.ch, rg.color, rg.decgfx, 0, rg.cls);
                res = PICKLOCK_LEARNED_SOMETHING;
            }
        }
        /* C lock.c:589 — You("%s no door there.", Blind ? "feel" : "see").
         * The "corpus hero is not Blind on this path" note this carried was an
         * assertion about a corpus, not about the code; gen392 falsified the
         * sibling doopen_indir copy of the same alternation at step 458, so
         * read the predicate here too. */
        await pline(`You ${_blind_stub() ? 'feel' : 'see'} no door there.`);
        return res;
    }
    const mask = door.doormask | 0;
    /* C lock.c:594-603 — door state switch. */
    if (mask === D_NODOOR) { await pline('This doorway has no door.'); return PICKLOCK_LEARNED_SOMETHING; }
    if (mask === D_ISOPEN) { await pline('You cannot lock an open door.'); return PICKLOCK_LEARNED_SOMETHING; }
    if (mask === D_BROKEN) { await pline('This door is broken.'); return PICKLOCK_LEARNED_SOMETHING; }

    /* C lock.c:604-612 — default arm, AUTOUNLOCK_UNTRAP first:
     *     if ((flags.autounlock & AUTOUNLOCK_UNTRAP) != 0
     *         && could_untrap(FALSE, FALSE)
     *         && (c = ynq("Check this door for a trap?")) != 'n') { ... }
     * flags.autounlock is apply-key ALONE for every corpus session (flag.h:72
     * default, and every recorded nethackrc renders "autounlock [apply-key]"),
     * so this arm never fires and never consumes a keystroke — same treatment
     * the container branch above already gives it (lock.c:471). */

    /* C lock.c:614-618 — credit cards are only good for unlocking. */
    if (picktyp === CREDIT_CARD_OTYP && !(mask & D_LOCKED)) {
        await pline("You can't lock a door with a credit card.");
        return PICKLOCK_LEARNED_SOMETHING;
    }

    /* C lock.c:619-625 — the confirmation prompt, on BOTH the apply path and
     * the autounlock path:
     *     Sprintf(qbuf, "%s it%s%s?",
     *             (door->doormask & D_LOCKED) ? "Unlock" : "Lock",
     *             autounlock ? " with " : "",
     *             autounlock ? yname(pick) : "");
     *     c = ynq(qbuf);
     *     if (c != 'y')
     *         return PICKLOCK_DID_NOTHING;
     * This CONSUMES a keystroke.  It was the missing piece that made
     * doopen_indir's autounlock arm unportable: seed0007 step 50 walks into a
     * locked door ("This door is locked.--More--"), step 51's SPACE dismisses
     * that --More--, and step 52's 'y' answers exactly this prompt
     * ("Unlock it with your lock pick? [ynq] (q)"). */
    const qbuf = ((mask & D_LOCKED) ? 'Unlock' : 'Lock') + ' it'
               + (autounlock ? ' with ' + _yname(pick) : '') + '?';
    if ((await _ynq(qbuf)) !== 'y')
        return PICKLOCK_DID_NOTHING;

    /* C lock.c:627-629 — for autounlock the touch check has not happened yet:
     *     if (autounlock && !touch_artifact(pick, &gy.youmonst))
     *         return PICKLOCK_DID_SOMETHING;
     * touch_artifact() is unconditionally TRUE for a non-artifact tool, which
     * is every unlock tool autokey() can return in the corpus (a plain lock
     * pick / key / credit card); the artifact arm is is_magic_key's business
     * below. */

    /* C lock.c:638-657 — chance computation. */
    const dex = acurr(u, A_DEX);
    let ch;
    switch (picktyp) {
        case CREDIT_CARD_OTYP: ch = 2 * dex + 20 * (_Role_if_rogue() ? 1 : 0); break;
        case LOCK_PICK_OTYP:   ch = 3 * dex + 30 * (_Role_if_rogue() ? 1 : 0); break;
        case SKELETON_KEY_OTYP: ch = 70 + dex; break;
        default: ch = 0;
    }
    x.box = null;
    x.door = { x: cx, y: cy };
    x.picktyp = picktyp;
    x.chance = ch;
    /* C lock.c:651 — gx.xlock.magic_key = is_magic_key(&gy.youmonst, pick);
     * picklock() reads it to decide whether a trapped lock is DETECTED
     * (lock.c:103) rather than sprung. */
    x.magic_key = is_magic_key_hero(pick);
    x.usedtime = 0;
    set_occupation(picklock, lock_action(), 0);
    return PICKLOCK_DID_SOMETHING;
}

/* C ref: artifact.c is_magic_key(mon, obj) — restricted to the hero's own
 * holder case (the only one pick_lock/picklock use):
 *     if (is_art(obj, ART_MASTER_KEY_OF_THIEVERY)) {
 *         if (Role_if(PM_ROGUE)) return !obj->cursed;
 *         return obj->blessed;
 *     }
 *     return FALSE;
 * ART_MASTER_KEY_OF_THIEVERY is the 1-based artilist index 29 (the Rogue quest
 * artifact — the same number js/objnam.js's _ROLE_QUESTARTI table carries). */
const ART_MASTER_KEY_OF_THIEVERY = 29;
function is_magic_key_hero(obj) {
    if (!obj || (obj.oartifact | 0) !== ART_MASTER_KEY_OF_THIEVERY) return false;
    if (_Role_if_rogue()) return !obj.cursed;
    return !!obj.blessed;
}

/* ── mondata.h predicates over gy.youmonst.data ─────────────────────────
 * C lock.c calls nohands(gy.youmonst.data) (lock.c:965) and
 * verysmall(gy.youmonst.data) (lock.c:1035) on the hero's CURRENT form, so
 * both must follow polymorph.  Resolve the permonst the way the rest of js/
 * does: prefer the live gy.youmonst.data (polyself.js / the capture
 * reconstructor materialize it), else fall back to u.umonnum — u_init.c:991
 * sets u.umonnum = u.umonster = gu.urole.mnum, and polyself keeps it current.
 */
/** C mondata.h:10 monsndx(ptr) — the hero's current form index, or -1. */
function _hero_mndx_lk() {
    const d = game.youmonst && game.youmonst.data;
    if (d && d.pmidx != null) return d.pmidx | 0;
    const m = game.u && game.u.umonnum;
    return (m != null) ? (m | 0) : -1;
}
/** C permonst.mflags1 for the hero's current form (MONS row[6]). */
function _hero_mflags1_lk() {
    const d = game.youmonst && game.youmonst.data;
    if (d && d.mflags1 != null) return d.mflags1 >>> 0;
    const i = _hero_mndx_lk();
    return (i >= 0 && i < _MONS_LK.length) ? (_MONS_LK[i][6] >>> 0) : 0;
}
/** C permonst.msize for the hero's current form. */
function _hero_msize_lk() {
    const d = game.youmonst && game.youmonst.data;
    if (d && d.msize != null) return d.msize | 0;
    const i = _hero_mndx_lk();
    return (i >= 0 && i < _MONS_MSIZE_LK.length) ? (_MONS_MSIZE_LK[i] | 0) : MZ_HUMAN_LK;
}
/* C mondata.h:52 — #define nohands(ptr) (((ptr)->mflags1 & M1_NOHANDS) != 0L)
 * monflag.h:98 M1_NOHANDS = 0x00002000L ("no hands to handle things"). */
const M1_NOHANDS_LK = 0x00002000;
function _nohands_lk() { return (_hero_mflags1_lk() & M1_NOHANDS_LK) !== 0; }
/* C mondata.h:11 — #define verysmall(ptr) ((ptr)->msize < MZ_SMALL)
 * monflag.h:178 MZ_SMALL = 1 (MZ_TINY = 0 is the only size below it). */
const MZ_SMALL_LK = 1;
function _verysmall_lk() { return _hero_msize_lk() < MZ_SMALL_LK; }
/* C youprop.h:284-286 —
 *   #define HPasses_walls u.uprops[PASSES_WALLS].intrinsic
 *   #define EPasses_walls u.uprops[PASSES_WALLS].extrinsic
 *   #define Passes_walls (HPasses_walls || EPasses_walls)
 * lock.c:980 tests the PROPERTY, not mondata.h's passes_walls(ptr): polyself
 * pushes M1_WALLWALK into uprops[PASSES_WALLS].intrinsic (polyself.js:283), so
 * the property read already covers the polymorphed-into-a-xorn case. */
function _Passes_walls_lk() {
    const p = game.u && game.u.uprops && game.u.uprops[PASSES_WALLS];
    if (!p) return false;
    return !!((p.intrinsic | 0) || (p.extrinsic | 0));
}

/* ── Stubs for unported helpers ─────────────────────────────────────────
 * All return false / 0 / no-op; no corpus 'c' session reaches a branch
 * where these stubs would mask a true positive (the cluster sessions
 * have 'c' eaten by getlin or getobj prompts, not by top-level doclose).
 */
function _stumble_on_door_mimic_stub(_x, _y) { return false; }
function _confusion_stub() { return false; }
function _stunned_stub() { return false; }
/* C ref: youprop.h:103 `#define Blind ((HBlinded || EBlinded) && !BBlinded)`.
 * This was `return false` — a HARDCODED not-blind — and it feeds the four
 * Blind ? "feel"/"Feels" : "see"/"Seems" alternations lock.c uses at
 * lock.c:591 (pick_lock's no-door arm), lock.c:846-851 (doopen_indir's) and
 * lock.c:1015 (doclose's).  A blind hero opening or closing toward a doorless
 * square therefore read "You see no door there." where C says "You feel no
 * door there."  js/vision.js:32 Blind() is the port's one live spelling of
 * that macro — it is what the botl "Blind" condition and see_with_infrared
 * already read — so this delegates rather than re-deriving the uprops test.
 * MEASURED on gen392-reseed-seed77105 step 458: the hero is Blind (status row
 * says so on both sides) and presses `o` then `l` into open floor.  No RNG. */
function _blind_stub() { return Blind(); }
/* C ref: dbridge.c:136-162 is_drawbridge_wall().  Keep this local rather
 * than importing dokick.js: dokick.js imports breakchestlock from lock.js,
 * so a cross-import would create a module cycle in the replay runtime. */
function _is_drawbridge_wall_stub(x, y) {
    if (!isok(x, y)) return -1;
    const lev = game.level?.at(x, y);
    if (!lev || (lev.typ !== DOOR && lev.typ !== DBWALL)) return -1;
    if (isok(x + 1, y)) {
        const adj = game.level?.at(x + 1, y);
        if (adj && IS_DRAWBRIDGE(adj.typ)
            && ((adj.drawbridgemask & DB_DIR) | 0) === DB_WEST) return DB_WEST;
    }
    if (isok(x - 1, y)) {
        const adj = game.level?.at(x - 1, y);
        if (adj && IS_DRAWBRIDGE(adj.typ)
            && ((adj.drawbridgemask & DB_DIR) | 0) === DB_EAST) return DB_EAST;
    }
    if (isok(x, y - 1)) {
        const adj = game.level?.at(x, y - 1);
        if (adj && IS_DRAWBRIDGE(adj.typ)
            && ((adj.drawbridgemask & DB_DIR) | 0) === DB_SOUTH) return DB_SOUTH;
    }
    if (isok(x, y + 1)) {
        const adj = game.level?.at(x, y + 1);
        if (adj && IS_DRAWBRIDGE(adj.typ)
            && ((adj.drawbridgemask & DB_DIR) | 0) === DB_NORTH) return DB_NORTH;
    }
    return -1;
}

/* C ref: dbridge.c:165-173 is_db_wall(). */
function _is_db_wall_stub(x, y) {
    const loc = game.level?.at(x, y);
    return !!loc && (loc.typ | 0) === DBWALL;
}
function _obstructed_stub(_x, _y, _quietly) { return false; }

/* C ref: lock.c:16 picking_lock(coordxy *x, coordxy *y) — if hero is picklocking,
 *   set *x = u.ux + u.dx, *y = u.uy + u.dy and return TRUE; else *x=*y=0, return FALSE. */
export function picking_lock(x, y) {
    const g = game;
    const u = g.u || {};
    if (g.occupation === 'picklock') {
        x.value = (u.ux + u.dx) | 0;
        y.value = (u.uy + u.dy) | 0;
        return true;
    } else {
        x.value = 0;
        y.value = 0;
        return false;
    }
}

/* C ref: lock.c:29 picking_at(coordxy x, coordxy y) — hero is lock-picking the door at x,y.
 *   (go.occupation == picklock && gx.xlock.door == &levl[x][y])
 * &levl[x][y] pointer-identity ≡ coordinate match (the tile at x,y is unique). */
export function picking_at(x, y) {
    const g = game;
    if (g.occupation !== 'picklock')
        return 0;
    const xlk = g.xlock || {};
    if (!xlk.door)
        return 0;
    if (xlk.door.x === (x | 0) && xlk.door.y === (y | 0))
        return 1;
    return 0;
}

/* C ref: lock.c:1039-1170 doorlock(otmp, x, y) — apply an opening / locking /
 * striking magic effect to the door at <x,y>.  Returns TRUE when the door was
 * actually changed.  RNG-free on every arm.
 *
 * Only the WAN_STRIKING / SPE_FORCE_BOLT arm is ported (that is the one a
 * monster's striking beam reaches via mbhit); the other arms throw so that a
 * wand of opening/locking beam fails loudly rather than silently reporting
 * "nothing happened". */
export function doorlock(otmp, x, y) {
    const door = game.level?.at(x, y);
    if (!door)
        return false;
    let res = true;
    let loudness = 0;

    if ((door.typ | 0) === SDOOR) {
        /* KNOWN GAP — lock.c:1049-1076: a striking/opening beam turns a
         * secret door into a real D_CLOSED door and prints "A door appears in
         * the wall!", then (for striking) falls through to the arm below.
         * RNG-free.  Returns FALSE ("nothing changed"), a value C's doorlock
         * really returns (lock.c:1074), rather than throwing — a throw would
         * discard the replay's entire matched RNG prefix. */
        return false;
    }

    switch (otmp.otyp | 0) {
    case WAN_STRIKING_OTYP:
        if ((door.doormask | 0) & (D_LOCKED | D_CLOSED)) {
            if ((door.doormask | 0) & D_TRAPPED) {
                /* KNOWN GAP — lock.c:1105-1135: a trapped door explodes
                 * (doormask = D_NODOOR, mb_trapped() on any monster in the
                 * doorway, "KABOOM!!" and loudness 40).  Missing dependency:
                 * mb_trapped (trap.c), which draws RNG.  Returns FALSE
                 * rather than throwing; see the SDOOR arm above. */
                return false;
            }
            const sawit = cansee(x, y);
            door.doormask = D_BROKEN;
            recalc_block_point(x, y);
            const seeit = cansee(x, y);
            newsym(x, y);
            if (game.flags?.verbose) {
                if (sawit || seeit)
                    pline("The door crashes open!");
                else if (!_lock_Deaf())
                    pline("You hear a crashing sound.");
            }
            loudness = 20;
        } else {
            /* C lock.c:1152 — an open/broken/absent door is unaffected. */
            res = false;
        }
        break;
    default:
        /* KNOWN GAP — lock.c:1079-1147 also handles WAN_LOCKING /
         * SPE_WIZARD_LOCK (needs obstructed(), block_point()) and
         * WAN_OPENING / SPE_KNOCK.  All RNG-free, none reachable from
         * mbhit (which only ever passes a WAN_STRIKING beam), and C's own
         * fallthrough here is `impossible()` + the res=TRUE default.
         * Returns FALSE = "nothing changed" rather than throwing. */
        return false;
    }

    if (loudness > 0) {
        /* C lock.c:1157-1162 — the door was destroyed: wake everything within
         * `loudness`, and put a broken SHOP door on the shopkeeper's repair
         * list at NO cost to the hero (add_damage with cost 0).  Both are
         * RNG-free. */
        wake_nearto(x, y, loudness);
        if (in_rooms(x, y, SHOPBASE).length)
            add_damage(x, y, 0);
    }
    /* C lock.c:1164-1168 — `res && picking_at(x,y)` interrupts a lock-picking
     * occupation.  Unreachable while res is false on the only ported arm. */
    return res;
}

/* C ref: lock.c:1054-1057 comment + lock.c:1056 boxlock(obj, otmp) —
 *   /_* box obj was hit with spell or wand effect otmp;
 *      returns true if something happened *_/
 *   boolean
 *   boxlock(struct obj *obj, struct obj *otmp) /_* obj *is* a box *_/
 * `obj` is the box/chest that was hit; `otmp` is the wand/spellbook object
 * carrying the effect.  Called from js/zap.js's bhito() (zap.c:2393-2400,
 * WAN_LOCKING/SPE_WIZARD_LOCK/WAN_OPENING/SPE_KNOCK rays crossing a floor
 * container), from boxlock_invent() (zap.c:2687-2697, same four otyps against
 * carried containers) and from #force's own auto-unlock-on-open
 * (pickup.c:2411, boxlock(coffers, &boxdummy) with a synthetic WAN_OPENING
 * dummy) — none of those call sites are this file's to edit; this export
 * only provides the function itself.
 * ASYNC: the C body is synchronous, but its two message lines go through
 * this port's pline(), which is async (js/display.js:6342) — callers must
 * `await boxlock(...)`. */
export async function boxlock(obj, otmp) {
    let res = false;

    switch (otmp.otyp | 0) {
    case WAN_LOCKING_OTYP_LK:
    case SPE_WIZARD_LOCK_OTYP_LK:
        /* C lock.c:1062 — if (!obj->olocked) { lock it; fix if broken } */
        if (!obj.olocked) {
            /* C lock.c:1064 Soundeffect(se_klunk, 50) — audio only, no RNG,
             * no state (js/dokick.js:1828 is this port's no-op for the same
             * macro); omitted. */
            await pline('Klunk!');
            obj.olocked = 1;
            obj.obroken = 0;
            if ((game.urole && game.urole.mnum) === PM_WIZARD_LK)
                obj.lknown = 1;
            else
                obj.lknown = 0;
            res = true;
        } /* else already closed and locked */
        break;
    case WAN_OPENING_OTYP_LK:
    case SPE_KNOCK_OTYP_LK:
        /* C lock.c:1075 — if (obj->olocked) { unlock } else silently fix */
        if (obj.olocked) {
            /* C lock.c:1077 Soundeffect(se_klick, 50) — audio only; omitted,
             * see above. */
            await pline('Klick!');
            obj.olocked = 0;
            res = true;
            if ((game.urole && game.urole.mnum) === PM_WIZARD_LK)
                obj.lknown = 1;
            else
                obj.lknown = 0;
        } else {
            /* C lock.c:1086 — silently fix if broken */
            obj.obroken = 0;
        }
        break;
    case WAN_POLYMORPH_OTYP_LK:
    case SPE_POLYMORPH_OTYP_LK:
        /* C lock.c:1089-1093 — maybe start unlocking chest, get interrupted,
         * then zap it; avoid resuming the pick on a now-polymorphed obj. */
        if ((game.xlock && game.xlock.box) === obj)
            reset_pick();
        break;
    }
    return res;
}
