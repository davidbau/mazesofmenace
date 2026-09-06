// cmd.js — Command dispatch and movement.
// C ref: cmd.c rhack(), hack.c domove().
//
// Minimal skeleton: movement, search, inventory / look / spell / discoveries /
// attributes for seed8000. Contestants should add: kick, eat, drink, read, zap,
// wear, wield, drop, throw, pray, cast, and all other commands.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import {
    newsym, flush_screen, pline, pline_dir, pline_xy, set_msg_xy,
    see_nearby_objects,
    clear_nhwindow_message,
    mon_visible, sensemon, glyph_is_invisible_id, unmap_object, map_object,
    look_shown_at, Norep, tty_doprev_message, putmsghistory,
    unmap_invisible,
} from './display.js';
import { COLNO, ROWNO, STONE, DOOR, CORR, ROOM, IRONBARS, TREE, SDOOR,
         D_CLOSED, D_LOCKED, D_NODOOR, D_BROKEN, SCORR, LAVAWALL,
         DRAWBRIDGE_UP, ROOMOFFSET,
         IS_DOOR, IS_OBSTRUCTED, IS_FURNITURE, IS_STWALL, IS_WALL, IS_TREE,
         IS_FOUNTAIN, IS_SINK, IS_THRONE, IS_ALTAR, IS_ROOM, IS_WATERWALL,
         ACCESSIBLE, isok, Upolyd, Is_container, CLICK_1,
         ECMD_OK, ECMD_TIME, ECMD_CANCEL, ECMD_FAIL, DOMOVE_RUSH, DOMOVE_WALK,
         CMDQ_EXTCMD, CMDQ_KEY, CQ_CANNED, CQ_REPEAT,
         IFBURIED, WIZMODECMD, NOFUZZERCMD, PREFIXCMD, MOVEMENTCMD,
         AUTOCOMPLETE, CMD_NOT_AVAILABLE, INTERNALCMD, GENERALCMD,
         CMD_M_PREFIX, CMD_gGF_PREFIX, CMD_INSANE, QBUFSZ,
         xdir, ydir, zdir, xytodir, N_DIRS, DIR_W, DIR_N, DIR_E, DIR_S,
         DIR_NW, DIR_NE, DIR_SE, DIR_SW,
         GFILTER_VIEW, GLOC_INTERESTING,
         M_AP_TYPE, M_AP_FURNITURE, M_AP_OBJECT, VIBRATING_SQUARE,
         PARANOID_TRAP,
         LARGEST_INT, GC_NOFLAGS, GC_SAVEHIST, GC_CONDHIST, GC_ECHOFIRST,
         } from './const.js';
import { FOOD_CLASS, objectNames } from './objects.js';
import { EXTCMDLIST } from './generated/extcmdlist_data.js';
import { PM_GRID_BUG } from './generated/monsters_data.js';

const STATUE_OTYP = objectNames.indexOf('STATUE');
const BOULDER_OTYP = objectNames.indexOf('BOULDER');
const AT_EXPL = 13; // monattk.h — fight_empty Upolyd explode
import { dist2, bad_rock, cant_squeeze_thru, wake_nearto } from './mon.js';
import { is_hider } from './monsters.js';
import { vision_recalc, couldsee, cansee } from './vision.js';
import {
    ddoinv, dodiscovered, doattributes, dolook, doprgold, doprwep, doprarm,
    doprring, dopramulet, doprtool, doprinuse, doperminv, dotypeinv,
} from './invent.js';
import { dovspell, docast, num_spells } from './spell.js';
import { doeat } from './eat.js';
import { dodrink } from './potion.js';
import { dozap } from './zap.js';
import { doread } from './read.js';
import { doengrave, maybe_smudge_engr, set_occupation, can_reach_floor, engr_at } from './engrave.js';
import { dothrow, dofire } from './dothrow.js';
import { doapply, check_leash } from './apply.js';
import { dokick } from './dokick.js';
import { donull, dodown, doup, dodrop, doddrop } from './do.js';
import { dosave, dosave0 } from './save.js';
import { doset_simple, dotogglepickup, select_menu_pick_one } from './options.js';
import {
    do_attack, mon_at, is_safemon, explum, attacktype_fordmg,
} from './uhitm.js';
import { rehumanize } from './polyself.js';
import { doopen, doopen_indir, doclose } from './lock.js';
import { doextcmd, getlin, mungspaces, extcmd_run_by_txt } from './getline.js';
import { strstri, strsubst } from './hacklib.js';
import { dosearch, doterrain } from './detect.js';
import { dotakeoff, doddoremarm, dowear, doputon, doremring } from './do_wear.js';
import { wiz_wish, wiz_genesis, wiz_level_tele, wiz_map } from './wizcmds.js';
import { dotelecmd } from './teleport.js';
import { dowield, dowieldquiver, doswapweapon } from './wield.js';
import { dowhatis, doquickwhatis, dohelp, dowhatdoes, doversion } from './pager.js';
import { visctrl, key2txt, cmdbind_get } from './dokeylist.js';
import { an, doname } from './objnam.js';
import { spoteffects, dopickup, doloot, dotip } from './pickup.js';
import { objects_at } from './mkobj.js';
import { stairway_at, u_on_newpos } from './mklev.js';
import { In_tutorial } from './dungeon.js';
import { ATR_INVERSE } from './terminal.js';
import { dopay } from './shk.js';
import { getpos, gather_locs_interesting, auto_describe_text } from './getpos.js';
import {
    nomul, moverock, boulder_at, swim_move_danger, trapmove,
    impaired_movement, is_pool, is_lava, carrying_too_much,
    invocation_message, avoid_trap_andor_region,
    hero_tread_disturb_buried_zombies, hero_hideunder_after_move,
    hero_mimic_unhide_after_move, domove_swap_with_pet,
    test_move_run_blocked_by_boulder, test_move_boulder_is_blocking,
    test_move_hero_passes_bars, test_move_hero_chews_bars, still_chewing,
    could_move_onto_boulder, Passes_walls_prop,
    end_running,
    water_turbulence, move_out_of_bounds, avoid_running_into_trap_or_liquid,
    domove_fight_ironbars, domove_fight_web,
} from './hack.js';
import { acurr, exercise, A_DEX, Fumbling } from './attrib.js';
import { drag_ball, move_bc } from './ball.js';
import { in_out_region } from './region.js';
import { m_postmove_effect, can_ooze } from './monmove.js';

/** C cmd.c command_queue[CQ_*] — JS arrays on game. */
function cmdq_qname(q) {
    return (q | 0) === CQ_REPEAT ? '_cmdq_repeat' : '_cmdq_canned';
}

/** C ref: cmd.c cmdq_clear(q). Callers without q still clear CQ_CANNED. */
export function cmdq_clear(q = CQ_CANNED) {
    game[cmdq_qname(q)] = [];
}

/**
 * C ref: cmd.c end_of_input `:5182–5209` (HANGUPHANDLING).
 * unixconf.h defines SAFERHANGUP; NOSAVEONHANGUP is off, so hangup
 * still writes via dosave0 when something_worth_saving (tutorial
 * zeros that first). Named omit: sound_exit_nhsound, exit_nhwindows,
 * clearlocks (no filesystem locks — Contest Rule #2). nh_terminate
 * becomes program_state.gameover so moveloop stops.
 */
export function end_of_input() {
    if (!game.program_state) game.program_state = {};
    const ps = game.program_state;
    if (In_tutorial(game.u?.uz)) {
        ps.something_worth_saving = 0;
    }
    if (ps.something_worth_saving) {
        dosave0();
    }
    ps.in_moveloop = 0;
    ps.exiting = 1;
    ps.gameover = true;
}

/**
 * C ref: cmd.c cmdq_pop — CQ_REPEAT when gi.in_doagain, else CQ_CANNED.
 */
export function cmdq_pop() {
    const q = game[game.in_doagain ? '_cmdq_repeat' : '_cmdq_canned'];
    if (!q || !q.length) return null;
    return q.shift();
}

/** C ref: cmd.c cmdq_peek. */
function cmdq_peek(q) {
    const qq = game[cmdq_qname(q)];
    return (qq && qq.length) ? qq[0] : null;
}

/**
 * C ref: cmd.c cmdq_copy — JS arrays preserve order (C prepends then
 * cmdq_reverse). Shallow copy: nodes are not mutated, only shifted.
 */
function cmdq_copy(q) {
    const qq = game[cmdq_qname(q)];
    return qq && qq.length ? qq.slice() : [];
}

/**
 * C ref: cmd.c cmdq_shift(q) `:354–370` — last node becomes head
 * (doextcmd records the resolved command after getobj keys).
 * @param {number} q CQ_CANNED or CQ_REPEAT
 */
export function cmdq_shift(q) {
    const qq = game[cmdq_qname(q)];
    if (!qq || qq.length < 2) return;
    qq.unshift(qq.pop());
}

/**
 * C rhack `:3745–3746` — CMD_INSANE (^P prevmsg / ^R redraw) copies
 * iflags.sanity_check onto sanity_no_check so the next moveloop
 * sanity_check returns without re-firing impossible() (D-1664).
 * @param {number} flags ext_func_tab flags
 */
function rhack_cmd_insane(flags) {
    if ((flags & CMD_INSANE) !== 0 && game.iflags) {
        game.iflags.sanity_no_check = game.iflags.sanity_check;
    }
}

/**
 * C ref: cmd.c cmdq_add_ec(q, fn) `:253–270` — typ CMDQ_EXTCMD,
 * ec_entry from ext_func_tab_from_func. herecmdmenu still queues
 * run-only nodes (txt empty; not a sixth clone of apply/dig/iactions).
 * @param {number} q
 * @param {Function} fn
 * @param {{ txt?: string, flags?: number } | null} [tab]
 */
function cmdq_add_ec(q, fn, tab = null) {
    const name = cmdq_qname(q);
    if (!game[name]) game[name] = [];
    game[name].push({
        typ: CMDQ_EXTCMD,
        run: fn,
        txt: tab?.txt || '',
        flags: tab?.flags | 0,
    });
}

/**
 * C ref: cmd.c reset_cmd_vars `:3606–3624`. travelmap selection_free named.
 * @param {boolean} reset_cmdq
 */
function reset_cmd_vars(reset_cmdq) {
    if (!game.context) game.context = {};
    game.context.run = 0;
    game.context.nopick = 0;
    game.context.forcefight = 0;
    game.context.move = 0;
    game.context.mv = 0;
    game.domove_attempting = 0;
    game.multi = 0;
    if (game.iflags) game.iflags.menu_requested = false;
    game.context.travel = 0;
    game.context.travel1 = 0;
    if (reset_cmdq) {
        cmdq_clear(CQ_CANNED);
        cmdq_clear(CQ_REPEAT);
    }
}

/**
 * C ref: cmd.c set_move_cmd `:1386–1400`. PREFIXCMD already in
 * domove_attempting skips the run/WALK|RUSH assign.
 * @param {number} dir DIR_*
 * @param {number} run 0 walk, else capital/ctrl run value
 */
function set_move_cmd(dir, run) {
    const u = game.u || (game.u = {});
    if (!game.context) game.context = {};
    u.dz = zdir[dir] | 0;
    u.dx = xdir[dir] | 0;
    u.dy = ydir[dir] | 0;
    if (game.iflags?.menu_requested) game.context.nopick = 1;
    game.context.travel = 0;
    game.context.travel1 = 0;
    if (!(game.domove_attempting) && !u.dz) {
        game.context.run = run;
        game.domove_attempting = (game.domove_attempting || 0)
            | (run ? DOMOVE_RUSH : DOMOVE_WALK);
    }
}

/* C cmd.c do_move_* `:1403–1464` — REPEAT records these, not the key. */
function do_move_west() { set_move_cmd(DIR_W, 0); return ECMD_TIME; }
function do_move_northwest() { set_move_cmd(DIR_NW, 0); return ECMD_TIME; }
function do_move_north() { set_move_cmd(DIR_N, 0); return ECMD_TIME; }
function do_move_northeast() { set_move_cmd(DIR_NE, 0); return ECMD_TIME; }
function do_move_east() { set_move_cmd(DIR_E, 0); return ECMD_TIME; }
function do_move_southeast() { set_move_cmd(DIR_SE, 0); return ECMD_TIME; }
function do_move_south() { set_move_cmd(DIR_S, 0); return ECMD_TIME; }
function do_move_southwest() { set_move_cmd(DIR_SW, 0); return ECMD_TIME; }

/**
 * C ref: cmd.c do_rush `:1589–1602` — 'g' PREFIXCMD.
 * @returns {Promise<number>}
 */
export async function do_rush() {
    if ((game.domove_attempting || 0) & DOMOVE_RUSH) {
        await Norep('Double rush prefix, canceled.');
        if (game.context) game.context.run = 0;
        game.domove_attempting = 0;
        return ECMD_CANCEL;
    }
    if (!game.context) game.context = {};
    game.context.run = 2;
    game.domove_attempting = (game.domove_attempting || 0) | DOMOVE_RUSH;
    return ECMD_OK;
}

/**
 * C ref: cmd.c do_run `:1605–1618` — 'G' PREFIXCMD.
 * @returns {Promise<number>}
 */
export async function do_run() {
    if ((game.domove_attempting || 0) & DOMOVE_RUSH) {
        await Norep('Double run prefix, canceled.');
        if (game.context) game.context.run = 0;
        game.domove_attempting = 0;
        return ECMD_CANCEL;
    }
    if (!game.context) game.context = {};
    game.context.run = 3;
    game.domove_attempting = (game.domove_attempting || 0) | DOMOVE_RUSH;
    return ECMD_OK;
}

/**
 * C ref: cmd.c do_fight `:1621–1634` — 'F' PREFIXCMD.
 * @returns {Promise<number>}
 */
export async function do_fight() {
    if (game.context?.forcefight) {
        await Norep('Double fight prefix, canceled.');
        game.context.forcefight = 0;
        game.domove_attempting = 0;
        return ECMD_CANCEL;
    }
    if (!game.context) game.context = {};
    game.context.forcefight = 1;
    game.domove_attempting = (game.domove_attempting || 0) | DOMOVE_WALK;
    return ECMD_OK;
}

/**
 * C ref: cmd.c do_reqmenu `:1574–1586` — 'm' PREFIXCMD.
 * cmd_from_func(do_reqmenu) named (m-prefix key is 'm').
 * @returns {Promise<number>}
 */
export async function do_reqmenu() {
    if (game.iflags?.menu_requested) {
        await Norep(`Double ${visctrl('m')} prefix, canceled.`);
        game.iflags.menu_requested = false;
        return ECMD_CANCEL;
    }
    if (!game.iflags) game.iflags = {};
    game.iflags.menu_requested = true;
    return ECMD_OK;
}

/**
 * C ref: cmd.c ext_func_tab_from_func — first extcmdlist row with matching
 * ef_txt (INTERNALCMD included; "altdip" is dip_into).
 * @param {string} txt
 * @returns {typeof EXTCMDLIST[number] | null}
 */
export function ext_func_tab_from_txt(txt) {
    if (txt == null || txt === '') return null;
    const want = String(txt).toLowerCase();
    for (const e of EXTCMDLIST) {
        if (e.txt.toLowerCase() === want) return e;
    }
    return null;
}

/**
 * C ref: cmd.c can_do_extcmd `:462–488`. Lua NHCB_CMD_BEFORE named omit.
 * altdip is INTERNALCMD with no IFBURIED — buried hero is refused.
 * @param {typeof EXTCMDLIST[number] | null | undefined} extcmd
 * @returns {Promise<boolean>}
 */
export async function can_do_extcmd(extcmd) {
    if (!extcmd) return false;
    const ecflags = extcmd.flags | 0;
    const wizard = !!(game.flags?.debug || game.flags?.wizard || game.wizard);
    if (!wizard && (ecflags & WIZMODECMD)) {
        await pline(`Unavailable command '${extcmd.txt}'.`);
        return false;
    }
    if (game.u?.uburied && !(ecflags & IFBURIED)) {
        await pline("You can't do that while you are buried!");
        return false;
    }
    if (game.iflags?.debug_fuzzer && (ecflags & NOFUZZERCMD)) {
        return false;
    }
    return true;
}

/**
 * C strutil.c pmatch_internal `:103–141` — '*' / '?' (ci via lowc).
 * doextlist search uses pmatchi (ci true, no skip-set).
 * @param {string} patrn
 * @param {string} strng
 * @param {boolean} ci
 * @returns {boolean}
 */
function pmatch_internal(patrn, strng, ci) {
    const pstr = String(patrn ?? '');
    const sstr = String(strng ?? '');
    const fold = (ch) => {
        if (!ci || !ch) return ch;
        const c = ch.charCodeAt(0);
        return (c >= 65 && c <= 90) ? String.fromCharCode(c + 32) : ch;
    };
    const rec = (pi, si) => {
        for (;;) {
            const s = si < sstr.length ? sstr[si] : '';
            const p = pi < pstr.length ? pstr[pi] : '';
            si++;
            pi++;
            if (!p) return s === '';
            if (p === '*') {
                if (!(pi < pstr.length ? pstr[pi] : '') || rec(pi, si - 1)) {
                    return true;
                }
                return s ? rec(pi - 1, si) : false;
            }
            if ((ci ? fold(p) !== fold(s) : p !== s) && (p !== '?' || !s)) {
                return false;
            }
        }
    };
    return rec(0, 0);
}

