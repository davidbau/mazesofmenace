// offer.js — #offer command: sacrificing corpses on altars.
// C ref: src/pray.c:dosacrifice(), offer_corpse(), eval_offering(),
// sacrifice_value(), consume_offering(), offer_different_alignment_altar(),
// offer_negative_valued(), gods_upset(), desecrate_altar(); macros
// on_altar()/on_shrine()/a_align()/ugod_is_angry() from src/pray.c:103-107.
// Deferred to later slices (result.deferred lists them): feel_cockatrice(),
// rider_corpse_revival(), sacrifice_your_race() (demon summoning),
// bestow_artifact() gift drop, summon_minion(), angry_priest(), and all
// divine-wrath effects (angrygods()/god_zaps_you()).

import { game } from './gstate.js';
import {
    ALTAR, AM_MASK, AM_SANCTUM, AM_SHRINE, A_CHAOTIC, A_LAWFUL, A_MAX,
    A_NEUTRAL, A_NONE, A_WIS, Align2amask, Amask2align, LUCKMAX,
    LUCKMIN,
} from './const.js';
import { rn2, rnd, rnl, rn2_on_display_rng } from './rng.js';

// object type id for corpses (matches the local const in cmd.js/mklev.js)
const CORPSE = 471;

// C ref: src/pray.c:1979 #define MAXVALUE 24
const MAXVALUE = 24;

// C ref: include/align.h:17 #define ALIGNLIM (10L + (svm.moves / 200L))
function alignLimit() {
    return 10 + Math.trunc((game.moves || 0) / 200);
}

function alignmentTypeFromValue(value) {
    if (value === A_LAWFUL || value === A_NEUTRAL || value === A_CHAOTIC) return value;
    const name = String(value ?? '').toLowerCase();
    if (name === 'lawful') return A_LAWFUL;
    if (name === 'neutral') return A_NEUTRAL;
    if (name === 'chaotic') return A_CHAOTIC;
    return null;
}

function heroAlign() {
    return alignmentTypeFromValue(game.u?.ualign?.type) ?? A_NEUTRAL;
}

function heroHallucinating() {
    return !!game.u?.hallucinating || !!game.u?.hallu
        || (game.u?._statusSuffix || '').includes('Hallu');
}

function heroBlind() {
    return !!game.u?.blind || (game.u?._statusSuffix || '').includes('Blind');
}

function heroInGehennom() {
    return !!(game.dungeons?.[game.u?.uz?.dnum]?.name === 'Gehennom'
        || game.level?.flags?.gehennom);
}

function heroLoc() {
    return game.level?.at?.(game.u?.ux || 0, game.u?.uy || 0);
}

function altarMask(loc) {
    return loc?.altarmask ?? loc?.flags ?? 0;
}

// C ref: src/pray.c:105 on_altar() (also false while swallowed)
export function heroOnAltar() {
    return !game.u?.uswallow && heroLoc()?.typ === ALTAR;
}

// C ref: src/pray.c:107 a_align(x, y)
export function altarAlignAt(x = game.u?.ux || 0, y = game.u?.uy || 0) {
    const loc = game.level?.at?.(x, y);
    if (loc?.typ !== ALTAR) return A_NONE;
    return Amask2align(altarMask(loc) & AM_MASK);
}

// C ref: src/pray.c:1867 highaltar = (levl[u.ux][u.uy].altarmask & AM_SANCTUM)
export function isHighAltarAt(x = game.u?.ux || 0, y = game.u?.uy || 0) {
    return (altarMask(game.level?.at?.(x, y)) & AM_SANCTUM) !== 0;
}

