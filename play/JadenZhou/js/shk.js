// shk.js -- shopkeepers: shop entry and exit, shopkeeper movement,
// billing and paying.
// C ref: shk.c
//
// Paths no session reaches yet throw a 'not ported yet' error.

import { game } from './gstate.js';
import { obj_stop_timers } from './timeout.js';
import { rn2 } from './rng.js';
import {
    SHOPBASE, NO_ROOM, ROOMOFFSET, IS_ROOM, PL_NSIZ, EYE, HAND, BOLT_LIM,
    REPAIR_DELAY, INVIS, DISPLACED, CONFLICT, DEAF, FAST, PASSES_WALLS,
    BLINDED, TELEPAT, DETECT_MONSTERS, M_AP_NOTHING, M_AP_MONSTER, u_at,
} from './const.js';
import { ANY_SHOP } from './const.js';
import { IS_DOOR, SVALL, ROWNO, COLNO, RLOC_NOMSG, RLOC_MSG, NECK } from './const.js';
import { ROLL_FROM } from './rng.js';
import { mnexto } from './teleport.js';
import { mnearto } from './mon.js';
import { yelp, growl, You_hear } from './sounds.js';
import { tty_yn_function } from './wintty.js';
import { body_part } from './insight.js';
import { poly_gender } from './polyself.js';
import { is_demon } from './mondata.js';
import { search_special } from './sounds.js';
import { mons, PM_GRID_BUG, PM_ROGUE, MS_ANIMAL, M1_HUMANOID, S_DOG,
         S_FELINE, S_RODENT, S_YETI } from './monsters.js';
import { PICK_AXE, DWARVISH_MATTOCK } from './objects.js';
import { pline, You, Your, pline_The, canseemon, canspotmon,
         sensemon } from './display.js';
import { dist2, s_suffix } from './hacklib.js';
import { in_rooms, check_special_room } from './hack.js';
import { on_level, assign_level } from './dungeon.js';
import { m_at, sobj_at } from './makemon.js';
import { carrying } from './invent.js';
import { mattacku } from './mhitu.js';
import { dochug, m_canseeu } from './monmove.js';
import { move_special } from './priest.js';
import { holetime } from './dig.js';
import { Hello, genders } from './role.js';
import { Shknam, shkname, shtypes } from './shknam.js';
import { y_monnam, pronoun_gender, PRONOUN_NO_IT,
         PRONOUN_HALLU } from './do_name.js';
import { adjalign, ACURR } from './attrib.js';
import { record_achievement } from './do.js';
import { ACH_SHOP } from './const.js';
import { discover_object } from './o_init.js';
import { t_at } from './trap.js';
import { passes_walls } from './mondata.js';
import { wake_nearto } from './mon.js';
import { A_CHA } from './const.js';
import { rnd } from './rng.js';
import {
    ECMD_OK, ECMD_TIME, ECMD_CANCEL, MAXULEV, CONTAINED_TOO, BURIED_TOO,
    BILLSZ, COST_SINGLEOBJ, COST_CONTENTS, HUNGRY, FIRE_RES, SLEEP_RES,
    COLD_RES, DISINT_RES, SHOCK_RES, POISON_RES, ACID_RES, STONE_RES,
    TELEPORT, TELEPORT_CONTROL, Has_contents, HEAD, LOW_PM, isok,
} from './const.js';
import { M1_NOHEAD } from './monsters.js';
import { mongone } from './mon.js';
import { S_KOP, PM_WATCHMAN, PM_WATCH_CAPTAIN, PM_TOURIST, PM_ELF,
         G_UNIQ } from './monsters.js';
import {
    objects, COIN_CLASS, GEM_CLASS, FOOD_CLASS, WAND_CLASS, POTION_CLASS,
    ARMOR_CLASS, WEAPON_CLASS, TOOL_CLASS, GLASS, GEMSTONE, DUNCE_CAP,
    FIRST_GLASS_GEM, FIRST_REAL_GEM, DIAMOND, OPAL, SAPPHIRE, AQUAMARINE,
    RUBY, JASPER, AMBER, TOPAZ, JACINTH, AGATE, CITRINE, CHRYSOBERYL,
    BLACK_OPAL, JET, EMERALD, JADE, AMETHYST, FLUORITE, STRANGE_OBJECT, TIN,
    EGG, CORPSE, POT_WATER, LARGE_BOX,
} from './objects.js';
import { splitobj, obj_extract_self, add_to_minv, weight,
         Is_candle } from './mkobj.js';
import { freeinv, addinv, merge_choice, count_unpaid } from './invent.js';
import { inv_cnt } from './hack.js';
import { dropy } from './do.js';
import { hidden_gold, currency, mbodypart } from './insight.js';
import { getpos } from './getpos.js';
import { cansee } from './vision.js';
import { There, You_cant } from './display.js';
import { Monnam, x_monnam, ARTICLE_THE } from './do_name.js';
import { money_cnt } from './u_init.js';
import { the } from './iactions.js';
import { The, xname } from './objnam.js';
import { is_vampire, is_elf, is_human } from './mondata.js';
import { intrinsic_possible } from './eat.js';
import { tty_create_nhwindow, tty_start_menu, tty_add_menu, tty_end_menu,
         tty_select_menu, tty_destroy_nhwindow } from './wintty.js';
import { add_menu_heading } from './invent.js';
import { PICK_ANY, MENU_FULL, MENU_TRADITIONAL, NHW_MENU,
         MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE } from './const.js';
import { ATR_NONE, NO_COLOR } from './terminal.js';
import { M1_NOLIMBS } from './monsters.js';
import { observe_object } from './o_init.js';
import { Hallucination, bot } from './display.js';
import { highc } from './hacklib.js';
import { SCROLL_CLASS, SPBOOK_CLASS, MIRROR } from './objects.js';
import { saleable } from './shknam.js';
import { paydoname } from './objnam.js';
import { simpleonames, thesimpleoname } from './iactions.js';

// ── small helpers (C ref: youprop.h / monst.h / shk.c macros) ──

/* C ref: youprop.h -- (H* || E*) && !B* */
function uhave(prop) {
    const p = game.u.uprops[prop];
    return !!(p && (p.intrinsic || p.extrinsic) && !p.blocked);
}
function Invis() { return uhave(INVIS); }
/* C ref: youprop.h Displaced, Conflict, Fast -- (H* || E*) */
function Displaced() {
    const p = game.u.uprops[DISPLACED];
    return !!(p && (p.intrinsic || p.extrinsic));
}
function Conflict() {
    const p = game.u.uprops[CONFLICT];
    return !!(p && (p.intrinsic || p.extrinsic));
}
function Fast() {
    const p = game.u.uprops[FAST];
    return !!(p && (p.intrinsic || p.extrinsic));
}
/* C ref: youprop.h Deaf */
function Deaf() {
    const p = game.u.uprops[DEAF];
    return !!(p && (p.intrinsic || p.extrinsic || game.u.uroleplay?.deaf));
}
/* C ref: youprop.h Blind -- display.js has the full test */
function Blind() {
    const p = game.u.uprops[BLINDED];
    return !!(p && (p.intrinsic || p.extrinsic) && !p.blocked);
}
function Passes_walls() {
    const p = game.u.uprops[PASSES_WALLS];
    return !!(p && (p.intrinsic || p.extrinsic));
}
/* C ref: youprop.h Blind_telepat, Detect_monsters */
function Blind_telepat() {
    const p = game.u.uprops[TELEPAT];
    return !!(p && (p.intrinsic || p.extrinsic));
}
function Detect_monsters() {
    const p = game.u.uprops[DETECT_MONSTERS];
    return !!(p && (p.intrinsic || p.extrinsic));
}
/* C ref: role.h Role_if() */
function Role_if(pm) { return game.urole.mnum === pm; }
/* C ref: monst.h helpless() */
function helpless(mon) { return !!(mon.msleeping || !mon.mcanmove); }
/* C ref: shk.c NOTANGRY(), ANGRY() */
function ANGRY(mon) { return !mon.mpeaceful; }
/* C ref: shk.c muteshk() */
function muteshk(shkp) {
    return helpless(shkp) || shkp.data.msound <= MS_ANIMAL;
}
/* C ref: shk.c IS_SHOP() */
function IS_SHOP(x) { return game.level.rooms[x].rtype >= SHOPBASE; }
/* C ref: hack.h distu() */
function distu(x, y) { return dist2(x, y, game.u.ux, game.u.uy); }
/* C ref: hack.h mdistu() */
function mdistu(mon) { return dist2(mon.mx, mon.my, game.u.ux, game.u.uy); }
/* C ref: hack.h um_dist() */
function um_dist(x, y, n) {
    return Math.abs(game.u.ux - x) > n || Math.abs(game.u.uy - y) > n;
}
/* C ref: hacklib.c online2(); hack.h onlineu() */
function online2(x0, y0, x1, y1) {
    const dx = x0 - x1, dy = y0 - y1;
    return (!dy || !dx || dy === dx || dy === -dx);
}
function onlineu(xx, yy) { return online2(xx, yy, game.u.ux, game.u.uy); }
/* C ref: hacklib.c plur() */
function plur(x) { return (x === 1) ? "" : "s"; }
/* C ref: hacklib.c strncmpi() -- nonzero when the strings differ */
function strncmpi(s1, s2, n) {
    return (s1 || '').slice(0, n).toLowerCase()
           !== (s2 || '').slice(0, n).toLowerCase();
}
/* C ref: you.h noit_mhis(), noit_mhe() */
function noit_mhis(mtmp) {
    return genders[pronoun_gender(mtmp, PRONOUN_NO_IT | PRONOUN_HALLU)].his;
}
function noit_mhe(mtmp) {
    return genders[pronoun_gender(mtmp, PRONOUN_NO_IT | PRONOUN_HALLU)].he;
}
/* C ref: polyself.c mbodypart() -- ported in insight.js beside body_part() */
export { mbodypart };
/* C ref: pline.c verbalize() -- SetVoice() only matters for speech
   output, which the tty doesn't do */
async function verbalize(line) {
    if (Deaf())
        return; /* vpline(): PLINE_VERBALIZE is dropped when Deaf */
    await pline(`"${line}"`);
}
/* C ref: mondata.c resist_conflict() */
function resist_conflict(mtmp) {
    /* always a small chance at 19 */
    const resist_chance = Math.min(19, (ACURR(A_CHA) - mtmp.m_lev
                                        + game.u.ulevel));

    return (rnd(20) > resist_chance);
}
/* C ref: hack.h makeknown() */
function makeknown(x) { discover_object(x, true, true, true); }

const angrytexts = [ "quite upset", "ticked off", "furious" ];

// C ref: shk.c next_shkp()
export function next_shkp(shkp, withbill) {
    for (; shkp; shkp = shkp.nmon) {
        if (shkp.mhp < 1) /* DEADMONSTER */
            continue;
        if (shkp.isshk && (shkp.mextra.eshk.billct || !withbill))
            break;
    }

    if (shkp) {
        if (ANGRY(shkp)) {
            if (!shkp.mextra.eshk.surcharge)
                rile_shk(shkp);
        }
    }
    return shkp;
}

// C ref: shk.c addupbill()
function addupbill(shkp) {
    const eshkp = shkp.mextra.eshk;
    let ct = eshkp.billct;
    let total = 0;

    for (let i = 0; ct--; i++)
        total += eshkp.bill[i].price * eshkp.bill[i].bquan;
    return total;
}

// C ref: shk.c inside_shop()
/* x,y is strictly inside shop */
export function inside_shop(x, y) {
    const loc = game.level.at(x, y);
    let rno = loc.roomno;
    if ((rno < ROOMOFFSET) || loc.edge || !IS_SHOP(rno - ROOMOFFSET))
        rno = NO_ROOM;
    return rno;
}

// C ref: shk.c u_left_shop()
export async function u_left_shop(leavestring, newlev) {
    const u = game.u;
    const levl = (x, y) => game.level.at(x, y);

    /*
     * IF player
     * ((didn't leave outright) AND
     *  ((he is now strictly-inside the shop) OR
     *   (he wasn't strictly-inside last turn anyway)))
     * THEN (there's nothing to do, so just return)
     */
    if (!leavestring && (!levl(u.ux, u.uy).edge || levl(u.ux0, u.uy0).edge))
        return;

    const shkp = shop_keeper(leavestring ? leavestring.charCodeAt(0)
                                         : u.ushops0.charCodeAt(0));
    if (!shkp || !inhishop(shkp))
        return; /* shk died, teleported, changed levels... */

    const eshkp = shkp.mextra.eshk;
    if (!eshkp.billct && !eshkp.debit) /* bill is settled */
        return;

    if (!leavestring && !muteshk(shkp)) {
        /*
         * Player just stepped onto shop-boundary (known from above logic).
         * Try to intimidate him into paying his bill
         */
        const not_upset = !eshkp.surcharge;
        if (!Deaf() && !muteshk(shkp)) {
            await verbalize(not_upset
                            ? `${game.plname}!  Please pay before leaving.`
                            : `${game.plname}!  Don't you leave without paying!`);
        } else {
            await pline(`${Shknam(shkp)} ${not_upset ? "points out"
                                                     : "makes it clear"
                         } that you need to pay before leaving${
                         not_upset ? "." : "!"}`);
        }
        return;
    }

    if (await rob_shop(shkp)) {
        throw new Error('u_left_shop(): call_kops() not ported yet');
    }
}

// C ref: shk.c rob_shop()
/* shop merchandise has been taken; pay for it with any credit available;
   return false if the debt is fully covered by credit, true otherwise */
async function rob_shop(shkp) {
    const eshkp = shkp.mextra.eshk;

    await rouse_shk(shkp, true);
    let total = (addupbill(shkp) + eshkp.debit);
    if (eshkp.credit >= total) {
        throw new Error('rob_shop(): credit covering the bill not ported yet');
    } else {
        throw new Error('rob_shop(): escaping without paying not ported yet');
    }
}

// C ref: shk.c deserted_shop()
/* give a message when entering an untended shop (caller has verified that) */
async function deserted_shop(enterstring) {
    const r = game.level.rooms[enterstring.charCodeAt(0) - ROOMOFFSET];
    let m = 0, n = 0;

    for (let x = r.lx; x <= r.hx; ++x)
        for (let y = r.ly; y <= r.hy; ++y) {
            if (u_at(x, y))
                continue;
            const mtmp = m_at(x, y);
            if (mtmp) {
                ++n;
                if (sensemon(mtmp)
                    || (((mtmp.m_ap_type || M_AP_NOTHING) === M_AP_NOTHING
                         || mtmp.m_ap_type === M_AP_MONSTER)
                        && canseemon(mtmp)))
                    ++m;
            }
        }

    if (Blind() && !(Blind_telepat() || Detect_monsters()))
        ++n; /* force feedback to be less specific */

    await pline(`This shop ${(m < n) ? "seems to be" : "is"} ${
                 !n ? "deserted" : "untended"}.`);
}

// C ref: shk.c u_entered_shop()
/* called from check_special_room(hack.c) */
export async function u_entered_shop(enterstring) {
    const u = game.u;
    if (game.empty_shops === undefined)
        game.empty_shops = ''; /* static char empty_shops[5] */
    let rt;

    if (!enterstring)
        return;

    const shkp = shop_keeper(enterstring.charCodeAt(0));
    if (!shkp) {
        if (!game.empty_shops.includes(enterstring[0])
            && (in_rooms(u.ux, u.uy, SHOPBASE)
                !== in_rooms(u.ux0, u.uy0, SHOPBASE)))
            await deserted_shop(enterstring);
        game.empty_shops = u.ushops;
        u.ushops = '';
        return;
    }

    const eshkp = shkp.mextra.eshk;

    if (!inhishop(shkp)) {
        /* dump core when referenced */
        eshkp.bill_p = -1000;
        if (!game.empty_shops.includes(enterstring[0]))
            await deserted_shop(enterstring);
        game.empty_shops = u.ushops;
        u.ushops = '';
        return;
    }
    record_achievement(ACH_SHOP);

    eshkp.bill_p = eshkp.bill || (eshkp.bill = []); /* &(eshkp->bill[0]) */

    if ((!eshkp.visitct || eshkp.customer)
        && strncmpi(eshkp.customer, game.plname, PL_NSIZ)) {
        /* You seem to be new here */
        eshkp.visitct = 0;
        eshkp.following = 0;
        eshkp.customer = (game.plname || '').slice(0, PL_NSIZ);
        pacify_shk(shkp, true);
    }

    if (muteshk(shkp) || eshkp.following)
        return; /* no dialog */

    if (Invis()) {
        await pline(`${Shknam(shkp)} senses your presence.`);
        if (!Deaf() && !muteshk(shkp)) {
            await verbalize("Invisible customers are not welcome!");
        } else {
            await pline(`${Shknam(shkp)} stands firm as if ${noit_mhe(shkp)
                         } knows you are there.`);
        }
        return;
    }

    rt = game.level.rooms[enterstring.charCodeAt(0) - ROOMOFFSET].rtype;

    if (ANGRY(shkp)) {
        if (!Deaf() && !muteshk(shkp)) {
            await verbalize(`So, ${game.plname}, you dare return to ${
                             s_suffix(shkname(shkp))} ${
                             shtypes[rt - SHOPBASE].name}?!`);
        } else {
            throw new Error('u_entered_shop(): ROLL_FROM(angrytexts) not ported yet');
        }
    } else if (eshkp.surcharge) {
        if (!Deaf() && !muteshk(shkp)) {
            await verbalize(`Back again, ${game.plname}?  I've got my ${
                             mbodypart(shkp, EYE)} on you.`);
        } else {
            await pline_The(`atmosphere at ${s_suffix(shkname(shkp))} ${
                             shtypes[rt - SHOPBASE].name} seems unwelcoming.`);
        }
    } else if (eshkp.robbed) {
        if (!Deaf()) {
            await pline(`${Shknam(shkp)} mutters imprecations against shoplifters.`);
        } else {
            await pline(`${Shknam(shkp)} is combing through ${noit_mhis(shkp)
                         } inventory list.`);
        }
    } else {
        if (!Deaf() && !muteshk(shkp)) {
            await verbalize(`${Hello(shkp)}, ${game.plname}!  Welcome${
                             eshkp.visitct++ ? " again" : ""} to ${
                             s_suffix(shkname(shkp))} ${
                             shtypes[rt - SHOPBASE].name}!`);
        } else {
            await You(`enter ${s_suffix(shkname(shkp))} ${
                       shtypes[rt - SHOPBASE].name}${
                       eshkp.visitct++ ? " again" : ""}!`);
        }
    }
    /* can't do anything about blocking if teleported in */
    if (!inside_shop(u.ux, u.uy)) {
        let should_block;
        const not_upset = !eshkp.surcharge;
        let cnt;
        let tool;
        let pick = carrying(PICK_AXE),
            mattock = carrying(DWARVISH_MATTOCK);

        if (pick || mattock) {
            cnt = 1;               /* so far */
            if (pick && mattock) { /* carrying both types */
                tool = "digging tool";
                cnt = 2; /* `more than 1' is all that matters */
            } else if (pick) {
                tool = "pick-axe";
                /* hack: `pick' already points somewhere into inventory */
                while ((pick = pick.nobj) != null)
                    if (pick.otyp === PICK_AXE)
                        ++cnt;
            } else { /* assert(mattock != 0) */
                tool = "mattock";
                while ((mattock = mattock.nobj) != null)
                    if (mattock.otyp === DWARVISH_MATTOCK)
                        ++cnt;
                /* [ALI] Shopkeeper identifies mattock(s) */
                if (!Blind())
                    makeknown(DWARVISH_MATTOCK);
            }
            if (!Deaf() && !muteshk(shkp)) {
                await verbalize(not_upset
                                ? `Will you please leave your ${tool}${plur(cnt)} outside?`
                                : `Leave the ${tool}${plur(cnt)} outside.`);
            } else {
                await pline(`${Shknam(shkp)} ${not_upset ? "is hesitant"
                                                         : "refuses"
                             } to let you in with your ${tool}${plur(cnt)}.`);
            }
            should_block = true;
        } else if (u.usteed) {
            if (!Deaf() && !muteshk(shkp)) {
                await verbalize(not_upset
                                ? `Will you please leave ${y_monnam(u.usteed)} outside?`
                                : `Leave ${y_monnam(u.usteed)} outside.`);
            } else {
                await pline(`${Shknam(shkp)} ${not_upset ? "doesn't want"
                                                         : "refuses"
                             } to let you in while you're riding ${
                             y_monnam(u.usteed)}.`);
            }
            should_block = true;
        } else {
            should_block =
                (Fast() && (sobj_at(PICK_AXE, u.ux, u.uy)
                            || sobj_at(DWARVISH_MATTOCK, u.ux, u.uy)));
        }
        if (should_block)
            await dochug(shkp); /* shk gets extra move */
    }
    return;
}

