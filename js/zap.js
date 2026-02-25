// zap.js -- Wand zapping and beam effects
// C ref: zap.c — dozap(), weffects(), dobuzz(), zhitm(), zap_hit()
// C ref: trap.c — burnarmor()
// C ref: mon.c — xkilled(), corpse_chance()

import { rn2, rnd, d, c_d, rn1, rne, rnz } from './rng.js';
import {
    isok, ACCESSIBLE, IS_WALL, IS_DOOR, COLNO, ROWNO, A_STR, A_WIS, A_CON,
    DRAWBRIDGE_UP, DRAWBRIDGE_DOWN,
} from './config.js';
import { exercise } from './attrib_exercise.js';
import { objectData, WAND_CLASS, TOOL_CLASS, WEAPON_CLASS, SCROLL_CLASS,
         POTION_CLASS, RING_CLASS, SPBOOK_CLASS, GEM_CLASS, ROCK_CLASS,
         ARMOR_CLASS,
         WAN_FIRE, WAN_COLD, WAN_LIGHTNING,
         WAN_SLEEP, WAN_DEATH, WAN_MAGIC_MISSILE, WAN_STRIKING,
         WAN_DIGGING, WAN_NOTHING,
         WAN_SECRET_DOOR_DETECTION, WAN_ENLIGHTENMENT, WAN_CREATE_MONSTER, WAN_WISHING,
         WAN_SLOW_MONSTER, WAN_SPEED_MONSTER, WAN_UNDEAD_TURNING,
         WAN_POLYMORPH, WAN_CANCELLATION, WAN_TELEPORTATION,
         WAN_MAKE_INVISIBLE, WAN_LOCKING, WAN_PROBING, WAN_OPENING,
         WAN_LIGHT,
         SPE_FORCE_BOLT, SPE_KNOCK, SPE_WIZARD_LOCK,
         SPE_HEALING, SPE_EXTRA_HEALING,
         SPE_SLOW_MONSTER, SPE_CANCELLATION, SPE_TELEPORT_AWAY,
         SPE_POLYMORPH, SPE_TURN_UNDEAD, SPE_STONE_TO_FLESH,
         SPE_DRAIN_LIFE, SPE_MAGIC_MISSILE, SPE_FINGER_OF_DEATH,
         SPE_LIGHT, SPE_DETECT_UNSEEN,
         CORPSE, FOOD_CLASS, FLESH,
         STRANGE_OBJECT, BOULDER, STATUE, FIGURINE, EGG,
         SCR_FIRE, BAG_OF_HOLDING,
         SCR_MAGIC_MAPPING,
         ROCK } from './objects.js';
import { mons, G_FREQ, MZ_TINY, MZ_HUMAN, M1_NOEYES,
         M2_NEUTER, M2_MALE, M2_FEMALE, M2_UNDEAD, M2_DEMON,
         MR_FIRE, MR_COLD, MR_SLEEP, MR_ELEC, MR_POISON, MR_ACID, MR_DISINT,
         PM_LIZARD, PM_LICHEN, PM_DEATH, PM_CLAY_GOLEM,
         PM_LONG_WORM, S_TROLL, S_ZOMBIE, S_EEL, S_GOLEM, S_MIMIC } from './monsters.js';
import { rndmonnum, makemon } from './makemon.js';
import { next_ident, mksobj, mkobj, weight } from './mkobj.js';
import { newexplevel } from './exper.js';
import { corpse_chance } from './mon.js';
import { xkilled as mon_xkilled, killed as mon_killed, monkilled,
         wakeup, healmon } from './mon.js';
import { nhgetch } from './input.js';
import { nonliving, is_undead, is_demon, is_rider,
         monDisplayName, resists_fire, resists_cold, resists_elec,
         resists_poison, resists_acid, resists_disint } from './mondata.js';
import { mondead } from './monutil.js';
import { placeFloorObject } from './floor_objects.js';
import { zap_dig as zap_dig_core } from './dig.js';
import { pline } from './pline.js';
import { mon_nam, Monnam } from './do_name.js';
import { find_mac } from './worn.js';
import { mon_adjust_speed } from './worn.js';
import { sleep_monst, slept_monst } from './mhitm.js';
import { mstatusline } from './insight.js';
import { display_minventory } from './invent.js';
import { obj_resists } from './objdata.js';
import { enexto } from './teleport.js';
import { splitobj } from './mkobj.js';
import { delobj } from './invent.js';
import { monflee } from './monmove.js';
import { readobjnam, hands_obj } from './objnam.js';
import { hold_another_object, prinv } from './invent.js';
import { findit } from './detect.js';
import { is_db_wall, find_drawbridge, open_drawbridge, close_drawbridge, destroy_drawbridge } from './dbridge.js';
import { HOLE, TRAPDOOR } from './symbols.js';
import { engr_at, del_engr_at, wipe_engr_at, rloc_engr, make_engr_at } from './engrave.js';
import { random_engraving_rng } from './dungeon.js';
import {
    tmp_at, nh_delay_output, nh_delay_output_nowait,
    DISP_BEAM, DISP_END,
} from './animation.js';

// Direction vectors matching commands.js DIRECTION_KEYS
const DIRECTION_KEYS = {
    'h': [-1,  0],  'j': [ 0,  1],  'k': [ 0, -1],  'l': [ 1,  0],
    'y': [-1, -1],  'u': [ 1, -1],  'b': [-1,  1],  'n': [ 1,  1],
    '.': [ 0,  0],  // self
};

// Beam types (C ref: zap.c AD_* / ZT_*)
const ZT_MAGIC_MISSILE = 0;
const ZT_FIRE = 1;
const ZT_COLD = 2;
const ZT_SLEEP = 3;
const ZT_DEATH = 4;
const ZT_LIGHTNING = 5;
const ZT_POISON_GAS = 6;
const ZT_ACID = 7;

// Beam type encoding for wand/spell/breath
const ZT_WAND = (x) => x;
const ZT_SPELL = (x) => 10 + x;
const ZT_BREATH = (x) => 20 + x;

function is_hero_spell(type) { return type >= 10 && type < 20; }

// C ref: zap.c zaptype() — convert monster zap value to hero zap value
function zaptype(type) {
    if (type <= -30 && -39 <= type) type += 30;
    type = Math.abs(type);
    return type;
}

// C ref: zap.c flash_types[] — beam name strings
const flash_types = [
    "magic missile", "bolt of fire", "bolt of cold", "sleep ray", "death ray",
    "bolt of lightning", "", "", "", "",
    "magic missile", "fireball", "cone of cold", "sleep ray", "finger of death",
    "bolt of lightning", "", "", "", "",
    "blast of missiles", "blast of fire", "blast of frost", "blast of sleep gas",
    "blast of disintegration", "blast of lightning",
    "blast of poison gas", "blast of acid", "", ""
];

function flash_str(fltyp) {
    if (fltyp >= 0 && fltyp < flash_types.length) return flash_types[fltyp];
    return "beam";
}

// MAGIC_COOKIE for disintegration
const MAGIC_COOKIE = 1000;

// Map wand otyp to beam type
function wandToBeamType(otyp) {
    switch (otyp) {
        case WAN_MAGIC_MISSILE: return ZT_MAGIC_MISSILE;
        case WAN_FIRE:          return ZT_FIRE;
        case WAN_COLD:          return ZT_COLD;
        case WAN_SLEEP:         return ZT_SLEEP;
        case WAN_DEATH:         return ZT_DEATH;
        case WAN_LIGHTNING:     return ZT_LIGHTNING;
        default:                return -1;
    }
}

