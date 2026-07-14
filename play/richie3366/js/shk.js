// shk.js — Shopkeeper movement + shop enter/leave (partial).
// C ref: shk.c shk_move / after_shk_move / u_entered_shop / u_left_shop;
//        priest.c move_special.
// Named omissions: shk_fixes_damage body; holetime dig follow; angry
// Displaced pline; following verbalize/rile_shk; gd_move body;
// pri_move altar mill rn1; m_break_boulder; m_move_aggress;
// Fast + sobj_at pickaxe doorway block / dochug; m_canseeu for angry chase;
// resist_conflict; deserted_shop body; ACH_SHOP mapseen; Hallu shkname;
// angry/surcharge/robbed welcome arms; Invis welcome; leave-bill verbalize.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { dist2, online2 } from './hacklib.js';
import {
    ESHK, IS_ROOM, NOTONL, u_at, isok, ROOMOFFSET, SHOPBASE, ACH_SHOP,
} from './const.js';
import { newsym, pline, verbalize } from './display.js';
import { objectNames } from './generated/objects_data.js';
import { mattacku } from './mhitu.js';
import { PM_GRID_BUG } from './generated/monsters_data.js';
import { Hello } from './roles.js';
import { shtypes, shkname } from './shknam.js';

const PICK_AXE = objectNames.indexOf('PICK_AXE');
const DWARVISH_MATTOCK = objectNames.indexOf('DWARVISH_MATTOCK');
/** C monflag.h MS_ANIMAL — animal noises ceiling for muteshk. */
const MS_ANIMAL = 17;
/** C monflag.h MS_SELL — shopkeeper when tables omit msound. */
const MS_SELL = 39;

/** C: ANGRY(mon) ≡ !mpeaceful */
function ANGRY(mon) {
    return !mon?.mpeaceful;
}

/** C: helpless — msleeping || !mcanmove */
function helpless(mtmp) {
    return !!(mtmp?.msleeping || mtmp?.mcanmove === 0);
}

/**
 * C: muteshk — helpless or msound <= MS_ANIMAL.
 * Generated tables often omit msound; isshk → MS_SELL.
 */
function muteshk(shkp) {
    if (helpless(shkp)) return true;
    let ms = shkp?.data?.msound;
    if (ms == null) ms = shkp?.isshk ? MS_SELL : 0;
    return (ms | 0) <= MS_ANIMAL;
}

/** C ref: hacklib.c s_suffix */
function s_suffix(s) {
    const buf = String(s ?? '');
    const low = buf.toLowerCase();
    if (low === 'it') return `${buf}s`;
    if (low === 'you') return `${buf}r`;
    if (buf.endsWith('s') || buf.endsWith('S')) return `${buf}'`;
    return `${buf}'s`;
}

/** C ref: shk.c pacify_shk — peaceful + optional surcharge undo (bill deferred). */
function pacify_shk(shkp, clear_surcharge) {
    if (!shkp) return;
    shkp.mpeaceful = 1;
    const eshk = ESHK(shkp);
    if (clear_surcharge && eshk?.surcharge) {
        eshk.surcharge = false;
        // bill price undo deferred (no bill_p walk yet)
    }
}

/** C ref: insight/achieve record_achievement — ACH_SHOP stub (mapseen deferred). */
function record_achievement(_ach) {
    // full uachieved / livelog deferred
}

/**
 * C ref: shk.c shop_keeper — rooms[rmno-ROOMOFFSET].resident with eshk.
 * Angry surcharge rile_shk deferred.
 */
export function shop_keeper(rmno) {
    const code = typeof rmno === 'string' ? rmno.charCodeAt(0) : (rmno | 0);
    if (code < ROOMOFFSET) return null;
    const shkp = game.level?.rooms?.[code - ROOMOFFSET]?.resident || null;
    if (!shkp) return null;
    if (!ESHK(shkp)) return null;
    // ANGRY → rile_shk deferred
    return shkp;
}

/**
 * C ref: shk.c u_left_shop — leave/boundary bill prompts.
 * Named omissions: rob_shop / call_kops; leave verbalize when billct/debit.
 */
export async function u_left_shop(leavestring, _newlev) {
    const u = game.u;
    if (!u) return;
    const leave = leavestring || '';
    const loc = game.level?.at?.(u.ux, u.uy);
    const loc0 = game.level?.at?.(u.ux0, u.uy0);
    // C: if (!*leavestring && (!edge || edge0)) return;
    if (!leave && (!(loc?.edge) || loc0?.edge)) return;

    const rmCh = leave ? leave.charCodeAt(0) : (u.ushops0 || '').charCodeAt(0);
    const shkp = shop_keeper(rmCh);
    if (!shkp || !inhishop(shkp)) return;

    const eshkp = ESHK(shkp);
    if (!((eshkp?.billct | 0) || (eshkp?.debit | 0))) return;

    // bill unpaid arms (verbalize / rob_shop) deferred
}

