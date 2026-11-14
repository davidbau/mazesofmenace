// @ts-nocheck
// roles.js — Role, race, gender, alignment tables and C pick_* parity (role.c).
// C ref: role.c — roles[].allow, races[], genders[], aligns[], ok_*, pick_*, rand*
//
// Displays names for menus remain minimal; bitmask tables match C NUM_ROLES/NUM_RACES.
import { AM_CHAOTIC, AM_LAWFUL, AM_NEUTRAL, NON_PM, ROLE_ALIGNS, ROLE_ALIGNMASK, ROLE_CHAOTIC as ROLE_ALIGN_BIT_CHAOS, ROLE_FEMALE, ROLE_GENDERS, ROLE_GENDMASK, ROLE_LAWFUL as ROLE_ALIGN_BIT_LAWFUL, ROLE_MALE, ROLE_NEUTRAL as ROLE_ALIGN_BIT_NEUTRAL, ROLE_NONE, ROLE_RANDOM, ROLE_RACEMASK, PICK_RANDOM, PICK_RIGID, } from './const.js';
import { rn2, rn2_on_display_rng } from './rnd.js';
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
import { ok_align, ok_gend, ok_race, ok_role, pick_align, pick_gend, pick_race, pick_role, randalign, randgend, randrace, randrole, str2role, validalign, validgend, validrace, validrole } from './role.js'; // relocate-fns
export { Goodbye, character_race, pick_align, pick_gend, pick_race, pick_role, randalign, randgend, randrace, randrole, role_init, setrolefilter, str2align, str2gend, str2race, str2role } from './role.js'; // relocate-fns
export { M2_FEMALE, M2_MALE, M2_NEUTER, MONS_ROWS }; // relocate-fns
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
/** C role.c is_neuter(pm)/is_female(pm)/is_male(pm) — true when mons[pmnum]
 * carries an explicit M2_NEUTER/M2_FEMALE/M2_MALE flag. When none are set,
 * role_init() rolls the quest leader/nemesis's gender via rn2(100) < 50. */
function questMonsterHasFixedGender(pmnum) {
    const row = MONS_ROWS[pmnum];
    const mf2 = row ? (row[7] | 0) : 0;
    return (mf2 & (M2_MALE | M2_FEMALE | M2_NEUTER)) !== 0;
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
    return r ? roles.indexOf(r) : str2role(String(role));
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








