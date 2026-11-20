// iactions.js — item actions: the menu shown after picking an item in
// the 'i' inventory menu.
// C ref: src/iactions.c item_naming_classification(),
//        item_reading_classification(), ia_addmenu(),
//        itemactions_pushkeys(), itemactions()

import { game } from './gstate.js';
import * as O from './objects.js';
import { objects, OBJ_DESCR, obj_descr } from './objects.js';
import {
    NHW_MENU, PICK_ONE, MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE,
    W_ARMOR, W_ACCESSORY, W_AMUL, W_RING, W_TOOL, W_ARM, W_ARMC, W_ARMH,
    W_ARMS, W_ARMG, W_ARMF, W_ARMU, HANDS_SYM, ECMD_OK, GETOBJ_SUGGEST,
    GETOBJ_DOWNPLAY, GETOBJ_EXCLUDE, Has_contents, ONAME, has_oname,
    P_DAGGER, P_SABER, P_BOW, P_CROSSBOW, IS_ALTAR, IS_GRAVE, IS_FOUNTAIN,
    IS_WALL, IS_DOOR, IS_ROOM, SDOOR, STAIRS, LADDER, CORR,
} from './const.js';
import { NO_COLOR, ATR_NONE } from './terminal.js';
import {
    tty_create_nhwindow, tty_start_menu, tty_add_menu, tty_end_menu,
    tty_select_menu, tty_destroy_nhwindow,
} from './wintty.js';
import { xname, makeplural, makesingular, fruit_from_name } from './objnam.js';
import { data_base_keys } from './data_base_keys.js';
import { is_weptool, Is_container } from './mkobj.js';
import * as M from './monsters.js';
import { ART_EYES_OF_THE_OVERWORLD } from './artilist.js';

const IA_NONE = 0,
    IA_UNWIELD = 1, /* hack for 'w-' */
    IA_APPLY_OBJ = 2, /* 'a' */
    IA_DIP_OBJ = 3, /* 'a' on a potion == dip */
    IA_NAME_OBJ = 4, /* 'c' name individual item */
    IA_NAME_OTYP = 5, /* 'C' name item's type */
    IA_DROP_OBJ = 6, /* 'd' */
    IA_EAT_OBJ = 7, /* 'e' */
    IA_ENGRAVE_OBJ = 8, /* 'E' */
    IA_FIRE_OBJ = 9, /* 'f' */
    IA_ADJUST_OBJ = 10, /* 'i' #adjust inventory letter */
    IA_ADJUST_STACK = 11, /* 'I' #adjust with count to split stack */
    IA_SACRIFICE = 12, /* 'O' offer sacrifice */
    IA_BUY_OBJ = 13, /* 'p' pay shopkeeper */
    IA_QUAFF_OBJ = 14,
    IA_QUIVER_OBJ = 15,
    IA_READ_OBJ = 16,
    IA_RUB_OBJ = 17,
    IA_THROW_OBJ = 18,
    IA_TAKEOFF_OBJ = 19,
    IA_TIP_CONTAINER = 20,
    IA_INVOKE_OBJ = 21,
    IA_WIELD_OBJ = 22,
    IA_WEAR_OBJ = 23,
    IA_SWAPWEAPON = 24,
    IA_TWOWEAPON = 25,
    IA_ZAP_OBJ = 26,
    IA_WHATIS_OBJ = 27; /* '/' specify inventory object */

function ia_not_ported(what) {
    throw new Error(`itemactions: ${what} is not ported yet`);
}

/* C ref: obj.h is_plural() -- undiscovered_artifact() not ported */
function is_plural(o) {
    if (o.oartifact === ART_EYES_OF_THE_OVERWORLD)
        ia_not_ported('undiscovered_artifact()');
    return o.quan !== 1;
}
/* C ref: obj.h is_ammo(), is_missile(), is_launcher(), matching_launcher(),
   ammo_and_launcher(), bimanual(), is_blade(), is_wet_towel(),
   is_graystone() */
function is_ammo(otmp) {
    return ((otmp.oclass === O.WEAPON_CLASS || otmp.oclass === O.GEM_CLASS)
            && objects[otmp.otyp].oc_skill >= -P_CROSSBOW
            && objects[otmp.otyp].oc_skill <= -P_BOW);
}
function is_missile(otmp) {
    return ((otmp.oclass === O.WEAPON_CLASS || otmp.oclass === O.TOOL_CLASS)
            && objects[otmp.otyp].oc_skill >= -24 /* -P_BOOMERANG */
            && objects[otmp.otyp].oc_skill <= -23 /* -P_DART */);
}
function is_launcher(otmp) {
    return (otmp.oclass === O.WEAPON_CLASS
            && objects[otmp.otyp].oc_skill >= P_BOW
            && objects[otmp.otyp].oc_skill <= P_CROSSBOW);
}
function matching_launcher(a, l) {
    return (l && objects[a.otyp].oc_skill === -objects[l.otyp].oc_skill);
}
function ammo_and_launcher(a, l) { return is_ammo(a) && !!matching_launcher(a, l); }
function bimanual(otmp) {
    return ((otmp.oclass === O.WEAPON_CLASS || otmp.oclass === O.TOOL_CLASS)
            && objects[otmp.otyp].oc_bimanual);
}
function is_blade(otmp) {
    return (otmp.oclass === O.WEAPON_CLASS
            && objects[otmp.otyp].oc_skill >= P_DAGGER
            && objects[otmp.otyp].oc_skill <= P_SABER);
}
function is_wet_towel(o) { return o.otyp === O.TOWEL && o.spe > 0; }
function is_graystone(obj) {
    return (obj.otyp === O.LUCKSTONE || obj.otyp === O.LOADSTONE
            || obj.otyp === O.FLINT || obj.otyp === O.TOUCHSTONE);
}
/* C ref: you.h Blind etc. are not needed here */

