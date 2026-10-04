// wizcmds.js — Wizard-mode extended commands (partial).
// C ref: wizcmds.c

import { game } from './gstate.js';
import { cmd_from_func, ecname_from_fn, UNAVAILCMD } from './dokeylist.js';
import { pline, You, There, docrt, impossible, flush_topl_more, Warn_of_mon, glyph_at, glyph_is_monster, glyph_is_invisible_id, map_invisible, unmap_invisible, canspotmon, glyph_is_cmap, glyph_to_cmap, glyph_is_cmap_zap, glyph_to_mon, glyph_is_object, glyph_to_obj, NO_GLYPH, MAX_GLYPH, MAXPCHARS } from './display.js';
import { getlin, yn_function, ynq, y_n, paranoid_query } from './getline.js';
import { pluslvl, losexp } from './exper.js';
import { makewish } from './zap.js';
import { create_particular } from './read.js';
import { level_tele, migrate_to_level } from './teleport.js';
import {
    ECMD_OK, ECMD_CANCEL, MAXULEV, TIMEOUT, KILLED_BY, SICK_VOMITABLE, SICK_NONVOMITABLE,
    INVULNERABLE, STONED, SLIMED, STRANGLED, SICK, STUNNED, CONFUSION,
    HALLUC, HALLUC_RES, BLINDED, DEAF, VOMITING, GLIB, WOUNDED_LEGS,
    SLEEPY, TELEPORT, POLYMORPH, LEVITATION, FAST, CLAIRVOYANT,
    DETECT_MONSTERS, SEE_INVIS, INVIS, ACID_RES, STONE_RES, DISPLACED,
    PASSES_WALLS, MAGICAL_BREATHING, WWALKING, FIRE_RES, COLD_RES,
    SLEEP_RES, DISINT_RES, SHOCK_RES, POISON_RES, DRAIN_RES, SICK_RES,
    ANTIMAGIC, BLND_RES, FUMBLING, HUNGER, TELEPAT, WARNING, WARN_OF_MON,
    WARN_UNDEAD, SEARCHING, INFRAVISION, ADORNED, STEALTH,
    AGGRAVATE_MONSTER, CONFLICT, JUMPING, TELEPORT_CONTROL, FLYING,
    SWIMMING, SLOW_DIGESTION, HALF_SPDAM, HALF_PHDAM, REGENERATION,
    ENERGY_REGENERATION, PROTECTION, PROT_FROM_SHAPE_CHANGERS,
    POLYMORPH_CONTROL, UNCHANGING, REFLECTING, FREE_ACTION, FIXED_ABIL,
    LIFESAVED, Upolyd, COLNO, ROWNO, STONE, S_sink, S_fountain, S_vbeam, S_rslant,
    SDOOR, CORR, IS_WALL, IS_ROOM, IS_DOOR, WM_MASK,
    COULD_SEE, IN_SIGHT, TEMP_LIT, NEUTRAL,
    In_sokoban, Is_knox, In_endgame, ARM, u_at,
    Is_stronghold, Is_botlevel, has_mgivenname, MGIVENNAME,
    MIGR_EXACT_XY, MIGR_RANDOM, MM_NOMSG,
    DIED, XKILL_NOMSG, SUPPRESS_IT, SUPPRESS_HALLUCINATION, SUPPRESS_SADDLE,
    ARTICLE_YOUR, ARTICLE_THE, ARTICLE_A, PRIMARYSET, KNOWN_HANDLING, Never_mind,
    G_EXTINCT, MON_OFFMAP, MON_MIGRATING, MON_LIMBO, MON_ENDGAME_MIGR,
    ESHK, EPRI, EGD, UTOTYPE_NONE,
    fuzzer_impossible_panic, fuzzer_impossible_continue,
    ACH_MINE_PRIZE, ACH_SOKO_PRIZE,
} from './const.js';
import { ATR_INVERSE } from './terminal.js';
import { make_blinded, save_currentstate, assign_level } from './do.js';
import { m_at, rescham, dmonsfree, mongone } from './mon.js';
import { dobjsfree } from './mkobj.js';
/* C lock.c maybe_reset_pick — hoisted fn, called only from
   makemap_prepost (`imports.mjs --can wizcmds.js lock.js` SAFE). */
import { maybe_reset_pick, getdir } from './lock.js';
import { minimal_monnam, mon_nam, x_monnam } from './do_name.js';
import { strsubst, strkitten, depth, mungspaces, strncmpi, upstart, dist2 } from './hacklib.js';
import { getpos } from './getpos.js';
import { usmellmon, makemon, rndmonst } from './makemon.js';
import { check_invent_gold, select_menu_pick_none } from './invent.js';
/* C worn.c check_wornmask_slots — hoisted async fn, called only from
   you_sanity_check (imports.mjs --can wizcmds.js worn.js cycle-safe
   once the export is a function declaration). */
import { check_wornmask_slots } from './worn.js';
import { rn2 } from './rng.js';
import { float_vs_flight, body_part } from './polyself.js';
import { pooleffects } from './pickup.js';
import { mons, olfaction, NUMMONS, nonliving, G_UNIQ } from './monsters.js';
import { PM_GRID_BUG, PM_SAMURAI, pmnames } from './generated/monsters_data.js';
/* C mondata.c mstrength — hoisted fn (`imports.mjs --can wizcmds.js mondata.js mstrength` SAFE). */
import { mstrength, monsndx } from './mondata.js';
import { NUM_OBJECTS, FIRST_OBJECT, MAXOCLASSES, objectNameStrs } from './objects.js';
/* C dungeon.c overview_stats — hoisted fn
   (`imports.mjs --can wizcmds.js dungeon.js overview_stats` SAFE). */
import { overview_stats, on_level } from './dungeon.js';
/* C worm.c size_wseg — hoisted fn
   (`imports.mjs --can wizcmds.js worm.js size_wseg` SAFE). */
import { size_wseg } from './worm.js';
/* C glyphs.c glyphmap[MAX_GLYPH] accessor for wizcustom_callback below
   (`imports.mjs --can wizcmds.js glyphs.js` IN-SCC, function declaration,
   called only at runtime — no top-level read). */
import { ensure_glyphmap, glyphid_cache_status, fill_glyphid_cache, wizcustom_glyphids, free_glyphid_cache } from './glyphs.js';
/* C timeout.c property_by_index — #wizintrinsic menu order + reverse
   lookup (`imports.mjs --can wizcmds.js timeout.js` IN-SCC, called only
   at runtime — no top-level read). */
import { property_by_index } from './timeout.js';
/* C uhitm.c xkilled — #wizkill hero-credited kill
   (`imports.mjs --can wizcmds.js uhitm.js xkilled` SAFE). */
import { xkilled } from './uhitm.js';
/* C mon.c monkilled — #wizkill 'm'-prefix kill
   (`imports.mjs --can wizcmds.js mhitm.js monkilled` SAFE). */
import { monkilled } from './mhitm.js';
/* C end.c done — #wizkill seppuku arm
   (`imports.mjs --can wizcmds.js end.js done` SAFE). */
import { done } from './end.js';
/* C uhis — #wizkill killer-name possessive
   (`imports.mjs --can wizcmds.js roles.js uhis` SAFE). */
import { uhis } from './roles.js';
/* C dog.c keepdogs — makemap_remove_mons pets-only keep
   (`imports.mjs --can wizcmds.js dog.js keepdogs` SAFE). */
import { keepdogs } from './dog.js';
/* C shk.c setpaid — makemap_unmakemon local-shopkeeper settle
   (`imports.mjs --can wizcmds.js shk.js setpaid` SAFE). */
import { setpaid } from './shk.js';
/* C dothrow.c mhurtle/hurtle — #wiztelekinesis hurtle arms
   (`imports.mjs --can wizcmds.js dothrow.js mhurtle` SAFE;
   `... hurtle` SAFE — hoisted declarations). */
import { mhurtle, hurtle } from './dothrow.js';
/* C detect.c findit — #wizdetect reveal arm
   (`imports.mjs --can wizcmds.js detect.js findit` SAFE). */
import { findit } from './detect.js';

const DEFAULT_TIMEOUT_INCR = 30;

/** Flat H* mirrors used by exerper / nh_timeout / display gates. C youprop.h
 * keeps one storage (HSleepy ≡ uprops[SLEEPY].intrinsic); the mirror keeps
 * the flat readers (eat/do_wear/allmain) on the wizintrinsic default arm. */
const PROP_FLAT = {
    [SLEEPY]: 'HSleepy',
    [STUNNED]: 'HStun',
    [CONFUSION]: 'HConfusion',
    [HALLUC]: 'HHallucination',
    [BLINDED]: 'HBlinded',
    [DEAF]: 'HDeaf',
    [WOUNDED_LEGS]: 'HWounded_legs',
    [FUMBLING]: 'HFumbling',
    [LEVITATION]: 'HLevitation',
    [INVIS]: 'HInvis',
    [SEE_INVIS]: 'HSee_invisible',
    [CLAIRVOYANT]: 'HClairvoyant',
    [TELEPORT]: 'HTeleportation',
    [REGENERATION]: 'HRegeneration',
};

function prop_old_timeout(p) {
    const u = game.u || {};
    const flat = PROP_FLAT[p];
    if (flat && (u[flat] | 0)) return (u[flat] | 0) & TIMEOUT;
    const pr = u.uprops?.[p];
    return pr ? (pr.intrinsic | 0) & TIMEOUT : 0;
}

function incr_prop_timeout(p, amt) {
    const u = game.u || (game.u = {});
    if (!u.uprops) u.uprops = {};
    if (!u.uprops[p]) u.uprops[p] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    const old = (u.uprops[p].intrinsic | 0) & TIMEOUT;
    let next = old + (amt | 0);
    if (next > TIMEOUT) next = TIMEOUT;
    u.uprops[p].intrinsic =
        ((u.uprops[p].intrinsic | 0) & ~TIMEOUT) | (next & TIMEOUT);
    const flat = PROP_FLAT[p];
    if (flat) {
        u[flat] = ((u[flat] | 0) & ~TIMEOUT) | (next & TIMEOUT);
        if (p === CONFUSION) u.Confusion = u.HConfusion;
        if (p === HALLUC) {
            u.Hallucination = !!(u.HHallucination & TIMEOUT);
        }
        if (p === STUNNED) u.Stunned = u.HStun;
    }
}

/**
 * C ref: wizcmds.c wiz_intrinsic `:948–1096` — #wizintrinsic
 * Envelope: propertynames menu + per-prop switch in C order —
 * HALLUC → make_hallucinated; DEAF → make_deaf(newtimeout, TRUE)
 * (D-1817; C `:1029`); BLINDED → make_blinded(newtimeout, TRUE) — not
 * incr_prop_timeout (D-0928 #1171; HBlinded from raven/cream must not
 * be overwritten via stale uprops[BLINDED]); SICK → rn2(2) vomit-type
 * + make_sick(newtimeout, "#wizintrinsic", TRUE, typ) (C `:1036–1038`);
 * SLIMED → make_slimed(newtimeout, buf) (D-1995); STONED →
 * make_stoned(newtimeout, buf, KILLED_BY, "#wizintrinsic") (C
 * `:1044–1047`); STUNNED → make_stunned(newtimeout, TRUE) (C
 * `:1049–1051`); VOMITING → make_vomiting(newtimeout, FALSE) +
 * pline(buf) (C `:1053–1057`); WARN_OF_MON → grid-bug default species
 * then def_feedback (C `:1059–1066`); GLIB → make_glib + Timeout pline
 * with no incr (C `:1067–1072` FALLTHROUGH); default (incl. CONFUSION —
 * its make_confused case is `#if 0`'d out, C `:1023–1028`) →
 * incr + `Timeout for %s …` pline; post-arm float_vs_flight /
 * rescham / pooleffects tail (C `:1080–1087`).
 * Count prefix (C `:1004–1008`): picks carry `select_menu_pick_any`
 * `count` (-1 = none → DEFAULT_TIMEOUT_INCR; `amt <= 0` skipped).
 * Non-wizard arm prints `Unavailable command 'wizintrinsic'.` (C `:1094`
 * via `ecname_from_fn` → cmd.c:1965; house hardcodes like wizwhere).
 * The BLINDED Blindfolded/Eyes talk variants live in shared
 * `make_blinded` (D-1755 `make_blinded_notoggle_talk`); this arm just
 * calls `make_blinded(newtimeout, TRUE)` per C `:1020–1021`.
 * Named omissions: none.
 */