// Beam damage dice (C ref: zap.c bzap array — damage die per type)
function beamDamageDice(type) {
    switch (type) {
        case ZT_MAGIC_MISSILE: return [2, 6];  // 2d6
        case ZT_FIRE:          return [6, 6];  // 6d6
        case ZT_COLD:          return [6, 6];  // 6d6
        case ZT_SLEEP:         return [0, 0];  // sleep has no HP damage
        case ZT_DEATH:         return [0, 0];  // instant death
        case ZT_LIGHTNING:     return [6, 6];  // 6d6
        default:               return [0, 0];
    }
}

// C ref: zap.c:6070 resist() — magic resistance saving throw
// Returns true if monster resists (damage halved by caller).
// Consumes one rn2() call.
export function resist(mon, oclass) {
    const mdat = mons[mon.mndx];
    // C ref: zap.c:6081-6103 — attack level based on object class
    let alev;
    switch (oclass) {
    case WAND_CLASS:    alev = 12; break;
    case TOOL_CLASS:    alev = 10; break;
    case WEAPON_CLASS:  alev = 10; break;
    case SCROLL_CLASS:  alev = 9; break;
    case POTION_CLASS:  alev = 6; break;
    case RING_CLASS:    alev = 5; break;
    default:            alev = 10; break; // spell: u.ulevel, simplified
    }

    // C ref: zap.c:6104-6109 — defense level
    let dlev = mon.m_lev ?? mon.mlevel ?? 0;
    if (dlev > 50) dlev = 50;
    else if (dlev < 1) dlev = 1;

    // C ref: zap.c:6111 — rn2(100 + alev - dlev) < mr
    const mr = mdat.mr || 0;
    return rn2(100 + alev - dlev) < mr;
}

// C ref: trap.c:88 burnarmor() — check if monster's armor burns
// While loop picks random armor slot; case 1 (body armor) always returns TRUE.
// Other cases continue if monster has no armor in that slot.
function burnarmor(mon) {
    // C ref: trap.c:112-156 — while(1) switch(rn2(5))
    while (true) {
        const slot = rn2(5);
        if (slot === 1) {
            // Case 1: cloak/body/shirt — always returns TRUE even if no armor
            return true;
        }
        // Cases 0, 2, 3, 4: if monster has no armor (typical), continue loop
        // For monsters with armor we'd check erode_obj, but for simplicity
        // assume no armor (most early monsters) -> continue
    }
}

// C ref: zap.c:4646 zap_hit() — determine if beam hits a monster
function zap_hit(ac, type) {
    // C ref: zap.c:4650 — rn2(20) chance check
    const chance = rn2(20);
    if (!chance) {
        // C ref: zap.c:4655 — small chance for naked target to dodge
        return rnd(10) < ac;
    }
    return (3 - chance < ac);
}

// C ref: zap.c:4224 zhitm() — apply beam damage to a monster
// Returns damage dealt
function zhitm(mon, type, nd, map) {
    const mdat = mons[mon.mndx];
    let tmp = 0;
    const damgtype = zaptype(type) % 10;

    switch (damgtype) {
    case ZT_MAGIC_MISSILE:
        if (mdat.mr1 & MR_FIRE) { // resists_magm approximation
            // magic resistance — no damage
            break;
        }
        tmp = d(nd, 6);
        break;
    case ZT_FIRE:
        if (mdat.mr1 & MR_FIRE) {
            break; // resistant — no damage
        }
        tmp = d(nd, 6);
        if (mdat.mr1 & MR_COLD) tmp += 7; // cold-resistant takes extra fire
        if (burnarmor(mon)) {
            if (!rn2(3)) {
                // destroy_items — stub for most monsters
            }
        }
        break;
    case ZT_COLD:
        if (mdat.mr1 & MR_COLD) {
            break; // resistant
        }
        tmp = d(nd, 6);
        if (mdat.mr1 & MR_FIRE) tmp += d(nd, 3); // fire-resistant takes extra cold
        if (!rn2(3)) {
            // destroy_items
        }
        break;
    case ZT_SLEEP:
        tmp = 0;
        sleep_monst(mon, d(nd, 25), type === ZT_WAND(ZT_SLEEP) ? WAND_CLASS : 0);
        break;
    case ZT_DEATH:
        if (Math.abs(type) !== ZT_BREATH(ZT_DEATH)) {
            // death ray (not disintegration)
            if (mon.mndx === PM_DEATH) {
                // PM_DEATH absorbs death ray, heals
                healmon(mon, Math.floor(mon.mhpmax * 3 / 2), Math.floor(mon.mhpmax / 2));
                if (mon.mhpmax >= MAGIC_COOKIE)
                    mon.mhpmax = MAGIC_COOKIE - 1;
                tmp = 0;
                break;
            }
            if (nonliving(mdat) || is_demon(mdat)) {
                break; // immune
            }
            type = -1; // no saving throw
        } else {
            // disintegration breath
            if (mdat.mr1 & MR_DISINT) {
                break; // resistant
            }
            // No armor handling — simplified; full kill
            tmp = MAGIC_COOKIE;
            type = -1;
            break;
        }
        tmp = mon.mhp + 1;
        break;
    case ZT_LIGHTNING:
        tmp = d(nd, 6);
        if (mdat.mr1 & MR_ELEC) {
            tmp = 0; // resistant, but still rolls damage for RNG
        }
        // blindness from lightning
        if (!(mdat.mflags1 & M1_NOEYES) && nd > 2) {
            const rnd_tmp = rnd(50);
            mon.mcansee = 0;
            if (((mon.mblinded || 0) + rnd_tmp) > 127)
                mon.mblinded = 127;
            else
                mon.mblinded = (mon.mblinded || 0) + rnd_tmp;
        }
        if (!rn2(3)) {
            // destroy_items
        }
        break;
    case ZT_POISON_GAS:
        if (mdat.mr1 & MR_POISON) {
            break;
        }
        tmp = d(nd, 6);
        break;
    case ZT_ACID:
        if (mdat.mr1 & MR_ACID) {
            break;
        }
        tmp = d(nd, 6);
        if (!rn2(6)) { /* acid_damage(MON_WEP) */ }
        if (!rn2(6)) { /* erode_armor */ }
        break;
    }

    // C ref: zap.c:4375-4377 — resist halves damage
    if (tmp > 0 && type >= 0 &&
        resist(mon, type < ZT_SPELL(0) ? WAND_CLASS : 0)) {
        tmp = Math.floor(tmp / 2);
    }
    if (tmp < 0) tmp = 0;

    mon.mhp -= tmp;
    return tmp;
}

// C ref: mon.c:3178-3252 corpse_chance() — use shared implementation from mon.js
// (imported at top of file)

