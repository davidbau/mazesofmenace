/* NetHack 5.0	music.c	$NHDT-Date: 1736530208 2025/01/10 09:30:08 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.120 $ */
/*      Copyright (c) 1989 by Jean-Christophe Collet */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from '../c-runtime/context.js';
export const my_goto_song_initial = [67, 0];

/*
 * This file contains the different functions designed to manipulate the
 * musical instruments and their various effects.
 *
 * The list of instruments / effects is :
 *
 * (wooden) flute       may calm snakes if player has enough dexterity
 * magic flute          may put monsters to sleep:  area of effect depends
 *                      on player level.
 * (tooled) horn        Will awaken monsters:  area of effect depends on
 *                      player level.  May also scare monsters.
 * fire horn            Acts like a wand of fire.
 * frost horn           Acts like a wand of cold.
 * bugle                Will awaken soldiers (if any):  area of effect depends
 *                      on player level.
 * (wooden) harp        May calm nymph if player has enough dexterity.
 * magic harp           Charm monsters:  area of effect depends on player
 *                      level.
 * (leather) drum       Will awaken monsters like the horn.
 * drum of earthquake   Will initiate an earthquake whose intensity depends
 *                      on player level.  That is, it creates random pits
 *                      called here chasms.
 */



/* wake up monster, possibly scare it */
export function awaken_scare(mtmp, scary)
{
    scary = C.boolean(scary);
    mtmp.msleeping = 0;
    mtmp.mcanmove = 1;
    mtmp.mfrozen = 0;
    /* may scare some monsters -- waiting monsters excluded */
    if (!C.unique_corpstat(mtmp.data)
        && (mtmp.mstrategy & C.STRAT_WAITMASK) != 0)
        mtmp.mstrategy &= ~C.STRAT_WAITMASK;
    else if (scary
             && !C.mindless(mtmp.data)
             && !C.resist(mtmp, C.TOOL_CLASS, 0, C.NOTELL)
             /* some monsters are immune */
             && C.onscary(0, 0, mtmp))
        C.monflee(mtmp, 0, 0, 1);
}

/*
 * Wake every monster in range...
 */

export function awaken_monsters(distance)
{
    distance = C.int(distance);
    let mtmp;
    let distm;

    for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon) {
        if (C.DEADMONSTER(mtmp))
            continue;
        if ((distm = C.mdistu(mtmp)) < distance)
            awaken_scare(mtmp, (distm < Math.trunc(distance / 3)));
    }
}

/*
 * Make monsters fall asleep.  Note that they may resist the spell.
 */

export function put_monsters_to_sleep(distance)
{
    distance = C.int(distance);
    let mtmp;

    for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon) {
        if (C.DEADMONSTER(mtmp))
            continue;
        if (C.mdistu(mtmp) < distance
            && C.sleep_monst(mtmp, C.d(10, 10, 93, 0), C.TOOL_CLASS)) {
            mtmp.msleeping = 1; /* 10d10 turns + wake_nearby to rouse */
            C.slept_monst(mtmp);
        }
    }
}

/*
 * Charm snakes in range.  Note that the snakes are NOT tamed.
 */

export function charm_snakes(distance)
{
    distance = C.int(distance);
    let mtmp;
    let could_see_mon, was_peaceful;

    for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon) {
        if (C.DEADMONSTER(mtmp))
            continue;
        if (mtmp.data.mlet == C.S_SNAKE && mtmp.mcanmove
            && C.mdistu(mtmp) < distance) {
            was_peaceful = mtmp.mpeaceful;
            mtmp.mpeaceful = 1;
            mtmp.mavenge = 0;
            mtmp.mstrategy &= ~C.STRAT_WAITMASK;
            could_see_mon = C.canseemon(mtmp);
            mtmp.mundetected = 0;
            C.newsym(mtmp.mx, mtmp.my);
            if (C.canseemon(mtmp)) {
                if (!could_see_mon)
                    C.You("notice %s, swaying with the music.", C.a_monnam(mtmp));
                else
                    C.pline("%s freezes, then sways with the music%s.",
                          C.Monnam(mtmp),
                          was_peaceful ? "" : ", and now seems quieter");
            }
        }
    }
}

/*
 * Calm nymphs in range.
 */

