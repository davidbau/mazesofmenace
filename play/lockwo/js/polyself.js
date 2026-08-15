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
import { encumber_msg, freeinv, xname, makeplural, near_capacity } from './invent.js';
import { base_mmove } from './mon.js';
import { P_NAME, weapon_type } from './enhance.js';
import { objects as OBJECTS } from './mkobj.js';
import { place_object, WEAPON_CLASS, TOOL_CLASS, ARMOR_CLASS, FOOD_CLASS,
    POTION_CLASS, SCROLL_CLASS, SPBOOK_CLASS, WAND_CLASS, COIN_CLASS,
    GEM_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS, VENOM_CLASS,
    RING_CLASS, AMULET_CLASS, ILLOBJ_CLASS } from './mkobj.js';
import { makesingular } from './objnam.js';
import { newuexp, newhp, newpw, adjabil, update_rank } from './exper.js';
import { newuhs } from './eat.js';
import { monster_by_pmidx, name_to_pmidx, golemhp_js as golemhp,
    is_home_elemental } from './makemon.js';
import { livelog_printf, LL_CONDUCT } from './livelog.js';
import { A_STR, A_INT, A_WIS, A_CON, A_DEX, A_MAX, TT_PIT, TT_BURIEDBALL,
    IS_FOUNTAIN, IS_POOL, IS_LAVA, IS_AIR, In_endgame } from './const.js';
import {
    is_hider_flag, hides_under_flag, is_were_flag, likes_gems_flag,
    strongmonst_flag, is_male_flag, is_flyer_flag, mflags1_of, M1_CLING,
    lays_eggs_flag, mindless, msound_of, is_swimmer_flag,
    is_female_flag, is_neuter_flag, is_orc_flag, is_elf_flag, is_dwarf_flag,
    is_gnome_flag, is_giant_flag, is_undead_flag, nohands, humanoid,
} from './monflags_data.js';
import { attacktype, mattk_of, AT_BREA, AT_SPIT, AT_GAZE,
    AD_MAGM, AD_CONF, AD_FIRE } from './monattk_data.js';
import { monsterList, DEADMONSTER } from './mon.js';
import { races } from './role.js';
import { Blind } from './vision.js';
import { surface } from './dungeon.js';

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
const PM_FLOATING_EYE = name_to_pmidx('floating eye');
const PM_GREMLIN = name_to_pmidx('gremlin');
const PM_GIANT_EEL = name_to_pmidx('giant eel');
const PM_ELECTRIC_EEL = name_to_pmidx('electric eel');
// C ref: monflag.h MS_SHRIEK (the MS_* enum is not carried symbolically by
// monflags_data.js, which only exports the handful peace_minded() needs).
const MS_SHRIEK = 18;
// role-local race enum used by u_init.js's RACE_ATTRMAX/RACE_ATTRMIN tables
// (0..4 == human/elf/dwarf/gnome/orc), NOT a mons[] pmidx.
const RACE_LOCAL = { HUMAN: 0, ELF: 1, DWARF: 2, GNOME: 3, ORC: 4 };

// C ref: include/monflag.h MZ_* body-size enum.
const MZ_SMALL = 1, MZ_LARGE = 3;

