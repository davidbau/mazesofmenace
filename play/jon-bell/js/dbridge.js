// dbridge.js — C ref: dbridge.c.
import { DBWALL, DB_DIR, DB_EAST, DB_ICE, DB_LAVA, DB_MOAT, DB_NORTH, DB_SOUTH, DB_UNDER, DB_WEST, DOOR, DRAWBRIDGE_DOWN, DRAWBRIDGE_UP, D_NODOOR, ICE, IS_DRAWBRIDGE, IS_WALL, IS_WATERWALL, Is_waterlevel, Is_juiblex_level as Is_juiblex_level_real, LAVAPOOL, LAVAWALL, MOAT, POOL, STONE, WATER, W_NONDIGGABLE, isok } from './const.js';
import { game } from './gstate.js';
import { impossible } from './pline.js';
import { pooleffects_drown, pooleffects_lava_effects, revive_nasty } from './cmd.js';
import { delallobj } from './invent.js'; // relocate-fns
import { BURNING, CONFUSION, CRUSHING, DROWNING, FUMBLING, ICED_MOAT, Is_stronghold, KILLED_BY_AN, MAGICAL_BREATHING, MAY_HIT, NO_KILLER_PREFIX, OBJ_AT, PASSES_WALLS, ROOM, STUNNED, SWIMMING, WWALKING, XKILL_GIVEMSG, XKILL_NOCONDUCT, XKILL_NOCORPSE, XKILL_NOMSG } from './const.js'; // relocate-fns
import { BOULDER, Flying_, Levitation_, Soundeffect, _dig_hallucination, is_floater_, is_flyer_, u_prop_ } from './dig.js'; // relocate-fns
import { Deaf as Deaf_real, Unaware as Unaware_real, canseemon, canspotmon, newsym } from './display.js'; // relocate-fns
import { flooreffects } from './do.js'; // relocate-fns
import { done } from './end.js'; // relocate-fns
import { del_engr_at } from './engrave.js'; // relocate-fns
import { scatter } from './explode.js'; // relocate-fns
import { spoteffects } from './hack.js'; // relocate-fns
import { sobj_at } from './invent.js'; // relocate-fns
import { mhe, nonliving, permonstTemplate } from './makemon.js'; // relocate-fns
import { Monnam } from './mcastu.js'; // relocate-fns
import { helpless } from './mhitm.js';
import { hliquid } from './do_name.js'; // relocate-fns
import { mksobj_at, obj_extract_self } from './mkobj.js'; // relocate-fns
import { minliquid, wake_nearto } from './mon.js'; // relocate-fns
import { vtense } from './objnam.js'; // relocate-fns
import { You_hear, You_see, pline } from './pline.js'; // relocate-fns
import { PM_FIRE_ELEMENTAL, PM_LONG_WORM_TAIL, PM_SALAMANDER } from './pm.generated.js'; // relocate-fns
import { update_monster_region } from './region.js'; // relocate-fns
import { rn2, rnd } from './rnd.js'; // relocate-fns
import { place_monster } from './steed.js'; // relocate-fns
import { enexto_out, teleds } from './teleport.js'; // relocate-fns
import { deltrap, t_at } from './trap.js'; // relocate-fns
import { m_at, mon_nam } from './uhitm.js';
import { monkilled, xkilled } from './mon.js';
import { AD_DGST, DEADMONSTER } from './uhitm.js'; // relocate-fns
import { block_point, cansee, does_block, unblock_point, vision_recalc } from './vision.js'; // relocate-fns

/* C ref: dbridge.c:84-95 is_pool(x,y) — POOL/MOAT/WATER or is_moat(). */
export function is_pool(x, y) {
    if (!isok(x, y))
        return false;
    const ltyp = game.level.at(x, y).typ | 0;
    /* The ltyp == MOAT is not redundant with is_moat, because the
     * Juiblex level does not have moats, although it has MOATs. */
    if (ltyp === POOL || ltyp === MOAT || ltyp === WATER || is_moat(x, y))
        return true;
    return false;
}

function Is_juiblex_level(uz) { return Is_juiblex_level_real(uz); }

/* C ref: dbridge.c:99-114 is_moat(x,y) — MOAT or DRAWBRIDGE_UP over DB_MOAT,
   except on Juiblex level (always false there). */
export function is_moat(x, y) {
    if (!isok(x, y))
        return false;
    const loc = game.level.at(x, y);
    const ltyp = loc.typ | 0;
    if (!Is_juiblex_level(game.u.uz)
        && (ltyp === MOAT
            || (ltyp === DRAWBRIDGE_UP
                && ((loc.drawbridgemask | 0) & DB_UNDER) === DB_MOAT)))
        return true;
    return false;
}