// C ref: shk.c inhishop()
/* 1: shopkeeper is currently in her shop or its boundary; 0: not */
export function inhishop(shkp) {
    const eshkp = shkp.mextra.eshk;

    if (!on_level(eshkp.shoplevel, game.u.uz))
        return false;
    const shkrooms = in_rooms(shkp.mx, shkp.my, SHOPBASE);
    return shkrooms.includes(String.fromCharCode(eshkp.shoproom));
}

// C ref: shk.c shkgone()
/* called in mon.c */
export function shkgone(mtmp) {
    const u = game.u;
    const eshk = mtmp.mextra.eshk;
    const sroom = game.level.rooms[eshk.shoproom - ROOMOFFSET];

    /* [BUG: some of this should be done on the shop level */
    /*       even when the shk dies on a different level.] */
    if (on_level(eshk.shoplevel, u.uz)) {
        discard_damage_owned_by(mtmp);
        sroom.resident = null;
        if (!search_special(ANY_SHOP))
            game.level.flags.has_shop = 0;

        /* items on shop floor revert to ordinary objects */
        for (let sx = sroom.lx; sx <= sroom.hx; sx++)
            for (let sy = sroom.ly; sy <= sroom.hy; sy++)
                for (const otmp of game.level.objects || [])
                    if (otmp.where === 'OBJ_FLOOR' && otmp.ox === sx && otmp.oy === sy)
                        otmp.no_charge = 0;

        /* Make sure bill is set only when the
           dead shk is the resident shk. */
        const ushops = u.ushops || '';
        const p = ushops.indexOf(String.fromCharCode(eshk.shoproom));
        if (p >= 0) {
            setpaid(mtmp);
            eshk.bill_p = null;
            /* remove eshk->shoproom from u.ushops */
            u.ushops = ushops.slice(0, p) + ushops.slice(p + 1);
        }
    }
}

// C ref: shk.c discard_damage_owned_by()
function discard_damage_owned_by(shkp) {
    let dam = game.level.damagelist, dam2, prevdam = null;

    while (dam) {
        const x = dam.place.x, y = dam.place.y;

        if (in_rooms(x, y, SHOPBASE).includes(
                String.fromCharCode(shkp.mextra.eshk.shoproom))) {
            dam2 = dam.next;
            if (prevdam)
                prevdam.next = dam2;
            if (dam === game.level.damagelist)
                game.level.damagelist = dam2;
        } else {
            prevdam = dam;
            dam2 = dam.next;
        }

        dam = dam2;
    }
}

// C ref: shk.c shop_keeper()
/* return the shopkeeper for rooms[rmno-2]; returns Null if there isn't one */
export function shop_keeper(rmno) {
    const shkp = (rmno >= ROOMOFFSET)
        ? (game.level.rooms?.[rmno - ROOMOFFSET]?.resident || null) : null;
    if (shkp) {
        if (shkp.mextra?.eshk) {
            if (ANGRY(shkp)) {
                if (!shkp.mextra.eshk.surcharge)
                    rile_shk(shkp);
            }
        } else {
            /* impossible("shop resident not shopkeeper") */
            return null;
        }
    }
    return shkp;
}

// C ref: shk.c tended_shop()
export function tended_shop(sroom) {
    const mtmp = sroom.resident;

    return !mtmp ? false : inhishop(mtmp);
}

// C ref: shk.c noisy_shop()
export async function noisy_shop(sroom) {
    const mtmp = sroom.resident;

    if (mtmp && inhishop(mtmp)) {
        await wake_nearto(mtmp.mx, mtmp.my, 11 * 11);
    }
}

// C ref: shk.c set_residency()
export function set_residency(shkp, zero_out) {
    if (on_level(shkp.mextra.eshk.shoplevel, game.u.uz))
        game.level.rooms[shkp.mextra.eshk.shoproom - ROOMOFFSET].resident =
            (zero_out) ? null : shkp;
}

// C ref: shk.c restshk()
/* called in restoring a level */
export function restshk(shkp, ghostly) {
    if (game.u.uz.dlevel) {
        const eshkp = shkp.mextra.eshk;

        if (eshkp.bill_p !== -1000)
            eshkp.bill_p = eshkp.bill || (eshkp.bill = []); /* &eshkp->bill[0] */
        /* shoplevel can change as dungeons move around */
        /* savebones guarantees that non-homed shk's will be gone */
        if (ghostly) {
            assign_level(eshkp.shoplevel, game.u.uz);
            if (ANGRY(shkp) && strncmpi(eshkp.customer, game.plname, PL_NSIZ))
                pacify_shk(shkp, true);
        }
    }
}

// C ref: shk.c pacify_shk()
/* remove previously applied surcharge from all billed items */
function pacify_shk(shkp, clear_surcharge) {
    const eshkp = shkp.mextra.eshk;
    shkp.mpeaceful = 1; /* NOTANGRY(shkp) = TRUE: make peaceful */
    if (clear_surcharge && eshkp.surcharge) {
        let ct = eshkp.billct;

        eshkp.surcharge = false;
        for (let i = 0; ct-- > 0; i++) {
            const bp = eshkp.bill_p[i];
            const reduction = Math.trunc((bp.price + 3) / 4);
            bp.price -= reduction; /* undo 33% increase */
        }
    }
}

// C ref: shk.c rile_shk()
/* add aggravation surcharge to all billed items */
export function rile_shk(shkp) {
    const eshkp = shkp.mextra.eshk;
    shkp.mpeaceful = 0; /* NOTANGRY(shkp) = FALSE: make angry */
    if (!eshkp.surcharge) {
        let ct = eshkp.billct;

        eshkp.surcharge = true;
        for (let i = 0; ct-- > 0; i++) {
            const bp = eshkp.bill_p[i];
            const surcharge = Math.trunc((bp.price + 2) / 3);
            bp.price += surcharge;
        }
    }
}

// C ref: shk.c rouse_shk()
/* wakeup and/or unparalyze shopkeeper */
async function rouse_shk(shkp, verbosely) {
    if (helpless(shkp)) {
        /* greed induced recovery... */
        if (verbosely && canspotmon(shkp))
            await pline(`${Shknam(shkp)} ${shkp.msleeping ? "wakes up"
                                                          : "can move again"}.`);
        shkp.msleeping = 0;
        shkp.mfrozen = 0;
        shkp.mcanmove = 1;
    }
}

// C ref: shk.c add_damage()
export function add_damage(x, y, cost) {
    const lev = game.level;
    let tmp_dam;

    if (IS_DOOR(lev.at(x, y).typ)) {
        let mtmp;
        let found = false;

        /* Don't schedule for repair unless it's a real shop entrance */
        const shops = in_rooms(x, y, SHOPBASE);
        for (let i = 0; i < shops.length; i++)
            if ((mtmp = shop_keeper(shops.charCodeAt(i))) != null
                && x === mtmp.mextra.eshk.shd.x
                && y === mtmp.mextra.eshk.shd.y) {
                found = true;
                break;
            }
        if (!found)
            return;
    }
    for (tmp_dam = lev.damagelist; tmp_dam; tmp_dam = tmp_dam.next)
        if (tmp_dam.place.x === x && tmp_dam.place.y === y) {
            tmp_dam.cost += cost;
            tmp_dam.when = game.moves; /* needed by pay_for_damage() */
            return;
        }
    tmp_dam = {
        when: game.moves,
        place: { x, y },
        cost,
        typ: lev.at(x, y).typ,
        flags: lev.at(x, y).flags,
        next: lev.damagelist || null,
    };
    lev.damagelist = tmp_dam;
    /* If player saw damage, display walls post-repair as walls, not stone */
    if (cansee(x, y))
        lev.at(x, y).seenv = SVALL;
}

// C ref: shk.c shk_impaired()
/* is shk unable to repair damage? */
function shk_impaired(shkp) {
    if (!shkp || !shkp.isshk || !inhishop(shkp))
        return true;
    if (helpless(shkp) || shkp.mextra.eshk.following)
        return true;
    return false;
}

// C ref: shk.c repairable_damage()
/* is damage dam repairable by shopkeeper shkp? */
function repairable_damage(dam, shkp) {
    let mtmp;

    if (!dam || shk_impaired(shkp))
        return false;

    const x = dam.place.x;
    const y = dam.place.y;

    /* too soon to fix it? */
    if ((game.moves - dam.when) < REPAIR_DELAY)
        return false;
    /* is it a wall? don't fix if anyone is in the way */
    if (!IS_ROOM(dam.typ)) {
        if ((u_at(x, y) && !Passes_walls())
            || (x === shkp.mx && y === shkp.my)
            || ((mtmp = m_at(x, y)) && !passes_walls(mtmp.data)))
            return false;
    }
    /* is it a trap? don't fix if hero or monster is in it */
    const ttmp = t_at(x, y);
    if (ttmp) {
        if (u_at(x, y))
            return false;
        if ((mtmp = m_at(x, y)) && mtmp.mtrapped)
            return false;
    }
    /* does it belong to shkp? */
    if (!in_rooms(x, y, SHOPBASE).includes(
            String.fromCharCode(shkp.mextra.eshk.shoproom)))
        return false;

    return true;
}

// C ref: shk.c find_damage()
/* find any damage shopkeeper shkp could repair. returns NULL is none found */
function find_damage(shkp) {
    let dam = game.level.damagelist;

    if (shk_impaired(shkp))
        return null;

    while (dam) {
        if (repairable_damage(dam, shkp))
            return dam;

        dam = dam.next;
    }

    return null;
}

// C ref: shk.c discard_damage_struct()
function discard_damage_struct(dam) {
    if (!dam)
        return;

    if (dam === game.level.damagelist) {
        game.level.damagelist = dam.next;
    } else {
        let prev = game.level.damagelist;

        while (prev && prev.next !== dam)
            prev = prev.next;
        if (prev)
            prev.next = dam.next;
    }
    /* memset(dam, 0, sizeof *dam); free(dam): garbage collected */
}

// C ref: shk.c shk_fixes_damage()
/* Shopkeeper tries to repair damage belonging to them */
async function shk_fixes_damage(shkp) {
    const dam = find_damage(shkp);
    let shk_closeby;

    if (!dam)
        return;

    shk_closeby = (mdistu(shkp) <= Math.trunc(BOLT_LIM / 2) * Math.trunc(BOLT_LIM / 2));

    if (canseemon(shkp)) {
        await pline(`${Shknam(shkp)} whispers ${
            shk_closeby ? "an incantation" : "something"}.`);
    } else if (!Deaf() && shk_closeby) {
        /* Soundeffect(se_mutter_incantation, 100); */
        await You_hear("someone muttering an incantation.");
    }

    await repair_damage(shkp, dam, false);

    discard_damage_struct(dam);
}

const LITTER_UPDATE = 0x01;
const LITTER_OPEN = 0x02;
const LITTER_INSHOP = 0x04;
const horiz = (i) => ((i % 3) - 1);
const vert = (i) => (Math.trunc(i / 3) - 1);
/* C ref: svl.level.objects[x][y] -- top object of the floor pile at <x,y>
   (place_object() puts new objects at the front of level.objects) */
function level_objects_top(x, y) {
    for (const o of game.level.objects || [])
        if (o.ox === x && o.oy === y && o.where === 'OBJ_FLOOR')
            return o;
    return null;
}

// C ref: shk.c litter_getpos()
/* find eligible spots to move items from a gap in a shop's wall that is
   being repaired; this guarantees that items will end up inside shkp's
   shop (possibly in the "free spot" or even in doorway or an adjacent
   wall gap), but if they are in a gap in a wall shared by two shops
   they might have started in the other shop */
function litter_getpos(
    litter, /* array of 9 uint8's */
    x, y,
    shkp) {
    let i, ix, iy;
    let k = 0; /* number of adjacent shop spots */

    litter.fill(0);

    if (level_objects_top(x, y) && !IS_ROOM(game.level.at(x, y).typ)) {
        for (i = 0; i < 9; i++) {
            ix = x + horiz(i);
            iy = y + vert(i);
            if (i === 4 || !isok(ix, iy) || !ZAP_POS(game.level.at(ix, iy).typ))
                continue;
            litter[i] = LITTER_OPEN;
            if (inside_shop(ix, iy) === shkp.mextra.eshk.shoproom) {
                litter[i] |= LITTER_INSHOP;
                ++k;
            }
        }
    }
    return k;
}

// C ref: shk.c litter_scatter()
/* move items from a gap in a shop's wall that is being repaired;
   litter[] guarantees that items will end up inside shkp's shop, but
   if the wall being repaired is shared by two shops the items might
   have started in the other shop */
async function litter_scatter(
    litter,
    x, y,
    shkp) {
    let otmp;
    const g = game;

    /* placement below assumes there is always at least one adjacent spot
       that's inside the shop; caller guarantees that */
    {
        /* Scatter objects haphazardly into the shop */
        if (Punished_sk() && !g.u.uswallow
            && ((g.uchain.ox === x && g.uchain.oy === y)
                || (g.uball.where === 'OBJ_FLOOR'
                    && g.uball.ox === x && g.uball.oy === y))) {
            /*
             * Either the ball or chain is in the repair location.
             * Take the easy way out and put ball&chain under hero.
             */
            if (!Deaf() && !muteshk(shkp)) {
                /* SetVoice(shkp, 0, 80, 0) */
                await verbalize("Get your junk out of my wall!");
            }
            unplacebc(); /* pick 'em up */
            await placebc();   /* put 'em down */
        }
        while ((otmp = level_objects_top(x, y)) != null) {
            /* Don't mess w/ boulders -- just merge into wall */
            if (otmp.otyp === BOULDER_SK || otmp.otyp === ROCK_SK) {
                obj_extract_self(otmp);
                obfree(otmp, null);
            } else {
                let trylimit = 10;
                let i = rn2(9), ix, iy;

                /* otmp must be moved otherwise level.objects[x][y] will
                   never become Null and while-loop won't terminate */
                do {
                    i = (i + 1) % 9;
                } while (--trylimit && !(litter[i] & LITTER_INSHOP));
                if ((litter[i] & (LITTER_OPEN | LITTER_INSHOP)) !== 0) {
                    ix = x + horiz(i);
                    iy = y + vert(i);
                } else {
                    /* we know shk isn't at <x,y> because repair
                       is deferred in that situation */
                    ix = shkp.mx;
                    iy = shkp.my;
                }
                /* if the wall being repaired is shared by two adjacent
                   shops, <ix,iy> might be in a different shop than the
                   one that is billing for otmp or decided it was free;
                   control of the item goes to the shk repairing the wall
                   but otmp->no_charge isn't recalculated for new shop */
                if (otmp.unpaid) {
                    let oshk = shkp;

                    /* !costly_spot() happens if otmp is moved from wall
                       to shop's "free spot", still costly_adjacent() and
                       still unpaid/on-bill; otherwise, it is being moved
                       all the way into the shop so take it off the bill */
                    if (costly_spot(ix, iy)
                        && ((onbill(otmp, oshk, true)
                             || ((oshk = find_objowner(otmp, ix, iy)) != null
                                 && onbill(otmp, oshk, false)))))
                        subfrombill(otmp, oshk);
                }
                if (otmp.no_charge) {
                    /* not strictly necessary; destination is inside a
                       shop so existing no_charge remains relevant */
                    if (!costly_spot(ix, iy)
                        && !costly_adjacent(shkp, ix, iy))
                        otmp.no_charge = 0;
                }

                obj_extract_self(otmp); /* remove_object(otmp) */
                place_object(otmp, ix, iy);
                litter[i] |= LITTER_UPDATE;
            }
        } /* while level.objects[x][y] != 0 */
    }
}