export function calm_nymphs(distance)
{
    distance = C.int(distance);
    let mtmp;

    for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon) {
        if (C.DEADMONSTER(mtmp))
            continue;
        if (mtmp.data.mlet == C.S_NYMPH && mtmp.mcanmove
            && C.mdistu(mtmp) < distance) {
            mtmp.msleeping = 0;
            mtmp.mpeaceful = 1;
            mtmp.mavenge = 0;
            mtmp.mstrategy &= ~C.STRAT_WAITMASK;
            if (C.canseemon(mtmp))
                C.pline(
                    "%s listens cheerfully to the music, then seems quieter.",
                      C.Monnam(mtmp));
        }
    }
}

/* Awake soldiers anywhere the level (and any nearby monster). */
export function awaken_soldiers(bugler  /* monster that played instrument */)
{
    let mtmp;
    let distance, distm;

    /* distance of affected non-soldier monsters to bugler */
    distance = ((bugler.address == C.gy.youmonst.address) ? C.u.ulevel
                                         : bugler.data.mlevel) * 30;

    for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon) {
        if (C.DEADMONSTER(mtmp))
            continue;
        if (C.is_mercenary(mtmp.data) && mtmp.data.address != C.mons[C.PM_GUARD].address) {
            if (!mtmp.mtame)
                mtmp.mpeaceful = 0;
            mtmp.msleeping = mtmp.mfrozen = 0;
            mtmp.mcanmove = 1;
            mtmp.mstrategy &= ~C.STRAT_WAITMASK;
            if (C.canseemon(mtmp))
                C.pline("%s is now ready for battle!", C.Monnam(mtmp));
            else if (!C.Deaf)
                C.Norep("%s the rattle of battle gear being readied.",
                      "You hear");  /* Deaf-aware */
        } else if ((distm = ((bugler.address == C.gy.youmonst.address)
                                 ? C.mdistu(mtmp)
                                 : C.dist2(bugler.mx, bugler.my, mtmp.mx,
                                         mtmp.my))) < distance) {
            awaken_scare(mtmp, (distm < Math.trunc(distance / 3)));
        }
    }
}

/* Charm monsters in range.  Note that they may resist the spell. */
export function charm_monsters(distance)
{
    distance = C.int(distance);
    let mtmp, mtmp2;

    if (C.u.uswallow)
        distance = 0; /* only u.ustuck will be affected (u.usteed is Null
                       * since hero gets forcibly dismounted when engulfed) */

    for (mtmp = C.fmon; mtmp; mtmp = mtmp2) {
        mtmp2 = mtmp.nmon;
        if (C.DEADMONSTER(mtmp))
            continue;

        if (C.mdistu(mtmp) <= distance) {
            /* a shopkeeper can't be tamed but tamedog() pacifies an angry
               one; do that even if mtmp resists in order to behave the same
               as a non-cursed scroll of taming or spell of charm monster */
            if (!C.resist(mtmp, C.TOOL_CLASS, 0, C.NOTELL) || mtmp.isshk)
                C.tamedog(mtmp, 0, 1);
        }
    }
}

