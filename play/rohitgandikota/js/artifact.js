// artifact.js — artifact identity, powers and the tests that gate them.
// C ref: src/artifact.c
//
// The data lives in two generated files: js/artilist_data.js (the ART_*
// indices and the display names) and js/artilist_records.js (the 36 records
// themselves). This file is the logic over them.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { artilist } from './artilist_records.js';
import { ART_NONARTIFACT, ART_EXCALIBUR } from './artilist_data.js';
import { SPFX_DBONUS, SPFX_ATTK, SPFX_INTEL, SPFX_RESTR, SPFX_DMONS, SPFX_DCLAS, SPFX_DFLAG1,
         SPFX_DFLAG2, SPFX_DALIGN, AD_PHYS, AD_FIRE, AD_COLD, AD_ELEC,
         AD_MAGM, AD_STUN, AD_DRST, AD_DRLI, AD_STON,
         A_NONE } from './const.js';
import { defended, resists_cold, resists_elec, resists_poison,
         is_covetous } from './mondata.js';
import { mon_aligntyp } from './monmove.js';
/* resists_fire and resists_drli are NOT DEFINED anywhere in the port, and
   resists_ston is a non-exported stub in js/dog.js. An earlier check here
   grepped for the NAMES and found mentions rather than definitions, which is
   how they got imported and broke the module. Those branches are recorded. */
import { sgn } from './hacklib.js';
import { ONAMES, MATERIALS } from './objects_data.js';

function note_unported_artifact(what) {
    (game.unported ||= new Set()).add(what);
}

// src/artifact.c spec_applies() — does this artifact's bonus apply to `mtmp`?
//
// The first line is the common case and the one that matters most: an
// artifact with neither a damage bonus nor a special attack applies only when
// its attack is ordinary physical.
//
// The dispatch below it is a chain of mutually exclusive spfx bits, in C's
// order, and the order IS the logic -- DMONS is checked before DCLAS, so an
// artifact flagged for both targets the monster rather than the class.
//
// adtyp arrives as an AD_* NAME from js/artilist_records.js rather than a
// number, so the switch compares against the imported constants by value
// through a lookup rather than on the raw field. See that file's header for
// why the names were kept.
export function spec_applies(weap, mtmp) {
    const AD = { AD_PHYS, AD_FIRE, AD_COLD, AD_ELEC, AD_MAGM, AD_STUN,
                 AD_DRST, AD_DRLI, AD_STON };
    const adtyp = typeof weap.attk?.adtyp === 'string'
        ? (AD[weap.attk.adtyp] ?? 0) : (weap.attk?.adtyp ?? 0);

    if (!(weap.spfx & (SPFX_DBONUS | SPFX_ATTK)))
        return adtyp === AD_PHYS;

    const yours = (mtmp === game.youmonst);
    const ptr = mtmp.data ?? game.mons[mtmp.mnum];

    if (weap.spfx & SPFX_DMONS) {
        /* C compares &mons[weap->mtype] by address; ours compares the index */
        return ptr === game.mons[Number(weap.mtype)];
    } else if (weap.spfx & SPFX_DCLAS) {
        return Number(weap.mtype) === ptr.mlet;
    } else if (weap.spfx & SPFX_DFLAG1) {
        return (ptr.mflags1 & Number(weap.mtype)) !== 0;
    } else if (weap.spfx & SPFX_DFLAG2) {
        if (ptr.mflags2 & Number(weap.mtype))
            return true;
        if (yours) {
            /* the hero arm needs Upolyd, urace.selfmask and u.ulycn */
            note_unported_artifact('spec_applies:DFLAG2_hero');
        }
        return false;
    } else if (weap.spfx & SPFX_DALIGN) {
        if (yours) {
            note_unported_artifact('spec_applies:DALIGN_hero');
            return false;
        }
        return ptr.maligntyp === A_NONE
            || sgn(ptr.maligntyp) !== Number(weap.alignment);
    } else if (weap.spfx & SPFX_ATTK) {
        if (defended(mtmp, adtyp))
            return false;

        /* The hero-side arms all read intrinsics that need the uprops
           struct; the monster-side ones work today. Recorded per branch
           rather than as one lump so the gap stays legible. */
        switch (adtyp) {
        case AD_FIRE:
            if (yours) { note_unported_artifact('spec_applies:Fire_resistance'); return false; }
            note_unported_artifact('spec_applies:resists_fire');
            return false;
        case AD_COLD:
            if (yours) { note_unported_artifact('spec_applies:Cold_resistance'); return false; }
            return !resists_cold(mtmp);
        case AD_ELEC:
            if (yours) { note_unported_artifact('spec_applies:Shock_resistance'); return false; }
            return !resists_elec(mtmp);
        case AD_MAGM:
        case AD_STUN:
            if (yours) { note_unported_artifact('spec_applies:Antimagic'); return false; }
            return !(rn2(100) < ptr.mr);      /* THE ONLY DRAW IN THIS FUNCTION */
        case AD_DRST:
            if (yours) { note_unported_artifact('spec_applies:Poison_resistance'); return false; }
            return !resists_poison(mtmp);
        case AD_DRLI:
            if (yours) { note_unported_artifact('spec_applies:Drain_resistance'); return false; }
            note_unported_artifact('spec_applies:resists_drli');
            return false;
        case AD_STON:
            if (yours) { note_unported_artifact('spec_applies:Stone_resistance'); return false; }
            note_unported_artifact('spec_applies:resists_ston');
            return false;
        default:
            /* C calls impossible("Weird weapon special attack.") */
            note_unported_artifact('spec_applies:weird_special_attack');
        }
    }
    return false;
}

