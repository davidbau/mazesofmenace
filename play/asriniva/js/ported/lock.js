/* NetHack 5.0	lock.c	$NHDT-Date: 1741793439 2025/03/12 07:30:39 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.145 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2011. */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from './c-runtime.js';


/* occupation callbacks */







export function picking_lock(x, y)
{
    if (C.go.occupation == picklock) {
        x.value = C.u.ux + C.u.dx;
        y.value = C.u.uy + C.u.dy;
        return 1;
    } else {
        x.value = y.value = 0;
        return 0;
    }
}

export function picking_at(x, y)
{
    y = C.coordxy(y);
    x = C.coordxy(x);
    return C.bool(C.go.occupation == picklock
                      && C.samePtr(C.gx.xlock.door, C.levl[x][y]));
}

/* produce an occupation string appropriate for the current activity */
export function lock_action()
{
    /* "unlocking"+2 == "locking" */
    const actions = [
        C.literal("unlocking the door"),   /* [0] */
        C.literal("unlocking the chest"),  /* [1] */
        C.literal("unlocking the box"),    /* [2] */
        C.literal("picking the lock")      /* [3] */
    ];

    /* if the target is currently unlocked, we're trying to lock it now */
    if (C.gx.xlock.door && !(C.gx.xlock.door.doormask & C.D_LOCKED))
        return actions[0] + 2; /* "locking the door" */
    else if (C.gx.xlock.box && !C.gx.xlock.box.olocked)
        return C.gx.xlock.box.otyp == C.CHEST ? actions[1] + 2 : actions[2] + 2;
    /* otherwise we're trying to unlock it */
    else if (C.gx.xlock.picktyp == C.LOCK_PICK)
        return actions[3]; /* "picking the lock" */
    else if (C.gx.xlock.picktyp == C.CREDIT_CARD)
        return actions[3]; /* same as lock_pick */
    else if (C.gx.xlock.door)
        return actions[0]; /* "unlocking the door" */
    else if (C.gx.xlock.box)
        return C.gx.xlock.box.otyp == C.CHEST ? actions[1] : actions[2];
    else
        return actions[3];
}

/* try to open/close a lock */
export function picklock()
{
    if (C.gx.xlock.box) {
        if (C.gx.xlock.box.where != C.OBJ_FLOOR
            || C.gx.xlock.box.ox != C.u.ux || C.gx.xlock.box.oy != C.u.uy) {
            return ((C.gx.xlock.usedtime = 0)); /* you or it moved */
        }
    } else { /* door */
        if (!C.samePtr(C.gx.xlock.door, C.levl[C.u.ux + C.u.dx][C.u.uy + C.u.dy])) {
            return ((C.gx.xlock.usedtime = 0)); /* you moved */
        }
        switch (C.gx.xlock.door.doormask) {
        case C.D_NODOOR:
            C.pline("This doorway has no door.");
            return ((C.gx.xlock.usedtime = 0));
        case C.D_ISOPEN:
            C.You("cannot lock an open door.");
            return ((C.gx.xlock.usedtime = 0));
        case C.D_BROKEN:
            C.pline("This door is broken.");
            return ((C.gx.xlock.usedtime = 0));
        }
    }

    if (C.gx.xlock.usedtime++ >= 50 || C.nohands(C.gy.youmonst.data)) {
        C.You("give up your attempt at %s.", lock_action());
        C.exercise(C.A_DEX, 1); /* even if you don't succeed */
        return ((C.gx.xlock.usedtime = 0));
    }

    if (C.rn2(100, 98, "picklock") >= C.gx.xlock.chance)
        return 1; /* still busy */

    /* using the Master Key of Thievery finds traps if its bless/curse
       state is adequate (non-cursed for rogues, blessed for others;
       checked when setting up 'xlock') */
    if ((!C.gx.xlock.door ? C.gx.xlock.box.otrapped
                       : (C.gx.xlock.door.doormask & C.D_TRAPPED) != 0)
        && C.gx.xlock.magic_key) {
        C.gx.xlock.chance += 20; /* less effort needed next time */
        if (!C.gx.xlock.door) {
            if (!C.gx.xlock.box.tknown)
                C.You("find a trap!");
            C.gx.xlock.box.tknown = 1;
        }
        if (C.y_n("Do you want to try to disarm it?") == 'y'.charCodeAt(0)) {
            let what;
            let alreadyunlocked;

            /* disarming while using magic key always succeeds */
            if (C.gx.xlock.door) {
                C.gx.xlock.door.doormask &= ~C.D_TRAPPED;
                what = "door";
                alreadyunlocked = !(C.gx.xlock.door.doormask & C.D_LOCKED);
            } else {
                C.gx.xlock.box.otrapped = 0;
                C.gx.xlock.box.tknown = 0;
                what = (C.gx.xlock.box.otyp == C.CHEST) ? "chest" : "box";
                alreadyunlocked = !C.gx.xlock.box.olocked;
            }
            C.You("succeed in disarming the trap.  The %s is still %slocked.",
                what, alreadyunlocked ? "un" : "");
            C.exercise(C.A_WIS, 1);
        } else {
            C.You("stop %s.", lock_action());
            C.exercise(C.A_WIS, 0);
        }
        return ((C.gx.xlock.usedtime = 0));
    }

    C.You("succeed in %s.", lock_action());
    if (C.gx.xlock.door) {
        if (C.gx.xlock.door.doormask & C.D_TRAPPED) {
            C.b_trapped("door", C.FINGER);
            C.gx.xlock.door.doormask = C.D_NODOOR;
            C.unblock_point(C.u.ux + C.u.dx, C.u.uy + C.u.dy);
            if (C.loadChar(C.in_rooms(C.u.ux + C.u.dx, C.u.uy + C.u.dy, C.SHOPBASE)))
                C.add_damage(C.u.ux + C.u.dx, C.u.uy + C.u.dy, C.SHOP_DOOR_COST);
            C.newsym(C.u.ux + C.u.dx, C.u.uy + C.u.dy);
        } else if (C.gx.xlock.door.doormask & C.D_LOCKED)
            C.gx.xlock.door.doormask = C.D_CLOSED;
        else
            C.gx.xlock.door.doormask = C.D_LOCKED;
    } else {
        C.gx.xlock.box.olocked = !C.gx.xlock.box.olocked;
        C.gx.xlock.box.lknown = 1;
        if (C.gx.xlock.box.otrapped)
            C.chest_trap(C.gx.xlock.box, C.FINGER, 0);
    }
    C.exercise(C.A_DEX, 1);
    return ((C.gx.xlock.usedtime = 0));
}

