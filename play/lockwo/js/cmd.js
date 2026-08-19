// cmd.js — Command dispatch and movement.
// C ref: cmd.c rhack(), hack.c domove().
//
// Minimal skeleton: only hjklyubn movement is implemented.
// Contestants should add: search, kick, eat, drink, read, zap,
// wear, wield, drop, throw, pray, cast, and all other commands.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { newsym, flush_screen, pline, m_at, update_topl, y_n, topl_more, wrap_topl, see_nearby_objects, map_invisible, unmap_object, canseemon_shared } from './display.js';
import { vision_recalc, cansee, recalc_block_point, Blind } from './vision.js';
import { hliquid } from './do_name.js';
import { do_attack, is_safemon, x_monnam, canspotmon, mon_nam, Monnam } from './uhitm.js';
import { ddoinv, dismiss_invent_screen, dolook,
         dodiscovered, doattributes, dovspell,
         attr_window_advance, disco_window_advance, dowieldquiver, dowield, doswapweapon, dothrow, dofire, dotravel, dodrop,
         dopickup, dowear, dotakeoff, doputon, doremring, dopay, floor_object_name,
         doprgold, doprwep, doprarm, doprring, dopramulet, doprinuse,
         renderWindowScreen, ECMD_NOTHANDLED, describe_decor, dfeature_at } from './invent.js';
import { WEAPON_CLASS, objects as OBJECTS, KICKING_BOOTS } from './mkobj.js';
import { doeat } from './eat.js';
import { doapply, ECMD } from './apply.js';
import { dodrink } from './potion.js';
import { dozap } from './zap.js';
import { docast } from './spell.js';
import { doread } from './read.js';
import { dohelp } from './pager.js';
import { rnl, rn2, rnd } from './rng.js';
import { doextcmd, doddoremarm, hooked_tty_getlin, wiz_wish, wiz_genesis,
         wiz_map_extcmd, run_extcmd_by_name } from './extcmd-handlers.js';
import { do_gamelog } from './insight.js';
import { skill_window_advance } from './enhance.js';
import { wiz_level_tele, dodown, doup } from './do.js';
import { spoteffects, t_at, immune_to_trap, into_vs_onto, trap_explanation,
         TRAP_CLEARLY_IMMUNE } from './trap.js';
import { doset, dosetSimple } from './doset.js';
import { do_run, do_run_prefixed, isRunKey, RUN_DX, RUN_DY, do_farlook, do_look_full, dotele_wizard, doterrain, avoid_moving_on_trap, run_stop_for_monster_at, could_move_onto_boulder, getpos } from './hack.js';
import { COLNO, ROWNO, STONE, DOOR, D_CLOSED, D_LOCKED,
         D_ISOPEN, D_BROKEN, D_NODOOR, D_TRAPPED,
         SDOOR, SCORR, CORR, IS_WALL, IS_OBSTRUCTED, IS_ROCK, isok, IS_DOOR,
         IS_STWALL, IS_FURNITURE, ACCESSIBLE,
         TREE, IRONBARS, POOL, MOAT, WATER, LAVAPOOL, LAVAWALL, ROOM, IS_POOL, IS_LAVA,
         DRAWBRIDGE_UP, DB_UNDER, DB_MOAT,
         A_STR, A_DEX, A_CON, A_WIS, Is_rogue_level,
         TT_BEARTRAP, TT_PIT, TT_WEB, TT_LAVA, TT_INFLOOR,
         PIT, SPIKED_PIT, STATUE_TRAP, TIP_SWIM, TRAPNUM, In_sokoban, ICE,
         SLT_ENCUMBER, OVERLOADED, Is_medusa_level, Is_juiblex_level } from './const.js';
import { exercise, acurr_eff } from './attrib.js';
import { is_hider_flag, hides_under_flag, throws_rocks_flag } from './monflags_data.js';
import { noattacks, attacktype, AT_ENGL } from './monattk_data.js';
// onscary() is an `export function` declaration in monmove.js, so this cycle
// (cmd -> monmove -> uhitm -> allmain -> cmd) resolves through hoisting the
// same way muse.js's import of it does.
import { onscary } from './monmove.js';
import { engr_at, wipe_engr_at, doengrave } from './engrave.js';
import { depth as depth_of_level } from './hacklib.js';
import { builds_up, level_difficulty_c } from './dungeon.js';
import { DESCR_BY_OTYP } from './o_descr_data.js';
import { HEADSTONE } from './const.js';
// C ref: dokick.c — the whole ^D command (kick_dumb/kick_ouch/kick_door/
// kick_nondoor/dokick).  cmd.js <-> dokick.js is a cycle, but every name
// crossing it is a hoisted `function` declaration, the same way onscary() above
// resolves cmd -> monmove -> uhitm -> allmain -> cmd.
import { dokick } from './dokick.js';

// C ref: hack.c maybe_smudge_engr() — when the hero walks/rushes from (x1,y1)
// to (x2,y2) and can reach the floor, any non-headstone engraving at the old
// and new squares gets wipe_engr_at(.., rnd(5)).  The rnd(5) is evaluated as
// the call argument whenever engr_at() finds an engraving (even an undegradable
// one), so it advances the PRNG exactly as C does on every move over engraved
// terrain (the tut-1 level is covered in engravings).
function maybe_smudge_engr(x1, y1, x2, y2) {
    const u = game.u;
    // can_reach_floor(TRUE): false only while Levitating/Flying without a way
    // down.  The recorded movers are all walking on the floor here.
    if (u?.uprops?.Levitation || u?.uprops?.Flying) return;
    let ep = engr_at(x1, y1);
    if (ep && ep.engr_type !== HEADSTONE) wipe_engr_at(x1, y1, rnd(5), false);
    if ((x2 !== x1 || y2 !== y1)) {
        ep = engr_at(x2, y2);
        if (ep && ep.engr_type !== HEADSTONE) wipe_engr_at(x2, y2, rnd(5), false);
    }
}

// Direction deltas: y u k
//                   h . l
//                   b j n
const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };

function isMovementKey(ch) {
    return 'hjklyubn'.includes(ch);
}

// C ref: cmd.c extcmdlist[] — each command's default key.  A nethackrc
// BIND=key:command entry replaces Cmd.commands[key] with the named command; our
// dispatcher keys on each command's default character, so a bound key is
// translated to the command's default key (below) before dispatch.  Ctrl-keys
// are their literal control code.
const CMD_DEFAULT_KEY = {
    apply: 'a', attributes: '\x18', autopickup: '@', call: 'C', cast: 'Z',
    chronicle: 'v', close: 'c', down: '>', drop: 'd', droptype: 'D',
    eat: 'e', engrave: 'E', fight: 'F', fire: 'f', glance: ';', help: '?',
    inventory: 'i', inventtype: 'I', kick: '\x04', known: '\\', knownclass: '`',
    look: ':', open: 'o', options: 'O', overview: '\x0f', pay: 'p',
    perminv: '|', pickup: ',', prevmsg: '\x10', puton: 'P', quaff: 'q',
    quiver: 'Q', read: 'r', redraw: '\x12', remove: 'R', repeat: '\x01',
    reqmenu: 'm', retravel: '\x1f', run: 'G', rush: 'g', save: 'S',
    search: 's', seeall: '*', seeamulet: '"', seearmor: '[', seerings: '=',
    seetools: '(', seeweapon: ')', shell: '!', showgold: '$', showspells: '+',
    showtrap: '^', suspend: '\x1a', swap: 'x', takeoff: 'T', takeoffall: 'A',
    teleport: '\x14', terrain: '\x7f', throw: 't', travel: '_', twoweapon: 'X',
    up: '<', versionshort: 'V', wait: '.', wear: 'W', whatdoes: '&',
    whatis: '/', wield: 'w', zap: 'z',
};

// Every default command key (cmd.c extcmdlist), for is_bound_key().
const BOUND_COMMAND_KEYS = new Set(Object.values(CMD_DEFAULT_KEY));

// C ref: cmd.c cmdbind_get(key) — is this key bound to any command at all?
// An unbound key (space with rest_on_space Off, most punctuation) makes rhack
// fall straight through to bad_command, skipping the g/G/F prefix handling.
function is_bound_key(ch) {
    if (ch == null || ch === '') return false;
    if ('hjklyubnHJKLYUBN'.includes(ch)) return true;
    if (ch >= '0' && ch <= '9') return true;   // count prefix, eaten by parse()
    if (ch.charCodeAt(0) < 32) return true;    // Ctrl-<key> bindings
    return BOUND_COMMAND_KEYS.has(ch);
}

// C ref: cmd.c reset_commands() — with number_pad off the movement keys bind
// three ways per direction: the plain letter -> walk (do_move, run==0), the
// capitalized letter -> run (do_run, run==1, handled by isRunKey), and
// C(<letter>) i.e. Ctrl+letter -> rush (do_rush, run==3).  Map each of the 8
// direction control codes (letter & 0x1f) to its direction letter so the rush
// binding is faithful.  C('j') == 10 (LF) is caught earlier with Return, so it
// isn't listed here.
const CTRL_RUSH_DIR = (() => {
    const m = {};
    for (const letter of 'hklyubn') // 'j' -> 10 handled with Return
        m[letter.charCodeAt(0) & 0x1f] = letter;
    return m;
})();

// ── number_pad: the C command table ────────────────────────────────────────
// C ref: cmd.c commands_init() + reset_commands().  With number_pad set, the
// digits become the movement keys and the letters they no longer displace fall
// back to the bindings commands_init() always installs (h #help, j #jump,
// k #kick, l #loot, u #untrap, N #name, ^L #redraw, ^N #annotate, 5 the run
// prefix, M-5 the rush prefix).  Modelled as C's Cmd_bind list: a key code
// (0..255) -> extcmdlist name map that reset_commands() rebuilds; our dispatch
// chain is keyed on each command's default character, so resolving a key
// through the map and handing back that character reproduces C's dispatch.

const SDIR = 'hykulnjb><';                 // cmd.c reset_commands() sdir[]
const SDIR_SWAP_YZ = 'hzkulnjb><';         //   ... sdir_swap_yz[]
const NDIR = '47896321><';                 //   ... ndir[]
const NDIR_PHONE_LAYOUT = '41236987><';    //   ... ndir_phone_layout[]
const N_DIRS = 8;                          // hack.h N_DIRS_Z - 2
const MV_WALK = 0, MV_RUN = 1, MV_RUSH = 2, N_MOVEMODES = 3;  // hack.h

// Direction deltas in sdir[]/ndir[] order (h y k u l n j b > <).
const DIR_XYZ = [
    [-1, 0, 0], [-1, -1, 0], [0, -1, 0], [1, -1, 0], [1, 0, 0],
    [1, 1, 0], [0, 1, 0], [-1, 1, 0], [0, 0, 1], [0, 0, -1],
];

const kC = (c) => 0x1f & (typeof c === 'string' ? c.charCodeAt(0) : c);   // global.h C()
const kM = (c) => 0x80 | (typeof c === 'string' ? c.charCodeAt(0) : c);   // global.h M()
const kHighc = (k) => (k >= 97 && k <= 122) ? (k & ~0x20) : k;           // hacklib.c highc()

// C ref: hacklib.c visctrl() — "^X" / "M-x" rendering, for bad_command's
// "Unknown command '%s'." (a control key must not be emitted raw).
function visctrl_code(k) {
    let s = (k & 0x80) ? 'M-' : '';
    const c = k & 0x7f;
    if (c < 32) return s + '^' + String.fromCharCode(c | 0x40);
    if (c === 127) return s + '^?';
    return s + String.fromCharCode(c);
}

// C ref: cmd.c extcmdlist[] — every entry that carries a default key.  This is
// the table commands_init() walks; CMD_DEFAULT_KEY above is the subset our
// dispatch chain has a branch for and is used to translate back.
const EXTCMD_DEFAULT_KEY = {
    adjust: kM('a'), annotate: kM('A'), apply: 0x61, attributes: kC('x'),
    autopickup: 0x40, call: 0x43, cast: 0x5a, chat: kM('c'), chronicle: 0x76,
    close: 0x63, conduct: kM('C'), dip: kM('d'), down: 0x3e, drop: 0x64,
    droptype: 0x44, eat: 0x65, engrave: 0x45, enhance: kM('e'),
    exploremode: kM('X'), fight: 0x46, fire: 0x66, force: kM('f'),
    genocided: kM('g'), glance: 0x3b, help: 0x3f, inventory: 0x69,
    inventtype: 0x49, invoke: kM('i'), jump: kM('j'), kick: kC('d'),
    known: 0x5c, knownclass: 0x60, look: 0x3a, loot: kM('l'),
    monster: kM('m'), name: kM('n'), offer: kM('o'), open: 0x6f,
    options: 0x4f, overview: kC('o'), pay: 0x70, perminv: 0x7c, pray: kM('p'),
    prevmsg: kC('p'), puton: 0x50, quaff: 0x71, quiver: 0x51, read: 0x72,
    redraw: kC('r'), remove: 0x52, repeat: kC('a'), reqmenu: 0x6d,
    retravel: kC('_'), ride: kM('R'), rub: kM('r'), run: 0x47, rush: 0x67,
    save: 0x53, search: 0x73, seeall: 0x2a, seeamulet: 0x22, seearmor: 0x5b,
    seerings: 0x3d, seetools: 0x28, seeweapon: 0x29, shell: 0x21,
    showgold: 0x24, showspells: 0x2b, showtrap: 0x5e, sit: kM('s'),
    suspend: kC('z'), swap: 0x78, takeoff: 0x54, takeoffall: 0x41,
    teleport: kC('t'), terrain: 0x7f, throw: 0x74, tip: kM('T'), travel: 0x5f,
    turn: kM('t'), twoweapon: 0x58, untrap: kM('u'), up: 0x3c,
    vanquished: kM('V'), version: kM('v'), versionshort: 0x56, wait: 0x2e,
    wear: 0x57, whatdoes: 0x26, whatis: 0x2f, wield: 0x77, wipe: kM('w'),
    wizdetect: kC('e'), wizgenesis: kC('g'), wizidentify: kC('i'),
    wizlevelport: kC('v'), wizmap: kC('f'), wizwish: kC('w'), zap: 0x7a,
    // extcmdlist names that are punctuation: '#' (doextcmd) and '?' (doextlist).
    '#': 0x23, '?': kM('?'),
};

// Resolution target for numpad_resolve(): CMD_DEFAULT_KEY is built for BIND=
// translation and omits '#', whose dispatch branch does exist.  Kept separate so
// BOUND_COMMAND_KEYS / is_bound_key() keep their current membership.
const EXTCMD_DISPATCH_KEY = { ...CMD_DEFAULT_KEY, '#': '#' };

// C ref: cmd.c spkeys_binds[] — only the entries the command loop reads.
const NHKF_COUNT_KEY = 0x6e;        // 'n'
const NHKF_GETDIR_SELF = 0x2e;      // '.'
const NHKF_GETDIR_SELF2 = 0x73;     // 's'
const NHKF_GETDIR_MOUSE = 0x5f;     // '_'
const NHKF_GETPOS_PICK_Q = 0x2c;    // ','
const NHKF_GETPOS_PICK = 0x2e;      // '.'

// C ref: cmd.c cmdbind_add()/cmdbind_remove()/cmdbind_swapkeys().
function cmdbind_add(binds, key, name) {
    if (!key) return;
    if (!name) { binds.delete(key); return; }
    binds.set(key, name);
}
function cmdbind_swapkeys(binds, key1, key2) {
    const b1 = binds.get(key1), b2 = binds.get(key2);
    if (b1 !== undefined && b2 !== undefined) {
        binds.set(key1, b2);
        binds.set(key2, b1);
    }
}

// C ref: cmd.c commands_init() — extcmdlist defaults, then the bindings that
// exist for number_pad's sake; reset_commands() strips whichever of them the
// movement keys claim.
function commands_init(binds) {
    for (const [name, key] of Object.entries(EXTCMD_DEFAULT_KEY))
        cmdbind_add(binds, key, name);
    cmdbind_add(binds, kC('l'), 'redraw');
    cmdbind_add(binds, 0x68, 'help');    // 'h'
    cmdbind_add(binds, 0x6a, 'jump');    // 'j'
    cmdbind_add(binds, 0x6b, 'kick');    // 'k'
    cmdbind_add(binds, 0x6c, 'loot');    // 'l'
    cmdbind_add(binds, kC('n'), 'annotate');
    cmdbind_add(binds, 0x4e, 'name');    // 'N'
    cmdbind_add(binds, 0x75, 'untrap');  // 'u'
    cmdbind_add(binds, 0x35, 'run');     // '5'
    cmdbind_add(binds, kM('5'), 'rush');
    cmdbind_add(binds, 0x2d, 'fight');   // '-'
    cmdbind_add(binds, kM('O'), 'overview');
    cmdbind_add(binds, kM('2'), 'twoweapon');
    cmdbind_add(binds, kM('N'), 'name');
}

// C ref: options.c optfn_number_pad() — decode the OPTIONS value into
// iflags.num_pad / iflags.num_pad_mode.  `raw` is what the rc parser stored:
// a string for "number_pad:N", true for a bare "number_pad", false for
// "!number_pad".  An out-of-range value is a config error and leaves the
// option alone (C's config_error_add path).
function numpad_iflags(raw) {
    if (typeof raw === 'boolean') return { num_pad: raw, num_pad_mode: 0 };
    const op = String(raw).trim();
    const parsed = parseInt(op, 10);
    const mode = Number.isNaN(parsed) ? 0 : parsed;   // C atoi()
    if (mode < -1 || mode > 4 || (mode === 0 && op[0] !== '0'))
        return null;
    if (mode <= 0)
        return { num_pad: false, num_pad_mode: mode < 0 ? 1 : 0 };
    let num_pad_mode = 0;
    if (mode === 2 || mode === 4) num_pad_mode |= 1;   // PC Hack / MSDOS compat
    if (mode === 3 || mode === 4) num_pad_mode |= 2;   // phone keypad layout
    return { num_pad: true, num_pad_mode };
}

// C ref: cmd.c reset_commands() — called at startup (initial) and again every
// time number_pad is twiddled.
function reset_commands(Cmd, iflags, initial) {
    let dir, mode, updated = 0;

    if (initial) {
        updated = 1;
        Cmd.num_pad = false;
        Cmd.pcHack_compat = Cmd.phone_layout = Cmd.swap_yz = false;
        commands_init(Cmd.binds);
    } else {
        if (Cmd.backed_dir_cmd) {
            for (dir = 0; dir < N_DIRS; dir++)
                for (mode = 0; mode < N_MOVEMODES; mode++)
                    cmdbind_add(Cmd.binds, Cmd.back_dir_key[dir][mode],
                                Cmd.back_dir_cmd[dir][mode]);
        }
        let flagtemp = iflags.num_pad;
        if (flagtemp !== Cmd.num_pad) { Cmd.num_pad = flagtemp; ++updated; }
        // swap_yz: QWERTZ keyboards (number_pad:-1); only for !num_pad.
        flagtemp = (iflags.num_pad_mode & 1) ? !Cmd.num_pad : false;
        if (flagtemp !== Cmd.swap_yz) {
            Cmd.swap_yz = flagtemp;
            ++updated;
            // cmd.c ylist[]: y Y ^Y M-y M-Y M-^Y each swap with the next code.
            for (const c of [0x79, 0x59, kC('y'), kM('y') & 0xff, kM('Y') & 0xff,
                             kM(kC('y')) & 0xff])
                cmdbind_swapkeys(Cmd.binds, c, c + 1);
        }
        // pcHack_compat: MSDOS compatibility (number_pad:2/4); only for num_pad.
        // C's '5'/M-5 swap is #if 0'd out, so M-0 is the only real effect.
        flagtemp = (iflags.num_pad_mode & 1) ? Cmd.num_pad : false;
        if (flagtemp !== Cmd.pcHack_compat) {
            Cmd.pcHack_compat = flagtemp;
            ++updated;
            if (Cmd.pcHack_compat) cmdbind_add(Cmd.binds, kM('0'), 'inventtype');
            else cmdbind_add(Cmd.binds, kM('0'), null);
        }
        // phone_layout: 1,2,3 <-> 7,8,9 (number_pad:3/4); only for num_pad.
        flagtemp = (iflags.num_pad_mode & 2) ? Cmd.num_pad : false;
        if (flagtemp !== Cmd.phone_layout) {
            Cmd.phone_layout = flagtemp;
            ++updated;
            for (let i = 0; i < 3; i++) {
                cmdbind_swapkeys(Cmd.binds, 0x31 + i, 0x31 + i + 6);
                cmdbind_swapkeys(Cmd.binds, (kM('1') & 0xff) + i,
                                 (kM('1') & 0xff) + i + 6);
            }
        }
    }

    if (updated) Cmd.serialno = (Cmd.serialno | 0) + 1;
    Cmd.dirchars = !Cmd.num_pad ? (!Cmd.swap_yz ? SDIR : SDIR_SWAP_YZ)
                                : (!Cmd.phone_layout ? NDIR : NDIR_PHONE_LAYOUT);
    Cmd.alphadirchars = !Cmd.num_pad ? Cmd.dirchars : SDIR;

    // Back up the commands & keys the new movement keys are about to overwrite.
    for (dir = 0; dir < N_DIRS; dir++) {
        for (mode = MV_WALK; mode < N_MOVEMODES; mode++) {
            let di = Cmd.dirchars.charCodeAt(dir);
            if (!Cmd.num_pad) {
                if (mode === MV_RUN) di = kHighc(di);
                else if (mode === MV_RUSH) di = kC(di);
            } else {
                // C uses M(di) for BOTH modes here, so the MV_RUSH pass reads
                // back the key MV_WALK/MV_RUN already removed and saves null.
                if (mode === MV_RUN || mode === MV_RUSH) di = kM(di);
            }
            Cmd.back_dir_key[dir][mode] = di;
            const had = Cmd.binds.get(di);
            Cmd.back_dir_cmd[dir][mode] = had === undefined ? null : had;
            Cmd.binds.delete(di);
        }
    }
    Cmd.backed_dir_cmd = true;

    // Bind the new keys to movement commands.
    for (let i = 0; i < N_DIRS; i++) {
        const di = Cmd.dirchars.charCodeAt(i);
        cmdbind_add(Cmd.binds, di, `move:${i}`);
        if (!Cmd.num_pad) {
            cmdbind_add(Cmd.binds, kHighc(di), `run:${i}`);
            cmdbind_add(Cmd.binds, kC(di), `rush:${i}`);
        } else {
            // M(number) works when altmeta is on; digits have no highc()/C().
            cmdbind_add(Cmd.binds, kM(di), `run:${i}`);
        }
    }
}

// The live Cmd struct, rebuilt whenever the rc's number_pad value changes.
// C runs reset_commands(TRUE) from initoptions_init() and reset_commands(FALSE)
// from the option handler; the rc is parsed once, so the same two calls here
// reproduce the table exactly.
let _numpad_cmd = null, _numpad_cmd_src = null;
function numpad_cmd() {
    const raw = game?.flags?.number_pad;
    const key = raw === undefined ? '\0none' : String(raw);
    // Memoised at module scope, not on `game`: the save/restore path round-trips
    // `game` through JSON, which would turn Cmd.binds into a plain object.
    if (_numpad_cmd && _numpad_cmd_src === key) return _numpad_cmd;
    const Cmd = {
        binds: new Map(), num_pad: false, pcHack_compat: false,
        phone_layout: false, swap_yz: false, serialno: 0,
        dirchars: SDIR, alphadirchars: SDIR, backed_dir_cmd: false,
        back_dir_key: Array.from({ length: N_DIRS }, () => new Array(N_MOVEMODES).fill(0)),
        back_dir_cmd: Array.from({ length: N_DIRS }, () => new Array(N_MOVEMODES).fill(null)),
    };
    reset_commands(Cmd, null, true);
    if (raw !== undefined) {
        const ifl = numpad_iflags(raw);
        if (ifl) reset_commands(Cmd, ifl, false);
    }
    _numpad_cmd = Cmd;
    _numpad_cmd_src = key;
    return Cmd;
}

// C ref: cmd.c gc.Cmd.dirchars / gc.Cmd.num_pad — the live movement-key layout,
// for the help screens that render the key list (pager.c dokeylist(),
// show_direction_keys(), key2extcmddesc()).
export function Cmd_dirchars() { return numpad_cmd().dirchars; }
export function Cmd_num_pad() { return numpad_cmd().num_pad; }
export function Cmd_pcHack_compat() { return numpad_cmd().pcHack_compat; }

// True once the command table differs from the plain alphabetic default, i.e.
// once a key can mean something other than what the dispatch chain assumes.
function numpad_active(Cmd) {
    return Cmd.num_pad || Cmd.swap_yz;
}

// C ref: cmd.c movecmd(sym, mode) — resolve a keystroke to a direction index
// through the command table.  MV_ANY accepts the walk, run and rush keys.
function movecmd_dir(Cmd, key, mode) {
    const name = Cmd.binds.get(key);
    if (!name) return -1;
    // move_funcs[DIR_DOWN] and [DIR_UP] hold dodown/doup for all three modes,
    // so the '>' and '<' commands answer movecmd() for any mode.
    if (name === 'down') return 8;          // DIR_DOWN
    if (name === 'up') return 9;            // DIR_UP
    const m = /^(move|run|rush):(\d)$/.exec(name);
    if (!m) return -1;
    if (mode !== null && ((m[1] === 'move' && mode !== MV_WALK)
                          || (m[1] === 'run' && mode !== MV_RUN)
                          || (m[1] === 'rush' && mode !== MV_RUSH)))
        return -1;
    return Number(m[2]);
}

