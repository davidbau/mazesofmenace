/* NetHack 5.0	do_name.c	$NHDT-Date: 1737013431 2025/01/15 23:43:51 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.326 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Pasi Kallinen, 2018. */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from './c-runtime.js';


export const NUMMBUF = 5;

/* manage a pool of BUFSZ buffers, so callers don't have to */
export function nextmbuf()
{
    // Original five native static buffers are C.bufs.
    // Original static C.bufidx is Module-local C.bufidx.

    C.bufidx = (C.bufidx + 1) % NUMMBUF;
    return C.bufs[C.bufidx];
}

/* allocate space for a monster's name; removes old name if there is one */
export function new_mgivenname(mon, lth) /* desired length (caller handles adding 1 for terminator) */
{
    lth = C.int(lth);
    if (lth) {
        /* allocate mextra if necessary; otherwise get rid of old name */
        if (!mon.mextra)
            mon.mextra = C.newmextra();
        else
            free_mgivenname(mon); /* has mextra, might also have name */
        mon.mextra.mgivenname = C.alloc(C.uint(lth));
    } else {
        /* zero length: the new name is empty; get rid of the old name */
        if (C.has_mgivenname(mon))
            free_mgivenname(mon);
    }
}

/* release a monster's name; retains mextra even if all fields are now null */
export function free_mgivenname(mon)
{
    if (C.has_mgivenname(mon)) {
        C.free(mon.mextra.mgivenname);
        mon.mextra.mgivenname = 0;
    }
}

/* allocate space for an object's name; removes old name if there is one */
export function new_oname(obj, lth) /* desired length (caller handles adding 1 for terminator) */
{
    lth = C.int(lth);
    if (lth) {
        /* allocate oextra if necessary; otherwise get rid of old name */
        if (!obj.oextra)
            obj.oextra = C.newoextra();
        else
            free_oname(obj); /* already has oextra, might also have name */
        obj.oextra.oname = C.alloc(C.uint(lth));
    } else {
        /* zero length: the new name is empty; get rid of the old name */
        if (C.has_oname(obj))
            free_oname(obj);
    }
}

/* release an object's name; retains oextra even if all fields are now null */
export function free_oname(obj)
{
    if (C.has_oname(obj)) {
        C.free(obj.oextra.oname);
        obj.oextra.oname = 0;
    }
}

/*  safe_oname() always returns a valid pointer to
 *  a string, either the pointer to an object's name
 *  if it has one, or a pointer to an empty string
 *  if it doesn't.
 */
export function safe_oname(obj)
{
    if (C.has_oname(obj))
        return obj.oextra.oname;
    return "";
}

/* get a name for a monster or an object from player;
   truncate if longer than PL_PSIZ, then return it */
export function name_from_player(outbuf, prompt, defres) /* output buffer, assumed to be at least BUFSZ long;
                         * anything longer than PL_PSIZ will be truncated */ /* only used if EDIT_GETLIN is enabled; only useful
                         * if windowport xxx's xxx_getlin() supports that */
{
    outbuf = C.charPointer(outbuf);prompt = C.charPointer(prompt);defres = C.charPointer(defres);
    C.storeChar(outbuf + (0), 0);
// #ifdef EDIT_GETLIN
//     if (defres && *defres)
//         C.Strcpy(outbuf, defres); /* default response from getlin() */
// #else
    // C.nhUse(defres); (inactive macro)
// #endif
    C.getlin(prompt, outbuf);
    if (!C.loadChar(outbuf) || C.loadChar(outbuf) == 27)
        return 0;

    /* strip leading and trailing spaces, condense internal sequences */
    C.mungspaces(outbuf);
    if (C.strlen(outbuf) >= C.PL_PSIZ)
        C.storeChar(outbuf + (C.PL_PSIZ - 1), 0);
    return outbuf;
}

/* historical note: this returns a monster pointer because it used to
   allocate a new bigger block of memory to hold the monster and its name */
export function christen_monst(mtmp, name)
{
    name = C.charPointer(name);
    let lth;
    const buf = C.stackAlloc(C.PL_PSIZ);

    /* dogname & catname are PL_PSIZ arrays; object names have same limit */
    lth = (name && C.loadChar(name)) ? (C.int(C.strlen(name)) + 1) : 0;
    if (lth > C.PL_PSIZ) {
        lth = C.PL_PSIZ;
        name = C.strncpy(buf, name, C.PL_PSIZ - 1);
        C.storeChar(buf + (C.PL_PSIZ - 1), 0);
    }
    new_mgivenname(mtmp, lth); /* removes old name if one is present */
    if (lth)
        C.Strcpy(mtmp.mextra.mgivenname, name);
    /* if 'mtmp' is leashed, persistent inventory window needs updating */
    if (mtmp.mleashed)
        C.update_inventory(); /* x - leash (attached to Fido) */
    return mtmp;
}

/* check whether user-supplied name matches or nearly matches an unnameable
   monster's name, or is an attempt to delete the monster's name; if so, give
   alternate reject message for do_mgivenname() */
export function alreadynamed(mtmp, monnambuf, usrbuf)
{
    monnambuf = C.charPointer(monnambuf);usrbuf = C.charPointer(usrbuf);
    const pronounbuf = C.stackAlloc(10); let p;

    if (!C.loadChar(usrbuf)) { /* attempt to erase existing name */
        let name_not_title = (C.has_mgivenname(mtmp)
                                  || C.type_is_pname(mtmp.data)
                                  || mtmp.isshk);
        C.pline("%s would rather keep %s existing %s.", C.upstart(monnambuf),
              C.is_rider(mtmp.data) ? "its" : C.mhis(mtmp),
              name_not_title ? "name" : "title");
        return 1;
    } else if (C.fuzzymatch(usrbuf, monnambuf, " -_", 1)
               /* catch trying to name "the Oracle" as "Oracle" */
               || (!C.strncmpi(monnambuf, "the ", 4)
                   && C.fuzzymatch(usrbuf, monnambuf + 4, " -_", 1))
               /* catch trying to name "invisible Orcus" as "Orcus" */
               || ((p = C.strstri(monnambuf, "invisible ")) != 0
                   && C.fuzzymatch(usrbuf, p + 10, " -_", 1))
               /* catch trying to name "the priest of Crom" as "Crom" */
               || ((p = C.strstri(monnambuf, " of ")) != 0
                   && C.fuzzymatch(usrbuf, p + 4, " -_", 1))) {
        if (C.is_rider(mtmp.data)) {
            /* avoid gendered pronoun for riders */
            C.pline("%s is already called that.", C.upstart(monnambuf));
        } else {
            C.pline("%s is already called %s.",
                  C.upstart(C.strcpy(pronounbuf, C.mhe(mtmp))), monnambuf);
        }
        return 1;
    } else if (C.samePtr(mtmp.data, C.mons[C.PM_JUIBLEX])
               && C.strstri(monnambuf, "Juiblex")
               && !C.strcmpi(usrbuf, "Jubilex")) {
        C.pline("%s doesn't like being called %s.", C.upstart(monnambuf), usrbuf);
        return 1;
    }
    return 0;
}

