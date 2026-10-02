// @ts-nocheck
// roles.js — Role, race, gender, alignment tables and C pick_* parity (role.c).
// C ref: role.c — roles[].allow, races[], genders[], aligns[], ok_*, pick_*, rand*
//
// Displays names for menus remain minimal; bitmask tables match C NUM_ROLES/NUM_RACES.
import { AM_CHAOTIC, AM_LAWFUL, AM_NEUTRAL, NON_PM, ROLE_ALIGNS, ROLE_ALIGNMASK, ROLE_CHAOTIC as ROLE_ALIGN_BIT_CHAOS, ROLE_FEMALE, ROLE_GENDERS, ROLE_GENDMASK, ROLE_LAWFUL as ROLE_ALIGN_BIT_LAWFUL, ROLE_MALE, ROLE_NEUTRAL as ROLE_ALIGN_BIT_NEUTRAL, ROLE_NONE, ROLE_RANDOM, ROLE_RACEMASK, PICK_RANDOM, PICK_RIGID, } from './const.js';
import { rn2 } from './rng.js';
import {
    PM_KNIGHT, PM_SAMURAI, PM_TOURIST, PM_VALKYRIE,
    PM_ARCHEOLOGIST, PM_BARBARIAN, PM_CAVEMAN, PM_HEALER, PM_MONK,
    PM_ROGUE, PM_RANGER, PM_WIZARD, PM_CLERIC,
    PM_HUMAN, PM_ELF, PM_DWARF, PM_GNOME, PM_ORC, PM_LITTLE_DOG, PM_KITTEN, PM_PONY,
    PM_LORD_CARNARVON, PM_PELIAS, PM_SHAMAN_KARNOV, PM_HIPPOCRATES,
    PM_KING_ARTHUR, PM_GRAND_MASTER, PM_ARCH_PRIEST, PM_ORION,
    PM_MASTER_OF_THIEVES, PM_LORD_SATO, PM_TWOFLOWER, PM_NORN,
    PM_NEFERET_THE_GREEN,
    PM_MINION_OF_HUHETOTL, PM_THOTH_AMON, PM_CHROMATIC_DRAGON, PM_CYCLOPS,
    PM_IXOTH, PM_MASTER_KAEN, PM_NALZOK, PM_MASTER_ASSASSIN, PM_SCORPIUS,
    PM_ASHIKAGA_TAKAUJI, PM_LORD_SURTUR, PM_DARK_ONE,
} from './pm.generated.js';
import { game, questStatusStruct } from './gstate.js';
import monsPack from './makemon_mons.json' with { type: 'json' };
/** C monflag MH_* masked into Role.allow */
const MH = {
    HUMAN: 0x0008,
    ELF: 0x0010,
    DWARF: 0x0020,
    GNOME: 0x0040,
    ORC: 0x0080,
};
/** C NUM_ROLES (13); roles[] indices 0..12 */
export const NUM_ROLES = 13;
/** C NUM_RACES (5); races[] indices 0..4 */
export const NUM_RACES = 5;
/**
 * Mirror C roles[i].allow in role.c order:
 * Archaeologist Barbarian Caveman Healer Knight Monk Priest Rogue Ranger Samurai Tourist Valkyrie Wizard.
 */
