// exper.js — Experience / level-up.
// C ref: exper.c — experience, more_experienced, newuexp, newexplevel,
//         newpw, pluslvl (partial), losexp (D-1033 / D-1203 #levelchange);
//         callers in mon.c xkilled / wizcmds / sit.c special_throne_effect / …

import { game } from './gstate.js';
import { rn1, rn2, rnd } from './rng.js';
import { MAXULEV, NATTK, LARGEST_INT, Upolyd, LL_MINORAC, KILLED_BY, DIED, MAGICAL_BREATHING } from './const.js';
import { pline } from './display.js';
import { acurr, A_WIS, newhp, adjabil, minuhpmax } from './attrib.js';
import { resists_drli } from './zap.js';
import { monhp_per_lvl } from './makemon.js';
import { rehumanize } from './polyself.js';
import { find_mac } from './mhitm.js';
import { NORMAL_SPEED } from './mon.js';
import { extra_nasty, amphibious } from './monsters.js';
import { Goodbye, xlev_to_rank } from './roles.js';
import {
    PM_CLERIC,
    PM_WIZARD,
    PM_HEALER,
    PM_KNIGHT,
    PM_BARBARIAN,
    PM_VALKYRIE,
    monsterNames,
} from './generated/monsters_data.js';
import { achieve_rank, count_achievements, record_achievement } from './insight.js';
import { livelog_printf } from './pline.js';
import { done } from './end.js';
import { exp_percent_changing } from './botl.js';

// C ref: monattk.h — experience() compares against these exact values
const AT_BUTT = 4;
const AT_WEAP = 254;
const AT_MAGC = 255;
const AD_PHYS = 0;
const AD_BLND = 11;
const AD_DRLI = 15;
const AD_STON = 18;
const AD_SLIM = 40;
const AD_WRAP = 28;

// C ref: exper.c:139 `mtmp->data == &mons[PM_MAIL_DAEMON]` — pointer compare
// becomes the permonst mndx compare (monmove.js:1854 / mhitm.js:3586 shape).
const PM_MAIL_DAEMON = monsterNames.indexOf('PM_MAIL_DAEMON');

/**
 * C ref: youprop.h:272 Amphibious = HMagical_breathing || EMagical_breathing
 * || amphibious(youmonst.data). Macro expanded file-local (not exported) in
 * the teleport.js:273 / mhitu.js:2453 uprop-read shape; used only by
 * experience() :125 below.
 */
function Amphibious_hero() {
    const u = game.u || {};
    const prop = u.uprops?.[MAGICAL_BREATHING];
    if ((u.HMagical_breathing | 0) || (u.EMagical_breathing | 0)
        || (prop?.intrinsic | 0) || (prop?.extrinsic | 0)) {
        return true;
    }
    return amphibious(game.youmonst?.data);
}

// C ref: exper.c newuexp()
export function newuexp(lev) {
    if (lev < 1) return 0;
    if (lev < 10) return (10 * (1 << lev)) | 0;
    if (lev < 20) return (10000 * (1 << (lev - 10))) | 0;
    return (10000000 * ((lev - 19) | 0)) | 0;
}

// C ref: exper.c enermod()
function enermod(en) {
    switch (game.urole?.mnum) {
        case PM_CLERIC:
        case PM_WIZARD:
            return (2 * en) | 0;
        case PM_HEALER:
        case PM_KNIGHT:
            return Math.trunc((3 * en) / 2);
        case PM_BARBARIAN:
        case PM_VALKYRIE:
            return Math.trunc((3 * en) / 4);
        default:
            return en | 0;
    }
}

