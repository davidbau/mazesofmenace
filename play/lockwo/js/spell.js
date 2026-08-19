// spell.js — spell memory + casting.
// C ref: spell.c.  Ports initialspell (memorize a starting spellbook),
// num_spells, the cast command entry (docast / getspell + dospellmenu) and
// spelleffects for the healing-on-self case exercised by the gameplay sessions.

import { game } from './gstate.js';
import { rn2, rnd, rn1 } from './rng.js';
import { pline, update_topl } from './display.js';
import { exercise } from './attrib.js';
import { objects, mksobj, weight, SPE_BLANK_PAPER, SPE_NOVEL } from './mkobj.js';
import { SPELL_META } from './u_init.js';
import { A_WIS, A_INT, A_STR, P_UNSKILLED, P_EXPERT, P_SKILLED, P_BASIC,
         STRAT_WAITFORU, STRAT_APPEARMSG, EXT_ENCUMBER } from './const.js';
import { p_skill_of, use_skill } from './enhance.js';
import { monster_by_pmidx } from './makemon.js';
import { msound_of, mflags1_of, M1_NOHEAD } from './monflags_data.js';
import { discover_object } from './o_init.js';
import { DESCR_BY_OTYP } from './o_descr_data.js';

// C ref: objclass.h obj_material_types — is_metallic() = material in [IRON,MITHRIL].
const MAT_IRON = 11, MAT_MITHRIL = 17;
// C ref: include/objects.h — otyp constants used by percent_success / weight.
const OTYP_ROBE = 143, OTYP_QUARTERSTAFF = 79;
// C ref: include/objects.h — objects[SMALL_SHIELD].oc_weight.
const SMALL_SHIELD_OC_WEIGHT = 30;
// C ref: spell.c — metal armor casting penalties.
const UARMHBON = 4, UARMGBON = 6, UARMFBON = 2;

function ACURR(i) { return game.u?.acurr?.a?.[i] ?? 0; }
function is_metallic_obj(o) {
    const m = objects[o?.otyp]?.material;
    return m != null && m >= MAT_IRON && m <= MAT_MITHRIL;
}

// C ref: spell.c spelltypemnemonic — skill discipline -> menu category name.
const SKILL_CATEGORY = {
    28: 'attack', 29: 'healing', 30: 'divination', 31: 'enchantment',
    32: 'clerical', 33: 'escape', 34: 'matter',
};
export function spell_skilltype(otyp) { return SPELL_META.get(otyp)?.skill ?? 0; }
export function spell_level_of(otyp) { return SPELL_META.get(otyp)?.level ?? 1; }
export function spelltypemnemonic(otyp) {
    return SKILL_CATEGORY[spell_skilltype(otyp)] || 'attack';
}

export const MAXSPELL = 25; // C ref: spell.h.
export const NO_SPELL = 0;
export const KEEN = 20000; // C ref: spell.c — full spell retention.
// C ref: include/monsters.h MS_* — the msound values can_chant() rejects.
const MS_SILENT = 0, MS_BUZZ = 10, MS_BURBLE = 16;

const ECMD_OK = 0;
const ECMD_FAIL = 0;
const ECMD_TIME = 1;

// C ref: include/objects.h — the healing spellbook otyps.  These must match the
// real objects[] indices (see mkobj.js SPE_* table); a wrong value both mis-keys
// the applySpell() switch and drops/misapplies the "healing spell" caster bonus
// in percent_success().
const SPE_HEALING = 374;
const SPE_DETECT_FOOD = 383;
const SPE_CURE_BLINDNESS = 378;
const SPE_CURE_SICKNESS = 386;
const SPE_EXTRA_HEALING = 391;
const SPE_RESTORE_ABILITY = 392;
const SPE_REMOVE_CURSE = 395;

// spl_book lives on the game object: an array of { sp_id, sp_lev, sp_know }.
function spl_book() {
    if (!Array.isArray(game.spl_book)) {
        game.spl_book = Array.from({ length: MAXSPELL }, () => ({
            sp_id: NO_SPELL, sp_lev: 0, sp_know: 0,
        }));
    }
    return game.spl_book;
}

function spellid(i) { return spl_book()[i]?.sp_id ?? NO_SPELL; }
function spellev(i) { return spl_book()[i]?.sp_lev ?? 0; }
function spellknow(i) { return spl_book()[i]?.sp_know ?? 0; }

// Index-based accessors for the dovspell view menu (invent.js).
export function spellid_at(i) { return spellid(i); }
export function spellknow_at(i) { return spellknow(i); }
export function percent_success_at(i) { return percent_success(i); }
export function spellretention_at(i) { return spellretention(i); }

// C ref: spell.c age_spells() — every move-loop pass decrements each known
// spell's retention by one (decrnknow).  Consumes no RNG.
export function age_spells() {
    const book = spl_book();
    for (let i = 0; i < MAXSPELL && book[i].sp_id !== NO_SPELL; i++)
        if (book[i].sp_know) book[i].sp_know--;
}

// C ref: spell.c num_spells — count of known spells (until first NO_SPELL).
export function num_spells() {
    let i = 0;
    for (; i < MAXSPELL; i++)
        if (spellid(i) === NO_SPELL) break;
    return i;
}

// C ref: spell.c initialspell — memorize a starting-inventory spellbook,
// filling the next free spl_book slot with full retention (no RNG).
export function initialspell(obj) {
    const otyp = obj.otyp;
    const book = spl_book();
    let i = 0;
    for (; i < MAXSPELL; i++)
        if (spellid(i) === NO_SPELL || spellid(i) === otyp) break;
    if (i === MAXSPELL || spellid(i) !== NO_SPELL) return;
    book[i].sp_id = otyp;
    book[i].sp_lev = spell_level_of(otyp); // C: objects[otyp].oc_level
    book[i].sp_know = KEEN;
}

// C ref: spell.c skill_based_spellbook_id() — Wizards recognize spellbook
// appearances according to their current skill in each spell school.
export function skill_based_spellbook_id() {
    const rolemnum = game.urole?.mnum ?? game.u?.umonnum;
    if (rolemnum !== 12) return;
    for (const [otyp, meta] of SPELL_META) {
        if (!meta.skill) continue;
        const skill = p_skill_of(meta.skill);
        const maxLevel = skill === P_BASIC ? 3
            : skill === P_SKILLED ? 5
                : skill >= P_EXPERT ? 7
                    : game.u?.uroleplay?.pauper ? 0 : 1;
        if (meta.level <= maxLevel)
            discover_object(otyp, true, false, false);
    }
}

