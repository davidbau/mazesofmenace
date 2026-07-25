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
import { depth } from './dungeon.js';
import { aligns } from './role_data.js';
import { A_MAX } from './attrib.js';
import { rank_of } from './botl.js';

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

    const money = u.umoney0 | 0;
    out(money ? ` Your wallet contains ${money} zorkmid${plur(money)}`
              : ' Your wallet is empty');
    /* C terminates that line here when nothing follows it */
    lines[lines.length - 1] += '.';

    enl_msg('Autopickup ', 'is ', 'was ',
            game.flags.autopickup ? 'on' : 'off', '');
}

// src/insight.c:770 one_characteristic()
function one_characteristic(attrindx) {
    const acurrent = game.u.acurr.a[attrindx];
    const abase = acurrent, apeak = game.u.amax.a[attrindx];
    const alimit = game.urace.attrmax[attrindx];
    let valubuf = `${acurrent}`;

    const interesting_alimit =
        (alimit !== (attrindx !== A_STR ? 18 : STR18(100)));
    let paren_pfx = ' (current; ';
    if (acurrent !== abase) {
        valubuf += `${paren_pfx}base:${abase}`; paren_pfx = ', ';
    }
    if (abase !== apeak) {
        valubuf += `${paren_pfx}peak:${apeak}`; paren_pfx = ', ';
    }
    if (interesting_alimit)
        valubuf += `${paren_pfx}${acurrent > alimit ? 'innate ' : ''}limit:${alimit}`;
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

    /* weapon_insight(): no uwep and no gloves */
    you_are('bare handed');

    /* skill with the current weapon: bare handed combat, unskilled.
       hav is false for unskilled, so it is "You are ... in ..." */
    you_are('unskilled in bare handed combat');

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

    out('');
    out('Miscellaneous:');
    out(' Total elapsed playing time is none.');

    return lines.slice();
}
