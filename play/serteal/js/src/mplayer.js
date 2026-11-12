/* NetHack 5.0	mplayer.c	$NHDT-Date: 1596498188 2020/08/03 23:43:08 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.30 $ */
/*      Copyright (c) Izchak Miller, 1992.                        */
/* NetHack may be freely redistributed.  See license for details. */

// #include "hack.h"





/* These are the names of those who
 * contributed to the development of NetHack 3.2/3.3/3.4/3.6.
 *
 * Keep in alphabetical order within teams.
 * Same first name is entered once within each team.
 */
const developers = static_array("developers", ptr_to(char), null, [
    /* devteam */
    _("Alex"),    _("Dave"),   _("Dean"),    _("Derek"),   _("Eric"),    _("Izchak"),
    _("Janet"),   _("Jessie"), _("Ken"),     _("Kevin"),   _("Michael"), _("Mike"),
    _("Pasi"),    _("Pat"),    _("Patric"),  _("Paul"),    _("Sean"),    _("Steve"),
    _("Timo"),    _("Warwick"),
    /* PC team */
    _("Bill"),    _("Eric"),   _("Keizo"),   _("Ken"),    _("Kevin"),    _("Michael"),
    _("Mike"),    _("Paul"),   _("Stephen"), _("Steve"),  _("Timo"),     _("Yitzhak"),
    /* Amiga team */
    _("Andy"),    _("Gregg"),  _("Janne"),   _("Keni"),   _("Mike"),     _("Olaf"),
    _("Richard"),
    /* Mac team */
    _("Andy"),    _("Chris"),  _("Dean"),    _("Jon"),    _("Jonathan"), _("Kevin"),
    _("Wang"),
    /* Atari team */
    _("Eric"),    _("Marvin"), _("Warwick"),
    /* NT team */
    _("Alex"),    _("Dion"),   _("Michael"),
    /* OS/2 team */
    _("Helge"),   _("Ron"),    _("Timo"),
    /* VMS team */
    _("Joshua"),  _("Pat"),    _("")
]);

/* return a randomly chosen developer name */
function /* const char * */
dev_name()
{
    let i, m = 0, n = SIZE(developers);
    let mtmp;
    let match;

    do {
        match = FALSE;
        i = rn2(n);
        for (mtmp = fmon(); mtmp; mtmp = mtmp.nmon) {
            if (!is_mplayer(mtmp.data))
                continue;
            if (!strncmp(developers[i],
                         (has_mgivenname(mtmp)) ? MGIVENNAME(mtmp) : _(""),
                         strlen(developers[i]))) {
                match = TRUE;
                break;
            }
        }
        m++;
    } while (match && m < 100); /* m for insurance */

    if (match)
        return 0;
    return (developers[i]);
}

function /* void */
get_mplname(mtmp, nam)
{
    let fmlkind = is_female(mtmp.data);
    let devnam;

    devnam = dev_name();
    if (!devnam)
        void strcpy(nam, fmlkind ? _("Eve") : _("Adam"));
    else if (fmlkind && !!strcmp(devnam, _("Janet")))
        void strcpy(nam, rn2(2) ? _("Maud") : _("Eve"));
    else
        void strcpy(nam, devnam);

    if (fmlkind || !strcmp(nam, _("Janet")))
        mtmp.female = 1;
    else
        mtmp.female = 0;
    void strcat(nam, _(" the "));
    void strcat(nam, rank_of(mtmp.m_lev, monsndx(mtmp.data),
                        mtmp.female));
}

function /* void */
mk_mplayer_armor(mon, typ)
{
    let obj;

    if (typ == STRANGE_OBJECT)
        return;
    obj = mksobj(typ, FALSE, FALSE);
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
    void mpickobj(mon, obj);
}

