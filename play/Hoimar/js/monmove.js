import { game } from './gstate.js';
import { d, rn2, rnd } from './rng.js';
import { dog_move, dog_move_after_inventory } from './dog.js';
import { exercise } from './allmain_turns.js';
import {
    enexto_core, monsterPtr, MONSTER_SYMBOLS, newmonhp_state_for,
    pick_newcham_shape_for, mksobj, place_object, next_ident, stackobj,
} from './mklev.js';
import { OBJECT_CLASS, OBJECT_DIR, OBJECT_WEIGHT } from './object_data.js';
import {
    BURN, DUST, ENGR_BLOOD, HEADSTONE,
    D_BROKEN, D_CLOSED, D_ISOPEN, D_LOCKED, D_NODOOR, D_TRAPPED,
    ARROW_TRAP, DART_TRAP, ROCKTRAP, BEAR_TRAP, LANDMINE, ROLLING_BOULDER_TRAP,
    RUST_TRAP, FIRE_TRAP, PIT, SPIKED_PIT, HOLE, TRAPDOOR,
    ANTI_MAGIC, DOOR, IRONBARS, LADDER, LAVAWALL, MAGIC_PORTAL, MAGIC_TRAP,
    ROOM, SQKY_BOARD, SLP_GAS_TRAP, STAIRS, STATUE_TRAP, VIBRATING_SQUARE, WEB,
    ACCESSIBLE, IS_DOOR, IS_LAVA, IS_OBSTRUCTED, IS_POOL, IS_ROOM, IS_STWALL, IS_TREE, IS_WALL, IS_WATERWALL,
    I_SPECIAL, M_AP_FURNITURE, M_AP_OBJECT,
    MON_POLE_DIST, NEED_AXE, NEED_HTH_WEAPON, NEED_PICK_AXE, NEED_PICK_OR_AXE,
    NEED_RANGED_WEAPON, NEED_WEAPON, W_ARMS, W_NONDIGGABLE, W_WEP,
    GP_CHECKSCARY, SDOOR, W_NONPASSWALL,
    STRAT_WAITFORU, STRAT_WAITMASK, A_DEX, A_STR, A_WIS, A_CON,
    COLNO, ROWNO, ROOMOFFSET, SHOPBASE, W_RING, isok, SPACE_POS, is_pit,
} from './const.js';
import {
    newsym, queue_more_prompt, pline, flush_screen, clear_pending_message,
    docrt, refresh_swallowed_overlay, serialize_terminal_grid, append_pline, see_monsters,
    show_glyph_cell, topline_can_pack_message,
} from './display.js';
import { nhgetch } from './input.js';
import { clear_path, cansee, couldsee, vision_reset, vision_recalc } from './vision.js';
import { m_dowear_basic } from './mon_wear.js';
import { gettrack } from './track.js';
import { randomHallucinatedMonsterName } from './random_text.js';
import { getObjectColor, getObjectDescription } from './o_init.js';
import { NO_COLOR } from './terminal.js';

const NORMAL_SPEED = 12;
const BOLT_LIM = 8;
const MZ_SMALL = 1;
const MZ_LARGE = 3;
const BLINDING_VENOM = 479;
const ACID_VENOM = 480;

const M1_AMORPHOUS = 0x00000004;
const M2_WERE = 0x00000004;
const M2_HUMAN = 0x00000008;
const M2_DWARF = 0x00000020;
const M2_ORC = 0x00000080;
const M2_WANDER = 0x00800000;
const M2_ROCKTHROW = 0x08000000;
const M1_FLY = 0x00000001;
const M1_SWIM = 0x00000002;
const M1_WALLWALK = 0x00000008;
const M1_CLING = 0x00000010;
const M1_TUNNEL = 0x00000020;
const M1_NEEDPICK = 0x00000040;
const M1_HIDE = 0x00000100;
const M1_CONCEAL = 0x00000080;
const M1_BREATHLESS = 0x00000400;
const M1_NOEYES = 0x00001000;
const M1_NOHANDS = 0x00002000;
const M1_MINDLESS = 0x00010000;
const M1_ANIMAL = 0x00040000;
const M1_UNSOLID = 0x00100000;
const M1_REGEN = 0x00800000;
const M1_SEE_INVIS = 0x01000000;
const M2_STRONG = 0x04000000;
const M2_COLLECT = 0x40000000;
const M2_MAGIC = 0x80000000;
const MR_FIRE = 0x01;
const MR_SLEEP = 0x04;
const MTSZ = 4;
const MS_RIDER = 35;
const MAX_CARR_CAP = 1000;
const WT_HUMAN = 1450;
const MZ_HUMAN = 2;
const MS_LEADER = 36;
const MSLOW = 1;
const MFAST = 2;
const MMOVE_NOTHING = 0;
const MMOVE_MOVED = 1;
const MMOVE_DIED = 2;
const MMOVE_DONE = 3;
const TRAP_NOTE_NAMES = [
    'C note', 'D flat', 'D note', 'E flat',
    'E note', 'F note', 'F sharp', 'G note',
    'G sharp', 'A note', 'B flat', 'B note',
];
const MCF_INDIRECT = 0x0001;
const MCF_SIGHT = 0x0002;
const MCF_HOSTILE = 0x0004;
const WEAPON_CLASS = 2;
const ARMOR_CLASS = 3;
const RING_CLASS = 4;
const AMULET_CLASS = 5;
const FOOD_CLASS = 7;
const POTION_CLASS = 8;
const SCROLL_CLASS = 9;
const SPBOOK_CLASS = 10;
const WAND_CLASS = 11;
const GEM_CLASS = 13;
const G_FREQ = 0x0007;
const G_NOCORPSE = 0x0010;
const RIN_STEALTH = 181;
const RIN_AGGRAVATE_MONSTER = 185;
const APPLE = 277;
const ORANGE = 278;
const PEAR = 279;
const MELON = 280;
const BANANA = 281;
const CARROT = 282;
const SPRIG_OF_WOLFSBANE = 283;
const CLOVE_OF_GARLIC = 284;
const SLIME_MOLD = 285;
const LUMP_OF_ROYAL_JELLY = 286;
const CREAM_PIE = 287;
const CANDY_BAR = 288;
const FORTUNE_COOKIE = 289;
const PANCAKE = 290;
const LEMBAS_WAFER = 291;
const CRAM_RATION = 292;
const FOOD_RATION = 293;
const K_RATION = 294;
const C_RATION = 295;
const CORPSE = 265;
const ROCK = 474;
const BOULDER = 475;
const AXE = 44;
const BATTLE_AXE = 45;
const DWARVISH_MATTOCK = 71;
const PICK_AXE = 259;
const RAY = 3;
const AMULET_OF_LIFE_SAVING = 202;
const AMULET_OF_REFLECTION = 208;
const AMULET_OF_GUARDING = 210;
const POT_CONFUSION = 299;
const POT_BLINDNESS = 300;
const POT_PARALYSIS = 301;
const POT_SPEED = 302;
const POT_INVISIBILITY = 305;
const POT_HEALING = 307;
const POT_EXTRA_HEALING = 308;
const POT_GAIN_LEVEL = 309;
const POT_SLEEPING = 314;
const POT_FULL_HEALING = 315;
const POT_POLYMORPH = 316;
const POT_ACID = 320;
const SCR_CREATE_MONSTER = 329;
const SCR_TELEPORTATION = 333;
const SCR_FIRE = 339;
const SCR_EARTH = 340;
const WAN_CREATE_MONSTER = 413;
const WAN_STRIKING = 417;
const WAN_MAKE_INVISIBLE = 418;
const WAN_SPEED_MONSTER = 420;
const WAN_UNDEAD_TURNING = 421;
const DILITHIUM_CRYSTAL = 439;
const LUCKSTONE = 470;
const FLINT = 473;
const WAN_POLYMORPH = 422;
const WAN_TELEPORTATION = 424;
const WAN_DIGGING = 428;
const ARROW = 18;
const ELVEN_ARROW = 19;
const ORCISH_ARROW = 20;
const YA = 22;
const CROSSBOW_BOLT = 23;
const DART = 24;
const SHURIKEN = 25;
const BOOMERANG = 26;
const PARTISAN = 59;
const RANSEUR = 60;
const SPETUM = 61;
const BEC_DE_CORBIN = 70;
const AKLYS = 80;
const BOW = 83;
const ELVEN_BOW = 84;
const ORCISH_BOW = 85;
const YUMI = 86;
const CROSSBOW = 88;
const ORCISH_DAGGER = 36;
const SHORT_SWORD = 46;
const ELVEN_SHORT_SWORD = 47;
const ORCISH_SHORT_SWORD = 48;
const DWARVISH_SHORT_SWORD = 49;
const BOW_LAUNCHERS = [YUMI, ELVEN_BOW, BOW, ORCISH_BOW];
const BOW_AMMO = new Set([ARROW, ELVEN_ARROW, ORCISH_ARROW, YA]);
const CROSSBOW_LAUNCHERS = [CROSSBOW];
const CROSSBOW_AMMO = new Set([CROSSBOW_BOLT]);
const NON_HTH_WEAPONS = new Set([
    ARROW, ELVEN_ARROW, ORCISH_ARROW, YA, CROSSBOW_BOLT, DART, SHURIKEN, BOOMERANG,
    BOW, ELVEN_BOW, ORCISH_BOW, YUMI, CROSSBOW,
]);
const BASIC_MELEE_ATTACKS = new Set(['AT_CLAW', 'AT_KICK', 'AT_BITE', 'AT_STNG', 'AT_TUCH', 'AT_BUTT', 'AT_TENT', 'AT_WEAP']);
const BASIC_MELEE_ADTYPES = new Set(['AD_PHYS', 'AD_ELEC', 'AD_COLD', 'AD_FIRE', 'AD_ACID', 'AD_DRST', 'AD_DRDX', 'AD_DRCO']);
const DISTANCE_ATTACK_TYPES = new Set(['AT_SPIT', 'AT_BREA', 'AT_MAGC', 'AT_GAZE']);
const MCAST = {
    PSI_BOLT: { level: 0, flags: MCF_HOSTILE | MCF_SIGHT },
    OPEN_WOUNDS: { level: 0, flags: MCF_HOSTILE | MCF_SIGHT },
    CURE_SELF: { level: 1, flags: MCF_INDIRECT },
    HASTE_SELF: { level: 2, flags: MCF_INDIRECT },
    CONFUSE_YOU: { level: 2, flags: MCF_HOSTILE | MCF_SIGHT },
    STUN_YOU: { level: 3, flags: MCF_HOSTILE | MCF_SIGHT },
    DISAPPEAR: { level: 4, flags: MCF_INDIRECT },
    PARALYZE: { level: 4, flags: MCF_HOSTILE | MCF_SIGHT },
    BLIND_YOU: { level: 6, flags: MCF_HOSTILE | MCF_SIGHT },
    WEAKEN_YOU: { level: 6, flags: MCF_HOSTILE | MCF_SIGHT },
    DESTRY_ARMR: { level: 8, flags: MCF_HOSTILE | MCF_SIGHT },
    INSECTS: { level: 8, flags: MCF_HOSTILE | MCF_INDIRECT | MCF_SIGHT },
    CURSE_ITEMS: { level: 10, flags: MCF_HOSTILE | MCF_SIGHT },
    LIGHTNING: { level: 11, flags: MCF_HOSTILE | MCF_SIGHT },
    FIRE_PILLAR: { level: 12, flags: MCF_HOSTILE | MCF_SIGHT },
    GEYSER: { level: 13, flags: MCF_HOSTILE | MCF_SIGHT },
    AGGRAVATION: { level: 13, flags: MCF_INDIRECT | MCF_HOSTILE | MCF_SIGHT },
    SUMMON_MONS: { level: 15, flags: MCF_HOSTILE | MCF_INDIRECT | MCF_SIGHT },
    CLONE_WIZ: { level: 18, flags: MCF_HOSTILE | MCF_INDIRECT | MCF_SIGHT },
    DEATH_TOUCH: { level: 20, flags: MCF_HOSTILE | MCF_SIGHT },
};
const MON_WIZARD_SPELLS = [
    'PSI_BOLT', 'CURE_SELF', 'HASTE_SELF', 'STUN_YOU', 'DISAPPEAR',
    'WEAKEN_YOU', 'DESTRY_ARMR', 'CURSE_ITEMS', 'AGGRAVATION',
    'SUMMON_MONS', 'CLONE_WIZ', 'DEATH_TOUCH',
];
const MON_CLERIC_SPELLS = [
    'OPEN_WOUNDS', 'CURE_SELF', 'CONFUSE_YOU', 'PARALYZE', 'BLIND_YOU',
    'INSECTS', 'CURSE_ITEMS', 'LIGHTNING', 'FIRE_PILLAR', 'GEYSER',
];

const FOOD_OBJECT_NAMES = new Map([
    // C refs: mon.c:mpickstuff(), objnam.c:distant_name()/doname().
    [SPRIG_OF_WOLFSBANE, 'sprig of wolfsbane'],
    [APPLE, 'apple'],
    [ORANGE, 'orange'],
    [PEAR, 'pear'],
    [MELON, 'melon'],
    [BANANA, 'banana'],
    [CARROT, 'carrot'],
    [CLOVE_OF_GARLIC, 'clove of garlic'],
    [SLIME_MOLD, 'slime mold'],
    [LUMP_OF_ROYAL_JELLY, 'lump of royal jelly'],
    [CREAM_PIE, 'cream pie'],
    [CANDY_BAR, 'candy bar'],
    [FOOD_RATION, 'food ration'],
    [CRAM_RATION, 'cram ration'],
    [LEMBAS_WAFER, 'lembas wafer'],
    [FORTUNE_COOKIE, 'fortune cookie'],
    [PANCAKE, 'pancake'],
    [K_RATION, 'K-ration'],
    [C_RATION, 'C-ration'],
]);

export function mcalcmove(mtmp, m_moving) {
    let mmove = mtmp.data.mmove;

    // C ref: mon.c:mcalcmove() speed adjustments.
    if (mtmp.mspeed === MSLOW) {
        if (mmove < NORMAL_SPEED) mmove = Math.trunc((2 * mmove + 1) / 3);
        else mmove = 4 + Math.trunc(mmove / 3);
    } else if (mtmp.mspeed === MFAST) {
        mmove = Math.trunc((4 * mmove + 2) / 3);
    }

    if (m_moving) {
        const mmove_adj = mmove % NORMAL_SPEED;
        mmove -= mmove_adj;
        if (rn2(NORMAL_SPEED) < mmove_adj) {
            mmove += NORMAL_SPEED;
        }
    }
    return mmove;
}

export function distfleeck(mtmp) {
    // C ref: monmove.c:538
    // boolean sawscary = FALSE, bravegremlin = (rn2(5) == 0);
    const targetX = mtmp.mux ?? game.u?.ux ?? mtmp.mx;
    const targetY = mtmp.muy ?? game.u?.uy ?? mtmp.my;
    rn2(5); // bravegremlin check

    const d2 = dist2(mtmp.mx, mtmp.my, targetX, targetY);
    return {
        inrange: d2 <= BOLT_LIM * BOLT_LIM,
        nearby: monnear_basic(mtmp, targetX, targetY),
        // Elbereth, sanctuary, and light-fleeing behavior are not modeled yet.
        scared: false,
    };
}

function is_wanderer(mtmp) {
    // C ref: mondata.h:is_wanderer() checks M2_WANDER; explicit pet data
    // still marks startup pet records created before full monster data.
    return !!mtmp.data?.m2_wander || !!(mtmp.data?.mflags2 & M2_WANDER);
}

function no_diagonal_movement(mtmp) {
    // C ref: hack.h:NODIAG().
    return mtmp.data?.name === 'GRID_BUG';
}

function dist2(x0, y0, x1, y1) {
    const dx = x0 - x1;
    const dy = y0 - y1;
    return dx * dx + dy * dy;
}

function monnear_basic(mtmp, x, y) {
    // C ref: src/mon.c:monnear().  Grid bugs use NODIAG(), so diagonal
    // adjacency is not close enough for movement or melee reach.
    const distance = dist2(mtmp.mx, mtmp.my, x, y);
    if (distance === 2 && no_diagonal_movement(mtmp)) return false;
    return distance < 3;
}

function online2_basic(x0, y0, x1, y1) {
    const dx = x0 - x1;
    const dy = y0 - y1;
    return !dy || !dx || dy === dx || dy === -dx;
}

function monnear_hero(mtmp) {
    // C ref: mon.c:monnear().  dochug() short-circuits before the
    // is_wanderer() RNG gate when the pet is not near its target.
    return monnear_basic(mtmp, game.u?.ux ?? mtmp.mx, game.u?.uy ?? mtmp.my);
}

function move_mon_to_basic(mtmp, x, y) {
    const omx = mtmp.mx;
    const omy = mtmp.my;
    mtmp.mx = x;
    mtmp.my = y;
    newsym(omx, omy);
    newsym(x, y);
}

async function tele_restrict_basic(mtmp) {
    // C ref: teleport.c:tele_restrict().
    if (!game.level?.flags?.noteleport) return false;
    if (mtmp && cansee(mtmp.mx, mtmp.my)) {
        const line = `A mysterious force prevents the ${monster_name(mtmp)} from teleporting!`;
        if (game._more && game._pending_message) {
            game._after_more_message = line;
            game._after_more_needs_prompt = false;
            game._monster_turn_paused_for_more = true;
            game._resume_tengu_after_tele_restrict = mtmp;
            if (!game._latched_more_screen) {
                flush_deferred_warning_redraws();
                await flush_screen(1);
                game._latched_more_screen = serialize_terminal_grid(game.nhDisplay);
                game._latched_more_keep_until_dismiss = true;
                game._latched_more_cursor = [
                    game.nhDisplay?.cursorCol ?? Math.min(`${game._pending_message || ''}--More--`.length, 79),
                    game.nhDisplay?.cursorRow ?? 0,
                ];
            }
            return true;
        }
        const hadPending = !!game._pending_message;
        await pline(line);
        if (hadPending) {
            if (!game._more) queue_more_prompt();
            else game._more_dismissals_remaining = 1;
            game._scan_more_from_tele_restrict = true;
            if (!game._latched_more_screen) {
                await flush_screen(1);
                game._latched_more_screen = serialize_terminal_grid(game.nhDisplay);
                game._latched_more_keep_until_dismiss = true;
                game._latched_more_cursor = [
                    game.nhDisplay?.cursorCol ?? Math.min(`${game._pending_message || ''}--More--`.length, 79),
                    game.nhDisplay?.cursorRow ?? 0,
                ];
            }
        }
    }
    return true;
}

function rloc_pos_ok_basic(x, y, mtmp) {
    if (!isok(x, y)) return false;
    return can_mon_step(mtmp, x, y);
}

function rloc_basic(mtmp) {
    // C ref: teleport.c:rloc(). Try random level positions before a
    // randomized exhaustive fallback.
    for (let trycount = 0; trycount < 50; trycount++) {
        const x = rnd(COLNO - 1);
        const y = rn2(ROWNO);
        if (rloc_pos_ok_basic(x, y, mtmp)) {
            move_mon_to_basic(mtmp, x, y);
            return true;
        }
    }

    const candidates = [];
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            if (rloc_pos_ok_basic(x, y, mtmp)) candidates.push({ x, y });
        }
    }
    for (let i = 0; i < candidates.length; i++) {
        const j = rn2(candidates.length - i);
        if (j) [candidates[i], candidates[i + j]] = [candidates[i + j], candidates[i]];
        const cand = candidates[i];
        if (rloc_pos_ok_basic(cand.x, cand.y, mtmp)) {
            move_mon_to_basic(mtmp, cand.x, cand.y);
            return true;
        }
    }
    return false;
}

function mnexto_basic(mtmp) {
    // C ref: mon.c:mnexto().
    const spot = enexto_core(game.u?.ux ?? mtmp.mx, game.u?.uy ?? mtmp.my, mtmp.data, GP_CHECKSCARY)
        || enexto_core(game.u?.ux ?? mtmp.mx, game.u?.uy ?? mtmp.my, mtmp.data, 0);
    if (!spot) return false;
    move_mon_to_basic(mtmp, spot.x, spot.y);
    return true;
}

function apparxy_accessible_basic(mtmp, x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    // C refs: monmove.c:set_apparxy(), monmove.c:accessible().  The helper
    // uses rm.h:ACCESSIBLE(SURFACE_AT), then excludes closed/locked doors.
    if (mon_passes_walls(mtmp)) return true;
    if (ACCESSIBLE(loc.typ) && !closed_door_basic(x, y)) return true;
    return closed_door_basic(x, y) && (can_ooze_basic(mtmp) || can_fog_basic(mtmp));
}

function set_apparxy_basic(mtmp) {
    // C ref: monmove.c:set_apparxy().  Monsters remember an apparent hero
    // square; displacement can move that image and consumes RNG before
    // distfleeck()/m_move() use mtmp->mux,muy.
    const ux = game.u?.ux ?? mtmp.mx;
    const uy = game.u?.uy ?? mtmp.my;
    let mx = Number.isFinite(mtmp.mux) ? mtmp.mux : 0;
    let my = Number.isFinite(mtmp.muy) ? mtmp.muy : 0;
    if (mtmp.mtame || game.u?.ustuck === mtmp || (mx === ux && my === uy)) {
        mtmp.mux = ux;
        mtmp.muy = uy;
        return;
    }

    const notseen = mtmp.mcansee === 0
        || (game.u?.uinvis && !monster_perceives_invisible(mtmp));
    const notthere = !!game.u?.uprops?.displaced && mtmp.data?.name !== 'DISPLACER_BEAST';
    let displ = 0;
    if (game.u?.uprops?.underwater || game.u?.underwater || game.Underwater) displ = 1;
    else if (notseen) displ = 1;
    else if (notthere) displ = couldsee(mx, my) ? 2 : 1;
    if (!displ) {
        mtmp.mux = ux;
        mtmp.muy = uy;
        return;
    }

    const gotu = notseen ? !rn2(3) : notthere ? !rn2(4) : false;
    if (gotu) {
        mtmp.mux = ux;
        mtmp.muy = uy;
        return;
    }

    for (let tryCnt = 1; tryCnt <= 200; tryCnt++) {
        mx = ux - displ + rn2(2 * displ + 1);
        my = uy - displ + rn2(2 * displ + 1);
        const blockedSelf = displ !== 2 && mx === mtmp.mx && my === mtmp.my;
        const accessible = (mx === ux && my === uy) || mon_passes_walls(mtmp)
            || apparxy_accessible_basic(mtmp, mx, my);
        const seen = couldsee(mx, my);
        if (!isok(mx, my)) continue;
        if (blockedSelf) continue;
        if (!accessible) continue;
        if (!seen) continue;
        mtmp.mux = mx;
        mtmp.muy = my;
        return;
    }
    mtmp.mux = ux;
    mtmp.muy = uy;
}

function can_track_basic(ptr) {
    // C ref: mondata.c:can_track() normally delegates to haseyes().
    // Excalibur awareness is future hero-equipment work.
    return !((ptr?.mflags1 ?? 0) & M1_NOEYES);
}

function monster_perceives_invisible(mtmp) {
    return !!((mtmp.data?.mflags1 ?? 0) & M1_SEE_INVIS);
}

function hero_invisible_basic() {
    return !!(game.u?.uinvis || game.u?.Invis || game.u?.uprops?.invisible);
}

function m_canseeu_basic(mtmp) {
    // C ref: vision.h:m_canseeu(). Invisibility, perceives(), underwater,
    // and buried state are not modeled yet for current movement evidence.
    const ux = game.u?.ux;
    const uy = game.u?.uy;
    if (!Number.isFinite(ux) || !Number.isFinite(uy)) return false;
    return couldsee(mtmp.mx, mtmp.my) && clear_path(mtmp.mx, mtmp.my, ux, uy);
}

function monster_should_see_target(mtmp, omx, omy, ggx, ggy) {
    // C ref: monmove.c:m_move() should_see predicate before gettrack().
    const originLoc = game.level?.at(omx, omy);
    const targetLoc = game.level?.at(ggx, ggy);
    return couldsee(omx, omy)
        && (!!targetLoc?.lit || !originLoc?.lit)
        && dist2(omx, omy, ggx, ggy) <= 36;
}

function is_hider(mtmp) {
    return !!(mtmp.data?.mflags1 & M1_HIDE);
}

function restrap_basic(mtmp) {
    // C ref: mon.c:restrap().  The RNG gate is before the trapped/ceiling
    // and adjacency exclusions.
    if (mtmp.mcan || mtmp.m_ap_type || cansee(mtmp.mx, mtmp.my)) return false;
    if (rn2(3)) return false;
    if (game.u?.ustuck === mtmp) return false;
    const trap = trap_at_basic(mtmp.mx, mtmp.my);
    if (mtmp.mtrapped && trap && !is_pit(trap.ttyp)) return false;
    if (dist2(mtmp.mx, mtmp.my, game.u?.ux ?? 0, game.u?.uy ?? 0) < 3) return false;
    if (mtmp.data?.mlet === 'S_MIMIC') return false;
    const loc = game.level?.at(mtmp.mx, mtmp.my);
    if (loc?.typ === ROOM && (loc.roomno ?? 0) > 0) {
        mtmp.mundetected = 1;
        return true;
    }
    return false;
}

function hides_under_basic(mtmp) {
    return !!(mtmp.data?.mflags1 & M1_CONCEAL);
}

function can_hide_under_object_basic(x, y) {
    const obj = (game.level?.objects || []).find((item) => item.ox === x && item.oy === y);
    if (!obj) return false;
    const trap = (game.level?.traps || []).find((ttmp) => ttmp.tx === x && ttmp.ty === y);
    return !trap || is_pit(trap.ttyp);
}

function hideunder_basic(mtmp) {
    // C ref: mon.c:hideunder().  Keep the side effect conservative: eels hide
    // in pool squares; concealers hide under eligible floor objects.
    let undetected = false;
    const loc = game.level?.at(mtmp.mx, mtmp.my);
    if (mtmp.data?.mlet === 'S_EEL') {
        undetected = !!loc && IS_POOL(loc.typ);
    } else if (hides_under_basic(mtmp) && can_hide_under_object_basic(mtmp.mx, mtmp.my)
               && !IS_POOL(loc?.typ) && !IS_LAVA(loc?.typ)) {
        undetected = true;
    }
    const old = !!mtmp.mundetected;
    mtmp.mundetected = undetected ? 1 : 0;
    if (old !== !!mtmp.mundetected) newsym(mtmp.mx, mtmp.my);
    return undetected;
}

function maybe_unhide_at_basic(mtmp) {
    if (!mtmp.mundetected) return;
    const loc = game.level?.at(mtmp.mx, mtmp.my);
    const shouldRecheck = (hides_under_basic(mtmp) && !can_hide_under_object_basic(mtmp.mx, mtmp.my))
        || (mtmp.data?.mlet === 'S_EEL' && !IS_POOL(loc?.typ));
    if (shouldRecheck) hideunder_basic(mtmp);
}

