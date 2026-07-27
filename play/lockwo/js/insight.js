// insight.js — the ^X / end-of-game enlightenment display.
//
// C ref: src/insight.c enlightenment() and its section helpers
// (background_enlightenment / basics_enlightenment /
// characteristics_enlightenment / status_enlightenment).  doattributes()
// invokes enlightenment(BASICENLIGHTENMENT, ENL_GAMEINPROGRESS) for normal
// play, so only the BASIC sections (no intrinsics) are shown; wizard/explore
// add MAGICENLIGHTENMENT, which is out of scope for the public sessions.
//
// This produces the exact lines the C build emits, formatted the way the tty
// menu window renders them: enlght_out() lines have no leading space (the menu
// adds one selector column), while enlght_line()/you_are()/you_have() lines
// already carry the leading space that C's `Sprintf(" %s%s%s%s.", …)` prepends.

import { game } from './gstate.js';
import { roles, align_gname } from './role.js';
import {
    A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA,
    A_LAWFUL, A_NEUTRAL, A_CHAOTIC,
    ROLE_MALE, ROLE_FEMALE, ROLE_GENDMASK,
    G_GONE, G_GENOD, G_EXTINCT,
    P_NONE, P_ISRESTRICTED, P_UNSKILLED, P_SKILLED, P_TWO_WEAPON_COMBAT,
    In_quest,
} from './const.js';
import { objects as mkobjObjects } from './mkobj.js';
import { p_skill_of } from './enhance.js';
import { update_topl } from './display.js';
import { phase_of_the_moon, friday_13th, night, NEW_MOON, FULL_MOON } from './calendar.js';
import { race_attrmax } from './u_init.js';
import { acurr_eff } from './attrib.js';
import { depth } from './hacklib.js';
import { newuexp } from './exper.js';
import { youHaveSearching } from './allmain.js';
import { Infravision } from './vision.js';

// C ref: botl.c get_strength_str — STR encoding (insight.c attrval()).
function attrval(attrindx, v) {
    if (attrindx !== A_STR || v <= 18) return String(v);
    if (v > 118) return String(v - 100);   // 19..25
    if (v < 118) return `18/${String(v - 18).padStart(2, '0')}`;
    return '18/**';                          // 18/100
}

// C ref: hacklib.c an() — indefinite article (sufficient for the role rank,
// dungeon and weapon strings reached here).
function an(s) {
    if (!s) return s;
    return /^[aeiou]/i.test(s) ? `an ${s}` : `a ${s}`;
}

function alignStr(t) {
    return t === A_LAWFUL ? 'lawful' : t === A_NEUTRAL ? 'neutral' : 'chaotic';
}

const GENDER_ADJ = ['male', 'female'];

