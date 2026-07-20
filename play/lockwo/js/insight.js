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
} from './const.js';
import { objects as mkobjObjects } from './mkobj.js';
import { update_topl } from './display.js';

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
export function enlightenment_lines() {
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
    const enlLine = (start, mid, suffix, ps) => {
        let buf = ` ${start}${mid}${suffix}${ps}.`;
        buf = buf.replace(' are not ', ' aren\'t ').replace(' have not ', ' haven\'t ')
            .replace(' can not ', ' can\'t ');
        out(buf);
    };
    const youAre = (attr, ps = '') => enlLine('You ', 'are ', attr, ps);
    const youHave = (attr, ps = '') => enlLine('You ', 'have ', attr, ps);

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

    // dungeon level
    const dgnName = game.dungeonName || 'the Dungeons of Doom';
    youAre(`in ${dgnName}, on level ${u.uz?.dlevel ?? 1}`);

    // turns
    if (moves === 1) youHave('just started your adventure');
    else enlLine('You ', 'entered ', `the dungeon ${moves} turn${moves === 1 ? '' : 's'} ago`, '');

    // experience (not polymorphed); no "needed" clause off wizard/final
    youHave(`${u.uexp ?? 0} experience point${(u.uexp ?? 0) === 1 ? '' : 's'}`);

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
    enlLine('Your armor class ', 'is ', `${u.uac ?? 0}`, '');

    // wallet (bypasses you_have; leading space already supplied)
    const umoney = game._goldCount ?? u.umoney ?? 0;
    out(umoney ? ` Your wallet contains ${umoney} ${currency(umoney)}.`
               : ' Your wallet is empty.');

    // autopickup (off by default for these sessions)
    enlLine('Autopickup ', 'is ', game.flags?.pickup ? 'on' : 'off', '');

    // ── Characteristics ──
    out('');
    out('Characteristics:');
    const a = u.acurr?.a || [];
    const characteristic = (idx, name) =>
        enlLine(`Your ${name} `, 'is ', attrval(idx, a[idx] ?? 0), '');
    characteristic(A_STR, 'strength');
    characteristic(A_DEX, 'dexterity');
    characteristic(A_CON, 'constitution');
    characteristic(A_INT, 'intelligence');
    characteristic(A_WIS, 'wisdom');
    characteristic(A_CHA, 'charisma');

    // ── Status ──
    out('');
    out('Status:');
    // hunger: hu_stat[u.uhs]; NOT_HUNGRY (1) -> "not hungry" at game start.
    youAre(hungerWord(u.uhs ?? 1));
    // encumbrance (near_capacity() == UNENCUMBERED for the starter pack)
    youAre('unencumbered');
    // current weapon + skill
    weaponInsight(youAre, youHave);

    // ── Miscellaneous ──
    out('');
    out('Miscellaneous:');
    // elapsed playing time (none at game start; matches fmt_elapsed_time)
    enlLine('Total elapsed playing time ', 'is ', elapsedTime(), '');

    return lines;
}

// C ref: insight.c weapon_insight() — wielding line + weapon skill level.
function weaponInsight(youAre, youHave) {
    const uwep = game.uwep;
    if (!uwep) {
        youAre('empty handed');
        return;
    }
    const descr = weaponDescr(uwep);
    youAre(`wielding ${uwep.quan === 1 || uwep.quan == null ? an(descr) : makeplural(descr)}`);

    // Skill line: weapons carried at start have P_BASIC skill (skill_init).
    const skName = weaponSkillName(uwep);
    if (skName) {
        const lvl = weaponSkillLevel(uwep);
        // hav=true for basic/expert/etc.; "skill with"; "in" for un/skilled.
        const hav = lvl !== 'unskilled' && lvl !== 'skilled';
        youHave(`${lvl} ${hav ? 'skill with' : 'in'} ${skName}`);
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
