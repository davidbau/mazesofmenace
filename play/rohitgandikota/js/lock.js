// lock.js — locks, doors and the commands that operate on them.
// C ref: src/lock.c
//
// doopen_indir() is the reason this file exists now: it is the only draw on the
// 'o' command's path, an rnl(20) tested against the average of Strength,
// Dexterity and Constitution, and a session that opens a door runs one call
// short of C without it.

import { game } from './gstate.js';
import { pline_xy } from './pline.js';
import { rnl } from './rng.js';
import { A_STR, A_DEX, A_CON, D_CLOSED, D_LOCKED, D_NODOOR, D_BROKEN, D_ISOPEN, D_TRAPPED, IS_DOOR, ECMD_OK, ECMD_TIME } from './const.js';
import { newsym } from './display.js';
import { exercise, acurrstr, ACURR } from './attrib.js';
import { get_adjacent_loc } from './cmd.js';
import { m_at } from './mon.js';
import { is_door_mappear } from './monst.js';
import { canspotmon } from './display.js';

import { You_cant, You, pline_The } from './pline.js';
import { getdir } from './cmd.js';
import { ECMD_CANCEL, TT_PIT, isok, M_AP_TYPE, M_AP_FURNITURE, M_AP_OBJECT } from './const.js';
import { Monnam } from './do_name.js';
import { pline, canseemon } from './display.js';
import { rn2 } from './rng.js';
import { OCLASSES, ONAMES } from './objects_data.js';
import { xname, doname, singular, An, the, yname } from './objnam.js';
import { useup, obj_extract_self, stackobj } from './invent.js';
import { place_object } from './mkobj.js';
import { is_blade, is_pick, wake_nearby, delobj } from './mon.js';
import { can_reach_floor } from './pickup.js';
import { set_occupation } from './allmain.js';
import { obj_resists } from './zap.js';
import { There } from './pline.js';
import { block_point, recalc_block_point } from './vision.js';
import { tty_yn_function } from './tty/topl.js';
import { is_drawbridge_wall } from './dbridge.js';

function note_unported_lock(what) {
    (game.unported ||= new Set()).add(what);
}

// include/mondata.h verysmall()
function verysmall(ptr) {
    return ptr.msize < 1; /* MZ_SMALL */
}

// src/lock.c doopen_indir() — open the door in the chosen direction.
//
// Only the branch that reaches a known-CLOSED door draws. Everything above it
// is messages and refusals, which cost no PRNG; the draw is rnl(20) against
// (Str + Dex + Con) / 3, so a wrong attribute makes the door open when C says
// it resists without changing the call count.
export async function doopen_indir(x, y) {
    const res = ECMD_OK;
    const cc = { x: 0, y: 0 };

    if (verysmall(game.mons[game.u.umonnum])) {
        /* "You're too small to pull the door open." */
        return res;
    }

    if (x > 0 && y >= 0) {
        cc.x = x;
        cc.y = y;
    } else if (!await get_adjacent_loc(null, null, game.u.ux, game.u.uy, cc)) {
        return ECMD_OK;
    }

    const door = game.level.at(cc.x, cc.y);
    if (!door || !IS_DOOR(door.typ))
        return res;

    if (!(door.doormask & D_CLOSED))
        return res; /* broken / doorless / already open / locked messages */

    /* door is known to be CLOSED */
    if (rnl(20) < Math.trunc((acurrstr() + ACURR(A_DEX) + ACURR(A_CON)) / 3)) {
        await pline_xy(cc.x, cc.y, 'The door opens.');
        if (door.doormask & D_TRAPPED) {
            note_unported_lock('doopen_indir:b_trapped');
            door.doormask = D_NODOOR;
        } else {
            door.doormask = D_ISOPEN;
        }
        newsym(cc.x, cc.y); /* feel_newsym: the hero knows she opened it */
        recalc_block_point(cc.x, cc.y); /* vision: new see through there */
    } else {
        exercise(A_STR, true);
        await pline_xy(cc.x, cc.y, 'The door resists!');
    }

    return ECMD_TIME;
}