// C ref: exper.c newpw() — init (ulevel==0) and level-up paths
export function newpw() {
    const u = game.u;
    const roleAdv = game.urole?.enadv || { infix: 1, inrnd: 0 };
    const raceAdv = game.urace?.enadv || { infix: 1, inrnd: 0 };
    let en = 0;
    if ((u.ulevel | 0) === 0) {
        en = (roleAdv.infix | 0) + (raceAdv.infix | 0);
        if ((roleAdv.inrnd | 0) > 0) en += rnd(roleAdv.inrnd);
        if ((raceAdv.inrnd | 0) > 0) en += rnd(raceAdv.inrnd);
    } else {
        let enrnd = (acurr(A_WIS) / 2) | 0;
        let enfix;
        const xlev = game.urole?.xlev ?? 14;
        if ((u.ulevel | 0) < xlev) {
            enrnd += (roleAdv.lornd | 0) + (raceAdv.lornd | 0);
            enfix = (roleAdv.lofix | 0) + (raceAdv.lofix | 0);
        } else {
            enrnd += (roleAdv.hirnd | 0) + (raceAdv.hirnd | 0);
            enfix = (roleAdv.hifix | 0) + (raceAdv.hifix | 0);
        }
        en = enermod(rn1(enrnd, enfix));
    }
    if (en <= 0) en = 1;
    if ((u.ulevel | 0) < MAXULEV) {
        if (!u.ueninc) u.ueninc = [];
        u.ueninc[u.ulevel | 0] = en;
    } else {
        let lim = 4 - Math.trunc((u.uenmax || 0) / 200);
        if (lim < 1) lim = 1;
        if (en > lim) en = lim;
    }
    return en;
}

/**
 * C ref: attrib.c setuhpmax(newmax, even_when_polyd).
 * When Upolyd && !even_when_polyd, updates mhmax/mh instead of uhpmax/uhp.
 */
export function setuhpmax(newmax, evenWhenPolyd) {
    const u = game.u || (game.u = {});
    if (!game.flags) game.flags = {};
    if (!Upolyd(u) || evenWhenPolyd) {
        if ((u.uhpmax || 0) !== newmax) {
            u.uhpmax = newmax;
            if ((u.uhppeak || 0) < u.uhpmax) u.uhppeak = u.uhpmax;
            game.flags.botl = true;
        }
        if ((u.uhp || 0) > (u.uhpmax || 0)) {
            u.uhp = u.uhpmax;
            game.flags.botl = true;
        }
    } else {
        if ((u.mhmax || 0) !== newmax) {
            u.mhmax = newmax;
            game.flags.botl = true;
        }
        if ((u.mh || 0) > (u.mhmax || 0)) {
            u.mh = u.mhmax;
            game.flags.botl = true;
        }
    }
}

/**
 * C ref: exper.c rndexp(gaining) — XP for newman / potion-of-gain-level.
 * Named omission: MAXULEV+gaining wrap-guard path rarely hit here.
 */
export function rndexp(gaining) {
    const u = game.u || {};
    const ulev = u.ulevel | 0;
    const minexp = (ulev === 1) ? 0 : newuexp(ulev - 1);
    const maxexp = newuexp(ulev);
    let diff = maxexp - minexp;
    let factor = 1;
    while (diff >= LARGEST_INT) {
        diff = Math.trunc(diff / 2);
        factor *= 2;
    }
    let result = minexp + factor * rn2(diff | 0);
    if (ulev === MAXULEV && gaining) {
        result += ((u.uexp | 0) - minexp);
        if (result < (u.uexp | 0)) result = u.uexp | 0;
    }
    return result;
}

/**
 * C ref: exper.c pluslvl(incr) :306–372
 * incr false: potion / #levelchange / wraith (You_feel + set xp).
 * Upolyd arm live (monhp_per_lvl :320 before newhp :324).
 * SoundAchievement deferred (no SND_LIB).
 */