/* C ref: dbridge.c:85-98 is_ice(x,y). */
export function is_ice(x, y) {
    if (!isok(x, y))
        return false;
    const loc = game.level.at(x, y);
    const ltyp = loc.typ;
    if (ltyp === ICE || (ltyp === DRAWBRIDGE_UP
                        && (loc.drawbridgemask & DB_UNDER) === DB_ICE))
        return true;
    return false;
}

/* C ref: dbridge.c:169-173 is_db_wall(x, y) — verify drawbridge wall is UP.
 * RNG: none. Return boolean (drawbridge wall typ). */
export function is_db_wall(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    return (loc.typ | 0) === DBWALL;
}

/* C ref: dbridge.c:115-128 db_under_typ(mask) — get terrain under a drawbridge.
 * RNG: none. Return schar (terrain type: ICE, LAVAPOOL, MOAT, or STONE). */
export function db_under_typ(mask) {
    const m = (mask & DB_UNDER) | 0;
    switch (m) {
    case DB_ICE:
        return ICE;
    case DB_LAVA:
        return LAVAPOOL;
    case DB_MOAT:
        return MOAT;
    default:
        return STONE;
    }
}

/* C ref: dbridge.c:37-43 is_waterwall(x, y) — check if location is a waterwall.
 * RNG: none. Return boolean. */
export function is_waterwall(x, y) {
    if (isok(x, y)) {
        const loc = game.level?.at(x, y);
        if (loc && IS_WATERWALL(loc.typ)) {
            return true;
        }
    }
    return false;
}

/* C ref: dbridge.c:136-162 is_drawbridge_wall(x, y) — check if location is a drawbridge wall.
 * RNG: none. Return int (direction of drawbridge or -1 if not a valid wall). */
export function is_drawbridge_wall(x, y) {
    if (!isok(x, y)) {
        return -1;
    }
    const lev = game.level?.at(x, y);
    if (!lev || (lev.typ !== DOOR && lev.typ !== DBWALL)) {
        return -1;
    }
    /* Check all four cardinal directions for drawbridge walls */
    if (isok(x + 1, y)) {
        const adj = game.level?.at(x + 1, y);
        if (adj && IS_DRAWBRIDGE(adj.typ) && ((adj.drawbridgemask & DB_DIR) | 0) === DB_WEST) {
            return DB_WEST;
        }
    }
    if (isok(x - 1, y)) {
        const adj = game.level?.at(x - 1, y);
        if (adj && IS_DRAWBRIDGE(adj.typ) && ((adj.drawbridgemask & DB_DIR) | 0) === DB_EAST) {
            return DB_EAST;
        }
    }
    if (isok(x, y - 1)) {
        const adj = game.level?.at(x, y - 1);
        if (adj && IS_DRAWBRIDGE(adj.typ) && ((adj.drawbridgemask & DB_DIR) | 0) === DB_SOUTH) {
            return DB_SOUTH;
        }
    }
    if (isok(x, y + 1)) {
        const adj = game.level?.at(x, y + 1);
        if (adj && IS_DRAWBRIDGE(adj.typ) && ((adj.drawbridgemask & DB_DIR) | 0) === DB_NORTH) {
            return DB_NORTH;
        }
    }
    return -1;
}

/* C ref: dbridge.c:179-206 find_drawbridge(x, y) — locate drawbridge from wall or bridge.
 * RNG: none. Return boolean; mutates *x,*y to point to drawbridge if found. */
export function find_drawbridge(x, y) {
    if (IS_DRAWBRIDGE((game.level?.at(x.value, y.value)?.typ | 0)))
        return true;
    const dir = is_drawbridge_wall(x.value, y.value);
    if (dir >= 0) {
        switch (dir) {
        case DB_NORTH:
            y.value++;
            break;
        case DB_SOUTH:
            y.value--;
            break;
        case DB_EAST:
            x.value--;
            break;
        case DB_WEST:
            x.value++;
            break;
        }
        return true;
    }
    return false;
}

/* C ref: dbridge.c:234-284 create_drawbridge(x, y, dir, flag)
 * RNG: none. Return boolean. */
