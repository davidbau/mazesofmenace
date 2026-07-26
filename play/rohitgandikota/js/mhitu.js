// mhitu.js — a monster attacking the hero.
// C ref: src/mhitu.c
//
// Only could_seduce() so far, which arrived because hitmm() and missmm() in
// js/mhitm.js both call it. Despite living in mhitu.c it is not a hero-only
// function: mattackm() uses it to decide whether a monster-vs-monster attack
// reads as an attack or as a pass.

import { game } from './gstate.js';
import { M_ATTK_MISS, MATTK_AATYP, MATTK_ADTYP, MATTK_DAMN, MATTK_DAMD } from './const.js';
import { is_animal, perceives, dmgtype, gender } from './mondata.js';
import { poly_gender } from './polyself.js';
import { Invis, See_invisible } from './youprop.js';
import { ATTKS, MONSYMS, PMNAMES } from './monst_data.js';

// src/sys.c:100 sysopt.seduce — "if it's compiled in, default to on", and the
// SEDUCE=0 line in sys/unix/sysconf is commented out, so this is 1.
const SYSOPT_SEDUCE = 1;

// src/mhitu.c:1934 could_seduce() — 0 no, 1 yes, 2 "nymph-style".
//
// mattk non-Null asks about THIS attack; Null asks whether the monster has the
// capability at all.
//
// The return value is not a boolean and the two non-zero values differ on
// screen: hitmm prints "engagingly" for 2 and "seductively" for 1.
export function could_seduce(magr, mdef, mattk) {
    let pagr, agrinvis, genagr, defperc, gendef;

    if (is_animal(magr.data))
        return 0;

    if (magr === game.youmonst) {
        pagr = game.youmonst.data;
        agrinvis = Invis();
        genagr = poly_gender();
    } else {
        pagr = magr.data;
        agrinvis = !!magr.minvis;
        genagr = gender(magr);
    }
    if (mdef === game.youmonst) {
        defperc = See_invisible();
        gendef = poly_gender();
    } else {
        defperc = perceives(mdef.data);
        gendef = gender(mdef);
    }

    let adtyp = mattk ? mattk[MATTK_ADTYP]
              : dmgtype(pagr, ATTKS.AD_SSEX) ? ATTKS.AD_SSEX
              : dmgtype(pagr, ATTKS.AD_SEDU) ? ATTKS.AD_SEDU
              : ATTKS.AD_PHYS;
    if (adtyp === ATTKS.AD_SSEX && !SYSOPT_SEDUCE)
        adtyp = ATTKS.AD_SEDU;

    if (agrinvis && !defperc && adtyp === ATTKS.AD_SEDU)
        return 0;

    /* nymphs have two attacks, one for steal-item damage and the other
       for seduction, both pass the could_seduce() test;
       incubi/succubi have three attacks, their claw attacks for damage
       don't pass the test */
    if ((pagr.mlet !== MONSYMS.S_NYMPH && pagr.pmidx !== PMNAMES.PM_AMOROUS_DEMON)
        || (adtyp !== ATTKS.AD_SEDU && adtyp !== ATTKS.AD_SSEX
            && adtyp !== ATTKS.AD_SITM))
        return 0;

    return (genagr === 1 - gendef) ? 1
         : (pagr.mlet === MONSYMS.S_NYMPH) ? 2 : 0;
}

// src/mhitu.c getmattk() — pick WHICH of the monster's NATTK attacks this
// pass uses, substituting a different one in a few situations.
//
// mattackm's loop calls this every iteration, so it is not optional.
//
// THE COPY BEFORE MUTATION IS LOAD BEARING. attk starts as a reference into
// mons[].mattk, the shared species table. C copies into alt_attk_buf before
// changing adtyp or aatyp precisely so the table is not corrupted for every
// other monster of that species. A port that mutated in place would poison
// the table permanently and the damage would show up far from here.
//
// For an ordinary monster none of the four substitutions fire and this
// returns the base attack unchanged.
export function getmattk(magr, mdef, indx, prev_result, alt_attk_buf) {
    const mptr = magr.data;
    let attk = mptr.mattk[indx];
    const udefend = (mdef === game.youmonst);

    /* honor SEDUCE=0 -- SYSOPT_SEDUCE is 1 (src/sys.c:100 and the SEDUCE=0
       line in sys/unix/sysconf is commented out), so this whole block is
       skipped rather than being a gap. */

    /* prevent a monster with two consecutive disease or hunger attacks
       from hitting with both of them on the same turn; if the first has
       already hit, switch to a stun attack for the second */
    if (indx > 0 && prev_result[indx - 1] > M_ATTK_MISS
        && (attk[MATTK_ADTYP] === ATTKS.AD_DISE || attk[MATTK_ADTYP] === ATTKS.AD_PEST
            || attk[MATTK_ADTYP] === ATTKS.AD_FAMN)
        && attk[MATTK_ADTYP] === mptr.mattk[indx - 1].adtyp) {
        Object.assign(alt_attk_buf, attk);
        attk = alt_attk_buf;
        attk[MATTK_ADTYP] = ATTKS.AD_STUN;

    /* make drain-energy damage be somewhat in proportion to energy */
    } else if (attk[MATTK_ADTYP] === ATTKS.AD_DREN && udefend) {
        /* needs u.uen and u.ulevel scaling */
        (game.unported ||= new Set()).add('getmattk:AD_DREN_scaling');

    } else if (magr.mspec_used && (attk[MATTK_AATYP] === ATTKS.AT_ENGL
                                   || attk[MATTK_AATYP] === ATTKS.AT_HUGS
                                   || attk[MATTK_ADTYP] === ATTKS.AD_STCK
                                   || attk[MATTK_ADTYP] === ATTKS.AD_POLY)) {
        /* a special attack is on cooldown; substitute an ordinary one */
        Object.assign(alt_attk_buf, attk);
        attk = alt_attk_buf;
        if (attk[MATTK_ADTYP] === ATTKS.AD_ACID || attk[MATTK_ADTYP] === ATTKS.AD_ELEC
            || attk[MATTK_ADTYP] === ATTKS.AD_COLD || attk[MATTK_ADTYP] === ATTKS.AD_FIRE) {
            attk[MATTK_AATYP] = ATTKS.AT_TUCH;
        } else {
            attk[MATTK_AATYP] = ATTKS.AT_CLAW; /* attack message will be "<foo> hits" */
            attk[MATTK_ADTYP] = ATTKS.AD_PHYS;
        }
    }

    return attk;
}