export async function pluslvl(incr) {
    const u = game.u || (game.u = {});
    if (!incr) await pline('You feel more experienced.');

    // C `:317–323` — increase hit points (when polymorphed, do monster
    // form first in order to retain normal human/whatever increase for
    // later): monhp_per_lvl draw, mh += hpinc, then setuhpmax(mhmax,
    // FALSE) acts as setmhmax() when Upolyd (clamps mh to mhmax).
    if (Upolyd(u)) {
        const hpincUp = monhp_per_lvl(game.youmonst); // C `:320`
        u.mh = (u.mh || 0) + hpincUp; // C `:321`
        setuhpmax(u.mhmax || 0, false); // C `:322`
    }
    const hpinc = newhp(); // C `:324`
    u.uhp = (u.uhp || 0) + hpinc;
    setuhpmax((u.uhpmax || 0) + hpinc, true);

    const eninc = newpw();
    u.uenmax = (u.uenmax || 0) + eninc;
    if ((u.uenpeak || 0) < u.uenmax) u.uenpeak = u.uenmax;
    u.uen = (u.uen || 0) + eninc;

    if ((u.ulevel | 0) < MAXULEV) {
        const oldlevel = u.ulevel | 0;
        const oldrank = xlev_to_rank(oldlevel);
        // C: increase experience points to reflect new level BEFORE ++ulevel
        if (incr) {
            const tmp = newuexp(oldlevel + 1);
            if ((u.uexp | 0) >= tmp) u.uexp = tmp - 1;
        } else {
            u.uexp = newuexp(oldlevel);
        }
        u.ulevel = oldlevel + 1;
        const back = (u.ulevelmax | 0) < (u.ulevel | 0) ? '' : 'back ';
        await pline(`Welcome ${back}to experience level ${u.ulevel}.`);
        if ((u.ulevelmax | 0) < (u.ulevel | 0)) u.ulevelmax = u.ulevel;
        await adjabil(oldlevel, u.ulevel);
        // C: SoundAchievement(0, sa2_xplevelup, 0) deferred (no SND_LIB)
        // C ref: exper.c pluslvl — a new rank achievement logs its own
        // message via record_achievement; log the simpler minorac line
        // only when no achievement was added (rank unchanged or regained
        // level whose rank achievement already exists and is not repeated).
        const old_ach_cnt = count_achievements();
        const newrank = xlev_to_rank(u.ulevel | 0);
        if (newrank > oldrank) record_achievement(achieve_rank(newrank));
        if (count_achievements() === old_ach_cnt) {
            livelog_printf(LL_MINORAC, '%sgained experience level %d',
                ((u.ulevel | 0) <= (u.ulevelpeak | 0)) ? 're' : '', u.ulevel | 0);
        }
        if ((u.ulevel | 0) > (u.ulevelpeak | 0)) u.ulevelpeak = u.ulevel;
    }
    if (!game.flags) game.flags = {};
    game.flags.botl = true;
}

/**
 * C ref: exper.c experience(mtmp, nk) :85–166 — XP awarded for killing mtmp,
 * in C order with per-arm cites. (Pre-existing guard: C takes NONNULLARG1
 * and would deref; JS returns 1 on missing data.)
 */
