// insight.js — the ^X attributes window.
// C ref: src/insight.c
//
// enlightenment() builds a menu whose lines are all produced by enlght_line():
//
//     Sprintf(buf, " %s%s%s%s.", start, middle, end, ps);
//
// One leading space, one trailing period, then six two-word contractions are
// applied (" are not " -> " aren't " and friends). The menu layer adds a second
// leading space, which is why body lines are indented two and headings one.
//
// Only the branches a level-1 hero on dlvl 1 reaches are ported. Everything
// else records itself through note_unported() rather than guessing, because a
// spurious line shifts every row below it and costs the whole frame.

import { game } from './gstate.js';
import { P_NONE, P_UNSKILLED, P_SKILLED, P_ISRESTRICTED, FULL_MOON, NEW_MOON, WEAK } from './const.js';
import { makeplural } from './objnam.js';
import { weapon_descr, weapon_type, skill_name, skill_level_name, P_SKILL, can_advance } from './weapon.js';
import { empty_handed, is_ammo } from './wield.js';
import { magic_negation } from './mhitu.js';

function note_unported_insight(what) {
    (game.unported ||= new Set()).add('insight:' + what);
}
import { depth } from './dungeon.js';
import { aligns } from './role_data.js';
import { A_MAX } from './attrib.js';
import { rank_of } from './botl.js';
import { money_cnt } from './invent.js';
import { pline } from './display.js';
import { Fast, Very_fast } from './attrib.js';

// include/attrib.h
const A_STR = 0, A_INT = 1, A_WIS = 2, A_DEX = 3, A_CON = 4, A_CHA = 5;
const attrname = ['strength', 'intelligence', 'wisdom',
                  'dexterity', 'constitution', 'charisma'];
// include/attrib.h:36 — STR18(x) is 18 + x, so a human's 118 cap IS STR18(100)
// and therefore not "interesting" enough to print.
const STR18 = (x) => 18 + x;

// include/you.h:441
const RIGHT_HANDED = 0x00;

const lines = [];
const out = (buf) => lines.push(buf);

// src/insight.c:135 enlght_line()
const CONTRACTIONS = [
    [' are not ', " aren't "], [' were not ', " weren't "],
    [' have not ', " haven't "], [' had not ', " hadn't "],
    [' can not ', " can't "], [' could not ', " couldn't "],
];
function enlght_line(start, middle, end, ps) {
    let buf = ` ${start}${middle}${end}${ps}.`;
    if (buf.includes(' not '))
        for (const [two, one] of CONTRACTIONS)
            buf = buf.split(two).join(one);
    out(buf);
}

// src/insight.c:105-108 — the enl_msg family. `final` is 0 for ^X, so the
// present-tense form is always the one used.
const enl_msg = (prefix, present, past, suffix, ps) =>
    enlght_line(prefix, present, suffix, ps);
const you_are = (attr, ps = '') => enl_msg('You ', 'are ', 'were ', attr, ps);
const you_have = (attr, ps = '') => enl_msg('You ', 'have ', 'had ', attr, ps);
const you_can = (attr, ps = '') => enl_msg('You ', 'can ', 'could ', attr, ps);

// src/hacklib.c an()
function an(s) {
    if (!s) return s;
    return ('aeiouAEIOU'.includes(s[0]) ? 'an ' : 'a ') + s;
}
const plur = (n) => (n === 1 ? '' : 's');
const highc = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;

// src/role.c align_str() / align_gname()
const align_str = (a) => a === 1 ? 'lawful' : a === 0 ? 'neutral'
                       : a === -1 ? 'chaotic' : 'unaligned';
function align_gname(a) {
    const r = game.roles?.[game.pantheon] ?? game.urole;
    const gnam = a === 1 ? r.lgod : a === 0 ? r.ngod : r.cgod;
    /* src/pray.c align_gname(): a leading '_' marks a name that already has
       its article ("_The Lady") and is stripped before display. */
    return gnam && gnam[0] === '_' ? gnam.slice(1) : gnam;
}
const u_gname = () => align_gname(game.u.ualign.type);

function note_unported(what) {
    (game.unported ||= new Set()).add(what);
}

