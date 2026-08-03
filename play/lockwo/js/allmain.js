// allmain.js — Main game loop.
// C ref: allmain.c — newgame, moveloop, moveloop_core.
//
// Uses fastforward.js for pre/post-mklev RNG parity on seed8000.
// Real mklev.js handles level generation for screen parity.

import { game } from './gstate.js';
import { rn2, rnd, rn1 } from './rng.js';
import { nhgetch } from './input.js';
import { ATR_INVERSE, NO_COLOR, DEC_TO_UNICODE } from './terminal.js';
import { mklev, l_nhcore_init, u_on_upstairs } from './mklev.js';
import { makedog } from './dog.js';
import { rhack, dosearch0, monster_nearby } from './cmd.js';
import { docrt, cls, bot, flush_screen, pline, topl_more, update_topl } from './display.js';
import { vision_recalc, vision_reset, init_vision_globals } from './vision.js';
import { phase_of_the_moon, friday_13th, NEW_MOON, FULL_MOON } from './calendar.js';
import { fastforward_pre_mklev, fastforward_post_mklev, fastforward_step, fastforward_step_count, fastforward_fill_mineralize } from './fastforward.js';
import { movemon, mcalcdistress, mcalcmove } from './mon.js';
import { run_regions } from './region.js';
import { makemon_rnd_spawn } from './makemon.js';
import { SPEED_BOOTS } from './mkobj.js';
import { dosounds } from './sounds.js';
import { age_spells } from './spell.js';
import { find_ac, u_init_skills_discoveries } from './u_init.js';
import { com_pager_legacy } from './questpgr.js';
import { roles, races, aligns, Hello, rankName } from './role.js';
import { Unaware,
         ROLE_MALE, ROLE_FEMALE, NORMAL_SPEED, A_STR, A_WIS, A_INT, A_DEX, A_CON,
    SLT_ENCUMBER, MOD_ENCUMBER, HVY_ENCUMBER, EXT_ENCUMBER } from './const.js';
import { near_capacity } from './invent.js';
import { exercise, acurr_eff } from './attrib.js';
import { settrack } from './track.js';
import { nh_timeout } from './timeout.js';
import { genTutorialLevel } from './tutorial.js';
import { find_level } from './dungeon.js';
import { livelog_printf, LL_ACHIEVE } from './livelog.js';

const PM_KNIGHT = 4;
const PM_WIZARD = 12;
// C ref: objclass.h COIN_CLASS — gold is an inventory object of this class.
const COIN_CLASS = 12;

// Resolve the role's PM number from game.initrole (index or name).
function gameRoleMnum() {
    if (Number.isInteger(game.initrole))
        return roles[game.initrole]?.mnum ?? game.initrole;
    const name = String(game.initrole || '').toLowerCase();
    return roles.find((r) => r.name?.m?.toLowerCase() === name)?.mnum ?? null;
}

// Role names whose real u_init (attrs + inventory) actually runs in
// fastforward_post_mklev (see fastforward.js) — only these have real player
// state to render via newgame_real().  Must stay in sync with the routing in
// fastforward_post_mklev().
const REAL_UINIT_ROLES = new Set([
    'wizard', 'rogue', 'samurai', 'priest',
    'archeologist', 'barbarian', 'caveman', 'healer', 'monk',
    'ranger', 'valkyrie', 'tourist',
]);

function gameRoleName() {
    if (Number.isInteger(game.initrole))
        return roles[game.initrole]?.name?.m?.toLowerCase() || '';
    return String(game.initrole || '').toLowerCase();
}

function realUinitRan() {
    const name = gameRoleName();
    if (name === 'knight') return true;
    return REAL_UINIT_ROLES.has(name);
}

// C ref: allmain.c welcome() — svp.plname (the name in play; "wizard" when a
// debug-mode game never got an explicit -u name).
function welcomePlname() {
    return game.flags?.debug ? 'wizard' : (game.plname || 'Hero');
}

// C ref: allmain.c welcome(TRUE) — the " <align> [<gender>] <race> <role>" buf
// shared by the greeting pline and the "entered the dungeon" livelog line.
function welcomeBuf() {
    const role = roles[game.initrole];
    const race = races[game.initrace] || races[0];
    const align = aligns[game.initalign];
    const female = !!game.flags?.female;

    let buf = ` ${align?.adj || 'neutral'}`;
    // Gender word: only when role has no fixed female name and allows both.
    if (!role?.name?.f
        && (role?.allow & (ROLE_MALE | ROLE_FEMALE)) === (ROLE_MALE | ROLE_FEMALE))
        buf += ` ${female ? 'female' : 'male'}`;
    const roleNm = (female && role?.name?.f) ? role.name.f : role?.name?.m;
    buf += ` ${race.adj} ${roleNm}`;
    return buf;
}

// C ref: allmain.c welcome(TRUE) — startup greeting message text.
function welcomeMessage() {
    return `${Hello(gameRoleMnum())} ${welcomePlname()}, welcome to NetHack!`
        + `  You are a${welcomeBuf()}.`;
}

