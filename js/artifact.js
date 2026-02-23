// artifact.js -- Artifact creation, invocation, special effects
// cf. artifact.c — Ported from NetHack 3.7

import {
  artilist, NROFARTIFACTS, AFTER_LAST_ARTIFACT, ART_NONARTIFACT,
  ART_EXCALIBUR, ART_GRIMTOOTH, ART_SUNSWORD, ART_MASTER_KEY_OF_THIEVERY,
  SPFX_NONE, SPFX_NOGEN, SPFX_RESTR, SPFX_INTEL, SPFX_SPEAK, SPFX_SEEK,
  SPFX_WARN, SPFX_ATTK, SPFX_DEFN, SPFX_DRLI, SPFX_SEARCH, SPFX_BEHEAD,
  SPFX_HALRES, SPFX_ESP, SPFX_STLTH, SPFX_REGEN, SPFX_EREGEN,
  SPFX_HSPDAM, SPFX_HPHDAM, SPFX_TCTRL, SPFX_LUCK, SPFX_DMONS,
  SPFX_DCLAS, SPFX_DFLAG1, SPFX_DFLAG2, SPFX_DALIGN, SPFX_DBONUS,
  SPFX_XRAY, SPFX_REFLECT, SPFX_PROTECT,
  TAMING, HEALING, ENERGY_BOOST, UNTRAP, CHARGE_OBJ,
  LEV_TELE, CREATE_PORTAL, ENLIGHTENING, CREATE_AMMO,
  BANISH, FLING_POISON, FIRESTORM, SNOWSTORM, BLINDING_RAY,
} from './artifacts.js';

import { rn2, rnd, d } from './rng.js';
import { objectData, LUCKSTONE, WEAPON_CLASS, STRANGE_OBJECT } from './objects.js';
import {
  NON_PM, AD_PHYS, AD_MAGM, AD_FIRE, AD_COLD, AD_ELEC, AD_DRST, AD_DRLI,
  AD_STUN, AD_BLND, AD_WERE, AD_DISN, AD_STON,
  M2_UNDEAD, M2_WERE, M2_ELF, M2_ORC, M2_DEMON, M2_GIANT,
  mons,
} from './monsters.js';
import { A_NONE, A_CHAOTIC, A_NEUTRAL, A_LAWFUL, LAST_PROP } from './config.js';
import { SILVER } from './objects.js';

// Re-export key constants for consumers
export {
  artilist, NROFARTIFACTS, AFTER_LAST_ARTIFACT, ART_NONARTIFACT,
  ART_EXCALIBUR, ART_GRIMTOOTH, ART_SUNSWORD, ART_MASTER_KEY_OF_THIEVERY,
  SPFX_NONE, SPFX_NOGEN, SPFX_RESTR, SPFX_INTEL, SPFX_SPEAK, SPFX_SEEK,
  SPFX_WARN, SPFX_ATTK, SPFX_DEFN, SPFX_DRLI, SPFX_SEARCH, SPFX_BEHEAD,
  SPFX_HALRES, SPFX_ESP, SPFX_STLTH, SPFX_REGEN, SPFX_EREGEN,
  SPFX_HSPDAM, SPFX_HPHDAM, SPFX_TCTRL, SPFX_LUCK, SPFX_DMONS,
  SPFX_DCLAS, SPFX_DFLAG1, SPFX_DFLAG2, SPFX_DALIGN, SPFX_DBONUS,
  SPFX_XRAY, SPFX_REFLECT, SPFX_PROTECT,
  TAMING, HEALING, ENERGY_BOOST, UNTRAP, CHARGE_OBJ,
  LEV_TELE, CREATE_PORTAL, ENLIGHTENING, CREATE_AMMO,
  BANISH, FLING_POISON, FIRESTORM, SNOWSTORM, BLINDING_RAY,
};

// ── Artifact existence tracking ──
// artiexist[i] tracks artifact i (1-indexed; [0] is unused)
const artiexist = [];
for (let i = 0; i <= NROFARTIFACTS; i++) {
  artiexist.push({ exists: false, found: false, gift: false, wish: false,
                    named: false, viadip: false, lvldef: false, bones: false, rndm: false });
}

// Discovery list (ART_* indices in order of discovery)
const artidisco = [];

