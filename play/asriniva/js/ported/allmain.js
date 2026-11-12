/* NetHack 5.0	allmain.c	$NHDT-Date: 1771213100 2026/02/15 19:38:20 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.286 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2012. */
/* NetHack may be freely redistributed.  See license for details. */

/* various code that was replicated in *main.c */




import { C } from '../c-runtime/context.js';

/*ARGSUSED*/
export function early_init(argc, argv)
{
    C.program_state_init();

    /* Do this as early as possible, but let ports do other things first. */
    C.crashreport_init(argc, argv);

    C.decl_globals_init();
    C.objects_globals_init();
    C.monst_globals_init();
    C.sys_early_init();
    C.runtime_info_init();
}

export function moveloop_preamble(resuming)
{
    /* if a save file created in normal mode is now being restored in
       explore mode, treat it as normal restore followed by 'X' command
       to use up the save file and require confirmation for explore mode */
    if (resuming && C.iflags.deferred_X)
        C.enter_explore_mode();

    /* side-effects from the real world */
    C.flags.moonphase = C.phase_of_the_moon();
    if (C.flags.moonphase == C.FULL_MOON) {
        C.You("are lucky!  Full moon tonight.");
        C.change_luck(1);
    } else if (C.flags.moonphase == C.NEW_MOON) {
        C.pline("Be careful!  New moon tonight.");
    }
    C.flags.friday13 = C.friday_13th();
    if (C.flags.friday13) {
        C.pline("Watch out!  Bad things can happen on Friday the 13th.");
        C.change_luck(-1);
    }

    if (!resuming) { /* new game */
        C.program_state.beyond_savefile_load = 1; /* for TTY_PERM_INVENT */
        C.svc.context.rndencode = C.rnd(()=>(9000), 72, "moveloop_preamble");
        C.set_wear(0); /* for side-effects of starting gear */
        C.reset_justpicked(C.gi.invent);
        C.pickup(1);      /* autopickup at initial location */
        /* only matters if someday a character is able to start with
           clairvoyance (wizard with cornuthaum perhaps?); without this,
           first "random" occurrence would always kick in on turn 1 */
        C.svc.context.seer_turn = BigInt(C.rnd(()=>(30), 79, "moveloop_preamble"));
        /* give hero initial movement points; new game only--for restore,
           pending movement points were included in the save file */
        C.u.umovement = C.NORMAL_SPEED;
        C.initrack();
    }
    C.disp.botlx = C.TRUE; /* for STATUS_HILITES */
    if (resuming) { /* restoring old game */
        C.read_engr_at(C.u.ux, C.u.uy); /* subset of pickup() */
        C.fix_shop_damage();
    }

    C.encumber_msg(); /* in case they auto-picked up something */
    if (C.gd.defer_see_monsters) {
        C.gd.defer_see_monsters = C.FALSE;
        C.see_monsters();
    }

    C.u.uz0.dlevel = C.u.uz.dlevel;
    C.svc.context.move = 0;

    /* finish processing "--debug:fuzzer" from the command line */
    if (C.iflags.fuzzerpending) {
        C.iflags.debug_fuzzer = C.fuzzer_impossible_panic;
        C.iflags.fuzzerpending = C.FALSE;
    }

    C.program_state.in_moveloop = 1;
    /* for perm_invent preset at startup, display persistent inventory after
       invent is fully populated and the in_moveloop flag has been set */
    if (C.iflags.perm_invent)
        C.update_inventory();
}