/* Try to make a pit. */
export function do_pit(x, y, tu_pit)
{
    x = C.coordxy(x);
    y = C.coordxy(y);
    tu_pit = C.uint(tu_pit);
    let mtmp;
    let otmp;
    let chasm;
    let filltype;

    chasm = C.maketrap(x, y, C.PIT);
    if (!chasm)
        return; /* no pit if portal at that location */
    chasm.tseen = 1;

    mtmp = C.m_at(x, y); /* (redundant?) */
    if ((otmp = C.sobj_at(C.BOULDER, x, y)) != 0) {
        if (C.cansee(x, y))
            C.pline("KADOOM!  The boulder falls into a chasm%s!",
                  C.u_at(x, y) ? " below you" : "");
        if (mtmp)
            mtmp.mtrapped = 0;
        C.obj_extract_self(otmp);
        C.flooreffects(otmp, x, y, "");
        return;
    }

    /* Let liquid flow into the newly created chasm.
       Adjust corresponding code in apply.c for exploding
       wand of digging if you alter this sequence. */
    filltype = C.char(C.fillholetyp(x, y, 0));
    if (filltype != C.ROOM) {
        C.set_levltyp(x, y, filltype); /* levl[x][y] = filltype; */
        C.liquid_flow(x, y, filltype, chasm, 0);
        /* liquid_flow() deletes trap, might kill mtmp */
        if ((chasm = C.t_at(x, y)) == 0)
            return;
    }

    /* We have to check whether monsters or hero falls into a
       new pit....  Note: if we get here, chasm is non-Null. */
    if (mtmp) {
        if (!C.is_flyer(mtmp.data) && !C.is_clinger(mtmp.data)) {
            let m_already_trapped = mtmp.mtrapped;

            mtmp.mtrapped = 1;
            if (!m_already_trapped) { /* suppress messages */
                if (C.cansee(x, y)) {
                    C.pline("%s falls into a chasm!", C.Monnam(mtmp));
                } else if (C.humanoid(mtmp.data)) {
                    // Soundeffect(se_scream, 50); (inactive configured macro)
                    C.You_hear("a scream!");
                }
            }
            /* Falling is okay for falling down
               within a pit from jostling too */
            C.mselftouch(mtmp, "Falling, ", 1);
            if (!C.DEADMONSTER(mtmp)) {
                mtmp.mhp -= C.rnd(m_already_trapped ? 4 : 6, 276, 1);
                if (C.DEADMONSTER(mtmp)) {
                    if (!C.cansee(x, y)) {
                        C.pline("It is destroyed!");
                    } else {
                        C.You("destroy %s!",
                            mtmp.mtame
                             ? C.x_monnam(mtmp, C.ARTICLE_THE, "poor",
                                        C.has_mgivenname(mtmp)
                                         ? C.SUPPRESS_SADDLE : 0,
                                        0)
                             : C.mon_nam(mtmp));
                    }
                    C.xkilled(mtmp, C.XKILL_NOMSG);
                }
            }
        }
    } else if (C.u_at(x, y)) {
        if (C.u.utrap && C.u.utraptype == C.TT_BURIEDBALL) {
            /* Note:  the chain should break if a pit gets
               created at the buried ball's location, which
               is not necessarily here.  But if we don't do
               things this way, entering the new pit below
               will override current trap anyway, but too
               late to get Lev and Fly handling. */
            C.Your("chain breaks!");
            C.reset_utrap(1);
        }
        if (C.Levitation || C.Flying || C.is_clinger(C.gy.youmonst.data)) {
            if (!tu_pit) { /* no pit here previously */
                C.pline("A chasm opens up under you!");
                C.You("don't fall in!");
            }
        } else if (!tu_pit || !C.u.utrap || C.u.utraptype != C.TT_PIT) {
            /* no pit here previously, or you were
               not in it even if there was */
            C.You("fall into a chasm!");
            C.set_utrap((C.rn2(6, 313, 1) + 2), C.TT_PIT);
            C.losehp(C.Maybe_Half_Phys(C.rnd(6, 314, 1)),
                   "fell into a chasm", C.NO_KILLER_PREFIX);
            C.selftouch("Falling, you");
        } else if (C.u.utrap && C.u.utraptype == C.TT_PIT) {
            let keepfooting =
                    (!(C.Fumbling && C.rn2(5, 319, 1))
                     && (!(C.rnl(C.Role_if(C.PM_ARCHEOLOGIST) ? 3 : 9, 320, 1))
                         || ((C.ACURR(C.A_DEX) > 7) && C.rn2(5, 321, 1))));

            C.You("are jostled around violently!");
            C.set_utrap((C.rn2(6, 324, 1) + 2), C.TT_PIT);
            C.losehp(C.Maybe_Half_Phys(C.rnd(keepfooting ? 2 : 4, 325, 1)),
                   "hurt in a chasm", C.NO_KILLER_PREFIX);
            if (keepfooting)
                C.exercise(C.A_DEX, 1);
            else
                C.selftouch((C.Upolyd && (C.slithy(C.gy.youmonst.data)
                                    || C.nolimbs(C.gy.youmonst.data)))
                          ? "Shaken, you"
                          : "Falling down, you");
        }
    } else {
        C.newsym(x, y);
    }
}

/* Generate earthquake :-) of desired force.
 * That is:  create random chasms (pits).
 */