/** C strutil.c pmatchi `:151–155`. */
export function pmatchi(patrn, strng) {
    return pmatch_internal(patrn, strng, true);
}

/**
 * C ref: cmd.c accept_menu_prefix `:3507–3512` — CMD_M_PREFIX.
 * @param {{ flags?: number } | null | undefined} efp
 * @returns {boolean}
 */
function accept_menu_prefix_tab(efp) {
    return !!(efp && ((efp.flags | 0) & CMD_M_PREFIX));
}

/**
 * C ref: cmd.c doc_extcmd_flagstr `:523–557`.
 * efp null → footnote strings; else "" / "[m]" / "[A]" / "[mA]".
 * cmd_from_func(do_reqmenu) visctrl named (m-prefix key is 'm').
 * @param {{ flags?: number } | null} efp
 * @returns {{ footnote: string[] } | { flagstr: string }}
 */
function doc_extcmd_flagstr(efp) {
    if (!efp) {
        return {
            footnote: [
                '[A] Command autocompletes',
                `[m] Command accepts '${visctrl('m')}' prefix`,
            ],
        };
    }
    const mprefix = accept_menu_prefix_tab(efp);
    const autocomplete = ((efp.flags | 0) & AUTOCOMPLETE) !== 0;
    let flagstr = '';
    if (mprefix || autocomplete) {
        flagstr = '[';
        if (mprefix) flagstr += 'm';
        if (autocomplete) flagstr += 'A';
        flagstr += ']';
    }
    return { flagstr };
}

const DOEXTLIST_HEADINGS = [
    'Extended Commands',
    'Debugging Extended Commands',
];

/**
 * C ref: cmd.c doextlist `:560–734` — NHW_MENU PICK_ONE of extcmdlist.
 * Meta rows: 'a' menumode, ':'/'s' search, 'z' wizard onelist.
 * Callers: doextcmd loop (`#?`) and pager.c hmenu_doextlist.
 * Keystroke M('?') is rhack cmdbind_get (D-1643), not this body.
 * @returns {Promise<number>} ECMD_OK
 */
export async function doextlist() {
    const wizard = !!(game.flags?.debug || game.flags?.wizard || game.wizard);
    const discover = !!(game.flags?.explore || game.flags?.discover);
    let menumode = 0;
    let onelist = 0;
    let redisplay = true;
    let search = false;
    let searchbuf = '';

    while (redisplay) {
        redisplay = false;
        const raw = [];
        raw.push({ text: 'Extended Commands List', attr: 0, selectable: false });
        raw.push({ text: '', attr: 0, selectable: false });

        raw.push({
            text: `Switch to ${menumode ? 'including' : 'excluding'} commands that don't autocomplete`,
            attr: 0,
            selectable: true,
            selector: 'a',
            a_int: 1,
        });
        if (!searchbuf) {
            raw.push({
                text: 'Search extended commands',
                attr: 0,
                selectable: true,
                selector: ':',
                gselector: 's',
                a_int: 2,
            });
        } else {
            let back = 'Switch back from search';
            if (back.length + searchbuf.length + ' ("")'.length < QBUFSZ) {
                back += ` ("${searchbuf}")`;
            }
            raw.push({
                text: back,
                attr: 0,
                selectable: true,
                selector: 's',
                gselector: ':',
                a_int: 3,
            });
        }
        if (wizard) {
            raw.push({
                text: onelist
                    ? 'Switch to showing debugging commands in separate section'
                    : 'Switch to showing all alphabetically, including debugging commands',
                attr: 0,
                selectable: true,
                selector: 'z',
                a_int: 4,
            });
        }
        raw.push({ text: '', attr: 0, selectable: false });

        const menushown = [0, 0];
        let n = 0;
        for (let pass = 0; pass <= 1; ++pass) {
            if (pass === 1 && (onelist || !wizard)) break;
            for (const efp of EXTCMDLIST) {
                if (!efp?.txt) continue;
                if (((efp.flags | 0) & (CMD_NOT_AVAILABLE | INTERNALCMD)) !== 0) {
                    continue;
                }
                if (menumode === 1 && ((efp.flags | 0) & AUTOCOMPLETE) === 0) {
                    continue;
                }
                const wizc = ((efp.flags | 0) & WIZMODECMD) !== 0 ? 1 : 0;
                if (wizc && !wizard) continue;
                if (!onelist && pass !== wizc) continue;
                let cmd_desc = efp.desc || '';
                if (!wizard && !discover
                    && ((efp.flags | 0) & GENERALCMD) !== 0
                    && strstri(cmd_desc, 'extinct')) {
                    cmd_desc = strsubst(
                        cmd_desc,
                        ' been genocided or become extinct',
                        ' been genocided',
                    );
                }
                if (searchbuf
                    && !strstri(efp.txt, searchbuf)
                    && !strstri(cmd_desc, searchbuf)
                    && !pmatchi(searchbuf, efp.txt)
                    && !pmatchi(searchbuf, cmd_desc)) {
                    continue;
                }
                if (!menushown[pass]) {
                    raw.push({
                        text: DOEXTLIST_HEADINGS[pass],
                        attr: ATR_INVERSE,
                        selectable: false,
                    });
                    menushown[pass] = 1;
                }
                const flagstr = doc_extcmd_flagstr(efp).flagstr || '';
                const line = ` ${String(efp.txt).padEnd(14)} ${flagstr.padStart(4)} ${cmd_desc}`;
                raw.push({ text: line, attr: 0, selectable: false });
                ++n;
            }
            if (n) raw.push({ text: '', attr: 0, selectable: false });
        }
        if (searchbuf && !n) {
            raw.push({ text: 'no matches', attr: 0, selectable: false });
        } else {
            for (const line of doc_extcmd_flagstr(null).footnote) {
                raw.push({ text: line, attr: 0, selectable: false });
            }
        }

        const picked = await select_menu_pick_one(raw);
        if (picked.kind === 'pick' && (picked.item?.a_int | 0) > 0) {
            switch (picked.item.a_int | 0) {
            case 1:
                menumode = 1 - menumode;
                redisplay = true;
                break;
            case 2:
                search = true;
                break;
            case 3:
                search = false;
                searchbuf = '';
                redisplay = true;
                break;
            case 4:
                search = false;
                searchbuf = '';
                onelist = 1 - onelist;
                redisplay = true;
                break;
            }
        } else {
            search = false;
            searchbuf = '';
        }
        if (search) {
            let phrase = await getlin('Extended command list search phrase?');
            if (phrase === '\x1b') phrase = '';
            else phrase = mungspaces(phrase);
            if (phrase) {
                searchbuf = phrase;
                redisplay = true;
            }
            search = false;
        }
    }
    return ECMD_OK;
}

/**
 * C rhack do_cmdq_extcmd: can_do_extcmd then ef_funct. Failure
 * reset_cmd_vars(TRUE) drops leftover CQ_CANNED keys.
 * @param {{ typ: number, txt: string, run: () => Promise<number> }} cq
 * @returns {Promise<number>}
 */
async function run_cmdq_extcmd(cq) {
    const tab = ext_func_tab_from_txt(cq.txt);
    if (!tab || !(await can_do_extcmd(tab))) {
        cmdq_clear();
        return ECMD_OK;
    }
    return (await cq.run()) | 0;
}

/**
 * User BIND=/BINDINGS= overlay occupies this key (including "nothing").
 * C rhack `:3678` cmdbind_get is first; JS if/else is the default table.
 * Overlay must skip that if/else (D-1657; D-0897 was inventory-only).
 * Movement keys still take the walk arm first (named). Default
 * cmdbind_get without overlay is D-1643. CMD_PARAM named.
 * @param {number} key
 * @returns {boolean}
 */
function rhack_user_overlay_key(key) {
    const overlay = game.Cmd?.binds;
    return overlay instanceof Map && overlay.has(key & 0xff);
}

/**
 * C rhack `:3678–3828` tlist path: cmdbind_get then can_do_extcmd /
 * prefix gate / REPEAT / ef_funct / PREFIXCMD / ECMD_TIME.
 * Used for keys the if/else does not handle (default M('?') → doextlist,
 * other meta binds with a live EXT_CMDS runner) and for user BIND=
 * overlay on if/else keys (D-1657). MOVEMENTCMD walk/rush still the
 * early isMovementKey / isRunKey arms unless BIND= owns the key (run
 * keys sit after overlay). No runner → skip so Unknown command still
 * fires.
 * @param {number} key
 * @param {typeof EXTCMDLIST[number] | null} prefix_seen
 * @param {boolean} was_m_prefix
 * @returns {Promise<{ done?: boolean, prefix?: typeof EXTCMDLIST[number] }>}
 */
async function rhack_dispatch_bound(key, prefix_seen, was_m_prefix) {
    const tlist = cmdbind_get(key);
    if (!tlist) return {};
    const run = extcmd_run_by_txt(tlist.txt);
    if (!run) return {};

    if (!(await can_do_extcmd(tlist))) {
        reset_cmd_vars(true);
        return { done: true };
    }

    if (prefix_seen && !(tlist.flags & PREFIXCMD)
        && !(tlist.flags & (was_m_prefix ? CMD_M_PREFIX : CMD_gGF_PREFIX))) {
        const which = prefix_seen.txt === 'reqmenu'
            ? visctrl('m'.charCodeAt(0))
            : (prefix_seen.txt || '?');
        if (was_m_prefix) {
            await pline(
                `The ${tlist.txt} command does not accept '${which}' prefix.`,
            );
        } else {
            const ch = tlist.key | 0;
            const upDown = ch === 60 || ch === 62
                || tlist.txt === 'up' || tlist.txt === 'down';
            await pline(
                `The '${which}' prefix should be followed by a movement command${
                    upDown ? ' other than up or down' : ''}.`,
            );
        }
        reset_cmd_vars(true);
        return { done: true };
    }

    if (tlist.f_text && !game.occupation && (game.multi | 0)) {
        set_occupation(run, tlist.f_text, game.multi);
    }

    if (!game.in_doagain && tlist.txt !== '#' && tlist.txt !== 'repeat') {
        if (!prefix_seen) cmdq_clear(CQ_REPEAT);
        cmdq_add_ec(CQ_REPEAT, run, tlist);
    } else if (!game.in_doagain && tlist.txt === '#') {
        cmdq_clear(CQ_REPEAT);
    }

    rhack_cmd_insane(tlist.flags);

    const res = (await run()) | 0;

    if (tlist.txt === '#' && game.ext_tlist) {
        const extTab = game.ext_tlist;
        game.ext_tlist = null;
        cmdq_add_ec(CQ_REPEAT, extTab.run, extTab);
        cmdq_shift(CQ_REPEAT);
    }

    if ((tlist.flags & PREFIXCMD) !== 0) {
        if ((res & ECMD_CANCEL) !== 0) {
            reset_cmd_vars(true);
            return { done: true };
        }
        return { prefix: tlist };
    }

    if ((res & (ECMD_CANCEL | ECMD_FAIL)) !== 0) {
        reset_cmd_vars(true);
    } else if ((res & ECMD_TIME) === 0) {
        reset_cmd_vars((game.multi | 0) < 0);
    }
    if ((res & ECMD_TIME) !== 0) {
        if (!game.context) game.context = {};
        game.context.move = 1;
        if (tlist.txt !== 'kick') game.kickedloc = { x: 0, y: 0 };
    }
    return { done: true };
}

/* C ref: cmd.c enum menucmd — [t]herecmdmenu action ids */
const MCMD_NOTHING = 0;
const MCMD_QUAFF = 15;
const MCMD_DIP = 16;
const MCMD_SIT = 17;
const MCMD_UP = 18;
const MCMD_DOWN = 19;
const MCMD_DISMOUNT = 20;
const MCMD_MONABILITY = 21;
const MCMD_PICKUP = 22;
const MCMD_LOOT = 23;
const MCMD_TIP = 24;
const MCMD_EAT = 25;
const MCMD_DROP = 26;
const MCMD_REST = 27;
const MCMD_LOOK_HERE = 28;
const MCMD_LOOK_AT = 29;
const MCMD_UNTRAP_HERE = 31;
const MCMD_OFFER = 32;
const MCMD_INVENTORY = 33;
const MCMD_CAST_SPELL = 34;
const MCMD_SEARCH = 6;

/**
 * C ref: cmd.c act_on_act — self / here actions (queue CQ_CANNED).
 * Named omissions: next2u/far arms; CMDQ_KEY/DIR follow-ups for tip/eat/
 * dip/offer (caller still queues the ec; yn/getobj consume interactively).
 */
function act_on_act_here(act) {
    switch (act) {
    case MCMD_QUAFF: cmdq_add_ec(CQ_CANNED, dodrink); break;
    case MCMD_DIP: cmdq_add_ec(CQ_CANNED, async () => {
        const { dodip } = await import('./potion.js');
        return dodip();
    }); break;
    case MCMD_SIT: cmdq_add_ec(CQ_CANNED, async () => {
        const { dosit } = await import('./sit.js');
        return dosit();
    }); break;
    case MCMD_UP: cmdq_add_ec(CQ_CANNED, doup); break;
    case MCMD_DOWN: cmdq_add_ec(CQ_CANNED, dodown); break;
    case MCMD_DISMOUNT: cmdq_add_ec(CQ_CANNED, async () => {
        const { doride } = await import('./steed.js');
        return doride();
    }); break;
    case MCMD_MONABILITY: cmdq_add_ec(CQ_CANNED, async () => {
        const { domonability } = await import('./polyself.js');
        return domonability();
    }); break;
    case MCMD_PICKUP: cmdq_add_ec(CQ_CANNED, dopickup); break;
    case MCMD_LOOT: cmdq_add_ec(CQ_CANNED, doloot); break;
    case MCMD_TIP: cmdq_add_ec(CQ_CANNED, dotip); break;
    case MCMD_EAT: cmdq_add_ec(CQ_CANNED, doeat); break;
    case MCMD_DROP: cmdq_add_ec(CQ_CANNED, dodrop); break;
    case MCMD_INVENTORY: cmdq_add_ec(CQ_CANNED, ddoinv); break;
    case MCMD_REST: cmdq_add_ec(CQ_CANNED, donull); break;
    case MCMD_SEARCH: cmdq_add_ec(CQ_CANNED, dosearch); break;
    case MCMD_LOOK_HERE: cmdq_add_ec(CQ_CANNED, dolook); break;
    case MCMD_UNTRAP_HERE: cmdq_add_ec(CQ_CANNED, async () => {
        const { dountrap } = await import('./trap.js');
        return dountrap();
    }); break;
    case MCMD_OFFER: cmdq_add_ec(CQ_CANNED, async () => {
        const { dosacrifice } = await import('./pray.js');
        return dosacrifice();
    }); break;
    case MCMD_CAST_SPELL: cmdq_add_ec(CQ_CANNED, docast); break;
    case MCMD_LOOK_AT:
        // C: doclicklook via clicklook_cc — deferred with therecmdmenu
        break;
    default:
        break;
    }
}

/**
 * C ref: cmd.c there_cmd_menu_self — entries when targeting hero cell.
 * @returns {{act:number, text:string}[]}
 */
function there_cmd_menu_self_items(x, y) {
    const items = [];
    const u = game.u;
    if (!u || (u.ux | 0) !== (x | 0) || (u.uy | 0) !== (y | 0)) return items;

    const loc = game.level?.at(x, y);
    const typ = loc?.typ | 0;

    if ((IS_FOUNTAIN(typ) || IS_SINK(typ)) && can_reach_floor(false)) {
        const feat = IS_FOUNTAIN(typ) ? 'fountain' : 'sink';
        items.push({ act: MCMD_QUAFF, text: `Drink from the ${feat}` });
    }
    if (IS_FOUNTAIN(typ) && can_reach_floor(false)) {
        items.push({ act: MCMD_DIP, text: 'Dip something into the fountain' });
    }
    if (IS_THRONE(typ)) {
        items.push({ act: MCMD_SIT, text: 'Sit on the throne' });
    }
    if (IS_ALTAR(typ)) {
        items.push({ act: MCMD_OFFER, text: 'Sacrifice something on the altar' });
    }

    const stway = stairway_at(x, y);
    if (stway?.up) {
        items.push({
            act: MCMD_UP,
            text: `Go up the ${stway.isladder ? 'ladder' : 'stairs'}`,
        });
    }
    if (stway && !stway.up) {
        items.push({
            act: MCMD_DOWN,
            text: `Go down the ${stway.isladder ? 'ladder' : 'stairs'}`,
        });
    }
    // C: u.usteed dismount — named omission: x_monnam SUPPRESS_SADDLE polish
    if (u.usteed) {
        items.push({ act: MCMD_DISMOUNT, text: 'Dismount your steed' });
    }

    const otmp = objects_at(x, y);
    if (otmp) {
        items.push({
            act: MCMD_PICKUP,
            text: `Pick up ${otmp.nexthere ? 'items' : doname(otmp)}`,
        });
        if (Is_container(otmp)) {
            items.push({ act: MCMD_LOOT, text: `Loot ${doname(otmp)}` });
            items.push({ act: MCMD_TIP, text: `Tip ${doname(otmp)}` });
        }
        if ((otmp.oclass | 0) === FOOD_CLASS) {
            items.push({ act: MCMD_EAT, text: `Eat ${doname(otmp)}` });
        }
    }

    if (game.invent) {
        items.push({ act: MCMD_INVENTORY, text: 'Inventory' });
        items.push({ act: MCMD_DROP, text: 'Drop items' });
    }
    items.push({ act: MCMD_REST, text: 'Rest one turn' });
    items.push({ act: MCMD_SEARCH, text: 'Search around you' });
    items.push({ act: MCMD_LOOK_HERE, text: 'Look at what is here' });

    if (num_spells() > 0) {
        items.push({ act: MCMD_CAST_SPELL, text: 'Cast a spell' });
    }

    const ttmp = travel_t_at(x, y);
    if (ttmp && ttmp.tseen && (ttmp.ttyp | 0) !== VIBRATING_SQUARE) {
        items.push({ act: MCMD_UNTRAP_HERE, text: 'Attempt to disarm trap' });
    }
    return items;
}

