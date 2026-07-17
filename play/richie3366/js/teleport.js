// teleport.js — Placement helpers for makemon/makedog.
// C ref: teleport.c — collect_coords, enexto_core (NEW_ENEXTO), goodpos (partial).

import { game } from './gstate.js';
import { rn2, rn1, rnd, rnl } from './rng.js';
import {
    COLNO, ROWNO,
    CC_NO_FLAGS, CC_INCL_CENTER, CC_UNSHUFFLED, CC_RING_PAIRS,
    CC_SKIP_MONS, CC_SKIP_INACCS,
    GP_CHECKSCARY, GP_ALLOW_U, GP_AVOID_MONPOS, GP_ALLOW_XY,
    MM_IGNOREWATER, MM_IGNORELAVA,
    ACCESSIBLE, IS_POOL, IS_LAVA, ZAP_POS, IS_DOOR, IS_WATERWALL,
    D_CLOSED, D_LOCKED,
    MIGR_RANDOM, MON_MIGRATING, NO_TRAP,
    ROOM, CORR, ICE, VAULT, SHOPBASE, ANY_SHOP,
    LAVAPOOL, LAVAWALL, IS_FURNITURE, TELEDS_TELEPORT,
    UTOTYPE_NONE,
    is_hole, Is_stronghold, Is_botlevel, Is_knox_level,
    In_endgame, In_sokoban, In_quest, Is_waterlevel,
} from './const.js';
import { objects_at, mksobj } from './mkobj.js';
import { objectNames, SPBOOK_CLASS } from './objects.js';
import {
    amorphous, throws_rocks, is_flyer, is_floater, is_swimmer, likes_lava,
    monsterNames,
} from './monsters.js';
import { newsym, pline, You_feel, see_monsters } from './display.js';
import { vision_recalc } from './vision.js';
import { nomul } from './hack.js';
import { makeknown, prinv } from './invent.js';
import { more_experienced } from './exper.js';
import { getlin } from './getline.js';
import { get_level } from './dungeon.js';
import { depth } from './hacklib.js';
import { addinv } from './u_init.js';
const AMULET_OF_YENDOR = objectNames.indexOf('AMULET_OF_YENDOR');

// trap.h return codes — avoid importing trap.js (cycle with trapeffect_hole)
const Trap_Effect_Finished = 0;
const Trap_Moved_Mon = 4;

const BOULDER = objectNames.indexOf('BOULDER');
const PM_FLOATING_EYE = monsterNames.indexOf('PM_FLOATING_EYE');

function isok(x, y) {
    return x >= 1 && x < COLNO && y >= 0 && y < ROWNO;
}

function u_at(x, y) {
    return game.u?.ux === x && game.u?.uy === y;
}

function m_at(x, y) {
    // C: level.monsters[][] — include worm body segs (place_worm_seg).
    const seg = game._level_monsters?.get(`${x},${y}`);
    if (seg) return seg;
    const list = game.fmon || [];
    for (const m of list) {
        if (m.mx === x && m.my === y) return m;
    }
    return null;
}

/** C ref: monmove.c closed_door — IS_DOOR && (CLOSED|LOCKED). */
function closed_door(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    return !!((loc.doormask || 0) & (D_CLOSED | D_LOCKED));
}

/**
 * C ref: monmove.c accessible — ACCESSIBLE(SURFACE_AT) && !closed_door.
 * DRAWBRIDGE_UP under-typ (SURFACE_AT) deferred.
 */
function accessible(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    return ACCESSIBLE(loc.typ) && !closed_door(x, y);
}

function sobj_at(otyp, x, y) {
    for (let o = objects_at(x, y); o; o = o.nexthere) {
        if ((o.otyp | 0) === otyp) return o;
    }
    return null;
}

/**
 * C ref: teleport.c goodpos_onscary — fakemon (m_id==0) scary approx.
 * Elbereth / SCR_SCARE_MONSTER / altar-vampire arms deferred (named omission).
 */
function goodpos_onscary(_x, _y, mptr) {
    if (!mptr) return false;
    if (mptr.mlet === 'S_HUMAN' || mptr.mlet === 'S_ANGEL') return false;
    return false;
}

/**
 * C ref: mon.c m_in_air — flyer/floater; cling+ceiling mundetected deferred.
 * Local copy avoids mon.js ↔ teleport cycle.
 */
function m_in_air(mtmp) {
    const ptr = mtmp?.data;
    if (!ptr) return false;
    return !!(is_flyer(ptr) || is_floater(ptr));
}

/**
 * C ref: teleport.c goodpos() — placement / enexto suitability.
 * Named omissions: youmonst swim/levitate pool·lava arms; passes_walls /
 * may_passwall early-out; GP_AVOID_MONPOS exclusion zones.
 */