// Pantheon table matching the GODS_BY_ROLE copies in cmd.js/allmain.js.
// C ref: src/pray.c:align_gname() via role pantheons (prayer.c rolegod.h data).
const OFFER_GODS_BY_ROLE = {
    Archeologist: ['Quetzalcoatl', 'Camaxtli', 'Huhetotl'],
    Barbarian: ['Mitra', 'Crom', 'Set'],
    Caveman: ['Anu', 'Ishtar', 'Anshar'],
    Healer: ['Athena', 'Hermes', 'Poseidon'],
    Knight: ['Lugh', 'Brigit', 'Manannan Mac Lir'],
    Monk: ['Shan Lai Ching', 'Chih Sung-tzu', 'Huan Ti'],
    Priest: ['Mitra', 'Crom', 'Set'],
    Ranger: ['Mercury', 'Venus', 'Mars'],
    Rogue: ['Issek', 'Mog', 'Kos'],
    Samurai: ['Amaterasu Omikami', 'Raijin', 'Susanowo'],
    Tourist: ['Blind Io', 'The Lady', 'Offler'],
    Valkyrie: ['Tyr', 'Odin', 'Loki'],
    Wizard: ['Ptah', 'Thoth', 'Anhur'],
};

// C ref: src/pray.c:align_gname()
export function alignGodName(align) {
    if (align === A_NONE) return 'Moloch';
    let role = game.urole?.name?.m || game._startup_role || 'Barbarian';
    if (role === 'Priest') role = game._pantheon_role || 'Barbarian';
    const gods = OFFER_GODS_BY_ROLE[role] || ['Marduk', 'Marduk', 'Marduk'];
    return gods[align === A_LAWFUL ? 0 : align === A_CHAOTIC ? 2 : 1];
}

// C ref: src/pray.c:u_gname() — god of the hero's current alignment
function heroGodName() {
    return alignGodName(heroAlign());
}

// C ref: src/pray.c:60 godvoices[] with ROLL_FROM (rn2(4))
const GOD_VOICES = ['booms out', 'thunders', 'rings out', 'booms'];

// C ref: src/pray.c:godvoice()
function godvoice(align, words) {
    return `The voice of ${alignGodName(align)} ${GOD_VOICES[rn2(GOD_VOICES.length)]}: "${words}"`;
}

// C ref: src/do_name.c:hcolor() — random hallu color uses the display RNG
const HALLUCINATED_COLORS = [
    'ultraviolet', 'infrared', 'bluish-orange', 'reddish-green', 'dark white',
    'light black', 'sky blue-pink', 'pinkish-cyan', 'indigo-chartreuse',
    'salty', 'sweet', 'sour', 'bitter', 'umami',
    'striped', 'spiral', 'swirly', 'plaid', 'checkered', 'argyle', 'paisley',
    'blotchy', 'guernsey-spotted', 'polka-dotted', 'square', 'round',
    'triangular', 'cabernet', 'sangria', 'fuchsia', 'wisteria', 'lemon-lime',
    'strawberry-banana', 'peppermint', 'romantic', 'incandescent',
    'octarine',
    'excitingly dull', 'mauve', 'electric',
    'neon', 'fluorescent', 'phosphorescent', 'translucent', 'opaque',
    'psychedelic', 'iridescent', 'rainbow-colored', 'polychromatic',
    'colorless', 'colorless green',
    'dancing', 'singing', 'loving', 'loudy', 'noisy', 'clattery', 'silent',
    'apocyan', 'infra-pink', 'opalescent', 'violant', 'tuneless',
    'viridian', 'aureolin', 'cinnabar', 'purpurin', 'gamboge', 'madder',
    'bistre', 'ecru', 'fulvous', 'tekhelet', 'selective yellow',
];

function hcolor(colorpref) {
    return heroHallucinating() || !colorpref
        ? HALLUCINATED_COLORS[rn2_on_display_rng(HALLUCINATED_COLORS.length)]
        : colorpref;
}

// C ref: src/attrib.c:change_luck()
function changeLuck(n) {
    const u = game.u;
    if (!u || !n) return;
    const next = (u.uluck || 0) + n;
    u.uluck = next < 0 ? Math.max(next, LUCKMIN) : next > 0 ? Math.min(next, LUCKMAX) : 0;
}

