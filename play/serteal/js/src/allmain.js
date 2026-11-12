/* NetHack 5.0	allmain.c	$NHDT-Date: 1771213100 2026/02/15 19:38:20 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.286 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2012. */
/* NetHack may be freely redistributed.  See license for details. */

/* various code that was replicated in *main.c */

// #include "hack.h"


// #include <signal.h>


 /* c2js exposes moveloop_preamble */


 /* c2js exposes maybe_do_tutorial */













/*ARGSUSED*/
export function /* void */
early_init(argc, argv)
{
    program_state_init();




    decl_globals_init();
    objects_globals_init();
    monst_globals_init();
    sys_early_init();
    runtime_info_init();
}

export function /* void */
moveloop_preamble(resuming)
{
    /* if a save file created in normal mode is now being restored in
       explore mode, treat it as normal restore followed by 'X' command
       to use up the save file and require confirmation for explore mode */
    if (resuming && iflags.deferred_X)
        void enter_explore_mode();

    /* side-effects from the real world */
    flags.moonphase = unsigned(phase_of_the_moon());
    if (flags.moonphase == FULL_MOON) {
        You(_("are lucky!  Full moon tonight."));
        change_luck(1);
    } else if (flags.moonphase == NEW_MOON) {
        pline(_("Be careful!  New moon tonight."));
    }
    flags.friday13 = friday_13th();
    if (flags.friday13) {
        pline(_("Watch out!  Bad things can happen on Friday the 13th."));
        change_luck(-1);
    }

    if (!resuming) { /* new game */
        program_state.beyond_savefile_load = 1; /* for TTY_PERM_INVENT */
        svc.context.rndencode = rnd(9000);
        set_wear(null); /* for side-effects of starting gear */
        reset_justpicked(gi.invent);
        void pickup(1);      /* autopickup at initial location */
        /* only matters if someday a character is able to start with
           clairvoyance (wizard with cornuthaum perhaps?); without this,
           first "random" occurrence would always kick in on turn 1 */
        svc.context.seer_turn = rnd(30);
        /* give hero initial movement points; new game only--for restore,
           pending movement points were included in the save file */
        u.umovement = NORMAL_SPEED;
        initrack();
    }
    disp.botlx = TRUE; /* for STATUS_HILITES */
    if (resuming) { /* restoring old game */
        read_engr_at(u.ux, u.uy); /* subset of pickup() */
        fix_shop_damage();
    }

    encumber_msg(); /* in case they auto-picked up something */
    if (gd.defer_see_monsters) {
        gd.defer_see_monsters = FALSE;
        see_monsters();
    }

    u.uz0.dlevel = u.uz.dlevel;
    svc.context.move = 0;

    /* finish processing "--debug:fuzzer" from the command line */
    if (iflags.fuzzerpending) {
        iflags.debug_fuzzer = fuzzer_impossible_panic;
        iflags.fuzzerpending = FALSE;
    }

    program_state.in_moveloop = 1;
    /* for perm_invent preset at startup, display persistent inventory after
       invent is fully populated and the in_moveloop flag has been set */
    if (iflags.perm_invent)
        update_inventory();
}

function /* void */
u_calc_moveamt(wtcap)
{
    let moveamt = 0;

    /* calculate how much time passed. */
    if (u.usteed && u.umoved) {
        /* your speed doesn't augment steed's speed */
        moveamt = mcalcmove(u.usteed, TRUE);
    } else {
        moveamt = gy.youmonst.data.mmove;

        if (Very_fast()) { /* speed boots, potion, or spell */
            /* gain a free action on 2/3 of turns */
            if (rn2(3) != 0)
                moveamt += NORMAL_SPEED;
        } else if (Fast()) { /* intrinsic */
            /* gain a free action on 1/3 of turns */
            if (rn2(3) == 0)
                moveamt += NORMAL_SPEED;
        }
    }

    switch (wtcap) {
    case UNENCUMBERED:
        break;
    case SLT_ENCUMBER:
        moveamt -= (Math.trunc(moveamt / 4));
        break;
    case MOD_ENCUMBER:
        moveamt -= (Math.trunc(moveamt / 2));
        break;
    case HVY_ENCUMBER:
        moveamt -= (Math.trunc((moveamt * 3) / 4));
        break;
    case EXT_ENCUMBER:
        moveamt -= (Math.trunc((moveamt * 7) / 8));
        break;
    default:
        break;
    }

    u.umovement += moveamt;
    if (u.umovement < 0)
        u.umovement = 0;
}

/* small chance of generating a new random monster */
function /* void */
maybe_generate_rnd_mon()
{
    if (!rn2(u.uevent.udemigod ? 25
             : (depth(u.uz) > depth((svd.dungeon_topology.d_stronghold_level))) ? 50
             : 70))
        void makemon(null, 0, 0, NO_MM_FLAGS);
}




const mvl_wtcap = static_var("mvl_wtcap", int, 0);
const mvl_change = static_var("mvl_change", int, 0);

