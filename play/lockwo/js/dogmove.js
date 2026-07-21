// dogmove.js — Pet (tame monster) movement for the per-turn loop.
// C ref: dogmove.c — dog_move(), dog_goal(), dog_invent(); dog.c dogfood().
//
// GENERAL (data-driven) port of the common pet-follows-hero behaviour over the
// real monster/object records on game.level.  Faithful to the C control flow
// so the per-move RNG (obj_resists rn2(100), dog_goal rn2(8)/rn2(4),
// dog_move move-choice rn2(++chcnt)/rn2(3)/rn2(12), backtrack rn2(MTSZ*(k-j)))
// is emitted call-for-call.  Exotic cases (pet carrying/eating/attacking,
// leashed pets, ranged attacks, conflict) are intentionally minimal — none of
// the gameplay sessions exercise them at the point they currently diverge.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { MTSZ, COLNO, ROWNO, IS_ROOM, MAGIC_PORTAL, isok,
    IS_OBSTRUCTED, IS_DOOR, D_CLOSED, D_LOCKED,
    POOL, MOAT, WATER, LAVAPOOL, LAVAWALL } from './const.js';
import { obj_resists } from './zap.js';
import { newsym, vobj_at, object_glyph } from './display.js';
import { couldsee as visCouldsee, clear_path, cansee, view_from } from './vision.js';
import { Monnam, x_monnam } from './uhitm.js';
import { floor_object_name, doname_invent, sobj_at } from './invent.js';
import { dist2, mfndpos, mon_mintrap, Trap_Killed_Mon } from './monmove.js';
import { ALLOW_TRAPS as ALLOW_TRAPS_F } from './const.js';
import { t_at } from './trap.js';
import { mattackm } from './mhitm.js';
import { M_ATTK_HIT, M_ATTK_DEF_DIED, M_ATTK_AGR_DIED } from './const.js';
import {
    FOOD_CLASS, BALL_CLASS, CHAIN_CLASS, ROCK_CLASS, CORPSE, TIN, next_ident,
    GOLD_PIECE, COIN_CLASS, BOULDER,
} from './mkobj.js';
import { may_dig } from './dig.js';
import { gettrack } from './track.js';
import { monster_by_pmidx, mon_msize, mon_cwt } from './makemon.js';

// dogfood quality enum (mextra.h): lower == more desirable.
const DOGFOOD = 0, CADAVER = 1, ACCFOOD = 2, MANFOOD = 3,
      APPORT = 4, POISON = 5, UNDEF = 6, TABU = 7;

const MMOVE_NOTHING = 0, MMOVE_MOVED = 2, MMOVE_DIED = 3, MMOVE_DONE = 5;

const PM_LITTLE_DOG = 16, PM_KITTEN = 34, PM_PONY = 100;

// Food object types referenced by dogfood() (mkobj.js OBJECT_DATA otyp order).
const TRIPE_RATION = 264, EGG = 266, MEATBALL = 267, MEAT_STICK = 268,
      ENORMOUS_MEATBALL = 269, MEAT_RING = 270, APPLE = 277, BANANA = 281,
      CARROT = 282, CLOVE_OF_GARLIC = 284, SLIME_MOLD = 285;

// C ref: include/objects.h FOOD() `delay` field — objects[otyp].oc_delay, the
// number of turns a creature spends digesting each non-corpse comestible.
// dog_nutrition() copies this into mtmp->meating; m_move() (monmove.c:1745)
// then returns MMOVE_DONE without moving while meating>0, so the value decides
// how many turns the pet stays put after eating.  Ported verbatim from the
// FOOD block (tripe ration is otyp 264, in the same order as mkobj.js
// OBJECT_DATA).  Foods with delay 1 are the default and omitted.
const FOOD_OC_DELAY = {
    264: 2,   // tripe ration
    269: 20,  // enormous meatball
    271: 2,   // glob of gray ooze
    272: 2,   // glob of brown pudding
    273: 2,   // glob of green slime
    274: 2,   // glob of black pudding
    290: 2,   // pancake
    291: 2,   // lembas wafer
    292: 3,   // cram ration
    293: 5,   // food ration
    296: 0,   // tin
};

// C ref: mondata.h metallivorous(ptr) == (mflags1 & M1_METALLIVORE).  Only three
// species carry the flag (include/monsters.h); none are tamable pets, so a TIN
// fed to a contest pet always classifies MANFOOD.  Name-keyed for stability.
const M1_METALLIVORE_NAMES = new Set(["rock mole", "rust monster", "xorn"]);

// C ref: mondata.h haseyes(ptr) — monster has eyes (not NOEYES).  For the pets
// our sessions drive (dog/cat/pony) this is always true; M1_NOEYES monsters
// (e.g. blobs) never reach dogfood here, so a constant TRUE is faithful.
function haseyes(_mdat) { return true; }

// C ref: include/monsters.h MON() M1_POIS / M1_ACID flag bits.  dog.c dogfood()
// CORPSE branch returns POISON when the corpse's monster (corpsenm) is acidic or
// poisonous (and the pet doesn't resist), which makes the corpse fail the
// `otyp < MANFOOD` test and instead drop into the APPORT rn2(8) branch.  The
// non-poisonous, non-acidic corpses (goblin/orc/jackal/gnome/human/lichen/&c
// the contest sessions kill) return CADAVER instead, which is < MANFOOD and so
// emits NO rn2(8) — exactly what makes the post-kill pet RNG stream match C.
// Name-keyed (the JS pmidx scheme differs from C, but names are stable),
// extracted from include/monsters.h.
const M1_POIS_NAMES = new Set([
    "killer bee","soldier ant","giant beetle","queen bee","werejackal","werewolf",
    "gremlin","manes","homunculus","lemure","kobold","large kobold","kobold lord",
    "kobold shaman","rabid rat","wererat","giant spider","scorpion","xan","couatl",
    "vampire bat","baby green dragon","green dragon","yellow mold","lich","demilich",
    "master lich","arch-lich","kobold mummy","gnome mummy","orc mummy","dwarf mummy",
    "elf mummy","human mummy","ettin mummy","giant mummy","guardian naga","quantum mechanic",
    "genetic engineer","snake","water moccasin","pit viper","cobra","vampire","vampire lord",
    "vampire mage","Vlad the Impaler","kobold zombie","gnome zombie","orc zombie","dwarf zombie",
    "ghoul","iron golem","Medusa","water demon","horned devil","erinys","barbed devil",
    "marilith","vrock","hezrou","bone devil","ice devil","nalfeshnee","pit fiend","balrog",
    "Juiblex","Yeenoghu","Orcus","Geryon","Dispater","Baalzebub","Asmodeus","Demogorgon",
    "mail daemon","djinni","jellyfish","salamander","green slime","Minion of Huhetotl",
    "Chromatic Dragon","Nalzok","Scorpius","vampire lady","vampire leader",
]);
const M1_ACID_NAMES = new Set([
    "acid blob","gelatinous cube","spotted jelly","ochre jelly","baby yellow dragon",
    "yellow dragon","green mold","black naga hatchling","black naga","gray ooze",
    "brown pudding","green slime","black pudding","Juiblex",
]);

// C ref: mondata.h vegan(ptr) — keyed on the monster's class (mlet/mcls): blobs,
// jellies, fungi/molds, vortices, lights, non-stalker elementals, non-flesh/
// leather golems, plus noncorporeal monsters.  A vegan corpse fed to a non-
// herbivore pet returns MANFOOD (>= MANFOOD -> APPORT rn2(8)); to a herbivore
// pet it returns CADAVER.  S_* numeric class indices (include/defsym.h).
const S_BLOB = 2, S_JELLY = 10, S_VORTEX = 22, S_LIGHT = 25,
      S_ELEMENTAL = 31, S_FUNGUS = 32, S_GOLEM = 55;
const PM_STALKER_NAME = "stalker";
const FLESH_LEATHER_GOLEM = new Set(["flesh golem", "leather golem"]);
function corpse_is_vegan(fdat) {
    const c = fdat.mcls;
    if (c === S_BLOB || c === S_JELLY || c === S_FUNGUS || c === S_VORTEX
        || c === S_LIGHT) return true;
    if (c === S_ELEMENTAL && fdat.name !== PM_STALKER_NAME) return true;
    if (c === S_GOLEM && !FLESH_LEATHER_GOLEM.has(fdat.name)) return true;
    // noncorporeal (ghost/shade) — not reachable as a floor corpse pet-target
    // in the contest sessions; omitted.
    return false;
}

// C ref: mondata.h humanoid(ptr) == M1_HUMANOID.  Only the EATING pet's
// humanoid-ness matters in dogfood's cannibalism branch; the contest pets are
// all animals (dog/cat/pony), so this returns false and that branch never fires.
// Name-keyed to a small set covering humanoid PET species if one is ever driven.
function mon_is_humanoid(mdat) {
    // Dogs/cats/ponies (the only contest pets) are M1_ANIMAL, not M1_HUMANOID.
    return false && mdat; // keep `mdat` referenced; faithful for animal pets
}

// Kept in lock-step with allmain.js MULTIPASS_MOVEMON.  When the C multi-pass
// movemon() loop is enabled, the pet's repeat object scan needs real
// line-of-sight (clear_path) and the hero's COULD_SEE bit (couldsee) to match
// C's obj_resists/rn2(8) stream in dog_goal's APPORT branch.  Stays OFF in
// lock-step with the multi-pass gate (single-pass keeps the "always sees"
// approximation that matches the baseline).
export const PET_REAL_VISION = true;