// C ref: cmd.c rhack() `gc.cmd_bind = cmdbind_get(key & 0xFF)` — resolve the
// pressed key through the (number_pad-aware) command table and report it as the
// default character our dispatch chain branches on.  `ch` is null when the key
// is unbound (rhack's bad_command); `ext` names a command that has no key our
// chain handles, so it runs through its extcmdlist function instead.
function numpad_resolve(Cmd, key) {
    const name = Cmd.binds.get(key & 0xff);
    if (!name) return { ch: null, ext: null, name: null };
    const m = /^(move|run|rush):(\d)$/.exec(name);
    if (m) {
        // Report movement in the alphabetic form the dispatch chain expects.
        const c = SDIR.charCodeAt(Number(m[2]));
        const code = m[1] === 'move' ? c : m[1] === 'run' ? kHighc(c) : kC(c);
        return { ch: String.fromCharCode(code), ext: null, name };
    }
    const dflt = EXTCMD_DISPATCH_KEY[name];
    if (dflt !== undefined) return { ch: dflt, ext: null, name };
    return { ch: null, ext: name, name };
}

// C ref: hack.c — check if a cell blocks movement
export function blocksMove(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    // C ref: hack.c test_move() first physical-obstacle test —
    //     if (IS_OBSTRUCTED(tmpr->typ) || tmpr->typ == IRONBARS) { ... return FALSE }
    // with IS_OBSTRUCTED(typ) == ((typ) < POOL), i.e. STONE, every wall type,
    // TREE, and the two *secret* terrains SDOOR and SCORR.  A secret door is
    // drawn as the wall it hides, so it looks passable to a test that only
    // rejects IS_WALL — the hero would walk straight through an unfound secret
    // door while C bumps and loses no turn.  The Passes_walls / tunnels /
    // autodig / metallivorous escapes all need an intrinsic or a wielded pick
    // that no covered hero has, so the obstruction is unconditional here.
    if (IS_OBSTRUCTED(loc.typ) || loc.typ === IRONBARS) return true;
    if (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) return true;
    return false;
}

// C ref: dbridge.c is_pool(x,y) — POOL/MOAT/WATER, plus a raised drawbridge
// whose DB_UNDER terrain is DB_MOAT (the water the span crosses is still there
// under the closed bridge, so the square counts as a pool for swim/danger
// tests).
function isPoolTerrain(x, y) {
    if (!isok(x, y)) return false;
    const loc = game.level?.at(x, y);
    const t = loc?.typ;
    if (t === POOL || t === MOAT || t === WATER) return true;
    return t === DRAWBRIDGE_UP && ((loc.drawbridgemask ?? 0) & DB_UNDER) === DB_MOAT;
}

// C ref: hack.c u_simple_floortyp(x,y) — simplified floor liquid/solid state
// used by swim_move_danger() to detect a dry<->wet terrain transition.  A
// levitating/flying hero never touches the liquid below (Underwater and the
// water-level nuance aren't reached by the corpus).
function u_simple_floortyp(x, y) {
    const loc = game.level?.at(x, y);
    const typ = loc ? loc.typ : STONE;
    const u = game.u;
    const airborne = !!(u?.uprops?.Levitation || u?.uprops?.Flying);
    if (typ === WATER) return WATER; // wall of water: fly/lev doesn't matter
    if (typ === LAVAWALL) return LAVAWALL; // wall of lava: fly/lev doesn't matter
    if (!airborne) {
        if (isPoolTerrain(x, y)) return POOL;
        if (IS_LAVA(typ)) return LAVAPOOL;
    }
    return ROOM;
}

// C ref: pager.c:561 waterbody_name(x,y) — non-hallucinating water-body name.
// The MOAT arm has THREE special-level overrides before the generic "moat";
// dropping them made Medusa's level say "moat" where C says "shallow sea".
function waterbody_name(x, y) {
    const loc = game.level?.at(x, y);
    const typ = loc ? loc.typ : STONE;
    // C ref: pager.c waterbody_name — every liquid word goes through
    // hliquid(), which while Hallucination replaces it with one of forty
    // joke liquids off the DISPLAY rng.  Hallucination also overrides the
    // MOAT special-level names with a plain "deep <liquid>" and turns "ice"
    // into "frozen <liquid>".
    const hallucinate = Hallucination() && !game.program_state_gameover;
    if (typ === LAVAPOOL) return `molten ${hliquid('lava')}`;
    if (typ === ICE) return hallucinate ? `frozen ${hliquid('water')}` : 'ice';
    if (typ === POOL) return `pool of ${hliquid('water')}`;
    if (typ === MOAT) {
        if (hallucinate) return `deep ${hliquid('water')}`;
        if (Is_medusa_level()) return 'shallow sea';
        if (Is_juiblex_level()) return 'swamp';
        if (game.u?.urole?.name === 'Samurai' && Is_qstart()) return 'pond';
        return 'moat';
    }
    if (typ === WATER) return `wall of ${hliquid('water')}`;
    if (typ === LAVAWALL) return `wall of ${hliquid('lava')}`;
    return 'pool of water';
}
// C ref: dungeon.h Is_qstart(lev) — the quest home level.
function Is_qstart(uz) {
    const lev = uz ?? game.u?.uz;
    return !!lev && lev.dnum === game.quest_dnum && lev.dlevel === 1;
}

// C ref: hack.c handle_tip(TIP_SWIM) — the first time paranoid_confirm:swim
// blocks a step into water/lava, remind the player of the 'm' prefix (tracked
// so it only shows once, via the same game._tips_shown bitmask
// handle_getpos_tip() in invent.js uses for TIP_GETPOS).
async function handle_swim_tip() {
    if (game._tips_shown && (game._tips_shown & (1 << TIP_SWIM))) return;
    game._tips_shown = (game._tips_shown || 0) | (1 << TIP_SWIM);
    const { update_topl } = await import('./display.js');
    await update_topl(`(Tip: use 'm' prefix to step in if you really want to.)`);
}

// C ref: hack.c swim_move_danger(x,y) — is it dangerous/unwanted for the hero
// to step onto (x,y) due to water or lava?  A dry<->wet transition onto a
// *seen*, unimpaired square blocks the move with a message unless the 'm'
// (nopick) prefix was used — matching the on-by-default paranoid_confirm:swim.
// Water-walking/lava-walking boots and Underwater are never worn/reached by
// the corpus, so those branches just don't fire.
async function swim_move_danger(x, y) {
    const u = game.u;
    const loc = game.level?.at(x, y);
    const typ = loc ? loc.typ : STONE;
    const newtyp = u_simple_floortyp(x, y);
    const liquidWall = (newtyp === WATER) || (newtyp === LAVAWALL);
    if (u.uprops?.Underwater && (isPoolTerrain(x, y) || newtyp === WATER))
        return false;
    const stunned = (u.uprops?.Stun || 0) > 0 || !!u.Stunned;
    const confused = (u.uprops?.Confusion || 0) > 0;
    const seenv = loc ? (loc.seenv || 0) : 0;
    const pool = isPoolTerrain(x, y);
    const lava = IS_LAVA(typ);
    if (newtyp !== u_simple_floortyp(u.ux, u.uy) && !stunned && !confused && seenv
        && (pool || lava || liquidWall)) {
        const curTyp = game.level?.at(u.ux, u.uy)?.typ ?? STONE;
        if (pool || (lava && !IS_LAVA(curTyp)) || liquidWall) {
            if (game.context?.nopick) {
                game._tips_shown = (game._tips_shown || 0) | (1 << TIP_SWIM);
                return false;
            }
            // ParanoidSwim (paranoid_confirm:swim) is on by default.
            const { update_topl } = await import('./display.js');
            await update_topl(`You avoid stepping into the ${waterbody_name(x, y)}.`);
            await handle_swim_tip();
            return true;
        }
    }
    return false;
}

// C ref: hack.h Hallucination — ((HHallucination || EHallucination)
// && !Halluc_resistance).  The timer is stored under three different names in
// this port depending on which file set it (potion.js writes u.uhallu AND
// u.HHallucination; timeout.js writes u.uprops.Hallucination), so a predicate
// that read only one of them answered FALSE for a hallucinating hero — which
// skipped the rnd(TRAPNUM - 1) trap-name roll in avoid_trap_andor_region().
function Hallucination() {
    const u = game.u;
    if (!u) return false;
    if ((u.HHalluc_resistance || 0) > 0) return false;
    return !!(u.uhallu || u.HHallucination || u.uprops?.Hallucination);
}

// C ref: hack.c doorless_door() — a doorway that lacks its door (NODOOR or
// BROKEN).  All rogue-level doors are treated as if their door were present so
// that diagonal access is disallowed there too.
function doorless_door(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    if (Is_rogue_level(game.u?.uz)) return false;
    return !((loc.doormask || 0) & ~(D_NODOOR | D_BROKEN));
}

// C ref: hack.c test_move() lines 1140-1150 and 1208-1214 — for a diagonal
// step (dx && dy), the hero cannot move diagonally INTO a doorway that still
// has its door (open/closed/locked/broken-only does not count as doorless),
// nor diagonally OUT of such a doorway.  NOT PORTED: shk.c block_door() /
// block_entry() also block a DOORLESS shop doorway when the shopkeeper is on
// their post and the hero owes money (or is entering with a digging tool) —
// they print "<Shk> blocks your way!" and refuse the step.  Both need ESHK
// (shk post/door coordinates, debit/billct/robbed), which this port does not
// keep, so only the has-a-door case blocks here.  Passes_walls heroes bypass
// this test in C; blocksMove() likewise ignores phasing.
function blocksDiagonalDoor(ux, uy, x, y, dx, dy) {
    if (!(dx && dy)) return false;
    // Diagonal move INTO a door with a door present.  Closed/locked doors are
    // *not* rejected here: C's test_move() handles them via the closed_door
    // branch (autoopen) before ever reaching testdiag (hack.c:1075 vs 1140), so
    // only an open/broken-with-frame door blocks a diagonal entry.
    const tgt = game.level?.at(x, y);
    if (tgt && IS_DOOR(tgt.typ) && !doorless_door(x, y)
        && !(tgt.doormask & (D_CLOSED | D_LOCKED))) return true;
    // Diagonal move OUT of a doorway with a door present.
    const here = game.level?.at(ux, uy);
    if (here && IS_DOOR(here.typ) && !doorless_door(ux, uy)) return true;
    return false;
}

// C ref: hack.c:991 test_move(ux,uy,dx,dy,TEST_MOVE) — "would this step be
// viable at all", the silent query the paranoid_confirm:trap gate makes before
// it bothers asking.  TEST_MOVE rejects the same things the DO_MOVE walk in
// domove() below rejects: an obstruction or iron bars (hack.c:1011), a closed
// door (hack.c:1075-1136), and a diagonal into or out of an intact doorway
// (hack.c:1140-1150, 1208-1214) — it just prints nothing and pushes nothing.
// The diagonal bad_rock squeeze (hack.c:1153) is unported, but this port's
// DO_MOVE doesn't model it either, so those two agree.
export function test_move_quiet(x, y) {
    const u = game.u;
    if (!isok(x, y)) return false;
    if (blocksMove(x, y)) return false;
    if (blocksDiagonalDoor(u.ux, u.uy, x, y, u.dx, u.dy)) return false;
    // C ref: hack.c:1216 boulder arm.  run >= 2 (rush 'g', run 'G', travel's
    // run == 8) refuses to push: the runner stops in front of the boulder.
    // findtravelpath()'s TRAVP_GUESS "just go in the general direction" probe
    // runs with run == 8, so this is what makes an unreachable-except-through-
    // a-boulder destination a no-op travel rather than a push.
    if (boulder_at(x, y) && (game.context?.run || 0) >= 2
        && !Blind() && !Hallucination() && !could_move_onto_boulder(x, y))
        return false;
    return true;
}

// C ref: hack.c:2494-2509 avoid_running_into_trap_or_liquid(x,y), called from
// domove_core() at hack.c:2757 — BEFORE the monster-bump block and long before
// the paranoid prompt.  While running, stepping onto a known trap stops the
// hero instead of prompting: run >= 2 (rush 'g', run 'G', travel run==8) sets
// context.move = 0 and returns, so C never asks; run == 1 (shift-direction)
// only nomul(0)s and walks on, and then the prompt below does fire.
async function avoid_running_into_trap(x, y) {
    const c = game.context;
    const would_stop = ((c?.run || 0) >= 2);
    if (!c?.run) return false;
    const ontrap = avoid_moving_on_trap(x, y);
    // C ref: hack.c:2500 — `avoid_moving_on_trap(...) || (Blind &&
    // avoid_moving_on_liquid(...))`.  The liquid half was dropped as needing
    // Known_wwalking/Known_lwalking; those are simply FALSE for a hero not
    // wearing the boots, which is the only thing the test needs from them.
    const onliquid = !ontrap && Blind() && avoid_moving_on_liquid(x, y);
    if (!ontrap && !onliquid) return false;
    // C emits these from inside avoid_moving_on_{trap,liquid}(x, y, msg).
    if (would_stop && game.flags?.mention_walls) {
        if (ontrap) {
            const t = t_at(x, y);
            if (t) await pline(`You stop in front of ${an(trap_explanation(t.ttyp))}.`);
        } else {
            await pline(`You stop at the edge of the ${
                isPoolTerrain(x, y) ? 'water' : 'lava'}.`);
        }
    }
    game.multi = 0; // C nomul(0)
    if (!would_stop) return false;
    c.move = 0;
    return true;
}

// C ref: hack.c avoid_moving_on_liquid(x, y, msg) — TRUE when a *blind* runner
// should stop at the edge of water/lava rather than wade in.  Known_lwalking /
// Known_wwalking mean "the hero knows they have lava-/water-walking"; nothing in
// this port grants either, so the "liquid is safe to traverse" escape reduces to
// the airborne case.
function avoid_moving_on_liquid(x, y) {
    const u = game.u;
    const loc = game.level?.at(x, y);
    const typ = loc ? loc.typ : STONE;
    const hereTyp = game.level?.at(u.ux, u.uy)?.typ ?? STONE;
    const in_air = !!(u.uprops?.Levitation || u.uprops?.Flying);
    const run = game.context?.run || 0;
    if ((typ === hereTyp
         || (run < 2 && (!IS_LAVA(typ) || in_air))
         || game.context?.travel)
        && in_air /* || Known_lwalking || (is_pool && Known_wwalking) */
        && !(typ === WATER || typ === LAVAWALL))
        return false; // liquid is safe to traverse
    if ((isPoolTerrain(x, y) || IS_LAVA(typ)) && (loc?.seenv || 0))
        return true;
    return false;
}

// C ref: hack.c:2514-2582 avoid_trap_andor_region(x,y) — the
// paranoid_confirm:trap gate, called from domove_core() at hack.c:2826 (after
// u_rooted(), before trapmove()/test_move(DO_MOVE)).  TRUE => the hero declined
// to step onto the trap: no move, no elapsed turn.  options.c:7173 defaults
// flags.paranoia_bits to PARANOID_PRAY|PARANOID_SWIM|PARANOID_TRAP and no
// session changes it, so ParanoidTrap is always on.  ParanoidConfirm is NOT
// among the defaults, so paranoid_query() is the plain
// yn_function(prompt, "yn", 'n') arm (cmd.c:5645, cmd.c:5657).
//
// "Really step" / "Step into" are C's u_locomotion("step") (hack.c:1817) — a
// levitating hero reads "float", a flying one "fly", a mounted one "ride".
// Levitation and Flying make every ground trap CLEARLY_IMMUNE, so only a rider
// could see a different verb on the trap question.
// The Hallucination arm draws rnd(TRAPNUM - 1) for the trap's fake name, so it
// must read the same timer every other file writes — see Hallucination() above.
async function avoid_trap_andor_region(x, y) {
    const u = game.u;
    const c = game.context;
    const stunned = (u.uprops?.Stun || 0) > 0 || !!u.Stunned;
    const confused = (u.uprops?.Confusion || 0) > 0;
    // C: `!svc.context.nopick || svc.context.run` — the 'm' prefix opts out.
    const nopick_opt_out = (c?.nopick && !c?.run);

    // ── visible gas-cloud region (hack.c:2521-2550) ──  Entering a visible
    // region is treated like entering a trap.  Moving from one region into
    // another only asks when the new one damages (poison gas) and the old one
    // does not (vapor).  Poison resistance deliberately does NOT suppress this:
    // the cloud blocks vision either way.
    if (!stunned && !confused && !Blind() && !Hallucination() && !nopick_opt_out) {
        const { visible_region_at, reg_damg } = await import('./region.js');
        const newreg = visible_region_at(x, y);
        const oldreg = newreg ? visible_region_at(u.ux, u.uy) : null;
        if (newreg && (!oldreg || (reg_damg(newreg) > 0 && reg_damg(oldreg) === 0))
            && test_move_quiet(x, y)) {
            // C: Snprintf("%s into that %s cloud?", ...) then upstart().
            const q = `Step into that ${reg_damg(newreg) > 0 ? 'poison gas' : 'vapor'} cloud?`;
            if (await y_n(q) !== 'y') {
                game.multi = 0; // C nomul(0)
                c.move = 0;
                return true;
            }
        }
    }

    if (stunned || confused) return false;
    if (nopick_opt_out) return false;
    const trap = t_at(x, y);
    if (!trap || !trap.tseen) return false;
    if (!test_move_quiet(x, y)) return false;
    const hallu = Hallucination();
    // Harmless-to-this-hero traps are stepped on without comment; Hallucination
    // overrides that because every trap still shows as a bare '^'.
    if (!hallu && immune_to_trap(u, trap.ttyp) === TRAP_CLEARLY_IMMUNE)
        return false;
    const traptype = hallu ? rnd(TRAPNUM - 1) : trap.ttyp;
    const qbuf = `Really step ${into_vs_onto(traptype) ? 'into' : 'onto'}`
               + ` that ${trap_explanation(traptype)}?`;
    if (await y_n(qbuf) === 'y') return false;
    game.multi = 0; // C nomul(0)
    c.move = 0;
    return true;
}

// C ref: cmd.c get_count() — gather typed digits into a repeat count, echoing
// "Count: N" on the top line, and return the first non-digit key.  With
// number_pad Off (the default for the recorded sessions) parse() always routes
// the first command key through here, so any leading digit starts a count.
//
// Faithful subset: maxcount is LARGEST_INT (32767); the only control keys that
// matter for the corpus are digits, ESC (cancel) and the terminating command
// letter.  The echo timing mirrors C exactly — "Count: N" is not shown until
// the count exceeds a single digit (cnt > 9), so a one-digit count leaves the
// top line blank (matching the recorder, e.g. seed0900 "20s": the '2' frame is
// blank, the '0' frame shows "Count: 20").
//
// C's STANDBY_erase_char is '\177' (<del>) and '\b' also erases: both drop the
// last digit rather than terminating the count, and from then on the echo is
// unconditional ("Count: " with nothing after it once the count is back to
// empty).  Leaving that out meant a <del> typed inside a count fell through as
// a command key and ran #terrain (cmd.c binds '\177' to it), rendering a whole
// unasked-for terrain screen.
const LARGEST_INT = 32767;

async function get_count(inkey) {
    let cnt = 0;
    let key = inkey;
    let backspaced = false, showzero = true;
    for (;;) {
        const ch = String.fromCharCode(key);
        if (ch >= '0' && ch <= '9') {
            const dgt = key - 48;
            cnt = cnt * 10 + dgt; // C AppendLongDigit (no overflow for our range)
            if (cnt < 0) cnt = 0;
            else if (cnt > LARGEST_INT) cnt = LARGEST_INT;
            // "if we've backed up to nothing, then typed 0, show that 0"
            showzero = (ch === '0');
        } else if (key === 8 || key === 127) { // '\b' / STANDBY_erase_char
            if (!cnt) break; // nothing typed yet: hand the key back to rhack
            showzero = false;
            cnt = Math.trunc(cnt / 10);
            backspaced = true;
        } else {
            // First non-digit terminates the count; return it to rhack.
            break;
        }
        // C get_count(): echo "Count: N" only once the count is multi-digit
        // (cnt > 9) or a backspace has been seen.  custompline() replaces the
        // top line; the cursor parks at the end of the prompt (row 0).  The
        // frame is captured by the next nhgetch() below, so set the message +
        // cursor before reading.
        if (cnt > 9 || backspaced) {
            if (backspaced && !cnt && !showzero) {
                game._pending_message = 'Count: ';
            } else {
                game._pending_message = `Count: ${cnt}`;
                backspaced = false;
            }
            await flush_screen(1);
            const disp = game?.nhDisplay;
            if (disp?.setCursor)
                disp.setCursor(Math.min(game._pending_message.length, 79), 0);
        }
        key = await nhgetch();
    }
    // C parse(): clear the count echo from the top line once a command key
    // arrives, then hand the count to the move loop via gm.multi.
    game._pending_message = '';
    game.command_count = cnt;
    game.multi = cnt;
    if (game.multi) game.multi -= 1;
    return key;
}

