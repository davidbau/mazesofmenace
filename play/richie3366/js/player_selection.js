// player_selection.js — tty/genl character creation menus.
// C ref: role.c genl_player_setup / rigid_role_checks / ok_* / pick_* /
//        plsel_startmenu / setup_*menu / role_menu_extra;
//        wintty.c tty_player_selection → genl_player_setup(rows).

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { nhgetch } from './input.js';
import { paint_corner_nhw_menu, dismiss_chargen_nhw_menu } from './invent.js';
import { an } from './objnam.js';
import { s_suffix } from './do_name.js';
import { strsubst, strstri } from './hacklib.js';
import {
    roles, races, aligns, genders,
    str2role, str2race, str2gend, str2align,
    validrole, role_gendercount, race_alignmentcount,
} from './roles.js';
import { tty_askname } from './askname.js';
import {
    ROLE_NONE,
    ROLE_RANDOM,
    ROLE_RACEMASK,
    ROLE_GENDMASK,
    ROLE_ALIGNMASK,
    ROLE_GENDERS,
    ROLE_ALIGNS,
    RS_ROLE,
    RS_RACE,
    RS_GENDER,
    RS_ALGNMNT,
    RS_filter,
    RS_menu_arg,
    PICK_RANDOM,
    PICK_RIGID,
    BUFSZ,
    QBUFSZ,
} from './const.js';
import { ATR_INVERSE, NO_COLOR } from './terminal.js';

/** C: gr.rfilter — role/race/gend/align exclusion masks for chargen. */
const rfilter = { roles: [], mask: 0 };

function f() {
    return game.flags || (game.flags = {});
}

function init_role_flags_from_rc() {
    const flags = f();
    const rc = game._parsed_rc || {};
    // C: options already copied into flags.init* before player_selection.
    // C ref: options.c `:3605` keeps the str2* result verbatim, including
    // ROLE_RANDOM ("random"/"*"/"@") — prefix and filecode spellings that the
    // old exact-match findRole/findRace/findAlign rejected now resolve.
    flags.initrole = (typeof rc.role === 'string') ? str2role(rc.role) : ROLE_NONE;
    flags.initrace = (typeof rc.race === 'string') ? str2race(rc.race) : ROLE_NONE;
    flags.initgend = (typeof rc.gender === 'string') ? str2gend(rc.gender) : ROLE_NONE;
    flags.initalign = (typeof rc.align === 'string') ? str2align(rc.align) : ROLE_NONE;
}

/** C ref: role.c gotrolefilter */
function gotrolefilter() {
    if (rfilter.mask) return true;
    for (let i = 0; i < roles.length; i++) {
        if (rfilter.roles[i]) return true;
    }
    return false;
}

/** C ref: role.c clearrolefilter */
function clearrolefilter(which) {
    if (which === RS_filter || which === RS_ROLE) {
        if (which === RS_filter) rfilter.mask = 0;
        for (let i = 0; i < roles.length; i++) rfilter.roles[i] = false;
    }
    if (which === RS_RACE) rfilter.mask &= ~ROLE_RACEMASK;
    if (which === RS_GENDER) rfilter.mask &= ~ROLE_GENDMASK;
    if (which === RS_ALGNMNT) rfilter.mask &= ~ROLE_ALIGNMASK;
}

/**
 * C ref: role.c setrolefilter `:1284–1300` — str2* chain in C order, with
 * ROLE_RANDOM excluded from every arm (C uses module gr.rfilter; JS keeps its
 * pre-existing module-local rfilter for that state).
 */
function setrolefilter(bufp) {
    let i;
    if ((i = str2role(bufp)) !== ROLE_NONE && i !== ROLE_RANDOM) {
        rfilter.roles[i] = true;
        return true;
    } else if ((i = str2race(bufp)) !== ROLE_NONE && i !== ROLE_RANDOM) {
        rfilter.mask |= races[i].selfmask;
        return true;
    } else if ((i = str2gend(bufp)) !== ROLE_NONE && i !== ROLE_RANDOM) {
        rfilter.mask |= genders[i].allow;
        return true;
    } else if ((i = str2align(bufp)) !== ROLE_NONE && i !== ROLE_RANDOM) {
        rfilter.mask |= aligns[i].allow;
        return true;
    }
    return false;
}

/**
 * C ref: role.c reset_role_filtering — PICK_ANY unacceptable role/race/&c.
 * Letter toggles; Enter confirms (n>=0 clears then applies); ESC cancels.
 * Returns true when n>0 (at least one filter selected).
 */
async function reset_role_filtering() {
    const flags = f();
    const items = [];

    const pushHdr = (text) => { items.push({ kind: 'hdr', text }); };
    const pushBlank = () => { items.push({ kind: 'blank', text: '' }); };

    // C ref: role.c reset_role_filtering — each setup_*menu(win, FALSE, ...)
    // arm keeps every entry with a_string values, preselecting !*_ok.
    pushHdr('Unacceptable roles');
    for (const e of setup_rolemenu(false, ROLE_NONE, ROLE_NONE, ROLE_NONE)) {
        items.push({
            kind: 'item',
            key: e.key,
            filterStr: e.value,
            textBase: e.text,
            selected: e.preselected,
        });
    }
    pushBlank();
    pushHdr('Unacceptable races');
    for (const e of setup_racemenu(false, ROLE_NONE, ROLE_NONE, ROLE_NONE)) {
        items.push({
            kind: 'item',
            key: e.key,
            filterStr: e.value,
            textBase: e.text,
            selected: e.preselected,
        });
    }
    pushBlank();
    pushHdr('Unacceptable genders');
    for (const e of setup_gendmenu(false, ROLE_NONE, ROLE_NONE, ROLE_NONE)) {
        items.push({
            kind: 'item',
            key: e.key,
            filterStr: e.value,
            textBase: e.text,
            selected: e.preselected,
        });
    }
    pushBlank();
    pushHdr('Unacceptable alignments');
    for (const e of setup_algnmenu(false, ROLE_NONE, ROLE_NONE, ROLE_NONE)) {
        items.push({
            kind: 'item',
            key: e.key,
            filterStr: e.value,
            textBase: e.text,
            selected: e.preselected,
        });
    }

    const title = gotrolefilter()
        ? 'Pick all that apply and/or unpick any that no longer apply'
        : 'Pick all that apply';
    const rows = game.nhDisplay?.rows || 24;
    // C ref: wintty.c tty_end_menu — lmax = min(52, rows-1); prompt+blank
    // are part of nitems (end_menu prepends them), not re-added per page.
    const lmax = Math.min(52, rows - 1);
    const allEntries = () => [
        { text: title, attr: ATR_INVERSE },
        { text: '', attr: 0 },
        ...items.map(it => {
            if (it.kind !== 'item') return { text: it.text, attr: 0 };
            const mark = it.selected ? '+' : '-';
            return { text: `${it.key} ${mark} ${it.textBase}`, attr: 0 };
        }),
    ];
    let currPage = 0;

    for (;;) {
        const entries = allEntries();
        const nitems = entries.length;
        const pages = Math.max(1, Math.floor((nitems + lmax - 1) / lmax));
        if (currPage >= pages) currPage = pages - 1;
        const start = currPage * lmax;
        const page = entries.slice(start, start + lmax);
        const morestr = pages > 1
            ? `(${currPage + 1} of ${pages})`
            : '(end) ';
        await paint_corner_nhw_menu(page, morestr);
        const key = await nhgetch();
        game._menu_overlay = false;
        if (key === 27) return false; // cancel — leave filters unchanged
        if (key === 13 || key === 10) {
            // C: n>=0 → clear then apply current selections; n==0 clears only
            clearrolefilter(RS_filter);
            let n = 0;
            for (const it of items) {
                if (it.kind !== 'item' || !it.selected) continue;
                setrolefilter(it.filterStr);
                n++;
            }
            flags.initrole = flags.initrace = flags.initgend =
                flags.initalign = ROLE_NONE;
            return n > 0;
        }
        if (key === 32) {
            // Space: next page when multi-page, else confirm empty like Enter
            if (pages > 1) {
                currPage = (currPage + 1) % pages;
                continue;
            }
            clearrolefilter(RS_filter);
            flags.initrole = flags.initrace = flags.initgend =
                flags.initalign = ROLE_NONE;
            return false;
        }
        const ch = String.fromCharCode(key);
        const hit = items.find(it => it.kind === 'item' && it.key === ch);
        if (hit) hit.selected = !hit.selected;
    }
}

