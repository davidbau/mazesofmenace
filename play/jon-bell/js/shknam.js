// shknam.js — C ref: shknam.c.
import { ALL_TRAPS, CORR, DUST, D_ISOPEN, D_LOCKED, D_NODOOR, D_TRAPPED, HEALTHY_TIN, In_mines, ROOM, ROOMOFFSET, SDOOR, ismnum, isok } from './const.js';
import { cvt_sdoor_to_door } from './detect.js';
import { newsym, impossible_sync } from './display.js';
import { Is_special, ledger_no, on_level } from './dungeon.js';
import { set_tin_variety } from './eat.js';
import { game } from './gstate.js';
import { distmin } from './hacklib.js';
import { depth as depth_of_level } from './dungeon.js';
import { mkclass, newmextra, permonstTemplate, set_malign } from './makemon.js';
import { CORPSE, EGG, FOOD_CLASS, GOLD_PIECE, NON_PM, PM_LICHEN, SPE_NOVEL, TIN, VEGETARIAN_CLASS_SHK, _shkgeneral, _shkrings, _shktools, _shkwands, _shtypes, vegetarian, weight } from './mklev.js';
import { mkobj_at, mksobj, mksobj_at } from './mkobj.js';
import { makemon } from './makemon.js';
import { make_engr_at } from './engrave.js';
import { mpickobj } from './steal.js';
import { inside_shop } from './shk.js';
import { MKOBJ_OC_CLASS, MKOBJ_OC_PROB, MKOBJ_SVB_BASES } from './mkobj_data.js';
import { MKOBJ_OC_MATERIAL } from './mkobj_erosion_meta.js';
import { mongone } from './mon.js';
import { rn2, rnd } from './rnd.js';
import { shop_keeper } from './shk.js';
import { in_rooms } from './hack.js';
import { rloc } from './teleport.js';
import { mon_learns_traps } from './mondata.js';
import { m_at } from './uhitm.js';
import { ESHK, HALLUC, HALLUC_RES, SHOPBASE } from './const.js'; // relocate-fns
import { noit_mon_nam } from './do_name.js';
import { highc } from './hacklib.js'; // relocate-fns
import { shtype_row, shkname_halluc_pick } from './mklev.js'; // relocate-fns
import { _cmd_Hallucination } from './cmd.js';
import { in_town } from './hack.js'; // relocate-fns
import { letter } from './hacklib.js'; // relocate-fns

// ── shknam.c port ─────────────────────────────────────────────────────────────
// C ref: nethack-c/src/shknam.c
/** C: PM_SHOPKEEPER (pm.generated.js index 271) */
const PM_SHOPKEEPER = 271;

/** C objects.h otyp values needed by shknam.c */
const SCR_CHARGING = 342; /* scroll base 323 + pos 19 */

const TOUCHSTONE_SHK = 472; /* gem, matches u_init.js TOUCHSTONE_OTYP */

/* C shknam.c:829-838 get_shop_item(type) — rnd(100) weighted pick */
export function get_shop_item(type) {
    const shp = _shtypes[type];
    let j = rnd(100);
    for (let i = 0; i < shp.iprobs.length; i++) {
        j -= shp.iprobs[i].iprob;
        if (j <= 0)
            return shp.iprobs[i].itype;
    }
    return shp.iprobs[0].itype;
}

/* C shknam.c:378-405 — staticfn boolean veggy_item(struct obj *obj, int otyp).
 * The obj == NULL ("just a type") shape is used by shkveg(); C
 * pins corpsenm to PM_LICHEN in that case, calling it "veggy standin":
 *
 *     if (oclass == FOOD_CLASS) {
 *         if (objects[otyp].oc_material == VEGGY || otyp == EGG) return TRUE;
 *         if (otyp == TIN && corpsenm == NON_PM) return obj->spe == 1;
 *         if (otyp == TIN || otyp == CORPSE)
 *             return ismnum(corpsenm) && vegetarian(&mons[corpsenm]);
 *     }
 *
 * With corpsenm == PM_LICHEN the second arm cannot fire (PM_LICHEN != NON_PM,
 * and that arm is flagged "implies obj is non-null"), so the THIRD arm decides
 * TIN and CORPSE — and a lichen is S_FUNGUS, hence vegan, hence vegetarian.
 * Both therefore count. */