// ── Internal helpers ──

// cf. artifact.c:2821 — get_artifact(obj)
function get_artifact(obj) {
  if (obj) {
    const idx = obj.oartifact | 0;
    if (idx > 0 && idx < AFTER_LAST_ARTIFACT)
      return artilist[idx];
  }
  return artilist[ART_NONARTIFACT];
}
export { get_artifact };

// ── Name lookup ──

// cf. artifact.c:151 — artiname(artinum)
export function artiname(artinum) {
  if (artinum <= 0 || artinum > NROFARTIFACTS) return '';
  return artilist[artinum].name;
}

// cf. artifact.c:329 — artifact_name(name, otyp_p, fuzzy)
// Returns { name, otyp } or null
export function artifact_name(name, fuzzy = false) {
  if (!name) return null;
  let n = name;
  if (n.toLowerCase().startsWith('the ')) n = n.slice(4);

  for (let i = 1; i < artilist.length && artilist[i].otyp; i++) {
    let aname = artilist[i].name;
    if (aname.toLowerCase().startsWith('the ')) aname = aname.slice(4);
    if (fuzzy ? fuzzymatch(n, aname) : n.toLowerCase() === aname.toLowerCase()) {
      return { name: artilist[i].name, otyp: artilist[i].otyp };
    }
  }
  return null;
}

function fuzzymatch(s1, s2) {
  // Simple fuzzy: ignore spaces and dashes, case-insensitive
  const norm = s => s.toLowerCase().replace(/[\s-]/g, '');
  return norm(s1) === norm(s2);
}

// ── Existence tracking ──

// cf. artifact.c:111 — init_artifacts()
export function init_artifacts() {
  for (let i = 0; i <= NROFARTIFACTS; i++) {
    artiexist[i].exists = false;
    artiexist[i].found = false;
    artiexist[i].gift = false;
    artiexist[i].wish = false;
    artiexist[i].named = false;
    artiexist[i].viadip = false;
    artiexist[i].lvldef = false;
    artiexist[i].bones = false;
    artiexist[i].rndm = false;
  }
  artidisco.length = 0;
  hack_artifacts();
}

// cf. artifact.c:87 — hack_artifacts()
// Adjusts artifact entries for special cases at startup.
function hack_artifacts(player) {
  // Fix up alignments of gift artifacts for hero's role
  // This requires player context which may not be available at init.
  // For now, this is a placeholder; full implementation needs player role/alignment.
}
export { hack_artifacts };

// cf. artifact.c:356 — exist_artifact(otyp, name)
export function exist_artifact(otyp, name) {
  if (otyp && name) {
    for (let i = 1; i < artilist.length && artilist[i].otyp; i++) {
      if (artilist[i].otyp === otyp && artilist[i].name === name) {
        return artiexist[i].exists;
      }
    }
  }
  return false;
}

// cf. artifact.c:371 — artifact_exists(otmp, name, mod, flgs)
export function artifact_exists(otmp, name, mod, flgs = 0) {
  if (otmp && name) {
    for (let i = 1; i < artilist.length && artilist[i].otyp; i++) {
      if (artilist[i].otyp === otmp.otyp && artilist[i].name === name) {
        otmp.oartifact = mod ? i : 0;
        otmp.age = 0;
        if (mod) {
          artifact_origin(otmp, flgs || ONAME_RANDOM);
        } else {
          // uncreate — clear all flags
          const a = artiexist[i];
          a.exists = false; a.found = false; a.gift = false;
          a.wish = false; a.named = false; a.viadip = false;
          a.lvldef = false; a.bones = false; a.rndm = false;
        }
        break;
      }
    }
  }
}

// ONAME flags
export const ONAME_NO_FLAGS = 0;
export const ONAME_VIA_NAMING = 0x0001;
export const ONAME_WISH = 0x0002;
export const ONAME_GIFT = 0x0004;
export const ONAME_VIA_DIP = 0x0008;
export const ONAME_LEVEL_DEF = 0x0010;
export const ONAME_BONES = 0x0020;
export const ONAME_RANDOM = 0x0040;
export const ONAME_KNOW_ARTI = 0x0100;