// C ref: spell.c docast — the 'Z' command.
export async function docast() {
    const spellNo = await getspell();
    if (spellNo >= 0)
        return await spelleffects(spellid(spellNo), false, false);
    return ECMD_FAIL;
}

// C ref: mon.c can_chant(&youmonst) — a Strangled hero, or one polymorphed into
// a voiceless/headless form, can't chant an incantation.
function can_chant_hero() {
    const u = game.u;
    if (u?.uprops?.Strangled) return false;
    // u.umonnum holds the ROLE number, not a permonst index, unless the hero is
    // polymorphed (polyself.js sets Upolyd when umonnum != umonster) — reading
    // the mons[] tables with a role number names an unrelated monster.  Every
    // role's player monster is voiced and has a head, so an unpolymorphed hero
    // can always chant.
    if (!u?.Upolyd) return true;
    const ptr = monster_by_pmidx(u.umonnum);
    if (!ptr) return true;
    const ms = msound_of(ptr);
    if (ms === MS_SILENT || ms === MS_BUZZ || ms === MS_BURBLE) return false;
    if ((mflags1_of(ptr) & M1_NOHEAD) !== 0) return false;   /* !has_head */
    return true;
}

// C ref: spell.c rejectcasting() — the pre-selection rejections, checked BEFORE
// the spell menu opens.  Was missing entirely: a stunned hero pressing 'Z' got
// our spell menu (C prints one line and takes no turn), so every keystroke the
// player spent picking a spell fell through to rhack() as a phantom command.
async function rejectcasting() {
    const u = game.u;
    // C ref: youprop.h Stunned = HStun || EStun.
    if ((u?.uprops?.Stun || 0) > 0 || !!u?.Stunned) {
        await pline('You are too impaired to cast a spell.');
        return true;
    }
    if (!can_chant_hero()) {
        await pline('You are unable to chant the incantation.');
        return true;
    }
    // C's third arm is `!freehand() && !(uwep && uwep->otyp == QUARTERSTAFF)`
    // -> "Your arms are not free to cast!".  freehand() is
    // (!uwep || !welded(uwep) || ...) and invent.js welded() is a constant
    // FALSE in this port, so the arm cannot fire; restore it with welded().
    return false;
}

// C ref: spell.c getspell — choose a spell to cast via the popup menu.
async function getspell() {
    const nspells = num_spells();
    if (!nspells) {
        await pline("You don't know any spells right now.");
        return -1;
    }
    if (await rejectcasting()) return -1;
    const { spell_menu } = await import('./invent.js');
    const meta = {
        name: (otyp) => objects[otyp]?.name || '',
        category: (otyp) => spelltypemnemonic(otyp),
        fail: (i) => 100 - percent_success(i),  // displayed Fail%
        retention: (i) => spellretention(i),
        // wizard-mode "turns" column: C prints spellknow(i) raw (note it uses
        // the LOOP index i here while the other fields use the sort-order index;
        // with no custom sort the two coincide).
        turns: (i) => spellknow(i),
    };
    return await spell_menu('Choose which spell to cast', nspells, spl_book(), meta);
}

// C ref: spell.c spellretention(idx, outbuf) — retention as a percentage range
// whose precision depends on the hero's skill in the spell's discipline:
//   expert 2% / skilled 5% / basic 10% / unskilled 25% intervals.
// "100%" when freshly learned (sp_know >= KEEN), "(gone)" when expired.
function spellretention(i) {
    let skill = p_skill_of(spell_skilltype(spellid(i)));
    skill = Math.max(skill, P_UNSKILLED); // restricted same as unskilled
    const turnsleft = spellknow(i);
    if (turnsleft < 1) return '(gone)';
    if (turnsleft >= KEEN) return '100%';
    // percent = (turnsleft - 1) / (KEEN/100) + 1
    let percent = Math.trunc((turnsleft - 1) / Math.trunc(KEEN / 100)) + 1;
    const accuracy = skill === P_EXPERT ? 2
        : skill === P_SKILLED ? 5
            : skill === P_BASIC ? 10 : 25;
    // round up to the high end of this range
    percent = accuracy * (Math.trunc((percent - 1) / accuracy) + 1);
    return `${percent - accuracy + 1}%-${percent}%`;
}

// C ref: spell.c SPELL_LEV_PW — energy cost = 5 * spell level.
function SPELL_LEV_PW(lev) { return 5 * lev; }

// C ref: spell.c isqrt — integer square root (used by percent_success).
function isqrt(val) {
    let r = Math.floor(Math.sqrt(val));
    while ((r + 1) * (r + 1) <= val) r++;
    while (r * r > val) r--;
    return r;
}