// Build the enlightenment text lines.  Returns an array of strings (already
// containing their own leading-space prefixes; section headers have none).
// `final` mirrors C's enlightenment(mode, final): 0 = ENL_GAMEINPROGRESS (the
// live ^X command, present tense, BASIC sections only); ENL_GAMEOVERDEAD (2)
// = the end-of-game disclosure (past tense, plus the MAGICENLIGHTENMENT
// "Final Attributes:" section) -- the only non-zero value the covered
// sessions reach.
export function enlightenment_lines(final = 0) {
    const u = game.u || {};
    const rolemnum = game.urole?.mnum ?? u.umonnum ?? 9;
    const roleDef = roles.find((r) => r.mnum === rolemnum) || roles[rolemnum] || {};
    // align_gname()/godForAlign() index the roles[] ARRAY (not the PM_ mnum,
    // which differs for Rogue/Ranger), so resolve the array index here.
    const roleArrIdx = roles.findIndex((r) => r.mnum === rolemnum);
    const roleIdx = roleArrIdx >= 0 ? roleArrIdx : rolemnum;
    const female = !!game.flags?.female;
    const innategend = female ? 1 : 0;

    const plname = game.flags?.debug ? 'wizard' : (game.plname || 'Player');
    const titleName = capFirst(plname);
    const roleName = (female && roleDef.name?.f) ? roleDef.name.f : roleDef.name?.m || 'Adventurer';
    const rankName = game.urole?.rank?.m || roleDef.rank?.[0]?.m || roleName;
    const raceAdj = game.urace?.adj || game.urace?.noun || 'human';
    const raceNoun = game.urace?.noun || game.urace?.name || 'human';
    const aligntype = u.ualign?.type ?? A_NEUTRAL;
    const ulevel = u.ulevel ?? 1;
    const moves = game.moves ?? 1;

    const lines = [];
    const out = (s) => lines.push(s);          // enlght_out: header / raw line
    // enlght_line: " <start><mid><suffix><ps>." with not-contractions applied
    // (C ref: insight.c enlght_line()'s notwochars[] table -- both present-
    // and past-tense pairs, since `final` selects which verb enlLine() gets).
    const enlLine = (start, mid, suffix, ps) => {
        let buf = ` ${start}${mid}${suffix}${ps}.`;
        buf = buf.replace(' are not ', ' aren\'t ').replace(' were not ', ' weren\'t ')
            .replace(' have not ', ' haven\'t ').replace(' had not ', ' hadn\'t ')
            .replace(' can not ', ' can\'t ').replace(' could not ', ' couldn\'t ');
        out(buf);
    };
    const youAre = (attr, ps = '') => enlLine('You ', final ? 'were ' : 'are ', attr, ps);
    const youHave = (attr, ps = '') => enlLine('You ', final ? 'had ' : 'have ', attr, ps);

    // ── title ──
    // Headers/title are enlght_out() lines (no leading space); the tty menu
    // window supplies the single selector-column space when rendered.
    out(`${titleName} the ${roleName}'s attributes:`);

    // ── Background ──
    out('');
    out('Background:');

    // role + rank
    let gendpfx = '';
    if (!roleDef.name?.f
        && (((roleDef.allow ?? 0) & ROLE_GENDMASK) === (ROLE_MALE | ROLE_FEMALE)))
        gendpfx = `${GENDER_ADJ[innategend]} `;
    let roleBuf;
    if (rankName.toLowerCase() === roleName.toLowerCase())
        roleBuf = `${an(rankName)}, level ${ulevel} ${gendpfx}${raceNoun}`;
    else
        roleBuf = `${an(rankName)}, a level ${ulevel} ${gendpfx}${raceAdj} ${roleName}`;
    youAre(roleBuf);

    // alignment + pantheon (bypasses you_are to omit ending period)
    out(` You are ${alignStr(aligntype)}, on a mission for ${align_gname(roleIdx, aligntype)}`);
    let pan = ' who is opposed by';
    if (aligntype !== A_LAWFUL)
        pan += ` ${align_gname(roleIdx, A_LAWFUL)} (${alignStr(A_LAWFUL)}) and`;
    if (aligntype !== A_NEUTRAL)
        pan += ` ${align_gname(roleIdx, A_NEUTRAL)} (${alignStr(A_NEUTRAL)})${aligntype !== A_CHAOTIC ? ' and' : ''}`;
    if (aligntype !== A_CHAOTIC)
        pan += ` ${align_gname(roleIdx, A_CHAOTIC)} (${alignStr(A_CHAOTIC)})`;
    pan += '.';
    out(pan);

    // handedness (URIGHTY defaults TRUE)
    youAre(`${game.u?.uleft_handed ? 'left' : 'right'}-handed`);

    // dungeon level  (C ref: insight.c background_enlightenment)
    // The name comes from dungeons[u.uz.dnum].dname, with a leading "The "
    // downcased to "the "; the level number is depth(&u.uz) — the ledger depth
    // across branches, so e.g. Sokoban level 1 reads "level 2" — except within
    // the Quest, which shows the branch-relative dunlev.  (C's rogue /
    // very-big-room annotations are not exercised by the covered sessions.)
    const dnum = u.uz?.dnum ?? 0;
    let dgnName = game.dungeons?.[dnum]?.dname || 'The Dungeons of Doom';
    if (/^the /i.test(dgnName))
        dgnName = dgnName.charAt(0).toLowerCase() + dgnName.slice(1);
    const dgnLevel = In_quest(u.uz) ? (u.uz?.dlevel ?? 1) : depth(u.uz);
    youAre(`in ${dgnName}, on level ${dgnLevel}`);

    // turns
    if (moves === 1) youHave('just started your adventure');
    else enlLine('You ', 'entered ', `the dungeon ${moves} turn${moves === 1 ? '' : 's'} ago`, '');

    // ── other environmental factors ──  C ref: insight.c
    // background_enlightenment().  C tests midnight()/night() first (the
    // "midnight hour"/"nighttime" line); midnight() has no JS helper, so only
    // the nighttime line is modeled (a no-op for daytime sessions).  Then the
    // moon phase and Friday-the-13th status are reported, in that order, BEFORE
    // the experience-point line.
    if (night())
        enlLine('It ', final ? 'was ' : 'is ', 'nighttime', '');
    const moonphase = phase_of_the_moon();
    if (moonphase === FULL_MOON || moonphase === NEW_MOON) {
        // C: Sprintf(buf, "a %s moon in effect%s", ..., "") -> enl_msg("There ",
        // "is ", "was ", buf, "").  "in effect" (not "tonight") because the phase
        // is the start-of-session value, not necessarily the current real time.
        const which = (moonphase === FULL_MOON) ? 'full' : 'new';
        enlLine('There ', final ? 'was ' : 'is ', `a ${which} moon in effect`, '');
    }
    if (friday_13th()) {
        // C: enlght_out(" Bad things can happen on Friday the 13th.") — a raw
        // enlght_out() line (its own leading space, no trailing you-are period).
        out(' Bad things can happen on Friday the 13th.');
    }

    // experience (not polymorphed).  C ref: insight.c background_enlightenment —
    // for a sub-30 experience level, wizard mode (or the game-over 'final' pass)
    // appends how much more experience is needed to reach the next level.
    // doattributes() runs with final==0, so only the wizard branch applies here.
    const uexp = u.uexp ?? 0;
    const xlvl = u.ulevel ?? 1;
    let expbuf = `${uexp} experience point${uexp === 1 ? '' : 's'}`;
    if (xlvl < 30 && !!game.flags?.debug) {
        const delta = newuexp(xlvl) - uexp;
        expbuf += `, ${delta} ${uexp > 0 ? 'more ' : ''}`
            + `needed ${xlvl < 18 ? 'to attain' : 'for'} level ${xlvl + 1}`;
    }
    youHave(expbuf);

    // ── Basics ──
    out('');
    out('Basics:');
    const hp = Math.max(0, u.uhp ?? 0), hpmax = u.uhpmax ?? 0;
    if (hp === hpmax && hpmax > 1) youHave(`all ${hpmax} hit points`);
    else youHave(`${hp} out of ${hpmax} hit point${hpmax === 1 ? '' : 's'}`);

    const pw = u.uen ?? 0, pwmax = u.uenmax ?? 0;
    const Power = 'energy points (spell power)';
    if (pwmax === 0 || (pw === pwmax && pwmax === 2))
        youHave(`${!pwmax ? 'no' : 'both'} ${Power}`);
    else if (pw === pwmax && pwmax > 2) youHave(`all ${pwmax} ${Power}`);
    else youHave(`${pw} out of ${pwmax} ${Power}`);

    // armor class (enl_msg: "Your armor class " + "is " + value)
    enlLine('Your armor class ', final ? 'was ' : 'is ', `${u.uac ?? 0}`, '');

    // wallet (bypasses you_have; leading space already supplied)
    const umoney = game._goldCount ?? u.umoney ?? 0;
    out(umoney ? ` Your wallet contain${final ? 'ed' : 's'} ${umoney} ${currency(umoney)}.`
               : ` Your wallet ${final ? 'was' : 'is'} empty.`);

    // autopickup (off by default for these sessions)
    enlLine('Autopickup ', final ? 'was ' : 'is ', game.flags?.pickup ? 'on' : 'off', '');

    // ── Characteristics ──
    // C ref: insight.c one_characteristic() — the value plus, when the innate
    // value is worth showing (not polymorphed / no relevant cursed item, all out
    // of scope for BASIC play here), a parenthetical noting base/peak (when the
    // effective value differs from the stored base or the peak) and the race
    // limit (when it differs from the human default: 18, or STR18(100) for STR).
    // acurrent = ACURR (effective), abase = ABASE (u.acurr.a), apeak = AMAX
    // (u.amax.a), alimit = ATTRMAX = race attrmax.
    out('');
    out(final ? 'Final Characteristics:' : 'Characteristics:');
    const abaseArr = u.acurr?.a || [];
    const apeakArr = u.amax?.a || [];
    const limitArr = race_attrmax();
    const characteristic = (idx, name) => {
        const acurrent = acurr_eff(idx);
        const abase = abaseArr[idx] ?? acurrent;
        const apeak = apeakArr[idx] ?? abase;
        const alimit = limitArr[idx] ?? 18;
        // C ref: one_characteristic() — interesting_alimit is TRUE unconditionally
        // in final disclosure (it was originally `abase != alimit`); only the
        // in-progress path restricts it to a non-default race limit.
        const interesting = final
            ? true
            : alimit !== (idx !== A_STR ? 18 : 118 /* STR18(100) */);
        let valubuf = attrval(idx, acurrent);
        let paren = final ? ' (' : ' (current; ';
        if (acurrent !== abase) {
            valubuf += `${paren}base:${attrval(idx, abase)}`;
            paren = ', ';
        }
        if (abase !== apeak) {
            valubuf += `${paren}peak:${attrval(idx, apeak)}`;
            paren = ', ';
        }
        if (interesting)
            valubuf += `${paren}${acurrent > alimit ? 'innate ' : ''}limit:${attrval(idx, alimit)}`;
        if (acurrent !== abase || abase !== apeak || interesting)
            valubuf += ')';
        enlLine(`Your ${name} `, final ? 'was ' : 'is ', valubuf, '');
    };
    characteristic(A_STR, 'strength');
    characteristic(A_DEX, 'dexterity');
    characteristic(A_CON, 'constitution');
    characteristic(A_INT, 'intelligence');
    characteristic(A_WIS, 'wisdom');
    characteristic(A_CHA, 'charisma');

    // ── Status ──
    out('');
    out(final ? 'Final Status:' : 'Status:');
    // hunger: hu_stat[u.uhs]; NOT_HUNGRY (1) -> "not hungry" at game start.
    youAre(hungerWord(u.uhs ?? 1));
    // encumbrance (near_capacity() == UNENCUMBERED for the starter pack)
    youAre('unencumbered');
    // current weapon + skill
    weaponInsight(youAre, youHave, enlLine);
    // C ref: status_enlightenment() tail — "report 'nudity'": no armor worn at
    // all (the covered heroes never have uroleplay.nudist set).
    if (!game.uarm && !game.uarmu && !game.uarmc && !game.uarms
        && !game.uarmg && !game.uarmf && !game.uarmh)
        youAre('not wearing any armor');

    // ── Attributes (MAGICENLIGHTENMENT) ──  C ref: attributes_enlightenment().
    // Only reached at end-of-game disclosure (final) for the covered sessions;
    // limited to what the covered heroes can actually have: alignment piety,
    // role-granted Searching, racial Infravision, and the mortality line.
    if (final) {
        out('');
        out('Final Attributes:');
        const pio = piousness(u.ualign?.record ?? 0);
        if ((u.ualign?.record ?? 0) >= 0) youAre(pio);
        else youHave(pio);
        if (youHaveSearching()) youHave('automatic searching');
        if (Infravision()) youHave('infravision');
        // C ref: enlightenment() tail — "have been killed .../are dead" via
        // u.umortality; the covered death path always has umortality === 1.
        out(' You are dead.');
    }

    // ── Miscellaneous ──
    out('');
    out('Miscellaneous:');
    // C ref: enlightenment() — bones-level reminder, shown for BASIC mode in
    // wizard/explore/final; flags.bones defaults on and no session has visited
    // a bones level yet, so this is always the "didn't encounter any" form.
    if (final) {
        if (game.flags?.bones === false)
            youHave('disabled loading and storing of bones levels');
        else if (!u.numbones)
            enlLine('You ', final ? 'didn\'t encounter' : 'haven\'t encountered', ' any bones levels', '');
        else
            youHave(`encountered ${u.numbones} bones level${u.numbones === 1 ? '' : 's'}`);
    }
    // elapsed playing time (none at game start; matches fmt_elapsed_time)
    enlLine('Total elapsed playing time ', final ? 'was ' : 'is ', elapsedTime(), '');

    return lines;
}