export function veggy_item(obj, otyp) {
    const VEGGY_MAT = 3; /* objclass.h VEGGY */
    if (obj) otyp = obj.otyp;
    const corpsenm = obj ? obj.corpsenm : PM_LICHEN; /* C: veggy standin */
    const oclass = obj ? obj.oclass : MKOBJ_OC_CLASS[otyp];
    if (oclass !== FOOD_CLASS)
        return false;
    if ((MKOBJ_OC_MATERIAL[otyp] | 0) === VEGGY_MAT || otyp === EGG)
        return true;
    if (otyp === TIN && corpsenm === NON_PM)
        return obj.spe === 1;
    if (otyp === TIN || otyp === CORPSE)
        return ismnum(corpsenm) && vegetarian(permonstTemplate(corpsenm));
    return false;
}

function shkveg() {
    const foodStart = MKOBJ_SVB_BASES[FOOD_CLASS] | 0; /* 264 */
    const foodEnd = MKOBJ_SVB_BASES[FOOD_CLASS + 1] | 0; /* 297 */
    let ok = [];
    let maxprob = 0;
    for (let i = foodStart; i < foodEnd; i++) {
        if (veggy_item(null, i)) {
            ok.push(i);
            maxprob += (MKOBJ_OC_PROB[i] | 0);
        }
    }
    if (maxprob < 1)
        return foodStart; /* panic fallback */
    let prob = rnd(maxprob);
    for (let k = 0; k < ok.length; k++) {
        prob -= (MKOBJ_OC_PROB[ok[k]] | 0);
        if (prob <= 0)
            return ok[k];
    }
    return ok[0];
}

/* C shknam.c mkveggy_at(sx,sy) — make a random veggy food item */
async function mkveggy_at(sx, sy) {
    const otyp = shkveg();
    const obj = await mksobj_at(otyp, sx, sy, true, true);
    if (obj && obj.otyp === TIN)
        set_tin_variety(obj, HEALTHY_TIN); // C shknam.c:448
}

/*
 * C shknam.c:454-483 mkshobj_at(shp,sx,sy,mkspecl) — make shop object at cell.
 * C ref: nethack-c/src/shknam.c:454
 * RNG: rn2(100) (mimic check), then get_shop_item (rnd(100)), then mksobj/makemon init.
 */
async function mkshobj_at_shk(shp, shpIndx, sx, sy, mkspecl) {
    /* C: 3.6 tribute — special-case bookshops on first matching cell */
    if (mkspecl && (shp.name === "rare books" || shp.name === "second-hand bookstore")) {
        const novel = await mksobj_at(SPE_NOVEL, sx, sy, false, false);
        if (novel)
            (game.context = game.context || {}).tributeBookstock = true;
        return;
    }
    const depthVal = depth_of_level(game.u?.uz) | 0;
    /* C: rn2(100) < depth(&u.uz) && !MON_AT(sx,sy) && makemon(mimic) */
    if (rn2(100) < depthVal) {
        /* C MON_AT(sx,sy): the map grid, which includes long-worm tail segments */
        const hasMon = m_at(sx, sy) != null;
        if (!hasMon) {
            const S_MIMIC = 13; /* defsym.h S_MIMIC */
            const ptr = mkclass(S_MIMIC);
            if (ptr != null) {
                /* C: makemon(ptr, sx, sy, NO_MM_FLAGS) */
                if (await makemon(ptr, sx, sy, 0))
                    return;
            }
        }
    }
    const atype = get_shop_item(shpIndx);
    if (atype === VEGETARIAN_CLASS_SHK) {
        await mkveggy_at(sx, sy);
    }
    else if (atype < 0) {
        /* C: mksobj_at(-atype, sx, sy, TRUE, TRUE) */
        await mksobj_at(-atype, sx, sy, true, true);
    }
    else {
        /* C: mkobj_at(atype, sx, sy, TRUE) */
        await mkobj_at(atype, sx, sy, true);
    }
}

