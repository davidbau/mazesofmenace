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
import { P_NONE, P_UNSKILLED, P_SKILLED, P_ISRESTRICTED, FULL_MOON, NEW_MOON, WEAK,
         P_TWO_WEAPON_COMBAT, ROLE_GENDMASK, ROLE_MALE, ROLE_FEMALE,
         ARTICLE_YOUR, SUPPRESS_IT, SUPPRESS_INVISIBLE, STRAT_WAITMASK,
         MSLOW, MFAST, A_NONE } from './const.js';
import { makeplural, minimal_xname } from './objnam.js';
import { weapon_descr, weapon_type, skill_name, skill_level_name, P_SKILL, can_advance } from './weapon.js';
import { empty_handed, is_ammo } from './wield.js';
import { magic_negation } from './mhitu.js';

function note_unported_insight(what) {
    (game.unported ||= new Set()).add('insight:' + what);
}
import { depth, dunlev, endgamelevelname } from './dungeon.js';
import { In_endgame, In_quest, Is_knox_level } from './const.js';
import { aligns } from './role_data.js';
import { A_MAX } from './attrib.js';
import { rank_of } from './botl.js';
import { money_cnt } from './invent.js';
import { costly_spot } from './shk.js';
import { newuexp } from './exper.js';
import { night, midnight } from './calendar.js';
import { type_is_pname } from './mondata.js';
import { inv_weight, near_capacity } from './attrib.js';
import { ONAMES } from './objects_data.js';
import { pline } from './display.js';
import { x_monnam } from './do_name.js';
import { find_mac } from './worn.js';
import { Fast, Very_fast, from_what as innate_source } from './attrib.js';
import { Fire_resistance, Cold_resistance, Sleep_resistance,
         Shock_resistance, Poison_resistance, Stealth, Searching,
         Warning, Teleport_control, See_invisible,
         Infravision, Deaf } from './youprop.js';

const EXTRINSIC_KEYS = {
    HFire_resistance: 'FIRE_RES',
    HCold_resistance: 'COLD_RES',
    HSleep_resistance: 'SLEEP_RES',
    HShock_resistance: 'SHOCK_RES',
    HPoison_resistance: 'POISON_RES',
    HSee_invisible: 'SEE_INVIS',
    HWarning: 'WARNING',
    HSearching: 'SEARCHING',
    HInfravision: 'INFRAVISION',
    HStealth: 'STEALTH',
    HTeleport_control: 'TELEPORT_CONTROL',
    HFast: 'FAST',
};

// src/attrib.c:905 from_what(), equipment arm. The flat extrinsic value is a
// worn-slot mask, so it identifies the inventory object conveying the property.
function from_what(abilKey) {
    const innate = innate_source(abilKey);
    if (innate || !game.wizard)
        return innate;

    const mask = game.u.uprops?.[EXTRINSIC_KEYS[abilKey]] | 0;
    const obj = mask && (game.invent || []).find(
        (candidate) => ((candidate.owornmask | 0) & mask) !== 0);
    if (!obj)
        return '';

    const name = minimal_xname(obj).replace(/\bpair of /i, '');
    return ` because of your ${name}`;
}

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

/* src/insight.c:383 — ENL_GAMEINPROGRESS:0, ENL_GAMEOVERALIVE:1,
   ENL_GAMEOVERDEAD:2; the whole window switches to past tense when set. */
export const ENL_GAMEINPROGRESS = 0, ENL_GAMEOVERALIVE = 1,
             ENL_GAMEOVERDEAD = 2;
export const BASICENLIGHTENMENT = 1, MAGICENLIGHTENMENT = 2;
let en_final = 0;

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

