// role_init.js — C role.c role_init() during allmain.c newgame (after init_objects, before init_dungeons).
// C refs: allmain.c flags.pantheon = -1; role_init(); pray.c align_gtitle for godgend.

import { rn2 } from './rng.js';
import { NON_PM } from './const.js';
import {
    roles,
    races,
    aligns,
    validroleLikeC,
    validraceLikeC,
    validgendLikeC,
    validalignLikeC,
    randraceLikeC,
    randalignLikeC,
    randgendLikeC,
    str2roleIndexLikeC,
    STR2_NONE,
} from './roles.js';
import { randroleFilteredLikeC, randroleLikeC } from './chargen_rigid.js';
import { alignGtitleLikeC } from './pray_align_gname_like_c.js';
import { permonstHuman } from './mondata.js';
import { ROLE_QUEST_PM_BY_ABBR, PM_M2_GENDER_BITS } from './role_quest_pm.js';
import { A_CURRENT, A_ORIGINAL } from './const.js';

const M2_MALE = 0x00010000;
const M2_FEMALE = 0x00020000;
const M2_NEUTER = 0x00040000;

/**
 * C mondata.h is_neuter / is_female / is_male on permonst mflags2.
 * @param {number} pmidx
 * @returns {0 | 1 | 2 | null} 0 male, 1 female, 2 neuter; null = random (rn2(100)<50)
 */
function questMonGendFromPmidxLikeC(pmidx) {
    if (pmidx < 0) return null;
    const m2 = PM_M2_GENDER_BITS[pmidx] | 0;
    if (m2 & M2_NEUTER) return 2;
    if (m2 & M2_FEMALE) return 1;
    if (m2 & M2_MALE) return 0;
    return null;
}

/**
 * C role_init quest_status.ldrgend / nemgend assignment.
 * @param {number} pmidx
 * @returns {number}
 */
function rollQuestMonGendLikeC(pmidx) {
    const fixed = questMonGendFromPmidxLikeC(pmidx);
    if (fixed !== null) return fixed;
    return rn2(100) < 50 ? 1 : 0;
}

/**
 * @param {import('./roles.js').RoleRow} role
 * @param {typeof races[0]} race
 * @param {number} alignType
 * @param {boolean} female
 * @param {{ lgod: string, ngod: string, cgod: string }} gods
 */
function assignUroleUraceLikeC(g, role, race, alignType, female, gods) {
    g.pl_character = role.name.m;
    g.u = g.u || {};
    g.u.ualign = g.u.ualign || { type: 0, record: 0 };
    g.u.ualign.type = alignType;
    g.u.ualign.record = role.initrecord ?? 0;
    g.u.ualignbase = g.u.ualignbase || [];
    g.u.ualignbase[A_CURRENT] = alignType;
    g.u.ualignbase[A_ORIGINAL] = alignType;

    g.urole = {
        abbr: role.abbr,
        name: { m: role.name.m, f: role.name.f },
        rank: { m: role.rank.m, f: role.rank.f },
        mnum: role.mnum,
        petnum: role.petnum ?? NON_PM,
        attrbase: [...role.attrbase],
        attrdist: [...role.attrdist],
        hpadv: { ...role.hpadv },
        enadv: { ...role.enadv },
        initrecord: role.initrecord ?? 0,
        allows: {
            align: [...role.allows.align],
            races: [...role.allows.races],
            gender: role.allows.gender,
        },
        lgod: gods.lgod,
        ngod: gods.ngod,
        cgod: gods.cgod,
    };

    g.urace = {
        name: race.name,
        adj: race.adj,
        mnum: race.mnum,
        selfmask: race.selfmask ?? 0,
        lovemask: race.lovemask ?? 0,
        hatemask: race.hatemask ?? 0,
        attrmin: [...race.attrmin],
        attrmax: [...race.attrmax],
        hpadv: { ...race.hpadv },
        enadv: { ...race.enadv },
        permonst: race.permonst ?? permonstHuman,
    };

    g.youmonst = g.youmonst || {};
    g.youmonst.data = race.permonst ?? permonstHuman;
}

/**
 * C role.c role_init() — validate flags.init*, pantheon, quest_status; refresh gu.urole/gu.urace.
 * Call from allmain.c newgame after init_objects (C: before init_dungeons).
 * @param {import('./gstate.js').game} g
 */
export function roleInitLikeC(g) {
    g.flags = g.flags || {};
    if (g.flags.pantheon === undefined) g.flags.pantheon = -1;

    let ri = g.initrole | 0;
    if (!validroleLikeC(ri)) {
        const fromPl = str2roleIndexLikeC(g.pl_character || '');
        ri = fromPl >= 0 && fromPl !== STR2_NONE ? fromPl : randroleFilteredLikeC();
        g.initrole = ri;
    }

    const role = roles[ri];
    if (!role) throw new Error(`role_init: bad initrole ${ri}`);

    let rai = g.initrace | 0;
    if (!validraceLikeC(ri, rai)) {
        rai = randraceLikeC(ri);
        g.initrace = rai;
    }

    if ((g.flags.pantheon | 0) === -1) {
        let female = !!g.flags.female;
        const g0 = female ? 1 : 0;
        if (!validgendLikeC(ri, rai, g0)) female = !female;
        g.flags.female = female;
    }

    let gi = g.initgend | 0;
    if (!validgendLikeC(ri, rai, gi)) {
        gi = g.flags.female ? 1 : 0;
        g.initgend = gi;
    }
    g.flags.female = gi === 1;

    let ai = g.initalign | 0;
    if (!validalignLikeC(ri, rai, ai)) {
        ai = randalignLikeC(ri, rai);
        g.initalign = ai;
    }

    const race = races[rai];
    const alignType = aligns[ai].value;
    const female = gi === 1;

    let pantheonIdx = ri;
    if ((g.flags.pantheon | 0) === -1) {
        pantheonIdx = ri;
        let trycnt = 0;
        while (!roles[pantheonIdx]?.lgod && ++trycnt < 100) {
            pantheonIdx = randroleLikeC(false);
        }
        if (!roles[pantheonIdx]?.lgod) {
            const fi = roles.findIndex((x) => x.lgod);
            pantheonIdx = fi >= 0 ? fi : 0;
        }
        g.flags.pantheon = pantheonIdx;
    }

    const pantheonSrc = roles[g.flags.pantheon | 0] || role;
    const gods = {
        lgod: role.lgod ?? pantheonSrc.lgod ?? '',
        ngod: role.ngod ?? pantheonSrc.ngod ?? '',
        cgod: role.cgod ?? pantheonSrc.cgod ?? '',
    };

    assignUroleUraceLikeC(g, role, race, alignType, female, gods);

    const qpm = ROLE_QUEST_PM_BY_ABBR[role.abbr];
    g.quest_status = g.quest_status || {};
    if (qpm && qpm.ldr >= 0) g.quest_status.ldrgend = rollQuestMonGendLikeC(qpm.ldr);
    if (qpm && qpm.nem >= 0) g.quest_status.nemgend = rollQuestMonGendLikeC(qpm.nem);
    g.quest_status.godgend = alignGtitleLikeC(g, alignType) === 'goddess' ? 1 : 0;
}