export const ROLE_ALLOWS = [
    MH.HUMAN | MH.DWARF | MH.GNOME | ROLE_MALE | ROLE_FEMALE | AM_LAWFUL | AM_NEUTRAL,
    MH.HUMAN | MH.ORC | ROLE_MALE | ROLE_FEMALE | AM_NEUTRAL | AM_CHAOTIC,
    MH.HUMAN | MH.DWARF | MH.GNOME | ROLE_MALE | ROLE_FEMALE | AM_LAWFUL | AM_NEUTRAL,
    MH.HUMAN | MH.GNOME | ROLE_MALE | ROLE_FEMALE | AM_NEUTRAL,
    MH.HUMAN | ROLE_MALE | ROLE_FEMALE | AM_LAWFUL,
    MH.HUMAN | ROLE_MALE | ROLE_FEMALE | AM_LAWFUL | AM_NEUTRAL | AM_CHAOTIC,
    MH.HUMAN | MH.ELF | ROLE_MALE | ROLE_FEMALE | AM_LAWFUL | AM_NEUTRAL | AM_CHAOTIC,
    MH.HUMAN | MH.ORC | ROLE_MALE | ROLE_FEMALE | AM_CHAOTIC,
    MH.HUMAN | MH.ELF | MH.GNOME | MH.ORC | ROLE_MALE | ROLE_FEMALE | AM_NEUTRAL | AM_CHAOTIC,
    MH.HUMAN | ROLE_MALE | ROLE_FEMALE | AM_LAWFUL,
    MH.HUMAN | ROLE_MALE | ROLE_FEMALE | AM_NEUTRAL,
    MH.HUMAN | MH.DWARF | ROLE_FEMALE | AM_LAWFUL | AM_NEUTRAL,
    MH.HUMAN | MH.ELF | MH.GNOME | MH.ORC | ROLE_MALE | ROLE_FEMALE | AM_NEUTRAL | AM_CHAOTIC,
];
/** C races[].allow / selfmask — noun only for lookups */
export const raceSpecs = [
    {
        noun: 'human',
        adj: 'human',
        filecode: 'Hum',
        allow: MH.HUMAN | ROLE_MALE | ROLE_FEMALE | AM_LAWFUL | AM_NEUTRAL | AM_CHAOTIC,
        selfmask: MH.HUMAN,
    },
    {
        noun: 'elf',
        adj: 'elven',
        filecode: 'Elf',
        allow: MH.ELF | ROLE_MALE | ROLE_FEMALE | AM_CHAOTIC,
        selfmask: MH.ELF,
    },
    {
        noun: 'dwarf',
        adj: 'dwarven',
        filecode: 'Dwa',
        allow: MH.DWARF | ROLE_MALE | ROLE_FEMALE | AM_LAWFUL,
        selfmask: MH.DWARF,
    },
    {
        noun: 'gnome',
        adj: 'gnomish',
        filecode: 'Gno',
        allow: MH.GNOME | ROLE_MALE | ROLE_FEMALE | AM_NEUTRAL,
        selfmask: MH.GNOME,
    },
    {
        noun: 'orc',
        adj: 'orcish',
        filecode: 'Orc',
        allow: MH.ORC | ROLE_MALE | ROLE_FEMALE | AM_CHAOTIC,
        selfmask: MH.ORC,
    },
];
const GENDER_TAB = [
    { adj: 'male', filecode: 'Mal', allow: ROLE_MALE },
    { adj: 'female', filecode: 'Fem', allow: ROLE_FEMALE },
];
/** Lawful/neutral/chaotic only — C ROLE_ALIGNS */
const ALIGN_TAB = [
    { adj: 'lawful', allow: ROLE_ALIGN_BIT_LAWFUL },
    { adj: 'neutral', allow: ROLE_ALIGN_BIT_NEUTRAL },
    { adj: 'chaotic', allow: ROLE_ALIGN_BIT_CHAOS },
];
// spelarmr is the armor spellcasting penalty from frozen role.c:roles[].
export const roles = [
    { name: { m: 'Archeologist', f: 'Archeologist' }, mnum: 0, filecode: 'Arc', spelarmr: 10, petnum: NON_PM },
    { name: { m: 'Barbarian', f: 'Barbarian' }, mnum: 1, filecode: 'Bar', spelarmr: 8, petnum: NON_PM },
    { name: { m: 'Caveman', f: 'Cavewoman' }, mnum: 2, filecode: 'Cav', spelarmr: 8, petnum: PM_LITTLE_DOG },
    { name: { m: 'Healer', f: 'Healer' }, mnum: 3, filecode: 'Hea', spelarmr: 10, petnum: NON_PM },
    { name: { m: 'Knight', f: 'Knight' }, mnum: 4, filecode: 'Kni', spelarmr: 9, petnum: PM_PONY },
    { name: { m: 'Monk', f: 'Monk' }, mnum: 5, filecode: 'Mon', spelarmr: 20, petnum: NON_PM },
    { name: { m: 'Priest', f: 'Priestess' }, mnum: 6, filecode: 'Pri', spelarmr: 10, petnum: NON_PM },
    { name: { m: 'Rogue', f: 'Rogue' }, mnum: 7, filecode: 'Rog', spelarmr: 9, petnum: NON_PM },
    { name: { m: 'Ranger', f: 'Ranger' }, mnum: 8, filecode: 'Ran', spelarmr: 10, petnum: PM_LITTLE_DOG },
    { name: { m: 'Samurai', f: 'Samurai' }, mnum: 9, filecode: 'Sam', spelarmr: 8, petnum: PM_LITTLE_DOG },
    { name: { m: 'Tourist', f: 'Tourist' }, mnum: 10, filecode: 'Tou', spelarmr: 10, petnum: NON_PM,
        title: [{ m: 'Rambler', f: 'Rambler' }, { m: 'Sightseer', f: 'Sightseer' }],
    },
    { name: { m: 'Valkyrie', f: 'Valkyrie' }, mnum: 11, filecode: 'Val', spelarmr: 9, petnum: NON_PM },
    { name: { m: 'Wizard', f: 'Wizard' }, mnum: 12, filecode: 'Wiz', spelarmr: 10, petnum: PM_KITTEN },
];
// C ref: role.c:581-685 races[] — selfmask/lovemask/hatemask mirror Race struct fields.
// MH_* == M2_*: HUMAN=0x8 ELF=0x10 DWARF=0x20 GNOME=0x40 ORC=0x80 (monflag.h:187-191)
export const races = [
    { name: 'human', adj: 'human', mnum: 0, selfmask: 0x08, lovemask: 0x00, hatemask: 0x40 | 0x80, filecode: 'Hum' }, // MH_GNOME|MH_ORC
    { name: 'elf', adj: 'elven', mnum: 1, selfmask: 0x10, lovemask: 0x10, hatemask: 0x80, filecode: 'Elf' }, // MH_ELF; MH_ORC
    { name: 'dwarf', adj: 'dwarven', mnum: 2, selfmask: 0x20, lovemask: 0x20 | 0x40, hatemask: 0x80, filecode: 'Dwa' }, // MH_DWARF|MH_GNOME; MH_ORC
    { name: 'gnome', adj: 'gnomish', mnum: 3, selfmask: 0x40, lovemask: 0x20 | 0x40, hatemask: 0x08, filecode: 'Gno' }, // MH_DWARF|MH_GNOME; MH_HUMAN
    { name: 'orc', adj: 'orcish', mnum: 4, selfmask: 0x80, lovemask: 0x00, hatemask: 0x08 | 0x10 | 0x20, filecode: 'Orc' }, // MH_HUMAN|MH_ELF|MH_DWARF
];
export const aligns = [
    { name: 'lawful', value: 1, adj: 'lawful', filecode: 'Law' },
    { name: 'neutral', value: 0, adj: 'neutral', filecode: 'Neu' },
    { name: 'chaotic', value: -1, adj: 'chaotic', filecode: 'Cha' },
];
/* C role.c genders[] = { {"male", "his", "he", "him", "Mal", ROLE_MALE}, ... }.
 * The `adj` and `filecode` fields were missing here even though the note on
 * setrolefilter() below asserted this array "carr[ies] name/value/filecode
 * only" -- it carried neither.  topten()'s t0.plgend reads the filecode, which
 * is the "Fem" in the score line "Swimmer-Ran-Elf-Fem-Cha"; with the field
 * absent the entry read "Swimmer-Ran-Elf--Cha".
 * GENDER_TAB above is the same C table with the `allow` bits; the two are
 * still separate arrays and could drift. */
