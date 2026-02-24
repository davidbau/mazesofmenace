// mon.js -- Monster lifecycle and position management
// C ref: mon.c — movemon(), mfndpos(), mon_allowflags(), corpse_chance(), passivemm(),
// restrap/hider premove, mm_aggression, zombie_maker
//
// INCOMPLETE / MISSING vs C mon.c:
// - No xkilled/monkilled/mondied (monster death processing)
// - No grow_up/mon_adjust_speed
// - No mpickstuff/mpickgold (full item pickup logic — stub in monmove.js)
// - No minliquid (monsters falling in pools/lava)
// - mfndpos: no ALLOW_DIG for tunneling monsters with picks
// - mfndpos: ALLOW_SANCT flag set but in_your_sanctuary gate not checked
// - mfndpos: no poison gas region avoidance (NhRegion not ported)
// - mfndpos: no worm segment crossing (long worm not ported)
// - mon_allowflags: ALLOW_DIG not set (needs monster wielded pick tracking)
// - mon_allowflags: Conflict ALLOW_U not implemented
// - mon_allowflags: is_vampshifter NOGARLIC not ported
// - passivemm: only AD_ACID/AD_ENCH/generic modeled; many passive types missing
// - handleHiderPremove: no mimic furniture/object appearance selection

import { COLNO, ROWNO, IS_DOOR, IS_POOL, IS_LAVA, IS_OBSTRUCTED, ACCESSIBLE,
         POOL, ROOM, WATER, LAVAWALL, IRONBARS,
         D_CLOSED, D_LOCKED, D_BROKEN,
         SHOPBASE, ROOMOFFSET, NORMAL_SPEED, isok } from './config.js';
import { AMULET_OF_LIFE_SAVING, CORPSE } from './objects.js';
import { which_armor } from './worn.js';
import { W_AMUL, W_ARMG } from './worn.js';
import { nonliving, resists_ston, resists_fire, resists_poison,
         is_flyer, is_floater,
         likes_lava, cant_drown, can_teleport, vegan as vegan_mondata,
         mon_hates_silver, touch_petrifies, flesh_petrifies } from './mondata.js';
import { mkcorpstat, weight, is_rustprone } from './mkobj.js';
import { is_metallic, is_organic, obj_resists } from './objdata.js';
import { mondead as _monutil_mondead, unstuck, newsym, mpickobj, mdrop_obj } from './monutil.js';
import { water_damage_chain, fire_damage_chain } from './trap.js';

// ========================================================================
// mfndpos flag constants — C ref: mfndpos.h
// ========================================================================
export const ALLOW_MDISP  = 0x00001000;
export const ALLOW_TRAPS  = 0x00020000;
export const ALLOW_U      = 0x00040000;
export const ALLOW_M      = 0x00080000;
export const ALLOW_TM     = 0x00100000;
export const ALLOW_ALL    = ALLOW_U | ALLOW_M | ALLOW_TM | ALLOW_TRAPS;
export const NOTONL       = 0x00200000;
export const OPENDOOR     = 0x00400000;
export const UNLOCKDOOR   = 0x00800000;
export const BUSTDOOR     = 0x01000000;
export const ALLOW_ROCK   = 0x02000000;
export const ALLOW_WALL   = 0x04000000;
export const ALLOW_DIG    = 0x08000000;
export const ALLOW_BARS   = 0x10000000;
export const ALLOW_SANCT  = 0x20000000;
export const ALLOW_SSM    = 0x40000000;
export const NOGARLIC     = 0x80000000 | 0; // force signed 32-bit
import { rn2, rnd, d, pushRngLogEntry } from './rng.js';
import { BOULDER, SCR_SCARE_MONSTER, CLOVE_OF_GARLIC } from './objects.js';
import { couldsee, m_cansee } from './vision.js';
import { is_hider, hides_under, is_mindless, is_displacer, perceives,
         is_human, is_elf, is_dwarf, is_gnome, is_orc, is_shapeshifter,
         mon_knows_traps, passes_bars, nohands, is_clinger,
         is_giant, is_undead, is_unicorn, is_minion, throws_rocks,
         is_golem, is_rider, is_mplayer } from './mondata.js';
import { PM_ANGEL, PM_GRID_BUG, PM_FIRE_ELEMENTAL, PM_SALAMANDER,
         PM_FLOATING_EYE, PM_MINOTAUR,
         PM_PURPLE_WORM, PM_BABY_PURPLE_WORM, PM_SHRIEKER,
         PM_GHOUL, PM_SKELETON,
         PM_DEATH, PM_PESTILENCE, PM_FAMINE,
         PM_LIZARD, PM_VLAD_THE_IMPALER,
         PM_DISPLACER_BEAST,
         PM_KOBOLD, PM_DWARF, PM_GNOME, PM_ORC, PM_ELF, PM_HUMAN,
         PM_GIANT, PM_ETTIN, PM_VAMPIRE, PM_VAMPIRE_LEADER,
         PM_KOBOLD_ZOMBIE, PM_DWARF_ZOMBIE, PM_GNOME_ZOMBIE, PM_ORC_ZOMBIE,
         PM_ELF_ZOMBIE, PM_HUMAN_ZOMBIE, PM_GIANT_ZOMBIE, PM_ETTIN_ZOMBIE,
         PM_KOBOLD_MUMMY, PM_DWARF_MUMMY, PM_GNOME_MUMMY, PM_ORC_MUMMY,
         PM_ELF_MUMMY, PM_HUMAN_MUMMY, PM_GIANT_MUMMY, PM_ETTIN_MUMMY,
         PM_STUDENT, PM_CHIEFTAIN, PM_NEANDERTHAL, PM_ATTENDANT,
         PM_PAGE, PM_ABBOT, PM_ACOLYTE, PM_HUNTER, PM_THUG,
         PM_ROSHI, PM_GUIDE, PM_WARRIOR, PM_APPRENTICE,
         PM_ARCHEOLOGIST, PM_BARBARIAN, PM_CAVE_DWELLER, PM_HEALER,
         PM_KNIGHT, PM_MONK, PM_CLERIC, PM_RANGER, PM_ROGUE,
         PM_SAMURAI, PM_TOURIST, PM_VALKYRIE, PM_WIZARD,
         PM_IRON_GOLEM, PM_GREMLIN, PM_GELATINOUS_CUBE, PM_RUST_MONSTER,
         PM_STALKER, PM_GREEN_SLIME,
         NON_PM, NUMMONS,
         mons,
         AT_NONE, AT_BOOM, AD_PHYS, AD_ACID, AD_ENCH,
         M1_FLY, M1_SWIM, M1_AMPHIBIOUS, M1_AMORPHOUS, M1_WALLWALK,
         M1_BREATHLESS, M1_TUNNEL, M1_NEEDPICK,
         M1_SLITHY, M1_UNSOLID,
         MZ_TINY, MZ_MEDIUM, MZ_LARGE,
         MR_FIRE, MR_COLD, MR_SLEEP, MR_DISINT, MR_ELEC, MR_POISON,
         G_FREQ, G_NOCORPSE, G_UNIQ,
         S_EYE, S_LIGHT, S_EEL, S_PIERCER, S_MIMIC, S_UNICORN,
         S_ZOMBIE, S_LICH, S_KOBOLD, S_ORC, S_GIANT, S_HUMANOID, S_GNOME, S_KOP,
         S_DOG, S_NYMPH, S_LEPRECHAUN, S_HUMAN } from './monsters.js';
import { PIT, SPIKED_PIT, HOLE } from './symbols.js';
import { m_harmless_trap } from './trap.js';
import { dist2, distmin, monnear,
         monmoveTrace, monmoveStepLabel,
         canSpotMonsterForMap, BOLT_LIM } from './monutil.js';

// ========================================================================
// Monster speed constants — C ref: include/monsym.h
// ========================================================================
const MSLOW = 1;
const MFAST = 2;