export function do_earthquake(force)
{
    force = C.int(force);
    const into_a_chasm = " into a chasm";
    let x, y;
    let mtmp;
    let trap_at_u = C.t_at(C.u.ux, C.u.uy);
    let start_x, start_y, end_x, end_y, amsk;
    let algn;
    let tu_pit = 0;

    if (trap_at_u)
        tu_pit = C.is_pit(trap_at_u.ttyp);
    if (force > 13) /* sanity precaution; maximum used is actually 10 */
        force = 13;
    start_x = C.u.ux - (force * 2);
    start_y = C.u.uy - (force * 2);
    end_x = C.u.ux + (force * 2);
    end_y = C.u.uy + (force * 2);
    start_x = C.max(start_x, 1);
    start_y = C.max(start_y, 0);
    end_x = C.min(end_x, C.COLNO - 1);
    end_y = C.min(end_y, C.ROWNO - 1);
    for (x = C.coordxy(start_x); x <= end_x; x = C.coordxy(x + 1))
        for (y = C.coordxy(start_y); y <= end_y; y = C.coordxy(y + 1)) {
            if ((mtmp = C.m_at(x, y)) != 0) {
                C.wakeup(mtmp, 1); /* peaceful monster will become hostile */
                if (mtmp.mundetected) {
                    mtmp.mundetected = 0;
                    C.newsym(x, y);
                    if (C.ceiling_hider(mtmp.data)) {
                        if (C.cansee(x, y)) {
                            C.pline("%s is shaken loose from the ceiling!",
                                  C.Amonnam(mtmp));
                        } else if (!C.is_flyer(mtmp.data)) {
                            // Soundeffect(se_thump, 50); (inactive configured macro)
                            C.You_hear("a thump.");
                        }
                    }
                }
                if (C.M_AP_TYPE(mtmp) != C.M_AP_NOTHING
                    && C.M_AP_TYPE(mtmp) != C.M_AP_MONSTER)
                    C.seemimic(mtmp);
            }
            if (C.rn2(14 - force, 387, 2))
                continue;

       /*
        * Possible extensions:
        *  When a door is trapped, explode it instead of silently
        *   turning it into an empty doorway.
        *  Trigger divine wrath when an altar is dumped into a chasm.
        *  Sometimes replace sink with fountain or fountain with pool
        *   instead of always producing a pit.
        *  Sometimes release monster and/or treasure from a grave or
        *   a throne instead of just dumping them into the chasm.
        *  Chance to destroy wall segments?  Trees too?
        *  Honor non-diggable for locked doors, walls, and trees.
        *   Treat non-passwall as if it was non-diggable?
        *  Conjoin some of the umpteen pits when they're adjacent?
        *
        *  Replace 'goto do_pit;' with 'do_pit = TRUE; break;' and
        *   move the pit code to after the switch.
        */

            switch (C.levl[x][y].typ) {
            case C.FOUNTAIN: /* make the fountain disappear */
                if (C.cansee(x, y))
                    C.pline_The("fountain falls%s.", into_a_chasm);
                do_pit(x, y, tu_pit);
                break;
            case C.SINK:
                if (C.cansee(x, y))
                    C.pline_The("kitchen sink falls%s.", into_a_chasm);
                do_pit(x, y, tu_pit);
                break;
            case C.ALTAR:
                amsk = C.altarmask_at(x, y);
                /* always preserve the high altars */
                if ((amsk & C.AM_SANCTUM) != 0)
                    break;
                algn = C.char(C.Amask2align(amsk & C.AM_MASK));
                if (C.cansee(x, y))
                    C.pline_The("%s altar falls%s.",
                              C.align_str(algn), into_a_chasm);
                C.desecrate_altar(0, algn);
                do_pit(x, y, tu_pit);
                break;
            case C.GRAVE:
                if (C.cansee(x, y))
                    C.pline_The("headstone topples%s.", into_a_chasm);
                do_pit(x, y, tu_pit);
                break;
            case C.THRONE:
                if (C.cansee(x, y))
                    C.pline_The("throne falls%s.", into_a_chasm);
                do_pit(x, y, tu_pit);
                break;
            case C.SCORR:
                C.levl[x][y].typ = C.CORR;
                C.unblock_point(x, y);
                if (C.cansee(x, y))
                    C.pline("A secret corridor is revealed.");
                // FALLTHROUGH;
                /*FALLTHRU*/
            case C.CORR:
            case C.ROOM:
                do_pit(x, y, tu_pit);
                break;
            case C.SDOOR:
                C.cvt_sdoor_to_door(C.levl[x][y]); /* .typ = DOOR */
                if (C.cansee(x, y))
                    C.pline("A secret door is revealed.");
                // FALLTHROUGH;
                /*FALLTHRU*/
            case C.DOOR: /* make the door collapse */
                /* if already doorless, treat like room or corridor */
                if (C.levl[x][y].doormask == C.D_NODOOR) {
                    do_pit(x, y, tu_pit);
                    break;
                }
                /* wasn't doorless, now it will be */
                C.levl[x][y].doormask = C.D_NODOOR;
                C.recalc_block_point(x, y);
                C.newsym(x, y); /* before pline */
                if (C.cansee(x, y))
                    C.pline_The("door collapses.");
                if (C.loadChar(C.in_rooms(x, y, C.SHOPBASE)))
                    C.add_damage(x, y, 0n);
                break;
            }
        }
}

