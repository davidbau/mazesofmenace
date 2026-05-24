// kick.js — Hero #kick (dokick.c) + shop door billing (shk.c add_damage / pay_for_damage).
// C ref: dokick.c dokick(), maybe_kick_monster(), kick_monster(), kickdmg(),
//        kick_object()/really_kick_object() subset, kick_door(), kick_dumb(),
//        kick_ouch(), kick_nondoor() tail;
//        uhitm.c attack_checks() subset (kick: wep null); hack.c overexertion();
//        mon.c wake_nearby()/wake_nearto(); trap.c b_trapped() + potion.c make_stunned(); engrave.c u_wipe_engr().

import { nhgetch } from './input.js';
import { pline, newsym } from './display.js';
import { vision_recalc, cansee } from './vision.js';
import { dist2, depth } from './hacklib.js';
import { acurr, exercise } from './attrib.js';
import { rnd, rn2, rnl } from './rng.js';
import { uWipeEngr } from './engrave.js';
import {
    floorObjKey,
    unlinkFloorObjectInLevel,
    placeFloorObjectInLevel,
    stackObjOnFloorInLevel,
} from './floorobj.js';
import { losehp, maybeHalfPhys } from './mthrowu.js';
import { heroPassesWalls, isClosedDoorLoc } from './walkable.js';
import {
    permonstHuman,
    slithy,
    verysmall,
    monsterLeavesCorpse,
    isFlyer,
    stagger,
} from './mondata.js';
import { placeCorpseForMonster } from './mkobj_corpse.js';
import { overexertion, overexertHpIfEncumberedPlines } from './eat_hunger.js';
import { useSkill } from './u_init_skills.js';
import {
    IS_DOOR,
    D_ISOPEN,
    D_BROKEN,
    D_NODOOR,
    D_TRAPPED,
    isok,
    IS_POOL,
    IS_LAVA,
    IS_WATERWALL,
    LAVAWALL,
    IRONBARS,
    SINK,
    OTYP_BOULDER,
    LA_DOWN,
    Is_airlevel,
    Is_waterlevel,
    ZAP_POS,
    is_pit,
    STATUE_TRAP,
    RIGHT_SIDE,
    IS_STWALL,
    STAIRS,
    LADDER,
    TT_PIT,
    TT_WEB,
    TT_BEARTRAP,
    SHOP_DOOR_COST,
    PM_LIZARD,
    A_STR,
    A_DEX,
    A_CON,
    P_MARTIAL_ARTS,
    KILLED_BY_AN,
} from './const.js';
import { nearCapacity, ENC } from './encumbr.js';
import { inRoomsShopbaseRoomnos, addDamageAt, payForDamage, adisturb } from './shop.js';
import { heroBreaksObjLikeC } from './obj_break_dothrow.js';

/** C: monflag.h `M1_THICK_HIDE` — **`mondata.h`** **`thick_skinned`**. */
const M1_THICK_HIDE = 0x00200000;

/** C: skills.h martial_bonus() — Samurai / Monk only (not boots / sasquatch here). */
function martialBonusRole(g) {
    const a = g.urole?.abbr;
    return a === 'Sam' || a === 'Mon';
}

/** C: dokick.c martial() macro — boots / bigfoot TODO; role martial_bonus matches kick door odds. */
function martialLike(g) {
    return martialBonusRole(g);
}

function heroYoumonstPtr(g) {
    const u = g.u;
    if (!(u?.Upolyd | 0)) return g.urace?.permonst ?? permonstHuman;
    return g.youmonst?.data ?? permonstHuman;
}

function heroNoLegsKick(g) {
    const ptr = heroYoumonstPtr(g);
    const m1 = ptr?.mflags1 | 0;
    /* C: mondata.h M1_NOLIMBS 0x00000400 — monflag.h */
    return (m1 & 0x400) !== 0 || slithy(ptr);
}

function heroBlindLike(g) {
    const u = g.u;
    return !!(u?.ublind || (u?.timed?.blind ?? 0) > 0);
}

function heroDeafLike(g) {
    return ((g.u?.timed?.deaf ?? 0) > 0);
}

