// mthrowu.js -- Monster ranged attacks (throwing)
// C ref: mthrowu.c — thrwmu(), m_throw(), monshoot(), select_rwep(), lined_up()
// Also includes weapon wield helpers used before ranged/melee attacks.
//
// INCOMPLETE / MISSING vs C mthrowu.c:
// - m_throw: no ohitmon() full damage calculation (erosion, material bonuses)
// - m_throw: corpse creation uses corpse_chance + mkcorpstat (faithful to C mondied)
// - thrwmu: polearm attack path not implemented (C:1169)
// - monmulti: prince/lord/mplayer multishot bonuses not modeled
// - No spitmu (acid/venom spit) implementation
// - No breamu (breath weapon) implementation
// - No buzzmu (spell ray) implementation

import { ACCESSIBLE, IS_OBSTRUCTED, IS_DOOR,
         D_CLOSED, D_LOCKED, IRONBARS, SINK, isok, A_STR } from './config.js';
import { rn2, rnd } from './rng.js';
import { exercise } from './attrib_exercise.js';
import { newexplevel } from './exper.js';
import {
    BOULDER, WEAPON_CLASS, CORPSE, objectData, POTION_CLASS, VENOM_CLASS,
    BLINDING_VENOM, ACID_VENOM, ELVEN_ARROW, ELVEN_BOW, ORCISH_ARROW, ORCISH_BOW,
    CROSSBOW_BOLT, CROSSBOW, CREAM_PIE, EGG, WAN_STRIKING,
    PARTISAN, RANSEUR, SPETUM, GLAIVE, HALBERD, BARDICHE, VOULGE,
    FAUCHARD, GUISARME, BILL_GUISARME,
} from './objects.js';
import { doname, mkcorpstat, mksobj } from './mkobj.js';
import { couldsee, m_cansee } from './vision.js';
import { monDisplayName, is_prince, is_lord, is_mplayer, is_elf, is_orc, is_gnome, throws_rocks } from './mondata.js';
import { mons, AT_WEAP, G_NOCORPSE, AD_ACID, AD_BLND, AD_DRST } from './monsters.js';
import { distmin, dist2, mondead, BOLT_LIM } from './monutil.js';
import { placeFloorObject } from './floor_objects.js';
import { corpse_chance } from './mon.js';
import { select_rwep as weapon_select_rwep,
    mon_wield_item, NEED_WEAPON, NEED_HTH_WEAPON, NEED_RANGED_WEAPON } from './weapon.js';
import { ammo_and_launcher, multishot_class_bonus } from './dothrow.js';

const hallublasts = [
    'bubbles', 'butterflies', 'dust specks', 'flowers', 'glitter',
    'hot air', 'lightning', 'music', 'rainbows', 'stars',
];

/* Return a random hallucinatory blast.
 * C ref: mthrowu.c rnd_hallublast().
 */
export function rnd_hallublast() {
    return hallublasts[rn2(hallublasts.length)];
}

// C ref: mthrowu.c blocking_terrain().
export function blocking_terrain(map, x, y) {
    if (!isok(x, y)) return true;
    const loc = map.at(x, y);
    if (!loc) return true;
    if (IS_OBSTRUCTED(loc.typ)) return true;
    if (IS_DOOR(loc.typ) && (loc.flags & (D_CLOSED | D_LOCKED))) return true;
    return false;
}

// check if a monster is carrying an item of a particular type.
// C ref: mthrowu.c m_carrying().
export function m_carrying(mon, type) {
    if (!mon || !Array.isArray(mon.minvent)) return null;
    return mon.minvent.find((obj) => obj && obj.otyp === type) || null;
}

// C ref: mthrowu.c m_has_launcher_and_ammo().
export function m_has_launcher_and_ammo(mon) {
    if (!mon || !mon.weapon || !Array.isArray(mon.minvent)) return false;
    const launcher = mon.weapon;
    for (const obj of mon.minvent) {
        if (obj && ammo_and_launcher(obj, launcher)) return true;
    }
    return false;
}