export function /* struct monst * */
mk_mplayer(ptr, x, y, special)
{ const $frame = stack_frame(); try {
    let mtmp;
    let nam = stack_array(char, PL_NSIZ);

    if (!is_mplayer(ptr))
        return (null);

    if (MON_AT(x, y))
        void rloc(m_at(x, y), RLOC_ERR|RLOC_NOMSG); /* insurance */

    if (!In_endgame(u.uz))
        special = FALSE;

    if ((mtmp = makemon(ptr, x, y, special ? MM_NOMSG : NO_MM_FLAGS)) != null) {
        let weapon, armor, cloak, helm, shield;
        let quan;
        let otmp;

        mtmp.m_lev = uchar((special ? rn1(16, 15) : rnd(16)));
        mtmp.mhp = int(mtmp.mhpmax = d(mtmp.m_lev, 10)
                                   + (special ? (30 + rnd(30)) : 30));
        if (special) {
            get_mplname(mtmp, nam);
            mtmp = christen_monst(mtmp, nam);
            /* that's why they are "stuck" in the endgame :-) */
            void mongets(mtmp, FAKE_AMULET_OF_YENDOR);
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
            if (helm == HELM_OF_BRILLIANCE)
                helm = STRANGE_OBJECT;
            break;
        case PM_CAVE_DWELLER:
            if (rn2(4))
                weapon = MACE;
            else if (rn2(2))
                weapon = CLUB;
            if (helm == HELM_OF_BRILLIANCE)
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
            impossible(_("bad mplayer monster"));
            weapon = 0;
            break;
        }

        if (weapon != STRANGE_OBJECT) {
            otmp = mksobj(weapon, TRUE, FALSE);
            otmp.oeroded = otmp.oeroded2 = 0;
            otmp.spe = (special ? rn1(5, 4) : rn2(4));
            if (!rn2(3))
                otmp.oerodeproof = 1;
            else if (!rn2(2))
                otmp.greased = 1;
            /* mk_artifact() with otmp and A_NONE will never return NULL */
            if (special && rn2(2))
                otmp = mk_artifact(otmp, A_NONE, 99, FALSE);
            /* usually increase stack size if stackable weapon */
            if (objects[otmp.otyp].oc_merge && !otmp.oartifact
                && monmightthrowwep(otmp))
                otmp.quan += rn2(is_spear(otmp) ? 4 : 8);
            otmp.owt = unsigned(weight(otmp));
            /* mplayers knew better than to overenchant Magicbane */
            if (is_art(otmp, ART_MAGICBANE))
                otmp.spe = rnd(4);
            void mpickobj(mtmp, otmp);
        }

        if (special) {
            if (!rn2(10))
                void mongets(mtmp, rn2(3) ? LUCKSTONE : LOADSTONE);
            mk_mplayer_armor(mtmp, armor);
            mk_mplayer_armor(mtmp, cloak);
            mk_mplayer_armor(mtmp, helm);
            mk_mplayer_armor(mtmp, shield);
            if (weapon == WAR_HAMMER) /* valkyrie: wimpy weapon or Mjollnir */
                mk_mplayer_armor(mtmp, GAUNTLETS_OF_POWER);
            else if (rn2(8))
                mk_mplayer_armor(mtmp, rnd_class(LEATHER_GLOVES,
                                                 GAUNTLETS_OF_DEXTERITY));
            if (rn2(8))
                mk_mplayer_armor(mtmp, rnd_class(LOW_BOOTS,
                                                 LEVITATION_BOOTS));
            m_dowear(mtmp, TRUE);

            quan = rn2(3) ? rn2(3) : rn2(16);
            while (quan--)
                void mongets(mtmp, rnd_class(DILITHIUM_CRYSTAL, JADE));
            /* To get the gold "right" would mean a player can double his
               gold supply by killing one mplayer.  Not good. */
            mkmonmoney(mtmp, rn2(1000));
            quan = rn2(10);
            while (quan--)
                void mpickobj(mtmp, mkobj(RANDOM_CLASS, FALSE));
        }
        quan = rnd(3);
        while (quan--)
            void mongets(mtmp, rnd_offensive_item(mtmp));
        quan = rnd(3);
        while (quan--)
            void mongets(mtmp, rnd_defensive_item(mtmp));
        quan = rnd(3);
        while (quan--)
            void mongets(mtmp, rnd_misc_item(mtmp));
    }

    return (mtmp);
} finally { stack_pop($frame); } }

/* create the indicated number (num) of monster-players,
 * randomly chosen, and in randomly chosen (free) locations
 * on the level.  If "special", the size of num should not
 * be bigger than the number of _non-repeated_ names in the
 * developers array, otherwise a bunch of Adams and Eves will
 * fill up the overflow.
 */
