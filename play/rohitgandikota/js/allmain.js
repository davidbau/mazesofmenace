// allmain.js — Main game loop.
// C ref: allmain.c — newgame, moveloop, moveloop_core.
//
// Real mklev.js handles level generation for screen parity.

import { game } from './gstate.js';
import { set_wear } from './do_wear.js';
import { maybe_finished_meal } from './eat.js';

// src/allmain.c set_occupation() / stop_occupation() — the multi-turn action
// slot. moveloop_core calls go.occupation once per turn until it returns 0.
//
// Nothing here draws. The mechanism is what makes eating a food with
// oc_delay > 1 span several turns, and it is the same `gm.multi >= 0` gate the
// run loop uses, so porting it unblocks both.
export function set_occupation(fn, txt, xtime) {
    if (xtime) {
        /* timed_occupation wraps fn and counts down xtime */
        game.occupation = null;
        (game.unported ||= new Set()).add('set_occupation:timed_occupation');
        return;
    }
    game.occupation = fn;
    game.occtxt = txt;
    game.occtime = 0;
}

// src/allmain.c stop_occupation()
export async function stop_occupation() {
    if (game.occupation) {
        /* src/allmain.c:684 — maybe_finished_meal runs FIRST, and the
           "You stop <occtxt>." message only prints when it returns FALSE. */
        if (!await maybe_finished_meal(true))
            note_unported_main(`stop_occupation:message:${game.occtxt}`);
        game.occupation = null;
        game.occtxt = null;
        /* nomul(0) */
    }
    game.multi = 0;
}

import { rn2, rn1 } from './rng.js';
import { exerchk, change_luck, ACURR, near_capacity } from './attrib.js';
import { init_uhunger } from './eat.js';
import { settrack, initrack } from './track.js';
import { phase_of_the_moon, friday_13th } from './calendar.js';
import { ask_do_tutorial, set_playmode, optfn_playmode } from './options.js';
import { ROLE_GENDMASK, ROLE_MALE, ROLE_FEMALE, A_CURRENT, In_endgame,
         FULL_MOON, NEW_MOON, COLNO, A_CON, MOD_ENCUMBER,
         Upolyd } from './const.js';
import { mklev, l_nhcore_init, u_on_upstairs } from './mklev.js';
import { rhack, domove } from './cmd.js';
import { lookaround, end_running, unmul, nomul } from './hack.js';
import { deferred_goto } from './do.js';
import { You } from './pline.js';
import {
    docrt, cls, bot, flush_screen, pline, TOPLINE_EMPTY,
} from './display.js';
import { vision_recalc, vision_reset, init_vision_globals } from './vision.js';
import { init_objects } from './o_init.js';
import { init_dungeons } from './dungeon.js';
import { role_init, str2role, str2align, str2race, str2gend, roles, races,
         Hello, align_str } from './role.js';
import { aligns, genders } from './role_data.js';
import { reset_mvitals } from './makemon.js';
import { newhp, newpw } from './exper.js';
import { u_init_inventory, u_init_skills_discoveries } from './u_init.js';
import { makedog } from './dog.js';
import { init_attr, vary_init_attr, adjabil, Fast, Very_fast } from './attrib.js';
import { com_pager } from './questpgr.js';
import { player_selection, tty_init_nhwindows } from './plselect.js';
import { adjust_menu_promptstyle, ATR_INVERSE } from './tty/wintty.js';
import { NO_COLOR } from './terminal.js';

// src/allmain.c:698 init_sound_disp_gamewindows() — only the part that matters
// before character selection: creating WIN_INVEN pushes iflags.menu_headings
// into the tty's menu prompt style.
function init_sound_disp_gamewindows() {
    /* src/options.c:7188 — the default heading style */
    adjust_menu_promptstyle({ color: NO_COLOR, attr: ATR_INVERSE });
}

