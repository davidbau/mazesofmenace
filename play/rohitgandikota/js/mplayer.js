// mplayer.js — monster players ("mplayers"), the fake adventurers on the
// quest and endgame levels.
// C ref: src/mplayer.c

import { game } from './gstate.js';
import { rn2, rnd, rn1, d } from './rng.js';
import { ONAMES, OCLASSES } from './objects_data.js';
import { PMNAMES } from './monst_data.js';
import {
    makemon, mongets, mkmonmoney, set_malign, goodpos,
    rnd_offensive_item, rnd_defensive_item, rnd_misc_item,
} from './makemon.js';
import { m_at } from './mon.js';
import { mksobj, mkobj, rnd_class, curse, bless } from './mkobj.js';
import { mpickobj } from './steal.js';
import { weight } from './invent.js';
import { is_mplayer } from './mondata.js';
import { is_female } from './makemon.js';
import { christen_monst } from './do_name.js';
import { rank_of } from './botl.js';
import { roles } from './role_data.js';
import { m_dowear } from './worn.js';
import { In_endgame, NO_MM_FLAGS, MM_NOMSG } from './const.js';
import { is_art, mk_artifact } from './artifact.js';
import { ART_MAGICBANE } from './artilist_data.js';

function note_unported_mplayer(what) {
    (game.unported ||= new Set()).add('mplayer:' + what);
}

// src/mplayer.c:17 developers[] — the credits roster mplayer names come from.
const developers = [
    /* devteam */
    'Alex',    'Dave',   'Dean',    'Derek',   'Eric',    'Izchak',
    'Janet',   'Jessie', 'Ken',     'Kevin',   'Michael', 'Mike',
    'Pasi',    'Pat',    'Patric',  'Paul',    'Sean',    'Steve',
    'Timo',    'Warwick',
    /* PC team */
    'Bill',    'Eric',   'Keizo',   'Ken',    'Kevin',    'Michael',
    'Mike',    'Paul',   'Stephen', 'Steve',  'Timo',     'Yitzhak',
    /* Amiga team */
    'Andy',    'Gregg',  'Janne',   'Keni',   'Mike',     'Olaf',
    'Richard',
    /* Mac team */
    'Andy',    'Chris',  'Dean',    'Jon',    'Jonathan', 'Kevin',
    'Wang',
    /* Atari team */
    'Eric',    'Marvin', 'Warwick',
    /* NT team */
    'Alex',    'Dion',   'Michael',
    /* OS/2 team */
    'Helge',   'Ron',    'Timo',
    /* VMS team */
    'Joshua',  'Pat',    '',
];

// src/mplayer.c:43 dev_name() — a developer name not already in use by a
// christened mplayer on this level; rn2 per attempt, up to 100 tries.
function dev_name() {
    const n = developers.length;
    let i, m = 0, match;

    do {
        match = false;
        i = rn2(n);
        for (const mtmp of (game.level?.monsters || [])) {
            if (!is_mplayer(game.mons[mtmp.mnum]))
                continue;
            const given = mtmp.mgivenname || '';
            if (given.startsWith(developers[i])) {
                match = true;
                break;
            }
        }
        m++;
    } while (match && m < 100); /* m for insurance */

    if (match)
        return null;
    return developers[i];
}

// src/mplayer.c:71 get_mplname()
function get_mplname(mtmp) {
    const fmlkind = is_female(game.mons[mtmp.mnum]);
    let nam;

    const devnam = dev_name();
    if (!devnam)
        nam = fmlkind ? 'Eve' : 'Adam';
    else if (fmlkind && devnam !== 'Janet')
        nam = rn2(2) ? 'Maud' : 'Eve';
    else
        nam = devnam;

    if (fmlkind || nam === 'Janet')
        mtmp.female = 1;
    else
        mtmp.female = 0;
    /* rank_of() wants the role record; mplayer PM indices run parallel to
       the roles[] table (PM_ARCHEOLOGIST..PM_WIZARD). */
    const roleidx = mtmp.mnum - PMNAMES.PM_ARCHEOLOGIST;
    nam += ' the ' + rank_of(mtmp.m_lev, roles[roleidx], !!mtmp.female);
    return nam;
}