/*
 * C shknam.c:486-554 nameshk(shk, nlp) — assign shopkeeper name.
 * RNG: rn2(names_avail) only for shktools path or random fallback.
 * C ref: nethack-c/src/shknam.c:486
 */
function nameshk_shk(shk, nlp, shpNlpId) {
    const IS_SHKTOOLS = (shpNlpId === 8); /* index 8 = hardware store = _shktools */
    const IS_SHKLIGHT = (shpNlpId === 11); /* index 11 = lighting = _shklight */
    let shname = null;
    /* C: if (nlp == shklight && In_mines(&u.uz) && sptr->flags.town) → Izchak */
    if (IS_SHKLIGHT && In_mines(game.u?.uz)) {
        const sptr = Is_special(game.u?.uz);
        if (sptr?.flags?.town) {
            shname = "+Izchak";
            shk.female = 0;
        }
    }
    if (shname) {
        /* already set by Izchak special case */
        if (shk.mextra)
            shk.mextra.eshk = shk.mextra.eshk || {};
        if (shk.mextra?.eshk)
            shk.mextra.eshk.shknam = shname;
        return;
    }
    /* C: nseed = (int)((long)ubirthday / 257L) */
    const ubirthday = game.u?.ubirthday ?? 0;
    const nseed = Math.trunc(ubirthday / 257) | 0;
    let name_wanted = (shk.m_id | 0);
    name_wanted += (game.u?.uz ? ledger_no(game.u.uz) : 0);
    name_wanted += (nseed % 13) - (nseed % 5);
    if (name_wanted < 0)
        name_wanted += 18;
    shk.female = name_wanted & 1;
    const names_avail_init = nlp.length;
    let names_avail = names_avail_init;
    let curNlp = nlp;
    name_wanted = name_wanted % names_avail;
    for (let trycnt = 0; trycnt < 50; trycnt++) {
        if (IS_SHKTOOLS) {
            shname = curNlp[rn2(names_avail)]; /* C: shktools[rn2(names_avail)] */
            shk.female = 0;
        }
        else if (name_wanted < names_avail) {
            shname = curNlp[name_wanted];
        }
        else {
            const i = rn2(names_avail);
            if (i !== 0) {
                shname = curNlp[i - 1];
            }
            else if (curNlp !== _shkgeneral) {
                curNlp = _shkgeneral;
                names_avail = curNlp.length;
                continue;
            }
            else {
                shname = shk.female ? "-Lucrezia" : "+Dirk";
            }
        }
        /* C: gender prefix */
        if (shname[0] === '_' || shname[0] === '-')
            shk.female = 1;
        else if (shname[0] === '|' || shname[0] === '+')
            shk.female = 0;
        /* C: check name not already used */
        let nameUsed = false;
        for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
            if ((mtmp.mhp | 0) < 1 || !mtmp.isshk || mtmp === shk) /* C shknam.c:540 DEADMONSTER || mtmp==shk || !isshk */
                continue;
            if (mtmp.mextra?.eshk?.shknam === shname) {
                name_wanted = names_avail; /* trigger random pick next iter */
                nameUsed = true;
                break;
            }
        }
        if (!nameUsed)
            break;
    }
    /* C: strncpy(ESHK(shk)->shknam, shname, PL_NSIZ) */
    if (shk.mextra) {
        shk.mextra.eshk = shk.mextra.eshk || {};
        shk.mextra.eshk.shknam = (shname || "").slice(0, 32);
    }
}

/*
 * C shknam.c:556-567 neweshk(mtmp) — (re)attach a zeroed eshk substruct.
 * C ref: nethack-c/src/shknam.c:556
 */
