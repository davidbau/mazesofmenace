// chargen_rigid.js — C role.c pick_* + rigid_role_checks + gr.rfilter.
// C ref: role.c — ok_role, ok_race, ok_gend, ok_align, pick_role, pick_race,
// pick_gend, pick_align, rigid_role_checks, randrole, randrole_filtered,
// setrolefilter, clearrolefilter.

import { rn2 } from './rng.js';
import { roles, races, aligns, genders, raceAllowsAlignValueLikeC } from './roles.js';

export const ROLE_NONE = -1;
export const ROLE_RANDOM = -2;
export const PICK_RANDOM = 0;
export const PICK_RIGID = 1;

/** C `role.c` tty menu / reset_role_filtering row order: Rogue before Ranger (Priest … Samurai). */
export const ROLE_MENU_ORDER_LIKE_C = Object.freeze([
    0, 1, 2, 3, 4, 5, 6, 8, 7, 9, 10, 11, 12,
]);

/** @typedef {{ initrole: number, initrace: number, initgend: number, initalign: number }} ChargenFlags */

/* ----- C gr.rfilter — boolean means "unacceptable" (excluded from picks) ----- */
const rfilterExcludedRole = /** @type {boolean[]} */ ([]);
const rfilterExcludedRace = /** @type {boolean[]} */ ([]);
const rfilterExcludedGend = /** @type {boolean[]} */ ([]);
const rfilterExcludedAlign = /** @type {boolean[]} */ ([]);

function ensureRfilterArrays() {
    while (rfilterExcludedRole.length < roles.length) rfilterExcludedRole.push(false);
    while (rfilterExcludedRace.length < races.length) rfilterExcludedRace.push(false);
    while (rfilterExcludedGend.length < genders.length) rfilterExcludedGend.push(false);
    while (rfilterExcludedAlign.length < aligns.length) rfilterExcludedAlign.push(false);
}

/** C clearrolefilter(RS_filter) — clear all exclusions. */
export function clearChargenRfilterLikeC() {
    ensureRfilterArrays();
    for (let i = 0; i < roles.length; i++) rfilterExcludedRole[i] = false;
    for (let i = 0; i < races.length; i++) rfilterExcludedRace[i] = false;
    for (let i = 0; i < genders.length; i++) rfilterExcludedGend[i] = false;
    for (let i = 0; i < aligns.length; i++) rfilterExcludedAlign[i] = false;
}

function strncmpiPrefix(user, canon) {
    if (!user || !canon || user.length > canon.length) return false;
    return canon.slice(0, user.length).toLowerCase() === user.toLowerCase();
}

/**
 * C setrolefilter(bufp) — one token; marks matching facet as unacceptable.
 * @returns {boolean} whether a filter slot was recognized
 */
export function trySetrolefilterTokenLikeC(bufp) {
    const raw = typeof bufp === 'string' ? bufp.trim() : '';
    if (!raw) return false;
    const s = raw.startsWith('!') ? raw.slice(1).trim() : raw;
    if (!s) return false;
    ensureRfilterArrays();

    for (let i = 0; i < roles.length; i++) {
        const r = roles[i];
        if (strncmpiPrefix(s, r.name.m) || (r.name.f && strncmpiPrefix(s, r.name.f))
            || s.toLowerCase() === r.abbr.toLowerCase()) {
            rfilterExcludedRole[i] = true;
            return true;
        }
    }
    for (let i = 0; i < races.length; i++) {
        const rc = races[i];
        if (strncmpiPrefix(s, rc.name) || strncmpiPrefix(s, rc.adj)
            || (rc.filecode && s.toLowerCase() === rc.filecode.toLowerCase())) {
            rfilterExcludedRace[i] = true;
            return true;
        }
    }
    for (let i = 0; i < genders.length; i++) {
        const g = genders[i];
        if (strncmpiPrefix(s, g.name)) {
            rfilterExcludedGend[i] = true;
            return true;
        }
    }
    for (let i = 0; i < aligns.length; i++) {
        const a = aligns[i];
        if (strncmpiPrefix(s, a.name)) {
            rfilterExcludedAlign[i] = true;
            return true;
        }
    }
    return false;
}

