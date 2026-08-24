// artifact.js — artifact bookkeeping.
// C ref: src/artifact.c
//
// Only the slice the wish flow (readobjnam/makewish/oname) needs so far:
// name lookup, the artiexist tracking table, and the counters other code
// keys draws off (mksobj's `rn2(20 + 10 * nartifact_exist())`). The combat
// and intrinsic halves of artifact.c are not ported yet.

import { game } from './gstate.js';
import { fuzzymatch } from './hacklib.js';
import { ONAMES } from './objects_data.js';
import { artifact_names, artifact_otyps, artifact_records,
         ART_GRIMTOOTH, ART_EXCALIBUR } from './artilist_data.js';
import { PMNAMES, MFLAGS, MONSYMS } from './monst_data.js';
import { is_covetous, is_mplayer } from './mondata.js';
import { rn2 } from './rng.js';
import { ONAME_VIA_NAMING, ONAME_WISH, ONAME_GIFT, ONAME_VIA_DIP,
         ONAME_LEVEL_DEF, ONAME_BONES, ONAME_RANDOM,
         ONAME_KNOW_ARTI } from './const.js';

/* include/artilist.h — artilist[i].otyp, resolved from the generated
   ONAMES-key table. Index 0 is the dummy (STRANGE_OBJECT == 0). */
const arti_otyp = artifact_otyps.map((k) => ONAMES[k] ?? 0);

/* NROFARTIFACTS — artilist entries minus the index-0 dummy */
const NROFARTIFACTS = artifact_names.length - 1;

/* src/decl.c artiexist[] / zero_artiexist — creation tracking. Lives on
   game so save/restore can carry it once that machinery covers it. */
function artiexist() {
    if (!game.artiexist) {
        game.artiexist = [];
        for (let i = 0; i <= NROFARTIFACTS; i++)
            game.artiexist.push({ exists: 0, found: 0, gift: 0, wish: 0,
                                  named: 0, viadip: 0, lvldef: 0, bones: 0,
                                  rndm: 0 });
    }
    return game.artiexist;
}

// include/artifact.h:87 is_art()
export function is_art(obj, art) {
    return !!(obj && obj.oartifact === art);
}

// src/artifact.c:2837 permapoisoned() — currently only Grimtooth.
export function permapoisoned(obj) {
    return (obj && is_art(obj, ART_GRIMTOOTH));
}

// src/artifact.c artifact_name() — return the full name if 'name' names an
// artifact, else null; otyp_p (a {v} box) receives the base object type.
export function artifact_name(name, otyp_p, fuzzy) {
    let aname;

    if (name.toLowerCase().startsWith('the '))
        name = name.slice(4);

    for (let m = 1; m <= NROFARTIFACTS; m++) {
        aname = artifact_names[m];
        if (aname.toLowerCase().startsWith('the '))
            aname = aname.slice(4);
        if (!fuzzy ? name.toLowerCase() === aname.toLowerCase()
                   : fuzzymatch(name, aname, ' -', true)) {
            if (otyp_p)
                otyp_p.v = arti_otyp[m];
            return artifact_names[m];
        }
    }

    return null;
}

// src/artifact.c exist_artifact()
export function exist_artifact(otyp, name) {
    if (otyp && name)
        for (let m = 1; m <= NROFARTIFACTS; m++)
            if (arti_otyp[m] === otyp && artifact_names[m] === name)
                return artiexist()[m].exists ? true : false;
    return false;
}

// src/artifact.c artifact_exists() — an artifact has just been created or is
// being "un-created" for a chance to be created again later.
export function artifact_exists(otmp, name, mod, flgs) {
    if (otmp && name)
        for (let m = 1; m <= NROFARTIFACTS; m++)
            if (arti_otyp[m] === otmp.otyp && artifact_names[m] === name) {
                otmp.oartifact = mod ? m : 0;
                otmp.age = 0;
                if (otmp.otyp === ONAMES.RIN_INCREASE_DAMAGE)
                    otmp.spe = 0;
                if (mod) { /* means being created rather than un-created */
                    /* one--and only one--of these should always be set */
                    if ((flgs & (ONAME_VIA_NAMING | ONAME_WISH | ONAME_GIFT
                                 | ONAME_VIA_DIP | ONAME_LEVEL_DEF
                                 | ONAME_BONES | ONAME_RANDOM)) === 0)
                        flgs |= ONAME_RANDOM; /* the default origin */
                    artifact_origin(otmp, flgs);
                } else { /* uncreate */
                    /* clear all the flag bits */
                    const arex = artiexist()[m];
                    for (const k of Object.keys(arex))
                        arex[k] = 0;
                }
                break;
            }
    return;
}