export function /* void */
moveloop_core()
{
    let monscanmove = FALSE;

    

    nhjs_moveloop_boundary(); /* c2js snapshot point for interactive play */



    if (program_state.done_hup)
        end_of_input();

    get_nh_event()();



    if (iflags.pending_customizations)
        maybe_shuffle_customizations();

    dobjsfree();

    if (svc.context.bypasses)
        clear_bypasses();

    if (iflags.sanity_check || iflags.debug_fuzzer)
        sanity_check();

    if (svc.context.resume_wish)
        makewish(); /* clears resume_wish */

    if (svc.context.move) {
        /* actual time passed */
        u.umovement -= NORMAL_SPEED;

        do { /* hero can't move this turn loop */
            encumber_msg();

            svc.context.mon_moving = TRUE;
            do {
                monscanmove = movemon();
                if (u.umovement >= NORMAL_SPEED)
                    break; /* it's now your turn */
            } while (monscanmove);
            svc.context.mon_moving = FALSE;

            /* this needs to be after the monster movement loop in
               case monster actions affected burden, e.g. rehumanize */
            mvl_wtcap[0] = near_capacity();

            if (!monscanmove && u.umovement < NORMAL_SPEED) {
                /* both hero and monsters are out of steam this round */
                let mtmp;

                /* set up for a new turn */
                gw.were_changes = 0;
                mcalcdistress(); /* adjust monsters' trap, blind, etc */

                /* reallocate movement rations to monsters; don't need
                   to skip dead monsters here because they will have
                   been purged at end of their previous round of moving */
                for (mtmp = fmon(); mtmp; mtmp = mtmp.nmon)
                    mtmp.movement += mcalcmove(mtmp, TRUE);

                /* occasionally add another monster; since this takes
                   place after movement has been allotted, the new
                   monster effectively loses its first turn */
                maybe_generate_rnd_mon();

                u_calc_moveamt(mvl_wtcap[0]);
                settrack();

                svm.moves++;
                /*
                 * Never allow 'moves' to grow big enough to wrap.
                 * We don't care what the maximum possible 'long int'
                 * is for the current configuration, we want a value
                 * that is the same for all viable configurations.
                 * When imposing the limit, use a mystic decimal value
                 * instead of a magic binary one such as 0x7fffffffL.
                 */
                if (svm.moves >= 1000000000) {
                    display_nhwindow()(WIN_MESSAGE, TRUE);
                    urgent_pline(_("The dungeon capitulates."));
                    done(ESCAPED);
                }
                /* 'moves' is misnamed; it represents turns; hero_seq is
                   a value that is distinct every time the hero moves */
                gh.hero_seq = shl64(svm.moves, 3);

                if (flags.time && !svc.context.run)
                    disp.time_botl = TRUE; /* 'moves' just changed */

                /********************************/
                /* once-per-turn things go here */
                /********************************/

                l_nhcore_call(NHCORE_MOVELOOP_TURN);

                if (Glib())
                    glibr();
                nh_timeout();
                run_regions();

                if (u.ublesscnt)
                    u.ublesscnt--;

                /* One possible result of prayer is healing.  Whether or
                 * not you get healed depends on your current hit points.
                 * If you are allowed to regenerate during the prayer,
                 * the end-of-prayer calculation messes up on this.
                 * Another possible result is rehumanization, which
                 * requires that encumbrance and movement rate be
                 * recalculated.
                 */
                if (u.uinvulnerable) {
                    /* for the moment at least, you're in tiptop shape */
                    mvl_wtcap[0] = UNENCUMBERED;
                } else if (!Upolyd() ? (u.uhp < u.uhpmax)
                           : (u.mh < u.mhmax
                              || gy.youmonst.data.mlet == S_EEL)) {
                    /* maybe heal */
                    regen_hp(mvl_wtcap[0]);
                }

                /* moving around while encumbered is hard work */
                if (mvl_wtcap[0] > MOD_ENCUMBER && u.umoved) {
                    if (!(mvl_wtcap[0] < EXT_ENCUMBER ? svm.moves % 30
                          : svm.moves % 10)) {
                        overexert_hp();
                    }
                }

                regen_pw(mvl_wtcap[0]);

                if (!u.uinvulnerable) {
                    if (Teleportation() && !rn2(85)) {
                        let old_ux = u.ux, old_uy = u.uy;

                        tele();
                        if (u.ux != old_ux || u.uy != old_uy) {
                            if (!next_to_u()) {
                                check_leash(old_ux, old_uy);
                            }
                            /* clear doagain keystrokes */
                            cmdq_clear(CQ_CANNED);
                            cmdq_clear(CQ_REPEAT);
                        }
                    }
                    /* delayed change may not be valid anymore */
                    if ((mvl_change[0] == 1 && !Polymorph())
                        || (mvl_change[0] == 2 && u.ulycn == NON_PM))
                        mvl_change[0] = 0;
                    if (Polymorph() && !rn2(100))
                        mvl_change[0] = 1;
                    else if (ismnum(u.ulycn) && !Upolyd()
                             && !rn2(80 - (20 * night())))
                        mvl_change[0] = 2;
                    if (mvl_change[0] && !Unchanging()) {
                        if (gm.multi >= 0) {
                            stop_occupation();
                            if (mvl_change[0] == 1)
                                polyself(POLY_NOFLAGS);
                            else
                                you_were();
                            mvl_change[0] = 0;
                        }
                    }
                }

                if (Searching() && !svl.level.flags.noautosearch
                    && gm.multi >= 0)
                    void dosearch0(1);
                if (Warning())
                    warnreveal();
                if (gw.were_changes) {
                    /* update innate intrinsics (mainly Drain_resistance) */
                    set_uasmon();
                }
                mkot_trap_warn();
                dosounds();
                do_storms();
                gethungry();
                age_spells();
                exerchk();
                invault();
                if (u.uhave.amulet)
                    amulet();
                if (!rn2(40 + (ACURR(A_DEX) * 3)))
                    u_wipe_engr(rnd(3));
                if (u.uevent.udemigod && !u.uinvulnerable) {
                    if (u.udg_cnt)
                        u.udg_cnt--;
                    if (!u.udg_cnt) {
                        intervene();
                        u.udg_cnt = unsigned(rn1(200, 50));
                    }
                }
/* XXX This should be recoded to use something like regions - a list of
 * things that are active and need to be handled that is dynamically
 * maintained and not a list of special cases. */
                /* vision will be updated as bubbles move */
                if (Is_waterlevel(u.uz) || Is_airlevel(u.uz))
                    movebubbles();
                else if (svl.level.flags.fumaroles)
                    fumaroles();

                /* when immobile, count is in turns */
                if (gm.multi < 0) {
                    runmode_delay_output();
                    if (++gm.multi == 0) { /* finished yet? */
                        unmul(0);
                        /* if unmul caused a level change, take it now */
                        if (u.utotype)
                            deferred_goto();
                    }
                }
            }
        } while (u.umovement < NORMAL_SPEED); /* hero can't move */

        /******************************************/
        /* once-per-hero-took-time things go here */
        /******************************************/

        gh.hero_seq++; /* moves*8 + n for n == 1..7 */

        /* although we checked for encumbrance above, we need to
           check again for message purposes, as the weight of
           inventory may have changed in, e.g., nh_timeout(); we do
           need two checks here so that the player gets feedback
           immediately if their own action encumbered them */
        encumber_msg();


        if (iflags.hilite_delta)
            status_eval_next_unhilite();

        if (svm.moves >= svc.context.seer_turn) {
            if ((u.uhave.amulet || Clairvoyant()) && !In_endgame(u.uz)
                && !BClairvoyant())
                do_vicinity_map(null);
            /* we maintain this counter even when clairvoyance isn't
               taking place; on average, go again 30 turns from now */
            svc.context.seer_turn = svm.moves + rn1(31, 15); /*15..45*/
            /* [it used to be that on every 15th turn, there was a 50%
               chance of farsight, so it could happen as often as every
               15 turns or theoretically never happen at all; but when
               a fast hero got multiple moves on that 15th turn, it
               could actually happen more than once on the same turn!] */
        }
        /* [fast hero who gets multiple moves per turn ends up sinking
           multiple times per turn; is that what we really want?] */
        if (u.utrap && u.utraptype == TT_LAVA)
            sink_into_lava();
        /* when/if hero escapes from lava, he can't just stay there */
        else if (!u.umoved)
            void pooleffects(FALSE);

        /* vision while buried or underwater is updated here */
        if (Underwater())
            under_water(0);
        else if (u.uburied)
            under_ground(0);

        see_nearby_monsters();
    } /* actual time passed */

    /****************************************/
    /* once-per-player-input things go here */
    /****************************************/

    clear_splitobjs();

    /* the Amulet of Yendor gives a wish when initially picked up */
    if (u.uhave.amulet && !u.uevent.amulet_wish) {
        u.uevent.amulet_wish = 1;
        display_nhwindow()(WIN_MESSAGE, TRUE);
        urgent_pline(_("The Amulet is bestowing a wish upon you!"));
        makewish();
    }

    find_ac();
    if (!svc.context.mv || Blind()) {
        /* redo monsters if hallu or wearing a helm of telepathy */
        if (Hallucination()) { /* update screen randomly */
            see_monsters();
            see_objects();
            see_traps();
            if (u.uswallow)
                swallowed(0);
        } else if (Unblind_telepat() || Warning() || Warn_of_mon()
                   /* this is needed for the case where you saw a monster
                      due to being next to it while it's in a gas cloud
                      and then you moved away; it should no longer be seen
                      when that happens, even if it hasn't moved */
                   || any_visible_region()) { /* TODO: optimize this */
            see_monsters();
        }
        if (gv.vision_full_recalc)
            vision_recalc(0); /* vision! */
    }
    if (disp.botl || disp.botlx) {
        bot();
        curs_on_u();
    } else if (disp.time_botl) {
        timebot();
        curs_on_u();
    }

    m_everyturn_effect(gy.youmonst);

    svc.context.move = 1;

    if (gm.multi >= 0 && go.occupation) {












            if ((go.occupation)() == 0)

                go.occupation = null;
        if (



            monster_nearby()) {
            stop_occupation();
            reset_eat();
        }
        runmode_delay_output();
        return;
    }

    u.umoved = FALSE;

    if (gm.multi > 0) {
        lookaround();
        runmode_delay_output();
        if (!gm.multi) {
            /* lookaround may clear multi */
            svc.context.move = 0;
            return;
        }
        if (svc.context.mv) {
            if (gm.multi < COLNO && !--gm.multi)
                end_running(TRUE);
            domove();
        } else {
            --gm.multi;
            nhassert(+(gc.command_count != 0), __FILE__);
            rhack(gc.cmd_key);
        }
    } else if (gm.multi == 0) {

        ckmailstatus();

        rhack(0);
    }
    if (u.utotype)       /* change dungeon level */
        deferred_goto(); /* after rhack() */

    if (gv.vision_full_recalc)
        vision_recalc(0); /* vision! */

    /* after rhack() and vision_recalc() so that the map is redrawn
       once with correct vision data, not twice (overshoot+correct) */
    cliparound()(u.ux, u.uy);

    /* when running in non-tport mode, this gets done through domove() */
    if ((!svc.context.run || flags.runmode == RUN_TPORT)
        && (gm.multi && (!svc.context.travel ? !(gm.multi % 7)
                        : !(svm.moves % 7)))) {
        if (flags.time && svc.context.run)
            disp.botl = TRUE;
        /* [should this be flush_screen() instead?] */
        display_nhwindow()(WIN_MAP, FALSE);
    }

    if (gl.luacore && nhcb_counts[NHCB_END_TURN]) {
        lua_getglobal(view_of(struct_lua_State, gl.luacore), _("nh_callback_run"));
        lua_pushstring(view_of(struct_lua_State, gl.luacore), nhcb_name[NHCB_END_TURN]);
        nhl_pcall_handle(view_of(struct_lua_State, gl.luacore), 1, 0, _("moveloop_core"), NHLpa_panic);
        lua_settop(view_of(struct_lua_State, gl.luacore), 0);
    }
}