function indexOkRole(ri) {
    return ri >= 0 && ri < roles.length;
}
function indexOkRace(rai) {
    return rai >= 0 && rai < races.length;
}
function indexOkAlign(ai) {
    return ai >= 0 && ai < aligns.length;
}
function indexOkGend(gi) {
    return gi >= 0 && gi < genders.length;
}

/** C gotrolefilter() */
export function gotChargenRfilterLikeC() {
    ensureRfilterArrays();
    for (let i = 0; i < roles.length; i++) {
        if (rfilterExcludedRole[i]) return true;
    }
    for (let i = 0; i < races.length; i++) {
        if (rfilterExcludedRace[i]) return true;
    }
    for (let i = 0; i < genders.length; i++) {
        if (rfilterExcludedGend[i]) return true;
    }
    for (let i = 0; i < aligns.length; i++) {
        if (rfilterExcludedAlign[i]) return true;
    }
    return false;
}

/** C ok_role — roles[].allows + gr.rfilter.roles[rolenum]. */
export function okRoleJs(ri, rai, gi, ai) {
    if (!indexOkRole(ri)) {
        /* C IndexOkT(rolenum, roles) false — scan roles */
        if (ri === ROLE_NONE || ri === ROLE_RANDOM) {
            for (let j = 0; j < roles.length; j++) {
                if (okRoleJs(j, rai, gi, ai)) return true;
            }
            return false;
        }
        return false;
    }
    ensureRfilterArrays();
    if (rfilterExcludedRole[ri]) return false;
    const role = roles[ri];
    if (indexOkRace(rai)) {
        const rn = races[rai].name;
        if (!role.allows.races.includes(rn)) return false;
    }
    if (gi >= 0 && gi < genders.length) {
        const gv = genders[gi].value;
        if (role.allows.gender === 'female' && gv !== 1) return false;
        if (role.allows.gender === 'male' && gv !== 0) return false;
    }
    if (ai >= 0 && ai < aligns.length) {
        const av = aligns[ai].value;
        if (!role.allows.align.includes(av)) return false;
    }
    return true;
}

/**
 * C ok_race — IndexOkT(racenum) branch first (valid race index even when rolenum unset).
 */
export function okRaceJs(ri, rai, gi, ai) {
    if (indexOkRace(rai)) {
        ensureRfilterArrays();
        if (rfilterExcludedRace[rai]) return false;
        const race = races[rai];
        if (indexOkRole(ri)) {
            const role = roles[ri];
            if (!role.allows.races.includes(race.name)) return false;
        }
        if (indexOkGend(gi)) {
            const gv = genders[gi].value;
            if (race.name === 'human' || race.name === 'elf' || race.name === 'dwarf' || race.name === 'gnome' || race.name === 'orc') {
                /* C uses genders[].allow bitmasks; JS table: all playable races allow both unless role restricts */
                if (indexOkRole(ri)) {
                    const role = roles[ri];
                    if (role.allows.gender === 'female' && gv !== 1) return false;
                    if (role.allows.gender === 'male' && gv !== 0) return false;
                }
            }
        }
        if (indexOkAlign(ai)) {
            const av = aligns[ai].value;
            if (indexOkRole(ri)) {
                if (!roles[ri].allows.align.includes(av)) return false;
            }
            if (!raceAllowsAlignValueLikeC(race, av)) return false;
        }
        return true;
    }
    if (rai === ROLE_RANDOM || rai === ROLE_NONE) {
        for (let i = 0; i < races.length; i++) {
            if (okRaceJs(ri, i, gi, ai)) return true;
        }
        return false;
    }
    return false;
}

