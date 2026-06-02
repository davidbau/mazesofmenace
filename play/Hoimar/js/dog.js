// dog.js -- starting pet creation.
// C ref: dog.c:makedog(), makemon.c:makemon() near-hero placement.

import { game } from './gstate.js';
import { enexto_core, makemon, mkcorpstat, mksobj, monsterPtr, next_ident, place_object, set_malign_basic } from './mklev.js';
import { OBJECT_CLASS, OBJECT_DELAY } from './object_data.js';
import { MONSTER_DATA } from './monster_data.js';
import {
    newsym, pline, queue_more_prompt, flush_screen,
    serialize_terminal_grid, show_glyph_cell, topline_can_pack_message,
} from './display.js';
import { NO_COLOR } from './terminal.js';
import {
    ACCFOOD, APPORT, CADAVER, COLNO, DOGFOOD, MANFOOD, ROWNO, TABU, UNDEF,
    D_BROKEN, D_CLOSED, D_LOCKED, GP_AVOID_MONPOS, GP_CHECKSCARY, IS_DOOR, IS_OBSTRUCTED,
    IS_LAVA, IS_POOL, IS_ROOM, LADDER, MM_EDOG, MTSZ, NO_MINVENT, SPACE_POS, STAIRS,
    W_SADDLE, W_WEP, isok, MGIVENNAME, has_mgivenname, CORPSTAT_INIT,
} from './const.js';
import { d, rn2, rnd } from './rng.js';
import { gettrack } from './track.js';
import { cansee, clear_area_from, clear_path, couldsee } from './vision.js';
import { getObjectDescription } from './o_init.js';

const AMULET_CLASS = 5;
const FOOD_CLASS = 7;
const SCROLL_CLASS = 9;
const SPBOOK_CLASS = 10;
const WAND_CLASS = 11;
const WEAPON_CLASS = 2;
const COIN_CLASS = 12;
const GEM_CLASS = 13;
const ROCK_CLASS = 14;
const BALL_CLASS = 15;
const CHAIN_CLASS = 16;
const M1_NOHANDS = 0x00002000;
const GOLD_PIECE = 438;
const ORCISH_DAGGER = 36;
const DART = 24;
const JAVELIN = 32;
const QUARTERSTAFF = 79;
const TRIPE_RATION = 264;
const FOOD_RATION = 293;
const BOULDER = 475;
const CORPSE = 265;
const EGG = 266;
const PLATE_MAIL = 121;
const CRYSTAL_PLATE_MAIL = 122;
const BRONZE_PLATE_MAIL = 123;
const SPLINT_MAIL = 124;
const BANDED_MAIL = 125;
const DWARVISH_MITHRIL_COAT = 126;
const ELVEN_MITHRIL_COAT = 127;
const CHAIN_MAIL = 128;
const ORCISH_CHAIN_MAIL = 129;
const SCALE_MAIL = 130;
const STUDDED_LEATHER_ARMOR = 131;
const RING_MAIL = 132;
const ORCISH_RING_MAIL = 133;
const LEATHER_ARMOR = 134;
const LEATHER_JACKET = 135;
const MEATBALL = 267;
const MEAT_STICK = 268;
const ENORMOUS_MEATBALL = 269;
const GLOB_OF_GREEN_SLIME = 273;
const APPLE = 277;
const BANANA = 281;
const CARROT = 282;
const CLOVE_OF_GARLIC = 284;
const SLIME_MOLD = 285;
const TIN = 296;
const TINNING_KIT = 238;
const EXPENSIVE_CAMERA = 229;
const OIL_LAMP = 227;
const MAGIC_LAMP = 228;
const SADDLE = 235;
const LARGE_BOX = 214;
const CHEST = 215;
const MIRROR = 230;
const STETHOSCOPE = 237;
const MAGIC_MARKER = 242;
const BELL_OF_OPENING = 263;
const CANDELABRUM_OF_INVOCATION = 262;
const DOG_HUNGRY = 300;
const M2_STRONG = 0x04000000;
const M2_UNDEAD = 0x00000002;
const G_FREQ = 0x0007;
const G_NOCORPSE = 0x0010;

const OBJECT_WEIGHT_OVERRIDES = new Map([
    [LARGE_BOX, 350],
    [CHEST, 600],
    // C refs: objects.h WEAPON(...), mon.c:can_carry().  mksobj() still
    // initializes most JS object weights as 1, so pets must consult table
    // weights for heavy weapons before accepting apport goals.
    [44, 60], // axe
    [45, 120], // battle-axe
    [52, 70], // broadsword
    [53, 70], // elven broadsword
    [55, 150], // two-handed sword
    [57, 60], // tsurugi
    [59, 80], // partisan
    [62, 75], // glaive
    [63, 150], // halberd
    [64, 120], // bardiche
    [65, 125], // voulge
    [66, 60], // fauchard
    [67, 80], // guisarme
    [68, 120], // bill-guisarme
    [69, 150], // lucern hammer
    [70, 100], // bec de corbin
    [71, 120], // dwarvish mattock
    [72, 180], // lance
    [75, 120], // morning star
    // C refs: objects.h ARMOR(...), mon.c:can_carry().
    // Generated armor objects can lack owt in the JS state; pets must still
    // use their table weights before dog_invent() rolls for pickup.
    [PLATE_MAIL, 450],
    [CRYSTAL_PLATE_MAIL, 415],
    [BRONZE_PLATE_MAIL, 450],
    [SPLINT_MAIL, 400],
    [BANDED_MAIL, 350],
    [DWARVISH_MITHRIL_COAT, 150],
    [ELVEN_MITHRIL_COAT, 150],
    [CHAIN_MAIL, 300],
    [ORCISH_CHAIN_MAIL, 300],
    [SCALE_MAIL, 250],
    [STUDDED_LEATHER_ARMOR, 200],
    [RING_MAIL, 250],
    [ORCISH_RING_MAIL, 250],
    [LEATHER_ARMOR, 150],
    [LEATHER_JACKET, 30],
    [EXPENSIVE_CAMERA, 200],
    [MIRROR, 10],
    [STETHOSCOPE, 75],
    [TINNING_KIT, 100],
    [MAGIC_MARKER, 2],
]);

const CORPSE_STATS = new Map([
    // C ref: include/monsters.h SIZ(cwt, cnutrit, ...).
    ['JACKAL', { cwt: 300, cnutrit: 250 }],
    ['NEWT', { cwt: 10, cnutrit: 20 }],
    ['GNOME', { cwt: 650, cnutrit: 100 }],
]);

// These ids come from the generated object table used by mklev.js.
const AMULET_OF_YENDOR = 213;
const FIRST_SPELL = 366;
const LAST_SPELL = 407;
const SPE_NOVEL = 408;
const SPE_BOOK_OF_THE_DEAD = 409;

function monsterDataByName(monsterName, fallback) {
    const row = MONSTER_DATA.find(([name]) => name === monsterName);
    if (!row) return { ...fallback };
    const [
        name, mlet, mlevel, mmove, maligntyp, geno, difficulty, color,
        neuter, male, female, msound = 0, mresists = 0, mconveys = 0,
        mflags1 = 0, mflags2 = 0, mflags3 = 0, mattk = [], msize = 2,
        ac = 10,
    ] = row;
    return {
        ...fallback,
        name, mlet, mlevel, mmove, maligntyp, geno, difficulty, color,
        neuter, male, female, msound, mresists, mconveys, mflags1, mflags2,
        mflags3, mattk, msize, ac,
    };
}

// C ref: include/monsters.h; starting pets need full monster flags so later
// dogmove/mon.c predicates such as nohands() see the same data as C.
const PM_LITTLE_DOG = monsterDataByName('LITTLE_DOG', {
    name: 'LITTLE_DOG',
    mlet: 'S_DOG',
    mlevel: 2,
    difficulty: 3,
    maligntyp: 0,
    geno: 0x0080 | 1,
    mmove: 18,
});

const PM_KITTEN = monsterDataByName('KITTEN', {
    name: 'KITTEN',
    mlet: 'S_FELINE',
    mlevel: 2,
    difficulty: 3,
    maligntyp: 0,
    geno: 0x0080 | 1,
    mmove: 18,
    m2_wander: true,
});

const PM_PONY = monsterDataByName('PONY', {
    name: 'PONY',
    mlet: 'S_UNICORN',
    mlevel: 3,
    difficulty: 4,
    maligntyp: 0,
    geno: 0x0080 | 1,
    mmove: 16,
    m2_wander: true,
});

function configuredPetType() {
    switch (game.preferred_pet) {
    case 'n': return null;
    case 'c': return PM_KITTEN;
    case 'd': return PM_LITTLE_DOG;
    case 'h': return PM_PONY;
    default: break;
    }

    switch (game.urole?.name?.m) {
    case 'Caveman':
    case 'Ranger':
    case 'Samurai':
        return PM_LITTLE_DOG;
    case 'Knight':
        return PM_PONY;
    case 'Wizard':
        return PM_KITTEN;
    default:
        // C's default is rn2(2) ? kitten : little dog.
        return undefined;
    }
}

function configuredPetName(pet) {
    const opts = game._nhopts || {};
    if (pet === PM_LITTLE_DOG && opts.dogname) return opts.dogname;
    if (pet === PM_KITTEN && opts.catname) return opts.catname;
    if (pet === PM_PONY && opts.horsename) return opts.horsename;

    // C ref: src/dog.c:makedog().  If no dogname option was supplied, a few
    // role-default little dogs are christened as the starting pet.
    if (pet === PM_LITTLE_DOG) {
        switch (game.urole?.name?.m) {
        case 'Barbarian': return 'Idefix';
        case 'Caveman': return 'Slasher';
        case 'Ranger': return 'Sirius';
        case 'Samurai': return 'Hachi';
        default: break;
        }
    }
    return '';
}

