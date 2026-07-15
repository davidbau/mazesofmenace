// teleport.js — Placement helpers for makemon/makedog.
// C ref: teleport.c — collect_coords, enexto_core (NEW_ENEXTO), goodpos (partial).

import { game } from './gstate.js';
import { rn2, rn1 } from './rng.js';
import {
    COLNO, ROWNO,
    CC_NO_FLAGS, CC_INCL_CENTER, CC_UNSHUFFLED, CC_RING_PAIRS,
    CC_SKIP_MONS, CC_SKIP_INACCS,
    GP_CHECKSCARY, GP_ALLOW_U, GP_AVOID_MONPOS, GP_ALLOW_XY,
    MM_IGNOREWATER, MM_IGNORELAVA,
    ACCESSIBLE, IS_POOL, IS_LAVA, ZAP_POS, IS_DOOR,
    D_CLOSED, D_LOCKED,
    MIGR_RANDOM, MON_MIGRATING, NO_TRAP,
    ROOM, CORR, ICE, VAULT, SHOPBASE, ANY_SHOP,
    LAVAPOOL, LAVAWALL, IS_FURNITURE, TELEDS_TELEPORT,
    is_hole, Is_stronghold, Is_botlevel,
} from './const.js';
import { objects_at } from './mkobj.js';
import { objectNames } from './objects.js';
import { amorphous, throws_rocks } from './monsters.js';
import { newsym, pline } from './display.js';
import { vision_recalc } from './vision.js';
import { in_rooms, nomul } from './hack.js';

// trap.h return codes — avoid importing trap.js (cycle with trapeffect_hole)
const Trap_Effect_Finished = 0;
const Trap_Moved_Mon = 4;

const BOULDER = objectNames.indexOf('BOULDER');

function isok(x, y) {
    return x >= 1 && x < COLNO && y >= 0 && y < ROWNO;
}

function u_at(x, y) {
    return game.u?.ux === x && game.u?.uy === y;
}

function m_at(x, y) {
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
 * C ref: teleport.c goodpos() — placement / enexto suitability.
 * Pool/lava swimmer·flyer arms and passes_walls early-out deferred beyond
 * closed-door / boulder / occupied / accessible gates needed for pets.
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

        if (IS_POOL(typ) && !ignorewater) return false;
        if (IS_LAVA(typ) && !ignorelava) return false;
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
 */
function noteleport_level(_mon) {
    if (game.level?.flags?.noteleport) return true;
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
 * spoteffects subset. Occupancy: sync in_rooms so invault sees VAULT.
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
    // C: spoteffects → move_update refreshes urooms; sync subset here
    u.urooms0 = u.urooms || '';
    u.urooms = in_rooms(u.ux, u.uy, 0);
    newsym(ox, oy);
    newsym(u.ux, u.uy);
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
    // C: spoteffects(TRUE) — vault gold / traps at landing
    const { spoteffects } = await import('./pickup.js');
    await spoteffects(true);
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