export function breakchestlock(box, destroyit)
{
    destroyit = C.boolean(destroyit);
    if (!destroyit) { /* bill for the box but not for its contents */
        let hide_contents = box.cobj;

        box.cobj = 0;
        C.costly_alteration(box, C.COST_BRKLCK);
        box.cobj = hide_contents;
        box.olocked = 0;
        box.obroken = 1;
        box.lknown = 1;
    } else { /* #force has destroyed this box (at <u.ux,u.uy>) */
        let otmp;
        let shkp = (C.loadChar(C.u.ushops) && C.costly_spot(C.u.ux, C.u.uy))
                                 ? C.shop_keeper(C.loadChar(C.u.ushops))
                                 : 0;
        let costly = (shkp != 0),
                peaceful_shk = costly && shkp.mpeaceful;
        let loss = 0n;

        C.pline("In fact, you've totally destroyed %s.", C.the(C.xname(box)));
        /* Put the contents on ground at the hero's feet. */
        while ((otmp = box.cobj) != 0) {
            C.obj_extract_self(otmp);
            if (!C.rn2(3, 186, "breakchestlock") || otmp.oclass == C.POTION_CLASS) {
                chest_shatter_msg(otmp);
                if (costly)
                    loss = C.long(loss + C.stolen_value(otmp, C.u.ux, C.u.uy, peaceful_shk,
                                         1));
                if (otmp.quan == 1n) {
                    C.obfree(otmp, 0);
                    continue;
                }
                /* this works because we're sure to have at least 1 left;
                   otherwise it would fail since otmp is not in inventory */
                C.useup(otmp);
            }
            if (box.otyp == C.ICE_BOX && otmp.otyp == C.CORPSE) {
                otmp.age = C.long(C.svm.moves - otmp.age); /* actual age */
                C.start_corpse_timeout(otmp);
            }
            C.place_object(otmp, C.u.ux, C.u.uy);
            C.stackobj(otmp);
        }
        if (costly)
            loss = C.long(loss + C.stolen_value(box, C.u.ux, C.u.uy, peaceful_shk, 1));
        if (loss)
            C.You("owe %ld %s for objects destroyed.", loss, C.currency(loss));
        C.delobj(box);
    }
}

/* try to force a locked chest */
export function forcelock()
{
    if ((C.gx.xlock.box.ox != C.u.ux) || (C.gx.xlock.box.oy != C.u.uy))
        return ((C.gx.xlock.usedtime = 0)); /* you or it moved */

    if (C.gx.xlock.usedtime++ >= 50 || !C.uwep || C.nohands(C.gy.youmonst.data)) {
        C.You("give up your attempt to force the lock.");
        if (C.gx.xlock.usedtime >= 50) /* you made the effort */
            C.exercise((C.gx.xlock.picktyp) ? C.A_DEX : C.A_STR, 1);
        return ((C.gx.xlock.usedtime = 0));
    }

    if (C.gx.xlock.picktyp) { /* blade */
        if (C.rn2(1000 - C.uwep.spe, 229, "forcelock") > (992 - C.greatest_erosion(C.uwep) * 10)
            && !C.uwep.cursed && !C.obj_resists(C.uwep, 0, 99)) {
            /* for a +0 weapon, probability that it survives an unsuccessful
             * attempt to force the lock is (.992)^50 = .67
             */
            C.pline("%sour %s broke!", (C.uwep.quan > 1n) ? "One of y" : "Y",
                  C.xname(C.uwep));
            C.useup(C.uwep);
            C.You("give up your attempt to force the lock.");
            C.exercise(C.A_DEX, 1);
            return ((C.gx.xlock.usedtime = 0));
        }
    } else             /* blunt */
        C.wake_nearby(0); /* due to hammering on the container */

    if (C.rn2(100, 244, "forcelock") >= C.gx.xlock.chance)
        return 1; /* still busy */

    C.You("succeed in forcing the lock.");
    C.exercise(C.gx.xlock.picktyp ? C.A_DEX : C.A_STR, 1);
    /* breakchestlock() might destroy xlock.box; if so, xlock context will
       be cleared (delobj -> obfree -> maybe_reset_pick); but it might not,
       so explicitly clear that manually */
    breakchestlock(C.gx.xlock.box, (!C.gx.xlock.picktyp && !C.rn2(3, 252, "forcelock")));
    reset_pick(); /* lock-picking context is no longer valid */

    return 0;
}

export function reset_pick()
{
    C.gx.xlock.usedtime = C.gx.xlock.chance = C.gx.xlock.picktyp = 0;
    C.gx.xlock.magic_key = 0;
    C.gx.xlock.door = 0;
    C.gx.xlock.box = 0;
}

/* level change or object deletion; context may no longer be valid */
export function maybe_reset_pick(container)
/* passed from obfree() */
{
    /*
     * If a specific container, only clear context if it is for that
     * particular container (which is being deleted).  Other stuff on
     * the current dungeon level remains valid.
     * However if 'container' is Null, clear context if not carrying
     * gx.xlock.box (which might be Null if context is for a door).
     * Used for changing levels, where a floor container or a door is
     * being left behind and won't be valid on the new level but a
     * carried container will still be.  There might not be any context,
     * in which case redundantly clearing it is harmless.
     */
    if (container ? (C.samePtr(container, C.gx.xlock.box))
                  : (!C.gx.xlock.box || !C.carried(C.gx.xlock.box)))
        reset_pick();
}

/* pick a tool for autounlock */
export function autokey(opening)
/* True: key, pick, or card; False: key or pick */
{
    opening = C.boolean(opening);
    let o, key, pick, card, akey, apick, acard;

    /* mundane item or regular artifact or own role's quest artifact */
    key = pick = card = 0;
    /* other role's quest artifact (Rogue's Key or Tourist's Credit Card) */
    akey = apick = acard = 0;
    for (o = C.gi.invent; o; o = o.nobj) {
        if (C.any_quest_artifact(o) && !C.is_quest_artifact(o)) {
            switch (o.otyp) {
            case C.SKELETON_KEY:
                if (!akey)
                    akey = o;
                break;
            case C.LOCK_PICK:
                if (!apick)
                    apick = o;
                break;
            case C.CREDIT_CARD:
                if (!acard)
                    acard = o;
                break;
            default:
                break;
            }
        } else {
            switch (o.otyp) {
            case C.SKELETON_KEY:
                if (!key || C.is_magic_key(C.gy.youmonst, o))
                    key = o;
                break;
            case C.LOCK_PICK:
                if (!pick)
                    pick = o;
                break;
            case C.CREDIT_CARD:
                if (!card)
                    card = o;
                break;
            default:
                break;
            }
        }
    }
    if (!opening)
        card = acard = 0;
    /* only resort to other role's quest artifact if no other choice */
    if (!key && !pick && !card)
        key = akey;
    if (!pick && !card)
        pick = apick;
    if (!card)
        card = acard;
    return key ? key : pick ? pick : card ? card : 0;
}



