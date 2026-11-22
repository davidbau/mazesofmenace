// allmain.js — Main game loop.
// C ref: allmain.c — newgame, welcome, moveloop_preamble, moveloop,
// moveloop_core.
//
// movemon() (mon.c/monmove.c), the once-per-turn and the
// once-per-hero-took-time blocks are real.

import { game } from './gstate.js';
import { clear_bypasses } from './worn.js';
import { rn2, rnd } from './rng.js';
import { mklev, u_on_upstairs } from './mklev.js';
import { l_nhcore_init } from './nhlua.js';
import { rhack, domove, enter_explore_mode } from './cmd.js';
import { docrt, cls, bot, flush_screen, pline, see_monsters } from './display.js';
import { see_objects, see_traps, Hallucination, Blind, swallowed } from './display.js';
import { read_engr_at } from './engrave.js';
import { encumber_msg, pickup } from './pickup.js';
import { reset_justpicked } from './invent.js';
import { vision_recalc, vision_reset, init_vision_globals } from './vision.js';
import { mcalcmove, mcalcdistress, movemon } from './mon.js';
import { initrack, settrack } from './track.js';
import { m_at, makemon, makemon_flush_msg } from './makemon.js';
import { mnexto } from './teleport.js';
import { makedog } from './dog.js';
import { deferred_goto, hellish_smoke_mesg } from './do.js';
import { com_pager } from './questpgr.js';
import { objects_globals_init } from './objects.js';
import { init_objects } from './o_init.js';
import { init_dungeons, depth, find_level, In_hell,
         print_level_annotation } from './dungeon.js';
import { ask_do_tutorial } from './options.js';
import { phase_of_the_moon, friday_13th } from './calendar.js';
import { change_luck } from './attrib.js';
import { set_wear } from './do_wear.js';
import { FULL_MOON, NEW_MOON, COLNO } from './const.js';
import { mons, monst_globals_init, LOW_PM, NUMMONS, G_NOCORPSE } from './monsters.js';
import { decl_globals_init } from './decl.js';
import { sys_early_init } from './sys.js';
import { role_init, genders, Hello } from './role.js';
import { u_init_misc, u_init_inventory_attrs, u_init_skills_discoveries,
         money_cnt, find_ac } from './u_init.js';
import { align_str } from './insight.js';
import { A_CURRENT, A_ORIGINAL, ROLE_GENDMASK, ROLE_MALE, ROLE_FEMALE, RLOC_NOMSG, NORMAL_SPEED, NO_MM_FLAGS,
         FAST, INTRINSIC, UNENCUMBERED, SLT_ENCUMBER, MOD_ENCUMBER, HVY_ENCUMBER,
         EXT_ENCUMBER, GLIB, TELEPORT, POLYMORPH, UNCHANGING, SEARCHING, WARNING,
         CLAIRVOYANT, ENERGY_REGENERATION, MAGICAL_BREATHING, REGENERATION,
         SLEEPY, MAXULEV, A_WIS, A_INT, A_CON, A_DEX, NON_PM, ROOMOFFSET, VAULT,
         TT_LAVA, POOL, MOAT, WATER, LAVAPOOL, LAVAWALL, DRAWBRIDGE_UP,
         Is_waterlevel, Is_airlevel, In_endgame } from './const.js';