export function u_calc_moveamt(wtcap)
{
    let moveamt = 0;

    /* calculate how much time passed. */
    if (C.u.usteed && C.u.umoved) {
        /* your speed doesn't augment steed's speed */
        moveamt = C.mcalcmove(C.u.usteed, C.TRUE);
    } else {
        moveamt = C.gy.youmonst.data.mmove;

        if (C.Very_fast) { /* speed boots, potion, or spell */
            /* gain a free action on 2/3 of turns */
            if (C.rn2(()=>(3), 127, "u_calc_moveamt") != 0)
                moveamt += C.NORMAL_SPEED;
        } else if (C.Fast) { /* intrinsic */
            /* gain a free action on 1/3 of turns */
            if (C.rn2(()=>(3), 131, "u_calc_moveamt") == 0)
                moveamt += C.NORMAL_SPEED;
        }
    }

    switch (wtcap) {
    case C.UNENCUMBERED:
        break;
    case C.SLT_ENCUMBER:
        moveamt -= (Math.trunc(moveamt / 4));
        break;
    case C.MOD_ENCUMBER:
        moveamt -= (Math.trunc(moveamt / 2));
        break;
    case C.HVY_ENCUMBER:
        moveamt -= (Math.trunc((moveamt * 3) / 4));
        break;
    case C.EXT_ENCUMBER:
        moveamt -= (Math.trunc((moveamt * 7) / 8));
        break;
    default:
        break;
    }

    C.u.umovement += moveamt;
    if (C.u.umovement < 0)
        C.u.umovement = 0;
}

/* small chance of generating a new random monster */
export function maybe_generate_rnd_mon()
{
    if (!C.rn2(()=>(C.u.uevent.udemigod ? 25
             : (C.depth(C.u.uz) > C.depth(C.stronghold_level)) ? 50
             : 70), 166, "maybe_generate_rnd_mon"))
        C.makemon(0, 0, 0, C.NO_MM_FLAGS);
}




export const mvl_wtcap = 0;
export const mvl_change = 0;

