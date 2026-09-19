// wizcmds.js — Wizard-mode extended commands (partial).
// C ref: wizcmds.c

import { game } from './gstate.js';
import { pline, docrt, impossible, flush_topl_more, Warn_of_mon } from './display.js';
import { getlin } from './getline.js';
import { pluslvl, losexp } from './exper.js';
import { makewish } from './zap.js';
import { create_particular } from './read.js';
import { level_tele } from './teleport.js';
import {
    ECMD_OK, MAXULEV, TIMEOUT, KILLED_BY, SICK_VOMITABLE, SICK_NONVOMITABLE,
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
    LIFESAVED, Upolyd, COLNO, ROWNO, STONE, S_sink, S_fountain,
    In_sokoban, Is_knox, In_endgame,
} from './const.js';
import { ATR_INVERSE } from './terminal.js';
import { make_blinded } from './do.js';
import { m_at, rescham } from './mon.js';
import { check_invent_gold } from './invent.js';
import { rn2 } from './rng.js';
import { float_vs_flight } from './polyself.js';
import { pooleffects } from './pickup.js';
import { mons } from './monsters.js';
import { PM_GRID_BUG } from './generated/monsters_data.js';
import { NUM_OBJECTS } from './objects.js';

/** C timeout.c propertynames[] — wizard #wizintrinsic menu order. */
const PROPERTYNAMES = [
    [INVULNERABLE, 'invulnerable'],
    [STONED, 'petrifying'],
    [SLIMED, 'becoming slime'],
    [STRANGLED, 'strangling'],
    [SICK, 'fatally sick'],
    [STUNNED, 'stunned'],
    [CONFUSION, 'confused'],
    [HALLUC, 'hallucinating'],
    [BLINDED, 'blinded'],
    [DEAF, 'deafness'],
    [VOMITING, 'vomiting'],
    [GLIB, 'slippery fingers'],
    [WOUNDED_LEGS, 'wounded legs'],
    [SLEEPY, 'sleepy'],
    [TELEPORT, 'teleporting'],
    [POLYMORPH, 'polymorphing'],
    [LEVITATION, 'levitating'],
    [FAST, 'very fast'],
    [CLAIRVOYANT, 'clairvoyant'],
    [DETECT_MONSTERS, 'monster detection'],
    [SEE_INVIS, 'see invisible'],
    [INVIS, 'invisible'],
    [ACID_RES, 'acid resistance'],
    [STONE_RES, 'stoning resistance'],
    [DISPLACED, 'displaced'],
    [PASSES_WALLS, 'pass thru walls'],
    [MAGICAL_BREATHING, 'magical breathing'],
    [WWALKING, 'water walking'],
    [FIRE_RES, 'fire resistance'],
    [COLD_RES, 'cold resistance'],
    [SLEEP_RES, 'sleep resistance'],
    [DISINT_RES, 'disintegration resistance'],
    [SHOCK_RES, 'shock resistance'],
    [POISON_RES, 'poison resistance'],
    [DRAIN_RES, 'drain resistance'],
    [SICK_RES, 'sickness resistance'],
    [ANTIMAGIC, 'magic resistance'],
    [HALLUC_RES, 'hallucination resistance'],
    [BLND_RES, 'light-induced blindness resistance'],
    [FUMBLING, 'fumbling'],
    [HUNGER, 'voracious hunger'],
    [TELEPAT, 'telepathic'],
    [WARNING, 'warning'],
    [WARN_OF_MON, 'warn: monster type or class'],
    [WARN_UNDEAD, 'warn: undead'],
    [SEARCHING, 'searching'],
    [INFRAVISION, 'infravision'],
    [ADORNED, 'adorned (+/- Cha)'],
    [STEALTH, 'stealthy'],
    [AGGRAVATE_MONSTER, 'monster aggravation'],
    [CONFLICT, 'conflict'],
    [JUMPING, 'jumping'],
    [TELEPORT_CONTROL, 'teleport control'],
    [FLYING, 'flying'],
    [SWIMMING, 'swimming'],
    [SLOW_DIGESTION, 'slow digestion'],
    [HALF_SPDAM, 'half spell damage'],
    [HALF_PHDAM, 'half physical damage'],
    [REGENERATION, 'HP regeneration'],
    [ENERGY_REGENERATION, 'energy regeneration'],
    [PROTECTION, 'extra protection'],
    [PROT_FROM_SHAPE_CHANGERS, 'protection from shape changers'],
    [POLYMORPH_CONTROL, 'polymorph control'],
    [UNCHANGING, 'unchanging'],
    [REFLECTING, 'reflecting'],
    [FREE_ACTION, 'free action'],
    [FIXED_ABIL, 'fixed abilities'],
    [LIFESAVED, 'life will be saved'],
];

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
    for (const [p, name] of PROPERTYNAMES) {
        if (p === HALLUC_RES) continue;
        if (p === FIRE_RES) {
            raw.push({ text: '--', selectable: false });
        }
        const oldtimeout = prop_old_timeout(p);
        const text = oldtimeout
            ? `${name.padEnd(27)} [${oldtimeout}]`
            : name;
        raw.push({ text, selectable: true, prop: p, propname: name });
    }

    const selected = await select_menu_pick_any(raw);
    for (const it of selected) {
        const p = it.prop;
        const propname = it.propname;
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
    const buf = await getlin('To what experience level do you want to be set?');
    // C: mungspaces then sscanf("%d%c"); ESC/empty → ret=0 → Never_mind.
    const trimmed = (buf || '').trim();
    let newlevel = 0;
    let ret = 0;
    if (buf && buf !== '\x1b' && trimmed && /^-?\d+$/.test(trimmed)) {
        newlevel = parseInt(trimmed, 10);
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
    do_mapping();
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
    // C: cmd_from_func(wiz_identify) → C('I'); NUL remapping → C('I')
    const CTRL_I = 9;
    game.iflags.override_ID = CTRL_I;
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
 * C ref: cmd.c makemap_prepost — discard (pre) then place (post) after
 * #wizmakemap mklev. Post places via u_on_rndspot
 * ((amulet?1:0)|(wiztower?2:0)) (D-1288; C :1043–1046) instead of
 * safe_teleds, then losedogs / kill_genocided / u_collide_m / initrack /
 * Punished placebc / docrt / flush / splev / check_special_room(FALSE).
 * Named omissions: makemap_remove_mons / rm_mapseen / mine·soko prize;
 * maybe_reset_pick; digging memset; polearm.hitmon; dmonsfree/dobjsfree;
 * savelev freeing nhfile; INSURANCE save_currentstate;
 * sp_lev.c lspo_reset_level / lspo_finalize_level.
 */
export async function makemap_prepost(pre, wiztower) {
    const u = game.u || (game.u = {});
    if (pre) {
        const { ballrelease, unplacebc } = await import('./ball.js');
        const { reset_utrap } = await import('./trap.js');
        const { check_special_room, set_uinwater } = await import('./hack.js');
        // C: Punished ≡ uball != 0
        if (u.uball) {
            await ballrelease(false);
            unplacebc();
        }
        if (!game.iflags) game.iflags = {};
        if (!game.iflags.travelcc) game.iflags.travelcc = { x: 0, y: 0 };
        game.iflags.travelcc.x = 0;
        game.iflags.travelcc.y = 0;
        reset_utrap(false);
        await check_special_room(true);
        game.dndest = zero_dest_area();
        game.updest = zero_dest_area();
        u.ustuck = null;
        u.uswallow = 0;
        u.uswldtim = 0;
        await set_uinwater(0);
        u.uundetected = 0;
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
        unplacebc();
        placebc();
    }
    await docrt();
    await flush_screen(1);
    await deliver_splev_message();
    await check_special_room(false);
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
 * clamps then invent gold/invlet. Caller sanity_check.
 * Named omit: worn.c check_wornmask_slots `:1439`.
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

    // C `:1439` check_wornmask_slots — named omit (worn.c).
    await check_invent_gold('invent');
}

/**
 * C wizcmds.c sanity_check `:1459–1481`.
 * Envelope: sanity_no_check (^P/^R CMD_INSANE); in_sanity_check for
 * impossible(); you_sanity_check gold/invlet via check_invent_gold
 * ("invent") then `bc_sanity_check` (`ball.c:1034–1102`, `:1476` —
 * after light_sources, before trap). Caller allmain.c moveloop_core
 * when iflags.sanity_check || debug_fuzzer (opt_in Off).
 * Named omit: obj/timer/mon/light/trap/engraving/levl sanity;
 * check_wornmask_slots; dobjsfree / clear_bypasses / resume_wish.
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
    // C `:1472–1479` siblings obj/timer/mon/light stay named omits;
    // bc_sanity_check is live (ball.js); trap/engraving/levl stay named.
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
 * cemetery=184. The contest recorder builds the same LP64 layout, so these
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
 * The caller (C wiz_show_stats `:1676`, not yet ported) displays the
 * window; this function only appends rows, in C order.
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
