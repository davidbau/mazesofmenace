// allmain.js — Main game loop.
// C ref: allmain.c — newgame, moveloop, moveloop_core, moveloop_preamble.

import { game } from './gstate.js';
import { rnd, rn2, rn1 } from './rng.js';
import { mklev, l_nhcore_init, u_on_upstairs } from './mklev.js';
import { rhack, continue_run, run_active, continue_search, search_repeat_active } from './cmd.js';
import { docrt, cls, bot, flush_screen, pline, flush_topl_more } from './display.js';
import { vision_recalc, vision_reset, init_vision_globals } from './vision.js';
import { initrack, settrack } from './track.js';
import { fastforward_pre_mklev } from './fastforward.js';
import { init_objects } from './o_init.js';
import { init_dungeons } from './dungeon.js';
import { setup_role_race_from_rc, u_init_misc, u_init_inventory_attrs, u_init_skills_discoveries } from './u_init.js';
import { makedog } from './dog.js';
import { makemon } from './makemon.js';
import { mcalcmove, movemon, NORMAL_SPEED } from './mon.js';
import { LOW_PM, NUMMONS, mons, G_NOCORPSE } from './monsters.js';
import { A_DEX, A_STR, A_CON, acurr, exercise, change_luck, Fast, Very_fast, Searching } from './attrib.js';
import { dosearch0 } from './detect.js';
import { nhgetch } from './input.js';
import { unmul } from './hack.js';
import { gethungry } from './eat.js';
import { age_spells } from './spell.js';
import { near_capacity, paint_corner_nhw_menu } from './invent.js';
import { com_pager_legacy } from './questpgr.js';
import { snapshot_status_lines } from './display.js';
import { Hello, align_str } from './roles.js';
import { livelog_printf } from './pline.js';
import { phase_of_the_moon, friday_13th, FULL_MOON, NEW_MOON } from './calendar.js';
import { ATR_INVERSE } from './terminal.js';
import {
    UNENCUMBERED, SLT_ENCUMBER, MOD_ENCUMBER, HVY_ENCUMBER, EXT_ENCUMBER,
    NO_MM_FLAGS, Upolyd, LL_ACHIEVE,
    ROLE_GENDMASK, ROLE_MALE, ROLE_FEMALE,
} from './const.js';

// C ref: allmain.c moveloop_preamble() — moon/friday + new-game RNG leaves
async function moveloop_preamble(_resuming) {
    if (!game.context) game.context = {};
    game.flags = game.flags || {};

    // C: flags.moonphase = phase_of_the_moon();
    game.flags.moonphase = phase_of_the_moon();
    if (game.flags.moonphase === FULL_MOON) {
        await pline('You are lucky!  Full moon tonight.');
        change_luck(1);
    } else if (game.flags.moonphase === NEW_MOON) {
        await pline('Be careful!  New moon tonight.');
    }
    game.flags.friday13 = friday_13th();
    if (game.flags.friday13) {
        await pline('Watch out!  Bad things can happen on Friday the 13th.');
        change_luck(-1);
    }

    // svc.context.rndencode = rnd(9000);
    game.context.rndencode = rnd(9000);
    // svc.context.seer_turn = (long) rnd(30);
    game.context.seer_turn = rnd(30);
    // C: u.umovement = NORMAL_SPEED on new game
    game.u.umovement = NORMAL_SPEED;
    game.context.move = 0;
}

// C ref: allmain.c u_calc_moveamt()
function u_calc_moveamt(wtcap) {
    let moveamt = 0;
    // Steed path (mcalcmove) deferred until riding is live.
    if (game.u?.usteed && game.u?.umoved) {
        moveamt = mcalcmove(game.u.usteed, true);
    } else {
        // C: gy.youmonst.data->mmove — non-poly role form is NORMAL_SPEED.
        const youData = game.youmonst?.data;
        moveamt = youData?.mmove ?? NORMAL_SPEED;

        if (Very_fast()) {
            // gain a free action on 2/3 of turns
            if (rn2(3) !== 0) moveamt += NORMAL_SPEED;
        } else if (Fast()) {
            // gain a free action on 1/3 of turns
            if (rn2(3) === 0) moveamt += NORMAL_SPEED;
        }
    }
    switch (wtcap) {
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
        case UNENCUMBERED:
        default:
            break;
    }
    game.u.umovement = (game.u.umovement || 0) + moveamt;
    if (game.u.umovement < 0) game.u.umovement = 0;
}