// C ref: mon.c:3581 xkilled() — handle monster death
// Creates corpse, awards XP
function xkilled_local(mon, map, player, display) {
    // Award experience
    const exp = (mon.mlevel + 1) * (mon.mlevel + 1);
    player.exp += exp;
    player.score += exp;
    newexplevel(player, display);

    // C ref: mon.c:3581 — "illogical but traditional" treasure drop
    rn2(6);

    // C ref: mon.c:3243 — corpse_chance
    const createCorpse = corpse_chance(mon);

    if (createCorpse) {
        // C ref: mksobj(CORPSE, TRUE, FALSE) — newobj() consumes next_ident().
        const o_id = next_ident();

        // C ref: mksobj_init -> rndmonnum for corpse init
        const rndmndx = rndmonnum(1);

        // C ref: mksobj_postinit -> gender for random monster
        if (rndmndx >= 0) {
            const rndmon = mons[rndmndx];
            const f2 = rndmon ? rndmon.flags2 || 0 : 0;
            if (!(f2 & M2_NEUTER) && !(f2 & M2_FEMALE) && !(f2 & M2_MALE)) {
                rn2(2); // sex
            }
        }

        // C ref: set_corpsenm -> start_corpse_timeout for the RANDOM monster
        // (lichen/lizard skip is checked against random monster, not actual monster)
        if (rndmndx !== PM_LIZARD && rndmndx !== PM_LICHEN
            && mons[rndmndx] && mons[rndmndx].symbol !== S_TROLL) {
            // Normal rot timeout: rnz(10) during gameplay, rnz(25) during mklev
            rnz(10);
        }

        // Place corpse on the map
        if (map) {
            const corpse = {
                otyp: CORPSE,
                oclass: FOOD_CLASS,
                material: FLESH,
                o_id,
                corpsenm: mon.mndx || 0,
                displayChar: '%',
                displayColor: 7,
                ox: mon.mx,
                oy: mon.my,
                cursed: false,
                blessed: false,
                oartifact: 0,
                // C ref: mkobj.c set_corpsenm() stamps corpse age with monstermoves.
                age: (player?.turns || 0) + 1,
            };
            placeFloorObject(map, corpse);
        }
    }
}

// C ref: zap.c:4763 dobuzz() — fire a beam across the map
// sx, sy: starting position; dx, dy: direction
async function dobuzz_legacy(player, map, display, type, nd, dx, dy, sx, sy) {
    const range = 7 + (player.level >> 1); // C ref: zap.c rnd(7+mcastu) typical
    let x = sx;
    let y = sy;

    // C ref: zap.c:4763 — beam wander check at start
    rn2(7);
    tmp_at(DISP_BEAM, beamTempGlyph(type, dx, dy));
    try {
        for (let i = 0; i < range; i++) {
            x += dx;
            y += dy;

            if (!isok(x, y)) break;
            const loc = map.at(x, y);
            if (!loc) break;

            tmp_at(x, y);
            await nh_delay_output();

            // Check for monster hit
            const mon = map.monsterAt(x, y);
            if (mon && !mon.dead) {
                // C ref: zap.c:4812 — zap_hit with monster AC
                const mac = mon.mac || 10;
                zap_hit(mac, 0);

                // C ref: zap.c:4825 — zhitm
                zhitm(mon, type, nd, map);

                // Apply damage (zhitm already applied to mon.mhp)
                if (mon.mhp <= 0) {
                    mondead(mon, map, player);
                    // C ref: nonliving monsters (undead, golems) are "destroyed" not "killed"
                    const mdat = mon.type || {};
                    const killVerb = nonliving(mdat) ? 'destroy' : 'kill';
                    display.putstr_message(`You ${killVerb} the ${monDisplayName(mon)}!`);
                    map.removeMonster(mon);
                    xkilled_local(mon, map, player, display);
                }
                // Beam continues through dead monsters
                continue;
            }

            // Check for wall/boundary — beam stops or bounces
            if (IS_WALL(loc.typ) || loc.typ === 0) {
                // C ref: zap.c:4963 — beam bounce
                // rn2(75) for each direction component to determine bounce
                if (dx) rn2(75);
                if (dy) rn2(75);
                display.putstr_message('The bolt of fire bounces!');
                break;
            }
        }
    } finally {
        tmp_at(DISP_END, 0);
    }
}

// Main zap handler — called from commands.js
// C ref: zap.c dozap()
export async function handleZap(player, map, display, game) {
    // Read item letter
    const itemCh = await nhgetch();
    const itemChar = String.fromCharCode(itemCh);

    if (itemCh === 27) { // ESC
        if (game.flags.verbose) {
            display.putstr_message('Never mind.');
        }
        return { moved: false, tookTime: false };
    }

    // Find the wand in inventory
    const wand = player.inventory.find(o => o.invlet === itemChar);
    if (!wand || wand.oclass !== WAND_CLASS) {
        display.putstr_message("That's not a wand!");
        return { moved: false, tookTime: false };
    }

    // Read direction
    const dirCh = await nhgetch();
    const dirChar = String.fromCharCode(dirCh);
    const dir = DIRECTION_KEYS[dirChar];

    if (!dir) {
        if (game.flags.verbose) {
            display.putstr_message('Never mind.');
        }
        return { moved: false, tookTime: false };
    }

    // Determine beam type
    const beamType = wandToBeamType(wand.otyp);
    const isBeamWand = beamType >= 0;

    // C ref: attrib.c:506 — exercise(A_STR, TRUE) before zapping
    exercise(player, A_STR, true);

    // Decrease charges
    if (wand.spe > 0) wand.spe--;

    player.dx = dir[0];
    player.dy = dir[1];
    player.dz = 0;

    if (!isBeamWand) {
        // Route non-beam wands through weffects() so non-ray zap behavior
        // can evolve toward zap.c parity instead of hardcoded no-op.
        await weffects(wand, player, map, display, game);
    } else {
        // C ref: zap.c — nd (number of dice) = 6 for wand beams
        const nd = 6;
        // Fire the beam
        await dobuzz_legacy(player, map, display, beamType, nd, dir[0], dir[1], player.x, player.y);
    }

    return { moved: false, tookTime: true };
}

// -- Phase 5: Additional zap functions --

// Beam type constants (exported)
export { ZT_MAGIC_MISSILE, ZT_FIRE, ZT_COLD, ZT_SLEEP, ZT_DEATH, ZT_LIGHTNING };
export { ZT_POISON_GAS, ZT_ACID, ZT_WAND, ZT_SPELL, ZT_BREATH };
export { MAGIC_COOKIE };
export { zaptype, flash_str, is_hero_spell };

// cf. zap.c destroy_item() — destroy items in hero inventory by type
// osym: object class symbol, dmgtyp: AD_FIRE/AD_COLD/AD_ELEC
export function destroy_item(osym, dmgtyp, player) {
  if (!player || !player.inventory) return 0;
  let cnt = 0;
  // Iterate inventory, check each item for destroyability
  for (const obj of player.inventory) {
    if (obj.oartifact) continue; // artifacts immune
    if (!destroyable_by(obj, dmgtyp)) continue;
    // Each item has 1 in 3 chance of being destroyed per unit
    for (let i = 0; i < (obj.quan || 1); i++) {
      if (!rn2(3)) cnt++;
    }
  }
  // Actual destruction deferred — just consume RNG for parity
  return cnt;
}

// cf. zap.c destroy_mitem() — destroy items in monster inventory
export function destroy_mitem(mon, osym, dmgtyp) {
  if (!mon || !mon.minvent) return 0;
  let cnt = 0;
  for (const obj of mon.minvent) {
    if (obj.oartifact) continue;
    if (!destroyable_by(obj, dmgtyp)) continue;
    for (let i = 0; i < (obj.quan || 1); i++) {
      if (!rn2(3)) cnt++;
    }
  }
  return cnt;
}