// ========================================================================
// mcalcmove — C ref: mon.c mcalcmove()
// Calculate monster's movement budget for a turn.
// Randomly rounds speed to a multiple of NORMAL_SPEED (12).
// ========================================================================
export function mcalcmove(mon) {
    let mmove = mon.speed;  // mon->data->mmove

    // C ref: mon.c:1120-1129 — MSLOW/MFAST adjustments
    if (mon.mspeed === MSLOW) {
        if (mmove < 12)
            mmove = Math.floor((2 * mmove + 1) / 3);
        else
            mmove = 4 + Math.floor(mmove / 3);
    } else if (mon.mspeed === MFAST) {
        mmove = Math.floor((4 * mmove + 2) / 3);
    }
    // Note: usteed/gallop check (C mon.c:1131-1136) skipped — riding not ported.

    // C ref: mon.c:1138-1146 — random rounding for non-standard speeds
    const mmoveAdj = mmove % NORMAL_SPEED;
    mmove -= mmoveAdj;
    if (rn2(NORMAL_SPEED) < mmoveAdj) {
        mmove += NORMAL_SPEED;
    }
    return mmove;
}

// ========================================================================
// allocateMonsterMovement — C ref: allmain.c:226-227 moveloop_core
// Reallocate movement rations to all living monsters via mcalcmove.
// ========================================================================
export function allocateMonsterMovement(map) {
    for (const mon of map.monsters) {
        if (mon.dead) continue;
        const oldMv = mon.movement;
        mon.movement += mcalcmove(mon);
        pushRngLogEntry(`^mcalcmove[${mon.mndx}@${mon.mx},${mon.my} speed=${mon.speed} mv=${oldMv}->${mon.movement}]`);
    }
}

// ========================================================================
// onscary — C ref: mon.c onscary()
// ========================================================================
export function onscary(map, x, y, mon = null) {
    // C ref: mon.c:252-264 — monster immunity checks
    if (mon) {
        const mdat = mon.type || {};
        if (mon.iswiz) return false;
        if (is_rider(mdat)) return false;
        // C: is_lminion — skip (minion system not ported)
        if (mdat.mndx === PM_ANGEL) return false;
        // C: magical scare (not auditory) has additional immunities
        if (is_human(mdat) || (mdat.geno & G_UNIQ)
            || mon.isshk || mon.ispriest) return false;
        // C: blind, minotaur, Gehennom plane checks — skip for now
    }

    for (const obj of map.objects || []) {
        if (obj.buried) continue;
        if (obj.ox === x && obj.oy === y
            && obj.otyp === SCR_SCARE_MONSTER
            && !obj.cursed) {
            return true;
        }
    }
    for (const engr of map.engravings || []) {
        if (!engr || engr.x !== x || engr.y !== y) continue;
        if (/elbereth/i.test(String(engr.text || ''))) return true;
    }
    return false;
}

// ========================================================================
// mm_aggression — C ref: mon.c
// ========================================================================
function zombie_form_exists(mdat) {
    const mlet = mdat?.symbol ?? -1;
    switch (mlet) {
    case S_KOBOLD:
    case S_ORC:
    case S_GIANT:
    case S_HUMAN:
    case S_KOP:
    case S_GNOME:
        return true;
    case S_HUMANOID:
        return is_dwarf(mdat);
    default:
        return false;
    }
}

// C ref: mon.c zombie_maker(mon) — returns true if mon can create zombies
export function zombie_maker(mon) {
    if (!mon || mon.mcan) return false;
    const mlet = mon.type?.symbol ?? -1;
    if (mlet === S_ZOMBIE) {
        return mon.mndx !== PM_GHOUL && mon.mndx !== PM_SKELETON;
    }
    return mlet === S_LICH;
}

// C ref: mon.c zombie_form(pm) — return PM index of zombie form, or NON_PM
// Note: C uses ptr comparison; JS uses symbol and flag predicates.
export function zombie_form(pm) {
    if (!pm) return NON_PM;
    switch (pm.symbol) {
    case S_ZOMBIE:
        return NON_PM; // already a zombie/ghoul/skeleton
    case S_KOBOLD:
        return PM_KOBOLD_ZOMBIE;
    case S_ORC:
        return PM_ORC_ZOMBIE;
    case S_GIANT:
        if (pm === mons[PM_ETTIN]) return PM_ETTIN_ZOMBIE;
        return PM_GIANT_ZOMBIE;
    case S_HUMAN:
    case S_KOP:
        if (is_elf(pm)) return PM_ELF_ZOMBIE;
        return PM_HUMAN_ZOMBIE;
    case S_HUMANOID:
        if (is_dwarf(pm)) return PM_DWARF_ZOMBIE;
        break;
    case S_GNOME:
        return PM_GNOME_ZOMBIE;
    }
    return NON_PM;
}

// C ref: mon.c undead_to_corpse(mndx) — convert undead PM index to living counterpart
export function undead_to_corpse(mndx) {
    switch (mndx) {
    case PM_KOBOLD_ZOMBIE: case PM_KOBOLD_MUMMY: return PM_KOBOLD;
    case PM_DWARF_ZOMBIE:  case PM_DWARF_MUMMY:  return PM_DWARF;
    case PM_GNOME_ZOMBIE:  case PM_GNOME_MUMMY:  return PM_GNOME;
    case PM_ORC_ZOMBIE:    case PM_ORC_MUMMY:    return PM_ORC;
    case PM_ELF_ZOMBIE:    case PM_ELF_MUMMY:    return PM_ELF;
    case PM_VAMPIRE: case PM_VAMPIRE_LEADER:
    case PM_HUMAN_ZOMBIE:  case PM_HUMAN_MUMMY:  return PM_HUMAN;
    case PM_GIANT_ZOMBIE:  case PM_GIANT_MUMMY:  return PM_GIANT;
    case PM_ETTIN_ZOMBIE:  case PM_ETTIN_MUMMY:  return PM_ETTIN;
    default: return mndx;
    }
}

// C ref: mon.c genus(mndx, mode) — return generic species index for a monster.
// mode=0: return base species (PM_HUMAN, PM_ELF, etc.)
// mode=1: return character-class monster (PM_ARCHEOLOGIST, etc.) for quest guardians
export function genus(mndx, mode) {
    switch (mndx) {
    case PM_STUDENT:     return mode ? PM_ARCHEOLOGIST : PM_HUMAN;
    case PM_CHIEFTAIN:   return mode ? PM_BARBARIAN   : PM_HUMAN;
    case PM_NEANDERTHAL: return mode ? PM_CAVE_DWELLER: PM_HUMAN;
    case PM_ATTENDANT:   return mode ? PM_HEALER      : PM_HUMAN;
    case PM_PAGE:        return mode ? PM_KNIGHT       : PM_HUMAN;
    case PM_ABBOT:       return mode ? PM_MONK         : PM_HUMAN;
    case PM_ACOLYTE:     return mode ? PM_CLERIC       : PM_HUMAN;
    case PM_HUNTER:      return mode ? PM_RANGER       : PM_HUMAN;
    case PM_THUG:        return mode ? PM_ROGUE        : PM_HUMAN;
    case PM_ROSHI:       return mode ? PM_SAMURAI      : PM_HUMAN;
    case PM_GUIDE:       return mode ? PM_TOURIST      : PM_HUMAN;
    case PM_APPRENTICE:  return mode ? PM_WIZARD       : PM_HUMAN;
    case PM_WARRIOR:     return mode ? PM_VALKYRIE     : PM_HUMAN;
    default:
        if (mndx >= 0 && mndx < NUMMONS) {
            const ptr = mons[mndx];
            if (is_human(ptr)) return PM_HUMAN;
            if (is_elf(ptr))   return PM_ELF;
            if (is_dwarf(ptr)) return PM_DWARF;
            if (is_gnome(ptr)) return PM_GNOME;
            if (is_orc(ptr))   return PM_ORC;
        }
        return mndx;
    }
}

// C ref: mon.c pm_to_cham(mndx) — return mndx if shapeshifter, else NON_PM
export function pm_to_cham(mndx) {
    if (mndx >= 0 && mndx < NUMMONS && is_shapeshifter(mons[mndx]))
        return mndx;
    return NON_PM;
}

function unique_corpstat(mdat) {
    return !!((mdat?.geno || 0) & G_UNIQ);
}

function mm_2way_aggression(magr, mdef, map) {
    if (!zombie_maker(magr)) return { allowM: false, allowTM: false };
    if (!zombie_form_exists(mdef?.type || {})) return { allowM: false, allowTM: false };
    const inStronghold = map?.flags?.graveyard && map?.flags?.is_maze_lev;
    if (inStronghold) return { allowM: false, allowTM: false };
    if (unique_corpstat(magr?.type || {}) || unique_corpstat(mdef?.type || {})) {
        return { allowM: false, allowTM: false };
    }
    return { allowM: true, allowTM: true };
}

