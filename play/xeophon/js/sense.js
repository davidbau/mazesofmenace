// Shared position sensing from display.h:sensemon and its property sources.
// This module depends only on game state and constants so rendering and
// command handling can use the same visibility restrictions.
import { game } from './gstate.js';
import { IS_POOL } from './const.js';

export function heroStuckMonsterMatches(mon) {
    const stuck = game.u?.ustuck;
    if (stuck === mon) return true;
    if (!stuck || !mon) return false;
    return (stuck.m_id != null && stuck.m_id === mon.m_id)
        || (stuck.id != null && stuck.id === mon.id);
}

export function heroHasMonsterDetection() {
    return !!(game.u?.HDetect_monsters || game.u?.EDetect_monsters
        || game.u?.Detect_monsters || game.u?.detect_monsters
        || game.u?.detectMonsters || game._detect_monsters_display);
}

export function heroIsUnderwater() {
    return !!(game.u?.underwater || game.u?.uunderwater || game.u?.Underwater || game.Underwater);
}

export function heroSensingAllowsMonster(mon) {
    if (game.u?.uswallow && !heroStuckMonsterMatches(mon)) return false;
    if (heroIsUnderwater()) {
        const dx = (mon.mx ?? 0) - (game.u?.ux ?? 0);
        const dy = (mon.my ?? 0) - (game.u?.uy ?? 0);
        const loc = game.level?.at?.(mon.mx, mon.my);
        if (dx * dx + dy * dy > 2 || !IS_POOL(loc?.typ)) return false;
    }
    return true;
}

export function heroDetectsMonster(mon) {
    if (!mon || !heroHasMonsterDetection()) return false;
    return heroSensingAllowsMonster(mon);
}

const HERO_WARN_OF_MON_FLAGS = Object.freeze({
    UNDEAD: 0x00000002,
    WERE: 0x00000004,
    HUMAN: 0x00000008,
    ELF: 0x00000010,
    DWARF: 0x00000020,
    GNOME: 0x00000040,
    ORC: 0x00000080,
    DEMON: 0x00000100,
    MERC: 0x00000200,
    LORD: 0x00000400,
    PRINCE: 0x00000800,
    MINION: 0x00001000,
    GIANT: 0x00002000,
    SHAPESHIFTER: 0x00004000,
});

const HERO_WARN_OF_MON_FLAG_BY_NAME = new Map([
    ['undead', HERO_WARN_OF_MON_FLAGS.UNDEAD], ['m2_undead', HERO_WARN_OF_MON_FLAGS.UNDEAD],
    ['were', HERO_WARN_OF_MON_FLAGS.WERE], ['lycanthrope', HERO_WARN_OF_MON_FLAGS.WERE],
    ['human', HERO_WARN_OF_MON_FLAGS.HUMAN], ['humans', HERO_WARN_OF_MON_FLAGS.HUMAN],
    ['elf', HERO_WARN_OF_MON_FLAGS.ELF], ['elves', HERO_WARN_OF_MON_FLAGS.ELF],
    ['dwarf', HERO_WARN_OF_MON_FLAGS.DWARF], ['dwarves', HERO_WARN_OF_MON_FLAGS.DWARF],
    ['gnome', HERO_WARN_OF_MON_FLAGS.GNOME], ['gnomes', HERO_WARN_OF_MON_FLAGS.GNOME],
    ['orc', HERO_WARN_OF_MON_FLAGS.ORC], ['orcs', HERO_WARN_OF_MON_FLAGS.ORC],
    ['demon', HERO_WARN_OF_MON_FLAGS.DEMON], ['demons', HERO_WARN_OF_MON_FLAGS.DEMON],
    ['merc', HERO_WARN_OF_MON_FLAGS.MERC], ['mercenary', HERO_WARN_OF_MON_FLAGS.MERC],
    ['lord', HERO_WARN_OF_MON_FLAGS.LORD], ['prince', HERO_WARN_OF_MON_FLAGS.PRINCE],
    ['minion', HERO_WARN_OF_MON_FLAGS.MINION],
    ['giant', HERO_WARN_OF_MON_FLAGS.GIANT], ['giants', HERO_WARN_OF_MON_FLAGS.GIANT],
    ['shapeshifter', HERO_WARN_OF_MON_FLAGS.SHAPESHIFTER], ['shapechanger', HERO_WARN_OF_MON_FLAGS.SHAPESHIFTER],
]);

