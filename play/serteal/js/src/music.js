/* NetHack 5.0	music.c	$NHDT-Date: 1736530208 2025/01/10 09:30:08 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.120 $ */
/*      Copyright (c) 1989 by Jean-Christophe Collet */
/* NetHack may be freely redistributed.  See license for details. */

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

// #include "hack.h"













/* wake up monster, possibly scare it */
function /* void */
awaken_scare(mtmp, scary)
{
    mtmp.msleeping = 0;
    mtmp.mcanmove = 1;
    mtmp.mfrozen = 0;
    /* may scare some monsters -- waiting monsters excluded */
    if (!unique_corpstat(mtmp.data)
        && (mtmp.mstrategy & STRAT_WAITMASK) != 0)
        mtmp.mstrategy = and64u(mtmp.mstrategy, ~STRAT_WAITMASK);
    else if (scary
             && !mindless(mtmp.data)
             && !resist(mtmp, TOOL_CLASS, 0, NOTELL)
             /* some monsters are immune */
             && onscary(0, 0, mtmp))
        monflee(mtmp, 0, FALSE, TRUE);
}

/*
 * Wake every monster in range...
 */

function /* void */
awaken_monsters(distance)
{
    let mtmp;
    let distm;

    for (mtmp = fmon(); mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER(mtmp))
            continue;
        if ((distm = mdistu(mtmp)) < distance)
            awaken_scare(mtmp, (+(distm < Math.trunc(distance / 3))));
    }
}

/*
 * Make monsters fall asleep.  Note that they may resist the spell.
 */

function /* void */
put_monsters_to_sleep(distance)
{
    let mtmp;

    for (mtmp = fmon(); mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER(mtmp))
            continue;
        if (mdistu(mtmp) < distance
            && sleep_monst(mtmp, d(10, 10), TOOL_CLASS)) {
            mtmp.msleeping = 1; /* 10d10 turns + wake_nearby to rouse */
            slept_monst(mtmp);
        }
    }
}

/*
 * Charm snakes in range.  Note that the snakes are NOT tamed.
 */

function /* void */
charm_snakes(distance)
{
    let mtmp;
    let could_see_mon, was_peaceful;

    for (mtmp = fmon(); mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER(mtmp))
            continue;
        if (mtmp.data.mlet == S_SNAKE && mtmp.mcanmove
            && mdistu(mtmp) < distance) {
            was_peaceful = mtmp.mpeaceful;
            mtmp.mpeaceful = 1;
            mtmp.mavenge = 0;
            mtmp.mstrategy = and64u(mtmp.mstrategy, ~STRAT_WAITMASK);
            could_see_mon = canseemon(mtmp);
            mtmp.mundetected = 0;
            newsym(mtmp.mx, mtmp.my);
            if (canseemon(mtmp)) {
                if (!could_see_mon)
                    You(_("notice %s, swaying with the music."), a_monnam(mtmp));
                else
                    pline(_("%s freezes, then sways with the music%s."),
                          Monnam(mtmp),
                          was_peaceful ? _("") : _(", and now seems quieter"));
            }
        }
    }
}

/*
 * Calm nymphs in range.
 */

function /* void */
calm_nymphs(distance)
{
    let mtmp;

    for (mtmp = fmon(); mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER(mtmp))
            continue;
        if (mtmp.data.mlet == S_NYMPH && mtmp.mcanmove
            && mdistu(mtmp) < distance) {
            mtmp.msleeping = 0;
            mtmp.mpeaceful = 1;
            mtmp.mavenge = 0;
            mtmp.mstrategy = and64u(mtmp.mstrategy, ~STRAT_WAITMASK);
            if (canseemon(mtmp))
                pline(
                    _("%s listens cheerfully to the music, then seems quieter."),
                      Monnam(mtmp));
        }
    }
}

/* Awake soldiers anywhere the level (and any nearby monster). */
export function /* void */
awaken_soldiers(bugler)
{
    let mtmp;
    let distance, distm;

    /* distance of affected non-soldier monsters to bugler */
    distance = ((bugler == gy.youmonst) ? u.ulevel
                                         : bugler.data.mlevel) * 30;

    for (mtmp = fmon(); mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER(mtmp))
            continue;
        if (is_mercenary(mtmp.data) && mtmp.data != mons[PM_GUARD]) {
            if (!mtmp.mtame)
                mtmp.mpeaceful = 0;
            mtmp.msleeping = mtmp.mfrozen = 0;
            mtmp.mcanmove = 1;
            mtmp.mstrategy = and64u(mtmp.mstrategy, ~STRAT_WAITMASK);
            if (canseemon(mtmp))
                pline(_("%s is now ready for battle!"), Monnam(mtmp));
            else if (!Deaf())
                Norep(_("%s the rattle of battle gear being readied."),
                      _("You hear"));  /* Deaf-aware */
        } else if ((distm = ((bugler == gy.youmonst)
                                 ? mdistu(mtmp)
                                 : dist2(bugler.mx, bugler.my, mtmp.mx,
                                         mtmp.my))) < distance) {
            awaken_scare(mtmp, (+(distm < Math.trunc(distance / 3))));
        }
    }
}