/* for doapply(); if player gives a direction or resumes an interrupted
   previous attempt then it usually costs hero a move even if nothing
   ultimately happens; when told "can't do that" before being asked for
   direction or player cancels with ESC while giving direction, it doesn't */
export const PICKLOCK_LEARNED_SOMETHING = (-1) /* time passes */;
export const PICKLOCK_DID_NOTHING = 0          /* no time passes */;
export const PICKLOCK_DID_SOMETHING = 1;

/* player is applying a key, lock pick, or credit card */
export function pick_lock(pick, rx, ry, container)
/* coordinates of door/container, for autounlock:
                             * doesn't prompt for direction if these are set */
/* container, for autounlock */
{
    ry = C.coordxy(ry);
    rx = C.coordxy(rx);
    let dummypick = C.objectLocal();
    let picktyp, c, ch;
    let cc = C.coordLocal();
    let door;
    let otmp;
    let qbuf = C.stackAlloc(C.QBUFSZ);
    let autounlock = (rx != 0 || container != 0);

    /* 'pick' might be Null [called by do_loot_cont() for AUTOUNLOCK_UNTRAP] */
    if (!pick) {
        C.copyObject(dummypick, C.cg.zeroobj);
        pick = dummypick; /* pick->otyp will be STRANGE_OBJECT */
    }
    picktyp = pick.otyp;

    /* check whether we're resuming an interrupted previous attempt */
    if (C.gx.xlock.usedtime && picktyp == C.gx.xlock.picktyp) {
        const no_longer = C.literal("Unfortunately, you can no longer %s %s.");

        if (C.nohands(C.gy.youmonst.data)) {
            let what = (picktyp == C.LOCK_PICK) ? "pick" : "key";

            if (picktyp == C.CREDIT_CARD)
                what = "card";
            C.pline(no_longer, "hold the", what);
            reset_pick();
            return PICKLOCK_LEARNED_SOMETHING;
        } else if (C.u.uswallow || (C.gx.xlock.box && !C.can_reach_floor(1))) {
            C.pline(no_longer, "reach the", "lock");
            reset_pick();
            return PICKLOCK_LEARNED_SOMETHING;
        } else {
            let action = lock_action();

            C.You("resume your attempt at %s.", action);
            C.gx.xlock.magic_key = C.is_magic_key(C.gy.youmonst, pick);
            C.set_occupation(picklock, action, 0);
            return PICKLOCK_DID_SOMETHING;
        }
    }

    if (C.nohands(C.gy.youmonst.data)) {
        C.You_cant("hold %s -- you have no hands!", C.doname(pick));
        return PICKLOCK_DID_NOTHING;
    } else if (C.u.uswallow) {
        C.You_cant("%sunlock %s.", (picktyp == C.CREDIT_CARD) ? "" : "lock or ",
                 C.mon_nam(C.u.ustuck));
        return PICKLOCK_DID_NOTHING;
    }

    if (!C.samePtr(pick, dummypick) && picktyp != C.SKELETON_KEY
        && picktyp != C.LOCK_PICK && picktyp != C.CREDIT_CARD) {
        C.impossible("picking lock with object %d?", picktyp);
        return PICKLOCK_DID_NOTHING;
    }
    ch = 0; /* lint suppression */

    if (rx != 0) { /* autounlock; caller has provided coordinates */
        cc.x = rx;
        cc.y = ry;
    } else if (!C.get_adjacent_loc(0, "Invalid location!",
                                 C.u.ux, C.u.uy, cc)) {
        return PICKLOCK_DID_NOTHING;
    }

    if (C.u_at(cc.x, cc.y)) { /* pick lock on a container */
        let verb;
        let qsfx = C.stackAlloc(C.QBUFSZ);
        let it;
        let count;

        if (C.u.dz < 0 && !autounlock) { /* beware stale u.dz value */
            C.There("isn't any sort of lock up %s.",
                  C.Levitation ? "here" : "there");
            return PICKLOCK_LEARNED_SOMETHING;
        } else if (C.is_lava(C.u.ux, C.u.uy)) {
            C.pline("Doing that would probably melt %s.", C.yname(pick));
            return PICKLOCK_LEARNED_SOMETHING;
        } else if (C.is_pool(C.u.ux, C.u.uy) && !C.Underwater) {
            C.pline_The("%s has no lock.", C.hliquid("water"));
            return PICKLOCK_LEARNED_SOMETHING;
        }

        count = 0;
        c = 'n'.charCodeAt(0); /* in case there are no boxes here */
        for (otmp = C.svl.level.objects[cc.x][cc.y]; otmp;
             otmp = otmp.nexthere) {
            /* autounlock on boxes: only the one that was just discovered to
               be locked; don't include any other boxes which might be here */
            if (autounlock && !C.samePtr(otmp, container))
                continue;
            if (C.Is_box(otmp)) {
                ++count;
                if (!C.can_reach_floor(1)) {
                    C.You_cant("reach %s from up here.", C.the(C.xname(otmp)));
                    return PICKLOCK_LEARNED_SOMETHING;
                }
                it = 0;
                if (otmp.obroken)
                    verb = "fix";
                else if (!otmp.olocked)
                    verb = "lock", it = 1;
                else if (picktyp != C.LOCK_PICK)
                    verb = "unlock", it = 1;
                else
                    verb = "pick";

                if (autounlock && (C.flags.autounlock & C.AUTOUNLOCK_UNTRAP) != 0
                    && C.could_untrap(0, 1)
                    && (c = otmp.tknown ? (otmp.otrapped ? 'y'.charCodeAt(0) : 'n'.charCodeAt(0))
                            : C.ynq(C.safe_qbuf(qbuf, "Check ", " for a trap?",
                                          otmp, C.yname, C.ysimple_name, "this")))
                       != 'n'.charCodeAt(0)) {
                    if (c == 'q'.charCodeAt(0))
                        return PICKLOCK_DID_NOTHING; /* c == 'q' */
                    /* c == 'y' */
                    C.untrap(0, 0, 0, otmp);
                    return PICKLOCK_DID_SOMETHING; /* even if no trap found */
                } else if (autounlock
                          && (C.flags.autounlock & C.AUTOUNLOCK_APPLY_KEY) != 0) {
                    c = 'q'.charCodeAt(0);
                    if (!C.samePtr(pick, dummypick)) {
                        C.Sprintf(qbuf, "Unlock it with %s?", C.yname(pick));
                        c = C.ynq(qbuf);
                    }
                    if (c != 'y'.charCodeAt(0))
                        return PICKLOCK_DID_NOTHING;
                } else {
                    /* "There is <a box> here; <verb> <it|its lock>?" */
                    C.Sprintf(qsfx, " here; %s %s?",
                            verb, it ? "it" : "its lock");
                    C.safe_qbuf(qbuf, "There is ", qsfx, otmp, C.doname,
                                     C.ansimpleoname, "a box");
                    otmp.lknown = 1;

                    c = C.ynq(qbuf);
                    if (c == 'q'.charCodeAt(0))
                        return PICKLOCK_DID_NOTHING;
                    if (c == 'n'.charCodeAt(0))
                        continue; /* try next box */
                }

                if (otmp.obroken) {
                    C.You_cant("fix its broken lock with %s.",
                             C.ansimpleoname(pick));
                    return PICKLOCK_LEARNED_SOMETHING;
                } else if (picktyp == C.CREDIT_CARD && !otmp.olocked) {
                    /* credit cards are only good for unlocking */
                    C.You_cant("do that with %s.",
                             C.an(C.simple_typename(picktyp)));
                    return PICKLOCK_LEARNED_SOMETHING;
                } else if (autounlock
                           && !C.touch_artifact(pick, C.gy.youmonst)) {
                    /* note: for !autounlock, apply already did touch check */
                    return PICKLOCK_DID_SOMETHING;
                }
                switch (picktyp) {
                case C.CREDIT_CARD:
                    ch = C.int(C.ACURR(C.A_DEX) + 20 * C.Role_if(C.PM_ROGUE));
                    break;
                case C.LOCK_PICK:
                    ch = C.int(4 * C.ACURR(C.A_DEX) + 25 * C.Role_if(C.PM_ROGUE));
                    break;
                case C.SKELETON_KEY:
                    ch = C.int(75 + C.ACURR(C.A_DEX));
                    break;
                default:
                    ch = 0;
                }
                if (otmp.cursed)
                    ch = C.int(Math.trunc(ch / 2));

                C.gx.xlock.box = otmp;
                C.gx.xlock.door = 0;
                break;
            }
        }
        if (c != 'y'.charCodeAt(0)) {
            if (!count)
                C.There("doesn't seem to be any sort of lock here.");
            return PICKLOCK_LEARNED_SOMETHING; /* decided against all boxes */
        }

    /* not the hero's location; pick the lock in an adjacent door */
    } else {
        let mtmp;

        if (C.u.utrap && C.u.utraptype == C.TT_PIT) {
            C.You_cant("reach over the edge of the pit.");
            /* this used to return PICKLOCK_LEARNED_SOMETHING but the
               #open command doesn't use a turn for similar situation */
            return PICKLOCK_DID_NOTHING;
        }

        door = C.levl[cc.x][cc.y];
        mtmp = C.m_at(cc.x, cc.y);
        if (mtmp && C.canseemon(mtmp) && C.M_AP_TYPE(mtmp) != C.M_AP_FURNITURE
            && C.M_AP_TYPE(mtmp) != C.M_AP_OBJECT) {
            if (picktyp == C.CREDIT_CARD
                && (mtmp.isshk || C.samePtr(mtmp.data, C.mons[C.PM_ORACLE]))) {
                // C.SetVoice(mtmp, 0, 80, 0);
                C.verbalize("No checks, no credit, no problem.");
            } else {
                C.pline("I don't think %s would appreciate that.",
                      C.mon_nam(mtmp));
            }
            return PICKLOCK_LEARNED_SOMETHING;
        } else if (mtmp && C.is_door_mappear(mtmp)) {
            /* "The door actually was a <mimic>!" */
            C.stumble_onto_mimic(mtmp);
            /* mimic might keep the key (50% chance, 10% for PYEC or MKoT) */
            C.maybe_absorb_item(mtmp, pick, 50, 10);
            return PICKLOCK_LEARNED_SOMETHING;
        }
        if (!C.IS_DOOR(door.typ)) {
            let res = PICKLOCK_DID_NOTHING, oldglyph = door.glyph;
            let oldlastseentyp = C.update_mapseen_for(cc.x, cc.y);

            /* this is probably only relevant when blind */
            C.feel_location(cc.x, cc.y);
            if (door.glyph != oldglyph
                || C.svl.lastseentyp[cc.x][cc.y] != oldlastseentyp)
                res = PICKLOCK_LEARNED_SOMETHING;

            if (C.is_drawbridge_wall(cc.x, cc.y) >= 0)
                C.You("%s no lock on the drawbridge.", C.Blind ? "feel" : "see");
            else
                C.You("%s no door there.", C.Blind ? "feel" : "see");
            return res;
        }
        switch (door.doormask) {
        case C.D_NODOOR:
            C.pline("This doorway has no door.");
            return PICKLOCK_LEARNED_SOMETHING;
        case C.D_ISOPEN:
            C.You("cannot lock an open door.");
            return PICKLOCK_LEARNED_SOMETHING;
        case C.D_BROKEN:
            C.pline("This door is broken.");
            return PICKLOCK_LEARNED_SOMETHING;
        default:
            if ((C.flags.autounlock & C.AUTOUNLOCK_UNTRAP) != 0
                && C.could_untrap(0, 0)
                && (c = C.ynq("Check this door for a trap?")) != 'n'.charCodeAt(0)) {
                if (c == 'q'.charCodeAt(0))
                    return PICKLOCK_DID_NOTHING;
                /* c == 'y' */
                C.untrap(0, cc.x, cc.y, 0);
                return PICKLOCK_DID_SOMETHING; /* even if no trap found */
            }
            /* credit cards are only good for unlocking */
            if (picktyp == C.CREDIT_CARD && !(door.doormask & C.D_LOCKED)) {
                C.You_cant("lock a door with a credit card.");
                return PICKLOCK_LEARNED_SOMETHING;
            }

            C.Sprintf(qbuf, "%s it%s%s?",
                    (door.doormask & C.D_LOCKED) ? "Unlock" : "Lock",
                    autounlock ? " with " : "",
                    autounlock ? C.yname(pick) : "");
            c = C.ynq(qbuf);
            if (c != 'y'.charCodeAt(0))
                return PICKLOCK_DID_NOTHING;

            /* note: for !autounlock, 'apply' already did touch check */
            if (autounlock && !C.touch_artifact(pick, C.gy.youmonst))
                return PICKLOCK_DID_SOMETHING;

            switch (picktyp) {
            case C.CREDIT_CARD:
                ch = C.int(2 * C.ACURR(C.A_DEX) + 20 * C.Role_if(C.PM_ROGUE));
                break;
            case C.LOCK_PICK:
                ch = C.int(3 * C.ACURR(C.A_DEX) + 30 * C.Role_if(C.PM_ROGUE));
                break;
            case C.SKELETON_KEY:
                ch = C.int(70 + C.ACURR(C.A_DEX));
                break;
            default:
                ch = 0;
            }
            C.gx.xlock.door = door;
            C.gx.xlock.box = 0;
        }
    }
    C.svc.context.move = 0;
    C.gx.xlock.chance = ch;
    C.gx.xlock.picktyp = picktyp;
    C.gx.xlock.magic_key = C.is_magic_key(C.gy.youmonst, pick);
    C.gx.xlock.usedtime = 0;
    C.set_occupation(picklock, lock_action(), 0);
    return PICKLOCK_DID_SOMETHING;
}