export function create_drawbridge(x, y, dir, flag) {
    let x2 = x;
    let y2 = y;
    let horiz;
    const lava = (game.level?.at(x, y)?.typ | 0) === LAVAPOOL;

    switch (dir) {
    case DB_NORTH:
        horiz = true;
        y2--;
        break;
    case DB_SOUTH:
        horiz = true;
        y2++;
        break;
    case DB_EAST:
        horiz = false;
        x2++;
        break;
    default:
        impossible("bad direction in create_drawbridge");
        /*FALLTHRU*/
    case DB_WEST:
        horiz = false;
        x2--;
        break;
    }
    if (!IS_WALL((game.level?.at(x2, y2)?.typ | 0)))
        return false;
    if (flag) {
        game.level.at(x, y).typ = DRAWBRIDGE_DOWN;
        game.level.at(x2, y2).typ = DOOR;
        game.level.at(x2, y2).doormask = D_NODOOR;
    } else {
        game.level.at(x, y).typ = DRAWBRIDGE_UP;
        game.level.at(x2, y2).typ = DBWALL;
        game.level.at(x2, y2).wall_info = W_NONDIGGABLE;
    }
    game.level.at(x, y).horizontal = !horiz;
    game.level.at(x2, y2).horizontal = horiz;
    game.level.at(x, y).drawbridgemask = dir;
    if (lava)
        game.level.at(x, y).drawbridgemask |= DB_LAVA;
    return true;
}

export function is_lava(x, y) {
    if (!isok(x, y))
        return false;
    const loc = game.level?.at?.(x, y);
    if (!loc)
        return false;
    const ltyp = loc.typ | 0;
    if (ltyp === LAVAPOOL || ltyp === LAVAWALL
        || (ltyp === DRAWBRIDGE_UP
            && ((loc.drawbridgemask | 0) & DB_UNDER) === DB_LAVA))
        return true;
    return false;
}

/* C dbridge.c:77-85 is_pool_or_lava. */
export function is_pool_or_lava(x, y) {
    if (is_pool(x, y) || is_lava(x, y))
        return true;
    else
        return false;
}

const IRON_CHAIN = 478, se_chains_rattling_gears_turning = 0, se_smashing_and_crushing = 0, se_loud_splash = 0, se_loud_crash = 0, se_crushing_sound = 0, se_gears_turning_chains_rattling = 0;