function monnamCap(mtmp) {
    const s = mtmp?.monnam || mtmp?.data?.mname || 'monster';
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/** C: mon.c wake_nearby(FALSE) → wake_nearto_core(u.ux,u.uy, u.ulevel*20, FALSE). */
async function wakeNearbyFalseAtHero(g) {
    const u = g.u;
    if (!u) return;
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    const lim = (u.ulevel | 0) * 20;
    const monsters = g.level?.monsters ?? [];
    for (let i = 0; i < monsters.length; i++) {
        const mtmp = monsters[i];
        if (!mtmp || (mtmp.mhp | 0) <= 0) continue;
        if (lim !== 0 && dist2(mtmp.mx | 0, mtmp.my | 0, ux, uy) >= lim) continue;
        if ((mtmp.msleeping | 0) && cansee(mtmp.mx | 0, mtmp.my | 0)) {
            await pline(`${monnamCap(mtmp)} wakes up.`);
        }
        mtmp.msleeping = 0;
    }
}

/** C: mon.c wake_nearto(x,y,5*5) — kick_ouch subset. */
async function wakeNearto5(g, x, y) {
    const monsters = g.level?.monsters ?? [];
    for (let i = 0; i < monsters.length; i++) {
        const mtmp = monsters[i];
        if (!mtmp || (mtmp.mhp | 0) <= 0) continue;
        if (dist2(mtmp.mx | 0, mtmp.my | 0, x | 0, y | 0) >= 25) continue;
        if ((mtmp.msleeping | 0) && cansee(mtmp.mx | 0, mtmp.my | 0)) {
            await pline(`${monnamCap(mtmp)} wakes up.`);
        }
        mtmp.msleeping = 0;
    }
}

const VI_DIRS = Object.freeze({
    h: [-1, 0], l: [1, 0], j: [0, 1], k: [0, -1], y: [-1, -1], u: [1, -1], b: [-1, 1], n: [1, 1],
});

/**
 * C: cmd.c getdir — one keystroke from replay queue (no yn window).
 * @returns {{ dx: number, dy: number }|null} null = cancel / invalid
 */
async function readKickDirectionDelta() {
    const code = await nhgetch();
    if (code === 27) return null;
    const ch = typeof code === 'number' ? String.fromCharCode(code) : String(code);
    const pair = VI_DIRS[ch];
    if (!pair) {
        if (ch === '.') return { dx: 0, dy: 0 };
        return null;
    }
    return { dx: pair[0], dy: pair[1] };
}

/** C: monattk.h **`AT_KICK`** */
const AT_KICK = 3;

function polyFormHasKickAttack(g) {
    const atk = g.youmonst?.data?.mattk;
    if (!atk?.length) return false;
    for (let i = 0; i < atk.length; i++) {
        if ((atk[i].aatyp | 0) === AT_KICK) return true;
    }
    return false;
}

function monNamKick(mtmp) {
    return mtmp?.monnam || mtmp?.data?.mname || 'monster';
}

/** C: mondata.h **`canspotmon`** subset — steed / invis / **`cansee`**. */
function canseemonKick(g, mtmp) {
    const u = g.u;
    if (!mtmp || !u) return false;
    if (u.usteed === mtmp) return true;
    if ((mtmp.minvis | 0) && !(u.See_invisible | 0)) return false;
    return cansee(mtmp.mx | 0, mtmp.my | 0);
}

/**
 * C: uhitm.c **`attack_checks(mtmp, NULL)`** — subset for **`dokick.c`** (**`wep`** null).
 * @returns {Promise<boolean>} true = abort kick (peaceful confirm: **`svc.context.move = 0`**).
 */
async function attackChecksKickMonsterLikeC(g, mtmp) {
    const u = g.u;
    if (!u || !mtmp) return false;
    if (u.uswallow && u.ustuck === mtmp) return false;
    if (g.context.forcefight | 0) return false;
    if (g.flags?.confirm !== false && (mtmp.mpeaceful | 0) && canseemonKick(g, mtmp)
        && !(u.Confusion | 0) && !(u.Hallucination | 0) && !(u.HStun | 0)) {
        g.context.move = 0;
        return true;
    }
    return false;
}

/**
 * C: dokick.c **`maybe_kick_monster`** — **`gb.bhitpos`**, **`forcefight`**, **`attack_checks`**, **`overexertion`**.
 * @returns {Promise<boolean>} true if **`kick_monster`** should run (**`mon != 0`** in C).
 */
async function maybeKickMonsterLikeC(g, mtmp, x, y) {
    if (!mtmp) return true;
    const saveFf = g.context.forcefight | 0;
    g.context.bhitpos = { x, y };
    if (!(mtmp.mpeaceful | 0) || !canseemonKick(g, mtmp)) g.context.forcefight = 1;
    let abort = await attackChecksKickMonsterLikeC(g, mtmp);
    if (!abort) {
        const ox = overexertion();
        for (let i = 0; i < ox.plines.length; i++) await pline(ox.plines[i]);
        if (ox.multiNegative) abort = true;
    }
    g.context.forcefight = saveFf;
    return !abort;
}

/** C: mon.c **`setmangry`** tail for shop/priest/guard (**`zap_over_floor.js`** **`wakeupMonFromZap`**). */
async function setMangryFromKickLikeC(g, mtmp) {
    const wasPeaceful = mtmp.mpeaceful | 0;
    mtmp.msleeping = 0;
    if (wasPeaceful) {
        mtmp.mpeaceful = 0;
        if (canseemonKick(g, mtmp) && ((mtmp.isshk | 0) || (mtmp.ispriest | 0) || (mtmp.isgd | 0))) {
            await pline(`${monnamCap(mtmp)} gets angry!`);
        }
    }
}

/**
 * C: dokick.c **`kickdmg()`** — non-**`special_dmgval`** / **`passive`** / **`killed`** (corpse **`mondead`** subset).
 * @returns {Promise<number>} damage dealt (0 if shade / no hit)
 */
async function kickdmgNonPolyLikeC(g, mtmp, clumsy) {
    const ptr = mtmp.data ?? permonstHuman;
    let dmg = Math.trunc((acurr(A_STR) + acurr(A_DEX) + acurr(A_CON)) / 15);
    if (clumsy) dmg = Math.trunc(dmg / 2);
    if ((ptr.mflags1 | 0) & M1_THICK_HIDE) dmg = 0;
    const isShade = ptr.mname === 'shade';
    const specialdmg = 0;
    if (isShade && !specialdmg) {
        await pline(`Your kick passes harmlessly through ${monNamKick(mtmp)}.`);
        return 0;
    }
    /** @type {number|null} */
    let kickSkill = null;
    if (dmg > 0) {
        dmg = rnd(dmg);
        if (martialLike(g)) {
            if (dmg > 1) kickSkill = P_MARTIAL_ARTS;
            dmg += rn2(Math.trunc(acurr(A_DEX) / 2) + 1);
        }
        exercise(A_DEX, true);
    }
    if (dmg > 0) mtmp.mhp = (mtmp.mhp | 0) - dmg;
    await adisturb(mtmp);
    if ((mtmp.mhp | 0) <= 0) {
        const mx = mtmp.mx | 0;
        const my = mtmp.my | 0;
        if (g.level && isok(mx, my) && monsterLeavesCorpse(mtmp, g, 0)) placeCorpseForMonster(mtmp, mx, my);
        const arr = g.level?.monsters;
        if (arr) {
            const ix = arr.indexOf(mtmp);
            if (ix >= 0) arr.splice(ix, 1);
        }
        await pline('You kill it!');
    }
    if (kickSkill != null && (mtmp.mhp | 0) > 0) useSkill(g.u, kickSkill, 1, g);
    for (const line of overexertHpIfEncumberedPlines()) await pline(line);
    return dmg;
}

/**
 * C: dokick.c **`kick_monster()`** — poly **`AT_KICK`** / mimic / block-kick / **`hurtle`** deferred.
 * @param {import('./gstate.js').game} g
 */
async function kickMonsterNonPolyLikeC(g, mtmp, _x, _y) {
    void _x;
    void _y;
    if ((g.u.Upolyd | 0) && polyFormHasKickAttack(g)) {
        await pline('You kick at something.'); /* C: **`find_roll_to_hit`** / **`damageum`** loop — TODO */
        return;
    }
    await setMangryFromKickLikeC(g, mtmp);
    const mdptr = mtmp.data ?? permonstHuman;
    if ((g.u.Levitation | 0) && !rn2(3) && verysmall(mdptr) && !isFlyer(mdptr)) {
        await pline('Floating in the air, you miss wildly!');
        exercise(A_DEX, false);
        return;
    }
    let clumsy = !!(g.u.Fumbling | 0);
    const u = g.u;
    const j = u?.weight_cap | 0;
    const invw = u?.inv_weight | 0;
    if (j > 0) {
        const i = -invw;
        if (i < Math.trunc((j * 3) / 10)) {
            const n1 = i < Math.trunc(j / 10) ? 2 : i < Math.trunc(j / 5) ? 3 : 4;
            if (!rn2(n1)) {
                if (!martialLike(g)) {
                    await pline('Your clumsy kick does no damage.');
                    exercise(A_DEX, false);
                    return;
                }
            }
            if (i < Math.trunc(j / 10)) clumsy = true;
            else if (!rn2(i < Math.trunc(j / 5) ? 2 : 3)) clumsy = true;
        }
    }
    await pline(`You kick ${monNamKick(mtmp)}.`);
    await kickdmgNonPolyLikeC(g, mtmp, clumsy);
}

/**
 * C: potion.c make_stunned(xtime, talk) — hero **`HStun`** timeout + plines (**`Unaware`** suppresses talk).
 * @param {import('./gstate.js').game} g
 * @param {number} xtime
 * @param {boolean} talk
 */
export async function makeStunnedHeroLikeC(g, xtime, talk) {
    const u = g.u;
    if (!u) return;
    let docTalk = !!talk;
    if (u.Unaware | 0) docTalk = false;
    const old = u.HStun | 0;
    const x = xtime | 0;

    if (!x && old) {
        if (docTalk) {
            await pline(
                u.Hallucination
                    ? 'You feel less wobbly now.'
                    : 'You feel a bit steadier now.',
            );
        }
    }
    if (x && !old) {
        if (docTalk) {
            if (u.usteed) await pline('You wobble in the saddle.');
            else await pline(`You ${stagger(heroYoumonstPtr(g), 'stagger')}...`);
        }
    }
    if ((!x && old) || (x && !old)) {
        g.disp = g.disp || {};
        g.disp.botl = true;
    }
    u.HStun = x;
}

/**
 * C: trap.c b_trapped(item, bodypart) — **`level_difficulty`**, **`wake_nearby(FALSE)`**,
 * **`losehp(Maybe_Half_Phys(dmg), ...)`**, **`exercise(A_CON)`** only if bodypart is not **`NO_PART`**
 * ( **`eat.c`** tin uses **`NO_PART`**; **`dokick.c`** door uses **`FOOT`**; **`lock.c`** door uses **`FINGER`**).
 * @param {import('./gstate.js').game} g
 * @param {string} itemLabel noun phrase for "The …" (e.g. **`door`**, **`tin`**, **`secret door`**)
 * @param {boolean} [skipConExercise] when true, omit CON exercise (**`NO_PART`**)
 */
export async function bTrappedItemHeroLikeC(g, itemLabel, skipConExercise = false) {
    const u = g.u;
    if (!u) return;
    const lvl = depth(u.uz) | 0;
    const dmg = rnd(5 + (lvl < 5 ? lvl : 2 + Math.trunc(lvl / 2)));
    const cap = (itemLabel || 'object').replace(/^\s+|\s+$/g, '');
    const shown = cap.length ? cap[0].toUpperCase() + cap.slice(1) : 'Something';
    await pline(`KABOOM!!  The ${shown} was booby-trapped!`);
    await wakeNearbyFalseAtHero(g);
    losehp(maybeHalfPhys(dmg), 'explosion', KILLED_BY_AN);
    exercise(A_STR, false);
    if (!skipConExercise) exercise(A_CON, false);
    await makeStunnedHeroLikeC(g, (u.HStun | 0) + dmg, true);
}

/** C: trap.c **`b_trapped("tin", NO_PART)`** — eat.c booby-trapped tin (no CON exercise). */
export async function bTrappedTinNoPartHeroLikeC(g) {
    await bTrappedItemHeroLikeC(g, 'tin', true);
}

/** C: trap.c **`b_trapped("door", FOOT)`** — dokick.c trapped door kick. */
export async function bTrappedDoorFootLikeC(g) {
    await bTrappedItemHeroLikeC(g, 'door', false);
}

/** C: dokick.c kick_dumb */
async function kickDumbAt(g) {
    exercise(A_DEX, false);
    if (martialLike(g) || acurr(A_DEX) >= 16 || rn2(3)) {
        await pline('You kick at empty space.');
        if (heroBlindLike(g)) {
            /* C: feel_location — newsym enough for harness */
            newsym(g.u.ux | 0, g.u.uy | 0);
        }
    } else {
        await pline('Dumb move! You strain a muscle.');
        exercise(A_STR, false);
        const u = g.u;
        u.wounded_legs = 5 + rnd(5);
        u.wounded_leg_side = RIGHT_SIDE;
    }
    if ((Is_airlevel(g.u?.uz) || (g.u.Levitation | 0)) && rn2(2)) {
        /* C: hurtle(-u.dx,-u.dy,1,TRUE) — not ported; rn2(2) consumed like C guard */
    }
}

/** C: dokick.c kick_ouch(x,y,"") */
async function kickOuchAt(g, x, y) {
    await pline('Ouch! That hurts!');
    exercise(A_DEX, false);
    exercise(A_STR, false);
    if (isok(x, y)) {
        if (heroBlindLike(g)) newsym(x | 0, y | 0);
        await wakeNearto5(g, x | 0, y | 0);
    }
    if (!rn2(3)) {
        g.u.wounded_legs = 5 + rnd(5);
        g.u.wounded_leg_side = RIGHT_SIDE;
    }
    const dmg = rnd(acurr(A_CON) > 15 ? 3 : 5);
    losehp(maybeHalfPhys(dmg), 'kicking something', 0);
    if (Is_airlevel(g.u?.uz) || (g.u.Levitation | 0)) {
        /* C: hurtle — rn1(2,4) inside hurtle; omit full hurtle */
    }
}

/** C: dokick.c kick_door */
async function kickDoorAt(g, x, y, loc, avrgAttrib) {
    const mask = loc.doormask | 0;
    if (mask === D_ISOPEN || mask === D_BROKEN || mask === D_NODOOR) {
        await kickDumbAt(g);
        return;
    }
    if (g.u.Levitation | 0) {
        await pline('Ouch! That hurts!');
        return;
    }

    exercise(A_DEX, true);
    const doorbuster = !!(g.u?.Upolyd | 0) && false; /* is_giant — not ported */
    const shopdoor = inRoomsShopbaseRoomnos(g, x | 0, y | 0).length > 0;

    if (doorbuster || (rnl(35) < avrgAttrib + (!martialLike(g) ? 0 : acurr(A_DEX)))) {
        if (mask & D_TRAPPED) {
            if (g.flags?.verbose) await pline('You kick the door.');
            exercise(A_STR, false);
            loc.doormask = D_NODOOR;
            await bTrappedDoorFootLikeC(g);
        } else if (acurr(A_STR) > 18 && !rn2(5) && !shopdoor) {
            await pline('As you kick the door, it shatters to pieces!');
            exercise(A_STR, true);
            loc.doormask = D_NODOOR;
        } else {
            await pline('As you kick the door, it crashes open!');
            exercise(A_STR, true);
            loc.doormask = D_BROKEN;
        }
        newsym(x | 0, y | 0);
        vision_recalc(1);
        if (shopdoor) {
            addDamageAt(g, x | 0, y | 0, SHOP_DOOR_COST);
            await payForDamage(g, 'break', false);
        }
        /* C: in_town + watchman — not ported (level.has_town stub) */
    } else {
        if (heroBlindLike(g)) newsym(x | 0, y | 0);
        exercise(A_STR, true);
        await pline(`${heroDeafLike(g) || !rn2(3) ? 'Thwack' : 'Whammm'}!!`);
        /* in_town watchman_door_damage — skipped */
    }
}

/** C: dokick.c kick_nondoor — STAIRS/LADDER/STWALL vs default kick_dumb. */
async function kickNondoorTailLikeC(g, x, y, loc, avrgAttrib) {
    void avrgAttrib;
    const typ = loc.typ | 0;
    if (typ === STAIRS || typ === LADDER || IS_STWALL(typ)) {
        if (!IS_STWALL(typ) && (loc.ladder | 0) === LA_DOWN) {
            await kickDumbAt(g);
            return;
        }
        await kickOuchAt(g, x, y);
        return;
    }
    await kickDumbAt(g);
}

/** C: mklev.js **`GOLD_PIECE`** otyp. */
const OTYP_GOLD_PIECE = 466;

function trapAtKick(g, x, y) {
    const traps = g.level?.traps;
    if (!traps?.length) return null;
    return traps.find((t) => (t.tx | 0) === (x | 0) && (t.ty | 0) === (y | 0)) ?? null;
}

function donameKickRelative(o, isGold) {
    void o;
    if (isGold) return 'the gold';
    return 'something';
}

function floorHasBoulderAt(g, x, y) {
    const fk = floorObjKey(x | 0, y | 0);
    for (let o = g.level?.floorObjHeads?.get(fk); o; o = o.nexthere) {
        if ((o.otyp | 0) === OTYP_BOULDER) return true;
    }
    return false;
}

/** C: **`m_at`** for **`bhit`**. */
function monsterAtKick(g, cx, cy) {
    return g.level?.monsters?.find((m) => (m.mx | 0) === (cx | 0) && (m.my | 0) === (cy | 0)) ?? null;
}

/**
 * C: zap.c bhit(ddx, ddy, range, KICKED_WEAPON, …) — slide subset (no tmp_at, thitmonst/ghitm, ship_object, hits_bars).
 * @returns {Promise<{ x: number, y: number }>}
 */
async function bhitKickedObjectSlideLikeC(g, startX, startY, range, kickedForName) {
    const u = g.u;
    const dx = u.dx | 0;
    const dy = u.dy | 0;
    let stepBudget = (range | 0) - 1;
    let bx = startX | 0;
    let by = startY | 0;
    while (stepBudget-- > 0) {
        const nx = bx + dx;
        const ny = by + dy;
        if (!isok(nx, ny)) break;
        const locT = g.level.at(nx, ny);
        if (!locT) break;
        const typ = locT.typ | 0;
        if (IS_WATERWALL(typ) || typ === LAVAWALL) break;
        if (typ === IRONBARS) break;
        const mtmp = monsterAtKick(g, nx, ny);
        if (mtmp) {
            bx = nx;
            by = ny;
            break;
        }
        const tr = trapAtKick(g, nx, ny);
        if (tr && (tr.ttyp | 0) === TT_WEB && !rn2(3)) {
            bx = nx;
            by = ny;
            if (!tr.tseen) tr.tseen = 1;
            if (cansee(nx, ny)) {
                const raw = donameKickRelative(kickedForName, (kickedForName.otyp | 0) === OTYP_GOLD_PIECE);
                const cap = raw.charAt(0).toUpperCase() + raw.slice(1);
                await pline(`${cap} gets stuck in a web!`);
            }
            await newsym(nx, ny);
            break;
        }
        if (!ZAP_POS(typ) || isClosedDoorLoc(locT)) break;
        if (IS_POOL(typ) || IS_LAVA(typ)) {
            bx = nx;
            by = ny;
            break;
        }
        if (typ === SINK) {
            bx = nx;
            by = ny;
            break;
        }
        bx = nx;
        by = ny;
    }
    g.context.bhitpos = { x: bx, y: by };
    return { x: bx, y: by };
}

/**
 * C: dokick.c really_kick_object — traps, fumble, range, Thump!, zap.c bhit KICKED_WEAPON slide
 * (range-- then range-- > 0 steps: water wall, iron bars, m_at, web rn2(3), ZAP_POS and closed_door, pool/lava, sink).
 * Still TODO: scatter, shop costly, Is_box, obstructed free, ship_object, hits_bars, tmp_at.
 * @returns {Promise<number>} C truthy int (1 handled, 0 leads to kick_ouch).
 */
async function reallyKickObjectLikeC(g, x, y, head) {
    const u = g.u;
    if (!head || !u || !g.level) return 0;
    if ((head.otyp | 0) === OTYP_BOULDER) return 0;
    if (head === g.uball || head === g.uchain) return 0;

    const trap = trapAtKick(g, x, y);
    if (trap) {
        const ttyp = trap.ttyp | 0;
        if ((is_pit(ttyp) && !heroPassesWalls(g)) || ttyp === TT_WEB) {
            if (!trap.tseen) trap.tseen = 1;
            const webOrPit = ttyp === TT_WEB ? 'web' : 'pit';
            const tizzy = (u.Hallucination | 0) ? 'tizzy' : webOrPit;
            await pline(`You can't kick anything that's in a ${tizzy}!`);
            return 1;
        }
        if (ttyp === STATUE_TRAP) {
            await pline('You kick a statue trap!');
            return 1;
        }
    }

    if ((u.Fumbling | 0) && !rn2(3)) {
        await pline('Your clumsy kick missed.');
        return 1;
    }

    const isGold = (head.otyp | 0) === OTYP_GOLD_PIECE;
    let kOwt = head.owt | 0;
    if ((head.quan | 0) > 1 && !isGold) {
        kOwt = Math.max(1, Math.trunc((head.owt | 0) / (head.quan | 0)));
    }

    let range = Math.trunc(acurr(A_STR) / 2) - Math.trunc(kOwt / 40);
    if (martialLike(g)) range += rnd(3);

    const locKick = g.level.at(x, y);
    const typKick = locKick?.typ | 0;
    if (IS_POOL(typKick)) {
        range = Math.trunc(range / 3) + 1;
    } else if (Is_airlevel(u.uz) || Is_waterlevel(u.uz)) {
        range += rnd(3);
    }

    const nx = x + (u.dx | 0);
    const ny = y + (u.dy | 0);
    const locN = isok(nx, ny) ? g.level.at(nx, ny) : null;
    if (!locN || !ZAP_POS(locN.typ | 0) || isClosedDoorLoc(locN)) {
        range = 1;
    }

    /* C: dokick.c — **`gk.kickedloc`** for **`m_avoid_kicked_loc`** (pets avoid kicked square). */
    g.kickedloc = { x: x | 0, y: y | 0 };

    await pline(`You kick ${donameKickRelative(head, isGold)}.`);

    /* C: dokick.c really_kick_object — after Is_box / before Thump+slide (**`hero_breaks(..., 0)`**). */
    if (await heroBreaksObjLikeC(g, head, x, y, 0)) return 1;

    if (range < 2) {
        await pline('Thump!');
        return !rn2(3) || martialLike(g) ? 1 : 0;
    }

    if (isGold && (head.quan | 0) > 1) {
        if (rn2(20)) {
            if (!heroDeafLike(g)) await pline('Thwwpingg!');
            const flying = [
                'scatter the coins',
                'knock coins all over the place',
                'send coins flying in all directions',
            ];
            await pline(`You ${flying[rnd(3)]}!`);
            /* C: **`scatter`** — not ported; pile stays (TODO). */
            return 1;
        }
        if ((head.quan | 0) > 300) {
            await pline('Thump!');
            return !rn2(3) || martialLike(g) ? 1 : 0;
        }
    }

    let kicked = head;
    unlinkFloorObjectInLevel(g, kicked);
    if ((kicked.quan | 0) > 1 && !isGold) {
        const q = kicked.quan | 0;
        const totw = kicked.owt | 0;
        const w1 = Math.max(1, Math.trunc(totw / q));
        const wRem = Math.max(1, totw - w1);
        kicked.quan = q - 1;
        kicked.owt = wRem;
        placeFloorObjectInLevel(g, kicked, x, y);
        stackObjOnFloorInLevel(g, kicked);
        kicked = {
            otyp: kicked.otyp,
            oclass: kicked.oclass,
            ox: x,
            oy: y,
            quan: 1,
            owt: w1,
            cursed: kicked.cursed,
            blessed: kicked.blessed,
            olocked: kicked.olocked | 0,
            spe: kicked.spe | 0,
            opoisoned: kicked.opoisoned | 0,
            greased: kicked.greased | 0,
            unpaid: kicked.unpaid | 0,
            no_charge: kicked.no_charge | 0,
            nexthere: null,
        };
        if (!g.level.objects) g.level.objects = [];
        g.level.objects.push(kicked);
    }

    await newsym(x, y);

    const dest = await bhitKickedObjectSlideLikeC(g, x, y, range, kicked);
    placeFloorObjectInLevel(g, kicked, dest.x, dest.y);
    stackObjOnFloorInLevel(g, kicked);
    await newsym(dest.x, dest.y);
    return 1;
}

/**
 * C: dokick.c **`kick_object`** (**`kickobjnam`** / **`kickstr`** deferred).
 * @returns {Promise<boolean>}
 */
async function kickObjectAtLikeC(g, x, y) {
    const fk = floorObjKey(x | 0, y | 0);
    const head = g.level?.floorObjHeads?.get(fk) ?? null;
    if (!head) return false;
    const res = await reallyKickObjectLikeC(g, x | 0, y | 0, head);
    return !!res;
}

function boulderOnHeroTile(g) {
    const u = g.u;
    const k = floorObjKey(u.ux | 0, u.uy | 0);
    const head = g.level?.floorObjHeads?.get(k);
    for (let o = head; o; o = o.nexthere) {
        if ((o.otyp | 0) === OTYP_BOULDER) return true;
    }
    return false;
}

/**
 * C: dokick.c dokick() — getdir, wake_nearby, u_wipe_engr, door / nondoor subset.
 * @param {import('./gstate.js').game} g
 */
export async function dokickFromCmd(g) {
    const u = g.u;
    if (!u || !g.level) {
        g.context.move = 0;
        return;
    }

    let noKick = false;
    const yptr = heroYoumonstPtr(g);

    if (heroNoLegsKick(g)) {
        await pline('You have no legs to kick with.');
        noKick = true;
    } else if (verysmall(yptr)) {
        await pline('You are too small to do any kicking.');
        noKick = true;
    } else if (u.usteed) {
        await pline('You decide not to kick your steed.');
        g.context.move = 0;
        return;
    } else if ((u.wounded_legs | 0) && !u.usteed) {
        await pline('Your legs are in no shape for kicking.');
        noKick = true;
    } else if (nearCapacity() > ENC.SLT_ENCUMBER) {
        await pline('Your load is too heavy to balance yourself for a kick.');
        noKick = true;
    } else if ((u.Upolyd | 0) && (u.umonnum | 0) === PM_LIZARD) {
        await pline('Your legs cannot kick effectively.');
        noKick = true;
    } else if ((u.underwater | 0) && !rn2(2)) {
        await pline("Your slow motion kick doesn't hit anything.");
        noKick = true;
    } else if (u.utrap | 0) {
        noKick = true;
        const tt = u.utraptype | 0;
        if (tt === TT_PIT) {
            if (!heroPassesWalls(g)) {
                await pline("There's not enough room to kick down here.");
            } else {
                noKick = false;
            }
        } else if (tt === TT_WEB || tt === TT_BEARTRAP) {
            await pline("You can't move your leg!");
        }
    } else if (boulderOnHeroTile(g) && !heroPassesWalls(g)) {
        await pline("There's not enough room to kick in here.");
        noKick = true;
    }

    if (noKick) {
        g.context.move = 0;
        return;
    }

    const delta = await readKickDirectionDelta();
    if (delta == null) {
        g.context.move = 0;
        return;
    }
    if (!delta.dx && !delta.dy) {
        g.context.move = 0;
        return;
    }

    u.dx = delta.dx;
    u.dy = delta.dy;
    g.kickedloc = {
        x: (u.ux | 0) + (u.dx | 0),
        y: (u.uy | 0) + (u.dy | 0),
    };

    if (g.u.uswallow) {
        switch (rn2(3)) {
            case 0:
                await pline("You can't move your leg!");
                break;
            default:
                await pline('Your feeble kick has no effect.');
                break;
        }
        g.context.move = 1;
        return;
    }

    if ((u.utrap | 0) && (u.utraptype | 0) === TT_PIT && heroPassesWalls(g)) {
        await pline('You kick at the side of the pit.');
        g.context.move = 1;
        return;
    }

    if (g.u.Levitation | 0) {
        const xx = (u.ux | 0) - delta.dx;
        const yy = (u.uy | 0) - delta.dy;
        const back = isok(xx, yy) ? g.level.at(xx, yy) : null;
        const bt = back?.typ | 0;
        const fk = floorObjKey(xx, yy);
        const backObjs = g.level?.floorObjHeads?.get(fk);
        let backBoulder = false;
        for (let o = backObjs; o; o = o.nexthere) {
            if ((o.otyp | 0) === OTYP_BOULDER) backBoulder = true;
        }
        if (
            isok(xx, yy)
            && !IS_STWALL(bt)
            && !IS_DOOR(bt)
            && (!Is_airlevel(u.uz) || !backBoulder)
        ) {
            await pline('You have nothing to brace yourself against.');
            g.context.move = 0;
            return;
        }
    }

    const x = (u.ux | 0) + delta.dx;
    const y = (u.uy | 0) + delta.dy;
    const mtmp = g.level.monsters?.find((m) => (m.mx | 0) === x && (m.my | 0) === y) ?? null;

    if (mtmp) {
        g.context.move = 1;
        const proceed = await maybeKickMonsterLikeC(g, mtmp, x | 0, y | 0);
        if (!proceed) return;
    }

    await wakeNearbyFalseAtHero(g);
    uWipeEngr(2);

    if (!isok(x, y)) {
        await kickOuchAt(g, x, y);
        g.context.move = 1;
        return;
    }

    if (mtmp) {
        await kickMonsterNonPolyLikeC(g, mtmp, x | 0, y | 0);
        g.context.move = 1;
        return;
    }

    const loc = g.level.at(x, y);
    if (!loc) {
        g.context.move = 0;
        return;
    }

    const typ = loc.typ | 0;
    const poolLike = IS_POOL(typ) || typ === LAVAWALL;
    if (poolLike !== !!(u.underwater | 0)) {
        const liq = typ === LAVAWALL ? 'lava' : 'water';
        await pline(`You splash some ${liq} around.`);
        g.context.move = 1;
        return;
    }

    const fk = floorObjKey(x, y);
    const floorChain = g.level.floorObjHeads?.get(fk);
    if (floorChain) {
        const levOk = !(u.Levitation | 0)
            || Is_airlevel(u.uz)
            || Is_waterlevel(u.uz)
            || floorHasBoulderAt(g, x, y);
        if (levOk) {
            if (await kickObjectAtLikeC(g, x, y)) {
                g.context.move = 1;
                return;
            }
            await kickOuchAt(g, x, y);
            g.context.move = 1;
            return;
        }
    }

    /* C: KMH kicking boots → avrg_attrib 99 — not ported (no otyp constant wired). */
    const avrg = Math.trunc((acurr(A_STR) + acurr(A_DEX) + acurr(A_CON)) / 3);

    if (IS_DOOR(typ)) await kickDoorAt(g, x, y, loc, avrg);
    else await kickNondoorTailLikeC(g, x, y, loc, avrg);

    g.context.move = 1;
}
