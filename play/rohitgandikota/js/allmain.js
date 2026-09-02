// allmain.js — Main game loop.
// C ref: allmain.c — newgame, moveloop, moveloop_core.
//
// Real mklev.js handles level generation for screen parity.

import { VANQ_MLVL_MNDX } from './const.js';
import { POLY_NOFLAGS } from './const.js';
import { set_uasmon } from './polyself.js';
import { do_vicinity_map } from './detect.js';
import { game } from './gstate.js';
import { glibr, set_wear } from './do_wear.js';
import { maybe_finished_meal } from './eat.js';

// src/allmain.c set_occupation() / stop_occupation() — the multi-turn action
// slot. moveloop_core calls go.occupation once per turn until it returns 0.
//
// Nothing here draws. The mechanism is what makes eating a food with
// oc_delay > 1 span several turns, and it is the same `gm.multi >= 0` gate the
// run loop uses, so porting it unblocks both.
export function set_occupation(fn, txt, xtime) {
    if (xtime) {
        /* src/cmd.c:172 timed_occupation() — wraps fn and counts down
           gm.multi; a counted command with f_text ("20s") repeats through
           the occupation slot so monster_nearby() can interrupt it with
           "You stop searching." */
        game._timed_occ_fn = fn;
        game.occupation = async function timed_occupation() {
            await game._timed_occ_fn();
            if (game.multi > 0)
                game.multi--;
            return game.multi > 0 ? 1 : 0;
        };
    } else {
        game.occupation = fn;
    }
    game.occtxt = txt;
    game.occtime = 0;
}

// src/allmain.c:684 stop_occupation()
export async function stop_occupation() {
    if (game.occupation) {
        /* maybe_finished_meal runs FIRST, and the "You stop <occtxt>."
           message only prints when it returns FALSE. */
        if (!await maybe_finished_meal(true)) {
            const { You } = await import('./pline.js');
            await You(`stop ${game.occtxt}.`);
        }
        game.occupation = null;
        game.occtxt = null;
        (game.disp ||= {}).botl = true; /* in case u.uhs changed */
    }
    /* nomul(0) preserves a negative multi value.  That matters when a
       monster attacks while the hero is dressing or disrobing: the attack
       stops an occupation, but it must not cancel the separate afternmv
       countdown. */
    nomul(0);
}

import { rn2, rn1 } from './rng.js';
import { encumber_msg, exerchk, change_luck, ACURR,
         near_capacity } from './attrib.js';
import { init_uhunger } from './eat.js';
import { settrack, initrack } from './track.js';
import { phase_of_the_moon, friday_13th, night } from './calendar.js';
import { ask_do_tutorial, set_playmode, optfn_playmode } from './options.js';
import { ROLE_GENDMASK, ROLE_MALE, ROLE_FEMALE, A_CURRENT, In_endgame,
         FULL_MOON, NEW_MOON, COLNO, A_CON, A_WIS, A_INT, MOD_ENCUMBER,
         UNENCUMBERED, SLT_ENCUMBER, HVY_ENCUMBER, EXT_ENCUMBER, A_DEX,
         Upolyd, Is_waterlevel, Is_airlevel, FROMFORM, TT_LAVA, NON_PM }
         from './const.js';
import { mklev, l_nhcore_init, u_on_upstairs } from './mklev.js';
import { rhack, domove } from './cmd.js';
import { lookaround, end_running, unmul, nomul,
         monster_nearby, in_rooms } from './hack.js';
import { deferred_goto } from './do.js';
import { You } from './pline.js';
import {
    docrt, cls, bot, flush_screen, pline, see_monsters, see_objects,
    see_traps, swallowed, newsym,
    TOPLINE_EMPTY,
} from './display.js';
import { Glib, Hallucination, Teleportation, Underwater } from './youprop.js';
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
import { player_selection, plnamesuffix, tty_init_nhwindows } from './plselect.js';
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
import { mcalcmove, mcalcdistress, movemon, NORMAL_SPEED, is_pool } from './mon.js';
import { breathless } from './mondata.js';
import { MONSYMS } from './monst_data.js';
import { m_everyturn_effect } from './monmove.js';
import { u_wipe_engr } from './engrave.js';
import { dosounds } from './sounds.js';
import { dosearch0 } from './detect.js';
import { run_regions } from './region.js';
import { nh_timeout, do_storms } from './timeout.js';
import { age_spells } from './spell.js';
import { gethungry } from './eat.js';
import { makemon, NO_MM_FLAGS } from './makemon.js';
import { depth } from './dungeon.js';
import { rnd } from './rng.js';
import { find_ac } from './do_wear.js';
import { clear_splitobjs } from './mkobj.js';
import { pickup } from './pickup.js';

