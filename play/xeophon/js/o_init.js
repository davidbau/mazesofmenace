// o_init.js — Object initialization.
// C ref: src/o_init.c:init_objects(), shuffle_all().

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import {
    CLR_BLACK, CLR_BLUE, CLR_BRIGHT_BLUE, CLR_BRIGHT_CYAN, CLR_BRIGHT_GREEN,
    CLR_BRIGHT_MAGENTA, CLR_BROWN, CLR_CYAN, CLR_GRAY, CLR_GREEN,
    CLR_MAGENTA, CLR_ORANGE, CLR_RED, CLR_WHITE, CLR_YELLOW, NO_COLOR,
} from './terminal.js';

const DESCRIPTION_SHUFFLE_LENGTHS = [
    11, // amulets, before the fake Amulet of Yendor
    28, // rings
    41, // spellbooks, excluding blank paper, novel, and Book of the Dead
    2,  // venom
    4,  // helms: helmet through helm of telepathy
    4,  // gloves
    4,  // cloaks: cloak of protection through cloak of displacement
    7,  // boots: speed boots through levitation boots
];

// Canonical identities are separate from the shuffled appearance strings.
export const IDENTIFIED_AMULET_NAMES = [
    'amulet of esp', 'amulet of life saving', 'amulet of strangulation',
    'amulet of restful sleep', 'amulet versus poison', 'amulet of change',
    'amulet of unchanging', 'amulet of reflection', 'amulet of magical breathing',
    'amulet of guarding', 'amulet of flying',
];

const AMULET_DESCRIPTIONS = [
    'circular', 'spherical', 'oval', 'triangular', 'pyramidal', 'square',
    'concave', 'hexagonal', 'octagonal', 'perforated', 'cubical',
];
const POTION_DESCRIPTIONS = [
    'ruby', 'pink', 'orange', 'yellow', 'emerald', 'dark green', 'cyan', 'sky blue',
    'brilliant blue', 'magenta', 'purple-red', 'puce', 'milky', 'swirly', 'bubbly',
    'smoky', 'cloudy', 'effervescent', 'black', 'golden', 'brown', 'fizzy', 'dark',
    'white', 'murky',
];
const POTION_COLORS = [
    CLR_RED, CLR_BRIGHT_MAGENTA, CLR_ORANGE, CLR_YELLOW, CLR_BRIGHT_GREEN,
    CLR_GREEN, CLR_CYAN, CLR_CYAN, CLR_BRIGHT_BLUE, CLR_MAGENTA, CLR_MAGENTA,
    CLR_RED, CLR_WHITE, CLR_BROWN, CLR_WHITE, CLR_GRAY, CLR_WHITE, CLR_GRAY,
    CLR_BLACK, CLR_YELLOW, CLR_BROWN, CLR_CYAN, CLR_BLACK, CLR_WHITE, CLR_BROWN,
];

const SCROLL_DESCRIPTIONS = [
    'ZELGO MER', 'JUYED AWK YACC', 'NR 9', 'XIXAXA XOXAXA XUXAXA', 'PRATYAVAYAH',
    'DAIYEN FOOELS', 'LEP GEX VEN ZEA', 'PRIRUTSENIE', 'ELBIB YLOH', 'VERR YED HORRE',
    'VENZAR BORGAVVE', 'THARR', 'YUM YUM', 'KERNOD WEL', 'ELAM EBOW', 'DUAM XNAHT',
    'ANDOVA BEGARIN', 'KIRJE', 'VE FORBRYDERNE', 'HACKEM MUCHE', 'VELOX NEB',
    'FOOBIE BLETCH', 'TEMOV', 'GARVEN DEH', 'READ ME', 'ETAOIN SHRDLU', 'LOREM IPSUM',
    'FNORD', 'KO BATE', 'ABRA KA DABRA', 'ASHPD SODALG', 'ZLORFIK', 'GNIK SISI VLE',
    'HAPAX LEGOMENON', 'EIRIS SAZUN IDISI', 'PHOL ENDE WODAN', 'GHOTI',
    'MAPIRO MAHAMA DIROMAT', 'VAS CORP BET MANI', 'XOR OTA', 'STRC PRST SKRZ KRK',
];

