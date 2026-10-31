// @ts-nocheck
// lock.js — Door and lock operations.
// C ref: nethack-c/src/lock.c — doopen(), doopen_indir(), doclose().
// Ported scope: simple closed-door open path (lock.c:781-935) and doclose
// (lock.c:957-1052). The drawbridge predicates used by the shared branches
// are implemented locally below to keep lock.js independent of dokick.js.
import { game } from './gstate.js';
import { stop_occupation as stop_lock_occupation } from './allmain.js';
import { PROT_FROM_SHAPE_CHANGERS } from './const.js';
import { costly_alteration } from './cmd.js';
import { costly_spot, shop_keeper, stolen_value, obfree, currency } from './shk.js';
import { obj_extract_self, start_corpse_timeout } from './mklev.js';
import { delobj, acurrstr as effective_strength } from './dokick.js';
import { stackobj } from './sp_lev.js';
import { COST_BRKLCK } from './const.js';
import { bhp_is_lava as is_lava, verbalize } from './cmd.js';
import { is_pool } from './look.js';
import { hliquid } from './mhitm.js';
import { touch_artifact } from './mklev.js';
import { could_untrap, untrap_at, cmdq_add_ec, cmdq_add_dir, ysimple_name, set_msg_xy } from './cmd.js';
import { yname } from './do_wear.js';
import { t_at } from './trap.js';
import { can_reach_floor } from './hold_another_object.js';
import { cant_reach_floor } from './engrave.js';
const WAND_CLASS = 11; /* objclass.h WAND_CLASS */
import { Is_rogue_level, M_AP_TYPE, M_AP_FURNITURE, M_AP_OBJECT, AUTOUNLOCK_KICK } from './const.js';
import { canspotmon, map_invisible, update_mapseen_for } from './display.js';
import { s_suffix } from './hacklib.js';
import { Some_Monnam } from './mhitm.js';
import { set_occupation, confdir, movecmd, cmdq_pop, cmdq_clear, cmdq_add_key, redraw_cmd, dxdy_moveok, xytodir, readchar,
    show_direction_keys, dowhatdoes_core, useup, getpos } from './cmd.js';
import { visctrl } from './cmd_binds.js';
import { CQ_REPEAT, CQ_CANNED, CMDQ_DIR, CMDQ_KEY, NHKF_GETDIR_HELP, NHKF_GETDIR_SELF, NHKF_GETDIR_SELF2,
         NHKF_GETDIR_MOUSE, NHKF_GETPOS_PICK, NHKF_GETPOS_PICK_Q, NHKF_GETPOS_PICK_O, NHKF_GETPOS_PICK_V,
         CLICK_1, CLICK_2 } from './const.js';
