// shk.js — Shopkeeper movement + shop enter/leave (partial).
// C ref: shk.c shk_move / after_shk_move / u_entered_shop / u_left_shop;
//        paybill / inherits / set_repo_loc / money2mon; priest.c move_special.
// Named omissions: shk_fixes_damage body; holetime dig follow; angry
// Displaced pline; following verbalize;
// pri_move altar mill rn1; m_break_boulder; m_move_aggress;
// Fast + sobj_at pickaxe doorway block / dochug; m_canseeu for angry chase;
// resist_conflict; deserted_shop body; ACH_SHOP mapseen; Hallu shkname;
// angry/surcharge/robbed welcome arms; Invis welcome; leave-bill verbalize;
// addupbill body; clear_unpaid/no_charge walks in setpaid; mongone full;
// mnearto home_shk; paygd; M1_NOHEAD has_head (assume headed for shk path).

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { dist2, online2 } from './hacklib.js';
import {
    ESHK, IS_ROOM, NOTONL, u_at, isok, ROOMOFFSET, SHOPBASE, ACH_SHOP,
    OBJ_MINVENT, LOW_PM,
} from './const.js';
import { COIN_CLASS } from './objects.js';
import { newsym, pline, verbalize } from './display.js';
import { cansee } from './vision.js';
import { objectNames } from './generated/objects_data.js';
import { mattacku } from './mhitu.js';
import { PM_GRID_BUG } from './generated/monsters_data.js';
import { Hello } from './roles.js';
import { shtypes, shkname, Shknam } from './shknam.js';
import { splitobj } from './mkobj.js';
import { add_to_minv } from './makemon.js';

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

import { gd_move as vault_gd_move } from './vault.js';

/**
 * C ref: vault.c gd_move — re-export peaceful escort subset from vault.js.
 */
export async function gd_move(grd) {
    return vault_gd_move(grd);
}

/**
 * C ref: priest.c pri_move — stub: stay put without altar mill rn1.
 * Named omission: histemple_at / Conflict chase / rn1(3,-1) mill.
 */
export function pri_move(_priest) {
    return 0;
}

/** C: has_head — !(mflags1 & M1_NOHEAD); M1_NOHEAD not in JS tables. */
function has_head(_ptr) {
    return true;
}

/** C ref: you.h m_next2u — squared dist ≤ 2. */
function m_next2u(mtmp) {
    const u = game.u || {};
    const dx = (mtmp.mx | 0) - (u.ux | 0);
    const dy = (mtmp.my | 0) - (u.uy | 0);
    return dx * dx + dy * dy <= 2;
}

/** C ref: dungeon.c on_level */
function on_level(a, b) {
    return !!a && !!b
        && (a.dnum | 0) === (b.dnum | 0)
        && (a.dlevel | 0) === (b.dlevel | 0);
}

/** C: strchr(u.ushops, shoproom) */
function uin_shoproom(shoproom) {
    const ushops = game.u?.ushops || '';
    return ushops.includes(String.fromCharCode(shoproom | 0));
}

/** C ref: invent.c money_cnt — invent is a JS array. */
function money_cnt(invent) {
    let sum = 0;
    for (const o of invent || []) {
        if (o.oclass === COIN_CLASS) sum += o.quan | 0;
    }
    return sum;
}

/** C ref: steal.c findgold — first GOLD_PIECE / COIN on invent array. */
function findgold_invent() {
    const goldOtyp = objectNames.indexOf('GOLD_PIECE');
    for (const o of game.invent || []) {
        if (o.oclass === COIN_CLASS || o.otyp === goldOtyp) return o;
    }
    return null;
}

/**
 * C ref: shk.c money2mon — move hero gold into mon minvent.
 * Named omissions: remove_worn_item quiver; impossible arms.
 */
export function money2mon(mon, amount) {
    if (amount <= 0 || !mon) return 0;
    let ygold = findgold_invent();
    if (!ygold || (ygold.quan | 0) < amount) return 0;
    if ((ygold.quan | 0) > amount) {
        ygold = splitobj(ygold, amount);
        // splitobj leaves parent in invent with reduced quan; child not
        // listed in invent[] — freeinv of child is a no-op (C removes
        // the split child from the invent chain).
    } else {
        const inv = game.invent || [];
        const idx = inv.indexOf(ygold);
        if (idx >= 0) inv.splice(idx, 1);
    }
    if (!ygold) return 0;
    ygold.where = OBJ_MINVENT;
    add_to_minv(mon, ygold);
    if (game.flags) game.flags.botl = true;
    return amount;
}

/**
 * C ref: shk.c setpaid — clear bill counters (unpaid/no_charge walks deferred).
 */
function setpaid(shkp) {
    // clear_unpaid / clear_no_charge / billobjs deferred
    if (!shkp) return;
    const eshk = ESHK(shkp);
    if (!eshk) return;
    eshk.billct = 0;
    eshk.credit = 0;
    eshk.debit = 0;
    eshk.loan = 0;
}

