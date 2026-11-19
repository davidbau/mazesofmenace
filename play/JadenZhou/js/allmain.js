// allmain.js — Main game loop.
// C ref: allmain.c — newgame, welcome, moveloop_preamble, moveloop,
// moveloop_core.
//
// Uses fastforward.js (fastforward_step) for the seed8000 rolls of the
// turn-cycle parts not ported yet (movemon, rest of the new-turn block).
// Real mklev.js handles level generation for screen parity.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { mklev, u_on_upstairs } from './mklev.js';
import { l_nhcore_init } from './nhlua.js';
import { rhack } from './cmd.js';
import { docrt, cls, bot, flush_screen, pline } from './display.js';
import { vision_recalc, vision_reset, init_vision_globals } from './vision.js';
import { fastforward_step, FF_MOVEMON, FF_NEWTURN } from './fastforward.js';
import { mcalcmove } from './mon.js';
import { m_at, makemon } from './makemon.js';
import { mnexto } from './teleport.js';
import { makedog } from './dog.js';
import { com_pager } from './questpgr.js';
import { objects_globals_init } from './objects.js';
import { init_objects } from './o_init.js';
import { init_dungeons, depth } from './dungeon.js';
import { mons, monst_globals_init, LOW_PM, NUMMONS, G_NOCORPSE } from './monsters.js';
import { decl_globals_init } from './decl.js';
import { sys_early_init } from './sys.js';
import { role_init, genders, Hello } from './role.js';
import { u_init_misc, u_init_inventory_attrs, u_init_skills_discoveries,
         money_cnt } from './u_init.js';
import { align_str } from './insight.js';
import { A_CURRENT, A_ORIGINAL, ROLE_GENDMASK, ROLE_MALE, ROLE_FEMALE, RLOC_NOMSG, NORMAL_SPEED, NO_MM_FLAGS,
         FAST, INTRINSIC } from './const.js';

const MON_AT = (x, y) => !!m_at(x, y); /* C ref: display.h MON_AT() */

// C ref: allmain.c early_init()
// Not ported yet: program_state_init(), runtime_info_init().
export function early_init() {
    decl_globals_init();
    objects_globals_init();
    monst_globals_init();
    sys_early_init();
}

// C ref: allmain.c newgame()
export async function newgame() {
    const g = game;
    let i;

    g.mvitals = [];
    for (i = LOW_PM; i < NUMMONS; i++)
        g.mvitals[i] = { born: 0, died: 0, mvflags: mons[i].geno & G_NOCORPSE };

    init_objects(); /* must be before u_init() */

    g.flags.pantheon = -1; /* role_init() will reset this */
    await role_init();     /* must be before init_dungeons(), u_init(),
                            * and init_artifacts() */

    init_dungeons();  /* must be before u_init() to avoid rndmonst()
                       * creating odd monsters for any tins and eggs
                       * in hero's initial inventory */
    // init_artifacts(); -- not ported yet (artifact.c)
    u_init_misc();

    l_nhcore_init();  /* create a Lua state that lasts until end of game */
    // reset_glyphmap(gm_newgame); -- not ported yet (display.c)

    // Real mklev generates the level with correct room positions
    // Structural phase consumes RNG for rooms/corridors/doors/stairs
    await mklev();
    u_on_upstairs();
    init_vision_globals();   /* C: vision_init() at program startup */
    vision_reset();          /* set up internals for level (after mklev) */
    /* check_special_room(FALSE): no special room is entered on arrival
       at level 1 yet -- not ported yet (hack.c) */

    if (MON_AT(g.u.ux, g.u.uy))
        mnexto(m_at(g.u.ux, g.u.uy), RLOC_NOMSG);
    makedog();

    u_init_inventory_attrs();
    /* the status line's gold: botl.c shows money_cnt(invent) */
    g._goldCount = money_cnt(g.invent);
    vision_recalc(0);
    await cls();
    await docrt();
    await flush_screen(1);
    await bot();
    /* while (u.uroleplay.reroll && reroll_menu()): reroll is not ported */
    u_init_skills_discoveries();

    /* if (wizard) { read_wizkit(); obj_delivery(FALSE); }: wizard mode
       isn't ported yet */

    if (g.flags.legacy) {
        com_pager(g.u.uroleplay.pauper ? "pauper_legacy" : "legacy");
    }

    /* Success! */
    await welcome(true);
}