/* Charm monsters in range.  Note that they may resist the spell. */
function /* void */
charm_monsters(distance)
{
    let mtmp, mtmp2;

    if (u.uswallow)
        distance = 0; /* only u.ustuck will be affected (u.usteed is Null
                       * since hero gets forcibly dismounted when engulfed) */

    for (mtmp = fmon(); mtmp; mtmp = mtmp2) {
        mtmp2 = mtmp.nmon;
        if (DEADMONSTER(mtmp))
            continue;

        if (mdistu(mtmp) <= distance) {
            /* a shopkeeper can't be tamed but tamedog() pacifies an angry
               one; do that even if mtmp resists in order to behave the same
               as a non-cursed scroll of taming or spell of charm monster */
            if (!resist(mtmp, TOOL_CLASS, 0, NOTELL) || mtmp.isshk)
                void tamedog(mtmp, null, TRUE);
        }
    }
}

/* Try to make a pit. */
function /* void */
do_pit(x, y, tu_pit)
{
    let mtmp;
    let otmp;
    let chasm;
    let filltype;

    chasm = maketrap(x, y, PIT);
    if (!chasm)
        return; /* no pit if portal at that location */
    chasm.tseen = 1;

    mtmp = m_at(x, y); /* (redundant?) */
    if ((otmp = sobj_at(BOULDER, x, y)) != null) {
        if (cansee(x, y))
            pline(_("KADOOM!  The boulder falls into a chasm%s!"),
                  u_at(x, y) ? _(" below you") : _(""));
        if (mtmp)
            mtmp.mtrapped = 0;
        obj_extract_self(otmp);
        void flooreffects(otmp, x, y, _(""));
        return;
    }

    /* Let liquid flow into the newly created chasm.
       Adjust corresponding code in apply.c for exploding
       wand of digging if you alter this sequence. */
    filltype = fillholetyp(x, y, FALSE);
    if (filltype != ROOM) {
        set_levltyp(x, y, filltype); /* levl[x][y] = filltype; */
        liquid_flow(x, y, filltype, chasm, 0);
        /* liquid_flow() deletes trap, might kill mtmp */
        if ((chasm = t_at(x, y)) == null)
            return;
    }

    /* We have to check whether monsters or hero falls into a
       new pit....  Note: if we get here, chasm is non-Null. */
    if (mtmp) {
        if (!is_flyer(mtmp.data) && !is_clinger(mtmp.data)) {
            let m_already_trapped = mtmp.mtrapped;

            mtmp.mtrapped = 1;
            if (!m_already_trapped) { /* suppress messages */
                if (cansee(x, y)) {
                    pline(_("%s falls into a chasm!"), Monnam(mtmp));
                } else if (humanoid(mtmp.data)) {
                     ;
                    You_hear(_("a scream!"));
                }
            }
            /* Falling is okay for falling down
               within a pit from jostling too */
            mselftouch(mtmp, _("Falling, "), TRUE);
            if (!DEADMONSTER(mtmp)) {
                mtmp.mhp -= rnd(m_already_trapped ? 4 : 6);
                if (DEADMONSTER(mtmp)) {
                    if (!cansee(x, y)) {
                        pline(_("It is destroyed!"));
                    } else {
                        You(_("destroy %s!"),
                            mtmp.mtame
                             ? x_monnam(mtmp, ARTICLE_THE, _("poor"),
                                        has_mgivenname(mtmp)
                                         ? SUPPRESS_SADDLE : 0,
                                        FALSE)
                             : mon_nam(mtmp));
                    }
                    xkilled(mtmp, XKILL_NOMSG);
                }
            }
        }
    } else if (u_at(x, y)) {
        if (u.utrap && u.utraptype == TT_BURIEDBALL) {
            /* Note:  the chain should break if a pit gets
               created at the buried ball's location, which
               is not necessarily here.  But if we don't do
               things this way, entering the new pit below
               will override current trap anyway, but too
               late to get Lev and Fly handling. */
            Your(_("chain breaks!"));
            reset_utrap(TRUE);
        }
        if (Levitation() || Flying() || is_clinger(gy.youmonst.data)) {
            if (!tu_pit) { /* no pit here previously */
                pline(_("A chasm opens up under you!"));
                You(_("don't fall in!"));
            }
        } else if (!tu_pit || !u.utrap || u.utraptype != TT_PIT) {
            /* no pit here previously, or you were
               not in it even if there was */
            You(_("fall into a chasm!"));
            set_utrap(unsigned(rn1(6, 2)), TT_PIT);
            losehp((((Half_physical_damage()) ? (Math.trunc(((((rnd(6)) + 1)) / 2))) : (rnd(6)))),
                   _("fell into a chasm"), NO_KILLER_PREFIX);
            selftouch(_("Falling, you"));
        } else if (u.utrap && u.utraptype == TT_PIT) {
            let keepfooting = (((!(Fumbling() && rn2(5))
                     && (!(rnl(Role_if(PM_ARCHEOLOGIST) ? 3 : 9))
                         || ((ACURR(A_DEX) > 7) && rn2(5)))) ? 1 : 0));


            You(_("are jostled around violently!"));
            set_utrap(unsigned(rn1(6, 2)), TT_PIT);
            losehp((((Half_physical_damage()) ? (Math.trunc(((((rnd(keepfooting ? 2 : 4)) + 1)) / 2))) : (rnd(keepfooting ? 2 : 4)))),
                   _("hurt in a chasm"), NO_KILLER_PREFIX);
            if (keepfooting)
                exercise(A_DEX, TRUE);
            else
                selftouch((Upolyd() && (slithy(gy.youmonst.data)
                                    || nolimbs(gy.youmonst.data)))
                          ? _("Shaken, you")
                          : _("Falling down, you"));
        }
    } else {
        newsym(x, y);
    }
}