/* allow player to assign a name to some chosen monster */
export function do_mgivenname()
{
    const buf = C.stackAlloc(C.BUFSZ), monnambuf = C.stackAlloc(C.BUFSZ), qbuf = C.stackAlloc(C.QBUFSZ);
    const cc = C.coordLocal();
    let cx, cy;
    let mtmp = 0;
    let do_swallow = 0;

    if (C.Hallucination) {
        C.You("would never recognize it anyway.");
        return;
    }
    cc.x = C.u.ux;
    cc.y = C.u.uy;
    if (C.getpos(cc, 0, "the monster you want to name") < 0
        || !C.isok(cc.x, cc.y))
        return;
    cx = cc.x, cy = cc.y;

    if (C.u_at(cx, cy)) {
        if (C.u.usteed && C.canspotmon(C.u.usteed)) {
            mtmp = C.u.usteed;
        } else {
            C.pline("This %s creature is called %s and cannot be renamed.",
                  C.beautiful(), C.svp.plname);
            return;
        }
    } else
        mtmp = C.m_at(cx, cy);

    /* Allow you to name the monster that has swallowed you */
    if (!mtmp && C.u.uswallow) {
        let glyph = C.glyph_at(cx, cy);

        if (C.glyph_is_swallow(glyph)) {
            mtmp = C.u.ustuck;
            do_swallow = 1;
        }
    }

    if (!do_swallow && (!mtmp
        || (!C.sensemon(mtmp)
            && (!(C.cansee(cx, cy) || C.see_with_infrared(mtmp))
                || mtmp.mundetected || C.M_AP_TYPE(mtmp) == C.M_AP_FURNITURE
                || C.M_AP_TYPE(mtmp) == C.M_AP_OBJECT
                || (mtmp.minvis && !C.See_invisible))))) {

        C.pline("I see no monster there.");
        return;
    }
    /* special case similar to the one in lookat() */
    C.Sprintf(qbuf, "What do you want to call %s?",
            distant_monnam(mtmp, C.ARTICLE_THE, monnambuf));
    /* use getlin() to get a name string from the player */
    if (!name_from_player(buf, qbuf,
                          C.has_mgivenname(mtmp) ? mtmp.mextra.mgivenname : 0))
        return;

    /* Unique monsters have their own specific names or titles.
     * Shopkeepers, temple priests and other minions use alternate
     * name formatting routines which ignore any user-supplied name.
     *
     * Don't say a new name is being rejected if it happens to match
     * the existing name, or if the player is trying to remove the
     * monster's existing name without assigning a new one.
     */
    if ((mtmp.data.geno & C.G_UNIQ) && !mtmp.ispriest) {
        if (!C.callLocal(alreadynamed, mtmp, monnambuf, buf))
            C.pline("%s doesn't like being called names!", C.upstart(monnambuf));
    } else if (mtmp.isshk
               && !(C.Deaf || C.helpless(mtmp)
                    || mtmp.data.msound <= C.MS_ANIMAL)) {
        if (!C.callLocal(alreadynamed, mtmp, monnambuf, buf)) {
            // SetVoice(mtmp, 0, 80, 0); (inactive sound macro: no argument evaluation)
            C.verbalize("I'm %s, not %s.", C.shkname(mtmp), buf);
        }
    } else if (mtmp.ispriest || mtmp.isminion || mtmp.isshk
               || C.samePtr(mtmp.data, C.mons[C.PM_GHOST]) || C.has_ebones(mtmp)) {
        if (!C.callLocal(alreadynamed, mtmp, monnambuf, buf))
            C.pline("%s will not accept the name %s.", C.upstart(monnambuf), buf);
    } else {
        C.callLocal(christen_monst, mtmp, buf);
    }
}

/*
 * This routine used to change the address of 'obj' so be unsafe if not
 * used with extreme care.  Applying a name to an object no longer
 * allocates a replacement object, so that old risk is gone.
 */
export function do_oname(obj)
{
    let bufp; const buf = C.stackAlloc(C.BUFSZ), bufcpy = C.stackAlloc(C.BUFSZ), qbuf = C.stackAlloc(C.QBUFSZ);
    let aname;
    const objtyp = C.shortLocal(C.STRANGE_OBJECT);

    /* Do this now because there's no point in even asking for a name */
    if (obj.otyp == C.SPE_NOVEL) {
        C.pline("%s already has a published name.", C.Ysimple_name2(obj));
        return;
    }

    C.Sprintf(qbuf, "What do you want to name %s ",
            C.is_plural(obj) ? "these" : "this");
    C.safe_qbuf(qbuf, qbuf, "?", obj, C.xname, C.simpleonames, "item");
    /* use getlin() to get a name string from the player */
    if (!name_from_player(buf, qbuf, safe_oname(obj)))
        return;

    /*
     * We don't violate illiteracy conduct here, although it is
     * arguable that we should for anything other than "X".  Doing so
     * would make attaching player's notes to hero's inventory have an
     * in-game effect, which may or may not be the correct thing to do.
     *
     * We do violate illiteracy in oname() if player creates Sting or
     * Orcrist, clearly being literate (no pun intended...).
     */

    if (obj.oartifact) {
        /* this used to give "The artifact seems to resist the attempt."
           but resisting is definite, no "seems to" about it */
        C.pline("%s resists the attempt.",
              /* any artifact should always pass the has_oname() test
                 but be careful just in case */
              C.has_oname(obj) ? obj.oextra.oname : "The artifact");
        return;
    }

    /* relax restrictions over proper capitalization for artifacts */
    if ((aname = C.artifact_name(buf, objtyp, 1)) != 0
        && (C.restrict_name(obj, aname) || C.exist_artifact(obj.otyp, aname))) {
        /* substitute canonical spelling before slippage */
        C.Strcpy(buf, aname);
        /* this used to change one letter, substituting a value
           of 'a' through 'y' (due to an off by one error, 'z'
           would never be selected) and then force that to
           upper case if such was the case of the input;
           now, the hand slip scuffs one or two letters as if
           the text had been trodden upon, sometimes picking
           punctuation instead of an arbitrary letter;
           unfortunately, we have to cover the possibility of
           it targeting spaces so failing to make any change
           (we know that it must eventually target a nonspace
           because buf[] matches a valid artifact name) */
        C.Strcpy(bufcpy, buf);
        /* for "the Foo of Bar", only scuff "Foo of Bar" part */
        bufp = !C.strncmpi(buf, "the ", 4) ? (buf + 4) : buf;
        do {
            C.wipeout_text(bufp, C.rnd_on_display_rng(2), 0);
        } while (!C.strcmp(buf, bufcpy));
        C.pline("While engraving, your %s slips.", C.body_part(C.HAND));
        C.display_nhwindow(C.WIN_MESSAGE, 0);
        C.You("engrave: \"%s\".", buf);
        /* violate illiteracy conduct since hero attempted to write
           a valid artifact name */
        C.u.uconduct.literate++;
    } else if (obj.otyp == objtyp.value) {
        /* artifact_name() always returns non-Null when it sets objtyp */
        C.assert(aname != 0);

        /* artifact_name() found a match and restrict_name() didn't reject
           it; since 'obj' is the right type, naming will change it into an
           artifact so use canonical capitalization (Sting or Orcrist) */
        C.Strcpy(buf, aname);
    }

    obj = C.callLocal(oname, obj, buf, C.ONAME_VIA_NAMING | C.ONAME_KNOW_ARTI);
    // C.nhUse(obj); (inactive macro)
}

export function oname(obj, name, oflgs) /* item to assign name to */ /* name to assign */   /* flags, mostly for artifact creation */
{
    name = C.charPointer(name);oflgs = C.uint(oflgs);
    let lth;
    const buf = C.stackAlloc(C.PL_PSIZ);
    let via_naming = (oflgs & C.ONAME_VIA_NAMING) != 0,
            skip_inv_update = (oflgs & C.ONAME_SKIP_INVUPD) != 0;

    lth = C.loadChar(name) ? C.int(C.strlen(name) + 1n) : 0;
    if (lth > C.PL_PSIZ) {
        lth = C.PL_PSIZ;
        name = C.strncpy(buf, name, C.PL_PSIZ - 1);
        C.storeChar(buf + (C.PL_PSIZ - 1), 0);
    }
    /* If named artifact exists in the game, do not create another.
       Also trying to create an artifact shouldn't de-artifact
       it (e.g. Excalibur from prayer). In this case the object
       will retain its current name. */
    if (obj.oartifact || (lth && C.exist_artifact(obj.otyp, name)))
        return obj;

    new_oname(obj, lth); /* removes old name if one is present */
    if (lth)
        C.Strcpy(obj.oextra.oname, name);

    if (lth)
        C.artifact_exists(obj, name, 1, oflgs);
    if (obj.oartifact) {
        /* can't dual-wield with artifact as secondary weapon */
        if (C.samePtr(obj, C.uswapwep))
            C.untwoweapon();
        /* activate warning if you've just named your weapon "Sting" */
        if (C.samePtr(obj, C.uwep))
            C.set_artifact_intrinsic(obj, 1, C.W_WEP);
        /* if obj is owned by a shop, increase your bill */
        if (obj.unpaid)
            C.alter_cost(obj, 0n);
        if (via_naming) {
            /* violate illiteracy conduct since successfully wrote arti-name */
            if (!C.u.uconduct.literate++)
                C.livelog_printf(C.LL_CONDUCT | C.LL_ARTIFACT,
                               "became literate by naming %s",
                               C.bare_artifactname(obj));
            else
                C.livelog_printf(C.LL_ARTIFACT,
                               "chose %s to be named \"%s\"",
                               C.ansimpleoname(obj), C.bare_artifactname(obj));
        }
    }
    if (C.carried(obj) && !skip_inv_update)
        C.update_inventory();
    return obj;
}