// C ref: allmain.c welcome()
export async function welcome(new_game) /* false => restoring an old game */ {
    const g = game;
    const u = g.u;
    const Upolyd = (u.mtimedone !== 0);
    const currentgend = Upolyd ? u.mfemale : g.flags.female;
    const adrift = (u.ualign.type !== u.ualignbase[A_CURRENT]);
    let buf = '';

    // l_nhcore_call(new_game ? NHCORE_START_NEW_GAME : NHCORE_RESTORE_OLD_GAME);
    // -- not ported yet (nhcore.lua)

    /* skip "welcome back" if restoring a doomed character: not ported yet
       (ugenocided()/udeadinside()); restore isn't ported either */

    /* if (Hallucination) pline("NetHack is filmed in front of an undead
       studio audience."); -- Hallucination is never set at this point yet */

    /*
     * The "welcome back" message always describes your innate form
     * even when polymorphed or wearing a helm of opposite alignment.
     * Alignment is shown unconditionally for new games; for restores
     * it's only shown if it has changed from its original value.
     * Sex is shown for new games except when it is redundant; for
     * restores it's only shown if different from its original value.
     */
    if (new_game || u.ualignbase[A_ORIGINAL] !== u.ualignbase[A_CURRENT] || adrift)
        buf += ` ${adrift ? "adrift " : ""}${adrift ? align_str(u.ualign.type)
                                                   : align_str(u.ualignbase[A_CURRENT])}`;
    if (!g.urole.name.f
        && (new_game
            ? (g.urole.allow & ROLE_GENDMASK) === (ROLE_MALE | ROLE_FEMALE)
            : currentgend !== g.flags.initgend))
        buf += ` ${genders[currentgend].adj}`;
    buf += ` ${g.urace.adj} ${(currentgend && g.urole.name.f) ? g.urole.name.f
                                                          : g.urole.name.m}`;

    await pline(new_game ? `${Hello(null)} ${g.plname}, welcome to NetHack!  You are a${buf}.`
                         : `${Hello(null)} ${g.plname}, the${buf}, welcome back to NetHack!`);

    /* livelog_printf() and the restore-only messages: not ported yet */
}

// C ref: allmain.c maybe_generate_rnd_mon()
/* small chance of generating a new random monster */
function maybe_generate_rnd_mon() {
    const g = game;
    const u = g.u;

    if (!rn2(u.uevent.udemigod ? 25
             : (depth(u.uz) > depth(g.dungeon_topology.d_stronghold_level)) ? 50
             : 70))
        makemon(null, 0, 0, NO_MM_FLAGS);
}

// C ref: allmain.c u_calc_moveamt()
function u_calc_moveamt(wtcap) {
    const g = game;
    const u = g.u;
    let moveamt = 0;

    /* calculate how much time passed. */
    if (u.usteed && u.umoved) {
        /* your speed doesn't augment steed's speed */
        moveamt = mcalcmove(u.usteed, true);
    } else {
        moveamt = g.youmonst.data.mmove;

        /* C ref: youprop.h HFast, EFast, Fast, Very_fast */
        const HFast = u.uprops[FAST].intrinsic, EFast = u.uprops[FAST].extrinsic;
        const Fast = (HFast || EFast);
        const Very_fast = ((HFast & ~INTRINSIC) || EFast);

        if (Very_fast) { /* speed boots, potion, or spell */
            /* gain a free action on 2/3 of turns */
            if (rn2(3) !== 0)
                moveamt += NORMAL_SPEED;
        } else if (Fast) { /* intrinsic */
            /* gain a free action on 1/3 of turns */
            if (rn2(3) === 0)
                moveamt += NORMAL_SPEED;
        }
    }

    /* switch (wtcap): encumbrance reduction -- near_capacity() isn't
       ported yet, so wtcap is always UNENCUMBERED */

    u.umovement += moveamt;
    if (u.umovement < 0)
        u.umovement = 0;
}

