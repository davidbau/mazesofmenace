import { W_AMUL, W_ARMOR, W_ARMG, W_TOOL, W_SADDLE, W_RINGL, W_RINGR, W_WEP, W_SWAPWEP, W_QUIVER, W_BALL, W_CHAIN } from './const.js';
import { tinDetails } from './eat.js';
import { game } from './gstate.js';
import { objectTypeData, objectTypeIsKnown, objectIsFullyIdentified, objectDamageTraits } from './object_knowledge.js';
import { JAPANESE_ITEM_ALIASES } from './o_init.js';
import { MONS, G_UNIQ, type_is_pname, PM_ALIGNED_CLERIC, PM_CLERIC, PM_HIGH_CLERIC, PM_LONG_WORM_TAIL } from './permonst.js';

// objnam.c: shared noun inflection for object names, wishes and monster names.
const ONE_OFF = [
    ['child', 'children'], ['cubus', 'cubi'], ['culus', 'culi'], ['Cyclops', 'Cyclopes'],
    ['djinni', 'djinn'], ['erinys', 'erinyes'], ['foot', 'feet'], ['fungus', 'fungi'],
    ['goose', 'geese'], ['knife', 'knives'], ['labrum', 'labra'], ['louse', 'lice'],
    ['mouse', 'mice'], ['mumak', 'mumakil'], ['nemesis', 'nemeses'], ['ovum', 'ova'],
    ['ox', 'oxen'], ['passerby', 'passersby'], ['rtex', 'rtices'], ['serum', 'sera'],
    ['staff', 'staves'], ['tooth', 'teeth'],
];
const AS_IS = [
    'boots', 'shoes', 'gloves', 'lenses', 'scales', 'eyes', 'gauntlets', 'iron bars',
    'bison', 'deer', 'elk', 'fish', 'fowl', 'tuna', 'yaki', '-hai', 'krill', 'manes',
    'moose', 'ninja', 'sheep', 'ronin', 'roshi', 'shito', 'tengu', 'ki-rin', 'nazgul',
    'gunyoki', 'piranha', 'samurai', 'shuriken', 'haggis', 'bordeaux',
];
const SPECIAL_SUBJECTS = ['erinys', 'manes', 'cyclops', 'hippocrates', 'pelias', 'aklys',
    'amnesia', 'detect monsters', 'paralysis', 'shape changers', 'nemesis'];
const NO_MEN = ['albu', 'antihu', 'anti', 'ata', 'auto', 'bildungsro', 'cai', 'cay',
    'ceru', 'corner', 'decu', 'des', 'dura', 'fir', 'hanu', 'het', 'infrahu', 'inhu',
    'nonhu', 'otto', 'out', 'prehu', 'protohu', 'subhu', 'superhu', 'talis', 'unhu',
    'sha', 'hu', 'un', 'le', 're', 'so', 'to', 'at', 'a'];
const NO_MAN = ['abdo', 'acu', 'agno', 'ceru', 'cogno', 'cycla', 'fleh', 'grava', 'hegu',
    'preno', 'sonar', 'speci', 'dai', 'exa', 'fla', 'sta', 'teg', 'tegu', 'vela', 'da',
    'hy', 'lu', 'no', 'nu', 'ra', 'ru', 'se', 'vi', 'ya', 'o', 'a'];
const CH_K_SOUND = ['monarch', 'poch', 'tech', 'mech', 'stomach', 'psych', 'amphibrach',
    'anarch', 'atriarch', 'azedarach', 'broch', 'gastrotrich', 'isopach', 'loch', 'oligarch',
    'peritrich', 'sandarach', 'sumach', 'symposiarch'];
const COMPOUND = / of | labeled | called | named | above| versus | from | in | on | a la | with| de | d'| du | au |-in-|-at-/i;

// hacklib.c:strcasecpy preserves each replaced character's case. Once the old
// suffix runs out, new characters inherit the preceding character's case.
function replaceSuffixCase(text, start, suffix) {
    let result = text.slice(0, start);
    for (let i = 0; i < suffix.length; i++) {
        const old = text[start + i] ?? result.at(-1) ?? '';
        const ch = suffix[i];
        result += /[a-z]/.test(old) ? ch.toLowerCase()
            : /[A-Z]/.test(old) ? ch.toUpperCase() : ch;
    }
    return result;
}

function badman(text, plural) {
    const suffix = plural ? 'man' : 'men';
    return (plural ? NO_MEN : NO_MAN).some(prefix => text === prefix + suffix || text.endsWith(' ' + prefix + suffix));
}