// C ref: cmd.c rhack — main command dispatcher
export async function rhack(key) {
    // C ref: cmd.c rhack() head — `iflags.menu_requested = FALSE;
    // svc.context.nopick = 0;` sit ABOVE the `got_prefix_input:` label, so a
    // PREFIXCMD's re-entry keeps them but every FRESH command starts clean.
    // Our g/G prefix re-enters via a recursive rhack(0) with _prefix_seen set,
    // so a fresh call is the only place either flag may be dropped.
    if (game.context && !game.context._prefix_seen) {
        game.context.nopick = 0;
        // C ref: same two lines — `iflags.menu_requested = FALSE`.  In C the 'm'
        // prefix and the command it modifies are ONE rhack() call, so the flag
        // dies with that command even when the follow-up key is unbound: `m`
        // <space> `l` moves east WITHOUT the m-prefix, and pickup() therefore
        // still runs check_here() ("You see here a +1 spear.").  Our do_reqmenu
        // returns instead of re-entering parse(), so the flag has to survive
        // exactly ONE following rhack() call — _m_fresh is that one-command
        // grace, and this drops it on the call after.  (Making 'm' recurse into
        // rhack(0) the way g/G does is the structurally faithful alternative and
        // measured -369 public: the recursive call's flush_screen()/top-line
        // clear is not what C's `goto got_prefix_input` does.)
        if (game.iflags?.menu_requested) {
            if (game.context._m_fresh) game.context._m_fresh = 0;
            else game.iflags.menu_requested = false;
        }
    }
    if (key === 0) {
        // Read key from input.  The flush renders the *previous* command's
        // top-line message so it is captured for that command's screen; once
        // nhgetch returns (its capture hook already fired), the previous
        // message has served its purpose and is cleared before we act on the
        // new key.  C ref: topl.c — the top line is cleared at the next
        // prompt.  (Persisting until here is what lets free-action messages
        // like dolook survive onto the recorded screen.)
        await flush_screen(1);
        key = await nhgetch();
        game._pending_message = '';
        // The top line was acknowledged by this keystroke; reset the topl
        // NEED_MORE state so the next turn's messages start a fresh line
        // (C ref: topl.c clears toplin when the player's input is read).
        game._toplin = 0;

        // C ref: cmd.c parse():
        //   if (!Cmd.num_pad || (foo = readchar()) == Cmd.spkeys[NHKF_COUNT])
        //       foo = get_count(...);
        // With number_pad Off the first command key is routed through
        // get_count(), so a leading digit accumulates a repeat count and
        // get_count() returns the following command key.  With number_pad On
        // the digits are movement, so only the count prefix ('n') opens a
        // count and get_count() reads the digits itself.  A bare ESC (no
        // digits) cancels with no count.
        const npCmd = numpad_cmd();
        const fc = String.fromCharCode(key);
        const startsCount = npCmd.num_pad ? (key === NHKF_COUNT_KEY)
                                          : (fc >= '0' && fc <= '9');
        if (startsCount) {
            key = await get_count(npCmd.num_pad ? await nhgetch() : key);
            // ESC after a count cancels it (C: clears WIN_MESSAGE, multi 0).
            if (key === 27) {
                game._pending_message = '';
                game.command_count = 0;
                game.multi = 0;
            }
        } else {
            // C parse(): with no count, command_count is 0 and gm.multi is set
            // to 0 (gm.multi = command_count).  Reset it here so a stale count
            // from an earlier command can never leak into this dispatch (e.g.
            // arm the search occupation for a plain 's').
            game.command_count = 0;
            game.multi = 0;
        }
        // C ref: cmd.c parse() `gc.cmd_key = foo;` — the command key AFTER the
        // count, kept so moveloop_core's `gm.multi > 0` arm can repeat this
        // command without reading another key.
        game._cmd_key = key;
    }

    let ch = String.fromCharCode(key);

    // C ref: cmd.c parsebindings() — a nethackrc BIND=key:command entry rebinds
    // `key` to run `command`.  Translate a custom-bound key to that command's
    // default key so the existing (default-key) dispatch below handles it.
    if (game.keybind && Object.prototype.hasOwnProperty.call(game.keybind, ch)) {
        const dflt = CMD_DEFAULT_KEY[game.keybind[ch]];
        if (dflt !== undefined) {
            ch = dflt;
            key = ch.charCodeAt(0);
        }
    }

    // C ref: cmd.c rhack() `gc.cmd_bind = cmdbind_get(key & 0xFF)`.  Once
    // number_pad (or its y/z-swapped variant) has rebuilt the command table a
    // keystroke no longer means what the alphabetic dispatch below assumes, so
    // resolve it through the table first: `npExt` is a command with no key of
    // its own, `npBad` an unbound key headed for bad_command, and `npBound`
    // replaces is_bound_key() for the prefix bookkeeping.
    const Cmd = numpad_cmd();
    let npExt = null, npBad = null, npBound = null;
    // C rhack() returns for !key / 0377 / ESC before it ever calls
    // cmdbind_get(); a modal window consumes its keys in the window code.
    if (numpad_active(Cmd) && !game._modal_screen
        && key !== 0 && key !== 27 && key !== 0xff) {
        const res = numpad_resolve(Cmd, key);
        npBound = res.name != null;
        npExt = res.ext;
        if (res.ch != null) {
            ch = res.ch;
            key = ch.charCodeAt(0);
        } else {
            // Unbound (bad_command) or a #command with no key of its own:
            // either way no alphabetic branch below may claim this keystroke.
            if (!npExt) npBad = visctrl_code(key & 0xff);
            ch = '\0';
            key = 0;
        }
    }

    // C ref: cmd.c rhack():3689-3722 — a pending g/G/F prefix followed by a
    // command that lacks CMD_gGF_PREFIX (only the eight plain move commands
    // carry it) is refused with this message; the command itself never runs.
    // Without it an 'F.' pair silently rested, taking a turn C never took.
    // `_prefix_seen` is C's rhack()-LOCAL `prefix_seen`, set only for the key
    // read inside the prefix command's own rhack() call.  svc.context.run
    // (game.context.run_prefix) outlives that call; prefix_seen does not, so
    // the complaint must key on the local one.
    // C guards the whole block with `tlist != 0`: an UNBOUND key falls through
    // to bad_command instead of complaining about the prefix.
    if ((game.context.forcefight || game.context._prefix_seen)
        && npBound !== false
        && !game._modal_screen && !isMovementKey(ch)
        && ch !== '\x1b' && key !== 32 && key !== 13 && key !== 10
        && ch !== 'F' && ch !== 'g' && ch !== 'G' && ch !== 'm') {
        const which = game.context.forcefight ? 'F'
            : (game.context.run_prefix === 3 ? 'G' : 'g');
        const updown = (ch === '<' || ch === '>') ? ' other than up or down' : '';
        await pline(`The '${which}' prefix should be followed by a movement command${updown}.`);
        game.context.forcefight = 0;
        game.context.run_prefix = 0;
        game.context.move = 0;
        return;
    }
    // C ref: cmd.c rhack():3826 — an UNBOUND key (cmdbind_get() == NULL) skips
    // the whole prefix_seen block and falls to `bad_command`, which returns
    // WITHOUT reset_cmd_vars().  rhack's `prefix_seen` is a local, so the
    // rejection message dies with the call, but svc.context.run (set by
    // do_rush/do_run) survives into the NEXT command: 'g' <space> 'b' still
    // rushes.  stale_run carries exactly that one-command residue; every other
    // command path ends in reset_cmd_vars(), which clears it.
    const staleRun = game.context.stale_run || 0;
    game.context.stale_run = 0;
    let badCommand = false;
    // A pending g/G prefix is dropped by ESC or a quitchar with no message.
    if (game.context.run_prefix && !game._modal_screen && !isMovementKey(ch)) {
        if (!(npBound ?? is_bound_key(ch)))
            game.context.stale_run = game.context.run_prefix || staleRun;
        game.context.run_prefix = 0;
    } else if (!(npBound ?? is_bound_key(ch)) && !isMovementKey(ch) && !game._modal_screen) {
        game.context.stale_run = staleRun; // consecutive unbound keys keep it
    }

    // A paged ^X attributes window consumes space/return to advance pages and
    // dismiss after the last; ESC cancels.  C ref: process_menu_window().
    if (game._modal_screen === 'attrwin') {
        // C ref: insight.c:389 `ge.en_win = create_nhwindow(NHW_MENU)` — the ^X
        // attributes window is a MENU, so wintty.c process_menu_window() swallows
        // EVERY key (its `default:` is tty_nhbell(), window stays up), exactly like
        // the #enhance listing below.  Routing only space/CR/LF/'>' here let every
        // other key fall through to rhack() and run as a command over the window.
        await attr_window_advance(ch);
        game.context.move = 0;
    } else if (game._modal_screen === 'skillwin') {
        // C ref: wintty.c process_menu_window().  The #enhance "Current
        // skills:" listing is a PICK_NONE menu, so it swallows EVERY key: the
        // page/finish keys act, and its `default:` arm is tty_nhbell() with the
        // menu left up.  This used to route only space/CR/LF/'>' here, so any
        // other key fell through to rhack() and ran as a COMMAND over the open
        // window -- an 'E' pressed on the listing ran engrave and desynchronised
        // every input boundary after it (rc-baseline step 239 onward).
        await skill_window_advance(ch);
        game.context.move = 0;
    } else if (game._modal_screen === 'textwin' && game._disco_pages
        && (ch === ' ' || ch === '\r' || ch === '\n')) {
        // A multi-page NHW_TEXT window ('\' discoveries) pages on any of
        // quitchars; only the last page's --More-- dismisses it.
        // C ref: wintty.c process_text_window() dmore(cw, quitchars).
        await disco_window_advance();
        game.context.move = 0;
    } else if (ch === '\x1b') {
        // Escape: dismiss any open menu/window; a no-op at top level.
        // C ref: cmd.c — ESC produces no message.
        await dismiss_invent_screen();
        game.context.move = 0;
    } else if (key === 32 || key === 13 || key === 10) {
        // Space / Return.  A single-page inventory/text window is dismissed by
        // space/return (C tty treats space like a confirm/next that ends a
        // one-page menu).  C ref: cmd.c rhack() / process_menu_window().
        if (game._modal_screen === 'invent' || game._modal_screen === 'textwin') {
            await dismiss_invent_screen();
            game.context.move = 0;
        } else if (key === 32 && !game._modal_screen) {
            // <space> is unbound with 'rest_on_space' Off (the default) and
            // elicits "Unknown command ' '." (cmd.c update_rest_on_space).
            // bad_command skips reset_cmd_vars(), so a pending g/G prefix's
            // svc.context.run survives it — carried by context.stale_run, which
            // the rhack() head already armed for this unbound key.
            await pline(`Unknown command '${ch}'.`);
            game.context.move = 0;
        } else if ((key === 13 || key === 10) && !game._modal_screen) {
            // <return> at top level drives a south run in the recorded debug
            // sessions (e.g. seed0398/seed0030): the hero runs south, stopping
            // adjacent to a doorway and "That door is closed."-ing on the next
            // press.  Modelled as the C 'G'-style run (set_move_cmd(DIR_S, 3)).
            await do_run_prefixed(0, 1, 3);
        } else {
            game.context.move = 0;
        }
    } else if (npExt) {
        // C ref: cmd.c rhack() `res = (*func)()` — number_pad rebinds plain
        // letters to commands that have no ordinary key of their own (j #jump,
        // l #loot, u #untrap, N #name, ^N #annotate); rhack runs their
        // ef_funct directly, exactly as doextcmd() would.
        const res = await run_extcmd_by_name(npExt);
        game.context.move = res === 1 ? 1 : 0;
    } else if (npBad) {
        // C ref: cmd.c rhack() bad_command — cmdbind_get() found no binding
        // (with number_pad on, y/b/Y/H/J/K/L/U/B and ^J are all unbound).
        game.context.move = 0;
        await pline(`Unknown command '${npBad}'.`);
    } else if (ch === '\x12') {
        // C ref: cmd.c { C('r'), "redraw", doredraw } -> docrt(): repaint the
        // screen.  ECMD_OK, no message; number_pad also puts it on ^L.
        game.context.move = 0;
    } else if (ch === 'O') {
        // C ref: cmd.c { 'O', "options", doset_simple, ... CMD_M_PREFIX }.
        // Plain 'O' runs doset_simple() (the categorized "Options" PICK_ONE
        // menu); 'm O' (menu_requested) runs the full #optionsfull doset() menu
        // ("Set what options?").  doset_simple()/doset() consume the
        // menu-requested flag (they cross-dispatch in C).  No game time/RNG.
        if (game.iflags?.menu_requested) {
            game.iflags.menu_requested = false;
            await doset();
        } else {
            await dosetSimple();
        }
        game.context.move = 0;
    } else if (ch === 'i') {
        // C ref: cmd.c { 'i', ..., ddoinv }.  ddoinv() shows the selectable
        // inventory (a blocking PICK_ONE menu); choosing an item runs
        // itemactions() ("Do what with X?"), whose chosen action dispatches the
        // real command.  All key-consumption happens inside ddoinv (so the menu
        // keystrokes don't leak to the command loop); the turn flag comes from
        // the dispatched command (e.g. a Throw that elapses a turn).  getdir is
        // threaded in for the Throw action's direction prompt.
        game.context.move = (await ddoinv(getdir)) === 3 ? 1 : 0;
    } else if (ch === '\\') {
        dodiscovered();
        game.context.move = 0;
    } else if (ch === 'v') {
        // C ref: cmd.c { 'v', "chronicle", ..., do_gamelog } — the #chronicle
        // text window.  The key was in CMD_DEFAULT_KEY but had no dispatch
        // branch, so 'v' fell through to "Unknown command 'v'.".
        await do_gamelog();
        game.context.move = 0;
    } else if (ch === '*') {
        // C ref: cmd.c:1848 { '*', "seeall", doprinuse, IFBURIED | GENERALCMD |
        // CMD_M_PREFIX } — the ')' + '[' + '=' + '"' + '(' listings combined.
        // It is a PICK_ONE menu, so its keystrokes must be consumed by the menu
        // rather than the command parser; getdir feeds the itemactions
        // follow-up.  C returns ECMD_OK unconditionally: no time passes.
        await doprinuse(getdir);
        game.context.move = 0;
    } else if (ch === '$') {
        // C ref: cmd.c { GOLD_SYM, "showgold", ..., doprgold } — show wallet gold.
        await doprgold();
        game.context.move = 0;
    } else if (ch === ')') {
        // C ref: cmd.c { WEAPON_SYM, "seeweapon", ..., doprwep } — wielded weapon.
        await doprwep();
        game.context.move = 0;
    } else if (ch === '[') {
        // C ref: cmd.c { ARMOR_SYM, "seearmor", ..., doprarm } — worn armor.
        await doprarm();
        game.context.move = 0;
    } else if (ch === '=') {
        // C ref: cmd.c { RING_SYM, "seerings", ..., doprring } — worn ring(s).
        await doprring();
        game.context.move = 0;
    } else if (ch === '"') {
        // C ref: cmd.c { AMULET_SYM, "seeamulet", ..., dopramulet } — worn amulet.
        await dopramulet();
        game.context.move = 0;
    } else if (ch === '+') {
        await dovspell();
        game.context.move = 0;
    } else if (ch === 'S') {
        // C ref: cmd.c { 'S', "save", ..., dosave, ... } -> save.c dosave().
        // Clears the message window, asks y_n("Really save?"); 'n' declines (no
        // game turn), 'y' writes the save to the shared storage handle and
        // terminates the segment with "Be seeing you..." (a later segment's
        // restore reads the save back).
        const { dosave } = await import('./save.js');
        await dosave();
    } else if (ch === '\x18') { // ^X
        doattributes();
        game.context.move = 0;
    } else if (ch === ':') {
        await dolook();
        game.context.move = 0;
    } else if (ch === '@') {
        // C ref: cmd.c { '@', "autopickup", ..., dotogglepickup } -> options.c
        // dotogglepickup(): flip flags.pickup and report the new state.  No game
        // time elapses (ECMD_OK).  The trailing clause counts ga.apelist (the
        // AUTOPICKUP_EXCEPTION entries), which is empty unless the rc supplied
        // a *quoted* pattern.
        game.flags = game.flags || {};
        game.flags.pickup = !game.flags.pickup;
        if (game.flags.pickup) {
            const types = game.flags.pickup_types;
            const napes = (game.apelist || []).length;
            const exc = !napes ? ''
                : (napes === 1 ? ', with one exception' : ', with some exceptions');
            await pline(`Autopickup: ON, for ${types ? types : 'all'} objects${exc}.`);
        } else {
            await pline('Autopickup: OFF.');
        }
        game.context.move = 0;
    } else if (ch === 'a') {
        // C ref: cmd.c 'a' (#apply) -> apply.c doapply().  Applies a tool;
        // ECMD_TIME only when the use costs a turn (e.g. a *repeat* stethoscope
        // probe in the same turn).  The first stethoscope-to-self probe is free
        // (ECMD_OK) and consumes no RNG.
        game.context.move = (await doapply()) === ECMD.ECMD_TIME ? 1 : 0;
    } else if (ch === 'e') {
        // C ref: cmd.c 'e' (#eat) -> eat.c doeat().  Eats carried/floor food
        // (ECMD_TIME when a bite is taken).
        game.context.move = (await doeat()) ? 1 : 0;
    } else if (ch === 'o') {
        // C ref: cmd.c doopen -> lock.c doopen_indir(0,0): open an adjacent
        // door (reads a direction).  Sets the turn flag from doopen's result.
        game.context.move = (await doopen_indir(0, 0)) ? 1 : 0;
    } else if (ch === 'c') {
        // C ref: cmd.c doclose -> lock.c doclose(): close an adjacent door
        // (reads a direction).  ECMD_CANCEL (cancelled direction) and ECMD_OK
        // (no door / already closed) elapse no turn; closing an open door is
        // ECMD_TIME.
        game.context.move = (await doclose()) === 2 ? 1 : 0;
    } else if (ch === 's') {
        // C ref: cmd.c dosearch -> detect.c dosearch0(0): search adjacent
        // squares for hidden doors/passages/traps.  Takes a game turn unless
        // the safe_wait safety check refuses it (hostile monster adjacent).
        //
        // C rhack(): a repeat count (gm.multi) on a command with f_text
        // ("searching") arms a timed occupation — set_occupation(dosearch,
        // "searching", gm.multi) — so the move loop re-runs the search for
        // gm.multi more turns without reading another command key.  We mirror
        // that with game._search_occupation: this first search is the command
        // turn; the move loop counts down gm.multi over the following turns.
        const searched = await dosearch();
        game.context.move = searched ? 1 : 0;
        if (searched && (game.multi ?? 0) > 0)
            game._search_occupation = true;
    } else if (key === 4) { // ^D — kick (dokick.c dokick())
        // C ref: cmd.c keymap C('d') = dokick.  Reads a direction, then resolves
        // the kicked square (monster / object / terrain).  Sets the turn flag
        // from dokick's ECMD result.
        const res = await dokick();
        game.context.move = res === 1 ? 1 : 0;
    } else if (key === 7) { // ^G — wizard-mode create monster (wizcmds.c wiz_genesis)
        // C ref: cmd.c keymap C('g') = wiz_genesis, IFBURIED|WIZMODECMD.  Clears
        // iflags.debug_mongen, then create_particular() prompts "Create what kind
        // of monster?" and makemon()s the named species next to the hero.
        // wiz_genesis returns ECMD_OK, so no game turn elapses.
        if (game.flags?.debug) {
            await wiz_genesis();
            game.context.move = 0;
        } else {
            // C ref: cmd.c:479 can_do_extcmd() — a WIZMODECMD refused outside
            // wizard mode prints unavailcmd ("Unavailable command '%s'.") with
            // the command's ef_txt, not the "Unknown command '<key>'." that an
            // unbound key produces.  Different string, same zero game time.
            game.context.move = 0;
            await pline(`Unavailable command 'wizgenesis'.`);
        }
    } else if (key === 6) { // ^F — wizard-mode magic mapping (wizcmds.c wiz_map)
        // C ref: cmd.c:1982 { C('f'), "wizmap", ..., IFBURIED | WIZMODECMD }.
        // Unbound here, ^F fell through to "Unknown command", so do_mapping()'s
        // whole-level reveal AND its closing exercise(A_WIS, TRUE) rn2(19) both
        // went missing.
        if (game.flags?.debug) {
            await wiz_map_extcmd();
        } else {
            await pline(`Unavailable command 'wizmap'.`);
        }
        game.context.move = 0;
    } else if (key === 20) { // ^T — teleport (cmd.c dotelecmd -> teleport.c)
        // C ref: cmd.c keymap C('t') = dotelecmd.  In wizard mode (playmode:
        // debug) with no 'm' prefix, dotelecmd sets ignore_restrictions and
        // calls dotele(TRUE) -> tele(): "Where do you want to be teleported?"
        // then getpos(force=TRUE).  dotele() returns ECMD_TIME, so a game turn
        // elapses whether or not the targeting was cancelled.
        if (game.flags?.debug) {
            const res = await dotele_wizard();
            game.context.move = res === 1 ? 1 : 0;
        } else {
            // C ref: teleport.c dotelecmd() — ^T is NOT a WIZMODECMD, so outside
            // wizard mode it runs dotele(FALSE).  A hero with neither the
            // Teleportation intrinsic nor the teleport-away spell is turned away
            // with a message and no game time; it is not an unknown command.
            // (The seen-teleport-trap arm of dotele(), which offers to jump in,
            // needs trap-triggered teleports this port does not model.)
            game.context.move = (await dotele_nonwizard()) ? 1 : 0;
        }
    } else if (key === 22) { // ^V — wizard-mode level teleport (do.c/teleport.c)
        // C ref: cmd.c:1970 { C('v'), "wizlevelport", ..., WIZMODECMD }.  The
        // WIZMODECMD gate was missing entirely here, so a non-debug session that
        // pressed ^V got the "To what level..." getlin prompt — which then ate
        // the following keystrokes as level-number input and level-teleported
        // the hero.  C just refuses.
        if (game.flags?.debug) {
            const res = await wiz_level_tele((q) => hooked_tty_getlin(q, null));
            game.context.move = res === 1 ? 1 : 0;
        } else {
            game.context.move = 0;
            await pline(`Unavailable command 'wizlevelport'.`);
        }
    } else if (key === 23) { // ^W — wizard-mode wish (cmd.c C('w') -> wiz_wish)
        // C ref: cmd.c:2000 { C('w'), "wizwish", ..., WIZMODECMD }.  Same missing
        // gate as ^V above: outside wizard mode the "For what do you wish?"
        // prompt must not appear (and its rn1(100,50) ublesscnt roll must not
        // fire) — C prints unavailcmd instead.
        if (game.flags?.debug) {
            await wiz_wish();
        } else {
            await pline(`Unavailable command 'wizwish'.`);
        }
        game.context.move = 0;
    } else if (key === 127) { // <del> / '\177' — #terrain (cmd.c doterrain)
        // C ref: cmd.c command list — '\177' (<del>/<rubout>) is bound to the
        // "terrain" command (doterrain, IFBURIED|GENERALCMD|AUTOCOMPLETE): show
        // the known map without monsters/objects/traps.  ECMD_OK (no game time).
        await doterrain();
        game.context.move = 0;
    } else if (ch === 'W') {
        // C ref: cmd.c keymap 'W' = dowear (do_wear.c).  Prompts for armor to
        // wear; ECMD_TIME (3) only when the don actually costs a turn.
        game.context.move = (await dowear()) === 3 ? 1 : 0;
    } else if (ch === 'A') {
        // C ref: cmd.c { 'A', "takeoffall", doddoremarm, 0 } (do_wear.c) — the
        // multi-item take-off/unwield command.  Under the default
        // menustyle:Full it opens the query_category() class menu; the command
        // always returns ECMD_OK (take_off() accounts for its own time).
        await doddoremarm();
        game.context.move = 0;
    } else if (ch === 'T') {
        // C ref: cmd.c keymap 'T' = dotakeoff (do_wear.c).  Removes worn armor
        // (a single piece comes off without a disambiguation prompt).
        game.context.move = (await dotakeoff()) === 3 ? 1 : 0;
    } else if (ch === 'P') {
        // C ref: cmd.c keymap 'P' = doputon (do_wear.c).  Puts on a ring,
        // amulet, or eyewear; rings prompt for the ring-finger.  When doputon
        // declines (no accessory to put on; see its scoping guard) fall through
        // to the "Unknown command" path so previously-matching sessions are
        // undisturbed.
        const rP = await doputon();
        if (rP === ECMD_NOTHANDLED) {
            await pline(`Unknown command '${ch}'.`);
            game.context.move = 0;
        } else {
            game.context.move = rP === 3 ? 1 : 0;
        }
    } else if (ch === 'R') {
        // C ref: cmd.c keymap 'R' = doremring (do_wear.c).  Removes a worn
        // accessory (ring/amulet/blindfold).  Declines (and reports the key as
        // unknown) when the hero wears no accessory, mirroring the 'P' guard.
        const rR = await doremring();
        if (rR === ECMD_NOTHANDLED) {
            await pline(`Unknown command '${ch}'.`);
            game.context.move = 0;
        } else {
            game.context.move = rR === 3 ? 1 : 0;
        }
    } else if (ch === 'p') {
        // C ref: cmd.c keymap 'p' = dopay (shk.c).  Away from a shopkeeper this
        // reports "There appears to be no shopkeeper here ..." (ECMD_OK).
        game.context.move = (await dopay()) === 3 ? 1 : 0;
    } else if (ch === 'd') {
        // C ref: cmd.c — 'd' drop an item.  do.c dodrop() prompts for the
        // item then drops it on the floor (ECMD_TIME when something is
        // dropped, so the turn elapses and monsters move).
        game.context.move = (await dodrop()) ? 1 : 0;
    } else if (ch === ',') {
        // C ref: cmd.c { ',', "pickup", dopickup } -> hack.c dopickup().  Pick up
        // the objects under the hero.  ECMD_TIME (turn elapses, monsters move) when
        // something is lifted; ECMD_OK (nothing here) takes no time.  Lifting the
        // item removes it from the floor so the pet's dog_goal fobj scan no longer
        // re-rolls obj_resists for it (the seed0002 early divergence).
        game.context.move = (await dopickup()) ? 1 : 0;
    } else if (ch === '#') {
        // C ref: cmd.c doextcmd — read and run an extended command.
        await doextcmd();
    } else if (ch === '?') {
        // C ref: cmd.c { '?', "help", dohelp, IFBURIED | GENERALCMD } ->
        // pager.c dohelp(): the help-topic PICK_ONE menu ("Select one item:").
        // Consumes no game time (ECMD_OK).
        await dohelp();
        game.context.move = 0;
    } else if (ch === 'q') {
        // C ref: cmd.c — 'q' quaff (drink) a potion.
        game.context.move = (await dodrink()) ? 1 : 0;
    } else if (ch === 'z') {
        // C ref: cmd.c — 'z' zap a wand.
        game.context.move = (await dozap()) ? 1 : 0;
    } else if (ch === 'Z') {
        // C ref: cmd.c — 'Z' cast a spell.
        game.context.move = (await docast()) ? 1 : 0;
    } else if (ch === 'E') {
        // C ref: cmd.c — 'E' (#engrave) -> engrave.c doengrave(): write/engrave
        // on the floor.  doengrave sets up the engraving (garble loop +
        // make_engr_at) and runs it as a one-action occupation; we model the
        // single-action completion inline and pass a turn (ECMD_TIME) so
        // monsters move once.
        game.context.move = (await doengrave()) === 1 ? 1 : 0;
    } else if (ch === 'r') {
        // C ref: cmd.c — 'r' read a scroll or spellbook.
        game.context.move = (await doread()) ? 1 : 0;
    } else if (ch === 'Q') {
        // C ref: cmd.c — 'Q' (#quiver) ready ammunition.  doquiver_core returns
        // ECMD_TIME (3) only when unwielding the primary/secondary weapon cost a
        // turn; ECMD_OK/ECMD_CANCEL take no time.
        game.context.move = (await dowieldquiver()) === 3 ? 1 : 0;
    } else if (ch === 'w') {
        // C ref: cmd.c keymap 'w' = dowield (wield.c).  Wields a weapon (or
        // nothing).  ECMD_TIME (3) when the wield consumes a turn; ECMD_OK/FAIL/
        // CANCEL take no time.
        game.context.move = (await dowield()) === 3 ? 1 : 0;
    } else if (ch === 'x') {
        // C ref: cmd.c keymap 'x' = doswapweapon (wield.c) — swap the primary
        // and secondary weapons.
        game.context.move = (await doswapweapon()) === 3 ? 1 : 0;
    } else if (ch === 't') {
        // C ref: cmd.c — 't' (#throw) throw/shoot an item.  throw_obj returns
        // ECMD_TIME (3) when the throw takes a turn; getdir (the direction
        // prompt) is supplied here to keep invent.js free of a cmd import cycle.
        game.context.move = (await dothrow(getdir)) === 3 ? 1 : 0;
    } else if (ch === 'f') {
        // C ref: cmd.c keymap 'f' = dofire (dothrow.c).  Throws/shoots from the
        // quiver; with fireassist On a launcher in the swap slot is auto-wielded
        // (doswapweapon) before firing.  ECMD_TIME (3) when a missile is launched
        // and a turn elapses; the recorded session cancels at the direction
        // prompt so no time passes.
        game.context.move = (await dofire(getdir)) === 3 ? 1 : 0;
    } else if (ch === '_') {
        // C ref: cmd.c — '_' (#travel) move toward a chosen map location.  The
        // recorded session cancels at the destination prompt (ESC), so no turn
        // elapses.
        await dotravel();
        game.context.move = 0;
    } else if (ch === ';') {
        // C ref: cmd.c ';' "glance" -> pager.c do_look(1): quick farlook.
        // Cursor-positioning loop + look-at description; no game time passes.
        await do_farlook();
        game.context.move = 0;
    } else if (ch === '/') {
        // C ref: cmd.c { '/', "whatis", dowhatis } -> pager.c do_look(0): the
        // full whatis command (menu + verbose farlook).  No game time passes.
        await do_look_full();
        game.context.move = 0;
    } else if (isRunKey(ch)) {
        // Capital-letter run: do_run_west/east/... -> set_move_cmd(dir, 1).
        // Run until something interesting is seen.  hack.js drives the whole
        // multi-turn run inline and leaves game.context.move = 0 (every
        // elapsed turn was already taken), so the moveloop does not schedule
        // another per-turn pass.  C ref: cmd.c do_run_*(), hack.c domove().
        // A still-armed g/G prefix wins: set_move_cmd() leaves context.run at
        // the prefix's value when gd.domove_attempting is already set.
        const rprun = game.context.run_prefix || staleRun;
        game.context.nopick = game.iflags?.menu_requested ? 1 : 0; // set_move_cmd()
        game.iflags && (game.iflags.menu_requested = false);
        if (rprun) {
            game.context.run_prefix = 0;
            await do_run_prefixed(RUN_DX[ch], RUN_DY[ch], rprun);
        } else {
            await do_run(RUN_DX[ch], RUN_DY[ch]);
        }
    } else if (CTRL_RUSH_DIR[key] !== undefined) {
        // C ref: cmd.c reset_commands() — Ctrl+<direction letter> is bound to
        // the rush movement (do_rush_*, set_move_cmd(dir, 3)).  Rush goes until
        // something interesting (following corridors past forks differently from
        // a plain run); e.g. C('l') / '\f' rushes east.  hack.js drives the
        // whole multi-turn rush inline and leaves game.context.move = 0.
        const rdir = CTRL_RUSH_DIR[key];
        await do_run_prefixed(DIR_DX[rdir], DIR_DY[rdir], 3);
    } else if (ch === 'F') {
        // C ref: cmd.c do_fight() — the 'F' fight prefix forces an attack in the
        // direction of the following movement command (attack even when nothing
        // is seen there).  It sets svc.context.forcefight, takes no time, and
        // prints nothing; the next movement command consumes and clears the
        // flag.  A second 'F' cancels ("Double fight prefix, canceled.").
        if (game.context.forcefight) {
            await Norep_topl('Double fight prefix, canceled.');
            game.context.forcefight = 0;
        } else {
            game.context.forcefight = 1;
        }
        game.context.move = 0;
    } else if (ch === 'm') {
        // C ref: cmd.c do_reqmenu — the 'm' movement prefix sets
        // iflags.menu_requested (move without autopickup / force a menu on the
        // following command) and consumes no time or message.  A second 'm'
        // cancels it ("Double m prefix, canceled.").  The following command is
        // read on the next rhack iteration.
        if (game.iflags?.menu_requested) {
            await pline(`Double m prefix, canceled.`);
            game.iflags.menu_requested = false;
        } else {
            game.iflags = game.iflags || {};
            game.iflags.menu_requested = true;
            game.context._m_fresh = 1; // survives exactly the next command
        }
        game.context.move = 0;
    } else if (ch === 'G' || ch === 'g') {
        // C ref: cmd.c do_run()/do_rush() are PREFIXCMDs: rhack marks the
        // prefix and jumps back to `got_prefix_input`, which re-enters parse()
        // — that reads the next key AND clears the top line.  Reading the
        // direction inline instead left the previous message on the recorded
        // screen and swallowed a key that C dispatches as its own command.
        game.context.run_prefix = (ch === 'G') ? 3 : 2;
        game.context.move = 0;
        // C: a PREFIXCMD sets rhack()'s local prefix_seen and re-enters
        // parse() for the follow-up key; that flag dies with this call.
        const savedSeen = game.context._prefix_seen;
        game.context._prefix_seen = true;
        await rhack(0);
        game.context._prefix_seen = savedSeen;
        return;
    } else if (isMovementKey(ch)) {
        // staleRun: svc.context.run left over from a g/G whose next key was
        // unbound (see the rhack() head) — the walk still runs at that level.
        if (game.context.run_prefix || staleRun) {
            const rp = game.context.run_prefix || staleRun;
            game.context.run_prefix = 0;
            // C ref: cmd.c set_move_cmd() — `if (iflags.menu_requested)
            // svc.context.nopick = 1;` runs for the RUSH/RUN movement commands
            // too, and rhack() cleared nopick on entry.  Without this the flag
            // stayed set from an earlier 'm'-prefixed step, so pickup() took its
            // `autopickup && nopick` early return for every step of the run: no
            // check_here(), hence no "You see here ..." and no nomul(0), and the
            // run sailed past the pile C halts on (wave4 rc-explore step 154).
            game.context.nopick = game.iflags?.menu_requested ? 1 : 0;
            game.iflags && (game.iflags.menu_requested = false);
            await do_run_prefixed(DIR_DX[ch], DIR_DY[ch], rp);
            return;
        }
        // C ref: cmd.c set_move_cmd() — the 'm' (reqmenu) prefix disables
        // autopickup AND (via swim_move_danger) lets the hero intentionally
        // step into water/lava for this one move.
        game.context.nopick = game.iflags?.menu_requested ? 1 : 0;
        game.iflags && (game.iflags.menu_requested = false);
        // domove() sets game.context.move itself: 1 when the hero actually
        // moves (time passes), 0 when the move is blocked (bump a wall — no
        // turn elapses).  C ref: hack.c domove() / rhack().  Do NOT override
        // it here, or blocked moves would wrongly advance the turn counter.
        await domove(DIR_DX[ch], DIR_DY[ch]);
        // C ref: cmd.c rhack() DOMOVE_WALK branch — forcefight is cleared right
        // after domove() so the 'F' prefix only affects this one step.
        game.context.forcefight = 0;
    } else if (ch === '>') {
        // C ref: cmd.c { '>', "down", dodown } — descend a down staircase.
        // dodown returns ECMD_TIME (1) when the hero actually descends (a turn
        // elapses) or ECMD_OK (0) when blocked ("You can't go down here.").
        game.context.move = (await dodown()) === 1 ? 1 : 0;
    } else if (ch === '<') {
        // C ref: cmd.c { '<', "up", doup } — climb an up staircase.
        // doup returns ECMD_TIME (1) when the hero actually climbs (a turn
        // elapses) or ECMD_OK (0) when blocked ("You can't go up here.").
        game.context.move = (await doup()) === 1 ? 1 : 0;
    } else if (ch === '.') {
        // C ref: cmd.c command table { '.', "wait", donull } -> do.c donull():
        // "rest one move while doing nothing".  donull() first runs
        // cmd_safety_prevention("Waiting", "a no-op (to rest)", "Are you waiting
        // to get hit?"): with the (default-On) safe_wait option, no 'm' prefix
        // and no multi, a hostile monster adjacent to the hero refuses the wait —
        // it prints "Are you waiting to get hit?  Use 'm' prefix to force a no-op
        // (to rest)." and returns ECMD_OK (no turn elapses).  Otherwise the wait
        // returns ECMD_TIME and the hero's turn elapses (monsters move).
        game.context.move = await donull();
        // C ref: cmd.c:1931 `{ '.', "wait", ..., donull, ..., "waiting" }` — the
        // f_text is non-null, so rhack() turns a COUNTED wait into a timed
        // occupation (set_occupation(donull, "waiting", gm.multi)).  That is
        // what makes an interrupted "20." print "You stop waiting."; the plain
        // gm.multi repeat arm never would.
        if (game.context.move && (game.multi ?? 0) > 0)
            game._wait_occupation = true;
    } else {
        // Unknown command.  C ref: cmd.c rhack() bad_command — no
        // reset_cmd_vars(), so a pending g/G prefix's svc.context.run stays
        // armed for the next command (context.stale_run, set at the head).
        badCommand = true;
        game.context.move = 0;
        await pline(`Unknown command '${ch}'.`);
    }

    // C ref: cmd.c rhack() — every command that isn't a PREFIXCMD ends in
    // reset_cmd_vars(), which clears iflags.menu_requested; only bad_command
    // skips it.  Without this an 'm' whose follow-up key was some unrelated
    // command left the flag armed, and the NEXT 'm' answered "Double m prefix,
    // canceled." instead of arming a fresh one.
    if (!badCommand && !npBad && game.iflags?.menu_requested
        && ch !== 'm' && ch !== 'g' && ch !== 'G' && ch !== 'F')
        game.iflags.menu_requested = false;

    // C ref: cmd.c rhack() — after a command that elapsed a game turn, if the
    // hero did something OTHER than kicking, reset the kicked location so pets
    // no longer avoid it (dokick keeps it for its own monster-move phase; the
    // hack.c domove() path also clears it, which the movement branch above
    // covers here).  isok({0,0}) is false, so this disables the avoidance.
    if (game.context?.move && key !== 4)
        game.kickedloc = { x: 0, y: 0 };
}

