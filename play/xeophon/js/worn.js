// C: worn.c m_dowear(creation=TRUE), m_dowear_type and update_mon_extrinsics.
import * as pm from './permonst.js';
import { ARMOR_AC_BONUS } from './armor.js';
import { W_AMUL, W_ARMU, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARM, W_WEP, MFAST } from './const.js';
import { beginBurn, endBurn, artifactLight } from './burn.js';

const SPECIES = new Map(pm.MONS.flatMap(mon => [mon.name, ...(mon.names || [])].map(name => [name.toLowerCase(), mon])));
const RESISTANCE_GEAR = {
    'red dragon scale mail': pm.MR_FIRE, 'red dragon scales': pm.MR_FIRE,
    'white dragon scale mail': pm.MR_COLD, 'white dragon scales': pm.MR_COLD,
    'orange dragon scale mail': pm.MR_SLEEP, 'orange dragon scales': pm.MR_SLEEP,
    'black dragon scale mail': pm.MR_DISINT, 'black dragon scales': pm.MR_DISINT,
    'blue dragon scale mail': pm.MR_ELEC, 'blue dragon scales': pm.MR_ELEC,
    'green dragon scale mail': pm.MR_POISON, 'green dragon scales': pm.MR_POISON,
    'yellow dragon scale mail': pm.MR_ACID, 'yellow dragon scales': pm.MR_ACID,
    'alchemy smock': pm.MR_POISON | pm.MR_ACID,
    'shield of shock resistance': pm.MR_ELEC,
};

function armorKind(obj) {
    return String(obj?.actualKind || obj?.kind || '').toLowerCase().replace(/ named .*$/, '');
}

function armorMask(obj) {
    const name = armorKind(obj);
    if (['amulet of life saving', 'amulet of reflection', 'amulet of guarding'].includes(name)) return W_AMUL;
    if (/\b(?:cloak|robe|wrapping|smock)\b/.test(name)) return W_ARMC;
    if (/\b(?:mail|armor|jacket|coat|dragon scales?)\b/.test(name)) return W_ARM;
    if (/\bshirt\b/.test(name)) return W_ARMU;
    if (/\b(?:helm|helmet|fedora|cornuthaum|cap|pot)\b/.test(name)) return W_ARMH;
    if (/\b(?:gloves|gauntlets)\b/.test(name)) return W_ARMG;
    if (/\b(?:boots|shoes)\b/.test(name)) return W_ARMF;
    if (/\b(?:shield|roundshield)\b/.test(name)) return W_ARMS;
    return 0;
}