export async function wiz_intrinsic() {
    if (!(game.flags?.debug || game.flags?.wizard)) {
        // C wizcmds.c:1094 — pline(unavailcmd, ecname_from_fn(wiz_intrinsic));
        // ecname is "wizintrinsic" (C cmd.c:1965); house idiom matches the
        // wizwhere/wizidentify arms below.
        await pline("Unavailable command 'wizintrinsic'.");
        return ECMD_OK;
    }
    const { select_menu_pick_any } = await import('./options.js');
    const {
        make_hallucinated, make_deaf, make_slimed,
        make_sick, make_stoned, make_stunned, make_vomiting, make_glib,
    } = await import('./potion.js');

    const raw = [
        { text: 'Which intrinsics?', selectable: false, attr: ATR_INVERSE },
        { text: '', selectable: false },
    ];
    // C: iflags.cmdassist subtitle
    if (game.iflags?.cmdassist !== false) {
        raw.push({
            text: `[Precede any selection with a count to increment by other than ${DEFAULT_TIMEOUT_INCR}.]`,
            selectable: false,
        });
    }
    /* C wizcmds.c:973 — `property_by_index(i, &p) != 0`; HALLUC_RES keeps
       its table index (continue skips the row, not the count). */
    const pbOut = { p: 0 };
    for (let i = 0; ; i++) {
        const name = property_by_index(i, pbOut);
        if (name == null) break;
        const p = pbOut.p;
        if (p === HALLUC_RES) continue;
        if (p === FIRE_RES) {
            raw.push({ text: '--', selectable: false });
        }
        const oldtimeout = prop_old_timeout(p);
        const text = oldtimeout
            ? `${name.padEnd(27)} [${oldtimeout}]`
            : name;
        raw.push({ text, selectable: true, idx: i });
    }

    const selected = await select_menu_pick_any(raw);
    for (const it of selected) {
        /* C wizcmds.c:1001–1002 — reverse the menu id to the table index. */
        const propname = property_by_index(it.idx | 0, pbOut);
        const p = pbOut.p;
        const oldtimeout = prop_old_timeout(p);
        // C wizcmds.c:1004–1008 — menu count prefix; count -1 (no count)
        // takes DEFAULT_TIMEOUT_INCR; amt <= 0 is paranoia-skipped.
        const pickedCount = (it.count === undefined || (it.count | 0) === -1)
            ? DEFAULT_TIMEOUT_INCR
            : (it.count | 0);
        const amt = pickedCount;
        if (amt <= 0) continue;
        let newtimeout = oldtimeout + amt;
        if ((p === SICK || p === SLIMED || p === STONED)
            && oldtimeout > 0 && newtimeout > oldtimeout) {
            newtimeout = oldtimeout;
        }
        // C wizcmds.c:1017–1078 switch in C order.
        if (p === HALLUC) {
            await make_hallucinated(newtimeout, true, 0);
        } else if (p === DEAF) {
            // C wizcmds.c:1029 — make_deaf(newtimeout, TRUE).
            await make_deaf(newtimeout, true);
        } else if (p === BLINDED) {
            // C wizcmds.c:1020 — make_blinded(newtimeout, TRUE).
            // Must use BlindedTimeout (HBlinded), not stale uprops[BLINDED]
            // (cream pie / AD_BLND set HBlinded only). Already Blind +
            // increasing → silent (no generic Timeout pline).
            await make_blinded(newtimeout, true);
        } else if (p === SICK) {
            // C wizcmds.c:1036-1038 — vomit-type roll before make_sick.
            const typ = !rn2(2) ? SICK_VOMITABLE : SICK_NONVOMITABLE;
            await make_sick(newtimeout, '#wizintrinsic', true, typ);
        } else if (p === SLIMED) {
            // C wizcmds.c:953,1040-1043 — fmt "You are%s %s." via
            // make_slimed (sets botl, plines on 0↔nonzero change); no
            // generic "Timeout for …" line.
            const uu = game.u || {};
            const slimedNow = !!((uu.Slimed | 0)
                || (uu.uprops?.[SLIMED]?.intrinsic | 0));
            await make_slimed(
                newtimeout,
                `You are${slimedNow ? ' still' : ''} turning into slime.`,
            );
        } else if (p === STONED) {
            // C wizcmds.c:1044-1047 — fmt "You are%s %s." via make_stoned.
            const uu = game.u || {};
            const stonedNow = !!((uu.Stoned | 0)
                || (uu.uprops?.[STONED]?.intrinsic | 0));
            await make_stoned(
                newtimeout,
                `You are${stonedNow ? ' still' : ''} turning into stone.`,
                KILLED_BY,
                '#wizintrinsic',
            );
        } else if (p === STUNNED) {
            // C wizcmds.c:1049-1051 — make_stunned(newtimeout, TRUE).
            await make_stunned(newtimeout, true);
        } else if (p === VOMITING) {
            // C wizcmds.c:1053-1057 — fmt "You are%s %s."; make_vomiting
            // with talk=FALSE is silent, then pline(buf).
            const uu = game.u || {};
            const vomitingNow = !!((uu.Vomiting | 0)
                || (uu.uprops?.[VOMITING]?.intrinsic | 0));
            await make_vomiting(newtimeout, false);
            await pline(`You are${vomitingNow ? ' still' : ''} vomiting.`);
        } else if (p === WARN_OF_MON) {
            // C wizcmds.c:1059-1066 — default warn species is grid bug
            // when not already warned, then def_feedback.
            if (!Warn_of_mon()) {
                const ctx = game.context || (game.context = {});
                const wt = ctx.warntype
                    || (ctx.warntype = {
                        obj: 0, polyd: 0, species: null, speciesidx: 0,
                    });
                wt.speciesidx = PM_GRID_BUG;
                wt.species = mons(PM_GRID_BUG);
            }
            incr_prop_timeout(p, amt);
            if (game.flags) game.flags.botl = true;
            await pline(
                `Timeout for ${propname} ${oldtimeout ? 'increased by' : 'set to'} ${amt}.`,
            );
        } else if (p === GLIB) {
            // C wizcmds.c:1067-1072 — make_glib then FALLTHROUGH: the
            // Timeout pline fires with no incr_itimeout.
            make_glib(newtimeout | 0);
            if (game.flags) game.flags.botl = true;
            await pline(
                `Timeout for ${propname} ${oldtimeout ? 'increased by' : 'set to'} ${amt}.`,
            );
        } else {
            // C default (C wizcmds.c:1073-1079 def_feedback) — covers
            // CONFUSION too: its make_confused case is #if 0'd out
            // (C wizcmds.c:1023-1028) since make_confused only gives
            // feedback when confusion ends.
            incr_prop_timeout(p, amt);
            if (game.flags) game.flags.botl = true;
            await pline(
                `Timeout for ${propname} ${oldtimeout ? 'increased by' : 'set to'} ${amt}.`,
            );
        }
        // C wizcmds.c:1080-1087 — post-arm position/shape/water effects.
        // This has to be after incr_itimeout().
        if (p === LEVITATION || p === FLYING) {
            float_vs_flight();
        } else if (p === PROT_FROM_SHAPE_CHANGERS) {
            await rescham();
        }
        if (p === WWALKING || p === LEVITATION || p === FLYING) {
            if ((game.u?.uinwater | 0)) await pooleffects(false);
        }
    }
    await docrt();
    return ECMD_OK;
}

/**
 * C ref: wizcmds.c wiz_level_change — #levelchange
 * Drain via losexp("#levelchange") then u.ulevelmax = u.ulevel (D-1203).
 * Raise via pluslvl(FALSE) (D-0061).
 * Named omissions: +N sscanf; livelog/SoundAchievement inside losexp;
 * Upolyd mh strip; level-1 done(DIED) (caller returns at ulevel==1;
 * override also nulls drainer so never fatal).
 */
export async function wiz_level_change() {
    const u = game.u || (game.u = {});
    const buf = mungspaces(await getlin('To what experience level do you want to be set?'));
    // C `:454–458` mungspaces then sscanf("%d%c"); ESC/empty → ret=0 → Never_mind.
    let newlevel = 0;
    let ret = 0;
    if (buf && buf !== '\x1b' && /^-?\d+$/.test(buf)) {
        newlevel = parseInt(buf, 10);
        if (Number.isFinite(newlevel)) ret = 1;
    }
    if (ret !== 1) {
        await pline('Never mind.');
        return ECMD_OK;
    }

    if (newlevel === (u.ulevel | 0)) {
        await pline('You are already that experienced.');
    } else if (newlevel < (u.ulevel | 0)) {
        if ((u.ulevel | 0) === 1) {
            await pline('You are already as inexperienced as you can get.');
            return ECMD_OK;
        }
        if (newlevel < 1) newlevel = 1;
        while ((u.ulevel | 0) > newlevel) {
            await losexp('#levelchange');
        }
    } else {
        if ((u.ulevel | 0) >= MAXULEV) {
            await pline('You are already as experienced as you can get.');
            return ECMD_OK;
        }
        if (newlevel > MAXULEV) newlevel = MAXULEV;
        while ((u.ulevel | 0) < newlevel) {
            await pluslvl(false);
        }
    }
    // Blessed full healing / restore ability must not un-drain.
    u.ulevelmax = u.ulevel;
    return ECMD_OK;
}

/**
 * C ref: wizcmds.c wiz_wish — #wizwish / ^W
 */
export async function wiz_wish() {
    if (!(game.flags?.debug || game.flags?.wizard)) {
        await pline("You can't do that.");
        return ECMD_OK;
    }
    const save_verbose = game.flags.verbose;
    game.flags.verbose = false;
    await makewish();
    game.flags.verbose = save_verbose;
    // encumber_msg deferred
    return ECMD_OK;
}

/**
 * C ref: wizcmds.c wiz_genesis — #wizgenesis / ^G
 * Envelope: create_particular named-monster path (MM_NOEXCLAM).
 * Named omissions: debug_mongen toggle; count-prefix quan beyond multi;
 * class-letter / * random arms inside create_particular.
 */
export async function wiz_genesis() {
    if (!(game.flags?.debug || game.flags?.wizard)) {
        await pline("You can't do that.");
        return ECMD_OK;
    }
    // C: iflags.debug_mongen = FALSE around create_particular
    const saved = game.iflags?.debug_mongen;
    if (game.iflags) game.iflags.debug_mongen = false;
    await create_particular();
    if (game.iflags) game.iflags.debug_mongen = saved;
    return ECMD_OK;
}

/**
 * C ref: wizcmds.c wiz_level_tele — #wizlevelport / ^V
 * Envelope: wizard → level_tele(); else unavailcmd pline.
 */
export async function wiz_level_tele() {
    if (!(game.flags?.debug || game.flags?.wizard)) {
        await pline("You can't do that.");
        return ECMD_OK;
    }
    await level_tele();
    return ECMD_OK;
}

/**
 * C ref: wizcmds.c wiz_detect `:229–237` — #wizdetect reveals secret
 * doors, traps and hidden monsters via findit (`:232`); non-wizards get
 * the unavailcmd line with ecname_from_fn (`:234`). `wizard` ≡
 * flags.debug (flag.h:30); `|| flags.wizard` mirrors the WIZMODECMD
 * dispatcher gate (wiz_level_tele precedent).
 */
export async function wiz_detect() {
    if (game.flags?.debug || game.flags?.wizard) { /* C :231 */
        await findit(); /* C :232 */
    } else {
        await pline(UNAVAILCMD, ecname_from_fn('wizdetect')); /* C :234 */
    }
    return ECMD_OK; /* C :235–236 */
}

/**
 * C ref: wizcmds.c wiz_load_lua `:353–372` — #wizloadlua prompts for a
 * lua file, appends “.lua” when there is no dot, and loads it.
 * ESC/empty → ECMD_CANCEL (`:362–363`); non-wizards get unavailcmd
 * (`:370`). Named omission: `:366` load_lua (ledger by-design — file IO,
 * no scored analogue).
 */
export async function wiz_load_lua() {
    if (game.flags?.debug || game.flags?.wizard) { /* C :354 */
        // C `:357–358` sbi (NHL_SB_SAFE|NHL_SB_DEBUGGING, 16MB caps) —
        // sandbox limits ride with the load_lua omit below.
        const buf0 = await getlin('Load which lua file?'); /* C :361 */
        let buf = String(buf0 ?? '');
        if (buf[0] === '\x1b' || buf.length === 0) return ECMD_CANCEL; /* C :362–363 */
        if (!buf.includes('.')) buf += '.lua'; /* C :364–365 strchr/strcat */
        // C `:366` load_lua(buf, &sbi) — named omit (by-design, file IO).
        void buf;
    } else {
        await pline(UNAVAILCMD, ecname_from_fn('wizloadlua')); /* C :370 */
    }
    return ECMD_OK; /* C :371 */
}

/**
 * C ref: wizcmds.c wiz_load_splua `:376–394` — #wizloaddes prompts for
 * a des lua file, appends “.lua”, resets the level coder, loads the
 * special level and finalizes. ESC/empty → ECMD_CANCEL (`:382–383`).
 * Dynamic mklev import: mklev.js statically imports wizcmds.js
 * (makemap_prepost), so a static edge back would cycle (wiz_flip_level
 * precedent).
 */
export async function wiz_load_splua() {
    if (game.flags?.debug || game.flags?.wizard) { /* C :377 */
        const buf0 = await getlin('Load which des lua file?'); /* C :381 */
        let buf = String(buf0 ?? '');
        if (buf[0] === '\x1b' || buf.length === 0) return ECMD_CANCEL; /* C :382–383 */
        if (!buf.includes('.')) buf += '.lua'; /* C :384–386 */
        const { load_special, lspo_finalize_level, lspo_reset_level } = await import('./mklev.js');
        await lspo_reset_level(false); /* C `:389` NULL form */
        await load_special(buf); /* C :390 */
        await lspo_finalize_level(false); /* C :391 NULL form */
    } else {
        await pline(UNAVAILCMD, ecname_from_fn('wizloaddes')); /* C :393 */
    }
    return ECMD_OK; /* C :394 */
}

/**
 * C ref: wizcmds.c wiz_flip_level `:412–442` — #wizfliplevel transposes
 * the current level. Prompts (`:414–415`); the levregions / mtrack /
 * migrating-monsters caveat (`:417–424`) is a comment only. `wizard` is
 * flags.debug (flag.h:30); the `|| wizard` mirrors the WIZMODECMD
 * dispatcher gate (wiz_level_tele precedent). 0 → flip_level_rnd(3,
 * TRUE), else flip_level(c, TRUE) (`:431–434`), then docrt (`:436`);
 * anything outside "0123" (ESC/quit) → Never_mind (`:437–438`).
 * Dynamic mklev import: mklev.js statically imports wizcmds.js
 * (makemap_prepost), so a static edge back would cycle (wiz_identify's
 * invent.js precedent).
 */
export async function wiz_flip_level() {
    if (game.flags?.debug || game.flags?.wizard) { /* C :425 */
        const c = await yn_function( /* C :426 */
            'Flip 0=randomly, 1=vertically, 2=horizontally, 3=both:',
            '0123', '\0', true,
        );
        if (c && '0123'.includes(c)) { /* C :428 — strchr(choices, c) */
            const n = c.charCodeAt(0) - 48; /* C :429 — c -= '0' */
            const { flip_level, flip_level_rnd } = await import('./mklev.js');
            if (!n) flip_level_rnd(3, true); /* C :431–432 */
            else flip_level(n, true); /* C :433–434 */
            await docrt(); /* C :436 */
        } else {
            await pline(Never_mind); /* C :438 */
        }
    }
    return ECMD_OK; /* C :441 */
}

/**
 * C ref: wizcmds.c wiz_telekinesis `:494–528` — #wiztelekinesis hurtles
 * a chosen monster (or the hero) 6 steps in a chosen direction, re-seeding
 * the cursor at the victim's landing spot until a level change starts
 * (utotype leaves UTOTYPE_NONE, `:524`). getpos cancel / cc.x < 1 and
 * getdir cancel → ECMD_CANCEL (`:505–506`, `:510–511`). The `:508`
 * m_at assignment stays ahead of the canspotmon || u_at test, as in C.
 */
export async function wiz_telekinesis() {
    const u = game.u || (game.u = {});
    const cc = { x: u.ux, y: u.uy }; /* C :499–500 */
    let mtmp = null; /* C :497 */
    await pline('Pick a monster to hurtle.'); /* C :502 */
    do {
        const ans = await getpos(cc, true, 'a monster'); /* C :504 */
        if (ans < 0 || (cc.x | 0) < 1) return ECMD_CANCEL; /* C :505–506 */
        mtmp = m_at(cc.x, cc.y); /* C :508 assignment inside the test */
        if ((mtmp != null && canspotmon(mtmp)) || u_at(cc.x, cc.y)) { /* C :508–509 */
            if (!(await getdir('which direction?'))) return ECMD_CANCEL; /* C :510–511 */
            if (mtmp) { /* C :513 */
                await mhurtle(mtmp, u.dx, u.dy, 6); /* C :514 */
                if ((mtmp.mhp | 0) >= 1 && canspotmon(mtmp)) { /* C :515 !DEADMONSTER */
                    cc.x = mtmp.mx; /* C :516 */
                    cc.y = mtmp.my; /* C :517 */
                }
            } else { /* C :519 */
                await hurtle(u.dx, u.dy, 6, false); /* C :520 */
                cc.x = u.ux; /* C :521 */
                cc.y = u.uy;
            }
        }
    } while ((u.utotype | 0) === UTOTYPE_NONE); /* C :524 */
    return ECMD_OK; /* C :525–526 */
}

/**
 * C ref: wizcmds.c wiz_panic `:534–545` — #panic crash-tests panic
 * handling behind a paranoid query; under the fuzzer it tops up
 * HP/energy instead (`:537–540`). panic() → the house throw idiom
 * (alloc.js precedent: C panic aborts, JS throws loud, never silent).
 */
export async function wiz_panic() {
    const u = game.u || (game.u = {});
    if (game.iflags?.debug_fuzzer) { /* C :537 */
        u.uhp = 1000; /* C :538 */
        u.uhpmax = 1000;
        u.uen = 1000; /* C :539 */
        u.uenmax = 1000;
        return ECMD_OK;
    }
    if (await paranoid_query(true, /* C :542–543 */
        'Do you want to call panic() and end your game?')) {
        throw new Error('Crash test (#panic).'); /* C :544 panic */
    }
    return ECMD_OK;
}

/**
 * C ref: wizcmds.c wiz_fuzzer `:549–565` — #debugfuzzer starts fuzz
 * testing behind a paranoid query plus the panic-after-impossible y_n
 * (`:558`; 'n' → continue, anything else → panic). The first-run
 * notice is gated on suppress_alert < FEATURE_NOTICE_VER(3,7,0)
 * (`:552`; hack.h:1504–1506 macro, version.js precedent).
 */