export function neweshk(mtmp) {
    /* C: if (!mtmp->mextra) mtmp->mextra = newmextra(); */
    if (!mtmp.mextra)
        mtmp.mextra = newmextra();
    /* C: if (!ESHK(mtmp)) ESHK(mtmp) = (struct eshk *) alloc(sizeof(struct eshk)); */
    if (!mtmp.mextra.eshk)
        mtmp.mextra.eshk = {};
    /* C: (void) memset((genericptr_t) ESHK(mtmp), 0, sizeof(struct eshk)); */
    for (const k of Object.keys(mtmp.mextra.eshk))
        delete mtmp.mextra.eshk[k];
    /* C: ESHK(mtmp)->parentmid = mtmp->m_id; */
    mtmp.mextra.eshk.parentmid = mtmp.m_id;
    /* C: ESHK(mtmp)->bill_p = (struct bill_x *) 0; */
    mtmp.mextra.eshk.bill_p = null;
}

/*
 * C shknam.c:695-714 stock_room_goodpos(sroom,rmno,sh,sx,sy)
 * Returns true if (sx,sy) is a valid cell for placing shop inventory.
 */
function stock_room_goodpos(sroom, rmno, sh, sx, sy) {
    const loc = game.level?.at(sx, sy);
    if (!loc)
        return false;
    if (sroom.irregular) {
        if (loc.edge || (loc.roomno | 0) !== rmno)
            return false;
        const door = (game.level?.doors ?? [])[sh];
        if (door && distmin(sx, sy, door.x, door.y) <= 1)
            return false;
    }
    else {
        const door = (game.level?.doors ?? [])[sh];
        if (door) {
            if ((sx === sroom.lx && door.x === sx - 1)
                || (sx === sroom.hx && door.x === sx + 1)
                || (sy === sroom.ly && door.y === sy - 1)
                || (sy === sroom.hy && door.y === sy + 1))
                return false;
        }
    }
    if (!(loc.typ >= ROOM))
        return false; /* IS_ROOM */
    return true;
}

/*
 * C shknam.c:628-692 shkinit(shp, sroom) — create shopkeeper monster.
 * Returns sh (svd.doors index), or -1 on failure.
 * RNG: makemon + mkmonmoney(rnd(100)) + optional mongets(TOUCHSTONE/SCR_CHARGING) +
 *      nameshk(rn2 for shktools or random fallback).
 * C ref: nethack-c/src/shknam.c:628
 */