/* is hero wielding a weapon that can #force? */
export function u_have_forceable_weapon()
{
    if (!C.uwep /* proper type test */
        || ((C.uwep.oclass == C.WEAPON_CLASS || C.is_weptool(C.uwep))
            ? (C.objects[C.uwep.otyp].oc_skill < C.P_DAGGER
               || C.objects[C.uwep.otyp].oc_skill == C.P_FLAIL
               || C.objects[C.uwep.otyp].oc_skill > C.P_LANCE)
            : C.uwep.oclass != C.ROCK_CLASS))
        return 0;
    return 1;
}



/* the #force command - try to force a chest with your weapon */
export function doforce()
{
    let otmp;
    let c, picktyp;
    let qbuf = C.stackAlloc(C.QBUFSZ);

    /*
     * TODO?
     *  allow force with edged weapon to be performed on doors.
     */

    if (C.u.uswallow) {
        C.You_cant("force anything from inside here.");
        return C.ECMD_OK;
    }
    if (!u_have_forceable_weapon()) {
        let use_plural = C.uwep && C.uwep.quan > 1n;

        C.You_cant("force anything %s weapon%s.",
                 !C.uwep ? "when not wielding a"
                 : (C.uwep.oclass != C.WEAPON_CLASS && !C.is_weptool(C.uwep))
                   ? (use_plural ? "without proper" : "without a proper")
                   : (use_plural ? "with those" : "with that"),
                 use_plural ? "s" : "");
        return C.ECMD_OK;
    }
    if (!C.can_reach_floor(1)) {
        C.cant_reach_floor(C.u.ux, C.u.uy, 0, 1, 0);
        return C.ECMD_OK;
    }

    picktyp = C.is_blade(C.uwep) && !C.is_pick(C.uwep);
    if (C.gx.xlock.usedtime && C.gx.xlock.box && picktyp == C.gx.xlock.picktyp) {
        C.You("resume your attempt to force the lock.");
        C.set_occupation(forcelock, "forcing the lock", 0);
        return C.ECMD_TIME;
    }

    /* A lock is made only for the honest man, the thief will break it. */
    C.gx.xlock.box = 0;
    for (otmp = C.svl.level.objects[C.u.ux][C.u.uy]; otmp; otmp = otmp.nexthere)
        if (C.Is_box(otmp)) {
            if (otmp.obroken || !otmp.olocked) {
                /* force doname() to omit known "broken" or "unlocked"
                   prefix so that the message isn't worded redundantly;
                   since we're about to set lknown, there's no need to
                   remember and then reset its current value */
                otmp.lknown = 0;
                C.There("is %s here, but its lock is already %s.",
                      C.doname(otmp), otmp.obroken ? "broken" : "unlocked");
                otmp.lknown = 1;
                continue;
            }
            C.safe_qbuf(qbuf, "There is ", " here; force its lock?",
                             otmp, C.doname, C.ansimpleoname, "a box");
            otmp.lknown = 1;

            c = C.ynq(qbuf);
            if (c == 'q'.charCodeAt(0))
                return C.ECMD_OK;
            if (c == 'n'.charCodeAt(0))
                continue;

            if (picktyp)
                C.You("force %s into a crack and pry.", C.yname(C.uwep));
            else
                C.You("start bashing it with %s.", C.yname(C.uwep));
            C.gx.xlock.box = otmp;
            C.gx.xlock.chance = C.objects[C.uwep.otyp].oc_wldam * 2;
            C.gx.xlock.picktyp = picktyp;
            C.gx.xlock.magic_key = 0;
            C.gx.xlock.usedtime = 0;
            break;
        }

    if (C.gx.xlock.box)
        C.set_occupation(forcelock, "forcing the lock", 0);
    else
        C.You("decide not to force the issue.");
    return C.ECMD_TIME;
}

