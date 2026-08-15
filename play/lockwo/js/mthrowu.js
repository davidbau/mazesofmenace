// mthrowu.js — the parts of C src/mthrowu.c that had no home in js/monmove.js.
//
// monmove.js owns m_throw/thrwmu/ohitmon and their flight loop; this file holds
// the pieces those call out to which were previously missing or stubbed:
// hits_bars()/hit_bars() (the iron-bars clause of MT_FLIGHTCHECK, explicitly
// omitted there), rnd_hallublast()/breathwep_name() (a CORE rn2 draw whenever a
// hallucinating hero is breathed at), and m_useupall().
import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { objects, WEAPON_CLASS, ARMOR_CLASS, TOOL_CLASS, ROCK_CLASS,
         FOOD_CLASS, SPBOOK_CLASS, WAND_CLASS, BALL_CLASS, CHAIN_CLASS,
         CORPSE, BOULDER, STATUE, HEAVY_IRON_BALL } from './mkobj.js';
import { OBJ_ARMCAT } from './objarmor_data.js';
import { monster_by_pmidx } from './makemon.js';

// C ref: mthrowu.c:24 breathwep[] — indexed by BZ_OFS_AD(typ), i.e. adtyp - 1.
const BREATHWEP = [
    'fragments', 'fire', 'frost', 'sleep gas', 'a disintegration blast',
    'lightning', 'poison gas', 'acid', 'strange breath #8',
    'strange breath #9',
];
// C ref: mthrowu.c:31 hallublasts[] — 97 entries.  rnd_hallublast() is
// ROLL_FROM(), i.e. a CORE rn2(SIZE) draw, NOT a display-rng one; the size of
// this table is therefore the modulus and must stay complete.
const HALLUBLASTS = [
    'asteroids', 'beads', 'bubbles', 'butterflies', 'champagne', 'chaos',
    'coins', 'cotton candy', 'crumbs', 'dark matter', 'darkness', 'data',
    'dust specks', 'emoticons', 'emotions', 'entropy', 'flowers', 'foam',
    'fog', 'gamma rays', 'gelatin', 'gemstones', 'ghosts', 'glass shards',
    'glitter', 'good vibes', 'gravel', 'gravity', 'gravy', 'grawlixes',
    'holy light', 'hornets', 'hot air', 'hyphens', 'hypnosis', 'infrared',
    'insects', 'jargon', 'laser beams', 'leaves', 'lightening', 'logic gates',
    'magma', 'marbles', 'mathematics', 'megabytes', 'metal shavings',
    'metapatterns', 'meteors', 'mist', 'mud', 'music', 'nanites', 'needles',
    'noise', 'nostalgia', 'oil', 'paint', 'photons', 'pixels', 'plasma',
    'polarity', 'powder', 'powerups', 'prismatic light', 'pure logic',
    'purple', 'radio waves', 'rainbows', 'rock music', 'rocket fuel', 'rope',
    'sadness', 'salt', 'sand', 'scrolls', 'sludge', 'smileys', 'snowflakes',
    'sparkles', 'specularity', 'spores', 'stars', 'steam', 'tetrahedrons',
    'text', 'the past', 'tornadoes', 'toxic waste', 'ultraviolet light',
    'viruses', 'water', 'waveforms', 'wind', 'X-rays', 'zorkmids',
];

// C ref: mthrowu.c:52 rnd_hallublast() — ROLL_FROM(hallublasts).
export function rnd_hallublast() {
    return HALLUBLASTS[rn2(HALLUBLASTS.length)];
}

// C ref: mthrowu.c:1083 breathwep_name(typ) — a hallucinating hero hears a
// nonsense blast name, and that substitution DRAWS rn2(97) on the core stream.
export function breathwep_name(typ) {
    if (game.u?.uhallu) return rnd_hallublast();
    return BREATHWEP[(typ | 0) - 1] ?? 'strange breath';
}