// C ref: allmain.c maybe_generate_rnd_mon()
function maybe_generate_rnd_mon() {
    // depth 1, not udemigod, not past stronghold → rn2(70)
    if (!rn2(70)) {
        makemon(null, 0, 0, NO_MM_FLAGS);
    }
}

/** C: U_CAN_REGEN() — Regeneration || (Sleepy && u.usleep). Props deferred. */
function u_can_regen() {
    const u = game.u || {};
    const regen = !!(u.HRegeneration || u.ERegeneration);
    const sleepy = !!(u.HSleepy || u.ESleepy);
    return regen || (sleepy && !!u.usleep);
}

/**
 * C ref: allmain.c interrupt_multi() — stop voluntary multi-turn activity.
 * Norep message deferred; only clears multi when not travel/run.
 */
function interrupt_multi(_msg) {
    const ctx = game.context || {};
    if ((game.multi || 0) > 0 && !ctx.travel && !ctx.run) {
        game.multi = 0;
    }
}

/**
 * C ref: allmain.c regen_hp(wtcap) — maybe recover HP once/turn.
 * Upolyd eel-out-of-water hp-loss rolls (rn2(mh)/rn2(8)) deferred until poly
 * eel forms are live; Breathless / Half_physical_damage props deferred.
 */
function regen_hp(wtcap) {
    const u = game.u || (game.u = {});
    let heal = 0;
    let reached_full = false;
    const encumbrance_ok = (wtcap < MOD_ENCUMBER || !u.umoved);

    if (Upolyd(u)) {
        if ((u.mh || 0) < 1) {
            // rehumanize deferred
        } else if ((u.mh || 0) < (u.mhmax || 0)) {
            if (u_can_regen() || (encumbrance_ok && !((game.moves || 0) % 20))) {
                heal = 1;
            }
        }
        if (heal) {
            if (!game.flags) game.flags = {};
            game.flags.botl = true;
            u.mh = (u.mh || 0) + heal;
            reached_full = (u.mh === u.mhmax);
        }
    } else if (
        (u.uhp || 0) < (u.uhpmax || 0) && (encumbrance_ok || u_can_regen())
    ) {
        // C: heal = (u.ulevel + (int)ACURR(A_CON)) > rn2(100);
        heal = ((u.ulevel || 1) + acurr(A_CON)) > rn2(100) ? 1 : 0;
        if (u_can_regen()) heal += 1;
        if ((u.HSleepy || u.ESleepy) && u.usleep) heal++;

        if (heal) {
            if (!game.flags) game.flags = {};
            game.flags.botl = true;
            u.uhp = (u.uhp || 0) + heal;
            if (u.uhp > u.uhpmax) u.uhp = u.uhpmax;
            reached_full = (u.uhp === u.uhpmax);
        }
    }

    if (reached_full) interrupt_multi('You are in full health.');
}

// C ref: sounds.c dosounds() — feature rolls; vault matters once has_vault
function dosounds() {
    const lf = game.level?.flags;
    if (!lf) return;
    // Deaf / !acoustics / uswallow / Underwater — skip (Tourist defaults ok)
    if (lf.nfountains && !rn2(400)) {
        rn2(3); // fountain_msg index
    }
    if (lf.nsinks && !rn2(300)) {
        rn2(2); // sink_msg
    }
    if (lf.has_court && !rn2(200)) {
        // throne_mon_sound — not hit on early Tourist peels
    }
    if (lf.has_swamp && !rn2(200)) {
        rn2(2); // swamp_msg; C returns after
        return;
    }
    if (lf.has_vault && !rn2(200)) {
        // gd_sound / vault messages — only when rn2 hits 0; seed1800 burns the roll
        // Full vault sound path TODO when a peel lands on 0
    }
}