// C ref: mthrowu.c linedup().
export function linedup(ax, ay, bx, by, boulderhandling = 0, map, player, fov = null) {
    const tbx = ax - bx;
    const tby = ay - by;
    if (!tbx && !tby) return false;

    if (!(!tbx || !tby || Math.abs(tbx) === Math.abs(tby))) return false;
    if (distmin(tbx, tby, 0, 0) >= BOLT_LIM) return false;

    // C ref: if target is hero square, use couldsee(mon_pos), otherwise clear_path().
    const inSight = (ax === player.x && ay === player.y)
        // C ref: linedup() uses couldsee(bx, by) for hero target.
        // Use current FOV COULD_SEE bitmap when available.
        ? ((fov && typeof fov.couldSee === 'function')
            ? fov.couldSee(bx, by)
            : couldsee(map, player, bx, by))
        // C ref: linedup() uses clear_path(ax, ay, bx, by) for non-hero target.
        : m_cansee({ mx: ax, my: ay }, map, bx, by);
    if (inSight) return true;
    if (boulderhandling === 0) return false;

    const dx = Math.sign(ax - bx);
    const dy = Math.sign(ay - by);
    let cx = bx;
    let cy = by;
    let boulderspots = 0;
    do {
        cx += dx;
        cy += dy;
        if (blocking_terrain(map, cx, cy)) return false;
        const objs = map.objectsAt?.(cx, cy) || [];
        if (objs.some((o) => o && !o.buried && o.otyp === BOULDER)) boulderspots++;
    } while (cx !== ax || cy !== ay);
    if (boulderhandling === 1) return true;
    const denom = 2 + boulderspots;
    return rn2(denom) < 2;
}

// C ref: mthrowu.c linedup_callback().
export function linedup_callback(ax, ay, bx, by, fnc, map) {
    const tbx = ax - bx;
    const tby = ay - by;
    if (!tbx && !tby) return false;
    if (!(!tbx || !tby || Math.abs(tbx) === Math.abs(tby))) return false;
    if (distmin(tbx, tby, 0, 0) >= BOLT_LIM) return false;
    const dx = Math.sign(ax - bx);
    const dy = Math.sign(ay - by);
    let cx = bx;
    let cy = by;
    do {
        cx += dx;
        cy += dy;
        if (blocking_terrain(map, cx, cy)) return false;
        if (fnc?.(cx, cy)) return true;
    } while (cx !== ax || cy !== ay);
    return false;
}

// C ref: mthrowu.c m_lined_up().
export function m_lined_up(mtarg, mtmp, map, player, fov = null) {
    const utarget = !!(mtarg && player && mtarg === player);
    const tx = utarget ? (Number.isInteger(mtmp?.mux) ? mtmp.mux : player.x) : mtarg?.mx;
    const ty = utarget ? (Number.isInteger(mtmp?.muy) ? mtmp.muy : player.y) : mtarg?.my;
    if (!Number.isInteger(tx) || !Number.isInteger(ty)) return 0;
    const ignoreBoulders = utarget && !!(m_carrying(mtmp, WAN_STRIKING)
        || throws_rocks(mtmp?.type || {}));
    return linedup(tx, ty, mtmp.mx, mtmp.my, utarget ? (ignoreBoulders ? 1 : 2) : 0, map, player, fov) ? 1 : 0;
}

// C ref: mthrowu.c lined_up().
export function lined_up(mtmp, map, player, fov = null) {
    return m_lined_up(player, mtmp, map, player, fov) !== 0;
}

// Backward-compatible helper name used by existing JS modules.
export function linedUpToPlayer(mon, map, player, fov = null) {
    return lined_up(mon, map, player, fov);
}

// C ref: weapon.c select_rwep() — full implementation in weapon.js
// Returns { weapon, propellor } or null. Extract .weapon for the missile.
function select_rwep(mon) {
    const result = weapon_select_rwep(mon);
    return result ? result.weapon : null;
}