export function goodpos(x, y, mtmp, gpflags = 0) {
    if (!isok(x, y)) return false;
    const allow_u = (gpflags & GP_ALLOW_U) !== 0;
    const avoid_monpos = (gpflags & GP_AVOID_MONPOS) !== 0;
    const ignorewater = (gpflags & MM_IGNOREWATER) !== 0;
    const ignorelava = (gpflags & MM_IGNORELAVA) !== 0;
    const checkscary = (gpflags & GP_CHECKSCARY) !== 0;

    if (!allow_u && u_at(x, y)) return false;
    if (avoid_monpos && m_at(x, y)) return false;

    const loc = game.level?.at(x, y);
    if (!loc) return false;
    const typ = loc.typ;
    let mdat = mtmp?.data ?? null;

    if (mtmp) {
        const mtmp2 = m_at(x, y);
        // C: occupied by another mon (fakemon mx=0 never equals occupant)
        if (mtmp2 && (mtmp2 !== mtmp || mtmp.wormno)) return false;

        // C: is_pool / is_swimmer / m_in_air — D-0653 (was blanket reject)
        if (IS_POOL(typ) && !ignorewater) {
            return !!(is_swimmer(mdat)
                || (!Is_waterlevel(game.u?.uz)
                    && !IS_WATERWALL(typ)
                    && m_in_air(mtmp)));
        } else if (mdat?.mlet === 'S_EEL' && rn2(13) && !ignorewater) {
            return false;
        } else if (IS_LAVA(typ) && !ignorelava) {
            // C: PM_FLOATING_EYE avoids lava heat
            if (mdat && (mdat.mndx ?? -1) === PM_FLOATING_EYE) return false;
            return !!(m_in_air(mtmp) || likes_lava(mdat));
        }
        // passes_walls + may_passwall deferred
        // C: amorphous may ooze through closed doors before accessible()
        if (amorphous(mdat) && closed_door(x, y)) return true;
        if (checkscary && goodpos_onscary(x, y, mdat)) return false;
    } else {
        if (IS_POOL(typ) && !ignorewater) return false;
        if (IS_LAVA(typ) && !ignorelava) return false;
    }

    // C: accessible() — rejects closed/locked doors (bare ACCESSIBLE is wrong)
    if (!accessible(x, y)) {
        if (!(IS_POOL(typ) && ignorewater) && !(IS_LAVA(typ) && ignorelava)) {
            return false;
        }
    }
    if (sobj_at(BOULDER, x, y) && (!mdat || !throws_rocks(mdat))) return false;
    return true;
}

// C ref: teleport.c collect_coords()
export function collect_coords(ccc, cx, cy, maxradius, cc_flags, filter) {
    let n = 0;
    let result = 0;
    let passcc = null;

    const include_cxcy = (cc_flags & CC_INCL_CENTER) !== 0;
    const scramble = (cc_flags & CC_UNSHUFFLED) === 0;
    const ring_pairs = scramble && (cc_flags & CC_RING_PAIRS) !== 0;
    const skip_mons = (cc_flags & CC_SKIP_MONS) !== 0;
    const skip_inaccessible = (cc_flags & CC_SKIP_INACCS) !== 0;

    const rowrange = (cy < ROWNO / 2) ? (ROWNO - 1 - cy) : cy;
    const colrange = (cx < COLNO / 2) ? (COLNO - 1 - cx) : cx;
    let k = Math.max(rowrange, colrange);
    if (!maxradius) maxradius = k;
    else maxradius = Math.min(maxradius, k);

    for (let radius = include_cxcy ? 0 : 1; radius <= maxradius; ++radius) {
        let newpass, passend;
        if (!ring_pairs) {
            newpass = passend = true;
        } else {
            newpass = ((radius % 2) !== 0 || radius === 0);
            passend = ((radius % 2) === 0 || radius === maxradius);
        }
        if (newpass || !passcc) {
            passcc = { base: result, n: 0 }; // track slice start in ccc
            n = 0;
        }
        const lox = cx - radius, hix = cx + radius;
        const loy = cy - radius, hiy = cy + radius;
        for (let y = Math.max(loy, 0); y <= hiy; ++y) {
            if (y > ROWNO - 1) break;
            for (let x = Math.max(lox, 1); x <= hix; ++x) {
                if (x > COLNO - 1) break;
                if (x !== lox && x !== hix && y !== loy && y !== hiy) continue;
                if (skip_mons && m_at(x, y)) continue;
                const loc = game.level?.at(x, y);
                if (skip_inaccessible && loc && !ZAP_POS(loc.typ)) continue;
                if (filter && !filter(x, y)) continue;
                ccc.push({ x, y });
                ++n;
                ++result;
                if (passcc) passcc.n = n;
            }
        }
        if (scramble && passend) {
            // Shuffle entries gathered for current radius (or pair)
            // C: passcc points at start of this pass's entries
            const start = result - n;
            let nn = n;
            let off = start;
            while (nn > 1) {
                const kk = rn2(nn);
                if (kk) {
                    const tmp = ccc[off];
                    ccc[off] = ccc[off + kk];
                    ccc[off + kk] = tmp;
                }
                ++off;
                --nn;
            }
        }
    }
    return result;
}