// src/insight.c:105-108 — the enl_msg family; en_final picks the tense.
const enl_msg = (prefix, present, past, suffix, ps) =>
    enlght_line(prefix, en_final ? past : present, suffix, ps);
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
    /* src/insight.c:512 — the gender word only when the role name has no
       female variant AND the role allows both genders (or the current gender
       differs from chargen's); a Valkyrie gets neither. */
    let tmpbuf = '';
    if (!game.urole.name.f
        && ((game.urole.allow & ROLE_GENDMASK) === (ROLE_MALE | ROLE_FEMALE)
            || (female ? 1 : 0) !== (game.flags.initgend ?? (female ? 1 : 0))))
        tmpbuf = (female ? 'female' : 'male') + ' ';
    let buf;
    if (rank_titl.toLowerCase() === role_titl.toLowerCase())
        buf = `${an(rank_titl)}, level ${u.ulevel} ${tmpbuf}${game.urace.noun}`;
    else
        buf = `${an(rank_titl)}, a level ${u.ulevel} ${tmpbuf}`
            + `${game.urace.adj} ${role_titl}`;
    you_are(buf);

    /* bypasses you_are() so the sentence has no trailing period yet */
    out(` You ${en_final ? 'were' : 'are'} ${align_str(u.ualign.type)}, on a mission for ${u_gname()}`);

    let opp = ` who ${en_final ? 'was' : 'is'} opposed by`;
    if (u.ualign.type !== 1)
        opp += ` ${align_gname(1)} (${align_str(1)}) and`;
    if (u.ualign.type !== 0)
        opp += ` ${align_gname(0)} (${align_str(0)})`
             + ((u.ualign.type !== -1) ? ' and' : '');
    if (u.ualign.type !== -1)
        opp += ` ${align_gname(-1)} (${align_str(-1)})`;
    out(opp + '.');

    you_are((u.uhandedness === RIGHT_HANDED) ? 'right-handed' : 'left-handed');

    /* src/insight.c:604 — dungeon level, so that ^X really has all status
       info as claimed */
    if (In_endgame(u.uz)) {
        /* observable_depth() is just depth() (topten.c:183, the
           randomized-planes arm is #if 0) */
        const tmpbuf = endgamelevelname(depth(u.uz));
        you_are(`in the endgame, on the ${
            tmpbuf.startsWith('Plane') ? 'Elemental ' : ''}${tmpbuf}`);
    } else if (Is_knox_level(u.uz)) {
        /* this gives away the fact that the knox branch is only 1 level */
        you_are(`on the ${game.dungeons[u.uz.dnum].dname} level`);
    } else {
        /* "in %s, on %s" — dungeon name with a leading "The " LOWERCASED,
           not stripped, so the sentence reads "in the Dungeons of Doom"
           (src/insight.c:152) */
        let dgnbuf = game.dungeons[u.uz.dnum].dname;
        if (/^the /i.test(dgnbuf))
            dgnbuf = dgnbuf[0].toLowerCase() + dgnbuf.slice(1);
        you_are(`in ${dgnbuf}, on level ${
            In_quest(u.uz) ? dunlev(u.uz) : depth(u.uz)}`);
    }

    if (game.moves === 1)
        you_have('just started your adventure');
    else
        enlght_line('You ', 'entered ',
                    `the dungeon ${game.moves} turn${plur(game.moves)} ago`, '');

    /* really_done() freezes these values before the disclosure prompts so
       waiting at a prompt cannot change the final report. */
    if (en_final ? game.iflags?.at_midnight : midnight())
        enl_msg('It ', 'is ', 'was ', 'the midnight hour', '');
    else if (en_final ? game.iflags?.at_night : night())
        enl_msg('It ', 'is ', 'was ', 'nighttime', '');

    /* src/insight.c:653 — "other environmental factors" */
    if (game.flags.moonphase === FULL_MOON
        || game.flags.moonphase === NEW_MOON) {
        enl_msg('There ', 'is ', 'was ',
                `a ${game.flags.moonphase === FULL_MOON ? 'full' : 'new'}`
                + ` moon in effect${en_final
                    ? ' when your adventure ended' : ''}`, '');
    }
    if (game.flags.friday13)
        out(` Bad things ${!en_final ? 'can happen'
            : (en_final === ENL_GAMEOVERALIVE) ? 'could have happened'
              : 'happened'} on Friday the 13th.`);

    {
        let buf = `${u.uexp | 0} experience point${plur(u.uexp | 0)}`;
        /* src/insight.c:702 — wizard mode (or final disclosure) appends the
           delta to the next level; "to attain" below 18, "for" above */
        const ulvl = u.ulevel | 0;
        if (ulvl < 30 && (en_final || game.wizard)) {
            const nxtlvl = newuexp(ulvl), delta = nxtlvl - (u.uexp | 0);
            buf += `, ${delta} ${(u.uexp > 0) ? 'more ' : ''}${
                !en_final ? '' : (delta === 1) ? 'was ' : 'were '}needed ${
                (ulvl < 18) ? 'to attain' : 'for'} level ${ulvl + 1}`;
        }
        you_have(buf);
    }
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
    out(money ? ` Your wallet contain${en_final ? 'ed' : 's'} ${money} zorkmid${plur(money)}`
              : ` Your wallet ${en_final ? 'was' : 'is'} empty`);
    /* C terminates that line here when nothing follows it */
    lines[lines.length - 1] += '.';

    /* src/insight.c:804 — the "on" arm reports scope: shop suspension, the
       pickup_types symbols (or "all types"), pickup_thrown, exceptions. */
    let buf;
    if (game.flags.autopickup) {
        buf = 'on';
        if (costly_spot(u.ux, u.uy)) {
            /* being in a shop inhibits autopickup, even 'pickup_thrown' */
            buf += ', but temporarily disabled while inside the shop';
        } else {
            const ocl = game.flags.pickup_types || '';
            buf += ` for ${ocl ? `'${ocl}'` : 'all types'}`;
            if (game.flags.pickup_thrown && ocl)
                buf += ' plus thrown'; /* show when not 'all types' */
            if (game.apelist?.length)
                buf += ', with exceptions';
        }
    } else {
        buf = 'off';
    }
    enl_msg('Autopickup ', 'is ', 'was ', buf, '');
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

    const interesting_alimit = en_final
        ? true /* was originally (abase != alimit) */
        : (alimit !== (attrindx !== A_STR ? 18 : STR18(100)));
    let paren_pfx = en_final ? ' (' : ' (current; ';
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
    out(`${en_final ? 'Final ' : ''}Characteristics:`);
    for (const a of [A_STR, A_DEX, A_CON, A_INT, A_WIS, A_CHA])
        one_characteristic(a);
}

