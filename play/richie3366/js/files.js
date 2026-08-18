// files.js — WIZKIT file handling (files.c).
// C ref: files.c fopen_wizkit_file / wizkit_addinv / proc_wizkit_line /
// read_wizkit. Callers: allmain.c newgame after u_init_skills_discoveries
// (D-1192). Rule #2: VFS only — no fs / getenv / HOME fopen.

import { game } from './gstate.js';
import { vfsReadFile } from './storage.js';
import { readobjnam, HANDS_OBJ, NOTHING_OBJ } from './readobjnam.js';
import { addinv } from './u_init.js';
import { add_to_migration, mergable } from './mkobj.js';
import { observe_object } from './invent.js';
import { inv_cnt } from './steal.js';
import { hands_obj } from './weapon.js';
import { COIN_CLASS, objectNames } from './objects.js';
import { PM_CLERIC } from './generated/monsters_data.js';
import {
    BUFSZ, MIGR_NOBREAK, MIGR_NOSCATTER, MIGR_WITH_HERO, WIZKIT_MAX,
} from './const.js';

const INVLET_BASIC = 52;
const SCR_SCARE_MONSTER = objectNames.indexOf('SCR_SCARE_MONSTER');

/** C flag.h `#define wizard flags.debug`. */
function wizard_mode() {
    return !!(game.flags?.debug || game.flags?.wizard);
}

/** C role.h Role_if — urole.mnum match. */
function Role_if(pm) {
    return (game.urole?.mnum | 0) === (pm | 0);
}

function is_hands_obj(obj) {
    return obj === hands_obj || obj === HANDS_OBJ
        || !!(obj && (obj._hands || obj._hands_obj));
}

/**
 * C ref: invent.c merge_choice(gi.invent, obj) — first mergable slot.
 * Shop-floor no_charge / inhishop unpaid reject named (wizkit objs are
 * OBJ_FREE, so that arm never fires).
 */
function merge_choice(obj) {
    if (!obj || (obj.otyp | 0) === SCR_SCARE_MONSTER) return null;
    for (const otmp of game.invent || []) {
        if (mergable(otmp, obj)) return otmp;
    }
    return null;
}

/**
 * C ref: files.c fopen_wizkit_file — gw.wizkit from WIZKIT= (cfgfiles).
 * Named omit: getenv("WIZKIT"), access(), HOME/fqname fopen, raw_printf
 * open errors. VFS miss ≡ C ENOENT → NULL.
 */
function fopen_wizkit_file() {
    const name = String(game.wizkit || game._parsed_rc?.wizkit || '')
        .slice(0, WIZKIT_MAX - 1);
    if (!name) return null;
    const text = vfsReadFile(name);
    return text == null ? null : String(text);
}

/**
 * C ref: cfgfiles.c parse_conf_buf subset used by parse_conf_file for
 * WIZKIT: skip empty/# lines; trailing '\' continuation joins with a
 * space; trim ends. Named omit: CHOOSE, [sections], line-too-long skip,
 * config_error_nextline.
 */
function parse_wizkit_text(text, proc) {
    let buf = '';
    for (const raw of String(text).split('\n')) {
        let line = raw.replace(/\r$/, '');
        const more = /\\$/.test(line);
        if (more) line = line.slice(0, -1);
        line = line.replace(/[ \t]+$/g, '');
        const trimmed = line.replace(/^[ \t]+/g, '');
        const ignore = !trimmed || trimmed.startsWith('#');
        if (!ignore) buf = buf ? `${buf} ${trimmed}` : trimmed;
        if (more || (ignore && !buf)) continue;
        if (buf) {
            proc(buf);
            buf = '';
        }
    }
    if (buf) proc(buf);
}

/**
 * C ref: files.c wizkit_addinv — observe + cleric bknown; overflow
 * (non-gold, inv_cnt>=52, !merge_choice) → migrating WITH_HERO|NOBREAK|
 * NOSCATTER at main-dungeon level 1; else addinv.
 */
async function wizkit_addinv(obj) {
    if (!obj || is_hands_obj(obj)) return;
    observe_object(obj);
    if (Role_if(PM_CLERIC)) obj.bknown = 1;
    if (obj.oclass !== COIN_CLASS
        && inv_cnt(false) >= INVLET_BASIC
        && !merge_choice(obj)) {
        add_to_migration(obj);
        obj.ox = 0;
        obj.oy = 1;
        obj.owornmask = MIGR_WITH_HERO | MIGR_NOBREAK | MIGR_NOSCATTER;
    } else {
        await addinv(obj);
    }
}

/**
 * C ref: files.c proc_wizkit_line — readobjnam; hands_obj skip; else
 * add. Named omit: wish_history_add; config_error_add "Bad wizkit item".
 */
export async function proc_wizkit_line(buf) {
    let line = String(buf ?? '');
    if (line.length >= BUFSZ) line = line.slice(0, BUFSZ - 1);
    const otmp = readobjnam(line, null);
    if (!otmp || otmp === NOTHING_OBJ || otmp._nothing_obj) return false;
    if (!is_hands_obj(otmp)) await wizkit_addinv(otmp);
    return true;
}

/**
 * C ref: files.c read_wizkit — wizard && fopen then
 * program_state.wizkit_wishing around parse_conf_file(proc_wizkit_line).
 * Named omit: config_error_init/done.
 */
export async function read_wizkit() {
    if (!wizard_mode()) return;
    const text = fopen_wizkit_file();
    if (text == null) return;
    if (!game.program_state) game.program_state = {};
    game.program_state.wizkit_wishing = 1;
    const lines = [];
    parse_wizkit_text(text, (line) => {
        lines.push(line);
    });
    for (const line of lines) await proc_wizkit_line(line);
    game.program_state.wizkit_wishing = 0;
}