function singplurLookup(text, plural, extra) {
    const lower = text.toLowerCase();
    if ([...AS_IS, ...extra].some(suffix => lower.endsWith(suffix))) return text;
    if (lower.length > 5 && lower.endsWith('craft')) return text;
    if (lower === 'slice' || lower === 'mongoose')
        return plural ? replaceSuffixCase(text, text.length, 's') : text;
    if (plural && lower.length > 2 && lower.endsWith('ox') && !lower.endsWith('muskox'))
        return replaceSuffixCase(text, text.length, 'es');
    if (lower.endsWith(plural ? 'man' : 'men') && badman(lower, plural))
        return plural ? replaceSuffixCase(text, text.length, 's') : text;
    for (const pair of ONE_OFF) {
        const same = pair[plural ? 1 : 0], other = pair[plural ? 0 : 1];
        if (lower.endsWith(same.toLowerCase())) return text;
        if (lower.endsWith(other.toLowerCase())) return replaceSuffixCase(text, text.length - other.length, same);
    }
    return null;
}

export function makePlural(value) {
    const original = String(value ?? '').replace(/^ +/, '');
    if (!original) return 's';
    const lower = original.toLowerCase();
    // C checks subject pronouns before objects, so "her" becomes "them".
    const pronoun = ({ he: 'they', him: 'them', his: 'their', she: 'they', her: 'them', it: 'they', its: 'their' })[lower];
    if (pronoun) return /[A-Z]/.test(original[0]) ? pronoun[0].toUpperCase() + pronoun.slice(1) : pronoun;
    if (lower.startsWith('pair of ')) return original;
    const compound = original.search(COMPOUND);
    const excess = compound < 0 ? '' : original.slice(compound);
    const base = (compound < 0 ? original : original.slice(0, compound)).replace(/ +$/, '');
    const word = base.toLowerCase(), len = base.length;
    if (len === 1 || !/[a-zA-Z@]/.test(base.at(-1) || '')) return base + "'s" + excess;
    const found = singplurLookup(base, true, ['ae', 'eaux', 'matzot']);
    if (found != null) return found + excess;
    if (word === 'ya' || word.endsWith(' ya')) return base + excess;
    let start = len, suffix = 's';
    if (word.endsWith('man') && !badman(word, true)) { start = len - 2; suffix = 'en'; }
    else if (/[aeioulr]f$/.test(word) && !word.endsWith('erf')) { start = len - 1; suffix = 'ves'; }
    else if (word.endsWith('ium')) { start = len - 3; suffix = 'ia'; }
    else if (['alga', 'hypha', 'larva', 'amoeba', 'vertebra'].some(ending => word.endsWith(ending))) suffix = 'e';
    else if (len > 3 && word.endsWith('us') && !word.endsWith('lotus') && !word.endsWith('wumpus')) { start = len - 2; suffix = 'i'; }
    else if (word.endsWith('sis')) { start = len - 2; suffix = 'es'; }
    else if (word.endsWith('eau') && !word.endsWith('bureau')) suffix = 'x';
    else if (/matz[oa]h$/.test(word)) { start = len - 2; suffix = 'ot'; }
    else if (/matz[oa]$/.test(word)) { start = len - 1; suffix = 'ot'; }
    else if (len >= 5 && /(?:dex|dix|tex)$/.test(word) && !word.endsWith('index')) { start = len - 2; suffix = 'ices'; }
    else if (/[zxs]$/.test(word) || word.endsWith('sh')
        || word.endsWith('ch') && !CH_K_SOUND.some(ending => word.endsWith(ending))
        || len >= 4 && word.endsWith('ato') || word.endsWith('dingo')) suffix = 'es';
    else if (/[^aeiou]y$/.test(word)) { start = len - 1; suffix = 'ies'; }
    return replaceSuffixCase(base, start, suffix) + excess;
}

