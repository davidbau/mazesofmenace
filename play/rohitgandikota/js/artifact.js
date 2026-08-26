// artifact.js — artifact bookkeeping.
// C ref: src/artifact.c
//
// Covers artifact generation and the wish flow's name and existence tracking.
// The intrinsic half of artifact.c is not ported yet.

import { game } from './gstate.js';
import { fuzzymatch } from './hacklib.js';
import { ONAMES } from './objects_data.js';
import { artifact_names, artifact_otyps, artifact_records,
         ART_GRIMTOOTH, ART_EXCALIBUR,
         ART_SUNSWORD } from './artilist_data.js';
import { PMNAMES, MFLAGS, MONSYMS, ATTKS as ADTYPES } from './monst_data.js';
import { is_covetous, is_mplayer, defended, resists_fire, resists_cold,
         resists_elec, resists_poison, resists_ston } from './mondata.js';
import { is_vampshifter } from './monst.js';
import { Fire_resistance, Cold_resistance, Shock_resistance,
         Poison_resistance, Stone_resistance } from './youprop.js';
import { rn2, rnd, rnz, d } from './rng.js';
import { ONAME_VIA_NAMING, ONAME_WISH, ONAME_GIFT, ONAME_VIA_DIP,
         ONAME_LEVEL_DEF, ONAME_BONES, ONAME_RANDOM,
         ONAME_KNOW_ARTI, ECMD_TIME, ECMD_CANCEL, GETOBJ_PROMPT,
         nothing_happens, W_WEP, W_ARTI } from './const.js';

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

