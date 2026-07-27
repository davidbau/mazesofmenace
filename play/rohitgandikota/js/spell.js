// spell.js — spellcasting.
// C ref: src/spell.c

import { game } from './gstate.js';
import { Confusion, Stunned } from './youprop.js';
import { pline } from './display.js';
import { ECMD_OK, weight } from './invent.js';
import { worn } from './do_wear.js';
import { ACURR } from './attrib.js';
import { isqrt } from './hacklib.js';
import { is_metallic } from './obj.js';
import { ONAMES } from './objects_data.js';
import { PMNAMES } from './monst_data.js';
import { rnd } from './rng.js';
import { tty_yn_function } from './tty/topl.js';
import { ECMD_FAIL, NO_SPELL } from './const.js';
import { You, Your, You_feel } from './pline.js';
import { acurr, exercise } from './attrib.js';
import { mksobj } from './mkobj.js';
import { A_WIS } from './const.js';
import { morehungry } from './eat.js';
import { ECMD_TIME } from './const.js';
import { A_STR, A_INT } from './const.js';
import { W_ARM, W_ARMC, W_ARMS, W_ARMH, W_ARMG, W_ARMF, W_WEP,
         P_CLERIC_SPELL, P_UNSKILLED, P_ISRESTRICTED } from './const.js';

// src/spell.c — NO_SPELL sentinel and the spell list accessor.

// src/spell.c spellid() — the spell in slot `spidx`, or NO_SPELL.
export function spellid(spidx) {
    const sp = game.spl_book?.[spidx];
    return sp ? sp.sp_id : NO_SPELL;
}

// src/spell.c:24 spellev() — the spell's level.
export function spellev(spidx) {
    return game.spl_book?.[spidx]?.sp_lev ?? 0;
}

// src/spell.c:856 spell_skilltype() — oc_skill is #defined to oc_subtyp.
export function spell_skilltype(booktype) {
    return game.objects[booktype].oc_subtyp;
}

// src/spell.c:22 incrnknow()
const incrnknow = (spell, x) => { game.spl_book[spell].sp_know = KEEN + x; };

// src/spell.c initialspell() — memorise a starting spellbook.
//
// u_init calls it for every SPBOOK_CLASS item in the starting inventory that
// is not blank paper. Without it game.spl_book stays empty, num_spells()
// returns 0, and getspell() answers "You don't know any spells right now."
// for a hero who plainly does.
export function initialspell(obj) {
    const otyp = obj.otyp;
    let i;

    for (i = 0; i < MAXSPELL; i++)
        if (spellid(i) === NO_SPELL || spellid(i) === otyp)
            break;

    if (i === MAXSPELL) {
        note_unported_spell('initialspell:too many spells');
    } else if (spellid(i) !== NO_SPELL) {
        /* initial inventory should not contain duplicate spellbooks */
        note_unported_spell('initialspell:duplicate');
    } else {
        (game.spl_book ||= [])[i] = {
            sp_id: otyp,
            sp_lev: game.objects[otyp].oc_level,
            sp_know: 0,
        };
        incrnknow(i, 0);
    }
}

// src/spell.c:115 spell_let_to_idx() — 'a'-'z' then 'A'-'Z'.
function spell_let_to_idx(ilet) {
    let indx = ilet.charCodeAt(0) - 'a'.charCodeAt(0);
    if (indx >= 0 && indx < 26)
        return indx;
    indx = ilet.charCodeAt(0) - 'A'.charCodeAt(0);
    if (indx >= 0 && indx < 26)
        return indx + 26;
    return -1;
}

// src/spell.c num_spells() — spells are contiguous from slot 0.
export function num_spells() {
    for (let i = 0; i < MAXSPELL; i++)
        if (spellid(i) === NO_SPELL)
            return i;
    return MAXSPELL;
}