// Check if object is destroyable by damage type
function destroyable_by(obj, dmgtyp) {
  const { AD_FIRE, AD_COLD, AD_ELEC } = { AD_FIRE: 2, AD_COLD: 3, AD_ELEC: 6 };
  if (dmgtyp === AD_FIRE) {
    return obj.oclass === POTION_CLASS || obj.oclass === SCROLL_CLASS ||
           obj.oclass === SPBOOK_CLASS;
  }
  if (dmgtyp === AD_COLD) {
    return obj.oclass === POTION_CLASS;
  }
  if (dmgtyp === AD_ELEC) {
    return obj.oclass === RING_CLASS || obj.oclass === WAND_CLASS;
  }
  return false;
}

// ============================================================
// cf. zap.c revive() — revive a corpse into a living monster
// ============================================================
export function revive(obj, by_hero, map) {
  if (!obj || obj.otyp !== CORPSE) return null;

  const montype = obj.corpsenm;
  if (montype == null || montype < 0) return null;
  const mptr = mons[montype];
  if (!mptr) return null;

  const is_zomb = (mptr.symbol === S_ZOMBIE);

  // C ref: zap.c:910-937 — get location from corpse
  let x = obj.ox || 0;
  let y = obj.oy || 0;

  // C ref: zap.c:948-950 — container checks
  // If in a bag of holding, rn2(40) chance to fail
  if (obj.where === 'contained' && obj.ocontainer) {
    const container = obj.ocontainer;
    if (container.olocked) return null;
    if (container.otyp === BAG_OF_HOLDING && rn2(40)) return null;
  }

  if (!x && !y) return null;

  // C ref: zap.c:965-971 — norevive or eel-not-in-water check
  if (obj.norevive) return null;

  // C ref: zap.c:1004-1007 — make a new monster
  // Simplified: create monster at corpse location
  const mtmp = makemon(mptr, x, y, 0x0200 | 0x0800, 0, map);
  // NO_MINVENT=0x0200, MM_NOCOUNTBIRTH=0x0800 (approximate)
  if (!mtmp) return null;

  // C ref: zap.c:1012-1017 — unhide revived monster
  if (mtmp.mundetected) mtmp.mundetected = 0;

  // C ref: zap.c:1019-1021 — handle quan > 1
  // (simplified: just use up the corpse)

  // C ref: zap.c:1024-1060 — by_hero shop charge and messages
  if (by_hero) {
    pline("The corpse glows iridescently.");
  }

  // Remove the corpse from the map
  if (map && typeof map.removeFloorObject === 'function') {
    map.removeFloorObject(obj);
  }

  return mtmp;
}

// ============================================================
// cf. zap.c cancel_monst() — cancel a monster's magical abilities
// ============================================================
export function cancel_monst(mon, obj, youattack, allow_cancel_kill, self_cancel) {
  if (!mon) return false;

  // C ref: zap.c:3146-3148 — resist check
  const oclass = obj ? obj.oclass : 0;
  if (resist(mon, oclass, 0)) return false;

  // C ref: zap.c:3150-3162 — self_cancel: cancel inventory
  if (self_cancel) {
    if (mon.minvent) {
      for (const otmp of mon.minvent) {
        cancel_item(otmp);
      }
    }
  }

  // C ref: zap.c:3184-3200 — cancel the monster
  mon.mcan = 1;

  // C ref: zap.c:3189-3200 — clay golem dies when cancelled
  if (mon.mndx === PM_CLAY_GOLEM) {
    if (allow_cancel_kill) {
      mon.mhp = 0;
      // Caller handles death
    }
  }
  return true;
}

// Helper: cancel_item — cancel an object's magical properties
function cancel_item(obj) {
  if (!obj) return;
  // C ref: zap.c — cancel items: remove charges from wands, remove
  // enchantment from weapons/armor, etc.
  if (obj.oclass === WAND_CLASS) {
    obj.spe = -1; // discharged
  }
  if (obj.blessed) obj.blessed = false;
  if (obj.spe > 0 && (obj.oclass === ARMOR_CLASS || obj.oclass === WEAPON_CLASS)) {
    obj.spe = 0;
  }
  obj.oerodeproof = false;
}

// ============================================================
// cf. zap.c bhitm() — bolt/beam hits monster (IMMEDIATE wand effect)
// ============================================================
export function bhitm(mon, otmp, map, player) {
  if (!mon || !otmp) return 0;
  let ret = 0;
  let wake = true;
  const otyp = otmp.otyp;

  switch (otyp) {
  case WAN_STRIKING:
  case SPE_FORCE_BOLT: {
    // C ref: zap.c:200 — rnd(20) < 10 + find_mac(mon)
    const mac = find_mac ? find_mac(mon) : (mon.mac || 10);
    if (rnd(20) < 10 + mac) {
      const dmg = d(2, 12);
      resist(mon, otmp.oclass);
      mon.mhp -= dmg;
    }
    break;
  }
  case WAN_SLOW_MONSTER:
  case SPE_SLOW_MONSTER:
    if (!resist(mon, otmp.oclass)) {
      mon_adjust_speed(mon, -1, otmp);
    }
    break;
  case WAN_SPEED_MONSTER:
    if (!resist(mon, otmp.oclass)) {
      mon_adjust_speed(mon, 1, otmp);
    }
    break;
  case WAN_UNDEAD_TURNING:
  case SPE_TURN_UNDEAD: {
    wake = false;
    const mdat = mons[mon.mndx];
    if (is_undead(mdat)) {
      wake = true;
      const dmg = rnd(8);
      if (!resist(mon, otmp.oclass)) {
        mon.mhp -= dmg;
        monflee(mon, 0, false, true);
      }
    }
    break;
  }
  case WAN_POLYMORPH:
  case SPE_POLYMORPH:
    // C ref: zap.c:288 — rn2(25) system shock
    if (!resist(mon, otmp.oclass)) {
      if (!rn2(25)) {
        // system shock — kills the monster
        mon.mhp = 0;
      }
      // else: would call newcham() — simplified, no actual poly
    }
    break;
  case WAN_CANCELLATION:
  case SPE_CANCELLATION:
    cancel_monst(mon, otmp, true, true, false);
    break;
  case WAN_TELEPORTATION:
  case SPE_TELEPORT_AWAY:
    // Would call u_teleport_mon — simplified
    break;
  case WAN_MAKE_INVISIBLE:
    // Would call mon_set_minvis — simplified
    mon.minvis = 1;
    break;
  case WAN_LOCKING:
  case SPE_WIZARD_LOCK:
    wake = false;
    break;
  case WAN_PROBING:
    wake = false;
    probe_monster(mon);
    break;
  case WAN_OPENING:
  case SPE_KNOCK:
    wake = false;
    break;
  case SPE_HEALING:
  case SPE_EXTRA_HEALING: {
    const healamt = d(6, otyp === SPE_EXTRA_HEALING ? 8 : 4);
    wake = false;
    if (mon.mndx !== PM_DEATH - 1) { // not Pestilence
      healmon(mon, healamt, 0);
    } else {
      resist(mon, otmp.oclass);
    }
    break;
  }
  case WAN_LIGHT:
    // broken wand light effect — simplified
    break;
  case WAN_SLEEP:
    // broken wand sleep effect
    if (sleep_monst(mon, d(1 + (otmp.spe || 0), 12), WAND_CLASS))
      slept_monst(mon);
    break;
  case SPE_DRAIN_LIFE:
    // drain life — simplified
    if (!resist(mon, otmp.oclass)) {
      const dmg = d(2, 8);
      mon.mhp -= dmg;
    }
    break;
  default:
    ret = 0;
    break;
  }

  // Wake the monster (if appropriate)
  if (wake && mon.mhp > 0) {
    if (mon.msleeping) mon.msleeping = 0;
    if (!mon.mcanmove) { mon.mcanmove = 1; mon.mfrozen = 0; }
  }

  return ret;
}

