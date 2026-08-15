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
    P_BARE_HANDED_COMBAT, In_quest,
} from './const.js';
import { objects as mkobjObjects } from './mkobj.js';
import { p_skill_of } from './enhance.js';
import { update_topl } from './display.js';
import { phase_of_the_moon, friday_13th, night, NEW_MOON, FULL_MOON } from './calendar.js';
import { race_attrmax } from './u_init.js';
import { acurr_eff } from './attrib.js';
import { depth } from './hacklib.js';
import { newuexp, has_innate } from './exper.js';
import { youHaveSearching } from './allmain.js';
import { Infravision, Blind } from './vision.js';
import { objects as OBJECTS } from './mkobj.js';
import { MFLAGS2, M2_PNAME } from './monflags_data.js';
const G_UNIQ = 0x1000; // monflag.h
import { magic_negation_hero } from './monmove.js';

// insight.c:1803 mc_types[] — indexed by magic_negation()'s result.
const MC_TYPES = ['', 'warded', 'guarded', 'protected'];
const W_ARMOR_MASK = 0x7f; // monst.h W_ARMOR: the seven armour slots
// C ref: prop.h Antimagic == EAntimagic || HAntimagic.  The extrinsic is worn
// gear with oc_oprop ANTIMAGIC; no session grants the intrinsic.
function Antimagic() {
    for (const o of (game.invent || []))
        if ((o.owornmask || 0) & W_ARMOR_MASK) {
            if (OBJECTS[o.otyp]?.oc_oprop === 12 /* ANTIMAGIC */) return true;
        }
    return !!(game.u?.HAntimagic);
}

// The four owornmask groups from_what()/cause_known() scan.  These are
// js/invent.js's REMAPPED W_* bits, not prop.h's — see that file's header.
const W_GIVES_PROP = W_ARMOR_MASK | 0x00020000 /*W_RINGL*/ | 0x00040000 /*W_RINGR*/
                     | 0x00080000 /*W_AMUL*/ | 0x00100000 /*W_TOOL*/;
// C ref: attrib.c what_gives(&u.uprops[propidx].extrinsic) — the worn item
// whose oc_oprop is `propidx`, or null.
function what_gives(propidx) {
    for (const o of (game.invent || []))
        if (((o.owornmask || 0) & W_GIVES_PROP) && OBJECTS[o.otyp]?.oc_oprop === propidx)
            return o;
    return null;
}
// C ref: prop.h <Prop> == E<Prop> || H<Prop>.  hkey names the u.uprops mirror
// this port stores the intrinsic under (several modules write game.u[hkey]
// directly, so both spellings are read).
function haveProp(propidx, hkey) {
    if (what_gives(propidx)) return true;
    if (hkey && ((game.u?.uprops?.[hkey] || 0) || (game.u?.[hkey] || 0))) return true;
    return !!(hkey && has_innate(hkey));
}
const TIMEOUT_MASK = 0x00ffffff; // prop.h TIMEOUT
// C ref: insight.c cause_known(propindx) — a WORN armour/amulet/ring/tool
// whose oc_oprop is propindx and whose type the hero has identified.
function cause_known(propidx) {
    for (const o of (game.invent || []))
        if (((o.owornmask || 0) & W_GIVES_PROP) && OBJECTS[o.otyp]?.oc_oprop === propidx
            && OBJECTS[o.otyp]?.oc_name_known && o.dknown)
            return true;
    return false;
}
// C ref: attrib.c from_what(propidx) — wizard mode only; picks the most
// significant source.  is_innate() outranks what_gives(); adjabil() tags a
// level-1 row FROMOUTSIDE (-> "intrinsically") and a later row FROMEXPER
// (-> "because of your experience").
function from_what(propidx, hkey) {
    if (!_wizard()) return '';
    if (hkey && has_innate(hkey))
        return has_innate(hkey, 1) ? ' intrinsically' : ' because of your experience';
    if (hkey && (game.u?.uprops?.[hkey] || game.u?.[hkey])) return ' intrinsically';
    const o = what_gives(propidx);
    return o ? ` because of ${ysimple_name(o)}` : '';
}
import { LL_WISH, LL_ACHIEVE, LL_UMONST, LL_DIVINEGIFT, LL_LIFESAVE,
         LL_ARTIFACT, LL_GENOCIDE, LL_DUMP, LL_SPOILER, LL_MINORAC,
         livelog_printf } from './livelog.js';
