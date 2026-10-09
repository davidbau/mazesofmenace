// @ts-nocheck
// attrib.js — Attribute exercise and abuse tracking.
// C ref: nethack-c/src/attrib.c — exercise(), exerper(), exerchk().
// @ts-nocheck — js sibling imports.
import { rn2, rn1, rnd, pushRngLogEntry } from './rng.js';
import { game } from './gstate.js';
import { SATIATED, NOT_HUNGRY, HUNGRY, WEAK, FAINTING, FAINTED, MOD_ENCUMBER, HVY_ENCUMBER, EXT_ENCUMBER, Upolyd,
    FIRE_RES, COLD_RES, SLEEP_RES, SHOCK_RES, POISON_RES, SEE_INVIS, WARNING, SEARCHING, INFRAVISION,
    STEALTH, TELEPORT_CONTROL, FAST, FROMEXPER, FROMRACE, FROMOUTSIDE, INTRINSIC,
    LUCKMIN, LUCKMAX, STR19, STR18,
    /* exerper() status-check properties — C attrib.c:570-583 */
    CLAIRVOYANT, REGENERATION, SICK, VOMITING, CONFUSION, HALLUC, HALLUC_RES,
    FUMBLING, WOUNDED_LEGS, STUNNED, TIMEOUT, KILLED_BY, FIXED_ABIL } from './const.js';
import { pline, see_monsters, flush_pending_messages } from './display.js';
import { near_capacity, encumber_msg, encumber_msg_sync } from './weight.js';
import { aligns } from './roles.js';
import { uasmon_maxStr } from './polyself.js';
import { permonstTemplate } from './makemon.js';
import { losehp } from './dokick.js';
import { add_weapon_skill, lose_weapon_skill } from './uhitm.js';
/* The shared mons[] / mattk[] tables, imported the same way js/dochug.js,
 * js/m_initweap.js, js/do_wear.js and js/fastforward.js already import them —
 * adj_erinys() below mutates rows in place, which is exactly what C's
 * `mons[PM_ERINYS]` writes do. */
import monsPackAt from './makemon_mons.json' with { type: 'json' };
import monMattkPackAt from './makemon_mattk.json' with { type: 'json' };
import monPmnamesPackAt from './makemon_pmnames.json' with { type: 'json' };
import { ENV } from './hostenv.js';
/* C attrib.h:
 *   A_STR=0, A_INT=1, A_WIS=2, A_DEX=3, A_CON=4, A_CHA=5, A_MAX=6
 */
const A_STR = 0;
const A_INT = 1;
const A_WIS = 2;
const A_DEX = 3;
const A_CON = 4;
const A_CHA = 5;
const A_MAX = 6;
/* u.acurr.a[] and u.amax.a[] are stored in DISPLAY order by init_attr()
 * in u_init.js: [St=0, Dx=1, Co=2, In=3, Wi=4, Ch=5].  Every function
 * that accesses those arrays via a C constant (A_STR=0 … A_CHA=5) must
 * translate the index first.  Mirror of C_ATTR_TO_DISP in spell.js and
 * the inverse of DISPLAY_TO_C in u_init.js:
 *   C[0]=STR → disp[0], C[1]=INT → disp[3], C[2]=WIS → disp[4],
 *   C[3]=DEX → disp[1], C[4]=CON → disp[2], C[5]=CHA → disp[5]. */
export const C_ATTR_TO_DISP = [0, 3, 4, 1, 2, 5];
/* C attrib.c:486 */
const AVAL = 50;
/* C hacklib.c:714 — sgn(n): -1, 0, or 1 */
function sgn(n) {
    return (n < 0) ? -1 : (n !== 0 ? 1 : 0);
}
/* C hack.c:4349 near_capacity() — now the real STR/CON+inventory-weight
 * computation, imported from weight.js (shared faithful impl). */
/* C attrib.h AEXE(x) = u.aexe.a[x] — exercise accumulator accessor.
 * Ensures aexe array exists on first use (BSS-zero in C). */
function getAexe(u) {
    if (!u.aexe)
        u.aexe = { a: [0, 0, 0, 0, 0, 0] };
    if (!u.aexe.a)
        u.aexe.a = [0, 0, 0, 0, 0, 0];
    return u.aexe.a;
}
/* C attrib.h ABASE(x) = u.acurr.a[x] — base attribute value.
 * Shared with init_attr in u_init.js. (exported for polyself.js polymon STR-set) */
export function getAbase(u) {
    if (!u.acurr)
        u.acurr = { a: [0, 0, 0, 0, 0, 0] };
    if (!u.acurr.a)
        u.acurr.a = [0, 0, 0, 0, 0, 0];
    return u.acurr.a;
}
/* C attrib.h AMAX(x) = u.amax.a[x] — max attribute value. (exported for polyself.js) */
export function getAmax(u) {
    if (!u.amax)
        u.amax = { a: [0, 0, 0, 0, 0, 0] };
    if (!u.amax.a)
        u.amax.a = [0, 0, 0, 0, 0, 0];
    return u.amax.a;
}
/* C attrib.h ABON(x) = u.abon.a[x] — attribute bonus. */
function getAbon(u) {
    if (!u.abon)
        u.abon = { a: [0, 0, 0, 0, 0, 0] };
    if (!u.abon.a)
        u.abon.a = [0, 0, 0, 0, 0, 0];
    return u.abon.a;
}
/* C attrib.h ATEMP(x) = u.atemp.a[x] — temporary attribute delta. */
function getAtemp(u) {
    if (!u.atemp)
        u.atemp = { a: [0, 0, 0, 0, 0, 0] };
    if (!u.atemp.a)
        u.atemp.a = [0, 0, 0, 0, 0, 0];
    return u.atemp.a;
}
export function acurr(u, i) {
    const di = C_ATTR_TO_DISP[i] ?? i; /* C constant → display index */
    const abase = getAbase(u);
    const abon = getAbon(u);
    const atemp = getAtemp(u);
    const tmp = (abon[di] | 0) + (atemp[di] | 0) + (abase[di] | 0);
    /* C attrib.c:1206: per-attribute special cases; A_STR uses encoded 3..125. */
    if (i === A_STR) {
        /* gauntlets of power (otyp 161) force STR19(25)=125; also cap at 125. */
        if (tmp >= STR19(25) || (u.uarmg && u.uarmg.otyp === 161))
            return STR19(25);
        return Math.max(tmp, 3);
    }
    /* C attrib.c:1228-1231: a worn dunce cap pins Int/Wis at 6. */
    /* C attrib.c:1222-1224: nymphs and the amorous demon (incubus/succubus)
     * form count as Cha 18 when the base is lower. */
    if (i === A_CHA && tmp < 18
        && ((game.youmonst?.data?.mlet | 0) === 14 /* S_NYMPH */
            || (u.umonnum | 0) === 290 /* PM_AMOROUS_DEMON */))
        return 18;
    if ((i === A_INT || i === A_WIS) && u.uarmh && (u.uarmh.otyp | 0) === 94)
        return 6;
    if (tmp >= 25)
        return 25;
    if (tmp <= 3)
        return 3;
    return tmp;
}
/* C attrib.h ATTRMAX(x) = gu.urace.attrmax[x] (ordinary non-polymorph case).
 * Race attrmax table: index 0=human 1=elf 2=dwarf 3=gnome 4=orc; attrs Str-Cha.
 * The x==A_STR && Upolyd branch (uasmon_maxStr()) is handled at redist_attr's
 * own call site below — this shared helper's other callers (adjattrib,
 * exerchk) are unaffected. */