// C ref: insight.c piousness(showneg, suffix) — alignment-piety adjective
// ("aligned" suffix), used by attributes_enlightenment().  showneg is TRUE
// there, but the covered heroes' record is always non-negative.
function piousness(record) {
    let pio;
    if (record >= 20) pio = 'piously';
    else if (record > 13) pio = 'devoutly';
    else if (record > 8) pio = 'fervently';
    else if (record > 3) pio = 'stridently';
    else if (record === 3) pio = '';
    else if (record > 0) pio = 'haltingly';
    else if (record === 0) pio = 'nominally';
    else if (record >= -3) pio = 'strayed';
    else if (record >= -8) pio = 'sinned';
    else pio = 'transgressed';
    if (record >= 0) return record === 3 ? 'aligned' : `${pio} aligned`;
    return pio;
}

// C ref: wield.c empty_handed() — how a weaponless hero is described: gloves
// imply hands so "empty handed"; a gloveless humanoid is "bare handed";
// otherwise (paws / no hands from an exotic polyform, never reached here) "not
// wielding anything".
function empty_handed() {
    if (game.uarmg) return 'empty handed';
    // The starter heroes are humanoid (only an exotic polyself would not be).
    return 'bare handed';
}

// C ref: weapon.c is a Monk-only discipline — martial arts is the only role
// that trains P_MARTIAL_ARTS, so the bare-handed skill reads "martial arts" for
// a Monk and "bare handed combat" for everyone else.
function isMartialArtsRole() {
    const rn = (game.urole?.name?.m || '').toLowerCase();
    return rn === 'monk';
}