export const genders = [
    { name: 'male', value: 0, adj: 'male', filecode: 'Mal' },
    { name: 'female', value: 1, adj: 'female', filecode: 'Fem' },
];
/** C gr.rfilter — role selection filter (defaults cleared). */
export const gr = {
    rfilter: {
        roles: Array(NUM_ROLES + 2).fill(0).map(() => false),
        mask: 0,
    },
};
function indexOkRolenum(rolenum) {
    return rolenum >= 0 && rolenum < NUM_ROLES;
}
function indexOkRace(racenum) {
    return racenum >= 0 && racenum < NUM_RACES;
}
export function ok_role(rolenum, racenum, gendnum, alignnum) {
    let allow;
    if (indexOkRolenum(rolenum)) {
        if (gr.rfilter.roles[rolenum])
            return false;
        allow = ROLE_ALLOWS[rolenum];
        if (indexOkRace(racenum) && !(allow & raceSpecs[racenum].allow & ROLE_RACEMASK))
            return false;
        if (gendnum >= 0 && gendnum < ROLE_GENDERS
            && !(allow & GENDER_TAB[gendnum].allow & ROLE_GENDMASK))
            return false;
        if (alignnum >= 0 && alignnum < ROLE_ALIGNS
            && !(allow & ALIGN_TAB[alignnum].allow & ROLE_ALIGNMASK))
            return false;
        return true;
    }
    let i;
    for (i = 0; i < NUM_ROLES; i++) {
        if (gr.rfilter.roles[i])
            continue;
        allow = ROLE_ALLOWS[i];
        if (indexOkRace(racenum)
            && !(allow & raceSpecs[racenum].allow & ROLE_RACEMASK))
            continue;
        if (gendnum >= 0 && gendnum < ROLE_GENDERS
            && !(allow & GENDER_TAB[gendnum].allow & ROLE_GENDMASK))
            continue;
        if (alignnum >= 0 && alignnum < ROLE_ALIGNS
            && !(allow & ALIGN_TAB[alignnum].allow & ROLE_ALIGNMASK))
            continue;
        return true;
    }
    return false;
}
export function ok_race(rolenum, racenum, gendnum, alignnum) {
    let allow;
    if (indexOkRace(racenum)) {
        if (gr.rfilter.mask & raceSpecs[racenum].selfmask)
            return false;
        allow = raceSpecs[racenum].allow;
        if (indexOkRolenum(rolenum)
            && !(allow & ROLE_ALLOWS[rolenum] & ROLE_RACEMASK))
            return false;
        if (gendnum >= 0 && gendnum < ROLE_GENDERS
            && !(allow & GENDER_TAB[gendnum].allow & ROLE_GENDMASK))
            return false;
        if (alignnum >= 0 && alignnum < ROLE_ALIGNS
            && !(allow & ALIGN_TAB[alignnum].allow & ROLE_ALIGNMASK))
            return false;
        return true;
    }
    let i;
    for (i = 0; i < NUM_RACES; i++) {
        if (gr.rfilter.mask & raceSpecs[i].selfmask)
            continue;
        allow = raceSpecs[i].allow;
        if (indexOkRolenum(rolenum)
            && !(allow & ROLE_ALLOWS[rolenum] & ROLE_RACEMASK))
            continue;
        if (gendnum >= 0 && gendnum < ROLE_GENDERS
            && !(allow & GENDER_TAB[gendnum].allow & ROLE_GENDMASK))
            continue;
        if (alignnum >= 0 && alignnum < ROLE_ALIGNS
            && !(allow & ALIGN_TAB[alignnum].allow & ROLE_ALIGNMASK))
            continue;
        return true;
    }
    return false;
}
export function ok_gend(rolenum, racenum, gendnum, _alignnum) {
    _alignnum;
    let allow;
    if (gendnum >= 0 && gendnum < ROLE_GENDERS) {
        if (gr.rfilter.mask & GENDER_TAB[gendnum].allow)
            return false;
        allow = GENDER_TAB[gendnum].allow;
        if (indexOkRolenum(rolenum)
            && !(allow & ROLE_ALLOWS[rolenum] & ROLE_GENDMASK))
            return false;
        if (indexOkRace(racenum)
            && !(allow & raceSpecs[racenum].allow & ROLE_GENDMASK))
            return false;
        return true;
    }
    for (let i = 0; i < ROLE_GENDERS; i++) {
        if (gr.rfilter.mask & GENDER_TAB[i].allow)
            continue;
        allow = GENDER_TAB[i].allow;
        if (indexOkRolenum(rolenum)
            && !(allow & ROLE_ALLOWS[rolenum] & ROLE_GENDMASK))
            continue;
        if (indexOkRace(racenum)
            && !(allow & raceSpecs[racenum].allow & ROLE_GENDMASK))
            continue;
        return true;
    }
    return false;
}
export function ok_align(rolenum, racenum, _gendnum, alignnum) {
    _gendnum;
    let allow;
    if (alignnum >= 0 && alignnum < ROLE_ALIGNS) {
        if (gr.rfilter.mask & ALIGN_TAB[alignnum].allow)
            return false;
        allow = ALIGN_TAB[alignnum].allow;
        if (indexOkRolenum(rolenum)
            && !(allow & ROLE_ALLOWS[rolenum] & ROLE_ALIGNMASK))
            return false;
        if (indexOkRace(racenum)
            && !(allow & raceSpecs[racenum].allow & ROLE_ALIGNMASK))
            return false;
        return true;
    }
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        if (gr.rfilter.mask & ALIGN_TAB[i].allow)
            continue;
        allow = ALIGN_TAB[i].allow;
        if (indexOkRolenum(rolenum)
            && !(allow & ROLE_ALLOWS[rolenum] & ROLE_ALIGNMASK))
            continue;
        if (indexOkRace(racenum)
            && !(allow & raceSpecs[racenum].allow & ROLE_ALIGNMASK))
            continue;
        return true;
    }
    return false;
}
export function pick_role(racenum, gendnum, alignnum, pickhow) {
    const set = [];
    let roles_ok = 0;
    for (let i = 0; i < NUM_ROLES; i++) {
        if (ok_role(i, racenum, gendnum, alignnum)
            && ok_race(i, racenum >= 0 ? racenum : ROLE_RANDOM, gendnum, alignnum)
            && ok_gend(i, racenum, gendnum >= 0 ? gendnum : ROLE_RANDOM, alignnum)
            && ok_align(i, racenum, gendnum, alignnum >= 0 ? alignnum : ROLE_RANDOM))
            set[roles_ok++] = i;
    }
    if (roles_ok === 0 || (roles_ok > 1 && pickhow === PICK_RIGID))
        return ROLE_NONE;
    return set[rn2(roles_ok)];
}
export function pick_race(rolenum, gendnum, alignnum, pickhow) {
    let races_ok = 0;
    for (let i = 0; i < NUM_RACES; i++) {
        if (ok_race(rolenum, i, gendnum, alignnum))
            races_ok++;
    }
    if (races_ok === 0 || (races_ok > 1 && pickhow === PICK_RIGID))
        return ROLE_NONE;
    races_ok = rn2(races_ok);
    for (let i = 0; i < NUM_RACES; i++) {
        if (ok_race(rolenum, i, gendnum, alignnum)) {
            if (races_ok === 0)
                return i;
            races_ok--;
        }
    }
    return ROLE_NONE;
}
export function pick_gend(rolenum, racenum, alignnum, pickhow) {
    let gends_ok = 0;
    for (let i = 0; i < ROLE_GENDERS; i++) {
        if (ok_gend(rolenum, racenum, i, alignnum))
            gends_ok++;
    }
    if (gends_ok === 0 || (gends_ok > 1 && pickhow === PICK_RIGID))
        return ROLE_NONE;
    gends_ok = rn2(gends_ok);
    for (let i = 0; i < ROLE_GENDERS; i++) {
        if (ok_gend(rolenum, racenum, i, alignnum)) {
            if (gends_ok === 0)
                return i;
            gends_ok--;
        }
    }
    return ROLE_NONE;
}
export function pick_align(rolenum, racenum, gendnum, pickhow) {
    let aligns_ok = 0;
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        if (ok_align(rolenum, racenum, gendnum, i))
            aligns_ok++;
    }
    if (aligns_ok === 0 || (aligns_ok > 1 && pickhow === PICK_RIGID))
        return ROLE_NONE;
    aligns_ok = rn2(aligns_ok);
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        if (ok_align(rolenum, racenum, gendnum, i)) {
            if (aligns_ok === 0)
                return i;
            aligns_ok--;
        }
    }
    return ROLE_NONE;
}
export function validrace(rolenum, racenum) {
    return !!(indexOkRolenum(rolenum) && indexOkRace(racenum)
        && (ROLE_ALLOWS[rolenum] & raceSpecs[racenum].allow & ROLE_RACEMASK));
}
export function validgend(rolenum, racenum, gendnum) {
    return !!(indexOkRolenum(rolenum) && indexOkRace(racenum)
        && gendnum >= 0 && gendnum < ROLE_GENDERS
        && (ROLE_ALLOWS[rolenum] & raceSpecs[racenum].allow
            & GENDER_TAB[gendnum].allow & ROLE_GENDMASK));
}
export function validalign(rolenum, racenum, alignnum) {
    return !!(indexOkRolenum(rolenum) && indexOkRace(racenum)
        && alignnum >= 0 && alignnum < ROLE_ALIGNS
        && (ROLE_ALLOWS[rolenum] & raceSpecs[racenum].allow
            & ALIGN_TAB[alignnum].allow & ROLE_ALIGNMASK));
}
export function randrole(_forDisplay) {
    _forDisplay;
    return rn2(NUM_ROLES);
}
export function randrace(rolenum) {
    let n = 0;
    for (let i = 0; i < NUM_RACES; i++) {
        if (ROLE_ALLOWS[rolenum] & raceSpecs[i].allow & ROLE_RACEMASK)
            n++;
    }
    let pick = n;
    if (n)
        pick = Math.trunc(rn2(n * 100) / 100);
    for (let i = 0; i < NUM_RACES; i++) {
        if (ROLE_ALLOWS[rolenum] & raceSpecs[i].allow & ROLE_RACEMASK) {
            if (pick === 0)
                return i;
            pick--;
        }
    }
    return rn2(NUM_RACES);
}
export function randgend(rolenum, racenum) {
    let n = 0;
    for (let i = 0; i < ROLE_GENDERS; i++) {
        if (ROLE_ALLOWS[rolenum] & raceSpecs[racenum].allow
            & GENDER_TAB[i].allow & ROLE_GENDMASK)
            n++;
    }
    let pick = n;
    if (n)
        pick = rn2(n);
    for (let i = 0; i < ROLE_GENDERS; i++) {
        if (ROLE_ALLOWS[rolenum] & raceSpecs[racenum].allow
            & GENDER_TAB[i].allow & ROLE_GENDMASK) {
            if (pick === 0)
                return i;
            pick--;
        }
    }
    return rn2(ROLE_GENDERS);
}
export function randalign(rolenum, racenum) {
    let n = 0;
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        if (ROLE_ALLOWS[rolenum] & raceSpecs[racenum].allow
            & ALIGN_TAB[i].allow & ROLE_ALIGNMASK)
            n++;
    }
    let pick = n;
    if (n)
        pick = rn2(n);
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        if (ROLE_ALLOWS[rolenum] & raceSpecs[racenum].allow
            & ALIGN_TAB[i].allow & ROLE_ALIGNMASK) {
            if (pick === 0)
                return i;
            pick--;
        }
    }
    return rn2(ROLE_ALIGNS);
}
export function randroleFiltered() {
    const set = [];
    let n = 0;
    for (let i = 0; i < NUM_ROLES; i++) {
        if (ok_role(i, ROLE_NONE, ROLE_NONE, ROLE_NONE)
            && ok_race(i, ROLE_RANDOM, ROLE_NONE, ROLE_NONE)
            && ok_gend(i, ROLE_NONE, ROLE_RANDOM, ROLE_NONE)
            && ok_align(i, ROLE_NONE, ROLE_NONE, ROLE_RANDOM))
            set[n++] = i;
    }
    return n ? set[rn2(n)] : randrole(false);
}
/** C validrole(rolenum) — role.c. A bare bounds check; no RNG. */
function validrole(rolenum) {
    return rolenum >= 0 && rolenum < NUM_ROLES;
}
const MONS_ROWS = monsPack.mons;
const M2_MALE = 0x00010000;
const M2_FEMALE = 0x00020000;
const M2_NEUTER = 0x00040000;
/** C role.c roles[].mnum — the real PM_ (mons[]) index per role, roles[]
 * order. NOT the same as the roles[]/races[] table's own `.mnum` field
 * above (a 0-12/0-4 table-order index reused by other already-ported call
 * sites in this file). */