// src/spell.c:715 getspell() — choose a spell to cast.
//
// Only the MENU_TRADITIONAL arm is ported, which is the one the recorded
// sessions take: seed0501 sends 'Z' then 'a'. It builds the letter range into
// the prompt, so a hero with three spells is asked "[a-c *?]" and one with a
// single spell "[a *?]" -- the text differs per hero and is on screen.
//
// The retry_limit of 10 is C's, and "That's enough tries." is a real message
// that ends the loop; '*' or '?' would break out to the menu, which is not
// ported.
export async function getspell(spell_noRef) {
    const nspells = num_spells();

    if (!nspells) {
        await You("don't know any spells right now.");
        return false;
    }
    if (rejectcasting())
        return false;

    let lets;
    if (nspells === 1) lets = 'a';
    else if (nspells < 27) lets = 'a-' + String.fromCharCode(96 + nspells);
    else if (nspells === 27) lets = 'a-zA';
    else lets = 'a-zA-' + String.fromCharCode(64 + nspells - 26);

    const qbuf = `Cast which spell? [${lets} *?]`;

    for (let retry_limit = 0; ; ++retry_limit) {
        if (retry_limit === 10) {
            await pline("That's enough tries.");
            return false;
        }
        const ilet = await tty_yn_function(qbuf, null, '\0');
        if (ilet === '*' || ilet === '?') {
            note_unported_spell('getspell:dospellmenu');
            return false;
        }
        if (quitchars.includes(ilet)) {
            await pline('Never mind.');
            return false;
        }
        const idx = spell_let_to_idx(ilet);
        if (idx < 0 || idx >= nspells) {
            await You("don't know that spell.");
            continue;                   /* ask again */
        }
        spell_noRef.v = idx;
        return true;
    }
}

// src/spell.c docast() — the 'Z' command.
export async function docast() {
    const ref = { v: 0 };
    if (await getspell(ref)) {
        /* cmdq_add_key(CQ_REPEAT, spellet(spell_no)) is the repeat queue */
        return await spelleffects(game.spl_book[ref.v].sp_id, false, false);
    }
    return ECMD_FAIL;
}

// src/spell.c spelleffects() — cast it. Only the pre-flight check is ported;
// the effects themselves are a per-spell dispatch that needs zap/potion/etc.
export async function spelleffects(spell_otyp, atme, force) {
    const spell = spell_idx(spell_otyp);
    const energy = { v: 0 };

    if (!force) {
        const r = await spelleffects_check(spell, energy);
        if (r.rejected)
            return r.res;
    }

    game.u.uen -= energy.v;
    exercise(A_WIS, true);

    /* pseudo = mksobj(spellid(spell), FALSE, FALSE) — a throwaway object
       carrying the spell's stats, which the per-spell dispatch below reads.
       mksobj DRAWS, so it is made here rather than skipped with the switch. */
    const pseudo = mksobj(force ? spell : spellid(spell), false, false);
    pseudo.blessed = pseudo.cursed = 0;
    pseudo.quan = 20;                   /* do not let useup get it */

    /* the per-spell switch needs zap/potion/dig and the rest of the effect
       code; every arm of it draws. */
    note_unported_spell('spelleffects:per-spell dispatch');
    return ECMD_TIME;
}

// src/spell.c spell_idx() — the slot holding this spell type.
function spell_idx(spell_otyp) {
    for (let i = 0; i < MAXSPELL; i++) {
        if (spellid(i) === spell_otyp)
            return i;
        if (spellid(i) === NO_SPELL)
            break;
    }
    return -1;
}

// include/spell.h MAXSPELL, src/decl.c quitchars
const MAXSPELL = 52;   /* include/decl.h spl_book[MAXSPELL + 1] */
const quitchars = ' \r\n\x1b';

// src/spell.c:17 KEEN, include/spell.h:36 SPELL_LEV_PW
const KEEN = 20000;
export const SPELL_LEV_PW = (lvl) => lvl * 5;

// include/spell.h:33 spellknow()
function spellknow(spidx) {
    return game.spl_book?.[spidx]?.sp_know ?? 0;
}

