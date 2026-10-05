import { currentHeroAttribute } from './attrib.js';
// end.js — game-over UX & scoring helpers.
// C refs: src/end.c (done()/really_done()/disclose() tables and score
// arithmetic), src/role.c Goodbye(), src/objnam.c just_an()/an() articles.

import { game } from './gstate.js';
import { depth as depthOfLevel } from './hacklib.js';
import { A_CON, A_MAX } from './const.js';

// end.c:savelife and attrib.c:minuhpmax/setuhpmax. Callers apply any amulet
// Constitution loss first and handle status cures, expulsion and messages.
export function restoreLifeSavedBody(u = game.u) {
    if (!u) return;
    u.ulevel = Math.max(1, u.ulevel || 1);
    const minimum = Math.max(u.ulevel, 10);
    if ((u.uhpmax || 0) < minimum) {
        u.uhpmax = minimum;
        u.uhppeak = Math.max(u.uhppeak || 0, minimum);
    }
    const con = currentHeroAttribute(A_CON, u === game.u ? game : { u });
    const givehp = 50 + 10 * Math.trunc(con / 2);
    u.uhp = Math.min(u.uhpmax, givehp);
    if ((u._polyself_form || u.Upolyd || u.polymorphed) && u.mhmax != null)
        u.mh = Math.min(u.mhmax, givehp);
    u.unchanging = false; // HUnchanging only; worn amulets remain active.
}

// end.c:727-736: done returns into its caller, with unmul due this turn.
export function scheduleLifeSavingRecovery() {
    game.context ??= {};
    game.context.move = 0;
    game.multi = -1;
    game._helpless_time = 1;
    game._wake_message = 'You survived that attempt on your life.';
    game.multi_reason = game._startup_role === 'Tourist'
        ? 'being toyed with by Fate' : 'attempting to cheat Death';
    if (game._queued_explore_lifesaving_message) {
        game._queued_message_after_more = '';
        game._queued_explore_lifesaving_message = 0;
        game._pending_explore_lifesaving_message = 0;
        game._survivor_emit_after_moves = 0;
        game._survivor_via_search_stop = 0;
    }
}

const GOLD_PIECE = 466; // object id for gold zorkmids (mirrors allmain.js/cmd.js)

// C ref: enum game_end_types (hack.h:481-498).
export const DIED = 0;
export const CHOKING = 1;
export const POISONING = 2;
export const STARVING = 3;
export const DROWNING = 4;
export const BURNING = 5;
export const DISSOLVED = 6;
export const CRUSHING = 7;
export const STONING = 8;
export const TURNED_SLIME = 9;
export const GENOCIDED = 10;
export const PANICKED = 11;
export const TRICKED = 12;
export const QUIT = 13;
export const ESCAPED = 14;
export const ASCENDED = 15;

// C ref: killer formats (hack.h:602-604, struct kinfo hack.h:595-599).
export const KILLED_BY_AN = 0;
export const KILLED_BY = 1;
export const NO_KILLER_PREFIX = 2;

// C ref: deaths[] "the array of death" (end.c:44-50).
export const DEATHS = [
    'died', 'choked', 'poisoned', 'starvation', 'drowning', 'burning',
    'dissolving under the heat and pressure', 'crushed', 'turned to stone',
    'turned into slime', 'genocided', 'panic', 'trickery', 'quit',
    'escaped', 'ascended',
];

// C ref: ends[] ("when you %s", end.c:52-61).
export const ENDS = [
    'died', 'choked', 'were poisoned',
    'starved', 'drowned', 'burned',
    'dissolved in the lava',
    'were crushed', 'turned to stone',
    'turned into slime', 'were genocided',
    'panicked', 'were tricked', 'quit',
    'escaped', 'ascended',
];

// C ref: disclosure option categories queried by disclose() (end.c:626-708)
// and the disclose option string format (options.c "disclose" compound).
export const DISCLOSE_PROMPTS = Object.freeze({
    possessions: (taken, how) => taken
        ? `Do you want to see what you had when you ${how === QUIT ? 'quit' : 'died'}?`
        : 'Do you want your possessions identified?',
    attributes: 'Do you want to see your attributes?',
    overview: 'Do you want to see the dungeon overview?',
});