// C ref: shk.c litter_newsyms()
function litter_newsyms(litter, x, y) {
    for (let i = 0; i < 9; i++)
        if (litter[i] & LITTER_UPDATE)
            newsym(x + horiz(i), y + vert(i));
}

// C ref: shk.c repair_damage()
/*
 * 0: repair postponed, 1: silent repair (no messages), 2: normal repair
 * 3: untrap
 */
async function repair_damage(
    shkp,
    tmp_dam,
    catchup) {
    const lev = game.level;
    const litter = new Array(9).fill(0);
    let otmp;
    let ttmp;
    let disposition = 1;
    let seeit, stop_picking = false;

    if (!repairable_damage(tmp_dam, shkp))
        return 0;

    const x = tmp_dam.place.x;
    const y = tmp_dam.place.y;
    seeit = cansee(x, y);

    ttmp = t_at(x, y);
    if (ttmp) {
        switch (ttmp.ttyp) {
        case LANDMINE_SK:
        case BEAR_TRAP_SK:
            /* convert to an object */
            otmp = mksobj((ttmp.ttyp === LANDMINE_SK) ? LAND_MINE_SK : BEARTRAP_SK,
                          true, false);
            otmp.quan = 1;
            otmp.owt = weight(otmp);
            if (!catchup) {
                if (canseemon(shkp) && dist2(x, y, shkp.mx, shkp.my) <= 2)
                    await pline(`${Shknam(shkp)} untraps ${ansimpleoname(otmp)}.`);
                else if (ttmp.tseen && cansee(ttmp.tx, ttmp.ty))
                    await pline(`The ${trapname(ttmp.ttyp, true)} vanishes.`);
            }
            mpickobj(shkp, otmp);
            break;
        case HOLE_SK:
        case PIT_SK:
        case SPIKED_PIT_SK:
            if (!catchup && ttmp.tseen && cansee(ttmp.tx, ttmp.ty))
                await pline(`The ${trapname(ttmp.ttyp, true)} is filled in.`);
            break;
        default:
            if (!catchup && ttmp.tseen && cansee(ttmp.tx, ttmp.ty))
                await pline(`The ${trapname(ttmp.ttyp, true)} vanishes.`);
            break;
        }
        deltrap(ttmp);
        del_engr_at(x, y);
        if (seeit)
            newsym(x, y);
        if (!catchup)
            disposition = 3;
    }
    if (IS_ROOM(tmp_dam.typ)
        || (tmp_dam.typ === lev.at(x, y).typ
            && (!IS_DOOR(tmp_dam.typ) || lev.at(x, y).doormask > D_BROKEN_SK)))
        /* no terrain fix necessary (trap removal or manually repaired) */
        return disposition;

    if (closed_door(x, y))
        stop_picking = picking_at(x, y);

    /* door or wall repair; trap, if any, is now gone;
       restore original terrain type and move any items away;
       rm.doormask and rm.wall_info are both overlaid on rm.flags
       so the new flags value needs to match the restored typ */
    lev.at(x, y).typ = tmp_dam.typ;
    if (IS_DOOR(tmp_dam.typ))
        lev.at(x, y).doormask = D_CLOSED_SK; /* arbitrary */
    else /* not a door; set rm.wall_info or whatever old flags are relevant */
        lev.at(x, y).flags = tmp_dam.flags;

    if (litter_getpos(litter, x, y, shkp))
        await litter_scatter(litter, x, y, shkp);
    del_engr_at(x, y);

    /* needed if hero has line-of-sight to the former gap from outside
       the shop but is farther than one step away; once the light inside
       the shop is blocked, the other newsym() below won't redraw the
       spot showing its repaired wall */
    if (seeit)
        newsym(x, y);
    block_point(x, y);

    if (catchup)
        return 1; /* repair occurred while off level so no messages */

    if (seeit) {
        if (IS_WALL_SK(tmp_dam.typ)) {
            /* player sees actual repair process, so KNOWS it's a wall */
            lev.at(x, y).seenv = SVALL;
            await pline("Suddenly, a section of the wall closes up!");
        } else if (IS_DOOR(tmp_dam.typ)) {
            await pline("Suddenly, the shop door reappears!");
        }
        newsym(x, y);
    } else if (IS_WALL_SK(tmp_dam.typ)) {
        if (inside_shop(game.u.ux, game.u.uy) === shkp.mextra.eshk.shoproom)
            await You_feel_sk("more claustrophobic than before.");
        else if (!Deaf() && !rn2(10))
            await Norep_sk("The dungeon acoustics noticeably change.");
    }

    if (stop_picking)
        await stop_occupation_sk();

    litter_newsyms(litter, x, y);

    if (disposition < 3)
        disposition = 2;
    return disposition;
}
/* C ref: youprop.h Punished */
function Punished_sk() { return !!game.uball; }
import { D_BROKEN as D_BROKEN_SK, D_CLOSED as D_CLOSED_SK,
         IS_WALL as IS_WALL_SK, ZAP_POS } from './const.js';
import { BOULDER as BOULDER_SK, ROCK as ROCK_SK, LAND_MINE as LAND_MINE_SK,
         BEARTRAP as BEARTRAP_SK } from './objects.js';
import { LANDMINE as LANDMINE_SK, BEAR_TRAP as BEAR_TRAP_SK, HOLE as HOLE_SK,
         PIT as PIT_SK, SPIKED_PIT as SPIKED_PIT_SK } from './const.js';
import { unplacebc, placebc } from './ball.js';
import { obfree } from './invent.js';
import { place_object, mksobj } from './mkobj.js';
import { closed_door } from './makemon.js';
import { picking_at } from './lock.js';
import { block_point } from './vision.js';
import { del_engr_at } from './engrave.js';
import { deltrap, trapname } from './trap.js';
import { mpickobj } from './steal.js';
import { ansimpleoname } from './iactions.js';
import { Norep as Norep_sk, You_feel as You_feel_sk } from './display.js';
import { stop_occupation as stop_occupation_sk } from './allmain.js';

// C ref: shk.c shk_move()
/*
 * shk_move: return 1: moved  0: didn't  -1: let m_move do it  -2: died
 */
export async function shk_move(shkp) {
    const u = game.u;
    let gtx, gty;
    let udist;
    let appr;
    const eshkp = shkp.mextra.eshk;
    let z;
    let uondoor = false, satdoor, avoid = false, badinv;

    const omx = shkp.mx;
    const omy = shkp.my;

    if (inhishop(shkp))
        await shk_fixes_damage(shkp);

    if ((udist = distu(omx, omy)) < 3 && (shkp.data !== mons[PM_GRID_BUG]
                                          || (omx === u.ux || omy === u.uy))) {
        if (ANGRY(shkp) || (Conflict() && !resist_conflict(shkp))) {
            if (Displaced())
                await Your(`displaced image doesn't fool ${shkname(shkp)}!`);
            await mattacku(shkp);
            return 0;
        }
        if (eshkp.following) {
            if (eshkp.customer.slice(0, PL_NSIZ)
                !== (game.plname || '').slice(0, PL_NSIZ)) { /* strncmp() */
                if (!Deaf() && !muteshk(shkp)) {
                    await verbalize(`${Hello(shkp)}, ${game.plname}!  I was looking for ${
                                     eshkp.customer}.`);
                }
                eshkp.following = 0;
                return 0;
            }
            if (game.moves > (game.followmsg || 0) + 4) {
                if (!Deaf() && !muteshk(shkp)) {
                    await verbalize(`${Hello(shkp)}, ${game.plname}!  Didn't you forget to pay?`);
                } else {
                    await pline(`${Shknam(shkp)} holds out ${noit_mhis(shkp)
                                 } upturned ${mbodypart(shkp, HAND)}.`);
                }
                game.followmsg = game.moves;
                if (!rn2(9)) {
                    await pline(`${Shknam(shkp)} doesn't like customers who don't pay.`);
                    rile_shk(shkp);
                }
            }
            if (udist < 2)
                return 0;
        }
    }

    appr = 1;
    gtx = eshkp.shk.x;
    gty = eshkp.shk.y;
    satdoor = (gtx === omx && gty === omy);
    if (eshkp.following || ((z = holetime()) >= 0 && z * z <= udist)) {
        /* [This distance check used to apply regardless of
            whether the shk was following, but that resulted in
            m_move() sometimes taking the shk out of the shop if
            the player had fenced him in with boulders or traps.
            Such voluntary abandonment left unpaid objects in
            invent, triggering billing impossibilities on the
            next level once the character fell through the hole.] */
        if (udist > 4 && eshkp.following && !eshkp.billct)
            return -1; /* leave it to m_move */
        gtx = u.ux;
        gty = u.uy;
    } else if (ANGRY(shkp)) {
        /* Move towards the hero if the shopkeeper can see him. */
        if (shkp.mcansee && m_canseeu(shkp)) {
            gtx = u.ux;
            gty = u.uy;
        }
        avoid = false;
    } else {
        const GDIST = (x, y) => dist2(x, y, gtx, gty);
        if (Invis() || u.usteed) {
            avoid = false;
        } else {
            uondoor = u_at(eshkp.shd.x, eshkp.shd.y);
            if (uondoor) {
                badinv = (carrying(PICK_AXE) || carrying(DWARVISH_MATTOCK)
                          || (Fast() && (sobj_at(PICK_AXE, u.ux, u.uy)
                                         || sobj_at(DWARVISH_MATTOCK, u.ux, u.uy))));
                if (satdoor && badinv)
                    return 0;
                avoid = !badinv;
            } else {
                avoid = (!!u.ushops && distu(gtx, gty) > 8);
                badinv = false;
            }

            if (((!eshkp.robbed && !eshkp.billct && !eshkp.debit) || avoid)
                && GDIST(omx, omy) < 3) {
                if (!badinv && !onlineu(omx, omy))
                    return 0;
                if (satdoor)
                    appr = gtx = gty = 0;
            }
        }
    }

    z = await move_special(shkp, inhishop(shkp), appr, uondoor, avoid, omx, omy,
                           gtx, gty);
    if (z > 0)
        await after_shk_move(shkp);

    return z;
}

// C ref: shk.c after_shk_move()
/* called after shopkeeper moves, in case move causes re-entry into shop */
export async function after_shk_move(shkp) {
    const eshkp = shkp.mextra.eshk;

    if (eshkp.bill_p === -1000 && inhishop(shkp)) {
        /* reset bill_p, need to re-calc player's occupancy too */
        eshkp.bill_p = eshkp.bill || (eshkp.bill = []);
        /* only re-check occupancy if game hasn't just ended */
        if (!game.program_state?.gameover)
            await check_special_room(false);
    }
}

// C ref: shk.c is_fshk()
/* for use in levl_follower (mondata.c) */
export function is_fshk(mtmp) {
    return !!(mtmp.isshk && mtmp.mextra.eshk.following);
}

// C ref: shk.c getcad()
async function getcad(shkp, dmgstr, x, y, uinshp, animal, pursue) {
    const dugwall = (dmgstr === "dig into"    /* wand */
                     || dmgstr === "damage"); /* pick-axe */

    if (muteshk(shkp)) {
        if (animal && !helpless(shkp))
            await yelp(shkp);
    } else if (pursue || uinshp || !um_dist(x, y, 1)) {
        if (!Deaf()) {
            /* SetVoice(shkp, 0, 80, 0) */
            await verbalize(`How dare you ${dmgstr} my ${
                dugwall ? "shop" : "door"}?`);
        } else {
            await pline(`${Shknam(shkp)} is ${ROLL_FROM(angrytexts)} that you decided to ${
                dmgstr} ${noit_mhis(shkp)} ${dugwall ? "shop" : "door"}!`);
        }
    } else {
        if (!Deaf()) {
            await pline(`${Shknam(shkp)} shouts:`);
            /* SetVoice(shkp, 0, 80, 0) */
            await verbalize(`Who dared ${dmgstr} my ${
                dugwall ? "shop" : "door"}?`);
        } else {
            await pline(`${Shknam(shkp)} is ${ROLL_FROM(angrytexts)} that someone decided to ${
                dmgstr} ${noit_mhis(shkp)} ${dugwall ? "shop" : "door"}!`);
        }
    }
    hot_pursuit(shkp);
}

// C ref: shk.c pay_for_damage()
export async function pay_for_damage(dmgstr, cant_mollify) {
    const u = game.u;
    let shkp = null;
    let shops_affected;
    const uinshp = !!(u.ushops && u.ushops.length);
    let x, y;
    let animal, pursue;
    let tmp_dam, appear_here = null;
    let cost_of_damage = 0;
    let nearest_shk = (ROWNO * ROWNO) + (COLNO * COLNO),
        nearest_damage = nearest_shk;
    let picks = 0;

    for (tmp_dam = game.level.damagelist; tmp_dam; tmp_dam = tmp_dam.next) {
        if (tmp_dam.when !== game.moves || !tmp_dam.cost)
            continue;
        cost_of_damage += tmp_dam.cost;
        shops_affected = in_rooms(tmp_dam.place.x, tmp_dam.place.y, SHOPBASE);
        for (let si = 0; si < shops_affected.length; si++) {
            let tmp_shk;
            let shk_distance;

            if (!(tmp_shk = shop_keeper(shops_affected.charCodeAt(si))))
                continue;
            if (tmp_shk === shkp) {
                const damage_distance =
                    distu(tmp_dam.place.x, tmp_dam.place.y);

                if (damage_distance < nearest_damage) {
                    nearest_damage = damage_distance;
                    appear_here = tmp_dam;
                }
                continue;
            }
            if (!inhishop(tmp_shk))
                continue;
            shk_distance = mdistu(tmp_shk);
            if (shk_distance > nearest_shk)
                continue;
            if ((shk_distance === nearest_shk) && picks) {
                if (rn2(++picks))
                    continue;
            } else
                picks = 1;
            shkp = tmp_shk;
            nearest_shk = shk_distance;
            appear_here = tmp_dam;
            nearest_damage = distu(tmp_dam.place.x, tmp_dam.place.y);
        }
    }

    if (!cost_of_damage || !shkp)
        return;

    animal = (shkp.data.msound <= MS_ANIMAL);
    pursue = false;
    x = appear_here.place.x;
    y = appear_here.place.y;

    /* not the best introduction to the shk... */
    shkp.mextra.eshk.customer = (game.plname || '').slice(0, PL_NSIZ);

    /* if the shk is already on the war path, be sure it's all out */
    if (ANGRY(shkp) || shkp.mextra.eshk.following) {
        hot_pursuit(shkp);
        return;
    }

    /* if the shk is not in their shop.. */
    if (!in_rooms(shkp.mx, shkp.my, SHOPBASE).length) {
        if (!cansee(shkp.mx, shkp.my))
            return;
        pursue = true;
        await getcad(shkp, dmgstr, x, y, uinshp, animal, pursue);
        return;
    }

    if (uinshp) {
        if (um_dist(shkp.mx, shkp.my, 1)
            && !um_dist(shkp.mx, shkp.my, 3)) {
            await pline(`${Shknam(shkp)} leaps towards you!`);
            await mnexto(shkp, RLOC_NOMSG);
        }
        pursue = um_dist(shkp.mx, shkp.my, 1);
        if (pursue) {
            await getcad(shkp, dmgstr, x, y, uinshp, animal, pursue);
            return;
        }
    } else {
        /*
         * Make shkp show up at the door.  Effect:  If there is a monster
         * in the doorway, have the hero hear the shopkeeper yell a bit,
         * pause, then have the shopkeeper appear at the door, having
         * yanked the hapless critter out of the way.
         */
        if (m_at(x, y)) {
            if (!animal) {
                if (!Deaf() && !muteshk(shkp)) {
                    /* Soundeffect(se_angry_voice, 75); */
                    await You_hear("an angry voice:");
                    /* SetVoice(shkp, 0, 80, 0) */
                    await verbalize("Out of my way, scum!");
                }
                /* wait_synch(); sleep(1) */
            } else {
                await growl(shkp);
            }
        }
        await mnearto(shkp, x, y, true, RLOC_MSG);
    }

    if ((um_dist(x, y, 1) && !uinshp) || cant_mollify
        || (money_cnt(game.invent) + shkp.mextra.eshk.credit) < cost_of_damage
        || !rn2(50)) {
        await getcad(shkp, dmgstr, x, y, uinshp, animal, pursue);
        return;
    }

    if (Invis())
        await Your(`invisibility does not fool ${shkname(shkp)}!`);
    const qbuf = `${!animal ? cad(true) : ""}You did ${cost_of_damage} ${
        currency(cost_of_damage)} worth of damage!${!animal ? '"' : ""}  Pay?`;
    if ((await tty_yn_function(qbuf, "yn", 'n')) !== 'n') { /* y_n() */
        let is_seen;
        const was_seen = canseemon(shkp),
              was_outside = !inhishop(shkp);
        const sx = shkp.mx, sy = shkp.my;

        cost_of_damage = await check_credit(cost_of_damage, shkp);
        if (cost_of_damage > 0) {
            money2mon(shkp, cost_of_damage);
            game.disp_botl = true;
        }
        await pline(`Mollified, ${shkname(shkp)} accepts your restitution.`);
        /* move shk back to his home loc */
        await home_shk(shkp, false);
        pacify_shk(shkp, false);
        /* home_shk() suppresses rloc()'s vanish/appear messages */
        if (shkp.mx !== sx || shkp.my !== sy) {
            if (was_outside && canspotmon(shkp))
                await pline(`${Shknam(shkp)} returns to ${noit_mhis(shkp)} shop.`);
            else if ((is_seen = canseemon(shkp)) === true || was_seen)
                await pline(`${Shknam(shkp)} ${!was_seen ? "appears"
                                              : is_seen ? "shifts location"
                                                : "disappears"}.`);
        }
    } else {
        if (!animal) {
            if (!Deaf() && !muteshk(shkp)) {
                /* SetVoice(shkp, 0, 80, 0) */
                await verbalize("Oh, yes!  You'll pay!");
            } else {
                await pline(`${Shknam(shkp)} lunges ${noit_mhis(shkp)} ${
                    mbodypart(shkp, HAND)} toward your ${body_part(NECK)}!`);
            }
        } else
            await growl(shkp);
        hot_pursuit(shkp);
        adjalign(-Math.sign(u.ualign.type));
    }
}