// C ref: mondata.h:122 `#define can_breathe(ptr) attacktype(ptr, AT_BREA)`;
// polyself.c:1039/1043 use attacktype(uptr, AT_SPIT) / (uptr, AT_GAZE)
// directly.  These were name-keyed Sets, which answered FALSE for every
// species not listed: the AT_BREA set was missing 5 of 19 (red naga, Nazgul,
// iron golem, Chromatic Dragon, Ixoth), AT_SPIT 3 of 4 (black/guardian naga,
// Juiblex), and the AT_GAZE set named floating eye, which has no AT_GAZE at
// all (its mattk is a passive AT_NONE/AD_PLYS) while missing all 5 real
// gazers.  monattk_data.js is the generated mattk[] from the recorder's
// monsters.h, so go through attacktype() instead.
export function can_breathe(mdat) { return attacktype(mdat, AT_BREA); }
function has_spit(mdat) { return attacktype(mdat, AT_SPIT); }
function has_gaze(mdat) { return attacktype(mdat, AT_GAZE); }
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
// C ref: mondata.h is_clinger(ptr) — M1_CLING.
function is_clinger(mdat) { return !!mdat && (mflags1_of(mdat) & M1_CLING) !== 0; }
// C ref: mondata.h eggs_in_water(ptr).
function eggs_in_water(mdat) {
    return lays_eggs_flag(mdat) && mdat?.mlet === ';' && is_swimmer_flag(mdat);
}
// C ref: trap.c set_utrap(tim, typ).  Duplicated from trap.js (which does not
// export it) rather than importing, to keep polyself.js off trap.js's cycle.
function set_utrap(tim, typ) {
    const u = game.u;
    if (!u) return;
    u.utrap = tim;
    u.utraptype = tim ? typ : 0 /* TT_NONE */;
}
// C ref: mondata.h telepathic(ptr) — the three telepathy-granting forms.
function telepathic(mdat) {
    return !!mdat && (mdat.pmidx === PM_FLOATING_EYE
        || mdat.pmidx === PM_MIND_FLAYER || mdat.pmidx === PM_MASTER_MIND_FLAYER);
}
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
// C ref: weapon.c weapon_descr(obj) — shortened "you must drop your X" name.
// This used to answer a flat "weapon" for every WEAPON_CLASS/weptool item; C
// answers the SKILL name ("long sword", "dagger", "quarterstaff", ...), which
// is what the message actually prints for any hero who polymorphs into a
// nohands/verysmall form while wielding a weapon.
//
// Still unported (all inside the P_NONE arm): the CORPSE/TIN/EGG/STATUE/
// BOULDER/TOWEL/TIN_OPENER overrides that use OBJ_NAME instead of the class
// name, and the P_SLING/P_BOW/P_CROSSBOW/P_FLAIL/P_PICK_AXE ammo+special
// renames ("stone"/"gem"/"arrow"/"bolt"/"hook"/"mattock").
function weapon_descr(obj) {
    const skill = weapon_type(obj);
    if (skill === P_NONE) {
        if (obj.globby) return 'glob';
        return makesingular(OC_CLASS_NAME[obj.oclass] || 'thing');
    }
    // P_NAME's rolemnum arg only matters for P_BARE_HANDED_COMBAT, which
    // weapon_type() returns only for a NULL obj — unreachable from here.
    return makesingular(P_NAME(skill, null));
}
// C ref: obj.h is_sword(otmp) — a WEAPON_CLASS item whose oc_skill lies in
// P_SHORT_SWORD(5)..P_SABER(9).  (Note the C macro's low bound is
// P_SHORT_SWORD, NOT P_DAGGER as the older comment block above it suggests.)
const P_NONE = 0, P_SHORT_SWORD = 5, P_SABER = 9;
function is_sword(obj) {
    if (!obj || obj.oclass !== WEAPON_CLASS) return false;
    const sk = OBJECTS[obj.otyp]?.oc_skill ?? P_NONE;
    return sk >= P_SHORT_SWORD && sk <= P_SABER;
}

// C ref: polyself.c dropp(obj) — the dropx() jacket used by break_armor()/
// drop_weapon() to put a worn/wielded item the new form can't keep onto the
// floor under the hero.  C chains dropp -> dropx -> dropy -> dropz, and
// do.c dropz() ends with encumber_msg(): shedding armor mid-polymorph is
// exactly when the new form's much smaller weight_cap() first gets compared
// against the load, so the "Your movements are slowed slightly because of
// your load." line belongs HERE (inside break_armor, before polymon's own
// find_ac()) rather than at polymon's trailing encumber_msg().  That ordering
// is observable: the status line bot() last wrote is the one from the
// "You shrink out of your cloak!" pline, i.e. with the cloak's AC still
// counted, and the encumbrance message's own --More-- freezes it there.
async function dropp(obj) {
    if (!obj) return;
    const u = game.u;
    freeinv(obj);
    place_object(obj, u.ux, u.uy);
    newsym(u.ux, u.uy);
    await encumber_msg();
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
        await dropp(otmp);
        }
        if (game.uarmc) {
            await pline(`Your ${cloak_simple_name(game.uarmc)} tears apart!`);
            const otmp = game.uarmc;
            game.uarmc = null;
            otmp.owornmask = 0;
        await dropp(otmp);
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
        await dropp(otmp);
        }
        if (game.uarmc) {
            const otmp = game.uarmc;
            if (is_whirly(mdat)) await pline(`Your ${cloak_simple_name(otmp)} falls, unsupported!`);
            else await pline(`You shrink out of your ${cloak_simple_name(otmp)}!`);
            game.uarmc = null;
            otmp.owornmask = 0;
        await dropp(otmp);
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
        await dropp(otmp);
        }
        if (game.uarms) {
            await pline("You can no longer hold your shield!");
            const otmp = game.uarms;
            game.uarms = null;
            otmp.owornmask = 0;
        await dropp(otmp);
        }
        if (game.uarmh) {
            await pline('Your helmet falls to the ground!');
            const otmp = game.uarmh;
            game.uarmh = null;
            otmp.owornmask = 0;
        await dropp(otmp);
        }
    }
    if (nohands(mdat) || mdat?.verysmall) {
        if (game.uarmf) {
            if (is_whirly(mdat)) await pline('Your boots fall away!');
            else await pline(`Your boots ${mdat?.verysmall ? 'slide' : 'are pushed'} off your feet!`);
            const otmp = game.uarmf;
            game.uarmf = null;
            otmp.owornmask = 0;
        await dropp(otmp);
        }
    }
    // C ref: polyself.c:1291-1300 — the ublindf arm.  The gate is
    // !has_head(uptr) (NOT eyelessness): "Your blindfold/towel/lenses
    // fall(s) off!" + Blindf_off(NULL) + dropp().  DEFERRED: this port has no
    // ublindf slot at all, so there is nothing to shed.  (Rings stay worn even
    // with no hands, which is why there is no uleft/uright arm.)
}