/* C ref: mondata.h nohands(), verysmall(), cantwield(), could_twoweap() */
function hero_data() {
    const d = game.youmonst?.data;
    if (!d)
        ia_not_ported('youmonst.data');
    return d;
}
function cantwield(ptr) {
    return ((ptr.mflags1 & M.M1_NOHANDS) !== 0) || ptr.msize < M.MZ_SMALL;
}
function could_twoweap(ptr) { return ptr.mattk?.[1]?.aatyp === M.AT_WEAP; }

/* C ref: polyself.c body_part() -- unpolymorphed humanoid hero only */
function body_part_hand() {
    if (game.u.mtimedone) /* Upolyd */
        ia_not_ported('body_part() for a polymorphed hero');
    return "hand"; /* humanoid_parts[HAND] */
}

/* C ref: eat.c is_edible() -- for an unpolymorphed hero */
function is_edible(obj) {
    if (objects[obj.otyp].oc_unique)
        return false;
    /* fire elemental, metallivore, gelatinous cube and lithivore forms */
    if (game.u.mtimedone) /* Upolyd */
        ia_not_ported('is_edible() for a polymorphed hero');
    return obj.oclass === O.FOOD_CLASS;
}

/* C ref: dungeon.c surface() -- the hero's spot on ordinary terrain */
function surface(x, y) {
    const lev = game.level.at(x, y);
    const levtyp = lev.typ;

    if (game.u.uswallow)
        ia_not_ported('surface() while swallowed');
    if (IS_ALTAR(levtyp))
        return "altar";
    else if (IS_GRAVE(levtyp))
        return "headstone";
    else if (IS_FOUNTAIN(levtyp))
        return "fountain";
    else if (levtyp === STAIRS || levtyp === LADDER) /* On_stairs() */
        return "stairs";
    else if (IS_WALL(levtyp) || levtyp === SDOOR)
        return "wall";
    else if (IS_DOOR(levtyp))
        return "doorway";
    else if (IS_ROOM(levtyp) || levtyp === CORR) {
        /* pools, ice, lava, air and drawbridges are not ported */
        if (!IS_ROOM(levtyp))
            return "ground";
        return "floor"; /* !Is_earthlevel(&u.uz) */
    }
    ia_not_ported('surface() for water/ice/lava/air/drawbridge');
    return "";
}

/* C ref: do_name.c objtyp_is_callable() */
function objtyp_is_callable(i) {
    if (objects[i].oc_uname)
        return true;

    switch (objects[i].oc_class) {
    case O.AMULET_CLASS:
        if (i === O.AMULET_OF_YENDOR || i === O.FAKE_AMULET_OF_YENDOR)
            break; /* return FALSE */
        /*FALLTHRU*/
    case O.SCROLL_CLASS:
    case O.POTION_CLASS:
    case O.WAND_CLASS:
    case O.RING_CLASS:
    case O.GEM_CLASS:
    case O.SPBOOK_CLASS:
    case O.ARMOR_CLASS:
    case O.TOOL_CLASS:
    case O.VENOM_CLASS:
        if (OBJ_DESCR(objects[i]))
            return true;
        break;
    default:
        break;
    }
    return false;
}

/* C ref: do_name.c name_ok() */
function name_ok(obj) {
    if (!obj || obj.oclass === O.COIN_CLASS)
        return GETOBJ_EXCLUDE;

    if (!obj.dknown || obj.oartifact || obj.otyp === O.SPE_NOVEL)
        return GETOBJ_DOWNPLAY;

    return GETOBJ_SUGGEST;
}

/* C ref: do_name.c call_ok() */
function call_ok(obj) {
    if (!obj || !objtyp_is_callable(obj.otyp))
        return GETOBJ_EXCLUDE;

    if (!obj.dknown || (objects[obj.otyp].oc_name_known
                        && !objects[obj.otyp].oc_uname))
        return GETOBJ_DOWNPLAY;

    return GETOBJ_SUGGEST;
}

/* C ref: objnam.c the_unique_obj() -- not ported beyond the common case */
function the_unique_obj(obj) {
    if (obj.oartifact || objects[obj.otyp].oc_unique
        || obj.otyp === O.FAKE_AMULET_OF_YENDOR)
        ia_not_ported('the_unique_obj()');
    return false;
}

/* C ref: objnam.c minimal_xname() -- distant_name() of an inventory
   object is xname() */
function minimal_xname(obj) {
    const otyp = obj.otyp;
    const save_uname = objects[otyp].oc_uname;
    const save_name_known = objects[otyp].oc_name_known;

    /* suppress user-supplied name */
    objects[otyp].oc_uname = null;
    /* suppress actual name if object's description is unknown */
    if (game.iflags?.override_ID)
        objects[otyp].oc_name_known = 1;
    else if (!obj.dknown)
        objects[otyp].oc_name_known = 0;

    const bareobj = {
        otyp, oclass: obj.oclass,
        dknown: (obj.dknown || game.iflags?.override_ID) ? 1 : 0,
        /* suppress known except for amulets */
        known: (obj.oclass === O.AMULET_CLASS) ? obj.known
            : (objects[otyp].oc_uses_known ? 0 : 1),
        quan: 1, /* don't want plural */
        corpsenm: (otyp !== O.BOULDER) ? -1 /* NON_PM */ : 0,
        spe: (obj.otyp === O.SLIME_MOLD) ? obj.spe : 0,
        blessed: 0, cursed: 0, oeroded: 0, oeroded2: 0, oartifact: 0,
    };
    let bufp;
    try {
        bufp = xname(bareobj);
    } finally {
        objects[otyp].oc_uname = save_uname;
        objects[otyp].oc_name_known = save_name_known;
    }
    if (bufp.startsWith("uncursed "))
        bufp = bufp.slice(9);
    return bufp;
}

/* C ref: objnam.c simpleonames() */
function simpleonames(obj) {
    let simpleoname = minimal_xname(obj);

    if (obj.quan !== 1)
        simpleoname = makeplural(simpleoname);
    return simpleoname;
}

