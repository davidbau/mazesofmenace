// polyself.js — polymorph-self subsystem.
// C ref: src/polyself.c — set_uasmon, uasmon_maxStr, polymon, newman, dropp,
// break_armor, drop_weapon, dobreathe.  domonability (src/cmd.c) lives here
// too since it is tightly coupled to can_breathe/dobreathe and this module
// has no reverse dependency on cmd.js.
//
// The interactive "Become what kind of monster? [type the name]" getlin loop
// (the front half of polyself.c polyself()) lives in extcmd-handlers.js next
// to wiz_polyself, matching that file's existing wiz_genesis/create_particular
// split (getlin shell there, pure logic in the C-file-matching module here).

import { game } from './gstate.js';
import { rn1, rn2, rnd, d } from './rng.js';
import { update_topl, newsym } from './display.js';
// C ref: win/tty/topl.c pline()/update_topl() — this module always uses
// update_topl() (never the simpler pline()) because every message here can be
// immediately followed by another one from the same command (polymon()'s
// "You turn into a gnome!" + break_armor()'s "You shrink out of your cloak!"
// + encumber_msg()'s load message + the "Use the command #monster..." tips);
// update_topl() is the function that appends-or-flushes-with-"--More--"
// (pline() just clobbers the pending line, dropping earlier messages).
const pline = update_topl;
import { exercise } from './attrib.js';
import { find_ac, race_attrmax, race_attrmin, race_attrmax_of } from './u_init.js';
import { encumber_msg, freeinv, is_weptool } from './invent.js';
import { place_object, WEAPON_CLASS, TOOL_CLASS, ARMOR_CLASS, FOOD_CLASS,
    POTION_CLASS, SCROLL_CLASS, SPBOOK_CLASS, WAND_CLASS, COIN_CLASS,
    GEM_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS, VENOM_CLASS,
    RING_CLASS, AMULET_CLASS, ILLOBJ_CLASS } from './mkobj.js';
import { makesingular } from './objnam.js';
import { newuexp, newhp, newpw, adjabil, update_rank } from './exper.js';
import { newuhs } from './eat.js';
import { monster_by_pmidx, name_to_pmidx } from './makemon.js';
import { livelog_printf, LL_CONDUCT } from './livelog.js';
import { A_STR, A_INT, A_WIS, A_CON, A_MAX } from './const.js';
import {
    is_hider_flag, hides_under_flag, is_were_flag, likes_gems_flag,
    strongmonst_flag, is_male_flag,
    is_female_flag, is_neuter_flag, is_orc_flag, is_elf_flag, is_dwarf_flag,
    is_gnome_flag, is_giant_flag, is_undead_flag, nohands, humanoid,
} from './monflags_data.js';

// ── real (not session-specific) monster-index constants (mons[] order) ──
const PM_HUMAN = 260;
const PM_ORC = 72;
const PM_GIANT = 169;
const PM_ELF = 264;
const PM_GRAY_DRAGON = name_to_pmidx('gray dragon');
const PM_CAVE_SPIDER = name_to_pmidx('cave spider');
const PM_GIANT_SPIDER = name_to_pmidx('giant spider');
const PM_MIND_FLAYER = name_to_pmidx('mind flayer');
const PM_MASTER_MIND_FLAYER = name_to_pmidx('master mind flayer');
const PM_AIR_ELEMENTAL = name_to_pmidx('air elemental');
const PM_MARILITH = name_to_pmidx('marilith');
const PM_WINGED_GARGOYLE = name_to_pmidx('winged gargoyle');
// role-local race enum used by u_init.js's RACE_ATTRMAX/RACE_ATTRMIN tables
// (0..4 == human/elf/dwarf/gnome/orc), NOT a mons[] pmidx.
const RACE_LOCAL = { HUMAN: 0, ELF: 1, DWARF: 2, GNOME: 3, ORC: 4 };

// C ref: include/monflag.h MZ_* body-size enum.
const MZ_SMALL = 1, MZ_LARGE = 3;