// C ref: Goodbye() (role.c:2142-2157).  Note: this is the *farewell*
// (Valkyrie -> "Farvel"); the "Velkommen" greeting belongs to Hello()
// (role.c:2133-2140), already used by the new-game intro elsewhere.
export function Goodbye(roleName) {
    switch (roleName) {
    case 'Knight': return 'Fare thee well'; /* Olde English */
    case 'Samurai': return 'Sayonara'; /* Japanese */
    case 'Tourist': return 'Aloha'; /* Hawaiian */
    case 'Valkyrie': return 'Farvel'; /* Norse */
    default: return 'Goodbye';
    }
}

// C ref: just_an() (objnam.c:2108-2141) — pick "", "a ", or "an ".
const VOWELS = 'aeiou';
export function justAn(str) {
    if (!str) return 'a ';
    const c0 = str[0].toLowerCase();
    if (str.length === 1 || str[1] === ' ') {
        /* single letter; might be used for named fruit or a musical note */
        return 'aefhilmnosx'.includes(c0) ? 'an ' : 'a ';
    }
    const lc = str.toLowerCase();
    if (lc.startsWith('the ')
        /* these probably shouldn't be handled here (matches C) */
        || lc === 'molten lava'
        || lc === 'iron bars'
        || lc === 'ice') {
        return '';
    }
    /* normal case is "an <vowel>" or "a <consonant>", with exceptions */
    if ((VOWELS.includes(c0)
            /* 'wun' initial sound */
            && (!lc.startsWith('one') || (str.length > 3 && !'-_ '.includes(str[3])))
            /* long 'u' initial sound */
            && !lc.startsWith('eu') /* "eucalyptus leaf" */
            && !lc.startsWith('uke') && !lc.startsWith('ukulele')
            && !lc.startsWith('unicorn') && !lc.startsWith('uranium')
            && !lc.startsWith('useful')) /* "useful tool" */
        || (c0 === 'x' && !VOWELS.includes(str[1].toLowerCase()))) {
        return 'an ';
    }
    return 'a ';
}

// C ref: an() (objnam.c:2143-2155).
export function an(str) {
    if (!str) return 'an []';
    return justAn(str) + str;
}

// C ref: wordcount() (end.c:1726-1739).
function wordcount(text) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    return words.length;
}

// C ref: build_english_list() (end.c:1703-1749) —
// "single", "first or second", "first, second, or third".
export function buildEnglishList(text) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    switch (wordcount(text)) {
    case 0:
        return ''; /* impossible("no words in list") */
    case 1:
        return words[0];
    case 2:
        return `${words[0]} or ${words[1]}`;
    default:
        return `${words.slice(0, -1).join(', ')}, or ${words[words.length - 1]}`;
    }
}