// C ref: mon.c max_mon_load(mtmp).  MAX_CARR_CAP=1000, WT_HUMAN=1450.
// kitten(34)/little dog(16): cwt=150, MZ_SMALL, not strong ->
//   (1000*150)/1450 = 103, then /2 (not strong) = 51.
// pony(100): cwt=1300, MZ_MEDIUM, M2_STRONG, cwt<=WT_HUMAN -> MAX_CARR_CAP=1000,
//   no halving (strong) = 1000.
// All three starting pets are M1_NOHANDS and are not dragons / engulfers.
const PET_MAXLOAD = { [PM_LITTLE_DOG]: 51, [PM_KITTEN]: 51, [PM_PONY]: 1000 };

// C ref: mon.c MON_AT — a (live) monster other than the hero at <x,y>.
function MON_AT(x, y) {
    for (const m of game.level?.monsters || [])
        if (m.mx === x && m.my === y && !(m.mhp != null && m.mhp <= 0)) return m;
    return false;
}

// C ref: rm.h levl[x][y].typ + the object chain at a square.
function terrainTyp(x, y) { return game.level?.at(x, y)?.typ; }

// All floor objects on the level (C's `fobj` chain).  C inserts each newly
// placed object at the HEAD of fobj (otmp->nobj = fobj; fobj = otmp), so the
// chain iterates newest-first.  Our level.objects array is append-ordered
// (oldest-first), so reverse it to reproduce C's traversal order — in dog_goal
// the traversal order determines which object's APPORT rn2(8) fires first and
// how gg.gtyp evolves, so the obj_resists/rn2(8) stream must match C's fobj.
function fobj() {
    const arr = game.level?.objects;
    if (!arr) return [];
    const out = [];
    for (let i = arr.length - 1; i >= 0; i--) out.push(arr[i]);
    return out;
}

// Objects at a specific square.  Preserve the level.objects append order here
// (the per-tile `nexthere` scan in dog_move/dog_invent already matched C at
// the tiles these sessions exercise); only dog_goal's whole-level fobj scan
// needs the newest-first traversal.
function objectsAt(x, y) {
    return (game.level?.objects || []).filter((o) => o.ox === x && o.oy === y);
}

// C ref: hack.h distu(x,y) — squared distance from hero.
function distu(x, y) { return dist2(x, y, game.u?.ux ?? 0, game.u?.uy ?? 0); }
// C ref: hack.h distmin(x0,y0,x1,y1) — Chebyshev (king-move) distance.
function distmin(x0, y0, x1, y1) {
    return Math.max(Math.abs(x0 - x1), Math.abs(y0 - y1));
}

// C ref: dog.c dogfood(mon, obj) — the food/desirability classification.
// We only need (a) the rn2(100) obj_resists side-effect, emitted for every
// non-poisoned object, and (b) a faithful-enough quality so goal selection
// (and thus the downstream rn2 ordering) matches for the common objects the
// starting level places.
function dogfood(mon, obj) {
    const mdat = mon.data || {};
    const carni = !!mdat.carnivore;
    const herbi = !!mdat.herbivore;

    if (obj.opoisoned) return POISON; // resists_poison: pets don't, at start
    // is_quest_artifact() is false for ordinary objects; obj_resists rolls
    // rn2(100) (always FALSE for non-artifacts with ochance 0).
    if (obj_resists(obj, 0, 95))
        return obj.cursed ? TABU : APPORT;

    switch (obj.oclass) {
    case FOOD_CLASS: {
        // C ref: dog.c dogfood() FOOD_CLASS.  fx/fdat = the monster a CORPSE/
        // TIN/EGG came from (corpsenm), used by the corpse/egg branches; NON_PM
        // for ordinary food.  The rider/petrify checks run BEFORE the diet
        // gate, exactly as in C.
        const fx = (obj.otyp === CORPSE || obj.otyp === TIN || obj.otyp === EGG)
            ? obj.corpsenm : -1;
        const fdat = (fx != null && fx >= 0) ? monster_by_pmidx(fx) : null;

        // is_rider corpse -> TABU; flesh_petrifies (c*ckatrice/Medusa) -> POISON.
        // None of these corpses appear in pet boxes in the contest sessions, but
        // keep the guards faithful.  (resists_ston: pets don't, at start.)
        // is_rider / flesh_petrifies are name-rare; skip the lookups for the
        // common case (fdat present, ordinary species).

        // C ref: dog.c — the per-otyp diet switch is gated by `!carni && !herbi`
        // (omnivore/carnivore/herbivore pets only).  A non-eater pet treats food
        // as APPORT (or UNDEF if cursed).
        if (!carni && !herbi)
            return obj.cursed ? UNDEF : APPORT;
        // a starving pet (mhpmax_penalty) will eat almost anything; the starting
        // pets are well-fed, so starving stays false here.
        const starving = !!(mon.mtame && !mon.isminion && mon.edog
                            && mon.edog.mhpmax_penalty);
        // even carnivores eat carrots while temporarily blind (mblind)
        const mblind = !mon.mcansee && haseyes(mdat);
        switch (obj.otyp) {
        case TRIPE_RATION:
        case MEATBALL:
        case MEAT_RING:
        case MEAT_STICK:
        case ENORMOUS_MEATBALL:
            return carni ? DOGFOOD : MANFOOD;
        case EGG:
            return carni ? CADAVER : MANFOOD;
        case CORPSE: {
            // C ref: dog.c dogfood() CORPSE.  peek_at_iced_corpse_age() == age
            // for an off-ice corpse; a corpse that has rotted (age+50 <= moves)
            // and isn't a lizard/lichen/fungus, or whose monster is acidic/
            // poisonous (pet doesn't resist), is POISON.  Otherwise: polyfood ->
            // MANFOOD; vegan -> herbi?CADAVER:MANFOOD; cannibalism -> TABU/ACCFOOD
            // (humanoid pets only); else carni?CADAVER:MANFOOD.
            const moves = game.moves || 1;
            const age = obj.age ?? moves;
            const isLizardLichen = (fx === 158 /*lichen*/ || fx === 325 /*lizard*/);
            const fungus = fdat && fdat.mcls === S_FUNGUS;
            const acidic = fdat && M1_ACID_NAMES.has(fdat.name);
            const poisonous = fdat && M1_POIS_NAMES.has(fdat.name);
            if ((age + 50 <= moves && !isLizardLichen && !fungus)
                || acidic || poisonous)
                return POISON;
            // polyfood: chameleon-class / AD_POLY corpses.  Only the chameleon
            // (pmidx 326) is reachable in the contest slice; a tame pet (mtame>1)
            // that isn't starving avoids it (MANFOOD).
            if (fx === 326 /*chameleon*/ && (mon.mtame > 1) && !starving)
                return MANFOOD;
            if (fdat && corpse_is_vegan(fdat))
                return herbi ? CADAVER : MANFOOD;
            // humanoid-pet cannibalism branch: never fires for animal pets.
            if (mon_is_humanoid(mdat))
                return TABU;
            return carni ? CADAVER : MANFOOD;
        }
        case APPLE:
            return herbi ? DOGFOOD : MANFOOD; // (starving -> ACCFOOD; never here)
        case CARROT:
            return (herbi || mblind) ? DOGFOOD : MANFOOD;
        case BANANA:
            return (herbi) ? ACCFOOD : MANFOOD;
        case CLOVE_OF_GARLIC:
            return herbi ? ACCFOOD : MANFOOD;
        case TIN:
            // C ref: dog.c dogfood() — metallivorous(mptr) ? ACCFOOD : MANFOOD.
            // A pet won't pry a tin open to eat it (MANFOOD) unless it eats metal.
            return M1_METALLIVORE_NAMES.has(mdat.name) ? ACCFOOD : MANFOOD;
        default:
            if (starving) return ACCFOOD;
            // C: otyp > SLIME_MOLD ? (carni?ACCFOOD:MANFOOD)
            //                      : (herbi?ACCFOOD:MANFOOD)
            return (obj.otyp > SLIME_MOLD)
                ? (carni ? ACCFOOD : MANFOOD)
                : (herbi ? ACCFOOD : MANFOOD);
        }
    }
    case ROCK_CLASS:
        return UNDEF;
    default:
        if (!obj.cursed && obj.oclass !== BALL_CLASS
            && obj.oclass !== CHAIN_CLASS)
            return APPORT;
        return UNDEF;
    }
}

// C ref: stairs.c On_stairs(x,y) — stairway_at(x,y) != NULL.  Stairs live on
// the game.stairs linked list (mklev.js) with .sx/.sy coordinates.
function On_stairs(x, y) {
    for (let s = game.stairs; s; s = s.next)
        if (s.sx === x && s.sy === y) return true;
    return false;
}

// C ref: dogmove.c dog_goal — `for (obj = gi.invent; obj; obj = obj->nobj)`.
// The hero's pack, in inventory order.  game.invent is the materialized array.
function heroInvent() {
    return game.invent || game.gi?.invent || [];
}