/* C ref: objnam.c the() -- names that don't start with a capital letter */
function the(str) {
    if (!str)
        return "the []";
    if (str.toLowerCase().startsWith("the ")) {
        return str[0].toLowerCase() + str.slice(1);
    } else if (str[0] < 'A' || str[0] > 'Z') {
        /* not a proper name, needs an article */
        return `the ${str}`;
    }
    ia_not_ported('the() for capitalized names');
    return str;
}

/* C ref: objnam.c cxname() */
function cxname(obj) {
    if (obj.otyp === O.CORPSE)
        ia_not_ported('corpse_xname()');
    return xname(obj);
}

/* C ref: do_wear.c armcat_to_wornmask() */
function armcat_to_wornmask(cat) {
    switch (cat) {
    case O.ARM_SUIT: return W_ARM;
    case O.ARM_SHIELD: return W_ARMS;
    case O.ARM_HELM: return W_ARMH;
    case O.ARM_GLOVES: return W_ARMG;
    case O.ARM_BOOTS: return W_ARMF;
    case O.ARM_CLOAK: return W_ARMC;
    case O.ARM_SHIRT: return W_ARMU;
    default: return 0;
    }
}

/* C ref: do_wear.c wearmask_to_obj() -- armor slots */
function wearmask_to_obj(wornmask) {
    switch (wornmask) {
    case W_ARM: return game.uarm || null;
    case W_ARMC: return game.uarmc || null;
    case W_ARMH: return game.uarmh || null;
    case W_ARMS: return game.uarms || null;
    case W_ARMG: return game.uarmg || null;
    case W_ARMF: return game.uarmf || null;
    case W_ARMU: return game.uarmu || null;
    default: return null;
    }
}

/* C ref: invent.c check_invent_gold() -- gold in a slot other than '$' */
function check_invent_gold(why) {
    void why;
    for (let o = game.invent; o; o = o.nobj)
        if (o.oclass === O.COIN_CLASS && o.invlet !== '$')
            ia_not_ported('check_invent_gold() with misplaced gold');
    return false;
}

// C ref: strutil.c pmatch() -- case-sensitive wildcard match
function pmatch(patrn, strng) {
    let pi = 0, si = 0;
    for (;;) { /* pmatch_top: */
        const s = strng[si++] || '';
        const p = patrn[pi++] || '';
        if (!p) /* end of pattern */
            return s === '';
        else if (p === '*') /* wildcard reached */
            return (pi >= patrn.length
                    || pmatch(patrn.slice(pi), strng.slice(si - 1)))
                ? true
                : s ? pmatch(patrn.slice(pi - 1), strng.slice(si)) : false;
        else if (p !== s && (p !== '?' || !s))
            return false;
    }
}

// C ref: pager.c checkfile() -- the chkfilIaCheck | chkfilDontAsk case:
// is there a data.base entry for 'inp'?  (The entry names come from
// data_base_keys.js; the entry text is not needed for this check.)
function checkfile_iacheck(inp) {
    let dbase_str = inp.toLowerCase();
    let ep, ap, alt = null;

    if (dbase_str.startsWith("interior of ")) dbase_str = dbase_str.slice(12);
    if (dbase_str.startsWith("a ")) dbase_str = dbase_str.slice(2);
    else if (dbase_str.startsWith("an ")) dbase_str = dbase_str.slice(3);
    else if (dbase_str.startsWith("the ")) dbase_str = dbase_str.slice(4);
    else if (dbase_str.startsWith("some ")) dbase_str = dbase_str.slice(5);
    else if (/^[0-9]/.test(dbase_str)) {
        /* remove count prefix */
        dbase_str = dbase_str.replace(/^[0-9]+/, '');
        if (dbase_str[0] === ' ') dbase_str = dbase_str.slice(1);
    }
    if (dbase_str.startsWith("pair of ")) dbase_str = dbase_str.slice(8);
    if (dbase_str.startsWith("tame ")) dbase_str = dbase_str.slice(5);
    else if (dbase_str.startsWith("peaceful ")) dbase_str = dbase_str.slice(9);
    if (dbase_str.startsWith("invisible ")) dbase_str = dbase_str.slice(10);
    if (dbase_str.startsWith("saddled ")) dbase_str = dbase_str.slice(8);
    if (dbase_str.startsWith("blessed ")) dbase_str = dbase_str.slice(8);
    else if (dbase_str.startsWith("uncursed ")) dbase_str = dbase_str.slice(9);
    else if (dbase_str.startsWith("cursed ")) dbase_str = dbase_str.slice(7);
    if (dbase_str.startsWith("empty ")) dbase_str = dbase_str.slice(6);
    if (dbase_str.startsWith("partly used ")) dbase_str = dbase_str.slice(12);
    else if (dbase_str.startsWith("partly eaten ")) dbase_str = dbase_str.slice(13);
    if (dbase_str.startsWith("statue of ")) dbase_str = dbase_str.slice(0, 6);
    else if (dbase_str.startsWith("figurine of ")) dbase_str = dbase_str.slice(0, 8);
    /* remove enchantment ("+0 aklys") */
    if (dbase_str && "+-".includes(dbase_str[0]) && /[0-9]/.test(dbase_str[1] || '')) {
        dbase_str = dbase_str.slice(1).replace(/^[0-9]+/, '');
        if (dbase_str[0] === ' ') dbase_str = dbase_str.slice(1);
    }
    if (dbase_str.startsWith("moist towel"))
        dbase_str = "wet" + dbase_str.slice(5); /* skip "mo" replace "ist" */
    if (!dbase_str)
        return false;

    /* adjust the input to remove "named " and "called " */
    if ((ep = dbase_str.indexOf(" named ")) >= 0) {
        alt = dbase_str.slice(ep + 7);
        if ((ap = dbase_str.indexOf(" called ")) >= 0 && ap < ep)
            ep = ap; /* "named" is alt but truncate at "called" */
    } else if ((ep = dbase_str.indexOf(" called ")) >= 0) {
        alt = dbase_str.slice(ep + 8);
    } else
        ep = dbase_str.indexOf(", ");
    if (ep > 0)
        dbase_str = dbase_str.slice(0, ep);
    if (alt && (alt.startsWith("a ") || alt.startsWith("an ")
                || alt.startsWith("the ")))
        alt = alt.slice(alt.indexOf(' ') + 1);
    /* remove charges or "(lit)" */
    if ((ep = dbase_str.indexOf(" (")) > 0)
        dbase_str = dbase_str.slice(0, ep);
    if (alt && (ap = alt.indexOf(" (")) > 0)
        alt = alt.slice(0, ap);
    /* named fruit: "fruit" is the alternate description */
    if (!alt && fruit_from_name(dbase_str, true, null))
        alt = obj_descr[O.SLIME_MOLD].oc_name;
    else if (!alt)
        alt = makesingular(dbase_str);

    for (let pass = (alt === dbase_str) ? 0 : 1; pass >= 0; --pass) {
        const target = pass ? alt : dbase_str;
        for (const entry of data_base_keys) {
            for (const key of entry) {
                const chk_skip = (key[0] === '~') ? 1 : 0;
                if (pmatch(key.slice(chk_skip), target)) {
                    if (chk_skip)
                        break; /* skipping_entry */
                    return true; /* found_in_file; ia_checking */
                }
            }
        }
    }
    return false;
}