export function stumble_on_door_mimic(x, y)
{
    y = C.coordxy(y);
    x = C.coordxy(x);
    let mtmp;

    if ((mtmp = C.m_at(x, y)) && C.is_door_mappear(mtmp)
        && !C.Protection_from_shape_changers) {
        C.stumble_onto_mimic(mtmp);
        return 1;
    }
    return 0;
}

/* the #open command - try to open a door */
export function doopen()
{
    return doopen_indir(0, 0);
}

/* try to open a door in direction u.dx/u.dy */
export function doopen_indir(x, y)
{
    y = C.coordxy(y);
    x = C.coordxy(x);
    let cc = C.coordLocal();
    let door;
    let portcullis;
    let dirprompt;
    let res = C.ECMD_OK;

    if (C.nohands(C.gy.youmonst.data)) {
        C.You_cant("open anything -- you have no hands!");
        return C.ECMD_OK;
    }

    dirprompt = 0; /* have get_adjacent_loc() -> getdir() use default */
    if (C.u.utrap && C.u.utraptype == C.TT_PIT && C.container_at(C.u.ux, C.u.uy, 0))
        dirprompt = "Open where? [.>]";

    if (x > 0 && y >= 0) {
        /* nonzero <x,y> is used when hero in amorphous form tries to
           flow under a closed door at <x,y>; the test here was using
           'y > 0' but that would give incorrect results if doors are
           ever allowed to be placed on the top row of the map */
        cc.x = x;
        cc.y = y;
    } else if (!C.get_adjacent_loc(dirprompt, 0, C.u.ux, C.u.uy, cc)) {
        return C.ECMD_OK;
    }

    /* open at yourself/up/down: switch to loot unless there is a closed
       door here (possible with Passes_walls) and direction isn't 'down' */
    if (C.u_at(cc.x, cc.y) && (C.u.dz > 0 || !C.closed_door(C.u.ux, C.u.uy)))
        return C.doloot();

    /* this used to be done prior to get_adjacent_loc() but doing so was
       incorrect once open at hero's spot became an alternate way to loot */
    if (C.u.utrap && C.u.utraptype == C.TT_PIT) {
        C.You_cant("reach over the edge of the pit.");
        return C.ECMD_OK;
    }

    if (stumble_on_door_mimic(cc.x, cc.y))
        return C.ECMD_TIME;

    /* when choosing a direction is impaired, use a turn
       regardless of whether a door is successfully targeted */
    if (C.Confusion || C.Stunned)
        res = C.ECMD_TIME;

    door = C.levl[cc.x][cc.y];
    portcullis = (C.is_drawbridge_wall(cc.x, cc.y) >= 0);
    /* this used to be 'if (Blind)' but using a key skips that so we do too */
    {
        let oldglyph = door.glyph;
        let oldlastseentyp = C.update_mapseen_for(cc.x, cc.y);

        C.newsym(cc.x, cc.y);
        if (door.glyph != oldglyph
            || C.svl.lastseentyp[cc.x][cc.y] != oldlastseentyp)
            res = C.ECMD_TIME; /* learned something */
    }

    if (portcullis || !C.IS_DOOR(door.typ)) {
        /* closed portcullis or spot that opened bridge would span */
        if (C.is_db_wall(cc.x, cc.y) || door.typ == C.DRAWBRIDGE_UP)
            C.There("is no obvious way to open the drawbridge.");
        else if (portcullis || door.typ == C.DRAWBRIDGE_DOWN)
            C.pline_The("drawbridge is already open.");
        else if (C.container_at(cc.x, cc.y, 1))
            C.pline("%s like something lootable over there.",
                  C.Blind ? "Feels" : "Seems");
        else
            C.You("%s no door there.", C.Blind ? "feel" : "see");
        return res;
    }

    if (!(door.doormask & C.D_CLOSED)) {
        let mesg;
        let locked = 0;

        switch (door.doormask) {
        case C.D_BROKEN:
            mesg = " is broken";
            break;
        case C.D_NODOOR:
            mesg = "way has no door";
            break;
        case C.D_ISOPEN:
            mesg = " is already open";
            break;
        default:
            mesg = " is locked";
            locked = 1;
            break;
        }
        C.set_msg_xy(cc.x, cc.y);
        C.pline("This door%s.", mesg);
        if (locked && C.flags.autounlock) {
            let unlocktool;

            C.u.dz = 0; /* should already be 0 since hero moved toward door */
            if ((C.flags.autounlock & C.AUTOUNLOCK_APPLY_KEY) != 0
                && (unlocktool = autokey(1)) != 0) {
                res = C.callLocal(pick_lock, unlocktool, cc.x, cc.y,
                                0) ? C.ECMD_TIME : C.ECMD_OK;
            } else if ((C.flags.autounlock & C.AUTOUNLOCK_KICK) != 0
                       && !C.u.usteed /* kicking is different when mounted */
                       && C.ynq("Kick it?") == 'y'.charCodeAt(0)) {
                C.cmdq_add_ec(C.CQ_CANNED, C.dokick);
                C.cmdq_add_dir(C.CQ_CANNED,
                             C.sgn(cc.x - C.u.ux), C.sgn(cc.y - C.u.uy), 0);
                /* this was 'ECMD_TIME', but time shouldn't elapse until
                   the canned kick takes place */
                res = C.ECMD_OK;
            }
        }
        return res;
    }

    if (C.verysmall(C.gy.youmonst.data)) {
        C.pline("You're too small to pull the door open.");
        return res;
    }

    /* door is known to be CLOSED */
    if (C.rnl(20, 904, "doopen_indir") < Math.trunc(C.int(C.ACURRSTR + C.ACURR(C.A_DEX) + C.ACURR(C.A_CON)) / 3)) {
        C.set_msg_xy(cc.x, cc.y);
        C.pline_The("door opens.");
        if (door.doormask & C.D_TRAPPED) {
            C.b_trapped("door", C.FINGER);
            door.doormask = C.D_NODOOR;
            if (C.loadChar(C.in_rooms(cc.x, cc.y, C.SHOPBASE)))
                C.add_damage(cc.x, cc.y, C.SHOP_DOOR_COST);
        } else
            door.doormask = C.D_ISOPEN;
        C.feel_newsym(cc.x, cc.y); /* the hero knows she opened it */
        C.recalc_block_point(cc.x, cc.y); /* vision: new see through there */
    } else {
        C.exercise(C.A_STR, 1);
        C.set_msg_xy(cc.x, cc.y);
        C.pline_The("door resists!");
    }

    return C.ECMD_TIME;
}