// include/you.h:441-442
const RIGHT_HANDED = 0x00, LEFT_HANDED = 0x01;
import { mcalcmove, mcalcdistress, movemon, NORMAL_SPEED } from './mon.js';
import { dosounds } from './sounds.js';
import { age_spells } from './spell.js';
import { gethungry } from './eat.js';
import { makemon, NO_MM_FLAGS } from './makemon.js';
import { depth } from './dungeon.js';
import { rnd } from './rng.js';
import { find_ac } from './do_wear.js';

// C ref: allmain.c newgame()
export async function newgame() {
    const g = game;

    // src/allmain.c — character selection runs BEFORE newgame(), driven by
    // the session's own keystrokes when the rc pins nothing. It draws only
    // through plsel_startmenu()'s rigid_role_checks(); see js/plselect.js.
    {
        // win/tty/wintty.c tty_init_nhwindows() — the banner, before anything.
        tty_init_nhwindows();
        // src/allmain.c:698 init_sound_disp_gamewindows(): unixmain.c runs it
        // BEFORE player_selection(), which is why the chargen menu titles are
        // already wearing iflags.menu_headings (ATR_INVERSE) rather than the
        // plain style tty_menu_promptstyle starts out with.
        init_sound_disp_gamewindows();
        const ir = str2role(g.rc?.opts?.role);
        const ira = str2race(g.rc?.opts?.race);
        const ig = str2gend(g.rc?.opts?.gender);
        /* parseoptions() files every spelling under the table's canonical
           name, and "align" is an alias of "alignment" (optlist.h:147) */
        const ia = str2align(g.rc?.opts?.alignment);
        g.flags.initrole = ir;
        g.flags.initrace = ira;
        g.flags.initgend = ig;
        g.flags.initalign = ia;
        if (ir < 0 || ira < 0 || ig < 0 || ia < 0)
            await player_selection();
    }

    /* src/options.c:3471 optfn_playmode() — the rc's playmode: option sets
       the wizard and discover globals. Both were being read and neither was
       ever assigned. */
    optfn_playmode();

    /* src/options.c set_playmode() — called from the port's startup code
       before the game proper. It renames the hero in wizard mode, so it has to
       run before anything prints plname. */
    set_playmode();

    // src/allmain.c:780 — seed mvitals from each species' G_NOCORPSE bit,
    // before init_objects(). propagate() and uncommon() both read this.
    reset_mvitals();

    // src/allmain.c newgame() -> src/o_init.c init_objects().
    // The first 199 PRNG calls of every game, now real rather than replayed.
    init_objects();

    // src/role.c role_init() — quest leader/nemesis fixups and the pantheon
    // choice. Draws for leader and nemesis gender when the monster has none
    // fixed, and spins randrole() when the role has no lawful god (Priest).
    // Runs after o_init and before the nhlib.lua align shuffle.
    {
        /* flags.init* are resolved above, either from the rc or by
           player_selection(). Fall back only when neither supplied one. */
        if (g.flags.initrole < 0) g.flags.initrole = 0;
        if (g.flags.initrace < 0) g.flags.initrace = 0;
        if (g.flags.initgend < 0) g.flags.initgend = 0;
        if (g.flags.initalign < 0) g.flags.initalign = 1;
        role_init(g.flags.initrole, g.flags.initalign);
    }

    // C ref: allmain.c l_nhcore_init() — shuffle align[] for Lua.
    // This is dat/nhlib.lua's `shuffle(align)`, which draws rn2(3), rn2(2)
    // through the math.random shim over nh.rn2.
    l_nhcore_init();

    // src/dungeon.c init_dungeons() — dungeon topology from dungeon.lua.
    // Builds g.dungeons, g.sp_levchn and g.branches for real; nothing may
    // overwrite them afterwards.
    init_dungeons();

    // src/u_init.c:996-997 — u.uhp = newhp(); u.uen = newpw();
    // newhp() draws nothing at level 0 because every role and race has
    // hpadv.inrnd == 0; newpw() draws rnd(enadv.inrnd) per role and race.
    {
        g.urole = roles[g.flags.initrole];
        /* src/role.c:2079 — a role with no gods of its own (the Priest)
           borrows the chosen pantheon's. role_init picked game.pantheon
           above; urole is the shared table record, so copy before writing. */
        if (!g.urole.lgod)
            g.urole = { ...g.urole,
                        lgod: roles[g.pantheon].lgod,
                        ngod: roles[g.pantheon].ngod,
                        cgod: roles[g.pantheon].cgod };
        g.urace = races[g.flags.initrace];
        g.u.ulevel = 0;
        /* C's `u` is a static struct, so u.ualign exists before newhp() writes
           into it at src/attrib.c:1091. */
        g.u.ualign = { type: 0, record: 0, abuse: 0 };
        g.u.uhp = g.u.uhpmax = newhp();
        g.u.uen = g.u.uenmax = newpw();

        // src/u_init.c:1000-1007 — u_init_misc() finishes by setting ulevel and
        // alignment, and it runs BEFORE mklev() (src/allmain.c:794 vs :807).
        // This is not cosmetic: rndmonst_adj()'s monmax_difficulty() is
        // (depth + u.ulevel) / 2, so leaving ulevel at 0 through level
        // generation halves the eligible monster set and changes how many
        // times rndmonst_adj() draws. adj_lev() reads it too.
        // src/u_init.c:991 — u.umonnum = u.umonster = urole.mnum. find_ac()
        // starts from mons[u.umonnum].ac, so a hero without it has no base AC.
        g.u.umonnum = g.u.umonster = g.urole.mnum;
        // src/mondata.c set_uasmon() — gy.youmonst.data = &mons[u.umonnum].
        // The hero-as-monster struct: combat code passes it to the same
        // functions that take a real monster (dmgval, mhitm_ad_phys,
        // could_seduce), which read .data and .mnum.
        g.youmonst = { data: g.mons[g.u.umonnum], mnum: g.u.umonnum };
        g.u.ulevel = g.u.ulevelmax = 1;
        /* type and record were filled by newhp() above, where C sets them. */
        // src/u_init.c:1006 — ualignbase[A_CURRENT] and [A_ORIGINAL] track the
        // alignment the hero started with; convert_arg()'s %d, %G and %a all
        // read [A_ORIGINAL], so the legacy text needs it.
        g.u.ualignbase = [g.u.ualign.type, g.u.ualign.type];
        g.u.uhave = {};

        // src/u_init.c:1028 — the last call u_init_misc() makes, and the last
        // thing js/fastforward.js was replaying before mklev(). ^X reports it
        // as "You are left-handed", so it is directly visible in a frame.
        g.u.uhandedness = rn2(10) ? RIGHT_HANDED : LEFT_HANDED;
    }


    // src/mklev.c:376 nhl_init() — mklev creates a SECOND Lua state for
    // themerooms, which loads dat/nhlib.lua again and so re-runs its
    // `shuffle(align)`. That is another rn2(3), rn2(2) in the stream, sitting
    // between u_init_misc and getbones.
    l_nhcore_init();

    // Set up remaining game state needed by mklev.
    // g.branches is NOT set here: init_dungeons() built the real branch list
    // above, and overwriting it would both discard that work and hardcode a
    // seed-specific topology.
    g.u = g.u || {};
    g.u.uz = { dnum: 0, dlevel: 1 };
    g.flags = g.flags || {};

    // Real mklev generates the level with correct room positions
    // Structural phase consumes RNG for rooms/corridors/doors/stairs
    await mklev();

    // Room filling and mineralize both run for real inside mklev() now, as
    // they do in C (src/mklev.c:1550 calls mineralize from
    // level_finalize_topology). Nothing is replayed between mklev and u_init.

    // src/allmain.c:808-816 — the order here is load-bearing: the hero is
    // placed, then the pet is made, and only then does u_init compute the
    // starting inventory. makedog() draws (pet_type plus a whole
    // collect_coords ring shuffle from enexto), so putting it on the wrong
    // side of u_init shifts everything after it.
    u_on_upstairs();

    makedog();

    // src/u_init.c:1374 — role inventory, race extras and starting gold.
    u_init_inventory();

    // src/u_init.c:1385 — attributes, straight after the inventory.
    init_attr(75);
    vary_init_attr();

    // src/u_init.c — the hero reaches experience level 1, which grants the
    // role's and race's level-1 intrinsics. Draws nothing itself, but Fast
    // makes u_calc_moveamt() draw every turn thereafter.
    await adjabil(0, 1);

    /* src/u_init.c:1002 — init_uhunger() sits between adjabil() and the spell
       book clear. exerper() consults uhunger every tenth move. */
    init_uhunger();
    /* src/u_init.c:1005 — "no prayers just yet" */
    g.u.ublesscnt = 300;

    // src/allmain.c:816-818 — docrt(); flush_screen(1); bot(); all run BEFORE
    // u_init_skills_discoveries() and the legacy pager, which is why the legacy
    // window is drawn over a map and a status line rather than a blank screen.
    init_vision_globals();
    vision_reset();
    vision_recalc(0);
    /* src/allmain.c:756 display_nhwindow(WIN_MESSAGE, FALSE) — the NON-blocking
       arm, which win/tty/wintty.c:1879 shows sets toplin back to TOPLINE_EMPTY.
       C clears the flag on a normal cycle and leaves it set only where it then
       blocks. Our pline() sets it and nothing cleared it, so after the first
       message of the game it stayed set forever. */
    g._toplin = TOPLINE_EMPTY;

    await cls();
    await docrt();
    await flush_screen(1);
    await bot();

    // src/allmain.c:824 — u_init_skills_discoveries(): the hero already knows
    // what came in their own pack. This is what fills the `\\` window.
    u_init_skills_discoveries();

    // src/allmain.c:831 — the legacy blurb. It draws because com_pager()
    // creates its own Lua state, and every Lua state costs nhlib.lua's
    // shuffle(align). `legacy` is opt_out (initval On), so it fires unless
    // the rc says `!legacy`.
    if (g.flags.legacy !== false)
        await com_pager(g.uroleplay?.pauper ? 'pauper_legacy' : 'legacy');

    // src/allmain.c:71-83 moveloop_preamble(), new-game branch. This was the
    // last thing js/fastforward.js replayed, and replaying it skipped the line
    // that matters most here:
    //
    //     svc.context.rndencode = rnd(9000);
    //     set_wear((struct obj *) 0);
    //     reset_justpicked(gi.invent);
    //     (void) pickup(1);
    //     svc.context.seer_turn = (long) rnd(30);
    //     u.umovement = NORMAL_SPEED;      <-- never happened while replayed
    //     initrack();
    //
    // Without the hero's initial movement points, moveloop_core's
    // hero-can't-move loop starts at -NORMAL_SPEED instead of 0 and runs its
    // new-turn block twice per command, advancing the turn counter twice.
    g.context.rndencode = rnd(9000);
    /* src/allmain.c:73 — a NEW game calls set_wear((struct obj *) 0) here,
       "for side-effects of starting gear", and nothing else. The
       read_engr_at() on line 87 is in the `if (resuming)` branch and only
       runs when RESTORING a save, so it is not on this path at all; an
       earlier comment here claimed pickup(1), which C does not call either.
       set_wear is 30 lines in src/do_wear.c but is a DISPATCHER, not a leaf:
       it calls Blindf_on, Ring_on, Amulet_on, Shirt_on, Armor_on, Cloak_on,
       Boots_on, Gloves_on, Helmet_on and Shield_on, and NONE of those ten
       exist in js/ yet. Porting it means porting whichever of them the
       starting gear actually triggers -- for most roles that is Armor_on
       plus one or two others, so the real unit is those functions rather
       than set_wear itself.

       tools/unported-hits.mjs has this reached by 100% of sessions, but the
       reach figure counts the CALL, not the work behind it. */
    set_wear(null);   /* for side-effects of starting gear */
    g.context.seer_turn = rnd(30);
    g.u.umovement = NORMAL_SPEED;

    // src/allmain.c:453 — moveloop_preamble() calls find_ac(). Until it does,
    // u.uac is still the 0 it was born with, which is why the status line under
    // the legacy window reads AC:0 even for a hero already wearing armour.
    find_ac();

    // Remaining hardcoded player state. u_init now computes the inventory,
    // gold, attributes, alignment and handedness for real; what is left is
    // the derived stats that need subsystems this port does not have.
    //
    // urole/urace used to be overwritten here with stub objects, and
    // u.ualign with { type: 0 } — which silently reset a chaotic hero to
    // neutral AFTER u_init had computed the right value. Both are gone; the
    // real records from js/role_data.js carry name, rank, noun, adj and the
    // attrmin/attrmax the ^X window needs.
    /* uhp/uen were hardcoded to 10 and 2 here, overwriting what newhp() and
       newpw() had already computed from the role and race hp tables a few
       dozen lines above. The status line reads them directly, so every
       session showed a Tourist's numbers. */
    g.u.uexp = 0;
    /* src/u_init.c:949 — flags.female comes from flags.initgend, the facet
       chargen actually settled on. Reading it back out of the rc option
       instead threw away a randomly picked gender: seed0004's player answers
       "y" to "shall I pick for you", pick_gend chooses female, and this line
       overwrote it with male because the rc names no gender. */
    g.flags.female = (g.flags.initgend === 1);
    g.plname = g.plname || 'Contestant';

    // src/allmain.c welcome() — the new-game branch. The alignment, the race
    // adjective and the role name were all hardcoded here ("neutral", "human",
    // and an unconditional "Aloha", which is the TOURIST greeting), so this
    // line was wrong in every session that was not a neutral human Tourist.
    //
    // The gender word is conditional: C prints it only when the role has no
    // separate female name AND allows both genders, so a Valkyrie or a
    // Priestess does not get one.
    {
        const currentgend = g.flags.female ? 1 : 0;
        let buf = ` ${align_str(g.u.ualignbase[A_CURRENT])}`;
        if (!g.urole.name.f
            && (g.urole.allow & ROLE_GENDMASK) === (ROLE_MALE | ROLE_FEMALE))
            buf += ` ${genders[currentgend].adj}`;
        buf += ` ${g.urace.adj} `
             + ((currentgend && g.urole.name.f) ? g.urole.name.f
                                                : g.urole.name.m);
        await pline(`${Hello(null)} ${g.plname}, welcome to NetHack! `
                    + ` You are a${buf}.`);
    }

    // src/allmain.c:56 moveloop_preamble() — "side-effects from the real
    // world", and they come BEFORE the new-game branch.
    //
    // Neither draws, but both can pline, and a pline at this point is what
    // pushes the greeting into needing a --More--: the greeting is 76 columns
    // and "--More--" is 8, so the tty wraps the prompt onto row 1 rather than
    // appending it. That is the whole difference on seed4500's first frame.
    //
    // The luck changes are real too: a full moon starts the hero at Luck 1 and
    // Friday the 13th at -1, which every later luck-sensitive roll reads.
    g.flags.moonphase = phase_of_the_moon();
    if (g.flags.moonphase === FULL_MOON) {
        await You('are lucky!  Full moon tonight.');
        change_luck(1);
    } else if (g.flags.moonphase === NEW_MOON) {
        await pline('Be careful!  New moon tonight.');
    }
    g.flags.friday13 = friday_13th();
    if (g.flags.friday13) {
        await pline('Watch out!  Bad things can happen on Friday the 13th.');
        change_luck(-1);
    }
}

