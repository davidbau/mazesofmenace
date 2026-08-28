// mplayer.js — Player-monster creation (partial).
// C ref: mplayer.c mk_mplayer / get_mplname / mk_mplayer_armor / dev_name /
// create_mplayers. mplayer_talk named omit.

import { game } from './gstate.js';
import { rn2, rnd, rn1, d } from './rng.js';
import { is_mplayer, is_female, mons } from './monsters.js';
import { set_mon_data } from './mondata.js';
import {
    PM_ARCHEOLOGIST, PM_BARBARIAN, PM_CAVE_DWELLER, PM_HEALER, PM_KNIGHT,
    PM_MONK, PM_CLERIC, PM_RANGER, PM_ROGUE, PM_SAMURAI, PM_TOURIST,
    PM_VALKYRIE, PM_WIZARD,
} from './generated/monsters_data.js';
import {
    makemon, set_malign, mongets, mpickobj, mkmonmoney,
    rnd_offensive_item, rnd_defensive_item, rnd_misc_item,
} from './makemon.js';
import {
    mksobj, mkobj, weight, rnd_class, curse, bless, oc_merge_of,
} from './mkobj.js';
import { mk_artifact, is_art } from './artifact.js';
import { ART_MAGICBANE } from './generated/artifacts_data.js';
import { m_dowear } from './worn.js';
import { rloc, goodpos } from './teleport.js';
import { m_at } from './mon.js';
import { christen_monst } from './do_name.js';
import { rank_of } from './roles.js';
import { monmightthrowwep } from './weapon.js';
import { impossible } from './display.js';
import {
    In_endgame, MM_NOMSG, NO_MM_FLAGS, A_NONE, RLOC_ERR, RLOC_NOMSG,
    has_mgivenname, MGIVENNAME, P_SPEAR, COLNO, ROWNO,
} from './const.js';
import { objectNames, WEAPON_CLASS, RANDOM_CLASS } from './objects.js';

const STRANGE_OBJECT = objectNames.indexOf('STRANGE_OBJECT');
const LONG_SWORD = objectNames.indexOf('LONG_SWORD');
const SPEAR = objectNames.indexOf('SPEAR');
const BULLWHIP = objectNames.indexOf('BULLWHIP');
const GRAY_DRAGON_SCALE_MAIL = objectNames.indexOf('GRAY_DRAGON_SCALE_MAIL');
const YELLOW_DRAGON_SCALE_MAIL = objectNames.indexOf('YELLOW_DRAGON_SCALE_MAIL');
const OILSKIN_CLOAK = objectNames.indexOf('OILSKIN_CLOAK');
const CLOAK_OF_DISPLACEMENT = objectNames.indexOf('CLOAK_OF_DISPLACEMENT');
const ELVEN_LEATHER_HELM = objectNames.indexOf('ELVEN_LEATHER_HELM');
const HELM_OF_TELEPATHY = objectNames.indexOf('HELM_OF_TELEPATHY');
const ELVEN_SHIELD = objectNames.indexOf('ELVEN_SHIELD');
const SHIELD_OF_REFLECTION = objectNames.indexOf('SHIELD_OF_REFLECTION');
const TWO_HANDED_SWORD = objectNames.indexOf('TWO_HANDED_SWORD');
const BATTLE_AXE = objectNames.indexOf('BATTLE_AXE');
const PLATE_MAIL = objectNames.indexOf('PLATE_MAIL');
const CHAIN_MAIL = objectNames.indexOf('CHAIN_MAIL');
const HELM_OF_BRILLIANCE = objectNames.indexOf('HELM_OF_BRILLIANCE');
const MACE = objectNames.indexOf('MACE');
const CLUB = objectNames.indexOf('CLUB');
const QUARTERSTAFF = objectNames.indexOf('QUARTERSTAFF');
const UNICORN_HORN = objectNames.indexOf('UNICORN_HORN');
const SCALPEL = objectNames.indexOf('SCALPEL');
const SHURIKEN = objectNames.indexOf('SHURIKEN');
const ROBE = objectNames.indexOf('ROBE');
const ELVEN_DAGGER = objectNames.indexOf('ELVEN_DAGGER');
const SHORT_SWORD = objectNames.indexOf('SHORT_SWORD');
const ORCISH_DAGGER = objectNames.indexOf('ORCISH_DAGGER');
const KATANA = objectNames.indexOf('KATANA');
const WAR_HAMMER = objectNames.indexOf('WAR_HAMMER');
const ATHAME = objectNames.indexOf('ATHAME');
const BLACK_DRAGON_SCALE_MAIL = objectNames.indexOf('BLACK_DRAGON_SCALE_MAIL');
const SILVER_DRAGON_SCALE_MAIL = objectNames.indexOf('SILVER_DRAGON_SCALE_MAIL');
const CLOAK_OF_MAGIC_RESISTANCE = objectNames.indexOf('CLOAK_OF_MAGIC_RESISTANCE');
const FAKE_AMULET_OF_YENDOR = objectNames.indexOf('FAKE_AMULET_OF_YENDOR');
const LUCKSTONE = objectNames.indexOf('LUCKSTONE');
const LOADSTONE = objectNames.indexOf('LOADSTONE');
const GAUNTLETS_OF_POWER = objectNames.indexOf('GAUNTLETS_OF_POWER');
const LEATHER_GLOVES = objectNames.indexOf('LEATHER_GLOVES');
const GAUNTLETS_OF_DEXTERITY = objectNames.indexOf('GAUNTLETS_OF_DEXTERITY');
const LOW_BOOTS = objectNames.indexOf('LOW_BOOTS');
const LEVITATION_BOOTS = objectNames.indexOf('LEVITATION_BOOTS');
const DILITHIUM_CRYSTAL = objectNames.indexOf('DILITHIUM_CRYSTAL');
const JADE = objectNames.indexOf('JADE');