/* C dbridge.c:888-1019: bridge terrain, debris, vision, and the occupants. */
export async function destroy_drawbridge(x, y) {
    const bx = { value: x | 0 }, by = { value: y | 0 };
    const bridge = game.level?.at(bx.value, by.value);
    if (!bridge || !IS_DRAWBRIDGE(bridge.typ | 0)) return;
    let wx = bx.value, wy = by.value;
    switch ((bridge.drawbridgemask | 0) & DB_DIR) {
    case DB_NORTH: wy--; break;
    case DB_SOUTH: wy++; break;
    case DB_EAST: wx++; break;
    case DB_WEST: wx--; break;
    }
    const under = (bridge.drawbridgemask | 0) & DB_UNDER;
    const lava = under === DB_LAVA;
    const iced = (bridge.drawbridgemask | 0) & DB_ICE;
    if (under === DB_MOAT || lava) {
        Soundeffect(se_loud_splash, 100);
        const raised = bridge.typ === DRAWBRIDGE_UP;
        const sx = raised ? wx : bx.value, sy = raised ? wy : by.value;
        if (cansee(sx, sy) || (game.u.ux === sx && game.u.uy === sy))
            await pline(raised ? 'The portcullis of the drawbridge falls into the %s!'
                : 'The drawbridge collapses into the %s!', lava ? hliquid('lava') : 'moat');
        else await You_hear('a loud *SPLASH*!');
        bridge.typ = lava ? LAVAPOOL : MOAT;
        // C dbridge.c:924-928: expose the liquid before dunking one boulder.
        bridge.drawbridgemask = 0;
        const boulder = sobj_at(BOULDER, bx.value, by.value);
        if (boulder) {
            obj_extract_self(boulder);
            await flooreffects(boulder, bx.value, by.value, 'fall');
        }
    } else {
        Soundeffect(se_loud_crash, 100);
        if (cansee(bx.value, by.value) || (game.u.ux === bx.value && game.u.uy === by.value))
            await pline('The drawbridge disintegrates!');
        else await You_hear('a loud *CRASH*!');
        bridge.typ = iced ? ICE : ROOM;
        // icedpool aliases drawbridgemask (rm.flags); retain ICED_MOAT on ice.
        bridge.icedpool = iced ? ICED_MOAT : 0;
    }
    wake_nearto(bx.value, by.value, 500);
    const wall = game.level?.at(wx, wy);
    if (wall) { wall.typ = DOOR; wall.doormask = D_NODOOR; }
    const bt = t_at(bx.value, by.value), wt = t_at(wx, wy);
    if (bt) deltrap(bt);
    if (wt && wt !== bt) deltrap(wt);
    del_engr_at(bx.value, by.value); del_engr_at(wx, wy);
    // C dbridge.c:949-959: create and scatter each piece of iron-chain debris.
    for (let i = rn2(6); i > 0; --i) {
        const obj = await mksobj_at(IRON_CHAIN, rn2(2) ? bx.value : wx, rn2(2) ? by.value : wy, true, false);
        await scatter(obj.ox, obj.oy, 1, MAY_HIT, obj);
    }
    newsym(bx.value, by.value); newsym(wx, wy);
    if (!does_block(wx, wy)) unblock_point(wx, wy);
    vision_recalc(0);
    if (Is_stronghold(game.u.uz))
        game.u.uevent.uopened_dbridge = true;

    /* C dbridge.c:978-1015: the occupants of the portcullis and span squares. */
    const etmp2 = db_occupants[1] = db_set_entity(wx, wy); /* currently only automissers can be here */
    if (etmp2.edata) {
        const e_inview = db_e_canseemon(etmp2);
        if (!db_automiss(etmp2)) {
            if (e_inview)
                await pline('%s blown apart by flying debris.', db_E_phrase(etmp2, 'are'));
            db_set_killer('exploding drawbridge');
            await db_e_died(etmp2, XKILL_NOCORPSE | (e_inview ? XKILL_GIVEMSG : XKILL_NOMSG),
                            CRUSHING); /* no corpse */
        } /* nothing which is vulnerable can survive this */
    }
    const etmp1 = db_occupants[0] = db_set_entity(bx.value, by.value);
    if (etmp1.edata) {
        const e_inview = db_e_canseemon(etmp1);
        if (db_e_missed(etmp1, true)) {
            /* if there is water or lava here, fall in now */
            if (db_is_u(etmp1)) await spoteffects(false);
            else await minliquid(etmp1.emon);
        } else {
            if (e_inview) {
                if (!db_is_u(etmp1) && _dig_hallucination())
                    await pline('%s into some heavy metal!', db_E_phrase(etmp1, 'get'));
                else
                    await pline('%s hit by a huge chunk of metal!', db_E_phrase(etmp1, 'are'));
            } else if (!Deaf_real() && !db_is_u(etmp1) && !is_pool(bx.value, by.value)) {
                Soundeffect(se_crushing_sound, 75);
                await You_hear('a crushing sound.');
            }
            db_set_killer('collapsing drawbridge');
            await db_e_died(etmp1, XKILL_NOCORPSE | (e_inview ? XKILL_GIVEMSG : XKILL_NOMSG),
                            CRUSHING); /* no corpse */
            /* C dbridge.c:1012-1013 */
            if ((game.level.at(etmp1.ex, etmp1.ey)?.typ | 0) === MOAT) await db_do_entity(etmp1);
        }
    }
    db_nokiller(); /* C dbridge.c:1016: clear the killer and both occupants. */
    if (Is_stronghold(game.u.uz))
        game.u.uevent.uheard_tune = 3; /* bridge is gone so tune is now useless */
}

/* C dbridge.c:303-337 struct entity / m_to_e / u_to_e / set_entity. */
function db_set_entity(x, y) {
    if (game.u.ux === x && game.u.uy === y)
        return { emon: game.youmonst, ex: game.u.ux, ey: game.u.uy, edata: game.youmonst?.data };
    const mtmp = m_at(x, y);
    /* C dbridge.c:303-318 m_to_e: a long worm segment other than the head is
     * a PM_LONG_WORM_TAIL entity. */
    if (!mtmp)
        return { emon: null, ex: 0, ey: 0, edata: null };
    const isTail = (mtmp.wormno | 0) && (x !== mtmp.mx || y !== mtmp.my);
    return { emon: mtmp, ex: x, ey: y,
             edata: isTail ? permonstTemplate(PM_LONG_WORM_TAIL) : mtmp.data };
}

function db_is_u(etmp) { return etmp.emon === game.youmonst; }

function db_e_canseemon(etmp) { return db_is_u(etmp) || canseemon(etmp.emon); }

/* C dbridge.c:359-373 E_phrase() */
function db_E_phrase(etmp, verb) {
    const who = db_is_u(etmp) ? 'You' : Monnam(etmp.emon);
    return `${who} ${db_is_u(etmp) ? verb : vtense(null, verb)}`;
}

