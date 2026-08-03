// attrib.js — attribute exercise / abuse.
// C ref: attrib.c.  Only the RNG-bearing routine exercised by the quaff /
// zap / cast gameplay sessions is ported here.

import { game } from './gstate.js';
import { rn2, rn1 } from './rng.js';
import { A_STR, A_INT, A_WIS, A_CON, A_CHA, A_MAX } from './const.js';

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
export function acurr_eff(i) {
    const u = game.u;
    const base = u?.acurr?.a?.[i] ?? 0;
    if (i === A_STR) return base;
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
        // adj_erinys(newabuse) only arms a future erinys spawn; no RNG here.
        if (newabuse > (u.ualign.abuse | 0)) u.ualign.abuse = newabuse;
    } else if (newalign > cur) {
        u.ualign.record = Math.min(newalign, ALIGNLIM());
    }
}