// C ref: allmain.c moveloop_core()
export async function moveloop_core() {
    const g = game;
    const u = g.u;
    let monscanmove = false;
    const mvl_wtcap = 0; /* UNENCUMBERED; near_capacity() not ported yet */

    /* get_nh_event(), maybe_shuffle_customizations(), dobjsfree(),
       clear_bypasses(), sanity_check(), makewish(): not ported yet */

    if (g.context.move) {
        /* actual time passed */
        u.umovement -= NORMAL_SPEED;

        do { /* hero can't move this turn loop */
            /* encumber_msg(): not ported yet */

            g.context.mon_moving = 1;
            do {
                /* movemon(): not ported yet; seed8000's recorded
                   monster-movement rolls are replayed instead */
                fastforward_step(g.moves, FF_MOVEMON);
                monscanmove = false;
                if (u.umovement >= NORMAL_SPEED)
                    break; /* it's now your turn */
            } while (monscanmove);
            g.context.mon_moving = 0;

            /* mvl_wtcap = near_capacity(): not ported yet */

            if (!monscanmove && u.umovement < NORMAL_SPEED) {
                /* both hero and monsters are out of steam this round */
                let mtmp;

                /* set up for a new turn */
                g.were_changes = 0;
                /* mcalcdistress(): adjust monsters' trap, blind, etc --
                   not ported yet */

                /* reallocate movement rations to monsters; don't need
                   to skip dead monsters here because they will have
                   been purged at end of their previous round of moving */
                for (mtmp = g.fmon; mtmp; mtmp = mtmp.nmon)
                    mtmp.movement += mcalcmove(mtmp, true);

                /* occasionally add another monster; since this takes
                   place after movement has been allotted, the new
                   monster effectively loses its first turn */
                maybe_generate_rnd_mon();

                u_calc_moveamt(mvl_wtcap);
                /* settrack(): not ported yet */

                g.moves++;
                /* 'moves' is misnamed; it represents turns; hero_seq is
                   a value that is distinct every time the hero moves */
                g.hero_seq = g.moves << 3;

                /* once-per-turn things (l_nhcore_call, nh_timeout,
                   regen_hp, regen_pw, exerchk, dosounds, ...) are not
                   ported yet; seed8000's recorded rolls for them are
                   replayed instead (indexed by the turn just ended) */
                fastforward_step(g.moves - 1, FF_NEWTURN);
            }
        } while (u.umovement < NORMAL_SPEED); /* hero can't move */

        /* once-per-hero-took-time things: not ported yet */
    } /* actual time passed */

    /* once-per-player-input things go here */

    // Vision + display
    if (g.vision_full_recalc) {
        vision_recalc(0);
        g.vision_full_recalc = 0;
    }
    await bot();
    await flush_screen(1);

    g.context.move = 1;

    // Read and execute one command
    await rhack(0);

    // Clear message after command is processed
    g._pending_message = '';
}

// C ref: allmain.c moveloop_preamble()
export function moveloop_preamble(resuming) {
    const g = game;
    const u = g.u;

    /* if (resuming && iflags.deferred_X) enter_explore_mode(): restore
       isn't ported yet */

    /* side-effects from the real world: phase_of_the_moon() and
       friday_13th() (calendar.c) with their luck changes and messages
       are not ported yet */

    if (!resuming) { /* new game */
        g.program_state.beyond_savefile_load = 1; /* for TTY_PERM_INVENT */
        g.context.rndencode = rnd(9000);
        /* set_wear((struct obj *) 0): side-effects of starting gear;
           reset_justpicked(gi.invent); (void) pickup(1): autopickup at
           initial location -- not ported yet */
        /* only matters if someday a character is able to start with
           clairvoyance (wizard with cornuthaum perhaps?); without this,
           first "random" occurrence would always kick in on turn 1 */
        g.context.seer_turn = rnd(30);
        /* give hero initial movement points; new game only--for restore,
           pending movement points were included in the save file */
        u.umovement = NORMAL_SPEED;
        /* initrack(): not ported yet */
    }
    g.disp_botlx = true; /* for STATUS_HILITES */
    /* resuming: read_engr_at(), fix_shop_damage(); encumber_msg();
       deferred see_monsters() -- not ported yet */

    u.uz0.dlevel = u.uz.dlevel;
    g.context.move = 0;

    g.program_state.in_moveloop = 1;
}

// C ref: allmain.c moveloop()
export async function moveloop(resuming) {
    moveloop_preamble(resuming);
    vision_recalc(0);
    await docrt();
    await flush_screen(1);

    for (;;) {
        await moveloop_core();
        if (game.program_state?.gameover) break;
    }
}