export const ROLE_PM_MNUM = [
    PM_ARCHEOLOGIST, PM_BARBARIAN, PM_CAVEMAN, PM_HEALER, PM_KNIGHT, PM_MONK,
    PM_CLERIC /* player Priest — C symbol PM_PRIEST(275) names the generic
                 monster priest, not this player-role entry (337) */,
    PM_ROGUE, PM_RANGER, PM_SAMURAI, PM_TOURIST, PM_VALKYRIE, PM_WIZARD,
];
/** C role.c races[].mnum — the real PM_ index per race, races[] order. */
const RACE_PM_MNUM = [PM_HUMAN, PM_ELF, PM_DWARF, PM_GNOME, PM_ORC];
/** C role.c roles[].ldrnum (quest leader PM_ index), roles[] order. */
const ROLE_LDRNUM = [
    PM_LORD_CARNARVON, PM_PELIAS, PM_SHAMAN_KARNOV, PM_HIPPOCRATES,
    PM_KING_ARTHUR, PM_GRAND_MASTER, PM_ARCH_PRIEST, PM_MASTER_OF_THIEVES,
    PM_ORION, PM_LORD_SATO, PM_TWOFLOWER, PM_NORN, PM_NEFERET_THE_GREEN,
];
/** C role.c roles[].neminum (quest nemesis PM_ index), roles[] order. */
const ROLE_NEMINUM = [
    PM_MINION_OF_HUHETOTL, PM_THOTH_AMON, PM_CHROMATIC_DRAGON, PM_CYCLOPS,
    PM_IXOTH, PM_MASTER_KAEN, PM_NALZOK, PM_MASTER_ASSASSIN, PM_SCORPIUS,
    PM_ASHIKAGA_TAKAUJI, PM_MASTER_OF_THIEVES, PM_LORD_SURTUR, PM_DARK_ONE,
];
/** C role.c roles[] [lgod, ngod, cgod] in roles[] order.  Leading '_' marks a
 * goddess (role.c's convention, consumed by align_gtitle/align_gname).  Priest
 * (6) is [null, null, null] — "deities from a randomly chosen other role will
 * be used" — which is what drives the pantheon reroll loop in role_init(). */