// src/artifact.c nartifact_exist() — how many artifacts have been created.
export function nartifact_exist() {
    let a = 0;

    if (!game.artiexist)
        return 0;
    for (let i = 1; i <= NROFARTIFACTS; ++i)
        if (game.artiexist[i].exists)
            ++a;

    return a;
}

// src/artifact.c artifact_origin() — set artifact tracking flags;
// calling sequence: oname() -> artifact_exists() -> artifact_origin() or
// makewish() -> artifact_origin() to add the KNOW_ARTI bit.
export function artifact_origin(arti, aflags) {
    const a = arti.oartifact;

    if (a) {
        const arex = artiexist()[a];
        /* start by clearing all bits; most are mutually exclusive */
        for (const k of Object.keys(arex))
            arex[k] = 0;
        /* set 'exists' bit back on; not specified via flag bit in aflags */
        arex.exists = 1;
        if ((aflags & ONAME_KNOW_ARTI) !== 0)
            arex.found = 1;
        /* should be exactly one of wish, gift, via_dip, via_naming,
           level_def (quest), bones, and random */
        if ((aflags & ONAME_WISH) !== 0)
            arex.wish = 1;
        if ((aflags & ONAME_GIFT) !== 0)
            arex.gift = 1;
        if ((aflags & ONAME_VIA_DIP) !== 0)
            arex.viadip = 1;
        if ((aflags & ONAME_VIA_NAMING) !== 0)
            arex.named = 1;
        if ((aflags & ONAME_LEVEL_DEF) !== 0)
            arex.lvldef = 1;
        if ((aflags & ONAME_BONES) !== 0)
            arex.bones = 1;
        if ((aflags & ONAME_RANDOM) !== 0)
            arex.rndm = 1;
    }
}

/* mtype column values: PM_* / M1_* / M2_* macro names or 0, resolved lazily
   against the generated tables */
function mtype_value(rec) {
    const s = rec.mtype;
    if (s === '0') return 0;
    if (s.startsWith('PM_')) return PMNAMES[s] ?? 0;
    if (s.startsWith('M1_') || s.startsWith('M2_')) return MFLAGS[s] ?? 0;
    if (s.startsWith('S_')) return MONSYMS[s] ?? 0;
    return Number(s) || 0;
}

/* alignment column: A_LAWFUL 1, A_NEUTRAL 0, A_CHAOTIC -1, A_NONE -128 */
const ALIGNS = { A_LAWFUL: 1, A_NEUTRAL: 0, A_CHAOTIC: -1, A_NONE: -128 };
const rec_align = (rec) => ALIGNS[rec.align] ?? -128;

/* include/artifact.h SPFX_* bits used below */
const SPFX_INTEL = 0x04, SPFX_RESTR = 0x02, SPFX_ATTK = 0x40,
      SPFX_DMONS = 0x00100000, SPFX_DCLAS = 0x00200000,
      SPFX_DFLAG1 = 0x00400000, SPFX_DFLAG2 = 0x00800000,
      SPFX_DALIGN = 0x01000000, SPFX_DBONUS = 0x01F00000;

// src/artifact.c get_artifact() — the artilist record for an object.
export function get_artifact(obj) {
    const n = obj?.oartifact ?? 0;
    return (n > 0 && n < artifact_records.length) ? artifact_records[n]
                                                  : artifact_records[0];
}

// src/artifact.c:1009 spec_applies(), the DBONUS slice bane_applies uses.
// The SPFX_ATTK resistance arms need resists_* which are not all ported;
// bane_applies clears SPFX_ATTK before calling, so they cannot be reached
// from touch_artifact.
function spec_applies(weap, mon) {
    if (!(weap.spfx & (SPFX_DBONUS | SPFX_ATTK)))
        return weap.attk.startsWith('PHYS');

    const yours = (mon === game.youmonst);
    const ptr = yours ? game.mons[game.u.umonnum ?? game.urole?.mnum] ?? null
                      : mon.data;
    if (!ptr) return false;
    const mt = mtype_value(weap);

    if (weap.spfx & SPFX_DMONS)
        return ptr === game.mons[mt];
    else if (weap.spfx & SPFX_DCLAS)
        return mt === ptr.mlet;
    else if (weap.spfx & SPFX_DFLAG1)
        return (ptr.mflags1 & mt) !== 0;
    else if (weap.spfx & SPFX_DFLAG2)
        return ((ptr.mflags2 & mt) !== 0)
               || (yours && ((game.urace?.selfmask ?? 0) & mt) !== 0);
    else if (weap.spfx & SPFX_DALIGN)
        return yours ? (game.u.ualign?.type !== rec_align(weap))
                     : (ptr.maligntyp === -128
                        || Math.sign(ptr.maligntyp) !== rec_align(weap));
    return false;
}