export async function makedog() {
    let pet = configuredPetType();
    if (pet === null) return null;
    if (pet === undefined) {
        pet = rn2(2) ? PM_KITTEN : PM_LITTLE_DOG;
    }
    const mon = await makemon(pet, game.u.ux, game.u.uy, MM_EDOG | NO_MINVENT);
    if (mon) {
        game.pet_type = pet;
        mon.mtame = Math.max(10, mon.mtame || 0);
        mon.mpeaceful = 1;
        // C ref: src/dog.c:initedog().  Taming changes the later xkilled()
        // alignment adjustment; keep it in sync with the peaceful state.
        set_malign_basic(mon);
        const petname = configuredPetName(pet);
        if (petname && !game._petname_used) {
            mon.mgivenname = petname;
            game._petname_used = true;
        }
        if (pet === PM_PONY) put_starting_saddle_on_pony(mon);
        init_edog(mon);
        // C ref: src/dog.c:initedog().  Starting pets still count for the
        // petless conduct; only the livelog message is moveloop-gated.
        if (game.u) {
            const conduct = game.u.uconduct || (game.u.uconduct = {});
            conduct.pets = (conduct.pets || 0) + 1;
        }
    }
    return mon;
}

function put_starting_saddle_on_pony(mon) {
    // C refs: src/dog.c:makedog(), src/steed.c:put_saddle_on_mon().
    const saddle = mksobj(SADDLE, true, false);
    if (!saddle) return;
    saddle.known = true;
    saddle.knownName = true;
    saddle.dknown = true;
    saddle.bknown = true;
    saddle.rknown = true;
    saddle.owornmask = W_SADDLE;
    saddle.leashmon = mon.m_id;
    mon.inventory = mon.inventory || [];
    mon.inventory.unshift(saddle);
    mon.misc_worn_check = (mon.misc_worn_check || 0) | W_SADDLE;
}

function hero_charisma() {
    const cha = game.u?.acurr?.a?.[5] ?? 0;
    if (cha <= 3) return 3;
    if (cha >= 25) return 25;
    return cha;
}

function init_edog(mon) {
    if (!mon.edog) {
        mon.edog = {
            apport: hero_charisma(),
            hungrytime: 1000,
            mhpmax_penalty: 0,
            whistletime: 0,
            ogoal: { x: 0, y: 0 },
        };
    } else if (!mon.edog.apport || mon.edog.apport <= 0) {
        mon.edog.apport = hero_charisma();
    }
    return mon.edog;
}

function clone_mon_inventory(inventory) {
    return inventory ? inventory.map((obj) => ({ ...obj })) : inventory;
}

function migrated_wielded_object(migrating, inventory) {
    if (!migrating?.mw || !inventory?.length) return migrating?.mw ? { ...migrating.mw } : migrating?.mw;
    if (migrating.mw.o_id != null) {
        const byId = inventory.find((obj) => obj?.o_id === migrating.mw.o_id);
        if (byId) return byId;
    }
    return inventory.find((obj) => ((obj?.owornmask || 0) & W_WEP)
        && obj.otyp === migrating.mw.otyp) || { ...migrating.mw };
}

function arrive_with_hero(migrating) {
    game._migrating_pet = null;
    if (!migrating) return null;
    let pet = migrating.data;
    if (!pet) return null;
    if (migrating.mtame) game.pet_type = pet;

    const exact = !rn2(migrating.mtame ? 10 : migrating.mpeaceful ? 5 : 2);
    let x = game.u.ux;
    let y = game.u.uy;
    if (!exact) {
        const flags = GP_CHECKSCARY | GP_AVOID_MONPOS;
        const cc = enexto_core(game.u.ux, game.u.uy, pet, flags)
            || enexto_core(game.u.ux, game.u.uy, pet, flags & ~GP_CHECKSCARY);
        if (!cc) return null;
        x = cc.x;
        y = cc.y;
    }

    const ch = pet === PM_KITTEN ? 'f' : pet === PM_PONY ? 'u' : 'd';
    const inventory = clone_mon_inventory(migrating?.inventory);
    const mon = {
        ...migrating,
        mx: x, my: y,
        // C ref: dog.c:mon_arrive().  Arriving pets refresh their apparent
        // hero target so relocation helpers do not use stale migration data.
        mux: game.u?.ux ?? 0, muy: game.u?.uy ?? 0,
        ch: migrating?.ch || ch,
        color: migrating?.color ?? 15,
        data: { ...pet },
        m_lev: migrating?.m_lev ?? pet.mlevel ?? 0,
        mhp: migrating?.mhp ?? 1,
        mhpmax: migrating?.mhpmax ?? migrating?.mhp ?? 1,
        female: migrating?.female ?? false,
        msleeping: migrating?.msleeping ?? 0,
        mpeaceful: migrating?.mpeaceful ?? 1,
        mtame: migrating?.mtame ?? 10,
        movement: migrating?.movement ?? 0,
        inventory,
        misc_worn_check: migrating?.misc_worn_check || 0,
    };
    mon.mw = migrated_wielded_object(migrating, inventory);
    for (const obj of mon.inventory || []) {
        if (obj?.otyp === SADDLE && ((obj.owornmask || 0) & W_SADDLE)) {
            obj.leashmon = mon.m_id;
        }
    }
    if (migrating?.edog) mon.edog = { ...migrating.edog };
    init_edog(mon);
    if (game.level?.monsters) game.level.monsters.unshift(mon);
    if (mon.mx === game.u?.ux && mon.my === game.u?.uy) {
        if (!rn2(2)) {
            const cc = enexto_core(game.u.ux, game.u.uy, null, GP_CHECKSCARY)
                || enexto_core(game.u.ux, game.u.uy, null, 0);
            if (cc && Math.max(Math.abs(cc.x - game.u.ux), Math.abs(cc.y - game.u.uy)) <= 1) {
                game.u.ux = cc.x;
                game.u.uy = cc.y;
            } else {
                const mc = enexto_core(mon.mx, mon.my, pet, GP_CHECKSCARY)
                    || enexto_core(mon.mx, mon.my, pet, 0);
                if (mc) {
                    mon.mx = mc.x;
                    mon.my = mc.y;
                }
            }
        } else {
            const mc = enexto_core(mon.mx, mon.my, pet, GP_CHECKSCARY)
                || enexto_core(mon.mx, mon.my, pet, 0);
            if (mc) {
                mon.mx = mc.x;
                mon.my = mc.y;
            }
        }
    }
    return mon;
}

export function pet_arrive_with_you() {
    const followers = game._migrating_followers
        || (game._migrating_pet ? [game._migrating_pet] : []);
    game._migrating_followers = null;
    game._migrating_pet = null;
    let first = null;
    for (const migrating of followers) {
        const arrived = arrive_with_hero(migrating);
        if (!first) first = arrived;
    }
    return first;
}

function dist2(x0, y0, x1, y1) {
    const dx = x0 - x1;
    const dy = y0 - y1;
    return dx * dx + dy * dy;
}

function distmin(x0, y0, x1, y1) {
    return Math.max(Math.abs(x0 - x1), Math.abs(y0 - y1));
}

function sgn(value) {
    return value < 0 ? -1 : value > 0 ? 1 : 0;
}

function mon_at(x, y, self) {
    return game.level?.monsters?.find((mon) =>
        mon !== self && mon !== game.u?.usteed && mon.mx === x && mon.my === y);
}

function object_class(otyp) {
    return OBJECT_CLASS[otyp] || 0;
}

function objects_at(x, y) {
    return (game.level?.objects || []).filter((obj) => obj.ox === x && obj.oy === y);
}

function mon_track_add(mtmp, x, y) {
    if (!mtmp.mtrack) mtmp.mtrack = [];
    mtmp.mtrack.unshift({ x, y });
    if (mtmp.mtrack.length > MTSZ) mtmp.mtrack.length = MTSZ;
}

function cursed_object_at(x, y) {
    return objects_at(x, y).some((obj) => obj.cursed);
}

function trap_at(x, y) {
    return (game.level?.traps || []).find((trap) => trap.tx === x && trap.ty === y) || null;
}

function is_boulder_at(x, y) {
    return objects_at(x, y).some((obj) => obj.otyp === BOULDER);
}

function is_sokoban_level() {
    const dungeon = game.dungeons?.[game.u?.uz?.dnum ?? 0];
    return !!game.level?.flags?.sokoban_rules || dungeon?.dname === 'Sokoban';
}

function avoid_soko_push_loc(mtmp, nx, ny) {
    if (!is_sokoban_level()) return false;
    if (!(mtmp.mpeaceful || mtmp.mtame)) return false;
    if (mtmp.mconf || mtmp.mstun || game.u?.conflict) return false;
    const ux = game.u?.ux ?? nx;
    const uy = game.u?.uy ?? ny;
    if (dist2(nx, ny, ux, uy) !== 4) return false;
    return is_boulder_at(nx + sgn(ux - nx), ny + sgn(uy - ny));
}

export function obj_resists(obj, ochance, achance) {
    if (obj.otyp === AMULET_OF_YENDOR
        || obj.otyp === SPE_BOOK_OF_THE_DEAD
        || obj.otyp === CANDELABRUM_OF_INVOCATION
        || obj.otyp === BELL_OF_OPENING
        || (obj.otyp === CORPSE && obj.corpsenm?.is_rider)) {
        return true;
    }
    const chance = rn2(100);
    return chance < (obj.oartifact ? achance : ochance);
}

function pet_diet(mtmp) {
    if (mtmp.data?.mlet === 'S_UNICORN') return { carni: false, herbi: true };
    return { carni: true, herbi: false };
}

function vegan_monster(ptr) {
    // C ref: include/mondata.h:vegan().
    if (!ptr) return false;
    const mlet = ptr.mlet;
    if (['S_BLOB', 'S_JELLY', 'S_FUNGUS', 'S_VORTEX', 'S_LIGHT'].includes(mlet)) return true;
    if (mlet === 'S_ELEMENTAL' && ptr.name !== 'STALKER') return true;
    if (mlet === 'S_GOLEM' && ptr.name !== 'FLESH_GOLEM' && ptr.name !== 'LEATHER_GOLEM') return true;
    return false;
}