// C ref: done_in_by() core killer attribution (end.c:184-343), covering the
// generic non-unique monster case plus the table-driven prefixes done()
// fills when the caller hasn't set a killer (end.c:1070-1077).  The caller
// still stores the resulting string in game._death_cause.
export function doneInBy(mon, { invisible = false, hallucinated = false } = {}) {
    const name = String(mon?.data?.name || mon?.name || 'monster');
    const unique = mon?.data?.unique || mon?.data?.guNiq || false;
    const pname = unique || /^[A-Z"']/.test(name); /* type_is_pname approximation */
    let txt = '';
    let format = KILLED_BY_AN;
    if (unique) {
        if (!pname) txt += 'the ';
        format = KILLED_BY;
    }
    if (invisible) txt += 'invisible ';
    if (hallucinated) txt += 'hallucinogen-distorted ';
    txt += name;
    return { format, name: txt, text: format === KILLED_BY_AN ? `killed by ${an(txt)}` : `killed by ${txt}` };
}

// C ref: really_done() score block (end.c:1284-1310) —
// total = uexp + max(0, gold - gold0) [less 10% unless panic/esc/quit...]
//       + deepest-level bonuses [+ ascension multiplier].
export function computeEndScore({ uexp = 0, gold = 0, initialGold = 0,
                                  deepest = 1, how = DIED,
                                  alignOriginal = null, alignBaseCurrent = null,
                                  alignBaseOriginal = null } = {}) {
    let score = uexp + 0;
    let tmp = Math.max(0, gold - initialGold);
    /* done with a PANICKED crash doesn't cost 10% of gold loot */
    if (how < PANICKED)
        tmp -= Math.trunc(tmp / 10);
    tmp += 50 * (deepest - 1);
    if (deepest > 20)
        tmp += 1000 * ((deepest > 30) ? 10 : deepest - 20);
    score += tmp;
    /* ascension gives a score bonus iff offering to original deity */
    if (how === ASCENDED && alignBaseCurrent !== null && alignOriginal !== null
        && alignBaseCurrent === alignOriginal) {
        /* retaining original alignment: score *= 2; */
        tmp = (alignBaseOriginal === alignOriginal) ? score : Math.trunc(score / 2);
        score += tmp;
    }
    return score;
}

// Deepest level reached in the current dungeon branch, in depth() terms
// (mirrors deepest_lev_reached(FALSE)-usage at end.c:1285; the JS engine
// tracks visited branch levels via game._saved_levels).
function deepestLevReached() {
    const uz = game.u?.uz || { dnum: 0, dlevel: 1 };
    const dnum = uz.dnum ?? 0;
    let deepest = game.u?._displayDepth || depthOfLevel(uz);
    for (const key of game._saved_levels?.keys?.() || []) {
        const [savedDnum, savedLevel] = String(key).split(':').map(Number);
        if (savedDnum === dnum)
            deepest = Math.max(deepest, depthOfLevel({ dnum: savedDnum, dlevel: savedLevel }));
    }
    return deepest;
}

// Carried + container-contained gold (end.c:1287-1290: money_cnt(invent)
// + hidden_gold(TRUE)).
function endGameMoney() {
    const carriedGold = game._goldCount
        ?? (game.inventory || []).find(item => item.letter === '$' || item.cls === 'coin')?.quan
        ?? 0;
    let hiddenGold = 0;
    const contained = (game.inventory || []).flatMap(item => item.contents || []);
    while (contained.length) {
        const item = contained.pop();
        if (item.otyp === GOLD_PIECE || item.cls === 'coin' || item.glyph === '$') hiddenGold += item.quan || 1;
        contained.push(...(item.contents || []));
    }
    return carriedGold + hiddenGold;
}

// deathSummary() — gathers the fields the end-of-game screens need, matching
// really_done()'s data sources (end.c:955+).  score/datum selection matches
// the historical cmd.js slice exactly (verified byte-against the recorded
// death screens of sessions/seed0030).
export function deathSummary() {
    const genderKey = game.flags?.female ? 'f' : 'm';
    const role = game.urole?.name?.[genderKey] || game.urole?.name?.m || game._startup_role || 'Adventurer';
    const rank = game.urole?.rank?.[genderKey] || game.urole?.rank?.m || role;
    const name = game.plname || 'Hero';
    const race = game.urace?.adj || game._startup_race || 'human';
    const gender = game.flags?.female ? 'female' : 'male';
    const align = game.u?.ualign?.type > 0 ? 'lawful' : game.u?.ualign?.type < 0 ? 'chaotic' : 'neutral';
    const stats = Array.from({ length: A_MAX }, (_, index) => currentHeroAttribute(index));
    const dungeon = game.level?.flags?.tutorial_level
        ? 'The Tutorial'
        : game.dungeons?.[game.u?.uz?.dnum ?? 0]?.name || 'The Dungeons of Doom';
    const depth = game.u?._displayDepth || depthOfLevel(game.u?.uz || { dnum: 0, dlevel: 1 });
    const gold = endGameMoney();
    const cause = game._death_cause || 'died';
    const deepest = deepestLevReached();
    const score = computeEndScore({
        uexp: game.u?.urexp || 0,
        gold,
        initialGold: game._initialGoldCount || 0,
        deepest,
        how: DIED,
    });
    return {
        role, rank, name, race, gender, align, stats, dungeon, depth, gold, cause,
        maxlvl: deepest,
        score,
        level: game.u?.ulevel || 1,
        hp: Math.max(0, game.u?.uhp || 0),
        hpmax: game.u?.uhpmax || 1,
        en: game.u?.uen || 0,
        enmax: game.u?.uenmax || 0,
        ac: game.u?.uac ?? 10,
        turns: game._death_moves || game.moves || 1,
        exp: game.u?.uexp || 0,
        outsideDungeon: game._death_outside_dungeon || '',
    };
}

function plurText(n) { return n === 1 ? '' : 's'; }

// End-of-game farewell + summary text below the tombstone
// (really_done() final putstr block: end.c:1572-1708).
export function farewellRow(dsum) {
    return `${Goodbye(dsum.role)} ${dsum.name} the ${dsum.role}...`;
}

function deathEnds(dsum) {
    if (dsum.outsideDungeon === 'heaven') return 'passed away';
    // ends[how]: current slice only exercises DIED/BURNING ("burned by").
    return dsum.cause.startsWith('burned by') ? ENDS[BURNING] : ENDS[DIED];
}

// "You died in The Dungeons of Doom on dungeon level 3 with 124 points,
//  and 420 pieces of gold, after 44 moves.
//  You were level 1 with a maximum of 10 hit points when you died."
export function deathSummaryRows(dsum) {
    const verb = deathEnds(dsum);
    const place = dsum.outsideDungeon
        ? 'beyond the confines of the dungeon'
        : `in ${dsum.dungeon} on dungeon level ${dsum.depth}`;
    return [
        `You ${verb} ${place} with ${dsum.score} point${plurText(dsum.score)},`,
        `and ${dsum.gold} piece${plurText(dsum.gold)} of gold, after ${dsum.turns} move${plurText(dsum.turns)}.`,
        `You were level ${dsum.level} with a maximum of ${dsum.hpmax} hit point${plurText(dsum.hpmax)} when you ${verb}.`,
    ];
}

// Escape-with-amulet-less case (really_done ESCAPED branch: end.c:1584-1705;
// valuables listing is only reachable on ASCENDED/ESCAPED runs and the
// current slice has no recorded coverage for it).
export function escapedSummaryRows(dsum) {
    return [
        farewellRow(dsum),
        '',
        `You escaped from the dungeon with ${dsum.score} point${plurText(dsum.score)},`,
        `and ${dsum.gold} piece${plurText(dsum.gold)} of gold, after ${dsum.turns} move${plurText(dsum.turns)}.`,
        `You were level ${dsum.level} with a maximum of ${dsum.hpmax} hit point${plurText(dsum.hpmax)} when you escaped.`,
    ];
}

// Overlay rows for escaped games ([row, col, text]; historically cmd.js
// escapedSummaryLines()).
export function escapedSummaryLines() {
    const rows = escapedSummaryRows(deathSummary());
    return [
        [0, 0, rows[0]],
        [2, 0, rows[2]],
        [3, 0, rows[3]],
        [4, 0, rows[4]],
        [23, 0, '--More--'],
    ];
}

// Overlay rows for "#quit" (really_done with how==QUIT; no tombstone —
// end.c:1547 `if (how < GENOCIDED && flags.tombstone) outrip(...)`).
export function quitSummaryLines() {
    const dsum = deathSummary();
    return [
        [0, 0, farewellRow(dsum)],
        [2, 0, `You quit in ${dsum.dungeon} on dungeon level ${dsum.depth} with ${dsum.score} point${plurText(dsum.score)},`],
        [3, 0, `and ${dsum.gold} piece${plurText(dsum.gold)} of gold, after ${dsum.turns} move${plurText(dsum.turns)}.`],
        [4, 0, `You were level ${dsum.level} with a maximum of ${dsum.hpmax} hit point${plurText(dsum.hpmax)} when you quit.`],
        [23, 0, '--More--'],
    ];
}
