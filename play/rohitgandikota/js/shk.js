// shk.js — shopkeeper behaviour.
// C ref: src/shk.c
//
// Billing and ordinary price quotes are ported alongside movement and pursuit.
// Credit, selling, robbery, the shop entry/exit dance, and the shopkeeper's
// own combat are not ported. js/shknam.js holds the naming and stocking half
// (shtypes, nameshk, stock_room), which is src/shknam.c.

import { obfree, o_on } from './invent.js';
import { obj_extract_self } from './invent.js';
import { mpickobj } from './steal.js';
import { flush_screen } from './display.js';
import { map_invisible } from './display.js';
import { the } from './objnam.js';
import { mnearto } from './mon.js';
import { OBJ_BURIED, LS_OBJECT } from './const.js';
import { You, impossible, You_cant } from './pline.js';
import { angry_guards } from './mon.js';
import { count_unpaid, count_contents, merge_choice } from './invent.js';
import { pline_The } from './pline.js';
import { obj_typename } from './objnam.js';
import { upstart } from './do_name.js';
import { Shknam } from './shknam.js';
import { add_to_minv } from './mkobj.js';
import { setnotworn } from './worn.js';
import { makeplural } from './objnam.js';
import { growl } from './sounds.js';
import { m_next2u, mnexto } from './mon.js';
import { TT_PIT, RLOC_MSG, W_SWAPWEP, W_QUIVER } from './const.js';
import { verbalize } from './pline.js';
import { is_silent, nolimbs, locomotion } from './mondata.js';
import { sgn } from './hacklib.js';
import { Role_if } from './attrib.js';
import { ismnum, OBJ_MINVENT } from './const.js';
import { carried } from './obj.js';
import { the_unique_pm } from './objnam.js';
import { type_is_pname } from './mondata.js';
import { y_monnam } from './do_name.js';
import { shkname } from './shknam.js';
import { Your } from './pline.js';
import { get_obj_location } from './zap.js';
import { update_inventory } from './invent.js';
import { game } from './gstate.js';
import { paydoname, Doname2, thesimpleoname } from './objnam.js';
import { add_menu_heading } from './options.js';
import { remove_worn_item } from './steal.js';
import { findgold } from './makemon.js';
import { MENU_TRADITIONAL } from './const.js';
import { observe_object } from './o_init.js';
import { highc } from './hacklib.js';
import { safe_qbuf } from './objnam.js';
import { ESHK, SHOPBASE, IS_DOOR, ROOMOFFSET, NO_ROOM, A_CHA, MAXULEV,
         HUNGRY, PICK_ANY, MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE,
         ECMD_OK, ECMD_TIME, G_GONE, A_WIS,
         M_AP_TYPE, M_AP_NOTHING, M_AP_MONSTER, MIGR_APPROX_XY, RLOC_NOMSG,
         NON_PM, REPAIR_DELAY, BOLT_LIM, D_BROKEN, D_CLOSED, IS_ROOM,
         IS_WALL, SVALL, u_at, HAND, PRONOUN_NO_IT, PRONOUN_HALLU }
    from './const.js';
import { in_rooms } from './hack.js';
import { distu, dist2, distmin, online2, isok } from './hacklib.js';
import { m_canseeu, inhishop, mdistu } from './monmove.js';
import { move_special } from './priest.js';
import { addinv, carrying, sobj_at, currency, money_cnt, freeinv,
         contained_gold, hidden_gold, weight } from './invent.js';
import { m_at, t_at, wake_nearto } from './mon.js';
import { Blind, Deaf, Invis, Detect_monsters, Blind_telepat } from './youprop.js';
import { ACURR, Fast, adjalign, exercise } from './attrib.js';
import { ONAMES, OCLASSES, MATERIALS } from './objects_data.js';
import { PMNAMES, MSOUND, MFLAGS } from './monst_data.js';
import { Has_contents, Is_candle } from './obj.js';
import { DEADMONSTER, helpless } from './monst.js';
import { is_demon, is_elf, is_human, passes_walls, vegetarian,
         pronoun_gender } from './mondata.js';
import { poly_gender, mbodypart } from './polyself.js';
import { rn2, rnd } from './rng.js';
import { bot, pline, canseemon, canspotmon, newsym, sensemon }
    from './display.js';
import { an, doname, simpleonames, xname, The } from './objnam.js';
import { splitobj, bill_dummy_object } from './mkobj.js';
import { OBJ_CONTAINED, OBJ_FLOOR, OBJ_FREE, OBJ_INVENT, OBJ_ONBILL }
    from './obj.js';
import { s_suffix } from './hacklib.js';
import { shtypes, VEGETARIAN_CLASS } from './shknam.js';
import { Hello, genders } from './role.js';
import { ATR_NONE, NHW_MENU, tty_add_menu, tty_create_nhwindow,
         tty_destroy_nhwindow, tty_end_menu, tty_select_menu,
         tty_start_menu } from './tty/wintty.js';
import { NO_COLOR } from './terminal.js';
import { tty_yn_function } from './tty/topl.js';
import { arti_cost } from './artifact.js';
import { block_point, cansee } from './vision.js';
import { del_engr_at } from './engrave.js';
import { Norep, You_feel, You_hear } from './pline.js';
import { COST_SINGLEOBJ, COST_CONTENTS } from './const.js';
import { has_omid, OMID } from './const.js';
import { obj_stop_timers } from './timeout.js';
import { xprname } from './invent.js';
import { tty_putstr, tty_display_nhwindow, tty_next_page } from './tty/wintty.js';
import { xwaitforspace } from './tty/getline.js';
import { is_pick } from './mon.js';
import { haseyes } from './mondata.js';
import { dochug } from './monmove.js';
import { noit_mhis } from './mondata.js';
import { plur, EYE, HEAD, LOW_PM, PL_NSIZ } from './const.js';
import { has_head } from './mondata.js';
import { mongone } from './mon.js';
import { unleash_all } from './apply.js';
import { drop_upon_death } from './bones.js';
import { makeknown } from './o_init.js';
import { yelp } from './sounds.js';
import { getpos } from './getpos.js';
import { ARTICLE_THE, ECMD_CANCEL } from './const.js';
import { There } from './pline.js';
import { Monnam, x_monnam } from './do_name.js';
import { LANDMINE, BEAR_TRAP, HOLE, PIT, SPIKED_PIT, ZAP_POS, BILLSZ } from './const.js';
import { closed_door } from './cmd.js';
import { trapname, deltrap } from './trap.js';
import { picking_at } from './lock.js';
import { stop_occupation } from './allmain.js';
import { tty_wait_synch } from './tty/wintty.js';
import { unplacebc, placebc } from './ball.js';
import { next_ident, mksobj, place_object } from './mkobj.js';
import { ansimpleoname } from './objnam.js';
import { check_special_room } from './hack.js';

// src/shk.c:139 angrytexts[]
const angrytexts = ['quite upset', 'ticked off', 'furious'];

// src/shk.c:921 pick_pick(); one reaction per turn to a concealed pick.
export async function pick_pick(obj) {
    if (obj.unpaid || !is_pick(obj)) return;
    const shkp = shop_keeper((game.u.ushops || '\0').charCodeAt(0));
    if (shkp && inhishop(shkp)) {
        if (game.moves !== (game.pickmovetime || 0)) {
            if (!Deaf() && !muteshk(shkp)) {
                // SetVoice is compiled out in the reference recorder.
                await verbalize(`You sneaky ${cad(false)}!  Get out of here with that pick!`);
            } else {
                await pline(`${Shknam(shkp)} ${haseyes(shkp.data) ? 'glares at' : 'is dismayed because of'} your pick!`);
            }
        }
        game.pickmovetime = game.moves;
    }
}




// src/shk.c:1449 hot_pursuit() — the shopkeeper starts following you.
//
// The isshk guard is not redundant: wakeup() calls this for any peaceful
// monster that turns out to be a shopkeeper, and setmangry's callers do not
// pre-filter, so a non-shk reaching here must return without touching
// eshk (which it does not have).
//
// `customer` is stamped with the player name because a shopkeeper tracks
// WHO owes; `following` is what makes it chase you off the level.
//
// The two clear_no_charge calls are shopkeeper networking: being chased by
// one shopkeeper voids the no-charge flag on every object on the floor of
// this level, including inside containers and including other shopkeepers'
// stock. That is deliberate -- the shops share information about a thief.
export function hot_pursuit(shkp) {
    if (!shkp.isshk)
        return;

    rile_shk(shkp);
    ESHK(shkp).customer = game.plname || '';
    ESHK(shkp).following = 1;

    /* shopkeeper networking:  clear obj->no_charge for all obj on the
       floor of this level (including inside containers on floor), even
       those that are in other shopkeepers' shops */
    clear_no_charge(null, game.level?.objects);
    clear_no_charge_pets(shkp);
}

function note_unported_shk(what) {
    (game.unported ||= new Set()).add('shk:' + what);
    return false;
}

// src/shk.c:215 next_shkp() — the next shopkeeper on the monster list,
// optionally only one with a bill; an angry one without a surcharge gets
// riled.
export function next_shkp(shkp, withbill) {
    const mons = game.level?.monsters || [];
    let i = shkp ? mons.indexOf(shkp) : -1;
    let found = null;
    for (; i >= 0 && i < mons.length; i++) {
        const m = mons[i];
        if (DEADMONSTER(m))
            continue;
        const eshk = m.isshk ? (m.eshk || ESHK(m)) : null;
        if (m.isshk && ((eshk?.bill_p?.length || 0) || !withbill)) {
            found = m;
            break;
        }
    }
    if (found) {
        if (!found.mpeaceful) {                         /* ANGRY(shkp) */
            const eshk = found.eshk || ESHK(found);
            if (!eshk.surcharge)
                rile_shk(found);
        }
    }
    return found;
}

// src/shk.c:955 same_price(); unpaid stacks must share their owner and quote.
export function same_price(obj1, obj2) {
    const mons = game.level?.monsters || [];
    let shkp1, shkp2, bp1 = null, bp2 = null;
    for (shkp1 = next_shkp(mons[0] ?? null, true); shkp1;
         shkp1 = next_shkp(mons[mons.indexOf(shkp1) + 1] ?? null, true)) {
        if ((bp1 = onbill(obj1, shkp1, true)))
            break;
    }
    if (shkp1 && (bp2 = onbill(obj2, shkp1, true))) {
        shkp2 = shkp1;
    } else {
        for (shkp2 = next_shkp(mons[0] ?? null, true); shkp2;
             shkp2 = next_shkp(mons[mons.indexOf(shkp2) + 1] ?? null, true)) {
            if ((bp2 = onbill(obj2, shkp2, true)))
                break;
        }
    }
    if (!bp1 || !bp2) {
        void impossible("same_price: object wasn't on any bill!");
        return false;
    }
    return shkp1 === shkp2 && bp1.price === bp2.price;
}

// src/shk.c:1136 onbill() — the bill entry for obj on this shopkeeper's bill.
export function onbill(obj, shkp, silent) {
    if (shkp) {
        const eshk = shkp.eshk || ESHK(shkp);
        for (const bp of eshk.bill_p || []) {
            if (bp.bo_id === obj.o_id) {
                /* if (!obj->unpaid) impossible("onbill: paid obj on bill?") */
                return bp;
            }
        }
    }
    /* if (obj->unpaid && !silent) impossible("onbill: unpaid obj %s?", ...) */
    return null;
}

// src/shk.c:2777 find_oid(); bill-only objects deliberately are not searched.
export function find_oid(id) {
    for (const chain of [game.invent, game.level?.objects,
                         game.level?.buriedobjs, game.migrating_objs]) {
        const obj = o_on(id, chain);
        if (obj)
            return obj;
    }
    for (const chain of [game.level?.monsters, game.migrating_mons, game.mydogs])
        for (const mon of chain || []) {
            const obj = o_on(id, mon.minvent);
            if (obj)
                return obj;
        }
    return null;
}