/* C mplayer.c developers[] — keep in alphabetical order within teams.
 * Trailing "" is in SIZE(); strncmp(..., 0) always matches. */
const developers = [
    'Alex', 'Dave', 'Dean', 'Derek', 'Eric', 'Izchak',
    'Janet', 'Jessie', 'Ken', 'Kevin', 'Michael', 'Mike',
    'Pasi', 'Pat', 'Patric', 'Paul', 'Sean', 'Steve',
    'Timo', 'Warwick',
    'Bill', 'Eric', 'Keizo', 'Ken', 'Kevin', 'Michael',
    'Mike', 'Paul', 'Stephen', 'Steve', 'Timo', 'Yitzhak',
    'Andy', 'Gregg', 'Janne', 'Keni', 'Mike', 'Olaf',
    'Richard',
    'Andy', 'Chris', 'Dean', 'Jon', 'Jonathan', 'Kevin',
    'Wang',
    'Eric', 'Marvin', 'Warwick',
    'Alex', 'Dion', 'Michael',
    'Helge', 'Ron', 'Timo',
    'Joshua', 'Pat', '',
];

/**
 * C ref: mplayer.c dev_name — random developer not already used as mplayer.
 */
function dev_name() {
    const n = developers.length;
    let match = false;
    let i = 0;
    let m = 0;
    do {
        match = false;
        i = rn2(n);
        const list = game.fmon || [];
        for (const mtmp of list) {
            if (!is_mplayer(mtmp.data)) continue;
            const given = has_mgivenname(mtmp) ? MGIVENNAME(mtmp) : '';
            const dev = developers[i];
            // C: !strncmp(developers[i], given, strlen(developers[i]))
            if (given.startsWith(dev)) {
                match = true;
                break;
            }
        }
        m++;
    } while (match && m < 100);

    if (match) return null;
    return developers[i];
}

/**
 * C ref: mplayer.c get_mplname — "Name the Rank".
 */
function get_mplname(mtmp) {
    const fmlkind = is_female(mtmp.data);
    const devnam = dev_name();
    let nam;
    if (devnam == null) nam = fmlkind ? 'Eve' : 'Adam';
    else if (fmlkind && devnam !== 'Janet') nam = rn2(2) ? 'Maud' : 'Eve';
    else nam = devnam;

    if (fmlkind || nam === 'Janet') mtmp.female = 1;
    else mtmp.female = 0;
    nam += ' the ';
    nam += rank_of(mtmp.m_lev | 0, mtmp.data?.mndx, !!mtmp.female);
    return nam;
}

/**
 * C ref: mplayer.c mk_mplayer_armor.
 */
function mk_mplayer_armor(mon, typ) {
    if (typ === STRANGE_OBJECT) return;
    const obj = mksobj(typ, false, false);
    obj.oeroded = 0;
    obj.oeroded2 = 0;
    if (!rn2(3)) obj.oerodeproof = 1;
    if (!rn2(3)) curse(obj);
    if (!rn2(3)) bless(obj);
    obj.spe = rn2(10) ? (rn2(3) ? rn2(5) : rn1(4, 4)) : -rnd(3);
    mpickobj(mon, obj);
}