export function experience(mtmp, nk) {
    const ptr = mtmp?.data; // C :87
    if (!ptr) return 1;
    const m_lev = mtmp.m_lev | 0;
    let tmp = 1 + m_lev * m_lev; // C :90
    // C :93–94 — higher AC gives extra experience.
    let i = find_mac(mtmp);
    if (i < 3) tmp += (7 - i) * (i < 0 ? 2 : 1);

    // C :97–98 — very fast monsters give extra experience.
    const mmove = ptr.mmove | 0;
    if (mmove > NORMAL_SPEED) {
        tmp += mmove > Math.trunc((3 * NORMAL_SPEED) / 2) ? 5 : 3;
    }

    // C :101–111 — each "special" attack type gives extra experience.
    const mattk = ptr.mattk || [];
    for (i = 0; i < NATTK; i++) {
        const tmp2 = mattk[i]?.aatyp | 0;
        if (tmp2 > AT_BUTT) {
            if (tmp2 === AT_WEAP) tmp += 5;
            else if (tmp2 === AT_MAGC) tmp += 10;
            else tmp += 3;
        }
    }
    // C :114–127 — each "special" damage type gives extra experience.
    for (i = 0; i < NATTK; i++) {
        const slot = mattk[i] || { adtyp: 0, damn: 0, damd: 0 };
        const tmp2 = slot.adtyp | 0;
        if (tmp2 > AD_PHYS && tmp2 < AD_BLND) tmp += 2 * m_lev;
        else if (tmp2 === AD_DRLI || tmp2 === AD_STON || tmp2 === AD_SLIM) tmp += 50;
        else if (tmp2 !== AD_PHYS) tmp += m_lev;
        // C :123–124 — extra heavy damage bonus.
        if (((slot.damd | 0) * (slot.damn | 0)) > 23) tmp += m_lev;
        // C :125–126 — eel AD_WRAP is +1000 unless the hero is Amphibious.
        // mlet is the 'S_EEL' string in JS (allmain.js:425 shape).
        if (tmp2 === AD_WRAP && ptr.mlet === 'S_EEL' && !Amphibious_hero()) tmp += 1000;
    }
    // C :130–131 — "extra nasty" monsters give even more.
    if (extra_nasty(ptr)) tmp += 7 * m_lev;
    // C :134–135 — higher-level bonus.
    if (m_lev > 8) tmp += 50;

    // C :137–141 — mail daemons put up no fight (MAIL_STRUCTURES is always
    // on per global.h:430; uhitm.js:151 precedent).
    if ((ptr?.mndx ?? -1) === PM_MAIL_DAEMON) tmp = 1;

    // C :143–163 — repeated killings of "the same monster" scale down.
    if (mtmp.mrevived || mtmp.mcloned) {
        let tmp2 = 20;
        let nkLeft = nk | 0;
        for (i = 0; nkLeft > tmp2 && tmp > 1; ++i) {
            tmp = Math.trunc((tmp + 1) / 2);
            nkLeft -= tmp2;
            if (i & 1) tmp2 += 20;
        }
    }
    return tmp; // C :165
}

/** C ref: exper.c more_experienced(exper, rexp) */
export function more_experienced(exper, rexp) {
    const u = game.u || (game.u = {});
    if (!game.flags) game.flags = {};
    const oldexp = u.uexp | 0;
    const oldrexp = u.urexp | 0;
    const newexp = oldexp + (exper | 0);
    const rexpincr = 4 * (exper | 0) + (rexp | 0);
    const newrexp = oldrexp + rexpincr;
    // LONG_MAX wrap deferred — JS Number stays finite for early-game totals
    if (newexp !== oldexp) {
        u.uexp = newexp;
        if (game.flags.showexp) game.flags.botl = true; // C :185-186 disp.botl
        // C :187-191 — Xp percentage highlight can request a refresh when
        // experience points themselves are not on the status line.
        if (!game.flags.botl && exp_percent_changing()) game.flags.botl = true;
    }
    if (newrexp !== oldrexp) {
        u.urexp = newrexp;
        // SCORE_ON_BOTL showscore deferred
    }
    const beginnerCap = game.urole?.mnum === PM_WIZARD ? 1000 : 2000;
    if ((u.urexp | 0) >= beginnerCap) game.flags.beginner = false;
}

/** C ref: exper.c newexplevel() */
export async function newexplevel() {
    const u = game.u || {};
    if ((u.ulevel | 0) < MAXULEV && (u.uexp | 0) >= newuexp(u.ulevel | 0)) {
        await pluslvl(true);
    }
}

/**
 * C ref: exper.c losexp `:207–291` — drain one experience level, in C order.
 * Level-1 drain with a drainer is fatal `:233–237` (killer KILLED_BY,
 * killer.name=drainer, done(DIED)); done() returns on Lifesaved or a
 * declined wizard/explore "Die?", then play continues below like C (D-1894).
 * Named omissions: SoundAchievement `:231` (no SND_LIB, same as pluslvl);
 * fuzzer_savelife (debug-fuzz only — the `:240–243` early return is kept).
 */
