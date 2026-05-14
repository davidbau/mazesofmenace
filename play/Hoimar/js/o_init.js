// o_init.js — Object initialization.
// C ref: o_init.c — shuffle gem colors, potion descriptions, etc.
//
import { rn2 } from './rng.js';
import { OBJECT_COLOR, OBJECT_MATERIAL } from './object_data.js';

let objectColors = [...OBJECT_COLOR];
let objectMaterials = [...OBJECT_MATERIAL];
let objectDescriptions = [];

const TURQUOISE = 446;
const AQUAMARINE = 448;
const FLUORITE = 457;
const DIAMOND = 440;
const SAPPHIRE = 443;
const EMERALD = 445;

const OBJECT_DESCRIPTION = [];

// C ref: objects.h RING(name, stone, ...).  Ring stones are shuffled as
// appearance descriptors and also carry shuffled color/material state.
OBJECT_DESCRIPTION[173] = 'wooden';
OBJECT_DESCRIPTION[174] = 'granite';
OBJECT_DESCRIPTION[175] = 'opal';
OBJECT_DESCRIPTION[176] = 'clay';
OBJECT_DESCRIPTION[177] = 'coral';
OBJECT_DESCRIPTION[178] = 'black onyx';
OBJECT_DESCRIPTION[179] = 'moonstone';
OBJECT_DESCRIPTION[180] = 'tiger eye';
OBJECT_DESCRIPTION[181] = 'jade';
OBJECT_DESCRIPTION[182] = 'bronze';
OBJECT_DESCRIPTION[183] = 'agate';
OBJECT_DESCRIPTION[184] = 'topaz';
OBJECT_DESCRIPTION[185] = 'sapphire';
OBJECT_DESCRIPTION[186] = 'ruby';
OBJECT_DESCRIPTION[187] = 'diamond';
OBJECT_DESCRIPTION[188] = 'pearl';
OBJECT_DESCRIPTION[189] = 'iron';
OBJECT_DESCRIPTION[190] = 'brass';
OBJECT_DESCRIPTION[191] = 'copper';
OBJECT_DESCRIPTION[192] = 'twisted';
OBJECT_DESCRIPTION[193] = 'steel';
OBJECT_DESCRIPTION[194] = 'silver';
OBJECT_DESCRIPTION[195] = 'gold';
OBJECT_DESCRIPTION[196] = 'ivory';
OBJECT_DESCRIPTION[197] = 'emerald';
OBJECT_DESCRIPTION[198] = 'wire';
OBJECT_DESCRIPTION[199] = 'engagement';
OBJECT_DESCRIPTION[200] = 'shiny';

// C ref: objects.h amulet OBJ(name, desc) entries.  These descriptions are
// shuffled by o_init.c:shuffle_all() and used by objnam.c before discovery.
OBJECT_DESCRIPTION[201] = 'circular';
OBJECT_DESCRIPTION[202] = 'spherical';
OBJECT_DESCRIPTION[203] = 'oval';
OBJECT_DESCRIPTION[204] = 'triangular';
OBJECT_DESCRIPTION[205] = 'pyramidal';
OBJECT_DESCRIPTION[206] = 'square';
OBJECT_DESCRIPTION[207] = 'concave';
OBJECT_DESCRIPTION[208] = 'hexagonal';
OBJECT_DESCRIPTION[209] = 'octagonal';
OBJECT_DESCRIPTION[210] = 'perforated';
OBJECT_DESCRIPTION[211] = 'cubical';

// C ref: objects.h POTION(name, desc, ...).  Potion colors are shuffled
// through o_init.c:shuffle_all(); water keeps its fixed "clear" description.
OBJECT_DESCRIPTION[297] = 'ruby';
OBJECT_DESCRIPTION[298] = 'pink';
OBJECT_DESCRIPTION[299] = 'orange';
OBJECT_DESCRIPTION[300] = 'yellow';
OBJECT_DESCRIPTION[301] = 'emerald';
OBJECT_DESCRIPTION[302] = 'dark green';
OBJECT_DESCRIPTION[303] = 'cyan';
OBJECT_DESCRIPTION[304] = 'sky blue';
OBJECT_DESCRIPTION[305] = 'brilliant blue';
OBJECT_DESCRIPTION[306] = 'magenta';
OBJECT_DESCRIPTION[307] = 'purple-red';
OBJECT_DESCRIPTION[308] = 'puce';
OBJECT_DESCRIPTION[309] = 'milky';
OBJECT_DESCRIPTION[310] = 'swirly';
OBJECT_DESCRIPTION[311] = 'bubbly';
OBJECT_DESCRIPTION[312] = 'smoky';
OBJECT_DESCRIPTION[313] = 'cloudy';
OBJECT_DESCRIPTION[314] = 'effervescent';
OBJECT_DESCRIPTION[315] = 'black';
OBJECT_DESCRIPTION[316] = 'golden';
OBJECT_DESCRIPTION[317] = 'brown';
OBJECT_DESCRIPTION[318] = 'fizzy';
OBJECT_DESCRIPTION[319] = 'dark';
OBJECT_DESCRIPTION[320] = 'white';
OBJECT_DESCRIPTION[321] = 'murky';
OBJECT_DESCRIPTION[322] = 'clear';

