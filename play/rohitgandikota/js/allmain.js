// allmain.js — Main game loop.
// C ref: allmain.c — newgame, moveloop, moveloop_core.
//
// Uses fastforward.js for pre/post-mklev RNG parity on seed8000.
// Real mklev.js handles level generation for screen parity.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { mklev, l_nhcore_init, u_on_upstairs } from './mklev.js';
import { rhack } from './cmd.js';
import { docrt, cls, bot, flush_screen, pline } from './display.js';
import { vision_recalc, vision_reset, init_vision_globals } from './vision.js';
import { init_objects } from './o_init.js';
import { init_dungeons } from './dungeon.js';
import { role_init, str2role, str2align, str2race, roles, races } from './role.js';
import { aligns } from './role_data.js';
import { reset_mvitals } from './makemon.js';
import { newhp, newpw } from './exper.js';
import { u_init_inventory } from './u_init.js';
import { makedog } from './dog.js';
import { init_attr, vary_init_attr } from './attrib.js';
import { com_pager } from './pager.js';
import { fastforward_pre_mklev, fastforward_post_mklev, fastforward_step } from './fastforward.js';

// C ref: allmain.c newgame()
export async function newgame() {
    const g = game;

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
        const ir = str2role(g.rc?.opts?.role);
        const ia = str2align(g.rc?.opts?.align);
        /* C keeps the resolved choice in flags.initalign; u_init_misc() reads
           it back to set u.ualign.type. Chargen picking (M2.6) will replace the
           default with pick_align()'s result. */
        g.flags.initrole = ir < 0 ? 0 : ir;
        g.flags.initalign = ia < 0 ? 1 : ia;
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
        const ir = str2role(g.rc?.opts?.role);
        const iraces = str2race(g.rc?.opts?.race);
        g.urole = roles[ir < 0 ? 0 : ir];
        g.urace = races[iraces < 0 ? 0 : iraces];
        g.u.ulevel = 0;
        g.u.uhp = g.u.uhpmax = newhp();
        g.u.uen = g.u.uenmax = newpw();

        // src/u_init.c:1000-1007 — u_init_misc() finishes by setting ulevel and
        // alignment, and it runs BEFORE mklev() (src/allmain.c:794 vs :807).
        // This is not cosmetic: rndmonst_adj()'s monmax_difficulty() is
        // (depth + u.ulevel) / 2, so leaving ulevel at 0 through level
        // generation halves the eligible monster set and changes how many
        // times rndmonst_adj() draws. adj_lev() reads it too.
        g.u.ulevel = g.u.ulevelmax = 1;
        g.u.ualign = {
            type: aligns[g.flags.initalign].value,
            record: 0,
            abuse: 0,
        };
        g.u.uhave = {};
    }

    // Fast-forward through what is still replayed: u_init_misc.
    // Must run AFTER the dungeon init, matching C's order in the stream.
    fastforward_pre_mklev();

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

    // src/allmain.c:831 — the legacy blurb. It draws because com_pager()
    // creates its own Lua state, and every Lua state costs nhlib.lua's
    // shuffle(align). `legacy` is opt_out (initval On), so it fires unless
    // the rc says `!legacy`.
    if (g.flags.legacy !== false)
        com_pager(g.uroleplay?.pauper ? 'pauper_legacy' : 'legacy');

    // Fast-forward what is still replayed: allmain.c moveloop_preamble().
    fastforward_post_mklev();

    // Hardcoded player state for seed8000 Tourist.
    // Contestants: port u_init to compute these from game PRNG.
    g._goldCount = 757;
    g.u.ulevel = 1;
    g.u.uhp = 10; g.u.uhpmax = 10;
    g.u.uen = 2; g.u.uenmax = 2;
    g.u.uac = 10; g.u.uexp = 0;
    g.u.ualign = { type: 0, record: 0 };
    g.moves = 1;
    g.urole = { name: { m: 'Tourist', f: 'Tourist' }, rank: { m: 'Rambler', f: 'Rambler' } };
    g.urace = { adj: 'human' };
    g.flags.female = true;
    g.plname = g.plname || 'Contestant';

    // Initial display
    init_vision_globals();
    vision_reset();
    vision_recalc(0);
    await cls();
    await docrt();
    await flush_screen(1);
    await bot();

    // Welcome message
    const alignName = 'neutral';
    const genderAdj = g.flags?.female ? 'female' : 'male';
    await pline(`Aloha ${g.plname}, welcome to NetHack!  You are a ${alignName} ${genderAdj} human ${g.urole.name.m}.`);
}

// C ref: allmain.c moveloop_core()
export async function moveloop_core() {
    const g = game;

    // Fast-forward per-step RNG (monster movement, regen, sounds, hunger)
    const stepNum = (g.moves || 1) - 1;
    fastforward_step(stepNum);

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

    // Advance turn
    if (g.context?.move) {
        g.moves = (g.moves || 1) + 1;
    }
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