// src/artifact.c mk_artifact(), existing-object arm. Random weapon and armor
// generation passes A_NONE, so candidates are artifacts with the same base
// object type which do not already exist and are not marked SPFX_NOGEN.
export function mk_artifact(otmp, alignment, max_giftvalue, adjust_spe) {
    const A_NONE = -128;
    const SPFX_NOGEN = 0x00000001;

    if (!otmp || alignment !== A_NONE)
        return otmp;

    const eligible = [];
    const unique = !!game.objects[otmp.otyp]?.oc_unique;
    for (let m = 1; m <= NROFARTIFACTS; ++m) {
        const a = artifact_records[m];
        if (artiexist()[m].exists || (a.spfx & SPFX_NOGEN) || unique)
            continue;
        if (a.gift_value > max_giftvalue)
            continue;
        if (arti_otyp[m] === otmp.otyp)
            eligible.push(m);
    }

    if (!eligible.length)
        return otmp;

    const m = eligible[rn2(eligible.length)];
    const a = artifact_records[m];
    otmp.oeroded = otmp.oeroded2 = 0;
    otmp.oname = artifact_names[m];
    otmp.age = 0;
    otmp.oartifact = m;
    artifact_origin(otmp, ONAME_RANDOM);
    if (adjust_spe) {
        const new_spe = otmp.spe + a.gen_spe;
        if (new_spe >= -10 && new_spe < 10)
            otmp.spe = new_spe;
    }
    return otmp;
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
const SPFX_INTEL = 0x04, SPFX_RESTR = 0x02, SPFX_WARN = 0x20,
      SPFX_ATTK = 0x40, SPFX_SEARCH = 0x00000200,
      SPFX_HALRES = 0x00000800, SPFX_ESP = 0x00001000,
      SPFX_STLTH = 0x00002000, SPFX_REGEN = 0x00004000,
      SPFX_EREGEN = 0x00008000, SPFX_HSPDAM = 0x00010000,
      SPFX_HPHDAM = 0x00020000, SPFX_TCTRL = 0x00040000,
      SPFX_DMONS = 0x00100000, SPFX_DCLAS = 0x00200000,
      SPFX_DFLAG1 = 0x00400000, SPFX_DFLAG2 = 0x00800000,
      SPFX_DALIGN = 0x01000000, SPFX_DBONUS = 0x01F00000,
      SPFX_XRAY = 0x02000000, SPFX_REFLECT = 0x04000000,
      SPFX_PROTECT = 0x08000000;

// src/artifact.c get_artifact() — the artilist record for an object.
export function get_artifact(obj) {
    const n = obj?.oartifact ?? 0;
    return (n > 0 && n < artifact_records.length) ? artifact_records[n]
                                                  : artifact_records[0];
}

function set_artifact_prop(key, on, mask) {
    const uprops = (game.u.uprops ||= {});
    const value = (uprops[key] || 0);
    const next = on ? (value | mask) : (value & ~mask);
    if (next)
        uprops[key] = next;
    else
        delete uprops[key];
}

// include/artilist.h attack-struct macros — the adtyp each defn/cary string
// head encodes. DFNS(c)/CARY(c) carry the AD_ name directly; the named damage
// macros fix theirs (POIS is AD_DRST per artilist.h:46).
const ARTI_ADTYP_HEADS = {
    PHYS: 'AD_PHYS', DRLI: 'AD_DRLI', COLD: 'AD_COLD', FIRE: 'AD_FIRE',
    ELEC: 'AD_ELEC', STUN: 'AD_STUN', POIS: 'AD_DRST',
};
function arti_adtyp(field) {
    if (!field || field.startsWith('NO_'))
        return 0;
    const m = /^([A-Z_]+)\(?(AD_[A-Z]+)?/.exec(field);
    if (!m)
        return 0;
    const name = m[2] || ARTI_ADTYP_HEADS[m[1]];
    return name ? (ADTYPES[name] | 0) : 0;
}

// src/artifact.c:716 set_artifact_intrinsic(), wielded and worn effects.
export function set_artifact_intrinsic(obj, on, wp_mask) {
    const art = get_artifact(obj);
    if (art === artifact_records[0])
        return;

    const dprops = new Map([
        [ADTYPES.AD_FIRE, 'FIRE_RES'], [ADTYPES.AD_COLD, 'COLD_RES'],
        [ADTYPES.AD_ELEC, 'SHOCK_RES'], [ADTYPES.AD_MAGM, 'ANTIMAGIC'],
        [ADTYPES.AD_DISN, 'DISINT_RES'], [ADTYPES.AD_DRST, 'POISON_RES'],
        [ADTYPES.AD_DRLI, 'DRAIN_RES'],
    ]);
    const dprop = dprops.get(arti_adtyp(art.defn));
    if (dprop)
        set_artifact_prop(dprop, on, wp_mask);

    const mappings = [
        [SPFX_SEARCH, 'SEARCHING'], [SPFX_HALRES, 'HALLUC_RES'],
        [SPFX_ESP, 'TELEPAT'], [SPFX_STLTH, 'STEALTH'],
        [SPFX_REGEN, 'REGENERATION'],
        [SPFX_EREGEN, 'ENERGY_REGENERATION'],
        [SPFX_TCTRL, 'TELEPORT_CONTROL'], [SPFX_HSPDAM, 'HALF_SPDAM'],
        [SPFX_HPHDAM, 'HALF_PHDAM'], [SPFX_PROTECT, 'PROTECTION'],
    ];
    for (const [bit, key] of mappings)
        if (art.spfx & bit)
            set_artifact_prop(key, on, wp_mask);

    if (art.spfx & SPFX_WARN) {
        const mt = mtype_value(art);
        set_artifact_prop(mt ? 'WARN_OF_MON' : 'WARNING', on, wp_mask);
        if (mt) {
            const warning = ((game.context ||= {}).warntype ||= {});
            warning.obj = on ? ((warning.obj || 0) | mt)
                             : ((warning.obj || 0) & ~mt);
        }
    }
    if ((art.spfx & SPFX_REFLECT) && (wp_mask & W_WEP))
        set_artifact_prop('REFLECTING', on, wp_mask);
    if (art.spfx & SPFX_XRAY)
        game.u.xray_range = on ? 3 : -1;
    if ((wp_mask & W_WEP) && is_art(obj, ART_SUNSWORD))
        set_artifact_prop('BLND_RES', on, wp_mask);
}

// include/obj.h:347 Is_dragon_scales() / Is_dragon_mail() / Is_dragon_armor()
const Is_dragon_scales = (obj) => obj.otyp >= ONAMES.GRAY_DRAGON_SCALES
                               && obj.otyp <= ONAMES.YELLOW_DRAGON_SCALES;
const Is_dragon_mail = (obj) => obj.otyp >= ONAMES.GRAY_DRAGON_SCALE_MAIL
                             && obj.otyp <= ONAMES.YELLOW_DRAGON_SCALE_MAIL;

// src/artifact.c:636 defends() — artifact (or dragon armor) protects its
// user against this damage type.
export function defends(adtyp, otmp) {
    if (!otmp)
        return false;
    const weap = get_artifact(otmp);
    if (weap !== artifact_records[0])
        return arti_adtyp(weap.defn) === adtyp;
    if (Is_dragon_scales(otmp) || Is_dragon_mail(otmp)) {
        let otyp = otmp.otyp;
        /* convert mail to scales to simplify testing */
        if (Is_dragon_mail(otmp))
            otyp += ONAMES.GRAY_DRAGON_SCALES - ONAMES.GRAY_DRAGON_SCALE_MAIL;
        switch (adtyp) {
        case ADTYPES.AD_MAGM:
            return otyp === ONAMES.GRAY_DRAGON_SCALES;
        case ADTYPES.AD_HALU:
            return otyp === ONAMES.GOLD_DRAGON_SCALES;
        case ADTYPES.AD_FIRE:
            return otyp === ONAMES.RED_DRAGON_SCALES;
        case ADTYPES.AD_COLD:
            return otyp === ONAMES.WHITE_DRAGON_SCALES;
        case ADTYPES.AD_DRST:
        case ADTYPES.AD_DISE:
            return otyp === ONAMES.GREEN_DRAGON_SCALES;
        case ADTYPES.AD_SLEE:
        case ADTYPES.AD_PLYS:
            return otyp === ONAMES.ORANGE_DRAGON_SCALES;
        case ADTYPES.AD_DISN:
        case ADTYPES.AD_DRLI:
            return otyp === ONAMES.BLACK_DRAGON_SCALES;
        case ADTYPES.AD_ELEC:
        case ADTYPES.AD_SLOW:
            return otyp === ONAMES.BLUE_DRAGON_SCALES;
        case ADTYPES.AD_ACID:
        case ADTYPES.AD_STON:
            return otyp === ONAMES.YELLOW_DRAGON_SCALES;
        default:
            break;
        }
    }
    return false;
}

// src/artifact.c:687 defends_when_carried()
export function defends_when_carried(adtyp, otmp) {
    const weap = get_artifact(otmp);
    if (weap !== artifact_records[0])
        return arti_adtyp(weap.cary) === adtyp;
    return false;
}

// src/artifact.c:1009 spec_applies(), shared by special attack bonuses and
// the DBONUS slice used by bane_applies().
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
    else if (weap.spfx & SPFX_ATTK) {
        const adtyp = arti_adtyp(weap.attk);
        if (defended(yours ? null : mon, adtyp))
            return false;

        switch (adtyp) {
        case ADTYPES.AD_FIRE:
            return !(yours ? Fire_resistance() : resists_fire(mon));
        case ADTYPES.AD_COLD:
            return !(yours ? Cold_resistance() : resists_cold(mon));
        case ADTYPES.AD_ELEC:
            return !(yours ? Shock_resistance() : resists_elec(mon));
        case ADTYPES.AD_MAGM:
        case ADTYPES.AD_STUN:
            return !(yours
                ? (game.u.intrinsic?.HAntimagic || game.u.uprops?.ANTIMAGIC)
                : rn2(100) < (ptr.mr | 0));
        case ADTYPES.AD_DRST:
            return !(yours ? Poison_resistance() : resists_poison(mon));
        case ADTYPES.AD_DRLI: {
            const bodyResists = ((ptr.mflags2 | 0)
                    & (MFLAGS.M2_UNDEAD | MFLAGS.M2_DEMON | MFLAGS.M2_WERE))
                || ptr.pmidx === PMNAMES.PM_DEATH
                || (!yours && is_vampshifter(mon));
            const heroResists = yours
                && (game.u.intrinsic?.HDrain_resistance
                    || game.u.uprops?.DRAIN_RES
                    || (game.u.ulycn ?? -1) >= 0);
            return !(bodyResists || heroResists);
        }
        case ADTYPES.AD_STON:
            return !(yours ? Stone_resistance() : resists_ston(mon));
        default:
            return false;
        }
    }
    return false;
}

/* include/artilist.h ATTK() payload, stored in generated records as
   "PHYS(5, 10)", "FIRE(5, 0)", and similar strings. */
function arti_attack(field) {
    const match = /^([A-Z_]+)\((\d+),\s*(\d+)\)$/.exec(field || '');
    return match ? { adtyp: match[1], damn: Number(match[2]),
                     damd: Number(match[3]) }
                 : { adtyp: 'PHYS', damn: 0, damd: 0 };
}

// src/artifact.c:1075 spec_abon(), the artifact's special to-hit bonus.
export function spec_abon(obj, mon) {
    const weap = get_artifact(obj);
    const { damn } = arti_attack(weap.attk);
    if (weap !== artifact_records[0] && damn && spec_applies(weap, mon))
        return rnd(damn);
    return 0;
}

// src/artifact.c:1091 spec_dbon(), the artifact's special damage bonus.
export function spec_dbon(obj, mon, tmp) {
    const weap = get_artifact(obj);
    const { adtyp, damn, damd } = arti_attack(weap.attk);
    let applies;

    if (weap === artifact_records[0]
        || (adtyp === 'PHYS' && damn === 0 && damd === 0))
        applies = false;
    else if (is_art(obj, ART_GRIMTOOTH))
        applies = true;
    else
        applies = spec_applies(weap, mon);

    game.spec_dbon_applies = applies;
    if (!applies)
        return 0;
    return damd ? rnd(damd) : Math.max(tmp, 1);
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

// src/artifact.c:2131 arti_invoke(), ordinary property powers. These toggle
// an extrinsic bit immediately. Turning one off starts its cooldown; trying
// to turn it back on too soon spends 3d10 more cooldown and has no effect.
async function invoke_property(obj, prop) {
    const props = (game.u.uprops ||= {});
    let eprop = (props[prop] || 0) ^ W_ARTI;
    if (eprop)
        props[prop] = eprop;
    else
        delete props[prop];
    const on = (eprop & W_ARTI) !== 0;

    if (on && (obj.age || 0) > game.moves) {
        eprop ^= W_ARTI;
        if (eprop)
            props[prop] = eprop;
        else
            delete props[prop];
        const { xname, the, otense } = await import('./objnam.js');
        const { You_feel } = await import('./pline.js');
        await You_feel(`that ${the(xname(obj))} ${otense(obj, 'are')} ignoring you.`);
        obj.age += d(3, 10);
        return ECMD_TIME;
    }
    if (!on)
        obj.age = game.moves + rnz(100);

    if ((eprop & ~W_ARTI) || game.u.intrinsic?.[prop]) {
        note_unported_art('arti_invoke:property_already_present');
        return ECMD_TIME;
    }

    const { You, You_feel, Your } = await import('./pline.js');
    switch (prop) {
    case 'CONFLICT':
        if (on)
            await You_feel('like a rabble-rouser.');
        else
            await You_feel('the tension decrease around you.');
        break;
    case 'LEVITATION':
        if (on) {
            await You('start to float in the air!');
            const { encumber_msg } = await import('./attrib.js');
            await encumber_msg();
            const { spoteffects } = await import('./hack.js');
            await spoteffects(false);
        } else {
            const { float_down } = await import('./trap.js');
            await float_down(0, W_ARTI);
        }
        break;
    case 'INVIS':
        if (on)
            await Your('body takes on a strange transparency...');
        else
            await Your('body seems to unfade...');
        break;
    default:
        note_unported_art(`arti_invoke:property=${prop}`);
        break;
    }
    return ECMD_TIME;
}

// src/artifact.c:1727 doinvoke() and its invoke_ok() getobj callback.
export async function doinvoke() {
    /* artifact.js is below invent.js through mon.js in the module graph, so
       load getobj here rather than adding another static cycle. */
    const { getobj, GETOBJ_EXCLUDE, GETOBJ_SUGGEST } =
        await import('./invent.js');
    const invoke_ok = (obj) => {
        if (!obj)
            return GETOBJ_EXCLUDE;
        if (obj.oartifact || game.objects[obj.otyp]?.oc_unique
            || (obj.otyp === ONAMES.FAKE_AMULET_OF_YENDOR && !obj.known)
            || obj.otyp === ONAMES.CRYSTAL_BALL)
            return GETOBJ_SUGGEST;
        return GETOBJ_EXCLUDE;
    };

    const obj = await getobj('invoke', invoke_ok, GETOBJ_PROMPT);
    if (!obj)
        return ECMD_CANCEL;
    if (!retouch_object(obj, false))
        return ECMD_TIME;

    const oart = get_artifact(obj);
    if (!obj.oartifact || !oart.inv_prop) {
        if (obj.otyp === ONAMES.CRYSTAL_BALL)
            note_unported_art('arti_invoke:crystal_ball');
        else {
            const { pline } = await import('./display.js');
            await pline(nothing_happens);
        }
        return ECMD_TIME;
    }

    if (oart.inv_prop === 'CONFLICT' || oart.inv_prop === 'LEVITATION'
        || oart.inv_prop === 'INVIS')
        return invoke_property(obj, oart.inv_prop);

    note_unported_art(`arti_invoke:special_power=${oart.inv_prop}`);
    return ECMD_TIME;
}