// C ref: shk.c cad()
function cad(altusage) /* used as a verbalized exclamation:  \"Cad! ...\" */
{
    let res = null;

    switch (is_demon(game.youmonst.data) ? 3 : poly_gender()) {
    case 0:
        res = "cad";
        break;
    case 1:
        res = "minx";
        break;
    case 2:
        res = "beast";
        break;
    case 3:
        res = "fiend";
        break;
    default:
        /* impossible("cad: unknown gender") */
        res = "thing";
        break;
    }
    if (altusage) {
        /* alternate usage adds a leading double quote and trailing
           exclamation point plus sentence separating spaces */
        res = `"${highc(res.charAt(0))}${res.slice(1)}!  `;
    }
    return res;
}

// C ref: shk.c find_objowner()
/* find the shopkeeper who owns 'obj'; needed to handle shared shop walls */
export function find_objowner(obj, x, y) /* caller passes obj's location
                           * since obj->ox,oy might be stale; don't update
                           * coordinates here because if we're called during
                           * sanity checking they shouldn't be modified */
{
    let shkp, deflt_shkp = null;

    if (obj.where === 'OBJ_ONBILL') {
        /* used up item; bill obj coordinates are useless and so are x,y */
        for (shkp = next_shkp(game.fmon, true); shkp;
             shkp = next_shkp(shkp.nmon, true))
            if (onshopbill(obj, shkp, true))
                return shkp;
    } else {
        const where = in_rooms(x, y, SHOPBASE);

        /* conceptually object could be inside up to 4 rooms simultaneously;
           in practice it will usually be one room but can sometimes be two;
           check shk and bill for each room rather than just the first;
           fallback to the first shk if obj isn't on the relevant bill(s) */
        for (let ri = 0; ri < where.length; ++ri)
            if ((shkp = shop_keeper(where.charCodeAt(ri))) != null) {
                if (onshopbill(obj, shkp, true))
                    return shkp;
                if (!deflt_shkp)
                    deflt_shkp = shkp;
            }
    }
    return deflt_shkp;
}

// C ref: shk.c costly_spot()
/* is <x,y> a spot inside a tended shop where items cost money? */
export function costly_spot(x, y) {
    if (!game.level.flags?.has_shop)
        return false;
    const shkrooms = in_rooms(x, y, SHOPBASE);
    const shkp = shop_keeper(shkrooms.length ? shkrooms.charCodeAt(0) : 0);
    if (!shkp || !inhishop(shkp))
        return false;
    const eshkp = shkp.mextra.eshk;
    return (inside_shop(x, y) !== NO_ROOM
            && !(x === eshkp.shk.x && y === eshkp.shk.y));
}

// C ref: shk.c sellobj()
// The exclusion tests are ported: dropping something outside a shop, or in
// a shop without its shopkeeper there, or on the shop's door/entry spot,
// sells nothing. Selling to the shopkeeper isn't ported yet.
export async function sellobj(obj, x, y) {
    let shkp;

    if (!(game.u.ushops && game.u.ushops.length)) /* do cheapest exclusion test first */
        return;
    const shkrooms = in_rooms(x, y, SHOPBASE);
    shkp = shop_keeper(shkrooms.length ? shkrooms.charCodeAt(0) : 0);
    if (!shkp || !inhishop(shkp))
        return;
    if (!costly_spot(x, y))
        return;
    void obj;
    throw new Error('sellobj(): selling to a shopkeeper not ported yet');
}

// ── money transfer, paying ──

/* C ref: invent.c findgold() */
function findgold(chain) {
    if (Array.isArray(chain)) {
        for (const o of chain)
            if (o.oclass === COIN_CLASS) return o;
        return null;
    }
    for (let o = chain; o; o = o.nobj)
        if (o.oclass === COIN_CLASS) return o;
    return null;
}

// C ref: shk.c money2mon()
/*
 *  Transfer money from inventory to monster when paying
 *  shopkeepers, priests, oracle, succubus, and other demons.
 *  Returns the amount actually paid, so we can know
 *  if the monster kept the change.
 */
export function money2mon(mon, amount) {
    let ygold = findgold(game.invent);

    if (amount <= 0) {
        /* impossible("%s payment in money2mon!") */
        return 0;
    }
    if (!ygold || ygold.quan < amount) {
        /* impossible("Paying without %s gold?") */
        return 0;
    }

    if (ygold.quan > amount)
        ygold = splitobj(ygold, amount);
    else if (ygold.owornmask)
        throw new Error('money2mon(): remove_worn_item() of quivered gold not ported yet');
    freeinv(ygold);
    add_to_minv(mon, ygold);
    game.disp_botl = true;
    return amount;
}

// C ref: shk.c money2u()
/*
 *  Transfer money from monster to inventory.
 *  Used when the shopkeeper pay for items, and when
 *  the priest gives you money for an ale.
 */
export async function money2u(mon, amount) {
    let mongold = findgold(mon.minvent);

    if (amount <= 0) {
        /* impossible("%s payment in money2u!") */
        return;
    }
    if (!mongold || mongold.quan < amount) {
        /* impossible("%s paying without %s gold?") */
        return;
    }

    if (mongold.quan > amount)
        mongold = splitobj(mongold, amount);
    obj_extract_self(mongold);

    if (!merge_choice(game.invent, mongold)
        && inv_cnt(false) >= 52 /* invlet_basic */) {
        await You("have no room for the gold!");
        await dropy(mongold);
    } else {
        await addinv(mongold);
        game.disp_botl = true;
    }
}

// C ref: shk.c check_credit()
async function check_credit(tmp, shkp) {
    const eshkp = shkp.mextra.eshk;
    const credit = eshkp.credit;

    if (credit === 0) {
        ; /* nothing to do; just 'return tmp;' */
    } else if (credit >= tmp) {
        await pline_The("price is deducted from your credit.");
        eshkp.credit -= tmp;
        tmp = 0;
    } else {
        await pline_The("price is partially covered by your credit.");
        eshkp.credit = 0;
        tmp -= credit;
    }
    return tmp;
}

// C ref: shk.c pay()
async function pay(tmp, shkp) {
    const eshkp = shkp.mextra.eshk;
    let robbed = eshkp.robbed;
    const balance = ((tmp <= 0) ? tmp : await check_credit(tmp, shkp));

    if (balance > 0)
        money2mon(shkp, balance);
    else if (balance < 0)
        await money2u(shkp, -balance);
    game.disp_botl = true;
    if (robbed) {
        robbed -= tmp;
        if (robbed < 0)
            robbed = 0;
        eshkp.robbed = robbed;
    }
}

// C ref: shk.c angry_shk_exists()
function angry_shk_exists() {
    for (let shkp = next_shkp(game.fmon, false); shkp;
         shkp = next_shkp(shkp.nmon, false))
        if (ANGRY(shkp))
            return true;
    return false;
}

// C ref: shk.c make_happy_shk()
export async function make_happy_shk(shkp, silentkops) {
    const wasmad = ANGRY(shkp);
    const eshkp = shkp.mextra.eshk;

    pacify_shk(shkp, false);
    eshkp.following = 0;
    eshkp.robbed = 0;
    if (!Role_if(PM_ROGUE))
        adjalign(Math.sign(game.u.ualign.type));
    if (!inhishop(shkp)) {
        throw new Error('make_happy_shk(): home_shk()/migrate_to_level() of an absent shopkeeper not ported yet');
    } else if (wasmad)
        await pline(`${Shknam(shkp)} calms down.`);

    await make_happy_shoppers(silentkops);
}

// C ref: shk.c make_happy_shoppers()
/* called by make_happy_shk() and also by losedogs() for migrating shk */
export async function make_happy_shoppers(silentkops) {
    if (!angry_shk_exists()) {
        kops_gone(silentkops);
        pacify_guards();
    }
}

// C ref: shk.c kops_gone()
/* remove all kops from the level */
function kops_gone(silent) {
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.mhp < 1) /* DEADMONSTER */
            continue;
        if (mtmp.data.mlet === S_KOP)
            throw new Error('kops_gone(): removing Keystone Kops not ported yet');
    }
    void silent;
}

// C ref: mon.c pacify_guards()
function pacify_guards() {
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.mhp < 1) /* DEADMONSTER */
            continue;
        if (mtmp.data === mons[PM_WATCHMAN]
            || mtmp.data === mons[PM_WATCH_CAPTAIN])
            mtmp.mpeaceful = 1;
    }
}

// C ref: shk.c hot_pursuit()
export function hot_pursuit(shkp) {
    if (!shkp.isshk)
        return;

    rile_shk(shkp);
    shkp.mextra.eshk.customer = (game.plname || '').slice(0, PL_NSIZ);
    shkp.mextra.eshk.following = 1;

    /* shopkeeper networking:  clear obj->no_charge for all obj on the
       floor of this level (including inside containers on floor), even
       those that are in other shopkeepers' shops */
    for (const otmp of game.level.objects || [])
        clear_no_charge_obj(null, otmp);
    clear_no_charge_pets(shkp);
}

/* object chains are either linked through ->nobj (invent) or kept as
   arrays (fobj, minvent, cobj, buriedobjlist) */
function* objchain(ochain) {
    if (Array.isArray(ochain)) {
        yield* ochain;
    } else {
        for (let otmp = ochain; otmp; otmp = otmp.nobj)
            yield otmp;
    }
}

// C ref: shk.c clear_unpaid_obj()
function clear_unpaid_obj(shkp, otmp) {
    if (Has_contents(otmp))
        clear_unpaid(shkp, otmp.cobj);
    if (onbill(otmp, shkp, true))
        otmp.unpaid = 0;
}

// C ref: shk.c clear_unpaid()
/* clear the unpaid bit on all of the objects in the list */
function clear_unpaid(shkp, list) {
    for (const otmp of objchain(list))
        clear_unpaid_obj(shkp, otmp);
}

// C ref: shk.c clear_no_charge()
function clear_no_charge(shkp, list) {
    for (const otmp of objchain(list))
        clear_no_charge_obj(shkp, otmp);
}

// C ref: shk.c setpaid()
/* either you paid or left the shop or the shopkeeper died */
function setpaid(shkp) {
    const g = game;

    clear_unpaid(shkp, g.invent);
    clear_unpaid(shkp, g.level.objects || []);
    if (g.level.buriedobjlist)
        clear_unpaid(shkp, g.level.buriedobjlist);
    if (g.thrownobj)
        clear_unpaid_obj(shkp, g.thrownobj);
    if (g.kickedobj)
        clear_unpaid_obj(shkp, g.kickedobj);
    for (let mtmp = g.fmon; mtmp; mtmp = mtmp.nmon)
        if (mtmp.minvent && mtmp.minvent.length)
            clear_unpaid(shkp, mtmp.minvent);
    for (let mtmp = g.migrating_mons; mtmp; mtmp = mtmp.nmon)
        if (mtmp.minvent && mtmp.minvent.length)
            clear_unpaid(shkp, mtmp.minvent);

    /* clear obj->no_charge for all obj in shkp's shop */
    clear_no_charge(shkp, g.level.objects || []);
    clear_no_charge(shkp, g.level.buriedobjlist || []);

    if (g.billobjs)
        throw new Error('setpaid(): discarding billobjs not ported yet');
    if (shkp) {
        const eshkp = shkp.mextra.eshk;
        eshkp.billct = 0;
        eshkp.credit = 0;
        eshkp.debit = 0;
        eshkp.loan = 0;
    }
}

// C ref: shk.c home_shk()
async function home_shk(shkp, killkops) {
    const x = shkp.mextra.eshk.shk.x, y = shkp.mextra.eshk.shk.y;

    await mnearto(shkp, x, y, true, RLOC_NOMSG);
    game.level.flags.has_shop = 1;
    if (killkops) {
        kops_gone(true);
        pacify_guards();
    }
    await after_shk_move(shkp);
}

// C ref: shk.c paybill()
/* routine called after dying (or quitting) */
export async function paybill(
    croaked, /* -1: escaped dungeon; 0: quit; 1: died */
    silently) /* maybe avoid messages */
{
    const g = game;
    let mtmp, mtmp2, firstshk, resident, creditor, hostile, localshk;
    let eshkp, local;
    let taken = false;
    let numsk = 0;

    /* if we escaped from the dungeon, shopkeepers can't reach us;
       shops don't occur on level 1, but this could happen if hero
       level teleports out of the dungeon and manages not to die */
    if (croaked < 0)
        return false;
    /* [should probably also return false when dead hero has been
        petrified since shk shouldn't be able to grab inventory
        which has been shut inside a statue] */

    /* this is where inventory will end up if any shk takes it */
    g.repo = { location: { x: 0, y: 0 }, shopkeeper: null };

    /*
     * Scan all shopkeepers on the level, to prioritize them:
     * 1) keeper of shop hero is inside and who is owed money,
     * 2) keeper of shop hero is inside who isn't owed any money,
     * 3) other shk who is owed money, 4) other shk who is angry,
     * 5) any shk local to this level, and if none is found,
     * 6) first shk on monster list (last resort; unlikely, since
     * any nonlocal shk will probably be in the owed category
     * and almost certainly be in the angry category).
     */
    resident = creditor = hostile = localshk = null;
    for (mtmp = next_shkp(g.fmon, false); mtmp;
         mtmp = next_shkp(mtmp2, false)) {
        mtmp2 = mtmp.nmon;
        eshkp = mtmp.mextra.eshk;
        local = on_level(eshkp.shoplevel, g.u.uz);
        if (local && (g.u.ushops || '').includes(String.fromCharCode(eshkp.shoproom))) {
            /* inside this shk's shop [there might be more than one
               resident shk if hero is standing in a breech of a shared
               wall, so give priority to one who's also owed money] */
            if (!resident || eshkp.billct || eshkp.debit || eshkp.robbed)
                resident = mtmp;
        } else if (eshkp.billct || eshkp.debit || eshkp.robbed) {
            /* owe this shopkeeper money (might also owe others) */
            if (!creditor)
                creditor = mtmp;
        } else if (eshkp.following || ANGRY(mtmp)) {
            /* this shopkeeper is antagonistic (others might be too) */
            if (!hostile)
                hostile = mtmp;
        } else if (local) {
            /* this shopkeeper's shop is on current level */
            if (!localshk)
                localshk = mtmp;
        }
    }

    /* give highest priority shopkeeper first crack */
    firstshk = resident ? resident
                        : creditor ? creditor
                                   : hostile ? hostile
                                             : localshk;
    if (firstshk) {
        numsk++;
        taken = await inherits(firstshk, numsk, croaked, silently);
    }

    /* now handle the rest */
    for (mtmp = next_shkp(g.fmon, false); mtmp;
         mtmp = next_shkp(mtmp2, false)) {
        mtmp2 = mtmp.nmon;
        eshkp = mtmp.mextra.eshk;
        local = on_level(eshkp.shoplevel, g.u.uz);
        if (mtmp !== firstshk) {
            numsk++;
            taken = (await inherits(mtmp, numsk, croaked, silently)) || taken;
        }
        /* for bones: we don't want a shopless shk around */
        if (!local)
            await mongone(mtmp);
    }
    return taken;
}

// C ref: shk.c inherits()
/* decide whether a shopkeeper will take possession of dying hero's invent;
   when this returns True, it should call set_repo_loc() before returning;
   when it returns False, it should not do such because that might have
   already been called for some shopkeeper */
async function inherits(shkp, numsk, croaked, silently) {
    const g = game;
    let loss = 0;
    let umoney;
    const eshkp = shkp.mextra.eshk;
    let take = false, taken = false;
    const uinshop = (g.u.ushops || '').includes(String.fromCharCode(eshkp.shoproom));
    let takes;

    /* not strictly consistent; affects messages and prevents next player
       (if bones are saved) from blundering into or being ambushed by an
       invisible shopkeeper */
    shkp.minvis = shkp.perminvis = 0;

    /* The simplifying principle is that first-come
       already took everything you had. */
    if (numsk > 1) {
        if (cansee(shkp.mx, shkp.my) && croaked && !silently) {
            takes = '';
            if ((shkp.data.mflags1 & M1_NOHEAD) === 0 /* has_head() */ && !rn2(2))
                takes = `, shakes ${noit_mhis(shkp)} ${mbodypart(shkp, HEAD)},`;
            await pline(`${Shknam(shkp)} ${helpless(shkp) ? "wakes up, " : ""
                         }looks at your corpse${takes} and ${
                         !inhishop(shkp) ? "disappears" : "sighs"}.`);
        }
        taken = uinshop;
    } else {
        /* get one case out of the way: you die in the shop, the
           shopkeeper is peaceful, nothing stolen, nothing owed */
        if (uinshop && inhishop(shkp) && !eshkp.billct
            && !eshkp.robbed && !eshkp.debit && !ANGRY(shkp)
            && !eshkp.following && g.u.ugrave_arise < LOW_PM) {
            taken = (g.invent != null);
            if (taken && !silently)
                await pline(`${Shknam(shkp)} gratefully inherits all your possessions.`);
            /* goto clear; */
            setpaid(shkp); /* clear this shk's bill */
            /* where to put player's invent (after disclosure) */
            if (taken)
                set_repo_loc(shkp);
            return taken;
        }

        if (eshkp.billct || eshkp.debit || eshkp.robbed) {
            if (uinshop && inhishop(shkp))
                loss = addupbill(shkp) + eshkp.debit;
            if (loss < eshkp.robbed)
                loss = eshkp.robbed;
            take = true;
        }

        if (!(eshkp.following || ANGRY(shkp) || take)) {
            /* goto clear; */
            setpaid(shkp);
            if (taken)
                set_repo_loc(shkp);
            return taken;
        }
        if (g.invent) {
            umoney = money_cnt(g.invent);
            takes = '';
            if (helpless(shkp))
                takes += "wakes up and ";
            if (!m_next2u(shkp))
                takes += "comes and ";
            takes += "takes";

            if (loss > umoney || !loss || uinshop) {
                eshkp.robbed -= umoney;
                if (eshkp.robbed < 0)
                    eshkp.robbed = 0;
                if (umoney > 0) {
                    money2mon(shkp, umoney);
                    g.disp_botl = true;
                }
                if (!silently)
                    await pline(`${Shknam(shkp)} ${takes} all your possessions.`);
                taken = true;
            } else {
                money2mon(shkp, loss);
                g.disp_botl = true;
                if (!silently)
                    await pline(`${Shknam(shkp)} ${takes} the ${loss} ${currency(loss)} ${
                                 (eshkp.customer || '').slice(0, PL_NSIZ)
                                 !== (g.plname || '').slice(0, PL_NSIZ) ? "" : "you "
                                 }owed ${noit_mhim(shkp)}.`);
                /* shopkeeper has now been paid in full */
                pacify_shk(shkp, false);
                eshkp.following = 0;
                eshkp.robbed = 0;
            }
        }
    }
    /* skip: */
    /* in case we create bones */
    await rouse_shk(shkp, false); /* wake up */
    if (!inhishop(shkp))
        await home_shk(shkp, false);
    /* clear: */
    setpaid(shkp); /* clear this shk's bill */
    /* where to put player's invent (after disclosure) */
    if (taken)
        set_repo_loc(shkp);
    return taken;
}