// src/spell.c:1220 spelleffects_check() — everything that can stop a cast
// before it happens. Returns TRUE when the cast is rejected.
//
// The DRAW is the last line: `rnd(100) > percent_success(spell)`. Everything
// above it is a gate, and two of those gates draw too -- rnd(*energy) when the
// hero's knowledge of the spell has run out, and rnd(2 * *energy) when the
// Amulet drains them.
//
// Returns { rejected, res, energy } because C uses two out-parameters.
export async function spelleffects_check(spell, energyRef) {
    let res = ECMD_OK;
    const confused = Confusion();

    energyRef.v = 0;

    if (spell === UNKNOWN_SPELL) {
        return { rejected: true, res: ECMD_OK };
    }
    /* rejectcasting() covers Stunned and having no free hands */
    if (rejectcasting()) {
        return { rejected: true, res: ECMD_OK };
    }

    energyRef.v = SPELL_LEV_PW(spellev(spell));   /* 5 <= energy <= 35 */

    if (spellknow(spell) <= 0) {
        await Your('knowledge of this spell is twisted.');
        await pline('It invokes nightmarish images in your mind...');
        note_unported_spell('spell_backfire');
        game.u.uen -= rnd(energyRef.v);
        if (game.u.uen < 0) game.u.uen = 0;
        return { rejected: true, res: ECMD_TIME };
    } else if (spellknow(spell) <= KEEN / 200) {
        await You('strain to recall the spell.');
    } else if (spellknow(spell) <= KEEN / 40) {
        await You('have difficulty remembering the spell.');
    } else if (spellknow(spell) <= KEEN / 20) {
        await Your('knowledge of this spell is growing faint.');
    } else if (spellknow(spell) <= KEEN / 10) {
        await Your('recall of this spell is gradually fading.');
    }

    if (game.u.uhunger <= 10 && spellid(spell) !== ONAMES.SPE_DETECT_FOOD) {
        await You('are too hungry to cast that spell.');
        return { rejected: true, res: ECMD_OK };
    } else if (ACURR(A_STR) < 4 && spellid(spell) !== ONAMES.SPE_RESTORE_ABILITY) {
        await You('lack the strength to cast spells.');
        return { rejected: true, res: ECMD_OK };
    }
    /* check_capacity() needs the encumbrance message plumbing; it draws
       nothing and only fires when the hero is carrying near their limit. */

    if (game.u.uhave?.amulet && game.u.uen >= energyRef.v) {
        await You_feel('the amulet draining your energy away.');
        game.u.uen -= rnd(2 * energyRef.v);
        if (game.u.uen < 0) game.u.uen = 0;
        res = ECMD_TIME;                /* time is used even if the cast fails */
    }

    if (energyRef.v > game.u.uen) {
        await You("don't have enough energy to cast that spell"
                  + ((game.u.uen < game.u.uenmax) ? ''
                     : (energyRef.v > (game.u.uenpeak ?? 0)) ? ' yet'
                     : ' anymore') + '.');
        return { rejected: true, res };
    }

    if (spellid(spell) !== ONAMES.SPE_DETECT_FOOD) {
        let hungr = energyRef.v * 2;

        /* a Wizard's Intelligence reduces the hunger cost */
        let intell = acurr(A_INT);
        if (!Role_if(PMNAMES.PM_WIZARD))
            intell = 10;
        if (intell >= 17)
            hungr = 0;
        else if (intell === 16)
            hungr = Math.trunc(hungr / 4);
        else if (intell === 15)
            hungr = Math.trunc(hungr / 2);

        /* do not put the hero quite into fainting */
        if (hungr > game.u.uhunger - 3)
            hungr = game.u.uhunger - 3;
        morehungry(hungr);
    }

    const chance = percent_success(spell);
    if (confused || (rnd(100) > chance)) {
        await You('fail to cast the spell correctly.');
        game.u.uen -= Math.trunc(energyRef.v / 2);
        return { rejected: true, res: ECMD_TIME };
    }
    return { rejected: false, res };
}

// src/spell.c rejectcasting() — Stunned, or no free hands.
function rejectcasting() {
    if (Stunned()) {
        note_unported_spell('rejectcasting:Stunned message');
        return true;
    }
    /* the no-free-hands arm needs cantwield/welded on the hero's weapon */
    return false;
}

// include/spell.h:9 UNKNOWN_SPELL — MINUS ONE. Written as 0 here first,
// which made spell index 0 (the first known spell) look unknown and made
// spelleffects_check reject every cast on its opening line.
const UNKNOWN_SPELL = -1;

function note_unported_spell(what) {
    (game.unported ||= new Set()).add(what);
}

// src/spell.c:106 — the metal-armour penalties. Not role-specific: headgear,
// gauntlets and footwear interfere with anyone.
const uarmhbon = 4;    /* metal helmets interfere with the mind */
const uarmgbon = 6;    /* casting channels through the hands */
const uarmfbon = 2;    /* all metal interferes to some degree */