/** C ref: shk.c rile_shk — angry + surcharge on bill (bill walk deferred). */
function rile_shk(shkp) {
    if (!shkp) return;
    shkp.mpeaceful = 0;
    const eshk = ESHK(shkp);
    if (eshk && !eshk.surcharge) {
        eshk.surcharge = true;
        // bill_p price bump deferred when billct==0 (common for angry combat)
    }
}

/**
 * C ref: shk.c next_shkp — next live isshk; optional withbill filter.
 */
function next_shkp(startIdx, withbill) {
    const fmon = game.fmon || [];
    for (let i = startIdx; i < fmon.length; i++) {
        const shkp = fmon[i];
        if (!shkp || ((shkp.mhp | 0) < 1)) continue;
        if (!shkp.isshk) continue;
        const eshk = ESHK(shkp);
        if (!eshk) continue;
        if ((eshk.billct | 0) || !withbill) {
            if (ANGRY(shkp) && !eshk.surcharge) rile_shk(shkp);
            return { shkp, nextIdx: i + 1 };
        }
    }
    return { shkp: null, nextIdx: fmon.length };
}

/** C ref: shk.c addupbill — stub 0 until bill_p walk ported. */
function addupbill(_shkp) {
    return 0;
}

/**
 * C ref: shk.c rouse_shk — wake/unfreeze; verbosely pline deferred here
 * (inherits passes FALSE).
 */
function rouse_shk(shkp, _verbosely) {
    if (!helpless(shkp)) return;
    shkp.msleeping = 0;
    shkp.mfrozen = 0;
    shkp.mcanmove = 1;
}

/**
 * C ref: shk.c home_shk — return to shk.x,shk.y (mnearto/RLOC deferred).
 */
function home_shk(shkp, _killkops) {
    const eshk = ESHK(shkp);
    if (!eshk?.shk) return;
    const x = eshk.shk.x | 0;
    const y = eshk.shk.y | 0;
    const ox = shkp.mx;
    const oy = shkp.my;
    if (ox === x && oy === y) return;
    shkp.mx = x;
    shkp.my = y;
    if (ox != null && oy != null) newsym(ox, oy);
    newsym(x, y);
    if (game.level?.flags) game.level.flags.has_shop = 1;
    // after_shk_move / kops deferred
}

/** C ref: shk.c costly_adjacent — edge or free spot. */
function costly_adjacent(shkp, x, y) {
    if (!shkp || !inhishop(shkp) || !isok(x, y)) return false;
    const eshk = ESHK(shkp);
    const loc = game.level?.at?.(x, y);
    return !!(loc?.edge || (x === (eshk.shk?.x | 0) && y === (eshk.shk?.y | 0)));
}

/**
 * C ref: shk.c set_repo_loc — where finish_paybill drops invent.
 */
function set_repo_loc(shkp) {
    if (!game.repo) game.repo = { location: { x: 0, y: 0 }, shopkeeper: null };
    if (game.repo.shopkeeper) return;
    const eshk = ESHK(shkp);
    const u = game.u || {};
    let ox = u.ux ? u.ux : (u.ux0 | 0);
    let oy = u.ux ? u.uy : (u.uy0 | 0);
    if (!uin_shoproom(eshk.shoproom) || costly_adjacent(shkp, ox, oy)) {
        ox = eshk.shk?.x | 0;
        oy = eshk.shk?.y | 0;
        const sgn = (n) => (n > 0 ? 1 : n < 0 ? -1 : 0);
        ox += sgn(ox - (eshk.shd?.x | 0));
        oy += sgn(oy - (eshk.shd?.y | 0));
    }
    game.repo.location = { x: ox, y: oy };
    game.repo.shopkeeper = shkp;
}

/** Remove nonlocal shk from fmon (full mongone deferred). */
function mongone_nonlocal(mtmp) {
    const fmon = game.fmon || [];
    const i = fmon.indexOf(mtmp);
    if (i >= 0) fmon.splice(i, 1);
    const eshk = ESHK(mtmp);
    if (eshk) {
        const room = game.level?.rooms?.[((eshk.shoproom | 0) - ROOMOFFSET)];
        if (room?.resident === mtmp) room.resident = null;
    }
}

/**
 * C ref: shk.c inherits — first shk may take invent; pline possessions.
 * Covered: numsk==1 angry/following/owed → "takes all your possessions";
 * peaceful in-shop inherit; numsk>1 corpse glance (+ optional rn2).
 * Deferred: partial gold owed arm currency pline; mbodypart/noit_mhis text.
 */