function dogfood(mtmp, obj) {
    // C ref: dog.c:dogfood().  The object-resistance check is deliberately
    // first; it is a common hidden RNG consumer before pet goal selection.
    if (obj_resists(obj, 0, 95)) return obj.cursed ? TABU : APPORT;
    if (object_class(obj.otyp) === FOOD_CLASS) {
        const { carni, herbi } = pet_diet(mtmp);
        switch (obj.otyp) {
        case TRIPE_RATION:
        case MEATBALL:
        case MEAT_STICK:
        case ENORMOUS_MEATBALL:
            return carni ? DOGFOOD : MANFOOD;
        case CORPSE:
            if (obj.trap_victim) return MANFOOD;
            if (vegan_monster(monsterPtr(obj.corpsenm))) return herbi ? CADAVER : MANFOOD;
            return carni ? CADAVER : MANFOOD;
        case EGG:
            return carni ? CADAVER : MANFOOD;
        case GLOB_OF_GREEN_SLIME:
            return MANFOOD;
        case CLOVE_OF_GARLIC:
            return herbi ? ACCFOOD : MANFOOD;
        case TIN:
            return MANFOOD;
        case APPLE:
            return herbi ? DOGFOOD : MANFOOD;
        case BANANA:
            return herbi ? ACCFOOD : MANFOOD;
        case CARROT:
            return herbi ? DOGFOOD : MANFOOD;
        default:
            if (obj.otyp > SLIME_MOLD) return carni ? ACCFOOD : MANFOOD;
            return herbi ? ACCFOOD : MANFOOD;
        }
    }
    if (object_class(obj.otyp) === ROCK_CLASS) return UNDEF;
    return obj.cursed ? UNDEF : APPORT;
}

function dog_nofetch(obj) {
    const oclass = object_class(obj?.otyp);
    // C ref: src/dogmove.c:nofetch.  dog_invent() skips these classes
    // before calling dogfood(); dog_goal() still scans them normally.
    return oclass === BALL_CLASS || oclass === CHAIN_CLASS || oclass === ROCK_CLASS;
}

function could_reach_item(mtmp, x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    if (IS_POOL(loc.typ) && !mtmp.data?.swimmer) return false;
    if (IS_LAVA(loc.typ) && !mtmp.data?.likes_lava) return false;
    if (is_boulder_at(x, y) && !mtmp.data?.throws_rocks) return false;
    return true;
}

function can_reach_location(mtmp, mx, my, fx, fy, depth = 0) {
    if (mx === fx && my === fy) return true;
    if (!isok(mx, my) || depth > 6) return false;

    const curdist = dist2(mx, my, fx, fy);
    for (let x = mx - 1; x <= mx + 1; x++) {
        for (let y = my - 1; y <= my + 1; y++) {
            if (!isok(x, y)) continue;
            if (dist2(x, y, fx, fy) >= curdist) continue;
            const loc = game.level?.at(x, y);
            if (!loc) continue;
            if (IS_OBSTRUCTED(loc.typ)) continue;
            if (IS_DOOR(loc.typ) && (loc.doormask & (D_CLOSED | D_LOCKED))) continue;
            if (!could_reach_item(mtmp, x, y)) continue;
            if (can_reach_location(mtmp, x, y, fx, fy, depth + 1)) return true;
        }
    }
    return false;
}

function can_carry(mtmp, obj) {
    if (mtmp === game.u?.usteed) return 0;
    if (obj.cursed) return 0;
    if (obj.otyp === CORPSE && obj.trap_victim) return 0;
    if (object_class(obj.otyp) === ROCK_CLASS && obj.otyp === BOULDER && !mtmp.data?.throws_rocks) return 0;
    const iquan = Math.max(1, obj.quan || 1);
    if (iquan > 1 && ((mtmp.data?.mflags1 ?? 0) & M1_NOHANDS) && !monster_can_glomp_stack(mtmp, obj)) return 1;
    if (current_mon_load(mtmp) + object_weight(obj) > max_mon_load(mtmp)) return 0;
    return iquan;
}

function monster_can_glomp_stack(mtmp, obj) {
    const oclass = obj.oclass ?? object_class(obj.otyp);
    if (mtmp.data?.mlet === 'S_DRAGON' && (oclass === COIN_CLASS || oclass === GEM_CLASS)) return true;
    return (mtmp.data?.mattk || []).some((attack) => attack?.[0] === 'AT_ENGL');
}

function split_floor_object(obj, count) {
    const quan = Math.max(1, obj?.quan || 1);
    if (!obj || count >= quan) return obj;
    const oldWeight = obj.owt;
    obj.quan = quan - count;
    if (typeof oldWeight === 'number') {
        obj.owt = Math.max(1, Math.round(oldWeight * obj.quan / quan));
    }
    return {
        ...obj,
        quan: count,
        o_id: next_ident(),
        owornmask: 0,
        owt: typeof oldWeight === 'number' ? Math.max(1, oldWeight - (obj.owt || 0)) : obj.owt,
    };
}

function pet_droppable(mtmp) {
    // C ref: src/dogmove.c:droppables().  Worn monster equipment, including
    // a starting pony's saddle, is not ordinary carried inventory.
    return (mtmp.inventory || []).find((obj) => obj && !obj.owornmask && obj !== mtmp.mw) || null;
}

function object_weight(obj) {
    if (!obj) return 0;
    if (typeof obj.owt === 'number' && obj.owt > 1) return obj.owt;
    return OBJECT_WEIGHT_OVERRIDES.get(obj.otyp) || obj.owt || 1;
}

function corpseStats(obj) {
    const key = corpse_species_name(obj?.corpsenm).toUpperCase().replace(/[\s-]+/g, '_');
    return {
        cwt: obj?.corpse_cwt ?? CORPSE_STATS.get(key)?.cwt ?? 0,
        cnutrit: obj?.corpse_cnutrit ?? CORPSE_STATS.get(key)?.cnutrit ?? 0,
    };
}

function foodNutrition(obj) {
    if (!obj) return 0;
    if (obj.otyp === CORPSE) return corpseStats(obj).cnutrit;
    if (obj.otyp === FOOD_RATION) return 800;
    if (obj.otyp === TRIPE_RATION) return 200;
    if (obj.otyp === MEATBALL) return 5;
    if (obj.otyp === MEAT_STICK) return 5;
    if (obj.otyp === ENORMOUS_MEATBALL) return 2000;
    if (obj.otyp === EGG) return 80;
    if (obj.otyp === BANANA) return 80;
    if (obj.otyp === CARROT) return 50;
    if (obj.otyp === CLOVE_OF_GARLIC) return 40;
    return 0;
}

function petNutritionScale(mtmp) {
    switch (mtmp?.data?.msize) {
    case 0: return 8; // MZ_TINY
    case 1: return 6; // MZ_SMALL
    case 3: return 4; // MZ_LARGE
    case 4: return 3; // MZ_HUGE
    case 7: return 2; // MZ_GIGANTIC
    default: return 5; // MZ_MEDIUM and unknown
    }
}

function dog_nutrition(mtmp, obj) {
    const oclass = object_class(obj?.otyp);
    if (oclass === FOOD_CLASS) {
        if (obj.otyp === CORPSE) {
            const stats = corpseStats(obj);
            mtmp.meating = 3 + (stats.cwt >> 6);
        } else {
            mtmp.meating = OBJECT_DELAY[obj.otyp] || 0;
        }
        return foodNutrition(obj) * petNutritionScale(mtmp);
    }
    if (oclass === COIN_CLASS) {
        mtmp.meating = Math.max(1, Math.trunc((obj?.quan || 1) / 2000) + 1);
        return Math.max(0, Math.trunc((obj?.quan || 0) / 20));
    }
    mtmp.meating = Math.trunc(object_weight(obj) / 20) + 1;
    return 0;
}

function remove_level_object(obj) {
    const idx = game.level?.objects?.indexOf(obj) ?? -1;
    if (idx >= 0) game.level.objects.splice(idx, 1);
}

function current_mon_load(mtmp) {
    return (mtmp.inventory || []).reduce((sum, obj) => sum + object_weight(obj), 0);
}

function max_mon_load(mtmp) {
    // C ref: mon.c:max_mon_load().  Monster cwt/msize are not generated
    // yet; keep known small domestic pet capacity conservative so heavy
    // tools are rejected by can_carry().
    const name = mtmp.data?.name;
    if (name === 'KITTEN' || name === 'LITTLE_DOG') return 50;
    return ((mtmp.data?.mflags2 ?? 0) & M2_STRONG) ? 1000 : 500;
}

function object_name(obj) {
    if (obj?.otyp === GOLD_PIECE) {
        const quan = obj.quan || 1;
        return quan === 1 ? 'a gold piece' : `${quan} gold pieces`;
    }
    const oclass = obj?.oclass ?? OBJECT_CLASS[obj?.otyp];
    if (oclass === SCROLL_CLASS && !obj?.knownName) {
        // C ref: objnam.c:xname().  Undiscovered scrolls are named by their
        // shuffled label, with the unlabeled special case before articles.
        const desc = obj?.appearanceName || getObjectDescription(obj.otyp);
        if (desc === 'unlabeled') return 'an unlabeled scroll';
        if (desc) return `a scroll labeled ${desc}`;
    }
    if (oclass === SPBOOK_CLASS && !obj?.knownName) {
        // C ref: src/objnam.c:xname().  Descriptor-known spellbooks use their
        // shuffled cover adjective even when the spell itself is unknown.
        const generic = obj?.otyp === SPE_NOVEL ? 'book' : 'spellbook';
        if (obj?.dknown === false) return `${indefinite_article(generic)} ${generic}`;
        const desc = obj?.appearanceName || getObjectDescription(obj.otyp);
        if (desc && (obj.otyp === SPE_NOVEL
            || obj.otyp === SPE_BOOK_OF_THE_DEAD
            || (obj.otyp >= FIRST_SPELL && obj.otyp <= LAST_SPELL))) {
            const name = `${desc} ${generic}`;
            return `${indefinite_article(name)} ${name}`;
        }
        return `${indefinite_article(generic)} ${generic}`;
    }
    if (obj?.otyp === DART) return 'a dart';
    if (obj?.otyp === JAVELIN) return 'a throwing spear';
    if (obj?.otyp === ORCISH_DAGGER) return 'a crude dagger';
    if (obj?.otyp === OIL_LAMP || obj?.otyp === MAGIC_LAMP) return 'a lamp';
    if (obj?.otyp === FOOD_RATION) return 'a food ration';
    if (oclass === AMULET_CLASS && !obj?.knownName) {
        const desc = obj?.appearanceName || getObjectDescription(obj.otyp);
        if (desc) return `a ${desc} amulet`;
    }
    if (oclass === WAND_CLASS && !obj?.knownName) {
        // C ref: dogmove.c:dog_move() -> objnam.c:distant_name(..., doname).
        // Undiscovered wands use the shuffled appearance descriptor.
        const desc = obj?.appearanceName || getObjectDescription(obj.otyp);
        if (desc) {
            const name = `${desc} wand`;
            return `${indefinite_article(name)} ${name}`;
        }
        return 'a wand';
    }
    if (obj?.otyp === CORPSE) {
        const species = corpse_species_name(obj.corpsenm);
        return `${indefinite_article(species)} ${species} corpse`;
    }
    if (obj?.otyp === QUARTERSTAFF) {
        const buc = obj.blessed ? 'blessed ' : obj.cursed ? 'cursed ' : 'uncursed ';
        const spe = typeof obj.spe === 'number' ? `${obj.spe >= 0 ? '+' : ''}${obj.spe} ` : '';
        return `a ${buc}${spe}quarterstaff`;
    }
    return 'an object';
}