import { rn1 } from './rng.js';
import { S_EEL, PM_WIZARD } from './monsters.js';
import { ACURR, exerchk } from './attrib.js';
import { near_capacity, lookaround, end_running, nomul, monster_nearby } from './hack.js';
import { nh_timeout } from './timeout.js';
import { dosounds } from './sounds.js';
import { gethungry, reset_eat, maybe_finished_meal } from './eat.js';
import { age_spells } from './spell.js';
import { u_wipe_engr } from './engrave.js';
import { dosearch0, warnreveal } from './detect.js';
import { set_uasmon } from './polyself.js';
import { init_artifacts } from './artifact.js';
import { run_regions } from './region.js';
import { m_everyturn_effect } from './monmove.js';

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

    g.context.warnlevel = 1;
    g.context.next_attrib_check = 600; /* arbitrary first setting */
    g.context.tribute = { enabled: true, bookstock: false }; /* turn on 3.6 tributes */

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
    init_artifacts(); /* before u_init() in case $WIZKIT specifies
                       * any artifacts */
    u_init_misc();

    l_nhcore_init();  /* create a Lua state that lasts until end of game */
    // reset_glyphmap(gm_newgame); -- not ported yet (display.c)

    // Real mklev generates the level with correct room positions
    // Structural phase consumes RNG for rooms/corridors/doors/stairs
    await mklev();
    u_on_upstairs();
    vision_reset();          /* set up internals for level (after mklev) */
    /* check_special_room(FALSE): no special room is entered on arrival
       at level 1 yet -- not ported yet (hack.c) */

    if (MON_AT(g.u.ux, g.u.uy))
        await mnexto(m_at(g.u.ux, g.u.uy), RLOC_NOMSG);
    makedog();

    await u_init_inventory_attrs();
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
        await com_pager(g.u.uroleplay.pauper ? "pauper_legacy" : "legacy");
    }

    /* urealtime.realtime = 0L; urealtime.start_timing = getnow(): the
       fixed game clock */
    g.urealtime = { realtime: 0, start_timing: 0, finish_time: 0 };
    /* INSURANCE save_currentstate(): the level 0 lock file isn't modelled */
    g.program_state.something_worth_saving =
        (g.program_state.something_worth_saving || 0) + 1; /* useful data now exists */

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

    if (new_game) {
        /* guarantee that 'major' event category is never empty:
           livelog_printf() -- the live log isn't kept */
    } else {
        /* if restoring in Gehennom, give same hot/smoky message as when
           first entering it */
        await hellish_smoke_mesg();
        /* remind player of the level annotation, like in goto_level() */
        await print_level_annotation();
    }
}

// C ref: allmain.c maybe_generate_rnd_mon()
/* small chance of generating a new random monster */
async function maybe_generate_rnd_mon() {
    const g = game;
    const u = g.u;

    if (!rn2(u.uevent.udemigod ? 25
             : (depth(u.uz) > depth(g.dungeon_topology.d_stronghold_level)) ? 50
             : 70)) {
        g.makemon_want_msg = true; /* see makemon()'s Norep() comment */
        try {
            makemon(null, 0, 0, NO_MM_FLAGS);
        } finally {
            g.makemon_want_msg = false;
        }
        await makemon_flush_msg();
    }
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

    switch (wtcap) {
    case UNENCUMBERED:
        break;
    case SLT_ENCUMBER:
        moveamt -= Math.trunc(moveamt / 4);
        break;
    case MOD_ENCUMBER:
        moveamt -= Math.trunc(moveamt / 2);
        break;
    case HVY_ENCUMBER:
        moveamt -= Math.trunc((moveamt * 3) / 4);
        break;
    case EXT_ENCUMBER:
        moveamt -= Math.trunc((moveamt * 7) / 8);
        break;
    default:
        break;
    }

    u.umovement += moveamt;
    if (u.umovement < 0)
        u.umovement = 0;
}

/* C ref: allmain.c static mvl_wtcap, mvl_change */
let mvl_wtcap = 0;
let mvl_change = 0;

/* C ref: you.h Upolyd */
function Upolyd() { return game.u.umonnum !== game.u.umonster; }

// C ref: calendar.c night()
function night() {
    /* getlt() and the hour of the (fixed) game clock: calendar.c isn't
       ported yet */
    throw new Error('night(): calendar.c not ported yet');
}

/* C ref: vault.c vault_occupied(u.urooms) */
function vault_occupied_urooms() {
    for (const ch of game.u.urooms || '') {
        const r = ch.charCodeAt(0);
        if (game.level.rooms[r - ROOMOFFSET].rtype === VAULT)
            return r;
    }
    return 0;
}

/* is the hero's spot one where pooleffects() would act (water/lava)? */
function is_pool_or_lava_at_u() {
    const typ = game.level.at(game.u.ux, game.u.uy).typ;
    return typ === POOL || typ === MOAT || typ === WATER || typ === LAVAPOOL
           || typ === LAVAWALL || typ === DRAWBRIDGE_UP;
}

// C ref: cmd.c timed_occupation()
/* used by set_occupation() for a counted command with an occupation text
   (search, wait); the command function is game.timed_occ_fn */
async function timed_occupation() {
    await game.timed_occ_fn();
    if (game.multi > 0)
        game.multi--;
    return (game.multi > 0) ? 1 : 0;
}

// C ref: cmd.c set_occupation()
export function set_occupation(fn, txt, xtime) {
    if (xtime) {
        game.occupation = timed_occupation;
        game.timed_occ_fn = fn;
    } else
        game.occupation = fn;
    game.occtxt = txt;
    game.occtime = 0;
}

