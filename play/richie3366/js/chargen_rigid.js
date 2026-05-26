// chargen_rigid.js — C role.c pick_* + rigid_role_checks + gr.rfilter.
// C ref: role.c — ok_role, ok_race, ok_gend, ok_align, pick_role, pick_race,
// pick_gend, pick_align, rigid_role_checks, randrole, randrole_filtered,
// setrolefilter, clearrolefilter.

import { rn2 } from './rng.js';
import {
    RS_filter,
    RS_ROLE,
    RS_RACE,
    RS_GENDER,
    RS_ALGNMNT,
    ROLE_RACEMASK,
    ROLE_GENDMASK,
    ROLE_ALIGNMASK,
} from './const.js';
import {
    roles,
    races,
    aligns,
    genders,
    raceAllowsAlignValueLikeC,
    validraceLikeC,
    validgendLikeC,
    validalignLikeC,
    randraceLikeC,
    randgendLikeC,
    randalignLikeC,
} from './roles.js';

export const ROLE_NONE = -1;
export const ROLE_RANDOM = -2;
export const PICK_RANDOM = 0;
export const PICK_RIGID = 1;

/** C `role.c` `roles[]` index order (`setup_rolemenu` walks `i = 0 …`). */
export const ROLE_MENU_ORDER_LIKE_C = Object.freeze(
    Array.from({ length: roles.length }, (_, i) => i),
);

/** @typedef {{ initrole: number, initrace: number, initgend: number, initalign: number }} ChargenFlags */

/* ----- C gr.rfilter — roles[] booleans + mask for race/gender/align ----- */
const rfilterExcludedRole = /** @type {boolean[]} */ ([]);
/** C `gr.rfilter.mask` — `selfmask` / `genders[].allow` / `aligns[].allow` bits. */
let rfilterMask = 0;

function ensureRfilterRoleArray() {
    while (rfilterExcludedRole.length < roles.length) rfilterExcludedRole.push(false);
}

/**
 * C clearrolefilter(which) — RS_filter clears mask + roles; per-aspect clears mask bits.
 * @param {number} which — RS_filter | RS_ROLE | RS_RACE | RS_GENDER | RS_ALGNMNT
 */
export function clearChargenRfilterAspectLikeC(which) {
    ensureRfilterRoleArray();
    switch (which) {
    case RS_filter:
        rfilterMask = 0;
        /* FALLTHROUGH */
    case RS_ROLE:
        for (let i = 0; i < roles.length; i++) rfilterExcludedRole[i] = false;
        break;
    case RS_RACE:
        rfilterMask &= ~ROLE_RACEMASK;
        break;
    case RS_GENDER:
        rfilterMask &= ~ROLE_GENDMASK;
        break;
    case RS_ALGNMNT:
        rfilterMask &= ~ROLE_ALIGNMASK;
        break;
    default:
        break;
    }
}

/** C clearrolefilter(RS_filter) — clear all exclusions. */
export function clearChargenRfilterLikeC() {
    clearChargenRfilterAspectLikeC(RS_filter);
}

/**
 * C options.c parse_role_opt — negated role/race/gender/alignment rc tokens → setrolefilter.
 * Positive identity (e.g. role:wizard) is handled by chargenFacetIndicesFromOptsLikeC, not here.
 * @param {string} raw — option value (space-separated tokens, optional leading `!` per token)
 * @param {number} which — RS_ROLE | RS_RACE | RS_GENDER | RS_ALGNMNT
 */
function applyChargenRoleAspectFiltersFromRcLikeC(raw, which) {
    let clearedForNeg = false;
    for (const token of raw.trim().split(/\s+/)) {
        let t = token.trim();
        if (!t) continue;
        let neg = false;
        if (t.startsWith('!')) {
            neg = true;
            t = t.slice(1).trim();
        } else if (/^no/i.test(t) && t.length > 2) {
            neg = true;
            t = t.slice(t[2] === '-' ? 3 : 2).trim();
        }
        if (!t || !neg) continue;
        if (!clearedForNeg) {
            clearChargenRfilterAspectLikeC(which);
            clearedForNeg = true;
        }
        trySetrolefilterTokenLikeC(t);
    }
}

/**
 * Apply OPTIONS role/race/gender/alignment filter negation from parsed nethackrc.
 * @param {ReturnType<typeof import('./options.js').parseNethackrc>} opts
 */