export function /* void */
maybe_do_tutorial()
{
    let sp = find_level(_("tut-1"));

    if (!sp)
        return;

    if (ask_do_tutorial()) {
        assign_level(u.ucamefrom, u.uz);
        iflags.nofollowers = TRUE;
        schedule_goto(sp.dlevel, UTOTYPE_NONE,
                      _("Entering the tutorial."), 0);
        deferred_goto();
        vision_recalc(0);
        docrt();
        iflags.nofollowers = FALSE;
    }
}

export function /* void */
moveloop(resuming)
{

    

    nhjs_moveloop_entry(resuming); /* c2js host drives the game loop */

    moveloop_preamble(resuming);

    if (!resuming)
        maybe_do_tutorial();

    for (;;) {
        moveloop_core();
    }
}

function /* void */
regen_pw(wtcap)
{
    if (u.uen < u.uenmax
        && ((wtcap < MOD_ENCUMBER
             && (!(svm.moves % (Math.trunc((MAXULEV + 8 - u.ulevel)
                              * (Role_if(PM_WIZARD) ? 3 : 4)
                              / 6))))) || Energy_regeneration())) {
        let upper = Math.trunc((ACURR(A_WIS) + ACURR(A_INT)) / 15) + 1;

        if (EMagical_breathing())
            upper += 2;

        u.uen += rn1(upper, 1);
        if (u.uen > u.uenmax)
            u.uen = u.uenmax;
        disp.botl = TRUE;
        if (u.uen == u.uenmax)
            interrupt_multi(_("You feel full of energy."));
    }
}