const RACE_ATTRMAX = [
    /* hum */ [118, 18, 18, 18, 18, 18],
    /* elf */ [18, 20, 20, 18, 16, 18],
    /* dwa */ [118, 16, 16, 20, 20, 16],
    /* gno */ [68, 19, 18, 18, 18, 18],
    /* orc */ [68, 16, 16, 18, 18, 16],
];
const RACE_ATTRMIN = 3; /* C attrib.h ATTRMIN(x) = gu.urace.attrmin[x] (all 3) */
export function attrmax(u, i) {
    const ir = (game.flags?.initrace ?? -1) | 0;
    const row = (ir >= 0 && ir < RACE_ATTRMAX.length) ? RACE_ATTRMAX[ir] : RACE_ATTRMAX[0];
    return row[i];
}
export function redist_attr() {
    const u = game.u;
    const abase = getAbase(u);
    const amax = getAmax(u);
    const mndx = game.u.umonnum | 0;
    const ptr = permonstTemplate(mndx);
    for (let i = 0; i < A_MAX; i++) {
        if (i === A_INT || i === A_WIS)
            continue;
        const di = C_ATTR_TO_DISP[i];
        const tmp = amax[di];
        amax[di] += (rn2(5) - 2);
        const hi = (i === A_STR) ? uasmon_maxStr(mndx, ptr) : attrmax(u, i);
        if (amax[di] > hi)
            amax[di] = hi;
        if (amax[di] < RACE_ATTRMIN)
            amax[di] = RACE_ATTRMIN;
        abase[di] = Math.trunc(abase[di] * amax[di] / tmp);
        if (abase[di] < RACE_ATTRMIN)
            abase[di] = RACE_ATTRMIN;
    }
}
/** C roles[] hpadv in role.c order (NUM_ROLES entries: Arc..Wiz).
 * Mirror of ROLE_HPADV in js/exper.js — duplicated locally to keep newhp's
 * home module (attrib.js) free of a circular import back through exper.js
 * (which imports adjattrib/adjabil from here). */