// cf. artifact.c:478 — artifact_origin(arti, aflags)
export function artifact_origin(otmp, aflags) {
  const a = otmp.oartifact;
  if (a && a > 0 && a <= NROFARTIFACTS) {
    const info = artiexist[a];
    // Clear all bits
    info.exists = true;
    info.found = false; info.gift = false; info.wish = false;
    info.named = false; info.viadip = false; info.lvldef = false;
    info.bones = false; info.rndm = false;

    if (aflags & ONAME_KNOW_ARTI) info.found = true;
    if (aflags & ONAME_WISH) info.wish = true;
    if (aflags & ONAME_GIFT) info.gift = true;
    if (aflags & ONAME_VIA_DIP) info.viadip = true;
    if (aflags & ONAME_VIA_NAMING) info.named = true;
    if (aflags & ONAME_LEVEL_DEF) info.lvldef = true;
    if (aflags & ONAME_BONES) info.bones = true;
    if (aflags & ONAME_RANDOM) info.rndm = true;
  }
}

// cf. artifact.c:409 — found_artifact(a)
export function found_artifact(a) {
  if (a >= 1 && a <= NROFARTIFACTS && artiexist[a].exists) {
    artiexist[a].found = true;
  }
}

// cf. artifact.c:422 — find_artifact(otmp)
export function find_artifact(otmp) {
  const a = otmp.oartifact;
  if (a && !artiexist[a].found) {
    found_artifact(a);
    // livelog would go here
  }
}

// cf. artifact.c:462 — nartifact_exist()
export function nartifact_exist() {
  let count = 0;
  for (let i = 1; i <= NROFARTIFACTS; i++) {
    if (artiexist[i].exists) count++;
  }
  return count;
}

// ── Pure predicates ──

// cf. artifact.c:516 — spec_ability(otmp, abil)
export function spec_ability(otmp, abil) {
  const arti = get_artifact(otmp);
  return arti !== artilist[ART_NONARTIFACT] && (arti.spfx & abil) !== 0;
}

// cf. artifact.c:526 — confers_luck(obj)
export function confers_luck(obj) {
  if (obj.otyp === LUCKSTONE) return true;
  return !!(obj.oartifact && spec_ability(obj, SPFX_LUCK));
}

// cf. artifact.c:537 — arti_reflects(obj)
export function arti_reflects(obj) {
  const arti = get_artifact(obj);
  if (arti !== artilist[ART_NONARTIFACT]) {
    // while being worn
    if (obj.owornmask && (arti.spfx & SPFX_REFLECT)) return true;
    // just being carried
    if (arti.cspfx & SPFX_REFLECT) return true;
  }
  return false;
}

// cf. artifact.c:555 — shade_glare(obj)
export function shade_glare(obj) {
  if (objectData[obj.otyp] && objectData[obj.otyp].material === SILVER) return true;
  const arti = get_artifact(obj);
  if (arti !== artilist[ART_NONARTIFACT]
      && (arti.spfx & SPFX_DFLAG2) && arti.mtype === M2_UNDEAD)
    return true;
  return false;
}

// cf. artifact.c:575 — restrict_name(otmp, name)
export function restrict_name(otmp, name) {
  if (!name) return false;
  let n = name;
  if (n.toLowerCase().startsWith('the ')) n = n.slice(4);

  for (let i = 1; i < artilist.length && artilist[i].otyp; i++) {
    const a = artilist[i];
    if (a.otyp !== otmp.otyp) continue;
    let aname = a.name;
    if (aname.toLowerCase().startsWith('the ')) aname = aname.slice(4);
    if (n.toLowerCase() === aname.toLowerCase()) {
      return !!((a.spfx & (SPFX_NOGEN | SPFX_RESTR)) || (otmp.quan > 1));
    }
  }
  return false;
}

// cf. artifact.c:626 — attacks(adtyp, otmp)
export function attacks(adtyp, otmp) {
  const weap = get_artifact(otmp);
  if (weap !== artilist[ART_NONARTIFACT]) {
    return weap.attk.ad === adtyp;
  }
  return false;
}

// cf. artifact.c:636 — defends(adtyp, otmp)
export function defends(adtyp, otmp) {
  if (!otmp) return false;
  const weap = get_artifact(otmp);
  if (weap !== artilist[ART_NONARTIFACT]) {
    return weap.defn.ad === adtyp;
  }
  // Dragon armor defense is handled elsewhere
  return false;
}