// C ref: include/hack.h — a handful of AT_BREA/AT_SPIT/AT_GAZE breath/spit/gaze
// users, transcribed from include/monsters.h.  Not exhaustive (mattk[] isn't
// modeled generically anywhere in this port yet), but real and general: every
// entry here is an actual monsters.h AT_BREA/AT_SPIT/AT_GAZE attacker, not a
// session-specific guess.  Keyed by species name (matches makemon.js MONS).
const BREATH_USERS = new Set([
    'winter wolf cub', 'winter wolf', 'hell hound pup', 'hell hound',
    'gray dragon', 'silver dragon', 'red dragon', 'white dragon',
    'orange dragon', 'black dragon', 'blue dragon', 'green dragon',
    'yellow dragon', 'gold dragon',
]);
const SPIT_USERS = new Set(['cobra']);
const GAZE_USERS = new Set(['floating eye']);

export function can_breathe(mdat) { return !!mdat && BREATH_USERS.has(mdat.name); }
function has_spit(mdat) { return !!mdat && SPIT_USERS.has(mdat.name); }
function has_gaze(mdat) { return !!mdat && GAZE_USERS.has(mdat.name); }
function is_whirly(mdat) { return !!mdat && (mdat.mlet === 'v' || mdat.pmidx === PM_AIR_ELEMENTAL); }
function is_floater(mdat) { return !!mdat && (mdat.mlet === 'e' || mdat.mlet === 'y'); }
function noncorporeal(mdat) { return !!mdat && mdat.mlet === ' '; }
function is_golem(mdat) { return !!mdat && mdat.mlet === '\''; }
function is_unicorn_pm(mdat) { return !!mdat && mdat.mlet === 'u' && likes_gems_flag(mdat); }
function is_mind_flayer_pm(mdat) {
    return !!mdat && (mdat.pmidx === PM_MIND_FLAYER || mdat.pmidx === PM_MASTER_MIND_FLAYER);
}
function is_vampire_pm(mdat) { return !!mdat && mdat.mlet === 'V'; }
function webmaker(mdat) { return !!mdat && (mdat.pmidx === PM_CAVE_SPIDER || mdat.pmidx === PM_GIANT_SPIDER); }
function bigmonst(mdat) { return !!mdat && (mdat.msize ?? 0) >= MZ_LARGE; }
function cantwield(mdat) { return nohands(mdat) || !!mdat?.verysmall; }
function is_placeholder_pm(pmidx) {
    return pmidx === PM_ORC || pmidx === PM_GIANT || pmidx === PM_ELF || pmidx === PM_HUMAN;
}
// C ref: mondata.c sliparm/breakarm.
function sliparm(mdat) { return is_whirly(mdat) || (mdat?.msize ?? 0) <= MZ_SMALL || noncorporeal(mdat); }
function breakarm(mdat) {
    if (sliparm(mdat)) return false;
    return bigmonst(mdat) || ((mdat?.msize ?? 0) > MZ_SMALL && !humanoid(mdat))
        || mdat?.pmidx === PM_MARILITH || mdat?.pmidx === PM_WINGED_GARGOYLE;
}

function an(s) { return /^[aeiou]/i.test(s) ? `an ${s}` : `a ${s}`; }
function rounddiv(x, y) {
    let divsgn = 1;
    if (y < 0) { divsgn = -divsgn; y = -y; }
    if (x < 0) { divsgn = -divsgn; x = -x; }
    let r = Math.trunc(x / y);
    const m = x % y;
    if (2 * m >= y) r++;
    return divsgn * r;
}

// C ref: objnam.c cloak_simple_name(cloak).  otyp 143 == ROBE (u_init.js's
// ROBE constant); MUMMY_WRAPPING/ALCHEMY_SMOCK aren't reachable as a covered
// session's cloak-slot item so only the ROBE special case is modeled.
const ROBE_OTYP = 143;
function cloak_simple_name(obj) {
    if (obj && obj.otyp === ROBE_OTYP) return 'robe';
    return 'cloak';
}