// src/insight.c:1180 status_enlightenment() — only the last-resort entries a
// fresh hero reaches.
function status_enlightenment() {
    out('');
    out(`${en_final ? 'Final ' : ''}Status:`);

    if (Deaf())
        you_are('deaf');

    /* src/insight.c:1181, restful sleep and other Sleepy sources. */
    if ((game.u.intrinsic?.HSleepy || game.u.uprops?.SLEEPY))
        enl_msg('You ', 'fall', 'fell', ' asleep uncontrollably', '');

    /* hunger: hu_stat[] is empty for the normal state, and C substitutes
       "not hungry", which the contraction turns into "aren't hungry";
       wizard mode reveals u.uhunger (insight.c:1208) */
    you_are('not hungry' + (game.wizard ? ` <${game.u.uhunger}>` : ''));

    /* src/insight.c:1211 encumbrance. */
    const cap = near_capacity();
    if (cap > 0) {
        const enc = ['unencumbered', 'burdened', 'stressed', 'strained',
                     'overtaxed', 'overloaded'];
        const adj = ['?', 'slightly', 'moderately', 'very', 'extremely',
                     'not possible'];
        let state = enc[cap] + (game.wizard ? ` <${inv_weight()}>` : '');
        state += `; movement is ${adj[cap]}${cap < 5 ? ' slowed' : ''}`;
        you_are(state);
    } else {
        you_are('unencumbered' + (game.wizard ? ` <${inv_weight()}>` : ''));
    }

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
                /* src/insight.c:1334 — the two-weapon comparisons: each of
                   primary and secondary against the two-weapon skill */
                const also_ = 'also ';
                const wtype2 = weapon_type(game.u.uswapwep);
                const sklvl2 = P_SKILL(wtype2);
                const hav2 = (sklvl2 !== P_UNSKILLED && sklvl2 !== P_SKILLED);
                let twoskl = P_SKILL(P_TWO_WEAPON_COMBAT);
                let twobuf;
                if (twoskl === P_ISRESTRICTED) {
                    twoskl = P_UNSKILLED;
                    twobuf = 'restricted';
                } else {
                    twobuf = skill_level_name(P_TWO_WEAPON_COMBAT)
                                 .toLowerCase();
                }

                let pfx = '', sfx = '', also = '', also2 = '', also3 = null;
                if (twoskl < sklvl) {
                    pfx = `Your skill in ${skill_name(wtype)} `;
                    sfx = ` limited by being ${twobuf} with two weapons`;
                    also = also_;
                } else if (twoskl > sklvl) {
                    pfx = 'Your two weapon skill ';
                    sfx = ' limited by '
                        + ((sklvl > P_ISRESTRICTED)
                           ? `being ${sklvlbuf}` : 'having no skill')
                        + ` with ${skill_name(wtype)}`;
                    also2 = also_;
                } else {
                    buf += ' and two weapons';
                    also3 = also_;
                }
                if (pfx)
                    enl_msg(pfx, 'is', 'was', sfx, '');
                else if (hav)
                    you_have(buf);
                else
                    you_are(buf);

                /* skip the secondary comparison if identical to primary's */
                if (wtype2 !== wtype) {
                    const sknambuf2 = skill_name(wtype2);
                    const sklvlbuf2 = skill_level_name(wtype2).toLowerCase();
                    let verb_present = 'is', verb_past = 'was';
                    pfx = ''; sfx = ''; buf = '';
                    if (twoskl < sklvl2) {
                        pfx = `Your skill in ${sknambuf2} `;
                        sfx = ` ${also}limited by being ${twobuf}`
                            + ' with two weapons';
                    } else if (twoskl > sklvl2) {
                        pfx = 'Your two weapon skill ';
                        sfx = ` ${also2}limited by `
                            + ((sklvl2 > P_ISRESTRICTED)
                               ? `being ${sklvlbuf2}` : 'having no skill')
                            + ` with ${sknambuf2}`;
                    } else {
                        buf = `${sklvlbuf2} ${hav2 ? 'skill with' : 'in'} `
                            + `${sknambuf2} and two weapons`;
                        if (also3) {
                            pfx = 'You also ';
                            sfx = ` ${buf}`; buf = '';
                            verb_present = hav2 ? 'have' : 'are';
                            verb_past = hav2 ? 'had' : 'were';
                        }
                    }
                    if (pfx)
                        enl_msg(pfx, verb_present, verb_past, sfx, '');
                    else if (hav2)
                        you_have(buf);
                    else
                        you_are(buf);
                }

                /* src/insight.c:1436 — the "You can enhance skill(s) with
                   ..." hint when any of the three is advanceable */
                const a1 = can_advance(wtype, false);
                const a2 = (wtype2 !== wtype) ? can_advance(wtype2, false)
                                              : false;
                const ab = can_advance(P_TWO_WEAPON_COMBAT, false);
                if (a1 || a2 || ab) {
                    const also_wik_ = ' and also with ';
                    const n = (a1 ? 1 : 0) + (a2 ? 1 : 0) + (ab ? 1 : 0);
                    const hint = ` skill${n > 1 ? 's' : ''} with `
                        + `${a1 ? skill_name(wtype) : ''}`
                        + `${(a1 && a2 && ab) ? ', '
                             : (a1 && (a2 || ab)) ? also_wik_ : ''}`
                        + `${a2 ? skill_name(wtype2) : ''}`
                        + `${(a1 && a2 && ab) ? ', and '
                             : (a2 && ab) ? also_wik_ : ''}`
                        + `${ab ? 'two weapons' : ''}`;
                    enl_msg('You ', 'can enhance', 'could have enhanced',
                            hint, '');
                }
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
    const u = game.u;
    return !!(u.uarm || u.uarmu || u.uarmc || u.uarms
              || u.uarmg || u.uarmf || u.uarmh);
}