// cf. artifact.c:687 — defends_when_carried(adtyp, otmp)
export function defends_when_carried(adtyp, otmp) {
  const weap = get_artifact(otmp);
  if (weap !== artilist[ART_NONARTIFACT]) {
    return weap.cary.ad === adtyp;
  }
  return false;
}

// cf. artifact.c:698 — protects(otmp, being_worn)
export function protects(otmp, being_worn) {
  if (being_worn && objectData[otmp.otyp] && objectData[otmp.otyp].oc_oprop === 22 /* PROTECTION */) {
    return true;
  }
  const arti = get_artifact(otmp);
  if (arti === artilist[ART_NONARTIFACT]) return false;
  return !!((arti.cspfx & SPFX_PROTECT) ||
            (being_worn && (arti.spfx & SPFX_PROTECT)));
}

// cf. artifact.c:979 — arti_immune(obj, dtyp)
export function arti_immune(obj, dtyp) {
  const weap = get_artifact(obj);
  if (weap === artilist[ART_NONARTIFACT]) return false;
  if (dtyp === AD_PHYS) return false;
  return weap.attk.ad === dtyp || weap.defn.ad === dtyp || weap.cary.ad === dtyp;
}

// cf. artifact.c:2299 — artifact_has_invprop(otmp, inv_prop)
export function artifact_has_invprop(otmp, inv_prop) {
  const arti = get_artifact(otmp);
  return arti !== artilist[ART_NONARTIFACT] && arti.inv_prop === inv_prop;
}

// cf. artifact.c:2309 — arti_cost(otmp)
export function arti_cost(otmp) {
  if (!otmp.oartifact)
    return objectData[otmp.otyp].cost || 0;
  if (artilist[otmp.oartifact].cost)
    return artilist[otmp.oartifact].cost;
  return 100 * (objectData[otmp.otyp].cost || 0);
}

// cf. artifact.c:2264 — artifact_light(obj)
export function artifact_light(obj) {
  return !!(get_artifact(obj) !== artilist[ART_NONARTIFACT] && is_art(obj, ART_SUNSWORD));
}

// cf. artifact.c:2808 — is_art(obj, art)
export function is_art(obj, art) {
  return !!(obj && obj.oartifact === art);
}

// cf. artifact.c:2837 — permapoisoned(obj)
export function permapoisoned(obj) {
  return !!(obj && is_art(obj, ART_GRIMTOOTH));
}

// cf. artifact.c:1065 — spec_m2(otmp)
export function spec_m2(otmp) {
  const artifact = get_artifact(otmp);
  if (artifact !== artilist[ART_NONARTIFACT])
    return artifact.mtype;
  return 0;
}

// ── Combat: spec_applies, bane_applies, spec_abon, spec_dbon ──

// cf. artifact.c:993 — bane_applies(oart, mon)
function bane_applies(oart, mon) {
  if (oart !== artilist[ART_NONARTIFACT] && (oart.spfx & SPFX_DBONUS) !== 0) {
    // Create a temporary copy with only DBONUS flags
    const atmp = { ...oart, spfx: oart.spfx & SPFX_DBONUS };
    return spec_applies(atmp, mon) !== 0;
  }
  return false;
}
export { bane_applies };