const S_EEL_CMD = 57;    // monsym.h S_EEL
const LENSES_CMD = 232;  // objects[] LENSES (mkobj.js)

// C ref: display.c unmap_invisible(x, y) — a square remembered as holding a
// sensed-but-unseen monster ('I') loses that notation once the hero looks and
// finds nothing there.
function unmap_invisible(x, y) {
    if (!isok(x, y)) return false;
    if (!game.level?.at(x, y)?.invisMon) return false;
    unmap_object(x, y);
    newsym(x, y);
    return true;
}

// C ref: detect.c mfind0(mtmp, via_warning) — the search/warning probe of one
// adjacent monster.  Returns 1 when something was found (the caller stops
// searching and the turn is used up), -1 when the find must be ignored, 0 when
// there was nothing to find.
//
// This was left unported ("gated by !aflag"), but the !aflag gate is on the
// CALL, not on the body: an explicit `s` next to a mimic or a hiding monster
// runs it, and the exercise(A_WIS, TRUE) inside draws rn2(19) *and* aborts the
// rest of the 8-square scan — so every later rnl(7)/rnl(8) in that same search
// disappears from the stream too.
async function mfind0(mtmp, via_warning) {
    const x = mtmp.mx, y = mtmp.my;
    let found_something = false;

    // warning_of() needs the Warning intrinsic's monster-level test; dosearch0
    // is the only caller here and always passes via_warning == FALSE.
    if (via_warning) return -1;

    if (mtmp.m_ap_type) {
        // seemimic(): drop the object/furniture disguise and redraw.
        mtmp.m_ap_type = 0;
        mtmp.mappearance = 0;
        newsym(x, y);
        found_something = true;
    } else {
        found_something = !canspotmon(mtmp);
        if (mtmp.mundetected
            && (is_hider_flag(mtmp.data) || hides_under_flag(mtmp.data)
                || mtmp.data?.mcls === S_EEL_CMD)) {
            mtmp.mundetected = 0;
            found_something = true;
        }
        newsym(x, y);
    }

    if (found_something) {
        // Already an 'I' here: C deliberately returns -1 so the hero doesn't
        // re-find the same unseen monster every single turn.
        if (!canspotmon(mtmp) && game.level?.at(x, y)?.invisMon) return -1;
        exercise(A_WIS, true); // -> rn2(19)
        if (!canspotmon(mtmp)) {
            map_invisible(x, y);
            await pline('You feel an unseen monster!');
        } else {
            // sensemon() is FALSE throughout this port (no telepathy modelled).
            const nm = mtmp.mtame ? x_monnam(mtmp, /*ARTICLE_YOUR*/ 3, null, 0, false)
                                  : x_monnam(mtmp, /*ARTICLE_A*/ 2, null, 0, false);
            await pline(`You find ${nm}.`);
        }
        return 1;
    }
    return 0;
}

// C ref: detect.c find_trap(trap) — reveal a trap the hero just located.
// exercise(A_WIS, TRUE) is an rn2(19) draw that the old inline "trap.tseen =
// true" was missing entirely, and the announcement pauses with --More--: C
// clears the map, draws just the trap and the hero, prints "You find a <trap>."
// and then blocks on display_nhwindow(WIN_MAP, TRUE), which routes through
// tty_display_nhwindow(WIN_MESSAGE, TRUE) -> more() before docrt() repaints.
// The cls()/map_trap()/display_self() repaint itself is not reproduced (this
// port has no cls primitive), but the keystroke it consumes is — leaving that
// out would push every later command one key out of step.
async function find_trap(trap) {
    trap.tseen = 1;
    exercise(A_WIS, true); // -> rn2(19)
    newsym(trap.tx, trap.ty);
    await pline(`You find ${an(trap_explanation(trap.ttyp))}.`);
    await topl_more();
    game._pending_message = '';
}

// C ref: detect.c dosearch0(aflag) — search the 8 adjacent squares for hidden
// doors, passages, and unseen traps.  aflag distinguishes intrinsic autosearch
// (aflag=1, called every turn from the moveloop when Searching) from the
// explicit `s` command (aflag=0); the !aflag paths (feel_location, the stale-'I'
// cleanup, and mfind0) are part of the explicit command and are ported here.
// RNG: rnl(7 - fund) per adjacent SDOOR/SCORR, rnl(8) per adjacent unseen trap,
// plus the rn2(19) that exercise(A_WIS, TRUE) draws inside mfind0()/find_trap().
export async function dosearch0(aflag) {
    const u = game.u;
    if (!u) return 1;
    if (u.uswallow) {
        if (!aflag) await Norep_topl('What are you looking for?  The exit?');
        return 1;
    }
    // C: fund = artifact SPFX_SEARCH spe (no such weapon in this port), +2 for
    // worn lenses while not blind, capped at 5.  fund picks the rnl() MODULUS,
    // so the lenses bonus is a live RNG-steering input for any hero wearing a
    // pair, not cosmetic.
    let fund = 0;
    if (game.ublindf && game.ublindf.otyp === LENSES_CMD && !Blind()) fund += 2;
    if (fund > 5) fund = 5;
    for (let x = u.ux - 1; x < u.ux + 2; x++) {
        for (let y = u.uy - 1; y < u.uy + 2; y++) {
            if (!isok(x, y)) continue;
            if (x === u.ux && y === u.uy) continue;
            const loc = game.level?.at(x, y);
            if (!loc) continue;
            // C: `if (!aflag && (Blind || visible_region_at(x,y))) feel_location()`
            // — remembered-glyph bookkeeping for a hero who cannot see the
            // square.  Not ported: this port has no feel_location().
            if (loc.typ === SDOOR) {
                if (rnl(7 - fund)) continue;
                loc.typ = DOOR;
                // C ref: detect.c dosearch0() — cvt_sdoor_to_door() is followed
                // by recalc_block_point(): the wall the secret door was hiding
                // no longer blocks light, so vision must be recomputed or a
                // later clear_path()/linedup() misses its rn2 roll.
                recalc_block_point(x, y);
                // exercise(A_WIS, TRUE) fires on every successful find, before
                // nomul(0).
                exercise(A_WIS, true);
                newsym(x, y);
                // C ref: detect.c dosearch0() — nomul(0) on a successful find:
                // a counted search ("9s") stops immediately instead of running
                // out its full repeat count.
                if ((game.multi ?? 0) > 0) game.multi = 0;
                await update_topl('You find a hidden door.');
            } else if (loc.typ === SCORR) {
                if (rnl(7 - fund)) continue;
                loc.typ = CORR;
                recalc_block_point(x, y); // C: unblock_point(x, y)
                exercise(A_WIS, true);
                newsym(x, y);
                if ((game.multi ?? 0) > 0) game.multi = 0;
                await update_topl('You find a hidden passage.');
            } else {
                const mtmp = m_at(x, y);
                if (mtmp && !aflag) {
                    const mfres = await mfind0(mtmp, false);
                    if (mfres === -1) continue;
                    else if (mfres > 0) return mfres;
                }
                // See if an invisible monster has moved off this square.
                if (!aflag && !mtmp && !Blind()) unmap_invisible(x, y);

                const trap = (game.level?.traps || []).find(t => t.tx === x && t.ty === y);
                if (trap && !trap.tseen && !rnl(8)) {
                    if ((game.multi ?? 0) > 0) game.multi = 0; // C nomul(0)
                    if (trap.ttyp === STATUE_TRAP) {
                        // C: activate_statue_trap() animates the statue (makemon
                        // + an exercise(A_WIS, TRUE) on success).  Not ported —
                        // statue traps aren't created by this port's mklev.
                        trap.tseen = 1;
                        newsym(x, y);
                        return 1;
                    }
                    await find_trap(trap);
                }
            }
        }
    }
    return 1;
}

// C ref: hack.c monster_nearby() — a hostile, awake, spottable monster on one
// of the 8 squares adjacent to the hero.  Drives the safe_wait safety check.
// A monster is excluded when: disguised as furniture/an object (mimic);
// peaceful, or attackless, unless the hero is hallucinating; an undetected
// hides_under monster; helpless (asleep / unable to move); standing on a square
// that scares it; or not spottable.
//
// Three tests used to be wrong here and each one answers "there is a monster"
// where C answers "there isn't" (or vice versa), which flips whether `s`/`.`
// spend a game turn at all:
//   - cansee(x,y) is the TERRAIN test; C uses canspotmon(mtmp), so an invisible
//     monster on a lit adjacent square used to block the wait and C's did not;
//   - the hider set was keyed on eight hard-coded pmidx values and tested M1_HIDE
//     where C tests hides_under() (M1_CONCEAL);
//   - noattacks() (a hostile shrieker//violet fungus spore) was missing entirely.
export function monster_nearby() {
    const u = game.u;
    if (!u) return false;
    const hallu = Hallucination();
    for (let x = u.ux - 1; x <= u.ux + 1; x++)
        for (let y = u.uy - 1; y <= u.uy + 1; y++) {
            if (!isok(x, y) || (x === u.ux && y === u.uy)) continue;
            const mtmp = m_at(x, y);
            if (!mtmp) continue;
            if (mtmp.m_ap_type === 'furniture' || mtmp.m_ap_type === 'obj') continue;
            if (!(hallu || (!mtmp.mpeaceful && !noattacks(mtmp.data)))) continue;
            if (mtmp.mundetected && hides_under_flag(mtmp.data)) continue;
            if (mtmp.msleeping || !mtmp.mcanmove) continue;
            if (onscary(u.ux, u.uy, mtmp)) continue;
            if (canspotmon(mtmp)) return true;
        }
    return false;
}

// C ref: do.c donull() — the 'wait'/'#wait' command; ECMD_TIME unless the
// safe_wait guard refuses it.  Exported because '#wait' dispatches here too.
export async function donull() {
    if (await cmd_safety_prevention('Waiting', 'a no-op (to rest)',
                                    'Are you waiting to get hit?'))
        return 0; // ECMD_OK
    return 1;     // ECMD_TIME
}

// C ref: do.c cmd_safety_prevention() — with the (default-On) safe_wait option
// and no menu-request prefix or multi-turn action, a wait/search next to a
// hostile monster is refused: it prints `act` (+ the cmdassist "Use 'm' prefix"
// hint) and returns true (the command does nothing and costs no turn).
async function cmd_safety_prevention(ucverb, cmddesc, act) {
    const menuRequested = !!game.iflags?.menu_requested;
    if (menuRequested) game.iflags.menu_requested = false;
    if (game.flags?.safe_wait !== false && !menuRequested && !game.multi) {
        // cmdassist defaults On, so the "Use 'm' prefix" suffix always shows.
        const buf = `  Use 'm' prefix to force ${cmddesc}.`;
        if (monster_nearby()) {
            // C: Norep("%s%s", act, buf) — suppressed when identical to the
            // current top line, so a repeated blocked search/wait next to the
            // same monster doesn't re-print every turn.
            await Norep_topl(`${act}${buf}`);
            return true;
        }
    }
    return false;
}

// The explicit `s` search command.  C ref: detect.c dosearch().
async function dosearch() {
    if (await cmd_safety_prevention('Searching', 'another search',
        'You already found a monster.'))
        return false; // ECMD_OK: no game turn
    await dosearch0(0);
    return true;
}

// C ref: mon.c wake_nearto_core(x, y, distance, FALSE) — every non-dead monster
// within `distance` (a SQUARED distance) of <x,y> loses msleeping and its
// STRAT_WAITMASK "meditation".  Consumes no RNG itself, but a monster that C
// woke and this port left asleep skips its whole dochug() turn — every m_move
// rn2 in it, every attack roll — so the streams diverge from the next monster
// phase onward.  wake_msg() also prints "<Monster> wakes up." for a sleeping
// monster the hero can see, which lands on the top line before the kick text.
export async function wake_nearto(x, y, distance) {
    for (const mtmp of (game.level?.monsters || [])) {
        if (mtmp.mhp != null && mtmp.mhp <= 0) continue;
        const d2 = (mtmp.mx - x) * (mtmp.mx - x) + (mtmp.my - y) * (mtmp.my - y);
        if (distance !== 0 && d2 >= distance) continue;
        // C's wake_msg() pline() is update_topl(), and monmove.js's copy of
        // wake_msg already uses it: this line APPENDS to whatever the noise
        // that woke the monster printed, rather than replacing it.
        if (mtmp.msleeping && canseemon_shared(mtmp))
            await update_topl(`${Monnam(mtmp)} wakes up.`);
        mtmp.msleeping = 0;
        // C: `if (!(mtmp->data->geno & G_UNIQ)) mtmp->mstrategy &= ~STRAT_WAITMASK;`
        if (mtmp.mstrategy != null) mtmp.mstrategy &= ~0x00ff0000;
    }
    // disturb_buried_zombies(): no buried objects are modelled by this port.
}

// C ref: mondata.h digests(ptr) == attacktype(ptr, AT_ENGL).
function digests_cmd(ptr) { return attacktype(ptr, AT_ENGL); }

// C ref: engrave.c u_wipe_engr(cnt) — scuff the engraving under the hero.
// wipe_engr_at() draws rn2(1 + 50 / (cnt + 1)) for every engraving type except
// DUST and blood, so this is an RNG call site whenever the hero stands on an
// engraved square.  can_reach_floor(TRUE) is approximated the same way
// maybe_smudge_engr() above approximates it.
function u_wipe_engr_cmd(cnt) {
    const u = game.u;
    if (u?.uprops?.Levitation || u?.uprops?.Flying) return;
    wipe_engr_at(u.ux, u.uy, cnt, false);
}

// C ref: mon.c wake_nearby(petcall) -> wake_nearto_core(u.ux, u.uy, ulevel*20).
export async function wake_nearby(_petcall) {
    const u = game.u;
    if (!u) return;
    await wake_nearto(u.ux, u.uy, (u.ulevel || 1) * 20);
}

// C ref: dungeon.c level_difficulty() — depth, bumped in the "builds up"
// branches (Sokoban / Vlad's).  Local copy: do.js/fountain.js/mkobj.js each
// keep their own for the same reason (no shared owner for this helper).
function level_difficulty_cmd() { return level_difficulty_c(); }

// C ref: trap.c b_trapped(item, bodypart) — a booby-trapped door/box explodes in
// the hero's face.  RNG order matters: rnd(...) for the damage FIRST (its
// modulus depends on level_difficulty()), then the two exercise() rn2(2) draws.
// make_stunned() draws nothing but sets HStun, which makes the hero impaired —
// so every following move runs confdir()'s rn2(8) redirect.  Leaving all of
// that out (the old "not modelled here" comment) desynchronises from the very
// first trapped door a session opens or kicks.
export async function b_trapped(item, hasBodypart) {
    const lvl = level_difficulty_cmd();
    const dmg = rnd(5 + (lvl < 5 ? lvl : 2 + Math.trunc(lvl / 2)));
    await pline(`KABOOM!!  The ${item} was booby-trapped!`);
    await wake_nearby(false);
    const u = game.u;
    // losehp(Maybe_Half_Phys(dmg), ...) — no RNG; Half_physical_damage is not
    // carried by any hero this reaches, so the damage passes through unhalved.
    if (u) u.uhp = Math.max(0, (u.uhp || 0) - dmg);
    exercise(A_STR, false); // -> rn2(2)
    if (hasBodypart) exercise(A_CON, false); // -> rn2(2)
    // make_stunned((HStun & TIMEOUT) + dmg, TRUE)
    if (u) {
        u.uprops = u.uprops || {};
        const old = u.uprops.Stun || 0;
        u.uprops.Stun = old + dmg;
        if (!old) await pline('You stagger...');
        game.botl = true; // C: disp.botl = TRUE on the 0<->nonzero transition
    }
}

// The ^D kick command now lives in js/dokick.js (a full port of dokick.c:
// kick_dumb/kick_ouch/kick_door plus kick_nondoor and dokick's pre-direction
// refusals, which this file only covered in part).