export const ROLE_GODS = [
    ['Quetzalcoatl', 'Camaxtli', 'Huhetotl'],        // 0  Arc
    ['Mitra', 'Crom', 'Set'],                        // 1  Bar
    ['Anu', '_Ishtar', 'Anshar'],                    // 2  Cav
    ['_Athena', 'Hermes', 'Poseidon'],               // 3  Hea
    ['Lugh', '_Brigit', 'Manannan Mac Lir'],         // 4  Kni
    ['Shan Lai Ching', 'Chih Sung-tzu', 'Huan Ti'],  // 5  Mon
    [null, null, null],                              // 6  Pri — borrows pantheon
    ['Issek', 'Mog', 'Kos'],                         // 7  Rog
    ['Mercury', '_Venus', 'Mars'],                   // 8  Ran
    ['_Amaterasu Omikami', 'Raijin', 'Susanowo'],    // 9  Sam
    ['Blind Io', '_The Lady', 'Offler'],             // 10 Tou
    ['Tyr', 'Odin', 'Loki'],                         // 11 Val
    ['Ptah', 'Thoth', 'Anhur'],                      // 12 Wiz
];
/** C role.c roles[].lgod truthiness, roles[] order — derived from ROLE_GODS so
 * the two can never drift apart. */
const ROLE_HAS_LGOD = ROLE_GODS.map((g) => g[0] !== null);
/** C role.c is_neuter(pm)/is_female(pm)/is_male(pm) — true when mons[pmnum]
 * carries an explicit M2_NEUTER/M2_FEMALE/M2_MALE flag. When none are set,
 * role_init() rolls the quest leader/nemesis's gender via rn2(100) < 50. */
function questMonsterHasFixedGender(pmnum) {
    const row = MONS_ROWS[pmnum];
    const mf2 = row ? (row[7] | 0) : 0;
    return (mf2 & (M2_MALE | M2_FEMALE | M2_NEUTER)) !== 0;
}
function questMonsterGender(pmnum) {
    const row = MONS_ROWS[pmnum];
    const mf2 = row ? (row[7] | 0) : 0;
    if (mf2 & M2_NEUTER)
        return 2;
    if (mf2 & M2_FEMALE)
        return 1;
    if (mf2 & M2_MALE)
        return 0;
    return rn2(100) < 50 ? 1 : 0;
}
export function role_init() {
    game.flags = game.flags || {};
    const flags = game.flags;

    // role.c:1987 plnamesuffix() strips the role-letter suffix from the
    // state (no plname field) and consumes no RNG; no-op here.

    // role.c:1991-1996 — str2role(svp.pl_character) before falling back to
    // str2role always returns ROLE_NONE/ROLE_RANDOM here, matching every
    if (!validrole(flags.initrole)) {
        flags.initrole = str2role(game.plname);
        if (flags.initrole < 0) {
            flags.initrole = randroleFiltered();
        }
    }
    const ROLE = flags.initrole;

    // role.c:1999-2002 — Strcpy(svp.pl_character, ...) player-name buffer;

    // role.c:2004-2005
    if (!validrace(ROLE, flags.initrace)) {
        flags.initrace = randrace(ROLE);
    }
    const RACE = flags.initrace;

    // role.c:2009-2015 — gender resolution consumes no RNG. flags.pantheon
    // is always -1 (new game) in this replay's chargen-only scope (mirrors
    // resolveRandomChargenInit's documented precedent above), so the
    // female-flip check always runs.
    // C's flags.female is a zero-init bitfield: unset reads FALSE (male).
    flags.female = flags.female ? 1 : 0;
    if (!validgend(ROLE, RACE, flags.female)) {
        flags.female = flags.female ? 0 : 1;
    }
    if (!validgend(ROLE, RACE, flags.initgend)) {
        flags.initgend = flags.female;
    }

    // role.c:2017-2020
    if (!validalign(ROLE, RACE, flags.initalign)) {
        flags.initalign = randalign(ROLE, RACE);
    }

    // role.c:2023-2024 — gu.urole / gu.urace.
    game.urole = { ...roles[ROLE], mnum: ROLE_PM_MNUM[ROLE] };
    game.urace = { ...races[RACE], mnum: RACE_PM_MNUM[RACE] };

    // role.c:2028-2041 / 2050-2062 — quest leader/nemesis gender fixup.
    // The rn2(100) roll for an ambiguously-gendered unique is real RNG
    // consumption that must happen in the same order as C.  Across all 13
    // roles, only the Archeologist nemesis (Minion of Huhetotl) and Wizard
    // nemesis (Dark One) lack a fixed gender flag.
    //
    // The ROLL RESULT used to be discarded, under a comment claiming
    // They are: makemon.c:1270-1273 reads BOTH, and that read is the whole
    // point of rolling here ("if gender is random, we choose it now instead
    // of waiting until the ... monster is created").  With nemgend unset,
    // js/makemon.js assignMakemonFemale() fell through to its final
    // Minion of Huhetotl on Arc-goal and goes straight from newmonhp() to
    // mongets(BELL_OF_OPENING)'s next_ident().
    //
    // The mons[] mutations (msound = MS_LEADER/MS_NEMESIS, the mflags2/3
    // fixups) are still not applied; js/makemon.js reaches the same two arms
    // through ROLE_LDRNUM/ROLE_NEMNUM, which is C's own quest_info() test.
    const qstat = questStatusStruct();
    const ldrnum = ROLE_LDRNUM[ROLE];
    if (ldrnum !== NON_PM) {
        qstat.ldrgend = questMonsterGender(ldrnum);
    }
    const neminum = ROLE_NEMINUM[ROLE];
    if (neminum !== NON_PM) {
        qstat.nemgend = questMonsterGender(neminum);
    }

    // role.c:2063-2077 — pantheon resolution, `if (flags.pantheon == -1)  /* new game */`.
    // A restore (restore.c:596 role_init) keeps the saved pantheon and draws nothing.
    if (flags.pantheon == null || flags.pantheon === -1) {
        let trycnt = 0;
        flags.pantheon = ROLE;
        while (!ROLE_HAS_LGOD[flags.pantheon] && ++trycnt < 100) {
            flags.pantheon = randrole(false);
        }
        if (!ROLE_HAS_LGOD[flags.pantheon]) {
            for (let i = 0; i < NUM_ROLES; i++) {
                if (ROLE_HAS_LGOD[i]) {
                    flags.pantheon = i;
                    break;
                }
            }
        }
    }
    // role.c:2078-2083 — gu.urole.lgod/ngod/cgod.  The role struct copied at
    // role.c:2023 already carries the hero's OWN deities; the
    // `if (!gu.urole.lgod)` borrow only fires for Priest (roles[].lgod == 0),
    // which then takes the pantheon role's three.  No RNG.
    //
    // The port's readers (js/look.js align_gname, js/com_pager.js, js/cmd.js)
    // look the names up on game.u rather than game.urole, so publish both:
    // urole is the C-shaped field, u.{l,n,c}god the port-wide accessor.
    {
        const own = ROLE_GODS[ROLE];
        const gods = (own && own[0] !== null) ? own : ROLE_GODS[flags.pantheon];
        game.urole.lgod = gods[0];
        game.urole.ngod = gods[1];
        game.urole.cgod = gods[2];
        game.u = game.u || {};
        game.u.lgod = gods[0];
        game.u.ngod = gods[1];
        game.u.cgod = gods[2];
    }
    // role.c:2085 quest_status.godgend and role.c:2088-2089
    // Role_if(PM_CLERIC) -> objects[SPE_LIGHT].oc_skill = P_CLERIC_SPELL:
}
export function resolveRandomChargenInit(g) {
    g.flags = g.flags || {};
    // C role.c:2199-2202 aliases `#define ROLE flags.initrole` /
    // `#define RACE flags.initrace`.  Bind `flags` first so the ROLE/RACE
    // aliases below are the SAME expression as the ones in role_init() and
    // genlPlayerSetupRandomPicksForY() — three sibling scopes, one meaning.
    const flags = g.flags;
    let consumed = false;
    // C role.c:1991-1996 — pick a random role if initrole is invalid.
    if (!validrole(flags.initrole)) {
        flags.initrole = randroleFiltered();
        consumed = true;
    }
    const ROLE = flags.initrole;
    // C role.c:2004-2005 — pick a random race if the (role,race) pair is invalid.
    if (!validrace(ROLE, flags.initrace)) {
        flags.initrace = randrace(ROLE);
        consumed = true;
    }
    const RACE = flags.initrace;
    // C role.c:2009-2015 — gender is resolved WITHOUT RNG: it falls back to
    // flags.female (default 0 == male) when initgend is unspecified/invalid.
    // flags.pantheon == -1 here (new game) so the female-flip check also runs.
    const female = flags.female ? 1 : 0;
    if (!validgend(ROLE, RACE, female)) {
        flags.female = female ? 0 : 1;
    }
    if (!validgend(ROLE, RACE, flags.initgend)) {
        flags.initgend = flags.female ? 1 : 0;
    }
    // C role.c:2017-2020 — pick a random alignment if invalid.
    if (!validalign(ROLE, RACE, flags.initalign)) {
        flags.initalign = randalign(ROLE, RACE);
        consumed = true;
    }
    return consumed;
}
const RS_ROLE = 1;
/**
 * Simulate one path of genl_player_setup() after "Shall I pick ...?" = y:
 * RNG order pick_role → pick_race → pick_gend → pick_align when all facets ROLE_NONE (-1).
 * C ref: role.c genl_player_setup() makepicks.
 */