// src/insight.c:280 background_enlightenment()
function background_enlightenment() {
    const u = game.u;
    const female = !!game.flags.female;
    const role_titl = (female && game.urole.name.f) ? game.urole.name.f
                                                    : game.urole.name.m;
    const rank_titl = rank_of(u.ulevel, game.urole, female);

    out('');
    out('Background:');

    /* "%s, a level %d %s%s %s" — an(rank), level, gender adj, race adj, role */
    let tmpbuf = '';
    if (!game.urole.name.f)
        tmpbuf = (female ? 'female' : 'male') + ' ';
    let buf;
    if (rank_titl.toLowerCase() === role_titl.toLowerCase())
        buf = `${an(rank_titl)}, level ${u.ulevel} ${tmpbuf}${game.urace.noun}`;
    else
        buf = `${an(rank_titl)}, a level ${u.ulevel} ${tmpbuf}`
            + `${game.urace.adj} ${role_titl}`;
    you_are(buf);

    /* bypasses you_are() so the sentence has no trailing period yet */
    out(` You are ${align_str(u.ualign.type)}, on a mission for ${u_gname()}`);

    let opp = ' who is opposed by';
    if (u.ualign.type !== 1)
        opp += ` ${align_gname(1)} (${align_str(1)}) and`;
    if (u.ualign.type !== 0)
        opp += ` ${align_gname(0)} (${align_str(0)})`
             + ((u.ualign.type !== -1) ? ' and' : '');
    if (u.ualign.type !== -1)
        opp += ` ${align_gname(-1)} (${align_str(-1)})`;
    out(opp + '.');

    you_are((u.uhandedness === RIGHT_HANDED) ? 'right-handed' : 'left-handed');

    /* "in %s, on %s" — dungeon name with a leading "The " stripped */
    /* src/insight.c:152 — a leading "The " is LOWERCASED, not stripped, so
       the sentence reads "in the Dungeons of Doom". */
    let dgnbuf = game.dungeons[u.uz.dnum].dname;
    if (/^the /i.test(dgnbuf))
        dgnbuf = dgnbuf[0].toLowerCase() + dgnbuf.slice(1);
    you_are(`in ${dgnbuf}, on level ${depth(u.uz)}`);

    if (game.moves === 1)
        you_have('just started your adventure');
    else
        enlght_line('You ', 'entered ',
                    `the dungeon ${game.moves} turn${plur(game.moves)} ago`, '');

    /* src/insight.c:645 — the midnight/nighttime arms need the wall clock
       (night(), midnight()); the recorded panels carry neither line. */

    /* src/insight.c:653 — "other environmental factors" */
    if (game.flags.moonphase === FULL_MOON
        || game.flags.moonphase === NEW_MOON) {
        enl_msg('There ', 'is ', 'was ',
                `a ${game.flags.moonphase === FULL_MOON ? 'full' : 'new'}`
                + ' moon in effect', '');
    }
    if (game.flags.friday13)
        out(' Bad things can happen on Friday the 13th.');

    you_have(`${u.uexp | 0} experience point${plur(u.uexp | 0)}`);
}

// src/insight.c:600 basics_enlightenment()
function basics_enlightenment() {
    const u = game.u;
    const Power = 'energy points (spell power)';

    out('');
    out('Basics:');

    const hp = Math.max(0, u.uhp), hpmax = u.uhpmax;
    you_have(hp === hpmax && hpmax > 1
             ? `all ${hpmax} hit points`
             : `${hp} out of ${hpmax} hit point${plur(hpmax)}`);

    const pw = u.uen, pwmax = u.uenmax;
    you_have((pwmax === 0 || (pw === pwmax && pwmax === 2))
             ? `${!pwmax ? 'no' : 'both'} ${Power}`      /* not "all 2" */
             : (pw === pwmax && pwmax > 2)
               ? `all ${pwmax} ${Power}`
               : `${pw} out of ${pwmax} ${Power}`);

    enl_msg('Your armor class ', 'is ', 'was ', `${u.uac}`, '');

    /* src/insight.c:781 — money_cnt(gi.invent), the live count, not the
       starting umoney0 snapshot; hidden_gold (containers) is recorded. */
    const money = money_cnt(game.invent);
    out(money ? ` Your wallet contains ${money} zorkmid${plur(money)}`
              : ' Your wallet is empty');
    /* C terminates that line here when nothing follows it */
    lines[lines.length - 1] += '.';

    enl_msg('Autopickup ', 'is ', 'was ',
            game.flags.autopickup ? 'on' : 'off', '');
}