// C ref: dogmove.c dog_goal — `for (t = gf.ftrap; ...) if (t->ttyp==MAGIC_PORTAL)`
// Consumes no RNG; just decides whether the pet should follow closely because
// the hero is on/next to a magic portal.
function nearMagicPortal() {
    const u = game.u;
    for (const t of (game.level?.traps || [])) {
        if (t.ttyp === MAGIC_PORTAL) {
            // distu(t.tx,t.ty) <= 2 (the first magic portal found ends the scan).
            return dist2(t.tx, t.ty, u.ux, u.uy) <= 2;
        }
    }
    return false;
}

// C ref: dog.c initedog() — apport = ACURR(A_CHA), captured at makedog() time.
// CRITICAL ORDERING: in newgame() (allmain.c:814) makedog() runs BEFORE
// u_init_inventory_attrs() (allmain.c:816) which sets the hero's attributes.
// At makedog time u_init_misc() has just memset(&u,0,...), so acurr.a[A_CHA]==0
// and abon/atemp are 0 too.  acurr(A_CHA) (attrib.c:1200) floors its result at
// 3 (`tmp <= 3 ? 3`), so the starting pet's apport is ALWAYS 3 regardless of
// role/race.  (The final, higher CHA is irrelevant — it isn't rolled yet.)
function edogApport(edog) {
    if (edog.apport == null) edog.apport = 3;
    return edog.apport;
}

// C ref: dogmove.c droppables(mon) — return the first droppable object in the
// pet's minvent.  Consumes no RNG.  The starting pets are NOHANDS animals; any
// ordinary item they've picked up is unworn/unwielded -> returned as droppable
// (the pickaxe/unihorn/key/weapon "keep" cases never apply to dog/cat/pony).
function droppables(mtmp) {
    const inv = mtmp.minvent;
    if (!inv || !inv.length) return null;
    for (const obj of inv) {
        if (!obj.owornmask && obj !== mtmp.mw) return obj;
    }
    return null;
}

// C ref: objnam.c doname(obj) for the items a starter pet carries (gold and
// ordinary floor objects), used in the pet pickup/drop toplines.  For a single
// gold piece doname() prefixes the article: "a gold piece"; a multi stack reads
// "<n> gold pieces".  Other objects use the full doname (doname_invent) so a
// known weapon/armor shows its enchantment ("a blessed +1 quarterstaff"); a
// floor object has no worn mask, so doname_invent's worn-status suffix is empty.
function pet_doname(obj) {
    if (obj && (obj.oclass === COIN_CLASS || obj.otyp === GOLD_PIECE)) {
        const q = obj.quan || 0;
        return q === 1 ? 'a gold piece' : `${q} gold pieces`;
    }
    return doname_invent(obj);
}

// C ref: dogmove.c dog_invent(mtmp, edog, udist).  The pet either drops a
// carried object (relobj, no RNG beyond the drop rolls), eats an underfoot
// item (counts as its move), or picks one up (splitobj -> next_ident when the
// stack is split).  Picking up sets minvent so later turns take the drop path
// and dog_goal's `dog_has_minvent` rolls fire.  Returns 1 if the pet ate.
async function dog_invent(mtmp, edog, udist) {
    const omx = mtmp.mx, omy = mtmp.my;
    const apport = edogApport(edog);

    // C ref: dogmove.c:416 — if carrying something, maybe drop it near @.
    if (droppables(mtmp)) {
        // assert(apport > 0)
        // C: if (!rn2(udist+1) || !rn2(apport)) if (rn2(10) < apport)
        if (rn2(udist + 1) === 0 || rn2(apport) === 0) {
            if (rn2(10) < apport) {
                // relobj(mtmp, ..., TRUE): drop everything onto the floor.  No
                // RNG.  Place each carried object back on the pet's tile.
                await relobj(mtmp, omx, omy);
                if (edog.apport > 1) edog.apport--;
                edog.dropdist = udist;
                edog.droptime = game.moves || 1;
            }
        }
        return 0;
    }

    // No minvent: maybe eat or pick up an underfoot object.
    const here = objectsAt(omx, omy);
    if (here.length) {
        const obj = here[0]; // svl.level.objects[omx][omy] = top of pile
        // nofetch classes (BALL/CHAIN/...) and special prizes are skipped in C
        // before dogfood; the starting level's underfoot objects aren't those.
        const edible = dogfood(mtmp, obj);
        if (edible <= CADAVER || (edog.mhpmax_penalty && edible === ACCFOOD)) {
            // would eat -> counts as the pet's move (dog_eat).  Not modeled in
            // detail; emit no further RNG and report "ate".
            return 1;
        }
        // can_carry / pickup path: rn2(20) < apport+3, then rn2(udist)/rn2(apport)
        const carryamt = can_carry(mtmp, obj);
        if (carryamt > 0 && !obj.cursed) {
            if (rn2(20) < apport + 3) {
                if (rn2(udist) || rn2(apport) === 0) {
                    // C ref: dogmove.c:448-465 — split a partial stack (which
                    // assigns a fresh o_id via next_ident -> rnd(2)) then move
                    // the object into the pet's minvent (mpickobj, no RNG).
                    let otmp = obj;
                    if (carryamt !== (obj.quan || 1))
                        otmp = pet_splitobj(obj, carryamt);
                    // C ref: dogmove.c:451-462 — if the hero can see the pet's
                    // tile, announce the pickup (verbose default) via pline_xy
                    // -> vpline -> update_topl.  doname() is evaluated before the
                    // object is removed from the floor.  No RNG (cansee is
                    // deterministic; gold/ordinary doname is too).  Routing through
                    // update_topl (not a raw _pending_message assignment) is what
                    // lets the pickup APPEND after an unacknowledged prior message
                    // (e.g. a preceding "The <mon> is killed!") on the same top
                    // line, exactly as C's topl buffer does.
                    if (cansee(omx, omy) && game.flags?.verbose !== false)
                        await emit_pet_msg(`${Monnam(mtmp)} picks up ${pet_doname(otmp)}.`);
                    // C ref: dogmove.c:463-464 — obj_extract_self(otmp) then
                    // newsym(omx, omy).  The pet is on the object's tile (omx,omy);
                    // the newsym refreshes the remembered background so the picked-up
                    // glyph doesn't linger once the tile leaves the hero's sight.
                    pet_extract_floor(otmp);
                    newsym(omx, omy);
                    mpickobj(mtmp, otmp);
                }
            }
        }
    }
    return 0;
}

// C ref: steal.c relobj(mtmp,x,y,...) — drop the pet's carried objects onto its
// tile.  Placement is deterministic (no RNG); we just move them from minvent
// back into level.objects at (x,y).
async function relobj(mtmp, x, y) {
    const inv = mtmp.minvent || [];
    const arr = game.level?.objects;
    // C ref: steal.c relobj(is_pet=TRUE) -> mdrop_obj(mon,obj,is_pet&&verbose).
    // For each droppable, when verbose and the hero can see the pet's tile,
    // announce "<Mon> drops <obj>." (doname evaluated before the floor drop) via
    // pline_mon -> vpline -> update_topl.  Routing through update_topl (not a raw
    // _pending_message assignment) lets each drop APPEND after an unacknowledged
    // prior message on the same top line (and page a --More-- when it won't fit),
    // exactly as C's topl buffer does.
    const verbose = game.flags?.verbose !== false;
    const announce = verbose && cansee(x, y);
    for (const obj of inv) {
        if (announce)
            await emit_pet_msg(`${Monnam(mtmp)} drops ${pet_doname(obj)}.`);
        obj.ox = x; obj.oy = y;
        // C ref: mdrop_obj -> place_object: the object goes back on the floor.
        // Use the same 'floor' marker place_object sets so vobj_at/the display
        // (display.c map_object) renders the dropped glyph.
        obj.where = 'floor';
        if (arr && !arr.includes(obj)) arr.push(obj);
    }
    mtmp.minvent = [];
}

// C ref: mkobj.c splitobj(obj,num) — split `num` off a stack into a new obj
// whose o_id comes from next_ident() (rnd(2)).  We only need the RNG-faithful
// next_ident call and a shallow clone for minvent bookkeeping.
function pet_splitobj(obj, num) {
    const split = { ...obj, quan: num, o_id: next_ident() };
    obj.quan = (obj.quan || 1) - num;
    return split;
}

// Remove an object (or split fragment) from the floor pile.
function pet_extract_floor(obj) {
    const arr = game.level?.objects;
    if (!arr) return;
    const ix = arr.indexOf(obj);
    if (ix >= 0) arr.splice(ix, 1);
}

// C ref: mon.c mpickobj(mtmp,otmp) — add an object to the monster's minvent.
// No RNG for ordinary items.
function mpickobj(mtmp, obj) {
    mtmp.minvent = mtmp.minvent || [];
    obj.where = 3; // OBJ_MINVENT
    mtmp.minvent.push(obj);
}

