// artifact.js — artifact bookkeeping.
// C ref: src/artifact.c
//
// Covers artifact generation, intrinsic effects, and the wish flow's name and
// existence tracking.

import { OCLASSES, MATERIALS } from './objects_data.js';
import { ATTKS } from './monst_data.js';
import { NOTELL } from './const.js';
import { LL_ARTIFACT } from './const.js';
import { NO_ROOM } from './const.js';
import { OBJ_MINVENT } from './const.js';
import { OBJ_CONTAINED } from './const.js';
import { OBJ_FLOOR } from './const.js';
import { NH_BLACK } from './const.js';
import { NECK } from './const.js';
import { Upolyd } from './const.js';
import { engulfing_u } from './const.js';
import { losehp, nomul } from './hack.js';
import { nxtobj } from './invent.js';
import { ART_MASTER_KEY_OF_THIEVERY } from './artilist_data.js';
import { exercise, Role_if } from './attrib.js';
import { pline } from './display.js';
import { map_invisible } from './display.js';
import { canspotmon } from './display.js';
import { shieldeff } from './display.js';
import { probe_monster } from './zap.js';
import { monflee } from './monmove.js';
import { resist } from './zap.js';
import { cancel_monst } from './zap.js';
import { losexp } from './exper.js';
import { make_confused } from './potion.js';
import { make_stunned } from './potion.js';
import { healup } from './potion.js';
import { monhp_per_lvl } from './makemon.js';
import { body_part } from './polyself.js';
import { mbodypart } from './polyself.js';
import { s_suffix } from './hacklib.js';
import { observe_object } from './o_init.js';
import { attacktype } from './mondata.js';
import { sticks } from './mondata.js';
import { nonliving } from './mondata.js';
import { amorphous } from './mondata.js';
import { noncorporeal } from './mondata.js';
import { has_head } from './mondata.js';
import { bigmonst } from './mondata.js';
import { healmon } from './mon.js';
import { set_ustuck } from './mon.js';
import { wake_nearto } from './mon.js';
import { burn_away_slime } from './timeout.js';
import { ignite_items } from './trap.js';
import { destroy_items } from './zap.js';
import { upstart } from './do_name.js';
import { hcolor } from './do_name.js';
import { Monnam } from './do_name.js';
import { mon_nam } from './do_name.js';
import { Hallucination } from './youprop.js';
import { Blind, Levitation } from './youprop.js';
import { cansee } from './vision.js';
import { ART_STORMBRINGER } from './artilist_data.js';
import { ART_VORPAL_BLADE } from './artilist_data.js';
import { ART_TSURUGI_OF_MURAMASA } from './artilist_data.js';
import { The, the, Tobjnam } from './objnam.js';
import { xname, yname, killer_xname } from './objnam.js';
import { distant_name } from './objnam.js';
import { vtense } from './objnam.js';
import { bare_artifactname } from './objnam.js';
import { You_feel } from './pline.js';
import { You } from './pline.js';
import { pline_The } from './pline.js';
import { livelog_printf } from './pline.js';
import { inside_shop } from './shk.js';
import { ART_NONARTIFACT } from './artilist_data.js';
import { game } from './gstate.js';
import { fuzzymatch } from './hacklib.js';
import { ONAMES } from './objects_data.js';
import { artifact_names, artifact_otyps, artifact_records,
         ART_GRIMTOOTH, ART_EXCALIBUR,
         ART_SUNSWORD } from './artilist_data.js';
import { align_str } from './role.js';
import { simple_typename } from './objnam.js';
import { tty_putstr, ATR_INVERSE } from './tty/wintty.js';
import { PMNAMES, MFLAGS, MONSYMS, ATTKS as ADTYPES } from './monst_data.js';
import { is_covetous, is_mplayer, defended, is_demon, resists_fire,
         resists_cold, resists_elec, resists_poison, resists_ston }
    from './mondata.js';
import { is_vampshifter } from './monst.js';
import { Fire_resistance, Cold_resistance, Shock_resistance,
         Poison_resistance, Stone_resistance, Antimagic } from './youprop.js';
import { rn2, rnd, rnz, d } from './rng.js';
import { ONAME_VIA_NAMING, ONAME_WISH, ONAME_GIFT, ONAME_VIA_DIP,
         ONAME_LEVEL_DEF, ONAME_BONES, ONAME_RANDOM,
         ONAME_KNOW_ARTI, ECMD_OK, ECMD_TIME, ECMD_CANCEL, GETOBJ_PROMPT,
         nothing_happens, A_CON, A_WIS, KILLED_BY, W_ARM, W_WEP, W_ART, W_ARTI,
         SICK_ALL,
         I_SPECIAL, TIMEOUT, W_SWAPWEP, W_QUIVER, W_BALL, W_SADDLE,
         DISMOUNT_THROWN, IS_ALTAR } from './const.js';

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


// src/artifact.c:2775 is_magic_key(), role and beatitude requirements.
export function is_magic_key(mon, obj) {
    if (is_art(obj, ART_MASTER_KEY_OF_THIEVERY)) {
        if (mon === game.youmonst ? Role_if(PMNAMES.PM_ROGUE)
                                  : mon && mon.data === game.mons[PMNAMES.PM_ROGUE])
            return !obj.cursed;
        return !!obj.blessed;
    }
    return false;
}