const POLEARM_TYPES = new Set([
    PARTISAN, RANSEUR, SPETUM, GLAIVE, HALBERD,
    BARDICHE, VOULGE, FAUCHARD, GUISARME, BILL_GUISARME,
]);

function is_polearm(obj) {
    return !!(obj && POLEARM_TYPES.has(obj.otyp));
}

// C ref: mthrowu.c m_useupall().
export function m_useupall(mon, obj) {
    if (!mon || !obj) return;
    const inv = mon.minvent || [];
    const idx = inv.indexOf(obj);
    if (idx >= 0) inv.splice(idx, 1);
    if (mon.weapon === obj) mon.weapon = null;
}

// C ref: mthrowu.c m_useup().
export function m_useup(mon, obj) {
    if (!mon || !obj) return;
    const qty = Number.isInteger(obj.quan) ? obj.quan : 1;
    if (qty > 1) {
        obj.quan = qty - 1;
        return;
    }
    m_useupall(mon, obj);
}

// C ref: mthrowu.c monmulti() — compute multishot count.
// Consumes rnd(multishot) when multishot > 0 and quan > 1.
function monmulti(mon, otmp) {
    let multishot = 1;
    const quan = Number.isInteger(otmp?.quan) ? otmp.quan : 1;
    const mwep = mon?.weapon || null;
    const od = objectData[otmp.otyp];
    const launcherOk = ammo_and_launcher(otmp, mwep);
    const stackableWeapon = od && od.oc_class === WEAPON_CLASS;
    if (quan > 1 && (launcherOk || stackableWeapon) && !mon.mconf) {
        const ptr = mon?.type || {};
        if (is_prince(ptr)) multishot += 2;
        else if (is_lord(ptr) || is_mplayer(ptr)) multishot += 1;
        if (otmp.otyp === ELVEN_ARROW && !otmp.cursed) multishot += 1;
        if (mwep && mwep.otyp === ELVEN_BOW && otmp.otyp === ELVEN_ARROW && !mwep.cursed) multishot += 1;
        if (mwep && ammo_and_launcher(otmp, mwep) && (mwep.spe || 0) > 1) multishot += Math.floor(((mwep.spe || 0) + 1) / 3);
        multishot += multishot_class_bonus(mon?.mndx ?? -1, otmp, mwep);
        if ((is_elf(ptr) && otmp.otyp === ELVEN_ARROW && mwep?.otyp === ELVEN_BOW)
            || (is_orc(ptr) && otmp.otyp === ORCISH_ARROW && mwep?.otyp === ORCISH_BOW)
            || (is_gnome(ptr) && otmp.otyp === CROSSBOW_BOLT && mwep?.otyp === CROSSBOW)) {
            multishot += 1;
        }
        multishot = rnd(multishot);
    }
    if (multishot > quan) multishot = quan;
    if (multishot < 1) multishot = 1;
    return multishot;
}

function thrownObjectName(obj, player) {
    if (!obj) return 'a weapon';
    const oneShot = { ...obj, quan: 1, dknown: true };
    return doname(oneShot, player);
}

// hero is hit by a thrown object.
// C ref: mthrowu.c thitu().
export function thitu(tlev, dam, objp, name, player, display, game, mon = null) {
    const obj = objp || null;
    const dieRoll = rnd(20);
    if ((player.ac || 10) + tlev <= dieRoll) {
        if (display) {
            const verbose = game?.flags?.verbose !== false;
            if (player.blind || !verbose) {
                display.putstr_message('It misses.');
            } else if ((player.ac || 10) + tlev <= dieRoll - 2) {
                const objName = name || thrownObjectName(obj, player);
                const cap = objName.charAt(0).toUpperCase() + objName.slice(1);
                display.putstr_message(`${cap} misses you.`);
            } else {
                display.putstr_message(`You are almost hit by ${name || thrownObjectName(obj, player)}.`);
            }
        }
        return 0;
    }

    if (display) {
        const text = name || thrownObjectName(obj, player);
        display.putstr_message(`You are hit by ${text}!`);
    }
    if (player.takeDamage) player.takeDamage(dam, mon ? monDisplayName(mon) : 'an object');
    else player.hp -= dam;
    exercise(player, A_STR, false);
    return 1;
}