// src/lock.c doopen()
export async function doopen() {
    return doopen_indir(0, 0);
}

// src/lock.c:759 stumble_on_door_mimic() — walking a command at a mimicking
// door reveals it. seemimic and the mimic-attack followup are in js/mon.js;
// the attack (stumble_onto_mimic) is recorded.
function stumble_on_door_mimic(x, y) {
    const mtmp = m_at(x, y);
    if (mtmp && is_door_mappear(mtmp)) {
        note_unported('doclose:stumble_onto_mimic');
        return true;
    }
    return false;
}

// src/lock.c:926 obstructed() — is something standing or lying on the door
// square?
async function obstructed(x, y, quietly) {
    const mtmp = m_at(x, y);

    if (mtmp && M_AP_TYPE(mtmp) !== M_AP_FURNITURE) {
        if (M_AP_TYPE(mtmp) === M_AP_OBJECT) {
            if (!quietly)
                await pline("Something's in the way.");
            return true;
        }
        if (!quietly) {
            /* Some_Monnam: Monnam, or Someone/Something when unspottable;
               the tail arm needs long worms, recorded via the same name */
            await pline(`${canspotmon(mtmp) ? Monnam(mtmp) : "Something"} blocks the way!`);
        }
        if (!canspotmon(mtmp))
            note_unported('obstructed:map_invisible');
        return true;
    }
    if ((game.level?.objects || []).some(o => o.ox === x && o.oy === y)) {
        if (!quietly)
            await pline("Something's in the way.");
        return true;
    }
    return false;
}

// src/lock.c:957 doclose() — the 'c' command: try to close a door.
export async function doclose() {
    let res = ECMD_OK;

    /* nohands(youmonst.data) cannot fire un-polymorphed */
    if (game.u.utrap && game.u.utraptype === TT_PIT) {
        await You_cant("reach over the edge of the pit.");
        return ECMD_OK;
    }

    if (!await getdir(null))
        return ECMD_CANCEL;

    const x = game.u.ux + game.u.dx;
    const y = game.u.uy + game.u.dy;
    if (x === game.u.ux && y === game.u.uy) {
        await You("are in the way!");
        return ECMD_TIME;
    }

    let nodoor = !isok(x, y);

    if (!nodoor && stumble_on_door_mimic(x, y))
        return ECMD_TIME;

    /* Confusion/Stunned would set res = ECMD_TIME; both unreachable yet.
       The Blind feel_location arm is recorded. */
    if (game.u?.ublind)
        note_unported('doclose:blind_feel');

    const door = nodoor ? null : game.level.at(x, y);
    /* drawbridges are not generated yet; the portcullis arms are recorded
       when a drawbridge tile is ever seen */
    if (nodoor || !IS_DOOR(door.typ)) {
        await You(`${game.u?.ublind ? "feel" : "see"} no door there.`);
        return res;
    }

    if (door.doormask === D_NODOOR) {
        await pline("This doorway has no door.");
        return res;
    } else if (await obstructed(x, y, false)) {
        return res;
    } else if (door.doormask === D_BROKEN) {
        await pline("This door is broken.");
        return res;
    } else if (door.doormask & (D_CLOSED | D_LOCKED)) {
        await pline("This door is already closed.");
        return res;
    }

    if (door.doormask === D_ISOPEN) {
        /* verysmall(youmonst.data) cannot fire un-polymorphed */
        if (game.u.usteed
            || rn2(25) < (acurrstr() + ACURR(A_DEX) + ACURR(A_CON)) / 3) {
            await pline_The("door closes.");
            door.doormask = D_CLOSED;
            newsym(x, y); /* feel_newsym: the hero knows she closed it */
            block_point(x, y); /* vision:  no longer see there */
        } else {
            exercise(A_STR, true);
            await pline_The("door resists!");
        }
    }

    return ECMD_TIME;
}

/* src/lock.c:352 — pick_lock result codes. */
const PICKLOCK_LEARNED_SOMETHING = -1;  /* time passes */
const PICKLOCK_DID_NOTHING = 0;         /* no time passes */
const PICKLOCK_DID_SOMETHING = 1;