function mm_aggression(magr, mdef, map) {
    if (magr?.tame && mdef?.tame) return { allowM: false, allowTM: false };
    const attackerIdx = magr?.mndx;
    const defenderIdx = mdef?.mndx;
    const isPurpleWorm = attackerIdx === PM_PURPLE_WORM || attackerIdx === PM_BABY_PURPLE_WORM;
    if (isPurpleWorm && defenderIdx === PM_SHRIEKER) return { allowM: true, allowTM: true };

    const ab = mm_2way_aggression(magr, mdef, map);
    const ba = mm_2way_aggression(mdef, magr, map);
    return {
        allowM: ab.allowM || ba.allowM,
        allowTM: ab.allowTM || ba.allowTM,
    };
}

// ========================================================================
// mfndpos — C ref: mon.c mfndpos()
// ========================================================================
// C ref: hack.c bad_rock() / cant_squeeze_thru() subset used by mon.c mfndpos().
function bad_rock_for_mon(mon, map, x, y) {
    const loc = map.at(x, y);
    if (!loc) return true;
    if (!IS_OBSTRUCTED(loc.typ)) return false;
    const f1 = mon.type?.flags1 || 0;
    const canPassWall = !!(f1 & M1_WALLWALK);
    if (canPassWall) return false;
    const canTunnel = !!(f1 & M1_TUNNEL);
    const needsPick = !!(f1 & M1_NEEDPICK);
    if (canTunnel && !needsPick) return false;
    return true;
}

function cant_squeeze_thru_mon(mon) {
    const ptr = mon.type || {};
    const f1 = ptr.flags1 || 0;
    if (f1 & M1_WALLWALK) return false;
    const size = ptr.size || 0;
    const canMorph = !!(f1 & (M1_AMORPHOUS | M1_UNSOLID | M1_SLITHY));
    if (size > MZ_MEDIUM && !canMorph) return true;
    const load = Array.isArray(mon.minvent)
        ? mon.minvent.reduce((a, o) => a + (o?.owt || 0), 0)
        : 0;
    return load > 600;
}

// C ref: monmove.c monlineu() — true if (nx,ny) lies on a line from mon through hero.
// Used for NOTONL: shopkeepers/priests avoid standing on a line from hero.
function monlineu(mon, player, nx, ny) {
    const mux = Number.isInteger(mon.mux) ? mon.mux : player.x;
    const muy = Number.isInteger(mon.muy) ? mon.muy : player.y;
    return nx === mux || ny === muy
        || (ny - muy) === (nx - mux)
        || (ny - muy) === -(nx - mux);
}

// C ref: mon.c mm_displacement() — can attacker displace defender?
function mm_displacement(mon, monAtPos) {
    const monLevel = (m) => Number.isInteger(m?.m_lev) ? m.m_lev
        : (Number.isInteger(m?.mlevel) ? m.mlevel
            : (Number.isInteger(m?.type?.level) ? m.type.level : 0));
    if (!is_displacer(mon.type || {})) return false;
    const defenderIsDisplacer = is_displacer(monAtPos.type || {});
    const attackerHigherLevel = monLevel(mon) > monLevel(monAtPos);
    const defenderIsGridBugDiag = (monAtPos.mndx === PM_GRID_BUG)
        && (mon.mx !== monAtPos.mx && mon.my !== monAtPos.my);
    const defenderMultiworm = !!monAtPos.wormno;
    const attackerSize = Number.isInteger(mon.type?.size) ? mon.type.size : 0;
    const defenderSize = Number.isInteger(monAtPos.type?.size) ? monAtPos.type.size : 0;
    const sizeOk = is_rider(mon.type || {}) || attackerSize >= defenderSize;
    return (!defenderIsDisplacer || attackerHigherLevel)
        && !defenderIsGridBugDiag
        && !monAtPos.mtrapped
        && !defenderMultiworm
        && sizeOk;
}