// src/artifact.c:994 bane_applies() — the artifact hates this creature.
function bane_applies(oart, mon) {
    if (oart !== artifact_records[0] && (oart.spfx & SPFX_DBONUS) !== 0) {
        const atmp = { ...oart, spfx: oart.spfx & SPFX_DBONUS };
        if (spec_applies(atmp, mon))
            return true;
    }
    return false;
}

// src/artifact.c:907 touch_artifact() — creature (usually hero) tries to
// touch (pick up or wield) an artifact. 0 means it refuses.
export function touch_artifact(obj, mon) {
    const oart = get_artifact(obj);
    let badclass, badalign;

    if (oart === artifact_records[0])
        return 1;

    const yours = (mon === game.youmonst);
    /* all quest artifacts are self-willed */
    const self_willed = (oart.spfx & SPFX_INTEL) !== 0;
    if (yours) {
        const role_pm = (typeof game.urole?.mnum === 'string')
            ? game.urole.mnum : null;
        const role_match = oart.role === 'NON_PM'
            || oart.role === role_pm
            || PMNAMES[oart.role] === game.urole?.mnum;
        const race_match = oart.race === 'NON_PM'
            || PMNAMES[oart.race] === game.urace?.mnum
            || oart.race === game.urace?.mnum;
        badclass = self_willed
                   && ((oart.role !== 'NON_PM' && !role_match)
                       || (oart.race !== 'NON_PM' && !race_match));
        badalign = (oart.spfx & SPFX_RESTR) !== 0
                   && rec_align(oart) !== -128
                   && (rec_align(oart) !== (game.u.ualign?.type ?? 0)
                       || (game.u.ualign?.record ?? 0) < 0);
    } else if (!is_covetous(mon.data) && !is_mplayer(mon.data)) {
        badclass = self_willed && oart.role !== 'NON_PM'
                   && oart !== artifact_records[ART_EXCALIBUR];
        badalign = (oart.spfx & SPFX_RESTR) !== 0
                   && rec_align(oart) !== -128
                   && rec_align(oart) !== Math.sign(mon.data.maligntyp);
    } else { /* an M3_WANTSxxx monster or a fake player */
        badclass = badalign = false;
    }
    /* weapons which attack specific categories of monsters are bad for
       them even if their alignments happen to match */
    if (!badalign)
        badalign = bane_applies(oart, mon);

    if (((badclass || badalign) && self_willed)
        || (badalign && (!yours || !rn2(4)))) {
        if (!yours)
            return 0;
        /* You("are blasted by %s power!"); losehp(d(...)) */
        note_unported_art('touch_artifact:blast');
        return 1;
    }

    /* can pick it up unless you're totally non-synch'd with the artifact */
    if (badclass && badalign && self_willed) {
        if (yours)
            note_unported_art('touch_artifact:evade');
        return 0;
    }

    return 1;
}

function note_unported_art(what) {
    (game.unported ||= new Set()).add(what);
}

// src/artifact.c:2508 retouch_object() — check whether the hero can (still)
// handle an object at wield/wear time. Only the touch check and the
// clean-handling exit are live; the silver/bane damage and forced-drop arms
// record until Hate_silver forms and losehp-by-item land.
export function retouch_object(obj, loseit) {
    if (touch_artifact(obj, game.youmonst)) {
        const ag = false;   /* Hate_silver needs lycanthrope/demon/vampire
                               hero forms, not yet reachable */
        const bane = bane_applies(get_artifact(obj), game.youmonst);

        /* nothing else to do if hero can successfully handle this object */
        if (!ag && !bane)
            return 1;

        note_unported_art('retouch_object:handling_damage');
        return 1;
    }

    if (obj.owornmask || loseit)
        note_unported_art('retouch_object:drop');
    return 0;
}