/**
 * C ref: shk.c u_entered_shop — welcome / deserted / blocking.
 * Covered: tended peaceful first-visit Welcome verbalize.
 * Deferred: deserted_shop; angry/surcharge/robbed/Invis arms; pickaxe/
 * steed/Fast doorway block + dochug; inside_shop gate for those arms.
 */
export async function u_entered_shop(enterstring) {
    if (!enterstring) return;
    const u = game.u;
    if (!u) return;

    const enterCh = enterstring.charCodeAt(0);
    const shkp = shop_keeper(enterCh);
    if (!shkp) {
        // deserted_shop deferred; clear ushops like C empty path
        u.ushops = '';
        return;
    }

    const eshkp = ESHK(shkp);
    if (!inhishop(shkp)) {
        u.ushops = '';
        return;
    }

    record_achievement(ACH_SHOP);
    eshkp.bill_p = eshkp.bill || null;

    const plname = game.plname || '';
    const cust = eshkp.customer || '';
    if ((!eshkp.visitct || cust)
        && cust.toLowerCase() !== plname.toLowerCase().slice(0, 32)) {
        eshkp.visitct = 0;
        eshkp.following = 0;
        eshkp.customer = plname.slice(0, 32);
        pacify_shk(shkp, true);
    }

    if (muteshk(shkp) || eshkp.following) return;

    if (u.Invis) {
        // Invis welcome arms deferred
        return;
    }

    const rt = game.level?.rooms?.[enterCh - ROOMOFFSET]?.rtype | 0;
    const shopName = shtypes[rt - SHOPBASE]?.name || 'shop';

    if (ANGRY(shkp) || eshkp.surcharge || eshkp.robbed) {
        // angry / surcharge / robbed welcome arms deferred
        return;
    }

    const deaf = !!(u.Deaf || (u.HDeaf | 0) || (u.EDeaf | 0) || u.uroleplay?.deaf);
    if (!deaf && !muteshk(shkp)) {
        const again = eshkp.visitct++ ? ' again' : '';
        await verbalize(
            `${Hello(shkp)}, ${plname}!  Welcome${again} to ${s_suffix(shkname(shkp))} ${shopName}!`,
        );
    } else {
        const again = eshkp.visitct++ ? ' again' : '';
        await pline(
            `You enter ${s_suffix(shkname(shkp))} ${shopName}${again}!`,
        );
    }
    // doorway pickaxe / steed / Fast block + dochug deferred
}

/** C ref: shk.c inhishop — roomno match (full in_rooms / on_level deferred). */
export function inhishop(shkp) {
    const eshk = ESHK(shkp);
    if (!eshk || shkp.mx == null) return false;
    const loc = game.level?.at?.(shkp.mx, shkp.my);
    return !!loc && ((loc.roomno | 0) === (eshk.shoproom | 0));
}

/** C ref: invent.c carrying — first matching otyp in hero invent. */
function carrying(otyp) {
    if (otyp < 0) return null;
    for (let o = game.u?.invent; o; o = o.nobj) {
        if (o.otyp === otyp) return o;
    }
    return null;
}

/** C ref: dig.c holetime — dig occupation in shop; stub: not digging. */
function holetime() {
    return -1;
}

/** C: onlineu(xx,yy) → online2(xx,yy,u.ux,u.uy) */
function onlineu(xx, yy) {
    const u = game.u;
    if (!u) return false;
    return online2(xx, yy, u.ux, u.uy);
}

/**
 * C ref: priest.c move_special — shared shk/priest step picker.
 * Returns 1 moved, 0 didn't, -2 died. (m_move_aggress / boulder deferred.)
 * Lazy-imports mon.js helpers to avoid mon→monmove→shk→mon cycle.
 */