export function objtyp_is_callable(i)
{
    i = C.int(i);
    if (C.objects[i].oc_uname)
        return 1;

    switch(C.objects[i].oc_class) {
    case C.AMULET_CLASS:
        /* 5.0: calling these used to be allowed but that enabled the
           player to tell whether two unID'd amulets of yendor were both
           fake or one was real by calling them distinct names and then
           checking discoveries to see whether first name was replaced
           by second or both names stuck; with more than two available
           to work with, if they weren't all fake it was possible to
           determine which one was the real one */
        if (i == C.AMULET_OF_YENDOR || i == C.FAKE_AMULET_OF_YENDOR)
            break; /* return FALSE */
        
        /*FALLTHRU*/
    case C.SCROLL_CLASS:
    case C.POTION_CLASS:
    case C.WAND_CLASS:
    case C.RING_CLASS:
    case C.GEM_CLASS:
    case C.SPBOOK_CLASS:
    case C.ARMOR_CLASS:
    case C.TOOL_CLASS:
    case C.VENOM_CLASS:
        if (C.OBJ_DESCR(C.objects[i]))
            return 1;
        break;
    default:
        break;
    }
    return 0;
}

/* getobj callback for object to name (specific item) - anything but gold */
export function name_ok(obj)
{
    if (!obj || obj.oclass == C.COIN_CLASS)
        return C.GETOBJ_EXCLUDE;

    if (!obj.dknown || obj.oartifact || obj.otyp == C.SPE_NOVEL)
        return C.GETOBJ_DOWNPLAY;

    return C.GETOBJ_SUGGEST;
}

/* getobj callback for object to call (name its type) */
export function call_ok(obj)
{
    if (!obj || !objtyp_is_callable(obj.otyp))
        return C.GETOBJ_EXCLUDE;

    /* not a likely candidate if not seen yet since naming will fail,
       or if it has been discovered and doesn't already have a name;
       when something has been named and then becomes discovered, it
       remains a likely candidate until player renames it to <space>
       to remove that no longer needed name */
    if (!obj.dknown || (C.objects[obj.otyp].oc_name_known
                         && !C.objects[obj.otyp].oc_uname))
        return C.GETOBJ_DOWNPLAY;

    return C.GETOBJ_SUGGEST;
}

/* #call / #name command - player can name monster or object or type of obj */
export function docallcmd()
{
    let obj;
    let win;
    const any = C.anyLocal();
    const pick_list = C.menuPointerLocal(0);
    let cq, cmdq;
    let ch = 0;
    /* if player wants a,b,c instead of i,o when looting, do that here too */
    let abc = C.flags.lootabc;
    let clr = C.NO_COLOR;

    // Original forward docallcmd label follows this block.
    docallcmd: {
    if ((cmdq = C.cmdq_pop()) != 0) {
        cq = C.commandLocalCopy(cmdq);
        C.free(cmdq);
        if (cq.typ == C.CMDQ_KEY)
            ch = cq.key;
        else
            C.cmdq_clear(C.CQ_CANNED);
        break docallcmd;
    }
    win = C.create_nhwindow(C.NHW_MENU);
    C.start_menu(win, C.MENU_BEHAVE_STANDARD);
    C.copyAnything(any, C.cg.zeroany);
    any.a_char = 109; /* group accelerator 'C' */
    C.add_menu(win, C.nul_glyphinfo, any, abc ? 0 : any.a_char, 67,
             C.ATR_NONE, clr, "a monster", C.MENU_ITEMFLAGS_NONE);
    if (C.gi.invent) {
        /* we use y and n as accelerators so that we can accept user's
           response keyed to old "name an individual object?" prompt */
        any.a_char = 105; /* group accelerator 'y' */
        C.add_menu(win, C.nul_glyphinfo, any, abc ? 0 : any.a_char, 121,
                 C.ATR_NONE, clr, "a particular object in inventory",
                 C.MENU_ITEMFLAGS_NONE);
        any.a_char = 111; /* group accelerator 'n' */
        C.add_menu(win, C.nul_glyphinfo, any, abc ? 0 : any.a_char, 110,
                 C.ATR_NONE, clr, "the type of an object in inventory",
                 C.MENU_ITEMFLAGS_NONE);
    }
    any.a_char = 102; /* group accelerator ',' (or ':' instead?) */
    C.add_menu(win, C.nul_glyphinfo, any, abc ? 0 : any.a_char, 44,
             C.ATR_NONE, clr, "the type of an object upon the floor",
             C.MENU_ITEMFLAGS_NONE);
    any.a_char = 100; /* group accelerator '\' */
    C.add_menu(win, C.nul_glyphinfo, any, abc ? 0 : any.a_char, 92,
             C.ATR_NONE, clr, "the type of an object on discoveries list",
             C.MENU_ITEMFLAGS_NONE);
    any.a_char = 97; /* group accelerator 'l' */
    C.add_menu(win, C.nul_glyphinfo, any, abc ? 0 : any.a_char, 108,
             C.ATR_NONE, clr, "record an annotation for the current level",
             C.MENU_ITEMFLAGS_NONE);
    C.end_menu(win, "What do you want to name?");
    if (C.select_menu(win, C.PICK_ONE, pick_list) > 0) {
        ch = pick_list.value[0].item.a_char;
        C.free(pick_list.value);
    } else
        ch = 113;
    C.destroy_nhwindow(win);

    } // docallcmd

    switch (ch) {
    default:
    case 113:
        break;
    case 109: /* name a visible monster */
        C.callLocal(do_mgivenname);
        break;
    case 105: /* name an individual object in inventory */
        obj = C.getobj("name", name_ok, C.GETOBJ_PROMPT);
        if (obj)
            C.callLocal(do_oname, obj);
        break;
    case 111: /* name a type of object in inventory */
        obj = C.getobj("call", call_ok, C.GETOBJ_NOFLAGS);
        if (obj) {
            /* behave as if examining it in inventory;
               this might set dknown if it was picked up
               while blind and the hero can now see */
            C.xname(obj);

            if (!obj.dknown) {
                C.You("would never recognize another one.");
// #if 0
//             } else if (call_ok(obj) == C.GETOBJ_EXCLUDE) {
//                 C.You("know those as well as you ever will.");
// #endif
            } else {
                C.callLocal(docall, obj);
            }
        }
        break;
    case 102: /* name a type of object visible on the floor */
        C.callLocal(namefloorobj);
        break;
    case 100: /* name a type of object on the discoveries list */
        C.rename_disco();
        break;
    case 97: /* annotate level */
        C.donamelevel();
        break;
    }
    return C.ECMD_OK;
}

/* for use by safe_qbuf() */
export function docall_xname(obj)
{
    let otemp;

    otemp = C.objectLocalCopy(obj);
    otemp.oextra = 0;
    otemp.quan = 1n;
    /* in case water is already known, convert "[un]holy water" to "water" */
    otemp.blessed = otemp.cursed = 0;
    /* remove attributes that are doname() caliber but get formatted
       by xname(); most of these fixups aren't really needed because the
       relevant type of object isn't callable so won't reach this far */
    if (otemp.oclass == C.WEAPON_CLASS)
        otemp.opoisoned = 0; /* not poisoned */
    else if (otemp.oclass == C.POTION_CLASS)
        otemp.odiluted = 0; /* not diluted */
    else if (otemp.otyp == C.TOWEL || otemp.otyp == C.STATUE)
        otemp.spe = 0; /* not wet or historic */
    else if (otemp.otyp == C.TIN)
        otemp.known = 0; /* suppress tin type (homemade, &c) and mon type */
    else if (otemp.otyp == C.FIGURINE)
        otemp.corpsenm = C.NON_PM; /* suppress mon type */
    else if (otemp.otyp == C.HEAVY_IRON_BALL)
        otemp.owt = C.objects[C.HEAVY_IRON_BALL].oc_weight; /* not "very heavy" */
    else if (otemp.oclass == C.FOOD_CLASS && otemp.globby)
        otemp.owt = 120; /* 6*20, neither a small glob nor a large one */

    return C.an(C.xname(otemp));
}