// C ref: mthrowu.c drop_throw().
export function drop_throw(obj, ohit, x, y, map) {
    if (!obj || !map) return true;
    const broken = obj.otyp === CREAM_PIE || obj.oclass === VENOM_CLASS
        || (ohit && obj.otyp === EGG);
    if (broken) return true;
    if (!isok(x, y)) return true;
    const spot = map.at(x, y);
    if (!spot || !ACCESSIBLE(spot.typ)) return true;
    obj.ox = x;
    obj.oy = y;
    placeFloorObject(map, obj);
    return false;
}

// C ref: mthrowu.c hit_bars().
export function hit_bars(objp, objx, objy, barsx, barsy, breakflags = 0, map) {
    const obj = objp || null;
    if (!obj) return;
    // Minimal parity behavior: breaking potions/venom when impacting bars.
    if (obj.oclass === POTION_CLASS || obj.oclass === VENOM_CLASS || obj.otyp === CREAM_PIE) {
        return;
    }
    if (map && isok(objx, objy)) {
        obj.ox = objx;
        obj.oy = objy;
        placeFloorObject(map, obj);
    }
}

// C ref: mthrowu.c hits_bars().
export function hits_bars(objp, x, y, barsx, barsy, always_hit = 0, whodidit = -1, map = null) {
    const obj = objp || null;
    if (!obj) return true;
    let hits = !!always_hit;
    if (!hits) {
        // Keep this conservative: large/heavy/rigid classes hit bars.
        hits = obj.oclass === WEAPON_CLASS
            || obj.oclass === POTION_CLASS
            || obj.otyp === BOULDER;
    }
    if (hits && whodidit !== -1) {
        hit_bars(obj, x, y, barsx, barsy, 0, map);
    }
    return hits;
}

// C ref: mthrowu.c ohitmon().
export function ohitmon(mtmp, otmp, range, verbose, map, player, display, game) {
    if (!mtmp || !otmp) return 1;
    const od = objectData[otmp.otyp] || {};
    const hitThreshold = 5 + (mtmp.mac ?? 10);
    const dieRoll = rnd(20);
    if (hitThreshold >= dieRoll) {
        let damage = (od.sdam || 0) > 0 ? rnd(od.sdam || 0) : 0;
        damage += (otmp.spe || 0);
        if (damage < 1) damage = 1;
        mtmp.mhp -= damage;
        if (mtmp.mhp <= 0) {
            mondead(mtmp, map);
            map.removeMonster?.(mtmp);
            if (player) {
                const exp = ((mtmp.mlevel || 0) + 1) * ((mtmp.mlevel || 0) + 1);
                player.exp = (player.exp || 0) + exp;
                player.score = (player.score || 0) + exp;
                newexplevel(player, display);
            }
            const mdat2 = mons[mtmp.mndx || 0] || {};
            if (corpse_chance(mtmp) && !(((mdat2.geno || 0) & G_NOCORPSE) !== 0)) {
                const corpse = mkcorpstat(CORPSE, mtmp.mndx || 0, true, mtmp.mx, mtmp.my, map);
                if (corpse) corpse.age = (player?.turns || 0) + 1;
            }
        }
        drop_throw(otmp, true, mtmp.mx, mtmp.my, map);
        return 1;
    }
    if (range <= 0) {
        drop_throw(otmp, false, mtmp.mx, mtmp.my, map);
        return 1;
    }
    return 0;
}