/**
 * C ref: cmd.c there_cmd_menu_common — "Look at map symbol" for self when
 * Upolyd (glyph≠hero_glyph / steed arms deferred).
 */
function there_cmd_menu_common_items(x, y, mod) {
    const items = [];
    if (mod !== CLICK_1 && mod !== 2 /* CLICK_2 */) return items;
    const u = game.u;
    const atSelf = u && (u.ux | 0) === (x | 0) && (u.uy | 0) === (y | 0);
    // C: !u_at || Upolyd || glyph_at != hero_glyph
    if (!atSelf || Upolyd(u)) {
        items.push({ act: MCMD_LOOK_AT, text: 'Look at map symbol' });
    }
    return items;
}

/**
 * C ref: cmd.c there_cmd_menu — NHW_MENU "What do you want to do?"
 * Ported: u_at self path + common. Named omissions: next2u / far /
 * K==0 travel/move fallback; K==1 auto-act without menu.
 * @returns {Promise<string>} '\0' after act / ESC cancel (C ch)
 */
async function there_cmd_menu(x, y, mod) {
    let items = [];
    const u = game.u;
    const atSelf = u && (u.ux | 0) === (x | 0) && (u.uy | 0) === (y | 0);
    if (atSelf) {
        items = items.concat(there_cmd_menu_self_items(x, y));
    }
    // next2u / far deferred
    items = items.concat(there_cmd_menu_common_items(x, y, mod));

    if (!items.length) return '\0';

    const raw = [
        { text: 'What do you want to do?', attr: ATR_INVERSE, selectable: false },
        { text: '', attr: 0, selectable: false },
        ...items.map((it) => ({
            text: it.text,
            attr: 0,
            selectable: true,
            act: it.act,
        })),
    ];
    const res = await select_menu_pick_one(raw);
    if (res.kind !== 'pick' || res.item?.act == null) return '\x1b';
    act_on_act_here(res.item.act | 0);
    return '\0';
}

/**
 * C ref: cmd.c here_cmd_menu — always returns '\0' (discards there_cmd_menu ch).
 */
async function here_cmd_menu() {
    const u = game.u;
    if (!u) return '\0';
    await there_cmd_menu(u.ux | 0, u.uy | 0, CLICK_1);
    return '\0';
}

/**
 * C ref: cmd.c doherecmdmenu — #herecmdmenu.
 * here_cmd_menu always returns '\0' → always ECMD_OK; actions via CQ_CANNED.
 * C `(ch && ch != '\033')`: NUL is falsy — do not treat JS '\0' as TIME.
 * @returns {Promise<number>} ECMD_*
 */
export async function doherecmdmenu() {
    const ch = await here_cmd_menu();
    if (!ch || ch === '\0' || ch === '\x1b') return ECMD_OK;
    return ECMD_TIME;
}


// Direction deltas: y u k
//                   h . l
//                   b j n
const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };

function isMovementKey(ch) {
    return 'hjklyubn'.includes(ch);
}

function isRunKey(ch) {
    return 'HJKLYUBN'.includes(ch);
}

/** C ref: cmd.c reset_commands — C(dirchars[i]) → do_rush_* (!number_pad). */
function rushDirFromCtrl(key) {
    // Only real Ctrl-A..Ctrl-Z codes (1..26). Plain 'j' (106) must not match:
    // (106 & 0x1f)+96 === 'j'. C('j')==10=='\n' is rush-south.
    if (key < 1 || key > 26) return null;
    const letter = String.fromCharCode(key + 96); // 1..26 → a..z
    if (!isMovementKey(letter)) return null;
    return letter;
}

// C ref: hack.c — check if a cell blocks movement
// C test_move: IS_OBSTRUCTED(typ) || typ == IRONBARS (plus closed doors),
// except IRONBARS when Passes_walls || passes_bars(youmonst.data) (D-1270).
// IS_OBSTRUCTED covers STONE..SCORR including TREE/SDOOR/SCORR (typ < POOL).
function blocksMove(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    if (IS_OBSTRUCTED(loc.typ)) return true;
    if (loc.typ === IRONBARS && !test_move_hero_passes_bars()) return true;
    if (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) return true;
    return false;
}

function closed_door_at(x, y) {
    const loc = game.level?.at(x, y);
    return !!(loc && loc.typ === DOOR
        && (loc.doormask & (D_CLOSED | D_LOCKED)));
}

/**
 * C ref: hack.c findtravelpath :1403–1407 — closed doors and boulders on the
 * CURRENT cell usually cause a delay (prefer another path), not a block:
 * (!Passes_walls && !can_ooze(youmonst) && closed_door(x,y)) ||
 * (sobj_at(BOULDER,x,y) && !could_move_onto_boulder(x,y)).
 * The TEST_TRAP third arm (seen trap / known liquid on the target) rides at
 * the call site via travel_avoids_cell gated on run==8; TEST_TRAV still
 * rejects those cells after the delay expires, matching C.
 */
function travel_delay_current(x, y) {
    if (!Passes_walls_prop() && !can_ooze(game.youmonst)
        && closed_door_at(x, y)) return true;
    if (boulder_at(x, y) && !could_move_onto_boulder(x, y)) return true;
    return false;
}

/** Local t_at — avoid cmd.js ↔ trap.js cycle. */
function travel_t_at(x, y) {
    const traps = game.level?.traps;
    if (!traps) return null;
    for (const t of traps) {
        if (t && (t.tx | 0) === (x | 0) && (t.ty | 0) === (y | 0)) return t;
    }
    return null;
}

/**
 * C ref: hack.c test_move TEST_TRAV + run==8 — travel path avoids seen traps
 * and known pool/lava (except hero cell). VIBRATING_SQUARE allowed.
 * Named omissions: Known_wwalking / Known_lwalking / WATERWALL / LAVAWALL.
 */
function travel_avoids_cell(x, y) {
    const u = game.u;
    if (u && (x | 0) === (u.ux | 0) && (y | 0) === (u.uy | 0)) return false;
    const t = travel_t_at(x, y);
    if (t && t.tseen && (t.ttyp | 0) !== VIBRATING_SQUARE) return true;
    const loc = game.level?.at(x, y);
    if (loc?.seenv && (is_pool(x, y) || is_lava(x, y))) {
        const fly = !!(u?.Flying || u?.HFlying || u?.EFlying
            || u?.Levitation || u?.HLevitation || u?.ELevitation);
        if (!fly) return true;
    }
    return false;
}

/**
 * C ref: hack.c test_move — diagonal through bad_rock flanks needs
 * cant_squeeze_thru (load / bigmonst / Sokoban). worm_cross deferred.
 */
function travel_blocks_tight_diag(ux, uy, nx, ny) {
    const dx = (nx - ux) | 0;
    const dy = (ny - uy) | 0;
    if (!dx || !dy) return false;
    const ym = game.youmonst;
    if (!ym?.data) return false;
    if (!bad_rock(ym.data, ux, ny) || !bad_rock(ym.data, nx, uy)) return false;
    return cant_squeeze_thru(ym) !== 0;
}

// C ref: hack.c doorless_door — only D_NODOOR / D_BROKEN (no intact door)
function doorless_door(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    // Rogue-level override deferred (all rogue doors treated as present)
    return !((loc.doormask || 0) & ~(D_NODOOR | D_BROKEN));
}

// C ref: shk.c block_door — shopkeeper blocks diagonal shop exit.
// Stub false until shop ushops / ESHK wired for this path.
function block_door(_x, _y) {
    return false;
}

/**
 * C ref: hack.c test_move DO_MOVE + flags.mention_walls on IS_OBSTRUCTED.
 * Uses defsyms[].explanation via an(); S_stone → "solid stone".
 * C: pline_dir(xytodir(dx,dy), "It's %s.", buf) (D-1216).
 * Deferred: Blind feel_location, Passes_walls/may_passwall on rock,
 * Underwater, tunnels/still_chewing rock, autodig, is_db_wall, Sokoban
 * resist, full back_to_glyph/wall_angle→S_stone edge cases.
 * IRONBARS pass/chew is D-1270 (blocksMove / still_chewing, not here).
 * run>=2 boulder pline_dir is D-1226 (test_move, not this bump).
 * OOB / testdiag doorway / run-into-trap-or-liquid mention_walls is D-1800.
 */
async function mention_walls_obstructed(x, y) {
    if (!game.flags?.mention_walls) return;
    const loc = game.level?.at(x, y);
    if (!loc) return;
    if (loc.typ === IRONBARS) {
        await pline('You cannot pass through the bars.');
        return;
    }
    let buf;
    // C: glyph = back_to_glyph; sym==S_stone → "solid stone"; else an(explanation)
    if (loc.typ === TREE || (IS_TREE(loc.typ) && loc.typ !== STONE)) {
        buf = an('tree');
    } else if ((IS_WALL(loc.typ) || loc.typ === SDOOR) && loc.seenv) {
        buf = an('wall');
    } else {
        // STONE / SCORR / unseen wall (wall_angle→S_stone) / other rock
        buf = 'solid stone';
    }
    const u = game.u || {};
    const dx = ((x | 0) - (u.ux | 0)) | 0;
    const dy = ((y | 0) - (u.uy | 0)) | 0;
    await pline_dir(xytodir(dx, dy), `It's ${buf}.`);
}

/**
 * C ref: hack.c domove_fight_empty — F into empty/solid, or remembered 'I'
 * with no monster and !nopick, wastes a turn.
 * Always unmap_object (not only for 'I') so stale object memory becomes
 * background — matching C before the thin-air / obstacle message.
 * Upolyd AT_EXPL: futilely/explode-at wording then wake_nearto, explum(null),
 * mh=-1, rehumanize (D-1265). Named omissions: boulder/statue dig with pick;
 * Underwater; Hallu monster-as-statue; ansimpleoname boulder wording.
 */
export async function domove_fight_empty(x, y) {
    const offEdge = !isok(x, y);
    const loc = (!offEdge && game.level?.at(x, y)) || null;
    let boulder = null;
    if (!offEdge && loc) {
        const mem = loc.remembered_glyph;
        // C: glyph_is_statue(glyph) → sobj_at(STATUE); also live BOULDER
        const looksStatue = !!(mem && mem.ch === '`');
        if (looksStatue) {
            const top = objects_at(x, y);
            if (top && (top.otyp | 0) === STATUE_OTYP) boulder = top;
        }
        if (!boulder) {
            for (let p = objects_at(x, y); p; p = p.nexthere) {
                if ((p.otyp | 0) === BOULDER_OTYP) { boulder = p; break; }
            }
        }
        // C: unmap_object then map_object(boulder,TRUE) then newsym
        unmap_object(x, y);
        if (boulder) map_object(boulder, true);
        newsym(x, y);
    }
    const solid = offEdge
        || !loc
        || !ACCESSIBLE(loc.typ)
        || IS_FURNITURE(loc.typ);
    let target;
    if (offEdge) {
        target = 'an unknown obstacle';
    } else if (boulder) {
        target = 'a boulder'; // ansimpleoname deferred
    } else if (solid) {
        if (loc && (loc.seenv || IS_STWALL(loc.typ))) {
            target = IS_STWALL(loc.typ) || loc.typ === STONE
                ? 'the wall' : 'an unknown obstacle';
        } else {
            target = 'an unknown obstacle';
        }
    } else {
        target = 'thin air';
    }
    const explo = Upolyd(game.u)
        && !!attacktype_fordmg(game.youmonst?.data, AT_EXPL, -1);
    /* C: !(boulder || solid) ? "" : !explo ? "harmlessly " : "futilely " */
    const prefix = !(boulder || solid) ? '' : !explo ? 'harmlessly ' : 'futilely ';
    const verb = explo ? 'explode at' : 'attack';
    await pline(`You ${prefix}${verb} ${target}.`);
    nomul(0);
    if (explo) {
        const attk = attacktype_fordmg(game.youmonst?.data, AT_EXPL, -1);
        const u = game.u || {};
        /* no monster has been attacked so we have bypassed explum() */
        await wake_nearto(u.ux | 0, u.uy | 0, 7 * 7);
        if (attk) await explum(null, attk);
        u.mh = -1; /* dead in the current form */
        await rehumanize();
    }
    return true;
}

/**
 * C ref: hack.c lookaround()
 * Blind / traps / pools / NODIAG / lookaround mention_walls plines deferred
 * (obstructed bump mention_walls is D-0354).
 */
function lookaround() {
    const ctx = game.context;
    const u = game.u;
    // C: Blind || run==0 → return (Blind path deferred — still gate run==0)
    if (!ctx?.run) return;

    let corrct = 0;
    let noturn = 0;
    let x0 = 0;
    let y0 = 0;
    let m0 = 1;
    let i0 = 9;

    for (let x = u.ux - 1; x <= u.ux + 1; x++) {
        for (let y = u.uy - 1; y <= u.uy + 1; y++) {
            const infront = (x === u.ux + (u.dx || 0) && y === u.uy + (u.dy || 0));
            if (!isok(x, y) || (x === u.ux && y === u.uy)) continue;

            const mtmp = mon_at(x, y);
            // C: only stop for mon_visible (not M_AP furniture/object).
            // Invisible hostiles must not end a run — hero walks in and
            // attack_checks prints Wait! (D-0705 seed0014 yank More).
            if (mtmp
                && M_AP_TYPE(mtmp) !== M_AP_FURNITURE
                && M_AP_TYPE(mtmp) !== M_AP_OBJECT
                && mon_visible(mtmp)) {
                if ((ctx.run !== 1 && !is_safemon(mtmp))
                    || (infront && !ctx.travel)) {
                    end_running(true);
                    return;
                }
            }

            const loc = game.level?.at(x, y);
            const typ = loc?.typ ?? STONE;
            if (typ === STONE) continue;
            if (x === u.ux - (u.dx || 0) && y === u.uy - (u.dy || 0)) continue;

            // traps deferred (avoid_moving_on_trap)

            if (IS_OBSTRUCTED(typ) || typ === ROOM) {
                continue;
            }

            let asCorr = false;
            if (closed_door_at(x, y)) {
                if (x !== u.ux && y !== u.uy) continue;
                if (ctx.run !== 1 && !ctx.travel) {
                    end_running(true);
                    return;
                }
                asCorr = true; // bcorr
            } else if (typ === CORR) {
                asCorr = true;
            } else {
                // pool/lava/objects/stairs: run==1 → bcorr; run==8 continue; else stop
                if (ctx.run === 1) asCorr = true;
                else if (ctx.run === 8) continue;
                else {
                    end_running(true);
                    return;
                }
            }

            if (asCorr) {
                const here = game.level?.at(u.ux, u.uy);
                if (here && here.typ !== ROOM) {
                    if (ctx.run === 1 || ctx.run === 3 || ctx.run === 8) {
                        const i = dist2(x, y, u.ux + (u.dx || 0), u.uy + (u.dy || 0));
                        if (i > 2) continue;
                        if (corrct === 1 && dist2(x, y, x0, y0) !== 1) noturn = 1;
                        if (i < i0) {
                            i0 = i;
                            x0 = x;
                            y0 = y;
                            m0 = mtmp ? 1 : 0;
                        }
                    }
                    corrct++;
                }
            }
        }
    }

    if (corrct > 1 && ctx.run === 2) {
        end_running(true);
        return;
    }

    if ((ctx.run === 1 || ctx.run === 3 || ctx.run === 8)
        && !noturn && !m0 && i0
        && (corrct === 1 || (corrct === 2 && i0 === 1))) {
        let turn;
        if (i0 === 2) {
            turn = ((u.dx || 0) === y0 - u.uy && (u.dy || 0) === u.ux - x0) ? 2 : -2;
        } else if ((u.dx || 0) && (u.dy || 0)) {
            turn = (((u.dx || 0) === (u.dy || 0) && y0 === u.uy)
                || ((u.dx || 0) !== (u.dy || 0) && y0 !== u.uy)) ? -1 : 1;
        } else {
            turn = ((x0 - u.ux === y0 - u.uy && !(u.dy || 0))
                || (x0 - u.ux !== y0 - u.uy && (u.dy || 0))) ? 1 : -1;
        }
        turn += (u.last_str_turn || 0);
        if (turn <= 2 && turn >= -2) {
            u.last_str_turn = turn;
            u.dx = x0 - u.ux;
            u.dy = y0 - u.uy;
        }
    }
}