// C ref: spell.c percent_success(spell) — combine intrinsic ability
// (splcaster, from role spell stats + worn armor) with learned ability
// (chance, from magic stat, hero level and skill) into a 0..100 cast chance.
// `spell` is a spl_book[] index.
function percent_success(spell) {
    const u = game.u || {};
    const role = game.urole || {};
    const sp = role.spel || { base: 0, heal: 0, shld: 0, armr: 0, stat: A_WIS, spec: 0, sbon: 0 };
    const otyp = spellid(spell);
    const skilltype = spell_skilltype(otyp);
    // Knights don't get the metal-armor penalty for clerical spells.
    const Role_if_KNIGHT = role.mnum === 4;
    const paladin_bonus = Role_if_KNIGHT && skilltype === 32 /*P_CLERIC_SPELL*/;

    let splcaster = sp.base;
    const special = sp.heal;
    const statused = ACURR(sp.stat);

    const uarm = game.uarm, uarmc = game.uarmc, uarms = game.uarms,
        uarmh = game.uarmh, uarmg = game.uarmg, uarmf = game.uarmf,
        uwep = game.uwep;

    if (uarm && is_metallic_obj(uarm) && !paladin_bonus)
        splcaster += (uarmc && uarmc.otyp === OTYP_ROBE)
            ? Math.trunc(sp.armr / 2) : sp.armr;
    else if (uarmc && uarmc.otyp === OTYP_ROBE)
        splcaster -= sp.armr;
    if (uarms)
        splcaster += sp.shld;
    if (uwep && uwep.otyp === OTYP_QUARTERSTAFF)
        splcaster -= 3;
    if (!paladin_bonus) {
        if (uarmh && is_metallic_obj(uarmh)) splcaster += UARMHBON;
        if (uarmg && is_metallic_obj(uarmg)) splcaster += UARMGBON;
        if (uarmf && is_metallic_obj(uarmf)) splcaster += UARMFBON;
    }
    if (otyp === sp.spec) splcaster += sp.sbon;
    // C ref: spell.c percent_success — the "healing spell" caster bonus applies
    // to the healing family (healing, extra healing, cure blindness, cure
    // sickness, restore ability, remove curse) but NOT to stone to flesh.
    if (otyp === SPE_HEALING || otyp === SPE_EXTRA_HEALING
        || otyp === SPE_CURE_BLINDNESS || otyp === SPE_CURE_SICKNESS
        || otyp === SPE_RESTORE_ABILITY || otyp === SPE_REMOVE_CURSE)
        splcaster += special;
    if (splcaster > 20) splcaster = 20;

    let chance = Math.trunc(11 * statused / 2);
    let skill = p_skill_of(skilltype);
    skill = Math.max(skill, P_UNSKILLED) - 1; // unskilled => 0
    const difficulty = (spellev(spell) - 1) * 4
        - (skill * 6 + Math.trunc((u.ulevel || 1) / 3) + 1);
    if (difficulty > 0) {
        chance -= isqrt(900 * difficulty + 2000);
    } else {
        const learning = Math.trunc(15 * -difficulty / spellev(spell));
        chance += learning > 20 ? 20 : learning;
    }
    if (chance < 0) chance = 0;
    if (chance > 120) chance = 120;

    // C: weight(uarms) > objects[SMALL_SHIELD].oc_weight (30).  This used to
    // consult a 9-entry otyp->weight table whose `?? OTYP_SMALL_SHIELD` default
    // returned the OTYP 150 as a weight, so any shield outside the table was
    // silently treated as heavy; mkobj.js carries the real per-otyp oc_weight.
    if (uarms && weight(uarms) > SMALL_SHIELD_OC_WEIGHT) {
        if (otyp === sp.spec) chance = Math.trunc(chance / 2);
        else chance = Math.trunc(chance / 4);
    }

    chance = Math.trunc(chance * (20 - splcaster) / 15) - splcaster;
    if (chance > 100) chance = 100;
    if (chance < 0) chance = 0;
    return chance;
}

// C ref: spell.c spell_backfire(spell) — what casting a forgotten spell does.
// One rn2(10) and no other draw; the confusion/stun timers it sets steer later
// moves (confdir()'s rn2(8) redirect), so this is not cosmetic.
function spell_backfire(spell) {
    const u = game.u;
    if (!u.uprops) u.uprops = {};
    const duration = (spellev(spell) + 1) * 3;           /* 6..24 */
    const old_stun = u.uprops.Stun || 0, old_conf = u.uprops.Confusion || 0;
    const set_conf = (t) => { u.uprops.Confusion = t; u.uconf = t > 0; };
    const set_stun = (t) => { u.uprops.Stun = t; };
    switch (rn2(10)) {
    case 0: case 1: case 2: case 3:
        set_conf(old_conf + duration);                                   /* 40% */
        break;
    case 4: case 5: case 6:
        set_conf(old_conf + Math.trunc(2 * duration / 3));               /* 30% */
        set_stun(old_stun + Math.trunc(duration / 3));
        break;
    case 7: case 8:
        set_stun(old_stun + Math.trunc(2 * duration / 3));               /* 20% */
        set_conf(old_conf + Math.trunc(duration / 3));
        break;
    default:
        set_stun(old_stun + duration);                                   /* 10% */
        break;
    }
    game.botl = true;
}

// C ref: hack.c check_capacity(str) — near_capacity() >= EXT_ENCUMBER.
async function check_capacity_spell(str) {
    const { near_capacity } = await import('./invent.js');
    if (near_capacity() >= EXT_ENCUMBER) {
        await pline(str);
        return true;
    }
    return false;
}

// C ref: eat.c morehungry(num) — u.uhunger -= num; newuhs(TRUE).  newuhs can
// draw (the FAINTING rn2(20 - uhunger/10)), so skipping the hunger cost of
// casting shifts the whole later stream, not just the botl hunger word.
async function morehungry_spell(num) {
    const u = game.u;
    u.uhunger = (u.uhunger ?? 900) - num;
    const { newuhs } = await import('./eat.js');
    await newuhs(true);
}

// C ref: spell.c spelleffects_check — pre-cast validation.  Returns
// { fail:true, code } if the cast should not proceed.  Every branch below used
// to be summarised away as "doesn't trip on the covered starts"; the
// insufficient-energy one in particular fires for any level-1 caster whose
// spell costs more Pw than they have, where C draws NO rnd(100) at all.
async function spelleffects_check(spell) {
    const u = game.u;
    const confused = !!(u?.uconf || (u?.uprops?.Confusion || 0) > 0);
    if (spell < 0 || await rejectcasting())
        return { fail: true, code: ECMD_OK, energy: 0 };

    const energy = SPELL_LEV_PW(spellev(spell));

    if (spellknow(spell) <= 0) {
        await pline('Your knowledge of this spell is twisted.');
        await pline('It invokes nightmarish images in your mind...');
        spell_backfire(spell);
        u.uen -= rnd(energy);
        if (u.uen < 0) u.uen = 0;
        game.botl = true;
        return { fail: true, code: ECMD_TIME, energy };
    } else if (spellknow(spell) <= KEEN / 200) {
        await pline('You strain to recall the spell.');
    } else if (spellknow(spell) <= KEEN / 40) {
        await pline('You have difficulty remembering the spell.');
    } else if (spellknow(spell) <= KEEN / 20) {
        await pline('Your knowledge of this spell is growing faint.');
    } else if (spellknow(spell) <= KEEN / 10) {
        await pline('Your recall of this spell is gradually fading.');
    }

    if ((u.uhunger ?? 900) <= 10 && spellid(spell) !== SPE_DETECT_FOOD) {
        await pline('You are too hungry to cast that spell.');
        return { fail: true, code: ECMD_OK, energy };
    } else if (ACURR(A_STR) < 4 && spellid(spell) !== SPE_RESTORE_ABILITY) {
        await pline('You lack the strength to cast spells.');
        return { fail: true, code: ECMD_OK, energy };
    } else if (await check_capacity_spell(
                   'Your concentration falters while carrying so much stuff.')) {
        return { fail: true, code: ECMD_TIME, energy };
    }

    let res = ECMD_OK;
    // Carrying the Amulet drains energy on every cast attempt (rnd(2*energy)),
    // and the attempt costs a turn even when the drain leaves too little Pw.
    if (u.uhave?.amulet && u.uen >= energy) {
        await pline('You feel the amulet draining your energy away.');
        u.uen -= rnd(2 * energy);
        if (u.uen < 0) u.uen = 0;
        game.botl = true;
        res = ECMD_TIME;
    }

    if (energy > u.uen) {
        // C leaves *res alone here: ECMD_OK unless the amulet already charged
        // a turn.  Crucially it returns BEFORE the rnd(100) cast roll.
        const suffix = (u.uen < u.uenmax) ? ''
            : (energy > (u.uenpeak ?? u.uenmax)) ? ' yet' : ' anymore';
        await pline(`You don't have enough energy to cast that spell${suffix}.`);
        return { fail: true, code: res, energy };
    }
    if (spellid(spell) !== SPE_DETECT_FOOD) {
        let hungr = energy * 2;
        // Wizards with high Int think their way through a spell more cheaply.
        const intell = (game.urole?.mnum === PM_WIZARD) ? ACURR(A_INT) : 10;
        if (intell >= 17) hungr = 0;
        else if (intell === 16) hungr = Math.trunc(hungr / 4);
        else if (intell === 15) hungr = Math.trunc(hungr / 2);
        // don't put the player (quite) into fainting from casting
        if (hungr > (u.uhunger ?? 900) - 3) hungr = (u.uhunger ?? 900) - 3;
        await morehungry_spell(hungr);
    }

    const chance = percent_success(spell);
    if (confused || (rnd(100) > chance)) {
        return { fail: true, code: ECMD_TIME, energy, failedcast: true };
    }
    return { fail: false, code: ECMD_OK, energy };
}