// src/artifact.c:993 bane_applies() — does this artifact's DAMAGE BONUS apply?
//
// The copy-and-mask is the whole trick and must not be simplified away:
//
//     atmp = *oart;
//     atmp.spfx &= SPFX_DBONUS;   /* clear other spfx fields */
//
// C hands spec_applies a COPY carrying only the damage-bonus bits, so the
// SPFX_ATTK arm of spec_applies cannot fire even for an artifact that also
// has a special attack. Passing `oart` straight through would let a
// dual-flagged artifact take the wrong branch -- which reads as a plausible
// simplification and is a behaviour change.
//
// The C compares `oart != &artilist[ART_NONARTIFACT]` by address; ours is an
// index test, because ART_NONARTIFACT is index 0 of the same table.
export function bane_applies(oart, mon) {
    if (oart && oart !== artilist[ART_NONARTIFACT]
        && (oart.spfx & SPFX_DBONUS) !== 0) {
        const atmp = { ...oart, spfx: oart.spfx & SPFX_DBONUS };
        if (spec_applies(atmp, mon))
            return true;
    }
    return false;
}

// src/artifact.c get_artifact() — the record for an object, or the sentinel.
//
// Returns the SENTINEL rather than null for an ordinary object, which is why
// every caller can compare against artilist[ART_NONARTIFACT] instead of
// null-checking. Keeping that shape matters: a null return here would make
// touch_artifact's first test read the wrong way round.
//
// AFTER_LAST_ARTIFACT is the count of real artifacts plus one; artilist has a
// terminator entry, so C is careful not to use SIZE(artilist). Our generated
// table has the same 36 rows, so the bound is artilist.length - 1.
export function get_artifact(obj) {
    if (obj) {
        const artidx = obj.oartifact | 0;
        if (artidx > 0 && artidx < artilist.length - 1)
            return artilist[artidx];
    }
    return artilist[ART_NONARTIFACT];
}

// src/artifact.c touch_artifact() — may `mon` handle this artifact?
//
// Returns 1 when handling is allowed, 0 when the artifact refuses. The FIRST
// TEST is the one nearly every call takes: an ordinary object gets the
// sentinel from get_artifact and returns 1 immediately, which is why this
// function sits on 66% of sessions without usually doing anything.
//
// The blast arm draws -- d((Antimagic ? 2 : 4), (self_willed ? 10 : 4)) and a
// possible rnd(10) for silver -- and is reached only when a hero actually
// touches a mismatched artifact. It needs losehp, Hate_silver and
// Maybe_Half_Phys, none ported, so it is RECORDED rather than approximated:
// inventing damage here would spend draws C may not spend and desync the
// stream for the rest of the game.
/* include/mondata.h is_mplayer() — a fake-player monster. Not ported; the
   arm it guards lets covetous monsters and fake players touch anything, so
   treating every monster as NOT a fake player is the conservative reading:
   a fake player gets the ordinary badclass/badalign tests instead of the
   permissive branch. Recorded so the divergence is visible. */
