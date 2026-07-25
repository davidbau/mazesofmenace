// allmain.js — Main game loop.
// C ref: allmain.c — newgame, moveloop, moveloop_core.
//
// Real mklev.js handles level generation for screen parity.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { ROLE_GENDMASK, ROLE_MALE, ROLE_FEMALE, A_CURRENT } from './const.js';
import { mklev, l_nhcore_init, u_on_upstairs } from './mklev.js';
import { rhack } from './cmd.js';
import { docrt, cls, bot, flush_screen, pline } from './display.js';
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
        const ia = str2align(g.rc?.opts?.align);
        g.flags.initrole = ir;
        g.flags.initrace = ira;
        g.flags.initgend = ig;
        g.flags.initalign = ia;
        if (ir < 0 || ira < 0 || ig < 0 || ia < 0)
            await player_selection();
    }

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
    adjabil(0, 1);

    // src/allmain.c:816-818 — docrt(); flush_screen(1); bot(); all run BEFORE
    // u_init_skills_discoveries() and the legacy pager, which is why the legacy
    // window is drawn over a map and a status line rather than a blank screen.
    init_vision_globals();
    vision_reset();
    vision_recalc(0);
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
    /* set_wear() and pickup(1) draw only when there is something to wear or
       pick up at the starting square; neither is ported. */
    note_unported_main('moveloop_preamble set_wear/pickup');
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
    g._goldCount = g.u.umoney0;
    /* uhp/uen were hardcoded to 10 and 2 here, overwriting what newhp() and
       newpw() had already computed from the role and race hp tables a few
       dozen lines above. The status line reads them directly, so every
       session showed a Tourist's numbers. */
    g.u.uexp = 0;
    g.flags.female = (str2gend(g.rc?.opts?.gender) === 1);
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
                monscanmove = movemon();
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

                g.moves = (g.moves || 1) + 1;

                dosounds();
                gethungry();

                /* src/allmain.c:360 */
                if (!rn2(40 + (g.u.acurr.a[3] * 3)))   /* A_DEX */
                    rnd(3);                             /* u_wipe_engr(rnd(3)) */
            }
        } while (g.u.umovement < NORMAL_SPEED);
    }

    // Vision + display
    if (g.vision_full_recalc) {
        vision_recalc(0);
        g.vision_full_recalc = 0;
    }
    await bot();
    await flush_screen(1);

    // Read and execute one command. The frame captured inside nhgetch shows
    // the message produced by the PREVIOUS command, which is why the message
    // must not be cleared here — rhack() clears it after reading the key and
    // before dispatching, so each message survives exactly until the frame
    // that displays it has been captured.
    await rhack(0);
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

function note_unported_main(what) {
    (game.unported ||= new Set()).add(what);
}