async function shkinit(shp, shpIndx, sroom) {
    /* C: sh = good_shopdoor(sroom, &sx, &sy) */
    let sh = -1, sx = 0, sy = 0;
    const rooms = game.level?.rooms ?? [];
    const roomIdx = rooms.indexOf(sroom);
    const rmno = (roomIdx >= 0 ? roomIdx : 0) + ROOMOFFSET;
    const doors = game.level?.doors ?? [];
    for (let i = 0; i < (sroom.doorct | 0); i++) {
        const di = (sroom.fdoor | 0) + i;
        let dx = doors[di]?.x ?? -1;
        let dy = doors[di]?.y ?? -1;
        if (sroom.irregular) {
            /* C: find cell inside room adjacent to door */
            if (isok(dx - 1, dy) && !game.level?.at(dx - 1, dy)?.edge
                && (game.level?.at(dx - 1, dy)?.roomno | 0) === rmno)
                dx--;
            else if (isok(dx + 1, dy) && !game.level?.at(dx + 1, dy)?.edge
                && (game.level?.at(dx + 1, dy)?.roomno | 0) === rmno)
                dx++;
            else if (isok(dx, dy - 1) && !game.level?.at(dx, dy - 1)?.edge
                && (game.level?.at(dx, dy - 1)?.roomno | 0) === rmno)
                dy--;
            else if (isok(dx, dy + 1) && !game.level?.at(dx, dy + 1)?.edge
                && (game.level?.at(dx, dy + 1)?.roomno | 0) === rmno)
                dy++;
            else
                continue;
        }
        else {
            /* C: adjust door coord to be inside room */
            if (dx === sroom.lx - 1)
                dx++;
            else if (dx === sroom.hx + 1)
                dx--;
            else if (dy === sroom.ly - 1)
                dy++;
            else if (dy === sroom.hy + 1)
                dy--;
            else
                continue;
        }
        sh = di;
        sx = dx;
        sy = dy;
        break;
    }
    if (sh < 0)
        return -1;
    /* C shknam.c:664 — the shopkeeper's door cell may already contain a
       monster from an earlier level-generation pass.  Relocate that monster
       before makemon; this insurance consumes the same rloc RNG pair as C. */
    const occupant = m_at(sx, sy);
    if (occupant)
        await rloc(occupant, 0x04 /* RLOC_NOMSG */);
    /* C: shk = makemon(&mons[PM_SHOPKEEPER], sx, sy, MM_ESHK) */
    const MM_ESHK = 0x00000200;
    const shk = await makemon(PM_SHOPKEEPER, sx, sy, MM_ESHK);
    if (!shk)
        return -1;
    /* C: attach eshk substruct (MM_ESHK causes neweshk in C makemon) */
    neweshk(shk);
    const eshkp = shk.mextra.eshk;
    /* C: shk->isshk = shk->mpeaceful = 1; shk->msleeping = 0 */
    shk.isshk = 1;
    shk.mpeaceful = 1;
    set_malign(shk); /* C shknam.c:667: recompute after making peaceful */
    shk.msleeping = 0;
    mon_learns_traps(shk, ALL_TRAPS); /* shknam.c:669 we know all the traps already */
    /* C: eshkp->shoproom, shoptype, shoplevel, shd, shk.x/y, etc. */
    eshkp.shoproom = rmno;
    eshkp.shoplevel = { dnum: game.u.uz.dnum, dlevel: game.u.uz.dlevel };
    eshkp.shoptype = sroom.rtype;
    eshkp.shd = doors[sh] ? { x: doors[sh].x, y: doors[sh].y } : { x: 0, y: 0 };
    eshkp.shk_x = sx;
    eshkp.shk_y = sy;
    eshkp.shk = { x: sx, y: sy };
    eshkp.robbed = 0;
    eshkp.credit = 0;
    eshkp.debit = 0;
    eshkp.loan = 0;
    eshkp.following = eshkp.surcharge = eshkp.dismiss_kops = false;
    eshkp.billct = 0;
    eshkp.visitct = 0;
    eshkp.customer = '';
    sroom.resident = shk;
    /* C: mkmonmoney(shk, 1000L + 30L * (long)rnd(100)) — 1 rnd call */
    const capital = 1000 + 30 * rnd(100);
    /* mkmonmoney: mksobj(GOLD_PIECE, FALSE, FALSE) — no init RNG; add to minvent */
    const goldObj = await mksobj(GOLD_PIECE, false, false);
    if (goldObj) {
        goldObj.quan = capital;
        goldObj.owt = weight(goldObj); /* mkobj.c:1888 weight(): COIN_CLASS is (quan + 50) / 100 */
        await mpickobj(shk, goldObj);
    }
    /* C: if (shp->shknms == shkrings) mongets(shk, TOUCHSTONE) */
    if (shp.shknms === _shkrings) {
        const ts = await mksobj(TOUCHSTONE_SHK, true, false);
        if (ts)
            await mpickobj(shk, ts);
    }
    /* C: if (shktools || shkwands || (shkrings && rn2(2)) || (shkgeneral && rn2(5)))
     *    mongets(shk, SCR_CHARGING) */
    if (shp.shknms === _shktools || shp.shknms === _shkwands
        || (shp.shknms === _shkrings && rn2(2))
        || (shp.shknms === _shkgeneral && rn2(5))) {
        const sc = await mksobj(SCR_CHARGING, true, false);
        if (sc)
            await mpickobj(shk, sc);
    }
    /* C: nameshk(shk, shp->shknms) */
    nameshk_shk(shk, shp.shknms, shpIndx);
    return sh;
}

/*
 * C shknam.c:718-801 stock_room(shp_indx, sroom) — stock a shop room.
 * C ref: nethack-c/src/shknam.c:718
 */