/** C ok_race without `gr.rfilter` race exclusion — for `role_menu_extra` filter-forces checks. */
export function okRaceJsIgnoreRaceRfilter(ri, rai, gi, ai) {
    if (indexOkRace(rai)) {
        const race = races[rai];
        if (indexOkRole(ri)) {
            const role = roles[ri];
            if (!role.allows.races.includes(race.name)) return false;
        }
        if (indexOkGend(gi)) {
            const gv = genders[gi].value;
            if (race.name === 'human' || race.name === 'elf' || race.name === 'dwarf' || race.name === 'gnome' || race.name === 'orc') {
                if (indexOkRole(ri)) {
                    const role = roles[ri];
                    if (role.allows.gender === 'female' && gv !== 1) return false;
                    if (role.allows.gender === 'male' && gv !== 0) return false;
                }
            }
        }
        if (indexOkAlign(ai)) {
            const av = aligns[ai].value;
            if (indexOkRole(ri)) {
                if (!roles[ri].allows.align.includes(av)) return false;
            }
            if (!raceAllowsAlignValueLikeC(race, av)) return false;
        }
        return true;
    }
    if (rai === ROLE_RANDOM || rai === ROLE_NONE) {
        for (let i = 0; i < races.length; i++) {
            if (okRaceJsIgnoreRaceRfilter(ri, i, gi, ai)) return true;
        }
        return false;
    }
    return false;
}

/** C ok_gend without gender `gr.rfilter` bit. */
export function okGendJsIgnoreGenderRfilter(ri, rai, gi, ai) {
    if (indexOkGend(gi)) {
        const gv = genders[gi].value;
        if (indexOkRole(ri)) {
            const role = roles[ri];
            if (role.allows.gender === 'female' && gv !== 1) return false;
            if (role.allows.gender === 'male' && gv !== 0) return false;
        }
        if (indexOkRace(rai)) {
            const race = races[rai];
            if (indexOkAlign(ai) && !raceAllowsAlignValueLikeC(race, aligns[ai].value)) return false;
        }
        if (indexOkAlign(ai)) {
            const av = aligns[ai].value;
            if (indexOkRole(ri) && !roles[ri].allows.align.includes(av)) return false;
        }
        return true;
    }
    if (gi === ROLE_RANDOM || gi === ROLE_NONE) {
        for (let i = 0; i < genders.length; i++) {
            if (okGendJsIgnoreGenderRfilter(ri, rai, i, ai)) return true;
        }
        return false;
    }
    return false;
}

/** C ok_align without alignment `gr.rfilter` bit. */
export function okAlignJsIgnoreAlignRfilter(ri, rai, gi, ai) {
    if (indexOkAlign(ai)) {
        const av = aligns[ai].value;
        if (indexOkRole(ri) && !roles[ri].allows.align.includes(av)) return false;
        if (indexOkRace(rai)) {
            const race = races[rai];
            if (!raceAllowsAlignValueLikeC(race, av)) return false;
        }
        return true;
    }
    if (ai === ROLE_RANDOM || ai === ROLE_NONE) {
        for (let j = 0; j < aligns.length; j++) {
            if (okAlignJsIgnoreAlignRfilter(ri, rai, gi, j)) return true;
        }
        return false;
    }
    return false;
}

export function okGendJs(ri, rai, gi, ai) {
    if (indexOkGend(gi)) {
        ensureRfilterArrays();
        if (rfilterExcludedGend[gi]) return false;
        const gv = genders[gi].value;
        if (indexOkRole(ri)) {
            const role = roles[ri];
            if (role.allows.gender === 'female' && gv !== 1) return false;
            if (role.allows.gender === 'male' && gv !== 0) return false;
        }
        if (indexOkRace(rai)) {
            const race = races[rai];
            if (indexOkAlign(ai) && !raceAllowsAlignValueLikeC(race, aligns[ai].value)) return false;
        }
        if (indexOkAlign(ai)) {
            const av = aligns[ai].value;
            if (indexOkRole(ri) && !roles[ri].allows.align.includes(av)) return false;
        }
        return true;
    }
    if (gi === ROLE_RANDOM || gi === ROLE_NONE) {
        for (let i = 0; i < genders.length; i++) {
            if (okGendJs(ri, rai, i, ai)) return true;
        }
        return false;
    }
    return false;
}