// C ref: teleport.c enexto_core (NEW_ENEXTO)
export function enexto_core(cc, xx, yy, mdat, entflags) {
    const candy = [];
    const allow_xx_yy = (entflags & GP_ALLOW_XY) !== 0;
    const fakemon = { data: mdat, mx: 0, my: 0, wormno: 0 };

    const nearcandyct = collect_coords(candy, xx, yy, 3, CC_NO_FLAGS, null);
    for (let i = 0; i < nearcandyct; ++i) {
        cc.x = candy[i].x;
        cc.y = candy[i].y;
        if (goodpos(cc.x, cc.y, fakemon, entflags)) return true;
    }

    const allStart = candy.length;
    const allcandyct = collect_coords(candy, xx, yy, 0, CC_NO_FLAGS, null);
    // nearcandyct spots already rejected (different order, same total)
    for (let i = nearcandyct; i < allcandyct; ++i) {
        // allcandyct is count from second collect which appended; indices from allStart
        const spot = candy[allStart + (i - nearcandyct)];
        if (!spot) continue;
        cc.x = spot.x;
        cc.y = spot.y;
        if (goodpos(cc.x, cc.y, fakemon, entflags)) return true;
    }

    cc.x = xx;
    cc.y = yy;
    if (allow_xx_yy && goodpos(cc.x, cc.y, fakemon, entflags)) return true;
    return false;
}

export function enexto(cc, xx, yy, mdat) {
    return enexto_core(cc, xx, yy, mdat, GP_CHECKSCARY)
        || enexto_core(cc, xx, yy, mdat, 0);
}

// C ref: teleport.c enexto_gpflags()
export function enexto_gpflags(cc, xx, yy, mdat, entflags) {
    return enexto_core(cc, xx, yy, mdat, GP_CHECKSCARY | entflags)
        || enexto_core(cc, xx, yy, mdat, entflags);
}

/**
 * C ref: teleport.c rloc_to — place monster at (x,y); RLOC_NOMSG path.
 * Omits worm/shk/vision/message branches.
 */
export function rloc_to(mtmp, x, y) {
    if (!mtmp) return;
    mtmp.mx = x;
    mtmp.my = y;
    mtmp.mux = game.u?.ux ?? x;
    mtmp.muy = game.u?.uy ?? y;
}

/**
 * C ref: teleport.c noteleport_level — ordinary flags; hell court deferred.
 * Covetous monsters bypass level.flags.noteleport (Vlad on tower1).
 */
function noteleport_level(mon) {
    const M3_COVETOUS = 0x001f;
    const covetous = !!((mon?.data?.mflags3 ?? 0) & M3_COVETOUS);
    if (game.level?.flags?.noteleport && !covetous) return true;
    if ((game.level?.flags?.stasis_until ?? -1) >= (game.moves ?? 0)) return true;
    return false;
}

/** C ref: mkroom.c search_special — first room/subroom matching type. */
function search_special(type) {
    const lists = [game.level?.rooms, game.level?.subrooms];
    for (const rooms of lists) {
        if (!rooms) continue;
        for (const croom of rooms) {
            if (!croom || (croom.hx | 0) < 0) break;
            const rt = croom.rtype | 0;
            if ((type === ANY_SHOP && rt >= SHOPBASE) || rt === type) {
                return croom;
            }
        }
    }
    return null;
}

/** Local trap-at check — avoid importing trap.js (cycle). */
function trap_at(x, y) {
    const ftrap = game.ftrap;
    if (Array.isArray(ftrap)) {
        for (const t of ftrap) {
            if (t && (t.tx | 0) === x && (t.ty | 0) === y) return t;
        }
    } else {
        for (let t = ftrap; t; t = t.ntrap) {
            if ((t.tx | 0) === x && (t.ty | 0) === y) return t;
        }
    }
    const traps = game.level?.traps;
    if (Array.isArray(traps)) {
        for (const t of traps) {
            if (t && (t.tx | 0) === x && (t.ty | 0) === y) return t;
        }
    }
    return null;
}

/** C ref: mklev.c occupied — trap/furniture/lava/pool (invocation deferred). */
function occupied(x, y) {
    if (!isok(x, y)) return false;
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    return !!(trap_at(x, y)
        || IS_FURNITURE(loc.typ)
        || loc.typ === LAVAPOOL || loc.typ === LAVAWALL
        || IS_POOL(loc.typ));
}

function somex(croom) {
    return rn1((croom.hx | 0) - (croom.lx | 0) + 1, croom.lx | 0);
}
function somey(croom) {
    return rn1((croom.hy | 0) - (croom.ly | 0) + 1, croom.ly | 0);
}

/**
 * C ref: mkroom.c somexy — vault/ordinary: !irregular && !nsubrooms → one
 * somex+somey. Irregular/subroom reject loops deferred (named omission).
 */
function somexy(croom, c) {
    if (croom.irregular || (croom.nsubrooms | 0)) {
        // Named omission: irregular edge/roomno + subroom inside_room reject
        c.x = somex(croom);
        c.y = somey(croom);
        return true;
    }
    c.x = somex(croom);
    c.y = somey(croom);
    return true;
}

/** C ref: mkroom.c somexyspace */
function somexyspace(croom, c) {
    let trycnt = 0;
    let okay;
    do {
        okay = somexy(croom, c) && isok(c.x, c.y) && !occupied(c.x, c.y);
        if (okay) {
            const loc = game.level?.at(c.x, c.y);
            okay = !!(loc && (loc.typ === ROOM || loc.typ === CORR || loc.typ === ICE));
        }
    } while (trycnt++ < 100 && !okay);
    return okay;
}

/**
 * C ref: teleport.c rloc — random reposition (RLOC_NONE / RLOC_MSG subset).
 * Envelope: collect_coords ring from current/hero + goodpos; wizard/steed
 * /rloc_pos_ok shop-priest arms deferred.
 */