// C ref: src/attrib.c:adjalign() (adj_erinys() only tunes erinys flags; no RNG)
export function adjAlign(n) {
    const u = game.u;
    if (!u?.ualign || !n) return;
    const record = u.ualign.record || 0;
    const next = record + n;
    if (n < 0) {
        if (next < record) u.ualign.record = next;
        u.ualign.abuse = (u.ualign.abuse || 0) - n;
    } else if (next > record) {
        u.ualign.record = Math.min(next, alignLimit());
    }
}

// C ref: src/attrib.c:exercise(A_WIS, ...) — AVAL cap is 50 in 5.0
function exerciseWisdom(increase) {
    const u = game.u;
    if (!u) return;
    u._aexe ??= Array(A_MAX).fill(0);
    if (Math.abs(u._aexe[A_WIS] || 0) >= 50) return;
    const current = u.acurr?.a?.[A_WIS] ?? 10;
    if (increase) u._aexe[A_WIS] += rn2(19) > current ? 1 : 0;
    else u._aexe[A_WIS] -= rn2(2);
}

// C ref: src/attrib.c:adjattrib(A_WIS, n, TRUE) — message-suppressed loss
function adjWisdom(n) {
    const u = game.u;
    if (!u?.acurr?.a || !n) return;
    u.acurr.a[A_WIS] = Math.max(3, (u.acurr.a[A_WIS] ?? 10) + n);
}

function isCorpseObject(obj) {
    return obj?.otyp === CORPSE || obj?.otyp === 'corpse';
}

// C ref: include/mondata.h:95 is_undead() (M2_UNDEAD); JS monster data is
// sparse, so mirror the undead classes by glyph and name.
function isUndeadCorpseData(data) {
    const glyph = String(data?.mlet || data?.glyph || '');
    const name = String(data?.name || '').toLowerCase();
    return !!(data?.undead
        || glyph === 'Z' || glyph === 'M' || glyph === 'V' || glyph === 'W' || glyph === 'L'
        || name.includes('zombie') || name.includes('mummy') || name.includes('vampire')
        || name.includes('wraith') || name.includes('lich') || name.includes('ghost')
        || name.includes('shade') || name === 'nazgul' || name.includes('barrow wight'));
}

// C ref: include/mondata.h:149 is_unicorn() — S_UNICORN plus likes_gems;
// horses share the glyph, so discriminate by name/flag.
function isUnicornData(data) {
    const name = String(data?.name || '').toLowerCase();
    return !!(data?.likesGems || data?.likes_gems || /^(white|gray|black) unicorn$/.test(name));
}

// C ref: include/mondata.h:102 your_race() — corpse of the hero's own race
function corpseMatchesHeroRace(data) {
    const race = String(game.urace?.noun || game.urace?.name || game._startup_race || 'human').toLowerCase();
    const name = String(data?.name || '').toLowerCase();
    if (!name) return false;
    if (race === 'elf') return name.includes('elf');
    if (race === 'dwarf') return name.startsWith('dwarf');
    if (race === 'gnome') return name.startsWith('gnom');
    if (race === 'orc') return /orc|goblin|bugbear/.test(name);
    return name === 'human' || name.startsWith('human ') || /^were/.test(name);
}

// C ref: src/eat.c:eaten_stat() — scale value down for partly eaten corpses
function eatenValue(base, otmp) {
    const data = otmp?.corpsenm || {};
    const full = Math.trunc(Number(data?.cnutrit ?? otmp?.nutrition ?? 0));
    let uneaten = Math.trunc(Number(otmp?.oeaten ?? 0));
    if (uneaten > full) uneaten = full;
    const scaled = full ? Math.trunc((base * uneaten) / full) : 0;
    return scaled < 1 ? 1 : scaled;
}