// C ref: allmain.c stop_occupation()
export async function stop_occupation() {
    const g = game;
    if (g.occupation) {
        if (!await maybe_finished_meal(true))
            await pline(`You stop ${g.occtxt}.`); /* You() */
        g.occupation = null;
        g.disp_botl = true; /* in case u.uhs changed */
        nomul(0);
    } else if (g.multi >= 0) {
        nomul(0);
    }
    g.cmdq = []; /* cmdq_clear(CQ_CANNED) */
}

// C ref: hack.c unmul()
export async function unmul(msg_override) {
    const g = game;
    g.disp_botl = true;
    g.multi = 0; /* caller will usually have done this already */
    if (msg_override != null) /* C: non-Null pointer, "" included */
        g.nomovemsg = msg_override;
    else if (g.nomovemsg == null) /* a Null pointer; "" means no message */
        g.nomovemsg = "You can move again."; /* You_can_move_again */
    if (g.nomovemsg) {
        await pline(g.nomovemsg);
        /* "You survived that attempt on your life" while Upolyd: not
           reached */
    }
    g.nomovemsg = null;
    g.u.usleep = 0;
    g.multi_reason = null;

    if (g.afternmv) {
        const f = g.afternmv;

        /* clear afternmv before calling it (to override the
           encumbrance hack for levitation--see weight_cap()) */
        g.afternmv = null;
        await f();
    }
}

// C ref: allmain.c regen_pw()
async function regen_pw(wtcap) {
    const g = game;
    const u = g.u;
    const P = u.uprops;
    const Energy_regeneration = P[ENERGY_REGENERATION].intrinsic
                                || P[ENERGY_REGENERATION].extrinsic;

    if (u.uen < u.uenmax
        && ((wtcap < MOD_ENCUMBER
             && (!(g.moves % Math.trunc((MAXULEV + 8 - u.ulevel)
                              * (g.urole.mnum === PM_WIZARD ? 3 : 4)
                              / 6)))) || Energy_regeneration)) {
        let upper = Math.trunc((ACURR(A_WIS) + ACURR(A_INT)) / 15) + 1;

        if (P[MAGICAL_BREATHING].extrinsic) /* EMagical_breathing */
            upper += 2;

        u.uen += rn1(upper, 1);
        if (u.uen > u.uenmax)
            u.uen = u.uenmax;
        g.disp_botl = true;
        if (u.uen === u.uenmax) {
            /* interrupt_multi("You feel full of energy."): multi-turn
               counts aren't ported yet */
        }
    }
}

// C ref: allmain.c regen_hp()
async function regen_hp(wtcap) {
    const g = game;
    const u = g.u;
    const P = u.uprops;
    let heal = 0;
    const encumbrance_ok = (wtcap < MOD_ENCUMBER || !u.umoved);
    /* C ref: allmain.c U_CAN_REGEN() */
    const Regeneration = P[REGENERATION].intrinsic || P[REGENERATION].extrinsic;
    const Sleepy = P[SLEEPY].intrinsic || P[SLEEPY].extrinsic;
    const U_CAN_REGEN = () => (Regeneration || (Sleepy && u.usleep));

    if (Upolyd()) {
        /* polymorphed hero: polymorphing isn't ported yet */
        throw new Error('regen_hp(): Upolyd not ported yet');
    } else {
        /* [when this code was in-line within moveloop(), there was
           no !Upolyd check here, so poly'd hero recovered lost u.uhp
           once u.mh reached u.mhmax; that may have been convenient
           for the player, but it didn't make sense for gameplay...] */
        if (u.uhp < u.uhpmax && (encumbrance_ok || U_CAN_REGEN())) {
            heal = ((u.ulevel + ACURR(A_CON)) > rn2(100)) ? 1 : 0;

            if (U_CAN_REGEN())
                heal += 1;
            if (Sleepy && u.usleep)
                heal++;

            if (heal) {
                g.disp_botl = true;
                u.uhp += heal;
                if (u.uhp > u.uhpmax)
                    u.uhp = u.uhpmax;
                /* stop voluntary multi-turn activity if now fully healed:
                   interrupt_multi("You are in full health.") -- multi-turn
                   counts aren't ported yet */
            }
        }
    }
}