// C ref: spell.c spelleffects — apply a cast spell.  Exported so cmd.js's
// #turn fallback (a non-Priest/Knight who has the turn-undead spell in the
// spellbook casts it) can reach it; extcmd-handlers.js already probed for
// `spelleffects_ext` but nothing ever exported it, so that arm was dead.
export async function spelleffects_ext(spell_otyp) {
    return await spelleffects(spell_otyp, false, false);
}
async function spelleffects(spell_otyp, atme, force) {
    const spell = force ? spell_otyp : spell_idx(spell_otyp);
    let energy = 0;
    if (!force) {
        const chk = await spelleffects_check(spell);
        if (chk.fail) {
            if (chk.failedcast) {
                // update_topl(), not pline(): the monsters that move during this
                // same turn write their own messages onto the SAME topline, and
                // C's You() appends ("You fail to cast the spell correctly.  The
                // newt misses!").  pline() replaces the line, so only the
                // monster's half survived.
                await update_topl('You fail to cast the spell correctly.');
                game.u.uen -= Math.trunc(chk.energy / 2);
                game.botl = true;
            }
            return chk.code;
        }
        energy = chk.energy;
    }

    game.u.uen -= energy;
    game.botl = true;
    exercise(A_WIS, true);

    // C: pseudo = mksobj(spellid, FALSE, FALSE) — init=FALSE skips the class
    // init switch but still assigns o_id via next_ident (one rnd(2)).
    const pseudo = mksobj(force ? spell_otyp : spellid(spell), false, false);
    pseudo.blessed = 0;
    pseudo.cursed = 0;
    pseudo.quan = 20;
    const role_skill = p_skill_of(spell_skilltype(pseudo.otyp));
    const rc = await applySpell(pseudo.otyp, atme, pseudo, role_skill, spell);
    // C ref: spell.c spelleffects tail — "gain skill for successful cast".
    // use_skill() bumps P_ADVANCE and can print "You feel more confident in
    // your <school> skills." (and changes what #enhance offers); omitting it
    // left every caster's spell skills frozen at their chargen value.
    if (!force) use_skill(spell_skilltype(pseudo.otyp), spellev(spell));
    return rc;
}

function spell_idx(otyp) {
    for (let i = 0; i < MAXSPELL; i++)
        if (spellid(i) === otyp) return i;
    return -1;
}

// C ref: include/objects.h — the spellbook otyps spelleffects() dispatches on.
const SPE_DIG = 366, SPE_MAGIC_MISSILE = 367, SPE_FIREBALL = 368,
    SPE_CONE_OF_COLD = 369, SPE_SLEEP = 370, SPE_FINGER_OF_DEATH = 371,
    SPE_FORCE_BOLT = 376,
    SPE_LIGHT = 372, SPE_DETECT_MONSTERS = 373, SPE_KNOCK = 375,
    SPE_CONFUSE_MONSTER = 377, SPE_DRAIN_LIFE = 379, SPE_SLOW_MONSTER = 380,
    SPE_WIZARD_LOCK = 381, SPE_CREATE_MONSTER = 382, SPE_CAUSE_FEAR = 384,
    SPE_CLAIRVOYANCE = 385, SPE_CHARM_MONSTER = 387, SPE_HASTE_SELF = 388,
    SPE_DETECT_UNSEEN = 389, SPE_LEVITATION = 390, SPE_INVISIBILITY = 393,
    SPE_DETECT_TREASURE = 394, SPE_MAGIC_MAPPING = 396, SPE_IDENTIFY = 397,
    SPE_TURN_UNDEAD = 398, SPE_POLYMORPH = 399, SPE_TELEPORT_AWAY = 400,
    SPE_CREATE_FAMILIAR = 401, SPE_CANCELLATION = 402, SPE_PROTECTION = 403,
    SPE_JUMPING = 404, SPE_STONE_TO_FLESH = 405, SPE_CHAIN_LIGHTNING = 406;

// C ref: objclass.h oc_dir — NODIR/IMMEDIATE/RAY, as carried by objects[].dir.
const NODIR = 1;

// C ref: hack.c losehp(n, knam, k_format) — the local copy every file that
// damages the hero keeps (potion.js, dig.js, ...).
async function losehp_spell(dmg) {
    const u = game.u;
    if (!u) return;
    if (u.Upolyd) {
        u.mh = (u.mh | 0) - dmg;
        if (u.mh < 1) u.mh = 0;
        game.botl = true;
        return;
    }
    u.uhp = (u.uhp | 0) - dmg;
    game.botl = true;
    if (u.uhp < 1) {
        const { done_in_by } = await import('./end.js');
        await done_in_by(null, 0 /*DIED*/);
    }
}

// C ref: youprop.h Maybe_Half_Phys(dmg).
function Maybe_Half_Phys(dmg) {
    return (game.u?.uprops?.Half_physical_damage) ? Math.trunc((dmg + 1) / 2) : dmg;
}