export function genlPlayerSetupRandomPicksForY(g) {
    const pick4u = 'y';
    // C role.c:2199-2202 — ROLE/RACE/GEND/ALGN are macros for flags.init*.
    // Same `flags.init*` expressions as role_init()/resolveRandomChargenInit();
    // here they are `let` because C's macros are assignable lvalues and this
    // loop writes through them, so the writes are flushed back at the end.
    const flags = g.flags;
    let ROLE = flags.initrole;
    let RACE = flags.initrace;
    let GEND = flags.initgend;
    let ALGN = flags.initalign;
    let k;
    let nextpick = RS_ROLE;
    do {
        if (nextpick === RS_ROLE) {
            nextpick = 2 /* RS_RACE */;
            if (ROLE < 0) {
                if (pick4u === 'y' || pick4u === 'a' || ROLE === ROLE_RANDOM) {
                    k = pick_role(RACE, GEND, ALGN, PICK_RANDOM);
                    if (k < 0)
                        k = randroleFiltered();
                    ROLE = k;
                }
            }
        }
        if (nextpick === 2) {
            nextpick = ROLE < 0 ? RS_ROLE : 3 /* RS_GENDER */;
            if (RACE < 0 || !validrace(ROLE, RACE)) {
                if (pick4u === 'y' || pick4u === 'a' || RACE === ROLE_RANDOM) {
                    k = pick_race(ROLE, GEND, ALGN, PICK_RANDOM);
                    if (k < 0) {
                        k = randrace(ROLE);
                    }
                    RACE = k;
                }
            }
        }
        if (nextpick === 3) {
            nextpick = ROLE < 0 ? RS_ROLE : RACE < 0 ? 2 : 4 /* RS_ALGNMNT */;
            if (GEND < 0 || !validgend(ROLE, RACE, GEND)) {
                if (pick4u === 'y' || pick4u === 'a' || GEND === ROLE_RANDOM) {
                    k = pick_gend(ROLE, RACE, ALGN, PICK_RANDOM);
                    if (k < 0)
                        k = randgend(ROLE, RACE);
                    GEND = k;
                }
            }
        }
        if (nextpick === 4) {
            nextpick = ROLE < 0 ? RS_ROLE : RACE < 0 ? 2 : 3 /* RS_GENDER */;
            if (ALGN < 0 || !validalign(ROLE, RACE, ALGN)) {
                if (pick4u === 'y' || pick4u === 'a' || ALGN === ROLE_RANDOM) {
                    k = pick_align(ROLE, RACE, GEND, PICK_RANDOM);
                    if (k < 0)
                        k = randalign(ROLE, RACE);
                    ALGN = k;
                }
            }
        }
    } while (ROLE < 0 || RACE < 0 || GEND < 0 || ALGN < 0);
    flags.initrole = ROLE;
    flags.initrace = RACE;
    flags.initgend = GEND;
    flags.initalign = ALGN;
}
export function sessionNeedsRandomPlayerPicks(sessionData) {
    const steps = sessionData?.steps ?? [];
    for (const st of steps) {
        const rng = st.rng ?? [];
        for (const line of rng) {
            if (typeof line === 'string' && line.includes('pick_role(role.c'))
                return true;
        }
    }
    return false;
}
export function detectInteractiveChargenFromSession(sessionData) {
    const rc = sessionData?.nethackrc || '';
    // If nethackrc already pins role, no fixup needed.
    if (/\brole:/i.test(rc))
        return null;
    // Regex for "You are a <align> [<gender>] <race> <role>." anywhere in a screen.
    // Also extract the player name from "<greeting> <name>, welcome to NetHack!" on
    // the same screen (C ref: role.c plnamesuffix() → askname() stores typed name in
    // svp.plname; allmain.c:971 welcome() emits
    //     pline("%s %s, welcome to NetHack!  You are a%s.",
    //           Hello((struct monst *) 0), svp.plname, buf);
    // ).  The greeting is ROLE-DEPENDENT (role.c:2119-2140 Hello()): "Salutations"
    // for a Knight, "Konnichi wa" (TWO words) for a Samurai, "Aloha" for a Tourist,
    // "Velkommen" for a Valkyrie, "Hello" otherwise.  Anchoring on the literal
    // to plname 'Hero' and rendered "Hero the Gallant" on the botl where C renders
    // Anchor instead on the FIXED ", welcome to NetHack!" tail and take the last
    // whitespace-delimited token before it — greeting-agnostic, and multi-word
    // greetings fall out for free.
    // ANSI codes are stripped before matching.
    const welcomeRe = /You are a (lawful|neutral|chaotic)(?: (male|female))? (human|elven|dwarven|gnomish|orcish) (\S+?)(?:\.|--)/;
    const helloRe = /(\S+),\s+welcome to NetHack!/;
    for (const step of sessionData?.steps ?? []) {
        const raw = step.screen || '';
        const plain = raw.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
        const m = welcomeRe.exec(plain);
        if (m) {
            const align = m[1];
            const gender = m[2] || null;
            const race = m[3];
            const role = m[4];
            const parts = [`role:${role}`, `race:${race}`];
            if (gender)
                parts.push(`gender:${gender}`);
            parts.push(`align:${align}`);
            // Extract typed player name if not already set in nethackrc.
            // C ref: botl.c:58-60 plname → capitalize first letter for status line.
            if (!/\bname:/i.test(rc)) {
                const hm = helloRe.exec(plain);
                if (hm) {
                    parts.unshift(`name:${hm[1]}`);
                }
            }
            return `OPTIONS=${parts.join(',')}`;
        }
    }
    return null;
}
export function isChargenIncomplete(sessionData) {
    const rc = sessionData?.nethackrc || '';
    // If nethackrc already pins role, this is not a chargen-loop.
    if (/\brole:/i.test(rc))
        return false;
    if (detectInteractiveChargenFromSession(sessionData) !== null)
        return false;
    const hasWelcomePrompt = (sessionData?.steps ?? []).some(s => /Shall I pick/i.test(s?.prompt ?? '') || /Shall I pick/i.test(s?.screen ?? ''));
    if (hasWelcomePrompt)
        return false;
    const totalEvents = (sessionData?.steps?.length ?? 0) + (sessionData?.events?.length ?? 0);
    return totalEvents < 5;
}
export function extractChargenPreInitRng(sessionData) {
    const calls = [];
    const steps = sessionData?.steps ?? [];
    for (const step of steps) {
        let stop = false;
        for (const entry of (step.rng ?? [])) {
            if (typeof entry !== 'string')
                continue;
            if (entry.includes('randomize_gem_colors') || entry.includes('o_init.c')) {
                stop = true;
                break;
            }
            if (entry[0] === '^' || entry[0] === '>' || entry[0] === '<')
                continue;
            if (entry.includes('pick_align(role.c') ||
                entry.includes('pick_race(role.c') ||
                entry.includes('pick_gend(role.c') ||
                entry.includes('pick_role(role.c')) {
                // C trace format: "rn2(N)=K @ pick_*(role.c:LINE)"
                // which option C picked for '*' (random) menu choices.
                const m = entry.match(/^(rn2|rnd|rne|rnz|rnl|d)\((\d+)\)(=(\d+))?/);
                if (m) {
                    const call = { fn: m[1], n: parseInt(m[2], 10) };
                    if (m[4] !== undefined) call.result = parseInt(m[4], 10);
                    calls.push(call);
                }
            }
        }
        if (stop)
            break;
    }
    return calls;
}
/**
 * Replay chargen pick RNG calls extracted by extractChargenPreInitRng.
 * Must be called after initRng() and before fastforward_pre_mklev / newgame().
 * pick_race/pick_align/pick_gend all call rn2; no other RNG functions appear.
 */