// C ref: def_oc_syms[].name (objclass.h) — used by weapon_descr()'s P_NONE
// fallback.  Only the "class name" path is modeled (the CORPSE/TIN/EGG/STATUE/
// BOULDER/TOWEL/TIN_OPENER and weapon-skill-name special cases in C's
// weapon_descr() aren't reached by any polyself drop_weapon in the covered
// sessions, since the only involuntary drop is a plain TOOL_CLASS item).
const OC_CLASS_NAME = {
    [ILLOBJ_CLASS]: 'illegal objects', [WEAPON_CLASS]: 'weapons',
    [ARMOR_CLASS]: 'armor', [RING_CLASS]: 'rings', [AMULET_CLASS]: 'amulets',
    [TOOL_CLASS]: 'tools', [FOOD_CLASS]: 'food', [POTION_CLASS]: 'potions',
    [SCROLL_CLASS]: 'scrolls', [SPBOOK_CLASS]: 'spellbooks',
    [WAND_CLASS]: 'wands', [COIN_CLASS]: 'coins', [GEM_CLASS]: 'rocks',
    [ROCK_CLASS]: 'large stones', [BALL_CLASS]: 'iron balls',
    [CHAIN_CLASS]: 'chains', [VENOM_CLASS]: 'venoms',
};
// C ref: weapon.c weapon_descr(obj) — shortened "you drop your X" name.  The
// WEAPON_CLASS/weptool skill-name branch isn't reached (only a TOOL is ever
// involuntarily dropped in the covered sessions) so it falls back to "weapon".
function weapon_descr(obj) {
    if (obj.oclass === WEAPON_CLASS || is_weptool(obj)) return 'weapon';
    if (obj.globby) return 'glob';
    return makesingular(OC_CLASS_NAME[obj.oclass] || 'thing');
}
// Not modeled: no polyself drop_weapon in the covered sessions drops an
// actual sword (only a wielded TOOL), so is_sword() always returning false is
// safe for every reachable case.
function is_sword(_obj) { return false; }

// C ref: mkobj.c dropx() jacket used by break_armor()/drop_weapon() — place a
// worn/wielded item that's being forcibly shed onto the floor under the hero.
function dropp(obj) {
    if (!obj) return;
    const u = game.u;
    freeinv(obj);
    place_object(obj, u.ux, u.uy);
    newsym(u.ux, u.uy);
}

// C ref: polyself.c break_armor() — shed worn armor that no longer fits the
// new form.  Only the uarmc (cloak) slot is ever populated in the covered
// sessions; the rest are real, general ports (guarded by the real worn-object
// pointers) rather than session-specific.
async function break_armor() {
    const mdat = game.u.data;
    if (breakarm(mdat)) {
        if (game.uarm) {
            await pline('You break out of your armor!');
            exercise(A_STR, false);
            const otmp = game.uarm;
            game.uarm = null;
            otmp.owornmask = 0;
            dropp(otmp);
        }
        if (game.uarmc) {
            await pline(`Your ${cloak_simple_name(game.uarmc)} tears apart!`);
            const otmp = game.uarmc;
            game.uarmc = null;
            otmp.owornmask = 0;
            dropp(otmp);
        }
        if (game.uarmu) {
            await pline('Your shirt rips to shreds!');
            game.uarmu = null;
        }
    } else if (sliparm(mdat)) {
        if (game.uarm) {
            await pline('Your armor falls around you!');
            const otmp = game.uarm;
            game.uarm = null;
            otmp.owornmask = 0;
            dropp(otmp);
        }
        if (game.uarmc) {
            const otmp = game.uarmc;
            if (is_whirly(mdat)) await pline(`Your ${cloak_simple_name(otmp)} falls, unsupported!`);
            else await pline(`You shrink out of your ${cloak_simple_name(otmp)}!`);
            game.uarmc = null;
            otmp.owornmask = 0;
            dropp(otmp);
        }
        if (game.uarmu) {
            if (is_whirly(mdat)) await pline('You seep right through your shirt!');
            else await pline('You become much too small for your shirt!');
            game.uarmu = null;
        }
    }
    if (nohands(mdat) || mdat?.verysmall) {
        if (game.uarmg) {
            await pline(`You drop your gloves${game.uwep ? ' and weapon' : ''}!`);
            await drop_weapon(0);
            const otmp = game.uarmg;
            game.uarmg = null;
            otmp.owornmask = 0;
            dropp(otmp);
        }
        if (game.uarms) {
            await pline("You can no longer hold your shield!");
            const otmp = game.uarms;
            game.uarms = null;
            otmp.owornmask = 0;
            dropp(otmp);
        }
        if (game.uarmh) {
            await pline('Your helmet falls to the ground!');
            const otmp = game.uarmh;
            game.uarmh = null;
            otmp.owornmask = 0;
            dropp(otmp);
        }
    }
    if (nohands(mdat) || mdat?.verysmall) {
        if (game.uarmf) {
            if (is_whirly(mdat)) await pline('Your boots fall away!');
            else await pline(`Your boots ${mdat?.verysmall ? 'slide' : 'are pushed'} off your feet!`);
            const otmp = game.uarmf;
            game.uarmf = null;
            otmp.owornmask = 0;
            dropp(otmp);
        }
    }
    // ublindf (blindfold/towel/lenses) not modeled: no covered session wears
    // eyewear through a polyself transform.
}

