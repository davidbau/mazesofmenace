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
import { init_dungeons, find_level } from './dungeon.js';
import { schedule_goto, deferred_goto } from './do.js';
import { setup_role_race_from_rc, u_init_misc, u_init_inventory_attrs, u_init_skills_discoveries, find_ac } from './u_init.js';
import { makedog } from './dog.js';
import { makemon, reset_align_shift_cache } from './makemon.js';
import { mcalcmove, mcalcdistress, movemon, NORMAL_SPEED } from './mon.js';
import { LOW_PM, NUMMONS, mons, G_NOCORPSE } from './monsters.js';
import {
    A_DEX, A_STR, A_CON, A_WIS, A_MAX, acurr, exercise, adjattrib,
    change_luck, Fast, Very_fast, Searching,
} from './attrib.js';
import { dosearch0 } from './detect.js';
import { nhgetch } from './input.js';
import { unmul, monster_nearby, stop_occupation } from './hack.js';
import { reset_justpicked } from './pickup.js';
import { set_wear } from './do_wear.js';
import { gethungry } from './eat.js';
import { age_spells } from './spell.js';
import { near_capacity, paint_corner_nhw_menu, encumber_msg } from './invent.js';
import { com_pager_legacy } from './questpgr.js';
import { snapshot_status_lines } from './display.js';
import { Hello, align_str } from './roles.js';
import { livelog_printf } from './pline.js';
import { phase_of_the_moon, friday_13th, FULL_MOON, NEW_MOON } from './calendar.js';
import { ATR_INVERSE } from './terminal.js';
import { dosounds } from './sounds.js';
import { invault } from './vault.js';
import { nh_timeout } from './timeout.js';
import {
    UNENCUMBERED, SLT_ENCUMBER, MOD_ENCUMBER, HVY_ENCUMBER, EXT_ENCUMBER,
    NO_MM_FLAGS, Upolyd, LL_ACHIEVE,
    ROLE_GENDMASK, ROLE_MALE, ROLE_FEMALE,
    UTOTYPE_NONE, TIMEOUT, REGENERATION,
} from './const.js';

// C ref: allmain.c moveloop_preamble() — moon/friday; new-game RNG only when !resuming
export async function moveloop_preamble(resuming) {
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

    if (!resuming) {
        // C order: rndencode → set_wear → reset_justpicked → pickup(1) →
        // seer_turn → umovement → initrack (pickup deferred).
        game.context.rndencode = rnd(9000);
        // C: set_wear(NULL) — Helmet_on fedora luck, Blindf_on, etc.
        await set_wear(null);
        reset_justpicked(game.invent);
        // C: (void) pickup(1) — autopickup at initial location deferred
        game.context.seer_turn = rnd(30);
        game.u.umovement = NORMAL_SPEED;
        initrack();
    } else {
        // C: read_engr_at / fix_shop_damage deferred
    }
    // C: encumber_msg() — sync go.oldcap (auto-pickup / starting load)
    await encumber_msg();
    game.context.move = 0;
}