// At creation, fitting armor takes no time and produces no wear messages.
// The same restrictions also apply after a special-level inventory callback.
export function dressMonster(mon) {
    const data = pm.MONS[mon?.data?.pm] || SPECIES.get(String(mon?.data?.name || '').toLowerCase());
    if (!data || pm.verysmall(data) || pm.nohands(data) || pm.is_animal(data) || mon.mfrozen) return;
    if (pm.mindless(data) && data.mlet !== pm.S_MUMMY && data.pm !== pm.PM_SKELETON) return;
    const canWear = data.size > pm.MZ_SMALL && data.size < pm.MZ_LARGE
        && pm.humanoid(data) && !pm.is_whirly(data) && !pm.noncorporeal(data)
        && ![pm.PM_MARILITH, pm.PM_WINGED_GARGOYLE].includes(data.pm);
    const wrapping = pm.humanoid(data) && data.size >= pm.MZ_SMALL && data.size <= pm.MZ_HUGE
        && !pm.noncorporeal(data) && data.mlet !== pm.S_CENTAUR
        && ![pm.PM_MARILITH, pm.PM_WINGED_GARGOYLE].includes(data.pm);
    const horns = [pm.PM_HORNED_DEVIL, pm.PM_MINOTAUR, pm.PM_ASMODEUS, pm.PM_BALROG,
        pm.PM_WHITE_UNICORN, pm.PM_GRAY_UNICORN, pm.PM_BLACK_UNICORN, pm.PM_KI_RIN].includes(data.pm);
    const inventory = mon.minvent || [];
    const scores = new Map(inventory.map(obj => {
        const kind = armorKind(obj);
        const ac = ARMOR_AC_BONUS[kind] ?? obj.a_ac ?? 0;
        const erosion = Math.min(ac, Math.max(obj.oeroded || 0, obj.oeroded2 || 0));
        const speedBonus = kind === 'speed boots' && mon.permspeed !== 'fast' && mon.permspeed !== MFAST ? 20 : 0;
        return [obj, ac + (obj.spe || 0) - erosion + speedBonus];
    }));
    for (const mask of [W_AMUL, W_ARMU, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARM]) {
        if (mask === W_ARMU && (!canWear || (mon.misc_worn_check & W_ARM))) continue;
        if (mask === W_ARMC && !canWear && !wrapping) continue;
        if (mask === W_ARMF && (pm.slithy(data) || data.mlet === pm.S_CENTAUR)) continue;
        const wielded = mon.mw || mon.weapon || inventory.find(obj => obj.owornmask & W_WEP);
        if (mask === W_ARMS && wielded && (wielded.bimanual || /^(?:two-handed sword|battle-axe|tsurugi|dwarvish mattock|quarterstaff|partisan|ranseur|spetum|glaive|halberd|bardiche|voulge|fauchard|guisarme|bill-guisarme|lucern hammer|bec de corbin)$/.test(armorKind(wielded)))) continue;
        const old = inventory.find(obj => obj.owornmask & mask);
        if (old?.cursed || (mask === W_AMUL && old && armorKind(old) !== 'amulet of guarding')) continue;
        let best = old;
        let score = best ? scores.get(best) : -Infinity;
        for (const obj of inventory) {
            if (armorMask(obj) !== mask) continue;
            const kind = armorKind(obj);
            if (mask === W_AMUL) {
                if (!best || kind !== 'amulet of guarding') best = obj;
                if (armorKind(best) !== 'amulet of guarding') break;
                continue;
            }
            if (obj.owornmask) continue;
            if (mask === W_ARM && !canWear && !(data.pm === pm.PM_HOBBIT && kind.startsWith('elven '))) continue;
            if (mask === W_ARMC && data.size > pm.MZ_HUMAN && kind !== 'mummy wrapping') continue;
            if (mask === W_ARMH) {
                if (kind === 'helm of opposite alignment' && (mon.ispriest || mon.isminion)) continue;
                if (horns && !['elven leather helm', 'fedora', 'cornuthaum', 'dunce cap'].includes(kind)) continue;
            }
            const nextScore = scores.get(obj);
            if (!best || nextScore > score) { best = obj; score = nextScore; }
        }
        if (!best || best === old) continue;
        if (old) {
            if (old.lamplit && artifactLight(old)) endBurn(old, false);
            old.owornmask = 0; old.worn = false;
        }
        best.owornmask = (best.owornmask || 0) | mask;
        best.worn = true;
        mon.misc_worn_check = (mon.misc_worn_check || 0) | mask;
        if (['helm of opposite alignment', 'dunce cap'].includes(armorKind(best))) {
            best.cursed = true; best.blessed = false;
        }
        if (artifactLight(best) && !best.lamplit) beginBurn(best);
    }
    // Resistance bits belong to worn gear; innate species/temporary bits are
    // stored separately. C deliberately leaves levitation/displacement inert.
    let resistances = 0;
    let invisible = !!mon.perminvis, blocked = false, speedBoots = false;
    for (const obj of inventory) {
        if (!obj.owornmask || !armorMask(obj)) continue;
        const kind = armorKind(obj);
        resistances |= RESISTANCE_GEAR[kind] || 0;
        invisible ||= kind === 'cloak of invisibility';
        blocked ||= kind === 'mummy wrapping';
        speedBoots ||= kind === 'speed boots';
    }
    mon.mextrinsics = resistances;
    mon.invis_blkd = blocked ? 1 : 0;
    mon.minvis = invisible && !blocked;
    mon.mspeed = speedBoots ? 'fast' : mon.permspeed || 0;
}