export function docall(obj)
{
    const buf = C.stackAlloc(C.BUFSZ), qbuf = C.stackAlloc(C.QBUFSZ);
    let uname_p;
    let had_name = 0;

    if (!obj.dknown)
        return; /* probably blind; Blind || Hallucination for 'fromsink' */
    C.flush_screen(1); /* buffered updates might matter to player's response */

    if (obj.oclass == C.POTION_CLASS && obj.fromsink)
        /* fromsink: kludge, meaning it's sink water */
        C.Sprintf(qbuf, "Call a stream of %s fluid:",
                C.OBJ_DESCR(C.objects[obj.otyp]));
    else
        C.safe_qbuf(qbuf, "Call ", ":", obj,
                         docall_xname, C.simpleonames, "thing");
    /* pointer to old name */
    uname_p = C.pointerField(C.objects[obj.otyp], 'oc_uname');
    /* use getlin() to get a name string from the player */
    if (!name_from_player(buf, qbuf, uname_p.value))
        return;

    /* clear old name */
    if (uname_p.value) {
        had_name = 1;
        C.free(uname_p.value), uname_p.value = 0; /* clear oc_uname */
    }

    /* strip leading and trailing spaces; uncalls item if all spaces */
    C.mungspaces(buf);
    if (!C.loadChar(buf)) {
        if (had_name) /* possibly remove from disco[]; old *uname_p is gone */
            C.undiscover_object(obj.otyp);
    } else {
        uname_p.value = C.dupstr(buf);
        C.discover_object(obj.otyp, 0, 1, 1); /* possibly add to disco[] */
    }
    if (obj.where == C.OBJ_INVENT || C.carrying(obj.otyp))
        C.update_inventory();
}

export function namefloorobj()
{
    const cc = C.coordLocal();
    let glyph;
    const buf = C.stackAlloc(C.BUFSZ);
    let obj = 0;
    let fakeobj = 0, use_plural;

    cc.x = C.u.ux, cc.y = C.u.uy;
    /* "dot for under/over you" only makes sense when the cursor hasn't
       been moved off the hero's '@' yet, but there's no way to adjust
       the help text once getpos() has started */
    C.Sprintf(buf, "object on map (or '.' for one %s you)",
            (C.u.uundetected && C.hides_under(C.gy.youmonst.data))
              ? "over" : "under");
    if (C.getpos(cc, 0, buf) < 0 || cc.x <= 0)
        return;
    if (C.u_at(cc.x, cc.y)) {
        obj = C.vobj_at(C.u.ux, C.u.uy);
    } else {
        glyph = C.glyph_at(cc.x, cc.y);
        if (C.glyph_is_object(glyph))
            fakeobj = C.object_from_map(glyph, cc.x, cc.y, C.objectReference(() => obj, value => { obj = value; }));
        /* else 'obj' stays null */
    }
    if (!obj) {
        /* "under you" is safe here since there's no object to hide under */
        C.There("doesn't seem to be any object %s.",
              C.u_at(cc.x, cc.y) ? "under you" : "there");
        return;
    }
    /* note well: 'obj' might be an instance of STRANGE_OBJECT if target
       is a mimic; passing that to xname (directly or via simpleonames)
       would yield "glorkum" so we need to handle it explicitly; it will
       always fail the Hallucination test and pass the !callable test,
       resulting in the "can't be assigned a type name" message */
    C.Strcpy(buf, (obj.otyp != C.STRANGE_OBJECT)
                 ? C.simpleonames(obj)
                 : C.obj_descr[C.STRANGE_OBJECT].oc_name);
    use_plural = (obj.quan > 1n);
    if (C.Hallucination) {
        const unames = [0, 0, 0, 0, 0, 0];
        const tmpbuf = C.stackAlloc(C.BUFSZ);

        /* straight role name */
        unames[0] = ((C.Upolyd ? C.u.mfemale : C.flags.female) && C.gu.urole.name.f)
                     ? C.gu.urole.name.f
                     : C.gu.urole.name.m;
        /* random rank title for hero's role

           note: the 30 is hardcoded in xlev_to_rank, so should be
           hardcoded here too */
        unames[1] = C.rank_of(C.rn2_on_display_rng(30) + 1,
                            C.Role_switch, C.flags.female);
        /* random fake monster */
        unames[2] = bogusmon(tmpbuf, 0);
        /* increased chance for fake monster */
        unames[3] = unames[2];
        /* traditional */
        unames[4] = roguename();
        /* silly */
        unames[5] = "Wibbly Wobbly";
        C.pline("%s %s to call you \"%s.\"",
              C.The(buf), use_plural ? "decide" : "decides",
              unames[C.rn2_on_display_rng(unames.length)]);
    } else if (call_ok(obj) == C.GETOBJ_EXCLUDE) {
        C.pline("%s %s can't be assigned a type name.",
              use_plural ? "Those" : "That", buf);
    } else if (!obj.dknown) {
        C.You("don't know %s %s well enough to name %s.",
            use_plural ? "those" : "that", buf, use_plural ? "them" : "it");
    } else {
        C.callLocal(docall, obj);
    }
    if (fakeobj) {
        obj.where = C.OBJ_FREE; /* object_from_map() sets it to OBJ_FLOOR */
        C.dealloc_obj(obj); /* has no contents */
    }
}

export const ghostnames = [
    /* these names should have length < PL_NSIZ */
    /* Capitalize the names for aesthetics -dgk */
    "Adri",    "Andries",       "Andreas",     "Bert",    "David",  "Dirk",
    "Emile",   "Frans",         "Fred",        "Greg",    "Hether", "Jay",
    "John",    "Jon",           "Karnov",      "Kay",     "Kenny",  "Kevin",
    "Maud",    "Michiel",       "Mike",        "Peter",   "Robert", "Ron",
    "Tom",     "Wilmar",        "Nick Danger", "Phoenix", "Jiro",   "Mizue",
    "Stephan", "Lance Braccus", "Shadowhawk",  "Murphy"
];

/* ghost names formerly set by x_monnam(), now by makemon() instead */
export function rndghostname()
{
    return C.rn2(7, 774, 'rndghostname') ? C.ghostnames[C.rn2(C.ghostnames.length, 774, 'rndghostname')]
                  : C.svp.plname;
}

/*
 * Monster naming functions:
 * x_monnam is the generic monster-naming function.
 *                seen        unseen       detected               named
 * mon_nam:     the newt        it      the invisible orc       Fido
 * noit_mon_nam:your newt (as if detected) your invisible orc   Fido
 * some_mon_nam:the newt    someone     the invisible orc       Fido
 *          or              something
 * l_monnam:    newt            it      invisible orc           dog called Fido
 * Monnam:      The newt        It      The invisible orc       Fido
 * noit_Monnam: Your newt (as if detected) Your invisible orc   Fido
 * Some_Monnam: The newt    Someone     The invisible orc       Fido
 *          or              Something
 * Adjmonnam:   The poor newt   It      The poor invisible orc  The poor Fido
 * Amonnam:     A newt          It      An invisible orc        Fido
 * a_monnam:    a newt          it      an invisible orc        Fido
 * m_monnam:    newt            xan     orc                     Fido
 * y_monnam:    your newt     your xan  your invisible orc      Fido
 * YMonnam:     Your newt     Your xan  Your invisible orc      Fido
 * noname_monnam(mon,article):
 *              article newt    art xan art invisible orc       art dog
 */

/*
 * article
 *
 * ARTICLE_NONE, ARTICLE_THE, ARTICLE_A: obvious
 * ARTICLE_YOUR: "your" on pets, "the" on everything else
 *
 * If the monster would be referred to as "it" or if the monster has a name
 * _and_ there is no adjective, "invisible", "saddled", etc., override this
 * and always use no article.
 *
 * suppress
 *
 * SUPPRESS_IT, SUPPRESS_INVISIBLE, SUPPRESS_HALLUCINATION, SUPPRESS_SADDLE.
 * SUPPRESS_MAPPEARANCE: if monster is mimicking another monster (cloned
 *              Wizard or quickmimic pet), describe the real monster rather
 *              than its current form;
 * EXACT_NAME: combination of all the above
 * SUPPRESS_NAME: omit monster's assigned name (unless uniq w/ pname).
 * AUGMENT_IT: not suppression but shares suppression bitmask; if result
 *              would have been "it", return "someone" if humanoid or
 *              "something" otherwise.
 *
 * Bug: if the monster is a priest or shopkeeper, not every one of these
 * options works, since those are special cases.
 */