export function okAlignJs(ri, rai, gi, ai) {
    if (indexOkAlign(ai)) {
        ensureRfilterArrays();
        if (rfilterExcludedAlign[ai]) return false;
        const av = aligns[ai].value;
        if (indexOkRole(ri) && !roles[ri].allows.align.includes(av)) return false;
        if (indexOkRace(rai)) {
            const race = races[rai];
            if (!raceAllowsAlignValueLikeC(race, av)) return false;
        }
        return true;
    }
    if (ai === ROLE_RANDOM || ai === ROLE_NONE) {
        for (let j = 0; j < aligns.length; j++) {
            if (okAlignJs(ri, rai, gi, j)) return true;
        }
        return false;
    }
    return false;
}

/** C `role_menu_extra(RS_ROLE)` — every role except `initrole` is rfiltered. */
export function roleMenuExtraRsRoleGrayLineLikeC(f) {
    const r = f.initrole;
    if (r < 0) return null;
    ensureRfilterArrays();
    for (let i = 0; i < roles.length; i++) {
        if (i !== r && !rfilterExcludedRole[i]) return null;
    }
    return 'filter forces role';
}

/**
 * C `role_menu_extra(RS_RACE)` — single race left: either role table forces it,
 * or filter narrowed to one while `initrace` is set.
 */
export function roleMenuExtraRsRaceGrayLineLikeC(f) {
    const r = f.initrole;
    if (r < 0) return null;
    const gi = f.initgend >= 0 ? f.initgend : ROLE_RANDOM;
    const ai = f.initalign >= 0 ? f.initalign : ROLE_RANDOM;
    /** @type {number[]} */
    const ok = [];
    for (let rai = 0; rai < races.length; rai++) {
        if (okRaceJs(r, rai, gi, ai)) ok.push(rai);
    }
    if (ok.length !== 1) return null;
    const noun = races[ok[0]].name;
    let nIgn = 0;
    for (let rai = 0; rai < races.length; rai++) {
        if (okRaceJsIgnoreRaceRfilter(r, rai, gi, ai)) nIgn++;
    }
    if (nIgn === 1) return `role forces ${noun}`;
    if (f.initrace >= 0 && nIgn > 1) return 'filter forces race';
    return null;
}

/** C `role_menu_extra(RS_GENDER)` — role pins gender, or filter leaves one gender. */
export function roleMenuExtraRsGenderGrayLineLikeC(f) {
    const r = f.initrole;
    if (r < 0) return null;
    const ag = roles[r].allows.gender;
    if (ag === 'male') return 'role forces male';
    if (ag === 'female') return 'role forces female';
    const rai = f.initrace >= 0 ? f.initrace : ROLE_RANDOM;
    const ai = f.initalign >= 0 ? f.initalign : ROLE_RANDOM;
    let withF = 0;
    let withoutF = 0;
    for (let gi = 0; gi < genders.length; gi++) {
        if (okGendJs(r, rai, gi, ai)) withF++;
        if (okGendJsIgnoreGenderRfilter(r, rai, gi, ai)) withoutF++;
    }
    if (withF === 1 && f.initgend >= 0 && withoutF > 1) return 'filter forces gender';
    return null;
}

/** C setup_rolemenu(reset filter): row ri with race/gend/algn all ROLE_NONE. */
export function resetFilterMenuRoleRowOkLikeC(ri) {
    return okRoleJs(ri, ROLE_NONE, ROLE_NONE, ROLE_NONE)
        && okRaceJs(ri, ROLE_NONE, ROLE_NONE, ROLE_NONE)
        && okGendJs(ri, ROLE_NONE, ROLE_NONE, ROLE_NONE)
        && okAlignJs(ri, ROLE_NONE, ROLE_NONE, ROLE_NONE);
}