export function rloc(mtmp, _rlocflags = 0) {
    if (!mtmp) return false;
    if (mtmp === game.u?.usteed) return false;
    const candy = [];
    const cx = (mtmp.mx | 0) || (game.u?.ux | 0) || 1;
    const cy = (mtmp.my | 0) || (game.u?.uy | 0) || 0;
    const candycount = collect_coords(
        candy, cx, cy, 0,
        CC_RING_PAIRS | CC_SKIP_MONS | CC_SKIP_INACCS,
        null,
    );
    for (let i = 0; i < candycount; i++) {
        const x = candy[i].x | 0;
        const y = candy[i].y | 0;
        if (goodpos(x, y, mtmp, 0)) {
            rloc_to(mtmp, x, y);
            return true;
        }
    }
    return false;
}

/**
 * C ref: teleport.c mvault_tele — place mon into VAULT via somexyspace.
 */
function mvault_tele(mtmp) {
    const croom = search_special(VAULT);
    const c = { x: 0, y: 0 };
    if (croom && somexyspace(croom, c) && goodpos(c.x, c.y, mtmp, 0)) {
        rloc_to(mtmp, c.x, c.y);
        return;
    }
    rloc(mtmp, 0);
}

/**
 * C ref: teleport.c mtele_trap — monster TELEP_TRAP.
 * Envelope: noteleport_level; teleport_pet; once → mvault_tele; else
 * teledest rloc_to if free; else rloc. Caller handles in_sight pline/seetrap.
 * Named omission: RLOC_MSG vanish text inside rloc_to_core.
 */
export function mtele_trap(mtmp, trap) {
    if (!mtmp || !trap) return false;
    if (noteleport_level(mtmp)) return false;
    if (!teleport_pet(mtmp, false)) return false;

    if (trap.once) {
        mvault_tele(mtmp);
    } else if (isok(trap.teledest?.x, trap.teledest?.y)) {
        const dx = trap.teledest.x | 0;
        const dy = trap.teledest.y | 0;
        if (!(m_at(dx, dy) || u_at(dx, dy))) {
            rloc_to(mtmp, dx, dy);
        }
    } else {
        rloc(mtmp, 0);
    }
    return true;
}

/**
 * C ref: teleport.c teleok — trapok/goodpos subset; tele_jump_ok /
 * in_out_region named omitted (always allow for ordinary vault dest).
 */
function teleok(x, y, trapok) {
    if (!trapok) {
        if (trap_at(x, y)) return false;
    }
    const you = game.youmonst || null;
    if (!goodpos(x, y, you, 0)) return false;
    return true;
}

/**
 * C ref: teleport.c teleds — hero placement subset for vault_tele.
 * Envelope: place + vision; TELEDS_TELEPORT+verbose materialize pline;
 * spoteffects(TRUE) after (nested ok — C does the same).
 * Named omissions: ball/chain, swallow, vault_guard uleftvault, regions,
 * drag_ball, switch_terrain, notice_mon_*; shop-enter plines beyond
 * spoteffects subset.
 *
 * Do NOT set u.urooms before spoteffects — C only temporarily fakes
 * urooms for vault_guard exit, then restores so move_update can detect
 * newly entered TEMPLE/shop rooms (D-0639).
 */
export async function teleds(nux, nuy, teleds_flags) {
    const u = game.u;
    if (!u) return;
    const is_teleport = ((teleds_flags | 0) & TELEDS_TELEPORT) !== 0;
    const ox = u.ux | 0;
    const oy = u.uy | 0;
    u.ux0 = ox;
    u.uy0 = oy;
    u.ux = nux | 0;
    u.uy = nuy | 0;
    if (u.usteed) {
        u.usteed.mx = u.ux;
        u.usteed.my = u.uy;
    }
    // u.utrap clear on teleport
    u.utrap = 0;
    u.utraptype = 0;
    newsym(ox, oy);
    newsym(u.ux, u.uy);
    // C: see_monsters() before vision — refresh warns at new distu
    see_monsters();
    // C: vision_recalc(0) before materialize so --More-- shows new map
    game.vision_full_recalc = 1;
    nomul(0);
    vision_recalc(0);
    if (!game.flags) game.flags = {};
    game.flags.botl = true;
    /* C: after vision so --More-- paints the destination map */
    if (is_teleport && game.flags.verbose !== false) {
        const same = (nux === u.ux0 && nuy === u.uy0);
        await pline(`You materialize in ${same ? 'the same' : 'a different'} location!`);
    }
    // C: vault_guard temporary urooms fake then restore — deferred (no guard)
    // C: spoteffects(TRUE) → move_update detects temple/shop entry
    const { spoteffects } = await import('./pickup.js');
    await spoteffects(true);
}

/**
 * C ref: read.c learnscrolltyp / learnscroll — makeknown + XP when new.
 * Local copy so teleport.js does not import read.js (cycle).
 */
function learnscroll(sobj) {
    if (!sobj || sobj.oclass === SPBOOK_CLASS) return;
    const otyp = sobj.otyp | 0;
    const oc = game.objects?.[otyp];
    if (!oc || oc.oc_name_known) return;
    makeknown(otyp);
    more_experienced(0, 10);
}

/**
 * C ref: teleport.c safe_teleds — random teleok spots then collect_coords.
 * Envelope: 40× rnd(COLNO-1)/rn2(ROWNO) + candy teleok(FALSE) with first
 * trap backup via teleok(TRUE).
 * @returns {Promise<boolean>}
 */