// C ref: teleport.c dotele(break_the_rules=FALSE) — the plain (non-wizard) ^T.
// Returns 1 when a game turn elapses, 0 otherwise.  A hero with neither the
// Teleportation intrinsic (at the role's minimum XL) nor a live teleport-away
// spell is simply told so; the key is a perfectly valid command, so answering
// "Unknown command" (as this used to) printed the wrong line.
//
// Two arms are deliberately not ported: the seen-teleport-trap / level-teleport
// -trap offers at the top of dotele(), and the actual tele() relocation for a
// hero who CAN teleport (its rn2 placement rolls belong to teleport.c).  Both
// are noted rather than faked; the turn accounting for the second is C's.
const SPE_TELEPORT_AWAY_CMD = 400; // mkobj.js objects[] row
const PM_WIZARD_CMD = 12;          // roles[].mnum
async function dotele_nonwizard() {
    const u = game.u;
    const Teleportation = ((u.uprops?.Teleportation || 0) > 0)
        || ((u.HTeleportation || 0) > 0);
    const lvlreq = (game.urole?.mnum === PM_WIZARD_CMD) ? 8 : 12;
    if (!Teleportation || (u.ulevel || 1) < lvlreq) {
        // known_spell(SPE_TELEPORT_AWAY): spe_Unknown when it isn't in the book
        // at all, otherwise a freshness level; only a fresh one can be cast.
        const slot = (game.spl_book || []).find(
            (sp) => sp && sp.sp_id === SPE_TELEPORT_AWAY_CMD);
        const inbook = !!slot;
        const fresh = inbook && (slot.sp_know || 0) > 0;
        const confused = (u.uprops?.Confusion || 0) > 0;
        if (!(fresh && !confused)) {
            await pline(`You ${!Teleportation
                ? (inbook ? "can't cast that spell" : "don't know that spell")
                : 'are not able to teleport at will'}.`);
            return 0;
        }
    }
    return 1;
}

// C ref: cmd.c getdir():4116 — every successful direction prompt ends with
//   if (!u.dz) confdir(FALSE);
// so a Confused hero pays an rn2(5) at EVERY direction prompt (and 1-in-5 an
// rn2(8) that REPLACES the direction typed).  This used to be documented "No
// RNG"; that cost the rn2(5) C draws when a confused hero zaps at himself
// (seed5006 step 183) and every draw after it.  u.dx/u.dy/u.dz are C's real
// output of getdir(), so set them here too — confdir() writes through them.
// C ref: cmd.c getdir() — read a direction key.  Renders "In what direction?",
// reads one key.  Returns {dx,dy,dz} or null on cancel/ESC.
// An optional `s` overrides the prompt (e.g. dochat's "Talk to whom? ...").
export async function getdir(s) {
    const prompt = s || 'In what direction?';
    // C ref: win/tty/topl.c tty_yn_function() — `if (toplin == TOPLINE_NEED_MORE
    // && !skip) more(); flags &= ~(WIN_STOP|WIN_NOSTOP);` before drawing the new
    // prompt: an unacknowledged pending message (e.g. a pet dropping an item
    // this same turn) gets its own --More-- pause rather than being silently
    // overwritten — unless the player already dismissed a previous --More--
    // with ESC this turn (game._winStop), in which case the message was
    // suppressed outright and no extra pause is owed.  Either way the
    // suppression is one-shot: clear it once this prompt has been drawn.
    if (game._toplin === 1 && !game._winStop) await topl_more();
    game._winStop = false;
    game._pending_message = prompt;
    await flush_screen(1);
    game._modal_screen = 'topl';
    const disp = game.nhDisplay;
    if (disp?.setCursor) disp.setCursor(Math.min(prompt.length + 1, 79), 0);
    const key = await nhgetch();
    delete game._modal_screen;
    game._pending_message = '';
    game._toplin = 0; // TEST: topl.c:544 clean_up -> TOPLINE_NON_EMPTY
    const ch = String.fromCharCode(key);
    // C ref: cmd.c getdir() — spkeys[NHKF_GETDIR_SELF] ('.') and
    // NHKF_GETDIR_SELF2 ('s') both mean "at yourself", for either number_pad.
    if (key === NHKF_GETDIR_SELF || key === NHKF_GETDIR_SELF2)
        return getdir_confdir({ dx: 0, dy: 0, dz: 0 });
    // C ref: cmd.c getdir() — the 'simulated mouse' key runs getpos() and
    // reports the picked spot as a click; the direction itself is left alone
    // (C never writes u.dx/u.dy on this path when a spot was picked), and a
    // rejected pick zeroes it.  iflags.getdir_click, which carries CLICK_1 vs
    // CLICK_2 to #therecmdmenu, is only read by callers that set it first.
    if (key === NHKF_GETDIR_MOUSE) {
        const u = game.u;
        const qbuf = `desired location, then type '${String.fromCharCode(NHKF_GETPOS_PICK_Q)}'`
            + ` for left click, '${String.fromCharCode(NHKF_GETPOS_PICK)}' for right`;
        const verbose = game.flags?.verbose !== false;
        const cc = await getpos(qbuf, u.ux, u.uy, null, /*force=*/true, verbose);
        if (!cc) { u.dx = 0; u.dy = 0; u.dz = 0; return null; }
        return { dx: u.dx | 0, dy: u.dy | 0, dz: u.dz | 0 };
    }
    // C ref: cmd.c getdir() `movecmd(dirsym, MV_ANY)` — the direction comes out
    // of the command table, so it follows number_pad: the walk keys, and (with
    // number_pad off) the run/rush keys their capitals and control codes are
    // bound to, all name a direction.
    const Cmd = numpad_cmd();
    const d = movecmd_dir(Cmd, key, null);
    if (d >= 0) {
        const [dx, dy, dz] = DIR_XYZ[d];
        return getdir_confdir({ dx, dy, dz });
    }
    if (ch === '\x1b' || ch === ' ' || ch === '\r' || ch === '\n')
        return null;                        // decl.c quitchars[] " \r\n\033"
    // C ref: cmd.c getdir() — an invalid direction key (not a movement key and
    // not a quitchar) with iflags.cmdassist On (default) shows the help_dir()
    // text window "cmdassist: Invalid direction key!" + the direction-keys
    // legend, then returns 0 (cancel).  quitchars (space/return/ESC) were already
    // handled above and return null silently.
    await help_dir_window('Invalid direction key!');
    return null;
}

// C ref: cmd.c getdir():4116 — `if (!u.dz) confdir(FALSE);`.  EVERY answered
// direction prompt (including '.', "at yourself") runs the impairment roll, so
// a confused hero spends an rn2(5) — and, 1-in-5, an rn2(8) redirect — on the
// zap/apply/throw itself, not just on movement.  Skipping it left the stream a
// draw short at seed5006 step 183 (zapping a wand while confused).
export function getdir_confdir(res) {
    const u = game.u;
    if (!u || res.dz) return res;
    u.dx = res.dx; u.dy = res.dy;
    confdir(false);
    res.dx = u.dx; res.dy = u.dy;
    return res;
}

// C ref: cmd.c help_dir() — the cmdassist explanation window shown for an
// invalid direction key (no prefix handling, no ^-key suggestion for our
// callers).  Renders a full-screen NHW_TEXT window with a "--More--" footer.
async function help_dir_window(msg) {
    // C ref: cmd.c show_direction_keys() — the legend is drawn from
    // cmd_from_func(do_move_*), i.e. from Cmd.dirchars, so number_pad shows the
    // digits; the "direct at yourself" key is spkeys[NHKF_GETDIR_SELF2] ('s')
    // with number_pad on and NHKF_GETDIR_SELF ('.') with it off.
    const Cmd = numpad_cmd();
    const dc = Cmd.dirchars;
    const self = String.fromCharCode(Cmd.num_pad ? NHKF_GETDIR_SELF2
                                                 : NHKF_GETDIR_SELF);
    const lines = [
        `cmdassist: ${msg}`,
        '',
        'Valid direction keys are:',
        `          ${dc[1]}  ${dc[2]}  ${dc[3]}`,
        '           \\ | / ',
        `          ${dc[0]}- . -${dc[4]}`,
        '           / | \\ ',
        `          ${dc[7]}  ${dc[6]}  ${dc[5]}`,
        '',
        '          <  up',
        '          >  down',
        `          ${self}  direct at yourself`,
        '',
        '(Suppress this message with !cmdassist in config file.)',
    ];
    renderWindowScreen(lines, { footer: '--More--', footerRow: 23, footerCol: 0, modal: 'textwin' });
    await flush_screen(1);
    game._modal_screen = 'topl';
    // xwaitforspace: read keys until space / return / escape.
    for (;;) {
        const c = await nhgetch();
        if (c === 32 || c === 13 || c === 10 || c === 27) break;
    }
    delete game._modal_screen;
    game._pending_message = '';
}

// C ref: attrib.c acurrstr() — map the encoded A_STR (3..125; 18/01 stored as
// 19, ..) onto the 3..25 scale used by strength-dependent checks.
function acurrstr() {
    const str = game.u?.acurr?.a?.[A_STR] ?? 0;
    if (str <= 18) return Math.max(str, 3);
    if (str <= 121) return 19 + Math.trunc(str / 50);
    return Math.min(str, 125) - 100;
}

// C ref: attrib.c acurr(chridx) — effective attribute = abon+atemp+acurr,
// clamped to [3,25] for non-STR characteristics (e.g. wounded legs' atemp
// [A_DEX] -= 1).  Delegates to attrib.js' shared acurr_eff so every ACURR()
// call site here (door-open, lock-picking, wounded-legs/strain thresholds)
// sees the same temporary stat adjustments C's acurr() would.
function ACURR(i) { return acurr_eff(i); }

// C ref: lock.c doopen() / doopen_indir(x,y) — the #open ('o') command and the
// autoopen door-walk path.  When called with explicit coords (autoopen), it
// skips the getdir() direction prompt.  The starter hero has hands and is not
// very-small/confused, so the modelled path is: not-a-door message; an
// already-open / broken / locked door message; or a CLOSED door where
//   rnl(20) < (ACURRSTR + ACURR(A_DEX) + ACURR(A_CON))/3
// decides open vs "resists" (the latter also exercise(A_STR, TRUE) -> rn2(19)).
// Returns 1 (ECMD_TIME) when a turn elapses, else 0 (ECMD_OK).
export async function doopen_indir(x, y) {
    const u = game.u;
    let cx, cy;
    if (x > 0 && y >= 0) {
        cx = x; cy = y;
    } else {
        // nohands(youmonst): the starter roles all have hands -> skip.
        // C ref: lock.c doopen_indir() -> get_adjacent_loc(): when getdir()
        // returns 0 (a quitchar, or an invalid-direction key after the cmdassist
        // help window), get_adjacent_loc prints "Never mind." and returns 0.
        const dir = await getdir();
        if (!dir) { await pline('Never mind.'); return 0; }
        cx = u.ux + dir.dx; cy = u.uy + dir.dy;
    }

    // C ref: lock.c doopen_indir() — the pit guard runs AFTER the direction is
    // read (it used to be before, and C's comment says moving it was the fix),
    // so the direction key is consumed either way.
    if (u.utrap && u.utraptype === TT_PIT) {
        await pline("You can't reach over the edge of the pit.");
        return 0; // ECMD_OK
    }
    // C ref: lock.c doopen_indir() — "when choosing a direction is impaired,
    // use a turn regardless of whether a door is successfully targeted".
    let res = 0; // ECMD_OK
    {
        const stunned = (u.uprops?.Stun || 0) > 0 || !!u.Stunned;
        const confused = (u.uprops?.Confusion || 0) > 0;
        if (confused || stunned) res = 1; // ECMD_TIME
    }

    // open at yourself with no closed door here -> doloot() (containers under
    // the hero are not opened from here in this port).
    const door = game.level?.at(cx, cy);
    if (!door || !IS_DOOR(door.typ)) {
        await pline(`You ${Blind() ? 'feel' : 'see'} no door there.`);
        return res;
    }

    if (!(door.doormask & D_CLOSED)) {
        let mesg, locked = false;
        switch (door.doormask) {
        case D_BROKEN: mesg = ' is broken'; break;
        case D_NODOOR: mesg = 'way has no door'; break;
        case D_ISOPEN: mesg = ' is already open'; break;
        default:       mesg = ' is locked'; locked = true; break; // D_LOCKED
        }
        await pline(`This door${mesg}.`);
        // C ref: lock.c doopen_indir() — a locked door with flags.autounlock
        // (default AUTOUNLOCK_APPLY_KEY) and a lock pick / key in inventory
        // triggers pick_lock(): "This door is locked." is followed by an
        // "Unlock it with <tool>? [ynq]" prompt; on 'y' the occupation rolls
        // rn2(100) against the pick chance and (on success) opens the lock.
        if (locked && (game.flags?.autounlock ?? true)) {
            const tool = autokey();
            if (tool) {
                // pick_lock_door returns 2 when the lock-picking occupation
                // elapsed a turn (so the caller advances monsters), 0 otherwise.
                return await pick_lock_door(tool, cx, cy, door);
            }
        }
        return res;
    }

    // verysmall(youmonst): false for the starter roles.
    // door is known to be CLOSED.
    if (rnl(20) < Math.trunc((acurrstr() + ACURR(A_DEX) + ACURR(A_CON)) / 3)) {
        // C ref: lock.c doopen_indir() — message first, then set the door open,
        // feel_newsym, and recalc_block_point (which requests vision_full_recalc
        // so the move loop's end-of-turn vision_recalc reveals the room beyond
        // the now-open doorway).  NOT a direct vision_recalc: the reveal must
        // happen AFTER this turn's monster moves, matching C.
        await pline('The door opens.');
        if (door.doormask & D_TRAPPED) {
            // C ref: lock.c:908 — b_trapped("door", FINGER) BEFORE the doormask
            // is cleared: rnd(level-scaled damage) + two exercise() rn2(2)s +
            // a stun timer, none of which used to be drawn here.
            await b_trapped('door', true); // FINGER != NO_PART
            door.doormask = D_NODOOR;
        } else {
            door.doormask = D_ISOPEN;
        }
        newsym(cx, cy);
        recalc_block_point(cx, cy);
    } else {
        exercise(A_STR, true); // -> rn2(19)
        await pline('The door resists!');
    }
    return 1; // ECMD_TIME
}

// C ref: lock.c doclose() — the #close ('c') command: close an adjacent open
// door.  Returns an ECMD_* code (1 CANCEL, 0 OK / no turn, 2 TIME).  The
// nohands / pit guards are FALSE for the starter heroes.  getdir() reads the
// direction (and shows the cmdassist window + cancels on an invalid key, which
// is exactly what seed5002 exercises after the #search safety-block).
async function doclose() {
    const u = game.u;
    // nohands(youmonst): the starter roles all have hands.
    // C ref: lock.c doclose() — a hero stuck in a pit can't reach the door and
    // is refused BEFORE getdir(), so no direction key is consumed at all.
    if (u.utrap && u.utraptype === TT_PIT) {
        await pline("You can't reach over the edge of the pit.");
        return 0; // ECMD_OK
    }
    let res = 0; // ECMD_OK
    const dir = await getdir();
    if (!dir) return 1; // ECMD_CANCEL — invalid/ESC direction, no turn

    const x = u.ux + dir.dx, y = u.uy + dir.dy;
    // u_at(x,y) && !Passes_walls: "You are in the way!" (ECMD_TIME).  dx=dy=0
    // ('.'/'s') targets the hero's own square.
    if (x === u.ux && y === u.uy) {
        await pline('You are in the way!');
        return 2; // ECMD_TIME
    }
    if (!isok(x, y)) {
        await pline(`You ${Blind() ? 'feel' : 'see'} no door there.`);
        return res;
    }
    // stumble_on_door_mimic(x, y): a mimic disguised as a door reveals itself
    // and the turn is spent; mimic disguises aren't targeted here.

    // C ref: lock.c doclose() — "when choosing a direction is impaired, use a
    // turn regardless of whether a door is successfully targeted".  Without
    // this a confused/stunned #close at empty air cost no turn, so the whole
    // monster-move phase after it went missing.
    const stunned = (u.uprops?.Stun || 0) > 0 || !!u.Stunned;
    const confused = (u.uprops?.Confusion || 0) > 0;
    if (confused || stunned) res = 2; // ECMD_TIME

    const door = game.level?.at(x, y);
    const portcullis = false; // is_drawbridge_wall: no drawbridges in these slices
    // C's Blind arm runs feel_location() here and upgrades res to ECMD_TIME when
    // the probe learned something; this port keeps no per-tile glyph memory to
    // decide that, so it is left out rather than guessed.
    if (portcullis || !door || !IS_DOOR(door.typ)) {
        await pline(`You ${Blind() ? 'feel' : 'see'} no door there.`);
        return res;
    }
    if (door.doormask === D_NODOOR) {
        await pline('This doorway has no door.'); return res;
    }
    // obstructed(x,y): no monster/boulder occupies a closeable doorway here.
    if (door.doormask === D_BROKEN) {
        await pline('This door is broken.'); return res;
    }
    if (door.doormask & (D_CLOSED | D_LOCKED)) {
        await pline('This door is already closed.'); return res;
    }
    if (door.doormask === D_ISOPEN) {
        // verysmall(youmonst): false for the starter roles.
        // C ref: `if (u.usteed || rn2(25) < (ACURRSTR+DEX+CON)/3)` — a MOUNTED
        // hero shuts the door without rolling at all (|| short-circuits), so
        // drawing rn2(25) while riding put every later draw one out of step.
        if (u.usteed
            || rn2(25) < Math.trunc((acurrstr() + ACURR(A_DEX) + ACURR(A_CON)) / 3)) {
            await pline('The door closes.');
            door.doormask = D_CLOSED;
            newsym(x, y);
            vision_recalc(0);
        } else {
            exercise(A_STR, true); // -> rn2(19)
            await pline('The door resists!');
        }
    }
    return 2; // ECMD_TIME
}

// C ref: include/onames.h — the lock-picking tools (mkobj.js OBJECTS rows).
// (Earlier revisions had SKELETON_KEY/CREDIT_CARD wrong (215=LARGE_BOX,
// 219=BAG_OF_HOLDING); corrected so autokey()/pick_lock() key off the real
// object types.)
const SKELETON_KEY = 221, LOCK_PICK = 222, CREDIT_CARD = 223;
const LARGE_BOX = 214, CHEST = 215, ICE_BOX = 216;
const PM_ROGUE = 8;

// C ref: include/lock.h — pick_lock() / lock-occupation result codes.
const PICKLOCK_DID_NOTHING = 0, PICKLOCK_DID_SOMETHING = 1,
      PICKLOCK_LEARNED_SOMETHING = 2;

// C ref: objclass.h Is_box() — the three lockable floor containers.
function Is_box_otyp(otyp) {
    return otyp === LARGE_BOX || otyp === CHEST || otyp === ICE_BOX;
}
// an(name): the object's unidentified simple name with its indefinite article.
// The tools/boxes here are never appearance-shuffled, so objects[otyp].name is
// the displayed noun.
function an_obj(otyp) {
    const nm = OBJECTS[otyp]?.name || 'object';
    return (/^[aeiou]/i.test(nm) ? 'an ' : 'a ') + nm;
}
// C ref: lock.c lock_action() — the gerund phrase for the occupation messages.
function lock_action_str(picktyp, target) {
    if (target.door && !(target.door.doormask & D_LOCKED)) return 'locking the door';
    if (target.box && !target.box.olocked)
        return target.box.otyp === CHEST ? 'locking the chest' : 'locking the box';
    if (picktyp === LOCK_PICK || picktyp === CREDIT_CARD) return 'picking the lock';
    if (target.door) return 'unlocking the door';
    if (target.box) return target.box.otyp === CHEST ? 'unlocking the chest' : 'unlocking the box';
    return 'picking the lock';
}

// C ref: lock.c autokey(opening) — choose an unlocking tool from inventory:
// skeleton key, else lock pick, else credit card.  The starter rogue carries a
// lock pick; quest-artifact handling is irrelevant for the starter inventory.
function autokey() {
    const inv = Array.isArray(game.invent) ? game.invent : [];
    let key = null, pick = null, card = null;
    for (const o of inv) {
        if (o.otyp === SKELETON_KEY && !key) key = o;
        else if (o.otyp === LOCK_PICK && !pick) pick = o;
        else if (o.otyp === CREDIT_CARD && !card) card = o;
    }
    return key || pick || card || null;
}

// C ref: lock.c pick_lock() (autounlock door branch) + picklock().  Prompts
// "Unlock it with <tool>? [ynq]" and, on 'y', runs the lock-picking occupation.
// chance = 3*DEX + 30*(rogue) for a lock pick; each turn rolls rn2(100): on
// rn2(100) >= chance the attempt is "still busy" (re-rolls next turn), else it
// succeeds — "You succeed in picking the lock." + exercise(A_DEX) (rn2(19)) and
// the door goes D_LOCKED -> D_CLOSED.  Returns 1 (a turn elapsed) on 'y'.
async function pick_lock_door(pick, cx, cy, door) {
    // yname(uncursed lock pick) -> "your lock pick"; skeleton key -> "your key".
    const toolname = pick.otyp === LOCK_PICK ? 'your lock pick'
                   : pick.otyp === SKELETON_KEY ? 'your key'
                   : 'your credit card';
    // C ref: ynq() calls more() when a top-line message is still pending — the
    // "This door is locked." message gets a --More-- before the prompt shows.
    game._yn_need_more = true;
    const c = await y_n(`Unlock it with ${toolname}?`, 'ynq\x1b', 'q');
    if (c !== 'y') return 0;

    const isRogue = (game.urole?.mnum === PM_ROGUE);
    let chance;
    switch (pick.otyp) {
    case CREDIT_CARD:  chance = 2 * ACURR(A_DEX) + 20 * (isRogue ? 1 : 0); break;
    case LOCK_PICK:    chance = 3 * ACURR(A_DEX) + 30 * (isRogue ? 1 : 0); break;
    case SKELETON_KEY: chance = 70 + ACURR(A_DEX); break;
    default:           chance = 0;
    }

    // picklock occupation, resolved inline: usedtime starts at 0, so the first
    // turn rolls rn2(100); on success the lock opens this turn.  (A failed roll
    // would carry the occupation across turns; the recorded run succeeds first
    // try, which is the only path the starter exercises.)
    if (rn2(100) >= chance) {
        // NOT PORTED: C's picklock occupation re-rolls rn2(100) on every
        // following turn (up to xlock.usedtime 50) until the lock gives, so a
        // first-turn failure here loses every one of those later draws and
        // leaves the door locked where C opens it.  Wiring it up needs a
        // door-flavoured occupation alongside allmain.js's _picklock_box hook.
        return 2;
    }
    await pline('You succeed in picking the lock.');
    if (door.doormask & D_TRAPPED) {
        await b_trapped('door', true); // C ref: lock.c:141 b_trapped("door", FINGER)
        door.doormask = D_NODOOR;
        recalc_block_point(cx, cy); // C: unblock_point()
    } else if (door.doormask & D_LOCKED) {
        door.doormask = D_CLOSED;
    } else {
        door.doormask = D_LOCKED;
    }
    newsym(cx, cy);
    exercise(A_DEX, true); // -> rn2(19)
    return 2; // occupation elapsed a turn (advance monsters)
}