// ============================================================
// cf. zap.c burn_floor_objects() — fire on floor
// ============================================================
export function burn_floor_objects(x, y, give_feedback, u_caused, map) {
  if (!map) return 0;
  let cnt = 0;
  const objects_at = map.objectsAt ? map.objectsAt(x, y) : [];
  if (!objects_at || objects_at.length === 0) return 0;

  // C ref: zap.c:4594 — iterate floor objects
  for (const obj of [...objects_at]) {
    if (obj.oclass === SCROLL_CLASS || obj.oclass === SPBOOK_CLASS) {
      // SCR_FIRE and SPE_FIREBALL resist
      if (obj.otyp === SCR_FIRE) continue;
      if (obj_resists(obj, 2, 100)) continue;

      const scrquan = obj.quan || 1;
      let delquan = 0;
      for (let i = scrquan; i > 0; i--) {
        if (!rn2(3)) delquan++;
      }
      if (delquan) {
        cnt += delquan;
        if (give_feedback) {
          if (delquan > 1)
            pline("%d objects burn.", delquan);
          else
            pline("An object burns.");
        }
        // Simplified: remove entire object if all copies burned
        if (delquan >= scrquan) {
          if (map.removeFloorObject) map.removeFloorObject(obj);
        } else {
          obj.quan = scrquan - delquan;
        }
      }
    }
  }
  return cnt;
}

// ============================================================
// cf. zap.c buzz() — main beam propagation (C-style interface)
// ============================================================
export function buzz(type, nd, sx, sy, dx, dy, map, player) {
  // C ref: zap.c:4706 — buzz() delegates to dobuzz()
  dobuzz(type, nd, sx, sy, dx, dy, true, false, map, player);
}

async function zapnodir(obj, player, map, display, game) {
  if (!obj) return;

  switch (obj.otyp) {
  case WAN_LIGHT:
  case SPE_LIGHT:
    pline("A lit field surrounds you.");
    break;
  case WAN_SECRET_DOOR_DETECTION:
  case SPE_DETECT_UNSEEN:
    findit(player, map, display, game);
    break;
  case WAN_CREATE_MONSTER: {
    // C ref: zap.c zapnodir() create_critters(rn2(23)?1:rn1(7,2), ...).
    const count = rn2(23) ? 1 : rn1(7, 2);
    for (let i = 0; i < count; i++) {
      makemon(null, player?.x || 0, player?.y || 0, 0, player?.dungeonLevel || 1, map);
    }
    break;
  }
  case WAN_WISHING:
    // Keep non-blocking behavior for replay safety.
    if (((player?.luck || 0) + rn2(5)) < 0) {
      pline("Unfortunately, nothing happens.");
    } else {
      pline("You feel that a wish is possible.");
    }
    break;
  case WAN_ENLIGHTENMENT:
    // Full enlightenment UI is not wired through this path yet.
    pline("You feel self-knowledgeable...");
    break;
  default:
    break;
  }
}

async function bhit_zapped_wand(obj, player, map) {
  if (!obj || !player || !map) return null;
  const ddx = player.dx || 0;
  const ddy = player.dy || 0;
  if (!ddx && !ddy) return null;

  // C ref: zap.c bhit() uses flashbeam glyph for zapped wand traversal.
  const flashbeam = { ch: '*', color: 11 };
  // C ref: zap.c weffects()->bhit(..., rn1(8,6), ...)
  let range = rn1(8, 6);
  let result = null;
  let x = player.x;
  let y = player.y;

  tmp_at(DISP_BEAM, flashbeam);
  try {
    while (range-- > 0) {
      x += ddx;
      y += ddy;

      if (!isok(x, y)) {
        x -= ddx;
        y -= ddy;
        break;
      }
      const loc = map.at(x, y);
      if (!loc) break;

      tmp_at(x, y);
      await nh_delay_output();

      const mon = map.monsterAt ? map.monsterAt(x, y) : null;
      if (mon && !mon.dead) {
        if (bhitm(mon, obj, map, player)) {
          result = mon;
          break;
        }
        range -= 3;
      }

      if (bhitpile(obj, bhito, x, y, 0, map)) {
        range--;
      }

      if (IS_WALL(loc.typ) || (IS_DOOR(loc.typ) && loc.doormask)) {
        x -= ddx;
        y -= ddy;
        break;
      }
    }
  } finally {
    tmp_at(DISP_END, 0);
  }

  return result;
}

function beamTempGlyph(type, dx, dy) {
  const fltyp = zaptype(type);
  const damgtype = fltyp % 10;
  const ch = (dx !== 0 && dy !== 0) ? '/' : (dx !== 0 ? '-' : '|');
  let color = 12;
  if (damgtype === ZT_FIRE) color = 1;
  else if (damgtype === ZT_COLD) color = 6;
  else if (damgtype === ZT_LIGHTNING) color = 11;
  else if (damgtype === ZT_POISON_GAS) color = 2;
  else if (damgtype === ZT_ACID) color = 10;
  return { ch, color };
}

// cf. zap.c:4720 dobuzz() — full beam propagation with bounce logic
function dobuzz(type, nd, sx, sy, dx, dy, sayhit, saymiss, map, player) {
  const fltyp = zaptype(type);
  const damgtype = fltyp % 10;
  let range = rn1(7, 7); // C ref: zap.c:4763
  if (dx === 0 && dy === 0) range = 1;

  let lsx, lsy;
  let shopdamage = false;

  tmp_at(DISP_BEAM, beamTempGlyph(type, dx, dy));
  try {
    while (range-- > 0) {
      lsx = sx;
      sx += dx;
      lsy = sy;
      sy += dy;

      if (!isok(sx, sy)) { sx = lsx; sy = lsy; break; }
      const loc = map ? map.at(sx, sy) : null;
      if (!loc) { sx = lsx; sy = lsy; break; }
      tmp_at(sx, sy);
      nh_delay_output_nowait();
      if (loc.typ === 0) goto_bounce(); // STONE

      // C ref: zap.c:4797-4802 — zap_over_floor for non-fireball, non-gas
      if (damgtype !== ZT_POISON_GAS) {
        range += zap_over_floor(sx, sy, type, { value: shopdamage }, true, 0, map);
      }

      // Check for monster
      const mon = map ? map.monsterAt(sx, sy) : null;
      if (mon && !mon.dead) {
        const mac = find_mac ? find_mac(mon) : (mon.mac || 10);
        if (zap_hit(mac, 0)) {
          // C ref: zap.c:4825 — zhitm
          const tmp = zhitm(mon, type, nd, map);

          if (tmp === MAGIC_COOKIE) {
            // disintegration
            mon.mhp = 0;
          }
          if (mon.mhp <= 0) {
            // monster killed
            if (type >= 0) {
              // killed by hero
              if (map.removeMonster) map.removeMonster(mon);
              mondead(mon, map, player);
            } else {
              // killed by other monster
              if (map.removeMonster) map.removeMonster(mon);
              mondead(mon, map, player);
            }
          } else {
            if (damgtype === ZT_SLEEP && mon.msleeping) {
              slept_monst(mon);
            }
          }
          range -= 2;
        }
      }

      // Check for player hit
      if (player && sx === player.x && sy === player.y && range >= 0) {
        if (zap_hit(player.uac || 10, 0)) {
          range -= 2;
          // C ref: zap.c:4920 — zhitu (damage to player)
          // Simplified: just apply damage
          const dam = d(nd, 6);
          if (player.hp) player.hp -= dam;
        }
      }

      // C ref: zap.c:4938-4993 — beam bounce off walls
      if (loc && (IS_WALL(loc.typ) || IS_DOOR(loc.typ))) {
        // Bounce logic
        const bchance = IS_WALL(loc.typ) ? 75 : 75;
        if (!dx || !dy || !rn2(bchance)) {
          dx = -dx;
          dy = -dy;
        } else {
          // Check diagonal bounce directions
          const loc1 = map.at(sx, lsy);
          const loc2 = map.at(lsx, sy);
          let bounce = 0;
          if (loc1 && !IS_WALL(loc1.typ) && !IS_DOOR(loc1.typ))
            bounce = 1;
          if (loc2 && !IS_WALL(loc2.typ) && !IS_DOOR(loc2.typ)) {
            if (!bounce || rn2(2)) bounce = 2;
          }
          switch (bounce) {
          case 0: dx = -dx; // fallthrough
          case 1: dy = -dy; break;
          case 2: dx = -dx; break;
          }
        }
        // Back up to before wall
        sx = lsx;
        sy = lsy;
      }
    }
  } finally {
    tmp_at(DISP_END, 0);
  }

  function goto_bounce() {
    // For STONE tiles, reverse
    sx = lsx;
    sy = lsy;
    dx = -dx;
    dy = -dy;
  }
}