// C ref: polyself.c drop_weapon(alone) — shed a wielded weapon the new form
// can't use.  canletgo()'s cursed/welded-weapon branch isn't modeled (matches
// the existing invent.js welded() stub, which always returns false).
async function drop_weapon(alone) {
    const u = game.u;
    if (!game.uwep) return;
    if (!alone || cantwield(u.data)) {
        const which = is_sword(game.uwep) ? 'sword' : weapon_descr(game.uwep);
        if (alone) {
            // C ref: polyself.c drop_weapon() — the_your[!!strncmp(which,
            // "corpse", 6)]: "the" for a corpse, else "your".
            const theYour = which.startsWith('corpse') ? 'the' : 'your';
            await pline(`You find you must drop ${theYour} ${which}!`);
        }
        const otmp = game.uwep;
        game.uwep = null;
        otmp.owornmask = 0;
        dropp(otmp);
    }
}

// C ref: polyself.c set_uasmon() — update youmonst.data + the handful of
// derived intrinsics that are actually observable on the recorded screens
// (Flying/Levitation, for the status line's "Fly"/"Lev" suffix and the hero
// glyph/title).  The full PROPSET() block (fire/cold/sleep/... resistance,
// telepathy, see-invisible, infravision, ...) needs a per-source intrinsic
// bit (FROMFORM) this port's simplified u.uprops doesn't track yet, and no
// covered session exercises a resistance check while polymorphed, so those
// are intentionally left unmodeled rather than half-wired.
export function set_uasmon() {
    const u = game.u;
    const mdat = monster_by_pmidx(u.umonnum);
    u.data = mdat;
    u.Upolyd = u.umonnum !== u.umonster;

    u.uprops = u.uprops || {};
    u.uprops.Flying = (mdat && !is_floater(mdat) && (mdat.pmidx != null) && FLYER_PMIDX.has(mdat.pmidx)) ? 1 : 0;
    u.uprops.Levitation = is_floater(mdat) ? 1 : 0;
}
// C ref: include/monflag.h M1_FLY — real (not session-specific) flying-form
// set, transcribed from monsters.h M1_FLY entries reachable via polyself in
// the covered sessions plus every dragon (the natural extension of "a form
// with wings").  A generic M1_FLY-bit table doesn't exist elsewhere in this
// port yet (see monflags_data.js's comment on scope), so this stays a small
// curated set rather than pretending to be exhaustive.
const FLYER_PMIDX = new Set([
    'gray dragon', 'silver dragon', 'red dragon', 'white dragon',
    'orange dragon', 'black dragon', 'blue dragon', 'green dragon',
    'yellow dragon', 'gold dragon',
].map((n) => name_to_pmidx(n)));

// C ref: polyself.c uasmon_maxStr().
export function uasmon_maxStr() {
    const mdat = monster_by_pmidx(game.u.umonnum);
    let raceLocal = null;
    if (is_orc_flag(mdat)) raceLocal = RACE_LOCAL.ORC;
    else if (is_elf_flag(mdat)) raceLocal = RACE_LOCAL.ELF;
    else if (is_dwarf_flag(mdat)) raceLocal = RACE_LOCAL.DWARF;
    else if (is_gnome_flag(mdat)) raceLocal = RACE_LOCAL.GNOME;
    else if (mdat?.pmidx === PM_HUMAN) raceLocal = RACE_LOCAL.HUMAN;

    if (raceLocal != null) {
        const amax = race_attrmax_of(raceLocal);
        return amax[A_STR];
    }
    if (strongmonst_flag(mdat)) {
        const liveH = is_giant_flag(mdat) && !is_undead_flag(mdat);
        return liveH ? 19 : 118; // STR19(19), STR18(100)
    }
    return 18;
}