// C ref: allmain.c u_calc_moveamt()
function u_calc_moveamt(wtcap) {
    let moveamt = 0;
    // Steed path when riding and hero actually moved this turn
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

/** C: U_CAN_REGEN() — Regeneration || (Sleepy && u.usleep). */
function u_can_regen() {
    const u = game.u || {};
    // C youprop.h Regeneration ≡ HRegeneration || ERegeneration (uprops)
    const regen = !!(u.HRegeneration || u.ERegeneration
        || (u.uprops?.[REGENERATION]?.intrinsic | 0)
        || (u.uprops?.[REGENERATION]?.extrinsic | 0));
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

/**
 * C ref: attrib.c exerper — hunger / encumbrance / status exercise ticks.
 * Named omissions: Monk fasting WIS arms; Clairvoyant/Regeneration props;
 * full Sick/Vomiting timeout bodies (flags only when set).
 */
function exerper() {
    const moves = game.moves || 0;
    const u = game.u || {};
    if (!(moves % 10)) {
        // Hunger Checks — Tourist starts Not Hungry → exercise(A_CON, TRUE)
        const hunger = u.uhunger ?? 900;
        if (hunger > 1000) {
            exercise(A_DEX, false);
        } else if (hunger > 150) {
            exercise(A_CON, true);
        } else if (hunger > 50) {
            /* HUNGRY — no exercise in switch until WEAK */
        } else if (hunger > 0) {
            exercise(A_STR, false);
        } else {
            exercise(A_CON, false);
        }

        // Encumbrance Checks
        switch (near_capacity()) {
        case MOD_ENCUMBER:
            exercise(A_STR, true);
            break;
        case HVY_ENCUMBER:
            exercise(A_STR, true);
            exercise(A_DEX, false);
            break;
        case EXT_ENCUMBER:
            exercise(A_DEX, false);
            exercise(A_CON, false);
            break;
        default:
            break;
        }
    }

    // status checks every 5 moves
    if (!(moves % 5)) {
        // HClairvoyant / HRegeneration deferred
        // C: Confusion ≡ HConfusion; Hallucination ≡ HHallucination
        if (u.Sick || u.Vomiting) exercise(A_CON, false);
        if ((u.HConfusion | u.Confusion)
            || (u.HHallucination | u.Hallucination)) {
            exercise(A_WIS, false);
        }
        // C: (Wounded_legs && !usteed) || Fumbling || HStun
        const wounded = !!(u.Wounded_legs
            || ((u.HWounded_legs | 0) & TIMEOUT)
            || (u.EWounded_legs | 0));
        if ((wounded && !u.usteed) || u.Fumbling || (u.HStun | 0)) {
            exercise(A_DEX, false);
        }
    }
}

/* exercise/abuse text — C attrib.c exertext[A_MAX][2] */
const EXERTEXT = [
    ['exercising diligently', 'exercising properly'],           // Str
    [null, null],                                               // Int
    ['very observant', 'paying attention'],                     // Wis
    ['working on your reflexes', 'working on reflexes lately'], // Dex
    ['leading a healthy life-style', 'watching your health'],   // Con
    [null, null],                                               // Cha
];

/**
 * C ref: attrib.c exerchk — periodic exercise/abuse resolve.
 * Named omissions: Fixed_abil/Dunce via adjattrib; encumber_msg after
 * STR/CON change in adjattrib when in_moveloop.
 */
async function exerchk() {
    exerper();
    const g = game;
    const moves = g.moves || 0;
    if (!g.context) g.context = {};
    // C: next_attrib_check defaults to 600 at newgame
    if (g.context.next_attrib_check == null) g.context.next_attrib_check = 600;
    if (moves < g.context.next_attrib_check || (g.multi || 0)) return;

    const AVAL = 50;
    const u = g.u || {};
    if (!u.aexe) u.aexe = { a: [0, 0, 0, 0, 0, 0] };
    const race = g.urace || {};

    for (let i = 0; i < A_MAX; ++i) {
        let ax = u.aexe.a[i] || 0;
        if (!ax) continue; // C: skip nextattrib when no exercise/abuse

        const mod_val = ax > 0 ? 1 : -1;
        let lolim = race.attrmin?.[i] ?? 3;
        let hilim = race.attrmax?.[i] ?? 18;
        if (hilim > 18) hilim = 18;
        const abase = u.acurr?.a?.[i] ?? 0;
        // C: goto nextattrib — still halves AEXE
        let skipChange = false;
        if ((ax < 0) ? (abase <= lolim) : (abase >= hilim)) {
            skipChange = true;
        } else if (Upolyd(u) && i !== A_WIS) {
            skipChange = true;
        } else {
            // C: rn2(AVAL) > ((i != A_WIS) ? (abs(ax)*2/3) : abs(ax))
            const thresh = (i !== A_WIS)
                ? Math.trunc(Math.abs(ax) * 2 / 3)
                : Math.abs(ax);
            if (rn2(AVAL) > thresh) skipChange = true;
        }

        if (!skipChange) {
            if (await adjattrib(i, mod_val, -1)) {
                ax = 0;
                u.aexe.a[i] = 0;
                const phrase = EXERTEXT[i][mod_val > 0 ? 0 : 1];
                if (phrase) {
                    await pline(
                        `You ${mod_val > 0 ? 'must have been' : "haven't been"} ${phrase}.`,
                    );
                }
            }
        }
        // C: AEXE(i) = (abs(ax) / 2) * mod_val
        u.aexe.a[i] = Math.trunc(Math.abs(ax) / 2) * mod_val;
    }
    // C: svc.context.next_attrib_check += rn1(200, 800);
    g.context.next_attrib_check += rn1(200, 800);
}

// C ref: allmain.c welcome() — new_game false → restore path
export async function welcome(new_game) {
    const g = game;
    // C: currentgend = Upolyd ? u.mfemale : flags.female (poly deferred)
    const currentgend = !!g.flags?.female;
    const role = g.urole || {};
    const race = g.urace || {};
    const u = g.u || {};
    const atype = u.ualign?.type ?? 0;
    const baseCur = u.ualignbase?.current ?? atype;
    const baseOrig = u.ualignbase?.original ?? atype;
    // C: adrift = (u.ualign.type != u.ualignbase[A_CURRENT])
    const adrift = atype !== baseCur;

    // C builds buf; align only for new_game or changed/adrift base align
    let buf = '';
    if (new_game || baseOrig !== baseCur || adrift) {
        buf += ` ${adrift ? 'adrift ' : ''}${align_str(adrift ? atype : baseCur)}`;
    }
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

    // C: moves starts 0 until u_init_role; reset align_shift statics
    g.moves = 0;
    reset_align_shift_cache();

    // C ref: allmain.c newgame — context.ident / tribute before init_objects
    if (!g.context) g.context = {};
    if (g.context.ident == null) g.context.ident = 2;
    // C: svc.context.warnlevel = 1
    if (g.context.warnlevel == null) g.context.warnlevel = 1;
    // C: svc.context.next_attrib_check = 600L
    if (g.context.next_attrib_check == null) g.context.next_attrib_check = 600;
    if (!g.context.tribute) g.context.tribute = {};
    g.context.tribute.enabled = true;
    g.context.tribute.bookstock = !!g.context.tribute.bookstock;

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
    // C: svm.moves = 1 in u_init_role via u_init_inventory_attrs (after mklev)
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
 *
 * process_menu_window: invalid letter → nhbell + stay open (no rebuild);
 * space/return with no pick → select_menu n==0 → outer loop rebuilds and
 * pass++ adds "(Please choose 'y' or 'n'.)".
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

        // Inner loop ≡ process_menu_window while (!finished)
        let dismissNoPick = false;
        for (;;) {
            const key = await nhgetch();
            const ch = String.fromCharCode(key);
            if (ch === 'y' || ch === 'Y') {
                game._menu_overlay = false;
                await docrt();
                await flush_screen(1);
                return true;
            }
            if (ch === 'n' || ch === 'N' || key === 27) {
                game._menu_overlay = false;
                await docrt();
                await flush_screen(1);
                return false;
            }
            // C: space/return finish with no selection → n==0
            if (ch === ' ' || key === 13 || key === 10) {
                dismissNoPick = true;
                break;
            }
            // C: unacceptable input → tty_nhbell; cursor stays; wait again
            continue;
        }

        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);
        if (dismissNoPick) pass++;
    }
}