export function ok_role(rolenum, racenum, gendnum, alignnum) {
    if (rolenum >= 0 && rolenum < roles.length) {
        if (rfilter.roles[rolenum]) return false;
        const allow = roles[rolenum].allow || 0;
        if (racenum >= 0 && racenum < races.length
            && !(allow & races[racenum].allow & ROLE_RACEMASK))
            return false;
        if (gendnum >= 0 && gendnum < ROLE_GENDERS
            && !(allow & genders[gendnum].allow & ROLE_GENDMASK))
            return false;
        if (alignnum >= 0 && alignnum < ROLE_ALIGNS
            && !(allow & aligns[alignnum].allow & ROLE_ALIGNMASK))
            return false;
        return true;
    }
    for (let i = 0; i < roles.length; i++) {
        if (rfilter.roles[i]) continue;
        const allow = roles[i].allow || 0;
        if (racenum >= 0 && racenum < races.length
            && !(allow & races[racenum].allow & ROLE_RACEMASK))
            continue;
        if (gendnum >= 0 && gendnum < ROLE_GENDERS
            && !(allow & genders[gendnum].allow & ROLE_GENDMASK))
            continue;
        if (alignnum >= 0 && alignnum < ROLE_ALIGNS
            && !(allow & aligns[alignnum].allow & ROLE_ALIGNMASK))
            continue;
        return true;
    }
    return false;
}

export function ok_race(rolenum, racenum, gendnum, alignnum) {
    if (racenum >= 0 && racenum < races.length) {
        if (rfilter.mask & races[racenum].selfmask) return false;
        const allow = races[racenum].allow || 0;
        if (rolenum >= 0 && rolenum < roles.length
            && !(allow & roles[rolenum].allow & ROLE_RACEMASK))
            return false;
        if (gendnum >= 0 && gendnum < ROLE_GENDERS
            && !(allow & genders[gendnum].allow & ROLE_GENDMASK))
            return false;
        if (alignnum >= 0 && alignnum < ROLE_ALIGNS
            && !(allow & aligns[alignnum].allow & ROLE_ALIGNMASK))
            return false;
        return true;
    }
    for (let i = 0; i < races.length; i++) {
        if (rfilter.mask & races[i].selfmask) continue;
        const allow = races[i].allow || 0;
        if (rolenum >= 0 && rolenum < roles.length
            && !(allow & roles[rolenum].allow & ROLE_RACEMASK))
            continue;
        if (gendnum >= 0 && gendnum < ROLE_GENDERS
            && !(allow & genders[gendnum].allow & ROLE_GENDMASK))
            continue;
        if (alignnum >= 0 && alignnum < ROLE_ALIGNS
            && !(allow & aligns[alignnum].allow & ROLE_ALIGNMASK))
            continue;
        return true;
    }
    return false;
}

export function ok_gend(rolenum, racenum, gendnum, _alignnum) {
    if (gendnum >= 0 && gendnum < ROLE_GENDERS) {
        if (rfilter.mask & genders[gendnum].allow) return false;
        const allow = genders[gendnum].allow;
        if (rolenum >= 0 && rolenum < roles.length
            && !(allow & roles[rolenum].allow & ROLE_GENDMASK))
            return false;
        if (racenum >= 0 && racenum < races.length
            && !(allow & races[racenum].allow & ROLE_GENDMASK))
            return false;
        return true;
    }
    for (let i = 0; i < ROLE_GENDERS; i++) {
        if (rfilter.mask & genders[i].allow) continue;
        const allow = genders[i].allow;
        if (rolenum >= 0 && rolenum < roles.length
            && !(allow & roles[rolenum].allow & ROLE_GENDMASK))
            continue;
        if (racenum >= 0 && racenum < races.length
            && !(allow & races[racenum].allow & ROLE_GENDMASK))
            continue;
        return true;
    }
    return false;
}

export function ok_align(rolenum, racenum, _gendnum, alignnum) {
    if (alignnum >= 0 && alignnum < ROLE_ALIGNS) {
        if (rfilter.mask & aligns[alignnum].allow) return false;
        const allow = aligns[alignnum].allow;
        if (rolenum >= 0 && rolenum < roles.length
            && !(allow & roles[rolenum].allow & ROLE_ALIGNMASK))
            return false;
        if (racenum >= 0 && racenum < races.length
            && !(allow & races[racenum].allow & ROLE_ALIGNMASK))
            return false;
        return true;
    }
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        if (rfilter.mask & aligns[i].allow) continue;
        const allow = aligns[i].allow;
        if (rolenum >= 0 && rolenum < roles.length
            && !(allow & roles[rolenum].allow & ROLE_ALIGNMASK))
            continue;
        if (racenum >= 0 && racenum < races.length
            && !(allow & races[racenum].allow & ROLE_ALIGNMASK))
            continue;
        return true;
    }
    return false;
}

export function validrace(rolenum, racenum) {
    return racenum >= 0 && racenum < races.length
        && !!(roles[rolenum].allow & races[racenum].allow & ROLE_RACEMASK);
}

export function validgend(rolenum, racenum, gendnum) {
    return gendnum >= 0 && gendnum < ROLE_GENDERS
        && !!(roles[rolenum].allow & races[racenum].allow
            & genders[gendnum].allow & ROLE_GENDMASK);
}

export function validalign(rolenum, racenum, alignnum) {
    return alignnum >= 0 && alignnum < ROLE_ALIGNS
        && !!(roles[rolenum].allow & races[racenum].allow
            & aligns[alignnum].allow & ROLE_ALIGNMASK);
}

/**
 * C ref: role.c setup_rolemenu `:2854–2902` — role-menu entry builder shared
 * by the filtering arm (pick_role_menu: skip `!role_ok`, `a_int` value) and
 * the reset arm (reset_role_filtering: keep every role, `a_string` value,
 * preselect `!role_ok`). Branch order, `lowc`/`highc` accelerators and the
 * female-name arms (`gend == 1` replace, `gend < 0` slash-append) are C's.
 * `lastch` keeps C's case-sensitive update (no lowercasing): identical menus
 * on the current roles[] (single consecutive r-pair) and C-true past it.
 * JS shape: neutral entries; callers map to body/choices or filter items
 * (`win`/`add_menu` stay with the callers — corner-menu infra has no winid).
 */
