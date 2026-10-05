// @ts-nocheck
// u_init.c — role-specific initialisation.
// C ref: u_init.c — u_init_role (line 637), u_init_misc (line 944);
// attrib.c — newhp (line 1086), init_attr (line 723), init_uhunger (eat.c:126);
// exper.c — newpw (line 45); role.c — roles[].hpadv/enadv/attrbase/initrecord.
// @ts-nocheck — sibling imports from hand-maintained js/*.js (no .d.ts yet).
import { rn2, rnd, rne } from './rng.js';
import { RIGHT_HANDED, LEFT_HANDED, P_NUM_SKILLS, P_UNSKILLED,
    W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU } from './const.js';
import { PM_ARCHEOLOGIST, PM_BARBARIAN, PM_CAVEMAN, PM_HEALER, PM_KNIGHT, PM_MONK,
    PM_CLERIC, PM_ROGUE, PM_RANGER, PM_SAMURAI, PM_TOURIST, PM_VALKYRIE, PM_WIZARD,
    PM_HUMAN, PM_ELF, PM_DWARF, PM_GNOME, PM_ORC } from './pm.generated.js';
import { setworn } from './worn.js';
import { setuwep, setuswapwep, setuqwep, set_twoweap, useupall, is_ammo } from './cmd.js';
import { initialspell, num_spells, spell_skilltype } from './spell.js';
import { OC_DESCR } from './oc_descr_data.js';
import { skill_init, skills_for_role } from './skills.js';
import { newhp, newpw } from './exper.js';
/* C u_init.c:992-993 set_uasmon() / u_init.c:999 adjabil(0,1) — the hero's
 * starting form and level-1 innate intrinsics.  Both are runtime-only edges
 * (neither polyself.js nor attrib.js reaches back into u_init.js at module
 * init), so these cycles resolve. */
import { set_uasmon } from './polyself.js';
import { adjabil, adjattrib } from './attrib.js';
import { addinv } from './hold_another_object.js';
import { weight, inv_weight } from './weight.js';
import { hidden_gold } from './vault.js';
import { Japanese_item_name } from './objnam.js';
import { OC_CHARGED } from './oc_cost_data.js';
import { NUM_RACES, NUM_ROLES } from './roles.js';
import { game } from './gstate.js';
/* C obj.h:257 bimanual(otmp) — this file already imports from do_wear.js on
 * this line, so taking the one shared copy adds no module edge. */
import { find_ac, bimanual, is_shield, is_helmet, is_gloves, is_shirt,
    is_cloak, is_boots, is_suit } from './do_wear.js';
import { discover_object } from './o_init.js';
import { MKOBJ_OC_SKILL, MKOBJ_OC_MAGIC } from './mkobj_erosion_meta.js';
import { OC_USES_KNOWN, dealloc_obj, mksobj, mkobj } from './mklev.js';
import { MKOBJ_OC_CLASS, MKOBJ_SVB_BASES } from './mkobj_data.js';
import { NON_PM, A_CHAOTIC, A_CON, JUMPING, FROMOUTSIDE, LAST_PROP } from './const.js';
const STATUE = 476; // objects.h
// C role indices (role.c order): 0=Archeologist 1=Barbarian 2=Caveman 3=Healer
// 4=Knight 5=Monk 6=Priest 7=Rogue 8=Ranger 9=Samurai 10=Tourist 11=Valkyrie 12=Wizard
//
// These are `flags.initrole` values — "index into roles[]" (C flag.h:144) — and
// they are NOT the C `PM_*` constants, which are mons[] indices (C you.h:186
// `short mnum; /* index (PM_) of role */`, so Role_if(PM_HEALER) tests
// urole.mnum == 334).  They were spelled PM_ARCHEOLOGIST..PM_WIZARD here, which
// put 0..12 into the same JS name as the 331..343 that js/makemon.js,
// js/uhitm.js, js/mhitm.js and js/pm.generated.js correctly use.  Two values
// and C has no constant named PM_HEALER equal to 3 — so the ROLE_ prefix names
// the index space these actually live in.  The INITROLE_TO_PM table just below
// is the bridge between the two spaces, and its comments keep the PM_ spelling
// because they name real mons[] indices.
const ROLE_ARCHEOLOGIST = 0;
const ROLE_BARBARIAN = 1;
const ROLE_CAVE_DWELLER = 2;
const ROLE_HEALER = 3;
const ROLE_KNIGHT = 4;
const ROLE_MONK = 5;
const ROLE_CLERIC = 6;
const ROLE_ROGUE = 7;
const ROLE_RANGER = 8;
const ROLE_SAMURAI = 9;
const ROLE_TOURIST = 10;
const ROLE_VALKYRIE = 11;
const ROLE_WIZARD = 12;
/**
 * Map flags.initrole (role.c index 0..12) → PM_* mons[] index.
 * C ref: u_init.c:991 — u.umonnum = u.umonster = gu.urole.mnum;
 * gu.urole is undefined at replay time; flags.initrole IS reliably resolved.
 * Values from pm.generated.js (role monsters in mons[] order).
 */