/** C ref: allmain.c maybe_do_tutorial() — schedule_goto tut-1 + deferred_goto. */
async function maybe_do_tutorial() {
    // C: s_level *sp = find_level("tut-1"); if (!sp) return;
    const sp = find_level('tut-1');
    if (!sp) return;
    if (!(await ask_do_tutorial())) return;
    const u = game.u;
    if (!u.ucamefrom) u.ucamefrom = { dnum: 0, dlevel: 0 };
    u.ucamefrom.dnum = u.uz.dnum | 0;
    u.ucamefrom.dlevel = u.uz.dlevel | 0;
    if (!game.iflags) game.iflags = {};
    game.iflags.nofollowers = true;
    schedule_goto(sp.dlevel, UTOTYPE_NONE, 'Entering the tutorial.', null);
    await deferred_goto();
    vision_recalc(0);
    await docrt();
    game.iflags.nofollowers = false;
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
        let mvl_wtcap = UNENCUMBERED;
        do {
            // C: encumber_msg() at top of hero-can't-move loop
            await encumber_msg();

            do {
                monscanmove = await movemon();
                if (g.program_state?.gameover) return;
                if ((g.u.umovement || 0) >= NORMAL_SPEED) break;
            } while (monscanmove);

            // C: after monster loop (burden may have changed)
            mvl_wtcap = near_capacity();

            if (!monscanmove && (g.u.umovement || 0) < NORMAL_SPEED) {
                // End of turn: C mcalcdistress before movement reallocation
                // (mfrozen/mblinded/mfleetim timeouts; mon_regen)
                if (g.were_changes != null) g.were_changes = 0;
                mcalcdistress();
                for (const mtmp of g.fmon || []) {
                    mtmp.movement = (mtmp.movement || 0) + mcalcmove(mtmp, true);
                }
                maybe_generate_rnd_mon();
                u_calc_moveamt(mvl_wtcap);
                // C: settrack() before svm.moves++
                settrack();
                g.moves = (g.moves || 1) + 1;

                // once-per-turn — C: nh_timeout before regen_hp / wipe_engr
                // (Glib / run_regions deferred)
                await nh_timeout();
                // C allmain.c moveloop: if (u.ublesscnt) u.ublesscnt--;
                if (g.u.ublesscnt) g.u.ublesscnt = (g.u.ublesscnt | 0) - 1;

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
                await dosounds();
                gethungry();
                age_spells();
                await exerchk();
                // C: invault() before wipe_engr / amulet
                await invault();

                // C: if (!rn2(40 + ACURR(A_DEX)*3)) u_wipe_engr(rnd(3));
                if (!rn2(40 + (acurr(A_DEX) * 3))) {
                    rnd(3);
                }

                // C: when immobile, count is in turns — multi < 0 occupation
                if ((g.multi || 0) < 0) {
                    g.multi++;
                    if (g.multi === 0) {
                        await unmul(null);
                    }
                }
            }
            if (g.program_state?.gameover) return;
        } while ((g.u.umovement || 0) < NORMAL_SPEED);

        // C: once-per-hero-took-time — seer_turn after umovement loop
        // (not inside once-per-turn EOT). Always rolls rn1 even without
        // Clairvoyant; do_vicinity_map deferred.
        if ((g.moves || 0) >= (g.context.seer_turn || 0)) {
            g.context.seer_turn = g.moves + rn1(31, 15);
        }
    }

    // Vision + display (before getch — screen capture in nhgetch)
    // C: allmain.c once-per-player-input — Amulet wish before find_ac
    // (D-0559). display_nhwindow(WIN_MESSAGE,TRUE) ≈ flush pending More.
    {
        const u = g.u;
        if (u && (u.uhave?.amulet || u.uhave_amulet)
            && !(u.uevent?.amulet_wish)) {
            if (!u.uevent) u.uevent = {};
            u.uevent.amulet_wish = 1;
            await flush_topl_more();
            await pline('The Amulet is bestowing a wish upon you!');
            const { makewish } = await import('./zap.js');
            await makewish();
        }
    }
    // C: allmain.c once-per-player-input find_ac() before bot/flush/rhack
    find_ac();
    if (g.vision_full_recalc) {
        vision_recalc(0);
        g.vision_full_recalc = 0;
    }
    await bot();
    await flush_screen(1);

    // C: u.umoved = FALSE before occupation / rhack (allmain.c)
    g.u.umoved = false;

    // C: svc.context.move = 1; then occupation or rhack(0)
    // When multi < 0 (dressing etc.), skip input; leave move=1 for next turn.
    g.context.move = 1;
    if ((g.multi || 0) >= 0 && typeof g.occupation === 'function') {
        // C ref: allmain.c go.occupation — runs before rhack; return ends this tick
        const cont = await g.occupation();
        if (!cont) g.occupation = null;
        // C: monster_nearby() → stop_occupation(); reset_eat deferred
        if (monster_nearby()) await stop_occupation();
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
    // C: if (u.utotype) deferred_goto() after rhack()
    if (g.u?.utotype) await deferred_goto();
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