// C ref: spell.c spelleffects() switch — the per-otyp effect, split out so the
// energy/exercise/mksobj preamble above reads like C's.  `otyp` is pseudo->otyp,
// `role_skill` is P_SKILL(spell_skilltype(otyp)) and `spell` the spl_book index.
//
// The wand-duplicate arm (the first case group) used to be missing entirely:
// only SPE_HEALING/SPE_EXTRA_HEALING had a case and every other directional
// spell fell through a silent `default:`.  That skipped getdir(), so casting
// force bolt or magic missile consumed the turn WITHOUT prompting "In what
// direction?" and the direction key the player typed next fell through to
// rhack() as a phantom movement command.
async function applySpell(otyp, atme, pseudo, role_skill, spell) {
    const u = game.u;
    let physical_damage = false;

    switch (otyp) {
    /*
     * At first spells act as expected.  As the hero increases in skill
     * with the appropriate spell type, some spells increase in their
     * effects, e.g. more damage, further distance, and so on, without
     * additional cost to the spellcaster.
     */
    case SPE_FIREBALL:
    case SPE_CONE_OF_COLD:
        if (role_skill >= P_SKILLED) {
            // DEFERRED: C's Skilled+ arm runs throwspell() (a getpos() spot
            // pick with a highlighted 10-square radius, then walk_path) and
            // explode()s rnd(8)+1 times around it.  Neither throwspell's
            // getpos_sethilite overlay nor explode() is ported; falling through
            // to the beam arm below would draw the WRONG RNG, so leave the
            // whole cast a no-op until both exist.
            break;
        }
        /* FALLTHRU */

    /* these spells are all duplicates of wand effects */
    case SPE_FORCE_BOLT:
        physical_damage = true;
        /* FALLTHRU */
    case SPE_SLEEP:
    case SPE_MAGIC_MISSILE:
    case SPE_KNOCK:
    case SPE_SLOW_MONSTER:
    case SPE_WIZARD_LOCK:
    case SPE_DIG:
    case SPE_TURN_UNDEAD:
    case SPE_POLYMORPH:
    case SPE_TELEPORT_AWAY:
    case SPE_CANCELLATION:
    case SPE_FINGER_OF_DEATH:
    case SPE_LIGHT:
    case SPE_DETECT_UNSEEN:
    case SPE_HEALING:
    case SPE_EXTRA_HEALING:
    case SPE_DRAIN_LIFE:
    case SPE_STONE_TO_FLESH: {
        const { weffects, zapyourself } = await import('./zap.js');
        if (objects[otyp]?.dir !== NODIR) {
            if (otyp === SPE_HEALING || otyp === SPE_EXTRA_HEALING) {
                /* healing and extra healing are actually potion effects,
                   but they've been extended to take a direction like wands */
                if (role_skill >= P_SKILLED) pseudo.blessed = 1;
            }
            if (atme) {
                u.dx = u.dy = u.dz = 0;
            } else {
                const { getdir } = await import('./cmd.js');
                const dir = await getdir(null);
                if (dir) {
                    // C's getdir() reports through u.dx/u.dy/u.dz (movecmd()
                    // writes all three, and the '.'-at-self arm zeroes them).
                    // cmd.js's getdir_confdir() only writes u.dx/u.dy, and skips
                    // even those when dz != 0, so a '<'/'>' cast would read the
                    // previous direction; publish the whole triple here.
                    u.dx = dir.dx; u.dy = dir.dy; u.dz = dir.dz;
                } else {
                    // C ref: spell.c spelleffects — a cancelled getdir does NOT
                    // abort; C announces the release and falls through with the
                    // PREVIOUS u.dx/u.dy still in place (commonly the last
                    // movement direction).  cmd.c movecmd() zeroes only u.dz on
                    // the reject path, so mirror that and leave dx/dy alone.
                    u.dz = 0;
                    await pline('The magical energy is released!');
                }
            }
            if (!u.dx && !u.dy && !u.dz) {
                let damage = await zapyourself(pseudo, true);
                if (damage) {
                    if (physical_damage) damage = Maybe_Half_Phys(damage);
                    await losehp_spell(damage);
                }
            } else {
                await weffects(pseudo);
            }
        } else {
            await weffects(pseudo);
        }
        /* C: update_inventory() — invent.js's is a no-op without perm_invent. */
        break;
    }

    /* these are all duplicates of scroll effects */
    case SPE_REMOVE_CURSE:
    case SPE_CONFUSE_MONSTER:
    case SPE_DETECT_FOOD:
    case SPE_CAUSE_FEAR:
    case SPE_IDENTIFY:
    case SPE_CHARM_MONSTER:
        /* high skill yields effect equivalent to blessed scroll */
        if (role_skill >= P_SKILLED) pseudo.blessed = 1;
        /* FALLTHRU */
    case SPE_MAGIC_MAPPING:
    case SPE_CREATE_MONSTER: {
        const { seffects } = await import('./read.js');
        await seffects(pseudo);
        break;
    }

    /* these are all duplicates of potion effects */
    case SPE_HASTE_SELF:
    case SPE_DETECT_TREASURE:
    case SPE_DETECT_MONSTERS:
    case SPE_LEVITATION:
    case SPE_RESTORE_ABILITY:
        /* high skill yields effect equivalent to blessed potion */
        if (role_skill >= P_SKILLED) pseudo.blessed = 1;
        /* FALLTHRU */
    case SPE_INVISIBILITY: {
        const { peffects } = await import('./potion.js');
        await peffects(pseudo);
        break;
    }
    /* end of potion-like spells */

    case SPE_CURE_BLINDNESS:
        await healup(0, 0, false, true);
        break;
    case SPE_CURE_SICKNESS: {
        const was_sick = !!(u?.uprops?.Sick), was_slimed = !!(u?.uprops?.Slimed);

        /* cure conditions (which updates status) before feedback */
        await healup(0, 0, true, false);
        if (was_sick || !was_slimed)
            await pline(`You are ${was_sick ? 'no longer' : 'not'} ill.`);
        if (was_slimed) {
            // C: make_slimed(0L, "The slime disappears!").  potion.c's timer
            // helper has no port; artifact.js clears u.uprops.Slimed the same
            // way.  Neither draws RNG.
            u.uprops.Slimed = 0;
            await pline('The slime disappears!');
        }
        break;
    }
    case SPE_CLAIRVOYANCE:
    case SPE_CREATE_FAMILIAR:
    case SPE_PROTECTION:
    case SPE_JUMPING:
    case SPE_CHAIN_LIGHTNING:
        // DEFERRED: do_vicinity_map(), make_familiar(), cast_protection(),
        // jump() and cast_chain_lightning() have no port yet.  cast_protection
        // in particular can't land alone: nothing decrements u.usptime in the
        // move loop, so its AC bonus would never expire.
        break;
    default:
        // C: impossible("Unknown spell %d attempted.", spell) then ECMD_OK.
        break;
    }
    return ECMD_TIME;
}