// C ref: objects.h SCROLL()/XTRA_SCROLL_LABEL().  Real scroll labels and
// extra labels share one shuffled range; mail/blank paper stay fixed.
OBJECT_DESCRIPTION[323] = 'ZELGO MER';
OBJECT_DESCRIPTION[324] = 'JUYED AWK YACC';
OBJECT_DESCRIPTION[325] = 'NR 9';
OBJECT_DESCRIPTION[326] = 'XIXAXA XOXAXA XUXAXA';
OBJECT_DESCRIPTION[327] = 'PRATYAVAYAH';
OBJECT_DESCRIPTION[328] = 'DAIYEN FOOELS';
OBJECT_DESCRIPTION[329] = 'LEP GEX VEN ZEA';
OBJECT_DESCRIPTION[330] = 'PRIRUTSENIE';
OBJECT_DESCRIPTION[331] = 'ELBIB YLOH';
OBJECT_DESCRIPTION[332] = 'VERR YED HORRE';
OBJECT_DESCRIPTION[333] = 'VENZAR BORGAVVE';
OBJECT_DESCRIPTION[334] = 'THARR';
OBJECT_DESCRIPTION[335] = 'YUM YUM';
OBJECT_DESCRIPTION[336] = 'KERNOD WEL';
OBJECT_DESCRIPTION[337] = 'ELAM EBOW';
OBJECT_DESCRIPTION[338] = 'DUAM XNAHT';
OBJECT_DESCRIPTION[339] = 'ANDOVA BEGARIN';
OBJECT_DESCRIPTION[340] = 'KIRJE';
OBJECT_DESCRIPTION[341] = 'VE FORBRYDERNE';
OBJECT_DESCRIPTION[342] = 'HACKEM MUCHE';
OBJECT_DESCRIPTION[343] = 'VELOX NEB';
OBJECT_DESCRIPTION[344] = 'FOOBIE BLETCH';
OBJECT_DESCRIPTION[345] = 'TEMOV';
OBJECT_DESCRIPTION[346] = 'GARVEN DEH';
OBJECT_DESCRIPTION[347] = 'READ ME';
OBJECT_DESCRIPTION[348] = 'ETAOIN SHRDLU';
OBJECT_DESCRIPTION[349] = 'LOREM IPSUM';
OBJECT_DESCRIPTION[350] = 'FNORD';
OBJECT_DESCRIPTION[351] = 'KO BATE';
OBJECT_DESCRIPTION[352] = 'ABRA KA DABRA';
OBJECT_DESCRIPTION[353] = 'ASHPD SODALG';
OBJECT_DESCRIPTION[354] = 'ZLORFIK';
OBJECT_DESCRIPTION[355] = 'GNIK SISI VLE';
OBJECT_DESCRIPTION[356] = 'HAPAX LEGOMENON';
OBJECT_DESCRIPTION[357] = 'EIRIS SAZUN IDISI';
OBJECT_DESCRIPTION[358] = 'PHOL ENDE WODAN';
OBJECT_DESCRIPTION[359] = 'GHOTI';
OBJECT_DESCRIPTION[360] = 'MAPIRO MAHAMA DIROMAT';
OBJECT_DESCRIPTION[361] = 'VAS CORP BET MANI';
OBJECT_DESCRIPTION[362] = 'XOR OTA';
OBJECT_DESCRIPTION[363] = 'STRC PRST SKRZ KRK';
OBJECT_DESCRIPTION[364] = 'stamped';
OBJECT_DESCRIPTION[365] = 'unlabeled';