// C ref: dogmove.c dog_goal(...).  Returns the approach desire (-1/0/1) or -2
// to abort.  Sets the goal coordinates on `g` (gx/gy) used by the move loop.
function dog_goal(mtmp, edog, after, udist, whappr, g) {
    const omx = mtmp.mx, omy = mtmp.my;
    const u = game.u;

    // C ref: dogmove.c:494-496 — "Steeds don't move on their own will": a
    // ridden steed returns -2 immediately, BEFORE the fobj/invent scans, so it
    // consumes no obj_resists/rn2(8) RNG.  dog_move then maps appr==-2 to
    // MMOVE_NOTHING.  (Reached because the steed stays in fmon and is driven by
    // movemon/dochug/m_move each turn now that mount_steed keeps it on the list.)
    if (mtmp === u?.usteed) return -2;

    let gtyp = UNDEF;
    g.gx = 0; g.gy = 0;

    const SQ = 5;
    const min_x = Math.max(omx - SQ, 1);
    const max_x = Math.min(omx + SQ, COLNO - 1);
    const min_y = Math.max(omy - SQ, 0);
    const max_y = Math.min(omy + SQ, ROWNO - 1);

    const in_masters_sight = couldsee(omx, omy);
    // C ref: dog_has_minvent = (droppables(mtmp) != 0).  True once the pet has
    // picked something up in dog_invent (it stays in minvent until dropped).
    const dog_has_minvent = !!droppables(mtmp);

    // nearby food/objects (C iterates fobj; order only affects tie-breaks for
    // the goal, not the rn2 stream — obj_resists fires for every object).
    for (const obj of fobj()) {
        const nx = obj.ox, ny = obj.oy;
        if (nx >= min_x && nx <= max_x && ny >= min_y && ny <= max_y) {
            const otyp = dogfood(mtmp, obj); // -> obj_resists rn2(100)
            if (otyp > gtyp || otyp === UNDEF) continue;
            if (cursed_object_at(nx, ny)
                && !(edog.mhpmax_penalty && otyp < MANFOOD)) continue;
            // C ref: dogmove.c:539-542 — "skip completely unreachable goals".
            // This guard runs for EVERY in-range object (after dogfood's
            // obj_resists rn2(100) has already fired), BEFORE the MANFOOD split,
            // so it gates the apport rn2(8) roll below.  Without it a pet that
            // can SEE but cannot physically REACH an object (e.g. an item
            // embedded in stone that a fresh zap_dig just opened line-of-sight
            // to) would spuriously fire rn2(8), desyncing the whole RNG stream.
            if (!could_reach_item(mtmp, nx, ny)
                || !can_reach_location(mtmp, mtmp.mx, mtmp.my, nx, ny)) continue;
            if (otyp < MANFOOD) {
                if (otyp < gtyp || DDIST(nx, ny, omx, omy) < DDIST(g.gx, g.gy, omx, omy)) {
                    g.gx = nx; g.gy = ny; gtyp = otyp;
                }
            } else if (gtyp === UNDEF && in_masters_sight && !dog_has_minvent
                && (!isLit(omx, omy) || isLit(u.ux, u.uy))
                && (otyp === MANFOOD || m_cansee(mtmp, nx, ny))
                && edogApport(edog) > rn2(8)
                && can_carry(mtmp, obj) > 0) {
                g.gx = nx; g.gy = ny; gtyp = APPORT;
            }
        }
    }

    let appr;
    if (gtyp === UNDEF
        || (gtyp !== DOGFOOD && gtyp !== APPORT && (game.moves || 1) < edog.hungrytime)) {
        g.gx = u.ux; g.gy = u.uy;
        if (after && udist <= 4 && u.ux === g.gx && u.uy === g.gy)
            return -2;
        appr = (udist >= 9) ? 1 : (mtmp.mflee ? -1 : 0);
        if (udist > 1) {
            if (!IS_ROOM(terrainTyp(u.ux, u.uy)) || !rn2(4) || whappr
                || (dog_has_minvent && rn2(edogApport(edog))))
                appr = 1;
        }
        // C ref: dogmove.c:582 — "if you have dog food it'll follow you more
        // closely; if you are on stairs (or ladder) or on/next to a magic
        // portal, it behaves as if you have dog food."  When appr==0, C checks
        // On_stairs (no RNG), then scans the hero's pack calling dogfood() on
        // each item (each emits obj_resists rn2(100)), stopping at the first
        // DOGFOOD; then a magic-portal scan (no RNG).  This invent scan is the
        // RNG the 2nd movemon pass needs (the pet is adjacent => appr==0).
        if (appr === 0) {
            if (On_stairs(u.ux, u.uy)) {
                appr = 1;
            } else {
                for (const obj of heroInvent()) {
                    if (dogfood(mtmp, obj) === DOGFOOD) { // -> obj_resists rn2(100)
                        appr = 1;
                        break;
                    }
                }
                if (appr === 0 && nearMagicPortal())
                    appr = 1;
            }
        }
    } else {
        appr = 1;
    }
    if (mtmp.mconf) appr = 0;

    // C ref: dogmove.c:610-644 — when the goal is the hero's square but the pet
    // is OUT of the master's sight, the pet can't see the hero, so it follows
    // the hero's footprint track (gettrack) instead of beelining to the (now
    // unknown) hero position.  Falls back to the pet's remembered previous goal
    // (edog.ogoal) or, failing that, the nearest square it can see toward the
    // hero (do_clear_area + wantdoor).  This consumes NO RNG but changes the
    // goal, which is what feeds the pet's mfndpos/jv candidate selection.
    const FARAWAY = COLNO + 2;
    if (g.gx === u.ux && g.gy === u.uy && !in_masters_sight) {
        const cp = gettrack(omx, omy);
        if (cp) {
            g.gx = cp.x; g.gy = cp.y;
            edog.ogoal = { x: 0, y: 0 };
        } else if (edog.ogoal && edog.ogoal.x
                   && (edog.ogoal.x !== omx || edog.ogoal.y !== omy)) {
            g.gx = edog.ogoal.x; g.gy = edog.ogoal.y;
            edog.ogoal = { x: 0, y: 0 };
        } else {
            let fardist = FARAWAY * FARAWAY;
            g.gx = g.gy = FARAWAY;
            const best = { x: FARAWAY, y: FARAWAY, d: fardist };
            do_clear_area_wantdoor(omx, omy, 9, best);
            g.gx = best.x; g.gy = best.y;
            if (g.gx === FARAWAY || (g.gx === omx && g.gy === omy)) {
                g.gx = u.ux; g.gy = u.uy;
            } else {
                edog.ogoal = { x: g.gx, y: g.gy };
            }
        }
    } else {
        edog.ogoal = { x: 0, y: 0 };
    }
    return appr;
}

// C ref: vision.c do_clear_area(scol, srow, range, wantdoor, &fardist).  When
// the center is NOT the hero (always true for the pet), C forwards to
// view_from(srow, scol, (seenV**)0, 0, 0, range, func, arg), which runs the
// full shadow-casting field-of-view sweep from the pet's square and calls the
// wantdoor client on every square the pet could see (in the sweep's discovery
// order).  wantdoor keeps the visited square closest to the hero (min distu),
// breaking ties toward the first-visited square (strict `>`).  We now drive the
// real view_from (routing mark_visible_range through the func) instead of the
// old per-square clear_path approximation, so the goal matches C exactly.
function do_clear_area_wantdoor(scol, srow, range, best) {
    const u = game.u;
    // C ref: dogmove.c wantdoor() — *dist_ptr > distu(x,y) ? keep (x,y).
    view_from(srow, scol, null, null, null, range, (x, y) => {
        const ndist = dist2(x, y, u.ux, u.uy);
        if (best.d > ndist) { best.d = ndist; best.x = x; best.y = y; }
    }, best);
}

function DDIST(x, y, ox, oy) { return dist2(x, y, ox, oy); }

// C ref: dogmove.c cursed_object_at(x,y).
function cursed_object_at(x, y) {
    return objectsAt(x, y).some((o) => o.cursed);
}

// --- monster capability predicates used by could_reach_item/can_reach_location.
// C ref: mondata.h flag macros.  makemon's data records carry no mflags, so the
// special species are identified by pmidx (same convention monmove.js uses).
// The contest pets (little dog / kitten / pony) match none of these sets, so for
// them could_reach_item reduces to the pool/lava/boulder terrain test and
// can_reach_location's obstruction test reduces to plain IS_OBSTRUCTED.
const CRI_WALLWALK_PMIDX = new Set([156, 232, 287, 288]); // earth elem, xorn, ghost, shade
const CRI_TUNNELS_PMIDX = new Set([44, 46, 47, 92, 93, 225, 330, 343, 368]);
const CRI_ROCKTHROW_PMIDX = new Set([169, 170, 171, 172, 173, 174, 175, 176, 177, 359]);
function cri_passes_walls(d) { return !!d && CRI_WALLWALK_PMIDX.has(d.pmidx); }
function cri_tunnels(d) { return !!d && CRI_TUNNELS_PMIDX.has(d.pmidx); }
function cri_throws_rocks(d) { return !!d && CRI_ROCKTHROW_PMIDX.has(d.pmidx); }
// C ref: mondata.h is_swimmer(M1_SWIM) / likes_lava (salamander/fire elemental).
// No tameable/contest monster carries these flags at the points these sessions
// reach, so a constant FALSE is faithful for every pet exercised; a swimmer or
// lava-dweller pet would need the real M1_SWIM/M2 lookup.
function cri_is_swimmer(_d) { return false; }
function cri_likes_lava(_d) { return false; }
function cri_is_pool(x, y) {
    const t = game.level?.at(x, y)?.typ;
    return t === POOL || t === MOAT || t === WATER;
}
function cri_is_lava(x, y) {
    const t = game.level?.at(x, y)?.typ;
    return t === LAVAPOOL || t === LAVAWALL;
}
function cri_Is_rogue_level() {
    const uz = game.u?.uz, rl = game.rogue_level;
    return !!uz && !!rl && uz.dnum === rl.dnum && uz.dlevel === rl.dlevel;
}