// src/allmain.c:118 u_calc_moveamt()
//
// The only draw is the free-action roll, and it only happens for a hero with
// speed. Samurai and Monk have intrinsic Fast from experience level 1, so for
// them this fires every turn; a Tourist never reaches it.
function u_calc_moveamt() {
    let moveamt = 12;                 /* youmonst.data->mmove */

    if (Very_fast()) {
        if (rn2(3) !== 0) moveamt += 12;
    } else if (Fast()) {
        if (rn2(3) === 0) moveamt += 12;
    }
    /* the encumbrance switch scales moveamt but draws nothing */
    game.u.umovement = (game.u.umovement || 0) + moveamt;
    if (game.u.umovement < 0) game.u.umovement = 0;
}

// src/allmain.c:625 regen_hp() — the hero's per-turn heal check. The
// !Upolyd arm draws rn2(100) every turn the hero is below max HP, so the
// stream changes shape the moment the hero first takes damage. The Upolyd
// (u.mh) arm and the eel-out-of-water arm need polymorph state and are
// recorded.
async function regen_hp(wtcap) {
    let heal = 0;
    let reached_full = false;
    const encumbrance_ok = (wtcap < MOD_ENCUMBER || !game.u.umoved);
    const U_CAN_REGEN = () => !!(game.u.uprops?.REGENERATION
                                 || (game.u.uprops?.SLEEPY && game.u.usleep));

    if (Upolyd(game.u)) {
        note_unported_main('regen_hp:Upolyd');
    } else {
        if (game.u.uhp < game.u.uhpmax && (encumbrance_ok || U_CAN_REGEN())) {
            heal = (game.u.ulevel + ACURR(A_CON)) > rn2(100) ? 1 : 0;

            if (U_CAN_REGEN())
                heal += 1;
            if (game.u.uprops?.SLEEPY && game.u.usleep)
                heal++;

            if (heal) {
                (game.disp ||= {}).botl = true;
                game.u.uhp += heal;
                if (game.u.uhp > game.u.uhpmax)
                    game.u.uhp = game.u.uhpmax;
                /* stop voluntary multi-turn activity if now fully healed */
                reached_full = (game.u.uhp === game.u.uhpmax);
            }
        }
    }

    if (reached_full)
        await interrupt_multi('You are in full health.');
}