// C ref: polyself.c drop_weapon(alone) — shed a wielded weapon the new form
// can't use.  canletgo()'s cursed/welded-weapon branch isn't modeled (matches
// the existing invent.js welded() stub, which always returns false), so C's
// what[] is always "drop" and never "release".  Two-weaponing (u.twoweap /
// uswapwep) is not modeled anywhere in this port.
async function drop_weapon(alone) {
    const u = game.u;
    if (!game.uwep) return;
    if (!alone || cantwield(u.data)) {
        let which = is_sword(game.uwep) ? 'sword' : weapon_descr(game.uwep);
        if (alone) {
            // C ref: polyself.c:1327 — a stacked wielded weapon pluralizes:
            // "You find you must drop your daggers!".
            if ((game.uwep.quan || 1) !== 1) which = makeplural(which);
            // C ref: the_your[!!strncmp(which, "corpse", 6)]: "the" for a
            // corpse, else "your".
            const theYour = which.startsWith('corpse') ? 'the' : 'your';
            await pline(`You find you must drop ${theYour} ${which}!`);
        }
        const otmp = game.uwep;
        game.uwep = null;
        otmp.owornmask = 0;
        await dropp(otmp);
    }
}

// C ref: polyself.c set_uasmon() — update youmonst.data + the form-derived
// intrinsics.  Only FLYING and LEVITATION are wired.
//
// DEFERRED, and this is a real gap, not a cosmetic one: C's PROPSET() sets or
// CLEARS a FROMFORM bit on ~25 properties, and several of them steer RNG.
// BLINDED(!haseyes) alone gates every canseemon/couldsee predicate in the
// game; SEE_INVIS, TELEPAT, INFRAVISION, PASSES_WALLS, SWIMMING and the eight
// resistances all feed damage and to-hit branches.  Porting them needs a
// per-source intrinsic bit (FROMFORM) that this port's u.uprops (a flat 0/1
// per property) cannot express — setting them here would clobber the same
// property's other sources (a cream-pie BLINDED, an intrinsic TELEPAT) on the
// next set_uasmon() call.  That representation change is the prerequisite.
//
// Also deferred from this function: vampshifter cham tracking, float_vs_flight()
// (BFlying|I_SPECIAL, and its disp.botl), steed_vs_stealth() and polysense().
export function set_uasmon() {
    const u = game.u;
    const mdat = monster_by_pmidx(u.umonnum);
    // C ref: mondata.c:13 set_mon_data() — leftover movement points are prorated
    // when the new form is SLOWER.  Human->gnome takes u.umovement 12 -> 6, which
    // changes how many turns every later hero command costs.
    // (u.data is unset before the first polymorph in this port; every
    // player-monster form has mmove == NORMAL_SPEED, hence the 12 default.)
    if (u.umovement) {
        const old_speed = u.data ? base_mmove({ data: u.data }) : 12;
        const new_speed = base_mmove({ data: mdat });
        if (new_speed < old_speed && old_speed > 0)
            u.umovement = Math.trunc((u.umovement * new_speed) / old_speed);
    }
    u.data = mdat;
    u.Upolyd = u.umonnum !== u.umonster;

    u.uprops = u.uprops || {};
    // C ref: polyself.c:99-100 PROPSET(FLYING, (is_flyer(mdat) && !is_floater(mdat))).
    // is_flyer() is the M1_FLY bit; this used to be a hand-curated pmidx set of
    // the ten dragons, which answered FALSE for every other winged form (bat,
    // raven, stalker, air elemental, every 'A'/'B'/'y'...).  u.uprops.Flying
    // gates trap.c immune_to_trap()/pooleffects(), timeout.c's u.umoved
    // branch and invent.c's wounded-legs term, so a wrong answer here is not
    // cosmetic: a poly'd flyer falls into pits it should soar over.
    u.uprops.Flying = (is_flyer_flag(mdat) && !is_floater(mdat)) ? 1 : 0;
    u.uprops.Levitation = is_floater(mdat) ? 1 : 0;
    // C ref: polyself.c:153 — set_uasmon() ends with disp.botl = TRUE, so the
    // status is ALREADY dirty by the time polymon's break_armor() -> dropp() ->
    // encumber_msg() runs, and the FIRST pline after the form change publishes
    // the new HD/HP *and* the new (much smaller) weight_cap's "Burdened".
    game.botl = true;
}

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

