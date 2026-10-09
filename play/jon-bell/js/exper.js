// exper.c — experience / leveling (ported helpers for RNG parity).
// C ref: exper.c newpw(), pluslvl(), attrib.c newhp() for u.ulevel==0 and level-up.
// @ts-nocheck — sibling imports from hand-maintained js/*.js (no .d.ts yet).
import { u_init_misc } from './u_init.js';
import { rnd, rn1, rn2 } from './rng.js';
import { game } from './gstate.js';
import { clong, LONG_MAX } from './integer.js';
import { newuexp } from './exper_pure.js';
import { PM_WIZARD } from './pm.generated.js';
import { pline, flush_screen, livelog_printf } from './display.js';
import { adjabil, minuhpmax, setuhpmax, acurr } from './attrib.js';
import { Goodbye } from './roles.js';
import { monhp_per_lvl } from './makemon.js';
import { KILLED_BY, DIED, LL_MINORAC, Upolyd, DRAIN_RES } from './const.js';
/* C exper.c:358-360 — pluslvl records the rank achievement.  Both helpers live
 * in insight.c; this port hosts the insight.c block in js/cmd.js. */
import { achieve_rank, record_achievement, count_achievements } from './cmd.js';
import { xlev_to_rank } from './rank_data.js';
/* rehumanize is async because its urgent message must cross the display
 * command boundary.  Keep losexp async all the way through its Upolyd arm;
 * fire-and-forget here used to leave a polymorphed hero dead until a later
 * turn.  The cycle is safe: polyself imports only the pure HP helpers above,
 * and this binding is called after module initialization. */
import { rehumanize as rehumanize_real } from './polyself.js';
/* C end.c:1023 done() — life-drain at level 1 is a fatal path.  Keep this
 * late-bound through the existing end.js implementation rather than silently
 * returning from the local placeholder below.  The import cycle is already
 * present through cmd/uhitm; ES module bindings are resolved before callers
 * can invoke losexp(). */
import { done as done_real } from './end.js';

function resists_drli(mon) {
    const p = game.u?.uprops?.[DRAIN_RES];
    return !!(p && ((p.intrinsic | 0) || (p.extrinsic | 0)))
        || ((game.u?.ulycn ?? -1) | 0) >= 0;
}
const sa2_xpleveldown = 0; /* SoundAchievement constant */
/* C ref: role.c:697 aligns[].value indexed by flags.initalign:
 *   aligns[0] = A_LAWFUL  ( 1)
 *   aligns[1] = A_NEUTRAL ( 0)
 *   aligns[2] = A_CHAOTIC (-1)
 * align.h: A_LAWFUL=1, A_NEUTRAL=0, A_CHAOTIC=-1.
 * you.h:   A_CURRENT=0, A_ORIGINAL=1. */