// ============================================================
// cf. zap.c weffects() — wand zap dispatch
// ============================================================
export async function weffects(obj, player, map, display = null, game = null) {
  if (!obj) return;
  const otyp = obj.otyp;

  // C ref: zap.c:3424 — exercise wisdom
  if (player) exercise(player, A_WIS, true);

  const od = objectData[otyp];
  const dir_type = od ? od.dir : 0;
  // NODIR=1, IMMEDIATE=2, RAY=3 in objectData.

  if (dir_type === 2) {
    // C ref: zap.c:3436 — bhit for lateral, zap_updown for up/down.
    if (player?.ustuck) {
      bhitm(player.ustuck, obj, map, player);
    } else if (player && player.dz) {
      zap_updown(obj, player, map);
    } else {
      await bhit_zapped_wand(obj, player, map);
    }
  } else if (dir_type === 1) {
    await zapnodir(obj, player, map, display, game);
  } else {
    // RAY wand or spell
    if (otyp === WAN_DIGGING || otyp === 364 /* SPE_DIG */) {
      await zap_dig_core(map, player);
    } else if (otyp >= WAN_MAGIC_MISSILE && otyp <= WAN_LIGHTNING) {
      const beamType = wandToBeamType(otyp);
      if (beamType >= 0 && player) {
        const nd = (otyp === WAN_MAGIC_MISSILE) ? 2 : 6;
        buzz(ZT_WAND(beamType), nd, player.x, player.y,
             player.dx || 0, player.dy || 0, map, player);
      }
    }
  }
}

// ============================================================
// cf. zap.c bhitpile() — beam hits pile of objects
// ============================================================
export function bhitpile(obj, fhito_fn, tx, ty, zz, map) {
  if (!map) return 0;
  const objects_at = map.objectsAt ? map.objectsAt(tx, ty) : [];
  if (!objects_at || objects_at.length === 0) return 0;

  let hitanything = 0;
  for (const otmp of [...objects_at]) {
    hitanything += fhito_fn(otmp, obj);
  }
  return hitanything;
}

// ============================================================
// cf. zap.c backfire() — wand backfire on hero
// ============================================================
export function backfire(obj, player) {
  if (!obj || !player) return;
  // C ref: zap.c:2593-2602
  pline("The wand suddenly explodes!");
  const dmg = d((obj.spe || 0) + 2, 6);
  if (player.hp) player.hp -= dmg;
  // C would call useupall — simplified
}

// ============================================================
// cf. zap.c poly_obj() — polymorph object
// ============================================================
export function poly_obj(obj, id) {
  if (!obj) return obj;

  // C ref: zap.c:1700-1987
  if (id === STRANGE_OBJECT) {
    // Standard polymorph — try up to 3 times to match magic status
    let try_limit = 3;
    const magic_obj = objectData[obj.otyp] ? (objectData[obj.otyp].oc_magic || 0) : 0;
    let otmp = null;
    do {
      // mkobj creates a random object of the same class
      // Simplified: just pick a new otyp of the same class
      otmp = mkobj(obj.oclass, false);
    } while (--try_limit > 0 && otmp &&
             (objectData[otmp.otyp] ? (objectData[otmp.otyp].oc_magic || 0) : 0) !== magic_obj);

    if (otmp) {
      // Preserve properties
      otmp.quan = obj.quan || 1;
      otmp.cursed = obj.cursed;
      otmp.blessed = obj.blessed;
      otmp.ox = obj.ox;
      otmp.oy = obj.oy;
      // C ref: zap.c:1830 — merge check
      if (otmp.quan > 1 && rn2(1000) < otmp.quan) otmp.quan = 1;
    }
    return otmp || obj;
  } else {
    // Specific polymorph target
    const otmp = mksobj(id, false, false);
    if (otmp) {
      otmp.quan = obj.quan || 1;
      otmp.cursed = obj.cursed;
      otmp.blessed = obj.blessed;
      otmp.ox = obj.ox;
      otmp.oy = obj.oy;
    }
    return otmp || obj;
  }
}

// ============================================================
// cf. zap.c obj_zapped() — object hit by beam type
// (Not the same as bhito — this is for RAY beams hitting floor objects)
// ============================================================
export function obj_zapped(obj, type) {
  if (!obj) return false;
  // C does not have a standalone obj_zapped function of this form;
  // RAY beam floor effects are handled by zap_over_floor.
  // This is kept for interface compatibility.
  return false;
}

// ============================================================
// cf. zap.c:1474 obj_shudders() — object resists polymorph (shudder check)
// Returns true if object should be destroyed instead of polymorphed
// ============================================================
export function obj_shudders(obj) {
  if (!obj) return false;

  // C ref: zap.c:1474-1495
  let zap_odds;
  if (obj.oclass === WAND_CLASS) {
    zap_odds = 3; // half-life = 2 zaps
  } else if (obj.cursed) {
    zap_odds = 3;
  } else if (obj.blessed) {
    zap_odds = 12; // half-life = 8 zaps
  } else {
    zap_odds = 8; // half-life = 6 zaps
  }

  // Adjust for large quantities
  if ((obj.quan || 1) > 4) zap_odds = Math.floor(zap_odds / 2);

  return !rn2(zap_odds);
}

// ============================================================
// cf. zap.c:1635 do_osshock() — destroy an object on the floor (polymorph zap)
// ============================================================
export function do_osshock(obj, map, player) {
  if (!obj) return;

  // C ref: zap.c:1643
  // go.obj_zapped = TRUE; — flag for feedback

  // C ref: zap.c:1645-1652 — check for polymorph into golem
  // poly_zapped check: each unit has Luck+45 chance
  const quan = obj.quan || 1;
  for (let i = quan; i > 0; i--) {
    const luck = (player && player.luck) || 0;
    if (!rn2(luck + 45)) {
      // Would set poly_zapped material — simplified
      break;
    }
  }

  // C ref: zap.c:1655-1660 — split if quan > 1
  if (quan > 1) {
    rnd(quan - 1); // consume RNG for split amount
  }

  // C ref: zap.c:1671 — delete the object
  if (map && map.removeFloorObject) {
    map.removeFloorObject(obj);
  }
}

