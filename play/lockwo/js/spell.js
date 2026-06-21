// spell.js — spell memory + casting.
// C ref: spell.c.  Ports initialspell (memorize a starting spellbook),
// num_spells, the cast command entry (docast / getspell + dospellmenu) and
// spelleffects for the healing-on-self case exercised by the gameplay sessions.

import { game } from './gstate.js';
import { rn2, rnd, d } from './rng.js';
import { nhgetch } from './input.js';
import { pline, flush_screen } from './display.js';
import { exercise } from './attrib.js';
import { objects, mksobj, SPE_BLANK_PAPER, SPE_NOVEL } from './mkobj.js';
import { SPELL_META } from './u_init.js';
import { A_WIS, P_UNSKILLED, P_EXPERT, P_SKILLED, P_BASIC } from './const.js';
import { p_skill_of } from './enhance.js';

// C ref: objclass.h obj_material_types — is_metallic() = material in [IRON,MITHRIL].
const MAT_IRON = 11, MAT_MITHRIL = 17;
// C ref: include/objects.h — otyp constants used by percent_success / weight.
const OTYP_ROBE = 143, OTYP_QUARTERSTAFF = 79, OTYP_SMALL_SHIELD = 150;
// C ref: spell.c — metal armor casting penalties.
const UARMHBON = 4, UARMGBON = 6, UARMFBON = 2;
// C ref: include/objects.h — base oc_weight of the shield types (for the
// "shield heavier than a small shield" casting penalty).  Light shields (small
// shield, *-resistance, elven) are <= 40; only metal/large shields are heavier.
const SHIELD_OC_WEIGHT = {
    150: 30, 151: 30, 152: 30, // small / drain-res / shock-res shields
    153: 40,                   // elven shield
    154: 50, 155: 50,          // Uruk-hai / orcish shields
    156: 100,                  // large shield
    157: 100, 158: 50,         // dwarvish roundshield / shield of reflection
};

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

const ECMD_OK = 0;
const ECMD_FAIL = 0;
const ECMD_TIME = 1;

const SPE_HEALING = 373;
const SPE_EXTRA_HEALING = 374; // (not used by covered sessions; kept for parity)

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

// C ref: spell.c docast — the 'Z' command.
export async function docast() {
    const spellNo = await getspell();
    if (spellNo >= 0)
        return await spelleffects(spellid(spellNo), false, false);
    return ECMD_FAIL;
}

