// mplayer.js — player-monsters: the role monsters (archeologist .. wizard)
// that special levels create with des.monster() (sp_lev.c create_monster()
// calls mk_mplayer() for them).
// C ref: mplayer.c — dev_name, get_mplname, mk_mplayer_armor, mk_mplayer.
//
// Not ported yet: create_mplayers() (the Astral Plane's endgame players)
// and mplayer_talk().

import { game } from './gstate.js';
import { rn2, rnd, rn1, d } from './rng.js';
import { In_endgame, MM_NOMSG, NO_MM_FLAGS, A_NONE } from './const.js';
import {
    objects, STRANGE_OBJECT, LONG_SWORD, SPEAR, BULLWHIP, GRAY_DRAGON_SCALE_MAIL,
    YELLOW_DRAGON_SCALE_MAIL, OILSKIN_CLOAK, CLOAK_OF_DISPLACEMENT, ELVEN_LEATHER_HELM,
    HELM_OF_TELEPATHY, ELVEN_SHIELD, SHIELD_OF_REFLECTION, TWO_HANDED_SWORD, BATTLE_AXE,
    PLATE_MAIL, CHAIN_MAIL, HELM_OF_BRILLIANCE, MACE, CLUB, QUARTERSTAFF, UNICORN_HORN,
    SCALPEL, SHURIKEN, ROBE, ELVEN_DAGGER, SHORT_SWORD, ORCISH_DAGGER, KATANA, WAR_HAMMER,
    ATHAME, BLACK_DRAGON_SCALE_MAIL, SILVER_DRAGON_SCALE_MAIL, CLOAK_OF_MAGIC_RESISTANCE,
    FAKE_AMULET_OF_YENDOR, LUCKSTONE, LOADSTONE, GAUNTLETS_OF_POWER, LEATHER_GLOVES,
    GAUNTLETS_OF_DEXTERITY, LOW_BOOTS, LEVITATION_BOOTS, DILITHIUM_CRYSTAL, JADE,
    WEAPON_CLASS, RANDOM_CLASS,
} from './objects.js';
import {
    PM_ARCHEOLOGIST, PM_BARBARIAN, PM_CAVE_DWELLER, PM_HEALER, PM_KNIGHT, PM_MONK,
    PM_CLERIC, PM_RANGER, PM_ROGUE, PM_SAMURAI, PM_TOURIST, PM_VALKYRIE, PM_WIZARD,
} from './monsters.js';
import { ART_MAGICBANE } from './artilist.js';
import { makemon, mongets, set_malign, mkmonmoney, rnd_offensive_item,
         rnd_defensive_item, rnd_misc_item, m_at } from './makemon.js';
import { mksobj, rnd_class, weight, curse, bless, mkobj } from './mkobj.js';
import { mpickobj } from './steal.js';
import { christen_monst } from './do_name.js';
import { mk_artifact } from './artifact.js';
import { rank_of } from './botl.js';
import { m_dowear } from './worn.js';
import { monsndx, is_female, is_mplayer } from './mondata.js';
import { monmightthrowwep } from './weapon.js';
import { rloc_mklev } from './teleport.js';
import { RLOC_ERR, RLOC_NOMSG, P_SPEAR } from "./const.js";

/* These are the names of those who
 * contributed to the development of NetHack 3.2/3.3/3.4/3.6.
 *
 * Keep in alphabetical order within teams.
 * Same first name is entered once within each team.
 */
const developers = [
    /* devteam */
    "Alex",    "Dave",   "Dean",    "Derek",   "Eric",    "Izchak",
    "Janet",   "Jessie", "Ken",     "Kevin",   "Michael", "Mike",
    "Pasi",    "Pat",    "Patric",  "Paul",    "Sean",    "Steve",
    "Timo",    "Warwick",
    /* PC team */
    "Bill",    "Eric",   "Keizo",   "Ken",    "Kevin",    "Michael",
    "Mike",    "Paul",   "Stephen", "Steve",  "Timo",     "Yitzhak",
    /* Amiga team */
    "Andy",    "Gregg",  "Janne",   "Keni",   "Mike",     "Olaf",
    "Richard",
    /* Mac team */
    "Andy",    "Chris",  "Dean",    "Jon",    "Jonathan", "Kevin",
    "Wang",
    /* Atari team */
    "Eric",    "Marvin", "Warwick",
    /* NT team */
    "Alex",    "Dion",   "Michael",
    /* OS/2 team */
    "Helge",   "Ron",    "Timo",
    /* VMS team */
    "Joshua",  "Pat",    ""
];

// C ref: obj.h is_spear()
function is_spear(otmp) {
    return otmp.oclass === WEAPON_CLASS
        && objects[otmp.otyp].oc_skill === P_SPEAR;
}