// cf. artifact.c:1009 — spec_applies(weap, mon)
export function spec_applies(weap, mon) {
  if (!(weap.spfx & (SPFX_DBONUS | SPFX_ATTK)))
    return (weap.attk.ad === AD_PHYS) ? 1 : 0;

  const ptr = mon.data || (mon.mnum != null ? mons[mon.mnum] : null);
  if (!ptr) return 0;

  if (weap.spfx & SPFX_DMONS) {
    return (mon.mnum === weap.mtype) ? 1 : 0;
  } else if (weap.spfx & SPFX_DCLAS) {
    return (weap.mtype === ptr.mlet) ? 1 : 0;
  } else if (weap.spfx & SPFX_DFLAG1) {
    return (ptr.mflags1 & weap.mtype) ? 1 : 0;
  } else if (weap.spfx & SPFX_DFLAG2) {
    return (ptr.mflags2 & weap.mtype) ? 1 : 0;
  } else if (weap.spfx & SPFX_DALIGN) {
    if (ptr.maligntyp === A_NONE) return 1;
    return (Math.sign(ptr.maligntyp) !== weap.alignment) ? 1 : 0;
  } else if (weap.spfx & SPFX_ATTK) {
    // Check element resistances
    switch (weap.attk.ad) {
      case AD_FIRE:
        return !(mon.mintrinsics & 0x01) ? 1 : 0; // MR_FIRE
      case AD_COLD:
        return !(mon.mintrinsics & 0x02) ? 1 : 0; // MR_COLD
      case AD_ELEC:
        return !(mon.mintrinsics & 0x10) ? 1 : 0; // MR_ELEC
      case AD_MAGM:
      case AD_STUN:
        return (rn2(100) >= (ptr.mr || 0)) ? 1 : 0;
      case AD_DRST:
        return !(mon.mintrinsics & 0x20) ? 1 : 0; // MR_POISON
      case AD_DRLI:
        return !(mon.mintrinsics & 0x40) ? 1 : 0; // MR_DRLI
      default:
        return 0;
    }
  }
  return 0;
}

// cf. artifact.c:1076 — spec_abon(otmp, mon)
export function spec_abon(otmp, mon) {
  const weap = get_artifact(otmp);
  if (weap !== artilist[ART_NONARTIFACT]
      && weap.attk.dice && spec_applies(weap, mon)) {
    return rnd(weap.attk.dice);
  }
  return 0;
}

// cf. artifact.c:1091 — spec_dbon(otmp, mon, tmp)
// Returns [damage_bonus, spec_dbon_applies]
export function spec_dbon(otmp, mon, tmp) {
  const weap = get_artifact(otmp);
  let applies;

  if (weap === artilist[ART_NONARTIFACT]
      || (weap.attk.ad === AD_PHYS && weap.attk.dice === 0 && weap.attk.sides === 0)) {
    applies = false;
  } else if (is_art(otmp, ART_GRIMTOOTH)) {
    // Grimtooth damage applies to all targets
    applies = true;
  } else {
    applies = spec_applies(weap, mon) !== 0;
  }

  if (applies) {
    return [weap.attk.sides ? rnd(weap.attk.sides) : Math.max(tmp, 1), true];
  }
  return [0, false];
}

// ── Discovery ──

// cf. artifact.c:1113 — discover_artifact(m)
export function discover_artifact(m) {
  if (m < 1 || m > NROFARTIFACTS) return;
  // Add to discovery list if not already there
  if (!artidisco.includes(m)) {
    artidisco.push(m);
  }
}

// cf. artifact.c:1131 — undiscovered_artifact(m)
export function undiscovered_artifact(m) {
  return !artidisco.includes(m);
}

// cf. artifact.c:1147 — disp_artifact_discoveries(display)
export function disp_artifact_discoveries(display) {
  // Stub — artifact discovery display
  // TODO: wire to display system
}

// cf. artifact.c:1177 — dump_artifact_info(display)
export function dump_artifact_info(display) {
  // Stub — wizard mode artifact dump
}

// ── Glow/warning ──

// cf. artifact.c:2427 — glow_color(arti_indx)
export function glow_color(arti_indx) {
  const colornum = artilist[arti_indx].acolor;
  // Map color number to color name
  const colorNames = [
    'black', 'red', 'green', 'brown', 'blue', 'magenta', 'cyan', 'gray',
    '', 'orange', 'bright green', 'yellow', 'bright blue',
    'bright magenta', 'bright cyan', 'white'
  ];
  return colorNames[colornum] || '';
}

const glow_verbs = ['quiver', 'flicker', 'glimmer', 'gleam'];

// cf. artifact.c:2442 — glow_strength(count)
function glow_strength(count) {
  return (count > 12) ? 3 : (count > 4) ? 2 : (count > 0) ? 1 : 0;
}

// cf. artifact.c:2451 — glow_verb(count, ingsfx)
export function glow_verb(count, ingsfx = false) {
  let verb = glow_verbs[glow_strength(count)];
  if (ingsfx) verb += 'ing';
  return verb;
}