// src/allmain.c moveloop_preamble(). unixmain calls this after newgame() has
// printed welcome and wd_message() has reported explore mode. That ordering
// is visible when pickup(1) finds an engraving on the initial square: the
// welcome line is the one waiting at --More--, then the engraving is shown.
export async function newgame_moveloop_preamble(resuming = false) {
    const g = game;

    /* side-effects from the real world */
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

    if (!resuming) {
        g.context.rndencode = rnd(9000);
        set_wear(null);
        for (const obj of (g.invent || []))
            obj.pickup_prev = 0;
        await pickup(1);
        g.context.seer_turn = rnd(30);
        g.u.umovement = NORMAL_SPEED;
        initrack();
    }
}

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

        /* sys/unix/unixmain.c:193 — "wizard mode access is deferred until
           here": set_playmode() renames the hero to "wizard" BEFORE the name
           is examined, so a debug-mode session never prompts for one.
           (src/options.c:3471 optfn_playmode() reads the rc's playmode:
           option into the wizard/discover globals first.) */
        optfn_playmode();
        set_playmode();

        /* sys/unix/unixmain.c:198 — plnamesuffix() calls askname() when
           plname[] is empty. Independent of role selection: a session that
           pins all four facets but no name still types its name at the
           "Who are you?" screen, which is where its first recorded frames
           come from. It can also fill flags.init* from a -role-race suffix,
           so the menu gate below rereads the flags. */
        await plnamesuffix();

        if (g.flags.initrole < 0 || g.flags.initrace < 0
            || g.flags.initgend < 0 || g.flags.initalign < 0)
            await player_selection();
    }

    /* sys/unix/unixmain.c — after the name is final, try to restore a
       saved game. A successful recover reinstalls the whole game state;
       the only draws are nhlib.lua's align shuffle from the fresh Lua
       core, and play continues where the save left off. */
    {
        const { dorecover } = await import('./save.js');
        if (dorecover()) {
            l_nhcore_init();
            await docrt();
            /* src/allmain.c:914 welcome(FALSE) — align and gender words
               appear only when changed since chargen; neither can change
               yet, so the greeting is race + role. */
            {
                const currentgend = g.flags.female ? 1 : 0;
                const role_name = (currentgend && g.urole.name.f)
                    ? g.urole.name.f : g.urole.name.m;
                await pline(`${Hello(null)} ${g.plname}, the ${g.urace.adj} `
                            + `${role_name}, welcome back to NetHack!`);
            }
            return true;
        }
    }

    game.context.ident = 2;  /* id 1 is reserved for gy.youmonst */
    game.context.warnlevel = 1;
    game.context.next_attrib_check = 600;

    /* src/allmain.c:776 — "turn on 3.6 tributes". stock_room's
       specialspot = rnd(stockcount) draw for the novel is gated on this,
       so it is load-bearing for every level with a bookstore-eligible
       shop. */
    game.context.tribute = { enabled: true, bookstock: false };

    /* js/hack.js publishes in_rooms on the game object for js/monmove.js
       (a cycle-breaking seam), but resetGame() REPLACES the game object at
       the start of every segment, so the module-load assignment only ever
       reached the first object. Republish on the live one. */
    game.in_rooms = in_rooms;

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
        // src/u_init.c:992. A zero-initialized value would name a real monster.
        g.u.ulycn = NON_PM;
        /* src/decl.c go.oldcap — zero-initialised; encumber_msg() compares
           against it and undefined breaks the first transition message. */
        g.oldcap = 0;
        /* src/decl.c u.uluck/u.moreluck — zero-initialised; change_luck()
           adds to them, and the moon/friday13 start bonuses go through it,
           so undefined turns the whole luck system into NaN. */
        g.u.uluck = 0;
        g.u.moreluck = 0;
        // src/mondata.c set_uasmon() — gy.youmonst.data = &mons[u.umonnum].
        // The hero-as-monster struct: combat code passes it to the same
        // functions that take a real monster (dmgval, mhitm_ad_phys,
        // could_seduce), which read .data and .mnum.
        g.youmonst = { data: g.mons[g.u.umonnum], mnum: g.u.umonnum };
        // src/u_init.c:993 set_uasmon()
        set_uasmon();
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
    /* src/u_init.c:979/984 + src/allmain.c:97 — u.uz0 starts on the same
       level; onquest()'s Not_firsttime reads it. */
    g.u.uz0 = { dnum: 0, dlevel: 1 };
    g.flags = g.flags || {};
    // src/options.c:3967 initoptions: flags.vanq_sortmode = VANQ_MLVL_MNDX
    g.flags.vanq_sortmode ??= VANQ_MLVL_MNDX;

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
    game._newsym_ref = newsym;
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
    /* src/u_init.c:1413 computes initial AC here. The first bot() above has
       already drawn the legacy window's underlying AC:0 status, but later
       startup paging and the first command use this real value. */
    find_ac();

    // src/allmain.c:831 — the legacy blurb. It draws because com_pager()
    // creates its own Lua state, and every Lua state costs nhlib.lua's
    // shuffle(align). `legacy` is opt_out (initval On), so it fires unless
    // the rc says `!legacy`.
    if (g.flags.legacy !== false)
        await com_pager(g.u.uroleplay?.pauper ? 'pauper_legacy' : 'legacy');

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
        /* src/allmain.c:920 — guarantee the 'major' log is never empty */
        const { livelog_add } = await import('./pline.js');
        livelog_add(`${g.plname} the${buf} entered the dungeon`);
    }

    return false;
}