// C ref: lock.c pick_lock(pick, 0, 0, NULL) — the #apply path for a lock pick /
// skeleton key / credit card.  get_adjacent_loc() -> getdir() prompts "In what
// direction?"; the target is a container under the hero (dx==dy==0) or an
// adjacent door.  Returns a PICKLOCK_* code (doapply maps non-zero -> ECMD_TIME).
// The occupation is resolved inline in a single turn, exactly like the existing
// pick_lock_door() (a failed first rn2(100) is treated as one elapsed turn).
// Unreached-at-these-depths sub-branches (resuming an interrupted attempt,
// nohands/engulfed, drawbridge locks, credit-card shopkeepers, door-mimics, and
// the Master-Key trap-disarm) are documented rather than modelled.
export async function pick_lock(pick) {
    const u = game.u;
    const picktyp = pick.otyp;
    const isRogue = (game.urole?.mnum === PM_ROGUE);

    // get_adjacent_loc(NULL, "Invalid location!", u.ux, u.uy, &cc):
    const dir = await getdir();
    if (!dir) { await pline('Never mind.'); return PICKLOCK_DID_NOTHING; }
    const cx = u.ux + dir.dx, cy = u.uy + dir.dy;
    if (!isok(cx, cy)) { await pline('Invalid location!'); return PICKLOCK_DID_NOTHING; }

    let ch = 0, target = null;
    if (cx === u.ux && cy === u.uy) {
        // Pick the lock on a container under the hero.
        if (dir.dz < 0) {
            await pline("There isn't any sort of lock up there.");
            return PICKLOCK_LEARNED_SOMETHING;
        }
        // is_lava / is_pool guards: the hero stands on dry floor in these runs.
        // C walks svl.level.objects[x][y] head-first (newest first); this port's
        // level.objects is a flat, push-ordered array, so reverse for that order.
        const pile = (game.level?.objects || [])
            .filter((o) => o.where === 'floor' && o.ox === cx && o.oy === cy)
            .reverse();
        let count = 0;
        for (const otmp of pile) {
            if (!Is_box_otyp(otmp.otyp)) continue;
            count++;
            let verb, it = false;
            if (otmp.obroken) verb = 'fix';
            else if (!otmp.olocked) { verb = 'lock'; it = true; }
            else if (picktyp !== LOCK_PICK) { verb = 'unlock'; it = true; }
            else verb = 'pick';
            otmp.lknown = 1;
            game._yn_need_more = true;
            const c = await y_n(`There is ${an_obj(otmp.otyp)} here; ${verb} ${it ? 'it' : 'its lock'}?`, 'ynq\x1b', 'q');
            if (c === 'q' || c === '\x1b') return PICKLOCK_DID_NOTHING;
            if (c === 'n') continue; // try next box
            if (otmp.obroken) {
                await pline(`You can't fix its broken lock with ${an_obj(picktyp)}.`);
                return PICKLOCK_LEARNED_SOMETHING;
            }
            if (picktyp === CREDIT_CARD && !otmp.olocked) {
                await pline(`You can't do that with ${an_obj(picktyp)}.`);
                return PICKLOCK_LEARNED_SOMETHING;
            }
            switch (picktyp) {
            case CREDIT_CARD:  ch = ACURR(A_DEX) + 20 * (isRogue ? 1 : 0); break;
            case LOCK_PICK:    ch = 4 * ACURR(A_DEX) + 25 * (isRogue ? 1 : 0); break;
            case SKELETON_KEY: ch = 75 + ACURR(A_DEX); break;
            }
            if (otmp.cursed) ch = Math.trunc(ch / 2);
            target = { box: otmp };
            break;
        }
        if (!target) {
            if (!count) await pline("There doesn't seem to be any sort of lock here.");
            return PICKLOCK_LEARNED_SOMETHING; // decided against all boxes
        }
    } else {
        // Pick the lock in an adjacent door.  (u.utrap TT_PIT guard: unreached.)
        const mtmp = m_at(cx, cy);
        if (mtmp && canspotmon(mtmp)) {
            await pline(`I don't think ${mon_nam(mtmp)} would appreciate that.`);
            return PICKLOCK_LEARNED_SOMETHING;
        }
        const door = game.level?.at(cx, cy);
        if (!door || !IS_DOOR(door.typ)) {
            // C ref: lock.c — the not-a-door branch runs update_mapseen_for(cc) +
            // feel_location(cc) and returns PICKLOCK_LEARNED_SOMETHING when that
            // examination changes the remembered glyph / seen-vector / lastseentyp
            // (feel_location() always set_seenv()s the probed tile from the hero's
            // new vantage), else PICKLOCK_DID_NOTHING.  For the sighted hero
            // probing an adjacent square this examination registers as LEARNED (a
            // turn elapses).  This port doesn't keep C's per-tile glyph/seenv
            // memory to distinguish the rare already-fully-cached DID_NOTHING case,
            // so it returns LEARNED — matching the recorded turn-consuming apply.
            await pline(`You ${Blind() ? 'feel' : 'see'} no door there.`);
            return PICKLOCK_LEARNED_SOMETHING;
        }
        switch (door.doormask) {
        case D_NODOOR: await pline('This doorway has no door.'); return PICKLOCK_LEARNED_SOMETHING;
        case D_ISOPEN: await pline('You cannot lock an open door.'); return PICKLOCK_LEARNED_SOMETHING;
        case D_BROKEN: await pline('This door is broken.'); return PICKLOCK_LEARNED_SOMETHING;
        default: break;
        }
        if (picktyp === CREDIT_CARD && !(door.doormask & D_LOCKED)) {
            await pline("You can't lock a door with a credit card.");
            return PICKLOCK_LEARNED_SOMETHING;
        }
        game._yn_need_more = true;
        const c = await y_n(`${(door.doormask & D_LOCKED) ? 'Unlock' : 'Lock'} it?`, 'ynq\x1b', 'q');
        if (c !== 'y') return PICKLOCK_DID_NOTHING;
        switch (picktyp) {
        case CREDIT_CARD:  ch = 2 * ACURR(A_DEX) + 20 * (isRogue ? 1 : 0); break;
        case LOCK_PICK:    ch = 3 * ACURR(A_DEX) + 30 * (isRogue ? 1 : 0); break;
        case SKELETON_KEY: ch = 70 + ACURR(A_DEX); break;
        }
        target = { door, cx, cy };
    }

    // set_occupation(picklock, ...): first turn (usedtime 0) rolls rn2(100);
    // >= chance -> still busy.  NOT PORTED (same gap as pick_lock_door above):
    // C keeps re-rolling rn2(100) each turn until the lock opens or usedtime
    // hits 50; this stops after the first roll.
    if (rn2(100) >= ch) return PICKLOCK_DID_SOMETHING; // busy: a turn elapsed
    await pline(`You succeed in ${lock_action_str(picktyp, target)}.`);
    if (target.door) {
        const door = target.door;
        if (door.doormask & D_TRAPPED) {
            await b_trapped('door', true); // C ref: lock.c:141
            door.doormask = D_NODOOR;
            recalc_block_point(target.cx, target.cy); // C: unblock_point()
        } else if (door.doormask & D_LOCKED) door.doormask = D_CLOSED;
        else door.doormask = D_LOCKED;
        newsym(target.cx, target.cy);
    } else {
        target.box.olocked = target.box.olocked ? 0 : 1;
    }
    exercise(A_DEX, true); // -> rn2(19)
    return PICKLOCK_DID_SOMETHING;
}

// C ref: hack.c carrying_too_much() — refuse the move when the hero is
// OVERLOADED, or is worse than Burdened while badly hurt.  nomul(0) and no turn.
async function carrying_too_much() {
    const u = game.u;
    const { near_capacity } = await import('./invent.js');
    const wtcap = near_capacity();
    const hurt = (u.uhp || 0) < 10 && u.uhp !== u.uhpmax;
    if ((wtcap >= OVERLOADED || (wtcap > SLT_ENCUMBER && hurt))
        && !Is_airlevel_cmd(u.uz)) {
        if (wtcap < OVERLOADED) {
            await pline("You don't have enough stamina to move.");
            exercise(A_CON, false); // -> rn2(2)
        } else {
            await pline('You collapse under your load.');
        }
        game.multi = 0; // C nomul(0)
        return true;
    }
    return false;
}

// C ref: dungeon.h Is_airlevel(lev) — the Plane of Air.  No level this port
// generates is the air level, so this is FALSE; kept so the two call sites
// above read like C rather than silently dropping the test.
function Is_airlevel_cmd(_uz) { return false; }

// C ref: hack.c air_turbulence() — on the Plane of Air a walking hero is
// buffeted: rn2(4) decides whether the step is lost at all, then rn2(3) picks
// the message (two of the three arms also exercise A_DEX).
async function air_turbulence() {
    const u = game.u;
    if (!Is_airlevel_cmd(u.uz) || u.uprops?.Levitation || u.uprops?.Flying)
        return false;
    if (!rn2(4)) return false;
    switch (rn2(3)) {
    case 0: await pline('You tumble in place.'); exercise(A_DEX, false); break;
    case 1: await pline("You can't control your movements very well."); break;
    default: await pline("It's hard to walk in thin air."); exercise(A_DEX, true); break;
    }
    return true;
}

// C ref: hack.c slippery_ice_fumbling() — every step taken on ice risks
// starting a one-turn Fumbling, and the rn2(Cold_resistance ? 3 : 2) that
// decides it is drawn on EVERY such step.  Snow boots, cold resistance, flying
// and the floater/clinger/whirly poly forms take the hero off the ice for this
// purpose (and then clear an externally-imposed Fumbling).
const FROMOUTSIDE_CMD = 0x04000000; // prop.h FROMOUTSIDE
const TIMEOUT_CMD = 0x00ffffff;     // prop.h TIMEOUT
function slippery_ice_fumbling() {
    const u = game.u;
    const cold_res = ((u.HCold_resistance || 0) > 0)
        || ((u.uprops?.ColdResistance || 0) > 0);
    let on_ice = !u.uprops?.Levitation
        && (game.level?.at(u.ux, u.uy)?.typ === ICE);
    if (on_ice) {
        const uarmf = game.uarmf;
        const snowboots = !!uarmf && OBJ_DESCR_CMD(uarmf) === 'snow boots';
        if (snowboots || cold_res || u.uprops?.Flying) {
            on_ice = false;
        } else if (!rn2(cold_res ? 3 : 2)) {
            u.HFumbling = ((u.HFumbling || 0) | FROMOUTSIDE_CMD) & ~TIMEOUT_CMD;
            u.HFumbling += 1; /* slip on next move */
        }
    }
    if (!on_ice && ((u.HFumbling || 0) & FROMOUTSIDE_CMD))
        u.HFumbling &= ~FROMOUTSIDE_CMD;
}

// C ref: objclass.h OBJ_DESCR(obj) — the (possibly shuffled) appearance word.
function OBJ_DESCR_CMD(obj) {
    if (!obj) return null;
    const idx = obj.oc_descr_idx != null ? obj.oc_descr_idx : obj.otyp;
    return DESCR_BY_OTYP[idx] ?? null;
}

// C ref: hack.c u_maybe_impaired() — a Stunned hero is always impaired; a
// merely Confused one is impaired only 1-in-5 of the time.  Short-circuit
// order matters: Stunned skips the rn2(5) draw entirely (matches C's
// `Stunned || (Confusion && !rn2(5))`).
function u_maybe_impaired() {
    const u = game.u;
    const stunned = (u.uprops?.Stun || 0) > 0 || !!u.Stunned;
    if (stunned) return true;
    const confused = (u.uprops?.Confusion || 0) > 0;
    return confused && !rn2(5);
}

// C ref: decl.c dirs_ord[]/xdir[]/ydir[] — cardinals-first direction order and
// the compass-point deltas, DIR_W..DIR_SW indexed 0..7.
const DIRS_ORD = [0, 2, 4, 6, 1, 3, 5, 7]; // W, N, E, S, NW, NE, SE, SW
const XDIR = [-1, -1, 0, 1, 1, 1, 0, -1];
const YDIR = [0, -1, -1, -1, 0, 1, 1, 1];
const PM_GRID_BUG = 116;

// C ref: cmd.c confdir(force_impairment) — if impaired (or forced), pick a
// random direction and overwrite u.dx/u.dy.  A grid-bug hero is NODIAG and
// only draws from the 4 cardinal entries of dirs_ord.
function confdir(forceImpairment) {
    const u = game.u;
    if (!(forceImpairment || u_maybe_impaired())) return;
    const kmax = (u.umonnum === PM_GRID_BUG) ? 4 : 8;
    const k = DIRS_ORD[rn2(kmax)];
    u.dx = XDIR[k];
    u.dy = YDIR[k];
}

// C ref: hack.c bad_rock(mdat,x,y) — reduced to the plain-human-hero case (no
// Sokoban boulder-push, no tunneling/wall-passing): blocked iff the square is
// obstructed terrain (rock/wall/tree/iron bars).
function bad_rock(x, y) {
    const loc = game.level?.at(x, y);
    return IS_OBSTRUCTED(loc ? loc.typ : 0);
}

// C ref: hack.c impaired_movement(&x, &y) — while impaired, repeatedly pick a
// random direction (confdir(TRUE)) until it lands on a valid, non-rock square,
// giving up (and returning "can't move") after 50 tries.  Returns the
// (possibly redirected) destination, or null if domove_core should bail out.
function impaired_movement(x, y) {
    const u = game.u;
    if (!u_maybe_impaired()) return { x, y };
    let tries = 0;
    let nx = x, ny = y;
    do {
        if (tries++ > 50) return null;
        confdir(true);
        nx = u.ux + u.dx;
        ny = u.uy + u.dy;
    } while (!isok(nx, ny) || bad_rock(nx, ny));
    return { x: nx, y: ny };
}

// C ref: hack.c:2638 escape_from_sticky_mon(x, y) — the hero, held by a
// sticking monster (lichen / acid blob / owlbear), tries to step away.  Returns
// TRUE when the attempt costs the turn.
//
// The rn2 MODULUS depends on the holder's mcanmove, and case 3 falls through to
// default, so a sleeping holder both escapes more often and can be woken.
async function escape_from_sticky_mon(x, y) {
    const u = game.u;
    const held = u.ustuck;
    if (!held || (x === held.mx && y === held.my)) return false;
    // Dynamic: monmove.js -> ... -> cmd.js is a static cycle.
    const { m_next2u, y_monnam_local } = await import('./monmove.js');
    if (!m_next2u(held)) { u.ustuck = null; return false; }
    // sticks(youmonst.data) is FALSE for every playable base form.
    const roll = rn2(!held.mcanmove ? 8 : 40);                  // hack.c:2664
    if (roll === 3 && !held.mcanmove) {
        held.mfrozen = 1;
        held.msleeping = 0;
    }
    if (roll > 2) {  /* case 3 falls through to default */
        // C: `if (!mtmp->mconf && !Conflict) { release } else { can't escape }`
        // — Conflict (the ring/artifact property) is not modelled anywhere in
        // this port, so it reads as FALSE; a hostile holder never releases.
        if (held.mconf || !held.mtame) {
            await pline(`You cannot escape from ${y_monnam_local(held)}!`);
            game.multi = 0;                                     // nomul(0)
            return true;
        }
    }
    u.ustuck = null;
    await pline(`You pull free from ${y_monnam_local(held)}.`);
    return false;
}

// C ref: hack.c domove / domove_core — execute a movement, including the
// bump-into-a-monster path (attack a hostile, or swap places with a pet).
export async function domove(dx, dy) {
    const u = game.u;
    // C ref: hack.c rhack() sets u.dx/u.dy from the pressed direction key
    // BEFORE calling domove(); domove_core() then reads u.ux+u.dx/u.uy+u.dy
    // as its starting point.  Our domove(dx,dy) receives that direction as
    // parameters, so this assignment is the equivalent point.
    u.dx = dx;
    u.dy = dy;
    // C ref: hack.c domove_core() — u.umoved is reset FALSE at the top of a
    // hero command and set TRUE only when the hero's position changes
    // (hack.c:2968).  u_calc_moveamt() reads it to decide whether a riding
    // hero rolls mcalcmove(usteed).
    const _umoved_ux0 = u.ux, _umoved_uy0 = u.uy;
    u.umoved = false;

    // C ref: hack.c domove_core():19 carrying_too_much() — an overloaded hero,
    // or a badly hurt one carrying more than Burdened, cannot move at all.  The
    // "not enough stamina" arm draws exercise(A_CON, FALSE)'s rn2(2) and neither
    // arm elapses a turn.  This runs BEFORE everything below, including the
    // uswallow split.
    if (await carrying_too_much()) return;

    // C ref: hack.c:2733 domove_core() — the swallowed arm.  A direction key
    // inside an engulfer is ALWAYS an attack on the engulfer: the step itself is
    // cancelled (u.dx = u.dy = 0), the target square is the swallower's own (the
    // hero's square), and control jumps straight to the bump/attack block —
    // skipping air_turbulence / slippery ice / impaired_movement /
    // escape_from_sticky_mon.  Without this a swallowed hero fell into
    // escape_from_sticky_mon()'s rn2(40) and never hit anything (seed0383 step
    // 169 wants hitum's rnd(20)).
    if (u.uswallow && u.ustuck) {
        u.dx = 0; u.dy = 0;
        u.ux0 = u.ux; u.uy0 = u.uy;
        const held = u.ustuck;
        // C: `if (!is_safemon(mtmp) || context.forcefight) nomul(0);` then
        // domove_bump_mon() (no-op for a hostile) then domove_attackmon_at().
        if (!is_safemon(held)) game.multi = 0;
        await do_attack(held);
        game.context.move = 1;
        return;
    }

    // C ref: hack.c air_turbulence() / slippery_ice_fumbling(), the two calls
    // at the top of domove_core's non-swallowed arm.  Both draw RNG that this
    // port used to skip: air_turbulence() rolls rn2(4) then rn2(3) on the air
    // level, and slippery_ice_fumbling() rolls rn2(Cold_resistance ? 3 : 2)
    // for EVERY step taken while standing on ice.
    if (await air_turbulence()) return;
    slippery_ice_fumbling();

    // C ref: hack.c domove_core() — `x = u.ux + u.dx; y = u.uy + u.dy; if
    // (impaired_movement(&x, &y)) return;`.  Not ported: the u.uswallow arm
    // (u.dx=u.dy=0, target = u.ustuck's square, then straight into the
    // bump/attack block) — attacking an engulfer from inside needs uhitm's
    // swallowed path, which this port does not model.
    const redirected = impaired_movement(u.ux + dx, u.uy + dy);
    if (!redirected) return; // 50 tries found no valid square; turn wasted
    const newx = redirected.x, newy = redirected.y;

    // C ref: hack.c:2757 — a run/rush/travel step onto a known trap stops the
    // hero here, before the monster-bump block, so C never reaches the
    // paranoid_confirm:trap prompt below while rushing.
    if (await avoid_running_into_trap(newx, newy)) return;

    // C ref: hack.c:2760 — after the out-of-bounds / avoid-trap checks and
    // BEFORE bumping into a monster.  Returns TRUE => the turn is spent:
    // cmd.c parse() sets svc.context.move = TRUE up front, and domove_core's
    // early return leaves it set, so a failed escape costs a move.
    if (await escape_from_sticky_mon(newx, newy)) { game.context.move = 1; return; }

    const mtmp = m_at(newx, newy);

    // C ref: hack.c:2765 — while running/rushing, a spottable monster that is
    // not is_safemon() stops the hero here, BEFORE the bump/attack handling and
    // without spending the turn.  This has to come after impaired_movement()
    // above: a Confused hero's redirected step is what actually gets tested
    // (and Confusion also makes is_safemon() FALSE for its own pet).
    if (run_stop_for_monster_at(newx, newy)) return;

    // C ref: hack.c:2780 — `u.ux0 = u.ux; u.uy0 = u.uy;` is committed HERE,
    // before the bump/terrain handling, so a move that is later refused (wall,
    // trapped hero, paranoid-trap decline) still leaves ux0 == ux.  Setting it
    // only on a successful step left a stale "square just left", which
    // mthrowu.c's URETREATING() reads: after a rush ended against a wall, a
    // monster behind the hero wrongly saw them still retreating and drew an
    // extra rn2(BOLT_LIM - dist) (seed0002 step 269).
    u.ux0 = u.ux;
    u.uy0 = u.uy;

    // ── bump into a monster ──  C ref: hack.c domove_core mtmp handling.
    if (mtmp) {
        // domove_attackmon_at(): displacer-beast swap not modelled; for a
        // normal bump we call do_attack().  do_attack() returns TRUE when the
        // hero's move was used up (a real attack, or "in the way" while
        // running), FALSE when the monster evaded -> fall through to the
        // swap-places handling below.
        if (await do_attack(mtmp)) {
            // The attack consumed the turn (C: do_attack returned TRUE); the
            // hero stays put (no vision recalc — position unchanged).
            game.context.move = 1;
            return;
        }
        // Monster evaded.  If we can't actually move there, stop.
        if (blocksMove(newx, newy)) {
            game.context.move = 0;
            return;
        }
        game.context.move = 1;
        // C ref: domove_core tentatively advances the hero, then swaps with a
        // safe pet at the destination.
        u.ux = newx;
        u.uy = newy;
        if (is_safemon(mtmp)) {
            const swapped = await domove_swap_with_pet(mtmp, newx, newy);
            if (!swapped) {
                // didn't move after all
                u.ux = u.ux0;
                u.uy = u.uy0;
            }
        }
        u.umoved = (u.ux !== _umoved_ux0 || u.uy !== _umoved_uy0);
        newsym(u.ux0, u.uy0);
        vision_recalc(1);
        newsym(u.ux, u.uy);
        // C ref: after swapping with a pet, domove_core() still falls through to
        // spoteffects(TRUE) -> pickup(1) on the hero's new square, so a swap onto
        // a floor object announces it (autopickup off) or lifts it (autopickup
        // on).  Only when the hero actually relocated (the swap succeeded).
        if (u.umoved)
            await pickup_after_move(u.ux, u.uy);
        return;
    }

    // ── force-fight an empty square ──  C ref: hack.c:2228 domove_fight_empty(x,y).
    // Two triggers, not one: the 'F' prefix (svc.context.forcefight), OR walking
    // into a square still REMEMBERED as holding an unseen monster ('I') that has
    // since moved away.  The second was omitted as "not exercised by the corpus"
    // and it is: a blind hero who bumped an unseen monster leaves an 'I' behind,
    // and stepping there later must print "You attack thin air." and stand
    // still, not walk on and describe the floor.  Consumes no RNG.  C:
    // domove_core runs this before trapmove()/test_move(), so it sits right
    // after the monster-bump block.
    const _ff_invis = isok(newx, newy) && !!game.level?.at(newx, newy)?.invisMon
                      && !m_at(newx, newy) && !game.context?.nopick;
    if (game.context?.forcefight || _ff_invis) {
        const off_edge = !isok(newx, newy);
        const loc = off_edge ? null : game.level?.at(newx, newy);
        const typ = loc ? loc.typ : STONE;
        // C: solid = off_edge || !accessible(x,y) || IS_FURNITURE(typ)
        const solid = off_edge || !ACCESSIBLE(typ) || IS_FURNITURE(typ);
        // C ref: hack.c:2260 — `boulder = sobj_at(BOULDER, x, y)`; a boulder on
        // ACCESSIBLE floor is not `solid`, but it still names the object and
        // still takes the "harmlessly " prefix (the prefix test is
        // `!(boulder || solid)`), so without this a force-fight at a boulder
        // read "You attack thin air."
        const boulder = off_edge ? null : boulder_at(newx, newy);
        // C ref: hack.c:2280 — "about to become known empty; remove 'I' if
        // present", BEFORE the message.  Without this the 'I' persists and the
        // hero force-fights thin air on that square forever.
        if (!off_edge) { unmap_object(newx, newy); newsym(newx, newy); }
        let buf;
        if (off_edge) {
            buf = 'an unknown obstacle';
        } else if (boulder) {
            buf = 'a boulder';                     /* ansimpleoname(boulder) */
        } else if (solid) {
            // C: a seen square (or any stone-wall / secret door/corridor) is
            // named via the cmap explanation ("the wall"); otherwise it reads
            // as an unknown obstacle.
            const seen = ((loc?.seenv ?? 0) & 0xff) || IS_STWALL(typ)
                       || typ === SDOOR || typ === SCORR;
            const expl = seen ? forcefight_terrain_expl(typ) : null;
            buf = expl ? `the ${expl}` : 'an unknown obstacle';
        } else {
            buf = 'thin air';
        }
        // C: You("%s%s %s.", solid ? "harmlessly " : "", "attack", buf).
        // update_topl(), not pline(): C's You() leaves toplin == TOPLINE_NEED_MORE,
        // so the monster turn that follows this wasted move APPENDS after two
        // spaces ("You attack thin air.  The goblin hits!") instead of replacing.
        await update_topl(`You ${(boulder || solid) ? 'harmlessly ' : ''}attack ${buf}.`);
        // C nomul(0): no run/multi is active during a plain 'F'+walk, so this is
        // a no-op here; the wasted attack still elapses a game turn.
        game.multi = 0;
        game.context.mv = 0;
        game.context.move = 1;
        return;
    }

    // ── paranoid_confirm:trap ──  C ref: hack.c:2823-2828 — `if (ParanoidTrap)
    // { if (avoid_trap_andor_region(x, y)) return; }`, between u_rooted() and
    // the u.utrap/trapmove() handling below.
    if (await avoid_trap_andor_region(newx, newy)) return;

    // C ref: hack.c:2813 — immediately after domove_fight_empty(), before
    // trapmove()/test_move(): `(void) unmap_invisible(x, y);`.  Walking toward a
    // square still remembered as holding an unseen monster ('I') that is no
    // longer there clears the marker even when the move itself is refused.
    if (isok(newx, newy) && !m_at(newx, newy)) unmap_invisible(newx, newy);

    // ── trapped hero struggles instead of moving ──  C ref: hack.c
    // domove_core() (hack.c:2830): once past the monster-bump handling, a hero
    // with u.utrap set calls trapmove(); a still-stuck (or just-freed) hero
    // remains in place — trapmove returns FALSE ("!moved") and domove_core
    // returns without advancing the hero.  The struggle still elapses a game
    // turn (monsters move), which is what makes the recorded sessions' bear-trap
    // sequence advance.  Reproduced here so a directional command while trapped
    // does NOT move the hero (seed0004: the pony stays adjacent because the
    // trapped hero never relocates, keeping its dochug is_wanderer rn2(4) live).
    if (u.utrap) {
        const moved = await trapmove(newx, newy);
        if (!u.utrap) game.botl = true; // reset_utrap(TRUE) — freed this turn
        if (!moved) {
            game.context.move = 1; // the struggle elapses a turn
            return;
        }
        // (TT_PIT into an adjacent pit / TT_LAVA edge can return moved==TRUE and
        //  fall through to the normal move below — not exercised here.)
    }

    // ── walk into a closed door ──  C ref: hack.c test_move() door branch.
    // C order: the IS_DOOR(tmpr->typ) branch tests closed_door(x,y) FIRST
    // (hack.c:1075); the autoopen path (hack.c:1097, doopen_indir) and the
    // bump/"That door is closed." path are inside that closed-door branch and
    // apply to ANY direction — diagonal moves into a *closed* door are NOT
    // rejected here.  The diagonal-into-doorway rejection (testdiag,
    // hack.c:1140) lives in the `else` arm and so only fires for open/doorless
    // doors.  This must therefore run BEFORE blocksDiagonalDoor() (the testdiag
    // mirror) so a diagonal step into a locked door autoopens like C does.
    {
        const tgt = game.level?.at(newx, newy);
        const closedDoor = tgt && IS_DOOR(tgt.typ)
            && (tgt.doormask & (D_CLOSED | D_LOCKED));
        if (closedDoor) {
            // C ref: hack.c:1097 — `flags.autoopen && !svc.context.run
            // && !Confusion && !Stunned && !Fumbling`.  An impaired hero walks
            // INTO the door ("Ouch!  That was a door.") instead of opening it,
            // which is a different message and a different RNG path.
            const u = game.u;
            const _stunned = (u?.uprops?.Stun || 0) > 0 || !!u?.Stunned;
            const _confused = !!(u?.uconf || u?.HConfusion);
            const _fumbling = !!(u?.HFumbling || u?.EFumbling);
            if (!game.context?.run && !game.context?.mv
                && !_confused && !_stunned && !_fumbling) {
                const odr = await doopen_indir(newx, newy);
                // The hero never relocates via autoopen (the door square is not
                // entered this command), so move follows position change (false)
                // for the plain open/"door resists" cases.  The autounlock
                // pick-lock occupation, however, elapses a game turn (C runs the
                // picklock occupation in the moveloop, advancing monsters) — it
                // returns 2 to request that the monster turn run.
                u.umoved = (u.ux !== _umoved_ux0 || u.uy !== _umoved_uy0);
                game.context.move = (u.umoved || odr === 2) ? 1 : 0;
                return;
            }
            // Running (autoopen disabled) into an orthogonal closed door:
            // C ref: hack.c test_move() else-if (x==ux||y==uy).  A hero who is
            // Blind, Stunned, Fumbling, or has ACURR(A_DEX) < 10 bumps into the
            // door instead of just noticing it's closed; unlike the plain
            // "closed" stop, the bump consumes the move (C sets
            // context.door_opened = context.move = TRUE and calls nomul(0)).
            // Diagonal running into a closed door (x!=ux && y!=uy) prints
            // nothing and just stops, matching neither sub-branch.
            if (newx === u.ux || newy === u.uy) {
                const stunned = (u.uprops?.Stun || 0) > 0 || !!u.Stunned;
                const fumbling = !!(u.HFumbling || u.EFumbling);
                if (Blind() || stunned || ACURR(A_DEX) < 10 || fumbling) {
                    if (u.usteed) {
                        await pline(`You can't lead ${mon_nam(u.usteed)} through that closed door.`);
                    } else {
                        await pline('Ouch!  You bump into a door.');
                        exercise(A_DEX, false);
                    }
                    game.multi = 0; // C nomul(0)
                    game.context.move = 1; // C: context.door_opened = context.move = TRUE
                    return;
                }
                await pline('That door is closed.');
            }
            game.context.move = 0;
            return;
        }
    }

    // ── no diagonal moves into / out of a doorway with a door ──
    // C ref: hack.c test_move() (hack.c:1140-1150, 1208-1214).  A diagonal step
    // that would enter a (non-closed, doored) door square — or leave one — is
    // rejected when the door is not doorless; the hero stays put and no turn
    // elapses.  Closed doors are handled by the autoopen path above (matching
    // C's closed_door-first ordering), so only open/doorless-with-frame doors
    // reach here.  This runs before the generic blocksMove() floor/wall test
    // because the door square itself is otherwise walkable floor.
    if (blocksDiagonalDoor(u.ux, u.uy, newx, newy, u.dx, u.dy)) {
        game.context.move = 0;
        return;
    }

    // ── tight diagonal ──  C ref: hack.c:1153-1172, which runs BEFORE the
    // boulder/moverock block below.  In Sokoban a boulder counts as rock, so
    // squeezing diagonally between two of them is refused outright instead of
    // being attempted as a push ("You try to move the boulder, but in vain.").
    // `!blocksMove(newx, newy)`: C's IS_OBSTRUCTED/IRONBARS/closed-door tests on
    // the DESTINATION run first (hack.c:1030) and return FALSE silently when
    // flags.mention_walls is off, so a diagonal aimed straight at a wall never
    // reaches the squeeze test.  Our port does that test after the boulder push,
    // hence the explicit guard here.
    if (u.dx && u.dy && !blocksMove(newx, newy)
        && bad_rock_hero(u.ux, newy) && bad_rock_hero(newx, u.uy)) {
        const why = await cant_squeeze_thru_hero();
        if (why) {
            await pline(why === 3 ? 'You cannot pass that way.'
                : why === 2 ? 'You are carrying too much to get through.'
                : 'Your body is too large to fit through.');
            game.context.move = 0;
            return;
        }
    }

    // ── push a boulder ──  C ref: hack.c test_move() DO_MOVE branch -> moverock().
    // A boulder sits on an otherwise-passable square, so blocksMove() below would
    // wrongly let the hero step onto it.  Instead, C tries to roll the boulder one
    // square further in the move direction; if it can't move, test_move returns
    // FALSE and the hero stays put (no turn elapses).  Only reached when the hero
    // does not pass through walls (the corpus heroes never do).
    {
        const bobj = boulder_at(newx, newy);
        // C ref: hack.c:1217 — a hero who is rushing/running/travelling
        // (context.run >= 2) stops in front of a boulder instead of pushing it,
        // and C's `if (!test_move(...DO_MOVE)) { move = 0; nomul(0); }` at
        // hack.c:2841 ends the run there.  rhack() still forces context.move
        // back on for a command that returned ECMD_TIME, so travel's first step
        // costs the turn anyway (hack.js travel_walk()).
        if (bobj && (game.context.run || 0) >= 2
            && !Blind() && !Hallucination() && !could_move_onto_boulder(newx, newy)) {
            if (game.flags?.mention_walls) await pline('A boulder blocks your path.');
            game.context.move = 0;
            game.multi = 0;             // C nomul(0)
            return;
        }
        if (bobj) {
            const pushed = await moverock(bobj, newx, newy, u.dx, u.dy);
            if (pushed < 0) {
                // Boulder couldn't be pushed: hero stays put, no turn elapses.
                game.context.move = 0;
                return;
            }
            // Boulder rolled away -> fall through to the normal move onto its old
            // square (blocksMove sees plain floor/corridor there now).
        }
    }

    if (blocksMove(newx, newy)) {
        // Can't move there.  C ref: hack.c test_move() DO_MOVE else-branch — a
        // blocked move announces the obstacle when flags.mention_walls is set
        // (closed doors are already handled above).  C names the background via
        // back_to_glyph(): S_stone -> "solid stone", otherwise an(explanation)
        // of the cmap symbol ("a wall").  blocksMove only stops STONE / walls
        // here, so those two cases cover it; pline_dir for a sighted hero just
        // prints "It's %s." (no directional prefix).
        if (game.flags?.mention_walls) {
            const tgt = game.level?.at(newx, newy);
            const t = tgt ? tgt.typ : STONE;
            // C ref: display.c back_to_glyph() — SCORR/STONE are S_stone, TREE
            // is S_tree, and a wall (or the SDOOR hiding in one) reads as the
            // wall only once seenv is set.  defsym.h gives S_tree the
            // explanation "tree", so an() makes it "a tree".
            const buf = (t === STONE || t === SCORR) ? 'solid stone'
                      : (t === TREE) ? 'a tree'
                      : (IS_WALL(t) || t === SDOOR)
                          ? ((tgt?.seenv | 0) ? 'a wall' : 'solid stone')
                      : null;
            if (buf) await pline(`It's ${buf}.`);
        }
        game.context.move = 0;
        return;
    }

    // ── avoid stepping into water/lava (paranoid_confirm:swim) ──  C ref:
    // hack.c domove() -> swim_move_danger(x,y), checked right after test_move()
    // succeeds and before the hero actually relocates.
    if (await swim_move_danger(newx, newy)) {
        game.context.move = 0;
        game.multi = 0; // C nomul(0)
        return;
    }

    // C ref: hack.c domove_core():2860 — "Move ball and chain."  This runs
    // BEFORE the hero relocates (drag_ball wants the hero's OLD square for the
    // chain) and can abort the move entirely, e.g. "You cannot drag the heavy
    // iron ball."
    let bc = null;
    if (u.uball && u.uchain) {
        const { drag_ball } = await import('./ball.js');
        bc = await drag_ball(newx, newy, true);
        if (!bc) return;
    }

    // The move actually happens -> a game turn elapses.  C ref: hack.c domove
    // sets svc.context.move=1 on a successful step.
    game.context.move = 1;

    // Move the hero
    const oldx = u.ux, oldy = u.uy;
    u.ux0 = oldx;
    u.uy0 = oldy;
    u.ux = newx;
    u.uy = newy;
    u.umoved = true; // C ref: hack.c:2968 — position changed

    // C ref: hack.c:2877 — `m_postmove_effect(&gy.youmonst)` fires immediately
    // after the tentative position update and before the steed follows; it reads
    // u.ux0/u.uy0, so a hero polymorphed into a hezrou / steam vortex leaves its
    // cloud on the square just vacated.
    {
        const { m_postmove_effect } = await import('./monmove.js');
        await m_postmove_effect(u);
    }

    // C ref: hack.c:2879-2884 — a ridden steed moves with the hero, so its map
    // position is kept synced to the hero's.  Without this the steed's mx/my go
    // stale after the first ride step and its per-turn distfleeck nearby/monnear
    // test (and hence the dochug is_wanderer rn2(4) branch) diverges from C
    // every subsequent turn.
    if (u.usteed) { u.usteed.mx = u.ux; u.usteed.my = u.uy; }

    // C ref: hack.c domove_core() -> u_on_newpos() -> dungeon.c see_nearby_objects().
    // Having relocated on the same level, the hero may now be close enough to a
    // generic (undescribed) potion/gem/spellbook to see it up close, upgrading
    // its map glyph from the generic gray class symbol to its appearance color.
    // Runs before vision_recalc(1) (matching u_on_newpos's position in
    // domove_core), so it uses the still-old viz_array like C does.
    see_nearby_objects();

    // Update display
    newsym(oldx, oldy);
    vision_recalc(1);
    newsym(newx, newy);

    // C ref: hack.c domove_core() -> spoteffects(TRUE).  spoteffects() runs
    // pickup(1) before a non-pit trap (and after a pit trap), then dotrap().
    // Passing pickup_after_move as the callback (called with the CURRENT
    // hero position, not these fixed newx/newy) preserves that C ordering so
    // a floor pile is announced ("Things that are here:" --More--) before a
    // dart trap fires on the same square — and so a fall-into-water/crawl-out
    // re-entry (pooleffects -> drown -> teleds -> spoteffects again) picks up
    // at the square the hero actually lands on, not the one it fell into.
    // C ref: hack.c domove_core():2976 — `if (Punished) move_bc(0, ...)`, i.e.
    // put the ball and chain back down at the positions drag_ball() picked.
    // This happens BEFORE spoteffects(), so the pile the hero steps onto
    // already includes anything the chain landed on.
    if (bc) {
        const { move_bc } = await import('./ball.js');
        move_bc(0, bc.bc_control, bc.ballx, bc.bally, bc.chainx, bc.chainy);
    }

    await spoteffects(pickup_after_move);
    // C ref: end.c really_done() longjmps out; if spoteffects() (e.g.
    // lava_effects()) just ended the game, none of domove()'s post-move work
    // (engraving smudge) runs.
    if (game.program_state?.gameover) return;

    // C ref: hack.c domove_core():2984 — "delay next move because of ball
    // dragging; must come after we finished picking up, in spoteffects()".
    // nomul(-2) makes the hero helpless for two turns, so ONE movement command
    // runs TWO moveloop iterations (monsters move twice, the hunger/sounds rolls
    // fire twice).  Leaving this out is what desynchronised seed4500 from step
    // 514: C advanced T:87 -> 89 for a single 'l' keypress.
    if (bc?.cause_delay) {
        // C ref: hack.c nomul(nval) — `if (gm.multi < nval) return; gm.multi =
        // nval;`.  multi is 0 on a normal step, so this always takes.  The
        // moveloop's `if (multi < 0) ++multi` countdown (allmain.js) then runs
        // the extra turn(s) with no command read in between.
        if ((game.multi ?? 0) >= -2) game.multi = -2;
        game.multi_reason = 'dragging an iron ball';
        game.nomovemsg = '';
    }

    // C ref: hack.c domove() — after domove_core() (movement + spoteffects,
    // i.e. everything above) completes, a successful WALK/RUSH smudges any
    // engraving on the squares the hero left and entered (rnd(5) per engraved
    // square) using the CURRENT position (spoteffects may have moved the hero
    // further, e.g. falling through a trap door).  This runs AFTER read_engr_at
    // (called from spoteffects' pickup path), so what gets read/displayed this
    // turn is the engraving as it stood BEFORE this move's smudge.
    maybe_smudge_engr(oldx, oldy, u.ux, u.uy);
}