// C ref: allmain.c overexert_hp()
function overexert_hp() {
    const u = game.u;

    if (!Upolyd() ? (u.uhp > 1) : (u.mh > 1)) {
        if (!Upolyd()) u.uhp -= 1; else u.mh -= 1;
        game.disp_botl = true;
    } else {
        /* You("pass out from exertion!"); exercise(A_CON, FALSE);
           fall_asleep(-10, FALSE): not ported yet */
        throw new Error('overexert_hp(): fall_asleep() not ported yet');
    }
}

// C ref: allmain.c moveloop_core()
export async function moveloop_core() {
    const g = game;
    const u = g.u;
    const P = u.uprops;
    let monscanmove = false;

    /* get_nh_event(), maybe_shuffle_customizations(), dobjsfree():
       not ported yet */

    if (g.context.bypasses)
        clear_bypasses();

    /* sanity_check(), makewish(): not ported yet */

    if (g.context.move) {
        /* actual time passed */
        u.umovement -= NORMAL_SPEED;

        do { /* hero can't move this turn loop */
            /* encumber_msg(): not ported yet */

            g.context.mon_moving = 1;
            do {
                monscanmove = await movemon();
                if (u.umovement >= NORMAL_SPEED)
                    break; /* it's now your turn */
            } while (monscanmove);
            g.context.mon_moving = 0;

            mvl_wtcap = near_capacity();

            if (!monscanmove && u.umovement < NORMAL_SPEED) {
                /* both hero and monsters are out of steam this round */
                let mtmp;

                /* set up for a new turn */
                g.were_changes = 0;
                await mcalcdistress(); /* adjust monsters' trap, blind, etc */

                /* reallocate movement rations to monsters; don't need
                   to skip dead monsters here because they will have
                   been purged at end of their previous round of moving */
                for (mtmp = g.fmon; mtmp; mtmp = mtmp.nmon)
                    mtmp.movement += mcalcmove(mtmp, true);

                /* occasionally add another monster; since this takes
                   place after movement has been allotted, the new
                   monster effectively loses its first turn */
                await maybe_generate_rnd_mon();

                u_calc_moveamt(mvl_wtcap);
                settrack();

                g.moves++;
                /* 'moves' is misnamed; it represents turns; hero_seq is
                   a value that is distinct every time the hero moves */
                g.hero_seq = g.moves << 3;

                /* if (flags.time && !context.run) disp.time_botl = TRUE:
                   the status line redraws its turn counter itself */

                /********************************/
                /* once-per-turn things go here */
                /********************************/

                /* l_nhcore_call(NHCORE_MOVELOOP_TURN): nhcore.lua sets no
                   moveloop_turn callback */

                if (P[GLIB].intrinsic) /* Glib */
                    throw new Error('moveloop_core(): glibr() not ported yet');
                await nh_timeout();
                await run_regions();

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
                    mvl_wtcap = UNENCUMBERED;
                } else if (!Upolyd() ? (u.uhp < u.uhpmax)
                           : (u.mh < u.mhmax
                              || g.youmonst.data.mlet === S_EEL)) {
                    /* maybe heal */
                    await regen_hp(mvl_wtcap);
                }

                /* moving around while encumbered is hard work */
                if (mvl_wtcap > MOD_ENCUMBER && u.umoved) {
                    if (!(mvl_wtcap < EXT_ENCUMBER ? g.moves % 30
                          : g.moves % 10)) {
                        overexert_hp();
                    }
                }

                await regen_pw(mvl_wtcap);

                if (!u.uinvulnerable) {
                    if ((P[TELEPORT].intrinsic || P[TELEPORT].extrinsic) /* Teleportation */
                        && !rn2(85)) {
                        /* tele(): teleportation isn't ported yet */
                        throw new Error('moveloop_core(): tele() not ported yet');
                    }
                    const Polymorph = P[POLYMORPH].intrinsic || P[POLYMORPH].extrinsic;
                    /* delayed change may not be valid anymore */
                    if ((mvl_change === 1 && !Polymorph)
                        || (mvl_change === 2 && u.ulycn === NON_PM))
                        mvl_change = 0;
                    if (Polymorph && !rn2(100))
                        mvl_change = 1;
                    else if (u.ulycn >= LOW_PM /* ismnum(u.ulycn) */ && !Upolyd()
                             && !rn2(80 - (20 * night())))
                        mvl_change = 2;
                    if (mvl_change && !(P[UNCHANGING].intrinsic || P[UNCHANGING].extrinsic)) {
                        if (g.multi >= 0) {
                            /* stop_occupation(); polyself(POLY_NOFLAGS) /
                               you_were(): polymorphing isn't ported yet */
                            throw new Error('moveloop_core(): polyself() not ported yet');
                        }
                    }
                }

                if ((P[SEARCHING].intrinsic || P[SEARCHING].extrinsic) /* Searching */
                    && !g.level.flags.noautosearch
                    && g.multi >= 0)
                    await dosearch0(1);
                if (P[WARNING].intrinsic || P[WARNING].extrinsic) /* Warning */
                    await warnreveal();
                if (g.were_changes) {
                    /* update innate intrinsics (mainly Drain_resistance) */
                    set_uasmon();
                }
                /* mkot_trap_warn(): only acts while wielding the Master
                   Key of Thievery; artifacts aren't ported yet */
                await dosounds();
                /* do_storms(): only acts on the Plane of Air (not ported) */
                await gethungry();
                age_spells();
                await exerchk();
                /* invault(): vault_occupied(u.urooms) -- u.urooms is never
                   set by the JS port yet (hero can't be in a vault) */
                if (vault_occupied_urooms())
                    throw new Error('moveloop_core(): invault() not ported yet');
                else
                    u.uinvault = 0;
                if (u.uhave.amulet)
                    throw new Error('moveloop_core(): amulet() not ported yet');
                if (!rn2(40 + (ACURR(A_DEX) * 3)))
                    u_wipe_engr(rnd(3));
                if (u.uevent.udemigod && !u.uinvulnerable) {
                    /* intervene(): not ported yet */
                    throw new Error('moveloop_core(): intervene() not ported yet');
                }
                /* vision will be updated as bubbles move */
                if (Is_waterlevel(u.uz) || Is_airlevel(u.uz))
                    throw new Error('moveloop_core(): movebubbles() not ported yet');
                else if (g.level.flags.fumaroles)
                    throw new Error('moveloop_core(): fumaroles() not ported yet');

                /* when immobile, count is in turns */
                if (g.multi < 0) {
                    /* runmode_delay_output(): display timing only */
                    if (++g.multi === 0) { /* finished yet? */
                        await unmul(null);
                    }
                }
            }
        } while (u.umovement < NORMAL_SPEED); /* hero can't move */

        /******************************************/
        /* once-per-hero-took-time things go here */
        /******************************************/

        g.hero_seq++; /* moves*8 + n for n == 1..7 */

        /* encumber_msg(): messages about encumbrance changes are not
           ported yet (no rolls) */

        if (g.moves >= g.context.seer_turn) {
            const HC = P[CLAIRVOYANT];
            if ((u.uhave.amulet || ((HC.intrinsic || HC.extrinsic) && !HC.blocked))
                && !In_endgame(u.uz))
                /* do_vicinity_map(): not ported yet */
                throw new Error('moveloop_core(): do_vicinity_map() not ported yet');
            /* we maintain this counter even when clairvoyance isn't
               taking place; on average, go again 30 turns from now */
            g.context.seer_turn = g.moves + rn1(31, 15); /*15..45*/
        }
        /* [fast hero who gets multiple moves per turn ends up sinking
           multiple times per turn; is that what we really want?] */
        if (u.utrap && u.utraptype === TT_LAVA)
            throw new Error('moveloop_core(): sink_into_lava() not ported yet');
        /* when/if hero escapes from lava, he can't just stay there */
        else if (!u.umoved) {
            /* (void) pooleffects(FALSE): only acts when the hero is in
               or over water or lava; not ported yet */
            if (is_pool_or_lava_at_u())
                throw new Error('moveloop_core(): pooleffects() not ported yet');
        }

        /* vision while buried or underwater is updated here */
        if (u.uinwater || u.uburied)
            throw new Error('moveloop_core(): under_water() not ported yet');

        /* see_nearby_monsters(): display only, not ported yet */
    } /* actual time passed */

    /* once-per-player-input things go here */

    find_ac();
    if (!g.context.mv || Blind()) {
        /* redo monsters if hallu or wearing a helm of telepathy */
        if (Hallucination()) { /* update screen randomly */
            see_monsters();
            see_objects();
            see_traps();
            if (u.uswallow)
                await swallowed(0);
        }
        /* else if (Unblind_telepat || Warning || Warn_of_mon
                    || any_visible_region()) see_monsters(): not ported */
    }
    // Vision + display
    if (g.vision_full_recalc) {
        vision_recalc(0);
        g.vision_full_recalc = 0;
    }
    await bot();
    await flush_screen(1);

    await m_everyturn_effect(g.youmonst);

    g.context.move = 1;

    if (g.multi >= 0 && g.occupation) {
        if ((await g.occupation()) === 0)
            g.occupation = null;
        if (monster_nearby()) {
            await stop_occupation();
            reset_eat();
        }
        /* runmode_delay_output(): display timing only */
        return;
    }

    u.umoved = 0;

    if (g.multi > 0) {
        await lookaround();
        /* runmode_delay_output(): display timing only */
        if (!g.multi) {
            /* lookaround may clear multi */
            g.context.move = 0;
            return;
        }
        if (g.context.mv) {
            if (g.multi < COLNO && !--g.multi)
                end_running(true);
            await domove();
        } else {
            --g.multi;
            /* nhassert(gc.command_count != 0) */
            await rhack(g.cmd_key);
        }
    } else if (g.multi === 0) {
        /* ckmailstatus(): MAIL isn't ported */
        await rhack(0);
    }
    // C ref: allmain.c moveloop_core()
    if (g.u.utotype)       /* change dungeon level */
        await deferred_goto(); /* after rhack() */

    // Clear message after command is processed
    g._pending_message = '';
}