// C ref: shk.c set_repo_loc()
function set_repo_loc(shkp) {
    const g = game;
    const u = g.u;
    let ox, oy;
    const eshkp = shkp.mextra.eshk;

    /* when multiple shopkeepers are present, we might get called more
       than once; don't override previous setting */
    if (g.repo.shopkeeper)
        return;

    /* savebones() sets u.ux,u.uy to 0,0 to remove hero from map but that
       takes place after finish_paybill() has been called so we expect
       u.ux,u.uy to be valid */
    ox = u.ux ? u.ux : u.ux0;
    oy = u.ux ? u.uy : u.uy0; /* [testing u.ux when setting oy is correct] */
    /* if you're not in this shk's shop room, or if you're in its doorway
       or entry spot or one of its walls (temporary gap or Passes_walls),
       then your gear gets dumped all the way inside */
    if (!(u.ushops || '').includes(String.fromCharCode(eshkp.shoproom))
        || costly_adjacent(shkp, ox, oy)) {
        /* shk.x,shk.y is the position immediately in front of the door;
           move in one more space */
        ox = eshkp.shk.x;
        oy = eshkp.shk.y;
        ox += Math.sign(ox - eshkp.shd.x);
        oy += Math.sign(oy - eshkp.shd.y);
    } else {
        ; /* already inside this shk's shop so use ox,oy as-is */
    }
    /* finish_paybill will deposit invent here */
    g.repo.location.x = ox;
    g.repo.location.y = oy;
    g.repo.shopkeeper = shkp;
}

// C ref: shk.c costly_adjacent()
/* is <x,y> in shkp's shop's doorway or entry spot or one of its walls? */
export function costly_adjacent(shkp, x, y) {
    if (!shkp || !inhishop(shkp) || !isok(x, y))
        return false;
    const eshkp = shkp.mextra.eshk;
    /* adjacent if <x,y> is a shop wall spot, including door;
       also treat "free spot" one step inside the door as adjacent */
    return !!(game.level.at(x, y).edge || (x === eshkp.shk.x && y === eshkp.shk.y));
}

// C ref: shk.c finish_paybill()
/* called at game exit, after inventory disclosure but before making bones;
   shouldn't issue any messages */
export async function finish_paybill() {
    throw new Error('finish_paybill(): drop_upon_death() not ported yet');
}

// C ref: shk.c clear_no_charge_obj()
/* either clear no_charge for every object on a floor list (shkp==NULL) or
   for those inside shkp's shop */
function clear_no_charge_obj(shkp, otmp) {
    if (otmp.no_charge) {
        if (shkp) {
            /* object is in the shopkeeper's shop */
            throw new Error('clear_no_charge_obj(): per-shop clearing not ported yet');
        }
        otmp.no_charge = 0;
    }
    if (Has_contents(otmp)) {
        for (const o of otmp.cobj)
            clear_no_charge_obj(shkp, o);
    }
}

// C ref: shk.c clear_no_charge_pets()
function clear_no_charge_pets(shkp) {
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon)
        if (mtmp.mtame && (mtmp.minvent || []).length)
            for (const o of mtmp.minvent)
                clear_no_charge_obj(shkp, o);
}

// C ref: shk.c make_angry_shk()
/* Used when the shkp is teleported or falls (ox == 0) out of his shop, or
   when the player is not on a costly_spot and he damages something inside
   the shop.  These conditions must be checked by the calling function. */
export async function make_angry_shk(shkp, ox, oy) {
    const eshkp = shkp.mextra.eshk;
    void ox, void oy;

    /* all pending shop transactions are now "past due" */
    if (eshkp.billct || eshkp.debit || eshkp.loan || eshkp.credit)
        throw new Error('make_angry_shk(): setpaid() of pending transactions not ported yet');

    await pline(`${Shknam(shkp)} ${!ANGRY(shkp) ? "gets angry" : "is furious"}!`);
    hot_pursuit(shkp);
}

const no_money = (s) => `Moreover, you${s} have no gold.`,
    not_enough_money = (s) => `Besides, you don't have enough to interest ${s}.`;

/* C ref: you.h noit_mhim() */
function noit_mhim(mtmp) {
    return genders[pronoun_gender(mtmp, PRONOUN_NO_IT | PRONOUN_HALLU)].him;
}
/* C ref: hack.h m_next2u() */
function m_next2u(mon) {
    return Math.abs(mon.mx - game.u.ux) <= 1
           && Math.abs(mon.my - game.u.uy) <= 1;
}

// C ref: shk.c dopay()
/* the #pay command */
export async function dopay() {
    const u = game.u;
    let eshkp;
    let shkp;
    let nxtm, resident;
    let ltmp;
    let umoney;
    let sk = 0, seensk = 0, nexttosk = 0;
    let paid = false;
    const stashed_gold = (hidden_gold(true) > 0);
    let pay_done;

    game.multi = 0;

    /* Find how many shk's there are, how many are in
     * sight, and are you in a shop room with one.
     */
    nxtm = resident = null;
    for (shkp = next_shkp(game.fmon, false); shkp;
         shkp = next_shkp(shkp.nmon, false)) {
        sk++;
        if (m_next2u(shkp)) {
            /* next to an irate shopkeeper? prioritize that */
            if (nxtm && ANGRY(nxtm))
                continue;
            nexttosk++;
            nxtm = shkp;
        }
        if (canspotmon(shkp))
            seensk++;
        if (inhishop(shkp)
            && ((u.ushops || '').charCodeAt(0) || 0) === shkp.mextra.eshk.shoproom)
            resident = shkp;
    }

    let proceed = false;
    if (nxtm && nexttosk === 1) {
        shkp = nxtm;
        proceed = true; /* goto proceed */
    }

    if (!proceed) {
        if ((!sk && (!Blind() || Blind_telepat())) || (!Blind() && !seensk)) {
            await There("appears to be no shopkeeper here to receive your payment.");
            return ECMD_OK;
        }

        if (!seensk) {
            await You_cant("see...");
            return ECMD_OK;
        }

        /* The usual case.  Allow paying at a distance when
         * inside a tended shop.  Should we change that?
         */
        if (sk === 1 && resident) {
            shkp = resident;
            proceed = true; /* goto proceed */
        }
    }

    if (!proceed) {
        if (seensk === 1) {
            for (shkp = next_shkp(game.fmon, false); shkp;
                 shkp = next_shkp(shkp.nmon, false))
                if (canspotmon(shkp))
                    break;
            if (shkp !== resident && !m_next2u(shkp)) {
                await pline(`${Shknam(shkp)} is not near enough to receive your payment.`);
                return ECMD_OK;
            }
        } else {
            const cc = { x: 0, y: 0 };

            await pline("Pay whom?");
            cc.x = u.ux;
            cc.y = u.uy;
            if (await getpos(cc, true, "the creature you want to pay") < 0)
                return ECMD_CANCEL; /* player pressed ESC */
            const cx = cc.x;
            const cy = cc.y;
            if (cx < 0) {
                await pline("Try again...");
                return ECMD_OK;
            }
            if (u_at(cx, cy)) {
                await You("are generous to yourself.");
                return ECMD_OK;
            }
            const mtmp = m_at(cx, cy);
            if (!cansee(cx, cy) && (!mtmp || !canspotmon(mtmp))) {
                await You(`can't ${!Blind() ? "see" : "sense"} anyone there.`);
                return ECMD_OK;
            }
            if (!mtmp) {
                await There("is no one there to receive your payment.");
                return ECMD_OK;
            }
            if (!mtmp.isshk) {
                await pline(`${Monnam(mtmp)} is not interested in your payment.`);
                return ECMD_OK;
            }
            if (mtmp !== resident && !m_next2u(mtmp)) {
                await pline(`${Shknam(mtmp)} is too far to receive your payment.`);
                return ECMD_OK;
            }
            shkp = mtmp;
        }

        if (!shkp) {
            /* debugpline0("dopay: null shkp.") */
            return ECMD_OK;
        }
    }
    /* proceed: */
    eshkp = shkp.mextra.eshk;
    ltmp = eshkp.robbed;

    /* wake sleeping shk when someone who owes money offers payment */
    if (ltmp || eshkp.billct || eshkp.debit)
        await rouse_shk(shkp, true);

    if (helpless(shkp)) { /* still asleep/paralyzed */
        await pline(`${Shknam(shkp)} ${rn2(2) ? "seems to be napping"
                                               : "doesn't respond"}.`);
        return ECMD_OK;
    }

    if (shkp !== resident && !ANGRY(shkp)) {
        umoney = money_cnt(game.invent);
        if (!ltmp) {
            await You(`do not owe ${shkname(shkp)} anything.`);
        } else if (!umoney) {
            await You(`${stashed_gold ? "seem to " : ""}have no gold.`);
            if (stashed_gold)
                await pline("But you have some gold stashed away.");
        } else {
            if (umoney > ltmp) {
                await You(`give ${shkname(shkp)} the ${ltmp} gold piece${
                           plur(ltmp)} ${noit_mhe(shkp)} asked for.`);
                await pay(ltmp, shkp);
            } else {
                await You(`give ${shkname(shkp)} all your${
                           stashed_gold ? " openly kept" : ""} gold.`);
                await pay(umoney, shkp);
                if (stashed_gold)
                    await pline("But you have hidden gold!");
            }
            if ((umoney < Math.trunc(ltmp / 2)) || (umoney < ltmp && stashed_gold))
                await pline(`Unfortunately, ${noit_mhe(shkp)} doesn't look satisfied.`);
            else
                await make_happy_shk(shkp, false);
        }
        return ECMD_TIME;
    }

    /* ltmp is still eshkp->robbed here */
    if (!eshkp.billct && !eshkp.debit) {
        umoney = money_cnt(game.invent);
        if (!ltmp && !ANGRY(shkp)) {
            await You(`do not owe ${shkname(shkp)} anything.`);
            if (!umoney)
                await pline(no_money(stashed_gold ? " seem to" : ""));
        } else if (ltmp) {
            await pline(`${shkname(shkp)} is after blood, not gold!`);
            if (umoney < Math.trunc(ltmp / 2) || (umoney < ltmp && stashed_gold)) {
                if (!umoney)
                    await pline(no_money(stashed_gold ? " seem to" : ""));
                else
                    await pline(not_enough_money(noit_mhim(shkp)));
                return ECMD_TIME;
            }
            await pline(`But since ${noit_mhis(shkp)} shop has been robbed recently,`);
            await pline(`you ${(umoney < ltmp) ? "partially " : ""}compensate ${
                         shkname(shkp)} for ${noit_mhis(shkp)} losses.`);
            await pay(umoney < ltmp ? umoney : ltmp, shkp);
            await make_happy_shk(shkp, false);
        } else {
            /* shopkeeper is angry, but has not been robbed --
             * door broken, attacked, etc. */
            await pline(`${Shknam(shkp)} is after your hide, not your gold!`);
            if (umoney < 1000) {
                if (!umoney)
                    await pline(no_money(stashed_gold ? " seem to" : ""));
                else
                    await pline(not_enough_money(noit_mhim(shkp)));
                return ECMD_TIME;
            }
            await You(`try to appease ${canspotmon(shkp)
                          ? x_monnam(shkp, ARTICLE_THE, "angry", 0, false)
                          : shkname(shkp)} by giving ${noit_mhim(shkp)
                       } 1000 gold pieces.`);
            await pay(1000, shkp);
            if (eshkp.customer.slice(0, PL_NSIZ)
                    !== (game.plname || '').slice(0, PL_NSIZ) || rn2(3))
                await make_happy_shk(shkp, false);
            else
                await pline(`But ${shkname(shkp)} is as angry as ever.`);
        }
        return ECMD_TIME;
    }
    if (shkp !== resident) {
        /* impossible("dopay: not to shopkeeper?") */
        if (resident)
            throw new Error('dopay(): setpaid() not ported yet');
        return ECMD_OK;
    }
    /* pay debt, if any, first */
    if (eshkp.debit) {
        let dtmp = eshkp.debit;
        const loan = eshkp.loan;
        let sbuf;

        umoney = money_cnt(game.invent);
        sbuf = `You owe ${shkname(shkp)} ${dtmp} ${currency(dtmp)} `;
        if (loan) {
            if (loan === dtmp)
                sbuf += "you picked up in the store.";
            else
                sbuf += "for gold picked up and the use of merchandise.";
        } else {
            sbuf += "for the use of merchandise.";
        }
        await pline(sbuf);
        if (umoney + eshkp.credit < dtmp) {
            await pline(`But you don't${stashed_gold ? " seem to" : ""
                         } have enough gold${eshkp.credit ? " or credit" : ""}.`);
            return ECMD_TIME;
        } else {
            if (eshkp.credit >= dtmp) {
                eshkp.credit -= dtmp;
                eshkp.debit = 0;
                eshkp.loan = 0;
                await Your("debt is covered by your credit.");
            } else if (!eshkp.credit) {
                money2mon(shkp, dtmp);
                eshkp.debit = 0;
                eshkp.loan = 0;
                await You("pay that debt.");
                game.disp_botl = true;
            } else {
                dtmp -= eshkp.credit;
                eshkp.credit = 0;
                money2mon(shkp, dtmp);
                eshkp.debit = 0;
                eshkp.loan = 0;
                await pline("That debt is partially offset by your credit.");
                await You("pay the remainder.");
                game.disp_botl = true;
            }
            paid = true;
        }
    }

    /* now check items on bill */
    pay_done = true; /* assume success */
    if (eshkp.billct) {
        const ibill = make_itemized_bill(shkp);
        const ibillct = ibill.length;
        const paid_p = { paid };

        if (!await pay_billed_items(shkp, ibillct, ibill, stashed_gold, paid_p))
            pay_done = false; /* skip thank you message */
        paid = paid_p.paid;
    }

    /* {mute shk,deaf hero}-aware thank you message */
    if (pay_done && !ANGRY(shkp) && paid) {
        if (!Deaf() && !muteshk(shkp)) {
            await verbalize(`Thank you for shopping in ${s_suffix(shkname(shkp))} ${
                             shtypes[eshkp.shoptype - SHOPBASE].name}${
                             !eshkp.surcharge ? "!" : "."}`);
        } else {
            await pline(`${Shknam(shkp)} nods${!eshkp.surcharge ? " appreciatively" : ""
                         } at you for shopping in ${noit_mhis(shkp)} ${
                         shtypes[eshkp.shoptype - SHOPBASE].name}${
                         !eshkp.surcharge ? "!" : "."}`);
        }
    }

    /* if (paid) update_inventory(): perm_invent isn't ported */
    if (game.iflags)
        game.iflags.menu_requested = false; /* reset */
    return paid ? ECMD_TIME : ECMD_OK;
}

// C ref: shk.c PAY_* -- dopayobj() results
const PAY_BUY = 1;
const PAY_CANT = 0; /* too poor */
const PAY_SKIP = -1;
const PAY_BROKE = -2;

// C ref: shk.c enum billitem_status
const FullyUsedUp = 1,   /* completely used up; obj->where==OBJ_ONBILL */
    PartlyUsedUp = 2,    /* partly used up; obj->where==OBJ_INVENT or similar */
    PartlyIntact = 3,    /* intact portion of partly used up item */
    FullyIntact = 4,     /* normal unpaid item */
    KnownContainer = 5,  /* container->cknown==1, holding unpaid item(s) */
    UndisclosedContainer = 6; /* container->cknown==0 */

/* Has_contents() for the JS container model (cobj is an array) */
function has_contents(obj) {
    return !!(obj.cobj && obj.cobj.length);
}

// C ref: invent.c o_on()
function o_on(id, objchn) {
    for (const otmp of objchain(objchn)) {
        let temp;
        if (otmp.o_id === id)
            return otmp;
        if (has_contents(otmp) && (temp = o_on(id, otmp.cobj)))
            return temp;
    }
    return null;
}

// C ref: shk.c doinvbill()
export function doinvbill(mode) /* 0: deliver count 1: paged */ {
    const u = game.u;
    const shkp = shop_keeper(u.ushops ? (u.ushops.charCodeAt(0) || 0) : 0);
    if (!shkp || !inhishop(shkp)) {
        if (mode !== 0)
            console.error("impossible: doinvbill: no shopkeeper?");
        return 0;
    }
    const eshkp = shkp.mextra.eshk;

    if (mode === 0) {
        /* count expended items, so that the `I' command can decide
           whether to include 'x' in its prompt string */
        let cnt = !eshkp.debit ? 0 : 1;
        let obj;

        for (let i = 0; i < eshkp.billct; i++) {
            const bp = eshkp.bill[i];
            if (bp.useup
                || ((obj = bp_to_obj(bp)) != null && obj.quan < bp.bquan))
                cnt++;
        }
        return cnt;
    }
    /* the paged "Used up items" list */
    throw new Error('doinvbill(): itemized used-up bill not ported yet');
}