// src/artifact.c:2790 has_magic_key(), including a non-key first object.
export function has_magic_key(mon) {
    const key = ONAMES[artifact_otyps[ART_MASTER_KEY_OF_THIEVERY]];
    if (!mon) mon = game.youmonst;
    let obj = (mon === game.youmonst ? game.invent : mon.minvent)?.[0];
    for (; obj; obj = nxtobj(obj, key, false))
        if (is_magic_key(mon, obj)) return obj;
    return null;
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

// src/artifact.c discover_artifact(). Remember artifacts in discovery order.
export function discover_artifact(art) {
    const discovered = (game.artidisco ||= []);
    if (art > 0 && !discovered.includes(art))
        discovered.push(art);
}

// src/artifact.c:151 artiname().
export function artiname(artinum) {
    return artinum <= 0 || artinum > NROFARTIFACTS ? '' : artifact_names[artinum];
}

// src/artifact.c:1149 disp_artifact_discoveries(). WIN_ERR only counts.
export function disp_artifact_discoveries(tmpwin) {
    let i;
    for (i = 0; i < NROFARTIFACTS; i++) {
        const m = game.artidisco?.[i];
        if (!m)
            break;
        if (tmpwin === -1)
            continue;
        if (i === 0)
            tty_putstr(tmpwin, game.iflags?.menu_headings?.attr ?? ATR_INVERSE,
                       'Artifacts');
        let algnstr = align_str(artifact_alignment(artifact_records[m], m));
        if (algnstr === 'unaligned')
            algnstr = 'non-aligned';
        tty_putstr(tmpwin, 0, `  ${artiname(m)} [${algnstr} ${
            simple_typename(arti_otyp[m])}]`);
    }
    return i;
}

// src/artifact.c:1177 dump_artifact_info(). Preserve creation flag order.
export function dump_artifact_info(tmpwin) {
    tty_putstr(tmpwin, game.iflags?.menu_headings?.attr ?? ATR_INVERSE,
               'Artifacts');
    for (let m = 1; m <= NROFARTIFACTS; m++) {
        const a = artiexist()[m];
        const flags = (a.exists ? 'exists;' : '')
            + (a.found ? ' hero knows;' : '')
            + (a.gift ? ' gift' : '') + (a.wish ? ' wish' : '')
            + (a.named ? ' named' : '') + (a.viadip ? ' viadip' : '')
            + (a.lvldef ? ' lvldef' : '') + (a.bones ? ' bones' : '')
            + (a.rndm ? ' random' : '');
        tty_putstr(tmpwin, 0, `  ${artiname(m).slice(0, 36).padEnd(36)}[${flags}]`);
    }
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

/* src/artifact.c hack_artifacts(). C mutates its process-local artilist after
   role selection. Replays share this module, so derive the same values from
   the current game instead of mutating the generated table across segments. */
function role_matches(role) {
    return role === game.urole?.mnum || PMNAMES[role] === game.urole?.mnum;
}

function artifact_role(rec, artinum) {
    if (artinum === game.urole?.questarti)
        return game.urole?.mnum;
    if (artinum === ART_EXCALIBUR && !role_matches('PM_KNIGHT'))
        return 'NON_PM';
    return rec.role;
}

function artifact_alignment(rec, artinum) {
    const alignment = rec_align(rec);
    if (artinum === game.urole?.questarti
        || (alignment !== -128 && role_matches(rec.role))) {
        return game.u.ualignbase?.[0]
               ?? game.u.ualign?.type
               ?? alignment;
    }
    return alignment;
}

/* include/artifact.h SPFX_* bits used below */
export { SPFX_SEARCH };
const SPFX_INTEL = 0x04, SPFX_RESTR = 0x02, SPFX_SPEAK = 0x08,
      SPFX_WARN = 0x20,
      SPFX_ATTK = 0x40, SPFX_SEARCH = 0x00000200,
      SPFX_HALRES = 0x00000800, SPFX_ESP = 0x00001000,
      SPFX_STLTH = 0x00002000, SPFX_REGEN = 0x00004000,
      SPFX_EREGEN = 0x00008000, SPFX_HSPDAM = 0x00010000,
      SPFX_HPHDAM = 0x00020000, SPFX_TCTRL = 0x00040000,
      SPFX_LUCK = 0x00080000,
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

// include/obj.h:441 u_wield_art() -> is_art(uwep, art)
export function u_wield_art(art) {
    return is_art(game.u.uwep, art);
}

// src/artifact.c spec_ability()
export function spec_ability(otmp, abil) {
    const arti = get_artifact(otmp);

    return (otmp.oartifact !== ART_NONARTIFACT
            && ((arti.spfx | 0) & abil) !== 0);
}

// src/artifact.c:2309 arti_cost(). Artifact prices are separate from the
// base object table and also supply the shop and score values.
export function arti_cost(obj) {
    const base = game.objects[obj?.otyp]?.oc_cost ?? 0;
    if (!obj?.oartifact)
        return base;
    return get_artifact(obj).cost || 100 * base;
}

// src/artifact.c:2264 artifact_light(). Sunsword is always a light source;
// gold dragon armor emits light only while worn as the suit.
export function artifact_light(obj) {
    if (obj && (obj.otyp === ONAMES.GOLD_DRAGON_SCALE_MAIL
                || obj.otyp === ONAMES.GOLD_DRAGON_SCALES)
        && (obj.owornmask & W_ARM))
        return true;
    return get_artifact(obj) !== artifact_records[0]
        && is_art(obj, ART_SUNSWORD);
}

// src/artifact.c:2279 arti_speak(). Speaking artifacts use a non-cookie
// rumor whose truth follows the object's beatitude.
export async function arti_speak(obj) {
    const art = get_artifact(obj);
    if (art === artifact_records[0] || !(art.spfx & SPFX_SPEAK))
        return ECMD_OK;

    const [{ getrumor }, { bcsign }, { Tobjnam }, { pline }] =
        await Promise.all([
            import('./rumors.js'), import('./mkobj.js'),
            import('./objnam.js'), import('./display.js'),
        ]);
    const line = getrumor(bcsign(obj), true)
        || 'NetHack rumors file closed for renovation.';
    await pline(`${Tobjnam(obj, 'whisper')}:`);
    await pline(`"${line}"`);
    return ECMD_TIME;
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

const ARTIFACT_DEFENSE_PROPS = new Map([
    [ADTYPES.AD_FIRE, 'FIRE_RES'], [ADTYPES.AD_COLD, 'COLD_RES'],
    [ADTYPES.AD_ELEC, 'SHOCK_RES'], [ADTYPES.AD_MAGM, 'ANTIMAGIC'],
    [ADTYPES.AD_DISN, 'DISINT_RES'], [ADTYPES.AD_DRST, 'POISON_RES'],
    [ADTYPES.AD_DRLI, 'DRAIN_RES'],
]);

const ARTIFACT_SPFX_PROPS = [
    [SPFX_SEARCH, 'SEARCHING'], [SPFX_HALRES, 'HALLUC_RES'],
    [SPFX_ESP, 'TELEPAT'], [SPFX_STLTH, 'STEALTH'],
    [SPFX_REGEN, 'REGENERATION'],
    [SPFX_EREGEN, 'ENERGY_REGENERATION'],
    [SPFX_TCTRL, 'TELEPORT_CONTROL'], [SPFX_HSPDAM, 'HALF_SPDAM'],
    [SPFX_HPHDAM, 'HALF_PHDAM'], [SPFX_PROTECT, 'PROTECTION'],
];

// src/attrib.c what_gives(), carried-artifact arm used by debug attributes.
export function carried_artifact_conveys(obj, key) {
    const art = get_artifact(obj);
    if (art === artifact_records[0])
        return false;
    if (ARTIFACT_DEFENSE_PROPS.get(arti_adtyp(art.cary)) === key)
        return true;
    const spfx = art.cspfx | 0;
    if (ARTIFACT_SPFX_PROPS.some(([bit, prop]) => prop === key && (spfx & bit)))
        return true;
    if (spfx & SPFX_WARN)
        return (mtype_value(art) ? 'WARN_OF_MON' : 'WARNING') === key;
    return false;
}

// src/artifact.c:524 confers_luck(), SPFX_LUCK applies while carried.
export function artifact_confers_luck(obj) {
    const art = get_artifact(obj);
    return art !== artifact_records[0] && !!(art.spfx & SPFX_LUCK);
}

// src/artifact.c:716 set_artifact_intrinsic(), wielded and worn effects.
export function set_artifact_intrinsic(obj, on, wp_mask) {
    const art = get_artifact(obj);
    if (art === artifact_records[0])
        return;

    const carried = wp_mask === W_ART;
    let dtyp = arti_adtyp(carried ? art.cary : art.defn);
    let spfx = carried ? (art.cspfx | 0) : art.spfx;

    if (carried && !on) {
        const others = (game.invent || []).filter((other) => other.oartifact);
        if (others.some((other) => arti_adtyp(get_artifact(other).cary) === dtyp))
            dtyp = 0;
        for (const other of others)
            spfx &= ~(get_artifact(other).cspfx | 0);
    }

    const dprop = ARTIFACT_DEFENSE_PROPS.get(dtyp);
    if (dprop)
        set_artifact_prop(dprop, on, wp_mask);

    for (const [bit, key] of ARTIFACT_SPFX_PROPS)
        if (spfx & bit)
            set_artifact_prop(key, on, wp_mask);

    if (spfx & SPFX_WARN) {
        const mt = mtype_value(art);
        set_artifact_prop(mt ? 'WARN_OF_MON' : 'WARNING', on, wp_mask);
        if (mt) {
            const warning = ((game.context ||= {}).warntype ||= {});
            warning.obj = on ? ((warning.obj || 0) | mt)
                             : ((warning.obj || 0) & ~mt);
        }
    }
    if ((spfx & SPFX_REFLECT) && (wp_mask & W_WEP))
        set_artifact_prop('REFLECTING', on, wp_mask);
    if ((spfx & SPFX_XRAY) && wp_mask !== W_ART) {
        game.u.xray_range = on ? 3 : -1;
        game.vision_full_recalc = 1;
    }
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
function spec_applies(weap, mon, artinum = artifact_records.indexOf(weap)) {
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
    else if (weap.spfx & SPFX_DALIGN) {
        const alignment = artifact_alignment(weap, artinum);
        return yours ? (game.u.ualign?.type !== alignment)
                     : (ptr.maligntyp === -128
                        || Math.sign(ptr.maligntyp) !== alignment);
    }
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
        if (spec_applies(atmp, mon, artifact_records.indexOf(oart)))
            return true;
    }
    return false;
}

let touch_blasted = false;

function hates_silver_you() {
    const ptr = game.youmonst.data;
    return (game.u.ulycn ?? -1) >= 0
        || !!(ptr.mflags2 & MFLAGS.M2_WERE)
        || ptr.mlet === MONSYMS.S_VAMPIRE
        || is_demon(ptr)
        || ptr.pmidx === PMNAMES.PM_SHADE
        || (ptr.mlet === MONSYMS.S_IMP && ptr.pmidx !== PMNAMES.PM_TENGU);
}

const maybe_half_phys = (dmg) =>
    (game.u.intrinsic?.HHalf_physical_damage
     || game.u.uprops?.HALF_PHDAM) ? Math.trunc((dmg + 1) / 2) : dmg;

function artifact_touch_decision(obj, mon) {
    const oart = get_artifact(obj);
    const artinum = obj?.oartifact ?? 0;
    const role = artifact_role(oart, artinum);
    const alignment = artifact_alignment(oart, artinum);
    let badclass, badalign;

    touch_blasted = false;
    if (oart === artifact_records[0])
        return { allowed: true, blast: false, oart, self_willed: false };

    const yours = (mon === game.youmonst);
    const self_willed = (oart.spfx & SPFX_INTEL) !== 0;
    if (yours) {
        const role_match = role === 'NON_PM' || role_matches(role);
        const race_match = oart.race === 'NON_PM'
            || PMNAMES[oart.race] === game.urace?.mnum
            || oart.race === game.urace?.mnum;
        badclass = self_willed
                   && ((role !== 'NON_PM' && !role_match)
                       || (oart.race !== 'NON_PM' && !race_match));
        badalign = (oart.spfx & SPFX_RESTR) !== 0
                   && alignment !== -128
                   && (alignment !== (game.u.ualign?.type ?? 0)
                       || (game.u.ualign?.record ?? 0) < 0);
    } else if (!is_covetous(mon.data) && !is_mplayer(mon.data)) {
        badclass = self_willed && role !== 'NON_PM'
                   && oart !== artifact_records[ART_EXCALIBUR];
        badalign = (oart.spfx & SPFX_RESTR) !== 0
                   && alignment !== -128
                   && alignment !== Math.sign(mon.data.maligntyp);
    } else {
        badclass = badalign = false;
    }
    if (!badalign)
        badalign = bane_applies(oart, mon);

    const blast = (((badclass || badalign) && self_willed)
                   || (badalign && (!yours || !rn2(4))));
    if (blast && !yours)
        return { allowed: false, blast: false, oart, self_willed };

    return {
        allowed: !(badclass && badalign && self_willed),
        blast,
        oart,
        self_willed,
    };
}

// src/artifact.c:907 touch_artifact(), creature (usually hero) tries to
// touch (pick up or wield) an artifact. 0 means it refuses.
export async function touch_artifact(obj, mon) {
    const decision = artifact_touch_decision(obj, mon);

    if (decision.blast) {
        await You(`are blasted by ${s_suffix(the(xname(obj)))} power!`);
        touch_blasted = true;
        let dmg = d(Antimagic() ? 2 : 4, decision.self_willed ? 10 : 4);
        if (game.objects[obj.otyp].oc_material === MATERIALS.SILVER
            && hates_silver_you())
            dmg += maybe_half_phys(rnd(10));
        await losehp(dmg, `touching ${decision.oart.name}`, KILLED_BY);
        exercise(A_WIS, false);
    }

    if (!decision.allowed) {
        if (!(game.invent || []).includes(obj))
            await pline(`${Tobjnam(obj, 'evade')} your grasp!`);
        else
            await pline(`${Tobjnam(obj, 'are')} beyond your control!`);
        return 0;
    }
    return 1;
}

/* Monster callers never print or take damage here. Keep their eligibility
   test synchronous so item-search predicates remain synchronous. */
export function touch_artifact_mon(obj, mon) {
    return artifact_touch_decision(obj, mon).allowed ? 1 : 0;
}

function note_unported_art(what) {
    (game.unported ||= new Set()).add(what);
}

// src/artifact.c:2508 retouch_object(), check whether the hero can still
// handle an object after a form or alignment change.
export async function retouch_object(obj, loseit) {
    if (obj.otyp === ONAMES.BELL_OF_OPENING) {
        const [{ invocation_pos }, { On_stairs }] = await Promise.all([
            import('./hack.js'), import('./stairs.js'),
        ]);
        if (invocation_pos(game.u.ux, game.u.uy)
            && !On_stairs(game.u.ux, game.u.uy))
            return 1;
    }

    if (await touch_artifact(obj, game.youmonst)) {
        const ag = game.objects[obj.otyp].oc_material === MATERIALS.SILVER
                   && hates_silver_you();
        const bane = bane_applies(get_artifact(obj), game.youmonst);

        if (!ag && !bane)
            return 1;

        const { You_cant } = await import('./pline.js');
        await You_cant(`handle ${yname(obj)}${obj.owornmask
            ? ' anymore' : ''}!`);
        if (!touch_blasted) {
            let what = killer_xname(obj);
            let dmg = 0;

            if (ag && !obj.oartifact && !bane) {
                if (obj.oclass === OCLASSES.RING_CLASS)
                    what = 'a silver ring';
                else if (obj.oclass === OCLASSES.WAND_CLASS)
                    what = 'a silver wand';
            }
            if (ag)
                dmg += maybe_half_phys(rnd(10));
            if (bane)
                dmg += rnd(10);
            await losehp(dmg, `handling ${what}`, KILLED_BY);
            exercise(A_CON, false);
        }
    }

    if (obj.owornmask) {
        const { remove_worn_item } = await import('./steal.js');
        await remove_worn_item(obj, false);
        if (!(game.invent || []).includes(obj))
            obj = null;
    }

    if (loseit && obj) {
        if (Levitation()) {
            const [{ freeinv }, { hitfloor }] = await Promise.all([
                import('./invent.js'), import('./do.js'),
            ]);
            freeinv(obj);
            await hitfloor(obj, true);
        } else {
            if (!IS_ALTAR(game.level.at(game.u.ux, game.u.uy).typ)) {
                const { surface } = await import('./dungeon.js');
                await pline(`${Tobjnam(obj, 'fall')} to the ${
                    surface(game.u.ux, game.u.uy)}.`);
            }
            const { dropx } = await import('./do.js');
            await dropx(obj);
        }
    }
    return 0;
}

let retouch_nesting = 0;
let retouch_checked = null;

// src/artifact.c:2640 retouch_equipment(), retest every active object while
// rescanning inventory after each removal or drop.
export async function retouch_equipment(dropflag) {
    const u = game.u;
    const wearmask = ~(W_QUIVER | (u.twoweap ? 0 : W_SWAPWEP) | W_BALL);
    const had_gloves = !!u.uarmg;
    const had_rings = Number(!!u.uleft) + Number(!!u.uright);

    if (retouch_nesting++ === 0)
        retouch_checked = new Set();

    const active = (obj) => {
        const art = get_artifact(obj);
        const container = obj.otyp >= ONAMES.LARGE_BOX
                          && obj.otyp <= ONAMES.BAG_OF_TRICKS;
        const beingworn = !!((obj.owornmask || 0) & wearmask)
            || (obj.oclass === OCLASSES.TOOL_CLASS
                && (obj.lamplit || (obj.otyp === ONAMES.LEASH && obj.leashmon)
                    || (container && obj.cobj?.length)));
        const carryeffect = art !== artifact_records[0]
                            && (!!arti_adtyp(art.cary) || !!art.cspfx);
        const invoked = art !== artifact_records[0] && !!art.inv_prop
                        && !!((u.uprops?.[art.inv_prop] || 0) & W_ARTI);
        return { art, beingworn, carryeffect, invoked };
    };
    const untouchable = async (obj, dropit) => {
        const state = active(obj);
        if (!(state.beingworn || state.carryeffect || state.invoked))
            return false;
        if (await retouch_object(obj, dropit))
            return false;
        if (state.invoked && (game.invent || []).includes(obj))
            await invoke_property(obj, state.art.inv_prop);
        return true;
    };
    const check = async (obj, dropit) => {
        if (!obj || retouch_checked.has(obj))
            return false;
        retouch_checked.add(obj);
        return untouchable(obj, dropit);
    };

    try {
        if (u.twoweap)
            await check(u.uswapwep, dropflag > 0);
        await check(u.uwep, dropflag > 0);

        if (u.usteed) {
            const { which_armor } = await import('./worn.js');
            const saddle = which_armor(u.usteed, W_SADDLE);
            if (saddle && await check(saddle, false)) {
                const { dismount_steed } = await import('./steed.js');
                await dismount_steed(DISMOUNT_THROWN);
            }
        }

        for (;;) {
            const obj = (game.invent || []).find(item =>
                !retouch_checked.has(item));
            if (!obj)
                break;
            await check(obj, dropflag === 1);
        }

        const rings = Number(!!u.uleft) + Number(!!u.uright);
        if (had_rings !== rings && u.uarmg?.cursed) {
            const { uncurse } = await import('./mkobj.js');
            await uncurse(u.uarmg);
        }
        if (had_gloves && !u.uarmg) {
            const { selftouch } = await import('./trap.js');
            await selftouch('After losing your gloves, you');
        }
    } finally {
        if (--retouch_nesting === 0)
            retouch_checked = null;
    }
}

async function nothing_special(obj) {
    if ((game.invent || []).includes(obj)) {
        const { You_feel } = await import('./pline.js');
        await You_feel('a surge of power, but nothing seems to happen.');
    }
}

// src/artifact.c:2089 arti_invoke_cost(). Special powers start a cooldown on
// first use. Reusing one too soon either spends 25 Pw for the two directional
// powers or extends the cooldown and reports that the artifact is tired.
async function arti_invoke_cost(obj, prop) {
    if ((obj.age || 0) > game.moves) {
        const pwCost = (prop === 'FLING_POISON' || prop === 'BLINDING_RAY')
            ? 25 : -1;
        if (pwCost < 0 || game.u.uen < pwCost) {
            const { xname, the, otense } = await import('./objnam.js');
            const { You_feel } = await import('./pline.js');
            await You_feel(`that ${the(xname(obj))} ${otense(obj, 'are')} ignoring you.`);
            obj.age += d(3, 10);
            return false;
        }
        const { You_feel } = await import('./pline.js');
        await You_feel('drained...');
        game.u.uen -= pwCost;
        (game.disp ||= {}).botl = true;
    } else {
        obj.age = game.moves + rnz(100);
    }
    return true;
}

// src/artifact.c:1780 invoke_healing(). NetHack 5.0 prints both adjacent
// "better" messages when the power has an effect, so retain both calls.
async function invoke_healing(obj) {
    const u = game.u;
    const sick = !!u.uprops?.SICK;
    const slimed = !!u.uprops?.SLIMED;
    const creamed = Number(u.ucreamed) || 0;
    const hblinded = u.intrinsic?.HBlinded | 0;
    const blinded = !!hblinded && !u.blocked?.BLINDED;
    const blindTimeout = hblinded & TIMEOUT;
    const healamt = Math.trunc((u.uhpmax + 1 - u.uhp) / 2);
    const { You_feel } = await import('./pline.js');

    if (healamt || sick || slimed || Number(blinded) > creamed)
        await You_feel('better.');
    if (healamt || sick || slimed || blindTimeout > creamed) {
        const slightly = !healamt && !sick && !slimed
                         && (hblinded & ~TIMEOUT) !== 0;
        await You_feel(`${slightly ? 'slightly ' : ''}better.`);
    } else {
        await nothing_special(obj);
        return ECMD_TIME;
    }

    if (healamt > 0)
        u.uhp += healamt;
    if (sick) {
        const { make_sick } = await import('./potion.js');
        await make_sick(0, null, false, SICK_ALL);
    }
    if (slimed)
        u.uprops.SLIMED = 0;
    if (blindTimeout > creamed) {
        const { make_blinded } = await import('./potion.js');
        await make_blinded(creamed, false);
    }
    (game.disp ||= {}).botl = true;
    return ECMD_TIME;
}

// src/artifact.c:1818 invoke_energy_boost(). Small deficits are filled in
// full; large deficits restore half, capped at 120 Pw.
async function invoke_energy_boost(obj) {
    const u = game.u;
    let epboost = Math.trunc((u.uenmax + 1 - u.uen) / 2);

    if (epboost > 120)
        epboost = 120;
    else if (epboost < 12)
        epboost = u.uenmax - u.uen;
    if (epboost) {
        const { You_feel } = await import('./pline.js');
        u.uen += epboost;
        (game.disp ||= {}).botl = true;
        await You_feel('re-energized.');
    } else {
        await nothing_special(obj);
    }
    return ECMD_TIME;
}

// src/artifact.c:1838 invoke_untrap(), cancellation refunds the cooldown.
export async function invoke_untrap(obj) {
    const { untrap } = await import('./trap.js');
    if (!await untrap(true, 0, 0, null)) {
        obj.age = 0;
        return ECMD_CANCEL;
    }
    return ECMD_TIME;
}

// src/artifact.c:1918 invoke_create_ammo(). The new arrows inherit the
// Longbow's beatitude, then pass through normal inventory merging.
async function invoke_create_ammo(obj) {
    const { mksobj } = await import('./mkobj.js');
    const { weight, hold_another_object } = await import('./invent.js');
    const { aobjnam } = await import('./objnam.js');
    const otmp = mksobj(ONAMES.ARROW, true, false);

    if (!otmp) {
        await nothing_special(obj);
        return ECMD_TIME;
    }
    otmp.blessed = obj.blessed;
    otmp.cursed = obj.cursed;
    otmp.bknown = obj.bknown;
    otmp.oeroded = otmp.oeroded2 = 0;
    if (obj.blessed) {
        if (otmp.spe < 0)
            otmp.spe = 0;
        otmp.quan += rnd(10);
    } else if (obj.cursed) {
        if (otmp.spe > 0)
            otmp.spe = 0;
    } else {
        otmp.quan += rnd(5);
    }
    otmp.owt = weight(otmp);
    await hold_another_object(otmp, 'Suddenly %s out.',
                              aobjnam(otmp, 'fall'), null);
    return ECMD_TIME;
}

// src/artifact.c:2162 ENLIGHTENING. enlightenment() builds the text, while
// the artifact caller owns the same menu paging and redraw used by C.
async function invoke_enlightening() {
    const { enlightenment, MAGICENLIGHTENMENT, ENL_GAMEINPROGRESS } =
        await import('./insight.js');
    const { tty_create_nhwindow, tty_destroy_nhwindow, tty_start_menu,
            tty_add_menu, tty_end_menu, tty_display_nhwindow, tty_next_page,
            NHW_MENU, ATR_NONE } = await import('./tty/wintty.js');
    const { MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE } =
        await import('./const.js');
    const { NO_COLOR } = await import('./terminal.js');
    const { xwaitforspace } = await import('./tty/getline.js');
    const { docrt } = await import('./display.js');
    const win = tty_create_nhwindow(NHW_MENU);

    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    for (const line of enlightenment(MAGICENLIGHTENMENT,
                                      ENL_GAMEINPROGRESS)) {
        tty_add_menu(win, null, 0, 0, 0, ATR_NONE, NO_COLOR, line,
                     MENU_ITEMFLAGS_NONE);
    }
    tty_end_menu(win, null);
    await tty_display_nhwindow(win);
    await xwaitforspace(' \r\n\x1b');
    while (tty_next_page(win))
        await xwaitforspace(' \r\n\x1b');
    tty_destroy_nhwindow(win);
    await docrt();
    return ECMD_TIME;
}

// src/artifact.c:2236 finesse_ahriman(), whether freeinv will end levitation.
export function finesse_ahriman(obj) {
    const oart = get_artifact(obj);
    const e = game.u.uprops?.LEVITATION || 0;
    if (!Levitation() || oart === artifact_records[ART_NONARTIFACT]
        || oart.inv_prop !== 'LEVITATION' || !(e & W_ARTI))
        return false;
    /* Probe the property bits cleared by arti_invoke(off), without changing
       the live property. C saves and restores the whole prop record. */
    const h = (game.u.intrinsic?.HLevitation || 0) & ~(I_SPECIAL | TIMEOUT);
    return !(h || (e & ~W_ARTI));
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
    if (!await retouch_object(obj, false))
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

    if (!(await arti_invoke_cost(obj, oart.inv_prop)))
        return ECMD_TIME;

    switch (oart.inv_prop) {
    case 'HEALING':
        return invoke_healing(obj);
    case 'ENERGY_BOOST':
        return invoke_energy_boost(obj);
    case 'UNTRAP':
        return invoke_untrap(obj);
    case 'CREATE_AMMO':
        return invoke_create_ammo(obj);
    case 'ENLIGHTENING':
        return invoke_enlightening();
    case 'LEV_TELE': {
        const { level_tele } = await import('./teleport.js');
        await level_tele();
        return ECMD_TIME;
    }
    default:
        break;
    }

    note_unported_art(`arti_invoke:special_power=${oart.inv_prop}`);
    return ECMD_TIME;
}

// src/artifact.c:409 found_artifact()
export function found_artifact(a) {
    const ax = artiexist();
    if (a < 1 || a >= ax.length) {
        /* impossible("found_artifact: invalid artifact index! (%d)") */
    } else if (!ax[a].exists) {
        /* impossible("found_artifact: artifact doesn't exist yet? (%d)") */
    } else
        ax[a].found = 1;
}

// src/artifact.c:422 find_artifact()
export function find_artifact(otmp) {
    const a = otmp.oartifact;

    if (a && !artiexist()[a].found) {
        let where;

        found_artifact(a); /* artiexist[a].found = 1 */
        /*
         * Unlike costly_spot(), inside_shop() includes the "free spot"
         * in front of the door.  And it doesn't care whether or not
         * there is a shopkeeper present.
         */
        where = ((otmp.where === OBJ_FLOOR)
                 ? ((inside_shop(otmp.ox, otmp.oy) !== NO_ROOM)
                    ? ' in a shop'
                    : ' on the floor')
                 /* artifacts aren't created in containers but could be
                    inside one if it comes from a bones level */
                 : (otmp.where === OBJ_CONTAINED) ? ' in a container'
                   /* perhaps probing, or seeing monster wield artifact */
                   : (otmp.where === OBJ_MINVENT) ? ' carried by a monster'
                     /* catchall: probably in inventory, picked up while
                        blind but now seen; there's no previous_where to
                        figure out how it got here */
                     : '');
        livelog_printf(LL_ARTIFACT, `found ${bare_artifactname(otmp)}${where}`);
    }
}

// src/artifact.c:626 attacks()
export function attacks(adtyp, otmp) {
    let weap;

    if ((weap = get_artifact(otmp)) !== artifact_records[ART_NONARTIFACT])
        return (arti_adtyp(weap.attk) === adtyp);
    return false;
}

/* src/artifact.c:1233 MB_INDEX_* */
const MB_INDEX_PROBE = 0, MB_INDEX_STUN = 1, MB_INDEX_SCARE = 2, MB_INDEX_CANCEL = 3;
const MB_MAX_DIEROLL = 8; /* rolls above this aren't magical */
const mb_verb = [
    ['probe', 'stun', 'scare', 'cancel'],
    ['prod', 'amaze', 'tickle', 'purge'],
];
/* include/hack.h FATAL_DAMAGE_MODIFIER */
const FATAL_DAMAGE_MODIFIER = 200;
/* include/artifact.h */
const SPFX_BEHEAD = 0x00000400, SPFX_DRLI = 0x00000100;
/* include/youprop.h */
const Slimed = () => !!(game.u.intrinsic?.HSlimed);
/* src/decl.c c_common_strings.c_fakename[]; used so vtense() won't be fooled
   by an assigned name ending in 's' */
const fakename = ["mon", "you"];

// src/artifact.c:1249 Mb_hit(); called when someone is being hit by
// Magicbane.  hittee is a {v} box because cancellation may rename the target
async function Mb_hit(magr, mdef, mb, dmgptr, dieroll, vis, hittee) {
    let old_mdat;
    let verb;
    const youattack = (magr === game.youmonst),
          youdefend = (mdef === game.youmonst);
    let resisted = false, do_stun, do_confuse, result;
    let attack_indx, fakeidx, scare_dieroll = Math.trunc(MB_MAX_DIEROLL / 2);

    result = false; /* no message given yet */
    /* the most severe effects are less likely at higher enchantment */
    if (mb.spe >= 3)
        scare_dieroll = Math.trunc(scare_dieroll / (1 << Math.trunc(mb.spe / 3)));
    /* if target successfully resisted the artifact damage bonus,
       reduce overall likelihood of the assorted special effects */
    if (!game.spec_dbon_applies)
        dieroll += 1;

    /* might stun even when attempting a more severe effect, but
       in that case it will only happen if the other effect fails;
       extra damage will apply regardless; 3.4.1: sometimes might
       just probe even when it hasn't been enchanted */
    do_stun = (Math.max(mb.spe, 0) < rn2(game.spec_dbon_applies ? 11 : 7));

    /* the special effects also boost physical damage; ... */
    attack_indx = MB_INDEX_PROBE;
    dmgptr.v += rnd(4); /* (2..3)d4 */
    if (do_stun) {
        attack_indx = MB_INDEX_STUN;
        dmgptr.v += rnd(4); /* (3..4)d4 */
    }
    if (dieroll <= scare_dieroll) {
        attack_indx = MB_INDEX_SCARE;
        dmgptr.v += rnd(4); /* (3..5)d4 */
    }
    if (dieroll <= Math.trunc(scare_dieroll / 2)) {
        attack_indx = MB_INDEX_CANCEL;
        dmgptr.v += rnd(4); /* (4..6)d4 */
    }

    /* give the hit message prior to inflicting the effects */
    verb = mb_verb[Hallucination() ? 1 : 0][attack_indx];
    if (youattack || youdefend || vis) {
        result = true;
        await pline_The(`magic-absorbing blade ${vtense(null, verb)} ${hittee.v}!`);
        /* assume probing has some sort of noticeable feedback
           even if it is being done by one monster to another */
        if (attack_indx === MB_INDEX_PROBE && !canspotmon(mdef))
            map_invisible(mdef.mx, mdef.my);
    }

    /* now perform special effects */
    switch (attack_indx) {
    case MB_INDEX_CANCEL:
        old_mdat = youdefend ? game.youmonst.data : mdef.data;
        /* No mdef->mcan check: even a cancelled monster can be polymorphed
         * into a golem, and the "cancel" effect acts as if some magical
         * energy remains in spellcasting defenders to be absorbed later.
         */
        if (!(await cancel_monst(mdef, mb, youattack, false, false))) {
            resisted = true;
        } else {
            do_stun = false;
            if (youdefend) {
                if (game.youmonst.data !== old_mdat)
                    dmgptr.v = 0; /* rehumanized, so no more damage */
                if (game.u.uenmax > 0) {
                    game.u.uenmax--;
                    if (game.u.uen > 0)
                        game.u.uen--;
                    (game.disp ||= {}).botl = true;
                    await You('lose magical energy!');
                }
            } else {
                /* canceled shapeshifter/vamp may have changed forms, so
                   update its name if necessary */
                if (mdef.data !== old_mdat)
                    hittee.v = mon_nam(mdef);
                if (mdef.data === game.mons[PMNAMES.PM_CLAY_GOLEM])
                    mdef.mhp = 1; /* cancelled clay golems will die */
                if (youattack && attacktype(mdef.data, ATTKS.AT_MAGC)) {
                    game.u.uenmax++;
                    if (game.u.uenmax > (game.u.uenpeak | 0))
                        game.u.uenpeak = game.u.uenmax;
                    game.u.uen++;
                    (game.disp ||= {}).botl = true;
                    await You('absorb magical energy!');
                }
            }
        }
        break;

    case MB_INDEX_SCARE:
        if (youdefend) {
            if (Antimagic()) {
                resisted = true;
            } else {
                nomul(-3);
                game.multi_reason = 'being scared stiff';
                game.nomovemsg = '';
                if (magr && magr === game.u.ustuck && sticks(game.youmonst.data)) {
                    set_ustuck(null);
                    await You(`release ${mon_nam(magr)}!`);
                }
            }
        } else {
            if (rn2(2) && await resist(mdef, OCLASSES.WEAPON_CLASS, 0, NOTELL))
                resisted = true;
            else
                await monflee(mdef, 3, false, (mdef.mhp > dmgptr.v));
        }
        if (!resisted)
            do_stun = false;
        break;

    case MB_INDEX_STUN:
        do_stun = true; /* (this is redundant...) */
        break;

    case MB_INDEX_PROBE:
        if (youattack && (mb.spe === 0 || !rn2(3 * Math.abs(mb.spe)))) {
            await pline_The(`${verb} is insightful.`);
            /* pre-damage status */
            await probe_monster(mdef);
        }
        break;
    }
    /* stun if that was selected and a worse effect didn't occur */
    if (do_stun) {
        if (youdefend)
            await make_stunned((((game.u.intrinsic?.HStun | 0) & TIMEOUT) + 3), false);
        else
            mdef.mstun = 1;
        /* avoid extra stun message below if we used mb_verb["stun"] above */
        if (attack_indx === MB_INDEX_STUN)
            do_stun = false;
    }
    /* lastly, all this magic can be confusing... */
    do_confuse = !rn2(12);
    if (do_confuse) {
        if (youdefend)
            await make_confused(((game.u.intrinsic?.HConfusion | 0) & TIMEOUT) + 4, false);
        else
            mdef.mconf = 1;
    }

    /* now give message(s) describing side-effects; Use fakename
       so vtense() won't be fooled by assigned name ending in 's' */
    fakeidx = youdefend ? 1 : 0;
    if (youattack || youdefend || vis) {
        hittee.v = upstart(hittee.v); /* capitalize */
        if (resisted) {
            await pline(`${hittee.v} ${vtense(fakename[fakeidx], 'resist')}!`);
            await shieldeff(youdefend ? game.u.ux : mdef.mx,
                            youdefend ? game.u.uy : mdef.my);
        }
        if ((do_stun || do_confuse) && game.flags?.verbose !== false) {
            let buf = '';

            if (do_stun)
                buf += 'stunned';
            if (do_stun && do_confuse)
                buf += ' and ';
            if (do_confuse)
                buf += 'confused';
            await pline(`${hittee.v} ${vtense(fakename[fakeidx], 'are')} ${buf}${
                (do_stun && do_confuse) ? '!' : '.'}`);
        }
    }

    return result;
}

// src/artifact.c:1447 artifact_hit(); dmgptr is a {v} box.  Returns TRUE
// if the special message was given.
export async function artifact_hit(magr, mdef, otmp, dmgptr, dieroll) {
    const youattack = (magr === game.youmonst);
    const youdefend = (mdef === game.youmonst);
    const vis = (!youattack && magr && cansee(magr.mx, magr.my))
                || (!youdefend && cansee(mdef.mx, mdef.my))
                || (youattack && engulfing_u(mdef) && !Blind());
    let realizes_damage;
    let wepdesc;
    const you = 'you';
    const hittee = { v: youdefend ? you : mon_nam(mdef) };

    /* The following takes care of most of the damage, but not all--
     * the exception being for level draining, which is specially
     * handled.  Messages are done in this function, however.
     */
    dmgptr.v += spec_dbon(otmp, mdef, dmgptr.v);

    if (youattack && youdefend) {
        /* impossible("attacking yourself with weapon?") */
        return false;
    }

    realizes_damage = (youdefend || vis
                       /* feel the effect even if not seen */
                       || (youattack && mdef === game.u.ustuck));

    /* the four basic attacks: fire, cold, shock and missiles */
    if (attacks(ATTKS.AD_FIRE, otmp)) {
        if (realizes_damage)
            await pline_The(`fiery blade ${
                      !game.spec_dbon_applies
                          ? 'hits'
                          : (mdef.data === game.mons[PMNAMES.PM_WATER_ELEMENTAL])
                                ? 'vaporizes part of'
                                : 'burns'} ${hittee.v}${!game.spec_dbon_applies ? '.' : '!'}`);
        if (!rn2(4)) {
            const itemdmg = await destroy_items(mdef, ATTKS.AD_FIRE, dmgptr.v);
            if (!youdefend)
                dmgptr.v += itemdmg; /* item destruction dmg */
            await ignite_items(mdef.minvent);
        }
        if (youdefend && Slimed())
            await burn_away_slime();
        return realizes_damage;
    }
    if (attacks(ATTKS.AD_COLD, otmp)) {
        if (realizes_damage)
            await pline_The(`ice-cold blade ${
                      !game.spec_dbon_applies ? 'hits' : 'freezes'} ${hittee.v}${
                      !game.spec_dbon_applies ? '.' : '!'}`);
        if (!rn2(4)) {
            const itemdmg = await destroy_items(mdef, ATTKS.AD_COLD, dmgptr.v);
            if (!youdefend)
                dmgptr.v += itemdmg; /* item destruction dmg */
        }
        return realizes_damage;
    }
    if (attacks(ATTKS.AD_ELEC, otmp)) {
        if (realizes_damage)
            await pline_The(`massive hammer hits${
                      !game.spec_dbon_applies ? '' : '!  Lightning strikes'} ${hittee.v}${
                      !game.spec_dbon_applies ? '.' : '!'}`);
        if (game.spec_dbon_applies)
            await wake_nearto(mdef.mx, mdef.my, 4 * 4);
        if (!rn2(5)) {
            const itemdmg = await destroy_items(mdef, ATTKS.AD_ELEC, dmgptr.v);
            if (!youdefend)
                dmgptr.v += itemdmg; /* item destruction dmg */
        }
        return realizes_damage;
    }
    if (attacks(ATTKS.AD_MAGM, otmp)) {
        if (realizes_damage)
            await pline_The(`imaginary widget hits${
                      !game.spec_dbon_applies
                          ? ''
                          : '!  A hail of magic missiles strikes'} ${hittee.v}${
                      !game.spec_dbon_applies ? '.' : '!'}`);
        return realizes_damage;
    }

    if (attacks(ATTKS.AD_STUN, otmp) && dieroll <= MB_MAX_DIEROLL) {
        /* Magicbane's special attacks (possibly modifies hittee[]) */
        return await Mb_hit(magr, mdef, otmp, dmgptr, dieroll, vis, hittee);
    }

    if (!game.spec_dbon_applies) {
        /* since damage bonus didn't apply, nothing more to do;
           no further attacks have side-effects on inventory */
        return false;
    }

    /* We really want "on a natural 20" but Nethack does it in */
    /* reverse from AD&D. */
    if (spec_ability(otmp, SPFX_BEHEAD)) {
        if (is_art(otmp, ART_TSURUGI_OF_MURAMASA) && dieroll === 1) {
            wepdesc = 'The razor-sharp blade';
            /* not really beheading, but so close, why add another SPFX */
            if (youattack && engulfing_u(mdef)) {
                await You(`slice ${mon_nam(mdef)} wide open!`);
                dmgptr.v = 2 * mdef.mhp + FATAL_DAMAGE_MODIFIER;
                return true;
            }
            if (!youdefend) {
                /* allow normal cutworm() call to add extra damage */
                if (game.notonhead)
                    return false;

                if (bigmonst(mdef.data)) {
                    if (youattack)
                        await You(`slice deeply into ${mon_nam(mdef)}!`);
                    else if (vis)
                        await pline(`${Monnam(magr)} cuts deeply into ${hittee.v}!`);
                    dmgptr.v *= 2;
                    return true;
                }
                dmgptr.v = 2 * mdef.mhp + FATAL_DAMAGE_MODIFIER;
                await pline(`${wepdesc} cuts ${mon_nam(mdef)} in half!`);
                observe_object(otmp);
                return true;
            } else {
                if (bigmonst(game.youmonst.data)) {
                    await pline(`${magr ? Monnam(magr) : wepdesc} cuts deeply into you!`);
                    dmgptr.v *= 2;
                    return true;
                }

                /* Players with negative AC's take less damage instead
                 * of just not getting hit.  We must add a large enough
                 * value to the damage so that this reduction in
                 * damage does not prevent death.
                 */
                dmgptr.v = 2 * (Upolyd(game.u) ? game.u.mh : game.u.uhp) + FATAL_DAMAGE_MODIFIER;
                await pline(`${wepdesc} cuts you in half!`);
                observe_object(otmp);
                return true;
            }
        } else if (is_art(otmp, ART_VORPAL_BLADE)
                   && (dieroll === 1 || mdef.data === game.mons[PMNAMES.PM_JABBERWOCK])) {
            const behead_msg = ['%s beheads %s!', '%s decapitates %s!'];

            if (youattack && engulfing_u(mdef))
                return false;
            wepdesc = artifact_records[ART_VORPAL_BLADE].name;
            if (!youdefend) {
                if (!has_head(mdef.data) || game.notonhead || game.u.uswallow) {
                    if (youattack)
                        await pline(`Somehow, you miss ${mon_nam(mdef)} wildly.`);
                    else if (vis)
                        await pline(`Somehow, ${mon_nam(magr)} misses wildly.`);
                    dmgptr.v = 0;
                    return (youattack || vis);
                }
                if (noncorporeal(mdef.data) || amorphous(mdef.data)) {
                    await pline(`${wepdesc} slices through ${s_suffix(mon_nam(mdef))} ${mbodypart(mdef, NECK)}.`);
                    return true;
                }
                dmgptr.v = 2 * mdef.mhp + FATAL_DAMAGE_MODIFIER;
                await pline(behead_msg[rn2(behead_msg.length)] /* ROLL_FROM */
                            .replace('%s', wepdesc).replace('%s', mon_nam(mdef)));
                if (Hallucination() && !game.flags.female)
                    await pline("Good job Henry, but that wasn't Anne.");
                observe_object(otmp);
                return true;
            } else {
                if (!has_head(game.youmonst.data)) {
                    await pline(`Somehow, ${magr ? mon_nam(magr) : wepdesc} misses you wildly.`);
                    dmgptr.v = 0;
                    return true;
                }
                if (noncorporeal(game.youmonst.data)
                    || amorphous(game.youmonst.data)) {
                    await pline(`${wepdesc} slices through your ${body_part(NECK)}.`);
                    return true;
                }
                dmgptr.v = 2 * (Upolyd(game.u) ? game.u.mh : game.u.uhp) + FATAL_DAMAGE_MODIFIER;
                await pline(behead_msg[rn2(behead_msg.length)] /* ROLL_FROM */
                            .replace('%s', wepdesc).replace('%s', 'you'));
                observe_object(otmp);
                /* Should amulets fall off? */
                return true;
            }
        }
    }
    if (spec_ability(otmp, SPFX_DRLI)) {
        /* some non-living creatures (golems, vortices) are vulnerable to
           life drain effects so can get "<Arti> draws the <life>" feedback */
        const life = nonliving(mdef.data) ? 'animating force' : 'life';

        if (!youdefend) {
            const m_lev = mdef.m_lev, /* will be 0 for 1d4 mon */
                  mhpmax = mdef.mhpmax;
            let drain = monhp_per_lvl(mdef); /* usually 1d8 */
                /* note: DRLI attack uses 2d6, attacker doesn't get healed */

            /* stop draining HP if it drops too low (still drains level;
               also caller still inflicts regular weapon damage) */
            if (mhpmax - drain <= m_lev)
                drain = (mhpmax > m_lev) ? (mhpmax - (m_lev + 1)) : 0;

            if (vis) {
                /* call distant_name() for possible side-effects even if
                   the result won't be printed */
                const otmpname = distant_name(otmp, xname);

                if (is_art(otmp, ART_STORMBRINGER))
                    await pline_The(`${hcolor(NH_BLACK)} blade draws the ${life} from ${mon_nam(mdef)}!`);
                else
                    await pline(`${The(otmpname)} draws the ${life} from ${mon_nam(mdef)}!`);
            }
            if (mdef.m_lev === 0) {
                /* losing a level when at 0 is fatal */
                dmgptr.v = 2 * mdef.mhp + FATAL_DAMAGE_MODIFIER;
            } else {
                dmgptr.v += drain;
                mdef.mhpmax -= drain;
                mdef.m_lev--;
            }

            if (drain > 0) {
                /* drain: was target's damage, now heal attacker by half */
                drain = Math.trunc((drain + 1) / 2); /* drain/2 rounded up */
                if (youattack) {
                    await healup(drain, 0, false, false);
                } else {
                    healmon(magr, drain, 0);
                }
            }
            return vis;
        } else { /* youdefend */
            const oldhpmax = game.u.uhpmax;

            if (Blind()) {
                await You_feel(`an ${is_art(otmp, ART_STORMBRINGER)
                            ? 'unholy blade'
                            : 'object'} drain your ${life}!`);
            } else {
                /* call distant_name() for possible side-effects even if
                   the result won't be printed */
                const otmpname = distant_name(otmp, xname);

                if (is_art(otmp, ART_STORMBRINGER))
                    await pline_The(`${hcolor(NH_BLACK)} blade drains your ${life}!`);
                else
                    await pline(`${The(otmpname)} drains your ${life}!`);
            }
            await losexp('life drainage');
            if (magr && magr.mhp < magr.mhpmax) {
                healmon(magr, Math.trunc((Math.abs(oldhpmax - game.u.uhpmax) + 1) / 2), 0);
            }
            return true;
        }
    }
    return false;
}