export async function safe_teleds(teleds_flags) {
    let nux; let nuy;
    for (let tcnt = 0; tcnt < 40; ++tcnt) {
        nux = rnd(COLNO - 1);
        nuy = rn2(ROWNO);
        if (teleok(nux, nuy, false)) {
            await teleds(nux, nuy, teleds_flags);
            return true;
        }
    }

    let cc_flags = CC_RING_PAIRS | CC_SKIP_MONS;
    const Passes_walls = !!(game.u?.Passes_walls || game.u?.HPasses_walls
        || game.u?.EPasses_walls);
    if (!Passes_walls) cc_flags |= CC_SKIP_INACCS;
    const candy = [];
    const candycount = collect_coords(
        candy, game.u.ux | 0, game.u.uy | 0, 0, cc_flags, null,
    );
    const backupspot = { x: 0, y: 0 };
    for (let tcnt = 0; tcnt < candycount; ++tcnt) {
        nux = candy[tcnt].x;
        nuy = candy[tcnt].y;
        if (teleok(nux, nuy, false)) {
            await teleds(nux, nuy, teleds_flags);
            return true;
        }
        if (!backupspot.x && trap_at(nux, nuy) && teleok(nux, nuy, true)) {
            backupspot.x = nux;
            backupspot.y = nuy;
        }
    }
    if (backupspot.x) {
        await teleds(backupspot.x, backupspot.y, teleds_flags);
        return true;
    }
    return false;
}

/**
 * C ref: teleport.c scrolltele — scroll/intrinsic teleport placement.
 * Envelope: noteleport pline; wizard/Teleport_control getpos path;
 * uncontrolled → learnscroll + safe_teleds.
 * Named omissions: make_blinded clear; W-tower half of amulet gate;
 * unconscious controlled fail; steed whobuf; travelcc pre-suggest polish.
 */
export async function scrolltele(scroll) {
    const flags = game.flags || {};
    const wizard = !!(flags.debug || flags.wizard);
    if (noteleport_level(game.youmonst) && !wizard) {
        await pline('A mysterious force prevents you from teleporting!');
        if (scroll) learnscroll(scroll);
        return;
    }
    // make_blinded(0, FALSE) deferred
    const u = game.u || {};
    if ((u.uhave?.amulet || u.uhave_amulet) && !rn2(3)) {
        await pline('You feel disoriented for a moment.');
        if (!wizard) return;
        // wizard Override? yn deferred — treat as accept for now
    }
    const Teleport_control = !!(u.HTeleport_control || u.ETeleport_control
        || u.Teleport_control);
    const Stunned = !!(u.Stunned || u.HStun || u.EStun);
    if (((Teleport_control || (scroll && scroll.blessed)) && !Stunned)
        || wizard) {
        // unconscious deferred
        await pline('Where do you want to be teleported?');
        if (scroll) learnscroll(scroll);
        const cc = { x: u.ux | 0, y: u.uy | 0 };
        const travel = game.iflags?.travelcc;
        if (travel && isok(travel.x, travel.y)) {
            cc.x = travel.x | 0;
            cc.y = travel.y | 0;
        }
        const { getpos } = await import('./getpos.js');
        if ((await getpos(cc, true, 'the desired position')) < 0) return;
        if (teleok(cc.x, cc.y, false)) {
            await teleds(cc.x, cc.y, TELEDS_TELEPORT);
            return;
        }
        await pline('Sorry...');
    }

    if (scroll) learnscroll(scroll);
    await safe_teleds(TELEDS_TELEPORT);
}

/**
 * C ref: teleport.c tele — non-scroll teleport via scrolltele(NULL).
 */
export async function tele() {
    await scrolltele(null);
}

/**
 * C ref: teleport.c dotele — #teleport / ^T body.
 * Ported: wizard break_the_rules → tele() + morehungry;
 * trap/vault/energy/spellcast arms deferred.
 */
export async function dotele(break_the_rules) {
    // trap-at-feet arms deferred
    if (!break_the_rules) {
        // energy / Teleportation / spellcast gate deferred — fail closed
        const u = game.u || {};
        const Teleportation = !!(u.HTeleportation || u.ETeleportation
            || u.Teleportation);
        if (!Teleportation) {
            await pline('You are not able to teleport at will.');
            return false;
        }
    }
    // next_to_u leash gate — always true without leash wiring
    await tele();
    // C: if (!trap) morehungry(100)
    const { morehungry } = await import('./eat.js');
    morehungry(100);
    return true;
}

/**
 * C ref: teleport.c dotelecmd — ^T command.
 * Wizard without menu_requested → ignore restrictions (debug ^T).
 * Named omissions: m-prefix mode menu; tport_spell hide/add.
 */
export async function dotelecmd() {
    const flags = game.flags || {};
    const wizard = !!(flags.debug || flags.wizard);
    if (!wizard) {
        return (await dotele(false)) ? 1 : 0; // ECMD_TIME : ECMD_OK
    }
    let ignore = true;
    if (game.iflags?.menu_requested) {
        // m ^T mode menu deferred — fall back to ignore restrictions
        game.iflags.menu_requested = false;
        ignore = true;
    }
    return (await dotele(ignore)) ? 1 : 0;
}