function corpse_species_name(corpsenm) {
    if (Number.isInteger(corpsenm)) {
        return String(MONSTER_DATA[corpsenm]?.[0] || 'monster').toLowerCase().replace(/_/g, ' ');
    }
    if (typeof corpsenm === 'string') return corpsenm.toLowerCase().replace(/_/g, ' ');
    if (corpsenm?.name) return String(corpsenm.name).toLowerCase().replace(/_/g, ' ');
    return 'monster';
}

function indefinite_article(name) {
    return /^[aeiou]/i.test(String(name || '')) ? 'an' : 'a';
}

function mark_object_encountered(obj) {
    if (!Number.isInteger(obj?.otyp)) return;
    const order = Array.isArray(game.discoveryOrder)
        ? game.discoveryOrder
        : (game.discoveryOrder = []);
    if (!order.includes(obj.otyp)) order.push(obj.otyp);
    const encountered = game.encounteredObjects || (game.encounteredObjects = new Set());
    if (typeof encountered.add === 'function') encountered.add(obj.otyp);
}

function monster_name(mon) {
    return String(mon?.data?.name || 'monster').toLowerCase().replace(/_/g, ' ');
}

function pet_kill_verb(mon) {
    // C ref: src/mon.c:monkilled(). Nonliving monsters are destroyed.
    const ptr = mon?.data;
    if ((ptr?.mflags2 ?? 0) & M2_UNDEAD) return 'destroyed';
    if (ptr?.name === 'MANES' || ptr?.mlet === 'S_GOLEM' || ptr?.mlet === 'S_VORTEX')
        return 'destroyed';
    return 'killed';
}

function pet_kill_line(mon) {
    return `The ${monster_name(mon)} is ${pet_kill_verb(mon)}!`;
}

function monster_has_weapon_attack(mon) {
    return (mon?.data?.mattk || []).some((attack) => attack?.[0] === 'AT_WEAP');
}

function monster_weapon_candidate(mon) {
    return (mon?.inventory || []).find((obj) => OBJECT_CLASS[obj?.otyp] === WEAPON_CLASS);
}

function monster_weapon_name(obj) {
    if (obj?.otyp === ORCISH_DAGGER) return 'a crude dagger';
    return object_name(obj);
}

function monster_wield_for_pet_counter(mon) {
    if (!monster_has_weapon_attack(mon) || mon?.mw) return null;
    const obj = monster_weapon_candidate(mon);
    if (!obj) return null;
    mon.mw = obj;
    obj.owornmask = (obj.owornmask || 0) | W_WEP;
    mon.weapon_check = 1; // NEED_WEAPON
    return obj;
}

const MONSTER_AC = new Map([
    ['kitten', 6],
    ['fox', 7],
    ['sewer rat', 7],
    ['giant bat', 7],
]);

function monster_ac(mon) {
    const name = monster_name(mon);
    return mon?.mac ?? mon?.ac ?? mon?.data?.ac ?? MONSTER_AC.get(name) ?? 10;
}

function mattackm_hits(magr, mdef, dieroll) {
    const level = magr?.m_lev ?? magr?.data?.mlevel ?? 0;
    return monster_ac(mdef) + level > dieroll;
}

function pet_name(mtmp) {
    return saddled_monster_name(mtmp);
}

function sees_saddle_adjective(mon) {
    // C ref: src/do_name.c:x_monnam().
    return !!((mon?.misc_worn_check || 0) & W_SADDLE)
        && !(game.u?.ublind || game.u?.uprops?.blind)
        && !(game.u?.uhallucination || game.u?.uprops?.hallucination);
}

function saddled_monster_name(mon) {
    const name = String(mon?.data?.name || 'pet').toLowerCase().replace(/_/g, ' ');
    return `${sees_saddle_adjective(mon) ? 'saddled ' : ''}${name}`;
}

function pet_subject(mtmp) {
    if (has_mgivenname(mtmp)) return MGIVENNAME(mtmp);
    return `The ${pet_name(mtmp)}`;
}

function monster_spotted_for_combat(mon) {
    // C ref: src/mhitm.c:mattackm() via cansee()+canspotmon().
    if (!mon || !cansee(mon.mx, mon.my)) return false;
    if (mon.mundetected || mon._opened_unseen_door) return false;
    if (mon.minvis && !(game.u?.usee_invisible || game.u?.uprops?.see_invisible)) return false;
    return true;
}

function monster_combat_visible(magr, mdef) {
    // C ref: src/mhitm.c:mattackm().
    return monster_spotted_for_combat(magr) || monster_spotted_for_combat(mdef);
}

function monster_combat_subject(mon) {
    if (!monster_spotted_for_combat(mon)) return 'It';
    if (has_mgivenname(mon)) return MGIVENNAME(mon);
    return `The ${saddled_monster_name(mon)}`;
}

function monster_combat_object(mon) {
    if (!monster_spotted_for_combat(mon)) return 'it';
    if (has_mgivenname(mon)) return MGIVENNAME(mon);
    return `the ${saddled_monster_name(mon)}`;
}

async function monster_combat_noises(magr, attack = null) {
    // C ref: src/mhitm.c:noises().
    if (game.u?.uprops?.deaf) return;
    const far = dist2(magr.mx, magr.my, game.u?.ux ?? magr.mx, game.u?.uy ?? magr.my) > 15;
    const moves = game.moves || 0;
    const lastFar = !!game._far_noise;
    const lastTime = game._noise_time ?? 0;
    if (far === lastFar && moves - lastTime <= 10) return;
    game._far_noise = far;
    game._noise_time = moves;
    const what = attack?.[0] === 'AT_EXPL' ? 'an explosion' : 'some noises';
    await append_topline_message(`You hear ${what}${far ? ' in the distance' : ''}.`);
}

async function monster_combat_message(magr, mdef, phrase, attack = null) {
    if (!monster_combat_visible(magr, mdef)) {
        await monster_combat_noises(magr, attack);
        return false;
    }
    await append_topline_message(`${monster_combat_subject(magr)} ${phrase(monster_combat_object(mdef))}`);
    return true;
}

function map_invisible_basic(x, y) {
    // C ref: src/display.c:map_invisible().
    if (x === game.u?.ux && y === game.u?.uy) return;
    const loc = game.level?.at(x, y);
    if (loc) loc.remembered_glyph = { ch: 'I', color: NO_COLOR, decgfx: false };
    show_glyph_cell(x, y, 'I', NO_COLOR, false);
}

function pet_noit_subject(mtmp) {
    if (has_mgivenname(mtmp)) return MGIVENNAME(mtmp);
    return mtmp?.mtame ? `Your ${pet_name(mtmp)}` : `The ${pet_name(mtmp)}`;
}

async function pet_reluctance_pline(line) {
    if (game._more && game._pending_message) {
        game._after_more_message = game._after_more_message
            ? `${game._after_more_message}  ${line}`
            : line;
        game._after_more_needs_prompt = true;
        return;
    }
    if (game._pending_message) {
        game._pending_message = `${game._pending_message}  ${line}`;
        queue_more_prompt();
        return;
    }
    await pline(line);
    queue_more_prompt();
}

function pet_inventory_pline(line) {
    // C tty keeps the post-move floor-look line at the next prompt even when
    // a visible pet inventory drop happens during the following monster turn.
    if (typeof game._pending_message === 'string'
        && (game._pending_message.startsWith('You see here ')
            || game._pending_message.startsWith('Blecch!  Rotten food!'))) return;
    if (game._pending_message === line) return;
    if (game._more && game._pending_message) {
        game._after_more_message = game._after_more_message
            ? `${game._after_more_message}  ${line}`
            : line;
        game._after_more_needs_prompt = false;
        return;
    }
    if (game._pending_message) {
        const packed = `${game._pending_message}  ${line}`;
        if (!topline_can_pack_message(game._pending_message, line)) {
            queue_more_prompt();
            game._pet_inventory_more_latched = true;
            game._after_more_message = line;
            game._after_more_needs_prompt = false;
            if (game._more) return;
        }
        game._pending_message = packed;
    } else {
        pline(line);
    }
}

async function dog_eat(mtmp, obj, startX, startY, devour = false) {
    const edog = init_edog(mtmp);
    if ((edog.hungrytime || 0) < (game.moves || 0)) edog.hungrytime = game.moves || 0;
    let nutrit = dog_nutrition(mtmp, obj);
    if (devour) {
        if ((mtmp.meating || 0) > 1) mtmp.meating = Math.trunc(mtmp.meating / 2);
        if (nutrit > 1) nutrit = Math.trunc((nutrit * 3) / 4);
    }
    edog.hungrytime = (edog.hungrytime || 0) + nutrit;
    mtmp.mconf = 0;
    if (edog.mhpmax_penalty) {
        mtmp.mhpmax = (mtmp.mhpmax || 0) + edog.mhpmax_penalty;
        edog.mhpmax_penalty = 0;
    }
    if (mtmp.mflee && (mtmp.mfleetim || 0) > 1) mtmp.mfleetim = Math.trunc(mtmp.mfleetim / 2);
    if ((mtmp.mtame || 0) < 20) mtmp.mtame = (mtmp.mtame || 0) + 1;
    if (startX !== mtmp.mx || startY !== mtmp.my) {
        newsym(startX, startY);
        newsym(mtmp.mx, mtmp.my);
    }

    if (cansee(mtmp.mx, mtmp.my) || (cansee(startX, startY) && cansee(mtmp.mx, mtmp.my))) {
        if (cansee(mtmp.mx, mtmp.my)) await latch_more_frame_before_pet_inventory();
        // C ref: dogmove.c:dog_eat() calls distant_name(obj, doname) before
        // consuming.  The JS name path is side-effect free, so the later
        // delobj_core() resistance probe below is the relevant RNG consumer.
        pet_inventory_pline(`${pet_noit_subject(mtmp)} ${devour ? 'devours' : 'eats'} ${object_name(obj)}.`);
    }

    const eatenFoodType = dogfood(mtmp, obj);
    if (eatenFoodType === DOGFOOD && obj?.invlet) {
        const denom = Math.max(1, (edog.dropdist || 0) + (game.moves || 0) - (edog.droptime || 0));
        edog.apport = Math.max(1, (edog.apport || 1) + Math.trunc(200 / denom));
    }

    const consumed = object_class(obj?.otyp) === FOOD_CLASS && (obj?.quan || 1) > 1
        ? split_floor_object(obj, 1)
        : obj;
    if (!obj_resists(consumed, 0, 0)) {
        if (consumed === obj) remove_level_object(obj);
    }
    newsym(mtmp.mx, mtmp.my);
    return 1;
}