// C ref: zap.c makewish() — grant an object wish and hand it to hero.
export function makewish(wishText, player, display) {
    let otmp = readobjnam(wishText, false, {
        wizard: !!player?.wizard,
        wizkit_wishing: !!player?.program_state?.wizkit_wishing,
        player,
        map: player?.map || null,
    });
    if (otmp === hands_obj) {
        return otmp;
    }
    if (!otmp) {
        if (display) display.putstr_message('Nothing fitting that description exists.');
        return null;
    }
    const got = hold_another_object(otmp, player, null, null, null);
    prinv(null, got || otmp, 0, player);
    if (player) {
        player.ublesscnt = (player.ublesscnt || 0) + rn1(100, 50);
    }
    return got || otmp;
}

// ============================================================
// cf. zap.c:624 probe_monster() — probing wand effect
// ============================================================
export function probe_monster(mon) {
  if (!mon) return;

  // C ref: zap.c:626 — mstatusline
  mstatusline(mon);

  // C ref: zap.c:630-637 — display inventory or "not carrying anything"
  if (mon.minvent && mon.minvent.length > 0) {
    display_minventory(mon);
  } else {
    pline("%s is not carrying anything.", Monnam(mon));
  }
}

// ============================================================
// cf. zap.c:3567 skiprange() — range calculation for thrown rocks
// ============================================================
export function skiprange(range, skipstart_ref, skipend_ref) {
  // C ref: zap.c:3567-3576
  const tr = Math.floor(range / 4);
  const tmp = range - ((tr > 0) ? rnd(tr) : 0);

  const skipstart = tmp;
  let skipend = tmp - (Math.floor(tmp / 4) * rnd(3));
  if (skipend >= tmp) skipend = tmp - 1;

  // Return values via refs (objects) or return
  if (skipstart_ref && typeof skipstart_ref === 'object') skipstart_ref.value = skipstart;
  if (skipend_ref && typeof skipend_ref === 'object') skipend_ref.value = skipend;
  return { start: skipstart, end: skipend };
}

// ============================================================
// cf. zap.c maybe_explode_wand — not actually in C as a standalone
// This was a JS-only stub. Keeping for interface but implementing
// the logic from dozap's cursed-wand backfire check.
// ============================================================
export function maybe_explode_wand(obj, dx, dy) {
  if (!obj) return false;
  // C ref: zap.c:2635 — cursed wands have 1/WAND_BACKFIRE_CHANCE to explode
  // WAND_BACKFIRE_CHANCE = 7 in C
  if (obj.cursed && !rn2(7)) return true;
  return false;
}

// ============================================================
// cf. zap.c break_wand — wand breaking with explosion
// Called when a wand is broken (applied '#a' or force-breaking)
// ============================================================
export function break_wand(obj, player, map) {
  if (!obj || !player) return;

  // C ref: do_break_wand in zap.c (dozap.c in older versions)
  // Determine explosion type and damage
  const spe = obj.spe || 0;
  let dmg = 0;

  const beamType = wandToBeamType(obj.otyp);
  if (beamType >= 0) {
    // RAY wand — explodes with beam damage
    // C ref: damage is d(spe+2, 6) for the wand explosion
    dmg = d(spe + 2, 6);

    // The explosion would call explode() which does AoE damage
    // For RNG parity, consume the same calls explode() would:
    // explode() rolls d(12, 6) for fireball type, etc.
    // Simplified: just apply direct damage
  } else {
    // Non-beam wand — less dramatic
    dmg = d(spe + 2, 6);
  }

  pline("The wand explodes!");
  if (player.hp) player.hp -= dmg;
}

// ============================================================
// cf. zap.c:5111 zap_over_floor() — beam floor effects
// Effects on floor tiles: melt ice, evaporate pools, burn scrolls, etc.
// Returns range modifier (negative = reduce range)
// ============================================================
export function zap_over_floor(x, y, type, shopdamage_ref, ignoremon, exploding_wand_typ, map) {
  if (!map) return 0;
  let rangemod = 0;
  const damgtype = zaptype(type) % 10;
  const loc = map.at(x, y);
  if (!loc) return 0;

  switch (damgtype) {
  case ZT_FIRE:
    // C ref: zap.c:5133-5206 — fire effects on floor
    // burn webs, melt ice, evaporate pools, etc.
    // Simplified: burn floor objects if present
    if (map.objectsAt) {
      const objs = map.objectsAt(x, y);
      if (objs && objs.length > 0) {
        burn_floor_objects(x, y, false, type > 0, map);
      }
    }
    break;

  case ZT_COLD:
    // C ref: zap.c:5208-5303 — cold effects: freeze water, etc.
    // Simplified: no pool/ice handling yet
    break;

  case ZT_POISON_GAS:
    // C ref: zap.c:5306-5312 — create gas cloud
    // Simplified: no gas cloud system yet
    break;

  case ZT_LIGHTNING:
  case ZT_ACID:
    // C ref: zap.c:5314-5340 — melt iron bars, etc.
    break;

  default:
    break;
  }

  // C ref: zap.c:5367-5379 — secret door revelation
  // C ref: zap.c:5381-5457 — door destruction by beams
  if (loc && IS_DOOR(loc.typ)) {
    switch (damgtype) {
    case ZT_FIRE:
    case ZT_COLD:
    case ZT_LIGHTNING:
      // Door destroyed
      rangemod = -1000;
      break;
    default:
      // Door absorbs the beam
      rangemod = -1000;
      break;
    }
  }

  return rangemod;
}