// C ref: potion.c healup(nhp, nxtra, curesick, cureblind).
async function healup(nhp, nxtra, curesick, cureblind) {
    const u = game.u;
    if (nhp) {
        u.uhp += nhp;
        if (u.uhp > u.uhpmax) {
            u.uhpmax += nxtra;
            u.uhp = u.uhpmax;
            if (u.uhpmax > (u.uhppeak || 0)) u.uhppeak = u.uhpmax;
        }
    }
    if (!u.uprops) u.uprops = {};
    if (cureblind) {
        // C: make_blinded(0L, TRUE) + make_deaf(0L, TRUE); u.ucreamed = 0 is
        // done inside make_blinded.
        const { make_blinded_hero } = await import('./potion.js');
        await make_blinded_hero(0, true);
        u.uprops.HDeaf = 0;
    }
    if (curesick) {
        u.uprops.Sick = 0;
        u.usick_type = 0;
        game.botl = true;
    }
}

// C ref: include/objects.h SPELL(...,delay,...) — objects[otyp].oc_delay, the
// per-spellbook study delay (parallel to SPELL_META's oc_level).  The JS objects
// table doesn't carry oc_delay, so it lives here keyed by otyp (SPE_*).
const SPELL_DELAY = new Map([
    [366, 6], [367, 2], [368, 4], [369, 7], [370, 1], [371, 10], [372, 1],
    [373, 1], [374, 2], [375, 1], [376, 2], [377, 2], [378, 2], [379, 2],
    [380, 2], [381, 3], [382, 3], [383, 3], [384, 3], [385, 3], [386, 3],
    [387, 3], [388, 4], [389, 4], [390, 4], [391, 5], [392, 5], [393, 5],
    [394, 5], [395, 5], [396, 7], [397, 6], [398, 8], [399, 8], [400, 6],
    [401, 7], [402, 8], [403, 3], [404, 3], [405, 1], [406, 4],
]);
function oc_delay_of(otyp) { return SPELL_DELAY.get(otyp) ?? 0; }

const PM_WIZARD = 12; // C ref: include/monsters.h; role check for the difficulty prompt.
const LENSES = 232; // C ref: include/objects.h otyp; +2 read_ability when worn.
const SPE_BOOK_OF_THE_DEAD = 409; // C ref: include/objects.h otyp.
const MAX_SPELL_STUDY = 3;  // C ref: include/spell.h:12

// C ref: hack.c nomul(nval) — make the hero helpless/busy for |nval| turns.
// `if (multi < nval) return; multi = nval;` plus clearing travel state.  Set
// directly (like potion.c peffect_paralysis in potion.js): the move loop's
// multi<0 countdown runs the busy turns and announces nomovemsg when it hits 0.
function nomul(nval) {
    if ((game.multi ?? 0) < nval) return;
    game.multi = nval;
    game.context = game.context || {};
    game.context.travel = game.context.travel1 = game.context.mv = 0;
}

// C ref: wizard.c aggravate() — wake every monster on the level and clear its
// "wait for you" / "appear message" strategy; a frozen monster gets a 1-in-5
// chance to become able to move again.  In_W_tower is irrelevant off the Wizard
// tower (both hero and monsters test FALSE), so no monster is skipped.
function aggravate() {
    const mons = game.fmon || game.level?.monsters || [];
    for (const mtmp of mons) {
        if (!mtmp) continue;
        if (mtmp.mhp != null && mtmp.mhp < 1) // DEADMONSTER(mtmp)
            continue;
        mtmp.mstrategy = (mtmp.mstrategy | 0) & ~(STRAT_WAITFORU | STRAT_APPEARMSG);
        mtmp.msleeping = 0;
        if (!mtmp.mcanmove && !rn2(5)) {
            mtmp.mfrozen = 0;
            mtmp.mcanmove = 1;
        }
    }
}

// C ref: spell.c cursed_book() — malign effects when reading a book that's too
// hard (or cursed).  Selector is rn2(oc_level); with oc_level <= 7 the switch
// never reaches the `default` (rndcurse) arm.  Returns TRUE if the book is
// destroyed (only the exploding-rune arm, reachable for level-7 books).
async function cursed_book(bp) {
    const lev = spell_level_of(bp.otyp); // objects[bp->otyp].oc_level
    let dmg = 0;
    switch (rn2(lev)) {
    case 0:
        await update_topl('You feel a wrenching sensation.');
        // tele() (teleport self) not ported; effect omitted.
        break;
    case 1:
        await update_topl('You feel threatened.');
        aggravate();
        break;
    case 2:
        // make_blinded(BlindedTimeout + rn1(100, 250), TRUE)
        rn1(100, 250);
        break;
    case 3:
        // take_gold(): remove all carried coins (no RNG); effect omitted here.
        break;
    case 4:
        await update_topl('These runes were just too much to comprehend.');
        // make_confused(HConfusion + rn1(7, 16), FALSE)
        rn1(7, 16);
        break;
    case 5: {
        await update_topl('The book was coated with contact poison!');
        // uarmg erode path (no hero gloves in the covered flow); else poison.
        const Poison_resistance = !!game.u?.Poison_resistance;
        rn1(Poison_resistance ? 2 : 4, Poison_resistance ? 1 : 3);
        rnd(Poison_resistance ? 6 : 10);
        break;
    }
    case 6:
        if (game.u?.Antimagic) {
            await update_topl('The book explodes, but you are unharmed!');
        } else {
            await update_topl('As you read the book, it explodes in your face!');
            dmg = 2 * rnd(10) + 5;
            void dmg; // losehp() not ported for this arm
        }
        return true;
    default:
        // rndcurse(): unreachable for spellbooks (oc_level <= 7).
        break;
    }
    return false;
}

// C ref: spell.c confused_book(spellbook) — a confused reader tears the book up
// (1 in 3) or just rereads a line.  Was CALLED by learn_step() but never
// defined in this file, so becoming confused mid-study threw a ReferenceError.
async function confused_book(spellbook) {
    const { useup, trycall } = await import('./invent.js');
    if (!rn2(3) && spellbook.otyp !== SPE_BOOK_OF_THE_DEAD) {
        spellbook.in_use = true;             /* in case called from learn() */
        await pline('Being confused you have difficulties in controlling your actions.');
        await pline('You accidentally tear the spellbook to pieces.');
        trycall(spellbook);
        useup(spellbook);
        return true;
    }
    await pline(`You find yourself reading the ${spellbook === game.context?.spbook?.book ? 'next' : 'first'} line over and over again.`);
    return false;
}