function postmove_hide_under_or_eel_basic(mtmp) {
    if (!hides_under_basic(mtmp) && mtmp.data?.mlet !== 'S_EEL') return;
    // C ref: monmove.c:postmov() re-hide gate after moved/done monsters.
    if (mtmp.mundetected || ((mtmp.mcanmove !== 0 && !mtmp.msleeping) && rn2(5))) {
        hideunder_basic(mtmp);
    }
    newsym(mtmp.mx, mtmp.my);
}

function wearing_ring_basic(otyp) {
    return (game.inventory || []).some((obj) => obj?.otyp === otyp
        && (obj.wornSide || ((obj.owornmask || 0) & W_RING)));
}

function hero_has_stealth_basic() {
    return !!game.u?.uprops?.stealth || wearing_ring_basic(RIN_STEALTH);
}

function hero_aggravates_monsters_basic() {
    return !!(game.u?.uprops?.monster_aggravation || game.u?.uprops?.aggravate_monster)
        || wearing_ring_basic(RIN_AGGRAVATE_MONSTER);
}

function monster_appearance_type(mtmp) {
    return (mtmp?.m_ap_type || 0) & 0x7;
}

async function disturb_basic(mtmp) {
    // C ref: monmove.c:disturb().  Sleeping monsters can consume wake-up
    // RNG before the normal dochug() targeting and movement path.
    if (!couldsee(mtmp.mx, mtmp.my)) return false;
    if (dist2(mtmp.mx, mtmp.my, game.u?.ux ?? 0, game.u?.uy ?? 0) > 100) return false;
    if (hero_has_stealth_basic() && (mtmp.data?.name !== 'ETTIN' || !rn2(10))) return false;
    if ((mtmp.data?.mlet === 'S_NYMPH'
        || mtmp.data?.name === 'JABBERWOCK'
        || mtmp.data?.mlet === 'S_LEPRECHAUN')
        && rn2(50)) return false;
    const appear = monster_appearance_type(mtmp);
    if (!(hero_aggravates_monsters_basic()
        || mtmp.data?.mlet === 'S_DOG'
        || mtmp.data?.mlet === 'S_HUMAN'
        || (!rn2(7) && appear !== M_AP_FURNITURE && appear !== M_AP_OBJECT))) {
        return false;
    }
    if (trap_mon_visible(mtmp)) {
        const suffix = mtmp.mpeaceful ? '.' : '!';
        const extra = mtmp.data?.name === 'FLESH_GOLEM' ? " It's alive!" : '';
        await append_monster_topline(`The ${monster_name(mtmp)} wakes up${suffix}${extra}`);
    }
    mtmp.msleeping = 0;
    return true;
}

function non_tame_movement_opportunity(mtmp, state) {
    // C ref: monmove.c:dochug() movement-opportunity predicate before
    // m_move().  Only the front-door predicates represented in JS state are
    // modeled here; far-away monsters take the no-RNG short-circuit.
    if (!state.nearby || mtmp.mflee || state.scared || mtmp.mconf || mtmp.mstun) return true;
    if (mtmp.minvis && !rn2(3)) return true;
    if (is_wanderer(mtmp) && !rn2(4)) return true;
    if (mtmp.mcansee === 0 && !rn2(4)) return true;
    if (mtmp.mpeaceful) return true;
    return false;
}

function can_tunnel_basic(mtmp) {
    const flags1 = mtmp.data?.mflags1 ?? 0;
    if (!(flags1 & M1_TUNNEL)) return false;
    const targetX = mtmp.mux ?? game.u?.ux ?? mtmp.mx;
    const targetY = mtmp.muy ?? game.u?.uy ?? mtmp.my;
    // C ref: mon.c:mon_allowflags().  Hostile pick-using tunnellers near
    // their target prefer a weapon instead of digging.
    if ((flags1 & M1_NEEDPICK)
        && !mtmp.mpeaceful && dist2(mtmp.mx, mtmp.my, targetX, targetY) <= 8) return false;
    return true;
}

function mon_has_dig_tool_basic(mtmp, predicate) {
    const mw = mtmp.mw || null;
    if (mw && predicate(mw)) return true;
    return (mtmp.inventory || []).some((obj) => predicate(obj));
}

function can_tunnel_at_basic(mtmp, x, y) {
    if (!can_tunnel_basic(mtmp)) return false;
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    const flags1 = mtmp.data?.mflags1 ?? 0;
    const needsPick = !!(flags1 & M1_NEEDPICK);
    const rockok = !needsPick || mon_has_dig_tool_basic(mtmp, (obj) => is_pick_weapon_for_mon_basic(mtmp, obj));
    const treeok = !needsPick || mon_has_dig_tool_basic(mtmp, is_axe_weapon_basic);
    if (IS_STWALL(loc.typ)) return rockok && may_dig_basic(x, y);
    if (loc.typ === SDOOR) return rockok;
    if (IS_TREE(loc.typ)) return treeok && may_dig_basic(x, y);
    if (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) {
        if (loc.doormask & D_LOCKED) return rockok || treeok;
        return mon_can_open_doors(mtmp) || rockok || treeok;
    }
    return false;
}

function is_pick_weapon_basic(obj) {
    return obj?.otyp === PICK_AXE || obj?.otyp === DWARVISH_MATTOCK;
}

function is_pick_weapon_for_mon_basic(mtmp, obj) {
    return obj?.otyp === PICK_AXE
        || (obj?.otyp === DWARVISH_MATTOCK && !(mtmp.misc_worn_check & W_ARMS));
}

function is_axe_weapon_basic(obj) {
    return obj?.otyp === AXE || obj?.otyp === BATTLE_AXE;
}

async function m_digweapon_check_basic(mtmp, x, y) {
    // C ref: monmove.c:m_digweapon_check().  Pick-using tunnellers spend a
    // move wielding the needed tool before entering rock/tree/door terrain.
    if (!((mtmp.data?.mflags1 ?? 0) & M1_NEEDPICK)) return false;
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    const closedDoor = loc.typ === DOOR && !!(loc.doormask & (D_CLOSED | D_LOCKED));
    const diggableWall = IS_STWALL(loc.typ) && !(loc.wall_info & W_NONDIGGABLE);
    if (!closedDoor && !diggableWall) return false;
    const mw = mtmp.mw || null;
    if (closedDoor) {
        if (!mw || (!is_pick_weapon_for_mon_basic(mtmp, mw) && !is_axe_weapon_basic(mw))) {
            mtmp.weapon_check = NEED_PICK_OR_AXE;
        }
    } else if (!mw || !is_pick_weapon_for_mon_basic(mtmp, mw)) {
        mtmp.weapon_check = NEED_PICK_AXE;
    }
    return mtmp.weapon_check >= NEED_PICK_AXE && await mon_wield_item_basic(mtmp);
}

function mon_at(x, y, self) {
    return (game.level?.monsters || []).find((mon) =>
        mon !== self && mon !== game.u?.usteed && mon.mx === x && mon.my === y);
}

function closed_door_basic(x, y) {
    const loc = game.level?.at(x, y);
    return !!(loc && IS_DOOR(loc.typ) && (loc.doormask & (D_LOCKED | D_CLOSED)));
}

function mon_in_air(mtmp) {
    const flags1 = mtmp.data?.mflags1 ?? 0;
    return !!(flags1 & M1_FLY)
        || mon_is_floater(mtmp)
        || (!!(flags1 & M1_CLING) && !!mtmp.mundetected);
}

function mon_swims(mtmp) {
    return !!((mtmp.data?.mflags1 ?? 0) & M1_SWIM) || !!mtmp.data?.swimmer;
}

function mon_passes_walls(mtmp) {
    return !!((mtmp.data?.mflags1 ?? 0) & M1_WALLWALK);
}

function monster_inventory_basic(mtmp) {
    return mtmp.minvent || mtmp.inventory || mtmp.invent || [];
}

function stuff_prevents_passage_basic(mtmp) {
    return monster_inventory_basic(mtmp).length > 0;
}

function can_ooze_basic(mtmp) {
    return !!((mtmp.data?.mflags1 ?? 0) & M1_AMORPHOUS)
        && !stuff_prevents_passage_basic(mtmp);
}

function can_fog_basic(mtmp) {
    return vampire_shifter_base(mtmp.cham || mtmp.data)
        && !game.u?.uprops?.protection_from_shape_changers
        && !stuff_prevents_passage_basic(mtmp);
}

function mon_can_open_doors(mtmp) {
    return !((mtmp.data?.mflags1 ?? 0) & M1_NOHANDS);
}

function mon_likes_lava(mtmp) {
    return !!mtmp.data?.likes_lava;
}

function resists_fire_basic(mtmp) {
    return !!((mtmp?.data?.mresists ?? 0) & MR_FIRE);
}

function resists_magic_missile_basic(mtmp) {
    return (mtmp?.data?.mattk || []).some((attack) =>
        attack?.[1] === 'AD_MAGM' || attack?.[1] === 'AD_RBRE')
        || mtmp?.data?.name === 'BABY_GRAY_DRAGON';
}

function warning_active_for_mon_basic(mtmp, x = mtmp?.mx, y = mtmp?.my) {
    if (!mtmp || !game.u?.uprops?.warning || mtmp.mpeaceful) return false;
    if (dist2(game.u?.ux ?? 0, game.u?.uy ?? 0, x, y) >= 100) return false;
    const realLevel = Math.trunc((mtmp.m_lev ?? mtmp.data?.mlevel ?? 0) / 4);
    return realLevel >= (game.context?.warnlevel ?? 1);
}

function defer_warning_move_redraw_basic(mtmp, omx, omy, appr) {
    // C refs: display.c:display_warning(), display.c:show_glyph(),
    // allmain.c:moveloop_core(). Warning glyphs are floating display state;
    // off-screen monster moves are refreshed at the next input boundary.
    return appr === 1
        && !cansee(omx, omy)
        && !cansee(mtmp.mx, mtmp.my)
        && (warning_active_for_mon_basic(mtmp, omx, omy)
            || warning_active_for_mon_basic(mtmp, mtmp.mx, mtmp.my));
}

function defer_warning_redraw_square(x, y) {
    if (!isok(x, y)) return;
    game._deferred_warning_redraws = game._deferred_warning_redraws || [];
    if (!game._deferred_warning_redraws.some((pt) => pt.x === x && pt.y === y))
        game._deferred_warning_redraws.push({ x, y });
}

export function flush_deferred_warning_redraws() {
    const pending = game._deferred_warning_redraws || [];
    if (!pending.length) return;
    game._deferred_warning_redraws = [];
    for (const pt of pending) newsym(pt.x, pt.y);
}

function minliquid_basic(mtmp) {
    const loc = game.level?.at(mtmp.mx, mtmp.my);
    if (!loc || !IS_LAVA(loc.typ)) return false;
    // C ref: mon.c:minliquid() / minliquid_core(). Grounded monsters which
    // neither cling over nor like lava burn before dochugw()/distfleeck().
    if (mon_in_air(mtmp) || mon_likes_lava(mtmp)) return false;
    if (resists_fire_basic(mtmp)) {
        mtmp.mhp = (mtmp.mhp ?? 1) - 1;
        if ((mtmp.mhp ?? 0) > 0) return false;
    }
    remove_dead_monster(mtmp);
    return true;
}

function may_passwall(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    // C ref: hack.c:may_passwall() only blocks special wall types that
    // explicitly carry W_NONPASSWALL.
    return !(IS_STWALL(loc.typ) && (loc.wall_info & W_NONPASSWALL));
}

function may_dig_basic(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    // C ref: hack.c:may_dig().  This helper is intentionally permissive:
    // it returns true for non-rock terrain, so monmove.c:postmov() can enter
    // mdig_tunnel() and let that routine decide that there is no digging.
    return !((IS_STWALL(loc.typ) || IS_TREE(loc.typ))
        && (loc.wall_info & W_NONDIGGABLE));
}

function engr_at_basic(x, y) {
    return (game.level?.engravings || []).find((ep) => ep.x === x && ep.y === y) || null;
}

function wipe_engr_at_basic(x, y, cnt, magical = false) {
    const ep = engr_at_basic(x, y);
    if (!ep || ep.type === HEADSTONE || ep.nowipeout) return;
    if (ep.type === BURN && !magical) return;
    if (ep.type !== DUST && ep.type !== ENGR_BLOOD) {
        cnt = rn2(1 + Math.trunc(50 / (cnt + 1))) ? 0 : 1;
    }
    if (cnt <= 0) return;
    ep.text = String(ep.text || '').slice(cnt);
    if (!ep.text) {
        const list = game.level?.engravings || [];
        const idx = list.indexOf(ep);
        if (idx >= 0) list.splice(idx, 1);
    }
}

function mfndpos_terrain_ok(mtmp, x, y) {
    if (!isok(x, y)) return false;
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    const typ = loc.typ;
    const passwallOk = IS_OBSTRUCTED(typ) && mon_passes_walls(mtmp) && may_passwall(x, y);

    // C ref: mon.c:mfndpos().  Obstructed rock/walls are blocked unless
    // the monster has ALLOW_WALL-style phasing. Digging remains future work.
    if (IS_OBSTRUCTED(typ) && !passwallOk) return false;
    if (IS_WATERWALL(typ) && !mon_swims(mtmp)) return false;
    if (IS_DOOR(typ)) {
        if (loc.doormask & D_LOCKED) return false;
        if (loc.doormask & D_CLOSED) return mon_can_open_doors(mtmp);
        return true;
    }

    const wantpool = mtmp.data?.mlet === 'S_EEL';
    const poolok = mon_in_air(mtmp) || (mon_swims(mtmp) && !wantpool);
    const lavaok = mon_in_air(mtmp) || mon_likes_lava(mtmp);
    if (!poolok && (IS_POOL(typ) !== wantpool)) return false;
    if (!lavaok && IS_LAVA(typ)) return false;
    return passwallOk || SPACE_POS(typ) || IS_POOL(typ) || IS_LAVA(typ);
}

function can_mon_step(mtmp, x, y) {
    if (x === game.u?.ux && y === game.u?.uy) return !mtmp.mpeaceful && !mtmp.mtame;
    if (mon_at(x, y, mtmp)) return false;
    // C ref: mon.c:mfndpos()/mon_allowflags(). Boulder squares are not
    // ordinary movement candidates unless the monster has ALLOW_ROCK.
    if (boulder_at(x, y) && !mon_allows_boulder_square(mtmp)) return false;
    if (!trap_candidate_ok_basic(mtmp, x, y)) return false;
    return mfndpos_terrain_ok(mtmp, x, y);
}

function trap_candidate_ok_basic(mtmp, x, y) {
    const trap = trap_at_basic(x, y);
    if (!trap) return true;
    // C ref: mon.c:mfndpos(). Tame monsters get ALLOW_TRAPS; ordinary
    // monsters avoid trap types they have learned unless the trap is harmless.
    if (mtmp.mtame) return true;
    if (m_harmless_trap_basic(mtmp, trap)) return true;
    return !mon_knows_traps_basic(mtmp, trap.ttyp);
}

function m_harmless_trap_basic(mtmp, trap) {
    // C ref: trap.c:m_harmless_trap().
    if (!trap) return true;
    if (!is_sokoban_level_basic() && floor_trigger_trap_basic(trap.ttyp) && mon_in_air(mtmp))
        return true;
    switch (trap.ttyp) {
    case BEAR_TRAP:
        return (mtmp.data?.msize ?? 2) <= MZ_SMALL
            || mon_is_amorphous(mtmp)
            || mon_is_whirly(mtmp)
            || mon_is_unsolid(mtmp);
    case SLP_GAS_TRAP:
        return resists_sleep_basic(mtmp);
    case RUST_TRAP:
        return mtmp.data?.name !== 'IRON_GOLEM';
    case FIRE_TRAP:
        return resists_fire_basic(mtmp);
    case PIT:
    case SPIKED_PIT:
    case HOLE:
    case TRAPDOOR:
        return !!(mtmp.data?.mflags1 & M1_CLING) && !is_sokoban_level_basic();
    case WEB:
        return mon_is_amorphous(mtmp)
            || webmaker_basic(mtmp)
            || mon_is_whirly(mtmp)
            || mon_is_unsolid(mtmp);
    case STATUE_TRAP:
    case MAGIC_TRAP:
    case VIBRATING_SQUARE:
        return true;
    case ANTI_MAGIC:
        return resists_magic_missile_basic(mtmp);
    default:
        return false;
    }
}

function mon_allows_boulder_square(mtmp) {
    const flags2 = mtmp.data?.mflags2 ?? 0;
    return !!(flags2 & M2_ROCKTHROW) || m_can_break_boulder_basic(mtmp);
}

function m_can_break_boulder_basic(mtmp) {
    return mtmp.data?.msound === MS_RIDER
        || (!mtmp.mspec_used
            && (mtmp.isshk || mtmp.ispriest || mtmp.data?.msound === MS_LEADER));
}

function door_blocks_diagonal(x, y) {
    const loc = game.level?.at(x, y);
    return loc && IS_DOOR(loc.typ) && (loc.doormask & ~D_BROKEN);
}

function distmin(x0, y0, x1, y1) {
    return Math.max(Math.abs(x0 - x1), Math.abs(y0 - y1));
}

function m_avoid_kicked_loc_basic(mtmp, nx, ny) {
    const kicked = game._kickedloc;
    if (!kicked || !isok(kicked.x, kicked.y)) return false;
    return (mtmp.mpeaceful || mtmp.mtame)
        && mtmp.mcansee !== 0
        && !mtmp.mconf && !mtmp.mstun
        && !game.u?.uprops?.conflict
        && nx === kicked.x && ny === kicked.y
        && dist2(nx, ny, game.u?.ux ?? nx, game.u?.uy ?? ny) <= 2;
}

function sgn(n) {
    return n < 0 ? -1 : n > 0 ? 1 : 0;
}

function linedup_blocking_terrain(x, y) {
    if (!isok(x, y)) return true;
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    if (IS_OBSTRUCTED(loc.typ) || IS_WATERWALL(loc.typ) || loc.typ === LAVAWALL) return true;
    if (IS_DOOR(loc.typ) && (loc.doormask & (D_CLOSED | D_LOCKED))) return true;
    return false;
}

function lined_up_basic(mtmp) {
    const tx = mtmp.mux ?? game.u?.ux ?? mtmp.mx;
    const ty = mtmp.muy ?? game.u?.uy ?? mtmp.my;
    const tbx = tx - mtmp.mx;
    const tby = ty - mtmp.my;
    // C ref: src/mthrowu.c:m_lined_up().  The Upolyd concealment gate rolls
    // before linedup() checks geometry or whether the hero is mimicking.
    if (game.u?._poly_form) rn2(25);
    if (!tbx && !tby) return false;
    if ((tbx && tby && Math.abs(tbx) !== Math.abs(tby))
        || distmin(tbx, tby, 0, 0) >= BOLT_LIM) return false;

    const targetIsActualHero = tx === game.u?.ux && ty === game.u?.uy;
    if (targetIsActualHero ? couldsee(mtmp.mx, mtmp.my) : clear_path(tx, ty, mtmp.mx, mtmp.my))
        return true;

    // C ref: mthrowu.c:linedup().  Hero-targeted line checks can be blocked
    // only by boulders; with conditional boulder handling this still rolls
    // rn2(2 + boulderspots), even when boulderspots is zero.
    const dx = sgn(tbx);
    const dy = sgn(tby);
    let x = mtmp.mx;
    let y = mtmp.my;
    let boulderspots = 0;
    do {
        x += dx;
        y += dy;
        if (linedup_blocking_terrain(x, y)) return false;
        if (boulder_at(x, y)) boulderspots++;
    } while (x !== tx || y !== ty);
    return rn2(2 + boulderspots) < 2;
}

function hero_throw_range_basic() {
    const str = game.u?.ustr ?? game.u?.strength ?? 12;
    return Math.trunc(str / 2) + 1;
}

function object_class(obj) {
    return obj?.oclass || OBJECT_CLASS[obj?.otyp] || 0;
}

function objects_at(x, y) {
    return (game.level?.objects || []).filter((obj) => obj.ox === x && obj.oy === y);
}

function boulder_at(x, y) {
    return objects_at(x, y).some((obj) => obj.otyp === BOULDER);
}

function could_reach_item(mtmp, x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    if (IS_POOL(loc.typ) && !mon_swims(mtmp) && !mon_in_air(mtmp)) return false;
    if (IS_LAVA(loc.typ) && !mon_likes_lava(mtmp) && !mon_in_air(mtmp)) return false;
    return true;
}

function mon_can_see_square(mtmp, x, y) {
    return clear_path(mtmp.mx, mtmp.my, x, y);
}

function mon_is_mindless(mtmp) {
    return !!((mtmp.data?.mflags1 ?? 0) & M1_MINDLESS);
}

function mon_is_animal(mtmp) {
    return !!((mtmp.data?.mflags1 ?? 0) & M1_ANIMAL);
}

function mon_is_ghost(mtmp) {
    return mtmp.data?.name === 'GHOST';
}

function mon_has_attack_type(mtmp, atyp) {
    return (mtmp.data?.mattk || []).some((attack) => attack?.[0] === atyp);
}

function ranged_attk_available_basic(mtmp) {
    // C ref: mhitu.c:ranged_attk_available().  m_seenres() learning is
    // future work, so the current front door treats unseen resistance as no
    // blocker and only checks distance-capable attack rows.
    return (mtmp.data?.mattk || []).some((attack) => DISTANCE_ATTACK_TYPES.has(attack?.[0]));
}

function is_pole_basic(obj) {
    // C ref: obj.h:is_pole().  Full oc_skill data is not generated yet; this
    // covers the contiguous polearm object range used by current monster
    // init, plus lance-like evidence can be added when object skills land.
    return obj?.oclass === WEAPON_CLASS && obj.otyp >= PARTISAN && obj.otyp <= BEC_DE_CORBIN;
}

function autoreturn_range_basic(obj) {
    // C ref: weapon.c:autoreturn_weapon().  NetHack 5.0's only enabled
    // tethered return weapon is the aklys with (BOLT_LIM / 2)^2 range.
    return obj?.otyp === AKLYS ? 16 : 0;
}

function ammo_matches_launcher_basic(ammo, launcher) {
    if (!ammo || !launcher) return false;
    if (BOW_LAUNCHERS.includes(launcher.otyp)) return BOW_AMMO.has(ammo.otyp);
    if (launcher.otyp === CROSSBOW) return CROSSBOW_AMMO.has(ammo.otyp);
    return false;
}

function m_has_launcher_and_ammo_basic(mtmp) {
    // C ref: mthrowu.c:m_has_launcher_and_ammo().
    const mwep = mtmp.mw;
    if (![...BOW_LAUNCHERS, CROSSBOW].includes(mwep?.otyp)) return false;
    return (mtmp.inventory || []).some((obj) => ammo_matches_launcher_basic(obj, mwep));
}

function has_offensive_throw_item_basic(mtmp) {
    return (mtmp.inventory || []).some((obj) => {
        switch (obj?.otyp) {
        case POT_PARALYSIS:
        case POT_CONFUSION:
        case POT_SLEEPING:
        case POT_ACID:
            return true;
        case POT_BLINDNESS:
            return !mon_has_attack_type(mtmp, 'AT_GAZE');
        default:
            return false;
        }
    });
}

function m_balks_at_approaching_basic(oldappr, mtmp) {
    // C ref: monmove.c:m_balks_at_approaching().
    const edist = dist2(mtmp.mx, mtmp.my, mtmp.mux ?? game.u?.ux ?? mtmp.mx, mtmp.muy ?? game.u?.uy ?? mtmp.my);
    if (mtmp.mpeaceful || edist >= 25 || !m_canseeu_basic(mtmp)) {
        return { appr: oldappr, preferredMin: 0, preferredMax: 0 };
    }
    if (m_has_launcher_and_ammo_basic(mtmp) && !has_offensive_throw_item_basic(mtmp)) {
        return { appr: -1, preferredMin: 0, preferredMax: 0 };
    }
    const mwep = mtmp.mw;
    if (mwep && is_pole_basic(mwep) && edist <= MON_POLE_DIST) {
        return { appr: -1, preferredMin: 0, preferredMax: 0 };
    }
    const returnRange = autoreturn_range_basic(mwep);
    if (returnRange) return { appr: -2, preferredMin: 4, preferredMax: returnRange };
    if (ranged_attk_available_basic(mtmp)
        && ((mtmp.mhp ?? 1) < Math.trunc(((mtmp.mhpmax ?? mtmp.mhp ?? 1) + 1) / 3)
            || !mtmp.mspec_used)) {
        return { appr: -1, preferredMin: 0, preferredMax: 0 };
    }
    return { appr: oldappr, preferredMin: 0, preferredMax: 0 };
}

function hth_weapon_candidate(mtmp) {
    // C ref: src/weapon.c:select_hwep().  Projectile-only weapons such as
    // arrows, darts, shuriken, boomerangs, and launchers are ranged
    // candidates, not hand-to-hand wield choices.
    return (mtmp.inventory || []).find((obj) => object_class(obj) === WEAPON_CLASS
        && !NON_HTH_WEAPONS.has(obj.otyp));
}

function pick_weapon_candidate(mtmp) {
    return (mtmp.inventory || []).find((obj) => obj?.otyp === PICK_AXE)
        || (!(mtmp.misc_worn_check & W_ARMS)
            ? (mtmp.inventory || []).find((obj) => obj?.otyp === DWARVISH_MATTOCK)
            : null);
}

function axe_weapon_candidate(mtmp) {
    return (mtmp.inventory || []).find((obj) => obj?.otyp === BATTLE_AXE)
        || (mtmp.inventory || []).find((obj) => obj?.otyp === AXE);
}

function pick_or_axe_weapon_candidate(mtmp) {
    return (!(mtmp.misc_worn_check & W_ARMS)
        ? ((mtmp.inventory || []).find((obj) => obj?.otyp === DWARVISH_MATTOCK)
            || (mtmp.inventory || []).find((obj) => obj?.otyp === BATTLE_AXE))
        : null)
        || (mtmp.inventory || []).find((obj) => obj?.otyp === PICK_AXE)
        || (mtmp.inventory || []).find((obj) => obj?.otyp === AXE);
}

function monster_carrying_basic(mtmp, otyp) {
    return (mtmp.inventory || []).find((obj) => obj?.otyp === otyp) || null;
}

function first_monster_carried_basic(mtmp, predicate) {
    return (mtmp.inventory || []).find((obj) => predicate(obj)) || null;
}

function launcher_for_projectile_basic(mtmp, projectile) {
    if (!projectile) return null;
    if (BOW_AMMO.has(projectile.otyp)) {
        for (const otyp of BOW_LAUNCHERS) {
            const launcher = monster_carrying_basic(mtmp, otyp);
            if (launcher) return launcher;
        }
        return null;
    }
    if (CROSSBOW_AMMO.has(projectile.otyp)) {
        for (const otyp of CROSSBOW_LAUNCHERS) {
            const launcher = monster_carrying_basic(mtmp, otyp);
            if (launcher) return launcher;
        }
    }
    return null;
}