// src/allmain.c:118 u_calc_moveamt()
//
// The draw is the free-action roll (Samurai and Monk have intrinsic Fast
// from level 1). The encumbrance switch draws nothing but is LOAD-BEARING
// for turn structure: a Burdened hero gets 12 - 12/4 = 9 movement, so
// roughly every fourth keystroke the outer moveloop runs a SECOND full
// turn cycle before the hero can act, and every monster with banked
// movement gets an extra action between two hero commands. Omitting it
// collapsed those double cycles and reordered the whole monster
// interleave for encumbered heroes.
function u_calc_moveamt(wtcap) {
    let moveamt = 0;

    if (game.u.usteed && game.u.umoved) {
        /* your speed doesn't augment steed's speed */
        moveamt = mcalcmove(game.u.usteed, true);
    } else {
        moveamt = game.youmonst.data.mmove;

        if (Very_fast()) {            /* speed boots, potion, or spell */
            if (rn2(3) !== 0) moveamt += NORMAL_SPEED;
        } else if (Fast()) {          /* intrinsic */
            if (rn2(3) === 0) moveamt += NORMAL_SPEED;
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

    game.u.umovement = (game.u.umovement || 0) + moveamt;
    if (game.u.umovement < 0) game.u.umovement = 0;
}

// src/allmain.c:599 regen_pw() — maybe regenerate some magical energy.
// The rn1(upper, 1) draws only when uen is below max and the level-scaled
// move gate passes, so the stream changes shape once the hero first loses
// Pw (an anti-magic field, casting).
async function regen_pw(wtcap) {
    const u = game.u;
    const MAXULEV = 30;
    const wizard_role = game.urole?.mnum === 'PM_WIZARD'
                        || game.urole?.name?.m === 'Wizard';
    if (u.uen < u.uenmax
        && ((wtcap < MOD_ENCUMBER
             && (!(game.moves % Math.trunc((MAXULEV + 8 - u.ulevel)
                                           * (wizard_role ? 3 : 4) / 6))))
            || u.uprops?.ENERGY_REGENERATION)) {
        let upper = Math.trunc((ACURR(A_WIS) + ACURR(A_INT)) / 15) + 1;

        /* EMagical_breathing: amulet of magical breathing worn — absent */

        u.uen += rn1(upper, 1);
        if (u.uen > u.uenmax)
            u.uen = u.uenmax;
        (game.disp ||= {}).botl = true;
        if (u.uen === u.uenmax)
            await interrupt_multi('You feel full of energy.');
    }
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
    const U_CAN_REGEN = () => !!(game.u.intrinsic?.HRegeneration
                                 || game.u.uprops?.REGENERATION
                                 || (game.u.uprops?.SLEEPY && game.u.usleep));

    if (Upolyd(game.u)) {
        if (game.u.mh < 1) {
            const { rehumanize } = await import('./polyself.js');
            await rehumanize();
        } else if (game.youmonst.data.mlet === MONSYMS.S_EEL
                   && !is_pool(game.u.ux, game.u.uy)
                   && !Is_waterlevel(game.u.uz)
                   && !game.u.uprops?.MAGICAL_BREATHING
                   && !breathless(game.youmonst.data)) {
            if (game.u.mh > 1 && !U_CAN_REGEN()
                && rn2(game.u.mh) > rn2(8)
                && (!game.u.uprops?.HALF_PHDAM || !(game.moves % 2)))
                heal = -1;
        } else if (game.u.mh < game.u.mhmax
                   && (U_CAN_REGEN()
                       || (encumbrance_ok && !(game.moves % 20)))) {
            heal = 1;
        }
        if (heal) {
            (game.disp ||= {}).botl = true;
            game.u.mh += heal;
            reached_full = (game.u.mh === game.u.mhmax);
        }
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

    /* src/end.c nh_terminate(): after really_done the process has exited;
       a replayed segment's remaining keys reach a dead terminal and are
       swallowed without any game reaction. */
    if (g.program_state_gameover) {
        const { nhgetch } = await import('./input.js');
        await nhgetch();
        return;
    }

    /* src/cmd.c parse()/rhack() consume a prefix and its following key in
       one command dispatch. The replay harness supplies one key at a time,
       so continue a pending g/G/m/F prefix before returning to moveloop's
       per-input hallucination redraw, status, and hero-form effects. */
    if (g._cmd_prefix_pending) {
        await rhack(0);
        if (g.u.utotype)
            await deferred_goto();
        return;
    }

    if (g.context?.move) {
        /* src/allmain.c:205 — actual time passed */
        g.u.umovement = (g.u.umovement || 0) - NORMAL_SPEED;

        do {                       /* src/allmain.c:207 hero-can't-move loop */
            let monscanmove;

            await encumber_msg();

            /* src/allmain.c:211 — monsters keep taking turns until none of
               them has movement left, or until the hero has banked enough to
               act. This inner loop is the whole reason a pet gets to move at
               all: movement is allotted below, so a single movemon() call per
               command would always find every monster still at zero. */
            g.context.mon_moving = true;
            do {
                monscanmove = await movemon();
                if (g.u.umovement >= NORMAL_SPEED)
                    break;         /* it's now your turn */
            } while (monscanmove);
            g.context.mon_moving = false;

            /* src/allmain.c:219. Capture burden after monster actions, even
               when the hero already has enough movement to act. The saved
               value is used by the next movement grant. A monster can force
               rehumanization here, changing carrying capacity between the
               action and that later grant. */
            g.mvl_wtcap = near_capacity();

            if (!monscanmove && g.u.umovement < NORMAL_SPEED) {
                /* src/allmain.c:222 — both hero and monsters are out of
                   steam this round, so set up a new turn */
                g.were_changes = 0;
                await mcalcdistress();

                /* src/allmain.c:232 — reallocate movement rations */
                for (const mtmp of g.level?.monsters || []) {
                    mtmp.movement = (mtmp.movement || 0) + mcalcmove(mtmp, true);
                    if (globalThis.__dog_trace && g.moves >= 344 && g.moves <= 362)
                        console.error(`GRANT t=${g.moves} m${mtmp.mnum} -> ${mtmp.movement} hero=${g.u.umovement}`);
                }

                /* src/allmain.c:238 — after allotment, so a new monster
                   effectively loses its first turn */
                maybe_generate_rnd_mon();

                u_calc_moveamt(g.mvl_wtcap);
                /* src/allmain.c:242 — record the square the hero just left, so
                   a monster that cannot see the hero has a trail to follow. */
                settrack();

                /* src/allmain.c:244 svm.moves++. The counter starts at 1
                   (src/u_init.c:645), so plain increment; the old
                   `(g.moves || 1) + 1` only happened to agree because the
                   first increment landed on 2 either way. */
                g.moves++;
                /* allmain.c:260: begin this turn's hero movement sequence. */
                g.hero_seq = g.moves * 8;

                /* src/allmain.c:271: slippery fingers act before property
                   timeouts, so the last turn of Glib can still drop gear. */
                if (Glib())
                    await glibr();
                /* src/allmain.c:275 — nh_timeout() then the prayer
                   timeout, every turn. */
                await nh_timeout();
                await run_regions(); /* src/allmain.c:274 */
                if (g.u.ublesscnt)
                    g.u.ublesscnt--;

                /* src/allmain.c:287 — heal check. The guard matters for the
                   stream: a hero at full HP never reaches regen_hp(), so the
                   rn2(100) only starts once the hero has been hurt. */
                if (!g.u.uinvulnerable
                    && (!Upolyd(g.u) ? (g.u.uhp < g.u.uhpmax)
                                     : (g.u.mh < g.u.mhmax
                                        || g.youmonst.data.mlet === MONSYMS.S_EEL)))
                    await regen_hp(near_capacity());

                /* src/allmain.c:298 — overexert_hp when heavily encumbered
                   and moving; no session gets that loaded yet */

                /* src/allmain.c:305 — regen_pw runs unconditionally */
                await regen_pw(near_capacity());

                /* src/allmain.c:307: innate or equipped teleportation can
                   fire once per turn.  Form-derived teleportation lives in
                   HTeleportation's FROMFORM bit, so reading the shared macro
                   is required for nymph and tengu forms too. */
                if (!g.u.uinvulnerable && Teleportation() && !rn2(85)) {
                    const oldUx = g.u.ux, oldUy = g.u.uy;
                    const { tele } = await import('./teleport.js');
                    await tele();
                    if (g.u.ux !== oldUx || g.u.uy !== oldUy) {
                        const { next_to_u } = await import('./apply.js');
                        if (!await next_to_u())
                            (g.unported ||= new Set()).add('check_leash');
                        const { cmdq_clear } = await import('./cmd.js');
                        const { CQ_CANNED, CQ_REPEAT } = await import('./const.js');
                        cmdq_clear(CQ_CANNED);
                        cmdq_clear(CQ_REPEAT);
                    }
                }

                /* src/allmain.c:318. A lycanthropic hero makes this roll on
                   every new turn while in base form, even when an adjacent
                   monster will prevent the resulting change. */
                if (!g.u.uinvulnerable) {
                    const polymorph = !!(g.u.intrinsic?.HPolymorph
                                         || g.u.uprops?.POLYMORPH);
                    if ((g.mvl_change === 1 && !polymorph)
                        || (g.mvl_change === 2 && g.u.ulycn === NON_PM))
                        g.mvl_change = 0;
                    if (polymorph && !rn2(100)) {
                        g.mvl_change = 1;
                    } else if (g.u.ulycn !== NON_PM && !Upolyd(g.u)
                               && !rn2(80 - 20 * night())) {
                        g.mvl_change = 2;
                    }
                    const unchanging = !!(g.u.intrinsic?.HUnchanging
                                          || g.u.uprops?.UNCHANGING);
                    if (g.mvl_change && !unchanging && (g.multi ?? 0) >= 0) {
                        await stop_occupation();
                        if (g.mvl_change === 1) {
                            const { polyself } = await import('./polyself.js');
                            await polyself(POLY_NOFLAGS);
                        } else {
                            const { you_were } = await import('./were.js');
                            await you_were();
                        }
                        g.mvl_change = 0;
                    }
                }

                /* src/allmain.c:342 — intrinsic Searching autosearches
                   every turn (Archeologists have it from level 1) */
                if ((g.u.intrinsic?.HSearching || g.u.uprops?.SEARCHING)
                    && !g.level?.flags?.noautosearch && (g.multi ?? 0) >= 0)
                    await dosearch0(1);

                if (g.were_changes) {
                    const { set_ulycn } = await import('./were.js');
                    set_ulycn(g.u.ulycn);
                }

                await dosounds();
                /* src/allmain.c:353 do_storms() — draws only on a stormy
                   level (the Plane of Air) */
                await do_storms();
                await gethungry();

                /* src/allmain.c:354 — age_spells() then exerchk(). exerchk
                   runs exerper(), which every tenth move exercises whichever
                   attribute the hunger and encumbrance state calls for, and
                   each of those spends an rn2(19). */
                age_spells();
                await exerchk();

                /* src/allmain.c:357 vault occupancy and guard arrival. */
                {
                    const { invault } = await import('./vault.js');
                    await invault();
                }

                /* The Amulet check runs for any hero carrying it. */
                if (g.u.uhave?.amulet) {
                    const { amulet } = await import('./wizard.js');
                    await amulet();
                }

                /* src/allmain.c:360 — the hero scuffs what is written under
                   their feet. This used to spend the rnd(3) and DISCARD it
                   without calling u_wipe_engr(), so a dust engraving never
                   degraded: an "Elbereth" stayed pristine forever and kept
                   scaring monsters through onscary(), which C's scuffed copy
                   no longer matches. */
                if (!rn2(40 + (ACURR(A_DEX) * 3)))
                    u_wipe_engr(rnd(3));

                /* src/allmain.c:374 — vision will be updated as bubbles
                   move: the Planes of Water and Air redraw their bubbles
                   and clouds every turn, and a fumaroles level (Plane of
                   Fire) vents poison gas */
                if (Is_waterlevel(g.u.uz) || Is_airlevel(g.u.uz)) {
                    const { movebubbles } = await import('./mkmaze.js');
                    await movebubbles();
                } else if (g.level?.flags?.fumaroles) {
                    const { fumaroles } = await import('./mkmaze.js');
                    await fumaroles();
                }

                /* src/allmain.c:380 — when immobile, count is in turns */
                if ((g.multi ?? 0) < 0) {
                    if (++g.multi === 0) { /* finished yet? */
                        await unmul(null);
                    }
                }
            }
        } while (g.u.umovement < NORMAL_SPEED);

        /* allmain.c:396: one distinct sequence number per action that takes
           time, including extra actions by a fast hero in the same turn. */
        g.hero_seq++;

        /* src/allmain.c:403 checks again after timeout and monster actions,
           so inventory changes made by the hero get immediate feedback. */
        await encumber_msg();

        /* src/allmain.c:409 — INSIDE the context.move gate: the vicinity
           counter only advances on cores where time actually passed, which
           is why C's first rn2(31) waits for the first time-taking command
           even when the preamble's rnd(30) rolled 1 (seed2200). */
        if (g.moves >= g.context.seer_turn) {
            if ((g.u.uhave?.amulet || g.u.uprops?.CLAIRVOYANT)
                && !In_endgame(g.u.uz)
                && !g.u.uprops?.BLOCKED_CLAIRVOYANT)
                await do_vicinity_map(null);
            /* we maintain this counter even when clairvoyance isn't
               taking place; on average, go again 30 turns from now */
            g.context.seer_turn = g.moves + rn1(31, 15); /*15..45*/
        }

        /* src/allmain.c:422-432: liquid terrain keeps acting after the
           command.  Lava advances its two-part escape and sinking counter;
           a stationary hero re-runs pool effects; underwater vision then
           redraws only the immediate liquid neighborhood. */
        if (g.u.utrap && g.u.utraptype === TT_LAVA) {
            const { sink_into_lava } = await import('./trap.js');
            await sink_into_lava();
        } else if (!g.u.umoved) {
            const { pooleffects } = await import('./hack.js');
            await pooleffects(false);
        }
        if (Underwater()) {
            const { under_water } = await import('./display.js');
            await under_water(0);
        }

        /* the move flag is CONSUMED by the turn block above. C's blocking
           input reads a whole command before control returns here, so the
           flag's lifetime is one command -> one turn. Our prompts suspend
           mid-command; without this clear, the next core call re-reads the
           stale flag and burns a phantom turn before the prompt resumes. */
        g.context.move = 0;
    }

    /* src/allmain.c:441-453 — once-per-player-input things: forget the last
       splitobj() pair, then re-derive the hero's AC from what is worn now.
       This per-input find_ac() is what makes AC changes from multi-turn
       dressing show on the status line the turn they complete. */
    clear_splitobjs();

    /* src/allmain.c:446 — the Amulet of Yendor gives a wish when initially
       picked up (a 5.0 feature; the wizmode endgame levelport grant
       triggers it too) */
    if (g.u.uhave?.amulet && !g.u.uevent?.amulet_wish) {
        (g.u.uevent ||= {}).amulet_wish = 1;
        /* display_nhwindow(WIN_MESSAGE, TRUE) — a BLOCKING flush: an
           unacknowledged topline ("It is hot here." on the fire-plane
           arrival) gets its --More-- and eats a key BEFORE the wish text;
           skipping it glued both messages onto one line */
        const { pline, more, TOPLINE_NEED_MORE } = await import('./display.js');
        if (g._toplin === TOPLINE_NEED_MORE)
            await more();
        await pline('The Amulet is bestowing a wish upon you!');
        const { makewish } = await import('./zap.js');
        await makewish();
    }

    find_ac();

    // Vision + display
    const Warning = !!(g.u.uprops?.WARNING || g.u.intrinsic?.HWarning);
    if (!g.context.mv || g.u.ublind) {
        if (Hallucination()) {
            see_monsters();
            see_objects();
            see_traps();
            if (g.u.uswallow)
                await swallowed(0);
        } else if (Warning) {
            see_monsters();
        }
        /* src/allmain.c:470. During an uninterrupted run, defer this until
           movement stops or a moving monster consumes it mid-sweep. */
        if (g.vision_full_recalc)
            vision_recalc(0);
    }
    await bot();
    await flush_screen(1);

    /* src/allmain.c:481, every living hero form gets its once-per-input
       monster effect before occupations and command reading. Fog clouds use
       this to leave a harmless one-square vapor trail. */
    m_everyturn_effect(g.youmonst);

    /* src/allmain.c:485 — an active occupation CONSUMES the turn instead of
       reading a command. It runs once per turn until it returns 0, and a
       nearby monster stops it early.
     *
     *     if (gm.multi >= 0 && go.occupation) {
     *         if ((*go.occupation)() == 0) go.occupation = 0;
     *         if (monster_nearby()) stop_occupation();
     *     }
     */
    if ((g.multi ?? 0) >= 0 && g.occupation) {
        if ((await g.occupation()) === 0)
            g.occupation = null;
        if (monster_nearby()) {
            await stop_occupation();
            /* reset_eat(): only matters when the occupation was eating,
               which sets its own context; noted until eating occupations
               are ported */
            if (g.context?.victual?.piece)
                note_unported_main('moveloop:reset_eat');
        }
        g.context.move = 1;             /* the occupation took this turn */
        return;
    }

    /* src/allmain.c:513 — cleared before each command; domove sets it back
       when the hero's position actually changed. u_calc_moveamt reads it to
       decide whether a mounted hero's budget comes from the steed. */
    g.u.umoved = false;

    /* a helpless hero (multi < 0) takes no command; the turn machinery above
       advanced the count, and context.move stays set so the next core call
       burns the next helpless turn, exactly like an occupation. C clears
       u.umoved before reaching this state. */
    if ((g.multi ?? 0) < 0) {
        g.context.move = 1;
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
    const g = game;
    /* src/allmain.c:569 find_level("tut-1") */
    const sp = (g.sp_levchn || []).find(s => s.proto === 'tut-1');
    if (!sp)
        return;

    if (await ask_do_tutorial()) {
        g.u.ucamefrom = { dnum: g.u.uz.dnum, dlevel: g.u.uz.dlevel };
        g.iflags.nofollowers = true;
        const { schedule_goto, deferred_goto, UTOTYPE_NONE } =
            await import('./do.js');
        schedule_goto(sp.dlevel, UTOTYPE_NONE,
                      'Entering the tutorial.', null);
        await deferred_goto();
        const { vision_recalc } = await import('./vision.js');
        vision_recalc(0);
        await docrt();
        g.iflags.nofollowers = false;
    }
}