// C ref: mthrowu.c monshoot() — common multishot throw/shoot logic.
export function monshoot(mon, otmp, mwep, map, player, display, game, mtarg = null) {
    if (!mon || !otmp) return false;
    const tx = mtarg ? mtarg.mx : (Number.isInteger(mon.mux) ? mon.mux : player.x);
    const ty = mtarg ? mtarg.my : (Number.isInteger(mon.muy) ? mon.muy : player.y);
    const dm = distmin(mon.mx, mon.my, tx, ty);
    const multishot = monmulti(mon, otmp);
    const available = Number.isInteger(otmp.quan) ? otmp.quan : 1;
    const shots = Math.max(1, Math.min(multishot, available));

    if (display) {
        const targetName = mtarg ? ` at the ${monDisplayName(mtarg)}` : '';
        display.putstr_message(`The ${monDisplayName(mon)} throws ${thrownObjectName(otmp, player)}${targetName}!`);
    }

    const ddx = Math.sign(tx - mon.mx);
    const ddy = Math.sign(ty - mon.my);
    for (let i = 0; i < shots; i++) {
        const projectile = { ...otmp, quan: 1, ox: mon.mx, oy: mon.my, invlet: null };
        m_useup(mon, otmp);
        const result = m_throw(mon, mon.mx, mon.my, ddx, ddy, dm, projectile, map, player, display, game);
        if (result?.drop && isok(result.x, result.y)) {
            const spot = map.at(result.x, result.y);
            if (spot && ACCESSIBLE(spot.typ)) {
                projectile.ox = result.x;
                projectile.oy = result.y;
                placeFloorObject(map, projectile);
            }
        }
        if (mon.dead) break;
    }
    return true;
}

// C ref: mthrowu.c return_from_mtoss().
export function return_from_mtoss(magr, otmp, tethered_weapon, map) {
    if (!magr || !otmp || !map) return;
    // Simplified: place returning weapon at thrower location.
    if (isok(magr.mx, magr.my)) {
        otmp.ox = magr.mx;
        otmp.oy = magr.my;
        placeFloorObject(map, otmp);
    }
}

// C ref: mthrowu.c m_throw() — simulate projectile flight.
// Consumes rn2(5) at each step, plus hit/damage rolls on collision.
export function m_throw(mon, startX, startY, dx, dy, range, weapon, map, player, display, game) {
    let x = startX;
    let y = startY;
    let dropX = startX;
    let dropY = startY;

    // C ref: mthrowu.c:601 — misfire check for cursed/greased weapons
    if ((weapon.cursed || weapon.greased) && (dx || dy) && !rn2(7)) {
        dx = rn2(3) - 1;
        dy = rn2(3) - 1;
        if (!dx && !dy) {
            return { drop: true, x: startX, y: startY }; // missile drops at thrower's feet
        }
    }

    const od = objectData[weapon.otyp];

    // C ref: mthrowu.c:531-548 MT_FLIGHTCHECK — check if a cell blocks missile flight
    function flightBlocked(bx, by, pre, forcehit) {
        const nx = bx + dx, ny = by + dy;
        if (!isok(nx, ny)) return true;
        const nloc = map.at(nx, ny);
        if (!nloc) return true;
        if (IS_OBSTRUCTED(nloc.typ)) return true;
        if (IS_DOOR(nloc.typ) && (nloc.flags & (D_CLOSED | D_LOCKED))) return true;
        if (nloc.typ === IRONBARS && forcehit) return true;
        // Current-cell sink check (only in non-pre check)
        if (!pre) {
            const cloc = map.at(bx, by);
            if (cloc && cloc.typ === SINK) return true;
        }
        return false;
    }

    // C ref: mthrowu.c:618 — pre-flight check: if first cell is blocked, drop immediately
    if (flightBlocked(startX, startY, true, 0)) {
        return { drop: true, x: startX, y: startY };
    }

    // C ref: mthrowu.c:652 — main flight loop
    while (range-- > 0) {
        x += dx;
        y += dy;
        if (!isok(x, y)) break;
        const loc = map.at(x, y);
        if (!loc) break;
        if (ACCESSIBLE(loc.typ)) {
            dropX = x;
            dropY = y;
        }

        // Check for monster at this position
        const mtmp = map.monsterAt(x, y);
        if (mtmp && !mtmp.dead) {
            if (ohitmon(mtmp, weapon, range, true, map, player, display, game)) {
                break;
            }
        }

        // Check for player at this position
        if (x === player.x && y === player.y) {
            const sdam = od ? (od.sdam || 0) : 0;
            let dam = sdam > 0 ? rnd(sdam) : 0;
            dam += (weapon.spe || 0);
            if (dam < 1) dam = 1;
            const hitv = 3 - distmin(player.x, player.y, mon.mx, mon.my) + 8 + (weapon.spe || 0);
            if (game && game.occupation) {
                if (typeof game.stopOccupation === 'function') game.stopOccupation();
                else {
                    game.occupation = null;
                    game.multi = 0;
                }
            }
            if (thitu(hitv, dam, weapon, null, player, display, game, mon)) {
                break;
            }
        }

        // C ref: mthrowu.c:772-773 — forcehit + MT_FLIGHTCHECK(FALSE, forcehit)
        const forcehit = !rn2(5);
        if (!range || flightBlocked(x, y, false, forcehit)) break;
    }
    return { drop: true, x: dropX, y: dropY };
}