function ranged_weapon_candidate(mtmp) {
    // C ref: src/weapon.c:select_rwep().  The full preference table is larger;
    // this covers launcher-backed arrows/bolts plus the existing thrown
    // dagger/dart subset.
    const arrow = first_monster_carried_basic(mtmp, (obj) => BOW_AMMO.has(obj?.otyp));
    if (arrow && launcher_for_projectile_basic(mtmp, arrow)) return arrow;
    const bolt = first_monster_carried_basic(mtmp, (obj) => CROSSBOW_AMMO.has(obj?.otyp));
    if (bolt && launcher_for_projectile_basic(mtmp, bolt)) return bolt;
    if (mtmp.mw?.otyp === ORCISH_DAGGER || mtmp.mw?.otyp === DART) return mtmp.mw;
    return first_monster_carried_basic(mtmp, (obj) => obj?.otyp === ORCISH_DAGGER || obj?.otyp === DART) || null;
}

function ranged_launcher_candidate(mtmp) {
    return launcher_for_projectile_basic(mtmp, ranged_weapon_candidate(mtmp));
}

function offensive_item_candidate_basic(mtmp) {
    // C ref: muse.c:find_offensive().  The nomore() checks are part of the
    // scan semantics: once a higher-priority choice is found, lower-priority
    // checks in later inventory objects are skipped.
    if (mtmp.mpeaceful || mon_is_animal(mtmp) || mon_is_mindless(mtmp)
        || ((mtmp.data?.mflags1 ?? 0) & M1_NOHANDS) || game.u?.uswallow) {
        return null;
    }
    if (!lined_up_basic(mtmp)) return null;
    let found = null;
    const nomore = (use) => found?.use === use;
    for (const obj of mtmp.inventory || []) {
        if (nomore('WAN_STRIKING')) continue;
        if (obj?.otyp === WAN_STRIKING && (obj.spe ?? 0) > 0) {
            found = { kind: 'wand', use: 'WAN_STRIKING', obj };
        }
        if (nomore('POT_PARALYSIS')) continue;
        if (obj?.otyp === POT_PARALYSIS && (game.context?.multi ?? 0) >= 0) {
            found = { kind: 'potion', use: 'POT_PARALYSIS', obj };
        }
        if (nomore('POT_BLINDNESS')) continue;
        if (obj?.otyp === POT_BLINDNESS && !mon_has_attack_type(mtmp, 'AT_GAZE')) {
            found = { kind: 'potion', use: 'POT_BLINDNESS', obj };
        }
        if (nomore('POT_CONFUSION')) continue;
        if (obj?.otyp === POT_CONFUSION) {
            found = { kind: 'potion', use: 'POT_CONFUSION', obj };
        }
        if (nomore('POT_SLEEPING')) continue;
        if (obj?.otyp === POT_SLEEPING) {
            found = { kind: 'potion', use: 'POT_SLEEPING', obj };
        }
        if (nomore('POT_ACID')) continue;
        if (obj?.otyp === POT_ACID) {
            found = { kind: 'potion', use: 'POT_ACID', obj };
        }
    }
    return found;
}

function offensive_potion_candidate_basic(mtmp) {
    const candidate = offensive_item_candidate_basic(mtmp);
    return candidate?.kind === 'potion' ? candidate.obj : null;
}

function misc_item_candidate_basic(mtmp) {
    // C ref: muse.c:find_misc().  Current evidence only needs the speed
    // wand branch, but the front-door predicates are shared with the broader
    // miscellaneous item subsystem.
    if (mon_is_animal(mtmp) || mon_is_mindless(mtmp)) return null;
    if (game.u?.uswallow && game.u?.ustuck === mtmp) return null;
    if (dist2(mtmp.mx, mtmp.my, mtmp.mux ?? game.u?.ux ?? mtmp.mx, mtmp.muy ?? game.u?.uy ?? mtmp.my) > 36)
        return null;
    if ((mtmp.data?.mflags1 ?? 0) & M1_NOHANDS) return null;

    let found = null;
    for (const obj of mtmp.inventory || []) {
        if (obj?.otyp === WAN_SPEED_MONSTER && (obj.spe ?? 0) > 0
            && mtmp.mspeed !== MFAST && !mtmp.isgd) {
            found = { kind: 'WAN_SPEED_MONSTER', obj };
        }
    }
    return found;
}

async function mzapwand_basic(mtmp, obj, self = false) {
    // C ref: muse.c:mzapwand().  Unseen wand use gives only near/far audio
    // feedback and decrements one charge.
    if (!obj || (obj.spe ?? 0) < 1) return false;
    game._last_mzapwand_topline_deferred = false;
    if (!cansee(mtmp.mx, mtmp.my)) {
        const range = couldsee(mtmp.mx, mtmp.my) ? BOLT_LIM + 1 : BOLT_LIM - 3;
        const udist = dist2(game.u?.ux ?? mtmp.mx, game.u?.uy ?? mtmp.my, mtmp.mx, mtmp.my);
        await pline(`You hear a ${udist <= range * range ? 'nearby' : 'distant'} zap.`);
        obj.dknown = false;
        obj.known = false;
    } else if (self) {
        game._last_mzapwand_topline_deferred =
            !await append_monster_topline(`${monster_subject(mtmp)} zaps itself with ${wand_display_name(obj)}!`);
    } else {
        game._last_mzapwand_topline_deferred =
            !await append_monster_topline(`${monster_subject(mtmp)} zaps ${wand_display_name(obj)}!`);
    }
    obj.spe -= 1;
    return true;
}

function mon_adjust_speed_basic(mtmp, adjust) {
    // C ref: worn.c:mon_adjust_speed().
    if (adjust > 0) {
        if (mtmp.permspeed === MSLOW) mtmp.permspeed = 0;
        else mtmp.permspeed = MFAST;
    } else if (adjust < 0) {
        if (mtmp.permspeed === MFAST) mtmp.permspeed = 0;
        else mtmp.permspeed = MSLOW;
    }
    mtmp.mspeed = mtmp.permspeed || 0;
}

async function maybe_use_misc_item_basic(mtmp) {
    const candidate = misc_item_candidate_basic(mtmp);
    if (!candidate) return false;
    if (candidate.kind === 'WAN_SPEED_MONSTER') {
        if (!await mzapwand_basic(mtmp, candidate.obj, true)) return false;
        mon_adjust_speed_basic(mtmp, 1);
        return true;
    }
    return false;
}

async function mon_wield_item_basic(mtmp) {
    let obj = null;
    let exclaim = true;
    if (mtmp.weapon_check === NEED_HTH_WEAPON) {
        obj = hth_weapon_candidate(mtmp);
    } else if (mtmp.weapon_check === NEED_RANGED_WEAPON) {
        // C ref: weapon.c:mon_wield_item() with NEED_RANGED_WEAPON uses
        // select_rwep()'s launcher result (gp.propellor).
        obj = ranged_launcher_candidate(mtmp);
    } else if (mtmp.weapon_check === NEED_PICK_AXE) {
        obj = pick_weapon_candidate(mtmp);
        exclaim = false;
    } else if (mtmp.weapon_check === NEED_AXE) {
        obj = axe_weapon_candidate(mtmp);
        exclaim = false;
    } else if (mtmp.weapon_check === NEED_PICK_OR_AXE) {
        obj = pick_or_axe_weapon_candidate(mtmp);
        exclaim = false;
    }
    if (!obj) {
        mtmp.weapon_check = NEED_WEAPON;
        return false;
    }
    if (mtmp.mw && mtmp.mw.otyp === obj.otyp) {
        mtmp.weapon_check = NEED_WEAPON;
        return false;
    }
    if (mtmp.mw) mtmp.mw.owornmask = (mtmp.mw.owornmask || 0) & ~W_WEP;
    mtmp.mw = obj;
    obj.owornmask = (obj.owornmask || 0) | W_WEP;
    mtmp.weapon_check = NEED_WEAPON;
    if (cansee(mtmp.mx, mtmp.my)) {
        // C ref: weapon.c:mon_wield_item() reports visible weapon changes via
        // Monnam(mon), which also consumes display RNG under Hallucination.
        await append_monster_topline(`${monster_subject(mtmp)} wields ${wield_object_name(obj)}${exclaim ? '!' : '.'}`);
    }
    return true;
}

function remove_monster_inventory_object(mtmp, obj) {
    if (!obj) return;
    if ((obj.quan ?? 1) > 1) {
        obj.quan--;
        return;
    }
    const inv = mtmp.inventory || [];
    const idx = inv.indexOf(obj);
    if (idx >= 0) inv.splice(idx, 1);
    if (mtmp.mw === obj) mtmp.mw = null;
    obj.owornmask = 0;
}

function monster_multishot_basic(mtmp, obj, mwep = null) {
    // C ref: src/mthrowu.c:monmulti().  This covers the stackable weapon
    // front door; launcher, class, and racial bonuses are future evidence.
    let multishot = 1;
    if ((obj?.quan ?? 1) > 1 && object_class(obj) === WEAPON_CLASS && !mtmp?.mconf) {
        multishot = rnd(multishot);
    }
    multishot = Math.min(obj?.quan ?? 1, multishot);
    return Math.max(1, multishot);
}

function split_monster_projectile(mtmp, obj) {
    if (!obj) return null;
    if ((obj.quan ?? 1) > 1) {
        const oldQuan = obj.quan ?? 1;
        const oldWeight = obj.owt;
        obj.quan--;
        if (typeof oldWeight === 'number') {
            obj.owt = Math.max(1, Math.round(oldWeight * obj.quan / oldQuan));
        }
        return {
            ...obj,
            quan: 1,
            o_id: next_ident(),
            owornmask: 0,
            owt: typeof oldWeight === 'number' ? Math.max(1, oldWeight - (obj.owt || 0)) : obj.owt,
        };
    }
    remove_monster_inventory_object(mtmp, obj);
    return obj;
}

function prepare_monster_projectile_for_floor(obj, x, y) {
    if (!obj) return;
    obj.ox = x;
    obj.oy = y;
    obj.owornmask = 0;
    obj.quan = 1;
    obj.ch = ')';
    obj.color = getObjectColor(obj.otyp) ?? obj.color ?? NO_COLOR;
}

function monster_projectile_article_name(obj) {
    const name = monster_weapon_name(obj);
    return `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`;
}

function monster_projectile_launch_verb(mtmp, obj) {
    return ammo_matches_launcher_basic(obj, mtmp.mw) ? 'shoots' : 'throws';
}

function monster_projectile_glyph_color(obj) {
    return getObjectColor(obj?.otyp) ?? obj?.color ?? NO_COLOR;
}

function damage_exclam_basic(damage) {
    // C ref: src/zap.c:exclam().
    return damage < 0 ? '?' : damage <= 4 ? '.' : '!';
}

function projectile_erosion(obj) {
    return Math.max(obj?.oeroded || 0, obj?.oeroded2 || 0, obj?.oeroded3 || 0);
}

function should_mulch_monster_projectile(obj) {
    // C ref: src/dothrow.c:should_mulch_missile().
    const ammo = BOW_AMMO.has(obj?.otyp) || CROSSBOW_AMMO.has(obj?.otyp);
    const missile = obj?.otyp === DART || obj?.otyp === SHURIKEN;
    if (!obj || (!ammo && !missile)) return false;
    const chance = 3 + projectile_erosion(obj) - (obj.spe || 0);
    let broken = chance > 1 ? !!rn2(chance) : !rn2(4);
    if (obj.blessed && !rn2(3)) broken = false;
    return broken;
}

export function monster_projectile_destroyed_by_hit(obj) {
    if (!should_mulch_monster_projectile(obj)) return false;
    rn2(100); // C ref: src/invent.c:delobj_core()/src/zap.c:obj_resists().
    return true;
}

function hero_thrown_object_catch_chance() {
    // C ref: src/mthrowu.c:u_catch_thrown_obj().
    const dex = game.u?.acurr?.a?.[A_DEX] ?? 10;
    const role = game.urole?.name?.m;
    const roleBonus = role === 'Monk' || role === 'Rogue' ? 20 : 0;
    return Math.max(1, 100 - dex - roleBonus);
}

function monster_thrown_hit_value(mtmp, obj) {
    // C ref: src/mthrowu.c:m_throw() default thrown-object branch.
    let hitv = 3 - distmin(game.u?.ux ?? mtmp.mx, game.u?.uy ?? mtmp.my, mtmp.mx, mtmp.my);
    if (hitv < -4) hitv = -4;
    return hitv + 8 + (obj?.spe || 0);
}

function monster_projectile_miss_message(obj, hitv, dieroll) {
    const onm = monster_projectile_article_name(obj);
    const uac = game.u?.uac ?? 10;
    if (uac + hitv <= dieroll - 2) {
        return `${sentence_case(onm)} misses you.`;
    }
    return `You are almost hit by ${onm}.`;
}

function hero_is_blind_basic() {
    return !!(game.u?.ublind || game.u?.blind || game.u?.uprops?.blind || game.u?.uprops?.blinded);
}

function verbose_messages_enabled_basic() {
    return game.flags?.verbose !== false;
}

function spit_venom_object_type(attack) {
    const adtyp = attack?.[1];
    return (adtyp === 'AD_BLND' || adtyp === 'AD_DRST') ? BLINDING_VENOM : ACID_VENOM;
}

function venom_article_name(obj) {
    const name = getObjectDescription(obj?.otyp) || 'splash of venom';
    return `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`;
}

function monster_spit_attack(mtmp) {
    return (mtmp.data?.mattk || []).find((attack) => attack?.[0] === 'AT_SPIT') || null;
}

function first_monster_on_throw_path(mtmp, dx, dy, range) {
    let x = mtmp.mx;
    let y = mtmp.my;
    for (let i = 0; i < range; i++) {
        x += dx;
        y += dy;
        const mon = mon_at(x, y, mtmp);
        if (mon) return { mon, x, y, steps: i + 1 };
        if (x === game.u?.ux && y === game.u?.uy) return { hero: true, x, y, steps: i + 1 };
    }
    return null;
}

async function throw_venom_at_hero_basic(mtmp, obj) {
    const tx = mtmp.mux ?? game.u?.ux ?? mtmp.mx;
    const ty = mtmp.muy ?? game.u?.uy ?? mtmp.my;
    const dx = sgn(tx - mtmp.mx);
    const dy = sgn(ty - mtmp.my);
    let range = distmin(mtmp.mx, mtmp.my, tx, ty);
    let x = mtmp.mx;
    let y = mtmp.my;
    while (range-- > 0) {
        x += dx;
        y += dy;
        if (x === game.u?.ux && y === game.u?.uy) {
            let hitv = 8;
            let damage = 0;
            if (obj?.otyp !== BLINDING_VENOM) {
                damage = Math.max(1, d(6, 6));
                hitv = 3 - distmin(game.u?.ux ?? mtmp.mx, game.u?.uy ?? mtmp.my, mtmp.mx, mtmp.my);
                if (hitv < -4) hitv = -4;
                hitv += 8 + (obj?.spe || 0);
            }
            const dieroll = rnd(20);
            const hitHero = (game.u?.uac ?? 10) + hitv > dieroll;
            if (hitHero) {
                const msg = (hero_is_blind_basic() || !verbose_messages_enabled_basic())
                    ? `You are hit${damage_exclam_basic(damage)}`
                    : `You are hit by ${venom_article_name(obj)}${damage_exclam_basic(damage)}`;
                await append_monster_effect_topline(msg);
                if (obj?.otyp === BLINDING_VENOM) {
                    const blindinc = rnd(25);
                    if (!hero_is_blind_basic()) await append_monster_effect_topline('The venom blinds you.');
                    game.u.ucreamed = Math.max(game.u?.ucreamed || 0, blindinc);
                    game.u.ublind = true;
                    game.u.uprops = game.u.uprops || {};
                    game.u.uprops.blind = Math.max(game.u.uprops.blind || 0, blindinc);
                    game.u.uprops.blinded = Math.max(game.u.uprops.blinded || 0, blindinc);
                } else {
                    apply_hero_damage(damage);
                    exercise(A_STR, false);
                }
                rn2(100); // C ref: src/mthrowu.c:drop_throw()->delobj().
                break;
            }
            const missMessage = (hero_is_blind_basic() || !verbose_messages_enabled_basic())
                ? 'It misses.'
                : monster_projectile_miss_message(obj, hitv, dieroll);
            rn2(5); // C ref: src/mthrowu.c:m_throw() forcehit gate after a hero miss.
            await append_monster_effect_topline(missMessage);
            rn2(100); // C ref: src/mthrowu.c:drop_throw()->delobj().
            break;
        }
        rn2(5); // C ref: src/mthrowu.c:m_throw() forcehit gate between flight squares.
    }
    if (game.context?.run) game.context.run = null;
    return true;
}

async function spitmu_basic(mtmp, attack) {
    // C refs: src/mhitu.c:mattacku(), src/mthrowu.c:spitmu()/spitmm().
    if (!lined_up_basic(mtmp)) return false;
    const tx = mtmp.mux ?? game.u?.ux ?? mtmp.mx;
    const ty = mtmp.muy ?? game.u?.uy ?? mtmp.my;
    const dist = distmin(mtmp.mx, mtmp.my, tx, ty);
    const obj = mksobj(spit_venom_object_type(attack), true, false);
    if (rn2(BOLT_LIM - dist)) return false;
    if (hero_can_spot_monster(mtmp)) await append_monster_topline(`${monster_subject(mtmp)} spits venom!`);
    return throw_venom_at_hero_basic(mtmp, obj);
}

async function throw_weapon_at_hero_basic(mtmp, obj) {
    const tx = mtmp.mux ?? game.u?.ux ?? mtmp.mx;
    const ty = mtmp.muy ?? game.u?.uy ?? mtmp.my;
    const dx = sgn(tx - mtmp.mx);
    const dy = sgn(ty - mtmp.my);
    const range = distmin(mtmp.mx, mtmp.my, tx, ty);
    const seenThrower = cansee(mtmp.mx, mtmp.my);
    monster_multishot_basic(mtmp, obj, mtmp.mw);
    const projectile = split_monster_projectile(mtmp, obj);
    if (!projectile) return false;

    if (seenThrower) {
        const line = `${monster_subject(mtmp)} ${monster_projectile_launch_verb(mtmp, projectile)} ${monster_projectile_article_name(projectile)}!`;
        if (game._pending_message) await append_pline(line);
        else await pline(line);
        queue_more_prompt();
        game._monster_attack_more_latched = true;
        game._monster_attack_pause_after_more = true;
    }

    const hit = first_monster_on_throw_path(mtmp, dx, dy, range);
    const emptyFlightSteps = hit ? Math.max(0, hit.steps - 1) : range;
    for (let i = 0; i < emptyFlightSteps; i++) rn2(5);
    if (hit?.mon) {
        const glyphX = hit.x - dx;
        const glyphY = hit.y - dy;
        if (seenThrower && isok(glyphX, glyphY))
            show_glyph_cell(glyphX, glyphY, ')', monster_projectile_glyph_color(projectile), false);
        // C ref: src/mthrowu.c:ohitmon(). The hit check precedes dmgval().
        rnd(20);
        const damage = monster_weapon_damage(projectile);
        if (typeof hit.mon.mhp === 'number') {
            const hp = hit.mon.mhp - damage;
            hit.mon.mhp = hit.mon.mtame ? Math.max(1, hp) : Math.max(0, hp);
        }
        const hitMessage = seenThrower
            ? `The ${monster_weapon_name(projectile)} hits the ${monster_name(hit.mon)}.`
            : 'It is hit.';
        const afterDx = dx || sgn((mtmp.mux ?? game.u?.ux ?? glyphX) - mtmp.mx);
        const afterDy = dy || sgn((mtmp.muy ?? game.u?.uy ?? glyphY) - mtmp.my);
        const landingX = glyphX + afterDx;
        const landingY = glyphY + afterDy;
        const projectileDestroyed = monster_projectile_destroyed_by_hit(projectile);
        prepare_monster_projectile_for_floor(projectile, landingX, landingY);
        projectile._defer_pet_pickup = true;
        projectile._pet_keep_projectile = true;
        if (seenThrower) {
            game._after_more_message = hitMessage;
            game._after_more_needs_prompt = false;
            if (!projectileDestroyed)
                game._after_more_projectile_obj = { obj: projectile, x: landingX, y: landingY };
            game._after_more_projectile_glyph = { x: landingX, y: landingY, ch: ')' };
        } else {
            if (!projectileDestroyed) {
                stackobj(place_object(projectile, landingX, landingY));
            }
            await pline(hitMessage);
            if (isok(landingX, landingY)) newsym(landingX, landingY);
        }
    } else if (hit?.hero) {
        const glyphX = hit.x - dx;
        const glyphY = hit.y - dy;
        if (seenThrower && isok(glyphX, glyphY))
            show_glyph_cell(glyphX, glyphY, ')', monster_projectile_glyph_color(projectile), false);
        rn2(hero_thrown_object_catch_chance());
        const damage = monster_weapon_damage(projectile);
        const hitv = monster_thrown_hit_value(mtmp, projectile);
        const dieroll = rnd(20);
        prepare_monster_projectile_for_floor(projectile, hit.x, hit.y);
        const hitHero = (game.u?.uac ?? 10) + hitv > dieroll;
        if (hitHero) {
            const hitMessage = `You are hit by ${monster_projectile_article_name(projectile)}${damage_exclam_basic(damage)}`;
            if (seenThrower) {
                const preDamageHp = game.u?.uhp ?? 0;
                game._after_more_message = hitMessage;
                game._after_more_needs_prompt = false;
                game._after_more_hero_damage = (game._after_more_hero_damage || 0) + damage;
                if (damage >= preDamageHp) {
                    const killerName = monster_projectile_article_name(projectile);
                    const match = /^(a|an|the) (.+)$/i.exec(killerName);
                    game._after_more_fatal_projectile = {
                        killer: match ? match[2] : killerName,
                        article: match ? match[1] : 'a',
                        preDamageHp,
                    };
                }
                game._clear_latched_status_before_after_more = true;
                game._after_more_projectile_obj = { obj: projectile, x: hit.x, y: hit.y };
                game._after_more_projectile_clear = { x: glyphX, y: glyphY };
            } else {
                if (typeof game.u?.uhp === 'number') game.u.uhp = Math.max(0, game.u.uhp - damage);
                exercise(A_STR, false);
                const projectileDestroyed = monster_projectile_destroyed_by_hit(projectile);
                if (!projectileDestroyed) {
                    stackobj(place_object(projectile, hit.x, hit.y));
                }
                await pline(hitMessage);
            }
        } else {
            const missMessage = monster_projectile_miss_message(projectile, hitv, dieroll);
            rn2(5); // C ref: src/mthrowu.c:m_throw() forcehit gate after a hero miss.
            if (seenThrower) {
                game._after_more_message = missMessage;
                game._after_more_needs_prompt = false;
                game._after_more_projectile_obj = { obj: projectile, x: hit.x, y: hit.y };
                game._after_more_projectile_clear = { x: glyphX, y: glyphY };
            } else {
                stackobj(place_object(projectile, hit.x, hit.y));
                await pline(missMessage);
            }
        }
    }
    if (game.context?.run) game.context.run = null;
    return true;
}

const POTION_BOTTLE_NAMES = ['bottle', 'phial', 'flagon', 'carafe', 'flask', 'jar', 'vial'];

function potion_bottle_name_basic() {
    // C ref: potion.c:bottlename().
    return POTION_BOTTLE_NAMES[rn2(POTION_BOTTLE_NAMES.length)] || 'bottle';
}

async function potionhit_hero_basic(obj) {
    // C ref: potion.c:potionhit() for POTHIT_MONST_THROW.
    const bottle = potion_bottle_name_basic();
    await pline(`The ${bottle} crashes on your head and breaks into shards.`);
    apply_hero_damage(rnd(2));
    const appearance = getObjectDescription(obj?.otyp) || '';
    const potionName = appearance ? `${appearance} potion` : 'potion';
    game._after_more_message = obj?.otyp === POT_SLEEPING
        ? `The ${potionName} evaporates.  You feel rather tired.`
        : `The ${potionName} evaporates.`;
    game._after_more_potion_breathe = { otyp: obj?.otyp };
    game._after_more_needs_prompt = true;
    queue_more_prompt();
    game._monster_attack_more_latched = true;
    game._monster_attack_pause_after_more = true;
    game._monster_attack_resume_behind_after_more = true;
}

async function throw_potion_at_hero_basic(mtmp, obj) {
    // C refs: muse.c:use_offensive(), mthrowu.c:m_throw().
    const tx = mtmp.mux ?? game.u?.ux ?? mtmp.mx;
    const ty = mtmp.muy ?? game.u?.uy ?? mtmp.my;
    const dx = sgn(tx - mtmp.mx);
    const dy = sgn(ty - mtmp.my);
    let range = distmin(mtmp.mx, mtmp.my, tx, ty);
    const projectile = split_monster_projectile(mtmp, obj);
    if (!projectile || (!dx && !dy)) return false;

    let x = mtmp.mx;
    let y = mtmp.my;
    while (range-- > 0) {
        x += dx;
        y += dy;
        projectile.ox = x;
        projectile.oy = y;
        const mon = mon_at(x, y, mtmp);
        if (mon) break;
        if (x === game.u?.ux && y === game.u?.uy) {
            const glyphX = x - dx;
            const glyphY = y - dy;
            if (cansee(glyphX, glyphY))
                show_glyph_cell(glyphX, glyphY, '!', NO_COLOR, false);
            rn2(hero_thrown_object_catch_chance());
            game._after_more_projectile_clear = { x: glyphX, y: glyphY };
            await potionhit_hero_basic(projectile);
            break;
        }
        const forcehit = !rn2(5);
        // C's forcehit value only affects iron-bars flight checks; for open
        // floor the missile continues until range expires or it hits a target.
        void forcehit;
        if (!range) break;
        if (cansee(x, y))
            show_glyph_cell(x, y, '!', NO_COLOR, false);
    }
    if (game.context?.run) game.context.run = null;
    return true;
}

async function use_offensive_potion_basic(mtmp, obj) {
    if (!obj) return false;
    // C ref: muse.c:use_offensive() potion cases.
    if (cansee(mtmp.mx, mtmp.my)) {
        await append_trap_topline(`${monster_subject(mtmp)} hurls a potion!`);
    }
    return throw_potion_at_hero_basic(mtmp, obj);
}