export async function stock_room(shpIndx, sroom) {
    const shp = _shtypes[shpIndx | 0];
    if (!shp)
        return;
    /* C: if ((sh = shkinit(shp, sroom)) < 0) return; */
    const sh = await shkinit(shp, shpIndx, sroom);
    if (sh < 0)
        return;
    /* C: door fixup — no-door → open, sdoor → door, trapped → locked */
    const rooms = game.level?.rooms ?? [];
    const roomIdx2 = rooms.indexOf(sroom);
    const rmno = (roomIdx2 >= 0 ? roomIdx2 : 0) + ROOMOFFSET;
    const doors = game.level?.doors ?? [];
    const doorCell = game.level?.at(doors[sroom.fdoor]?.x, doors[sroom.fdoor]?.y);
    if (doorCell) {
        if ((doorCell.flags | 0) === D_NODOOR) {
            doorCell.flags = D_ISOPEN;
            newsym(doors[sroom.fdoor].x, doors[sroom.fdoor].y);
        }
        if ((doorCell.typ | 0) === SDOOR) {
            cvt_sdoor_to_door(doorCell); /* C shknam.c:743; detect.c:1589 */
            newsym(doors[sroom.fdoor].x, doors[sroom.fdoor].y);
        }
        if ((doorCell.flags | 0) & D_TRAPPED)
            doorCell.flags = D_LOCKED;
        /* C: if door locked → engrave "Closed for inventory" outside */
        if ((doorCell.flags | 0) === D_LOCKED) {
            let m = doors[sroom.fdoor].x, n = doors[sroom.fdoor].y;
            const sx0 = m, sy0 = n;
            if (inside_shop(sx0 + 1, sy0))
                m--;
            else if (inside_shop(sx0 - 1, sy0))
                m++;
            if (inside_shop(sx0, sy0 + 1))
                n--;
            else if (inside_shop(sx0, sy0 - 1))
                n++;
            make_engr_at(m, n, "Closed for inventory", null, 0, DUST);
            const adjLoc = game.level?.at(m, n);
            if (adjLoc && adjLoc.typ !== CORR && adjLoc.typ !== ROOM) {
                /* C: Is_special(&u.uz) || *in_rooms(m,n,0) → ROOM : CORR */
                adjLoc.typ = (Is_special(game.u?.uz) || in_rooms(m, n, 0).length > 0)
                    ? ROOM : CORR;
            }
        }
    }
    /* C: tribute block — count goodpos cells, pick specialspot */
    let stockcount = 0, specialspot = 0;
    const tributeEnabled = !!(game.context?.tribute?.enabled)
        && !(game.context?.tributeBookstock);
    if (tributeEnabled) {
        for (let sx = sroom.lx; sx <= sroom.hx; sx++)
            for (let sy = sroom.ly; sy <= sroom.hy; sy++)
                if (stock_room_goodpos(sroom, rmno, sh, sx, sy))
                    stockcount++;
        specialspot = rnd(stockcount);
        stockcount = 0;
    }
    /* C: main cell loop — mkshobj_at for each eligible cell */
    for (let sx = sroom.lx; sx <= sroom.hx; sx++) {
        for (let sy = sroom.ly; sy <= sroom.hy; sy++) {
            if (stock_room_goodpos(sroom, rmno, sh, sx, sy)) {
                stockcount++;
                await mkshobj_at_shk(shp, shpIndx, sx, sy, !!(stockcount && stockcount === specialspot));
            }
        }
    }
    if (game.orcus_level && on_level(game.u?.uz, game.orcus_level)) {
        const shkmon = shop_keeper(rmno);
        if (shkmon)
            await mongone(shkmon);
    }
    /* C: svl.level.flags.has_shop = TRUE */
    if (game.level?.flags)
        game.level.flags.has_shop = true;
}

/* C ref: shknam.c:899-906 — shkname_is_pname: check if shopkeeper's name is a player name
 * boolean shkname_is_pname(struct monst *mtmp)
 */
export function shkname_is_pname(mtmp) {
    const shknm = mtmp?.mextra?.eshk?.shknam;
    if (typeof shknm !== 'string' || !shknm.length)
        return false;
    const c0 = shknm.charAt(0);
    return c0 === '-' || c0 === '+' || c0 === '=';
}