async function latch_more_frame_before_pet_inventory() {
    if (!game._more || !game._pending_message || game._latched_more_screen) return;
    await flush_screen(1);
    game._latched_more_screen = serialize_terminal_grid(game.nhDisplay);
    game._latched_more_cursor = [
        Math.min(`${game._pending_message}--More--`.length, COLNO - 1),
        0,
        1,
    ];
    game._latched_more_keep_until_dismiss = true;
}

function monster_article_name(mon) {
    return `the ${saddled_monster_name(mon)}`;
}

function hallucinating() {
    return !!(game.u?.uhallucination || game.u?.uprops?.hallucination);
}

function occupation_message_boundary_active() {
    return (game._occupation_turns_remaining || 0) > 0
        || !!game._occupation_finish_message
        || !!game._force_lock
        || (game._force_lock_post_success_turns || 0) > 0;
}

function pending_pet_combat_boundary() {
    return game._pet_combat_pending_boundary
        || /^You (?:miss|hit) .+  The (?:kitten|little dog|(?:saddled )?pony) .+\.$/.test(game._pending_message || '');
}

async function append_topline_message(line) {
    if (game._pending_message?.startsWith('You start putting on ')) game._pending_message = '';
    if (game._pending_message) {
        if (game._more && !hallucinating()) {
            if (topline_can_pack_message(game._pending_message, line)) {
                game._pending_message = `${game._pending_message}  ${line}`;
                game._last_topline_message = game._pending_message;
                game._pet_miss_prompt_after_resume = false;
            } else {
                const packed = game._after_more_message
                    ? `${game._after_more_message}  ${line}`
                    : line;
                game._after_more_message = packed;
                game._after_more_needs_prompt = !!game._after_more_needs_prompt
                    || packed.length >= (game.nhDisplay?.cols || COLNO);
                game._pet_combat_more_latched = true;
            }
            return;
        }
        if (/^The .+ thrusts .+\.  The .+ (?:hits|misses|just misses)!$/.test(game._pending_message)) {
            queue_more_prompt();
            game._after_more_message = game._after_more_message
                ? `${game._after_more_message}  ${line}`
                : line;
            game._after_more_needs_prompt = false;
            game._pet_combat_more_latched = true;
            return;
        }
        if (pending_pet_combat_boundary()) {
            game._pet_combat_pending_boundary = false;
            queue_more_prompt();
            game._after_more_message = game._after_more_message
                ? `${game._after_more_message}  ${line}`
                : line;
            game._after_more_needs_prompt = false;
            game._pet_combat_more_latched = true;
            return;
        }
        const pending = game._pending_message;
        const packed = `${pending}  ${line}`;
        const cols = game.nhDisplay?.cols || COLNO;
        const heroMeleePack = /^You (?:miss|hit) /.test(pending) && packed.length < cols;
        const savelifePack = pending === "OK, so you don't die."
            && /^The (?:kitten|little dog|(?:saddled )?pony) /.test(line)
            && topline_can_pack_message(pending, line);
        if (heroMeleePack) {
            game._pending_message = packed;
            game._pet_combat_pending_boundary = true;
            game._pet_miss_prompt_after_resume = false;
        } else if (savelifePack) {
            // C refs: src/end.c:savelife(), src/mhitm.c:mattackm(),
            // win/tty/topl.c:update_topl().  A resumed pet-combat line can
            // pack behind "OK, so you don't die." but still blocks before
            // gn.nomovemsg is printed.
            game._pending_message = packed;
            game._pet_combat_pending_boundary = false;
            queue_more_prompt();
            game._pet_combat_more_latched = true;
            game._pet_miss_prompt_after_resume = false;
        } else if (topline_can_pack_message(pending, line)) {
            game._pending_message = packed;
            game._pet_combat_pending_boundary = false;
            game._pet_miss_prompt_after_resume = false;
        } else {
            queue_more_prompt();
            game._after_more_message = game._after_more_message
                ? `${game._after_more_message}  ${line}`
                : line;
            game._after_more_needs_prompt = false;
            game._pet_combat_more_latched = true;
            game._pet_miss_prompt_after_resume = false;
        }
        if (occupation_message_boundary_active()) {
            // C ref: tty topline handling via pline()/--More--.  A second
            // visible pet-combat pline can block inside the monster turn,
            // before mdamagem()/mondead() apply visible death side effects.
            queue_more_prompt();
            game._pet_combat_more_latched = true;
            game._occupation_paused_for_more = true;
        }
    } else {
        await pline(line);
    }
}

async function pet_combat_message(mtmp, text) {
    // C ref: mhitm.c:missmm()/hitmm(). Multiple pet-combat plines can land
    // during a delayed occupation turn; tty pauses the occupation on --More--.
    await append_topline_message(`${pet_subject(mtmp)} ${text}`);
}

function refresh_pet_attack_symbols(mtmp, target) {
    // C ref: mhitm.c:pre_mm_attack(). Refresh visible attacker and defender
    // positions before missmm()/hitmm() writes the combat pline.
    const visibleCombat = monster_combat_visible(mtmp, target);
    const spottedAttacker = monster_spotted_for_combat(mtmp);
    const spottedDefender = monster_spotted_for_combat(target);
    newsym(mtmp.mx, mtmp.my);
    newsym(target.mx, target.my);
    if (visibleCombat && !spottedAttacker) map_invisible_basic(mtmp.mx, mtmp.my);
    if (visibleCombat && !spottedDefender) map_invisible_basic(target.mx, target.my);
}

function apply_pet_kill_side_effects(mtmp, target, oldx, oldy, targetX, targetY, blockingFrame = true) {
    if (corpse_chance(target)) make_pet_kill_corpse(target);
    grow_up_from_kill(mtmp, target);
    const monsters = game.level?.monsters || [];
    const idx = monsters.indexOf(target);
    if (idx >= 0) monsters.splice(idx, 1);
    // C ref: src/dogmove.c:dog_move().  A pet which kills an adjacent monster
    // returns after mattackm(); it does not step into the defender square as
    // part of the death side effects.
    // C ref: src/mon.c:monkilled()->mondied().  The defender square is
    // redrawn for removal/corpse placement; the attacker square is not
    // refreshed just because damage resolved.
    newsym(targetX, targetY);
}

export function finish_deferred_pet_kill_side_effect() {
    const pending = game._pet_kill_side_effect_pending;
    if (!pending) return false;
    game._pet_kill_side_effect_pending = null;
    game._pet_kill_suppress_resume_after_death_line = !!pending.suppressResumeAfterDeathLine;
    apply_pet_kill_side_effects(
        pending.killer,
        pending.target,
        pending.oldx,
        pending.oldy,
        pending.targetX,
        pending.targetY,
        false,
    );
    return true;
}

export async function finish_pet_kill(mtmp, target) {
    // C ref: mon.c:monkilled(). Monster-vs-monster death announces the
    // visible defender before corpse/death side effects run.
    const oldx = mtmp.mx;
    const oldy = mtmp.my;
    const targetX = target.mx;
    const targetY = target.my;
    if (cansee(targetX, targetY)) {
        const line = pet_kill_line(target);
        const pending = game._pending_message || '';
        const deathLineWillDefer = !!pending && !game._more
            && !topline_can_pack_message(pending, line);
        await append_topline_message(line);
        if (deathLineWillDefer) {
            game._pet_kill_side_effect_pending = {
                killer: mtmp,
                target,
                oldx,
                oldy,
                targetX,
                targetY,
                suppressResumeAfterDeathLine: pet_inventory_combat_line(pending),
            };
            return;
        }
    }
    apply_pet_kill_side_effects(mtmp, target, oldx, oldy, targetX, targetY);
}

export async function finish_deferred_monster_pet_hit() {
    const pending = game._deferred_monster_pet_hit || null;
    if (!pending) return false;
    game._deferred_monster_pet_hit = null;
    const { attacker, target, attack } = pending;
    const damage = d(attack?.[2] || 1, attack?.[3] || 6);
    target.mhp = (target.mhp ?? 1) - damage;
    rn2(3);
    rn2(6);
    if (target.mhp < 1) {
        await finish_pet_kill(attacker, target);
    } else {
        rn2(3);
    }
    return true;
}

function corpse_chance(mon) {
    // C ref: mon.c:corpse_chance(). This pet-kill path only needs the
    // ordinary corpse RNG gate; corpse object creation is still modeled by
    // the hero-kill path.
    const mdat = mon?.data || {};
    const freq = (mdat.geno ?? 0) & G_FREQ;
    const verySmall = typeof mdat.msize === 'number' && mdat.msize < 1;
    const chance = 2 + (freq < 2 ? 1 : 0) + (verySmall ? 1 : 0);
    return !rn2(chance);
}

