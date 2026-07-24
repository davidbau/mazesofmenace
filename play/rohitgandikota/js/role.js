// role.js — role / race / gender / alignment compatibility and selection.
// C ref: src/role.c
//
// The tables themselves are generated from src/role.c into js/role_data.js by
// tools/gen-roledata.mjs, with the `allow` bitmasks already resolved to
// numbers.
//
// In sessions whose rc does not pin role/race/gender/alignment, these pickers
// are the *first* thing to draw a random number — before o_init. Their argument
// values are visible in the recordings, e.g. seed0002 begins
// `rn2(13) @ pick_role` / `rn2(2) @ pick_race` / `rn2(2) @ pick_gend` /
// `rn2(1) @ pick_align`.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { roles, races, genders, aligns } from './role_data.js';
import { mons as MONS_INIT, PMNAMES } from './monst_data.js';

// include/you.h
export const ROLE_NONE = -1;
export const ROLE_RANDOM = -2;
const ROLE_RACEMASK = 0x0ff8;   /* allowable races */
const ROLE_GENDMASK = 0xf000;   /* allowable genders */
const ROLE_ALIGNMASK = 0x07;    /* AM_MASK, include/align.h:33 */
/* number of *player-selectable* genders and alignments — the tables carry more
   (a "group" gender, an "unaligned" alignment) that players cannot pick. */
const ROLE_GENDERS = 2;
const ROLE_ALIGNS = 3;

// include/hack.h:1301
export const PICK_RANDOM = 0;
export const PICK_RIGID = 1;

// IndexOkT(i, tab) — is i a valid index into a NUL-terminated table? Our
// generated tables already exclude the terminator, so length is the count of
// real entries.
const IndexOkT = (i, tab) => i >= 0 && i < tab.length;

// gr.rfilter — the role filter set by command-line/rc restrictions. No public
// session uses it, but the checks are ported so behaviour is not silently
// different if a held-out session does. Kept as C-shaped state.
const rfilter = { roles: new Array(roles.length).fill(0), mask: 0 };
export function reset_role_filtering() {
    rfilter.roles.fill(0);
    rfilter.mask = 0;
}