// src/lock.c:358 pick_lock() — apply a key, lock pick or credit card.
//
// The reachable slice is the door arms: no lock on this terrain, "This
// doorway has no door.", "You cannot lock an open door.", "This door is
// broken.", each of which teaches something and so takes the turn. The
// container arm, the resume-an-interrupted-attempt arm and the real picking
// occupation (its ynq prompt and chance rolls) are recorded when reached.
export async function pick_lock(pick, rx, ry, container) {
    const picktyp = pick.otyp;
    const cc = { x: 0, y: 0 };

    if (game.xlock?.usedtime && picktyp === game.xlock?.picktyp) {
        note_unported_lock('pick_lock:resume');
        return PICKLOCK_LEARNED_SOMETHING;
    }

    if (!await get_adjacent_loc(null, 'Invalid location!',
                                game.u.ux, game.u.uy, cc))
        return PICKLOCK_DID_NOTHING;

    if (cc.x === game.u.ux && cc.y === game.u.uy) {
        /* pick lock on a container (or complain about the lack of one) */
        note_unported_lock('pick_lock:container');
        return PICKLOCK_DID_NOTHING;
    }

    const mtmp = m_at(cc.x, cc.y);
    if (mtmp && canseemon(mtmp)) {
        note_unported_lock('pick_lock:monster_in_the_way');
        return PICKLOCK_LEARNED_SOMETHING;
    }

    const door = game.level?.at(cc.x, cc.y);
    if (!door || !IS_DOOR(door.typ)) {
        await You(`see no ${is_drawbridge_wall(cc.x, cc.y) >= 0
                            ? 'lock on the drawbridge' : 'door there'}.`);
        return PICKLOCK_DID_NOTHING;
    }
    switch (door.doormask) {
    case D_NODOOR:
        await pline('This doorway has no door.');
        return PICKLOCK_LEARNED_SOMETHING;
    case D_ISOPEN:
        await You('cannot lock an open door.');
        return PICKLOCK_LEARNED_SOMETHING;
    case D_BROKEN:
        await pline('This door is broken.');
        return PICKLOCK_LEARNED_SOMETHING;
    default:
        /* the Unlock/Lock ynq, the chance table and the picklock
           occupation are the real picking machinery */
        note_unported_lock('pick_lock:pick_occupation');
        return PICKLOCK_DID_NOTHING;
    }
}

/* ---- #force ----
   C keeps breakchestlock() at lock.c:162, forcelock() at :216, reset_pick()
   at :259, u_have_forceable_weapon() at :660 and doforce() at :676, i.e.
   above doopen_indir(). This file was started from doopen_indir() and is
   already out of C's order; these go at the end rather than reshuffling
   working code. */

/* include/obj.h:338 Is_box() */
const Is_box = (o) => o.otyp === ONAMES.LARGE_BOX || o.otyp === ONAMES.CHEST;

/* include/skills.h — the ranks u_have_forceable_weapon() compares against. */
const P_NONE = 0, P_DAGGER = 1, P_FLAIL = 13, P_LANCE = 24;

/* include/objclass.h — the materials chest_shatter_msg() switches on. */
const PAPER = 5, WAX = 8, VEGGY = 9, FLESH = 10, GLASS = 16, WOOD = 13;

// src/lock.c:259 reset_pick()
export function reset_pick() {
    const xl = game.xlock || (game.xlock = {});
    xl.usedtime = xl.chance = xl.picktyp = 0;
    xl.magic_key = false;
    xl.door = null;
    xl.box = null;
}

/* include/obj.h is_weptool() */
function is_weptool(o) {
    return o.oclass === OCLASSES.TOOL_CLASS
           && game.objects[o.otyp].oc_skill !== P_NONE;
}