export function setup_rolemenu(filtering, race, gend, algn) {
    const entries = [];
    let lastch = '\0'; // C: char lastch = '\0'
    for (let i = 0; i < roles.length; i++) { // C: roles[i].name.m
        /* role can be constrained by any of race, gender, or alignment */
        const role_ok = (ok_role(i, race, gend, algn)
            && ok_race(i, race, gend, algn)
            && ok_gend(i, race, gend, algn)
            && ok_align(i, race, gend, algn));
        if (filtering && !role_ok)
            continue;
        let thisch = roles[i].name.m[0].toLowerCase(); // C: lowc()
        if (thisch === lastch)
            thisch = thisch.toUpperCase(); // C: highc()
        let rolename = roles[i].name.m;
        if (roles[i].name.f) {
            /* role has distinct name for female (C,P) */
            if (gend === 1) {
                /* female already chosen; replace male name */
                rolename = roles[i].name.f;
            } else if (gend < 0) {
                /* not chosen yet; append slash+female name */
                rolename = `${roles[i].name.m}/${roles[i].name.f}`;
            }
        }
        /* !filtering implies reset_role_filtering() where we want to
           mark this role as preselected if current filter excludes it */
        entries.push({
            key: thisch,
            altkey: null, // C passes 0 as the role menu's 2nd accelerator
            text: an(rolename), // C: an(rolenamebuf)
            value: filtering ? i + 1 : roles[i].name.m, // C: a_int/a_string
            preselected: !filtering && !role_ok, // C: MENU_ITEMFLAGS_SELECTED
        });
        lastch = thisch;
    }
    return entries;
}

/**
 * C ref: role.c setup_racemenu `:2905–2940` — race-menu entry builder for
 * both arms. No ok_gend(): race isn't constrained by gender. Filtering arm
 * picks by first letter with the capital as unseen accelerator; reset arm
 * picks by capital letter (lowercase role letters will be present there).
 */
export function setup_racemenu(filtering, role, gend, algn) {
    const entries = [];
    for (let i = 0; i < races.length; i++) { // C: races[i].noun
        /* no ok_gend(); race isn't constrained by gender */
        const race_ok = (ok_race(role, i, gend, algn)
            && ok_role(role, i, gend, algn)
            && ok_align(role, i, gend, algn));
        if (filtering && !race_ok)
            continue;
        const this_ch = races[i].noun[0];
        entries.push({
            key: filtering ? this_ch : this_ch.toUpperCase(), // C: highc()
            altkey: filtering ? this_ch.toUpperCase() : null, // C: ... : 0
            text: races[i].noun,
            value: filtering ? i + 1 : races[i].noun, // C: a_int/a_string
            preselected: !filtering && !race_ok, // C: MENU_ITEMFLAGS_SELECTED
        });
    }
    return entries;
}

/**
 * C ref: role.c setup_gendmenu `:2943–2976` — gender-menu entry builder for
 * both arms. No ok_align(): gender isn't constrained by alignment. Selector
 * letters and preselection follow setup_racemenu / setup_rolemenu.
 */
export function setup_gendmenu(filtering, role, race, algn) {
    const entries = [];
    for (let i = 0; i < ROLE_GENDERS; i++) {
        /* no ok_align(); gender isn't constrained by alignment */
        const gend_ok = (ok_gend(role, race, i, algn)
            && ok_role(role, race, i, algn)
            && ok_race(role, race, i, algn));
        if (filtering && !gend_ok)
            continue;
        const this_ch = genders[i].adj[0];
        entries.push({
            key: filtering ? this_ch : this_ch.toUpperCase(),
            altkey: filtering ? this_ch.toUpperCase() : null,
            text: genders[i].adj,
            value: filtering ? i + 1 : genders[i].adj,
            preselected: !filtering && !gend_ok,
        });
    }
    return entries;
}

/**
 * C ref: role.c setup_algnmenu `:2979–3012` — alignment-menu entry builder
 * for both arms. No ok_gend(): alignment isn't constrained by gender.
 * Selector letters and preselection follow setup_racemenu / setup_rolemenu.
 */
export function setup_algnmenu(filtering, role, race, gend) {
    const entries = [];
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        /* no ok_gend(); alignment isn't constrained by gender */
        const algn_ok = (ok_align(role, race, gend, i)
            && ok_role(role, race, gend, i)
            && ok_race(role, race, gend, i));
        if (filtering && !algn_ok)
            continue;
        const this_ch = aligns[i].adj[0];
        entries.push({
            key: filtering ? this_ch : this_ch.toUpperCase(),
            altkey: filtering ? this_ch.toUpperCase() : null,
            text: aligns[i].adj,
            value: filtering ? i + 1 : aligns[i].adj,
            preselected: !filtering && !algn_ok,
        });
    }
    return entries;
}

export function pick_role(racenum, gendnum, alignnum, pickhow) {
    const set = [];
    for (let i = 0; i < roles.length; i++) {
        if (ok_role(i, racenum, gendnum, alignnum)
            && ok_race(i, racenum >= 0 ? racenum : ROLE_RANDOM, gendnum, alignnum)
            && ok_gend(i, racenum, gendnum >= 0 ? gendnum : ROLE_RANDOM, alignnum)
            && ok_align(i, racenum, gendnum, alignnum >= 0 ? alignnum : ROLE_RANDOM))
            set.push(i);
    }
    if (set.length === 0 || (set.length > 1 && pickhow === PICK_RIGID))
        return ROLE_NONE;
    return set[rn2(set.length)];
}

export function pick_race(rolenum, gendnum, alignnum, pickhow) {
    let n = 0;
    for (let i = 0; i < races.length; i++) {
        if (ok_race(rolenum, i, gendnum, alignnum)) n++;
    }
    if (n === 0 || (n > 1 && pickhow === PICK_RIGID)) return ROLE_NONE;
    n = rn2(n);
    for (let i = 0; i < races.length; i++) {
        if (ok_race(rolenum, i, gendnum, alignnum)) {
            if (n === 0) return i;
            n--;
        }
    }
    return ROLE_NONE;
}

export function pick_gend(rolenum, racenum, alignnum, pickhow) {
    let n = 0;
    for (let i = 0; i < ROLE_GENDERS; i++) {
        if (ok_gend(rolenum, racenum, i, alignnum)) n++;
    }
    if (n === 0 || (n > 1 && pickhow === PICK_RIGID)) return ROLE_NONE;
    n = rn2(n);
    for (let i = 0; i < ROLE_GENDERS; i++) {
        if (ok_gend(rolenum, racenum, i, alignnum)) {
            if (n === 0) return i;
            n--;
        }
    }
    return ROLE_NONE;
}

export function pick_align(rolenum, racenum, gendnum, pickhow) {
    let n = 0;
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        if (ok_align(rolenum, racenum, gendnum, i)) n++;
    }
    if (n === 0 || (n > 1 && pickhow === PICK_RIGID)) return ROLE_NONE;
    // C: even n==1 still rolls rn2(1)=0
    n = rn2(n);
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        if (ok_align(rolenum, racenum, gendnum, i)) {
            if (n === 0) return i;
            n--;
        }
    }
    return ROLE_NONE;
}

export function rigid_role_checks() {
    const flags = f();
    let tmp;
    if (flags.initrole === ROLE_RANDOM) {
        flags.initrole = pick_role(flags.initrace, flags.initgend,
            flags.initalign, PICK_RANDOM);
        if (flags.initrole < 0) flags.initrole = rn2(roles.length);
    }
    if (flags.initrace === ROLE_RANDOM
        && (tmp = pick_race(flags.initrole, flags.initgend,
            flags.initalign, PICK_RANDOM)) !== ROLE_NONE)
        flags.initrace = tmp;
    if (flags.initalign === ROLE_RANDOM
        && (tmp = pick_align(flags.initrole, flags.initrace,
            flags.initgend, PICK_RANDOM)) !== ROLE_NONE)
        flags.initalign = tmp;
    if (flags.initgend === ROLE_RANDOM
        && (tmp = pick_gend(flags.initrole, flags.initrace,
            flags.initalign, PICK_RANDOM)) !== ROLE_NONE)
        flags.initgend = tmp;

    if (flags.initrole !== ROLE_NONE) {
        if (flags.initrace === ROLE_NONE)
            flags.initrace = pick_race(flags.initrole, flags.initgend,
                flags.initalign, PICK_RIGID);
        if (flags.initalign === ROLE_NONE)
            flags.initalign = pick_align(flags.initrole, flags.initrace,
                flags.initgend, PICK_RIGID);
        if (flags.initgend === ROLE_NONE)
            flags.initgend = pick_gend(flags.initrole, flags.initrace,
                flags.initalign, PICK_RIGID);
    }
}