/** C cmd.c u_at — hero cell. */
function look_u_at(x, y) {
    const u = game.u || {};
    return (u.ux | 0) === (x | 0) && (u.uy | 0) === (y | 0);
}

/**
 * C selvar.c selection_new — Set-backed COLNO×ROWNO; empty bounds lx=COLNO.
 * Local to cmd.c dolookaround (mklev.js Lua floodfill stays matchTyp).
 */
function look_sel_new() {
    return { pts: new Set(), lx: COLNO, ly: ROWNO, hx: 0, hy: 0 };
}

function look_sel_getpoint(x, y, sel) {
    if (!sel || x < 0 || y < 0 || x >= COLNO || y >= ROWNO) return 0;
    return sel.pts.has(`${x},${y}`) ? 1 : 0;
}

function look_sel_setpoint(x, y, sel, c) {
    if (!sel || x < 0 || y < 0 || x >= COLNO || y >= ROWNO) return;
    const key = `${x},${y}`;
    if (c) {
        sel.pts.add(key);
        if (x < sel.lx) sel.lx = x;
        if (y < sel.ly) sel.ly = y;
        if (x > sel.hx) sel.hx = x;
        if (y > sel.hy) sel.hy = y;
    } else {
        sel.pts.delete(key);
    }
}

/** C selvar.c selection_getbounds — empty lx>=COLNO → full map. */
function look_sel_bounds(sel) {
    if (!sel || sel.lx >= COLNO) {
        return { lx: 0, ly: 0, hx: COLNO - 1, hy: ROWNO - 1 };
    }
    return { lx: sel.lx, ly: sel.ly, hx: sel.hx, hy: sel.hy };
}

/**
 * C cmd.c dolookaround_floodfill_findroom — stop at wall/door/tree/bars/
 * waterwall/lavawall/scorr/sdoor/DRAWBRIDGE_UP. CORR and ROOM pass.
 */
function dolookaround_floodfill_findroom(x, y) {
    const loc = game.level?.at?.(x, y);
    const typ = loc?.typ | 0;
    if (IS_STWALL(typ) || IS_DOOR(typ) || IS_TREE(typ)
        || IS_WATERWALL(typ) || typ === LAVAWALL || typ === IRONBARS
        || typ === SCORR || typ === SDOOR || typ === DRAWBRIDGE_UP) {
        return false;
    }
    return true;
}

/**
 * C selvar.c selection_floodfill + set_selection_floodfillchk.
 * Seed is always included; neighbors need check_func.
 */
function look_sel_floodfill(ov, x0, y0, diagonals, check_func) {
    if (!ov || typeof check_func !== 'function') return;
    const tmp = look_sel_new();
    const stackX = [];
    const stackY = [];
    const queued = new Set();
    const enqueue = (nx, ny) => {
        if (!isok(nx, ny)) return;
        const key = `${nx},${ny}`;
        if (queued.has(key) || look_sel_getpoint(nx, ny, tmp)) return;
        if (!check_func(nx, ny)) return;
        queued.add(key);
        stackX.push(nx);
        stackY.push(ny);
    };
    // C: SEL_FLOOD seed without check_func
    queued.add(`${x0},${y0}`);
    stackX.push(x0);
    stackY.push(y0);
    while (stackX.length) {
        const x = stackX.pop();
        const y = stackY.pop();
        if (isok(x, y)) {
            look_sel_setpoint(x, y, ov, 1);
            look_sel_setpoint(x, y, tmp, 1);
        }
        enqueue(x + 1, y);
        enqueue(x - 1, y);
        enqueue(x, y + 1);
        enqueue(x, y - 1);
        if (diagonals) {
            enqueue(x + 1, y + 1);
            enqueue(x - 1, y - 1);
            enqueue(x - 1, y + 1);
            enqueue(x + 1, y - 1);
        }
    }
}

/** C display.h glyph_is_unexplored — blank !seenv. Integer glyph IDs named. */
function look_glyph_unexplored_at(x, y) {
    if (!isok(x, y)) return false;
    const loc = game.level?.at?.(x, y);
    if (!loc) return true;
    if (loc.seenv | 0) return false;
    const ch = loc.disp_ch;
    return !ch || ch === ' ' || ch === '';
}

/** C cmd.c u_have_seen_whole_selection. */
function u_have_seen_whole_selection(sel) {
    const rect = look_sel_bounds(sel);
    for (let x = rect.lx; x <= rect.hx; x++) {
        for (let y = rect.ly; y <= rect.hy; y++) {
            if (isok(x, y) && look_sel_getpoint(x, y, sel)
                && look_glyph_unexplored_at(x, y)) {
                return false;
            }
        }
    }
    return true;
}

/** C cmd.c u_have_seen_bounds_selection — rectangular outline only. */
function u_have_seen_bounds_selection(sel) {
    const rect = look_sel_bounds(sel);
    for (let x = rect.lx; x <= rect.hx; x++) {
        let y = rect.ly;
        if (isok(x, y) && look_sel_getpoint(x, y, sel)
            && look_glyph_unexplored_at(x, y)) {
            return false;
        }
        y = rect.hy;
        if (isok(x, y) && look_sel_getpoint(x, y, sel)
            && look_glyph_unexplored_at(x, y)) {
            return false;
        }
    }
    for (let y = rect.ly; y <= rect.hy; y++) {
        let x = rect.lx;
        if (isok(x, y) && look_sel_getpoint(x, y, sel)
            && look_glyph_unexplored_at(x, y)) {
            return false;
        }
        x = rect.hx;
        if (isok(x, y) && look_sel_getpoint(x, y, sel)
            && look_glyph_unexplored_at(x, y)) {
            return false;
        }
    }
    return true;
}

/** C cmd.c u_can_see_whole_selection. */
function u_can_see_whole_selection(sel) {
    const rect = look_sel_bounds(sel);
    for (let x = rect.lx; x <= rect.hx; x++) {
        for (let y = rect.ly; y <= rect.hy; y++) {
            if (isok(x, y) && look_sel_getpoint(x, y, sel) && !cansee(x, y)) {
                return false;
            }
        }
    }
    return true;
}

/** C selvar.c selection_is_irregular — hole in the bounding rect. */
function look_sel_is_irregular(sel) {
    const rect = look_sel_bounds(sel);
    for (let x = rect.lx; x <= rect.hx; x++) {
        for (let y = rect.ly; y <= rect.hy; y++) {
            if (isok(x, y) && !look_sel_getpoint(x, y, sel)) return true;
        }
    }
    return false;
}

/** C selvar.c selection_size_description. */
function look_sel_size_description(sel) {
    const rect = look_sel_bounds(sel);
    const dx = (rect.hx - rect.lx + 1) | 0;
    const dy = (rect.hy - rect.ly + 1) | 0;
    const shape = look_sel_is_irregular(sel)
        ? 'irregularly shaped'
        : (dx === dy) ? 'square' : 'rectangular';
    return `${shape} ${dx} by ${dy}`;
}

/**
 * C cmd.c lookaround_known_room. u.urooms[0] even when describing an
 * adjacent doorway room (C quirk). Corridor-goes-to TODO named.
 */
async function lookaround_known_room(x, y) {
    const sel = look_sel_new();
    const rooms = game.u?.urooms || '';
    const rmno = rooms.length
        ? (rooms.charCodeAt(0) - ROOMOFFSET)
        : -ROOMOFFSET;
    look_sel_floodfill(sel, x, y, true, dolookaround_floodfill_findroom);
    if (!look_u_at(x, y)) set_msg_xy(x, y);
    const where = look_u_at(x, y) ? 'this' : 'that';
    const kind = rmno >= 0 ? 'room' : 'area';
    if (u_have_seen_whole_selection(sel)) {
        const u_in = !!look_sel_getpoint(x, y, sel);
        const verb = (look_u_at(x, y) && u_in && u_can_see_whole_selection(sel))
            ? 'are in'
            : look_u_at(x, y) ? 'remember this as' : 'remember that as';
        await pline(`You ${verb} ${an(look_sel_size_description(sel))} ${kind}.`);
    } else if (u_have_seen_bounds_selection(sel)) {
        await pline(
            `You guess ${where} to be ${an(look_sel_size_description(sel))} ${kind}.`,
        );
    } else {
        await pline(`You can't guess the size of ${where} area.`);
    }
}

/**
 * C cmd.c shown corridor cmap for corr_next2u — glyph_is_cmap S_corr /
 * S_litcorr. S_engrcorr is GLOC_INTERESTING, not this arm.
 */
function shown_corr_cmap(x, y) {
    if (look_shown_at(x, y)) return false;
    const loc = game.level?.at?.(x, y);
    if (!loc || (loc.typ | 0) !== CORR) return false;
    const ep = engr_at(x, y);
    if (ep?.erevealed) return false;
    const ch = loc.disp_ch;
    if (!ch || ch === ' ' || ch === '') return false;
    return ch === '#';
}

/**
 * C cmd.c dolookaround — #lookaround and newgame glyph_updates then-arm.
 * Temporarily forces a11y.accessiblemsg On and getloc_filter VIEW.
 * Named: corridor-goes-to rooms TODO; stuff outside current room TODO;
 * integer glyph_at / full do_screen_description table (firstmatch via
 * getpos auto_describe_text / lookat).
 */
export async function dolookaround() {
    if (!game.iflags) game.iflags = {};
    if (!game.a11y) {
        game.a11y = { accessiblemsg: false, msg_loc: { x: 0, y: 0 } };
    }
    if (!game.a11y.msg_loc) game.a11y.msg_loc = { x: 0, y: 0 };
    const tmp_getloc_filter = game.iflags.getloc_filter | 0;
    const tmp_accessiblemsg = !!game.a11y.accessiblemsg;
    let corr_next2u = false;
    const u = game.u || {};
    const here = game.level?.at?.(u.ux, u.uy);
    const htyp = here?.typ | 0;

    game.a11y.accessiblemsg = true;
    if (htyp === CORR) {
        corr_next2u = true;
    } else if (IS_DOOR(htyp)) {
        for (let i = DIR_W; i < N_DIRS; i += 2) {
            const x = (u.ux | 0) + xdir[i];
            const y = (u.uy | 0) + ydir[i];
            const loc = isok(x, y) ? game.level?.at?.(x, y) : null;
            if (loc && IS_ROOM(loc.typ)) await lookaround_known_room(x, y);
        }
        corr_next2u = true;
    } else {
        await lookaround_known_room(u.ux | 0, u.uy | 0);
    }

    game.iflags.getloc_filter = GFILTER_VIEW;
    for (let y = 0; y < ROWNO; y++) {
        for (let x = 1; x < COLNO; x++) {
            const iscorr = corr_next2u && shown_corr_cmap(x, y);
            if (!look_u_at(x, y)
                && (gather_locs_interesting(x, y, GLOC_INTERESTING)
                    || iscorr)) {
                const firstmatch = auto_describe_text(x, y) || '';
                await pline_xy(x, y, `${firstmatch}.`);
            }
        }
    }

    game.iflags.getloc_filter = tmp_getloc_filter;
    game.a11y.accessiblemsg = tmp_accessiblemsg;
    return ECMD_OK;
}

// C ref: cmd.c — continue a DOMOVE_RUSH after the first step (moveloop multi>0)
export async function continue_run() {
    if (!game.context?.run || !(game.multi > 0) || !game.context.mv) {
        end_running(true);
        return false;
    }
    lookaround();
    if (!(game.multi > 0) || !game.context.run) {
        game.context.move = 0;
        return false;
    }
    // C: if (multi < COLNO && !--multi) end_running
    if (game.multi < COLNO && !--game.multi) {
        end_running(true);
    }
    // C ref: hack.c domove_core — travel recomputes step each turn
    if (game.context?.travel) {
        // C: if (!findtravelpath(TRAVP_TRAVEL)) findtravelpath(TRAVP_GUESS)
        if (!findtravelpath_travel() && !findtravelpath_guess()) {
            end_running(true);
            game.context.move = 0;
            return false;
        }
        game.context.travel1 = 0;
    }
    const dx = game.u.dx || 0;
    const dy = game.u.dy || 0;
    await domove(dx, dy);
    if (game.context.move !== 0) game.context.move = 1;
    return true;
}

export function run_active() {
    return !!(game.context?.run && game.multi > 0 && game.context.mv);
}

// Repeat a counted search (20s) without reading a new key
export function search_repeat_active() {
    return !!(game._repeat_search && (game.multi || 0) > 0);
}

/** C ref: decl.c dirs_ord — cardinals first for findtravelpath. */
const DIRS_ORD = [
    DIR_W, DIR_N, DIR_E, DIR_S, DIR_NW, DIR_NE, DIR_SE, DIR_SW,
];

/**
 * C-style BFS from (fromX,fromY) until (toX,toY)=hero is adjacent.
 * Sets u.dx/u.dy to step from hero onto the connecting neighbor.
 * C ref: hack.c findtravelpath TRAVP_TRAVEL / noguess.
 * @param {boolean} guessMode — TRAVP_GUESS expand: require couldsee(nx,ny)
 * @param {boolean} [couldseeOnly] — sighted: require couldsee (ignore seenv)
 */
function findtravelpath_bfs(fromX, fromY, toX, toY, guessMode, couldseeOnly = false) {
    const u = game.u;
    const travel = new Map();
    let cur = [{ x: fromX, y: fromY }];
    // C: memset travel 0 — the start cell matrix stays 0 (only discovered
    // cells get radius); unvisited ≡ 0, so the start may be re-discovered.
    let radius = 1;
    // C hack.c :1330 — no diagonal movement for grid bugs (NODIAG);
    // dirs_ord is cardinals-first, so drop the diagonal half (D-1897).
    const dirs = (((u?.umonnum) | 0) === PM_GRID_BUG)
        ? DIRS_ORD.slice(0, 4) : DIRS_ORD;

    while (cur.length) {
        const next = [];
        for (const { x, y } of cur) {
            // C hack.c :1412–1420 — door/boulder/trap delay: re-queue this
            // cell once per round (matrix untouched) while
            // travel[x][y] > radius-3; open paths win, delayed routes
            // still resolve once the delay expires (D-1897).
            let alreadyRepeated = false;

            for (const dir of dirs) {
                const nx = x + xdir[dir];
                const ny = y + ydir[dir];
                if (!isok(nx, ny)) continue;
                if (guessMode && !couldsee(nx, ny)) continue;
                if (travel_delay_current(x, y)
                    || (((game.context?.run | 0) === 8)
                        && travel_avoids_cell(nx, ny))) {
                    if ((travel.get(`${x},${y}`) | 0) > radius - 3) {
                        if (!alreadyRepeated) {
                            next.push({ x, y });
                            alreadyRepeated = true;
                        }
                        continue;
                    }
                }
                if (blocksMove(nx, ny)) continue;
                // C TEST_TRAV: never enter boulder as a path node (tourist)
                if (boulder_at(nx, ny)) continue;
                // C test_move TEST_TRAV + run==8: seen traps / known liquids
                if (travel_avoids_cell(nx, ny)) continue;
                // C test_move: tight diagonal + cant_squeeze_thru (load)
                if (travel_blocks_tight_diag(x, y, nx, ny)) continue;

                if (nx === toX && ny === toY) {
                    // Path reached hero from neighbor (x,y) → step onto it
                    u.dx = x - toX;
                    u.dy = y - toY;
                    // C: when step cell is the travel destination, stop after
                    // this step and clear travelcc (visited arm deferred).
                    if (!guessMode && x === fromX && y === fromY) {
                        nomul(0);
                        if (game.context) game.context.run = 8;
                        if (!game.iflags) game.iflags = {};
                        if (!game.iflags.travelcc) {
                            game.iflags.travelcc = { x: 0, y: 0 };
                        }
                        game.iflags.travelcc.x = 0;
                        game.iflags.travelcc.y = 0;
                    }
                    return true;
                }
                const key = `${nx},${ny}`;
                if (travel.has(key)) continue;
                const loc = game.level?.at(nx, ny);
                if (!loc) continue;
                // C: seenv || (!Blind && couldsee). couldseeOnly ignores seenv
                // (D-0702 workaround for over-broad JS seenv).
                if (couldseeOnly && !u.Blind) {
                    if (!couldsee(nx, ny)) continue;
                } else if (!(loc.seenv || (!u.Blind && couldsee(nx, ny)))) {
                    continue;
                }
                travel.set(key, radius);
                next.push({ x: nx, y: ny });
            }
        }
        cur = next;
        radius++;
        if (radius > COLNO * ROWNO) break;
    }
    return false;
}

function findtravelpath_travel(couldseeOnly = false) {
    const u = game.u;
    const destX = u.tx | 0;
    const destY = u.ty | 0;
    if (!isok(destX, destY)) return false;

    const ctx = game.context;
    // Adjacent reachable → normal one-step move; clear travel destination
    if (ctx?.travel1
        && Math.abs(destX - u.ux) <= 1 && Math.abs(destY - u.uy) <= 1
        && (destX !== u.ux || destY !== u.uy)
        && !blocksMove(destX, destY)
        && !boulder_at(destX, destY)) {
        end_running(true);
        u.dx = destX - u.ux;
        u.dy = destY - u.uy;
        nomul(0);
        if (!game.iflags) game.iflags = {};
        if (!game.iflags.travelcc) game.iflags.travelcc = { x: 0, y: 0 };
        game.iflags.travelcc.x = 0;
        game.iflags.travelcc.y = 0;
        return true;
    }

    if (destX === u.ux && destY === u.uy) return false;

    return findtravelpath_bfs(destX, destY, u.ux, u.uy, false, couldseeOnly);
}