function make_pet_kill_corpse(mon) {
    // C ref: mon.c:mondied() -> mkobj.c:mkcorpstat(CORPSE, CORPSTAT_INIT).
    // C ref: mon.c:make_corpse().  corpse_chance() consumes its RNG before
    // make_corpse() rejects G_NOCORPSE species such as grid bugs.
    if ((mon?.data?.geno || 0) & G_NOCORPSE) return;
    const oldLiveCorpseTimeout = game._live_corpse_timeout;
    game._live_corpse_timeout = true;
    try {
        const corpse = mkcorpstat(CORPSE, mon, mon?.data, mon.mx, mon.my, CORPSTAT_INIT);
        if (corpse) {
            const key = corpse_species_name(corpse.corpsenm).toUpperCase().replace(/[\s-]+/g, '_');
            const stats = CORPSE_STATS.get(key);
            if (stats) {
                corpse.corpse_cwt = stats.cwt;
                corpse.corpse_cnutrit = stats.cnutrit;
            }
            corpse._live_kill_corpse = true;
        }
        return corpse;
    } finally {
        game._live_corpse_timeout = oldLiveCorpseTimeout;
    }
}

async function dog_invent(mtmp, udist) {
    if (mtmp.meating || !game.level?.objects) return 0;
    const edog = init_edog(mtmp);
    const droppable = pet_droppable(mtmp);
    if (droppable) {
        if ((!rn2(udist + 1) || !rn2(edog.apport)) && rn2(10) < edog.apport) {
            const idx = mtmp.inventory.indexOf(droppable);
            if (idx >= 0) mtmp.inventory.splice(idx, 1);
            const obj = droppable;
            if (cansee(mtmp.mx, mtmp.my)) await latch_more_frame_before_pet_inventory();
            place_object(obj, mtmp.mx, mtmp.my);
            // C ref: steal.c:mdrop_obj().  Pet inventory drops are only
            // announced when the drop square is visible.
            if (cansee(mtmp.mx, mtmp.my)) {
                mark_object_encountered(obj);
                pet_inventory_pline(`${pet_subject(mtmp)} drops ${object_name(obj)}.`);
            }
            if (edog.apport > 1) edog.apport--;
            newsym(mtmp.mx, mtmp.my);
        }
        return 0;
    }

    const omx = mtmp.mx;
    const omy = mtmp.my;
    const obj = game.level.objects.find((item) => item.ox === omx && item.oy === omy);
    if (!obj || typeof obj.otyp !== 'number') return 0;
    if (dog_nofetch(obj)) return 0;

    const edible = dogfood(mtmp, obj);
    if ((edible <= CADAVER || (edog.mhpmax_penalty && edible === ACCFOOD))
        && could_reach_item(mtmp, obj.ox, obj.oy)) {
        return dog_eat(mtmp, obj, omx, omy, false);
    }
    const carryamt = can_carry(mtmp, obj);
    if (carryamt > 0 && !obj.cursed && could_reach_item(mtmp, obj.ox, obj.oy)) {
        if (rn2(20) < edog.apport + 3) {
            if (rn2(Math.max(1, udist)) || !rn2(edog.apport)) {
                if (!obj._defer_pet_pickup) {
                    if (cansee(omx, omy)) await latch_more_frame_before_pet_inventory();
                    const picked = split_floor_object(obj, carryamt);
                    if (picked === obj) {
                        const idx = game.level.objects.indexOf(obj);
                        if (idx >= 0) game.level.objects.splice(idx, 1);
                    }
                    mtmp.inventory = mtmp.inventory || [];
                    mtmp.inventory.unshift(picked);
                    if (cansee(omx, omy)) {
                        mark_object_encountered(picked);
                        pet_inventory_pline(`${pet_subject(mtmp)} picks up ${object_name(picked)}.`);
                    }
                    newsym(omx, omy);
                }
            }
        }
    }
    return 0;
}

function pet_can_see_object(mtmp, x, y) {
    return clear_path(mtmp.mx, mtmp.my, x, y);
}

function nearest_visible_pet_goal(mtmp) {
    const ux = game.u?.ux ?? mtmp.mx;
    const uy = game.u?.uy ?? mtmp.my;
    const range = 9;
    let best = null;

    const consider = (x, y) => {
        const heroDist = dist2(x, y, ux, uy);
        if (!best || heroDist < best.heroDist) best = { x, y, heroDist };
    };

    // C refs: dogmove.c:dog_goal(), dogmove.c:wantdoor(),
    // vision.c:do_clear_area().  When the pet cannot see the hero and has
    // no useful track, it walks toward the visible square nearest the hero.
    for (const point of clear_area_from(mtmp.mx, mtmp.my, range)) consider(point.x, point.y);

    if (!best || (best.x === mtmp.mx && best.y === mtmp.my)) return null;
    return best;
}

function pet_master_x(mtmp) {
    return mtmp.mux ?? game.u?.ux ?? mtmp.mx;
}

function pet_master_y(mtmp) {
    return mtmp.muy ?? game.u?.uy ?? mtmp.my;
}

function find_targ(mtmp, dx, dy, maxdist) {
    let curx = mtmp.mx;
    let cury = mtmp.my;
    for (let dist = 0; dist < maxdist; dist++) {
        curx += dx;
        cury += dy;
        if (!isok(curx, cury)) break;
        if (!clear_path(mtmp.mx, mtmp.my, curx, cury)) break;
        if (curx === pet_master_x(mtmp) && cury === pet_master_y(mtmp)) {
            return { _hero: true, mx: curx, my: cury, mtame: 0, mpeaceful: 0 };
        }
        const targ = mon_at(curx, cury, mtmp);
        if (!targ) continue;
        if (targ.minvis || targ.mundetected) continue;
        if (targ.mx === curx && targ.my === cury) return targ;
    }
    return null;
}

function find_friends(mtmp, mtarg, maxdist) {
    const dx = sgn(mtarg.mx - mtmp.mx);
    const dy = sgn(mtarg.my - mtmp.my);
    let curx = mtarg.mx;
    let cury = mtarg.my;
    for (let dist = distmin(mtarg.mx, mtarg.my, mtmp.mx, mtmp.my); dist <= maxdist; dist++) {
        curx += dx;
        cury += dy;
        if (!isok(curx, cury)) return false;
        if (!clear_path(mtmp.mx, mtmp.my, curx, cury)) return false;
        if (curx === pet_master_x(mtmp) && cury === pet_master_y(mtmp)) return true;
        const pal = mon_at(curx, cury, mtmp);
        if (pal?.mtame && !pal.minvis) return true;
    }
    return false;
}

function monster_level(mon) {
    return mon?.m_lev ?? mon?.data?.mlevel ?? 0;
}

function score_targ(mtmp, mtarg) {
    let score = 0;
    if (!mtmp.mconf || !rn2(3)) {
        if (distmin(mtmp.mx, mtmp.my, mtarg.mx, mtarg.my) <= 1) return -3000;
        if (mtarg.mtame || mtarg._hero) return -3000;
        if (find_friends(mtmp, mtarg, 15)) return -3000;
        if (!mtarg.mpeaceful) score += 10;
        const petLev = monster_level(mtmp);
        const targLev = monster_level(mtarg);
        if (targLev > petLev + 4) score -= (targLev - petLev) * 20;
        score += targLev * 2 + Math.trunc((mtarg.mhp ?? 0) / 3);
    }
    score += rnd(5);
    if (mtmp.mconf && !rn2(3)) score -= 1000;
    return score;
}

function best_target(mtmp, forced) {
    if (!mtmp || mtmp.mcansee === 0) return null;
    let bestScore = -40000;
    let bestTarg = null;
    for (let dy = -1; dy < 2; dy++) {
        for (let dx = -1; dx < 2; dx++) {
            if (!dx && !dy) continue;
            const targ = find_targ(mtmp, dx, dy, 7);
            if (!targ) continue;
            const score = score_targ(mtmp, targ);
            if (score > bestScore) {
                bestScore = score;
                bestTarg = targ;
            }
        }
    }
    if (!forced && bestScore < 0) return null;
    return bestTarg;
}

function pet_ranged_attk(mtmp, forced = false) {
    const edog = init_edog(mtmp);
    const hungry = (game.moves || 0) > ((edog.hungrytime || 0) + DOG_HUNGRY);
    const mtarg = best_target(mtmp, forced);
    if (mtarg && hungry) rn2(5);
    return 0;
}

function door_blocks_diagonal(x, y) {
    const loc = game.level?.at(x, y);
    return loc && IS_DOOR(loc.typ) && (loc.doormask & ~D_BROKEN);
}

function pet_can_enter_square(mtmp, x, y, { ignoreMonster = false } = {}) {
    if (!isok(x, y)) return false;
    if (x !== mtmp.mx && y !== mtmp.my
        && (door_blocks_diagonal(mtmp.mx, mtmp.my) || door_blocks_diagonal(x, y))) {
        return false;
    }
    if (x === game.u?.ux && y === game.u?.uy) return false;
    if (x === mtmp.mux && y === mtmp.muy) return false;
    if (!ignoreMonster && mon_at(x, y, mtmp)) return false;
    if (is_boulder_at(x, y)) return false;
    const loc = game.level?.at(x, y);
    return !!loc && (SPACE_POS(loc.typ)
        || (IS_DOOR(loc.typ) && !(loc.doormask & (D_CLOSED | D_LOCKED))));
}

function pet_can_step(mtmp, x, y) {
    return pet_can_enter_square(mtmp, x, y);
}

function m_avoid_kicked_loc(mtmp, nx, ny) {
    const kicked = game._kickedloc;
    if (!kicked || !isok(kicked.x, kicked.y)) return false;
    return (mtmp.mpeaceful || mtmp.mtame)
        && mtmp.mcansee !== 0
        && !mtmp.mconf && !mtmp.mstun
        && !game.u?.uprops?.conflict
        && nx === kicked.x && ny === kicked.y
        && dist2(nx, ny, game.u?.ux ?? nx, game.u?.uy ?? ny) <= 2;
}

function pet_should_attack(mtmp, target) {
    if (!target || target.mtame) return false;
    if (target.mpeaceful && !game.Conflict) return false;
    const petLevel = monster_level(mtmp);
    const petHp = mtmp.mhp ?? petLevel;
    const petHpMax = Math.max(1, mtmp.mhpmax ?? petHp);
    const balk = petLevel + Math.trunc((5 * petHp) / petHpMax) - 2;
    if (monster_level(target) >= balk) return false;
    return true;
}