// C ref: src/pray.c:1839 sacrifice_value()
export function sacrificeValue(otmp) {
    const data = otmp?.corpsenm || {};
    const name = String(data?.name || '').toLowerCase();
    const age = Number(otmp?.age || 0);
    if (name === 'acid blob' || (game.moves || 1) <= age + 50) {
        let value = (Number(data?.difficulty ?? data?.mlevel ?? 0) || 0) + 1;
        if (otmp?.oeaten) value = eatenValue(value, otmp);
        return value;
    }
    return 0;
}

// C ref: src/pray.c:consume_offering()
function consumeOffering(otmp, result) {
    if (heroHallucinating()) {
        switch (rn2(3)) {
        case 0:
            result.messages.push('Your sacrifice sprouts wings and a propeller and roars away!');
            break;
        case 1:
            result.messages.push('Your sacrifice puffs up, swelling bigger and bigger, and pops!');
            break;
        default:
            result.messages.push('Your sacrifice collapses into a cloud of dancing particles and fades away!');
            break;
        }
    } else if (heroBlind() && heroAlign() === A_LAWFUL) {
        result.messages.push('Your sacrifice disappears!');
    } else {
        const how = heroAlign() === A_LAWFUL
            ? 'flash of light'
            : heroAlign() === A_NEUTRAL ? 'plume of smoke' : 'burst of flame';
        result.messages.push(`Your sacrifice is consumed in a ${how}!`);
    }
    result.consumed = true; // caller performs the useup()/useupf() equivalent
    exerciseWisdom(true);
}

// C ref: src/pray.c:gods_upset() — anger bookkeeping; divine wrath deferred
function godsUpset(gAlign, result) {
    const u = game.u;
    if (gAlign === heroAlign()) u.ugangr = (u.ugangr || 0) + 1;
    else if (u.ugangr) u.ugangr--;
    result.deferred.push('angrygods');
}

// C ref: src/pray.c:offer_negative_valued()
function offerNegativeValued(highaltar, altaralign, result) {
    if (altaralign !== heroAlign() && highaltar) desecrateAltar(highaltar, altaralign, result);
    else godsUpset(altaralign, result);
}

// C ref: src/pray.c:desecrate_altar() — god_zaps_you() deferred
function desecrateAltar(highaltar, altaralign, result) {
    const u = game.u;
    if (altaralign === heroAlign()) {
        adjAlign(-20);
        u.ugangr = (u.ugangr || 0) + 5;
    }
    result.messages.push('You feel the air around you grow charged...');
    result.messages.push(`Suddenly, you realize that ${alignGodName(altaralign)} has noticed you...`);
    result.messages.push(godvoice(altaralign, `So, mortal!  You dare desecrate my ${highaltar ? 'High Temple' : 'altar'}!`));
    result.deferred.push('god_zaps_you');
}

// C ref: src/pray.c:eval_offering()
function evalOffering(otmp, altaralign, result) {
    let value = sacrificeValue(otmp);
    if (!value) return 0;
    const data = otmp?.corpsenm || {};
    const ualign = heroAlign();
    if (isUndeadCorpseData(data)) {
        // only wraith corpses keep the bonus for non-vegetarian chaotics
        if (ualign !== A_CHAOTIC
            || (String(data?.name || '').toLowerCase() === 'wraith'
                && (game.u?.uconduct?.unvegetarian || 0) > 0))
            value += 1;
    } else if (isUnicornData(data)) {
        const unicalign = Math.sign(Number(data?.maligntyp ?? 0));
        if (unicalign === altaralign) {
            result.messages.push(`Such an action is an insult to ${
                unicalign === A_CHAOTIC ? 'chaos' : unicalign ? 'law' : 'balance'}!`);
            adjWisdom(-1);
            return -1;
        } else if (ualign === altaralign) {
            if ((game.u?.ualign?.record || 0) < alignLimit())
                result.messages.push(`You feel appropriately ${
                    ualign === A_LAWFUL ? 'lawful' : ualign === A_CHAOTIC ? 'chaotic' : 'neutral'}.`);
            else result.messages.push('You feel you are thoroughly on the right path.');
            adjAlign(5);
            value += 3;
        } else if (unicalign === ualign) {
            game.u.ualign.record = -1;
            value = 1;
        } else {
            value += 3;
        }
    }
    return value;
}