const WAND_DESCRIPTIONS = [
    'glass', 'balsa', 'crystal', 'maple', 'pine', 'redwood', 'oak', 'ebony',
    'marble', 'tin', 'brass', 'copper', 'silver', 'platinum', 'iridium', 'zinc',
    'aluminum', 'uranium', 'iron', 'steel', 'hexagonal', 'short', 'runed', 'long',
    'curved', 'forked', 'spiked', 'jeweled',
];
const RING_DESCRIPTIONS = [
    'wooden', 'granite', 'opal', 'clay', 'coral', 'black onyx', 'moonstone',
    'tiger eye', 'jade', 'bronze', 'agate', 'topaz', 'sapphire', 'ruby',
    'diamond', 'pearl', 'iron', 'brass', 'copper', 'twisted', 'steel',
    'silver', 'gold', 'ivory', 'emerald', 'wire', 'engagement', 'shiny',
];
const SPELLBOOK_DESCRIPTIONS = [
    'parchment', 'vellum', 'ragged', 'dog eared', 'mottled', 'stained',
    'cloth', 'leathery', 'white', 'pink', 'red', 'orange', 'yellow',
    'velvet', 'light green', 'dark green', 'turquoise', 'cyan', 'light blue',
    'dark blue', 'indigo', 'magenta', 'purple', 'violet', 'tan', 'plaid',
    'light brown', 'dark brown', 'gray', 'wrinkled', 'dusty', 'bronze',
    'copper', 'silver', 'gold', 'glittering', 'shining', 'dull', 'thin',
    'thick', 'checkered',
];
const SPELLBOOK_COLORS = [
    CLR_BROWN, CLR_BROWN, CLR_WHITE, CLR_WHITE, CLR_WHITE, CLR_WHITE,
    CLR_BROWN, CLR_BROWN, CLR_WHITE, CLR_BRIGHT_MAGENTA, CLR_RED, CLR_ORANGE,
    CLR_YELLOW, CLR_MAGENTA, CLR_BRIGHT_GREEN, CLR_GREEN, CLR_BRIGHT_CYAN,
    CLR_CYAN, CLR_BRIGHT_BLUE, CLR_BLUE, CLR_BLUE, CLR_MAGENTA, CLR_MAGENTA,
    CLR_MAGENTA, CLR_BROWN, CLR_GREEN, CLR_BROWN, CLR_BROWN, CLR_GRAY,
    CLR_WHITE, CLR_WHITE, CLR_YELLOW, CLR_YELLOW, CLR_GRAY, CLR_YELLOW,
    CLR_WHITE, CLR_WHITE, CLR_WHITE, CLR_WHITE, CLR_WHITE, CLR_GRAY,
];
const HELM_DESCRIPTIONS = ['plumed helmet', 'etched helmet', 'crested helmet', 'visored helmet'];
const HELM_COLORS = [CLR_CYAN, CLR_GREEN, CLR_CYAN, CLR_CYAN];
const GLOVE_DESCRIPTIONS = ['old gloves', 'padded gloves', 'riding gloves', 'fencing gloves'];
const GLOVE_COLORS = [CLR_BROWN, CLR_BROWN, CLR_BROWN, CLR_BROWN];
const CLOAK_DESCRIPTIONS = ['tattered cape', 'opera cloak', 'ornamental cope', 'piece of cloth'];
const CLOAK_COLORS = [CLR_BROWN, CLR_BRIGHT_MAGENTA, CLR_WHITE, CLR_BROWN];
const BOOT_DESCRIPTIONS = [
    'combat boots', 'jungle boots', 'hiking boots', 'mud boots', 'buckled boots',
    'riding boots', 'snow boots',
];
const BOOT_COLORS = [CLR_BROWN, CLR_BROWN, CLR_BROWN, CLR_BROWN, CLR_BROWN, CLR_BROWN, CLR_BROWN];
const WAND_COLORS = [
    CLR_BRIGHT_CYAN, CLR_BROWN, CLR_BRIGHT_CYAN, CLR_BROWN, CLR_BROWN, CLR_RED,
    CLR_BROWN, CLR_BROWN, CLR_GRAY, CLR_CYAN, CLR_YELLOW, CLR_YELLOW, CLR_GRAY,
    CLR_WHITE, CLR_BRIGHT_CYAN, CLR_CYAN, CLR_CYAN, CLR_CYAN, CLR_CYAN, CLR_CYAN,
    CLR_CYAN, CLR_CYAN, CLR_CYAN, CLR_CYAN, CLR_CYAN, CLR_BROWN, CLR_CYAN,
    CLR_GRAY,
];
const GEM_APPEARANCES = [
    ['white gem', CLR_WHITE], ['white gem', CLR_WHITE], ['red gem', CLR_RED],
    ['orange gem', CLR_ORANGE], ['blue gem', CLR_BLUE], ['black gem', CLR_BLACK],
    ['green gem', CLR_GREEN], ['green gem', CLR_GREEN], ['yellow gem', CLR_YELLOW],
    ['green gem', CLR_GREEN], ['yellowish brown gem', CLR_BROWN],
    ['yellowish brown gem', CLR_BROWN], ['black gem', CLR_BLACK],
    ['white gem', CLR_WHITE], ['yellow gem', CLR_YELLOW], ['red gem', CLR_RED],
    ['violet gem', CLR_MAGENTA], ['red gem', CLR_RED], ['violet gem', CLR_MAGENTA],
    ['black gem', CLR_BLACK], ['orange gem', CLR_ORANGE], ['green gem', CLR_GREEN],
];