// C ref: weapon.c skill_level_name() lower-cased — proficiency-level word.
const SKILL_LVL_NAME = {
    1: 'unskilled', 2: 'basic', 3: 'skilled', 4: 'expert',
    5: 'master', 6: 'grand master',
};
function skillLevelNameLc(lvl) { return SKILL_LVL_NAME[lvl] || 'unknown'; }

// C ref: insight.c weapon_insight() — wielding line + weapon skill level.
function weaponInsight(youAre, youHave, enlLine) {
    const uwep = game.uwep;
    if (!uwep) {
        // C: you_are(empty_handed(), "").
        youAre(empty_handed());
        // C: weapon_type(0) == P_BARE_HANDED_COMBAT, always reported.  At game
        // start no modeled non-Monk role has trained it, so the level is
        // P_UNSKILLED -> "unskilled in <skill>" via you_are (hav == false).  The
        // "and can enhance that" clause needs skill-practice tracking (can
        // advance is false for a fresh hero), so it's omitted here.
        const skName = isMartialArtsRole() ? 'martial arts' : 'bare handed combat';
        youAre(`unskilled in ${skName}`);
        return;
    }

    // C ref: insight.c weapon_insight() — while dual-wielding, a single
    // "wielding two weapons at once" line replaces the "wielding a <weapon>".
    if (game.u?.twoweap) {
        youAre('wielding two weapons at once');
    } else {
        const descr = weaponDescr(uwep);
        youAre(`wielding ${uwep.quan === 1 || uwep.quan == null ? an(descr) : makeplural(descr)}`);
    }

    // Skill line: weapons carried at start have P_BASIC skill (skill_init).
    const skName = weaponSkillName(uwep);
    if (!skName) return;

    if (!game.u?.twoweap) {
        const lvl = weaponSkillLevel(uwep);
        // hav=true for basic/expert/etc.; "skill with"; "in" for un/skilled.
        const hav = lvl !== 'unskilled' && lvl !== 'skilled';
        youHave(`${lvl} ${hav ? 'skill with' : 'in'} ${skName}`);
        return;
    }

    // C ref: insight.c weapon_insight() two-weapon block — compare the primary
    // and secondary weapon skills against the two-weapon-combat skill; whichever
    // is weaker limits the pair.  (The "and can enhance ..." advice needs skill-
    // slot tracking, which is 0 for the fresh-hero state we model, so the
    // can_advance() lines are omitted, consistent with the non-twoweap path.)
    const wtype = weapon_type(uwep);
    const uswapwep = game.uswapwep;
    const wtype2 = uswapwep ? weapon_type(uswapwep) : P_NONE;
    const sklvl = p_skill_of(wtype);
    const sklvl2 = uswapwep ? p_skill_of(wtype2) : P_ISRESTRICTED;
    let twoskl = p_skill_of(P_TWO_WEAPON_COMBAT);
    let twobuf;
    if (twoskl === P_ISRESTRICTED) { twoskl = P_UNSKILLED; twobuf = 'restricted'; }
    else twobuf = skillLevelNameLc(twoskl);
    const hav = (sklvl !== P_UNSKILLED && sklvl !== P_SKILLED);
    const hav2 = (sklvl2 !== P_UNSKILLED && sklvl2 !== P_SKILLED);
    const sklvlbuf = (sklvl === P_ISRESTRICTED) ? 'no' : skillLevelNameLc(sklvl);

    let buf = `${sklvlbuf} ${hav ? 'skill with' : 'in'} ${skName}`;
    let pfx = '', sfx = '', also = '', also2 = '', also3 = false;
    if (twoskl < sklvl) {
        pfx = `Your skill in ${skName} `;
        sfx = ` limited by being ${twobuf} with two weapons`;
        also = 'also ';
    } else if (twoskl > sklvl) {
        pfx = 'Your two weapon skill ';
        sfx = ' limited by ';
        sfx += (sklvl > P_ISRESTRICTED) ? `being ${sklvlbuf}` : 'having no skill';
        sfx += ` with ${skName}`;
        also2 = 'also ';
    } else {
        buf += ' and two weapons';
        also3 = true;
    }
    if (pfx) enlLine(pfx, 'is', sfx, '');
    else if (hav) youHave(buf);
    else youAre(buf);

    // Skip the secondary comparison when it is identical to the primary one.
    if (wtype2 !== wtype) {
        const skName2 = weaponSkillName(uswapwep) || 'no skill';
        const sklvlbuf2 = skillLevelNameLc(sklvl2);
        let verb = 'is';
        pfx = ''; sfx = ''; buf = '';
        if (twoskl < sklvl2) {
            pfx = `Your skill in ${skName2} `;
            sfx = ` ${also}limited by being ${twobuf} with two weapons`;
        } else if (twoskl > sklvl2) {
            pfx = 'Your two weapon skill ';
            sfx = ` ${also2}limited by `;
            sfx += (sklvl2 > P_ISRESTRICTED) ? `being ${sklvlbuf2}` : 'having no skill';
            sfx += ` with ${skName2}`;
        } else {
            buf = `${sklvlbuf2} ${hav2 ? 'skill with' : 'in'} ${skName2} and two weapons`;
            if (also3) {
                pfx = 'You also ';
                sfx = ` ${buf}`; buf = '';
                verb = hav2 ? 'have' : 'are';
            }
        }
        if (pfx) enlLine(pfx, verb, sfx, '');
        else if (hav2) youHave(buf);
        else youAre(buf);
    }
}