function db_set_killer(name, format = KILLED_BY_AN) {
    game.svk ||= {};
    game.svk.killer ||= {};
    game.svk.killer.format = format;
    game.svk.killer.name = name;
}

/* mondata.h:29,31 passes_walls / noncorporeal */
function db_passes_walls(ptr) { return ((ptr?.mflags1 | 0) & 0x00000008) !== 0; }

function db_noncorporeal(ptr) { return ptr?.mlet === 54; /* S_GHOST */ }

/* C dbridge.c:485-490 automiss() */
function db_automiss(etmp) {
    const pw = db_is_u(etmp)
        ? !!((u_prop_(game.u, PASSES_WALLS).intrinsic | 0) || (u_prop_(game.u, PASSES_WALLS).extrinsic | 0))
        : db_passes_walls(etmp.edata);
    return pw || db_noncorporeal(etmp.edata);
}

/* C dbridge.c:495-523 e_missed() */
function db_e_missed(etmp, chunks) {
    if (db_automiss(etmp)) return true;
    let misses;
    if (is_flyer_(etmp.edata) && (db_is_u(etmp) ? !Unaware_real() : !helpless(etmp.emon)))
        misses = 5; /* flying requires mobility */
    else if (is_floater_(etmp.edata) || (db_is_u(etmp) && Levitation_()))
        misses = 3; /* doesn't require mobility */
    else if (chunks && is_pool(etmp.ex, etmp.ey))
        misses = 2; /* sitting ducks */
    else
        misses = 0;
    if (is_db_wall(etmp.ex, etmp.ey)) misses -= 3; /* less airspace */
    return misses >= rnd(8);
}

/* C dbridge.c:410-480 e_died() */
async function db_e_died(etmp, xkill_flags, how) {
    if (db_is_u(etmp)) {
        if (how === DROWNING) {
            if (game.svk?.killer) game.svk.killer.name = ''; /* drown() sets its own killer */
            await pooleffects_drown();
        } else if (how === BURNING) {
            if (game.svk?.killer) game.svk.killer.name = ''; /* lava_effects() sets own killer */
            await pooleffects_lava_effects();
        } else {
            if (!game.svk?.killer?.name) db_set_killer('falling drawbridge');
            await done(how);
            /* So, you didn't die */
            if (!db_e_survives_at(etmp, etmp.ex, etmp.ey)) {
                const xy = enexto_out(etmp.ex, etmp.ey, etmp.edata);
                if (xy) {
                    await pline('A %s force teleports you away...', _dig_hallucination() ? 'normal' : 'strange');
                    await teleds(xy.x, xy.y, 0 /* TELEDS_NO_FLAGS */);
                }
            }
        }
        /* we might have crawled out of the moat to survive */
        etmp.ex = game.u.ux; etmp.ey = game.u.uy;
        return;
    }
    if (game.svk?.killer) game.svk.killer.name = '';
    /* C dbridge.c:441-443 mk_message / mk_corpse: the fake AD_DGST damage type
     * suppresses the corpse, AD_PHYS (0) leaves one. */
    const msg = (xkill_flags & XKILL_NOMSG) ? null : '';
    const mkCorpse = (fl) => ((fl & XKILL_NOCORPSE) !== 0) ? AD_DGST : 0 /* AD_PHYS */;
    /* if monsters are moving, one of them caused the destruction */
    if (game.context?.mon_moving) await monkilled(etmp.emon, msg, mkCorpse(xkill_flags));
    else await xkilled(etmp.emon, xkill_flags); /* you caused it */
    /* if etmp gets life-saved, kill it again */
    if (!DEADMONSTER(etmp.emon)) {
        const seeit = canspotmon(etmp.emon);
        xkill_flags |= XKILL_NOMSG | XKILL_NOCONDUCT;
        if (game.context?.mon_moving) await monkilled(etmp.emon, '', mkCorpse(xkill_flags));
        else await xkilled(etmp.emon, xkill_flags);
        if (DEADMONSTER(etmp.emon) && seeit)
            await pline('Unfortunately for %s, %s is still crushed.', mon_nam(etmp.emon), mhe(etmp.emon));
    }
    etmp.edata = null;
    /* dead long worm handling */
    for (const e of db_occupants)
        if (e !== etmp && e.emon === etmp.emon) e.edata = null;
}

/* C dbridge.c go.occupants[ENTITIES] and e_at() (dbridge.c:276-290). */
const db_occupants = [{ emon: null, ex: 0, ey: 0, edata: null },
                      { emon: null, ex: 0, ey: 0, edata: null }];