import { impossible } from './pline.js';
import { pline, force_more, newsym, feel_newsym, flush_screen, docrt_flags, _darken_room_floor, show_glyph_cell, canseemon, You_hear, Unaware } from './display.js';
import { mb_trapped } from './dig.js';
import { capture_pre_movemon_botl, _topl_joins_snapshot, commit_force_messages } from './display.js';
import { topl_park_cursor, putmsghistory, feel_location, flush_pending_messages, _topl_stash_result } from './display.js';
import { block_point, recalc_block_point, vision_recalc, unblock_point } from './vision.js';
import { nhgetch } from './input.js';
import { yn_function } from './end.js';
import { display_text_window } from './com_pager.js';
import { pushRngLogEntry } from './rng.js';
import { isaac64_next_uint64 } from './isaac64.js';
import { acurr, exercise } from './attrib.js';
import { rn2, rnl, rnd } from './rng.js';
import { losehp } from './dokick.js';
import { level_difficulty, wake_nearby } from './mklev.js';
import { isok } from './hacklib.js';
import { wake_nearto } from './mklev.js';
import { in_rooms, add_damage } from './shk.js';
import { cansee, Blind } from './vision.js';
import { closed_door, is_door_mappear } from './look.js';
import { maybe_absorb_item } from './steal.js';
import { stumble_onto_mimic } from './uhitm.js';
import { TT_PIT } from './const.js';
import { DEAF, HALLUC, HALLUC_RES, STUNNED, CONFUSION, DBWALL, DB_DIR, DB_WEST, DB_EAST, DB_SOUTH, DB_NORTH,
         IS_DRAWBRIDGE, HALF_PHDAM, KILLED_BY_AN, NO_PART, SHOP_DOOR_COST } from './const.js';
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
import { simple_typename, xname_flags, xname, singular, cxname, doname, ansimpleoname, The, An, is_quest_artifact } from './objnam.js';
import { safe_qbuf } from './shk.js';
import { weapon_type, WEAPON_WLDAM, m_at, mon_nam } from './uhitm.js';
import { place_object } from './mklev.js';
import { potionbreathe, make_stunned } from './potion.js';
import { chest_trap } from './trap.js';
import { FINGER } from './const.js';
import { obj_resists } from './dogmove.js';
import { MKOBJ_OC_MATERIAL, MKOBJ_OC_SKILL } from './mkobj_erosion_meta.js';
import { SHOPBASE, SDOOR, DOOR, D_CLOSED, D_ISOPEN, D_TRAPPED, D_NODOOR, D_BROKEN, D_LOCKED, A_STR, A_WIS, A_DEX, A_CON, ECMD_TIME, ECMD_OK, ECMD_CANCEL,
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

/* C ref: trap.c:6694 b_trapped(item, bodypart) — a booby-trapped container or
 * door explodes in the hero's face. */
export async function b_trapped(item, bodypart) {
    const lvl = level_difficulty() | 0;
    const dmg = rnd(5 + (lvl < 5 ? lvl : 2 + Math.trunc(lvl / 2)));
    const hp = game.u?.uprops?.[HALF_PHDAM];
    const half = !!hp && !!((hp.intrinsic | 0) || (hp.extrinsic | 0));
    await pline(`KABOOM!!  ${The(item)} was booby-trapped!`);
    wake_nearby(false);
    await losehp(half ? Math.trunc((dmg + 1) / 2) : dmg, 'explosion', KILLED_BY_AN);
    exercise(A_STR, false);
    if (bodypart !== NO_PART)
        exercise(A_CON, false);
    const st = game.u?.uprops?.[STUNNED];
    await make_stunned(((st?.intrinsic | 0) & 0xffffff) + dmg, true);
}

function _rawRnd(x) {
    const val = isaac64_next_uint64(game.coreCtx);
    return Number(val % BigInt(x));
}


/* C ref: attrib.c:1251 acurrstr() — effective Str for door-opening check.
 * For Str <= 18 (normal human): result = max(str, 3) = str.
 * For higher Str values: follows 18/xx encoding; mirrors C exactly. */
function acurrstr() {
    return effective_strength(game.u);
}

export async function doopen_indir(x, y) {
    const g = game;
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

    /* C lock.c:793-795 — a container underfoot can be opened from a pit. */
    let dirprompt = null;
    if (g.u.utrap && g.u.utraptype === TT_PIT) {
        const { container_at } = await import('./pickup.js');
        if (container_at(g.u.ux, g.u.uy, false))
            dirprompt = 'Open where? [.>]';
    }

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

    /* C lock.c:818-821 — can't reach over the edge of the pit */
    if (g.u.utrap && g.u.utraptype === TT_PIT) {
        await pline("You can't reach over the edge of the pit.");
        return ECMD_OK;
    }

    if (await _stumble_on_door_mimic_stub(cx, cy))
        return ECMD_TIME;
    if (_confusion_stub() || _stunned_stub())
        res = ECMD_TIME;

    /* C lock.c:828 — portcullis = (is_drawbridge_wall(cc.x, cc.y) >= 0). */
    const loc = g.level?.at(cx, cy);
    if (!loc) return ECMD_OK;
    const portcullis = _is_drawbridge_wall_stub(cx, cy) >= 0;

    /* C lock.c:830-839 — "using a key skips [the Blind test] so we do too":
     *     int oldglyph = door->glyph;
     *     schar oldlastseentyp = update_mapseen_for(cc.x, cc.y);
     *     newsym(cc.x, cc.y);
     *     if (door->glyph != oldglyph || svl.lastseentyp[cc.x][cc.y] != oldlastseentyp)
     *         res = ECMD_TIME; // learned something
     * Without this, `o` at a wall whose remembered glyph newsym rewrites
     * (wall_angle seen-vector change) spent no turn where C does. */
    {
        const _sig = (l) => { const r = l.remembered_glyph;
            return r ? `${r.ch}|${r.color}|${r.cls}|${r.decgfx}` : ''; };
        const _og = _sig(loc), _ot = update_mapseen_for(cx, cy);
        await newsym(cx, cy);
        if (_sig(loc) !== _og || (loc.lastseentyp | 0) !== _ot)
            res = ECMD_TIME;
    }

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
        set_msg_xy(cx, cy);   /* C lock.c:874 */
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
         * Kicking is offered only when no apply-key action is available. */
        /* the nethackrc handler stores flags.autounlock as the option's text
         * ("apply-key+kick+force"); C holds the unlocktypes[] bitmask. */
        const auRaw = g.flags?.autounlock ?? AUTOUNLOCK_APPLY_KEY;
        const au = typeof auRaw === 'string'
            ? auRaw.split('+').reduce((m, w) => m | ({ untrap: 1, 'apply-key': AUTOUNLOCK_APPLY_KEY, kick: 4, force: 8 }[w.trim()] | 0), 0)
            : auRaw;
        if (locked && au) {
            if (g.u) g.u.dz = 0;   /* C lock.c:877 */
            const unlocktool = (au & AUTOUNLOCK_APPLY_KEY) ? autokey(true) : null;
            if (unlocktool) {
                res = (await pick_lock(unlocktool, cx, cy, null)) ? ECMD_TIME : ECMD_OK;
            } else if ((au & AUTOUNLOCK_KICK) && !g.u.usteed) {
                const ans = await yn_function('Kick it?', 'ynq', 'q', true);
                if (ans === 'y') {
                    cmdq_add_ec(CQ_CANNED, 'dokick');
                    cmdq_add_dir(CQ_CANNED, Math.sign(cx - g.u.ux), Math.sign(cy - g.u.uy), 0);
                    res = ECMD_OK;
                } else if (ans === 'q' && !g._pending_message && !g._resultMessage) {
                    /* C topl.c:536-548 leaves the answered prompt painted when
                     * nothing else is printed afterwards. */
                    g._resultMessage = g._ynStaleTopline = 'Kick it? [ynq] (q)';
                }
            }
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
        /* C lock.c:905-906 — set_msg_xy(cc.x, cc.y); pline_The("door opens.") */
        set_msg_xy(cx, cy);
        await pline("The door opens.");
        /* C lock.c:908-913 — D_TRAPPED: b_trapped then D_NODOOR; else D_ISOPEN */
        if (loc.doormask & D_TRAPPED) {
            await b_trapped('door', FINGER);
            loc.doormask = D_NODOOR;
            if (in_rooms(cx, cy, SHOPBASE).length)
                add_damage(cx, cy, SHOP_DOOR_COST);
        } else {
            loc.doormask = D_ISOPEN;
        }
        /* C lock.c:914 — feel_newsym(cc.x, cc.y): update display for hero */
        feel_newsym(cx, cy);
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
        set_msg_xy(cx, cy);   /* C lock.c:918 */
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
        confdir(false);
        return 1;
    }
    if (dircode === (g.Cmd?.spkeys?.[NHKF_GETDIR_MOUSE] ?? 95 /* '_' */)) {
        const qbuf = `desired location, then type '${
            visctrl(g.Cmd?.spkeys?.[NHKF_GETPOS_PICK_Q] ?? 44 /* ',' */)}' for left click, '${
            visctrl(g.Cmd?.spkeys?.[NHKF_GETPOS_PICK] ?? 46 /* '.' */)}' for right`;
        /* cc.x = u.ux, cc.y = u.uy — starting cursor location for getpos(). */
        const cc = { x: u.ux | 0, y: u.uy | 0 };
        let pos = await getpos(cc, true, qbuf);
        let mod;
        if (pos < 0) {
            /* ESC or other rejection */
            u.dx = u.dy = u.dz = 0;
            mod = 0; /* neither CLICK_1 nor CLICK_2 */
        } else {
            /* caller expects simulated click to be relative to hero's spot */
            u.dx = (cc.x | 0) - (u.ux | 0);
            u.dy = (cc.y | 0) - (u.uy | 0);
            /* non-zero getdir_click actually means ok to click farther than
             * one spot away from hero; adjacent click is always allowed */
            if (!g.iflags?.getdir_click) {
                u.dx = u.dx < 0 ? -1 : (u.dx > 0 ? 1 : 0);
                u.dy = u.dy < 0 ? -1 : (u.dy > 0 ? 1 : 0);
            }
            u.dz = 0;
            switch (pos + NHKF_GETPOS_PICK) {
            case NHKF_GETPOS_PICK_Q: /* 1: quick:   ',' */
            case NHKF_GETPOS_PICK_O: /* 2: once:    ';' */
                mod = CLICK_1;
                break;
            case NHKF_GETPOS_PICK:   /* 0: normal:  '.' */
            case NHKF_GETPOS_PICK_V: /* 3: verbose: ':' */
                mod = CLICK_2;
                break;
            default:
                /* C: "something which should never happen" */
                await impossible(`getpos successful but not one of [.,;:] (${pos})`);
                mod = 0; /* neither CLICK_1 nor CLICK_2 */
                pos = -1; /* return failure */
                break;
            }
        }
        if (g.iflags?.getdir_click)
            g.iflags.getdir_click = mod;
        return pos >= 0;
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
export async function getdir_bad_dir_feedback() {
    let did_help = false;
    if (cmdassist_on()) {
        await help_dir('\0', /* spkey = */ ESC_KEY, 'Invalid direction key!');
        did_help = true;
    }
    if (!did_help)
        await pline('What a strange direction!');
}
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

export async function doclose() {
    const g = game;
    const u = g.u = g.u || {};
    /* C lock.c:965 — if (nohands(gy.youmonst.data)) */
    if (_nohands_lk()) {
        await pline("You can't close anything -- you have no hands!");
        g.context = g.context || {};
        g.context.move = 0; /* ECMD_OK */
        return ECMD_OK;
    }
    /* C lock.c:970 — u.utrap && u.utraptype == TT_PIT */
    if (u.utrap && u.utraptype === TT_PIT) {
        await pline("You can't reach over the edge of the pit.");
        g.context = g.context || {};
        g.context.move = 0; /* ECMD_OK */
        return ECMD_OK;
    }
    /* C lock.c:975 — getdir(NULL); 0 → ECMD_CANCEL.  No turn consumed. */
    const got = await getdir(null);
    if (!got) {
        g.context = g.context || {};
        g.context.move = 0; /* ECMD_CANCEL */
        return ECMD_CANCEL;
    }
    const x = ((u.ux | 0) + (u.dx | 0)) | 0;
    const y = ((u.uy | 0) + (u.dy | 0)) | 0;
    /* C lock.c:980 — u_at(x,y) && !Passes_walls: hero is in the doorway */
    const passesWalls = _Passes_walls_lk();
    if (x === (u.ux | 0) && y === (u.uy | 0) && !passesWalls) {
        await pline('You are in the way!');
        g.context = g.context || {};
        g.context.move = 1; /* ECMD_TIME */
        return ECMD_TIME;
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
        if (await _stumble_on_door_mimic_stub(x, y)) {
            g.context = g.context || {};
            g.context.move = 1; /* ECMD_TIME */
            return ECMD_TIME;
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
            /* C lock.c:998-1004 — feel_location; a changed glyph or
             * lastseentyp means "learned something" → ECMD_TIME. */
            const _fl = door;
            const _rg = _fl ? _fl.remembered_glyph : null;
            /* cls is a JS-side representation tag (absent on glyphs stored before
             * the first feel_location); C compares only the glyph int. */
            const _og = _rg ? `${_rg.ch}|${_rg.color}|${_rg.decgfx}` : '';
            const _ot = update_mapseen_for(x, y);
            feel_location(x, y);
            const _ng0 = _fl ? _fl.remembered_glyph : null;
            const _ng = _ng0 ? `${_ng0.ch}|${_ng0.color}|${_ng0.decgfx}` : '';
            if (_ng !== _og || (_fl ? (_fl.lastseentyp | 0) : 0) !== _ot)
                res = ECMD_TIME;
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
        return res;
    }
    /* C lock.c:1021-1031 — door doormask state machine */
    const mask = door.doormask | 0;
    if (mask === D_NODOOR) {
        await pline('This doorway has no door.');
        g.context = g.context || {};
        g.context.move = (res === ECMD_TIME) ? 1 : 0;
        return res;
    } else if (await _obstructed_stub(x, y, false)) {
        g.context = g.context || {};
        g.context.move = (res === ECMD_TIME) ? 1 : 0;
        return res;
    } else if (mask === D_BROKEN) {
        await pline('This door is broken.');
        g.context = g.context || {};
        g.context.move = (res === ECMD_TIME) ? 1 : 0;
        return res;
    } else if (mask & (D_CLOSED | D_LOCKED)) {
        await pline('This door is already closed.');
        g.context = g.context || {};
        g.context.move = (res === ECMD_TIME) ? 1 : 0;
        return res;
    }
    /* C lock.c:1034 — D_ISOPEN: attempt to close. */
    if (mask === D_ISOPEN) {
        /* C lock.c:1035 — verysmall(youmonst.data) && !u.usteed: too small */
        if (_verysmall_lk() && !u.usteed) {
            await pline("You're too small to push the door closed.");
            g.context = g.context || {};
            g.context.move = (res === ECMD_TIME) ? 1 : 0;
            return res;
        }
        /* C lock.c:1039 — usteed || rn2(25) < (ACURRSTR + ACURR(A_DEX) + ACURR(A_CON))/3 */
        const threshold = Math.trunc((_acurrstr() + acurr(u, A_DEX) + acurr(u, A_CON)) / 3);
        if (u.usteed || rn2(25) < threshold) {
            await pline('The door closes.');
            door.doormask = D_CLOSED;
            feel_newsym(x, y); /* feel_newsym → newsym for sighted */
            block_point(x, y); /* C lock.c:1044 — close the line of sight. */
        } else {
            exercise(A_STR, true);
            await pline('The door resists!');
        }
    }
    g.context = g.context || {};
    g.context.move = 1; /* C lock.c:1051 — return ECMD_TIME */
    return ECMD_TIME;
}

/* C ref: attrib.c:1251 acurrstr() — STR encoding map. Duplicated from
 * doopen_indir; identical behavior. */
function _acurrstr() {
    return effective_strength(game.u);
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

function _toolname(pick) {
    switch (pick ? (pick.otyp | 0) : 0) {
        case CREDIT_CARD_OTYP: return 'credit card';
        case SKELETON_KEY_OTYP: return 'key';
        case LOCK_PICK_OTYP: return 'lock pick';
        default: return simple_typename(pick ? (pick.otyp | 0) : 0);
    }
}
function _yname(pick) { return yname(pick); }

/* C ref: query.c ynq(query) := yn_function(query, ynqchars, 'q', TRUE).
 * tty_yn_function writes "<query> [ynq] (q)" to the topline, parks the cursor
 * one column past the prompt, then reads one key (lowercased).  Mirrors the
 * y_n helper in potion.js but with the [ynq] response set and 'q' default. */
async function _ynq(query) {
    const g = game;
    const prompt = query + ' [ynq] (q)';
    // C topl.c:389-392: the prior command's topline also precedes queued queries.
    await flush_pending_messages();
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
        /* C topl.c:537-539 files prompt + key2txt(q) in the history, not the bare
         * prompt nhgetch() would commit. */
        const _sh = g._topl_suppress_history;
        g._topl_suppress_history = true;
        let key;
        try { key = await nhgetch(); } finally { g._topl_suppress_history = _sh; }
        const ch = (typeof key === 'number') ? String.fromCharCode(key).toLowerCase() : '';
        const _filed = (a) => putmsghistory(prompt + ' ' + a);
        /* C ynq: only y/n/q are accepted; ESC/space/CR/LF → default 'q'. */
        if (key === 27 || key === 32 || key === 13 || key === 10) {
            g._pending_message = '';
            g._topl_sticky = prompt;
            _filed('q');
            return 'q';
        }
        if (ch === 'y' || ch === 'n' || ch === 'q') {
            g._pending_message = '';
            if (ch !== 'y') g._topl_sticky = prompt;
            _filed(ch);
            return ch;
        }
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
    return stop_lock_occupation();
}

export async function picklock() {
    const g = game;
    const u = g.u || {};
    const x = g.xlock || {};
    if (x.box) {
        if ((x.box.where | 0) !== 1
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
    if ((x.usedtime++ | 0) >= 50 || _nohands_lk()) {
        await pline(`You give up your attempt at ${lock_action()}.`);
        exercise(A_DEX, true);
        x.usedtime = 0; return 0;
    }
    /* C lock.c:99 — rn2(100) >= chance → still busy. */
    if (rn2(100) >= (x.chance | 0)) {
        return 1; /* still busy */
    }
    /* C lock.c:103-136 — the Master Key of Thievery finds traps and may disarm. */
    if (x.magic_key
        && (!x.door ? !!x.box.otrapped
                    : (((g.level?.at?.(x.door.x, x.door.y)?.doormask) | 0) & D_TRAPPED) !== 0)) {
        x.chance += 20; /* less effort needed next time */
        const door = x.door ? g.level?.at?.(x.door.x, x.door.y) : null;
        if (!x.door) {
            if (!x.box.tknown)
                await pline('You find a trap!');
            x.box.tknown = 1;
        }
        if ((await yn_function('Do you want to try to disarm it?', 'yn', 'n', true)) === 'y') {
            let what, alreadyunlocked;
            if (door) {
                door.doormask &= ~D_TRAPPED;
                what = 'door';
                alreadyunlocked = !(door.doormask & D_LOCKED);
            } else {
                x.box.otrapped = 0;
                x.box.tknown = 0;
                what = (x.box.otyp === CHEST_OTYP) ? 'chest' : 'box';
                alreadyunlocked = !x.box.olocked;
            }
            await pline(`You succeed in disarming the trap.  The ${what} is still ${alreadyunlocked ? 'un' : ''}locked.`);
            exercise(A_WIS, true);
        } else {
            await pline(`You stop ${lock_action()}.`);
            exercise(A_WIS, false);
        }
        x.usedtime = 0; return 0;
    }
    /* C lock.c:138 — success path. */
    await pline(`You succeed in ${lock_action()}.`);
    if (x.door) {
        const door = g.level?.at?.(x.door.x, x.door.y) ?? null;
        if (door) {
            if (door.doormask & D_TRAPPED) {
                /* C lock.c:141-147 */
                await b_trapped('door', FINGER);
                door.doormask = D_NODOOR;
                unblock_point((u.ux | 0) + (u.dx | 0), (u.uy | 0) + (u.dy | 0));
                if (in_rooms((u.ux | 0) + (u.dx | 0), (u.uy | 0) + (u.dy | 0), SHOPBASE).length)
                    add_damage((u.ux | 0) + (u.dx | 0), (u.uy | 0) + (u.dy | 0), SHOP_DOOR_COST);
                await newsym((u.ux | 0) + (u.dx | 0), (u.uy | 0) + (u.dy | 0));
            } else if (door.doormask & D_LOCKED) door.doormask = D_CLOSED;
            else door.doormask = D_LOCKED;
        }
    } else if (x.box) {
        /* C lock.c:151-155 — box lock toggles; lknown set; trapped → chest_trap.
         * (lock.c:153-155) */
        x.box.olocked = !x.box.olocked;
        x.box.lknown = 1;
        if (x.box.otrapped)
            await chest_trap(x.box, FINGER, false);
    }
    exercise(A_DEX, true);
    x.usedtime = 0; return 0;
}


/* C ref: lock.c:649 u_have_forceable_weapon(void) — uwep is a forceable melee
 * weapon (not a launcher/projectile/flail/lance-beyond, or a rock).  Uses
 * weapon_type(uwep) = abs(objects[uwep->otyp].oc_skill). */
/* C obj.h:249 is_weptool(o) — TOOL_CLASS && oc_skill != P_NONE. */
function _is_weptool_lk(o) {
    return !!o && (o.oclass | 0) === TOOL_CLASS_OC && (MKOBJ_OC_SKILL[o.otyp | 0] | 0) !== 0;
}
export function u_have_forceable_weapon() {
    const uwep = game.u?.uwep ?? null;
    if (!uwep) return false;
    const oclass = uwep.oclass | 0;
    if (oclass === WEAPON_CLASS_OC || _is_weptool_lk(uwep)) {
        /* C uses the raw (signed) objects[].oc_skill, not weapon_type's abs() */
        const skill = MKOBJ_OC_SKILL[uwep.otyp | 0] | 0;
        if (skill < P_DAGGER_SK || skill === P_FLAIL_SK || skill > P_LANCE_SK)
            return false;
        return true;
    }
    return oclass === ROCK_CLASS_OC;
}

function _wepname(uwep) {
    if (!uwep) return 'your ' + simple_typename(0);
    let owned = false;
    for (let o = game.invent; o; o = o.nobj) {
        if (o === uwep) { owned = true; break; }
    }
    return (owned ? 'your ' : 'the ') + cxname(uwep);
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
    if ((x.usedtime++ | 0) >= 50 || !u.uwep || _nohands_lk()) {
        await pline('You give up your attempt to force the lock.');
        if ((x.usedtime | 0) >= 50)
            exercise(x.picktyp ? A_DEX : A_STR, true);
        x.usedtime = 0; return 0;
    }
    if (x.picktyp) {
        /* C lock.c:228-240; obj.h:126 greatest_erosion(). */
        const erosion = Math.max(u.uwep.oeroded | 0, u.uwep.oeroded2 | 0);
        if (rn2(1000 - (u.uwep.spe | 0)) > (992 - erosion * 10)
            && !u.uwep.cursed && !obj_resists(u.uwep, 0, 99)) {
            await pline(`${(u.uwep.quan | 0) > 1 ? 'One of y' : 'Y'}our ${xname_flags(u.uwep, CXN_NORMAL)} broke!`);
            await useup(u.uwep);
            await pline('You give up your attempt to force the lock.');
            exercise(A_DEX, true);
            x.usedtime = 0; return 0;
        }
    } else {
        wake_nearby(false);
    }
    /* C lock.c:244 — rn2(100) >= chance → still busy. */
    if (rn2(100) >= (x.chance | 0))
        return 1;
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
function _forceEmit(msg, botl = capture_pre_movemon_botl()) {
    const g = game;
    if (g._forceMsgs) {
        g._forceMsgs.push(msg);
        (g._forceMsgBotls ||= [])[g._forceMsgs.length - 1] = botl;
    } else g._pending_message = msg;
}

export async function breakchestlock(box, destroyit) {
    const g = game;
    const u = g.u || {};
    if (!destroyit) {
        /* C lock.c:164 — bill for the box (shop), then break the lock in place. */
        const hide_contents = box.cobj;
        box.cobj = null;
        // Queue billing feedback after the staged force-success message, like potion feedback below.
        const before = g._pending_message || '', result = g._resultMessage;
        const joins = _topl_joins_snapshot(before);
        await costly_alteration(box, COST_BRKLCK);
        const prefix = [result, before].filter(Boolean).join('  ');
        if (g._forceMsgs && (g._pending_message || '').startsWith(prefix) && g._pending_message.length > prefix.length) {
            const after = g._pending_message; g._pending_message = before; g._resultMessage = result;
            if (joins) { g._topl_joins = joins; g._topl_joins_src = before; }
            _forceEmit(after.slice(prefix.length).trim());
        }
        box.cobj = hide_contents;
        box.olocked = 0;
        box.obroken = 1;
        box.lknown = 1;
        return;
    }
    /* C lock.c:173 — #force destroyed this box. */
    const shkp = u.ushops?.length && costly_spot(u.ux, u.uy) ? shop_keeper(u.ushops[0]) : null;
    const costly = !!shkp, peaceful_shk = costly && !!shkp.mpeaceful;
    let loss = 0;
    _forceEmit(`In fact, you've totally destroyed ${_the(box_xname(box))}.`);
    /* C lock.c:184 — put the contents on the ground at the hero's feet. */
    let otmp;
    while ((otmp = box.cobj) != null) {
        obj_extract_self(otmp);
        /* C lock.c:186 — if (!rn2(3) || POTION) chest_shatter_msg(otmp). */
        if (!rn2(3) || (otmp.oclass | 0) === POTION_CLASS_OC) {
            await chest_shatter_msg(otmp);
            if (costly) loss += await stolen_value(otmp, u.ux, u.uy, peaceful_shk, true);
            /* C lock.c:191 — quan==1 → obfree (gone); else useup (decrement). */
            if ((otmp.quan | 0) === 1) {
                await obfree(otmp, null);
                continue; /* obfree: object destroyed, not placed */
            }
            await useup(otmp);
        }
        if (box.otyp === ICE_BOX_OTYP && otmp.otyp === 265 /* CORPSE */) {
            otmp.age = g.moves - otmp.age;
            start_corpse_timeout(otmp);
        }
        place_object(otmp, u.ux | 0, u.uy | 0);
        await stackobj(otmp);
    }
    if (costly) loss += await stolen_value(box, u.ux, u.uy, peaceful_shk, true);
    if (loss) _forceEmit(`You owe ${loss} ${currency(loss)} for objects destroyed.`);
    await delobj(box);
}

/* C ref: mkobj.c obj_extract_self for a contained object (box->cobj chain). */
function _extract_from_box(box, obj) {
    if (box.cobj === obj) box.cobj = obj.nobj ?? null;
    else { let p = box.cobj; while (p && p.nobj !== obj) p = p.nobj; if (p) p.nobj = obj.nobj ?? null; }
    obj.nobj = null;
    obj.ocontainer = null;
    obj.where = 0 /* OBJ_FREE */;
}

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
        /* C lock.c:1284 — see/hear a bottle shatter (bottlename rn2(7)). */
        _forceEmit(`You ${Blind() ? 'hear' : 'see'} ${_an(bottlename())} shatter!`);
        // C lock.c:1285: vapors affect heroes who breathe or have eyes.
        const form = _hero_mflags1_lk();
        if ((form & 0x00000400 /* M1_BREATHLESS */) && (form & 0x00001000 /* M1_NOEYES */)) return;
        /* C lock.c:1286 — potionbreathe(otmp) (hero not breathless/has eyes). */
        commit_force_messages();
        game._forceBotl = capture_pre_movemon_botl();
        await potionbreathe(otmp);
        return;
    }
    const uprops = (game.u && game.u.uprops) ? game.u.uprops : null;
    const bl = uprops ? uprops[BLINDED] : null;
    const save_HBlinded = bl ? bl.intrinsic : 0;
    const save_BBlinded = bl ? bl.blocked : 0;
    if (bl) { bl.intrinsic = 1; bl.blocked = 0; }
    /* C objnam.c:2091 singular() also uses cxname() for corpses. */
    const thing = await singular(otmp, xname);
    if (bl) { bl.intrinsic = save_HBlinded; bl.blocked = save_BBlinded; }
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
    _forceEmit(`${An(thing)} ${disposition}!`);
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
    /* youprop.h:116-120 — Hallucination is (HHallucination && !Halluc_resistance):
     * intrinsic-only, with HALLUC_RES intrinsic or extrinsic. */
    const hr = game.u?.uprops?.[HALLUC_RES];
    const hallu = !!(game.u?.uprops?.[HALLUC]?.intrinsic | 0)
        && !((hr?.intrinsic | 0) || (hr?.extrinsic | 0));
    const names = hallu ? _hbottlenames : _bottlenames;
    return names[rn2(names.length)];
}

/* C ref: lock.c:677 doforce(void) — the #force extended command. */
export async function doforce() {
    const g = game;
    const u = g.u || {};
    /* C lock.c:687-690 — uswallow guard. */
    if (u.uswallow) {
        await pline("You can't force anything from inside here.");
        return ECMD_OK;
    }
    /* C lock.c:692 — must wield a forceable weapon. */
    if (!u_have_forceable_weapon()) {
        const uwep = u.uwep;
        const usePlural = uwep && (uwep.quan | 0) > 1;
        const phrase = !uwep ? 'when not wielding a'
            : ((uwep.oclass | 0) !== WEAPON_CLASS_OC && !_is_weptool_lk(uwep)) ? (usePlural ? 'without proper' : 'without a proper')
            : (usePlural ? 'with those' : 'with that');
        await pline(`You can't force anything ${phrase} weapon${usePlural ? 's' : ''}.`);
        return ECMD_OK;
    }
    /* C lock.c:703-706 */
    if (!can_reach_floor(true)) {
        await cant_reach_floor(u.ux | 0, u.uy | 0, false, true, false);
        return ECMD_OK;
    }

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

    x.box = null;
    const lvlObjs = g.level?.levelObjects;
    for (let otmp = lvlObjs?.[u.ux | 0]?.[u.uy | 0] ?? null; otmp; otmp = otmp.nexthere) {
        if (!_Is_box(otmp)) continue;
        if (otmp.obroken || !otmp.olocked) {
            /* C lock.c:719 — already broken/unlocked. */
            otmp.lknown = 0;
            await pline(`There is ${await doname(otmp)} here, but its lock is already ${otmp.obroken ? 'broken' : 'unlocked'}.`);
            otmp.lknown = 1;
            continue;
        }
        /* C lock.c:729-730 — format the full name before learning the lock. */
        const qbuf = await safe_qbuf('', 'There is ', ' here; force its lock?',
                                     otmp, doname, ansimpleoname, 'a box');
        otmp.lknown = 1;
        const c = await _ynq(qbuf);
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
        _topl_stash_result();
        g._forceMsgs = [];
        g._forceMsgBotls = [];
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
 *   Other roles' quest artifacts are fallback tools only (lock.c:298-343).
 *   Among ordinary/own-role keys, prefer a magic key (lock.c:318). */
export function autokey(opening) {
    let key = null, pick = null, card = null;
    let akey = null, apick = null, acard = null;
    for (let o = game.invent; o; o = o.nobj) {
        if ((o.oartifact | 0) >= 21 /* ART_ORB_OF_DETECTION, obj.h:271 */ && !is_quest_artifact(o)) {
            switch (o.otyp | 0) {
                case SKELETON_KEY_OTYP: if (!akey) akey = o; break;
                case LOCK_PICK_OTYP: if (!apick) apick = o; break;
                case CREDIT_CARD_OTYP: if (!acard) acard = o; break;
                default: break;
            }
        } else switch (o.otyp | 0) {
            case SKELETON_KEY_OTYP: if (!key || is_magic_key_hero(o)) key = o; break;
            case LOCK_PICK_OTYP: if (!pick) pick = o; break;
            case CREDIT_CARD_OTYP: if (!card) card = o; break;
            default: break;
        }
    }
    if (!opening) card = acard = null;
    if (!key && !pick && !card) key = akey;
    if (!pick && !card) pick = apick;
    if (!card) card = acard;
    return key ? key : (pick ? pick : (card ? card : null));
}

async function _touch_lock_pick(pick) { // C artifact.c:910-973; flush the hero helper's deferred blast.
    const result = await touch_artifact(pick, game.youmonst);
    if (game._touch_artifact_blast_msg) { const msg = game._touch_artifact_blast_msg; game._touch_artifact_blast_msg = null; await pline(msg); }
    return result;
}
export async function pick_lock(pick, rx, ry, container) {
    const g = game;
    const u = g.u = g.u || {};
    // C lock.c:373-377: use zeroobj for a null tool, retaining its identity.
    const dummypick = pick == null;
    if (dummypick) pick = { otyp: 0, oclass: 0, quan: 0 };
    const picktyp = pick ? (pick.otyp | 0) : 0;
    /* C lock.c:370 — autounlock := (rx != 0 || container != NULL). */
    const autounlock = ((rx | 0) !== 0) || (container != null);

    g.xlock = g.xlock || { usedtime: 0, picktyp: 0, chance: 0, door: null, box: null, magic_key: false };
    const x = g.xlock;

    /* C lock.c:381 — resume an interrupted previous attempt. */
    if (x.usedtime && picktyp === x.picktyp) {
        if (_nohands_lk() || u.uswallow || (x.box && !can_reach_floor(true))) {
            const what = picktyp === LOCK_PICK_OTYP ? 'pick' : picktyp === CREDIT_CARD_OTYP ? 'card' : 'key';
            await pline(`Unfortunately, you can no longer ${_nohands_lk() ? 'hold the ' + what : 'reach the lock'}.`);
            reset_pick();
            return PICKLOCK_LEARNED_SOMETHING;
        }
        const action = lock_action();
        await pline(`You resume your attempt at ${action}.`);
        x.magic_key = is_magic_key_hero(pick);
        set_occupation(picklock, action, 0);
        return PICKLOCK_DID_SOMETHING;
    }

    /* C lock.c:408-411 — an engulfed hero cannot reach any lock; this runs
     * BEFORE the direction prompt at lock.c:424, so no getdir() happens. */
    if (_nohands_lk()) {
        await pline(`You can't hold ${await doname(pick)} -- you have no hands!`);
        return PICKLOCK_DID_NOTHING;
    } else if (u.uswallow) {
        await pline(`You can't ${picktyp === CREDIT_CARD_OTYP ? '' : 'lock or '}unlock ${mon_nam(u.ustuck)}.`);
        return PICKLOCK_DID_NOTHING;
    }
    if (!dummypick && ![SKELETON_KEY_OTYP, LOCK_PICK_OTYP, CREDIT_CARD_OTYP].includes(picktyp)) { await impossible('picking lock with object %d?', picktyp); return PICKLOCK_DID_NOTHING; }

    /* C lock.c:421 — autounlock provides coordinates; else getdir → u.dx/u.dy. */
    let cx, cy;
    if ((rx | 0) !== 0) {
        cx = rx | 0; cy = ry | 0;
    } else {
        if (!(await getdir(null))) {
            /* C lock.c:424 get_adjacent_loc() -> cmd.c:3939 pline1(Never_mind) */
            await pline('Never mind.');
            return PICKLOCK_DID_NOTHING; /* cancelled / invalid */
        }
        cx = (u.ux | 0) + (u.dx | 0);
        cy = (u.uy | 0) + (u.dy | 0);
        if (!isok(cx, cy)) { await pline('Invalid location!'); return PICKLOCK_DID_NOTHING; }
    }

    /* C lock.c:429 — u_at(cc): pick the lock on a container at the hero's tile. */
    if (cx === (u.ux | 0) && cy === (u.uy | 0)) {
        /* C lock.c:436-439 — a stale/real u.dz < 0 ('<' at the direction
         * prompt) has no lock to pick: "There isn't any sort of lock up
         * there." ("here" when Levitation). */
        if ((u.dz | 0) < 0 && !autounlock) {
            const lp = u.uprops?.[48]; /* LEVITATION */
            const lev = !!lp && !!((lp.intrinsic | 0) || (lp.extrinsic | 0)) && !(lp.blocked | 0);
            await pline(`There isn't any sort of lock up ${lev ? 'here' : 'there'}.`);
            return PICKLOCK_LEARNED_SOMETHING;
        }
        if (is_lava(u.ux, u.uy)) { await pline(`Doing that would probably melt ${yname(pick)}.`); return PICKLOCK_LEARNED_SOMETHING; }
        if (is_pool(u.ux, u.uy) && !u.uinwater) { await pline(`The ${hliquid('water')} has no lock.`); return PICKLOCK_LEARNED_SOMETHING; }
        let c = 'n';
        let count = 0;
        const lvlObjs = g.level?.levelObjects;
        for (let otmp = lvlObjs?.[cx]?.[cy] ?? null; otmp; otmp = otmp.nexthere) {
            /* C lock.c:453 — autounlock: skip any box that isn't the target. */
            if (autounlock && otmp !== container) continue;
            if (!_Is_box(otmp)) continue;
            ++count;
            if (!can_reach_floor(true)) { await pline(`You can't reach ${_the(xname_flags(otmp, CXN_NORMAL))} from up here.`); return PICKLOCK_LEARNED_SOMETHING; }
            if (autounlock && (g.flags?.autounlock & AUTOUNLOCK_UNTRAP) && could_untrap(false, true)) { /* C lock.c:471-480 */
                c = otmp.tknown ? (otmp.otrapped ? 'y' : 'n')
                    : await _ynq(await safe_qbuf('', 'Check ', ' for a trap?', otmp, yname, ysimple_name, 'this'));
                if (c === 'q') return PICKLOCK_DID_NOTHING;
                if (c !== 'n') {
                    await untrap_at(cx, cy, otmp);
                    return PICKLOCK_DID_SOMETHING;
                }
            }
            /* C lock.c:482 — AUTOUNLOCK_APPLY_KEY: "Unlock it with <pick>? [ynq]" */
            if (autounlock && ((g.flags?.autounlock ?? AUTOUNLOCK_APPLY_KEY) & AUTOUNLOCK_APPLY_KEY)) {
                c = 'q';
                if (!dummypick) {
                    /* C lock.c:486 — Sprintf(qbuf,"Unlock it with %s?", yname(pick)) */
                    const ans = await _ynq(`Unlock it with ${_yname(pick)}?`);
                    c = ans;
                }
                if (c !== 'y') return PICKLOCK_DID_NOTHING;
            } else {
                /* C lock.c:496-509 — "There is <a box> here; <verb> <it|its lock>?" */
                let verb, it = false;
                if (otmp.obroken) verb = 'fix';
                else if (!otmp.olocked) { verb = 'lock'; it = true; }
                else if (picktyp !== LOCK_PICK_OTYP) { verb = 'unlock'; it = true; }
                else verb = 'pick';
                const qsfx = ` here; ${verb} ${it ? 'it' : 'its lock'}?`;
                const qbuf = await safe_qbuf('', 'There is ', qsfx, otmp, doname,
                                             ansimpleoname, 'a box');
                otmp.lknown = 1;
                c = await _ynq(qbuf);
                if (c === 'q') return PICKLOCK_DID_NOTHING;
                if (c === 'n') continue; /* try next box */
            }
            /* C lock.c:511 — obroken: can't fix its lock. */
            if (otmp.obroken) {
                await pline(`You can't fix its broken lock with ${ansimpleoname(pick)}.`);
                return PICKLOCK_LEARNED_SOMETHING;
            }
            /* C lock.c:510 — credit card can only UNLOCK (box is locked → ok). */
            if (picktyp === CREDIT_CARD_OTYP && !otmp.olocked) {
                await pline(`You can't do that with ${_an(simple_typename(picktyp))}.`);
                return PICKLOCK_LEARNED_SOMETHING;
            }
            /* C lock.c:515 — autounlock touch_artifact check (no artifact pick). */
            if (autounlock && !await _touch_lock_pick(pick)) return PICKLOCK_DID_SOMETHING;
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
            x.magic_key = is_magic_key_hero(pick);
            c = 'y';
            break;
        }
        /* C lock.c:541 — decided against all boxes / no box found. */
        if (c !== 'y') {
            if (!count) await pline("There doesn't seem to be any sort of lock here.");
            return PICKLOCK_LEARNED_SOMETHING;
        }
        /* C lock.c:655 — set up the occupation and start picking. */
        g.context.move = 0;
        set_occupation(picklock, lock_action(), 0);
        return PICKLOCK_DID_SOMETHING;
    }

    /* C lock.c:546 — adjacent door branch.  A visible monster gets first
     * refusal, before the terrain is inspected; using a lock tool on a pet
     * therefore reports its appreciation message and still costs a turn. */
    if (u.utrap && u.utraptype === TT_PIT) { // C lock.c:550-555
        await pline("You can't reach over the edge of the pit.");
        return PICKLOCK_DID_NOTHING;
    }
    const mtmp = m_at(cx, cy);
    if (mtmp && canseemon(mtmp) && M_AP_TYPE(mtmp) !== M_AP_FURNITURE
        && M_AP_TYPE(mtmp) !== M_AP_OBJECT) {
        if (picktyp === CREDIT_CARD_OTYP && (mtmp.isshk || (mtmp.data?.pmidx ?? mtmp.mndx) === 274))
            await verbalize('No checks, no credit, no problem.');
        else
            await pline(`I don't think ${mon_nam(mtmp)} would appreciate that.`);
        return PICKLOCK_LEARNED_SOMETHING;
    }
    if (mtmp && is_door_mappear(mtmp)) {
        // C lock.c:571-576: reveal the mimic before it may take the tool.
        await stumble_onto_mimic(mtmp);
        await maybe_absorb_item(mtmp, pick, 50, 10);
        return PICKLOCK_LEARNED_SOMETHING;
    }
    const door = g.level?.at?.(cx, cy) ?? null;
    if (!door || !_IS_DOOR(door.typ)) {
        let res = PICKLOCK_DID_NOTHING;
        if (door) {
            const _sig = (r) => r ? `${r.ch}|${r.color}|${r.cls}|${r.decgfx ? 1 : 0}` : '';
            const oldglyph = _sig(door.remembered_glyph);
            const oldlastseentyp = update_mapseen_for(cx, cy);
            feel_location(cx, cy);
            if (_sig(door.remembered_glyph) !== oldglyph
                || (door.lastseentyp | 0) !== oldlastseentyp)
                res = PICKLOCK_LEARNED_SOMETHING;
        }
        await pline(`You ${_blind_stub() ? 'feel' : 'see'} no ${_is_drawbridge_wall_stub(cx, cy) >= 0 ? 'lock on the drawbridge' : 'door there'}.`);
        return res;
    }
    const mask = door.doormask | 0;
    /* C lock.c:594-603 — door state switch. */
    if (mask === D_NODOOR) { await pline('This doorway has no door.'); return PICKLOCK_LEARNED_SOMETHING; }
    if (mask === D_ISOPEN) { await pline('You cannot lock an open door.'); return PICKLOCK_LEARNED_SOMETHING; }
    if (mask === D_BROKEN) { await pline('This door is broken.'); return PICKLOCK_LEARNED_SOMETHING; }

    /* C lock.c:605-612 — check for traps before either locking or unlocking. */
    const au = g.flags?.autounlock;
    const checkTraps = typeof au === 'string'
        ? au.split('+').some(w => w.trim() === 'untrap') : (au & AUTOUNLOCK_UNTRAP);
    if (checkTraps && could_untrap(false, false)) {
        const c = await _ynq('Check this door for a trap?');
        if (c === 'q') return PICKLOCK_DID_NOTHING;
        if (c !== 'n') {
            await untrap_at(cx, cy);
            return PICKLOCK_DID_SOMETHING;
        }
    }

    /* C lock.c:614-618 — credit cards are only good for unlocking. */
    if (picktyp === CREDIT_CARD_OTYP && !(mask & D_LOCKED)) {
        await pline("You can't lock a door with a credit card.");
        return PICKLOCK_LEARNED_SOMETHING;
    }

    const qbuf = ((mask & D_LOCKED) ? 'Unlock' : 'Lock') + ' it'
               + (autounlock ? ' with ' + _yname(pick) : '') + '?';
    if ((await _ynq(qbuf)) !== 'y')
        return PICKLOCK_DID_NOTHING;


    if (autounlock && !await _touch_lock_pick(pick)) return PICKLOCK_DID_SOMETHING;
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
    g.context.move = 0;
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

async function _stumble_on_door_mimic_stub(x, y) {
    const mtmp = m_at(x, y);
    if (!mtmp || !is_door_mappear(mtmp) || _hero_prop_on_lk(PROT_FROM_SHAPE_CHANGERS)) return false;
    await stumble_onto_mimic(mtmp); return true;
}
/* C youprop.h Confusion / Stunned: (HProp || EProp).  These were hardcoded
 * `false`, so doclose (lock.c:992-993) never forced ECMD_TIME for an impaired
 * hero and a confused "You see no door there." cost no turn. */
function _hero_prop_on_lk(prop) {
    const p = game.u?.uprops?.[prop];
    return !!(p && ((p.intrinsic | 0) || (p.extrinsic | 0)));
}
function _confusion_stub() { return !!game.u?.uprops?.[CONFUSION]?.intrinsic; }
function _stunned_stub() { return !!game.u?.uprops?.[STUNNED]?.intrinsic; }
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
/* C lock.c:925-952 obstructed() */
async function _obstructed_stub(x, y, quietly) {
    const mtmp = m_at(x, y);
    let objhere = false;
    if (mtmp && M_AP_TYPE(mtmp) !== M_AP_FURNITURE) {
        if (M_AP_TYPE(mtmp) === M_AP_OBJECT) {
            objhere = true;
        } else {
            if (!quietly) {
                let Mn = Some_Monnam(mtmp);
                if ((mtmp.mx !== x || mtmp.my !== y) && canspotmon(mtmp))
                    Mn = s_suffix(Mn) + ' tail';
                await pline(`${Mn} blocks the way!`);
            }
            if (!canspotmon(mtmp))
                map_invisible(x, y);
            return true;
        }
    }
    if (objhere || game.level?.levelObjects?.[x]?.[y]) {
        if (!quietly)
            await pline("Something's in the way.");
        return true;
    }
    return false;
}

/* C ref: lock.c:16 picking_lock(coordxy *x, coordxy *y) — if hero is picklocking,
 *   set *x = u.ux + u.dx, *y = u.uy + u.dy and return TRUE; else *x=*y=0, return FALSE. */
export function picking_lock(x, y) {
    const g = game;
    const u = g.u || {};
    if (g.occupation === picklock) {
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
    if (g.occupation !== picklock)
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
export async function doorlock(otmp, x, y) {
    const door = game.level?.at(x, y);
    if (!door)
        return false;
    let res = true;
    let loudness = 0;
    let msg = null;

    if ((door.typ | 0) === SDOOR) {
        /* C lock.c:1049-1076 */
        const _ot = otmp.otyp | 0;
        if (_ot === WAN_OPENING_OTYP_LK || _ot === SPE_KNOCK_OTYP_LK
            || _ot === WAN_STRIKING_OTYP || _ot === 376) {
            door.typ = DOOR;
            door.doormask = D_CLOSED | ((door.doormask | 0) & D_TRAPPED);
            newsym(x, y);
            if (cansee(x, y))
                await pline("A door appears in the wall!");
            if (_ot === WAN_OPENING_OTYP_LK || _ot === SPE_KNOCK_OTYP_LK)
                return true;
            /* striking: continue door handling below */
        } else {
            return false;
        }
    }

    switch (otmp.otyp | 0) {
    case WAN_STRIKING_OTYP:
    case 376: /* SPE_FORCE_BOLT */
        if ((door.doormask | 0) & (D_LOCKED | D_CLOSED)) {
            if ((door.doormask | 0) & D_TRAPPED) {
                /* C lock.c:1105-1135: a trapped door explodes.  The doorway
                 * is emptied and its light unblocked; a monster standing in
                 * it sets the trap off via mb_trapped(); otherwise the blast
                 * is loud (loudness 40) and prints KABOOM when seen. */
                const mtmp = m_at(x, y);
                const sawit0 = mtmp ? canseemon(mtmp) : cansee(x, y);
                door.doormask = D_NODOOR;
                unblock_point(x, y);
                newsym(x, y);
                const seeit = mtmp ? canseemon(mtmp) : cansee(x, y);
                if (mtmp) {
                    await mb_trapped(mtmp, sawit0 || seeit);
                } else {
                    /* C lock.c:1121-1131 — Soundeffect() is a no-op here */
                    loudness = 40;
                    if (game.flags?.verbose) {
                        if ((sawit0 || seeit) && !Unaware())
                            await pline("KABOOM!!  You see a door explode.");
                        else if (!_lock_Deaf()) {
                            const u = game.u;
                            const d2 = ((x - u.ux) ** 2) + ((y - u.uy) ** 2);
                            await You_hear(`a ${(d2 > 7 * 7) ? 'distant' : 'nearby'} explosion.`);
                        }
                    }
                }
                break;
            }
            const sawit = cansee(x, y);
            door.doormask = D_BROKEN;
            recalc_block_point(x, y);
            const seeit = cansee(x, y);
            newsym(x, y);
            if (game.flags?.verbose) {
                if ((sawit || seeit) && !Unaware())
                    await pline("The door crashes open!");
                else if (!_lock_Deaf())
                    await You_hear('a crashing sound.');
            }
            if (game.vision_full_recalc) vision_recalc(0); // C lock.c:1248-1249
            loudness = 20;
        } else {
            /* C lock.c:1152 — an open/broken/absent door is unaffected. */
            res = false;
        }
        break;
    case WAN_LOCKING_OTYP_LK:
    case SPE_WIZARD_LOCK_OTYP_LK: {
        /* C lock.c:1138-1195 */
        const dustcloud = 'A cloud of dust';
        const quickly_dissipates = 'quickly dissipates';
        const mysterywand = (otmp.oclass | 0) === WAND_CLASS && !otmp.dknown;
        if (Is_rogue_level(game.u?.uz)) {
            const vis = cansee(x, y);
            if (vis) {
                await pline(`${dustcloud} springs up in the older, more primitive doorway.`);
            } else {
                await You_hear('a swoosh.');
            }
            if (await _obstructed_stub(x, y, mysterywand)) {
                if (vis)
                    await pline(`The cloud ${quickly_dissipates}.`);
                return false;
            }
            block_point(x, y);
            door.typ = SDOOR;
            door.doormask = D_NODOOR;
            if (vis)
                await pline('The doorway vanishes!');
            newsym(x, y);
            return true;
        }
        if (await _obstructed_stub(x, y, mysterywand))
            return false;
        if (t_at(x, y)) {
            await pline(`${dustcloud} springs up in the doorway, but ${quickly_dissipates}.`);
            return false;
        }
        switch ((door.doormask | 0) & ~D_TRAPPED) {
        case D_CLOSED:
            msg = 'The door locks!';
            break;
        case D_ISOPEN:
            msg = 'The door swings shut, and locks!';
            break;
        case D_BROKEN:
            msg = 'The broken door reassembles and locks!';
            break;
        case D_NODOOR:
            msg = 'A cloud of dust springs up and assembles itself into a door!';
            break;
        default:
            res = false;
            break;
        }
        block_point(x, y);
        door.doormask = D_LOCKED | ((door.doormask | 0) & D_TRAPPED);
        newsym(x, y);
        break;
    }
    case WAN_OPENING_OTYP_LK:
    case SPE_KNOCK_OTYP_LK:
        /* C lock.c:1196-1202 */
        if ((door.doormask | 0) & D_LOCKED) {
            msg = 'The door unlocks!';
            door.doormask = D_CLOSED | ((door.doormask | 0) & D_TRAPPED);
        } else
            res = false;
        break;
    default:
        impossible(`magic (${otmp.otyp}) attempted on door.`);
        break;
    }
    if (msg && cansee(x, y))
        await pline(msg);

    if (loudness > 0) {
        /* C lock.c:1157-1162 — the door was destroyed: wake everything within
         * `loudness`, and put a broken SHOP door on the shopkeeper's repair
         * list at NO cost to the hero (add_damage with cost 0).  Both are
         * RNG-free. */
        wake_nearto(x, y, loudness);
        if (in_rooms(x, y, SHOPBASE).length)
            add_damage(x, y, 0);
    }
    if (res && picking_at(x, y)) { // C lock.c:1269-1273
        await stop_occupation();
        reset_pick();
    }
    return res;
}

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