// C ref: weapon.c skill_name(weapon_type(obj)) — describe a weapon by its skill
// class name (a katana reads "long sword", a dagger "dagger").  weapon_type is
// |oc_skill| (ammo's skill is the negated launcher skill).  P_NAME() uses the
// representative object's name except for a few PN_* overrides (saber, hammer,
// polearms, whip).  C ref: weapon.c skill_names_indices/odd_skill_names.
const SKILL_NAME_BY_NUM = {
    1: 'dagger', 2: 'knife', 3: 'axe', 4: 'pick-axe', 5: 'short sword',
    6: 'broadsword', 7: 'long sword', 8: 'two-handed sword', 9: 'saber',
    10: 'club', 11: 'mace', 12: 'morning star', 13: 'flail', 14: 'hammer',
    15: 'quarterstaff', 16: 'polearms', 17: 'spear', 18: 'trident', 19: 'lance',
    20: 'bow', 21: 'sling', 22: 'crossbow', 23: 'dart', 24: 'shuriken',
    25: 'boomerang', 26: 'whip', 27: 'unicorn horn',
};
function weapon_type(obj) {
    const sk = mkobjObjects?.[obj.otyp]?.oc_skill ?? 0;
    return sk < 0 ? -sk : sk; // P_NONE (0) for non-weapons
}
function weaponDescr(obj) {
    return SKILL_NAME_BY_NUM[weapon_type(obj)] || obj.name || mkobjObjects?.[obj.otyp]?.name || 'weapon';
}
function weaponSkillName(obj) {
    return SKILL_NAME_BY_NUM[weapon_type(obj)] || null;
}
function weaponSkillLevel(_obj) {
    // skill_init sets P_BASIC for every weapon-type carried at game start.
    return 'basic';
}

