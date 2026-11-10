/* NetHack 5.0	iactions.c	$NHDT-Date: 1762680996 2025/11/09 01:36:36 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.543 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Pasi Kallinen, 2026. */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from './c-runtime.js';



    export const IA_NONE = 0;
    export const IA_UNWIELD = 1; /* hack for 'w-' */
    export const IA_APPLY_OBJ = 2; /* 'a' */
    export const IA_DIP_OBJ = 3; /* 'a' on a potion == dip */
    export const IA_NAME_OBJ = 4; /* 'c' name individual item */
    export const IA_NAME_OTYP = 5; /* 'C' name item's type */
    export const IA_DROP_OBJ = 6; /* 'd' */
    export const IA_EAT_OBJ = 7; /* 'e' */
    export const IA_ENGRAVE_OBJ = 8; /* 'E' */
    export const IA_FIRE_OBJ = 9; /* 'f' */
    export const IA_ADJUST_OBJ = 10; /* 'i' #adjust inventory letter */
    export const IA_ADJUST_STACK = 11; /* 'I' #adjust with count to split stack */
    export const IA_SACRIFICE = 12; /* 'O' offer sacrifice */
    export const IA_BUY_OBJ = 13; /* 'p' pay shopkeeper */
    export const IA_QUAFF_OBJ = 14;
    export const IA_QUIVER_OBJ = 15;
    export const IA_READ_OBJ = 16;
    export const IA_RUB_OBJ = 17;
    export const IA_THROW_OBJ = 18;
    export const IA_TAKEOFF_OBJ = 19;
    export const IA_TIP_CONTAINER = 20;
    export const IA_INVOKE_OBJ = 21;
    export const IA_WIELD_OBJ = 22;
    export const IA_WEAR_OBJ = 23;
    export const IA_SWAPWEAPON = 24;
    export const IA_TWOWEAPON = 25;
    export const IA_ZAP_OBJ = 26;
    export const IA_WHATIS_OBJ = 27; /* '/' specify inventory object */


/* construct text for the menu entries for IA_NAME_OBJ and IA_NAME_OTYP */
export function item_naming_classification(obj, onamebuf, ocallbuf)
{
    const Name = "Name",
        Rename = "Rename or un-name",
        Call = "Call",
        /* "re-call" seems a bit weird, but "recall" and
           "rename" don't fit for changing a type name */
        Recall = "Re-call or un-call";

    C.HEAPU8[onamebuf] = C.HEAPU8[ocallbuf] = '\0'.charCodeAt(0);
    if (C.name_ok(obj) == C.GETOBJ_SUGGEST) {
        C.Sprintf(onamebuf, "%s %s %s",
                (!C.has_oname(obj) || !C.HEAP8[C.ONAME(obj)]) ? Name : Rename,
                C.the_unique_obj(obj) ? "the"
                : !C.is_plural(obj) ? "this specific"
                  : "this stack of", /*"these",*/
                C.simpleonames(obj));
    }
    if (C.call_ok(obj) == C.GETOBJ_SUGGEST) {
        let callname = C.simpleonames(obj);

        /* prefix known unique item with "the", make all other types plural */
        if (C.the_unique_obj(obj)) /* treats unID'd fake amulets as if real */
            callname = C.the(callname);
        else if (!C.is_plural(obj))
            callname = C.makeplural(callname);
        C.Sprintf(ocallbuf, "%s the type for %s",
                (!C.objects[obj.otyp].oc_uname
                 || !C.HEAP8[C.objects[obj.otyp].oc_uname]) ? Call : Recall,
                callname);
    }
    return (C.HEAP8[onamebuf] || C.HEAP8[ocallbuf]) ? 1 : 0;
}

/* construct text for the menu entries for IA_READ_OBJ */
export function item_reading_classification(obj, outbuf)
{
    let otyp = obj.otyp, res = IA_READ_OBJ;

    C.HEAPU8[outbuf] = '\0'.charCodeAt(0);
    if (otyp == C.FORTUNE_COOKIE) {
        C.Strcpy(outbuf, "Read the message inside this cookie");
    } else if (otyp == C.T_SHIRT) {
        C.Strcpy(outbuf, "Read the slogan on the shirt");
    } else if (otyp == C.ALCHEMY_SMOCK) {
        C.Strcpy(outbuf, "Read the slogan on the apron");
    } else if (otyp == C.HAWAIIAN_SHIRT) {
        C.Strcpy(outbuf, "Look at the pattern on the shirt");
    } else if (obj.oclass == C.SCROLL_CLASS) {
        let magic = ((obj.dknown
// #ifdef MAIL_STRUCTURES
                              && otyp != C.SCR_MAIL
// #endif
                              && (otyp != C.SCR_BLANK_PAPER
                                  || !C.objects[otyp].oc_name_known))
                             ? " to activate its magic" : "");

        C.Sprintf(outbuf, "Read this scroll%s", magic);
    } else if (obj.oclass == C.SPBOOK_CLASS) {
        let novel = (otyp == C.SPE_NOVEL),
                blank = (otyp == C.SPE_BLANK_PAPER
                         && C.objects[otyp].oc_name_known),
                tome = (otyp == C.SPE_BOOK_OF_THE_DEAD
                        && C.objects[otyp].oc_name_known);

        C.Sprintf(outbuf, "%s this %s",
                (novel || blank) ? "Read" : tome ? "Examine" : "Study",
                novel ? C.simpleonames(obj) /* "novel" or "paperback book" */
                      : tome ? "tome" : "spellbook");
    } else {
        res = IA_NONE;
    }
    return res;
}