// C ref: src/attrib.c:uchangealign(newalign, A_CG_CONVERT)
function changeAlignConvert(newAlign, result) {
    const u = game.u;
    u.ualign ??= { type: newAlign, record: 0 };
    const oldAlign = heroAlign();
    u.ublessed = 0;
    u._ualignbase_current = newAlign;
    const helmBlocks = (game.inventory || []).some(item => item.worn
        && /helm of opposite alignment/i.test(String(item.kind || item.actualKind || '')));
    if (!helmBlocks) u.ualign.type = newAlign;
    result.messages.push(`You have a ${u.ualign.type !== oldAlign ? 'sudden ' : ''}sense of a new direction.`);
    if (u.ualign.type !== oldAlign) u.ualign.record = 0;
}

function currentAlignBase() {
    return alignmentTypeFromValue(
        game.u?._ualignbase_current ?? game.u?.ualignbase?.current ?? game.u?.ualignbase?.[0],
    ) ?? heroAlign();
}

function originalAlignBase() {
    return alignmentTypeFromValue(
        game.u?._ualignbase_original ?? game.u?.ualignbase?.original ?? game.u?.ualignbase?.[1],
    ) ?? currentAlignBase();
}

// C ref: src/pray.c:offer_different_alignment_altar()
// summon_minion()/angry_priest() are deferred; their gate rolls (rnl/rnd)
// still run in C's order so the RNG stream matches when no minion appears.
function offerDifferentAlignmentAltar(otmp, altaralign, result) {
    const u = game.u;
    const ualign = heroAlign();
    if ((u.ualign?.record || 0) < 0 || (altaralign === A_NONE && heroInGehennom())) {
        if (currentAlignBase() === originalAlignBase() && altaralign !== A_NONE) {
            result.messages.push(`You have a strong feeling that ${heroGodName()} is angry...`);
            consumeOffering(otmp, result);
            result.messages.push(`${alignGodName(altaralign)} accepts your allegiance.`);
            changeAlignConvert(altaralign, result);
            changeLuck(-3);
            u.ublesscnt = (u.ublesscnt || 0) + 300;
        } else {
            u.ugangr = (u.ugangr || 0) + 3;
            adjAlign(-5);
            result.messages.push(`${alignGodName(altaralign)} rejects your sacrifice!`);
            result.messages.push(godvoice(altaralign, 'Suffer, infidel!'));
            changeLuck(-5);
            adjWisdom(-2);
            if (!heroInGehennom()) result.deferred.push('angrygods');
        }
        return;
    }
    consumeOffering(otmp, result);
    result.messages.push(`You sense a conflict between ${heroGodName()} and ${alignGodName(altaralign)}.`);
    if (rn2(8 + (u.ulevel || 1)) > 5) {
        result.messages.push(`You feel the power of ${heroGodName()} increase.`);
        exerciseWisdom(true);
        changeLuck(1);
        const loc = heroLoc();
        const shrine = (altarMask(loc) & AM_SHRINE) !== 0; // C: on_shrine()
        const mask = Align2amask(ualign) | (shrine ? AM_SHRINE : 0);
        if (loc) {
            loc.altarmask = mask;
            loc.flags = mask;
        }
        result.newsym = true;
        if (!heroBlind()) {
            const color = ualign === A_LAWFUL ? 'white' : ualign !== A_NEUTRAL ? 'black' : 'gray';
            result.messages.push(`The altar glows ${hcolor(color)}.`);
        }
        if (rnl(u.ulevel || 1) > 6 && (u.ualign?.record || 0) > 0
            && rnd(u.ualign.record) > Math.trunc((3 * alignLimit()) / 4))
            result.deferred.push('summon_minion');
        // C: findpriest(temple_occupied(u.urooms)) && angry_priest() — deferred
    } else {
        result.messages.push(`Unluckily, you feel the power of ${heroGodName()} decrease.`);
        changeLuck(-1);
        exerciseWisdom(false);
        if (rnl(u.ulevel || 1) > 6 && (u.ualign?.record || 0) > 0
            && rnd(u.ualign.record) > Math.trunc((7 * alignLimit()) / 8))
            result.deferred.push('summon_minion');
    }
}