// src/shk.c:2485 paybill() — at game end the shopkeepers get their crack
// at the hero's inventory; croaked is -1: escaped dungeon, 0: quit, 1: died.
export async function paybill(croaked, silently) {
    let mtmp, mtmp2, firstshk, resident, creditor, hostile, localshk;
    let eshkp;
    let taken = false, local;
    let numsk = 0;
    const mons = game.level?.monsters || [];

    /* if we escaped from the dungeon, shopkeepers can't reach us;
       shops don't occur on level 1, but this could happen if hero
       level teleports out of the dungeon and manages not to die */
    if (croaked < 0)
        return false;
    /* [should probably also return false when dead hero has been
        petrified since shk shouldn't be able to grab inventory
        which has been shut inside a statue] */

    /* this is where inventory will end up if any shk takes it */
    const repo = (game.repo ||= { location: { x: 0, y: 0 }, shopkeeper: null });
    repo.location.x = repo.location.y = 0;
    repo.shopkeeper = null;

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
    for (mtmp = next_shkp(mons[0] ?? null, false); mtmp;
         mtmp = next_shkp(mtmp2, false)) {
        mtmp2 = mons[mons.indexOf(mtmp) + 1] ?? null;
        eshkp = ESHK(mtmp);
        local = on_level(eshkp.shoplevel, game.u.uz);
        if (local && (game.u.ushops || '').includes(String.fromCharCode(eshkp.shoproom))) {
            /* inside this shk's shop [there might be more than one
               resident shk if hero is standing in a breech of a shared
               wall, so give priority to one who's also owed money] */
            if (!resident || eshkp.billct || eshkp.debit || eshkp.robbed)
                resident = mtmp;
        } else if (eshkp.billct || eshkp.debit || eshkp.robbed) {
            /* owe this shopkeeper money (might also owe others) */
            if (!creditor)
                creditor = mtmp;
        } else if (eshkp.following || !mtmp.mpeaceful /* ANGRY(mtmp) */) {
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
    for (mtmp = next_shkp(mons[0] ?? null, false); mtmp;
         mtmp = next_shkp(mtmp2, false)) {
        mtmp2 = mons[mons.indexOf(mtmp) + 1] ?? null;
        eshkp = ESHK(mtmp);
        local = on_level(eshkp.shoplevel, game.u.uz);
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

// src/shk.c:2577 inherits() — decide whether a shopkeeper will take
// possession of dying hero's invent; when this returns True, it should
// call set_repo_loc() before returning. The C's "goto skip" lands inside
// the antagonistic-keeper block (rouse and send home); "goto clear" skips
// that block: the two flags below keep those jumps.
async function inherits(shkp, numsk, croaked, silently) {
    let loss = 0;
    let umoney;
    const eshkp = ESHK(shkp);
    let take = false, taken = false;
    const uinshop = (game.u.ushops || '').includes(String.fromCharCode(eshkp.shoproom));
    let takes;
    let skip = false;

    /* not strictly consistent; affects messages and prevents next player
       (if bones are saved) from blundering into or being ambushed by an
       invisible shopkeeper */
    shkp.minvis = shkp.perminvis = 0;

    /* The simplifying principle is that first-come
       already took everything you had. */
    if (numsk > 1) {
        if (cansee(shkp.mx, shkp.my) && croaked && !silently) {
            takes = '';
            if (has_head(shkp.data) && !rn2(2))
                takes = `, shakes ${noit_mhis(shkp)} ${mbodypart(shkp, HEAD)},`;
            await pline(`${Shknam(shkp)} ${helpless(shkp) ? 'wakes up, ' : ''
                }looks at your corpse${takes} and ${
                !inhishop(shkp) ? 'disappears' : 'sighs'}.`);
        }
        taken = uinshop;
        skip = true;
    } else if (uinshop && inhishop(shkp) && !eshkp.billct
               && !eshkp.robbed && !eshkp.debit && shkp.mpeaceful /* NOTANGRY */
               && !eshkp.following && game.u.ugrave_arise < LOW_PM) {
        /* get one case out of the way: you die in the shop, the
           shopkeeper is peaceful, nothing stolen, nothing owed */
        taken = (game.invent || []).length !== 0;
        if (taken && !silently)
            await pline(`${Shknam(shkp)} gratefully inherits all your possessions.`);
        /* goto clear */
    } else {
        if (eshkp.billct || eshkp.debit || eshkp.robbed) {
            if (uinshop && inhishop(shkp))
                loss = addupbill(shkp) + (eshkp.debit | 0);
            if (loss < (eshkp.robbed | 0))
                loss = eshkp.robbed | 0;
            take = true;
        }

        if (eshkp.following || !shkp.mpeaceful /* ANGRY(shkp) */ || take) {
            skip = true;
            if ((game.invent || []).length) {
                umoney = money_cnt(game.invent);
                takes = '';
                if (helpless(shkp))
                    takes += 'wakes up and ';
                if (!m_next2u(shkp))
                    takes += 'comes and ';
                takes += 'takes';

                if (loss > umoney || !loss || uinshop) {
                    eshkp.robbed = (eshkp.robbed | 0) - umoney;
                    if (eshkp.robbed < 0)
                        eshkp.robbed = 0;
                    if (umoney > 0) {
                        await money2mon(shkp, umoney);
                        (game.disp ||= {}).botl = true;
                    }
                    if (!silently)
                        await pline(`${Shknam(shkp)} ${takes} all your possessions.`);
                    taken = true;
                } else {
                    await money2mon(shkp, loss);
                    (game.disp ||= {}).botl = true;
                    if (!silently)
                        await pline(`${Shknam(shkp)} ${takes} the ${loss} ${
                            currency(loss)} ${
                            (eshkp.customer || '').slice(0, PL_NSIZ)
                                !== (game.plname || '').slice(0, PL_NSIZ) ? ''
                              : 'you '}owed ${noit_mhim(shkp)}.`);
                    /* shopkeeper has now been paid in full */
                    pacify_shk(shkp, false);
                    eshkp.following = 0;
                    eshkp.robbed = 0;
                }
            }
        }
    }
    if (skip) {
        /* in case we create bones */
        await rouse_shk(shkp, false); /* wake up */
        if (!inhishop(shkp))
            await home_shk(shkp, false);
    }
 /* clear: */
    setpaid(shkp); /* clear this shk's bill */
    /* where to put player's invent (after disclosure) */
    if (taken)
        set_repo_loc(shkp);
    return taken;
}

// src/shk.c:2688 set_repo_loc()
function set_repo_loc(shkp) {
    let ox, oy;
    const eshkp = ESHK(shkp);
    const repo = (game.repo ||= { location: { x: 0, y: 0 }, shopkeeper: null });

    /* when multiple shopkeepers are present, we might get called more
       than once; don't override previous setting */
    if (repo.shopkeeper)
        return;

    /* savebones() sets u.ux,u.uy to 0,0 to remove hero from map but that
       takes place after finish_paybill() has been called so we expect
       u.ux,u.uy to be valid; however, there has been a report of
       impossible "place_object: \"<item>\" off map <0,0>" when hero died
       in a gap in a shop's wall (in Minetown, so multiple shopkeepers in
       play, and prior to adding 'if (gr.repo.shopkeeper) return' above) */
    ox = game.u.ux ? game.u.ux : game.u.ux0;
    oy = game.u.ux ? game.u.uy : game.u.uy0; /* [testing u.ux when setting oy is correct] */

    /* if you're not in this shk's shop room, or if you're in its doorway
       or entry spot or one of its walls (temporary gap or Passes_walls),
       then your gear gets dumped all the way inside */
    if (!(game.u.ushops || '').includes(String.fromCharCode(eshkp.shoproom))
        || costly_adjacent(shkp, ox, oy)) {
        /* shk.x,shk.y is the position immediately in front of the door;
           move in one more space */
        ox = eshkp.shk.x;
        oy = eshkp.shk.y;
        ox += sgn(ox - eshkp.shd.x);
        oy += sgn(oy - eshkp.shd.y);
    } else {
        ; /* already inside this shk's shop so use ox,oy as-is */
    }
    /* finish_paybill will deposit invent here */
    repo.location.x = ox;
    repo.location.y = oy;
    repo.shopkeeper = shkp;
}

// src/shk.c:2723 finish_paybill() — called at game exit, after inventory
// disclosure but before making bones; shouldn't issue any messages.
export async function finish_paybill() {
    const repo = (game.repo ||= { location: { x: 0, y: 0 }, shopkeeper: null });
    const shkp = repo.shopkeeper;
    let ox = repo.location.x, oy = repo.location.y;

    /*
     * If set_repo_loc() didn't get called for some reason (good luck
     * untangling inherits() to figure out why...), ox,oy will be 0,0
     * and shkp will be Null.  Fix coordinates if that happens.
     */
    if (!isok(ox, oy)) {
        /* this used to be suppressed as "don't bother" (too late to matter)
           but that led to "place_object: \"<item>\" off map <0,0>" warning */
        if (shkp)
            impossible(`finish_paybill: bad location <${ox},${oy}>.`);
        /* force a valid location */
        ox = game.u.ux ? game.u.ux : game.u.ux0;
        oy = game.u.ux ? game.u.uy : game.u.uy0; /* [note: testing u.ux when setting oy
                                                  *  is correct here]*/
    }
    /* normally done by savebones(), but that's too late in this case */
    unleash_all();
    /* if hero has any gold left, take it into shopkeeper's possession */
    if (shkp) {
        const umoney = money_cnt(game.invent || []);

        if (umoney)
            await money2mon(shkp, umoney);
    }
    /* transfer rest of the character's inventory to the shop floor */
    await drop_upon_death(null, null, ox, oy);
}

// src/shk.c:2759 bp_to_obj()
function bp_to_obj(bp) {
    return bp.useup ? o_on(bp.bo_id, game.billobjs) : find_oid(bp.bo_id);
}

// src/shk.c:3198 gem_learned(); reprice matching gem stacks on active bills.
export function gem_learned(oindx) {
    const monsters = game.level?.monsters || [];
    for (let shkp = next_shkp(monsters[0] ?? null, true); shkp;
         shkp = next_shkp(monsters[monsters.indexOf(shkp) + 1] ?? null, true)) {
        const eshk = shkp.eshk || ESHK(shkp);
        let index = 0;
        for (let ct = eshk.billct; --ct >= 0;) {
            const bp = eshk.bill_p[index];
            const obj = find_oid(bp.bo_id);
            if (!obj)
                continue; // C also leaves bp unchanged for a missing object.
            if (oindx !== ONAMES.STRANGE_OBJECT ? obj.otyp === oindx
                : obj.oclass === OCLASSES.GEM_CLASS)
                bp.price = get_cost(obj, shkp);
            index++;
        }
    }
}

// src/shk.c:3237 alter_cost() — an unpaid object was changed (enchanted,
// eroded, ...); re-price it on the bill, never lowering the price unless
// amt is negative.
export function alter_cost(obj, amt) {
    let bp = null;

    for (let shkp = next_shkp(game.level?.monsters?.[0] ?? null, true); shkp;
         shkp = next_shkp(game.level?.monsters?.[game.level.monsters.indexOf(shkp) + 1] ?? null, true)) {
        if ((bp = onbill(obj, shkp, true)) != null) {
            const new_price = !amt ? get_cost(obj, shkp) : (amt < 0) ? -amt : amt;
            if (new_price > bp.price || amt < 0) {
                bp.price = new_price;
                update_inventory();
            }
            break; /* done */
        }
    }
}

// src/shk.c:3260 unpaid_cost()
export async function unpaid_cost(unp_obj, cost_type) {
    let bp = null, shkp = null, amt = 0;
    for (const shop of game.u.ushops || '') {
        shkp = shop_keeper(shop.charCodeAt(0));
        if (shkp) {
            bp = onbill(unp_obj, shkp, true);
            if (bp) {
                amt = bp.price;
                if (cost_type !== COST_SINGLEOBJ)
                    amt *= unp_obj.quan;
            }
            if (cost_type === COST_CONTENTS && Has_contents(unp_obj))
                amt = contained_cost(unp_obj, shkp, amt, false, true);
            if (bp || (!unp_obj.unpaid && amt))
                break;
        }
    }
    if (!shkp || (unp_obj.unpaid && !bp))
        await impossible("unpaid_cost: object wasn't on any bill.");
    return amt;
}

// src/shk.c:439 record_price_quote()
export function record_price_quote(otyp, price, buyprice) {
    const oc = game.objects?.[otyp];
    if (!oc)
        return;
    const min = buyprice ? 'oc_buy_minseen' : 'oc_sell_minseen';
    const max = buyprice ? 'oc_buy_maxseen' : 'oc_sell_maxseen';
    if (price > (oc[max] ?? 0))
        oc[max] = price;
    if ((oc[min] ?? -1) < 0 || price < oc[min])
        oc[min] = price;
}

// src/shk.c:56 IS_SHOP() — local macro: room rtype is a shop type.
// block_door()/block_entry() pass the roomno with ROOMOFFSET still added,
// unlike most callers which subtract it first — a C quirk kept as-is: the
// off-by-ROOMOFFSET slot is usually past nroom, whose rtype reads as
// ordinary, so these functions almost always see IS_SHOP() false.
function IS_SHOP(roomidx) {
    const r = (game.level?.rooms || [])[roomidx]
        || (game.level?.subrooms || [])
            .find(room => room.roomnoidx === roomidx);
    return !!r && r.rtype >= SHOPBASE;
}

// src/shk.c:568 inside_shop(), unlike in_rooms(), this excludes the room's
// boundary squares. Shop goods on the shopkeeper's own post are also free.
export function inside_shop(x, y) {
    const loc = game.level?.at(x, y);
    const rno = loc?.roomno ?? NO_ROOM;
    if (rno < ROOMOFFSET || loc.edge || !IS_SHOP(rno - ROOMOFFSET))
        return NO_ROOM;
    return rno;
}

// src/shk.c:1052 shop_keeper(), rooms keep their resident directly.
export function shop_keeper(roomno) {
    if (roomno < ROOMOFFSET)
        return null;
    const roomidx = roomno - ROOMOFFSET;
    const room = game.level?.rooms?.[roomidx]
        || (game.level?.subrooms || [])
            .find(candidate => candidate.roomnoidx === roomidx);
    const shkp = room?.resident || null;
    if (!shkp || !(shkp.eshk || ESHK(shkp)))
        return null;
    if (!shkp.mpeaceful && !(shkp.eshk || ESHK(shkp)).surcharge)
        rile_shk(shkp);
    return shkp;
}

// src/shk.c:1084 find_objowner()
export function find_objowner(obj, x, y) {
    let shkp, deflt_shkp = null;

    if (obj.where === OBJ_ONBILL) {
        /* used up item; bill obj coordinates are useless and so are x,y */
        const mons = game.level?.monsters || [];
        for (shkp = next_shkp(mons[0] ?? null, true); shkp;
             shkp = next_shkp(mons[mons.indexOf(shkp) + 1] ?? null, true))
            if (onshopbill(obj, shkp, true))
                return shkp;
    } else {
        const where = in_rooms(x, y, SHOPBASE) || '';

        /* conceptually object could be inside up to 4 rooms simultaneously;
           in practice it will usually be one room but can sometimes be two;
           check shk and bill for each room rather than just the first;
           fallback to the first shk if obj isn't on the relevant bill(s) */
        for (const roomindx of where)
            if ((shkp = shop_keeper(roomindx.charCodeAt(0))) != null) {
                if (onshopbill(obj, shkp, true))
                    return shkp;
                if (!deflt_shkp)
                    deflt_shkp = shkp;
            }
    }
    return deflt_shkp;
}

// src/shk.c:1160 onshopbill()
export function onshopbill(obj, shkp, silent) {
    return onbill(obj, shkp, silent) ? true : false;
}

// src/shk.c:1167 is_unpaid()
export function is_unpaid(obj) {
    return (obj.unpaid
            || (Has_contents(obj) && count_unpaid(obj.cobj))) ? true : false;
}

// src/shk.c:723 deserted_shop(): report an absent shopkeeper, distinguishing
// a genuinely empty shop from one containing seen or unseen monsters.
async function deserted_shop(enterstring) {
    const roomno = enterstring.charCodeAt(0) - ROOMOFFSET;
    const room = game.level?.rooms?.[roomno];
    if (!room)
        return;

    let seen = 0, total = 0;
    for (let x = room.lx; x <= room.hx; ++x) {
        for (let y = room.ly; y <= room.hy; ++y) {
            if (x === game.u.ux && y === game.u.uy)
                continue;
            const mon = m_at(x, y);
            if (!mon)
                continue;
            ++total;
            const appearance = M_AP_TYPE(mon);
            if (sensemon(mon)
                || ((appearance === M_AP_NOTHING
                     || appearance === M_AP_MONSTER)
                    && canseemon(mon)))
                ++seen;
        }
    }

    const blindTelepat = !!(game.u.intrinsic?.HTelepat
                             || game.u.uprops?.TELEPAT);
    if (Blind() && !(blindTelepat || Detect_monsters()))
        ++total;
    await pline(`This shop ${seen < total ? 'seems to be' : 'is'} ${
        !total ? 'deserted' : 'untended'}.`);
}

// src/shk.c:751 u_entered_shop(), including tended and untended entry.
export async function u_entered_shop(enterstring) {
    if (!enterstring)
        return;

    const roomno = enterstring.charCodeAt(0);
    const shkp = shop_keeper(roomno);
    const emptyShops = game._empty_shops || '';
    if (!shkp) {
        if (!emptyShops.includes(enterstring[0])
            && in_rooms(game.u.ux, game.u.uy, SHOPBASE)
               !== in_rooms(game.u.ux0, game.u.uy0, SHOPBASE))
            await deserted_shop(enterstring);
        game._empty_shops = game.u.ushops || '';
        game.u.ushops = '';
        return;
    }
    if (!inhishop(shkp)) {
        if (!emptyShops.includes(enterstring[0]))
            await deserted_shop(enterstring);
        game._empty_shops = game.u.ushops || '';
        game.u.ushops = '';
        return;
    }

    const { ACH_SHOP, record_achievement } = await import('./insight.js');
    record_achievement(ACH_SHOP);

    const eshk = shkp.eshk || ESHK(shkp);
    if (!Array.isArray(eshk.bill_p))
        eshk.bill_p = [];
    const customer = eshk.customer || '';
    if ((!(eshk.visitct | 0) || customer)
        && customer.toLowerCase() !== (game.plname || '').toLowerCase()) {
        eshk.visitct = 0;
        eshk.following = 0;
        eshk.customer = game.plname || '';
        shkp.mpeaceful = 1;
        if (eshk.surcharge) {
            eshk.surcharge = false;
            for (const bp of eshk.bill_p)
                bp.price -= Math.trunc((bp.price + 3) / 4);
        }
    }

    if (muteshk(shkp) || eshk.following)
        return;
    if (Invis()) {
        await pline(`${shopkeeper_name(shkp)} senses your presence.`);
        if (!Deaf() && !muteshk(shkp)) {
            await pline('"Invisible customers are not welcome!"');
        } else {
            const pronoun = shkp.female ? 'she' : 'he';
            await pline(`${shopkeeper_name(shkp)} stands firm as if ${
                pronoun} knows you are there.`);
        }
        return;
    }
    const roomidx = roomno - ROOMOFFSET;
    const room = game.level?.rooms?.[roomidx]
        || (game.level?.subrooms || [])
            .find(candidate => candidate.roomnoidx === roomidx);
    const rt = room?.rtype ?? SHOPBASE;
    const shopname = shtypes[rt - SHOPBASE]?.name || 'shop';

    if (!shkp.mpeaceful) { /* ANGRY(shkp) */
        if (!Deaf() && !muteshk(shkp)) {
            await verbalize(`So, ${game.plname}, you dare return to ${
                s_suffix(shopkeeper_name(shkp))} ${shopname}?!`);
        } else {
            await pline(`${shopkeeper_name(shkp)} seems ${
                angrytexts[rn2(angrytexts.length)]} over your return to ${
                noit_mhis(shkp)} ${shopname}!`);
        }
    } else if (eshk.surcharge) {
        if (!Deaf() && !muteshk(shkp)) {
            await verbalize(`Back again, ${game.plname}?  I've got my ${
                mbodypart(shkp, EYE)} on you.`);
        } else {
            await pline_The(`atmosphere at ${s_suffix(shopkeeper_name(shkp))} ${
                shopname} seems unwelcoming.`);
        }
    } else if (eshk.robbed) {
        if (!Deaf()) {
            /* Soundeffect(se_mutter_imprecations, 50); */
            await pline(`${shopkeeper_name(shkp)} mutters imprecations against shoplifters.`);
        } else {
            await pline(`${shopkeeper_name(shkp)} is combing through ${
                noit_mhis(shkp)} inventory list.`);
        }
    } else {
        const again = (eshk.visitct | 0) ? ' again' : ''; /* eshkp->visitct++ */
        eshk.visitct = (eshk.visitct | 0) + 1;
        if (!Deaf() && !muteshk(shkp)) {
            await verbalize(`${Hello(shkp)}, ${game.plname}!  Welcome${again} to ${
                s_suffix(shopkeeper_name(shkp))} ${shopname}!`);
        } else {
            await You(`enter ${s_suffix(shopkeeper_name(shkp))} ${shopname}${again}!`);
        }
    }
    /* can't do anything about blocking if teleported in */
    if (!inside_shop(game.u.ux, game.u.uy)) {
        let should_block;
        const not_upset = !eshk.surcharge;
        let cnt;
        let tool;
        const pick = carrying(ONAMES.PICK_AXE),
              mattock = carrying(ONAMES.DWARVISH_MATTOCK);

        if (pick || mattock) {
            cnt = 1;               /* so far */
            if (pick && mattock) { /* carrying both types */
                tool = 'digging tool';
                cnt = 2; /* `more than 1' is all that matters */
            } else if (pick) {
                tool = 'pick-axe';
                /* hack: `pick' already points somewhere into inventory */
                cnt = (game.invent || []).filter(o => o.otyp === ONAMES.PICK_AXE).length;
            } else { /* assert(mattock != 0) */
                tool = 'mattock';
                cnt = (game.invent || []).filter(o => o.otyp === ONAMES.DWARVISH_MATTOCK).length;
                /* [ALI] Shopkeeper identifies mattock(s) */
                if (!Blind())
                    makeknown(ONAMES.DWARVISH_MATTOCK);
            }
            if (!Deaf() && !muteshk(shkp)) {
                await verbalize(not_upset
                                ? `Will you please leave your ${tool}${plur(cnt)} outside?`
                                : `Leave the ${tool}${plur(cnt)} outside.`);
            } else {
                await pline(`${shopkeeper_name(shkp)} ${
                    not_upset ? 'is hesitant' : 'refuses'} to let you in with your ${
                    tool}${plur(cnt)}.`);
            }
            should_block = true;
        } else if (game.u.usteed) {
            if (!Deaf() && !muteshk(shkp)) {
                await verbalize(not_upset ? `Will you please leave ${y_monnam(game.u.usteed)} outside?`
                                          : `Leave ${y_monnam(game.u.usteed)} outside.`);
            } else {
                await pline(`${shopkeeper_name(shkp)} ${
                    not_upset ? "doesn't want" : 'refuses'} to let you in while you're riding ${
                    y_monnam(game.u.usteed)}.`);
            }
            should_block = true;
        } else {
            should_block =
                !!(Fast() && (sobj_at(ONAMES.PICK_AXE, game.u.ux, game.u.uy)
                              || sobj_at(ONAMES.DWARVISH_MATTOCK, game.u.ux, game.u.uy)));
        }
        if (should_block)
            await dochug(shkp); /* shk gets extra move */
    }
}

// src/shk.c:5350 costly_spot(), is (x,y) a square this shopkeeper charges
// for? The keeper must still be in her shop, and her normal post is exempt.
export function costly_spot(x, y) {
    if (!game.level?.flags?.has_shop)
        return false;

    const rooms = in_rooms(x, y, SHOPBASE);
    const shkp = shop_keeper(rooms ? rooms.charCodeAt(0) : NO_ROOM);
    if (!shkp || !inhishop(shkp))
        return false;
    const eshk = shkp.eshk || ESHK(shkp);
    return !!inside_shop(x, y)
        && !(x === eshk.shk.x && y === eshk.shk.y);
}

function add_up_bill(shkp) {
    const eshk = shkp.eshk || ESHK(shkp);
    return (eshk.bill_p || []).reduce(
        (total, bp) => total + bp.price * bp.bquan, 0);
}

// src/shk.c:319 clear_unpaid()
function clear_unpaid(shkp, list) {
    for (const obj of list || [])
        clear_unpaid_obj(shkp, obj);
}

// src/shk.c:309 clear_unpaid_obj()
export function clear_unpaid_obj(shkp, otmp) {
    if (Has_contents(otmp))
        clear_unpaid(shkp, otmp.cobj);
    if (onbill(otmp, shkp, true))
        otmp.unpaid = 0;
}

// src/shk.c:329 clear_no_charge_obj()
function clear_no_charge_obj(shkp, otmp) {
    if (Has_contents(otmp))
        clear_no_charge(shkp, otmp.cobj);
    if (otmp.no_charge) {
        let rm_shkp;
        let rno;
        const cc = { x: 0, y: 0 };

        /*
         * Clear no_charge if
         *  shkp is Null (clear all items on specified list)
         *  or not located somewhere that we expect no_charge (which is
         *    floor [of shop] or inside container [on shop floor])
         *  or can't find object's map coordinates (should never happen
         *    for floor or contained; conceivable if on shop bill somehow
         *    but would have failed the floor-or-contained test since
         *    containers get emptied before going onto bill)
         *  or fails location sanity check (should always be good when
         *    location successfully found)
         *  or not inside any room
         *  or the room isn't a shop
         *  or the shop has no shopkeeper (deserted)
         *  or shopkeeper is the current one (to avoid clearing no_charge
         *    for items located in some rival's shop).
         *
         * no_charge items in a shop which is only temporarily deserted
         * become owned by the shop now and will be for-sale once the shk
         * returns.
         */
        if (!shkp
            || (otmp.where !== OBJ_FLOOR
                && otmp.where !== OBJ_CONTAINED
                && otmp.where !== OBJ_BURIED)
            /* C passes the OBJ_* location values as CONTAINED_TOO|BURIED_TOO
               flag bits; the port keeps that quirk */
            || !get_obj_location(otmp, cc, OBJ_CONTAINED | OBJ_BURIED)
            || !isok(cc.x, cc.y)
            || (rno = game.level.at(cc.x, cc.y).roomno) < ROOMOFFSET
            || !IS_SHOP(rno - ROOMOFFSET)
            || (rm_shkp = (game.level?.rooms?.[rno - ROOMOFFSET]
                           || (game.level?.subrooms || [])
                               .find(r => r.roomnoidx === rno - ROOMOFFSET))
                          ?.resident) == null
            || rm_shkp === shkp)
            otmp.no_charge = 0;
    }
}

// src/shk.c:377 clear_no_charge()
function clear_no_charge(shkp, list) {
    for (const otmp of list || [])
        /* handle first element of list and any contents it may have */
        clear_no_charge_obj(shkp, otmp);
}

// src/shk.c:389 clear_no_charge_pets()
function clear_no_charge_pets(shkp) {
    for (const mtmp of game.level?.monsters || [])
        if (mtmp.mtame && mtmp.minvent)
            clear_no_charge(shkp, mtmp.minvent);
}

// src/shk.c:400 setpaid()
function setpaid(shkp) {
    clear_unpaid(shkp, game.invent);
    clear_unpaid(shkp, game.level?.objects);
    if (game.level?.buriedobjs)
        clear_unpaid(shkp, game.level.buriedobjs);
    if (game.thrownobj)
        clear_unpaid_obj(shkp, game.thrownobj);
    if (game.kickedobj)
        clear_unpaid_obj(shkp, game.kickedobj);
    for (const mtmp of game.level?.monsters || [])
        if (mtmp.minvent)
            clear_unpaid(shkp, mtmp.minvent);
    for (const mtmp of game.migrating_mons || [])
        if (mtmp.minvent)
            clear_unpaid(shkp, mtmp.minvent);

    /* clear obj->no_charge for all obj in shkp's shop */
    clear_no_charge(shkp, game.level?.objects);
    clear_no_charge(shkp, game.level?.buriedobjs);

    const eshk = shkp.eshk || ESHK(shkp);
    eshk.bill_p = [];
    eshk.billct = 0;
    eshk.credit = 0;
    eshk.debit = 0;
    eshk.loan = 0;
}

// src/shk.c:1278 check_credit()
async function check_credit(tmp, shkp) {
    const credit = ESHK(shkp).credit;

    if (credit === 0) {
        ; /* nothing to do; just 'return tmp;' */
    } else if (credit >= tmp) {
        await pline_The('price is deducted from your credit.');
        ESHK(shkp).credit -= tmp;
        tmp = 0;
    } else {
        await pline_The('price is partially covered by your credit.');
        ESHK(shkp).credit = 0;
        tmp -= credit;
    }
    return tmp;
}

// src/shk.c:1470 make_angry_shk(). Pending transactions become robbery
// before the keeper starts pursuing the customer.
export async function make_angry_shk(shkp, ox, oy) {
    const eshk = shkp.eshk || ESHK(shkp);
    if (eshk.billct || eshk.debit || eshk.loan || eshk.credit) {
        eshk.robbed = (eshk.robbed || 0) + add_up_bill(shkp)
            + (eshk.debit || 0) + (eshk.loan || 0) - (eshk.credit || 0);
        eshk.robbed = Math.max(0, eshk.robbed);
        setpaid(shkp);
    }
    await pline(`${shopkeeper_name(shkp)} ${shkp.mpeaceful
        ? 'gets angry' : 'is furious'}!`);
    hot_pursuit(shkp);
}

// src/shk.c:235 shkgone(): remove a dead shopkeeper's room residency and
// stop treating the former stock as shop-owned merchandise.
export function shkgone(shkp) {
    const eshk = shkp.eshk || ESHK(shkp);
    const roomno = (eshk?.shoproom ?? NO_ROOM) - ROOMOFFSET;
    const room = game.level?.rooms?.[roomno];
    if (!eshk || !room)
        return;
    if (eshk.shoplevel
        && (eshk.shoplevel.dnum !== game.u.uz.dnum
            || eshk.shoplevel.dlevel !== game.u.uz.dlevel))
        return;

    room.resident = null;
    for (const obj of game.level?.objects || []) {
        if (obj.ox >= room.lx && obj.ox <= room.hx
            && obj.oy >= room.ly && obj.oy <= room.hy)
            obj.no_charge = 0;
    }

    const roomchar = String.fromCharCode(eshk.shoproom);
    if ((game.u.ushops || '').includes(roomchar)) {
        setpaid(shkp);
        game.u.ushops = [...game.u.ushops]
            .filter(ch => ch !== roomchar).join('');
    }
}

async function makekops(origin) {
    const [{ depth }, { enexto }, { makemon, MM_NOMSG }] = await Promise.all([
        import('./dungeon.js'), import('./teleport.js'), import('./makemon.js'),
    ]);
    const count = Math.abs(depth(game.u.uz)) + rnd(5);
    const counts = [count, Math.trunc(count / 3) + 1,
                    Math.trunc(count / 6), Math.trunc(count / 9)];
    const types = [PMNAMES.PM_KEYSTONE_KOP, PMNAMES.PM_KOP_SERGEANT,
                   PMNAMES.PM_KOP_LIEUTENANT, PMNAMES.PM_KOP_KAPTAIN];
    const spot = { x: origin.x, y: origin.y };

    for (let k = 0; k < types.length; ++k) {
        if (!counts[k])
            break;
        const mndx = types[k];
        if ((game.mvitals?.[mndx]?.mvflags || 0) & G_GONE)
            continue;
        for (let left = counts[k]; left > 0; --left) {
            if (enexto(spot, spot.x, spot.y, game.mons[mndx])) {
                await makemon(game.mons[mndx], spot.x, spot.y, MM_NOMSG);
            }
        }
    }
}

async function call_kops(shkp, nearshop) {
    await pline('An alarm sounds!');
    const types = [PMNAMES.PM_KEYSTONE_KOP, PMNAMES.PM_KOP_SERGEANT,
                   PMNAMES.PM_KOP_LIEUTENANT, PMNAMES.PM_KOP_KAPTAIN];
    if (types.every(mndx =>
        ((game.mvitals?.[mndx]?.mvflags || 0) & G_GONE))) {
        if (game.flags?.verbose !== false)
            await pline('But no one seems to respond to it.');
        return;
    }

    if (nearshop) {
        if (game.flags?.verbose !== false)
            await pline('The Keystone Kops appear!');
        await makekops({ x: game.u.ux, y: game.u.uy });
        return;
    }

    if (game.flags?.verbose !== false)
        await pline('The Keystone Kops are after you!');
    const { choose_stairs } = await import('./wizard.js');
    const stairs = { sx: 0, sy: 0 };
    choose_stairs(stairs, true);
    if (isok(stairs.sx, stairs.sy))
        await makekops({ x: stairs.sx, y: stairs.sy });
    await makekops({ x: shkp.mx, y: shkp.my });
}

async function rob_shop(shkp) {
    const eshk = shkp.eshk || ESHK(shkp);
    let total = add_up_bill(shkp) + (eshk.debit || 0);
    if ((eshk.credit || 0) >= total) {
        await pline(`Your credit of ${eshk.credit} ${currency(eshk.credit)} is used to cover your shopping bill.`);
        total = 0;
    } else {
        await pline('You escaped the shop without paying!');
        total -= eshk.credit || 0;
    }
    setpaid(shkp);
    if (!total)
        return false;

    eshk.robbed = (eshk.robbed || 0) + total;
    await pline(`You stole ${total} ${currency(total)} worth of merchandise.`);
    if (game.urole?.mnum !== PMNAMES.PM_ROGUE)
        adjalign(-Math.sign(game.u.ualign?.type || 0));
    hot_pursuit(shkp);
    return true;
}

// src/shk.c:722 remote_burglary() — the hero picked something up from a
// shop's floor without being in the shop (telekinesis, a grappling hook)
export async function remote_burglary(x, y) {
    const shkp = shop_keeper((in_rooms(x, y, SHOPBASE) || '\0').charCodeAt(0));
    if (!shkp || !inhishop(shkp))
        return; /* shk died, teleported, changed levels... */

    const eshkp = ESHK(shkp);
    if (!eshkp.billct && !eshkp.debit) /* bill is settled */
        return;

    if (await rob_shop(shkp)) {
        await call_kops(shkp, false);
    }
}

// src/shk.c u_left_shop(), including credit settlement and the Kops alarm.
export async function u_left_shop(leavestring, newlev) {
    const u = game.u;
    if (!leavestring
        && (!game.level?.at(u.ux, u.uy)?.edge
            || game.level?.at(u.ux0, u.uy0)?.edge))
        return;

    const roomno = (leavestring || u.ushops0 || '').charCodeAt(0);
    const shkp = shop_keeper(roomno);
    if (!shkp || !inhishop(shkp))
        return;
    const eshk = shkp.eshk || ESHK(shkp);
    if (!eshk.billct && !eshk.debit)
        return;

    if (!leavestring && !muteshk(shkp)) {
        const warning = eshk.surcharge
            ? `${game.plname}!  Don't you leave without paying!`
            : `${game.plname}!  Please pay before leaving.`;
        await pline(`"${warning}"`);
        return;
    }

    if (await rob_shop(shkp))
        await call_kops(shkp, !newlev && !!game.level?.at(u.ux0, u.uy0)?.edge);
}

// src/shk.c:2846 get_pricing_units(). Ordinary stacks price by quantity;
// globs price by their current weight.
export function get_pricing_units(obj) {
    let units = obj.quan || 1;
    if (obj.globby) {
        const unitWeight = game.objects[obj.otyp]?.oc_weight || 0;
        const currentWeight = obj.owt > 0 ? obj.owt : weight(obj);
        if (unitWeight)
            units = Math.trunc((currentWeight + unitWeight - 1) / unitWeight);
    }
    return units;
}

// src/shk.c:2995 contained_cost(), purchase side. A floor container's
// player-owned contents are marked no_charge; every other non-coin object is
// shop stock and contributes its full stack price.
function contained_purchase_cost(obj, shkp) {
    let price = 0;
    for (const contained of obj.cobj || []) {
        if (contained.oclass !== OCLASSES.COIN_CLASS
            && !contained.no_charge) {
            price += get_cost(contained, shkp)
                   * get_pricing_units(contained);
        }
        if (Has_contents(contained))
            price += contained_purchase_cost(contained, shkp);
    }
    return price;
}

// src/shk.c:2809 get_cost_of_shop_item(), including floor containers.
function get_cost_of_shop_item(obj) {
    let nocharge = -1;
    let top = obj;
    while (top.where === OBJ_CONTAINED && top.ocontainer)
        top = top.ocontainer;
    const x = top.ox, y = top.oy;
    const shop = in_rooms(x, y, SHOPBASE);
    if (!(game.u.ushops || '') || obj.oclass === OCLASSES.COIN_CLASS
        || !shop || shop[0] !== game.u.ushops[0])
        return { price: 0, nocharge };

    const shkp = shop_keeper(inside_shop(x, y));
    if (!shkp || !inhishop(shkp))
        return { price: 0, nocharge };
    const eshk = shkp.eshk || ESHK(shkp);
    const onfloor = top.where === undefined || top.where === 1;
    const freespot = onfloor && x === eshk.shk.x && y === eshk.shk.y;
    nocharge = onfloor && (!!obj.no_charge || freespot) ? 1 : 0;
    let price = nocharge ? 0 : get_cost(obj, shkp) * get_pricing_units(obj);
    if (Has_contents(obj) && !freespot)
        price += contained_purchase_cost(obj, shkp);
    return { price, nocharge };
}

// src/objnam.c:1761 doname_with_price(), ordinary floor-object arm.
export function doname_with_price(obj) {
    let result = doname(obj);
    if (obj.unpaid)
        return result;

    const { price, nocharge } = get_cost_of_shop_item(obj);
    if (price > 0) {
        result += ` (${nocharge ? 'contents' : 'for sale'}, ${price} ${currency(price)})`;
        record_price_quote(obj.otyp, Math.trunc(price / (obj.quan || 1)), true);
    } else if (nocharge > 0) {
        result += ' (no charge)';
    }
    return result;
}

// src/shk.c:4275 corpsenm_price_adj(), the species premium for tins, eggs,
// and corpses. Each conveyable intrinsic has its own fixed weight.
function corpsenm_price_adj(obj) {
    if (obj.otyp !== ONAMES.TIN && obj.otyp !== ONAMES.EGG
        && obj.otyp !== ONAMES.CORPSE)
        return 0;
    const ptr = game.mons[obj.corpsenm];
    if (!ptr)
        return 0;

    const conveyance_costs = [
        [0x01, 2], [0x04, 3], [0x02, 2], [0x08, 5],
        [0x10, 4], [0x20, 2], [0x40, 1], [0x80, 3],
    ];
    let multiplier = 1;
    for (const [mask, cost] of conveyance_costs)
        if (ptr.mconveys & mask)
            multiplier += cost;
    if (ptr.mflags1 & MFLAGS.M1_TPORT)
        multiplier += 2;
    if (ptr.mflags1 & MFLAGS.M1_TPORT_CNTRL)
        multiplier += 3;
    if (ptr === game.mons[PMNAMES.PM_FLOATING_EYE]
        || ptr === game.mons[PMNAMES.PM_MIND_FLAYER]
        || ptr === game.mons[PMNAMES.PM_MASTER_MIND_FLAYER])
        multiplier += 5;
    if (ptr.geno & MFLAGS.G_UNIQ)
        multiplier += 50;

    let value = Math.max(1, (ptr.mlevel - 1) * 2);
    if (obj.otyp === ONAMES.CORPSE)
        value += Math.max(1, Math.trunc(ptr.cnutrit / 30));
    return value * multiplier;
}

// src/shk.c:4319 getprice(), base price before the buyer-specific charisma,
// knowledge, clothing, and anger adjustments below.
function getprice(obj, shk_buying = false) {
    let tmp = game.objects[obj.otyp]?.oc_cost ?? 0;

    if (obj.oartifact) {
        tmp = arti_cost(obj);
        if (shk_buying)
            tmp = Math.trunc(tmp / 4);
    }
    switch (obj.oclass) {
    case OCLASSES.FOOD_CLASS:
        tmp += corpsenm_price_adj(obj);
        if ((game.u.uhs ?? 0) >= HUNGRY && !shk_buying)
            tmp *= game.u.uhs;
        if (obj.oeaten)
            tmp = 0;
        break;
    case OCLASSES.WAND_CLASS:
        if (obj.spe === -1)
            tmp = 0;
        break;
    case OCLASSES.POTION_CLASS:
        if (obj.otyp === ONAMES.POT_WATER && !obj.blessed && !obj.cursed)
            tmp = 0;
        break;
    case OCLASSES.ARMOR_CLASS:
    case OCLASSES.WEAPON_CLASS:
        if (obj.spe > 0)
            tmp += 10 * obj.spe;
        break;
    case OCLASSES.TOOL_CLASS:
        if (Is_candle(obj)
            && (obj.age ?? 0) < 20 * (game.objects[obj.otyp]?.oc_cost ?? 0))
            tmp = Math.trunc(tmp / 2);
        break;
    }
    return tmp;
}

// src/shk.c:2864 oid_price_adjustment(); unidentified objects with id%4 == 0
// get a surcharge, except for glass gems whose price follows another rule.
export function oid_price_adjustment(obj, oid) {
    const otyp = obj.otyp;
    if (!(obj.dknown && game.objects[otyp].oc_name_known)
        && (obj.oclass !== OCLASSES.GEM_CLASS
            || game.objects[otyp].oc_material !== MATERIALS.GLASS))
        return oid % 4 === 0 ? 1 : 0;
    return 0;
}

// src/shk.c:2877 get_cost(), what the shopkeeper charges for one item.
export function get_cost(obj, shkp) {
    let tmp = getprice(obj);
    let multiplier = 1, divisor = 1;
    const ocl = game.objects[obj.otyp];

    if (!tmp)
        tmp = 5;
    if (!obj.dknown || !ocl.oc_name_known) {
        if (obj.oclass === OCLASSES.GEM_CLASS
            && ocl.oc_material === MATERIALS.GLASS) {
            const pairs = [
                [ONAMES.DIAMOND, ONAMES.OPAL],
                [ONAMES.SAPPHIRE, ONAMES.AQUAMARINE],
                [ONAMES.RUBY, ONAMES.JASPER],
                [ONAMES.AMBER, ONAMES.TOPAZ],
                [ONAMES.JACINTH, ONAMES.AGATE],
                [ONAMES.CITRINE, ONAMES.CHRYSOBERYL],
                [ONAMES.BLACK_OPAL, ONAMES.JET],
                [ONAMES.EMERALD, ONAMES.JADE],
                [ONAMES.AMETHYST, ONAMES.FLUORITE],
            ];
            const pair = pairs[obj.otyp - ONAMES.FIRST_GLASS_GEM];
            const dt = String(game.fixed_datetime || '');
            const birthday = dt.length === 14
                ? Date.UTC(Number(dt.slice(0, 4)), Number(dt.slice(4, 6)) - 1,
                           Number(dt.slice(6, 8)), Number(dt.slice(8, 10)),
                           Number(dt.slice(10, 12)), Number(dt.slice(12, 14)))
                    / 1000 + 4 * 60 * 60
                : 0;
            const pseudorand = ((birthday | 0) % obj.otyp)
                             >= Math.trunc(obj.otyp / 2);
            if (pair)
                tmp = game.objects[pair[pseudorand ? 0 : 1]].oc_cost;
        } else if ((obj.o_id % 4) === 0) {
            multiplier *= 4;
            divisor *= 3;
        }
    }

    const u = game.u;
    const tourist = game.urole?.mnum === PMNAMES.PM_TOURIST
                 || game.urole?.mnum === 'PM_TOURIST';
    if (u.uarmh?.otyp === ONAMES.DUNCE_CAP) {
        multiplier *= 4;
        divisor *= 3;
    } else if ((tourist && u.ulevel < MAXULEV / 2)
               || (u.uarmu && !u.uarm && !u.uarmc)) {
        multiplier *= 4;
        divisor *= 3;
    }

    const charisma = ACURR(A_CHA);
    if (charisma > 18) {
        divisor *= 2;
    } else if (charisma === 18) {
        multiplier *= 2;
        divisor *= 3;
    } else if (charisma >= 16) {
        multiplier *= 3;
        divisor *= 4;
    } else if (charisma <= 5) {
        multiplier *= 2;
    } else if (charisma <= 7) {
        multiplier *= 3;
        divisor *= 2;
    } else if (charisma <= 10) {
        multiplier *= 4;
        divisor *= 3;
    }

    tmp *= multiplier;
    if (divisor > 1) {
        tmp *= 10;
        tmp = Math.trunc(tmp / divisor);
        tmp += 5;
        tmp = Math.trunc(tmp / 10);
    }
    tmp = Math.max(1, tmp);
    if (obj.oartifact)
        tmp *= 4;
    const eshk = shkp.eshk || ESHK(shkp);
    if (eshk.surcharge)
        tmp += Math.trunc((tmp + 2) / 3);
    return tmp;
}

function add_one_tobill(obj, dummy, shkp) {
    const eshk = shkp.eshk || ESHK(shkp);
    if (!Array.isArray(eshk.bill_p))
        eshk.bill_p = [];
    if (eshk.bill_p.length >= 200)
        return false;

    let price = get_cost(obj, shkp);
    if (obj.globby)
        price *= get_pricing_units(obj);
    eshk.bill_p.push({
        bo_id: obj.o_id,
        useup: !!dummy,
        price,
        bquan: obj.quan,
    });
    if (dummy)
        add_to_billobjs(obj);
    eshk.billct = eshk.bill_p.length;
    obj.unpaid = 1;
    return true;
}

// src/shk.c:3368 add_to_billobjs()
function add_to_billobjs(obj) {
    if (obj.where !== OBJ_FREE)
        throw new Error('add_to_billobjs: obj not free');
    if (obj.timed)
        obj_stop_timers(obj);
    (game.billobjs ||= []).unshift(obj);
    obj.where = OBJ_ONBILL;
    obj.in_use = 0;
    obj.bypass = 0;
}

function append_honorific() {
    const honored = [
        'good', 'honored', 'most gracious', 'esteemed',
        'most renowned and sacred',
    ];
    let result = honored[rn2(honored.length - 1)
                         + (game.u.uevent?.udemigod ? 1 : 0)];
    const ptr = game.youmonst?.data;
    const vampire = game.u.umonnum === PMNAMES.PM_VAMPIRE
                 || game.u.umonnum === PMNAMES.PM_VAMPIRE_LEADER
                 || game.u.umonnum === PMNAMES.PM_VLAD_THE_IMPALER;
    if (vampire)
        result += game.flags?.female ? ' dark lady' : ' dark lord';
    else if ((ptr && is_elf(ptr)) || game.urace?.mnum === PMNAMES.PM_ELF)
        result += game.flags?.female ? ' hiril' : ' hir';
    else if (ptr && !is_human(ptr))
        result += ' creature';
    else
        result += game.flags?.female ? ' lady' : ' sir';
    return result;
}

function muteshk(shkp) {
    return helpless(shkp) || (shkp.data?.msound ?? 0) <= MSOUND.MS_ANIMAL;
}

// src/shk.c cost_per_charge() and check_unpaid_usage(). Using a charge from
// unpaid merchandise adds a separate usage debt without changing store credit.
function cost_per_charge(shkp, obj, altusage) {
    let cost = get_cost(obj, shkp);
    if (obj.otyp === ONAMES.MAGIC_LAMP) {
        cost = altusage
            ? cost + Math.trunc(cost / 3)
            : game.objects[ONAMES.OIL_LAMP].oc_cost;
    } else if (obj.otyp === ONAMES.MAGIC_MARKER) {
        cost = Math.trunc(cost / 2);
    } else if (obj.otyp === ONAMES.BAG_OF_TRICKS
               || obj.otyp === ONAMES.HORN_OF_PLENTY) {
        if (!altusage)
            cost = Math.trunc(cost / 5);
    } else if (obj.otyp === ONAMES.CRYSTAL_BALL
               || obj.otyp === ONAMES.OIL_LAMP
               || obj.otyp === ONAMES.BRASS_LANTERN
               || (obj.otyp >= ONAMES.MAGIC_FLUTE
                   && obj.otyp <= ONAMES.DRUM_OF_EARTHQUAKE)
               || obj.oclass === OCLASSES.WAND_CLASS) {
        if (obj.spe > 1)
            cost = Math.trunc(cost / 4);
    } else if (obj.oclass === OCLASSES.SPBOOK_CLASS) {
        cost -= Math.trunc(cost / 5);
    } else if (obj.otyp === ONAMES.CAN_OF_GREASE
               || obj.otyp === ONAMES.TINNING_KIT
               || obj.otyp === ONAMES.EXPENSIVE_CAMERA) {
        cost = Math.trunc(cost / 10);
    } else if (obj.otyp === ONAMES.POT_OIL) {
        cost = Math.trunc(cost / 5);
    }
    return cost;
}

export async function check_unpaid_usage(obj, altusage = false) {
    if (!obj?.unpaid || !(game.u.ushops || '').length
        || (obj.spe <= 0 && game.objects[obj.otyp]?.oc_charged))
        return;
    const shkp = shop_keeper(game.u.ushops.charCodeAt(0));
    if (!shkp || !inhishop(shkp))
        return;
    const cost = cost_per_charge(shkp, obj, altusage);
    if (!cost)
        return;

    const eshk = shkp.eshk || ESHK(shkp);
    let message;
    if (obj.oclass === OCLASSES.SPBOOK_CLASS) {
        const gender = is_demon(game.youmonst?.data) ? 3 : poly_gender();
        const address = ['cad', 'minx', 'beast', 'fiend'][gender] || 'thing';
        const preface = rn2(2) ? `This is no free library, ${address}!  ` : '';
        message = `${preface}You owe${eshk.debit ? ' an additional' : ''}`
                + ` ${cost} ${currency(cost)}.`;
    } else if (obj.otyp === ONAMES.POT_OIL) {
        message = `That will cost you ${cost} ${currency(cost)}`
                + ' (Yendorian Fuel Tax).';
    } else if (altusage && (obj.otyp === ONAMES.BAG_OF_TRICKS
                            || obj.otyp === ONAMES.HORN_OF_PLENTY)) {
        let preface = '';
        if (!rn2(3))
            preface = 'Whoa!  ';
        if (!rn2(3))
            preface = 'Watch it!  ';
        message = `${preface}Emptying that will cost you ${cost} ${currency(cost)}.`;
    } else {
        const first = !rn2(3) ? 'Hey!  ' : '';
        const second = !rn2(3) ? 'Ahem.  ' : '';
        message = `${first}${second}Usage fee, ${cost} ${currency(cost)}.`;
    }

    if (!Deaf() && !muteshk(shkp)) {
        await pline(`"${message}"`);
        exercise(A_WIS, true);
    }
    eshk.debit = (eshk.debit || 0) + cost;
}

export async function check_unpaid(obj) {
    await check_unpaid_usage(obj, false);
}

// src/shk.c:3085 picked_container(). Once a container leaves the floor, its
// contents no longer use floor-only no_charge ownership markers.
export function picked_container(obj) {
    for (const contained of obj.cobj || []) {
        if (contained.oclass === OCLASSES.COIN_CLASS)
            continue;
        contained.no_charge = 0;
        if (Has_contents(contained))
            picked_container(contained);
    }
}

// src/shk.c:3385 bill_box_content(). Bill every shop-owned non-coin object in
// a container, including objects inside nested containers.
function bill_box_content(obj, dummy, shkp) {
    for (const contained of obj.cobj || []) {
        if (contained.oclass === OCLASSES.COIN_CLASS)
            continue;
        if (!contained.no_charge)
            add_one_tobill(contained, dummy, shkp);
        if (Has_contents(contained))
            bill_box_content(contained, dummy, shkp);
    }
}

function count_unpaid_contents(obj) {
    let count = 0;
    for (const contained of obj.cobj || []) {
        if (contained.unpaid)
            count += 1;
        if (Has_contents(contained))
            count += count_unpaid_contents(contained);
    }
    return count;
}

// src/shk.c:5745 costly_gold(). Picking shop-floor gold back up first consumes
// credit, then becomes debt and a loan if the credit is insufficient.
export async function costly_gold(x, y, amount, silent) {
    let delta;
    let shkp;
    let eshkp;

    if (!costly_spot(x, y))
        return;
    /* shkp is guaranteed to exist after successful costly_spot(), but
       the static analyzer isn't smart enough to realize that, so follow
       the shkp assignment with a redundant test that will always fail */
    shkp = shop_keeper(in_rooms(x, y, SHOPBASE).charCodeAt(0));
    if (!shkp)
        return;

    eshkp = shkp.eshk;
    if (eshkp.credit >= amount) {
        if (!silent) {
            if (eshkp.credit > amount)
                await Your(`credit is reduced by ${amount} ${currency(amount)}.`);
            else
                await Your('credit is erased.');
        }
        eshkp.credit -= amount;
    } else {
        delta = amount - eshkp.credit;
        if (!silent) {
            if (eshkp.credit)
                await Your('credit is erased.');
            if (eshkp.debit)
                await Your(`debt increases by ${delta} ${currency(delta)}.`);
            else
                await You(`owe ${shkname(shkp)} ${delta} ${currency(delta)}.`);
        }
        eshkp.debit += delta;
        eshkp.loan += delta;
        eshkp.credit = 0;
    }
}

// src/shk.c:3490 addtobill(), including container contents and gold.
export async function addtobill(obj, ininv, dummy, silent) {
    const roomno = game.u.ushops ? game.u.ushops.charCodeAt(0) : NO_ROOM;
    const shkp = shop_keeper(roomno);
    if (!shkp || !inhishop(shkp) || obj.unpaid
        || (obj.oclass === OCLASSES.FOOD_CLASS && obj.oeaten))
        return;

    const container = Has_contents(obj);
    const contentsPrice = container ? contained_purchase_cost(obj, shkp) : 0;
    const containedGold = container ? contained_gold(obj, true) : 0;
    if (obj.no_charge
        && (!container || (!contentsPrice && !containedGold))) {
        if (obj.oclass !== OCLASSES.COIN_CLASS) {
            obj.no_charge = 0;
            if (container)
                picked_container(obj);
        }
        return;
    }
    if (obj.oclass === OCLASSES.COIN_CLASS) {
        await costly_gold(obj.ox, obj.oy, obj.quan, silent);
        return;
    }

    const eshk = shkp.eshk || ESHK(shkp);
    if ((eshk.billct ?? 0) >= 200) {
        if (!silent)
            await pline('You got that for free!');
        return;
    }

    let price = !obj.no_charge ? get_cost(obj, shkp) : 0;
    if (price && obj.globby)
        price *= get_pricing_units(obj);
    let contentsCount = 0;
    if (container) {
        if (price)
            add_one_tobill(obj, dummy, shkp);
        if (contentsPrice)
            bill_box_content(obj, dummy, shkp);
        picked_container(obj);
        price += contentsPrice;

        if (containedGold) {
            await costly_gold(obj.ox, obj.oy, containedGold, silent);
            if (!price)
                return;
        }
        obj.no_charge = 0;
        contentsCount = count_unpaid_contents(obj);
    } else if (!add_one_tobill(obj, dummy, shkp)) {
        return;
    }

    if (silent)
        return;

    if (!Deaf() && !muteshk(shkp)) {
        if (!ininv) {
            await pline(`${The(xname(obj))} will cost you ${price} ${currency(price)}`
                        + `${obj.quan > 1 ? ' each' : ''}.`);
            return;
        }

        let quote = '"For you,';
        if (!shkp.mpeaceful) {
            quote += ' scum;';
        } else if (!eshk.surcharge) {
            quote += ` ${append_honorific()}; only`;
        }
        const saveQuan = obj.quan;
        obj.quan = 1;
        const relation = saveQuan > 1 ? 'per'
            : (contentsCount && !obj.unpaid)
                ? 'for the contents of this' : 'for this';
        quote += ` ${price} ${currency(price)} ${relation} ${xname(obj)}`
               + `${contentsCount && obj.unpaid ? ' and its contents' : ''}."`;
        obj.quan = saveQuan;
        await pline(quote);
    } else {
        const subject = contentsCount && !obj.unpaid
            ? `the contents of the ${xname(obj)}`
            : `the ${xname(obj)}${contentsCount && obj.unpaid
                ? ' and its contents' : ''}`;
        await pline(`The list price of ${subject} is ${price} ${currency(price)}`
                    + `${obj.quan > 1 ? ' each' : ''}.`);
    }
}

function shopkeeper_name(shkp) {
    const raw = shkp.shknam || shkp.eshk?.shknam
        || shkp.mextra?.eshk?.shknam || 'the shopkeeper';
    return /^[-+_|=]/.test(raw) ? raw.slice(1) : raw;
}

/* src/objnam.c paydoname() suppresses the carried-item price because the pay
   menu puts its own aligned amount first. Container contents are hidden and
   ownership is described relative to the outer container. */
const SELL_NORMAL = 0;
const SELL_DELIBERATE = 1;
const SELL_DONTSELL = 2;

// src/shk.c sellobj_state(). Deliberate drops ask before selling, while
// accidental and multi-object drops can reuse one response.
export function sellobj_state(deliberate) {
    game.sell_response = deliberate !== SELL_NORMAL ? '' : 'a';
    game.sell_how = deliberate;
    game.auto_credit = false;
}

function saleable(shkp, obj) {
    const eshk = shkp.eshk || ESHK(shkp);
    const shop = shtypes[(eshk.shoptype || SHOPBASE) - SHOPBASE];
    if (!shop || shop.symb === OCLASSES.RANDOM_CLASS)
        return true;
    for (const [, itype] of shop.iprobs || []) {
        if (itype === VEGETARIAN_CLASS) {
            const otyp = obj.otyp;
            const corpsenm = obj.corpsenm ?? NON_PM;
            if (obj.oclass === OCLASSES.FOOD_CLASS
                && (game.objects[otyp].oc_material === MATERIALS.VEGGY
                    || otyp === ONAMES.EGG
                    || (otyp === ONAMES.TIN && corpsenm === NON_PM
                        && obj.spe === 1)
                    || ((otyp === ONAMES.TIN || otyp === ONAMES.CORPSE)
                        && corpsenm >= 0 && corpsenm < game.mons.length
                        && vegetarian(game.mons[corpsenm]))))
                return true;
            continue;
        }
        if (itype < 0 ? itype === -obj.otyp : itype === obj.oclass)
            return true;
    }
    return false;
}

// src/shk.c set_cost(), the amount a shopkeeper offers for ordinary goods.
function set_cost(obj, shkp) {
    let amount = (obj.quan || 1) * getprice(obj, true);
    let multiplier = 1;
    let divisor = 1;
    const u = game.u;
    const tourist = game.urole?.mnum === PMNAMES.PM_TOURIST
                 || game.urole?.mnum === 'PM_TOURIST';

    if (u.uarmh?.otyp === ONAMES.DUNCE_CAP) {
        divisor *= 3;
    } else if ((tourist && u.ulevel < MAXULEV / 2)
               || (u.uarmu && !u.uarm && !u.uarmc)) {
        divisor *= 3;
    } else {
        divisor *= 2;
    }

    const ocl = game.objects[obj.otyp];
    if (!obj.dknown || !ocl.oc_name_known) {
        if (obj.oclass === OCLASSES.GEM_CLASS) {
            if (ocl.oc_material === MATERIALS.GEMSTONE
                || ocl.oc_material === MATERIALS.GLASS) {
                amount = (obj.otyp - ONAMES.FIRST_REAL_GEM)
                       % (6 - (shkp.m_id || 0) % 3);
                amount = (amount + 3) * (obj.quan || 1);
                divisor = 1;
            }
        } else if (amount > 1 && !((shkp.m_id || 0) % 4)) {
            multiplier *= 3;
            divisor *= 4;
        }
    }

    if (amount >= 1) {
        amount *= multiplier;
        if (divisor > 1)
            amount = Math.trunc((Math.trunc(amount * 10 / divisor) + 5) / 10);
        amount = Math.max(1, amount);
    }
    return amount;
}

// src/shk.c:2995 contained_cost() and src/invent.c:3620 count_contents().
// During a new drop, unpaid contents still belong to the shopkeeper and all
// other contents still belong to the hero. The offer only includes saleable
// hero-owned objects, while the counts drive the container-specific prompt.
function contained_sale_summary(obj, shkp) {
    let cost = 0;
    let shopCount = 0;
    let heroCount = 0;
    for (const contained of obj.cobj || []) {
        if (Has_contents(contained)) {
            const nested = contained_sale_summary(contained, shkp);
            cost += nested.cost;
            shopCount += nested.shopCount;
            heroCount += nested.heroCount;
        }
        if (contained.unpaid) {
            shopCount += contained.quan || 1;
        } else {
            heroCount += contained.quan || 1;
            if (contained.oclass !== OCLASSES.COIN_CLASS
                && contained.oclass !== OCLASSES.BALL_CLASS
                && saleable(shkp, contained)
                && !(contained.oclass === OCLASSES.FOOD_CLASS
                     && contained.oeaten)
                && !(Is_candle(contained)
                     && (contained.age ?? 0)
                        < 20 * (game.objects[contained.otyp]?.oc_cost ?? 0))) {
                cost += set_cost(contained, shkp);
            }
        }
    }
    return { cost, shopCount, heroCount };
}

// src/shk.c:3064 dropped_container(). Mark the portions of a newly dropped
// container which the shopkeeper did not buy as player-owned floor objects.
function dropped_container(obj, shkp, sale) {
    for (const contained of obj.cobj || []) {
        if (contained.oclass !== OCLASSES.COIN_CLASS
            && !contained.unpaid
            && !(sale && saleable(shkp, contained))) {
            contained.no_charge = 1;
        }
        if (Has_contents(contained))
            dropped_container(contained, shkp, sale);
    }
}

// src/shk.c:3654 sub_one_frombill()
function sub_one_frombill(obj, shkp) {
    const bp = onbill(obj, shkp, false);
    if (bp) {
        obj.unpaid = 0;
        if (bp.bquan > obj.quan) {
            const otmp = { ...obj, oextra: null };
            bp.bo_id = otmp.o_id = next_ident(); /* svc.context.ident++ */
            otmp.where = OBJ_FREE;
            otmp.quan = (bp.bquan -= obj.quan);
            otmp.owt = 0; /* superfluous */
            bp.useup = true;
            add_to_billobjs(otmp);
            return;
        }
        const eshk = shkp.eshk || ESHK(shkp);
        const bill = eshk.bill_p;
        /* eshkp->billct--; *bp = eshkp->bill_p[eshkp->billct]; */
        const idx = bill.indexOf(bp);
        bill[idx] = bill[bill.length - 1];
        bill.pop();
        eshk.billct = bill.length;
        return;
    } else if (obj.unpaid) {
        void impossible('sub_one_frombill: unpaid object not on bill');
        obj.unpaid = 0;
    }
}

export function subfrombill(obj, shkp) {
    sub_one_frombill(obj, shkp);
    for (const contained of obj.cobj || []) {
        if (contained.oclass !== OCLASSES.COIN_CLASS)
            subfrombill(contained, shkp);
    }
}

// src/shk.c:3713 stolen_container()
function stolen_container(obj, shkp, price, ininv) {
    let bp;
    let billamt;

    /* the price of contained objects; caller handles top container */
    for (const otmp of obj.cobj || []) {
        if (otmp.oclass === OCLASSES.COIN_CLASS)
            continue;
        billamt = 0;
        if (!billable({ shkp }, otmp, ESHK(shkp).shoproom, true)) {
            /* billable() returns false for objects already on bill */
            if ((bp = onbill(otmp, shkp, false)) == null)
                continue;
            /* this assumes that we're being called by stolen_value()
               (or by a recursive call to self on behalf of it) where
               the cost of this object is about to be added to shop
               debt in place of having it remain on the current bill */
            billamt = bp.bquan * bp.price;
            sub_one_frombill(otmp, shkp); /* avoid double billing */
        }

        if (billamt)
            price += billamt;
        else if (ininv ? otmp.unpaid : !otmp.no_charge)
            price += get_pricing_units(otmp) * get_cost(otmp, shkp);

        if (Has_contents(otmp))
            price = stolen_container(otmp, shkp, price, ininv);
    }

    return price;
}

// src/shk.c:3754 stolen_value()
export async function stolen_value(obj, x, y, peaceful, silent) {
    let value = 0, gvalue = 0, billamt = 0;
    let roomno;
    let bp = null;
    let shkp;
    let was_unpaid;
    let c_count = 0, u_count = 0;

    if ((shkp = find_objowner(obj, x, y)) != null) {
        roomno = ESHK(shkp).shoproom;
    } else {
        roomno = (in_rooms(x, y, SHOPBASE) || '\0').charCodeAt(0);
    }

    /* gather information for message(s) prior to manipulating bill */
    was_unpaid = obj.unpaid ? true : false;
    if (Has_contents(obj)) {
        c_count = count_contents(obj, true, false, true, false);
        u_count = count_contents(obj, true, false, false, false);
    }

    const shkpp = { shkp: null };
    if (!billable(shkpp, obj, roomno, true)) {
        shkp = shkpp.shkp;
        /* things already on the bill yield a not-billable result, so
           we need to check bill before deciding that shk doesn't care */
        if ((bp = onbill(obj, shkp, false)) != null) {
            /* shk does care; take obj off bill to avoid double billing */
            billamt = bp.bquan * bp.price;
            sub_one_frombill(obj, shkp);
        }
        if (!bp && !u_count)
            return 0;
    }
    shkp = shkpp.shkp;

    if (obj.oclass === OCLASSES.COIN_CLASS) {
        gvalue += obj.quan;
    } else {
        if (billamt)
            value += billamt;
        else if (!obj.no_charge)
            value += get_pricing_units(obj) * get_cost(obj, shkp);

        if (Has_contents(obj)) {
            const ininv =
                (obj.where === OBJ_INVENT || obj.where === OBJ_FREE);

            value += stolen_container(obj, shkp, 0, ininv);
            if (!ininv)
                gvalue += contained_gold(obj, true);
        }
    }

    if (gvalue + value === 0)
        return 0;

    value += gvalue;

    if (peaceful) {
        const credit_use = !!ESHK(shkp).credit;

        value = await check_credit(value, shkp);
        /* 'peaceful' affects general treatment, but doesn't affect
         * the fact that other code expects that all charges after the
         * shopkeeper is angry are included in robbed, not debit */
        if (!shkp.mpeaceful /* ANGRY(shkp) */)
            ESHK(shkp).robbed += value;
        else
            ESHK(shkp).debit += value;

        if (!silent) {
            let buf;
            let still = '';

            if (credit_use) {
                if (ESHK(shkp).credit) {
                    await You(`have ${ESHK(shkp).credit} ${currency(ESHK(shkp).credit)} credit remaining.`);
                    return value;
                } else if (!value) {
                    await You('have no credit remaining.');
                    return 0;
                }
                still = 'still ';
            }
            buf = `${still}owe ${shkname(shkp)} ${value} ${currency(value)}`;
            if (u_count) /* u_count > 0 implies Has_contents(obj) */
                buf += ` for ${was_unpaid ? 'it and ' : ''}${(c_count > u_count) ? 'some of ' : ''}its contents`;
            else if (obj.oclass !== OCLASSES.COIN_CLASS)
                buf += ` for ${(obj.quan > 1) ? 'them' : 'it'}`;

            await You(`${buf}!`); /* "You owe <shk> N zorkmids for it!" */
        }
    } else {
        ESHK(shkp).robbed += value;

        if (!silent) {
            if (canseemon(shkp)) {
                await Norep(`${Shknam(shkp)} booms: "${game.plname}, you are a thief!"`);
            } else if (!Deaf()) {
                await Norep('You hear a scream, "Thief!"');  /* Deaf-aware */
            }
        }
        hot_pursuit(shkp);
        await angry_guards(false);
    }
    return value;
}

// src/shk.c:3623 splitbill() -- give the split child its own bill entry while
// preserving the parent's unit price.
export function splitbill(obj, otmp) {
    /* otmp has been split off from obj */
    const shkp = shop_keeper((game.u.ushops || '\0').charCodeAt(0));

    if (!shkp || !inhishop(shkp)) {
        void impossible('splitbill: no resident shopkeeper??');
        return;
    }
    const bp = onbill(obj, shkp, false);
    if (!bp) {
        void impossible('splitbill: not on bill?');
        return;
    }
    if (bp.bquan < otmp.quan) {
        void impossible('Negative quantity on bill??');
    }
    if (bp.bquan === otmp.quan) {
        void impossible('Zero quantity on bill??');
    }
    bp.bquan -= otmp.quan;

    const eshk = shkp.eshk || ESHK(shkp);
    if ((eshk.bill_p || []).length === BILLSZ) {
        otmp.unpaid = 0;
    } else {
        const tmp = bp.price;
        (eshk.bill_p ||= []).push({
            bo_id: otmp.o_id,
            bquan: otmp.quan,
            useup: false,
            price: tmp,
        });
        eshk.billct = eshk.bill_p.length;
    }
}

// Keep existing imports while the implementation lives in its C module.
export { bill_dummy_object } from './mkobj.js';

// src/shk.c:1187 obfree(), bill and merged-identity arms. Return true when
// the object must be retained; invent.js completes the deallocation otherwise.
export function obfree_bill(obj, merge = null) {
    let shkp = null;
    if (obj.unpaid) {
        const mons = game.level?.monsters || [];
        for (shkp = next_shkp(mons[0] ?? null, true); shkp;
             shkp = next_shkp(mons[mons.indexOf(shkp) + 1] ?? null, true))
            if (onbill(obj, shkp, true))
                break;
    }
    if (!shkp && game.u.ushops)
        shkp = shop_keeper(game.u.ushops.charCodeAt(0));
    const bp = onbill(obj, shkp, false);
    if (!bp) {
        if (merge && oid_price_adjustment(obj, obj.o_id)
                     > oid_price_adjustment(merge, merge.o_id)) {
            // C's light id is an object pointer. Retarget the port's numeric
            // reference while preserving the same surviving object.
            for (const light of game.light_sources || [])
                if (light.type === LS_OBJECT && light.id === merge.o_id)
                    light.id = obj.o_id;
            merge.o_id = obj.o_id;
        }
        return false;
    }

    if (!merge) {
        bp.useup = true;
        bp.obj = obj;
        obj.unpaid = 0;
        if (obj.globby && !obj.owt && has_omid(obj))
            obj.owt = OMID(obj);
        add_to_billobjs(obj);
        return true;
    }
    const bpm = onbill(merge, shkp, false);
    if (!bpm) {
        void impossible('obfree: not on bill, otyp,where,quan,unpaid = '
            + `(${obj.otyp},${obj.where},${obj.quan},${obj.unpaid ? 1 : 0}) `
            + `(${merge.otyp},${merge.where},${merge.quan},${merge.unpaid ? 1 : 0})?`);
        return true;
    }
    const eshk = shkp.eshk || ESHK(shkp);
    bpm.bquan += bp.bquan;
    Object.assign(bp, eshk.bill_p[eshk.bill_p.length - 1]);
    eshk.bill_p.length--;
    eshk.billct = eshk.bill_p.length;
    return false;
}

// Preserve existing imports while the implementation lives in its C module.
export { costly_alteration } from './mkobj.js';
import { noit_mhe, noit_mhim } from './mondata.js';
import { body_part } from './polyself.js';
import { ARM } from './const.js';
import { is_izchak } from './shknam.js';

// src/shk.c:186 money2u(); split gold stays linked until extraction.
export async function money2u(mon, amount) {
    let mongold = (mon.minvent || []).find(obj => obj.oclass === OCLASSES.COIN_CLASS);
    if (amount <= 0) {
        await impossible(`${amount ? 'negative' : 'zero'} payment in money2u!`);
        return;
    }
    if (!mongold || mongold.quan < amount) {
        const { a_monnam } = await import('./do_name.js');
        await impossible(`${a_monnam(mon)} paying without ${mongold ? 'enough' : ''} gold?`);
        return;
    }
    if (mongold.quan > amount) mongold = splitobj(mongold, amount);
    obj_extract_self(mongold);
    const { inv_cnt } = await import('./hack.js');
    const { invlet_basic } = await import('./const.js');
    if (!merge_choice(game.invent, mongold) && inv_cnt(false) >= invlet_basic) {
        await You('have no room for the gold!');
        const { dropy } = await import('./do.js');
        await dropy(mongold);
    } else {
        await addinv(mongold);
        (game.disp ||= {}).botl = true;
    }
}

export async function donate_gold(amount, shkp, selling) {
    const eshk = shkp.eshk || ESHK(shkp);
    if ((eshk.debit || 0) >= amount) {
        if (eshk.loan)
            eshk.loan = Math.max(0, eshk.loan - amount);
        eshk.debit -= amount;
        await pline(`Your debt is ${eshk.debit ? 'partially ' : ''}paid off.`);
        return;
    }

    const delta = amount - (eshk.debit || 0);
    eshk.credit = (eshk.credit || 0) + delta;
    if (eshk.debit) {
        eshk.debit = 0;
        eshk.loan = 0;
        await pline('Your debt is paid off.');
    }
    if (eshk.credit === delta) {
        await pline(`You have ${selling ? '' : 're-'}established ${delta} ${currency(delta)} credit.`);
    } else {
        await pline(`${delta} ${currency(delta)} added${selling ? '' : ' back'} to your credit; total is now ${eshk.credit} ${currency(eshk.credit)}.`);
    }
}

// src/shk.c sellobj(), ordinary objects, gold, and containers.
export async function sellobj(obj, x, y) {
    if (!(game.u.ushops || '').length)
        return;
    const rooms = in_rooms(x, y, SHOPBASE);
    const shkp = shop_keeper(rooms ? rooms.charCodeAt(0) : NO_ROOM);
    if (!shkp || !inhishop(shkp) || !costly_spot(x, y))
        return;

    const container = Has_contents(obj);
    if (obj.unpaid && !container
        && obj.oclass !== OCLASSES.COIN_CLASS) {
        sub_one_frombill(obj, shkp);
        return;
    }
    const eshk = shkp.eshk || ESHK(shkp);
    const isgold = obj.oclass === OCLASSES.COIN_CLASS;
    const containedGold = container ? contained_gold(obj, true) : 0;
    const saleitem = saleable(shkp, obj);
    const contents = container
        ? contained_sale_summary(obj, shkp)
        : { cost: 0, shopCount: 0, heroCount: 0 };
    const containerOffer = !isgold && !obj.unpaid && saleitem
        ? set_cost(obj, shkp) : 0;
    let offer = containerOffer + contents.cost;

    if (!shkp.mpeaceful) {
        await pline('"Thank you, scum!"');
        subfrombill(obj, shkp);
        return;
    }

    if (!(isgold || containedGold)
        && (!offer || game.sell_how === SELL_DONTSELL)) {
        if (container)
            dropped_container(obj, shkp, false);
        if (!obj.unpaid)
            obj.no_charge = 1;
        subfrombill(obj, shkp);
        if (game.sell_how !== SELL_DONTSELL)
            await pline(`${shopkeeper_name(shkp)} seems uninterested.`);
        return;
    }

    if (isgold || containedGold) {
        await donate_gold(containedGold || obj.quan, shkp, true);
        if (!offer || game.sell_how === SELL_DONTSELL) {
            if (!isgold) {
                dropped_container(obj, shkp, false);
                if (!obj.unpaid)
                    obj.no_charge = 1;
                subfrombill(obj, shkp);
            }
            return;
        }
    }

    const shkmoney = money_cnt(shkp.minvent || []);
    if (!shkmoney) {
        const creditOffer = Math.trunc(offer * 9 / 10) + (offer <= 1 ? 1 : 0);
        let answer = game.sell_response;
        if (game.sell_how === SELL_NORMAL || game.auto_credit) {
            answer = game.sell_response = 'y';
        } else if (answer !== 'n') {
            await pline(`${shopkeeper_name(shkp)} cannot pay you at present.`);
            answer = await tty_yn_function(
                `Will you accept ${creditOffer} ${currency(creditOffer)} in credit for ${doname(obj)}?`,
                'ynaq', 'y');
            if (answer === 'a') {
                answer = 'y';
                game.auto_credit = true;
            }
        }
        if (answer === 'y') {
            if (container)
                dropped_container(obj, shkp, true);
            const tradedName = container
                ? `the contents of ${obj.no_charge
                    ? an(xname(obj)) : `your ${xname(obj)}`}`
                : doname(obj);
            await pline(`You traded ${tradedName} for ${creditOffer} zorkmid${creditOffer === 1 ? '' : 's'} in ${eshk.credit ? 'additional ' : ''}credit.`);
            eshk.credit = (eshk.credit || 0) + creditOffer;
            subfrombill(obj, shkp);
        } else {
            if (answer === 'q')
                game.sell_response = 'n';
            if (container)
                dropped_container(obj, shkp, false);
            if (!obj.unpaid)
                obj.no_charge = 1;
            subfrombill(obj, shkp);
        }
        return;
    }

    const shortFunds = offer > shkmoney;
    if (shortFunds)
        offer = shkmoney;
    record_price_quote(obj.otyp, Math.trunc(offer / (obj.quan || 1)), false);

    let answer = game.sell_response;
    if (!answer) {
        let one = (obj.quan || 1) === 1;
        let owner = 'your ';
        let contentsPrefix = '';
        let contentsSuffix = '';
        if (container) {
            owner = obj.unpaid ? 'the ' : 'your ';
            if (contents.cost && !containerOffer) {
                contentsPrefix = contents.heroCount === 1
                    ? 'your item in ' : 'your items in ';
            } else if (contents.cost && containerOffer) {
                const partiallyOwned = contents.shopCount
                    && contents.heroCount;
                contentsSuffix = partiallyOwned
                    ? (contents.heroCount === 1
                        ? ' and item inside' : ' and items inside')
                    : ' and its contents';
            }
            one = !containerOffer
                ? contents.heroCount === 1
                : (obj.quan || 1) === 1 && !contents.cost;
        }
        answer = await tty_yn_function(
            `${shopkeeper_name(shkp)} offers${shortFunds ? ' only' : ''} ${offer} gold piece${offer === 1 ? '' : 's'} for ${contentsPrefix}${owner}${xname(obj)}${contentsSuffix}.  Sell ${one ? 'it' : 'them'}?`,
            'ynaq', 'n');
    }
    if (answer === 'q') {
        game.sell_response = 'n';
        answer = 'n';
    } else if (answer === 'a') {
        game.sell_response = 'y';
        answer = 'y';
    }

    if (answer !== 'y') {
        if (container)
            dropped_container(obj, shkp, false);
        if (!obj.unpaid)
            obj.no_charge = 1;
        subfrombill(obj, shkp);
        return;
    }

    if (container)
        dropped_container(obj, shkp, true);
    if (!obj.unpaid && !saleitem)
        obj.no_charge = 1;
    subfrombill(obj, shkp);
    await money2u(shkp, offer);
    const soldName = container
        ? `the contents of ${obj.no_charge
            ? an(xname(obj)) : `your ${xname(obj)}`}`
        : doname(obj);
    await pline(`You sold ${soldName} for ${offer} gold piece${offer === 1 ? '' : 's'}.`);
}

// src/shk.c:3050 money2mon() -- transfer a simple gold payment to a monster.
export async function money2mon(mon, amount) {
    const ygold = findgold(game.invent);

    if (amount <= 0) {
        await impossible(`${amount ? 'negative' : 'zero'} payment in money2mon!`);
        return 0;
    }
    if (!ygold || ygold.quan < amount) {
        await impossible(`Paying without ${ygold ? 'enough' : ''} gold?`);
        return 0;
    }

    let gold = ygold;
    if (ygold.quan > amount)
        gold = splitobj(ygold, amount);
    else if (ygold.owornmask)
        await remove_worn_item(ygold, false); /* quiver */
    freeinv(gold);
    add_to_minv(mon, gold);
    (game.disp ||= {}).botl = true;
    return amount;
}

// src/shk.c:1300 pay() — hand over gold, credit first, and reduce any
// robbery debt by the amount
async function pay(tmp, shkp) {
    const robbed_before = ESHK(shkp).robbed | 0;
    const balance = ((tmp <= 0) ? tmp : await check_credit(tmp, shkp));

    if (balance > 0)
        await money2mon(shkp, balance);
    else if (balance < 0)
        await money2u(shkp, -balance);
    (game.disp ||= {}).botl = true;
    if (robbed_before) {
        let robbed = robbed_before - tmp;
        if (robbed < 0)
            robbed = 0;
        ESHK(shkp).robbed = robbed;
    }
}

// src/shk.c:1344 pacify_shk()
export function pacify_shk(shkp, clear_surcharge) {
    shkp.mpeaceful = 1; /* make peaceful */
    if (clear_surcharge && ESHK(shkp).surcharge) {
        ESHK(shkp).surcharge = false;
        for (const bp of ESHK(shkp).bill_p || []) {
            const reduction = Math.trunc((bp.price + 3) / 4);
            bp.price -= reduction; /* undo 33% increase */
        }
    }
}

// src/shk.c:1362 rile_shk()
function rile_shk(shkp) {
    const eshk = shkp.eshk || ESHK(shkp);
    shkp.mpeaceful = 0;
    if (!eshk.surcharge) {
        eshk.surcharge = true;
        for (const bp of eshk.bill_p || [])
            bp.price += Math.trunc((bp.price + 2) / 3);
    }
}

// src/shk.c:1381 rouse_shk()
export async function rouse_shk(shkp, verbosely) {
    if (helpless(shkp)) {
        /* greed induced recovery... */
        if (verbosely && canspotmon(shkp))
            await pline(`${Shknam(shkp)} ${shkp.msleeping ? 'wakes up' : 'can move again'}.`);
        shkp.msleeping = 0;
        shkp.mfrozen = 0;
        shkp.mcanmove = 1;
    }
}

function live_shopkeepers() {
    const keepers = [];
    for (const mon of game.level?.monsters || []) {
        if (!mon.isshk || DEADMONSTER(mon))
            continue;
        if (!mon.mpeaceful && !(mon.eshk || ESHK(mon)).surcharge)
            rile_shk(mon);
        keepers.push(mon);
    }
    return keepers;
}

function shk_pronouns(shkp) {
    return shkp.female
        ? { he: 'she', him: 'her', his: 'her' }
        : { he: 'he', him: 'him', his: 'his' };
}

async function kops_gone(silent) {
    const kopTypes = new Set([
        PMNAMES.PM_KEYSTONE_KOP, PMNAMES.PM_KOP_SERGEANT,
        PMNAMES.PM_KOP_LIEUTENANT, PMNAMES.PM_KOP_KAPTAIN,
    ]);
    const kops = (game.level?.monsters || [])
        .filter(mon => !DEADMONSTER(mon) && kopTypes.has(mon.mnum));
    let seen = 0;
    const { mongone } = await import('./mon.js');
    for (const kop of kops) {
        if (canspotmon(kop))
            ++seen;
        await mongone(kop);
    }
    if (seen && !silent) {
        await pline(seen === 1
            ? 'The Kop (disappointed) vanishes into thin air.'
            : 'The Kops (disappointed) vanish into thin air.');
    }
}

async function make_happy_shoppers(silentkops) {
    if (live_shopkeepers().some(shkp => !shkp.mpeaceful))
        return;
    await kops_gone(silentkops);
    for (const mon of game.level?.monsters || []) {
        if (mon.mnum === PMNAMES.PM_WATCHMAN
            || mon.mnum === PMNAMES.PM_WATCH_CAPTAIN)
            mon.mpeaceful = 1;
    }
}

export async function make_happy_shk(shkp, silentkops) {
    const eshk = shkp.eshk || ESHK(shkp);
    const wasmad = !shkp.mpeaceful;
    shkp.mpeaceful = 1;
    eshk.following = 0;
    eshk.robbed = 0;
    if (game.urole?.mnum !== PMNAMES.PM_ROGUE)
        adjalign(Math.sign(game.u.ualign?.type || 0));

    if (!inhishop(shkp)) {
        const name = shopkeeper_name(shkp);
        const pronouns = shk_pronouns(shkp);
        let vanished = canseemon(shkp);
        const local = eshk.shoplevel
            && eshk.shoplevel.dnum === game.u.uz.dnum
            && eshk.shoplevel.dlevel === game.u.uz.dlevel;
        if (local) {
            await home_shk(shkp);
            if (canspotmon(shkp)) {
                await pline(`${shopkeeper_name(shkp)} returns to ${pronouns.his} shop.`);
                vanished = false;
            }
        } else {
            if (sensemon(shkp))
                vanished = true;
            const { mdrop_special_objs } = await import('./steal.js');
            const { migrate_monster } = await import('./trap.js');
            await mdrop_special_objs(shkp);
            const oldx = shkp.mx, oldy = shkp.my;
            migrate_monster(shkp, eshk.shoplevel || game.u.uz,
                            MIGR_APPROX_XY, eshk.shd);
            newsym(oldx, oldy);
            eshk.dismiss_kops = true;
        }
        if (vanished)
            await pline(`Satisfied, ${name} suddenly disappears!`);
    } else if (wasmad) {
        await pline(`${shopkeeper_name(shkp)} calms down.`);
    }
    await make_happy_shoppers(silentkops);
}

/* src/shk.c:17 the dopayobj() results */
const PAY_BUY = 1;
const PAY_CANT = 0; /* too poor */
const PAY_SKIP = (-1);
const PAY_BROKE = (-2);

/* src/shk.c:22 billitem_status — the state of an item on the shop bill */
const FullyUsedUp = 1,   /* completely used up; obj->where==OBJ_ONBILL */
      PartlyUsedUp = 2,  /* partly used up; obj->where==OBJ_INVENT or similar */
      PartlyIntact = 3,  /* intact portion of partly used up item */
      FullyIntact = 4,   /* normal unpaid item */
      KnownContainer = 5, /* container->cknown==1, holding unpaid item(s) */
      UndisclosedContainer = 6; /* container->cknown==0 */

const no_money = (s) => `Moreover, you${s} have no gold.`,
      not_enough_money = (him) => `Besides, you don't have enough to interest ${him}.`;

// src/shk.c:1497 sortbill_cmp() — if one item is used-up and the other
// isn't, the used-up one comes first; otherwise, if their costs differ, the
// more expensive one comes first; if costs are the same, use internal index
// as tie-breaker for stable sort
function sortbill_cmp(sbi1, sbi2) {
    const cost1 = sbi1.cost, cost2 = sbi2.cost;
    const bidx1 = sbi1.bidx, bidx2 = sbi2.bidx,
        /* sort such that FullyUsedUp and PartlyUsedUp come before
            PartlyIntact, FullyIntact, KnownContainer, UndisclosedContainer */
        used1 = sbi1.usedup <= PartlyUsedUp ? 1 : 0, /* 0=>unpaid, 1=>used */
        used2 = sbi2.usedup <= PartlyUsedUp ? 1 : 0;

    if (used1 !== used2)
        return (used2 - used1); /* bigger comes before smaller here */
    if (cost1 !== cost2)
        return (cost2 - cost1); /* bigger comes before smaller here too */
    /* index into eshkp->bill_p[] isn't unique (an item that is partly
       used and partly intact will have two ibill[] entries indexing same
       bill_p[] element) but duplicates won't reach here (used1 vs used2) */
    return (bidx1 - bidx2);
}

// src/shk.c:1523 cheapest_item() — delivers the cheapest item on the list
function cheapest_item(ibillct, ibill) {
    let i;
    let gmin = ibill[0].cost;

    for (i = 1; i < ibillct; ++i)
        if (ibill[i].cost < gmin)
            gmin = ibill[i].cost;
    return gmin;
}

// src/shk.c:1545 make_itemized_bill() — for itemized purchasing, create an
// alternate shop bill that hides container contents; returns the entries
// (the C's ibill[] array and count)
async function make_itemized_bill(shkp) {
    const ibill = [];
    let bp;
    let otmp;
    const eshkp = ESHK(shkp);
    let i, n, bidx;
    const ebillct = eshkp.billct | 0;
    let used;
    let quan, cost;

    n = 0; /* number of entries in ibill[]; won't necessary match ebillct */
    for (i = 0; i < ebillct; ++i) {
        bp = eshkp.bill_p[i];
        /* find the object on the bill */
        otmp = bp_to_obj(bp);
        if (!otmp) {
            await impossible(`Can't find shop bill entry for #${bp.bo_id}`);
            continue;
        }
        bidx = i; /* index into bill_p[], except for hero-owner container */

        if (otmp.quan === 0 || otmp.where === OBJ_ONBILL) {
            /* item is completely used up; restore quantity from when it
               was first unpaid; otmp is on billobjs list where it can
               only be seen via Ix and itemized billing while paying shk */
            otmp.quan = bp.bquan;
            bp.useup = true; /* (expected to be set already) */
        } else if (otmp.quan < bp.bquan) {
            /* item is partly used up; we will create two entries in the
               augmented bill: one for the used up part here, another for
               the intact part (which might be inside a container if put in
               after using part of a stack; used up part isn't) below */
            ibill[n] = { obj: otmp, quan: bp.bquan - otmp.quan, cost: 0,
                         bidx: bidx, /* duplicate index into eshkp->bill_p[] */
                         usedup: PartlyUsedUp, /* for sorting */
                         queuedpay: false };
            ibill[n].cost = bp.price * ibill[n].quan;
            ++n; /* intact portion will be a separate entry, next */
        }

        if (otmp.where === OBJ_ONBILL) {
            /* completely used up */
            quan = bp.bquan;
            cost = bp.price * quan;
            used = FullyUsedUp;
        } else if (otmp.where === OBJ_CONTAINED || Has_contents(otmp)) {
            let j;
            const item = otmp;
            let cknown = true; /* assume container contents are known */

            /* when it's in a container, put the container rather than the
               specific object into ibill[]; find outermost container */
            while (otmp.where === OBJ_CONTAINED) {
                otmp = otmp.ocontainer;
                if (!otmp.cknown)
                    cknown = false;
            }
            /* this container might already be in ibill[] if it is unpaid
               itself or if it holds more than one unpaid item and another
               besides this one has already been processed; only include
               first instance */
            for (j = 0; j < n; ++j)
                if (otmp === ibill[j].obj)
                    break;
            if (j < n) {
                /* when already on bill as FullyIntact, update; the cost
                   saved in ibill[j] is based on the container even if the
                   entry was initially created for an item of its contents */
                if (ibill[j].usedup === FullyIntact)
                    ibill[j].usedup = cknown ? KnownContainer
                                             : UndisclosedContainer;
                continue; /* 'i' loop */
            }
            /* include 1 container containing unpaid item(s) */
            quan = 1;
            cost = await unpaid_cost(otmp, COST_CONTENTS);
            if (!otmp.unpaid)
                bidx = -1;
            /* an unpaid container without any unpaid contents is classified
               as 'FullyIntact'; a container with unpaid contents will be
               '*Container' regardless of whether it is unpaid itself */
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

        ibill[n] = { obj: otmp, quan: quan, cost: cost, bidx: bidx,
                     usedup: used, queuedpay: false };
        ++n;
    }

    /* ibill[0..n-1] contains data, ibill[n] has Null obj and -1 bidx and
       is excluded from the sort */
    if (n > 1)
        ibill.sort(sortbill_cmp); /* qsort(); sortbill_cmp() is total */
    return ibill;
}

// src/shk.c:1668 menu_pick_pay_items() — show items on your bill in a
// menu, and ask which to pay.  returns the number of entries selected.
async function menu_pick_pay_items(ibillct, ibill /* all used up items, if any, precede all intact items */) {
    let otmp;
    let win;
    let p, buf;
    let amt, largest_amt, save_quan;
    let i, j, n, amt_width;

    win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);

    /* we go through ibill[] twice, first time to control price formatting
       during the second */
    largest_amt = 0;
    for (i = 0; i < ibillct; ++i)
        if (ibill[i].cost > largest_amt)
            largest_amt = ibill[i].cost;
    amt_width = String(largest_amt).length;

    /* show the "used up items" header if there are any used up items on
       the bill, no matter whether there are also any intact items;
       note: ibill[] has been sorted to hold used-up items first */
    if (ibill[0].usedup <= PartlyUsedUp) {
        buf = `Used up item${(ibillct > 1 && ibill[1].usedup <= PartlyUsedUp) ? 's' : ''}:`;
        add_menu_heading(win, buf);
    }
    for (i = 0; i < ibillct; ++i) {
        /* the "unpaid items" header is only shown if the "used up items"
           one was shown before the first menu entry */
        if (i > 0 && ibill[i - 1].usedup <= PartlyUsedUp
            && ibill[i].usedup >= PartlyIntact) {
            buf = `Unpaid item${(i < ibillct - 1) ? 's' : ''}:`;
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
        buf = `${String(amt).padStart(amt_width, ' ')} Zm, ${p}`;
        tty_add_menu(win, null, i + 1 /* +1: avoid 0 */, 0, 0, ATR_NONE, NO_COLOR, buf,
                     MENU_ITEMFLAGS_NONE);
    }

    tty_end_menu(win, 'Pay for which items?');
    const pick_list = await tty_select_menu(win, PICK_ANY);
    n = pick_list ? pick_list.length : -1;
    tty_destroy_nhwindow(win);

    for (j = 0; j < n; ++j) {
        /*
         * FIXME:
         *  The menu will accept a subset count for each entry but buying
         *  doesn't have any support for that.
         */
        i = pick_list[j] - 1; /* -1: reverse +1 above */
        ibill[i].queuedpay = true;
    }
    /* for ESC, return 0 instead of usual -1 */
    return Math.max(n, 0);
}

// src/shk.c:1742 dopay() — the #pay command
export async function dopay() {
    let eshkp;
    let shkp;
    let nxtm, resident;
    let ibill = null;
    let ltmp;
    let umoney;
    let sk = 0, seensk = 0, nexttosk = 0;
    let paid = false;
    const stashed_gold = (hidden_gold(game.invent, true) > 0);
    let pay_done;
    const u = game.u;
    const fmon = game.level?.monsters || [];

    game.multi = 0;

    /* Find how many shk's there are, how many are in
     * sight, and are you in a shop room with one.
     */
    nxtm = resident = null;
    for (shkp = next_shkp(fmon[0] ?? null, false); shkp;
         shkp = next_shkp(fmon[fmon.indexOf(shkp) + 1] ?? null, false)) {
        sk++;
        if (m_next2u(shkp)) {
            /* next to an irate shopkeeper? prioritize that */
            if (nxtm && !nxtm.mpeaceful)
                continue;
            nexttosk++;
            nxtm = shkp;
        }
        if (canspotmon(shkp))
            seensk++;
        if (inhishop(shkp)
            && ((u.ushops ? u.ushops.charCodeAt(0) : NO_ROOM) === ESHK(shkp).shoproom))
            resident = shkp;
    }

    proceed: {
        if (nxtm && nexttosk === 1) {
            shkp = nxtm;
            break proceed;
        }

        if ((!sk && (!Blind() || Blind_telepat())) || (!Blind() && !seensk)) {
            await There('appears to be no shopkeeper here to receive your payment.');
            return ECMD_OK;
        }

        if (!seensk) {
            await You_cant('see...');
            return ECMD_OK;
        }

        /* The usual case.  Allow paying at a distance when
         * inside a tended shop.  Should we change that?
         */
        if (sk === 1 && resident) {
            shkp = resident;
            break proceed;
        }

        if (seensk === 1) {
            for (shkp = next_shkp(fmon[0] ?? null, false); shkp;
                 shkp = next_shkp(fmon[fmon.indexOf(shkp) + 1] ?? null, false))
                if (canspotmon(shkp))
                    break;
            /* assert(shkp != NULL): seensk==1 => traversal will spot one shk */
            if (shkp !== resident && !m_next2u(shkp)) {
                await pline(`${Shknam(shkp)} is not near enough to receive your payment.`);
                return ECMD_OK;
            }
        } else {
            let mtmp;
            const cc = { x: u.ux, y: u.uy };
            let cx, cy;

            await pline('Pay whom?');
            if (await getpos(cc, true, 'the creature you want to pay') < 0)
                return ECMD_CANCEL; /* player pressed ESC */
            cx = cc.x;
            cy = cc.y;
            if (cx < 0) {
                await pline('Try again...');
                return ECMD_OK;
            }
            if (u_at(cx, cy)) {
                await You('are generous to yourself.');
                return ECMD_OK;
            }
            mtmp = m_at(cx, cy);
            if (!cansee(cx, cy) && (!mtmp || !canspotmon(mtmp))) {
                await You(`can't ${!Blind() ? 'see' : 'sense'} anyone there.`);
                return ECMD_OK;
            }
            if (!mtmp) {
                await There('is no one there to receive your payment.');
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
            /* debugpline0("dopay: null shkp."); */
            return ECMD_OK;
        }
    } /* proceed: */
    eshkp = ESHK(shkp);
    ltmp = eshkp.robbed | 0;

    /* wake sleeping shk when someone who owes money offers payment */
    if (ltmp || eshkp.billct || eshkp.debit)
        await rouse_shk(shkp, true);

    if (helpless(shkp)) { /* still asleep/paralyzed */
        await pline(`${Shknam(shkp)} ${rn2(2) ? 'seems to be napping' : "doesn't respond"}.`);
        return ECMD_OK;
    }

    if (shkp !== resident && shkp.mpeaceful /* NOTANGRY */) {
        umoney = money_cnt(game.invent);
        if (!ltmp) {
            await You(`do not owe ${shkname(shkp)} anything.`);
        } else if (!umoney) {
            await You(`${stashed_gold ? 'seem to ' : ''}have no gold.`);
            if (stashed_gold)
                await pline('But you have some gold stashed away.');
        } else {
            if (umoney > ltmp) {
                await You(`give ${shkname(shkp)} the ${ltmp} gold piece${plur(ltmp)} ${noit_mhe(shkp)} asked for.`);
                await pay(ltmp, shkp);
            } else {
                await You(`give ${shkname(shkp)} all your${stashed_gold ? ' openly kept' : ''} gold.`);
                await pay(umoney, shkp);
                if (stashed_gold)
                    await pline('But you have hidden gold!');
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
        if (!ltmp && shkp.mpeaceful /* NOTANGRY */) {
            await You(`do not owe ${shkname(shkp)} anything.`);
            if (!umoney)
                await pline(no_money(stashed_gold ? ' seem to' : ''));
        } else if (ltmp) {
            await pline(`${shkname(shkp)} is after blood, not gold!`);
            if (umoney < Math.trunc(ltmp / 2) || (umoney < ltmp && stashed_gold)) {
                if (!umoney)
                    await pline(no_money(stashed_gold ? ' seem to' : ''));
                else
                    await pline(not_enough_money(noit_mhim(shkp)));
                return ECMD_TIME;
            }
            await pline(`But since ${noit_mhis(shkp)} shop has been robbed recently,`);
            await pline(`you ${(umoney < ltmp) ? 'partially ' : ''}compensate ${shkname(shkp)} for ${noit_mhis(shkp)} losses.`);
            await pay(umoney < ltmp ? umoney : ltmp, shkp);
            await make_happy_shk(shkp, false);
        } else {
            /* shopkeeper is angry, but has not been robbed --
             * door broken, attacked, etc. */
            await pline(`${Shknam(shkp)} is after your hide, not your gold!`);
            if (umoney < 1000) {
                if (!umoney)
                    await pline(no_money(stashed_gold ? ' seem to' : ''));
                else
                    await pline(not_enough_money(noit_mhim(shkp)));
                return ECMD_TIME;
            }
            await You(`try to appease ${
                canspotmon(shkp)
                    ? x_monnam(shkp, ARTICLE_THE, 'angry', 0, false)
                    : shkname(shkp)} by giving ${noit_mhim(shkp)} 1000 gold pieces.`);
            await pay(1000, shkp);
            if ((eshkp.customer || '').slice(0, PL_NSIZ) !== (game.plname || '').slice(0, PL_NSIZ)
                || rn2(3))
                await make_happy_shk(shkp, false);
            else
                await pline(`But ${shkname(shkp)} is as angry as ever.`);
        }
        return ECMD_TIME;
    }
    if (shkp !== resident) {
        await impossible('dopay: not to shopkeeper?');
        if (resident)
            setpaid(resident);
        return ECMD_OK;
    }
    /* pay debt, if any, first */
    if (eshkp.debit) {
        let dtmp = eshkp.debit;
        const loan = eshkp.loan | 0;
        let sbuf;

        umoney = money_cnt(game.invent);
        sbuf = `You owe ${shkname(shkp)} ${dtmp} ${currency(dtmp)} `;
        if (loan) {
            if (loan === dtmp)
                sbuf += 'you picked up in the store.';
            else
                sbuf += 'for gold picked up and the use of merchandise.';
        } else {
            sbuf += 'for the use of merchandise.';
        }
        await pline(sbuf);
        if (umoney + (eshkp.credit | 0) < dtmp) {
            await pline(`But you don't${stashed_gold ? ' seem to' : ''} have enough gold${
                        eshkp.credit ? ' or credit' : ''}.`);
            return ECMD_TIME;
        } else {
            if ((eshkp.credit | 0) >= dtmp) {
                eshkp.credit -= dtmp;
                eshkp.debit = 0;
                eshkp.loan = 0;
                await Your('debt is covered by your credit.');
            } else if (!eshkp.credit) {
                await money2mon(shkp, dtmp);
                eshkp.debit = 0;
                eshkp.loan = 0;
                await You('pay that debt.');
                (game.disp ||= {}).botl = true;
            } else {
                dtmp -= eshkp.credit;
                eshkp.credit = 0;
                await money2mon(shkp, dtmp);
                eshkp.debit = 0;
                eshkp.loan = 0;
                await pline('That debt is partially offset by your credit.');
                await You('pay the remainder.');
                (game.disp ||= {}).botl = true;
            }
            paid = true;
        }
    }

    /* now check items on bill */
    pay_done = true; /* assume success */
    if (eshkp.billct) {
        ibill = await make_itemized_bill(shkp);
        const ibillct = ibill.length;
        const paid_p = { v: paid };

        if (!(await pay_billed_items(shkp, ibillct, ibill, stashed_gold, paid_p)))
            pay_done = false; /* skip thank you message */
        paid = paid_p.v;
    }

    /* {mute shk,deaf hero}-aware thank you message */
    if (pay_done && shkp.mpeaceful /* !ANGRY */ && paid) {
        if (!Deaf() && !muteshk(shkp)) {
            /* SetVoice(shkp, 0, 80, 0); */
            await verbalize(`Thank you for shopping in ${s_suffix(shkname(shkp))} ${
                            shtypes[eshkp.shoptype - SHOPBASE].name}${
                            !eshkp.surcharge ? '!' : '.'}`);
        } else {
            await pline(`${Shknam(shkp)} nods${!eshkp.surcharge ? ' appreciatively' : ''} at you for shopping in ${
                        noit_mhis(shkp)} ${shtypes[eshkp.shoptype - SHOPBASE].name}${
                        !eshkp.surcharge ? '!' : '.'}`);
        }
    }

    if (paid)
        update_inventory();
    game.iflags.menu_requested = false; /* reset */
    /* free the sortbill array used for itemized billing */
    ibill = null;
    return paid ? ECMD_TIME : ECMD_OK;
}

// src/shk.c:2038 pay_billed_items() — for menustyle=Traditional, choose
// between paying for everything (by declining to itemize), asking
// item-by-item (by accepting itemization), or switch to selecting via menu
// (special 'm' answer at "Itemize? [ynq m]" prompt); for other menustyles,
// always select via menu; player can use 'm' prefix before 'p' command to
// invert those behaviors; once the method is chosen, actually pay for the
// selected items, item by item for as long as hero has enough credit+cash
async function pay_billed_items(shkp, ibillct, ibill, stashed_gold, paid_p /* output {v} */) {
    let bp;
    let otmp;
    let umoney;
    let itemize, more_than_one;
    let queuedpay = false, via_menu;
    let buy, indx, bidx, pass, iprompt, ebillct;
    const eshkp = ESHK(shkp);

    umoney = money_cnt(game.invent);
    if (!umoney && !eshkp.credit) {
        await You(`${stashed_gold ? 'seem to ' : ''}have no gold or credit${paid_p.v ? ' left' : ''}.`);
        return true;
    }
    bp = eshkp.bill_p[0];
    otmp = bp_to_obj(bp);
    ebillct = eshkp.billct | 0;
    more_than_one = (ebillct > 1 || otmp.quan < bp.bquan
                     /* note: will only get here for a single item, so
                        we can deduce that it is ibill[0] */
                     || ibill[0].usedup === UndisclosedContainer);
    if ((umoney + (eshkp.credit | 0)) < cheapest_item(ibillct, ibill)) {
        await You(`don't have enough gold to buy${more_than_one ? ' any of' : ''} the item${
                  plur(more_than_one ? 2 : 1)} ${(ebillct > 1) ? "you've picked" : 'on your bill'}.`);
        if (stashed_gold)
            await pline('Maybe you have some gold stashed away?');
        return true;
    }

    via_menu = ((game.flags?.menu_style ?? 2) !== MENU_TRADITIONAL);
    /* allow 'm p' to request a menu for menustyle:traditional;
       for other styles, it will do the opposite; that doesn't make
       a whole lot of sense for a 'request-menu' prefix, but otherwise
       it would simply be redundant and there wouldn't be any way to
       skip the menu when hero owes for multiple items */
    if (game.iflags.menu_requested)
        via_menu = !via_menu;
    /* this will loop for a second iteration iff not initially using a
       menu and player answers 'm' at custom ynq prompt */
    do {
        if (via_menu /*&& more_than_one*/ ) {
            if (!(await menu_pick_pay_items(ibillct, ibill)))
                return true;
            queuedpay = true;
            itemize = false;
            via_menu = false; /* reset so that we don't loop */
        } else {
            iprompt = !more_than_one ? 'y'
                      : await tty_yn_function('Itemized billing?', 'ynq m', 'q', true);
            if (iprompt === 'q')
                return true;
            itemize = (iprompt === 'y');
            via_menu = (iprompt === 'm');
        }
    } while (via_menu);

    /*
     * 5.0:  this used to make two passes through eshkp->bill_p[],
     * the first for used up items and the second for unpaid ones.
     * Items which were partly used were processed on both passes.
     *
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
            const boxbag_result = await buy_container(shkp, indx, ibillct, ibill);

            if (boxbag_result === 0) {
                buy = PAY_BUY;
            } else { /* buy_container() failed... */
                if (boxbag_result === 2)    /* ... but didn't explain why */
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
            paid_p.v = true;
            return true;
        case PAY_SKIP:
            continue;
     /* case PAY_SOME: //no longer used */
        case PAY_BUY:
            paid_p.v = true;
            if (itemize || queuedpay) {
                update_inventory();
                await bot();
            }
            break;
        }
    }
    return true;
}

// src/shk.c:2178 update_bill() — update shk's bill and augmented bill
// after an item has been purchased
function update_bill(indx /* index into ibill[]; -1 for unpaid contained item */,
                     ibillct, ibill, eshkp, bp, paiditem) {
    let j, newebillct;

    /* remove from eshkp->bill_p[] unless this was the used up portion
       of partly used item (since removal would take out both; note:
       can't buy PartlyIntact until PartlyUsedUp has been paid for) */
    if (indx >= 0 && ibill[indx].usedup === PartlyUsedUp) {
        /* 'paiditem' points to the partly intact portion still in invent or
           inside a container (ibill[indx].obj points to the container) */
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
        if (paiditem.where === OBJ_ONBILL) {
            obj_extract_self(paiditem);
            /* dealloc_obj(paiditem) */
        }
        newebillct = (eshkp.billct | 0) - 1;
        const bidx = eshkp.bill_p.indexOf(bp);
        eshkp.bill_p[bidx] = eshkp.bill_p[newebillct]; /* *bp = bill_p[newebillct] */
        eshkp.bill_p.length = newebillct;
        for (j = 0; j < ibillct; ++j)
            if (ibill[j].bidx === newebillct)
                ibill[j].bidx = bidx; /* (bp - eshkp->bill_p) */
        eshkp.billct = newebillct; /* eshkp->billct - 1 */
    }
    return;
}

// src/shk.c:2217 dopayobj() — return 2 if used-up portion paid,
// 1 if paid successfully, 0 if not enough money, -1 if skip this object,
// -2 if no money/credit left
async function dopayobj(shkp, bp, obj, which /* 0 => used-up item, 1 => other (unpaid or lost) */,
                        itemize, unseen) {
    let ltmp, quan, save_quan;
    let buy;
    const consumed = (which === 0);

    if (!obj.unpaid && !bp.useup
        && !(Has_contents(obj) && await unpaid_cost(obj, COST_CONTENTS))) {
        await impossible('Paid object on bill??');
        return PAY_BUY;
    }
    if (itemize && await insufficient_funds(shkp, obj, 0)) {
        return PAY_BROKE;
    }
    /* we may need to temporarily adjust the object, if part of the
       original quantity has been used up but part remains unpaid; [note:
       this predates 'ibill[]' and feels redundant but still works] */
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
    game.iflags.suppress_price = (game.iflags.suppress_price | 0) + 1; /* affects containers */
    buy = PAY_BUY; /* flag; if changed then return early */

    if (itemize) {
        /*
         * TODO:
         *  This should also accept 'a' and 'q' to end itemized paying:
         *  'a' to buy the rest without asking, 'q' to just stop.
         */
        const qsfx = ` for ${ltmp} ${currency(ltmp)}.  Pay?`;
        const qbuf = safe_qbuf(null, qsfx, obj,
                               (quan === 1) ? Doname2 : doname, ansimpleoname,
                               (quan === 1) ? 'that' : 'those');
        if (await tty_yn_function(qbuf, 'yn', 'n', true) === 'n') { /* y_n() */
            buy = PAY_SKIP;                         /* don't want to buy */
        }
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
                                    ? 'paid for %s at a cost of %ld gold piece%s.%s'
                                    : 'bought %s for %ld gold piece%s.%s',
                                ltmp, '');
    }

    /* restore obj to original state */
    obj.quan = save_quan; /* restore original count */
    game.iflags.suppress_price--;

    return buy;
}

// src/shk.c:2350 buy_container() — pay for the unpaid contents of a
// container without itemizing, and for the container itself if it is
// unpaid too; returns 0==successfully bought; 1==rejected, message given
// here; 2=rejected, caller should issue message
async function buy_container(shkp, indx, ibillct, ibill) {
    let boid;
    const boids = [];
    let i, j, buy, buycount = 0, boidsct = 0;
    const eshkp = ESHK(shkp);
    const ebillct = eshkp.billct | 0;
    let bp;
    let otmp, otop;
    const container = ibill[indx].obj;
    const unpaidcontainer = container.unpaid;
    const totalcost = ibill[indx].cost;
    const sightunseen = ibill[indx].usedup === UndisclosedContainer
                          /* give feedback just for container+contents rather
                             than for individiual contents even when those
                             contents are known */
                          || ibill[indx].usedup === KnownContainer;

    /* check for no-gold first, then for not-enough-gold; feedback is
       different for the two cases */
    if (await insufficient_funds(shkp, container, 0)
        || await insufficient_funds(shkp, container, totalcost))
        return 1; /* message given by insufficent_funds() */

    /* check for partly intact portion of a not-yet-paid partly used item */
    for (i = 0; i < ebillct; ++i) {
        bp = eshkp.bill_p[i];
        otmp = bp_to_obj(bp); /* ibill[bidx].obj is the container */
        if (!otmp) {
            await impossible(`Can't find contained item on shop bill (#${bp.bo_id}).`);
            return 2; /* failure; have caller give a generic message */
        }
        if (otmp.where !== OBJ_CONTAINED && !Has_contents(otmp))
            continue;
        /* otmp is contained, but possibly inside a different container */
        for (otop = otmp; otop.where === OBJ_CONTAINED;
             otop = otop.ocontainer)
            continue; /* where==OBJ_CONTAINED loop */
        if (otop !== container)
            continue; /* 'i' loop */
        /* now check for partly intact portion of partly used item */
        if (otmp.quan < bp.bquan) {
            await reject_purchase(shkp, otmp, bp.bquan);
            return 1; /* message given by reject_purchase() */
        }
        /* record this for the second pass; unless it's the container--that
           will be deferred until after the loop so that it will be last */
        if (bp.bo_id !== container.o_id)
            boids[boidsct++] = bp.bo_id;
    }
    if (unpaidcontainer)
        boids[boidsct++] = container.o_id;

    /* now make the actual purchasing pass; we've collected a set of
       o_id values in order to avoid traversing the shk's bill while it
       undergoes updates */
    for (j = 0; j < boidsct; ++j) {
        boid = boids[j];
        /* the C scans its stale 'ebillct' entries of bill_p[]; ours is
           truncated by update_bill(), so the live entries are searched and
           a miss lands on the same 'i == ebillct' */
        for (i = 0; i < ebillct; ++i) {
            bp = eshkp.bill_p[i];
            if (i < (eshkp.billct | 0) && bp && bp.bo_id === boid)
                break;
        }
        if (i === ebillct) {
            await impossible(`Buying ${simpleonames(container)} contents: item #${boid} disappeared from bill.`);
            return 2;
        }
        otmp = bp_to_obj(bp);

        buy = await dopayobj(shkp, bp, otmp, 1, false, sightunseen);
        if (buy !== PAY_BUY) {
            await impossible(`Buying ${simpleonames(container)} contents failed unexpectedly (#${otmp.o_id} ${buy}).`);
            continue;
        }
        /* [updating cost here is not necessary but useful when debugging] */
        ibill[indx].cost -= (bp.price * bp.bquan); /* update container */
        update_bill((boid === container.o_id) ? indx : -1,
                    ibillct, ibill, eshkp, bp, otmp);
        ++buycount;
    }
    if (buycount && sightunseen) {
        /* if the container was unpaid, the hero has just purchased it;
           normally paydoname()--called by shk_names_obj()--would give
           "contents of your <container>" when it's hero-owned but we
           want it to reflect container's state before purchase;
           since paydoname() isn't called for no_charge items, we use
           obj->no_charge as a hack to avoid that phrasing in favor of
           "a/an <container> and its contents"; temporarily set
           obj->unpaid to reflect the before-purchase state too */
        if (unpaidcontainer)
            container.unpaid = container.no_charge = 1;
        await shk_names_obj(shkp, container,
                            'bought %s for %ld gold piece%s.%s',
                            totalcost, '');
        container.unpaid = container.no_charge = 0;
    }

    return buycount ? 0 : 2; /* we don't expect buycount to be 0 */
}

// src/shk.c:2447 reject_purchase() — called if an item on shop bill is
// partly used up and partly intact and player tries to buy the intact
// portion before paying for used up portion
async function reject_purchase(shkp, obj, billed_quan) {
    const intact_quan = obj.quan;

    /* assert(intact_quan < billed_quan); */
    /* temporarily change obj to refer to the used up portion */
    obj.quan = billed_quan - intact_quan;
    if (!Deaf() && !muteshk(shkp)) {
        let which;

        if (obj.where === OBJ_CONTAINED)
            which = `the one${plur(intact_quan)} in ${thesimpleoname(obj.ocontainer)}`;
        else
            which = (intact_quan > 1) ? 'these' : 'this one';

        /* SetVoice(shkp, 0, 80, 0); */
        await verbalize(`${!shkp.mpeaceful ? 'Pay' : 'Please pay'} for the other ${
                        simpleonames(obj)} before buying ${which}.`);
    } else {
        await pline(`${Shknam(shkp)} ${!shkp.mpeaceful ? 'angrily ' : ''}${
                    nolimbs(shkp.data) ? 'motions to' : 'points out'} your bill for the other ${
                    simpleonames(obj)} first.`);
    }
    obj.quan = intact_quan;
}

// src/shk.c:2480 insufficient_funds()
async function insufficient_funds(shkp, item, cost /* 0: check for no-gold; >0: check for specified amount */) {
    let stashed_gold;
    const umoney = money_cnt(game.invent),
          ecredit = ESHK(shkp).credit | 0;

    /* dopayobj() checks for no-gold early and not-enough-gold later;
       buy_container() checks for both early but uses separate calls to us */
    if (!cost && umoney + ecredit === 0) {
        stashed_gold = hidden_gold(game.invent, true);
        await You(`${(stashed_gold > 0) ? 'seem to ' : ''}have no gold or credit left.`);
        return true;
    }
    if (cost && umoney + ecredit < cost) {
        stashed_gold = hidden_gold(game.invent, true);
        await You(`don't${(stashed_gold > 0) ? ' seem to' : ''} have gold${
                  (ecredit > 0) ? ' or credit' : ''} enough to pay for ${paydoname(item)}.`);
        return true;
    }
    return false;
}

// src/shk.c:3413 shk_names_obj() — "You bought %s for %ld gold pieces."
// and its variants; fmt carries the C's %s/%ld/%s/%s slots for
// doname(obj), amt, plur(amt) and arg
async function shk_names_obj(shkp, obj, fmt, amt, arg) {
    let obj_name;
    let was_unknown = !obj.dknown;
    const fill = (f, args) => f.replace(/%s|%ld/g, () => String(args.shift()));

    observe_object(obj);
    /* Use real name for ordinary weapons/armor, and spell-less
     * scrolls/books (that is, blank and mail), but only if the
     * object is within the shk's area of interest/expertise.
     */
    if (!game.objects[obj.otyp].oc_magic && saleable(shkp, obj)
        && (obj.oclass === OCLASSES.WEAPON_CLASS || obj.oclass === OCLASSES.ARMOR_CLASS
            || obj.oclass === OCLASSES.SCROLL_CLASS || obj.oclass === OCLASSES.SPBOOK_CLASS
            || obj.otyp === ONAMES.MIRROR)) {
        was_unknown = was_unknown || !game.objects[obj.otyp].oc_name_known;
        makeknown(obj.otyp);
    }
    obj_name = paydoname(obj);
    /* Use an alternate message when extra information is being provided */
    if (was_unknown) {
        obj_name = highc(obj_name[0]) + obj_name.slice(1);
        await pline(fill('%s; you ' + fmt, [obj_name, (obj.quan > 1) ? 'them' : 'it', amt,
                                              plur(amt), arg]));
    } else {
        await You(fill(fmt, [obj_name, amt, plur(amt), arg]));
    }
}

// src/shk.c:5791 block_door(). A shopkeeper on the usual post blocks a
// diagonal exit through the shop door while the customer still owes money.
export async function block_door(x, y) {
    const rooms = in_rooms(x, y, SHOPBASE);
    if (!rooms.length)
        return false;
    const roomno = rooms.charCodeAt(0);
    if (roomno < 0 || !IS_SHOP(roomno))
        return false;
    if (!IS_DOOR(game.level.at(x, y).typ))
        return false;
    if (roomno !== (game.u.ushops?.charCodeAt?.(0) ?? -1))
        return false;

    const shkp = shop_keeper(roomno);
    if (!shkp || !inhishop(shkp))
        return false;

    const eshk = shkp.eshk || ESHK(shkp);
    if (shkp.mx === eshk.shk.x && shkp.my === eshk.shk.y
        && eshk.shd.x === x && eshk.shd.y === y
        && !helpless(shkp)
        && (eshk.debit || eshk.billct || eshk.robbed)) {
        await pline(`${shopkeeper_name(shkp)}${Invis()
            ? ' senses your motion and' : ''} blocks your way!`);
        return true;
    }
    return false;
}

// src/shk.c:5826 block_entry() — used in domove to block diagonal
// shop-entry; u.ux, u.uy should always be a door
export async function block_entry(x, y) {
    const ust = game.level.at(game.u.ux, game.u.uy);
    if (!(IS_DOOR(ust.typ) && ust.doormask === D_BROKEN))
        return false;

    const rooms = in_rooms(x, y, SHOPBASE);
    if (!rooms.length)
        return false;
    const roomno = rooms.charCodeAt(0);
    if (roomno < 0 || !IS_SHOP(roomno))
        return false;
    const shkp = shop_keeper(roomno);
    if (!shkp || !inhishop(shkp))
        return false;

    const eshk = shkp.eshk || ESHK(shkp);
    if (eshk.shd.x !== game.u.ux || eshk.shd.y !== game.u.uy)
        return false;

    const sx = eshk.shk.x;
    const sy = eshk.shk.y;

    if (shkp.mx === sx && shkp.my === sy && !helpless(shkp)
        && (x === sx - 1 || x === sx + 1 || y === sy - 1 || y === sy + 1)
        && (Invis() || carrying(ONAMES.PICK_AXE) || carrying(ONAMES.DWARVISH_MATTOCK)
            || game.u.usteed)) {
        await pline(`${shopkeeper_name(shkp)}${
            Invis() ? ' senses your motion and' : ''} blocks your way!`);
        return true;
    }
    return false;
}

// src/monmove.c:189 (shared predicate lives with the C's users): is the
// shopkeeper inside his own shop? js/monmove.js holds the test.
export { inhishop };

// src/shk.c:4399 add_damage()
export function add_damage(x, y, cost) {
    const lev = game.level?.at(x, y);
    if (!lev)
        return;

    if (IS_DOOR(lev.typ)) {
        let realEntrance = false;
        for (const room of in_rooms(x, y, SHOPBASE)) {
            const shkp = shop_keeper(room.charCodeAt(0));
            const shd = shkp ? (shkp.eshk || ESHK(shkp))?.shd : null;
            if (shd && shd.x === x && shd.y === y) {
                realEntrance = true;
                break;
            }
        }
        if (!realEntrance)
            return;
    }

    const damage = game.level.damagelist ||= [];
    const old = damage.find(dam => dam.x === x && dam.y === y);
    if (old) {
        old.cost += cost;
        old.when = game.moves;
        return;
    }

    damage.unshift({
        when: game.moves,
        x,
        y,
        cost,
        typ: lev.typ,
        flags: lev.flags,
        wall_info: lev.wall_info,
        doormask: lev.doormask,
    });
    if (cansee(x, y))
        lev.seenv = SVALL;
}

function cad(altusage) {
    const gender = is_demon(game.youmonst?.data) ? 3 : poly_gender();
    const address = ['cad', 'minx', 'beast', 'fiend'][gender] || 'thing';
    if (!altusage)
        return address;
    return `"${address[0].toUpperCase()}${address.slice(1)}!  `;
}

async function getcad(shkp, dmgstr, x, y, uinshp, animal, pursue) {
    const dugwall = (dmgstr === 'dig into'    /* wand */
                     || dmgstr === 'damage'); /* pick-axe */

    if (muteshk(shkp)) {
        if (animal && !helpless(shkp))
            await yelp(shkp);
    } else if (pursue || uinshp || !um_dist(x, y, 1)) {
        if (!Deaf()) {
            await verbalize(`How dare you ${dmgstr} my ${dugwall ? 'shop' : 'door'}?`);
        } else {
            await pline(`${shopkeeper_name(shkp)} is ${
                angrytexts[rn2(angrytexts.length)]} that you decided to ${
                dmgstr} ${noit_mhis(shkp)} ${dugwall ? 'shop' : 'door'}!`);
        }
    } else {
        if (!Deaf()) {
            await pline(`${shopkeeper_name(shkp)} shouts:`);
            await verbalize(`Who dared ${dmgstr} my ${dugwall ? 'shop' : 'door'}?`);
        } else {
            await pline(`${shopkeeper_name(shkp)} is ${
                angrytexts[rn2(angrytexts.length)]} that someone decided to ${
                dmgstr} ${noit_mhis(shkp)} ${dugwall ? 'shop' : 'door'}!`);
        }
    }
    hot_pursuit(shkp);
}

async function home_shk(shkp) {
    const eshk = shkp.eshk || ESHK(shkp);
    const { mnearto } = await import('./mon.js');
    await mnearto(shkp, eshk.shk.x, eshk.shk.y, true, RLOC_NOMSG);
    game.level.flags.has_shop = 1;
    await after_shk_move(shkp);
}

// src/shk.c:5174 pay_for_damage()
export async function pay_for_damage(dmgstr, cant_mollify = false) {
    let shkp = null;
    let appearHere = null;
    let cost = 0;
    let nearestShk = Number.MAX_SAFE_INTEGER;
    let nearestDamage = Number.MAX_SAFE_INTEGER;
    let picks = 0;

    for (const dam of game.level?.damagelist || []) {
        if (dam.when !== game.moves || !dam.cost)
            continue;
        cost += dam.cost;
        for (const room of in_rooms(dam.x, dam.y, SHOPBASE)) {
            const candidate = shop_keeper(room.charCodeAt(0));
            if (!candidate)
                continue;
            if (candidate === shkp) {
                const damageDistance = distu(dam.x, dam.y);
                if (damageDistance < nearestDamage) {
                    nearestDamage = damageDistance;
                    appearHere = dam;
                }
                continue;
            }
            if (!inhishop(candidate))
                continue;
            const distance = mdistu(candidate);
            if (distance > nearestShk)
                continue;
            if (distance === nearestShk && picks) {
                if (rn2(++picks))
                    continue;
            } else {
                picks = 1;
            }
            shkp = candidate;
            nearestShk = distance;
            appearHere = dam;
            nearestDamage = distu(dam.x, dam.y);
        }
    }

    if (!cost || !shkp || !appearHere)
        return;

    const eshk = shkp.eshk || ESHK(shkp);
    const uinshp = !!(game.u.ushops || '').length;
    const animal = (shkp.data?.msound ?? 0) <= MSOUND.MS_ANIMAL;
    const { x, y } = appearHere;
    eshk.customer = game.plname || '';

    if (!shkp.mpeaceful || eshk.following) {
        hot_pursuit(shkp);
        return;
    }

    if (!in_rooms(shkp.mx, shkp.my, SHOPBASE)) {
        if (cansee(shkp.mx, shkp.my))
            await getcad(shkp, dmgstr, x, y, uinshp, animal, true);
        return;
    }

    let pursue = false;
    if (uinshp) {
        const distance = distmin(game.u.ux, game.u.uy, shkp.mx, shkp.my);
        if (distance > 1 && distance <= 3) {
            await pline(`${shopkeeper_name(shkp)} leaps towards you!`);
            const { mnexto } = await import('./mon.js');
            await mnexto(shkp, RLOC_NOMSG);
        }
        pursue = distmin(game.u.ux, game.u.uy, shkp.mx, shkp.my) > 1;
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
                    await You_hear('an angry voice:');
                    await verbalize('Out of my way, scum!');
                }
                await tty_wait_synch();
                /* sleep(1) */
            } else {
                await growl(shkp);
            }
        }
        await mnearto(shkp, x, y, true, RLOC_MSG);
    }

    if ((!uinshp && distmin(game.u.ux, game.u.uy, x, y) > 1)
        || cant_mollify
        || money_cnt(game.invent || []) + (eshk.credit || 0) < cost
        || !rn2(50)) {
        await getcad(shkp, dmgstr, x, y, uinshp, animal, pursue);
        return;
    }

    if (Invis())
        await pline(`Your invisibility does not fool ${shopkeeper_name(shkp)}!`);
    const answer = await tty_yn_function(
        `${animal ? '' : cad(true)}You did ${cost} ${currency(cost)} worth of damage!${
            animal ? '' : '"'}  Pay?`,
        'yn', 'n');
    if (answer !== 'n') {
        const wasSeen = canseemon(shkp);
        const wasOutside = !inhishop(shkp);
        const sx = shkp.mx, sy = shkp.my;
        let balance = cost;
        if (eshk.credit) {
            if (eshk.credit >= balance) {
                await pline('The price is deducted from your credit.');
                eshk.credit -= balance;
                balance = 0;
            } else {
                await pline('The price is partially covered by your credit.');
                balance -= eshk.credit;
                eshk.credit = 0;
            }
        }
        if (balance > 0)
            await money2mon(shkp, balance);
        (game.disp ||= {}).botl = true;
        await pline(`Mollified, ${shopkeeper_name(shkp)} accepts your restitution.`);
        await home_shk(shkp);
        shkp.mpeaceful = 1;
        if (shkp.mx !== sx || shkp.my !== sy) {
            const isSeen = canseemon(shkp);
            if (wasOutside && canspotmon(shkp)) {
                await pline(`${shopkeeper_name(shkp)} returns to ${
                    shk_pronouns(shkp).his} shop.`);
            } else if (isSeen || wasSeen) {
                await pline(`${shopkeeper_name(shkp)} ${!wasSeen
                    ? 'appears' : isSeen ? 'shifts location' : 'disappears'}.`);
            }
        }
    } else {
        if (!animal && !Deaf() && !muteshk(shkp))
            await pline('"Oh, yes!  You\'ll pay!"');
        else if (animal)
            await growl(shkp);
        hot_pursuit(shkp);
        adjalign(-Math.sign(game.u.ualign?.type || 0));
    }
}

function shk_impaired(shkp) {
    return !shkp || !shkp.isshk || !inhishop(shkp)
        || helpless(shkp) || !!(shkp.eshk || ESHK(shkp))?.following;
}

function repairable_damage(dam, shkp) {
    if (!dam || shk_impaired(shkp)
        || game.moves - dam.when < REPAIR_DELAY)
        return false;

    const { x, y } = dam;
    if (!IS_ROOM(dam.typ)) {
        const mon = m_at(x, y);
        if ((u_at(x, y) && !game.u.uprops?.PASSES_WALLS)
            || (x === shkp.mx && y === shkp.my)
            || (mon && !passes_walls(mon.data)))
            return false;
    }

    const trap = t_at(x, y);
    if (trap && (u_at(x, y) || m_at(x, y)?.mtrapped))
        return false;

    const room = String.fromCharCode((shkp.eshk || ESHK(shkp)).shoproom);
    return in_rooms(x, y, SHOPBASE).includes(room);
}

function find_damage(shkp) {
    if (shk_impaired(shkp))
        return null;
    return (game.level?.damagelist || [])
        .find(dam => repairable_damage(dam, shkp)) || null;
}

/* src/shk.c:4579 */
const LITTER_UPDATE = 0x01, LITTER_OPEN = 0x02, LITTER_INSHOP = 0x04;
const horiz = (i) => (i % 3) - 1;
const vert = (i) => Math.trunc(i / 3) - 1;

/* svl.level.objects[x][y]: the top of the floor pile at <x,y> */
function level_objects_at(x, y) {
    return (game.level?.objects || []).find(
        o => o.ox === x && o.oy === y
             && (o.where === undefined || o.where === OBJ_FLOOR)) || null;
}

// src/shk.c:4591 litter_getpos() — fill litter[] with the adjacent spots a
// repaired gap can scatter its items to; k counts the ones inside the shop
function litter_getpos(litter, x, y, shkp) {
    let k = 0; /* number of adjacent shop spots */

    litter.fill(0);

    if (level_objects_at(x, y) && !IS_ROOM(game.level.at(x, y).typ)) {
        for (let i = 0; i < 9; i++) {
            const ix = x + horiz(i);
            const iy = y + vert(i);
            if (i === 4 || !isok(ix, iy) || !ZAP_POS(game.level.at(ix, iy).typ))
                continue;
            litter[i] = LITTER_OPEN;
            if (inside_shop(ix, iy) === (shkp.eshk || ESHK(shkp)).shoproom) {
                litter[i] |= LITTER_INSHOP;
                ++k;
            }
        }
    }
    return k;
}

// src/shk.c:4622 litter_scatter() — move items from a gap in a shop's wall
// that is being repaired; litter[] guarantees that items will end up inside
// shkp's shop, but if the wall being repaired is shared by two shops the
// items might have started in the other shop
async function litter_scatter(litter, x, y, shkp) {
    let otmp;

    /* placement below assumes there is always at least one adjacent spot
       that's inside the shop; caller guarantees that */
    {
        /* Scatter objects haphazardly into the shop */
        if (game.u.uball && !game.u.uswallow /* Punished */
            && ((game.u.uchain.ox === x && game.u.uchain.oy === y)
                || (game.u.uball.where === OBJ_FLOOR
                    && game.u.uball.ox === x && game.u.uball.oy === y))) {
            /*
             * Either the ball or chain is in the repair location.
             * Take the easy way out and put ball&chain under hero.
             */
            if (!Deaf() && !muteshk(shkp)) {
                await verbalize('Get your junk out of my wall!');
            }
            await unplacebc(); /* pick 'em up */
            await placebc();   /* put 'em down */
        }
        while ((otmp = level_objects_at(x, y)) != null) {
            /* Don't mess w/ boulders -- just merge into wall */
            if (otmp.otyp === ONAMES.BOULDER || otmp.otyp === ONAMES.ROCK) {
                obj_extract_self(otmp);
                obfree(otmp, null);
            } else {
                let trylimit = 10;
                let i = rn2(9), ix, iy;

                /* otmp must be moved otherwise svl.level.objects[x][y] will
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

// src/shk.c:4712 litter_newsyms()
function litter_newsyms(litter, x, y) {
    for (let i = 0; i < 9; i++)
        if (litter[i] & LITTER_UPDATE)
            newsym(x + horiz(i), y + vert(i));
}

// src/shk.c:4733 repair_damage() — 0: repair postponed, 1: silent repair
// (no messages), 2: normal repair, 3: untrap
async function repair_damage(shkp, tmp_dam, catchup = false) {
    const litter = new Array(9).fill(0);
    let disposition = 1;
    let stop_picking = false;

    if (!repairable_damage(tmp_dam, shkp))
        return 0;

    const { x, y } = tmp_dam;
    const seeit = cansee(x, y);

    const ttmp = t_at(x, y);
    if (ttmp) {
        switch (ttmp.ttyp) {
        case LANDMINE:
        case BEAR_TRAP: {
            /* convert to an object */
            const otmp = mksobj((ttmp.ttyp === LANDMINE) ? ONAMES.LAND_MINE : ONAMES.BEARTRAP,
                                true, false);
            otmp.quan = 1;
            otmp.owt = weight(otmp);
            if (!catchup) {
                if (canseemon(shkp) && dist2(x, y, shkp.mx, shkp.my) <= 2)
                    await pline(`${shopkeeper_name(shkp)} untraps ${ansimpleoname(otmp)}.`);
                else if (ttmp.tseen && cansee(ttmp.tx, ttmp.ty))
                    await pline(`The ${trapname(ttmp.ttyp, true)} vanishes.`);
            }
            mpickobj(shkp, otmp);
            break;
        }
        case HOLE:
        case PIT:
        case SPIKED_PIT:
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
    const lev = game.level.at(x, y);
    if (IS_ROOM(tmp_dam.typ)
        || (tmp_dam.typ === lev.typ
            && (!IS_DOOR(tmp_dam.typ) || lev.doormask > D_BROKEN)))
        /* no terrain fix necessary (trap removal or manually repaired) */
        return disposition;

    if (closed_door(x, y))
        stop_picking = picking_at(x, y);

    /* door or wall repair; trap, if any, is now gone;
       restore original terrain type and move any items away;
       rm.doormask and rm.wall_info are both overlaid on rm.flags
       so the new flags value needs to match the restored typ */
    lev.typ = tmp_dam.typ;
    if (IS_DOOR(tmp_dam.typ)) {
        lev.doormask = D_CLOSED; /* arbitrary */
    } else { /* not a door; set rm.wall_info or whatever old flags are relevant */
        lev.flags = tmp_dam.flags;
        lev.wall_info = tmp_dam.wall_info;
    }

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
        if (IS_WALL(tmp_dam.typ)) {
            /* player sees actual repair process, so KNOWS it's a wall */
            lev.seenv = SVALL;
            await pline('Suddenly, a section of the wall closes up!');
        } else if (IS_DOOR(tmp_dam.typ)) {
            await pline('Suddenly, the shop door reappears!');
        }
        newsym(x, y);
    } else if (IS_WALL(tmp_dam.typ)) {
        if (inside_shop(game.u.ux, game.u.uy) === (shkp.eshk || ESHK(shkp)).shoproom)
            await You_feel('more claustrophobic than before.');
        else if (!Deaf() && !rn2(10))
            await Norep('The dungeon acoustics noticeably change.');
    }

    if (stop_picking)
        await stop_occupation();

    litter_newsyms(litter, x, y);

    if (disposition < 3)
        disposition = 2;
    return disposition;
}

// src/shk.c:4197 doinvbill()
export async function doinvbill(mode) {
    const shkp = shop_keeper((game.u.ushops || '').charCodeAt(0));
    if (!shkp || !inhishop(shkp)) {
        if (mode !== 0)
            await impossible('doinvbill: no shopkeeper?');
        return 0;
    }
    const eshkp = shkp.eshk || ESHK(shkp);
    if (mode === 0) {
        let cnt = eshkp.debit ? 1 : 0;
        for (const bp of eshkp.bill_p || []) {
            const obj = bp.useup ? null : bp_to_obj(bp);
            if (bp.useup || (obj && obj.quan < bp.bquan))
                cnt++;
        }
        return cnt;
    }
    const datawin = tty_create_nhwindow(NHW_MENU);
    tty_putstr(datawin, 0, 'Unpaid articles already used up:');
    tty_putstr(datawin, 0, '');
    let totused = 0;
    for (const bp of eshkp.bill_p || []) {
        const obj = bp_to_obj(bp);
        if (!obj) {
            await impossible('Bad shopkeeper administration.');
            tty_destroy_nhwindow(datawin);
            return 0;
        }
        if (bp.useup || bp.bquan > obj.quan) {
            const uquan = bp.useup ? bp.bquan : bp.bquan - obj.quan;
            const thisused = bp.price * uquan;
            totused += thisused;
            game.iflags.suppress_price = (game.iflags.suppress_price || 0) + 1;
            const buf = xprname(obj, null, 'x', false, thisused, uquan);
            game.iflags.suppress_price--;
            tty_putstr(datawin, 0, buf);
        }
    }
    if (eshkp.debit) {
        if (totused)
            tty_putstr(datawin, 0, '');
        totused += eshkp.debit;
        tty_putstr(datawin, 0, xprname(null, 'usage charges and/or other fees',
                                      '$', false, eshkp.debit, 0));
    }
    const buf = xprname(null, 'Total:', '*', false, totused, 0);
    tty_putstr(datawin, 0, '');
    tty_putstr(datawin, 0, buf);
    await tty_display_nhwindow(datawin);
    // tty's text window blocks in dmore() on each page.
    do {
        await xwaitforspace(' \r\n\x1b');
    } while (game.morc !== '\x1b' && tty_next_page(datawin));
    tty_destroy_nhwindow(datawin);
    return 0;
}

// src/shk.c:4556 shk_fixes_damage()
async function shk_fixes_damage(shkp) {
    const dam = find_damage(shkp);
    if (!dam)
        return;

    const closeby = mdistu(shkp) <= (BOLT_LIM / 2) ** 2;
    if (canseemon(shkp)) {
        await pline(`${shopkeeper_name(shkp)} whispers ${
            closeby ? 'an incantation' : 'something'}.`);
    } else if (!Deaf() && closeby) {
        await You_hear('someone muttering an incantation.');
    }

    const disposition = await repair_damage(shkp, dam, false);
    if (!disposition)
        return;
    const damage = game.level.damagelist || [];
    const index = damage.indexOf(dam);
    if (index >= 0)
        damage.splice(index, 1);
}

// src/dig.c:597 holetime() — countdown until the hero's dig breaks
// through, or -1 when the hero isn't digging in a shop. The digging
// occupation is not ported, so the occupation test is by its label.
function holetime() {
    if (game.occtxt !== 'digging' || !(game.u.ushops || '').length)
        return -1;
    return Math.trunc((250 - (game.context?.digging?.effort ?? 0)) / 20);
}

// src/shk.c:4880 shk_move() — the shopkeeper's turn. Return values match
// C: -2 died, -1 "let m_move handle it", 0 stayed, 1 moved.
export async function shk_move(shkp) {
    let uondoor = false, avoid = false, badinv;

    const u = game.u;
    const eshkp = shkp.eshk;   /* extras live directly on the monster */
    const omx = shkp.mx;
    const omy = shkp.my;

    if (inhishop(shkp))
        await shk_fixes_damage(shkp);

    const udist = distu(omx, omy);
    if (udist < 3 /* grid bug shk: PM_GRID_BUG can't be a shk */) {
        if (!shkp.mpeaceful /* ANGRY(shkp); Conflict unreached */) {
            const { mattacku } = await import('./mhitu.js');
            await mattacku(shkp);
            return 0;
        }
        if (eshkp.following) {
            if ((eshkp.customer || '') !== (game.plname || '')) {
                if (!Deaf() && !muteshk(shkp)) {
                    await pline(`"${Hello(shkp)}, ${game.plname}!  I was looking for ${
                        eshkp.customer}."`);
                }
                eshkp.following = 0;
                return 0;
            }
            if ((game.moves || 0) > (game.followmsg || 0) + 4) {
                if (!Deaf() && !muteshk(shkp)) {
                    await pline(`"${Hello(shkp)}, ${game.plname}!  Didn't you forget to pay?"`);
                } else {
                    const his = genders[pronoun_gender(
                        shkp, PRONOUN_NO_IT | PRONOUN_HALLU)].his;
                    await pline(`${shopkeeper_name(shkp)} holds out ${his} upturned ${
                        mbodypart(shkp, HAND)}.`);
                }
                game.followmsg = game.moves || 0;
                if (!rn2(9)) {
                    await pline(`${shopkeeper_name(shkp)} doesn't like customers who don't pay.`);
                    rile_shk(shkp);
                }
            }
            if (udist < 2)
                return 0;
        }
    }

    let appr = 1;
    let gtx = eshkp.shk.x;
    let gty = eshkp.shk.y;
    const satdoor = (gtx === omx && gty === omy);
    let z;
    if (eshkp.following || ((z = holetime()) >= 0 && z * z <= udist)) {
        if (udist > 4 && eshkp.following && !eshkp.billct)
            return -1; /* leave it to m_move */
        gtx = u.ux;
        gty = u.uy;
    } else if (!shkp.mpeaceful) {
        /* Move towards the hero if the shopkeeper can see him. */
        if ((shkp.mcansee ?? 1) && m_canseeu(shkp)) {
            gtx = u.ux;
            gty = u.uy;
        }
        avoid = false;
    } else {
        const GDIST = (x, y) => dist2(x, y, gtx, gty);
        if (Invis() || u.usteed) {
            avoid = false;
        } else {
            uondoor = (u.ux === eshkp.shd.x && u.uy === eshkp.shd.y);
            if (uondoor) {
                badinv = (carrying(ONAMES.PICK_AXE)
                          || carrying(ONAMES.DWARVISH_MATTOCK)
                          || (Fast() && (sobj_at(ONAMES.PICK_AXE, u.ux, u.uy)
                                         || sobj_at(ONAMES.DWARVISH_MATTOCK,
                                                    u.ux, u.uy))));
                if (satdoor && badinv)
                    return 0;
                avoid = !badinv;
            } else {
                avoid = ((u.ushops || '').length > 0 && distu(gtx, gty) > 8);
                badinv = false;
            }

            if ((((eshkp.robbed | 0) === 0 && !eshkp.billct && !eshkp.debit)
                 || avoid) && GDIST(omx, omy) < 3) {
                if (!badinv && !online2(omx, omy, u.ux, u.uy))
                    return 0;
                if (satdoor) {
                    appr = 0;
                    gtx = gty = 0;
                }
            }
        }
    }

    z = await move_special(shkp, inhishop(shkp), appr, uondoor, avoid,
                           omx, omy, gtx, gty);
    if (z > 0)
        await after_shk_move(shkp);

    return z;
}

// src/shk.c:4998 after_shk_move() — re-entry bookkeeping after a move.
export async function after_shk_move(shkp) {
    const eshkp = shkp.eshk || ESHK(shkp);

    if (eshkp.bill_p === -1000 && inhishop(shkp)) {
        /* reset bill_p, need to re-calc player's occupancy too */
        eshkp.bill_p = eshkp.bill || [];
        /* only re-check occupancy if game hasn't just ended */
        if (!game.program_state?.gameover)
            await check_special_room(false);
    }
}

// src/shk.c:1118 tended_shop() — shop room has its shopkeeper inside.
export function tended_shop(sroom) {
    const mtmp = sroom.resident;
    return !mtmp ? false : !!inhishop(mtmp);
}

// src/shk.c:1126 noisy_shop() — shop sounds wake the neighborhood.
export async function noisy_shop(sroom) {
    const mtmp = sroom.resident;
    if (mtmp && inhishop(mtmp))
        await wake_nearto(mtmp.mx, mtmp.my, 11 * 11);
}

// include/dungeon.h:112 on_level()
const on_level = (a, b) => !!a && !!b && a.dnum === b.dnum && a.dlevel === b.dlevel;

// src/shk.c:272 set_residency(), record (or clear) a shopkeeper as the
// resident of its shop while on the shop's level.
export function set_residency(shkp, zero_out) {
    const eshk = shkp.eshk || ESHK(shkp);

    if (on_level(eshk.shoplevel, game.u.uz)) {
        const roomidx = eshk.shoproom - ROOMOFFSET;
        const room = game.level?.rooms?.[roomidx]
            || (game.level?.subrooms || [])
                .find(candidate => candidate.roomnoidx === roomidx);

        if (room)
            room.resident = (zero_out) ? null : shkp;
    }
}

// src/shk.c:290 restshk(). bill_p already owns the serialized bill array in JS.
export function restshk(shkp, ghostly) {
    if (!game.u.uz.dlevel)
        return;
    const eshk = shkp.eshk || ESHK(shkp);
    if (eshk.bill_p !== -1000)
        eshk.bill_p ||= [];
    if (ghostly) {
        eshk.shoplevel = {...game.u.uz};
        if (!shkp.mpeaceful
            && eshk.customer.toLowerCase() !== game.plname.toLowerCase())
            pacify_shk(shkp, true);
    }
}

/* src/shk.c:632 credit_report()'s static credit_snap[][] */
const credit_snap = [[0, 0, 0], [0, 0, 0]];
const BEFORE = 0, NOW = 1;

// src/shk.c:628 credit_report(), remember (idx 0) or report (idx 1) how
// the hero's credit, debt, and loan changed.
export async function credit_report(shkp, idx, silent) {
    const eshkp = shkp.eshk || ESHK(shkp);

    if (!idx) {
        credit_snap[BEFORE][0] = credit_snap[NOW][0] = 0;
        credit_snap[BEFORE][1] = credit_snap[NOW][1] = 0;
        credit_snap[BEFORE][2] = credit_snap[NOW][2] = 0;
    } else {
        idx = 1;
    }
    credit_snap[idx][0] = eshkp.credit | 0;
    credit_snap[idx][1] = eshkp.debit | 0;
    credit_snap[idx][2] = eshkp.loan | 0;

    if (idx && !silent) {
        let amt = 0;
        let msg = 'debt has increased';

        if (credit_snap[NOW][0] < credit_snap[BEFORE][0]) {
            amt = credit_snap[BEFORE][0] - credit_snap[NOW][0];
            msg = 'credit has been reduced';
        } else if (credit_snap[NOW][1] > credit_snap[BEFORE][1]) {
            amt = credit_snap[NOW][1] - credit_snap[BEFORE][1];
        } else if (credit_snap[NOW][2] > credit_snap[BEFORE][2]) {
            amt = credit_snap[NOW][2] - credit_snap[BEFORE][2];
        }
        if (amt)
            await Your(`${msg} by ${amt} ${currency(amt)}.`);
    }
}

// src/shk.c:2995 contained_cost(), the price of a container's contents
// (usell: what the shopkeeper would pay; else what the hero owes).
export function contained_cost(obj, shkp, price, usell, unpaid_only) {
    let top;
    const cc = { x: 0, y: 0 };
    let on_floor, freespot;

    for (top = obj; top.where === OBJ_CONTAINED; top = top.ocontainer)
        continue;
    /* pick_obj() removes item from floor, adds it to shop bill, then
       puts it in inventory; behave as if it is still on the floor
       during the add-to-bill portion of that situation */
    on_floor = (top.where === OBJ_FLOOR || top.where === OBJ_FREE);
    if (top.where === OBJ_FREE || !get_obj_location(top, cc, 0))
        cc.x = game.u.ux, cc.y = game.u.uy;
    const eshkp = shkp.eshk || ESHK(shkp);
    freespot = (on_floor && cc.x === eshkp.shk.x && cc.y === eshkp.shk.y);

    /* price of contained objects; "top" container handled by caller */
    for (const otmp of (obj.cobj || [])) {
        if (otmp.oclass === OCLASSES.COIN_CLASS)
            continue;

        if (usell) {
            if (saleable(shkp, otmp) && !otmp.unpaid
                && otmp.oclass !== OCLASSES.BALL_CLASS
                && !(otmp.oclass === OCLASSES.FOOD_CLASS && otmp.oeaten)
                && !(Is_candle(otmp)
                     && otmp.age < 20 * game.objects[otmp.otyp].oc_cost))
                price += set_cost(otmp, shkp);
        } else {
            /* the hero is asked to pay for unpaid items (contents of
               floor containers) inside shop proper;
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

// src/shk.c:3451 billable(), is obj something a shopkeeper would bill?
// shkpp.shkp is the shopkeeper in (non-null if already validated) and out.
export function billable(shkpp, obj, roomno, reset_nocharge) {
    let shkp = shkpp.shkp;

    if (!shkp) {
        if (!roomno)
            return false;
        shkp = shop_keeper(roomno);
        if (!shkp || !inhishop(shkp))
            return false;
        shkpp.shkp = shkp;
    }
    /* perhaps we threw it away earlier */
    if (onbill(obj, shkp, false)
        || (obj.oclass === OCLASSES.FOOD_CLASS && obj.oeaten))
        return false;
    /* outer container might be marked no_charge but still have contents
       which should be charged for; clear no_charge when picking things up */
    if (obj.no_charge) {
        if (!Has_contents(obj) || (contained_gold(obj, true) === 0
                                   && contained_cost(obj, shkp, 0, false,
                                                     !reset_nocharge) === 0))
            shkp = null; /* not billable */
        if (reset_nocharge && !shkp && obj.oclass !== OCLASSES.COIN_CLASS) {
            obj.no_charge = 0;
            if (Has_contents(obj))
                picked_container(obj); /* clear no_charge */
        }
    }
    return shkp ? true : false;
}

/* src/decl.c c_common_strings.c_the_your[] */
const the_your = ['the', 'your'];

// src/shk.c:5885 shk_owns(), "<shk>'s" when a shopkeeper owns obj.
function shk_owns(obj) {
    let shkp;
    const cc = { x: 0, y: 0 };

    if (get_obj_location(obj, cc, 0)
        && (obj.unpaid || (obj.where === OBJ_FLOOR && !obj.no_charge
                            && costly_spot(cc.x, cc.y)))) {
        shkp = shop_keeper(inside_shop(cc.x, cc.y));
        return shkp ? s_suffix(shkname(shkp)) : the_your[0];
    }
    return null;
}

// src/shk.c:5900 mon_owns(), "<monster>'s" when a monster carries obj.
function mon_owns(obj) {
    if (obj.where === OBJ_MINVENT)
        return s_suffix(y_monnam(obj.ocarry));
    return null;
}

// src/shk.c:5862 shk_your(), the ownership prefix for an object name.
export function shk_your(obj) {
    const chk_pm = obj.otyp === ONAMES.CORPSE && ismnum(obj.corpsenm);
    let buf = '';

    if (chk_pm && type_is_pname(game.mons[obj.corpsenm]))
        return buf; /* skip ownership prefix and space: "Medusa's corpse" */
    else if (chk_pm && the_unique_pm(game.mons[obj.corpsenm]))
        buf = 'the'; /* override ownership: "the Oracle's corpse" */
    else if ((buf = shk_owns(obj)) == null && (buf = mon_owns(obj)) == null)
        buf = the_your[carried(obj) ? 1 : 0];
    return buf + ' ';
}

/* include/hack.h um_dist() */
const um_dist = (x, y, n) => (Math.abs(game.u.ux - x) > n || Math.abs(game.u.uy - y) > n);

// src/shk.c:992 shop_debt() — what the hero owes: the running debit plus
// every unpaid item on the bill.
function shop_debt(eshkp) {
    let debt = eshkp.debit | 0;

    for (const bp of (eshkp.bill_p || []))
        debt += bp.price * bp.bquan;
    return debt;
}

// src/shk.c:1003 shopper_financial_report() — the '$' command's credit and
// debt summary, this shop first and then every other shop on the level.
export async function shopper_financial_report() {
    let shkp, this_shkp = shop_keeper(inside_shop(game.u.ux, game.u.uy));
    let eshkp;
    let amt;
    let pass;
    const mons = game.level?.monsters || [];

    eshkp = this_shkp ? ESHK(this_shkp) : null;
    if (eshkp && !(eshkp.credit || shop_debt(eshkp))) {
        await You('have no credit or debt in here.');
        this_shkp = null; /* skip first pass */
    }

    /* pass 0: report for the shop we're currently in, if any;
       pass 1: report for all other shops on this level. */
    for (pass = this_shkp ? 0 : 1; pass <= 1; pass++)
        for (shkp = next_shkp(mons[0] ?? null, false); shkp;
             shkp = next_shkp(mons[mons.indexOf(shkp) + 1] ?? null, false)) {
            if ((shkp !== this_shkp) ^ pass)
                continue;
            eshkp = ESHK(shkp);
            if ((amt = eshkp.credit | 0) !== 0)
                await You(`have ${amt} ${currency(amt)} credit at ${
                    s_suffix(shkname(shkp))} ${shtypes[eshkp.shoptype - SHOPBASE].name}.`);
            else if (shkp === this_shkp)
                await You('have no credit in here.');
            if ((amt = shop_debt(eshkp)) !== 0)
                await You(`owe ${shkname(shkp)} ${amt} ${currency(amt)}.`);
            else if (shkp === this_shkp)
                await You("don't owe any gold here.");
        }
}

// src/shk.c:496 addupbill() — the sum of everything on the bill.
function addupbill(shkp) {
    let total = 0;

    for (const bp of (ESHK(shkp).bill_p || []))
        total += bp.price * bp.bquan;
    return total;
}

// src/shk.c:5508 Izchak_speaks[]
const Izchak_speaks = [
    "%s says: 'These shopping malls give me a headache.'",
    "%s says: 'Slow down.  Think clearly.'",
    "%s says: 'You need to take things one at a time.'",
    "%s says: 'I don't like poofy coffee... give me Colombian Supremo.'",
    "%s says that getting the devteam's agreement on anything is difficult.",
    "%s says that he has noticed those who serve their deity will prosper.",
    "%s says: 'Don't try to steal from me - I have friends in high places!'",
    "%s says: 'You may well need something from this shop in the future.'",
    '%s comments about the Valley of the Dead as being a gateway.',
];

// src/shk.c:5521 shk_chat() — #chat with a shopkeeper.
export async function shk_chat(shkp) {
    let eshk;
    let shkmoney;

    if (!shkp.isshk) {
        /* The monster type is shopkeeper, but this monster is
           not actually a shk, which could happen if someone
           wishes for a shopkeeper statue and then animates it.
           (Note: shkname() would be "" in a case like this.) */
        await pline(`${Monnam(shkp)} asks whether you've seen any untended shops recently.`);
        /* [Perhaps we ought to check whether this conversation
           is taking place inside an untended shop, but a shopless
           shk can probably be expected to be rather disoriented.] */
        return;
    }

    eshk = ESHK(shkp);
    if (!shkp.mpeaceful) { /* ANGRY(shkp) */
        await pline(`${Shknam(shkp)} ${
            (!Deaf() && !muteshk(shkp)) ? 'mentions' : 'indicates'} how much ${
            noit_mhe(shkp)} dislikes ${eshk.robbed ? 'non-paying' : 'rude'} customers.`);
    } else if (eshk.following) {
        if ((eshk.customer || '') !== (game.plname || '')) {
            if (!Deaf() && !muteshk(shkp)) {
                await verbalize(`${Hello(shkp)} ${game.plname}!  I was looking for ${eshk.customer}.`);
            }
            eshk.following = 0;
        } else {
            if (!Deaf() && !muteshk(shkp)) {
                await verbalize(`${Hello(shkp)} ${game.plname}!  Didn't you forget to pay?`);
            } else {
                await pline(`${Shknam(shkp)} taps you on the ${body_part(ARM)}.`);
            }
        }
    } else if (eshk.billct) {
        const total = addupbill(shkp) + (eshk.debit | 0);

        await pline(`${Shknam(shkp)} ${
            (!Deaf() && !muteshk(shkp)) ? 'says' : 'indicates'} that your bill comes to ${
            total} ${currency(total)}.`);
    } else if (eshk.debit) {
        await pline(`${Shknam(shkp)} ${
            (!Deaf() && !muteshk(shkp)) ? 'reminds you' : 'indicates'} that you owe ${
            noit_mhim(shkp)} ${eshk.debit} ${currency(eshk.debit)}.`);
    } else if (eshk.credit) {
        await pline(`${Shknam(shkp)} encourages you to use your ${eshk.credit} ${
            currency(eshk.credit)} of credit.`);
    } else if (eshk.robbed) {
        await pline(`${Shknam(shkp)} ${
            (!Deaf() && !muteshk(shkp)) ? 'complains' : 'indicates concern'} about a recent robbery.`);
    } else if (eshk.surcharge) {
        await pline(`${Shknam(shkp)} ${
            (!Deaf() && !muteshk(shkp)) ? 'warns you' : 'indicates'} that ${
            noit_mhe(shkp)} is watching you carefully.`);
    } else if ((shkmoney = money_cnt(shkp.minvent || [])) < 50) {
        await pline(`${Shknam(shkp)} ${
            (!Deaf() && !muteshk(shkp)) ? 'complains' : 'indicates'} that business is bad.`);
    } else if (shkmoney > 4000) {
        await pline(`${Shknam(shkp)} ${
            (!Deaf() && !muteshk(shkp)) ? 'says' : 'indicates'} that business is good.`);
    } else if (is_izchak(shkp, false)) {
        if (!Deaf() && !muteshk(shkp))
            await pline(Izchak_speaks[rn2(Izchak_speaks.length)].replace('%s', shkname(shkp)));
    } else {
        if (!Deaf() && !muteshk(shkp))
            await pline(`${Shknam(shkp)} talks about the problem of shoplifters.`);
    }
}

// src/shk.c:5019 shopdig(); the hero digs in a shop: warning (fall==0) or,
// when the hole opens (fall==1), the shopkeeper grabs the pack
export async function shopdig(fall) {
    const u = game.u;
    const shkp = shop_keeper((u.ushops || '\0').charCodeAt(0));
    let lang;
    let grabs = 'grabs';

    if (!shkp)
        return;

    /* 0 == can't speak, 1 == makes animal noises, 2 == speaks */
    if (!inhishop(shkp)) {
        if (Role_if(PMNAMES.PM_KNIGHT)) {
            await You_feel('like a common thief.');
            adjalign(-sgn(u.ualign.type));
        }
        return;
    }

    lang = 0;
    if (helpless(shkp) || is_silent(shkp.data))
        ; /* lang stays 0 */
    else if (shkp.data.msound <= MSOUND.MS_ANIMAL)
        lang = 1;
    else if (shkp.data.msound >= MSOUND.MS_HUMANOID)
        lang = 2;

    if (!fall) {
        if (lang === 2) {
            if (!Deaf() && !muteshk(shkp)) {
                /* SetVoice(shkp, 0, 80, 0) */
                if (u.utraptype === TT_PIT) {
                    await verbalize(`Be careful, ${
                        game.flags.female ? 'madam' : 'sir'}, or you might fall through the floor.`);
                } else {
                    await verbalize(`${game.flags.female ? 'Madam' : 'Sir'
                                    }, do not damage the floor here!`);
                }
            }
        }
        if (Role_if(PMNAMES.PM_KNIGHT)) {
            await You_feel('like a common thief.');
            adjalign(-sgn(u.ualign.type));
        }
    } else if (!um_dist(shkp.mx, shkp.my, 5)
               && !helpless(shkp)
               && (ESHK(shkp).billct || ESHK(shkp).debit)) {
        if (nolimbs(shkp.data)) {
            grabs = 'knocks off';
        }
        if (!m_next2u(shkp)) {
            await mnexto(shkp, RLOC_MSG);
            /* for some reason the shopkeeper can't come next to you */
            if (!m_next2u(shkp)) {
                if (lang === 2)
                    await pline(`${Shknam(shkp)} curses you in anger and frustration!`);
                else if (lang === 1)
                    await growl(shkp);
                rile_shk(shkp);
                return;
            } else
                await pline(`${Shknam(shkp)} ${
                    makeplural(locomotion(shkp.data, 'leap'))}, and ${grabs} your backpack!`);
        } else
            await pline(`${Shknam(shkp)} ${grabs} your backpack!`);

        for (const obj of [...(game.invent || [])]) {
            if ((obj.owornmask & ~(W_SWAPWEP | W_QUIVER)) !== 0
                || (obj === u.uswapwep && u.twoweap)
                || (obj.otyp === ONAMES.LEASH && obj.leashmon))
                continue;
            if (obj === game.current_wand)
                continue;
            setnotworn(obj);
            freeinv(obj);
            subfrombill(obj, shkp);
            add_to_minv(shkp, obj); /* may free obj */
        }
    }
}

// src/shk.c:5877 Shk_Your(); shk_your() capitalized
export function Shk_Your(obj) {
    return upstart(shk_your(obj));
}

// src/shk.c:5976 globby_bill_fixup()
export async function globby_bill_fixup(obj_absorber, obj_absorbed) {
    let x = 0, y = 0;
    let bp, bp_absorber = null;
    let shkp = null;
    let eshkp;
    let amount, per_unit_cost;
    const floor_absorber = (obj_absorber.where === OBJ_FLOOR);

    if (!obj_absorber.globby) {
        /* impossible("globby_bill_fixup called for non-globby object") */
    }

    if (floor_absorber) {
        x = obj_absorber.ox, y = obj_absorber.oy;
    }
    if (obj_absorber.unpaid) {
        /* look for a shopkeeper who owns this object */
        const mons = game.level?.monsters || [];
        for (shkp = next_shkp(mons[0] ?? null, true); shkp;
             shkp = next_shkp(mons[mons.indexOf(shkp) + 1] ?? null, true))
            if (onbill(obj_absorber, shkp, true))
                break;
    } else if (obj_absorbed.unpaid) {
        if (obj_absorbed.where === OBJ_FREE
             && floor_absorber && costly_spot(x, y)) {
            shkp = shop_keeper(in_rooms(x, y, SHOPBASE).charCodeAt(0));
        }
    }
    /* sanity check, in case obj is on bill but not marked 'unpaid' */
    if (!shkp)
        shkp = shop_keeper(game.u.ushops.charCodeAt(0));
    if (!shkp)
        return;
    bp_absorber = onbill(obj_absorber, shkp, false);
    bp = onbill(obj_absorbed, shkp, false);
    eshkp = ESHK(shkp);
    per_unit_cost = set_cost(obj_absorbed, shkp);

    /**************************************************************
     * Scenario 1. Shop-owned glob absorbing into shop-owned glob
     **************************************************************/
    if (bp && (!obj_absorber.no_charge
               || billable({ shkp }, obj_absorber, eshkp.shoproom, false))) {
        /* the glob being absorbed has a billing record */
        amount = bp.price;
        /* eshkp->billct--; *bp = eshkp->bill_p[eshkp->billct]; the last
           record overwrites the absorbed one and the bill shrinks */
        Object.assign(bp, eshkp.bill_p[eshkp.bill_p.length - 1]);
        eshkp.bill_p.length -= 1;
        eshkp.billct = eshkp.bill_p.length;
        clear_unpaid_obj(shkp, obj_absorbed);

        if (bp_absorber) {
            /* the absorber has a billing record */
            bp_absorber.price += amount;
        } else {
            /* the absorber has no billing record */
            ;
        }
        return;
    }
    /**************************************************************
     * Scenario 2. Player-owned glob absorbing into shop-owned glob
     **************************************************************/
    if (!bp_absorber && !bp && !obj_absorber.no_charge) {
        /* there are no billing records */
        amount = get_pricing_units(obj_absorbed) * per_unit_cost;
        if (saleable(shkp, obj_absorbed)) {
            if (eshkp.debit >= amount) {
                if (eshkp.loan) { /* you carry shop's gold */
                   if (eshkp.loan >= amount)
                        eshkp.loan -= amount;
                   else
                        eshkp.loan = 0;
                }
                eshkp.debit -= amount;
                await pline_The(`donated ${obj_typename(obj_absorbed.otyp)} ${eshkp.debit ? 'partially ' : ''}pays off your debt.`);
            } else {
                const delta = amount - eshkp.debit;

                eshkp.credit += delta;
                if (eshkp.debit) {
                    eshkp.debit = 0;
                    eshkp.loan = 0;
                    await Your('debt is paid off.');
                }
                if (eshkp.credit === delta)
                    await pline_The(`${obj_typename(obj_absorbed.otyp)} established ${delta} ${currency(delta)} credit.`);
                else
                    await pline_The(`${obj_typename(obj_absorbed.otyp)} added ${delta} ${currency(delta)} to your credit; total is now ${eshkp.credit} ${currency(eshkp.credit)}.`);
            }
        }
        return;
    } else if (bp_absorber) {
        /* absorber has a billing record */
        bp_absorber.price += per_unit_cost * get_pricing_units(obj_absorbed);
        return;
    }
    /**************************************************************
     * Scenario 3. shop_owned glob merging into player_owned glob
     **************************************************************/
    if (bp && (obj_absorber.no_charge
               || (floor_absorber && !costly_spot(x, y)))) {
        amount = bp.price;
        await bill_dummy_object(obj_absorbed);
        /* SetVoice(shkp, 0, 80, 0) */
        await verbalize(`You owe me ${amount} ${currency(amount)} for my ${obj_typename(obj_absorbed.otyp)} that you ${!shkp.mpeaceful /* ANGRY(shkp) */ ? 'had the audacity to mix' : 'just mixed'} with your${!shkp.mpeaceful ? ' stinking batch!' : 's.'}`);
        return;
    }
    /**************************************************************
     * Scenario 4. player_owned glob merging into player_owned glob
     **************************************************************/

    return;
}

// src/shk.c shkcatch(); a shopkeeper snatches a thrown pick-axe
export async function shkcatch(obj, x, y) {
    let shkp;

    shkp = shop_keeper(inside_shop(x, y));
    if (!shkp || !inhishop(shkp))
        return null;

    if (!helpless(shkp)
        && (game.u.ushops[0] !== shkp.eshk.shoproom || !inside_shop(game.u.ux, game.u.uy))
        && dist2(shkp.mx, shkp.my, x, y) < 3
        /* if it is the shk's pos, you hit and anger him */
        && (shkp.mx !== x || shkp.my !== y)) {
        if (await mnearto(shkp, x, y, true, RLOC_NOMSG) === 2
            && !Deaf() && !muteshk(shkp)) {
            /* SetVoice(shkp, 0, 80, 0) */
            await verbalize('Out of my way, scum!');
        }
        if (cansee(x, y)) {
            await pline(`${Shknam(shkp)} nimbly${
                (x === shkp.mx && y === shkp.my) ? '' : ' reaches over and'} catches ${the(xname(obj))}.`);
            if (!canspotmon(shkp))
                map_invisible(x, y);
            /* nh_delay_output(); mark_synch(); */
            if (game.animationFrame) {
                await flush_screen(0);
                await game.animationFrame();
            }
        }
        subfrombill(obj, shkp);
        await mpickobj(shkp, obj);
        return shkp;
    }
    return null;
}

// src/shk.c delete_contents(); empty a container
export function delete_contents(obj) {
    let curr;

    while ((curr = (obj.cobj && obj.cobj[0])) != null) {
        obj_extract_self(curr);
        obfree(curr, null);
    }
}

// src/shk.c costly_adjacent(); is <x,y> on the shop's wall or door, or the
// free spot one step inside the door
export function costly_adjacent(shkp, x, y) {
    let eshkp;

    if (!shkp || !inhishop(shkp) || !isok(x, y))
        return false;
    eshkp = shkp.eshk;
    /* adjacent if <x,y> is a shop wall spot, including door;
       also treat "free spot" one step inside the door as adjacent */
    return (!!game.level.at(x, y).edge || (x === eshkp.shk.x && y === eshkp.shk.y));
}

// src/shk.c:6101 use_unpaid_trapobj(); setting an unpaid trap buys it
export async function use_unpaid_trapobj(otmp, x, y) {
    if (otmp.unpaid) {
        if (!Deaf()) {
            const shkp = find_objowner(otmp, x, y);

            if (shkp && !muteshk(shkp)) {
                /* SetVoice(shkp, 0, 80, 0); */
                await verbalize('You set it, you buy it!');
            }
        }
        await bill_dummy_object(otmp);
    }
}