/* C shknam.c:805 saleable(shkp, obj) — does this shop deal in this item? */
export function saleable(shkp, obj) {
    const eshkp = ESHK(shkp);
    const shp = shtype_row(((eshkp ? (eshkp.shoptype | 0) : 0) - SHOPBASE) | 0);
    if (!shp)
        return false;
    if ((shp.symb | 0) === 0 /* RANDOM_CLASS */)
        return true;
    for (let i = 0; i < shp.iprobs.length && shp.iprobs[i].iprob; i++) {
        const itype = shp.iprobs[i].itype | 0;
        if (itype === VEGETARIAN_CLASS_SALE) {
            if (veggy_item(obj, 0)) return true;
            continue;
        }
        if (itype < 0 ? (itype === -(obj.otyp | 0)) : (itype === (obj.oclass | 0)))
            return true;
    }
    return false;
}

/* C shknam.c:37 VEGETARIAN_CLASS = MAXOCLASSES + 1 (js/mklev.js:1888). */
const VEGETARIAN_CLASS_SALE = 19;

/* C ref: shknam.c:841-849 Shknam(mtmp) = shkname(mtmp) with its first
 * character capitalized via highc(). */
export function Shknam(shkp) {
    const nam = shkname(shkp);
    return nam ? (highc(nam.charAt(0)) + nam.slice(1)) : nam;
}

/* C ref: shknam.c:855-897 shkname(mtmp) — the shopkeeper's own name from
 * ESHK(mtmp)->shknam, with any non-letter prefix character stripped (the
 * leading '-'/'+'/'=' markers that flag a player-name-derived shk name).
 * Hallucination picks a random shop type, then a name from its list. */
export function shkname(mtmp) {
    /* C shknam.c:861-864: the name buffer comes from noit_mon_nam(), with
     * isshk cleared so mon_nam() cannot recurse back here. Under Hallucination
     * that call draws rndmonnam() (do_name.c:952) on the DISPLAY stream and the
     * result is then overwritten below, so the draws are a pure side effect. */
    let nam;
    if (mtmp) {
        const save_isshk = mtmp.isshk;
        mtmp.isshk = 0;
        nam = noit_mon_nam(mtmp);
        mtmp.isshk = save_isshk;
    }
    /* C shknam.c:866-869: validate before the Hallucination RNG calls. */
    if (!mtmp || !mtmp.isshk) {
        impossible_sync('shkname: "%s" is not a shopkeeper.', nam);
        return nam;
    }
    if (!mtmp.mextra?.eshk)
        throw new Error(`panic: shkname: shopkeeper "${nam}" lacks 'eshk' data.`);
    /* C shknam.c:874-890: Hallucination (HHallucination && !Halluc_resistance)
     * and not gameover picks a random shop type, then a random name from its
     * list (two rn2 draws, js/mklev.js shkname_halluc_pick). */
    const hp = game.u?.uprops?.[HALLUC];
    const hr = game.u?.uprops?.[HALLUC_RES];
    let shknm = mtmp?.mextra?.eshk?.shknam;
    if (hp && (hp.intrinsic | 0) && !((hr?.intrinsic | 0) || (hr?.extrinsic | 0))
        && !game.program_state?.gameover) {
        const pick = shkname_halluc_pick();
        if (pick)
            shknm = pick;
    }
    /* C shknam.c:892-893; hacklib.c:69 letter() also includes '@'. */
    return letter(shknm.charAt(0)) ? shknm : shknm.slice(1);
}

/* C shknam.c:907-925 is_izchak — use the stored name, never shkname(),
 * which can invent a random name while hallucinating. */
export function is_izchak(shkp, override_hallucination) {
    if (_cmd_Hallucination() && !override_hallucination)
        return false;
    if (!shkp.isshk)
        return false;
    if (!in_town(shkp.mx, shkp.my))
        return false;
    let shknm = ESHK(shkp).shknam;
    if (!letter(shknm[0]))
        shknm = shknm.slice(1);
    return shknm === 'Izchak';
}