// C ref: dogmove.c could_reach_item(mon, nx, ny) — can a monster pick up an
// object at (nx,ny)?  FALSE on water (unless swimmer), lava (unless lava-liker),
// or under a boulder (unless rock-thrower).
function could_reach_item(mon, nx, ny) {
    const d = mon.data;
    return (!cri_is_pool(nx, ny) || cri_is_swimmer(d))
        && (!cri_is_lava(nx, ny) || cri_likes_lava(d))
        && (!sobj_at(BOULDER, nx, ny) || cri_throws_rocks(d));
}

// C ref: dogmove.c can_reach_location(mon, mx, my, fx, fy) — recursive check
// that a monotonically-closer path of reachable, non-obstructed squares connects
// the monster at (mx,my) to the item at (fx,fy).  Max item distance is 5, so the
// recursion is at most 5 deep.
function can_reach_location(mon, mx, my, fx, fy) {
    if (mx === fx && my === fy) return true;
    if (!isok(mx, my)) return false;
    const dist = dist2(mx, my, fx, fy);
    const d = mon.data;
    for (let i = mx - 1; i <= mx + 1; i++) {
        for (let j = my - 1; j <= my + 1; j++) {
            if (!isok(i, j)) continue;
            if (dist2(i, j, fx, fy) >= dist) continue;
            const typ = game.level?.at(i, j)?.typ;
            if (IS_OBSTRUCTED(typ) && !cri_passes_walls(d)
                && (!may_dig(i, j) || !cri_tunnels(d) || cri_Is_rogue_level()))
                continue;
            if (IS_DOOR(typ)) {
                const dm = game.level?.at(i, j)?.doormask || 0;
                if (dm & (D_CLOSED | D_LOCKED)) continue;
            }
            if (!could_reach_item(mon, i, j)) continue;
            if (can_reach_location(mon, i, j, fx, fy)) return true;
        }
    }
    return false;
}

// C ref: include/vision.h — m_cansee(mtmp,x,y) == clear_path(mx,my,x,y) and
// couldsee(x,y) is the hero's COULD_SEE viz bit.  These gate the pet's APPORT
// object-fetch branch in dog_goal; using the real vision results (instead of a
// blanket "always sees") keeps the obj_resists/rn2(8) stream matching C when an
// object is in the pet's search box but not on a clear line of sight.
//
// Gated behind PET_REAL_VISION (kept in lock-step with the multi-pass movemon
// toggle in allmain.js): the real line-of-sight only pays off once the pet's
// repeat-move object scan runs (the C multi-pass).
function couldsee(x, y) { return PET_REAL_VISION ? visCouldsee(x, y) : true; }
export function m_cansee(mtmp, x, y) {
    return PET_REAL_VISION ? clear_path(mtmp.mx, mtmp.my, x, y) : true;
}
function isLit(x, y) { return !!game.level?.at(x, y)?.lit; }

// C ref: mon.c can_carry(mtmp, otmp) uses otmp->owt directly.  mkobj.js
// weight() now computes a C-exact owt for every object (containers = base +
// contents, the heavy single items keep their real oc_weight), so the
// can_carry load check reads obj.owt straight.  A defensive Math.max(1, ...)
// keeps a never-weighed object (owt unset) from reading as 0.
function objWeight(obj) {
    return Math.max(1, obj.owt ?? 1);
}

// C ref: mon.c can_carry(mtmp, otmp).  Returns 0 (cannot) or a positive
// quantity.  The dog_goal APPORT branch only cares whether the result is > 0,
// so we faithfully reproduce the conditions that yield 0 for the starting pet:
//
//   - notake / unsafe-to-touch: ordinary objects are fine -> not 0 here.
//   - M1_NOHANDS pets (all three starting pets) with a stack quan > 1 and no
//     engulf/dragon "glomper" return 1 BEFORE the load check (mon.c:2026).
//   - single items: 0 iff curr_mon_load + owt > max_mon_load.  A freshly
//     created starting pet carries nothing, so curr_mon_load == 0.
export function can_carry(mtmp, obj) {
    const pmidx = mtmp.data?.pmidx;
    const maxload = PET_MAXLOAD[pmidx] ?? 51;
    const iquan = obj.quan || 1;
    // All starting pets are NOHANDS and not glompers -> early return for stacks.
    if (iquan > 1) return 1;
    // single object: load capacity check (curr load is 0 for the start pet).
    if (objWeight(obj) > maxload) return 0;
    return iquan;
}

// C ref: dogmove.c find_targ(mtmp, dx, dy, maxdist) — walk a straight line from
// the pet, returning the first visible monster (or the hero, sentinel
// HERO_TARG) within maxdist; stops at the first square the pet can't see
// (clear_path).  Returns the target monster, the HERO_TARG sentinel, or null.
const HERO_TARG = Symbol('youmonst');
function find_targ(mtmp, dx, dy, maxdist) {
    let curx = mtmp.mx, cury = mtmp.my;
    for (let dist = 0; dist < maxdist; dist++) {
        curx += dx; cury += dy;
        if (!isok(curx, cury)) break;
        if (!m_cansee(mtmp, curx, cury)) break;
        // pet thinks the hero is at mux,muy.
        if (curx === mtmp.mux && cury === mtmp.muy) return HERO_TARG;
        const targ = MON_AT(curx, cury);
        if (targ) {
            // visible, detected, and (for our monsters) on its own square.
            if (!targ.minvis && !targ.mundetected) return targ;
            // can't see it -> assume not there, keep walking.
        }
    }
    return null;
}

// C ref: dogmove.c find_friends(mtmp, mtarg, maxdist) — is the hero or a pet in
// line beyond mtarg (so the pet would shoot through a friend)?  Returns true if
// so.  For the contest pets this gates the score_targ early-return (no rnd(5)).
function find_friends(mtmp, mtarg, maxdist) {
    const tx = mtarg.mx, ty = mtarg.my;
    const dx = Math.sign(tx - mtmp.mx), dy = Math.sign(ty - mtmp.my);
    let curx = tx, cury = ty;
    let dist = distmin(tx, ty, mtmp.mx, mtmp.my);
    for (; dist <= maxdist; dist++) {
        curx += dx; cury += dy;
        if (!isok(curx, cury)) return false;
        if (!m_cansee(mtmp, curx, cury)) return false;
        if (mtmp.mux === curx && mtmp.muy === cury) return true; // hero behind
        const pal = MON_AT(curx, cury);
        if (pal) {
            if (pal.mtame) {
                if (!pal.minvis) return true;
            } else {
                const ms = pal.data?.msound;
                if (ms === 'leader' || ms === 'guardian') return true;
            }
        }
    }
    return false;
}

// C ref: dogmove.c score_targ(mtmp, mtarg) — desirability of a ranged target.
// We need its RNG side-effect: the `score += rnd(5)` fuzz roll at dogmove.c:830,
// which only executes when the target survives the early returns (not a quest
// friendly, not adjacent, not tame/hero, no friend behind).  The numeric score
// only matters for best_target's selection, but the contest pets have no ranged
// attack so a chosen target never produces an attack roll — only the rnd(5)
// matters for RNG parity.  Returns the score (negative early-returns excluded).
function score_targ(mtmp, mtarg) {
    let score = 0;
    // mconf branch: starting pets aren't confused -> the guard is always true.
    if (!mtmp.mconf) {
        // quest friendlies: never targeted (no rnd(5)).
        const tms = (mtarg !== HERO_TARG) ? mtarg.data?.msound : null;
        if (tms === 'leader' || tms === 'guardian') return -5000;
        // adjacent monster -> melee range, not a ranged target (no rnd(5)).
        if (mtarg !== HERO_TARG
            && distmin(mtmp.mx, mtmp.my, mtarg.mx, mtarg.my) <= 1)
            return -3000;
        // tame monster or the hero -> never targeted (no rnd(5)).
        if (mtarg === HERO_TARG || mtarg.mtame) return -3000;
        // friend (hero / pet) behind the target -> don't shoot through (no rnd).
        if (find_friends(mtmp, mtarg, 15)) return -3000;
        // hostile-preference + passive/level adjustments (no RNG for our mons).
        if (!mtarg.mpeaceful) score += 10;
        const m_lev = mtarg.m_lev ?? mtarg.data?.mlevel ?? 0;
        score += m_lev * 2 + Math.trunc((mtarg.mhp ?? 0) / 3);
    }
    // Fuzz factor (dogmove.c:830) — the roll the post-dismount stream needs.
    score += rnd(5);
    return score;
}

// C ref: dogmove.c best_target(mtmp, forced) — scan the 8 directions (dy outer,
// dx inner) for the first lined-up target and pick the highest score_targ.  The
// rnd(5) inside score_targ fires once per qualifying lined-up target.
function best_target(mtmp) {
    if (!mtmp.mcansee) return null; // blind pet sees no target (no rnd(5))
    let bestscore = -40000, best = null;
    for (let dy = -1; dy < 2; dy++) {
        for (let dx = -1; dx < 2; dx++) {
            if (!dx && !dy) continue;
            const temp = find_targ(mtmp, dx, dy, 7);
            if (!temp) continue;
            const currscore = score_targ(mtmp, temp);
            if (currscore > bestscore) { bestscore = currscore; best = temp; }
        }
    }
    if (bestscore < 0) best = null;
    return best;
}