export function x_monnam(mtmp, article, adjective, suppress, called)
{
    article = C.int(article);adjective = C.charPointer(adjective);suppress = C.int(suppress);called = C.boolean(called);
    let buf = nextmbuf();
    let mdat = mtmp.data;
    let pm_name;
    let do_hallu, do_invis, do_it, do_saddle, do_mappear,
            do_exact, do_name, augment_it;
    let name_at_start, has_adjectives, insertbuf2,
            mappear_as_mon = (C.M_AP_TYPE(mtmp) == C.M_AP_MONSTER);
    let bp; const buf2 = C.stackAlloc(C.BUFSZ);

    if (C.samePtr(mtmp, C.gy.youmonst))
        return C.strcpy(buf, "you"); /* ignore article, "invisible", &c */

    if (C.program_state.gameover)
        suppress |= C.SUPPRESS_HALLUCINATION;
    if (article == C.ARTICLE_YOUR && !mtmp.mtame)
        article = C.ARTICLE_THE;

    if (C.u.uswallow && C.samePtr(mtmp, C.u.ustuck)) {
        /*
         * This monster has become important, for the moment anyway.
         * As the hero's consumer, it is worthy of ARTICLE_THE.
         * Also, suppress invisible as that particular characteristic
         * is unimportant now and you can see its interior anyway.
         */
        article = C.ARTICLE_THE;
        suppress |= C.SUPPRESS_INVISIBLE;
    }
    do_hallu = C.Hallucination && !(suppress & C.SUPPRESS_HALLUCINATION);
    do_invis = mtmp.minvis && !(suppress & C.SUPPRESS_INVISIBLE);
    do_it = !C.canspotmon(mtmp) && article != C.ARTICLE_YOUR
            && !C.program_state.gameover && !C.samePtr(mtmp, C.u.usteed)
            && !C.engulfing_u(mtmp) && !(suppress & C.SUPPRESS_IT);
    do_saddle = !(suppress & C.SUPPRESS_SADDLE);
    do_mappear = mappear_as_mon && !(suppress & C.SUPPRESS_MAPPEARANCE);
    do_exact = (suppress & C.EXACT_NAME) == C.EXACT_NAME;
    do_name = !(suppress & C.SUPPRESS_NAME) || C.type_is_pname(mdat);
    augment_it = (suppress & C.AUGMENT_IT) != 0;

    C.storeChar(buf + (0), 0);

    /* unseen monsters, etc.; usually "it" but sometimes more specific;
       when hallucinating, the more specific values might be inverted */
    if (do_it) {
        /* !is_animal excludes all Y; !mindless excludes Z, M, \' */
        let s_one = C.humanoid(mdat) && !C.is_animal(mdat) && !C.mindless(mdat);

        C.Strcpy(buf, !augment_it ? "it"
                    : (!do_hallu ? s_one : !C.rn2(2, 881, 'x_monnam')) ? "someone"
                      : "something");
        return buf;
    }

    /* priests and minions: don't even use this function */
    if ((mtmp.ispriest || mtmp.isminion) && !do_mappear) {
        let name;
        let save_prop = C.EHalluc_resistance;
        let save_invis = mtmp.minvis;

        /* when true name is wanted, explicitly block Hallucination */
        if (!do_hallu)
            C.EHalluc_resistance = 1n;
        if (!do_invis)
            mtmp.minvis = 0;
        /* EXACT_NAME will force "of <deity>" on the Astral Plane */
        name = C.priestname(mtmp, article, do_exact, buf2);
        C.EHalluc_resistance = save_prop;
        mtmp.minvis = save_invis;
        if (article == C.ARTICLE_NONE && !C.strncmp(name, "the ", 4))
            name += 4;
        return C.strcpy(buf, name);
    }

    /* 'pm_name' is the base part of most names */
    if (do_mappear) {
        /*assert(ismnum(mtmp->mappearance));*/
        pm_name = pmname(C.mons[mtmp.mappearance], Mgender(mtmp));
    } else {
        pm_name = mon_pmname(mtmp);
    }

    /* Shopkeepers: use shopkeeper name.  For normal shopkeepers, just
     * "Asidonhopo"; for unusual ones, "Asidonhopo the invisible
     * shopkeeper" or "Asidonhopo the blue dragon".  If hallucinating,
     * none of this applies.
     */
    if (mtmp.isshk && !do_hallu && !do_mappear) {
        if (adjective && article == C.ARTICLE_THE) {
            /* pathological case: "the angry Asidonhopo the blue dragon"
               sounds silly */
            C.Strcpy(buf, "the ");
            C.Strcat(C.strcat(buf, adjective), " ");
            C.Strcat(buf, C.shkname(mtmp));
        } else {
            C.Strcat(buf, C.shkname(mtmp));
            if (!C.samePtr(mdat, C.mons[C.PM_SHOPKEEPER]) || do_invis){
                C.Strcat(buf, " the ");
                if (do_invis)
                    C.Strcat(buf, "invisible ");
                C.Strcat(buf, pm_name);
            }
        }
        return buf;
    }

    /* Put the adjectives in the buffer */
    if (adjective)
        C.Strcat(C.strcat(buf, adjective), " ");
    if (do_invis)
        C.Strcat(buf, "invisible ");
    if (do_saddle && (mtmp.misc_worn_check & C.W_SADDLE) && !C.Blind
        && !C.Hallucination)
        C.Strcat(buf, "saddled ");
    has_adjectives = (C.loadChar(buf + (0)) != 0);

    /* Put the actual monster name or type into the buffer now.
       Remember whether the buffer starts with a personal name. */
    if (do_hallu) {
        const rnamecode = C.charLocal();
        let rname = rndmonnam(rnamecode);

        C.Strcat(buf, rname);
        name_at_start = bogon_is_pname(rnamecode.value);
    } else if (do_name && C.has_mgivenname(mtmp)) {
        let name = mtmp.mextra.mgivenname;

// #if 0
      /* hardfought */
//       if (C.has_ebones(mtmp)) {
// #endif
        if (C.samePtr(mdat, C.mons[C.PM_GHOST])) {
            C.Sprintf(C.eos(buf), "%s ghost", C.s_suffix(name));
            name_at_start = 1;
        } else if (called) {
            C.Sprintf(C.eos(buf), "%s called %s", pm_name, name);
            name_at_start = C.boolean(C.type_is_pname(mdat));
        } else if (C.is_mplayer(mdat) && (bp = C.strstri(name, " the ")) != 0) {
            /* <name> the <adjective> <invisible> <saddled> <rank> */
            const pbuf = C.stackAlloc(C.BUFSZ);

            C.Strcpy(pbuf, name);
            C.storeChar(pbuf + (Number(C.ptrDiff(bp, name)) + 5), 0); /* adjectives right after " the " */
            if (has_adjectives)
                C.Strcat(pbuf, buf);
            C.Strcat(pbuf, bp + 5); /* append the rest of the name */
            C.Strcpy(buf, pbuf);
            article = C.ARTICLE_NONE;
            name_at_start = 1;
        } else {
            C.Strcat(buf, name);
            name_at_start = 1;
        }
// #if 0 
/* hardfought */
//       }
// #endif
    } else if (C.is_mplayer(mdat) && !C.In_endgame(C.u.uz)) {
        const pbuf = C.stackAlloc(C.BUFSZ);

        C.Strcpy(pbuf, C.rank_of(C.int(mtmp.m_lev), C.monsndx(mdat),
                             C.boolean(mtmp.female)));
        C.Strcat(buf, C.lcase(pbuf));
        name_at_start = 0;
    } else {
        C.Strcat(buf, pm_name);
        name_at_start = C.boolean(C.type_is_pname(mdat));
    }

    if (name_at_start && (article == C.ARTICLE_YOUR || !has_adjectives)) {
        if (C.samePtr(mdat, C.mons[C.PM_WIZARD_OF_YENDOR]))
            article = C.ARTICLE_THE;
        else
            article = C.ARTICLE_NONE;
    } else if ((mdat.geno & C.G_UNIQ) != 0 && article == C.ARTICLE_A) {
        article = C.ARTICLE_THE;
    }

    insertbuf2 = 1;
    C.storeChar(buf2 + (0), 0); /* lint suppression */
    switch (article) {
    case C.ARTICLE_YOUR:
        C.Strcpy(buf2, "your ");
        break;
    case C.ARTICLE_THE:
        C.Strcpy(buf2, "the ");
        break;
    case C.ARTICLE_A:
        /* avoid an() here */
        C.just_an(buf2, buf); /* copy "a " or "an " into buf2[] */
        break;
    case C.ARTICLE_NONE:
    default:
        insertbuf2 = 0;
        break;
    }
    if (insertbuf2) {
        C.Strcat(buf2, buf); /* buf2[] isn't viable to return,  */
        C.Strcpy(buf, buf2); /* so transfer the result to buf[] */
    }
    return buf;
}