function db_e_at(x, y) {
    for (const e of db_occupants)
        if (e.edata && e.ex === x && e.ey === y) return e;
    return null;
}

/* C dbridge.c:762-769 nokiller() */
function db_nokiller() {
    if (game.svk?.killer) { game.svk.killer.name = ''; game.svk.killer.format = 0; }
    db_occupants[0] = { emon: null, ex: 0, ey: 0, edata: null };
    db_occupants[1] = { emon: null, ex: 0, ey: 0, edata: null };
}

/* youprop.h: HXxx || EXxx (no `blocked` test except where the macro has one). */
function db_uprop(key) {
    const p = u_prop_(game.u, key);
    return !!((p.intrinsic | 0) || (p.extrinsic | 0));
}
/* youprop.h:260 Wwalking ((HWwalking || EWwalking) && !Is_waterlevel(&u.uz)) */
function db_Wwalking() { return db_uprop(WWALKING) && !Is_waterlevel(game.u.uz); }
/* youprop.h:266 Swimming (HSwimming || ESwimming || steed is_swimmer) */
function db_Swimming() {
    return db_uprop(SWIMMING)
        || !!(game.u.usteed && ((game.u.usteed.data?.mflags1 | 0) & 0x2) !== 0);
}

/* C dbridge.c:378-405 e_survives_at() */
function db_e_survives_at(etmp, x, y) {
    const ptr = etmp.edata, f1 = ptr?.mflags1 | 0, isu = db_is_u(etmp);
    if (db_noncorporeal(ptr)) return true;
    if (is_pool(x, y))
        return (isu && (db_Wwalking() || db_uprop(MAGICAL_BREATHING) || (f1 & 0x600) !== 0
                        || db_Swimming() || Flying_() || Levitation_()))
            || (f1 & 0x2) !== 0 /* is_swimmer */ || is_flyer_(ptr) || is_floater_(ptr);
    /* must force call to lava_effects in e_died if is_u */
    if (is_lava(x, y))
        return (isu && (Levitation_() || Flying_()))
            || ptr?.pmidx === PM_FIRE_ELEMENTAL || ptr?.pmidx === PM_SALAMANDER /* likes_lava */
            || is_flyer_(ptr);
    if (is_db_wall(x, y))
        return isu ? db_uprop(PASSES_WALLS) : db_passes_walls(ptr);
    return true;
}

/* C dbridge.c:532-556 e_jumps() */
function db_e_jumps(etmp) {
    let tmp = 4; /* out of 10 */
    const isu = db_is_u(etmp), m = etmp.emon;
    if (isu ? (Unaware_real() || db_uprop(FUMBLING))
            : (helpless(m) || !(etmp.edata?.mmove | 0) || (m.wormno | 0)))
        return false;
    if (isu ? !!(u_prop_(game.u, CONFUSION).intrinsic | 0) : m.mconf) tmp -= 2; /* Confusion == HConfusion */
    if (isu ? !!(u_prop_(game.u, STUNNED).intrinsic | 0) : m.mstun) tmp -= 3; /* Stunned == HStun */
    if (is_db_wall(etmp.ex, etmp.ey)) tmp -= 2; /* less room to maneuver */
    return tmp >= rnd(10);
}