export function moveloop_core()
{
    let monscanmove = C.FALSE;


    if (C.program_state.done_hup)
        C.end_of_input();

    C.get_nh_event();



    if (C.iflags.pending_customizations)
        C.maybe_shuffle_customizations();

    C.dobjsfree();

    if (C.svc.context.bypasses)
        C.clear_bypasses();

    if (C.iflags.sanity_check || C.iflags.debug_fuzzer)
        C.sanity_check();

    if (C.svc.context.resume_wish)
        C.makewish(); /* clears resume_wish */

    if (C.svc.context.move) {
        /* actual time passed */
        C.u.umovement -= C.NORMAL_SPEED;

        do { /* hero can't move this turn loop */
            C.encumber_msg();

            C.svc.context.mon_moving = C.TRUE;
            do {
                monscanmove = C.movemon();
                if (C.u.umovement >= C.NORMAL_SPEED)
                    break; /* it's now your turn */
            } while (monscanmove);
            C.svc.context.mon_moving = C.FALSE;

            /* this needs to be after the monster movement loop in
               case monster actions affected burden, e.g. rehumanize */
            C.allmainState.mvl_wtcap = C.near_capacity();

            if (!monscanmove && C.u.umovement < C.NORMAL_SPEED) {
                /* both hero and monsters are out of steam this round */
                let mtmp;

                /* set up for a new turn */
                C.gw.were_changes = 0n;
                C.mcalcdistress(); /* adjust monsters' trap, blind, etc */

                /* reallocate movement rations to monsters; don't need
                   to skip dead monsters here because they will have
                   been purged at end of their previous round of moving */
                for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon)
                    mtmp.movement += C.mcalcmove(mtmp, C.TRUE);

                /* occasionally add another monster; since this takes
                   place after movement has been allotted, the new
                   monster effectively loses its first turn */
                maybe_generate_rnd_mon();

                u_calc_moveamt(C.allmainState.mvl_wtcap);
                C.settrack();

                C.svm.moves++;
                /*
                 * Never allow 'moves' to grow big enough to wrap.
                 * We don't care what the maximum possible 'long int'
                 * is for the current configuration, we want a value
                 * that is the same for all viable configurations.
                 * When imposing the limit, use a mystic decimal value
                 * instead of a magic binary one such as 0x7fffffffL.
                 */
                if (C.svm.moves >= 1000000000n) {
                    C.display_nhwindow(C.WIN_MESSAGE, C.TRUE);
                    C.urgent_pline("The dungeon capitulates.");
                    C.done(C.ESCAPED);
                }
                /* 'moves' is misnamed; it represents turns; hero_seq is
                   a value that is distinct every time the hero moves */
                C.gh.hero_seq = C.svm.moves << 3n;

                if (C.flags.time && !C.svc.context.run)
                    C.disp.time_botl = C.TRUE; /* 'moves' just changed */

                /********************************/
                /* once-per-turn things go here */
                /********************************/

                C.l_nhcore_call(C.NHCORE_MOVELOOP_TURN);

                if (C.Glib)
                    C.glibr();
                C.nh_timeout();
                C.run_regions();

                if (C.u.ublesscnt)
                    C.u.ublesscnt--;

                /* One possible result of prayer is healing.  Whether or
                 * not you get healed depends on your current hit points.
                 * If you are allowed to regenerate during the prayer,
                 * the end-of-prayer calculation messes up on this.
                 * Another possible result is rehumanization, which
                 * requires that encumbrance and movement rate be
                 * recalculated.
                 */
                if (C.u.uinvulnerable) {
                    /* for the moment at least, you're in tiptop shape */
                    C.allmainState.mvl_wtcap = C.UNENCUMBERED;
                } else if (!C.Upolyd ? (C.u.uhp < C.u.uhpmax)
                           : (C.u.mh < C.u.mhmax
                              || C.gy.youmonst.data.mlet == C.S_EEL)) {
                    /* maybe heal */
                    regen_hp(C.allmainState.mvl_wtcap);
                }

                /* moving around while encumbered is hard work */
                if (C.allmainState.mvl_wtcap > C.MOD_ENCUMBER && C.u.umoved) {
                    if (!(C.allmainState.mvl_wtcap < C.EXT_ENCUMBER ? C.svm.moves % 30n
                          : C.svm.moves % 10n)) {
                        C.overexert_hp();
                    }
                }

                regen_pw(C.allmainState.mvl_wtcap);

                if (!C.u.uinvulnerable) {
                    if (C.Teleportation && !C.rn2(()=>(85), 308, "moveloop_core")) {
                        let old_ux = C.u.ux, old_uy = C.u.uy;

                        C.tele();
                        if (C.u.ux != old_ux || C.u.uy != old_uy) {
                            if (!C.next_to_u()) {
                                C.check_leash(old_ux, old_uy);
                            }
                            /* clear doagain keystrokes */
                            C.cmdq_clear(C.CQ_CANNED);
                            C.cmdq_clear(C.CQ_REPEAT);
                        }
                    }
                    /* delayed change may not be valid anymore */
                    if ((C.allmainState.mvl_change == 1 && !C.Polymorph)
                        || (C.allmainState.mvl_change == 2 && C.u.ulycn == C.NON_PM))
                        C.allmainState.mvl_change = 0;
                    if (C.Polymorph && !C.rn2(()=>(100), 325, "moveloop_core"))
                        C.allmainState.mvl_change = 1;
                    else if (C.ismnum(C.u.ulycn) && !C.Upolyd
                             && !C.rn2(()=>(80 - (20 * C.night())), 328, "moveloop_core"))
                        C.allmainState.mvl_change = 2;
                    if (C.allmainState.mvl_change && !C.Unchanging) {
                        if (C.gm.multi >= 0) {
                            stop_occupation();
                            if (C.allmainState.mvl_change == 1)
                                C.polyself(C.POLY_NOFLAGS);
                            else
                                C.you_were();
                            C.allmainState.mvl_change = 0;
                        }
                    }
                }

                if (C.Searching && !C.svl.level.flags.noautosearch
                    && C.gm.multi >= 0)
                    C.dosearch0(1);
                if (C.Warning)
                    C.warnreveal();
                if (C.gw.were_changes) {
                    /* update innate intrinsics (mainly Drain_resistance) */
                    C.set_uasmon();
                }
                C.mkot_trap_warn();
                C.dosounds();
                C.do_storms();
                C.gethungry();
                C.age_spells();
                C.exerchk();
                C.invault();
                if (C.u.uhave.amulet)
                    C.amulet();
                if (!C.rn2(()=>(40 + (C.ACURR(C.A_DEX) * 3)), 360, "moveloop_core"))
                    C.u_wipe_engr(C.rnd(()=>(3), 361, "moveloop_core"));
                if (C.u.uevent.udemigod && !C.u.uinvulnerable) {
                    if (C.u.udg_cnt)
                        C.u.udg_cnt--;
                    if (!C.u.udg_cnt) {
                        C.intervene();
                        C.u.udg_cnt = C.rn1(()=>[200, 50], 367, "moveloop_core");
                    }
                }
/* XXX This should be recoded to use something like regions - a list of
 * things that are active and need to be handled that is dynamically
 * maintained and not a list of special cases. */
                /* vision will be updated as bubbles move */
                if (C.Is_waterlevel(C.u.uz) || C.Is_airlevel(C.u.uz))
                    C.movebubbles();
                else if (C.svl.level.flags.fumaroles)
                    C.fumaroles();

                /* when immobile, count is in turns */
                if (C.gm.multi < 0) {
                    C.runmode_delay_output();
                    if (++C.gm.multi == 0) { /* finished yet? */
                        C.unmul(0);
                        /* if unmul caused a level change, take it now */
                        if (C.u.utotype)
                            C.deferred_goto();
                    }
                }
            }
        } while (C.u.umovement < C.NORMAL_SPEED); /* hero can't move */

        /******************************************/
        /* once-per-hero-took-time things go here */
        /******************************************/

        C.gh.hero_seq++; /* moves*8 + n for n == 1..7 */

        /* although we checked for encumbrance above, we need to
           check again for message purposes, as the weight of
           inventory may have changed in, e.g., nh_timeout(); we do
           need two checks here so that the player gets feedback
           immediately if their own action encumbered them */
        C.encumber_msg();


        if (C.iflags.hilite_delta)
            C.status_eval_next_unhilite();

        if (C.svm.moves >= C.svc.context.seer_turn) {
            if ((C.u.uhave.amulet || C.Clairvoyant) && !C.In_endgame(C.u.uz)
                && !C.BClairvoyant)
                C.do_vicinity_map(0);
            /* we maintain this counter even when clairvoyance isn't
               taking place; on average, go again 30 turns from now */
            C.svc.context.seer_turn = C.svm.moves + BigInt(C.rn1(()=>[31, 15], 415, "moveloop_core")); /*15..45*/
            /* [it used to be that on every 15th turn, there was a 50%
               chance of farsight, so it could happen as often as every
               15 turns or theoretically never happen at all; but when
               a fast hero got multiple moves on that 15th turn, it
               could actually happen more than once on the same turn!] */
        }
        /* [fast hero who gets multiple moves per turn ends up sinking
           multiple times per turn; is that what we really want?] */
        if (C.u.utrap && C.u.utraptype == C.TT_LAVA)
            C.sink_into_lava();
        /* when/if hero escapes from lava, he can't just stay there */
        else if (!C.u.umoved)
            C.pooleffects(C.FALSE);

        /* vision while buried or underwater is updated here */
        if (C.Underwater)
            C.under_water(0);
        else if (C.u.uburied)
            C.under_ground(0);

        C.see_nearby_monsters();
    } /* actual time passed */

    /****************************************/
    /* once-per-player-input things go here */
    /****************************************/

    C.clear_splitobjs();

    /* the Amulet of Yendor gives a wish when initially picked up */
    if (C.u.uhave.amulet && !C.u.uevent.amulet_wish) {
        C.u.uevent.amulet_wish = 1;
        C.display_nhwindow(C.WIN_MESSAGE, C.TRUE);
        C.urgent_pline("The Amulet is bestowing a wish upon you!");
        C.makewish();
    }

    C.find_ac();
    if (!C.svc.context.mv || C.Blind) {
        /* redo monsters if hallu or wearing a helm of telepathy */
        if (C.Hallucination) { /* update screen randomly */
            C.see_monsters();
            C.see_objects();
            C.see_traps();
            if (C.u.uswallow)
                C.swallowed(0);
        } else if (C.Unblind_telepat || C.Warning || C.Warn_of_mon
                   /* this is needed for the case where you saw a monster
                      due to being next to it while it's in a gas cloud
                      and then you moved away; it should no longer be seen
                      when that happens, even if it hasn't moved */
                   || C.any_visible_region()) { /* TODO: optimize this */
            C.see_monsters();
        }
        if (C.gv.vision_full_recalc)
            C.vision_recalc(0); /* vision! */
    }
    if (C.disp.botl || C.disp.botlx) {
        C.bot();
        C.curs_on_u();
    } else if (C.disp.time_botl) {
        C.timebot();
        C.curs_on_u();
    }

    C.m_everyturn_effect(C.gy.youmonst);

    C.svc.context.move = 1;

    if (C.gm.multi >= 0 && C.go.occupation) {












            if (C.callOccupation(C.go.occupation) == 0)

                C.go.occupation = 0;
        if (



            C.monster_nearby()) {
            stop_occupation();
            C.reset_eat();
        }
        C.runmode_delay_output();
        return;
    }

    C.u.umoved = C.FALSE;

    if (C.gm.multi > 0) {
        C.lookaround();
        C.runmode_delay_output();
        if (!C.gm.multi) {
            /* lookaround may clear multi */
            C.svc.context.move = 0;
            return;
        }
        if (C.svc.context.mv) {
            if (C.gm.multi < C.COLNO && !--C.gm.multi)
                C.end_running(C.TRUE);
            C.domove();
        } else {
            --C.gm.multi;
            C.nhassert(C.gc.command_count != 0);
            C.rhack(C.gc.cmd_key);
        }
    } else if (C.gm.multi == 0) {

        C.ckmailstatus();

        C.rhack(0);
    }
    if (C.u.utotype)       /* change dungeon level */
        C.deferred_goto(); /* after rhack() */

    if (C.gv.vision_full_recalc)
        C.vision_recalc(0); /* vision! */

    /* after rhack() and vision_recalc() so that the map is redrawn
       once with correct vision data, not twice (overshoot+correct) */
    C.cliparound(C.u.ux, C.u.uy);

    /* when running in non-tport mode, this gets done through domove() */
    if ((!C.svc.context.run || C.flags.runmode == C.RUN_TPORT)
        && (C.gm.multi && (!C.svc.context.travel ? !(C.gm.multi % 7n)
                        : !(C.svm.moves % 7n)))) {
        if (C.flags.time && C.svc.context.run)
            C.disp.botl = C.TRUE;
        /* [should this be flush_screen() instead?] */
        C.display_nhwindow(C.WIN_MAP, C.FALSE);
    }

    if (C.gl.luacore && C.nhcb_counts[C.NHCB_END_TURN]) {
        C.lua_getglobal(C.gl.luacore, "nh_callback_run");
        C.lua_pushstring(C.gl.luacore, C.nhcb_name[C.NHCB_END_TURN]);
        C.nhl_pcall_handle(C.gl.luacore, 1, 0, "moveloop_core", C.NHLpa_panic);
        C.lua_settop(C.gl.luacore, 0);
    }
}