function shuffleDescriptionRange(length) {
    for (let remaining = length; remaining > 0; remaining--) rn2(remaining);
}

function shuffledDescriptions(descriptions) {
    const values = [...descriptions];
    for (let j = 0; j < values.length; j++) {
        const i = j + rn2(values.length - j);
        const swap = values[j];
        values[j] = values[i];
        values[i] = swap;
    }
    return values;
}

function shuffledAppearances(descriptions, colors) {
    const values = descriptions.map((description, i) => ({ description, color: colors[i] }));
    for (let j = 0; j < values.length; j++) {
        const i = j + rn2(values.length - j);
        const swap = values[j];
        values[j] = values[i];
        values[i] = swap;
    }
    return values;
}

function randomizeGemColors() {
    const gems = GEM_APPEARANCES.map(([description, color]) => ({ description, color }));
    if (rn2(2)) gems[7] = { ...gems[4] };
    if (rn2(2)) gems[9] = { ...gems[4] };
    switch (rn2(4)) {
    case 1:
        gems[18] = { ...gems[4] };
        break;
    case 2:
        gems[18] = { ...gems[1] };
        break;
    case 3:
        gems[18] = { ...gems[6] };
        break;
    }
    return gems;
}

export function init_objects() {
    const gems = randomizeGemColors();
    const amulets = shuffledDescriptions(AMULET_DESCRIPTIONS);
    const potions = shuffledAppearances(POTION_DESCRIPTIONS, POTION_COLORS);
    const rings = shuffledDescriptions(RING_DESCRIPTIONS);
    const scrolls = shuffledDescriptions(SCROLL_DESCRIPTIONS);
    const spellbookAppearances = shuffledAppearances(SPELLBOOK_DESCRIPTIONS, SPELLBOOK_COLORS);
    const spellbooks = spellbookAppearances.map(appearance => appearance.description);
    const wands = shuffledAppearances(WAND_DESCRIPTIONS, WAND_COLORS);
    shuffleDescriptionRange(DESCRIPTION_SHUFFLE_LENGTHS[3]);
    const helmAppearances = shuffledAppearances(HELM_DESCRIPTIONS, HELM_COLORS);
    const gloveAppearances = shuffledAppearances(GLOVE_DESCRIPTIONS, GLOVE_COLORS);
    const cloakAppearances = shuffledAppearances(CLOAK_DESCRIPTIONS, CLOAK_COLORS);
    const bootAppearances = shuffledAppearances(BOOT_DESCRIPTIONS, BOOT_COLORS);
    const helms = helmAppearances.map(appearance => appearance.description);
    const gloves = gloveAppearances.map(appearance => appearance.description);
    const cloaks = cloakAppearances.map(appearance => appearance.description);
    const boots = bootAppearances.map(appearance => appearance.description);
    game._object_descriptions = {
        potionExtraHealing: potions[11].description,
        potionSickness: potions[21].description,
        amulets,
        potions,
        rings,
        scrollMagicMapping: scrolls[14],
        scrolls,
        spellbooks,
        spellbookColors: spellbookAppearances.map(appearance => appearance.color),
        wandWishing: wands[4].description,
        wands,
        helms,
        helmColors: helmAppearances.map(appearance => appearance.color),
        gloves,
        gloveColors: gloveAppearances.map(appearance => appearance.color),
        cloaks,
        cloakColors: cloakAppearances.map(appearance => appearance.color),
        boots,
        bootColors: bootAppearances.map(appearance => appearance.color),
        gems,
    };
    rn2(2); // WAN_NOTHING direction.
}

// C objnam.c:Japanese_items: localized display names retain their object identity.
export const JAPANESE_ITEM_ALIASES = new Map([
    ['wakizashi', 'short sword'],
    ['ninja-to', 'broadsword'],
    ['nunchaku', 'flail'],
    ['naginata', 'glaive'],
    ['osaku', 'lock pick'],
    ['koto', 'wooden harp'],
    ['magic koto', 'magic harp'],
    ['shito', 'knife'],
    ['tanko', 'plate mail'],
    ['kabuto', 'helmet'],
    ['yugake', 'leather gloves'],
    ['gunyoki', 'food ration'],
    ['sake', 'potion of booze'],
]);