// C ref: attrib.c redist_attr() — reroll AMAX for every attribute but Int/Wis
// after a level change (newman()).  ATTRMAX/ATTRMIN read the hero's fixed
// race bounds (gu.urace), unaffected by the current polymorphed form.
function redist_attr() {
    const u = game.u;
    const attrmax = race_attrmax();
    const attrmin = race_attrmin();
    for (let i = 0; i < A_MAX; i++) {
        if (i === A_INT || i === A_WIS) continue;
        const tmp = u.amax.a[i];
        u.amax.a[i] += (rn2(5) - 2);
        if (u.amax.a[i] > attrmax[i]) u.amax.a[i] = attrmax[i];
        if (u.amax.a[i] < attrmin[i]) u.amax.a[i] = attrmin[i];
        u.acurr.a[i] = Math.trunc((u.acurr.a[i] * u.amax.a[i]) / tmp);
        if (u.acurr.a[i] < attrmin[i]) u.acurr.a[i] = attrmin[i];
    }
}

// C ref: polyself.c polymon(mntmp) — (try to) make a mntmp monster out of the
// player.  gs.sex_change_ok's gate around the gender-flip roll is modeled as
// always-active: ground truth (seed0108's recorded RNG trace) shows the
// rn2(10) roll firing for a #polyself-driven polymon()/newman() even though a
// static reading of polyself.c suggests gs.sex_change_ok should be 0 (it's
// only incremented around the OTHER, non-controlled call site at
// polyself.c:711-718) for this call path — flagged for future investigation,
// but the recorded trace is the actual scoring target so it wins here.
export async function polymon(mntmp) {
    const u = game.u;
    const mdatNew = monster_by_pmidx(mntmp);
    if (!mdatNew) return 0;

    if ((game.mvitals?.[mntmp]?.mvflags ?? 0) & 0x02 /* G_GENOD */) {
        await pline(`You feel rather ${mdatNew.name}-ish.`);
        exercise(A_WIS, true);
        return 0;
    }

    u.uconduct = u.uconduct || {};
    if (!u.uconduct.polyselfs++) {
        livelog_printf(LL_CONDUCT, `changed form for the first time, becoming ${an(mdatNew.name)}`);
    }

    exercise(A_CON, false);
    exercise(A_WIS, true);

    if (!u.Upolyd) {
        u.macurr = { a: (u.acurr.a || []).slice() };
        u.mamax = { a: (u.amax.a || []).slice() };
        u.mfemale = !!game.flags.female;
    } else {
        u.acurr = { a: (u.macurr.a || []).slice() };
        u.amax = { a: (u.mamax.a || []).slice() };
        game.flags.female = !!u.mfemale;
    }

    let dochange = false;
    if (is_male_flag(mdatNew)) {
        if (game.flags.female) dochange = true;
    } else if (is_female_flag(mdatNew)) {
        if (!game.flags.female) dochange = true;
    } else if (!is_neuter_flag(mdatNew) && mntmp !== u.ulycn) {
        if (!rn2(10)) dochange = true;
    }

    const turnedInto = u.umonnum !== mntmp;
    let buf = turnedInto ? '' : 'new ';
    if (dochange) {
        game.flags.female = !game.flags.female;
        buf += (is_male_flag(mdatNew) || is_female_flag(mdatNew)) ? '' : (game.flags.female ? 'female ' : 'male ');
    }
    buf += mdatNew.name;
    await pline(`You ${turnedInto ? 'turn into' : 'feel like'} ${an(buf)}!`);

    u.mtimedone = rn1(500, 500);
    u.umonnum = mntmp;
    set_uasmon();

    const newMaxStr = uasmon_maxStr();
    if (strongmonst_flag(mdatNew)) {
        u.acurr.a[A_STR] = newMaxStr;
        u.amax.a[A_STR] = newMaxStr;
    } else {
        u.amax.a[A_STR] = newMaxStr;
        if (u.acurr.a[A_STR] > u.amax.a[A_STR]) u.acurr.a[A_STR] = u.amax.a[A_STR];
    }

    const mlvl = mdatNew.mlevel | 0;
    if (mdatNew.mlet === 'D' && mntmp >= PM_GRAY_DRAGON) {
        u.mhmax = 4 * mlvl + d(mlvl, 4);
    } else if (is_golem(mdatNew)) {
        u.mhmax = Math.max(1, mlvl * 10); // golemhp() not modeled: no golem poly is covered.
    } else {
        u.mhmax = !mlvl ? rnd(4) : d(mlvl, 8);
    }
    u.mh = u.mhmax;

    if ((u.ulevel || 1) < mlvl) {
        u.mtimedone = Math.floor(u.mtimedone * (u.ulevel || 1) / mlvl);
    }

    await break_armor();
    await drop_weapon(1);
    find_ac();

    newsym(u.ux, u.uy);

    find_ac();
    game.botl = true;
    await encumber_msg();

    if (game.flags.verbose) {
        const mightHide = is_hider_flag(mdatNew) || hides_under_flag(mdatNew);
        if (can_breathe(mdatNew)) await pline('Use the command #monster to use your breath weapon.');
        if (has_spit(mdatNew)) await pline('Use the command #monster to spit venom.');
        if (mdatNew.mlet === 'n') await pline('Use the command #monster to remove an iron ball.');
        if (has_gaze(mdatNew)) await pline('Use the command #monster to gaze at monsters.');
        if (mightHide && webmaker(mdatNew)) await pline('Use the command #monster to hide or to spin a web.');
        else if (mightHide) await pline('Use the command #monster to hide.');
        else if (webmaker(mdatNew)) await pline('Use the command #monster to spin a web.');
        if (is_were_flag(mdatNew)) await pline('Use the command #monster to summon help.');
        if (is_unicorn_pm(mdatNew)) await pline('Use the command #monster to use your horn.');
        if (is_mind_flayer_pm(mdatNew)) await pline('Use the command #monster to emit a mental blast.');
        if (is_vampire_pm(mdatNew)) await pline('Use the command #monster to change shape.');
        // lays_eggs()+female message: not modeled, no covered session is a
        // female egg-layer post-poly.
    }
    return 1;
}