// C ref: youprop.h Sleep_resistance (HSleep_resistance || ESleep_resistance).
function Sleep_resistance_hero() {
    const u = game.u;
    return ((u?.uprops?.HSleep_resistance ?? u?.uprops?.Sleep_resistance ?? 0) > 0);
}
// C ref: objnam.c objdescr_is(obj, descr) — compare the SHUFFLED appearance.
function objdescr_is_spell(obj, descr) {
    const idx = objects[obj?.otyp]?.oc_descr_idx;
    if (idx == null) return false;
    return DESCR_BY_OTYP[idx] === descr;
}

// C ref: spell.c study_book — read a spellbook to memorize its spell.  Ports the
// "already know it quite well" refresh branch and the uncursed/cursed "too hard
// to comprehend" branch (rnd(20) difficulty roll -> cursed_book -> crumble
// check).  The dull-sleep rnd(25) fires only for "dull"-appearance books and the
// success-path memorization occupation (learn) are not yet ported.  Returns 1
// if a game turn was used, 0 otherwise.
export async function study_book(spellbook) {
    if (process?.env?.NHDBG_SB) console.error('[study_book] otyp=%s delay_ctx=%s book=%s moves=%s', spellbook.otyp, game.context?.spbook?.delay, game.context?.spbook?.book?.otyp, game.moves);
    const { makeknown, useup, trycall } = await import('./invent.js');
    const { y_n } = await import('./display.js');
    const u = game.u;
    const booktype = spellbook.otyp;
    const confused = !!(u?.uconf || u?.HConfusion || (u?.uprops?.Confusion || 0) > 0);
    let too_hard = false;

    // C ref: spell.c study_book():474 — "attempting to read a dull book may make
    // the hero fall asleep".  This runs BEFORE everything else and always draws
    // rnd(25) for a book whose (shuffled) appearance is "dull", so omitting it
    // desynchronises the stream for every read of that appearance, asleep or not.
    if (!confused && !Sleep_resistance_hero() && objdescr_is_spell(spellbook, 'dull')) {
        const oc_level = spell_level_of(booktype);
        let dullbook = rnd(25) - ACURR(A_WIS);
        const sb0 = game.context?.spbook;
        if (sb0?.delay && spellbook === sb0.book)
            dullbook -= rnd(oc_level);
        if (dullbook > 0) {
            // eyecount(youmonst) is 2 for every playable form -> plural.
            await pline("This book is so dull that you can't keep your eyes open.");
            dullbook += rnd(2 * oc_level);
            // fall_asleep(-dullbook, TRUE): stop_occupation + nomul.
            game._study_occupation = false;
            nomul(-dullbook);
            game.multi_reason = 'sleeping';
            game.nomovemsg = 'You wake up.';
            return 1;
        }
    }

    // C ref: spell.c study_book():495 — resuming an interrupted study skips the
    // whole difficulty/too-hard block (and its rnd(20)); it just re-arms the
    // occupation with the delay already accumulated.
    const sb_prev = game.context?.spbook;
    if (sb_prev?.delay && !confused && spellbook === sb_prev.book
        && booktype !== SPE_BLANK_PAPER) {
        await pline(`You continue your efforts to ${booktype === SPE_NOVEL ? 'read the novel' : 'memorize the spell'}.`);
        sb_prev.book = spellbook;
        sb_prev.o_id = spellbook.o_id;
        game._study_occupation = true;
        game.occupation_txt = 'studying';
        return 1;
    }

    if (booktype === SPE_BLANK_PAPER) {
        await pline('This spellbook is all blank.');
        makeknown(booktype);
        return 1;
    }
    if (booktype === SPE_NOVEL) {
        // Novel reading not exercised.
        return 1;
    }

    const oc_level = spell_level_of(booktype);
    const oc_delay = oc_delay_of(booktype);
    // C ref: spell.c study_book — study delay by spell level (svc.context.spbook.delay).
    let delay;
    switch (oc_level) {
    case 1: case 2: delay = -oc_delay; break;
    case 3: case 4: delay = -(oc_level - 1) * oc_delay; break;
    case 5: case 6: delay = -oc_level * oc_delay; break;
    case 7:         delay = -8 * oc_delay; break;
    default:        return 0;
    }

    // Already know it well?  spellknow > KEEN/10 for a freshly-learned spell.
    let i = 0;
    for (; i < MAXSPELL; i++)
        if (spellid(i) === booktype || spellid(i) === NO_SPELL) break;
    if (spellid(i) === booktype && spellknow(i) > KEEN / 10) {
        await pline(`You know "${objects[booktype]?.name}" quite well already.`);
        makeknown(booktype);
        game._yn_need_more = true; // ack the message with --More-- before [yn]
        const ans = await y_n('Refresh your memory anyway?');
        if (ans === 'n')
            return 0;
    }

    // "Books are often wiser than their readers" — chance to fail (too hard).
    spellbook.in_use = true;
    if (!spellbook.blessed && booktype !== SPE_BOOK_OF_THE_DEAD) {
        if (spellbook.cursed) {
            too_hard = true;
        } else {
            // uncursed - chance to fail
            const lenses = (u?.ublindf && u.ublindf.otyp === LENSES) ? 2 : 0;
            const read_ability = ACURR(A_INT) + 4 + Math.floor((u?.ulevel || 0) / 2)
                                 - 2 * oc_level + lenses;
            // only wizards know if a spell is too difficult
            if ((game.urole?.mnum === PM_WIZARD) && read_ability < 20 && !confused) {
                const qbuf = `This spellbook is ${read_ability < 12 ? 'very ' : ''}`
                           + 'difficult to comprehend.  Continue?';
                if (await y_n(qbuf) !== 'y') {
                    spellbook.in_use = false;
                    return 1;
                }
            }
            // its up to random luck now
            if (rnd(20) > read_ability)
                too_hard = true;
        }
    }

    if (too_hard) {
        const gone = await cursed_book(spellbook);
        nomul(delay); // study time; hero is busy for |delay| turns
        game.multi_reason = 'reading a book';
        // C sets gn.nomovemsg = 0 and unmul() defaults it to "You can move again."
        game.nomovemsg = 'You can move again.';
        if (gone || !rn2(3)) {
            if (!gone)
                await pline('The spellbook crumbles to dust!');
            trycall(spellbook);
            useup(spellbook);
        } else {
            spellbook.in_use = false;
        }
        return 1;
    }
    // C ref: spell.c study_book():619 — a CONFUSED reader never memorizes: the
    // book either gets torn to pieces (rn2(3)) or the hero rereads one line, and
    // the study delay elapses either way.  This arm was missing entirely, so a
    // confused hero learned the spell for free.
    if (confused) {
        if (!(await confused_book(spellbook)))
            spellbook.in_use = false;
        nomul(delay);
        game.multi_reason = 'reading a book';
        game.nomovemsg = 'You can move again.';
        if (game.context?.spbook) game.context.spbook.delay = 0;
        return 1;
    }
    // C ref: spell.c study_book tail — the SUCCESS path.  Used to be a stub that
    // just consumed the turn, so a successful read drew the rnd(20) difficulty
    // roll and then nothing: no "begin to memorize" message, no multi-turn study
    // (so no monster turns elapsed), and no spell added.  On seed4500 step 474 C
    // drew 37 calls where we drew 1, and every later `Z` cast of the book's spell
    // diverged too because the spell was never in the repertoire.
    spellbook.in_use = false;
    // update_topl(), not pline(): the study's completion message arrives on the
    // SAME topline, and C emits a --More-- (its own captured frame) when the two
    // together overflow 80 columns.  pline() replaces the line instead of
    // appending, so that boundary was missing.
    await update_topl(`You begin to ${booktype === SPE_BOOK_OF_THE_DEAD ? 'recite' : 'memorize'} the runes.`);

    game.context = game.context || {};
    game.context.spbook = game.context.spbook || {};
    game.context.spbook.delay = delay;
    game.context.spbook.book = spellbook;
    game.context.spbook.o_id = spellbook.o_id;
    // C ref: cmd.c set_occupation(learn, "studying", 0) — an untimed occupation:
    // the move loop calls learn() each turn instead of reading a command, so the
    // whole study produces ONE captured screen at the next command boundary.
    game._study_occupation = true;
    game.occupation_txt = 'studying';
    return 1;
}