function exerper() {
    const moves = game.moves || 0;
    if (!(moves % 10)) {
        // Hunger Checks — Tourist starts Not Hungry → exercise(A_CON, TRUE)
        const hunger = game.u.uhunger ?? 900;
        if (hunger > 1000) {
            exercise(A_DEX, false);
        } else if (hunger > 150) {
            exercise(A_CON, true);
        } else if (hunger > 50) {
            /* HUNGRY — no exercise in switch default for STR until WEAK */
        } else if (hunger > 0) {
            exercise(A_STR, false);
        } else {
            exercise(A_CON, false);
        }
    }
}

function exerchk() {
    exerper();
    // next_attrib_check tests not hit early in seed8000
}

// C ref: allmain.c welcome() — new-game path only (restore deferred)
async function welcome(new_game) {
    const g = game;
    // C: currentgend = Upolyd ? u.mfemale : flags.female (poly deferred)
    const currentgend = !!g.flags?.female;
    const role = g.urole || {};
    const race = g.urace || {};
    const atype = g.u?.ualign?.type ?? 0;

    // C builds buf as " <align> <gender?> <race> <role>"
    let buf = ` ${align_str(atype)}`;
    // C: if (!urole.name.f && both genders allowed on new_game) add gender adj
    const allowGend = (role.allow ?? 0) & ROLE_GENDMASK;
    if (!role.name?.f
        && (new_game
            ? allowGend === (ROLE_MALE | ROLE_FEMALE)
            : currentgend !== !!g.flags?.initgend)) {
        buf += ` ${currentgend ? 'female' : 'male'}`;
    }
    buf += ` ${race.adj || 'human'}`;
    buf += ` ${(currentgend && role.name?.f) ? role.name.f : (role.name?.m || 'Adventurer')}`;

    const hello = Hello(role.mnum);
    const plname = g.plname || 'Hero';
    if (new_game) {
        await pline(`${hello} ${plname}, welcome to NetHack!  You are a${buf}.`);
        // C: livelog_printf(LL_ACHIEVE, "%s the%s entered the dungeon", plname, buf)
        livelog_printf(LL_ACHIEVE, '%s the%s entered the dungeon', plname, buf);
    } else {
        await pline(`${hello} ${plname}, the${buf}, welcome back to NetHack!`);
    }
}