// C ref: pager.c ia_checkfile()
function ia_checkfile(otmp) {
    /* singular() of xname() of otmp is what "/i" looks up */
    const save_quan = otmp.quan;
    let itemnam;
    otmp.quan = 1;
    try {
        /* using xname for corpses does not give the monster type */
        itemnam = (otmp.otyp === O.CORPSE) ? cxname(otmp) : xname(otmp);
    } finally {
        otmp.quan = save_quan;
    }
    return checkfile_iacheck(itemnam);
}

// C ref: iactions.c item_naming_classification()
/* construct text for the menu entries for IA_NAME_OBJ and IA_NAME_OTYP */
function item_naming_classification(obj, bufs) {
    const Name = "Name",
        Rename = "Rename or un-name",
        Call = "Call",
        Recall = "Re-call or un-call";

    bufs.oname = bufs.ocall = '';
    if (name_ok(obj) === GETOBJ_SUGGEST) {
        bufs.oname = `${(!has_oname(obj) || !ONAME(obj)) ? Name : Rename} ${
            the_unique_obj(obj) ? "the"
            : !is_plural(obj) ? "this specific"
              : "this stack of"} ${simpleonames(obj)}`;
    }
    if (call_ok(obj) === GETOBJ_SUGGEST) {
        let callname = simpleonames(obj);

        /* prefix known unique item with "the", make all other types plural */
        if (the_unique_obj(obj))
            callname = the(callname);
        else if (!is_plural(obj))
            callname = makeplural(callname);
        bufs.ocall = `${(!objects[obj.otyp].oc_uname
                         || !objects[obj.otyp].oc_uname.length) ? Call : Recall
        } the type for ${callname}`;
    }
    return (bufs.oname || bufs.ocall) ? true : false;
}

// C ref: iactions.c item_reading_classification()
/* construct text for the menu entries for IA_READ_OBJ */
function item_reading_classification(obj, out) {
    const otyp = obj.otyp;
    let res = IA_READ_OBJ;

    out.s = '';
    if (otyp === O.FORTUNE_COOKIE) {
        out.s = "Read the message inside this cookie";
    } else if (otyp === O.T_SHIRT) {
        out.s = "Read the slogan on the shirt";
    } else if (otyp === O.ALCHEMY_SMOCK) {
        out.s = "Read the slogan on the apron";
    } else if (otyp === O.HAWAIIAN_SHIRT) {
        out.s = "Look at the pattern on the shirt";
    } else if (obj.oclass === O.SCROLL_CLASS) {
        const magic = ((obj.dknown
                        && otyp !== O.SCR_MAIL
                        && (otyp !== O.SCR_BLANK_PAPER
                            || !objects[otyp].oc_name_known))
                       ? " to activate its magic" : "");

        out.s = `Read this scroll${magic}`;
    } else if (obj.oclass === O.SPBOOK_CLASS) {
        const novel = (otyp === O.SPE_NOVEL),
            blank = (otyp === O.SPE_BLANK_PAPER
                     && objects[otyp].oc_name_known),
            tome = (otyp === O.SPE_BOOK_OF_THE_DEAD
                    && objects[otyp].oc_name_known);

        out.s = `${(novel || blank) ? "Read" : tome ? "Examine" : "Study"} this ${
            novel ? simpleonames(obj) : tome ? "tome" : "spellbook"}`;
    } else {
        res = IA_NONE;
    }
    return res;
}

// C ref: iactions.c ia_addmenu()
function ia_addmenu(win, act, let_, txt) {
    const clr = NO_COLOR;

    /* any.a_int = act */
    tty_add_menu(win, null, act, let_, '', ATR_NONE, clr, txt,
                 MENU_ITEMFLAGS_NONE);
}

/* C ref: cmd.c cmdq_add_ec(CQ_CANNED, fn), cmdq_add_key(CQ_CANNED, key);
   the extended command is kept by its cmd.c function name */
function cmdq_add_ec(fn) {
    if (!game.cmdq) game.cmdq = [];
    game.cmdq.push({ typ: 'ec', fn });
}
function cmdq_add_key(key) {
    if (!game.cmdq) game.cmdq = [];
    game.cmdq.push({ typ: 'key', key });
}

