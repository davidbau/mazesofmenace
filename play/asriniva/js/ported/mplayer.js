/* NetHack 5.0	mplayer.c	$NHDT-Date: 1596498188 2020/08/03 23:43:08 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.30 $ */
/*      Copyright (c) Izchak Miller, 1992.                        */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from '../c-runtime/context.js';

/* JavaScript translation of mplayer.c. Six original function boundaries and
 * the original tables and decision paths remain. dev_name returns a stable
 * C.literal pointer, including for the nonnull empty developer name. The
 * fakemon automatic is a full byte copy in the surrounding import's stack
 * scope. Typed views preserve stored fields; C.short/C.coordxy preserve C
 * local and parameter conversions. RNG annotations retain Clang's closing
 * invocation lines. SetVoice is already an empty macro in this build.
 */

// staticfn const char *dev_name(void);
// staticfn void get_mplname(struct monst *, char *);
// staticfn void mk_mplayer_armor(struct monst *, short);

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

/* return a randomly chosen developer name */
export function dev_name()
{
    let i, m = 0, n = developers.length;
    let mtmp;
    let match;

    do {
        match = 0;
        i = C.rn2(n, 52, 'dev_name');
        for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon) {
            if (!C.is_mplayer(mtmp.data))
                continue;
            if (!C.strncmp(C.literal(developers[i]),
                         (C.has_mgivenname(mtmp)) ? C.MGIVENNAME(mtmp) : "",
                         C.strlen(C.literal(developers[i])))) {
                match = 1;
                break;
            }
        }
        m++;
    } while (match && m < 100); /* m for insurance */

    if (match)
        return 0;
    return (C.literal(developers[i]));
}

export function get_mplname(mtmp, nam)
{
    let fmlkind = C.is_female(mtmp.data);
    let devnam;

    devnam = dev_name();
    if (!devnam)
        C.Strcpy(nam, fmlkind ? "Eve" : "Adam");
    else if (fmlkind && !!C.strcmp(devnam, "Janet"))
        C.Strcpy(nam, C.rn2(2, 81, 'get_mplname') ? "Maud" : "Eve");
    else
        C.Strcpy(nam, devnam);

    if (fmlkind || !C.strcmp(nam, "Janet"))
        mtmp.female = 1;
    else
        mtmp.female = 0;
    C.Strcat(nam, " the ");
    C.Strcat(nam, C.rank_of(mtmp.m_lev, C.monsndx(mtmp.data),
                        mtmp.female));
}

export function mk_mplayer_armor(mon, typ)
{
    typ = C.short(typ);

    let obj;

    if (typ == C.STRANGE_OBJECT)
        return;
    obj = C.mksobj(typ, 0, 0);
    obj.oeroded = obj.oeroded2 = 0;
    if (!C.rn2(3, 103, 'mk_mplayer_armor'))
        obj.oerodeproof = 1;
    if (!C.rn2(3, 105, 'mk_mplayer_armor'))
        C.curse(obj);
    if (!C.rn2(3, 107, 'mk_mplayer_armor'))
        C.bless(obj);
    /* Most players who get to the endgame who have cursed equipment
     * have it because the wizard or other monsters cursed it, so its
     * chances of having plusses is the same as usual....
     */
    obj.spe = C.rn2(10, 113, 'mk_mplayer_armor') ? (C.rn2(3, 113, 'mk_mplayer_armor') ? C.rn2(5, 113, 'mk_mplayer_armor') : C.rn1(4, 4, 113, 'mk_mplayer_armor')) : -C.rnd(3, 113, 'mk_mplayer_armor');
    C.mpickobj(mon, obj);
}