export async function wiz_fuzzer() {
    // C `:552` FEATURE_NOTICE_VER(3, 7, 0) — (3<<24)|(7<<16)|(0<<8).
    const notice_ver = (((3 << 24) | (7 << 16) | (0 << 8)) >>> 0);
    if ((game.flags?.suppress_alert ?? 0) < notice_ver) {
        await pline('The fuzz tester will make NetHack execute random keypresses.'); /* C :553 */
        await There('is no conventional way out of this mode.'); /* C :554 */
    }
    if (await paranoid_query(true, 'Do you want to start fuzz testing?')) { /* C :556 */
        /* C `:557` — Thoth, take the reins */
        if ((await y_n('Do you want to call panic() after impossible()?')) === 'n') { /* C :558 */
            game.iflags.debug_fuzzer = fuzzer_impossible_continue; /* C :559 */
        } else {
            game.iflags.debug_fuzzer = fuzzer_impossible_panic; /* C :561 */
        }
    }
    return ECMD_OK;
}

/**
 * C ref: wizcmds.c wiz_map — #wizmap / ^F
 * Reveal traps + engravings then do_mapping (exercise A_WIS). ECMD_OK.
 * Named omissions: notice_mon_off/on; full engraving_to_glyph; unavailcmd
 * ecname_from_fn wording (generic "You can't do that.").
 */
export async function wiz_map() {
    if (!(game.flags?.debug || game.flags?.wizard)) {
        await pline("You can't do that.");
        return ECMD_OK;
    }
    const { map_trap, map_engraving } = await import('./display.js');
    const { do_mapping } = await import('./detect.js');
    const u = game.u || (game.u = {});
    // C: notice_mon_off(); save/clear HConfusion + HHallucination
    const save_Hconf = u.HConfusion | 0;
    const save_Hhallu = u.HHallucination | 0;
    const save_Confusion = u.Confusion;
    const save_Hallucination = u.Hallucination;
    u.HConfusion = 0;
    u.HHallucination = 0;
    u.Confusion = 0;
    u.Hallucination = 0;

    // C: for (t = gf.ftrap; t; t = t->ntrap) — JS stores traps on
    // level.traps (maketrap); ftrap linked list is often empty (D-0814).
    const ftrap = game.ftrap;
    const trapList = [];
    if (Array.isArray(game.level?.traps)) {
        trapList.push(...game.level.traps);
    } else if (Array.isArray(ftrap)) {
        trapList.push(...ftrap);
    } else {
        for (let t = ftrap; t; t = t.ntrap) trapList.push(t);
    }
    for (const t of trapList) {
        if (!t) continue;
        t.tseen = 1;
        map_trap(t, true);
    }
    for (let ep = game.head_engr; ep; ep = ep.nxt_engr) {
        map_engraving(ep, true);
    }
    await do_mapping();
    // C: notice_mon_on(); restore conf/hallu
    u.HConfusion = save_Hconf;
    u.HHallucination = save_Hhallu;
    u.Confusion = save_Confusion;
    u.Hallucination = save_Hallucination;
    return ECMD_OK;
}

/**
 * C ref: wizcmds.c wiz_polyself — #polyself
 */
export async function wiz_polyself() {
    const { wiz_polyself: run } = await import('./polyself.js');
    return run();
}

/**
 * C ref: wizcmds.c wiz_where — #wizwhere → print_dungeon(FALSE).
 * Blocking text window so pager keys do not leak into rhack.
 */
export async function wiz_where() {
    if (!(game.flags?.debug || game.flags?.wizard)) {
        await pline('Unavailable command \'wizwhere\'.');
        return ECMD_OK;
    }
    const { print_dungeon } = await import('./dungeon.js');
    await print_dungeon(false);
    return ECMD_OK;
}

/**
 * C ref: wizcmds.c wiz_rumor_check — #wizrumorcheck → rumor_check().
 * Wizard gate mirrors the sibling wiz_* ports (C gates WIZMODECMD dispatch).
 */
export async function wiz_rumor_check() {
    if (!(game.flags?.debug || game.flags?.wizard)) {
        await pline("Unavailable command 'wizrumorcheck'.");
        return ECMD_OK;
    }
    const { rumor_check } = await import('./rumors.js');
    await rumor_check();
    return ECMD_OK;
}

/**
 * C ref: wizcmds.c wiz_identify — #wizidentify / ^I.
 * Sets iflags.override_ID then display_inventory (wizid Debug Identify menu).
 * Named omissions: unavailcmd ecname_from_fn wording (generic Unavailable).
 */
export async function wiz_identify() {
    if (!(game.flags?.debug || game.flags?.wizard)) {
        await pline("Unavailable command 'wizidentify'.");
        return ECMD_OK;
    }
    if (!game.iflags) game.iflags = {};
    // C wizcmds.c:53–60 — cmd_from_func, else C('I') when the key is NUL.
    game.iflags.override_ID = (cmd_from_func('wizidentify') & 0xff) || (0x1f & 73);
    const { display_inventory } = await import('./invent.js');
    await display_inventory();
    game.iflags.override_ID = 0;
    return ECMD_OK;
}

/** C dest_area memset 0 — updest/dndest are not inside the level struct. */
function zero_dest_area() {
    return {
        lx: 0, ly: 0, hx: 0, hy: 0,
        nlx: 0, nly: 0, nhx: 0, nhy: 0,
    };
}

/**
 * C ref: wizcmds.c makemap_unmakemon `:73–105` (staticfn) — uncreate one
 * monster for the old incarnation of a #wizmakemap level: un-extinct a
 * unique (`:80–81`, ignores DEADMONSTER per the C comment), decrement
 * born (`:82–83`), vault-guard isgd clear then fall through to mongone
 * (`:88–89`), dead monsters return already-discarded (`:90–91`),
 * same-level shopkeeper setpaid (`:92–93`), then the migratory arm
 * re-prepends onto fmon so dmonsfree bookkeeping stays in sync
 * (`:95–103`) before mongone (`:104`).
 * JS fmon/migrating_mons are arrays: C nmon splice ≡ unshift/splice
 * (teleport.js:2892 / vault.js:467 precedent). Vitals-ensure mirrors
 * makemon.js unmakemon (C svm.mvitals[] always present; JS on-demand).
 * Async only because JS mongone awaits.
 */
async function makemap_unmakemon(mtmp, migratory) {
    const ndx = monsndx(mtmp.data); // C `:75`
    if (!game.mvitals) game.mvitals = [];
    if (!game.mvitals[ndx]) game.mvitals[ndx] = { mvflags: 0, born: 0, died: 0 };
    const mv = game.mvitals[ndx];
    // C `:80–81` — uncreate any unique so it can be remade.
    if ((((mtmp.data?.geno | 0)) & G_UNIQ) !== 0) {
        mv.mvflags = (mv.mvflags | 0) & ~G_EXTINCT;
    }
    // C `:82–83` — plain decrement (no 255-cap guard; that is unmakemon's).
    if ((mv.born | 0)) mv.born = (mv.born | 0) - 1;

    // C `:88–93` — vault guard falls through to mongone after isgd clear.
    if (mtmp.isgd) {
        mtmp.isgd = 0;
    } else if ((mtmp.mhp | 0) < 1) { // DEADMONSTER, monst.h:214
        return;
    } else if (mtmp.isshk && on_level(game.u?.uz, ESHK(mtmp)?.shoplevel)) {
        setpaid(mtmp);
    }
    if (migratory) {
        // C `:100–103` — caller already unlinked from migrating_mons.
        mtmp.mstate = (mtmp.mstate | 0) | MON_OFFMAP;
        mtmp.mstate &= ~(MON_MIGRATING | MON_LIMBO | MON_ENDGAME_MIGR);
        if (!game.fmon) game.fmon = [];
        mtmp.nmon = game.fmon[0] || null;
        game.fmon.unshift(mtmp);
    }
    await mongone(mtmp); // C `:104`
}

/**
 * C ref: wizcmds.c makemap_remove_mons `:110–150` — keepdogs(TRUE) pets-only
 * keep (`:116`), unmake every surviving fmon member (`:118–123`), unmake
 * migrating shk/priest/guard whose home level is this one (`:132–142`),
 * dmonsfree (`:144`), then fmon must be empty (`:145–146`).
 * The fmon walk is a snapshot: makemap_unmakemon → mongone splices the
 * live array underneath (keepdogs dog.js:448 precedent for the C nmon
 * walk). Sole C caller: cmd.c:992 makemap_prepost(pre).
 */
export async function makemap_remove_mons() {
    const u = game.u || {};
    // C `:116` — pets-only keep (ascending-style release from traps etc).
    await keepdogs(true);
    // C `:118–123` — dead members stay for dmonsfree below.
    for (const mtmp of [...(game.fmon || [])]) {
        if ((mtmp.mhp | 0) < 1) continue; // DEADMONSTER, monst.h:214
        await makemap_unmakemon(mtmp, false);
    }
    // C `:132–142` — migrating home-level shk/priest/guard keep stale
    // mextra for this level; C unlinks via mprev then passes migratory.
    const mig = game.migrating_mons || [];
    for (let i = 0; i < mig.length;) {
        const mtmp = mig[i];
        if (mtmp.mextra
            && ((mtmp.isshk && on_level(u.uz, ESHK(mtmp)?.shoplevel))
                || (mtmp.ispriest && on_level(u.uz, EPRI(mtmp)?.shrlevel))
                || (mtmp.isgd && on_level(u.uz, EGD(mtmp)?.gdlevel)))) {
            mig.splice(i, 1);
            await makemap_unmakemon(mtmp, true);
        } else {
            i++;
        }
    }
    game.migrating_mons = mig;
    // C `:144–146` — release dead/unmade; fmon must be empty now.
    await dmonsfree();
    if ((game.fmon || []).length) {
        await impossible("makemap_remove_mons: 'fmon' did not get emptied?");
    }
}

/**
 * C ref: cmd.c makemap_prepost — discard (pre) then place (post) after
 * #wizmakemap mklev. Post places via u_on_rndspot
 * ((amulet?1:0)|(wiztower?2:0)) (D-1288; C :1043–1046) instead of
 * safe_teleds, then losedogs / kill_genocided / u_collide_m / initrack /
 * Punished placebc / docrt / flush / splev / check_special_room(FALSE).
 * Named omissions: savelev freeing nhfile (`:1035–1038` — no JS
 * level-save; GC releases the discarded level).
 */
export async function makemap_prepost(pre, wiztower) {
    const u = game.u || (game.u = {});
    if (pre) {
        // C cmd.c:992-993 — makemap_remove_mons then rm_mapseen:
        // discard monsters and overview info for the level being remade.
        await makemap_remove_mons();
        const { rm_mapseen, ledger_no, on_level } = await import('./dungeon.js');
        rm_mapseen(ledger_no(game.u?.uz));
        // C `:1000–1008` — prize-level remake revokes the achievement
        // (Unachieve "%s achievement revoked.") and zeroes the prize
        // oid for the new instance.
        const { Is_mineend_level, Is_sokoend_level } = await import('./mklev.js');
        const { remove_achievement } = await import('./insight.js');
        if (Is_mineend_level(u.uz)) {
            if (remove_achievement(ACH_MINE_PRIZE)) {
                await pline('%s achievement revoked.', "Mine's-end");
            }
            if (!game.context) game.context = {};
            if (!game.context.achieveo) game.context.achieveo = {};
            game.context.achieveo.mines_prize_oid = 0;
        } else if (Is_sokoend_level(u.uz)) {
            if (remove_achievement(ACH_SOKO_PRIZE)) {
                await pline('%s achievement revoked.', 'Soko-prize');
            }
            if (!game.context) game.context = {};
            if (!game.context.achieveo) game.context.achieveo = {};
            game.context.achieveo.soko_prize_oid = 0;
        }
        const { ballrelease, unplacebc } = await import('./ball.js');
        const { reset_utrap } = await import('./trap.js');
        const { check_special_room, set_uinwater } = await import('./hack.js');
        // C: Punished ≡ uball != 0
        if (u.uball) {
            await ballrelease(false);
            await unplacebc();
        }
        /* C cmd.c:1014–1015 — reset lock picking unless the box is carried. */
        maybe_reset_pick(null);
        // C `:1016–1019` — reset interrupted digging on this level
        // ({} is the codebase digging-reset idiom; lazy re-init re-zeroes).
        if (on_level(game.context?.digging?.level, u.uz)) {
            game.context.digging = {};
        }
        if (!game.iflags) game.iflags = {};
        if (!game.iflags.travelcc) game.iflags.travelcc = { x: 0, y: 0 };
        game.iflags.travelcc.x = 0;
        game.iflags.travelcc.y = 0;
        // C `:1022` — polearm target reset (hitmon only; m_id untouched).
        if (!game.context) game.context = {};
        if (!game.context.polearm) game.context.polearm = {};
        game.context.polearm.hitmon = null;
        reset_utrap(false);
        await check_special_room(true);
        game.dndest = zero_dest_area();
        game.updest = zero_dest_area();
        u.ustuck = null;
        u.uswallow = 0;
        u.uswldtim = 0;
        await set_uinwater(0);
        u.uundetected = 0;
        // C cmd.c:1032–1033 — purge dead fmon members, then objs_deleted.
        await dmonsfree();
        dobjsfree();
        return;
    }

    const { vision_reset } = await import('./vision.js');
    const { cls, flush_screen } = await import('./display.js');
    const { u_on_rndspot } = await import('./mklev.js');
    const { losedogs } = await import('./dog.js');
    const { m_at, kill_genocided_monsters } = await import('./mon.js');
    const { u_collide_m, deliver_splev_message } = await import('./do.js');
    const { initrack } = await import('./track.js');
    const { unplacebc, placebc } = await import('./ball.js');
    const { check_special_room } = await import('./hack.js');

    vision_reset();
    game.vision_full_recalc = 1;
    await cls();
    /* C cmd.c:1043–1046 — was using safe_teleds; honor arrival region. */
    const amulet = !!(u.uhave?.amulet || u.uhave_amulet);
    await u_on_rndspot((amulet ? 1 : 0) | (wiztower ? 2 : 0));
    await losedogs();
    await kill_genocided_monsters();
    const mtmp = m_at(u.ux, u.uy);
    if (mtmp) await u_collide_m(mtmp);
    initrack();
    if (u.uball) {
        await unplacebc();
        await placebc();
    }
    await docrt();
    await flush_screen(1);
    await deliver_splev_message();
    await check_special_room(false);
    // C cmd.c:1063–1064 — INSURANCE checkpoint after the new level is shown.
    save_currentstate();
}

/**
 * C ref: wizcmds.c wiz_makemap — #wizmakemap recreate current level.
 * wizard → In_W_tower snapshot, makemap_prepost(TRUE), mklev,
 * makemap_prepost(FALSE). Else unavailcmd (generic "You can't do that.").
 */
export async function wiz_makemap() {
    if (!(game.flags?.debug || game.flags?.wizard)) {
        await pline("You can't do that.");
        return ECMD_OK;
    }
    const { In_W_tower } = await import('./dungeon.js');
    const { mklev } = await import('./mklev.js');
    const u = game.u || {};
    const was_in_W_tower = In_W_tower(u.ux | 0, u.uy | 0, u.uz);
    await makemap_prepost(true, was_in_W_tower);
    await mklev();
    await makemap_prepost(false, was_in_W_tower);
    return ECMD_OK;
}

/**
 * C wizcmds.c you_sanity_check `:1401–1441` — swallow/overlay/HP-Pw
 * clamps, then worn-slot sanity, then invent gold/invlet.
 * Caller sanity_check.
 */