// C ref: role.c `:1066–1070` — NUM_BP/BP_* are role.c-local (#undef'd right
// after build_plselection_prompt); kept module-local here for the same builders.
const BP_ALIGN = 0;
const BP_GEND = 1;
const BP_RACE = 2;
const BP_ROLE = 3;
const NUM_BP = 4;

/** gr.role_pa[]/gr.role_post_attribs backing store (C: decl.h `gr`). */
function grstate() {
    game.gr = game.gr || {};
    if (!Array.isArray(game.gr.role_pa)) game.gr.role_pa = [0, 0, 0, 0];
    game.gr.role_post_attribs = game.gr.role_post_attribs | 0;
    return game.gr;
}

/**
 * C ref: role.c promptsep `:1383–1396` (staticfn) — ", "/" and " joining
 * between post attributes while counting gr.role_post_attribs down.
 * JS adaptation: strings are immutable, so the buffer is returned.
 */
function promptsep(buf, num_post_attribs) {
    const gr = grstate();
    const conjuct = 'and ';
    let out = buf;
    if (num_post_attribs > 1 && gr.role_post_attribs < num_post_attribs
        && gr.role_post_attribs > 1)
        out += ',';
    out += ' ';
    --gr.role_post_attribs;
    if (!gr.role_post_attribs && num_post_attribs > 1)
        out += conjuct;
    return out;
}

/**
 * C ref: role.c root_plselection_prompt `:1430–1580` — the "<align> <gender>
 * <race> <role>" fragment of the Shall-I-pick prompt, recording which facets
 * still need choosing in gr.role_pa[]/gr.role_post_attribs for build_ below.
 * Branch order (align, gender, race, role, fallback "character") and the
 * alignnum reassignment on the failed-ok_align path are preserved.
 * JS adaptations: returns the fragment string (C appends into suppliedbuf);
 * the buflen/err_ret (" character's") overflow edge is kept via buflen.
 */
export function root_plselection_prompt(rolenum, racenum, gendnum, alignnum, buflen = BUFSZ) {
    const gr = grstate();
    let gendercount = 0, aligncount = 0;
    const err_ret = " character's";
    let donefirst = false;
    let buf = '';

    // initialize these static variables each time this is called
    gr.role_post_attribs = 0;
    for (let k = 0; k < NUM_BP; ++k) gr.role_pa[k] = 0;

    // How many alignments are allowed for the desired race?
    if (racenum !== ROLE_NONE && racenum !== ROLE_RANDOM)
        aligncount = race_alignmentcount(racenum);

    if (alignnum !== ROLE_NONE && alignnum !== ROLE_RANDOM
        && ok_align(rolenum, racenum, gendnum, alignnum)) {
        if (donefirst) buf += ' ';
        buf += aligns[alignnum].adj;
        donefirst = true;
    } else {
        // in case we got here by failing the ok_align() test
        if (alignnum !== ROLE_RANDOM) alignnum = ROLE_NONE;
        // if alignment not specified, but race is specified
        // and only one choice of alignment for that race then
        // don't include it in the later list
        if ((((racenum !== ROLE_NONE && racenum !== ROLE_RANDOM)
              && ok_race(rolenum, racenum, gendnum, alignnum))
             && (aligncount > 1))
            || (racenum === ROLE_NONE || racenum === ROLE_RANDOM)) {
            gr.role_pa[BP_ALIGN] = 1;
            gr.role_post_attribs++;
        }
    }
    // <your lawful>

    // How many genders are allowed for the desired role?
    if (validrole(rolenum)) gendercount = role_gendercount(rolenum);

    if (gendnum !== ROLE_NONE && gendnum !== ROLE_RANDOM) {
        if (validrole(rolenum)) {
            // if role specified, and multiple choice of genders for it,
            // and name of role itself does not distinguish gender
            if ((rolenum !== ROLE_NONE) && (gendercount > 1)
                && !roles[rolenum].name.f) {
                if (donefirst) buf += ' ';
                buf += genders[gendnum].adj;
                donefirst = true;
            }
        } else {
            if (donefirst) buf += ' ';
            buf += genders[gendnum].adj;
            donefirst = true;
        }
    } else {
        // if gender not specified, but role is specified
        // and only one choice of gender then
        // don't include it in the later list
        if ((validrole(rolenum) && (gendercount > 1)) || !validrole(rolenum)) {
            gr.role_pa[BP_GEND] = 1;
            gr.role_post_attribs++;
        }
    }
    // <your lawful female>

    if (racenum !== ROLE_NONE && racenum !== ROLE_RANDOM) {
        if (validrole(rolenum)
            && ok_race(rolenum, racenum, gendnum, alignnum)) {
            if (donefirst) buf += ' ';
            buf += (rolenum === ROLE_NONE) ? races[racenum].noun : races[racenum].adj;
            donefirst = true;
        } else if (!validrole(rolenum)) {
            if (donefirst) buf += ' ';
            buf += races[racenum].noun;
            donefirst = true;
        } else {
            gr.role_pa[BP_RACE] = 1;
            gr.role_post_attribs++;
        }
    } else {
        gr.role_pa[BP_RACE] = 1;
        gr.role_post_attribs++;
    }
    // <your lawful female gnomish> || <your lawful female gnome>

    if (validrole(rolenum)) {
        if (donefirst) buf += ' ';
        if (gendnum !== ROLE_NONE) {
            if (gendnum === 1 && roles[rolenum].name.f) buf += roles[rolenum].name.f;
            else buf += roles[rolenum].name.m;
        } else {
            if (roles[rolenum].name.f) buf += roles[rolenum].name.m + '/' + roles[rolenum].name.f;
            else buf += roles[rolenum].name.m;
        }
        donefirst = true;
    } else if (rolenum === ROLE_NONE) {
        gr.role_pa[BP_ROLE] = 1;
        gr.role_post_attribs++;
    }

    if ((racenum === ROLE_NONE || racenum === ROLE_RANDOM) && !validrole(rolenum)) {
        if (donefirst) buf += ' ';
        buf += 'character';
    }
    // <your lawful female gnomish cavewoman> || <your lawful female gnome>
    //    || <your lawful female character>
    if (buflen > buf.length + 1) return buf;
    return err_ret;
}

/**
 * C ref: role.c build_plselection_prompt `:1583–1656` — full "Shall I pick
 * … for you? [ynaq]" text around root_plselection_prompt(), with the
 * "pick a character"→"pick character" strsubst, the s_suffix possessive, the
 * trailing "priest/priestess'"→"priest/priestess's" fix, and the
 * race/role/gender/alignment post-attribute list. buflen < QBUFSZ yields the
 * static default prompt, as in C.
 */