export function ia_addmenu(win, act, let_, txt)
{
    let any;
    let clr = C.NO_COLOR;

    any = C.anythingLocalCopy(C.cg.zeroany);
    any.a_int = act;
    C.add_menu(win, C.nul_glyphinfo, any, let_, 0,
             C.ATR_NONE, clr, txt, C.MENU_ITEMFLAGS_NONE);
}

/* set up a command to execute on a specific item next */
export function itemactions_pushkeys(otmp, act)
{
    switch (act) {
    default:
        C.impossible("Unknown item action %d", act);
        break;
    case IA_NONE:
        break;
    case IA_UNWIELD:
        C.cmdq_add_ec(C.CQ_CANNED, (otmp.address == (C.uwep?.address ?? 0)) ? C.dowield
                    : (otmp.address == (C.uswapwep?.address ?? 0)) ? C.remarm_swapwep
                      : (otmp.address == (C.uquiver?.address ?? 0)) ? C.dowieldquiver
                        : C.donull); /* can't happen */
        C.cmdq_add_key(C.CQ_CANNED, C.HANDS_SYM);
        break;
    case IA_APPLY_OBJ:
        C.cmdq_add_ec(C.CQ_CANNED, C.doapply);
        C.cmdq_add_key(C.CQ_CANNED, otmp.invlet);
        break;
    case IA_DIP_OBJ:
        /* #altdip instead of normal #dip - takes potion to dip into
           first (the inventory item instigating this) and item to
           be dipped second, also ignores floor features such as
           fountain/sink so we don't need to force m-prefix here */
        C.cmdq_add_ec(C.CQ_CANNED, C.dip_into);
        C.cmdq_add_key(C.CQ_CANNED, otmp.invlet);
        break;
    case IA_NAME_OBJ:
    case IA_NAME_OTYP:
        C.cmdq_add_ec(C.CQ_CANNED, C.docallcmd);
        C.cmdq_add_key(C.CQ_CANNED, (act == IA_NAME_OBJ) ? 'i'.charCodeAt(0) : 'o'.charCodeAt(0));
        C.cmdq_add_key(C.CQ_CANNED, otmp.invlet);
        break;
    case IA_DROP_OBJ:
        C.cmdq_add_ec(C.CQ_CANNED, C.dodrop);
        C.cmdq_add_key(C.CQ_CANNED, otmp.invlet);
        break;
    case IA_EAT_OBJ:
        /* start with m-prefix; for #eat, it means ignore floor food
           if present and eat food from invent */
        C.cmdq_add_ec(C.CQ_CANNED, C.do_reqmenu);
        C.cmdq_add_ec(C.CQ_CANNED, C.doeat);
        C.cmdq_add_key(C.CQ_CANNED, otmp.invlet);
        break;
    case IA_ENGRAVE_OBJ:
        C.cmdq_add_ec(C.CQ_CANNED, C.doengrave);
        C.cmdq_add_key(C.CQ_CANNED, otmp.invlet);
        break;
    case IA_FIRE_OBJ:
        C.cmdq_add_ec(C.CQ_CANNED, C.dofire);
        break;
    case IA_ADJUST_OBJ:
        C.cmdq_add_ec(C.CQ_CANNED, C.doorganize); /* #adjust */
        C.cmdq_add_key(C.CQ_CANNED, otmp.invlet);
        break;
    case IA_ADJUST_STACK:
        C.cmdq_add_ec(C.CQ_CANNED, C.adjust_split); /* #altadjust */
        C.cmdq_add_key(C.CQ_CANNED, otmp.invlet);
        break;
    case IA_SACRIFICE:
        C.cmdq_add_ec(C.CQ_CANNED, C.dosacrifice);
        C.cmdq_add_key(C.CQ_CANNED, otmp.invlet);
        break;
    case IA_BUY_OBJ:
        C.cmdq_add_ec(C.CQ_CANNED, C.dopay);
        C.cmdq_add_key(C.CQ_CANNED, otmp.invlet);
        break;
    case IA_QUAFF_OBJ:
        /* start with m-prefix; for #quaff, it means ignore fountain
           or sink if present and drink a potion from invent */
        C.cmdq_add_ec(C.CQ_CANNED, C.do_reqmenu);
        C.cmdq_add_ec(C.CQ_CANNED, C.dodrink);
        C.cmdq_add_key(C.CQ_CANNED, otmp.invlet);
        break;
    case IA_QUIVER_OBJ:
        C.cmdq_add_ec(C.CQ_CANNED, C.dowieldquiver);
        C.cmdq_add_key(C.CQ_CANNED, otmp.invlet);
        break;
    case IA_READ_OBJ:
        C.cmdq_add_ec(C.CQ_CANNED, C.doread);
        C.cmdq_add_key(C.CQ_CANNED, otmp.invlet);
        break;
    case IA_RUB_OBJ:
        C.cmdq_add_ec(C.CQ_CANNED, C.dorub);
        C.cmdq_add_key(C.CQ_CANNED, otmp.invlet);
        break;
    case IA_THROW_OBJ:
        C.cmdq_add_ec(C.CQ_CANNED, C.dothrow);
        C.cmdq_add_key(C.CQ_CANNED, otmp.invlet);
        break;
    case IA_TAKEOFF_OBJ:
        C.cmdq_add_ec(C.CQ_CANNED, C.ia_dotakeoff); /* #altdotakeoff */
        C.cmdq_add_key(C.CQ_CANNED, otmp.invlet);
        break;
    case IA_TIP_CONTAINER:
        /* start with m-prefix to skip floor containers;
           for menustyle:Traditional when more than one floor container
           is present, player will get a #tip menu and have to pick
           the "tip something being carried" choice, then this item
           will be already chosen from inventory; suboptimal but
           possibly an acceptable tradeoff since combining item actions
           with use of traditional ggetobj() is an unlikely scenario */
        C.cmdq_add_ec(C.CQ_CANNED, C.do_reqmenu);
        C.cmdq_add_ec(C.CQ_CANNED, C.dotip);
        C.cmdq_add_key(C.CQ_CANNED, otmp.invlet);
        break;
    case IA_INVOKE_OBJ:
        C.cmdq_add_ec(C.CQ_CANNED, C.doinvoke);
        C.cmdq_add_key(C.CQ_CANNED, otmp.invlet);
        break;
    case IA_WIELD_OBJ:
        C.cmdq_add_ec(C.CQ_CANNED, C.dowield);
        C.cmdq_add_key(C.CQ_CANNED, otmp.invlet);
        break;
    case IA_WEAR_OBJ:
        C.cmdq_add_ec(C.CQ_CANNED, C.dowear);
        C.cmdq_add_key(C.CQ_CANNED, otmp.invlet);
        break;
    case IA_SWAPWEAPON:
        C.cmdq_add_ec(C.CQ_CANNED, C.doswapweapon);
        break;
    case IA_TWOWEAPON:
        C.cmdq_add_ec(C.CQ_CANNED, C.dotwoweapon);
        break;
    case IA_ZAP_OBJ:
        C.cmdq_add_ec(C.CQ_CANNED, C.dozap);
        C.cmdq_add_key(C.CQ_CANNED, otmp.invlet);
        break;
    case IA_WHATIS_OBJ:
        C.cmdq_add_ec(C.CQ_CANNED, C.dowhatis); /* "/" command */
        C.cmdq_add_key(C.CQ_CANNED, 'i'.charCodeAt(0));     /* "i" == item from inventory */
        C.cmdq_add_key(C.CQ_CANNED, otmp.invlet);
        break;
    }
}