export function makeSingular(value) {
    const original = String(value ?? '').replace(/^ +/, '');
    if (!original) return '';
    const lower = original.toLowerCase();
    const pronoun = ({ they: 'it', them: 'it', their: 'its' })[lower];
    if (pronoun) return /[A-Z]/.test(original[0]) ? pronoun[0].toUpperCase() + pronoun.slice(1) : pronoun;
    const compound = original.search(COMPOUND);
    const excess = compound < 0 ? '' : original.slice(compound);
    const base = compound < 0 ? original : original.slice(0, compound);
    const word = base.toLowerCase(), len = base.length;
    const found = singplurLookup(base, false, SPECIAL_SUBJECTS);
    if (found != null) return found + excess;
    let start = len, suffix = '';
    if (word.endsWith('s')) {
        start = len - 1;
        if (word.endsWith('es')) {
            if (word.endsWith('ies')) {
                if (!/(?:cookies|mbies|yries)$/.test(word) && !/(?:^| )(?:pies|genies)$/.test(word)) { start = len - 3; suffix = 'y'; }
            } else if (/[aeioulr]ves$/.test(word)) {
                if (!/(?:cloves|nerves)$/.test(word)) { start = len - 3; suffix = 'f'; }
            } else if (/(?:eses|oxes|nxes|ches|uses|shes|sses|atoes|dingoes|aleaxes)$/.test(word)) start = len - 2;
        } else if (word.endsWith('us') && !/(?:tengus|hezrous)$/.test(word)
            || word.endsWith('ss') || word === 'lens' || word.endsWith(' lens')) start = len;
    } else if (word.endsWith('men') && !badman(word, false)) { start = len - 2; suffix = 'an'; }
    else if (/(?:matzot|ae|eaux)$/.test(word)) start = len - 1;
    else if (/e[lr]ia$/.test(word)) { start = len - 1; suffix = 'um'; }
    return replaceSuffixCase(base, start, suffix) + excess;
}


const JAPANESE_NAMES = new Map([...JAPANESE_ITEM_ALIASES].map(([japanese, english]) => [english.replace(/^potion of /, ''), japanese]));
const GEM_WITHOUT_STONE = new Set(['DILITHIUM_CRYSTAL', 'RUBY', 'DIAMOND', 'SAPPHIRE', 'BLACK_OPAL', 'EMERALD', 'OPAL']);

// objnam.c:obj_typename describes an object type independently of any one
// item's BUC, charges or observation state. Discovery menus use these names.
export function objectTypeName(type, { known = objectTypeIsKnown({ _c_otyp: type.id }, type),
    role = game._startup_role || game.urole?.name?.m, description = type.description, called = null } = {}) {
    let actual = type.name || (type.id > 0 && type.id < 18 ? 'generic' : 'object?');
    if (role === 'Samurai') {
        actual = JAPANESE_NAMES.get(actual) || actual;
        if (type.symbol === 'WOODEN_HARP' || type.symbol === 'MAGIC_HARP') description = 'koto';
    }
    if (type.class === 12) return actual;
    let name = ({ 8: 'potion', 9: 'scroll', 10: 'spellbook', 11: 'wand', 4: 'ring' })[type.class];
    if (name) {
        if (type.symbol === 'SPE_NOVEL') { name = known ? 'novel' : 'book'; known = false; }
        if (known) name = type.unique ? actual : name + ' of ' + actual;
    } else if (type.class === 5) name = known ? actual : 'amulet';
    else {
        name = type.class === 3 ? [3, 4].includes(type.subtype) ? 'pair of '
            : /_DRAGON_SCALES$/.test(type.symbol) ? 'set of ' : '' : '';
        if (known) {
            name += actual;
            if (type.symbol === 'FLINT' || type.material === 20 && !GEM_WITHOUT_STONE.has(type.symbol)) name += ' stone';
        } else {
            name += description ?? actual;
            if (type.class === 13) name += type.material === 21 ? ' stone' : ' gem';
            description = null;
        }
    }
    // xcalled reserves the parenthesized appearance before truncating the
    // user-supplied name, keeping that appearance intact at the buffer limit.
    if (called != null) name += ' called ' + String(called).slice(0,
        255 - name.length - 8 - (description != null ? description.length + 3 : 0));
    if (description != null) name += ' (' + description + ')';
    return name;
}

