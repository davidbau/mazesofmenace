// allmain.js — Main game loop.
// C ref: allmain.c — newgame, moveloop, moveloop_core.
//
// Uses fastforward.js for startup RNG gaps not yet covered by ported init
// (see .cursor/plans/nethack-port/10-moveloop-detect-c-map.md). mklev.js
// owns structural dungeon generation.

import { game } from './gstate.js';
import { mklev, l_nhcore_init, u_on_upstairs } from './mklev.js';
import { rhack } from './cmd.js';
import { docrt, cls, bot, flush_screen, pline, clearPendingMessageAndToplineLikeC } from './display.js';
import {
    vision_recalc, vision_reset, init_vision_globals,
    noticeMonOffLikeC, noticeMonOnLikeC, noticeAllMonsLikeC, dolookaroundLikeC,
} from './vision.js';
import { genders, roleHasFemaleRoleNameLikeC } from './roles.js';
import { initObjectsLikeC } from './o_init.js';
import { roleInitLikeC } from './role_init.js';
import { initDungeonsLikeC } from './dungeon_init.js';
import { fastforward_pre_mklev } from './fastforward.js';
import { uInitInventoryAttrsLikeC } from './u_init_post_mklev.js';
import { makedogLikeC } from './makedog.js';
import { checkSpecialRoomNewgameFalseLikeC } from './spoteffects.js';
import {
    runMoveloopPreambleBeforeRhackLikeC,
    runPostCommandTurnAdvanceLikeC,
    clearLeavingTutorialIfActiveLikeC,
} from './moveloop_turn_advance.js';
import { applyBirthHpEnergy } from './u_init_hp_energy.js';
import { applyAdjabil } from './u_init_adjabil.js';
import { findAc } from './u_init_find_ac.js';
import { applySkillInit } from './u_init_skills.js';
import { UHS } from './hunger.js';
import { moveloopPreamble } from './moveloop_preamble.js';
import { initMvitalsStub } from './mvitals.js';
import { initArtidiscoHeroLikeC } from './artifact_discover_like_c.js';
import { bootstrapSpLevchnMinesMinetnFromBranchStubLikeC } from './sp_levchn.js';
import { maybeRecordEnteredNewLevelLivelogLikeC } from './livelog.js';
import { awaitLegacyIntroMoreLikeC } from './legacy_intro.js';
import { rn2 } from './rng.js';
import { LAST_PROP } from './const.js';