/** C ref: dungeon.c single_level_branch — Is_knox only (Ludios). */
function single_level_branch(lev) {
    return Is_knox_level(lev);
}

/** C ref: dungeon.c dunlevs_in_dungeon. */
function dunlevs_in_dungeon(lev) {
    return game.dungeons?.[lev?.dnum]?.num_dunlevs ?? 1;
}

/** C ref: dungeon.h Inhell — hellish dungeon flag. */
function Inhell() {
    return !!(game.dungeons?.[game.u?.uz?.dnum]?.flags?.hellish);
}

/**
 * C ref: teleport.c random_teleport_level — absolute depth for random
 * levelport. Ported: rn2(5)/single_level/endgame stay; quest locate
 * clamp; Gehennom !invoked max-1; rn2 range + botlevel/min rnd polish.
 */
export function random_teleport_level() {
    const u = game.u || {};
    const uz = u.uz || { dnum: 0, dlevel: 1 };
    const cur_depth = depth(uz) | 0;

    // C: !rn2(5) || single_level_branch || In_endgame → stay
    if (!rn2(5) || single_level_branch(uz) || In_endgame(uz)) {
        return cur_depth;
    }

    let min_depth;
    let max_depth;
    if (In_quest(uz)) {
        let bottom = dunlevs_in_dungeon(uz);
        const qlocate_depth = game.qlocate_level?.dlevel;
        const reached = game.dungeons?.[uz.dnum]?.dunlev_ureached ?? 0;
        if (qlocate_depth != null && reached < qlocate_depth) {
            bottom = qlocate_depth;
        }
        min_depth = (game.dungeons?.[uz.dnum]?.depth_start | 0) || 1;
        max_depth = bottom + (((game.dungeons?.[uz.dnum]?.depth_start | 0) || 1) - 1);
    } else {
        min_depth = 1;
        max_depth = dunlevs_in_dungeon(uz)
            + (((game.dungeons?.[uz.dnum]?.depth_start | 0) || 1) - 1);
        if (Inhell() && !u.uevent?.invoked) max_depth -= 1;
    }

    // Range is 1 to current+3, current not counting
    let nlev = rn2(cur_depth + 3 - min_depth) + min_depth;
    if (nlev >= cur_depth) nlev++;

    if (nlev > max_depth) {
        nlev = max_depth;
        if (Is_botlevel(uz)) nlev -= rnd(3);
    }
    if (nlev < min_depth) {
        nlev = min_depth;
        if (nlev === cur_depth) {
            nlev += rnd(3);
            if (nlev > max_depth) nlev = max_depth;
        }
    }
    return nlev;
}

/**
 * C ref: teleport.c level_tele — controlled/wizard dungeon-level port.
 *
 * Ported: wizard/Teleport_control getlin numeric path → get_level →
 * schedule_goto (deferred_goto after rhack); wizard `?` /
 * menu_requested → print_dungeon(TRUE) force_dest; endgame dest
 * AMULET_OF_YENDOR grant via mksobj+addinv (D-0549); In_endgame
 * wizard negative dest → dlevel = dunlevs + newlev (D-0560);
 * Confusion/`*` / involuntary → random_teleport_level (D-0575). Named
 * omissions: lev_by_name; bymenu=FALSE print_dungeon; heaven/escape
 * outside endgame; Quest depth remap polish; find_hell; Nowhere
 * suicide yn; next_to_u leash body; buried ball; debug_fuzzer.
 */