async function thrwmu_basic(mtmp) {
    // C ref: mthrowu.c:thrwmu().  This is the ordinary thrown-weapon front
    // door; polearms, launchers, potions, and returning weapons remain future
    // work outside current evidence.
    if (mtmp.weapon_check === NEED_WEAPON || !mtmp.mw) {
        mtmp.weapon_check = NEED_RANGED_WEAPON;
        if (await mon_wield_item_basic(mtmp)) return true;
    }
    const obj = ranged_weapon_candidate(mtmp);
    if (!obj) return false;
    const linedUp = lined_up_basic(mtmp);
    if (!linedUp) return false;

    const dist = distmin(game.u?.ux ?? mtmp.mux ?? mtmp.mx, game.u?.uy ?? mtmp.muy ?? mtmp.my, mtmp.mx, mtmp.my);
    const oldDist = distmin(game.u?.ux0 ?? game.u?.ux ?? mtmp.mx, game.u?.uy0 ?? game.u?.uy ?? mtmp.my, mtmp.mx, mtmp.my);
    const targetX = mtmp.mux ?? game.u?.ux ?? mtmp.mx;
    const targetY = mtmp.muy ?? game.u?.uy ?? mtmp.my;
    const targetDist = distmin(mtmp.mx, mtmp.my, targetX, targetY);
    if (dist > oldDist) {
        const limit = BOLT_LIM - targetDist;
        if (limit > 0 && rn2(limit)) return false;
    }
    return throw_weapon_at_hero_basic(mtmp, obj);
}

function can_attack_after_move_basic(mtmp, state) {
    // C ref: monmove.c:dochug() lets monsters that moved still reach
    // mattacku() when they are in range for a weapon/ranged attack.
    if (!state?.inrange || state.nearby) return false;
    return ranged_attk_available_basic(mtmp)
        || mon_has_attack_type(mtmp, 'AT_WEAP')
        || !!offensive_potion_candidate_basic(mtmp);
}

function can_standard_attack_basic(state) {
    // C ref: monmove.c:dochug() phase four.  mattacku() is not entered
    // merely because m_move() failed to move; the recomputed range/scare
    // state still gates the standard attack.
    return !!state?.inrange && !state.scared;
}

async function maybe_wield_hth_before_move(mtmp, state) {
    // C ref: monmove.c:dochug() phase two lets close hostile weapon users
    // spend their move switching to a hand-to-hand weapon before m_move().
    if (mtmp.mpeaceful || mtmp.mtame || !state?.inrange || state.scared) return false;
    const targetX = mtmp.mux ?? game.u?.ux ?? mtmp.mx;
    const targetY = mtmp.muy ?? game.u?.uy ?? mtmp.my;
    if (dist2(mtmp.mx, mtmp.my, targetX, targetY) > 8) return false;
    if (!mon_has_attack_type(mtmp, 'AT_WEAP')) return false;
    if (mtmp.weapon_check !== NEED_WEAPON) return false;
    mtmp.weapon_check = NEED_HTH_WEAPON;
    return mon_wield_item_basic(mtmp);
}

function mon_is_floater(mtmp) {
    return mtmp.data?.mlet === 'S_EYE' || mtmp.data?.mlet === 'S_LIGHT';
}

function mon_is_whirly(mtmp) {
    return mtmp?.data?.mlet === 'S_VORTEX' || mtmp?.data?.name === 'AIR_ELEMENTAL';
}

function mon_is_amorphous(mtmp) {
    return !!((mtmp?.data?.mflags1 ?? 0) & M1_AMORPHOUS);
}

function mon_is_unsolid(mtmp) {
    return !!((mtmp?.data?.mflags1 ?? 0) & M1_UNSOLID);
}

function object_weight_basic(obj) {
    if (!obj) return 0;
    // C ref: mkobj.c:weight(). Corpse objects weigh quantity * mons[].cwt;
    // older JS corpses may still carry only the species id and generic owt=1.
    if (obj.otyp === CORPSE) {
        const ptr = monsterPtr(obj.corpsenm);
        if (ptr && Number.isFinite(ptr.cwt)) return (obj.quan || 1) * ptr.cwt;
        if (Number.isFinite(obj.corpse_cwt)) return (obj.quan || 1) * obj.corpse_cwt;
    }
    const base = OBJECT_WEIGHT[obj.otyp];
    if (Number.isFinite(base)) return (obj.quan || 1) * base;
    return Number.isFinite(obj.owt) ? obj.owt : 1;
}

function current_mon_load(mtmp) {
    return (mtmp.inventory || []).reduce((sum, obj) => sum + object_weight_basic(obj), 0);
}

function max_mon_load(mtmp) {
    // C ref: mon.c:max_mon_load().
    const ptr = mtmp.data || {};
    const strong = !!((ptr.mflags2 ?? 0) & M2_STRONG);
    const cwt = ptr.cwt ?? 0;
    let maxload;
    if (!cwt) {
        maxload = Math.trunc((MAX_CARR_CAP * (ptr.msize ?? MZ_HUMAN)) / MZ_HUMAN);
    } else if (!strong || cwt > WT_HUMAN) {
        maxload = Math.trunc((MAX_CARR_CAP * cwt) / WT_HUMAN);
    } else {
        maxload = MAX_CARR_CAP;
    }
    if (!strong) maxload = Math.trunc(maxload / 2);
    return Math.max(1, maxload);
}

function can_carry(mtmp, obj) {
    if (obj?.cursed && mtmp.mtame) return 0;
    if (current_mon_load(mtmp) + object_weight_basic(obj) > max_mon_load(mtmp)) return 0;
    return Math.max(1, obj?.quan || 1);
}

function searches_for_item_basic(mtmp, obj) {
    if (mon_is_animal(mtmp) || mon_is_mindless(mtmp) || mon_is_ghost(mtmp)) return false;

    const cls = object_class(obj);
    const typ = obj?.otyp;
    // C ref: muse.c:searches_for_item().  Ordinary collectors only chase
    // specific usable magic; broad M2_MAGIC collection is handled separately.
    if (typ === WAN_MAKE_INVISIBLE || typ === POT_INVISIBILITY) {
        return !mtmp.minvis && !mtmp.invis_blkd && !mon_has_attack_type(mtmp, 'AT_GAZE');
    }
    if (typ === WAN_SPEED_MONSTER || typ === POT_SPEED) return mtmp.mspeed !== MFAST;

    if (cls === WAND_CLASS) {
        if ((obj.spe ?? 1) <= 0) return false;
        if (typ === WAN_DIGGING) return !mon_is_floater(mtmp);
        if (typ === WAN_POLYMORPH) return (mtmp.data?.difficulty ?? mtmp.data?.mlevel ?? 0) < 6;
        return OBJECT_DIR[typ] === RAY
            || typ === WAN_STRIKING
            || typ === WAN_UNDEAD_TURNING
            || typ === WAN_TELEPORTATION
            || typ === WAN_CREATE_MONSTER;
    }
    if (cls === POTION_CLASS) {
        return typ === POT_HEALING
            || typ === POT_EXTRA_HEALING
            || typ === POT_FULL_HEALING
            || typ === POT_POLYMORPH
            || typ === POT_GAIN_LEVEL
            || typ === POT_PARALYSIS
            || typ === POT_SLEEPING
            || typ === POT_ACID
            || typ === POT_CONFUSION
            || (typ === POT_BLINDNESS && !mon_has_attack_type(mtmp, 'AT_GAZE'));
    }
    if (cls === SCROLL_CLASS) {
        return typ === SCR_TELEPORTATION
            || typ === SCR_CREATE_MONSTER
            || typ === SCR_EARTH
            || typ === SCR_FIRE;
    }
    if (cls === AMULET_CLASS) {
        if (typ === AMULET_OF_LIFE_SAVING) return true;
        return typ === AMULET_OF_REFLECTION || typ === AMULET_OF_GUARDING;
    }
    return false;
}

function mon_would_take_item(mtmp, obj) {
    if (!obj || typeof obj.otyp !== 'number') return false;
    if (obj.otyp === ROCK) return false;
    const cls = object_class(obj);
    const flags2 = mtmp.data?.mflags2 ?? 0;
    const pctload = Math.trunc((current_mon_load(mtmp) * 100) / Math.max(1, max_mon_load(mtmp)));
    if (!mon_is_mindless(mtmp) && !mon_is_animal(mtmp) && pctload < 75
        && searches_for_item_basic(mtmp, obj)) return true;
    if ((flags2 & M2_COLLECT) && [WEAPON_CLASS, ARMOR_CLASS, GEM_CLASS, FOOD_CLASS].includes(cls)
        && pctload < 75) return true;
    if ((flags2 & M2_MAGIC) && [AMULET_CLASS, POTION_CLASS, SCROLL_CLASS, WAND_CLASS, RING_CLASS, SPBOOK_CLASS].includes(cls)
        && pctload < 85) return true;
    return false;
}

function m_search_items_basic(mtmp, ggx, ggy, appr) {
    let minr = 5;
    const omx = mtmp.mx;
    const omy = mtmp.my;
    if (distmin(mtmp.mux ?? ggx, mtmp.muy ?? ggy, omx, omy) < 5 && !mtmp.mpeaceful) minr--;
    let target = null;
    const hmx = Math.min(79, omx + minr);
    const hmy = Math.min(20, omy + minr);
    const lmx = Math.max(1, omx - minr);
    const lmy = Math.max(0, omy - minr);
    for (let xx = lmx; xx <= hmx; xx++) {
        for (let yy = lmy; yy <= hmy; yy++) {
            if (minr < distmin(omx, omy, xx, yy)) continue;
            if (!could_reach_item(mtmp, xx, yy)) continue;
            const trap = trap_at_basic(xx, yy);
            if (trap && mon_knows_traps_basic(mtmp, trap.ttyp)) continue;
            if (!mon_can_see_square(mtmp, xx, yy)) continue;
            const pile = objects_at(xx, yy);
            if (!pile.length) continue;
            for (const obj of pile) {
                const wouldTake = mon_would_take_item(mtmp, obj);
                const carryAmount = can_carry(mtmp, obj);
                if (wouldTake && carryAmount > 0) {
                    minr = distmin(omx, omy, xx, yy);
                    target = { x: xx, y: yy };
                    break;
                }
            }
        }
    }
    if (minr < 5 && appr === -1) {
        // C ref: src/monmove.c:m_search_items().  The initial "hero is
        // closer" radius reduction also reaches finish_search, so a monster
        // avoiding ranged contact can switch back to approach mode even when
        // no item target was found.
        if (distmin(omx, omy, mtmp.mux ?? ggx, mtmp.muy ?? ggy) <= 3) return null;
        if (!target) return { forceApproachOnly: true };
    }
    return target;
}

async function mpickstuff_basic(mtmp) {
    const pile = objects_at(mtmp.mx, mtmp.my);
    for (const obj of pile) {
        if (!mon_would_take_item(mtmp, obj) || can_carry(mtmp, obj) <= 0) continue;
        if (cansee(mtmp.mx, mtmp.my)) {
            await append_monster_topline(`${monster_subject(mtmp)} picks up ${floor_object_name(obj)}.`);
        }
        const idx = game.level.objects.indexOf(obj);
        if (idx >= 0) game.level.objects.splice(idx, 1);
        mtmp.inventory = mtmp.inventory || [];
        mtmp.inventory.unshift(obj);
        mtmp.misc_worn_check = (mtmp.misc_worn_check || 0) | I_SPECIAL;
        newsym(mtmp.mx, mtmp.my);
        if (hallucinating()) see_monsters();
        return true;
    }
    return false;
}

function set_door_mask_basic(loc, mask) {
    loc.flags = mask;
    loc.doormask = mask;
}

function refresh_monster_door_vision(mtmp) {
    // C ref: monmove.c:UnblockDoor().  A monster opening or removing a door
    // updates vision immediately, before later monsters in this same turn move.
    newsym(mtmp.mx, mtmp.my);
    vision_reset();
    vision_recalc(0);
    game.vision_full_recalc = 0;
}

function remove_dead_monster(mtmp) {
    const monsters = game.level?.monsters || [];
    const idx = monsters.indexOf(mtmp);
    if (idx >= 0) monsters.splice(idx, 1);
    newsym(mtmp.mx, mtmp.my);
}

function migrate_monster_off_level_basic(mtmp, trap) {
    // C ref: teleport.c:mlevel_tele_trap(); mon.c:migrate_to_level().
    const oldx = mtmp.mx;
    const oldy = mtmp.my;
    const monsters = game.level?.monsters || [];
    const idx = monsters.indexOf(mtmp);
    if (idx >= 0) monsters.splice(idx, 1);
    mtmp.mx = 0;
    mtmp.my = 0;
    mtmp.migrating = {
        type: trap?.ttyp === MAGIC_PORTAL ? 'portal' : 'random',
        tolev: trap?.dst ? { ...trap.dst } : null,
    };
    newsym(oldx, oldy);
}

function monster_given_name(mtmp) {
    return mtmp?.mextra?.mgivenname || mtmp?.mgivenname || '';
}

function possessive_given_name(name) {
    return String(name || '').endsWith('s') ? `${name}'` : `${name}'s`;
}

function named_monster_name(mtmp) {
    const name = monster_given_name(mtmp);
    if (!name) return '';
    // C ref: do_name.c:x_monnam().  Named ghosts are rendered as
    // "<player>'s ghost" and suppress the ordinary article.
    if (mtmp?.data?.name === 'GHOST') return `${possessive_given_name(name)} ghost`;
    return name;
}

function monster_name(mtmp) {
    if (hallucinating()) return randomHallucinatedMonsterName();
    const named = named_monster_name(mtmp);
    if (named) return named;
    return String(mtmp?.data?.name || 'monster').toLowerCase().replace(/_/g, ' ');
}

function shopkeeper_name(mtmp) {
    return String(mtmp?.mextra?.eshk?.shknam || '').replace(/^[_+\-|]/, '');
}

function hero_can_spot_monster(mtmp) {
    if (!mtmp || mtmp.mundetected) return false;
    if (!cansee(mtmp.mx, mtmp.my)) return false;
    if (mtmp.minvis && !(game.u?.usee_invisible || game.u?.uprops?.see_invisible)) return false;
    return true;
}

function map_invisible_basic(x, y) {
    // C ref: display.c:map_invisible().
    if (x === game.u?.ux && y === game.u?.uy) return;
    const loc = game.level?.at(x, y);
    if (loc) loc.remembered_glyph = { ch: 'I', color: NO_COLOR, decgfx: false };
    show_glyph_cell(x, y, 'I', NO_COLOR, false);
}

function monster_subject(mtmp) {
    // C ref: mhitu.c:hitmsg() via do_name.c:Monnam().  Once the hero is
    // blind, physical attack messages use the unseen generic subject.
    if (!hero_can_spot_monster(mtmp)) return 'It';
    if (hallucinating()) return sentence_case(randomHallucinatedMonsterName('the'));
    if (mtmp?.isshk && shopkeeper_name(mtmp)) return shopkeeper_name(mtmp);
    const named = named_monster_name(mtmp);
    if (named) return sentence_case(named);
    return `The ${monster_name(mtmp)}`;
}

function sentence_case(text) {
    const str = String(text || '');
    return str ? `${str[0].toUpperCase()}${str.slice(1)}` : str;
}

function floor_object_name(obj) {
    if (object_class(obj) === FOOD_CLASS) {
        const base = FOOD_OBJECT_NAMES.get(obj.otyp) || 'food';
        return object_display_name(obj, base);
    }
    if (object_class(obj) === WEAPON_CLASS) {
        const base = object_base_name(obj);
        if (base) return object_display_name(obj, base);
    }
    if (object_class(obj) === POTION_CLASS) return 'a potion';
    if (object_class(obj) === GEM_CLASS) {
        if (obj.otyp === ROCK) return 'a rock';
        const noun = obj.otyp >= DILITHIUM_CRYSTAL && obj.otyp <= FLINT
            ? (obj.otyp >= LUCKSTONE ? 'stone' : 'gem')
            : 'gem';
        const appearance = obj.dknown ? getObjectDescription(obj.otyp) : '';
        return appearance ? `a ${appearance} ${noun}` : `a ${noun}`;
    }
    return 'an object';
}

function object_base_name(obj) {
    switch (obj?.otyp) {
    case DART:
        return 'dart';
    case ORCISH_DAGGER:
        return 'crude dagger';
    case SHORT_SWORD:
        return 'short sword';
    case ELVEN_SHORT_SWORD:
        return 'runed short sword';
    case ORCISH_SHORT_SWORD:
        return 'crude short sword';
    case DWARVISH_SHORT_SWORD:
        return 'broad short sword';
    case AXE:
        return 'axe';
    case BATTLE_AXE:
        return 'battle-axe';
    case PICK_AXE:
        return 'pick-axe';
    case DWARVISH_MATTOCK:
        return 'broad pick';
    case ARROW:
        return 'arrow';
    case ELVEN_ARROW:
        return 'runed arrow';
    case ORCISH_ARROW:
        return 'crude arrow';
    case YA:
        return 'bamboo arrow';
    case CROSSBOW_BOLT:
        return 'crossbow bolt';
    case BOW:
        return 'bow';
    case ELVEN_BOW:
        return 'runed bow';
    case ORCISH_BOW:
        return 'crude bow';
    case YUMI:
        return 'long bow';
    case CROSSBOW:
        return 'crossbow';
    default:
        return '';
    }
}

function object_display_name(obj, base) {
    let name = obj?.opoisoned ? `poisoned ${base}` : base;
    const quan = obj?.quan ?? 1;
    if (quan > 1) return `${quan} ${plural_object_name(name)}`;
    return `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`;
}

function plural_object_name(name) {
    if (name.startsWith('sprig of ')) return `sprigs of ${name.slice('sprig of '.length)}`;
    if (name.startsWith('clove of ')) return `cloves of ${name.slice('clove of '.length)}`;
    if (name.startsWith('lump of ')) return `lumps of ${name.slice('lump of '.length)}`;
    if (name.endsWith('s')) return name;
    return `${name}s`;
}

function wield_object_name(obj) {
    const base = object_base_name(obj);
    return base ? object_display_name({ ...obj, quan: 1 }, base) : floor_object_name(obj);
}

function monster_weapon_name(obj) {
    if (obj?.otyp === ORCISH_DAGGER) {
        const order = Array.isArray(game.discoveryOrder)
            ? game.discoveryOrder
            : (game.discoveryOrder = []);
        if (!order.includes(obj.otyp)) order.push(obj.otyp);
        const encountered = game.encounteredObjects || (game.encounteredObjects = new Set());
        if (typeof encountered.add === 'function') encountered.add(obj.otyp);
        return 'crude dagger';
    }
    return wield_object_name(obj).replace(/^(?:an?|the) /, '');
}

function monster_weapon_swing_verb(obj) {
    // C ref: src/mhitm.c:mswings_verb().  Launcher bashes are swings rather
    // than thrusts.
    if ([BOW, ELVEN_BOW, ORCISH_BOW, YUMI, CROSSBOW].includes(obj?.otyp)) return 'swings';
    return 'thrusts';
}

function monster_possessive(mtmp) {
    if (mtmp?.female) return 'her';
    if (mtmp?.male || !mtmp?.data?.neuter) return 'his';
    return 'its';
}

async function wildmiss_displaced_image_basic(mtmp) {
    // C ref: mhitu.c:wildmiss().  The displaced-image miss is a pline(),
    // not a combat roll, so it must not consume hit or damage RNG.
    if (!cansee(mtmp.mx, mtmp.my)) return false;
    const invis = game.u?.uinvis || game.u?.uprops?.invisible || game.u?.Invis;
    const line = `The ${monster_name(mtmp)} strikes at your ${invis ? 'invisible ' : ''}displaced image and misses you!`;
    if (game._pending_message) {
        game._after_more_message = game._after_more_message
            ? `${game._after_more_message}  ${line}`
            : line;
        game._after_more_needs_prompt = true;
        game._monster_attack_more_latched = true;
        game._monster_attack_resume_behind_after_more = true;
        if (!game._more) queue_more_prompt();
        return true;
    }
    await flush_pending_more_before_monster_message();
    await pline(line);
    queue_more_prompt();
    latch_monster_message_on_base_screen(line);
    game._monster_attack_more_latched = true;
    game._monster_attack_pause_after_more = true;
    return true;
}

function latch_monster_message_on_base_screen(line) {
    if (!game._monster_more_base_screen) return false;
    const rows = String(game._monster_more_base_screen).split('\n');
    rows[0] = `${line}--More--`;
    game._latched_more_screen = rows.join('\n');
    game._latched_more_cursor = [Math.min(rows[0].length, 79), 0];
    game._latched_more_keep_until_dismiss = true;
    if (game._monster_more_restore_message) {
        game._restore_message_after_more = game._monster_more_restore_message;
        game._monster_more_restore_message = '';
    }
    game._monster_more_base_screen = '';
    return true;
}

function patch_serialized_screen_points(baseScreen, points) {
    const rows = String(baseScreen || '').split('\n');
    for (const pt of points || []) {
        const row = pt.y + 1;
        const col = pt.x - 1;
        if (row < 0 || row >= rows.length || col < 0) continue;
        const cell = game.nhDisplay?.grid?.[row]?.[col];
        if (!cell) continue;
        const parsed = parse_serialized_row_cells(rows[row] || '');
        while (parsed.length <= col) parsed.push({ ch: ' ', color: 8, attr: 0 });
        parsed[col] = {
            ch: cell.ch || ' ',
            color: Number.isInteger(cell.color) ? cell.color : 8,
            attr: cell.attr || 0,
        };
        rows[row] = serialize_row_cells(parsed);
    }
    return rows.join('\n');
}

function sgr_fg_to_color(code) {
    if (code === 39 || code === 0) return 8;
    if (code >= 30 && code <= 37) return code - 30;
    if (code >= 90 && code <= 97) return 8 + (code - 90);
    return null;
}

function color_to_sgr_fg(color) {
    if (color === 8 || color == null || color < 0 || color > 15) return 39;
    return color < 8 ? 30 + color : 90 + (color - 8);
}

function parse_serialized_row_cells(row) {
    const cells = [];
    let color = 8;
    let attr = 0;
    for (let i = 0; i < row.length; i++) {
        if (row[i] === '\x1b' && row[i + 1] === '[') {
            let j = i + 2;
            while (j < row.length && !/[A-Za-z]/.test(row[j])) j++;
            const command = row[j];
            const body = row.slice(i + 2, j);
            if (command === 'm') {
                const codes = body ? body.split(';').map((part) => Number(part || 0)) : [0];
                if (codes.includes(0)) {
                    color = 8;
                    attr = 0;
                }
                for (const code of codes) {
                    const fg = sgr_fg_to_color(code);
                    if (fg != null) color = fg;
                    if (code === 1) attr |= 2;
                    else if (code === 4) attr |= 4;
                    else if (code === 7) attr |= 1;
                }
            } else if (command === 'C') {
                const n = Number(body || 1);
                for (let k = 0; k < n; k++) cells.push({ ch: ' ', color, attr });
            }
            i = j;
            continue;
        }
        cells.push({ ch: row[i], color, attr });
    }
    return cells;
}

function serialize_row_cells(cells) {
    let last = cells.length - 1;
    while (last >= 0 && cells[last].ch === ' ') last--;
    let out = '';
    let curColor = 8;
    let curAttr = 0;
    for (let i = 0; i <= last; i++) {
        const cell = cells[i] || { ch: ' ', color: 8, attr: 0 };
        const color = Number.isInteger(cell.color) ? cell.color : 8;
        const attr = cell.attr || 0;
        if (color !== curColor || attr !== curAttr) {
            const codes = [];
            if (attr !== curAttr) {
                codes.push(0);
                if (attr & 2) codes.push(1);
                if (attr & 4) codes.push(4);
                if (attr & 1) codes.push(7);
                if (color !== 8) codes.push(color_to_sgr_fg(color));
            } else {
                codes.push(color_to_sgr_fg(color));
            }
            out += `\x1b[${codes.join(';')}m`;
            curColor = color;
            curAttr = attr;
        }
        out += cell.ch || ' ';
    }
    if (curColor !== 8 || curAttr !== 0) out += '\x1b[39m';
    return out;
}

async function prepare_monster_more_base_screen() {
    const points = game._monster_more_base_deferred || [];
    if (!game._monster_more_base_screen || !points.length) return;
    game._deferred_warning_redraws = points.slice();
    flush_deferred_warning_redraws();
    await flush_screen(1);
    game._monster_more_base_screen = patch_serialized_screen_points(
        game._monster_more_base_screen,
        points,
    );
    game._monster_more_base_deferred = [];
}

function occupation_message_boundary_active() {
    return (game._occupation_turns_remaining || 0) > 0
        || !!game._occupation_finish_message
        || !!game._force_lock
        || (game._force_lock_post_success_turns || 0) > 0;
}

function hallucinating() {
    return !!(game.u?.uhallucination || game.u?.uprops?.hallucination);
}

function hero_sees_invisible_basic() {
    return !!(game.u?.usee_invisible
        || game.u?.see_invisible
        || game.u?.See_invisible
        || game.u?.uinvis_aware
        || game.u?.uprops?.see_invisible);
}

function is_more_dismiss_key(ch) {
    if (typeof ch === 'number') ch = String.fromCharCode(ch);
    return ch === ' ' || ch === '\r' || ch === '\n' || ch === '\x1b';
}

function is_simple_monster_hit_you_line(line) {
    return /^[A-Z][^!]* (?:hits(?: again)?|bites|stings|kicks|butts|touches you|misses|just misses)!$/.test(line || '');
}

function is_simple_monster_hit_you_chain(line) {
    return String(line || '').split('  ').every(is_simple_monster_hit_you_line);
}

function monster_miss_text(toHit, roll) {
    // C ref: src/mhitu.c:missmu().  "just misses" is only used when
    // flags.verbose is enabled.
    return toHit === roll && game.flags?.verbose !== false ? 'just misses' : 'misses';
}