// src/insight.c:200 enlightenment() — returns the lines for the caller to put
// into a window.
export function enlightenment(mode, final) {
    /* the ^X caller passes nothing: BASIC (+MAGIC for wizard/discover),
       game in progress — src/insight.c:2009 doattributes() */
    if (mode === undefined)
        mode = BASICENLIGHTENMENT
               | ((game.wizard || game.discover) ? MAGICENLIGHTENMENT : 0);
    en_final = final | 0;
    lines.length = 0;

    const tmpbuf = highc(game.plname || '');
    const female = !!game.flags.female;
    out(`${tmpbuf} the ${(female && game.urole.name.f) ? game.urole.name.f
                                                       : game.urole.name.m}'s attributes:`);

    if (mode & BASICENLIGHTENMENT) {
        background_enlightenment();
        basics_enlightenment();
        characteristics_enlightenment();
    }
    status_enlightenment();

    /* src/insight.c:420 — the intrinsics section is shown for
       MAGICENLIGHTENMENT: wizard/discover ^X, and always at game end. */
    if (mode & MAGICENLIGHTENMENT)
        attributes_enlightenment();

    out('');
    out('Miscellaneous:');
    /* src/insight.c:428 — wizard/discover reminder plus the bones tally,
       which the end-of-game disclosure always shows */
    if ((mode & BASICENLIGHTENMENT)
        && (game.wizard || game.discover || en_final)) {
        if (game.wizard || game.discover)
            you_are(`running in ${game.wizard ? 'debug' : 'explore'} mode`);
        if (game.flags?.bones === false) {
            you_have(`disabled loading${
                en_final === ENL_GAMEOVERDEAD ? ' and storing' : ''
                } of bones levels`);
        } else if (!(game.u.uroleplay?.numbones)) {
            enl_msg('You ', "haven't encountered", "didn't encounter",
                    ' any bones levels', '');
        } else {
            note_unported_insight('enlightenment:bones_count');
        }
    }
    enl_msg('Total elapsed playing time ', 'is', 'was', ' none', '');

    const result = lines.slice();
    en_final = 0;
    return result;
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
    out(`${en_final ? 'Final ' : ''}Attributes:`);

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

    /* src/insight.c:1524 — Antimagic, with from_what() naming the source in
       wizard mode; the one source a recorded hero has is the worn cloak */
    if (game.u.uarmc?.otyp === ONAMES.CLOAK_OF_MAGIC_RESISTANCE)
        you_are('magic-protected',
                game.wizard ? ' because of your cloak of magic resistance'
                            : '');

    /* src/insight.c:1526-1541 — resistances to troubles, each with
       from_what() naming the source in wizard mode */
    if (Fire_resistance())
        you_are('fire resistant', from_what('HFire_resistance'));
    if (Cold_resistance())
        you_are('cold resistant', from_what('HCold_resistance'));
    if (Sleep_resistance())
        you_are('sleep resistant', from_what('HSleep_resistance'));
    if (Shock_resistance())
        you_are('shock resistant', from_what('HShock_resistance'));
    if (Poison_resistance())
        you_are('poison resistant', from_what('HPoison_resistance'));

    /*** Vision and senses (insight.c:1566) ***/
    if (See_invisible())
        enl_msg('You ', 'see ', 'saw ', 'invisible',
                from_what('HSee_invisible'));
    if (Warning())
        you_are('warned', from_what('HWarning'));
    if (Searching())
        you_have('automatic searching', from_what('HSearching'));
    if (Infravision())
        you_have('infravision', from_what('HInfravision'));

    /*** Appearance and behavior (insight.c:1670) ***/
    if (Stealth())
        you_are('stealthy', from_what('HStealth'));

    /*** Transportation (insight.c:1688) ***/
    if (Teleport_control())
        you_have('teleport control', from_what('HTeleport_control'));

    /* src/insight.c:1799 — the magic cancellation factor from worn armor:
       "warded" / "guarded" / "protected" for mc 1..3 */
    const armpro = magic_negation(null);
    if (armpro > 0) {
        const mc_types = ['', 'warded', 'guarded', 'protected'];
        you_are(mc_types[Math.min(armpro, 3)]);
    }

    /* src/insight.c:1898 — Fast, between the mc line and Luck */
    if (Fast())
        you_are(Very_fast() ? 'very fast' : 'fast', from_what('HFast'));

    /* src/insight.c:1909 — Luck; the zero line is wizard-mode only */
    const luck = (game.u.uluck ?? 0) + (game.u.moreluck ?? 0);
    if (luck) {
        const ltmp = Math.abs(luck);
        let lbuf = `${ltmp >= 10 ? 'extremely ' : ltmp >= 5 ? 'very ' : ''}${
            luck < 0 ? 'un' : ''}lucky`;
        if (game.wizard)
            lbuf += ` (${luck})`;
        you_are(lbuf);
    } else if (game.wizard) {
        enl_msg('Your luck ', 'is', 'was', ' zero', '');
    }

    if (u.ugangr) {
        note_unported_insight('attributes:ugangr');
    } else if (!en_final) {
        /* src/insight.c:1936 — suppressed when the game is over: death can
           change can_pray()'s answer */
        you_can(`${can_pray(false) ? '' : 'not '}safely pray`
                + (game.wizard ? ` (${u.ublesscnt})` : ''));
    }

    /* src/insight.c:1968 — mortality tally; at a death it is the plain
       " You are dead." line (the past-tense slot carries it) */
    {
        let buf = '';
        let p;
        if (en_final < ENL_GAMEOVERDEAD) {
            p = 'survived after being killed ';
            if (!(u.umortality | 0))
                p = !en_final ? null : 'survived';
            else
                note_unported_insight('attributes:umortality_times');
        } else {
            p = 'are dead';
            if ((u.umortality | 0) > 1)
                note_unported_insight('attributes:umortality_ordinal');
        }
        if (p)
            enl_msg('You ', 'have been killed ', p, buf, '');
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

// src/insight.c:3275 mstatusline() gives stethoscope and probing feedback.
export async function mstatusline(mtmp) {
    const mdat = game.mons[mtmp.mnum];
    let info = '';

    if (mtmp.mtame)
        info += ', tame';
    else if (mtmp.mpeaceful)
        info += ', peaceful';
    if (mtmp.meating) info += ', eating';
    if (mtmp.mcan) info += ', cancelled';
    if (mtmp.mconf) info += ', confused';
    if (mtmp.mblinded || mtmp.mcansee === 0) info += ', blind';
    if (mtmp.mstun) info += ', stunned';
    if (mtmp.msleeping)
        info += ', asleep';
    else if (mtmp.mfrozen || (mtmp.mcanmove ?? 1) === 0)
        info += ", can't move";
    else if (((mtmp.mstrategy | 0) & STRAT_WAITMASK) !== 0)
        info += ', meditating';
    if (mtmp.mflee) info += ', scared';
    if (mtmp.mtrapped) info += ', trapped';
    if (mtmp.mspeed)
        info += mtmp.mspeed === MFAST ? ', fast'
              : mtmp.mspeed === MSLOW ? ', slow' : ', [? speed]';
    if (mtmp.minvis) info += ', invisible';
    if (mtmp === game.u.ustuck)
        info += game.u.uswallow ? ', engulfing you' : ', holding you';
    if (mtmp === game.u.usteed) info += ', carrying you';
    if (mtmp.mleashed) info += ', leashed';

    let alignment = mtmp.ispriest
        ? (mtmp.epri?.shralign ?? mtmp.mextra?.epri?.shralign ?? A_NONE)
        : mtmp.isminion
          ? (mtmp.emin?.min_align ?? mtmp.mextra?.emin?.min_align ?? A_NONE)
          : mdat.maligntyp;
    if (alignment !== A_NONE)
        alignment = Math.sign(alignment);
    const size = ['tiny', 'small', 'medium', 'large', 'huge', 'gigantic'][mdat.msize]
                 ?? `unknown size (${mdat.msize})`;
    const monname = x_monnam(mtmp, ARTICLE_YOUR, null,
                             SUPPRESS_IT | SUPPRESS_INVISIBLE, false);
    await pline(`Status of ${monname} (${align_str(alignment)}, ${size}):  `
                + `Level ${mtmp.m_lev}  HP ${mtmp.mhp}(${mtmp.mhpmax})  `
                + `AC ${find_mac(mtmp)}${info}.`);
}

// src/insight.c:3402 ustatusline() gives the hero's one-line status.
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


// src/insight.c:2560 show_gamelog() / :2532 do_gamelog() — the #chronicle
// window.
export async function do_gamelog() {
    if ((game.gamelog || []).length) {
        const {
            tty_create_nhwindow, tty_destroy_nhwindow, tty_putstr,
            tty_display_nhwindow, tty_next_page, NHW_TEXT,
        } = await import('./tty/wintty.js');
        const { nhgetch } = await import('./input.js');
        const { docrt } = await import('./display.js');
        const win = tty_create_nhwindow(NHW_TEXT);
        tty_putstr(win, 0, 'Logged events:');
        let eventcnt = 0;
        for (const e of game.gamelog) {
            if (!eventcnt++)
                tty_putstr(win, 0, ' Turn');
            tty_putstr(win, 0, `${String(e.turn).padStart(5)}: ${e.text}`);
        }
        await tty_display_nhwindow(win);
        await nhgetch();
        while (tty_next_page(win))
            await nhgetch();
        tty_destroy_nhwindow(win);
        await docrt();
    } else {
        await pline('No chronicled events.');
    }
    return 0; /* ECMD_OK */
}


// src/insight.c:2089 show_conduct() — the #conduct window. The arms whose
// state no session reaches (blind/deaf/pauper/nudist rolls, wish details)
// stay silent exactly as C's would with zeroed fields.
export async function show_conduct(final) {
    const {
        tty_create_nhwindow, tty_destroy_nhwindow, tty_putstr,
        tty_display_nhwindow, tty_next_page, NHW_MENU,
    } = await import('./tty/wintty.js');
    const { nhgetch } = await import('./input.js');
    const { docrt } = await import('./display.js');
    const { xwaitforspace } = await import('./tty/getline.js');
    const c = game.u.uconduct || {};
    const fin = final | 0;
    const win = tty_create_nhwindow(NHW_MENU);
    const put = (s) => tty_putstr(win, 0, s);
    /* the enl_msg tense pairs from src/insight.c:105-115, applied with the
       same one-space lead and contraction pass as enlght_line */
    const cmsg = (present, past, thing) => {
        let buf = ` You ${fin ? past : present}${thing}.`;
        if (buf.includes(' not '))
            buf = buf.split(' are not ').join(" aren't ")
                     .split(' have not ').join(" haven't ");
        put(buf);
    };
    const have_been = (g) => cmsg('have been ', 'were ', g);
    const have_never = (b) => cmsg('have never ', 'never ', b);
    const have_X = (x) => cmsg('have ', '', x);

    put('Voluntary challenges:');
    /* u.uroleplay.reroll is never enabled in a recorded rc; C phrases this
       one in past tense always */
    put(' Character rerolling was not enabled.');

    if (!c.food)
        cmsg('have gone ', 'went ', 'without food');
    else if (!c.unvegan)
        have_X('followed a strict vegan diet');
    else if (!c.unvegetarian)
        have_been('vegetarian');

    if (!c.gnostic)
        have_been('an atheist');

    if (!c.weaphit)
        have_never('hit with a wielded weapon');
    else if (game.wizard)
        have_X(`hit with a wielded weapon ${c.weaphit} time${
            c.weaphit === 1 ? '' : 's'}`);
    if (!c.killer)
        have_been('a pacifist');

    if (!c.literate)
        have_been('illiterate');
    else if (game.wizard)
        have_X(`read items or engraved ${c.literate} time${
            c.literate === 1 ? '' : 's'}`);

    if (!c.pets)
        have_never('had a pet');

    /* num_genocides() is always 0 so far */
    have_never('genocided any monsters');

    if (!c.polypiles)
        have_never('polymorphed an object');
    else if (game.wizard)
        have_X(`polymorphed ${c.polypiles} item${
            c.polypiles === 1 ? '' : 's'}`);

    if (!c.polyselfs)
        have_never('changed form');
    else if (game.wizard)
        have_X(`changed form ${c.polyselfs} time${
            c.polyselfs === 1 ? '' : 's'}`);

    if (!c.wishes)
        have_X('used no wishes');
    else
        have_X(`used ${c.wishes} wish${c.wishes > 1 ? 'es' : ''}`);

    await tty_display_nhwindow(win);
    await xwaitforspace(' \r\n\x1b');
    while (tty_next_page(win))
        await xwaitforspace(' \r\n\x1b');
    tty_destroy_nhwindow(win);
    await docrt();
    return 0;
}


// src/insight.c:2784 list_vanquished() — the #vanquished window; default
// sort is by monster level high-to-low with index tiebreak (VANQ_MLVL_MNDX).
export async function list_vanquished(defquery, ask) {
    const mindx = [];
    let total_killed = 0;
    for (let i = 0; i < (game.mvitals || []).length; i++) {
        const nk = game.mvitals[i]?.died | 0;
        if (!nk)
            continue;
        mindx.push(i);
        total_killed += nk;
    }
    const ntypes = mindx.length;

    if (ntypes) {
        let c = defquery;
        if (ask) {
            const { tty_yn_function } = await import('./tty/topl.js');
            c = await tty_yn_function(
                'Do you want an account of creatures vanquished?',
                ntypes > 1 ? 'ynaq' : 'ynq', defquery || 'n');
        }
        if (c === 'q')
            game.done_stopprint = (game.done_stopprint | 0) + 1;
        if (c !== 'y' && c !== 'a')
            return;
        const {
            tty_create_nhwindow, tty_destroy_nhwindow, tty_putstr,
            tty_display_nhwindow, tty_next_page, NHW_MENU,
        } = await import('./tty/wintty.js');
        const { xwaitforspace } = await import('./tty/getline.js');
        const { docrt } = await import('./display.js');
        const { makeplural } = await import('./objnam.js');
        const win = tty_create_nhwindow(NHW_MENU);
        tty_putstr(win, 0, 'Vanquished creatures:');
        tty_putstr(win, 0, '');

        mindx.sort((a, b) =>
            (game.mons[b].mlevel - game.mons[a].mlevel) || (a - b));
        for (const i of mindx) {
            const nk = game.mvitals[i].died | 0;
            const nam = game.mons[i].pmnames?.filter(Boolean)[0]
                        ?? game.mons[i].pmnames?.[0];
            let buf;
            if ((game.mons[i].geno ?? 0) & 0x1000 /* G_UNIQ */) {
                buf = `${!type_is_pname(game.mons[i]) ? 'the ' : ''}${nam}`;
            } else if (nk === 1) {
                buf = an(nam);
            } else {
                buf = `${String(nk).padStart(3)} ${makeplural(nam)}`;
            }
            /* leading spaces to match a 3-digit prefix */
            const pfx = buf.startsWith('the ') ? 0
                      : buf.startsWith('an ') ? 1
                        : buf.startsWith('a ') ? 2
                          : !/[0-9]/.test(buf[2] ?? '') ? 4 : 0;
            tty_putstr(win, 0, `${' '.repeat(pfx)}${buf}`);
        }
        if (ntypes > 1) {
            tty_putstr(win, 0, '');
            tty_putstr(win, 0, `${total_killed} creatures vanquished.`);
        }
        await tty_display_nhwindow(win);
        await xwaitforspace(' \r\n\x1b');
        while (tty_next_page(win))
            await xwaitforspace(' \r\n\x1b');
        tty_destroy_nhwindow(win);
        await docrt();
    } else if (ask && !game.program_state_gameover) {
        await pline('No creatures have been vanquished.');
    }
}