export async function level_tele() {
    const u = game.u || {};
    const flags = game.flags || {};
    const wizard = !!(flags.debug || flags.wizard);
    const Teleport_control = !!(u.HTeleport_control || u.ETeleport_control
        || u.Teleport_control);
    const Stunned = !!(u.Stunned || u.HStun || u.EStun);

    if (((u.uhave?.amulet || u.uhave_amulet) || In_endgame(u.uz) || In_sokoban(u.uz))
        && !wizard) {
        await You_feel('very disoriented for a moment.');
        return;
    }

    let newlev = 0;
    const newlevel = { dnum: 0, dlevel: 0 };
    let force_dest = false;
    let use_random = false;

    if ((Teleport_control && !Stunned) || wizard) {
        let qbuf = 'To what level do you want to teleport?';
        let trycnt = 0;
        let buf = '';
        let menuNow = false;
        do {
            if (game.iflags?.menu_requested) {
                game.iflags.menu_requested = false;
                if (wizard) menuNow = true;
            }
            if (menuNow || (wizard && buf === '?')) {
                // C levTport_menu: print_dungeon(TRUE) → force_dest
                const { print_dungeon } = await import('./dungeon.js');
                const dest = { lev: 0, dgn: 0 };
                newlev = await print_dungeon(true, dest);
                if (!newlev) return;
                newlevel.dnum = dest.dgn | 0;
                newlevel.dlevel = dest.lev | 0;
                // C: In_endgame(&newlevel) && !In_endgame(&u.uz) →
                // mksobj(AMULET_OF_YENDOR) + addinv + prinv
                if (In_endgame(newlevel) && !In_endgame(u.uz)) {
                    if (!(u.uhave?.amulet || u.uhave_amulet)) {
                        const amu = mksobj(AMULET_OF_YENDOR, true, false);
                        if (amu) {
                            const held = addinv(amu);
                            if (!u.uhave) u.uhave = {};
                            u.uhave.amulet = 1;
                            u.uhave_amulet = 1;
                            await prinv('Endgame prerequisite:', held, 0);
                        }
                    }
                }
                force_dest = true;
                break;
            }
            if (++trycnt === 2) {
                qbuf += wizard
                    ? ' [type a number, name, or ? for a menu]'
                    : ' [type a number or name]';
            }
            buf = await getlin(qbuf);
            if (buf == null) buf = '';
            if (buf === '*') {
                // C: goto random_levtport
                use_random = true;
                break;
            }
            // C: Confusion && rnl(5) → Oops → random_levtport
            if ((u.HConfusion || u.Confusion) && rnl(5)) {
                await pline('Oops...');
                use_random = true;
                break;
            }
            if (buf === '\x1b') return;
            if (wizard && buf === '?') {
                // loop → print_dungeon on next iteration
                continue;
            }
            // lev_by_name deferred → atoi only
            const trimmed = String(buf).trim();
            if (/^-?\d+$/.test(trimmed)) {
                newlev = parseInt(trimmed, 10) | 0;
            } else {
                newlev = 0;
            }
        } while (
            !use_random
            && !newlev
            && !(buf.length && buf[0] >= '0' && buf[0] <= '9')
            && !(buf[0] === '-' && buf.length > 1 && buf[1] >= '0' && buf[1] <= '9')
            && trycnt < 10
        );

        if (!use_random && !force_dest) {
            if (newlev === 0) {
                if (trycnt >= 10) {
                    // C: goto random_levtport
                    use_random = true;
                } else {
                    // Nowhere suicide yn deferred — cancel
                    return;
                }
            } else if (single_level_branch(u.uz) && newlev > 0) {
                await pline('You shudder for a moment.');
                return;
            } else if (In_quest(u.uz) && newlev > 0) {
                // Quest Home-N status → logical depth
                const dun = game.dungeons?.[u.uz.dnum | 0];
                newlev = newlev + ((dun?.depth_start | 0) || 1) - 1;
            }
        }
    } else {
        // involuntary level tele
        use_random = true;
    }

    // C random_levtport:
    if (use_random) {
        newlev = random_teleport_level();
        if (newlev === depth(u.uz)) {
            await pline('You shudder for a moment.');
            return;
        }
        force_dest = false;
    }

    // next_to_u leash gate — always true without leash wiring

    // C: In_endgame — wizard relative planes: dlevel = llimit + newlev
    // (newlev in (-llimit, 0)); no materialize post_msg.
    if (In_endgame(u.uz)) {
        const llimit = (game.dungeons?.[u.uz.dnum | 0]?.num_dunlevs | 0) || 1;
        if (newlev >= 0 || newlev <= -llimit) {
            await pline("You can't get there from here.");
            return;
        }
        newlevel.dnum = u.uz.dnum | 0;
        newlevel.dlevel = llimit + newlev;
        const { schedule_goto } = await import('./do.js');
        schedule_goto(newlevel, UTOTYPE_NONE, null, null);
        return;
    }

    if (newlev < 0 && !force_dest) {
        // heaven / escape deferred
        await pline('You shudder for a moment.');
        return;
    }

    if (!force_dest) {
        get_level(newlevel, newlev);
        if ((newlevel.dnum | 0) === (u.uz?.dnum | 0)
            && (newlevel.dlevel | 0) === (u.uz?.dlevel | 0)
            && newlev !== depth(u.uz)) {
            await pline("You can't get there from here.");
            return;
        }
    }

    // Dynamic import avoids do.js ↔ teleport.js cycle (do imports enexto).
    const { schedule_goto } = await import('./do.js');
    schedule_goto(
        newlevel,
        UTOTYPE_NONE,
        null,
        flags.verbose ? 'You materialize on a different level!' : null,
    );
}
/**
 * C ref: teleport.c vault_tele — somexyspace into VAULT then teleds.
 * Named omission: tele() fallback RNG when no vault/space.
 */
export async function vault_tele() {
    const croom = search_special(VAULT);
    const c = { x: 0, y: 0 };
    if (croom && somexyspace(croom, c) && teleok(c.x, c.y, false)) {
        await teleds(c.x, c.y, TELEDS_TELEPORT);
        return true;
    }
    // tele() deferred — no vault room / no free cell
    return false;
}

/**
 * C ref: teleport.c tele_trap — hero TELEP_TRAP.
 * Envelope: once → deltrap handled by caller + vault_tele; endgame /
 * Antimagic / noteleport / next_to_u / teledest / tele() named partial.
 * Returns true if once-vault path ran (caller should deltrap).
 */
export async function tele_trap_once_vault() {
    const u = game.u;
    if (!u) return false;
    // In_endgame deferred
    const Antimagic = !!(u.Antimagic || u.HAntimagic || u.EAntimagic);
    if (Antimagic || noteleport_level(game.youmonst)) {
        return false; // wrenching — no RNG
    }
    // next_to_u leash gate — always true without leash wiring
    return vault_tele();
}

/**
 * C ref: teleport.c teleport_pet — steed/cursed-leash gate before migrate.
 * Named omission: yelp / m_unleash messages when unleashing.
 */