// C ref: mthrowu.c:1154 m_useupall(mon, obj) — pull the whole stack out of the
// monster's inventory and free it.
export function m_useupall(mon, obj) {
    if (!mon || !obj) return;
    const inv = mon.minvent;
    if (Array.isArray(inv)) {
        const i = inv.indexOf(obj);
        if (i >= 0) inv.splice(i, 1);
    }
    obj.where = 'free';
    obj.ocarry = null;
}

// C ref: objclass.h:37 enum obj_armor_types.
const ARM_GLOVES = 3;
// C ref: include/skills.h — the negated launcher skills used by is_ammo().
const P_BOW = 20, P_CROSSBOW = 22, P_DART = 23, P_SHURIKEN = 24,
      P_SPEAR = 17, P_KNIFE = 2;
// mkobj.js otyps (verified against OBJECT_DATA).
const SKELETON_KEY = 221, LOCK_PICK = 222, CREDIT_CARD = 223,
      TALLOW_CANDLE = 224, WAX_CANDLE = 225, LENSES = 232,
      TIN_WHISTLE = 245, MAGIC_WHISTLE = 246,
      MEAT_STICK = 268, ENORMOUS_MEATBALL = 269;
const MZ_TINY = 0;

// C ref: mthrowu.c:1499 hits_bars(&obj, x, y, barsx, barsy, always_hit,
// whodidit) — does a thrown/kicked/rolled object stop at iron bars?  A dart, an
// arrow, a spear, a knife or a pair of gloves slips between them; almost
// everything else does not.  `whodidit === -1` asks the question WITHOUT
// running the breakage side effect, which is the only form monmove.js's
// MT_FLIGHTCHECK needs (C passes 0 there, but the breakage half needs
// dothrow.c's breaks()/hero_breaks(), which live in another module).
export function hits_bars(otmp, always_hit) {
    if (!otmp) return false;
    const obj_type = otmp.otyp;
    let hits = !!always_hit;

    if (!hits) {
        switch (otmp.oclass) {
        case WEAPON_CLASS: {
            const oskill = objects[obj_type]?.oc_skill ?? 0;
            hits = (oskill !== -P_BOW && oskill !== -P_CROSSBOW
                    && oskill !== -P_DART && oskill !== -P_SHURIKEN
                    && oskill !== P_SPEAR
                    && oskill !== P_KNIFE); /* but not dagger */
            break;
        }
        case ARMOR_CLASS:
            hits = (OBJ_ARMCAT[obj_type] !== ARM_GLOVES);
            break;
        case TOOL_CLASS:
            hits = (obj_type !== SKELETON_KEY && obj_type !== LOCK_PICK
                    && obj_type !== CREDIT_CARD && obj_type !== TALLOW_CANDLE
                    && obj_type !== WAX_CANDLE && obj_type !== LENSES
                    && obj_type !== TIN_WHISTLE && obj_type !== MAGIC_WHISTLE);
            break;
        case ROCK_CLASS: /* includes boulder */
            if (obj_type !== STATUE || mon_msize_of(otmp.corpsenm) > MZ_TINY)
                hits = true;
            break;
        case FOOD_CLASS:
            if (obj_type === CORPSE && mon_msize_of(otmp.corpsenm) > MZ_TINY)
                hits = true;
            else
                hits = (obj_type === MEAT_STICK
                        || obj_type === ENORMOUS_MEATBALL);
            break;
        case SPBOOK_CLASS:
        case WAND_CLASS:
        case BALL_CLASS:
        case CHAIN_CLASS:
            hits = true;
            break;
        default:
            break;
        }
    }
    return hits;
}
function mon_msize_of(corpsenm) {
    return monster_by_pmidx(corpsenm | 0)?.msize ?? 2 /* MZ_MEDIUM */;
}