/* Show menu of possible actions hero could do with item otmp */
export function itemactions(otmp)
{
    let n, act = IA_NONE;
    let win;
    let buf = C.stackAlloc(C.BUFSZ), buf2 = C.stackAlloc(C.BUFSZ);
    let selected = C.pointerLocal();
    let mtmp;
    let light = otmp.lamplit ? "Extinguish" : "Light";
    let already_worn = (otmp.owornmask & (C.W_ARMOR | C.W_ACCESSORY)) != 0;

    win = C.create_nhwindow(C.NHW_MENU);
    C.start_menu(win, C.MENU_BEHAVE_STANDARD);

    /* -: unwield; picking current weapon offers an opportunity for 'w-'
       to wield bare/gloved hands; likewise for 'Q-' with quivered item(s) */
    if (otmp.address == (C.uwep?.address ?? 0) || otmp.address == (C.uswapwep?.address ?? 0) || otmp.address == (C.uquiver?.address ?? 0)) {
        let verb = (otmp.address == (C.uquiver?.address ?? 0)) ? "Quiver" : "Wield",
                   action = (otmp.address == (C.uquiver?.address ?? 0)) ? "un-ready" : "un-wield",
                   which = C.is_plural(otmp) ? "these" : "this",
                   what = ((otmp.oclass == C.WEAPON_CLASS || C.is_weptool(otmp))
                            ? "weapon" : "item");
        /*
         * TODO: if uwep is ammo, tell player that to shoot instead of toss,
         *       the corresponding launcher must be wielded;
         */
        C.Sprintf(buf,  "%s '%c' to %s %s %s",
                verb, C.HANDS_SYM, action, which,
                C.is_plural(otmp) ? C.makeplural(what) : what);
        ia_addmenu(win, IA_UNWIELD, '-'.charCodeAt(0), buf);
    }

    /* a: apply */
    if (otmp.oclass == C.COIN_CLASS)
        ia_addmenu(win, IA_APPLY_OBJ, 'a'.charCodeAt(0), "Flip a coin");
    else if (otmp.otyp == C.CREAM_PIE)
        ia_addmenu(win, IA_APPLY_OBJ, 'a'.charCodeAt(0),
                   "Hit yourself with this cream pie");
    else if (otmp.otyp == C.BULLWHIP)
        ia_addmenu(win, IA_APPLY_OBJ, 'a'.charCodeAt(0), "Lash out with this whip");
    else if (otmp.otyp == C.GRAPPLING_HOOK)
        ia_addmenu(win, IA_APPLY_OBJ, 'a'.charCodeAt(0),
                   "Grapple something with this hook");
    else if (otmp.otyp == C.BAG_OF_TRICKS && C.objects[otmp.otyp].oc_name_known)
        /* bag of tricks skips this unless discovered */
        ia_addmenu(win, IA_APPLY_OBJ, 'a'.charCodeAt(0), "Reach into this bag");
    else if (C.Is_container(otmp))
        /* bag of tricks gets here only if not yet discovered */
        ia_addmenu(win, IA_APPLY_OBJ, 'a'.charCodeAt(0), "Open this container");
    else if (otmp.otyp == C.CAN_OF_GREASE)
        ia_addmenu(win, IA_APPLY_OBJ, 'a'.charCodeAt(0), "Use the can to grease an item");
    else if (otmp.otyp == C.LOCK_PICK
             || otmp.otyp == C.CREDIT_CARD
             || otmp.otyp == C.SKELETON_KEY)
        ia_addmenu(win, IA_APPLY_OBJ, 'a'.charCodeAt(0), "Use this tool to pick a lock");
    else if (otmp.otyp == C.TINNING_KIT)
        ia_addmenu(win, IA_APPLY_OBJ, 'a'.charCodeAt(0), "Use this kit to tin a corpse");
    else if (otmp.otyp == C.LEASH)
        ia_addmenu(win, IA_APPLY_OBJ, 'a'.charCodeAt(0), "Tie a pet to this leash");
    else if (otmp.otyp == C.SADDLE)
        ia_addmenu(win, IA_APPLY_OBJ, 'a'.charCodeAt(0), "Place this saddle on a pet");
    else if (otmp.otyp == C.MAGIC_WHISTLE
             || otmp.otyp == C.TIN_WHISTLE)
        ia_addmenu(win, IA_APPLY_OBJ, 'a'.charCodeAt(0), "Blow this whistle");
    else if (otmp.otyp == C.EUCALYPTUS_LEAF)
        ia_addmenu(win, IA_APPLY_OBJ, 'a'.charCodeAt(0), "Use this leaf as a whistle");
    else if (otmp.otyp == C.STETHOSCOPE)
        ia_addmenu(win, IA_APPLY_OBJ, 'a'.charCodeAt(0), "Listen through the stethoscope");
    else if (otmp.otyp == C.MIRROR)
        ia_addmenu(win, IA_APPLY_OBJ, 'a'.charCodeAt(0), "Show something its reflection");
    else if (otmp.otyp == C.BELL || otmp.otyp == C.BELL_OF_OPENING)
        ia_addmenu(win, IA_APPLY_OBJ, 'a'.charCodeAt(0), "Ring the bell");
    else if (otmp.otyp == C.CANDELABRUM_OF_INVOCATION) {
        C.Sprintf(buf, "%s the candelabrum", light);
        ia_addmenu(win, IA_APPLY_OBJ, 'a'.charCodeAt(0), buf);
    } else if (otmp.otyp == C.WAX_CANDLE || otmp.otyp == C.TALLOW_CANDLE) {
        let multiple = (otmp.quan == 1n) ? 0 : 1;
        let s = multiple ? "these" : "this";
        let o = C.carrying(C.CANDELABRUM_OF_INVOCATION);

        if (o && o.spe < 7)
            C.Sprintf(buf, "Attach %s to your candelabrum, or %s %s", s,
                    !otmp.lamplit ? "light" : "extinguish", /* [lowercase] */
                    multiple ? "them" : "it");
        else
            C.Sprintf(buf, "%s %s %s", light, s, C.simpleonames(otmp));
        ia_addmenu(win, IA_APPLY_OBJ, 'a'.charCodeAt(0), buf);
    } else if (otmp.otyp == C.OIL_LAMP || otmp.otyp == C.MAGIC_LAMP
               || otmp.otyp == C.BRASS_LANTERN) {
        C.Sprintf(buf, "%s this light source", light);
        ia_addmenu(win, IA_APPLY_OBJ, 'a'.charCodeAt(0), buf);
    } else if (otmp.otyp == C.POT_OIL && C.objects[otmp.otyp].oc_name_known) {
        C.Sprintf(buf, "%s this oil", light);
        ia_addmenu(win, IA_APPLY_OBJ, 'a'.charCodeAt(0), buf);
    } else if (otmp.oclass == C.POTION_CLASS) {
        /* FIXME? this should probably be moved to 'D' rather than be 'a' */
        C.Sprintf(buf, "Dip something into %s potion%s",
                C.is_plural(otmp) ? "one of these" : "this", C.plur(otmp.quan));
        ia_addmenu(win, IA_DIP_OBJ, 'a'.charCodeAt(0), buf);
    } else if (otmp.otyp == C.EXPENSIVE_CAMERA)
        ia_addmenu(win, IA_APPLY_OBJ, 'a'.charCodeAt(0), "Take a photograph");
    else if (otmp.otyp == C.TOWEL)
        ia_addmenu(win, IA_APPLY_OBJ, 'a'.charCodeAt(0),
                   "Clean yourself off with this towel");
    else if (otmp.otyp == C.CRYSTAL_BALL)
        ia_addmenu(win, IA_APPLY_OBJ, 'a'.charCodeAt(0), "Peer into this crystal ball");
    else if (otmp.otyp == C.MAGIC_MARKER)
        ia_addmenu(win, IA_APPLY_OBJ, 'a'.charCodeAt(0),
                   "Write on something with this marker");
    else if (otmp.otyp == C.FIGURINE)
        ia_addmenu(win, IA_APPLY_OBJ, 'a'.charCodeAt(0), "Make this figurine transform");
    else if (otmp.otyp == C.UNICORN_HORN)
        ia_addmenu(win, IA_APPLY_OBJ, 'a'.charCodeAt(0), "Use this unicorn horn");
    else if (otmp.otyp == C.HORN_OF_PLENTY
             && C.objects[otmp.otyp].oc_name_known)
        ia_addmenu(win, IA_APPLY_OBJ, 'a'.charCodeAt(0), "Blow into the horn of plenty");
    else if (otmp.otyp >= C.WOODEN_FLUTE && otmp.otyp <= C.DRUM_OF_EARTHQUAKE)
        ia_addmenu(win, IA_APPLY_OBJ, 'a'.charCodeAt(0), "Play this musical instrument");
    else if (otmp.otyp == C.LAND_MINE || otmp.otyp == C.BEARTRAP)
        ia_addmenu(win, IA_APPLY_OBJ, 'a'.charCodeAt(0), "Arm this trap");
    else if (otmp.otyp == C.PICK_AXE || otmp.otyp == C.DWARVISH_MATTOCK)
        ia_addmenu(win, IA_APPLY_OBJ, 'a'.charCodeAt(0), "Dig with this digging tool");
    else if (otmp.oclass == C.WAND_CLASS)
        ia_addmenu(win, IA_APPLY_OBJ, 'a'.charCodeAt(0), "Break this wand");

    /* 'c', 'C' - call an item or its type something */
    if (item_naming_classification(otmp, buf, buf2)) {
        if (C.HEAP8[buf])
            ia_addmenu(win, IA_NAME_OBJ, 'c'.charCodeAt(0), buf);
        if (C.HEAP8[buf2])
            ia_addmenu(win, IA_NAME_OTYP, 'C'.charCodeAt(0), buf2);
    }

    /* d: drop item, works on everything except worn items; those will
       always have a takeoff/remove choice so we don't have to worry
       about the menu maybe being empty when 'd' is suppressed */
    if (!already_worn) {
        C.Sprintf(buf, "Drop this %s", (otmp.quan > 1n) ? "stack" : "item");
        ia_addmenu(win, IA_DROP_OBJ, 'd'.charCodeAt(0), buf);
    }

    /* e: eat item */
    if (otmp.otyp == C.TIN) {
        C.Sprintf(buf, "Open %s%s and eat the contents",
                (otmp.quan > 1n) ? "one of these tins" : "this tin",
                (otmp.otyp == C.TIN && C.uwep && C.uwep.otyp == C.TIN_OPENER)
                ? " with your tin opener" : "");
        ia_addmenu(win, IA_EAT_OBJ, 'e'.charCodeAt(0), buf);
    } else if (C.is_edible(otmp)) {
        C.Sprintf(buf, "Eat %s", (otmp.quan > 1n) ? "one of these" : "this");
        ia_addmenu(win, IA_EAT_OBJ, 'e'.charCodeAt(0), buf);
    }

    /* E: engrave with item */
    if (otmp.otyp == C.TOWEL) {
        ia_addmenu(win, IA_ENGRAVE_OBJ, 'E'.charCodeAt(0),
                   "Wipe the floor with this towel");
    } else if (otmp.otyp == C.MAGIC_MARKER) {
        ia_addmenu(win, IA_ENGRAVE_OBJ, 'E'.charCodeAt(0),
                   "Scribble graffiti on the floor");
    } else if (otmp.oclass == C.WEAPON_CLASS || otmp.oclass == C.WAND_CLASS
             || otmp.oclass == C.GEM_CLASS || otmp.oclass == C.RING_CLASS) {
        C.Sprintf(buf, "%s on the %s with %s",
                (C.is_blade(otmp) || otmp.oclass == C.WAND_CLASS
                 || ((otmp.oclass == C.GEM_CLASS || otmp.oclass == C.RING_CLASS)
                     && C.objects[otmp.otyp].oc_tough)) ? "Engrave" : "Write",
                C.surface(C.u.ux, C.u.uy),
                (otmp.quan > 1n) ? "one of these items" : "this item");
        ia_addmenu(win, IA_ENGRAVE_OBJ, 'E'.charCodeAt(0), buf);
    }

    /* f: fire quivered ammo */
    if (otmp.address == (C.uquiver?.address ?? 0)) {
        let shoot = C.ammo_and_launcher(otmp, C.uwep);

        /* FIXME: see the multi-shot FIXME about "one of" for 't: throw' */
        C.Sprintf(buf, "%s %s", shoot ? "Shoot" : "Throw",
                (otmp.quan > 1n) ? "one of these" : "this");
        if (shoot) {
            C.assert(!!C.uwep);
            C.Sprintf(C.eos(buf), " with your wielded %s", C.simpleonames(C.uwep));
        }
        ia_addmenu(win, IA_FIRE_OBJ, 'f'.charCodeAt(0), buf);
    }

    /* i: #adjust inventory letter; gold can't be adjusted unless there
       is some in a slot other than '$' (which shouldn't be possible) */
    if (otmp.oclass != C.COIN_CLASS || C.check_invent_gold("item-action"))
        ia_addmenu(win, IA_ADJUST_OBJ, 'i'.charCodeAt(0),
                   "Adjust inventory by assigning new letter");
    /* I: #adjust inventory item by splitting its stack  */
    if (otmp.quan > 1n && otmp.oclass != C.COIN_CLASS)
        ia_addmenu(win, IA_ADJUST_STACK, 'I'.charCodeAt(0),
                   "Adjust inventory by splitting this stack");

    /* O: offer sacrifice */
    if (C.IS_ALTAR(C.levl[C.u.ux][C.u.uy].typ) && !C.u.uswallow) {
        /* FIXME: this doesn't match #offer's likely candidates, which don't
           include corpses on Astral and don't include amulets off Astral */
        if (otmp.otyp == C.CORPSE)
            ia_addmenu(win, IA_SACRIFICE, 'O'.charCodeAt(0),
                       "Offer this corpse as a sacrifice at this altar");
        else if (otmp.otyp == C.AMULET_OF_YENDOR
                 || otmp.otyp == C.FAKE_AMULET_OF_YENDOR)
            ia_addmenu(win, IA_SACRIFICE, 'O'.charCodeAt(0),
                       "Offer this amulet as a sacrifice at this altar");
    }

    /* p: pay for unpaid utems */
    if (otmp.unpaid
        /* FIXME: should also handle player owned container (so not
           flagged 'unpaid') holding shop owned items */
        && (mtmp = C.shop_keeper(C.loadChar(C.in_rooms(C.u.ux, C.u.uy, C.SHOPBASE)))) != 0
        && C.inhishop(mtmp)) {
        C.Sprintf(buf, "Buy this unpaid %s",
                (otmp.quan > 1n) ? "stack" : "item");
        ia_addmenu(win, IA_BUY_OBJ, 'p'.charCodeAt(0), buf);
    }

    /* P: put on accessory */
    if (!already_worn) {
        /* if 'otmp' is worn, we'll skip 'P' and show 'R' below;
           if not worn, we show 'P - Put on this <simple-item>' if
           the slot is available, or 'P - <unavailable>'; for the latter,
           'P' will fail but we don't want to omit the choice because
           item actions can be used to learn commands */
        C.HEAPU8[buf] = '\0'.charCodeAt(0);
        if (otmp.oclass == C.AMULET_CLASS) {
            C.Strcpy(buf, !C.uamul ? "Put this amulet on"
                               : "[already wearing an amulet]");
        } else if (otmp.oclass == C.RING_CLASS || otmp.otyp == C.MEAT_RING) {
            if (!C.uleft || !C.uright)
                C.Strcpy(buf, "Put this ring on");
            else
                C.Sprintf(buf, "[both ring %s in use]",
                        C.makeplural(C.body_part(C.FINGER)));
        } else if (otmp.otyp == C.BLINDFOLD || otmp.otyp == C.TOWEL
                   || otmp.otyp == C.LENSES) {
            if (C.ublindf)
                C.Strcpy(buf, "[already wearing eyewear]");
            else if (otmp.otyp == C.LENSES)
                C.Strcpy(buf, "Put these lenses on");
            else
                C.Sprintf(buf, "Put this on%s",
                        (otmp.otyp == C.TOWEL) ? " to blindfold yourself" : "");
        }
        if (C.HEAP8[buf])
            ia_addmenu(win, IA_WEAR_OBJ, 'P'.charCodeAt(0), buf);
    }

    /* q: drink item */
    if (otmp.oclass == C.POTION_CLASS) {
        C.Sprintf(buf, "Quaff (drink) %s",
                (otmp.quan > 1n) ? "one of these potions" : "this potion");
        ia_addmenu(win, IA_QUAFF_OBJ, 'q'.charCodeAt(0), buf);
    }

    /* Q: quiver throwable item */
    if ((otmp.oclass == C.GEM_CLASS || otmp.oclass == C.WEAPON_CLASS)
        && otmp.address != (C.uquiver?.address ?? 0)) {
        C.Sprintf(buf, "Quiver this %s for easy %s with \'f\'ire",
                (otmp.quan > 1n) ? "stack" : "item",
                C.ammo_and_launcher(otmp, C.uwep) ? "shooting" : "throwing");
        ia_addmenu(win, IA_QUIVER_OBJ, 'Q'.charCodeAt(0), buf);
    }

    /* r: read item */
    if (item_reading_classification(otmp, buf) == IA_READ_OBJ)
        ia_addmenu(win, IA_READ_OBJ, 'r'.charCodeAt(0), buf);

    /* R: remove accessory or rub item */
    if (otmp.owornmask & C.W_ACCESSORY) {
        C.Sprintf(buf, "Remove this %s",
                (otmp.owornmask & C.W_AMUL) ? "amulet"
                : (otmp.owornmask & C.W_RING) ? "ring"
                  : (otmp.owornmask & C.W_TOOL) ? "eyewear"
                    : "accessory"); /* catchall -- can't happen */
        ia_addmenu(win, IA_TAKEOFF_OBJ, 'R'.charCodeAt(0), buf);
    }
    if (otmp.otyp == C.OIL_LAMP || otmp.otyp == C.MAGIC_LAMP
        || otmp.otyp == C.BRASS_LANTERN) {
        C.Sprintf(buf, "Rub this %s", C.simpleonames(otmp));
        ia_addmenu(win, IA_RUB_OBJ, 'R'.charCodeAt(0), buf);
    } else if (otmp.oclass == C.GEM_CLASS && C.is_graystone(otmp))
        ia_addmenu(win, IA_RUB_OBJ, 'R'.charCodeAt(0), "Rub something on this stone");

    /* t: throw item */
    if (!already_worn) {
        let shoot = C.ammo_and_launcher(otmp, C.uwep);

        /*
         * FIXME:
         *  'one of these' should be changed to 'some of these' when there
         *  is the possibility of a multi-shot volley but we don't have
         *  any way to determine that except by actually calculating the
         *  volley count and that could randomly yield 1 here and 2..N
         *  while throwing or vice versa.
         */
        C.Sprintf(buf, "%s %s%s", shoot ? "Shoot" : "Throw",
                (otmp.quan == 1n) ? "this item"
                : (otmp.otyp == C.GOLD_PIECE) ? "them"
                  : "one of these",
                /* if otmp is quivered, we've already listed
                   'f - shoot|throw this item' as a choice;
                   if 't' is duplicating that, say so ('t' and 'f'
                   behavior differs for throwing a stack of gold) */
                (otmp.address == (C.uquiver?.address ?? 0) && (otmp.otyp != C.GOLD_PIECE
                                     || otmp.quan == 1n))
                ? " (same as 'f')" : "");
        ia_addmenu(win, IA_THROW_OBJ, 't'.charCodeAt(0), buf);
    }

    /* T: take off armor, tip carried container */
    if (otmp.owornmask & C.W_ARMOR)
        ia_addmenu(win, IA_TAKEOFF_OBJ, 'T'.charCodeAt(0), "Take off this armor");
    if ((C.Is_container(otmp) && (C.Has_contents(otmp) || !otmp.cknown))
        || (otmp.otyp == C.HORN_OF_PLENTY && (otmp.spe > 0 || !otmp.known)))
        ia_addmenu(win, IA_TIP_CONTAINER, 'T'.charCodeAt(0),
                   "Tip all the contents out of this container");

    /* V: invoke */
    if ((otmp.otyp == C.FAKE_AMULET_OF_YENDOR && !otmp.known)
        || otmp.oartifact || C.objects[otmp.otyp].oc_unique
        /* non-artifact crystal balls don't have any unique power but
           the #invoke command lists them as likely candidates */
        || otmp.otyp == C.CRYSTAL_BALL)
        ia_addmenu(win, IA_INVOKE_OBJ, 'V'.charCodeAt(0),
                   "Try to invoke a unique power of this object");

    /* w: wield, hold in hands, works on everything but with different
       advice text; not mentioned for things that are already wielded */
    if (otmp.address == (C.uwep?.address ?? 0) || C.cantwield(C.gy.youmonst.data)) {
        ; /* either already wielded or can't wield anything; skip 'w' */
    } else if (otmp.oclass == C.WEAPON_CLASS || C.is_weptool(otmp)
               || C.is_wet_towel(otmp) || otmp.otyp == C.HEAVY_IRON_BALL) {
        C.Sprintf(buf, "Wield this %s as your weapon",
                (otmp.quan > 1n) ? "stack" : "item");
        ia_addmenu(win, IA_WIELD_OBJ, 'w'.charCodeAt(0), buf);
    } else if (otmp.otyp == C.TIN_OPENER) {
        ia_addmenu(win, IA_WIELD_OBJ, 'w'.charCodeAt(0),
                   "Wield the tin opener to easily open tins");
    } else if (!already_worn) {
        /* originally this was using "hold this item in your hands" but
           there's no concept of "holding an item", plus it unwields
           whatever item you already have wielded so use "wield this item" */
        C.Sprintf(buf, "Wield this %s in your %s",
                (otmp.quan > 1n) ? "stack" : "item",
                /* only two-handed weapons and unicorn horns care about
                   pluralizing "hand" and they won't reach here, but plural
                   sounds better when poly'd into something with "claw" */
                C.makeplural(C.body_part(C.HAND)));
        ia_addmenu(win, IA_WIELD_OBJ, 'w'.charCodeAt(0), buf);
    }

    /* W: wear armor */
    if (!already_worn) {
        if (otmp.oclass == C.ARMOR_CLASS) {
            /* if 'otmp' is worn we skip 'W' (and show 'T' above instead);
               if it isn't, we either show "W - wear this" if otmp's slot
               isn't populated, or "W - [already wearing <simple-armor>]";
               for the latter, picking 'W' will fail but we don't want to
               omit 'W' in this situation */
            let Wmask = C.armcat_to_wornmask(C.objects[otmp.otyp].oc_armcat);
            let o = C.wearmask_to_obj(Wmask);

            if (!o)
                C.Strcpy(buf, "Wear this armor");
            else
                C.Sprintf(buf, "[already wearing %s]", C.an(C.armor_simple_name(o)));

            ia_addmenu(win, IA_WEAR_OBJ, 'W'.charCodeAt(0), buf);
        }
    }

    /* x: Swap main and readied weapon */
    if (otmp.address == (C.uwep?.address ?? 0) && C.uswapwep)
        ia_addmenu(win, IA_SWAPWEAPON, 'x'.charCodeAt(0),
                   "Swap this with your alternate weapon");
    else if (otmp.address == (C.uwep?.address ?? 0))
        ia_addmenu(win, IA_SWAPWEAPON, 'x'.charCodeAt(0),
                   "Ready this as an alternate weapon");
    else if (otmp.address == (C.uswapwep?.address ?? 0))
        ia_addmenu(win, IA_SWAPWEAPON, 'x'.charCodeAt(0),
                   "Swap this with your main weapon");

    /* this is based on TWOWEAPOK() in wield.c; we don't call can_two_weapon()
       because it is very verbose; attempting to two-weapon might be rejected
       but we screen out most reasons for rejection before offering it as a
       choice */
// MAYBETWOWEAPON expands inline at its original uses below.

    /* X: Toggle two-weapon mode on or off */
    if ((otmp.address == (C.uwep?.address ?? 0) || otmp.address == (C.uswapwep?.address ?? 0))
        /* if already two-weaponing, no special checks needed to toggle off */
        && (C.u.twoweap
        /* but if not, try to filter most "you can't do that" here */
            || (C.could_twoweap(C.gy.youmonst.data) && !C.uarms
                && C.uwep && (((C.uwep.oclass == C.WEAPON_CLASS) ? !(C.is_launcher(C.uwep) || C.is_ammo(C.uwep) || C.is_missile(C.uwep)) : C.is_weptool(C.uwep)) && !C.bimanual(C.uwep))
                && C.uswapwep && (((C.uswapwep.oclass == C.WEAPON_CLASS) ? !(C.is_launcher(C.uswapwep) || C.is_ammo(C.uswapwep) || C.is_missile(C.uswapwep)) : C.is_weptool(C.uswapwep)) && !C.bimanual(C.uswapwep))))) {
        C.Sprintf(buf, "Toggle two-weapon combat %s", C.u.twoweap ? "off" : "on");
        ia_addmenu(win, IA_TWOWEAPON, 'X'.charCodeAt(0), buf);
    }

// #undef MAYBETWOWEAPON

    /* z: Zap wand */
    if (otmp.oclass == C.WAND_CLASS)
        ia_addmenu(win, IA_ZAP_OBJ, 'z'.charCodeAt(0),
                   "Zap this wand to release its magic");

    /* ?: Look up an item in the game's database */
    if (C.ia_checkfile(otmp)) {
        C.Sprintf(buf, "Look up information about %s",
                (otmp.quan > 1n) ? "these" : "this");
        ia_addmenu(win, IA_WHATIS_OBJ, '/'.charCodeAt(0), buf);
    }

    C.Sprintf(buf, "Do what with %s?", C.the(C.cxname(otmp)));
    C.end_menu(win, buf);

    n = C.select_menu(win, C.PICK_ONE, selected);

    if (n > 0) {
        act = C.menuItems(selected.value)[0].item.a_int;
        C.free(selected.value);

        itemactions_pushkeys(otmp, act);
    }
    C.destroy_nhwindow(win);

    /* finish the 'i' command:  no time elapses and cancelling without
       selecting an action doesn't matter */
    return C.ECMD_OK;
}

/*iactions.c*/