// src/insight.c:770 one_characteristic()
/* src/insight.c:287 attrval() — strength between 18 and 18/100 renders in
   the exceptional "18/xx" notation; 19..25 shed the +100 encoding. */
function attrval(attrindx, attrvalue) {
    if (attrindx !== A_STR || attrvalue <= 18)
        return `${attrvalue}`;
    if (attrvalue > STR18(100)) /* 19 to 25 */
        return `${attrvalue - 100}`;
    return `18/${String(attrvalue - 18).padStart(2, '0')}`;
}

function one_characteristic(attrindx) {
    const acurrent = game.u.acurr.a[attrindx];
    const abase = acurrent, apeak = game.u.amax.a[attrindx];
    const alimit = game.urace.attrmax[attrindx];
    let valubuf = attrval(attrindx, acurrent);

    const interesting_alimit =
        (alimit !== (attrindx !== A_STR ? 18 : STR18(100)));
    let paren_pfx = ' (current; ';
    if (acurrent !== abase) {
        valubuf += `${paren_pfx}base:${attrval(attrindx, abase)}`;
        paren_pfx = ', ';
    }
    if (abase !== apeak) {
        valubuf += `${paren_pfx}peak:${attrval(attrindx, apeak)}`;
        paren_pfx = ', ';
    }
    if (interesting_alimit) {
        valubuf += `${paren_pfx}${acurrent > alimit ? 'innate ' : ''}`
                 + `limit:${attrval(attrindx, alimit)}`;
    }
    if (acurrent !== abase || abase !== apeak || interesting_alimit)
        valubuf += ')';

    enl_msg(`Your ${attrname[attrindx]} `, 'is ', 'was ', valubuf, '');
}

// src/insight.c:900 characteristics_enlightenment() — bottom-line order.
function characteristics_enlightenment() {
    out('');
    out('Characteristics:');
    for (const a of [A_STR, A_DEX, A_CON, A_INT, A_WIS, A_CHA])
        one_characteristic(a);
}

// src/insight.c:1180 status_enlightenment() — only the last-resort entries a
// fresh hero reaches.
function status_enlightenment() {
    out('');
    out('Status:');

    /* hunger: hu_stat[] is empty for the normal state, and C substitutes
       "not hungry", which the contraction turns into "aren't hungry" */
    you_are('not hungry');

    /* encumbrance: near_capacity() is UNENCUMBERED with a starting pack */
    you_are('unencumbered');

    /* src/insight.c:1270 weapon_insight() — the reachable arms: weaponless
       (empty_handed) or wielding a plain weapon described by its skill
       class. The twoweap arm and the shield-of-reflection / wet-towel
       overrides need state no recorded hero reaches yet. */
    if (!game.u.uwep) {
        you_are(empty_handed());
    } else if (game.u.twoweap) {
        you_are('wielding two weapons at once');
    } else {
        const what = weapon_descr(game.u.uwep);
        let buf;
        if (what === 'armor' || what === 'food' || what === 'venom')
            buf = `wielding some ${what}`;
        else
            buf = `wielding ${(game.u.uwep.quan === 1) ? an(what) : makeplural(what)}`;
        you_are(buf);
    }

    /*
     * Skill with current weapon (src/insight.c:1310).
     */
    {
        const wtype = weapon_type(game.u.uwep);
        if (wtype !== P_NONE && (!game.u.uwep || !is_ammo(game.u.uwep))) {
            const sklvl = P_SKILL(wtype);
            const hav = (sklvl !== P_UNSKILLED && sklvl !== P_SKILLED);
            const sklvlbuf = (sklvl === P_ISRESTRICTED)
                ? 'no' : skill_level_name(wtype).toLowerCase();
            /* "you have no/basic/expert skill with <skill>" or
               "you are unskilled/skilled in <skill>" */
            let buf = `${sklvlbuf} ${hav ? 'skill with' : 'in'} ${skill_name(wtype)}`;
            if (!game.u.twoweap) {
                if (can_advance(wtype, false))
                    buf += ' and can enhance that';
                if (hav)
                    you_have(buf);
                else
                    you_are(buf);
            } else {
                note_unported_insight('weapon_insight:twoweap_skill');
            }
        }
    }

    /* C reports 'nudity' when no armour slot is filled. A Tourist wears the
       Hawaiian shirt, so this must NOT fire — emitting it would push every
       following row down one and lose the frame. */
    if (!wearing_any_armor())
        you_are('not wearing any armor');
}