// src/spell.c:2173 percent_success() — the hero's chance of casting `spell`.
//
// Draws nothing, and every term matters because the single visible draw is
// `rnd(100) > percent_success(spell)` in spelleffects_check.
//
// Two halves: splcaster is intrinsic ability (role base plus armour
// penalties, capped at 20), and chance is learned ability (the casting stat,
// adjusted by how far the hero's level and skill are from the spell's). They
// are combined at the end, and a heavy shield divides the learned half.
export function percent_success(spell) {
    let chance, splcaster, special, statused, difficulty, skill;
    const skilltype = spell_skilltype(spellid(spell));
    /* Knights get no metal-armour penalty for clerical spells */
    const paladin_bonus = Role_if(PMNAMES.PM_KNIGHT)
                          && skilltype === P_CLERIC_SPELL;

    const uarm = worn(W_ARM), uarmc = worn(W_ARMC), uarms = worn(W_ARMS);
    const uarmh = worn(W_ARMH), uarmg = worn(W_ARMG), uarmf = worn(W_ARMF);
    const uwep = worn(W_WEP);

    splcaster = game.urole.spelbase;
    special = game.urole.spelheal;
    statused = ACURR(game.urole.spelstat);

    if (uarm && is_metallic(uarm) && !paladin_bonus)
        splcaster += (uarmc && uarmc.otyp === ONAMES.ROBE)
                     ? Math.trunc(game.urole.spelarmr / 2) : game.urole.spelarmr;
    else if (uarmc && uarmc.otyp === ONAMES.ROBE)
        splcaster -= game.urole.spelarmr;
    if (uarms)
        splcaster += game.urole.spelshld;

    if (uwep && uwep.otyp === ONAMES.QUARTERSTAFF)
        splcaster -= 3;                 /* small bonus */

    if (!paladin_bonus) {
        if (uarmh && is_metallic(uarmh)) splcaster += uarmhbon;
        if (uarmg && is_metallic(uarmg)) splcaster += uarmgbon;
        if (uarmf && is_metallic(uarmf)) splcaster += uarmfbon;
    }

    if (spellid(spell) === game.urole.spelspec)
        splcaster += game.urole.spelsbon;

    /* `healing spell' bonus */
    const sid = spellid(spell);
    if (sid === ONAMES.SPE_HEALING || sid === ONAMES.SPE_EXTRA_HEALING
        || sid === ONAMES.SPE_CURE_BLINDNESS || sid === ONAMES.SPE_CURE_SICKNESS
        || sid === ONAMES.SPE_RESTORE_ABILITY || sid === ONAMES.SPE_REMOVE_CURSE)
        splcaster += special;

    if (splcaster > 20)
        splcaster = 20;

    /* learned ability, from the casting stat */
    chance = Math.trunc(11 * statused / 2);

    skill = P_SKILL(skilltype);
    skill = Math.max(skill, P_UNSKILLED) - 1;   /* unskilled => 0 */
    difficulty = (spellev(spell) - 1) * 4
                 - ((skill * 6) + Math.trunc(game.u.ulevel / 3) + 1);

    if (difficulty > 0) {
        /* too low level or unskilled */
        chance -= isqrt(900 * difficulty + 2000);
    } else {
        /* above level; diminishing returns for low-level spells */
        const learning = Math.trunc(15 * -difficulty / spellev(spell));
        chance += learning > 20 ? 20 : learning;
    }

    if (chance < 0) chance = 0;
    if (chance > 120) chance = 120;

    /* anything but a light shield makes casting very awkward */
    if (uarms && weight(uarms) > game.objects[ONAMES.SMALL_SHIELD].oc_weight) {
        if (spellid(spell) === game.urole.spelspec)
            chance = Math.trunc(chance / 2);
        else
            chance = Math.trunc(chance / 4);
    }

    chance = Math.trunc(chance * (20 - splcaster) / 15) - splcaster;

    if (chance > 100) chance = 100;
    if (chance < 0) chance = 0;
    return chance;
}

// include/skills.h:115 P_SKILL()
const P_SKILL = (type) => game.u.weapon_skills?.[type]?.skill ?? P_ISRESTRICTED;

// src/role.c Role_if()
const Role_if = (pm) => game.urole?.malenum === pm || game.urole?.mnum === pm;

// src/spell.c:2024 dovspell() — '+', list known spells.
// Only the "no spells" path is ported; the menu path lands with the tty menu
// system. A Tourist starts with no spells, which is the case seed8000 hits.
export async function dovspell() {
    if (spellid(0) === NO_SPELL) {
        await pline("You don't know any spells right now.");
    }
    return ECMD_OK;
}