const HERO_WARN_OF_MON_M2_GIANT_NAMES = new Set([
    'giant', 'stone giant', 'hill giant', 'fire giant', 'frost giant', 'storm giant',
    'giant mummy', 'giant zombie', 'Cyclops', 'Lord Surtur',
].map(name => name.toLowerCase()));

function normalizedHeroWarnFlagName(value) {
    return String(value || '').trim().toLowerCase().replace(/^m2[_ -]?/, 'm2_').replace(/[\s-]+/g, '_');
}

function heroWarnOfMonMaskNameValue(value) {
    const name = normalizedHeroWarnFlagName(value);
    return HERO_WARN_OF_MON_FLAG_BY_NAME.get(name) || HERO_WARN_OF_MON_FLAG_BY_NAME.get(name.replace(/^m2_/, '')) || 0;
}

function heroWarnOfMonMaskValue(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value | 0;
    if (typeof value === 'bigint') return Number(value & 0xffffffffn) | 0;
    if (typeof value === 'string') return heroWarnOfMonMaskNameValue(value);
    if (Array.isArray(value))
        return value.reduce((mask, entry) => mask | heroWarnOfMonMaskValue(entry), 0);
    if (value && typeof value === 'object') {
        let mask = 0;
        for (const [name, enabled] of Object.entries(value)) {
            if (enabled) mask |= heroWarnOfMonMaskNameValue(name);
        }
        return mask;
    }
    return 0;
}

function heroHasWarnOfMonsterType() {
    return !!(game.u?.HWarn_of_mon || game.u?.EWarn_of_mon || game.u?.Warn_of_mon
        || game.u?.HWarnOfMon || game.u?.EWarnOfMon || game.u?.warnOfMon || game.u?.warn_of_mon
        || game.u?.warnOfMonster || game.u?.warnOfMonsterType || game.u?.warn_of_monster_type
        || game.u?.warnOfMonsterMask || game.u?.warn_of_monster_mask
        || game.u?.warnOfMonsterSpecies || game.u?.warn_of_monster_species || game.context?.Warn_of_mon);
}

function heroWarnOfMonsterWarntype() {
    return game.context?.warntype || game.u?.warntype || game.u?.warnType
        || game.u?.warn_of_monster_type || game.u?.warnOfMonsterType || game._warntype || {};
}

function heroMonsterWarnDataFlag(mon, data, ...names) {
    return names.some(name => !!(mon?.[name] || data?.[name]));
}

function heroMonsterWarnNameHasWord(name, word) {
    return String(name || '').split(/[\s-]+/).includes(word);
}