export function build_plselection_prompt(rolenum, racenum, gendnum, alignnum, buflen = QBUFSZ) {
    const defprompt = 'Shall I pick a character for you? [ynaq] ';
    if (buflen < QBUFSZ) return defprompt;

    let tmpbuf = 'Shall I pick ';
    if (racenum !== ROLE_NONE || validrole(rolenum)) tmpbuf += 'your ';
    else tmpbuf += 'a ';
    // <your>

    tmpbuf += root_plselection_prompt(rolenum, racenum, gendnum, alignnum);
    // "Shall I pick a character's role, race, gender, and alignment for you?"
    // plus " [ynaq] (y)" is a little too long for a conventional 80 columns;
    // also, "pick a character's <anything>" sounds a bit stilted
    tmpbuf = strsubst(tmpbuf, 'pick a character', 'pick character');
    let buf = s_suffix(tmpbuf);
    // don't bother splitting caveman/cavewoman or priest/priestess
    // in order to apply possessive suffix to both halves, but do
    // change "priest/priestess'" to "priest/priestess's"
    const tail = strstri(buf, "priest/priestess'");
    if (tail !== null && tail === "priest/priestess'") buf += 's';

    // buf should now be:
    //    <your lawful female gnomish cavewoman's>
    // || <your lawful female gnome's>
    // || <your lawful female character's>
    // Now append the post attributes to it
    const flags = f();
    const gr = grstate();
    let num_post_attribs = gr.role_post_attribs;
    if (!num_post_attribs) {
        // some constraints might have been mutually exclusive, in which case
        // some prompting that would have been omitted is needed after all
        if (flags.initrole === ROLE_NONE && !gr.role_pa[BP_ROLE])
            gr.role_pa[BP_ROLE] = ++gr.role_post_attribs;
        if (flags.initrace === ROLE_NONE && !gr.role_pa[BP_RACE])
            gr.role_pa[BP_RACE] = ++gr.role_post_attribs;
        if (flags.initalign === ROLE_NONE && !gr.role_pa[BP_ALIGN])
            gr.role_pa[BP_ALIGN] = ++gr.role_post_attribs;
        if (flags.initgend === ROLE_NONE && !gr.role_pa[BP_GEND])
            gr.role_pa[BP_GEND] = ++gr.role_post_attribs;
        num_post_attribs = gr.role_post_attribs;
    }
    if (num_post_attribs) {
        if (gr.role_pa[BP_RACE]) {
            buf = promptsep(buf, num_post_attribs);
            buf += 'race';
        }
        if (gr.role_pa[BP_ROLE]) {
            buf = promptsep(buf, num_post_attribs);
            buf += 'role';
        }
        if (gr.role_pa[BP_GEND]) {
            buf = promptsep(buf, num_post_attribs);
            buf += 'gender';
        }
        if (gr.role_pa[BP_ALIGN]) {
            buf = promptsep(buf, num_post_attribs);
            buf += 'alignment';
        }
    }
    buf += ' for you? [ynaq] ';
    return buf;
}

function role_display_name(roleIdx, gend) {
    const r = roles[roleIdx];
    if (!r) return '<role>';
    if (gend === 1 && r.name.f) return r.name.f;
    if (gend < 0 && r.name.f && r.name.f !== r.name.m)
        return `${r.name.m}/${r.name.f}`;
    return r.name.m;
}

function aspect_header() {
    const flags = f();
    const ROLE = flags.initrole;
    const RACE = flags.initrace;
    const GEND = flags.initgend;
    const ALGN = flags.initalign;
    const rolename = ROLE < 0 ? '<role>' : role_display_name(ROLE, GEND);
    if (!game.plname || ROLE < 0 || RACE < 0 || GEND < 0 || ALGN < 0) {
        return [
            rolename,
            RACE < 0 ? '<race>' : races[RACE].noun,
            GEND < 0 ? '<gender>' : genders[GEND].adj,
            ALGN < 0 ? '<alignment>' : aligns[ALGN].adj,
        ].join(' ');
    }
    return `${game.plname} the ${aligns[ALGN].adj} ${genders[GEND].adj} ${races[RACE].adj} ${rolename}`;
}

/** C: role_menu_extra constrained line or pick-X / random / quit. */
function menu_extra_lines(which, preselectRandom = false) {
    const flags = f();
    const lines = [];
    const r = flags.initrole;
    const c = flags.initrace;

    if (which === ROLE_RANDOM) {
        lines.push({
            text: preselectRandom ? '* * Random' : '* - Random',
            attr: 0,
            key: '*',
            value: ROLE_RANDOM,
        });
        return lines;
    }
    if (which === ROLE_NONE) {
        lines.push({ text: 'q - Quit', attr: 0, key: 'q', value: ROLE_NONE });
        return lines;
    }
    if (which === RS_filter) {
        const verb = gotrolefilter() ? 'Reset' : 'Set';
        lines.push({
            text: `~ - ${verb} role/race/&c filtering`,
            attr: 0,
            key: '~',
            value: RS_menu_arg(RS_filter),
        });
        return lines;
    }

    let constrainer = null;
    let forcedvalue = null;
    let what = null;
    let letter = null;
    if (which === RS_ROLE) {
        what = 'role';
        letter = '?';
    } else if (which === RS_RACE) {
        what = 'race';
        letter = '/';
        if (r >= 0) {
            const allowmask = roles[r].allow & ROLE_RACEMASK;
            if (allowmask === races[0].selfmask) {
                constrainer = 'role';
                forcedvalue = races[0].noun;
            }
        }
    } else if (which === RS_GENDER) {
        what = 'gender';
        letter = '"';
        if (r >= 0) {
            const allowmask = roles[r].allow & ROLE_GENDMASK;
            if (allowmask === genders[0].allow) {
                constrainer = 'role';
                forcedvalue = genders[0].adj;
            } else if (allowmask === genders[1].allow) {
                constrainer = 'role';
                forcedvalue = genders[1].adj;
            }
        }
    } else if (which === RS_ALGNMNT) {
        what = 'alignment';
        letter = '[';
        if (r >= 0) {
            const allowmask = roles[r].allow & ROLE_ALIGNMASK;
            if (allowmask === aligns[0].allow) {
                constrainer = 'role';
                forcedvalue = aligns[0].adj;
            } else if (allowmask === aligns[1].allow) {
                constrainer = 'role';
                forcedvalue = aligns[1].adj;
            } else if (allowmask === aligns[2].allow) {
                constrainer = 'role';
                forcedvalue = aligns[2].adj;
            }
        }
        if (c >= 0 && !constrainer) {
            const allowmask = races[c].allow & ROLE_ALIGNMASK;
            if (allowmask === aligns[0].allow) {
                constrainer = 'race';
                forcedvalue = aligns[0].adj;
            } else if (allowmask === aligns[1].allow) {
                constrainer = 'race';
                forcedvalue = aligns[1].adj;
            } else if (allowmask === aligns[2].allow) {
                constrainer = 'race';
                forcedvalue = aligns[2].adj;
            }
        }
    }

    if (constrainer) {
        lines.push({
            text: `    ${constrainer} forces ${forcedvalue}`,
            attr: 0,
            key: null,
            value: 0,
        });
    } else if (what) {
        const fset = which === RS_ROLE ? flags.initrole
            : which === RS_RACE ? flags.initrace
                : which === RS_GENDER ? flags.initgend
                    : flags.initalign;
        const label = `Pick${fset >= 0 ? ' another' : ''} ${what} first`;
        lines.push({
            text: `${letter} - ${label}`,
            attr: 0,
            key: letter,
            value: RS_menu_arg(which),
        });
    }
    return lines;
}