// src/allmain.c:976 interrupt_multi()
async function interrupt_multi(msg) {
    if (game.multi > 0 && !game.context?.travel && !game.context?.run) {
        nomul(0);
        if (game.flags?.verbose && msg)
            await pline(msg); /* Norep */
    }
}

// src/allmain.c:158 maybe_generate_rnd_mon()
function maybe_generate_rnd_mon() {
    const stronghold = game.special_levels?.stronghold_level;
    const deep = stronghold && depth(game.u.uz) > depth(stronghold);
    if (!rn2(game.u.uevent?.udemigod ? 25 : deep ? 50 : 70))
        makemon(null, 0, 0, NO_MM_FLAGS);
}

// C ref: allmain.c moveloop_core()
//
// The per-turn PRNG sequence, in C's order:
//
//   movemon()                      one distfleeck rn2(5) per waking monster
//   mcalcdistress()                nothing while no monster is afflicted
//   mcalcmove(mtmp, TRUE) x N      one rn2(12) per monster, unconditionally
//   maybe_generate_rnd_mon()       rn2(70) on an ordinary early level
//   dosounds()                     rn2(400) if fountains, rn2(300) if sinks
//   gethungry()                    rn2(20)
//   u_wipe_engr gate               rn2(40 + ACURR(A_DEX) * 3)
//
// The last one is a useful self-check: seed8000 records rn2(82), and 82 is
// 40 + 14 * 3, so it only comes out right if the hero's Dexterity does.
export async function moveloop_core() {
    const g = game;

    if (g.context?.move) {
        /* src/allmain.c:205 — actual time passed */
        g.u.umovement = (g.u.umovement || 0) - NORMAL_SPEED;

        do {                       /* src/allmain.c:207 hero-can't-move loop */
            let monscanmove;

            /* src/allmain.c:211 — monsters keep taking turns until none of
               them has movement left, or until the hero has banked enough to
               act. This inner loop is the whole reason a pet gets to move at
               all: movement is allotted below, so a single movemon() call per
               command would always find every monster still at zero. */
            do {
                monscanmove = await movemon();
                if (g.u.umovement >= NORMAL_SPEED)
                    break;         /* it's now your turn */
            } while (monscanmove);

            if (!monscanmove && g.u.umovement < NORMAL_SPEED) {
                /* src/allmain.c:222 — both hero and monsters are out of
                   steam this round, so set up a new turn */
                mcalcdistress();

                /* src/allmain.c:232 — reallocate movement rations */
                for (const mtmp of g.level?.monsters || [])
                    mtmp.movement = (mtmp.movement || 0) + mcalcmove(mtmp, true);

                /* src/allmain.c:238 — after allotment, so a new monster
                   effectively loses its first turn */
                maybe_generate_rnd_mon();

                u_calc_moveamt();
                /* src/allmain.c:242 — record the square the hero just left, so
                   a monster that cannot see the hero has a trail to follow. */
                settrack();

                /* src/allmain.c:244 svm.moves++. The counter starts at 1
                   (src/u_init.c:645), so plain increment; the old
                   `(g.moves || 1) + 1` only happened to agree because the
                   first increment landed on 2 either way. */
                g.moves++;

                /* src/allmain.c:275 — the prayer timeout ticks down every
                   turn (it sits beside nh_timeout in the same block). */
                if (g.u.ublesscnt)
                    g.u.ublesscnt--;

                /* src/allmain.c:287 — heal check. The guard matters for the
                   stream: a hero at full HP never reaches regen_hp(), so the
                   rn2(100) only starts once the hero has been hurt. */
                if (!g.u.uinvulnerable
                    && (!Upolyd(g.u) ? (g.u.uhp < g.u.uhpmax)
                                     : (g.u.mh < g.u.mhmax)))
                    await regen_hp(near_capacity());

                dosounds();
                gethungry();

                /* src/allmain.c:354 — age_spells() then exerchk(). exerchk
                   runs exerper(), which every tenth move exercises whichever
                   attribute the hunger and encumbrance state calls for, and
                   each of those spends an rn2(19). */
                age_spells();
                exerchk();

                /* src/allmain.c:360 */
                if (!rn2(40 + (g.u.acurr.a[3] * 3)))   /* A_DEX */
                    rnd(3);                             /* u_wipe_engr(rnd(3)) */

                /* src/allmain.c:380 — when immobile, count is in turns */
                if ((g.multi ?? 0) < 0) {
                    if (++g.multi === 0) { /* finished yet? */
                        await unmul(null);
                    }
                }
            }
        } while (g.u.umovement < NORMAL_SPEED);

        /* src/allmain.c:409 — INSIDE the context.move gate: the vicinity
           counter only advances on cores where time actually passed, which
           is why C's first rn2(31) waits for the first time-taking command
           even when the preamble's rnd(30) rolled 1 (seed2200). */
        if (g.moves >= g.context.seer_turn) {
            if ((g.u.uhave?.amulet || g.u.uprops?.CLAIRVOYANT)
                && !In_endgame(g.u.uz)
                && !g.u.uprops?.BLOCKED_CLAIRVOYANT)
                note_unported_main('do_vicinity_map');
            /* we maintain this counter even when clairvoyance isn't
               taking place; on average, go again 30 turns from now */
            g.context.seer_turn = g.moves + rn1(31, 15); /*15..45*/
        }

        /* the move flag is CONSUMED by the turn block above. C's blocking
           input reads a whole command before control returns here, so the
           flag's lifetime is one command -> one turn. Our prompts suspend
           mid-command; without this clear, the next core call re-reads the
           stale flag and burns a phantom turn before the prompt resumes. */
        g.context.move = 0;
    }

    /* C bumps hero_seq inside the move gate (moves*8 + n); this port's
       counter ticks every core because use_stethoscope's first-use-free
       test was calibrated against that frame (see STATUS). */
    g.hero_seq = (g.hero_seq || 0) + 1;

    // Vision + display
    if (g.vision_full_recalc) {
        vision_recalc(0);
        g.vision_full_recalc = 0;
    }
    await bot();
    await flush_screen(1);

    /* src/allmain.c:485 — an active occupation CONSUMES the turn instead of
       reading a command. It runs once per turn until it returns 0, and a
       nearby monster stops it early.
     *
     *     if (gm.multi >= 0 && go.occupation) {
     *         if ((*go.occupation)() == 0) go.occupation = 0;
     *         if (monster_nearby()) stop_occupation();
     *     }
     *
     * monster_nearby() needs the interrupt checks; without it an occupation
     * runs to completion where C would break it off, so it records. */
    /* a helpless hero (multi < 0) takes no command; the turn machinery above
       advanced the count, and context.move stays set so the next core call
       burns the next helpless turn, exactly like an occupation. */
    if ((g.multi ?? 0) < 0) {
        g.context.move = 1;
        return;
    }

    if ((g.multi ?? 0) >= 0 && g.occupation) {
        if ((await g.occupation()) === 0)
            g.occupation = null;
        note_unported_main('moveloop:monster_nearby');
        g.context.move = 1;             /* the occupation took this turn */
        return;
    }

    /* src/allmain.c:515 — the run/rush loop. While multi is positive the hero
       keeps moving WITHOUT reading another key, which is what makes one
       'g'+direction cover several squares instead of one.
     *
     *     if (gm.multi > 0) {
     *         lookaround();
     *         if (!gm.multi) { svc.context.move = 0; return; }
     *         if (svc.context.mv) {
     *             if (gm.multi < COLNO && !--gm.multi) end_running(TRUE);
     *             domove();
     *         } else { --gm.multi; rhack(gc.cmd_key); }
     *     }
     *
     * lookaround() ends a run by calling nomul(0), which zeroes multi -- hence
     * the !multi test immediately after. It is NOT the only exit: domove calls
     * nomul(0) when bumping a monster, when blocked, and when stepping onto a
     * door, and in an open room those are the only things that stop it. */
    if ((g.multi ?? 0) > 0) {
        await lookaround();
        if (!g.multi) {
            /* lookaround may clear multi */
            g.context.move = 0;
            return;
        }
        if (g.context.mv) {
            if (g.multi < COLNO && !--g.multi)
                end_running(true);
            /* In C the flag is still TRUE here from parse()'s assume-time and
               nothing cleared it during the run; our consume-clear above wiped
               it, so re-assert before domove (whose blocked exit clears it). */
            g.context.move = 1;
            await domove();
        } else {
            --g.multi;
            /* rhack(gc.cmd_key) — repeat the remembered command without
               reading a key. parse() does not run for repeats, so no count
               collection and no topline clear happen here. */
            await rhack(g.cmd_key ? g.cmd_key.charCodeAt(0) : 0);
        }
        return;
    }

    // Read and execute one command. The frame captured inside nhgetch shows
    // the message produced by the PREVIOUS command, which is why the message
    // must not be cleared here — rhack() clears it after reading the key and
    // before dispatching, so each message survives exactly until the frame
    // that displays it has been captured.
    await rhack(0);

    /* src/allmain.c:538 — a command that scheduled a level change takes it
       here, AFTER rhack() returns, not inside the command itself. */
    if (g.u.utotype)
        await deferred_goto();
}

// C ref: allmain.c moveloop()
export async function moveloop(resuming) {
    vision_recalc(0);
    await docrt();
    await flush_screen(1);

    /* src/allmain.c moveloop() — three lines in C, and this is the middle one.
       NetHack 5.0 asks every new game whether the player wants the tutorial
       unless the config settled it; 32 of the 44 public sessions never mention
       `tutorial` in their rc, so they all see the menu and spend a keystroke on
       it. Answering yes then builds the tut-1 level. */
    if (!resuming)
        await maybe_do_tutorial();

    for (;;) {
        await moveloop_core();
        if (game.program_state?.gameover) break;
    }
}

function note_unported_main(what) {
    (game.unported ||= new Set()).add(what);
}

// src/allmain.c maybe_do_tutorial()
export async function maybe_do_tutorial() {
    if (await ask_do_tutorial()) {
        /* schedule_goto(tut-1) + deferred_goto() builds the tutorial level.
           Not ported: the special-level loader for tut-1, and goto_level's
           save/restore of the level being left. */
        note_unported_main('tutorial level (tut-1)');
    }
}