// C ref: src/pray.c:offer_corpse() brownie-points tail (coaligned altars)
function coalignedSacrificeReward(value, result) {
    const u = game.u;
    const ualign = heroAlign();
    if (u.ugangr) {
        const savedAnger = u.ugangr;
        u.ugangr -= Math.trunc((value * (ualign === A_CHAOTIC ? 2 : 3)) / MAXVALUE);
        if (u.ugangr < 0) u.ugangr = 0;
        if (u.ugangr !== savedAnger) {
            if (u.ugangr) {
                result.messages.push(`${heroGodName()} seems ${heroHallucinating() ? 'groovy' : 'slightly mollified'}.`);
                if ((u.uluck || 0) < 0) changeLuck(1);
            } else {
                result.messages.push(`${heroGodName()} seems ${heroHallucinating() ? 'cosmic (not a new fact)' : 'mollified'}.`);
                if ((u.uluck || 0) < 0) u.uluck = 0;
            }
        } else {
            result.messages.push(heroHallucinating()
                ? 'The gods seem tall.'
                : 'You have a feeling of inadequacy.');
        }
    } else if ((u.ualign?.record || 0) < 0) { // C: ugod_is_angry()
        let absolution = Math.min(value, MAXVALUE);
        absolution = Math.min(absolution, -(u.ualign.record || 0));
        adjAlign(absolution);
        result.messages.push('You feel partially absolved.');
    } else if ((u.ublesscnt || 0) > 0) {
        const savedCnt = u.ublesscnt;
        u.ublesscnt -= Math.trunc((value * (ualign === A_CHAOTIC ? 500 : 300)) / MAXVALUE);
        if (u.ublesscnt < 0) u.ublesscnt = 0;
        if (u.ublesscnt !== savedCnt) {
            if (u.ublesscnt) {
                result.messages.push(heroHallucinating()
                    ? 'You realize that the gods are not like you and I.'
                    : 'You have a hopeful feeling.');
                if ((u.uluck || 0) < 0) changeLuck(1);
            } else {
                result.messages.push(heroHallucinating()
                    ? 'Overall, there is a smell of fried onions.'
                    : 'You have a feeling of reconciliation.');
                if ((u.uluck || 0) < 0) u.uluck = 0;
            }
        }
    } else {
        // C ref: src/pray.c:bestow_artifact() — the artifact drop itself is
        // out of this slice; keep C's gating rn2 so the stream stays aligned.
        const ugifts = u.ugifts || 0;
        const nartifacts = game._artifact_count || 0;
        if ((u.ulevel || 1) > 2 && (u.uluck || 0) >= 0
            && !rn2(6 + (2 * ugifts * nartifacts))) {
            result.deferred.push('bestow_artifact');
            return;
        }
        const origLuck = u.uluck || 0;
        let luckIncrease = Math.trunc((value * LUCKMAX) / (MAXVALUE * 2));
        if (origLuck > value) luckIncrease = 0;
        else if (origLuck + luckIncrease > value) luckIncrease = value - origLuck;
        changeLuck(luckIncrease);
        if ((u.uluck || 0) < 0) u.uluck = 0;
        if ((u.uluck || 0) !== origLuck) {
            if (heroBlind()) result.messages.push('You think something brushed your foot.');
            else {
                result.messages.push(heroHallucinating()
                    ? 'You see crabgrass at your feet.  A funny thing in a dungeon.'
                    : 'You glimpse a four-leaf clover at your feet.');
            }
        }
    }
}