// cf. artifact.c:2466 — Sting_effects(orc_count)
export function Sting_effects(orc_count) {
  // Stub — will be wired when monster warning system is integrated
  // Handles Sting/Orcrist/Grimtooth warning glow
}

// ── Touch and equipment ──

// cf. artifact.c:908 — touch_artifact(obj, mon)
export function touch_artifact(obj, mon) {
  const oart = get_artifact(obj);
  if (oart === artilist[ART_NONARTIFACT]) return 1;

  const self_willed = !!(oart.spfx & SPFX_INTEL);
  // For monsters, check alignment and role restrictions
  if (mon && mon.data) {
    const badalign = !!(oart.spfx & SPFX_RESTR) && oart.alignment !== A_NONE
                     && oart.alignment !== (mon.maligntyp || 0);
    const badclass = self_willed && oart.role !== NON_PM;
    const bane = bane_applies(oart, mon);
    if ((badclass || badalign || bane) && self_willed) return 0;
    if (badalign && !rn2(4)) return 0;
  }
  return 1;
}

// cf. artifact.c:2508 — retouch_object(objp, loseit)
export function retouch_object(obj, loseit) {
  // Stub — artifact touchability after form/alignment change
  // TODO: full implementation with worn item removal
  return 1; // can touch
}

// cf. artifact.c:2640 — retouch_equipment(dropflag)
export function retouch_equipment(dropflag) {
  // Stub — re-check all equipped items for touchability
  // TODO: full implementation
}

// ── Artifact intrinsics ──

// cf. artifact.c:716 — set_artifact_intrinsic(otmp, on, wp_mask)
export function set_artifact_intrinsic(otmp, on, wp_mask) {
  // Stub — apply/remove artifact intrinsic properties
  // TODO: full implementation (needs player intrinsic bitfield system)
}

// ── Artifact creation ──

// cf. artifact.c:171 — mk_artifact(otmp, alignment, max_giftvalue, adjust_spe)
export function mk_artifact(otmp, alignment, max_giftvalue = 99, adjust_spe = true, mksobj_fn = null) {
  const by_align = (alignment !== A_NONE);
  const o_typ = (by_align || !otmp) ? 0 : otmp.otyp;
  const eligible = [];
  const alteligible = [];

  // Gather eligible artifacts
  for (let m = 1; m < artilist.length && artilist[m].otyp; m++) {
    const a = artilist[m];
    if (artiexist[m].exists) continue;
    if (a.spfx & SPFX_NOGEN) continue;
    if (a.gift_value > max_giftvalue) continue;

    if (!by_align) {
      if (a.otyp === o_typ) eligible.push(m);
      continue;
    }

    // Looking for alignment-specific item
    if (a.alignment === alignment || a.alignment === A_NONE) {
      eligible.push(m);
    }
  }

  const n = eligible.length || alteligible.length;
  const candidates = eligible.length ? eligible : alteligible;

  if (candidates.length) {
    const m = candidates[rn2(candidates.length)];
    const a = artilist[m];

    if (by_align && mksobj_fn) {
      otmp = mksobj_fn(a.otyp, true, false);
    }
    if (!otmp) return null;

    otmp.oeroded = 0;
    otmp.oeroded2 = 0;
    otmp.oname = a.name;
    otmp.oartifact = m;
    artifact_origin(otmp, ONAME_RANDOM);

    if (adjust_spe && a.gen_spe) {
      const new_spe = otmp.spe + a.gen_spe;
      if (new_spe >= -10 && new_spe < 10) otmp.spe = new_spe;
    }
  } else if (by_align) {
    return null; // no eligible artifact found
  }

  if (otmp && permapoisoned(otmp)) {
    otmp.opoisoned = 1;
  }
  return otmp;
}

// ── Invocation stubs (Phase 3/8) ──

// cf. artifact.c:1249 — Mb_hit(magr, mdef, mb, dmgptr, dieroll, vis, hittee)
export function Mb_hit(magr, mdef, mb, dmgptr, dieroll, vis, hittee) {
  // TODO: Magicbane special hit processing
  return false;
}

// cf. artifact.c:1749 — doinvoke()
export function doinvoke() {
  // TODO: #invoke command handler
  return 0;
}

// cf. artifact.c:2131 — arti_invoke(obj)
export function arti_invoke(obj) {
  // TODO: invocation dispatcher
  return 0;
}