// C ref: role.c races[].individual / .noun as consumed by polyself.c newman().
// role.js's races[] carries noun/adj but not the RoleName `individual`, which
// in C is {"man","woman"} for human and {0,0} for every other player race.
function urace_newform(female) {
    const idx = Number.isInteger(game.initrace)
        ? game.initrace
        : races.findIndex((r) => r.name?.toLowerCase() === String(game.initrace || '').toLowerCase());
    const race = races[idx >= 0 ? idx : 0] || races[0];
    if (race?.name === 'human') return female ? 'woman' : 'man';
    return race?.noun || 'human';
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
        // C ref: polyself.c:858 In_endgame ? 8*mlvl : 4*mlvl + d(mlvl,4).
        u.mhmax = In_endgame(u.uz) ? (8 * mlvl) : (4 * mlvl + d(mlvl, 4));
    } else if (is_golem(mdatNew)) {
        // C ref: golems.c golemhp(type) — a fixed per-species table, NOT
        // mlvl*10 (straw/paper are 20 at mlevel 3/3, clay is 70 at 11...).
        u.mhmax = golemhp(mntmp);
    } else {
        u.mhmax = !mlvl ? rnd(4) : d(mlvl, 8);
        // C ref: polyself.c:869 — an elemental on its own home plane is 3x.
        if (is_home_elemental(mdatNew)) u.mhmax *= 3;
    }
    u.mh = u.mhmax;

    if ((u.ulevel || 1) < mlvl) {
        u.mtimedone = Math.floor(u.mtimedone * (u.ulevel || 1) / mlvl);
    }

    // C ref: polyself.c polymon() — the new form's u.mh/u.mhmax leave disp.botl
    // dirty, so the NEXT pline()'s flush_screen(1) runs bot(), and bot()
    // recomputes BL_CAP from a live near_capacity().  That pline is
    // break_armor()'s "You shrink out of your <cloak>!", which is why seed0108
    // step 78 shows "Burdened" on its --More-- while AC is still the
    // pre-find_ac() value.  This port's status row is live except for the
    // capacity field, which encumber_msg() publishes, so publish it here.
    game._curcap = near_capacity();
    await break_armor();
    await drop_weapon(1);
    find_ac();

    // C ref: polyself.c:891-893 — DRAWS rn1(6,2).  Changing form while in a
    // pit resets the escape countdown.  (hideunder() for a was_hiding_under
    // hero, which C runs just above this, is still unported.)
    if (u.utrap && u.utraptype === TT_PIT) set_utrap(rn1(6, 2), TT_PIT);

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
        if (u.umonnum === PM_GREMLIN) await pline('Use the command #monster to multiply in a fountain.');
        if (is_unicorn_pm(mdatNew)) await pline('Use the command #monster to use your horn.');
        if (is_mind_flayer_pm(mdatNew)) await pline('Use the command #monster to emit a mental blast.');
        if (msound_of(mdatNew) === MS_SHRIEK) await pline('Use the command #monster to shriek.');
        if (is_vampire_pm(mdatNew)) await pline('Use the command #monster to change shape.');
        // C ref: polyself.c:1069-1073 — the giant/electric eel exclusion is on
        // the FORM, and eggs_in_water() picks the verb.
        if (lays_eggs_flag(mdatNew) && game.flags.female
            && !(mdatNew.pmidx === PM_GIANT_EEL || mdatNew.pmidx === PM_ELECTRIC_EEL)) {
            await pline(`Use the command #sit to ${eggs_in_water(mdatNew) ? 'spawn in the water' : 'lay an egg'}.`);
        }
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
        // C ref: polyself.c:344 `goto dead` — urgent_pline("Your new form
        // doesn't seem healthy enough to survive.") + done(DIED).  NOT a
        // clamp: C SKIPS the whole rest of newman() (adjabil, rndexp,
        // redist_attr, per-level newhp()/newpw(), rn1(500,500)), so every RNG
        // draw below is wrong on this arm as well as the outcome.
        //
        // DEFERRED, and it is REACHABLE: rn1(5,-2) is {-2..+2}, so any hero at
        // experience level 1 or 2 hits it.  Porting it needs done(DIED) from
        // end.js, which this module cannot call without dragging the whole
        // death/bones path in; the same gap blocks the u.uhp<=0 arm below.
        newlvl = 1;
    }
    const MAXULEV = 30;
    if (newlvl > MAXULEV) newlvl = MAXULEV;
    if (newlvl < oldlvl) u.ulevelmax = (u.ulevelmax || oldlvl) - (oldlvl - newlvl);
    if ((u.ulevelmax || 0) < newlvl) u.ulevelmax = newlvl;
    u.ulevel = newlvl;

    // gs.sex_change_ok gate: see the polymon() comment above re: ground truth.
    if (!rn2(10)) {
        // C ref: polyself.c change_sex() — flips flags.female (and u.mfemale
        // while Upolyd), reloads svp.pl_character from urole.name.f/.m and
        // re-runs max_rank_sz().  DEFERRED: the visible half is the status
        // line's rank string, which this port builds from game.flags.female
        // in exper.js update_rank(); flipping it here without the matching
        // pl_character reload would desync the two.  RNG-free either way.
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

    // C ref: polyself.c:446-450 — newform = races[].individual.f/.m, else
    // races[].noun.  Only human has an individual noun ("man"/"woman"); an
    // elf/dwarf/gnome/orc hero gets "You feel like a new elf!" etc.  The
    // gender read is the SAVED one (u.mfemale while Upolyd), not the current
    // form's, because polyman() below is about to restore it.
    const newform = urace_newform(u.Upolyd ? !!u.mfemale : !!game.flags.female);
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

    // C ref: polyself.c:254-256 — DRAWS rn1(6,2).  Reverting to human while in
    // a pit resets the escape countdown, exactly as polymon() does.
    if (u.utrap && u.utraptype === TT_PIT) set_utrap(rn1(6, 2), TT_PIT);

    newsym(u.ux, u.uy);

    await pline(fmt.replace('%s', arg));
}