function grow_up_from_kill(mtmp, victim) {
    const currentLevel = monster_level(mtmp);
    const victimLevel = monster_level(victim);
    let hpThreshold = currentLevel * 8;
    if (!currentLevel) hpThreshold = 4;

    let maxIncrease = rnd(victimLevel + 1);
    const currentMax = mtmp.mhpmax ?? mtmp.mhp ?? Math.max(1, currentLevel);
    if (currentMax + maxIncrease > hpThreshold + 1) {
        maxIncrease = Math.max((hpThreshold + 1) - currentMax, 0);
    }
    const curIncrease = maxIncrease > 1 ? rn2(maxIncrease) : 0;
    mtmp.mhpmax = currentMax + maxIncrease;
    mtmp.mhp = (mtmp.mhp ?? currentMax) + curIncrease;

    if (mtmp.mhpmax <= hpThreshold) return;
    let levelLimit = Math.trunc(3 * (mtmp.data?.mlevel ?? currentLevel) / 2);
    if (levelLimit < 5) levelLimit = 5;
    if (currentLevel < levelLimit) mtmp.m_lev = currentLevel + 1;
}

async function pet_melee_attack(mtmp, target) {
    if (!pet_should_attack(mtmp, target)) return { attacked: false };
    // C ref: dogmove.c calls mattackm() for ALLOW_M candidates before
    // ranged attacks.  This is a narrow mhitm.c front door for the current
    // pet evidence: physical attack rows, miss passive check, or hit damage
    // plus death/growth follow-up RNG.
    mtmp.mlstmv = game.moves || 0; // C ref: mhitm.c:mattackm().
    const attacks = pet_physical_attacks(mtmp);
    for (let i = 0; i < attacks.length; i++) {
        const attack = attacks[i];
        const dieroll = rnd(20 + i);
        if (!mattackm_hits(mtmp, target, dieroll)) {
            const paused = await pet_melee_miss(mtmp, target, attack, i < attacks.length - 1);
            if (paused) return { attacked: true, hit: false, defenderDied: false };
            continue;
        }

        const defenderDied = await pet_melee_hit(mtmp, target, attack);
        if (defenderDied) return { attacked: true, hit: true, defenderDied: true };
    }
    return { attacked: true, hit: false, defenderDied: false };
}

function pet_physical_attacks(mtmp) {
    const attacks = (mtmp?.data?.mattk || [])
        .filter((attack) => attack
            && (attack[0] === 'AT_BITE' || attack[0] === 'AT_KICK' || attack[0] === 'AT_CLAW')
            && attack[1] === 'AD_PHYS');
    return attacks.length ? attacks : [['AT_BITE', 'AD_PHYS', 1, 6]];
}

function pet_attack_verb(attack) {
    return attack?.[0] === 'AT_BITE' ? 'bites' : 'hits';
}

function pet_attack_damage(attack) {
    return d(attack?.[2] || 1, attack?.[3] || 6);
}

function visible_pet_miss_line(mtmp, target) {
    if (!monster_combat_visible(mtmp, target)) return '';
    return `${monster_combat_subject(mtmp)} misses ${monster_combat_object(target)}.`;
}

function pet_miss_line(line) {
    return /^The (?:kitten|little dog|(?:saddled )?pony) misses /.test(line || '');
}

function pet_inventory_miss_line(line) {
    return /^The (?:kitten|little dog|(?:saddled )?pony) (?:drops|picks up) .+\.  The (?:kitten|little dog|(?:saddled )?pony) misses .+\.$/.test(line || '');
}

function pet_inventory_combat_line(line) {
    return /^The (?:kitten|little dog|(?:saddled )?pony) (?:drops|picks up) .+\.  The (?:kitten|little dog|(?:saddled )?pony) (?:misses|bites|hits|kicks|stings|butts|touches) .+\.$/.test(line || '');
}

async function pet_melee_miss(mtmp, target, attack, hasLaterAttack) {
    const duplicateMiss = visible_pet_miss_line(mtmp, target);
    if (duplicateMiss && game._pending_message === duplicateMiss
        && game._resuming_monster_turn_after_more && !game._more && !hallucinating()) {
        // C refs: win/tty/topl.c:update_topl(), src/mhitm.c:missmm().
        // A fresh resumed miss with identical text still goes through pline();
        // tty packs it behind the deferred line and prompts at the boundary.
        refresh_pet_attack_symbols(mtmp, target);
        await append_topline_message(duplicateMiss);
        game._pet_miss_prompt_after_resume = true;
    } else {
        refresh_pet_attack_symbols(mtmp, target);
        const visibleMiss = await monster_combat_message(
            mtmp, target,
            (targetName) => `misses ${targetName}.`,
            attack,
        );
        const missedLine = game._after_more_message || game._pending_message || '';
        if (!hasLaterAttack && visibleMiss && game._resuming_monster_turn_after_more && !game._more
            && !hallucinating()) {
            if (pet_miss_line(missedLine)) {
                game._pet_miss_prompt_after_resume = true;
            } else if (pet_inventory_miss_line(missedLine)) {
                // C refs: win/tty/topl.c:update_topl(), src/mhitm.c:missmm().
                // A resumed pet inventory pline leaves toplin in NEED_MORE;
                // a packed pet miss behind it still owns the interrupted
                // monster-turn More.
                queue_more_prompt();
                game._pet_combat_more_latched = true;
            }
        }
    }
    const missedLine = game._after_more_message || game._pending_message || '';
    if (!hasLaterAttack && game._more
        && (pet_miss_line(missedLine) || pet_inventory_miss_line(missedLine))) {
        // C ref: src/mhitm.c:missmm()/passivemm().  When a pet miss is queued
        // behind a tty More, the passive miss side-effect roll belongs to the
        // resumed path.
        game._deferred_pet_miss_passive = true;
        game._pet_combat_passive_paused = true;
        if (game._after_more_message && !game._after_more_needs_prompt)
            game._pet_miss_prompt_after_resume = true;
        return true;
    }
    rn2(3);
    return false;
}

async function pet_melee_hit(mtmp, target, attack) {
    const damage = pet_attack_damage(attack);
    refresh_pet_attack_symbols(mtmp, target);
    await monster_combat_message(
        mtmp, target,
        (targetName) => `${pet_attack_verb(attack)} ${targetName}.`,
        attack,
    );
    const currentHp = target.mhp ?? Math.max(1, target.data?.mlevel ?? 1);
    target.mhp = currentHp - damage;
    rn2(3); // mhitm_knockback chance
    rn2(6); // mhitm_knockback distance/side gate
    if (target.mhp < 1) {
        const killLine = pet_kill_line(target);
        const killLineCanPack = !!game._pending_message && !game._more
            && topline_can_pack_message(game._pending_message, killLine);
        if ((game._more || (pending_pet_combat_boundary() && !killLineCanPack)) && !hallucinating()) {
            if (!game._more && pending_pet_combat_boundary() && !killLineCanPack) {
                game._pet_combat_pending_boundary = false;
                queue_more_prompt();
                game._pet_combat_more_latched = true;
            }
            game._pet_defender_death_pending = { killer: mtmp, target };
        } else {
            await finish_pet_kill(mtmp, target);
        }
        return true;
    }
    rn2(3); // C ref: src/mhitm.c:passivemm().
    if (rn2(4) && target.mlstmv !== (game.moves || 0)
        && dist2(target.mx, target.my, mtmp.mx, mtmp.my) <= 2) {
        // C ref: src/dogmove.c:dog_move().  Pet-initiated hits give the
        // defender a state/adjacency-gated return attack without the movement
        // roll used by fightm().
        const result = await monster_melee_attack(target, mtmp);
        if (result.defenderDied) return true;
    }
    return false;
}

async function monster_melee_attack(mtmp, target) {
    mtmp.mlstmv = game.moves || 0; // C ref: mhitm.c:mattackm().
    const wielded = monster_wield_for_pet_counter(mtmp);
    if (wielded) {
        refresh_pet_attack_symbols(mtmp, target);
        await append_topline_message(`The ${monster_name(mtmp)} wields ${monster_weapon_name(wielded)}!`);
        return { attacked: true, wielded: true, defenderDied: false };
    }
    const attack = (mtmp.data?.mattk || []).find(Boolean) || ['AT_BITE', 'AD_PHYS', 1, 6];
    const dieroll = rnd(20);
    if (!mattackm_hits(mtmp, target, dieroll)) {
        refresh_pet_attack_symbols(mtmp, target);
        await monster_combat_message(
            mtmp, target,
            (targetName) => `misses ${targetName}.`,
            attack,
        );
        rn2(3);
        return { attacked: true, hit: false, defenderDied: false };
    }
    refresh_pet_attack_symbols(mtmp, target);
    const verb = attack[0] === 'AT_WEAP' ? 'hits' : 'bites';
    await monster_combat_message(
        mtmp, target,
        (targetName) => `${verb} ${targetName}.`,
        attack,
    );
    if (attack[0] === 'AT_WEAP' && game._more && game._after_more_message
        && game._after_more_message.includes(`The ${monster_name(mtmp)} ${verb} ${monster_article_name(target)}.`)) {
        game._deferred_monster_pet_hit = { attacker: mtmp, target, attack };
        return { attacked: true, hit: true, defenderDied: false };
    }
    const damage = d(attack[2] || 1, attack[3] || 6);
    target.mhp = (target.mhp ?? 1) - damage;
    rn2(3);
    rn2(6);
    if (target.mhp < 1) {
        if (game._more && !hallucinating()) {
            game._pet_defender_death_pending = { killer: mtmp, target };
        } else {
            await finish_pet_kill(mtmp, target);
        }
    } else {
        rn2(3); // C ref: mhitm.c:passivemm().
    }
    return { attacked: true, hit: true, defenderDied: target.mhp < 1 };
}