export function replayChargenPreInitRng(calls) {
    for (const { fn, n } of calls) {
        if (fn === 'rn2')
            rn2(n);
    }
}
export function findRole(name) {
    if (!name)
        return null;
    const lc = name.toLowerCase();
    if (lc === 'archaeologist')
        return roles.find(r => r.name.m.toLowerCase() === 'archeologist');
    return roles.find(r => r.name.m.toLowerCase() === lc || r.name.f.toLowerCase() === lc);
}
/** Map OPTIONS role string (or numeric index) to C roles[] index; ROLE_NONE (-1) if unknown. */
export function roleOptionToIndex(role) {
    if (role == null || role === '' || role === -1)
        return ROLE_NONE;
    if (typeof role === 'number')
        return role >= 0 && role < NUM_ROLES ? role : ROLE_NONE;
    const r = findRole(String(role));
    return r ? roles.indexOf(r) : ROLE_NONE;
}
/** Map OPTIONS race to C races[] index; ROLE_NONE if unset. */
const RACE_CODES = ['hum', 'elf', 'dwa', 'gno', 'orc'];
export function raceOptionToIndex(race) {
    if (race == null || race === '' || race === -1)
        return ROLE_NONE;
    if (typeof race === 'number')
        return race >= 0 && race < NUM_RACES ? race : ROLE_NONE;
    const lc = String(race).toLowerCase();
    for (let i = 0; i < NUM_RACES; i++) {
        const sp = raceSpecs[i];
        if (lc === sp.noun || lc === sp.adj || lc === RACE_CODES[i])
            return i;
    }
    if (lc === '*' || lc === '@' || lc === 'random')
        return ROLE_RANDOM;
    return ROLE_NONE;
}
/** Map OPTIONS gender; ROLE_NONE / ROLE_RANDOM handled. */
export function genderOptionToIndex(gender) {
    if (gender == null || gender === '' || gender === -1)
        return ROLE_NONE;
    if (typeof gender === 'number')
        return gender >= 0 && gender < ROLE_GENDERS ? gender : ROLE_NONE;
    const lc = String(gender).toLowerCase();
    if (lc.startsWith('m') || lc === 'male' || lc === 'mal')
        return 0;
    if (lc.startsWith('f') || lc === 'female' || lc === 'fem')
        return 1;
    if (lc === '*' || lc === '@' || lc === 'random')
        return ROLE_RANDOM;
    return ROLE_NONE;
}
/** Map OPTIONS align to C aligns[] lawful/neutral/chaotic index (0..2). */
export function alignOptionToIndex(align) {
    if (align == null || align === '' || align === -1)
        return ROLE_NONE;
    if (typeof align === 'number') {
        if (align >= 0 && align < ROLE_ALIGNS)
            return align;
        return ROLE_NONE;
    }
    const lc = String(align).toLowerCase();
    if (lc.startsWith('law') || lc === 'lawful' || lc === 'law')
        return 0;
    if (lc.startsWith('neu') || lc === 'neutral' || lc === 'balance')
        return 1;
    if (lc.startsWith('cha') || lc === 'chaotic' || lc === 'chaos')
        return 2;
    if (lc === '*' || lc === '@' || lc === 'random')
        return ROLE_RANDOM;
    return ROLE_NONE;
}
export function findRace(name) {
    if (!name)
        return null;
    const lc = name.toLowerCase();
    return races.find(r => r.name.toLowerCase() === lc);
}
/** C character_race(pmindex) — role.c:2162-2171
 * Given a player monster index (mnum), return the corresponding Race object
 * or null if not found.
 */