/* Generate earthquake :-) of desired force.
 * That is:  create random chasms (pits).
 */
function /* void */
do_earthquake(force)
{
    let into_a_chasm = init_string(static_array("do_earthquake.into_a_chasm", char, sizeof_string(" into a chasm")), _(" into a chasm"), true);
    let x, y;
    let mtmp;
    let trap_at_u = t_at(u.ux, u.uy);
    let start_x, start_y, end_x, end_y, amsk;
    let algn;
    let tu_pit = 0;

    if (trap_at_u)
        tu_pit = is_pit(trap_at_u.ttyp);
    if (force > 13) /* sanity precaution; maximum used is actually 10 */
        force = 13;
    start_x = u.ux - (force * 2);
    start_y = u.uy - (force * 2);
    end_x = u.ux + (force * 2);
    end_y = u.uy + (force * 2);
    start_x = max(start_x, 1);
    start_y = max(start_y, 0);
    end_x = min(end_x, COLNO - 1);
    end_y = min(end_y, ROWNO - 1);
    for (x = start_x; x <= end_x; x++)
        for (y = start_y; y <= end_y; y++) {
            if ((mtmp = m_at(x, y)) != null) {
                wakeup(mtmp, TRUE); /* peaceful monster will become hostile */
                if (mtmp.mundetected) {
                    mtmp.mundetected = 0;
                    newsym(x, y);
                    if (ceiling_hider(mtmp.data)) {
                        if (cansee(x, y)) {
                            pline(_("%s is shaken loose from the ceiling!"),
                                  Amonnam(mtmp));
                        } else if (!is_flyer(mtmp.data)) {
                             ;
                            You_hear(_("a thump."));
                        }
                    }
                }
                if (M_AP_TYPE(mtmp) != M_AP_NOTHING
                    && M_AP_TYPE(mtmp) != M_AP_MONSTER)
                    seemimic(mtmp);
            }
            if (rn2(14 - force))
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

            switch (levl()[x][y].typ) {
            case FOUNTAIN: /* make the fountain disappear */
                if (cansee(x, y))
                    pline_The(_("fountain falls%s."), into_a_chasm);
                do_pit(x, y, tu_pit);
                break;
            case SINK:
                if (cansee(x, y))
                    pline_The(_("kitchen sink falls%s."), into_a_chasm);
                do_pit(x, y, tu_pit);
                break;
            case ALTAR:
                amsk = altarmask_at(x, y);
                /* always preserve the high altars */
                if ((amsk & AM_SANCTUM) != 0)
                    break;
                algn = Amask2align(amsk & AM_MASK);
                if (cansee(x, y))
                    pline_The(_("%s altar falls%s."),
                              align_str(algn), into_a_chasm);
                desecrate_altar(FALSE, algn);
                do_pit(x, y, tu_pit);
                break;
            case GRAVE:
                if (cansee(x, y))
                    pline_The(_("headstone topples%s."), into_a_chasm);
                do_pit(x, y, tu_pit);
                break;
            case THRONE:
                if (cansee(x, y))
                    pline_The(_("throne falls%s."), into_a_chasm);
                do_pit(x, y, tu_pit);
                break;
            case SCORR:
                levl()[x][y].typ = CORR;
                unblock_point(x, y);
                if (cansee(x, y))
                    pline(_("A secret corridor is revealed."));
                /* FALLTHROUGH */;
                /*FALLTHRU*/
            case CORR:
            case ROOM:
                do_pit(x, y, tu_pit);
                break;
            case SDOOR:
                cvt_sdoor_to_door(levl()[x][y]); /* .typ = DOOR */
                if (cansee(x, y))
                    pline(_("A secret door is revealed."));
                /* FALLTHROUGH */;
                /*FALLTHRU*/
            case DOOR: /* make the door collapse */
                /* if already doorless, treat like room or corridor */
                if (levl()[x][y].flags == D_NODOOR) {
                    do_pit(x, y, tu_pit);
                    break;
                }
                /* wasn't doorless, now it will be */
                levl()[x][y].flags = D_NODOOR;
                recalc_block_point(x, y);
                newsym(x, y); /* before pline */
                if (cansee(x, y))
                    pline_The(_("door collapses."));
                if (chars[in_rooms(x, y, SHOPBASE)])
                    add_damage(x, y, 0);
                break;
            }
        }
}

function /* const char * */
generic_lvl_desc()
{
    if (Is_astralevel(u.uz))
        return _("astral plane");
    else if (In_endgame(u.uz))
        return _("plane");
    else if (Is_sanctum(u.uz))
        return _("sanctum");
    else if (In_sokoban(u.uz))
        return _("puzzle");
    else if (In_V_tower(u.uz))
        return _("tower");
    else
        return _("dungeon");
}

const beats = static_array("beats", ptr_to(char), null, [
    _("stepper"), _("one drop"), _("slow two"), _("triple stroke roll"),
    _("double shuffle"), _("half-time shuffle"), _("second line"), _("train")
]);