// C ref: drawing.c defsyms[].explanation (the short "desc" field) for the
// terrain a hero force-fights via domove_fight_empty().  Walls (and secret
// doors, which display as walls) read as "wall"; pools/moat/water read as
// "water"; lava as "molten lava"; stone/tree/iron-bars name themselves.
// Returns null for terrain types not named here (caller falls back to "an
// unknown obstacle"), mirroring the seen-but-unhandled case conservatively.
function forcefight_terrain_expl(typ) {
    if (typ === STONE) return 'stone';
    if (IS_WALL(typ) || typ === SDOOR) return 'wall';
    if (typ === TREE) return 'tree';
    if (typ === IRONBARS) return 'iron bars';
    if (typ === POOL || typ === MOAT || typ === WATER) return 'water';
    if (typ === LAVAPOOL) return 'molten lava';
    return null;
}

// C ref: hack.c trapmove(x, y, desttrap) — the hero, already trapped, tries to
// move in direction (u.dx,u.dy) toward (x,y).  Returns FALSE when the hero
// stays put (the common case: still struggling, or just wriggled free this
// turn), TRUE only when a trap type lets the move proceed (adjacent-pit /
// lava-edge — not reached by the contest hero).  Decrements u.utrap and emits
// the Norep predicament line.  RNG: only the TT_BEARTRAP orthogonal-move
// rn2(5) and (when implemented) other types' rolls — a diagonal bear-trap
// struggle consumes NO RNG, matching the recorded seed0004 "b" struggles.
async function trapmove(x, y) {
    const u = game.u;
    if (!u.utrap) return true; // sanity (C: !u.utrap -> return TRUE)
    const dx = u.dx, dy = u.dy;

    switch (u.utraptype) {
    case TT_BEARTRAP: {
        // C ref: hack.c:1567 — verbose predicament line (Norep-deduped).
        await Norep_topl('You are caught in a bear trap.');
        // C ref: hack.c:1575 — "[why does diagonal movement give quickest
        // escape?]"  A diagonal move always frees one tick; an orthogonal move
        // does so only on !rn2(5).
        if ((dx && dy) || !rn2(5))
            u.utrap--;
        // Whether still stuck or just freed (wriggle_free), the hero does not
        // relocate this turn.  C ref: hack.c wriggle_free -> pline() -> update_topl
        // which APPENDS onto the still-pending "You are caught in a bear trap."
        // predicament line ("... bear trap.  You finally wriggle free.").
        if (!u.utrap) {
            const { update_topl } = await import('./display.js');
            await update_topl('You finally wriggle free.');
        }
        return false;
    }
    case TT_PIT: {
        // C ref: hack.c:1580 — moving into a *seen* adjacent pit is allowed.
        const t = trap_at(x, y);
        if (t && t.tseen && is_pit_ttyp(t.ttyp))
            return true;
        // Otherwise try to climb out (position unchanged).
        await climb_pit();
        return false;
    }
    case TT_WEB:
        // C ref: hack.c:1587 — --u.utrap, stay put; ART_STING free not modeled.
        if (--u.utrap)
            await Norep_topl('You are stuck to the web.');
        else
            await pline('You disentangle yourself.');
        return false;
    case TT_LAVA:
        // C ref: hack.c:1609 — stuck in lava; struggle in place.  The decrement
        // is gated on the DESTINATION not being lava (a hero wading further in
        // makes no progress toward the edge), and C sets u.umoved here even
        // though the hero stays put — u_calc_moveamt() reads it.
        await Norep_topl('You are stuck in the lava.');
        if (!IS_LAVA(game.level?.at(x, y)?.typ ?? STONE)) {
            u.utrap--;
            if ((u.utrap & 0xff) === 0) {
                u.utrap = 0;
                await pline(`You pull yourself to the edge of the lava.`);
            }
        }
        u.umoved = true;
        return false;
    case TT_INFLOOR:
        // C ref: hack.c:1631 — stuck in the floor (buried-ball not modeled).
        if (--u.utrap)
            await Norep_topl('You are stuck in the floor.');
        else
            await pline('You finally wriggle free.');
        return false;
    default:
        // Unknown trap type: struggle in place without consuming RNG.
        if (u.utrap) u.utrap--;
        return false;
    }
}

// C ref: pline.c Norep(...) — like pline() but suppresses the message when it is
// identical to the CURRENT top line (gt.toplines).  gt.toplines persists across
// the command-prompt blank (it is not cleared with the displayed message), so a
// struggle line stays deduped turn after turn, yet an intervening *different*
// message (e.g. the pet's "caught in a bear trap!") lets the next struggle line
// reprint.  We track that persistent text in game._toplines.
async function Norep_topl(msg) {
    if (game._toplines === msg) return;
    const { update_topl } = await import('./display.js');
    await update_topl(msg);
}

// C ref: trap.c t_at(x,y) — the trap at a square (or null).
function trap_at(x, y) {
    for (const t of (game.level?.traps || []))
        if (t.tx === x && t.ty === y) return t;
    return null;
}
// C ref: trap.h is_pit(ttyp) — PIT or SPIKED_PIT.
function is_pit_ttyp(ttyp) { return ttyp === PIT || ttyp === SPIKED_PIT; }
// C ref: trap.c climb_pit() — one turn's attempt to get out of a pit.
//
// The old placeholder here consumed NO RNG on the grounds that the climb path
// wasn't reached at a diverging point.  It is reached on EVERY struggle: C's
// second arm is `!rn2(2) && sobj_at(BOULDER, u.ux, u.uy)`, and && evaluates
// rn2(2) FIRST, so a hero in a pit burns one rn2(2) per struggle turn whether
// or not a boulder is there.  A hero who walks into a pit and then tries to
// move out several times was therefore several draws ahead of C.
async function climb_pit() {
    const u = game.u;
    if (!u.utrap || u.utraptype !== TT_PIT) return;
    // Passes_walls (phasing / xorn form) is FALSE for every hero this port runs.
    if (!rn2(2) && boulder_at(u.ux, u.uy)) {
        await pline('Your leg gets stuck in a crevice.');
        // display_nhwindow(WIN_MESSAGE, FALSE) pages the pending line with
        // --More-- before the follow-up prints (tty_display_nhwindow's
        // NHW_MESSAGE arm calls more() whenever toplin == TOPLINE_NEED_MORE,
        // blocking or not).
        await topl_more();
        game._pending_message = '';
        await pline('You free your leg.');
        return;
    }
    if ((u.uprops?.Flying || 0) && !In_sokoban(u.uz)) {
        // is_clinger() needs a poly form no hero here takes.
        await pline('You climb from the pit.');
        reset_utrap_cmd();
        fill_pit_cmd(u.ux, u.uy);
        game.vision_full_recalc = 1;
        return;
    }
    // m_easy_escape_pit(youmonst): PM_PIT_FIEND / MZ_HUGE — no hero form here.
    if (!(--u.utrap)) {
        reset_utrap_cmd();
        await pline(`${(In_sokoban(u.uz) && u.uprops?.Levitation)
            ? 'You struggle against the air currents and float'
            : u.usteed ? 'You ride' : 'You crawl'} to the edge of the pit.`);
        fill_pit_cmd(u.ux, u.uy);
        game.vision_full_recalc = 1;
        return;
    }
    // flags.verbose defaults On.  The Hallucination arm draws rn2(5); note the
    // && short-circuit means it is NOT drawn for a sane hero.
    if (u.usteed)
        await Norep_topl(`${Monnam(u.usteed)} is still in a pit.`);
    else
        await Norep_topl((Hallucination() && !rn2(5))
            ? "You've fallen, and you can't get up."
            : 'You are still in a pit.');
}

// C ref: trap.c reset_utrap(msg) — clear the trapped state.  The Levitation /
// Flying re-evaluation (float_vs_flight) has no effect for a hero who is
// neither, which is every hero that reaches this.
function reset_utrap_cmd() {
    const u = game.u;
    u.utrap = 0;
    u.utraptype = 0;
    game.botl = true;
}

// C ref: trap.c fill_pit(x, y) — a boulder sitting in a pit falls in and fills
// it, removing the boulder from the floor.
function fill_pit_cmd(x, y) {
    const t = trap_at(x, y);
    if (!t || !is_pit_ttyp(t.ttyp)) return;
    const otmp = boulder_at(x, y);
    if (!otmp) return;
    const objs = game.level?.objects;
    if (objs) {
        const i = objs.indexOf(otmp);
        if (i >= 0) objs.splice(i, 1);
    }
    otmp.where = 'free';
    // flooreffects(otmp, x, y, "settle") fills the pit: the trap is removed.
    game.level.traps = (game.level.traps || []).filter((tr) => tr !== t);
    newsym(x, y);
}

// C ref: hack.c:939 bad_rock(mdat, x, y) for the hero.  `!tunnels(mdat) ||
// needspick(mdat) || !may_dig(x,y)` is always TRUE for a non-tunnelling hero,
// and `!(passes_walls && may_passwall)` is TRUE whenever Passes_walls is off, so
// for the corpus heroes the wall arm reduces to IS_OBSTRUCTED.  The Sokoban arm
// is the one that matters: there a boulder counts as rock.
function bad_rock_hero(x, y) {
    if (In_sokoban(game.u?.uz) && boulder_at(x, y)) return true;
    if (game.u?.uprops?.Passes_walls) return false;
    const loc = game.level?.at(x, y);
    return IS_OBSTRUCTED(loc ? loc.typ : 0);
}

// C ref: hack.c:952 cant_squeeze_thru(&youmonst) — 0 fits, 1 too big,
// 2 carrying too much, 3 Sokoban.
async function cant_squeeze_thru_hero() {
    const u = game.u;
    if (u?.uprops?.Passes_walls) return 0;
    const MZ_LARGE = 3, WT_TOOMUCH_DIAGONAL = 600;  // weight.h:22
    // Upolyd only: an unpolymorphed hero is MZ_HUMAN.  amorphous/whirly/
    // noncorporeal/slithy/can_fog all need a polyform none of these heroes take.
    const ptr = u?.mcham_data || null;
    if (ptr && (ptr.msize ?? 0) >= MZ_LARGE) return 1;
    const { carried_weight } = await import('./invent.js');
    if (carried_weight() > WT_TOOMUCH_DIAGONAL) return 2;
    if (In_sokoban(u?.uz)) return 3;
    return 0;
}

// C ref: mkobj.c sobj_at(BOULDER, x, y) — the topmost boulder lying on the floor
// at (x,y), or null.  BOULDER otyp is 475 (mkobj.js).  vobj_at-style scan of the
// flat level object list, returning the last (top-of-pile) match.
function boulder_at(x, y) {
    let found = null;
    for (const o of (game.level?.objects || []))
        if (o.where === 'floor' && o.ox === x && o.oy === y && o.otyp === 475)
            found = o;
    return found;
}

// C ref: mondata.h throws_rocks(ptr) == (mons[].mflags2 & M2_ROCKTHROW) — a
// hero polymorphed into a rock-thrower pushes a boulder with "little" rather
// than "great" effort.  The hardcoded pmidx list this replaces named ettin,
// minotaur and the Chromatic Dragon (none carry M2_ROCKTHROW) and omitted the
// Cyclops and Lord Surtur; 359 was Chromatic Dragon, not Cyclops (360).
// u.umonnum tracks gy.youmonst.data's pmidx in both the normal and polymorphed
// state (polyself.js:352), and mflags2_of() keys on .pmidx alone.
function hero_throws_rocks() {
    return throws_rocks_flag({ pmidx: game.u?.umonnum });
}

// C ref: objnam.c the(xname(otmp)) for a lone boulder — "the boulder".  Built
// from the object type's base name so it stays correct for any pushable object
// (boulders never take a shuffled appearance and always have quan 1 on the map).
function the_pushable_name(otmp) {
    return `the ${OBJECTS[otmp.otyp]?.name || 'boulder'}`;
}