export function mk_mplayer(ptr, x, y, special)
{
    x = C.coordxy(x);
    y = C.coordxy(y);

    let mtmp;
    let nam = C.stackAlloc(C.PL_NSIZ);

    if (!C.is_mplayer(ptr))
        return (0);

    if (C.MON_AT(x, y))
        C.rloc(C.m_at(x, y), C.RLOC_ERR|C.RLOC_NOMSG); /* insurance */

    if (!C.In_endgame(C.u.uz))
        special = 0;

    if ((mtmp = C.makemon(ptr, x, y, special ? C.MM_NOMSG : C.NO_MM_FLAGS)) != 0) {
        let weapon, armor, cloak, helm, shield;
        let quan;
        let otmp;

        mtmp.m_lev = (special ? C.rn1(16, 15, 137, 'mk_mplayer') : C.rnd(16, 137, 'mk_mplayer'));
        mtmp.mhp = mtmp.mhpmax = C.d(mtmp.m_lev, 10, 138, 'mk_mplayer')
                                   + (special ? (30 + C.rnd(30, 139, 'mk_mplayer')) : 30);
        if (special) {
            get_mplname(mtmp, nam);
            mtmp = C.christen_monst(mtmp, nam);
            /* that's why they are "stuck" in the endgame :-) */
            C.mongets(mtmp, C.FAKE_AMULET_OF_YENDOR);
        }
        mtmp.mpeaceful = 0;
        C.set_malign(mtmp); /* peaceful may have changed again */

        /* default equipment; much of it will be overridden below */
        weapon = C.short(!C.rn2(2, 150, 'mk_mplayer') ? C.LONG_SWORD : C.rnd_class(C.SPEAR, C.BULLWHIP));
        armor  = C.short(C.rnd_class(C.GRAY_DRAGON_SCALE_MAIL, C.YELLOW_DRAGON_SCALE_MAIL));
        cloak  = C.short(!C.rn2(8, 152, 'mk_mplayer') ? C.STRANGE_OBJECT
                         : C.rnd_class(C.OILSKIN_CLOAK, C.CLOAK_OF_DISPLACEMENT));
        helm   = C.short(!C.rn2(8, 154, 'mk_mplayer') ? C.STRANGE_OBJECT
                         : C.rnd_class(C.ELVEN_LEATHER_HELM, C.HELM_OF_TELEPATHY));
        shield = C.short(!C.rn2(8, 156, 'mk_mplayer') ? C.STRANGE_OBJECT
                         : C.rnd_class(C.ELVEN_SHIELD, C.SHIELD_OF_REFLECTION));

        switch (C.monsndx(ptr)) {
        case C.PM_ARCHEOLOGIST:
            if (C.rn2(2, 161, 'mk_mplayer'))
                weapon = C.short(C.BULLWHIP);
            break;
        case C.PM_BARBARIAN:
            if (C.rn2(2, 165, 'mk_mplayer')) {
                weapon = C.short(C.rn2(2, 166, 'mk_mplayer') ? C.TWO_HANDED_SWORD : C.BATTLE_AXE);
                shield = C.short(C.STRANGE_OBJECT);
            }
            if (C.rn2(2, 169, 'mk_mplayer'))
                armor = C.short(C.rnd_class(C.PLATE_MAIL, C.CHAIN_MAIL));
            if (helm == C.HELM_OF_BRILLIANCE)
                helm = C.short(C.STRANGE_OBJECT);
            break;
        case C.PM_CAVE_DWELLER:
            if (C.rn2(4, 175, 'mk_mplayer'))
                weapon = C.short(C.MACE);
            else if (C.rn2(2, 177, 'mk_mplayer'))
                weapon = C.short(C.CLUB);
            if (helm == C.HELM_OF_BRILLIANCE)
                helm = C.short(C.STRANGE_OBJECT);
            break;
        case C.PM_HEALER:
            if (C.rn2(4, 183, 'mk_mplayer'))
                weapon = C.short(C.QUARTERSTAFF);
            else if (C.rn2(2, 185, 'mk_mplayer'))
                weapon = C.short(C.rn2(2, 186, 'mk_mplayer') ? C.UNICORN_HORN : C.SCALPEL);
            if (C.rn2(4, 187, 'mk_mplayer'))
                helm = C.short(C.rn2(2, 188, 'mk_mplayer') ? C.HELM_OF_BRILLIANCE : C.HELM_OF_TELEPATHY);
            if (C.rn2(2, 189, 'mk_mplayer'))
                shield = C.short(C.STRANGE_OBJECT);
            break;
        case C.PM_KNIGHT:
            if (C.rn2(4, 193, 'mk_mplayer'))
                weapon = C.short(C.LONG_SWORD);
            if (C.rn2(2, 195, 'mk_mplayer'))
                armor = C.short(C.rnd_class(C.PLATE_MAIL, C.CHAIN_MAIL));
            break;
        case C.PM_MONK:
            weapon = C.short(!C.rn2(3, 199, 'mk_mplayer') ? C.SHURIKEN : C.STRANGE_OBJECT);
            armor = C.short(C.STRANGE_OBJECT);
            cloak = C.short(C.ROBE);
            if (C.rn2(2, 202, 'mk_mplayer'))
                shield = C.short(C.STRANGE_OBJECT);
            break;
        case C.PM_CLERIC:
            if (C.rn2(2, 206, 'mk_mplayer'))
                weapon = C.short(C.MACE);
            if (C.rn2(2, 208, 'mk_mplayer'))
                armor = C.short(C.rnd_class(C.PLATE_MAIL, C.CHAIN_MAIL));
            if (C.rn2(4, 210, 'mk_mplayer'))
                cloak = C.short(C.ROBE);
            if (C.rn2(4, 212, 'mk_mplayer'))
                helm = C.short(C.rn2(2, 213, 'mk_mplayer') ? C.HELM_OF_BRILLIANCE : C.HELM_OF_TELEPATHY);
            if (C.rn2(2, 214, 'mk_mplayer'))
                shield = C.short(C.STRANGE_OBJECT);
            break;
        case C.PM_RANGER:
            if (C.rn2(2, 218, 'mk_mplayer'))
                weapon = C.short(C.ELVEN_DAGGER);
            break;
        case C.PM_ROGUE:
            if (C.rn2(2, 222, 'mk_mplayer'))
                weapon = C.short(C.rn2(2, 223, 'mk_mplayer') ? C.SHORT_SWORD : C.ORCISH_DAGGER);
            break;
        case C.PM_SAMURAI:
            if (C.rn2(2, 226, 'mk_mplayer'))
                weapon = C.short(C.KATANA);
            break;
        case C.PM_TOURIST:
            /* Defaults are just fine */
            break;
        case C.PM_VALKYRIE:
            if (C.rn2(2, 233, 'mk_mplayer'))
                weapon = C.short(C.WAR_HAMMER);
            if (C.rn2(2, 235, 'mk_mplayer'))
                armor = C.short(C.rnd_class(C.PLATE_MAIL, C.CHAIN_MAIL));
            break;
        case C.PM_WIZARD:
            if (C.rn2(4, 239, 'mk_mplayer'))
                weapon = C.short(C.rn2(2, 240, 'mk_mplayer') ? C.QUARTERSTAFF : C.ATHAME);
            if (C.rn2(2, 241, 'mk_mplayer')) {
                armor = C.short(C.rn2(2, 242, 'mk_mplayer') ? C.BLACK_DRAGON_SCALE_MAIL
                               : C.SILVER_DRAGON_SCALE_MAIL);
                cloak = C.short(C.CLOAK_OF_MAGIC_RESISTANCE);
            }
            if (C.rn2(4, 246, 'mk_mplayer'))
                helm = C.short(C.HELM_OF_BRILLIANCE);
            shield = C.short(C.STRANGE_OBJECT);
            break;
        default:
            C.impossible("bad mplayer monster");
            weapon = C.short(0);
            break;
        }

        if (weapon != C.STRANGE_OBJECT) {
            otmp = C.mksobj(weapon, 1, 0);
            otmp.oeroded = otmp.oeroded2 = 0;
            otmp.spe = (special ? C.rn1(5, 4, 259, 'mk_mplayer') : C.rn2(4, 259, 'mk_mplayer'));
            if (!C.rn2(3, 260, 'mk_mplayer'))
                otmp.oerodeproof = 1;
            else if (!C.rn2(2, 262, 'mk_mplayer'))
                otmp.greased = 1;
            /* mk_artifact() with otmp and A_NONE will never return NULL */
            if (special && C.rn2(2, 265, 'mk_mplayer'))
                otmp = C.mk_artifact(otmp, C.A_NONE, 99, 0);
            /* usually increase stack size if stackable weapon */
            if (C.objects[otmp.otyp].oc_merge && !otmp.oartifact
                && C.monmightthrowwep(otmp))
                otmp.quan += BigInt(C.rn2(C.is_spear(otmp) ? 4 : 8, 270, 'mk_mplayer'));
            otmp.owt = C.weight(otmp);
            /* mplayers knew better than to overenchant Magicbane */
            if (C.is_art(otmp, C.ART_MAGICBANE))
                otmp.spe = C.rnd(4, 274, 'mk_mplayer');
            C.mpickobj(mtmp, otmp);
        }

        if (special) {
            if (!C.rn2(10, 279, 'mk_mplayer'))
                C.mongets(mtmp, C.rn2(3, 280, 'mk_mplayer') ? C.LUCKSTONE : C.LOADSTONE);
            mk_mplayer_armor(mtmp, armor);
            mk_mplayer_armor(mtmp, cloak);
            mk_mplayer_armor(mtmp, helm);
            mk_mplayer_armor(mtmp, shield);
            if (weapon == C.WAR_HAMMER) /* valkyrie: wimpy weapon or Mjollnir */
                mk_mplayer_armor(mtmp, C.GAUNTLETS_OF_POWER);
            else if (C.rn2(8, 287, 'mk_mplayer'))
                mk_mplayer_armor(mtmp, C.rnd_class(C.LEATHER_GLOVES,
                                                 C.GAUNTLETS_OF_DEXTERITY));
            if (C.rn2(8, 290, 'mk_mplayer'))
                mk_mplayer_armor(mtmp, C.rnd_class(C.LOW_BOOTS,
                                                 C.LEVITATION_BOOTS));
            C.m_dowear(mtmp, 1);

            quan = C.rn2(3, 295, 'mk_mplayer') ? C.rn2(3, 295, 'mk_mplayer') : C.rn2(16, 295, 'mk_mplayer');
            while (quan--)
                C.mongets(mtmp, C.rnd_class(C.DILITHIUM_CRYSTAL, C.JADE));
            /* To get the gold "right" would mean a player can double his
               gold supply by killing one mplayer.  Not good. */
            C.mkmonmoney(mtmp, BigInt(C.rn2(1000, 300, 'mk_mplayer')));
            quan = C.rn2(10, 301, 'mk_mplayer');
            while (quan--)
                C.mpickobj(mtmp, C.mkobj(C.RANDOM_CLASS, 0));
        }
        quan = C.rnd(3, 305, 'mk_mplayer');
        while (quan--)
            C.mongets(mtmp, C.rnd_offensive_item(mtmp));
        quan = C.rnd(3, 308, 'mk_mplayer');
        while (quan--)
            C.mongets(mtmp, C.rnd_defensive_item(mtmp));
        quan = C.rnd(3, 311, 'mk_mplayer');
        while (quan--)
            C.mongets(mtmp, C.rnd_misc_item(mtmp));
    }

    return (mtmp);
}