async function you_sanity_check() {
    const u = game.u || (game.u = {});

    if (u.uswallow && !u.ustuck) {
        await impossible('sanity_check: swallowed by nothing?');
        // C display_nhwindow(WIN_MESSAGE, TRUE) — wait pending More.
        await flush_topl_more();
        u.uswallow = 0;
        u.uswldtim = 0;
        await docrt();
    }
    const mtmp = m_at(u.ux | 0, u.uy | 0);
    if (mtmp) {
        // C: u.usteed is not on the map (JS m_at skips it).
        if (u.ustuck !== mtmp) {
            await impossible('sanity_check: you over monster');
        }
    }
    if ((u.uhp | 0) > (u.uhpmax | 0)) {
        await impossible(
            'current hero health (%d) better than maximum? (%d)',
            u.uhp | 0, u.uhpmax | 0,
        );
        u.uhp = u.uhpmax | 0;
    }
    if (Upolyd(u) && (u.mh | 0) > (u.mhmax | 0)) {
        await impossible(
            'current hero health as monster (%d) better than maximum? (%d)',
            u.mh | 0, u.mhmax | 0,
        );
        u.mh = u.mhmax | 0;
    }
    if ((u.uen | 0) > (u.uenmax | 0)) {
        await impossible(
            'current hero energy (%d) better than maximum? (%d)',
            u.uen | 0, u.uenmax | 0,
        );
        u.uen = u.uenmax | 0;
    }

    // C `:1439` check_wornmask_slots, then check_invent_gold("invent").
    await check_wornmask_slots();
    await check_invent_gold('invent');
}

/**
 * C wizcmds.c sanity_check `:1459–1481`.
 * Envelope: sanity_no_check (^P/^R CMD_INSANE); in_sanity_check for
 * impossible(); you_sanity_check gold/invlet via check_invent_gold
 * ("invent") then `bc_sanity_check` (`ball.c:1034–1102`, `:1476` —
 * after light_sources, before trap). Caller allmain.c moveloop_core
 * when iflags.sanity_check || debug_fuzzer (opt_in Off).
 * check_wornmask_slots runs inside you_sanity_check.
 * Named omit: obj/timer/mon/trap/engraving/levl sanity;
 * dobjsfree / clear_bypasses / resume_wish.
 */
export async function sanity_check() {
    if (!game.iflags) game.iflags = {};
    if (game.iflags.sanity_no_check) {
        game.iflags.sanity_no_check = false;
        return;
    }
    if (!game.program_state) game.program_state = {};
    game.program_state.in_sanity_check =
        (game.program_state.in_sanity_check | 0) + 1;
    await you_sanity_check();
    // C `:1475` light_sources_sanity_check. obj/timer/mon stay named;
    // bc_sanity_check is live (ball.js); trap/engraving/levl stay named.
    const { light_sources_sanity_check } = await import('./light.js');
    light_sources_sanity_check();
    const { bc_sanity_check } = await import('./ball.js');
    await bc_sanity_check();
    game.program_state.in_sanity_check =
        (game.program_state.in_sanity_check | 0) - 1;
}

/* C defsym.h PCHAR `:133–134` — S_sink and S_fountain both default to '{'.
 * Hoisted to module scope: a '{' literal inside a function body defeats the
 * naive brace-count in port-coverage.mjs (it counts string contents). */
const DEF_FOUNTAIN_SINK_SYM = '{';

/* C cmd.c levltyp[] `:1072–1084` (MAX_TYPE + 2) — terrain index → name.
 * Last two entries are not real terrain: the undiggable-stone marker used
 * by wiz_map_levltyp() plus the even-count padding entry. */
const LEVLTYP_NAMES = [
    'stone', 'vertical wall', 'horizontal wall', 'top-left corner wall',
    'top-right corner wall', 'bottom-left corner wall',
    'bottom-right corner wall', 'cross wall', 'tee-up wall', 'tee-down wall',
    'tee-left wall', 'tee-right wall', 'drawbridge wall', 'tree',
    'secret door', 'secret corridor', 'pool', 'moat', 'water',
    'drawbridge up', 'lava pool', 'lava wall', 'iron bars', 'door',
    'corridor', 'room', 'stairs', 'ladder', 'fountain', 'throne', 'sink',
    'grave', 'altar', 'ice', 'drawbridge down', 'air', 'cloud',
    'unreachable/undiggable',
    '',
];

/**
 * C ref: wizcmds.c wiz_map_levltyp `:693–835` — #terrain choice 5, called
 * from cmd.c doterrain `:1182` (case 5). Dumps internal levl[][].typ codes
 * in base-36 plus a level-flags description line into an NHW_TEXT window.
 * Window via show_text_pages (NHW_TEXT idiom, like look_all D-2508):
 * each C putstr is one collected line; display_nhwindow(win, TRUE) is the
 * blocking page wait inside show_text_pages.
 */
export async function wiz_map_levltyp() {
    // New edges, all lazily read inside the body (imports.mjs --can SAFE):
    // may_dig (dig.js), Is_special/Invocation_lev/On_W_tower_level
    // (dungeon.js), show_text_pages (pager.js).
    const { may_dig } = await import('./dig.js');
    const { Is_special, Invocation_lev, On_W_tower_level } = await import('./dungeon.js');
    const { show_text_pages } = await import('./pager.js');

    // C `:698` — boolean istty = !strcmp(windowprocs.name, "tty").
    const istty = (game.windowprocs?.name ?? 'tty') === 'tty';
    const lines = [];
    // C `:700–703` create_nhwindow(NHW_TEXT); map row 0 goes on the second
    // tty line, hence the blank top line on tty only.
    if (istty) lines.push('');
    // C `:704–721` — one base-36 row per map row. Column 0 is off the left
    // edge of the screen; it should always be undiggable STONE.
    for (let y = 0; y < ROWNO; y++) {
        let row = '';
        for (let x = 1; x < COLNO; x++) {
            const terrain = game.level?.at(x, y)?.typ ?? STONE;
            // C `:710–716` — assumes no more than 10+26+26 terrain types.
            row += (terrain === STONE && !may_dig(x, y))
                ? '*'
                : terrain < 10
                    ? String.fromCharCode(48 + terrain) // '0' + terrain
                    : terrain < 36
                        ? String.fromCharCode(97 + terrain - 10) // 'a' + t - 10
                        : String.fromCharCode(65 + terrain - 36); // 'A' + t - 36
        }
        // C `:722–725` — flag column 0 with '!' when it is not undiggable
        // stone (x-- then row[x++] = '!' then row[x] = '\0').
        const col0 = game.level?.at(0, y);
        if ((col0?.typ ?? STONE) !== STONE || may_dig(0, y)) row += '!';
        lines.push(row);
    }

    // C `:727–835` — description line.
    const u = game.u || {};
    const uz = u.uz || {};
    // C `:732` Sprintf(dsc, "D:%d,L:%d", u.uz.dnum, u.uz.dlevel).
    let dsc = `D:${uz.dnum | 0},L:${uz.dlevel | 0}`;
    // C `:735–750` special level features (dungeon-branch block omitted
    // per C; alignment omitted per C "to save space").
    const slev = Is_special(uz);
    if (slev) {
        // C `:737` Sprintf(eos(dsc), " \"%s\"", slev->proto).
        dsc += ` "${slev.proto}"`;
        if (slev.flags?.maze_like) dsc += ' mazelike'; // C `:741`
        if (slev.flags?.hellish) dsc += ' hellish'; // C `:743`
        if (slev.flags?.town) dsc += ' town'; // C `:745`
        if (slev.flags?.rogue_like) dsc += ' roguelike'; // C `:747`
    }
    // C `:752–787` level features + level flags.
    const lf = game.level?.flags || {};
    // C `:753–756` defsyms[S_fountain].sym / defsyms[S_sink].sym — JS char
    // via game.gs.showsyms (both default per defsym.h:133–134, hoisted).
    if (lf.nfountains) dsc += ` ${game.gs?.showsyms?.[S_fountain] ?? DEF_FOUNTAIN_SINK_SYM}:${lf.nfountains | 0}`;
    if (lf.nsinks) dsc += ` ${game.gs?.showsyms?.[S_sink] ?? DEF_FOUNTAIN_SINK_SYM}:${lf.nsinks | 0}`;
    if (lf.has_vault) dsc += ' vault'; // C `:758`
    if (lf.has_shop) dsc += ' shop'; // C `:760`
    if (lf.has_temple) dsc += ' temple'; // C `:762`
    if (lf.has_court) dsc += ' throne'; // C `:764`
    if (lf.has_zoo) dsc += ' zoo'; // C `:766`
    if (lf.has_morgue) dsc += ' morgue'; // C `:768`
    if (lf.has_barracks) dsc += ' barracks'; // C `:770`
    if (lf.has_beehive) dsc += ' hive'; // C `:772`
    if (lf.has_swamp) dsc += ' swamp'; // C `:774`
    if (lf.noteleport) dsc += ' noTport'; // C `:777`
    if (lf.hardfloor) dsc += ' noDig'; // C `:779`
    if (lf.nommap) dsc += ' noMMap'; // C `:781`
    if (!lf.hero_memory) dsc += ' noMem'; // C `:783`
    if (lf.shortsighted) dsc += ' shortsight'; // C `:785`
    if (lf.graveyard) dsc += ' graveyard'; // C `:787`
    if (lf.is_maze_lev) dsc += ' maze'; // C `:789`
    if (lf.is_cavernous_lev) dsc += ' cave'; // C `:791`
    if (lf.arboreal) dsc += ' tree'; // C `:793`
    // C `:795` Sokoban macro (svl.level.flags.sokoban_rules) — inline the
    // JS mirror (dungeon.js Sokoban(); that helper is module-local).
    if (lf.sokoban_rules || lf.sokoban || game.Sokoban) dsc += ' sokoban-rules';
    // C `:799–802` non-flag info.
    if (Invocation_lev(uz)) dsc += ' invoke';
    if (On_W_tower_level(uz)) dsc += ' tower';
    // C `:804–824` branch identifier.
    if ((uz.dnum | 0) === 0) dsc += ' dungeon'; // C `:804`
    else if ((uz.dnum | 0) === (game.mines_dnum | 0)) dsc += ' mines'; // C `:806`
    else if (In_sokoban(uz)) dsc += ' sokoban'; // C `:808`
    else if ((uz.dnum | 0) === (game.quest_dnum | 0)) dsc += ' quest'; // C `:810`
    else if (Is_knox(uz)) dsc += ' ludios'; // C `:812`
    else if ((uz.dnum | 0) === 1) dsc += ' gehennom'; // C `:814`
    else if ((uz.dnum | 0) === (game.tower_dnum | 0)) dsc += ' vlad'; // C `:816`
    else if (In_endgame(uz)) dsc += ' endgame'; // C `:818`
    else {
        // C `:820–824` unexpected branch — svd.dungeons[dnum].dname.
        let brname = game.dungeons?.[uz.dnum]?.dname || '';
        if (!brname) brname = 'unknown';
        // C `:823` if (!strncmpi(brname, "the ", 4)) brname += 4 — inline
        // prefix strip (no 4th strncmpi clone: write.js:82, insight.js:743,
        // vault.js:128 stay the only copies).
        if (/^the /i.test(brname)) brname = brname.slice(4);
        dsc += ` ${brname}`;
    }
    // C `:827–828` limit the line length to map width.
    if (dsc.length >= COLNO) dsc = dsc.slice(0, COLNO - 1);
    lines.push(dsc);

    // C `:831–832` display_nhwindow(win, TRUE); destroy_nhwindow(win).
    await show_text_pages(lines);
}

/**
 * C ref: wizcmds.c wiz_levltyp_legend `:839–877` — #terrain choice 6,
 * called from cmd.c doterrain `:1186` (case 6). Explains the base-36
 * output of wiz_map_levltyp(): two columns, left holding [0..N/2-1].
 * Same NHW_TEXT idiom as wiz_map_levltyp above.
 */
export async function wiz_levltyp_legend() {
    const { show_text_pages } = await import('./pager.js');
    // C `:846–847` create_nhwindow(NHW_TEXT); putstr "#terrain encodings:".
    const lines = ['#terrain encodings:', ''];
    // C `:855` last = SIZE(levltyp) & ~1 — always even, may include the
    // padding empty-string entry depending on the table length.
    const last = LEVLTYP_NAMES.length & ~1;
    let buf = ''; // C `:853` *buf = '\0'.
    for (let i = 0; i < last / 2; ++i) {
        for (let j = i; j < last; j += last / 2) {
            const name = LEVLTYP_NAMES[j];
            // C `:859–864` — empty padding shows ' ', the undiggable marker
            // shows '*', else the same int-to-char conversion as
            // wiz_map_levltyp().
            const c = !name
                ? ' '
                : name.slice(0, 11) === 'unreachable' ? '*'
                : j < 10 ? String.fromCharCode(48 + j)
                : j < 36 ? String.fromCharCode(97 + j - 10)
                : String.fromCharCode(65 + j - 36);
            // C `:865` Sprintf(eos(buf), " %c - %-28s").
            buf += ` ${c} - ${name.padEnd(28)}`;
            if (j > i) {
                // C `:866–869` second column completes the pair → putstr.
                lines.push(buf);
                buf = '';
            }
        }
    }
    // C `:873–874` display_nhwindow(win, TRUE); destroy_nhwindow(win).
    await show_text_pages(lines);
}

/* C struct sizes for the `#stats` memory display, LP64 — measured from the
 * pinned headers with gcc (probe in /tmp/sizeof_probe.c, not committed):
 * trap=32 engr=64 light=32 timer=48 damage=32 region=96 rect=8 kinfo=272
 * cemetery=184. Object and monster structs, same probe: obj=112
 * oextra=32 monst=192 mextra=64 egd=640 epri=56 eshk=4960 emin=8
 * edog=64 ebones=28. wseg=16 lives next to size_wseg in worm.js.
 * The contest recorder builds the same LP64 layout, so these
 * header/size constants print what C prints. */
const SIZEOF_TRAP = 32; // struct trap (trap.h:18)
const SIZEOF_ENGR = 64; // struct engr (engrave.h:18)
const SIZEOF_LIGHT = 32; // light_source (hack.h:608)
const SIZEOF_TIMER = 48; // timer_element (timeout.h:62)
const SIZEOF_DAMAGE = 32; // struct damage (rm.h:408)
const SIZEOF_REGION = 96; // NhRegion (region.h:37)
const SIZEOF_RECT = 8; // NhRect (rect.h:8)
const SIZEOF_KINFO = 272; // struct kinfo (hack.h:598)
const SIZEOF_CEMETERY = 184; // struct cemetery (rm.h:418)
const SIZEOF_UNSIGNED = 4; // region monsters[] element (unsigned *)
const SIZEOF_OBJ = 112; // struct obj (obj.h:35)
const SIZEOF_OEXTRA = 32; // struct oextra (obj.h:27)
const SIZEOF_MONST = 192; // struct monst (monst.h:96)
const SIZEOF_MEXTRA = 64; // struct mextra (mextra.h:205)
const SIZEOF_EGD = 640; // struct egd (mextra.h:77)
const SIZEOF_EPRI = 56; // struct epri (mextra.h:95)
const SIZEOF_ESHK = 4960; // struct eshk (mextra.h:123)
const SIZEOF_EMIN = 8; // struct emin (mextra.h:151)
const SIZEOF_EDOG = 64; // struct edog (mextra.h:172)
const SIZEOF_EBONES = 28; // struct ebones (mextra.h:189)

/* C wizcmds.c:1112–1114 — template / header / separator for #stats. */
const STATS_TEMPLATE_HDR = '                             count  bytes';
const STATS_SEP = '---------------------------  ----- -------';

/**
 * C ref: wizcmds.c `template[]` `:1112` `"%-27s  %4ld  %6ld"` — one stats
 * row. C `%4ld`/`%6ld` never truncate wide values; padStart matches that.
 */