export function maybe_do_tutorial()
{
    let sp = C.find_level("tut-1");

    if (!sp)
        return;

    if (C.ask_do_tutorial()) {
        C.assign_level(C.u.ucamefrom, C.u.uz);
        C.iflags.nofollowers = C.TRUE;
        C.schedule_goto(sp.dlevel, C.UTOTYPE_NONE,
                      "Entering the tutorial.", 0);
        C.deferred_goto();
        C.vision_recalc(0);
        C.docrt();
        C.iflags.nofollowers = C.FALSE;
    }
}

export function moveloop(resuming)
{
    moveloop_preamble(resuming);

    if (!resuming)
        maybe_do_tutorial();

    for (;;) {
        moveloop_core();
    }
}

export function regen_pw(wtcap)
{
    if (C.u.uen < C.u.uenmax
        && ((wtcap < C.MOD_ENCUMBER
             && (!(C.svm.moves % BigInt(Math.trunc((C.MAXULEV + 8 - C.u.ulevel)
                              * (C.Role_if(C.PM_WIZARD) ? 3 : 4)
                              / 6))))) || C.Energy_regeneration)) {
        let upper = Math.trunc((C.ACURR(C.A_WIS) + C.ACURR(C.A_INT)) / 15) + 1;

        if (C.EMagical_breathing)
            upper += 2;

        C.u.uen += C.rn1(()=>[upper, 1], 612, "regen_pw");
        if (C.u.uen > C.u.uenmax)
            C.u.uen = C.u.uenmax;
        C.disp.botl = C.TRUE;
        if (C.u.uen == C.u.uenmax)
            interrupt_multi("You feel full of energy.");
    }
}