function wearing_any_armor() {
    return (game.invent || []).some(o => o.owornmask);
}

// src/insight.c:200 enlightenment() — returns the lines for the caller to put
// into a window.
export function enlightenment() {
    lines.length = 0;

    const tmpbuf = highc(game.plname || '');
    const female = !!game.flags.female;
    out(`${tmpbuf} the ${(female && game.urole.name.f) ? game.urole.name.f
                                                       : game.urole.name.m}'s attributes:`);

    background_enlightenment();
    basics_enlightenment();
    characteristics_enlightenment();
    status_enlightenment();

    /* src/insight.c:420 — the intrinsics section is shown for
       MAGICENLIGHTENMENT, which doattributes grants when wizard or
       discover; a plain-mode ^X stops at Status. */
    if (game.wizard || game.discover)
        attributes_enlightenment();

    out('');
    out('Miscellaneous:');
    /* src/insight.c:428 — wizard/discover reminder plus the bones tally */
    if (game.wizard || game.discover) {
        you_are(`running in ${game.wizard ? 'debug' : 'explore'} mode`);
        if (game.flags?.bones === false) {
            you_have('disabled loading of bones levels');
        } else if (!(game.u.uroleplay?.numbones)) {
            enl_msg('You ', "haven't encountered", "didn't encounter",
                    ' any bones levels', '');
        } else {
            note_unported_insight('enlightenment:bones_count');
        }
    }
    out(' Total elapsed playing time is none.');

    return lines.slice();
}

// src/insight.c:1487 attributes_enlightenment() — the "Attributes:" section.
//
// For a fresh un-polymorphed hero with no intrinsics almost every arm is
// silent; the piousness line and the can-pray tail are what show. The long
// resistance and sense blocks read property state this tree tracks in
// u.uprops; any set property whose line is not written here records itself.
function attributes_enlightenment() {
    const u = game.u;

    out('');
    out('Attributes:');

    if (u.uevent?.uhand_of_elbereth)
        note_unported_insight('attributes:hand_of_elbereth');

    const pio = piousness(true, 'aligned');
    if ((u.ualign?.record ?? 0) >= 0)
        you_are(pio);
    else
        you_have(pio);

    if (game.wizard)
        enl_msg('Your alignment ', 'is', 'was', ` ${u.ualign?.record ?? 0}`, '');

    /* resistances, senses, movement intrinsics: every arm keys on a
       property; a hero with any of them set needs the C line ported */
    for (const k of Object.keys(u.uprops || {}))
        if (u.uprops[k] && (u.uprops[k].intrinsic || u.uprops[k].extrinsic))
            note_unported_insight(`attributes:prop:${k}`);

    /* src/insight.c:1799 — the magic cancellation factor from worn armor:
       "warded" / "guarded" / "protected" for mc 1..3 */
    const armpro = magic_negation(null);
    if (armpro > 0) {
        const mc_types = ['', 'warded', 'guarded', 'protected'];
        you_are(mc_types[Math.min(armpro, 3)]);
    }

    if (u.ugangr) {
        note_unported_insight('attributes:ugangr');
    } else {
        /* src/insight.c:1940 — "can [not] safely pray"; suppressed when the
           game is over */
        you_can(`${can_pray(false) ? '' : 'not '}safely pray`
                + (game.wizard ? ` (${u.ublesscnt})` : ''));
    }
}