export function generic_lvl_desc()
{
    if (C.Is_astralevel(C.u.uz))
        return C.literal("astral plane");
    else if (C.In_endgame(C.u.uz))
        return C.literal("plane");
    else if (C.Is_sanctum(C.u.uz))
        return C.literal("sanctum");
    else if (C.In_sokoban(C.u.uz))
        return C.literal("puzzle");
    else if (C.In_V_tower(C.u.uz))
        return C.literal("tower");
    else
        return C.literal("dungeon");
}

export const beats = [
    "stepper", "one drop", "slow two", "triple stroke roll",
    "double shuffle", "half-time shuffle", "second line", "train"
];

/*
 * The player is trying to extract something from his/her instrument.
 */
export function do_improvisation(instr)
{
    let damage, mode, do_spec = !(C.Stunned || C.Confusion);
    let itmp;
    let mundane = 0, same_old_song = C.booleanLocal();
    same_old_song.value = 0;
    let my_goto_song = C.musicState.my_goto_song,
        improvisation = C.musicState.improvisation;

    itmp = C.objectLocalCopy(instr);
    itmp.oextra = 0; /* ok on this copy as instr maintains
                                        * the ptr to free at some point if
                                        * there is one */

    /* if won't yield special effect, make sound of mundane counterpart */
    if (!do_spec || instr.spe <= 0)
        while (C.objects[itmp.otyp].oc_magic) {
            itmp.otyp -= 1;
            mundane = 1;
        }

    const PLAY_NORMAL = 0x00, PLAY_STUNNED = 0x01,
        PLAY_CONFUSED = 0x02, PLAY_HALLU = 0x04;

    mode = PLAY_NORMAL;
    if (C.Stunned)
        mode |= PLAY_STUNNED;
    if (C.Confusion)
        mode |= PLAY_CONFUSED;
    if (C.Hallucination)
        mode |= PLAY_HALLU;

    if (!C.rn2(2, 535, 3)) {
        /*
         * TEMPORARY?  for multiple impairments, don't always
         * give the generic "it's far from music" message.
         */
        /* remove if STUNNED+CONFUSED ever gets its own message below */
        if (mode == (PLAY_STUNNED | PLAY_CONFUSED))
            mode = !C.rn2(2, 542, 3) ? PLAY_STUNNED : PLAY_CONFUSED;
        /* likewise for stunned and/or confused combined with hallucination */
        if (mode & PLAY_HALLU)
            mode = PLAY_HALLU;
    }

    /* 3.6.3: most of these gave "You produce <blah>" and then many of
       the instrument-specific messages below which immediately follow
       also gave "You produce <something>."  That looked strange so we
       now use a different verb here */
    switch (mode) {
    case PLAY_NORMAL:
        C.You("start playing %s.", C.yname(instr));
        break;
    case PLAY_STUNNED:
        if (!C.Deaf)
            C.You("radiate an obnoxious droning sound.");
        else
            C.You_feel("a monotonous vibration.");
        break;
    case PLAY_CONFUSED:
        if (!C.Deaf)
            C.You("generate a raucous noise.");
        else
            C.You_feel("a jarring vibration.");
        break;
    case PLAY_HALLU:
        C.You("disseminate a kaleidoscopic display of floating butterflies.");
        break;
    /* TODO? give some or all of these combinations their own feedback;
       hallucination ones should reference senses other than hearing... */
    case PLAY_STUNNED | PLAY_CONFUSED:
    case PLAY_STUNNED | PLAY_HALLU:
    case PLAY_CONFUSED | PLAY_HALLU:
    case PLAY_STUNNED | PLAY_CONFUSED | PLAY_HALLU:
    default:
        C.pline("What you perform is quite far from music...");
        break;
    }

    improvisation = C.musicState.improvisation = C.address(improvised_notes(same_old_song));

    switch (itmp.otyp) { /* note: itmp.otyp might differ from instr->otyp */
    case C.MAGIC_FLUTE: /* Make monster fall asleep */
        C.consume_obj_charge(instr, 1);

        C.You("%sproduce %s%s music.", !C.Deaf ? "" : "seem to ",
            C.Hallucination ? "piped" : "soft",
            same_old_song.value ? ", familiar" : "");
        // Hero_playnotes(obj_to_instr(&itmp), improvisation, 50); (inactive configured macro)
        put_monsters_to_sleep(C.u.ulevel * 5);
        C.exercise(C.A_DEX, 1);
        break;
    case C.WOODEN_FLUTE: /* May charm snakes */
        do_spec &= (C.rn2(C.ACURR(C.A_DEX), 600, 3) + C.u.ulevel > 25);
        if (!C.Deaf)
            C.pline("%s%s.", C.Tobjnam(instr, do_spec ? "trill" : "toot"),
                  same_old_song.value ? " a familiar tune" : "");
        else
            C.You_feel("%s %s.", C.yname(instr), do_spec ? "trill" : "toot");
        // Hero_playnotes(obj_to_instr(&itmp), improvisation, 50); (inactive configured macro)
        if (do_spec)
            charm_snakes(C.u.ulevel * 3);
        C.exercise(C.A_DEX, 1);
        break;
    case C.FIRE_HORN:  /* Idem wand of fire */
    case C.FROST_HORN: /* Idem wand of cold */
        C.consume_obj_charge(instr, 1);

        if (!C.getdir(0)) {
            C.pline("%s.", C.Tobjnam(instr, "vibrate"));
            break;
        } else if (!C.u.dx && !C.u.dy && !C.u.dz) {
            if ((damage = C.zapyourself(instr, 1)) != 0) {
                let buf = C.stackAlloc(C.BUFSZ);

                C.Sprintf(buf, "using a magical horn on %sself", C.uhim());
                // Hero_playnotes(obj_to_instr(&itmp), improvisation, 50); (inactive configured macro)
                C.losehp(damage, buf, C.KILLED_BY); /* fire or frost damage */
            }
        } else {
            let type = C.BZ_OFS_AD((instr.otyp == C.FROST_HORN) ? C.AD_COLD
                                                             : C.AD_FIRE);

            if (!C.Blind)
                C.pline("A %s blasts out of the horn!", C.flash_str(type, 0));
            // Hero_playnotes(obj_to_instr(&itmp), improvisation, 50); (inactive configured macro)
            C.gc.current_wand = instr;
            C.ubuzz(C.BZ_U_WAND(type), (C.rn2(6, 634, 3) + 6));
            C.gc.current_wand = 0;
        }
        C.makeknown(instr.otyp);
        break;
    case C.TOOLED_HORN: /* Awaken or scare monsters */
        if (!C.Deaf)
            C.You("produce a frightful, grave%s sound.",
                same_old_song.value ? ", yet familiar," : "");
        else
            C.You("blow into the horn.");
        // Hero_playnotes(obj_to_instr(&itmp), improvisation, 80); (inactive configured macro)
        awaken_monsters(C.u.ulevel * 30);
        C.exercise(C.A_WIS, 0);
        break;
    case C.BUGLE: /* Awaken & attract soldiers */
        if (!C.Deaf)
            C.You("extract a loud%s noise from %s.",
                same_old_song.value ? ", familiar" : "", C.yname(instr));
        else
            C.You("blow into the bugle.");
        // Hero_playnotes(obj_to_instr(&itmp), improvisation, 80); (inactive configured macro)
        awaken_soldiers(C.gy.youmonst);
        C.exercise(C.A_WIS, 0);
        break;
    case C.MAGIC_HARP: /* Charm monsters */
        C.consume_obj_charge(instr, 1);

        if (!C.Deaf)
            C.pline("%s very attractive%s music.",
                  C.Tobjnam(instr, "produce"),
                  same_old_song.value ? " and familiar" : "");
        else
            C.You_feel("very soothing vibrations.");
        // Hero_playnotes(obj_to_instr(&itmp), improvisation, 50); (inactive configured macro)
        charm_monsters(Math.trunc(C.int(C.u.ulevel - 1) / 3) + 1);
        C.exercise(C.A_DEX, 1);
        break;
    case C.WOODEN_HARP: /* May calm Nymph */
        do_spec &= (C.rn2(C.ACURR(C.A_DEX), 673, 3) + C.u.ulevel > 25);
        if (!C.Deaf)
            C.pline("%s %s.", C.Yname2(instr),
                  (do_spec && same_old_song.value)
                  ? "produces a familiar, lilting melody"
                  : (do_spec) ? "produces a lilting melody"
                    : (same_old_song.value) ? "twangs a familiar tune"
                      : "twangs");
        else
            C.You_feel("soothing vibrations.");
        // Hero_playnotes(obj_to_instr(&itmp), improvisation, 50); (inactive configured macro)
        if (do_spec)
            calm_nymphs(C.u.ulevel * 3);
        C.exercise(C.A_DEX, 1);
        break;
    case C.DRUM_OF_EARTHQUAKE: /* create several pits */
        /* a drum of earthquake does not cause deafness
           while still magically functional, nor afterwards
           when it invokes the LEATHER_DRUM case instead and
           mundane is flagged */
        C.consume_obj_charge(instr, 1);

        C.You("produce a heavy, thunderous rolling!");
        // Hero_playnotes(obj_to_instr(&itmp), "C", 100); (inactive configured macro)
        C.pline_The("entire %s is shaking around you!", generic_lvl_desc());
        do_earthquake(Math.trunc(C.int(C.u.ulevel - 1) / 3) + 1);
        /* shake up monsters in a much larger radius... */
        awaken_monsters(C.ROWNO * C.COLNO);
        C.makeknown(C.DRUM_OF_EARTHQUAKE);
        break;
    case C.LEATHER_DRUM: /* Awaken monsters */
        if (!mundane) {
            if (!C.Deaf) {
                C.You("beat a %sdeafening row!",
                    same_old_song.value ? "familiar " : "");
                // Hero_playnotes(obj_to_instr(&itmp), "CCC", 100); (inactive configured macro)
                C.incr_itimeout(C.propertyRef(C.DEAF), (C.rn2(20, 709, 3) + 30));
            } else {
                C.You("pound on the drum.");
            }
            C.exercise(C.A_WIS, 0);
        } else {
            /* TODO maybe: sound effects for these riffs */
            C.You("%s %s.",
                C.rn2(2, 717, 3) ? "butcher" : C.rn2(2, 717, 3) ? "manage" : "pull off",
                C.an(beats[C.rn2(beats.length, 718, 3)]));
            // Hero_playnotes(obj_to_instr(&itmp), improvisation, 50); (inactive configured macro)
        }
        awaken_monsters(C.u.ulevel * (mundane ? 5 : 40));
        C.disp.botl = 1;
        break;
    default:
        C.impossible("What a weird instrument (%d)!", instr.otyp);
        return 0;
    }
    // nhUse(improvisation);
    return 2; /* That takes time */
}