export function l_monnam(mtmp)
{
    return C.callLocal(x_monnam, mtmp, C.ARTICLE_NONE, 0,
                    (C.has_mgivenname(mtmp)) ? C.SUPPRESS_SADDLE : 0, 1);
}

export function mon_nam(mtmp)
{
    return C.callLocal(x_monnam, mtmp, C.ARTICLE_THE, 0,
                    (C.has_mgivenname(mtmp)) ? C.SUPPRESS_SADDLE : 0, 0);
}

/* print the name as if mon_nam() (y_monnam() if tame) was called, but
   assume that the player can always see the monster--used for probing and
   for monsters aggravating the player with a cursed potion of invisibility;
   also used for pet moving "reluctantly" onto cursed object when that pet
   can be seen either before or after it moves */
export function noit_mon_nam(mtmp)
{
    return C.callLocal(x_monnam, mtmp, C.ARTICLE_YOUR, 0,
                    (C.has_mgivenname(mtmp) ? (C.SUPPRESS_SADDLE | C.SUPPRESS_IT)
                                          : C.SUPPRESS_IT),
                    0);
}

/* in between noit_mon_nam() and mon_nam(); if the latter would pick "it",
   use "someone" (for humanoids) or "something" (for others) instead */
export function some_mon_nam(mtmp)
{
    return C.callLocal(x_monnam, mtmp, C.ARTICLE_THE, 0,
                    (C.has_mgivenname(mtmp) ? (C.SUPPRESS_SADDLE | C.AUGMENT_IT)
                                          : C.AUGMENT_IT),
                    0);
}

export function Monnam(mtmp)
{
    let bp = mon_nam(mtmp);

    C.storeChar(bp, C.highc(C.loadChar(bp)));
    return bp;
}

export function noit_Monnam(mtmp)
{
    let bp = noit_mon_nam(mtmp);

    C.storeChar(bp, C.highc(C.loadChar(bp)));
    return bp;
}

export function Some_Monnam(mtmp)
{
    let bp = some_mon_nam(mtmp);

    C.storeChar(bp, C.highc(C.loadChar(bp)));
    return bp;
}

/* return "a dog" rather than "Fido", honoring hallucination and visibility */
export function noname_monnam(mtmp, article)
{
    article = C.int(article);
    return C.callLocal(x_monnam, mtmp, article, 0, C.SUPPRESS_NAME, 0);
}

/* monster's own name -- overrides hallucination and [in]visibility
   so shouldn't be used in ordinary messages (mainly for disclosure) */
export function m_monnam(mtmp)
{
    return C.callLocal(x_monnam, mtmp, C.ARTICLE_NONE, 0, C.EXACT_NAME, 0);
}

/* pet name: "your little dog" */
export function y_monnam(mtmp)
{
    let prefix, suppression_flag;

    prefix = mtmp.mtame ? C.ARTICLE_YOUR : C.ARTICLE_THE;
    suppression_flag = (C.has_mgivenname(mtmp)
                        /* "saddled" is redundant when mounted */
                        || C.samePtr(mtmp, C.u.usteed))
                           ? C.SUPPRESS_SADDLE
                           : 0;

    return C.callLocal(x_monnam, mtmp, prefix, 0, suppression_flag, 0);
}

/* y_monnam() for start of sentence */
export function YMonnam(mtmp)
{
    let bp = y_monnam(mtmp);

    C.storeChar(bp, C.highc(C.loadChar(bp)));
    return bp;
}

export function Adjmonnam(mtmp, adj)
{
    adj = C.charPointer(adj);
    let bp = C.callLocal(x_monnam, mtmp, C.ARTICLE_THE, adj,
                        C.has_mgivenname(mtmp) ? C.SUPPRESS_SADDLE : 0, 0);

    C.storeChar(bp, C.highc(C.loadChar(bp)));
    return bp;
}

export function a_monnam(mtmp)
{
    return C.callLocal(x_monnam, mtmp, C.ARTICLE_A, 0,
                    C.has_mgivenname(mtmp) ? C.SUPPRESS_SADDLE : 0, 0);
}

export function Amonnam(mtmp)
{
    let bp = a_monnam(mtmp);

    C.storeChar(bp, C.highc(C.loadChar(bp)));
    return bp;
}

/* used for monster ID by the '/', ';', and 'C' commands to block remote
   identification of the endgame altars via their attending priests */
export function distant_monnam(mon, article, outbuf) /* only ARTICLE_NONE and ARTICLE_THE are handled here */
{
    article = C.int(article);outbuf = C.charPointer(outbuf);
    /* high priest(ess)'s identity is concealed on the Astral Plane,
       unless you're adjacent (overridden for hallucination which does
       its own obfuscation) */
    if (C.samePtr(mon.data, C.mons[C.PM_HIGH_CLERIC]) && !C.Hallucination
        && C.Is_astralevel(C.u.uz) && !C.m_next2u(mon)) {
        C.Strcpy(outbuf, article == C.ARTICLE_THE ? "the " : "");
        C.Strcat(outbuf, mon.female ? "high priestess" : "high priest");
    } else {
        C.Strcpy(outbuf, C.callLocal(x_monnam, mon, article, 0, 0, 1));
    }
    return outbuf;
}

/* returns mon_nam(mon) relative to other_mon; normal name unless they're
   the same, in which case the reference is to {him|her|it} self */
export function mon_nam_too(mon, other_mon)
{
    let outbuf;

    if (!C.samePtr(mon, other_mon)) {
        outbuf = mon_nam(mon);
    } else {
        outbuf = nextmbuf();
        switch (C.pronoun_gender(mon, C.PRONOUN_HALLU)) {
        case 0:
            C.Strcpy(outbuf, "himself");
            break;
        case 1:
            C.Strcpy(outbuf, "herself");
            break;
        default:
        case 2:
            C.Strcpy(outbuf, "itself");
            break;
        case 3: /* could happen when hallucinating */
            C.Strcpy(outbuf, "themselves");
            break;
        }
    }
    return outbuf;
}

/* construct "<monnamtext> <verb> <othertext> {him|her|it}self" which might
   be distorted by Hallu; if that's plural, adjust monnamtext and verb */
export function monverbself(mon, monnamtext, verb, othertext) /* modifiable 'mbuf' with adequate room at end */
{
    monnamtext = C.charPointer(monnamtext);verb = C.charPointer(verb);othertext = C.charPointer(othertext);
    let verbs; const selfbuf = C.stackAlloc(40); /* sizeof "themselves" suffices */

    /* "himself"/"herself"/"itself", maybe "themselves" if hallucinating */
    C.Strcpy(selfbuf, mon_nam_too(mon, mon));
    /* verb starts plural; this will yield singular except for "themselves" */
    verbs = C.vtense(selfbuf, verb);
    if (!C.strcmp(verb, verbs)) { /* a match indicates that it stayed plural */
        monnamtext = C.makeplural(monnamtext);
        /* for "it", makeplural() produces "them" but we want "they" */
        if (!C.strcmpi(monnamtext, C.genders[3].he)) {
            let capitaliz = (C.loadChar(monnamtext + (0)) == C.highc(C.loadChar(monnamtext + (0))));

            C.Strcpy(monnamtext, C.genders[3].him);
            if (capitaliz)
                C.storeChar(monnamtext + (0), C.highc(C.loadChar(monnamtext + (0))));
        }
    }
    C.Strcat(C.strcat(monnamtext, " "), verbs);
    if (othertext && C.loadChar(othertext))
        C.Strcat(C.strcat(monnamtext, " "), othertext);
    C.Strcat(C.strcat(monnamtext, " "), selfbuf);
    return monnamtext;
}

/* for debugging messages, where data might be suspect and we aren't
   taking what the hero does or doesn't know into consideration */