function is_simple_monster_vs_monster_line(line) {
    return /^(?:The [^.!?]+|[A-Z][A-Za-z0-9' -]*) (?:misses|hits|bites|stings|kicks|butts|touches) (?:the |[A-Z]).+\.$/.test(line || '');
}

function pending_pet_combat_boundary(line = game._pending_message || '') {
    if (game._pet_combat_pending_boundary) return true;
    const parts = String(line || '').split('  ');
    return parts.length > 1 && /^You /.test(parts[0]) && is_simple_monster_vs_monster_line(parts[parts.length - 1]);
}

function pet_combat_more_would_precede_line(line) {
    return !!game._pending_message
        && !game._more
        && pending_pet_combat_boundary(game._pending_message)
        && !topline_can_pack_message(game._pending_message, line);
}

async function flush_pending_more_before_monster_message() {
    if (!game._more || !game._pending_message) return;
    if (game._pet_combat_more_latched && !hallucinating()) return;
    // C ref: tty topline `--More--` is often serviced when the next pline()
    // wants to print. This lets intervening map updates become visible before
    // the prior message is dismissed, without applying the next message's
    // side effects behind the old topline.
    await flush_screen(1);
    await nhgetch();
    clear_pending_message();
    game._hallucination_warning_rng_active = false;
    if (game._after_more_message) {
        const msg = game._after_more_message;
        const needsPrompt = !!game._after_more_needs_prompt;
        const strictPromptKeys = !!game._after_more_strict_keys;
        game._after_more_message = '';
        game._after_more_needs_prompt = false;
        game._after_more_strict_keys = false;
        await pline(msg);
        if (needsPrompt) {
            queue_more_prompt();
            let ch;
            do {
                await flush_screen(1);
                ch = await nhgetch();
            } while (strictPromptKeys && !is_more_dismiss_key(ch));
            clear_pending_message();
        }
    }
    if (game._swallowed_display_pending) {
        // C ref: mhitu.c:gulpmu() calls vision_recalc(2)/swallowed(1) after
        // the initial engulf message is serviced, so later swallowed damage
        // screens show the blank engulfed map rather than the old room.
        game._swallowed_display_pending = false;
        game._swallowed_map_active = true;
        game._swallowed_overlay = null;
        refresh_swallowed_overlay();
        refresh_swallowed_overlay();
    }
}

async function show_blocking_monster_message(line) {
    if (!line) return;
    if (game._pending_message?.startsWith('You hear nothing special.') && !game._more
        && `${game._pending_message}  ${line}`.length < 80) {
        game._pending_message = `${game._pending_message}  ${line}`;
        return;
    }
    if (/ zaps .+ wand!/.test(game._pending_message || '') && !game._more
        && `${game._pending_message}  ${line}`.length < 80) {
        // C refs: src/mhitu.c:mattacku(), src/muse.c:use_offensive().
        // Offensive wand output is a normal monster topline prefix before
        // the attack message which blocks for --More--.
        game._pending_message = `${game._pending_message}  ${line}`;
        queue_more_prompt();
        game._monster_attack_more_latched = true;
        return;
    }
    const pendingPetCombatBoundary = pending_pet_combat_boundary(game._pending_message);
    if (pendingPetCombatBoundary && game._pending_message && !game._more) {
        game._pet_combat_pending_boundary = false;
        queue_more_prompt();
        game._pet_combat_more_latched = true;
        game._after_more_message = game._after_more_message
            ? `${game._after_more_message}  ${line}`
            : line;
        game._after_more_needs_prompt = false;
        return;
    }
    if (/^You (miss|hit) /.test(game._pending_message || '') && !game._more
        && `${game._pending_message}  ${line}`.length < 80) {
        game._pending_message = `${game._pending_message}  ${line}`;
        if (game._monster_death_pending || game._fatal_monster_attack_paused)
            queue_more_prompt();
        return;
    }
    if (/^You (?:(?:harmlessly|futilely) )?attack /.test(game._pending_message || '')
        && !game._more
        && topline_can_pack_message(game._pending_message, line)) {
        // C refs: src/hack.c:domove_fight_empty(), win/tty/topl.c:update_topl().
        game._pending_message = `${game._pending_message}  ${line}`;
        if (game._monster_death_pending || game._fatal_monster_attack_paused)
            queue_more_prompt();
        return;
    }
    if (game._pending_message && !game._more && `${game._pending_message}  ${line}`.length < 80) {
        if (is_simple_monster_hit_you_line(line)
            && !is_simple_monster_vs_monster_line(game._pending_message)
            && !/^You hear the (?:studio audience applaud|rumble of distant thunder\.\.\.)!$/.test(game._pending_message)
            && game._pending_message !== "You're covered in frost!"
            && topline_can_pack_message(game._pending_message, line)) {
            // C refs: mhitu.c:hitmsg(), win/tty/topl.c:update_topl().
            // A short command result can share the tty topline with the
            // following monster hit rather than pausing the monster turn.
            game._pending_message = `${game._pending_message}  ${line}`;
            return;
        }
        if (is_simple_monster_hit_you_chain(game._pending_message)
            && is_simple_monster_hit_you_line(line)
            && topline_can_pack_message(game._pending_message, line)) {
            // C refs: mhitu.c:hitmsg(), win/tty/topl.c:update_topl().
            game._pending_message = `${game._pending_message}  ${line}`;
            return;
        }
        if (/^You (?:kill|destroy) .+!$/.test(game._pending_message)
            && is_simple_monster_hit_you_line(line)
            && topline_can_pack_message(game._pending_message, line)) {
            // C refs: uhitm.c:xkilled(), mhitu.c:hitmsg(), win/tty/topl.c:update_topl().
            game._pending_message = `${game._pending_message}  ${line}`;
            return;
        }
        if (/^You (?:kill|destroy) .+!$/.test(game._pending_message)
            && is_simple_monster_hit_you_chain(line)
            && topline_can_pack_message(game._pending_message, line)) {
            // C refs: uhitm.c:xkilled(), mhitu.c:missmu()/hitmsg(),
            // win/tty/topl.c:update_topl().
            game._pending_message = `${game._pending_message}  ${line}`;
            return;
        }
        if (/^You hear the (?:studio audience applaud|rumble of distant thunder\.\.\.)!$/.test(game._pending_message)) {
            game._pending_message = `${game._pending_message}  ${line}`;
            queue_more_prompt();
            game._monster_attack_more_latched = true;
            if (game._pending_monster_attack_side_effect) {
                game._after_more_message = game._pending_monster_attack_side_effect;
                game._pending_monster_attack_side_effect = '';
            }
            return;
        }
        if (game._pending_message === "You're covered in frost!") {
            game._pending_message = `${game._pending_message}  ${line}`;
            queue_more_prompt();
            game._monster_attack_more_latched = true;
            return;
        }
        if (/^The .+ is killed!$/.test(game._pending_message)) {
            game._pending_message = `${game._pending_message}  ${line}`;
            return;
        }
        if (is_simple_monster_vs_monster_line(game._pending_message)
            && is_simple_monster_hit_you_line(line)
            && topline_can_pack_message(game._pending_message, line)) {
            // C refs: src/mhitm.c:mattackm(), src/mhitu.c:hitmsg(),
            // win/tty/topl.c:update_topl().  While resuming an interrupted
            // pet-combat turn, a monster-to-hero hit can pack behind the
            // restored monster-vs-monster line but still owns a tty More.
            game._pending_message = `${game._pending_message}  ${line}`;
            if (game._pet_combat_resume_active) queue_more_prompt();
            return;
        }
        if (/^The .+ (?:misses|hits|bites|stings|kicks|butts) the .+\.$/.test(game._pending_message)) {
            const pending = game._pending_message;
            game._pending_message = `${pending}  ${line}`;
            if (!topline_can_pack_message(pending, line)) {
                queue_more_prompt();
                game._packed_monster_more_candidate = true;
            }
            return;
        }
        queue_more_prompt();
        game._monster_more_accepts_any_key = true;
        if (!game._monster_death_pending) {
            game._after_more_message = line;
            game._after_more_needs_prompt = true;
        }
        return;
    }
    if (game._pending_message && !game._more) {
        // C ref: win/tty/topl.c:update_topl().  When an existing topline
        // cannot pack the next monster message, tty services the old line's
        // --More-- before replacing it with the new message.
        queue_more_prompt();
        game._monster_more_accepts_any_key = true;
        if (!game._monster_death_pending) {
            game._after_more_message = line;
            game._after_more_needs_prompt = true;
        }
        game._monster_attack_more_latched = true;
        game._monster_attack_pause_after_more = true;
        return;
    }
    if (game._more && game._pending_message && game._pet_combat_more_latched && !hallucinating()) {
        game._after_more_message = game._after_more_message
            ? `${game._after_more_message}  ${line}`
            : line;
        game._after_more_needs_prompt = true;
        return;
    }
    await pline(line);
    if (game._monster_death_pending || game._fatal_monster_attack_paused) queue_more_prompt();
}

async function flush_visible_monster_attack_side_effect() {
    if (!game._pending_monster_attack_side_effect || game._more) return;
    const msg = game._pending_monster_attack_side_effect;
    game._pending_monster_attack_side_effect = '';
    await append_pline(msg);
}

async function append_swallowed_damage_message(line) {
    if (!line) return;
    // C ref: mhitu.c:gulpmu() damage plines go through the normal tty
    // topline. Repeated swallowed attacks can pack before the later pline
    // that forces `--More--`, so don't make every damage message block.
    if (game._pending_message && !game._more) {
        game._pending_message = `${game._pending_message}  ${line}`;
        return true;
    } else {
        await pline(line);
        return false;
    }
}

async function append_monster_topline(line) {
    if (game.context?.run) {
        // C ref: hack.c:lookaround()/topl.c:pline().  Monster/trap messages
        // emitted during a repeated run can split the visible topline from
        // the next repeated movement boundary.
        game.context.run.stopBeforeOpenDoor = true;
    }
    if (game._pending_message) {
        const pending = game._pending_message;
        if (!topline_can_pack_message(pending, line)) {
            queue_more_prompt();
            game._after_more_message = game._after_more_message
                ? `${game._after_more_message}  ${line}`
                : line;
            game._after_more_needs_prompt = false;
            game._monster_topline_deferred = true;
            game._monster_attack_more_latched = true;
            game._monster_attack_pause_after_more = true;
            return false;
        }
        game._pending_message = `${pending}  ${line}`;
        // C ref: mon.c:mpickstuff() visible pickup plines use tty topline
        // packing, but the delayed occupation should pause after the current
        // monster turn finishes. Pet combat keeps its earlier immediate
        // boundary because mhitm.c death side effects are still pending there.
    } else {
        await pline(line);
    }
    return true;
}

async function append_monster_effect_topline(line, opts = {}) {
    if (game._monster_topline_deferred && game._after_more_message) {
        const pending = game._after_more_message;
        if (topline_can_pack_message(pending, line)) {
            game._after_more_message = `${pending}  ${line}`;
            if (opts.needsPrompt) game._after_more_needs_prompt = true;
        } else {
            game._after_more_needs_prompt = true;
            game._after_more_followup_messages = game._after_more_followup_messages || [];
            game._after_more_followup_messages.push(line);
        }
        return;
    }
    if (game._pending_message) {
        const pending = game._pending_message;
        if (topline_can_pack_message(pending, line)) {
            game._pending_message = `${pending}  ${line}`;
        } else {
            queue_more_prompt();
            game._after_more_message = line;
            game._after_more_needs_prompt = false;
            game._monster_topline_deferred = true;
            game._monster_attack_more_latched = true;
            game._monster_attack_pause_after_more = true;
        }
    } else {
        await pline(line);
    }
}

function trap_note_name(trap, withArticle = true) {
    const name = TRAP_NOTE_NAMES[trap?.tnote] || TRAP_NOTE_NAMES[0];
    if (!withArticle) return name;
    return /^[AEF]/.test(name) ? `an ${name}` : `a ${name}`;
}

function trap_mon_visible(mtmp) {
    if (!cansee(mtmp.mx, mtmp.my)) return false;
    if (mtmp.minvis && !(game.u?.usee_invisible || game.u?.uprops?.see_invisible)) return false;
    if (mtmp.mundetected) return false;
    return true;
}

async function wake_nearto_basic(x, y, distance) {
    // C ref: mon.c:wake_nearto_core().  Noise wakes indeterminate sleep
    // without angering monsters; temporary paralysis/frozen timers remain.
    for (const mon of game.level?.monsters || []) {
        if (distance !== 0 && dist2(mon.mx, mon.my, x, y) >= distance) continue;
        if (mon.msleeping && trap_mon_visible(mon)) {
            const extra = mon.data?.name === 'FLESH_GOLEM' ? " It's alive!" : '';
            await append_monster_topline(`The ${monster_name(mon)} wakes up.${extra}`);
        }
        mon.msleeping = 0;
    }
}

function helpless_basic(mtmp) {
    return !!mtmp?.msleeping || mtmp?.mcanmove === 0;
}

function breathless_basic(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_BREATHLESS);
}

function resists_sleep_basic(mtmp) {
    return !!((mtmp?.data?.mresists ?? 0) & MR_SLEEP);
}

function sleep_monst_basic(mtmp, amount) {
    // C ref: mhitm.c:sleep_monst(). Negative "how" callers skip the
    // separate resist() roll; sleep-gas traps pass a positive duration.
    if (!mtmp || resists_sleep_basic(mtmp) || mtmp.mcanmove === 0) return false;
    const frozen = Math.min((amount || 0) + (mtmp.mfrozen || 0), 127);
    if (frozen > 0) {
        mtmp.mcanmove = 0;
        mtmp.mfrozen = frozen;
    } else {
        mtmp.msleeping = 1;
    }
    return true;
}

async function mintrap_squeaky_board_basic(mtmp, trap) {
    // C ref: trap.c:trapeffect_sqky_board().
    if (mon_in_air(mtmp)) return MMOVE_MOVED;
    const note = trap_note_name(trap, true);
    if (trap_mon_visible(mtmp)) {
        trap.tseen = true;
        newsym(trap.tx, trap.ty);
        await append_monster_topline(`A board beneath ${monster_name(mtmp)} squeaks ${note} loudly.`);
    } else {
        const range = couldsee(mtmp.mx, mtmp.my) ? (BOLT_LIM + 1) : (BOLT_LIM - 3);
        const where = dist2(mtmp.mx, mtmp.my, game.u?.ux ?? 0, game.u?.uy ?? 0) <= range * range
            ? 'nearby' : 'in the distance';
        await append_monster_topline(`You hear ${note} squeak ${where}.`);
    }
    await wake_nearto_basic(mtmp.mx, mtmp.my, 40);
    return MMOVE_MOVED;
}

function mintrap_sleep_gas_basic(mtmp) {
    // C ref: trap.c:trapeffect_slp_gas_trap().
    if (!resists_sleep_basic(mtmp)
        && !breathless_basic(mtmp.data)
        && !helpless_basic(mtmp)) {
        sleep_monst_basic(mtmp, rnd(25));
    }
    return MMOVE_MOVED;
}

function mon_knows_traps_basic(mtmp, ttyp) {
    return !!((mtmp.mtrapseen || 0) & (1 << (ttyp - 1)));
}

function mon_learns_traps_basic(mtmp, ttyp) {
    mtmp.mtrapseen = (mtmp.mtrapseen || 0) | (1 << (ttyp - 1));
}

function mons_see_trap_basic(trap) {
    // C ref: mondata.c:mons_see_trap().
    const loc = game.level?.at(trap.tx, trap.ty);
    const maxdist = loc?.lit ? 49 : 2;
    for (const mon of game.level?.monsters || []) {
        if (mon.data?.mflags1 & (M1_ANIMAL | M1_MINDLESS | M1_NOEYES)) continue;
        if (mon.mcansee === 0) continue;
        if (dist2(mon.mx, mon.my, trap.tx, trap.ty) > maxdist) continue;
        if (!mon_can_see_square(mon, trap.tx, trap.ty)) continue;
        mon_learns_traps_basic(mon, trap.ttyp);
    }
}

function floor_trigger_trap_basic(ttyp) {
    // C ref: trap.c:floor_trigger().
    switch (ttyp) {
    case ARROW_TRAP:
    case DART_TRAP:
    case ROCKTRAP:
    case SQKY_BOARD:
    case BEAR_TRAP:
    case LANDMINE:
    case ROLLING_BOULDER_TRAP:
    case SLP_GAS_TRAP:
    case RUST_TRAP:
    case FIRE_TRAP:
    case PIT:
    case SPIKED_PIT:
    case HOLE:
    case TRAPDOOR:
        return true;
    default:
        return false;
    }
}

function trap_missile_basic(otyp, trap) {
    // C ref: trap.c:t_missile().
    const otmp = mksobj(otyp, true, false);
    otmp.quan = 1;
    otmp.opoisoned = 0;
    otmp.ox = trap.tx;
    otmp.oy = trap.ty;
    return otmp;
}

function monster_trap_ac_basic(mtmp) {
    if (typeof mtmp?.mac === 'number') return mtmp.mac;
    if (typeof mtmp?.ac === 'number') return mtmp.ac;
    switch (mtmp?.data?.name) {
    case 'KITTEN':
    case 'LITTLE_DOG':
        return 6;
    default:
        return mtmp?.data?.ac ?? 10;
    }
}

function trap_projectile_name(obj) {
    const base = object_base_name(obj);
    if (base) return object_display_name(obj, base);
    if (obj?.otyp === ARROW) return object_display_name(obj, 'arrow');
    if (obj?.otyp === ROCK) return 'a rock';
    return 'an object';
}

function trap_projectile_damage_basic(obj, mon) {
    // C refs: trap.c:thitm(), weapon.c:dmgval().  Missile trap damage is
    // rolled only after thitm() has already hit the monster.
    const big = (mon?.data?.msize ?? 2) >= MZ_LARGE;
    switch (obj?.otyp) {
    case DART:
        return rnd(big ? 2 : 3);
    case ARROW:
        return rnd(6);
    default:
        return 1;
    }
}

async function append_trap_topline(line) {
    if (game._more && game._pending_message) {
        game._after_more_message = game._after_more_message
            ? `${game._after_more_message}  ${line}`
            : line;
        game._after_more_needs_prompt = false;
        return;
    }
    await append_monster_topline(line);
}

async function thitm_basic(tlev, mtmp, obj, damageOverride = 0) {
    // C ref: trap.c:thitm().
    const strike = damageOverride
        ? true
        : monster_trap_ac_basic(mtmp) + tlev + (obj?.spe || 0) <= rnd(20);
    if (!strike) {
        if (obj && cansee(mtmp.mx, mtmp.my))
            await append_trap_topline(`${monster_subject(mtmp)} is almost hit by ${trap_projectile_name(obj)}!`);
        if (obj) stackobj(place_object(obj, mtmp.mx, mtmp.my));
        return false;
    }
    if (obj && cansee(mtmp.mx, mtmp.my))
        await append_trap_topline(`${monster_subject(mtmp)} is hit by ${trap_projectile_name(obj)}!`);
    const damage = damageOverride || Math.max(1, trap_projectile_damage_basic(obj, mtmp));
    mtmp.mhp = (mtmp.mhp ?? mtmp.mhpmax ?? 1) - damage;
    const killed = mtmp.mhp <= 0;
    if (obj && damageOverride) stackobj(place_object(obj, mtmp.mx, mtmp.my));
    if (killed) {
        const x = mtmp.mx;
        const y = mtmp.my;
        remove_dead_monster(mtmp);
        if (corpse_chance_basic(mtmp)) {
            make_monster_corpse_basic(mtmp);
            newsym(x, y);
        }
    }
    return killed;
}

function delete_trap_basic(trap) {
    const traps = game.level?.traps;
    const idx = traps?.indexOf(trap) ?? -1;
    if (idx >= 0) traps.splice(idx, 1);
}

async function mintrap_missile_basic(mtmp, trap, otyp, tlev) {
    if (trap.once && trap.tseen && !rn2(15)) {
        if (cansee(mtmp.mx, mtmp.my))
            await append_trap_topline(`${monster_subject(mtmp)} triggers a trap but nothing happens.`);
        delete_trap_basic(trap);
        newsym(mtmp.mx, mtmp.my);
        return MMOVE_MOVED;
    }
    trap.once = true;
    const otmp = trap_missile_basic(otyp, trap);
    if (otyp === DART && !rn2(6)) otmp.opoisoned = 1;
    if (cansee(mtmp.mx, mtmp.my)) {
        trap.tseen = true;
        newsym(trap.tx, trap.ty);
    }
    return (await thitm_basic(tlev, mtmp, otmp)) ? MMOVE_DIED : MMOVE_MOVED;
}

async function mintrap_rocktrap_basic(mtmp, trap) {
    // C ref: trap.c:trapeffect_rocktrap().
    if (trap.once && trap.tseen && !rn2(15)) {
        if (cansee(mtmp.mx, mtmp.my))
            await append_trap_topline(`A trap door above ${monster_name(mtmp)} opens, but nothing falls out!`);
        delete_trap_basic(trap);
        newsym(mtmp.mx, mtmp.my);
        return MMOVE_MOVED;
    }
    trap.once = true;
    const otmp = trap_missile_basic(ROCK, trap);
    if (cansee(mtmp.mx, mtmp.my)) {
        trap.tseen = true;
        newsym(trap.tx, trap.ty);
    }
    return (await thitm_basic(0, mtmp, otmp, d(2, 6))) ? MMOVE_DIED : MMOVE_MOVED;
}

function corpse_chance_basic(mon) {
    // C ref: mon.c:corpse_chance().
    const mdat = mon?.data || {};
    if ((mdat.geno || 0) & G_NOCORPSE) return false;
    const freq = (mdat.geno ?? 0) & G_FREQ;
    const verySmall = typeof mdat.msize === 'number' && mdat.msize < 1;
    const chance = 2 + (freq < 2 ? 1 : 0) + (verySmall ? 1 : 0);
    return !rn2(chance);
}

function make_monster_corpse_basic(mon) {
    // C ref: mon.c:mondied() -> mkobj.c:mkcorpstat(CORPSE, CORPSTAT_INIT).
    const wasInMklev = game.in_mklev;
    const oldLiveCorpseTimeout = game._live_corpse_timeout;
    game.in_mklev = false;
    game._live_corpse_timeout = true;
    let corpse;
    try {
        corpse = mksobj(CORPSE, true, false);
    } finally {
        game.in_mklev = wasInMklev;
        game._live_corpse_timeout = oldLiveCorpseTimeout;
    }
    if (!corpse) return null;
    corpse.corpsenm = mon?.data?.name || corpse.corpsenm;
    return place_object(corpse, mon.mx, mon.my);
}

async function mintrap_pit_basic(mtmp, trap) {
    // C ref: trap.c:trapeffect_pit().
    const inSight = cansee(mtmp.mx, mtmp.my);
    if (!mon_passes_walls(mtmp)) mtmp.mtrapped = 1;
    if (inSight) {
        await append_trap_topline(`${monster_subject(mtmp)} falls into a pit!`);
        trap.tseen = true;
        newsym(trap.tx, trap.ty);
    }
    const damage = rnd(trap.ttyp === SPIKED_PIT ? 10 : 6);
    mtmp.mhp = (mtmp.mhp ?? mtmp.mhpmax ?? 1) - damage;
    if (mtmp.mhp > 0) return mtmp.mtrapped ? MMOVE_DONE : MMOVE_MOVED;

    if (inSight) await append_pline(`${monster_subject(mtmp)} is killed!`);
    remove_dead_monster(mtmp);
    if (corpse_chance_basic(mtmp)) {
        make_monster_corpse_basic(mtmp);
        newsym(mtmp.mx, mtmp.my);
    }
    return MMOVE_DIED;
}

async function mintrap_hole_basic(mtmp, trap) {
    // C refs: trap.c:trapeffect_hole(), teleport.c:mlevel_tele_trap().
    const inSight = cansee(mtmp.mx, mtmp.my);
    if (inSight) {
        const where = trap.ttyp === HOLE ? 'falls into a hole' : 'falls through a trap door';
        await append_trap_topline(`Suddenly, ${monster_name(mtmp)} ${where}.`);
        trap.tseen = true;
        newsym(trap.tx, trap.ty);
    }
    migrate_monster_off_level_basic(mtmp, trap);
    return MMOVE_DIED;
}

async function mintrap_fire_basic(mtmp, trap) {
    // C ref: src/trap.c:trapeffect_fire_trap().
    const inSight = cansee(mtmp.mx, mtmp.my);
    const origDmg = d(2, 4);
    let killed = false;
    if (inSight) {
        trap.tseen = true;
        newsym(trap.tx, trap.ty);
        await append_trap_topline(`A tower of flame erupts from the floor under ${monster_name(mtmp)}!`);
    }
    if (resists_fire_basic(mtmp)) {
        if (inSight) await append_trap_topline(`${monster_subject(mtmp)} is uninjured.`);
    } else {
        killed = await thitm_basic(0, mtmp, null, origDmg);
        if (!killed) {
            mtmp.mhpmax = Math.max(1, (mtmp.mhpmax ?? mtmp.mhp ?? 1) - rn2(origDmg + 1));
            if ((mtmp.mhp ?? 0) > mtmp.mhpmax) mtmp.mhp = mtmp.mhpmax;
        }
    }
    rn2(3); // C ref: src/trap.c:trapeffect_fire_trap() burnarmor()/destroy_items gate.
    return killed ? MMOVE_DIED : MMOVE_MOVED;
}

async function mintrap_magic_basic(mtmp, trap) {
    // C ref: src/trap.c:trapeffect_magic_trap().  Monsters are usually
    // immune; one in twenty-one activations behaves like a fire trap.
    if (rn2(21)) return MMOVE_MOVED;
    return mintrap_fire_basic(mtmp, trap);
}

async function mintrap_basic(mtmp) {
    const trap = trap_at_basic(mtmp.mx, mtmp.my);
    if (!trap) return MMOVE_MOVED;
    // C ref: trap.c:mintrap().  Floor traps first check whether the monster
    // is in the air, then known trap types usually get avoided without the
    // effect firing.
    if (floor_trigger_trap_basic(trap.ttyp) && mon_in_air(mtmp)) return MMOVE_MOVED;
    if (mon_knows_traps_basic(mtmp, trap.ttyp) && rn2(4)) return MMOVE_MOVED;
    mon_learns_traps_basic(mtmp, trap.ttyp);
    mons_see_trap_basic(trap);
    if (trap.ttyp === MAGIC_PORTAL) {
        migrate_monster_off_level_basic(mtmp, trap);
        return MMOVE_DIED;
    }
    if (trap.ttyp === SQKY_BOARD) return mintrap_squeaky_board_basic(mtmp, trap);
    if (trap.ttyp === SLP_GAS_TRAP) return mintrap_sleep_gas_basic(mtmp);
    if (trap.ttyp === ARROW_TRAP) return mintrap_missile_basic(mtmp, trap, ARROW, 8);
    if (trap.ttyp === DART_TRAP) return mintrap_missile_basic(mtmp, trap, DART, 7);
    if (trap.ttyp === ROCKTRAP) return mintrap_rocktrap_basic(mtmp, trap);
    if (trap.ttyp === PIT || trap.ttyp === SPIKED_PIT) return mintrap_pit_basic(mtmp, trap);
    if (trap.ttyp === HOLE || trap.ttyp === TRAPDOOR) return mintrap_hole_basic(mtmp, trap);
    if (trap.ttyp === FIRE_TRAP) return mintrap_fire_basic(mtmp, trap);
    if (trap.ttyp === MAGIC_TRAP) return mintrap_magic_basic(mtmp, trap);
    return MMOVE_MOVED;
}

async function mb_trapped_basic(mtmp, canseeit = cansee(mtmp.mx, mtmp.my)) {
    // C ref: monmove.c:mb_trapped(). Trapped doors report the explosion
    // before applying the rnd(15) damage.
    if (canseeit) {
        await append_pline('KABOOM!!  You see a door explode.');
    } else {
        const range = dist2(game.u?.ux ?? mtmp.mx, game.u?.uy ?? mtmp.my, mtmp.mx, mtmp.my) > 49
            ? 'distant'
            : 'nearby';
        await append_pline(`You hear a ${range} explosion.`);
    }
    mtmp.mstun = 1;
    if (typeof mtmp.mhp === 'number') {
        mtmp.mhp -= rnd(15);
        if (mtmp.mhp <= 0) {
            remove_dead_monster(mtmp);
            return true;
        }
    } else {
        rnd(15);
    }
    return false;
}

async function postmove_door_basic(mtmp) {
    const loc = game.level?.at(mtmp.mx, mtmp.my);
    if (!loc || !IS_DOOR(loc.typ) || mon_passes_walls(mtmp)) return MMOVE_MOVED;
    const trapped = !!(loc.doormask & D_TRAPPED);
    let canseeit = cansee(mtmp.mx, mtmp.my);
    if ((loc.doormask & D_LOCKED) && trapped) {
        set_door_mask_basic(loc, D_NODOOR);
        refresh_monster_door_vision(mtmp);
        canseeit = canseeit || cansee(mtmp.mx, mtmp.my);
        return await mb_trapped_basic(mtmp, canseeit) ? MMOVE_DIED : MMOVE_MOVED;
    }
    if (loc.doormask === D_CLOSED && mon_can_open_doors(mtmp)) {
        set_door_mask_basic(loc, D_ISOPEN);
        // C ref: monmove.c:postmov().  The monster has already moved to the
        // door square, but an unseen opener is reported as the door changing.
        mtmp._opened_unseen_door = true;
        refresh_monster_door_vision(mtmp);
        canseeit = canseeit || cansee(mtmp.mx, mtmp.my);
        if (canseeit) await append_pline('You see a door open.');
        else await append_pline('You hear a door open.');
    } else if ((loc.doormask & D_CLOSED) && trapped) {
        set_door_mask_basic(loc, D_NODOOR);
        refresh_monster_door_vision(mtmp);
        canseeit = canseeit || cansee(mtmp.mx, mtmp.my);
        return await mb_trapped_basic(mtmp, canseeit) ? MMOVE_DIED : MMOVE_MOVED;
    }
    return MMOVE_MOVED;
}

function eshk_basic(mtmp) {
    return mtmp?.mextra?.eshk || null;
}

function room_for_no_basic(roomno) {
    const idx = (roomno ?? 0) - ROOMOFFSET;
    return idx >= 0 ? game.level?.rooms?.[idx] : null;
}

function in_his_shop_basic(mtmp) {
    const eshk = eshk_basic(mtmp);
    const loc = game.level?.at(mtmp?.mx, mtmp?.my);
    const room = room_for_no_basic(eshk?.shoproom);
    return !!eshk && !!loc && loc.roomno === eshk.shoproom && (room?.rtype ?? 0) >= SHOPBASE;
}

function hero_in_shop_basic(eshk) {
    const loc = game.level?.at(game.u?.ux, game.u?.uy);
    return !!eshk && loc?.roomno === eshk.shoproom;
}

function shk_move_candidate_ok(mtmp, x, y, omx, omy) {
    if (!isok(x, y)) return false;
    if (no_diagonal_movement(mtmp) && x !== omx && y !== omy) return false;
    if (x !== omx && y !== omy
        && (door_blocks_diagonal(omx, omy) || door_blocks_diagonal(x, y))) {
        return false;
    }
    return can_mon_step(mtmp, x, y);
}

function move_special_basic(mtmp, inHisShop, appr, uondoor, avoid, omx, omy, ggx, ggy) {
    // C ref: priest.c:move_special().  Shared by shopkeepers and priests;
    // current JS models the shopkeeper branch far enough to preserve the
    // room-candidate RNG front door and ordinary relocation.
    if (omx === ggx && omy === ggy) return MMOVE_NOTHING;
    if (mtmp.mconf) {
        avoid = false;
        appr = 0;
    }

    const candidates = [];
    const maxx = Math.min(omx + 1, COLNO - 1);
    const maxy = Math.min(omy + 1, ROWNO - 1);
    for (let nx = Math.max(1, omx - 1); nx <= maxx; nx++) {
        for (let ny = Math.max(0, omy - 1); ny <= maxy; ny++) {
            if (nx === omx && ny === omy) continue;
            if (!shk_move_candidate_ok(mtmp, nx, ny, omx, omy)) continue;
            const loc = game.level?.at(nx, ny);
            if (!IS_ROOM(loc?.typ)
                && !(mtmp.isshk && (!inHisShop || eshk_basic(mtmp)?.following))) {
                continue;
            }
            const onLine = online2_basic(nx, ny, game.u?.ux ?? nx, game.u?.uy ?? ny);
            candidates.push({ x: nx, y: ny, onLine });
        }
    }

    // C ref: priest.c:move_special().  If the hero is on a shop door and
    // every legal shopkeeper move remains on-line, the shopkeeper abandons
    // line avoidance and picks normally.
    if (mtmp.isshk && avoid && uondoor && !candidates.some((cand) => !cand.onLine)) {
        avoid = false;
    }

    let nix = omx;
    let niy = omy;
    let chcnt = 0;
    for (const cand of candidates) {
        if (avoid && cand.onLine) continue;
        if ((!appr && !rn2(++chcnt))
            || (appr && dist2(cand.x, cand.y, ggx, ggy) < dist2(nix, niy, ggx, ggy))) {
            nix = cand.x;
            niy = cand.y;
        }
    }

    if (nix === omx && niy === omy) return MMOVE_NOTHING;
    if (mon_at(nix, niy, mtmp) || (nix === game.u?.ux && niy === game.u?.uy)) return MMOVE_NOTHING;
    move_mon_to_basic(mtmp, nix, niy);
    return MMOVE_MOVED;
}

function shk_move_basic(mtmp) {
    // C ref: shk.c:shk_move().  Billing, speech, repairs, and following are
    // still partial; this keeps the movement-front-door predicates that decide
    // whether priest.c:move_special() owns RNG on ordinary shop levels.
    const eshk = eshk_basic(mtmp);
    if (!eshk) return MMOVE_NOTHING;
    const omx = mtmp.mx;
    const omy = mtmp.my;
    const udist = dist2(omx, omy, game.u?.ux ?? omx, game.u?.uy ?? omy);
    if (udist < 3 && !mtmp.mpeaceful) return MMOVE_NOTHING;

    let appr = 1;
    let gtx = eshk.shk?.x ?? omx;
    let gty = eshk.shk?.y ?? omy;
    const satdoor = gtx === omx && gty === omy;
    let avoid = false;
    const following = !!eshk.following;

    if (following) {
        if (udist > 4 && !eshk.billct) return MMOVE_NOTHING;
        gtx = game.u?.ux ?? gtx;
        gty = game.u?.uy ?? gty;
    } else if (!mtmp.mpeaceful) {
        if (mtmp.mcansee !== 0 && m_canseeu_basic(mtmp)) {
            gtx = game.u?.ux ?? gtx;
            gty = game.u?.uy ?? gty;
        }
    } else {
        const uondoor = game.u?.ux === eshk.shd?.x && game.u?.uy === eshk.shd?.y;
        const badinv = false;
        if (uondoor) {
            if (satdoor && badinv) return MMOVE_NOTHING;
            avoid = !badinv;
        } else {
            avoid = hero_in_shop_basic(eshk) && dist2(game.u?.ux ?? gtx, game.u?.uy ?? gty, gtx, gty) > 8;
        }
        if (((!eshk.robbed && !eshk.billct && !eshk.debit) || avoid)
            && dist2(omx, omy, gtx, gty) < 3) {
            if (!badinv && !online2_basic(omx, omy, game.u?.ux ?? omx, game.u?.uy ?? omy)) {
                return MMOVE_NOTHING;
            }
            if (satdoor) {
                appr = 0;
                gtx = 0;
                gty = 0;
            }
        }
        return move_special_basic(mtmp, in_his_shop_basic(mtmp), appr, uondoor, avoid, omx, omy, gtx, gty);
    }

    return move_special_basic(mtmp, in_his_shop_basic(mtmp), appr, false, avoid, omx, omy, gtx, gty);
}

function mon_track_add(mtmp, x, y) {
    if (!mtmp.mtrack) mtmp.mtrack = [];
    mtmp.mtrack.unshift({ x, y });
    if (mtmp.mtrack.length > MTSZ) mtmp.mtrack.length = MTSZ;
}

function monster_level(mtmp) {
    return mtmp?.m_lev ?? mtmp?.data?.mlevel ?? 0;
}

function is_undirected_spell_basic(spellName) {
    return !!(MCAST[spellName]?.flags & MCF_INDIRECT);
}

function spell_would_be_useless_basic(mtmp, spellName) {
    const spell = MCAST[spellName];
    if (!spell) return false;
    if ((spell.flags & MCF_HOSTILE) && mtmp.mpeaceful) return true;
    if ((spell.flags & MCF_SIGHT) && !couldsee(mtmp.mx, mtmp.my)) return true;
    switch (spellName) {
    case 'HASTE_SELF':
        return mtmp.permspeed === MFAST;
    case 'DISAPPEAR':
        // C ref: mcastu.c:spell_would_be_useless().
        if (mtmp.mpeaceful && !hero_sees_invisible_basic()) return true;
        return !!(mtmp.minvis || mtmp.invis_blkd);
    case 'CURE_SELF':
        return (mtmp.mhp ?? 1) >= (mtmp.mhpmax ?? mtmp.mhp ?? 1);
    case 'CLONE_WIZ':
        return !mtmp.iswiz || (game.context?.no_of_wizards ?? 0) > 1;
    case 'GEYSER':
        return !rn2(5);
    case 'DEATH_TOUCH':
        if (hallucinating() && !rn2(2)) return true;
        return false;
    default:
        return false;
    }
}

function choose_monster_spell_basic(mtmp, adtyp) {
    const list = adtyp === 'AD_CLRC' ? MON_CLERIC_SPELLS : MON_WIZARD_SPELLS;
    const maxlev = MCAST[list[list.length - 1]].level;
    let spellval = rn2(Math.max(1, monster_level(mtmp)));
    if (spellval > maxlev && rn2(maxlev)) spellval = rn2(maxlev);
    for (let i = list.length - 1; i >= 0; i--) {
        const spellName = list[i];
        if (MCAST[spellName].level <= spellval
            && !spell_would_be_useless_basic(mtmp, spellName)) {
            return spellName;
        }
    }
    return list[0];
}

function magic_spell_attack_basic(mtmp) {
    return (mtmp.data?.mattk || []).find((attack) =>
        attack?.[0] === 'AT_MAGC' && (attack?.[1] === 'AD_SPEL' || attack?.[1] === 'AD_CLRC'));
}

function apply_undirected_spell_basic(mtmp, spellName) {
    switch (spellName) {
    case 'HASTE_SELF':
        mtmp.mspeed = MFAST;
        mtmp.permspeed = MFAST;
        return true;
    case 'DISAPPEAR':
        mtmp.minvis = 1;
        return true;
    case 'CURE_SELF':
        if ((mtmp.mhp ?? 0) < (mtmp.mhpmax ?? 0)) {
            mtmp.mhp = Math.min(mtmp.mhpmax, (mtmp.mhp ?? 0) + Math.max(1, monster_level(mtmp)));
        }
        return true;
    default:
        return true;
    }
}

function maybe_cast_undirected_spell_before_move(mtmp) {
    // C ref: monmove.c:dochug()/mcastu.c:castmu().  Non-attacking casters
    // still choose one spell before m_move(); directed picks usually miss and
    // leave the monster to move normally.
    if (mtmp.mspec_used || dist2(mtmp.mx, mtmp.my, game.u?.ux ?? mtmp.mx, game.u?.uy ?? mtmp.my) > 49) {
        return false;
    }
    const attack = magic_spell_attack_basic(mtmp);
    if (!attack) return false;
    const spellName = choose_monster_spell_basic(mtmp, attack[1]);
    if (!is_undirected_spell_basic(spellName) || spell_would_be_useless_basic(mtmp, spellName)) {
        return false;
    }
    const ml = monster_level(mtmp);
    if (mtmp.mcan || mtmp.mspec_used || !ml) return false;
    mtmp.mspec_used = ml < 8 ? 10 - ml : 2;
    if (rn2(ml * 10) < (mtmp.mconf ? 100 : 20)) return false;
    return apply_undirected_spell_basic(mtmp, spellName);
}

function attack_is_basic_physical(attack) {
    if (!attack) return true;
    const [aatyp, adtyp, damn, damd] = attack;
    return BASIC_MELEE_ATTACKS.has(aatyp)
        && BASIC_MELEE_ADTYPES.has(adtyp)
        && (adtyp.startsWith('AD_DR') || (damn > 0 && damd > 0));
}

function basic_physical_attacks(mtmp, includeWeapon = true) {
    const attacks = mtmp.data?.mattk || [];
    if (!attacks.filter(Boolean).length) return null;
    if (!includeWeapon && attacks.some((attack) => attack?.[0] === 'AT_WEAP')) return null;
    const melee = [];
    for (const attack of attacks) {
        if (!attack) {
            melee.push(attack);
            continue;
        }
        const [aatyp] = attack;
        if (DISTANCE_ATTACK_TYPES.has(aatyp)) {
            melee.push(null);
            continue;
        }
        if (!attack_is_basic_physical(attack)) return null;
        melee.push(attack);
    }
    return melee.some(Boolean) ? melee : null;
}

function wildmiss_melee_attack_available_basic(mtmp) {
    // C ref: mhitu.c:mattacku().  `wildmiss()` is shared by ordinary
    // hand-to-hand and adjacent weapon attacks, independent of adtyp.
    return (mtmp.data?.mattk || []).some((attack) => attack && BASIC_MELEE_ATTACKS.has(attack[0]));
}

function basic_engulf_attack(mtmp) {
    const attacks = mtmp.data?.mattk || [];
    const realAttacks = attacks.filter(Boolean);
    if (realAttacks.length !== 1) return null;
    const attack = realAttacks[0];
    const [aatyp, adtyp, damn, damd] = attack;
    if (aatyp !== 'AT_ENGL' || damn <= 0 || damd <= 0) return null;
    if (!['AD_COLD', 'AD_FIRE', 'AD_ELEC', 'AD_PHYS', 'AD_ACID'].includes(adtyp)) return null;
    return attack;
}

function cooldown_replacement_attack(mtmp) {
    if (!mtmp.mspec_used) return null;
    const attack = basic_engulf_attack(mtmp);
    if (!attack) return null;
    const [, adtyp] = attack;
    if (['AD_COLD', 'AD_FIRE', 'AD_ELEC', 'AD_ACID'].includes(adtyp)) {
        return ['AT_TUCH', adtyp, 1, 6];
    }
    return ['AT_CLAW', 'AD_PHYS', 1, 6];
}

function hero_ac_value() {
    const uac = game.u?.uac ?? 10;
    return uac >= 0 ? uac : -rnd(-uac);
}

function reduce_damage_by_negative_ac(damage) {
    const uac = game.u?.uac ?? 10;
    if (damage > 0 && uac < 0) {
        damage -= rnd(-uac);
        if (damage < 1) damage = 1;
    }
    return damage;
}

function hero_magic_negation() {
    // Full armor `a_can` state is not modeled yet.  Keep the C call shape
    // centralized so worn-armor cancellation can be plugged in here.
    return game.u?.magic_negation ?? 0;
}

function mhitm_mgc_atk_negated_basic(mtmp) {
    if (mtmp.mcan) return true;
    const armpro = hero_magic_negation();
    return !(rn2(10) >= 3 * armpro);
}

const WAND_KNOWN_NAMES = new Map([
    [WAN_STRIKING, 'wand of striking'],
    [WAN_TELEPORTATION, 'wand of teleportation'],
    [WAN_UNDEAD_TURNING, 'wand of undead turning'],
]);

function object_type_known_basic(otyp) {
    return !!game.discoveredObjects
        && typeof game.discoveredObjects.has === 'function'
        && game.discoveredObjects.has(otyp);
}

function discover_monster_wand_effect(otyp) {
    if (!Number.isInteger(otyp)) return;
    const order = Array.isArray(game.discoveryOrder)
        ? game.discoveryOrder
        : (game.discoveryOrder = []);
    if (!order.includes(otyp)) order.push(otyp);
    const discovered = game.discoveredObjects || (game.discoveredObjects = new Set());
    if (discovered.has(otyp)) return;
    discovered.add(otyp);
    // C refs: src/muse.c:mbhitm(), include/hack.h:makeknown(),
    // src/o_init.c:discover_object().  Observing a wand's effect discovers
    // the type and credits the hero with Wisdom exercise.
    exercise(A_WIS, true);
}

function wand_display_name(obj) {
    if (object_type_known_basic(obj?.otyp) && WAND_KNOWN_NAMES.has(obj.otyp))
        return `a ${WAND_KNOWN_NAMES.get(obj.otyp)}`;
    const appearance = getObjectDescription(obj?.otyp) || '';
    return appearance ? `a ${appearance} wand` : 'a wand';
}

function offensive_wand_candidate_basic(mtmp) {
    const candidate = offensive_item_candidate_basic(mtmp);
    return candidate?.kind === 'wand' ? candidate.obj : null;
}

function sync_adjacent_offensive_wand_turn_tail(mtmp) {
    if (!mtmp?.isshk || !monnear_hero(mtmp)) return;
    // C refs: mhitu.c:mattacku() -> muse.c:use_offensive(), then the
    // surrounding allmain/monmove turn tail resumes before the adjacent
    // shopkeeper's physical hit becomes visible.
    exercise(A_DEX, true);
    distfleeck(mtmp);
    rn2(8);
    distfleeck(mtmp);
    distfleeck(mtmp);
}

async function use_offensive_wand_basic(mtmp, obj) {
    if (!obj || !await mzapwand_basic(mtmp, obj, false)) return false;
    // C ref: muse.c:use_offensive() passes rn1(8,6) to mbhit().
    rn2(8);
    if (game.u?.uprops?.magic_resistance) {
        await append_monster_effect_topline('Boing!');
    } else {
        const roll = rnd(20);
        if (roll < 10 + hero_ac_value()) {
            const preDamageHp = game.u?.uhp ?? 0;
            await append_monster_effect_topline('The wand hits you!');
            let damage = d(2, 12);
            damage = reduce_damage_by_negative_ac(damage);
            if (damage > 0 && game._more) {
                // C refs: src/muse.c:mbhitm(), src/topl.c:more(),
                // src/display.c:bot().  The wand hit message can block on
                // `--More--`; that prompt still shows the pre-losehp status.
                game._latched_status_uhp = preDamageHp;
                game._clear_latched_status_after_more = true;
            }
            apply_hero_damage(damage);
            if ((game.u?.uhp ?? 0) > 0) discover_monster_wand_effect(obj.otyp);
            if ((game.u?.uhp ?? 0) <= 0) {
                begin_monster_fatal_damage_basic();
                game._death_killer_name = 'wand';
                if (mtmp.isshk && shopkeeper_name(mtmp)
                    && ((game.inventory || []).length || (game._goldCount || 0) > 0)) {
                    // C refs: src/end.c:done(), src/shk.c:paybill()/inherits().
                    game._death_shopkeeper_takes_name = shopkeeper_name(mtmp);
                }
                game._monster_death_pending = true;
                game._fatal_monster_attack_paused = true;
                game._monster_turn_paused_for_more = true;
                if (game._after_more_message) game._after_more_needs_prompt = true;
            }
        } else {
            await append_monster_effect_topline('The wand misses you.');
        }
    }
    mtmp.mwandexp = true;
    const packedHeroWandLine = /^You (?:hit|miss|kill) /.test(game._pending_message || '');
    if (!String(game._after_more_message || '').startsWith('The wand ')
        && !(packedHeroWandLine && !(game._pending_message || '').includes(' gets angry!'))) {
        sync_adjacent_offensive_wand_turn_tail(mtmp);
    }
    return true;
}

function destroy_items_shape(_adtyp, damage) {
    const scale = 5; // C ref: zap.c DMG_DESTROY_SCALE
    let limit = Math.trunc(damage / scale);
    if ((damage % scale) > rn2(scale)) limit++;
    if (limit < 1) return 0;
    // Inventory destruction and eligible-stack reservoir selection are not
    // modeled yet.  Current evidence only needs the damage-limit front door.
    return 0;
}

function elemental_hit_side_effects(mtmp, adtyp, damage) {
    if (!['AD_COLD', 'AD_FIRE', 'AD_ELEC'].includes(adtyp)) return damage;
    const negated = mhitm_mgc_atk_negated_basic(mtmp);
    if (negated) return 0;
    // C ref: mhitm_ad_cold/fire/elec() gates inventory destruction on
    // attacker level after a non-negated elemental hit.
    if (monster_level(mtmp) > rn2(20)) destroy_items_shape(adtyp, damage);
    return damage;
}

function monster_subject_suffix(subject) {
    if (subject === 'It') return 'Its';
    return subject.endsWith('s') ? `${subject}'` : `${subject}'s`;
}

function poison_delivery_subject(attack) {
    const [aatyp] = attack || [];
    if (aatyp === 'AT_WEAP') return 'attack';
    if (aatyp === 'AT_TUCH') return 'contact';
    if (aatyp === 'AT_GAZE') return 'gaze';
    if (aatyp === 'AT_BITE') return 'bite';
    return 'sting';
}

function poison_attribute_for_adtyp(adtyp) {
    if (adtyp === 'AD_DRDX') return A_DEX;
    if (adtyp === 'AD_DRCO') return A_CON;
    return A_STR;
}

function poison_attribute_message(attr) {
    if (attr === A_DEX) return "Your muscles won't obey you!";
    if (attr === A_CON) return 'You feel very sick!';
    return 'You feel weaker!';
}

function reduce_poisoned_attribute(attr, loss) {
    const u = game.u;
    if (!u?.acurr?.a) return false;
    const before = u.acurr.a[attr] ?? 10;
    const after = Math.max(3, before - Math.max(0, loss));
    u.acurr.a[attr] = after;
    return after !== before;
}

function poisoned_by_monster_attack_basic(mtmp, attack, attr, messages) {
    const reason = `${monster_subject_suffix(monster_subject(mtmp))} ${poison_delivery_subject(attack)}`;
    messages.push(`${reason} was poisoned!`);
    if (game.u?.uprops?.poison_resistance) {
        messages.push("The poison doesn't seem to affect you.");
        return;
    }

    const fatal = rn2(30);
    if (fatal === 0) {
        const loss = 6 + d(4, 6);
        if ((game.u?.uhp ?? 0) <= loss) {
            game.u.uhp = -1;
            messages.push('The poison was deadly...');
        } else {
            apply_hero_damage(loss);
            if (reduce_poisoned_attribute(A_CON, attr !== A_CON ? 1 : 3))
                messages.push(poison_attribute_message(A_CON));
            if (attr !== A_CON && reduce_poisoned_attribute(attr, 3))
                messages.push(poison_attribute_message(attr));
        }
    } else if (fatal > 5) {
        apply_hero_damage(rn2(10) + 6);
    } else {
        const loss = d(2, 2);
        if (reduce_poisoned_attribute(attr, loss))
            messages.push(poison_attribute_message(attr));
    }
}

function drain_strength_hit_side_effects(mtmp, attack, messages) {
    const [, adtyp] = attack || [];
    if (!['AD_DRST', 'AD_DRDX', 'AD_DRCO'].includes(adtyp)) return;
    const negated = mhitm_mgc_atk_negated_basic(mtmp);
    if (!negated && !rn2(8)) {
        poisoned_by_monster_attack_basic(mtmp, attack, poison_attribute_for_adtyp(adtyp), messages);
    }
}

function mhitm_knockback_frontdoor() {
    // C ref: uhitm.c:mhitm_knockback() computes these two rolls before
    // most qualification checks, including attack-type eligibility.
    rn2(3);
    rn2(6);
}

function mattacku_to_hit(mtmp) {
    let toHit = hero_ac_value() + 10 + monster_level(mtmp);
    if ((game._occupation_turns_remaining || 0) > 0) toHit += 4;
    if (mtmp.mcansee === 0) toHit -= 2;
    if (mtmp.mtrapped) toHit -= 2;
    if (toHit <= 0) toHit = 1;
    return toHit;
}

function apply_hero_damage(damage) {
    if (damage > 0) game.u.uhp = Math.max(0, (game.u.uhp ?? 0) - damage);
}

function handle_monster_fatal_damage(mtmp, preDamageHp) {
    if ((game.u?.uhp ?? 0) > 0) return false;
    begin_monster_fatal_damage_basic();
    const pendingTopline = game._pending_message || '';
    const preserveFatalHitStatusHp = (!pendingTopline && preDamageHp <= 1)
        || (!!pendingTopline && !/^You /.test(pendingTopline));
    let preserveDeathPromptStatusHp = preserveFatalHitStatusHp;
    if (mtmp.isshk && shopkeeper_name(mtmp)) {
        const honorific = mtmp.female ? 'Ms.' : 'Mr.';
        game._death_killer_name = `${honorific} ${shopkeeper_name(mtmp)}, the shopkeeper`;
        game._death_killer_format = 'by';
        game._death_shopkeeper_killer = { honorific, name: shopkeeper_name(mtmp) };
        preserveDeathPromptStatusHp = false;
    } else {
        game._death_killer_name = monster_name(mtmp);
        game._death_killer_format = 'by-an';
        game._death_shopkeeper_killer = null;
    }
    game._death_preserve_latched_status = preserveDeathPromptStatusHp;
    if (!game._pet_combat_resume_active)
        // C refs: src/mhitu.c:hitmu(), src/end.c:done().
        // Fatal hit More frames can show the pre-damage status until
        // done_in_by() advances to the death prompt.
        game._latched_status_uhp = preserveFatalHitStatusHp ? preDamageHp : 0;
    game._monster_death_pending = true;
    // C refs: mhitu.c:mattacku(), end.c:done().  Wizard/explore death
    // handling interrupts the current monster turn even when the hit occurred
    // while resuming a deferred pet-combat More.
    if (mtmp.isshk && shopkeeper_name(mtmp)
        && ((game.inventory || []).length || (game._goldCount || 0) > 0)) {
        // C ref: shk.c:paybill()/inherits().
        game._death_shopkeeper_takes_name = shopkeeper_name(mtmp);
    }
    game._fatal_monster_attack_paused = true;
    game._monster_turn_paused_for_more = true;
    return true;
}

function begin_monster_fatal_damage_basic() {
    if (game._death_bones_checked) return;
    game._death_bones_checked = true;
    // C refs: src/mhitu.c:mdamageu(), src/end.c:done_in_by(),
    // src/end.c:really_done(), src/bones.c:can_make_bones().
    game._death_bones_check_pending = true;
}

async function unstuck_swallowed_hero(mtmp) {
    if (!game.u?.uswallow || game.u.ustuck !== mtmp) return;
    game.u.uswallow = false;
    game.u.ustuck = null;
    game.u.uswldtim = 0;
    game._swallowed_display_pending = false;
    game._swallowed_map_active = false;
    game._swallowed_overlay = null;
    game.u.ux = mtmp.mx;
    game.u.uy = mtmp.my;
    if (!mtmp.mspec_used && basic_engulf_attack(mtmp)) {
        mtmp.mspec_used = rnd(2);
    }
    const spot = enexto_core(game.u.ux, game.u.uy, mtmp.data, GP_CHECKSCARY)
        || enexto_core(game.u.ux, game.u.uy, mtmp.data, 0);
    if (spot) {
        const omx = mtmp.mx;
        const omy = mtmp.my;
        mtmp.mx = spot.x;
        mtmp.my = spot.y;
        newsym(omx, omy);
        newsym(mtmp.mx, mtmp.my);
    }
    game.vision_full_recalc = 1;
    await docrt();
}

export async function finish_pending_swallowed_expulsion() {
    if (!game._pending_swallowed_display_clear) return false;
    game._pending_swallowed_display_clear = false;
    const mtmp = game._pending_swallowed_expulsion_mon || null;
    game._pending_swallowed_expulsion_mon = null;
    game._swallowed_latched_overlay = null;
    if (mtmp && game.u?.uswallow && game.u.ustuck === mtmp) {
        await unstuck_swallowed_hero(mtmp);
        game._latched_status_uhp = null;
        return true;
    }
    if (game.u) {
        game.u.uswallow = false;
        game.u.ustuck = null;
        game.u.uswldtim = 0;
    }
    game._swallowed_display_pending = false;
    game._swallowed_map_active = false;
    game._swallowed_latched_overlay = null;
    game._swallowed_overlay = null;
    game._latched_status_uhp = null;
    game.vision_full_recalc = 1;
    await docrt();
    return true;
}

async function engulf_attack(mtmp, attack, toHit) {
    await flush_pending_more_before_monster_message();
    const [, adtyp, damn, damd] = attack;
    const alreadySwallowed = game.u?.uswallow && game.u?.ustuck === mtmp;
    if (!alreadySwallowed && !(toHit > rnd(20))) return true;
    let damage = d(damn, damd);
    if (!alreadySwallowed) {
        game.u.ustuck = mtmp;
        mtmp.mx = game.u.ux;
        mtmp.my = game.u.uy;
        newsym(mtmp.mx, mtmp.my);
        game._pet_combat_more_latched = false;
        await show_blocking_monster_message(`The ${monster_name(mtmp)} engulfs you!`);
        if (!game._more) queue_more_prompt();
        game.u.uswallow = true;
        game.u.uswldtim = Math.max(2, rnd(monster_level(mtmp) + 5));
        game._swallowed_display_pending = true;
    }
    if ((game.u.uswldtim || 0) > 0) {
        game.u.uswldtim--;
    }

    let swallowedDamagePackedWithHeroHit = false;
    switch (adtyp) {
    case 'AD_COLD':
    case 'AD_FIRE':
    case 'AD_ELEC':
        await flush_pending_more_before_monster_message();
        if (mtmp.mcan || !rn2(2)) {
            damage = 0;
        } else if (adtyp === 'AD_COLD') {
            swallowedDamagePackedWithHeroHit = await append_swallowed_damage_message('You are freezing to death!')
                && /^You hit /.test(game._pending_message || '');
        } else if (adtyp === 'AD_FIRE') {
            swallowedDamagePackedWithHeroHit = await append_swallowed_damage_message('You are burning to a crisp!')
                && /^You hit /.test(game._pending_message || '');
        } else if (adtyp === 'AD_ELEC') {
            swallowedDamagePackedWithHeroHit = await append_swallowed_damage_message('The air around you crackles with electricity.')
                && /^You hit /.test(game._pending_message || '');
        }
        break;
    case 'AD_PHYS':
        damage = reduce_damage_by_negative_ac(damage);
        break;
    case 'AD_ACID':
        break;
    default:
        damage = 0;
        break;
    }
    apply_hero_damage(damage);
    if (damage > 0) game._occupation_turns_remaining = 0;
    if (game.u?.uswallow && (game.u.uswldtim || 0) <= 0) {
        await append_swallowed_damage_message('You get expelled!');
        queue_more_prompt();
        game._latched_status_uhp = game.u?.uhp ?? null;
        game._swallowed_latched_overlay = game._swallowed_overlay;
        game._pending_swallowed_expulsion_mon = mtmp;
        game._pending_swallowed_display_clear = true;
        swallowedDamagePackedWithHeroHit = false;
    }
    if (swallowedDamagePackedWithHeroHit && !game._more
        && (game._pending_message?.length || 0) >= 54) {
        queue_more_prompt();
        game._swallowed_damage_more_latched = true;
    }
    return true;
}

async function latch_monster_attack_more_frame(line) {
    if (!line || game._more || game._latched_more_screen) return false;
    const oldPending = game._pending_message;
    game._pending_message = line;
    queue_more_prompt();
    await flush_screen(1);
    game._latched_more_screen = serialize_terminal_grid(game.nhDisplay);
    game._latched_more_cursor = [
        game.nhDisplay?.cursorCol ?? Math.min(`${line}--More--`.length, 79),
        game.nhDisplay?.cursorRow ?? 0,
    ];
    game._pending_message = oldPending;
    return true;
}

async function physical_melee_attacks(mtmp, attacks, toHit) {
    const hitMessages = [];
    const attackVerbCounts = new Map();
    let latchedTailStart = null;
    for (let i = 0; i < attacks.length; i++) {
        const attack = attacks[i];
        if (!attack) continue;
        const [, adtyp, damn, damd] = attack;
        const roll = rnd(20 + i);
        if (toHit > roll) {
            const verb = monster_attack_verb(attack, attackVerbCounts);
            const extra = adtyp === 'AD_ELEC' ? '  You get zapped!' : '';
            const target = verb === 'touches' ? ' you' : '';
            if (!hero_can_spot_monster(mtmp)) map_invisible_basic(mtmp.mx, mtmp.my);
            const subject = monster_subject(mtmp);
            const line = verb === 'weapon'
                ? (mtmp.mw
                    ? `${subject} ${monster_weapon_swing_verb(mtmp.mw)} ${monster_possessive(mtmp)} ${monster_weapon_name(mtmp.mw)}.  ${subject} hits!`
                    : `${subject} hits!`)
                : `${subject} ${verb}${target}!${extra}`;
            if (hitMessages.length
                && `${hitMessages.join('  ')}  ${line}`.length >= (game.nhDisplay?.cols || 80)) {
                if (await latch_monster_attack_more_frame(hitMessages.join('  ')))
                    latchedTailStart = hitMessages.length;
            }
            hitMessages.push(line);
            let damage = d(damn, damd);
            if (verb === 'weapon') damage += monster_weapon_damage(mtmp.mw);
            damage = elemental_hit_side_effects(mtmp, adtyp, damage);
            drain_strength_hit_side_effects(mtmp, attack, hitMessages);
            if (damage > 0 && game._pending_message && !game._more
                && !topline_can_pack_message(game._pending_message, line)) {
                // C refs: src/mhitu.c:hitmu(), win/tty/topl.c:update_topl().
                // hitmsg() can block on an older tty topline after damage dice
                // are known but before knockback, AC reduction, HP loss, or the
                // monster's later attacks run.
                game._after_more_message = line;
                const hasLaterAttack = attacks.slice(i + 1).some(Boolean);
                game._after_more_needs_prompt = hasLaterAttack
                    || (adtyp === 'AD_COLD' && damage > 0);
                game._monster_attack_more_latched = true;
                game._monster_attack_pause_after_more = true;
                game._monster_attack_resume_behind_after_more = true;
                game._deferred_monster_physical_attack = {
                    mtmp,
                    attacks,
                    nextIndex: i + 1,
                    toHit,
                    attackVerbCounts: [...attackVerbCounts.entries()],
                    current: { damage, preDamageHp: game.u?.uhp ?? 0 },
                };
                if (!game._more) queue_more_prompt();
                return [];
            }
            mhitm_knockback_frontdoor();
            damage = reduce_damage_by_negative_ac(damage);
            if (adtyp === 'AD_COLD' && damage > 0)
                game._pending_monster_attack_side_effect = "You're covered in frost!";
            const preDamageHp = game.u?.uhp ?? 0;
            const damageBehindPetCombatMore = damage > 0 && pet_combat_more_would_precede_line(line);
            if (damage > 0 && game._monster_topline_deferred) {
                game._after_more_hero_damage = (game._after_more_hero_damage || 0) + damage;
                game._after_more_damage_after_prompt = true;
                if (damage >= preDamageHp) {
                    game._after_more_fatal_monster = {
                        isshk: !!mtmp.isshk,
                        female: !!mtmp.female,
                        shopkeeperName: mtmp.isshk ? shopkeeper_name(mtmp) : '',
                        monsterName: monster_name(mtmp),
                        takes: !!(mtmp.isshk && shopkeeper_name(mtmp)
                            && ((game.inventory || []).length || (game._goldCount || 0) > 0)),
                    };
                }
            } else {
                apply_hero_damage(damage);
            }
            if (damageBehindPetCombatMore) {
                game._latched_status_uhp = preDamageHp;
                game._clear_latched_status_before_after_more = true;
            }
            if (damage > 0 && game._more && game._pet_combat_more_latched) {
                // C ref: win/tty/topl.c:more() + mhitu.c:hitmsg().
                // Damage from a monster hit whose pline is queued behind an
                // active pet-combat More appears on the status line with that
                // deferred hit message, not on the older More frame.
                if (game._latched_status_uhp == null) game._latched_status_uhp = preDamageHp;
                game._clear_latched_status_before_after_more = true;
            }
            if (damage > 0 && /^You hear the studio audience applaud!$/.test(game._pending_message || '')) {
                game._latched_status_uhp = preDamageHp;
                game._clear_latched_status_after_more = true;
            }
            if (handle_monster_fatal_damage(mtmp, preDamageHp)) break;
            if (game._monster_topline_deferred) break;
        } else {
            const miss = monster_miss_text(toHit, roll);
            if (!hero_can_spot_monster(mtmp)) map_invisible_basic(mtmp.mx, mtmp.my);
            const subject = monster_subject(mtmp);
            const line = attack?.[0] === 'AT_WEAP'
                ? (mtmp.mw
                    ? `${subject} ${monster_weapon_swing_verb(mtmp.mw)} ${monster_possessive(mtmp)} ${monster_weapon_name(mtmp.mw)}.  ${subject} ${miss}!`
                    : `${subject} ${miss}!`)
                : `${subject} ${miss}!`;
            if (hitMessages.length
                && `${hitMessages.join('  ')}  ${line}`.length >= (game.nhDisplay?.cols || 80)) {
                if (await latch_monster_attack_more_frame(hitMessages.join('  ')))
                    latchedTailStart = hitMessages.length;
            }
            hitMessages.push(line);
        }
    }
    if (latchedTailStart != null && !game._after_more_message) {
        game._after_more_message = hitMessages.slice(latchedTailStart).join('  ');
        game._after_more_needs_prompt = true;
        game._after_more_strict_keys = true;
    }
    return hitMessages;
}

function append_deferred_physical_attack_line(line) {
    if (!line) return;
    if (game._pending_message) game._pending_message = `${game._pending_message}  ${line}`;
    else game._pending_message = line;
    game._last_topline_message = game._pending_message;
    game._last_topline_can_force_more = false;
}

function finish_deferred_physical_hit_damage(mtmp, damage, preDamageHp) {
    mhitm_knockback_frontdoor();
    damage = reduce_damage_by_negative_ac(damage);
    apply_hero_damage(damage);
    return handle_monster_fatal_damage(mtmp, preDamageHp);
}

export async function finish_deferred_monster_physical_attack() {
    const pending = game._deferred_monster_physical_attack;
    if (!pending) return false;
    game._deferred_monster_physical_attack = null;
    const { mtmp, attacks, nextIndex, toHit, current } = pending;
    const attackVerbCounts = new Map(pending.attackVerbCounts || []);
    if (finish_deferred_physical_hit_damage(mtmp, current.damage, current.preDamageHp))
        return true;

    for (let i = nextIndex; i < attacks.length; i++) {
        const attack = attacks[i];
        if (!attack) continue;
        const [, adtyp, damn, damd] = attack;
        const roll = rnd(20 + i);
        if (toHit > roll) {
            const verb = monster_attack_verb(attack, attackVerbCounts);
            const extra = adtyp === 'AD_ELEC' ? '  You get zapped!' : '';
            const target = verb === 'touches' ? ' you' : '';
            const subject = monster_subject(mtmp);
            const line = verb === 'weapon'
                ? (mtmp.mw
                    ? `${subject} ${monster_weapon_swing_verb(mtmp.mw)} ${monster_possessive(mtmp)} ${monster_weapon_name(mtmp.mw)}.  ${subject} hits!`
                    : `${subject} hits!`)
                : `${subject} ${verb}${target}!${extra}`;
            append_deferred_physical_attack_line(line);
            let damage = d(damn, damd);
            if (verb === 'weapon') damage += monster_weapon_damage(mtmp.mw);
            damage = elemental_hit_side_effects(mtmp, adtyp, damage);
            const poisonMessages = [];
            drain_strength_hit_side_effects(mtmp, attack, poisonMessages);
            for (const poisonMessage of poisonMessages) append_deferred_physical_attack_line(poisonMessage);
            if (adtyp === 'AD_COLD' && damage > 0)
                game._pending_monster_attack_side_effect = "You're covered in frost!";
            const preDamageHp = game.u?.uhp ?? 0;
            if (finish_deferred_physical_hit_damage(mtmp, damage, preDamageHp)) break;
        } else {
            const miss = monster_miss_text(toHit, roll);
            const subject = monster_subject(mtmp);
            const line = attack?.[0] === 'AT_WEAP'
                ? (mtmp.mw
                    ? `${subject} ${monster_weapon_swing_verb(mtmp.mw)} ${monster_possessive(mtmp)} ${monster_weapon_name(mtmp.mw)}.  ${subject} ${miss}!`
                    : `${subject} ${miss}!`)
                : `${subject} ${miss}!`;
            append_deferred_physical_attack_line(line);
        }
    }
    return true;
}

function monster_attack_verb(attack, counts) {
    const [aatyp] = attack || [];
    let verb = 'hits';
    if (aatyp === 'AT_WEAP') verb = 'weapon';
    else if (aatyp === 'AT_BITE') verb = 'bites';
    else if (aatyp === 'AT_STNG') verb = 'stings';
    else if (aatyp === 'AT_KICK') verb = 'kicks';
    else if (aatyp === 'AT_BUTT') verb = 'butts';
    else if (aatyp === 'AT_TUCH') verb = 'touches';
    else if (aatyp === 'AT_CLAW') verb = 'hits';

    const seen = counts.get(verb) || 0;
    counts.set(verb, seen + 1);
    return seen > 0 && verb === 'hits' ? 'hits again' : verb;
}

function monster_weapon_damage(obj) {
    let damage = 0;
    if ([ARROW, ELVEN_ARROW, ORCISH_ARROW, YA].includes(obj?.otyp)) damage = rnd(6);
    else if (obj?.otyp === CROSSBOW_BOLT) damage = rnd(4) + 1;
    else if (obj?.otyp === ORCISH_DAGGER || obj?.otyp === DART) damage = rnd(3);
    else if ([BOW, ELVEN_BOW, ORCISH_BOW, YUMI, CROSSBOW].includes(obj?.otyp)) damage = rnd(2);
    // C ref: src/weapon.c:dmgval().  Weapon enchantment and erosion adjust
    // the base damage after the object-specific dice.
    return Math.max(0, damage + (obj?.spe || 0) - projectile_erosion(obj));
}

function maybe_redirect_attack_to_steed_basic(mtmp) {
    const steed = game.u?.usteed;
    if (!steed || mtmp === steed) return false;
    // C ref: src/mhitu.c:mattacku().  Mounted heroes give monsters a chance
    // to attack the steed first; the random gate is evaluated before the
    // adjacency check.
    const chance = (mtmp.data?.mflags2 ?? 0) & M2_ORC ? 2 : 4;
    if (rn2(chance) || dist2(mtmp.mx, mtmp.my, game.u?.ux ?? mtmp.mx, game.u?.uy ?? mtmp.my) > 2)
        return false;
    return true;
}

async function mattacku_basic(mtmp, state) {
    if (game.u?.uswallow && game.u?.ustuck !== mtmp) return false;
    if (state.scared || mtmp.mpeaceful || mtmp.mtame) return false;
    if ((game.u?.uhp ?? 1) <= 0) return false;
    const rangeWeapon = state?.inrange && !state.nearby && mon_has_attack_type(mtmp, 'AT_WEAP');
    const rangeSpit = state?.inrange && !state.nearby ? monster_spit_attack(mtmp) : null;
    if (maybe_redirect_attack_to_steed_basic(mtmp)) return true;

    const cooldownAttack = cooldown_replacement_attack(mtmp);
    const engulf = basic_engulf_attack(mtmp);
    const physical = engulf ? null : basic_physical_attacks(mtmp, !rangeWeapon);
    // C refs: src/mhitu.c:mattacku(), src/muse.c:find_offensive().
    // mattacku() computes AC_VALUE() before checking offensive inventory.
    const toHit = mattacku_to_hit(mtmp);
    const offensiveItem = offensive_item_candidate_basic(mtmp);
    if (offensiveItem?.kind === 'potion') return use_offensive_potion_basic(mtmp, offensiveItem.obj);
    if (offensiveItem?.kind === 'wand' && await use_offensive_wand_basic(mtmp, offensiveItem.obj)) {
        const zapToplineDeferred = !!game._last_mzapwand_topline_deferred;
        const packedBehindHeroAttack = /^You (?:hit|miss|kill) /.test(game._pending_message || '')
            && (game._pending_message || '').includes(`${monster_subject(mtmp)} zaps `);
        game._last_mzapwand_topline_deferred = false;
        if (packedBehindHeroAttack
            || ((zapToplineDeferred || (game._more && game._after_more_message))
                && (mtmp.movement || 0) < NORMAL_SPEED)
            || (game.u?.uhp ?? 1) <= 0) return true;
    }
    if (cooldownAttack) {
        if (game._hero_melee_message_pending && game._pending_message) queue_more_prompt();
        if (!game._monster_topline_deferred) await flush_pending_more_before_monster_message();
        const messages = await physical_melee_attacks(mtmp, [cooldownAttack], toHit);
        if (messages.length && game._monster_topline_deferred && game._after_more_message) {
            for (const message of messages)
                await append_monster_effect_topline(message, { needsPrompt: true });
        } else if (messages.length) await show_blocking_monster_message(messages.join('  '));
        await flush_visible_monster_attack_side_effect();
        return true;
    }
    if (rangeWeapon && !physical && (mtmp.weapon_check === NEED_WEAPON || !mtmp.mw)) {
        // C ref: mhitu.c:mattacku()/mthrowu.c:thrwmu().  A ranged weapon
        // switch consumes the monster's attack opportunity.
        mtmp.weapon_check = NEED_RANGED_WEAPON;
        if (await mon_wield_item_basic(mtmp)) return true;
    }
    const wildmissMelee = !engulf && wildmiss_melee_attack_available_basic(mtmp);
    const heroDisplaced = !!game.u?.uprops?.displaced
        && !hallucinating()
        && mtmp.data?.name !== 'DISPLACER_BEAST';
    const targetsDisplacedImage = heroDisplaced && state?.nearby
        && (mtmp.mux !== game.u?.ux || mtmp.muy !== game.u?.uy);
    if (!engulf && !physical && !rangeWeapon && !rangeSpit) {
        if (state?.inrange && (mtmp.data?.mattk || []).some(Boolean)) {
            if (targetsDisplacedImage && wildmissMelee) {
                await wildmiss_displaced_image_basic(mtmp);
                return true;
            }
        }
        return false;
    }
    if (!state?.nearby && !rangeWeapon && !rangeSpit) {
        // C ref: monmove.c:dochug() calls mhitu.c:mattacku() for in-range
        // displaced images; mattacku() computes AC_VALUE() before range2
        // suppresses ordinary physical attacks.
        return false;
    }
    if (targetsDisplacedImage && (physical || wildmissMelee)) {
        await wildmiss_displaced_image_basic(mtmp);
        return true;
    }
    if (game._hero_melee_message_pending && game._pending_message) queue_more_prompt();
    if (rangeWeapon && !physical) {
        return thrwmu_basic(mtmp);
    }
    if (!state?.nearby && rangeSpit) return spitmu_basic(mtmp, rangeSpit);
    if (engulf) return engulf_attack(mtmp, engulf, toHit);
    if (!game._monster_topline_deferred) await flush_pending_more_before_monster_message();
    const messages = await physical_melee_attacks(mtmp, physical, toHit);
    if (messages.length && game._monster_topline_deferred && game._after_more_message) {
        for (const message of messages)
            await append_monster_effect_topline(message, { needsPrompt: true });
    } else if (messages.length) await show_blocking_monster_message(messages.join('  '));
    await flush_visible_monster_attack_side_effect();
    return true;
}

async function m_move_basic(mtmp, resumeAfterTenguTeleRestrict = false) {
    // C ref: monmove.c:m_move().  This is a narrow ordinary-monster
    // movement skeleton: adjacent candidates, mtrack backtracking rolls, and
    // deterministic approach/flee selection.  Tunneling, most traps, full
    // attacks, and special monsters remain future subsystem work.
    const omx = mtmp.mx;
    const omy = mtmp.my;
    let ggx = mtmp.mux ?? game.u?.ux ?? omx;
    let ggy = mtmp.muy ?? game.u?.uy ?? omy;
    let appr = mtmp.mflee ? -1 : 1;
    let preferredrange_min = 0;
    let preferredrange_max = 0;
    // C ref: monmove.c:m_move().  While swallowed, bystander monsters
    // spend their movement opportunity without ordinary path selection.
    if (game.u?.uswallow && !mtmp.mflee && game.u?.ustuck !== mtmp) return 1;
    if (!resumeAfterTenguTeleRestrict) {
        set_apparxy_basic(mtmp);
        ggx = mtmp.mux ?? ggx;
        ggy = mtmp.muy ?? ggy;
        if (mtmp.data?.name === 'TENGU' && !rn2(5) && !mtmp.mcan) {
            const restricted = await tele_restrict_basic(mtmp);
            if (game._monster_turn_paused_for_more) return MMOVE_DONE;
            if (!restricted) {
                // C ref: monmove.c:m_move(); teleporting by nature happens
                // before ordinary path selection.
                if ((mtmp.mhp ?? 0) < 7 || mtmp.mpeaceful || rn2(2)) rloc_basic(mtmp);
                else mnexto_basic(mtmp);
                return MMOVE_MOVED;
            }
        }
    }
    if (mtmp.isshk) return shk_move_basic(mtmp);
    if (mtmp.isgd) return MMOVE_NOTHING;
    if (mtmp.ispriest) {
        // C ref: priest.c:pri_move().  A priest in their temple mills around
        // the shrine before move_special(); the current front door preserves
        // the altar-offset RNG without falling into ordinary peaceful m_move().
        rn2(3);
        rn2(3);
        return MMOVE_NOTHING;
    }
    if ((mtmp.data?.mflags1 & M1_CONCEAL)
        && can_hide_under_object_basic(mtmp.mx, mtmp.my)) {
        if (rn2(10)) return MMOVE_NOTHING;
    }
    if (mtmp.mconf) {
        appr = 0;
    } else {
        const shouldSee = monster_should_see_target(mtmp, omx, omy, ggx, ggy);
        if (mtmp.mcansee === 0
            // C ref: monmove.c:m_move().  A monster that should see the hero
            // can still lose the target when the hero is invisible and the
            // monster lacks M1_SEE_INVIS.
            || (shouldSee && hero_invisible_basic() && !monster_perceives_invisible(mtmp) && rn2(11))
            || (mtmp.mpeaceful && !mtmp.isshk)
            || ((mtmp.data?.name === 'STALKER' || mtmp.data?.mlet === 'S_BAT' || mtmp.data?.mlet === 'S_LIGHT')
                && !rn2(3))) {
            appr = 0;
        }
        if (appr === 1) {
            const balk = m_balks_at_approaching_basic(appr, mtmp);
            appr = balk.appr;
            preferredrange_min = balk.preferredMin;
            preferredrange_max = balk.preferredMax;
        }
        if (!shouldSee && can_track_basic(mtmp.data)) {
            const track = gettrack(omx, omy);
            if (track) {
                ggx = track.x;
                ggy = track.y;
            }
        }
    }
    let getitems = false;
    if (!mtmp.mpeaceful || !rn2(10)) {
        // C ref: monmove.c:m_move().  Monsters already lined up for a
        // weapon/ranged attack do not detour into m_search_items().
        const inLine = lined_up_basic(mtmp)
            && distmin(mtmp.mx, mtmp.my, mtmp.mux ?? ggx, mtmp.muy ?? ggy) <= hero_throw_range_basic();
        if (appr !== 1 || !inLine) getitems = true;
    }
    if (getitems) {
        const itemGoal = m_search_items_basic(mtmp, ggx, ggy, appr);
        if (itemGoal) {
            if (!itemGoal.forceApproachOnly) {
                ggx = itemGoal.x;
                ggy = itemGoal.y;
            }
            if (!itemGoal.forceApproachOnly && ggx === omx && ggy === omy) {
                return await mpickstuff_basic(mtmp) ? MMOVE_DONE : MMOVE_NOTHING;
            }
            if (appr === -1) appr = 1;
        }
    }
    const canTunnel = can_tunnel_basic(mtmp);
    const candidates = [];
    const maxx = Math.min(omx + 1, 79);
    const maxy = Math.min(omy + 1, 20);
    for (let nx = Math.max(1, omx - 1); nx <= maxx; nx++) {
        for (let ny = Math.max(0, omy - 1); ny <= maxy; ny++) {
            if (nx === omx && ny === omy) continue;
            if (no_diagonal_movement(mtmp) && nx !== omx && ny !== omy) continue;
            // C ref: mon.c:mfndpos() rejects diagonal movement from or into
            // any door state except no-door/broken-door.
            if (nx !== omx && ny !== omy
                && (door_blocks_diagonal(omx, omy) || door_blocks_diagonal(nx, ny))) {
                continue;
            }
            const tunnel = can_tunnel_at_basic(mtmp, nx, ny);
            if (!tunnel && !can_mon_step(mtmp, nx, ny)) continue;
            candidates.push({ x: nx, y: ny, tunnel });
        }
    }
    if (!candidates.length) return MMOVE_NOTHING;

    let nix = omx;
    let niy = omy;
    let digTunnel = false;
    let nidist = dist2(nix, niy, ggx, ggy);
    let chcnt = 0;
    let moved = false;
    const jcnt = Math.min(MTSZ, candidates.length - 1, mtmp.mtrack?.length || 0);

    candidateLoop:
    for (const cand of candidates) {
        if (m_avoid_kicked_loc_basic(mtmp, cand.x, cand.y)) continue;
        if (appr !== 0) {
            for (let j = 0; j < jcnt; j++) {
                const trk = mtmp.mtrack[j];
                if (cand.x === trk.x && cand.y === trk.y) {
                    const denom = 4 * (candidates.length - j);
                    if (rn2(denom)) {
                        continue candidateLoop;
                    }
                }
            }
        }

        const ndist = dist2(cand.x, cand.y, ggx, ggy);
        const nearer = ndist < nidist;
        if ((appr === 1 && nearer)
            || (appr === -1 && !nearer)
            || (appr === 0 && !rn2(++chcnt))
            || (appr === -2
                && ((ndist <= preferredrange_min && !nearer)
                    || (ndist >= preferredrange_max && nearer)))
            || !moved) {
            nix = cand.x;
            niy = cand.y;
            digTunnel = !!cand.tunnel;
            nidist = ndist;
            moved = true;
        }
    }

    if (!moved || (nix === omx && niy === omy)) return MMOVE_NOTHING;
    if (nix === (mtmp.mux ?? null) && niy === (mtmp.muy ?? null)
        && !(nix === game.u?.ux && niy === game.u?.uy)) {
        // C ref: monmove.c:m_move() delegates moves into the apparent
        // displaced hero square to m_move_aggress(); with no defender, the
        // monster spends its move attacking the image and does not relocate.
        return MMOVE_DONE;
    }
    if (nix === game.u?.ux && niy === game.u?.uy) {
        mtmp.mux = game.u.ux;
        mtmp.muy = game.u.uy;
        return MMOVE_NOTHING;
    }
    if (digTunnel && await m_digweapon_check_basic(mtmp, nix, niy)) return MMOVE_DONE;
    const engulfingHero = game.u?.uswallow && game.u?.ustuck === mtmp;
    delete mtmp._opened_unseen_door;
    mtmp.mx = nix;
    mtmp.my = niy;
    if (engulfingHero) {
        game.u.ux0 = game.u.ux;
        game.u.uy0 = game.u.uy;
        game.u.ux = nix;
        game.u.uy = niy;
        game.vision_full_recalc = 1;
    }
    const deferWarningRedraw = defer_warning_move_redraw_basic(mtmp, omx, omy, appr);
    if (deferWarningRedraw) {
        defer_warning_redraw_square(omx, omy);
        defer_warning_redraw_square(mtmp.mx, mtmp.my);
    }
    maybe_unhide_at_basic(mtmp);
    mon_track_add(mtmp, omx, omy);
    const previousWarningRng = game._monster_move_warning_rng_active;
    game._monster_move_warning_rng_active = true;
    let doorStatus;
    try {
        if (!deferWarningRedraw) newsym(omx, omy);
        const trapStatus = await mintrap_basic(mtmp);
        if (trapStatus === MMOVE_DIED) return MMOVE_DIED;
        doorStatus = await postmove_door_basic(mtmp);
        if (doorStatus !== MMOVE_DIED) {
            if (canTunnel && may_dig_basic(mtmp.mx, mtmp.my)) {
                // C refs: monmove.c:postmov(), dig.c:mdig_tunnel().
                // Tunnelling side effects happen after floor traps and door
                // handling; a trap-killed monster never reaches this roll.
                rnd(12);
                const loc = game.level?.at(mtmp.mx, mtmp.my);
                if (digTunnel && loc && IS_WALL(loc.typ)) {
                    // C ref: dig.c:mdig_tunnel().
                    rn2(5);
                }
                if (digTunnel && loc && !SPACE_POS(loc.typ)) loc.typ = ROOM;
            }
            if (game._swallowed_expulsion_paused_for_more) {
                game._swallowed_expulsion_paused_for_more = false;
            } else if (mtmp._opened_unseen_door) {
                // The door newsym() above owns this frame; keep the opener
                // suppressed until it takes another movement step.
            } else if (!deferWarningRedraw) {
                // C ref: display.c:see_monsters() warning refreshes moved
                // off-screen monsters at input boundaries; this movement
                // skeleton keeps the current JS monster layer in step until
                // per-layer display state is ported.
                newsym(mtmp.mx, mtmp.my);
            }
        }
    } finally {
        game._monster_move_warning_rng_active = previousWarningRng;
    }
    if (doorStatus === MMOVE_DIED) return MMOVE_DIED;
    if (await mpickstuff_basic(mtmp)) {
        maybe_spin_web_basic(mtmp);
        postmove_hide_under_or_eel_basic(mtmp);
        return MMOVE_DONE;
    }
    maybe_spin_web_basic(mtmp);
    postmove_hide_under_or_eel_basic(mtmp);
    return doorStatus;
}

function m_everyturn_effect(mtmp) {
    if (mtmp.data?.name === 'FOG_CLOUD') {
        if (visible_gas_region_at(mtmp.mx, mtmp.my)) return;
        const ttl = 4 + rn2(3); // create_gas_cloud(..., 1, 0) TTL via rn1(3, 4)
        game.level.gasClouds = game.level.gasClouds || [];
        game.level.gasClouds.push({ x: mtmp.mx, y: mtmp.my, ttl });
    }
}

function visible_gas_region_at(x, y) {
    return (game.level?.gasClouds || []).some((region) =>
        region.ttl >= 0 && region.x === x && region.y === y);
}

function age_gas_clouds() {
    const clouds = game.level?.gasClouds;
    if (!clouds?.length) return;
    const fogs = (game.level?.monsters || []).filter((mon) => mon.data?.name === 'FOG_CLOUD');
    const survivors = [];
    for (const cloud of clouds) {
        if (cloud.ttl === 0) continue;
        if (cloud.ttl > 0) cloud.ttl--;
        if (cloud.ttl >= 0 && cloud.ttl < 20
            && fogs.some((mon) => mon.mx === cloud.x && mon.my === cloud.y)) {
            cloud.ttl += 5;
        }
        survivors.push(cloud);
    }
    game.level.gasClouds = survivors;
}

function were_change(mtmp) {
    const flags = mtmp.data?.mflags2 ?? 0;
    if (!(flags & M2_WERE)) return;
    const fullMoon = game.flags?.moonphase === 4; // FULL_MOON
    const atNight = !!game.iflags?.at_night;
    if (flags & M2_HUMAN) {
        const denom = atNight ? (fullMoon ? 3 : 30) : (fullMoon ? 10 : 50);
        if (!rn2(denom)) {
            // new_were() state transformation is still future work; this
            // preserves the turn-boundary RNG ownership for unchanged rolls.
        }
    } else if (!rn2(30)) {
        // See note above.
    }
}

function vampire_shifter_base(ptr) {
    return ptr?.name === 'VAMPIRE'
        || ptr?.name === 'VAMPIRE_LORD'
        || ptr?.name === 'VLAD_THE_IMPALER';
}

function shapeshift_pool_or_lava(mon) {
    const typ = game.level?.at(mon.mx, mon.my)?.typ;
    return typ != null && (IS_POOL(typ) || IS_LAVA(typ));
}

function pick_vampire_shape(mon) {
    const cham = mon?.cham;
    let ptr = cham;
    let wolfchance = 10;
    if (cham?.name === 'VLAD_THE_IMPALER') wolfchance = 3;
    if ((cham?.name === 'VLAD_THE_IMPALER' || cham?.name === 'VAMPIRE_LORD')
        && !rn2(wolfchance) && !shapeshift_pool_or_lava(mon)) {
        ptr = monsterPtr('WOLF');
    } else if (vampire_shifter_base(cham)) {
        ptr = !rn2(4) ? monsterPtr('FOG_CLOUD') : monsterPtr('VAMPIRE_BAT');
    }
    if (ptr && mon.data?.name !== cham?.name && !rn2(4)) return cham;
    return ptr;
}

function apply_newcham_basic(mon, ptr) {
    if (!mon || !ptr || mon.data?.name === ptr.name) return false;
    if (ptr.male) {
        mon.female = false;
    } else if (ptr.female) {
        mon.female = true;
    } else if (!ptr.neuter) {
        if (!rn2(10) && !(ptr.mlet === 'S_VAMPIRE' || vampire_shifter_base(mon.cham))) {
            mon.female = !mon.female;
        }
    }
    const oldHp = mon.mhp ?? 0;
    const oldMax = mon.mhpmax ?? oldHp;
    const monState = newmonhp_state_for(ptr);
    mon.data = { ...ptr, mmove: ptr.mmove ?? 12 };
    mon.ch = MONSTER_SYMBOLS[ptr.mlet] ?? mon.ch ?? 'm';
    mon.color = ptr.color ?? mon.color ?? 15;
    mon.m_lev = monState.level;
    mon.mhpmax = monState.hp;
    let hp = oldMax > 0 ? Math.trunc(oldHp * mon.mhpmax / oldMax) : mon.mhpmax;
    if (hp < 0 || hp > mon.mhpmax) hp = mon.mhpmax;
    mon.mhp = hp || 1;
    return true;
}

function decide_to_shapeshift_basic(mon) {
    if (!vampire_shifter_base(mon?.cham)) {
        // C ref: mon.c:decide_to_shapeshift() regular shapeshifter gate.
        if (!mon?.mspec_used && !rn2(6)) {
            mon.mspec_used = 3 + rn2(10);
            apply_newcham_basic(mon, pick_newcham_shape_for(mon));
        }
        return;
    }
    if (mon.data?.mlet !== 'S_VAMPIRE') {
        let ptr = null;
        let change = false;
        if (mon.mhp <= Math.trunc(((mon.mhpmax ?? 0) + 5) / 6) && rn2(4)) {
            ptr = mon.cham;
            change = true;
        } else if (mon.data?.name === 'FOG_CLOUD'
                   && mon.mhp === mon.mhpmax
                   && !rn2(4)
                   && (!cansee(mon.mx, mon.my) || dist2(mon.mx, mon.my, game.u?.ux ?? 0, game.u?.uy ?? 0) > BOLT_LIM * BOLT_LIM)) {
            ptr = pick_vampire_shape(mon);
            change = !!ptr && ptr.name !== mon.data?.name;
        }
        if (change) apply_newcham_basic(mon, ptr);
    } else if (mon.mhp >= Math.trunc(9 * (mon.mhpmax ?? 0) / 10)
               && !rn2(6)
               && (!cansee(mon.mx, mon.my) || dist2(mon.mx, mon.my, game.u?.ux ?? 0, game.u?.uy ?? 0) > BOLT_LIM * BOLT_LIM)) {
        const ptr = pick_vampire_shape(mon);
        if (ptr) apply_newcham_basic(mon, ptr);
    }
}

function webmaker_basic(mtmp) {
    return mtmp.data?.name === 'CAVE_SPIDER' || mtmp.data?.name === 'GIANT_SPIDER';
}

function trap_at_basic(x, y) {
    return (game.level?.traps || []).find((trap) => trap.tx === x && trap.ty === y) || null;
}

function count_traps_basic(ttyp) {
    return (game.level?.traps || []).filter((trap) => trap.ttyp === ttyp).length;
}

function holds_up_web_basic(x, y) {
    if (!isok(x, y)) return true;
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    if (IS_OBSTRUCTED(loc.typ) || loc.typ === IRONBARS) return true;
    if (loc.typ === STAIRS || loc.typ === LADDER) {
        const stair = (game.level?.stairs || []).find((st) => st.sx === x && st.sy === y);
        if (stair?.up) return true;
    }
    return false;
}

function count_webbing_walls_basic(x, y) {
    return (holds_up_web_basic(x, y - 1) ? 1 : 0)
        + (holds_up_web_basic(x + 1, y) ? 1 : 0)
        + (holds_up_web_basic(x, y + 1) ? 1 : 0)
        + (holds_up_web_basic(x - 1, y) ? 1 : 0);
}

function is_sokoban_level_basic() {
    const dnum = game.u?.uz?.dnum;
    return !!game.level?.flags?.sokoban_rules || game.dungeons?.[dnum]?.dname === 'Sokoban';
}

function soko_allow_web_basic(mtmp) {
    if (!is_sokoban_level_basic()) return true;
    const up = (game.level?.stairs || []).find((st) => st.up);
    return !!up && clear_path(mtmp.mx, mtmp.my, up.sx, up.sy);
}

function maybe_spin_web_basic(mtmp) {
    // C ref: monmove.c:maybe_spin_web().  The roll is made after the
    // monster movement/attack phase and only for active webmakers on
    // trap-free squares.
    if (!webmaker_basic(mtmp) || mtmp.mcanmove === 0 || mtmp.msleeping
        || mtmp.mfrozen || mtmp.mspec_used || trap_at_basic(mtmp.mx, mtmp.my)
        || !soko_allow_web_basic(mtmp)) {
        return;
    }
    const prob = (((mtmp.data?.name === 'GIANT_SPIDER' ? 15 : 5)
        * (count_webbing_walls_basic(mtmp.mx, mtmp.my) + 1))
        - (3 * count_traps_basic(WEB)));
    if (rn2(1000) < prob) {
        const trap = { ttyp: WEB, tx: mtmp.mx, ty: mtmp.my, tseen: false, once: false, launch: { x: 0, y: 0 } };
        if (!game.level.traps) game.level.traps = [];
        game.level.traps.push(trap);
        mtmp.mspec_used = d(4, 4);
        if (cansee(mtmp.mx, mtmp.my)) trap.tseen = true;
    }
}

export function mcalcdistress() {
    for (const mtmp of game.level?.monsters || []) {
        // C refs: mon.c:m_calcdistress(), monmove.c:mon_regen().
        // All monsters heal one HP on 20-turn boundaries; regenerating
        // species heal every turn.
        if ((game.moves || 0) % 20 === 0 || ((mtmp.data?.mflags1 ?? 0) & M1_REGEN)) {
            if ((mtmp.mhp ?? 0) < (mtmp.mhpmax ?? 0)) {
                mtmp.mhp = Math.min(mtmp.mhpmax, (mtmp.mhp ?? 0) + 1);
            }
        }
        if (mtmp.mspec_used) mtmp.mspec_used--;
        if (mtmp.cham) decide_to_shapeshift_basic(mtmp);
        were_change(mtmp);
        if (mtmp.mfrozen && --mtmp.mfrozen <= 0) {
            mtmp.mfrozen = 0;
            mtmp.mcanmove = 1;
        }
        if (mtmp.mfleetim && --mtmp.mfleetim <= 0) {
            mtmp.mfleetim = 0;
            mtmp.mflee = false;
        }
    }
}

export async function movemon() {
    const g = game;
    await prepare_monster_more_base_screen();
    let somebody_can_move = !!g._resume_somebody_can_move;
    g._resume_somebody_can_move = false;

    if (g._resume_tame_post_distfleeck) {
        distfleeck(g._resume_tame_post_distfleeck);
        g._resume_tame_post_distfleeck = null;
    }
    const resumeDogAfterInventory = g._resume_pet_move_after_inventory || null;
    g._resume_pet_move_after_inventory = null;
    if (resumeDogAfterInventory && g.level.monsters?.includes(resumeDogAfterInventory)) {
        const dogStatus = await dog_move_after_inventory(resumeDogAfterInventory, false);
        if (dogStatus === MMOVE_MOVED) {
            const trapStatus = await mintrap_basic(resumeDogAfterInventory);
            if (trapStatus === MMOVE_DIED) {
                g._resume_movemon_after_mon = resumeDogAfterInventory;
            }
        }
        if (g._more && g._pet_combat_more_latched && !g._savelife_resume_active
            && !hallucinating()) {
            if (!g._deferred_pet_miss_passive
                && (!g._after_more_message || !g._after_more_message.includes('  '))
                && !/ engulfs you!$/.test(g._after_more_message || ''))
                g._after_more_needs_prompt = false;
            g._resume_tame_post_distfleeck = resumeDogAfterInventory;
            g._resume_movemon_after_mon = resumeDogAfterInventory;
            g._resume_somebody_can_move = resumeDogAfterInventory.movement >= NORMAL_SPEED;
            g._pet_combat_resume_active = true;
            g._monster_turn_paused_for_more = true;
            return false;
        }
        if (dogStatus !== MMOVE_MOVED && !g._monster_turn_paused_for_more) {
            distfleeck(resumeDogAfterInventory);
        } else if (dogStatus === MMOVE_MOVED && !g._monster_turn_paused_for_more) {
            distfleeck(resumeDogAfterInventory);
        }
        if (g._monster_turn_paused_for_more) return false;
        g._resume_movemon_after_mon = resumeDogAfterInventory;
    }
    const resumeAfter = g._resume_movemon_after_mon || null;
    const resumeTenguAfterTeleRestrict = g._resume_tengu_after_tele_restrict || null;
    let skippingResumedPrefix = !!(resumeAfter || resumeTenguAfterTeleRestrict);
    g._resume_movemon_after_mon = null;

    // C ref: mon.c:iter_mons_safe() snapshots fmon before the movement
    // pass so removals or insertions during combat do not shift ownership
    // of later monsters' turns.
    const monsters = [...(g.level.monsters || [])];
    for (const mtmp of monsters) {
        if (skippingResumedPrefix) {
            if (mtmp === resumeAfter) {
                skippingResumedPrefix = false;
                continue;
            }
            if (mtmp === resumeTenguAfterTeleRestrict) {
                skippingResumedPrefix = false;
            } else {
                continue;
            }
        }
        if (!g.level.monsters?.includes(mtmp)) continue;
        if (mtmp === resumeTenguAfterTeleRestrict) {
            g._resume_tengu_after_tele_restrict = null;
            const moveStatus = await m_move_basic(mtmp, true);
            if (moveStatus === MMOVE_DIED) continue;
            if (g._monster_turn_paused_for_more) return false;
            const postMoveState = distfleeck(mtmp);
            if ((moveStatus !== MMOVE_MOVED && moveStatus !== MMOVE_DONE && can_standard_attack_basic(postMoveState))
                || (moveStatus === MMOVE_MOVED && can_attack_after_move_basic(mtmp, postMoveState))) {
                await mattacku_basic(mtmp, postMoveState);
                if (g._monster_turn_paused_for_more) return false;
            }
            continue;
        }
        // C ref: mon.c:movemon_singlemon() runs this before the movement
        // budget check, so zero-budget fog clouds still leave vapor.
        m_everyturn_effect(mtmp);
        if (mtmp.movement < NORMAL_SPEED) continue;

        mtmp.movement -= NORMAL_SPEED;
        if (mtmp.movement >= NORMAL_SPEED) somebody_can_move = true;

        if (minliquid_basic(mtmp)) continue;

        if (mtmp.misc_worn_check & I_SPECIAL) {
            const targetX = mtmp.mux ?? game.u?.ux ?? mtmp.mx;
            const targetY = mtmp.muy ?? game.u?.uy ?? mtmp.my;
            if (mtmp.mpeaceful || mtmp.mtame || dist2(mtmp.mx, mtmp.my, targetX, targetY) > 9) {
                mtmp.misc_worn_check &= ~I_SPECIAL;
                const oldworn = mtmp.misc_worn_check;
                m_dowear_basic(mtmp, false);
                if (mtmp.misc_worn_check !== oldworn || mtmp.mcanmove === 0) continue;
            }
        }

        // C ref: monmove.c:dochug() returns before distfleeck() for frozen,
        // waiting, or still-sleeping monsters.
        if ((mtmp.mstrategy & STRAT_WAITFORU)
            && (m_canseeu_basic(mtmp) || mtmp.mhp < mtmp.mhpmax)) {
            mtmp.mstrategy &= ~STRAT_WAITFORU;
        }
        if (is_hider(mtmp)) {
            if (restrap_basic(mtmp)) continue;
            if (mtmp.m_ap_type === M_AP_FURNITURE
                || mtmp.m_ap_type === M_AP_OBJECT
                || mtmp.mundetected) {
                continue;
            }
        }
        if (mtmp.mcanmove === 0 || (mtmp.mstrategy & STRAT_WAITMASK)) continue;
        if (mtmp.msleeping) {
            const awoke = await disturb_basic(mtmp);
            if (!awoke) continue;
        }

        // C ref: monmove.c:dochug().  Awake movable monsters scuff any
        // engraving underfoot before status recovery and movement AI.
        wipe_engr_at_basic(mtmp.mx, mtmp.my, 1, false);

        // C ref: monmove.c:dochug().  Confusion and stun recovery happen
        // before targeting, fleeing, or ordinary movement.
        if (mtmp.mconf && !rn2(50)) mtmp.mconf = 0;
        if (mtmp.mstun && !rn2(10)) mtmp.mstun = 0;

        // C ref: monmove.c:dochug().  Fleeing monsters check the random
        // teleport gate before can_teleport(); non-teleporting pets still
        // consume the rn2(40) while fleeing.
        if (mtmp.mflee) rn2(40);
        if (mtmp.mflee && !mtmp.mfleetim && mtmp.mhp === mtmp.mhpmax && !rn2(25))
            mtmp.mflee = false;

        // dochugw -> dochug
        set_apparxy_basic(mtmp);
        const fleeState = distfleeck(mtmp); // consuming rn2(5)
        if (await maybe_use_misc_item_basic(mtmp)) continue;
        if (!mtmp.mtame && await maybe_wield_hth_before_move(mtmp, fleeState)) continue;

        // C ref: monmove.c:dochug() delegates tame monsters to
        // dogmove.c:dog_move() after the shared distfleeck() phase.
        if (mtmp.mtame) {
            if (mtmp.meating) {
                // C ref: monmove.c:m_move().  A monster that is still eating
                // spends this movement slice decrementing meating, then the
                // caller still performs the post-move distfleeck() recalculation.
                mtmp.meating--;
                if (mtmp.meating <= 0) mtmp.meating = 0;
                distfleeck(mtmp);
                continue;
            }
            if (is_wanderer(mtmp) && fleeState.nearby) rn2(4);
            const dogStatus = await dog_move(mtmp, false);
            if (g._resume_pet_move_after_inventory === mtmp && g._more) {
                // C ref: src/dogmove.c:dog_invent()/dog_move(). A pet
                // inventory pline can block on tty More, then returns to the
                // same dog_move() call before the next command is read.
                g._resume_somebody_can_move = somebody_can_move || mtmp.movement >= NORMAL_SPEED;
                g._monster_turn_paused_for_more = true;
                return false;
            }
            if (dogStatus === MMOVE_MOVED) {
                const trapStatus = await mintrap_basic(mtmp);
                if (trapStatus === MMOVE_DIED) continue;
            }
            if (g._more && g._pet_combat_more_latched && !g._savelife_resume_active
                && !hallucinating()) {
                if (!g._deferred_pet_miss_passive
                    && (!g._after_more_message || !g._after_more_message.includes('  '))
                    && !/ engulfs you!$/.test(g._after_more_message || ''))
                    g._after_more_needs_prompt = false;
                if (g._resume_pet_move_after_inventory !== mtmp) {
                    g._resume_tame_post_distfleeck = mtmp;
                    g._resume_movemon_after_mon = mtmp;
                }
                g._resume_somebody_can_move = somebody_can_move || mtmp.movement >= NORMAL_SPEED;
                g._pet_combat_resume_active = true;
                g._monster_turn_paused_for_more = true;
                return false;
            }
            distfleeck(mtmp);
        } else {
            let postMoveState = fleeState;
            let moveStatus = 0;
            if (non_tame_movement_opportunity(mtmp, fleeState)) {
                moveStatus = maybe_cast_undirected_spell_before_move(mtmp) ? MMOVE_DONE : await m_move_basic(mtmp);
                if (moveStatus === MMOVE_DIED) continue;
                if (g._monster_turn_paused_for_more) return false;
                // C calls distfleeck() again after m_move() returns for ordinary
                // movement, even when the monster is off-screen.
                postMoveState = distfleeck(mtmp);
            }
            if ((moveStatus !== MMOVE_MOVED && moveStatus !== MMOVE_DONE && can_standard_attack_basic(postMoveState))
                || (moveStatus === MMOVE_MOVED && can_attack_after_move_basic(mtmp, postMoveState))) {
                await mattacku_basic(mtmp, postMoveState);
                if (g._swallowed_damage_more_latched && g._more) {
                    g._swallowed_damage_more_latched = false;
                    g._resume_movemon_after_mon = mtmp;
                    g._resume_somebody_can_move = somebody_can_move || mtmp.movement >= NORMAL_SPEED;
                    g._monster_turn_paused_for_more = true;
                    g._swallowed_damage_more_waiting = true;
                    return false;
                }
                if (g._pending_swallowed_display_clear && g._more) {
                    g._resume_movemon_after_mon = mtmp;
                    g._resume_somebody_can_move = somebody_can_move || mtmp.movement >= NORMAL_SPEED;
                    g._monster_turn_paused_for_more = true;
                    g._swallowed_expulsion_paused_for_more = true;
                    return false;
                }
                if (g._monster_attack_more_latched && g._more) {
                    // C ref: topl.c:more()/pline_mon(). A queued monster-hit
                    // More only interrupts immediately when dismissing it must
                    // expose a delayed side-effect pline. Otherwise it remains
                    // on the topline while later map updates in the same monster
                    // pass can happen; the next pline or input-boundary flush
                    // services the More.
                    g._monster_attack_more_latched = false;
                    if (g._after_more_message) {
                        if (g._pending_message
                            && topline_can_pack_message(g._pending_message, g._after_more_message)) {
                            g._pending_message = `${g._pending_message}  ${g._after_more_message}`;
                            g._after_more_message = '';
                            g._after_more_needs_prompt = false;
                            g._monster_attack_pause_after_more = false;
                            g._hallucination_warning_rng_active = true;
                            continue;
                        }
                        g._monster_attack_pause_after_more = false;
                        g._resume_movemon_after_mon = mtmp;
                        g._resume_somebody_can_move = somebody_can_move || mtmp.movement >= NORMAL_SPEED;
                        g._monster_turn_paused_for_more = true;
                        g._monster_attack_more_waiting = true;
                        return false;
                    }
                    g._monster_attack_pause_after_more = false;
                    g._hallucination_warning_rng_active = true;
                }
                if (g._fatal_monster_attack_paused && g._monster_turn_paused_for_more
                    && g._more && !hallucinating()) {
                    g._resume_turn_tail_after_more = true;
                    return false;
                }
                if (g._pet_combat_resume_active && g._more && !hallucinating()) {
                    if (g._packed_monster_more_candidate && !g._after_more_message
                        && !g._monster_attack_pause_after_more) {
                        // C refs: win/tty/topl.c:more(), mhitu.c:hitmsg().
                        // A non-side-effect packed monster hit can remain on
                        // the topline while later monster movement queues the
                        // next visible message behind that More.
                        g._pet_combat_resume_active = false;
                        continue;
                    }
                    g._pet_combat_resume_active = false;
                    g._resume_movemon_after_mon = mtmp;
                    g._resume_somebody_can_move = somebody_can_move || mtmp.movement >= NORMAL_SPEED;
                    g._monster_turn_paused_for_more = true;
                    return false;
                }
            }
        }
    }

    // C ref: allmain.c:run_regions() ages regions after the monster
    // movement loop for the turn, not before m_everyturn_effect() can see
    // regions created on previous passes.
    if (!somebody_can_move && g._gas_clouds_aged_turn !== g.moves) {
        age_gas_clouds();
        g._gas_clouds_aged_turn = g.moves;
    }

    const packedDeathAndHit = /^The .+ is killed!  The .+ .+!$/.test(g._pending_message || '');
    if ((!somebody_can_move || packedDeathAndHit) && g._packed_monster_more_candidate
        && g._more && !g._pet_combat_more_latched && !hallucinating()) {
        g._more = false;
        g._more_dismissals_remaining = 0;
    }
    g._packed_monster_more_candidate = false;
    if (!g._more) flush_deferred_warning_redraws();

    return somebody_can_move;
}