function stats_row(hdrbuf, count, size) {
    return `${hdrbuf.padEnd(27)}  ${String(count).padStart(4, ' ')}  ${String(size).padStart(6, ' ')}`;
}

/**
 * C ref: engrave.c engr_stats `:1625–1640` — header + count/size of the
 * head_engr chain into tot ({ hdr, count, size }).
 */
function engr_stats(tot) {
    // C `:1630` Sprintf(hdrbuf, hdrfmt, sizeof (struct engr)).
    tot.hdr = `engravings, size ${SIZEOF_ENGR}+text`;
    tot.count = 0;
    tot.size = 0;
    // C `:1631–1634` — size per engraving is struct + text allocation.
    for (let ep = game.head_engr; ep; ep = ep.nxt_engr) {
        tot.count += 1;
        tot.size += SIZEOF_ENGR + engr_text_alloc(ep);
    }
}

/**
 * C ref: engrave.c make_engr_at text allocation (`:417–454`, used by
 * engr_stats `:1633` `sizeof *ep + ep->engr_alloc`): smem is max strlen+1
 * over the text states and engr_alloc is smem * 3. JS stores the three
 * states as actual/remembered/pristine strings (make_engr_at, engrave.js),
 * so the allocation is 3 * (longest state + 1 NUL).
 */
function engr_text_alloc(ep) {
    const t = ep.engr_txt || {};
    const actual = String(t.actual_text ?? '');
    const remembered = String(t.remembered_text ?? actual);
    const pristine = String(t.pristine_text ?? actual);
    const smem = Math.max(actual.length, remembered.length, pristine.length) + 1;
    return 3 * smem;
}

/**
 * C ref: light.c light_stats `:500–511` — header + count/size of the light
 * list into tot. C walks `gl.light_base` via ->next; JS stores
 * game.light_base as an array (new_light_core, light.js), so walk the
 * array, with the linked shape as fallback.
 */
function light_stats(tot) {
    // C `:504` Sprintf(hdrbuf, hdrfmt, sizeof (light_source)).
    tot.hdr = `light sources, size ${SIZEOF_LIGHT}`;
    tot.count = 0;
    tot.size = 0;
    // C `:505–508`.
    const base = game.light_base;
    if (Array.isArray(base)) {
        for (const ls of base) {
            if (!ls) continue;
            tot.count += 1;
            tot.size += SIZEOF_LIGHT;
        }
    } else {
        for (let ls = base; ls; ls = ls.next) {
            tot.count += 1;
            tot.size += SIZEOF_LIGHT;
        }
    }
}

/**
 * C ref: timeout.c timer_stats `:2734–2745` — header + count/size of the
 * `gt.timer_base` chain (JS: game._timer_base, linked via next —
 * print_queue, timeout.js) into tot.
 */
function timer_stats(tot) {
    // C `:2738` Sprintf(hdrbuf, hdrfmt, sizeof (timer_element)).
    tot.hdr = `timers, size ${SIZEOF_TIMER}`;
    tot.count = 0;
    tot.size = 0;
    // C `:2739–2742`.
    for (let te = game._timer_base; te; te = te.next) {
        tot.count += 1;
        tot.size += SIZEOF_TIMER;
    }
}

/**
 * C ref: region.c region_stats `:898–922` — header + count/size of the
 * regions into tot. C `:901` formats both sizeofs into the header
 * ("regions, size %ld+%ld*rect+N").
 */
function region_stats(tot) {
    tot.hdr = `regions, size ${SIZEOF_REGION}+${SIZEOF_RECT}*rect+N`;
    const regs = game.regions || [];
    // C `:907` count is svn.n_regions; `:908` base size is gm.max_regions
    // preallocated NhRegions — JS regions is a plain array with no spare
    // capacity, so the base is n * sizeof (named adaptation).
    tot.count = regs.length;
    tot.size = regs.length * SIZEOF_REGION;
    // C `:909–918` per-region rects + messages + monster slots
    // (`sizeof *rg->monsters` is sizeof (unsigned)).
    for (const rg of regs) {
        if (!rg) continue;
        tot.size += (rg.nrects | 0) * SIZEOF_RECT;
        if (rg.enter_msg) tot.size += rg.enter_msg.length + 1;
        if (rg.leave_msg) tot.size += rg.leave_msg.length + 1;
        tot.size += (rg.max_monst | 0) * SIZEOF_UNSIGNED;
    }
}

/**
 * C ref: wizcmds.c misc_stats `:1284–1399` (staticfn) — one `#stats`
 * "Miscellaneous" row per live list. Signature adaptation (NHW_TEXT idiom,
 * D-2508/D-2516): `win` is the caller's collected string array; the two
 * C out-params are the mutated `total` accumulator ({ count, size }).
 * The caller (`wiz_show_stats`, C `:1676`) displays the window; this
 * function only appends rows, in C order.
 *
 * @param {string[]} lines caller-collected window lines
 * @param {{ count: number, size: number }} total misc accumulator
 */
export function misc_stats(lines, total) {
    let count, size;
    // C `:1296–1307` — traps output unconditionally. C walks gf.ftrap via
    // ->ntrap; JS game.ftrap is that chain (maketrap, trap.js) or, after a
    // bones restore, an array (bones.js; dual shape like detect.js).
    count = 0;
    size = 0;
    const ftrap = game.ftrap;
    if (Array.isArray(ftrap)) {
        for (const tt of ftrap) {
            if (!tt) continue;
            count += 1;
            size += SIZEOF_TRAP;
        }
    } else {
        for (let tt = ftrap; tt; tt = tt.ntrap) {
            count += 1;
            size += SIZEOF_TRAP;
        }
    }
    total.count += count;
    total.size += size;
    // C `:1305–1306` Sprintf(hdrbuf, "traps, size %ld", sizeof trap).
    lines.push(stats_row(`traps, size ${SIZEOF_TRAP}`, count, size));

    // C `:1309–1314` — engravings output unconditionally via engr_stats.
    const t = { hdr: '', count: 0, size: 0 };
    engr_stats(t);
    total.count += t.count;
    total.size += t.size;
    lines.push(stats_row(t.hdr, t.count, t.size));

    // C `:1316–1323` — light sources only if nonzero.
    t.hdr = '';
    t.count = 0;
    t.size = 0;
    light_stats(t);
    if (t.count || t.size) {
        total.count += t.count;
        total.size += t.size;
        lines.push(stats_row(t.hdr, t.count, t.size));
    }

    // C `:1325–1332` — timers only if nonzero.
    t.hdr = '';
    t.count = 0;
    t.size = 0;
    timer_stats(t);
    if (t.count || t.size) {
        total.count += t.count;
        total.size += t.size;
        lines.push(stats_row(t.hdr, t.count, t.size));
    }

    // C `:1334–1345` — shop damage only if nonzero; svl.level.damagelist
    // (JS: game.level.damagelist, linked via next — shk.js).
    count = 0;
    size = 0;
    for (let sd = game.level?.damagelist; sd; sd = sd.next) {
        count += 1;
        size += SIZEOF_DAMAGE;
    }
    if (count || size) {
        total.count += count;
        total.size += size;
        // C `:1341–1342` Sprintf(hdrbuf, "shop damage, size %ld", ...).
        lines.push(stats_row(`shop damage, size ${SIZEOF_DAMAGE}`, count, size));
    }

    // C `:1347–1354` — regions only if nonzero via region_stats.
    t.hdr = '';
    t.count = 0;
    t.size = 0;
    region_stats(t);
    if (t.count || t.size) {
        total.count += t.count;
        total.size += t.size;
        lines.push(stats_row(t.hdr, t.count, t.size));
    }

    // C `:1356–1367` — delayed killers only if nonzero; svk.killer.next
    // (JS: game.killer.next chain — delayed_killer, end.js).
    count = 0;
    size = 0;
    for (let k = game.killer?.next; k; k = k.next) {
        count += 1;
        size += SIZEOF_KINFO;
    }
    if (count || size) {
        total.count += count;
        total.size += size;
        // C `:1363–1364` plur(count): "s" unless exactly one (plur.c).
        // Inlined (no new plur clone — nine local ones already exist).
        lines.push(stats_row(`delayed killer${count === 1 ? '' : 's'}, size ${SIZEOF_KINFO}`, count, size));
    }

    // C `:1369–1379` — bones history only if nonzero;
    // svl.level.bonesinfo (JS: game.level.bonesinfo via next — bones.js).
    count = 0;
    size = 0;
    for (let bi = game.level?.bonesinfo; bi; bi = bi.next) {
        count += 1;
        size += SIZEOF_CEMETERY;
    }
    if (count || size) {
        total.count += count;
        total.size += size;
        // C `:1375–1376` Sprintf(hdrbuf, "bones history, size %ld", ...).
        lines.push(stats_row(`bones history, size ${SIZEOF_CEMETERY}`, count, size));
    }

    // C `:1381–1396` — object type names only if nonzero; user-named
    // entries of the objects[] table (JS: game.objects, oc_uname —
    // objects_globals_init, objects.js; objnam.js).
    count = 0;
    size = 0;
    const otable = game.objects || [];
    for (let idx = 0; idx < NUM_OBJECTS; ++idx) {
        const uname = otable[idx]?.oc_uname;
        if (uname) {
            count += 1;
            size += uname.length + 1;
        }
    }
    if (count || size) {
        total.count += count;
        total.size += size;
        // C `:1392` Strcpy(hdrbuf, "object type names, text").
        lines.push(stats_row('object type names, text', count, size));
    }
}

/**
 * Walk one C `nobj` or `nmon` chain. Invent, fmon, migrating monsters,
 * and mydogs are arrays in this port (unshift is the C head insert);
 * buried objects are an array after a bones restore and a linked list
 * otherwise. `reorder_invent_adjust` swaps array slots and does not
 * rewrite `nobj`, so an array is the chain. A null slot is not a link.
 * @param {object|object[]|null|undefined} chain
 * @param {'nobj'|'nmon'} link
 * @param {(node: object) => void} visit
 */
function walk_chain(chain, link, visit) {
    if (!chain) return;
    if (Array.isArray(chain)) {
        for (let i = 0; i < chain.length; i++) {
            const node = chain[i];
            if (node) visit(node);
        }
        return;
    }
    for (let node = chain; node; node = node[link]) visit(node);
}

/**
 * Bytes of a C `char *` that size_obj / size_monst add: 0 when the
 * pointer is null, else `strlen + 1`. JS stores a missing pointer as
 * null, undefined, or the free sentinel 0. `""` is the alloc
 * placeholder (`new_oname`, `new_mgivenname`) and counts as one NUL.
 * @param {string|null|undefined} s
 * @returns {number}
 */
function c_str_bytes(s) {
    // 0 is the free sentinel (dealloc_mextra sets mgivenname = 0).
    if (s == null || s === 0) return 0;
    return String(s).length + 1;
}

/**
 * C ref: wizcmds.c size_obj `:1117–1132` (staticfn).
 * `sizeof (struct obj)`, plus `oextra` and the name, attached monster,
 * and mail-command string it owns. Contained objects are not included;
 * `count_obj` walks those. `OMAILCMD` is null in C when there is no
 * command; this port stores that as `""` (`new_omailcmd`), so only a
 * non-empty command is an allocation.
 * @param {object} otmp
 * @returns {number}
 */
function size_obj(otmp) {
    // C `:1119` — sz = sizeof (struct obj).
    let sz = SIZEOF_OBJ;
    // C `:1121–1130`.
    if (otmp.oextra) {
        sz += SIZEOF_OEXTRA;
        sz += c_str_bytes(otmp.oextra.oname);
        // C `:1125–1126` — statue/figurine monster, worm segments excluded.
        if (otmp.oextra.omonst)
            sz += size_monst(otmp.oextra.omonst, false);
        const mail = otmp.oextra.omailcmd;
        if (mail) sz += String(mail).length + 1;
    }
    return sz;
}

/**
 * C ref: wizcmds.c count_obj `:1135–1151` (staticfn).
 * When `top`, each object on this chain counts. When `recurse`, each
 * object's `cobj` is counted as its own top-level chain (and that
 * call recurses). The two out-params are `total` ({ count, size }).
 * @param {object|object[]|null|undefined} chain
 * @param {{ count: number, size: number }} total
 * @param {boolean} top
 * @param {boolean} recurse
 */
function count_obj(chain, total, top, recurse) {
    let count = 0;
    let size = 0;
    // C `:1141–1148` — for (obj = chain; obj; obj = obj->nobj).
    walk_chain(chain, 'nobj', (obj) => {
        if (top) {
            count += 1;
            size += size_obj(obj);
        }
        if (recurse && obj.cobj)
            count_obj(obj.cobj, total, true, true);
    });
    // C `:1149–1150`.
    total.count += count;
    total.size += size;
}

/**
 * C ref: wizcmds.c obj_chain `:1156–1174` (staticfn).
 * Count the chain without its contents. `force` prints a zero row
 * (invent and fobj). Otherwise a zero chain is silent and is not
 * added to the caller's totals.
 * @param {string[]} lines
 * @param {string} src
 * @param {object|object[]|null|undefined} chain
 * @param {boolean} force
 * @param {{ count: number, size: number }} total
 */
function obj_chain(lines, src, chain, force, total) {
    const part = { count: 0, size: 0 };
    // C `:1166` — count_obj(..., TRUE, FALSE).
    count_obj(chain, part, true, false);
    // C `:1168–1173`.
    if (part.count || part.size || force) {
        total.count += part.count;
        total.size += part.size;
        lines.push(stats_row(src, part.count, part.size));
    }
}

/**
 * C ref: wizcmds.c mon_invent_chain `:1177–1196` (staticfn).
 * Sum each monster's `minvent` (top level only). No `force`: a zero
 * sum prints nothing. Dead monsters stay on fmon; their empty packs
 * add nothing.
 * @param {string[]} lines
 * @param {string} src
 * @param {object|object[]|null|undefined} chain
 * @param {{ count: number, size: number }} total
 */
function mon_invent_chain(lines, src, chain, total) {
    const part = { count: 0, size: 0 };
    // C `:1187–1188`.
    walk_chain(chain, 'nmon', (mon) => {
        count_obj(mon.minvent, part, true, false);
    });
    // C `:1190–1195`.
    if (part.count || part.size) {
        total.count += part.count;
        total.size += part.size;
        lines.push(stats_row(src, part.count, part.size));
    }
}

/**
 * C ref: wizcmds.c contained_stats `:1199–1225` (staticfn).
 * Contents only (`top` false, `recurse` true) of invent, fobj, buried
 * objects, migrating objects, and both monster-inventory chains.
 * Bill objects and mydogs are not walked. A zero sum is silent.
 * @param {string[]} lines
 * @param {string} src
 * @param {{ count: number, size: number }} total
 */
function contained_stats(lines, src, total) {
    const part = { count: 0, size: 0 };
    // C `:1208–1211`.
    count_obj(game.invent, part, false, true);
    count_obj(game.fobj, part, false, true);
    count_obj(game.level?.buriedobjlist, part, false, true);
    count_obj(game.migrating_objs, part, false, true);
    // C `:1212–1217` — dead monsters have no inventory; still walked.
    walk_chain(game.fmon, 'nmon', (mon) => {
        count_obj(mon.minvent, part, false, true);
    });
    walk_chain(game.migrating_mons, 'nmon', (mon) => {
        count_obj(mon.minvent, part, false, true);
    });
    // C `:1219–1224`.
    if (part.count || part.size) {
        total.count += part.count;
        total.size += part.size;
        lines.push(stats_row(src, part.count, part.size));
    }
}

/**
 * C ref: wizcmds.c size_monst `:1228–1254` (staticfn).
 * `sizeof (struct monst)`, plus worm segments when `incl_wsegs`, plus
 * `mextra` and each extension it actually points at. `mcorpsenm` is
 * inside `mextra` and is not a further allocation.
 * @param {object} mtmp
 * @param {boolean} incl_wsegs
 * @returns {number}
 */