// C ref: dogmove.c pet_ranged_attk(mtmp, FALSE) — the pet's ranged-attack
// consideration run at the end of dog_move.  best_target() rolls the score_targ
// rnd(5) fuzz per lined-up target.  For the contest pets (no breath/spit/gaze
// attack) a chosen target yields M_ATTK_MISS from mattackm with no further RNG,
// so this returns MMOVE_NOTHING after the scan.  The `!hungry || !rn2(5)` gate
// only rolls rn2(5) when the pet is hungry (none of the early pets are yet).
function pet_ranged_attk(mtmp) {
    const edog = mtmp.edog;
    const DOG_HUNGRY = 500; // dog.c DOG_HUNGRY
    const hungry = edog ? ((game.moves || 1) > ((edog.hungrytime || 0) + DOG_HUNGRY)) : false;
    const mtarg = best_target(mtmp);
    if (mtarg && (!hungry || !rn2(5))) {
        // The starting pets have no ranged attack: mattackm returns M_ATTK_MISS
        // with no RNG, so no attack is executed.  (A real ranged pet would
        // attack here; wire that in if such a pet is ever exercised.)
        return MMOVE_NOTHING;
    }
    return MMOVE_NOTHING;
}

// C ref: dogmove.c dog_move(mtmp, after).  Drives one pet move.
export async function dog_move(mtmp, after) {
    const edog = mtmp.edog;
    if (!edog) return MMOVE_NOTHING;

    const omx = mtmp.mx, omy = mtmp.my;
    let udist = distu(omx, omy);
    if (!udist) return MMOVE_NOTHING; // standing on the hero (shouldn't happen)

    let nix = omx, niy = omy;

    // dog_invent: object underfoot / carrying.  May consume the move (eat).
    const j0 = await dog_invent(mtmp, edog, udist);
    if (j0 === 1) return MMOVE_DONE; // ate something

    const whappr = ((game.moves || 1) - edog.whistletime) < 5;

    const g = {};
    const appr = dog_goal(mtmp, edog, after, udist, whappr, g);
    if (appr === -2) return MMOVE_NOTHING;

    // mfndpos with pet allowflags.  ALLOW_M keeps monster-occupied adjacent
    // squares in the candidate list so the pet can melee a hostile monster;
    // ALLOW_TRAPS keeps harmful-trap squares (flagged in poss[i].info) so the pet
    // can roll the "step onto it anyway" chance below (dogmove.c mon_allowflags()).
    const ALLOW_M = 0x00080000;
    const poss = mfndpos(mtmp, ALLOW_M | ALLOW_TRAPS_F);
    const cnt = poss.length;

    // Count uncursed-item squares (for the cursed-item avoidance roll).  C ref
    // dogmove.c:1070 — a monster-occupied square without ALLOW_M/ALLOW_MDISP is
    // skipped; with ALLOW_M (every monster square here) it still counts toward
    // uncursedcnt unless it also holds a cursed object.
    let uncursedcnt = 0;
    for (let i = 0; i < cnt; i++) {
        const { x: nx, y: ny } = poss[i];
        if (cursed_object_at(nx, ny)) continue;
        uncursedcnt++;
    }

    let chcnt = 0, chi = -1;
    let nidist = GDIST(nix, niy, g);
    const k = uncursedcnt; // edog ? uncursedcnt : cnt
    const mtrack = mtmp.mtrack || [];
    // C ref: dogmove.c:1175 do_eat / `obj` — when the candidate scan finds food,
    // C records the object and jumps to newdogpos, where (after moving) it calls
    // dog_eat(mtmp, obj, ...).  We must do the same: the eat consumes the corpse
    // and rolls its own RNG (dogfood reward-check + delobj obj_resists).
    let do_eat = false, eat_obj = null;
    // C ref: dogmove.c:1090 — cursemsg[i] tracks whether candidate square i holds
    // a cursed object; consulted at newdogpos to emit the "<pet> steps reluctantly
    // onto <object>" topline for the square the pet actually moves onto (chi).
    const cursemsg = new Array(cnt).fill(false);

    for (let i = 0; i < cnt; i++) {
        const nx = poss[i].x, ny = poss[i].y;

        // (leashed / guardian skips omitted — never apply to the starting pets
        //  in these sessions.)

        // C ref: dogmove.c:1102 — ALLOW_M: the pet melees an adjacent monster.
        // A monster square either triggers an attack (return) or the pet balks
        // and the square is skipped entirely (C `continue`); either way it never
        // reaches the cursed-object / backtrack / distance logic below.
        const mtmp2 = MON_AT(nx, ny);
        if (mtmp2) {
            const r = await dog_attack_mon(mtmp, mtmp2, omx, omy, after);
            if (r !== null) return r; // attacked -> done with this move
            continue;                 // balked -> next candidate square
        }

        // C ref: dogmove.c:1188 — the dog avoids a harmful trap it can see, but
        // might have to cross one to follow the hero: a *seen* trap gives a 39/40
        // chance to skip the square (rn2(40)); 1/40 it steps on anyway.  Only
        // squares mfndpos flagged ALLOW_TRAPS (harmful) reach here.  (Leashed pets
        // whimper instead — not exercised by these steeds/pets.)
        if ((poss[i].info & ALLOW_TRAPS_F) && !mtmp.mleashed) {
            const trap = t_at(nx, ny);
            if (trap && trap.tseen && rn2(40)) continue;
        }

        // dog eschews cursed objects, likes dog food: scan objects at <nx,ny>.
        let ate = false;
        for (const obj of objectsAt(nx, ny)) {
            if (obj.cursed) { cursemsg[i] = true; continue; }
            const otyp = dogfood(mtmp, obj); // -> obj_resists rn2(100)
            if (otyp < MANFOOD
                && (otyp < ACCFOOD || edog.hungrytime <= (game.moves || 1))) {
                nix = nx; niy = ny; chi = i; ate = true;
                do_eat = true; eat_obj = obj;
                cursemsg[i] = false; // C ref: dogmove.c:1230 — not reluctant
                break;
            }
        }
        if (ate) break; // goto newdogpos (eating)

        // saw a cursed item and not forced onto it -> usually keep looking.
        if (cursemsg[i] && uncursedcnt > 0 && rn2(13 * uncursedcnt))
            continue;

        // backtrack avoidance (only when far from the hero).
        if (distmin(omx, omy, game.u.ux, game.u.uy) > 5) {
            let skip = false;
            for (let jj = 0; jj < MTSZ && jj < k - 1; jj++) {
                const t = mtrack[jj];
                if (t && nx === t.x && ny === t.y) {
                    if (rn2(MTSZ * (k - jj))) { skip = true; break; }
                }
            }
            if (skip) continue;
        }

        const ndist = GDIST(nx, ny, g);
        const jv = (ndist - nidist) * appr;
        if ((jv === 0 && !rn2(++chcnt)) || jv < 0
            || (jv > 0 && !whappr
                && ((omx === nix && omy === niy && !rn2(3)) || !rn2(12)))) {
            nix = nx; niy = ny; nidist = ndist;
            if (jv < 0) chcnt = 0;
            chi = i;
        }
    }

    // C ref: dogmove.c:1273 — pet_ranged_attk(mtmp, FALSE) runs after the
    // candidate loop.  best_target()'s score_targ rolls rnd(5) for each
    // non-adjacent, non-tame, hostile target lined up within 7 visible squares,
    // which is RNG the move stream depends on even though the contest pets never
    // actually fire a ranged attack.  A non-NOTHING result short-circuits.
    // NOTE: when the candidate scan found food it `goto newdogpos` in C, jumping
    // PAST pet_ranged_attk, so we only run it when the pet isn't eating.
    if (!do_eat) {
        const r = pet_ranged_attk(mtmp);
        if (r !== MMOVE_NOTHING) return r;
    }

    // newdogpos:
    if (nix !== omx || niy !== omy) {
        // C ref: dogmove.c:1295 — wasseen captured before the move (old square),
        // then re-checked at the new square, for the reluctant-step topline.
        const wasseen = canseemon(mtmp);
        mtmp.mtrack = [{ x: omx, y: omy }, ...mtrack].slice(0, MTSZ);
        mtmp.mx = nix; mtmp.my = niy;
        // C ref: dogmove.c:1298 — "<pet> steps reluctantly onto <object>." when
        // the pet moves onto a square whose (topmost) object is cursed and it is
        // (or was) in view.  In C the pline fires inside dog_move (before the tty
        // redraw); it sets the topline NEED_MORE but does not block on its own.
        // Skipped when the pet ate the food underfoot.
        if (chi >= 0 && cursemsg[chi] && (wasseen || canseemon(mtmp))) {
            const verb = vtense(locomotion(mtmp.data, 'step')); // "steps"
            const over = is_flyer(mtmp.data) || is_floater(mtmp.data);
            const what = reluctant_what(nix, niy);
            await emit_pet_msg(`${noit_Monnam(mtmp)} ${verb} reluctantly ${over ? 'over' : 'onto'} ${what}.`);
        }
        // C ref: monmove.c postmov():1508 — the tty redraw is deferred here (m_move
        // returns postmov(..., dog_move(...), ...)).  Clear the vacated square,
        // then run mintrap on the new square: a trap message (e.g. "<pet> is caught
        // in a bear trap!") pages the still-pending reluctant line with --More--,
        // and the trap's own RNG only fires once the prompt is dismissed.  The new
        // square is redrawn (pet painted over the object) only afterwards.
        newsym(omx, omy);
        const trapret = await mon_mintrap(mtmp);
        if (trapret === Trap_Killed_Mon) { newsym(nix, niy); return MMOVE_DIED; }
        newsym(nix, niy);
        // C ref: dogmove.c:1318 — after moving onto the food, the pet eats it.
        if (do_eat && eat_obj) {
            const r = await dog_eat(mtmp, edog, eat_obj, omx, omy);
            if (r === 2) return MMOVE_DIED;
        }
        return MMOVE_MOVED;
    }
    // C ref: dogmove.c:1354 — dog_move() falls through to `return MMOVE_MOVED`
    // even when the pet stays put (nix==omx && niy==omy).  m_move() routes that
    // through postmov() (monmove.c:1471,1508-1509), which ALWAYS runs
    // newsym(old-square) + mintrap() on the pet's CURRENT square when
    // mmoved==MMOVE_MOVED.  So a pet that (e.g.) escaped its bear trap this turn
    // (m_move mtrapped-escape) but then chose not to move is still standing on
    // that trap, and mintrap re-checks it: a trap the pet now knows -> rn2(4)
    // @ trap.c:3812 (walks over).  On a non-trap square mintrap is a no-op (no
    // RNG).  Returning MMOVE_MOVED also matches C's dochug switch, which for a
    // ranged-less pet returns 0 without reaching the attack step (phase_four).
    // The previous `return MMOVE_NOTHING` skipped this mintrap, dropping an
    // rn2(4) that C consumes and desyncing every later monster move that turn.
    newsym(omx, omy);
    const trapret = await mon_mintrap(mtmp);
    if (trapret === Trap_Killed_Mon) { newsym(mtmp.mx, mtmp.my); return MMOVE_DIED; }
    newsym(mtmp.mx, mtmp.my);
    return MMOVE_MOVED;
}