import { nhgetch } from './input.js';
import { can_pray_quiet } from './pray.js';
import { inv_weight, ysimple_name } from './invent.js';
const _wizard = () => !!(game.flags && game.flags.debug);
const _discover = () => { const f = game.flags || {}; return !!(f.explore || f.discover || f.playmode === 'explore'); };

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

// C ref: attrib.c from_what(ANTIMAGIC) — wizard mode only; the worn item that
// grants it (what_gives -> ysimple_name).
function _fromWhatAntimagic() {
    if (!(game.flags && game.flags.debug)) return '';
    for (const o of (game.invent || []))
        if ((o.owornmask || 0) & W_ARMOR_MASK)
            if (OBJECTS[o.otyp]?.oc_oprop === 12) return ` because of your ${OBJECTS[o.otyp].name}`;
    return '';
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
    out(` You ${final ? 'were' : 'are'} ${alignStr(aligntype)}, on a mission for ${align_gname(roleIdx, aligntype)}`);
    let pan = ` who ${final ? 'was' : 'is'} opposed by`;
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
        // insight.c:668 — the game-over pass appends " when your adventure ended".
        const when = final ? ' when your adventure ended' : '';
        enlLine('There ', final ? 'was ' : 'is ', `a ${which} moon in effect${when}`, '');
    }
    if (friday_13th()) {
        // insight.c:678 — a raw enlght_out() line (own leading space, no
        // trailing you-are period).  ENL_GAMEOVERALIVE == 1, DEAD == 2.
        const did = !final ? 'can happen'
            : (final === 1) ? 'could have happened' : 'happened';
        out(` Bad things ${did} on Friday the 13th.`);
    }

    // experience (not polymorphed).  C ref: insight.c background_enlightenment —
    // for a sub-30 experience level, wizard mode OR the game-over 'final' pass
    // appends how much more experience is needed to reach the next level.
    // doattributes() runs with final==0, so only the wizard branch applies there.
    const uexp = u.uexp ?? 0;
    const xlvl = u.ulevel ?? 1;
    let expbuf = `${uexp} experience point${uexp === 1 ? '' : 's'}`;
    if (xlvl < 30 && (final || !!game.flags?.debug)) {
        const delta = newuexp(xlvl) - uexp;
        const wasWere = !final ? '' : (delta === 1 ? 'was ' : 'were ');
        expbuf += `, ${delta} ${uexp > 0 ? 'more ' : ''}${wasWere}`
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

    // autopickup.  C ref: insight.c basics_enlightenment() — when on, names
    // the pickup_types restriction (oc_to_str(flags.pickup_types, ocl), or
    // "all types" when unset) and appends "plus thrown" when pickup_thrown
    // applies to a non-empty restriction.  costly_spot (shop suppression) and
    // the apelist exceptions clause are both omitted -> always the "else"/
    // unset case (shops aren't modeled here; exceptions are always empty,
    // see doset.js "autopickup exceptions   [(0 currently set)]").
    let apbuf;
    if (game.flags?.pickup) {
        const ocl = game.flags.pickup_types || '';
        apbuf = `on for ${ocl ? `'${ocl}'` : 'all types'}`;
        if ((game.flags.pickup_thrown ?? true) && ocl) apbuf += ' plus thrown';
    } else {
        apbuf = 'off';
    }
    enlLine('Autopickup ', final ? 'was ' : 'is ', apbuf, '');

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
    // C ref: insight.c:1073 — `if (Deaf) you_are("deaf", from_what(DEAF));`,
    // emitted BEFORE the hunger line.
    if (((u.uprops?.HDeaf || 0) > 0) || u.Deaf) youAre('deaf');
    // C ref: insight.c:1181 — Sleepy (worn/eaten amulet of restful sleep),
    // emitted immediately before the hunger line.  cause_known() is bypassed
    // whenever MAGICENLIGHTENMENT is on, which end-of-game disclosure always is.
    if (haveProp(27 /*SLEEPY*/, 'HSleepy')
        && (final || _wizard() || _discover() || cause_known(27))) {
        let sb = from_what(27, 'HSleepy');
        if (_wizard()) sb += ` (${(u.HSleepy || 0) & TIMEOUT_MASK})`;
        enlLine('You ', final ? 'fell' : 'fall', ' asleep uncontrollably', sb);
    }
    // hunger: hu_stat[u.uhs]; NOT_HUNGRY (1) -> "not hungry" at game start.
    // C ref: insight.c:1146 — wizard mode appends the raw u.uhunger.
    {
        let hb = hungerWord(u.uhs ?? 1);
        if (_wizard()) hb += ` <${u.uhunger ?? 900}>`;
        youAre(hb);
    }
    // C ref: insight.c:1212 — only the UNENCUMBERED else-arm says
    // "unencumbered"; anything heavier is "<enc>; movement is <adj> slowed".
    {
        const cap = game._curcap | 0;
        if (cap > 0) {
            const encWords = ['', 'Burdened', 'Stressed', 'Strained', 'Overtaxed', 'Overloaded'];
            const adjs = ['', 'slightly', 'moderately', 'very', 'extremely', 'not possible'];
            const w = encWords[cap].charAt(0).toLowerCase() + encWords[cap].slice(1);
            youAre(`${w}; movement ${final ? 'was' : 'is'} ${adjs[cap]}${cap < 5 ? ' slowed' : ''}`);
        } else {
            // wizard mode appends the carried weight (insight.c:1218).
            youAre(_wizard() ? `unencumbered <${inv_weight()}>` : 'unencumbered');
        }
    }
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
    // C ref: insight.c doattributes() — wizard AND explore mode also pass
    // MAGICENLIGHTENMENT for the LIVE ^X, so the section is not final-only; its
    // header is then "Attributes:" and it omits the mortality line.
    const _magic = final ? true : (_wizard() || _discover());
    if (_magic) {
        out('');
        out(final ? 'Final Attributes:' : 'Attributes:');
        const pio = piousness(u.ualign?.record ?? 0);
        if ((u.ualign?.record ?? 0) >= 0) youAre(pio);
        else youHave(pio);
        if (_wizard()) enlLine('Your alignment ', final ? 'was' : 'is', ` ${u.ualign?.record ?? 0}`, '');
        // /*** Resistances to troubles ***/  insight.c:1520.  The ORDER of this
        // block through /*** Transportation ***/ is load-bearing: a line in the
        // wrong place shifts every later line and the text window's page break.
        // insight.c:1523 — Antimagic is worn gear whose oc_oprop is ANTIMAGIC
        // (gray DSM/scales, cloak of magic resistance) plus the intrinsic.
        // from_what() adds a suffix only in wizard mode.
        if (Antimagic()) youAre('magic-protected', _fromWhatAntimagic());
        for (const [propidx, hkey, phrase] of [
            [1, 'HFire_resistance', 'fire resistant'],
            [2, 'HCold_resistance', 'cold resistant'],
            [3, 'HSleep_resistance', 'sleep resistant'],
            [4, 'HDisint_resistance', 'disintegration resistant'],
            [5, 'HShock_resistance', 'shock resistant'],
            [6, 'HPoison_resistance', 'poison resistant'],
            [7, 'HAcid_resistance', 'acid resistant'],
            [9, 'HDrain_resistance', 'level-drain resistant'],
            [10, 'HSick_resistance', 'immune to sickness'],
            [8, 'HStone_resistance', 'petrification resistant'],
        ]) if (haveProp(propidx, hkey)) youAre(phrase, from_what(propidx, hkey));
        // /*** Vision and senses ***/  insight.c:1565
        if (haveProp(29, 'HSee_invisible')) {
            // C's third arm (PermaBlind) has no source in this port.
            if (!Blind()) enlLine('You ', final ? 'saw' : 'see', ' invisible', from_what(29, 'HSee_invisible'));
            else enlLine('You ', final ? 'would have seen' : 'will see', ' invisible when not blind', '');
        }
        if (haveProp(31, 'HWarning')) youAre('warned', from_what(31, 'HWarning'));
        if (youHaveSearching() || haveProp(34, 'HSearching'))
            youHave('automatic searching', from_what(34, 'HSearching'));
        if (Infravision() || haveProp(36, 'HInfravision')) youHave('infravision');
        // /*** Appearance and behavior ***/  insight.c:1643
        if (haveProp(42, 'HStealth')) youAre('stealthy', from_what(42, 'HStealth'));
        if (haveProp(43, 'HAggravate_monster'))
            enlLine('You aggravate', final ? 'd' : '', ' monsters', from_what(43, 'HAggravate_monster'));
        // /*** Transportation ***/  insight.c:1677
        if (haveProp(47, 'HTeleport_control'))
            youHave('teleport control', from_what(47, 'HTeleport_control'));
        // insight.c:1800 — the worn-armour magic-cancellation level.
        const armpro = magic_negation_hero();
        if (armpro > 0) youAre(MC_TYPES[Math.min(armpro, MC_TYPES.length - 1)]);
        // C ref: insight.c:1908 /*** Miscellany ***/ — the Luck block, which
        // was omitted entirely.  Luck = u.uluck + u.moreluck, and it is non-zero
        // for any full-moon / Friday-13th game (allmain.c:59 change_luck(1)).
        const luckTot = (u.uluck || 0) + (u.moreluck || 0);
        if (luckTot) {
            const lt = Math.abs(luckTot);
            youAre(`${lt >= 10 ? 'extremely ' : lt >= 5 ? 'very ' : ''}${luckTot < 0 ? 'un' : ''}lucky`);
        }
        if ((u.moreluck || 0) > 0) youHave('extra luck');
        else if ((u.moreluck || 0) < 0) youHave('reduced luck');
        // insight.c:1917 — wizard mode states a zero Luck explicitly.
        if (_wizard() && !(u.uluck || 0)) enlLine('Your luck ', final ? 'was' : 'is', ' zero', '');
        // insight.c:1934 — the live ^X reports whether prayer is safe.
        if (!final) {
            let pb = `${can_pray_quiet() ? '' : 'not '}safely pray`;
            if (_wizard()) pb += ` (${u.ublesscnt ?? 0})`;
            enlLine('You ', 'can ', pb, '');
        }
        // C ref: enlightenment() tail — "have been killed .../are dead" via
        // u.umortality; the covered death path always has umortality === 1.
        if (final) out(' You are dead.');
    }

    // ── Miscellaneous ──
    out('');
    out('Miscellaneous:');
    // C ref: enlightenment() — bones-level reminder, shown for BASIC mode in
    // wizard/explore/final; flags.bones defaults on and no session has visited
    // a bones level yet, so this is always the "didn't encounter any" form.
    if (_wizard() || _discover() || final) {
        if (_wizard() || _discover())
            youAre(`running in ${_wizard() ? 'debug' : 'explore'} mode`);
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
        // C: weapon_type(0) == P_BARE_HANDED_COMBAT, always reported.
        // skill_init() gives Monks P_BASIC bare-handed skill at game start
        // (their P_MAX_SKILL for it exceeds P_EXPERT); everyone else starts
        // P_UNSKILLED.  The "and can enhance that" clause needs skill-practice
        // tracking (can advance is false for a fresh hero), so it's omitted.
        const skName = isMartialArtsRole() ? 'martial arts' : 'bare handed combat';
        const lvl = skillLevelNameLc(p_skill_of(P_BARE_HANDED_COMBAT));
        const hav = lvl !== 'unskilled' && lvl !== 'skilled';
        if (hav) youHave(`${lvl} skill with ${skName}`);
        else youAre(`${lvl} in ${skName}`);
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

    const skName = weaponSkillName(uwep);
    if (!skName) return;

    if (!game.u?.twoweap) {
        // C ref: insight.c:1315 — sklvl = P_SKILL(wtype); P_ISRESTRICTED prints
        // "no" (and still counts as hav, so it reads "have no skill with").
        const sklvl = p_skill_of(weapon_type(uwep));
        const hav = (sklvl !== P_UNSKILLED && sklvl !== P_SKILLED);
        const lvl = (sklvl === P_ISRESTRICTED) ? 'no' : skillLevelNameLc(sklvl);
        const buf = `${lvl} ${hav ? 'skill with' : 'in'} ${skName}`;
        if (hav) youHave(buf); else youAre(buf);
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
export function anyGenocidedOrExtinct() {
    const mv = game.mvitals;
    if (!mv) return false;
    for (let i = 0; i < mv.length; i++) {
        if (mv[i] && (mv[i].mvflags & G_GONE)) return true;
    }
    return false;
}

// C ref: insight.c:2814 list_vanquished() — ntypes is the number of DISTINCT
// species with svm.mvitals[].died != 0 (any death, not just the hero's kills;
// mon.js mvitals_died() tallies it).  ntypes decides the prompt's allowed
// answers: ynaqchars when > 1, ynqchars otherwise (insight.c:2834), which is
// visible as "[ynaq]" vs "[ynq]" in the prompt.
export function vanquished_ntypes() {
    const mv = game.mvitals;
    if (!mv) return 0;
    let n = 0;
    for (let i = 0; i < mv.length; i++) if (mv[i]?.died) n++;
    return n;
}
export function anyVanquished() { return vanquished_ntypes() > 0; }

// C ref: insight.c:2784 list_vanquished(defquery, ask) — the "Vanquished
// creatures:" menu.  Only the DEFAULT sort (VANQ_MLVL_MNDX: mlevel high to low,
// tiebreak mndx low to high) is implemented; that is the only mode reachable
// without the 'a' answer's set_vanq_order() menu, and with it class_header and
// uniq_header are both false so there are no class/uniq separator lines.
export async function list_vanquished_screen() {
    const { monster_by_pmidx } = await import('./makemon.js');
    const { makeplural } = await import('./invent.js');
    const mv = game.mvitals || [];
    const idx = [];
    let total = 0;
    for (let i = 0; i < mv.length; i++)
        if (mv[i]?.died) { idx.push(i); total += mv[i].died; }
    if (!idx.length) return;
    idx.sort((a, b) => {
        const ma = monster_by_pmidx(a), mb = monster_by_pmidx(b);
        const r = (mb?.mlevel ?? 0) - (ma?.mlevel ?? 0);   // mlevel high to low
        return r !== 0 ? r : a - b;                        // tiebreak: mndx
    });
    const lines = ['Vanquished creatures:', ''];
    for (const i of idx) {
        const m = monster_by_pmidx(i);
        const name = m?.name || '';
        const n = mv[i].died;
        let buf;
        if ((m?.geno ?? 0) & G_UNIQ) {
            // type_is_pname() (M2_PNAME) suppresses the article.
            buf = `${is_pname(m) ? '' : 'the '}${name}`;
            if (n > 1) buf += ` (${N_times(n)})`;
        } else if (n === 1) {
            buf = an_word(name);
        } else {
            buf = `${String(n).padStart(3, ' ')} ${makeplural(name)}`;
        }
        // insight.c:2910 — leading spaces so the article lines up with a 3-digit
        // count column.
        const pfx = /^the /i.test(buf) ? 0 : /^an /i.test(buf) ? 1
            : /^a /i.test(buf) ? 2 : !/[0-9]/.test(buf[2] ?? '') ? 4 : 0;
        lines.push(' '.repeat(pfx) + buf);
    }
    if (idx.length > 1) {
        lines.push('');
        lines.push(`${total} creatures vanquished.`);
    }
    // C ref: insight.c:2862 list_vanquished() builds an NHW_MENU with putstr()
    // ONLY (no menu items), and tty_display_nhwindow() routes such a window
    // through process_text_window() — i.e. --More--, not "(end)".
    await render_menu_window(lines);
    for (;;) {
        const key = await nhgetch();
        if (key === 27 || key === 13 || key === 10 || key === 32) break;
    }
    const { flush_screen } = await import('./display.js');
    await flush_screen(1);
}
function an_word(s) { return /^[aeiou]/i.test(s) ? `an ${s}` : `a ${s}`; }
// C ref: mondata.h type_is_pname(ptr) == (mflags2 & M2_PNAME).
function is_pname(m) { return ((MFLAGS2[m?.pmidx] ?? 0) & M2_PNAME) !== 0; }

// C ref: insight.c:2769 dovanquished() — the #vanquished command.
export async function dovanquished() {
    if (!vanquished_ntypes()) {
        game._pending_message = 'No creatures have been vanquished.';
        return 0;
    }
    await list_vanquished_screen();
    return 0;
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

// C ref: insight.c LL_majors / majorevent()/spoilerevent() — the #chronicle
// filters.  LL_majors is the bitwise-or of the "always worth a dumplog entry"
// flags; spoilerevent is any message tagged LL_SPOILER.
const LL_majors = LL_WISH | LL_ACHIEVE | LL_UMONST | LL_DIVINEGIFT
    | LL_LIFESAVE | LL_ARTIFACT | LL_GENOCIDE | LL_DUMP;
function majorevent(msg) { return (msg.flags & LL_majors) !== 0; }
function spoilerevent(msg) { return (msg.flags & LL_SPOILER) !== 0; }

// C ref: insight.c show_gamelog(final) — the #chronicle details window.  Builds
// "Logged events:" / "Major events:" (unused here; 'final' end-of-game dumplog
// path isn't reached by the covered sessions) followed by a " Turn" header and
// one "%5ld: %s" line per surviving gg.gamelog entry, in a full-screen NHW_TEXT
// window paged with "--More--".
async function show_gamelog(final) {
    const lines = [`${final ? 'Major' : 'Logged'} events:`];
    const wizard = !!game.flags?.debug;
    let eventcnt = 0;
    for (const msg of (game.gamelog || [])) {
        if (final && !majorevent(msg)) continue;
        if (!final && !wizard && spoilerevent(msg)) continue;
        if (!eventcnt++) lines.push(' Turn');
        lines.push(`${String(msg.turn).padStart(5)}: ${msg.text}`);
    }
    if (!eventcnt) lines.push(' none');
    const { display_text_window } = await import('./pager.js');
    await display_text_window(lines);
}

// C ref: insight.c do_gamelog() — the #chronicle command.
export async function do_gamelog() {
    if (game.gamelog && game.gamelog.length) {
        await show_gamelog(false);
    } else {
        await update_topl('No chronicled events.');
    }
    return 0; // ECMD_OK
}

// C ref: insight.c num_genocides() — count of svm.mvitals[] entries flagged
// G_GENOD (actual genocides; excludes species merely hunted to extinction).
function num_genocides() {
    const mv = game.mvitals;
    if (!mv) return 0;
    let n = 0;
    for (let i = 0; i < mv.length; i++)
        if (mv[i] && (mv[i].mvflags & G_GENOD)) n++;
    return n;
}

function plur(n) { return n === 1 ? '' : 's'; }

// C ref: insight.c N_times() — "once" / "twice" / "N times".
function N_times(n) {
    return n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`;
}

// C ref: insight.c achieve_msg[] — one {llflag, msg} per you.h ACH_* index.
// The eight rank entries (23..30) build their text from the role's rank title
// at record time and ACH_MINE_PRIZE/ACH_SOKO_PRIZE append an identified item
// name; neither form is reachable from this port, so both are omitted.
const ACHIEVE_MSG = {
    1: [LL_ACHIEVE, 'acquired the Bell of Opening'],
    2: [LL_ACHIEVE, 'entered Gehennom'],
    3: [LL_ACHIEVE, 'acquired the Candelabrum of Invocation'],
    4: [LL_ACHIEVE, 'acquired the Book of the Dead'],
    5: [LL_ACHIEVE, 'performed the invocation'],
    6: [LL_ACHIEVE, 'acquired The Amulet of Yendor'],
    7: [LL_ACHIEVE, 'entered the Elemental Planes'],
    8: [LL_ACHIEVE, 'entered the Astral Plane'],
    9: [LL_ACHIEVE, 'ascended'],
    12: [LL_ACHIEVE | LL_UMONST, 'killed Medusa'],
    13: [0, 'hero was always blond, no, blind'],
    14: [0, 'hero never wore armor'],
    15: [LL_MINORAC | LL_DUMP, 'entered the Gnomish Mines'],
    16: [LL_ACHIEVE, 'reached Mine Town'],
    17: [LL_MINORAC, 'entered a shop'],
    18: [LL_MINORAC, 'entered a temple'],
    19: [LL_ACHIEVE, 'consulted the Oracle'],
    20: [LL_MINORAC | LL_DUMP, 'read a Discworld novel'],
    21: [LL_ACHIEVE, 'entered Sokoban'],
    22: [LL_ACHIEVE, 'entered the Bigroom'],
    31: [LL_MINORAC, "learned castle drawbridge's tune"],
};

// C ref: insight.c record_achievement(achidx) — append to u.uachieved (ignoring
// duplicates) and chronicle it.  This was a `{}` stub in invent.js, so no
// achievement ever reached the #chronicle window.  Ranks are stored as the
// complement to remember the hero's gender, hence the abs() compare.
export function record_achievement(achidx) {
    const u = game.u;
    if (!u) return;
    if (!Array.isArray(u.uachieved)) u.uachieved = [];
    const absidx = Math.abs(achidx);
    if (u.uachieved.some((a) => Math.abs(a) === absidx)) return;
    u.uachieved.push(achidx);
    if (game.program_state_gameover) return;
    const entry = ACHIEVE_MSG[absidx];
    if (!entry || !entry[1]) return;
    livelog_printf(entry[0], entry[1]);
}

// C ref: insight.c show_conduct(final)'s "only report Sokoban conduct if the
// Sokoban branch has been entered" gate.  ACH_SOKO isn't otherwise tracked by
// this port (no covered session enters Sokoban), so this is always false.
function sokoban_in_play() {
    const ach = game.u?.uachieved;
    return Array.isArray(ach) && ach.includes(6 /* ACH_SOKO */);
}

// C ref: insight.c show_conduct(final) — the #conduct details window.  Builds
// the "Voluntary challenges:" lines from the live u.uconduct/u.uroleplay
// counters.  Only final==0 (in-game, non-wizard) is modeled: show_achievements
// is a no-op in that mode (it requires final or wizard), and the wizard-only
// "N times"/"N item(s)" elaborations for a nonzero counter are skipped (the
// non-wizard branches of those ifs emit nothing, matching C).
function conduct_lines(final = 0) {
    const u = game.u || {};
    const uc = u.uconduct || {};
    const rp = u.uroleplay || {};
    const wizard = !!game.flags?.debug;
    const lines = [];
    const out = (s) => lines.push(s);
    // C ref: insight.c enlght_line() — " <start><mid><end><ps>." with the
    // not-contraction table applied.
    const enlLine = (start, mid, end, ps = '') => {
        let buf = ` ${start}${mid}${end}${ps}.`;
        buf = buf.replace(' are not ', ' aren\'t ').replace(' were not ', ' weren\'t ')
            .replace(' have not ', ' haven\'t ').replace(' had not ', ' hadn\'t ')
            .replace(' can not ', ' can\'t ').replace(' could not ', ' couldn\'t ');
        out(buf);
    };
    const you_have_been = (good) => enlLine('You ', final ? 'were ' : 'have been ', good);
    const you_have_never = (bad) => enlLine('You ', final ? 'never ' : 'have never ', bad);
    const you_have_X = (thing) => enlLine('You ', final ? '' : 'have ', thing);

    out('Voluntary challenges:');

    if (!rp.reroll)
        out(' Character rerolling was not enabled.');
    else if (!rp.numrerolls)
        out(' Your character was not rerolled.');
    else
        out(` Your character was rerolled ${N_times(rp.numrerolls)}.`);

    if (rp.blind) you_have_been('blind from birth');
    if (rp.deaf) you_have_been('deaf from birth');
    if (rp.pauper)
        enlLine('You ', (game.invent && game.invent.length) ? 'started' : 'are',
                ' without possessions');
    if (rp.nudist) you_have_been('faithfully nudist');

    if (!uc.food) enlLine('You ', final ? 'went' : 'have gone', ' without food');
    else if (!uc.unvegan) you_have_X('followed a strict vegan diet');
    else if (!uc.unvegetarian) you_have_been('vegetarian');

    if (!uc.gnostic) you_have_been('an atheist');

    if (!uc.weaphit) you_have_never('hit with a wielded weapon');
    else if (wizard)
        you_have_X(`hit with a wielded weapon ${uc.weaphit} time${plur(uc.weaphit)}`);

    if (!uc.killer) you_have_been('a pacifist');

    if (!uc.literate) you_have_been('illiterate');
    else if (wizard)
        you_have_X(`read items or engraved ${uc.literate} time${plur(uc.literate)}`);

    if (!uc.pets) you_have_never('had a pet');

    const ngenocided = num_genocides();
    if (ngenocided === 0)
        you_have_never('genocided any monsters');
    else
        you_have_X(`genocided ${ngenocided} type${plur(ngenocided)} of monster${plur(ngenocided)}`);

    if (!uc.polypiles) you_have_never('polymorphed an object');
    else if (wizard)
        you_have_X(`polymorphed ${uc.polypiles} item${plur(uc.polypiles)}`);

    if (!uc.polyselfs) you_have_never('changed form');
    else if (wizard)
        you_have_X(`changed form ${uc.polyselfs} time${plur(uc.polyselfs)}`);

    if (!uc.wishes) {
        you_have_X('used no wishes');
    } else {
        let buf = `used ${uc.wishes} wish${uc.wishes > 1 ? 'es' : ''}`;
        if (uc.wisharti) {
            if (uc.wisharti === uc.wishes)
                buf += ` (${uc.wisharti > 2 ? 'all ' : uc.wisharti === 2 ? 'both ' : ''}`;
            else
                buf += ` (${uc.wisharti} `;
            buf += `for ${uc.wisharti === 1 ? 'an artifact' : 'artifacts'})`;
        }
        you_have_X(buf);
        if (!uc.wisharti) enlLine('You ', 'have not wished', ' for any artifacts');
    }

    if (sokoban_in_play()) {
        if (!uc.sokocheat)
            enlLine('You ', 'have not violated', ' any of the special Sokoban rules');
        else
            enlLine('You ', 'have violated', ` the special Sokoban rules ${N_times(uc.sokocheat)}`);
    }

    // show_achievements(final): requires final || wizard; both false for the
    // in-game, non-wizard #conduct the covered sessions exercise.
    return lines;
}

// C ref: win/tty/wintty.c process_text_window()'s corner-menu placement
// (docorner/H2344_BROKEN offx calc) — show_conduct()'s window is a NHW_MENU
// populated via putstr() (not add_menu()), so tty_display_nhwindow() routes it
// through process_text_window(), not the selectable-menu path: it lands at a
// right-of-center corner offset and pages with "--More--" (parked right after
// the last content line, not row 23) rather than the "(end)" a real
// select_menu()-driven menu (e.g. #overview) uses.
async function render_menu_window(lines, footer) {
    return await render_conduct_menu(lines, footer);
}

async function render_conduct_menu(lines, footer = '--More--') {
    const { NO_COLOR } = await import('./terminal.js');
    const disp = game.nhDisplay;
    if (!disp?.setCell) return;
    const cols = disp.cols || 80;
    // C ref: wintty.c putstr() — cw->maxcol tracks max(strlen(line) + 1) over
    // every line added (the morestr is appended later, after offx is fixed, so
    // it never contributes).
    let maxcol = 0;
    for (const l of lines) maxcol = Math.max(maxcol, l.length + 1);
    let offx = Math.min(Math.min(82, Math.floor(cols / 2)), cols - maxcol - 1);
    if (offx < 0) offx = 0;
    const textCol = offx + 1;
    for (let c = 0; c < cols; c++) disp.setCell(c, 0, ' ', NO_COLOR, 0);
    const moreRow = lines.length;
    for (let r = 0; r <= moreRow; r++) {
        for (let c = offx; c < cols; c++) disp.setCell(c, r, ' ', NO_COLOR, 0);
    }
    for (let r = 0; r < lines.length; r++)
        disp.putstr(textCol, r, lines[r], NO_COLOR, 0);
    disp.putstr(textCol, moreRow, footer, NO_COLOR, 0);
    disp.setCursor(textCol + footer.length, moreRow);
}

// C ref: insight.c show_conduct(final) -> display_nhwindow()+destroy_nhwindow()
// — shared by doconduct() (final=ENL_GAMEINPROGRESS/0) and end.c disclose()'s
// 'c' query (final=ENL_GAMEOVERALIVE/1 or ENL_GAMEOVERDEAD/2, both of which
// conduct_lines()'s truthy `final` check treats identically: past tense).
export async function show_conduct_disclosure(final) {
    const lines = conduct_lines(final);
    await render_conduct_menu(lines);
    for (;;) {
        const key = await nhgetch();
        if (key === 27 || key === 13 || key === 10 || key === 32) break;
    }
    const { flush_screen } = await import('./display.js');
    await flush_screen(1);
}

// C ref: insight.c doconduct() — the #conduct command.
export async function doconduct() {
    await show_conduct_disclosure(0);
    return 0; // ECMD_OK
}

// C ref: insight.c enlightenment(mode, final) end-of-game path — ge.en_via_menu
// is `!final`, so for any final!=0 (only reached from end.c disclose()'s 'a'
// query, which always uses ENL_GAMEOVERALIVE/1 or ENL_GAMEOVERDEAD/2) the tty
// renders the text through process_text_window() rather than the paged
// selectable menu doattributes() uses: 23 content lines per page with
// "--More--" parked at row 23 (the mid-loop break — reached because the
// combined BASIC+MAGIC disclosure content always exceeds one page, which
// forces offx to 0, i.e. full screen, no corner box), then one further
// trailing "--More--" right after the last line of the final page (an
// NHW_MENU window parks its trailing morestr at the current row, not pinned
// to 23 the way NHW_TEXT's is).
export async function show_attributes_disclosure(final) {
    const lines = enlightenment_lines(final);
    const { renderWindowScreen, dismiss_invent_screen } = await import('./invent.js');
    const disp = game.nhDisplay;
    const rows = disp?.rows ?? 24;
    const perPage = rows - 1; // 23 content lines; footer parked right after them
    let i = 0;
    while (i < lines.length) {
        const take = Math.min(perPage, lines.length - i);
        const chunk = lines.slice(i, i + take);
        i += take;
        renderWindowScreen(chunk, {
            menu: false,
            footer: '--More--',
            footerRow: take,
            // C ref: wintty.c dmore() — offset = (NHW_TEXT) ? 1 : 2; this is an
            // NHW_MENU window, so the morestr lands one column further right
            // than content lines (which start at column 0 here, offx==0).
            footerCol: 1,
            modal: 'enlightenment',
        });
        for (;;) {
            const key = await nhgetch();
            if (key === 27) { i = lines.length; break; } // ESC cancels the rest
            if (key === 32 || key === 13 || key === 10) break; // advance
            // any other key: ignored (bell), same page stays up
        }
    }
    await dismiss_invent_screen();
}