// C ref: mthrowu.c:1417 hit_bars(objp, objx, objy, barsx, barsy, breakflags) —
// the noise + hero-breaks-the-bars half.  Only the WAR_HAMMER / HEAVY_IRON_BALL
// arm draws RNG, and only when the HERO is at fault:
//   chance = (melee ? 40 : 60) - acurrstr() - spe;  !rn2(max(2, chance))
// The breakage test that precedes it (breaks()/hero_breaks()) lives in
// js/dothrow.js, so this entry point takes the already-computed `broke` flag.
const WT_IRON_BALL_INCR = 160, WAR_HAMMER = 76;
export function hit_bars_break_check(otmp, your_fault, melee_attk) {
    if (!otmp || !your_fault) return false;
    if (otmp.otyp !== WAR_HAMMER && otmp.otyp !== HEAVY_IRON_BALL) return false;
    const spe = (otmp.otyp === HEAVY_IRON_BALL)
        ? Math.trunc((otmp.owt | 0) / WT_IRON_BALL_INCR)
        : (otmp.spe | 0);
    const chance = (melee_attk ? 40 : 60) - acurrstr() - spe;
    return !rn2(Math.max(2, chance));
}
// C ref: attrib.c:1245 acurrstr() — ACURR(A_STR) folded back into 3..25.
function acurrstr() {
    const str = game.u?.acurr?.a?.[0] ?? 0;
    if (str <= 18) return Math.max(str, 3);
    if (str <= 121) return 19 + Math.trunc(str / 50);
    return Math.min(str, 125) - 100;
}

// C ref: mthrowu.c:506 ucatchgem(gem, mon) — a hero polymorphed into a unicorn
// catches a gem a monster threw at them.  DRAWS NO RNG itself, but returning
// TRUE swallows the missile so the thitu()/dmgval() rolls behind it never
// happen; getting it wrong therefore shifts the whole stream.
// LAST_GLASS_GEM / FIRST_GLASS_GEM bracket the worthless glass in objects.h;
// mkobj.js otyps.
const FIRST_GLASS_GEM = 461 /*WORTHLESS_WHITE_GLASS*/,
      LAST_GLASS_GEM = 469 /*WORTHLESS_VIOLET_GLASS*/;
export function ucatchgem(gem, _mon) {
    // C: `gem->otyp <= LAST_GLASS_GEM && is_unicorn(youmonst.data)`.
    if (!gem || gem.otyp > LAST_GLASS_GEM) return false;
    if (!is_unicorn_you()) return false;
    // The two arms differ only in messaging and whether the gem is dropped
    // immediately (worthless glass is caught then dropped, a real gem is
    // accepted); both consume the missile.
    void FIRST_GLASS_GEM;
    return true;
}
// C ref: mondata.h is_unicorn(ptr) — mlet S_UNICORN and mons[].maligntyp != 0.
const S_UNICORN = 21;
function is_unicorn_you() {
    const u = game.u;
    if (!u?.Upolyd) return false;
    const ptr = monster_by_pmidx(u.umonnum ?? -1);
    return ptr?.mcls === S_UNICORN && (ptr.maligntyp | 0) !== 0;
}

// C ref: mthrowu.c:850 return_from_mtoss(magr, otmp, tethered_weapon) — an
// aklys (or other throw-and-return weapon) flies back to the monster that threw
// it.  RNG, in C's order:
//   rn2(100)                       made_it_back  (0 == "loud snap", lost)
//   rn2(100)                       caught cleanly (only if !impaired)
//   rn2(2) [+ rnd(3) when nonzero] the fumble damage when it isn't caught
// Returns { made_it_back, caught, dmg, hits_thrower } so the caller keeps its
// own messaging/placement (place_object/stackobj live in mkobj.js).
export function return_from_mtoss(magr, otmp, _tethered_weapon) {
    const impaired = !!(magr?.mconf || magr?.mstun || magr?.mblinded);
    let notcaught = false, hits_thrower = false, dmg = 0;
    const made_it_back = rn2(100);

    if (otmp && made_it_back) {
        if (!impaired && rn2(100)) {
            /* caught: goes back into the monster's inventory */
        } else {
            dmg = rn2(2);
            if (dmg) { dmg += rnd(3); hits_thrower = true; }
            notcaught = true;
        }
    } else {
        notcaught = true;   /* "You hear a loud snap!" */
    }
    return { made_it_back: !!made_it_back, caught: !notcaught, dmg, hits_thrower };
}