async function menu_pick(title, bodyLines, choices) {
    const entries = [
        { text: title, attr: ATR_INVERSE },
        { text: '', attr: 0 },
        ...bodyLines,
    ];
    for (;;) {
        await paint_corner_nhw_menu(entries, '(end) ');
        const key = await nhgetch();
        game._menu_overlay = false;
        const ch = String.fromCharCode(key);
        if (key === 27) return ROLE_NONE;
        // C: space/return with no explicit pick → n==0; for role menus
        // without a preselected item that means ROLE_RANDOM.
        if (ch === ' ' || key === 13 || key === 10) {
            const pre = choices.find(c => c.preselected);
            return pre ? pre.value : ROLE_RANDOM;
        }
        const hit = choices.find(c => c.key === ch || c.key === ch.toLowerCase()
            || (c.altkey && (c.altkey === ch || c.altkey === ch.toLowerCase())));
        if (hit) return hit.value;
        // invalid → re-prompt (C select_menu stays open)
    }
}

/**
 * C ref: role.c maybe_skip_seps — count role-menu lines vs tty rows;
 * excess 1–2 means squeeze blank separator(s) so the menu fits on one page.
 * Counts only roles compatible with current RACE/GEND/ALGN (not roles.length).
 */
function maybe_skip_seps(rows, aspect) {
    if (aspect !== RS_ROLE) return 0;
    const flags = f();
    const RACE = flags.initrace;
    const GEND = flags.initgend;
    const ALGN = flags.initalign;
    let n = 4; // title+sep, aspect header+sep
    for (let i = 0; i < roles.length; i++) {
        if (ok_role(i, RACE, GEND, ALGN) && ok_race(i, RACE, GEND, ALGN)
            && ok_gend(i, RACE, GEND, ALGN) && ok_align(i, RACE, GEND, ALGN)) {
            n++;
        }
    }
    n += 2; // random + separator
    n += 5; // race/gender/align first, filter, quit
    n += 1; // footer/prompt
    if (rows > 0 && n > rows) return n - rows;
    return 0;
}

async function pick_role_menu() {
    const flags = f();
    // C ref: role.c plsel_startmenu — always opens a menu → rigid here
    rigid_role_checks();
    const RACE = flags.initrace;
    const GEND = flags.initgend;
    const ALGN = flags.initalign;
    const rows = game.nhDisplay?.rows || 24;
    const excess = maybe_skip_seps(rows, RS_ROLE);
    // C plsel_startmenu: omit blank after aspect header when excess == 2
    const body = [{ text: aspect_header(), attr: 0 }];
    if (excess !== 2) body.push({ text: '', attr: 0 });
    // C ref: role.c genl_player_setup — setup_rolemenu(win, TRUE, RACE, GEND,
    // ALGN) populates the role choices (a_int values; C: choice-1 later).
    const choices = [];
    for (const e of setup_rolemenu(true, RACE, GEND, ALGN)) {
        body.push({ text: `${e.key} - ${e.text}`, attr: 0 });
        choices.push({ key: e.key, value: e.value });
    }
    for (const line of menu_extra_lines(ROLE_RANDOM, true)) {
        body.push(line);
        if (line.key) choices.push({ key: line.key, value: line.value, preselected: true });
    }
    // C: if (excess < 1 || excess > 2) add_menu_str("") between Random and extras
    if (excess < 1 || excess > 2)
        body.push({ text: '', attr: 0 });
    for (const which of [RS_RACE, RS_GENDER, RS_ALGNMNT, RS_filter, ROLE_NONE]) {
        for (const line of menu_extra_lines(which)) {
            body.push(line);
            if (line.key) choices.push({ key: line.key, value: line.value });
        }
    }
    const choice = await menu_pick('Pick a role or profession', body, choices);
    if (choice === ROLE_NONE) return { quit: true };
    if (choice === RS_menu_arg(RS_ALGNMNT)) {
        flags.initalign = ROLE_NONE;
        return { next: RS_ALGNMNT };
    }
    if (choice === RS_menu_arg(RS_GENDER)) {
        flags.initgend = ROLE_NONE;
        return { next: RS_GENDER };
    }
    if (choice === RS_menu_arg(RS_RACE)) {
        flags.initrace = ROLE_NONE;
        return { next: RS_RACE };
    }
    if (choice === RS_menu_arg(RS_filter)) {
        // C: ROLE = NONE; reset_role_filtering(); nextpick = RS_ROLE
        flags.initrole = ROLE_NONE;
        await reset_role_filtering();
        return { next: RS_ROLE };
    }
    let k;
    if (choice === ROLE_RANDOM) {
        k = pick_role(RACE, GEND, ALGN, PICK_RANDOM);
        if (k < 0) k = rn2(roles.length);
    } else {
        k = choice - 1;
    }
    flags.initrole = k;
    return { next: RS_RACE };
}

async function pick_race_menu() {
    const flags = f();
    // C: count ok_race first; n<=1 auto-assigns without plsel_startmenu /
    // rigid_role_checks (no pick_* RNG). n>1 → plsel_startmenu → rigid.
    const ROLE = flags.initrole;
    let GEND = flags.initgend;
    let ALGN = flags.initalign;
    let n = 0;
    let k = 0;
    for (let i = 0; i < races.length; i++) {
        if (ok_race(ROLE, i, GEND, ALGN)) {
            n++;
            k = i;
        }
    }
    if (n === 0) {
        for (let i = 0; i < races.length; i++) {
            if (validrace(ROLE, i)) {
                n++;
                k = i;
            }
        }
    }
    if (n <= 1) {
        flags.initrace = k;
        return { next: RS_GENDER };
    }
    // C ref: role.c plsel_startmenu — rigid before building the menu
    rigid_role_checks();
    GEND = flags.initgend;
    ALGN = flags.initalign;
    const choices = [];
    const body = [{ text: aspect_header(), attr: 0 }, { text: '', attr: 0 }];
    // C ref: role.c genl_player_setup — setup_racemenu(win, TRUE, ROLE, GEND,
    // ALGN) populates the race choices.
    for (const e of setup_racemenu(true, ROLE, GEND, ALGN)) {
        body.push({ text: `${e.key} - ${e.text}`, attr: 0 });
        choices.push({
            key: e.key,
            altkey: e.altkey,
            value: e.value,
        });
    }
    for (const line of menu_extra_lines(ROLE_RANDOM, true)) {
        body.push(line);
        if (line.key) choices.push({ key: line.key, value: line.value, preselected: true });
    }
    body.push({ text: '', attr: 0 });
    for (const which of [RS_ROLE, RS_GENDER, RS_ALGNMNT, RS_filter, ROLE_NONE]) {
        for (const line of menu_extra_lines(which)) {
            body.push(line);
            if (line.key) choices.push({ key: line.key, value: line.value });
        }
    }
    const choice = await menu_pick('Pick a race or species', body, choices);
    if (choice === ROLE_NONE) return { quit: true };
    if (choice === RS_menu_arg(RS_ALGNMNT)) {
        flags.initalign = ROLE_NONE;
        return { next: RS_ALGNMNT };
    }
    if (choice === RS_menu_arg(RS_GENDER)) {
        flags.initgend = ROLE_NONE;
        return { next: RS_GENDER };
    }
    if (choice === RS_menu_arg(RS_ROLE)) {
        flags.initrole = ROLE_NONE;
        return { next: RS_ROLE };
    }
    if (choice === RS_menu_arg(RS_filter)) {
        flags.initrace = ROLE_NONE;
        const filtered = await reset_role_filtering();
        return { next: filtered ? RS_ROLE : RS_RACE };
    }
    if (choice === ROLE_RANDOM) {
        k = pick_race(ROLE, GEND, ALGN, PICK_RANDOM);
        if (k < 0) k = 0;
    } else {
        k = choice - 1;
    }
    flags.initrace = k;
    return { next: RS_GENDER };
}