/**
 * C ref: hack.c findtravelpath(TRAVP_GUESS) — BFS from hero through
 * couldsee cells, pick matrix cell closest to u.tx/u.ty, then
 * TRAVP_TRAVEL from that pick back to hero.
 * Named omissions: travelmap visited stop; full door/boulder delay re-queue.
 */
function findtravelpath_guess() {
    const u = game.u;
    const destX = u.tx | 0;
    const destY = u.ty | 0;
    if (!isok(destX, destY)) return false;
    if (destX === u.ux && destY === u.uy) return false;

    // C: start BFS at hero; travel[hero] stays 0 (not a guess candidate).
    const travel = new Map();
    let cur = [{ x: u.ux | 0, y: u.uy | 0 }];
    let radius = 1;
    // C hack.c :1330 — grid-bug NODIAG; same cardinals-first prefix (D-1897).
    const dirs = (((u?.umonnum) | 0) === PM_GRID_BUG)
        ? DIRS_ORD.slice(0, 4) : DIRS_ORD;

    while (cur.length) {
        const next = [];
        for (const { x, y } of cur) {
            // C hack.c :1412–1420 — same door/boulder/trap delay arm as the
            // TRAVEL loop (one shared C body, one mode flag).
            let alreadyRepeated = false;
            for (const dir of dirs) {
                const nx = x + xdir[dir];
                const ny = y + ydir[dir];
                if (!isok(nx, ny)) continue;
                // C GUESS: !couldsee → continue (before test_move)
                if (!couldsee(nx, ny)) continue;
                if (travel_delay_current(x, y)
                    || (((game.context?.run | 0) === 8)
                        && travel_avoids_cell(nx, ny))) {
                    if ((travel.get(`${x},${y}`) | 0) > radius - 3) {
                        if (!alreadyRepeated) {
                            next.push({ x, y });
                            alreadyRepeated = true;
                        }
                        continue;
                    }
                }
                if (blocksMove(nx, ny)) continue;
                if (boulder_at(nx, ny)) continue;
                if (travel_avoids_cell(nx, ny)) continue;
                if (travel_blocks_tight_diag(x, y, nx, ny)) continue;
                // C: reaching dest under GUESS does not return / enqueue
                if (nx === destX && ny === destY) continue;
                const key = `${nx},${ny}`;
                if (travel.has(key)) continue;
                const loc = game.level?.at(nx, ny);
                if (!loc) continue;
                if (!(loc.seenv || (!u.Blind && couldsee(nx, ny)))) continue;
                travel.set(key, radius);
                next.push({ x: nx, y: ny });
            }
        }
        cur = next;
        radius++;
        if (radius > COLNO * ROWNO) break;
    }

    // C: pick couldsee cell in travel[] with minimal distmin to dest.
    // Raster x,y order matches C tie-breaks (last write wins on equal dist).
    let px = u.ux | 0;
    let py = u.uy | 0;
    let dist = Math.max(Math.abs(destX - px), Math.abs(destY - py));
    let d2 = dist2(px, py, destX, destY);
    let ptrav = COLNO * ROWNO;

    for (let tx = 1; tx < COLNO; tx++) {
        for (let ty = 0; ty < ROWNO; ty++) {
            const ctrav = travel.get(`${tx},${ty}`) | 0;
            if (!couldsee(tx, ty) || ctrav <= 0) continue;
            const nxtdist = Math.max(Math.abs(destX - tx), Math.abs(destY - ty));
            if (nxtdist === dist && ctrav < ptrav) {
                const nd2 = dist2(tx, ty, destX, destY);
                if (nd2 < d2) {
                    px = tx;
                    py = ty;
                    d2 = nd2;
                    ptrav = ctrav;
                }
            } else if (nxtdist < dist) {
                px = tx;
                py = ty;
                dist = nxtdist;
                d2 = dist2(tx, ty, destX, destY);
                ptrav = ctrav;
            }
        }
    }

    if (px === (u.ux | 0) && py === (u.uy | 0)) {
        // C: no guesses — sgn toward dest if TEST_MOVE allows
        const dx = Math.sign(destX - u.ux);
        const dy = Math.sign(destY - u.uy);
        if (!dx && !dy) return false;
        const nx = (u.ux | 0) + dx;
        const ny = (u.uy | 0) + dy;
        if (!isok(nx, ny) || blocksMove(nx, ny) || boulder_at(nx, ny)) return false;
        if (travel_avoids_cell(nx, ny)) return false;
        if (travel_blocks_tight_diag(u.ux, u.uy, nx, ny)) return false;
        u.dx = dx;
        u.dy = dy;
        return true;
    }

    // C: mode = TRAVP_TRAVEL; goto noguess from (px,py) toward hero
    return findtravelpath_bfs(px, py, u.ux, u.uy, false);
}

/**
 * C ref: hack.c is_valid_travelpt — getpos auto_describe appends
 * " (no travel path)" when getloc_travelmode && !is_valid_travelpt.
 * TRAVP_VALID: findtravelpath swaps ends — BFS from hero toward dest
 * (unlike TRAVP_TRAVEL which BFS dest→hero). Restores tx/ty; VALID must
 * not clear travelcc (unlike TRAVEL success). Named: travelmap visited;
 * glyph_is_cmap S_stone via typ≈STONE|SCORR blank showsyms.
 */
export function is_valid_travelpt(x, y) {
    const u = game.u;
    if ((u.ux | 0) === (x | 0) && (u.uy | 0) === (y | 0)) return true;
    if (!isok(x, y)) return false;
    const loc = game.level?.at?.(x, y);
    // C: glyph_is_cmap && S_stone == glyph_to_cmap && !seenv → FALSE
    if (loc && (loc.typ | 0) === STONE && !(loc.seenv | 0)) return false;

    const savedTx = u.tx;
    const savedTy = u.ty;
    const savedDx = u.dx;
    const savedDy = u.dy;
    const tcc = game.iflags?.travelcc;
    const savedTccX = tcc ? tcc.x : 0;
    const savedTccY = tcc ? tcc.y : 0;
    u.tx = x | 0;
    u.ty = y | 0;
    let ret = false;
    try {
        // C findtravelpath(TRAVP_VALID): start at hero, seek dest
        // (not dest→hero — that falsely succeeds from impassable stone).
        ret = findtravelpath_bfs(u.ux, u.uy, u.tx, u.ty, false, false);
    } finally {
        u.tx = savedTx;
        u.ty = savedTy;
        u.dx = savedDx;
        u.dy = savedDy;
        if (tcc) {
            tcc.x = savedTccX;
            tcc.y = savedTccY;
        }
    }
    return ret;
}

/**
 * C ref: cmd.c dotravel_target — travel to iflags.travelcc / u.tx,u.ty.
 * @returns {Promise<number>} ECMD_*
 */
async function dotravel_target() {
    if (!game.iflags) game.iflags = {};
    if (!game.iflags.travelcc) game.iflags.travelcc = { x: 0, y: 0 };
    const tcc = game.iflags.travelcc;
    if (!isok(tcc.x, tcc.y)) {
        await pline('No travel destination set.');
        return ECMD_OK;
    }
    const u = game.u;
    if (u.ux === tcc.x && u.uy === tcc.y) {
        await pline('You are already here.');
        tcc.x = 0;
        tcc.y = 0;
        return ECMD_OK;
    }

    if (game.iflags) game.iflags.getloc_travelmode = false;
    if (!game.context) game.context = {};
    game.context.travel = 1;
    game.context.travel1 = 1;
    game.context.run = 8;
    game.context.nopick = 1;
    game.domove_attempting = (game.domove_attempting || 0) | DOMOVE_RUSH;

    if (!game.multi) game.multi = Math.max(COLNO, ROWNO);
    u.last_str_turn = 0;
    game.context.mv = 1;

    u.tx = tcc.x;
    u.ty = tcc.y;

    // C ref: hack.c findtravelpath — seenv || (!Blind && couldsee), then
    // domove. D-0702: JS seenv can overmark and yield a Chebyshev-worsening
    // detour where C has no TEST_TRAV path → quiet-rest (dx=dy=0).
    // Do NOT prefer couldsee-only first: that skipped seenv CLOUD cells on
    // Quest and stepped SE while C walked S (D-0784 / seed0360 @104904).
    let stepped = false;
    if (findtravelpath_travel(false) || findtravelpath_guess()) {
        const nx = (u.ux | 0) + (u.dx | 0);
        const ny = (u.uy | 0) + (u.dy | 0);
        const before = Math.max(
            Math.abs((u.tx | 0) - (u.ux | 0)),
            Math.abs((u.ty | 0) - (u.uy | 0)),
        );
        const after = Math.max(
            Math.abs((u.tx | 0) - nx),
            Math.abs((u.ty | 0) - ny),
        );
        if (after <= before) {
            await domove(u.dx || 0, u.dy || 0);
            stepped = true;
        }
    }
    if (stepped) {
        if (game.context) {
            game.context.travel1 = 0;
            if (game.context.move !== 0) game.context.move = 1;
        }
    } else {
        u.dx = 0;
        u.dy = 0;
        nomul(0);
        end_running(true);
        game.context.move = 1;
    }
    return ECMD_TIME;
}

/**
 * C ref: cmd.c dotravel — '_' / #travel getpos then dotravel_target.
 * Branch envelope: cancel, already-here, adjacent step, greedy BFS step.
 * Menu getpos / full TEST_TRAV / GUESS / travelmap deferred.
 * @returns {Promise<number>} ECMD_*
 */
export async function dotravel() {
    if (!game.iflags) game.iflags = {};
    if (!game.iflags.travelcc) game.iflags.travelcc = { x: 0, y: 0 };
    const cc = {
        x: game.iflags.travelcc.x | 0,
        y: game.iflags.travelcc.y | 0,
    };
    if (cc.x === 0 && cc.y === 0) {
        cc.x = game.u.ux;
        cc.y = game.u.uy;
    }
    game.iflags.getloc_travelmode = true;

    // menu_requested getpos_menu path deferred — always free getpos
    await pline('Where do you want to travel to?');
    if ((await getpos(cc, true, 'the desired destination')) < 0) {
        game.iflags.getloc_travelmode = false;
        return ECMD_CANCEL;
    }

    game.iflags.travelcc.x = game.u.tx = cc.x;
    game.iflags.travelcc.y = game.u.ty = cc.y;
    return dotravel_target();
}

export async function continue_search() {
    if (!search_repeat_active()) {
        game._repeat_search = false;
        game.multi = 0;
        return false;
    }
    game.multi--;
    if (game.multi <= 0) {
        game._repeat_search = false;
        game.multi = 0;
    }
    // C: counted `Ns` re-invokes dosearch each multi tick
    await dosearch();
    game.context.move = 1;
    game.kickedloc = { x: 0, y: 0 };
    return true;
}

/**
 * C integer.h AppendLongDigit — L*10+D, or -1 on overflow.
 * @param {number} L
 * @param {number} D
 * @returns {number}
 */
function append_long_digit(L, D) {
    const LONG_MAX = Number.MAX_SAFE_INTEGER;
    if (L < Math.trunc(LONG_MAX / 10)
        || (L === Math.trunc(LONG_MAX / 10) && D <= (LONG_MAX % 10))) {
        return L * 10 + D;
    }
    return -1;
}

/**
 * C cmd.c get_count inkey: NUL / 0 means read the first key.
 * @param {string|number|null|undefined} inkey
 * @returns {number}
 */
function get_count_inkey_code(inkey) {
    if (inkey == null || inkey === '' || inkey === '\0') return 0;
    if (typeof inkey === 'string') return inkey.charCodeAt(0) & 0xff;
    return inkey & 0xff;
}

/**
 * C cmd.c get_count `:5009–5090`. Digits then a terminator; echo
 * "Count: N" via _pending_message (custompline SUPPRESS_HISTORY named).
 * GC_SAVEHIST / GC_CONDHIST put "Count: N "+key2txt in putmsghistory
 * (D-1588). parse uses GC_NOFLAGS; getobj uses GC_SAVEHIST.
 * altmeta input_state / num_pad NHKF_COUNT named.
 * @param {string|null} [allowchars]
 * @param {string|number} [inkey]
 * @param {number} [maxcount]
 * @param {{ n: number }} [countOut]
 * @param {number} [gc_flags]
 * @returns {Promise<number>} terminating key
 */
export async function get_count(
    allowchars = null,
    inkey = 0,
    maxcount = LARGEST_INT,
    countOut = null,
    gc_flags = GC_NOFLAGS,
) {
    const box = countOut || { n: 0 };
    box.n = 0;
    let cnt = 0;
    let pending = get_count_inkey_code(inkey);
    const first = pending ? (pending - 48) : 0;
    const historicmsg = (gc_flags & GC_SAVEHIST) !== 0;
    const conditionalmsg = (gc_flags & GC_CONDHIST) !== 0;
    const echoalways = (gc_flags & GC_ECHOFIRST) !== 0;
    let backspaced = false;
    let showzero = true;
    let key = 0;

    for (;;) {
        if (pending) {
            key = pending;
            pending = 0;
        } else {
            key = await nhgetch();
        }

        if (key >= 48 && key <= 57) {
            const dgt = key - 48;
            cnt = append_long_digit(cnt, dgt);
            if (cnt < 0) cnt = 0;
            else if (maxcount > 0 && cnt > maxcount) cnt = maxcount;
            showzero = (key === 48);
        } else if (key === 8 || key === 127) {
            if (!cnt && !echoalways) break;
            showzero = false;
            cnt = Math.trunc(cnt / 10);
            backspaced = true;
        } else if (key === 27) {
            break;
        } else if (!allowchars
                   || allowchars.includes(String.fromCharCode(key))) {
            box.n = cnt;
            break;
        }

        if (cnt > 9 || backspaced || echoalways) {
            clear_nhwindow_message();
            let qbuf;
            if (backspaced && !cnt && !showzero) {
                qbuf = 'Count: ';
            } else {
                qbuf = `Count: ${cnt}`;
                backspaced = false;
            }
            game._pending_message = qbuf;
            await flush_screen(1);
            game.nhDisplay?.setCursor?.(qbuf.length, 0);
        }
    }

    if (historicmsg || (conditionalmsg && box.n !== first)) {
        putmsghistory(`Count: ${box.n} ${key2txt(key)}`, false);
    }

    return key;
}

/**
 * C cmd.c rhack `:3732–3740`. Map the dispatch key to the function C
 * would cmdq_add_ec(CQ_REPEAT, …). do_repeat and doextcmd are skipped
 * at the call site. PREFIXCMD / movement / BIND overlays named.
 * @param {string} ch
 * @param {number} key
 * @returns {((() => Promise<number>|number|boolean|void)|null)}
 */
function rhack_repeat_command(ch, key) {
    if (key === 1) return do_repeat;
    if (key === 4) return dokick;
    if (key === 6) return wiz_map;
    if (key === 7) return wiz_genesis;
    if (key === 16) return doprev_message; // C('p')
    if (key === 20) return dotelecmd;
    if (key === 22) return wiz_level_tele;
    if (key === 23) return wiz_wish;
    if (key === 24) return doattributes;
    switch (ch) {
    case 'a': return doapply;
    case 'A': return doddoremarm;
    case 'c': return doclose;
    case 'd': return dodrop;
    case 'D': return doddrop;
    case 'e': return doeat;
    case 'E': return doengrave;
    case 'f': return dofire;
    case 'i': return ddoinv;
    case 'I': return dotypeinv;
    case 'o': return doopen;
    case 'p': return dopay;
    case 'P': return doputon;
    case 'q': return dodrink;
    case 'Q': return dowieldquiver;
    case 'r': return doread;
    case 'R': return doremring;
    case 's': return dosearch;
    case 'S': return dosave;
    case 't': return dothrow;
    case 'T': return dotakeoff;
    case 'V': return doversion;
    case 'w': return dowield;
    case 'W': return dowear;
    case 'x': return doswapweapon;
    case 'z': return dozap;
    case 'Z': return docast;
    case ',': return dopickup;
    case '.': return donull;
    case '>': return dodown;
    case '<': return doup;
    case '_': return dotravel;
    case ':': return dolook;
    case '/': return dowhatis;
    case ';': return doquickwhatis;
    case '?': return dohelp;
    case '+': return dovspell;
    case '\\': return dodiscovered;
    case '@': return dotogglepickup;
    case 'O': return doset_simple;
    case '$': return doprgold;
    case ')': return doprwep;
    case '[': return doprarm;
    case '=': return doprring;
    case '"': return dopramulet;
    case '(': return doprtool;
    case '*': return doprinuse;
    case '|': return doperminv;
    case '\x7f': return doterrain;
    case ' ': return game.flags?.rest_on_space ? donull : null;
    case 'g': return do_rush;
    case 'G': return do_run;
    case 'F': return do_fight;
    case 'm': return do_reqmenu;
    case 'h': return do_move_west;
    case 'y': return do_move_northwest;
    case 'k': return do_move_north;
    case 'u': return do_move_northeast;
    case 'l': return do_move_east;
    case 'n': return do_move_southeast;
    case 'j': return do_move_south;
    case 'b': return do_move_southwest;
    default: return null;
    }
}