export function obstructed(x, y, quietly)
{
    quietly = C.boolean(quietly);
    y = C.coordxy(y);
    x = C.coordxy(x);
    let mtmp = C.m_at(x, y);

    objhere: {
    if (mtmp && C.M_AP_TYPE(mtmp) != C.M_AP_FURNITURE) {
        if (C.M_AP_TYPE(mtmp) == C.M_AP_OBJECT)
            break objhere;
        if (!quietly) {
            let Mn = C.Some_Monnam(mtmp); /* Monnam, Someone or Something */

            if ((mtmp.mx != x || mtmp.my != y) && C.canspotmon(mtmp))
                /* s_suffix() returns a modifiable buffer */
                Mn = C.strcat(C.s_suffix(Mn), " tail");

            C.pline("%s blocks the way!", Mn);
        }
        if (!C.canspotmon(mtmp))
            C.map_invisible(x, y);
        return 1;
    }
    if (C.OBJ_AT(x, y))
        break objhere;
    return 0;
    }
        if (!quietly)
            C.pline("%s's in the way.", C.Something);
        return 1;
}

/* the #close command - try to close a door */
export function doclose()
{
    let x, y;
    let door;
    let portcullis;
    let res = C.ECMD_OK;

    if (C.nohands(C.gy.youmonst.data)) {
        C.You_cant("close anything -- you have no hands!");
        return C.ECMD_OK;
    }

    if (C.u.utrap && C.u.utraptype == C.TT_PIT) {
        C.You_cant("reach over the edge of the pit.");
        return C.ECMD_OK;
    }

    if (!C.getdir(0))
        return C.ECMD_CANCEL;

    x = C.coordxy(C.u.ux + C.u.dx);
    y = C.coordxy(C.u.uy + C.u.dy);
    if (C.u_at(x, y) && !C.Passes_walls) {
        C.You("are in the way!");
        return C.ECMD_TIME;
    }

    nodoor: {
    if (!C.isok(x, y))
        break nodoor;

    if (stumble_on_door_mimic(x, y))
        return C.ECMD_TIME;

    /* when choosing a direction is impaired, use a turn
       regardless of whether a door is successfully targeted */
    if (C.Confusion || C.Stunned)
        res = C.ECMD_TIME;

    door = C.levl[x][y];
    portcullis = (C.is_drawbridge_wall(x, y) >= 0);
    if (C.Blind) {
        let oldglyph = door.glyph;
        let oldlastseentyp = C.update_mapseen_for(x, y);

        C.feel_location(x, y);
        if (door.glyph != oldglyph
            || C.svl.lastseentyp[x][y] != oldlastseentyp)
            res = C.ECMD_TIME; /* learned something */
    }

    if (portcullis || !C.IS_DOOR(door.typ)) {
        /* is_db_wall: closed portcullis */
        if (C.is_db_wall(x, y) || door.typ == C.DRAWBRIDGE_UP)
            C.pline_The("drawbridge is already closed.");
        else if (portcullis || door.typ == C.DRAWBRIDGE_DOWN)
            C.There("is no obvious way to close the drawbridge.");
        else {
            break nodoor;
        }
        return res;
    }

    if (door.doormask == C.D_NODOOR) {
        C.pline("This doorway has no door.");
        return res;
    } else if (obstructed(x, y, 0)) {
        return res;
    } else if (door.doormask == C.D_BROKEN) {
        C.pline("This door is broken.");
        return res;
    } else if (door.doormask & (C.D_CLOSED | C.D_LOCKED)) {
        C.pline("This door is already closed.");
        return res;
    }

    if (door.doormask == C.D_ISOPEN) {
        if (C.verysmall(C.gy.youmonst.data) && !C.u.usteed) {
            C.pline("You're too small to push the door closed.");
            return res;
        }
        if (C.u.usteed
            || C.rn2(25, 1039, "doclose") < Math.trunc(C.int(C.ACURRSTR + C.ACURR(C.A_DEX) + C.ACURR(C.A_CON)) / 3)) {
            C.pline_The("door closes.");
            door.doormask = C.D_CLOSED;
            C.feel_newsym(x, y); /* the hero knows she closed it */
            C.block_point(x, y); /* vision:  no longer see there */
        } else {
            C.exercise(C.A_STR, 1);
            C.pline_The("door resists!");
        }
    }

    return C.ECMD_TIME;
    }
    C.You("%s no door there.", C.Blind ? "feel" : "see");
    return res;
}