export function U_CAN_REGEN() { return (((Regeneration() || (Sleepy() && u.usleep)) ? 1 : 0)); }

/* maybe recover some lost health (or lose some when an eel out of water) */
function /* void */
regen_hp(wtcap)
{
    let heal = 0;
    let reached_full = FALSE,
            encumbrance_ok = (+(wtcap < MOD_ENCUMBER || !u.umoved));

    if (Upolyd()) {
        if (u.mh < 1) { /* shouldn't happen... */
            rehumanize();
        } else if (gy.youmonst.data.mlet == S_EEL
                   && !is_pool(u.ux, u.uy) && !Is_waterlevel(u.uz)
                   && !Breathless()) {
            /* eel out of water loses hp, similar to monster eels;
               as hp gets lower, rate of further loss slows down */
            if (u.mh > 1 && !Regeneration() && rn2(u.mh) > rn2(8)
                && (!Half_physical_damage() || !(svm.moves % 2)))
                heal = -1;
        } else if (u.mh < u.mhmax) {
            if (U_CAN_REGEN() || (encumbrance_ok && !(svm.moves % 20)))
                heal = 1;
        }
        if (heal) {
            disp.botl = TRUE;
            u.mh += heal;
            reached_full = (+(u.mh == u.mhmax));
        }

    /* !Upolyd */
    } else {
        /* [when this code was in-line within moveloop(), there was
           no !Upolyd check here, so poly'd hero recovered lost u.uhp
           once u.mh reached u.mhmax; that may have been convenient
           for the player, but it didn't make sense for gameplay...] */
        if (u.uhp < u.uhpmax && (encumbrance_ok || U_CAN_REGEN())) {
            heal = +((u.ulevel + ACURR(A_CON)) > rn2(100));

            if (U_CAN_REGEN())
                heal += 1;
            if (Sleepy() && u.usleep)
                heal++;

            if (heal) {
                disp.botl = TRUE;
                u.uhp += heal;
                if (u.uhp > u.uhpmax)
                    u.uhp = u.uhpmax;
                /* stop voluntary multi-turn activity if now fully healed */
                reached_full = (+(u.uhp == u.uhpmax));
            }
        }
    }

    if (reached_full)
        interrupt_multi(_("You are in full health."));
}



export function /* void */
stop_occupation()
{
    if (go.occupation) {
        if (!maybe_finished_meal(TRUE))
            You(_("stop %s."), go.occtxt);
        go.occupation = null;
        disp.botl = TRUE; /* in case u.uhs changed */
        nomul(0);
    } else if (gm.multi >= 0) {
        nomul(0);
    }
    cmdq_clear(CQ_CANNED);
}