async function pick_gend_menu() {
    const flags = f();
    // C: n<=1 skips plsel_startmenu / rigid (D-0677)
    const ROLE = flags.initrole;
    const RACE = flags.initrace;
    let ALGN = flags.initalign;
    let n = 0;
    let k = 0;
    for (let i = 0; i < ROLE_GENDERS; i++) {
        if (ok_gend(ROLE, RACE, i, ALGN)) {
            n++;
            k = i;
        }
    }
    if (n === 0) {
        for (let i = 0; i < ROLE_GENDERS; i++) {
            if (validgend(ROLE, RACE, i)) {
                n++;
                k = i;
            }
        }
    }
    if (n <= 1) {
        flags.initgend = k;
        return { next: RS_ALGNMNT };
    }
    rigid_role_checks();
    ALGN = flags.initalign;
    const choices = [];
    const body = [{ text: aspect_header(), attr: 0 }, { text: '', attr: 0 }];
    // C ref: role.c genl_player_setup — setup_gendmenu(win, TRUE, ROLE, RACE,
    // ALGN) populates the gender choices.
    for (const e of setup_gendmenu(true, ROLE, RACE, ALGN)) {
        body.push({ text: `${e.key} - ${e.text}`, attr: 0 });
        choices.push({
            key: e.key,
            altkey: e.altkey,
            value: e.value,
        });
    }
    for (const line of menu_extra_lines(ROLE_RANDOM, true)) {
        body.push(line);
        if (line.key) choices.push({ key: line.key, value: line.value, preselected: true });
    }
    body.push({ text: '', attr: 0 });
    for (const which of [RS_ROLE, RS_RACE, RS_ALGNMNT, RS_filter, ROLE_NONE]) {
        for (const line of menu_extra_lines(which)) {
            body.push(line);
            if (line.key) choices.push({ key: line.key, value: line.value });
        }
    }
    const choice = await menu_pick('Pick a gender or sex', body, choices);
    if (choice === ROLE_NONE) return { quit: true };
    if (choice === RS_menu_arg(RS_ALGNMNT)) {
        flags.initalign = ROLE_NONE;
        return { next: RS_ALGNMNT };
    }
    if (choice === RS_menu_arg(RS_RACE)) {
        flags.initrace = ROLE_NONE;
        return { next: RS_RACE };
    }
    if (choice === RS_menu_arg(RS_ROLE)) {
        flags.initrole = ROLE_NONE;
        return { next: RS_ROLE };
    }
    if (choice === RS_menu_arg(RS_filter)) {
        flags.initgend = ROLE_NONE;
        const filtered = await reset_role_filtering();
        return { next: filtered ? RS_ROLE : RS_GENDER };
    }
    if (choice === ROLE_RANDOM) {
        k = pick_gend(ROLE, RACE, ALGN, PICK_RANDOM);
        if (k < 0) k = 0;
    } else {
        k = choice - 1;
    }
    flags.initgend = k;
    return { next: RS_ALGNMNT };
}

async function pick_align_menu() {
    const flags = f();
    // C: n<=1 auto-assign without rigid — Valkyrie+dwarf lawful alone must
    // not rn2(1) via pick_align PICK_RIGID (seed0014 / D-0677).
    const ROLE = flags.initrole;
    const RACE = flags.initrace;
    const GEND = flags.initgend;
    let n = 0;
    let k = 0;
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        if (ok_align(ROLE, RACE, GEND, i)) {
            n++;
            k = i;
        }
    }
    if (n === 0) {
        for (let i = 0; i < ROLE_ALIGNS; i++) {
            if (validalign(ROLE, RACE, i)) {
                n++;
                k = i;
            }
        }
    }
    if (n <= 1) {
        flags.initalign = k;
        return { next: RS_ROLE };
    }
    rigid_role_checks();
    const choices = [];
    const body = [{ text: aspect_header(), attr: 0 }, { text: '', attr: 0 }];
    // C ref: role.c genl_player_setup — setup_algnmenu(win, TRUE, ROLE, RACE,
    // GEND) populates the alignment choices.
    for (const e of setup_algnmenu(true, ROLE, RACE, GEND)) {
        body.push({ text: `${e.key} - ${e.text}`, attr: 0 });
        choices.push({
            key: e.key,
            altkey: e.altkey,
            value: e.value,
        });
    }
    for (const line of menu_extra_lines(ROLE_RANDOM, true)) {
        body.push(line);
        if (line.key) choices.push({ key: line.key, value: line.value, preselected: true });
    }
    body.push({ text: '', attr: 0 });
    for (const which of [RS_ROLE, RS_RACE, RS_GENDER, RS_filter, ROLE_NONE]) {
        for (const line of menu_extra_lines(which)) {
            body.push(line);
            if (line.key) choices.push({ key: line.key, value: line.value });
        }
    }
    const choice = await menu_pick('Pick an alignment or creed', body, choices);
    if (choice === ROLE_NONE) return { quit: true };
    if (choice === RS_menu_arg(RS_GENDER)) {
        flags.initgend = ROLE_NONE;
        return { next: RS_GENDER };
    }
    if (choice === RS_menu_arg(RS_RACE)) {
        flags.initrace = ROLE_NONE;
        return { next: RS_RACE };
    }
    if (choice === RS_menu_arg(RS_ROLE)) {
        flags.initrole = ROLE_NONE;
        return { next: RS_ROLE };
    }
    if (choice === RS_menu_arg(RS_filter)) {
        flags.initalign = ROLE_NONE;
        const filtered = await reset_role_filtering();
        return { next: filtered ? RS_ROLE : RS_ALGNMNT };
    }
    if (choice === ROLE_RANDOM) {
        k = pick_align(ROLE, RACE, GEND, PICK_RANDOM);
        if (k < 0) k = 1;
    } else {
        k = choice - 1;
    }
    flags.initalign = k;
    return { next: RS_ROLE };
}

/**
 * C: Shall I pick … for you? — yn_function with NULL resp on message line
 * while BASE splash (copyright / Who are you?) remains. Do not flush_screen.
 */
async function shall_i_pick_prompt(prompt) {
    const disp = game.nhDisplay;
    const line = prompt.replace(/\s+$/, '') + ' ';
    if (disp?.grid) {
        for (let c = 0; c < (disp.cols || 80); c++) {
            const ch = c < line.length ? line[c] : ' ';
            // C tty topline / yn uses NO_COLOR (not CLR_BLACK=0)
            disp.setCell(c, 0, ch, NO_COLOR, 0);
        }
        disp.setCursor(line.length, 0);
        disp.flush?.();
    }
    for (;;) {
        const c = await nhgetch();
        let ch = String.fromCharCode(c).toLowerCase();
        if (c === 27 || ch === 'q') return 'q';
        if (ch === ' ' || c === 13 || c === 10) return 'y';
        if (ch === '@' || ch === '*') return 'a';
        if (ch === 'y' || ch === 'n' || ch === 'a') return ch;
    }
}

async function confirm_selection() {
    const flags = f();
    const rename = !!(game.iflags?.renameallowed);
    const title = `Is this ok? [yn${rename ? 'a' : ''}q]`;
    const body = [
        { text: aspect_header(), attr: 0 },
        { text: '', attr: 0 },
        { text: 'y * Yes; start game', attr: 0 },
        { text: 'n - No; choose role again', attr: 0 },
    ];
    const choices = [
        { key: 'y', value: 1, preselected: true },
        { key: 'n', value: 2 },
    ];
    if (rename) {
        body.push({ text: 'a - Not yet; choose another name', attr: 0 });
        choices.push({ key: 'a', value: 3 });
    }
    body.push({ text: 'q - Quit', attr: 0 });
    choices.push({ key: 'q', value: -1 });

    for (;;) {
        const entries = [
            { text: title, attr: ATR_INVERSE },
            { text: '', attr: 0 },
            ...body,
        ];
        await paint_corner_nhw_menu(entries, '(end) ');
        const key = await nhgetch();
        game._menu_overlay = false;
        const ch = String.fromCharCode(key).toLowerCase();
        if (key === 27 || ch === 'q') return -1;
        if (ch === ' ' || key === 13 || key === 10) return 1;
        const hit = choices.find(c => c.key === ch);
        if (hit) return hit.value;
    }
}