const ROLE_HPADV = [
    { infix: 11, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
    { infix: 14, inrnd: 0, lofix: 0, lornd: 10, hifix: 2, hirnd: 0 },
    { infix: 14, inrnd: 0, lofix: 0, lornd: 8, hifix: 2, hirnd: 0 },
    { infix: 11, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
    { infix: 14, inrnd: 0, lofix: 0, lornd: 8, hifix: 2, hirnd: 0 },
    { infix: 12, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
    { infix: 12, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
    { infix: 10, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
    { infix: 13, inrnd: 0, lofix: 0, lornd: 6, hifix: 1, hirnd: 0 },
    { infix: 13, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
    { infix: 8, inrnd: 0, lofix: 0, lornd: 8, hifix: 0, hirnd: 0 },
    { infix: 14, inrnd: 0, lofix: 0, lornd: 8, hifix: 2, hirnd: 0 },
    { infix: 10, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
];
/** C races[] hpadv (human, elf, dwarf, gnome, orc). */
const RACE_HPADV = [
    { infix: 2, inrnd: 0, lofix: 0, lornd: 2, hifix: 1, hirnd: 0 },
    { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 1, hirnd: 0 },
    { infix: 4, inrnd: 0, lofix: 0, lornd: 3, hifix: 2, hirnd: 0 },
    { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 0 },
    { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 0 },
];
/* C you.h struct Role.xlev — cutoff experience level per role; below xlev
 * newhp uses lornd/lofix, at or above it uses hirnd/hifix.
 * Role order is C roles[] order (role.c): Arc Bar Cav Hea Kni Mon Pri ROG RAN
 * Sam Tou Val Wiz — Rogue is index 7 and Ranger index 8, NOT alphabetical. */
const ROLE_XLEV = [14, 10, 10, 20, 10, 10, 10, 11, 12, 11, 14, 10, 12];
/* C role.c roles[].initrecord — initial u.ualign.record per role (Arc..Wiz).
 * Mirror of ROLE_INITRECORD in js/exper.js / js/makemon.js. */
const ROLE_INITRECORD = [
    10, // 0 Arc
    10, // 1 Bar
    0, // 2 Cav
    10, // 3 Hea
    10, // 4 Kni
    10, // 5 Mon
    0, // 6 Pri
    10, // 7 Ran
    10, // 8 Rog
    10, // 9 Sam
    0, // 10 Tou
    0, // 11 Val
    0, // 12 Wiz
];
const NEWHP_MAXULEV = 30; /* C global.h MAXULEV */
/* C attrib.c:1085 newhp(void) — role/race hit-point advancement, called at
 * hero init (u.ulevel==0) and on every level gain (u.ulevel>0). Role/race
 * data is looked up by flags.initrole/initrace, mirroring the gu.urole /
 * gu.urace struct reads (this codebase keeps role/race advancement tables
 * as static arrays indexed by the init role/race, not live struct fields). */
export function newhp() {
    const g = game;
    const u = g.u;
    const initrole = (g.flags?.initrole ?? -1) | 0;
    const initrace = (g.flags?.initrace ?? -1) | 0;
    const rh = (initrole >= 0 && initrole < ROLE_HPADV.length) ? ROLE_HPADV[initrole] : null;
    const rr = (initrace >= 0 && initrace < RACE_HPADV.length) ? RACE_HPADV[initrace] : null;
    let hp, conplus;
    if ((u.ulevel | 0) === 0) {
        /* C attrib.c:1090-1101: Initialize hit points. */
        hp = ((rh ? rh.infix : 0) | 0) + ((rr ? rr.infix : 0) | 0);
        if (rh && rh.inrnd > 0)
            hp += rnd(rh.inrnd);
        if (rr && rr.inrnd > 0)
            hp += rnd(rr.inrnd);
        if ((g.moves | 0) === 0) {
            /* C attrib.c:1097-1100: Initialize alignment stuff. */
            const ia = (g.flags?.initalign ?? 0) | 0;
            u.ualign.type = aligns[ia] ? aligns[ia].value : 0;
            u.ualign.record = (initrole >= 0 && initrole < ROLE_INITRECORD.length) ? ROLE_INITRECORD[initrole] : 0;
        }
        /* no Con adjustment for initial hit points */
    } else {
        const xlev = (initrole >= 0 && initrole < ROLE_XLEV.length) ? ROLE_XLEV[initrole] : 14;
        if ((u.ulevel | 0) < xlev) {
            hp = ((rh ? rh.lofix : 0) | 0) + ((rr ? rr.lofix : 0) | 0);
            if (rh && rh.lornd > 0)
                hp += rnd(rh.lornd);
            if (rr && rr.lornd > 0)
                hp += rnd(rr.lornd);
        } else {
            hp = ((rh ? rh.hifix : 0) | 0) + ((rr ? rr.hifix : 0) | 0);
            if (rh && rh.hirnd > 0)
                hp += rnd(rh.hirnd);
            if (rr && rr.hirnd > 0)
                hp += rnd(rr.hirnd);
        }
        const con = acurr(u, A_CON);
        if (con <= 3)        conplus = -2;
        else if (con <= 6)   conplus = -1;
        else if (con <= 14)  conplus = 0;
        else if (con <= 16)  conplus = 1;
        else if (con === 17) conplus = 2;
        else if (con === 18) conplus = 3;
        else                 conplus = 4;
        hp += conplus;
    }
    if (hp <= 0)
        hp = 1;
    if ((u.ulevel | 0) < NEWHP_MAXULEV) {
        /* C attrib.c:1140-1141: remember increment; future level drain could
         * take it away again. */
        if (!u.uhpinc)
            u.uhpinc = new Array(NEWHP_MAXULEV).fill(0);
        u.uhpinc[u.ulevel | 0] = hp;
    } else {
        /* C attrib.c:1143-1147: after level 30, throttle hit point gains
         * from extra experience; once max reaches 1200, further increments
         * will be just 1 more. */
        let lim = 5 - Math.trunc((u.uhpmax | 0) / 300);
        lim = Math.max(lim, 1);
        if (hp > lim)
            hp = lim;
    }
    return hp;
}
/* C attrib.c:117 adjattrib(ndx, incr, msgflg=-1) — adjust base attribute.
 * msgflg=-1 means "conditional message" (only print if changed).
 * For RNG purposes: fires rn2(ATTRMIN - ABASE + 1) only when ABASE drops
 * below ATTRMIN after decrement.  All other branches produce no RNG.
 * Returns TRUE if the attribute actually changed (ACURR changed).
 * NOTE: ndx is a C constant; u.acurr.a / u.amax.a are in DISPLAY order —
 * translate via C_ATTR_TO_DISP before indexing. */
/* C attrib.c:9-21 — attribute description strings */
const plusattr = ["strong", "smart", "wise", "agile", "tough", "charismatic"];
const minusattr = ["weak", "stupid", "foolish", "clumsy", "fragile", "repulsive"];
const attrname = ["strength", "intelligence", "wisdom", "dexterity", "constitution", "charisma"];
const DUNCE_CAP = 94;
/* u.acurr.a[] / u.amax.a[] are `schar` (nethack-c/include/attrib.h:39
 * `struct attribs { schar a[A_MAX]; }`), so any C assignment into them
 * truncates the int-valued right-hand side to a signed char. */
function schar(n) {
    return ((n | 0) << 24) >> 24;
}

export function adjattrib(ndx, incr, msgflg) {
    const u = game.u;
    // C attrib.c:126 / youprop.h:385: only extrinsic Fixed_abil applies.
    if (!u || (u.uprops?.[FIXED_ABIL]?.extrinsic | 0) || !incr)
        return false;

    /* C attrib.c:129 — Dunce cap blocks Int/Wis changes */
    if ((ndx === A_INT || ndx === A_WIS) && u.uarmh && u.uarmh.otyp === DUNCE_CAP) {
        if (msgflg === 0)
            pline("Your cap constricts briefly, then relaxes again.");
        return false;
    }

    const di = C_ATTR_TO_DISP[ndx] ?? ndx; /* C constant → display index */
    const abase = getAbase(u);
    const amax = getAmax(u);
    const abon = getAbon(u);
    const aexe = getAexe(u);
    const old_acurr = acurr(u, ndx);
    const old_abase = abase[di] | 0;
    const old_amax = amax[di] | 0;
    let attrstr, abonflg;

    /* C attrib.c:138 `ABASE(ndx) += incr` — the sum is computed in int and
     * stored back into a schar, so out-of-domain increments wrap (8 + 236
     * stores as -12, which is then NOT > AMAX and leaves AMAX untouched).
     * A no-op for real attribute values, which stay within 3..25. */
    abase[di] = schar((abase[di] | 0) + incr); /* when incr is negative, this reduces ABASE() */

    if (incr > 0) {
        if (abase[di] > amax[di]) {
            amax[di] = abase[di];
            const hi = attrmax(u, ndx); /* ATTRMAX(ndx) — uses C constant order */
            if (amax[di] > hi)
                abase[di] = amax[di] = hi;
        }
        attrstr = plusattr[ndx];
        abonflg = (abon[di] | 0) < 0;
    } else { /* incr is negative */
        if (abase[di] < RACE_ATTRMIN) {
            /* C attrib.c:166: decr = rn2(ATTRMIN(ndx) - ABASE(ndx) + 1) */
            const decr = rn2(RACE_ATTRMIN - abase[di] + 1);
            abase[di] = RACE_ATTRMIN;
            amax[di] = (amax[di] | 0) - decr;
            if (amax[di] < RACE_ATTRMIN)
                amax[di] = RACE_ATTRMIN;
        }
        attrstr = minusattr[ndx];
        abonflg = (abon[di] | 0) > 0;
    }

    if (acurr(u, ndx) === old_acurr) {
        if (msgflg === 0 && game.flags && game.flags.verbose) {
            if ((abase[di] | 0) === old_abase && (amax[di] | 0) === old_amax) {
                pline(`You're ${abonflg ? "currently" : "already"} as ${attrstr} as you can get.`);
            } else {
                pline(`Your innate ${attrname[ndx]} has ${(incr > 0) ? "improved" : "declined"}.`);
            }
        }
        return false;
    }

    /* Any successful change also resets abuse / exercise level */
    aexe[ndx] = 0;

    /* SET_BOTL() */
    if (game.disp)
        game.disp.botl = 1;

    if (msgflg <= 0)
        pline(`You feel ${(incr > 1 || incr < -1) ? "very " : ""}${attrstr}!`);

    /* C attrib.c:190 — "Any successful change also resets abuse / exercise
     * level": AEXE(ndx) = 0. */
    getAexe(game.u)[ndx] = 0;
    if ((game.program_state?.in_moveloop | 0) && (ndx === A_STR || ndx === A_CON))
        encumber_msg();
    return true;
}

/* C attrib.c:203-216 gainstr().  adjattrib() queues its message through the
 * display channel, so await the queue here before a caller continues with
 * later food-effect messages or death handling. */
export async function gainstr(otmp, incr, givemsg) {
    let num = incr | 0;
    if (!num) {
        const abase = getAbase(game.u);
        const strength = abase[C_ATTR_TO_DISP[A_STR]] | 0;
        if (strength < 18)
            num = rn2(4) ? 1 : rnd(6);
        else if (strength < STR18(85))
            num = rnd(10);
        else
            num = 1;
    }
    adjattrib(A_STR, otmp?.cursed ? -num : num, givemsg ? -1 : 1);
    await flush_pending_messages();
}
/* C attrib.c:489 void exercise(int i, boolean inc_or_dec)
 *
 * Accumulates exercise/abuse for attribute i.  Does NOT fire adjattrib.
 * RNG: rn2(19) for gain, rn2(2) for loss — only when abs(AEXE) < AVAL (50).
 *
 * C comment (attrib.c:499-507):
 *   "Law of diminishing returns (Part I):
 *    Gain is harder at higher attribute values.
 *    79% at 3 --> 0% at 18.  Loss is even at all levels (50%)."
 */
export function exercise(i, inc_or_dec) {
    const g = game;
    const u = g.u;
    if (!u)
        return;
    /* C attrib.c:493 — can't exercise Int or Cha */
    if (i === A_INT || i === A_CHA)
        return;
    /* C attrib.c:496 — no physical exercise while polymorphed (except Wisdom) */
    if (Upolyd(u) && i !== A_WIS)
        return;
    const aexe = getAexe(u);
    if (Math.abs(aexe[i] | 0) < AVAL) {
        if (ENV.FF_TURNTRACE === '1')
            pushRngLogEntry(`^exercise_js[moves=${g.moves | 0} attr=${i | 0} inc=${inc_or_dec ? 1 : 0}]`);
        /* C attrib.c:509:
         *   AEXE(i) += (inc_or_dec) ? (rn2(19) > ACURR(i)) : -rn2(2);
         * Note: boolean (rn2(19) > ACURR(i)) is 1 or 0 in C. */
        if (inc_or_dec) {
            const roll = rn2(19);
            aexe[i] = (aexe[i] | 0) + (roll > acurr(u, i) ? 1 : 0);
        }
        else {
            aexe[i] = (aexe[i] | 0) - rn2(2);
        }
    }
    if ((game.moves | 0) > 0 && (i === A_STR || i === A_CON))
        encumber_msg_sync();
}
/* C align.h:17 — ALIGNLIM (10L + (svm.moves / 200L)).  Upper bound for
 * u.ualign.record; grows slowly so long-lived heroes can bank more devotion. */
function ALIGNLIM() {
    return 10 + Math.floor((game.moves | 0) / 200);
}

const M1_FLY = 0x00000001;         /* monflag.h:85 */
const M1_AMPHIBIOUS = 0x00000200;  /* monflag.h:94 */
const M1_REGEN = 0x00800000;       /* monflag.h:108 */
const M1_SEE_INVIS = 0x01000000;   /* monflag.h:109 */
const M1_TPORT = 0x02000000;       /* monflag.h:110 */
const M1_TPORT_CNTRL = 0x04000000; /* monflag.h:111 */
const AT_WEAP_ERI = 254;           /* monattk.h:28 */
const AT_MAGC_ERI = 255;           /* monattk.h:29 */
const AD_DRST_ERI = 7;             /* monattk.h:49 */
const AD_SPEL_ERI = 241;           /* monattk.h:88 */
let _pmErinys = -2;
function pmErinys() {
    if (_pmErinys === -2) {
        _pmErinys = -1;
        const rows = monPmnamesPackAt.pmnames;
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            if (r && (r[2] === 'erinys' || r[1] === 'erinys' || r[0] === 'erinys')) {
                _pmErinys = i;
                break;
            }
        }
    }
    return _pmErinys;
}
export function adj_erinys(abuse) {
    const mndx = pmErinys();
    if (mndx < 0)
        return;                         /* no such row — nothing C could mutate */
    const pm = monsPackAt.mons[mndx];
    const mattk = monMattkPackAt.mattk[mndx];
    const ab = abuse >>> 0;

    if (ab > 5)
        pm[6] = (pm[6] >>> 0) | M1_SEE_INVIS;          /* mon.c:5926-5928 */
    if (ab > 10)
        pm[6] = (pm[6] >>> 0) | M1_AMPHIBIOUS;         /* mon.c:5929-5931 */
    if (ab > 15)
        pm[6] = (pm[6] >>> 0) | M1_FLY;                /* mon.c:5932-5934 */
    if (ab > 20)
        mattk[0].damn = 3;              /* more powerful attack — mon.c:5935-5938 */
    if (ab > 25)
        pm[6] = (pm[6] >>> 0) | M1_REGEN;              /* mon.c:5939-5941 */
    if (ab > 30)
        pm[6] = (pm[6] >>> 0) | M1_TPORT_CNTRL;        /* mon.c:5942-5944 */
    if (ab > 35) {                      /* second attack — mon.c:5945-5951 */
        mattk[1].aatyp = AT_WEAP_ERI;
        mattk[1].adtyp = AD_DRST_ERI;
        mattk[1].damn = 3;
        mattk[1].damd = 4;
    }
    if (ab > 40)
        pm[6] = (pm[6] >>> 0) | M1_TPORT;              /* mon.c:5952-5954 */
    if (ab > 50) {                      /* third (spellcasting) attack — :5955-5961 */
        mattk[2].aatyp = AT_MAGC_ERI;
        mattk[2].adtyp = AD_SPEL_ERI;
        mattk[2].damn = 3;
        mattk[2].damd = 4;
    }
    /* also adjust level and difficulty — mon.c:5963-5964, UNCONDITIONAL.
     * MONS row layout (js/makemon.js:1319 permonstTemplate): [1]=mlevel,
     * [2]=difficulty. */
    pm[1] = Math.min(7 + ab, 50);
    pm[2] = Math.min(10 + Math.trunc(ab / 3), 25);
}

/* C attrib.c:1304 adjalign(int n) — the centralized alignment-record update.
 *   - n < 0: record only drops (it is set to record+n only when that lowers
 *            it), and |n| is added to u.ualign.abuse; adj_erinys() then reacts.
 *   - n > 0: record rises toward ALIGNLIM, clamped so it never exceeds it.
 * RNG-NEUTRAL: draws no rn2/rnd/d/rne/rnz.  Pure side effect on u.ualign.
 * The C abuse field is `unsigned`; JS keeps it a non-negative integer. */
export function adjalign(n) {
    const u = game.u;
    const align = u.ualign;
    const rec = align ? align.record : 0;
    const abu = (align && align.abuse != null) ? (align.abuse >>> 0) : 0;
    const newalign = rec + n;

    if (n < 0) {
        const newabuse = (abu - n) >>> 0; /* n<0 so this ADDS |n| */

        if (newalign < rec) {
            if (align) u.ualign.record = newalign;
        }
        if (newabuse > abu) {
            if (align) u.ualign.abuse = newabuse;
            adj_erinys(newabuse);
        }
    } else if (newalign > rec) {
        if (align) u.ualign.record = newalign;
        if (align && u.ualign.record > ALIGNLIM())
            u.ualign.record = ALIGNLIM();
    }
}

/* C attrib.c:410
 * void change_luck(schar n)
 * {
 *     u.uluck += n;
 *     if (u.uluck < 0 && u.uluck < LUCKMIN)
 *         u.uluck = LUCKMIN;
 *     if (u.uluck > 0 && u.uluck > LUCKMAX)
 *         u.uluck = LUCKMAX;
 * }
 */
export function change_luck(n) {
    const u = game.u;
    u.uluck = (u.uluck | 0) + (n | 0);
    if (u.uluck < 0 && u.uluck < LUCKMIN)
        u.uluck = LUCKMIN;
    if (u.uluck > 0 && u.uluck > LUCKMAX)
        u.uluck = LUCKMAX;
}

/* C attrib.c:520 staticfn void exerper(void)
 *
 * Called at the start of exerchk() every turn.
 * Fires exercise() based on hunger and encumbrance state.
 *
 * RNG comes from exercise() calls nested here.
 */
function exerper() {
    const g = game;
    const u = g.u;
    if (!u)
        return;
    const moves = (g.moves | 0);
    /* C attrib.c:523 — if (!(svm.moves % 10)) */
    if (moves % 10 === 0) {
        /* Hunger checks */
        const h = (u.uhunger | 0);
        const hs = h > 1000 ? SATIATED
            : h > 150 ? NOT_HUNGRY
                : h > 50 ? HUNGRY
                    : h > 0 ? WEAK
                        : FAINTING;
        const initrole = (g.flags?.initrole ?? -1) | 0;
        const isMonk = (initrole === 5); /* roles[] index 5 = Monk */
        switch (hs) {
            case SATIATED:
                exercise(A_DEX, false);
                if (isMonk)
                    exercise(A_WIS, false);
                break;
            case NOT_HUNGRY:
                exercise(A_CON, true);
                break;
            case WEAK:
                exercise(A_STR, false);
                if (isMonk)
                    exercise(A_WIS, true);
                break;
            case FAINTING:
            case FAINTED:
                exercise(A_CON, false);
                break;
            /* HUNGRY: no exercise call — C attrib.c:540-550 has no HUNGRY case */
        }
        /* Encumbrance checks — near_capacity() is the real STR/CON+weight calc. */
        switch (near_capacity()) {
            case MOD_ENCUMBER:
                exercise(A_STR, true);
                break;
            case HVY_ENCUMBER:
                exercise(A_STR, true);
                exercise(A_DEX, false);
                break;
            case EXT_ENCUMBER:
                exercise(A_DEX, false);
                exercise(A_CON, false);
                break;
            /* UNENCUMBERED (0): no exercise */
        }
    }
    if (moves % 5 === 0) {
        const up = u.uprops || {};
        const H = (p) => (up[p]?.intrinsic | 0);
        const E = (p) => (up[p]?.extrinsic | 0);
        const B = (p) => (up[p]?.blocked | 0);
        if ((H(CLAIRVOYANT) & (INTRINSIC | TIMEOUT)) && !B(CLAIRVOYANT))
            exercise(A_WIS, true);
        if (H(REGENERATION))
            exercise(A_STR, true);
        if (H(SICK) || H(VOMITING))
            exercise(A_CON, false);
        if (H(CONFUSION) || (H(HALLUC) && !(H(HALLUC_RES) || E(HALLUC_RES))))
            exercise(A_WIS, false);
        if (((H(WOUNDED_LEGS) || E(WOUNDED_LEGS)) && !u.usteed)
            || H(FUMBLING) || E(FUMBLING) || H(STUNNED))
            exercise(A_DEX, false);
    }
}
export function exerchk() {
    const g = game;
    const u = g.u;
    if (!u)
        return;
    /* C attrib.c:603 — exerper() fires every call */
    exerper();
    /* C attrib.c:605 — initialise next_attrib_check if not set.
     * C allmain.c:848: svc.context.next_attrib_check = 600L at newgame(). */
    const ctx = g.context = g.context || {};
    if (ctx.next_attrib_check == null)
        ctx.next_attrib_check = 600;
    const moves = (g.moves | 0);
    if (moves < ctx.next_attrib_check)
        return;
    const multiVal = (g.__bridge__ && g.__bridge__['hero.multi'] !== undefined)
        ? (g.__bridge__['hero.multi'] | 0) : (g.multi | 0);
    if (multiVal !== 0)
        return;
    /* C attrib.c:619-676 — run the attribute gain/loss test for each attr */
    const aexe = getAexe(u);
    const abase = getAbase(u);
    for (let i = 0; i < A_MAX; i++) {
        let ax = aexe[i] | 0;
        /* C attrib.c:623 — skip if no exercise/abuse has occurred */
        if (!ax)
            continue;
        const mod_val = sgn(ax); /* +1 or -1 */
        /* C attrib.c:629-632 — compute lolim / hilim */
        const lolim = RACE_ATTRMIN;
        let hilim = attrmax(u, i); /* attrmax uses C constant order — correct */
        if (hilim > 18)
            hilim = 18;
        /* C attrib.c:633 — skip if already at limit; wear off and continue
         * NOTE: i is C constant; abase is display-order — translate via C_ATTR_TO_DISP */
        const di = C_ATTR_TO_DISP[i] ?? i;
        const abaseI = abase[di] | 0;
        if ((ax < 0) ? (abaseI <= lolim) : (abaseI >= hilim)) {
            aexe[i] = Math.trunc(Math.abs(ax) / 2) * mod_val;
            continue;
        }
        /* C attrib.c:637 — skip non-Wisdom while polymorphed */
        if (Upolyd(u) && i !== A_WIS) {
            aexe[i] = Math.trunc(Math.abs(ax) / 2) * mod_val;
            continue;
        }
        /* C attrib.c:655 — rn2(AVAL) test: "do you get credit?"
         * Wisdom uses full abs(ax); others use abs(ax)*2/3. */
        const threshold = (i !== A_WIS)
            ? Math.trunc(Math.abs(ax) * 2 / 3)
            : Math.abs(ax);
        if (rn2(AVAL) > threshold) {
            /* C goto nextattrib — wear off without changing attribute */
            aexe[i] = Math.trunc(Math.abs(ax) / 2) * mod_val;
            continue;
        }
        /* C attrib.c:659 — adjattrib(i, mod_val, -1) */
        if (adjattrib(i, mod_val, -1)) {
            /* C attrib.c:661-666 — changed: zero accumulation */
            aexe[i] = 0;
            ax = 0;
            /* C: print message — not ported (no tty infrastructure) */
        }
        /* C attrib.c:671: nextattrib wear-off */
        aexe[i] = Math.trunc(Math.abs(ax) / 2) * mod_val;
    }
    /* C attrib.c:673 — svc.context.next_attrib_check += rn1(200, 800) */
    ctx.next_attrib_check += rn1(200, 800);
}
export function minuhpmax(altmin) {
    const u = game.u;
    if (!u)
        throw new Error('game.u not initialized');
    if (altmin < 1)
        altmin = 1;
    return Math.max(u.ulevel | 0, altmin | 0);
}
/* C attrib.c:1182-1194 adjuhploss(loss, olduhp) — reduce a still-pending hp
 * loss by however much current hp has ALREADY dropped as a side effect of a
 * drop in uhpmax (setuhpmax clamps uhp down to the new maximum).  Never
 * returns less than 1.  RNG-free.  `olduhp` does double duty as oldmh when
 * the hero is polymorphed. */
export function adjuhploss(loss, olduhp) {
    const u = game.u;
    if (!u)
        throw new Error('game.u not initialized');
    if (!Upolyd(u)) {
        if ((u.uhp | 0) < (olduhp | 0))
            loss -= ((olduhp | 0) - (u.uhp | 0));
    } else {
        if ((u.mh | 0) < (olduhp | 0))
            loss -= ((olduhp | 0) - (u.mh | 0));
    }
    return Math.max(loss | 0, 1);
}
/* C attrib.c:1162 setuhpmax(newmax, even_when_polyd) — update uhpmax or mhmax.
 * Sets max HP (or monster HP when polymorphed) and clamps current HP. */
export function setuhpmax(newmax, even_when_polyd) {
    const u = game.u;
    if (!u)
        throw new Error('game.u not initialized');
    if (!game.disp)
        throw new Error('game.disp not initialized');
    if (!Upolyd(u) || even_when_polyd) {
        /* Normal (non-polymorphed) path */
        if (newmax !== u.uhpmax) {
            u.uhpmax = newmax;
            if (u.uhpmax > u.uhppeak)
                u.uhppeak = u.uhpmax;
            game.disp.botl = 1; /* SET_BOTL */
        }
        if (u.uhp > u.uhpmax) {
            u.uhp = u.uhpmax;
            game.disp.botl = 1; /* SET_BOTL */
        }
    } else {
        /* Polymorphed path */
        if (newmax !== u.mhmax) {
            u.mhmax = newmax;
            game.disp.botl = 1; /* SET_BOTL */
        }
        if (u.mh > u.mhmax) {
            u.mh = u.mhmax;
            game.disp.botl = 1; /* SET_BOTL */
        }
    }
}
const ART_NONARTIFACT = 0;
/* C artifact.h — the ART_ enum terminator; artilist[] indices run 0..33. */
const AFTER_LAST_ARTIFACT = 34;
const ARTILIST_SPFX = [
    0x00000000, /*  0 (dummy element, ART_NONARTIFACT)         */
    0x00000297, /*  1 Excalibur                                */
    0x000001c6, /*  2 Stormbringer                             */
    0x00000042, /*  3 Mjollnir                                 */
    0x00000002, /*  4 Cleaver                                  */
    0x00800022, /*  5 Grimtooth                                */
    0x00800020, /*  6 Orcrist                                  */
    0x00800020, /*  7 Sting                                    */
    0x000000c2, /*  8 Magicbane                                */
    0x000000c2, /*  9 Frost Brand                              */
    0x000000c2, /* 10 Fire Brand                               */
    0x04200002, /* 11 Dragonbane                               */
    0x00800002, /* 12 Demonbane                                */
    0x00800002, /* 13 Werebane                                 */
    0x00000802, /* 14 Grayswandir                              */
    0x00800002, /* 15 Giantslayer                              */
    0x00200002, /* 16 Ogresmasher                              */
    0x00204002, /* 17 Trollsbane                               */
    0x00000402, /* 18 Vorpal Blade                             */
    0x00000002, /* 19 Snickersnee                              */
    0x00800002, /* 20 Sunsword                                 */
    0x00000007, /* 21 The Orb of Detection                     */
    0x00000007, /* 22 The Heart of Ahriman                     */
    0x01000007, /* 23 The Sceptre of Might                     */
    0x00004147, /* 24 The Staff of Aesculapius                 */
    0x0000000f, /* 25 The Magic Mirror of Merlin               */
    0x02000007, /* 26 The Eyes of the Overworld                */
    0x08800007, /* 27 The Mitre of Holiness                    */
    0x04000007, /* 28 The Longbow of Diana                     */
    0x0000000f, /* 29 The Master Key of Thievery               */
    0x08080407, /* 30 The Tsurugi of Muramasa      <- SPFX_LUCK */
    0x00000087, /* 31 The Platinum Yendorian Express Card      */
    0x00080007, /* 32 The Orb of Fate              <- SPFX_LUCK */
    0x00000007, /* 33 The Eye of the Aethiopica                */
];
/* The remaining artilist[] columns set_artifact_intrinsic() (artifact.c:730-892)
 * reads.  Same provenance discipline as the spfx column above: they were parsed
 * out of nethack-c-v5/upstream/include/artilist.h's A() X-macro rather than
 * hand-typed, and the parse was VALIDATED by having it also reproduce the spfx
 * column — all 34 values matched the compiled table byte for byte, including
 * the absence of the `#if 0`-d Palantir of Westernesse, so the indices below
 * are the same obj->oartifact ordinals.
 *
 * cspfx  = the A() `s2` column: intrinsics conferred by merely CARRYING the
 *          artifact (wp_mask == W_ART), as opposed to spfx's wielded/worn set.
 * defn   = the A() `dfn` column's adtyp (AD_*), i.e. artilist[].defn.adtyp.
 * cary   = the A() `cry` column's adtyp.
 * mtype  = the A() `mt` column, which spec_m2() (artifact.c) returns; only the
 *          SPFX_WARN arm reads it, and only its M2_* bits are meaningful there.
 * invprop= the A() `inv` column (inv_prop), used by the W_ART-and-off arm to
 *          decide whether an invoked power has to be switched off too.  Stored
 *          as the prop.h number; 0 means "no invokable power".
 */
const ARTILIST_CSPFX = [
    0x00000000, /*  0 (dummy)                                  */
    0x00000000, /*  1 Excalibur                                */
    0x00000000, /*  2 Stormbringer                             */
    0x00000000, /*  3 Mjollnir                                 */
    0x00000000, /*  4 Cleaver                                  */
    0x00000000, /*  5 Grimtooth                                */
    0x00000000, /*  6 Orcrist                                  */
    0x00000000, /*  7 Sting                                    */
    0x00000000, /*  8 Magicbane                                */
    0x00000000, /*  9 Frost Brand                              */
    0x00000000, /* 10 Fire Brand                               */
    0x00000000, /* 11 Dragonbane                               */
    0x00000000, /* 12 Demonbane                                */
    0x00000000, /* 13 Werebane                                 */
    0x00000000, /* 14 Grayswandir                              */
    0x00000000, /* 15 Giantslayer                              */
    0x00000000, /* 16 Ogresmasher                              */
    0x00000000, /* 17 Trollsbane                               */
    0x00000000, /* 18 Vorpal Blade                             */
    0x00000000, /* 19 Snickersnee                              */
    0x00000000, /* 20 Sunsword                                 */
    0x00011000, /* 21 The Orb of Detection      ESP|HSPDAM     */
    0x00002000, /* 22 The Heart of Ahriman      STLTH          */
    0x00000000, /* 23 The Sceptre of Might                     */
    0x00000000, /* 24 The Staff of Aesculapius                 */
    0x00001000, /* 25 The Magic Mirror of Merlin  ESP          */
    0x00000000, /* 26 The Eyes of the Overworld                */
    0x00000000, /* 27 The Mitre of Holiness                    */
    0x00001000, /* 28 The Longbow of Diana      ESP            */
    0x00060020, /* 29 The Master Key of Thievery WARN|TCTRL|HPHDAM */
    0x00000000, /* 30 The Tsurugi of Muramasa                  */
    0x00011000, /* 31 The Platinum Yendorian Express Card      */
    0x00030020, /* 32 The Orb of Fate  WARN|HSPDAM|HPHDAM      */
    0x00018000, /* 33 The Eye of the Aethiopica EREGEN|HSPDAM  */
];
/* monattk.h AD_* — only the seven set_artifact_intrinsic() maps to a property,
 * plus the three that appear in the columns and map to none. */
const AD_PHYS = 0, AD_MAGM = 1, AD_FIRE = 2, AD_COLD = 3, AD_DISN = 5,
      AD_ELEC = 6, AD_DRST = 7, AD_BLND = 11, AD_DRLI = 15, AD_WERE = 29;
const ARTILIST_DEFN_ADTYP = [
    AD_PHYS, AD_DRLI, AD_DRLI, AD_PHYS, AD_PHYS, AD_DRST, AD_PHYS, AD_PHYS,
    AD_MAGM, AD_COLD, AD_FIRE, AD_PHYS, AD_PHYS, AD_WERE, AD_PHYS, AD_PHYS,
    AD_PHYS, AD_PHYS, AD_PHYS, AD_PHYS, AD_BLND, AD_PHYS, AD_PHYS, AD_MAGM,
    AD_DRLI, AD_PHYS, AD_MAGM, AD_PHYS, AD_PHYS, AD_PHYS, AD_PHYS, AD_PHYS,
    AD_PHYS, AD_MAGM,
];
const ARTILIST_CARY_ADTYP = [
    AD_PHYS, AD_PHYS, AD_PHYS, AD_PHYS, AD_PHYS, AD_PHYS, AD_PHYS, AD_PHYS,
    AD_PHYS, AD_PHYS, AD_PHYS, AD_PHYS, AD_PHYS, AD_PHYS, AD_PHYS, AD_PHYS,
    AD_PHYS, AD_PHYS, AD_PHYS, AD_PHYS, AD_PHYS, AD_MAGM, AD_PHYS, AD_PHYS,
    AD_PHYS, AD_MAGM, AD_PHYS, AD_FIRE, AD_PHYS, AD_PHYS, AD_PHYS, AD_MAGM,
    AD_PHYS, AD_PHYS,
];
/* monflag.h M2_* / defsym.h S_* — the A() `mt` column.  Only rows whose spfx
 * or cspfx carries SPFX_WARN are read by set_artifact_intrinsic(); the rest are
 * kept so spec_m2() is right for its other callers (SPFX_DMONS / SPFX_DCLAS /
 * SPFX_DFLAG1 / SPFX_DFLAG2 in spec_applies()), which is also why the column
 * mixes namespaces exactly as C's does: a DCLAS artifact stores a defsym.h
 * S_ monster-class ordinal in the same field a DFLAG2 artifact stores an M2_
 * bit in. */
const M2_UNDEAD_ART = 0x00000002, M2_WERE_ART = 0x00000004,
      M2_ELF_ART = 0x00000010, M2_ORC_ART = 0x00000080,
      M2_DEMON_ART = 0x00000100, M2_GIANT_ART = 0x00002000;
const S_DRAGON_ART = 30, S_OGRE_ART = 41, S_TROLL_ART = 46;
export const ARTILIST_MTYPE = [
    0,               /*  0 (dummy)                    */
    0,               /*  1 Excalibur                  */
    0,               /*  2 Stormbringer               */
    0,               /*  3 Mjollnir                   */
    0,               /*  4 Cleaver                    */
    M2_ELF_ART,      /*  5 Grimtooth                  */
    M2_ORC_ART,      /*  6 Orcrist                    */
    M2_ORC_ART,      /*  7 Sting                      */
    0,               /*  8 Magicbane                  */
    0,               /*  9 Frost Brand                */
    0,               /* 10 Fire Brand                 */
    S_DRAGON_ART,    /* 11 Dragonbane                 */
    M2_DEMON_ART,    /* 12 Demonbane                  */
    M2_WERE_ART,     /* 13 Werebane                   */
    0,               /* 14 Grayswandir                */
    M2_GIANT_ART,    /* 15 Giantslayer                */
    S_OGRE_ART,      /* 16 Ogresmasher                */
    S_TROLL_ART,     /* 17 Trollsbane                 */
    0,               /* 18 Vorpal Blade               */
    0,               /* 19 Snickersnee                */
    M2_UNDEAD_ART,   /* 20 Sunsword                   */
    0,               /* 21 The Orb of Detection       */
    0,               /* 22 The Heart of Ahriman       */
    0,               /* 23 The Sceptre of Might       */
    0,               /* 24 The Staff of Aesculapius   */
    0,               /* 25 The Magic Mirror of Merlin */
    0,               /* 26 The Eyes of the Overworld  */
    M2_UNDEAD_ART,   /* 27 The Mitre of Holiness      */
    0,               /* 28 The Longbow of Diana       */
    0,               /* 29 The Master Key of Thievery */
    0,               /* 30 The Tsurugi of Muramasa    */
    0,               /* 31 The Platinum Yendorian Express Card */
    0,               /* 32 The Orb of Fate            */
    0,               /* 33 The Eye of the Aethiopica  */
];
/* prop.h / artifact.h numbers for the A() `inv` column (0 == no invokable
 * power).  artifact.h:64 starts the invokable enum at LAST_PROP + 1 == 69,
 * so TAMING 69, HEALING 70, ENERGY_BOOST 71, UNTRAP 72, CHARGE_OBJ 73,
 * LEV_TELE 74, CREATE_PORTAL 75, ENLIGHTENING 76, CREATE_AMMO 77, BANISH 78,
 * FLING_POISON 79, FIRESTORM 80, SNOWSTORM 81, BLINDING_RAY 82; the three
 * plain prop.h powers are INVIS 40, CONFLICT 44 and LEVITATION 48. */
const ARTILIST_INVPROP = [
     0,  /*  0 (dummy)                    */
     0,  /*  1 Excalibur                  */
     0,  /*  2 Stormbringer               */
     0,  /*  3 Mjollnir                   */
     0,  /*  4 Cleaver                    */
    79,  /*  5 Grimtooth        FLING_POISON */
     0,  /*  6 Orcrist                    */
     0,  /*  7 Sting                      */
     0,  /*  8 Magicbane                  */
    81,  /*  9 Frost Brand      SNOWSTORM */
    80,  /* 10 Fire Brand       FIRESTORM */
     0,  /* 11 Dragonbane                 */
    78,  /* 12 Demonbane        BANISH    */
     0,  /* 13 Werebane                   */
     0,  /* 14 Grayswandir                */
     0,  /* 15 Giantslayer                */
     0,  /* 16 Ogresmasher                */
     0,  /* 17 Trollsbane                 */
     0,  /* 18 Vorpal Blade               */
     0,  /* 19 Snickersnee                */
    82,  /* 20 Sunsword         BLINDING_RAY */
    40,  /* 21 The Orb of Detection       INVIS */
    48,  /* 22 The Heart of Ahriman       LEVITATION */
    44,  /* 23 The Sceptre of Might       CONFLICT */
    70,  /* 24 The Staff of Aesculapius   HEALING */
     0,  /* 25 The Magic Mirror of Merlin */
    76,  /* 26 The Eyes of the Overworld  ENLIGHTENING */
    71,  /* 27 The Mitre of Holiness      ENERGY_BOOST */
    77,  /* 28 The Longbow of Diana       CREATE_AMMO */
    72,  /* 29 The Master Key of Thievery UNTRAP */
     0,  /* 30 The Tsurugi of Muramasa    */
    73,  /* 31 The Platinum Yendorian Express Card CHARGE_OBJ */
    74,  /* 32 The Orb of Fate            LEV_TELE */
    75,  /* 33 The Eye of the Aethiopica  CREATE_PORTAL */
];
/* C artifact.c:513 spec_m2(otmp) — artilist[oartifact].mtype, 0 for a
 * non-artifact.  (C dereferences get_artifact()'s always-non-NULL return, so
 * the dummy row's 0 is what a non-artifact yields.) */
export function spec_m2(otmp) {
    return ARTILIST_MTYPE[get_artifact(otmp)] | 0;
}
/* Column accessors, so js/cmd.js's set_artifact_intrinsic() reads the same
 * table these do rather than carrying a third copy of artilist[]. */
export function arti_spfx(artidx) { return ARTILIST_SPFX[artidx] | 0; }
export function arti_cspfx(artidx) { return ARTILIST_CSPFX[artidx] | 0; }
export function arti_defn_adtyp(artidx) { return ARTILIST_DEFN_ADTYP[artidx] | 0; }
export function arti_cary_adtyp(artidx) { return ARTILIST_CARY_ADTYP[artidx] | 0; }
export function arti_inv_prop(artidx) { return ARTILIST_INVPROP[artidx] | 0; }
export { get_artifact, ART_NONARTIFACT };
/* C artifact.h:34 */
const SPFX_LUCK = 0x00080000;
/* C objects.h — LUCKSTONE; == 470, confirmed by the same C build that produced
 * the spfx column above. */
const LUCKSTONE = 470;

/* C ref: nethack-c/src/artifact.c:180-193 get_artifact(struct obj *obj)
 *   if (obj) { int artidx = (int) obj->oartifact;
 *              if (artidx > 0 && artidx < AFTER_LAST_ARTIFACT)
 *                  return &artilist[artidx]; }
 *   return &artilist[ART_NONARTIFACT];
 * C returns a pointer; JS returns the INDEX, so callers compare against
 * ART_NONARTIFACT exactly where C compares against &artilist[ART_NONARTIFACT]. */
function get_artifact(obj) {
    if (obj) {
        const artidx = obj.oartifact | 0;
        /* skip 0, 1st artifact at 1 */
        if (artidx > 0 && artidx < AFTER_LAST_ARTIFACT)
            return artidx;
    }
    return ART_NONARTIFACT;
}

/* C ref: nethack-c/src/artifact.c:515-522 spec_ability(struct obj *otmp,
 *                                                      unsigned long abil)
 *   const struct artifact *arti = get_artifact(otmp);
 *   return (boolean) (arti != &artilist[ART_NONARTIFACT]
 *                     && (arti->spfx & abil) != 0L);
 * Every spfx value is < 2^31, so JS's signed 32-bit `&` is exact here. */
export function spec_ability(otmp, abil) {
    const arti = get_artifact(otmp);

    return (arti !== ART_NONARTIFACT
            && (ARTILIST_SPFX[arti] & abil) !== 0);
}

/* used so that callers don't need to known about SPFX_ codes */
/* C ref: nethack-c/src/artifact.c:524-532 confers_luck(struct obj *obj)
 *   if (obj->otyp == LUCKSTONE) return TRUE;
 *   return (boolean) (obj->oartifact && spec_ability(obj, SPFX_LUCK)); */
export function confers_luck(obj) {
    /* might as well check for this too */
    if (obj.otyp === LUCKSTONE)
        return true;

    return !!(obj.oartifact && spec_ability(obj, SPFX_LUCK));
}
/* C attrib.c:422 int stone_luck(boolean include_uncursed) — compute net luck bonus.
 * Loops through hero inventory chain (gi.invent), accumulates blessed-blessed/uncursed
 * items (if include_uncursed) as +quan, cursed items as -quan. Returns sgn of total. */
export function stone_luck(include_uncursed) {
    const g = game;
    let bonchance = 0;

    for (let otmp = g.invent; otmp; otmp = otmp.nobj) {
        if (confers_luck(otmp)) {
            if (otmp.cursed) {
                bonchance -= otmp.quan;
            } else if (otmp.blessed || include_uncursed) {
                bonchance += otmp.quan;
            }
        }
    }

    return sgn((bonchance | 0));
}

export async function losestr(num, knam, k_format) {
    const u = game.u;
    if (!u)
        throw new Error('losestr: game.u not initialized');

    const uhpmin = minuhpmax(1);
    const olduhpmax = u.uhpmax;
    let ustr = getAbase(u)[C_ATTR_TO_DISP[A_STR]] - num;
    let amt, dmg;
    const waspolyd = Upolyd(u);

    if (num <= 0 || getAbase(u)[C_ATTR_TO_DISP[A_STR]] < RACE_ATTRMIN) {
        /* impossible("losestr: %d - %d", ABASE(A_STR), num); */
        return;
    }
    dmg = 0;
    while (ustr < RACE_ATTRMIN) {
        ++ustr;
        --num;
        amt = rn1(4, 3);  /* (0..(4-1))+3 => 3..6 */
        dmg += amt;
    }
    if (dmg) {
        /* in case damage is fatal and caller didn't supply killer reason */
        if (!knam || !knam.length) {
            knam = "terminal frailty";
            k_format = KILLED_BY;
        }
        await losehp(dmg, knam, k_format);

        if (Upolyd(u)) {
            /* when still poly'd, reduce you-as-monst maxHP; never below 1 */
            setuhpmax(Math.max(u.mhmax - dmg, 1), false);  /* acts as setmhmax() */
        } else if (!waspolyd) {
            /* not polymorphed now and didn't rehumanize when taking damage;
               reduce max HP, but not below uhpmin */
            if (u.uhpmax > uhpmin)
                setuhpmax(Math.max(u.uhpmax - dmg, uhpmin), false);
        }
        game.disp.botl = 1;  /* SET_BOTL */
    }
    /* #if 0 — only possible if uhpmax was already less than uhpmin
     * nhUse(olduhpmax);
     * #endif */
    /* 'num' could have been reduced to 0 in the minimum strength loop;
       '(Upolyd || !waspolyd)' is True unless damage caused rehumanization */
    if (num > 0 && (Upolyd(u) || !waspolyd))
        adjattrib(A_STR, -num, 1);
}

const _ARC_ABIL = [[1, SEARCHING, '', ''], [5, STEALTH, 'stealthy', ''], [10, FAST, 'quick', 'slow']];
const _BAR_ABIL = [[1, POISON_RES, '', ''], [7, FAST, 'quick', 'slow'], [15, STEALTH, 'stealthy', '']];
const _CAV_ABIL = [[7, FAST, 'quick', 'slow'], [15, WARNING, 'sensitive', '']];
const _HEA_ABIL = [[1, POISON_RES, '', ''], [15, WARNING, 'sensitive', '']];
const _KNI_ABIL = [[7, FAST, 'quick', 'slow']];
const _MON_ABIL = [[1, FAST, '', ''], [1, SLEEP_RES, '', ''], [1, SEE_INVIS, '', ''],
    [3, POISON_RES, 'healthy', ''], [5, STEALTH, 'stealthy', ''], [7, WARNING, 'sensitive', ''],
    [9, SEARCHING, 'perceptive', 'unaware'], [11, FIRE_RES, 'cool', 'warmer'],
    [13, COLD_RES, 'warm', 'cooler'], [15, SHOCK_RES, 'insulated', 'conductive'],
    [17, TELEPORT_CONTROL, 'controlled', 'uncontrolled']];
const _PRI_ABIL = [[15, WARNING, 'sensitive', ''], [20, FIRE_RES, 'cool', 'warmer']];
const _RAN_ABIL = [[1, SEARCHING, '', ''], [7, STEALTH, 'stealthy', ''], [15, SEE_INVIS, '', '']];
const _ROG_ABIL = [[1, STEALTH, '', ''], [10, SEARCHING, 'perceptive', '']];
const _SAM_ABIL = [[1, FAST, '', ''], [15, STEALTH, 'stealthy', '']];
const _TOU_ABIL = [[10, SEARCHING, 'perceptive', ''], [20, POISON_RES, 'hardy', '']];
const _VAL_ABIL = [[1, COLD_RES, '', ''], [3, STEALTH, 'stealthy', ''], [7, FAST, 'quick', 'slow']];
const _WIZ_ABIL = [[15, WARNING, 'sensitive', ''], [17, TELEPORT_CONTROL, 'controlled', 'uncontrolled']];
/* race intrinsic tables (attrib.c:91-105) */
const _DWA_ABIL = [[1, INFRAVISION, '', '']];
const _ELF_ABIL = [[1, INFRAVISION, '', ''], [4, SLEEP_RES, 'awake', 'tired']];
const _GNO_ABIL = [[1, INFRAVISION, '', '']];
const _ORC_ABIL = [[1, INFRAVISION, '', ''], [1, POISON_RES, '', '']];
const _HUM_ABIL = [];
/* role index (game.flags.initrole) → role ability table.  Indices are the
 * roles[] order in role.c:31-533 (NOT alphabetical — Rogue precedes Ranger):
 * 0=Arch 1=Barb 2=Cave 3=Heal 4=Knight 5=Monk 6=Priest 7=Rogue 8=Ranger
 * 9=Samurai 10=Tourist 11=Valkyrie 12=Wizard — the same order u_init.js:15,
 * display.js:1846 and roles.js use (roles.js:110 gives Rogue mnum 7). */
const _ROLE_ABIL_BY_INDEX = [
    _ARC_ABIL, _BAR_ABIL, _CAV_ABIL, _HEA_ABIL, _KNI_ABIL, _MON_ABIL,
    _PRI_ABIL, _ROG_ABIL, _RAN_ABIL, _SAM_ABIL, _TOU_ABIL, _VAL_ABIL, _WIZ_ABIL,
];
/* race index (game.flags.initrace) → race ability table.  C switch in adjabil
 * (attrib.c:1019) only acts for ELF and ORC; HUMAN/DWARF/GNOME → rabil=0.
 * (DWARF/GNOME infravision is granted at u_init, not via adjabil level gain.) */
const _RACE_ABIL_BY_INDEX = [
    null,      /* 0 human  */
    _ELF_ABIL, /* 1 elf    */
    null,      /* 2 dwarf  */
    null,      /* 3 gnome  */
    _ORC_ABIL, /* 4 orc    */
];

function _uprop(u, prop) {
    if (!u.uprops) u.uprops = {};
    if (!u.uprops[prop]) u.uprops[prop] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    return u.uprops[prop];
}

/* C attrib.c:1012 adjabil — async because it plines.  No RNG. */
export async function adjabil(oldlevel, newlevel) {
    const g = game;
    const u = g.u;
    if (!u) return;
    const initrole = (g.flags?.initrole ?? -1) | 0;
    const initrace = (g.flags?.initrace ?? -1) | 0;
    let abil = (initrole >= 0 && initrole < _ROLE_ABIL_BY_INDEX.length)
        ? _ROLE_ABIL_BY_INDEX[initrole] : null;
    let rabil = (initrace >= 0 && initrace < _RACE_ABIL_BY_INDEX.length)
        ? _RACE_ABIL_BY_INDEX[initrace] : null;
    /* C uses two cursor pointers (abil walks the role list, then the race list).
     * Model as a flat index walk over the role list, then the race list, with a
     * `mask` that flips from FROMEXPER to FROMRACE at the handover. */
    let list = abil || rabil;
    let mask = abil ? FROMEXPER : FROMRACE;
    let usingRace = !abil;
    let i = 0;
    /* C: while (abil || rabil) { if finished role list, switch to race list } */
    for (; list;) {
        if (i >= list.length) {
            /* finished current list */
            if (usingRace || !rabil) break;
            list = rabil;
            mask = FROMRACE;
            usingRace = true;
            i = 0;
            if (i >= list.length) break;
        }
        const [ulevel, prop, gainstr, losestr] = list[i];
        const p = _uprop(u, prop);
        const prevabil = p.intrinsic | 0;
        if (oldlevel < ulevel && newlevel >= ulevel) {
            /* C attrib.c:1052: level-1 abilities also get FROMOUTSIDE so they
             * can never be lost via level loss. */
            if (ulevel === 1)
                p.intrinsic = (p.intrinsic | 0) | (mask | FROMOUTSIDE);
            else
                p.intrinsic = (p.intrinsic | 0) | mask;
            /* C attrib.c:1056: pline only if not already intrinsic from another src */
            if (!((p.intrinsic | 0) & INTRINSIC & ~mask)) {
                if (gainstr && gainstr.length)
                    await pline(`You feel ${gainstr}!`);
            }
        } else if (oldlevel >= ulevel && newlevel < ulevel) {
            p.intrinsic = (p.intrinsic | 0) & ~mask;
            if (!((p.intrinsic | 0) & INTRINSIC)) {
                if (losestr && losestr.length)
                    await pline(`You feel ${losestr}!`);
                else if (gainstr && gainstr.length)
                    await pline(`You feel less ${gainstr}!`);
            }
        }
        /* C attrib.c:1067-1068 — postadjabil() refreshes monster glyphs when
         * WARNING or SEE_INVISIBLE changes.  This is display bookkeeping, but
         * it is reachable on role/race level transitions and must happen only
         * when the intrinsic actually changed. */
        if ((prevabil | 0) !== (p.intrinsic | 0)
            && (prop === WARNING || prop === SEE_INVIS)) {
            see_monsters();
        }
        i++;
    }
    /* C attrib.c:1068-1073 — initialization grants intrinsics, not skill slots. */
    if (oldlevel > 0) {
        if (newlevel > oldlevel)
            await add_weapon_skill(newlevel - oldlevel);
        else
            lose_weapon_skill(oldlevel - newlevel);
    }
}

/* feedback for attribute loss due to poisoning */
export async function poisontell(typ, exclaim) {
    const poiseff_prefix = [
        "You feel ",  /* A_STR */
        "Your ",      /* A_INT */
        "Your ",      /* A_WIS */
        "Your ",      /* A_DEX */
        "You feel ",  /* A_CON */
        "You ",       /* A_CHA */
    ];
    const poiseff_msg = [
        "weaker",             /* A_STR */
        "brain is on fire",   /* A_INT */
        "judgement is impaired",  /* A_WIS */
        "muscles won't obey you", /* A_DEX */
        "very sick",          /* A_CON */
        "break out in hives"  /* A_CHA */
    ];

    let msg_txt = poiseff_msg[typ];

    if (typ === A_STR && acurr(game.u, A_STR) === STR19(25))
        msg_txt = "innately weaker";
    else if (typ === A_CON && acurr(game.u, A_CON) === 25)
        msg_txt = "sick inside";

    await pline(poiseff_prefix[typ] + msg_txt + (exclaim ? '!' : '.'));
}