function is_mplayer_ported(mon) {
    note_unported_artifact('touch_artifact:is_mplayer');
    return false;
}

export function touch_artifact(obj, mon) {
    const oart = get_artifact(obj);

    game.touch_blasted = false;
    if (oart === artilist[ART_NONARTIFACT])
        return 1;                      /* the overwhelmingly common case */

    const yours = (mon === game.youmonst);
    /* all quest artifacts are self-willed */
    const self_willed = (oart.spfx & SPFX_INTEL) !== 0;
    let badclass, badalign;

    if (yours) {
        /* Role_if and Race_if need the hero's role and race, and
           u.ualign.record needs alignment tracking; both recorded. */
        note_unported_artifact('touch_artifact:hero_badclass_badalign');
        badclass = badalign = false;
    } else if (!is_covetous(mon.data) && !is_mplayer_ported(mon)) {
        badclass = self_willed && oart.role !== 'NON_PM'
                   && oart !== artilist[ART_EXCALIBUR];
        badalign = (oart.spfx & SPFX_RESTR) !== 0 && oart.alignment !== 'A_NONE'
                   && (oart.alignment !== mon_aligntyp(mon));
    } else {
        /* an M3_WANTSxxx monster or a fake player may touch anything that
           spec_applies does not object to */
        badclass = badalign = false;
    }

    /* weapons which attack specific categories of monsters are bad for them
       even when the alignments happen to match */
    if (!badalign)
        badalign = bane_applies(oart, mon);

    if (((badclass || badalign) && self_willed)
        || (badalign && (!yours || !rn2(4)))) {
        if (!yours)
            return 0;
        /* the blast: message, d(...) damage, silver bonus, losehp, exercise */
        note_unported_artifact('touch_artifact:blast');
    }

    /* can pick it up unless totally out of synch with the artifact */
    if (badclass && badalign && self_willed) {
        if (yours)
            note_unported_artifact('touch_artifact:evades_grasp_msg');
        return 0;
    }

    return 1;
}

// src/artifact.c:2508 retouch_object() — may the hero still hold this?
//
// Returns 1 when handling is fine. Two paths reach that answer and the common
// one is the second: touch_artifact() says yes, and neither silver-hatred nor
// a bane applies, so the object is ordinary and nothing happens.
//
// `objp` is a POINTER in C because the object can be dropped or destroyed
// here. JS has no out-parameters, so this takes and returns the object: the
// caller writes `wep = retouch_object_obj(wep)` alongside the boolean. Where
// C sets *objp = 0 we return null, and the boolean result is unchanged.
//
// Not ported, each recorded at its site: Hate_silver (so `ag` reads false,
// which is the common value but IS an assumption -- only were-creatures,
// vampires and demons hate silver), the damage arms (losehp,
// Maybe_Half_Phys, killer_xname), remove_worn_item, hitfloor, and the
// Levitation branch of the drop.
export function retouch_object(obj, loseit) {
    if (!obj)
        return { ok: 1, obj: null };

    /* C lets a hero in silver-hating form try the invocation ritual:
         if (otyp == BELL_OF_OPENING && invocation_pos(..) && !On_stairs(..))
       Neither invocation_pos (js/mklev.js) nor On_stairs (js/dog.js) is
       EXPORTED, and the branch only fires on the invocation square holding
       the Bell of Opening, so it is recorded rather than reached for. */
    if (obj.otyp === ONAMES.BELL_OF_OPENING)
        note_unported_artifact('retouch_object:invocation_bell');

    if (touch_artifact(obj, game.youmonst)) {
        /* Hate_silver needs the hero's form and race; recorded, so ag is
           false and a silver-hating hero wrongly handles silver freely. */
        const ag = (game.objects[obj.otyp]?.oc_material === MATERIALS.SILVER);
        if (ag) note_unported_artifact('retouch_object:Hate_silver');
        const bane = bane_applies(get_artifact(obj), game.youmonst);

        /* nothing else to do if the hero can handle this object */
        if (!bane)
            return { ok: 1, obj };

        note_unported_artifact('retouch_object:bane_damage');
    } else {
        note_unported_artifact('retouch_object:cant_handle_damage');
    }

    if (obj.owornmask)
        note_unported_artifact('retouch_object:remove_worn_item');

    if (loseit && obj)
        note_unported_artifact('retouch_object:drop');

    return { ok: 0, obj };
}