// C ref: src/pray.c:offer_corpse()
export function offerCorpse(otmp, { highaltar = false, altaralign = A_NONE } = {}) {
    const result = { messages: [], consumed: false, timeUsed: true, newsym: false, deferred: [] };
    const u = game.u ??= {};
    u.uconduct ??= {};
    u.uconduct.gnostic = (u.uconduct.gnostic || 0) + 1;
    // C: feel_cockatrice(otmp, TRUE) — deferred (no JS touch-petrify helper)
    // C: rider_corpse_revival(otmp, FALSE) — deferred (no JS revival helper)
    const data = otmp?.corpsenm || {};
    if (corpseMatchesHeroRace(data)) {
        // C: sacrifice_your_race() — deferred (demon summoning, altar staining)
        result.deferred.push('sacrifice_your_race');
        return result;
    }
    const traits = otmp?.omonst || otmp?.mtraits || otmp?._mtraits || null;
    if ((traits && traits.mtame) || otmp?._pet_corpse) {
        result.messages.push('So this is how you repay loyalty?');
        adjAlign(-3);
        // C: HAggravate_monster |= FROMOUTSIDE — no JS equivalent yet
        offerNegativeValued(highaltar, altaralign, result);
        return result;
    }
    const value = evalOffering(otmp, altaralign, result);
    if (value === 0) {
        result.messages.push('Nothing happens.');
        return result;
    }
    if (value < 0) {
        offerNegativeValued(highaltar, altaralign, result);
        return result;
    }
    const ualign = heroAlign();
    if (ualign !== altaralign && highaltar) {
        desecrateAltar(highaltar, altaralign, result);
        return result;
    }
    if (ualign !== altaralign) {
        offerDifferentAlignmentAltar(otmp, altaralign, result);
        return result;
    }
    consumeOffering(otmp, result);
    coalignedSacrificeReward(value, result);
    return result;
}

// C ref: src/pray.c:offer_too_soon()
function offerTooSoon(altaralign, result) {
    if (altaralign === A_NONE && heroInGehennom()) {
        godsUpset(A_NONE, result); // Moloch becomes angry
        return;
    }
    result.messages.push(`You feel ${heroHallucinating()
        ? 'homesick'
        : altaralign === heroAlign() ? 'an urge to return to the surface' : 'ashamed'}.`);
}

// C ref: src/pray.c:dosacrifice() amulet branches (offer_fake_amulet())
export function offerAmulet(otmp, { highaltar = false, altaralign = A_NONE } = {}) {
    const result = { messages: [], consumed: false, timeUsed: true, newsym: false, deferred: [] };
    if (otmp?.realAmuletOfYendor) {
        if (!highaltar) {
            offerTooSoon(altaralign, result);
            return result;
        }
        // C: offer_real_amulet() — endgame ascension, out of this slice
        result.deferred.push('offer_real_amulet');
        return result;
    }
    if (!highaltar && !otmp?.known) {
        offerTooSoon(altaralign, result);
        return result;
    }
    result.messages.push('You hear a nearby thunderclap.');
    if (!otmp?.known) {
        result.messages.push(`You realize you have made a ${heroHallucinating() ? 'boo-boo' : 'mistake'}.`);
        if (otmp) otmp.known = true;
        changeLuck(-1);
    } else {
        // C: "don't you dare try to fool the gods" (Deaf "Oh, no." omitted —
        // no JS deafness state); wrath via offer_negative_valued deferred
        changeLuck(-3);
        adjAlign(-1);
        const u = game.u ??= {};
        u.ugangr = (u.ugangr || 0) + 3;
        offerNegativeValued(highaltar, altaralign, result);
    }
    return result;
}