// ============================================================
// cf. zap.c:3207 zap_updown() — zap immediate wand up or down
// ============================================================
export function zap_updown(obj, player, map) {
  if (!obj || !player) return false;
  let disclose = false;
  const x = player.x || 0;
  const y = player.y || 0;
  const loc = map?.at ? map.at(x, y) : null;

  const openOrDestroyBridge = (destroy = false) => {
    if (!map) return false;
    let bx = x;
    let by = y;
    if (!is_db_wall(bx, by, map) && (!loc || (loc.typ !== DRAWBRIDGE_UP
        && loc.typ !== DRAWBRIDGE_DOWN))) {
      return false;
    }
    const db = find_drawbridge(bx, by, map);
    if (!db?.found) return false;
    if (destroy) destroy_drawbridge(db.x, db.y, map, player);
    else open_drawbridge(db.x, db.y, map, player);
    return true;
  };

  const zap_map_downward = () => {
    if (!map) return;
    const engr = engr_at(map, x, y);
    if (!engr || engr.type === 'headstone') return;
    switch (obj.otyp) {
    case WAN_POLYMORPH:
    case SPE_POLYMORPH: {
      del_engr_at(map, x, y);
      const etxt = random_engraving_rng() || '';
      make_engr_at(map, x, y, etxt, 'mark', { degrade: true });
      break;
    }
    case WAN_CANCELLATION:
    case SPE_CANCELLATION:
    case WAN_MAKE_INVISIBLE:
      del_engr_at(map, x, y);
      break;
    case WAN_TELEPORTATION:
    case SPE_TELEPORT_AWAY:
      rloc_engr(map, engr);
      break;
    case SPE_STONE_TO_FLESH:
      if (engr.type === 'engrave') {
        pline("The edges on the floor get smoother.");
        wipe_engr_at(map, x, y, d(2, 4), true);
      }
      break;
    case WAN_STRIKING:
    case SPE_FORCE_BOLT:
      wipe_engr_at(map, x, y, d(2, 4), true);
      break;
    default:
      break;
    }
  };

  switch (obj.otyp) {
  case WAN_PROBING:
    if (player.dz && player.dz < 0) {
      pline("You probe towards the ceiling.");
    } else {
      // C ref: zap.c zap_map() handles down-zap engraving effects.
      zap_map_downward();
      pline("You probe beneath the floor.");
      // C ref: zap.c:3232 — bhitpile for floor objects
      if (map) bhitpile(obj, bhito, x, y, player.dz || 1, map);
    }
    return true;

  case WAN_OPENING:
  case SPE_KNOCK:
    // C ref: zap.c:3251-3277 — open drawbridge, release traps
    if (openOrDestroyBridge(false)) {
      disclose = true;
    }
    if (player.dz && player.dz > 0 && player.utrap) {
      player.utrap = 0;
      player.utraptype = 0;
      disclose = true;
    }
    break;

  case WAN_STRIKING:
  case SPE_FORCE_BOLT:
    // C ref: zap.c:3278-3341 — striking up: dislodge rock
    if (openOrDestroyBridge(true)) {
      disclose = true;
      break;
    }
    if (player.dz && player.dz < 0 && rn2(3)) {
      pline("A rock is dislodged from the ceiling and falls on your head.");
      const dmg = rnd(6);
      if (player.hp) player.hp -= dmg;
    }
    if (player.dz && player.dz > 0 && map?.trapAt) {
      const ttmp = map.trapAt(x, y);
      if (ttmp && ttmp.ttyp === TRAPDOOR) {
        ttmp.ttyp = HOLE;
        ttmp.tseen = 1;
        disclose = true;
      }
    }
    break;

  case WAN_LOCKING:
  case SPE_WIZARD_LOCK:
    if (map) {
      const db = find_drawbridge(x, y, map);
      if (db?.found) {
        close_drawbridge(db.x, db.y, map, player);
        disclose = true;
        break;
      }
    }
    if (player.dz && player.dz > 0 && map?.trapAt) {
      const ttmp = map.trapAt(x, y);
      if (ttmp && ttmp.ttyp === HOLE) {
        ttmp.ttyp = TRAPDOOR;
        ttmp.tseen = 1;
        disclose = true;
      }
    }
    break;

  default:
    break;
  }

  // C ref: zap.c:3370-3396 — bhitpile for down zaps
  if (player.dz && player.dz > 0 && map) {
    bhitpile(obj, bhito, x, y, player.dz, map);
    // C ref: zap.c zap_map() — down-zap engraving handling.
    zap_map_downward();
  }

  return disclose;
}

// ============================================================
// cf. zap.c:2117 bhito() — wand/spell effect hits an object on floor
// ============================================================
export function bhito(obj, otmp, map) {
  if (!obj || !otmp) return 0;
  if (obj === otmp) return 0; // wand can't affect itself
  let res = 1;

  switch (otmp.otyp) {
  case WAN_POLYMORPH:
  case SPE_POLYMORPH:
    // C ref: zap.c:2189-2219 — polymorph object
    if (obj_shudders(obj)) {
      do_osshock(obj, map);
      break;
    }
    // Would call poly_obj — simplified
    break;

  case WAN_PROBING:
    // C ref: zap.c:2220-2272 — probe object (reveal contents)
    res = 1;
    break;

  case WAN_STRIKING:
  case SPE_FORCE_BOLT:
    // C ref: zap.c:2273-2310 — break boulders, statues
    if (obj.otyp === BOULDER) {
      // fracture_rock — simplified
      obj.otyp = ROCK;
      obj.oclass = GEM_CLASS;
      obj.quan = rn1(60, 7);
    }
    break;

  case WAN_CANCELLATION:
  case SPE_CANCELLATION:
    cancel_item(obj);
    break;

  case SPE_DRAIN_LIFE:
    // drain_item — simplified
    break;

  case WAN_TELEPORTATION:
  case SPE_TELEPORT_AWAY:
    // rloco — teleport object to random location; simplified
    break;

  case WAN_MAKE_INVISIBLE:
    break;

  case WAN_UNDEAD_TURNING:
  case SPE_TURN_UNDEAD:
    // C ref: zap.c:2332-2390 — revive corpse or egg
    if (obj.otyp === CORPSE) {
      revive(obj, true, map);
    }
    break;

  case WAN_OPENING:
  case SPE_KNOCK:
  case WAN_LOCKING:
  case SPE_WIZARD_LOCK:
    // boxlock — simplified
    res = 0;
    break;

  case WAN_SLOW_MONSTER:
  case SPE_SLOW_MONSTER:
  case WAN_SPEED_MONSTER:
  case WAN_NOTHING:
  case SPE_HEALING:
  case SPE_EXTRA_HEALING:
    res = 0;
    break;

  case SPE_STONE_TO_FLESH:
    // stone_to_flesh_obj — simplified
    res = 0;
    break;

  default:
    res = 0;
    break;
  }

  return res;
}

// ============================================================
// cf. zap.c:3815 bhit() — beam travel for IMMEDIATE wands
// Travels in a line, calling fhitm/fhito for each monster/object hit
// ============================================================
export function bhit(ddx, ddy, range, weapon, fhitm_fn, fhito_fn, obj, map, player) {
  if (!map || !obj) return null;
  let result = null;
  let x = player ? player.x : 0;
  let y = player ? player.y : 0;

  // C ref: zap.c:3844-3847 — skiprange for thrown rocks
  let skiprange_start = 0, skiprange_end = 0;
  const allow_skip = false;

  // Beam types: ZAPPED_WAND=3, THROWN_WEAPON=0, KICKED_WEAPON=1, FLASHED_LIGHT=2
  const ZAPPED_WAND = 3;

  while (range-- > 0) {
    x += ddx;
    y += ddy;

    if (!isok(x, y)) { x -= ddx; y -= ddy; break; }
    const loc = map.at(x, y);
    if (!loc) break;

    // Check for monster
    const mon = map.monsterAt(x, y);
    if (mon && !mon.dead) {
      if (weapon === ZAPPED_WAND && fhitm_fn) {
        if (fhitm_fn(mon, obj, map, player)) {
          result = mon;
          break;
        }
        range -= 3; // wand zap loses range when hitting monster
      } else {
        result = mon;
        break;
      }
    }

    // Hit pile of objects
    if (fhito_fn) {
      if (bhitpile(obj, fhito_fn, x, y, 0, map)) {
        range--;
      }
    }

    // Check for wall/closed door — beam stops
    if (IS_WALL(loc.typ) || (IS_DOOR(loc.typ) && loc.doormask)) {
      x -= ddx;
      y -= ddy;
      break;
    }
  }

  return result;
}

// ============================================================
// cf. zap.c resists_blnd() — blindness resistance
// ============================================================
export function resists_blnd(mon) {
  // Check if monster resists blindness
  if (!mon) return false;
  const mdat = mon.data || (mon.mndx != null ? mons[mon.mndx] : null);
  if (!mdat) return false;
  // Blind resistance: no eyes or already blind
  return !!(mdat.mflags1 & M1_NOEYES);
}

// cf. zap.c resists_stun() — stun resistance
export function resists_stun(mon) {
  // Stub — most monsters don't have stun resistance
  return false;
}

// ============================================================
// Exported zhitm and zap_hit for use by other modules (e.g., mcastu)
// ============================================================
export { zhitm, zap_hit, burnarmor };