// Invocation sub-stubs
export function invoke_ok(obj) { return 0; }
export function nothing_special(obj) { }
export function invoke_taming(obj) { return 0; }
export function invoke_healing(obj) { return 0; }
export function invoke_energy_boost(obj) { return 0; }
export function invoke_untrap(obj) { return 0; }
export function invoke_charge_obj(obj) { return 0; }
export function invoke_create_portal(obj) { return 0; }
export function invoke_create_ammo(obj) { return 0; }
export function invoke_banish(obj) { return 0; }
export function invoke_fling_poison(obj) { return 0; }
export function invoke_storm_spell(obj) { return 0; }
export function invoke_blinding_ray(obj) { return 0; }
export function arti_invoke_cost_pw(obj) { return 0; }
export function arti_invoke_cost(obj) { return false; }
export function finesse_ahriman(obj) { return false; }

// cf. artifact.c:2279 — arti_speak(obj)
export function arti_speak(obj) {
  // TODO: artifact speech
  return 0;
}

// ── Mapping helpers ──

// cf. artifact.c:2320 — abil_to_adtyp(abil)
export function abil_to_adtyp(abil) {
  // Maps ability string to AD_ type
  // In JS, we use string-based ability names rather than pointers
  const map = {
    'fire_resistance': AD_FIRE,
    'cold_resistance': AD_COLD,
    'shock_resistance': AD_ELEC,
    'antimagic': AD_MAGM,
    'disint_resistance': AD_DISN,
    'poison_resistance': AD_DRST,
    'drain_resistance': AD_DRLI,
  };
  return map[abil] || 0;
}

// cf. artifact.c:2344 — abil_to_spfx(abil)
export function abil_to_spfx(abil) {
  const map = {
    'searching': SPFX_SEARCH,
    'halluc_resistance': SPFX_HALRES,
    'telepat': SPFX_ESP,
    'stealth': SPFX_STLTH,
    'regeneration': SPFX_REGEN,
    'teleport_control': SPFX_TCTRL,
    'warn_of_mon': SPFX_WARN,
    'warning': SPFX_WARN,
    'energy_regeneration': SPFX_EREGEN,
    'half_spell_damage': SPFX_HSPDAM,
    'half_physical_damage': SPFX_HPHDAM,
    'reflecting': SPFX_REFLECT,
  };
  return map[abil] || 0;
}

// cf. artifact.c:2376 — what_gives(abil)
export function what_gives(abil) {
  // TODO: find worn/wielded item granting intrinsic
  return null;
}

// ── Master Key and misc ──

// cf. artifact.c:2708 — count_surround_traps(x, y)
export function count_surround_traps(x, y) {
  // TODO: count adjacent traps
  return 0;
}

// cf. artifact.c:2753 — mkot_trap_warn()
export function mkot_trap_warn() {
  // TODO: Master Key trap sensing
}

// cf. artifact.c:2775 — is_magic_key(mon, obj)
export function is_magic_key(mon, obj) {
  if (is_art(obj, ART_MASTER_KEY_OF_THIEVERY)) {
    // Simplified: blessed = magic for non-rogues, non-cursed for rogues
    return obj.blessed;
  }
  return false;
}

// cf. artifact.c:2790 — has_magic_key(mon)
export function has_magic_key(mon) {
  if (!mon) return null;
  const inv = mon.minvent || [];
  for (const o of inv) {
    if (is_magic_key(mon, o)) return o;
  }
  return null;
}

// ── Save/restore support ──

// cf. artifact.c:119 — save_artifacts()
export function save_artifacts() {
  return {
    artiexist: artiexist.map(a => ({ ...a })),
    artidisco: [...artidisco],
  };
}

// cf. artifact.c:133 — restore_artifacts(data)
export function restore_artifacts(data) {
  if (data && data.artiexist) {
    for (let i = 0; i <= NROFARTIFACTS && i < data.artiexist.length; i++) {
      Object.assign(artiexist[i], data.artiexist[i]);
    }
  }
  if (data && data.artidisco) {
    artidisco.length = 0;
    artidisco.push(...data.artidisco);
  }
}

// ── Expose artiexist for direct access (needed by some callers) ──
export function get_artiexist() { return artiexist; }