// C ref: spell.c learn() — the studying occupation.  Returns 1 while still busy,
// 0 when the study is over (the move loop then clears go.occupation).
export async function learn_step() {
    const { makeknown, useup, trycall, check_unpaid } = await import('./invent.js');
    const g = game;
    const sb = g.context?.spbook;
    const book = sb?.book;
    if (!book) return 0;
    const u = g.u;

    // "JDS: lenses give 50% faster reading; 33% smaller read time" — the rn2(2)
    // is drawn only while delay is still nonzero AND lenses are worn.
    if (sb.delay && u?.ublindf && u.ublindf.otyp === LENSES && rn2(2))
        sb.delay++;
    if (u?.uconf || u?.HConfusion) {          /* became confused while learning */
        await confused_book(book);
        sb.book = 0; sb.o_id = 0;
        nomul(sb.delay);                      /* remaining delay is uninterrupted */
        g.multi_reason = 'reading a book';
        g.nomovemsg = 'You can move again.';
        sb.delay = 0;
        return 0;
    }
    if (sb.delay) {
        // "not if (delay++), so at end delay == 0" — delay is negative and
        // counts UP toward zero, one turn per occupation call.
        sb.delay++;
        return 1;                             /* still busy */
    }
    exercise(A_WIS, true);                    /* you're studying */
    let booktype = book.otyp;
    if (booktype === SPE_BOOK_OF_THE_DEAD) {
        // deadbook() is the Book of the Dead ritual; not reachable here.
        sb.book = 0; sb.o_id = 0;
        return 0;
    }

    const known = !!objects[booktype]?.oc_name_known;
    const splname = known ? `"${objects[booktype]?.name}"`
                          : `the "${objects[booktype]?.name}" spell`;
    let i = 0;
    for (; i < MAXSPELL; i++)
        if (spellid(i) === booktype || spellid(i) === NO_SPELL) break;

    let faded_to_blank = false;
    const book_arr = spl_book();
    if (i === MAXSPELL) {
        /* C: impossible("Too many spells memorized!") */
    } else if (spellid(i) === booktype) {
        // A normal book can be read and re-read a total of MAX_SPELL_STUDY times.
        if ((book.spestudied | 0) > MAX_SPELL_STUDY) {
            await pline('This spellbook is too faint to be read any more.');
            book.otyp = booktype = SPE_BLANK_PAPER;
            faded_to_blank = true;
            book.spestudied = rn2(book.spestudied);
        } else {
            await update_topl(`Your knowledge of ${splname} is ${spellknow(i) ? 'keener' : 'restored'}.`);
            book_arr[i].sp_know = KEEN + 1;   /* incrnknow(i, 1) */
            book.spestudied = (book.spestudied | 0) + 1;
            exercise(A_WIS, true);            /* extra study */
        }
    } else {                                  /* spellid(i) === NO_SPELL */
        if ((book.spestudied | 0) >= MAX_SPELL_STUDY) {
            await pline('This spellbook is too faint to read even once.');
            book.otyp = booktype = SPE_BLANK_PAPER;
            faded_to_blank = true;
            book.spestudied = rn2(book.spestudied);
        } else {
            book_arr[i].sp_id = booktype;
            book_arr[i].sp_lev = spell_level_of(booktype);
            book_arr[i].sp_know = KEEN + 1;   /* incrnknow(i, 1) */
            book.spestudied = (book.spestudied | 0) + 1;
            if (!i)
                /* first is always 'a', so no need to mention the letter */
                await update_topl(`You learn ${splname}.`);
            else
                await update_topl(`You add ${splname} to your repertoire, as '${spellet(i)}'.`);
        }
    }
    if (i < MAXSPELL) makeknown(booktype);
    void faded_to_blank;                      /* update_inventory: no perm_invent */

    if (book.cursed) {                        /* maybe a demon cursed it */
        if (await cursed_book(book)) {
            useup(book);
            sb.book = 0; sb.o_id = 0;
            return 0;
        }
    }
    if (check_unpaid) check_unpaid(book);
    sb.book = 0; sb.o_id = 0;
    return 0;
}

// C ref: spell.c spellet(spell) — the inventory-style letter for spell slot i.
function spellet(i) {
    return i < 26 ? String.fromCharCode(97 + i) : String.fromCharCode(65 + i - 26);
}

export { spellid, spellev, spellknow };