// C ref: include/hack.h ECMD_OK(0)/ECMD_TIME(1)/ECMD_CANCEL(2).
const ECMD_OK = 0, ECMD_TIME = 1, ECMD_CANCEL = 2;

// C ref: cmd.c getdir(), reached via zap.c's zap_getdir() idiom (dynamic import
// keeps polyself.js off cmd.js's static import cycle).  Sets u.dx/u.dy/u.dz the
// way C's getdir() does and reports cancel as C's `!getdir()`.
//
// This matters far beyond the direction itself: getdir() CONSUMES A KEYSTROKE.
// A #monster ability that skips its prompt leaves the answering key in the
// input stream, where the command parser executes it as a command.
async function u_getdir() {
    const { getdir } = await import('./cmd.js');
    const dir = await getdir();
    const u = game.u;
    if (!dir) { u.dx = 0; u.dy = 0; u.dz = 0; return false; }
    u.dx = dir.dx | 0; u.dy = dir.dy | 0; u.dz = dir.dz | 0;
    return true;
}

// C ref: polyself.c dobreathe() — #monster's breath-weapon action.
export async function dobreathe() {
    const u = game.u;
    if (u.Strangled) {
        await pline("You can't breathe.  Sorry.");
        return ECMD_OK;
    }
    if ((u.uen || 0) < 15) {
        await pline("You don't have enough energy to breathe!");
        return ECMD_OK;
    }
    u.uen -= 15;
    game.botl = true;

    if (!(await u_getdir()))
        return ECMD_CANCEL;

    // C ref: attacktype_fordmg(youmonst.data, AT_BREA, AD_ANY) — the FIRST
    // AT_BREA slot; C's macro walks mattk[] in order and returns that slot.
    const mattk = mattk_of(u.data).find((a) => a.aatyp === AT_BREA);
    if (!mattk) {
        /* C: impossible("bad breath attack?") */
    } else if (!u.dx && !u.dy && !u.dz) {
        // ubreatheu(mattk): breathing at yourself.  Deferred — it needs the
        // per-adtyp self-damage dispatch (zap.c:3017) this port has no caller
        // for yet.  C consumes no RNG before entering it, so the desync starts
        // inside, not here.
    } else {
        // C ref: hack.h BZ_U_BREATH(BZ_OFS_AD(adtyp)) == 20 + |adtyp-AD_MAGM|%10.
        await (await import('./zap.js')).ubuzz(
            20 + (Math.abs(mattk.adtyp - AD_MAGM) % 10), mattk.damn);
    }
    return ECMD_TIME;
}

