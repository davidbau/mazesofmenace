// mondata.js — C ref: src/mondata.c.
//
// The mondata.h flag predicates themselves live in the generated
// js/monflags_data.js (mflags1/2/3) and js/monattk_data.js (mattk[] +
// attacktype/dmgtype/is_armed).  This file is for the mondata.c FUNCTIONS that
// compute something from those tables.

import { mattk_of, AT_NONE, AT_BOOM, AT_CLAW, AT_BITE, AT_KICK, AT_BUTT,
    AT_TUCH, AT_STNG, AT_HUGS, AT_ENGL, AT_TENT, AT_WEAP,
    AD_FIRE, AD_COLD, AD_ELEC, AD_ACID, AD_PHYS, AD_DCAY, AD_RUST }
    from './monattk_data.js';

// C ref: monflag.h MR_* resistance bits (permonst.mresists).
const MR_FIRE = 0x01, MR_COLD = 0x02, MR_ELEC = 0x10, MR_ACID = 0x40;

// C ref: monst.h resists_*(mon) == Resists_Elem(mon, X) ==
// (mresists | mextrinsics | mintrinsics) & X.  Monster extrinsics/intrinsics
// (worn gear, eaten corpses) are not tracked on our monster record, so these
// read the species bit only.
const resists_bit = (mon, bit) => (((mon?.data?.mresists ?? 0) & bit) !== 0);
export const resists_fire = (mon) => resists_bit(mon, MR_FIRE);
export const resists_cold = (mon) => resists_bit(mon, MR_COLD);
export const resists_elec = (mon) => resists_bit(mon, MR_ELEC);
export const resists_acid = (mon) => resists_bit(mon, MR_ACID);

// C ref: mondata.h completelyburns/completelyrots/completelyrusts — the golems
// a passive element destroys outright.
const BURNS_NAMES = new Set(['paper golem', 'straw golem']);
const ROTS_NAMES = new Set(['wood golem', 'leather golem']);
export const completelyburns = (ptr) => BURNS_NAMES.has(ptr?.name);
export const completelyrots = (ptr) => ROTS_NAMES.has(ptr?.name);
export const completelyrusts = (ptr) => ptr?.name === 'iron golem';

// The attack types that can each trigger a defender's passive.
const PASSIVE_TRIGGERS = new Set([AT_CLAW, AT_BITE, AT_KICK, AT_BUTT, AT_TUCH,
    AT_STNG, AT_HUGS, AT_ENGL, AT_TENT, AT_WEAP]);

// C ref: mondata.c:720 max_passive_dmg(mdef, magr) — the most damage `mdef`
// could do back to `magr` purely by being hit.  dogmove.c's pet-attack balk
// test compares this against the pet's current hp, which is what stops a
// 2 hp kitten from swatting a green mold (AD_ACID passive, max 8).
export function max_passive_dmg(mdef, magr) {
    const agrAttks = mattk_of(magr?.data);
    const defAttks = mattk_of(mdef?.data);

    /* each attack by magr can result in passive damage */
    let multi2 = 0;
    for (const a of agrAttks)
        if (PASSIVE_TRIGGERS.has(a.aatyp)) multi2++;

    let dmg = 0;
    for (const a of defAttks) {
        if (a.aatyp !== AT_NONE && a.aatyp !== AT_BOOM) continue;
        const adtyp = a.adtyp;
        if ((adtyp === AD_FIRE && completelyburns(magr?.data))
            || (adtyp === AD_DCAY && completelyrots(magr?.data))
            || (adtyp === AD_RUST && completelyrusts(magr?.data))) {
            dmg = magr.mhp | 0;
        } else if ((adtyp === AD_ACID && !resists_acid(magr))
                   || (adtyp === AD_COLD && !resists_cold(magr))
                   || (adtyp === AD_FIRE && !resists_fire(magr))
                   || (adtyp === AD_ELEC && !resists_elec(magr))
                   || adtyp === AD_PHYS) {
            dmg = a.damn | 0;
            if (!dmg) dmg = (mdef.data?.mlevel | 0) + 1;
            dmg *= (a.damd | 0);
        }
        dmg *= multi2;
        break; /* C breaks on the FIRST AT_NONE/AT_BOOM slot, matched or not */
    }
    return dmg;
}