/* C dbridge.c:558-756 do_entity() */
async function db_do_entity(etmp) {
    if (!etmp.edata) return;
    let e_inview = db_e_canseemon(etmp);
    const oldx = etmp.ex, oldy = etmp.ey;
    const at_portcullis = is_db_wall(oldx, oldy);
    const crm = game.level.at(oldx, oldy);
    let must_jump = false, relocates = false;
    if (db_automiss(etmp) && db_e_survives_at(etmp, oldx, oldy)) {
        if (e_inview && (at_portcullis || IS_DRAWBRIDGE(crm.typ | 0)))
            await pline('The %s passes through %s!', at_portcullis ? 'portcullis' : 'drawbridge', db_e_nam(etmp));
        if (db_is_u(etmp)) await spoteffects(false);
        return;
    }
    if (db_e_missed(etmp, false)) {
        if (at_portcullis) await pline('The portcullis misses %s!', db_e_nam(etmp));
        if (db_e_survives_at(etmp, oldx, oldy)) return;
        if (at_portcullis) must_jump = true;
        else relocates = true; /* just ride drawbridge in */
    } else {
        if ((crm.typ | 0) === DRAWBRIDGE_DOWN) {
            if (db_is_u(etmp)) db_set_killer('crushed to death underneath a drawbridge', NO_KILLER_PREFIX);
            await pline('%s crushed underneath the drawbridge.', db_E_phrase(etmp, 'are'));
            await db_e_died(etmp, XKILL_NOCORPSE | (e_inview ? XKILL_GIVEMSG : XKILL_NOMSG), CRUSHING);
            return;
        }
        must_jump = true;
    }
    if (must_jump) {
        if (at_portcullis) {
            if (db_e_jumps(etmp)) {
                relocates = true;
            } else {
                if (e_inview)
                    await pline('%s crushed by the falling portcullis!', db_E_phrase(etmp, 'are'));
                else if (!Deaf_real())
                    await You_hear('a crushing sound.');
                await db_e_died(etmp, XKILL_NOCORPSE | (e_inview ? XKILL_GIVEMSG : XKILL_NOMSG), CRUSHING);
                return;
            }
        } else { /* tries to jump off bridge to original square */
            relocates = !db_e_jumps(etmp);
        }
    }
    /* C dbridge.c:644-648 ignores find_drawbridge's return value.  After
     * destruction it can fail, but get_wall_for_db still uses the square's
     * current mask (including a cleared mask, whose direction is NORTH). */
    const nx = { value: oldx }, ny = { value: oldy };
    find_drawbridge(nx, ny);
    let newx = nx.value, newy = ny.value;
    if (newx === oldx && newy === oldy) {
        switch ((game.level.at(newx, newy).drawbridgemask | 0) & DB_DIR) {
        case DB_NORTH: newy--; break;
        case DB_SOUTH: newy++; break;
        case DB_EAST: newx++; break;
        case DB_WEST: newx--; break;
        }
    }
    if (relocates && db_e_at(newx, newy)) {
        const other = db_e_at(newx, newy);
        if (db_e_survives_at(other, newx, newy) && db_automiss(other)) {
            relocates = false; /* "other" won't budge */
        } else {
            while (db_e_at(newx, newy) && db_e_at(newx, newy) !== etmp)
                await db_do_entity(other);
            if (db_e_at(oldx, oldy) !== etmp) return;
        }
    }
    if (relocates && !db_e_at(newx, newy)) {
        if (!db_is_u(etmp)) {
            place_monster(etmp.emon, newx, newy);
            update_monster_region(etmp.emon);
        } else {
            game.u.ux = newx; game.u.uy = newy;
        }
        etmp.ex = newx; etmp.ey = newy;
        e_inview = db_e_canseemon(etmp);
    }
    if (is_db_wall(etmp.ex, etmp.ey)) {
        if (e_inview) {
            if (db_is_u(etmp)) {
                await pline('You tumble towards the closed portcullis!');
                if (db_automiss(etmp)) await pline('You pass through it!');
                else await pline('The drawbridge closes in...');
            } else await pline('%s behind the drawbridge.', db_E_phrase(etmp, 'disappear'));
        }
        if (!db_e_survives_at(etmp, etmp.ex, etmp.ey)) {
            db_set_killer('closing drawbridge');
            await db_e_died(etmp, XKILL_NOMSG, CRUSHING);
        }
        return;
    }
    if (is_pool(etmp.ex, etmp.ey) && !e_inview && !Deaf_real())
        await You_hear('a splash.');
    if (db_e_survives_at(etmp, etmp.ex, etmp.ey)) {
        if (e_inview && !is_flyer_(etmp.edata) && !is_floater_(etmp.edata))
            await pline('%s from the bridge.', db_E_phrase(etmp, 'fall'));
        return;
    }
    const pool = is_pool(etmp.ex, etmp.ey), lava = is_lava(etmp.ex, etmp.ey);
    if ((pool || lava) && e_inview && !db_is_u(etmp)) {
        if (_dig_hallucination())
            await pline('%s the %s and disappears.', db_E_phrase(etmp, 'drink'), lava ? 'lava' : 'moat');
        else
            await pline('%s into the %s.', db_E_phrase(etmp, 'fall'), lava ? hliquid('lava') : 'moat');
    }
    db_set_killer('fell from a drawbridge', NO_KILLER_PREFIX);
    await db_e_died(etmp, XKILL_NOCORPSE | (e_inview ? XKILL_GIVEMSG : XKILL_NOMSG),
                    pool ? DROWNING : lava ? BURNING : CRUSHING);
}

function db_e_nam(etmp) { return db_is_u(etmp) ? 'you' : mon_nam(etmp.emon); }

/* C dbridge.c:171-186 get_wall_for_db: find the drawbridge wall of a bridge. */
function get_wall_for_db(x, y) {
    switch ((game.level.at(x.value, y.value).drawbridgemask | 0) & DB_DIR) {
    case DB_NORTH: y.value--; break;
    case DB_SOUTH: y.value++; break;
    case DB_EAST: x.value++; break;
    case DB_WEST: x.value--; break;
    }
}