// C ref: mthrowu.c thrwmu() — monster throws at player.
// Returns true if the monster acted (threw something).
export function thrwmu(mon, map, player, display, game) {
    // C ref: mthrowu.c:1157-1159 — wield ranged weapon before selecting
    if (mon.weapon_check === NEED_WEAPON || !mon.weapon) {
        mon.weapon_check = NEED_RANGED_WEAPON;
        if (mon_wield_item(mon) !== 0)
            return true; // wielding consumed the turn
    }
    const otmp = select_rwep(mon);
    if (!otmp) return false;

    const targetX = Number.isInteger(mon.mux) ? mon.mux : player.x;
    const targetY = Number.isInteger(mon.muy) ? mon.muy : player.y;
    if (is_polearm(otmp) && otmp === mon.weapon) {
        const range2 = dist2(mon.mx, mon.my, targetX, targetY);
        if (range2 <= 5 && couldsee(map, player, mon.mx, mon.my)) {
            if (display) {
                display.putstr_message(`The ${monDisplayName(mon)} thrusts ${thrownObjectName(otmp, player)}.`);
            }
            const od = objectData[otmp.otyp] || {};
            let dam = (od.sdam || 0) > 0 ? rnd(od.sdam || 0) : 1;
            dam += (otmp.spe || 0);
            if (dam < 1) dam = 1;
            let hitv = 3 - distmin(player.x, player.y, mon.mx, mon.my);
            if (hitv < -4) hitv = -4;
            hitv += 8 + (otmp.spe || 0);
            thitu(hitv, dam, otmp, null, player, display, game, mon);
            if (game && game.occupation) {
                if (typeof game.stopOccupation === 'function') game.stopOccupation();
                else {
                    game.occupation = null;
                    game.multi = 0;
                }
            }
            return true;
        }
        return false;
    }

    if (!lined_up(mon, map, player)) return false;
    const ux0 = Number.isInteger(game?.ux0) ? game.ux0 : player.x;
    const uy0 = Number.isInteger(game?.uy0) ? game.uy0 : player.y;
    const retreating = distmin(player.x, player.y, mon.mx, mon.my)
        > distmin(ux0, uy0, mon.mx, mon.my);
    const retreatRange = BOLT_LIM - distmin(mon.mx, mon.my, targetX, targetY);
    if (retreating && retreatRange > 0 && rn2(retreatRange)) return false;

    mon.mux = targetX;
    mon.muy = targetY;
    return monshoot(mon, otmp, mon.weapon, map, player, display, game, null);
}

// Monster throws item at another monster.
// C ref: mthrowu.c thrwmm().
export function thrwmm(mtmp, mtarg, map, player, display, game) {
    if (!mtmp || !mtarg) return 0;
    if (mtmp.weapon_check === NEED_WEAPON || !mtmp.weapon) {
        mtmp.weapon_check = NEED_RANGED_WEAPON;
        if (mon_wield_item(mtmp) !== 0) return 0;
    }
    const otmp = select_rwep(mtmp);
    if (!otmp) return 0;
    if (!m_lined_up(mtarg, mtmp, map, player)) return 0;
    return monshoot(mtmp, otmp, mtmp.weapon, map, player, display, game, mtarg) ? 1 : 0;
}