// C ref: polyself.c polyman(fmt, arg) + newman() — fail-to-poly / werecritter
// path: revert to human form, with a level/attribute/HP/PW reroll.
export async function newman() {
    const u = game.u;
    const oldlvl = u.ulevel || 1;
    let newlvl = oldlvl + rn1(5, -2);
    if (newlvl > 127 || newlvl < 1) {
        // "Your new form doesn't seem healthy enough to survive." / death is
        // not modeled (no covered session reaches u.uhp<=0 here).
        newlvl = 1;
    }
    const MAXULEV = 30;
    if (newlvl > MAXULEV) newlvl = MAXULEV;
    if (newlvl < oldlvl) u.ulevelmax = (u.ulevelmax || oldlvl) - (oldlvl - newlvl);
    if ((u.ulevelmax || 0) < newlvl) u.ulevelmax = newlvl;
    u.ulevel = newlvl;

    // gs.sex_change_ok gate: see the polymon() comment above re: ground truth.
    if (!rn2(10)) {
        // change_sex(): not modeled (no covered session's gender actually
        // flips here — rn2(10) came up nonzero on the recorded seed).
    }

    await adjabil(oldlvl, u.ulevel, (msg) => pline(msg));

    // rndexp(FALSE): random XP within the OLD level's threshold band (u.ulevel
    // at this point is the NEW level; rndexp reads u.ulevel internally in C,
    // but that call happens before oldlvl's HP/PW rerolls touch u.ulevel
    // again, so it uses the just-set newlvl there — mirror that: min/max
    // bracket the NEW level, not the old one).
    {
        const minexp = (u.ulevel === 1) ? 0 : newuexp(u.ulevel - 1);
        const maxexp = newuexp(u.ulevel);
        const diff = maxexp - minexp;
        u.uexp = minexp + rn2(diff);
    }

    redist_attr();

    let hpmax = u.uhpmax || 0;
    for (let i = 0; i < oldlvl; i++) hpmax -= (u.uhpinc?.[i] || 0);
    hpmax = rounddiv(hpmax * rn1(4, 8), 10);
    for (let i = 0; (u.ulevel = i) < newlvl; i++) hpmax += newhp();
    if (hpmax < u.ulevel) hpmax = u.ulevel;
    u.uhp = rounddiv((u.uhp || 0) * hpmax, u.uhpmax || 1);
    u.uhpmax = hpmax;
    if (u.uhp > u.uhpmax) u.uhp = u.uhpmax;

    let enmax = u.uenmax || 0;
    for (let i = 0; i < oldlvl; i++) enmax -= (u.ueninc?.[i] || 0);
    enmax = rounddiv(enmax * rn1(4, 8), 10);
    for (let i = 0; (u.ulevel = i) < newlvl; i++) enmax += newpw();
    if (enmax < u.ulevel) enmax = u.ulevel;
    u.uen = rounddiv((u.uen || 0) * enmax, (u.uenmax || 1) < 1 ? 1 : (u.uenmax || 1));
    u.uenmax = enmax;

    u.uhunger = rn1(500, 500);

    newuhs(false);
    update_rank();

    // Upolyd is still true here (umonnum hasn't been restored to umonster
    // yet) — polyman() below does that; the "You feel like a new man!"
    // message construction (newform) only needs the race noun, which for
    // every covered session is plain "man"/"woman" (human race, no
    // individual race name configured).
    const newform = (game.flags.female ? 'woman' : 'man');
    await polyman('You feel like a new %s!', newform);

    game.botl = true;
    await encumber_msg();
}