const ALIGN_VALUE = [1, 0, -1];
/* C ref: role.c roles[].initrecord — initial u.ualign.record per role (Arc..Wiz).
 * Mirrors ROLE_INITRECORD in js/makemon.js (peace_minded fallback). */
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
/** C roles[] hpadv in role.c order (NUM_ROLES entries). */
export const ROLE_HPADV = [
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
/** C roles[] enadv in role.c order. */
export const ROLE_ENADV = [
    { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
    { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
    { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
    { infix: 1, inrnd: 4, lofix: 0, lornd: 1, hifix: 0, hirnd: 2 },
    { infix: 1, inrnd: 4, lofix: 0, lornd: 1, hifix: 0, hirnd: 2 },
    { infix: 2, inrnd: 2, lofix: 0, lornd: 2, hifix: 0, hirnd: 2 },
    { infix: 4, inrnd: 3, lofix: 0, lornd: 2, hifix: 0, hirnd: 2 },
    { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
    { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
    { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
    { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
    { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
    { infix: 4, inrnd: 3, lofix: 0, lornd: 2, hifix: 0, hirnd: 3 },
];
/** C races[] hpadv. */
export const RACE_HPADV = [
    { infix: 2, inrnd: 0, lofix: 0, lornd: 2, hifix: 1, hirnd: 0 },
    { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 1, hirnd: 0 },
    { infix: 4, inrnd: 0, lofix: 0, lornd: 3, hifix: 2, hirnd: 0 },
    { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 0 },
    { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 0 },
];
/** C races[] enadv. */
export const RACE_ENADV = [
    { infix: 1, inrnd: 0, lofix: 2, lornd: 0, hifix: 2, hirnd: 0 },
    { infix: 2, inrnd: 0, lofix: 3, lornd: 0, hifix: 3, hirnd: 0 },
    { infix: 0, inrnd: 0, lofix: 0, lornd: 0, hifix: 0, hirnd: 0 },
    { infix: 2, inrnd: 0, lofix: 2, lornd: 0, hifix: 2, hirnd: 0 },
    { infix: 1, inrnd: 0, lofix: 1, lornd: 0, hifix: 1, hirnd: 0 },
];
/* C ref: you.h struct Role.xlev — cutoff experience level per role.
 * Below xlev: use lornd/lofix for hpadv and enadv.
 * At or above xlev: use hirnd/hifix.
 * Role order is C roles[] order (role.c): Arc Bar Cav Hea Kni Mon Pri ROG RAN
 * Sam Tou Val Wiz — Rogue is index 7 and Ranger index 8, NOT alphabetical. */
const ROLE_XLEV = [14, 10, 10, 20, 10, 10, 10, 11, 12, 11, 14, 10, 12];
/* C ref: exper.c staticfn enermod(int en)
 * Multiplier on energy gain per level based on role.
 * Role indices: PM_CLERIC=6, PM_WIZARD=12, PM_HEALER=3, PM_KNIGHT=4,
 *               PM_BARBARIAN=1, PM_VALKYRIE=11 (equals initrole index). */
function enermod(en) {
    const initrole = (game.flags?.initrole ?? -1) | 0;
    switch (initrole) {
    case 6:  /* PM_CLERIC  */
    case 12: /* PM_WIZARD  */
        return 2 * en;
    case 3:  /* PM_HEALER  */
    case 4:  /* PM_KNIGHT  */
        return Math.trunc((3 * en) / 2);
    case 1:  /* PM_BARBARIAN */
    case 11: /* PM_VALKYRIE  */
        return Math.trunc((3 * en) / 4);
    default:
        return en;
    }
}
export function newhp() {
    const g = game;
    const u = g.u || {};
    const initrole = (g.flags?.initrole ?? -1) | 0;
    const initrace = (g.flags?.initrace ?? -1) | 0;
    let hp, conplus;
    const rh = (initrole >= 0 && initrole < ROLE_HPADV.length) ? ROLE_HPADV[initrole] : null;
    const rr = (initrace >= 0 && initrace < RACE_HPADV.length) ? RACE_HPADV[initrace] : null;
    const xlev = (initrole >= 0 && initrole < ROLE_XLEV.length) ? ROLE_XLEV[initrole] : 14;
    const MAXULEV = 30;
    if ((u.ulevel | 0) === 0) {
        /* C attrib.c:1090-1102: Initialize hit points.
         *   hp = role.hpadv.infix + race.hpadv.infix;
         *   if (role.hpadv.inrnd > 0) hp += rnd(role.hpadv.inrnd);
         *   if (race.hpadv.inrnd > 0) hp += rnd(race.hpadv.inrnd);
         *   (no Con adjustment for initial hit points)
         * The svm.moves==0 alignment block (attrib.c:1097-1101) is mirrored by
         * u_init_misc() in u_init.js, which sets u.ualign.{type,record} /
         * u.ualignbase[] directly; that block consumes NO RNG, so its location
         * does not affect sequence parity. */
        hp = ((rh ? rh.infix : 0) | 0) + ((rr ? rr.infix : 0) | 0);
        if (rh && rh.inrnd > 0)
            hp += rnd(rh.inrnd);
        if (rr && rr.inrnd > 0)
            hp += rnd(rr.inrnd);
        /* C attrib.c:1133-1147: shared tail (hp<=0 → 1, uhpinc cap). */
        if (hp <= 0) hp = 1;
        if ((u.ulevel | 0) < MAXULEV) {
            if (!u.uhpinc) u.uhpinc = new Array(MAXULEV).fill(0);
            u.uhpinc[u.ulevel | 0] = hp;
        }
        return hp;
    }
    if ((u.ulevel | 0) < xlev) {
        /* C attrib.c:1104-1109: lower range */
        hp = ((rh ? rh.lofix : 0) | 0) + ((rr ? rr.lofix : 0) | 0);
        if (rh && rh.lornd > 0)
            hp += rnd(rh.lornd);
        if (rr && rr.lornd > 0)
            hp += rnd(rr.lornd);
    } else {
        /* C attrib.c:1110-1116: higher range */
        hp = ((rh ? rh.hifix : 0) | 0) + ((rr ? rr.hifix : 0) | 0);
        if (rh && rh.hirnd > 0)
            hp += rnd(rh.hirnd);
        if (rr && rr.hirnd > 0)
            hp += rnd(rr.hirnd);
    }
    /* C attrib.c:1117-1130: Con bonus.
     * JS u.acurr.a is in display order [Str,Dex,Con,Int,Wis,Cha].
     * C constant A_CON=4 maps to display index 2 (DISPLAY_TO_C[2]=4). */
    const con = u.acurr ? (u.acurr.a ? (u.acurr.a[2] | 0) : 0) : 0;
    if (con <= 3)       conplus = -2;
    else if (con <= 6)  conplus = -1;
    else if (con <= 14) conplus = 0;
    else if (con <= 16) conplus = 1;
    else if (con === 17) conplus = 2;
    else if (con === 18) conplus = 3;
    else                conplus = 4;
    hp += conplus;
    if (hp <= 0) hp = 1;
    /* C attrib.c:1135-1145: cap at MAXULEV; throttle after level 30 */
    if ((u.ulevel | 0) < MAXULEV) {
        if (!u.uhpinc) u.uhpinc = new Array(MAXULEV).fill(0);
        u.uhpinc[u.ulevel | 0] = hp;
    } else {
        /* C: char lim = 5 - u.uhpmax / 300; lim = max(lim, 1); */
        let lim = 5 - Math.trunc((u.uhpmax | 0) / 300);
        if (lim < 1) lim = 1;
        if (hp > lim) hp = lim;
    }
    return hp;
}
/* C ref: exper.c newpw(void) — mirrors C 1:1 including the u.ulevel==0 init
 * path (exper.c:49-54) AND the level-up path (exper.c:55-65).
 * Called with u.ulevel==0 during hero initialization (u_init.c:997) and with
 * u.ulevel>0 on level gain (exper.c:343). Score-neutral reunification of the
 * formerly-split newpwInit: same RNG order (role.enadv.inrnd then
 * race.enadv.inrnd, both via rnd(), only when > 0). */
export function newpw() {
    const g = game;
    const u = g.u || {};
    const initrole = (g.flags?.initrole ?? -1) | 0;
    const initrace = (g.flags?.initrace ?? -1) | 0;
    let en, enrnd, enfix;
    const re = (initrole >= 0 && initrole < ROLE_ENADV.length) ? ROLE_ENADV[initrole] : null;
    const rr = (initrace >= 0 && initrace < RACE_ENADV.length) ? RACE_ENADV[initrace] : null;
    const xlev = (initrole >= 0 && initrole < ROLE_XLEV.length) ? ROLE_XLEV[initrole] : 14;
    const MAXULEV = 30;
    if ((u.ulevel | 0) === 0) {
        /* C exper.c:49-54: initial spell power.
         *   en = role.enadv.infix + race.enadv.infix;
         *   if (role.enadv.inrnd > 0) en += rnd(role.enadv.inrnd);
         *   if (race.enadv.inrnd > 0) en += rnd(race.enadv.inrnd);
         * No enermod() on the init path. */
        en = ((re ? re.infix : 0) | 0) + ((rr ? rr.infix : 0) | 0);
        if (re && re.inrnd > 0)
            en += rnd(re.inrnd);
        if (rr && rr.inrnd > 0)
            en += rnd(rr.inrnd);
        /* C exper.c:66-79: shared tail (en<=0 → 1, ueninc cap). */
        if (en <= 0) en = 1;
        if ((u.ulevel | 0) < MAXULEV) {
            if (!u.ueninc) u.ueninc = new Array(MAXULEV).fill(0);
            u.ueninc[u.ulevel | 0] = en;
        }
        return en;
    }
    /* C exper.c:56: enrnd = (int) ACURR(A_WIS) / 2 (A_WIS=2); acurr adds
     * abon/atemp (worn items, e.g. helm of brilliance). */
    enrnd = Math.trunc(acurr(u, 2) / 2);
    if ((u.ulevel | 0) < xlev) {
        /* C exper.c:57-59: lower range */
        enrnd += ((re ? re.lornd : 0) | 0) + ((rr ? rr.lornd : 0) | 0);
        enfix  = ((re ? re.lofix : 0) | 0) + ((rr ? rr.lofix : 0) | 0);
    } else {
        /* C exper.c:60-63: higher range */
        enrnd += ((re ? re.hirnd : 0) | 0) + ((rr ? rr.hirnd : 0) | 0);
        enfix  = ((re ? re.hifix : 0) | 0) + ((rr ? rr.hifix : 0) | 0);
    }
    /* C exper.c:64: en = enermod(rn1(enrnd, enfix)) */
    en = enermod(rn1(enrnd, enfix));
    if (en <= 0) en = 1;
    /* C exper.c:68-79: cap at MAXULEV; throttle after level 30 */
    if ((u.ulevel | 0) < MAXULEV) {
        if (!u.ueninc) u.ueninc = new Array(MAXULEV).fill(0);
        u.ueninc[u.ulevel | 0] = en;
    } else {
        /* C: char lim = 4 - u.uenmax / 200; lim = max(lim, 1); */
        let lim = 4 - Math.trunc((u.uenmax | 0) / 200);
        if (lim < 1) lim = 1;
        if (en > lim) en = lim;
    }
    return en;
}
/* C ref: exper.c pluslvl(boolean incr)
 * incr=TRUE: incremental XP growth (newexplevel).
 * incr=FALSE: potion of gain level / wraith / wizard-mode #levelchange.
 * Mirrors exper.c:319-385.
 * Display: pluslvl's plines page through the ordinary update_topl width rule
 * only; C pluslvl itself never calls more()/xwaitforspace. */
export async function pluslvl(incr) {
    const g = game;
    const u = g.u || {};
    const MAXULEV = 30;
    if (!incr) {
        await pline('You feel more experienced.');
        await flush_screen(1);
    }
    if (Upolyd(u)) {
        const monHpInc = monhp_per_lvl(g.youmonst);
        u.mh = (u.mh | 0) + monHpInc;
        /* setuhpmax(u.mhmax, FALSE) — acts as setmhmax(): newmax equals the
         * current mhmax (no change there), but clips u.mh to it and sets
         * botl if the just-added monHpInc pushed u.mh over the cap. */
        setuhpmax(u.mhmax | 0, false);
    }
    /* C exper.c:337-340: newhp + setuhpmax */
    const hpinc = newhp();
    u.uhp = (u.uhp | 0) + hpinc;
    /* setuhpmax(u.uhpmax + hpinc, TRUE) — C attrib.c:1157-1176; the TRUE
     * (even_when_polyd) forces the non-Upolyd branch unconditionally,
     * regardless of the hero's current polymorph state. */
    setuhpmax((u.uhpmax | 0) + hpinc, true);
    /* C exper.c:342-347: newpw + uenmax/uen update */
    const eninc = newpw();
    u.uenmax = (u.uenmax | 0) + eninc;
    if ((u.uenmax | 0) > (u.uenpeak | 0))
        u.uenpeak = u.uenmax;
    u.uen = (u.uen | 0) + eninc;
    /* C exper.c:349-383: increase level */
    if ((u.ulevel | 0) < MAXULEV) {
        /* C exper.c:351 — `int old_ach_cnt, newrank, oldrank =
         * xlev_to_rank(u.ulevel);`, read BEFORE ++u.ulevel below. */
        const oldrank = xlev_to_rank(u.ulevel | 0);
        /* C exper.c:354-361: adjust uexp */
        if (incr) {
            const tmp = newuexp(u.ulevel + 1);
            if (clong(u.uexp) >= tmp)
                u.uexp = tmp - 1n;
        } else {
            /* C exper.c:360: u.uexp = newuexp(u.ulevel) */
            u.uexp = newuexp(u.ulevel);
        }
        ++u.ulevel;
        /* C exper.c:363-365: pline "Welcome [back ]to experience level N." */
        const wasHigher = (u.ulevelmax | 0) >= (u.ulevel | 0);
        await pline(`Welcome ${wasHigher ? 'back ' : ''}to experience level ${u.ulevel}.`);
        /* Per-pline update_topl: page if the Welcome line overflowed (frozen status
         * reflects the now-incremented level).  No-op for the kill-driven path. */
        if (!incr)
            await flush_screen(1);
        /* C exper.c:366-367: ulevelmax */
        if ((u.ulevelmax | 0) < (u.ulevel | 0))
            u.ulevelmax = u.ulevel;
        const old_ach_cnt = count_achievements();
        const newrank = xlev_to_rank(u.ulevel | 0);
        if (newrank > oldrank)
            record_achievement(achieve_rank(newrank));
        void old_ach_cnt;
        await adjabil((u.ulevel | 0) - 1, u.ulevel | 0);
        /* Per-pline update_topl: page if adjabil's intrinsic-gain plines overflowed. */
        if (!incr)
            await flush_screen(1);
        /* SET_BOTL */
        if (g.disp) g.disp.botl = 1;
        /* ulevelpeak */
        if ((u.ulevel | 0) > (u.ulevelpeak | 0))
            u.ulevelpeak = u.ulevel;
    }
    /* C exper.c:384: SET_BOTL() */
    if (g.disp) g.disp.botl = 1;
    if (!incr) {
        /* per-pline flush_screen() above already paged each overflow at the moment
         * its pline landed (matching update_topl timing + the frozen-status level);
         * a final flush_screen here is a no-op (the fitting tail does not overflow)
         * but is kept for the kill-impossible MAXULEV edge where no Welcome pline
         * ran yet a "You feel more experienced." remained accumulated. */
        await flush_screen(1);
    }
}
/* C ref: exper.c more_experienced(int exper, int rexp) — void, updates u.uexp/u.urexp */
export function more_experienced(exper, rexp) {
    const g = game;
    const u = g.u || {};
    exper |= 0;
    rexp |= 0;
    const oldexp = clong(u.uexp),
          oldrexp = clong(u.urexp);
    let newexp = clong(oldexp + BigInt(exper)),
        // C evaluates the RHS as int before assigning it to long.
        rexpincr = BigInt((Math.imul(4, exper) + rexp) | 0),
        newrexp = clong(oldrexp + rexpincr);

    /* cap experience and score on wraparound */
    if (newexp < 0n && exper > 0)
        newexp = LONG_MAX;
    if (newrexp < 0n && rexpincr > 0n)
        newrexp = LONG_MAX;

    if (newexp !== oldexp) {
        u.uexp = newexp;
        if (g.flags && g.flags.showexp)
            SET_BOTL();
        /* even when experience points aren't being shown, experience level
           might be highlighted with a percentage highlight rule and that
           percentage depends upon experience points */
        if (!(g.disp && g.disp.botl) && exp_percent_changing())
            SET_BOTL();
    }
    /* newrexp will always differ from oldrexp unless they're LONG_MAX */
    if (newrexp !== oldrexp) {
        u.urexp = newrexp;
        // SCORE_ON_BOTL is not enabled in the scored C build.
    }
    exp_log("more move=%ld delta=%d rexp=%d old=%ld new=%ld oldscore=%ld newscore=%ld level=%d",
            g.moves ?? 0, exper, rexp, oldexp, newexp, oldrexp, newrexp,
            u.ulevel | 0);
    if (exper || rexp) {
        /* inline newuexp(u.ulevel) */
        const lev = u.ulevel | 0;
        let need;
        if (lev < 1)
            need = 0;
        else if (lev < 10)
            need = 10 * (1 << lev);
        else if (lev < 20)
            need = 10000 * (1 << (lev - 10));
        else
            need = 10000000 * (lev - 19);
        event_log("xp[+%dxp +%drexp total=%ld need=%ld lvl=%d]",
                  exper, rexp, newexp, need, u.ulevel | 0);
    }
    if (clong(u.urexp) >= (g.urole?.mnum === PM_WIZARD ? 1000n : 2000n))
        g.flags.beginner = false;
}

function SET_BOTL() {
    const g = game;
    if (g.disp) g.disp.botl = 1;
}

function exp_percent_changing() {
    return false;
}

function event_log(fmt, ...args) {
    /* stub — not yet ported */
}

function exp_log(fmt, ...args) {
    /* stub — not yet ported */
}

export async function consumeUInitMiscHeroInitRng(_initrole, _initrace) {
    // u_init_misc() reads initrole/initrace from game.flags itself.
    await u_init_misc();
}


/* stubs for helpers not yet exported */
function SoundAchievement(a, b, c) { /* stub */ }

/* C ref: exper.c:212-298 losexp() */
export async function losexp(drainer) {
    const g = game;
    const u = g.u;
    let num, uhpmin, olduhpmax;

    /* override life-drain resistance when handling an explicit
       wizard mode request to reduce level; never fatal though */
    if (drainer && drainer === "#levelchange")
        drainer = null;
    else if (resists_drli(g.youmonst))
        return;

    /* level-loss message; "Goodbye level 1." is fatal; divine anger
       (drainer==NULL) resets a level 1 character to 0 experience points
       without reducing level and that isn't fatal so suppress the message
       in that situation */
    if (u.ulevel > 1 || drainer)
        pline(`${Goodbye()} level ${u.ulevel}.`);

    if (u.ulevel > 1) {
        u.ulevel -= 1;
        /* remove intrinsic abilities */
        await adjabil(u.ulevel + 1, u.ulevel);
        livelog_printf(LL_MINORAC, "lost experience level %d", u.ulevel + 1);
        SoundAchievement(0, sa2_xpleveldown, 0);
    } else { /* u.ulevel==1 */
        if (drainer) {
            if (!g.svk) g.svk = {};
            if (!g.svk.killer) g.svk.killer = {};
            g.svk.killer.format = KILLED_BY;
            if (g.svk.killer.name !== drainer)
                g.svk.killer.name = drainer;
            await done_real(DIED);
        }
        /* no drainer or lifesaved */
        if (u.ulevel > 1)
            return;
        u.uexp = 0n;
        livelog_printf(LL_MINORAC, "lost all experience");
    }

    olduhpmax = u.uhpmax;
    uhpmin = minuhpmax(10);
    num = u.uhpinc[u.ulevel] | 0;
    u.uhpmax -= num;
    if (u.uhpmax < uhpmin)
        setuhpmax(uhpmin, true);
    if (u.uhpmax > olduhpmax)
        setuhpmax(olduhpmax, true);

    u.uhp -= num;
    if (u.uhp < 1)
        u.uhp = 1;
    else if (u.uhp > u.uhpmax)
        u.uhp = u.uhpmax;

    num = u.ueninc[u.ulevel] | 0;
    u.uenmax -= num;
    if (u.uenmax < 0)
        u.uenmax = 0;
    u.uen -= num;
    if (u.uen < 0)
        u.uen = 0;
    else if (u.uen > u.uenmax)
        u.uen = u.uenmax;

    if (clong(u.uexp) > 0n)
        u.uexp = newuexp(u.ulevel) - 1n;

    /* C you.h:554 Upolyd := (u.umonnum != u.umonster), not the mtimedone timer. */
    if ((g.u.umonnum | 0) !== (g.u.umonster | 0)) { /* Upolyd */
        num = monhp_per_lvl(g.youmonst);
        u.mhmax -= num;
        u.mh -= num;
        if (u.mh <= 0)
            await rehumanize_real();
    }

    if (g.disp) g.disp.botl = 1; /* SET_BOTL */
}