export function improvised_notes(same_as_last_time)
{
    const notes = [ 'A'.charCodeAt(0), 'B'.charCodeAt(0), 'C'.charCodeAt(0), 'D'.charCodeAt(0), 'E'.charCodeAt(0), 'F'.charCodeAt(0), 'G'.charCodeAt(0) ];
    /* target buffer has to be in svc.context, otherwise saving game
     * between improvised recitals would not be able to maintain
     * the same_as_last_time context. */

    /* You can change your tune, usually */
    if (!(C.Unchanging && C.svc.context.jingle[0] != '\0'.charCodeAt(0))) {
        let i, notecount = C.rnd(C.svc.context.jingle.length - 1, 742, 4); /* 1 - 5 */

        for (i = 0; i < notecount; ++i) {
            C.svc.context.jingle[i] = notes[C.rn2(notes.length, 745, 4)];
        }
        C.svc.context.jingle[notecount] = '\0'.charCodeAt(0);
        same_as_last_time.value = 0;
    } else {
        same_as_last_time.value = 1;
    }
    return C.svc.context.jingle;
}

/*
 * So you want music...
 */
export function do_play_instrument(instr)
{
    let buf = C.zeroBuffer(C.BUFSZ), c = 'y'.charCodeAt(0);
    let s;
    let x = C.coordLocal(), y = C.coordLocal();
    let ok;

 nevermind: {
    if (C.Underwater) {
        C.You_cant("play music underwater!");
        return C.ECMD_OK;
    } else if ((instr.otyp == C.WOODEN_FLUTE || instr.otyp == C.MAGIC_FLUTE
                || instr.otyp == C.TOOLED_HORN || instr.otyp == C.FROST_HORN
                || instr.otyp == C.FIRE_HORN || instr.otyp == C.BUGLE)
               && !C.can_blow(C.gy.youmonst)) {
        C.You("are incapable of playing %s.", C.thesimpleoname(instr));
        return C.ECMD_OK;
    }
    if (instr.otyp != C.LEATHER_DRUM && instr.otyp != C.DRUM_OF_EARTHQUAKE
        && !(C.Stunned || C.Confusion || C.Hallucination)) {
        c = C.ynq("Improvise?");
        if (c == 'q'.charCodeAt(0))
            break nevermind;
    }

    if (c != 'n'.charCodeAt(0))
        return C.callLocal(do_improvisation, instr) ? C.ECMD_TIME : C.ECMD_OK;

    if (C.u.uevent.uheard_tune == 2)
        c = C.ynq("Play the passtune?");
    if (c == 'q'.charCodeAt(0)) {
        break nevermind;
    } else if (c == 'y'.charCodeAt(0)) {
        C.Strcpy(buf, C.svt.tune);
    } else {
        C.getlin("What tune are you playing? [5 notes, A-G]", buf);
        C.mungspaces(buf);
        if (C.loadChar(buf) == '\x1b'.charCodeAt(0))
            break nevermind;

        /* convert to uppercase and change any "H" to the expected "B" */
        for (s = buf; C.loadChar(s); s++) {
            C.storeChar(s, C.highc(C.loadChar(s)));
            if (C.loadChar(s) == 'H'.charCodeAt(0))
                C.storeChar(s, 'B'.charCodeAt(0));
        }
    }

    C.You(!C.Deaf ? "extract a strange sound from %s!"
              : "can feel %s emitting vibrations.", C.the(C.xname(instr)));
    // Hero_playnotes(obj_to_instr(instr), buf, 50); (inactive configured macro)


    /* Check if there was the Stronghold drawbridge near
     * and if the tune conforms to what we're waiting for.
     */
    if (C.Is_stronghold(C.u.uz)) {
        C.exercise(C.A_WIS, 1); /* just for trying */
        if (!C.strcmp(buf, C.svt.tune)) {
            /* Search for the drawbridge */
            for (y.value = C.u.uy - 1; y.value <= C.u.uy + 1; y.value++)
                for (x.value = C.u.ux - 1; x.value <= C.u.ux + 1; x.value++) {
                    if (!C.isok(x.value, y.value))
                        continue;
                    if (C.find_drawbridge(x, y)) {
                        /* tune now fully known */
                        C.u.uevent.uheard_tune = 2;
                        C.record_achievement(C.ACH_TUNE);
                        if (C.levl[x.value][y.value].typ == C.DRAWBRIDGE_DOWN)
                            C.close_drawbridge(x.value, y.value);
                        else
                            C.open_drawbridge(x.value, y.value);
                        return C.ECMD_TIME;
                    }
                }
        } else if (!C.Deaf) {
            if (C.u.uevent.uheard_tune < 1)
                C.u.uevent.uheard_tune = 1;
            /* Okay, it wasn't the right tune, but perhaps
             * we can give the player some hints like in the
             * Mastermind game */
            ok = 0;
            for (y.value = C.u.uy - 1; y.value <= C.u.uy + 1 && !ok; y.value++)
                for (x.value = C.u.ux - 1; x.value <= C.u.ux + 1 && !ok; x.value++)
                    if (C.isok(x.value, y.value))
                        if (C.IS_DRAWBRIDGE(C.levl[x.value][y.value].typ)
                            || C.is_drawbridge_wall(x.value, y.value) >= 0)
                            ok = 1;
            if (ok) { /* There is a drawbridge near */
                let tumblers, gears;
                let matched = C.booleanArrayLocal(5);

                tumblers = gears = 0;
                for (x.value = 0; x.value < 5; x.value++)
                    matched[x.value] = 0;

                for (x.value = 0; x.value < C.int(C.strlen(buf)); x.value++)
                    if (x.value < 5) {
                        if (C.loadChar(buf + x.value) == C.svt.tune[x.value]) {
                            gears++;
                            matched[x.value] = 1;
                        } else {
                            for (y.value = 0; y.value < 5; y.value++)
                                if (!matched[y.value] && C.loadChar(buf + x.value) == C.svt.tune[y.value]
                                    && C.loadChar(buf + y.value) != C.svt.tune[y.value]) {
                                    tumblers++;
                                    matched[y.value] = 1;
                                    break;
                                }
                        }
                    }
                if (tumblers) {
                    if (gears) {
                        // Soundeffect(se_tumbler_click, 50); (inactive configured macro)
                        // Soundeffect(se_gear_turn, 50); (inactive configured macro)
                        C.You_hear("%d tumbler%s click and %d gear%s turn.",
                                 tumblers, C.plur(tumblers), gears,
                                 C.plur(gears));
                    } else {
                        // Soundeffect(se_tumbler_click, 50); (inactive configured macro)
                        C.You_hear("%d tumbler%s click.", tumblers,
                                 C.plur(tumblers));
                    }
                } else if (gears) {
                    C.You_hear("%d gear%s turn.", gears, C.plur(gears));
                    /* could only get `gears == 5' by playing five
                       correct notes followed by excess; otherwise,
                       tune would have matched above */
                    if (gears == 5) {
                        C.u.uevent.uheard_tune = 2;
                        C.record_achievement(C.ACH_TUNE);
                    }
                }
            }
        }
    }
    return C.ECMD_TIME;

    }
    C.pline1(C.Never_mind);
    return C.ECMD_OK;
}

export function obj_to_instr(obj)
{
    let ret_instr = C.ins_no_instrument;


    return ret_instr;
}
/*music.c*/