/*
 * The player is trying to extract something from his/her instrument.
 */
function /* int */
do_improvisation(instr)
{ const $frame = stack_frame(); try {
    let damage, mode, do_spec = +!(Stunned() || Confusion());
    let itmp = stack_struct(struct_obj);
    let mundane = FALSE, same_old_song = stack_var(boolean, FALSE);
    let my_goto_song = static_array("do_improvisation.my_goto_song", char, null, [ord('C'), ord('\0')]),
                improvisation = static_var("do_improvisation.improvisation", ptr_to(char), my_goto_song);

    struct_assign(itmp, instr);
    itmp.oextra = null; /* ok on this copy as instr maintains
                                        * the ptr to free at some point if
                                        * there is one */

    /* if won't yield special effect, make sound of mundane counterpart */
    if (!do_spec || instr.spe <= 0)
        while (objects[itmp.otyp].oc_magic) {
            itmp.otyp -= 1;
            mundane = TRUE;
        }





    mode = PLAY_NORMAL;
    if (Stunned())
        mode |= PLAY_STUNNED;
    if (Confusion())
        mode |= PLAY_CONFUSED;
    if (Hallucination())
        mode |= PLAY_HALLU;

    if (!rn2(2)) {
        /*
         * TEMPORARY?  for multiple impairments, don't always
         * give the generic "it's far from music" message.
         */
        /* remove if STUNNED+CONFUSED ever gets its own message below */
        if (mode == (PLAY_STUNNED | PLAY_CONFUSED))
            mode = !rn2(2) ? PLAY_STUNNED : PLAY_CONFUSED;
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
        You(_("start playing %s."), yname(instr));
        break;
    case PLAY_STUNNED:
        if (!Deaf())
            You(_("radiate an obnoxious droning sound."));
        else
            You_feel(_("a monotonous vibration."));
        break;
    case PLAY_CONFUSED:
        if (!Deaf())
            You(_("generate a raucous noise."));
        else
            You_feel(_("a jarring vibration."));
        break;
    case PLAY_HALLU:
        You(_("disseminate a kaleidoscopic display of floating butterflies."));
        break;
    /* TODO? give some or all of these combinations their own feedback;
       hallucination ones should reference senses other than hearing... */
    case PLAY_STUNNED | PLAY_CONFUSED:
    case PLAY_STUNNED | PLAY_HALLU:
    case PLAY_CONFUSED | PLAY_HALLU:
    case PLAY_STUNNED | PLAY_CONFUSED | PLAY_HALLU:
    default:
        pline(_("What you perform is quite far from music..."));
        break;
    }





    improvisation[0] = improvised_notes(addr_of(same_old_song));

    switch (itmp.otyp) { /* note: itmp.otyp might differ from instr->otyp */
    case MAGIC_FLUTE: /* Make monster fall asleep */
        consume_obj_charge(instr, TRUE);

        You(_("%sproduce %s%s music."), !Deaf() ? _("") : _("seem to "),
            Hallucination() ? _("piped") : _("soft"),
            same_old_song[0] ? _(", familiar") : _(""));
          ;
        put_monsters_to_sleep(u.ulevel * 5);
        exercise(A_DEX, TRUE);
        break;
    case WOODEN_FLUTE: /* May charm snakes */
        do_spec &= (+(rn2(ACURR(A_DEX)) + u.ulevel > 25));
        if (!Deaf())
            pline(_("%s%s."), Tobjnam(instr, do_spec ? _("trill") : _("toot")),
                  same_old_song[0] ? _(" a familiar tune") : _(""));
        else
            You_feel(_("%s %s."), yname(instr), do_spec ? _("trill") : _("toot"));
          ;
        if (do_spec)
            charm_snakes(u.ulevel * 3);
        exercise(A_DEX, TRUE);
        break;
    case FIRE_HORN:  /* Idem wand of fire */
    case FROST_HORN: /* Idem wand of cold */
        consume_obj_charge(instr, TRUE);

        if (!getdir(0)) {
            pline(_("%s."), Tobjnam(instr, _("vibrate")));
            break;
        } else if (!u.dx && !u.dy && !u.dz) {
            if ((damage = zapyourself(instr, TRUE)) != 0) {
                let buf = stack_array(char, BUFSZ);

                void sprintf(buf, _("using a magical horn on %sself"), uhim());
                  ;
                losehp(damage, buf, KILLED_BY); /* fire or frost damage */
            }
        } else {
            let type = BZ_OFS_AD((instr.otyp == FROST_HORN) ? AD_COLD
                                                             : AD_FIRE);

            if (!Blind())
                pline(_("A %s blasts out of the horn!"), flash_str(type, FALSE));
              ;
            gc.current_wand = instr;
            ubuzz(BZ_U_WAND(type), rn1(6, 6));
            gc.current_wand = null;
        }
        makeknown(instr.otyp);
        break;
    case TOOLED_HORN: /* Awaken or scare monsters */
        if (!Deaf())
            You(_("produce a frightful, grave%s sound."),
                same_old_song[0] ? _(", yet familiar,") : _(""));
        else
            You(_("blow into the horn."));
          ;
        awaken_monsters(u.ulevel * 30);
        exercise(A_WIS, FALSE);
        break;
    case BUGLE: /* Awaken & attract soldiers */
        if (!Deaf())
            You(_("extract a loud%s noise from %s."),
                same_old_song[0] ? _(", familiar") : _(""), yname(instr));
        else
            You(_("blow into the bugle."));
          ;
        awaken_soldiers(gy.youmonst);
        exercise(A_WIS, FALSE);
        break;
    case MAGIC_HARP: /* Charm monsters */
        consume_obj_charge(instr, TRUE);

        if (!Deaf())
            pline(_("%s very attractive%s music."),
                  Tobjnam(instr, _("produce")),
                  same_old_song[0] ? _(" and familiar") : _(""));
        else
            You_feel(_("very soothing vibrations."));
          ;
        charm_monsters(Math.trunc((u.ulevel - 1) / 3) + 1);
        exercise(A_DEX, TRUE);
        break;
    case WOODEN_HARP: /* May calm Nymph */
        do_spec &= (+(rn2(ACURR(A_DEX)) + u.ulevel > 25));
        if (!Deaf())
            pline(_("%s %s."), Yname2(instr),
                  (do_spec && same_old_song[0])
                  ? _("produces a familiar, lilting melody")
                  : (do_spec) ? _("produces a lilting melody")
                    : (same_old_song[0]) ? _("twangs a familiar tune")
                      : _("twangs"));
        else
            You_feel(_("soothing vibrations."));
          ;
        if (do_spec)
            calm_nymphs(u.ulevel * 3);
        exercise(A_DEX, TRUE);
        break;
    case DRUM_OF_EARTHQUAKE: /* create several pits */
        /* a drum of earthquake does not cause deafness
           while still magically functional, nor afterwards
           when it invokes the LEATHER_DRUM case instead and
           mundane is flagged */
        consume_obj_charge(instr, TRUE);

        You(_("produce a heavy, thunderous rolling!"));
         "C" ;
        pline_The(_("entire %s is shaking around you!"), generic_lvl_desc());
        do_earthquake(Math.trunc((u.ulevel - 1) / 3) + 1);
        /* shake up monsters in a much larger radius... */
        awaken_monsters(ROWNO * COLNO);
        makeknown(DRUM_OF_EARTHQUAKE);
        break;
    case LEATHER_DRUM: /* Awaken monsters */
        if (!mundane) {
            if (!Deaf()) {
                You(_("beat a %sdeafening row!"),
                    same_old_song[0] ? _("familiar ") : _(""));
                 "CCC" ;
                incr_itimeout(ref_of(u.uprops[DEAF], "intrinsic"), rn1(20, 30));
            } else {
                You(_("pound on the drum."));
            }
            exercise(A_WIS, FALSE);
        } else {
            /* TODO maybe: sound effects for these riffs */
            You(_("%s %s."),
                rn2(2) ? _("butcher") : rn2(2) ? _("manage") : _("pull off"),
                an(ROLL_FROM(beats)));
              ;
        }
        awaken_monsters(u.ulevel * (mundane ? 5 : 40));
        disp.botl = TRUE;
        break;
    default:
        impossible(_("What a weird instrument (%d)!"), instr.otyp);
        return 0;
    }
    (void (improvisation[0]));
    return 2; /* That takes time */
} finally { stack_pop($frame); } } export const PLAY_NORMAL = 0x00; export const PLAY_STUNNED = 0x01; export const PLAY_CONFUSED = 0x02; export const PLAY_HALLU = 0x04;