// C ref: shk.c bp_to_obj()
function bp_to_obj(bp) {
    let obj;
    const id = bp.bo_id;

    if (bp.useup)
        obj = o_on(id, game.billobjs);
    else
        obj = find_oid(id);
    return obj;
}

// C ref: shk.c find_oid()
/*
 * Look for o_id on all lists but billobj.  Return obj or NULL if not found.
 */
function find_oid(id) {
    let obj;

    /* first check various obj lists directly */
    if ((obj = o_on(id, game.invent)) != null)
        return obj;
    if ((obj = o_on(id, game.level.objects)) != null)
        return obj;
    if ((obj = o_on(id, game.level.buriedobjlist)) != null)
        return obj;
    if ((obj = o_on(id, game.migrating_objs)) != null)
        return obj;

    /* not found yet; check inventory for members of various monst lists */
    const mmtmp = [game.fmon, game.migrating_mons, game.mydogs];
    for (let i = 0; i < 3; i++)
        for (const mon of objchain_mon(mmtmp[i]))
            if ((obj = o_on(id, mon.minvent)) != null)
                return obj;

    /* not found at all */
    return null;
}

/* monster chains are linked through ->nmon, or kept as arrays */
function* objchain_mon(mchain) {
    if (Array.isArray(mchain)) {
        yield* mchain;
    } else {
        for (let mtmp = mchain; mtmp; mtmp = mtmp.nmon)
            yield mtmp;
    }
}

// C ref: shk.c sortbill_cmp()
/* if one item is used-up and the other isn't, the used-up one comes first;
   otherwise, if their costs differ, the more expensive one comes first;
   if costs are the same, use internal index as tie-breaker for stable sort */
function sortbill_cmp(sbi1, sbi2) {
    const cost1 = sbi1.cost, cost2 = sbi2.cost;
    const bidx1 = sbi1.bidx, bidx2 = sbi2.bidx,
        /* sort such that FullyUsedUp and PartlyUsedUp come before
            PartlyIntact, FullyIntact, KnownContainer, UndisclosedContainer */
        used1 = (sbi1.usedup <= PartlyUsedUp) ? 1 : 0, /* 0=>unpaid, 1=>used */
        used2 = (sbi2.usedup <= PartlyUsedUp) ? 1 : 0;

    if (used1 !== used2)
        return (used2 - used1); /* bigger comes before smaller here */
    if (cost1 !== cost2)
        return (cost2 - cost1); /* bigger comes before smaller here too */
    return (bidx1 - bidx2);
}

// C ref: shk.c cheapest_item()
/* delivers the cheapest item on the list */
function cheapest_item(ibillct, ibill) {
    let gmin = ibill[0].cost;

    for (let i = 1; i < ibillct; ++i)
        if (ibill[i].cost < gmin)
            gmin = ibill[i].cost;
    return gmin;
}

// C ref: shk.c make_itemized_bill()
/* for itemized purchasing, create an alternate shop bill that hides
   container contents; returns the augmented bill (its length is the
   number of entries) */
function make_itemized_bill(shkp) {
    const ibill = [];
    const eshkp = shkp.mextra.eshk;
    const ebillct = eshkp.billct;
    let bp, otmp, bidx, used, quan, cost;
    /* static Bill zerosbi */
    const zerosbi = () => ({ obj: null, quan: 0, cost: 0, bidx: 0,
                             usedup: 0, queuedpay: false });

    for (let i = 0; i < ebillct; ++i) {
        bp = eshkp.bill_p[i];
        /* find the object on the bill */
        otmp = bp_to_obj(bp);
        if (!otmp) {
            /* impossible("Can't find shop bill entry for #%d", bp->bo_id) */
            continue;
        }
        bidx = i; /* index into bill_p[], except for hero-owner container */

        if (otmp.quan === 0 || otmp.where === 'OBJ_ONBILL') {
            /* item is completely used up; restore quantity from when it
               was first unpaid */
            otmp.quan = bp.bquan;
            bp.useup = true; /* (expected to be set already) */
        } else if (otmp.quan < bp.bquan) {
            /* item is partly used up; we will create two entries in the
               augmented bill: one for the used up part here, another for
               the intact part below */
            const e = zerosbi();
            e.obj = otmp;
            e.quan = bp.bquan - otmp.quan;
            e.cost = bp.price * e.quan;
            e.bidx = bidx; /* duplicate index into eshkp->bill_p[] */
            e.usedup = PartlyUsedUp; /* for sorting */
            ibill.push(e); /* intact portion will be a separate entry, next */
        }

        if (otmp.where === 'OBJ_ONBILL') {
            /* completely used up */
            quan = bp.bquan;
            cost = bp.price * quan;
            used = FullyUsedUp;
        } else if (otmp.where === 'OBJ_CONTAINED' || has_contents(otmp)) {
            let j;
            const item = otmp;
            let cknown = true; /* assume container contents are known */

            /* when it's in a container, put the container rather than the
               specific object into ibill[]; find outermost container */
            while (otmp.where === 'OBJ_CONTAINED') {
                otmp = otmp.ocontainer;
                if (!otmp.cknown)
                    cknown = false;
            }
            /* this container might already be in ibill[]; only include
               first instance */
            for (j = 0; j < ibill.length; ++j)
                if (otmp === ibill[j].obj)
                    break;
            if (j < ibill.length) {
                if (ibill[j].usedup === FullyIntact)
                    ibill[j].usedup = cknown ? KnownContainer
                                             : UndisclosedContainer;
                continue; /* 'i' loop */
            }
            /* include 1 container containing unpaid item(s) */
            quan = 1;
            cost = unpaid_cost(otmp, COST_CONTENTS);
            if (!otmp.unpaid)
                bidx = -1;
            used = (otmp === item) ? FullyIntact
                   : cknown ? KnownContainer
                     : UndisclosedContainer;
        } else {
            /* ordinary unpaid; when partly used, these are values for the
               intact portion; might be an empty shop-owned container */
            quan = otmp.quan;
            cost = bp.price * quan;
            used = (quan < bp.bquan) ? PartlyIntact : FullyIntact;
        }

        const e = zerosbi();
        e.obj = otmp;
        e.quan = quan;
        e.cost = cost;
        e.bidx = bidx;
        e.usedup = used;
        ibill.push(e);
    }

    if (ibill.length > 1)
        ibill.sort(sortbill_cmp); /* qsort() */
    return ibill;
}

// C ref: shk.c menu_pick_pay_items()
/* show items on your bill in a menu, and ask which to pay.
   returns the number of entries selected. */
async function menu_pick_pay_items(
    ibillct, /* number of entries in ibill[] */
    ibill) { /* all used up items, if any, precede all intact items */
    let otmp, p, buf, amt, largest_amt, save_quan;
    let i, j, n, amt_width;

    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);

    /* we go through ibill[] twice, first time to control price formatting
       during the second */
    largest_amt = 0;
    for (i = 0; i < ibillct; ++i)
        if (ibill[i].cost > largest_amt)
            largest_amt = ibill[i].cost;
    amt_width = String(largest_amt).length;

    /* show the "used up items" header if there are any used up items on
       the bill, no matter whether there are also any intact items */
    if (ibill[0].usedup <= PartlyUsedUp) {
        buf = `Used up item${(ibillct > 1 && ibill[1].usedup <= PartlyUsedUp)
                             ? "s" : ""}:`;
        add_menu_heading(win, buf);
    }
    for (i = 0; i < ibillct; ++i) {
        /* the "unpaid items" header is only shown if the "used up items"
           one was shown before the first menu entry */
        if (i > 0 && ibill[i - 1].usedup <= PartlyUsedUp
            && ibill[i].usedup >= PartlyIntact) {
            buf = `Unpaid item${(i < ibillct - 1) ? "s" : ""}:`;
            add_menu_heading(win, buf);
        }
        otmp = ibill[i].obj;
        save_quan = otmp.quan;
        otmp.quan = ibill[i].quan; /* in case it's partly used */
        p = paydoname(otmp);
        otmp.quan = save_quan;
        amt = ibill[i].cost;
        /* this doesn't support hallucinatory currency because shopkeeper
           isn't hallucinating; also, that would mess up the alignment */
        buf = `${String(amt).padStart(amt_width)} Zm, ${p}`.slice(0, 255);
        /* any.a_int = i + 1; +1: avoid 0 */
        tty_add_menu(win, null, i + 1, 0, 0, ATR_NONE, NO_COLOR, buf,
                     MENU_ITEMFLAGS_NONE);
    }

    tty_end_menu(win, "Pay for which items?");
    const res = await tty_select_menu(win, PICK_ANY);
    n = res.n;
    await tty_destroy_nhwindow(win);

    for (j = 0; j < n; ++j) {
        /*
         * FIXME:
         *  The menu will accept a subset count for each entry but buying
         *  doesn't have any support for that.
         */
        i = res.selected[j].item - 1; /* -1: reverse +1 above */
        ibill[i].queuedpay = true;
    }
    /* for ESC, return 0 instead of usual -1 */
    return Math.max(n, 0);
}

// C ref: shk.c pay_billed_items()
/* for menustyle=Traditional, choose between paying for everything (by
   declining to itemize), asking item-by-item (by accepting itemization),
   or switch to selecting via menu; for other menustyles, always select via
   menu; player can use 'm' prefix before 'p' command to invert those
   behaviors; once the method is chosen, actually pay for the selected
   items, item by item for as long as hero has enough credit+cash */
async function pay_billed_items(
    shkp,
    ibillct,
    ibill,
    stashed_gold,
    paid_p) { /* output: paid_p.paid */
    let bp, otmp, umoney, itemize, more_than_one;
    let queuedpay = false, via_menu;
    let buy, indx, bidx, pass, iprompt, ebillct;
    const eshkp = shkp.mextra.eshk;

    umoney = money_cnt(game.invent);
    if (!umoney && !eshkp.credit) {
        await You(`${stashed_gold ? "seem to " : ""}have no gold or credit${
                   paid_p.paid ? " left" : ""}.`);
        return true;
    }
    bp = eshkp.bill_p[0];
    otmp = bp_to_obj(bp);
    ebillct = eshkp.billct;
    more_than_one = (ebillct > 1 || otmp.quan < bp.bquan
                     /* note: will only get here for a single item, so
                        we can deduce that it is ibill[0] */
                     || ibill[0].usedup === UndisclosedContainer);
    if ((umoney + eshkp.credit) < cheapest_item(ibillct, ibill)) {
        await You(`don't have enough gold to buy${more_than_one ? " any of" : ""
                   } the item${more_than_one ? "s" : ""} ${
                   (ebillct > 1) ? "you've picked" : "on your bill"}.`);
        if (stashed_gold)
            await pline("Maybe you have some gold stashed away?");
        return true;
    }

    via_menu = ((game.flags.menu_style ?? MENU_FULL) !== MENU_TRADITIONAL);
    /* allow 'm p' to request a menu for menustyle:traditional;
       for other styles, it will do the opposite */
    if (game.iflags?.menu_requested)
        via_menu = !via_menu;
    /* this will loop for a second iteration iff not initially using a
       menu and player answers 'm' at custom ynq prompt */
    do {
        if (via_menu /*&& more_than_one*/) {
            if (!await menu_pick_pay_items(ibillct, ibill))
                return true;
            queuedpay = true;
            itemize = false;
            via_menu = false; /* reset so that we don't loop */
        } else {
            if (more_than_one)
                throw new Error('pay_billed_items(): "Itemized billing?" prompt not ported yet');
            iprompt = 'y';
            itemize = (iprompt === 'y');
            via_menu = (iprompt === 'm');
        }
    } while (via_menu);

    /*
     * Now it makes one pass through ibill[], which has all used up
     * items sorted to the beginning and unpaid ones sorted to the end.
     * Partly used items have two entries for same base item, one in
     * each section.
     */
    for (indx = 0; indx < ibillct; ++indx) {
        if (queuedpay && !ibill[indx].queuedpay)
            continue;

        otmp = ibill[indx].obj; /* ordinary object or outermost container */
        if (ibill[indx].usedup >= KnownContainer) {
            /* when successfull, buy_container() will call both
               dopayobj() and update_bill(), possibly multiple times */
            const boxbag_result = buy_container(shkp, indx, ibillct, ibill);

            if (boxbag_result === 0) {
                buy = PAY_BUY;
            } else { /* buy_container() failed... */
                if (boxbag_result === 2) /* ... but didn't explain why */
                    await verbalize(`You need to remove any unpaid items from that ${
                                     simpleonames(otmp)} and buy them separately.`);
                buy = PAY_CANT;
            }
        } else {
            bidx = ibill[indx].bidx;
            bp = eshkp.bill_p[bidx];
            pass = (ibill[indx].usedup <= PartlyUsedUp) ? 0 : 1;

            buy = await dopayobj(shkp, bp, otmp, pass, itemize, false);

            if (buy === PAY_BUY)
                update_bill(indx, ibillct, ibill, eshkp, bp, otmp);
        }
        switch (buy) {
        case PAY_CANT:
            return false;
        case PAY_BROKE:
            paid_p.paid = true;
            return true;
        case PAY_SKIP:
            continue;
        case PAY_BUY:
            paid_p.paid = true;
            if (itemize || queuedpay) {
                /* update_inventory(): perm_invent isn't ported */
                bot();
            }
            break;
        }
    }
    return true;
}

// C ref: shk.c update_bill()
/* update shk's bill and augmented bill after an item has been purchased */
function update_bill(
    indx, /* index into ibill[]; -1 for unpaid contained item */
    ibillct,
    ibill,
    eshkp,
    bp,
    paiditem) {
    let j, newebillct;

    /* remove from eshkp->bill_p[] unless this was the used up portion
       of partly used item */
    if (indx >= 0 && ibill[indx].usedup === PartlyUsedUp) {
        bp.bquan = paiditem.quan;
        for (j = 0; j < ibillct; ++j)
            if (ibill[j].obj === paiditem && ibill[j].usedup === PartlyIntact) {
                ibill[j].usedup = FullyIntact;
                break;
            }
    } else {
        /* if we get here, something was bought and needs to be removed
           from shop bill; if it was used up, remove it from the billobjs
           list and delete it; update shop's bill by moving last bill_p[]
           entry into vacated slot; also update ibill[] indices for that */
        paiditem.unpaid = 0; /* clear before maybe deallocating */
        if (paiditem.where === 'OBJ_ONBILL') {
            obj_extract_self(paiditem);
            /* dealloc_obj(paiditem): garbage collected */
        }
        newebillct = eshkp.billct - 1;
        const bpidx = eshkp.bill_p.indexOf(bp); /* bp - eshkp->bill_p */
        /* *bp = eshkp->bill_p[newebillct] */
        Object.assign(bp, eshkp.bill_p[newebillct]);
        for (j = 0; j < ibillct; ++j)
            if (ibill[j].bidx === newebillct)
                ibill[j].bidx = bpidx;
        eshkp.billct = newebillct; /* eshkp->billct - 1 */
    }
    return;
}

// C ref: shk.c dopayobj()
/* return 2 if used-up portion paid
 *        1 if paid successfully
 *        0 if not enough money
 *       -1 if skip this object
 *       -2 if no money/credit left
 */
async function dopayobj(
    shkp,
    bp,
    obj,
    which, /* 0 => used-up item, 1 => other (unpaid or lost) */
    itemize,
    unseen) {
    let ltmp, quan, save_quan;
    let buy;
    const consumed = (which === 0);

    if (!obj.unpaid && !bp.useup
        && !(has_contents(obj) && unpaid_cost(obj, COST_CONTENTS))) {
        /* impossible("Paid object on bill??") */
        return PAY_BUY;
    }
    if (itemize && await insufficient_funds(shkp, obj, 0)) {
        return PAY_BROKE;
    }
    /* we may need to temporarily adjust the object, if part of the
       original quantity has been used up but part remains unpaid */
    save_quan = obj.quan;
    if (consumed) {
        /* either completely used up (simple), or split needed */
        quan = bp.bquan;
        if (quan > obj.quan) /* difference is amount used up */
            quan -= obj.quan;
    } else {
        /* dealing with ordinary unpaid item */
        quan = obj.quan;
    }
    ltmp = bp.price * quan;

    obj.quan = quan;        /* to be used by doname() */
    const iflags = game.iflags || (game.iflags = {});
    iflags.suppress_price = (iflags.suppress_price || 0) + 1; /* affects containers */
    buy = PAY_BUY; /* flag; if changed then return early */

    if (itemize) {
        /* safe_qbuf(..., (quan == 1L) ? Doname2 : doname, ansimpleoname,
                     ...) + y_n(qbuf) */
        obj.quan = save_quan;
        iflags.suppress_price--;
        throw new Error('dopayobj(): itemized "Pay?" prompt not ported yet');
    } /* itemize */

    if (quan < bp.bquan && !consumed) { /* partly used goods */
        /* shk won't sell the intact portion until the used up portion has
           been paid for (once it has been, bp->bquan will match quan) */
        await reject_purchase(shkp, obj, bp.bquan);
        buy = PAY_SKIP;
    }
    if (buy === PAY_BUY && await insufficient_funds(shkp, obj, ltmp)) {
        buy = itemize ? PAY_SKIP : PAY_CANT;
    }

    if (buy === PAY_BUY) {
        await pay(ltmp, shkp);
        if (!unseen)
            await shk_names_obj(shkp, obj,
                                consumed
                                    ? "paid for %s at a cost of %ld gold piece%s.%s"
                                    : "bought %s for %ld gold piece%s.%s",
                                ltmp, "");
    }

    /* restore obj to original state */
    obj.quan = save_quan; /* restore original count */
    iflags.suppress_price--;

    return buy;
}

// C ref: shk.c buy_container()
/* pay for the unpaid contents of a container without itemizing,
   and for the container itself if it is unpaid too */