/**
 * C ref: mplayer.c mk_mplayer — role-monster at (x,y). special only in
 * the endgame (forced FALSE otherwise). Caller sp_lev create_monster
 * always passes FALSE.
 *
 * Occupied-cell rloc is fire-and-forget like mk_roamer_splev (JS rloc
 * is async; C RLOC_ERR|RLOC_NOMSG insurance).
 */
export function mk_mplayer(ptr, x, y, special) {
    if (!is_mplayer(ptr)) return null;

    if (m_at(x, y)) rloc(m_at(x, y), RLOC_ERR | RLOC_NOMSG);

    if (!In_endgame(game.u?.uz)) special = false;

    const mtmp = makemon(ptr, x, y, special ? MM_NOMSG : NO_MM_FLAGS);
    if (mtmp) {
        mtmp.m_lev = special ? rn1(16, 15) : rnd(16);
        mtmp.mhp = mtmp.mhpmax = d(mtmp.m_lev | 0, 10)
            + (special ? (30 + rnd(30)) : 30);
        if (special) {
            const nam = get_mplname(mtmp);
            christen_monst(mtmp, nam);
            mongets(mtmp, FAKE_AMULET_OF_YENDOR);
        }
        mtmp.mpeaceful = 0;
        set_malign(mtmp);

        let weapon = !rn2(2) ? LONG_SWORD : rnd_class(SPEAR, BULLWHIP);
        let armor = rnd_class(GRAY_DRAGON_SCALE_MAIL, YELLOW_DRAGON_SCALE_MAIL);
        let cloak = !rn2(8) ? STRANGE_OBJECT
            : rnd_class(OILSKIN_CLOAK, CLOAK_OF_DISPLACEMENT);
        let helm = !rn2(8) ? STRANGE_OBJECT
            : rnd_class(ELVEN_LEATHER_HELM, HELM_OF_TELEPATHY);
        let shield = !rn2(8) ? STRANGE_OBJECT
            : rnd_class(ELVEN_SHIELD, SHIELD_OF_REFLECTION);

        switch (ptr.mndx) {
        case PM_ARCHEOLOGIST:
            if (rn2(2)) weapon = BULLWHIP;
            break;
        case PM_BARBARIAN:
            if (rn2(2)) {
                weapon = rn2(2) ? TWO_HANDED_SWORD : BATTLE_AXE;
                shield = STRANGE_OBJECT;
            }
            if (rn2(2)) armor = rnd_class(PLATE_MAIL, CHAIN_MAIL);
            if (helm === HELM_OF_BRILLIANCE) helm = STRANGE_OBJECT;
            break;
        case PM_CAVE_DWELLER:
            if (rn2(4)) weapon = MACE;
            else if (rn2(2)) weapon = CLUB;
            if (helm === HELM_OF_BRILLIANCE) helm = STRANGE_OBJECT;
            break;
        case PM_HEALER:
            if (rn2(4)) weapon = QUARTERSTAFF;
            else if (rn2(2)) weapon = rn2(2) ? UNICORN_HORN : SCALPEL;
            if (rn2(4)) helm = rn2(2) ? HELM_OF_BRILLIANCE : HELM_OF_TELEPATHY;
            if (rn2(2)) shield = STRANGE_OBJECT;
            break;
        case PM_KNIGHT:
            if (rn2(4)) weapon = LONG_SWORD;
            if (rn2(2)) armor = rnd_class(PLATE_MAIL, CHAIN_MAIL);
            break;
        case PM_MONK:
            weapon = !rn2(3) ? SHURIKEN : STRANGE_OBJECT;
            armor = STRANGE_OBJECT;
            cloak = ROBE;
            if (rn2(2)) shield = STRANGE_OBJECT;
            break;
        case PM_CLERIC:
            if (rn2(2)) weapon = MACE;
            if (rn2(2)) armor = rnd_class(PLATE_MAIL, CHAIN_MAIL);
            if (rn2(4)) cloak = ROBE;
            if (rn2(4)) helm = rn2(2) ? HELM_OF_BRILLIANCE : HELM_OF_TELEPATHY;
            if (rn2(2)) shield = STRANGE_OBJECT;
            break;
        case PM_RANGER:
            if (rn2(2)) weapon = ELVEN_DAGGER;
            break;
        case PM_ROGUE:
            if (rn2(2)) weapon = rn2(2) ? SHORT_SWORD : ORCISH_DAGGER;
            break;
        case PM_SAMURAI:
            if (rn2(2)) weapon = KATANA;
            break;
        case PM_TOURIST:
            break;
        case PM_VALKYRIE:
            if (rn2(2)) weapon = WAR_HAMMER;
            if (rn2(2)) armor = rnd_class(PLATE_MAIL, CHAIN_MAIL);
            break;
        case PM_WIZARD:
            if (rn2(4)) weapon = rn2(2) ? QUARTERSTAFF : ATHAME;
            if (rn2(2)) {
                armor = rn2(2) ? BLACK_DRAGON_SCALE_MAIL
                    : SILVER_DRAGON_SCALE_MAIL;
                cloak = CLOAK_OF_MAGIC_RESISTANCE;
            }
            if (rn2(4)) helm = HELM_OF_BRILLIANCE;
            shield = STRANGE_OBJECT;
            break;
        default:
            void impossible('bad mplayer monster');
            weapon = 0;
            break;
        }

        if (weapon !== STRANGE_OBJECT) {
            let otmp = mksobj(weapon, true, false);
            otmp.oeroded = 0;
            otmp.oeroded2 = 0;
            otmp.spe = special ? rn1(5, 4) : rn2(4);
            if (!rn2(3)) otmp.oerodeproof = 1;
            else if (!rn2(2)) otmp.greased = 1;
            if (special && rn2(2)) {
                otmp = mk_artifact(otmp, A_NONE, 99, false);
            }
            if (oc_merge_of(otmp.otyp) && !otmp.oartifact
                && monmightthrowwep(otmp)) {
                otmp.quan += rn2(
                    (otmp.oclass === WEAPON_CLASS
                        && ((game.objects?.[otmp.otyp]?.oc_skill | 0)
                            === P_SPEAR)) ? 4 : 8,
                );
            }
            otmp.owt = weight(otmp);
            if (is_art(otmp, ART_MAGICBANE)) otmp.spe = rnd(4);
            mpickobj(mtmp, otmp);
        }

        if (special) {
            if (!rn2(10)) mongets(mtmp, rn2(3) ? LUCKSTONE : LOADSTONE);
            mk_mplayer_armor(mtmp, armor);
            mk_mplayer_armor(mtmp, cloak);
            mk_mplayer_armor(mtmp, helm);
            mk_mplayer_armor(mtmp, shield);
            if (weapon === WAR_HAMMER) {
                mk_mplayer_armor(mtmp, GAUNTLETS_OF_POWER);
            } else if (rn2(8)) {
                mk_mplayer_armor(mtmp, rnd_class(LEATHER_GLOVES,
                    GAUNTLETS_OF_DEXTERITY));
            }
            if (rn2(8)) {
                mk_mplayer_armor(mtmp, rnd_class(LOW_BOOTS, LEVITATION_BOOTS));
            }
            m_dowear(mtmp, true);

            let quan = rn2(3) ? rn2(3) : rn2(16);
            while (quan--) mongets(mtmp, rnd_class(DILITHIUM_CRYSTAL, JADE));
            mkmonmoney(mtmp, rn2(1000));
            quan = rn2(10);
            while (quan--) mpickobj(mtmp, mkobj(RANDOM_CLASS, false));
        }
        let quan = rnd(3);
        while (quan--) mongets(mtmp, rnd_offensive_item(mtmp));
        quan = rnd(3);
        while (quan--) mongets(mtmp, rnd_defensive_item(mtmp));
        quan = rnd(3);
        while (quan--) mongets(mtmp, rnd_misc_item(mtmp));
    }

    return mtmp;
}

/**
 * C ref: mplayer.c create_mplayers — `num` random role-monsters at
 * goodpos cells. Caller do.c final_level (Astral, madeNew) passes
 * rn1(4, 3), TRUE. tryct>50 after the do-while aborts the rest of
 * the loop even if the last roll was goodpos (C `:346–348`).
 * Named omit: mplayer_talk; final_level reset_hostility /
 * gain_guardian_angel / ACH_ASTR.
 */
export function create_mplayers(num, special) {
    const fakemon = { mx: 0, my: 0, wormno: 0, m_id: 0 };

    while (num) {
        let tryct = 0;

        /* roll for character class */
        const pm = rn1(PM_WIZARD - PM_ARCHEOLOGIST + 1, PM_ARCHEOLOGIST);
        set_mon_data(fakemon, mons(pm));

        /* roll for an available location */
        let x, y;
        do {
            x = rn1(COLNO - 4, 2);
            y = rnd(ROWNO - 2);
        } while (!goodpos(x, y, fakemon, 0) && tryct++ <= 50);

        /* if pos not found in 50 tries, don't bother to continue */
        if (tryct > 50) return;

        mk_mplayer(mons(pm), x, y, special);
        num--;
    }
}