function size_monst(mtmp, incl_wsegs) {
    // C `:1230`.
    let sz = SIZEOF_MONST;
    // C `:1232–1233` — migrating monsters and mydogs do not count segments.
    if ((mtmp.wormno | 0) && incl_wsegs)
        sz += size_wseg(mtmp);
    // C `:1235–1252`.
    if (mtmp.mextra) {
        sz += SIZEOF_MEXTRA;
        sz += c_str_bytes(mtmp.mextra.mgivenname);
        if (mtmp.mextra.egd) sz += SIZEOF_EGD;
        if (mtmp.mextra.epri) sz += SIZEOF_EPRI;
        if (mtmp.mextra.eshk) sz += SIZEOF_ESHK;
        if (mtmp.mextra.emin) sz += SIZEOF_EMIN;
        if (mtmp.mextra.edog) sz += SIZEOF_EDOG;
        if (mtmp.mextra.ebones) sz += SIZEOF_EBONES;
    }
    return sz;
}

/**
 * C ref: wizcmds.c mon_chain `:1257–1281` (staticfn).
 * Worm segments count only when `src` is `"fmon"` (`strcmpi`). `force`
 * prints a zero row. `total` is the caller's { count, size }.
 * @param {string[]} lines
 * @param {string} src
 * @param {object|object[]|null|undefined} chain
 * @param {boolean} force
 * @param {{ count: number, size: number }} total
 */
function mon_chain(lines, src, chain, force, total) {
    // C `:1268` — !strcmpi(src, "fmon"); strcmpi is strncmpi(..., -1).
    const inclWsegs = strncmpi(src, 'fmon', -1) === 0;
    let count = 0;
    let size = 0;
    // C `:1271–1274`.
    walk_chain(chain, 'nmon', (mon) => {
        count += 1;
        size += size_monst(mon, inclWsegs);
    });
    // C `:1275–1280`.
    if (count || size || force) {
        total.count += count;
        total.size += size;
        lines.push(stats_row(src, count, size));
    }
}

/**
 * C ref: wizcmds.c wiz_show_stats `:1616–1697` — the #stats command.
 * Memory totals for objects, monsters, the dungeon overview, and the
 * miscellaneous lists, then one grand total. NHW_TEXT is the caller's
 * line array (same idiom as misc_stats). `tty_display_nhwindow` blocks
 * for every text window, so `show_text_pages` is that wait.
 * Caller: cmd.c extcmdlist "stats" `:1876–1877`.
 * @returns {Promise<number>} ECMD_OK
 */
export async function wiz_show_stats() {
    const { show_text_pages } = await import('./pager.js');
    // C `:1625–1626` — create_nhwindow(NHW_TEXT); title.
    const lines = [];
    lines.push('Current memory statistics:');

    // C `:1628–1647` — objects.
    const objTot = { count: 0, size: 0 };
    lines.push(STATS_TEMPLATE_HDR);
    lines.push(`  Objects, base size ${SIZEOF_OBJ}`);
    obj_chain(lines, 'invent', game.invent, true, objTot);
    obj_chain(lines, 'fobj', game.fobj, true, objTot);
    obj_chain(lines, 'buried', game.level?.buriedobjlist, false, objTot);
    obj_chain(lines, 'migrating obj', game.migrating_objs, false, objTot);
    obj_chain(lines, 'billobjs', game.billobjs, false, objTot);
    mon_invent_chain(lines, 'minvent', game.fmon, objTot);
    mon_invent_chain(lines, 'migrating minvent', game.migrating_mons, objTot);
    contained_stats(lines, 'contained', objTot);
    lines.push(STATS_SEP);
    lines.push(stats_row('  Obj total', objTot.count, objTot.size));

    // C `:1649–1662` — monsters. mydogs is only live across a level
    // change or disclosure; an empty list still no-ops (force is false).
    const monTot = { count: 0, size: 0 };
    lines.push('');
    lines.push(`  Monsters, base size ${SIZEOF_MONST}`);
    mon_chain(lines, 'fmon', game.fmon, true, monTot);
    mon_chain(lines, 'migrating', game.migrating_mons, false, monTot);
    if (game.mydogs)
        mon_chain(lines, 'mydogs', game.mydogs, false, monTot);
    lines.push(STATS_SEP);
    lines.push(stats_row('  Mon total', monTot.count, monTot.size));

    // C `:1664–1671` — overview_stats appends its own rows.
    const ovrTot = { count: 0, size: 0 };
    lines.push('');
    lines.push('  Overview');
    overview_stats(lines, ovrTot);
    lines.push(STATS_SEP);
    lines.push(stats_row('  Over total', ovrTot.count, ovrTot.size));

    // C `:1673–1679`.
    const miscTot = { count: 0, size: 0 };
    lines.push('');
    lines.push('  Miscellaneous');
    misc_stats(lines, miscTot);
    lines.push(STATS_SEP);
    lines.push(stats_row('  Misc total', miscTot.count, miscTot.size));

    // C `:1681–1688` — grand total of the four sections.
    lines.push('');
    lines.push(STATS_SEP);
    lines.push(stats_row(
        '  Grand total',
        objTot.count + monTot.count + ovrTot.count + miscTot.count,
        objTot.size + monTot.size + ovrTot.size + miscTot.size,
    ));

    // C `:1690–1692` — show_borlandc_stats is
    // `#if defined(__BORLANDC__) && !defined(_WIN32)`, not this build.

    // C `:1694–1695` — display_nhwindow(win, FALSE); destroy_nhwindow.
    await show_text_pages(lines);
    return ECMD_OK;
}

/**
 * C ref: wizcmds.c wiz_display_macros `:1705–1778` — #wizdispmacros command.
 * Verifies the display macros return sane values: every glyph that claims
 * to be cmap / monster / object must peel back to a live table subscript
 * (defsyms / mons / objects). NHW_TEXT via show_text_pages (same idiom as
 * wiz_show_stats above): each C putstr is one collected line;
 * display_nhwindow(win, FALSE) is the page wait inside show_text_pages.
 * Caller: cmd.c extcmdlist "wizdispmacros" `:1956–1958`
 * (IFBURIED|AUTOCOMPLETE|WIZMODECMD) → EXT_CMDS runnable entry.
 * @returns {Promise<number>} ECMD_OK
 */
export async function wiz_display_macros() {
    const { show_text_pages } = await import('./pager.js');
    // C `:1708` — static header, printed once ahead of the first trouble
    // line (`if (!trouble++)` below).
    const display_issues = 'Display macro issues:';
    // C `:1710` — no_glyph = NO_GLYPH, max_glyph = MAX_GLYPH.
    const no_glyph = NO_GLYPH;
    const max_glyph = MAX_GLYPH;
    // C `:1710` SIZE(defsyms) — drawing.c:64 defsyms[MAXPCHARS + 1]; the
    // trailing fencepost entry keeps MAXPCHARS a legal subscript, so
    // IndexOk(test, defsyms) is `0 <= test <= MAXPCHARS`.
    const defsyms_size = MAXPCHARS + 1;
    // C `:1712` — create_nhwindow(NHW_TEXT).
    const lines = [];
    let trouble = 0;
    // C `:1714` — for (glyph = 0; glyph < MAX_GLYPH; ++glyph).
    for (let glyph = 0; glyph < MAX_GLYPH; ++glyph) {
        // C `:1715–1742` — glyph_is_cmap / glyph_to_cmap().
        if (glyph_is_cmap(glyph)) {
            const test = glyph_to_cmap(glyph);
            // C `:1718–1726` — check for MAX_GLYPH return
            // (NO_GLYPH === MAX_GLYPH, display.js:229).
            if (test === no_glyph) {
                if (!trouble++) lines.push(display_issues);
                lines.push(`glyph_is_cmap() / glyph_to_cmap(glyph=${glyph}) sync failure, returned NO_GLYPH (${test})`);
            }
            // C `:1727–1734` — zap glyphs must peel to a zap cmap.
            if (glyph_is_cmap_zap(glyph)
                && !(test >= S_vbeam && test <= S_rslant)) {
                if (!trouble++) lines.push(display_issues);
                lines.push(`glyph_is_cmap_zap(glyph=${glyph}) returned non-zap cmap ${test}`);
            }
            // C `:1735–1742` — check against defsyms array subscripts.
            if (!(test >= 0 && test < defsyms_size)) {
                if (!trouble++) lines.push(display_issues);
                lines.push(`glyph_to_cmap(glyph=${glyph}) returns ${test} exceeds defsyms[${defsyms_size}] bounds (MAX_GLYPH = ${max_glyph})`);
            }
        }
        // C `:1743–1756` — glyph_is_monster / glyph_to_mon, checked
        // against mons array subscripts.
        if (glyph_is_monster(glyph)) {
            const test = glyph_to_mon(glyph);
            if (test < 0 || test >= NUMMONS) {
                if (!trouble++) lines.push(display_issues);
                lines.push(`glyph_to_mon(glyph=${glyph}) returns ${test} exceeds mons[${NUMMONS}] bounds`);
            }
        }
        // C `:1757–1770` — glyph_is_object / glyph_to_obj, checked
        // against objects array subscripts (upper bound is `>`, per C).
        if (glyph_is_object(glyph)) {
            const test = glyph_to_obj(glyph);
            if (test < 0 || test > NUM_OBJECTS) {
                if (!trouble++) lines.push(display_issues);
                lines.push(`glyph_to_obj(glyph=${glyph}) returns ${test} exceeds objects[${NUM_OBJECTS}] bounds`);
            }
        }
    }
    // C `:1771–1773`.
    if (!trouble) lines.push('No display macro issues detected.');
    // C `:1774–1776` — display_nhwindow(win, FALSE); destroy_nhwindow(win).
    await show_text_pages(lines);
    return ECMD_OK;
}

/**
 * C ref: wizcmds.c wizcustom_callback `:1986–2027` — `#wizcustom` menu-fill
 * callback: one customized glyph becomes one menu line. Sole C caller is
 * wizcustom_glyphids (glyphs.c:818), wired in js/glyphs.js. ENHANCED_SYMBOLS
 * is live (config.h:368), so the `:2001` u arm compiles.
 * add_menu `:2022–2023` lands on the JS raw menu array (options.js `raw`
 * idiom): nul_glyphinfo/attr/color/flags have no raw-array counterpart
 * (ATR_NONE, NO_COLOR and MENU_ITEMFLAGS_NONE are the defaults); the
 * PICK_NONE consumer (wiz_custom `:1969`, unported) never selects, so
 * selectable:false with a_int kept for the `#if 0` a_int-1 reader.
 * @param {object[]} win raw menu array (C winid)
 * @param {number} glyphnum
 * @param {string} id glyph identifier from the glyphid cache
 */
export function wizcustom_callback(win, glyphnum, id) {
    // C `:1997` if (win && id).
    if (win && id) {
        // C `:1989` extern glyph_map glyphmap[MAX_GLYPH]; `:1998`
        // cgm = &glyphmap[glyphnum].
        const cgm = ensure_glyphmap()[glyphnum];
        // C `:1999–2003` gate: u (ENHANCED_SYMBOLS arm `:2001`) or nonzero
        // customcolor.
        if (cgm.u != null || (cgm.customcolor >>> 0) !== 0) {
            // C `:2004` Sprintf(bufa, "[%04d] %-44s", glyphnum, id).
            const bufa = `[${String(glyphnum).padStart(4, '0')}] ${id.padEnd(44, ' ')}`;
            // C `:2005–2006` Sprintf(bufb, "'\\%03d' %02d",
            // gs.showsyms[cgm->sym.symidx], cgm->sym.color). nhsym is uchar
            // (global.h:108); game.gs.showsyms lands on the first
            // assign_graphics call (init_symbols itself stays unported),
            // so pre-transition reads are still 0.
            const sh = game.gs?.showsyms?.[cgm.sym.symidx];
            const symch = ((typeof sh === 'string' ? sh.codePointAt(0) : sh) | 0) & 0xff;
            const bufb = `'\\${String(symch).padStart(3, '0')}' ${String(cgm.sym.color | 0).padStart(2, '0')}`;
            // C `:2007` Sprintf(bufc, "%011lx", customcolor).
            const bufc = (cgm.customcolor >>> 0).toString(16).padStart(11, '0');
            // C `:2008` bufu[0] = '\0'.
            let bufu = '';
            // C `:2010` if (cgm->u && cgm->u->utf8str) — a pointer check, so
            // an empty string still enters (the walk then adds nothing).
            if (cgm.u && cgm.u.utf8str != null) {
                // C `:2011` Sprintf(bufu, "U+%04lx", utf32ch).
                bufu = 'U+' + (cgm.u.utf32ch >>> 0).toString(16).padStart(4, '0');
                // C `:2012–2017` cp walk over the NUL-terminated UTF-8 bytes;
                // JS holds utf8str as a UTF-16 string (dupstr ≡ assignment),
                // so re-encode to UTF-8 bytes inline (no TextEncoder dependency).
                const ustr = cgm.u.utf8str;
                const bytes = [];
                for (let ui = 0; ui < ustr.length; ui++) {
                    let cp = ustr.charCodeAt(ui);
                    if (cp >= 0xd800 && cp <= 0xdbff && ui + 1 < ustr.length) {
                        const lo = ustr.charCodeAt(ui + 1);
                        if (lo >= 0xdc00 && lo <= 0xdfff) {
                            cp = 0x10000 + ((cp - 0xd800) << 10) + (lo - 0xdc00);
                            ui++;
                        }
                    }
                    if (cp < 0x80) bytes.push(cp);
                    else if (cp < 0x800) bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
                    else if (cp < 0x10000) bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
                    else bytes.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
                }
                // C `:2013` while (*cp) — a 0 byte ends the walk like NUL.
                let bi = 0;
                while (bi < bytes.length && bytes[bi] !== 0) {
                    bufu += ` <${bytes[bi]}>`; // C `:2014–2015` Sprintf(bufd) + Strcat
                    bi++; // C `:2016` cp++
                }
            }
            // C `:2020` any.a_int = glyphnum + 1 (avoid 0).
            const a_int = glyphnum + 1;
            // C `:2021` Snprintf(buf, sizeof buf, "%s %s %s %s", ...) — the
            // fourth %s is always present, so empty bufu ⇒ trailing space.
            const buf = `${bufa} ${bufb} ${bufc} ${bufu}`;
            // C `:2022–2023` add_menu — see the header comment for the mapping.
            if (Array.isArray(win)) win.push({ text: buf, selectable: false, a_int });
        }
    }
    // C `:2026` return (void).
}

/**
 * C ref: wizcmds.c wiz_smell `:885–939` — #wizsmell wizard command
 * (D-2766). Cursor-pick loop: sniff the hero (own form, or the steed's
 * when mounted) or the monster at the picked cell; map a remembered but
 * unseen monster, unmap stale invisible memory on an empty pick.
 * Caller: cmd.c extcmdlist "wizsmell" `:1994–1995` → EXT_CMDS runnable
 * entry in getline.js (dynamic import, like the other wiz* rows).
 * @returns {Promise<number>} ECMD_OK, or ECMD_CANCEL when getpos aborts.
 */