/**
 * C ref: role.c genl_player_setup — interactive role/race/gender/align.
 * Branch envelope: already-specified skip; Shall I pick y/n/a/q; manual
 * menus; random facets; confirmation; rename; role filter UI.
 */
export async function genl_player_setup() {
    init_role_flags_from_rc();
    const flags = f();
    game.program_state = game.program_state || {};
    game.program_state.in_role_selection =
        (game.program_state.in_role_selection || 0) + 1;

    let picksomething = (flags.initrole === ROLE_NONE
        || flags.initrace === ROLE_NONE
        || flags.initgend === ROLE_NONE
        || flags.initalign === ROLE_NONE);

    if (flags.randomall && picksomething) {
        if (flags.initrole === ROLE_NONE) flags.initrole = ROLE_RANDOM;
        if (flags.initrace === ROLE_NONE) flags.initrace = ROLE_RANDOM;
        if (flags.initgend === ROLE_NONE) flags.initgend = ROLE_RANDOM;
        if (flags.initalign === ROLE_NONE) flags.initalign = ROLE_RANDOM;
    }

    rigid_role_checks();

    let pick4u = 'n';
    if (flags.initrole === ROLE_NONE || flags.initrace === ROLE_NONE
        || flags.initgend === ROLE_NONE || flags.initalign === ROLE_NONE) {
        // C ref: role.c genl_player_setup — build_plselection_prompt() with the
        // current facets (all-NONE → "character's race, role, gender and
        // alignment"; partial specs name only what is still unpicked).
        const prompt = build_plselection_prompt(
            flags.initrole, flags.initrace, flags.initgend, flags.initalign);
        pick4u = await shall_i_pick_prompt(prompt);
        if (pick4u === 'q') {
            game.program_state.in_role_selection--;
            return false;
        }
    }

    // makepicks:
    for (;;) {
        let nextpick = RS_ROLE;
        do {
            if (nextpick === RS_ROLE) {
                nextpick = RS_RACE;
                if (flags.initrole < 0) {
                    if (pick4u === 'y' || pick4u === 'a'
                        || flags.initrole === ROLE_RANDOM) {
                        let k = pick_role(flags.initrace, flags.initgend,
                            flags.initalign, PICK_RANDOM);
                        if (k < 0) k = rn2(roles.length);
                        flags.initrole = k;
                    } else {
                        const res = await pick_role_menu();
                        if (res.quit) {
                            game.program_state.in_role_selection--;
                            return false;
                        }
                        if (res.next != null) nextpick = res.next;
                    }
                }
            }

            if (nextpick === RS_RACE) {
                nextpick = flags.initrole < 0 ? RS_ROLE : RS_GENDER;
                if (flags.initrace < 0 || (flags.initrole >= 0
                    && !validrace(flags.initrole, flags.initrace))) {
                    if (pick4u === 'y' || pick4u === 'a'
                        || flags.initrace === ROLE_RANDOM) {
                        let k = pick_race(flags.initrole, flags.initgend,
                            flags.initalign, PICK_RANDOM);
                        if (k < 0) k = 0;
                        flags.initrace = k;
                    } else {
                        const res = await pick_race_menu();
                        if (res.quit) {
                            game.program_state.in_role_selection--;
                            return false;
                        }
                        if (res.next != null) nextpick = res.next;
                    }
                }
            }

            if (nextpick === RS_GENDER) {
                nextpick = flags.initrole < 0 ? RS_ROLE
                    : flags.initrace < 0 ? RS_RACE : RS_ALGNMNT;
                if (flags.initgend < 0 || (flags.initrole >= 0
                    && flags.initrace >= 0
                    && !validgend(flags.initrole, flags.initrace, flags.initgend))) {
                    if (pick4u === 'y' || pick4u === 'a'
                        || flags.initgend === ROLE_RANDOM) {
                        let k = pick_gend(flags.initrole, flags.initrace,
                            flags.initalign, PICK_RANDOM);
                        if (k < 0) k = 0;
                        flags.initgend = k;
                    } else {
                        const res = await pick_gend_menu();
                        if (res.quit) {
                            game.program_state.in_role_selection--;
                            return false;
                        }
                        if (res.next != null) nextpick = res.next;
                    }
                }
            }

            if (nextpick === RS_ALGNMNT) {
                nextpick = flags.initrole < 0 ? RS_ROLE
                    : flags.initrace < 0 ? RS_RACE : RS_GENDER;
                if (flags.initalign < 0 || (flags.initrole >= 0
                    && flags.initrace >= 0
                    && !validalign(flags.initrole, flags.initrace, flags.initalign))) {
                    if (pick4u === 'y' || pick4u === 'a'
                        || flags.initalign === ROLE_RANDOM) {
                        let k = pick_align(flags.initrole, flags.initrace,
                            flags.initgend, PICK_RANDOM);
                        if (k < 0) k = 1;
                        flags.initalign = k;
                    } else {
                        const res = await pick_align_menu();
                        if (res.quit) {
                            game.program_state.in_role_selection--;
                            return false;
                        }
                        if (res.next != null) nextpick = res.next;
                    }
                }
            }
        } while (flags.initrole < 0 || flags.initrace < 0
            || flags.initgend < 0 || flags.initalign < 0);

        const getconfirmation = picksomething && pick4u !== 'a'
            && !flags.randomall;
        if (!getconfirmation) break;

        const choice = await confirm_selection();
        if (choice === -1) {
            game.program_state.in_role_selection--;
            return false;
        }
        if (choice === 1) break;
        if (choice === 2) {
            pick4u = 'n';
            flags.initrole = flags.initrace = flags.initgend =
                flags.initalign = ROLE_NONE;
            continue; // makepicks
        }
        if (choice === 3) {
            // C ref: role.c genl_player_setup case 3 — rename via askname;
            // honor only the new name (restore role facets after plnamesuffix).
            // C: destroy_nhwindow(confirm) → erase_menu_or_text corner
            // docorner (not term_clear_screen); tty_askname blank+who at
            // BASE cury left by docorner (D-0475).
            const saveROLE = flags.initrole;
            const saveRACE = flags.initrace;
            const saveGEND = flags.initgend;
            const saveALGN = flags.initalign;
            game.iflags = game.iflags || {};
            game.iflags.renameinprogress = true;
            game.plname = '';
            game._menu_overlay = false;
            dismiss_chargen_nhw_menu();
            await tty_askname();
            flags.initrole = saveROLE;
            flags.initrace = saveRACE;
            flags.initgend = saveGEND;
            flags.initalign = saveALGN;
            game.iflags.renameinprogress = false;
            continue; // getconfirmation still true
        }
        break;
    }

    flags.female = flags.initgend === 1;
    game.program_state.in_role_selection--;
    return true;
}

/**
 * C ref: unixmain → player_selection() after plnamesuffix/askname.
 */
export async function player_selection() {
    const ok = await genl_player_setup();
    if (!ok) {
        throw new Error('player_selection: quit');
    }
}
