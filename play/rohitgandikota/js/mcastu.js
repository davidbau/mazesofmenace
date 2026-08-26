// mcastu.js: monster spell selection and casting.
// C ref: src/mcastu.c

import { game } from './gstate.js';
import { rn2, d } from './rng.js';
import { ATTKS } from './monst_data.js';
import { ONAMES } from './objects_data.js';
import { M_ATTK_MISS, M_ATTK_HIT, MFAST, MSLOW, STRAT_WAITFORU, HEAD,
         M_SEEN_MAGR, M_SEEN_FIRE, M_SEEN_COLD, M_SEEN_SLEEP,
         M_SEEN_DISINT, M_SEEN_ELEC, M_SEEN_POISON,
         M_SEEN_ACID } from './const.js';
import { canspotmon, canseemon, pline } from './display.js';
import { couldsee } from './vision.js';
import { Monnam, mon_nam } from './do_name.js';
import { You, You_hear, Your } from './pline.js';
import { Hallucination, See_invisible, Invis, Deaf } from './youprop.js';
import { perceives } from './mondata.js';
import { body_part } from './polyself.js';
import { helpless } from './monst.js';
import { nomul } from './hack.js';

const MCF_INDIRECT = 0x01;
const MCF_SIGHT = 0x02;
const MCF_HOSTILE = 0x04;

const MCAST_PSI_BOLT = 0;
const MCAST_OPEN_WOUNDS = 1;
const MCAST_CURE_SELF = 2;
const MCAST_HASTE_SELF = 3;
const MCAST_CONFUSE_YOU = 4;
const MCAST_STUN_YOU = 5;
const MCAST_DISAPPEAR = 6;
const MCAST_PARALYZE = 7;
const MCAST_BLIND_YOU = 8;
const MCAST_WEAKEN_YOU = 9;
const MCAST_DESTRY_ARMR = 10;
const MCAST_INSECTS = 11;
const MCAST_CURSE_ITEMS = 12;
const MCAST_LIGHTNING = 13;
const MCAST_FIRE_PILLAR = 14;
const MCAST_GEYSER = 15;
const MCAST_AGGRAVATION = 16;
const MCAST_SUMMON_MONS = 17;
const MCAST_CLONE_WIZ = 18;
const MCAST_DEATH_TOUCH = 19;

const MCAST_DATA = [
    [0, MCF_HOSTILE | MCF_SIGHT],
    [0, MCF_HOSTILE | MCF_SIGHT],
    [1, MCF_INDIRECT],
    [2, MCF_INDIRECT],
    [2, MCF_HOSTILE | MCF_SIGHT],
    [3, MCF_HOSTILE | MCF_SIGHT],
    [4, MCF_INDIRECT],
    [4, MCF_HOSTILE | MCF_SIGHT],
    [6, MCF_HOSTILE | MCF_SIGHT],
    [6, MCF_HOSTILE | MCF_SIGHT],
    [8, MCF_HOSTILE | MCF_SIGHT],
    [8, MCF_HOSTILE | MCF_INDIRECT | MCF_SIGHT],
    [10, MCF_HOSTILE | MCF_SIGHT],
    [11, MCF_HOSTILE | MCF_SIGHT],
    [12, MCF_HOSTILE | MCF_SIGHT],
    [13, MCF_HOSTILE | MCF_SIGHT],
    [13, MCF_INDIRECT | MCF_HOSTILE | MCF_SIGHT],
    [15, MCF_HOSTILE | MCF_INDIRECT | MCF_SIGHT],
    [18, MCF_HOSTILE | MCF_INDIRECT | MCF_SIGHT],
    [20, MCF_HOSTILE | MCF_SIGHT],
];

const WIZARD_SPELLS = [
    MCAST_PSI_BOLT, MCAST_CURE_SELF, MCAST_HASTE_SELF, MCAST_STUN_YOU,
    MCAST_DISAPPEAR, MCAST_WEAKEN_YOU, MCAST_DESTRY_ARMR,
    MCAST_CURSE_ITEMS, MCAST_AGGRAVATION, MCAST_SUMMON_MONS,
    MCAST_CLONE_WIZ, MCAST_DEATH_TOUCH,
];
const CLERIC_SPELLS = [
    MCAST_OPEN_WOUNDS, MCAST_CURE_SELF, MCAST_CONFUSE_YOU,
    MCAST_PARALYZE, MCAST_BLIND_YOU, MCAST_INSECTS, MCAST_CURSE_ITEMS,
    MCAST_LIGHTNING, MCAST_FIRE_PILLAR, MCAST_GEYSER,
];

function note_unported_mcastu(what) {
    (game.unported ||= new Set()).add(what);
}

const antimagic = () => !!(game.u.uprops?.ANTIMAGIC
                            || game.u.uprops?.MAGIC_RES);
const half_spell_damage = () => !!game.u.uprops?.HALF_SPDAM;
const is_undirected_spell = (spellnum) =>
    !!(MCAST_DATA[spellnum][1] & MCF_INDIRECT);

function has_aggravatables() {
    return (game.level?.monsters || []).some(mon =>
        mon.mhp > 0
        && ((mon.mstrategy & STRAT_WAITFORU) || helpless(mon)));
}