/* maybe recover some lost health (or lose some when an eel out of water) */
export function regen_hp(wtcap)
{
    let heal = 0;
    let reached_full = C.FALSE,
            encumbrance_ok = (wtcap < C.MOD_ENCUMBER || !C.u.umoved);

    if (C.Upolyd) {
        if (C.u.mh < 1) { /* shouldn't happen... */
            C.rehumanize();
        } else if (C.gy.youmonst.data.mlet == C.S_EEL
                   && !C.is_pool(C.u.ux, C.u.uy) && !C.Is_waterlevel(C.u.uz)
                   && !C.Breathless) {
            /* eel out of water loses hp, similar to monster eels;
               as hp gets lower, rate of further loss slows down */
            if (C.u.mh > 1 && !C.Regeneration && C.rn2(()=>(C.u.mh), 639, "regen_hp") > C.rn2(()=>(8), 639, "regen_hp")
                && (!C.Half_physical_damage || !(C.svm.moves % 2n)))
                heal = -1;
        } else if (C.u.mh < C.u.mhmax) {
            if ((C.Regeneration || (C.Sleepy && C.u.usleep)) || (encumbrance_ok && !(C.svm.moves % 20n)))
                heal = 1;
        }
        if (heal) {
            C.disp.botl = C.TRUE;
            C.u.mh += heal;
            reached_full = (C.u.mh == C.u.mhmax);
        }

    /* !Upolyd */
    } else {
        /* [when this code was in-line within moveloop(), there was
           no !Upolyd check here, so poly'd hero recovered lost u.uhp
           once u.mh reached u.mhmax; that may have been convenient
           for the player, but it didn't make sense for gameplay...] */
        if (C.u.uhp < C.u.uhpmax && (encumbrance_ok || (C.Regeneration || (C.Sleepy && C.u.usleep)))) {
            heal = (C.u.ulevel + C.ACURR(C.A_CON)) > C.rn2(()=>(100), 659, "regen_hp");

            if ((C.Regeneration || (C.Sleepy && C.u.usleep)))
                heal += 1;
            if (C.Sleepy && C.u.usleep)
                heal++;

            if (heal) {
                C.disp.botl = C.TRUE;
                C.u.uhp += heal;
                if (C.u.uhp > C.u.uhpmax)
                    C.u.uhp = C.u.uhpmax;
                /* stop voluntary multi-turn activity if now fully healed */
                reached_full = (C.u.uhp == C.u.uhpmax);
            }
        }
    }

    if (reached_full)
        interrupt_multi("You are in full health.");
}