export function teleport_pet(mtmp, force_it) {
    if (!mtmp) return false;
    if (mtmp === game.u?.usteed) return false;
    if (mtmp.mleashed) {
        // C: cursed leash without force blocks; else unleash
        // get_mleash / m_unleash body deferred — treat as free if forced
        if (!force_it) return false;
        mtmp.mleashed = 0;
    }
    return true;
}

function ledger_no(lev) {
    const dnum = lev?.dnum | 0;
    const dlevel = lev?.dlevel | 0;
    const dun = game.dungeons?.[dnum];
    return ((dun?.ledger_start | 0) + dlevel) | 0;
}

function ledger_to_dnum(tolev) {
    const duns = game.dungeons || [];
    for (let i = 0; i < duns.length; i++) {
        const d = duns[i];
        if (!d) continue;
        const start = d.ledger_start | 0;
        const n = d.num_dunlevs | 0;
        if (tolev >= start && tolev < start + n) return i;
    }
    return 0;
}

function ledger_to_dlev(tolev) {
    const dnum = ledger_to_dnum(tolev);
    const start = game.dungeons?.[dnum]?.ledger_start | 0;
    return (tolev - start) | 0;
}

/**
 * C ref: dog.c migrate_to_level — take mon off map onto migrating_mons.
 * Envelope: remove from fmon, encode destination, mx=my=0.
 * Named omissions: mon_leave worm/isshk residency; leash; light sources.
 */
export function migrate_to_level(mtmp, tolev, xyloc, cc) {
    if (!mtmp) return;
    const mx = mtmp.mx | 0;
    const my = mtmp.my | 0;

    const list = game.fmon || [];
    const idx = list.indexOf(mtmp);
    if (idx >= 0) list.splice(idx, 1);

    if (!game.migrating_mons) game.migrating_mons = [];
    mtmp.nmon = game.migrating_mons[0] || null;
    game.migrating_mons.unshift(mtmp);
    mtmp.mstate = (mtmp.mstate | 0) | MON_MIGRATING;

    const new_lev = {
        dnum: ledger_to_dnum(tolev),
        dlevel: ledger_to_dlev(tolev),
    };
    // Destination encoding (mtrack / mux/muy overload) — matches C fields
    let xyflags = 0;
    const u = game.u;
    if (u?.uz) {
        const depthNew = (game.dungeons?.[new_lev.dnum]?.depth_start | 0)
            + new_lev.dlevel - 1;
        const depthOld = (game.dungeons?.[u.uz.dnum]?.depth_start | 0)
            + (u.uz.dlevel | 0) - 1;
        if (depthNew < depthOld) xyflags = 1;
    }
    if (!mtmp.mtrack) {
        mtmp.mtrack = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }];
    }
    mtmp.mtrack[2] = { x: u?.uz?.dnum | 0, y: u?.uz?.dlevel | 0 };
    mtmp.mtrack[1] = { x: cc ? cc.x : mx, y: cc ? cc.y : my };
    mtmp.mtrack[0] = { x: xyloc | 0, y: xyflags };
    mtmp.mux = new_lev.dnum;
    mtmp.muy = new_lev.dlevel;
    mtmp.mlstmv = game.moves | 0;
    mtmp.mx = 0;
    mtmp.my = 0;
}

/**
 * C ref: teleport.c mlevel_tele_trap — monster hole/trapdoor/portal migrate.
 * Envelope: HOLE/TRAPDOOR → trap.dst (+ stronghold/botlevel gates);
 * MAGIC_PORTAL / LEVEL_TELEP / NO_TRAP named omissions beyond hole path.
 */
export function mlevel_tele_trap(mtmp, trap, force_it, in_sight) {
    const tt = trap ? (trap.ttyp | 0) : NO_TRAP;
    if (mtmp === game.u?.ustuck) return Trap_Effect_Finished;
    if (!teleport_pet(mtmp, force_it)) return Trap_Effect_Finished;

    const tolevel = { dnum: 0, dlevel: 1 };
    let migrate_typ = MIGR_RANDOM;

    if (is_hole(tt)) {
        if (Is_stronghold(game.u?.uz)) {
            // valley_level — named omission; treat as bot avoid if unset
            const v = game.valley_level;
            if (v) {
                tolevel.dnum = v.dnum | 0;
                tolevel.dlevel = v.dlevel | 0;
            } else {
                return Trap_Effect_Finished;
            }
        } else if (Is_botlevel(game.u?.uz)) {
            return Trap_Effect_Finished;
        } else {
            const dst = trap.dst || {};
            tolevel.dnum = dst.dnum | 0;
            tolevel.dlevel = dst.dlevel | 0;
            // clamp_hole_destination: min(dlevel, dng_bottom)
            const dun = game.dungeons?.[tolevel.dnum];
            let bottom = dun?.num_dunlevs | 0;
            if (bottom > 0 && tolevel.dlevel > bottom) tolevel.dlevel = bottom;
        }
    } else {
        // MAGIC_PORTAL / LEVEL_TELEP / NO_TRAP deferred
        return Trap_Effect_Finished;
    }

    // in_sight pline deferred (screen-only; hole fall has no RNG)
    void in_sight;
    // is_xport conf deferred (holes are not is_xport)
    migrate_to_level(mtmp, ledger_no(tolevel), migrate_typ, null);
    return Trap_Moved_Mon;
}