// src/mplayer.c:95 mk_mplayer_armor()
function mk_mplayer_armor(mon, typ) {
    if (typ === ONAMES.STRANGE_OBJECT || !typ)
        return;
    const obj = mksobj(typ, false, false);
    obj.oeroded = obj.oeroded2 = 0;
    if (!rn2(3))
        obj.oerodeproof = 1;
    if (!rn2(3))
        curse(obj);
    if (!rn2(3))
        bless(obj);
    /* Most players who get to the endgame who have cursed equipment
     * have it because the wizard or other monsters cursed it, so its
     * chances of having plusses is the same as usual....
     */
    obj.spe = rn2(10) ? (rn2(3) ? rn2(5) : rn1(4, 4)) : -rnd(3);
    mpickobj(mon, obj);
}

// src/weapon.c:680 monmightthrowwep() — a weapon type any monster throws.
// (rwep[] in js/weapon.js is module-private; this mirrors the same table's
// membership test for the one caller here.)
const MONMIGHTTHROW = () => {
    const O = ONAMES;
    return [
        O.DWARVISH_SPEAR, O.SILVER_SPEAR, O.ELVEN_SPEAR, O.SPEAR,
        O.ORCISH_SPEAR, O.JAVELIN, O.SHURIKEN, O.YA, O.SILVER_ARROW,
        O.ELVEN_ARROW, O.ARROW, O.ORCISH_ARROW, O.CROSSBOW_BOLT,
        O.SILVER_DAGGER, O.ELVEN_DAGGER, O.DAGGER, O.ORCISH_DAGGER, O.KNIFE,
        O.FLINT, O.ROCK, O.LOADSTONE, O.LUCKSTONE, O.DART, O.CREAM_PIE,
    ];
};
function monmightthrowwep(obj) {
    return MONMIGHTTHROW().includes(obj.otyp);
}

// include/obj.h is_spear()
function is_spear(obj) {
    return obj.otyp >= ONAMES.SPEAR && obj.otyp <= ONAMES.JAVELIN;
}