export function stop_occupation()
{
    if (C.go.occupation) {
        if (!C.maybe_finished_meal(C.TRUE))
            C.You("stop %s.", C.go.occtxt);
        C.go.occupation = 0;
        C.disp.botl = C.TRUE; /* in case u.uhs changed */
        C.nomul(0);
    } else if (C.gm.multi >= 0) {
        C.nomul(0);
    }
    C.cmdq_clear(C.CQ_CANNED);
}

export function init_sound_disp_gamewindows()
{
    let menu_behavior = C.MENU_BEHAVE_STANDARD;

    C.activate_chosen_soundlib();

    if (C.iflags.wc_splash_screen && !C.flags.randomall) {
        C.SoundAchievement(0, C.sa2_splashscreen, 0);
        /* ToDo: new splash screen invocation will go here */
    } else {
        C.SoundAchievement(0, C.sa2_newgame_nosplash, 0);
    }








    C.WIN_MESSAGE = C.create_nhwindow(C.NHW_MESSAGE);
    if (C.VIA_WINDOWPORT()) {
        C.status_initialize(C.FALSE);
    } else {
        C.WIN_STATUS = C.create_nhwindow(C.NHW_STATUS);
    }
    C.WIN_MAP = C.create_nhwindow(C.NHW_MAP);
    C.WIN_INVEN = C.create_nhwindow(C.NHW_MENU);
    if (C.WIN_INVEN != C.WIN_ERR)
        C.adjust_menu_promptstyle(C.WIN_INVEN, C.menuHeadingsAddress);







    /* in case of early quit where WIN_INVEN could be destroyed before
       ever having been used, use it here to pacify the Qt interface */
    C.start_menu(C.WIN_INVEN, menu_behavior), C.end_menu(C.WIN_INVEN, 0);










    /*
     * The mac port is not DEPENDENT on the order of these
     * displays, but it looks a lot better this way...
     */



    C.display_nhwindow(C.WIN_MESSAGE, C.FALSE);
    C.clear_glyph_buffer();
    C.display_nhwindow(C.WIN_MAP, C.FALSE);




}