export async function move_special(mtmp, in_his_shop, appr, uondoor, avoid,
    omx, omy, ggx, ggy) {
    if (omx === ggx && omy === ggy) return 0;
    if (mtmp.mconf) {
        avoid = false;
        appr = 0;
    }

    const { mon_allowflags, mfndpos, m_at, ALLOW_M } = await import('./mon.js');

    let nix = omx;
    let niy = omy;
    let ninfo = 0;
    const allowflags = mon_allowflags(mtmp);
    const mfp = { cnt: 0, poss: [], info: [] };
    const cnt = mfndpos(mtmp, mfp, allowflags);

    if (mtmp.isshk && avoid && uondoor) {
        let canAvoid = false;
        for (let i = 0; i < cnt; i++) {
            if (!(mfp.info[i] & NOTONL)) {
                canAvoid = true;
                break;
            }
        }
        if (!canAvoid) avoid = false;
    }

    const GDIST = (x, y) => dist2(x, y, ggx, ggy);

    function pick_move() {
        let chcnt = 0;
        nix = omx;
        niy = omy;
        ninfo = 0;
        for (let i = 0; i < cnt; i++) {
            const nx = mfp.poss[i].x;
            const ny = mfp.poss[i].y;
            const loc = game.level?.at?.(nx, ny);
            if (IS_ROOM(loc?.typ)
                || (mtmp.isshk && (!in_his_shop || ESHK(mtmp)?.following))) {
                if (avoid && (mfp.info[i] & NOTONL) && !(mfp.info[i] & ALLOW_M)) {
                    continue;
                }
                if ((!appr && !rn2(++chcnt))
                    || (appr && GDIST(nx, ny) < GDIST(nix, niy))
                    || (mfp.info[i] & ALLOW_M)) {
                    nix = nx;
                    niy = ny;
                    ninfo = mfp.info[i];
                }
            }
        }
    }

    pick_move();

    if (mtmp.ispriest && avoid && nix === omx && niy === omy
        && onlineu(omx, omy)) {
        avoid = false;
        pick_move();
    }

    if (nix !== omx || niy !== omy) {
        if (m_at(nix, niy) || u_at(nix, niy)) return 0;
        if (!isok(nix, niy)) return 0;
        mtmp.mx = nix;
        mtmp.my = niy;
        newsym(nix, niy);
        void ninfo;
        return 1;
    }
    return 0;
}

/**
 * C ref: shk.c shk_move — returns 1 moved, 0 didn't, -1 let m_move,
 * -2 died.
 */
export async function shk_move(shkp) {
    const eshkp = ESHK(shkp);
    if (!eshkp) return 0;

    const omx = shkp.mx;
    const omy = shkp.my;
    const u = game.u;

    // shk_fixes_damage deferred (no damage chain)

    const udist = dist2(omx, omy, u.ux, u.uy);
    // C: udist < 3 && (data != GRID_BUG || same row/col)
    if (udist < 3 && (shkp.mnum !== PM_GRID_BUG || omx === u.ux || omy === u.uy)) {
        // resist_conflict stubbed false → Conflict always engages when set
        if (ANGRY(shkp) || game.Conflict) {
            await mattacku(shkp);
            return 0;
        }
        if (eshkp.following) {
            // customer / followmsg verbalize / rile_shk deferred
            if (udist < 2) return 0;
        }
    }

    let appr = 1;
    let gtx = eshkp.shk?.x | 0;
    let gty = eshkp.shk?.y | 0;
    const satdoor = (gtx === omx && gty === omy);
    let uondoor = false;
    let avoid = false;
    let badinv = false;

    const zHole = holetime();
    if (eshkp.following || (zHole >= 0 && zHole * zHole <= udist)) {
        if (udist > 4 && eshkp.following && !eshkp.billct) {
            return -1; // leave it to m_move
        }
        gtx = u.ux;
        gty = u.uy;
    } else if (ANGRY(shkp)) {
        if (shkp.mcansee) {
            gtx = u.ux;
            gty = u.uy;
        }
        avoid = false;
    } else {
        if (u.Invis || u.usteed) {
            avoid = false;
        } else {
            uondoor = u_at(eshkp.shd?.x | 0, eshkp.shd?.y | 0);
            if (uondoor) {
                badinv = !!(carrying(PICK_AXE) || carrying(DWARVISH_MATTOCK));
                // Fast + sobj_at pickaxe deferred
                if (satdoor && badinv) return 0;
                avoid = !badinv;
            } else {
                const ushops = u.ushops || '';
                avoid = !!(ushops && dist2(u.ux, u.uy, gtx, gty) > 8);
                badinv = false;
            }

            const GDIST = (x, y) => dist2(x, y, gtx, gty);
            if (((!eshkp.robbed && !eshkp.billct && !eshkp.debit) || avoid)
                && GDIST(omx, omy) < 3) {
                if (!badinv && !onlineu(omx, omy)) return 0;
                if (satdoor) {
                    appr = 0;
                    gtx = 0;
                    gty = 0;
                }
            }
        }
    }

    const z = await move_special(
        shkp, inhishop(shkp), appr, uondoor, avoid, omx, omy, gtx, gty,
    );
    // after_shk_move bill_p reset deferred
    return z;
}

/**
 * C ref: vault.c gd_move — stub: stay put (no RNG).
 * Named omission: full guard escort / corridor logic.
 */
export function gd_move(_grd) {
    return 0;
}

/**
 * C ref: priest.c pri_move — stub: stay put without altar mill rn1.
 * Named omission: histemple_at / Conflict chase / rn1(3,-1) mill.
 */
export function pri_move(_priest) {
    return 0;
}