// src/lock.c:660 u_have_forceable_weapon()
function u_have_forceable_weapon() {
    const uwep = game.u.uwep;
    if (!uwep)
        return false;
    const oc = game.objects[uwep.otyp];
    if (uwep.oclass === OCLASSES.WEAPON_CLASS || is_weptool(uwep))
        return !(oc.oc_skill < P_DAGGER || oc.oc_skill === P_FLAIL
                 || oc.oc_skill > P_LANCE);
    return uwep.oclass === OCLASSES.ROCK_CLASS;
}

/* src/objnam.c greatest_erosion() — the worse of the two erosion counters,
   unless the object is erodeproof. */
function greatest_erosion(otmp) {
    if (otmp.oerodeproof)
        return 0;
    const e1 = otmp.oeroded | 0, e2 = otmp.oeroded2 | 0;
    return (e1 > e2) ? e1 : e2;
}

// src/mkobj.c chest_shatter_msg() — one item destroyed inside a smashed box.
async function chest_shatter_msg(otmp) {
    let disposition;

    if (otmp.oclass === OCLASSES.POTION_CLASS) {
        /* bottlename() picks a random flavour word for an unidentified
           potion, and potionbreathe() applies the vapours */
        note_unported_lock('chest_shatter_msg:potion');
        return;
    }
    /* C sets HBlinded=1 / BBlinded=0 across singular() so the name comes out
       as the plain object type rather than its unidentified appearance --
       "a spellbook", not "a white spellbook". */
    const save_ublind = game.u.ublind;
    game.u.ublind = 1;
    const thing = singular(otmp, xname);
    game.u.ublind = save_ublind;
    switch (game.objects[otmp.otyp].oc_material) {
    case PAPER:  disposition = 'is torn to shreds'; break;
    case WAX:    disposition = 'is crushed'; break;
    case VEGGY:  disposition = 'is pulped'; break;
    case FLESH:  disposition = 'is mashed'; break;
    case GLASS:  disposition = 'shatters'; break;
    case WOOD:   disposition = 'splinters to fragments'; break;
    default:     disposition = 'is destroyed'; break;
    }
    await pline(`${An(thing)} ${disposition}!`);
}

// src/lock.c:162 breakchestlock()
async function breakchestlock(box, destroyit) {
    if (!destroyit) { /* bill for the box but not for its contents */
        if (game.u.ushops)
            note_unported_lock('breakchestlock:costly_alteration');
        box.olocked = 0;
        box.obroken = 1;
        box.lknown = 1;
        return;
    }
    /* #force has destroyed this box (at <u.ux,u.uy>) */
    if (game.u.ushops)
        note_unported_lock('breakchestlock:shop_loss');

    await pline(`In fact, you've totally destroyed ${the(xname(box))}.`);
    /* Put the contents on ground at the hero's feet. */
    let otmp;
    while ((otmp = (box.cobj && box.cobj[0]) || null) !== null) {
        obj_extract_self(otmp);
        if (!rn2(3) || otmp.oclass === OCLASSES.POTION_CLASS) {
            await chest_shatter_msg(otmp);
            if (otmp.quan === 1)
                continue;       /* obfree(): the object is simply gone */
            /* this works because we're sure to have at least 1 left */
            useup(otmp);
        }
        if (box.otyp === ONAMES.ICE_BOX && otmp.otyp === ONAMES.CORPSE)
            note_unported_lock('breakchestlock:ice_box_corpse');
        place_object(otmp, game.u.ux, game.u.uy);
        stackobj(otmp);
    }
    delobj(box);
}