/* box obj was hit with spell or wand effect otmp;
   returns true if something happened */
export function boxlock(obj, otmp)
/* obj *is* a box */
{
    let res = 0;

    switch (otmp.otyp) {
    case C.WAN_LOCKING:
    case C.SPE_WIZARD_LOCK:
        if (!obj.olocked) { /* lock it; fix if broken */
            // C.Soundeffect(se_klunk, 50);
            C.pline("Klunk!");
            obj.olocked = 1;
            obj.obroken = 0;
            if (C.Role_if(C.PM_WIZARD))
                obj.lknown = 1;
            else
                obj.lknown = 0;
            res = 1;
        } /* else already closed and locked */
        break;
    case C.WAN_OPENING:
    case C.SPE_KNOCK:
        if (obj.olocked) { /* unlock; isn't broken so doesn't need fixing */
            // C.Soundeffect(se_klick, 50);
            C.pline("Klick!");
            obj.olocked = 0;
            res = 1;
            if (C.Role_if(C.PM_WIZARD))
                obj.lknown = 1;
            else
                obj.lknown = 0;
        } else /* silently fix if broken */
            obj.obroken = 0;
        break;
    case C.WAN_POLYMORPH:
    case C.SPE_POLYMORPH:
        /* maybe start unlocking chest, get interrupted, then zap it;
           we must avoid any attempt to resume unlocking it */
        if (C.samePtr(C.gx.xlock.box, obj))
            reset_pick();
        break;
    }
    return res;
}

/* Door/secret door was hit with spell or wand effect otmp;
   returns true if something happened */