// C ref: dogmove.c dog_eat(mtmp, obj, x, y, devour=FALSE) — the pet eats a floor
// object it has just moved onto.  We model the RNG-load-bearing + observable
// pieces exercised by the contest pets (corpses / ordinary food, never devour /
// shop / royal-jelly / metal here):
//   - dog_nutrition(): no RNG; updates edog->hungrytime + mtmp->meating.
//   - the "<pet> eats <obj>." topline when the pet or food is in view.
//   - the reward-apport dogfood() check (dog.c:1197 equiv) -> obj_resists rn2(100).
//   - m_consume_obj() -> delobj() -> obj_resists(obj,0,0) rn2(100), then the
//     corpse is removed from the floor.
// Returns 2 if the pet died (never here), else 1.
async function dog_eat(mtmp, edog, obj, x, y) {
    const moves = game.moves || 1;
    if (edog.hungrytime < moves) edog.hungrytime = moves;
    // dog_nutrition(): nutrit drives hungrytime; corpses use the species cnutrit
    // table, but only hungrytime (a non-RNG counter) depends on it, so a faithful
    // bump keeps later `hungrytime <= moves` food gates aligned.  We approximate
    // the nutrition with the corpse's species nutrition when available.
    edog.hungrytime += dog_nutrition(mtmp, obj);
    mtmp.mconf = 0;
    if (mtmp.mflee && mtmp.mfleetim > 1) mtmp.mfleetim = Math.trunc(mtmp.mfleetim / 2);
    if ((mtmp.mtame || 0) < 20) mtmp.mtame = (mtmp.mtame || 0) + 1;
    // moved & ate on same turn: redraw the start and current squares.
    if (x !== mtmp.mx || y !== mtmp.my) { newsym(x, y); newsym(mtmp.mx, mtmp.my); }

    // C ref: dog_eat — food items are eaten one at a time (splitobj) when the
    // pile has quan>1; corpses are quan==1, so no splitobj/next_ident here.

    // "<pet> eats <obj>." — shown when the pet (at its new tile) or the food is
    // in view.  noit_Monnam == "Your kitten" for a tame pet.
    const seeobj = cansee(mtmp.mx, mtmp.my);
    const sawpet = cansee(x, y);
    if (sawpet || seeobj) {
        const what = pet_doname(obj);
        await emit_pet_msg(`${noit_Monnam(mtmp)} eats ${what}.`);
    }

    // C ref: dog_eat:315 — reward-apport bump only when DOGFOOD && obj->invlet,
    // but dogfood() is *called* unconditionally (obj_resists rn2(100) fires).
    dogfood(mtmp, obj); // -> obj_resists rn2(100)

    // C ref: m_consume_obj -> delobj(obj) -> delobj_core: obj_resists(obj,0,0)
    // rn2(100) guard, obj_extract_self() removes it from the floor, then (because
    // it was a floor object) `newsym(obj->ox, obj->oy)` repaints the vacated tile.
    // The final newsym is load-bearing: the pet is standing on the object's tile,
    // so newsym re-runs _map_location(x,y,FALSE) to refresh the tile's REMEMBERED
    // background glyph to the now-object-free terrain *under* the monster.  Without
    // it the tile keeps its stale corpse memory and redraws the eaten '%' once the
    // pet steps away and the square falls out of the hero's sight.
    obj_resists(obj, 0, 0); // rn2(100)
    const ox = obj.ox, oy = obj.oy;
    pet_extract_floor(obj);
    newsym(ox, oy);

    return 1;
}

// C ref: dogmove.c dog_nutrition(mtmp, obj) — no RNG.  Only the hungrytime
// side-effect is load-bearing for the move stream: it pushes hungrytime well
// past svm.moves so the pet stops being "hungry" (gating future ACCFOOD eats via
// `hungrytime <= moves`).  The precise nutrition value isn't observable, so we
// approximate it with a positive amount large enough to keep the not-hungry gate
// stable for the rest of the session.  Corpses scale a base nutrition by the
// eater's body size; other food uses a small positive default.
function dog_nutrition(mtmp, obj) {
    // C ref: dog_nutrition sets mtmp->meating (the digesting-occupation counter)
    // AND returns nutrit (the hungrytime bump).  meating gates the pet's movement
    // for the next few m_move() calls (monmove.c:1745), so it MUST be exact:
    //   corpse:    meating = 3 + (mons[corpsenm].cwt >> 6)
    //   other food: meating = objects[otyp].oc_delay  (not exercised here)
    // For a corpse, cwt < 64 (newt cwt 10) -> meating = 3.
    let nutrit;
    if (obj.otyp === CORPSE) {
        const cwt = mon_cwt(obj.corpsenm) ?? 0;
        mtmp.meating = 3 + (cwt >> 6);
        // nutrit = mons[corpsenm].cnutrit; the cnutrit table isn't ported, so use
        // a conservative positive base (only the hungrytime sign/magnitude is
        // observable, never the exact value).
        nutrit = 50;
    } else {
        // C ref: dog_nutrition — a non-corpse food's digesting time is
        // objects[otyp].oc_delay, NOT a flat 1.  meating gates the pet's
        // movement for the next oc_delay m_move() calls (monmove.c:1745 returns
        // MMOVE_DONE while meating>0), so it MUST match C exactly: e.g. a pet
        // that gobbles a tripe ration (oc_delay 2) stays put for two turns,
        // shifting when it next re-enters the movemon loop relative to the other
        // monsters.  A flat 1 let the pet move a turn too early.
        mtmp.meating = FOOD_OC_DELAY[obj.otyp] ?? 1;
        nutrit = 50;
    }
    // C ref: dog_nutrition — a partially-eaten food scales meating (and nutrit)
    // by the remaining fraction via eaten_stat().  Floor food fed to a pet is
    // normally fresh (oeaten==0), so this branch is not exercised by the current
    // sessions; when it is, clamp meating to at least 1 as eaten_stat() does.
    if (obj.oeaten && mtmp.meating > 1) mtmp.meating = 1;
    const msize = (mtmp.data?.msize != null)
        ? mtmp.data.msize
        : (mon_msize(mtmp.data?.pmidx) ?? 2 /* MZ_MEDIUM */);
    switch (msize) {
    case 0: nutrit *= 8; break;  // MZ_TINY
    case 1: nutrit *= 6; break;  // MZ_SMALL
    case 3: nutrit *= 4; break;  // MZ_LARGE
    case 4: nutrit *= 3; break;  // MZ_HUGE
    case 5: nutrit *= 2; break;  // MZ_GIGANTIC
    default: nutrit *= 5; break; // MZ_MEDIUM
    }
    return nutrit;
}