// C ref: mplayer.c dev_name()
/* return a randomly chosen developer name */
function dev_name() {
    let i, m = 0;
    const n = developers.length;
    let match;

    do {
        match = false;
        i = rn2(n);
        for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
            if (!is_mplayer(mtmp.data))
                continue;
            /* !strncmp(developers[i], MGIVENNAME or "", strlen(developers[i])) */
            if ((mtmp.mgivenname || '').startsWith(developers[i])) {
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

// C ref: mplayer.c get_mplname()
function get_mplname(mtmp) {
    const fmlkind = is_female(mtmp.data);
    let nam;

    const devnam = dev_name();
    if (!devnam)
        nam = fmlkind ? "Eve" : "Adam";
    else if (fmlkind && devnam !== "Janet")
        nam = rn2(2) ? "Maud" : "Eve";
    else
        nam = devnam;

    if (fmlkind || nam === "Janet")
        mtmp.female = 1;
    else
        mtmp.female = 0;
    nam += " the ";
    nam += rank_of(mtmp.m_lev, monsndx(mtmp.data), !!mtmp.female);
    return nam;
}

// C ref: mplayer.c mk_mplayer_armor()
function mk_mplayer_armor(mon, typ) {
    if (typ === STRANGE_OBJECT)
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

// C ref: mplayer.c mk_mplayer()
/* Level creation calls this synchronously (sp_lev.c create_monster()), so
   the "insurance" rloc() is rloc_mklev(). */
export function mk_mplayer(ptr, x, y, special) {
    let mtmp;

    if (!is_mplayer(ptr))
        return null;

    if (m_at(x, y))
        rloc_mklev(m_at(x, y), RLOC_ERR | RLOC_NOMSG); /* insurance */

    if (!In_endgame(game.u.uz))
        special = false;

    if ((mtmp = makemon(ptr, x, y, special ? MM_NOMSG : NO_MM_FLAGS)) != null) {
        let weapon, armor, cloak, helm, shield;
        let quan;
        let otmp;

        mtmp.m_lev = (special ? rn1(16, 15) : rnd(16));
        mtmp.mhp = mtmp.mhpmax = d(mtmp.m_lev, 10)
                                 + (special ? (30 + rnd(30)) : 30);
        if (special) {
            const nam = get_mplname(mtmp);
            mtmp = christen_monst(mtmp, nam);
            /* that's why they are "stuck" in the endgame :-) */
            mongets(mtmp, FAKE_AMULET_OF_YENDOR);
        }
        mtmp.mpeaceful = 0;
        set_malign(mtmp); /* peaceful may have changed again */

        /* default equipment; much of it will be overridden below */
        weapon = !rn2(2) ? LONG_SWORD : rnd_class(SPEAR, BULLWHIP);
        armor  = rnd_class(GRAY_DRAGON_SCALE_MAIL, YELLOW_DRAGON_SCALE_MAIL);
        cloak  = !rn2(8) ? STRANGE_OBJECT
                         : rnd_class(OILSKIN_CLOAK, CLOAK_OF_DISPLACEMENT);
        helm   = !rn2(8) ? STRANGE_OBJECT
                         : rnd_class(ELVEN_LEATHER_HELM, HELM_OF_TELEPATHY);
        shield = !rn2(8) ? STRANGE_OBJECT
                         : rnd_class(ELVEN_SHIELD, SHIELD_OF_REFLECTION);

        switch (monsndx(ptr)) {
        case PM_ARCHEOLOGIST:
            if (rn2(2))
                weapon = BULLWHIP;
            break;
        case PM_BARBARIAN:
            if (rn2(2)) {
                weapon = rn2(2) ? TWO_HANDED_SWORD : BATTLE_AXE;
                shield = STRANGE_OBJECT;
            }
            if (rn2(2))
                armor = rnd_class(PLATE_MAIL, CHAIN_MAIL);
            if (helm === HELM_OF_BRILLIANCE)
                helm = STRANGE_OBJECT;
            break;
        case PM_CAVE_DWELLER:
            if (rn2(4))
                weapon = MACE;
            else if (rn2(2))
                weapon = CLUB;
            if (helm === HELM_OF_BRILLIANCE)
                helm = STRANGE_OBJECT;
            break;
        case PM_HEALER:
            if (rn2(4))
                weapon = QUARTERSTAFF;
            else if (rn2(2))
                weapon = rn2(2) ? UNICORN_HORN : SCALPEL;
            if (rn2(4))
                helm = rn2(2) ? HELM_OF_BRILLIANCE : HELM_OF_TELEPATHY;
            if (rn2(2))
                shield = STRANGE_OBJECT;
            break;
        case PM_KNIGHT:
            if (rn2(4))
                weapon = LONG_SWORD;
            if (rn2(2))
                armor = rnd_class(PLATE_MAIL, CHAIN_MAIL);
            break;
        case PM_MONK:
            weapon = !rn2(3) ? SHURIKEN : STRANGE_OBJECT;
            armor = STRANGE_OBJECT;
            cloak = ROBE;
            if (rn2(2))
                shield = STRANGE_OBJECT;
            break;
        case PM_CLERIC:
            if (rn2(2))
                weapon = MACE;
            if (rn2(2))
                armor = rnd_class(PLATE_MAIL, CHAIN_MAIL);
            if (rn2(4))
                cloak = ROBE;
            if (rn2(4))
                helm = rn2(2) ? HELM_OF_BRILLIANCE : HELM_OF_TELEPATHY;
            if (rn2(2))
                shield = STRANGE_OBJECT;
            break;
        case PM_RANGER:
            if (rn2(2))
                weapon = ELVEN_DAGGER;
            break;
        case PM_ROGUE:
            if (rn2(2))
                weapon = rn2(2) ? SHORT_SWORD : ORCISH_DAGGER;
            break;
        case PM_SAMURAI:
            if (rn2(2))
                weapon = KATANA;
            break;
        case PM_TOURIST:
            /* Defaults are just fine */
            break;
        case PM_VALKYRIE:
            if (rn2(2))
                weapon = WAR_HAMMER;
            if (rn2(2))
                armor = rnd_class(PLATE_MAIL, CHAIN_MAIL);
            break;
        case PM_WIZARD:
            if (rn2(4))
                weapon = rn2(2) ? QUARTERSTAFF : ATHAME;
            if (rn2(2)) {
                armor = rn2(2) ? BLACK_DRAGON_SCALE_MAIL
                               : SILVER_DRAGON_SCALE_MAIL;
                cloak = CLOAK_OF_MAGIC_RESISTANCE;
            }
            if (rn2(4))
                helm = HELM_OF_BRILLIANCE;
            shield = STRANGE_OBJECT;
            break;
        default:
            console.error('impossible: bad mplayer monster');
            weapon = 0;
            break;
        }

        if (weapon !== STRANGE_OBJECT) {
            otmp = mksobj(weapon, true, false);
            otmp.oeroded = otmp.oeroded2 = 0;
            otmp.spe = (special ? rn1(5, 4) : rn2(4));
            if (!rn2(3))
                otmp.oerodeproof = 1;
            else if (!rn2(2))
                otmp.greased = 1;
            /* mk_artifact() with otmp and A_NONE will never return NULL */
            if (special && rn2(2))
                otmp = mk_artifact(otmp, A_NONE, 99, false);
            /* usually increase stack size if stackable weapon */
            if (objects[otmp.otyp].oc_merge && !otmp.oartifact
                && monmightthrowwep(otmp))
                otmp.quan += rn2(is_spear(otmp) ? 4 : 8);
            otmp.owt = weight(otmp);
            /* mplayers knew better than to overenchant Magicbane */
            if (otmp.oartifact === ART_MAGICBANE) /* is_art() */
                otmp.spe = rnd(4);
            mpickobj(mtmp, otmp);
        }

        if (special) {
            if (!rn2(10))
                mongets(mtmp, rn2(3) ? LUCKSTONE : LOADSTONE);
            mk_mplayer_armor(mtmp, armor);
            mk_mplayer_armor(mtmp, cloak);
            mk_mplayer_armor(mtmp, helm);
            mk_mplayer_armor(mtmp, shield);
            if (weapon === WAR_HAMMER) /* valkyrie: wimpy weapon or Mjollnir */
                mk_mplayer_armor(mtmp, GAUNTLETS_OF_POWER);
            else if (rn2(8))
                mk_mplayer_armor(mtmp, rnd_class(LEATHER_GLOVES,
                                                 GAUNTLETS_OF_DEXTERITY));
            if (rn2(8))
                mk_mplayer_armor(mtmp, rnd_class(LOW_BOOTS,
                                                 LEVITATION_BOOTS));
            m_dowear(mtmp, true);

            quan = rn2(3) ? rn2(3) : rn2(16);
            while (quan--)
                mongets(mtmp, rnd_class(DILITHIUM_CRYSTAL, JADE));
            /* To get the gold "right" would mean a player can double his
               gold supply by killing one mplayer.  Not good. */
            mkmonmoney(mtmp, rn2(1000));
            quan = rn2(10);
            while (quan--)
                mpickobj(mtmp, mkobj(RANDOM_CLASS, false));
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
