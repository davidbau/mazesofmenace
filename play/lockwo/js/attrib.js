// attrib.js — attribute exercise / abuse.
// C ref: attrib.c.  Only the RNG-bearing routine exercised by the quaff /
// zap / cast gameplay sessions is ported here.

import { game } from './gstate.js';
import { rn2, rn1, rnd, d } from './rng.js';
import { A_STR, A_INT, A_WIS, A_CON, A_CHA, A_MAX, POISONING } from './const.js';
import { adj_erinys } from './makemon.js';

const AVAL = 50; // C ref: attrib.c — tune value for exercise gains.

// C ref: attrib.h ATTRMIN(A_STR) = gu.urace.attrmin[A_STR] — 3 for every
// currently-modeled race (role.c races[].attrmin is uniformly {3,3,3,3,3,3}).
const ATTRMIN_STR = 3;

// C ref: attrib.h ACURR(x) — current attribute value.  acurr.a is in
// [Str,Int,Wis,Dex,Con,Cha] order.
function ACURR(i) {
    return game.u?.acurr?.a?.[i] ?? 0;
}

// C ref: attrib.c acurr(chridx) — the effective attribute = abon+atemp+acurr,
// clamped to [3,25] for the non-STR characteristics.  Wounded legs lower
// atemp[A_DEX] by 1, so the effective Dex (used by e.g. the allmain.c:360
// u_wipe_engr roll) drops accordingly.  STR's encoded value is not adjusted
// here (its hunger/loss path is modelled elsewhere); callers that need STR use
// acurrstr().  abon/atemp default to 0 so this is a no-op for unaffected heroes.
// C ref: attrib.c acurr() `if (x == A_STR) { if (uarmg && uarmg->otyp ==
// GAUNTLETS_OF_POWER && !Upolyd) return 125; ... }` — worn gauntlets of power
// PIN the encoded strength at 125 (displayed "St:25"), overriding abase/abon
// entirely.  Missing here, the status line kept showing the hero's own Str and
// every ACURR(A_STR) predicate read the wrong number.
const GAUNTLETS_OF_POWER_OTYP = 161;
export function acurr_str_encoded() {
    const u = game.u;
    if (game.uarmg?.otyp === GAUNTLETS_OF_POWER_OTYP && !u?.Upolyd) return 125;
    return u?.acurr?.a?.[A_STR] ?? 0;
}
export function acurr_eff(i) {
    const u = game.u;
    const base = u?.acurr?.a?.[i] ?? 0;
    if (i === A_STR) return acurr_str_encoded();
    const v = base + (u?.atemp?.a?.[i] || 0) + (u?.abon?.a?.[i] || 0);
    return v > 25 ? 25 : v < 3 ? 3 : v;
}

// C ref: attrib.h AEXE(x) — exercise accumulator; lazily allocated to zeros.
function ensureAexe() {
    game.u = game.u || {};
    if (!game.u.aexe) game.u.aexe = { a: Array(A_MAX).fill(0) };
    return game.u.aexe.a;
}

// C ref: attrib.c exercise(i, inc_or_dec).  A_INT/A_CHA can't be exercised
// (early return, no RNG).  Polymorph blocks all but A_WIS (no Upolyd at game
// start).  When |AEXE(i)| < AVAL the accumulator is nudged: a gain rolls
// rn2(19) > ACURR(i) (harder at higher attributes), a loss is -rn2(2).
// encumber_msg() (A_STR/A_CON when moves>0) consumes no RNG.
export function exercise(i, inc_or_dec) {
    if (i === A_INT || i === A_CHA)
        return;
    if (game.u?.Upolyd && i !== A_WIS)
        return;
    const aexe = ensureAexe();
    if (Math.abs(aexe[i] ?? 0) < AVAL) {
        aexe[i] = (aexe[i] ?? 0)
            + (inc_or_dec ? (rn2(19) > ACURR(i) ? 1 : 0) : -rn2(2));
    }
    // encumber_msg() for A_STR/A_CON is display-only; no RNG, omitted.
}

// C ref: hack.c losehp(dmg,...) — subtract dmg from u.uhp.  Death handling
// (k_format/knam) isn't reached by the covered sessions, so this is just the
// HP subtraction (clamped at 0, matching every other file-local losehp()).
function losehp(dmg) {
    const u = game.u;
    if (!u || dmg <= 0) return;
    u.uhp = (u.uhp ?? 0) - dmg;
    if (u.uhp < 0) u.uhp = 0;
}