function /* char * */
improvised_notes(same_as_last_time)
{
    let notes = static_array("improvised_notes.notes", char, 7, [ ord('A'), ord('B'), ord('C'), ord('D'), ord('E'), ord('F'), ord('G') ]);
    /* target buffer has to be in svc.context, otherwise saving game
     * between improvised recitals would not be able to maintain
     * the same_as_last_time context. */

    /* You can change your tune, usually */
    if (!(Unchanging() && chars[svc.context.jingle + 0] != ord('\0'))) {
        let i, notecount = rnd((Math.trunc((sizeof_member(svc.context, "jingle") / sizeof(char)))) - 1); /* 1 - 5 */

        for (i = 0; i < notecount; ++i) {
            chars[svc.context.jingle + i] = chars[notes + rn2((Math.trunc((sizeof(array_of(char, 7)) / sizeof(char)))))];
        }
        chars[svc.context.jingle + notecount] = ord('\0');
        chars[same_as_last_time] = FALSE;
    } else {
        chars[same_as_last_time] = TRUE;
    }
    return svc.context.jingle;
}

/*
 * So you want music...
 */
export function /* int */
do_play_instrument(instr)
{ const $frame = stack_frame(); try {
    var buf = init_list(stack_array(char, BUFSZ), []), c = ord('y');
    var s;
    var x = stack_var(coordxy), y = stack_var(coordxy);
    var ok;

    if (Underwater()) {
        You_cant(_("play music underwater!"));
        return ECMD_OK;
    } else if ((instr.otyp == WOODEN_FLUTE || instr.otyp == MAGIC_FLUTE
                || instr.otyp == TOOLED_HORN || instr.otyp == FROST_HORN
                || instr.otyp == FIRE_HORN || instr.otyp == BUGLE)
               && !can_blow(gy.youmonst)) {
        You(_("are incapable of playing %s."), thesimpleoname(instr));
        return ECMD_OK;
    }
    nevermind: { if (instr.otyp != LEATHER_DRUM && instr.otyp != DRUM_OF_EARTHQUAKE
        && !(Stunned() || Confusion() || Hallucination())) {
        c = ynq(_("Improvise?"));
        if (c == ord('q'))
            break nevermind;;
    }

    if (c != ord('n'))
        return do_improvisation(instr) ? ECMD_TIME : ECMD_OK;

    if (u.uevent.uheard_tune == 2)
        c = ynq(_("Play the passtune?"));
    if (c == ord('q')) {
        break nevermind;
    } else if (c == ord('y')) {
        void strcpy(buf, svt.tune);
    } else {
        getlin(_("What tune are you playing? [5 notes, A-G]"), buf);
        void mungspaces(buf);
        if (chars[buf] == ord('\x1b'))
            break nevermind;;

        /* convert to uppercase and change any "H" to the expected "B" */
        for (s = buf; chars[s]; s++) {
            chars[s] = highc(chars[s]);
            if (chars[s] == ord('H'))
                chars[s] = ord('B');
        }
    }

    You(!Deaf() ? _("extract a strange sound from %s!")
              : _("can feel %s emitting vibrations."), the(xname(instr)));
      ;


    /* Check if there was the Stronghold drawbridge near
     * and if the tune conforms to what we're waiting for.
     */
    if (Is_stronghold(u.uz)) {
        exercise(A_WIS, TRUE); /* just for trying */
        if (!strcmp(buf, svt.tune)) {
            /* Search for the drawbridge */
            for (y[0] = u.uy - 1; y[0] <= u.uy + 1; y[0]++)
                for (x[0] = u.ux - 1; x[0] <= u.ux + 1; x[0]++) {
                    if (!isok(x[0], y[0]))
                        continue;
                    if (find_drawbridge(x, y)) {
                        /* tune now fully known */
                        u.uevent.uheard_tune = 2;
                        record_achievement(ACH_TUNE);
                        if (levl()[x[0]][y[0]].typ == DRAWBRIDGE_DOWN)
                            close_drawbridge(x[0], y[0]);
                        else
                            open_drawbridge(x[0], y[0]);
                        return ECMD_TIME;
                    }
                }
        } else if (!Deaf()) {
            if (u.uevent.uheard_tune < 1)
                u.uevent.uheard_tune = 1;
            /* Okay, it wasn't the right tune, but perhaps
             * we can give the player some hints like in the
             * Mastermind game */
            ok = FALSE;
            for (y[0] = u.uy - 1; y[0] <= u.uy + 1 && !ok; y[0]++)
                for (x[0] = u.ux - 1; x[0] <= u.ux + 1 && !ok; x[0]++)
                    if (isok(x[0], y[0]))
                        if (IS_DRAWBRIDGE(levl()[x[0]][y[0]].typ)
                            || is_drawbridge_wall(x[0], y[0]) >= 0)
                            ok = TRUE;
            if (ok) { /* There is a drawbridge near */
                var tumblers, gears;
                var matched = stack_array(schar, 5);

                tumblers = gears = 0;
                for (x[0] = 0; x[0] < 5; x[0]++)
                    chars[matched + (x[0])] = FALSE;

                for (x[0] = 0; x[0] < int(strlen(buf)); x[0]++)
                    if (x[0] < 5) {
                        if (chars[buf + (x[0])] == chars[svt.tune + (x[0])]) {
                            gears++;
                            chars[matched + (x[0])] = TRUE;
                        } else {
                            for (y[0] = 0; y[0] < 5; y[0]++)
                                if (!chars[matched + (y[0])] && chars[buf + (x[0])] == chars[svt.tune + (y[0])]
                                    && chars[buf + (y[0])] != chars[svt.tune + (y[0])]) {
                                    tumblers++;
                                    chars[matched + (y[0])] = TRUE;
                                    break;
                                }
                        }
                    }
                if (tumblers) {
                    if (gears) {
                         ;
                         ;
                        You_hear(_("%d tumbler%s click and %d gear%s turn."),
                                 tumblers, plur(tumblers), gears,
                                 plur(gears));
                    } else {
                         ;
                        You_hear(_("%d tumbler%s click."), tumblers,
                                 plur(tumblers));
                    }
                } else if (gears) {
                    You_hear(_("%d gear%s turn."), gears, plur(gears));
                    /* could only get `gears == 5' by playing five
                       correct notes followed by excess; otherwise,
                       tune would have matched above */
                    if (gears == 5) {
                        u.uevent.uheard_tune = 2;
                        record_achievement(ACH_TUNE);
                    }
                }
            }
        }
    }
    return ECMD_TIME;

 }
    pline1(Never_mind());
    return ECMD_OK;
} finally { stack_pop($frame); } }