// C ref: iactions.c itemactions_pushkeys()
/* set up a command to execute on a specific item next */
function itemactions_pushkeys(otmp, act) {
    switch (act) {
    default:
        /* impossible("Unknown item action %d", act) */
        break;
    case IA_NONE:
        break;
    case IA_UNWIELD:
        cmdq_add_ec((otmp === game.uwep) ? "dowield"
                    : (otmp === game.uswapwep) ? "remarm_swapwep"
                      : (otmp === game.uquiver) ? "dowieldquiver"
                        : "donull"); /* can't happen */
        cmdq_add_key(HANDS_SYM);
        break;
    case IA_APPLY_OBJ:
        cmdq_add_ec("doapply");
        cmdq_add_key(otmp.invlet);
        break;
    case IA_DIP_OBJ:
        cmdq_add_ec("dip_into");
        cmdq_add_key(otmp.invlet);
        break;
    case IA_NAME_OBJ:
    case IA_NAME_OTYP:
        cmdq_add_ec("docallcmd");
        cmdq_add_key((act === IA_NAME_OBJ) ? 'i' : 'o');
        cmdq_add_key(otmp.invlet);
        break;
    case IA_DROP_OBJ:
        cmdq_add_ec("dodrop");
        cmdq_add_key(otmp.invlet);
        break;
    case IA_EAT_OBJ:
        /* start with m-prefix */
        cmdq_add_ec("do_reqmenu");
        cmdq_add_ec("doeat");
        cmdq_add_key(otmp.invlet);
        break;
    case IA_ENGRAVE_OBJ:
        cmdq_add_ec("doengrave");
        cmdq_add_key(otmp.invlet);
        break;
    case IA_FIRE_OBJ:
        cmdq_add_ec("dofire");
        break;
    case IA_ADJUST_OBJ:
        cmdq_add_ec("doorganize"); /* #adjust */
        cmdq_add_key(otmp.invlet);
        break;
    case IA_ADJUST_STACK:
        cmdq_add_ec("adjust_split"); /* #altadjust */
        cmdq_add_key(otmp.invlet);
        break;
    case IA_SACRIFICE:
        cmdq_add_ec("dosacrifice");
        cmdq_add_key(otmp.invlet);
        break;
    case IA_BUY_OBJ:
        cmdq_add_ec("dopay");
        cmdq_add_key(otmp.invlet);
        break;
    case IA_QUAFF_OBJ:
        cmdq_add_ec("do_reqmenu");
        cmdq_add_ec("dodrink");
        cmdq_add_key(otmp.invlet);
        break;
    case IA_QUIVER_OBJ:
        cmdq_add_ec("dowieldquiver");
        cmdq_add_key(otmp.invlet);
        break;
    case IA_READ_OBJ:
        cmdq_add_ec("doread");
        cmdq_add_key(otmp.invlet);
        break;
    case IA_RUB_OBJ:
        cmdq_add_ec("dorub");
        cmdq_add_key(otmp.invlet);
        break;
    case IA_THROW_OBJ:
        cmdq_add_ec("dothrow");
        cmdq_add_key(otmp.invlet);
        break;
    case IA_TAKEOFF_OBJ:
        cmdq_add_ec("ia_dotakeoff"); /* #altdotakeoff */
        cmdq_add_key(otmp.invlet);
        break;
    case IA_TIP_CONTAINER:
        cmdq_add_ec("do_reqmenu");
        cmdq_add_ec("dotip");
        cmdq_add_key(otmp.invlet);
        break;
    case IA_INVOKE_OBJ:
        cmdq_add_ec("doinvoke");
        cmdq_add_key(otmp.invlet);
        break;
    case IA_WIELD_OBJ:
        cmdq_add_ec("dowield");
        cmdq_add_key(otmp.invlet);
        break;
    case IA_WEAR_OBJ:
        cmdq_add_ec("dowear");
        cmdq_add_key(otmp.invlet);
        break;
    case IA_SWAPWEAPON:
        cmdq_add_ec("doswapweapon");
        break;
    case IA_TWOWEAPON:
        cmdq_add_ec("dotwoweapon");
        break;
    case IA_ZAP_OBJ:
        cmdq_add_ec("dozap");
        cmdq_add_key(otmp.invlet);
        break;
    case IA_WHATIS_OBJ:
        cmdq_add_ec("dowhatis"); /* "/" command */
        cmdq_add_key('i');       /* "i" == item from inventory */
        cmdq_add_key(otmp.invlet);
        break;
    }
}