export async function wiz_smell() {
    const u = game.u || {};
    // C `:893–894` — the pick cursor starts on the hero.
    const cc = { x: u.ux | 0, y: u.uy | 0 };
    // C `:895–898` — this form cannot smell: message + ECMD_OK (no turn).
    if (!olfaction(game.youmonst?.data)) {
        await You('are incapable of detecting odors in your present form.');
        return ECMD_OK;
    }
    // C `:900` — once, before the pick loop.
    await You('can move the cursor to a monster that you want to smell.');
    // C `:901–937` — do { … } while (TRUE): pick until getpos cancels.
    for (;;) {
        // C `:902–903` — prompt then getpos(TRUE, "a monster").
        await pline('Pick a monster to smell.');
        const ans = await getpos(cc, true, 'a monster');
        // C `:904–906` — cancel: ans < 0 or the cursor aborted (cc.x < 0).
        if (ans < 0 || (cc.x | 0) < 0) {
            return ECMD_CANCEL; /* done */
        }
        let is_you = false;
        let mptr = null;
        // C `:907–918` — hero cell: the steed's data when mounted, else
        // youmonst (self sniff); monster cell: m_at data; else none.
        // (mptr pre-nulled: the `:917–918` else arm; m_at runs only when
        // !u_at, as in the C else-if.)
        if (u_at(cc.x, cc.y)) {
            if (u.usteed) {
                mptr = u.usteed.data;
            } else {
                mptr = game.youmonst?.data;
                is_you = true;
            }
        } else {
            const mtmp = m_at(cc.x, cc.y);
            if (mtmp) mptr = mtmp.data;
        }
        // C `:922` — glyph read before the monster test; the `:919–921`
        // buglet note (no turn elapses for the wizmode map/unmap) holds:
        // map_invisible/unmap_invisible below take no turn.
        const glyph = glyph_at(cc.x, cc.y);
        // C `:923–931` — a monster (or self/steed) was picked.
        if (mptr) {
            // C `:925–926` — self sniff goes under your ARM.
            if (is_you) {
                await You('surreptitiously sniff under your %s.', body_part(ARM));
            }
            // C `:927–929` — usmellmon FALSE: the no-smell message.
            if (!(await usmellmon(mptr))) {
                await pline('%s to not give off any smell.',
                    is_you ? 'You seem' : 'That monster seems');
            }
            // C `:930–931` — remembered, unseen monster: map it.
            if (!glyph_is_monster(glyph)) map_invisible(cc.x, cc.y);
        } else {
            // C `:932–936` — empty pick: message + clear stale I memory.
            await You("don't smell any monster there.");
            if (glyph_is_invisible_id(glyph)) unmap_invisible(cc.x, cc.y);
        }
    }
}

/**
 * C ref: wizcmds.c:1484–1501, whole qsort comparator.
 * Array elements are the monst pointers C dereferences from its sort slots.
 * Dungeon and level numbers compare as int; m_id compares as unsigned int.
 */
function migrsort_cmp(m1, m2) {
    const d1 = m1.mux | 0;
    const l1 = m1.muy | 0;
    const d2 = m2.mux | 0;
    const l2 = m2.muy | 0;

    if (d1 !== d2)
        return d1 - d2;
    if (l1 !== l2)
        return l1 - l2;

    const id1 = m1.m_id >>> 0;
    const id2 = m2.m_id >>> 0;
    return id1 < id2 ? -1 : Number(id1 > id2);
}

/**
 * C ref: wizcmds.c:1504–1610, whole migrating-monster list body.
 * The migration array holds C's nmon chain in head-first order. Counting
 * and collection are separate walks, with an input boundary between them.
 * Grow an array instead of alloc(n+1); length replaces its NULL sentinel.
 * Strings implement the terminated prmpt/xtra/buf buffers; GC frees marray.
 * NHW_TEXT putstr/display/destroy use the live pager: wintty.c:1854–1950
 * blocks on text windows regardless of display_nhwindow's FALSE argument.
 */
async function list_migrating_mons(nextlevl) {
    const { show_text_pages } = await import('./pager.js');
    let showit = false;
    let here = 0;
    let nxtlv = 0;
    let other = 0;

    // C :1518–1525: count against the current level before asking for input.
    for (const mtmp of game.migrating_mons || []) {
        if (mtmp.mux === game.u.uz.dnum && mtmp.muy === game.u.uz.dlevel)
            ++here;
        else if (mtmp.mux === nextlevl.dnum && mtmp.muy === nextlevl.dlevel)
            ++nxtlv;
        else
            ++other;
    }
    if (here + nxtlv + other === 0) {
        await pline('No monsters currently migrating.');
    } else {
        // C plur macro and %d/%s formatting, in the same argument order.
        await pline(
            '%d mon%s pending for current level, %d for next level, %d for others.',
            here, here === 1 ? '' : 's', nxtlv, other,
        );
        let prmpt = '';
        let xtra = '';
        // C :1532–1538: unavailable choices are accepted behind ESC.
        if (here)
            prmpt = strkitten(prmpt, 'c');
        else
            xtra = strkitten(xtra, 'c');
        if (nxtlv)
            prmpt = strkitten(prmpt, 'n');
        else
            xtra = strkitten(xtra, 'n');
        if (other)
            prmpt = strkitten(prmpt, 'o');
        else
            xtra = strkitten(xtra, 'o');
        prmpt += 'a q';
        if (xtra)
            prmpt += `\x1b${xtra}`;
        const c = await yn_function('List which?', prmpt, 'q', true);
        let n = c === 'c' ? here
            : c === 'n' ? nxtlv
                : c === 'o' ? other
                    : c === 'a' ? here + nxtlv + other
                        : 0;
        if (n > 0) {
            const lines = [];
            let buf;
            // C :1547–1559: all header switch arms.
            switch (c) {
            case 'c':
            case 'n':
            case 'o':
                buf = `Monster${n === 1 ? '' : 's'} migrating to ${
                    c === 'c' ? 'current level'
                        : c === 'n' ? 'next level' : "'other' levels"}:`;
                break;
            default:
                buf = 'All migrating monsters:';
                break;
            }
            lines.push(buf);
            lines.push('');

            const marray = [];
            n = 0;
            // C :1568: reread gm.migrating_mons after yn_function.
            for (const mtmp of game.migrating_mons || []) {
                if (c === 'a')
                    showit = true;
                else if (mtmp.mux === game.u.uz.dnum
                         && mtmp.muy === game.u.uz.dlevel)
                    showit = c === 'c';
                else if (mtmp.mux === nextlevl.dnum
                         && mtmp.muy === nextlevl.dlevel)
                    showit = c === 'n';
                else
                    showit = c === 'o';

                if (showit)
                    marray[n++] = mtmp;
            }
            // C :1582–1585: array length is the NULL traversal sentinel.
            if (n > 1)
                marray.sort(migrsort_cmp);
            for (n = 0; n < marray.length; ++n) {
                const mtmp = marray[n];
                buf = `  ${minimal_monnam(mtmp, false)}`;
                buf = strsubst(buf, ' <0,0>', '');
                if (has_mgivenname(mtmp))
                    buf += ` named ${MGIVENNAME(mtmp)}`;
                if (c === 'o' || c === 'a')
                    buf += ` to ${mtmp.mux | 0}:${mtmp.muy | 0}`;
                const xyloc = mtmp.mtrack?.[0]?.x | 0;
                if (xyloc === MIGR_EXACT_XY) {
                    const x = mtmp.mtrack?.[1]?.x | 0;
                    const y = mtmp.mtrack?.[1]?.y | 0;
                    buf += ` at <${x},${y}>`;
                }
                lines.push(buf);
            }
            // C :1602–1604: free array, display and destroy text window.
            await show_text_pages(lines);
        } else if (c !== 'q') {
            await pline('None.');
        }
    }
}

/**
 * C ref: wizcmds.c:1872–1930, whole #migratemons command.
 * DEBUG_MIGRATING_MONS is enabled by the pinned DEBUG configuration.
 * getlin is the input boundary; creation and migration remain synchronous.
 * Positive counts create random monsters; negative counts reread fmon's
 * head each pass, including after migration removes the preceding head.
 * C's d_level output pointer is a mutable object, and inbuf a JS string.
 */
export async function wiz_migrate_mons() {
    const { get_level, ledger_no } = await import('./dungeon.js');
    let use_random_mon = true;
    const mongen_saved = game.iflags.debug_mongen;
    const tolevel = {};

    if (Is_stronghold(game.u.uz))
        assign_level(tolevel, game.valley_level);
    else if (!Is_botlevel(game.u.uz))
        get_level(tolevel, depth(game.u.uz) + 1);
    else {
        tolevel.dnum = 0;
        tolevel.dlevel = 0;
    }

    await list_migrating_mons(tolevel);

    // C :1895–1902: initialized buffer stays empty at the bottom level.
    let inbuf = '';
    if (tolevel.dnum || tolevel.dlevel)
        inbuf = await getlin(
            'How many random monsters to migrate to next level? [0]',
        );
    else
        await pline("Can't get there from here.");
    if (inbuf[0] === '\x1b' || inbuf === '')
        return ECMD_OK;

    // C atoi reads an optional sign followed by decimal digits.
    let mcount = parseInt(inbuf, 10) | 0;
    if (mcount < 0) {
        use_random_mon = false;
        mcount *= -1;
    }
    if (mcount < 1)
        mcount = 0;
    else if (mcount > (COLNO - 1) * ROWNO)
        mcount = (COLNO - 1) * ROWNO;

    game.iflags.debug_mongen = false;
    while (mcount > 0) {
        let mtmp;
        if (use_random_mon) {
            const ptr = rndmonst();
            mtmp = makemon(ptr, 0, 0, MM_NOMSG);
        } else {
            mtmp = (game.fmon || [])[0] || null;
        }
        if (mtmp)
            migrate_to_level(mtmp, ledger_no(tolevel), MIGR_RANDOM, null);
        mcount--;
    }
    game.iflags.debug_mongen = mongen_saved;
    return ECMD_OK;
}

/**
 * C ref: wizcmds.c wiz_show_seenv `:576–617` — #wizseenv wizard command
 * (cmd.c extcmdlist "wizseenv" `:1990–1991`,
 * IFBURIED|AUTOCOMPLETE|WIZMODECMD → EXT_CMDS runnable entry in
 * getline.js; the wizcmds.c:574 `/* #seenv command *\/` comment is stale —
 * the registered name is "wizseenv"). Dumps levl[][].seenv as 2-char hex
 * centered on the hero into an NHW_TEXT window (`@@` at the hero, blank
 * for zero), one putstr per map row.
 * Window via lines[] + show_text_pages (NHW_TEXT idiom, D-2508/D-2516);
 * C `:614` display_nhwindow(win, TRUE) is the blocking page wait.
 * Named omissions: none — whole C body live.
 * @returns {Promise<number>} ECMD_OK.
 */
export async function wiz_show_seenv() {
    const { show_text_pages } = await import('./pager.js');
    const u = game.u || {};
    // C `:583` — win = create_nhwindow(NHW_TEXT): collect lines.
    const lines = [];
    // C `:584–589` — center the 2-char cells on the hero. COLNO/4 and
    // COLNO/2 are exact (80/4=20, 80/2=40), matching C integer division.
    let startx = Math.max(1, (u.ux | 0) - (COLNO / 4)); // C `:588`.
    const stopx = Math.min(startx + (COLNO / 2), COLNO); // C `:589`.
    // C `:590–592` — can't have a line exactly 80 chars long.
    if (stopx - startx === COLNO / 2)
        startx++;
    // C `:594–613` — one putstr per map row.
    for (let y = 0; y < ROWNO; y++) {
        // C `:595–605` — 2 chars per cell from startx..stopx-1
        // (row.length tracks C's curx: every pass appends exactly 2).
        let row = '';
        for (let x = startx; x < stopx; x++) {
            if (u_at(x, y)) { // C `:596–597`.
                row += '@@';
            } else {
                // C `:599` — v = levl[x][y].seenv & 0xff.
                const v = ((game.level?.at(x, y)?.seenv | 0) & 0xff);
                // C `:600–603` — blank for 0, else %02x (lowercase).
                row += (v === 0) ? '  ' : v.toString(16).padStart(2, '0');
            }
        }
        // C `:606–610` — remove trailing spaces (terminate after the last
        // non-space; an all-space row becomes the empty string).
        let end = row.length;
        while (end > 0 && row[end - 1] === ' ')
            end--;
        lines.push(row.slice(0, end)); // C `:612` putstr(win, 0, row).
    }
    // C `:614–615` — display_nhwindow(win, TRUE); destroy_nhwindow(win).
    await show_text_pages(lines);
    return ECMD_OK; // C `:616`.
}

// ── wiz_mon_diff / wiz_show_vision ──
/**
 * C ref: wizcmds.c wiz_show_nhuuid `:1782–1786` — #wizshownhuuid prints
 * the game's NHUUID. Named omission: the svn.nhuuid value itself
 * (get_nhuuid is platform startup code with no scored analogue; CROSS
 * builds likewise print empty — pcmain.c:755 stub precedent).
 */
export async function wiz_show_nhuuid() {
    await pline('The NHUUID for this game is { %s }.', game.svn?.nhuuid ?? ''); /* C :1784 */
    return ECMD_OK; /* C :1785 */
}

/**
 * C ref: wizcmds.c wiz_mon_diff `:1789–1828` — wizard review of monster
 * difficulty ratings: one line per monster whose hardcoded `difficulty`
 * differs from the calculated `mstrength()`, else the no-discrepancies
 * line. NHW_TEXT via show_text_pages (file idiom): each C putstr is one
 * collected line; display_nhwindow/destroy_nhwindow subsume into the
 * page wait. C has no callers (0 references; debug review command) —
 * no JS caller to wire.
 */
export async function wiz_mon_diff() {
    // C `:1792–1795` — static title const; trouble/cnt/mdiff ints.
    const window_title = 'Review of monster difficulty ratings [index:level]:';
    let trouble = 0;
    const lines = [];
    // C `:1804` — for (ptr = &mons[0]; ptr->mlet; ptr++, cnt++). NUMMONS
    // bounds the walk; the !mlet sentinel break is verbatim (C's table
    // carries the sentinel, so the bound never fires first).
    for (let i = 0, cnt = 0; i < NUMMONS; i++, cnt++) {
        const ptr = mons(i);
        if (!ptr || !ptr.mlet) break; // C `:1804` ptr->mlet
        const mcalculated = mstrength(ptr); // C `:1805`
        const mhardcoded = ptr.difficulty | 0; // C `:1806` (int)
        const mdiff = mhardcoded - mcalculated; // C `:1807`
        if (mdiff) { // C `:1808`
            if (!trouble++) lines.push(window_title); // C `:1809–1810` (post-incr)
            let mlev = ptr.mlevel | 0; // C `:1811`
            if (mlev > 50) mlev = 50; // C `:1812–1813` named-demon hack
            // C `:1814–1818` — "%-18s [%3d:%2d]: calculated: %2d,
            // hardcoded: %2d (%+d)". Names live in the generated pmnames
            // table (ptr carries no names in JS); padEnd/padStart match
            // printf widths (no truncation either side).
            const name = pmnames[i]?.[NEUTRAL] ?? '';
            lines.push(
                `${name.padEnd(18)} [${String(cnt).padStart(3)}:${String(mlev).padStart(2)}]: ` +
                `calculated: ${String(mcalculated).padStart(2)}, ` +
                `hardcoded: ${String(mhardcoded).padStart(2)} (${mdiff < 0 ? '' : '+'}${mdiff})`,
            );
        }
    }
    if (!trouble) // C `:1822`
        lines.push('No monster difficulty discrepancies were detected.');
    // C `:1823–1824` — display_nhwindow(win, FALSE); destroy_nhwindow(win).
    await show_text_pages(lines);
    return ECMD_OK; // C `:1826`
}

/**
 * C ref: wizcmds.c wiz_show_vision `:620–653` — wizard `#vision` dump of
 * gv.viz_array as flag characters ('@' at the hero, ' ' for 0, '0'+v
 * else), trailing spaces trimmed per row. NHW_TEXT via show_text_pages
 * (file idiom). C has no callers (0 references) — no JS caller to wire.
 */