export function /* enum instruments */
obj_to_instr(obj) {
    let ret_instr = ins_no_instrument;







































    return ret_instr;
}
/*music.c*/
import { AM_MASK } from "./align.h.js";
import { AM_SANCTUM } from "./align.h.js";
import { Amask2align } from "./align.h.macros.js";
import { A_DEX } from "./attrib.h.js";
import { A_WIS } from "./attrib.h.js";
import { ACURR } from "./attrib.h.macros.js";
import { Never_mind } from "./decl.h.macros.js";
import { S_NYMPH } from "./defsym.h.js";
import { S_SNAKE } from "./defsym.h.js";
import { TOOL_CLASS } from "./defsym.h.js";
import { In_endgame } from "./dungeon.h.macros.js";
import { In_sokoban } from "./dungeon.h.macros.js";
import { Is_astralevel } from "./dungeon.h.macros.js";
import { Is_sanctum } from "./dungeon.h.macros.js";
import { Is_stronghold } from "./dungeon.h.macros.js";
import { BUFSZ } from "./global.h.js";
import { COLNO } from "./global.h.js";
import { FALSE } from "./global.h.js";
import { ROWNO } from "./global.h.js";
import { TRUE } from "./global.h.js";
import { boolean } from "./global.h.js";
import { coordxy } from "./global.h.js";
import { ARTICLE_THE } from "./hack.h.js";
import { ECMD_OK } from "./hack.h.js";
import { ECMD_TIME } from "./hack.h.js";
import { KILLED_BY } from "./hack.h.js";
import { NOTELL } from "./hack.h.js";
import { NO_KILLER_PREFIX } from "./hack.h.js";
import { SUPPRESS_SADDLE } from "./hack.h.js";
import { XKILL_NOMSG } from "./hack.h.js";
import { BZ_OFS_AD } from "./hack.h.macros.js";
import { BZ_U_WAND } from "./hack.h.macros.js";
import { ROLL_FROM } from "./hack.h.macros.js";
import { makeknown } from "./hack.h.macros.js";
import { max } from "./hack.h.macros.js";
import { mdistu } from "./hack.h.macros.js";
import { min } from "./hack.h.macros.js";
import { pline1 } from "./hack.h.macros.js";
import { plur } from "./hack.h.macros.js";
import { rn1 } from "./hack.h.macros.js";
import { ynq } from "./hack.h.macros.js";
import { has_mgivenname } from "./mextra.h.macros.js";
import { SHOPBASE } from "./mkroom.h.js";
import { AD_COLD } from "./monattk.h.js";
import { AD_FIRE } from "./monattk.h.js";
import { ceiling_hider } from "./mondata.h.macros.js";
import { humanoid } from "./mondata.h.macros.js";
import { is_clinger } from "./mondata.h.macros.js";
import { is_flyer } from "./mondata.h.macros.js";
import { is_mercenary } from "./mondata.h.macros.js";
import { mindless } from "./mondata.h.macros.js";
import { nolimbs } from "./mondata.h.macros.js";
import { slithy } from "./mondata.h.macros.js";
import { unique_corpstat } from "./mondata.h.macros.js";
import { M_AP_MONSTER } from "./monst.h.js";
import { M_AP_NOTHING } from "./monst.h.js";
import { STRAT_WAITMASK } from "./monst.h.js";
import { DEADMONSTER } from "./monst.h.macros.js";
import { M_AP_TYPE } from "./monst.h.macros.js";
import { PM_ARCHEOLOGIST } from "./monsters.h.js";
import { PM_GUARD } from "./monsters.h.js";
import { struct_obj } from "./obj.h.js";
import { BOULDER } from "./objects.h.js";
import { BUGLE } from "./objects.h.js";
import { DRUM_OF_EARTHQUAKE } from "./objects.h.js";
import { FIRE_HORN } from "./objects.h.js";
import { FROST_HORN } from "./objects.h.js";
import { LEATHER_DRUM } from "./objects.h.js";
import { MAGIC_FLUTE } from "./objects.h.js";
import { MAGIC_HARP } from "./objects.h.js";
import { TOOLED_HORN } from "./objects.h.js";
import { WOODEN_FLUTE } from "./objects.h.js";
import { WOODEN_HARP } from "./objects.h.js";
import { DEAF } from "./prop.h.js";
import { ALTAR } from "./rm.h.js";
import { CORR } from "./rm.h.js";
import { DOOR } from "./rm.h.js";
import { DRAWBRIDGE_DOWN } from "./rm.h.js";
import { D_NODOOR } from "./rm.h.js";
import { FOUNTAIN } from "./rm.h.js";
import { GRAVE } from "./rm.h.js";
import { ROOM } from "./rm.h.js";
import { SCORR } from "./rm.h.js";
import { SDOOR } from "./rm.h.js";
import { SINK } from "./rm.h.js";
import { THRONE } from "./rm.h.js";
import { IS_DRAWBRIDGE } from "./rm.h.macros.js";
import { fmon } from "./rm.h.macros.js";
import { levl } from "./rm.h.macros.js";
import { m_at } from "./rm.h.macros.js";
import { ins_no_instrument } from "./sndprocs.h.js";
import { PIT } from "./trap.h.js";
import { is_pit } from "./trap.h.macros.js";
import { cansee } from "./vision.h.macros.js";
import { ACH_TUNE } from "./you.h.js";
import { TT_BURIEDBALL } from "./you.h.js";
import { TT_PIT } from "./you.h.js";
import { Role_if } from "./you.h.macros.js";
import { Upolyd } from "./you.h.macros.js";
import { u_at } from "./you.h.macros.js";
import { uhim } from "./you.h.macros.js";
import { Blind } from "./youprop.h.macros.js";
import { Confusion } from "./youprop.h.macros.js";
import { Deaf } from "./youprop.h.macros.js";
import { Flying } from "./youprop.h.macros.js";
import { Fumbling } from "./youprop.h.macros.js";
import { Half_physical_damage } from "./youprop.h.macros.js";
import { Hallucination } from "./youprop.h.macros.js";
import { Levitation } from "./youprop.h.macros.js";
import { Stunned } from "./youprop.h.macros.js";
import { Unchanging } from "./youprop.h.macros.js";
import { Underwater } from "./youprop.h.macros.js";
import { char } from "../rt/ctypes.js";
import { int } from "../rt/ctypes.js";
import { ord } from "../rt/ctypes.js";
import { schar } from "../rt/ctypes.js";
import { sizeof } from "../rt/ctypes.js";
import { sizeof_string } from "../rt/ctypes.js";
import { unsigned } from "../rt/ctypes.js";
import { chars } from "../rt/heap.js";
import { stack_frame } from "../rt/heap.js";
import { stack_pop } from "../rt/heap.js";
import { and64u } from "../rt/int64.js";
import { sprintf } from "../rt/libc.js";
import { strcmp } from "../rt/libc.js";
import { strcpy } from "../rt/libc.js";
import { strlen } from "../rt/libc.js";
import { init_list } from "../rt/locals.js";
import { init_string } from "../rt/locals.js";
import { stack_array } from "../rt/locals.js";
import { stack_struct } from "../rt/locals.js";
import { stack_var } from "../rt/locals.js";
import { static_array } from "../rt/locals.js";
import { static_var } from "../rt/locals.js";
import { _ } from "../rt/strings.js";
import { addr_of } from "../rt/struct.js";
import { array_of } from "../rt/struct.js";
import { ptr_to } from "../rt/struct.js";
import { ref_of } from "../rt/struct.js";
import { sizeof_member } from "../rt/struct.js";
import { struct_assign } from "../rt/struct.js";
import { exercise } from "./attrib.js";
import { getdir } from "./cmd.js";
import { isok } from "./cmd.js";
import { close_drawbridge } from "./dbridge.js";
import { find_drawbridge } from "./dbridge.js";
import { is_drawbridge_wall } from "./dbridge.js";
import { open_drawbridge } from "./dbridge.js";
import { disp } from "./decl.js";
import { gc } from "./decl.js";
import { gy } from "./decl.js";
import { svc } from "./decl.js";
import { svt } from "./decl.js";
import { u } from "./decl.js";
import { cvt_sdoor_to_door } from "./detect.js";
import { fillholetyp } from "./dig.js";
import { liquid_flow } from "./dig.js";
import { canseemon } from "./display.js";
import { newsym } from "./display.js";
import { flooreffects } from "./do.js";
import { Amonnam } from "./do_name.js";
import { Monnam } from "./do_name.js";
import { a_monnam } from "./do_name.js";
import { mon_nam } from "./do_name.js";
import { x_monnam } from "./do_name.js";
import { tamedog } from "./dog.js";
import { In_V_tower } from "./dungeon.js";
import { in_rooms } from "./hack.js";
import { losehp } from "./hack.js";
import { dist2 } from "./hacklib.js";
import { highc } from "./hacklib.js";
import { mungspaces } from "./hacklib.js";
import { align_str } from "./insight.js";
import { record_achievement } from "./insight.js";
import { consume_obj_charge } from "./invent.js";
import { sobj_at } from "./invent.js";
import { sleep_monst } from "./mhitm.js";
import { slept_monst } from "./mhitm.js";
import { set_levltyp } from "./mkmaze.js";
import { obj_extract_self } from "./mkobj.js";
import { seemimic } from "./mon.js";
import { wakeup } from "./mon.js";
import { xkilled } from "./mon.js";
import { can_blow } from "./mondata.js";
import { monflee } from "./monmove.js";
import { onscary } from "./monmove.js";
import { mons } from "./monst.js";
import { objects } from "./objects.js";
import { Tobjnam } from "./objnam.js";
import { Yname2 } from "./objnam.js";
import { an } from "./objnam.js";
import { the } from "./objnam.js";
import { thesimpleoname } from "./objnam.js";
import { xname } from "./objnam.js";
import { yname } from "./objnam.js";
import { Norep } from "./pline.js";
import { You } from "./pline.js";
import { You_cant } from "./pline.js";
import { You_feel } from "./pline.js";
import { You_hear } from "./pline.js";
import { Your } from "./pline.js";
import { impossible } from "./pline.js";
import { pline } from "./pline.js";
import { pline_The } from "./pline.js";
import { incr_itimeout } from "./potion.js";
import { altarmask_at } from "./pray.js";
import { desecrate_altar } from "./pray.js";
import { d } from "./rnd.js";
import { rn2 } from "./rnd.js";
import { rnd } from "./rnd.js";
import { rnl } from "./rnd.js";
import { add_damage } from "./shk.js";
import { maketrap } from "./trap.js";
import { mselftouch } from "./trap.js";
import { reset_utrap } from "./trap.js";
import { selftouch } from "./trap.js";
import { set_utrap } from "./trap.js";
import { t_at } from "./trap.js";
import { recalc_block_point } from "./vision.js";
import { unblock_point } from "./vision.js";
import { getlin } from "./windows.js";
import { flash_str } from "./zap.js";
import { resist } from "./zap.js";
import { ubuzz } from "./zap.js";
import { zapyourself } from "./zap.js";
