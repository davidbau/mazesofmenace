// mhitu.js — a monster attacking the hero.
// C ref: src/mhitu.c
//
// Only could_seduce() so far, which arrived because hitmm() and missmm() in
// js/mhitm.js both call it. Despite living in mhitu.c it is not a hero-only
// function: mattackm() uses it to decide whether a monster-vs-monster attack
// reads as an attack or as a pass.

import { game } from './gstate.js';
import { is_animal, perceives, dmgtype, gender } from './mondata.js';
import { poly_gender } from './polyself.js';
import { Invis, See_invisible } from './youprop.js';
import { ATTKS, MONSYMS, PMNAMES } from './monst_data.js';
import { W_ARMOR, W_AMUL } from './const.js';
import { ONAMES } from './objects_data.js';

function note_unported_mhitu(what) {
    (game.unported ||= new Set()).add(what);
}

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

    let adtyp = mattk ? mattk.adtyp
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

// src/mhitu.c:1089 magic_negation() — the magic cancellation factor worn
// armor gives its wearer; the best a_can among worn pieces. The extrinsic
// Protection arms (rings, amulet of guarding, divine protection) key on
// state fresh heroes lack and are recorded when present.
export function magic_negation(mon) {
    const is_you = (mon === null || mon === game.u || mon === game.youmonst);
    let mc = 0;

    const chain = is_you ? (game.invent || []) : (mon.minvent || []);
    for (const o of chain) {
        if ((o.owornmask ?? 0) & W_ARMOR) {
            const armpro = game.objects[o.otyp].a_can | 0;
            if (armpro > mc)
                mc = armpro;
        } else if ((o.owornmask ?? 0) & W_AMUL) {
            if (o.otyp === ONAMES.AMULET_OF_GUARDING)
                note_unported_mhitu('magic_negation:amulet_of_guarding');
        }
    }

    if (is_you && (game.u.uprops?.PROTECTION?.extrinsic
                   || game.u.uspellprot))
        note_unported_mhitu('magic_negation:protection');

    return mc;
}