export function mfndpos(mon, map, player, flag) {
    // C ref: mon.c:2122-2366 mfndpos()
    // If flag is not provided (legacy callers), default to 0.
    if (typeof flag !== 'number') flag = 0;

    const omx = mon.mx, omy = mon.my;
    const mdat = mon.type || {};
    const mflags1 = mdat.flags1 || 0;
    const mlet = mdat.symbol ?? -1;
    const nodiag = (mon.mndx === PM_GRID_BUG);

    // C ref: mon.c:2142-2145 — confused: grant all, remove notonl
    if (mon.confused) {
        flag |= ALLOW_ALL;
        flag &= ~NOTONL;
    }
    // C ref: mon.c:2146-2147 — blind: add ALLOW_SSM
    if (mon.blind || mon.mcansee === false) {
        flag |= ALLOW_SSM;
    }

    const isFlyer = !!(mflags1 & M1_FLY);
    const isFloater = (mlet === S_EYE || mlet === S_LIGHT);
    const isClinger = is_clinger(mdat);
    const hasCeiling = !(map?.flags?.is_airlevel || map?.flags?.is_waterlevel);
    // C ref: mon.c:2152 — m_in_air includes clingers on ceilings when undetected
    const m_in_air = isFlyer || isFloater || (isClinger && hasCeiling && mon.mundetected);
    const wantpool = (mlet === S_EEL);
    const isSwimmer = !!(mflags1 & (M1_SWIM | M1_AMPHIBIOUS));
    const poolok = (m_in_air || (isSwimmer && !wantpool));
    const likesLava = (mon.mndx === PM_FIRE_ELEMENTAL || mon.mndx === PM_SALAMANDER);
    // C ref: mon.c:2160 — lavaok: flyers (not floaters) or lava-likers; exclude floating eye
    const lavaok = ((m_in_air && !isFloater) || likesLava) && mon.mndx !== PM_FLOATING_EYE;
    // C ref: mon.c:2162 — thrudoor = passes_walls || BUSTDOOR
    const thrudoor = !!((flag & (ALLOW_WALL | BUSTDOOR)) !== 0);
    const isAmorphous = !!(mflags1 & M1_AMORPHOUS);
    // C ref: mon.c:2164 — can_fog(mon): amorphous or unsolid fog form
    // Simplified: amorphous monsters can pass through doors
    const canFog = isAmorphous;

    const positions = [];
    const maxx = Math.min(omx + 1, COLNO - 1);
    const maxy = Math.min(omy + 1, ROWNO - 1);

    let nexttry = 0; // C ref: eel retry loop
    for (;;) {
    for (let nx = Math.max(1, omx - 1); nx <= maxx; nx++) {
        for (let ny = Math.max(0, omy - 1); ny <= maxy; ny++) {
            if (nx === omx && ny === omy) continue;
            if (nx !== omx && ny !== omy && nodiag) continue;

            const loc = map.at(nx, ny);
            if (!loc) continue;
            const ntyp = loc.typ;
            let posInfo = 0;

            // C ref: mon.c:2192-2197 — IS_OBSTRUCTED: need ALLOW_WALL or ALLOW_ROCK (ALLOW_DIG deferred)
            if (IS_OBSTRUCTED(ntyp)) {
                if (!(flag & ALLOW_WALL) && !(flag & ALLOW_ROCK)) continue;
            }
            if (ntyp === WATER && !isSwimmer) continue;
            // C ref: mon.c:2203-2206 — IRONBARS: check ALLOW_BARS flag
            if (ntyp === IRONBARS && !(flag & ALLOW_BARS)) continue;

            // C ref: mon.c:2208-2217 — door handling
            if (IS_DOOR(ntyp)) {
                const canPassDoor = (isAmorphous && !mon.engulfing) || canFog || thrudoor;
                if (!canPassDoor) {
                    if ((loc.flags & D_CLOSED) && !(flag & OPENDOOR)) continue;
                    if ((loc.flags & D_LOCKED) && !(flag & UNLOCKDOOR)) continue;
                }
            }

            // C ref: mon.c:2218-2221 — diagonal door checks
            if (nx !== omx && ny !== omy) {
                const monLoc = map.at(omx, omy);
                if ((IS_DOOR(ntyp) && (loc.flags & ~D_BROKEN))
                    || (monLoc && IS_DOOR(monLoc.typ) && (monLoc.flags & ~D_BROKEN)))
                    continue;
                // C ref: rogue level diagonal check — no diagonal movement
                const isRogueLevel = !!(map?.flags?.is_rogue || map?.flags?.roguelike || map?.flags?.is_rogue_lev);
                if (isRogueLevel) continue;
            }

            // C ref: mon.c:2236-2237 — LAVAWALL needs lavaok AND ALLOW_WALL
            if (ntyp === LAVAWALL && (!lavaok || !(flag & ALLOW_WALL))) continue;

            // C ref: mon.c:2240-2265 — pool/lava conditional
            if ((IS_POOL(ntyp) || IS_LAVA(ntyp))) {
                if (IS_POOL(ntyp) && !poolok && !(wantpool && IS_POOL(ntyp))) {
                    // On nexttry==1, skip wantpool check for eels
                    if (nexttry === 0 || !wantpool) continue;
                }
                if (!poolok && IS_POOL(ntyp) !== wantpool) {
                    if (nexttry === 0) continue;
                    // On nexttry, eels accept non-pool too
                }
                if (!lavaok && IS_LAVA(ntyp)) continue;
            }

            // === Inside the "acceptable terrain" block ===

            // C ref: mon.c:2267-2269 — onscary + ALLOW_SSM check
            if (onscary(map, nx, ny) && !(flag & ALLOW_SSM)) continue;

            // C ref: mon.c:2271-2275 — hero position: ALLOW_U check
            if (nx === player.x && ny === player.y) {
                if (!(flag & ALLOW_U)) continue;
                posInfo |= ALLOW_U;
            }

            // C ref: mon.c:2277-2304 — monster at position
            const monAtPos = map.monsterAt(nx, ny);
            if (monAtPos && !monAtPos.dead) {
                let allowMAttack = false;
                if (flag & ALLOW_M) {
                    // Tame: attack non-tame non-peaceful
                    allowMAttack = !monAtPos.tame && !monAtPos.peaceful;
                } else {
                    // Hostile/peaceful: check mm_aggression
                    const mmflag = mm_aggression(mon, monAtPos, map);
                    if (mmflag.allowM) {
                        if (monAtPos.tame) {
                            if (flag & ALLOW_TM) allowMAttack = true;
                        } else {
                            allowMAttack = true;
                        }
                    }
                }
                if (allowMAttack) {
                    posInfo |= ALLOW_M;
                } else if (mm_displacement(mon, monAtPos)) {
                    posInfo |= ALLOW_MDISP;
                } else {
                    continue;
                }
            }

            // C ref: mon.c:2306-2313 — garlic avoidance for undead
            if (flag & NOGARLIC) {
                let hasGarlic = false;
                for (const obj of map.objects) {
                    if (obj.buried) continue;
                    if (obj.ox === nx && obj.oy === ny && obj.otyp === CLOVE_OF_GARLIC) {
                        hasGarlic = true;
                        break;
                    }
                }
                if (hasGarlic) continue;
            }

            // C ref: mon.c:2315-2323 — boulder check (ALLOW_ROCK)
            if (!(flag & ALLOW_ROCK)) {
                let hasBoulder = false;
                for (const obj of map.objects) {
                    if (obj.buried) continue;
                    if (obj.ox === nx && obj.oy === ny && obj.otyp === BOULDER) {
                        hasBoulder = true;
                        break;
                    }
                }
                if (hasBoulder) continue;
            }

            // C ref: mon.c:2325-2331 — NOTONL: check monlineu
            if (flag & NOTONL) {
                const monSeeHero = (mon.mcansee !== false)
                    && !mon.blind
                    && m_cansee(mon, map, player.x, player.y)
                    && (!player.invisible || perceives(mdat));
                if (monSeeHero && monlineu(mon, player, nx, ny)) {
                    posInfo |= NOTONL;
                }
            }

            // C ref: mon.c:2333-2340 — tight squeeze for diagonal
            if (nx !== omx && ny !== omy) {
                const sideAIsBadRock = bad_rock_for_mon(mon, map, omx, ny);
                const sideBIsBadRock = bad_rock_for_mon(mon, map, nx, omy);
                if (sideAIsBadRock && sideBIsBadRock && cant_squeeze_thru_mon(mon))
                    continue;
            }

            // C ref: mon.c:2342-2352 — trap check
            const trap = map.trapAt(nx, ny);
            if (trap) {
                if (!m_harmless_trap(mon, trap)) {
                    if (!(flag & ALLOW_TRAPS)) {
                        if (mon_knows_traps(mon, trap.ttyp))
                            continue;
                    }
                    posInfo |= ALLOW_TRAPS;
                }
            }

            positions.push({
                x: nx,
                y: ny,
                info: posInfo,
                // Legacy compat fields for callers that still use them
                allowTraps: !!(posInfo & ALLOW_TRAPS),
                allowM: !!(posInfo & ALLOW_M),
                allowMDisp: !!(posInfo & ALLOW_MDISP),
                allowU: !!(posInfo & ALLOW_U),
                notOnLine: !!(posInfo & NOTONL),
            });
        }
    }

    // C ref: mon.c:2358-2365 — eel nexttry: retry without wantpool requirement
    if (positions.length === 0 && nexttry === 0 && wantpool) {
        nexttry = 1;
        continue;
    }
    break;
    } // end nexttry loop

    return positions;
}

// ========================================================================
// Hider premove — C ref: mon.c restrap() / movemon_singlemon()
// ========================================================================
function canSeeForRestrap(mon, map, player, fov) {
    if (!mon || !map || !player) return false;
    const canSeeSquare = fov?.canSee ? fov.canSee(mon.mx, mon.my) : couldsee(map, player, mon.mx, mon.my);
    return !!canSeeSquare && !player.blind;
}

export function handleHiderPremove(mon, map, player, fov) {
    const ptr = mon.type || {};
    if (!is_hider(ptr)) return false;

    const trap = mon.mtrapped ? map.trapAt(mon.mx, mon.my) : null;
    const trappedOutsidePit = !!(mon.mtrapped && trap && trap.ttyp !== PIT && trap.ttyp !== SPIKED_PIT);
    const isCeilingHider = ptr.symbol === S_PIERCER;
    const hasCeiling = !(map?.flags?.is_airlevel || map?.flags?.is_waterlevel);
    const sensedAndAdjacent = canSpotMonsterForMap(mon, map, player, fov) && monnear(mon, player.x, player.y);

    const blocked =
        mon.mcan
        || mon.m_ap_type
        || mon.appear_as_type
        || canSeeForRestrap(mon, map, player, fov)
        || rn2(3)
        || trappedOutsidePit
        || (isCeilingHider && !hasCeiling)
        || sensedAndAdjacent;

    if (!blocked) {
        if (ptr.symbol === S_MIMIC) {
            if (!(mon.sleeping || (mon.mfrozen > 0))) {
                mon.m_ap_type = mon.m_ap_type || 'object';
                return true;
            }
        } else if (map.at(mon.mx, mon.my)?.typ === ROOM) {
            mon.mundetected = true;
            return true;
        }
    }

    return !!(mon.m_ap_type || mon.appear_as_type || mon.mundetected);
}

// ========================================================================
// corpse_chance — C ref: mon.c:3178-3252
// ========================================================================

// C ref: mon.c:3178-3252 corpse_chance() — determines if monster leaves a corpse.
// Returns true if corpse should be created. CRITICAL: several early-return paths
// do NOT consume rn2(), so callers must use this instead of rolling directly.
export function corpse_chance(mon) {
    const mdat = mon?.type || (Number.isInteger(mon?.mndx) ? mons[mon.mndx] : {});
    if (!mdat) return false;

    // C ref: mon.c:3190-3194 — Vlad and liches crumble to dust (no corpse, no RNG)
    if (mon.mndx === PM_VLAD_THE_IMPALER || mdat.symbol === S_LICH)
        return false;

    // C ref: mon.c:3197-3229 — gas spores explode (no corpse, no RNG)
    if (mdat.attacks) {
        for (const atk of mdat.attacks) {
            if (atk && atk.type === AT_BOOM) return false;
        }
    }

    // C ref: mon.c:3233 — LEVEL_SPECIFIC_NOCORPSE
    // (Not relevant in early game — skip)

    // C ref: mon.c:3235-3238 — big monsters, lizards, golems, players, riders,
    // shopkeepers ALWAYS leave corpses (no RNG consumed)
    const bigmonst = (mdat.size || 0) >= MZ_LARGE;
    if (((bigmonst || mon.mndx === PM_LIZARD) && !mon.mcloned)
        || is_golem(mdat) || is_mplayer(mdat) || is_rider(mdat) || mon.isshk)
        return true;

    // C ref: mon.c:3239-3240 — probabilistic: rn2(tmp) where tmp = 2 + rare + tiny
    const gfreq = (mdat.geno || 0) & G_FREQ;
    const verysmall = (mdat.size || 0) === MZ_TINY;
    const corpsetmp = 2 + (gfreq < 2 ? 1 : 0) + (verysmall ? 1 : 0);
    return !rn2(corpsetmp);
}