export async function wiz_show_vision() {
    const lines = [];
    // C `:625–627` — "Flags: 0x%x could see, 0x%x in sight, 0x%x temp
    // lit" (%x: lowercase hex, no pad).
    lines.push(
        `Flags: 0x${COULD_SEE.toString(16)} could see, ` +
        `0x${IN_SIGHT.toString(16)} in sight, 0x${TEMP_LIT.toString(16)} temp lit`,
    );
    lines.push(''); // C `:628` putstr(win, 0, "")
    // C `:629` — for (y = 0; y < ROWNO; y++).
    for (let y = 0; y < ROWNO; y++) {
        // C `:630–638` — row[1..COLNO): '@' at the hero else the viz
        // char. (C indexes row[x] for x in 1..COLNO-1; JS builds the
        // same run 0-based.)
        let row = '';
        for (let x = 1; x < COLNO; x++) {
            if (u_at(x, y)) { // C `:631`
                row += '@';
            } else {
                const v = game.viz_array?.[y]?.[x] | 0; // C `:634` gv.viz_array[y][x]
                row += (v === 0) ? ' ' : String.fromCharCode(48 + v); // C `:635` '0'+v
            }
        }
        // C `:640–644` — remove trailing spaces (terminate after the
        // last non-space; an all-space row becomes the empty string).
        let end = row.length;
        while (end > 0 && row[end - 1] === ' ')
            end--;
        lines.push(row.slice(0, end)); // C `:646` putstr(win, 0, &row[1])
    }
    // C `:648–649` — display_nhwindow(win, TRUE); destroy_nhwindow(win).
    await show_text_pages(lines);
    return ECMD_OK; // C `:651`
}

/* C monattk.h AD_PHYS `:42` — ordinary physical (monkilled dtype). */
const AD_PHYS = 0;

/**
 * C ref: wizcmds.c wiz_custom `:1934–1984` (#wizcustom) — show customized
 * glyphs. The JS menu layer has no create/end/select/destroy (windows.c
 * by-design), so win is the raw menu array the wizcustom_callback port
 * pushes {text, selectable:false, a_int} into, and
 * end_menu+select_menu(PICK_NONE)+destroy is select_menu_pick_none
 * (invent.js), whose entries already include the prompt after the items
 * as after tty_end_menu. Symbol state (gs.symset name/handling,
 * gc.currentgraphics, iflags.colorcount) has no JS writers yet — reads
 * default to the C default-game output ("default", no ", active", no
 * handler, count 0).
 */
export async function wiz_custom() {
    // C `:1938` if (wizard) — sibling gate (wiz_where/wiz_identify).
    if (!(game.flags?.debug || game.flags?.wizard)) {
        // C `:1982` pline(unavailcmd, ecname_from_fn(wiz_custom)).
        await pline(UNAVAILCMD, ecname_from_fn('wizcustom'));
        return ECMD_OK;
    }
    // C `:1946–1947` — fill the glyphid cache when down.
    if (!glyphid_cache_status()) fill_glyphid_cache();
    const win = []; // C `:1951–1952` create_nhwindow(NHW_MENU) + start_menu
    // C `:1953–1955` add_menu_heading (adjacent literals ≡ one string).
    win.push('    glyph  glyph identifier                        '
        + '     sym   clr customcolor unicode utf8');
    // C `:1956–1958` Sprintf(bufa, "%s: colorcount=%ld %s", ...).
    const symName = game.gs?.symset?.[PRIMARYSET]?.name ?? null;
    let bufa = `#wizcustom: colorcount=${game.iflags?.colorcount | 0} ${symName ?? 'default'}`;
    // C `:1959–1960` — currentgraphics is BSS 0 (|0 ≡), PRIMARYSET-gated.
    if ((game.gc?.currentgraphics | 0) === PRIMARYSET && symName) bufa += ', active';
    // C `:1961–1964` — Sprintf(eos(bufa), ", handler=%s", known_handling[…]).
    const handling = game.gs?.symset?.[PRIMARYSET]?.handling | 0;
    if (handling) bufa += `, handler=${KNOWN_HANDLING[handling]}`;
    // C `:1965` Sprintf(buf, "%s", bufa) — dead copy (buf never read); dropped.
    wizcustom_glyphids(win); // C `:1967`
    win.push(bufa); // C `:1968` end_menu(win, bufa) — prompt last
    await select_menu_pick_none(win); // C `:1969–1970` select + destroy
    // C `:1974–1975` free(pick_list) — no JS analogue (raw array, nothing allocated).
    // C `:1976–1977` — drop the cache when up.
    if (glyphid_cache_status()) free_glyphid_cache();
    await docrt(); // C `:1978`
    return ECMD_OK; // C `:1983`
}

/**
 * C ref: wizcmds.c wiz_kill `:243–347` (#wizkill) — slay picked monsters,
 * no game time. No `if (wizard)` gate in C (WIZMODECMD dispatch gates it).
 * Every callee is live: getpos/m_at/unmap_invisible/xkilled/monkilled/
 * dmonsfree/on_level (position/kill), mon_nam/x_monnam/uhis (names),
 * ynq/paranoid_query (asks), pline/You/There/upstart (messages),
 * done (seppuku), dist2 (next2u macro), u_at/has_mgivenname (const).
 */
export async function wiz_kill() {
    const u = game.u || {};
    const cc = { x: u.ux | 0, y: u.uy | 0 }; // C `:253`
    let prompt = 'Pick first monster to slay'; // C `:249`
    const save_verbose = game.flags?.verbose; // C `:251`
    const save_autodescribe = game.iflags?.autodescribe;
    const uarehere = { ...(u.uz || {}) }; // C `:252` d_level copy
    for (;;) {
        await pline('%s:', prompt); // C `:256`
        prompt = 'Next monster'; // C `:257`
        if (!game.flags) game.flags = {};
        if (!game.iflags) game.iflags = {};
        game.flags.verbose = false; // C `:259` FALSE
        game.iflags.autodescribe = true; // C `:260` TRUE
        const ans = await getpos(cc, true, 'a monster'); // C `:261`
        game.flags.verbose = save_verbose; // C `:262`
        game.iflags.autodescribe = save_autodescribe; // C `:263`
        if (ans < 0 || cc.x < 1) break; // C `:264–265`
        let mtmp = null; // C `:267` mtmp = 0
        if (u_at(cc.x, cc.y)) { // C `:268`
            if (u.usteed) { // C `:269`
                // C `:270` Sprintf(qbuf, "Kill %.110s?", mon_nam(...)).
                const qbuf = `Kill ${mon_nam(u.usteed).slice(0, 110)}?`;
                const c = await ynq(qbuf); // C `:271` (JS ynq returns a promise)
                if (c === 'q') break; // C `:271–272`
                if (c === 'y') mtmp = u.usteed; // C `:273–274`
            }
            if (!mtmp) { // C `:276`
                // C `:277–278` — Role_if macro (you.h:247) ≡ gu.urole.mnum.
                const qbuf = `${(game.urole?.mnum | 0) === PM_SAMURAI ? 'Perform seppuku' : 'Commit suicide'}?`;
                if (await paranoid_query(true, qbuf)) { // C `:279` TRUE
                    // C `:280–281` — svk.killer ≡ game.killer (dothrow/eat idiom).
                    if (!game.killer) game.killer = {};
                    game.killer.name = `${uhis()} own player`;
                    game.killer.format = KILLED_BY;
                    await done(DIED); // C `:282`
                }
                break; // C `:284`
            }
        } else if (u.uswallow) { // C `:286`
            // C `:287` — next2u macro (you.h:558) ≡ distu ≤ 2 ≡ dist2 ≤ 2.
            mtmp = dist2(cc.x, cc.y, u.ux | 0, u.uy | 0) <= 2 ? u.ustuck : null;
        } else { // C `:288–289`
            mtmp = m_at(cc.x, cc.y);
        }
        // C `:295` — (void) unmap_invisible: the attempt teaches the square.
        unmap_invisible(cc.x, cc.y);
        if (mtmp) { // C `:297`
            const tame = !!mtmp.mtame; // C `:301`
            // C `:302` — mtmp == u.ustuck is pointer identity (===).
            const seen = canspotmon(mtmp) || (u.uswallow && mtmp === u.ustuck);
            // C `:303–305`.
            const flgs = SUPPRESS_IT | SUPPRESS_HALLUCINATION
                | ((tame && has_mgivenname(mtmp)) ? SUPPRESS_SADDLE : 0);
            const articl = tame ? ARTICLE_YOUR : seen ? ARTICLE_THE : ARTICLE_A; // C `:306`
            // C `:307–308` — null ≡ (const char *) 0.
            const adjs = tame ? (!seen ? 'poor, unseen' : 'poor') : (!seen ? 'unseen' : null);
            const Mn = x_monnam(mtmp, articl, adjs, flgs, false); // C `:309`
            if (!game.iflags.menu_requested) { // C `:311`
                // C `:313` — hero credited/blamed.
                await You('%s %s!', nonliving(mtmp.data) ? 'destroy' : 'kill', Mn);
                await xkilled(mtmp, XKILL_NOMSG); // C `:314`
            } else { // C `:315` — 'm'-prefix: no credit/blame
                if (!game.context) game.context = {};
                game.context.mon_moving = true; // C `:320`
                // C `:321–322`.
                await pline('%s is %s.', upstart(Mn), nonliving(mtmp.data) ? 'destroyed' : 'killed');
                await monkilled(mtmp, null, AD_PHYS); // C `:324–326` (null ≡ (char *) 0)
                game.context.mon_moving = false; // C `:327`
            }
            // C `:330–331` — engulfer dropped the hero onto a level-changer.
            if (u.utotype || !on_level(u.uz, uarehere)) break;
        } else { // C `:332–335`
            await There('is no monster there.');
            break;
        }
    }
    await dmonsfree(); // C `:343` — force dead-monster cleanup
    return ECMD_OK; // C `:345` — no time elapses
}

// ── wiz_show_wmodes / wiz_objprobs ──
/**
 * C ref: wizcmds.c wiz_show_wmodes `:656–689` — wizard `#wmode` dump
 * (cmd.c extcmdlist "wmode" `:2002–2003`, IFBURIED|AUTOCOMPLETE|WIZMODECMD
 * → EXT_CMDS runnable entry in getline.js) of wall-info modes: '@' at
 * the hero, '0'+(wall_info&WM_MASK) on walls/secret doors, '#' on
 * corridors, '.' on rooms/doors, 'x' elsewhere. NHW_TEXT via
 * show_text_pages (file idiom): each C putstr is one collected line;
 * display_nhwindow/destroy_nhwindow subsume into the page wait. C has
 * no callers (dispatched from the extcmd table only) — the JS caller
 * is the getline.js `#wmode` runner.
 */
export async function wiz_show_wmodes() {
    const { show_text_pages } = await import('./pager.js');
    // C `:663` — boolean istty = WINDOWPORT(tty). The scored port is
    // tty (options.js windowport_tty() unconditionally true; bones.js
    // idiom), so the gate is a constant, kept in C position.
    const istty = true;
    const lines = []; // C `:665` win = create_nhwindow(NHW_TEXT)
    if (istty)
        lines.push(''); // C `:666–667` putstr(win, 0, "") — tty blank top line
    // C `:668` — for (y = 0; y < ROWNO; y++).
    for (let y = 0; y < ROWNO; y++) {
        // C `:669–681` — row[x] per cell for x in 0..COLNO-1, but C
        // `:684` prints &row[1] (column 0 is off the left screen
        // edge), so JS builds that same run directly (wiz_show_vision
        // idiom).
        let row = '';
        for (let x = 1; x < COLNO; x++) {
            const lev = game.level?.at(x, y); // C `:670` lev = &levl[x][y]
            // C cells always exist; STONE is the JS unloaded-level
            // guard (wiz_map_levltyp idiom).
            const typ = lev?.typ ?? STONE;
            if (u_at(x, y)) { // C `:671–672`
                row += '@';
            } else if (IS_WALL(typ) || typ === SDOOR) { // C `:673–674`
                // C `:674` '0' + (lev->wall_info & WM_MASK).
                row += String.fromCharCode(48 + (((lev?.wall_info || 0) & WM_MASK)));
            } else if (typ === CORR) { // C `:675–676`
                row += '#';
            } else if (IS_ROOM(typ) || IS_DOOR(typ)) { // C `:677–678`
                row += '.';
            } else { // C `:679–680`
                row += 'x';
            }
        }
        // C `:682–684` — row[COLNO] = '\0'; putstr(win, 0, &row[1]).
        lines.push(row);
    }
    // C `:686–687` — display_nhwindow(win, TRUE); destroy_nhwindow(win).
    await show_text_pages(lines);
    return ECMD_OK; // C `:688`
}

/**
 * C ref: wizcmds.c wiz_objprobs `:1831–1868` — wizard `#wizobjprobs`
 * dump (cmd.c extcmdlist "wizobjprobs" `:1977–1978`,
 * IFBURIED|WIZMODECMD, no AUTOCOMPLETE; the `#if DEVEL||DEBUG` guard
 * is live — patchlevel.h:36 defines DEBUG — so the row ships like
 * wizmondiff; → EXT_CMDS runnable entry in getline.js) of
 * per-object generation probabilities: "%4d / %4d (%6.2f%%): %s"
 * per named object with a blank line before each new object class.
 * NHW_TEXT via show_text_pages (file idiom). C has no callers
 * (dispatched from the extcmd table only) — the JS caller is the
 * getline.js `#wizobjprobs` runner.
 */
export async function wiz_objprobs() {
    const { show_text_pages } = await import('./pager.js');
    const objs = game.objects || []; // C `objects[]` global
    // C `:1838` — oclass starts at the first object's class so the
    // first named row prints no leading blank line.
    let oclass = objs[FIRST_OBJECT]?.oc_class | 0;
    // C `:1839` — memset(probsum, 0, sizeof probsum).
    const probsum = new Array(MAXOCLASSES).fill(0);
    // C `:1841–1843` — class totals over every otyp, placeholders
    // included (their oc_prob is 0, so they add nothing).
    for (let otyp = FIRST_OBJECT; otyp < NUM_OBJECTS; otyp++) {
        probsum[objs[otyp]?.oc_class | 0] += objs[otyp]?.oc_prob | 0;
    }
    const lines = []; // C `:1845` win = create_nhwindow(NHW_TEXT)
    // C `:1846–1863`.
    for (let otyp = FIRST_OBJECT; otyp < NUM_OBJECTS; otyp++) {
        // C `:1847–1849` — placeholders for extra descriptions carry
        // no name (OBJ_NAME(objclass.h:190) ≡ generated
        // objectNameStrs, null there); skip before the class-break
        // test so the blank line tracks named rows only.
        const name = objectNameStrs[otyp];
        if (!name)
            continue;
        // C `:1851–1853` — blank line before a new class's first row.
        if ((objs[otyp]?.oc_class | 0) !== oclass)
            lines.push('');
        oclass = objs[otyp]?.oc_class | 0; // C `:1854`
        // C `:1856–1862` — "%4d / %4d (%6.2f%%): %s". The division is
        // C float (Math.fround), the widths padStart (no truncation
        // either side: %4d/%6.2f never truncate).
        const prob = objs[otyp]?.oc_prob | 0;
        const total = probsum[oclass] | 0;
        const pct = Math.fround((prob * 100) / total).toFixed(2);
        lines.push(
            `${String(prob).padStart(4)} / ${String(total).padStart(4)} (${pct.padStart(6)}%): ${name}`,
        );
    }
    // C `:1864–1865` — display_nhwindow(win, FALSE); destroy_nhwindow(win).
    await show_text_pages(lines);
    return ECMD_OK; // C `:1867`
}