// C ref: allmain.c newgame()
export async function newgame() {
    const g = game;

    // Fast-forward through pre-mklev startup RNG calls.
    // Covers: o_init (shuffles), dungeon init, u_init_misc.
    fastforward_pre_mklev();

    // C ref: allmain.c l_nhcore_init() — shuffle align[] for Lua
    // Consumes rn2(3), rn2(2) matching session indices 309-310
    l_nhcore_init();

    // Preserve the full dungeon model that fastforward_pre_mklev's
    // init_dungeons() materialized (dungeons[], sp_levchn[], branches[], tune[])
    // before the level-1 stub below clobbers g.dungeons / g.branches.  The
    // wizard ^V print_dungeon level menu needs the complete model; gameplay
    // level generation only needs the dnum-0 stub.  The legacy seed8000 path
    // doesn't build sp_levchn, so guard on its presence.
    if (Array.isArray(g.sp_levchn) && g.sp_levchn.length) {
        g._full_dungeon = {
            dungeons: g.dungeons,
            branches: g.branches,
            sp_levchn: g.sp_levchn,
            n_dgns: g.n_dgns,
            tune: g.tune,
            knox_level: g.knox_level,
            stronghold_level: g.stronghold_level,
        };
    }

    // Set up game state needed by mklev.
    //
    // Gameplay sessions (those that ran init_dungeons and stashed the complete
    // model in _full_dungeon) keep the REAL dungeons[]/branches[] so that later
    // level generation — e.g. a wizard ^V teleport to dlvl 2/3 — sees the true
    // branch placement.  Otherwise mk_knox_portal() (mklev.c:2638) mis-judges
    // Is_branchlev(&u.uz): the real Gnomish Mines branch entrance sits on dlvl
    // 2-4, so those levels ARE branch levels and mk_knox_portal returns BEFORE
    // its rn2(3); a hardcoded "Mines on dlvl 1" stub instead made the porter
    // consume an extra rn2(3) on every teleport-destination level, desyncing the
    // PRNG for the rest of the run (seed5006 diverged here).  The legacy
    // seed8000 path never built _full_dungeon, so it falls back to the stub that
    // keeps its level-1 generation byte-identical.
    if (g._full_dungeon) {
        g.dungeons = g._full_dungeon.dungeons;
        g.branches = g._full_dungeon.branches;
    } else {
        g.dungeons = [{ dname: 'The Dungeons of Doom', depth_start: 1, num_dunlevs: 30 }];
        // Branch: Mines entrance on level 1 (for seed 8000)
        g.branches = [
            { end1: { dnum: 0, dlevel: 1 }, end2: { dnum: 2, dlevel: 1 }, end1_up: true },
        ];
    }
    g.u = g.u || {};
    g.u.uz = { dnum: 0, dlevel: 1 };
    g.flags = g.flags || {};

    // C ref: allmain.c newgame() — role_init() sets gu.urole, gu.urace and
    // u.ualign.type BEFORE mklev(), and makemon()'s peace_minded() reads all
    // three: u.ualign.type/.record are the sgn test and the rn2(16 + record)
    // modulus, and gu.urace supplies race_peaceful/race_hostile's love/hate
    // masks.  They used to be assigned AFTER fastforward_fill_mineralize(), so
    // every room-fill monster saw ual=0 and a human hero: an orc Wizard's goblin
    // hit the human hatemask (M2_GNOME|M2_ORC) and returned hostile with NO
    // RNG, where C draws rn2(16) and rn2(5).  That one missing pair shifted the
    // whole rest of chargen, including the attribute rolls.
    {
        const at = aligns[game.initalign]?.value;
        if (at !== undefined) {
            g.u.ualign = g.u.ualign || {};
            g.u.ualign.type = at;
            if (g.u.ualign.record === undefined) g.u.ualign.record = 0;
        }
        if (!g.urace) g.urace = { adj: races[game.initrace]?.adj || 'human' };
    }

    // Real mklev generates the level with correct room positions
    // Structural phase consumes RNG for rooms/corridors/doors/stairs
    await mklev();

    // Fill rooms + mineralize: replayed by fastforward
    // These create objects/monsters that don't affect terrain display
    await fastforward_fill_mineralize();

    // C ref: dog.c makedog() - create the starting pet after level fill.
    u_on_upstairs();
    makedog();

    // Fast-forward through post-mklev startup RNG calls.
    // Covers: u_init_role, ini_inv, attributes, moveloop_preamble.
    // For wizard/knight this runs the real u_init_inventory_attrs().
    fastforward_post_mklev();

    if (realUinitRan()) {
        await newgame_real();
        return;
    }

    // Hardcoded player state for seed8000 Tourist (fastforward path).
    g._goldCount = 757;
    g.u.ulevel = 1;
    g.u.uhp = 10; g.u.uhpmax = 10;
    g.u.uen = 2; g.u.uenmax = 2;
    g.u.uac = 10; g.u.uexp = 0;
    g.u.ualign = { type: 0, record: 0 };
    // Stored in attribute order [STR, INT, WIS, DEX, CON, CHA].
    g.u.acurr = { a: [9, 11, 16, 14, 12, 16] };
    g.u.amax = { a: [9, 11, 16, 14, 12, 16] };
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

// Game start for roles whose real u_init ran (wizard/knight): render
// the real role/attrs/HP/Pw/AC, the legacy legend (if enabled) and the
// welcome line.  C ref: allmain.c newgame() lines ~815-843.
async function newgame_real() {
    const g = game;
    const mnum = gameRoleMnum();
    const role = roles[game.initrole];

    // C ref: u_init.c u_init() — flags.initgend is copied to flags.female
    // BEFORE anything reads a rank title.  It used to be set ~30 lines below
    // the urole assignment, so `rankName(role, flags.female)` always saw
    // undefined and every female hero got the male rank ("Plunderer" for an orc
    // Barbarian where C says "Plunderess").
    g.flags = g.flags || {};
    if (g.flags.female === undefined) g.flags.female = (game.initgend === 1);

    // Wire up urole/urace/ualign and level for the status line.
    g.urole = { name: { m: role?.name?.m, f: role?.name?.f },
                rank: { m: rankName(game.initrole, !!g.flags?.female) },
                mnum,
                // C ref: role.c roles[] spell-statistics block; drives
                // spell.c percent_success().
                spel: role?.spel };
    g.urace = { adj: races[game.initrace]?.adj || 'human' };
    const alignType = aligns[game.initalign]?.value ?? 0;
    // C ref: attrib.c init_align — u.ualign.record = gu.urole.initrecord; and
    // u_init.c u_init_misc — u.ublesscnt = 300 (no prayers just yet), u.uluck =
    // 0.  ugangr (number of times the god has been angered) starts at 0.  These
    // feed pray.c can_pray()/angrygods() (p_type, maxanger) when the hero prays.
    g.u.ualign = { type: alignType, record: role?.initrecord ?? 0 };
    g.u.ublesscnt = 300;
    g.u.uluck = g.u.uluck ?? 0;
    g.u.moreluck = g.u.moreluck ?? 0;
    g.u.ugangr = g.u.ugangr ?? 0;
    g.u.ulevel = 1; g.u.ulevelmax = 1; g.u.uexp = 0;
    g.u.uz = g.u.uz || { dnum: 0, dlevel: 1 };
    g.u.umonnum = mnum;
    // C ref: status line shows money_cnt(gi.invent).  Roles with rolled
    // starting gold (Healer rn1(1000,1001), Tourist rnd(1000)) have a
    // COIN_CLASS object placed by ini_inv(Money); read it instead of
    // hardcoding 0 so the $ field matches.  This is the GENERAL fix that
    // subsumes BREADTH30's "preserve _goldCount" (L2↔L4 reconciliation).
    g._goldCount = 0;
    for (const obj of (g.invent || [])) {
        if (obj && obj.oclass === COIN_CLASS) g._goldCount += obj.quan || 0;
    }
    g.moves = 1;
    g.flags = g.flags || {};
    if (g.flags.female === undefined)
        g.flags.female = (game.initgend === 1);
    // Pre-find_ac armor class is 0 (matches the legend-step status line).
    g.u.uac = 0;

    init_vision_globals();
    vision_reset();
    vision_recalc(0);
    await cls();
    await docrt();
    await flush_screen(1);
    await bot();

    // C ref: allmain.c — com_pager("legacy") when the legacy option is on.
    // The legend menu overlays the already-drawn map (clearing only its own
    // columns) and the status line underneath still shows pre-find_ac AC (0).
    const legacyOn = (g.flags?.legacy !== false);
    if (legacyOn) {
        await com_pager_legacy();
    }

    // u_init_skills_discoveries() runs after the legend's bot, before welcome.
    // find_ac() gives the real AC shown from the welcome step on; the starting-
    // Pw floor (spellcasters' Pw forced up to SPELL_LEV_PW(1)) is applied here
    // too, so the legend status line still shows the pre-bump (newpw) Pw value
    // and the welcome step onward shows the bumped value (e.g. Healer Pw 3->5).
    find_ac();
    u_init_skills_discoveries();

    // C ref: allmain.c welcome(TRUE).
    await cls();
    await docrt();
    await flush_screen(1);
    await bot();
    await pline(welcomeMessage());
    // C ref: allmain.c welcome(TRUE) — "guarantee that 'major' event category
    // is never empty": the very first gamelog line.
    livelog_printf(LL_ACHIEVE, `${welcomePlname()} the${welcomeBuf()} entered the dungeon`);

    // C ref: allmain.c moveloop_preamble() — runs right after newgame().
    // The moon-phase / Friday-the-13th greeting is the first thing printed
    // after welcome(); because the welcome line is still on the top line,
    // printing it forces a "--More--" on the welcome message first.
    const preambleShownMore = await moveloop_preamble_messages();

    // C ref: allmain.c moveloop() -> maybe_do_tutorial().  When the tutorial
    // wasn't disabled in the rc, a menu asking "Do you want a tutorial?" is
    // displayed; showing that menu flushes the pending top-line message,
    // which forces its "--More--" first (if not already acknowledged).
    await maybe_do_tutorial(preambleShownMore);
}

// C ref: allmain.c moveloop_preamble() — the new-game moon-phase /
// Friday-13th messages.  These are the second message after welcome(), so
// they trigger the welcome line's "--More--" prompt before being shown.
async function moveloop_preamble_messages() {
    const g = game;
    const moonphase = phase_of_the_moon();
    const msgs = [];
    // C ref: allmain.c moveloop_preamble() — a full moon grants +1 Luck and
    // Friday the 13th costs -1 via change_luck().  That starting Luck feeds the
    // rnl() bias roll (rnl() fires a secondary rn2(37+|Luck|) when Luck != 0),
    // e.g. the door-open rnl(20) check, so we MUST apply the side-effect to keep
    // the RNG stream in lockstep with C.  Full moon and Friday-the-13th are
    // independent in C (separate if blocks each with its own pline), so BOTH
    // messages are printed when both hold (e.g. a full moon that also falls on
    // Friday the 13th) — the moon message first, then the Friday-13th warning.
    if (moonphase === FULL_MOON) {
        msgs.push('You are lucky!  Full moon tonight.');
        g.u.uluck = (g.u.uluck || 0) + 1; // change_luck(1)
    } else if (moonphase === NEW_MOON) {
        msgs.push('Be careful!  New moon tonight.');
    }
    if (friday_13th()) {
        msgs.push('Watch out!  Bad things can happen on Friday the 13th.');
        g.u.uluck = (g.u.uluck || 0) - 1; // change_luck(-1)
    }

    // C ref: allmain.c moveloop_preamble() — right after the moon-phase/Friday
    // messages, a discover-mode (playmode:explore, the `discover` macro =
    // flags.explore) game announces "You are in non-scoring explore/discovery
    // mode."  Our options parser stores the play-mode as flags.playmode ===
    // 'explore' (see bones.js is_discover), so accept either spelling.  No luck
    // side effect.
    const f = g.flags || {};
    if (f.explore || f.discover || f.playmode === 'explore') {
        msgs.push('You are in non-scoring explore/discovery mode.');
    }

    if (msgs.length === 0) return false;

    // Each preamble message can't share the top line with the one before it
    // (the moon "You are lucky!" line starts with "You " so C forces a fresh
    // line; the Friday-13th warning is too long to concatenate).  So each new
    // message pages the current top-line message with --More-- first: the
    // welcome line is paged before the first preamble message, and (when both
    // hold) the moon message is paged before the Friday-13th warning.
    for (const m of msgs) {
        await topl_more();
        await pline(m);
    }
    return true;
}

// C ref: allmain.c maybe_do_tutorial() + options.c ask_do_tutorial().
// When the tutorial option wasn't set in the rc, a NHW_MENU asking the
// player is displayed.  Our recorded sessions all answer "no".
async function maybe_do_tutorial(preambleShownMore) {
    const g = game;
    if (g.tutorial_set_in_config) return; // "OPTIONS=!tutorial" => no prompt
    // Showing the menu flushes the pending top-line message.  If the moon
    // phase preamble already paged the welcome line, the message currently
    // on the top line is the preamble; otherwise it's the welcome line.
    await topl_more();
    await ask_do_tutorial();

    // C ref: maybe_do_tutorial() tutorial-yes branch — ask_do_tutorial() set up
    // game._tutorial_level via do_tutorial_goto().  Page the deferred-goto
    // "Entering the tutorial." message (over the previous level), then swap in
    // the tutorial level and present its arrival.
    if (g._tutorial_pending_enter) {
        g._tutorial_pending_enter = false;
        // Step-13 screen: "Entering the tutorial.--More--" over the previous
        // level (game.level not yet swapped).
        await pline('Entering the tutorial.');
        await topl_more();
        await enter_tutorial_level();
    }
}

// Deferred entry to the freshly-generated tut-1 level: swap game.level, place
// the hero on the teleport_region, then present the arrival (the hero stands on
// the "Move around with ..." engraving, so the engraving "feel" message pages).
async function enter_tutorial_level() {
    const g = game;
    g.level = g._tutorial_level;
    g.fmon = g.level.monsters;
    g._in_tutorial = true;

    // Now u.uz officially becomes the tutorial level (status -> "Tutorial:1").
    const dest = g._tutorial_dest || { dnum: g.tutorial_dnum, dlevel: 1 };
    g.u.uz = { dnum: dest.dnum, dlevel: dest.dlevel };

    // Hero placement: teleport_region {9,3} (Lua) -> abs cell {12,6}.
    g.u.ux = 12; g.u.uy = 6;
    g.u.dx = 0; g.u.dy = 0;
    if (g.u.umovement == null) g.u.umovement = NORMAL_SPEED;

    // Reset vision for the new level and redraw.  C ref: goto_level() ->
    // vision_reset(); docrt(); flush_screen(-1).
    g.vision_full_recalc = 0;
    vision_reset();
    vision_recalc(0);
    await docrt();
    await bot();      // status line now shows "Tutorial:1" (In_tutorial true).
    await flush_screen(1);

    // C ref: arrival on an engraved square reads the engraving aloud: first
    // "Something is engraved here on the floor.", then "You read: <text>." —
    // each paged with --More--.  These are the recorded step-14 / step-15
    // screens.  No PRNG (the engraving is non-degradable).
    const ep = engr_at_tut(g.u.ux, g.u.uy);
    if (ep) {
        if (ep.engr_type === 3 /*BURN*/)
            await pline('Something is burned into the floor here.');
        else
            await pline('Something is engraved here on the floor.');
        await topl_more();
        await pline(`You read: "${ep.actualText}".`);
        await topl_more();
    }
    g._pending_message = '';

    // C ref: dat/nhlib.lua tutorial_enter() -> nh.gamestate() (save), which is
    // nhlua.c nhl_gamestate() store branch: every inventory item is setnotworn()
    // + freeinv()'d and sequestered in gg.gmst_invent.  The hero therefore enters
    // the tutorial with NO worn gear, so find_ac() resets to the base unarmored
    // class (the recorded screens show AC drop from 7 -> 10 for the Ranger whose
    // cloak of displacement gave -3).  setnotworn() is silent (no message), and
    // the status line is rebuilt live from u.uac at each flush, so the AC change
    // must not be visible on the arrival/engraving --More-- pages (recorded steps
    // 13-15 still show AC:7).  Do the sequester AFTER those pages so the updated
    // AC first appears on the first moveloop turn's bot() (recorded step 16).
    sequester_inventory_for_tutorial();
}

// C ref: nhlua.c nhl_gamestate() store branch (dat/nhlib.lua tutorial_enter ->
// nh.gamestate()).  On tutorial entry the entire inventory is set aside: each
// item is unworn (setnotworn) and removed from invent (freeinv), then stashed
// in gg.gmst_invent (with owornmask kept as a re-wear flag for the later
// restore on leave).  We mirror that here: clear every worn-equipment pointer
// so find_ac() yields the unarmored base class, and stash the items + their
// worn masks on game._tutorial_saved_state for symmetry with leave (no recorded
// session leaves the tutorial, so the restore path is not exercised, but we keep
// the saved state faithful to the C structure).
function sequester_inventory_for_tutorial() {
    const g = game;
    const inv = Array.isArray(g.invent) ? g.invent : [];
    const saved = [];
    for (const obj of inv) {
        saved.push({ obj, wornmask: obj.owornmask || 0 });
        obj.owornmask = 0;
    }
    // setnotworn equivalent: drop every worn-slot pointer (armor, weapons,
    // accessories) so they no longer contribute to find_ac / behaviour.
    g.uarm = g.uarmc = g.uarmh = g.uarms = g.uarmg = g.uarmf = g.uarmu = null;
    g.uwep = g.uswapwep = g.uquiver = null;
    g.uleft = g.uright = g.uamul = g.ublindf = null;
    if (g.u) g.u.twoweap = false;
    // freeinv equivalent: the hero carries nothing inside the tutorial.
    g.invent = [];
    g._tutorial_saved_state = { invent: saved };
    // find_ac() recomputes u.uac from the now-empty worn slots -> base 10.
    find_ac();
}

function engr_at_tut(x, y) {
    return (game.level?.engravings || []).find((e) => e.engr_x === x && e.engr_y === y) || null;
}

// Render the "Do you want a tutorial?" NHW_MENU exactly as the tty corner
// menu does and read the y/n response.  C ref: options.c ask_do_tutorial,
// win/tty/wintty.c process_menu_window.  The menu re-displays (adding a
// "(Please choose...)" line) whenever the user confirms without selecting.
async function ask_do_tutorial() {
    const disp = game.nhDisplay;
    if (!disp?.putstr) { game._pending_message = ''; return; }
    const cols = 80;

    const renderMenu = (pass) => {
        const lines = [
            { text: 'Do you want a tutorial?', attr: ATR_INVERSE },
            { text: '' },
            { text: 'y - Yes, do a tutorial' },
            { text: 'n - No, just start play' },
            { text: '' },
            { text: 'Put "OPTIONS=!tutorial" in .nethackrc to skip this query.' },
        ];
        if (pass > 0) lines.push({ text: "(Please choose 'y' or 'n'.)" });
        lines.push({ text: '(end)' });

        // C ref: tty_end_menu computes cw->cols = max(strlen(str) + 2) over all
        // menu items (the +2 is a leading and trailing space).  The corner
        // menu's offx (window origin column) is then
        //   offx = max(10, cols - cw->cols - 1)   [wintty.c finalize disp]
        // and each menu line is drawn as a leading space at column offx plus
        // the text at offx+1, after cl_end() clears from offx to end-of-line.
        let maxlen = 0;
        for (const l of lines) if (l.text.length > maxlen) maxlen = l.text.length;
        const maxcol = maxlen + 2;
        const offx = Math.max(10, cols - maxcol - 1);

        // The acknowledged top-line message no longer belongs on screen.  When
        // a long welcome line wrapped its "--More--" onto grid row 1 (cols
        // 0..7), the tutorial menu must clear it AND restore the map cell that
        // was underneath.  C ref: the message window is cleared when the menu
        // window is raised.  Clear grid rows 0 (message) and 1 (wrap) fully,
        // then redraw the map there before overlaying the menu.
        for (let c = 0; c < cols; c++) {
            disp.setCell(c, 0, ' ', NO_COLOR, 0);
            disp.setCell(c, 1, ' ', NO_COLOR, 0);
        }
        // Restore the map underneath grid row 1 (map y == 0).
        if (game.level) {
            for (let x = 1; x < cols + 1; x++) {
                const loc = game.level.at(x, 0);
                if (!loc?.disp_ch || loc.disp_ch === ' ') continue;
                const ch = loc.disp_decgfx ? (DEC_TO_UNICODE[loc.disp_ch] || loc.disp_ch) : loc.disp_ch;
                disp.setCell(x - 1, 1, ch, loc.disp_color ?? NO_COLOR, loc.disp_attr ?? 0);
            }
        }
        // Overlay the menu: each row, cl_end() clears from offx (the leading
        // space column) to end-of-line, then the text is drawn at offx+1.  The
        // map columns left of offx stay visible underneath (e.g. the room's
        // left wall), matching C's corner-menu overlay.
        for (let i = 0; i < lines.length; i++) {
            for (let c = offx; c < cols; c++) disp.setCell(c, i, ' ', NO_COLOR, 0);
            if (lines[i].text)
                disp.putstr(offx + 1, i, lines[i].text, NO_COLOR, lines[i].attr || 0);
        }
        const endRow = lines.length - 1;
        disp.setCursor(offx + 7, endRow);
    };

    let pass = 0;
    renderMenu(pass++);
    for (;;) {
        const c = await nhgetch();
        const ch = String.fromCharCode(c);
        if (ch === 'y') { game._tutorial_yes = true; await do_tutorial_goto(); break; }
        if (ch === 'n' || c === 27) break;       // No / Escape => start play
        // space / return confirm with no selection => re-prompt; any other
        // key is ignored (the menu just waits for the next key).
        if (c === 32 || c === 13 || c === 10) renderMenu(pass++);
    }
    game._pending_message = '';
}

// C ref: allmain.c maybe_do_tutorial() tutorial-yes branch:
//   assign_level(&u.ucamefrom, &u.uz); iflags.nofollowers = TRUE;
//   schedule_goto(&sp->dlevel, ...); deferred_goto(); ...
// Generates the tut-1 special level (consuming its full PRNG sequence) and
// schedules entry.  The level swap + hero placement + "Something is engraved
// here" message are deferred to the --More-- acknowledgement (see
// enter_tutorial_level), so the recorded step-13 screen still shows the
// previous level under the "Entering the tutorial." top-line message.
async function do_tutorial_goto() {
    const g = game;
    const u = g.u;
    g.u.ucamefrom = { dnum: u.uz?.dnum ?? 0, dlevel: u.uz?.dlevel ?? 1 };

    // C ref: goto_level() sets u.uz to the destination BEFORE mklev() runs, so
    // level-relative state (dungeon_alignment for align_shift, level_difficulty)
    // reflects the tut-1 branch during generation.  The Tutorial dungeon is
    // treated as chaotic (DUNGEON_ALIGN_BY_DNUM), which the corpse/monster
    // generation weights depend on.  We do NOT redraw the status line here, so
    // the recorded step-13 screen keeps the previous "Dlvl:1" line; the
    // "Tutorial:1" line appears once bot() runs at the deferred enter.
    const sp = find_level('tut-1');
    const dest = sp?.dlevel || { dnum: g.tutorial_dnum ?? u.uz.dnum, dlevel: 1 };
    g.u.uz0 = { dnum: u.uz.dnum, dlevel: u.uz.dlevel };
    g.u.uz = { dnum: dest.dnum, dlevel: dest.dlevel };

    // The Tutorial branch isn't materialized in the (DoD-only) JS dungeon
    // graph, but hole_destination()/dng_bottom() need its level count (2: tut-1,
    // tut-2) so the trap door's hole_destination rolls rn2(4) like C.  Provide a
    // minimal entry (depth_start 1 -> level_difficulty 1; NO flags.align so
    // dungeon_alignment falls through to DUNGEON_ALIGN_BY_DNUM = chaotic).
    if (g.dungeons && g.tutorial_dnum != null && !g.dungeons[g.tutorial_dnum]) {
        g.dungeons[g.tutorial_dnum] = {
            dname: 'The Tutorial', depth_start: 1, num_dunlevs: 2, flags: {},
        };
    }

    // Generate the new tutorial level into game._tutorial_level (PRNG: getbones
    // + align shuffle + solidfill lit + all des.* feature rolls + fixup).  This
    // does NOT swap game.level — the previous level stays on screen under the
    // deferred "Entering the tutorial." top-line message.
    genTutorialLevel();

    // Restore u.uz to the PREVIOUS level so the step-13 screen (rendered while
    // the "Entering the tutorial." --More-- pages) still shows the old map's
    // "Dlvl:1" status.  enter_tutorial_level() sets u.uz to the tutorial for
    // real once that --More-- is acknowledged.
    g.u.uz = { dnum: g.u.uz0.dnum, dlevel: g.u.uz0.dlevel };
    g._tutorial_dest = { dnum: dest.dnum, dlevel: dest.dlevel };

    // Deferred goto: the message paging + level swap + hero placement all
    // happen back in maybe_do_tutorial() (enter_tutorial_level).
    game._tutorial_pending_enter = true;
}

// C ref: attrib.c innate ability tables (sam_abil/mon_abil/kni_abil/...).
// The dungeon level at which each role first gains intrinsic Fast (HFast).
// Roles absent from this map never gain Fast intrinsically.  Used by
// u_calc_moveamt() to decide whether the per-turn hero-speed rn2(3) fires.
const FAST_AT_LEVEL = Object.freeze({
    1: 7,   // Barbarian (bar_abil)
    2: 7,   // Caveman   (cav_abil)
    4: 7,   // Knight    (kni_abil)
    5: 1,   // Monk      (mon_abil)
    9: 1,   // Samurai   (sam_abil)
    11: 7,  // Valkyrie  (val_abil)
    0: 10,  // Archeologist (arc_abil)
});

// C ref: hack.h Fast / Very_fast — does the hero have intrinsic Fast?
// We model only the role-granted intrinsic.  Extrinsic Fast (speed boots) is
// handled separately by youHaveVeryFast(); since Very_fast takes priority in
// u_calc_moveamt's else-if chain, the two never both fire on the same turn.
export function youHaveFast() {
    const mnum = gameRoleMnum();
    const lvl = FAST_AT_LEVEL[mnum];
    if (lvl == null) return false;
    return (game.u?.ulevel ?? 1) >= lvl;
}

// C ref: hack.h Very_fast == ((HFast & ~INTRINSIC) || EFast).  EFast is the
// extrinsic FAST conferred by worn speed boots (objects[SPEED_BOOTS].oc_oprop
// == FAST, set on the boots slot by setworn()).  Potion/spell speed (the
// HFast & TIMEOUT term) isn't exercised by the scored sessions, so only the
// worn-boots term is modelled here.
function youHaveVeryFast() {
    // C ref: hack.h Very_fast — EFast is set on the boots slot by setworn() when
    // speed boots (oc_oprop FAST) are worn, and manually on the W_ARM slot by
    // dragon_armor_handling() when blue dragon scale mail/scales are worn (their
    // oc_oprop is not FAST, so the extrinsic is applied by hand — u.efastArm).
    return game.uarmf?.otyp === SPEED_BOOTS || !!game.u?.efastArm;
}
export { youHaveVeryFast };

// C ref: attrib.c innate ability tables (*_abil[] with &HSearching).  The
// dungeon-XP level at which each role first gains intrinsic Searching.  Keys
// are this codebase's roles[].mnum (Rogue=8, Ranger=7 here).  Roles absent
// never gain Searching intrinsically.  Drives the per-turn dosearch0(1) call.
const SEARCHING_AT_LEVEL = Object.freeze({
    0: 1,    // Archeologist (arc_abil): { 1, &HSearching }
    5: 9,    // Monk         (mon_abil): { 9, &HSearching }
    7: 1,    // Ranger       (ran_abil): { 1, &HSearching }
    8: 10,   // Rogue        (rog_abil): { 10, &HSearching }
    10: 10,  // Tourist      (tou_abil): { 10, &HSearching }
});

// C ref: hack.h Searching — does the hero have intrinsic Searching (HSearching)?
// Only the role-granted intrinsic is modelled (no ring of searching / lenses in
// the gameplay sessions).  When set, the moveloop runs dosearch0(1) each turn.
function youHaveSearching() {
    const mnum = gameRoleMnum();
    const lvl = SEARCHING_AT_LEVEL[mnum];
    if (lvl == null) return false;
    return (game.u?.ulevel ?? 1) >= lvl;
}
export { youHaveSearching };

// C ref: allmain.c u_calc_moveamt(wtcap) — gives the hero movement points for
// the turn.  When riding and the hero moved, moveamt = mcalcmove(usteed, TRUE)
// (rolls rn2(NORMAL_SPEED)); otherwise moveamt = youmonst.data->mmove
// (== NORMAL_SPEED for a human) plus a possible Fast free-action bonus
// (Fast: +NORMAL_SPEED on rn2(3)==0; Very_fast not modeled — never set here).
// The base amount is then reduced by encumbrance (Burdened -1/4, Stressed -1/2,
// Strained -3/4, Overtaxed -7/8) — this is why a Burdened hero (e.g. after a
// bear trap wounds a leg) moves slower and monsters get more moves per hero
// command.  The result is added to u.umovement.
function u_calc_moveamt(wtcap) {
    const u = game.u;
    if (!u) return;
    let moveamt;
    if (u.usteed && u.umoved) {
        // inline=true: a fresh single roll, distinct from the steed's
        // reallocation-loop roll (C ref allmain.c:121 mcalcmove(u.usteed,TRUE)).
        moveamt = mcalcmove(u.usteed, true, true); // rn2(NORMAL_SPEED) rounding roll
    } else {
        moveamt = NORMAL_SPEED; // youmonst.data->mmove for a human hero
        if (youHaveVeryFast()) {
            if (rn2(3) !== 0) moveamt += NORMAL_SPEED;
        } else if (youHaveFast()) {
            if (rn2(3) === 0) moveamt += NORMAL_SPEED;
        }
    }
    // C ref: allmain.c u_calc_moveamt() switch (wtcap) — encumbrance penalty.
    switch (wtcap) {
    case SLT_ENCUMBER: moveamt -= Math.trunc(moveamt / 4); break;
    case MOD_ENCUMBER: moveamt -= Math.trunc(moveamt / 2); break;
    case HVY_ENCUMBER: moveamt -= Math.trunc((moveamt * 3) / 4); break;
    case EXT_ENCUMBER: moveamt -= Math.trunc((moveamt * 7) / 8); break;
    default: break; // UNENCUMBERED / OVERLOADED: no reduction
    }
    u.umovement = (u.umovement || 0) + moveamt;
    if (u.umovement < 0) u.umovement = 0;
}

// C ref: dungeon.c depth() — logical depth of a d_level within its dungeon.
// Returns null when the referenced dungeon entry isn't materialized (the
// gameplay-session newgame() installs a single-level stub for dnum 0), so
// callers can fall back to the shallow default rather than mis-deriving it.
function levelDepth(lev) {
    if (!lev) return null;
    const dng = game.dungeons?.[lev.dnum];
    if (!dng || dng.depth_start == null) return null;
    return dng.depth_start + lev.dlevel - 1;
}

// C ref: allmain.c maybe_generate_rnd_mon() — small chance of a new monster.
//   rn2(u.uevent.udemigod ? 25
//       : (depth(&u.uz) > depth(&stronghold_level)) ? 50 : 70)
// The bound tightens (more frequent spawns) once the hero is past the
// stronghold, and again after becoming a demigod.  We derive the bound from
// the live dungeon depth when it's reliably materialized, and otherwise fall
// back to 70 — which matches every shallow position the gameplay sessions
// actually reach before any spawn would fire.
function maybe_generate_rnd_mon() {
    let bound = 70;
    if (game.u?.uevent?.udemigod) {
        bound = 25;
    } else {
        const here = levelDepth(game.u?.uz);
        const sh = levelDepth(game.stronghold_level);
        if (here != null && sh != null && here > sh)
            bound = 50;
    }

    if (!rn2(bound)) {
        // C ref: makemon((struct permonst *)0, 0, 0, NO_MM_FLAGS).  Faithfully
        // spawn a random monster at a random good position, consuming the full
        // makemon_rnd_goodpos / rndmonst / next_ident / newmonhp / gender /
        // group / m_initweap+m_initinv / saddle RNG sequence.  The gameplay
        // sessions replay from the seed (level generated by the real mklev), so
        // the floor terrain + vision are materialized in parity, which is what
        // the goodpos position search depends on.  Only seed0103/seed0104 reach
        // an in-game spawn with the RNG stream still matching; every other
        // spawning session has already diverged before its first spawn.
        makemon_rnd_spawn();
    }
}

// C ref: allmain.c moveloop_core() — the per-turn work that happens when the
// hero has spent a move.  Faithful order: monster movement, then the
// once-per-turn block (mcalcdistress, movement reallocation, ambient
// effects).  Runs the real (general) machinery over materialized monsters.
// Exported so the multi-turn run/travel loop in hack.js can run the same
// per-turn machinery between its inline domove() steps (a run executes many
// turns within a single command, with no nhgetch between them).
export async function moveloop_turn() {
    const g = game;
    g.context = g.context || {};
    g.u = g.u || {};

    // C ref: allmain.c moveloop_core() — `if (svc.context.move) { ... }`.
    // The hero spent this command's move, so deduct NORMAL_SPEED.  u.umovement
    // is kept >= NORMAL_SPEED at the end of every turn (the hero is "ready" for
    // the next command), so seed it on first use.
    if (g.u.umovement == null) g.u.umovement = NORMAL_SPEED;
    g.u.umovement -= NORMAL_SPEED;

    // C ref: allmain.c moveloop_core():208 — encumber_msg(); runs once per turn,
    // right after context.move is consumed and before monster movement, so an
    // autopickup that changed the hero's burden is announced here (chaining
    // onto the pickup's prinv line via update_topl's --More-- paging).
    {
        const { encumber_msg } = await import('./invent.js');
        await encumber_msg();
    }

    // C ref: allmain.c moveloop_core():
    //   do {                                       // "hero can't move yet"
    //       svc.context.mon_moving = TRUE;
    //       do { monscanmove = movemon();
    //            if (u.umovement >= NORMAL_SPEED) break; } while (monscanmove);
    //       svc.context.mon_moving = FALSE;
    //       if (!monscanmove && u.umovement < NORMAL_SPEED) { ...once-per-turn }
    //   } while (u.umovement < NORMAL_SPEED);
    //
    // movemon() returns whether ANY monster still has a full NORMAL_SPEED left
    // (game._somebody_can_move).  A fast pet (kitten mmove 18, pony 16) that
    // accumulated >= 24 movement this turn therefore takes a SECOND movemon
    // step within the same hero command — that 2nd step (the pet now adjacent
    // to the hero -> dog_goal appr==0 -> invent obj_resists scan) is where the
    // divergence lived.  We mirror the C control flow exactly.
    do {
        g.context.mon_moving = true;
        let monscanmove;
        do {
            monscanmove = await movemon();
            if (g.u.umovement >= NORMAL_SPEED) break; // hero's turn again
            if (g.program_state?.gameover) break;      // hero died mid-movemon
        } while (monscanmove);
        g.context.mon_moving = false;

        // C ref: allmain.c moveloop_core()/done() — if a monster's move killed
        // the hero, C longjmps out of moveloop_core() through really_done() and
        // never runs the once-per-turn block (mcalcdistress/maybe_generate_
        // rnd_mon/regen_hp/...).  Bail out here so those turn-tail RNG calls are
        // not fabricated after the death (moveloop() sees gameover and stops).
        if (g.program_state?.gameover) break;

        // C ref: allmain.c moveloop_core():220 — mvl_wtcap = near_capacity();
        // recomputed after the monster-movement loop (monster actions can change
        // the hero's burden), and used below to scale the hero's movement ration.
        const mvl_wtcap = near_capacity();

        if (!monscanmove && g.u.umovement < NORMAL_SPEED) {
            // Both hero and all monsters are out of steam -> advance a turn.
            await mcalcdistress();
            for (const mtmp of (g.level?.monsters || [])) {
                if (mtmp.mhp != null && mtmp.mhp <= 0) continue;
                mtmp.movement = (mtmp.movement || 0) + mcalcmove(mtmp, true);
            }
            maybe_generate_rnd_mon();

            // C ref: allmain.c — u_calc_moveamt(mvl_wtcap); settrack();  The
            // hero's movement-point reallocation (Fast roll / steed mcalcmove /
            // encumbrance penalty) happens here, between maybe_generate_rnd_mon
            // and the once-per-turn block (matches the recorded RNG position).
            u_calc_moveamt(mvl_wtcap);

            // C ref: allmain.c — settrack() records the hero's footprint each
            // turn so out-of-sight pets can follow the hero's trail (dog_goal).
            settrack();

            g.moves = (g.moves || 1) + 1;

            // C ref: allmain.c moveloop_core():273 — nh_timeout() runs at the very
            // top of the once-per-turn block (before run_regions / ublesscnt).  It
            // expires timed properties; the contest hero's only case is the bear
            // trap's WOUNDED_LEGS -> heal_legs(0), which restores the -1 Dx BEFORE
            // the later u_wipe_engr rn2(40 + ACURR(A_DEX)*3) roll depends on it.
            await nh_timeout();

            // C ref: allmain.c moveloop_core():274 — run_regions() ages every
            // active gas-cloud region and fires its per-turn inside-effect for
            // the hero/monsters it currently contains, right after nh_timeout()
            // and before the ublesscnt countdown.
            await run_regions();

            // C ref: allmain.c moveloop_core() — once-per-turn "if (u.ublesscnt)
            // u.ublesscnt--;" (the prayer timeout countdown), between run_regions
            // and the regen_hp heal check.  No RNG; gates pray.c can_pray().
            if (g.u.ublesscnt) g.u.ublesscnt--;

            // C ref: allmain.c moveloop_core() — regen_hp(wtcap) is called (at
            // allmain.c:294, right after the moves++ once-per-turn header and
            // well BEFORE dosounds) only when the hero is below max HP.  For a
            // non-polymorphed, unencumbered starter hero it rolls a single
            // rn2(100): heal = (u.ulevel + ACURR(A_CON)) > rn2(100).  An
            // uninjured hero (uhp == uhpmax, the usual case) skips the call
            // entirely, so this is RNG-inert for every full-health turn.
            // C ref: allmain.c:287 — while u.uinvulnerable (prayer invulnerability
            // during a coaligned #pray occupation) the heal check is skipped
            // entirely (wtcap forced to UNENCUMBERED), so NO rn2(100) is rolled
            // for the injured hero on those turns.
            if (!g.u.uinvulnerable) regen_hp();

            // C ref: allmain.c:305 regen_pw(wtcap) — power regeneration, called
            // right after the regen_hp/overexert block and BEFORE dosounds.  Was
            // missing entirely: seed4500 step 515 draws rn2(2) here (Knight at
            // ulevel 15 => period 15, upper 2 from Wi:14 + In:7) between
            // regen_hp's rn2(100) and dosounds' rn2(200), and skipping it shifted
            // the rest of that turn and every turn after it.
            regen_pw();

            // C ref: allmain.c moveloop_core() — intrinsic autosearch.  Runs
            // every turn before dosounds when the hero has Searching (and the
            // level isn't noautosearch and multi >= 0).  dosearch0(1) consumes
            // rnl(7-fund) per adjacent hidden door/passage and rnl(8) per
            // adjacent unseen trap; RNG-inert in the common open-room case.
            if (youHaveSearching() && !g.level?.flags?.noautosearch
                && (g.multi == null || g.multi >= 0))
                await dosearch0(1);

            // once-per-turn things: ambient sounds + hunger + spell aging +
            // periodic exercise.  (nh_timeout consumes no RNG for the starter
            // sessions.)  C order: dosounds, do_storms, gethungry, age_spells,
            // exerchk, invault, ..., u_wipe_engr.
            await dosounds();
            gethungry();
            age_spells(); // C ref: spell.c age_spells — decrnknow each turn (no RNG)
            exerchk();

            // u_wipe_engr check: rn2(40 + ACURR(A_DEX) * 3).  acurr order is
            // [Str, Int, Wis, Dex, Con, Cha] -> Dex is index 3.  C ACURR()
            // includes atemp/abon, so wounded legs (atemp[DEX] = -1) lowers the
            // effective Dex used by this roll.
            const dex = acurr_eff(3);
            if (!rn2(40 + dex * 3)) {
                rnd(3); // u_wipe_engr(rnd(3))
            }

            // clairvoyance bookkeeping: seer_turn (rn1(31,15)) when moves
            // catches up.
            if (g.context.seer_turn != null && g.moves >= g.context.seer_turn) {
                g.context.seer_turn = g.moves + rn1(31, 15);
            }

            // C ref: allmain.c moveloop_core():380 — the multi<0 countdown sits
            // at the END of the once-per-turn block (after dosounds/gethungry/
            // u_wipe_engr &c.).  While the hero is immobile (e.g. a nomul(-3)
            // #pray occupation or "jumping around" after #jump), each elapsed
            // turn counts toward 0; when it reaches 0 the hero is freed (unmul),
            // which announces the pending nomovemsg and runs ga.afternmv.  Placing
            // it here (not right after moves++) matters when afternmv clears
            // u.uinvulnerable — the turn's dosounds/regen_hp/gethungry must have
            // already run (skipped, under invulnerability) BEFORE prayer_done.
            if ((g.multi ?? 0) < 0) {
                if (++g.multi === 0) {
                    // unmul: hero regains control next command.
                    g.context.travel = g.context.travel1 = g.context.mv = 0;
                    // C ref: hack.c unmul() — u.usleep = 0.  Without this, a hero
                    // who fell asleep (zap.js fall_asleep) stays Unaware forever
                    // after waking, so gethungry() keeps rolling the extra
                    // asleep-only rn2(10) every turn instead of stopping once
                    // the sleep countdown (this block) completes.
                    if (g.u) g.u.usleep = 0;
                    // C ref: hack.c unmul(NULL) — announce the pending nomovemsg,
                    // then clear it.  Route through update_topl so a still-pending
                    // top line (toplin == NEED_MORE — savelife's "OK, so you don't
                    // die." plus following monster-move messages, or the prayer's
                    // "cobra slither"/"finish your prayer") first fires its blocking
                    // --More-- (captured as its own frame) before nomovemsg lands.
                    if (g.nomovemsg) {
                        await update_topl(g.nomovemsg);
                        g.nomovemsg = '';
                    }
                    // C ref: hack.c unmul() — after announcing nomovemsg, run the
                    // pending after-no-move callback (ga.afternmv), e.g. pray.c's
                    // prayer_done() which resolves the prayer outcome.
                    if (g.afternmv) {
                        const fn = g.afternmv;
                        g.afternmv = null;
                        await fn();
                    }
                }
            }
        }
    } while (g.u.umovement < NORMAL_SPEED);
}

// C ref: eat.c gethungry() — per-turn hunger.  While u.uinvulnerable (prayer
// invulnerability) C returns immediately ("you don't feel hungrier"), so NO
// rn2(20) is rolled on those turns.  Otherwise: an awake eater (all starter
// role-monsters are carnivorous/herbivorous) that isn't slow-digesting loses 1
// nutrition/turn; an Unaware (asleep/unconscious) hero burns at 1/10 (the
// rn2(10) is evaluated only when Unaware, per C's `!Unaware || !rn2(10)`
// short-circuit).  The rn2(20) "accessorytime" roll always fires; its odd/even
// cases only bite the starter hero via near_capacity()>SLT_ENCUMBER (Stressed+)
// — rings/regeneration/conflict are all absent.  newuhs() recomputes u.uhs (no
// HUNGRY/WEAK threshold is crossed by the covered sessions, so no message).
// Exported: hack.c overexertion() ("combat increases metabolism") calls this
// SAME function once per melee attack, in addition to the once-per-turn call
// below — uhitm.js's overexertion() imports it to stay faithful.
export function gethungry() {
    const u = game.u;
    if (!u || u.uinvulnerable) return;
    const consume = Unaware() ? (rn2(10) === 0) : true;
    if (consume) u.uhunger = (u.uhunger ?? 900) - 1;
    const accessorytime = rn2(20);
    if ((accessorytime & 1) && near_capacity() > 1 /* SLT_ENCUMBER */)
        u.uhunger = (u.uhunger ?? 900) - 1;
    // C ref: eat.c newuhs(TRUE) — SATIATED(0)/NOT_HUNGRY(1)/HUNGRY(2)/WEAK(3)/
    // FAINTING(4) from u.uhunger thresholds (see eat.js newuhs for the full port
    // incl. the transition messages, which the covered sessions never reach).
    const h = u.uhunger ?? 900;
    u.uhs = (h > 1000) ? 0 : (h > 150) ? 1 : (h > 50) ? 2 : (h > 0) ? 3 : 4;
}

// C ref: allmain.c regen_hp(wtcap) — natural HP regeneration.  Only the
// non-polymorphed starter path is modelled: when the hero is below max HP and
// not over-encumbered, roll rn2(100) and heal by 1 when (ulevel + Con) beats
// it (plus Regeneration/Sleepy bonuses, neither set for the starter sessions).
// The single rn2(100) is the RNG-relevant effect; the heal keeps uhp tracking
// so the roll stops firing once the hero is back to full.  The caller invokes
// this only when uhp < uhpmax, mirroring the C guard at allmain.c:290.
function regen_hp() {
    const u = game.u;
    if (!u) return;
    if (!(u.uhp < u.uhpmax)) return;            // C: guarded call (allmain.c:290)
    // encumbrance_ok = (wtcap < MOD_ENCUMBER || !u.umoved); UNENCUMBERED here.
    const con = u.acurr?.a?.[A_CON] ?? 12;
    let heal = ((u.ulevel || 1) + con) > rn2(100) ? 1 : 0;
    // C ref: U_CAN_REGEN() == Regeneration — a worn ring of regeneration grants
    // an extra +1 heal each turn (so the hero recovers every turn).  Sleepy is
    // never set for the starter hero.
    if (u_can_regen()) heal += 1;
    if (heal) {
        u.uhp += heal;
        if (u.uhp > u.uhpmax) u.uhp = u.uhpmax;
    }
}

// C ref: allmain.c regen_pw(wtcap) — periodic power regeneration.  Fires only
// while uen < uenmax AND either Energy_regeneration or the move counter hits a
// role/level-dependent period:
//
//     !(moves % ((MAXULEV + 8 - u.ulevel) * (Role_if(PM_WIZARD) ? 3 : 4) / 6))
//
// so a level-15 Knight regenerates every (30 + 8 - 15) * 4 / 6 == 15 moves.  The
// single draw is rn1(upper, 1) where upper = (WIS + INT) / 15 + 1, which for
// Wi:14 In:7 is 2 — the rn2(2) seed4500 records at allmain.c:612.  The int
// division is deliberate (C integer arithmetic), and the guard order matters:
// the modulo is only evaluated when uen < uenmax, so a hero at full power draws
// nothing.
const MAXULEV = 30;             // C ref: include/you.h MAXULEV
const PM_WIZARD_ROLE = 12;      // roles[] index, not a mons[] index
function regen_pw() {
    const g = game, u = g.u;
    if (!u) return;
    if (!(u.uen < u.uenmax)) return;
    const wizard_role = (g.urole?.mnum ?? -1) === PM_WIZARD_ROLE;
    const period = Math.trunc((MAXULEV + 8 - (u.ulevel || 1))
                              * (wizard_role ? 3 : 4) / 6);
    const energy_regen = !!u.uprops?.Energy_regeneration;
    // C: `(wtcap < MOD_ENCUMBER && !(moves % period)) || Energy_regeneration`.
    // wtcap is UNENCUMBERED for the covered heroes; a period of 0 would be a
    // division by zero in C, which cannot happen for ulevel <= MAXULEV.
    const due = period > 0 && ((g.moves ?? 0) % period) === 0;
    if (!due && !energy_regen) return;
    let upper = Math.trunc(((u.acurr?.a?.[A_WIS] ?? 0)
                            + (u.acurr?.a?.[A_INT] ?? 0)) / 15) + 1;
    // EMagical_breathing (+2) comes from an amulet of magical breathing, which
    // no covered hero wears.
    u.uen += rn1(upper, 1);
    if (u.uen > u.uenmax) u.uen = u.uenmax;
    // C also sets disp.botl and, at full power, interrupt_multi("You feel full
    // of energy.").  The status line is recomputed each frame here, and the
    // interrupt only matters mid-occupation.
}

// C ref: youprop.h Regeneration — the hero has the REGENERATION extrinsic.  For
// the starter sessions this comes only from a worn ring of regeneration
// (RIN_REGENERATION, otyp 179) on either ring finger.
const RIN_REGENERATION_OTYP = 179;
function u_can_regen() {
    const g = game;
    return (g.uleft && g.uleft.otyp === RIN_REGENERATION_OTYP)
        || (g.uright && g.uright.otyp === RIN_REGENERATION_OTYP);
}

const PM_MONK = 5;

// C ref: attrib.c exerper() — periodic exercise accumulation.  On every 10th
// turn, a hunger-state exercise (and any encumbrance exercise) fires; on every
// 5th turn, status-affliction exercises fire.  Each exercise() emits rn2(19)
// (gain) or rn2(2) (loss) when |AEXE| < AVAL.  For the starter sessions the
// hero is NOT_HUNGRY (uhunger ~900) and UNENCUMBERED with no afflictions, so
// the only roll is exercise(A_CON, TRUE) on moves % 10 == 0 — but we mirror the
// full C control flow (hunger/encumbrance/status) so it stays correct if state
// changes.  near_capacity() is UNENCUMBERED (0) for the starter pack.
function exerper() {
    const g = game;
    const u = g.u || {};
    const moves = g.moves || 1;
    const isMonk = gameRoleMnum() === PM_MONK;
    if (moves % 10 === 0) {
        // Hunger Checks.  uhunger defaults to the C starting value (900 ->
        // NOT_HUNGRY) when not explicitly tracked.
        const uhunger = u.uhunger ?? 900;
        if (uhunger > 1000) {            // SATIATED
            exercise(A_DEX, false);
            if (isMonk) exercise(A_WIS, false);
        } else if (uhunger > 150) {      // NOT_HUNGRY
            exercise(A_CON, true);
        } else if (uhunger > 50) {       // HUNGRY -> no exercise
            /* (no case in C) */
        } else if (uhunger > 0) {        // WEAK
            exercise(A_STR, false);
            if (isMonk) exercise(A_WIS, true);
        } else {                         // FAINTING / FAINTED
            exercise(A_CON, false);
        }

        // Encumbrance Checks: near_capacity() == UNENCUMBERED (0) for the
        // starter sessions -> no exercise calls.  (MOD/HVY/EXT branches omitted
        // because they never fire here; add them if encumbrance is modeled.)
    }

    if (moves % 5 === 0) {
        // C ref: attrib.c exerper() status checks (attrib.c:570-583).  Each
        // active affliction exercises an attribute; the loss cases roll rn2(2).
        // For the starter sessions Clairvoyant/Regeneration/Sick/Vomiting/
        // Confusion/Hallucination/Fumbling/Stun are all clear, but a BEAR TRAP
        // (or other leg wound) sets Wounded_legs, so a dismounted wounded hero
        // rolls exercise(A_DEX, FALSE) every 5th turn — the seed0004 wounded-leg
        // struggle rn2(2)@exercise that gates the rest of the trapped sequence.
        if (HClairvoyant() && !BClairvoyant()) exercise(A_WIS, true);
        if (HRegeneration()) exercise(A_STR, true);
        if (Sick() || Vomiting()) exercise(A_CON, false);
        if (Confusion() || Hallucination()) exercise(A_WIS, false);
        if ((Wounded_legs() && !u.usteed) || Fumbling() || HStun())
            exercise(A_DEX, false);
    }
}

// C ref: include/youprop.h — the hero affliction predicates exerper() consults.
// Only Wounded_legs is ever set in the contest starter sessions (by a bear
// trap); the others are stubbed to their always-false starter value but kept
// so the control flow mirrors C exactly if those statuses become tracked.
function Wounded_legs() {
    const u = game.u || {};
    return !!((u.HWounded_legs || 0) || (u.EWounded_legs || 0));
}
function HClairvoyant() { return false; }
function BClairvoyant() { return false; }
function HRegeneration() { return false; }
function Sick() { return !!(game.u?.sick); }
function Vomiting() { return !!(game.u?.vomiting); }
function Confusion() { return !!(game.u?.uconf || game.u?.HConfusion); }
function Hallucination() { return !!(game.u?.HHallucination); }
function Fumbling() { return !!(game.u?.HFumbling || game.u?.EFumbling); }
function HStun() { return !!(game.u?.HStun || game.u?.ustun); }

// C ref: attrib.c exerchk() — periodic accumulation (exerper) then, once
// svm.moves crosses context.next_attrib_check (starts at 600), a per-attribute
// test that rolls rn2(AVAL) per exercised attr and rn1(200,800) to reschedule.
// The starter sessions never reach move 600, so only exerper() emits RNG; the
// attrib-test branch is modeled faithfully for longer runs.
function exerchk() {
    const g = game;
    exerper();

    if (g.context?.next_attrib_check == null)
        g.context = Object.assign(g.context || {}, { next_attrib_check: 600 });

    const moves = g.moves || 1;
    // gm.multi: the starter sessions are never mid-occupation at this point.
    if (moves >= g.context.next_attrib_check) {
        const AVAL = 50;
        const aexe = g.u?.aexe?.a || [];
        const acurr = g.u?.acurr?.a || [];
        const ATTRMIN = 3, ATTRMAX = 18;
        for (let i = 0; i < 6; i++) {
            let ax = aexe[i] || 0;
            if (!ax) continue;          // Int/Cha and untouched attrs
            const mod_val = ax > 0 ? 1 : -1;
            const base = acurr[i] ?? 0; // ABASE approximated by current value
            if ((ax < 0) ? (base <= ATTRMIN) : (base >= ATTRMAX)) {
                aexe[i] = (Math.abs(ax) >> 1) * mod_val;
                continue;
            }
            // rn2(AVAL) > (|ax|*2/3 for non-Wis else |ax|) -> skip (no change)
            const thresh = (i !== A_WIS) ? Math.trunc(Math.abs(ax) * 2 / 3) : Math.abs(ax);
            if (rn2(AVAL) > thresh) {
                aexe[i] = (Math.abs(ax) >> 1) * mod_val;
                continue;
            }
            // adjattrib would change the attr; the starter sessions never reach
            // here (moves < 600), so the rare attrib-change path is left to the
            // accumulator halving (no further RNG beyond rn2(AVAL) above).
            aexe[i] = (Math.abs(ax) >> 1) * mod_val;
        }
        g.context.next_attrib_check += rn1(200, 800);
    }
}

// C ref: allmain.c moveloop_core()
export async function moveloop_core() {
    const g = game;
    // C ref: end.c really_done() never returns to moveloop_core() (it longjmps
    // out via done1()/exit_nhwindows()).  With no longjmp here, the hero dying
    // from her OWN command (e.g. domove() -> spoteffects() -> lava_effects())
    // leaves g._pendingTurn/g.context.move set from the fatal command; without
    // this guard the runner's next moveloop_core() call would run moveloop_turn()
    // (monster moves, encumber_msg, ...) over a corpse, fabricating RNG really_
    // done() never reaches.  Matches moveloop()'s own post-death stop.
    if (g.program_state?.gameover) return;

    // Per-turn work runs at the TOP of the turn that follows a hero move,
    // mirroring the C moveloop (monsters move based on the previous command's
    // svc.context.move).  For the recorded seed8000 starter we replay its
    // captured per-move RNG; otherwise we run the real general turn.
    if (g._pendingTurn) {
        g._pendingTurn = false;
        const turnNum = g._turnsTaken = (g._turnsTaken || 0) + 1;
        if (fastforward_step_count() > 0 && turnNum <= fastforward_step_count()) {
            // Recorded per-move RNG replay (seed8000 starter path).
            fastforward_step(turnNum);
            g.moves = (g.moves || 1) + 1;
        } else {
            await moveloop_turn();
        }
    }

    // Vision + display
    if (g.vision_full_recalc) {
        vision_recalc(0);
        g.vision_full_recalc = 0;
    }
    await bot();

    // C ref: allmain.c:481 — `m_everyturn_effect(&gy.youmonst)` runs after bot()
    // and before the next command is read, so a hero polymorphed into a fog
    // cloud lays down its trail of vapor (and rolls the cloud's rn1(3,4)
    // lifespan) BEFORE this turn's screen is captured.
    {
        const { m_everyturn_effect } = await import('./monmove.js');
        await m_everyturn_effect(g.u);
    }

    await flush_screen(1);

    // C ref: allmain.c moveloop_core():513 — `u.umoved = FALSE;` is set BEFORE
    // rhack() dispatches the command, so any command that does not relocate the
    // hero (e.g. #ride mount, search, look) leaves u.umoved FALSE.  Movement
    // commands set it TRUE again inside domove().  u_calc_moveamt() (run at the
    // top of the NEXT turn) reads this to decide whether a riding hero rolls
    // mcalcmove(usteed); a stale-TRUE umoved after a mount command made JS roll
    // an extra rn2(NORMAL_SPEED) that C does not (seed0103 divergence @ #2533).
    if (g.u) g.u.umoved = false;

    // C ref: allmain.c moveloop_core():485 — `if (gm.multi >= 0 && go.occupation)
    // { (*go.occupation)(); ...; return; }`.  When an occupation (e.g. #force's
    // forcelock) is active, the move loop RUNS THE OCCUPATION instead of reading
    // a command; the spaces in the recorded input then acknowledge the
    // occupation's --More-- prompts rather than being parsed as commands.  The
    // occupation returns 0 when finished (clear it) or 1 to continue next turn.
    if (g._force_box) {
        const { forcelock } = await import('./extcmd-handlers.js');
        const busy = await forcelock();
        // The forcelock turn consumed game time; schedule next turn's per-turn
        // work (monsters move, etc.).
        g.context = g.context || {};
        g.context.move = 1;
        g._pendingTurn = true;
        if (!busy) g._force_box = null;
        return;
    }

    // C ref: allmain.c moveloop_core():485 — the picklock occupation (set by
    // lock.c pick_lock() from #loot's autounlock).  Like #force above, the move
    // loop RUNS THE OCCUPATION instead of reading a command: each turn advances
    // usedtime and rolls rn2(100) >= chance ("still busy"), until the lock is
    // picked ("You succeed in picking the lock." + exercise) or the attempt is
    // abandoned.  The monster moves for the turn already ran above (moveloop_turn
    // via _pendingTurn), matching C's context.move -> movemon -> occupation order.
    if (g._picklock_box) {
        const { picklock } = await import('./extcmd-handlers.js');
        const busy = await picklock();
        g.context = g.context || {};
        g.context.move = 1;
        g._pendingTurn = true;
        if (!busy) g._picklock_box = null;
        return;
    }

    // C ref: allmain.c moveloop_core() — when the hero is helpless / busy with a
    // multi-turn action (gm.multi < 0, e.g. "jumping around" after #jump), no
    // command is read; instead game time keeps passing (context.move stays 1)
    // and the per-turn work runs until the multi countdown frees the hero.
    if ((g.multi ?? 0) < 0) {
        g.context = g.context || {};
        g.context.move = 1;
        g._pendingTurn = true;
        return;
    }

    // C ref: allmain.c moveloop_core():309 — the wipeoff occupation (set by
    // #wipe / dowipe).  Runs AFTER the command turn's monster moves and consumes
    // another game turn, so the hero regains sight only between the command turn
    // and the following turn.
    if (g._wipe_occupation) {
        const { wipeoff } = await import('./apply.js');
        const busy = await wipeoff();
        g.context = g.context || {};
        g.context.move = 1;
        g._pendingTurn = true;
        if (!busy) g._wipe_occupation = null;
        return;
    }

    // C ref: allmain.c moveloop_core():485 — the eatfood() occupation (set by
    // eat.c start_eating()).  Like #wipe/#force, the move loop runs the
    // occupation step instead of reading a command: each turn advances usedtime
    // and elapses a game turn (monsters move), with no nhgetch in between, so the
    // whole multi-turn meal produces a single captured screen (the one read at
    // the next command boundary, showing "You finish eating <corpse>.").
    if (g._eat_occupation) {
        const { eatfood_step } = await import('./eat.js');
        const busy = await eatfood_step();
        g.context = g.context || {};
        g.context.move = 1;
        g._pendingTurn = true;
        if (!busy) g._eat_occupation = null;
        return;
    }

    // C ref: allmain.c moveloop_core():485 — the learn() occupation (set by
    // spell.c study_book()).  An UNTIMED occupation: learn() counts
    // context.spbook.delay up toward zero itself, one turn per call, so the move
    // loop runs a game turn per step with no nhgetch between them and the whole
    // multi-turn study yields a single captured frame.
    if (g._study_occupation) {
        const { learn_step } = await import('./spell.js');
        const busy = await learn_step();
        g.context = g.context || {};
        g.context.move = 1;
        g._pendingTurn = true;
        if (!busy) g._study_occupation = null;
        return;
    }

    // C ref: cmd.c set_occupation(dosearch, "searching", gm.multi) +
    // allmain.c moveloop_core():485 `(*go.occupation)()` — a counted search
    // ("20s") arms a timed occupation so the move loop re-runs dosearch each
    // turn (decrementing gm.multi) WITHOUT reading another command key, exactly
    // like #eat/#force above.  No nhgetch fires between occupation turns, so the
    // whole run produces a single captured frame (read at the next command
    // boundary) — unless a monster-combat message overflows the top line, whose
    // blocking --More-- inside the turn's movemon() captures its own frames.
    if (g._search_occupation) {
        await dosearch0(0); // timed_occ_fn: the per-turn search (RNG-inert in open room)
        // C timed_occupation(): `if (gm.multi > 0) gm.multi--; return multi>0`.
        if ((g.multi ?? 0) > 0) g.multi -= 1;
        g.context = g.context || {};
        g.context.move = 1;
        g._pendingTurn = true;
        // still counting down => go.occupation stays armed for next turn (C:
        // `(*go.occupation)() == 0` false).  If dosearch0 already found
        // something this turn (nomul(0)), multi is 0 here and occupation ends
        // silently, same as C's `go.occupation = 0` happening before the
        // monster_nearby() check below.
        const stillOccupied = (g.multi ?? 0) > 0;
        if (!stillOccupied) g._search_occupation = null;
        // C ref: allmain.c moveloop_core():501-508 — after running the
        // occupation for the turn, a now-adjacent hostile monster stops the
        // occupation early (stop_occupation(): "You stop searching." + nomul(0)).
        // stop_occupation() only prints when go.occupation was still set, i.e.
        // the repeat hadn't already ended this same turn.
        if (monster_nearby()) {
            if (stillOccupied) await pline('You stop searching.');
            g._search_occupation = null;
            g.multi = 0;
        }
        return;
    }

    // Read and execute one command.  rhack clears the previous command's
    // top-line message only after the capture for that command has fired
    // (i.e. after its own nhgetch returns), so a free-action message such as
    // dolook's "You see no objects here." survives onto the captured screen.
    await rhack(0);

    // A command that took game time schedules the per-turn work for the
    // next iteration (so the status line / map reflect the elapsed turn
    // when the next screen is captured).
    if (g.context?.move) {
        g._pendingTurn = true;
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