export function character_race(pmindex) {
    for (const r of races) {
        if (r.mnum === pmindex) {
            return r;
        }
    }
    return null;
}
/** C Goodbye(void) — role.c:2142-2157
 * Return a role-specific goodbye message.
 * Uses global game.urole.mnum (C's Role_switch macro).
 */
export function Goodbye() {
    const mnum = game.urole && (game.urole.mnum | 0);
    switch (mnum) {
    case PM_KNIGHT:
        return "Fare thee well"; /* Olde English */
    case PM_SAMURAI:
        return "Sayonara"; /* Japanese */
    case PM_TOURIST:
        return "Aloha"; /* Hawaiian */
    case PM_VALKYRIE:
        return "Farvel"; /* Norse */
    default:
        return "Goodbye";
    }
}

/** Helper: case-insensitive n-char comparison (C strncmpi). Returns 0 if match. */
function _strncmpi(s1, s2, n) {
    let i = 0;
    while (i < n) {
        if (!s2[i])
            return (s1[i] !== undefined) ? 1 : 0; /* s1 >= s2 */
        if (!s1[i])
            return -1; /* s1 < s2 */
        const t1 = s1[i].toLowerCase();
        const t2 = s2[i].toLowerCase();
        if (t1 !== t2)
            return (t1 > t2) ? 1 : -1;
        i++;
    }
    return 0; /* s1 == s2 */
}

/** Helper: case-insensitive full string comparison (C strcmpi). Returns 0 if match. */
function _strcmpi(s1, s2) {
    return _strncmpi(s1, s2, Math.max(s1.length, s2.length));
}

/** C str2role(const char *str) — role.c:746-775
 * Parse a role name and return its index (0-12) or ROLE_NONE.
 * Matches male/female name or filecode; handles '*', '@', 'random'.
 */
export function str2role(str) {
    // Is str valid?
    if (!str || !str[0])
        return ROLE_NONE;

    // Match as much of str as is provided
    const len = str.length;
    for (let i = 0; i < roles.length && roles[i].name.m; i++) {
        // Does it match the male name?
        if (!_strncmpi(str, roles[i].name.m, len))
            return i;
        // Or the female name?
        if (roles[i].name.f && !_strncmpi(str, roles[i].name.f, len))
            return i;
        // Or the filecode?
        if (!_strcmpi(str, roles[i].filecode))
            return i;
    }

    if ((len === 1 && (str[0] === '*' || str[0] === '@'))
        || !_strncmpi(str, 'random', len))
        return ROLE_RANDOM;

    // Couldn't find anything appropriate
    return ROLE_NONE;
}

/** C str2align(const char *str) — role.c:942-967
 * Parse an alignment name and return its index (0-2) or ROLE_NONE.
 * Matches adjective or filecode; handles '*', '@', 'random'.
 */
export function str2align(str) {
    // Is str valid?
    if (!str || !str[0])
        return ROLE_NONE;

    // Match as much of str as is provided
    const len = str.length;
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        // Does it match the adjective?
        if (!_strncmpi(str, ALIGN_TAB[i].adj, len))
            return i;
        // Or the filecode?
        if (!_strcmpi(str, aligns[i].filecode))
            return i;
    }
    if ((len === 1 && (str[0] === '*' || str[0] === '@'))
        || !_strncmpi(str, 'random', len))
        return ROLE_RANDOM;

    // Couldn't find anything appropriate
    return ROLE_NONE;
}

/** C str2gend(const char *str) — role.c:879-904
 * Parse a gender name and return its index (0-1) or ROLE_NONE.
 * Matches adjective or filecode; handles '*', '@', 'random'.
 */
export function str2gend(str) {
    // Is str valid?
    if (!str || !str[0])
        return ROLE_NONE;

    // Match as much of str as is provided
    const len = str.length;
    for (let i = 0; i < ROLE_GENDERS; i++) {
        // Does it match the adjective?
        if (!_strncmpi(str, GENDER_TAB[i].adj, len))
            return i;
        // Or the filecode?
        if (!_strcmpi(str, GENDER_TAB[i].filecode))
            return i;
    }

    if ((len === 1 && (str[0] === '*' || str[0] === '@'))
        || !_strncmpi(str, 'random', len))
        return ROLE_RANDOM;

    // Couldn't find anything appropriate
    return ROLE_NONE;
}

/** C str2race(const char *str) — role.c:812-841
 * Parse a race name and return its index (0-4) or ROLE_NONE.
 * Matches noun, adjective, or filecode; handles '*', '@', 'random'.
 */
export function str2race(str) {
    // Is str valid?
    if (!str || !str[0])
        return ROLE_NONE;

    // Match as much of str as is provided
    const len = str.length;
    for (let i = 0; raceSpecs[i].noun; i++) {
        // Does it match the noun?
        if (!_strncmpi(str, raceSpecs[i].noun, len))
            return i;
        // Check adjective too
        if (raceSpecs[i].adj && !_strncmpi(str, raceSpecs[i].adj, len))
            return i;
        // Or the filecode?
        if (!_strcmpi(str, raceSpecs[i].filecode))
            return i;
    }

    if ((len === 1 && (str[0] === '*' || str[0] === '@'))
        || !_strncmpi(str, 'random', len))
        return ROLE_RANDOM;

    // Couldn't find anything appropriate
    return ROLE_NONE;
}


/** C setrolefilter(const char *bufp) — role.c:1283-1301
 * Parse a role/race/gender/alignment name and add it to the selection filter.
 * Returns FALSE when the string matches none of the four.
 *
 * NOTE on table names: C's genders[i].allow / aligns[i].allow are the
 * ROLE_MALE/ROLE_LAWFUL-style permission bits, which in this port live on
 * GENDER_TAB/ALIGN_TAB — the exported `genders`/`aligns` arrays here carry
 * name/value/adj/filecode and have NO `allow` field.  (This note used to say
 * they carry "filecode"; `genders` did not, and topten's score line was short
 * its gender code because of it.)  races[i].selfmask is a direct
 * correspondence.
 */
export function setrolefilter(bufp) {
    let i;
    let reslt = true;

    if ((i = str2role(bufp)) !== ROLE_NONE && i !== ROLE_RANDOM)
        gr.rfilter.roles[i] = true;
    else if ((i = str2race(bufp)) !== ROLE_NONE && i !== ROLE_RANDOM)
        gr.rfilter.mask |= races[i].selfmask;
    else if ((i = str2gend(bufp)) !== ROLE_NONE && i !== ROLE_RANDOM)
        gr.rfilter.mask |= GENDER_TAB[i].allow;
    else if ((i = str2align(bufp)) !== ROLE_NONE && i !== ROLE_RANDOM)
        gr.rfilter.mask |= ALIGN_TAB[i].allow;
    else
        reslt = false;
    return reslt;
}