// C ref: objects.h ARMOR desc rows for the subranges shuffled by
// o_init.c:shuffle_all() via HELMET, LEATHER_GLOVES, CLOAK_OF_PROTECTION,
// and SPEED_BOOTS.
OBJECT_DESCRIPTION[97] = 'plumed helmet';
OBJECT_DESCRIPTION[98] = 'etched helmet';
OBJECT_DESCRIPTION[99] = 'crested helmet';
OBJECT_DESCRIPTION[100] = 'visored helmet';
OBJECT_DESCRIPTION[146] = 'tattered cape';
OBJECT_DESCRIPTION[147] = 'opera cloak';
OBJECT_DESCRIPTION[148] = 'ornamental cope';
OBJECT_DESCRIPTION[149] = 'piece of cloth';
OBJECT_DESCRIPTION[159] = 'old gloves';
OBJECT_DESCRIPTION[160] = 'padded gloves';
OBJECT_DESCRIPTION[161] = 'riding gloves';
OBJECT_DESCRIPTION[162] = 'fencing gloves';
OBJECT_DESCRIPTION[166] = 'combat boots';
OBJECT_DESCRIPTION[167] = 'jungle boots';
OBJECT_DESCRIPTION[168] = 'hiking boots';
OBJECT_DESCRIPTION[169] = 'mud boots';
OBJECT_DESCRIPTION[170] = 'buckled boots';
OBJECT_DESCRIPTION[171] = 'riding boots';
OBJECT_DESCRIPTION[172] = 'snow boots';

// C ref: objects.h SPELL(name, desc, ...).  Magical spellbook descriptions
// are shuffled by o_init.c:shuffle_all(); blank paper stays fixed.
OBJECT_DESCRIPTION[366] = 'parchment';
OBJECT_DESCRIPTION[367] = 'vellum';
OBJECT_DESCRIPTION[368] = 'ragged';
OBJECT_DESCRIPTION[369] = 'dog eared';
OBJECT_DESCRIPTION[370] = 'mottled';
OBJECT_DESCRIPTION[371] = 'stained';
OBJECT_DESCRIPTION[372] = 'cloth';
OBJECT_DESCRIPTION[373] = 'leathery';
OBJECT_DESCRIPTION[374] = 'white';
OBJECT_DESCRIPTION[375] = 'pink';
OBJECT_DESCRIPTION[376] = 'red';
OBJECT_DESCRIPTION[377] = 'orange';
OBJECT_DESCRIPTION[378] = 'yellow';
OBJECT_DESCRIPTION[379] = 'velvet';
OBJECT_DESCRIPTION[380] = 'light green';
OBJECT_DESCRIPTION[381] = 'dark green';
OBJECT_DESCRIPTION[382] = 'turquoise';
OBJECT_DESCRIPTION[383] = 'cyan';
OBJECT_DESCRIPTION[384] = 'light blue';
OBJECT_DESCRIPTION[385] = 'dark blue';
OBJECT_DESCRIPTION[386] = 'indigo';
OBJECT_DESCRIPTION[387] = 'magenta';
OBJECT_DESCRIPTION[388] = 'purple';
OBJECT_DESCRIPTION[389] = 'violet';
OBJECT_DESCRIPTION[390] = 'tan';
OBJECT_DESCRIPTION[391] = 'plaid';
OBJECT_DESCRIPTION[392] = 'light brown';
OBJECT_DESCRIPTION[393] = 'dark brown';
OBJECT_DESCRIPTION[394] = 'gray';
OBJECT_DESCRIPTION[395] = 'wrinkled';
OBJECT_DESCRIPTION[396] = 'dusty';
OBJECT_DESCRIPTION[397] = 'bronze';
OBJECT_DESCRIPTION[398] = 'copper';
OBJECT_DESCRIPTION[399] = 'silver';
OBJECT_DESCRIPTION[400] = 'gold';
OBJECT_DESCRIPTION[401] = 'glittering';
OBJECT_DESCRIPTION[402] = 'shining';
OBJECT_DESCRIPTION[403] = 'dull';
OBJECT_DESCRIPTION[404] = 'thin';
OBJECT_DESCRIPTION[405] = 'thick';
OBJECT_DESCRIPTION[406] = 'checkered';
OBJECT_DESCRIPTION[407] = 'plain';
OBJECT_DESCRIPTION[408] = 'paperback';
OBJECT_DESCRIPTION[409] = 'papyrus';