// C ref: allmain.c newgame()
export async function newgame() {
    const g = game;

    // C ref: allmain.c — mvitals.mvflags = geno & G_NOCORPSE (before init_objects)
    if (!g.mvitals) g.mvitals = [];
    for (let i = LOW_PM; i < NUMMONS; i++) {
        const ptr = mons(i);
        g.mvitals[i] = {
            ...(g.mvitals[i] || {}),
            mvflags: (ptr?.geno ?? 0) & G_NOCORPSE,
            born: g.mvitals[i]?.born ?? 0,
            died: g.mvitals[i]?.died ?? 0,
        };
    }

    // C ref: allmain.c → init_objects() (o_init.c)
    init_objects();

    // Role/race before init_dungeons (quest filecode in fixup_level_locations)
    const rc = g._parsed_rc || {};
    setup_role_race_from_rc({
        role: rc.role || 'Tourist',
        race: rc.race || 'human',
        gender: rc.gender || 'female',
        align: rc.align || 'neutral',
        name: rc.name || g.plname || 'Contestant',
    });

    // C ref: allmain.c → init_dungeons() (dungeon.c) — peels fastforward_pre_mklev
    init_dungeons();
    // C ref: allmain.c → u_init_misc() (u_init.c)
    await u_init_misc();
    fastforward_pre_mklev(); // emptied — kept as delete-only hook

    // C ref: allmain.c l_nhcore_init() — shuffle align[] for Lua (second nhlib load)
    l_nhcore_init();

    g.u = g.u || {};
    g.u.uz = g.u.uz || { dnum: 0, dlevel: 1 };
    // ulevel/HP/Pw/ualign already set in u_init_misc (C order)
    g.u.ulevel = g.u.ulevel || 1; // needed during mklev for monmax_difficulty / rne
    g.u.uac = 0; // C: 0 until find_ac(); first bot may show AC:0
    g.flags = g.flags || {};
    // mines_dnum / oracle_level / branches set by init_dungeons / fixup_level_locations

    // Real mklev: rooms/corridors + fill_ordinary_room + mineralize
    await mklev();

    // Post-mklev placeholders that u_init_misc does not set
    g.u.ulevel = 1;
    g.u.uexp = 0;
    g.u.urexp = 0;
    g.u.uhunger = g.u.uhunger ?? 900;
    g.moves = 1;
    g.flags.female = g.flags.female !== false;
    g.plname = g.plname || 'Contestant';

    // C ref: allmain.c newgame() — u_on_upstairs before makedog
    u_on_upstairs();
    // C ref: allmain.c → makedog() (skipped when preferred_pet === 'n')
    makedog();

    // C ref: allmain.c → u_init_inventory_attrs() (after makedog)
    await u_init_inventory_attrs();

    // Initial display BEFORE wear (C: docrt/bot then u_init_skills_discoveries)
    init_vision_globals();
    initrack(); // C: allmain.c / cmd.c — clear hero track ring
    vision_reset();
    vision_recalc(0);
    await cls();
    await docrt();
    await flush_screen(1);
    await bot();
    // Snapshot status for legacy window — C tty often still shows pre-wear botl
    const statusSnap = snapshot_status_lines();

    // C ref: allmain.c → u_init_skills_discoveries() (wear/wield/discover)
    u_init_skills_discoveries();

    // C ref: allmain.c — if (flags.legacy) com_pager("legacy")
    if (g.flags.legacy !== false) {
        const align = ['law', 'neutral', 'chaos'];
        for (let i = align.length; i > 1; i--) {
            const j = rn2(i);
            [align[i - 1], align[j]] = [align[j], align[i - 1]];
        }
        g._legacy_align = align;
        await com_pager_legacy(statusSnap);
    }

    // Refresh map/status after wear (and after legacy dismiss)
    await docrt();
    await flush_screen(1);
    await bot();

    // C ref: allmain.c welcome(TRUE)
    await welcome(true);

    // C ref: unixmain.c wd_message() after newgame() — explore/discovery
    if (g.flags.explore || g.flags.discover) {
        await pline('You are in non-scoring explore/discovery mode.');
    }

    // C ref: allmain.c moveloop() → moveloop_preamble(FALSE) before first turn
    await moveloop_preamble(false);
    // C ref: allmain.c moveloop() → maybe_do_tutorial() before core loop
    await maybe_do_tutorial();
}

/**
 * C ref: options.c ask_do_tutorial() — NHW_MENU y/n unless OPTIONS=tutorial set.
 * C ref: wintty.c tty_end_menu / tty_display_nhwindow / process_menu_window
 *        H2344_BROKEN corner offx = min(min(82, cols/2), cols-maxcol-1);
 *        title uses menu_headings (ATR_INVERSE) after adjust_menu_promptstyle.
 */
async function ask_do_tutorial() {
    if (game.tutorial_set_in_config) return !!game.flags.tutorial;
    // C flushes pending topline --More-- (welcome) before the tutorial menu
    await flush_topl_more();
    let pass = 0;
    for (;;) {
        // C: nh_basename(get_configfile()) — contest sessions use .nethackrc
        const rcname = '.nethackrc';
        const footer =
            `Put "OPTIONS=!tutorial" in ${rcname} to skip this query.`;
        // Order after tty_end_menu(prompt): prompt, "", y, n, "", footer [, hint]
        const entries = [
            { text: 'Do you want a tutorial?', attr: ATR_INVERSE },
            { text: '', attr: 0 },
            { text: 'y - Yes, do a tutorial', attr: 0 },
            { text: 'n - No, just start play', attr: 0 },
            { text: '', attr: 0 },
            { text: footer, attr: 0 },
        ];
        if (pass > 0)
            entries.push({ text: "(Please choose 'y' or 'n'.)", attr: 0 });

        await paint_corner_nhw_menu(entries, '(end) ');
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);

        const ch = String.fromCharCode(key);
        if (ch === 'y' || ch === 'Y') return true;
        if (ch === 'n' || ch === 'N' || key === 27) return false;
        // space/return / other → re-prompt (C select_menu n==0)
        pass++;
    }
}