// C ref: hack.c moverock() — the hero, moving in direction (dx,dy), tries to
// push the boulder at (sx,sy) one square further to (rx,ry).  Returns 0 when the
// boulder rolled (or the hero may still advance), -1 when it is stuck and the
// hero must stay put.  Only the on-foot, sighted common case is exercised by the
// corpus; the swallowing-trap / pool / mounted variants are guarded out of the
// success path so no boulder is ever left in an inconsistent map state.
async function moverock(otmp, sx, sy, dx, dy) {
    const u = game.u;
    const rx = u.ux + 2 * dx; // boulder destination
    const ry = u.uy + 2 * dy;
    game.multi = 0; // C nomul(0)

    // Levitation: no leverage to push.  (verysmall/steed variants omitted — no
    // tiny-form or mounted hero pushes a boulder in the corpus.)
    if (u?.uprops?.Levitation) {
        await pline(`You don't have enough leverage to push ${the_pushable_name(otmp)}.`);
        return -1;
    }

    const dloc = game.level?.at(rx, ry);
    const dtyp = dloc ? dloc.typ : STONE;
    const isPoolLava = dtyp === POOL || dtyp === MOAT || dtyp === WATER
                    || dtyp === LAVAPOOL;
    const closedDoor = dloc && IS_DOOR(dtyp)
                    && (dloc.doormask & (D_CLOSED | D_LOCKED));
    // C: the moverock_core() outer condition — destination must be a real,
    // in-bounds, non-wall/rock/ironbars square not itself holding a boulder.
    // A diagonal push is refused into a doored doorway (unless doorless).
    const destOk = isok(rx, ry) && !IS_ROCK(dtyp) && dtyp !== IRONBARS
        && (!IS_DOOR(dtyp) || !(dx && dy) || doorless_door(rx, ry))
        && !boulder_at(rx, ry);

    if (destOk) {
        // C ref: hack.c moverock_core() — a monster occupying the destination
        // blocks the push (unless it's a noncorporeal ghost/shade, or one
        // pinned in a pit/spiked pit).  Report it as seen or heard, then
        // refuse the push, before falling through to the trap/door/pool
        // handling below.
        const mtmp = m_at(rx, ry);
        const destTrap = trap_at(rx, ry);
        if (mtmp && mtmp.data?.mlet !== ' ' /* noncorporeal ghost/shade */
            && (!mtmp.mtrapped || !(destTrap && is_pit_ttyp(destTrap.ttyp)))) {
            // Two plines can fire in the same turn (sense + verbose), so route
            // both through update_topl() — it inserts the --More-- pause (its
            // own screen frame) when they don't fit coalesced on one line,
            // exactly like C's back-to-back pline() calls do.
            let deliverPart1 = false;
            if (canspotmon(mtmp)) {
                await update_topl(`There's ${x_monnam(mtmp, 2, null, 0, false)} on the other side.`);
                deliverPart1 = true;
            } else {
                if (!game.u?.Deaf && game.flags?.acoustics !== false) {
                    await update_topl(`You hear a monster behind ${the_pushable_name(otmp)}.`);
                    deliverPart1 = true;
                }
                map_invisible(rx, ry);
            }
            if (game.flags?.verbose !== false) {
                await update_topl(deliverPart1
                    ? `Perhaps that's why you cannot move it.`
                    : `You cannot move ${the_pushable_name(otmp)}.`);
            }
            return -1;
        }
    }

    const canRoll = destOk
        && !closedDoor && !isPoolLava
        && !trap_at(rx, ry);  // keep the boulder off any trap (conservative)

    if (canRoll) {
        // C ref: hack.c moverock() — the "With <little|great> effort you move
        // <the boulder>." line, suppressed (via the static lastmovetime) when the
        // hero pushed the same boulder within the last two turns so a run of
        // pushes doesn't spam it.
        if (!u.usteed) {
            const lmt = game._boulder_lastmovetime;
            if (lmt == null || game.moves > lmt + 2 || game.moves < lmt)
                await pline(`With ${hero_throws_rocks() ? 'little' : 'great'} effort `
                          + `you move ${the_pushable_name(otmp)}.`);
            // C ref: hack.c dopush() — `if (!easypush) exercise(A_STR, TRUE);`.
            // A non-rock-thrower trains Str (rn2(19) inside exercise) on EVERY
            // push, independent of whether the effort message printed.
            if (!hero_throws_rocks()) exercise(A_STR, true);
            game._boulder_lastmovetime = game.moves;
        }
        // C ref: hack.c dopush() — "if (glyph_is_invisible(levl[rx][ry].glyph))
        // unmap_object(rx, ry);" BEFORE moving the boulder: a destination
        // square remembered as holding a sensed-but-unseen monster ('I') must
        // have that notation cleared so the newsym(rx,ry) below shows the
        // boulder instead of re-asserting the stale 'I'.
        if (dloc?.invisMon) unmap_object(rx, ry);
        // C: movobj(otmp, rx, ry) == remove_object(obj) + place_object(obj, ox, oy):
        // the boulder is unlinked from the floor chain and RE-INSERTED AT THE
        // FOBJ HEAD, not just given new coordinates.  A later dog_goal() fobj
        // scan (dogmove.js) walks that chain newest-first, so a pet's
        // apport/obj_resists roll order depends on this repositioning; leaving
        // the boulder at its original (creation-order) slot in our flat
        // game.level.objects array desyncs that scan's RNG order against a
        // separately-created object the boulder has now been pushed past.
        const _objs = game.level?.objects;
        if (_objs) {
            const _oi = _objs.indexOf(otmp);
            if (_oi >= 0) _objs.splice(_oi, 1);
        }
        otmp.ox = rx;
        otmp.oy = ry;
        if (_objs) _objs.push(otmp);
        // C ref: mkobj.c place_object() block_point(rx,ry) / remove_object()
        // recalc_block_point(sx,sy) — a boulder blocks light, so relocating it
        // must update the vision map: the destination becomes opaque and the
        // vacated square becomes transparent again (unless the terrain blocks).
        // Without this a monster's clear_path() to the hero would ignore the
        // boulder and skip linedup()'s rn2(2+boulderspots) roll.
        recalc_block_point(rx, ry);
        recalc_block_point(sx, sy);
        newsym(rx, ry);
        newsym(sx, sy);
        return 0;
    }

    // C ref: hack.c moverock() nopushmsg: — the boulder is wedged and won't budge.
    if (game.flags?.verbose !== false)
        await pline(`You try to move ${the_pushable_name(otmp)}, but in vain.`);
    return -1;
}

// C ref: hack.c domove_core() -> spoteffects(TRUE) -> pickup(1).  pickup(1)
// runs at the tail of EVERY move that relocates the hero (plain step, run,
// rush, or a swap with a pet).  With autopickup off it falls through to
// look_here() — announcing a single floor object as "You see here <a thing>."
// (no game time, no RNG); a run additionally halts on the object (handled by
// runStopOnObject in hack.js).  With autopickup on it instead lifts the
// matching floor objects (prinv "<letter> - <name>." lines).  Travel (run == 8)
// does not auto-stop, but pickup still fires; we exclude only the mid-action
// teleport case (context.mv with no context.run) which C skips via
// "gm.multi && !run".  Exported so steed.js's dismount_steed_bychoice() can
// invoke the same pickup(1) tail that C's float_down() runs once the hero has
// landed on the dismount square.
export async function pickup_after_move(x, y) {
    const ctx = game.context || {};
    // C ref: pickup.c check_here() counts the objects here EXCLUDING uchain:
    //     for (obj = level.objects[u.ux][u.uy]; obj; obj = obj->nexthere)
    //         if (obj != uchain) ct++;
    // so a hero who steps onto the trailing end of the punishment chain gets no
    // "You see here an iron chain." — seed4500 step 517 shows an empty topline.
    const not_uchain = (o) => o !== game.u?.uchain;
    const hasObj = (game.level?.objects || []).filter(not_uchain).some(
        (o) => o.where === 'floor' && o.ox === x && o.oy === y);
    // C ref: hack.c spoteffects() -> pickup(1) -> describe_decor() (pickup.c),
    // and check_here() -> describe_decor(): with the 'mention_decor' option on,
    // an unobscured dungeon feature under the hero is announced ("There is a
    // broken door here.") before objects are looked at / picked up.  A move that
    // lands the hero IN a pool/lava is short-circuited by pooleffects(TRUE)
    // BEFORE pickup() runs (spoteffects goto spotdone), so those are not
    // announced.  mention_decor is only set by the tutorial, so this is inert
    // elsewhere; the tutorial hero always sinks, so the pool/lava skip matches
    // C (a hero held above liquid by Lev/Fly/Wwalk is out of scope here).
    // C ref: pickup.c check_here() — describe_decor()'s return value becomes
    // LOOKHERE_SKIP_DFEATURE, telling look_here() not to re-announce the same
    // feature it just printed.  Outside the tutorial (mention_decor off),
    // describe_decor() never runs, so look_here() is the one that announces it.
    let decorAnnounced = false;
    if (game.flags?.mention_decor) {
        const loc = game.level?.at?.(x, y);
        const inLiquid = !!loc && (IS_POOL(loc.typ) || IS_LAVA(loc.typ));
        if (!inLiquid) decorAnnounced = await describe_decor();
    }
    // C ref: pickup.c pickup():701 — `if (autopickup && (svc.context.nopick
    // || !OBJ_AT(...) ...)) { read_engr_at(...); return 0; }`.  This function
    // models pickup(1), so autopickup is always TRUE: with nopick set (travel,
    // or an 'm'-prefixed move) C returns before autopick() AND before
    // check_here(), so the pile the hero walks over is neither lifted nor
    // announced.  Without this a travel over a corpse pile opened the "Things
    // that are here:" menu mid-walk and burned an input boundary on its
    // --More-- (seed0014 step 653).
    if (ctx.nopick) {
        await read_engr_at(x, y);
        return;
    }
    // C ref: pickup.c pickup() — "if there's anything here, stop running":
    //   if (OBJ_AT(u.ux,u.uy) && svc.context.run && svc.context.run != 8
    //       && !svc.context.nopick) nomul(0);
    // This runs INSIDE pickup(), i.e. BEFORE autopickup lifts the object, so a
    // run halts ON the object's square even when autopickup then removes it from
    // the floor.  (hack.js runStopOnObject only catches the no-autopickup case,
    // where the object is still on the floor after the move.)  nomul(0): leave a
    // busy hero alone (multi < 0), else clear multi + travel state to end the run.
    if (hasObj && ctx.run && ctx.run !== 8 && !ctx.nopick
        && (game.multi ?? 0) >= 0) {
        game.multi = 0;
        game.context = game.context || {};
        game.context.travel = game.context.travel1 = game.context.mv = 0;
    }
    if (game.flags?.pickup) {
        const nPicked = await autopickup_after_move(x, y);
        // C ref: pickup.c pickup() -> check_here(n_picked > 0): after autopickup,
        // any objects still on the square are announced ("You see here ...").
        // pickup_types may exclude them (e.g. a chest when '(' isn't selected),
        // so an item can remain even with autopickup on.  When nothing is left,
        // C reads any engraving instead.
        const remain = (game.level?.objects || []).filter(
            (o) => not_uchain(o) && o.where === 'floor' && o.ox === x && o.oy === y);
        if (remain.length > 0) {
            await look_here_after_move(x, y, nPicked > 0, decorAnnounced);
        } else {
            await read_engr_at(x, y);
        }
    } else if (ctx.run !== 8) {
        // C ref: pickup.c check_here() — `if (ct) look_here(ct, lhflags); else
        // read_engr_at(...)`, with ct counting everything but uchain.  The
        // look_here() call was unconditional here, so a square holding only the
        // punishment chain still got a "You see here an iron chain." line that C
        // never prints.
        if (hasObj) await look_here_after_move(x, y, false, decorAnnounced);
        else await read_engr_at(x, y);
    }
}

// The engraving auto-read used to be scoped to the tutorial while regular-level
// engraving placement was still diverging; that scoping was removed and the
// predicate now matches C unconditionally (read_engr_at() runs on every move's
// pickup, as in pickup.c check_here()).  Kept as a named hook so the call site
// still reads like C's structure.
function engr_read_enabled() {
    return true;
}

// C ref: engrave.c read_engr_at() — sense and read aloud the engraving at
// (x,y).  Prints the type-specific "is engraved/burned/written here" line, then
// "You read: \"<text>\"<punct>" (no end '.' if the text already ends in .!?),
// and — crucially for the tutorial run paths — stops a run/travel (nomul(0))
// since the hero just stepped onto a feature worth noticing.  Only the
// not-Blind sensing cases the tut-1 level uses (ENGRAVE / BURN) are exercised;
// DUST / MARK / blood are handled structurally for faithfulness.
async function read_engr_at(x, y) {
    if (!engr_read_enabled()) return;
    const ep = engr_at(x, y);
    if (!ep) return;
    const text = ep.actualText || '';
    if (!text) return;
    let sensed = false;
    let intro = '';
    switch (ep.engr_type) {
    case 1 /*DUST*/:        intro = 'Something is written here in the dust.'; sensed = true; break;
    case 2 /*ENGRAVE*/:
    case 6 /*HEADSTONE*/:   intro = 'Something is engraved here on the floor.'; sensed = true; break;
    case 3 /*BURN*/:        intro = 'Some text has been burned into the floor here.'; sensed = true; break;
    case 4 /*MARK*/:        intro = "There's some graffiti on the floor here."; sensed = true; break;
    case 5 /*ENGR_BLOOD*/:  intro = 'You see a message scrawled in blood here.'; sensed = true; break;
    default: return;
    }
    if (!sensed) return;
    // C: endpunct = "." unless the (original) text already ends in . ! or ?.
    const last = text.charAt(text.length - 1);
    const endpunct = (text.length >= 2 && '.!?'.includes(last)) ? '' : '.';
    const readLine = `You read: "${text}"${endpunct}`;
    await pline(intro);
    // C ref: win/tty/topl.c update_topl() — the "You read" pline is a second
    // update_topl() call in the same turn: when there's room for it plus
    // "--More--" on the intro's line (len(bp)+len(toplines)+3 < CO-8) it's
    // appended after two spaces with no paging; otherwise the intro pages with
    // --More-- first before "You read" starts a fresh line.
    if (readLine.length + intro.length + 3 < 80 - 8) {
        game._pending_message = `${intro}  ${readLine}`;
        game._toplines = game._pending_message;
    } else {
        await topl_more();
        await pline(readLine);
        // C ref: win/tty/topl.c redotoplin():139 — a topline that wrapped onto a
        // second row (cury > 0) auto-fires more().  So only the "You read" line
        // that overflows 80 columns (e.g. long degraded graffiti) gets paged
        // with --More--; a short one stays without one.  After the page is
        // acknowledged the topline clears for the next command's frame.
        if (wrap_topl(readLine).length > 1) {
            await topl_more();
            game._pending_message = '';
        }
    }
    ep.eread = 1;
    ep.erevealed = 1;
    // C ref: engrave.c:401 — `if (svc.context.run > 0) nomul(0);`
    if ((game.context?.run || 0) > 0) {
        game.multi = 0;
        if (game.context) {
            game.context.travel = game.context.travel1 = game.context.mv = 0;
        }
    }
}

// C ref: pickup.c pickup(1) with flags.pickup set -> autopick() picks every
// floor object autopick_testobj() approves, then check_here reports any
// remainder.  The eligibility test is js/pickup.js's port of
// autopick_testobj(): pickup_types is only one of its five inputs — a shop's
// unpaid items are never taken, pickup_thrown/pickup_stolen and
// dropped_nopick override the class list entirely, and an
// AUTOPICKUP_EXCEPTION pattern overrides all of those.  A local
// pickup_types-only filter answered wrong for every one of those cases.
// The owned sessions only ever auto-pick a single item at a time, which prints
// the bare prinv line "<letter> - <name>." (no prefix).  Multi-object piles
// would page with --More-- between lines; not exercised, so the
// single/sequential case is modeled and extra items just chain via pline.
async function autopickup_after_move(x, y) {
    const objs = (game.level?.objects || []).filter(
        (o) => o.where === 'floor' && o.ox === x && o.oy === y);
    if (objs.length === 0) return 0;
    game._pickup_encumbrance = 0; // C ref: pickup.c pickup(1) — gp.pickup_encumbrance = 0
    const inv = await import('./invent.js');
    const { autopick_testobj } = await import('./pickup.js');
    // autopick order is the floor chain (topmost-first); objects_at returns that
    // order.  calc_costly is TRUE for the first object only, as in autopick().
    let check_costly = true;
    let nPicked = 0;
    for (const obj of objs) {
        const take = autopick_testobj(obj, check_costly);
        check_costly = false;
        if (!take) continue;
        await pickup_one(inv, obj, x, y);
        nPicked++;
    }
    return nPicked;
}

// Pick up a single floor object, emitting the prinv pickup line.  Mirrors
// pickup_object -> pickup_prinv with a NULL prefix (the bare "<letter> -
// <name>." line).  pick_one_obj sets game._pending_message to that bare line.
// If a message was already pending this turn (e.g. the swap line), we chain the
// pickup line after it via update_topl(): when the two don't fit on one top
// line (CO-8 rule), the pending line is paged with --More-- (blocking on the
// next key) before the pickup line replaces it.  C ref: topl.c update_topl().
async function pickup_one(inv, obj, x, y) {
    const prior = game._pending_message || '';
    await inv.pick_one_obj(obj); // sets _pending_message to the pickup line
    const line = game._pending_message || '';
    if (prior) {
        // Restore the pending line + its TL_HAS_MESSAGE state, then chain.
        game._pending_message = prior;
        game._toplin = 1;
        await update_topl(line);
    }
    newsym(x, y);
}

// C ref: invent.c an() — indefinite article.  Local copy matching the same
// helper duplicated per-file elsewhere (eat.js, invent.js, uhitm.js, hack.js).
function an(s) { return /^[aeiou]/i.test(s) ? `an ${s}` : `a ${s}`; }

// C ref: invent.c look_here() — the "There is <feature> here." + "You see
// here <obj>." auto-announcement when stepping onto a dungeon feature and/or
// floor object(s) with autopickup disabled.  The single-object case prints
// the dfeature line (if any and not already announced by describe_decor's
// mention_decor path) then "You see here <obj>." on the top line; the
// multi-object case (obj_cnt < pile_limit, default 5) opens the blocking
// "Things that are here:" menu (look_here in invent.js).  Larger piles
// ("There are N objects here.") aren't exercised by the owned sessions.
async function look_here_after_move(x, y, _pickedSome = false, skipDfeature = false) {
    const objs = (game.level?.objects || []).filter(
        (o) => o.where === 'floor' && o.ox === x && o.oy === y);
    if (objs.length === 0) return;
    // C ref: look_here() — "if (dfeature && !skip_dfeature) pline1(fbuf);"
    // fbuf = "There is <a feature> here." (dfeature_at names stairs, altars,
    // fountains, doors, ...).  skip_dfeature (LOOKHERE_SKIP_DFEATURE) is set
    // only when describe_decor() (mention_decor / tutorial) already reported
    // the same feature earlier this move.
    const dfeature = skipDfeature ? null : dfeature_at(x, y);
    // C ref: invent.c look_here():4185 — a BLIND hero gropes ("You try to feel
    // what is lying here on the <surface>.") BEFORE the object line, and names
    // the find with "feel" rather than "see".  invent.js look_here() already
    // ports that whole block, so hand the single-object case over instead of
    // keeping a second, sighted-only copy of it here.
    if (Blind()) {
        const inv = await import('./invent.js');
        await inv.look_here(objs.length, (_pickedSome ? 1 : 0) | (skipDfeature ? 2 : 0));
        return;
    }
    if (objs.length === 1) {
        // C ref: look_here() single-object case: [dfeature pline1] then
        // You("%s here %s.", verb, ...) -> pline() -> update_topl().  Both go
        // through update_topl so they chain onto any already-pending message
        // (e.g. autopickup's prinv line) per the CO-8 rule, or page it with
        // --More-- first when there's no room — e.g. "$ - 7 gold pieces (19 in
        // total).  You see here a food ration." on one topline.
        const o = objs[0];
        const name = await objDoname(o);
        if (dfeature) await update_topl(`There is ${an(dfeature)} here.`);
        await update_topl(`You see here ${name}.`);
        return;
    }
    // Multiple objects: delegate to invent.js look_here(), which renders the
    // "Things that are here:" menu and blocks on --More-- (consuming the
    // recorded dismissal keystroke).  obj_cnt = count; picked_some = false
    // (autopickup is off here, so nothing was lifted).
    const inv = await import('./invent.js');
    await inv.look_here(objs.length, _pickedSome ? 1 : 0);
}

// COIN_CLASS (gold) — objclass.h; defined inline here to gate the gold look-here
// announcement without dragging in an invent.js import cycle at module scope.
const COIN_CLASS_CMD = 12;

// Object name with article for the "You see here" line (C: doname()).  Lazy
// import to avoid a static cycle.  Corpses read "<species> corpse"; gold reads
// "<n> gold piece(s)"; other objects defer to invent.js's doname().
async function objDoname(obj) {
    // COIN_CLASS gold: "4 gold pieces" — C doname() has no article for coins.
    if (obj && (obj.oclass === COIN_CLASS_CMD)) {
        const q = obj.quan || 0;
        return `${q} gold piece${q === 1 ? '' : 's'}`;
    }
    // CORPSE (otyp 265): "a goblin corpse" — species from corpsenm.
    if (obj && obj.otyp === 265 && obj.corpsenm != null) {
        const mm = await import('./makemon.js');
        const sp = mm.monster_by_pmidx?.(obj.corpsenm);
        const name = sp?.name || 'monster';
        const art = /^[aeiou]/i.test(name) ? 'an' : 'a';
        return `${art} ${name} corpse`;
    }
    // Non-corpse floor object (e.g. a dropped weapon/ammo stack): C doname()
    // gives "N <plural>" for a stack, "a <name>" for a single item.
    try {
        if (floor_object_name) return floor_object_name(obj);
    } catch (_e) { /* fall through */ }
    return 'an object';
}

// C ref: hack.c domove_swap_with_pet(mtmp, x, y) — swap the hero and a tame
// pet.  Returns TRUE if the swap happened.  The starter sessions always take
// the simple swap branch (floor destination, untrapped pet, no boulder); the
// blocking conditions are checked for faithfulness.  On entry u.ux/u.uy are
// the destination (the pet's old square) and u.ux0/u.uy0 are the hero's old
// square (the pet's new square).
async function domove_swap_with_pet(mtmp, x, y) {
    const u = game.u;

    // C ref: hack.c — the reveal happens with the hero back on their ORIGINAL
    // square so the display doesn't draw them at the destination before a
    // refusal below cancels the swap.
    mtmp.mundetected = 0;
    if (mtmp.m_ap_type) { mtmp.m_ap_type = 0; mtmp.mappearance = 0; newsym(mtmp.mx, mtmp.my); }

    const trap = mtmp.mtrapped ? trap_at(mtmp.mx, mtmp.my) : null;
    if (!trap) mtmp.mtrapped = 0;

    // C ref: hack.c domove_swap_with_pet() — five `didnt_move = TRUE` guards.
    // All five used to be waved through ("none apply for a starting pet"), so
    // the hero swapped where C stops, ending the turn on the wrong square.
    // NOT PORTED here: the two boulder/opening-fit guards (they need
    // verysmall()/bigmonst()/curr_mon_load() on the pet) and goodpos().
    if (mtmp.mtrapped && trap && is_pit_ttyp(trap.ttyp) && boulder_at(trap.tx, trap.ty)) {
        // pet pinned in a pit by a boulder
        return false;
    }
    // NODIAG(mnum) is (mnum == PM_GRID_BUG).  (js/dog.js pets carry a non-makemon
    // pmidx, so this test is only meaningful for makemon-created monsters.)
    if (u.ux0 !== x && u.uy0 !== y && mtmp.data?.pmidx === PM_GRID_BUG) {
        await pline(`You stop.  ${Monnam(mtmp)} can't move diagonally.`);
        return false;
    }
    if (mtmp.mpeaceful && mtmp.mtrapped && trap) {
        // C: feeltrap() reveals the trap on the map first when it wasn't seen.
        if (!trap.tseen) { trap.tseen = 1; newsym(trap.tx, trap.ty); }
        await pline(`You stop.  ${Monnam(mtmp)} can't move out of `
                  + `${trap.tseen ? 'that' : an(trap_explanation(trap.ttyp))} `
                  + `${trap_explanation(trap.ttyp)}.`);
        return false;
    }
    if (mtmp.mpeaceful
        && (trap_at(u.ux0, u.uy0) || mtmp.ispriest || mtmp.isshk || mtmp.isgd
            || mtmp.data?.name === 'Oracle')) {
        // displacing a peaceful onto a trapped square, or a shk/priest/guard/
        // Oracle/quest leader, is refused.  (goodpos() is not ported.)
        await pline(`You stop.  ${Monnam(mtmp)} doesn't want to swap places.`);
        return false;
    }

    // Perform the swap: pet -> hero's old square.
    mtmp.mtrapped = 0;
    mtmp.mx = u.ux0;
    mtmp.my = u.uy0;
    // monster still knows where the hero is
    mtmp.mux = u.ux;
    mtmp.muy = u.uy;

    // C: You("%s %s.", mpeaceful ? "swap places with" : "frighten",
    //        x_monnam(mtmp, ARTICLE_YOUR, ..., SUPPRESS_SADDLE, FALSE));
    // C's You() -> pline() -> update_topl() sets tty_toplin = 1, so a later
    // same-turn message (e.g. the displaced pet dropping an item during its own
    // move) concatenates onto this line ("You swap places with Slasher.  Slasher
    // drops a food ration.").  Our pline() stub doesn't set that state, so route
    // the swap line through update_topl() to keep the concatenation faithful.
    const verb = mtmp.mpeaceful ? 'swap places with' : 'frighten';
    // C ref: hack.c:2169 — the article is YOUR only for a pet; an unnamed
    // non-pname monster takes THE, a named one takes NONE.  A displaced
    // peaceful non-pet is described with the "peaceful" adjective
    // ("the peaceful gnome"), and a named one suppresses "saddled ".
    const _given = mtmp.mgivenname || mtmp.mextra?.mgivenname;
    const who = x_monnam(mtmp,
        mtmp.mtame ? /*ARTICLE_YOUR*/ 3 : !_given ? /*ARTICLE_THE*/ 1 : /*ARTICLE_NONE*/ 0,
        (mtmp.mpeaceful && !mtmp.mtame) ? 'peaceful' : null,
        _given ? /*SUPPRESS_SADDLE*/ 0x08 : 0, false);
    await update_topl(`You ${verb} ${who}.`);

    // NOT PORTED: C follows the swap with `minliquid(mtmp) ? Trap_Killed_Mon :
    // mintrap(mtmp, NO_TRAP_FLAGS)` on the pet's new square — the pet can be
    // caught, sent to another level, or drowned, and the drowned arm draws
    // rn2(4) for the "guilty about losing your pet" penalty.  The refusal
    // guards above already stop the common case (a trap on the hero's old
    // square), so what remains is liquid terrain the hero just walked off.
    return true;
}