// ========================================================================
// Monster death chain — C ref: mon.c
// ========================================================================

// C ref: mon.c mlifesaver() — check for amulet of life saving
export function mlifesaver(mon) {
    if (nonliving(mon.type || {}) && !mon.is_vampshifter) return null;
    const otmp = which_armor(mon, W_AMUL);
    if (otmp && otmp.otyp === AMULET_OF_LIFE_SAVING) return otmp;
    return null;
}

// C ref: mon.c set_mon_min_mhpmax() — ensure minimum mhpmax after life-save
export function set_mon_min_mhpmax(mon, minimum) {
    const mlev = mon.m_lev ?? mon.mlevel ?? (mon.type?.level ?? 0);
    const minval = Math.max(mlev + 1, minimum);
    if ((mon.mhpmax || 0) < minval) mon.mhpmax = minval;
}

// C ref: mon.c lifesaved_monster() — activate life saving amulet
export function lifesaved_monster(mon) {
    const lifesave = mlifesaver(mon);
    if (lifesave) {
        // Use up the amulet
        if (Array.isArray(mon.minvent)) {
            const idx = mon.minvent.indexOf(lifesave);
            if (idx >= 0) mon.minvent.splice(idx, 1);
        }
        if (mon.amulet === lifesave) mon.amulet = null;
        // Revive
        mon.mcanmove = true;
        mon.mfrozen = 0;
        set_mon_min_mhpmax(mon, 10);
        mon.mhp = mon.mhpmax;
        // Mark for gear re-evaluation
        check_gear_next_turn(mon);
    }
}

// C ref: mon.c check_gear_next_turn() — flag for next-turn equipment evaluation
export function check_gear_next_turn(mon) {
    mon.misc_worn_check = (mon.misc_worn_check || 0) | 0x80000000; // I_SPECIAL
}

// C ref: mon.c m_detach() — detach monster from map
// In JS, this is handled by monutil.js mondead + movemon's dead filter.
// We provide this as a C-compatible alias.
export function m_detach(mon, mptr, due_to_death, map, player) {
    // JS doesn't have the complex C detach chain.
    // The existing monutil.mondead handles the core: mark dead, drop inv, newsym, unstuck.
    // This wrapper is for callers that expect the C API.
    if (due_to_death && map) {
        _monutil_mondead(mon, map, player);
    } else {
        mon.dead = true;
        mon.mhp = 0;
        if (player) unstuck(mon, player);
    }
}

// C ref: mon.c mondead() — full death processing with life-saving
export function mondead_full(mon, map, player) {
    mon.mhp = 0;
    lifesaved_monster(mon);
    if (mon.mhp > 0) return; // life-saved

    // Log death event and process (delegating to monutil.mondead)
    _monutil_mondead(mon, map, player);
}

// C ref: mon.c mondied() — died of own accord, maybe leaves corpse
export function mondied(mon, map, player) {
    mondead_full(mon, map, player);
    if (mon.mhp > 0) return; // life-saved

    if (corpse_chance(mon) && map) {
        const loc = map.at(mon.mx, mon.my);
        if (loc && (ACCESSIBLE(loc.typ) || IS_POOL(loc.typ))) {
            make_corpse(mon, 0, map);
        }
    }
}

// C ref: mon.c mongone() — remove without corpse (disappears)
export function mongone(mon, map, player) {
    mon.mhp = 0;
    if (player) unstuck(mon, player);
    // Discard inventory without dropping
    if (Array.isArray(mon.minvent)) mon.minvent = [];
    mon.weapon = null;
    mon.dead = true;
    if (map) newsym(map, mon.mx, mon.my);
}

// C ref: mon.c monkilled() — killed by non-hero
export function monkilled(mon, fltxt, how, map, player) {
    // C ref: disintegested for AD_DGST/AD_RBRE/AD_FIRE+completelyburns
    // Simplified: always go through mondied path
    mondied(mon, map, player);
}

// XKILL flag constants — C ref: hack.h
export const XKILL_GIVEMSG   = 0x0;
export const XKILL_NOMSG     = 0x1;
export const XKILL_NOCORPSE  = 0x2;
export const XKILL_NOCONDUCT = 0x4;

// C ref: mon.c xkilled() — hero kills monster
export function xkilled(mon, xkill_flags, map, player) {
    const nomsg = !!(xkill_flags & XKILL_NOMSG);
    const nocorpse = !!(xkill_flags & XKILL_NOCORPSE);
    const x = mon.mx, y = mon.my;

    mon.mhp = 0;

    // C ref: mondead() with life-saving
    mondead_full(mon, map, player);
    if (mon.mhp > 0) return; // life-saved

    if (nocorpse) return;

    // C ref: treasure drop — rn2(6)
    if (map && !rn2(6) && (x !== (player?.x || 0) || y !== (player?.y || 0))) {
        // Simplified: skip treasure drop (would need mkobj with RANDOM_CLASS)
        // RNG consumed for parity
    }

    // Corpse
    if (map && !nocorpse && corpse_chance(mon)) {
        const loc = map.at(x, y);
        if (loc && (ACCESSIBLE(loc.typ) || IS_POOL(loc.typ))) {
            make_corpse(mon, 0, map);
        }
    }
}

// C ref: mon.c killed() — wrapper for xkilled with XKILL_GIVEMSG
export function killed(mon, map, player) {
    xkilled(mon, XKILL_GIVEMSG, map, player);
}

// C ref: mon.c make_corpse() — per-monster corpse/drop creation
export function make_corpse(mon, corpseflags, map) {
    const mndx = mon.mndx ?? 0;
    const x = mon.mx, y = mon.my;

    // C ref: golem drops, dragon scales, unicorn horns handled via switch
    // Simplified: create a standard corpse for non-special cases
    // The mkcorpstat call handles corpse creation with RNG
    const obj = mkcorpstat(CORPSE, mndx, true, x, y, map);
    return obj;
}

// ========================================================================
// Monster alertness — C ref: mon.c
// ========================================================================

// C ref: mon.c wake_msg() — display wake message
export function wake_msg(mon, via_attack) {
    // Simplified: message output not fully ported
}

// C ref: mon.c wakeup() — wake monster, possibly anger
export function wakeup(mon, via_attack, map, player) {
    mon.msleeping = 0;
    // Reveal hidden mimic
    if (mon.m_ap_type && mon.m_ap_type !== 'monster') {
        seemimic(mon, map);
    }
    if (via_attack) {
        setmangry(mon, true, map, player);
    }
}

// C ref: mon.c seemimic() — reveal hiding mimic
export function seemimic(mon, map) {
    mon.m_ap_type = null;
    mon.appear_as_type = null;
    if (map) newsym(map, mon.mx, mon.my);
}

// C ref: mon.c wake_nearto_core() — wake all within distance
export function wake_nearto_core(x, y, distance, petcall, map) {
    if (!map) return;
    for (const mon of map.monsters) {
        if (mon.dead) continue;
        if (distance === 0 || dist2(mon.mx, mon.my, x, y) < distance) {
            mon.msleeping = 0;
        }
    }
}

// C ref: mon.c wake_nearto() — wrapper
export function wake_nearto(x, y, distance, map) {
    wake_nearto_core(x, y, distance, false, map);
}

// C ref: mon.c wake_nearby() — wake all near hero
export function wake_nearby(player, map) {
    if (!player || !map) return;
    const ulevel = player.ulevel || player.level || 1;
    wake_nearto_core(player.x, player.y, ulevel * 20, false, map);
}

// C ref: mon.c setmangry() — make peaceful monster hostile
export function setmangry(mon, via_attack, map, player) {
    if (!mon.peaceful) return;
    if (mon.tame) return;
    mon.peaceful = false;
    // C ref: adjalign(-1) — alignment penalty simplified
    // C ref: rnd(5) for Elbereth hypocrisy
}