/** C ref: allmain.c maybe_do_tutorial() — yes-path (schedule_goto tut) deferred. */
async function maybe_do_tutorial() {
    if (!(await ask_do_tutorial())) return;
    await pline('Entering the tutorial.');
}

// C ref: allmain.c moveloop_core()
export async function moveloop_core() {
    const g = game;
    if (!g.context) g.context = {};
    if (!g.u) g.u = {};

    // C: if (svc.context.move) { actual time passed ... }
    if (g.context.move) {
        g.u.umovement = (g.u.umovement || 0) - NORMAL_SPEED;

        let monscanmove = false;
        do {
            do {
                monscanmove = await movemon();
                if ((g.u.umovement || 0) >= NORMAL_SPEED) break;
            } while (monscanmove);

            if (!monscanmove && (g.u.umovement || 0) < NORMAL_SPEED) {
                // End of turn: reallocate movement, maybe spawn, hero regen clock
                for (const mtmp of g.fmon || []) {
                    mtmp.movement = (mtmp.movement || 0) + mcalcmove(mtmp, true);
                }
                maybe_generate_rnd_mon();
                // C: mvl_wtcap = near_capacity() earlier; reuse for regen_hp/pw
                let mvl_wtcap = near_capacity();
                u_calc_moveamt(mvl_wtcap);
                // C: settrack() before svm.moves++
                settrack();
                g.moves = (g.moves || 1) + 1;

                // once-per-turn — C: regen_hp before dosounds when HP below max
                if (g.u.uinvulnerable) {
                    mvl_wtcap = UNENCUMBERED;
                } else if (
                    !Upolyd(g.u)
                        ? ((g.u.uhp || 0) < (g.u.uhpmax || 0))
                        : ((g.u.mh || 0) < (g.u.mhmax || 0))
                ) {
                    regen_hp(mvl_wtcap);
                }
                // regen_pw / Teleportation / Polymorph deferred (no early RNG)
                // C: Searching && !noautosearch && multi >= 0 → dosearch0(1)
                if (
                    Searching()
                    && !game.level?.flags?.noautosearch
                    && (game.multi == null || game.multi >= 0)
                ) {
                    await dosearch0(1);
                }
                // warnreveal deferred
                dosounds();
                gethungry();
                age_spells();
                exerchk();

                // C: if (!rn2(40 + ACURR(A_DEX)*3)) u_wipe_engr(rnd(3));
                if (!rn2(40 + (acurr(A_DEX) * 3))) {
                    rnd(3);
                }

                // Clairvoyance timer
                if ((g.moves || 0) >= (g.context.seer_turn || 0)) {
                    g.context.seer_turn = g.moves + rn1(31, 15);
                }

                // C: when immobile, count is in turns — multi < 0 occupation
                if ((g.multi || 0) < 0) {
                    g.multi++;
                    if (g.multi === 0) {
                        await unmul(null);
                    }
                }
            }
        } while ((g.u.umovement || 0) < NORMAL_SPEED);
    }

    // Vision + display (before getch — screen capture in nhgetch)
    if (g.vision_full_recalc) {
        vision_recalc(0);
        g.vision_full_recalc = 0;
    }
    await bot();
    await flush_screen(1);

    // C: svc.context.move = 1; then occupation or rhack(0)
    // When multi < 0 (dressing etc.), skip input; leave move=1 for next turn.
    g.context.move = 1;
    if ((g.multi || 0) >= 0 && typeof g.occupation === 'function') {
        // C ref: allmain.c go.occupation — runs before rhack; return ends this tick
        const cont = g.occupation();
        if (!cont) g.occupation = null;
        // monster_nearby stop_occupation deferred
        return;
    }
    if ((g.multi || 0) < 0) {
        // multi-turn inactivity continues without nhgetch
    } else if (run_active()) {
        await continue_run();
    } else if (search_repeat_active()) {
        await continue_search();
    } else {
        await rhack(0);
    }
    // Message cleared at start of next rhack so pline() survives until the
    // following nhgetch capture (C keeps topline until next command).
}

// C ref: allmain.c moveloop()
export async function moveloop(resuming) {
    vision_recalc(0);
    await docrt();
    await flush_screen(1);

    for (;;) {
        await moveloop_core();
        if (game.program_state?.gameover) break;
    }
}