export function /* void */
create_mplayers(num, special)
{ const $frame = stack_frame(); try {
    let pm, x, y;
    let fakemon = stack_struct(struct_monst);

    struct_assign(fakemon, cg.zeromonst);
    while (num) {
        let tryct = 0;

        /* roll for character class */
        pm = rn1(PM_WIZARD - PM_ARCHEOLOGIST + 1, PM_ARCHEOLOGIST);
        set_mon_data(fakemon, mons[pm]);

        /* roll for an available location */
        do {
            x = rn1(COLNO - 4, 2);
            y = rnd(ROWNO - 2);
        } while (!goodpos(x, y, fakemon, 0) && tryct++ <= 50);

        /* if pos not found in 50 tries, don't bother to continue */
        if (tryct > 50)
            return;

        void mk_mplayer(mons[pm], coordxy(x), coordxy(y), special);
        num--;
    }
} finally { stack_pop($frame); } }

export function /* void */
mplayer_talk(mtmp)
{
    let same_class_msg = static_array("mplayer_talk.same_class_msg", ptr_to(char), 3, [
            _("I can't win, and neither will you!"),
            _("You don't deserve to win!"),
            _("Mine should be the honor, not yours!"),
        ]),
        other_class_msg = static_array("mplayer_talk.other_class_msg", ptr_to(char), 3, [
            _("The low-life wants to talk, eh?"),
            _("Fight, scum!"),
            _("Here is what I have to say!"),
        ]);


    if (mtmp.mpeaceful)
        return; /* will drop to humanoid talk */

       ;
    verbalize(_("Talk? -- %s"), mtmp.data == mons[gu.urole.mnum]
                                ? same_class_msg[rn2(3)]
                                : other_class_msg[rn2(3)]);
}