// src/lock.c:216 forcelock() — the occupation doforce() installs.
export async function forcelock() {
    const xl = game.xlock;
    const uwep = game.u.uwep;

    if (xl.box.ox !== game.u.ux || xl.box.oy !== game.u.uy)
        return (xl.usedtime = 0); /* you or it moved */

    if (xl.usedtime++ >= 50 || !uwep) {
        await You('give up your attempt to force the lock.');
        if (xl.usedtime >= 50) /* you made the effort */
            exercise(xl.picktyp ? A_DEX : A_STR, true);
        return (xl.usedtime = 0);
    }

    if (xl.picktyp) { /* blade */
        if (rn2(1000 - (uwep.spe | 0)) > (992 - greatest_erosion(uwep) * 10)
            && !uwep.cursed && !obj_resists(uwep, 0, 99)) {
            /* for a +0 weapon, probability that it survives an unsuccessful
             * attempt to force the lock is (.992)^50 = .67
             */
            await pline(`${uwep.quan > 1 ? 'One of y' : 'Y'}our ${
                xname(uwep)} broke!`);
            useup(uwep);
            await You('give up your attempt to force the lock.');
            exercise(A_DEX, true);
            return (xl.usedtime = 0);
        }
    } else {            /* blunt */
        wake_nearby(false); /* due to hammering on the container */
    }

    if (rn2(100) >= xl.chance)
        return 1; /* still busy */

    await You('succeed in forcing the lock.');
    exercise(xl.picktyp ? A_DEX : A_STR, true);
    /* breakchestlock() might destroy xlock.box; if so the context is cleared
       through delobj(), but it might not, so clear it explicitly after. */
    await breakchestlock(xl.box, !xl.picktyp && !rn2(3));
    reset_pick(); /* lock-picking context is no longer valid */

    return 0;
}

// src/lock.c:676 doforce() — the #force command.
export async function doforce() {
    const uwep = game.u.uwep;

    if (game.u.uswallow) {
        await You_cant('force anything from inside here.');
        return ECMD_OK;
    }
    if (!u_have_forceable_weapon()) {
        const use_plural = !!(uwep && uwep.quan > 1);
        const how = !uwep ? 'when not wielding a'
            : (uwep.oclass !== OCLASSES.WEAPON_CLASS && !is_weptool(uwep))
              ? (use_plural ? 'without proper' : 'without a proper')
              : (use_plural ? 'with those' : 'with that');
        await You_cant(`force anything ${how} weapon${use_plural ? 's' : ''}.`);
        return ECMD_OK;
    }
    if (!can_reach_floor(true)) {
        note_unported_lock('doforce:cant_reach_floor');
        return ECMD_OK;
    }

    const xl = game.xlock || (game.xlock = {});
    const picktyp = (is_blade(uwep) && !is_pick(uwep)) ? 1 : 0;
    if (xl.usedtime && xl.box && picktyp === xl.picktyp) {
        await You('resume your attempt to force the lock.');
        set_occupation(forcelock, 'forcing the lock', 0);
        return ECMD_TIME;
    }

    /* A lock is made only for the honest man, the thief will break it. */
    xl.box = null;
    for (const otmp of (game.level?.objects || [])) {
        if (otmp.ox !== game.u.ux || otmp.oy !== game.u.uy || !Is_box(otmp))
            continue;
        if (otmp.obroken || !otmp.olocked) {
            /* force doname() to omit the known "broken" or "unlocked" prefix
               so that the message isn't worded redundantly */
            otmp.lknown = 0;
            await There(`is ${doname(otmp)} here, but its lock is already ${
                otmp.obroken ? 'broken' : 'unlocked'}.`);
            otmp.lknown = 1;
            continue;
        }
        /* safe_qbuf(qbuf, "There is ", " here; force its lock?", otmp,
                     doname, ansimpleoname, "a box") */
        otmp.lknown = 1;
        const c = await ynq(`There is ${doname(otmp)} here; force its lock?`);
        if (c === 'q')
            return ECMD_OK;
        if (c === 'n')
            continue;

        if (picktyp)
            await You(`force ${yname(uwep)} into a crack and pry.`);
        else
            await You(`start bashing it with ${yname(uwep)}.`);
        xl.box = otmp;
        xl.chance = game.objects[uwep.otyp].oc_wldam * 2;
        xl.picktyp = picktyp;
        xl.magic_key = false;
        xl.usedtime = 0;
        break;
    }

    if (xl.box)
        set_occupation(forcelock, 'forcing the lock', 0);
    else
        await You('decide not to force the issue.');
    return ECMD_TIME;
}

/* include/hack.h:1330 ynq() */
async function ynq(query) {
    return await tty_yn_function(query, 'ynq', 'q');
}