// src/pray.c:2124 can_pray() — the enlightenment approximation: prayer is
// safe when the timeout has run out, luck and anger are clean, and we are
// not in Gehennom. The undead-polymorph rn2(10) arm and the altar alignment
// arms are gated on state that cannot occur yet.
function can_pray(praying) {
    const u = game.u;
    const p_aligntyp = u.ualign?.type ?? 0;   /* on_altar() has no altars yet */
    const p_trouble = in_trouble();
    const alignment = u.ualign?.record ?? 0;

    let p_type;
    if ((p_trouble > 0) ? (u.ublesscnt > 200)
        : (p_trouble < 0) ? (u.ublesscnt > 100)
          : (u.ublesscnt > 0))
        p_type = 0;                     /* too soon... */
    else if ((u.uluck ?? 0) < 0 || u.ugangr || alignment < 0)
        p_type = 1;                     /* too naughty... */
    else
        p_type = 3;

    return !praying ? (p_type === 3 /* && !Inhell */) : true;
}

// src/pray.c:76 in_trouble() — the reachable numeric slice: critically low
// hit points and starvation; the remaining trouble states key on properties
// and are recorded when set.
function in_trouble() {
    const u = game.u;

    /* TROUBLE_HIT (Stoned/Slimed/Strangled/lava/sick) — property-gated */
    if (u.uprops?.STONED?.intrinsic || u.uprops?.SLIMED?.intrinsic
        || u.uprops?.STRANGLED?.intrinsic || u.usick_type)
        note_unported_insight('in_trouble:major_prop');

    if (u.uhp <= 5 || u.uhp * 7 <= u.uhpmax)
        return 1;                       /* TROUBLE_HIT_POINTS */
    if (u.uhs >= WEAK)
        return 1;                       /* TROUBLE_HUNGRY */

    return 0;
}

// src/insight.c:3235 piousness() — the alignment-record adverb.
export function piousness(showneg, suffix) {
    const rec = game.u.ualign?.record ?? 0;
    let pio;

    /* note: piousness 20 matches MIN_QUEST_ALIGN (quest.h) */
    if (rec >= 20)      pio = "piously";
    else if (rec > 13)  pio = "devoutly";
    else if (rec > 8)   pio = "fervently";
    else if (rec > 3)   pio = "stridently";
    else if (rec === 3) pio = "";
    else if (rec > 0)   pio = "haltingly";
    else if (rec === 0) pio = "nominally";
    else if (!showneg)  pio = "insufficiently";
    else if (rec >= -3) pio = "strayed";
    else if (rec >= -8) pio = "sinned";
    else                pio = "transgressed";

    let buf = pio;
    if (suffix && (!showneg || rec >= 0)) {
        if (rec !== 3)
            buf += " ";
        buf += suffix;
    }
    return buf;
}

// src/insight.c:3402 ustatusline() — "Status of <name> (<piousness>): ...".
//
// The condition suffixes read state that is absent for most fresh heroes and
// simply contribute nothing; the swallow/engulf and gas-region arms are
// recorded when their state exists.
export async function ustatusline() {
    let info = '';
    if (game.u.usick_type)      info += ', dying from illness';   /* Sick */
    if (game.u.uprops?.STONED?.intrinsic)    info += ', solidifying';
    if (game.u.uprops?.SLIMED?.intrinsic)    info += ', becoming slimy';
    if (game.u.uprops?.STRANGLED?.intrinsic) info += ', being strangled';
    if (game.u.uprops?.CONFUSION?.intrinsic) info += ', confused';
    if (game.u?.ublind)          info += ', blind';
    if (game.u.uprops?.STUNNED?.intrinsic)   info += ', stunned';
    if (game.u.utrap)            info += ', trapped';
    if (Fast())                  info += Very_fast() ? ', very fast' : ', fast';
    if (game.u.uundetected)      info += ', concealed';
    if (game.u.ustuck)
        note_unported_insight('ustatusline:ustuck');

    await pline(`Status of ${game.plname} (${piousness(false, align_str(game.u.ualign?.type ?? 0))}):  Level ${game.u.ulevel}  HP ${game.u.uhp}(${game.u.uhpmax})  AC ${game.u.uac}${info}.`);
}