const INITROLE_TO_PM = [
    331, /* 0  Arc -> PM_ARCHEOLOGIST */
    332, /* 1  Bar -> PM_BARBARIAN */
    333, /* 2  Cav -> PM_CAVEMAN */
    334, /* 3  Hea -> PM_HEALER */
    335, /* 4  Kni -> PM_KNIGHT */
    336, /* 5  Mon -> PM_MONK */
    337, /* 6  Pri -> PM_PRIEST (role, duplicate at 337) */
    339, /* 7  Rog -> PM_ROGUE */
    338, /* 8  Ran -> PM_RANGER */
    340, /* 9  Sam -> PM_SAMURAI */
    341, /* 10 Tou -> PM_TOURIST */
    342, /* 11 Val -> PM_VALKYRIE */
    343, /* 12 Wiz -> PM_WIZARD */
];
/** C ref: role.c roles[]. hpadv per role (Init/Lower/Higher × fix/rnd). */
export const ROLE_HPADV = [
    /* Arc */ { infix: 11, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
    /* Bar */ { infix: 14, inrnd: 0, lofix: 0, lornd: 10, hifix: 2, hirnd: 0 },
    /* Cav */ { infix: 14, inrnd: 0, lofix: 0, lornd: 8, hifix: 2, hirnd: 0 },
    /* Hea */ { infix: 11, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
    /* Kni */ { infix: 14, inrnd: 0, lofix: 0, lornd: 8, hifix: 2, hirnd: 0 },
    /* Mon */ { infix: 12, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
    /* Pri */ { infix: 12, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
    /* Rog */ { infix: 10, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
    /* Ran */ { infix: 13, inrnd: 0, lofix: 0, lornd: 6, hifix: 1, hirnd: 0 },
    /* Sam */ { infix: 13, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
    /* Tou */ { infix: 8, inrnd: 0, lofix: 0, lornd: 8, hifix: 0, hirnd: 0 },
    /* Val */ { infix: 14, inrnd: 0, lofix: 0, lornd: 8, hifix: 2, hirnd: 0 },
    /* Wiz */ { infix: 10, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
];
/** C ref: role.c roles[]. enadv per role. */
export const ROLE_ENADV = [
    /* Arc */ { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
    /* Bar */ { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
    /* Cav */ { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
    /* Hea */ { infix: 1, inrnd: 4, lofix: 0, lornd: 1, hifix: 0, hirnd: 2 },
    /* Kni */ { infix: 1, inrnd: 4, lofix: 0, lornd: 1, hifix: 0, hirnd: 2 },
    /* Mon */ { infix: 2, inrnd: 2, lofix: 0, lornd: 2, hifix: 0, hirnd: 2 },
    /* Pri */ { infix: 4, inrnd: 3, lofix: 0, lornd: 2, hifix: 0, hirnd: 2 },
    /* Rog */ { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
    /* Ran */ { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
    /* Sam */ { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
    /* Tou */ { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
    /* Val */ { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
    /* Wiz */ { infix: 4, inrnd: 3, lofix: 0, lornd: 2, hifix: 0, hirnd: 3 },
];
/** C ref: role.c races[]. hpadv per race (hum/elf/dwa/gno/orc). */
export const RACE_HPADV = [
    /* hum */ { infix: 2, inrnd: 0, lofix: 0, lornd: 2, hifix: 1, hirnd: 0 },
    /* elf */ { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 1, hirnd: 0 },
    /* dwa */ { infix: 4, inrnd: 0, lofix: 0, lornd: 3, hifix: 2, hirnd: 0 },
    /* gno */ { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 0 },
    /* orc */ { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 0 },
];
/** C ref: role.c races[]. enadv per race. */
export const RACE_ENADV = [
    /* hum */ { infix: 1, inrnd: 0, lofix: 2, lornd: 0, hifix: 2, hirnd: 0 },
    /* elf */ { infix: 2, inrnd: 0, lofix: 3, lornd: 0, hifix: 3, hirnd: 0 },
    /* dwa */ { infix: 0, inrnd: 0, lofix: 0, lornd: 0, hifix: 0, hirnd: 0 },
    /* gno */ { infix: 2, inrnd: 0, lofix: 2, lornd: 0, hifix: 2, hirnd: 0 },
    /* orc */ { infix: 1, inrnd: 0, lofix: 1, lornd: 0, hifix: 1, hirnd: 0 },
];
/** C ref: role.c roles[].attrbase — initial Str/Int/Wis/Dex/Con/Cha. */
export const ROLE_ATTRBASE = [
    /* Arc */ [7, 10, 10, 7, 7, 7],
    /* Bar */ [16, 7, 7, 15, 16, 6],
    /* Cav */ [10, 7, 7, 7, 8, 6],
    /* Hea */ [7, 7, 13, 7, 11, 16],
    /* Kni */ [13, 7, 14, 8, 10, 17],
    /* Mon */ [10, 7, 8, 8, 7, 7],
    /* Pri */ [7, 7, 10, 7, 7, 7],
    /* Rog */ [7, 7, 7, 10, 7, 6],
    /* Ran */ [13, 13, 13, 9, 13, 7],
    /* Sam */ [10, 8, 7, 10, 17, 6],
    /* Tou */ [7, 10, 6, 7, 7, 10],
    /* Val */ [10, 7, 7, 7, 10, 7],
    /* Wiz */ [7, 10, 7, 7, 7, 7],
];
/** C ref: role.c roles[].initrecord — initial u.ualign.record per role.
 *  Located in the struct between xlev (Energy line) and spelbase. */
export const ROLE_INITRECORD = [
    /* Arc */ 10,
    /* Bar */ 10,
    /* Cav */ 0,
    /* Hea */ 10,
    /* Kni */ 10,
    /* Mon */ 10,
    /* Pri */ 0,
    /* Rog */ 10,
    /* Ran */ 10,
    /* Sam */ 10,
    /* Tou */ 0,
    /* Val */ 0,
    /* Wiz */ 0,
];
/* C ref: role.c:697 aligns[].value indexed by flags.initalign:
 *   aligns[0] = A_LAWFUL  ( 1)
 *   aligns[1] = A_NEUTRAL ( 0)
 *   aligns[2] = A_CHAOTIC (-1)
 * align.h: A_LAWFUL=1, A_NEUTRAL=0, A_CHAOTIC=-1.
 * you.h:   A_CURRENT=0, A_ORIGINAL=1. */
const ALIGN_VALUE = [1, 0, -1];
// (ROLE_INITRECORD above is the C source-of-truth table.)
/* newhpInit/newpwInit removed: the u.ulevel==0 init path is now handled inside
 * the unified newhp()/newpw() in js/exper.js, mirroring C 1:1 (attrib.c:1086,
 * exper.c:45 both branch on u.ulevel==0 internally). u_init_misc() below calls
 * newhp()/newpw() directly, just as C u_init.c:996-997 does. */
export async function u_init_misc() {
    const g = game;
    g.flags = g.flags || {};
    const initrole = (g.flags.initrole ?? -1) | 0;
    const initrace = (g.flags.initrace ?? -1) | 0;
    if (initrole < 0) {
        return;
    }
    const rOk = initrole >= 0 && initrole < NUM_ROLES;
    /* C ref u_init.c:949 — the FIRST statement of u_init_misc():
     *     flags.female = flags.initgend;
     * role_init() (role.c:2009-2015) resolves flags.initgend to a definite 0/1
     * and only touches flags.female for the validgend flip; this is the line
     * that then makes flags.female follow it.  Placed after the initrole < 0
     * bail above rather than literally first, because C never reaches
     * u_init_misc() with an unresolved role at all (see the bail's comment). */
    g.flags.female = (g.flags.initgend | 0) !== 0;
    g.u = g.u || {};
    const u = g.u;
    // C u_init.c:957 memset(&u, 0, sizeof(u)); you.h embeds every property
    // slot. Reset before adjabil, including on a failed-restore restart.
    u.uexp = 0n;
    u.urexp = 0n;
    u.uprops = Array.from({length: LAST_PROP + 1},
        () => ({intrinsic: 0, extrinsic: 0, blocked: 0}));
    /* C ref u_init.c:983: u.uz.dlevel = 1.  C memset(&u,0,sizeof(u)) at
     * u_init.c:954 zeroes u.uz.dlevel; line 983 then sets it back to 1.
     * Mirror that here so the post-u_init_misc state matches C. */
    u.uz = u.uz || {};
    u.uz.dlevel = 1;
    /* C ref u_init.c:954: memset(&u, 0, sizeof(u)) zeros every u.* field at
     * the top of u_init_misc().  Most scalars we explicitly init below; these
     * three are sourced by mapstate.js and otherwise default to undefined on
     * the JS side, so write them explicitly to match the C memset semantics.
     *
     *   u.umovement — short, zero at post_init.  C sets it to NORMAL_SPEED=12
     *     in moveloop_preamble() (allmain.c:85), which fires AFTER the
     *     post_init dump at allmain.c:909 — so the post_init value is 0.
     *   u.uluck     — schar, zero at post_init.  The `u.uluck = u.moreluck = 0`
     *     assignment in u_init.c:963 is inside `#if 0` (documentation only);
     *     memset(&u,0,...) at u_init.c:954 is the actual source of the 0. */
    u.umovement = 0;
    u.uluck = 0;
    u.moreluck = 0;
    /* C ref u_init.c:991: u.umonnum = u.umonster = gu.urole.mnum;
     * gu.urole is undefined at replay time; use INITROLE_TO_PM table. */
    u.umonnum = u.umonster = INITROLE_TO_PM[initrole];
    u.ulycn = NON_PM;
    set_uasmon();
    /* C ref u_init.c:995-1000: u.ulevel = 0; newhp/newpw; adjabil(0,1);
     * u.ulevel = u.ulevelmax = 1. Tracked: only ulevel=1 affects the bug board. */
    u.ulevel = 0;
    /* C ref u_init.c:996-997: calls the SAME newhp()/newpw() used on level-up;
     * both read u.ulevel (== 0 here) and branch into their init path internally
     * (attrib.c:1090, exper.c:49). We mirror C 1:1 by calling the unified
     * exper.js exports rather than separate Init variants. */
    const hp = newhp();
    u.uhp = u.uhpmax = u.uhppeak = hp;
    const pw = newpw();
    u.uen = u.uenmax = u.uenpeak = pw;
    u.uspellprot = 0;
    await adjabil(0, 1);
    u.ulevel = u.ulevelmax = 1;
    const uhsBefore = (u.uhs | 0);
    const NOT_HUNGRY = 1;
    const atempStr = (u.acurr && u.acurr.atemp && u.acurr.atemp.a)
        ? ((u.acurr.atemp.a[0] | 0)) : 0;
    g.disp = g.disp || { botl: 0, botlx: 0, time_botl: 0, toplin: 0, inmore: 0 };
    g.disp.botl = (uhsBefore !== NOT_HUNGRY || atempStr < 0) ? 1 : 0;
    u.uhunger = 900;
    u.uhs = NOT_HUNGRY;
    if (atempStr < 0 && u.acurr && u.acurr.atemp && u.acurr.atemp.a) {
        u.acurr.atemp.a[0] = 0;
    }
    /* C ref u_init.c:1005: u.ublesscnt = 300 — "no prayers just yet".
     * Prayer cooldown counter; decremented in moveloop, no RNG involved. */
    u.ublesscnt = 300;
    u.uhandedness = rn2(10) ? RIGHT_HANDED : LEFT_HANDED;
    /* C ref u_init.c:1006 + attrib.c:1099-1100:
     *   u.ualignbase[A_CURRENT] = u.ualignbase[A_ORIGINAL] = u.ualign.type =
     *       aligns[flags.initalign].value;
     *   u.ualign.record = gu.urole.initrecord;
     */
    const alignIdx = (g.flags.initalign ?? 1) | 0;
    const alignVal = (alignIdx >= 0 && alignIdx < ALIGN_VALUE.length)
        ? ALIGN_VALUE[alignIdx] : 0;
    const initRecord = rOk ? ROLE_INITRECORD[initrole] : 0;
    u.ualign = u.ualign || { type: 0, record: 0, abuse: 0 };
    u.ualign.type = alignVal;
    u.ualign.record = initRecord;
    /* C's `struct u_have` is BSS-zero, so u.ualign.abuse starts at 0 and
     * attrib.c:1303 adjalign() can do unsigned arithmetic on it from the first
     * negative adjustment.  This port left the field absent, so adjalign's
     * `newabuse = abuse - n` was `undefined - n` = NaN, `NaN > undefined` was
     * false, and the abuse counter never incremented — which in turn meant
     * adj_erinys() was never called even once. */
    if (u.ualign.abuse == null)
        u.ualign.abuse = 0;
    u.ualignbase = u.ualignbase || [0, 0];
    u.ualignbase[0] = alignVal; /* A_CURRENT */
    u.ualignbase[1] = alignVal; /* A_ORIGINAL */
    // Equipment, spells, skills and AC belong to u_init_skills_discoveries,
    // after inventory creation and the first display (C allmain.c:newgame).
}

/* C u_init.c:870 — compensate for starting without inventory or skills. */
export function pauper_reinit() {
    const u = game.u;
    if (!u.uroleplay?.pauper)
        return;
    for (let skill = 0; skill < P_NUM_SKILLS; skill++) {
        const row = u.weapon_skills[skill];
        if (row.skill > P_UNSKILLED) {
            row.skill = P_UNSKILLED;
            row.advance = 0;
        }
    }
    u.weapon_slots = 2;
    let preknown = STRANGE_OBJECT;
    switch (game.urole.mnum) {
    case PM_HEALER: preknown = SPE_HEALING_OTYP; break;
    case PM_CLERIC:
    case PM_KNIGHT:
    case PM_MONK: preknown = SPE_PROTECTION_OTYP; break;
    case PM_WIZARD: preknown = SPE_FORCE_BOLT; break;
    case PM_ARCHEOLOGIST: preknown = TOUCHSTONE_OTYP; break;
    case PM_CAVEMAN: preknown = FLINT_OTYP; break;
    case PM_ROGUE:
    case PM_TOURIST: preknown = SACK_OTYP; break;
    case PM_SAMURAI: preknown = FOOD_RATION_OTYP; break;
    default: break;
    }
    if (preknown !== STRANGE_OBJECT)
        knows_object(preknown, true);
}

/* C u_init.c:1395 — use the completed inventory, then skills, power and AC.
 * Await shared equipment helpers before moving to the next C statement. */
export async function u_init_skills_discoveries() {
    const u = game.u;
    for (let otmp = game.invent; otmp; otmp = otmp.nobj)
        await ini_inv_use_obj(otmp);
    await skill_init(game.flags.initrole);
    if (u.uroleplay?.pauper)
        pauper_reinit();
    const SPELL_LEV_PW_1 = 5;
    if (num_spells() && u.uenmax < SPELL_LEV_PW_1) {
        u.ueninc ||= [];
        u.uen = u.uenmax = u.uenpeak = u.ueninc[u.ulevel] = SPELL_LEV_PW_1;
    }
    find_ac();
}

/* ── Attribute distribution tables (attrib.c + role.c) ────────────────── */
/**
 * C ref: role.c roles[].attrdist — attribute distribution weights for
 * rnd_attr() (attrib.c:682).  Order: Str, Int, Wis, Dex, Con, Cha.
 * Must sum to 100 per role (C comment: "sum must be 100").
 */
const ROLE_ATTRDIST = [
    /* Arc */ [20, 20, 20, 10, 20, 10],
    /* Bar */ [30, 6, 7, 20, 30, 7],
    /* Cav */ [30, 6, 7, 20, 30, 7],
    /* Hea */ [15, 20, 20, 15, 25, 5],
    /* Kni */ [30, 15, 15, 10, 20, 10],
    /* Mon */ [25, 10, 20, 20, 15, 10],
    /* Pri */ [15, 10, 30, 15, 20, 10],
    /* Rog */ [20, 10, 10, 30, 20, 10],
    /* Ran */ [30, 10, 10, 20, 20, 10],
    /* Sam */ [30, 10, 8, 30, 14, 8],
    /* Tou */ [15, 10, 10, 15, 30, 20],
    /* Val */ [30, 6, 7, 20, 30, 7],
    /* Wiz */ [10, 30, 10, 20, 20, 10],
];
/**
 * C ref: role.c races[].attrmax — maximum attribute by race.
 * STR18 = 18 means human-style 18/xx (max abase = 18), 118 = exceptional str cap (18/100).
 * We store the raw C attrmax values.
 * Order: hum, elf, dwa, gno, orc; attrs: Str, Int, Wis, Dex, Con, Cha.
 */
const RACE_ATTRMAX = [
    /* hum */ [118, 18, 18, 18, 18, 18],
    /* elf */ [18, 20, 20, 18, 16, 18],
    /* dwa */ [118, 16, 16, 20, 20, 16],
    /* gno */ [68, 19, 18, 18, 18, 18],
    /* orc */ [68, 16, 16, 18, 18, 16],
];
/** C ref: role.c races[].attrmin — minimum attributes by race (all 3). */
const RACE_ATTRMIN_VAL = 3;
/** A_STR=0, A_INT=1, A_WIS=2, A_DEX=3, A_CON=4, A_CHA=5; A_MAX=6. */
const A_MAX = 6;
const A_STR = 0;
/**
 * C ref: attrib.c:682 rnd_attr() — return a random attribute index weighted
 * by role's attrdist, consuming rn2(100).
 * Returns A_MAX (6) if rn2 lands beyond the distribution (shouldn't happen
 * if attrdist sums to 100, but mirrors C's loop termination).
 */
function rnd_attr(initrole) {
    let x = rn2(100);
    const dist = (initrole >= 0 && initrole < ROLE_ATTRDIST.length)
        ? ROLE_ATTRDIST[initrole] : null;
    if (!dist)
        return A_MAX;
    for (let i = 0; i < A_MAX; ++i) {
        x -= dist[i];
        if (x < 0)
            return i;
    }
    return A_MAX; /* C: returns i=A_MAX if loop ends; treated as skip in caller */
}
/**
 * C ref: attrib.c:699 init_attr_role_redist(np, addition) — distribute np
 * points across random attributes, respecting attrmin/attrmax.
 * addition=TRUE: add points (stop when np>0 condition fails or tryct>=100).
 * addition=FALSE: remove points.
 * Returns leftover np.
 */
function init_attr_role_redist(abase, np, addition, initrole, initrace) {
    let tryct = 0;
    const adj = addition ? 1 : -1;
    const attrmax = (initrace >= 0 && initrace < RACE_ATTRMAX.length)
        ? RACE_ATTRMAX[initrace] : RACE_ATTRMAX[0];
    const attrmin = RACE_ATTRMIN_VAL;
    while ((addition ? (np > 0) : (np < 0)) && tryct < 100) {
        const i = rnd_attr(initrole);
        if (i >= A_MAX
            || (addition ? (abase[i] >= attrmax[i]) : (abase[i] <= attrmin))) {
            tryct++;
            continue;
        }
        tryct = 0;
        abase[i] += adj;
        np -= adj;
    }
    return np;
}
/**
 * C ref: attrib.c:723 init_attr(75) — set abase/amax from attrbase, then
 * redistribute leftover via rnd_attr RNG.
 * Writes to g.u.acurr.a[] and g.u.amax.a[].
 */
export function init_attr(np) {
    const g = game;
    g.u = g.u || {};
    const u = g.u;
    g.flags = g.flags || {};
    const initrole = (g.flags.initrole ?? -1) | 0;
    const initrace = (g.flags.initrace ?? -1) | 0;
    const rOk = initrole >= 0 && initrole < NUM_ROLES;
    const attrbase = rOk ? ROLE_ATTRBASE[initrole] : [7, 7, 7, 7, 7, 7];
    const abase = new Array(A_MAX);
    for (let i = 0; i < A_MAX; i++) {
        abase[i] = attrbase[i];
        np -= attrbase[i];
    }
    /* distribute leftover */
    np = init_attr_role_redist(abase, np, true, initrole, initrace);
    /* if we went over, remove */
    np = init_attr_role_redist(abase, np, false, initrole, initrace);
    /* Permute C-order [str,int,wis,dex,con,cha] → display order [str,dex,con,int,wis,cha]
     * to match the existing convention in display.js bot() and mapstate.js.
     * display.js: a[0]=St a[1]=Dx a[2]=Co a[3]=In a[4]=Wi a[5]=Ch
     * (A_STR=0 → display[0], A_DEX=3 → display[1], A_CON=4 → display[2],
     *  A_INT=1 → display[3], A_WIS=2 → display[4], A_CHA=5 → display[5]) */
    const disp = [
        abase[0], /* display[0]=St ← C[A_STR=0] */
        abase[3], /* display[1]=Dx ← C[A_DEX=3] */
        abase[4], /* display[2]=Co ← C[A_CON=4] */
        abase[1], /* display[3]=In ← C[A_INT=1] */
        abase[2], /* display[4]=Wi ← C[A_WIS=2] */
        abase[5], /* display[5]=Ch ← C[A_CHA=5] */
    ];
    u.acurr = u.acurr || {};
    u.amax = u.amax || {};
    u.acurr.a = disp.slice();
    u.amax.a = disp.slice();
}
// C attrib.c:764 — preserve shared adjustment effects and C attribute order.
export function vary_init_attr() {
    const u = game.u;
    const cToDisplay = [0, 3, 4, 1, 2, 5];
    for (let i = 0; i < A_MAX; i++) {
        if (!rn2(20)) {
            const xd = rn2(7) - 2;
            adjattrib(i, xd, true);
            const di = cToDisplay[i];
            if (u.acurr.a[di] < u.amax.a[di])
                u.amax.a[di] = u.acurr.a[di];
        }
    }
}

/** C otyp constants derived from nethack-c/include/objects.h sequence. */
/* --- Weapons --- */
const ARROW = 18;
const YA = 22;
const CROSSBOW_BOLT = 23;
const DART = 24;
const SPEAR = 27;
const ELVEN_SPEAR = 28;
const ORCISH_SPEAR = 29;
const DWARVISH_SPEAR = 30;
const DAGGER = 34;
const ELVEN_DAGGER = 35;
const ORCISH_DAGGER = 36;
const SCALPEL = 39;
const AXE = 44;
const BATTLE_AXE = 45;
const SHORT_SWORD = 46;
const ELVEN_SHORT_SWORD = 47;
const ORCISH_SHORT_SWORD = 48;
const DWARVISH_SHORT_SWORD = 49;
const LONG_SWORD = 54;
const TWO_HANDED_SWORD = 55;
const KATANA = 56;
const LANCE = 72;
const MACE = 73;
const CLUB = 77;
const QUARTERSTAFF = 79;
const FLAIL = 81;
const BULLWHIP = 82;
const BOW = 83;
const ELVEN_BOW = 84;
const ORCISH_BOW = 85;
const YUMI = 86;
const SLING = 87;
const CROSSBOW = 88;
/* --- Armor --- */
const ELVEN_LEATHER_HELM = 89;
const ORCISH_HELM = 90;
const DWARVISH_IRON_HELM = 91;
const FEDORA = 92;
const HELMET = 97;
const GRAY_DRAGON_SCALE_MAIL = 101; /* first DSM */
const PLATE_MAIL = 121;
const SPLINT_MAIL_OTYP = 124;
const RING_MAIL_OTYP = 132;
const ORCISH_RING_MAIL = 133;
const LEATHER_ARMOR_OTYP = 134;
const LEATHER_JACKET_OTYP = 135;
const HAWAIIAN_SHIRT_OTYP = 136;
const MUMMY_WRAPPING = 138;
const ELVEN_CLOAK = 139;
const ROBE_OTYP = 143;
const CLOAK_OF_PROTECTION = 146;
const CLOAK_OF_INVISIBILITY = 147;
const CLOAK_OF_MAGIC_RESISTANCE_OTYP = 148;
const CLOAK_OF_DISPLACEMENT_OTYP = 149;
const SMALL_SHIELD_OTYP = 150;
const ORCISH_SHIELD = 155;
const LEATHER_GLOVES_OTYP = 159;
const GAUNTLETS_OF_FUMBLING_OTYP = 160;
const FUMBLE_BOOTS_OTYP = 171;
const LEVITATION_BOOTS_OTYP = 172;
/* --- Tools --- */
const LARGE_BOX = 214;
const CHEST = 215;
const ICE_BOX = 216;
const SACK_OTYP = 217;
const OILSKIN_SACK = 218;
const BAG_OF_HOLDING = 219;
const BAG_OF_TRICKS = 220;
const SKELETON_KEY = 221;
const LOCK_PICK_OTYP = 222;
const CREDIT_CARD_OTYP = 223;
const TALLOW_CANDLE = 224;
const WAX_CANDLE = 225;
const BRASS_LANTERN = 226;
const OIL_LAMP_OTYP = 227;
const MAGIC_LAMP = 228;
const EXPENSIVE_CAMERA_OTYP = 229;
const MIRROR = 230;
const CRYSTAL_BALL = 231;
const LENSES = 232;
const BLINDFOLD_OTYP = 233;
const TOWEL_OTYP = 234;
const SADDLE = 235;
const LEASH_OTYP = 236;
const STETHOSCOPE_OTYP = 237;
const TINNING_KIT_OTYP = 238;
const TIN_OPENER_OTYP = 239;
const CAN_OF_GREASE = 240;
const FIGURINE = 241;
const MAGIC_MARKER_OTYP = 242;
const LAND_MINE = 243;
const BEARTRAP = 244;
const TIN_WHISTLE = 245;
const MAGIC_WHISTLE = 246;
const WOODEN_FLUTE = 247;
const MAGIC_FLUTE = 248;
const TOOLED_HORN = 249;
const FROST_HORN = 250;
const FIRE_HORN = 251;
const HORN_OF_PLENTY = 252;
const WOODEN_HARP = 253;
const MAGIC_HARP = 254;
const BELL = 255;
const BUGLE = 256;
const LEATHER_DRUM = 257;
const DRUM_OF_EARTHQUAKE = 258;
const PICK_AXE_OTYP = 259;
const GRAPPLING_HOOK = 260;
const UNICORN_HORN = 261;
const CANDELABRUM_OF_INVOCATION = 262;
const BELL_OF_OPENING = 263;
/* --- Food --- */
const TRIPE_RATION = 264;
const CORPSE = 265;
const EGG = 266;
const MEAT_RING = 270;
const KELP_FROND = 275;
const EUCALYPTUS_LEAF = 276;
const APPLE = 277;
const ORANGE = 278;
const CARROT = 282;
const SPRIG_OF_WOLFSBANE_OTYP = 283;
const CLOVE_OF_GARLIC_OTYP = 284;
const SLIME_MOLD = 285;
const CANDY_BAR = 288;
const FORTUNE_COOKIE_OTYP = 289;
const PANCAKE = 290;
const LEMBAS_WAFER = 291;
const CRAM_RATION = 292;
const FOOD_RATION_OTYP = 293;
const K_RATION = 294;
const C_RATION = 295;
const TIN = 296;
/* --- Potions --- */
const POT_HEALING_OTYP = 307;
const POT_EXTRA_HEALING_OTYP = 308;
const POT_FULL_HEALING = 315;
const POT_POLYMORPH = 316;
const POT_SICKNESS_OTYP = 318;
const POT_OIL = 321;
const POT_WATER_OTYP = 322;
/* Potions filtered by ini_inv_mkobj_filter (u_init.c:1137-1138) */
const POT_HALLUCINATION = 304; /* MKOBJ_SVB_BASES[POTION_CLASS=8]=297, offset 7 */
const POT_ACID = 320; /* offset 23 */
/* --- Scrolls --- */
const SCR_ENCHANT_ARMOR = 323;
const SCR_ENCHANT_WEAPON = 328; /* offset 5 from scroll base 323 — confirmed by mkobj.js */
const SCR_MAGIC_MAPPING_OTYP = 337;
const SCR_AMNESIA = 338; /* offset 15 from scroll base 323 */
const SCR_FIRE = 339; /* offset 16 from scroll base 323 */
const SCR_BLANK_PAPER = 365;
/* --- Spellbooks --- */
const SPE_HEALING_OTYP = 374;
const SPE_FORCE_BOLT = 376;
const SPE_EXTRA_HEALING_OTYP = 391;
const SPE_POLYMORPH = 399; /* MKOBJ_SVB_BASES[SPBOOK_CLASS=10]=366, offset 33 */
const SPE_STONE_TO_FLESH_OTYP = 405;
const SPE_BLANK_PAPER = 407;
const SPE_NOVEL = 408;
/* --- Wands --- */
const WAN_LIGHT = 410;
const WAN_WISHING = 414;
const WAN_NOTHING = 416; /* MKOBJ_SVB_BASES[WAND_CLASS=11]=410, offset 6 */
const WAN_POLYMORPH = 422; /* offset 12 */
const WAN_STASIS = 415;
const WAN_LIGHTNING = 434;
const WAN_SLEEP_OTYP = 432;
/* --- Rings filtered by ini_inv_mkobj_filter (u_init.c:1135,1143-1148) --- */
/* MKOBJ_SVB_BASES[RING_CLASS=4]=173; indices counted from objects.h RING() order */
/* oc_charged rings (spec=1 in objects.h RING macro): 173-178 inclusive.
 * These are: adornment(173), gain_str(174), gain_con(175), inc_acc(176),
 *            inc_dmg(177), protection(178). All others (179+) have oc_charged=0. */
const RIN_BASE = 173; /* MKOBJ_SVB_BASES[RING_CLASS] */
const RIN_LAST_CHARGED = 178; /* protection — last ring with oc_charged=1 */
const RIN_LEVITATION = 183; /* offset 10 */
const RIN_HUNGER = 184; /* offset 11 */
const RIN_AGGRAVATE_MONSTER = 185; /* offset 12 */
const RIN_POISON_RESISTANCE = 188; /* offset 15 */
const RIN_POLYMORPH = 196; /* offset 23 */
const RIN_POLYMORPH_CONTROL = 197; /* offset 24 */
/* SPE_POLYMORPH RNG guard */
const SPE_POLYMORPH_SPE = 399; /* same as SPE_POLYMORPH — alias for nocreate clarity */
/* STRANGE_OBJECT (objects.h:80): otyp=0, used as "nothing banned" sentinel */
const STRANGE_OBJECT = 0;
/* --- Gems --- */
const LUCKSTONE = 470;
const LOADSTONE = 471;
const TOUCHSTONE_OTYP = 472;
const FLINT_OTYP = 473;
const ROCK_OTYP = 474;
/* --- Coin --- */
const GOLD_PIECE_OTYP = 438;
/** Oclass constants matching mklev.js */
const WEAPON_CLASS_C = 2;
const ARMOR_CLASS_C = 3;
const RING_CLASS_C = 4;
const AMULET_CLASS_C = 5;
const TOOL_CLASS_C = 6;
const FOOD_CLASS_C = 7;
const POTION_CLASS_C = 8;
const SCROLL_CLASS_C = 9;
const SPBOOK_CLASS_C = 10;
const WAND_CLASS_C = 11;
const COIN_CLASS_C = 12;
const GEM_CLASS_C = 13;
/** UNDEF values from u_init.c macros */
const UNDEF_TYP = 0; /* u_init.c UNDEF_TYP */
const UNDEF_SPE = 127; /* u_init.c UNDEF_SPE */
const UNDEF_BLESS = 2; /* u_init.c UNDEF_BLESS */
/**
 * C ref: u_init.c:1106-1111 trquan() — compute quantity from trobj min/max.
 * trquan_min==0 means quantity 1.
 * Otherwise: trquan_min + rn2(trquan_max - trquan_min + 1).
 */
function trquan(trquan_min, trquan_max) {
    if (!trquan_min)
        return 1;
    return trquan_min + rn2(trquan_max - trquan_min + 1);
}
const SPBOOK_FIRST_OTYP_C = 366;
const SPBOOK_OC_LEVEL_C = new Uint8Array([
    /* 366 SPE_DIG            */ 5,
    /* 367 SPE_MAGIC_MISSILE  */ 2,
    /* 368 SPE_FIREBALL       */ 4,
    /* 369 SPE_CONE_OF_COLD   */ 4,
    /* 370 SPE_SLEEP          */ 3,
    /* 371 SPE_FINGER_OF_DEATH*/ 7,
    /* 372 SPE_LIGHT          */ 1,
    /* 373 SPE_DETECT_MONSTERS*/ 1,
    /* 374 SPE_HEALING        */ 1,
    /* 375 SPE_KNOCK          */ 1,
    /* 376 SPE_FORCE_BOLT     */ 1,
    /* 377 SPE_CONFUSE_MONSTER*/ 1,
    /* 378 SPE_CURE_BLINDNESS */ 2,
    /* 379 SPE_DRAIN_LIFE     */ 2,
    /* 380 SPE_SLOW_MONSTER   */ 2,
    /* 381 SPE_WIZARD_LOCK    */ 2,
    /* 382 SPE_CREATE_MONSTER */ 2,
    /* 383 SPE_DETECT_FOOD    */ 2,
    /* 384 SPE_CAUSE_FEAR     */ 3,
    /* 385 SPE_CLAIRVOYANCE   */ 3,
    /* 386 SPE_CURE_SICKNESS  */ 3,
    /* 387 SPE_CHARM_MONSTER  */ 5,
    /* 388 SPE_HASTE_SELF     */ 3,
    /* 389 SPE_DETECT_UNSEEN  */ 3,
    /* 390 SPE_LEVITATION     */ 4,
    /* 391 SPE_EXTRA_HEALING  */ 3,
    /* 392 SPE_RESTORE_ABILITY*/ 4,
    /* 393 SPE_INVISIBILITY   */ 4,
    /* 394 SPE_DETECT_TREASURE*/ 4,
    /* 395 SPE_REMOVE_CURSE   */ 3,
    /* 396 SPE_MAGIC_MAPPING  */ 5,
    /* 397 SPE_IDENTIFY       */ 3,
    /* 398 SPE_TURN_UNDEAD    */ 6,
    /* 399 SPE_POLYMORPH      */ 6,
    /* 400 SPE_TELEPORT_AWAY  */ 6,
    /* 401 SPE_CREATE_FAMILIAR*/ 6,
    /* 402 SPE_CANCELLATION   */ 7,
    /* 403 SPE_PROTECTION     */ 1,
    /* 404 SPE_JUMPING        */ 1,
    /* 405 SPE_STONE_TO_FLESH */ 3,
    /* 406 SPE_CHAIN_LIGHTNING*/ 2,
    /* 407 SPE_BLANK_PAPER    */ 0,
]);
/** Return objects[otyp].oc_level for a spellbook (0 if out of range). */
function spbook_oc_level_c(otyp) {
    const idx = otyp - SPBOOK_FIRST_OTYP_C;
    if (idx < 0 || idx >= SPBOOK_OC_LEVEL_C.length)
        return 0;
    return SPBOOK_OC_LEVEL_C[idx];
}

// C u_init.c:1094 — consult the live role's actual skill table.
function restricted_spell_discipline(otyp) {
    const skill = spell_skilltype(otyp);
    for (const [entry] of skills_for_role())
        if (entry === skill) return false;
    return true;
}

const _INV_SUBS = {
    1 /*ELF*/: { 34: 35 /*DAGGER→ELVEN_DAGGER*/, 27: 28 /*SPEAR→ELVEN_SPEAR*/,
        46: 47 /*SHORT_SWORD→ELVEN_SHORT_SWORD*/, 83: 84 /*BOW→ELVEN_BOW*/,
        18: 19 /*ARROW→ELVEN_ARROW*/, 97: 89 /*HELMET→ELVEN_LEATHER_HELM*/,
        149: 139 /*CLOAK_OF_DISPLACEMENT→ELVEN_CLOAK*/,
        292: 291 /*CRAM_RATION→LEMBAS_WAFER*/ },
    4 /*ORC*/: { 34: 36, 27: 29, 46: 48, 83: 85, 18: 20, 97: 90, 150: 155,
        132: 133, /*RING_MAIL→ORCISH_RING_MAIL*/
        128: 129, /*CHAIN_MAIL→ORCISH_CHAIN_MAIL (not in starter kits)*/
        292: 264 /*CRAM_RATION→TRIPE_RATION*/, 291: 264 /*LEMBAS→TRIPE*/ },
    2 /*DWARF*/: { 27: 30, 46: 49, 97: 91, 291: 292 /*LEMBAS→CRAM*/ },
    3 /*GNOME*/: { 83: 88 /*BOW→CROSSBOW*/, 18: 23 /*ARROW→CROSSBOW_BOLT*/ },
};

/* C ref: obj.h:245 is_missile(otmp) —
 *   (oclass == WEAPON_CLASS || oclass == TOOL_CLASS)
 *   && oc_skill >= -P_BOOMERANG && oc_skill <= -P_DART
 * P_DART=23, P_BOOMERANG=25 (skills.h), so oc_skill ∈ [-25,-23] = {dart,shuriken,boomerang}. */
function _is_missile_obj(obj) {
    const oclass = obj.oclass | 0;
    if (oclass !== WEAPON_CLASS_C && oclass !== TOOL_CLASS_C)
        return false;
    const skill = MKOBJ_OC_SKILL[obj.otyp | 0] | 0;
    return skill >= -25 /* -P_BOOMERANG */ && skill <= -23 /* -P_DART */;
}

/* C ref: obj.h:249 is_weptool(o) — TOOL_CLASS && objects[otyp].oc_skill != P_NONE.
 * P_NONE == 0 (skills.h).  pick-axe/dwarvish mattock/unicorn horn/grappling hook
 * are the weptools; tinning kit/sack/etc. have oc_skill 0 and are not. */
function _is_weptool_obj(oclass, otyp) {
    return (oclass | 0) === TOOL_CLASS_C && (MKOBJ_OC_SKILL[otyp | 0] | 0) !== 0;
}

/* C u_init.c:1254 — discover, equip and learn from one actual inventory node. */
export async function ini_inv_use_obj(obj) {
    const u = game.u;
    if (OC_DESCR[obj.otyp] && obj.known)
        discover_object(obj.otyp, true, true, false);
    if (obj.otyp === OIL_LAMP_OTYP)
        discover_object(POT_OIL, true, true, false);
    if (obj.oclass === ARMOR_CLASS_C) {
        if (is_shield(obj) && !u.uarms && !(u.uwep && bimanual(u.uwep))) {
            set_twoweap(false);
            await setworn(obj, W_ARMS);
        } else if (is_helmet(obj) && !u.uarmh)
            await setworn(obj, W_ARMH);
        else if (is_gloves(obj) && !u.uarmg)
            await setworn(obj, W_ARMG);
        else if (is_shirt(obj) && !u.uarmu)
            await setworn(obj, W_ARMU);
        else if (is_cloak(obj) && !u.uarmc)
            await setworn(obj, W_ARMC);
        else if (is_boots(obj) && !u.uarmf)
            await setworn(obj, W_ARMF);
        else if (is_suit(obj) && !u.uarm)
            await setworn(obj, W_ARM);
    }
    if (obj.oclass === WEAPON_CLASS_C || _is_weptool_obj(obj.oclass, obj.otyp)
        || obj.otyp === TIN_OPENER_OTYP || obj.otyp === FLINT_OTYP || obj.otyp === ROCK_OTYP) {
        if (is_ammo(obj) || _is_missile_obj(obj)) {
            if (!u.uquiver)
                await setuqwep(obj);
        } else if (!u.uwep && (!u.uarms || !bimanual(obj))) {
            await setuwep(obj);
        } else if (!u.uswapwep) {
            await setuswapwep(obj);
        }
    }
    if (obj.oclass === SPBOOK_CLASS_C && obj.otyp !== SPE_BLANK_PAPER)
        await initialspell(obj);
}
/*
 * Trobj tables — one per role.
 * Fields: { otyp, spe, oclass, qmin, qmax, bless }
 * UNDEF_TYP = 0, UNDEF_SPE = 127, UNDEF_BLESS = 2 (C's sentinels).
 * Sentinel: { otyp:0, spe:0, oclass:0, qmin:0, qmax:0, bless:0 }
 */
/** C ref: u_init.c:42-53 Archeologist[] */
const TROBJ_ARC = [
    { otyp: BULLWHIP, spe: 2, oclass: WEAPON_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: LEATHER_JACKET_OTYP, spe: 0, oclass: ARMOR_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: FEDORA, spe: 0, oclass: ARMOR_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: FOOD_RATION_OTYP, spe: 0, oclass: FOOD_CLASS_C, qmin: 3, qmax: 3, bless: 0 },
    { otyp: PICK_AXE_OTYP, spe: UNDEF_SPE, oclass: TOOL_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: TINNING_KIT_OTYP, spe: UNDEF_SPE, oclass: TOOL_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: TOUCHSTONE_OTYP, spe: 0, oclass: GEM_CLASS_C, qmin: 1, qmax: 1, bless: 0 },
    { otyp: SACK_OTYP, spe: 0, oclass: TOOL_CLASS_C, qmin: 1, qmax: 1, bless: 0 },
    { otyp: 0, spe: 0, oclass: 0, qmin: 0, qmax: 0, bless: 0 },
];
/** C ref: u_init.c:54-59 Barbarian_0[] */
const TROBJ_BAR0 = [
    { otyp: TWO_HANDED_SWORD, spe: 0, oclass: WEAPON_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: AXE, spe: 0, oclass: WEAPON_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: RING_MAIL_OTYP, spe: 0, oclass: ARMOR_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: FOOD_RATION_OTYP, spe: 0, oclass: FOOD_CLASS_C, qmin: 1, qmax: 1, bless: 0 },
    { otyp: 0, spe: 0, oclass: 0, qmin: 0, qmax: 0, bless: 0 },
];
/** C ref: u_init.c:61-66 Barbarian_1[] */
const TROBJ_BAR1 = [
    { otyp: BATTLE_AXE, spe: 0, oclass: WEAPON_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: SHORT_SWORD, spe: 0, oclass: WEAPON_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: RING_MAIL_OTYP, spe: 0, oclass: ARMOR_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: FOOD_RATION_OTYP, spe: 0, oclass: FOOD_CLASS_C, qmin: 1, qmax: 1, bless: 0 },
    { otyp: 0, spe: 0, oclass: 0, qmin: 0, qmax: 0, bless: 0 },
];
/** C ref: u_init.c:68-74 Cave_man[] */
const TROBJ_CAV = [
    { otyp: CLUB, spe: 1, oclass: WEAPON_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: SLING, spe: 2, oclass: WEAPON_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: FLINT_OTYP, spe: 0, oclass: GEM_CLASS_C, qmin: 10, qmax: 20, bless: UNDEF_BLESS },
    { otyp: ROCK_OTYP, spe: 0, oclass: GEM_CLASS_C, qmin: 3, qmax: 3, bless: 0 },
    { otyp: LEATHER_ARMOR_OTYP, spe: 0, oclass: ARMOR_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: 0, spe: 0, oclass: 0, qmin: 0, qmax: 0, bless: 0 },
];
/** C ref: u_init.c:76-88 Healer[] */
const TROBJ_HEA = [
    { otyp: SCALPEL, spe: 0, oclass: WEAPON_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: LEATHER_GLOVES_OTYP, spe: 1, oclass: ARMOR_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: STETHOSCOPE_OTYP, spe: 0, oclass: TOOL_CLASS_C, qmin: 1, qmax: 1, bless: 0 },
    { otyp: POT_HEALING_OTYP, spe: 0, oclass: POTION_CLASS_C, qmin: 4, qmax: 4, bless: UNDEF_BLESS },
    { otyp: POT_EXTRA_HEALING_OTYP, spe: 0, oclass: POTION_CLASS_C, qmin: 4, qmax: 4, bless: UNDEF_BLESS },
    { otyp: WAN_SLEEP_OTYP, spe: UNDEF_SPE, oclass: WAND_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: SPE_HEALING_OTYP, spe: 0, oclass: SPBOOK_CLASS_C, qmin: 1, qmax: 1, bless: 1 },
    { otyp: SPE_EXTRA_HEALING_OTYP, spe: 0, oclass: SPBOOK_CLASS_C, qmin: 1, qmax: 1, bless: 1 },
    { otyp: SPE_STONE_TO_FLESH_OTYP, spe: 0, oclass: SPBOOK_CLASS_C, qmin: 1, qmax: 1, bless: 1 },
    { otyp: APPLE, spe: 0, oclass: FOOD_CLASS_C, qmin: 5, qmax: 5, bless: 0 },
    { otyp: 0, spe: 0, oclass: 0, qmin: 0, qmax: 0, bless: 0 },
];
/** C ref: u_init.c:90-99 Knight[] */
const TROBJ_KNI = [
    { otyp: LONG_SWORD, spe: 1, oclass: WEAPON_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: LANCE, spe: 1, oclass: WEAPON_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: RING_MAIL_OTYP, spe: 1, oclass: ARMOR_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: HELMET, spe: 0, oclass: ARMOR_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: SMALL_SHIELD_OTYP, spe: 0, oclass: ARMOR_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: LEATHER_GLOVES_OTYP, spe: 0, oclass: ARMOR_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: APPLE, spe: 0, oclass: FOOD_CLASS_C, qmin: 10, qmax: 10, bless: 0 },
    { otyp: CARROT, spe: 0, oclass: FOOD_CLASS_C, qmin: 10, qmax: 10, bless: 0 },
    { otyp: 0, spe: 0, oclass: 0, qmin: 0, qmax: 0, bless: 0 },
];
/** C ref: u_init.c:101-112 Monk[] */
const TROBJ_MON = [
    { otyp: LEATHER_GLOVES_OTYP, spe: 2, oclass: ARMOR_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: ROBE_OTYP, spe: 1, oclass: ARMOR_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: UNDEF_TYP, spe: UNDEF_SPE, oclass: SCROLL_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: POT_HEALING_OTYP, spe: 0, oclass: POTION_CLASS_C, qmin: 3, qmax: 3, bless: UNDEF_BLESS },
    { otyp: FOOD_RATION_OTYP, spe: 0, oclass: FOOD_CLASS_C, qmin: 3, qmax: 3, bless: 0 },
    { otyp: APPLE, spe: 0, oclass: FOOD_CLASS_C, qmin: 5, qmax: 5, bless: UNDEF_BLESS },
    { otyp: ORANGE, spe: 0, oclass: FOOD_CLASS_C, qmin: 5, qmax: 5, bless: UNDEF_BLESS },
    { otyp: FORTUNE_COOKIE_OTYP, spe: 0, oclass: FOOD_CLASS_C, qmin: 3, qmax: 3, bless: UNDEF_BLESS },
    { otyp: 0, spe: 0, oclass: 0, qmin: 0, qmax: 0, bless: 0 },
];
/** C ref: u_init.c:114-122 Priest[] */
const TROBJ_PRI = [
    { otyp: MACE, spe: 1, oclass: WEAPON_CLASS_C, qmin: 1, qmax: 1, bless: 1 },
    { otyp: ROBE_OTYP, spe: 0, oclass: ARMOR_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: SMALL_SHIELD_OTYP, spe: 0, oclass: ARMOR_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: POT_WATER_OTYP, spe: 0, oclass: POTION_CLASS_C, qmin: 4, qmax: 4, bless: 1 },
    { otyp: CLOVE_OF_GARLIC_OTYP, spe: 0, oclass: FOOD_CLASS_C, qmin: 1, qmax: 1, bless: 0 },
    { otyp: SPRIG_OF_WOLFSBANE_OTYP, spe: 0, oclass: FOOD_CLASS_C, qmin: 1, qmax: 1, bless: 0 },
    { otyp: UNDEF_TYP, spe: UNDEF_SPE, oclass: SPBOOK_CLASS_C, qmin: 2, qmax: 2, bless: UNDEF_BLESS },
    { otyp: 0, spe: 0, oclass: 0, qmin: 0, qmax: 0, bless: 0 },
];
/** C ref: u_init.c:124-131 Ranger[] */
const TROBJ_RAN = [
    { otyp: DAGGER, spe: 1, oclass: WEAPON_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: BOW, spe: 1, oclass: WEAPON_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: ARROW, spe: 2, oclass: WEAPON_CLASS_C, qmin: 50, qmax: 59, bless: UNDEF_BLESS },
    { otyp: ARROW, spe: 0, oclass: WEAPON_CLASS_C, qmin: 30, qmax: 39, bless: UNDEF_BLESS },
    { otyp: CLOAK_OF_DISPLACEMENT_OTYP, spe: 2, oclass: ARMOR_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: CRAM_RATION, spe: 0, oclass: FOOD_CLASS_C, qmin: 4, qmax: 4, bless: 0 },
    { otyp: 0, spe: 0, oclass: 0, qmin: 0, qmax: 0, bless: 0 },
];
/** C ref: u_init.c:133-140 Rogue[] */
const TROBJ_ROG = [
    { otyp: SHORT_SWORD, spe: 0, oclass: WEAPON_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: DAGGER, spe: 0, oclass: WEAPON_CLASS_C, qmin: 6, qmax: 15, bless: 0 },
    { otyp: LEATHER_ARMOR_OTYP, spe: 1, oclass: ARMOR_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: POT_SICKNESS_OTYP, spe: 0, oclass: POTION_CLASS_C, qmin: 1, qmax: 1, bless: 0 },
    { otyp: LOCK_PICK_OTYP, spe: 0, oclass: TOOL_CLASS_C, qmin: 1, qmax: 1, bless: 0 },
    { otyp: SACK_OTYP, spe: 0, oclass: TOOL_CLASS_C, qmin: 1, qmax: 1, bless: 0 },
    { otyp: 0, spe: 0, oclass: 0, qmin: 0, qmax: 0, bless: 0 },
];
/** C ref: u_init.c:142-148 Samurai[] */
const TROBJ_SAM = [
    { otyp: KATANA, spe: 0, oclass: WEAPON_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: SHORT_SWORD, spe: 0, oclass: WEAPON_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: YUMI, spe: 0, oclass: WEAPON_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: YA, spe: 0, oclass: WEAPON_CLASS_C, qmin: 26, qmax: 45, bless: UNDEF_BLESS },
    { otyp: SPLINT_MAIL_OTYP, spe: 0, oclass: ARMOR_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: 0, spe: 0, oclass: 0, qmin: 0, qmax: 0, bless: 0 },
];
/** C ref: u_init.c:150-158 Tourist[] */
const TROBJ_TOU = [
    { otyp: DART, spe: 2, oclass: WEAPON_CLASS_C, qmin: 21, qmax: 40, bless: UNDEF_BLESS },
    { otyp: UNDEF_TYP, spe: UNDEF_SPE, oclass: FOOD_CLASS_C, qmin: 10, qmax: 10, bless: 0 },
    { otyp: POT_EXTRA_HEALING_OTYP, spe: 0, oclass: POTION_CLASS_C, qmin: 2, qmax: 2, bless: UNDEF_BLESS },
    { otyp: SCR_MAGIC_MAPPING_OTYP, spe: 0, oclass: SCROLL_CLASS_C, qmin: 4, qmax: 4, bless: UNDEF_BLESS },
    { otyp: HAWAIIAN_SHIRT_OTYP, spe: 0, oclass: ARMOR_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: EXPENSIVE_CAMERA_OTYP, spe: UNDEF_SPE, oclass: TOOL_CLASS_C, qmin: 1, qmax: 1, bless: 0 },
    { otyp: CREDIT_CARD_OTYP, spe: 0, oclass: TOOL_CLASS_C, qmin: 1, qmax: 1, bless: 0 },
    { otyp: 0, spe: 0, oclass: 0, qmin: 0, qmax: 0, bless: 0 },
];
/** C ref: u_init.c:160-165 Valkyrie[] */
const TROBJ_VAL = [
    { otyp: SPEAR, spe: 1, oclass: WEAPON_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: DAGGER, spe: 0, oclass: WEAPON_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: SMALL_SHIELD_OTYP, spe: 3, oclass: ARMOR_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: FOOD_RATION_OTYP, spe: 0, oclass: FOOD_CLASS_C, qmin: 1, qmax: 1, bless: 0 },
    { otyp: 0, spe: 0, oclass: 0, qmin: 0, qmax: 0, bless: 0 },
];
/** C ref: u_init.c:167-177 Wizard[] */
const TROBJ_WIZ = [
    { otyp: QUARTERSTAFF, spe: 1, oclass: WEAPON_CLASS_C, qmin: 1, qmax: 1, bless: 1 },
    { otyp: CLOAK_OF_MAGIC_RESISTANCE_OTYP, spe: 0, oclass: ARMOR_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: UNDEF_TYP, spe: UNDEF_SPE, oclass: WAND_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: UNDEF_TYP, spe: UNDEF_SPE, oclass: RING_CLASS_C, qmin: 2, qmax: 2, bless: UNDEF_BLESS },
    { otyp: UNDEF_TYP, spe: UNDEF_SPE, oclass: POTION_CLASS_C, qmin: 3, qmax: 3, bless: UNDEF_BLESS },
    { otyp: UNDEF_TYP, spe: UNDEF_SPE, oclass: SCROLL_CLASS_C, qmin: 3, qmax: 3, bless: UNDEF_BLESS },
    { otyp: SPE_FORCE_BOLT, spe: 0, oclass: SPBOOK_CLASS_C, qmin: 1, qmax: 1, bless: 1 },
    { otyp: UNDEF_TYP, spe: UNDEF_SPE, oclass: SPBOOK_CLASS_C, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: MAGIC_MARKER_OTYP, spe: 19, oclass: TOOL_CLASS_C, qmin: 1, qmax: 1, bless: 0 },
    { otyp: 0, spe: 0, oclass: 0, qmin: 0, qmax: 0, bless: 0 },
];
/** Extra item tables (for optional role extras). */
const TROBJ_TINOPENER = [
    { otyp: TIN_OPENER_OTYP, spe: 0, oclass: TOOL_CLASS_C, qmin: 1, qmax: 1, bless: 0 },
    { otyp: 0, spe: 0, oclass: 0, qmin: 0, qmax: 0, bless: 0 },
];
const TROBJ_LAMP = [
    { otyp: OIL_LAMP_OTYP, spe: 1, oclass: TOOL_CLASS_C, qmin: 1, qmax: 1, bless: 0 },
    { otyp: 0, spe: 0, oclass: 0, qmin: 0, qmax: 0, bless: 0 },
];
const TROBJ_MAGICMARKER = [
    { otyp: MAGIC_MARKER_OTYP, spe: 19, oclass: TOOL_CLASS_C, qmin: 1, qmax: 1, bless: 0 },
    { otyp: 0, spe: 0, oclass: 0, qmin: 0, qmax: 0, bless: 0 },
];
const TROBJ_BLINDFOLD = [
    { otyp: BLINDFOLD_OTYP, spe: 0, oclass: TOOL_CLASS_C, qmin: 1, qmax: 1, bless: 0 },
    { otyp: 0, spe: 0, oclass: 0, qmin: 0, qmax: 0, bless: 0 },
];
const TROBJ_LEASH = [
    { otyp: LEASH_OTYP, spe: 0, oclass: TOOL_CLASS_C, qmin: 1, qmax: 1, bless: 0 },
    { otyp: 0, spe: 0, oclass: 0, qmin: 0, qmax: 0, bless: 0 },
];
const TROBJ_TOWEL = [
    { otyp: TOWEL_OTYP, spe: 0, oclass: TOOL_CLASS_C, qmin: 1, qmax: 1, bless: 0 },
    { otyp: 0, spe: 0, oclass: 0, qmin: 0, qmax: 0, bless: 0 },
];
const TROBJ_HEALING_BOOK = [
    { otyp: SPE_HEALING_OTYP, spe: UNDEF_SPE, oclass: SPBOOK_CLASS_C, qmin: 1, qmax: 1, bless: 1 },
    { otyp: 0, spe: 0, oclass: 0, qmin: 0, qmax: 0, bless: 0 },
];
/* C ref: u_init.c:186-196 Protection_book[] / Confuse_monster_book[] — the two
 * other arms of the Monk's M_spell[] pick.  Same shape as Healing_book, so the
 * RNG is identical (mksobj's SPBOOK arm is spestudied=0 + blessorcurse(17)
 * whatever the otyp) — but the ITEM is not, and the inventory line, the
 * spellbook the hero can cast from, and every later namer all read the otyp. */
const SPE_PROTECTION_OTYP = 403;       /* js/spell.js:74 */
const SPE_CONFUSE_MONSTER_OTYP = 377;  /* js/spell.js:65 */
const TROBJ_PROTECTION_BOOK = [
    { otyp: SPE_PROTECTION_OTYP, spe: UNDEF_SPE, oclass: SPBOOK_CLASS_C, qmin: 1, qmax: 1, bless: 1 },
    { otyp: 0, spe: 0, oclass: 0, qmin: 0, qmax: 0, bless: 0 },
];
const TROBJ_CONFUSE_MONSTER_BOOK = [
    { otyp: SPE_CONFUSE_MONSTER_OTYP, spe: UNDEF_SPE, oclass: SPBOOK_CLASS_C, qmin: 1, qmax: 1, bless: 1 },
    { otyp: 0, spe: 0, oclass: 0, qmin: 0, qmax: 0, bless: 0 },
];
const TROBJ_XTRA_FOOD = [
    { otyp: UNDEF_TYP, spe: UNDEF_SPE, oclass: FOOD_CLASS_C, qmin: 2, qmax: 2, bless: 0 },
    { otyp: 0, spe: 0, oclass: 0, qmin: 0, qmax: 0, bless: 0 },
];
/** C ref: u_init.c:214-215 Wishing[] — given in explore (discover) mode.
 *  { WAN_WISHING, 3, WAND_CLASS, 1, 1, 0 } */
const TROBJ_WISHING = [
    { otyp: WAN_WISHING, spe: 3, oclass: WAND_CLASS_C, qmin: 1, qmax: 1, bless: 0 },
    { otyp: 0, spe: 0, oclass: 0, qmin: 0, qmax: 0, bless: 0 },
];
/* ── u_init_race RNG (elven instrument) ───────────────────────────────── */
/* C ref: u_init.c:791-871 u_init_race().
 * For PM_ELF + (ROLE_CLERIC or ROLE_WIZARD): ini_inv(Instrument[random pick]).
 * Instrument trobj: { ROLL_FROM(trotyp), 0, TOOL_CLASS, 1, 1, 0 }
 * where ROLL_FROM picks a random entry at ini_inv time (otyp already fixed).
 * For our purposes: the 6 instruments (WOODEN_FLUTE=247, TOOLED_HORN=249,
 * WOODEN_HARP=253, BELL=255, BUGLE=256, LEATHER_DRUM=257) are selected by
 * a compile-time ROLL_FROM, which picks one. In C ini_inv(), the otyp is
 * already resolved (ROLL_FROM is a compile-time constant), so mksobj is
 * called directly. We use a sentinel UNDEF_TYP for TOOL_CLASS since
 * ROLL_FROM is complex; however since all 6 instruments are plain tools
 * with identical RNG structure, any one of them would produce the same
 * RNG trace (just rnd(2)+rn1(70,30) from TOOL_CLASS). Actually ROLL_FROM
 * uses WOODEN_FLUTE as otyp (first element of trotyp[] array). */
const PM_ELF_RACE = 1;
const PM_ORC_RACE = 4;
const PM_DWARF_RACE = 2;
const PM_GNOME_RACE = 3;


/* skills.h P_* — the oc_skill values the knows_class() weapon filters test. */
const _P_NONE = 0, _P_DAGGER = 1, _P_POLEARMS = 16, _P_SPEAR = 17,
    _P_LANCE = 19, _P_BOW = 20, _P_CROSSBOW = 22;
/* objclass.h oclass values used by the knows_class() filters. */
const _WEAPON_CLASS = 2, _TOOL_CLASS = 6, _GEM_CLASS = 13;
/* objects.h otyps referenced verbatim by u_init.c's knows_* calls.  Values are
 * the C onames enum (JS otyp numbering is identical — MKOBJ_OC_CLASS matches
 * the preprocessed objects[] oc_class column slot for slot). */
const _KO_CORNUTHAUM = 93, _KO_DUNCE_CAP = 94, _KO_SMALL_SHIELD = 150;
const _KO_SACK = 217, _KO_TOUCHSTONE = 472, _KO_POT_FULL_HEALING = 315,
    _KO_SHURIKEN = 25, _KO_POT_WATER = 322;
/* objclass.h MAXOCLASSES — objects[] slots below this are the per-class
 * GENERIC placeholders, which u_init.c's Samurai loop starts past. */
const MAXOCLASSES = 18;
/* objnam.c:105-120 Japanese_items[] — the otyps for which
 * Japanese_item_name(i, NULL) returns non-NULL. */
const _JAPANESE_ITEM_OTYPS = new Set([
    46,  /* SHORT_SWORD    "wakizashi" */
    52,  /* BROADSWORD     "ninja-to" */
    81,  /* FLAIL          "nunchaku" */
    62,  /* GLAIVE         "naginata" */
    222, /* LOCK_PICK      "osaku" */
    253, /* WOODEN_HARP    "koto" */
    254, /* MAGIC_HARP     "magic koto" (oc_magic → skipped by the C loop) */
    40,  /* KNIFE          "shito" */
    121, /* PLATE_MAIL     "tanko" */
    97,  /* HELMET         "kabuto" */
    159, /* LEATHER_GLOVES "yugake" */
    293, /* FOOD_RATION    "gunyoki" */
    317, /* POT_BOOZE      "sake" */
]);
/* u_init.c:815-826 — "Elves can recognize all elvish objects" (in C order). */
const _ELF_KNOWN_OTYPS = [
    /* ELVEN_SHORT_SWORD */ 47,
    /* ELVEN_ARROW */ 19,
    /* ELVEN_BOW */ 84,
    /* ELVEN_SPEAR */ 28,
    /* ELVEN_DAGGER */ 35,
    /* ELVEN_BROADSWORD */ 53,
    /* ELVEN_MITHRIL_COAT */ 127,
    /* ELVEN_LEATHER_HELM */ 89,
    /* ELVEN_SHIELD */ 153,
    /* ELVEN_BOOTS */ 169,
    /* ELVEN_CLOAK */ 139,
];
/* u_init.c:830-837 — "Dwarves can recognize all dwarvish objects". */
const _DWARF_KNOWN_OTYPS = [
    /* DWARVISH_SPEAR */ 30,
    /* DWARVISH_SHORT_SWORD */ 49,
    /* DWARVISH_MATTOCK */ 71,
    /* DWARVISH_IRON_HELM */ 91,
    /* DWARVISH_MITHRIL_COAT */ 126,
    /* DWARVISH_CLOAK */ 141,
    /* DWARVISH_ROUNDSHIELD */ 157,
];
/* u_init.c:848-859 — "Orcs can recognize all orcish objects". */
const _ORC_KNOWN_OTYPS = [
    /* ORCISH_SHORT_SWORD */ 48,
    /* ORCISH_ARROW */ 20,
    /* ORCISH_BOW */ 85,
    /* ORCISH_SPEAR */ 29,
    /* ORCISH_DAGGER */ 36,
    /* ORCISH_CHAIN_MAIL */ 129,
    /* ORCISH_RING_MAIL */ 133,
    /* ORCISH_HELM */ 90,
    /* ORCISH_SHIELD */ 155,
    /* URUK_HAI_SHIELD */ 154,
    /* ORCISH_CLOAK */ 140,
];
/* C ref: u_init.c:574 knows_object(int obj, boolean override_pauper) */
function knows_object(otyp, override_pauper) {
    if (game.u?.uroleplay?.pauper && !override_pauper)
        return;
    /* mark as known, but not yet encountered */
    discover_object(otyp, true, false, false);
}
/* C ref: u_init.c:586 knows_class(char sym) — "know ordinary (non-magical)
 * objects of a certain class".  The odummy walked by the C macros is modelled
 * as (oclass=sym, otyp=ct) so is_pole/is_launcher/is_ammo/is_spear reduce to
 * their oc_skill tests (obj.h:228-243).  is_pole()'s is_art(ART_SNICKERSNEE)
 * disjunct is dead here: odummy has oartifact == 0. */
function knows_class(sym, initrole) {
    if (game.u?.uroleplay?.pauper)
        return;
    const first = MKOBJ_SVB_BASES[sym] | 0;
    const last = MKOBJ_SVB_BASES[sym + 1] | 0;
    for (let ct = first; ct < last; ct++) {
        /* not flagged as magic but shouldn't be pre-discovered */
        if (ct === _KO_CORNUTHAUM || ct === _KO_DUNCE_CAP
            || ct === _KO_SMALL_SHIELD)
            continue;
        if (sym === _WEAPON_CLASS) {
            const skill = MKOBJ_OC_SKILL[ct] | 0;
            /* is_pole(o): (WEAPON||TOOL) && skill in [P_POLEARMS, P_LANCE] */
            const isPole = (sym === _WEAPON_CLASS || sym === _TOOL_CLASS)
                && (skill === _P_POLEARMS || skill === _P_LANCE);
            /* arbitrary: only knights and samurai recognize polearms */
            if (initrole !== ROLE_KNIGHT && initrole !== ROLE_SAMURAI && isPole)
                continue;
            /* rangers know all launchers, ammo and spears regardless of
             * race/species, but not other weapons */
            if (initrole === ROLE_RANGER) {
                const isLauncher = sym === _WEAPON_CLASS
                    && skill >= _P_BOW && skill <= _P_CROSSBOW;
                const isAmmo = (sym === _WEAPON_CLASS || sym === _GEM_CLASS)
                    && skill >= -_P_CROSSBOW && skill <= -_P_BOW;
                const isSpear = sym === _WEAPON_CLASS && skill === _P_SPEAR;
                if (!isLauncher && !isAmmo && !isSpear)
                    continue;
            }
            /* rogues know daggers, regardless of racial variations */
            if (initrole === ROLE_ROGUE && skill !== _P_DAGGER)
                continue;
        }
        if ((MKOBJ_OC_CLASS[ct] | 0) === sym && !(MKOBJ_OC_MAGIC[ct] | 0))
            knows_object(ct, false);
    }
}


// C u_init.c:1118 — retain and dispose the actual objects from mkobj.
async function ini_inv_mkobj_filter(oclass, got_level1_spellbook) {
    let obj = await mkobj(oclass, false);
    let otyp = obj.otyp, trycnt = 0;
    const gn = game.gn;
    while (otyp === WAN_WISHING || otyp === gn.nocreate
        || otyp === gn.nocreate2 || otyp === gn.nocreate3
        || otyp === gn.nocreate4 || otyp === RIN_LEVITATION
        || otyp === POT_HALLUCINATION || otyp === POT_ACID
        || otyp === SCR_AMNESIA || otyp === SCR_FIRE
        || otyp === SCR_BLANK_PAPER || otyp === SPE_BLANK_PAPER
        || otyp === RIN_AGGRAVATE_MONSTER || otyp === RIN_HUNGER
        || otyp === WAN_NOTHING
        || (otyp === RIN_POISON_RESISTANCE && game.urace.mnum === PM_ORC)
        || (otyp === SCR_ENCHANT_WEAPON && game.urole.mnum === PM_MONK)
        || (otyp === SPE_FORCE_BOLT && game.urole.mnum === PM_WIZARD)
        || (obj.oclass === SPBOOK_CLASS_C
            && (spbook_oc_level_c(otyp) > (got_level1_spellbook ? 3 : 1)
                || restricted_spell_discipline(otyp)))
        || otyp === SPE_NOVEL) {
        await dealloc_obj(obj);
        if (++trycnt > 1000) {
            obj = (await mksobj(PANCAKE, true, false));
            break;
        }
        obj = (await mkobj(oclass, false));
        otyp = obj.otyp;
    }
    return obj;
}

// C u_init.c:1182 — only the original object's type is substituted.
function ini_inv_obj_substitution(trop, obj) {
    const race = [PM_HUMAN, PM_ELF, PM_DWARF, PM_GNOME, PM_ORC].indexOf(game.urace.mnum);
    const replacement = _INV_SUBS[race]?.[obj.otyp];
    if (replacement !== undefined)
        obj.otyp = replacement;
    return obj.otyp;
}

// C u_init.c:1208 — adjustment and RNG act on the same object.
function ini_inv_adjust_obj(trop, obj) {
    let stop = false;
    if (trop.oclass === COIN_CLASS_C) {
        obj.quan = game.u.umoney0;
    } else {
        if (OC_USES_KNOWN[obj.otyp]) obj.known = 1;
        obj.dknown = obj.bknown = obj.rknown = 1;
        if ((obj.otyp >= LARGE_BOX && obj.otyp <= BAG_OF_TRICKS) || obj.otyp === STATUE) {
            obj.cknown = obj.lknown = 1;
            obj.otrapped = 0;
        }
        obj.cursed = 0;
        // opoisoned and otrapped name the same C bit. Existing JS creation
        // exposes both spellings; writes here must keep that alias coherent.
        if ((obj.opoisoned ?? obj.otrapped) && game.u.ualign.type !== A_CHAOTIC)
            obj.opoisoned = obj.otrapped = 0;
        if (obj.oclass === WEAPON_CLASS_C || obj.oclass === TOOL_CLASS_C) {
            obj.quan = trquan(trop.qmin, trop.qmax);
            stop = true;
        } else if (obj.oclass === GEM_CLASS_C && obj.otyp >= LUCKSTONE
            && obj.otyp <= FLINT_OTYP && obj.otyp !== FLINT_OTYP) {
            obj.quan = 1;
        }
        if (trop.spe !== UNDEF_SPE) {
            obj.spe = trop.spe;
            if (trop.otyp === MAGIC_MARKER_OTYP && obj.spe < 96)
                obj.spe += rn2(4);
        } else if (MKOBJ_OC_CLASS[obj.otyp] === RING_CLASS_C
            && OC_CHARGED[obj.otyp] && obj.spe <= 0) {
            obj.spe = rne(3);
        }
        if (trop.bless !== UNDEF_BLESS) obj.blessed = trop.bless;
    }
    obj.owt = weight(obj);
    return stop;
}

// C u_init.c:1301 — shared addinv returns the survivor after an actual merge.
export async function ini_inv(trobj) {
    if (game.u.uroleplay.pauper) return;
    const gn = game.gn;
    let got_sp1 = false, index = 0;
    let quan = trquan(trobj[0].qmin, trobj[0].qmax);
    while (trobj[index].oclass) {
        const trop = trobj[index];
        let obj, otyp = trop.otyp;
        if (otyp !== UNDEF_TYP) {
            obj = (await mksobj(otyp, true, false));
        } else {
            obj = (await ini_inv_mkobj_filter(trop.oclass, got_sp1));
            otyp = obj.otyp;
            switch (otyp) {
            case WAN_POLYMORPH: case RIN_POLYMORPH: case POT_POLYMORPH:
                gn.nocreate = RIN_POLYMORPH_CONTROL;
                break;
            case RIN_POLYMORPH_CONTROL:
                gn.nocreate = RIN_POLYMORPH;
                gn.nocreate2 = SPE_POLYMORPH_SPE;
                gn.nocreate3 = POT_POLYMORPH;
                break;
            }
            if (obj.oclass === RING_CLASS_C || obj.oclass === SPBOOK_CLASS_C)
                gn.nocreate4 = otyp;
        }
        ini_inv_obj_substitution(trop, obj);
        if (game.u.uroleplay.nudist && obj.oclass === ARMOR_CLASS_C) {
            await dealloc_obj(obj);
            index++;
            continue;
        }
        if (ini_inv_adjust_obj(trop, obj)) quan = 1;
        obj = await addinv(obj);
        if (obj.oclass === SPBOOK_CLASS_C && spbook_oc_level_c(obj.otyp) === 1)
            got_sp1 = true;
        if (--quan) continue;
        index++;
        quan = trquan(trobj[index].qmin, trobj[index].qmax);
    }
}

// C u_init.c:637 — role knowledge and money belong inside the role phase.
export async function u_init_role() {
    game.moves = 1;
    const role = INITROLE_TO_PM.indexOf(game.urole.mnum);
    switch (game.urole.mnum) {
    case PM_ARCHEOLOGIST:
        await ini_inv(TROBJ_ARC);
        if (!rn2(10)) await ini_inv(TROBJ_TINOPENER);
        else if (!rn2(4)) await ini_inv(TROBJ_LAMP);
        else if (!rn2(5)) await ini_inv(TROBJ_MAGICMARKER);
        knows_object(SACK_OTYP, false); knows_object(TOUCHSTONE_OTYP, false);
        break;
    case PM_BARBARIAN:
        await ini_inv(rn2(100) >= 50 ? TROBJ_BAR0 : TROBJ_BAR1);
        if (!rn2(6)) await ini_inv(TROBJ_LAMP);
        knows_class(WEAPON_CLASS_C, role); knows_class(ARMOR_CLASS_C, role);
        break;
    case PM_CAVEMAN:
        await ini_inv(TROBJ_CAV);
        break;
    case PM_HEALER:
        game.u.umoney0 = rn2(1000) + 1001;
        await ini_inv(TROBJ_HEA);
        if (!rn2(25)) await ini_inv(TROBJ_LAMP);
        knows_object(_KO_POT_FULL_HEALING, false);
        break;
    case PM_KNIGHT:
        await ini_inv(TROBJ_KNI);
        knows_class(WEAPON_CLASS_C, role); knows_class(ARMOR_CLASS_C, role);
        game.u.uprops[JUMPING].intrinsic |= FROMOUTSIDE;
        break;
    case PM_MONK: {
        const M_spell = [TROBJ_HEALING_BOOK, TROBJ_PROTECTION_BOOK, TROBJ_CONFUSE_MONSTER_BOOK];
        await ini_inv(TROBJ_MON);
        await ini_inv(M_spell[Math.trunc(rn2(90) / 30)]);
        if (!rn2(4)) await ini_inv(TROBJ_MAGICMARKER);
        else if (!rn2(10)) await ini_inv(TROBJ_LAMP);
        knows_class(ARMOR_CLASS_C, role); knows_object(_KO_SHURIKEN, false);
        break;
    }
    case PM_CLERIC:
        await ini_inv(TROBJ_PRI);
        if (!rn2(5)) await ini_inv(TROBJ_MAGICMARKER);
        else if (!rn2(10)) await ini_inv(TROBJ_LAMP);
        knows_object(_KO_POT_WATER, true);
        break;
    case PM_RANGER:
        await ini_inv(TROBJ_RAN); knows_class(WEAPON_CLASS_C, role);
        break;
    case PM_ROGUE:
        game.u.umoney0 = 0;
        await ini_inv(TROBJ_ROG);
        if (!rn2(5)) await ini_inv(TROBJ_BLINDFOLD);
        knows_object(SACK_OTYP, false); knows_class(WEAPON_CLASS_C, role);
        break;
    case PM_SAMURAI:
        await ini_inv(TROBJ_SAM);
        if (!rn2(5)) await ini_inv(TROBJ_BLINDFOLD);
        knows_class(WEAPON_CLASS_C, role); knows_class(ARMOR_CLASS_C, role);
        for (let i = MAXOCLASSES; i < MKOBJ_OC_CLASS.length; i++) {
            if (MKOBJ_OC_MAGIC[i]) continue;
            if (Japanese_item_name(i, null)) knows_object(i, false);
        }
        break;
    case PM_TOURIST:
        game.u.umoney0 = rnd(1000);
        await ini_inv(TROBJ_TOU);
        if (!rn2(25)) await ini_inv(TROBJ_TINOPENER);
        else if (!rn2(25)) await ini_inv(TROBJ_LEASH);
        else if (!rn2(25)) await ini_inv(TROBJ_TOWEL);
        else if (!rn2(20)) await ini_inv(TROBJ_MAGICMARKER);
        break;
    case PM_VALKYRIE:
        await ini_inv(TROBJ_VAL);
        if (!rn2(6)) await ini_inv(TROBJ_LAMP);
        knows_class(WEAPON_CLASS_C, role); knows_class(ARMOR_CLASS_C, role);
        break;
    case PM_WIZARD:
        await ini_inv(TROBJ_WIZ);
        if (!rn2(5)) await ini_inv(TROBJ_BLINDFOLD);
        break;
    }
    game.gn.nocreate = game.gn.nocreate2 = game.gn.nocreate3 = game.gn.nocreate4 = STRANGE_OBJECT;
}

// C u_init.c:792 — race-specific objects and ordered recognition.
export async function u_init_race() {
    switch (game.urace.mnum) {
    case PM_ELF:
        if (game.urole.mnum === PM_CLERIC || game.urole.mnum === PM_WIZARD) {
            const types = [WOODEN_FLUTE, TOOLED_HORN, WOODEN_HARP, BELL, BUGLE, LEATHER_DRUM];
            await ini_inv([{otyp:types[rn2(types.length)],spe:0,oclass:TOOL_CLASS_C,qmin:1,qmax:1,bless:0},
                {otyp:0,spe:0,oclass:0,qmin:0,qmax:0,bless:0}]);
        }
        for (const type of _ELF_KNOWN_OTYPS) knows_object(type, false);
        break;
    case PM_DWARF:
        for (const type of _DWARF_KNOWN_OTYPS) knows_object(type, false);
        break;
    case PM_ORC:
        if (game.urole.mnum !== PM_WIZARD) await ini_inv(TROBJ_XTRA_FOOD);
        for (const type of _ORC_KNOWN_OTYPS) knows_object(type, false);
        break;
    }
}

// C u_init.c:929 — use the shared live-inventory capacity and attribute paths.
export function u_init_carry_attr_boost() {
    while (inv_weight() > 0) {
        if (adjattrib(A_STR, 1, true)) continue;
        if (adjattrib(A_CON, 1, true)) continue;
        break;
    }
}

// C u_init.c:1373 — repeatable, actual inventory/attribute initialization.
export async function u_init_inventory_attrs() {
    game._lastinvnr = 51;
    while (game.invent) await useupall(game.invent);
    game.u.umoney0 = 0;
    await u_init_role();
    await u_init_race();
    if (game.flags.explore) await ini_inv(TROBJ_WISHING);
    if (game.u.umoney0) await ini_inv([
        {otyp:GOLD_PIECE_OTYP,spe:0,oclass:COIN_CLASS_C,qmin:1,qmax:1,bless:0},
        {otyp:0,spe:0,oclass:0,qmin:0,qmax:0,bless:0},
    ]);
    game.u.umoney0 += hidden_gold(true);
    init_attr(75);
    vary_init_attr();
    u_init_carry_attr_boost();
}
/* Suppress unused-variable warnings for otyp constants not referenced elsewhere */
void (ARROW, YA, CROSSBOW_BOLT, ELVEN_SPEAR, ORCISH_SPEAR, DWARVISH_SPEAR,
    ELVEN_DAGGER, ORCISH_DAGGER, SCALPEL, AXE, BATTLE_AXE, ELVEN_SHORT_SWORD,
    ORCISH_SHORT_SWORD, DWARVISH_SHORT_SWORD, LONG_SWORD, TWO_HANDED_SWORD,
    LANCE, MACE, CLUB, QUARTERSTAFF, FLAIL, BULLWHIP, BOW, ELVEN_BOW, ORCISH_BOW,
    YUMI, SLING, CROSSBOW, ELVEN_LEATHER_HELM, ORCISH_HELM, DWARVISH_IRON_HELM,
    FEDORA, HELMET, GRAY_DRAGON_SCALE_MAIL, PLATE_MAIL, ORCISH_RING_MAIL,
    MUMMY_WRAPPING, ELVEN_CLOAK, CLOAK_OF_PROTECTION, CLOAK_OF_INVISIBILITY,
    ORCISH_SHIELD, GAUNTLETS_OF_FUMBLING_OTYP, FUMBLE_BOOTS_OTYP,
    LEVITATION_BOOTS_OTYP, LARGE_BOX, CHEST, ICE_BOX, OILSKIN_SACK, BAG_OF_HOLDING,
    BAG_OF_TRICKS, SKELETON_KEY, TALLOW_CANDLE, WAX_CANDLE, BRASS_LANTERN,
    MAGIC_LAMP, MIRROR, CRYSTAL_BALL, LENSES, SADDLE, CAN_OF_GREASE, FIGURINE,
    LAND_MINE, BEARTRAP, TIN_WHISTLE, MAGIC_WHISTLE, MAGIC_FLUTE, TOOLED_HORN,
    FROST_HORN, FIRE_HORN, HORN_OF_PLENTY, WOODEN_HARP, MAGIC_HARP, BELL, BUGLE,
    LEATHER_DRUM, DRUM_OF_EARTHQUAKE, GRAPPLING_HOOK, UNICORN_HORN,
    CANDELABRUM_OF_INVOCATION, BELL_OF_OPENING, TRIPE_RATION, CORPSE, EGG,
    MEAT_RING, KELP_FROND, EUCALYPTUS_LEAF, ORANGE, SLIME_MOLD, CANDY_BAR,
    PANCAKE, LEMBAS_WAFER, K_RATION, C_RATION, TIN, POT_HEALING_OTYP, POT_FULL_HEALING,
    POT_POLYMORPH, POT_OIL, SCR_ENCHANT_ARMOR, SCR_BLANK_PAPER, SPE_HEALING_OTYP,
    SPE_EXTRA_HEALING_OTYP, SPE_STONE_TO_FLESH_OTYP, SPE_BLANK_PAPER, SPE_NOVEL,
    WAN_LIGHT, WAN_WISHING, WAN_STASIS, WAN_LIGHTNING, LUCKSTONE, LOADSTONE,
    FLINT_OTYP, ROCK_OTYP, A_STR, SPLINT_MAIL_OTYP, RING_MAIL_OTYP,
    LEATHER_ARMOR_OTYP, LEATHER_JACKET_OTYP, HAWAIIAN_SHIRT_OTYP, ROBE_OTYP,
    CLOAK_OF_MAGIC_RESISTANCE_OTYP, CLOAK_OF_DISPLACEMENT_OTYP, SMALL_SHIELD_OTYP,
    LEATHER_GLOVES_OTYP, SACK_OTYP, LOCK_PICK_OTYP, CREDIT_CARD_OTYP,
    EXPENSIVE_CAMERA_OTYP, BLINDFOLD_OTYP, TOWEL_OTYP, LEASH_OTYP,
    STETHOSCOPE_OTYP, TINNING_KIT_OTYP, TIN_OPENER_OTYP, MAGIC_MARKER_OTYP,
    OIL_LAMP_OTYP, PICK_AXE_OTYP, TOUCHSTONE_OTYP, POT_EXTRA_HEALING_OTYP,
    POT_SICKNESS_OTYP, POT_WATER_OTYP, SCR_MAGIC_MAPPING_OTYP, SPE_FORCE_BOLT,
    WAN_SLEEP_OTYP, GOLD_PIECE_OTYP, FORTUNE_COOKIE_OTYP, SPRIG_OF_WOLFSBANE_OTYP,
    CLOVE_OF_GARLIC_OTYP, APPLE, CARROT, KATANA, SHORT_SWORD, SPEAR, DAGGER,
    DART, RING_MAIL_OTYP, PM_ELF_RACE, PM_ORC_RACE, PM_DWARF_RACE, PM_GNOME_RACE,
    WOODEN_FLUTE, UNDEF_BLESS, UNDEF_SPE, UNDEF_TYP,
    /* ini_inv_mkobj_filter constants */
    POT_HALLUCINATION, POT_ACID, SCR_ENCHANT_WEAPON, SCR_AMNESIA, SCR_FIRE,
    SPE_POLYMORPH, SPE_POLYMORPH_SPE, WAN_NOTHING, WAN_POLYMORPH,
    RIN_LEVITATION, RIN_HUNGER, RIN_AGGRAVATE_MONSTER, RIN_POISON_RESISTANCE,
    RIN_POLYMORPH, RIN_POLYMORPH_CONTROL, STRANGE_OBJECT);