function pet_goal(mtmp, after, udist, whappr) {
    // C ref: dogmove.c:dog_goal().  This partial path scans nearby floor
    // objects before falling back to the common "follow the hero" goal.
    const gx = game.u?.ux ?? mtmp.mx;
    const gy = game.u?.uy ?? mtmp.my;
    const loc = game.level?.at(gx, gy);
    const petLoc = game.level?.at(mtmp.mx, mtmp.my);
    const edog = init_edog(mtmp);
    let goalType = UNDEF;
    let goalX = 0;
    let goalY = 0;
    let appr = udist >= 9 ? 1 : (mtmp.mflee ? -1 : 0);

    const minX = Math.max(1, mtmp.mx - 5);
    const maxX = Math.min(79, mtmp.mx + 5);
    const minY = Math.max(0, mtmp.my - 5);
    const maxY = Math.min(20, mtmp.my + 5);
    // C ref: dogmove.c uses couldsee(omx, omy).  While swallowed, C's
    // gulpmu() disables ordinary hero vision before later pet goal scans.
    const inMastersSight = !game.u?.uswallow && couldsee(mtmp.mx, mtmp.my);
    const dogHasMinvent = !!pet_droppable(mtmp);

    for (const obj of game.level?.objects || []) {
        if (typeof obj.otyp !== 'number') continue;
        const nx = obj.ox;
        const ny = obj.oy;
        if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue;
        const foodType = dogfood(mtmp, obj);
        if (foodType > goalType || foodType === UNDEF) continue;
        if (cursed_object_at(nx, ny) && !(edog.mhpmax_penalty && foodType < MANFOOD)) continue;
        if (!could_reach_item(mtmp, nx, ny)
            || !can_reach_location(mtmp, mtmp.mx, mtmp.my, nx, ny)) {
            continue;
        }

        if (foodType < MANFOOD) {
            if (foodType < goalType
                || dist2(nx, ny, mtmp.mx, mtmp.my) < dist2(goalX, goalY, mtmp.mx, mtmp.my)) {
                goalX = nx;
                goalY = ny;
                goalType = foodType;
            }
        } else if (goalType === UNDEF && inMastersSight && !dogHasMinvent
                   && (!petLoc?.lit || loc?.lit)
                   && (foodType === MANFOOD || pet_can_see_object(mtmp, nx, ny))
                   && edog.apport > rn2(8)
                   && can_carry(mtmp, obj) > 0) {
            goalX = nx;
            goalY = ny;
            goalType = APPORT;
        }
    }

    // C ref: dogmove.c:dog_goal(). Non-apport/non-dogfood goals are ignored
    // while the pet is not hungry enough, so the pet falls through to the
    // ordinary follow-the-hero logic.
    if (goalType !== UNDEF && (goalType === DOGFOOD || goalType === APPORT
        || (game.moves || 0) >= (edog.hungrytime || 0))) {
        return { abort: false, gx: goalX, gy: goalY, appr: 1 };
    }

    if (after && udist <= 4) {
        return { abort: true, gx, gy, appr };
    }
    if (udist > 1 && (!loc || !IS_ROOM(loc.typ) || !rn2(4) || whappr
        || (dogHasMinvent && rn2(edog.apport)))) appr = 1;
    if (appr === 0) {
        if (loc?.typ === STAIRS || loc?.typ === LADDER) {
            appr = 1;
        } else {
            for (const obj of game.inventory || []) {
                if (typeof obj.otyp !== 'number') continue;
                if (dogfood(mtmp, obj) === DOGFOOD) {
                    appr = 1;
                    break;
                }
            }
        }
    }

    let followX = gx;
    let followY = gy;
    if (!inMastersSight) {
        const track = gettrack(mtmp.mx, mtmp.my);
        if (track) {
            followX = track.x;
            followY = track.y;
            edog.ogoal.x = 0;
        } else if (edog.ogoal?.x && (edog.ogoal.x !== mtmp.mx || edog.ogoal.y !== mtmp.my)) {
            followX = edog.ogoal.x;
            followY = edog.ogoal.y;
            edog.ogoal.x = 0;
        } else {
            const visibleGoal = nearest_visible_pet_goal(mtmp);
            if (visibleGoal) {
                followX = visibleGoal.x;
                followY = visibleGoal.y;
                edog.ogoal.x = followX;
                edog.ogoal.y = followY;
            }
        }
    } else {
        edog.ogoal.x = 0;
    }
    return { abort: false, gx: followX, gy: followY, appr };
}

async function dog_move_after_inventory_core(mtmp, after, udist, edog) {
    const whappr = (game.moves || 0) - (edog.whistletime || 0) < 5;
    const goal = pet_goal(mtmp, after, udist, whappr);
    if (goal.abort) return 0;

    // C ref: mon.c:mfndpos() scans x first, then y.  dogmove.c then applies
    // distance-weighted reservoir selection against gg.gx/gg.gy.
    let nix = mtmp.mx;
    let niy = mtmp.my;
    let nidist = dist2(nix, niy, goal.gx, goal.gy);
    let chcnt = 0;
    const maxx = Math.min(mtmp.mx + 1, 79);
    const maxy = Math.min(mtmp.my + 1, 20);
    let uncursedcnt = 0;
    let mfndposcnt = 0;
    let doEat = false;
    let eatObj = null;
    let moveReluctant = false;

    for (let nx = Math.max(1, mtmp.mx - 1); nx <= maxx; nx++) {
        for (let ny = Math.max(0, mtmp.my - 1); ny <= maxy; ny++) {
            if (nx === mtmp.mx && ny === mtmp.my) continue;
            const target = mon_at(nx, ny, mtmp);
            if (!pet_can_enter_square(mtmp, nx, ny, { ignoreMonster: !!target })) continue;
            mfndposcnt++;
            if (!cursed_object_at(nx, ny)) uncursedcnt++;
        }
    }

    searchCandidates:
    for (let nx = Math.max(1, mtmp.mx - 1); nx <= maxx; nx++) {
        for (let ny = Math.max(0, mtmp.my - 1); ny <= maxy; ny++) {
            if (nx === mtmp.mx && ny === mtmp.my) continue;
            const target = mon_at(nx, ny, mtmp);
            if (!pet_can_enter_square(mtmp, nx, ny, { ignoreMonster: !!target })) continue;
            if (target) {
                const attack = await pet_melee_attack(mtmp, target);
                if (attack.attacked) {
                    if (attack.hit && !attack.defenderDied && rn2(4)
                        && !game._savelife_resume_active) {
                        await monster_melee_attack(target, mtmp);
                    }
                    return 0;
                }
                continue;
            }
            if (avoid_soko_push_loc(mtmp, nx, ny)) continue;
            if (m_avoid_kicked_loc(mtmp, nx, ny)) continue;

            // C ref: dogmove.c:dog_move(). Seen traps are retained as
            // candidates by mfndpos(ALLOW_TRAPS), then pets usually avoid
            // stepping on them during candidate evaluation.
            const trap = trap_at(nx, ny);
            if (trap?.tseen && rn2(40)) continue;

            let cursedOnCandidate = false;
            const canReachFood = could_reach_item(mtmp, nx, ny);
            for (const obj of objects_at(nx, ny)) {
                if (obj.cursed) {
                    cursedOnCandidate = true;
                } else if (canReachFood) {
                    const foodType = dogfood(mtmp, obj);
                    if (foodType < MANFOOD
                        && (foodType < ACCFOOD || edog.hungrytime <= (game.moves || 1))) {
                        nix = nx;
                        niy = ny;
                        doEat = true;
                        eatObj = obj;
                        moveReluctant = false;
                        cursedOnCandidate = false;
                        break searchCandidates;
                    }
                }
            }
            if (cursedOnCandidate && uncursedcnt > 0 && rn2(13 * uncursedcnt)) continue;

            // NetHack lessens backtracking only for pets more than five
            // squares from the hero.
            if (distmin(mtmp.mx, mtmp.my, game.u?.ux ?? mtmp.mx, game.u?.uy ?? mtmp.my) > 5) {
                const k = edog ? uncursedcnt : mfndposcnt;
                const jcnt = Math.min(MTSZ, k - 1, mtmp.mtrack?.length || 0);
                let backtracking = false;
                for (let trackIndex = 0; trackIndex < jcnt; trackIndex++) {
                    const track = mtmp.mtrack[trackIndex];
                    if (track?.x === nx && track?.y === ny && rn2(MTSZ * (k - trackIndex))) {
                        backtracking = true;
                        break;
                    }
                }
                if (backtracking) continue;
            }

            const ndist = dist2(nx, ny, goal.gx, goal.gy);
            const j = (ndist - nidist) * goal.appr;
            if ((j === 0 && !rn2(++chcnt))
                || j < 0
                || (j > 0 && !whappr
                    && ((mtmp.mx === nix && mtmp.my === niy && !rn2(3)) || !rn2(12)))) {
                nix = nx;
                niy = ny;
                nidist = ndist;
                moveReluctant = cursedOnCandidate;
                if (j < 0) chcnt = 0;
            }
        }
    }

    if (!doEat) pet_ranged_attk(mtmp, false);

    if (nix === mtmp.mx && niy === mtmp.my) return 0;
    const oldx = mtmp.mx;
    const oldy = mtmp.my;
    mtmp.mx = nix;
    mtmp.my = niy;
    mon_track_add(mtmp, oldx, oldy);
    newsym(oldx, oldy);
    newsym(nix, niy);
    if (moveReluctant) {
        const topObj = objects_at(nix, niy)[0];
        await pet_reluctance_pline(`${pet_noit_subject(mtmp)} steps reluctantly onto ${topObj ? object_name(topObj) : 'something'}.`);
    }
    if (doEat && eatObj) {
        const eatStatus = await dog_eat(mtmp, eatObj, oldx, oldy, false);
        if (eatStatus === 2) return 2;
    }
    return 1;
}

export async function dog_move_after_inventory(mtmp, after = true) {
    const udist = dist2(mtmp.mx, mtmp.my, game.u?.ux ?? mtmp.mx, game.u?.uy ?? mtmp.my);
    if (!udist) return 0;
    const edog = init_edog(mtmp);
    return dog_move_after_inventory_core(mtmp, after, udist, edog);
}

export async function dog_move(mtmp, after = true) {
    const udist = dist2(mtmp.mx, mtmp.my, game.u?.ux ?? mtmp.mx, game.u?.uy ?? mtmp.my);
    if (!udist) return 0;

    const edog = init_edog(mtmp);
    const inventStatus = await dog_invent(mtmp, udist);
    if (inventStatus === 2) return 2;
    if (inventStatus === 1) return 1;
    // C ref: src/dogmove.c:dog_invent().  A visible pet inventory message
    // queued behind an active tty --More-- blocks before dog_goal()/attacks.
    if (game._more && (game._after_more_message || game._pet_inventory_more_latched)) {
        game._pet_inventory_more_latched = false;
        game._resume_pet_move_after_inventory = mtmp;
        return 0;
    }
    return dog_move_after_inventory_core(mtmp, after, udist, edog);
}