// C ref: iactions.c itemactions()
/* Show menu of possible actions hero could do with item otmp */
export async function itemactions(otmp) {
    let n, act = IA_NONE;
    let buf;
    const light = otmp.lamplit ? "Extinguish" : "Light";
    const already_worn = ((otmp.owornmask || 0) & (W_ARMOR | W_ACCESSORY)) !== 0;
    const uwep = game.uwep || null, uswapwep = game.uswapwep || null,
          uquiver = game.uquiver || null;

    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);

    /* -: unwield */
    if (otmp === uwep || otmp === uswapwep || otmp === uquiver) {
        const verb = (otmp === uquiver) ? "Quiver" : "Wield",
            action = (otmp === uquiver) ? "un-ready" : "un-wield",
            which = is_plural(otmp) ? "these" : "this",
            what = ((otmp.oclass === O.WEAPON_CLASS || is_weptool(otmp))
                    ? "weapon" : "item");
        buf = `${verb} '${HANDS_SYM}' to ${action} ${which} ${
            is_plural(otmp) ? makeplural(what) : what}`;
        ia_addmenu(win, IA_UNWIELD, '-', buf);
    }

    /* a: apply */
    if (otmp.oclass === O.COIN_CLASS)
        ia_addmenu(win, IA_APPLY_OBJ, 'a', "Flip a coin");
    else if (otmp.otyp === O.CREAM_PIE)
        ia_addmenu(win, IA_APPLY_OBJ, 'a',
                   "Hit yourself with this cream pie");
    else if (otmp.otyp === O.BULLWHIP)
        ia_addmenu(win, IA_APPLY_OBJ, 'a', "Lash out with this whip");
    else if (otmp.otyp === O.GRAPPLING_HOOK)
        ia_addmenu(win, IA_APPLY_OBJ, 'a',
                   "Grapple something with this hook");
    else if (otmp.otyp === O.BAG_OF_TRICKS && objects[otmp.otyp].oc_name_known)
        ia_addmenu(win, IA_APPLY_OBJ, 'a', "Reach into this bag");
    else if (Is_container(otmp))
        ia_addmenu(win, IA_APPLY_OBJ, 'a', "Open this container");
    else if (otmp.otyp === O.CAN_OF_GREASE)
        ia_addmenu(win, IA_APPLY_OBJ, 'a', "Use the can to grease an item");
    else if (otmp.otyp === O.LOCK_PICK
             || otmp.otyp === O.CREDIT_CARD
             || otmp.otyp === O.SKELETON_KEY)
        ia_addmenu(win, IA_APPLY_OBJ, 'a', "Use this tool to pick a lock");
    else if (otmp.otyp === O.TINNING_KIT)
        ia_addmenu(win, IA_APPLY_OBJ, 'a', "Use this kit to tin a corpse");
    else if (otmp.otyp === O.LEASH)
        ia_addmenu(win, IA_APPLY_OBJ, 'a', "Tie a pet to this leash");
    else if (otmp.otyp === O.SADDLE)
        ia_addmenu(win, IA_APPLY_OBJ, 'a', "Place this saddle on a pet");
    else if (otmp.otyp === O.MAGIC_WHISTLE
             || otmp.otyp === O.TIN_WHISTLE)
        ia_addmenu(win, IA_APPLY_OBJ, 'a', "Blow this whistle");
    else if (otmp.otyp === O.EUCALYPTUS_LEAF)
        ia_addmenu(win, IA_APPLY_OBJ, 'a', "Use this leaf as a whistle");
    else if (otmp.otyp === O.STETHOSCOPE)
        ia_addmenu(win, IA_APPLY_OBJ, 'a', "Listen through the stethoscope");
    else if (otmp.otyp === O.MIRROR)
        ia_addmenu(win, IA_APPLY_OBJ, 'a', "Show something its reflection");
    else if (otmp.otyp === O.BELL || otmp.otyp === O.BELL_OF_OPENING)
        ia_addmenu(win, IA_APPLY_OBJ, 'a', "Ring the bell");
    else if (otmp.otyp === O.CANDELABRUM_OF_INVOCATION) {
        buf = `${light} the candelabrum`;
        ia_addmenu(win, IA_APPLY_OBJ, 'a', buf);
    } else if (otmp.otyp === O.WAX_CANDLE || otmp.otyp === O.TALLOW_CANDLE) {
        const multiple = (otmp.quan === 1) ? false : true;
        const s = multiple ? "these" : "this";
        let o = null;
        for (let x = game.invent; x; x = x.nobj) /* carrying() */
            if (x.otyp === O.CANDELABRUM_OF_INVOCATION) { o = x; break; }

        if (o && o.spe < 7)
            buf = `Attach ${s} to your candelabrum, or ${
                !otmp.lamplit ? "light" : "extinguish"} ${multiple ? "them" : "it"}`;
        else
            buf = `${light} ${s} ${simpleonames(otmp)}`;
        ia_addmenu(win, IA_APPLY_OBJ, 'a', buf);
    } else if (otmp.otyp === O.OIL_LAMP || otmp.otyp === O.MAGIC_LAMP
               || otmp.otyp === O.BRASS_LANTERN) {
        buf = `${light} this light source`;
        ia_addmenu(win, IA_APPLY_OBJ, 'a', buf);
    } else if (otmp.otyp === O.POT_OIL && objects[otmp.otyp].oc_name_known) {
        buf = `${light} this oil`;
        ia_addmenu(win, IA_APPLY_OBJ, 'a', buf);
    } else if (otmp.oclass === O.POTION_CLASS) {
        buf = `Dip something into ${is_plural(otmp) ? "one of these" : "this"} potion${
            otmp.quan === 1 ? "" : "s"}`;
        ia_addmenu(win, IA_DIP_OBJ, 'a', buf);
    } else if (otmp.otyp === O.EXPENSIVE_CAMERA)
        ia_addmenu(win, IA_APPLY_OBJ, 'a', "Take a photograph");
    else if (otmp.otyp === O.TOWEL)
        ia_addmenu(win, IA_APPLY_OBJ, 'a',
                   "Clean yourself off with this towel");
    else if (otmp.otyp === O.CRYSTAL_BALL)
        ia_addmenu(win, IA_APPLY_OBJ, 'a', "Peer into this crystal ball");
    else if (otmp.otyp === O.MAGIC_MARKER)
        ia_addmenu(win, IA_APPLY_OBJ, 'a',
                   "Write on something with this marker");
    else if (otmp.otyp === O.FIGURINE)
        ia_addmenu(win, IA_APPLY_OBJ, 'a', "Make this figurine transform");
    else if (otmp.otyp === O.UNICORN_HORN)
        ia_addmenu(win, IA_APPLY_OBJ, 'a', "Use this unicorn horn");
    else if (otmp.otyp === O.HORN_OF_PLENTY
             && objects[otmp.otyp].oc_name_known)
        ia_addmenu(win, IA_APPLY_OBJ, 'a', "Blow into the horn of plenty");
    else if (otmp.otyp >= O.WOODEN_FLUTE && otmp.otyp <= O.DRUM_OF_EARTHQUAKE)
        ia_addmenu(win, IA_APPLY_OBJ, 'a', "Play this musical instrument");
    else if (otmp.otyp === O.LAND_MINE || otmp.otyp === O.BEARTRAP)
        ia_addmenu(win, IA_APPLY_OBJ, 'a', "Arm this trap");
    else if (otmp.otyp === O.PICK_AXE || otmp.otyp === O.DWARVISH_MATTOCK)
        ia_addmenu(win, IA_APPLY_OBJ, 'a', "Dig with this digging tool");
    else if (otmp.oclass === O.WAND_CLASS)
        ia_addmenu(win, IA_APPLY_OBJ, 'a', "Break this wand");

    /* 'c', 'C' - call an item or its type something */
    const nbufs = {};
    if (item_naming_classification(otmp, nbufs)) {
        if (nbufs.oname)
            ia_addmenu(win, IA_NAME_OBJ, 'c', nbufs.oname);
        if (nbufs.ocall)
            ia_addmenu(win, IA_NAME_OTYP, 'C', nbufs.ocall);
    }

    /* d: drop item, works on everything except worn items */
    if (!already_worn) {
        buf = `Drop this ${(otmp.quan > 1) ? "stack" : "item"}`;
        ia_addmenu(win, IA_DROP_OBJ, 'd', buf);
    }

    /* e: eat item */
    if (otmp.otyp === O.TIN) {
        buf = `Open ${(otmp.quan > 1) ? "one of these tins" : "this tin"}${
            (otmp.otyp === O.TIN && uwep && uwep.otyp === O.TIN_OPENER)
                ? " with your tin opener" : ""} and eat the contents`;
        ia_addmenu(win, IA_EAT_OBJ, 'e', buf);
    } else if (is_edible(otmp)) {
        buf = `Eat ${(otmp.quan > 1) ? "one of these" : "this"}`;
        ia_addmenu(win, IA_EAT_OBJ, 'e', buf);
    }

    /* E: engrave with item */
    if (otmp.otyp === O.TOWEL) {
        ia_addmenu(win, IA_ENGRAVE_OBJ, 'E',
                   "Wipe the floor with this towel");
    } else if (otmp.otyp === O.MAGIC_MARKER) {
        ia_addmenu(win, IA_ENGRAVE_OBJ, 'E',
                   "Scribble graffiti on the floor");
    } else if (otmp.oclass === O.WEAPON_CLASS || otmp.oclass === O.WAND_CLASS
               || otmp.oclass === O.GEM_CLASS || otmp.oclass === O.RING_CLASS) {
        buf = `${(is_blade(otmp) || otmp.oclass === O.WAND_CLASS
                  || ((otmp.oclass === O.GEM_CLASS || otmp.oclass === O.RING_CLASS)
                      && objects[otmp.otyp].oc_tough)) ? "Engrave" : "Write"
        } on the ${surface(game.u.ux, game.u.uy)} with ${
            (otmp.quan > 1) ? "one of these items" : "this item"}`;
        ia_addmenu(win, IA_ENGRAVE_OBJ, 'E', buf);
    }

    /* f: fire quivered ammo */
    if (otmp === uquiver) {
        const shoot = ammo_and_launcher(otmp, uwep);

        buf = `${shoot ? "Shoot" : "Throw"} ${(otmp.quan > 1) ? "one of these" : "this"}`;
        if (shoot)
            buf += ` with your wielded ${simpleonames(uwep)}`;
        ia_addmenu(win, IA_FIRE_OBJ, 'f', buf);
    }

    /* i: #adjust inventory letter */
    if (otmp.oclass !== O.COIN_CLASS || check_invent_gold("item-action"))
        ia_addmenu(win, IA_ADJUST_OBJ, 'i',
                   "Adjust inventory by assigning new letter");
    /* I: #adjust inventory item by splitting its stack  */
    if (otmp.quan > 1 && otmp.oclass !== O.COIN_CLASS)
        ia_addmenu(win, IA_ADJUST_STACK, 'I',
                   "Adjust inventory by splitting this stack");

    /* O: offer sacrifice */
    if (IS_ALTAR(game.level.at(game.u.ux, game.u.uy).typ) && !game.u.uswallow) {
        if (otmp.otyp === O.CORPSE)
            ia_addmenu(win, IA_SACRIFICE, 'O',
                       "Offer this corpse as a sacrifice at this altar");
        else if (otmp.otyp === O.AMULET_OF_YENDOR
                 || otmp.otyp === O.FAKE_AMULET_OF_YENDOR)
            ia_addmenu(win, IA_SACRIFICE, 'O',
                       "Offer this amulet as a sacrifice at this altar");
    }

    /* p: pay for unpaid utems */
    if (otmp.unpaid)
        ia_not_ported('shop_keeper()/inhishop() for unpaid items');

    /* P: put on accessory */
    if (!already_worn) {
        buf = '';
        if (otmp.oclass === O.AMULET_CLASS) {
            buf = !game.uamul ? "Put this amulet on"
                              : "[already wearing an amulet]";
        } else if (otmp.oclass === O.RING_CLASS || otmp.otyp === O.MEAT_RING) {
            if (!game.uleft || !game.uright)
                buf = "Put this ring on";
            else
                ia_not_ported('body_part(FINGER)');
        } else if (otmp.otyp === O.BLINDFOLD || otmp.otyp === O.TOWEL
                   || otmp.otyp === O.LENSES) {
            if (game.ublindf)
                buf = "[already wearing eyewear]";
            else if (otmp.otyp === O.LENSES)
                buf = "Put these lenses on";
            else
                buf = `Put this on${(otmp.otyp === O.TOWEL) ? " to blindfold yourself" : ""}`;
        }
        if (buf)
            ia_addmenu(win, IA_WEAR_OBJ, 'P', buf);
    }

    /* q: drink item */
    if (otmp.oclass === O.POTION_CLASS) {
        buf = `Quaff (drink) ${(otmp.quan > 1) ? "one of these potions" : "this potion"}`;
        ia_addmenu(win, IA_QUAFF_OBJ, 'q', buf);
    }

    /* Q: quiver throwable item */
    if ((otmp.oclass === O.GEM_CLASS || otmp.oclass === O.WEAPON_CLASS)
        && otmp !== uquiver) {
        buf = `Quiver this ${(otmp.quan > 1) ? "stack" : "item"} for easy ${
            ammo_and_launcher(otmp, uwep) ? "shooting" : "throwing"} with 'f'ire`;
        ia_addmenu(win, IA_QUIVER_OBJ, 'Q', buf);
    }

    /* r: read item */
    const rbuf = {};
    if (item_reading_classification(otmp, rbuf) === IA_READ_OBJ)
        ia_addmenu(win, IA_READ_OBJ, 'r', rbuf.s);

    /* R: remove accessory or rub item */
    if ((otmp.owornmask || 0) & W_ACCESSORY) {
        buf = `Remove this ${(otmp.owornmask & W_AMUL) ? "amulet"
            : (otmp.owornmask & W_RING) ? "ring"
              : (otmp.owornmask & W_TOOL) ? "eyewear"
                : "accessory"}`;
        ia_addmenu(win, IA_TAKEOFF_OBJ, 'R', buf);
    }
    if (otmp.otyp === O.OIL_LAMP || otmp.otyp === O.MAGIC_LAMP
        || otmp.otyp === O.BRASS_LANTERN) {
        buf = `Rub this ${simpleonames(otmp)}`;
        ia_addmenu(win, IA_RUB_OBJ, 'R', buf);
    } else if (otmp.oclass === O.GEM_CLASS && is_graystone(otmp))
        ia_addmenu(win, IA_RUB_OBJ, 'R', "Rub something on this stone");

    /* t: throw item */
    if (!already_worn) {
        const shoot = ammo_and_launcher(otmp, uwep);

        buf = `${shoot ? "Shoot" : "Throw"} ${(otmp.quan === 1) ? "this item"
            : (otmp.otyp === O.GOLD_PIECE) ? "them"
              : "one of these"}${
            (otmp === uquiver && (otmp.otyp !== O.GOLD_PIECE || otmp.quan === 1))
                ? " (same as 'f')" : ""}`;
        ia_addmenu(win, IA_THROW_OBJ, 't', buf);
    }

    /* T: take off armor, tip carried container */
    if ((otmp.owornmask || 0) & W_ARMOR)
        ia_addmenu(win, IA_TAKEOFF_OBJ, 'T', "Take off this armor");
    if ((Is_container(otmp) && (Has_contents(otmp) || !otmp.cknown))
        || (otmp.otyp === O.HORN_OF_PLENTY && (otmp.spe > 0 || !otmp.known)))
        ia_addmenu(win, IA_TIP_CONTAINER, 'T',
                   "Tip all the contents out of this container");

    /* V: invoke */
    if ((otmp.otyp === O.FAKE_AMULET_OF_YENDOR && !otmp.known)
        || otmp.oartifact || objects[otmp.otyp].oc_unique
        || otmp.otyp === O.CRYSTAL_BALL)
        ia_addmenu(win, IA_INVOKE_OBJ, 'V',
                   "Try to invoke a unique power of this object");

    /* w: wield, hold in hands */
    if (otmp === uwep || cantwield(hero_data())) {
        ; /* either already wielded or can't wield anything; skip 'w' */
    } else if (otmp.oclass === O.WEAPON_CLASS || is_weptool(otmp)
               || is_wet_towel(otmp) || otmp.otyp === O.HEAVY_IRON_BALL) {
        buf = `Wield this ${(otmp.quan > 1) ? "stack" : "item"} as your weapon`;
        ia_addmenu(win, IA_WIELD_OBJ, 'w', buf);
    } else if (otmp.otyp === O.TIN_OPENER) {
        ia_addmenu(win, IA_WIELD_OBJ, 'w',
                   "Wield the tin opener to easily open tins");
    } else if (!already_worn) {
        buf = `Wield this ${(otmp.quan > 1) ? "stack" : "item"} in your ${
            makeplural(body_part_hand())}`;
        ia_addmenu(win, IA_WIELD_OBJ, 'w', buf);
    }

    /* W: wear armor */
    if (!already_worn) {
        if (otmp.oclass === O.ARMOR_CLASS) {
            const Wmask = armcat_to_wornmask(objects[otmp.otyp].oc_armcat);
            const o = wearmask_to_obj(Wmask);

            if (!o)
                buf = "Wear this armor";
            else
                ia_not_ported('armor_simple_name()');

            ia_addmenu(win, IA_WEAR_OBJ, 'W', buf);
        }
    }

    /* x: Swap main and readied weapon */
    if (otmp === uwep && uswapwep)
        ia_addmenu(win, IA_SWAPWEAPON, 'x',
                   "Swap this with your alternate weapon");
    else if (otmp === uwep)
        ia_addmenu(win, IA_SWAPWEAPON, 'x',
                   "Ready this as an alternate weapon");
    else if (otmp === uswapwep)
        ia_addmenu(win, IA_SWAPWEAPON, 'x',
                   "Swap this with your main weapon");

    /* based on TWOWEAPOK() in wield.c */
    const MAYBETWOWEAPON = (obj) =>
        (((obj.oclass === O.WEAPON_CLASS)
          ? !(is_launcher(obj) || is_ammo(obj) || is_missile(obj))
          : is_weptool(obj))
         && !bimanual(obj));

    /* X: Toggle two-weapon mode on or off */
    if ((otmp === uwep || otmp === uswapwep)
        && (game.u.twoweap
            || (could_twoweap(hero_data()) && !game.uarms
                && uwep && MAYBETWOWEAPON(uwep)
                && uswapwep && MAYBETWOWEAPON(uswapwep)))) {
        buf = `Toggle two-weapon combat ${game.u.twoweap ? "off" : "on"}`;
        ia_addmenu(win, IA_TWOWEAPON, 'X', buf);
    }

    /* z: Zap wand */
    if (otmp.oclass === O.WAND_CLASS)
        ia_addmenu(win, IA_ZAP_OBJ, 'z',
                   "Zap this wand to release its magic");

    /* ?: Look up an item in the game's database */
    if (ia_checkfile(otmp)) {
        buf = `Look up information about ${(otmp.quan > 1) ? "these" : "this"}`;
        ia_addmenu(win, IA_WHATIS_OBJ, '/', buf);
    }

    buf = `Do what with ${the(cxname(otmp))}?`;
    tty_end_menu(win, buf);

    const res = await tty_select_menu(win, PICK_ONE);
    n = res.n;

    if (n > 0) {
        act = res.selected[0].item;
        itemactions_pushkeys(otmp, act);
    }
    tty_destroy_nhwindow(win);

    /* finish the 'i' command:  no time elapses and cancelling without
       selecting an action doesn't matter */
    return ECMD_OK;
}