// C ref: objects.h wand OBJ(name, typ) entries.  The usable wand range and
// the extra wand descriptions are shuffled together by o_init.c.
OBJECT_DESCRIPTION[410] = 'glass';
OBJECT_DESCRIPTION[411] = 'balsa';
OBJECT_DESCRIPTION[412] = 'crystal';
OBJECT_DESCRIPTION[413] = 'maple';
OBJECT_DESCRIPTION[414] = 'pine';
OBJECT_DESCRIPTION[415] = 'redwood';
OBJECT_DESCRIPTION[416] = 'oak';
OBJECT_DESCRIPTION[417] = 'ebony';
OBJECT_DESCRIPTION[418] = 'marble';
OBJECT_DESCRIPTION[419] = 'tin';
OBJECT_DESCRIPTION[420] = 'brass';
OBJECT_DESCRIPTION[421] = 'copper';
OBJECT_DESCRIPTION[422] = 'silver';
OBJECT_DESCRIPTION[423] = 'platinum';
OBJECT_DESCRIPTION[424] = 'iridium';
OBJECT_DESCRIPTION[425] = 'zinc';
OBJECT_DESCRIPTION[426] = 'aluminum';
OBJECT_DESCRIPTION[427] = 'uranium';
OBJECT_DESCRIPTION[428] = 'iron';
OBJECT_DESCRIPTION[429] = 'steel';
OBJECT_DESCRIPTION[430] = 'hexagonal';
OBJECT_DESCRIPTION[431] = 'short';
OBJECT_DESCRIPTION[432] = 'runed';
OBJECT_DESCRIPTION[433] = 'long';
OBJECT_DESCRIPTION[434] = 'curved';
OBJECT_DESCRIPTION[435] = 'forked';
OBJECT_DESCRIPTION[436] = 'spiked';
OBJECT_DESCRIPTION[437] = 'jeweled';

// C ref: objects.h VENOM_CLASS objects.  Both venom entries share the same
// appearance descriptor, but they still participate in the C shuffle range.
OBJECT_DESCRIPTION[479] = 'splash of venom';
OBJECT_DESCRIPTION[480] = 'splash of venom';

// C ref: o_init.c:shuffle_all() ranges after obj_shuffle_range().
const SHUFFLE_RANGES = [
    [201, 211, true], // amulets, excluding fake/real Amulet of Yendor
    [297, 321, true], // potions, excluding water
    [173, 200, true], // rings
    [323, 363, true], // magical scroll descriptions
    [366, 406, true], // magical spellbook descriptions
    [410, 437, true], // wands
    [479, 480, true], // venoms
    [97, 100, false], // helms
    [159, 162, false], // gloves
    [146, 149, false], // magical cloaks
    [166, 172, false], // boots
];

// C ref: o_init.c:init_objects().
// This preserves the general RNG shape for description shuffles. Runtime
// object identity state is still carried by object_data.js/static defaults;
// appearance descriptions are exposed through getObjectDescription().
export function init_objects() {
    objectColors = [...OBJECT_COLOR];
    objectMaterials = [...OBJECT_MATERIAL];
    objectDescriptions = [...OBJECT_DESCRIPTION];
    randomize_gem_colors();
    shuffle_all();
    // C ref: objects[WAN_NOTHING].oc_dir = rn2(2) ? NODIR : IMMEDIATE.
    rn2(2);
}

export function getObjectColor(otyp) {
    return objectColors[otyp] ?? OBJECT_COLOR[otyp];
}

export function getObjectMaterial(otyp) {
    return objectMaterials[otyp] ?? OBJECT_MATERIAL[otyp];
}

export function getObjectDescription(otyp) {
    return objectDescriptions[otyp] ?? OBJECT_DESCRIPTION[otyp] ?? null;
}

function copy_descr(dst, src) {
    objectColors[dst] = objectColors[src];
}

function randomize_gem_colors() {
    if (rn2(2)) copy_descr(TURQUOISE, SAPPHIRE);
    if (rn2(2)) copy_descr(AQUAMARINE, SAPPHIRE);
    switch (rn2(4)) {
    case 1:
        copy_descr(FLUORITE, SAPPHIRE);
        break;
    case 2:
        copy_descr(FLUORITE, DIAMOND);
        break;
    case 3:
        copy_descr(FLUORITE, EMERALD);
        break;
    default:
        break;
    }
}

function shuffle_range(low, high, domaterial) {
    for (let j = low; j <= high; j++) {
        const i = j + rn2(high - j + 1);
        [objectColors[j], objectColors[i]] = [objectColors[i], objectColors[j]];
        [objectDescriptions[j], objectDescriptions[i]] = [objectDescriptions[i], objectDescriptions[j]];
        if (domaterial) {
            [objectMaterials[j], objectMaterials[i]] = [objectMaterials[i], objectMaterials[j]];
        }
    }
}

function shuffle_all() {
    for (const [low, high, domaterial] of SHUFFLE_RANGES) {
        shuffle_range(low, high, domaterial);
    }
}