export function minimal_monnam(mon, ckloc)
{
    ckloc = C.boolean(ckloc);
    let ptr;
    let outbuf = nextmbuf();

    if (!mon) {
        C.Strcpy(outbuf, "[Null monster]");
    } else if ((ptr = mon.data) == 0) {
        C.Strcpy(outbuf, "[Null mon->data]");
    } else if (C.ptrBefore(ptr, C.mons[0])) {
        C.Sprintf(outbuf, "[Invalid mon->data %s < %s]",
                C.fmt_ptr(mon.data),
                C.fmt_ptr(C.mons[0]));
    } else if (!C.ptrBefore(ptr, C.mons[C.NUMMONS])) {
        C.Sprintf(outbuf, "[Invalid mon->data %s >= %s]",
                C.fmt_ptr(mon.data),
                C.fmt_ptr(C.mons[C.NUMMONS]));
    } else if (ckloc && C.samePtr(ptr, C.mons[C.PM_LONG_WORM]) && mon.mx
               && !C.samePtr(C.svl.level.monsters[mon.mx][mon.my], mon)) {
        C.Sprintf(outbuf, "%s <%d,%d>",
                pmname(C.mons[C.PM_LONG_WORM_TAIL], Mgender(mon)),
                mon.mx, mon.my);
    } else {
        C.Sprintf(outbuf, "%s%s <%d,%d>",
                mon.mtame ? "tame " : mon.mpeaceful ? "peaceful " : "",
                mon_pmname(mon), mon.mx, mon.my);
        if (mon.cham != C.NON_PM)
            C.Sprintf(C.eos(outbuf), "{%s}",
                    pmname(C.mons[mon.cham], Mgender(mon)));
    }
    return outbuf;
}

// #ifndef PMNAME_MACROS
export function Mgender(mtmp)
{
    let mgender = C.MALE;

    if (C.samePtr(mtmp, C.gy.youmonst)) {
        if (C.Upolyd ? C.u.mfemale : C.flags.female)
            mgender = C.FEMALE;
    } else if (mtmp.female) {
        mgender = C.FEMALE;
    }
    return mgender;
}

export function pmname(pm, mgender)
{
    mgender = C.int(mgender);
    if (mgender < C.MALE || mgender >= C.NUM_MGENDERS || !pm.pmnames[mgender])
        mgender = C.NEUTRAL;
    return pm.pmnames[mgender];
}
// #endif 
/* PMNAME_MACROS */

/* mons[]->pmname for a monster */
export function mon_pmname(mon)
{
    /* for neuter, mon->data->pmnames[MALE] will be Null and use [NEUTRAL] */
    return pmname(mon.data, Mgender(mon));
}

/* mons[]->pmname for a corpse or statue or figurine */
export function obj_pmname(obj)
{
// #if 0   
/* ignore saved montraits even when they're available; they determine
         * what a corpse would revive as if resurrected (human corpse from
         * slain vampire revives as vampire rather than as human, for example)
         * and don't necessarily reflect the state of the corpse itself */
//     if (C.has_omonst(obj)) {
//         struct monst *m = C.OMONST(obj);

        /* obj->oextra->omonst->data is Null but ...->mnum is set */
//         if (C.ismnum(m.mnum))
//             return pmname(C.mons[m.mnum], Mgender(m));
//     }
// #endif
    if ((obj.otyp == C.CORPSE || obj.otyp == C.STATUE || obj.otyp == C.FIGURINE)
        && C.ismnum(obj.corpsenm)) {
        let cgend = (obj.spe & C.CORPSTAT_GENDER),
            mgend = ((cgend == C.CORPSTAT_MALE) ? C.MALE
                     : (cgend == C.CORPSTAT_FEMALE) ? C.FEMALE
                       : C.NEUTRAL),
            mndx = obj.corpsenm;

        /* mons[].pmnames[] for monster cleric uses "priest" or "priestess"
           or "aligned cleric"; we want to avoid "aligned cleric [corpse]"
           unless it has been explicitly flagged as neuter rather than
           defaulting to random (which fails male or female check above);
           role monster cleric uses "priest" or "priestess" or "cleric"
           without "aligned" prefix so we switch to that; [can't force
           random gender to be chosen here because splitting a stack of
           corpses could cause the split-off portion to change gender, so
           settle for avoiding "aligned"] */
        if (mndx == C.PM_ALIGNED_CLERIC && cgend == C.CORPSTAT_RANDOM)
            mndx = C.PM_CLERIC;

        return pmname(C.mons[mndx], mgend);
    }
    C.impossible("obj_pmname otyp:%i,corpsenm:%i", obj.otyp, obj.corpsenm);
    return "two-legged glorkum-seeker";
}

/* used by bogusmon(next) and also by init_CapMons(rumors.c);
   bogon_is_pname(below) checks a hard-coded subset of these rather than
   use this list.
   Also used in rumors.c */
export const bogon_codes = "-_+|="; /* see dat/bonusmon.txt */

/* fake monsters used to be in a hard-coded array, now in a data file */
export function bogusmon(buf, code)
{
    buf = C.charPointer(buf);code = C.charPointer(code);
    let mnam = buf;

    if (code)
        C.storeChar(code, 0);
    /* might fail (return empty buf[]) if the file isn't available */
    C.get_rnd_text(C.BOGUSMONFILE, buf, C.rn2_on_display_rng, C.MD_PAD_BOGONS);
    if (!C.loadChar(mnam)) {
        C.Strcpy(buf, "bogon");
    } else if (C.strchr(C.bogon_codes, C.loadChar(mnam))) { /* strip prefix if present */
        if (code)
            C.storeChar(code, C.loadChar(mnam));
        ++mnam;
    }
    return mnam;
}

/* return a random monster name, for hallucination */
export function rndmonnam(code)
{
    code = C.charPointer(code);
    const buf = C.rndmonnamBuffer;
    let mnam;
    let name;
const BOGUSMONSIZE = 100; /* arbitrary */

    if (code)
        C.storeChar(code, 0);

    do {
        name = C.rn2_on_display_rng(C.SPECIAL_PM + BOGUSMONSIZE - C.LOW_PM) + C.LOW_PM;
    } while (name < C.SPECIAL_PM
             && (C.type_is_pname(C.mons[name]) || (C.mons[name].geno & C.G_NOGEN)));

    if (name >= C.SPECIAL_PM) {
        mnam = bogusmon(buf, code);
    } else {
        mnam = C.strcpy(buf, pmname(C.mons[name], C.rn2_on_display_rng(2)));
    }
    return mnam;
// #undef BOGUSMONSIZE
}

/* check bogusmon prefix to decide whether it's a personal name */
export function bogon_is_pname(code)
{
    code = C.char(code);
    if (!code)
        return 0;
    return C.strchr("-+=", code) ? 1 : 0;
}

/* name of a Rogue player */
export function roguename()
{
    let i, opts;

    if ((opts = C.nh_getenv("ROGUEOPTS")) != 0) {
        for (i = opts; C.loadChar(i); i++)
            if (!C.strncmp("name=", i, 5)) {
                let j;
                if ((j = C.strchr(i + 5, 44)) != 0)
                    C.storeChar(j, 0);
                return i + 5;
            }
    }
    return C.rn2(3, 1437, 'roguename') ? (C.rn2(2, 1437, 'roguename') ? "Michael Toy" : "Kenneth Arnold")
                  : "Glenn Wichman";
}

export const hcolors = [
    "ultraviolet", "infrared", "bluish-orange", "reddish-green", "dark white",
    "light black", "sky blue-pink", "pinkish-cyan", "indigo-chartreuse",
    "salty", "sweet", "sour", "bitter", "umami", /* basic tastes */
    "striped", "spiral", "swirly", "plaid", "checkered", "argyle", "paisley",
    "blotchy", "guernsey-spotted", "polka-dotted", "square", "round",
    "triangular", "cabernet", "sangria", "fuchsia", "wisteria", "lemon-lime",
    "strawberry-banana", "peppermint", "romantic", "incandescent",
    "octarine", /* Discworld: the Colour of Magic */
    "excitingly dull", "mauve", "electric",
    "neon", "fluorescent", "phosphorescent", "translucent", "opaque",
    "psychedelic", "iridescent", "rainbow-colored", "polychromatic",
    "colorless", "colorless green",
    "dancing", "singing", "loving", "loudy", "noisy", "clattery", "silent",
    "apocyan", "infra-pink", "opalescent", "violant", "tuneless",
    "viridian", "aureolin", "cinnabar", "purpurin", "gamboge", "madder",
    "bistre", "ecru", "fulvous", "tekhelet", "selective yellow",
];

export function hcolor(colorpref)
{
    colorpref = C.charPointer(colorpref);
    return (C.Hallucination || !colorpref)
        ? C.hcolors[C.rn2_on_display_rng(C.hcolors.length)]
        : colorpref;
}