/** C setup_racemenu(reset filter): role/gend/algn all ROLE_NONE. */
export function resetFilterMenuRaceRowOkLikeC(rai) {
    return okRaceJs(ROLE_NONE, rai, ROLE_NONE, ROLE_NONE)
        && okRoleJs(ROLE_NONE, rai, ROLE_NONE, ROLE_NONE)
        && okAlignJs(ROLE_NONE, rai, ROLE_NONE, ROLE_NONE);
}

/** C setup_gendmenu(reset filter). */
export function resetFilterMenuGendRowOkLikeC(gi) {
    return okGendJs(ROLE_NONE, ROLE_NONE, gi, ROLE_NONE)
        && okRoleJs(ROLE_NONE, ROLE_NONE, gi, ROLE_NONE)
        && okRaceJs(ROLE_NONE, ROLE_NONE, gi, ROLE_NONE);
}

/** C setup_algnmenu(reset filter). */
export function resetFilterMenuAlignRowOkLikeC(ai) {
    return okAlignJs(ROLE_NONE, ROLE_NONE, ROLE_NONE, ai)
        && okRoleJs(ROLE_NONE, ROLE_NONE, ROLE_NONE, ai)
        && okRaceJs(ROLE_NONE, ROLE_NONE, ROLE_NONE, ai);
}

export function pickAlignJs(ri, rai, gi, pickhow) {
    let cnt = 0;
    for (let ai = 0; ai < aligns.length; ai++) {
        if (okAlignJs(ri, rai, gi, ai)) cnt++;
    }
    if (cnt === 0 || (cnt > 1 && pickhow === PICK_RIGID)) return ROLE_NONE;
    let pick = rn2(cnt);
    for (let ai = 0; ai < aligns.length; ai++) {
        if (!okAlignJs(ri, rai, gi, ai)) continue;
        if (pick === 0) return ai;
        pick--;
    }
    return ROLE_NONE;
}

export function pickRaceJs(ri, gi, ai, pickhow) {
    let cnt = 0;
    for (let rai = 0; rai < races.length; rai++) {
        if (okRaceJs(ri, rai, gi, ai)) cnt++;
    }
    if (cnt === 0 || (cnt > 1 && pickhow === PICK_RIGID)) return ROLE_NONE;
    let pick = rn2(cnt);
    for (let rai = 0; rai < races.length; rai++) {
        if (!okRaceJs(ri, rai, gi, ai)) continue;
        if (pick === 0) return rai;
        pick--;
    }
    return ROLE_NONE;
}

export function pickRoleJs(rai, gi, ai, pickhow) {
    const acc = [];
    for (const ri of ROLE_MENU_ORDER_LIKE_C) {
        if (ri >= roles.length) continue;
        if (okRoleJs(ri, rai >= 0 ? rai : ROLE_RANDOM, gi >= 0 ? gi : ROLE_RANDOM, ai >= 0 ? ai : ROLE_RANDOM)
            && okRaceJs(ri, rai >= 0 ? rai : ROLE_RANDOM, gi >= 0 ? gi : ROLE_RANDOM, ai >= 0 ? ai : ROLE_RANDOM)
            && okGendJs(ri, rai >= 0 ? rai : ROLE_RANDOM, gi >= 0 ? gi : ROLE_RANDOM, ai >= 0 ? ai : ROLE_RANDOM)
            && okAlignJs(ri, rai >= 0 ? rai : ROLE_RANDOM, gi >= 0 ? gi : ROLE_RANDOM, ai >= 0 ? ai : ROLE_RANDOM)) {
            acc.push(ri);
        }
    }
    if (acc.length === 0 || (acc.length > 1 && pickhow === PICK_RIGID)) return ROLE_NONE;
    return acc[rn2(acc.length)];
}