function spell_would_be_useless(mtmp, spellnum) {
    const flags = MCAST_DATA[spellnum][1];
    if ((flags & MCF_HOSTILE) && mtmp.mpeaceful)
        return true;
    if ((flags & MCF_SIGHT) && !couldsee(mtmp.mx, mtmp.my))
        return true;

    switch (spellnum) {
    case MCAST_DEATH_TOUCH:
        return (antimagic() || Hallucination()) && !rn2(2);
    case MCAST_GEYSER:
        return !rn2(5);
    case MCAST_CLONE_WIZ:
        return !mtmp.iswiz || (game.context?.no_of_wizards ?? 0) > 1;
    case MCAST_AGGRAVATION:
        return !has_aggravatables() && !!rn2(100);
    case MCAST_HASTE_SELF:
        return mtmp.permspeed === MFAST;
    case MCAST_DISAPPEAR:
        return !!(mtmp.minvis || mtmp.invis_blkd
                   || (mtmp.mpeaceful && !See_invisible()));
    case MCAST_CURE_SELF:
        return mtmp.mhp === mtmp.mhpmax;
    case MCAST_BLIND_YOU:
        return !!game.u.ublind;
    default:
        return false;
    }
}

function choose_monster_spell(mtmp, adtyp) {
    const list = adtyp === ATTKS.AD_SPEL ? WIZARD_SPELLS
               : adtyp === ATTKS.AD_CLRC ? CLERIC_SPELLS : null;
    if (!list)
        return MCAST_PSI_BOLT;

    const maxlev = MCAST_DATA[list[list.length - 1]][0];
    let spellval = rn2(mtmp.m_lev);
    if (spellval > maxlev && rn2(maxlev))
        spellval = rn2(maxlev);

    for (let i = list.length - 1; i >= 0; --i) {
        if (MCAST_DATA[list[i]][0] <= spellval
            && !spell_would_be_useless(mtmp, list[i]))
            return list[i];
    }
    return list[0];
}

function seen_resistance_for(adtyp) {
    switch (adtyp) {
    case ATTKS.AD_MAGM: return M_SEEN_MAGR;
    case ATTKS.AD_FIRE: return M_SEEN_FIRE;
    case ATTKS.AD_COLD: return M_SEEN_COLD;
    case ATTKS.AD_SLEE: return M_SEEN_SLEEP;
    case ATTKS.AD_DISN: return M_SEEN_DISINT;
    case ATTKS.AD_ELEC: return M_SEEN_ELEC;
    case ATTKS.AD_DRST: return M_SEEN_POISON;
    case ATTKS.AD_ACID: return M_SEEN_ACID;
    default: return 0;
    }
}

async function cursetxt(mtmp, undirected) {
    if (canseemon(mtmp) && couldsee(mtmp.mx, mtmp.my)) {
        const point_msg = undirected ? 'all around, then curses'
              : 'at you, then curses';
        await pline(`${Monnam(mtmp)} points ${point_msg}.`);
    } else if (!(game.moves % 4) || !rn2(4)) {
        if (!Deaf())
            await You_hear('a mumbled curse.');
    }
}

async function mcast_psi_bolt(mtmp, dmg) {
    if (antimagic()) {
        mtmp.seen_resistance = (mtmp.seen_resistance ?? 0) | M_SEEN_MAGR;
        dmg = Math.trunc((dmg + 1) / 2);
    } else {
        mtmp.seen_resistance = (mtmp.seen_resistance ?? 0) & ~M_SEEN_MAGR;
    }

    if (dmg <= 5)
        await You(`get a slight ${body_part(HEAD)}ache.`);
    else if (dmg <= 10)
        await Your('brain is on fire!');
    else if (dmg <= 20)
        await Your(`${body_part(HEAD)} suddenly aches painfully!`);
    else
        await Your(`${body_part(HEAD)} suddenly aches very painfully!`);
    return dmg;
}

async function mcast_open_wounds(mtmp, dmg) {
    if (antimagic()) {
        mtmp.seen_resistance = (mtmp.seen_resistance ?? 0) | M_SEEN_MAGR;
        dmg = Math.trunc((dmg + 1) / 2);
    } else {
        mtmp.seen_resistance = (mtmp.seen_resistance ?? 0) & ~M_SEEN_MAGR;
    }

    if (dmg <= 5)
        await Your('skin itches badly for a moment.');
    else if (dmg <= 10)
        await pline('Wounds appear on your body!');
    else if (dmg <= 20)
        await pline('Severe wounds appear on your body!');
    else
        await Your('body is covered with painful wounds!');
    return dmg;
}