/**
 * C extcmdlist ef_txt for rhack CQ_REPEAT cmdq_add_ec (flags via
 * ext_func_tab_from_txt). BIND overlays named.
 * @param {string} ch
 * @param {number} key
 * @returns {string}
 */
function rhack_repeat_txt(ch, key) {
    if (key === 1) return 'repeat';
    if (key === 4) return 'kick';
    if (key === 6) return 'wizmap';
    if (key === 7) return 'wizgenesis';
    if (key === 16) return 'prevmsg';
    if (key === 20) return 'teleport';
    if (key === 22) return 'wizlevelport';
    if (key === 23) return 'wizwish';
    if (key === 24) return 'attributes';
    const byCh = {
        a: 'apply', A: 'takeoffall', c: 'close', d: 'drop', D: 'droptype',
        e: 'eat',
        E: 'engrave', f: 'fire', i: 'inventory', I: 'inventtype', o: 'open', p: 'pay',
        P: 'puton', q: 'quaff', Q: 'quiver', r: 'read', R: 'remove', s: 'search',
        S: 'save', t: 'throw', T: 'takeoff', V: 'versionshort', w: 'wield', W: 'wear',
        x: 'swap', z: 'zap', Z: 'cast', ',': 'pickup', '.': 'wait',
        '>': 'down', '<': 'up', _: 'travel', ':': 'look', '/': 'whatis',
        ';': 'glance', '?': 'help', '+': 'showspells', '\\': 'known',
        '@': 'autopickup', O: 'options', $: 'showgold', ')': 'seeweapon',
        '[': 'seearmor', '=': 'seerings', '"': 'seeamulet', '(': 'seetools',
        '*': 'seeall',
        '|': 'perminv',
        '\x7f': 'terrain',
        g: 'rush', G: 'run', F: 'fight', m: 'reqmenu',
        h: 'movewest', y: 'movenorthwest', k: 'movenorth', u: 'movenortheast',
        l: 'moveeast', n: 'movesoutheast', j: 'movesouth', b: 'movesouthwest',
    };
    if (ch === ' ' && game.flags?.rest_on_space) return 'wait';
    return byCh[ch] || '';
}

/**
 * C cmd.c do_repeat `:1637–1660`. Ctrl-A / #repeat. Copy CQ_REPEAT,
 * in_doagain, rhack(0), restore the copy so a further repeat works.
 * @returns {Promise<number>} ECMD_*
 */
export async function do_repeat() {
    let res = ECMD_OK;
    if (!game.in_doagain) {
        if (!cmdq_peek(CQ_REPEAT)) {
            await Norep('There is no command available to repeat.');
            return ECMD_FAIL;
        }
        const repeat_copy = cmdq_copy(CQ_REPEAT);
        game.in_doagain = true;
        await rhack(0);
        game.in_doagain = false;
        cmdq_clear(CQ_REPEAT);
        game._cmdq_repeat = repeat_copy;
        if (game.iflags) game.iflags.menu_requested = false;
        if (game.context?.move) res = ECMD_TIME;
    }
    return res;
}

/**
 * C cmd.c doprev_message `:163–168` — #prevmsg / ^P.
 * Windowproc is tty_doprev_message (D-1601). ECMD_OK, no turn.
 * @returns {Promise<number>}
 */
export async function doprev_message() {
    await tty_doprev_message();
    return ECMD_OK;
}