export async function losexp(drainer) {
    const u = game.u || (game.u = {});
    // C `:212–217` — explicit #levelchange overrides life-drain
    // resistance and is never fatal (drainer becomes Null).
    if (drainer && drainer === '#levelchange') {
        drainer = null;
    } else if (resists_drli(game.youmonst)) { // C `:216` — mondata.c resists_drli
        return;
    }

    // C `:219–224` — level-loss message; "Goodbye level 1." is fatal;
    // divine anger (drainer==NULL) on a level-1 character resets to 0 XP
    // silently.
    if ((u.ulevel | 0) > 1 || drainer) {
        await pline(`${Goodbye()} level ${u.ulevel | 0}.`);
    }

    if ((u.ulevel | 0) > 1) {
        // C `:226–231` — lose the level, shed intrinsics, chronicle it.
        u.ulevel = (u.ulevel | 0) - 1;
        await adjabil((u.ulevel | 0) + 1, u.ulevel | 0);
        livelog_printf(LL_MINORAC, 'lost experience level %d', (u.ulevel | 0) + 1);
    } else { // C `:232` — ulevel==1
        if (drainer) {
            // C `:233–237` — fatal drain: killer KILLED_BY + drainer name.
            // svk.killer.name != drainer is a pointer check; the JS string
            // compare is its value equivalent.
            if (!game.killer) game.killer = { name: '', format: 0 };
            game.killer.format = KILLED_BY;
            if (game.killer.name !== drainer) game.killer.name = drainer;
            await done(DIED);
        }
        // C `:239–243` — no drainer, or lifesaved: a debug-fuzz
        // fuzzer_savelife() blessed restore-ability can raise ulevel past 1.
        if ((u.ulevel | 0) > 1) return;
        u.uexp = 0; // C `:244`
        livelog_printf(LL_MINORAC, 'lost all experience'); // C `:245`
    }

    // C `:247` assert(ulevel in range) — valid array index by construction.
    const olduhpmax = u.uhpmax | 0; // C `:249`
    const uhpmin = minuhpmax(10); // C `:250` — same minimum as life-saving
    const numHp = (u.uhpinc?.[u.ulevel | 0] | 0); // C `:251`
    u.uhpmax = olduhpmax - numHp; // C `:252`
    if ((u.uhpmax | 0) < uhpmin) setuhpmax(uhpmin, true); // C `:253–254`
    // C `:255–259` — never let uhpmax go up (strength-loss, fire-trap and
    // Death minimums differ); healing-wielder drain assumes no rise.
    if ((u.uhpmax | 0) > olduhpmax) setuhpmax(olduhpmax, true); // C `:260–261`

    u.uhp = (u.uhp | 0) - numHp; // C `:263`
    if ((u.uhp | 0) < 1) u.uhp = 1; // C `:264–265`
    else if ((u.uhp | 0) > (u.uhpmax | 0)) u.uhp = u.uhpmax; // C `:266–267`

    const numEn = (u.ueninc?.[u.ulevel | 0] | 0); // C `:269`
    u.uenmax = (u.uenmax | 0) - numEn; // C `:270`
    if ((u.uenmax | 0) < 0) u.uenmax = 0; // C `:271–272`
    u.uen = (u.uen | 0) - numEn; // C `:273`
    if ((u.uen | 0) < 0) u.uen = 0; // C `:274–275`
    else if ((u.uen | 0) > (u.uenmax | 0)) u.uen = u.uenmax; // C `:276–277`

    if ((u.uexp | 0) > 0) u.uexp = newuexp(u.ulevel | 0) - 1; // C `:279–280`

    if (Upolyd(u)) { // C `:282–288`
        const numUp = monhp_per_lvl(game.youmonst); // C `:283`
        u.mhmax = (u.mhmax | 0) - numUp; // C `:284`
        u.mh = (u.mh | 0) - numUp; // C `:285`
        if ((u.mh | 0) <= 0) await rehumanize(); // C `:286–287`
    }

    if (!game.flags) game.flags = {}; // C `:290` disp.botl = TRUE
    game.flags.botl = true;
    if (game.disp) game.disp.botl = true;
}