// C ref: polyself.c dospit() — #monster for a venom spitter.  The getdir() is
// the load-bearing half (it eats the direction key); the venom object itself
// needs throwit(), which this port does not have, so the projectile is
// deferred rather than faked.
async function dospit() {
    if (!(await u_getdir()))
        return ECMD_CANCEL;
    // mksobj(BLINDING_VENOM|ACID_VENOM, TRUE, FALSE) + throwit(): deferred.
    return ECMD_TIME;
}

// C ref: polyself.c doremove() — #monster for a nymph: shed the ball & chain.
async function doremove() {
    const u = game.u;
    if (!u.uball) { /* C: !Punished */
        if (u.utrap && u.utraptype === TT_BURIEDBALL) {
            await pline(`The ball and chain are buried firmly in the ${surface(u.ux, u.uy)}.`);
            return ECMD_OK;
        }
        await pline('You are not chained to anything!');
        return ECMD_OK;
    }
    // unpunish(): invent.js's stub is a no-op and is not exported; a Punished
    // hero never reaches here in any covered session.  Deferred.
    return ECMD_TIME;
}

// C ref: polyself.c dogaze() — #monster for a gazer.  The three refusal gates
// and the energy cost are ported; the per-monster gaze loop is deferred (it
// needs destroy_items/ignite_items for AD_FIRE and a y_n confirm per peaceful
// target).  C draws no RNG before the loop, so the gates are exact.
async function dogaze() {
    const u = game.u;
    const adtyp = (mattk_of(u.data).find((a) => a.aatyp === AT_GAZE) || {}).adtyp ?? 0;
    if (adtyp !== AD_CONF && adtyp !== AD_FIRE)
        return ECMD_OK; // C: impossible("gaze attack %d?")
    if (Blind()) {
        await pline("You can't see anything to gaze at.");
        return ECMD_OK;
    } else if (u.uhallu) {
        await pline("You can't gaze at anything you can see.");
        return ECMD_OK;
    }
    if ((u.uen || 0) < 15) {
        await pline('You lack the energy to use your special gaze!');
        return ECMD_OK;
    }
    u.uen -= 15;
    game.botl = true;
    // per-monster gaze loop + "You gaze at no place in particular.": deferred.
    return ECMD_TIME;
}

// C ref: polyself.c dosummon() — #monster for a lycanthrope.
async function dosummon() {
    const u = game.u;
    if ((u.uen || 0) < 10) {
        await pline('You lack the energy to send forth a call for help!');
        return ECMD_OK;
    }
    u.uen -= 10;
    game.botl = true;
    await pline('You call upon your brethren for help!');
    exercise(A_WIS, true);
    // were_summon(): DRAWS rnd(5) + per-helper rn2()s + makemon() + tamedog().
    // Deferred because tamedog() does not exist in this port and were_summon's
    // `yours` arm calls it for every helper; a summon without it would leave
    // hostile lycanthropes and still desync.  Bug, not a no-op.
    return ECMD_TIME;
}

// C ref: polyself.c dohide() — #monster for a hider.  The refusal gates and the
// u.uundetected/newsym state changes are ported; the hides_under 'trice-corpse
// instapetrify branch is deferred (invent.js's instapetrify is a no-op stub).
async function dohide() {
    const u = game.u;
    const mdat = u.data;
    const ismimic = mdat?.mlet === 'm';
    const on_ceiling = is_clinger(mdat) || !!u.uprops?.Flying;

    if (u.ustuck || (u.utrap && (u.utraptype !== TT_PIT || on_ceiling))) {
        await pline(`You can't hide while you're ${!u.ustuck ? 'trapped' : 'being held'}.`);
        if (u.uundetected || (ismimic && u.m_ap_type)) {
            u.uundetected = 0;
            u.m_ap_type = 0;
            newsym(u.ux, u.uy);
        }
        return ECMD_OK;
    }
    if (mdat?.mlet === ';' && !is_pool(u.ux, u.uy)) {
        if (IS_FOUNTAIN(game.level?.at?.(u.ux, u.uy)?.typ))
            await pline('The fountain is not deep enough to hide in.');
        else
            await pline('There is no water to hide in here.');
        u.uundetected = 0;
        return ECMD_OK;
    }
    if (hides_under_flag(mdat)) {
        const otop = obj_at_hero();
        if (!otop) {
            await pline('There is nothing to hide under here.');
            u.uundetected = 0;
            return ECMD_OK;
        }
        // all-cockatrice-corpse pile -> instapetrify(): deferred.
    }
    if (u.uundetected || (ismimic && u.m_ap_type)) {
        await youhiding(1); /* "You are already hiding ..." */
        return ECMD_OK;
    }
    if (ismimic) {
        u.m_ap_type = 2 /* M_AP_OBJECT */;
        u.mappearance = 0 /* STRANGE_OBJECT */;
    } else {
        u.uundetected = 1;
    }
    newsym(u.ux, u.uy);
    await youhiding(0); /* "You are now hiding ..." */
    return ECMD_TIME;
}