/* create the indicated number (num) of monster-players,
 * randomly chosen, and in randomly chosen (free) locations
 * on the level.  If "special", the size of num should not
 * be bigger than the number of _non-repeated_ names in the
 * developers array, otherwise a bunch of Adams and Eves will
 * fill up the overflow.
 */
export function create_mplayers(num, special)
{
    let pm, x, y;
    let fakemon;

    fakemon = C.monsterLocal(C.cg.zeromonst);
    while (num) {
        let tryct = 0;

        /* roll for character class */
        pm = C.rn1(C.PM_WIZARD - C.PM_ARCHEOLOGIST + 1, C.PM_ARCHEOLOGIST, 337, 'create_mplayers');
        C.set_mon_data(fakemon, C.mons[pm]);

        /* roll for an available location */
        do {
            x = C.rn1(C.COLNO - 4, 2, 342, 'create_mplayers');
            y = C.rnd(C.ROWNO - 2, 343, 'create_mplayers');
        } while (!C.goodpos(x, y, fakemon, 0) && tryct++ <= 50);

        /* if pos not found in 50 tries, don't bother to continue */
        if (tryct > 50)
            return;

        mk_mplayer(C.mons[pm], C.coordxy(x), C.coordxy(y), special);
        num--;
    }
}

export function mplayer_talk(mtmp)
{
    const same_class_msg = [
            "I can't win, and neither will you!",
            "You don't deserve to win!",
            "Mine should be the honor, not yours!",
        ];
    const other_class_msg = [
            "The low-life wants to talk, eh?",
            "Fight, scum!",
            "Here is what I have to say!",
        ];

    if (mtmp.mpeaceful)
        return; /* will drop to humanoid talk */

    // SetVoice(mtmp, 0, 80, 0); /* inactive empty C macro */
    C.verbalize("Talk? -- %s", mtmp.data.address == C.mons[C.gu.urole.mnum].address
                                ? same_class_msg[C.rn2(3, 375, 'mplayer_talk')]
                                : other_class_msg[C.rn2(3, 376, 'mplayer_talk')]);
}

/*mplayer.c*/