export function /* void */
init_sound_disp_gamewindows()
{
    let menu_behavior = MENU_BEHAVE_STANDARD;

    activate_chosen_soundlib();

    if (iflags.wc_splash_screen && !flags.randomall) {
          ;
        /* ToDo: new splash screen invocation will go here */
    } else {
          ;
    }








    WIN_MESSAGE = create_nhwindow()(NHW_MESSAGE);
    if (VIA_WINDOWPORT()) {
        status_initialize(FALSE);
    } else {
        WIN_STATUS = create_nhwindow()(NHW_STATUS);
    }
    WIN_MAP = create_nhwindow()(NHW_MAP);
    WIN_INVEN = create_nhwindow()(NHW_MENU);
    if (WIN_INVEN != WIN_ERR)
        adjust_menu_promptstyle(WIN_INVEN, iflags.menu_headings);







    /* in case of early quit where WIN_INVEN could be destroyed before
       ever having been used, use it here to pacify the Qt interface */
    start_menu()(WIN_INVEN, ulong(menu_behavior)), end_menu()(WIN_INVEN, 0);










    /*
     * The mac port is not DEPENDENT on the order of these
     * displays, but it looks a lot better this way...
     */



    display_nhwindow()(WIN_MESSAGE, FALSE);
    clear_glyph_buffer();
    display_nhwindow()(WIN_MAP, FALSE);




}

export function /* void */
newgame()
{
    let i;

    /* make sure welcome messages are given before noticing monsters */
    notice_mon_off();
    disp.botlx = TRUE;
    svc.context.ident = 2;  /* id 1 is reserved for gy.youmonst */
    svc.context.warnlevel = 1;
    svc.context.next_attrib_check = 600; /* arbitrary first setting */
    svc.context.tribute.enabled = TRUE;   /* turn on 3.6 tributes    */
    svc.context.tribute.tributesz = sizeof(struct_tribute_info);
    get_nhuuid();

    for (i = LOW_PM; i < NUMMONS; i++)
        svm.mvitals[i].mvflags = mons[i].geno & G_NOCORPSE;

    init_objects(); /* must be before u_init() */

    flags.pantheon = -1; /* role_init() will reset this */
    role_init();         /* must be before init_dungeons(), u_init(),
                          * and init_artifacts() */

    init_dungeons();  /* must be before u_init() to avoid rndmonst()
                       * creating odd monsters for any tins and eggs
                       * in hero's initial inventory */
    init_artifacts(); /* before u_init() in case $WIZKIT specifies
                       * any artifacts */
    u_init_misc();

    l_nhcore_init();  /* create a Lua state that lasts until end of game */
    reset_glyphmap(gm_newgame);

    void signal(SIGINT, done1);


    if (iflags.news)
        display_file()(_(NEWS), FALSE);

    /* quest_init();  --  Now part of role_init() */

    mklev();
    u_on_upstairs();
    vision_reset();          /* set up internals for level (after mklev) */
    check_special_room(FALSE);

    if (MON_AT(u.ux, u.uy))
        mnexto(m_at(u.ux, u.uy), RLOC_NOMSG);
    void makedog();

    u_init_inventory_attrs();
    docrt();
    flush_screen(1);
    bot();
    while (u.uroleplay.reroll && reroll_menu()) {
        u_init_inventory_attrs();
        bot();
    }
    u_init_skills_discoveries();

    if (wizard()) {
        read_wizkit();
        obj_delivery(FALSE); /* finish wizkit */
    }

    if (flags.legacy) {
        com_pager(u.uroleplay.pauper ? _("pauper_legacy") : _("legacy"));
    }

    urealtime.realtime = 0;
    urealtime.start_timing = getnow();

    save_currentstate();

    program_state.something_worth_saving++; /* useful data now exists */

    /* Success! */
    welcome(TRUE);
    notice_mon_on(); /* now we can notice monsters */
    if (a11y.glyph_updates)
        void dolookaround();
    else
        notice_all_mons(TRUE);
    return;
}

/* show "welcome [back] to NetHack" message at program startup */
export function /* void */
welcome(new_game) /* false => restoring an old game */
{ const $frame = stack_frame(); try {
    let buf = stack_array(char, BUFSZ);
    let currentgend = Upolyd() ? u.mfemale : flags.female,
            adrift = (+(u.ualign.type != chars[u.ualignbase + A_CURRENT]));

    l_nhcore_call(new_game ? NHCORE_START_NEW_GAME : NHCORE_RESTORE_OLD_GAME);

    /* skip "welcome back" if restoring a doomed character */
    if (!new_game && Upolyd() && ugenocided()) {
        /* death via self-genocide is pending */
        pline(_("You're back, but you still feel %s inside."), udeadinside());
        return;
    }

    if (Hallucination())
        pline(_("NetHack is filmed in front of an undead studio audience."));

    /*
     * The "welcome back" message always describes your innate form
     * even when polymorphed or wearing a helm of opposite alignment.
     * Alignment is shown unconditionally for new games; for restores
     * it's only shown if it has changed from its original value.
     * Sex is shown for new games except when it is redundant; for
     * restores it's only shown if different from its original value.
     */
    chars[buf] = ord('\0');




    /*
     * 2026-04-24
     * GitHub issue https://github.com/NetHack/NetHack/issues/537
     * "Judging by the comment above, it should display your new alignment
     *  if it was changed, so align_str(u.ualignbase[A_CURRENT]) would
     *  probably be more appropriate. This won't affect the new game message."
     *
     * That is followed by a suggestion to revisit the matter (paraphrased):
     * "That's actually intentional; the comment oversimplifies.
     *  When it was implemented, it may have been the only way to tell that
     *  you had converted alignment. Now ^X mentions your starting alignment
     *  if base alignment has been changed, so revisiting this welcome back
     *  message."
     */
    if (new_game || chars[u.ualignbase + A_ORIGINAL] != chars[u.ualignbase + A_CURRENT] || adrift)
        void sprintf(eos(buf), _(" %s%s"), adrift ? _("adrift ") : _(""), adrift ? align_str(u.ualign.type)
                       : align_str(chars[u.ualignbase + A_CURRENT]))

;

    if (!gu.urole.name.f
        && (new_game
            ? (gu.urole.allow & ROLE_GENDMASK) == (ROLE_MALE | ROLE_FEMALE)
            : currentgend != flags.initgend))
        void sprintf(eos(buf), _(" %s"), genders[currentgend].adj);
    void sprintf(eos(buf), _(" %s %s"), gu.urace.adj, (currentgend && gu.urole.name.f) ? gu.urole.name.f
                                             : gu.urole.name.m)
;

    pline(new_game ? _("%s %s, welcome to NetHack!  You are a%s.")
                   : _("%s %s, the%s, welcome back to NetHack!"),
          Hello(null), svp.plname, buf);

    if (new_game) {
        /* guarantee that 'major' event category is never empty */
        livelog_printf(LL_ACHIEVE, _("%s the%s entered the dungeon"),
                       svp.plname, buf);
    } else {
        /* if restoring in Gehennom, give same hot/smoky message as when
           first entering it */
        hellish_smoke_mesg();
        /* remind player of the level annotation, like in goto_level() */
        print_level_annotation();
    }
} finally { stack_pop($frame); } }













