// C ref: sounds.c youhiding(via_enlghtmt=FALSE, msgflag) — the '#monster'
// phrasing only.  The mimic ("mimicking a <object>") and eel ("in the water")
// suffixes are deferred with their branches above.
async function youhiding(msgflag) {
    const u = game.u;
    const mdat = u.data;
    let buf = 'hiding';
    if (u.uundetected) {
        if (hides_under_flag(mdat)) {
            // C: ansimpleoname(o) — article + simple object name.
            const o = obj_at_hero();
            if (o) buf += ` underneath ${an(xname(o))}`;
        } else if (is_clinger(mdat) || u.uprops?.Flying) {
            buf += ' on the ceiling';
        } else if (u.utrap && u.utraptype === TT_PIT) {
            buf += ' in a pit';
        } else {
            buf += ` on the ${surface(u.ux, u.uy)}`;
        }
    }
    await pline(`You are ${msgflag ? 'already' : 'now'} ${buf}.`);
}

// C ref: polyself.c domindblast() — #monster for a mind flayer.  The loop
// DRAWS: rn2(2) for a telepath, rn2(10) for everyone else, then rnd(15) for
// each monster it locks onto — so skipping it desynchronizes the stream even
// though the blast itself is "just" damage.
async function domindblast() {
    const u = game.u;
    if ((u.uen || 0) < 10) {
        await pline('You concentrate but lack the energy to maintain doing so.');
        return ECMD_OK;
    }
    u.uen -= 10;
    game.botl = true;

    await pline('You concentrate.');
    await pline('A wave of psychic energy pours out.');
    const { wakeupAttack, killed, mon_nam } = await import('./uhitm.js');
    const BOLT_LIM = 8;
    // C ref: `for (mtmp = fmon; mtmp; mtmp = nmon)` — newest-first, and the
    // next link is cached before the body can kill mtmp.
    for (const mtmp of fmonOrder()) {
        if (DEADMONSTER(mtmp)) continue;
        if (mdistu(mtmp) > BOLT_LIM * BOLT_LIM) continue;
        if (mtmp.mpeaceful) continue;
        if (mindless(mtmp.data)) continue;
        const u_sen = telepathic(mtmp.data) && !mtmp.mcansee;
        if (u_sen || (telepathic(mtmp.data) && rn2(2)) || !rn2(10)) {
            const dmg = rnd(15);
            // C: wake it first, but don't anger a peaceful it won't survive.
            await wakeupAttack(mtmp, dmg > mtmp.mhp);
            await pline(`You lock in on ${s_suffix(mon_nam(mtmp))} ${
                u_sen ? 'telepathy'
                : telepathic(mtmp.data) ? 'latent telepathy' : 'mind'}.`);
            mtmp.mhp -= dmg;
            if (DEADMONSTER(mtmp)) await killed(mtmp);
        }
    }
    return ECMD_TIME;
}

// C ref: the `fmon` chain — makemon prepends, so C visits newest-first.
function fmonOrder() {
    const list = monsterList();
    const out = new Array(list.length);
    for (let i = 0; i < list.length; i++) out[i] = list[list.length - 1 - i];
    return out;
}
// C ref: hack.h mdistu(mon) == distu(mon->mx, mon->my).
function mdistu(mtmp) {
    const u = game.u;
    const dx = mtmp.mx - (u?.ux ?? 0), dy = mtmp.my - (u?.uy ?? 0);
    return dx * dx + dy * dy;
}
// C ref: hacklib.c s_suffix().
function s_suffix(s) {
    if (/s$/.test(s)) return `${s}'`;
    return `${s}'s`;
}

// C ref: polyself.c dospinweb() — #monster for a spider.  The three refusal
// gates (which return ECMD_OK, i.e. NO turn elapses) are ported exactly; the
// existing-trap switch and the maketrap(WEB) tail are deferred — they need
// bury_objs()/add_damage()/feeltrap() for the hero's own square.
async function dospinweb() {
    const u = game.u;
    const x = u.ux, y = u.uy;
    const typ = game.level?.at?.(x, y)?.typ;
    const reject_terrain = is_pool_or_lava(x, y) || IS_AIR(typ);
    if (u.uprops?.Levitation || reject_terrain) {
        await pline(`You must be on ${reject_terrain ? 'solid' : 'the'} ground to spin a web.`);
        return ECMD_OK;
    }
    if (u.uswallow) {
        // "You release web fluid inside <mon>." + the engulfer dispatch:
        // deferred (needs expels()).  C returns ECMD_OK on every arm.
        return ECMD_OK;
    }
    if (u.utrap) {
        await pline('You cannot spin webs while stuck in a trap.');
        return ECMD_OK;
    }
    exercise(A_DEX, true);
    // existing-trap switch / On_stairs / maketrap(x, y, WEB): deferred.
    return ECMD_TIME;
}