// C ref: spell.c getspell — choose a spell to cast via the popup menu.
async function getspell() {
    const nspells = num_spells();
    if (!nspells) {
        await pline("You don't know any spells right now.");
        return -1;
    }
    const { spell_menu } = await import('./invent.js');
    const meta = {
        name: (otyp) => objects[otyp]?.name || '',
        category: (otyp) => spelltypemnemonic(otyp),
        fail: (i) => 100 - percent_success(i),  // displayed Fail%
        retention: (i) => spellretention(i),
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

// C ref: include/objclass.h weight macros — base oc_weight of one shield.
function shield_oc_weight(o) {
    return SHIELD_OC_WEIGHT[o?.otyp] ?? OTYP_SMALL_SHIELD; // default light
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
    // healing-spell bonus (SPE_HEALING 373, EXTRA_HEALING 374, CURE_BLINDNESS 388,
    // CURE_SICKNESS 385, RESTORE_ABILITY 391, REMOVE_CURSE 394).
    if (otyp === 373 || otyp === 374 || otyp === 388 || otyp === 385
        || otyp === 391 || otyp === 394)
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

    if (uarms && shield_oc_weight(uarms) > 30 /*small shield oc_weight*/) {
        if (otyp === sp.spec) chance = Math.trunc(chance / 2);
        else chance = Math.trunc(chance / 4);
    }

    chance = Math.trunc(chance * (20 - splcaster) / 15) - splcaster;
    if (chance > 100) chance = 100;
    if (chance < 0) chance = 0;
    return chance;
}

// C ref: spell.c spelleffects_check — pre-cast validation; consumes the cast
// roll rnd(100).  Returns { fail:true, code } if the cast should not proceed.
function spelleffects_check(spell) {
    const energy = SPELL_LEV_PW(spellev(spell));
    // Hunger/strength/capacity/amulet gates don't trip on the covered starts.
    const chance = percent_success(spell);
    const confused = !!game.u?.Confusion;
    if (confused || (rnd(100) > chance)) {
        return { fail: true, code: ECMD_TIME, energy };
    }
    return { fail: false, code: ECMD_OK, energy };
}

// C ref: spell.c spelleffects — apply a cast spell.
async function spelleffects(spell_otyp, atme, force) {
    const spell = spell_idx(spell_otyp);
    const chk = spelleffects_check(spell);
    if (chk.fail) {
        await pline('You fail to cast the spell correctly.');
        game.u.uen -= (chk.energy / 2) | 0;
        return chk.code;
    }

    game.u.uen -= chk.energy;
    exercise(A_WIS, true);

    // C: pseudo = mksobj(spellid, FALSE, FALSE) — init=FALSE skips the class
    // init switch but still assigns o_id via next_ident (one rnd(2)).
    const pseudo = mksobj(force ? spell_otyp : spellid(spell), false, false);
    pseudo.blessed = 0;
    pseudo.cursed = 0;
    pseudo.quan = 20;
    return await applySpell(spell_otyp, atme, pseudo);
}

function spell_idx(otyp) {
    for (let i = 0; i < MAXSPELL; i++)
        if (spellid(i) === otyp) return i;
    return -1;
}

// C ref: spell.c spelleffects switch -> zapyourself for self-targeted healing.
// Healing/extra-healing take a direction; '.' targets self (u.dx/dy/dz = 0).
async function applySpell(otyp, atme, pseudo) {
    switch (otyp) {
    case SPE_HEALING:
    case SPE_EXTRA_HEALING: {
        let self = atme;
        if (!atme) {
            const dir = await getdir();
            if (dir === null) {
                // getdir cancelled: C re-uses previous direction.
                self = false;
            } else {
                self = (dir.dx === 0 && dir.dy === 0 && dir.dz === 0);
            }
        }
        if (self) {
            // C: zapyourself -> healup(d(6, EXTRA?8:4), 0, FALSE, blessed||EXTRA)
            const extra = (otyp === SPE_EXTRA_HEALING);
            healup(d(6, extra ? 8 : 4), 0, false, (pseudo?.blessed || extra));
            await pline(`You feel ${extra ? 'much ' : ''}better.`);
        }
        break;
    }
    default:
        break;
    }
    return ECMD_TIME;
}

// C ref: potion.c healup — restore HP (and optionally cap-raise / cure).
function healup(nhp, nxtra, curesick, cureblind) {
    const u = game.u;
    if (nhp) {
        u.uhp += nhp;
        if (u.uhp > u.uhpmax) {
            u.uhpmax += nxtra;
            u.uhp = u.uhpmax;
            if (u.uhpmax > (u.uhppeak || 0)) u.uhppeak = u.uhpmax;
        }
    }
    // curesick / cureblind have no covered effect at full health.
}

// C ref: cmd.c getdir — read a direction.  Renders "In what direction?" and
// reads one key; '.'/'s' = self.  Returns {dx,dy,dz} or null on cancel.  No RNG
// outside the (unused) fuzzer path.
async function getdir() {
    const prompt = 'In what direction?';
    game._pending_message = prompt;
    await flush_screen(1);
    game._modal_screen = 'topl';
    const disp = game.nhDisplay;
    // C tty yn_function parks the cursor one column past the prompt + space.
    if (disp?.setCursor) disp.setCursor(Math.min(prompt.length + 1, 79), 0);
    const key = await nhgetch();
    delete game._modal_screen;
    game._pending_message = '';
    const ch = String.fromCharCode(key);
    if (ch === '.' || ch === 's')
        return { dx: 0, dy: 0, dz: 0 };
    if (ch === '\x1b' || ch === ' ')
        return null;
    const DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1, '<': 0, '>': 0 };
    const DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1, '<': 0, '>': 0 };
    const DZ = { '<': -1, '>': 1 };
    if (ch in DX)
        return { dx: DX[ch], dy: DY[ch], dz: DZ[ch] || 0 };
    return null;
}

// C ref: spell.c study_book — read a spellbook to memorize its spell.  Ports
// the "already know it quite well" branch (the only one exercised): no dull /
// resume / blank / novel handling needed beyond the structural guards.  Returns
// 1 if a game turn was used, 0 otherwise.  The dull-sleep rnd(25) only fires
// for "dull"-appearance books, which the covered book is not.
export async function study_book(spellbook) {
    const { makeknown } = await import('./invent.js');
    const { y_n } = await import('./display.js');
    const booktype = spellbook.otyp;

    if (booktype === SPE_BLANK_PAPER) {
        await pline('This spellbook is all blank.');
        makeknown(booktype);
        return 1;
    }
    if (booktype === SPE_NOVEL) {
        // Novel reading not exercised.
        return 1;
    }

    // svc.context.spbook.delay assignment is bookkeeping (no RNG / no display).

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
    // Re-studying a known spell (ans === 'y') and first-time learning are not
    // exercised by the covered sessions.
    return 1;
}

export { spellid, spellev, spellknow };