function heroMonsterWarnM2Mask(mon) {
    const data = mon?.data || {};
    let mask = heroWarnOfMonMaskValue(mon?.mflags2) | heroWarnOfMonMaskValue(mon?.m2)
        | heroWarnOfMonMaskValue(data.mflags2) | heroWarnOfMonMaskValue(data.m2);
    const name = String(data.name || mon?.name || '').toLowerCase();
    const rawMlet = String(data.mlet || mon?.mlet || '');
    const rawGlyph = String(data.glyph || mon?.glyph || '');
    const mlet = rawMlet.toLowerCase();
    const glyph = rawGlyph.toLowerCase();

    if (heroMonsterWarnDataFlag(mon, data, 'undead')
        || ['M', 'Z', 'L', 'V'].includes(rawMlet) || ['M', 'Z', 'L', 'V'].includes(rawGlyph)
        || ['mummy', 'zombie', 'lich', 'vampire', 'wraith', 'ghost', 'skeleton', 'ghoul']
            .some(term => name.includes(term)))
        mask |= HERO_WARN_OF_MON_FLAGS.UNDEAD;
    if (heroMonsterWarnDataFlag(mon, data, 'were', 'wereHuman', 'wereBeast', 'lycanthrope')
        || /^were/.test(name))
        mask |= HERO_WARN_OF_MON_FLAGS.WERE;
    if (heroMonsterWarnDataFlag(mon, data, 'elf') || heroMonsterWarnNameHasWord(name, 'elf')
        || name.startsWith('elven'))
        mask |= HERO_WARN_OF_MON_FLAGS.ELF;
    if (heroMonsterWarnDataFlag(mon, data, 'dwarf') || name === 'dwarf' || name.startsWith('dwarf '))
        mask |= HERO_WARN_OF_MON_FLAGS.DWARF;
    if (heroMonsterWarnDataFlag(mon, data, 'gnome') || rawGlyph === 'G' || rawMlet === 'G' || mlet === 'gnome'
        || name === 'gnome' || name.startsWith('gnome '))
        mask |= HERO_WARN_OF_MON_FLAGS.GNOME;
    if (heroMonsterWarnDataFlag(mon, data, 'orc') || glyph === 'o' || mlet === 'orc'
        || name === 'goblin' || name === 'hobgoblin' || heroMonsterWarnNameHasWord(name, 'orc'))
        mask |= HERO_WARN_OF_MON_FLAGS.ORC;
    if (heroMonsterWarnDataFlag(mon, data, 'demon') || glyph === '&' || mlet === 'demon')
        mask |= HERO_WARN_OF_MON_FLAGS.DEMON;
    if (heroMonsterWarnDataFlag(mon, data, 'merc', 'mercenary')
        || ['soldier', 'sergeant', 'lieutenant', 'captain', 'watchman', 'watch captain'].includes(name)
        || mlet === 'kop')
        mask |= HERO_WARN_OF_MON_FLAGS.MERC;
    if (heroMonsterWarnDataFlag(mon, data, 'lord', 'demonLord') || /\blord\b/.test(name) || /\bking\b/.test(name))
        mask |= HERO_WARN_OF_MON_FLAGS.LORD;
    if (heroMonsterWarnDataFlag(mon, data, 'prince', 'demonPrince') || /\bprince\b/.test(name))
        mask |= HERO_WARN_OF_MON_FLAGS.PRINCE;
    if (heroMonsterWarnDataFlag(mon, data, 'minion'))
        mask |= HERO_WARN_OF_MON_FLAGS.MINION;
    if (heroMonsterWarnDataFlag(mon, data, 'giant') || HERO_WARN_OF_MON_M2_GIANT_NAMES.has(name))
        mask |= HERO_WARN_OF_MON_FLAGS.GIANT;
    if (heroMonsterWarnDataFlag(mon, data, 'shapeshifter', 'shapechanger', 'chameleon')
        || ['chameleon', 'doppelganger', 'sandestin'].includes(name))
        mask |= HERO_WARN_OF_MON_FLAGS.SHAPESHIFTER;

    const demihuman = mask & (HERO_WARN_OF_MON_FLAGS.ELF | HERO_WARN_OF_MON_FLAGS.DWARF
        | HERO_WARN_OF_MON_FLAGS.GNOME | HERO_WARN_OF_MON_FLAGS.ORC);
    if (heroMonsterWarnDataFlag(mon, data, 'human') || name === 'human'
        || ((glyph === '@' || mlet === 'human') && !demihuman && !(mask & HERO_WARN_OF_MON_FLAGS.DEMON)))
        mask |= HERO_WARN_OF_MON_FLAGS.HUMAN;
    return mask;
}

function heroWarnOfMonSpeciesMatches(mon, species) {
    if (!species || !mon) return false;
    const data = mon.data || {};
    if (species === data) return true;
    if (typeof species === 'string')
        return species.toLowerCase() === String(data.name || mon.name || '').toLowerCase();
    if (typeof species === 'number')
        return species === data.index || species === data.ndx || species === data.mnum;
    if (typeof species === 'object') {
        if (species.name && String(species.name).toLowerCase() === String(data.name || mon.name || '').toLowerCase())
            return true;
        const speciesIndex = species.index ?? species.ndx ?? species.mnum;
        if (speciesIndex != null)
            return speciesIndex === data.index || speciesIndex === data.ndx || speciesIndex === data.mnum;
    }
    return false;
}

export function heroWarnsOfMonsterType(mon) {
    if (!mon || !heroHasWarnOfMonsterType() || !heroSensingAllowsMonster(mon)) return false;
    const warntype = heroWarnOfMonsterWarntype();
    const warnMask = heroWarnOfMonMaskValue(warntype.obj) | heroWarnOfMonMaskValue(warntype.polyd)
        | heroWarnOfMonMaskValue(game.u?.warnOfMonsterMask) | heroWarnOfMonMaskValue(game.u?.warn_of_monster_mask);
    return !!((warnMask & heroMonsterWarnM2Mask(mon)) || heroWarnOfMonSpeciesMatches(mon, warntype.species)
        || heroWarnOfMonSpeciesMatches(mon, warntype.speciesidx)
        || heroWarnOfMonSpeciesMatches(mon, game.u?.warnOfMonsterSpecies)
        || heroWarnOfMonSpeciesMatches(mon, game.u?.warn_of_monster_species));
}