/* return a random real color unless hallucinating */
export function rndcolor()
{
    let k = C.rn2(C.CLR_MAX, 1472, 'rndcolor');

    return C.Hallucination ? hcolor(0)
                         : (k == C.NO_COLOR) ? "colorless"
                                           : C.c_obj_colors[k];
}

export const hliquids = [
    "yoghurt", "oobleck", "clotted blood", "diluted water", "purified water",
    "instant coffee", "tea", "herbal infusion", "liquid rainbow",
    "creamy foam", "mulled wine", "bouillon", "nectar", "grog", "flubber",
    "ketchup", "slow light", "oil", "vinaigrette", "liquid crystal", "honey",
    "caramel sauce", "ink", "aqueous humour", "milk substitute",
    "fruit juice", "glowing lava", "gastric acid", "mineral water",
    "cough syrup", "quicksilver", "sweet vitriol", "grey goo", "pink slime",
    "cosmic latte", "bone oil", "custard", "lard", "vinegar", "creosote",
    /* "new coke (tm)", --better not */
];

/* if hallucinating, return a random liquid instead of 'liquidpref' */
export function hliquid(liquidpref) /* use as-is when not hallucintg (unless empty) */
{
    liquidpref = C.charPointer(liquidpref);
    let hallucinate = C.Hallucination && !C.program_state.gameover;

    if (hallucinate || !liquidpref || !C.loadChar(liquidpref)) {
        let indx, count = C.hliquids.length;

        /* if we have a non-hallucinatory default value, include it
           among the choices */
        if (liquidpref && C.loadChar(liquidpref))
            ++count;
        indx = C.rn2_on_display_rng(count);
        if ((indx >= 0 && indx < C.hliquids.length))
            return C.hliquids[indx];
    }
    return liquidpref;
}

/* Aliases for road-runner nemesis
 */
export const coynames = [
    "Carnivorous Vulgaris", "Road-Runnerus Digestus", "Eatibus Anythingus",
    "Famishus-Famishus", "Eatibus Almost Anythingus", "Eatius Birdius",
    "Famishius Fantasticus", "Eternalii Famishiis", "Famishus Vulgarus",
    "Famishius Vulgaris Ingeniusi", "Eatius-Slobbius", "Hardheadipus Oedipus",
    "Carnivorous Slobbius", "Hard-Headipus Ravenus", "Evereadii Eatibus",
    "Apetitius Giganticus", "Hungrii Flea-Bagius", "Overconfidentii Vulgaris",
    "Caninus Nervous Rex", "Grotesques Appetitus", "Nemesis Ridiculii",
    "Canis latrans"
];

export function coyotename(mtmp, buf)
{
    buf = C.charPointer(buf);
    if (mtmp && buf) {
        C.Sprintf(buf, "%s - %s",
                C.callLocal(x_monnam, mtmp, C.ARTICLE_NONE, 0, 0, 1),
                mtmp.mcan ? C.coynames[C.coynames.length - 1]
                           : C.coynames[mtmp.m_id % (C.coynames.length - 1)]);
    }
    return buf;
}

export function rndorcname(s)
{
    s = C.charPointer(s);
    const v = [ "a", "ai", "og", "u" ];
    const snd = [ "gor", "gris", "un", "bane", "ruk",
                                 "oth","ul", "z", "thos","akh","hai" ];
    let i, iend = C.rn1(2, 3, 1543, 'rndorcname'), vstart = C.rn2(2, 1543, 'rndorcname');

    if (s) {
        C.storeChar(s, 0);
        for (i = 0; i < iend; ++i) {
            vstart = 1 - vstart;                /* 0 -> 1, 1 -> 0 */
            C.Sprintf(C.eos(s), "%s%s", (i > 0 && !C.rn2(30, 1549, 'rndorcname')) ? "-" : "",
                    vstart ? v[C.rn2(v.length, 1550, 'rndorcname')] : snd[C.rn2(snd.length, 1550, 'rndorcname')]);
        }
    }
    return s;
}

export function christen_orc(mtmp, gang, other)
{
    gang = C.charPointer(gang);other = C.charPointer(other);
    let sz = 0;
    const buf = C.stackAlloc(C.BUFSZ), buf2 = C.stackAlloc(C.BUFSZ); let orcname;

    orcname = rndorcname(buf2);
    /* rndorcname() won't return NULL */
    sz = C.int(C.strlen(orcname));
    if (gang)
        sz += C.int(C.strlen(gang) + BigInt(C.OfSize) - BigInt(C.EmptySize));
    else if (other)
        sz += C.int(C.strlen(other));

    if (sz < C.BUFSZ) {
        const gbuf = C.stackAlloc(C.BUFSZ);
        let nameit = 0;

        if (gang) {
            C.Sprintf(buf, "%s of %s", C.upstart(orcname),
                    C.upstart(C.strcpy(gbuf, gang)));
            nameit = 1;
        } else if (other) {
            C.Sprintf(buf, "%s%s", C.upstart(orcname), other);
            nameit = 1;
        }
        if (nameit)
            mtmp = C.callLocal(christen_monst, mtmp, buf);
    }
    return mtmp;
}

/* Discworld novel titles, in the order that they were published; a subset
   of them have index macros used for variant spellings; if the titles are
   reordered for some reason, make sure that those get renumbered to match */
export const sir_Terry_novels = [
    "The Colour of Magic", "The Light Fantastic", "Equal Rites", "Mort",
    "Sourcery", "Wyrd Sisters", "Pyramids", "Guards! Guards!", "Eric",
    "Moving Pictures", "Reaper Man", "Witches Abroad", "Small Gods",
    "Lords and Ladies", "Men at Arms", "Soul Music", "Interesting Times",
    "Maskerade", "Feet of Clay", "Hogfather", "Jingo", "The Last Continent",
    "Carpe Jugulum", "The Fifth Elephant", "The Truth", "Thief of Time",
    "The Last Hero", "The Amazing Maurice and His Educated Rodents",
    "Night Watch", "The Wee Free Men", "Monstrous Regiment",
    "A Hat Full of Sky", "Going Postal", "Thud!", "Wintersmith",
    "Making Money", "Unseen Academicals", "I Shall Wear Midnight", "Snuff",
    "Raising Steam", "The Shepherd's Crown"
];
const NVL_COLOUR_OF_MAGIC = 0;
const NVL_SOURCERY = 4;
const NVL_MASKERADE = 17;
const NVL_AMAZING_MAURICE = 27;
const NVL_THUD = 33;

export function noveltitle(novidx)
{
    let j, k = C.sir_Terry_novels.length;

    j = C.rn2(k, 1615, 'noveltitle');
    if (novidx) {
        if (novidx.value == -1)
            novidx.value = j;
        else if (novidx.value >= 0 && novidx.value < k)
            j = novidx.value;
    }
    return C.sir_Terry_novels[j];
}

/* figure out canonical novel title from player-specified one */
export function lookup_novel(lookname, idx)
{
    lookname = C.charPointer(lookname);
    let k;

    /*
     * Accept variant spellings:
     * _The_Colour_of_Magic_ uses British spelling, and American
     * editions keep that, but we also recognize American spelling;
     * _Sourcery_ is a joke rather than British spelling of "sorcery".
     */
    if (!C.strcmpi(C.The(lookname), "The Color of Magic"))
        lookname = C.sir_Terry_novels[NVL_COLOUR_OF_MAGIC];
    else if (!C.strcmpi(lookname, "Sorcery"))
        lookname = C.sir_Terry_novels[NVL_SOURCERY];
    else if (!C.strcmpi(lookname, "Masquerade"))
        lookname = C.sir_Terry_novels[NVL_MASKERADE];
    else if (!C.strcmpi(C.The(lookname), "The Amazing Maurice"))
        lookname = C.sir_Terry_novels[NVL_AMAZING_MAURICE];
    else if (!C.strcmpi(lookname, "Thud"))
        lookname = C.sir_Terry_novels[NVL_THUD];

    for (k = 0; k < C.sir_Terry_novels.length; ++k) {
        if (!C.strcmpi(lookname, C.sir_Terry_novels[k])
            || !C.strcmpi(C.The(lookname), C.sir_Terry_novels[k])) {
            if (idx)
                idx.value = k;
            return C.sir_Terry_novels[k];
        }
    }
    /* name not found; if novelidx is already set, override the name */
    if (idx && (idx.value >= 0 && idx.value < C.sir_Terry_novels.length))
        return C.sir_Terry_novels[idx.value];

    return 0;
}

/*do_name.c*/