// o_init.c:disco_typename inserts the English explanation before the called
// name or appearance, keeping Japanese object names useful in discoveries.
export function discoveryTypeName(type, options = {}) {
    let name = objectTypeName(type, options);
    const role = options.role || game._startup_role || game.urole?.name?.m;
    if (role === 'Samurai' && JAPANESE_NAMES.has(type.name)) {
        const known = options.known ?? objectTypeIsKnown({ _c_otyp: type.id }, type);
        const actual = ['MAGIC_HARP', 'WOODEN_HARP'].includes(type.symbol) && !known ? 'harp' : type.name;
        const insertion = / called/i.test(name) ? / called/i : / \(/;
        name = insertion.test(name) ? name.replace(insertion, text => ' [' + actual + ']' + text)
            : name + ' [' + actual + ']';
    }
    return name;
}

export function indefiniteArticle(text) {
    const word = String(text).toLowerCase();
    if (!word[1] || word[1] === ' ') return 'aefhilmnosx'.includes(word[0]) ? 'an ' : 'a ';
    if (word.startsWith('the ') || ['molten lava', 'iron bars', 'ice'].includes(word)) return '';
    const vowel = /^[aeiou]/.test(word) && !/^one(?:$|[-_ ])/.test(word)
        && !/^(?:eu|uke|ukulele|unicorn|uranium|useful)/.test(word);
    return vowel || /^x[^aeiou]/.test(word) ? 'an ' : 'a ';
}

// do_name.c:obj_pmname derives gender from the corpse/statue/figurine, not
// from saved monster traits (which can refer to a different revived species).
export function objectMonsterName(item) {
    const raw = item.corpsenm;
    let mon = typeof raw === 'number' ? MONS[raw] : MONS.find(mon => mon.name === raw?.name || mon.names?.includes(raw?.name));
    if (!mon) return raw?.name || 'two-legged glorkum-seeker';
    const gender = (item.spe || 0) & 3;
    if (mon.pm === PM_ALIGNED_CLERIC && gender === 0) mon = MONS[PM_CLERIC];
    return mon.names?.[gender === 2 ? 0 : gender === 1 ? 1 : 2] || mon.name;
}

// objnam.c:armor_simple_name supplies the short noun before a called name.
// Glove and boot wording depends on actual observation, even during override_ID.
export function armorSimpleName(item, type = objectTypeData(item), description = type.description) {
    const seen = item.dknown, known = objectTypeIsKnown(item, type);
    const symbol = type.symbol, name = type.name, material = item.material ?? type.material;
    switch (type.subtype) {
    case 0:
        return /dragon scale mail$/.test(name) ? 'dragon mail' : /dragon scales$/.test(name) ? 'dragon scales'
            : name.endsWith(' mail') ? 'mail' : name.endsWith(' jacket') ? 'jacket' : 'suit';
    case 1: return symbol === 'SHIELD_OF_REFLECTION' ? seen ? 'silver shield' : 'smooth shield' : 'shield';
    case 2: return (material >= 11 && material <= 17 || material === 19) ? 'helm' : 'hat';
    case 3: return seen && (known ? name : description || '').includes('gauntlets') ? 'gauntlets' : 'gloves';
    case 4: return seen && ((description || '').includes('shoes') || known && name.includes('shoes')) ? 'shoes' : 'boots';
    case 5: return symbol === 'ROBE' ? 'robe' : symbol === 'MUMMY_WRAPPING' ? 'wrapping'
        : symbol === 'ALCHEMY_SMOCK' ? known && seen ? 'smock' : 'apron' : 'cloak';
    case 6: return 'shirt';
    default: return name;
    }
}

// objnam.c:xname_flags. Context supplies shuffled descriptions and discovery
// callbacks; type, instance and appearance knowledge stay separate throughout.
export function xname(item, D = {}, { singular = false, partlyEaten = false } = {}) {
    const type = objectTypeData(item);
    if (!type) return D.fallback?.(item) || item.kind || 'object?';
    const symbol = type.symbol, role = D.role || game._startup_role || game.urole?.name?.m;
    let actual = type.name || (type.id > 0 && type.id < 18 ? 'generic' : 'object?');
    let description = D.description?.(item, type) ?? item.appearance ?? type.description;
    if (role === 'Samurai') {
        actual = JAPANESE_NAMES.get(actual) || actual;
        if (symbol === 'WOODEN_HARP' || symbol === 'MAGIC_HARP') description = 'koto';
    }
    description ??= actual;
    let nameKnown = objectTypeIsKnown(item, type);
    if (!nameKnown && type.usesKnown && type.unique) item.known = false;
    if (!D.blind && !D.distant && !D.hallucinating && type.id >= 18) {
        item.dknown = true;
        D.observe?.(item, type);
    }
    if (role === 'Priest') item.bknown = true;
    const override = D.override || item._identify_override;
    const known = override || (item.known ?? !type.usesKnown), seen = override || item.dknown;
    const bucKnown = override || item.bknown;
    nameKnown ||= override;
    const artifact = item.artifact || item.oartifact;
    if (artifact && item.dknown) D.findArtifact?.(item);
    const oname = D.oname?.(item) ?? item.oname ?? item.o_name ?? item.userName
        ?? item._wish_object_name ?? (typeof artifact === 'string' ? artifact : null)
        ?? String(item.kind || '').match(/ named (.+)$/)?.[1];
    const proper = artifact && oname && (override || D.gameover || objectIsFullyIdentified(item));
    if (proper) return oname.replace(/^[Tt]he /, '').slice(0, 175);
    const called = D.called?.(item, type);
    const hasMonster = item.corpsenm != null && item.corpsenm !== -1;
    let name = '';
    switch (type.class) {
    case 5:
        name = !seen ? 'amulet' : ['AMULET_OF_YENDOR', 'FAKE_AMULET_OF_YENDOR'].includes(symbol)
            ? known ? actual : description : nameKnown ? actual : called ? 'amulet called ' + called : description + ' amulet';
        break;
    case 2:
    case 6:
    case 17:
        if (type.class === 2 && (type.subtype >= -24 && type.subtype <= -20 || String(artifact).toLowerCase() === 'grimtooth') && item.opoisoned) name = 'poisoned ';
        if (symbol === 'LENSES') name = 'pair of ';
        else if (symbol === 'TOWEL' && item.spe > 0) name = item.spe < 3 ? 'moist ' : 'wet ';
        name += !seen ? description : nameKnown ? actual : called ? description + ' called ' + called : description;
        if (symbol === 'FIGURINE' && hasMonster) {
            const monster = objectMonsterName(item);
            name += ' of ' + indefiniteArticle(monster) + monster;
        } else if (symbol === 'TOWEL' && item.spe > 0 && D.wizard) name += ` (${item.spe})`;
        break;
    case 3:
        if (/dragon scales$/.test(type.name)) { name = 'set of ' + actual; break; }
        if (type.subtype === 3 || type.subtype === 4) name = 'pair of ';
        else if (type.subtype === 1 && !seen) {
            if (['ELVEN_SHIELD', 'URUK_HAI_SHIELD', 'ORCISH_SHIELD'].includes(symbol)) { name = 'shield'; break; }
            if (symbol === 'SHIELD_OF_REFLECTION') { name = 'smooth shield'; break; }
        }
        name += nameKnown ? actual : called ? armorSimpleName(item, type, description) + ' called ' + called : description;
        break;
    case 7:
        if (symbol === 'SLIME_MOLD') {
            name = D.fruit?.(item.spe) || game._fruit_registry?.find(fruit => fruit.fid === item.spe)?.fname || 'fruit';
            if ((item.quan ?? 1) !== 1 && !singular) name = makeSingular(name);
        } else {
            if (partlyEaten && item.oeaten) name = 'partly eaten ';
            if (item.globby) name += (item.owt <= 100 ? 'small ' : item.owt <= 300 ? 'medium ' : item.owt <= 500 ? 'large ' : 'very large ') + actual;
            else {
                name += actual;
                if (symbol === 'TIN' && known) name = tinDetails(item, name, !!override);
            }
        }
        break;
    case 12:
    case 16: name = actual; break;
    case 14:
        if (symbol === 'STATUE' && hasMonster) {
            const monster = typeof item.corpsenm === 'number' ? MONS[item.corpsenm]
                : MONS.find(mon => mon.name === item.corpsenm.name || mon.names?.includes(item.corpsenm.name));
            const monsterName = objectMonsterName(item);
            const unique = monster && monster.geno & G_UNIQ && ![PM_HIGH_CLERIC, PM_LONG_WORM_TAIL].includes(monster.pm);
            name = (role === 'Archeologist' && item.spe & 4 ? 'historic ' : '') + actual + ' of '
                + (monster && type_is_pname(monster) ? '' : unique ? 'the ' : indefiniteArticle(monsterName)) + monsterName;
        } else if (symbol === 'BOULDER' && (item.next_boulder ?? item.corpsenm) === 1) {
            name = 'next ' + actual;
            item.next_boulder = 0;
            if (typeof item.corpsenm === 'number') item.corpsenm = 0;
        } else name = actual;
        break;
    case 15: name = (item.owt > type.weight ? 'very ' : '') + 'heavy iron ball'; break;
    case 8:
        if (seen && item.odiluted) name = 'diluted ';
        name += !seen ? 'potion' : nameKnown ? 'potion of '
            + (symbol === 'POT_WATER' && bucKnown && (item.blessed || item.cursed) ? item.blessed ? 'holy ' : 'unholy ' : '') + actual
            : called ? 'potion called ' + called : description + ' potion';
        break;
    case 9:
        name = !seen ? 'scroll' : nameKnown ? 'scroll of ' + actual : called ? 'scroll called ' + called
            : type.magic ? 'scroll labeled ' + description : description + ' scroll';
        break;
    case 10:
        if (symbol === 'SPE_NOVEL') name = !seen ? 'book' : nameKnown ? actual
            : called ? 'novel called ' + called : description + ' book';
        else name = !seen ? 'spellbook' : nameKnown ? (symbol === 'SPE_BOOK_OF_THE_DEAD' ? '' : 'spellbook of ') + actual
            : called ? 'spellbook called ' + called : description + ' spellbook';
        break;
    case 4:
    case 11: {
        const cls = type.class === 4 ? 'ring' : 'wand';
        name = !seen ? cls : nameKnown ? cls + ' of ' + actual : called ? cls + ' called ' + called : description + ' ' + cls;
        break;
    }
    case 13: {
        const cls = type.material === 21 ? 'stone' : 'gem';
        name = !seen ? cls : !nameKnown ? called ? cls + ' called ' + called : description + ' ' + cls
            : actual + (symbol === 'FLINT' || type.material === 20 && !GEM_WITHOUT_STONE.has(symbol) ? ' stone' : '');
        break;
    }
    default: name = `glorkum ${type.class} ${type.id} ${item.spe || 0}`;
    }
    if ((item.quan ?? 1) !== 1 && !singular) name = makePlural(name);
    if (D.gameover && item.o_id) name += D.disclosureText?.(item, type) || '';
    if (oname && seen) name += ' named ' + (artifact ? oname.replace(/^The /, 'the ') : oname);
    return name.slice(0, 175).replace(/^the /, '');
}

export function erosionWords(item, override = false) {
    const type = objectTypeData(item), crystal = type.symbol === 'CRYSKNIFE';
    const traits = objectDamageTraits(item, type);
    if (!traits.damageable && !crystal) return '';
    let words = '';
    for (const [amount, noun] of [[item.oeroded, traits.rusty ? 'rusty' : traits.cracked ? 'cracked' : 'burnt'],
        [item.oeroded2, traits.corroded ? 'corroded' : 'rotted']])
        if (amount && !crystal) words += (amount === 2 ? 'very ' : amount === 3 ? 'thoroughly ' : '') + noun + ' ';
    if ((override || item.rknown) && item.oerodeproof)
        words += crystal ? 'fixed ' : traits.rusty ? 'rustproof ' : traits.corroded ? 'corrodeproof '
            : traits.burnt ? 'fireproof ' : traits.cracked ? 'tempered ' : traits.rotted ? 'rotproof ' : '';
    return words;
}

// objnam.c:corpse_xname positions adjectives after a unique monster's
// possessive name. Ordinary species put those adjectives before the name.
export function corpseName(item, adjective = '', { singular = false, noPrefix = false,
    thePrefix = false, article = false, omitCorpse = false } = {}) {
    const type = objectTypeData(item), glob = type.symbol !== 'CORPSE' && item.globby;
    const mon = typeof item.corpsenm === 'number' ? MONS[item.corpsenm]
        : MONS.find(mon => mon.name === item.corpsenm?.name || mon.names?.includes(item.corpsenm?.name));
    let name = glob ? type.name : item.corpsenm == null || item.corpsenm === -1 ? 'thing' : objectMonsterName(item);
    const proper = !glob && mon && type_is_pname(mon);
    const unique = !glob && mon && mon.geno & G_UNIQ && ![PM_HIGH_CLERIC, PM_LONG_WORM_TAIL].includes(mon.pm);
    const possessive = proper || unique;
    if (possessive) {
        name += name.toLowerCase() === 'it' ? 's' : name.toLowerCase() === 'you' ? 'r' : name.endsWith('s') ? "'" : "'s";
        if (proper) noPrefix = true;
        else if (!noPrefix) thePrefix = true;
    }
    if (noPrefix) thePrefix = article = false;
    else if (thePrefix) article = false;
    if (adjective) {
        name = (possessive ? name + ' ' + adjective : adjective + ' ' + name).replace(/\s+/g, ' ').trim();
        if (/^\d/.test(adjective)) article = false;
    }
    if (thePrefix) name = 'the ' + name;
    if (!glob && !omitCorpse) {
        name += ' corpse';
        if (item.quan > 1 && !singular) { name += 's'; article = false; }
    }
    return (article ? indefiniteArticle(name) : '') + name;
}

// objnam.c:doname_base adds knowledge-dependent qualifiers and equipment state
// after xname has observed the object. Pricing and actor display use their
// owning runtime callbacks, so formatting can be used for floor objects too.
export function doname(item, D = {}, { withPrice = false, vagueQuantity = false, forMenu = false } = {}) {
    const type = objectTypeData(item);
    if (!type) return D.fallback?.(item) || item.kind || 'object?';
    let name = xname(item, D);
    const symbol = type.symbol, quan = item.quan ?? 1, spe = item.spe || 0;
    const override = D.override || item._identify_override;
    const known = override || (item.known ?? !type.usesKnown), seen = override || item.dknown;
    const contentsKnown = override || item.cknown, bucKnown = override || item.bknown, lockKnown = override || item.lknown;
    const worn = D.wornMask?.(item, type) ?? item.owornmask ?? 0;
    const role = D.role || game._startup_role || game.urole?.name?.m;
    const container = ['LARGE_BOX', 'CHEST', 'ICE_BOX', 'SACK', 'OILSKIN_SACK', 'BAG_OF_HOLDING', 'BAG_OF_TRICKS'].includes(symbol);
    const box = symbol === 'LARGE_BOX' || symbol === 'CHEST';
    const contents = item.contents || item.cobj || [];
    const weaponTool = type.class === 6 && type.subtype !== 0;
    const poisoned = item.opoisoned && name.startsWith('poisoned ');
    if (poisoned) name = name.slice(9);
    const artifact = item.artifact || item.oartifact;
    const proper = artifact && (override || D.gameover || objectIsFullyIdentified(item));
    const unique = seen && (symbol === 'FAKE_AMULET_OF_YENDOR' && !known
        || type.unique && (known || symbol === 'AMULET_OF_YENDOR'));
    const fruitArtifact = symbol === 'SLIME_MOLD' && D.artifactName?.(name);
    let prefix = quan !== 1 ? seen || !vagueQuantity ? quan + ' ' : 'some '
        : symbol === 'CORPSE' ? '' : proper || unique || /^the /i.test(fruitArtifact || '') ? 'the '
            : fruitArtifact ? '' : 'a ';
    if (prefix === 'the ') name = name.replace(/^the /i, '');
    if (contentsKnown && (['BAG_OF_TRICKS', 'HORN_OF_PLENTY'].includes(symbol) ? spe === 0 && !known
        : (container || symbol === 'STATUE') && !contents.length)) prefix += 'empty ';
    if (bucKnown && type.class !== 12 && (symbol !== 'POT_WATER' || !objectTypeIsKnown(item, type) || !item.cursed && !item.blessed)) {
        if (item.cursed) prefix += 'cursed ';
        else if (item.blessed) prefix += 'blessed ';
        else if (D.implicitUncursed === false || (D.implicitUncursed == null && game.flags?.implicit_uncursed === false)
            || (!known || !type.charged || type.class === 3 || type.class === 4)
                && !['SCR_MAIL', 'FAKE_AMULET_OF_YENDOR', 'AMULET_OF_YENDOR'].includes(symbol) && role !== 'Priest') prefix += 'uncursed ';
    }
    if (box && item.otrapped && item.tknown && item.dknown) prefix += 'trapped ';
    if (box && lockKnown) prefix += item.obroken ? 'broken ' : item.olocked || item.locked ? 'locked ' : 'unlocked ';
    if (item.greased) prefix += 'greased ';
    if (contentsKnown && contents.length) name += ` containing ${contents.length} item${contents.length === 1 ? '' : 's'}`;
    const hand = D.hand || 'hand', right = D.leftHanded ? 'left' : 'right', left = D.leftHanded ? 'right' : 'left';
    switch (weaponTool ? 2 : type.class) {
    case 5:
        if (worn & W_AMUL) name += ' (being worn)';
        break;
    case 3:
        if (worn & W_ARMOR) {
            name += item === D.skin ? ' (embedded in your skin)' : D.doffing?.(item) ? ' (being doffed)'
                : D.donning?.(item) ? ' (being donned)' : ' (being worn)';
            if (worn & W_ARMG && D.glib) name = name.slice(0, -1) + '; slippery)';
            if (!D.blind && item.lamplit && D.artifactLight?.(item)) name = name.slice(0, -1) + ', ' + D.artifactLight(item) + ' lit)';
        }
        // Armor and weapon-tools share weapon enchantment and erosion wording.
        // fall through
    case 2:
        if (poisoned) prefix += 'poisoned ';
        prefix += erosionWords(item, override);
        if (known) prefix += (spe >= 0 ? '+' : '') + spe + ' ';
        break;
    case 6:
        if (worn & (W_TOOL | W_SADDLE)) name += ' (being worn)';
        else if (symbol === 'LEASH' && item.leashmon) {
            const monster = D.leashedMonster?.(item.leashmon);
            if (monster) name += ' (attached to ' + monster + ')';
            else item.leashmon = 0;
        } else if (symbol === 'CANDELABRUM_OF_INVOCATION')
            name += ` (${spe} of 7 candle${spe === 1 ? '' : 's'}${item.lamplit ? ', lit' : ' attached'})`;
        else if (['OIL_LAMP', 'MAGIC_LAMP', 'BRASS_LANTERN', 'TALLOW_CANDLE', 'WAX_CANDLE'].includes(symbol)) {
            if (symbol.endsWith('_CANDLE')) {
                const remaining = (item.age || 0) + (item.lamplit ? (D.burnDeadline?.(item) || 0) - (D.moves ?? game.moves) : 0);
                if (remaining < 20 * type.cost) prefix += 'partly used ';
            }
            if (item.lamplit) name += ' (lit)';
        } else if (type.charged && known) name += ` (${item.recharged || 0}:${spe})`;
        break;
    case 11:
        if (known) name += ` (${item.recharged || 0}:${spe})`;
        break;
    case 8:
        if (symbol === 'POT_OIL' && item.lamplit) name += ' (lit)';
        break;
    case 4:
        if (worn & W_RINGR) name += ' (on right ';
        if (worn & W_RINGL) name += ' (on left ';
        if (worn & (W_RINGR | W_RINGL)) name += hand + ')';
        if (known && type.charged) prefix += (spe >= 0 ? '+' : '') + spe + ' ';
        break;
    case 7:
        if (item.oeaten) prefix += 'partly eaten ';
        if (symbol === 'CORPSE') prefix = corpseName(item, prefix, { article: quan === 1, omitCorpse: true }) + ' ';
        else if (symbol === 'EGG') {
            const monster = typeof item.corpsenm === 'number' ? MONS[item.corpsenm] : item.corpsenm;
            if (monster && (known || D.knownEgg?.(item.corpsenm))) {
                prefix += (monster.names?.[2] || monster.name) + ' ';
                if (spe === 1) name += ' (laid by you)';
            }
        } else if (symbol === 'MEAT_RING') {
            if (worn & W_RINGR) name += ' (on right ';
            if (worn & W_RINGL) name += ' (on left ';
            if (worn & (W_RINGR | W_RINGL)) name += hand + ')';
        }
        break;
    case 15:
    case 16:
        prefix += erosionWords(item, override);
        if (worn & (W_BALL | W_CHAIN)) name += worn & W_BALL ? ' (chained to you)' : ' (attached to you)';
        break;
    }
    if (D.wizard && D.wizmgender && ['STATUE', 'CORPSE', 'FIGURINE'].includes(symbol))
        name += ' (' + ['unspecified gender', 'female', 'male', 'neuter'][spe & 3] + ')';
    if (worn & W_WEP && !D.mergingToWielded) {
        const twoWeapon = D.twoWeapon && item === D.primaryWeapon;
        if ((quan !== 1 || (type.class === 2 ? type.subtype < 0 : !weaponTool)) && !twoWeapon) name += ' (wielded)';
        else {
            name += ' (' + (symbol === 'AKLYS' ? 'tethered to' : twoWeapon ? 'wielded in' : 'weapon in')
                + ' ' + (type.big ? makePlural(hand) : right + ' ' + hand) + ')';
            if (!D.blind) {
                const warning = D.weaponWarning?.(item);
                if (warning) name = name.slice(0, -1) + ', ' + warning + ')';
                else if (item.lamplit && D.artifactLight?.(item)) name = name.slice(0, -1) + ', ' + D.artifactLight(item) + ' lit)';
            }
        }
    }
    if (worn & W_SWAPWEP) name += D.twoWeapon ? ' (wielded in ' + left + ' ' + hand + ')'
        : ` (alternate weapon${quan === 1 ? '' : 's'}; not wielded)`;
    if (worn & W_QUIVER) name += ' (' + (type.class === 2 ? type.subtype >= -22 && type.subtype <= -20
        ? type.subtype === -20 ? 'in quiver' : 'in quiver pouch' : 'at the ready'
        : [4, 5, 11, 12, 13].includes(type.class) ? 'in quiver pouch' : 'at the ready') + ')';
    if (!D.suppressPrice && !D.restoring) name += D.priceSuffix?.(item, withPrice, name) || '';
    if (prefix.startsWith('a ')) prefix = indefiniteArticle(prefix.slice(2) || name) + prefix.slice(2);
    if (D.wizard && D.wizweight) name = withPrice && name.endsWith(')')
        ? name.slice(0, -1) + `, ${item.owt || 0} aum)` : name + ` (${item.owt || 0} aum)`;
    // strprepend rejects a prefix that exceeds its reserved buffer outright.
    return ((prefix.length > 80 ? '' : prefix) + name.slice(0, 175)).slice(0, forMenu ? 251 : 255);
}