export function doorlock(otmp, x, y)
{
    y = C.coordxy(y);
    x = C.coordxy(x);
    let door = C.levl[x][y];
    let res = 1;
    let loudness = 0;
    let msg = 0;
    let dustcloud = "A cloud of dust";
    let quickly_dissipates = "quickly dissipates";
    let mysterywand = (otmp.oclass == C.WAND_CLASS && !otmp.dknown);

    if (door.typ == C.SDOOR) {
        switch (otmp.otyp) {
        case C.WAN_OPENING:
        case C.SPE_KNOCK:
        case C.WAN_STRIKING:
        case C.SPE_FORCE_BOLT:
            door.typ = C.DOOR;
            door.doormask = C.D_CLOSED | (door.doormask & C.D_TRAPPED);
            C.newsym(x, y);
            if (C.cansee(x, y))
                C.pline("A door appears in the wall!");
            if (otmp.otyp == C.WAN_OPENING || otmp.otyp == C.SPE_KNOCK)
                return 1;
            break; /* striking: continue door handling below */
        case C.WAN_LOCKING:
        case C.SPE_WIZARD_LOCK:
        default:
            return 0;
        }
    }

    switch (otmp.otyp) {
    case C.WAN_LOCKING:
    case C.SPE_WIZARD_LOCK:
        if (C.Is_rogue_level(C.u.uz)) {
            let vis = C.cansee(x, y);

            /* Can't have real locking in Rogue, so just hide doorway */
            if (vis) {
                C.pline("%s springs up in the older, more primitive doorway.",
                      dustcloud);
            } else {
                // C.Soundeffect(se_swoosh, 25);
                C.You_hear("a swoosh.");
            }
            if (obstructed(x, y, mysterywand)) {
                if (vis)
                    C.pline_The("cloud %s.", quickly_dissipates);
                return 0;
            }
            C.block_point(x, y);
            door.typ = C.SDOOR, door.doormask = C.D_NODOOR;
            if (vis)
                C.pline_The("doorway vanishes!");
            C.newsym(x, y);
            return 1;
        }
        if (obstructed(x, y, mysterywand))
            return 0;
        /* Don't allow doors to close over traps.  This is for pits */
        /* & trap doors, but is it ever OK for anything else? */
        if (C.t_at(x, y)) {
            /* maketrap() clears doormask, so it should be NODOOR */
            C.pline("%s springs up in the doorway, but %s.", dustcloud,
                  quickly_dissipates);
            return 0;
        }

        switch (door.doormask & ~C.D_TRAPPED) {
        case C.D_CLOSED:
            msg = "The door locks!";
            break;
        case C.D_ISOPEN:
            msg = "The door swings shut, and locks!";
            break;
        case C.D_BROKEN:
            msg = "The broken door reassembles and locks!";
            break;
        case C.D_NODOOR:
            msg =
               "A cloud of dust springs up and assembles itself into a door!";
            break;
        default:
            res = 0;
            break;
        }
        C.block_point(x, y);
        door.doormask = C.D_LOCKED | (door.doormask & C.D_TRAPPED);
        C.newsym(x, y);
        break;
    case C.WAN_OPENING:
    case C.SPE_KNOCK:
        if (door.doormask & C.D_LOCKED) {
            msg = "The door unlocks!";
            door.doormask = C.D_CLOSED | (door.doormask & C.D_TRAPPED);
        } else
            res = 0;
        break;
    case C.WAN_STRIKING:
    case C.SPE_FORCE_BOLT:
        if (door.doormask & (C.D_LOCKED | C.D_CLOSED)) {
            /* sawit: closed door location is more visible than open */
            let sawit, seeit;

            if (door.doormask & C.D_TRAPPED) {
                let mtmp = C.m_at(x, y);

                sawit = mtmp ? C.canseemon(mtmp) : C.cansee(x, y);
                door.doormask = C.D_NODOOR;
                C.unblock_point(x, y);
                C.newsym(x, y);
                seeit = mtmp ? C.canseemon(mtmp) : C.cansee(x, y);
                if (mtmp) {
                    C.mb_trapped(mtmp, sawit || seeit);
                } else {
                    /* for mtmp, mb_trapped() does is own wake_nearto() */
                    loudness = 40;
                    if (C.flags.verbose) {
                        // C.Soundeffect(se_kaboom_door_explodes, 75);
                        if ((sawit || seeit) && !C.Unaware) {
                            C.pline("KABOOM!!  You see a door explode.");
                        } else if (!C.Deaf) {
                            // C.Soundeffect(se_explosion, 75);
                            C.You_hear("a %s explosion.",
                                     (C.distu(x, y) > 7 * 7) ? "distant"
                                                           : "nearby");
                        }
                    }
                }
                break;
            }
            sawit = C.cansee(x, y);
            door.doormask = C.D_BROKEN;
            C.recalc_block_point(x, y);
            seeit = C.cansee(x, y);
            C.newsym(x, y);
            if (C.flags.verbose) {
                if ((sawit || seeit) && !C.Unaware) {
                    C.pline_The("door crashes open!");
                } else if (!C.Deaf) {
                    // C.Soundeffect(se_crashing_sound, 100);
                    C.You_hear("a crashing sound.");
                }
            }
            /* force vision recalc before printing more messages */
            if (C.gv.vision_full_recalc)
                C.vision_recalc(0);
            loudness = 20;
        } else
            res = 0;
        break;
    default:
        C.impossible("magic (%d) attempted on door.", otmp.otyp);
        break;
    }
    if (msg && C.cansee(x, y))
        C.pline1(msg);
    if (loudness > 0) {
        /* door was destroyed */
        C.wake_nearto(x, y, loudness);
        if (C.loadChar(C.in_rooms(x, y, C.SHOPBASE)))
            C.add_damage(x, y, 0n);
    }

    if (res && picking_at(x, y)) {
        /* maybe unseen monster zaps door you're unlocking */
        C.stop_occupation();
        reset_pick();
    }
    return res;
}

export function chest_shatter_msg(otmp)
{
    let disposition;
    let thing;
    let save_HBlinded, save_BBlinded;

    if (otmp.oclass == C.POTION_CLASS) {
        C.You("%s %s shatter!", C.Blind ? "hear" : "see", C.an(C.bottlename()));
        if (!C.breathless(C.gy.youmonst.data) || C.haseyes(C.gy.youmonst.data))
            C.potionbreathe(otmp);
        return;
    }
    /* We have functions for distant and singular names, but not one */
    /* which does _both_... */
    save_HBlinded = C.HBlinded,  save_BBlinded = C.BBlinded;
    C.HBlinded = 1n,  C.BBlinded = 0n;
    thing = C.singular(otmp, C.xname);
    C.HBlinded = save_HBlinded,  C.BBlinded = save_BBlinded;
    switch (C.objects[otmp.otyp].oc_material) {
    case C.PAPER:
        disposition = "is torn to shreds";
        break;
    case C.WAX:
        disposition = "is crushed";
        break;
    case C.VEGGY:
        disposition = "is pulped";
        break;
    case C.FLESH:
        disposition = "is mashed";
        break;
    case C.GLASS:
        disposition = "shatters";
        break;
    case C.WOOD:
        disposition = "splinters to fragments";
        break;
    default:
        disposition = "is destroyed";
        break;
    }
    C.pline("%s %s!", C.An(thing), disposition);
}

/*lock.c*/