function /* void */
interrupt_multi(msg)
{
    if (gm.multi > 0 && !svc.context.travel && !svc.context.run) {
        nomul(0);
        if (flags.verbose && msg)
            Norep(_("%s"), msg);
    }
}

/* convert from time_t to number of seconds */
export function /* long long */
timet_to_seconds(ttim)
{
    /* for Unix-based and Posix-compliant systems, a cast to 'long' would
       suffice but the C Standard doesn't require time_t to be that simple */
    return timet_delta(ttim, 0);
}

/* calculate the difference in seconds between two time_t values */
export function /* long long */
timet_delta(etim, stim) /* end and start times */
{
    /* difftime() is a STDC routine which returns the number of seconds
       between two time_t values as a 'double' */
    return long(difftime(etim, stim));
}

/*allmain.c*/
import { A_CON } from "./attrib.h.js";
import { A_DEX } from "./attrib.h.js";
import { A_INT } from "./attrib.h.js";
import { A_WIS } from "./attrib.h.js";
import { ACURR } from "./attrib.h.macros.js";
import { VIA_WINDOWPORT } from "./botl.h.macros.js";
import { NEWS } from "./config.h.js";
import { struct_tribute_info } from "./context.h.js";
import { S_EEL } from "./defsym.h.js";
import { gm_newgame } from "./display.h.js";
import { In_endgame } from "./dungeon.h.macros.js";
import { Is_airlevel } from "./dungeon.h.macros.js";
import { Is_waterlevel } from "./dungeon.h.macros.js";
import { FULL_MOON } from "./flag.h.js";
import { NEW_MOON } from "./flag.h.js";
import { RUN_TPORT } from "./flag.h.js";
import { fuzzer_impossible_panic } from "./flag.h.js";
import { notice_mon_off } from "./flag.h.macros.js";
import { notice_mon_on } from "./flag.h.macros.js";
import { wizard } from "./flag.h.macros.js";
import { BUFSZ } from "./global.h.js";
import { COLNO } from "./global.h.js";
import { FALSE } from "./global.h.js";
import { LL_ACHIEVE } from "./global.h.js";
import { MAXULEV } from "./global.h.js";
import { NHLpa_panic } from "./global.h.js";
import { TRUE } from "./global.h.js";
import { nhassert } from "./global.h.macros.js";
import { CQ_CANNED } from "./hack.h.js";
import { CQ_REPEAT } from "./hack.h.js";
import { ESCAPED } from "./hack.h.js";
import { EXT_ENCUMBER } from "./hack.h.js";
import { HVY_ENCUMBER } from "./hack.h.js";
import { MOD_ENCUMBER } from "./hack.h.js";
import { NHCB_END_TURN } from "./hack.h.js";
import { NHCORE_MOVELOOP_TURN } from "./hack.h.js";
import { NHCORE_RESTORE_OLD_GAME } from "./hack.h.js";
import { NHCORE_START_NEW_GAME } from "./hack.h.js";
import { NO_MM_FLAGS } from "./hack.h.js";
import { POLY_NOFLAGS } from "./hack.h.js";
import { RLOC_NOMSG } from "./hack.h.js";
import { SLT_ENCUMBER } from "./hack.h.js";
import { UNENCUMBERED } from "./hack.h.js";
import { rn1 } from "./hack.h.macros.js";
import { G_NOCORPSE } from "./monflag.h.js";
import { ismnum } from "./monst.h.macros.js";
import { LOW_PM } from "./monsters.h.js";
import { NON_PM } from "./monsters.h.js";
import { NUMMONS } from "./monsters.h.js";
import { PM_WIZARD } from "./monsters.h.js";
import { NORMAL_SPEED } from "./permonst.h.js";
import { MON_AT } from "./rm.h.macros.js";
import { fmon } from "./rm.h.macros.js";
import { m_at } from "./rm.h.macros.js";
import { cliparound } from "./winprocs.h.macros.js";
import { create_nhwindow } from "./winprocs.h.macros.js";
import { display_file } from "./winprocs.h.macros.js";
import { display_nhwindow } from "./winprocs.h.macros.js";
import { end_menu } from "./winprocs.h.macros.js";
import { get_nh_event } from "./winprocs.h.macros.js";
import { start_menu } from "./winprocs.h.macros.js";
import { MENU_BEHAVE_STANDARD } from "./wintype.h.js";
import { NHW_MAP } from "./wintype.h.js";
import { NHW_MENU } from "./wintype.h.js";
import { NHW_MESSAGE } from "./wintype.h.js";
import { NHW_STATUS } from "./wintype.h.js";
import { WIN_ERR } from "./wintype.h.js";
import { A_CURRENT } from "./you.h.js";
import { A_ORIGINAL } from "./you.h.js";
import { ROLE_FEMALE } from "./you.h.js";
import { ROLE_GENDMASK } from "./you.h.js";
import { ROLE_MALE } from "./you.h.js";
import { TT_LAVA } from "./you.h.js";
import { UTOTYPE_NONE } from "./you.h.js";
import { Role_if } from "./you.h.macros.js";
import { Upolyd } from "./you.h.macros.js";
import { BClairvoyant } from "./youprop.h.macros.js";
import { Blind } from "./youprop.h.macros.js";
import { Breathless } from "./youprop.h.macros.js";
import { Clairvoyant } from "./youprop.h.macros.js";
import { EMagical_breathing } from "./youprop.h.macros.js";
import { Energy_regeneration } from "./youprop.h.macros.js";
import { Fast } from "./youprop.h.macros.js";
import { Glib } from "./youprop.h.macros.js";
import { Half_physical_damage } from "./youprop.h.macros.js";
import { Hallucination } from "./youprop.h.macros.js";
import { Polymorph } from "./youprop.h.macros.js";
import { Regeneration } from "./youprop.h.macros.js";
import { Searching } from "./youprop.h.macros.js";
import { Sleepy } from "./youprop.h.macros.js";
import { Teleportation } from "./youprop.h.macros.js";
import { Unblind_telepat } from "./youprop.h.macros.js";
import { Unchanging } from "./youprop.h.macros.js";
import { Underwater } from "./youprop.h.macros.js";
import { Very_fast } from "./youprop.h.macros.js";
import { Warn_of_mon } from "./youprop.h.macros.js";
import { Warning } from "./youprop.h.macros.js";
import { char } from "../rt/ctypes.js";
import { int } from "../rt/ctypes.js";
import { long } from "../rt/ctypes.js";
import { ord } from "../rt/ctypes.js";
import { sizeof } from "../rt/ctypes.js";
import { ulong } from "../rt/ctypes.js";
import { unsigned } from "../rt/ctypes.js";
import { chars } from "../rt/heap.js";
import { stack_frame } from "../rt/heap.js";
import { stack_pop } from "../rt/heap.js";
import { shl64 } from "../rt/int64.js";
import { SIGINT } from "../rt/libc.js";
import { difftime } from "../rt/libc.js";
import { signal } from "../rt/libc.js";
import { sprintf } from "../rt/libc.js";
import { stack_array } from "../rt/locals.js";
import { static_var } from "../rt/locals.js";
import { lua_getglobal } from "../rt/lua.js";
import { lua_pushstring } from "../rt/lua.js";
import { lua_settop } from "../rt/lua.js";
import { _ } from "../rt/strings.js";
import { record_or_opaque } from "../rt/struct.js";
import { view_of } from "../rt/struct.js";
import { check_leash } from "./apply.js";
import { next_to_u } from "./apply.js";
import { init_artifacts } from "./artifact.js";
import { mkot_trap_warn } from "./artifact.js";
import { change_luck } from "./attrib.js";
import { exerchk } from "./attrib.js";
import { bot } from "./botl.js";
import { status_eval_next_unhilite } from "./botl.js";
import { status_initialize } from "./botl.js";
import { timebot } from "./botl.js";
import { friday_13th } from "./calendar.js";
import { getnow } from "./calendar.js";
import { night } from "./calendar.js";
import { phase_of_the_moon } from "./calendar.js";
import { cmdq_clear } from "./cmd.js";
import { dolookaround } from "./cmd.js";
import { end_of_input } from "./cmd.js";
import { enter_explore_mode } from "./cmd.js";
import { rhack } from "./cmd.js";
import { is_pool } from "./dbridge.js";
import { a11y } from "./decl.js";
import { decl_globals_init } from "./decl.js";
import { disp } from "./decl.js";
import { flags } from "./decl.js";
import { gc } from "./decl.js";
import { gd } from "./decl.js";
import { gh } from "./decl.js";
import { gi } from "./decl.js";
import { gl } from "./decl.js";
import { gm } from "./decl.js";
import { go } from "./decl.js";
import { gu } from "./decl.js";
import { gv } from "./decl.js";
import { gw } from "./decl.js";
import { gy } from "./decl.js";
import { iflags } from "./decl.js";
import { nhcb_counts } from "./decl.js";
import { nhcb_name } from "./decl.js";
import { program_state } from "./decl.js";
import { program_state_init } from "./decl.js";
import { svc } from "./decl.js";
import { svd } from "./decl.js";
import { svl } from "./decl.js";
import { svm } from "./decl.js";
import { svp } from "./decl.js";
import { u } from "./decl.js";
import { urealtime } from "./decl.js";
import { do_vicinity_map } from "./detect.js";
import { dosearch0 } from "./detect.js";
import { warnreveal } from "./detect.js";
import { clear_glyph_buffer } from "./display.js";
import { curs_on_u } from "./display.js";
import { docrt } from "./display.js";
import { flush_screen } from "./display.js";
import { reset_glyphmap } from "./display.js";
import { see_monsters } from "./display.js";
import { see_objects } from "./display.js";
import { see_traps } from "./display.js";
import { swallowed } from "./display.js";
import { under_ground } from "./display.js";
import { under_water } from "./display.js";
import { deferred_goto } from "./do.js";
import { hellish_smoke_mesg } from "./do.js";
import { save_currentstate } from "./do.js";
import { schedule_goto } from "./do.js";
import { find_ac } from "./do_wear.js";
import { glibr } from "./do_wear.js";
import { set_wear } from "./do_wear.js";
import { makedog } from "./dog.js";
import { obj_delivery } from "./dokick.js";
import { assign_level } from "./dungeon.js";
import { depth } from "./dungeon.js";
import { find_level } from "./dungeon.js";
import { init_dungeons } from "./dungeon.js";
import { print_level_annotation } from "./dungeon.js";
import { gethungry } from "./eat.js";
import { maybe_finished_meal } from "./eat.js";
import { reset_eat } from "./eat.js";
import { done } from "./end.js";
import { done1 } from "./end.js";
import { read_engr_at } from "./engrave.js";
import { u_wipe_engr } from "./engrave.js";
import { read_wizkit } from "./files.js";
import { maybe_shuffle_customizations } from "./glyphs.js";
import { check_special_room } from "./hack.js";
import { domove } from "./hack.js";
import { end_running } from "./hack.js";
import { lookaround } from "./hack.js";
import { monster_nearby } from "./hack.js";
import { near_capacity } from "./hack.js";
import { nomul } from "./hack.js";
import { notice_all_mons } from "./hack.js";
import { overexert_hp } from "./hack.js";
import { pooleffects } from "./hack.js";
import { runmode_delay_output } from "./hack.js";
import { unmul } from "./hack.js";
import { eos } from "./hacklib.js";
import { align_str } from "./insight.js";
import { reroll_menu } from "./invent.js";
import { update_inventory } from "./invent.js";
import { ckmailstatus } from "./mail.js";
import { makemon } from "./makemon.js";
import { runtime_info_init } from "./mdlib.js";
import { mklev } from "./mklev.js";
import { fumaroles } from "./mkmaze.js";
import { movebubbles } from "./mkmaze.js";
import { clear_splitobjs } from "./mkobj.js";
import { dobjsfree } from "./mkobj.js";
import { mcalcdistress } from "./mon.js";
import { mcalcmove } from "./mon.js";
import { mnexto } from "./mon.js";
import { movemon } from "./mon.js";
import { see_nearby_monsters } from "./mon.js";
import { m_everyturn_effect } from "./monmove.js";
import { mons } from "./monst.js";
import { monst_globals_init } from "./monst.js";
import { l_nhcore_call } from "./nhlua.js";
import { l_nhcore_init } from "./nhlua.js";
import { nhl_pcall_handle } from "./nhlua.js";
import { init_objects } from "./o_init.js";
import { objects_globals_init } from "./objects.js";
import { ask_do_tutorial } from "./options.js";
import { encumber_msg } from "./pickup.js";
import { pickup } from "./pickup.js";
import { reset_justpicked } from "./pickup.js";
import { Norep } from "./pline.js";
import { You } from "./pline.js";
import { livelog_printf } from "./pline.js";
import { pline } from "./pline.js";
import { urgent_pline } from "./pline.js";
import { polyself } from "./polyself.js";
import { rehumanize } from "./polyself.js";
import { set_uasmon } from "./polyself.js";
import { udeadinside } from "./polyself.js";
import { ugenocided } from "./polyself.js";
import { com_pager } from "./questpgr.js";
import { any_visible_region } from "./region.js";
import { run_regions } from "./region.js";
import { rn2 } from "./rnd.js";
import { rnd } from "./rnd.js";
import { Hello } from "./role.js";
import { genders } from "./role.js";
import { role_init } from "./role.js";
import { fix_shop_damage } from "./shk.js";
import { activate_chosen_soundlib } from "./sounds.js";
import { dosounds } from "./sounds.js";
import { age_spells } from "./spell.js";
import { u_on_upstairs } from "./stairs.js";
import { sys_early_init } from "./sys.js";
import { tele } from "./teleport.js";
import { do_storms } from "./timeout.js";
import { nh_timeout } from "./timeout.js";
import { initrack } from "./track.js";
import { settrack } from "./track.js";
import { sink_into_lava } from "./trap.js";
import { u_init_inventory_attrs } from "./u_init.js";
import { u_init_misc } from "./u_init.js";
import { u_init_skills_discoveries } from "./u_init.js";
import { invault } from "./vault.js";
import { vision_recalc } from "./vision.js";
import { vision_reset } from "./vision.js";
import { you_were } from "./were.js";
import { adjust_menu_promptstyle } from "./windows.js";
import { amulet } from "./wizard.js";
import { intervene } from "./wizard.js";
import { sanity_check } from "./wizcmds.js";
import { clear_bypasses } from "./worn.js";
import { makewish } from "./zap.js";
import { nhjs_moveloop_boundary } from "../sys/c2js/nhjs_tty_api.js";
import { nhjs_moveloop_entry } from "../sys/c2js/nhjs_tty_api.js";
import { get_nhuuid } from "../sys/unix/unixmain.js";
const struct_lua_State = record_or_opaque("struct_lua_State");
const __FILE__ = "allmain.c";