// C ref: do_name.c Monnam()/x_monnam(ARTICLE_YOUR) capitalized — "Your kitten".
function noit_Monnam(mtmp) {
    const s = x_monnam(mtmp, /*ARTICLE_YOUR*/ 3, null, 0, false);
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// Emit a pet topline message, honoring the --More-- pacing that update_topl
// applies when a previous (e.g. kill) message is still pending acknowledgment.
async function emit_pet_msg(msg) {
    const { update_topl } = await import('./display.js');
    await update_topl(msg);
}

// C ref: display.c canseemon(mon) — the hero can see the monster (its square is
// in view and it isn't invisible unless the hero sees invisible).  Used to gate
// the pet's reluctant-step topline.
function canseemon(mtmp) {
    if (!mtmp) return false;
    if (game.u?.uswallow) return true;
    if (mtmp.minvis && !game.u?.see_invis) return false;
    return !!cansee(mtmp.mx, mtmp.my);
}

// C ref: mondata.h is_flyer(ptr) = (mflags1 & M1_FLY).  makemon carries no
// mflags1, so identify flyers by pmidx (the low-level M1_FLY set, mirroring
// monmove.js); pets exercised by the sessions (dog/kitten/pony) are not flyers.
const M1_FLY_PMIDX = new Set([49, 50, 98, 220]);
function is_flyer(ptr) { return ptr != null && M1_FLY_PMIDX.has(ptr.pmidx); }
// C ref: mondata.h is_floater(ptr) = (ptr->mlet == S_EYE).  S_EYE == 18.
function is_floater(ptr) { return ptr != null && ptr.mcls === 18; }

// C ref: mondata.c locomotion(ptr, def) — the movement verb.  Floaters/flyers/
// slitherers use their own verb; a normal limbed walker (every contest pet) uses
// `def` ("step").  Amorphous/immobile/nolimbs branches aren't reachable for the
// pets that step onto cursed objects, so they fall through to def.
function locomotion(ptr, def) {
    if (is_floater(ptr)) return 'float';
    if (is_flyer(ptr)) return 'fly';
    if (ptr && (ptr.mcls === 45 /* S_SNAKE */ || ptr.mcls === 40 /* S_NAGA */))
        return 'slither';
    return def;
}

// C ref: objnam.c vtense(NULL, verb) — the singular 3rd-person present form of a
// plural-shaped verb ("step" -> "steps", "fly" -> "flies").  Only the null-subject
// (`sing:`) branch is needed here.
function vtense(verb) {
    const b = verb;
    const last = b[b.length - 1]?.toLowerCase();
    const prev = b.length >= 2 ? b[b.length - 2].toLowerCase() : '';
    if (b.toLowerCase() === 'are') return 'is';
    if (b.toLowerCase() === 'have') return b.slice(0, -2) + 's';
    if (last === 'z' || last === 'x' || last === 's'
        || (b.length >= 2 && last === 'h' && (prev === 'c' || prev === 's'))
        || (b.length === 2 && last === 'o'))
        return b + 'es';
    if (last === 'y' && !'aeiou'.includes(prev))
        return b.slice(0, -1) + 'ies';
    return b + 's';
}

// C ref: dogmove.c:1302 — the object the pet is reluctantly stepping onto.  Names
// the top object only when the hero *remembers* an object there (not hallucinating,
// hero_memory on, the map cell's remembered glyph is that object); else "something".
function reluctant_what(x, y) {
    if (!game.u?.uhallu && game.level?.flags?.hero_memory) {
        const o = vobj_at(x, y);
        const loc = game.level?.at(x, y);
        if (o && loc?.remembered_glyph) {
            const og = object_glyph(o);
            if (og && og.ch === loc.remembered_glyph.ch)
                return floor_object_name(o);
        }
    }
    return 'something';
}

function GDIST(x, y, g) { return dist2(x, y, g.gx, g.gy); }

// C ref: dogmove.c:1102-1170 — the ALLOW_M branch of dog_move's choice loop.
// Decides whether the pet (mtmp) attacks an adjacent monster (mtmp2); returns
// an MMOVE_* code when it does (or when `after` short-circuits), or null when
// the pet balks at this foe (caller skips the square).
async function dog_attack_mon(mtmp, mtmp2, omx, omy, after) {
    // balk: highest defender level the pet is willing to engage, scaled by the
    // pet's current HP fraction.  C: m_lev + (5*mhp/mhpmax) - 2.  The starting
    // pets don't track mhp/mhpmax here, so a missing fraction is treated as full
    // health (matching a freshly-made pet) to keep the comparison faithful.
    const petLev = mtmp.m_lev ?? mtmp.data?.mlevel ?? 0;
    const hpFrac = (mtmp.mhp != null && mtmp.mhpmax)
        ? Math.trunc((5 * mtmp.mhp) / mtmp.mhpmax) : 5;
    const balk = petLev + hpFrac - 2;
    const defLev = mtmp2.m_lev ?? mtmp2.data?.mlevel ?? 0;

    // C dogmove.c:1121 — refuse the fight under any of these conditions.
    if (defLev >= balk
        || (mtmp2.mtame && mtmp.mtame /* && !Conflict */)
        // max_passive_dmg(mtmp2) >= mtmp.mhp: the modeled hostiles (newt/fox/
        // jackal/rat/gecko) have no passive attack, so this is 0 — never balks.
        || (mtmp2.mpeaceful /* guardian/leader or low-HP peaceful */
            && ((mtmp.mhp != null && mtmp.mhpmax && mtmp.mhp * 4 < mtmp.mhpmax)
                || mtmp2.data?.msound === 'guardian'
                || mtmp2.data?.msound === 'leader'))) {
        return null;
    }

    // Floating-eye / cube / cockatrice ranged-only avoidance (rn2(10) gazes)
    // isn't reachable for the modeled foes; skip.

    if (after) return MMOVE_NOTHING; // hit only once each move

    let mstatus = await mattackm(mtmp, mtmp2); // dogmove.c:1151

    if (mstatus & M_ATTK_AGR_DIED) return MMOVE_DIED;

    // C dogmove.c:1157 — the struck defender may strike back.
    if ((mstatus & (M_ATTK_HIT | M_ATTK_DEF_DIED)) === M_ATTK_HIT
        && rn2(4)                                 // dogmove.c:1158
        && mtmp2.mlstmv !== game.moves
        // onscary() is false for these monsters (no temple/Elbereth here)
        && monnear(mtmp2, mtmp.mx, mtmp.my)) {
        mstatus = await mattackm(mtmp2, mtmp);    // return attack (dogmove.c:1165)
        if (mstatus & M_ATTK_DEF_DIED) return MMOVE_DIED;
    }
    return MMOVE_DONE;
}

// C ref: mon.c monnear(mon, x, y) — within melee range (dist2 < 3, but grid
// bugs can't reach diagonal range-2 squares).
function monnear(mon, x, y) {
    const PM_GRID_BUG = 116; // makemon MONS-table index (matches mfndpos nodiag)
    const distance = dist2(mon.mx, mon.my, x, y);
    if (distance === 2 && mon.data?.pmidx === PM_GRID_BUG) return false;
    return distance < 3;
}

// C ref: dog.c mon_catchup_elapsed_time(mtmp, nmv) — heal a monster and decay
// its status timers for the game turns it spent inactive on a level the hero
// had left, applied when restore.c getlev() reloads that level.  RNG is
// consumed only by the conditional recovery rolls: rn2(nmv+1) for a trapped /
// confused / stunned monster, and rn2(wilder) for a tame monster that has been
// separated from the hero long enough to risk going wild.  For the small
// elapsed times and hostile (non-tame, un-afflicted) monsters the recorded
// sessions return to, none of these fire, so no RNG is used.  HP regeneration
// (healmon) and the pet-starvation check are HP/tameness-only bookkeeping with
// no RNG and no glyph effect, so they are not modelled.
export function mon_catchup_elapsed_time(mtmp, nmv) {
    const LARGEST_INT = 0x7fffffff;
    let imv = (nmv >= LARGEST_INT) ? (LARGEST_INT - 1) : (nmv | 0);

    // might stop being afraid, blind or frozen (set to 1; movemon does the
    // final decrement)
    if (mtmp.mblinded)
        mtmp.mblinded = (imv >= mtmp.mblinded) ? 1 : (mtmp.mblinded - imv);
    if (mtmp.mfrozen)
        mtmp.mfrozen = (imv >= mtmp.mfrozen) ? 1 : (mtmp.mfrozen - imv);
    if (mtmp.mfleetim)
        mtmp.mfleetim = (imv >= mtmp.mfleetim) ? 1 : (mtmp.mfleetim - imv);

    // might recover from temporary trouble
    if (mtmp.mtrapped && rn2(imv + 1) > 40 / 2) mtmp.mtrapped = 0;
    if (mtmp.mconf && rn2(imv + 1) > 50 / 2) mtmp.mconf = 0;
    if (mtmp.mstun && rn2(imv + 1) > 10 / 2) mtmp.mstun = 0;

    // might finish eating or be able to use special ability again
    if (mtmp.meating) {
        if (imv > mtmp.meating) mtmp.meating = 0; // finish_meating (no RNG)
        else mtmp.meating -= imv;
    }
    if (imv > (mtmp.mspec_used || 0)) mtmp.mspec_used = 0;
    else mtmp.mspec_used -= imv;

    // reduce tameness for every 150 moves you are separated
    if (mtmp.mtame) {
        const wilder = Math.floor((imv + 75) / 150);
        if (mtmp.mtame > wilder)
            mtmp.mtame -= wilder;              // less tame
        else if (mtmp.mtame > rn2(wilder))
            mtmp.mtame = 0;                    // untame
        else
            mtmp.mtame = mtmp.mpeaceful = 0;   // hostile!
    }

    // set_mon_lastmove(mtmp)
    mtmp.mlstmv = game.moves ?? 0;
}