function makeplural(s) {
    if (/(s|x|z|ch|sh)$/.test(s)) return `${s}es`;
    if (/[^aeiou]y$/.test(s)) return `${s.slice(0, -1)}ies`;
    return `${s}s`;
}

// C ref: eat.c hu_stat[] (lower-cased; "" -> "not hungry").
const HU_STAT = ['Satiated', '', 'Hungry', 'Weak', 'Fainting', 'Fainted', 'Starved'];
function hungerWord(uhs) {
    let buf = HU_STAT[uhs] || '';
    if (!buf) buf = 'not hungry';
    buf = buf.charAt(0).toLowerCase() + buf.slice(1);
    if (buf === 'weak') buf += ' from severe hunger';
    else if (buf.startsWith('faint')) buf += ' due to starvation';
    return buf;
}

// C ref: hacklib.c — currency() pluralisation.
function currency(n) { return n === 1 ? 'zorkmid' : 'zorkmids'; }

// C ref: insight.c fmt_elapsed_time — "none" before any real_time accrues.
function elapsedTime() { return 'none'; }

function capFirst(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

// C ref: insight.c list_genocided(defquery, ask) — the #genocided command.
// For a game with no genocided or extinct species, C's non-final branch just
// prints "No creatures have been genocided." (the #genocided form passes
// genoing == FALSE so there is no " yet" suffix).  The full genocided/extinct
// species menu is only reachable after a genocide, which the covered sessions
// never perform.
function anyGenocidedOrExtinct() {
    const mv = game.mvitals;
    if (!mv) return false;
    for (let i = 0; i < mv.length; i++) {
        if (mv[i] && (mv[i].mvflags & G_GONE)) return true;
    }
    return false;
}

// C ref: insight.c dogenocided() — the M-g / #genocided command.
export async function dogenocided() {
    if (!anyGenocidedOrExtinct()) {
        await update_topl('No creatures have been genocided.');
        return 0; // ECMD_OK
    }
    // The genocided/extinct species menu is unreached by the covered sessions.
    await update_topl('No creatures have been genocided.');
    return 0;
}