export function applyChargenRfiltersFromOptsLikeC(opts) {
    const specs = [
        [typeof opts.role === 'string' ? opts.role : '', RS_ROLE],
        [typeof opts.race === 'string' ? opts.race : '', RS_RACE],
        [typeof opts.gender === 'string' ? opts.gender : '', RS_GENDER],
        [typeof opts.align === 'string' ? opts.align : '', RS_ALGNMNT],
    ];
    for (const [raw, which] of specs) {
        if (raw.trim()) applyChargenRoleAspectFiltersFromRcLikeC(raw, which);
    }
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
    ensureRfilterRoleArray();

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
            rfilterMask |= rc.selfmask;
            return true;
        }
    }
    for (let i = 0; i < genders.length; i++) {
        const g = genders[i];
        if (strncmpiPrefix(s, g.name)) {
            rfilterMask |= g.allowMask;
            return true;
        }
    }
    for (let i = 0; i < aligns.length; i++) {
        const a = aligns[i];
        if (strncmpiPrefix(s, a.name)) {
            rfilterMask |= a.allowMask;
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
    if (rfilterMask) return true;
    ensureRfilterRoleArray();
    for (let i = 0; i < roles.length; i++) {
        if (rfilterExcludedRole[i]) return true;
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
    ensureRfilterRoleArray();
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
        const race = races[rai];
        if (rfilterMask & race.selfmask) return false;
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
        const g = genders[gi];
        if (rfilterMask & g.allowMask) return false;
        const gv = g.value;
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
        const a = aligns[ai];
        if (rfilterMask & a.allowMask) return false;
        const av = a.value;
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
    ensureRfilterRoleArray();
    for (let i = 0; i < roles.length; i++) {
        if (i !== r && !rfilterExcludedRole[i]) return null;
    }
    return 'filter forces role';
}

/**
 * C `role_menu_extra(RS_RACE)` — role table pins one race, or filter leaves one mask.
 */
export function roleMenuExtraRsRaceGrayLineLikeC(f) {
    const r = f.initrole;
    if (r < 0) return null;
    const role = roles[r];
    let allowmask = 0;
    for (const rn of role.allows.races) {
        const rc = races.find((x) => x.name === rn);
        if (rc) allowmask |= rc.selfmask;
    }
    if (f.initrace >= 0) {
        const sel = races[f.initrace];
        if (sel && (allowmask & ~rfilterMask) === sel.selfmask) return 'filter forces race';
        return null;
    }
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

/** C `genl_player_setup` / `*` menu: `pick_role` then `randrole(FALSE)` on failure. */
export function pickRoleWithPick4uFallbackLikeC(rai, gi, ai) {
    const r = rai >= 0 ? rai : ROLE_RANDOM;
    const g = gi >= 0 ? gi : ROLE_RANDOM;
    const a = ai >= 0 ? ai : ROLE_RANDOM;
    let k = pickRoleJs(r, g, a, PICK_RANDOM);
    if (k === ROLE_NONE) k = randroleLikeC(false);
    return k;
}

/** C `genl_player_setup`: `pick_race` then `randrace(ROLE)` on failure. */
export function pickRaceWithPick4uFallbackLikeC(ri, gi, ai) {
    const g = gi >= 0 ? gi : ROLE_RANDOM;
    const a = ai >= 0 ? ai : ROLE_RANDOM;
    let k = pickRaceJs(ri, g, a, PICK_RANDOM);
    if (k === ROLE_NONE) k = randraceLikeC(ri);
    return k;
}

/** C `genl_player_setup`: `pick_gend` then `randgend(ROLE, RACE)` on failure. */
export function pickGendWithPick4uFallbackLikeC(ri, rai, ai) {
    const a = ai >= 0 ? ai : ROLE_RANDOM;
    let k = pickGendJs(ri, rai, a, PICK_RANDOM);
    if (k === ROLE_NONE) k = randgendLikeC(ri, rai);
    return k;
}

/** C `genl_player_setup`: `pick_align` then `randalign(ROLE, RACE)` on failure. */
export function pickAlignWithPick4uFallbackLikeC(ri, rai, gi) {
    let k = pickAlignJs(ri, rai, gi, PICK_RANDOM);
    if (k === ROLE_NONE) k = randalignLikeC(ri, rai);
    return k;
}

/**
 * C role.c genl_player_setup — pick4u y or a facet picks with incompatible fallbacks
 * and validrace/validgend/validalign re-pick when a preset facet is illegal.
 * @param {ChargenFlags} f
 */
/**
 * C genl_player_setup — `flags.randomall && picksomething` sets unset facets to ROLE_RANDOM
 * before `rigid_role_checks()`.
 * @param {ChargenFlags} f
 * @param {boolean} randomall
 * @param {boolean} picksomething
 */
export function applyChargenRandomallUnsetFacetsLikeC(f, randomall, picksomething) {
    if (!randomall || !picksomething) return;
    if (f.initrole === ROLE_NONE) f.initrole = ROLE_RANDOM;
    if (f.initrace === ROLE_NONE) f.initrace = ROLE_RANDOM;
    if (f.initgend === ROLE_NONE) f.initgend = ROLE_RANDOM;
    if (f.initalign === ROLE_NONE) f.initalign = ROLE_RANDOM;
}

/** C genl_player_setup — `getconfirmation = (picksomething && pick4u != 'a' && !flags.randomall)`. */
export function chargenGetConfirmationLikeC(picksomething, pick4u, randomall) {
    return picksomething && pick4u !== 'a' && !randomall;
}

export function applyGenlPick4uRandomFacetsLikeC(f) {
    if (f.initrole === ROLE_NONE) {
        f.initrole = pickRoleWithPick4uFallbackLikeC(f.initrace, f.initgend, f.initalign);
    }
    rigidRoleChecksJs(f);
    const ri = f.initrole;
    if (f.initrace === ROLE_NONE || !validraceLikeC(ri, f.initrace)) {
        f.initrace = pickRaceWithPick4uFallbackLikeC(ri, f.initgend, f.initalign);
    }
    const rai = f.initrace;
    if (f.initgend === ROLE_NONE || !validgendLikeC(ri, rai, f.initgend)) {
        f.initgend = pickGendWithPick4uFallbackLikeC(ri, rai, f.initalign);
    }
    const gi = f.initgend;
    if (f.initalign === ROLE_NONE || !validalignLikeC(ri, rai, f.initalign)) {
        f.initalign = pickAlignWithPick4uFallbackLikeC(ri, rai, gi);
    }
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