async function mcast_summon_mons(mtmp) {
    const { nasty } = await import('./wizard.js');
    const count = await nasty(mtmp);
    if (!count)
        return;

    if (mtmp.iswiz) {
        await pline(`"Destroy the thief, my pet${count === 1 ? '' : 's'}!"`);
        return;
    }

    const one = count === 1;
    const mappear = one ? 'A monster appears' : 'Monsters appear';
    const wrong_spot = mtmp.mux !== game.u.ux || mtmp.muy !== game.u.uy;
    if (Invis() && !perceives(mtmp.data) && wrong_spot) {
        await pline(`${mappear} ${one ? 'at' : 'around'} a spot near you!`);
    } else if (game.u.uprops?.DISPLACED && wrong_spot) {
        await pline(`${mappear} ${one ? 'by' : 'around'} your displaced image!`);
    } else {
        await pline(`${mappear} from nowhere!`);
    }
}

async function mcast_spell(mtmp, dmg, spellnum) {
    switch (spellnum) {
    case MCAST_PSI_BOLT:
        dmg = await mcast_psi_bolt(mtmp, dmg);
        break;
    case MCAST_OPEN_WOUNDS:
        dmg = await mcast_open_wounds(mtmp, dmg);
        break;
    case MCAST_CURE_SELF:
        if (mtmp.mhp < mtmp.mhpmax) {
            if (canseemon(mtmp))
                await pline(`${Monnam(mtmp)} looks better.`);
            const { healmon } = await import('./mon.js');
            healmon(mtmp, d(3, 6), 0);
            dmg = 0;
        }
        break;
    case MCAST_HASTE_SELF: {
        const oldspeed = mtmp.mspeed ?? 0;
        mtmp.permspeed = mtmp.permspeed === MSLOW ? 0 : MFAST;
        const speedBoots = (mtmp.minvent || []).some((obj) =>
            obj.otyp === ONAMES.SPEED_BOOTS && obj.owornmask);
        mtmp.mspeed = speedBoots ? MFAST : mtmp.permspeed;
        if (mtmp.mspeed !== oldspeed && mtmp.data.mmove
            && !mtmp.mfrozen && !mtmp.msleeping && canseemon(mtmp)) {
            const howmuch = mtmp.mspeed + oldspeed === MFAST + MSLOW
                ? 'much ' : '';
            await pline(`${Monnam(mtmp)} is suddenly moving ${howmuch}faster.`);
        }
        dmg = 0;
        break;
    }
    case MCAST_SUMMON_MONS:
        await mcast_summon_mons(mtmp);
        dmg = 0;
        break;
    default:
        note_unported_mcastu(`mcast_spell:${spellnum}`);
        dmg = 0;
        break;
    }

    if (dmg) {
        const { mdamageu } = await import('./mhitu.js');
        await mdamageu(mtmp, dmg);
    }
}

export async function castmu(mtmp, mattk, thinks_it_foundyou, foundyou) {
    const ml = mtmp.m_lev;
    let spellnum = MCAST_PSI_BOLT;

    if ((mattk[1] === ATTKS.AD_SPEL || mattk[1] === ATTKS.AD_CLRC) && ml) {
        let cnt = 40;
        do {
            spellnum = choose_monster_spell(mtmp, mattk[1]);
            if (!thinks_it_foundyou) {
                if (!is_undirected_spell(spellnum)
                    || spell_would_be_useless(mtmp, spellnum))
                    return M_ATTK_MISS;
                break;
            }
        } while (--cnt > 0 && spell_would_be_useless(mtmp, spellnum));
        if (!cnt)
            return M_ATTK_MISS;
    }

    const seen = seen_resistance_for(mattk[1]);
    if (mtmp.mcan || mtmp.mspec_used || !ml
        || (seen && ((mtmp.seen_resistance ?? 0) & seen))) {
        await cursetxt(mtmp, is_undirected_spell(spellnum));
        return M_ATTK_MISS;
    }

    if (mattk[1] === ATTKS.AD_SPEL || mattk[1] === ATTKS.AD_CLRC)
        mtmp.mspec_used = ml < 8 ? 10 - ml : 2;

    if (!foundyou && thinks_it_foundyou && !is_undirected_spell(spellnum)) {
        await pline(`${canseemon(mtmp) ? Monnam(mtmp) : 'Something'
        } casts a spell at thin air!`);
        return M_ATTK_MISS;
    }

    nomul(0);
    if (rn2(ml * 10) < (mtmp.mconf ? 100 : 20)) {
        if (canseemon(mtmp) && !Deaf())
            await pline(`The air crackles around ${mon_nam(mtmp)}.`);
        return M_ATTK_MISS;
    }

    if (canspotmon(mtmp) || !is_undirected_spell(spellnum)) {
        await pline(`${canspotmon(mtmp) ? Monnam(mtmp) : 'Something'
        } casts a spell${is_undirected_spell(spellnum) ? '' : ' at you'}!`);
    }

    let dmg = !foundyou ? 0
              : mattk[3] ? d(Math.trunc(ml / 2) + mattk[2], mattk[3])
                : d(Math.trunc(ml / 2) + 1, 6);
    if (half_spell_damage())
        dmg = Math.trunc((dmg + 1) / 2);

    if (mattk[1] === ATTKS.AD_SPEL || mattk[1] === ATTKS.AD_CLRC) {
        await mcast_spell(mtmp, dmg, spellnum);
    } else {
        note_unported_mcastu(`castmu:adtyp=${mattk[1]}`);
    }
    return M_ATTK_HIT;
}