/*mplayer.c*/
import { A_NONE } from "./align.h.js";
import { ART_MAGICBANE } from "./artilist.h.js";
import { RANDOM_CLASS } from "./defsym.h.js";
import { In_endgame } from "./dungeon.h.macros.js";
import { COLNO } from "./global.h.js";
import { FALSE } from "./global.h.js";
import { PL_NSIZ } from "./global.h.js";
import { ROWNO } from "./global.h.js";
import { TRUE } from "./global.h.js";
import { coordxy } from "./global.h.js";
import { MM_NOMSG } from "./hack.h.js";
import { NO_MM_FLAGS } from "./hack.h.js";
import { RLOC_ERR } from "./hack.h.js";
import { RLOC_NOMSG } from "./hack.h.js";
import { rn1 } from "./hack.h.macros.js";
import { MGIVENNAME } from "./mextra.h.macros.js";
import { has_mgivenname } from "./mextra.h.macros.js";
import { is_female } from "./mondata.h.macros.js";
import { is_mplayer } from "./mondata.h.macros.js";
import { monsndx } from "./mondata.h.macros.js";
import { struct_monst } from "./monst.h.js";
import { PM_ARCHEOLOGIST } from "./monsters.h.js";
import { PM_BARBARIAN } from "./monsters.h.js";
import { PM_CAVE_DWELLER } from "./monsters.h.js";
import { PM_CLERIC } from "./monsters.h.js";
import { PM_HEALER } from "./monsters.h.js";
import { PM_KNIGHT } from "./monsters.h.js";
import { PM_MONK } from "./monsters.h.js";
import { PM_RANGER } from "./monsters.h.js";
import { PM_ROGUE } from "./monsters.h.js";
import { PM_SAMURAI } from "./monsters.h.js";
import { PM_TOURIST } from "./monsters.h.js";
import { PM_VALKYRIE } from "./monsters.h.js";
import { PM_WIZARD } from "./monsters.h.js";
import { is_spear } from "./obj.h.macros.js";
import { ATHAME } from "./objects.h.js";
import { BATTLE_AXE } from "./objects.h.js";
import { BLACK_DRAGON_SCALE_MAIL } from "./objects.h.js";
import { BULLWHIP } from "./objects.h.js";
import { CHAIN_MAIL } from "./objects.h.js";
import { CLOAK_OF_DISPLACEMENT } from "./objects.h.js";
import { CLOAK_OF_MAGIC_RESISTANCE } from "./objects.h.js";
import { CLUB } from "./objects.h.js";
import { DILITHIUM_CRYSTAL } from "./objects.h.js";
import { ELVEN_DAGGER } from "./objects.h.js";
import { ELVEN_LEATHER_HELM } from "./objects.h.js";
import { ELVEN_SHIELD } from "./objects.h.js";
import { FAKE_AMULET_OF_YENDOR } from "./objects.h.js";
import { GAUNTLETS_OF_DEXTERITY } from "./objects.h.js";
import { GAUNTLETS_OF_POWER } from "./objects.h.js";
import { GRAY_DRAGON_SCALE_MAIL } from "./objects.h.js";
import { HELM_OF_BRILLIANCE } from "./objects.h.js";
import { HELM_OF_TELEPATHY } from "./objects.h.js";
import { JADE } from "./objects.h.js";
import { KATANA } from "./objects.h.js";
import { LEATHER_GLOVES } from "./objects.h.js";
import { LEVITATION_BOOTS } from "./objects.h.js";
import { LOADSTONE } from "./objects.h.js";
import { LONG_SWORD } from "./objects.h.js";
import { LOW_BOOTS } from "./objects.h.js";
import { LUCKSTONE } from "./objects.h.js";
import { MACE } from "./objects.h.js";
import { OILSKIN_CLOAK } from "./objects.h.js";
import { ORCISH_DAGGER } from "./objects.h.js";
import { PLATE_MAIL } from "./objects.h.js";
import { QUARTERSTAFF } from "./objects.h.js";
import { ROBE } from "./objects.h.js";
import { SCALPEL } from "./objects.h.js";
import { SHIELD_OF_REFLECTION } from "./objects.h.js";
import { SHORT_SWORD } from "./objects.h.js";
import { SHURIKEN } from "./objects.h.js";
import { SILVER_DRAGON_SCALE_MAIL } from "./objects.h.js";
import { SPEAR } from "./objects.h.js";
import { STRANGE_OBJECT } from "./objects.h.js";
import { TWO_HANDED_SWORD } from "./objects.h.js";
import { UNICORN_HORN } from "./objects.h.js";
import { WAR_HAMMER } from "./objects.h.js";
import { YELLOW_DRAGON_SCALE_MAIL } from "./objects.h.js";
import { MON_AT } from "./rm.h.macros.js";
import { fmon } from "./rm.h.macros.js";
import { m_at } from "./rm.h.macros.js";
import { SIZE } from "../rt/cmacros.js";
import { char } from "../rt/ctypes.js";
import { int } from "../rt/ctypes.js";
import { uchar } from "../rt/ctypes.js";
import { unsigned } from "../rt/ctypes.js";
import { stack_frame } from "../rt/heap.js";
import { stack_pop } from "../rt/heap.js";
import { strcat } from "../rt/libc.js";
import { strcmp } from "../rt/libc.js";
import { strcpy } from "../rt/libc.js";
import { strlen } from "../rt/libc.js";
import { strncmp } from "../rt/libc.js";
import { stack_array } from "../rt/locals.js";
import { stack_struct } from "../rt/locals.js";
import { static_array } from "../rt/locals.js";
import { _ } from "../rt/strings.js";
import { ptr_to } from "../rt/struct.js";
import { struct_assign } from "../rt/struct.js";
import { is_art } from "./artifact.js";
import { mk_artifact } from "./artifact.js";
import { rank_of } from "./botl.js";
import { cg } from "./decl.js";
import { gu } from "./decl.js";
import { u } from "./decl.js";
import { christen_monst } from "./do_name.js";
import { makemon } from "./makemon.js";
import { mkmonmoney } from "./makemon.js";
import { mongets } from "./makemon.js";
import { set_malign } from "./makemon.js";
import { bless } from "./mkobj.js";
import { curse } from "./mkobj.js";
import { mkobj } from "./mkobj.js";
import { mksobj } from "./mkobj.js";
import { weight } from "./mkobj.js";
import { set_mon_data } from "./mondata.js";
import { mons } from "./monst.js";
import { rnd_defensive_item } from "./muse.js";
import { rnd_misc_item } from "./muse.js";
import { rnd_offensive_item } from "./muse.js";
import { objects } from "./objects.js";
import { rnd_class } from "./objnam.js";
import { impossible } from "./pline.js";
import { verbalize } from "./pline.js";
import { d } from "./rnd.js";
import { rn2 } from "./rnd.js";
import { rnd } from "./rnd.js";
import { mpickobj } from "./steal.js";
import { goodpos } from "./teleport.js";
import { rloc } from "./teleport.js";
import { monmightthrowwep } from "./weapon.js";
import { m_dowear } from "./worn.js";