// C ref: cmd.c rhack — main command dispatcher
export async function rhack(key) {
    const firsttime = (key === 0);
    let prefix_seen = null;
    let was_m_prefix = false;

    // C rhack: menu_requested=FALSE and nopick=0 *before* got_prefix_input
    // so PREFIXCMD do_reqmenu survives the loop (D-1186 g/G; this iter m/F).
    if (game.iflags) game.iflags.menu_requested = false;
    if (game.context) game.context.nopick = 0;

    for (;;) { // C got_prefix_input
    // C cmd.c:3638–3641 — SAFERHANGUP done_hup → end_of_input.
    if (game.program_state?.done_hup) {
        end_of_input();
        return;
    }
    // C: cmdq_pop before parse — fireassist swap/retry lives here
    if (key === 0) {
        const canned = cmdq_pop();
        if (canned) {
            const isKey = typeof canned === 'object'
                && canned.typ !== CMDQ_EXTCMD
                && (canned.typ === CMDQ_KEY || canned.typ === 'key');
            if (isKey) {
                // C: KEY becomes the command keystroke (not a getobj letter).
                key = typeof canned.key === 'string'
                    ? canned.key.charCodeAt(0)
                    : (canned.key | 0);
            } else {
                if (!game.context) game.context = {};
                // C: CMDQ_EXTCMD uses ext_func_tab (altdip INTERNALCMD).
                // PREFIXCMD / MOVEMENTCMD go through rhack after func()
                // (got_prefix_input / DOMOVE_WALK|RUSH). Bare-function clones
                // from apply/dig/dothrow/iactions stay (do not add clone #6).
                let res;
                let flags = 0;
                if (typeof canned === 'function') {
                    res = await canned();
                } else if (typeof canned === 'object'
                           && canned.typ === CMDQ_EXTCMD) {
                    flags = canned.flags | 0;
                    rhack_cmd_insane(flags);
                    res = canned.txt
                        ? await run_cmdq_extcmd(canned)
                        : await canned.run();
                    if ((flags & PREFIXCMD) && !(res & ECMD_CANCEL)) {
                        prefix_seen = canned;
                        if (canned.txt === 'reqmenu') was_m_prefix = true;
                        key = 0;
                        continue;
                    }
                    if ((flags & PREFIXCMD) && (res & ECMD_CANCEL)) {
                        reset_cmd_vars(true);
                        return;
                    }
                    if ((flags & MOVEMENTCMD)
                        && (game.domove_attempting & DOMOVE_WALK)) {
                        if (game.multi) game.context.mv = 1;
                        await domove(game.u?.dx | 0, game.u?.dy | 0);
                        game.context.forcefight = 0;
                        if (game.iflags) game.iflags.menu_requested = false;
                        if (game.context.move !== 0) game.context.move = 1;
                        return;
                    }
                    if ((flags & MOVEMENTCMD)
                        && (game.domove_attempting & DOMOVE_RUSH)) {
                        if (firsttime) {
                            if (!game.multi) {
                                game.multi = Math.max(COLNO, ROWNO);
                            }
                            if (game.u) game.u.last_str_turn = 0;
                        }
                        game.context.mv = 1;
                        await domove(game.u?.dx | 0, game.u?.dy | 0);
                        if (game.iflags) game.iflags.menu_requested = false;
                        if (game.context.move !== 0) game.context.move = 1;
                        return;
                    }
                } else {
                    res = await canned();
                }
                // C rhack: (res & ECMD_TIME) → context.move; CANCEL|FAIL →
                // reset_cmd_vars(TRUE) clears remaining CQ_CANNED. Boolean true
                // from doapply is ECMD_TIME (true & 1); D-1018 canned re-apply.
                if ((res & ECMD_TIME) !== 0) {
                    game.context.move = 1;
                    game.kickedloc = { x: 0, y: 0 };
                } else {
                    if ((res & (ECMD_CANCEL | ECMD_FAIL)) !== 0) cmdq_clear();
                    game.context.move = 0;
                }
                return;
            }
        }
    }

    if (key === 0) {
        // C ref: cmd.c parse — flush, get_count (digits without clear), then
        // clear_nhwindow(WIN_MESSAGE) once before dispatching the command key.
        await flush_screen(1);
        if (!game.context) game.context = {};
        game.context.command_count = 0;
        // C parse: get_count(NULL, '\0', LARGEST_INT, &gc.command_count, GC_NOFLAGS)
        const cntbox = { n: 0 };
        key = await get_count(null, 0, LARGEST_INT, cntbox, GC_NOFLAGS);
        game.context.command_count = cntbox.n;
        clear_nhwindow_message();
        if (key === 27) {
            // C: ESC → reset_cmd_vars(TRUE) (PREFIXCMD cancel via Esc)
            if (prefix_seen) reset_cmd_vars(true);
            else {
                game.context.command_count = 0;
                game.context.move = 0;
            }
            return;
        }
        // C: gm.multi = gc.command_count; if (gm.multi) gm.multi--;
        // Counted `.` / `s` use this with set_occupation (f_text).
        game.multi = game.context.command_count | 0;
        if (game.multi) game.multi--;
        game.cmd_key = key;
    }

    const ch = String.fromCharCode(key);
    // C ref: reset_commands bind C(dir) → do_rush_*; e.g. C('j')=='\n' south
    const rushDir = rushDirFromCtrl(key);

    // C rhack (cmd.c): prefix_seen=do_fight + command lacking CMD_gGF_PREFIX
    // → pline feedback, ECMD_FAIL, reset_cmd_vars — do NOT run the command.
    // Silent clear used to let F+# fall through into doextcmd, desyncing
    // later getobj letters as movement (D-0927 seed4500 @87803).
    // Named omissions: nested g/G PREFIXCMD after F; full CMD_gGF table.
    // C: g/G are PREFIXCMD so they do not trip the F-prefix error.
    if (game.context?.forcefight
        && ch !== 'F' && ch !== 'm' && ch !== 'g' && ch !== 'G'
        && !isMovementKey(ch) && !isRunKey(ch) && !rushDir) {
        const upDown = (ch === '<' || ch === '>');
        await pline(
            `The 'F' prefix should be followed by a movement command${
                upDown ? ' other than up or down' : ''}.`,
        );
        game.context.forcefight = 0;
        game.domove_attempting = 0;
        game.context.move = 0;
        game.context.mv = 0;
        if (game.context.run) game.context.run = 0;
        if ((game.multi | 0) > 0) game.multi = 0;
        game.context.travel = 0;
        game.context.travel1 = 0;
        if (game.iflags) game.iflags.menu_requested = false;
        return;
    }
    // C rhack: g/G PREFIXCMD then a non-walk, non-PREFIXCMD key (capital
    // run / Ctrl-rush lack CMD_gGF_PREFIX) → same pline, reset_cmd_vars.
    const pendingRushPrefix = !!(
        ((game.domove_attempting || 0) & DOMOVE_RUSH)
        && !game.context?.mv
        && (game.context?.run === 2 || game.context?.run === 3)
    );
    if (pendingRushPrefix
        && ch !== 'g' && ch !== 'G' && ch !== 'F' && ch !== 'm'
        && !isMovementKey(ch)) {
        const which = game.context.run === 3 ? 'G' : 'g';
        const upDown = (ch === '<' || ch === '>');
        await pline(
            `The '${which}' prefix should be followed by a movement command${
                upDown ? ' other than up or down' : ''}.`,
        );
        game.context.forcefight = 0;
        game.domove_attempting = 0;
        game.context.move = 0;
        game.context.mv = 0;
        game.context.run = 0;
        game.multi = 0;
        game.context.travel = 0;
        game.context.travel1 = 0;
        if (game.iflags) game.iflags.menu_requested = false;
        return;
    }
    // C rhack: keep menu_requested for CMD_M_PREFIX commands (O→doset_simple
    // reads it to call doset; ^T→dotelecmd m-prefix menu D-1209; #→doextcmd
    // then the resolved extcmd's own flag, D-1230). Drop only when the next
    // command rejects 'm'.
    // Named omission: full rhack-key accept_menu_prefix table.
    // Typed # uses EXTCMDLIST CMD_M_PREFIX (D-1605 #seeall). Keys )[="(* D-1589.
    // cmdbind_get covers default M('?') "?" and other CMD_M_PREFIX binds (D-1643).
    const bindTab = cmdbind_get(key);
    const accepts_m_prefix = ch === 'O' || ch === ',' || ch === 'e'
        || ch === 'q' || ch === 'a' || ch === 's' || ch === 'p'
        || ch === '>' || ch === '<'
        || ch === ')' || ch === '[' || ch === '=' || ch === '"'
        || ch === '(' || ch === '*'
        || key === 20 // C('t') dotelecmd CMD_M_PREFIX
        || ch === '#' // doextcmd CMD_M_PREFIX; resolved cmd checked in doextcmd
        || accept_menu_prefix_tab(bindTab);
    if (ch !== 'm' && ch !== 'g' && ch !== 'G' && ch !== 'F'
        && !accepts_m_prefix && !isMovementKey(ch) && !isRunKey(ch)
        && !rushDir && game.iflags?.menu_requested) {
        game.iflags.menu_requested = false;
    }

    // C rhack `:3732–3740`: !in_doagain && func != do_repeat && != doextcmd
    // → cmdq_clear(CQ_REPEAT) unless prefix_seen, then cmdq_add_ec(CQ_REPEAT).
    // doextcmd clears REPEAT; cmdq_shift after ext_tlist (below).
    // Overlay keys use rhack_dispatch_bound REPEAT (cmdbind_get tlist).
    const overlay_key = rhack_user_overlay_key(key);
    if (!overlay_key && !game.in_doagain && key !== 1 && ch !== '#') {
        if (!prefix_seen) cmdq_clear(CQ_REPEAT);
        const fn = rhack_repeat_command(ch, key);
        if (fn && fn !== do_repeat) {
            const txt = rhack_repeat_txt(ch, key);
            cmdq_add_ec(CQ_REPEAT, fn, ext_func_tab_from_txt(txt) || { txt, flags: 0 });
        }
    } else if (!overlay_key && !game.in_doagain && ch === '#') {
        cmdq_clear(CQ_REPEAT);
    }

    if (isMovementKey(ch)) {
        // C ref: cmd.c set_move_cmd(dir, 0) — clear stale travel; DOMOVE_WALK
        // unless a g/G PREFIXCMD already set DOMOVE_RUSH (keeps context.run).
        if (!game.context) game.context = {};
        game.context.travel = 0;
        game.context.travel1 = 0;
        const attempting = game.domove_attempting || 0;
        if (!attempting) {
            game.domove_attempting = DOMOVE_WALK;
        } else if ((attempting & DOMOVE_WALK) === 0
                   && (attempting & DOMOVE_RUSH) !== 0
                   && !game.context.mv) {
            // C rhack DOMOVE_RUSH after do_rush/do_run: firsttime multi + mv
            if (!game.multi) game.multi = Math.max(COLNO, ROWNO);
            if (game.u) game.u.last_str_turn = 0;
            game.context.mv = 1;
        }
        await domove(DIR_DX[ch], DIR_DY[ch]);
        // C: forcefight cleared after DOMOVE_WALK domove
        if (game.context) game.context.forcefight = 0;
        // domove sets context.move = 0 if blocked; else leave as 1 (allmain preset)
        if (game.context.move !== 0) game.context.move = 1;
    } else if (overlay_key) {
        // C rhack cmdbind_get user overlay before the default key table.
        // JS if/else is that table; skip it when BIND= owns the key.
        const bound = await rhack_dispatch_bound(key, prefix_seen, was_m_prefix);
        if (bound.prefix) {
            prefix_seen = bound.prefix;
            if (bound.prefix.txt === 'reqmenu') was_m_prefix = true;
            key = 0;
            continue;
        }
        if (!bound.done) {
            // C tlist NULL ("nothing") or overlay target with no EXT_CMDS
            // runner — Unknown, do not fall through to if/else.
            if (game.context?.forcefight) game.context.forcefight = 0;
            if (game.context?.run || (game.multi || 0) > 0) end_running(true);
            if (game.context) game.context.command_count = 0;
            game._repeat_search = false;
            game.context.move = 0;
            await pline(`Unknown command '${visctrl(key)}'.`);
        }
    } else if (isRunKey(ch) || rushDir) {
        // C ref: cmd.c do_run_* → run=1; do_rush_* (C(dir)) → run=3
        const low = rushDir || ch.toLowerCase();
        if (!game.context) game.context = {};
        // Pending F + capital/ctrl dir: forcefight one step (not rush)
        if (game.context.forcefight) {
            game.context.travel = 0;
            game.context.travel1 = 0;
            await domove(DIR_DX[low], DIR_DY[low]);
            game.context.forcefight = 0;
            if (game.context.move !== 0) game.context.move = 1;
        } else {
            // C: set_move_cmd(dir, run) — clears travel; capital run=1, Ctrl-rush=3
            // First step carries DOMOVE_RUSH; continue_run clears attempting
            // after each domove so later steps do not maybe_smudge_engr.
            game.context.travel = 0;
            game.context.travel1 = 0;
            if (!game.domove_attempting) {
                game.domove_attempting = DOMOVE_RUSH;
            }
            game.context.run = rushDir ? 3 : 1;
            game.context.mv = 1;
            if (!game.multi) game.multi = Math.max(COLNO, ROWNO);
            game.u.last_str_turn = 0;
            await domove(DIR_DX[low], DIR_DY[low]);
            if (game.context.move !== 0) game.context.move = 1;
        }
    } else if (ch === 'F') {
        // C cmd.c do_fight — PREFIXCMD; goto got_prefix_input unless CANCEL
        const res = await do_fight();
        if (res & ECMD_CANCEL) {
            reset_cmd_vars(true);
            return;
        }
        prefix_seen = ext_func_tab_from_txt('fight');
        key = 0;
        continue;
    } else if (ch === 'm') {
        // C cmd.c do_reqmenu — PREFIXCMD; was_m_prefix for CMD_M_PREFIX table
        const res = await do_reqmenu();
        if (res & ECMD_CANCEL) {
            reset_cmd_vars(true);
            return;
        }
        prefix_seen = ext_func_tab_from_txt('reqmenu');
        was_m_prefix = true;
        key = 0;
        continue;
    } else if (ch === 'g' || ch === 'G') {
        // C cmd.c do_rush ('g') / do_run ('G') — PREFIXCMD, then another cmd
        const res = ch === 'G' ? await do_run() : await do_rush();
        if (res & ECMD_CANCEL) {
            reset_cmd_vars(true);
            return;
        }
        prefix_seen = ext_func_tab_from_txt(ch === 'G' ? 'run' : 'rush');
        key = 0;
        continue;
    } else if (key === 1) {
        // C cmd.c do_repeat — Ctrl-A "repeat" (IFBURIED|GENERALCMD)
        const res = await do_repeat();
        game.context.move = (res & ECMD_TIME) ? 1 : 0;
        if (res & ECMD_TIME) game.kickedloc = { x: 0, y: 0 };
    } else if (ch >= '0' && ch <= '9') {
        // Digits are consumed by get_count in parse (rhack(0)); reaching
        // here means rhack(key) with an explicit digit — treat as count
        // bump without a turn (rare multi/canned path).
        if (!game.context) game.context = {};
        const d = ch.charCodeAt(0) - 48;
        game.context.command_count = (game.context.command_count || 0) * 10 + d;
        if (game.context.command_count > 500) game.context.command_count = 500;
        game.context.move = 0;
        if (game.context.command_count > 9) {
            const qbuf = `Count: ${game.context.command_count}`;
            clear_nhwindow_message();
            game._pending_message = qbuf;
            await flush_screen(1);
            const disp = game.nhDisplay;
            if (disp?.setCursor) disp.setCursor(qbuf.length, 0);
        }
    } else if (ch === 'a') {
        // C ref: apply.c doapply
        const tookTime = await doapply();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'o') {
        // C ref: lock.c doopen / cmd.c `o` — getdir then open door
        const tookTime = await doopen();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'c') {
        // C ref: lock.c doclose / cmd.c `c` — getdir then close door
        const tookTime = await doclose();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (key === 4) { // Ctrl-D
        // C ref: dokick.c dokick — #kick
        const tookTime = await dokick();
        game.context.move = tookTime ? 1 : 0;
        // C: do NOT clear kickedloc after dokick — pets avoid it this turn
    } else if (ch === ' ' && game.flags?.rest_on_space) {
        // C ref: cmd.c update_rest_on_space — <space> → donull when option On
        // C: f_text "waiting" + multi → timed_occupation(donull)
        if ((game.multi | 0) > 0 && !game.occupation) {
            set_occupation(donull, 'waiting', game.multi);
        }
        const tookTime = await donull();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === '.') {
        // C ref: do.c donull / cmd.c — wait; timed non-kick clears kickedloc
        // C rhack: f_text "waiting" && multi → set_occupation(donull,…)
        // so Count:N . runs N turns via timed_occupation (D-0928 #1096).
        if ((game.multi | 0) > 0 && !game.occupation) {
            set_occupation(donull, 'waiting', game.multi);
        }
        const tookTime = await donull();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === ',') {
        // C ref: hack.c dopickup / cmd.c — `,` pickup
        const pickRes = await dopickup();
        game.context.move = (pickRes & ECMD_TIME) ? 1 : 0;
        if (pickRes & ECMD_TIME) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'p') {
        // C ref: shk.c dopay / cmd.c — `p` pay shopping bill
        const payRes = await dopay();
        game.context.move = (payRes & ECMD_TIME) ? 1 : 0;
        if (payRes & ECMD_TIME) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === '>') {
        // C ref: do.c dodown / cmd.c — go down staircase
        const downRes = await dodown();
        game.context.move = (downRes & 0x01) ? 1 : 0;
        if (downRes & 0x01) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === '<') {
        // C ref: do.c doup / cmd.c — go up staircase
        const upRes = await doup();
        game.context.move = (upRes & 0x01) ? 1 : 0;
        if (upRes & 0x01) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 's') {
        // C ref: detect.c dosearch + cmd.c set_occupation(f_text "searching")
        // parse already set multi = count-1; counted Ns → timed occupation.
        if (game.context) game.context.command_count = 0;
        if ((game.multi | 0) > 0) {
            if (game.context) game.context.mv = 0;
            // C: if (f_text && !occupation && multi) set_occupation(dosearch,…)
            if (!game.occupation) set_occupation(dosearch, 'searching', game.multi);
        }
        const tookTime = await dosearch();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'd') {
        // C ref: do.c dodrop — drop an item
        const dropRes = await dodrop();
        game.context.move = (dropRes & ECMD_TIME) ? 1 : 0;
        if (dropRes & ECMD_TIME) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'D') {
        // C ref: do.c doddrop / cmd.c 'D' droptype
        const dropRes = await doddrop();
        game.context.move = (dropRes & ECMD_TIME) ? 1 : 0;
        if (dropRes & ECMD_TIME) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'T') {
        // C ref: do_wear.c dotakeoff — take off armor/accessory
        const tookTime = await dotakeoff();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'R') {
        // C ref: do_wear.c doremring — 'R' remove accessory
        const tookTime = await doremring();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'A') {
        // C ref: do_wear.c doddoremarm / cmd.c 'A' takeoffall
        const res = await doddoremarm();
        game.context.move = (res & ECMD_TIME) ? 1 : 0;
        if (res & ECMD_TIME) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'w') {
        // C ref: wield.c dowield — wield a weapon
        const tookTime = await dowield();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'x') {
        // C ref: wield.c doswapweapon / cmd.c 'x' "swap"
        const swapRes = await doswapweapon();
        game.context.move = swapRes ? 1 : 0;
        if (swapRes) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'S') {
        // C ref: save.c dosave / cmd.c — #save (GENERALCMD, ECMD_OK)
        await dosave();
        game.context.move = 0;
    } else if (ch === 'O') {
        // C ref: options.c doset_simple / cmd.c — O options menu
        await doset_simple();
        game.context.move = 0;
    } else if (ch === '@') {
        // C ref: options.c dotogglepickup / cmd.c — @ autopickup toggle
        await dotogglepickup();
        game.context.move = 0;
    } else if (ch === '$') {
        // C ref: invent.c doprgold / cmd.c — #showgold (GENERALCMD)
        await doprgold();
        game.context.move = 0;
    } else if (ch === ')') {
        // C ref: invent.c doprwep / cmd.c — #seeweapon (GENERALCMD, WEAPON_SYM)
        await doprwep();
        game.context.move = 0;
    } else if (ch === '[') {
        // C ref: invent.c doprarm / cmd.c — #seearmor (GENERALCMD, ARMOR_SYM)
        await doprarm();
        game.context.move = 0;
    } else if (ch === '=') {
        // C ref: invent.c doprring / cmd.c — #seerings (GENERALCMD, RING_SYM)
        await doprring();
        game.context.move = 0;
    } else if (ch === '"') {
        // C ref: invent.c dopramulet / cmd.c — #seeamulet (GENERALCMD, AMULET_SYM)
        await dopramulet();
        game.context.move = 0;
    } else if (ch === '(') {
        // C ref: invent.c doprtool / cmd.c — #seetools (GENERALCMD, TOOL_SYM)
        await doprtool();
        game.context.move = 0;
    } else if (ch === '*') {
        // C ref: invent.c doprinuse / cmd.c — #seeall (GENERALCMD, '*')
        await doprinuse();
        game.context.move = 0;
    } else if (ch === '|') {
        // C ref: invent.c doperminv / cmd.c — #perminv (GENERALCMD, '|')
        await doperminv();
        game.context.move = 0;
    } else if (ch === '\x7f') {
        // C ref: cmd.c doterrain / #terrain — DEL key (\177)
        await doterrain();
        game.context.move = 0;
    } else if (ch === 'Q') {
        // C ref: wield.c dowieldquiver / doquiver_core("ready")
        const tookTime = await dowieldquiver();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === '_') {
        // C ref: cmd.c dotravel — #travel / getpos destination
        const travelRes = await dotravel();
        game.context.move = (travelRes & ECMD_TIME) ? 1 : 0;
        if (travelRes & ECMD_TIME) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'W') {
        // C ref: do_wear.c dowear — wear armor
        const tookTime = await dowear();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'P') {
        // C ref: do_wear.c doputon — put on accessory
        const tookTime = await doputon();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'i') {
        // C ref: invent.c ddoinv / display_inventory
        await ddoinv();
        game.context.move = 0;
    } else if (ch === 'I') {
        // C ref: invent.c dotypeinv / cmd.c inventtype
        await dotypeinv();
        game.context.move = 0;
    } else if (ch === 'e') {
        // C ref: eat.c doeat
        const tookTime = await doeat();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'q') {
        // C ref: potion.c dodrink / #quaff — ECMD_TIME bit only (CANCEL≠time)
        const drinkRes = await dodrink();
        game.context.move = (drinkRes & ECMD_TIME) ? 1 : 0;
        if (drinkRes & ECMD_TIME) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'z') {
        // C ref: zap.c dozap / #zap
        const tookTime = await dozap();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'Z') {
        // C ref: spell.c docast / #cast
        const castRes = await docast();
        game.context.move = (castRes & 0x01) ? 1 : 0; // ECMD_TIME
        if (castRes & 0x01) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'r') {
        // C ref: read.c doread / #read
        const tookTime = await doread();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'E') {
        // C ref: engrave.c doengrave / #engrave
        // ECMD_OK setup; occupation consumes the following turn
        const tookTime = await doengrave();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 't') {
        // C ref: dothrow.c dothrow
        const tookTime = await dothrow();
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === 'f') {
        // C ref: dothrow.c dofire — #fire / quiver shoot
        const tookTime = await dofire();
        // C: ECMD_OK after queueing fireassist keeps CQ_CANNED
        game.context.move = tookTime ? 1 : 0;
        if (tookTime) game.kickedloc = { x: 0, y: 0 };
    } else if (ch === '+') {
        // C ref: spell.c dovspell
        await dovspell();
        game.context.move = 0;
    } else if (ch === '\\') {
        // C ref: o_init.c dodiscovered
        await dodiscovered();
        game.context.move = 0;
    } else if (key === 16) { // ^P — C('p') doprev_message
        // C ref: cmd.c doprev_message / topl.c tty_doprev_message (D-1601)
        // CMD_INSANE — skip the following sanity_check (D-1664).
        rhack_cmd_insane(CMD_INSANE);
        await doprev_message();
        game.context.move = 0;
    } else if (key === 20) { // ^T — C('t') dotelecmd
        // C ref: teleport.c dotelecmd / cmd.c teleport
        const teleRes = await dotelecmd();
        game.context.move = (teleRes & 0x01) ? 1 : 0; // ECMD_TIME
    } else if (key === 24) { // ^X
        // C ref: insight.c enlightenment / doattributes
        await doattributes();
        game.context.move = 0;
    } else if (key === 23) { // ^W — C('w') wiz_wish
        // C ref: wizcmds.c wiz_wish / cmd.c wizwish
        await wiz_wish();
        game.context.move = 0;
    } else if (key === 22) { // ^V — C('v') wiz_level_tele
        // C ref: wizcmds.c wiz_level_tele / cmd.c wizlevelport
        await wiz_level_tele();
        game.context.move = 0;
    } else if (key === 7) { // ^G — C('g') wiz_genesis
        // C ref: wizcmds.c wiz_genesis / cmd.c wizgenesis
        await wiz_genesis();
        game.context.move = 0;
    } else if (key === 6) { // ^F — C('f') wiz_map
        // C ref: wizcmds.c wiz_map / cmd.c wizmap — ECMD_OK, no turn
        await wiz_map();
        game.context.move = 0;
    } else if (ch === ':') {
        // C ref: invent.c dolook / lookat
        await dolook();
        game.context.move = 0;
    } else if (ch === '&') {
        // C ref: cmd.c '&' → dowhatdoes (IFBURIED|GENERALCMD) — ECMD_OK, no turn
        await dowhatdoes();
        game.context.move = 0;
    } else if (ch === '/') {
        // C ref: pager.c dowhatis / do_look — ECMD_OK, no turn
        await dowhatis();
        game.context.move = 0;
    } else if (ch === ';') {
        // C ref: cmd.c ';' → glance / pager.c doquickwhatis → do_look(1)
        await doquickwhatis();
        game.context.move = 0;
    } else if (ch === '?') {
        // C ref: pager.c dohelp — ECMD_OK, no turn
        await dohelp();
        game.context.move = 0;
    } else if (ch === 'V') {
        // C ref: version.c doversion / cmd.c 'V' versionshort
        // (IFBURIED|GENERALCMD|CMD_M_PREFIX) — ECMD_OK, no turn
        await doversion();
        game.context.move = 0;
    } else if (ch === '#') {
        // C rhack doextcmd: ext_tlist then cmdq_add_ec + cmdq_shift so the
        // resolved command is first on CQ_REPEAT (ahead of getobj keys).
        const extRes = await doextcmd();
        const extTab = game.ext_tlist;
        game.ext_tlist = null;
        if (extTab) {
            cmdq_add_ec(CQ_REPEAT, extTab.run, extTab);
            cmdq_shift(CQ_REPEAT);
        }
        game.context.move = (extRes & ECMD_TIME) ? 1 : 0;
        if (extTab && (extTab.flags & PREFIXCMD) && !(extRes & ECMD_CANCEL)) {
            prefix_seen = extTab;
            if (extTab.txt === 'reqmenu') was_m_prefix = true;
            key = 0;
            continue;
        }
        if (extTab && (extRes & ECMD_CANCEL) && (extTab.flags & PREFIXCMD)) {
            reset_cmd_vars(true);
            return;
        }
    } else if (key === 27) {
        // Esc — cancel run/count; no message
        // C ref: cmd.c / hack.c — ESC ends running and clears multi
        if (game.context?.run || (game.multi || 0) > 0) end_running(true);
        if (game.context) game.context.command_count = 0;
        game._repeat_search = false;
        game.context.move = 0;
    } else {
        // C rhack cmdbind_get tlist path for keys the if/else missed
        // (M('?') → doextlist; other default meta binds with EXT_CMDS).
        const bound = await rhack_dispatch_bound(key, prefix_seen, was_m_prefix);
        if (bound.prefix) {
            prefix_seen = bound.prefix;
            if (bound.prefix.txt === 'reqmenu') was_m_prefix = true;
            key = 0;
            continue;
        }
        if (!bound.done) {
            // Unknown command (includes unbound space when !rest_on_space)
            // C rhack: custompline(SUPPRESS_HISTORY, "Unknown command '%s'.",
            // visctrl(key)) — Ctrl-C is "^C", not raw ETX (D-1189).
            if (game.context?.forcefight) game.context.forcefight = 0;
            if (game.context?.run || (game.multi || 0) > 0) end_running(true);
            if (game.context) game.context.command_count = 0;
            game._repeat_search = false;
            game.context.move = 0;
            await pline(`Unknown command '${visctrl(key)}'.`);
        }
    }
    return;
    } // C got_prefix_input
}

// C ref: hack.c domove — execute a movement
/**
 * C ref: hack.c u_rooted — youmonst.data->mmove == 0 (brown mold, etc.).
 * Spends the turn (leave context.move); does not step. Named omissions:
 * Is_airlevel / Is_waterlevel "in place" (Levitation alone covers flight).
 */
async function u_rooted() {
    const data = game.youmonst?.data;
    if (!data || (data.mmove | 0)) return false;
    const u = game.u || {};
    const lev = !!(u.Levitation || u.HLevitation || u.ELevitation);
    await pline(`You are rooted ${lev ? 'in place' : 'to the ground'}.`);
    nomul(0);
    return true;
}

async function domove(dx, dy) {
    const u = game.u;
    const forcefight = !!game.context?.forcefight;
    // C ref: hack.c domove — clear succeeded; clear attempting in finally
    game.domove_succeeded = 0;
    let smudgeCoords = null;

    try {
    // C ref: hack.c set_move_cmd — #reqmenu / m-prefix → nopick for this move
    if (game.iflags?.menu_requested) {
        if (!game.context) game.context = {};
        game.context.nopick = 1;
        game.iflags.menu_requested = false;
    }

    // C sets u.dx/u.dy before the blocked-move check (used by lookaround/run)
    u.dx = dx;
    u.dy = dy;
    u.ux0 = u.ux;
    u.uy0 = u.uy;

    // C ref: hack.c domove_core — carrying_too_much before swallow/attack
    if (await carrying_too_much()) {
        if (game.context?.run) end_running(true);
        return;
    }

    let newx;
    let newy;
    let mtmp;

    // C ref: hack.c domove_core — swallowed: zero dx/dy, u_on_newpos onto
    // ustuck, attack engulfer; skip impaired_movement / m_at walk path.
    // Named omissions still ahead of the non-swallow arm:
    // air_turbulence, slippery_ice_fumbling, escape_from_sticky_mon.
    if ((u.uswallow | 0) && u.ustuck) {
        u.dx = 0;
        u.dy = 0;
        newx = u.ustuck.mx | 0;
        newy = u.ustuck.my | 0;
        u_on_newpos(newx, newy);
        mtmp = u.ustuck;
    } else {
        // C ref: hack.c domove_core — impaired_movement after ux+dx
        // (Confusion/Stunned may rn2(5) then confdir).
        if (impaired_movement()) {
            if (game.context?.run) end_running(true);
            return;
        }
        // C hack.c:2371 / :2750–2758 — water_friction via water_turbulence,
        // then move_out_of_bounds, then avoid_running_into_trap_or_liquid.
        // Named: air_turbulence, slippery_ice_fumbling, escape_from_sticky_mon.
        if (await water_turbulence()) {
            if (game.context?.run) end_running(true);
            return;
        }
        newx = (u.ux | 0) + (u.dx | 0);
        newy = (u.uy | 0) + (u.dy | 0);
        if (await move_out_of_bounds(newx, newy)) return;
        if (await avoid_running_into_trap_or_liquid(newx, newy)) return;

        // C ref: hack.c domove_core — m_at / run-stop / attackmon BEFORE test_move
        // (closed_door / testdiag / rock). Diagonal intact-doorway bans must not
        // suppress attacking a monster on an adjacent cell (seed0012 @12439).
        // Named omissions: displacer swap; domove_bump_mon; mundetected Wait!;
        // full mon_visible Blind_telepat / Protection_from_shape amulet prop.
        mtmp = mon_at(newx, newy);
        const destLoc = game.level?.at?.(newx, newy);
        // C: forcefight with no mon, OR glyph_is_invisible(glyph_at) &&
        // !m_at && !nopick → fight_empty (hack.c `:2242–2245`). Use
        // gbuf (disp_glyph), not leftover remembered.invisible.
        if ((forcefight && !mtmp)
            || (glyph_is_invisible_id(destLoc?.disp_glyph)
                && !mtmp && !game.context?.nopick)) {
            // C hack.c:2804–2811 — ironbars then web then empty.
            if (await domove_fight_ironbars(newx, newy)) {
                if (game.context?.run) end_running(true);
                game.context.move = 1;
                game.kickedloc = { x: 0, y: 0 };
                return;
            }
            if (await domove_fight_web(newx, newy)) {
                if (game.context?.run) end_running(true);
                game.context.move = 1;
                game.kickedloc = { x: 0, y: 0 };
                return;
            }
            await domove_fight_empty(newx, newy);
            if (game.context?.run) end_running(true);
            game.context.move = 1;
            game.kickedloc = { x: 0, y: 0 };
            return;
        }
        // C: don't attack if running and can see the non-safemon (pets ok).
        // forcefight never reaches this arm. Confdir into a visible hostile
        // must stop the run here — else JS burns a hit-roll rn2(20) while C
        // returns for nhgetch (seed0002 @11309).
        if (mtmp && !is_safemon(mtmp) && game.context?.run && !forcefight) {
            const Blind = !!(u.Blind || u.ublind
                || (((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0)));
            const ap = M_AP_TYPE(mtmp);
            const seenAsMon = (ap !== M_AP_FURNITURE && ap !== M_AP_OBJECT)
                || !!(u.Protection_from_shape_changers);
            if ((!Blind && mon_visible(mtmp) && seenAsMon) || sensemon(mtmp)) {
                nomul(0);
                game.context.move = 0;
                return;
            }
        }
    }

    if (mtmp) {
        // C: domove_attackmon_at → do_attack (safemon may return false → swap)
        // Swallowed path: mtmp is ustuck; still goes through do_attack.
        if (await do_attack(mtmp)) {
            if (game.context?.run) end_running(true);
            return;
        }
        // safemon displace: fall through; swap after test_move succeeds
        // (not when swallowed — engulfer is never safemon displace)
    } else {
        // C hack.c `:2813` — unmap_invisible after fight_empty, before
        // u_rooted. Skipped when displaceu (safemon swap).
        unmap_invisible(newx, newy);
    }

    // C ref: hack.c domove_core — after attack path, before trapmove:
    // u_rooted (mmove==0) spends the turn without stepping (D-0928 #1106).
    if (await u_rooted()) {
        if (game.context?.run) end_running(true);
        return;
    }

    // C ref: hack.c domove_core — ParanoidTrap → avoid_trap_andor_region
    // after u_rooted, before u.utrap/trapmove (D-1187).
    if (((game.flags?.paranoia_bits | 0) & PARANOID_TRAP) !== 0) {
        if (await avoid_trap_andor_region(newx, newy)) return;
    }

    // C ref: hack.c domove_core — u.utrap → trapmove before test_move
    // (attack already handled above; displaceu false when trapped).
    // Stuck / same-spot escape: return without context.move=0 (turn spends).
    if (u.utrap) {
        const moved = await trapmove(newx, newy, null);
        if (!(u.utrap | 0)) {
            if (game.disp) game.disp.botl = true;
            if (game.flags) game.flags.botl = true;
            // C: reset_utrap(TRUE) — Lev/Fly restore msgs deferred
            u.utrap = 0;
            u.utraptype = 0;
        }
        if (!moved) return;
    }

    // C ref: hack.c test_move — closed_door autoopen / orthogonal bump
    // Passes_walls / ooze / Underwater / tunnels / Blind feel_location /
    // steed lead-through deferred (named in c-js-map turns).
    // Fumbling ≡ Fumbling() H||E (D-0691/D-0696) — not sticky u.Fumbling.
    if (closed_door_at(newx, newy)) {
        if (!game.context) game.context = {};
        game.context.door_opened = false;
        // C: check !context.run BEFORE clearing run — rush must bump, not autoopen
        const autoopen = game.flags?.autoopen !== false;
        const impaired = !!(u.Confusion || u.Stunned || Fumbling());
        if (autoopen && !game.context.run && !impaired) {
            await doopen_indir(newx, newy);
            // C: door_opened = !closed_door; move = (pos changed) → usually 0.
            game.context.door_opened = !closed_door_at(newx, newy);
            game.context.move = 0;
            return;
        }
        // C: else if (x == ux || y == uy) — orthogonal only
        if (newx === u.ux || newy === u.uy) {
            const Blind = !!(u.Blind || u.ublind
                || (((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0)));
            if (Blind || u.Stunned || acurr(A_DEX) < 10 || Fumbling()) {
                await pline('Ouch!  You bump into a door.');
                exercise(A_DEX, false);
                // C: door_opened = move = TRUE; nomul(0) stops running
                game.context.door_opened = true;
                game.context.move = 1;
                nomul(0);
                return;
            }
            await pline('That door is closed.');
        }
        // C domove_core: !door_opened → move=0; nomul(0)
        game.context.move = 0;
        nomul(0);
        return;
    }

    // C ref: hack.c test_move :1024–1036 — IRONBARS DO_MOVE chew for
    // rust/corr/metallivore before the Passes_walls || passes_bars
    // allow (D-1270). TEST_MOVE/TRAV skip chew via blocksMove.
    const destTyp = game.level?.at(newx, newy)?.typ;
    if (destTyp === IRONBARS && test_move_hero_chews_bars()) {
        if (await still_chewing(newx, newy)) {
            // C hack.c:2843–2848 — !test_move && !door_opened
            if (game.context) game.context.move = 0;
            nomul(0);
            return;
        }
    }

    // C ref: hack.c test_move testdiag — no diagonal into intact doorway
    // (open/closed/locked; only doorless D_NODOOR/D_BROKEN allowed).
    if (u.dx && u.dy) {
        const dest = game.level?.at(newx, newy);
        if (dest && IS_DOOR(dest.typ)
            && (!doorless_door(newx, newy) || block_door(newx, newy))) {
            // C test_move testdiag: Underwater || flags.mention_walls
            if ((u.uinwater | 0) || game.flags?.mention_walls) {
                await pline("You can't move diagonally into an intact doorway.");
            }
            if (game.context?.run) end_running(true);
            game.context.move = 0;
            return;
        }
        // C: diagonal out of a doorway that still has a door
        const here = game.level?.at(u.ux, u.uy);
        if (here && IS_DOOR(here.typ)
            && (!doorless_door(u.ux, u.uy) || false /* block_entry deferred */)) {
            if (game.flags?.mention_walls) {
                await pline("You can't move diagonally out of an intact doorway.");
            }
            if (game.context?.run) end_running(true);
            game.context.move = 0;
            return;
        }
    }

    if (blocksMove(newx, newy)) {
        // Can't move there — end a run so lookaround/continue_run don't
        // keep going in the previous direction with stale multi.
        if (game.context?.run) end_running(true);
        // C ref: hack.c test_move — DO_MOVE + mention_walls on rock/bars
        const bloc = game.level?.at(newx, newy);
        if (bloc && (IS_OBSTRUCTED(bloc.typ) || bloc.typ === IRONBARS)) {
            await mention_walls_obstructed(newx, newy);
        }
        // out-of-bounds is move_out_of_bounds (D-1800), not this bump
        game.context.move = 0;
        return;
    }

    // C ref: hack.c test_move — after dest obstacles, before boulder:
    // dx&&dy && bad_rock flanks → cant_squeeze_thru. Case 3 = Sokoban
    // "cannot pass that way." Must not run when dest is IS_OBSTRUCTED
    // (C returns earlier in that arm — often silent without mention_walls).
    if (u.dx && u.dy) {
        const ym = game.youmonst;
        if (ym?.data
            && bad_rock(ym.data, u.ux, newy)
            && bad_rock(ym.data, newx, u.uy)) {
            const why = cant_squeeze_thru(ym);
            if (why) {
                if (why === 3) {
                    await pline('You cannot pass that way.');
                } else if (why === 2) {
                    await pline('You are carrying too much to get through.');
                } else if (why === 1) {
                    await pline('Your body is too large to fit through.');
                }
                if (game.context?.run) end_running(true);
                game.context.move = 0;
                return;
            }
        }
    }

    // C hack.c test_move 1216–1230 — sobj_at(BOULDER) && (Sokoban ||
    // !Passes_walls): run>=2 abort before moverock (D-1226). TEST_TRAV
    // excluded in C; this is DO_MOVE. Passes_walls && !Sokoban skips the
    // whole arm (walk onto the boulder). cannot_push squeeze D-1239;
    // giant pickup/maneuver D-1253; nopick m-dir over/against D-1262.
    if (test_move_boulder_is_blocking(newx, newy)) {
        // C test_move starts door_opened = FALSE; moverock may set it.
        if (game.context) game.context.door_opened = false;
        if (test_move_run_blocked_by_boulder(newx, newy)) {
            if (game.flags?.mention_walls) {
                await pline_dir(
                    xytodir(u.dx | 0, u.dy | 0),
                    'A boulder blocks your path.',
                );
            }
            if (!game.context?.door_opened) {
                if (game.context) game.context.move = 0;
                nomul(0);
            }
            return;
        }
        const mr = await moverock();
        if (mr < 0) {
            // C hack.c:2843–2848 — !test_move keeps move when door_opened
            // (nopick in-way learned a glyph; D-1262).
            if (!game.context?.door_opened) {
                if (game.context?.run) end_running(true);
                game.context.move = 0;
            }
            return;
        }
        // moverock pushed boulder(s); fall through to occupy vacated cell
    }

    // C ref: hack.c swim_move_danger — after test_move, before occupying cell
    if (await swim_move_danger(newx, newy)) {
        if (game.context?.run) end_running(true);
        game.context.move = 0;
        nomul(0);
        return;
    }

    // C ref: hack.c domove — Punished → drag_ball before occupying cell;
    // cause_delay → nomul(-2) after spoteffects.
    let bc_control = 0;
    let ballx = 0, bally = 0, chainx = 0, chainy = 0;
    let cause_delay = false;
    let bc_picked = false;
    // C: Punished ≡ (uball != 0)
    if (u.uball && !(u.uswallow | 0)) {
        const drag = await drag_ball(newx, newy, true);
        if (!drag.ok) {
            if (game.context?.run) end_running(true);
            // C: drag_ball failure returns without clearing move when jerked;
            // encumber path also returns — leave context.move as-is for turn.
            return;
        }
        bc_control = drag.bc_control;
        ballx = drag.ballx;
        bally = drag.bally;
        chainx = drag.chainx;
        chainy = drag.chainy;
        cause_delay = !!drag.cause_delay;
        bc_picked = true;
    }
    const put_bc = () => {
        if (bc_picked) move_bc(0, bc_control, ballx, bally, chainx, chainy);
        bc_picked = false;
    };

    /* C hack.c:2866–2868 — Check regions entering/leaving after
     * drag_ball, before m_at / occupy. Gas NO_CALLBACK never
     * rejects; still updates REG_HERO_INSIDE (D-1157). C returns
     * without move_bc put-down. dothrow hurtle_step is D-1165;
     * do.c goto_level is D-1166. youmonst m_postmove_effect is
     * D-1167 (after occupy). allmain m_everyturn_effect youmonst
     * is D-1175 (fog at u.ux, not this walk trail). */
    if (!(await in_out_region(newx, newy))) {
        return;
    }

    const oldx = u.ux, oldy = u.uy;

    // C hack.c:2870 then 2874–2927 — m_at before occupy; swap after
    // m_postmove_effect. Ceiling hiders skip swap (falling-monster).
    mtmp = mon_at(newx, newy);

    // Move the hero. C hack.c:2874–2884 — occupy, then
    // m_postmove_effect(&youmonst) at u.ux0, then usteed mx/my.
    u.ux = newx;
    u.uy = newy;
    await m_postmove_effect(game.youmonst);
    if (u.usteed) {
        u.usteed.mx = newx;
        u.usteed.my = newy;
    }

    if (mtmp && is_safemon(mtmp)
        && !(is_hider(mtmp.data) && mtmp.mundetected)) {
        if (!(await domove_swap_with_pet(mtmp, newx, newy))) {
            u.ux = u.ux0;
            u.uy = u.uy0;
            if (u.usteed) {
                u.usteed.mx = u.ux;
                u.usteed.my = u.uy;
            }
        }
    }

    const did_step = (u.ux !== u.ux0 || u.uy !== u.uy0);
    // C hack.c:2964–2973 — only when ux0!=ux (failed swap bounces)
    if (did_step) {
        game.domove_succeeded |= (game.domove_attempting || 0)
            & (DOMOVE_RUSH | DOMOVE_WALK);
        smudgeCoords = { oldx, oldy, newx, newy };
    }

    // C ref: hack.c domove — check_leash(u.ux0, u.uy0) after place, before
    // newsym/vision (D-1005). Runs even when swap bounced.
    await check_leash(u.ux0 | 0, u.uy0 | 0);

    // C ref: dungeon.c u_on_newpos — same-level → see_nearby_objects
    // (upgrade generic potion/gem/spellbook glyphs when within neardist).
    if (did_step && !u.Blind && !u.Hallucination && !u.uswallow) {
        see_nearby_objects();
    }

    // C ref: hack.c domove — clear kickedloc after a successful move
    if (did_step) game.kickedloc = { x: 0, y: 0 };

    // C: running stops on door / obstructed / furniture (dest tmpr)
    if (game.context?.run && game.context.run < 8) {
        const tmpr = game.level?.at(newx, newy);
        if (tmpr && (tmpr.typ === DOOR || IS_OBSTRUCTED(tmpr.typ)
            || IS_FURNITURE(tmpr.typ))) {
            end_running(true);
        }
    }

    // C hack.c:2944–2947 — tread may disturb buried zombies
    hero_tread_disturb_buried_zombies();
    // C hack.c:2949–2951 — hideunder after tread (D-1245)
    hero_hideunder_after_move();
    // C hack.c:2953–2960 — mimic furniture/object unhide (D-1260)
    hero_mimic_unhide_after_move();

    // Update display. C hack.c:2964–2973 — newsym(ux0,uy0);
    // vision_recalc(1); invocation_message(); only when the hero
    // actually stepped (ux0!=ux || uy0!=uy). JS extra newsym(dest)
    // is display-only, not this peel. Same-cell occupy (swallow onto
    // ustuck) skips the clue.
    if (did_step) {
        newsym(oldx, oldy);
        vision_recalc(1);
        newsym(newx, newy);
        await invocation_message();
    }

    // C: Punished → move_bc(0, ...) put ball&chain back after move
    put_bc();

    // C: if (u.umoved) spoteffects(TRUE) — autopickup / check_here look
    if (did_step) {
        u.umoved = true;
        await spoteffects(true);
    }

    // C: delay next move because of ball dragging (after spoteffects)
    if (cause_delay) {
        nomul(-2);
        game.multi_reason = 'dragging an iron ball';
        game.nomovemsg = '';
    }
    } finally {
        // C ref: hack.c domove — smudge only when RUSH|WALK succeeded this step;
        // continue_run steps have attempting cleared → no rnd(5) (D-0359)
        if (smudgeCoords
            && ((game.domove_succeeded || 0) & (DOMOVE_RUSH | DOMOVE_WALK)) !== 0) {
            maybe_smudge_engr(
                smudgeCoords.oldx, smudgeCoords.oldy,
                smudgeCoords.newx, smudgeCoords.newy,
            );
        }
        game.domove_attempting = 0;
    }
}