// C ref: allmain.c newgame()
export async function newgame() {
    const g = game;

    /* C: allmain.c newgame — welcome before monster-notice plines (flag.h notice_mon_off) */
    noticeMonOffLikeC();
    /* C: u_init_misc / moveloop — svm.moves==0 until u_init_role sets 1 (u_init.c u_init_role) */
    g.moves = 0;

    /* C: o_init.c init_objects — gem colors, description shuffles, WAN_NOTHING oc_dir. */
    initObjectsLikeC();
    /* C: allmain.c — flags.pantheon = -1; role_init() before init_dungeons(). */
    g.flags = g.flags || {};
    g.flags.pantheon = -1;
    /* C: optlist.h autoopen — default On (opt_out); hack.c test_move DO_MOVE closed door. */
    if (g.flags.autoopen === undefined) g.flags.autoopen = true;
    /* C: flag.h flags.acoustics — dosounds() early-out when false (default on). */
    if (g.flags.acoustics === undefined) g.flags.acoustics = true;
    roleInitLikeC(g);
    /* C: init_dungeons nhl_init → nhlib.lua align shuffle (until dungeon Lua loader is ported). */
    rn2(3);
    rn2(2);
    initDungeonsLikeC(g);
    fastforward_pre_mklev();

    /* C u_init.c u_init_misc — handedness (allmain.c newgame after init_dungeons). */
    g.u = g.u || {};
    g.u.left_handed = (rn2(10) === 0);

    // C ref: allmain.c l_nhcore_init() — shuffle align[] for Lua
    l_nhcore_init();

    // Set up game state needed by mklev (dungeons[] from initDungeonsLikeC)
    g.u.dx |= 0;
    g.u.dy |= 0;
    g.u.uz = { dnum: 0, dlevel: 1 };
    // Hardcoded player state for early stub (C u_init_misc zeroing / defaults before newhp).
    g.u.umortality = 0;
    g.u.Half_physical_damage = 0;
    g.u.uexp = 0;
    g.u.urexp = 0; /* C: u_init / exper.c — score-style experience accumulator */
    g.u.ualign = g.u.ualign || { type: 0, record: 0 };
    g.u.uhs = UHS.NOT_HUNGRY; /* port eat.c / moveloop when hunger advances */
    /* C: eat.c init_uhunger — u.uhunger = 900 (NOT_HUNGRY band for exerper) */
    g.u.uhunger = 900;
    g.u.near_capacity = 0; /* C: near_capacity(); port invent weight when ready */
    g.u.Levitation = 0;
    g.u.HLevitation = 0;
    g.u.ELevitation = 0;
    g.u.BLevitation = 0; /* youprop.h BLevitation — switch_terrain FROMOUTSIDE block */
    g.u.Flying = 0;
    g.u.HFlying = 0;
    g.u.EFlying = 0;
    g.u.BFlying = 0;
    g.u.BStealth = 0; /* youprop.h BStealth — polyself.c steed_vs_stealth FROMOUTSIDE when mounted */
    g.u.Fumbling = 0;
    g.u.Sleep_resistance = 0;
    g.u.timed = { blind: 0, deaf: 0 };
    g.u.resists_blind = 0;
    g.u.See_invisible = 0;
    g.u.Fire_resistance = 0;
    g.u.Wwalking = 0; /* youprop.h WATER — water walking (boots); trap.c lava_effects / drown */
    g.u.Cold_resistance = 0;
    g.u.HInvis = 0;
    g.u.EInvis = 0;
    g.u.Antimagic = 0;
    g.u.noteleport = 0;
    g.u.Hallucination = 0;
    g.u.Poison_resistance = 0;
    g.u.Stealth = 0;
    g.u.Fast = 0;
    g.u.HRegeneration = 0; /* prop.c — intrinsic; high bits (e.g. FROMFORM) when poly grants from form */
    g.u.ERegeneration = 0; /* extrinsic sources bitmask (eat.c gethungry excludes W_ARTI|W_WEP) */
    g.u.Hunger = 0;
    g.u.Breathless = 0; /* eat.c choke */
    g.u.Strangled = 0;
    /* C: prop.h Slimed — timeout.c burn_away_slime / make_slimed; no slime timer yet */
    g.u.Slimed = 0;
    g.u.HConflict = 0;
    g.u.EConflict = 0; /* extrinsic conflict sources (gethungry excludes W_ARTI only) */
    g.u.HWarning = 0;
    g.u.EWarning = 0; /* youprop.h Warning — ice melt timer plines in spoteffects */
    g.u.HWarn_of_mon = 0;
    g.u.EWarn_of_mon = 0; /* youprop.h Warn_of_mon — display.h sensemon / shop angry_guards */
    g.u.HTelepat = 0;
    g.u.ETelepat = 0; /* Blind + sensemon subset for spoteffects surprise */
    g.u.uwep = null;
    g.u.uswapwep = null;
    g.u.uquiver = null;
    g.u.twoweap = false;
    g.u.uarmh = null;
    g.u.uarms = null;
    g.u.uarmc = null;
    g.u.uarm = null;
    g.u.uarmu = null;
    g.u.uarmg = null; /* gloves — port invent wear when ready */
    /* C: you.h uhave — eat.c gethungry switch case 16 (carried real Amulet) */
    g.u.uhave = { amulet: 0 };
    g.u.uamul = null;
    g.u.uleft = null;
    g.u.uright = null;
    g.u.Unaware = 0; /* eat.c gethungry — asleep / !rn2(10) metabolic branch */
    g.u.EProtection = 0; /* prop.c subset — wear.js refreshEProtectionFromRings sets W_RING* from rings */
    /* C: you.h `struct u_property u.uprops[LAST_PROP+1]` — stub; pray.c / prop.c set `[PROTECTION].intrinsic` (youprop.h HProtection). Helpers: `divine_protection.js`; `#pray` via `pray_hero.js` + `extcmd.js` tty line; `#chat` / priest.c via `priest_talk_hero.js`; `#sit` / sit.c throne + attrcurse via `sit_hero.js`. */
    {
        const up = new Array(LAST_PROP + 1);
        for (let i = 0; i <= LAST_PROP; i++) up[i] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
        g.u.uprops = up;
    }
    /* C: u_init.c u_init_misc — u.ublessed / u.uspellprot (you.h); pray / spell protection vs AC */
    g.u.ublessed = 0;
    g.u.uspellprot = 0;
    /* C u_init_misc — newhp()/newpw() with u.ulevel==0; adjabil(0,1); u.ulevel=u.ulevelmax=1 (before mklev) */
    g.u.ulevel = 0;
    g.u.ulevelmax = 0;
    applyBirthHpEnergy();
    applyAdjabil(0, 1);
    g.u.ulevel = 1;
    g.u.ulevelmax = 1;
    g.u.uhpinc = g.u.uhpinc || [];
    g.u.ueninc = g.u.ueninc || [];
    g.u.uhpinc[1] = g.u.uhpmax | 0;
    g.u.ueninc[1] = g.u.uenmax | 0;

    g.context = g.context || {};
    if (g.context.next_attrib_check == null) g.context.next_attrib_check = 600;
    g.context.victual = { eating: 0, fullwarn: 0, canchoke: 1 };
    /* C: allmain.c newgame — mvitals[i].mvflags = mons[i].geno & G_NOCORPSE (see mvitals.js initMvitalsStub) */
    initMvitalsStub(g);
    /* C: artifact.c **`init_artifacts`** — **`artidisco[]`** zeroed with **`artiexist[]`** */
    initArtidiscoHeroLikeC(g);

    g.flags = g.flags || {};
    /* C: hack.c flags.terrainstatus — gate classify_terrain; default on for new games */
    if (g.flags.terrainstatus === undefined) g.flags.terrainstatus = true;
    /* C: dungeon topology — mines **`dnum`** from init_dungeons branch list. */
    for (const br of g.branches || []) {
        if ((br.end2?.dnum | 0) > 0 && br.end1_up) {
            g.mines_dnum = br.end2.dnum | 0;
            break;
        }
    }
    bootstrapSpLevchnMinesMinetnFromBranchStubLikeC(g);
    // Real mklev generates the level with correct room positions
    // Structural phase consumes RNG for rooms/corridors/doors/stairs
    // C: do.c goto_level — **`if (new)`** after **`mklev`**; **`allmain.c`** **`newgame`** calls **`mklev()`** with **`u.uz`** on D:1 (no bones on brand-new game).
    if (await mklev()) maybeRecordEnteredNewLevelLivelogLikeC(g);

    /* C: allmain.c newgame — after mklev: place hero, vision, special room, starting pet, then invent. */
    u_on_upstairs();
    init_vision_globals();
    vision_reset();
    checkSpecialRoomNewgameFalseLikeC(g);
    makedogLikeC(g);
    uInitInventoryAttrsLikeC(g);

    g.multi = 0; /* C: gm.multi — multi-turn actions / occupation */
    g._prevMoveTick = 1;
    g.plname = g.plname || 'Contestant';

    await cls();
    await docrt();
    await flush_screen(1);
    await bot();

    /* C: u_init.c u_init_skills_discoveries — skill_init(); find_ac() after invent + docrt/bot */
    applySkillInit(g);
    findAc();
    vision_recalc(0);

    /* C: allmain.c newgame — `if (flags.legacy) com_pager(...)` before `welcome(TRUE)`. */
    await awaitLegacyIntroMoreLikeC();

    // Welcome message (C: allmain.c welcome(TRUE); pline format + buf like u_init.)
    const hi = welcomeInterjectionLikeC(g);
    const welcomeBuf = welcomeBufLikeC(g);
    /* C: allmain.c welcome() — `pline(..., "You are a%s.")`; tty recorder emits two spaces after `!` (matches public sessions). */
    await pline(`${hi} ${g.plname}, welcome to NetHack!  You are a${welcomeBuf}.`);

    /* C: allmain.c newgame — after welcome: notice_mon_on(); then dolookaround XOR notice_all_mons */
    noticeMonOnLikeC();
    if (g.a11y?.glyph_updates)
        dolookaroundLikeC();
    else
        noticeAllMonsLikeC(true);
}