export function newgame()
{
    let i;

    /* make sure welcome messages are given before noticing monsters */
    C.notice_mon_off();
    C.disp.botlx = C.TRUE;
    C.svc.context.ident = 2;  /* id 1 is reserved for gy.youmonst */
    C.svc.context.warnlevel = 1;
    C.svc.context.next_attrib_check = 600n; /* arbitrary first setting */
    C.svc.context.tribute.enabled = C.TRUE;   /* turn on 3.6 tributes    */
    C.svc.context.tribute.tributesz = C.tributeSize;
    C.get_nhuuid();

    for (i = C.LOW_PM; i < C.NUMMONS; i++)
        C.svm.mvitals[i].mvflags = C.mons[i].geno & C.G_NOCORPSE;

    C.init_objects(); /* must be before u_init() */

    C.flags.pantheon = -1; /* role_init() will reset this */
    C.role_init();         /* must be before init_dungeons(), u_init(),
                          * and init_artifacts() */

    C.init_dungeons();  /* must be before u_init() to avoid rndmonst()
                       * creating odd monsters for any tins and eggs
                       * in hero's initial inventory */
    C.init_artifacts(); /* before u_init() in case $WIZKIT specifies
                       * any artifacts */
    C.u_init_misc();

    C.l_nhcore_init();  /* create a Lua state that lasts until end of game */
    C.reset_glyphmap(C.gm_newgame);

    C.signal(C.SIGINT, C.done1Pointer);


    if (C.iflags.news)
        C.display_file(C.NEWS, C.FALSE);

    /* quest_init();  --  Now part of role_init() */

    C.mklev();
    C.u_on_upstairs();
    C.vision_reset();          /* set up internals for level (after mklev) */
    C.check_special_room(C.FALSE);

    if (C.MON_AT(C.u.ux, C.u.uy))
        C.mnexto(C.m_at(C.u.ux, C.u.uy), C.RLOC_NOMSG);
    C.makedog();

    C.u_init_inventory_attrs();
    C.docrt();
    C.flush_screen(1);
    C.bot();
    while (C.u.uroleplay.reroll && C.reroll_menu()) {
        C.u_init_inventory_attrs();
        C.bot();
    }
    C.u_init_skills_discoveries();

    if (C.wizard) {
        C.read_wizkit();
        C.obj_delivery(C.FALSE); /* finish wizkit */
    }

    if (C.flags.legacy) {
        C.com_pager(C.u.uroleplay.pauper ? "pauper_legacy" : "legacy");
    }

    C.urealtime.realtime = 0n;
    C.urealtime.start_timing = C.getnow();

    C.save_currentstate();

    C.program_state.something_worth_saving++; /* useful data now exists */

    /* Success! */
    C.callLocal(welcome, C.TRUE);
    C.notice_mon_on(); /* now we can notice monsters */
    if (C.a11y.glyph_updates)
        C.dolookaround();
    else
        C.notice_all_mons(C.TRUE);
    return;
}