// ========================================================================
// Monster state & visibility — C ref: mon.c Phase C
// ========================================================================

// C ref: mon.c:2113 m_in_air() — monster is up in the air/on the ceiling
export function m_in_air(mon) {
    const mdat = mon?.type || {};
    return is_flyer(mdat) || is_floater(mdat)
        || (is_clinger(mdat) && !!mon.mundetected);
}

// C ref: mon.c:311 m_poisongas_ok() — would monster be OK with poison gas?
// Returns: 2 = OK, 1 = minor (resistant), 0 = bad
export const M_POISONGAS_OK = 2;
export const M_POISONGAS_MINOR = 1;
export const M_POISONGAS_BAD = 0;

export function m_poisongas_ok(mon) {
    const mdat = mon?.type || {};
    if (nonliving(mdat) || (mdat.flags1 & M1_BREATHLESS))
        return M_POISONGAS_OK;
    // C ref: is_swimmer eels in pools
    if (mdat.symbol === S_EEL)
        return M_POISONGAS_OK;
    if (resists_poison(mon))
        return M_POISONGAS_MINOR;
    return M_POISONGAS_BAD;
}

// C ref: mon.c:3876 elemental_clog() — elemental overcrowding in endgame
// Simplified: endgame system not fully ported.
export function elemental_clog(mon) {
    // Only relevant in endgame which isn't ported — no-op stub
}

// C ref: mon.c:3420 set_ustuck() — set stuck-to monster
export function set_ustuck(mon, player) {
    if (!player) return;
    player.ustuck = mon || null;
    if (!player.ustuck) {
        player.uswallow = false;
        player.uswldtim = 0;
    }
}

// C ref: mon.c:4694 maybe_unhide_at() — reveal hidden monster if can't hide
export function maybe_unhide_at(x, y, map) {
    if (!map) return;
    const mon = map.monsterAt(x, y);
    if (!mon || !mon.mundetected) return;

    const mdat = mon.type || {};
    // Eel out of water
    if (mdat.symbol === S_EEL && !IS_POOL(map.at(x, y)?.typ)) {
        hideunder(mon, map);
        return;
    }
    // Hider-under without objects
    if (hides_under(mdat)) {
        const objects = map.objectsAt ? map.objectsAt(x, y) : [];
        if (!objects || objects.length === 0) {
            hideunder(mon, map);
        }
    }
}

// C ref: mon.c:4721 hideunder() — monster tries to hide under something
export function hideunder(mon, map) {
    if (!mon || !map) return false;
    const mdat = mon.type || {};
    const x = mon.mx, y = mon.my;
    let undetected = false;

    if (mdat.symbol === S_EEL) {
        // Eels hide in pools
        undetected = IS_POOL(map.at(x, y)?.typ);
    } else if (hides_under(mdat)) {
        // Hider-unders hide under objects on non-water tiles
        const objects = map.objectsAt ? map.objectsAt(x, y) : [];
        if (objects && objects.length > 0 && !IS_POOL(map.at(x, y)?.typ)) {
            undetected = true;
        }
    }

    const old = !!mon.mundetected;
    mon.mundetected = undetected;
    if (undetected !== old) {
        newsym(map, x, y);
    }
    return undetected;
}

// C ref: mon.c:4803 hide_monst() — called when returning to a level
export function hide_monst(mon, map) {
    if (!mon || !map) return;
    const mdat = mon.type || {};
    const hider_under = hides_under(mdat) || mdat.symbol === S_EEL;
    if ((is_hider(mdat) || hider_under) && !mon.mundetected && !mon.m_ap_type) {
        if (hider_under)
            hideunder(mon, map);
    }
}


// ========================================================================
// Monster turn processing — C ref: mon.c Phase A
// ========================================================================

// C ref: mon.c:4595 healmon() — heal monster HP with optional overheal
export function healmon(mon, amt, overheal) {
    if (!mon) return 0;
    const oldhp = mon.mhp || 0;
    if ((mon.mhp || 0) + amt > (mon.mhpmax || 0) + overheal) {
        mon.mhpmax = (mon.mhpmax || 0) + overheal;
        mon.mhp = mon.mhpmax;
    } else {
        mon.mhp = (mon.mhp || 0) + amt;
        if (mon.mhp > (mon.mhpmax || 0))
            mon.mhpmax = mon.mhp;
    }
    return mon.mhp - oldhp;
}

// C ref: mon.c:1339 meatbox() — dispose of contents of eaten container
export function meatbox(mon, otmp, map) {
    if (!otmp || !Array.isArray(otmp.cobj) || otmp.cobj.length === 0) return;
    if (!isok(mon.mx, mon.my)) return;
    const engulf = (mon.mndx === PM_GELATINOUS_CUBE);
    const contents = [...otmp.cobj];
    otmp.cobj = [];
    for (const cobj of contents) {
        if (!cobj) continue;
        if (engulf) {
            mpickobj(mon, cobj);
        } else {
            // Drop to floor
            cobj.ox = mon.mx;
            cobj.oy = mon.my;
            if (map && typeof map.addObject === 'function') {
                map.addObject(cobj);
            }
        }
    }
}


// C ref: mon.c:1377 m_consume_obj() — monster consumes an object
// Simplified: handles healing, container contents, corpse intrinsics.
// Missing: poly/grow/stone/mimic/pyrolisk (unported subsystems).
export function m_consume_obj(mon, otmp, map) {
    if (!mon || !otmp) return;
    const ispet = !!mon.tame;

    // Non-pet: heal up to object weight in HP
    if (!ispet && (mon.mhp || 0) < (mon.mhpmax || 0)) {
        const objWeight = otmp.owt || weight(otmp) || 10;
        healmon(mon, objWeight, 0);
    }
    // Handle container contents
    if (Array.isArray(otmp.cobj) && otmp.cobj.length > 0) {
        meatbox(mon, otmp, map);
    }
    // Corpse intrinsic granting
    const corpsenm = (otmp.otyp === CORPSE) ? (otmp.corpsenm ?? NON_PM) : NON_PM;
    // Delete the object (remove from any list)
    if (map && typeof map.removeObject === 'function') {
        map.removeObject(otmp);
    }
    // Grant intrinsics from corpse
    if (corpsenm !== NON_PM && corpsenm >= 0 && corpsenm < NUMMONS) {
        mon_givit(mon, mons[corpsenm]);
    }
}

// C ref: mon.c:1448 meatmetal() — rust monster eats metal
// Returns: 0 = nothing, 1 = ate something, 2 = died
export function meatmetal(mon, map) {
    if (!mon || !map) return 0;
    if (mon.tame) return 0;

    const objects = map.objectsAt ? map.objectsAt(mon.mx, mon.my) : [];
    for (const otmp of [...objects]) {
        if (!otmp || otmp.buried) continue;
        // Rust monsters only eat rustprone items
        if (mon.mndx === PM_RUST_MONSTER && !is_rustprone(otmp))
            continue;
        // Skip strangulation amulet, slow digestion ring
        if (otmp.otyp === 209 /* AMULET_OF_STRANGULATION */ ||
            otmp.otyp === 164 /* RIN_SLOW_DIGESTION */)
            continue;
        // Skip poisoned items for non-resistant monsters
        if (otmp.opoisoned && !resists_poison(mon))
            continue;
        if (!is_metallic(otmp)) continue;
        if (obj_resists(otmp, 5, 95)) continue;  // consumes rn2(100)

        // Rust monster vs erodeproof: spit it out
        if (mon.mndx === PM_RUST_MONSTER && otmp.oerodeproof) {
            otmp.oerodeproof = false;
            mon.stunned = true;
            return 0; // didn't actually eat it
        }

        // Eat the object
        mon.meating = Math.floor((otmp.owt || 10) / 2) + 1;
        m_consume_obj(mon, otmp, map);
        if (mon.dead || (mon.mhp || 0) <= 0) return 2;
        // Maybe leave a rock behind
        if (rnd(25) < 3) {
            // C ref: mksobj_at(ROCK, ...) — simplified
            // Rock creation not yet wired
        }
        newsym(map, mon.mx, mon.my);
        return 1;
    }
    return 0;
}