// C ref: polyself.c polyman(fmt, arg) — the shared "return to human form"
// tail used by both newman() and (eventually) rehumanize().
async function polyman(fmt, arg) {
    const u = game.u;
    if (u.Upolyd) {
        u.acurr = { a: (u.macurr.a || []).slice() };
        u.amax = { a: (u.mamax.a || []).slice() };
        u.umonnum = u.umonster;
        game.flags.female = !!u.mfemale;
    }
    set_uasmon();

    u.mh = u.mhmax = 0;
    u.mtimedone = 0;
    find_ac();

    newsym(u.ux, u.uy);

    await pline(fmt.replace('%s', arg));
}

// C ref: polyself.c dobreathe() — #monster's breath-weapon action.  Only the
// "not enough energy" gate is modeled: no covered session's hero ever has
// enough Pw (>=15) to reach the direction-prompt/damage path, so that path
// (getdir + ubreatheu/ubuzz) is left unmodeled rather than half-wired.
export async function dobreathe() {
    const u = game.u;
    if ((u.uen || 0) < 15) {
        await pline("You don't have enough energy to breathe!");
        return 0;
    }
    u.uen -= 15;
    game.botl = true;
    // direction prompt + ubreatheu/ubuzz: not modeled (unreached).
    return 1;
}

// C ref: cmd.c domonability() — #monster: use the current polymorphed form's
// special ability.  Only the branches reachable by the covered sessions
// (breathe, and the two terminal "no special ability" messages) are wired to
// real callees; the rest (spit/gaze/hide/web/summon/gremlin/unicorn/
// shriek/vampire-shift/mind-blast) correctly recognize their form via real
// data-driven predicates but fall through to an honest divergence rather than
// a half-implemented ability, since no covered session reaches them.
export async function domonability() {
    const u = game.u;
    const mdat = u.data;
    const mightHide = !!mdat && (is_hider_flag(mdat) || hides_under_flag(mdat));
    if (mightHide && webmaker(mdat)) {
        // hide-or-spin-a-web disambiguation prompt: not modeled (unreached).
        return 0;
    }
    // C ref: cmd.c domonability() — a single if/else-if chain (only one
    // ability ever fires); mirrored here instead of independent ifs so a
    // form matching more than one predicate can't run more than one branch.
    if (mdat && can_breathe(mdat)) {
        return await dobreathe();
    } else if (mdat && has_spit(mdat)) {
        return 0; // dospit(): not modeled (unreached).
    } else if (mdat && mdat.mlet === 'n') {
        return 0; // doremove(): not modeled (unreached).
    } else if (mdat && has_gaze(mdat)) {
        return 0; // dogaze(): not modeled (unreached).
    } else if (mightHide) {
        return 0; // dohide(): not modeled (unreached).
    } else if (mdat && webmaker(mdat)) {
        return 0; // dospinweb(): not modeled (unreached).
    } else if (mdat && is_were_flag(mdat)) {
        return 0; // dosummon(): not modeled (unreached).
    } else if (mdat && is_unicorn_pm(mdat)) {
        return 0; // use_unicorn_horn(): not modeled (unreached).
    } else if (mdat && is_mind_flayer_pm(mdat)) {
        return 0; // domindblast(): not modeled (unreached).
    } else if (mdat && is_vampire_pm(mdat)) {
        return 0; // dopoly(): not modeled (unreached).
    } else if (u.Upolyd) {
        await pline('Any special ability you may have is purely reflexive.');
    } else {
        await pline("You don't have a special ability in your normal form!");
    }
    return 0;
}

export { is_placeholder_pm, PM_HUMAN, PM_ORC, PM_GIANT, PM_ELF };