export function pickGendJs(ri, rai, ai, pickhow) {
    let cnt = 0;
    for (let gi = 0; gi < genders.length; gi++) {
        if (okGendJs(ri, rai, gi, ai)) cnt++;
    }
    if (cnt === 0 || (cnt > 1 && pickhow === PICK_RIGID)) return ROLE_NONE;
    let pick = rn2(cnt);
    for (let gi = 0; gi < genders.length; gi++) {
        if (!okGendJs(ri, rai, gi, ai)) continue;
        if (pick === 0) return gi;
        pick--;
    }
    return ROLE_NONE;
}

/**
 * C role.c **`randrole(boolean for_display)`** — **`rn2(SIZE(roles) - 1)`** over valid indices.
 * JS has no **`roles[]`** terminator row; **`rn2(roles.length)`** matches C’s span.
 * @param {boolean} [forDisplay] — C **`rn2_on_display_rng`**; JS uses main **`rn2`** (no split display PRNG).
 * @returns {number} role index **`0..roles.length-1`**
 */
export function randroleLikeC(forDisplay = false) {
    void forDisplay;
    return rn2(roles.length);
}

/**
 * C role.c **`randrole_filtered()`** — used when **`pick_role`** returns **`ROLE_NONE`**
 * for **`flags.initrole == ROLE_RANDOM`** (**`rigid_role_checks`**).
 * @returns {number} role index **`0..roles.length-1`**
 */
export function randroleFilteredLikeC() {
    /** @type {number[]} */
    const set = [];
    for (let i = 0; i < roles.length; i++) {
        if (
            okRoleJs(i, ROLE_NONE, ROLE_NONE, ROLE_NONE)
            && okRaceJs(i, ROLE_RANDOM, ROLE_NONE, ROLE_NONE)
            && okGendJs(i, ROLE_NONE, ROLE_RANDOM, ROLE_NONE)
            && okAlignJs(i, ROLE_NONE, ROLE_NONE, ROLE_RANDOM)
        ) {
            set.push(i);
        }
    }
    return set.length ? set[rn2(set.length)] : randroleLikeC(false);
}

/**
 * C rigid_role_checks() — order matches role.c:1270–1279 when initrole set.
 * @param {ChargenFlags} f
 */
export function rigidRoleChecksJs(f) {
    if (f.initrole === ROLE_RANDOM) {
        f.initrole = pickRoleJs(f.initrace, f.initgend, f.initalign, PICK_RANDOM);
        if (f.initrole < 0) f.initrole = randroleFilteredLikeC();
    }
    if (f.initrace === ROLE_RANDOM) {
        const t = pickRaceJs(f.initrole, f.initgend, f.initalign, PICK_RANDOM);
        if (t !== ROLE_NONE) f.initrace = t;
    }
    if (f.initalign === ROLE_RANDOM) {
        const t = pickAlignJs(f.initrole, f.initrace, f.initgend, PICK_RANDOM);
        if (t !== ROLE_NONE) f.initalign = t;
    }
    if (f.initgend === ROLE_RANDOM) {
        const t = pickGendJs(f.initrole, f.initrace, f.initalign, PICK_RANDOM);
        if (t !== ROLE_NONE) f.initgend = t;
    }

    if (f.initrole !== ROLE_NONE) {
        if (f.initrace === ROLE_NONE) {
            const t = pickRaceJs(f.initrole, f.initgend, f.initalign, PICK_RIGID);
            if (t !== ROLE_NONE) f.initrace = t;
        }
        if (f.initalign === ROLE_NONE) {
            const t = pickAlignJs(f.initrole, f.initrace, f.initgend, PICK_RIGID);
            if (t !== ROLE_NONE) f.initalign = t;
        }
        if (f.initgend === ROLE_NONE) {
            const t = pickGendJs(f.initrole, f.initrace, f.initalign, PICK_RIGID);
            if (t !== ROLE_NONE) f.initgend = t;
        }
    }
}