// C ref: mon.c:1518 meatobj() — gelatinous cube eats pile of objects
// Returns: 0 = nothing, 1 = ate/engulfed, 2 = died
export function meatobj(mon, map) {
    if (!mon || !map) return 0;
    if (mon.tame) return 0;

    const objects = map.objectsAt ? map.objectsAt(mon.mx, mon.my) : [];
    let count = 0, ecount = 0;

    for (const otmp of [...objects]) {
        if (!otmp || otmp.buried) continue;
        // Skip scare monster scrolls
        if (otmp.otyp === SCR_SCARE_MONSTER) continue;
        // Skip boulders (ROCK_CLASS = 1)
        if (otmp.oclass === 1) continue;

        // Petrifying corpses — skip if not resistant
        if (otmp.otyp === CORPSE && otmp.corpsenm >= 0 && otmp.corpsenm < NUMMONS) {
            const cptr = mons[otmp.corpsenm];
            if (is_rider(cptr)) continue; // skip Rider corpses
            if (touch_petrifies(cptr) && !resists_ston(mon)) continue;
        }

        // Decide: eat (organic) vs engulf (inorganic)
        if (is_organic(otmp) && !obj_resists(otmp, 5, 95)) {
            // Eat it
            ++count;
            m_consume_obj(mon, otmp, map);
            if (mon.dead || (mon.mhp || 0) <= 0) return 2;
        } else {
            // Engulf it — move to monster inventory
            if (obj_resists(otmp, 5, 95)) {
                // obj_resists already consumed RNG above for organic check;
                // for inorganic items we need to consume it here
            }
            ++ecount;
            if (map && typeof map.removeObject === 'function') {
                map.removeObject(otmp);
            }
            mpickobj(mon, otmp);
        }

        if (mon.minvis) newsym(map, mon.mx, mon.my);
    }
    return (count > 0 || ecount > 0) ? 1 : 0;
}

// C ref: mon.c:1641 meatcorpse() — purple worm eats corpses
// Returns: 0 = nothing, 1 = ate, 2 = died
export function meatcorpse(mon, map) {
    if (!mon || !map) return 0;
    if (mon.tame) return 0;

    const objects = map.objectsAt ? map.objectsAt(mon.mx, mon.my) : [];
    for (const otmp of [...objects]) {
        if (!otmp || otmp.buried) continue;
        if (otmp.otyp !== CORPSE) continue;
        const corpsenm = otmp.corpsenm ?? -1;
        if (corpsenm < 0 || corpsenm >= NUMMONS) continue;

        const corpsepm = mons[corpsenm];
        // Skip vegan corpses
        if (vegan_mondata(corpsepm)) continue;
        // Skip petrifying corpses
        if (touch_petrifies(corpsepm) && !resists_ston(mon)) continue;
        // Skip Rider corpses
        if (is_rider(corpsepm)) continue;

        // C ref: splitobj for stacks > 1 — simplified
        // (corpse stacks are rare)

        m_consume_obj(mon, otmp, map);
        if (mon.dead || (mon.mhp || 0) <= 0) return 2;

        if (mon.minvis) newsym(map, mon.mx, mon.my);
        return 1;
    }
    return 0;
}

// C ref: mon.c:928 minliquid() — check if monster drowns/burns in liquid
// Returns: 0 = survived, 1 = died
export function minliquid(mon, map, player) {
    return minliquid_core(mon, map, player);
}

// C ref: mon.c:943 minliquid_core() — guts of minliquid
function minliquid_core(mon, map, player) {
    if (!mon || !map) return 0;
    const loc = map.at(mon.mx, mon.my);
    if (!loc) return 0;

    const mdat = mon.type || {};
    const inpool = IS_POOL(loc.typ) && !is_flyer(mdat) && !is_floater(mdat);
    const inlava = IS_LAVA(loc.typ) && !is_flyer(mdat) && !is_floater(mdat);
    // C ref: IS_FOUNTAIN not ported — skip fountain check

    // Gremlin splitting in pools
    if (mon.mndx === PM_GREMLIN && inpool && rn2(3)) {
        // C ref: split_mon — gremlin clone not fully ported
        // RNG consumed: rn2(3) above
        if (inpool) water_damage_chain(mon.minvent, false);
        return 0;
    }

    // Iron golem rusting in pools
    if (mon.mndx === PM_IRON_GOLEM && inpool && !rn2(5)) {
        const dam = d(2, 6);
        mon.mhp = (mon.mhp || 0) - dam;
        if ((mon.mhpmax || 0) > dam)
            mon.mhpmax -= dam;
        if ((mon.mhp || 0) <= 0) {
            mondied(mon, map, player);
            if (mon.dead || (mon.mhp || 0) <= 0)
                return 1;
        }
        water_damage_chain(mon.minvent, false);
        return 0;
    }

    if (inlava) {
        if (!is_clinger(mdat) && !likes_lava(mdat)) {
            // Try teleport escape
            if (can_teleport(mdat)) {
                // C ref: rloc — simplified random relocation
                // Not wiring full rloc yet
            }
            if (!resists_fire(mon)) {
                // Burns to death
                mondied(mon, map, player);
            } else {
                mon.mhp = (mon.mhp || 0) - 1;
                if ((mon.mhp || 0) <= 0) {
                    mondied(mon, map, player);
                }
            }
            if (mon.dead || (mon.mhp || 0) <= 0) return 1;
            // Survivor: fire damage inventory, try to relocate
            fire_damage_chain(mon.minvent, false, false, mon.mx, mon.my);
            return 0;
        }
    } else if (inpool) {
        if (!is_clinger(mdat) && !cant_drown(mdat)) {
            // Try teleport escape
            if (can_teleport(mdat)) {
                // C ref: rloc — not wiring full rloc yet
            }
            // Drowns
            mondied(mon, map, player);
            if (mon.dead || (mon.mhp || 0) <= 0) return 1;
            // Survivor: water damage inventory
            water_damage_chain(mon.minvent, false);
            return 0;
        }
    } else {
        // Eels out of water
        if (mdat.symbol === S_EEL) {
            if ((mon.mhp || 0) > 1 && rn2(mon.mhp || 1) > rn2(8)) {
                mon.mhp = (mon.mhp || 0) - 1;
            }
            // C ref: monflee(mon, 2, FALSE, FALSE) — simplified
            mon.flee = true;
            mon.fleetim = Math.max(mon.fleetim || 0, 2);
        }
    }
    return 0;
}

// C ref: mon.c:1812 mpickgold() — monster picks up gold
export function mpickgold(mon, map) {
    if (!mon || !map) return;
    const objects = map.objectsAt ? map.objectsAt(mon.mx, mon.my) : [];
    for (const gold of [...objects]) {
        if (!gold || gold.buried) continue;
        // C ref: g_at() — find gold object
        if (gold.oclass !== 16 /* COIN_CLASS */) continue;
        if (map && typeof map.removeObject === 'function') {
            map.removeObject(gold);
        }
        mpickobj(mon, gold);
        newsym(map, mon.mx, mon.my);
        return;
    }
}

// C ref: mon.c:1943 can_touch_safely() — can monster touch object?
export function can_touch_safely(mon, otmp) {
    if (!mon || !otmp) return true;
    const mdat = mon.type || {};
    // Cockatrice corpse without gloves
    if (otmp.otyp === CORPSE && otmp.corpsenm >= 0 && otmp.corpsenm < NUMMONS) {
        const cptr = mons[otmp.corpsenm];
        if (touch_petrifies(cptr)
            && !(mon.misc_worn_check & W_ARMG)
            && !resists_ston(mon))
            return false;
        if (is_rider(cptr))
            return false;
    }
    // Silver objects
    if (is_metallic(otmp) && mon_hates_silver(mon)) {
        // C ref: simplified silver check — oc_material == SILVER
        // Full check needs material; approximate with mon_hates_silver
    }
    return true;
}

// C ref: eat.c:889 intrinsic_possible() — can this corpse give this intrinsic?
function intrinsic_possible(type, ptr) {
    if (!ptr) return false;
    const mr2 = ptr.mr2 || 0; // mconveys equivalent
    switch (type) {
    case 1: return !!(mr2 & MR_FIRE);     // FIRE_RES
    case 2: return !!(mr2 & MR_COLD);     // COLD_RES
    case 3: return !!(mr2 & MR_SLEEP);    // SLEEP_RES
    case 4: return !!(mr2 & MR_DISINT);   // DISINT_RES
    case 5: return !!(mr2 & MR_ELEC);     // SHOCK_RES
    case 6: return !!(mr2 & MR_POISON);   // POISON_RES
    default: return false;
    }
}