// src/role.c:971 ok_role() — is rolenum compatible with any
// racenum/gendnum/alignnum constraints?
export function ok_role(rolenum, racenum, gendnum, alignnum) {
    let i, allow;

    if (IndexOkT(rolenum, roles)) {
        if (rfilter.roles[rolenum])
            return false;
        allow = roles[rolenum].allow;
        if (IndexOkT(racenum, races)
            && !(allow & races[racenum].allow & ROLE_RACEMASK))
            return false;
        if (gendnum >= 0 && gendnum < ROLE_GENDERS
            && !(allow & genders[gendnum].allow & ROLE_GENDMASK))
            return false;
        if (alignnum >= 0 && alignnum < ROLE_ALIGNS
            && !(allow & aligns[alignnum].allow & ROLE_ALIGNMASK))
            return false;
        return true;
    } else {
        /* random; check whether any selection is possible */
        for (i = 0; i < roles.length; i++) {
            if (rfilter.roles[i])
                continue;
            allow = roles[i].allow;
            if (IndexOkT(racenum, races)
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
}

// src/role.c:1015 pick_role()
export function pick_role(racenum, gendnum, alignnum, pickhow) {
    let i;
    let roles_ok = 0;
    const set = [];

    for (i = 0; i < roles.length; i++) {
        if (ok_role(i, racenum, gendnum, alignnum)
            && ok_race(i, (racenum >= 0) ? racenum : ROLE_RANDOM,
                       gendnum, alignnum)
            && ok_gend(i, racenum,
                       (gendnum >= 0) ? gendnum : ROLE_RANDOM, alignnum)
            && ok_align(i, racenum,
                        gendnum, (alignnum >= 0) ? alignnum : ROLE_RANDOM))
            set[roles_ok++] = i;
    }
    if (roles_ok === 0 || (roles_ok > 1 && pickhow === PICK_RIGID))
        return ROLE_NONE;
    return set[rn2(roles_ok)];
}

// src/role.c:1037 ok_race()
export function ok_race(rolenum, racenum, gendnum, alignnum) {
    let i, allow;

    if (IndexOkT(racenum, races)) {
        if (rfilter.mask & races[racenum].selfmask)
            return false;
        allow = races[racenum].allow;
        if (IndexOkT(rolenum, roles)
            && !(allow & roles[rolenum].allow & ROLE_RACEMASK))
            return false;
        if (gendnum >= 0 && gendnum < ROLE_GENDERS
            && !(allow & genders[gendnum].allow & ROLE_GENDMASK))
            return false;
        if (alignnum >= 0 && alignnum < ROLE_ALIGNS
            && !(allow & aligns[alignnum].allow & ROLE_ALIGNMASK))
            return false;
        return true;
    } else {
        /* random; check whether any selection is possible */
        for (i = 0; i < races.length; i++) {
            if (rfilter.mask & races[i].selfmask)
                continue;
            allow = races[i].allow;
            if (IndexOkT(rolenum, roles)
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
}

// src/role.c:1081 pick_race()
export function pick_race(rolenum, gendnum, alignnum, pickhow) {
    let i;
    let races_ok = 0;

    for (i = 0; i < races.length; i++) {
        if (ok_race(rolenum, i, gendnum, alignnum))
            races_ok++;
    }
    if (races_ok === 0 || (races_ok > 1 && pickhow === PICK_RIGID))
        return ROLE_NONE;
    races_ok = rn2(races_ok);
    for (i = 0; i < races.length; i++) {
        if (ok_race(rolenum, i, gendnum, alignnum)) {
            if (races_ok === 0)
                return i;
            else
                races_ok--;
        }
    }
    return ROLE_NONE;
}

// src/role.c:1107 ok_gend() — gender and alignment are not comparable
// (and also not constrainable), so alignnum is unused.
export function ok_gend(rolenum, racenum, gendnum, alignnum) {
    let i, allow;

    if (gendnum >= 0 && gendnum < ROLE_GENDERS) {
        if (rfilter.mask & genders[gendnum].allow)
            return false;
        allow = genders[gendnum].allow;
        if (IndexOkT(rolenum, roles)
            && !(allow & roles[rolenum].allow & ROLE_GENDMASK))
            return false;
        if (IndexOkT(racenum, races)
            && !(allow & races[racenum].allow & ROLE_GENDMASK))
            return false;
        return true;
    } else {
        /* random; check whether any selection is possible */
        for (i = 0; i < ROLE_GENDERS; i++) {
            if (rfilter.mask & genders[i].allow)
                continue;
            allow = genders[i].allow;
            if (IndexOkT(rolenum, roles)
                && !(allow & roles[rolenum].allow & ROLE_GENDMASK))
                continue;
            if (IndexOkT(racenum, races)
                && !(allow & races[racenum].allow & ROLE_GENDMASK))
                continue;
            return true;
        }
        return false;
    }
}

// src/role.c:1146 pick_gend()
export function pick_gend(rolenum, racenum, alignnum, pickhow) {
    let i;
    let gends_ok = 0;

    for (i = 0; i < ROLE_GENDERS; i++) {
        if (ok_gend(rolenum, racenum, i, alignnum))
            gends_ok++;
    }
    if (gends_ok === 0 || (gends_ok > 1 && pickhow === PICK_RIGID))
        return ROLE_NONE;
    gends_ok = rn2(gends_ok);
    for (i = 0; i < ROLE_GENDERS; i++) {
        if (ok_gend(rolenum, racenum, i, alignnum)) {
            if (gends_ok === 0)
                return i;
            else
                gends_ok--;
        }
    }
    return ROLE_NONE;
}

// src/role.c:1172 ok_align() — gendnum unused, see ok_gend().
export function ok_align(rolenum, racenum, gendnum, alignnum) {
    let i, allow;

    if (alignnum >= 0 && alignnum < ROLE_ALIGNS) {
        if (rfilter.mask & aligns[alignnum].allow)
            return false;
        allow = aligns[alignnum].allow;
        if (IndexOkT(rolenum, roles)
            && !(allow & roles[rolenum].allow & ROLE_ALIGNMASK))
            return false;
        if (IndexOkT(racenum, races)
            && !(allow & races[racenum].allow & ROLE_ALIGNMASK))
            return false;
        return true;
    } else {
        /* random; check whether any selection is possible */
        for (i = 0; i < ROLE_ALIGNS; i++) {
            if (rfilter.mask & aligns[i].allow)
                continue;
            allow = aligns[i].allow;
            if (IndexOkT(rolenum, roles)
                && !(allow & roles[rolenum].allow & ROLE_ALIGNMASK))
                continue;
            if (IndexOkT(racenum, races)
                && !(allow & races[racenum].allow & ROLE_ALIGNMASK))
                continue;
            return true;
        }
        return false;
    }
}

// src/role.c:1211 pick_align()
export function pick_align(rolenum, racenum, gendnum, pickhow) {
    let i;
    let aligns_ok = 0;

    for (i = 0; i < ROLE_ALIGNS; i++) {
        if (ok_align(rolenum, racenum, gendnum, i))
            aligns_ok++;
    }
    if (aligns_ok === 0 || (aligns_ok > 1 && pickhow === PICK_RIGID))
        return ROLE_NONE;
    aligns_ok = rn2(aligns_ok);
    for (i = 0; i < ROLE_ALIGNS; i++) {
        if (ok_align(rolenum, racenum, gendnum, i)) {
            if (aligns_ok === 0)
                return i;
            else
                aligns_ok--;
        }
    }
    return ROLE_NONE;
}

// include/monflag.h:138-140
const M2_MALE = 0x00010000, M2_FEMALE = 0x00020000, M2_NEUTER = 0x00040000;
const M2_PEACEFUL = 0x00000002, M2_HOSTILE = 0x00000004, M2_NASTY = 0x00200000;
const M2_STALK = 0x00000008;
const M3_CLOSE = 0x0040, M3_WANTSARTI = 0x0400, M3_WAITFORU = 0x0080;
const NON_PM = -1;

// include/mondata.h — the gender predicates role_init() branches on.
const is_male   = (pm) => !!(pm.mflags2 & M2_MALE);
const is_female = (pm) => !!(pm.mflags2 & M2_FEMALE);
const is_neuter = (pm) => !!(pm.mflags2 & M2_NEUTER);

// role_init() mutates mons[] (msound, mflags2, mflags3, maligntyp) for the
// quest leader and nemesis, so the table has to be per-game state rather than
// the shared generated one.
export function reset_mons() {
    game.mons = MONS_INIT.map(m => ({ ...m }));
    return game.mons;
}

// Resolve a PM_ name from the generated role table into a mons[] index.
function pmIndex(v) {
    if (v === 'NON_PM' || v === null || v === undefined) return NON_PM;
    if (typeof v === 'number') return v;
    const i = PMNAMES[v];
    return i === undefined ? NON_PM : i;
}

// src/role.c:2029 randrole()
export function randrole() {
    return rn2(roles.length);
}

// src/role.c:1980 role_init()
//
// Runs after o_init and before the nhlib.lua align shuffle. It draws in three
// places, and 13 of the 44 public sessions diverge here if it is missing:
//
//   - quest leader gender, when the leader monster has no fixed gender
//   - quest nemesis gender, likewise
//   - the pantheon fixup loop, which spins randrole() until it finds a role
//     with a lawful god. Priest has lgod = 0, so Priest games always enter it.
//
// The quest guardian block mutates mons[] but makes no draw.
export function role_init(initrole, initalign) {
    if (!game.mons) reset_mons();
    const mons = game.mons;
    const urole = roles[initrole];
    const alignmnt = aligns[initalign].value;
    let pm;

    /* Fix up the quest leader */
    const ldrnum = pmIndex(urole.ldrnum);
    if (ldrnum !== NON_PM) {
        pm = mons[ldrnum];
        pm.msound = 'MS_LEADER';
        pm.mflags2 |= M2_PEACEFUL;
        pm.mflags3 |= M3_CLOSE;
        pm.maligntyp = alignmnt * 3;
        /* if gender is random, we choose it now instead of waiting
           until the leader monster is created */
        game.quest_ldrgend =
            is_neuter(pm) ? 2 : is_female(pm) ? 1 : is_male(pm)
                                                        ? 0
                                                        : (rn2(100) < 50 ? 1 : 0);
    }

    /* Fix up the quest guardians — no draw here */
    const guardnum = pmIndex(urole.guardnum);
    if (guardnum !== NON_PM) {
        pm = mons[guardnum];
        pm.mflags2 |= M2_PEACEFUL;
        pm.maligntyp = alignmnt * 3;
    }

    /* Fix up the quest nemesis */
    const neminum = pmIndex(urole.neminum);
    if (neminum !== NON_PM) {
        pm = mons[neminum];
        pm.msound = 'MS_NEMESIS';
        pm.mflags2 &= ~M2_PEACEFUL;
        pm.mflags2 |= (M2_NASTY | M2_STALK | M2_HOSTILE);
        pm.mflags3 &= ~M3_CLOSE;
        pm.mflags3 |= (M3_WANTSARTI | M3_WAITFORU);
        game.quest_nemgend =
            is_neuter(pm) ? 2 : is_female(pm) ? 1
                              : is_male(pm) ? 0 : (rn2(100) < 50 ? 1 : 0);
    }

    /* Fix up the god names */
    if (game.pantheon === undefined || game.pantheon === -1) { /* new game */
        let trycnt = 0;
        game.pantheon = initrole;           /* use own gods */
        /* unless they're missing */
        while (!roles[game.pantheon].lgod && ++trycnt < 100)
            game.pantheon = randrole();
        if (!roles[game.pantheon].lgod) {
            for (let i = 0; i < roles.length; i++)
                if (roles[i].lgod) { game.pantheon = i; break; }
        }
    }
}

// src/role.c:747 str2role() — match a role by name or filecode.
export function str2role(str) {
    if (!str) return ROLE_NONE;
    const s = String(str).toLowerCase();
    for (let i = 0; i < roles.length; i++) {
        const r = roles[i];
        if (r.name.m.toLowerCase() === s
            || (r.name.f && r.name.f.toLowerCase() === s)
            || (r.filecode && r.filecode.toLowerCase() === s))
            return i;
    }
    return ROLE_NONE;
}

export function str2race(str) {
    if (!str) return ROLE_NONE;
    const s = String(str).toLowerCase();
    for (let i = 0; i < races.length; i++)
        if (races[i][0] && String(races[i][0]).toLowerCase() === s) return i;
    return ROLE_NONE;
}

export function str2gend(str) {
    if (!str) return ROLE_NONE;
    const s = String(str).toLowerCase();
    for (let i = 0; i < ROLE_GENDERS; i++)
        if (String(genders[i][0]).toLowerCase() === s) return i;
    return ROLE_NONE;
}

export function str2align(str) {
    if (!str) return ROLE_NONE;
    const s = String(str).toLowerCase();
    for (let i = 0; i < ROLE_ALIGNS; i++)
        if (String(aligns[i][1]).toLowerCase() === s) return i;
    return ROLE_NONE;
}

export { roles, races, genders, aligns };