// monster spits substance at monster.
// C ref: mthrowu.c spitmm().
export function spitmm(mtmp, mattk, mtarg, map, player, display, game) {
    if (!mtmp || !mattk || !mtarg) return 0;
    if (!m_lined_up(mtarg, mtmp, map, player)) return 0;
    const adtyp = mattk.adtyp;
    const venomType = (adtyp === AD_BLND || adtyp === AD_DRST) ? BLINDING_VENOM : ACID_VENOM;
    const otmp = mksobj(venomType, true, false);
    if (!otmp) return 0;
    otmp.quan = 1;
    if (display) {
        display.putstr_message(`The ${monDisplayName(mtmp)} spits venom!`);
    }
    return monshoot(mtmp, otmp, null, map, player, display, game, mtarg) ? 1 : 0;
}

// monster spits substance at hero.
// C ref: mthrowu.c spitmu().
export function spitmu(mtmp, mattk, map, player, display, game) {
    return spitmm(mtmp, mattk, player, map, player, display, game);
}

// hero catches gem thrown by mon iff unicorn.
// C ref: mthrowu.c ucatchgem().
export function ucatchgem(gem, mon, player) {
    if (!gem || !player) return false;
    // Full unicorn-form catch/drop behavior needs polymorph subsystem parity.
    return false;
}

// Return the name of a breath weapon.
// C ref: mthrowu.c breathwep_name().
export function breathwep_name(typ, hallucinating = false) {
    if (hallucinating) return rnd_hallublast();
    if (typ === AD_ACID) return 'acid';
    return 'strange breath';
}

// monster breathes at monster (ranged) -- placeholder fidelity surface.
// C ref: mthrowu.c breamm().
export function breamm(mtmp, mattk, mtarg, map, player, display, game) {
    if (!m_lined_up(mtarg, mtmp, map, player)) return 0;
    return 1;
}

// monster breathes at hero.
// C ref: mthrowu.c breamu().
export function breamu(mtmp, mattk, map, player, display, game) {
    return breamm(mtmp, mattk, player, map, player, display, game);
}

// Check if a monster has any AT_WEAP attacks (can throw weapons).
export function hasWeaponAttack(mon) {
    const attacks = mon.attacks || (mon.type && mon.type.attacks) || [];
    return attacks.some(a => a && a.type === AT_WEAP);
}

// C ref: monmove.c:853-860 — dochug weapon wielding gate
// Called from monmove.js before melee attacks. Uses mon_wield_item for
// proper weapon AI (select_hwep priority list) instead of first-item scan.
export function maybeMonsterWieldBeforeAttack(mon, player, display, fov, nearby = true) {
    if (!hasWeaponAttack(mon)) return false;
    // Keep legacy behavior for monsters that start unarmed in JS fixtures.
    // C equivalent checks weapon_check state; JS tests also rely on
    // !MON_WEP-style entry here.
    if (mon.weapon_check !== NEED_WEAPON && mon.weapon) return false;
    // C ref: monmove.c wield gate — trapped monsters with a ranged option
    // should keep that option rather than spend a turn switching to HTH.
    if (mon.mtrapped && !nearby && select_rwep(mon)) return false;
    const oldWeapon = mon.weapon;
    mon.weapon_check = NEED_HTH_WEAPON;
    if (mon_wield_item(mon) !== 0) {
        // Wielding took monster's turn — show message if visible
        if (mon.weapon && mon.weapon !== oldWeapon) {
            const visible = !fov?.canSee || (fov.canSee(mon.mx, mon.my)
                && !player?.blind && !mon.minvis);
            if (display && visible) {
                display.putstr_message(`The ${monDisplayName(mon)} wields ${thrownObjectName(mon.weapon, player)}!`);
            }
        }
        return true;
    }
    return false;
}