// C ref: rm.h is_pool(x, y) / is_pool_or_lava(x, y).  hack.js keeps a private
// unexported copy of the latter; these go through const.js's IS_POOL/IS_LAVA
// rather than repeating the terrain ordinals.
function is_pool(x, y) {
    const t = game.level?.at?.(x, y)?.typ;
    return t != null && IS_POOL(t);
}
function is_pool_or_lava(x, y) {
    const t = game.level?.at?.(x, y)?.typ;
    return t != null && (IS_POOL(t) || IS_LAVA(t));
}
// C ref: svl.level.objects[u.ux][u.uy] — HEAD of the floor pile under the
// hero.  place_object() prepends, so our flat array's LAST match is C's head.
function obj_at_hero() {
    const u = game.u;
    const list = game.level?.objects || [];
    for (let i = list.length - 1; i >= 0; i--) {
        const o = list[i];
        if (o.where === 'floor' && o.ox === u.ux && o.oy === u.uy) return o;
    }
    return null;
}

// C ref: cmd.c domonability() — #monster: use the current polymorphed form's
// special ability.  The chain below is C's exact if/else-if ORDER, which the
// previous version had wrong twice: C tries dosummon() BEFORE dohide()/
// dospinweb(), and domindblast() BEFORE the gremlin/unicorn/shriek branches.
export async function domonability() {
    const u = game.u;
    const mdat = u.data;
    const might_hide = !!mdat && (is_hider_flag(mdat) || hides_under_flag(mdat));
    let c = '\0';

    // C ref: cmd.c:897-901 — decl.c hidespinchars[] == "hsq", default 'q'.
    // This prompt READS A KEY.  Skipping it (as this used to) does not make it
    // free: the 'h'/'s'/'q' the player typed is still in the input stream and
    // the command parser executes it as a command.
    if (might_hide && webmaker(mdat)) {
        const { yn_function } = await import('./extcmd-handlers.js');
        c = await yn_function('Hide [h] or spin a web [s]?', 'hsq', 'q');
        if (c === 'q' || c === '\x1b')
            return ECMD_OK;
    }
    if (mdat && can_breathe(mdat)) {
        return await dobreathe();
    } else if (mdat && has_spit(mdat)) {
        return await dospit();
    } else if (mdat && mdat.mlet === 'n') {
        return await doremove();
    } else if (mdat && has_gaze(mdat)) {
        return await dogaze();
    } else if (mdat && is_were_flag(mdat)) {
        return await dosummon();
    } else if (c !== '\0' ? c === 'h' : might_hide) {
        return await dohide();
    } else if (c !== '\0' ? c === 's' : webmaker(mdat)) {
        return await dospinweb();
    } else if (mdat && is_mind_flayer_pm(mdat)) {
        return await domindblast();
    } else if (u.umonnum === PM_GREMLIN) {
        if (IS_FOUNTAIN(game.level?.at?.(u.ux, u.uy)?.typ)) {
            // split_mon()/dryup(): deferred (split_mon does not exist here).
        } else if (is_pool(u.ux, u.uy)) {
            // split_mon(): deferred.
        } else {
            await pline('There is no fountain here.');
        }
    } else if (mdat && is_unicorn_pm(mdat)) {
        // use_unicorn_horn(NULL): deferred (apply.c's version is not ported).
        return ECMD_TIME;
    } else if (msound_of(mdat) === MS_SHRIEK) {
        await pline('You shriek.');
        // u.uburied / aggravate(): aggravate() wakes every monster on the
        // level; deferred, but the shriek message itself is a real --More--
        // boundary that used to be dropped entirely.
    } else if (mdat && is_vampire_pm(mdat)) {
        // dopoly() -> polyself(POLY_MONSTER): deferred; the interactive
        // polyself shell lives in extcmd-handlers.js.
        return ECMD_TIME;
    } else if (u.Upolyd) {
        await pline('Any special ability you may have is purely reflexive.');
    } else {
        await pline("You don't have a special ability in your normal form!");
    }
    return ECMD_OK;
}

export { is_placeholder_pm, PM_HUMAN, PM_ORC, PM_GIANT, PM_ELF };