function buy_container(shkp, indx, ibillct, ibill) {
    void shkp, indx, ibillct, ibill;
    throw new Error('buy_container(): paying for a container not ported yet');
}

// C ref: shk.c reject_purchase()
async function reject_purchase(shkp, obj, billed_quan) {
    const intact_quan = obj.quan;

    /* temporarily change obj to refer to the used up portion */
    obj.quan = billed_quan - intact_quan;
    if (!Deaf() && !muteshk(shkp)) {
        let which;

        if (obj.where === 'OBJ_CONTAINED')
            which = `the one${intact_quan !== 1 ? "s" : ""} in ${
                     thesimpleoname(obj.ocontainer)}`;
        else
            which = (intact_quan > 1) ? "these" : "this one";

        await verbalize(`${ANGRY(shkp) ? "Pay" : "Please pay"} for the other ${
                         simpleonames(obj)} before buying ${which}.`);
    } else {
        await pline(`${Shknam(shkp)} ${ANGRY(shkp) ? "angrily " : ""}${
                     nolimbs_shk(shkp.data) ? "motions to" : "points out"
                     } your bill for the other ${simpleonames(obj)} first.`);
    }
    obj.quan = intact_quan;
}

/* C ref: mondata.h nolimbs() */
function nolimbs_shk(ptr) {
    return (ptr.mflags1 & M1_NOLIMBS) === M1_NOLIMBS;
}

// C ref: shk.c insufficient_funds()
/* gold+credit checking+feedback common to dopayobj() and buy_container() */
async function insufficient_funds(
    shkp,
    item,
    cost) { /* 0: check for no-gold; >0: check for specified amount */
    let stashed_gold;
    const umoney = money_cnt(game.invent),
        ecredit = shkp.mextra.eshk.credit;

    if (!cost && umoney + ecredit === 0) {
        stashed_gold = hidden_gold(true);
        await You(`${(stashed_gold > 0) ? "seem to " : ""}have no gold or credit left.`);
        return true;
    }
    if (cost && umoney + ecredit < cost) {
        stashed_gold = hidden_gold(true);
        await You(`don't${(stashed_gold > 0) ? " seem to" : ""} have gold${
                   (ecredit > 0) ? " or credit" : ""} enough to pay for ${
                   paydoname(item)}.`);
        return true;
    }
    return false;
}

// C ref: shk.c shk_names_obj()
async function shk_names_obj(
    shkp,
    obj,
    fmt, /* "%s %ld %s %s", doname(obj), amt, plur(amt), arg */
    amt,
    arg) {
    let obj_name;
    let was_unknown = !obj.dknown;

    observe_object(obj, Hallucination());
    /* Use real name for ordinary weapons/armor, and spell-less
     * scrolls/books (that is, blank and mail), but only if the
     * object is within the shk's area of interest/expertise.
     */
    if (!objects[obj.otyp].oc_magic && saleable(shkp, obj)
        && (obj.oclass === WEAPON_CLASS || obj.oclass === ARMOR_CLASS
            || obj.oclass === SCROLL_CLASS || obj.oclass === SPBOOK_CLASS
            || obj.otyp === MIRROR)) {
        was_unknown = was_unknown || !objects[obj.otyp].oc_name_known;
        makeknown(obj.otyp);
    }
    obj_name = paydoname(obj);
    /* fmt's %s, %ld, %s, %s: obj_name, amt, plur(amt), arg */
    const fill = (f, name) => {
        const vals = [name, String(amt), amt !== 1 ? "s" : "", arg];
        let k = 0;
        return f.replace(/%ld|%s/g, () => vals[k++]);
    };
    /* Use an alternate message when extra information is being provided */
    if (was_unknown) {
        obj_name = highc(obj_name[0]) + obj_name.slice(1);
        /* Sprintf(fmtbuf, "%%s; you %s", fmt);
           pline(fmtbuf, obj_name, (obj->quan > 1L) ? "them" : "it", amt,
                 plur(amt), arg) */
        const vals = [obj_name, (obj.quan > 1) ? "them" : "it", String(amt),
                      amt !== 1 ? "s" : "", arg];
        let k = 0;
        await pline(`%s; you ${fmt}`.replace(/%ld|%s/g, () => vals[k++]));
    } else {
        await You(fill(fmt, obj_name));
    }
}

// ── pricing ──

// C ref: shk.c record_price_quote()
/* Remembers that a shopkeeper has quoted a particular price for a
   particular type of object. */
export function record_price_quote(otyp, price, buyprice) {
    const oc = objects[otyp];
    if (buyprice) {
        if (price > oc.oc_buy_maxseen) oc.oc_buy_maxseen = price;
        if (price < oc.oc_buy_minseen) oc.oc_buy_minseen = price;
    } else {
        if (price > oc.oc_sell_maxseen) oc.oc_sell_maxseen = price;
        if (price < oc.oc_sell_minseen) oc.oc_sell_minseen = price;
    }
}

// C ref: shk.c onbill()
/* find obj on one of the lists, return the bill entry for it */
export function onbill(obj, shkp, silent) {
    if (shkp) {
        const eshkp = shkp.mextra.eshk;
        for (let i = 0; i < eshkp.billct; i++) {
            const bp = eshkp.bill_p[i];
            if (bp.bo_id === obj.o_id) {
                /* if (!obj->unpaid) impossible("onbill: paid obj on bill?") */
                return bp;
            }
        }
    }
    /* if (obj->unpaid && !silent) impossible("onbill: unpaid obj ...") */
    void silent;
    return null;
}

// C ref: shk.c onshopbill()
/* used outside of shk.c when caller wants to know whether item is on bill
   but doesn't need to know any details about the bill itself */
export function onshopbill(obj, shkp, silent) {
    return onbill(obj, shkp, silent) ? true : false;
}

// C ref: shk.c is_unpaid()
/* check whether an object or any of its contents belongs to a shop */
export function is_unpaid(obj) {
    return !!(obj.unpaid
              || (Has_contents(obj) && count_unpaid(obj.cobj)));
}

/* C ref: zap.c get_obj_location() */
export function get_obj_location(obj, locflags) {
    switch (obj.where) {
    case 'OBJ_INVENT':
        return [game.u.ux, game.u.uy];
    case 'OBJ_FLOOR':
        return [obj.ox, obj.oy];
    case 'OBJ_MINVENT':
        if (obj.ocarry.mx)
            return [obj.ocarry.mx, obj.ocarry.my];
        break; /* !mx => migrating monster */
    case 'OBJ_BURIED':
        if (locflags & BURIED_TOO)
            return [obj.ox, obj.oy];
        break;
    case 'OBJ_CONTAINED':
        if (locflags & CONTAINED_TOO)
            return get_obj_location(obj.ocontainer, locflags);
        break;
    default:
        break;
    }
    return null;
}

// C ref: shk.c fix_shop_damage()
/* normally repair is done when a shopkeeper moves, but we also try to
   catch up for lost time when reloading a previously visited level */
export async function fix_shop_damage() {
    let shkp;
    let damg, nextdamg;

    /* if this level has no shop damage, there's nothing to do */
    if (!game.level.damagelist)
        return;

    /* go through all shopkeepers on the level */
    for (shkp = next_shkp(game.fmon, false); shkp;
         shkp = next_shkp(shkp.nmon, false)) {
        /* if this shopkeeper isn't in his shop or can't move, skip */
        if (shk_impaired(shkp))
            continue;
        /* go through all damage data trying to have this shopkeeper
           fix it; repair_damage() will only make repairs for damage
           matching shop controlled by specified shopkeeper */
        for (damg = game.level.damagelist; damg; damg = nextdamg) {
            nextdamg = damg.next;
            if (await repair_damage(shkp, damg, true))
                discard_damage_struct(damg);
        }
    }
}

// C ref: shk.c get_cost_of_shop_item()
/* Returns the price of an arbitrary item in the shop,
   0 if the item doesn't belong to a shopkeeper or hero is not in the shop.
   nochrg.v is the alternate return value: 1: no charge, 0: shop owned,
   -1: not in a shop (so don't format as "no charge") */
export function get_cost_of_shop_item(obj, nochrg) {
    const u = game.u;
    let shkp;
    let top;
    let loc;
    let cost = 0;

    nochrg.v = -1; /* assume 'not applicable' */
    if (u.ushops && obj.oclass !== COIN_CLASS
        && obj !== game.uball && obj !== game.uchain
        && (loc = get_obj_location(obj, CONTAINED_TOO))
        && (in_rooms(loc[0], loc[1], SHOPBASE)[0] || '') === u.ushops[0]
        && (shkp = shop_keeper(inside_shop(loc[0], loc[1]))) && inhishop(shkp)) {
        const [x, y] = loc;
        for (top = obj; top.where === 'OBJ_CONTAINED'; top = top.ocontainer)
            continue;
        const freespot = (top.where === 'OBJ_FLOOR'
                          && x === shkp.mextra.eshk.shk.x
                          && y === shkp.mextra.eshk.shk.y);
        /* no_charge is only set for floor items inside shop proper;
           items on freespot are implicitly 'no charge' */
        nochrg.v = (top.where === 'OBJ_FLOOR' && (obj.no_charge || freespot))
                   ? 1 : 0;

        if ((top.where === 'OBJ_INVENT') ? obj.unpaid : !nochrg.v) {
            const per_unit_cost = get_cost(obj, shkp);

            cost = get_pricing_units(obj) * per_unit_cost;
        }
        if (Has_contents(obj) && !freespot)
            cost += contained_cost(obj, shkp, 0, false, true);
    }
    return cost;
}

// C ref: shk.c get_pricing_units()
function get_pricing_units(obj) {
    let units = obj.quan;

    if (obj.globby) {
        /* globs must be sold by weight not by volume */
        const unit_weight = objects[obj.otyp].oc_weight,
            wt = (obj.owt > 0) ? obj.owt : weight(obj);

        if (unit_weight)
            units = Math.trunc((wt + unit_weight - 1) / unit_weight);
    }
    return units;
}

// C ref: shk.c oid_price_adjustment()
/* decide whether to apply a surcharge (or hypothetically, a discount) to obj
   if it had ID number 'oid'; returns 1: increase, 0: normal, -1: decrease */
export function oid_price_adjustment(obj, oid) {
    let res = 0;
    const otyp = obj.otyp;

    if (!(obj.dknown && objects[otyp].oc_name_known)
        && (obj.oclass !== GEM_CLASS || objects[otyp].oc_material !== GLASS)) {
        res = ((oid % 4) === 0) ? 1 : 0; /* id%4 ==0 -> +1, ==1..3 -> 0 */
    }
    return res;
}

// C ref: shk.c get_cost()
/* calculate the value that the shk will charge for [one of] an object */
function get_cost(obj, shkp) { /* if angry, impose a surcharge */
    const u = game.u;
    let tmp = getprice(obj, false),
        /* used to perform a single calculation even when multiple
           adjustments (unID'd, dunce/tourist, charisma) are made */
        multiplier = 1, divisor = 1;

    if (!tmp)
        tmp = 5;
    /* shopkeeper may notice if the player isn't very knowledgeable -
       especially when gem prices are concerned */
    if (!obj.dknown || !objects[obj.otyp].oc_name_known) {
        if (obj.oclass === GEM_CLASS
            && objects[obj.otyp].oc_material === GLASS) {
            let i;
            /* get a value that's 'random' from game to game, but the
               same within the same game */
            const pseudorand =
                ((Math.trunc(game.ubirthday || 0) % obj.otyp)
                 >= Math.trunc(obj.otyp / 2));

            /* all gems are priced high - real or not */
            switch (obj.otyp - FIRST_GLASS_GEM) {
            case 0: /* white */
                i = pseudorand ? DIAMOND : OPAL;
                break;
            case 1: /* blue */
                i = pseudorand ? SAPPHIRE : AQUAMARINE;
                break;
            case 2: /* red */
                i = pseudorand ? RUBY : JASPER;
                break;
            case 3: /* yellowish brown */
                i = pseudorand ? AMBER : TOPAZ;
                break;
            case 4: /* orange */
                i = pseudorand ? JACINTH : AGATE;
                break;
            case 5: /* yellow */
                i = pseudorand ? CITRINE : CHRYSOBERYL;
                break;
            case 6: /* black */
                i = pseudorand ? BLACK_OPAL : JET;
                break;
            case 7: /* green */
                i = pseudorand ? EMERALD : JADE;
                break;
            case 8: /* violet */
                i = pseudorand ? AMETHYST : FLUORITE;
                break;
            default:
                /* impossible("bad glass gem %d?", obj->otyp) */
                i = STRANGE_OBJECT;
                break;
            }
            tmp = objects[i].oc_cost;
        } else if (oid_price_adjustment(obj, obj.o_id) > 0) {
            /* unid'd, arbitrarily impose surcharge: tmp *= 4/3 */
            multiplier *= 4;
            divisor *= 3;
        }
    }
    if (game.uarmh && game.uarmh.otyp === DUNCE_CAP)
        multiplier *= 4, divisor *= 3;
    else if ((Role_if(PM_TOURIST) && u.ulevel < Math.trunc(MAXULEV / 2))
             || (game.uarmu && !game.uarm && !game.uarmc)) /* touristy shirt visible */
        multiplier *= 4, divisor *= 3;

    if (ACURR(A_CHA) > 18)
        divisor *= 2;
    else if (ACURR(A_CHA) === 18)
        multiplier *= 2, divisor *= 3;
    else if (ACURR(A_CHA) >= 16)
        multiplier *= 3, divisor *= 4;
    else if (ACURR(A_CHA) <= 5)
        multiplier *= 2;
    else if (ACURR(A_CHA) <= 7)
        multiplier *= 3, divisor *= 2;
    else if (ACURR(A_CHA) <= 10)
        multiplier *= 4, divisor *= 3;

    /* tmp = (tmp * multiplier) / divisor [with roundoff tweak] */
    tmp *= multiplier;
    if (divisor > 1) {
        /* tmp = (((tmp * 10) / divisor) + 5) / 10 */
        tmp *= 10;
        tmp = Math.trunc(tmp / divisor);
        tmp += 5;
        tmp = Math.trunc(tmp / 10);
    }

    if (tmp <= 0)
        tmp = 1;
    /* the artifact prices in artilist[] are also used as a score bonus;
       inflate their shop price here without affecting score calculation */
    if (obj.oartifact)
        tmp *= 4;

    /* anger surcharge should match rile_shk's, so we do it separately
       from the multiplier/divisor calculation */
    if (shkp && shkp.mextra.eshk.surcharge)
        tmp += Math.trunc((tmp + 2) / 3);
    return tmp;
}

// C ref: shk.c contained_cost()
/* returns the price of a container's content.  the price
 * of the "top" container is added in the calling functions.
 * a different price quoted for selling as vs. buying.
 */
export function contained_cost(obj, shkp, price, usell, unpaid_only) {
    let top;
    let x, y;

    for (top = obj; top.where === 'OBJ_CONTAINED'; top = top.ocontainer)
        continue;
    /* pick_obj() removes item from floor, adds it to shop bill, then
       puts it in inventory; behave as if it is still on the floor
       during the add-to-bill portion of that situation */
    const is_free = (top.where === 'OBJ_FREE' || !top.where);
    const on_floor = (top.where === 'OBJ_FLOOR' || is_free);
    const loc = is_free ? null : get_obj_location(top, 0);
    if (!loc)
        x = game.u.ux, y = game.u.uy;
    else
        [x, y] = loc;
    const freespot = (on_floor && x === shkp.mextra.eshk.shk.x
                      && y === shkp.mextra.eshk.shk.y);

    /* price of contained objects; "top" container handled by caller */
    for (const otmp of obj.cobj || []) {
        if (otmp.oclass === COIN_CLASS)
            continue;

        if (usell) {
            throw new Error('contained_cost(): selling contents (saleable()) not ported yet');
        } else {
            /* no_charge is only set for floor items (including
               contents of floor containers) inside shop proper;
               items on freespot are implicitly 'no charge' */
            if (on_floor ? (!otmp.no_charge && !freespot)
                         : (otmp.unpaid || !unpaid_only))
                price += get_cost(otmp, shkp) * get_pricing_units(otmp);
        }

        if (Has_contents(otmp))
            price = contained_cost(otmp, shkp, price, usell, unpaid_only);
    }

    return price;
}

// C ref: shk.c contained_gold()
/* count amount of gold inside container 'obj' and any nested containers */
export function contained_gold(obj, even_if_unknown) {
    let value = 0;

    /* accumulate contained gold */
    for (const otmp of obj.cobj || [])
        if (otmp.oclass === COIN_CLASS)
            value += otmp.quan;
        else if (Has_contents(otmp) && (otmp.cknown || even_if_unknown))
            value += contained_gold(otmp, even_if_unknown);

    return value;
}

// C ref: shk.c picked_container()
export function picked_container(obj) {
    /* the "top" container is treated in the calling fn */
    for (const otmp of obj.cobj || []) {
        if (otmp.oclass === COIN_CLASS)
            continue;

        if (otmp.no_charge)
            otmp.no_charge = 0;

        if (Has_contents(otmp))
            picked_container(otmp);
    }
}

// C ref: shk.c set_cost()
/* calculate how much the shk will pay when buying [all of] an object */
export function set_cost(obj, shkp) {
    const u = game.u;
    let tmp, multiplier = 1, divisor = 1;
    const unit_price = getprice(obj, true);

    tmp = get_pricing_units(obj) * unit_price;

    if (game.uarmh && game.uarmh.otyp === DUNCE_CAP)
        divisor *= 3;
    else if ((Role_if(PM_TOURIST) && u.ulevel < Math.trunc(MAXULEV / 2))
             || (game.uarmu && !game.uarm && !game.uarmc)) /* touristy shirt visible */
        divisor *= 3;
    else
        divisor *= 2;

    /* shopkeeper may notice if the player isn't very knowledgeable -
       especially when gem prices are concerned */
    if (!obj.dknown || !objects[obj.otyp].oc_name_known) {
        if (obj.oclass === GEM_CLASS) {
            /* different shop keepers give different prices */
            if (objects[obj.otyp].oc_material === GEMSTONE
                || objects[obj.otyp].oc_material === GLASS) {
                tmp = ((obj.otyp - FIRST_REAL_GEM) % (6 - shkp.m_id % 3));
                tmp = (tmp + 3) * obj.quan;
                divisor = 1;
            }
        } else if (tmp > 1 && !(shkp.m_id % 4))
            multiplier *= 3, divisor *= 4;
    }

    if (tmp >= 1) {
        /* [see get_cost()] */
        tmp *= multiplier;
        if (divisor > 1) {
            tmp *= 10;
            tmp = Math.trunc(tmp / divisor);
            tmp += 5;
            tmp = Math.trunc(tmp / 10);
        }
        /* avoid adjusting nonzero to zero */
        if (tmp < 1)
            tmp = 1;
    }

    /* (no adjustment for angry shk here) */
    return tmp;
}