async function inherits(shkp, numsk, croaked, silently) {
    const eshkp = ESHK(shkp);
    if (!eshkp) return false;
    let loss = 0;
    let take = false;
    let taken = false;
    const uinshop = uin_shoproom(eshkp.shoproom);
    let takes = '';

    shkp.minvis = 0;
    shkp.perminvis = 0;

    if (numsk > 1) {
        if (cansee(shkp.mx, shkp.my) && croaked && !silently) {
            takes = '';
            if (has_head(shkp.data) && !rn2(2)) {
                takes = `, shakes ${shkp.female ? 'her' : 'his'} head,`;
            }
            await pline(
                `${Shknam(shkp)} ${helpless(shkp) ? 'wakes up, ' : ''}looks at your corpse${takes} and ${!inhishop(shkp) ? 'disappears' : 'sighs'}.`,
            );
        }
        taken = uinshop;
        // skip → rouse/home below
        rouse_shk(shkp, false);
        if (!inhishop(shkp)) home_shk(shkp, false);
        setpaid(shkp);
        if (taken) set_repo_loc(shkp);
        return taken;
    }

    // peaceful shop death, nothing owed
    if (uinshop && inhishop(shkp) && !(eshkp.billct | 0)
        && !(eshkp.robbed | 0) && !(eshkp.debit | 0) && !ANGRY(shkp)
        && !eshkp.following
        && ((game.u?.ugrave_arise ?? LOW_PM - 1) < LOW_PM)) {
        taken = !!(game.invent && game.invent.length);
        if (taken && !silently) {
            await pline(
                `${Shknam(shkp)} gratefully inherits all your possessions.`,
            );
        }
        setpaid(shkp);
        if (taken) set_repo_loc(shkp);
        return taken;
    }

    if ((eshkp.billct | 0) || (eshkp.debit | 0) || (eshkp.robbed | 0)) {
        if (uinshop && inhishop(shkp)) {
            loss = addupbill(shkp) + (eshkp.debit | 0);
        }
        if (loss < (eshkp.robbed | 0)) loss = eshkp.robbed | 0;
        take = true;
    }

    if (eshkp.following || ANGRY(shkp) || take) {
        if (!(game.invent && game.invent.length)) {
            rouse_shk(shkp, false);
            if (!inhishop(shkp)) home_shk(shkp, false);
            setpaid(shkp);
            return false;
        }
        const umoney = money_cnt(game.invent);
        takes = '';
        if (helpless(shkp)) takes += 'wakes up and ';
        if (!m_next2u(shkp)) takes += 'comes and ';
        takes += 'takes';

        if (loss > umoney || !loss || uinshop) {
            eshkp.robbed = (eshkp.robbed | 0) - umoney;
            if (eshkp.robbed < 0) eshkp.robbed = 0;
            if (umoney > 0) money2mon(shkp, umoney);
            if (!silently) {
                await pline(
                    `${Shknam(shkp)} ${takes} all your possessions.`,
                );
            }
            taken = true;
        } else {
            money2mon(shkp, loss);
            if (!silently) {
                // currency / customer / noit_mhim deferred — rare partial path
                await pline(
                    `${Shknam(shkp)} ${takes} the ${loss} gold pieces owed ${shkp.female ? 'her' : 'him'}.`,
                );
            }
            pacify_shk(shkp, false);
            eshkp.following = 0;
            eshkp.robbed = 0;
        }
        rouse_shk(shkp, false);
        if (!inhishop(shkp)) home_shk(shkp, false);
    }
    setpaid(shkp);
    if (taken) set_repo_loc(shkp);
    return taken;
}

/**
 * C ref: shk.c paybill — prioritize shk; inherits may pline before message flush.
 * croaked: -1 escaped, 0 quit, 1 died.
 */
export async function paybill(croaked, silently) {
    if (croaked < 0) return false;

    if (!game.repo) game.repo = { location: { x: 0, y: 0 }, shopkeeper: null };
    game.repo.location = { x: 0, y: 0 };
    game.repo.shopkeeper = null;

    let resident = null;
    let creditor = null;
    let hostile = null;
    let localshk = null;

    let { shkp: mtmp, nextIdx } = next_shkp(0, false);
    while (mtmp) {
        const eshkp = ESHK(mtmp);
        const local = on_level(eshkp?.shoplevel, game.u?.uz);
        if (local && uin_shoproom(eshkp.shoproom)) {
            if (!resident || (eshkp.billct | 0) || (eshkp.debit | 0)
                || (eshkp.robbed | 0)) {
                resident = mtmp;
            }
        } else if ((eshkp.billct | 0) || (eshkp.debit | 0) || (eshkp.robbed | 0)) {
            if (!creditor) creditor = mtmp;
        } else if (eshkp.following || ANGRY(mtmp)) {
            if (!hostile) hostile = mtmp;
        } else if (local) {
            if (!localshk) localshk = mtmp;
        }
        ({ shkp: mtmp, nextIdx } = next_shkp(nextIdx, false));
    }

    const firstshk = resident || creditor || hostile || localshk;
    let numsk = 0;
    let taken = false;
    if (firstshk) {
        numsk++;
        taken = await inherits(firstshk, numsk, croaked, silently);
    }

    // Re-scan: other shks + mongone nonlocal (snapshot — mongone mutates fmon)
    const shks = [];
    ({ shkp: mtmp, nextIdx } = next_shkp(0, false));
    while (mtmp) {
        shks.push(mtmp);
        ({ shkp: mtmp, nextIdx } = next_shkp(nextIdx, false));
    }
    for (const m of shks) {
        const eshkp = ESHK(m);
        const local = on_level(eshkp?.shoplevel, game.u?.uz);
        if (m !== firstshk) {
            numsk++;
            taken = (await inherits(m, numsk, croaked, silently)) || taken;
        }
        if (!local) mongone_nonlocal(m);
    }
    return taken;
}