// C ref: attrib.c losestr(num,...) — Strength loss (poison, certain monster
// hits).  ABASE(A_STR) drops by num; if that would take it below
// ATTRMIN(A_STR), C's while loop (attrib.c:232-237) walks the excess up to
// the floor one point at a time, each point rolling rn1(4,3) extra HP damage
// (via losehp) before the (now-clamped) adjattrib(A_STR,-num,1) call, which is
// silent (msgflg>0 suppresses "You feel weaker!").
export function losestr(num) {
    const u = game.u;
    if (!u?.acurr || num <= 0) return;
    const abase = u.acurr.a;
    let ustr = (abase[A_STR] ?? 0) - num;
    let dmg = 0;
    while (ustr < ATTRMIN_STR) {
        ustr++;
        num--;
        dmg += rn1(4, 3); // eat.c:1932-via-attrib.c:235 amt = rn1(4,3) => 3..6
    }
    if (dmg) losehp(dmg);
    if (num > 0) abase[A_STR] = Math.max(ATTRMIN_STR, (abase[A_STR] ?? 0) - num);
}

// C ref: attrib.c poison_strdmg(strloss, dmg,...) — combined Strength loss +
// HP damage from poison (eat.c eatcorpse poisonous-corpse branch, fountain.c
// contamination, spell.c miscast, etc.).
export function poison_strdmg(strloss, dmg) {
    losestr(strloss);
    losehp(dmg);
}

// ═══ attrib.c:114 adjattrib(ndx, incr, msgflg) ══════════════════════════════
// msgflg: positive => silent, zero => always message, negative => message only
// when the value actually moved.  Returns TRUE when ACURR changed.
// RNG: the only draw is the underflow arm (base pushed below ATTRMIN takes a
// slice off AMAX instead) — rn2(ATTRMIN - ABASE + 1).
const PLUSATTR = ['strong', 'smart', 'wise', 'agile', 'tough', 'charismatic'];
const MINUSATTR = ['weak', 'stupid', 'foolish', 'clumsy', 'fragile', 'repulsive'];
export async function adjattrib(ndx, incr, msgflg) {
    const u = game.u;
    if (!u?.acurr) return false;
    if (Fixed_abil() || !incr) return false;
    // uarmh == DUNCE_CAP blocks A_INT/A_WIS changes (no dunce cap in reach).
    const abase = u.acurr.a;
    u.amax = u.amax || { a: abase.slice() };
    const amax = u.amax.a;
    const { race_attrmin, race_attrmax } = await import('./u_init.js');
    const ATTRMIN = race_attrmin(), ATTRMAX = race_attrmax();
    const old_acurr = acurr_eff(ndx), old_abase = abase[ndx] | 0,
        old_amax = amax[ndx] | 0;
    let attrstr, abonflg;
    abase[ndx] = (abase[ndx] | 0) + incr;
    if (incr > 0) {
        if (abase[ndx] > amax[ndx]) {
            amax[ndx] = abase[ndx];
            if (amax[ndx] > ATTRMAX[ndx]) abase[ndx] = amax[ndx] = ATTRMAX[ndx];
        }
        attrstr = PLUSATTR[ndx];
        abonflg = (u.abon?.a?.[ndx] | 0) < 0;
    } else {
        if (abase[ndx] < ATTRMIN[ndx]) {
            const decr = rn2(ATTRMIN[ndx] - abase[ndx] + 1);   // attrib.c:166
            abase[ndx] = ATTRMIN[ndx];
            amax[ndx] -= decr;
            if (amax[ndx] < ATTRMIN[ndx]) amax[ndx] = ATTRMIN[ndx];
        }
        attrstr = MINUSATTR[ndx];
        abonflg = (u.abon?.a?.[ndx] | 0) > 0;
    }
    const { update_topl } = await import('./display.js');
    if (acurr_eff(ndx) === old_acurr) {
        if (msgflg === 0) {
            if (abase[ndx] === old_abase && amax[ndx] === old_amax)
                await update_topl(`You're ${abonflg ? 'currently' : 'already'} as ${attrstr} as you can get.`);
            else
                await update_topl(`Your innate ${ATTRNAME[ndx]} has ${incr > 0 ? 'improved' : 'declined'}.`);
        }
        return false;
    }
    ensureAexe()[ndx] = 0;
    game.disp_botl = true;
    game.botl = true;
    if (msgflg <= 0)
        await update_topl(`You feel ${(incr > 1 || incr < -1) ? 'very ' : ''}${attrstr}!`);
    if ((ndx === A_STR || ndx === A_CON)) {
        const { encumber_msg } = await import('./invent.js');
        await encumber_msg();
    }
    return true;
}
const ATTRNAME = ['strength', 'intelligence', 'wisdom', 'dexterity',
    'constitution', 'charisma'];
// C ref: attrib.h Fixed_abil — the amulet/artifact that pins the stats.  No
// covered hero carries one.
function Fixed_abil() { return !!(game.u?.uprops?.Fixed_abil); }

// C ref: attrib.c:433 poisontell(typ, exclaim).
const POISEFF = [['You feel ', 'weaker'], ['Your ', 'brain is on fire'],
    ['Your ', 'judgement is impaired'], ['Your ', "muscles won't obey you"],
    ['You feel ', 'very sick'], ['You ', 'break out in hives']];