/* show "welcome [back] to NetHack" message at program startup */
export function welcome(new_game) /* false => restoring an old game */
{
    const buf = C.stackAlloc(C.BUFSZ);
    let currentgend = C.Upolyd ? C.u.mfemale : C.flags.female,
            adrift = (C.u.ualign.type != C.u.ualignbase[C.A_CURRENT]);

    C.l_nhcore_call(new_game ? C.NHCORE_START_NEW_GAME : C.NHCORE_RESTORE_OLD_GAME);

    /* skip "welcome back" if restoring a doomed character */
    if (!new_game && C.Upolyd && C.ugenocided()) {
        /* death via self-genocide is pending */
        C.pline("You're back, but you still feel %s inside.", C.udeadinside());
        return;
    }

    if (C.Hallucination)
        C.pline("NetHack is filmed in front of an undead studio audience.");

    /*
     * The "welcome back" message always describes your innate form
     * even when polymorphed or wearing a helm of opposite alignment.
     * Alignment is shown unconditionally for new games; for restores
     * it's only shown if it has changed from its original value.
     * Sex is shown for new games except when it is redundant; for
     * restores it's only shown if different from its original value.
     */
    C.storeChar(buf, 0);




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
    if (new_game || C.u.ualignbase[C.A_ORIGINAL] != C.u.ualignbase[C.A_CURRENT] || adrift)
        C.Sprintf(C.eos(buf), " %s%s",
                adrift ? "adrift " : "",
                adrift ? C.align_str(C.u.ualign.type)
                       : C.align_str(C.u.ualignbase[C.A_CURRENT]));

    if (!C.gu.urole.name.f
        && (new_game
            ? (C.gu.urole.allow & C.ROLE_GENDMASK) == (C.ROLE_MALE | C.ROLE_FEMALE)
            : currentgend != C.flags.initgend))
        C.Sprintf(C.eos(buf), " %s", C.genders[currentgend].adj);
    C.Sprintf(C.eos(buf), " %s %s", C.gu.urace.adj,
            (currentgend && C.gu.urole.name.f) ? C.gu.urole.name.f
                                             : C.gu.urole.name.m);

    C.pline(new_game ? "%s %s, welcome to NetHack!  You are a%s."
                   : "%s %s, the%s, welcome back to NetHack!",
          C.Hello(0), C.svp.plname, buf);

    if (new_game) {
        /* guarantee that 'major' event category is never empty */
        C.livelog_printf(C.LL_ACHIEVE, "%s the%s entered the dungeon",
                       C.svp.plname, buf);
    } else {
        /* if restoring in Gehennom, give same hot/smoky message as when
           first entering it */
        C.hellish_smoke_mesg();
        /* remind player of the level annotation, like in goto_level() */
        C.print_level_annotation();
    }
}













































export function interrupt_multi(msg)
{
    if (C.gm.multi > 0 && !C.svc.context.travel && !C.svc.context.run) {
        C.nomul(0);
        if (C.flags.verbose && msg)
            C.Norep("%s", msg);
    }
}

/* convert from time_t to number of seconds */
export function timet_to_seconds(ttim)
{
    /* for Unix-based and Posix-compliant systems, a cast to 'long' would
       suffice but the C Standard doesn't require time_t to be that simple */
    return timet_delta(ttim, 0n);
}

/* calculate the difference in seconds between two time_t values */
export function timet_delta(etim, stim) /* end and start times */
{
    /* difftime() is a STDC routine which returns the number of seconds
       between two time_t values as a 'double' */
    return C.longFromDouble(C.difftime(etim, stim));
}

/*allmain.c*/

/* init_nhwindows() has already been called, so before
       creating the windows, check to see if there are any
       palette entries to alter */

/* This _is_ the right place for this - maybe we will
     * have to split init_sound_disp_gamewindows into
     * create_gamewindows and show_gamewindows to get rid of this ifdef...
     */

/* FIXME: this will break if any coordinate is too big for (char);
       the sys/msdos/vid*.c code uses (unsigned char) which is less
       vulnerable but not guaranteed to be able to hold coordxy values;
       also, there doesn't appear to be any need for this to be static,
       nor to contain pairs of (> or <) and x; it could just be a full
       line of spaces and > or < characters with update_positionbar()
       revised to reconstruct the x values for non-space characters */

/* TODO: use the same method as getpos() so objects don't cover stairs */

/* FIXME: traversing 'stairs' list ignores mimics that pose as stairs */

/* hero location */

/* fence post */