/**
 * C: allmain.c welcome() — build buf after align_str (simplified: no adrift / restore branch).
 * !gu.urole.name.f plus both-sexes role mask in C maps to !roleHasFemaleRoleNameLikeC && allows.gender === 'any'
 * for genders[currentgend].adj; role title uses name.f only for Cave and Priest when female.
 */
function welcomeBufLikeC(g) {
    const t = g.u?.ualign?.type ?? 0;
    const alignName = t === 0 ? 'neutral' : t > 0 ? 'lawful' : 'chaotic';
    const female = !!g.flags?.female;
    const gendIdx = female ? 1 : 0;
    const roleRow = g.urole;
    const raceAdj = g.urace?.adj || 'human';
    let buf = ` ${alignName}`;
    if (!roleHasFemaleRoleNameLikeC(roleRow) && roleRow?.allows?.gender === 'any')
        buf += ` ${genders[gendIdx].adj}`;
    const roleTitle = female && roleHasFemaleRoleNameLikeC(roleRow)
        ? (roleRow.name.f || roleRow.name.m)
        : roleRow.name.m;
    buf += ` ${raceAdj} ${roleTitle}`;
    return buf;
}

/** C u_init.c — first word of welcome pline depends on role (tty sessions). */
function welcomeInterjectionLikeC(g) {
    const a = g.urole?.abbr;
    if (a === 'Tou') return 'Aloha';
    if (a === 'Sam') return 'Konnichi wa';
    if (a === 'Val') return 'Velkommen';
    if (a === 'Kni') return 'Salutations';
    return 'Hello';
}

// C ref: allmain.c moveloop_core()
export async function moveloop_core() {
    const g = game;
    g.context = g.context || {};

    await runMoveloopPreambleBeforeRhackLikeC(g);

    /* C: allmain.c — **`if (svc.context.move)`** at top: spend hero time + **`movemon`**
       for the *previous* command before reading the next one. */
    if (g.context.move) {
        if (g.context._searchInlinePostDoneLikeC) {
            /* C: inline **`#search`** post already ran in cmd.js — do not run moveloop post again. */
        } else {
            await runPostCommandTurnAdvanceLikeC(g);
        }
    }

    /* C: allmain.c — default assume next command costs time; rhack may clear it. */
    g.context.move = 1;

    await rhack(0);

    if (!g._retainMessageAfterCommand) clearPendingMessageAndToplineLikeC();
    g._retainMessageAfterCommand = false;

    g._prevMoveTick = g.context?.move ? 1 : 0;

    clearLeavingTutorialIfActiveLikeC(g);
}

// C ref: allmain.c moveloop()
export async function moveloop(resuming) {
    await moveloopPreamble(resuming);
    for (;;) {
        await moveloop_core();
        if (game.program_state?.gameover) break;
    }
}
