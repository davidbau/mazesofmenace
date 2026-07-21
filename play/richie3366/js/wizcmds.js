// wizcmds.js — Wizard-mode extended commands (partial).
// C ref: wizcmds.c

import { game } from './gstate.js';
import { pline, docrt } from './display.js';
import { getlin } from './getline.js';
import { pluslvl } from './exper.js';
import { makewish } from './zap.js';
import { create_particular } from './read.js';
import { level_tele } from './teleport.js';
import {
    ECMD_OK, MAXULEV, TIMEOUT,
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
    LIFESAVED,
} from './const.js';
import { ATR_INVERSE } from './terminal.js';

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

/** Flat H* mirrors used by exerper / nh_timeout / display gates. */
const PROP_FLAT = {
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
 * C ref: wizcmds.c wiz_intrinsic — #wizintrinsic
 * Envelope: propertynames menu + HALLUC → make_hallucinated;
 * BLINDED → make_blinded (no Timeout pline; silent if already Blind)
 * (D-0928); default incr_itimeout mirrors. Named omissions: deaf/sick/
 * slimed/stoned/stunned/vomiting/glib special arms; count-prefix menu
 * digits; float_vs_flight / rescham / pooleffects; WARN_OF_MON species;
 * SICK rn2 vomit-type; unavailcmd ecname wording; make_blinded talk
 * gain/lose-sight messages.
 */
export async function wiz_intrinsic() {
    if (!(game.flags?.debug || game.flags?.wizard)) {
        await pline("You can't do that.");
        return ECMD_OK;
    }
    const { select_menu_pick_any } = await import('./options.js');
    const { make_hallucinated, make_confused } = await import('./potion.js');

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
        // Menu count prefix deferred — always DEFAULT_TIMEOUT_INCR
        const amt = DEFAULT_TIMEOUT_INCR;
        let newtimeout = oldtimeout + amt;
        if ((p === SICK || p === SLIMED || p === STONED)
            && oldtimeout > 0 && newtimeout > oldtimeout) {
            newtimeout = oldtimeout;
        }
        if (p === HALLUC) {
            await make_hallucinated(newtimeout, true, 0);
        } else if (p === CONFUSION) {
            await make_confused(newtimeout, true);
        } else if (p === BLINDED) {
            // C: make_blinded(newtimeout, TRUE) — not generic Timeout pline.
            // Already Blind + increasing → silent (no --More--).
            incr_prop_timeout(p, amt);
            if (game.flags) game.flags.botl = true;
            const u = game.u || {};
            u.Blind = !!(((u.HBlinded | 0) || (u.EBlinded | 0))
                && !(u.BBlinded | 0));
        } else {
            incr_prop_timeout(p, amt);
            if (game.flags) game.flags.botl = true;
            await pline(
                `Timeout for ${propname} ${oldtimeout ? 'increased by' : 'set to'} ${amt}.`,
            );
        }
    }
    await docrt();
    return ECMD_OK;
}

/**
 * C ref: wizcmds.c wiz_level_change — #levelchange
 * Level-drain (losexp) path deferred; raise via pluslvl(FALSE) only.
 */
export async function wiz_level_change() {
    const u = game.u || (game.u = {});
    const buf = await getlin('To what experience level do you want to be set?');
    if (!buf || buf === '\x1b') return;

    const trimmed = buf.trim();
    if (!trimmed) return;

    // C: sscanf("%d%c") must consume the whole string as one int
    if (!/^-?\d+$/.test(trimmed)) {
        await pline('Never mind.');
        return;
    }
    let newlevel = parseInt(trimmed, 10);
    if (!Number.isFinite(newlevel)) {
        await pline('Never mind.');
        return;
    }

    if (newlevel === (u.ulevel | 0)) {
        await pline('You are already that experienced.');
    } else if (newlevel < (u.ulevel | 0)) {
        // C: losexp("#levelchange") loop — deferred (tours only raise)
        if ((u.ulevel | 0) === 1) {
            await pline('You are already as inexperienced as you can get.');
            return;
        }
        // Drain path omitted; see C-JS-MAP.
        return;
    } else {
        if ((u.ulevel | 0) >= MAXULEV) {
            await pline('You are already as experienced as you can get.');
            return;
        }
        if (newlevel > MAXULEV) newlevel = MAXULEV;
        while ((u.ulevel | 0) < newlevel) {
            await pluslvl(false);
        }
    }
    u.ulevelmax = u.ulevel;
}

/**
 * C ref: wizcmds.c wiz_wish — #wizwish / ^W
 */
export async function wiz_wish() {
    if (!(game.flags?.debug || game.flags?.wizard)) {
        await pline("You can't do that.");
        return;
    }
    const save_verbose = game.flags.verbose;
    game.flags.verbose = false;
    await makewish();
    game.flags.verbose = save_verbose;
    // encumber_msg deferred
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