// C ref: eat.c:961 should_givit() — die roll for granting intrinsic
function should_givit(type, ptr) {
    if (!ptr) return false;
    let chance;
    switch (type) {
    case 6: // POISON_RES
        // C ref: killer bee/scorpion special case
        chance = 15;
        break;
    default:
        chance = 15;
        break;
    }
    return (ptr.mlevel || 0) > rn2(chance);
}

// C ref: eat.c:1339 corpse_intrinsic() — pick which intrinsic to try giving
function corpse_intrinsic(ptr) {
    if (!ptr) return 0;
    const conveys_STR = is_giant(ptr);
    let count = 0;
    let prop = 0;

    if (conveys_STR) {
        count = 1;
        prop = -1; // fake prop index for STR
    }
    // C ref: LAST_PROP scan — we only check the 6 resistance props
    // that monsters can gain (FIRE_RES=1 through POISON_RES=6)
    for (let i = 1; i <= 6; i++) {
        if (!intrinsic_possible(i, ptr)) continue;
        ++count;
        if (!rn2(count)) {
            prop = i;
        }
    }
    // If strength is the only candidate, give it 50% chance
    if (conveys_STR && count === 1 && !rn2(2))
        prop = 0;
    return prop;
}

// C ref: mon.c:1711 mon_give_prop() — grant a resistance intrinsic to monster
export function mon_give_prop(mon, prop) {
    if (!mon) return;
    let intrinsic = 0;
    // Map prop number to MR_ constant
    // Using worn.js res_to_mr logic: (1 << (prop - 1))
    switch (prop) {
    case 1: intrinsic = MR_FIRE; break;     // FIRE_RES
    case 2: intrinsic = MR_COLD; break;     // COLD_RES
    case 3: intrinsic = MR_SLEEP; break;    // SLEEP_RES
    case 4: intrinsic = MR_DISINT; break;   // DISINT_RES
    case 5: intrinsic = MR_ELEC; break;     // SHOCK_RES
    case 6: intrinsic = MR_POISON; break;   // POISON_RES
    default: return; // can't give it
    }
    if (intrinsic)
        mon.mintrinsics = (mon.mintrinsics || 0) | intrinsic;
}

// C ref: mon.c:1763 mon_givit() — maybe give intrinsic from eating corpse
export function mon_givit(mon, ptr) {
    if (!mon || !ptr) return;
    if (mon.dead || (mon.mhp || 0) <= 0) return;

    // C ref: stalker invisibility special case
    if (ptr === mons[PM_STALKER]) {
        if (!mon.perminvis) {
            mon.perminvis = true;
            mon.minvis = true;
        }
        mon.stunned = true;
        return;
    }

    const prop = corpse_intrinsic(ptr);
    if (prop <= 0) return; // no intrinsic (0 = none, -1 = STR which monsters can't use)

    if (!should_givit(prop, ptr)) return;

    mon_give_prop(mon, prop);
}

// C ref: mon.c:1156 mcalcdistress() — per-turn distress for all monsters
// Note: In JS, most of m_calcdistress is already distributed:
//   - mon_regen: in monmove.js
//   - flee timeout: in allmain.js
//   - shapeshift: in allmain.js via runtimeDecideToShapeshift
// This function handles the remaining blind/frozen timeouts.
export function mcalcdistress(map, player) {
    if (!map || !Array.isArray(map.monsters)) return;
    for (const mon of map.monsters) {
        if (mon.dead) continue;
        m_calcdistress(mon, map, player);
    }
}

// C ref: mon.c:1162 m_calcdistress() — per-monster distress
function m_calcdistress(mon, map, player) {
    // Non-moving monsters need liquid check
    const mdat = mon.type || {};
    if ((mdat.speed || mdat.mmove || 0) === 0) {
        if (minliquid(mon, map, player)) return;
    }

    // Blind timeout
    if (mon.mblinded && typeof mon.mblinded === 'number') {
        mon.mblinded--;
        if (mon.mblinded <= 0) {
            mon.mblinded = 0;
            mon.mcansee = true;
        }
    }
    // Frozen timeout
    if (mon.mfrozen && typeof mon.mfrozen === 'number') {
        mon.mfrozen--;
        if (mon.mfrozen <= 0) {
            mon.mfrozen = 0;
            mon.mcanmove = true;
        }
    }
    // Flee timeout is handled in allmain.js
    // Shapeshift is handled in allmain.js
}


// ========================================================================
// movemon — C ref: mon.c movemon()
// ========================================================================
export function movemon(map, player, display, fov, game = null, { dochug, handleHiderPremove: hhp } = {}) {
    if (game) game._suppressMonsterHitMessagesThisTurn = false;
    if (map) map._heardDistantNoiseThisTurn = false;
    let somebodyCanMove = false;
    for (const mon of map.monsters) {
        if (mon.dead) continue;
        if (mon.movement >= NORMAL_SPEED) {
            pushRngLogEntry(`^movemon_turn[${mon.mndx}@${mon.mx},${mon.my} mv=${mon.movement}->${mon.movement - NORMAL_SPEED}]`);
            const oldx = mon.mx;
            const oldy = mon.my;
            const alreadySawMon = !!(game && game.occupation
                && ((fov?.canSee ? fov.canSee(oldx, oldy) : couldsee(map, player, oldx, oldy))));
            mon.movement -= NORMAL_SPEED;
            if (mon.movement >= NORMAL_SPEED) {
                somebodyCanMove = true;
            }
            monmoveTrace('turn-start',
                `step=${monmoveStepLabel(map)}`,
                `id=${mon.m_id ?? '?'}`,
                `mndx=${mon.mndx ?? '?'}`,
                `name=${mon.type?.name || mon.name || '?'}`,
                `pos=(${oldx},${oldy})`,
                `mv=${mon.movement + NORMAL_SPEED}->${mon.movement}`,
                `flee=${mon.flee ? 1 : 0}`,
                `peace=${mon.peaceful ? 1 : 0}`,
                `conf=${mon.confused ? 1 : 0}`);
            if ((hhp || handleHiderPremove)(mon, map, player, fov)) {
                continue;
            }
            // TODO: minliquid(mon) — drowning/sinking not yet ported
            // TODO: m_dowear(mon, FALSE) — monster armor equipping not yet ported
            // C ref: mon.c:1277-1284 — eel hiding
            if (mon.type?.symbol === S_EEL && !mon.mundetected
                && (mon.flee || distmin(mon.mx, mon.my, player.x, player.y) > 1)
                && !(fov?.canSee ? fov.canSee(mon.mx, mon.my) : couldsee(map, player, mon.mx, mon.my))
                && !rn2(4)) {
                // C ref: hideunder() — set mundetected if on water terrain
                if (IS_POOL(map.at(mon.mx, mon.my)?.typ)) {
                    mon.mundetected = true;
                    continue;
                }
            }
            // TODO: fightm() — Conflict not implemented
            dochug(mon, map, player, display, fov, game);
            if (game && game.occupation && !mon.dead) {
                const attacks = mon.type?.attacks || [];
                const noAttacks = !attacks.some((a) => a && a.type !== AT_NONE);
                const threatRangeSq = (BOLT_LIM + 1) * (BOLT_LIM + 1);
                const oldDist = dist2(oldx, oldy, player.x, player.y);
                const newDist = dist2(mon.mx, mon.my, player.x, player.y);
                const canSeeNow = fov?.canSee ? fov.canSee(mon.mx, mon.my)
                    : couldsee(map, player, mon.mx, mon.my);
                const couldSeeOld = fov?.canSee ? fov.canSee(oldx, oldy)
                    : couldsee(map, player, oldx, oldy);
                if (!mon.peaceful
                    && !noAttacks
                    && newDist <= threatRangeSq
                    && (!alreadySawMon || !couldSeeOld || oldDist > threatRangeSq)
                    && canSeeNow
                    && mon.mcanmove !== false
                    && !onscary(map, player.x, player.y)) {
                    game.display.putstr_message(`You stop ${game.occupation.occtxt}.`);
                    game.occupation = null;
                    game.multi = 0;
                }
            }
        }
    }

    map.monsters = map.monsters.filter(m => !m.dead);
    player.displacedPetThisTurn = false;
    return somebodyCanMove;
}