// src/mplayer.c:117 mk_mplayer() — create one monster-player.
export function mk_mplayer(ptr, x, y, special) {
    const P = PMNAMES, O = ONAMES;

    if (!is_mplayer(ptr))
        return null;

    if (m_at(x, y)) {
        /* rloc(m_at(x, y), RLOC_ERR|RLOC_NOMSG) — insurance */
        note_unported_mplayer('mk_mplayer:rloc');
    }

    if (!In_endgame(game.u.uz))
        special = false;

    const mtmp = makemon(ptr, x, y, special ? MM_NOMSG : NO_MM_FLAGS);
    if (mtmp) {
        let otmp;

        mtmp.m_lev = special ? rn1(16, 15) : rnd(16);
        mtmp.mhp = mtmp.mhpmax = d(mtmp.m_lev, 10)
                                 + (special ? (30 + rnd(30)) : 30);
        if (special) {
            christen_monst(mtmp, get_mplname(mtmp));
            /* that's why they are "stuck" in the endgame :-) */
            mongets(mtmp, O.FAKE_AMULET_OF_YENDOR);
        }
        mtmp.mpeaceful = 0;
        set_malign(mtmp); /* peaceful may have changed again */

        /* default equipment; much of it will be overridden below */
        let weapon = !rn2(2) ? O.LONG_SWORD : rnd_class(O.SPEAR, O.BULLWHIP);
        let armor = rnd_class(O.GRAY_DRAGON_SCALE_MAIL,
                              O.YELLOW_DRAGON_SCALE_MAIL);
        let cloak = !rn2(8) ? O.STRANGE_OBJECT
                            : rnd_class(O.OILSKIN_CLOAK,
                                        O.CLOAK_OF_DISPLACEMENT);
        let helm = !rn2(8) ? O.STRANGE_OBJECT
                           : rnd_class(O.ELVEN_LEATHER_HELM,
                                       O.HELM_OF_TELEPATHY);
        let shield = !rn2(8) ? O.STRANGE_OBJECT
                             : rnd_class(O.ELVEN_SHIELD,
                                         O.SHIELD_OF_REFLECTION);

        switch (mtmp.mnum) {
        case P.PM_ARCHEOLOGIST:
            if (rn2(2))
                weapon = O.BULLWHIP;
            break;
        case P.PM_BARBARIAN:
            if (rn2(2)) {
                weapon = rn2(2) ? O.TWO_HANDED_SWORD : O.BATTLE_AXE;
                shield = O.STRANGE_OBJECT;
            }
            if (rn2(2))
                armor = rnd_class(O.PLATE_MAIL, O.CHAIN_MAIL);
            if (helm === O.HELM_OF_BRILLIANCE)
                helm = O.STRANGE_OBJECT;
            break;
        case P.PM_CAVE_DWELLER:
            if (rn2(4))
                weapon = O.MACE;
            else if (rn2(2))
                weapon = O.CLUB;
            if (helm === O.HELM_OF_BRILLIANCE)
                helm = O.STRANGE_OBJECT;
            break;
        case P.PM_HEALER:
            if (rn2(4))
                weapon = O.QUARTERSTAFF;
            else if (rn2(2))
                weapon = rn2(2) ? O.UNICORN_HORN : O.SCALPEL;
            if (rn2(4))
                helm = rn2(2) ? O.HELM_OF_BRILLIANCE : O.HELM_OF_TELEPATHY;
            if (rn2(2))
                shield = O.STRANGE_OBJECT;
            break;
        case P.PM_KNIGHT:
            if (rn2(4))
                weapon = O.LONG_SWORD;
            if (rn2(2))
                armor = rnd_class(O.PLATE_MAIL, O.CHAIN_MAIL);
            break;
        case P.PM_MONK:
            weapon = !rn2(3) ? O.SHURIKEN : O.STRANGE_OBJECT;
            armor = O.STRANGE_OBJECT;
            cloak = O.ROBE;
            if (rn2(2))
                shield = O.STRANGE_OBJECT;
            break;
        case P.PM_CLERIC:
            if (rn2(2))
                weapon = O.MACE;
            if (rn2(2))
                armor = rnd_class(O.PLATE_MAIL, O.CHAIN_MAIL);
            if (rn2(4))
                cloak = O.ROBE;
            if (rn2(4))
                helm = rn2(2) ? O.HELM_OF_BRILLIANCE : O.HELM_OF_TELEPATHY;
            if (rn2(2))
                shield = O.STRANGE_OBJECT;
            break;
        case P.PM_RANGER:
            if (rn2(2))
                weapon = O.ELVEN_DAGGER;
            break;
        case P.PM_ROGUE:
            if (rn2(2))
                weapon = rn2(2) ? O.SHORT_SWORD : O.ORCISH_DAGGER;
            break;
        case P.PM_SAMURAI:
            if (rn2(2))
                weapon = O.KATANA;
            break;
        case P.PM_TOURIST:
            /* Defaults are just fine */
            break;
        case P.PM_VALKYRIE:
            if (rn2(2))
                weapon = O.WAR_HAMMER;
            if (rn2(2))
                armor = rnd_class(O.PLATE_MAIL, O.CHAIN_MAIL);
            break;
        case P.PM_WIZARD:
            if (rn2(4))
                weapon = rn2(2) ? O.QUARTERSTAFF : O.ATHAME;
            if (rn2(2)) {
                armor = rn2(2) ? O.BLACK_DRAGON_SCALE_MAIL
                               : O.SILVER_DRAGON_SCALE_MAIL;
                cloak = O.CLOAK_OF_MAGIC_RESISTANCE;
            }
            if (rn2(4))
                helm = O.HELM_OF_BRILLIANCE;
            shield = O.STRANGE_OBJECT;
            break;
        default:
            weapon = 0;
            break;
        }

        if (weapon !== O.STRANGE_OBJECT && weapon) {
            otmp = mksobj(weapon, true, false);
            otmp.oeroded = otmp.oeroded2 = 0;
            otmp.spe = special ? rn1(5, 4) : rn2(4);
            if (!rn2(3))
                otmp.oerodeproof = 1;
            else if (!rn2(2))
                otmp.greased = 1;
            if (special && rn2(2))
                otmp = mk_artifact(otmp, -128 /* A_NONE */, 99, false);
            /* usually increase stack size if stackable weapon */
            if (game.objects[otmp.otyp].oc_merge && !otmp.oartifact
                && monmightthrowwep(otmp))
                otmp.quan += rn2(is_spear(otmp) ? 4 : 8);
            otmp.owt = weight(otmp);
            /* mplayers knew better than to overenchant Magicbane */
            if (is_art(otmp, ART_MAGICBANE))
                otmp.spe = rnd(4);
            mpickobj(mtmp, otmp);
        }

        let quan;
        if (special) {
            if (!rn2(10))
                mongets(mtmp, rn2(3) ? O.LUCKSTONE : O.LOADSTONE);
            mk_mplayer_armor(mtmp, armor);
            mk_mplayer_armor(mtmp, cloak);
            mk_mplayer_armor(mtmp, helm);
            mk_mplayer_armor(mtmp, shield);
            if (weapon === O.WAR_HAMMER) /* valkyrie: wimpy or Mjollnir */
                mk_mplayer_armor(mtmp, O.GAUNTLETS_OF_POWER);
            else if (rn2(8))
                mk_mplayer_armor(mtmp, rnd_class(O.LEATHER_GLOVES,
                                                 O.GAUNTLETS_OF_DEXTERITY));
            if (rn2(8))
                mk_mplayer_armor(mtmp, rnd_class(O.LOW_BOOTS,
                                                 O.LEVITATION_BOOTS));
            m_dowear(mtmp, true);

            quan = rn2(3) ? rn2(3) : rn2(16);
            while (quan--)
                mongets(mtmp, rnd_class(O.DILITHIUM_CRYSTAL, O.JADE));
            /* To get the gold "right" would mean a player can double his
               gold supply by killing one mplayer.  Not good. */
            mkmonmoney(mtmp, rn2(1000));
            quan = rn2(10);
            while (quan--)
                mpickobj(mtmp, mkobj(OCLASSES.RANDOM_CLASS, false));
        }
        quan = rnd(3);
        while (quan--)
            mongets(mtmp, rnd_offensive_item(mtmp));
        quan = rnd(3);
        while (quan--)
            mongets(mtmp, rnd_defensive_item(mtmp));
        quan = rnd(3);
        while (quan--)
            mongets(mtmp, rnd_misc_item(mtmp));
    }

    return mtmp;
}

// src/mplayer.c:325 create_mplayers() — num random mplayers at random free
// spots.
export function create_mplayers(num, special) {
    while (num) {
        let tryct = 0;

        /* roll for character class */
        const pm = rn1(PMNAMES.PM_WIZARD - PMNAMES.PM_ARCHEOLOGIST + 1,
                       PMNAMES.PM_ARCHEOLOGIST);
        const fakemon = { data: game.mons[pm], wormno: 0 };

        /* roll for an available location */
        let x, y;
        do {
            x = rn1(80 /* COLNO */ - 4, 2);
            y = rnd(21 /* ROWNO */ - 2);
        } while (!goodpos(x, y, fakemon, 0) && tryct++ <= 50);

        /* if pos not found in 50 tries, don't bother to continue */
        if (tryct > 50)
            return;

        mk_mplayer(game.mons[pm], x, y, special);
        num--;
    }
}