// C ref: allmain.c moveloop_preamble()
export async function moveloop_preamble(resuming) {
    const g = game;
    const u = g.u;

    /* if a save file created in normal mode is now being restored in
       explore mode, treat it as normal restore followed by 'X' command
       to use up the save file and require confirmation for explore mode */
    if (resuming && g.iflags.deferred_X)
        await enter_explore_mode();

    /* side-effects from the real world */
    g.flags.moonphase = phase_of_the_moon();
    if (g.flags.moonphase === FULL_MOON) {
        await pline("You are lucky!  Full moon tonight."); /* You() */
        change_luck(1);
    } else if (g.flags.moonphase === NEW_MOON) {
        await pline("Be careful!  New moon tonight.");
    }
    g.flags.friday13 = friday_13th();
    if (g.flags.friday13) {
        await pline("Watch out!  Bad things can happen on Friday the 13th.");
        change_luck(-1);
    }

    if (!resuming) { /* new game */
        g.program_state.beyond_savefile_load = 1; /* for TTY_PERM_INVENT */
        g.context.rndencode = rnd(9000);
        await set_wear(null); /* for side-effects of starting gear */
        reset_justpicked(g.invent);
        await pickup(1); /* autopickup at initial location */
        /* only matters if someday a character is able to start with
           clairvoyance (wizard with cornuthaum perhaps?); without this,
           first "random" occurrence would always kick in on turn 1 */
        g.context.seer_turn = rnd(30);
        /* give hero initial movement points; new game only--for restore,
           pending movement points were included in the save file */
        u.umovement = NORMAL_SPEED;
        initrack();
        /* initrack(): not ported yet */
    }
    g.disp_botlx = true; /* for STATUS_HILITES */
    if (resuming) { /* restoring old game */
        await read_engr_at(u.ux, u.uy); /* subset of pickup() */
        /* fix_shop_damage(): shop repair isn't ported */
        if (g.level.damagelist)
            throw new Error('moveloop_preamble(): fix_shop_damage() not ported yet');
    }

    await encumber_msg(); /* in case they auto-picked up something */
    if (g.defer_see_monsters) {
        g.defer_see_monsters = false;
        see_monsters();
    }

    u.uz0.dlevel = u.uz.dlevel;
    g.context.move = 0;

    g.program_state.in_moveloop = 1;
}

// C ref: allmain.c maybe_do_tutorial()
export async function maybe_do_tutorial() {
    const sp = find_level("tut-1");

    if (!sp)
        return;

    if (await ask_do_tutorial()) {
        /* assign_level(&u.ucamefrom, &u.uz); schedule_goto(&sp->dlevel,
           ...); deferred_goto(); vision_recalc(0); docrt(); */
        throw new Error('maybe_do_tutorial(): entering the tutorial is not ported yet');
    }
}

// C ref: allmain.c moveloop()
export async function moveloop(resuming) {
    await moveloop_preamble(resuming);

    if (!resuming)
        await maybe_do_tutorial();

    for (;;) {
        await moveloop_core();
        if (game.program_state?.gameover) break;
    }
}