export async function poisontell(typ, exclaim) {
    let [lead, txt] = POISEFF[typ];
    if (typ === A_STR && acurr_eff(A_STR) === 125) txt = 'innately weaker';
    else if (typ === A_CON && acurr_eff(A_CON) === 25) txt = 'sick inside';
    const { update_topl } = await import('./display.js');
    await update_topl(`${lead}${txt}${exclaim ? '!' : '.'}`);
}

// ═══ attrib.c:316 poisoned(reason, typ, pkiller, fatal, thrown_weapon) ══════
// Called when an attack or trap has poisoned the hero.  RNG, in order:
//   rn2(fatal + (thrown_weapon ? 20 : 0))            [attrib.c:362]
//   i == 0 && typ != A_CHA : d(4,6)                  [instant-kill arm]
//   i > 5                  : rnd(6) / rn1(10,6)      [HP damage arm]
//   else                   : d(2,2)                  [attrib.c:395 stat loss]
// The leading pline() is skipped when `reason` already says "poison" — the
// caller's own message covered it.
export async function poisoned(reason, typ, pkiller, fatal, thrown_weapon) {
    const u = game.u || {};
    const { update_topl } = await import('./display.js');
    const blast = reason === 'blast';
    if (!blast && !/poison/i.test(reason)) {
        const plural = reason[reason.length - 1] === 's';
        await update_topl(`${/^[A-Z]/.test(reason) ? '' : 'The '}${reason} ${plural ? 'were' : 'was'} poisoned!`);
    }
    if (Poison_resistance()) {
        await update_topl("The poison doesn't seem to affect you.");
        return;
    }
    let loss;
    const i = !fatal ? 1 : rn2(fatal + (thrown_weapon ? 20 : 0));   // attrib.c:362
    if (i === 0 && typ !== A_CHA) {
        loss = 6 + d(4, 6);                                          // attrib.c:366
        if ((u.uhp | 0) <= loss) {
            u.uhp = -1;
            game.disp_botl = true; game.botl = true;
            await update_topl('The poison was deadly...');
        } else {
            const olduhp = u.uhp | 0;
            u.uhpmax = Math.max((u.uhpmax | 0) - ((loss / 2) | 0), 3);
            if (loss >= olduhp) loss = olduhp - 1;   // adjuhploss: never fatal here
            u.uhp = olduhp - loss;
            game.disp_botl = true; game.botl = true;
            if (await adjattrib(A_CON, (typ !== A_CON) ? -1 : -3, 1))
                await poisontell(A_CON, true);
            if (typ !== A_CON && await adjattrib(typ, -3, 1))
                await poisontell(typ, true);
        }
    } else if (i > 5) {
        loss = thrown_weapon ? rnd(6) : rn1(10, 6);                  // attrib.c:388
        u.uhp = (u.uhp | 0) - loss;
        game.disp_botl = true; game.botl = true;
    } else {
        loss = (thrown_weapon || !fatal) ? 1 : d(2, 2);              // attrib.c:395
        if (await adjattrib(typ, -loss, 1))
            await poisontell(typ, true);
    }
    if ((u.uhp | 0) < 1) {
        // C ref: attrib.c:405 — done(strstri(pkiller,"poison") ? DIED : POISONING).
        const { done, DIED } = await import('./end.js');
        game._killer_name = pkiller;
        await done(/poison/i.test(pkiller || '') ? DIED : POISONING);
    }
    const { encumber_msg } = await import('./invent.js');
    await encumber_msg();
}
function Poison_resistance() {
    const u = game.u || {};
    return !!(u.uprops?.Poison_resistance || u.HPoison_resistance
        || u.EPoison_resistance || u.Poison_resistance);
}

// C ref: align.h ALIGNLIM = (10L + (svm.moves / 200L)) — the cap on how good
// the hero's alignment record can get.
export function ALIGNLIM() {
    return 10 + Math.floor((game.moves | 0) / 200);
}

// C ref: attrib.c adjalign(n) — the ONLY writer of u.ualign.record.  A negative
// n also accumulates u.ualign.abuse (which peace_minded()'s erinys arm reads),
// and both directions are one-way: a gain that would not raise the record, or a
// loss that would not lower it, is discarded.
export function adjalign(n) {
    const u = game.u;
    if (!u) return;
    u.ualign = u.ualign || { type: 0, record: 0 };
    const cur = u.ualign.record | 0;
    const newalign = cur + n;
    if (n < 0) {
        const newabuse = (u.ualign.abuse | 0) - n;
        if (newalign < cur) u.ualign.record = newalign;
        // C ref: attrib.c:1309 — raising abuse also runs adj_erinys(), which
        // rewrites mons[PM_ERINYS] in place (mlevel = min(7 + abuse, 50)).  No
        // RNG here, but the new mlevel feeds adj_lev() -> newmonhp()'s d(lvl,8)
        // for every erinys made afterwards.
        if (newabuse > (u.ualign.abuse | 0)) { u.ualign.abuse = newabuse; adj_erinys(newabuse); }
    } else if (newalign > cur) {
        u.ualign.record = Math.min(newalign, ALIGNLIM());
    }
}