/* distu(x, y) */
function db_distu(x, y) {
    const u = game.u;
    return (u.ux - x) * (u.ux - x) + (u.uy - y) * (u.uy - y);
}

/* C dbridge.c:777-840 close_drawbridge(x, y) */
export async function close_drawbridge(x, y) {
    const lev1 = game.level.at(x, y);
    if ((lev1.typ | 0) !== DRAWBRIDGE_DOWN)
        return;
    const w = { value: x }, wy = { value: y };
    get_wall_for_db(w, wy);
    const x2 = w.value, y2 = wy.value;
    if (cansee(x, y) || cansee(x2, y2)) {
        const u = game.u;
        await You_see(`a drawbridge ${(((u.ux === x || u.uy === y) && !u.uinwater)
                                       || db_distu(x2, y2) < db_distu(x, y))
            ? 'coming' : 'going'} up!`);
    } else { /* "5 gears turn" for castle drawbridge tune */
        Soundeffect(se_chains_rattling_gears_turning, 75);
        await You_hear('chains rattling and gears turning.');
    }
    lev1.typ = DRAWBRIDGE_UP;
    const lev2 = game.level.at(x2, y2);
    lev2.typ = DBWALL;
    switch ((lev1.drawbridgemask | 0) & DB_DIR) {
    case DB_NORTH:
    case DB_SOUTH:
        lev2.horizontal = true;
        break;
    case DB_WEST:
    case DB_EAST:
        lev2.horizontal = false;
        break;
    }
    lev2.wall_info = W_NONDIGGABLE;
    db_occupants[0] = db_set_entity(x, y);
    db_occupants[1] = db_set_entity(x2, y2);
    await db_do_entity(db_occupants[0]);          /* Do set_entity after first */
    db_occupants[1] = db_set_entity(x2, y2); /* do_entity for worm tail */
    await db_do_entity(db_occupants[1]);
    if (OBJ_AT(x, y) && !Deaf_real()) {
        Soundeffect(se_smashing_and_crushing, 75);
        await You_hear('smashing and crushing.');
    }
    await revive_nasty(x, y, null);
    await revive_nasty(x2, y2, null);
    await delallobj(x, y);
    await delallobj(x2, y2);
    let t;
    if ((t = t_at(x, y))) deltrap(t);
    if ((t = t_at(x2, y2))) deltrap(t);
    del_engr_at(x, y);
    del_engr_at(x2, y2);
    newsym(x, y);
    newsym(x2, y2);
    block_point(x2, y2); /* vision */
    db_nokiller();
}

/* C dbridge.c:845-883 open_drawbridge(x, y) */
export async function open_drawbridge(x, y) {
    const lev1 = game.level.at(x, y);
    if ((lev1.typ | 0) !== DRAWBRIDGE_UP)
        return;
    const w = { value: x }, wy = { value: y };
    get_wall_for_db(w, wy);
    const x2 = w.value, y2 = wy.value;
    if (cansee(x, y) || cansee(x2, y2)) {
        await You_see(`a drawbridge ${db_distu(x2, y2) < db_distu(x, y) ? 'going' : 'coming'} down!`);
    } else { /* "5 gears turn" for castle drawbridge tune */
        Soundeffect(se_gears_turning_chains_rattling, 100);
        await You_hear('gears turning and chains rattling.');
    }
    lev1.typ = DRAWBRIDGE_DOWN;
    const lev2 = game.level.at(x2, y2);
    lev2.typ = DOOR;
    lev2.doormask = D_NODOOR;
    db_occupants[0] = db_set_entity(x, y);
    db_occupants[1] = db_set_entity(x2, y2);
    await db_do_entity(db_occupants[0]);          /* do set_entity after first */
    db_occupants[1] = db_set_entity(x2, y2); /* do_entity for worm tails */
    await db_do_entity(db_occupants[1]);
    await revive_nasty(x, y, null);
    await delallobj(x, y);
    let t;
    if ((t = t_at(x, y))) deltrap(t);
    if ((t = t_at(x2, y2))) deltrap(t);
    del_engr_at(x, y);
    del_engr_at(x2, y2);
    newsym(x, y);
    newsym(x2, y2);
    unblock_point(x2, y2); /* vision */
    if (Is_stronghold(game.u.uz))
        (game.u.uevent ||= {}).uopened_dbridge = true;
    db_nokiller();
}