// C ref: shk.c unpaid_cost()
/* returns the price of an unpaid item, or of its contents */
export function unpaid_cost(unp_obj, cost_type) {
    let bp = null;
    let shkp = null;
    let amt = 0;

    for (const shop of game.u.ushops || '') {
        if ((shkp = shop_keeper(shop.charCodeAt(0))) != null) {
            if ((bp = onbill(unp_obj, shkp, true))) {
                amt = bp.price;
                if (cost_type !== COST_SINGLEOBJ) {
                    /* use quan rather than get_pricing_units -- glob weight
                       should already be factored into bp->price */
                    amt *= unp_obj.quan;
                }
            }
            if (cost_type === COST_CONTENTS && Has_contents(unp_obj))
                amt = contained_cost(unp_obj, shkp, amt, false, true);
            if (bp || (!unp_obj.unpaid && amt))
                break;
        }
    }

    /* onbill() gave no message if unexpected problem occurred */
    /* if (!shkp || (unp_obj->unpaid && !bp))
           impossible("unpaid_cost: object wasn't on any bill."); */
    return amt;
}

// C ref: shk.c add_one_tobill()
/* add 'obj' to 'shkp's bill */
function add_one_tobill(obj, dummy, shkp) {
    const eshkp = shkp.mextra.eshk;
    let unbilled = false;

    /* normally bill_p gets set up whenever you enter the shop, but obj
       might be going onto the bill because hero just snagged it with
       a grappling hook from outside without ever having been inside */
    if (!eshkp.bill_p)
        eshkp.bill_p = eshkp.bill || (eshkp.bill = []);

    const shkpp = { v: shkp };
    if (!billable(shkpp, obj, (game.u.ushops || '').charCodeAt(0) || 0, true)) {
        /* shk doesn't want it */
        unbilled = true;
    } else if (eshkp.billct === BILLSZ) {
        /* shk's bill is completely full */
        throw new Error('add_one_tobill(): full shop bill not ported yet');
    }
    /* if not on any list (probably from bill_dummy_object() which creates
       a new OBJ_FREE object), don't leave unmanaged object hanging around */
    if (unbilled) {
        if (obj.where === 'OBJ_FREE')
            throw new Error('add_one_tobill(): dealloc_obj() of an unbilled dummy not ported yet');
        return;
    }

    const bct = eshkp.billct;
    const bp = eshkp.bill_p[bct] = {};
    bp.bo_id = obj.o_id;
    bp.bquan = obj.quan;
    if (dummy) {              /* a dummy object must be inserted into  */
        bp.useup = true;      /* the gb.billobjs chain here.  crucial for */
        add_to_billobjs(obj); /* eating floorfood in shop.  see eat.c  */
    } else
        bp.useup = false;
    bp.price = get_cost(obj, shkp);
    if (obj.globby)
        throw new Error('add_one_tobill(): billing a glob (newomid()) not ported yet');
    eshkp.billct++;
    obj.unpaid = 1;
    record_price_quote(obj.otyp, bp.price, true);
}

// C ref: shk.c add_to_billobjs()
function add_to_billobjs(obj) {
    if (obj.where !== 'OBJ_FREE' && obj.where)
        throw new Error('add_to_billobjs: obj not free');
    if (obj.timed)
        obj_stop_timers(obj);

    obj.nobj = game.billobjs || null;
    game.billobjs = obj;
    obj.where = 'OBJ_ONBILL';

    /* if hero drinks a shop-owned potion, it will have been flagged
       in_use by dodrink/dopotion but isn't being used up yet because
       it stays on the bill; only object sanity checking actually cares */
    obj.in_use = 0;
    /* ... same for bypass by destroy_items */
    obj.bypass = 0;
}

// C ref: shk.c bill_box_content()
/* recursive billing of objects within containers. */
function bill_box_content(obj, ininv, dummy, shkp) {
    /* SchroedingersBox(obj) */
    if (obj.otyp === LARGE_BOX && obj.spe === 1)
        return;
    for (const otmp of obj.cobj || []) {
        if (otmp.oclass === COIN_CLASS)
            continue;

        /* the "top" box is added in addtobill() */
        if (!otmp.no_charge)
            add_one_tobill(otmp, dummy, shkp);
        if (Has_contents(otmp))
            bill_box_content(otmp, ininv, dummy, shkp);
    }
}

// C ref: shk.c billable()
/* decide whether a shopkeeper thinks an item belongs to her;
   shkpp.v: in: non-null if shk has been validated; out: shk */
export function billable(shkpp, obj, roomno, reset_nocharge) {
    let shkp = shkpp.v;

    /* if caller hasn't supplied a shopkeeper, look one up now */
    if (!shkp) {
        if (!roomno)
            return false;
        shkp = shop_keeper(roomno);
        if (!shkp || !inhishop(shkp))
            return false;
        shkpp.v = shkp;
    }
    /* perhaps we threw it away earlier */
    if (onbill(obj, shkp, false)
        || (obj.oclass === FOOD_CLASS && obj.oeaten))
        return false;
    /* outer container might be marked no_charge but still have contents
       which should be charged for; clear no_charge when picking things up */
    if (obj.no_charge) {
        if (!Has_contents(obj) || (contained_gold(obj, true) === 0
                                   && contained_cost(obj, shkp, 0, false,
                                                     !reset_nocharge) === 0))
            shkp = null; /* not billable */
        if (reset_nocharge && !shkp && obj.oclass !== COIN_CLASS) {
            obj.no_charge = 0;
            if (Has_contents(obj))
                picked_container(obj); /* clear no_charge */
        }
    }
    return shkp ? true : false;
}

const and_its_contents = " and its contents";
const the_contents_of = "the contents of ";

// C ref: shk.c addtobill()
export async function addtobill(obj, ininv, dummy, silent) {
    const shkpp = { v: null };
    let ltmp, cltmp, gltmp;
    let contentscount;

    if (!billable(shkpp, obj, (game.u.ushops || '').charCodeAt(0) || 0, true))
        return;
    const shkp = shkpp.v;

    if (obj.oclass === COIN_CLASS) {
        throw new Error('addtobill(): costly_gold() not ported yet');
    } else if (shkp.mextra.eshk.billct === BILLSZ) {
        if (!silent)
            await You("got that for free!");
        return;
    }

    ltmp = cltmp = gltmp = 0;
    const container = Has_contents(obj);

    if (!obj.no_charge) {
        ltmp = get_cost(obj, shkp);
        if (obj.globby)
            ltmp *= get_pricing_units(obj);
    }
    if (obj.no_charge && !container) {
        obj.no_charge = 0;
        return;
    }

    if (container) {
        cltmp = contained_cost(obj, shkp, cltmp, false, false);
        gltmp = contained_gold(obj, true);

        if (ltmp)
            add_one_tobill(obj, dummy, shkp);
        if (cltmp)
            bill_box_content(obj, ininv, dummy, shkp);
        picked_container(obj); /* reset contained obj->no_charge */

        ltmp += cltmp;

        if (gltmp) {
            throw new Error('addtobill(): costly_gold() of contained gold not ported yet');
        }

        if (obj.no_charge)
            obj.no_charge = 0;
        contentscount = count_unpaid(obj.cobj);
    } else { /* !container */
        add_one_tobill(obj, dummy, shkp);
        contentscount = 0;
    }

    if (!Deaf() && !muteshk(shkp) && !silent) {
        let buf;

        /* no need to update price quotes here; it was done by
           add_one_tobill above */

        if (!ltmp) {
            await pline(`${Shknam(shkp)} has no interest in ${the(xname(obj))}.`);
            return;
        }
        if (!ininv) {
            await pline(`${The(xname(obj))} will cost you ${ltmp} ${
                         currency(ltmp)}${(obj.quan > 1) ? " each" : ""}.`);
        } else {
            const save_quan = obj.quan;

            buf = "\"For you,";
            if (ANGRY(shkp)) {
                buf += " scum;";
            } else if (!shkp.mextra.eshk.surcharge) {
                buf += " ";
                buf = append_honorific(buf);
                buf += "; only";
            }
            obj.quan = 1; /* fool xname() into giving singular */
            const xn = xname(obj);
            obj.quan = save_quan;
            await pline(`${buf} ${ltmp} ${currency(ltmp)} ${
                         (save_quan > 1) ? "per"
                         : (contentscount && !obj.unpaid)
                           ? "for the contents of this"
                           : "for this"} ${xn}${
                         (contentscount && obj.unpaid) ? and_its_contents : ""}.\"`);
        }
    } else if (!silent) {
        if (ltmp) {
            await pline_The(`list price of ${
                             (contentscount && !obj.unpaid) ? the_contents_of : ""}${
                             the(xname(obj))}${
                             (contentscount && obj.unpaid) ? and_its_contents : ""
                             } is ${ltmp} ${currency(ltmp)}${
                             (obj.quan > 1) ? " each" : ""}.`);
        } else {
            await pline(`${Shknam(shkp)} does not notice.`);
        }
    }
}

// C ref: shk.c append_honorific()
function append_honorific(buf) {
    /* (chooses among [0]..[3] normally; [1]..[4] after the
       Wizard has been killed or invocation ritual performed) */
    const honored = [
        "good", "honored", "most gracious", "esteemed",
        "most renowned and sacred"
    ];
    const ymon = game.youmonst.data;
    const Upolyd = game.u.umonnum !== game.u.umonster;

    buf += honored[rn2(honored.length - 1) + (game.u.uevent?.udemigod ? 1 : 0)];
    if (is_vampire(ymon))
        buf += (game.flags.female) ? " dark lady" : " dark lord";
    else if (Upolyd ? is_elf(ymon) : (game.urace.mnum === PM_ELF))
        buf += (game.flags.female) ? " hiril" : " hir";
    else
        buf += !is_human(ymon) ? " creature"
               : (game.flags.female) ? " lady"
                 : " sir";
    return buf;
}

// C ref: shk.c splitbill()
export function splitbill(obj, otmp) {
    /* otmp has been split off from obj */
    let bp;
    const shkp = shop_keeper((game.u.ushops || '').charCodeAt(0) || 0);

    if (!shkp || !inhishop(shkp)) {
        /* impossible("splitbill: no resident shopkeeper??") */
        return;
    }
    bp = onbill(obj, shkp, false);
    if (!bp) {
        /* impossible("splitbill: not on bill?") */
        return;
    }
    bp.bquan -= otmp.quan;

    const eshkp = shkp.mextra.eshk;
    if (eshkp.billct === BILLSZ) {
        otmp.unpaid = 0;
    } else {
        const tmp = bp.price;
        bp = eshkp.bill_p[eshkp.billct] = {};
        bp.bo_id = otmp.o_id;
        bp.bquan = otmp.quan;
        bp.useup = false;
        bp.price = tmp;
        eshkp.billct++;
    }
}

// C ref: shk.c sub_one_frombill()
function sub_one_frombill(obj, shkp) {
    let bp;

    if ((bp = onbill(obj, shkp, false)) != null) {
        obj.unpaid = 0;
        if (bp.bquan > obj.quan)
            throw new Error('sub_one_frombill(): partial bill entry (newobj() copy) not ported yet');
        const eshkp = shkp.mextra.eshk;
        eshkp.billct--;
        Object.assign(bp, eshkp.bill_p[eshkp.billct]);
        eshkp.bill_p.length = eshkp.billct;
        return;
    } else if (obj.unpaid) {
        /* impossible("sub_one_frombill: unpaid object not on bill") */
        obj.unpaid = 0;
    }
}

// C ref: shk.c subfrombill()
/* recursive check of unpaid objects within nested containers. */
export function subfrombill(obj, shkp) {
    sub_one_frombill(obj, shkp);

    if (Has_contents(obj))
        for (const otmp of obj.cobj) {
            if (otmp.oclass === COIN_CLASS)
                continue;

            if (Has_contents(otmp))
                subfrombill(otmp, shkp);
            else
                sub_one_frombill(otmp, shkp);
        }
}

// C ref: shk.c corpsenm_price_adj()
function corpsenm_price_adj(obj) {
    let val = 0;

    if ((obj.otyp === TIN || obj.otyp === EGG || obj.otyp === CORPSE)
        && obj.corpsenm != null && obj.corpsenm >= 0) { /* ismnum() */
        let tmp = 1;
        const ptr = mons[obj.corpsenm];
        const icost = [
            { trinsic: FIRE_RES,   cost: 2 },
            { trinsic: SLEEP_RES,  cost: 3 },
            { trinsic: COLD_RES,   cost: 2 },
            { trinsic: DISINT_RES, cost: 5 },
            { trinsic: SHOCK_RES,  cost: 4 },
            { trinsic: POISON_RES, cost: 2 },
            { trinsic: ACID_RES,   cost: 1 },
            { trinsic: STONE_RES,  cost: 3 },
            { trinsic: TELEPORT,   cost: 2 },
            { trinsic: TELEPORT_CONTROL,  cost: 3 },
            { trinsic: TELEPAT,  cost: 5 }
        ];

        for (let i = 0; i < icost.length; i++)
            if (intrinsic_possible(icost[i].trinsic, ptr))
                tmp += icost[i].cost;
        if ((ptr.geno & G_UNIQ) !== 0) /* unique_corpstat() */
            tmp += 50;

        val = Math.max(1, ((ptr.mlevel - 1) * 2));
        if (obj.otyp === CORPSE)
            val += Math.max(1, Math.trunc(ptr.cnutrit / 30));

        val = val * tmp;
    }

    return val;
}

// C ref: shk.c getprice()
function getprice(obj, shk_buying) {
    let tmp = objects[obj.otyp].oc_cost;

    if (obj.oartifact)
        throw new Error('getprice(): arti_cost() not ported yet');
    switch (obj.oclass) {
    case FOOD_CLASS:
        tmp += corpsenm_price_adj(obj);

        /* simpler hunger check, (2-4)*cost */
        if (game.u.uhs >= HUNGRY && !shk_buying)
            tmp *= game.u.uhs;
        if (obj.oeaten)
            tmp = 0;
        break;
    case WAND_CLASS:
        if (obj.spe === -1)
            tmp = 0;
        break;
    case POTION_CLASS:
        if (obj.otyp === POT_WATER && !obj.blessed && !obj.cursed)
            tmp = 0;
        break;
    case ARMOR_CLASS:
    case WEAPON_CLASS:
        if (obj.spe > 0)
            tmp += 10 * obj.spe;
        break;
    case TOOL_CLASS:
        if (Is_candle(obj)
            && obj.age < 20 * objects[obj.otyp].oc_cost)
            tmp = Math.trunc(tmp / 2);
        break;
    }
    return tmp;
}

// C ref: shk.c same_price()
/*
   Decide whether two unpaid items are mergeable; caller is responsible for
   making sure they're unpaid and the same type of object; we check the price
   quoted by the shopkeeper and also that they both belong to the same shk.
 */
export function same_price(obj1, obj2) {
    let shkp1, shkp2;
    let bp1 = null, bp2 = null;
    let are_mergable = false;

    /* look up the first object by finding shk whose bill it's on */
    for (shkp1 = next_shkp(game.fmon, true); shkp1;
         shkp1 = next_shkp(shkp1.nmon, true))
        if ((bp1 = onbill(obj1, shkp1, true)) != null)
            break;
    /* second object is probably owned by same shk; if not, look harder */
    if (shkp1 && (bp2 = onbill(obj2, shkp1, true)) != null) {
        shkp2 = shkp1;
    } else {
        for (shkp2 = next_shkp(game.fmon, true); shkp2;
             shkp2 = next_shkp(shkp2.nmon, true))
            if ((bp2 = onbill(obj2, shkp2, true)) != null)
                break;
    }

    if (!bp1 || !bp2) {
        /* impossible("same_price: object wasn't on any bill!") */
    } else
        are_mergable = (shkp1 === shkp2 && bp1.price === bp2.price);
    return are_mergable;
}

// C ref: shk.c append_price_quote()
/* Appends price-quote information to the given buffer (returned).
   If the update would make buf longer than BUFSZ, instead does nothing. */
export function append_price_quote(buf, otyp) {
    const oc = objects[otyp];
    let buf2 = '';
    let sep = "";
    const len = buf.length;

    if (oc.oc_sell_minseen > oc.oc_sell_maxseen
        && oc.oc_buy_minseen > oc.oc_buy_maxseen)
        return buf;

    buf2 += " {";

    if (oc.oc_buy_minseen < oc.oc_buy_maxseen) {
        buf2 += `buy ${oc.oc_buy_minseen}-${oc.oc_buy_maxseen}`;
        sep = " ";
    } else if (oc.oc_buy_minseen === oc.oc_buy_maxseen) {
        buf2 += `buy ${oc.oc_buy_minseen}`;
        sep = " ";
    }

    if (oc.oc_sell_minseen < oc.oc_sell_maxseen) {
        buf2 += `${sep}sell ${oc.oc_sell_minseen}-${oc.oc_sell_maxseen}`;
    } else if (oc.oc_sell_minseen === oc.oc_sell_maxseen) {
        buf2 += `${sep}sell ${oc.oc_sell_minseen}`;
    }

    buf2 += "}";
    if (buf2.length < 256 /* BUFSZ */ - len - 1)
        buf += buf2;
    return buf;
}
