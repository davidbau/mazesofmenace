import { C } from '../c-runtime/context.js';

/* NetHack 5.0	objnam.c	$NHDT-Date: 1745114235 2025/04/19 17:57:15 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.453 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2011. */
/* NetHack may be freely redistributed.  See license for details. */
/* "an uncursed greased partly eaten guardian naga hatchling [corpse]" */
/* (56) */
/* Concat(): append text to base, adjusted by delta, with bounds checking
   via a pair of behind-the-scenes variables; delta is either 0 for normal
   concatenation or 1 to replace the final character with something */
/* convert signed ptrdiff_t to unsigned size_t */
/* true for gems/rocks that should have " stone" appended to their names */
export const Japanese_items = [
    {item: "SHORT_SWORD", name: "wakizashi"},
    {item: "BROADSWORD", name: "ninja-to"},
    {item: "FLAIL", name: "nunchaku"},
    {item: "GLAIVE", name: "naginata"},
    {item: "LOCK_PICK", name: "osaku"},
    {item: "WOODEN_HARP", name: "koto"},
    {item: "MAGIC_HARP", name: "magic koto"},
    {item: "KNIFE", name: "shito"},
    {item: "PLATE_MAIL", name: "tanko"},
    {item: "HELMET", name: "kabuto"},
    {item: "LEATHER_GLOVES", name: "yugake"},
    {item: "FOOD_RATION", name: "gunyoki"},
    {item: "POT_BOOZE", name: "sake"},
    {item: 0, name: ""}
];

export function strprepend(s, pref) {
    s = C.argument(s, "char *");
    pref = C.argument(pref, "const char *");
    let star_s = C.deref(s, "char");
    let i = C.int(C.strlen(pref));
    if (Number(i > C.PREFIX)) {
        C.impossible(C.literal("PREFIX too short (for %d)."), i, "i");
        return s;
    }
    C.copynchars(C.ptrAdd(s, -(i), "char"), pref, C.int((i + 1)));
    C.store(s, "char", star_s);
    return C.ptrAdd(s, -(i), "char");
}

/* manage a pool of BUFSZ buffers, so callers don't have to */
export function nextobuf() {
    (C.objnamState.obufidx = C.int(((C.int((C.objnamState.obufidx + 1))) % C.NUMOBUF)));
    return C.deref(C.ptrAdd(C.obufs, C.objnamState.obufidx, "char[256]"), "char[256]");
}

/* put the most recently allocated buffer back if possible */
export function releaseobuf(bufp) {
    bufp = C.argument(bufp, "char *");
/* caller may not know whether bufp is the most recently allocated
       buffer; if it isn't, do nothing; note that because of the somewhat
       obscure PREFIX handling for object name formatting by xname(),
       the pointer our caller has and is passing to us might be into the
       middle of an obuf rather than the address returned by nextobuf() */
    if (Number(!!(C.ptrCompare(bufp, C.deref(C.ptrAdd(C.obufs, C.objnamState.obufidx, "char[256]"), "char[256]"), ">=") && C.ptrCompare(bufp, C.ptrAdd(C.deref(C.ptrAdd(C.obufs, C.objnamState.obufidx, "char[256]"), "char[256]"), BigInt(C.sizeof("char[256]")), "char"), "<")))) /* obufs[][BUFSZ] */
    (C.objnamState.obufidx = C.int(((C.int((C.int((C.objnamState.obufidx - 1)) + C.NUMOBUF))) % C.NUMOBUF)));
}

/* used by display_pickinv (invent.c, main whole-inventory routine) to
   release each successive doname() result in order to try to avoid
   clobbering all the obufs when 'perm_invent' is enabled and updated
   while one or more obufs have been allocated but not released yet */
export function maybereleaseobuf(obuffer) {
    obuffer = C.argument(obuffer, "char *");
    releaseobuf(obuffer);
/*
     * An example from 3.6.x where all obufs got clobbered was when a
     * monster used a bullwhip to disarm the hero of a two-handed weapon:
     * "The ogre lord yanks Cleaver from your corpses!"
     |
     | hand = body_part(HAND);
     | if (use_plural)      // switches 'hand' from static buffer to an obuf
     |   hand = makeplural(hand);
      ...
     | release_worn_item(); // triggers full inventory update for perm_invent
      ...
     | pline(..., hand);    // the obuf[] for "hands" was clobbered with the
     |                      //+ partial formatting of an item from invent
     *
     * Another example was from writing a scroll without room in invent to
     * hold it after being split from a stack of blank scrolls:
     * "Oops!  food rations out of your grasp!"
     * hold_another_object() was passed 'the(aobjnam(newscroll, "slip"))'
     * as an argument and that should have yielded
     * "Oops!  The scroll of <foo> slips out of your grasp!"
     * but attempting to add the item to inventory triggered update for
     * perm_invent and the result from 'the(...)' was clobbered by partial
     * formatting of some inventory item.  [It happened in a shop and the
     * shk claimed ownership of the new scroll, but that wasn't relevant.]
     * That got fixed earlier, by delaying update_inventory() during
     * hold_another_object() rather than by avoiding using all the obufs.
     */
}

export function obj_typename(otyp) {
    otyp = C.argument(otyp, "int");
    let buf = nextobuf();
    let ocl = C.ptrAdd(C.objects, otyp, "struct objclass");
    let actualn = ((C.deref(C.ptrAdd(C.obj_descr, ((C.deref(ocl, "struct objclass"))).oc_name_idx, "struct objdescr"), "struct objdescr")).oc_name);
    let dn = ((C.deref(C.ptrAdd(C.obj_descr, ((C.deref(ocl, "struct objclass"))).oc_descr_idx, "struct objdescr"), "struct objdescr")).oc_descr);
    let un = (ocl).oc_uname;
    let nn = C.int((ocl).oc_name_known);
    if ((Number(((C.gu).urole).mnum == (C.PM_SAMURAI)))) {
        (actualn = Japanese_item_name(otyp, actualn));
        if (Number(!!(Number(otyp == C.WOODEN_HARP) || Number(otyp == C.MAGIC_HARP)))) (dn = C.literal("koto"));
    }
/* generic items don't have an actual-name; we shouldn't ever be called
       for those; pacify static analyzer without resorting to impossible() */
    if (Number(!(actualn))) (actualn = (((Number(!!(Number(otyp > 0) && Number(otyp < C.MAXOCLASSES))))) ? C.literal("generic") : C.literal("object?")));
    C.store(C.ptrAdd(buf, 0, "char"), "char", C.char(0));
/* redundant */
    switch ((ocl).oc_class) {
        case (C.COIN_CLASS):
            return C.strcpy(buf, actualn);
/* "gold piece" */
        case (C.POTION_CLASS):
            C.strcpy(buf, C.literal("potion"));
        break;
        case (C.SCROLL_CLASS):
            C.strcpy(buf, C.literal("scroll"));
        break;
        case (C.WAND_CLASS):
            C.strcpy(buf, C.literal("wand"));
        break;
        case (C.SPBOOK_CLASS):
            if (Number(otyp != C.SPE_NOVEL)) {
                C.strcpy(buf, C.literal("spellbook"));
            }
            else {
                C.strcpy(buf, ((Number(!(nn))) ? C.literal("book") : C.literal("novel")));
                (nn = 0);
            }
        break;
        case (C.RING_CLASS):
            C.strcpy(buf, C.literal("ring"));
        break;
        case (C.AMULET_CLASS):
            if (nn) C.strcpy(buf, actualn);
            else C.strcpy(buf, C.literal("amulet"));
        if (un) xcalled(buf, C.int((C.BUFSZ - (((dn) ? C.int((C.int(C.strlen(dn)) + 3)) : 0)))), C.literal(""), un);
        if (dn) C.sprintf(C.eos(buf), C.literal(" (%s)"), dn, "p");
        return buf;
        case (C.ARMOR_CLASS):
            if (Number(!!(Number((C.deref(C.ptrAdd(C.objects, otyp, "struct objclass"), "struct objclass")).oc_armcat == C.ARM_GLOVES) || Number((C.deref(C.ptrAdd(C.objects, otyp, "struct objclass"), "struct objclass")).oc_armcat == C.ARM_BOOTS)))) C.strcpy(buf, C.literal("pair of "));
            else if (Number(!!(Number(otyp >= C.GRAY_DRAGON_SCALES) && Number(otyp <= C.YELLOW_DRAGON_SCALES)))) C.strcpy(buf, C.literal("set of "));
        ;
/*FALLTHRU*/
        default:
            if (nn) {
                C.strcat(buf, actualn);
                if ((Number(!!(Number(otyp == C.FLINT) || (Number(!!(Number(C.int((C.deref(C.ptrAdd(C.objects, otyp, "struct objclass"), "struct objclass")).oc_material) == C.GEMSTONE) && (Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(otyp != C.DILITHIUM_CRYSTAL) && Number(otyp != C.RUBY))) && Number(otyp != C.DIAMOND))) && Number(otyp != C.SAPPHIRE))) && Number(otyp != C.BLACK_OPAL))) && Number(otyp != C.EMERALD))) && Number(otyp != C.OPAL))))))))))) C.strcat(buf, C.literal(" stone"));
                if (un) /* 3: length of " (" + ")" which will enclose 'dn' */
                xcalled(buf, C.int((C.BUFSZ - (((dn) ? C.int((C.int(C.strlen(dn)) + 3)) : 0)))), C.literal(""), un);
                if (dn) C.sprintf(C.eos(buf), C.literal(" (%s)"), dn, "p");
            }
            else {
                C.strcat(buf, ((dn) ? dn : actualn));
                if (Number((ocl).oc_class == C.GEM_CLASS)) C.strcat(buf, (((Number(C.int((ocl).oc_material) == C.MINERAL))) ? C.literal(" stone") : C.literal(" gem")));
                if (un) xcalled(buf, C.BUFSZ, C.literal(""), un);
            }
        return buf;
    }
/* here for ring/scroll/potion/wand */
    if (nn) {
        if ((ocl).oc_unique) C.strcpy(buf, actualn);
        else /* avoid spellbook of Book of the Dead */
        C.sprintf(C.eos(buf), C.literal(" of %s"), actualn, "p");
    }
    if (un) /* 3: length of " (" + ")" which will enclose 'dn' */
    xcalled(buf, C.int((C.BUFSZ - (((dn) ? C.int((C.int(C.strlen(dn)) + 3)) : 0)))), C.literal(""), un);
    if (dn) C.sprintf(C.eos(buf), C.literal(" (%s)"), dn, "p");
    return buf;
}

/* less verbose result than obj_typename(); either the actual name
   or the description (but not both); user-assigned name is ignored */
export function simple_typename(otyp) {
    otyp = C.argument(otyp, "int");
    let bufp;
    let pp;
    let save_uname = (C.deref(C.ptrAdd(C.objects, otyp, "struct objclass"), "struct objclass")).oc_uname;
    ((C.deref(C.ptrAdd(C.objects, otyp, "struct objclass"), "struct objclass")).oc_uname = 0);
/* suppress any name given by user */
    (bufp = C.callLocal(obj_typename, otyp));
    ((C.deref(C.ptrAdd(C.objects, otyp, "struct objclass"), "struct objclass")).oc_uname = save_uname);
    if (C.ptrCompare(((pp = C.strstri(bufp, C.literal(" (")))), 0, "!=")) C.store(pp, "char", C.char(0));
/* strip the appended description */
    return bufp;
}

/* typename for debugging feedback where data involved might be suspect */
export function safe_typename(otyp) {
    otyp = C.argument(otyp, "int");
    let save_nameknown;
    let res = 0;
    if (Number(!!(Number(!!(Number(otyp < C.STRANGE_OBJECT) || Number(otyp >= C.NUM_OBJECTS))) || Number(!(((C.deref(C.ptrAdd(C.obj_descr, ((C.deref(C.ptrAdd(C.objects, otyp, "struct objclass"), "struct objclass"))).oc_name_idx, "struct objdescr"), "struct objdescr")).oc_name)))))) {
        (res = nextobuf());
        C.sprintf(res, C.literal("glorkum[%d]"), otyp, "i");
        C.impossible(C.literal("safe_typename: %s"), res, "p");
    }
    else {
/* force it to be treated as fully discovered */
        (save_nameknown = (C.deref(C.ptrAdd(C.objects, otyp, "struct objclass"), "struct objclass")).oc_name_known);
        ((C.deref(C.ptrAdd(C.objects, otyp, "struct objclass"), "struct objclass")).oc_name_known = C.uint(1));
        (res = simple_typename(otyp));
        ((C.deref(C.ptrAdd(C.objects, otyp, "struct objclass"), "struct objclass")).oc_name_known = save_nameknown);
    }
    return res;
}

export function obj_is_pname(obj) {
    obj = C.argument(obj, "struct obj *");
    if (Number(!!(Number(!((obj).oartifact)) || Number(!((Number(!!(((obj)).oextra && ((((obj)).oextra).oname))))))))) return (C.char(0));
    if (Number(!!(Number(!((C.program_state).gameover)) && Number(!((C.iflags).override_ID))))) {
        if (not_fully_identified(obj)) return (C.char(0));
    }
    return (C.char(1));
}

/* Give the name of an object seen at a distance.  Unlike xname/doname,
   we usually don't want to set dknown if it's not set already. */
export function distant_name(obj, func) /* object to be formatted */
/* formatting routine (usually xname or doname) */
{
    obj = C.argument(obj, "struct obj *");
    func = C.argument(func, "char *(*)(struct obj *)");
    let str;
    let save_oid;
    const ox = C.scalarLocal("coordxy", C.short(0));
    const oy = C.scalarLocal("coordxy", C.short(0));
/*
         * (r * r): square of the x or y distance;
         * (r * r) * 2: sum of squares of both x and y distances
         * (r * r) * 2 - r: instead of a square extending from the hero,
         * round the corners (so shorter distance imposed for diagonal).
         *
         * distu() matrix covering a range of 3+ for one quadrant:
         *  16 17  -  -  -
         *   9 10 13 18  -
         *   4  5  8 13  -
         *   1  2  5 10 17
         *   @  1  4  9 16
         * Theoretical r==1 would yield 1.
         * r==2 yields 6, functionally equivalent to 5, a knight's jump,
         * r==3, the xray range of the Eyes of the Overworld, yields 15.
         */
    let r = (((Number((C.u).xray_range > 2))) ? (C.u).xray_range : 2);
    let neardist = C.int((C.int(((C.int((r * r))) * 2)) - r));
/* same as r*r + r*(r-1) */
/* setting o_id to 0 prevents xname() from adding T-shirt or apron
      slogan, Hawaiian shirt motif, or candy wrapper label when called
      with 'program_state.gameover' set; we want this suppression for
      html-dump (not implemented in nethack) to prevent object-on-map
      tooltips from including that extra text; also guards against a
      potential change to minimal_xname() [indirectly used by attribute
      disclosure] that propagates o_id rather than leave it 0, and
      against a potential extra chance to browse the map with getpos()
      during final disclosure (not currently implemented, nor planned) */
    (save_oid = (obj).o_id);
    if ((C.program_state).gameover) ((obj).o_id = C.uint(0));
/* this maybe-nearby part used to be replicated in multiple callers */
    if (Number(!!(Number(!!(C.get_obj_location(obj, ox, oy, 0) && (Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, oy.value, "seenV *"), "seenV *"), ox.value, "seenV"), "seenV") & 2))) != 0)))) && (Number(!!((obj).oartifact || Number(C.dist2((ox.value), (oy.value), (C.u).ux, (C.u).uy) <= neardist))))))) {
/* side-effects:  treat as having been seen up close;
           cansee() is True hence hero isn't Blind so if 'func' is
           the usual doname or xname, obj->dknown will become set
           and then for an artifact, find_artifact() will be called */
        (str = C.callFormatter((C.deref(func, "char *(struct obj *)")), obj));
    }
    else {
/* prior to 3.6.1, this used to save current blindness state,
           explicitly set state to hero-is-blind, make the call (which
           won't set obj->dknown when blind), then restore the saved
           value; but the Eyes of the Overworld override blindness and
           would let characters wearing them get obj->dknown set for
           distant items, so the external flag was added */
        C.bump(C.fieldRef(C.gd, "distantname"), 1, false, "int");
        (str = C.callFormatter((C.deref(func, "char *(struct obj *)")), obj));
        C.bump(C.fieldRef(C.gd, "distantname"), -1, false, "int");
    }
    ((obj).o_id = save_oid);
/* reset to normal */
    return str;
}

/* convert player specified fruit name into corresponding fruit juice name
   ("slice of pizza" -> "pizza juice" rather than "slice of pizza juice") */
export function fruitname(juice) /* whether or not to append " juice" to the name */
{
    juice = C.argument(juice, "boolean");
    let buf = nextobuf();
    let fruit_nam = C.strstri((C.svp).pl_fruit, C.literal(" of "));
    if (fruit_nam) (fruit_nam = C.ptrAdd(fruit_nam, 4, "const char"));
    else /* skip past " of " */
    (fruit_nam = (C.svp).pl_fruit);
/* use it as is */
    C.sprintf(buf, C.literal("%s%s"), makesingular(fruit_nam), ((juice) ? C.literal(" juice") : C.literal("")), "pp");
    return buf;
}

/* look up a named fruit by index (1..127) */
export function fruit_from_indx(indx) {
    indx = C.argument(indx, "int");
    let f;
    for ((f = (C.gf).ffruit); f; (f = (f).nextf)) if (Number((f).fid == indx)) break;
    return f;
}

/* look up a named fruit by name */
export function fruit_from_name(fname, exact, highest_fid) /* False: prefix or exact match, True: exact match only */
/* optional output; only valid if 'fname' isn't found */
{
    fname = C.argument(fname, "const char *");
    exact = C.argument(exact, "boolean");
    highest_fid = C.argument(highest_fid, "int *");
    let f;
    let tentativef;
    let altfname;
    let k;
/*
     * note: named fruits are case-sensitive...
     */
    if (highest_fid) C.store(highest_fid, "int", 0);
/* first try for an exact match */
    for ((f = (C.gf).ffruit); f; (f = (f).nextf)) if (Number(!(C.strcmp((f).fname, fname)))) return f;
    else if (Number(!!(highest_fid && Number((f).fid > C.deref(highest_fid, "int"))))) C.store(highest_fid, "int", (f).fid);
/* didn't match as-is; if caller is willing to accept a prefix
       match, try to find one; we want to find the longest prefix that
       matches, not the first */
    if (Number(!(exact))) {
        (tentativef = 0);
        for ((f = (C.gf).ffruit); f; (f = (f).nextf)) {
            (k = C.Strlen_((f).fname, C.literal("fruit_from_name"), 470));
            if (Number(!!(Number(!!(Number(!(C.strncmp((f).fname, fname, C.ulong(k)))) && (Number(!!(Number(!(C.deref(C.ptrAdd(fname, k, "const char"), "const char"))) || Number(C.deref(C.ptrAdd(fname, k, "const char"), "const char") == 32)))))) && (Number(!!(Number(!(tentativef)) || Number(C.ulong(k) > C.strlen((tentativef).fname)))))))) (tentativef = f);
        }
        (f = tentativef);
    }
/* if we still don't have a match, try singularizing the target;
       for exact match, that's trivial, but for prefix, it's hard */
    if (Number(!(f))) {
        (altfname = makesingular(fname));
        for ((f = (C.gf).ffruit); f; (f = (f).nextf)) {
            if (Number(!(C.strcmp((f).fname, altfname)))) break;
        }
        releaseobuf(altfname);
    }
    if (Number(!!(Number(!(f)) && Number(!(exact))))) {
        const fnamebuf = C.localArray("char[256]", 0);
        let p;
        let fname_k = C.Strlen_(fname, C.literal("fruit_from_name"), 490);
/* length of assumed plural fname */
        (tentativef = 0);
        for ((f = (C.gf).ffruit); f; (f = (f).nextf)) {
            (k = C.Strlen_((f).fname, C.literal("fruit_from_name"), 494));
/* reload fnamebuf[] each iteration in case it gets modified;
               there's no need to recalculate fname_k */
            C.strcpy(fnamebuf, fname);
/* bug? if singular of fname is longer than plural,
               failing the 'fname_k > k' test could skip a viable
               candidate; unfortunately, we can't singularize until
               after stripping off trailing stuff and we can't get
               accurate fname_k until fname has been singularized;
               compromise and use 'fname_k >= k' instead of '>',
               accepting 1 char length discrepancy without risking
               false match (I hope...) */
            if (Number(!!(Number(fname_k >= k) && C.ptrCompare(((p = C.strchr(C.ptrAdd(fnamebuf, k, "char"), 32))), 0, "!=")))) {
                C.store(p, "char", C.char(0));
/* truncate at 1st space past length of f->fname */
                (altfname = makesingular(fnamebuf));
                (k = C.Strlen_(altfname, C.literal("fruit_from_name"), 509));
/* actually revised 'fname_k' */
                if (Number(!!(Number(!(C.strcmp((f).fname, altfname))) && (Number(!!(Number(!(tentativef)) || Number(C.ulong(k) > C.strlen((tentativef).fname)))))))) (tentativef = f);
                releaseobuf(altfname);
/* avoid churning through all obufs */
            }
        }
        (f = tentativef);
    }
    return f;
}

/* sort the named-fruit linked list by fruit index number */
export function reorder_fruit(forward) {
    forward = C.argument(forward, "boolean");
    let f;
    const allfr = C.localArray("struct fruit *[128]", 0);
    let i;
    let j;
    let k = C.int((C.ulong((BigInt(C.sizeof("struct fruit *[128]")) / BigInt(C.sizeof("struct fruit *"))))));
    for ((i = 0); Number(i < k); (++i)) C.store(C.ptrAdd(allfr, i, "struct fruit *"), "struct fruit *", 0);
    for ((f = (C.gf).ffruit); f; (f = (f).nextf)) {
/* without sanity checking, this would reduce to 'allfr[f->fid]=f' */
        (j = (f).fid);
        if (Number(!!(Number(j < 1) || Number(j >= k)))) {
            C.impossible(C.literal("reorder_fruit: fruit index (%d) out of range"), j, "i");
            return;
/* don't sort after all; should never happen... */
        }
        else if (C.deref(C.ptrAdd(allfr, j, "struct fruit *"), "struct fruit *")) {
            C.impossible(C.literal("reorder_fruit: duplicate fruit index (%d)"), j, "i");
            return;
        }
        C.store(C.ptrAdd(allfr, j, "struct fruit *"), "struct fruit *", f);
    }
    ((C.gf).ffruit = 0);
/* reset linked list; we're rebuilding it from scratch */
/* slot [0] will always be empty; must start 'i' at 1 to avoid
       [k - i] being out of bounds during first iteration */
    for ((i = 1); Number(i < k); (++i)) {
/* for forward ordering, go through indices from high to low;
           for backward ordering, go from low to high */
        (j = ((forward) ? (C.int((k - i))) : i));
        if (C.deref(C.ptrAdd(allfr, j, "struct fruit *"), "struct fruit *")) {
            ((C.deref(C.ptrAdd(allfr, j, "struct fruit *"), "struct fruit *")).nextf = (C.gf).ffruit);
            ((C.gf).ffruit = C.deref(C.ptrAdd(allfr, j, "struct fruit *"), "struct fruit *"));
        }
    }
}

/* add "<pfx> called <sfx>" to end of buf, truncating if necessary */
export function xcalled(buf, siz, pfx, sfx) /* eos(obuf) or eos(&obuf[PREFIX]) */
/* BUFSZ or BUFSZ-PREFIX */
/* usually class string, sometimes more specific */
/* user assigned type name */
{
    buf = C.argument(buf, "char *");
    siz = C.argument(siz, "int");
    pfx = C.argument(pfx, "const char *");
    sfx = C.argument(sfx, "const char *");
    let bufsiz = C.int((C.int((siz - 1)) - C.int(C.strlen(buf))));
    let pfxlen = C.int((C.ulong((C.ulong((C.strlen(pfx) + BigInt(C.sizeof("char[9]")))) - BigInt(C.sizeof("char[1]"))))));
    if (Number(pfxlen > bufsiz)) C.panic(C.literal("xcalled: not enough room for prefix (%d > %d)"), pfxlen, bufsiz, "ii");
    C.sprintf(C.eos(buf), C.literal("%s called %.*s"), pfx, C.int((bufsiz - pfxlen)), sfx, "pip");
}

export function xname(obj) {
    obj = C.argument(obj, "struct obj *");
    return C.callLocal(xname_flags, obj, C.CXN_NORMAL);
}

export function xname_flags(obj, cxn_flags) /* bitmask of CXN_xxx values */
{
    obj = C.argument(obj, "struct obj *");
    cxn_flags = C.argument(cxn_flags, "unsigned int");
    let buf;
    let obufp;
    let buf_end;
    let buf_eos;
    let bufspaceleft;
    let typ = (obj).otyp;
    let ocl = C.ptrAdd(C.objects, typ, "struct objclass");
    let nn = C.int((ocl).oc_name_known);
    let omndx = (obj).corpsenm;
    let actualn = ((C.deref(C.ptrAdd(C.obj_descr, ((C.deref(ocl, "struct objclass"))).oc_name_idx, "struct objdescr"), "struct objdescr")).oc_name);
    let dn = ((C.deref(C.ptrAdd(C.obj_descr, ((C.deref(ocl, "struct objclass"))).oc_descr_idx, "struct objdescr"), "struct objdescr")).oc_descr);
    let un = (ocl).oc_uname;
    let pluralize = C.char(Number(!!((Number((obj).quan != 1n)) && Number(!((C.uint((cxn_flags & C.CXN_SINGULAR))))))));
    let known;
    let dknown;
    let bknown;
    ((C.gx).xnamep = nextobuf());
/* set up primary work buffer; the first 'PREFIX' bytes are set
       aside for use by doname() */
    (buf = C.ptrAdd((C.gx).xnamep, C.PREFIX, "char"));
/* leave room for "17 -3 " */
    (buf_end = C.ptrAdd(C.ptrAdd((C.gx).xnamep, C.BUFSZ, "char"), -(1), "char"));
/* last byte within the obuf[] */
    C.store(C.ptrAdd(buf, 0, "char"), "char", C.char(0));
    ((buf_eos = C.eos(buf)), (bufspaceleft = C.ulong((C.ptrDiff(buf_end, buf_eos, "char")))));
/* set buf_eos and bufspaceleft */
    if ((Number(((C.gu).urole).mnum == (C.PM_SAMURAI)))) {
        (actualn = Japanese_item_name(typ, actualn));
        if (Number(!!(Number(typ == C.WOODEN_HARP) || Number(typ == C.MAGIC_HARP)))) (dn = C.literal("koto"));
    }
/* generic items don't have an actual-name; we shouldn't ever be called
       for those; pacify static analyzer without resorting to impossible() */
    if (Number(!(actualn))) (actualn = (((Number(!!(Number(typ > 0) && Number(typ < C.MAXOCLASSES))))) ? C.literal("generic") : C.literal("object?")));
/* 3.6.2: this used to be part of 'dn's initialization, but it
       needs to come after possibly overriding 'actualn' */
    if (Number(!(dn))) (dn = actualn);
/*
     * clean up known when it's tied to oc_name_known, eg after AD_DRIN
     * This is only required for unique objects since the article
     * printed for the object is tied to the combination of the two
     * and printing the wrong article gives away information.
     */
    if (Number(!!(Number(!!(Number(!(nn)) && C.int((ocl).oc_uses_known))) && C.int((ocl).oc_unique)))) ((obj).known = C.uint(0));
    if (Number(!!(Number(!((Number(!!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).extrinsic))) && Number(!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).blocked))))))) && Number(!((C.gd).distantname))))) C.observe_object(obj);
    if ((Number(((C.gu).urole).mnum == (C.PM_CLERIC)))) ((obj).bknown = C.uint(1));
/* avoid set_bknown() to bypass update_inventory() */
    if ((C.iflags).override_ID) {
        (known = (dknown = (bknown = (C.char(1)))));
        (nn = 1);
    }
    else {
        (known = C.char((obj).known));
        (dknown = C.char((obj).dknown));
        (bknown = C.char((obj).bknown));
    }
/*
     * Maybe find a previously unseen artifact.
     *
     * Assumption 1: if an artifact object is being formatted, it is
     *  being shown to the hero (on floor, or looking into container,
     *  or probing a monster, or seeing a monster wield it).
     * Assumption 2: if in a pile that has been stepped on, the
     *  artifact won't be noticed for cases where the pile to too deep
     *  to be auto-shown, unless the player explicitly looks at that
     *  spot (via ':').  Might need to make an exception somehow (at
     *  the point where the decision whether to auto-show gets made?)
     *  when an artifact is on the top of the pile.
     * Assumption 3: since this is used for livelog events, not being
     *  100% correct won't negatively affect the player's current game.
     *
     * We use the real obj->dknown rather than the override_ID variant
     * so that wizard-mode ^I doesn't cause a not-yet-seen artifact in
     * inventory (picked up while blind, still blind) to become found.
     */
    if (Number(!!((obj).oartifact && C.int((obj).dknown)))) C.find_artifact(obj);
    no_name: {
    nameit: {
    if (obj_is_pname(obj)) break nameit;
/* Some classes use strcpy(buf, something)+strcat(buf, otherthing).
       In those cases, ConcUpdate() is needed in between if Concat()
       will be used for the strcat() part.  Other classes just use
       strcpy(buf, something) and the ConcUpdate() can be deferred
       until after the switch. */
    switch ((obj).oclass) {
        case (C.AMULET_CLASS):
            if (Number(!(dknown))) C.strcpy(buf, C.literal("amulet"));
            else if (Number(!!(Number(typ == C.AMULET_OF_YENDOR) || Number(typ == C.FAKE_AMULET_OF_YENDOR)))) /* each must be identified individually */
            C.strcpy(buf, ((known) ? actualn : dn));
            else if (nn) C.strcpy(buf, actualn);
            else if (un) xcalled(buf, C.int((C.BUFSZ - C.PREFIX)), C.literal("amulet"), un);
            else C.sprintf(buf, C.literal("%s amulet"), dn, "p");
        break;
        case (C.WEAPON_CLASS):
            if (Number(!!((Number(!!((Number(!!(Number(!!(Number((obj).oclass == C.WEAPON_CLASS) && Number((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_subtyp >= C.int((-C.P_SHURIKEN))))) && Number((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_subtyp <= C.int((-C.P_BOW)))))) || C.permapoisoned(obj)))) && C.int((obj).opoisoned)))) C.strcpy(buf, C.literal("poisoned "));
        ;
/*FALLTHRU*/
        case (C.VENOM_CLASS):
            case (C.TOOL_CLASS):
/* note: lenses or towel prefix would overwrite poisoned weapon
           prefix if both were simultaneously possible, but they aren't */
                if (Number(typ == C.LENSES)) C.strcpy(buf, C.literal("pair of "));
                else if ((Number(!!(Number(((obj)).otyp == C.TOWEL) && Number(((obj)).spe > 0))))) C.strcpy(buf, (((Number((obj).spe < 3))) ? C.literal("moist ") : C.literal("wet ")));
        if (Number(!(dknown))) C.strcat(buf, dn);
        else if (nn) C.strcat(buf, actualn);
        else if (un) xcalled(buf, C.int((C.BUFSZ - C.PREFIX)), dn, un);
        else C.strcat(buf, dn);
        ((buf_eos = C.eos(buf)), (bufspaceleft = C.ulong((C.ptrDiff(buf_end, buf_eos, "char")))));
        if (Number(!!(Number(typ == C.FIGURINE) && Number(omndx != C.NON_PM)))) {
            const anbuf = C.localArray("char[10]", 0);
/* [4] would be enough: 'a','n',' ','\0' */
            let pm_name = C.obj_pmname(obj);
            do {
                C.nh_snprintf(C.literal("xname_flags"), 713, C.ptrAdd(buf_eos, -(0), "char"), C.ulong((bufspaceleft + C.ulong(0))), C.literal(" of %s%s"), just_an(anbuf, pm_name), pm_name, "pp");
                ((buf_eos = C.eos(buf)), (bufspaceleft = C.ulong((C.ptrDiff(buf_end, buf_eos, "char")))));
            }
            while (0);
        }
        else if ((Number(!!(Number(((obj)).otyp == C.TOWEL) && Number(((obj)).spe > 0))))) {
            if ((C.flags).debug) do {
                C.nh_snprintf(C.literal("xname_flags"), 716, C.ptrAdd(buf_eos, -(0), "char"), C.ulong((bufspaceleft + C.ulong(0))), C.literal(" (%d)"), (obj).spe, "i");
                ((buf_eos = C.eos(buf)), (bufspaceleft = C.ulong((C.ptrDiff(buf_end, buf_eos, "char")))));
            }
            while (0);
        }
        break;
        case (C.ARMOR_CLASS):
/* depends on order of the dragon scales objects */
            if (Number(!!(Number(typ >= C.GRAY_DRAGON_SCALES) && Number(typ <= C.YELLOW_DRAGON_SCALES)))) {
                C.sprintf(buf, C.literal("set of %s"), actualn, "p");
                break;
            }
            else if (Number(!!((Number(!!(Number((obj).oclass == C.ARMOR_CLASS) && Number((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_subtyp == C.ARM_BOOTS)))) || (Number(!!(Number((obj).oclass == C.ARMOR_CLASS) && Number((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_subtyp == C.ARM_GLOVES))))))) {
                C.strcpy(buf, C.literal("pair of "));
/*FALLTHRU*/
            }
            else if (Number(!!((Number(!!(Number((obj).oclass == C.ARMOR_CLASS) && Number((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_subtyp == C.ARM_SHIELD)))) && Number(!(dknown))))) {
                if (Number(!!(Number((obj).otyp >= C.ELVEN_SHIELD) && Number((obj).otyp <= C.ORCISH_SHIELD)))) {
                    C.strcpy(buf, C.literal("shield"));
                    break;
                }
                else if (Number((obj).otyp == C.SHIELD_OF_REFLECTION)) {
                    C.strcpy(buf, C.literal("smooth shield"));
                    break;
                }
            }
        ((buf_eos = C.eos(buf)), (bufspaceleft = C.ulong((C.ptrDiff(buf_end, buf_eos, "char")))));
        if (nn) do {
            C.strncat(C.ptrAdd(buf_eos, -(0), "char"), actualn, C.ulong((bufspaceleft + C.ulong(0))));
            ((buf_eos = C.eos(buf)), (bufspaceleft = C.ulong((C.ptrDiff(buf_end, buf_eos, "char")))));
        }
        while (0);
        else if (un) xcalled(buf, C.int((C.BUFSZ - C.PREFIX)), armor_simple_name(obj), un);
        else do {
            C.strncat(C.ptrAdd(buf_eos, -(0), "char"), dn, C.ulong((bufspaceleft + C.ulong(0))));
            ((buf_eos = C.eos(buf)), (bufspaceleft = C.ulong((C.ptrDiff(buf_end, buf_eos, "char")))));
        }
        while (0);
        break;
        case (C.FOOD_CLASS):
/* we could include partly-eaten-hack on fruit but don't need to */
            if (Number(typ == C.SLIME_MOLD)) {
                let f = fruit_from_indx((obj).spe);
                if (Number(!(f))) {
                    C.impossible(C.literal("Bad fruit #%d?"), (obj).spe, "i");
                    C.strcpy(buf, C.literal("fruit"));
                }
                else {
/* fruit name is limited in length to PL_FSIZ; converting
                   to/from singular/plural might increase the length a
                   little but not enough to pose a risk of overflowing buf */
                    C.strcpy(buf, (f).fname);
                    if (pluralize) {
/* ick: already pluralized fruit names are allowed--we
                       want to try to avoid adding a redundant plural suffix;
                       double ick: makesingular() and makeplural() each use
                       and return an obuf but we don't want any particular
                       xname() call to consume more than one of those
                       [note: makeXXX() will be fully evaluated and done with
                       'buf' before strcpy() touches its output buffer] */
                        C.strcpy(buf, (obufp = makesingular(buf)));
                        releaseobuf(obufp);
                        C.strcpy(buf, (obufp = makeplural(buf)));
                        releaseobuf(obufp);
                        (pluralize = (C.char(0)));
                    }
                }
                break;
            }
        if (Number(!!((C.iflags).partly_eaten_hack && (obj).oeaten))) {
/* normally "partly eaten" is supplied by doname() when
               appropriate and omitted by xname(); shrink_glob() wants
               it but uses Yname2() -> yname() -> xname() rather than
               doname() so we've added an external flag to request it */
            do {
                C.strncat(C.ptrAdd(buf_eos, -(0), "char"), C.literal("partly eaten "), C.ulong((bufspaceleft + C.ulong(0))));
                ((buf_eos = C.eos(buf)), (bufspaceleft = C.ulong((C.ptrDiff(buf_end, buf_eos, "char")))));
            }
            while (0);
        }
        if ((obj).globby) {
/* 5.0 added "medium" to replace no-prefix */
            do {
                C.nh_snprintf(C.literal("xname_flags"), 788, C.ptrAdd(buf_eos, -(0), "char"), C.ulong((bufspaceleft + C.ulong(0))), C.literal("%s %s"), (((Number((obj).owt <= C.uint(100)))) ? C.literal("small") : (((Number((obj).owt <= C.uint(300)))) ? C.literal("medium") : (((Number((obj).owt <= C.uint(500)))) ? C.literal("large") : C.literal("very large")))), actualn, "pp");
                ((buf_eos = C.eos(buf)), (bufspaceleft = C.ulong((C.ptrDiff(buf_end, buf_eos, "char")))));
            }
            while (0);
            break;
        }
        do {
            C.strncat(C.ptrAdd(buf_eos, -(0), "char"), actualn, C.ulong((bufspaceleft + C.ulong(0))));
            ((buf_eos = C.eos(buf)), (bufspaceleft = C.ulong((C.ptrDiff(buf_end, buf_eos, "char")))));
        }
        while (0);
        if (Number(!!(Number(typ == C.TIN) && known))) C.tin_details(obj, omndx, buf);
        break;
        case (C.COIN_CLASS):
            case (C.CHAIN_CLASS):
                C.strcpy(buf, actualn);
        break;
        case (C.ROCK_CLASS):
            if (Number(!!(Number(typ == C.STATUE) && Number(omndx != C.NON_PM)))) {
                const anbuf = C.localArray("char[10]", 0);
                let statue_pmname = C.obj_pmname(obj);
                C.nh_snprintf(C.literal("xname_flags"), 813, buf, bufspaceleft, C.literal("%s%s of %s%s"), (((Number(!!((Number(((C.gu).urole).mnum == (C.PM_ARCHEOLOGIST))) && Number((C.int(((obj).spe & 4))) != 0))))) ? C.literal("historic ") : C.literal("")), actualn, (((Number((C.ulong((((C.ptrAdd(C.mons, omndx, "struct permonst"))).mflags2 & C.ulong(524288n)))) != C.ulong(0n)))) ? C.literal("") : ((C.callLocal(the_unique_pm, C.ptrAdd(C.mons, omndx, "struct permonst"))) ? C.literal("the ") : just_an(anbuf, statue_pmname))), statue_pmname, "pppp");
            }
            else if (Number(!!(Number(typ == C.BOULDER) && Number((obj).next_boulder == 1)))) {
/* sometimes caller wants "next boulder" rather than just
               "boulder" (when pushing against a pile of more than one);
               originally we just tested for non-0 but checking for 1 is
               more robust because the default value for that overloaded
               field (obj->corpsenm) is NON_PM (-1) rather than 0 */
                C.strcat(C.strcpy(buf, C.literal("next ")), actualn);
/* "next boulder" */
/* once "next boulder" occurs, subsequent messages should just
               use ordinary "boulder" */
                ((obj).next_boulder = 0);
            }
            else {
                C.strcpy(buf, actualn);
/* "boulder" or "statue" */
            }
        break;
        case (C.BALL_CLASS):
            C.sprintf(buf, C.literal("%sheavy iron ball"), (((Number((obj).owt > (ocl).oc_weight))) ? C.literal("very ") : C.literal("")), "p");
        break;
        case (C.POTION_CLASS):
            if (Number(!!(dknown && C.int((obj).odiluted)))) C.strcpy(buf, C.literal("diluted "));
        if (Number(!!(Number(!!(nn || un)) || Number(!(dknown))))) {
            C.strcat(buf, C.literal("potion"));
            if (Number(!(dknown))) break;
            if (nn) {
                C.strcat(buf, C.literal(" of "));
                if (Number(!!(Number(!!(Number(typ == C.POT_WATER) && bknown)) && (Number(!!(C.int((obj).blessed) || C.int((obj).cursed))))))) {
                    C.strcat(buf, ((C.int((obj).blessed)) ? C.literal("holy ") : C.literal("unholy ")));
                }
                C.strcat(buf, actualn);
            }
            else {
                xcalled(buf, C.int((C.BUFSZ - C.PREFIX)), C.literal(""), un);
            }
        }
        else {
            C.strcat(buf, dn);
            C.strcat(buf, C.literal(" potion"));
        }
        break;
        case (C.SCROLL_CLASS):
            C.strcpy(buf, C.literal("scroll"));
        if (Number(!(dknown))) break;
        if (nn) {
            C.strcat(buf, C.literal(" of "));
            C.strcat(buf, actualn);
        }
        else if (un) {
            xcalled(buf, C.int((C.BUFSZ - C.PREFIX)), C.literal(""), un);
        }
        else if ((ocl).oc_magic) {
            C.strcat(buf, C.literal(" labeled "));
            C.strcat(buf, dn);
        }
        else {
            C.strcpy(buf, dn);
            C.strcat(buf, C.literal(" scroll"));
        }
        break;
        case (C.WAND_CLASS):
            if (Number(!(dknown))) C.strcpy(buf, C.literal("wand"));
            else if (nn) C.sprintf(buf, C.literal("wand of %s"), actualn, "p");
            else if (un) xcalled(buf, C.int((C.BUFSZ - C.PREFIX)), C.literal("wand"), un);
            else C.sprintf(buf, C.literal("%s wand"), dn, "p");
        break;
        case (C.SPBOOK_CLASS):
            if (Number(typ == C.SPE_NOVEL)) {
/* 3.6 tribute */
                if (Number(!(dknown))) C.strcpy(buf, C.literal("book"));
                else if (nn) C.strcpy(buf, actualn);
                else if (un) xcalled(buf, C.int((C.BUFSZ - C.PREFIX)), C.literal("novel"), un);
                else C.sprintf(buf, C.literal("%s book"), dn, "p");
                break;
/* end of tribute */
            }
            else if (Number(!(dknown))) {
                C.strcpy(buf, C.literal("spellbook"));
            }
            else if (nn) {
                if (Number(typ != C.SPE_BOOK_OF_THE_DEAD)) C.strcpy(buf, C.literal("spellbook of "));
                C.strcat(buf, actualn);
            }
            else if (un) {
                xcalled(buf, C.int((C.BUFSZ - C.PREFIX)), C.literal("spellbook"), un);
            }
            else C.sprintf(buf, C.literal("%s spellbook"), dn, "p");
        break;
        case (C.RING_CLASS):
            if (Number(!(dknown))) C.strcpy(buf, C.literal("ring"));
            else if (nn) C.sprintf(buf, C.literal("ring of %s"), actualn, "p");
            else if (un) xcalled(buf, C.int((C.BUFSZ - C.PREFIX)), C.literal("ring"), un);
            else C.sprintf(buf, C.literal("%s ring"), dn, "p");
        break;
        case (C.GEM_CLASS):
{
                let rock = (((Number(C.int((ocl).oc_material) == C.MINERAL))) ? C.literal("stone") : C.literal("gem"));
                if (Number(!(dknown))) {
                    C.strcpy(buf, rock);
                }
                else if (Number(!(nn))) {
                    if (un) xcalled(buf, C.int((C.BUFSZ - C.PREFIX)), rock, un);
                    else C.sprintf(buf, C.literal("%s %s"), dn, rock, "pp");
                }
                else {
                    C.strcpy(buf, actualn);
                    if ((Number(!!(Number(typ == C.FLINT) || (Number(!!(Number(C.int((C.deref(C.ptrAdd(C.objects, typ, "struct objclass"), "struct objclass")).oc_material) == C.GEMSTONE) && (Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(typ != C.DILITHIUM_CRYSTAL) && Number(typ != C.RUBY))) && Number(typ != C.DIAMOND))) && Number(typ != C.SAPPHIRE))) && Number(typ != C.BLACK_OPAL))) && Number(typ != C.EMERALD))) && Number(typ != C.OPAL))))))))))) C.strcat(buf, C.literal(" stone"));
                }
                break;
            }
/* gem */
        default:
            C.sprintf(buf, C.literal("glorkum %d %d %d"), (obj).oclass, typ, (obj).spe, "iii");
        C.impossible(C.literal("xname_flags: %s"), buf, "p");
        break;
    }
/* switch */
/* check whether we've already gone out of bounds of the obuf[], prior
       to pluralization and end-of-game shirt and apron text */
    (buf_eos = C.eos(buf));
    if (C.ptrCompare(buf_eos, buf_end, ">")) {
/* PREFIX is bigger than 6 so there will always be room within the
           obuf[] in front of buf to insert "buf[]="; strncpy(,,N) doesn't
           add '\0' terminator unless fewer than N chars are copied, which
           is what we want, but gcc complains about that so use memcpy() */
        C.paniclog(C.literal("xname"), C.castPointer(C.memcpy(C.castPointer(C.ptrAdd(buf, -(6), "char"), "void *"), C.castPointer(C.literal("buf[]="), "void *"), C.ulong(6)), "char *"));
        C.panic(C.literal("xname: buffer overflow before appending name."), "");
/*NOTREACHED*/
    }
    (bufspaceleft = C.ulong((C.ptrDiff(buf_end, buf_eos, "char"))));
/* if the name should be plural, do that now, after overflow check;
       it could make buf[] become shorter */
    if (pluralize) {
        (obufp = makeplural(buf));
        C.store(C.ptrAdd(buf, 0, "char"), "char", C.char(0));
/* replace the whole string */
        ((buf_eos = C.eos(buf)), (bufspaceleft = C.ulong((C.ptrDiff(buf_end, buf_eos, "char")))));
/* reset buf_eos and bufspaceleft */
        do {
            C.strncat(C.ptrAdd(buf_eos, -(0), "char"), obufp, C.ulong((bufspaceleft + C.ulong(0))));
            ((buf_eos = C.eos(buf)), (bufspaceleft = C.ulong((C.ptrDiff(buf_end, buf_eos, "char")))));
        }
        while (0);
        releaseobuf(obufp);
    }
/* give some extra information when game is over; for end-of-game
       attribute disclosure in wizard mode, ysimple_name() calls
       minimal_xname() which passes us a dummy object with o_id==0;
       tshirt_text(), apron_text(), and so forth base their result on
       o_id and would give inconsistent information compared to what
       just got shown for inventory disclosure; fortunately, we want to
       avoid the 'with text' part of
           "You were acid resistant because of your alchemy smock \
           with text \"Kiss the cook\"."
       when disclosing attributes anyway */
    if (Number(!!(Number(!!((C.program_state).gameover && (obj).o_id)) && Number(bufspaceleft > C.ulong(0))))) {
        let lbl;
        const tmpbuf = C.localArray("char[256]", 0);
/* disclose without breaking illiterate conduct, but mainly tip off
           players who aren't aware that something readable is present */
        switch ((obj).otyp) {
            case (C.T_SHIRT):
                case (C.ALCHEMY_SMOCK):
                    do {
                        C.nh_snprintf(C.literal("xname_flags"), 982, C.ptrAdd(buf_eos, -(0), "char"), C.ulong((bufspaceleft + C.ulong(0))), C.literal(" with text \"%s\""), (((Number((obj).otyp == C.T_SHIRT))) ? C.tshirt_text(obj, tmpbuf) : C.apron_text(obj, tmpbuf)), "p");
                        ((buf_eos = C.eos(buf)), (bufspaceleft = C.ulong((C.ptrDiff(buf_end, buf_eos, "char")))));
                    }
                    while (0);
            break;
            case (C.CANDY_BAR):
                (lbl = C.candy_wrapper_text(obj));
            if (C.deref(lbl, "const char")) do {
                C.nh_snprintf(C.literal("xname_flags"), 987, C.ptrAdd(buf_eos, -(0), "char"), C.ulong((bufspaceleft + C.ulong(0))), C.literal(" labeled \"%s\""), lbl, "p");
                ((buf_eos = C.eos(buf)), (bufspaceleft = C.ulong((C.ptrDiff(buf_end, buf_eos, "char")))));
            }
            while (0);
            break;
            case (C.HAWAIIAN_SHIRT):
                do {
                    C.nh_snprintf(C.literal("xname_flags"), 991, C.ptrAdd(buf_eos, -(0), "char"), C.ulong((bufspaceleft + C.ulong(0))), C.literal(" with %s motif"), an(C.hawaiian_motif(obj, tmpbuf)), "p");
                    ((buf_eos = C.eos(buf)), (bufspaceleft = C.ulong((C.ptrDiff(buf_end, buf_eos, "char")))));
                }
                while (0);
            break;
            default:
                break;
        }
    }
    if (!(Number(!!((Number(!!(((obj)).oextra && ((((obj)).oextra).oname)))) && dknown)))) break no_name;

        do {
            C.strncat(C.ptrAdd(buf_eos, -(0), "char"), C.literal(" named "), C.ulong((bufspaceleft + C.ulong(0))));
            ((buf_eos = C.eos(buf)), (bufspaceleft = C.ulong((C.ptrDiff(buf_end, buf_eos, "char")))));
        }
        while (0);
/* jump directly here if obj passes the has-personal-name test */
    } // nameit
/*assert(has_oname(obj));*/
        (obufp = C.eos(buf));
/* remember where the name will start */
        do {
            C.strncat(C.ptrAdd(buf_eos, -(0), "char"), ((((obj)).oextra).oname), C.ulong((bufspaceleft + C.ulong(0))));
            ((buf_eos = C.eos(buf)), (bufspaceleft = C.ulong((C.ptrDiff(buf_end, buf_eos, "char")))));
        }
        while (0);
/* downcase "The" in "<quest-artifact-item> named The ..." */
        if (Number(!!((obj).oartifact && Number(!(C.strncmp(obufp, C.literal("The "), C.ulong(4))))))) C.store(obufp, "char", C.lowc(C.deref(obufp, "char")));
/* change 'T' in "The " to 't' */
    }
    if (Number(!(C.strncmpi(buf, C.literal("the "), 4)))) (buf = C.ptrAdd(buf, 4, "char"));
    (buf_eos = C.eos(buf));
/* pointer to '\0' terminator somewhere in obuf[] */
    if (C.ptrCompare(buf_eos, buf_end, ">=")) {
/* ('>' shouldn't be possible) */
        C.declareStatic("xname_flags.xname_full", "int", 0);
/* we want a record of something needing more buffer space than
           anticipated; since we aren't panicking here, this could happen
           repeatedly and we don't want to spam the paniclog file */
        if (Number(!((C.staticCell("xname_flags.xname_full").value++)))) {
            C.paniclog(C.literal("xname"), C.castPointer(C.memcpy(C.castPointer(C.ptrAdd(buf, -(6), "char"), "void *"), C.castPointer(C.literal("buf[]="), "void *"), C.ulong(6)), "char *"));
/* 'PREFIX' ought to be 'PREFIX+4' if we stripped leading "the" */
            C.paniclog(C.literal("xname"), C.literal("used up entire obuf[PREFIX..BUFSX-1]"));
        }
    }
    return buf;
}

/* similar to simple_typename but minimal_xname operates on a particular
   object rather than its general type; it formats the most basic info:
     potion                     -- if description not known
     brown potion               -- if oc_name_known not set
     potion of object detection -- if discovered
 */
export function minimal_xname(obj) {
    obj = C.argument(obj, "struct obj *");
    let bufp;
    const bareobj = C.recordLocal("struct obj", 0);
    const saveobcls = C.recordLocal("struct objclass", 0);
    let otyp = (obj).otyp;
/* suppress user-supplied name */
    ((saveobcls).oc_uname = (C.deref(C.ptrAdd(C.objects, otyp, "struct objclass"), "struct objclass")).oc_uname);
    ((C.deref(C.ptrAdd(C.objects, otyp, "struct objclass"), "struct objclass")).oc_uname = 0);
/* suppress actual name if object's description is unknown */
    ((saveobcls).oc_name_known = (C.deref(C.ptrAdd(C.objects, otyp, "struct objclass"), "struct objclass")).oc_name_known);
    if ((C.iflags).override_ID) ((C.deref(C.ptrAdd(C.objects, otyp, "struct objclass"), "struct objclass")).oc_name_known = C.uint(1));
    else if (Number(!((obj).dknown))) ((C.deref(C.ptrAdd(C.objects, otyp, "struct objclass"), "struct objclass")).oc_name_known = C.uint(0));
/* caveat: this makes a lot of assumptions about which fields
       are required in order for xname() to yield a sensible result */
    C.store(bareobj, "struct obj", (C.cg).zeroobj);
    ((bareobj).otyp = C.short(otyp));
    ((bareobj).oclass = (obj).oclass);
/* not observe_object, either the hero observed the object already or this
       is overriding ID and shouldn't discover the object */
    ((bareobj).dknown = C.uint((((Number(!!(C.int((obj).dknown) || (C.iflags).override_ID)))) ? 1 : 0)));
/* suppress known except for amulets (needed for fakes and real A-of-Y) */
    ((bareobj).known = C.uint((((Number((obj).oclass == C.AMULET_CLASS))) ? C.int((obj).known) : Number(!((C.deref(C.ptrAdd(C.objects, otyp, "struct objclass"), "struct objclass")).oc_uses_known)))));
/* default is "on" for types which don't use it */
    ((bareobj).quan = 1n);
/* don't want plural */
/* for a boulder, leave corpsenm as 0; non-zero produces "next boulder" */
    if (Number(otyp != C.BOULDER)) ((bareobj).corpsenm = C.NON_PM);
/* suppress statue and figurine details */
/* but suppressing fruit details leads to "bad fruit #0"
       [perhaps we should force "slime mold" rather than use xname?] */
    if (Number((obj).otyp == C.SLIME_MOLD)) ((bareobj).spe = (obj).spe);
    (bufp = C.callLocal(distant_name, bareobj, C.callback("xname", xname)));
/* undo forced setting of bareobj.blessed for cleric (priest[ess]);
       bufp is an obuf[] so a pointer into the middle of that is viable */
    if (Number(!(C.strncmp(bufp, C.literal("uncursed "), C.ulong(9))))) (bufp = C.ptrAdd(bufp, 9, "char"));
    ((C.deref(C.ptrAdd(C.objects, otyp, "struct objclass"), "struct objclass")).oc_uname = (saveobcls).oc_uname);
    ((C.deref(C.ptrAdd(C.objects, otyp, "struct objclass"), "struct objclass")).oc_name_known = (saveobcls).oc_name_known);
    return bufp;
}

/* xname() output augmented for multishot missile feedback */
export function mshot_xname(obj) {
    obj = C.argument(obj, "struct obj *");
    const tmpbuf = C.localArray("char[256]", 0);
    let onm = xname(obj);
    if (Number(!!(Number(((C.gm).m_shot).n > 1) && Number(((C.gm).m_shot).o == (obj).otyp)))) {
/* "the Nth arrow"; value will eventually be passed to an() or
           The(), both of which correctly handle this "the " prefix */
        C.sprintf(tmpbuf, C.literal("the %d%s "), ((C.gm).m_shot).i, C.ordin(((C.gm).m_shot).i), "ip");
        (onm = strprepend(onm, tmpbuf));
    }
    return onm;
}

/* used for naming "the unique_item" instead of "a unique_item" */
export function the_unique_obj(obj) {
    obj = C.argument(obj, "struct obj *");
    let known = C.char((Number(!!(C.int((obj).known) || (C.iflags).override_ID))));
    if (Number(!!(Number(!((obj).dknown)) && Number(!((C.iflags).override_ID))))) return (C.char(0));
    else if (Number(!!(Number((obj).otyp == C.FAKE_AMULET_OF_YENDOR) && Number(!(known))))) return (C.char(1));
    else /* lie */
    return C.char((Number(!!(C.int((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_unique) && (Number(!!(known || Number((obj).otyp == C.AMULET_OF_YENDOR))))))));
}

/* should monster type be prefixed with "the"? (mostly used for corpses) */
export function the_unique_pm(ptr) {
    ptr = C.argument(ptr, "struct permonst *");
    let uniq;
/* even though monsters with personal names are unique, we want to
       describe them as "Name" rather than "the Name" */
    if ((Number((C.ulong((((ptr)).mflags2 & C.ulong(524288n)))) != C.ulong(0n)))) return (C.char(0));
    (uniq = C.char((((C.int(((ptr).geno & C.G_UNIQ)))) ? (C.char(1)) : (C.char(0)))));
/* high priest is unique if it includes "of <deity>", otherwise not
       (caller needs to handle the 1st possibility; we assume the 2nd);
       worm tail should be irrelevant but is included for completeness */
    if (Number(!!(C.ptrCompare(ptr, C.ptrAdd(C.mons, C.PM_HIGH_CLERIC, "struct permonst"), "==") || C.ptrCompare(ptr, C.ptrAdd(C.mons, C.PM_LONG_WORM_TAIL, "struct permonst"), "==")))) (uniq = (C.char(0)));
/* Wizard no longer needs this; he's flagged as unique these days */
    if (C.ptrCompare(ptr, C.ptrAdd(C.mons, C.PM_WIZARD_OF_YENDOR, "struct permonst"), "==")) (uniq = (C.char(1)));
    return uniq;
}

export function add_erosion_words(obj, prefix) {
    obj = C.argument(obj, "struct obj *");
    prefix = C.argument(prefix, "char *");
    let iscrys = C.char((Number((obj).otyp == C.CRYSKNIFE)));
    let rknown;
    (rknown = C.char((((Number((C.iflags).override_ID == 0))) ? C.int((obj).rknown) : (C.char(1)))));
    if (Number(!!(Number(!((Number(!!(Number(!!(Number(!!(Number(!!((Number(C.int((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_material) == C.IRON)) || C.is_flammable(obj))) || C.is_rottable(obj))) || (Number(!!(Number(C.int((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_material) == C.COPPER) || Number(C.int((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_material) == C.IRON)))))) || (Number(!!(Number(C.int((C.deref(C.ptrAdd(C.objects, ((obj)).otyp, "struct objclass"), "struct objclass")).oc_material) == C.GLASS) && Number(((obj)).oclass == C.ARMOR_CLASS))))))))) && Number(!(iscrys))))) return;
/* The only cases where any of these bits do double duty are for
     * rotted food and diluted potions, which are all not is_damageable().
     */
    if (Number(!!(C.int((obj).oeroded) && Number(!(iscrys))))) {
        switch (C.int((obj).oeroded)) {
            case (2):
                C.strcat(prefix, C.literal("very "));
            break;
            case (3):
                C.strcat(prefix, C.literal("thoroughly "));
            break;
        }
        C.strcat(prefix, (((Number(C.int((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_material) == C.IRON))) ? C.literal("rusty ") : (((Number(!!(Number(C.int((C.deref(C.ptrAdd(C.objects, ((obj)).otyp, "struct objclass"), "struct objclass")).oc_material) == C.GLASS) && Number(((obj)).oclass == C.ARMOR_CLASS))))) ? C.literal("cracked ") : C.literal("burnt "))));
    }
    if (Number(!!(C.int((obj).oeroded2) && Number(!(iscrys))))) {
        switch (C.int((obj).oeroded2)) {
            case (2):
                C.strcat(prefix, C.literal("very "));
            break;
            case (3):
                C.strcat(prefix, C.literal("thoroughly "));
            break;
        }
        C.strcat(prefix, (((Number(!!(Number(C.int((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_material) == C.COPPER) || Number(C.int((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_material) == C.IRON))))) ? C.literal("corroded ") : C.literal("rotted ")));
    }
/* note: it is possible for an item to be both eroded and erodeproof
       (cursed scroll of destroy armor read while confused erodeproofs an
       item of armor without repairing existing erosion) */
    if (Number(!!(rknown && C.int((obj).oerodeproof)))) C.strcat(prefix, ((iscrys) ? C.literal("fixed ") : (((Number(C.int((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_material) == C.IRON))) ? C.literal("rustproof ") : (((Number(!!(Number(C.int((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_material) == C.COPPER) || Number(C.int((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_material) == C.IRON))))) ? C.literal("corrodeproof ") : ((C.is_flammable(obj)) ? C.literal("fireproof ") : (((Number(!!(Number(C.int((C.deref(C.ptrAdd(C.objects, ((obj)).otyp, "struct objclass"), "struct objclass")).oc_material) == C.GLASS) && Number(((obj)).oclass == C.ARMOR_CLASS))))) ? C.literal("tempered ") : ((C.is_rottable(obj)) ? C.literal("rotproof ") : C.literal(""))))))));
/* hardened */
}

/* used to prevent rust on items where rust makes no difference */
export function erosion_matters(obj) {
    obj = C.argument(obj, "struct obj *");
    switch ((obj).oclass) {
        case (C.TOOL_CLASS):
/* it's possible for a rusty weptool to be polymorphed into some
           non-weptool iron tool, in which case the rust implicitly goes
           away, but it's also possible for it to be polymorphed into a
           non-iron tool, in which case rust also implicitly goes away,
           so there's no particular reason to try to handle the first
           instance differently [this comment belongs in poly_obj()...] */
            return C.char((((Number(!!(Number(((obj)).oclass == C.TOOL_CLASS) && Number((C.deref(C.ptrAdd(C.objects, ((obj)).otyp, "struct objclass"), "struct objclass")).oc_subtyp != C.P_NONE))))) ? (C.char(1)) : (C.char(0))));
        case (C.WEAPON_CLASS):
            case (C.ARMOR_CLASS):
                case (C.BALL_CLASS):
                    case (C.CHAIN_CLASS):
                        return (C.char(1));
        default:
            break;
    }
    return (C.char(0));
}

/* [not used anywhere yet] */
/* core of doname() */
export function doname_base(obj, doname_flags) /* object to format */
/* special case requests */
{
    obj = C.argument(obj, "struct obj *");
    doname_flags = C.argument(doname_flags, "unsigned int");
    let ispoisoned = (C.char(0));
    let with_price = C.char(Number((C.uint((doname_flags & C.DONAME_WITH_PRICE))) != C.uint(0)));
    let vague_quan = C.char(Number((C.uint((doname_flags & C.DONAME_VAGUE_QUAN))) != C.uint(0)));
    let for_menu = C.char(Number((C.uint((doname_flags & C.DONAME_FOR_MENU))) != C.uint(0)));
    let known;
    let dknown;
    let cknown;
    let bknown;
    let lknown;
    let fake_arti;
    let force_the;
    const prefix = C.localArray("char[80]", 0);
    const tmpbuf = C.localArray("char[81]", 0);
/* for when we have to add something at
                              * the start of prefix instead of the
                              * end (Strcat is used on the end) */
    let aname = 0;
    let omndx = (obj).corpsenm;
    let bp;
    const bp_eos = C.scalarLocal("char *");
    let bp_end;
    let bpspaceleft;
/* 'bp' will be within an obuf[] rather than at the start of one,
       usually (but not always) pointing at &obuf[PREFIX];
       gx.xnamep always points to the start of that buffer;
       'bp_eos' and 'bpspaceleft' are used and updated by Concat*() macros */
    (bp = xname(obj));
    (bp_end = C.ptrAdd(C.ptrAdd((C.gx).xnamep, C.BUFSZ, "char"), -(1), "char"));
    (bp_eos.value = C.eos(bp));
    ((Number(!!((C.ptrCompare(bp_end, bp_eos.value, ">=")) || ((C.__assert_fail(C.literal("bp_end >= bp_eos"), C.literal("objnam.c"), 1250, C.literal("doname_base")), 0))))));
/* ok provided xname() bounds checking works */
/* size_t cast: convert signed ptrdiff_t to unsigned size_t */
    (bpspaceleft = C.ulong((C.ptrDiff(bp_end, bp_eos.value, "char"))));
    if ((C.iflags).override_ID) {
        (known = (dknown = (cknown = (bknown = (lknown = (C.char(1)))))));
    }
    else {
        (known = C.char((obj).known));
        (dknown = C.char((obj).dknown));
        (cknown = C.char((obj).cknown));
        (bknown = C.char((obj).bknown));
        (lknown = C.char((obj).lknown));
    }
/* When using xname, we want "poisoned arrow", and when using
     * doname, we want "poisoned +0 arrow".  This kludge is about the only
     * way to do it, at least until someone overhauls xname() and doname(),
     * combining both into one function taking a parameter.
     */
/* must check opoisoned--someone can have a weirdly-named fruit */
    if (Number(!!(Number(!(C.strncmp(bp, C.literal("poisoned "), C.ulong(9)))) && C.int((obj).opoisoned)))) {
        (bp = C.ptrAdd(bp, 9, "char"));
/* doesn't affect bp_eos or bpspaceleft */
        (ispoisoned = (C.char(1)));
    }
/* fruits are allowed to be given artifact names; when that happens,
       format the name like the corresponding artifact, which may or may not
       want "the" prefix and when it doesn't, avoid "a"/"an" prefix too */
    (fake_arti = C.char((Number(!!(Number((obj).otyp == C.SLIME_MOLD) && C.ptrCompare(((aname = C.artifact_name(bp, 0, (C.char(0))))), 0, "!="))))));
    (force_the = C.char((Number(!!(fake_arti && Number(!(C.strncmpi(aname, C.literal("the "), 4))))))));
    C.store(C.ptrAdd(prefix, 0, "char"), "char", C.char(0));
    if (Number((obj).quan != 1n)) {
        if (Number(!!(dknown || Number(!(vague_quan))))) C.sprintf(prefix, C.literal("%ld "), (obj).quan, "l");
        else C.strcpy(prefix, C.literal("some "));
    }
    else if (Number((obj).otyp == C.CORPSE)) {
/* skip article prefix for corpses [else corpse_xname()
           would have to be taught how to strip it off again] */
        ;
    }
    else if (Number(!!(Number(!!(force_the || obj_is_pname(obj))) || the_unique_obj(obj)))) {
        if (Number(!(C.strncmpi(bp, C.literal("the "), 4)))) (bp = C.ptrAdd(bp, 4, "char"));
/* doesn't affect bp_eos or bpspaceleft */
        C.strcpy(prefix, C.literal("the "));
    }
    else if (Number(!(fake_arti))) {
/* default prefix */
        C.strcpy(prefix, C.literal("a "));
    }
/* "empty" goes at the beginning, but item count goes at the end */
    if (Number(!!(cknown && ((((Number(!!(Number((obj).otyp == C.BAG_OF_TRICKS) || Number((obj).otyp == C.HORN_OF_PLENTY))))) ? (Number(!!(Number((obj).spe == 0) && Number(!(known))))) : (Number(!!((Number(!!((Number(!!(Number(((obj)).otyp >= C.LARGE_BOX) && Number(((obj)).otyp <= C.BAG_OF_TRICKS)))) || Number((obj).otyp == C.STATUE)))) && Number(!((C.ptrCompare(((obj)).cobj, 0, "!=")))))))))))) /* bag of tricks: include "empty" prefix if it's known to
           be empty but its precise number of charges isn't known
           (when that is known, suffix of "(n:0)" will be appended,
           making the prefix be redundant; note that 'known' flag
           isn't set when emptiness gets discovered because then
           charging magic would yield known number of new charges);
           horn of plenty isn't a container but is close enough */
/* not a bag of tricks or horn of plenty: it's empty if
                it is a container that has no contents */
    C.strcat(prefix, C.literal("empty "));
    if (Number(!!(Number(!!(bknown && Number((obj).oclass != C.COIN_CLASS))) && (Number(!!(Number(!!(Number((obj).otyp != C.POT_WATER) || Number(!((C.deref(C.ptrAdd(C.objects, C.POT_WATER, "struct objclass"), "struct objclass")).oc_name_known)))) || (Number(!!(Number(!((obj).cursed)) && Number(!((obj).blessed))))))))))) {
/* allow 'blessed clear potion' if we don't know it's holy water;
         * always allow "uncursed potion of water"
         */
        if ((obj).cursed) C.strcat(prefix, C.literal("cursed "));
        else if ((obj).blessed) C.strcat(prefix, C.literal("blessed "));
        else if (Number(!!(Number(!((C.flags).implicit_uncursed)) || (Number(!!(Number(!!(Number(!!(Number(!!((Number(!!(Number(!!(Number(!!(Number(!(known)) || Number(!((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_charged)))) || Number((obj).oclass == C.ARMOR_CLASS))) || Number((obj).oclass == C.RING_CLASS)))) && Number((obj).otyp != C.SCR_MAIL))) && Number((obj).otyp != C.FAKE_AMULET_OF_YENDOR))) && Number((obj).otyp != C.AMULET_OF_YENDOR))) && Number(!((Number(((C.gu).urole).mnum == (C.PM_CLERIC))))))))))) /* For most items with charges or +/-, if you know how many
             * charges are left or what the +/- is, then you must have
             * totally identified the item, so "uncursed" is unnecessary,
             * because an identified object not described as "blessed" or
             * "cursed" must be uncursed.
             *
             * If the charges or +/- is not known, "uncursed" must be
             * printed to avoid ambiguity between an item whose curse
             * status is unknown, and an item known to be uncursed.
             */
        C.strcat(prefix, C.literal("uncursed "));
    }
/* "a large trapped box" would perhaps be more correct; [no!]
       what about ``(obj->tknown && !obj->otrapped)''? shouldn't that
       yield "a non-trapped large box"? (not "an untrapped large box");
       TODO: this should be ``(Is_box(obj) || obj->otyp == TIN) && ...''
       but at present there's no way to set obj->tknown for tins */
    if (Number(!!(Number(!!(Number(!!((Number(!!(Number(((obj)).otyp == C.LARGE_BOX) || Number(((obj)).otyp == C.CHEST)))) && C.int((obj).otrapped))) && C.int((obj).tknown))) && C.int((obj).dknown)))) C.strcat(prefix, C.literal("trapped "));
    if (Number(!!(lknown && (Number(!!(Number(((obj)).otyp == C.LARGE_BOX) || Number(((obj)).otyp == C.CHEST))))))) {
        if ((obj).obroken) /* 3.6.0 used "unlockable" here but that could be misunderstood
               to mean "capable of being unlocked" rather than the intended
               "not capable of being locked" */
        C.strcat(prefix, C.literal("broken "));
        else if ((obj).olocked) C.strcat(prefix, C.literal("locked "));
        else C.strcat(prefix, C.literal("unlocked "));
    }
    if ((obj).greased) C.strcat(prefix, C.literal("greased "));
    if (Number(!!(Number(!!(cknown && (C.ptrCompare(((obj)).cobj, 0, "!=")))) && Number(bpspaceleft > C.ulong(0))))) {
/* we count the number of separate stacks, which corresponds
           to the number of inventory slots needed to be able to take
           everything out if no merges occur */
        let itemcount = C.count_contents(obj, (C.char(0)), (C.char(0)), (C.char(1)), (C.char(0)));
        do {
            C.nh_snprintf(C.literal("doname_base"), 1379, C.ptrAdd(bp_eos.value, -(0), "char"), C.ulong((bpspaceleft + C.ulong(0))), C.literal(" containing %ld item%s"), itemcount, ((((Number((itemcount) == C.long(1)))) ? C.literal("") : C.literal("s"))), "lp");
            ((bp_eos.value = C.eos(bp)), (bpspaceleft = C.ulong((C.ptrDiff(bp_end, bp_eos.value, "char")))));
        }
        while (0);
    }
    let switch_class = (((Number(!!(Number(((obj)).oclass == C.TOOL_CLASS) && Number((C.deref(C.ptrAdd(C.objects, ((obj)).otyp, "struct objclass"), "struct objclass")).oc_subtyp != C.P_NONE))))) ? C.WEAPON_CLASS : (obj).oclass);
    class_dispatch: for (;;) {
    switch (switch_class) {
        case (C.AMULET_CLASS):
            if (C.long(((obj).owornmask & C.W_AMUL))) do {
                C.strncat(C.ptrAdd(bp_eos.value, -(0), "char"), C.literal(" (being worn)"), C.ulong((bpspaceleft + C.ulong(0))));
                ((bp_eos.value = C.eos(bp)), (bpspaceleft = C.ulong((C.ptrDiff(bp_end, bp_eos.value, "char")))));
            }
            while (0);
        break;
        case (C.ARMOR_CLASS):
            if (C.long(((obj).owornmask & C.W_ARMOR))) {
                do {
                    C.strncat(C.ptrAdd(bp_eos.value, -(0), "char"), (((C.ptrCompare(obj, C.uskin, "=="))) ? C.literal(" (embedded in your skin)") : ((C.doffing(obj)) ? C.literal(" (being doffed)") : ((C.donning(obj)) ? C.literal(" (being donned)") : C.literal(" (being worn)")))), C.ulong((bpspaceleft + C.ulong(0))));
                    ((bp_eos.value = C.eos(bp)), (bpspaceleft = C.ulong((C.ptrDiff(bp_end, bp_eos.value, "char")))));
                }
                while (0);
/* in case of perm_invent update while Wear/Takeoff
                      is in progress; check doffing() before donning()
                      because donning() returns True for both cases */
/* we just added a parenthesized phrase, but the right paren
               might be absent if the appended string got truncated */
                if (Number(C.deref(C.ptrAdd(bp_eos.value, C.int((-1)), "char"), "char") == 41)) {
/* slippery fingers is an intrinsic condition of the hero
                   rather than extrinsic condition of objects, but gloves
                   are described as slippery when hero has slippery fingers */
                    if (Number(!!(C.ptrCompare(obj, C.uarmg, "==") && (C.deref(C.ptrAdd((C.u).uprops, C.GLIB, "struct prop"), "struct prop")).intrinsic))) /* just appended "(something)",
                                           * replace paren, changing that
                                           * to be "(something; slippery)" */
                    do {
                        C.strncat(C.ptrAdd(bp_eos.value, -(1), "char"), C.literal("; slippery)"), C.ulong((bpspaceleft + C.ulong(1))));
                        ((bp_eos.value = C.eos(bp)), (bpspaceleft = C.ulong((C.ptrDiff(bp_end, bp_eos.value, "char")))));
                    }
                    while (0);
                }
                if (Number(C.deref(C.ptrAdd(bp_eos.value, C.int((-1)), "char"), "char") == 41)) {
/* there could be light-emitting artifact gloves someday,
                   so add 'lit' separately from 'slippery' rather than via
                   'else if' after uarmg+Glib */
                    if (Number(!!(Number(!!(Number(!((Number(!!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).extrinsic))) && Number(!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).blocked))))))) && C.int((obj).lamplit))) && C.artifact_light(obj)))) do {
                        C.nh_snprintf(C.literal("doname_base"), 1413, C.ptrAdd(bp_eos.value, -(1), "char"), C.ulong((bpspaceleft + C.ulong(1))), C.literal(", %s lit)"), C.arti_light_description(obj), "p");
                        ((bp_eos.value = C.eos(bp)), (bpspaceleft = C.ulong((C.ptrDiff(bp_end, bp_eos.value, "char")))));
                    }
                    while (0);
                }
            }
        ;
/*FALLTHRU*/
        case (C.WEAPON_CLASS):
            if (ispoisoned) C.strcat(prefix, C.literal("poisoned "));
        add_erosion_words(obj, prefix);
        if (known) {
            C.sprintf(C.eos(prefix), C.literal("%+d "), (obj).spe, "i");
/* sitoa(obj->spe)+" " */
        }
        break;
        case (C.TOOL_CLASS):
            if (C.long(((obj).owornmask & (C.long((C.W_TOOL | C.W_SADDLE)))))) {
/* blindfold */
                do {
                    C.strncat(C.ptrAdd(bp_eos.value, -(0), "char"), C.literal(" (being worn)"), C.ulong((bpspaceleft + C.ulong(0))));
                    ((bp_eos.value = C.eos(bp)), (bpspaceleft = C.ulong((C.ptrDiff(bp_end, bp_eos.value, "char")))));
                }
                while (0);
                break;
            }
        if (Number(!!(Number((obj).otyp == C.LEASH) && Number((obj).leashmon != 0)))) {
            let mlsh = C.find_mid(C.uint((obj).leashmon), C.FM_FMON);
            if (Number(!!(mlsh && Number(!((Number(((mlsh)).mhp < 1))))))) {
                do {
                    C.nh_snprintf(C.literal("doname_base"), 1435, C.ptrAdd(bp_eos.value, -(0), "char"), C.ulong((bpspaceleft + C.ulong(0))), C.literal(" (attached to %s)"), C.noit_mon_nam(mlsh), "p");
                    ((bp_eos.value = C.eos(bp)), (bpspaceleft = C.ulong((C.ptrDiff(bp_end, bp_eos.value, "char")))));
                }
                while (0);
            }
            else {
                if (mlsh) /*&& DEADMONSTER(mlsh)*/
                C.impossible(C.literal("leashed %s #%u is dead"), C.mon_pmname(mlsh), C.uint((obj).leashmon), "pu");
                else C.impossible(C.literal("leashed monster #%u not found"), C.uint((obj).leashmon), "u");
                ((obj).leashmon = 0);
            }
            break;
        }
        if (Number((obj).otyp == C.CANDELABRUM_OF_INVOCATION)) {
            const suffix = C.localArray("char[20]", 0);
/* longest value is "s attached" */
/* separately formatted suffix avoids need for ConcatF3() */
            C.sprintf(suffix, C.literal("%s%s"), ((((Number(((obj).spe) == 1))) ? C.literal("") : C.literal("s"))), ((Number(!((obj).lamplit))) ? C.literal(" attached") : C.literal(", lit")), "pp");
            do {
                C.nh_snprintf(C.literal("doname_base"), 1453, C.ptrAdd(bp_eos.value, -(0), "char"), C.ulong((bpspaceleft + C.ulong(0))), C.literal(" (%d of 7 candle%s)"), (obj).spe, suffix, "ip");
                ((bp_eos.value = C.eos(bp)), (bpspaceleft = C.ulong((C.ptrDiff(bp_end, bp_eos.value, "char")))));
            }
            while (0);
            break;
        }
        else if (Number(!!(Number(!!(Number(!!(Number((obj).otyp == C.OIL_LAMP) || Number((obj).otyp == C.MAGIC_LAMP))) || Number((obj).otyp == C.BRASS_LANTERN))) || (Number(!!(Number((obj).otyp == C.TALLOW_CANDLE) || Number((obj).otyp == C.WAX_CANDLE))))))) {
            if ((Number(!!(Number((obj).otyp == C.TALLOW_CANDLE) || Number((obj).otyp == C.WAX_CANDLE))))) {
                const timer = C.recordLocal("anything", 0);
                let full_burn_time = C.long((20n * C.long((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_cost)));
                let turns_left = (obj).age;
                if ((obj).lamplit) {
                    C.store(timer, "anything", (C.cg).zeroany);
                    ((timer).a_obj = obj);
/* without this, wishing for "lit candle" yields
                       "partly used candle (lit)" because the time it can
                       burn gets adjusted when it becomes lit; matters for
                       the message as it gets added to invent and also if it
                       gets snuffed out immediately (where it will end up as
                       not partly used after all) */
                    (turns_left = C.long((turns_left + C.long((C.peek_timer(C.short(C.BURN_OBJECT), timer) - (C.svm).moves)))));
                }
                if (Number(turns_left < full_burn_time)) C.strcat(prefix, C.literal("partly used "));
            }
            if ((obj).lamplit) do {
                C.strncat(C.ptrAdd(bp_eos.value, -(0), "char"), C.literal(" (lit)"), C.ulong((bpspaceleft + C.ulong(0))));
                ((bp_eos.value = C.eos(bp)), (bpspaceleft = C.ulong((C.ptrDiff(bp_end, bp_eos.value, "char")))));
            }
            while (0);
            break;
        }
        if ((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_charged) { switch_class = C.WAND_CLASS; continue class_dispatch; }
        break;
        case (C.WAND_CLASS):

            if (known) do {
                C.nh_snprintf(C.literal("doname_base"), 1486, C.ptrAdd(bp_eos.value, -(0), "char"), C.ulong((bpspaceleft + C.ulong(0))), C.literal(" (%d:%d)"), C.int((obj).recharged), (obj).spe, "ii");
                ((bp_eos.value = C.eos(bp)), (bpspaceleft = C.ulong((C.ptrDiff(bp_end, bp_eos.value, "char")))));
            }
            while (0);
        break;
        case (C.POTION_CLASS):
            if (Number(!!(Number((obj).otyp == C.POT_OIL) && C.int((obj).lamplit)))) do {
                C.strncat(C.ptrAdd(bp_eos.value, -(0), "char"), C.literal(" (lit)"), C.ulong((bpspaceleft + C.ulong(0))));
                ((bp_eos.value = C.eos(bp)), (bpspaceleft = C.ulong((C.ptrDiff(bp_end, bp_eos.value, "char")))));
            }
            while (0);
        break;
        case (C.RING_CLASS):

/* normal rings reach here 'naturally'; meat ring jumps here */
            if (C.long(((obj).owornmask & C.W_RINGR))) do {
                C.strncat(C.ptrAdd(bp_eos.value, -(0), "char"), C.literal(" (on right "), C.ulong((bpspaceleft + C.ulong(0))));
                ((bp_eos.value = C.eos(bp)), (bpspaceleft = C.ulong((C.ptrDiff(bp_end, bp_eos.value, "char")))));
            }
            while (0);
        if (C.long(((obj).owornmask & C.W_RINGL))) do {
            C.strncat(C.ptrAdd(bp_eos.value, -(0), "char"), C.literal(" (on left "), C.ulong((bpspaceleft + C.ulong(0))));
            ((bp_eos.value = C.eos(bp)), (bpspaceleft = C.ulong((C.ptrDiff(bp_end, bp_eos.value, "char")))));
        }
        while (0);
        if (C.long(((obj).owornmask & C.W_RING))) /* either left or right */
        do {
            C.nh_snprintf(C.literal("doname_base"), 1499, C.ptrAdd(bp_eos.value, -(0), "char"), C.ulong((bpspaceleft + C.ulong(0))), C.literal("%s)"), C.body_part(C.HAND), "p");
            ((bp_eos.value = C.eos(bp)), (bpspaceleft = C.ulong((C.ptrDiff(bp_end, bp_eos.value, "char")))));
        }
        while (0);
        if (Number(!!(known && C.int((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_charged)))) {
            C.sprintf(C.eos(prefix), C.literal("%+d "), (obj).spe, "i");
/* sitoa(obj->spe)+" " */
        }
        break;
        case (C.FOOD_CLASS):
            if ((obj).oeaten) C.strcat(prefix, C.literal("partly eaten "));
        if (Number((obj).otyp == C.CORPSE)) {
/* (quan == 1) => want corpse_xname() to supply article,
               (quan != 1) => already have count or "some" as prefix;
               "corpse" is already in the buffer returned by xname() */
            let cxarg = C.uint((C.int((((((Number((obj).quan != 1n))) ? 0 : C.CXN_ARTICLE)) | C.CXN_NOCORPSE))));
            let cxstr;
            let save_xnamep;
/* corpse_xname() sets xnamep; callers other than doname_base()
               itself shouldn't care about xnamep (pointer to start of
               current obuf[]) but keep it accurate anyway */
            (save_xnamep = (C.gx).xnamep);
            (cxstr = C.callLocal(corpse_xname, obj, prefix, cxarg));
            C.sprintf(prefix, C.literal("%s "), cxstr, "p");
/* avoid having doname(corpse) consume an extra obuf */
            releaseobuf(cxstr);
            ((C.gx).xnamep = save_xnamep);
        }
        else if (Number((obj).otyp == C.EGG)) {
/* corpses don't tell if they're stale either */
// Configured-inactive #if 0 source:
// if (known && stale_egg(obj)) Strcat(prefix, "stale ");
            if (Number(!!((Number(!!(Number((omndx) >= C.LOW_PM) && Number((omndx) < C.NUMMONS)))) && (Number(!!(known || (C.int(((C.deref(C.ptrAdd((C.svm).mvitals, omndx, "struct mvitals"), "struct mvitals")).mvflags & C.MV_KNOWS_EGG))))))))) {
                C.strcat(prefix, C.deref(C.ptrAdd((C.deref(C.ptrAdd(C.mons, omndx, "struct permonst"), "struct permonst")).pmnames, C.NEUTRAL, "const char *"), "const char *"));
                C.strcat(prefix, C.literal(" "));
                if (Number((obj).spe == 1)) do {
                    C.strncat(C.ptrAdd(bp_eos.value, -(0), "char"), C.literal(" (laid by you)"), C.ulong((bpspaceleft + C.ulong(0))));
                    ((bp_eos.value = C.eos(bp)), (bpspaceleft = C.ulong((C.ptrDiff(bp_end, bp_eos.value, "char")))));
                }
                while (0);
            }
        }
        else if (Number((obj).otyp == C.MEAT_RING)) {
            { switch_class = C.RING_CLASS; continue class_dispatch; }
        }
        break;
        case (C.BALL_CLASS):
            case (C.CHAIN_CLASS):
                add_erosion_words(obj, prefix);
        if (C.long(((obj).owornmask & (C.long((C.W_BALL | C.W_CHAIN)))))) do {
            C.nh_snprintf(C.literal("doname_base"), 1545, C.ptrAdd(bp_eos.value, -(0), "char"), C.ulong((bpspaceleft + C.ulong(0))), C.literal(" (%s to you)"), (((C.long(((obj).owornmask & 2097152n)))) ? C.literal("chained") : C.literal("attached")), "p");
            ((bp_eos.value = C.eos(bp)), (bpspaceleft = C.ulong((C.ptrDiff(bp_end, bp_eos.value, "char")))));
        }
        while (0);
        break;
        }
    break class_dispatch;
    }

    if (Number(!!(Number(!!((Number(!!(Number(!!(Number((obj).otyp == C.STATUE) || Number((obj).otyp == C.CORPSE))) || Number((obj).otyp == C.FIGURINE)))) && (C.flags).debug)) && (C.iflags).wizmgender))) {
        let cgend = (C.int(((obj).spe & C.CORPSTAT_GENDER)));
        let mgend = ((((Number(cgend == C.CORPSTAT_MALE))) ? C.MALE : (((Number(cgend == C.CORPSTAT_FEMALE))) ? C.FEMALE : C.NEUTRAL)));
        do {
            C.nh_snprintf(C.literal("doname_base"), 1558, C.ptrAdd(bp_eos.value, -(0), "char"), C.ulong((bpspaceleft + C.ulong(0))), C.literal(" (%s)"), (((Number(cgend != 0))) ? (C.deref(C.ptrAdd(C.genders, mgend, "const struct Gender"), "const struct Gender")).adj : C.castPointer(C.literal("unspecified gender"), "char *")), "p");
            ((bp_eos.value = C.eos(bp)), (bpspaceleft = C.ulong((C.ptrDiff(bp_end, bp_eos.value, "char")))));
        }
        while (0);
    }
    if (Number(!!((C.long(((obj).owornmask & C.W_WEP))) && Number(!((C.gm).mrg_to_wielded))))) {
        let twoweap_primary = C.char((Number(!!(C.ptrCompare(obj, C.uwep, "==") && (C.u).twoweap))));
        let tethered = C.char((Number((obj).otyp == C.AKLYS)));
/* use alternate phrasing for non-weapons and for wielded ammo
           (arrows, bolts), or missiles (darts, shuriken, boomerangs)
           except when those are being actively dual-wielded where the
           regular phrasing will list them as "in right hand" to
           contrast with secondary weapon's "in left hand" */
        if (Number(!!((Number(!!(Number((obj).quan != 1n) || ((((Number((obj).oclass == C.WEAPON_CLASS))) ? (Number(!!((Number(!!(Number(!!((Number(!!(Number((obj).oclass == C.WEAPON_CLASS) || Number((obj).oclass == C.GEM_CLASS)))) && Number((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_subtyp >= C.int((-C.P_CROSSBOW))))) && Number((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_subtyp <= C.int((-C.P_BOW)))))) || (Number(!!(Number(!!((Number(!!(Number((obj).oclass == C.WEAPON_CLASS) || Number((obj).oclass == C.TOOL_CLASS)))) && Number((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_subtyp >= C.int((-C.P_BOOMERANG))))) && Number((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_subtyp <= C.int((-C.P_DART))))))))) : Number(!((Number(!!(Number(((obj)).oclass == C.TOOL_CLASS) && Number((C.deref(C.ptrAdd(C.objects, ((obj)).otyp, "struct objclass"), "struct objclass")).oc_subtyp != C.P_NONE))))))))))) && Number(!(twoweap_primary))))) {
            do {
                C.strncat(C.ptrAdd(bp_eos.value, -(0), "char"), C.literal(" (wielded)"), C.ulong((bpspaceleft + C.ulong(0))));
                ((bp_eos.value = C.eos(bp)), (bpspaceleft = C.ulong((C.ptrDiff(bp_end, bp_eos.value, "char")))));
            }
            while (0);
        }
        else {
            let hand_s = C.body_part(C.HAND);
            let obufp;
            const handsbuf = C.localArray("char[40]", 0);
            if ((Number(!!((Number(!!(Number((obj).oclass == C.WEAPON_CLASS) || Number((obj).oclass == C.TOOL_CLASS)))) && C.int((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_big))))) {
/* "hands" */
                (hand_s = C.strcpy(handsbuf, (obufp = makeplural(hand_s))));
                releaseobuf(obufp);
            }
            else {
/* "right hand" or "left hand" */
                C.sprintf(handsbuf, C.literal("%s %s"), (((Number(C.int((C.u).uhandedness) == 0))) ? C.literal("right") : C.literal("left")), hand_s, "pp");
                (hand_s = handsbuf);
            }
/* note: Sting's glow message, if added, will insert text
               in front of "(weapon in hand)"'s closing paren */
            do {
                C.nh_snprintf(C.literal("doname_base"), 1595, C.ptrAdd(bp_eos.value, -(0), "char"), C.ulong((bpspaceleft + C.ulong(0))), C.literal(" (%s %s)"), ((tethered) ? C.literal("tethered to") : ((twoweap_primary) ? C.literal("wielded in") : C.literal("weapon in"))), hand_s, "pp");
                ((bp_eos.value = C.eos(bp)), (bpspaceleft = C.ulong((C.ptrDiff(bp_end, bp_eos.value, "char")))));
            }
            while (0);
/* we just added a parenthesized phrase, but the right paren
               might be absent if the appended string got truncated */
            if (Number(!!(Number(!!(Number(!((Number(!!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).extrinsic))) && Number(!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).blocked))))))) && bpspaceleft)) && Number(C.deref(C.ptrAdd(bp_eos.value, C.int((-1)), "char"), "char") == 41)))) {
                if (Number(!!(Number(!!((C.gw).warn_obj_cnt && C.ptrCompare(obj, C.uwep, "=="))) && Number((C.long(((C.deref(C.ptrAdd((C.u).uprops, C.WARN_OF_MON, "struct prop"), "struct prop")).extrinsic & C.W_WEP))) != 0n)))) /* we know bp[] ends with ')'; overwrite that */
                do {
                    C.nh_snprintf(C.literal("doname_base"), 1605, C.ptrAdd(bp_eos.value, -(1), "char"), C.ulong((bpspaceleft + C.ulong(1))), C.literal(", %s %s)"), C.glow_verb((C.gw).warn_obj_cnt, (C.char(1))), C.glow_color((obj).oartifact), "pp");
                    ((bp_eos.value = C.eos(bp)), (bpspaceleft = C.ulong((C.ptrDiff(bp_end, bp_eos.value, "char")))));
                }
                while (0);
                else if (Number(!!(C.int((obj).lamplit) && C.artifact_light(obj)))) /* as above, overwrite known closing paren */
                do {
                    C.nh_snprintf(C.literal("doname_base"), 1609, C.ptrAdd(bp_eos.value, -(1), "char"), C.ulong((bpspaceleft + C.ulong(1))), C.literal(", %s lit)"), C.arti_light_description(obj), "p");
                    ((bp_eos.value = C.eos(bp)), (bpspaceleft = C.ulong((C.ptrDiff(bp_end, bp_eos.value, "char")))));
                }
                while (0);
            }
        }
    }
    if (C.long(((obj).owornmask & C.W_SWAPWEP))) {
        if ((C.u).twoweap) do {
            C.nh_snprintf(C.literal("doname_base"), 1616, C.ptrAdd(bp_eos.value, -(0), "char"), C.ulong((bpspaceleft + C.ulong(0))), C.literal(" (wielded in %s %s)"), (((Number(C.int((C.u).uhandedness) == 0))) ? C.literal("left") : C.literal("right")), C.body_part(C.HAND), "pp");
            ((bp_eos.value = C.eos(bp)), (bpspaceleft = C.ulong((C.ptrDiff(bp_end, bp_eos.value, "char")))));
        }
        while (0);
        else /* TODO: rephrase this when obj isn't a weapon or weptool */
        do {
            C.nh_snprintf(C.literal("doname_base"), 1620, C.ptrAdd(bp_eos.value, -(0), "char"), C.ulong((bpspaceleft + C.ulong(0))), C.literal(" (alternate weapon%s; not wielded)"), ((((Number(((obj).quan) == C.long(1)))) ? C.literal("") : C.literal("s"))), "p");
            ((bp_eos.value = C.eos(bp)), (bpspaceleft = C.ulong((C.ptrDiff(bp_end, bp_eos.value, "char")))));
        }
        while (0);
    }
    if (C.long(((obj).owornmask & C.W_QUIVER))) {
        let Qtyp;
        switch ((obj).oclass) {
            case (C.WEAPON_CLASS):
                (Qtyp = ((Number(!((Number(!!(Number(!!((Number(!!(Number((obj).oclass == C.WEAPON_CLASS) || Number((obj).oclass == C.GEM_CLASS)))) && Number((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_subtyp >= C.int((-C.P_CROSSBOW))))) && Number((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_subtyp <= C.int((-C.P_BOW))))))))) ? 3 : (((Number((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_skill != C.int((-C.P_BOW))))) ? 2 : 1)));
/* not ammo: "at the ready" */
/* non-bow */
/* ammo for a bow: "in quiver" */
            break;
            case (C.RING_CLASS):
                case (C.AMULET_CLASS):
                    case (C.WAND_CLASS):
                        case (C.COIN_CLASS):
                            case (C.GEM_CLASS):
                                (Qtyp = 2);
/* small, non-bow: "in quiver pouch" */
            break;
            default:
/* odd things */
                (Qtyp = 3);
/* "at the ready" */
            break;
        }
        do {
            C.nh_snprintf(C.literal("doname_base"), 1645, C.ptrAdd(bp_eos.value, -(0), "char"), C.ulong((bpspaceleft + C.ulong(0))), C.literal(" (%s)"), (((Number(Qtyp == 1))) ? C.literal("in quiver") : (((Number(Qtyp == 2))) ? C.literal("in quiver pouch") : C.literal("at the ready"))), "p");
            ((bp_eos.value = C.eos(bp)), (bpspaceleft = C.ulong((C.ptrDiff(bp_end, bp_eos.value, "char")))));
        }
        while (0);
    }
/* treat 'restoring' like suppress_price because shopkeeper and
       bill might not be available yet while restore is in progress
       (objects won't normally be formatted during that time, but if
       'perm_invent' is enabled then they might be [not any more...]) */
    if (Number(!!((C.iflags).suppress_price || (C.program_state).restoring))) {
        ;
/* don't attempt to obtain any shop pricing, even if 'with_price' */
    }
    else if (C.is_unpaid(obj)) {
/* in inventory or in container in invent */
        const pricebuf = C.localArray("char[40]", 0);
        let quotedprice = C.unpaid_cost(obj, C.uchar(C.COST_CONTENTS));
/* separately formatted suffix avoids need for ConcatF3() */
        C.sprintf(pricebuf, C.literal("%ld %s"), quotedprice, C.currency(quotedprice), "lp");
        do {
            C.nh_snprintf(C.literal("doname_base"), 1661, C.ptrAdd(bp_eos.value, -(0), "char"), C.ulong((bpspaceleft + C.ulong(0))), C.literal(" (%s, %s)"), ((C.int((obj).unpaid)) ? C.literal("unpaid") : C.literal("contents")), pricebuf, "pp");
            ((bp_eos.value = C.eos(bp)), (bpspaceleft = C.ulong((C.ptrDiff(bp_end, bp_eos.value, "char")))));
        }
        while (0);
        C.record_price_quote((obj).otyp, C.ulong(C.long((quotedprice / (obj).quan))), (C.char(1)));
    }
    else if (with_price) {
/* on floor or in container on floor */
        const nochrg = C.scalarLocal("int", 0);
        let price = C.get_cost_of_shop_item(obj, nochrg);
        if (Number(price > 0n)) {
            const pricebuf = C.localArray("char[40]", 0);
            C.sprintf(pricebuf, C.literal("%ld %s"), price, C.currency(price), "lp");
            do {
                C.nh_snprintf(C.literal("doname_base"), 1673, C.ptrAdd(bp_eos.value, -(0), "char"), C.ulong((bpspaceleft + C.ulong(0))), C.literal(" (%s, %s)"), ((nochrg.value) ? C.literal("contents") : C.literal("for sale")), pricebuf, "pp");
                ((bp_eos.value = C.eos(bp)), (bpspaceleft = C.ulong((C.ptrDiff(bp_end, bp_eos.value, "char")))));
            }
            while (0);
        }
        else if (Number(nochrg.value > 0)) {
            do {
                C.strncat(C.ptrAdd(bp_eos.value, -(0), "char"), C.literal(" (no charge)"), C.ulong((bpspaceleft + C.ulong(0))));
                ((bp_eos.value = C.eos(bp)), (bpspaceleft = C.ulong((C.ptrDiff(bp_end, bp_eos.value, "char")))));
            }
            while (0);
        }
        else if (Number(!!((C.iflags).pricequotes && Number(!((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_name_known))))) {
            C.append_price_quote(bp, bp_eos, (obj).otyp);
        }
        if (Number(price > 0n)) C.record_price_quote((obj).otyp, C.ulong(C.long((price / (obj).quan))), (C.char(1)));
    }
    else if (Number(!!((C.iflags).pricequotes && Number(!((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_name_known))))) {
        C.append_price_quote(bp, bp_eos, (obj).otyp);
    }
    if (Number(!(C.strncmp(prefix, C.literal("a "), C.ulong(2))))) {
/* save current prefix, without "a "; might be empty */
        C.strcpy(tmpbuf, C.ptrAdd(prefix, 2, "char"));
/* set prefix[] to "", "a ", or "an " */
        just_an(prefix, ((C.deref(tmpbuf, "char")) ? tmpbuf : bp));
/* append remainder of original prefix */
        C.strcat(prefix, tmpbuf);
    }
/* show weight for items (debug tourist info);
       "aum" is stolen from Crawl's "Arbitrary Unit of Measure" */
    if (Number(!!((C.flags).debug && (C.iflags).wizweight))) {
/* wizard mode user has asked to see object weights */
        if (Number(!!(with_price && Number(C.deref(C.ptrAdd(bp_eos.value, C.int((-1)), "char"), "char") == 41)))) do {
            C.nh_snprintf(C.literal("doname_base"), 1700, C.ptrAdd(bp_eos.value, -(1), "char"), C.ulong((bpspaceleft + C.ulong(1))), C.literal(", %u aum)"), (obj).owt, "u");
            ((bp_eos.value = C.eos(bp)), (bpspaceleft = C.ulong((C.ptrDiff(bp_end, bp_eos.value, "char")))));
        }
        while (0);
        else do {
            C.nh_snprintf(C.literal("doname_base"), 1702, C.ptrAdd(bp_eos.value, -(0), "char"), C.ulong((bpspaceleft + C.ulong(0))), C.literal(" (%u aum)"), (obj).owt, "u");
            ((bp_eos.value = C.eos(bp)), (bpspaceleft = C.ulong((C.ptrDiff(bp_end, bp_eos.value, "char")))));
        }
        while (0);
/* ConcatF1(bp) updates bp_eos and bpspaceleft but we're done
           with them now; add a fake use so compiler won't complain
           about a variable assignment that won't be subsequently used */
        ((bp_eos.value));
        ((bpspaceleft));
    }
    (bp = strprepend(bp, prefix));
/*
     * Last gasp bounds check.
     *
     * If caller intends this to be for a menu entry, make sure that
     * there is some room to combine with menu selector prefix without
     * exceeding BUFSZ-1.
     *
     * offsetbp=4: width of menu entry selector text: "c - " for tty.
     * For curses, that wastes a char since it only needs 3: "c) ".
     *
     * Reaching full BUFSZ-1 length can't happen unless both doname
     * (BUFSZ-PREFIX) and strprepend (PREFIX) use up all available
     * space or one of them overflows without being detected.
     */
    if (Number(C.strlen(bp) > C.ulong(C.int((C.BUFSZ - 1))))) {
        C.paniclog(C.literal("doname"), bp);
/* ideally this will never happen; if xnamep is any obuf[]
           other than the last, overflow here would be relatively
           benign and we could probably keep going */
        C.panic(C.literal("doname: long object description overflow."), "");
/*NOTREACHED*/
    }
    else {
        C.declareStatic("doname_base.doname_full", "int", 0);
        let offsetbp = ((for_menu) ? 4 : 0);
        if (Number(C.ulong((C.strlen(bp) + C.ulong(offsetbp))) >= C.ulong(C.int((C.BUFSZ - 1))))) {
/* for !offsetbp, we'll only get here if strlen(bp)==BUFSZ-1 */
            if (Number(!((C.staticCell("doname_base.doname_full").value++)))) {
                C.paniclog(C.literal("doname"), bp);
                C.sprintf(tmpbuf, C.literal("long object description%s."), ((offsetbp) ? C.literal(" truncated for menu use") : C.literal("")), "p");
                C.paniclog(C.literal("doname"), tmpbuf);
            }
            C.store(C.ptrAdd(bp, C.int((C.int((C.BUFSZ - 1)) - offsetbp)), "char"), "char", C.char(0));
        }
    }
    return bp;
}

export function doname(obj) {
    obj = C.argument(obj, "struct obj *");
    return C.callLocal(doname_base, obj, C.uint(0));
}

/* Name of object including price. */
export function doname_with_price(obj) {
    obj = C.argument(obj, "struct obj *");
    return C.callLocal(doname_base, obj, C.DONAME_WITH_PRICE);
}

/* "some" instead of precise quantity if obj->dknown not set */
export function doname_vague_quan(obj) {
    obj = C.argument(obj, "struct obj *");
/* Used by farlook.
     * If it hasn't been seen up close and quantity is more than one,
     * use "some" instead of the quantity: "some gold pieces" rather
     * than "25 gold pieces".  This is suboptimal, to put it mildly,
     * because lookhere and pickup report the precise amount.
     * Picking the item up while blind also shows the precise amount
     * for inventory display, then dropping it while still blind leaves
     * obj->dknown unset so the count reverts to "some" for farlook.
     *
     * TODO: add obj->qknown flag for 'quantity known' on stackable
     * items; it could overlay obj->cknown since no containers stack.
     */
    return C.callLocal(doname_base, obj, C.DONAME_VAGUE_QUAN);
}

/* used from invent.c */
export function not_fully_identified(otmp) {
    otmp = C.argument(otmp, "struct obj *");
/* gold doesn't have any interesting attributes [yet?] */
    if (Number((otmp).oclass == C.COIN_CLASS)) return (C.char(0));
/* always fully ID'd */
/* check fundamental ID hallmarks first */
    if (Number(!!(Number(!!(Number(!!(Number(!((otmp).known)) || Number(!((otmp).dknown)))) || (Number(!!(Number(!((otmp).bknown)) && Number((otmp).otyp != C.SCR_MAIL)))))) || Number(!((C.deref(C.ptrAdd(C.objects, (otmp).otyp, "struct objclass"), "struct objclass")).oc_name_known))))) return (C.char(1));
    if (Number(!!((Number(!!(Number(!((otmp).cknown)) && (Number(!!((Number(!!(Number(((otmp)).otyp >= C.LARGE_BOX) && Number(((otmp)).otyp <= C.BAG_OF_TRICKS)))) || Number((otmp).otyp == C.STATUE))))))) || (Number(!!(Number(!((otmp).lknown)) && (Number(!!(Number(((otmp)).otyp == C.LARGE_BOX) || Number(((otmp)).otyp == C.CHEST)))))))))) return (C.char(1));
    if (Number(!!((otmp).oartifact && C.undiscovered_artifact(C.short((otmp).oartifact))))) return (C.char(1));
/* otmp->rknown is the only item of interest if we reach here */
/*
     *  Note:  if a revision ever allows scrolls to become fireproof or
     *  rings to become shockproof, this checking will need to be revised.
     *  `rknown' ID only matters if xname() will provide the info about it.
     */
    if (Number(!!(C.int((otmp).rknown) || (Number(!!(Number(!!(Number(!!(Number((otmp).oclass != C.ARMOR_CLASS) && Number((otmp).oclass != C.WEAPON_CLASS))) && Number(!((Number(!!(Number(((otmp)).oclass == C.TOOL_CLASS) && Number((C.deref(C.ptrAdd(C.objects, ((otmp)).otyp, "struct objclass"), "struct objclass")).oc_subtyp != C.P_NONE)))))))) && Number((otmp).oclass != C.BALL_CLASS))))))) /* (redundant) */
/* (useless) */
    return (C.char(0));
    else /* lack of `rknown' only matters for vulnerable objects */
    return C.char((Number(!!(Number(!!(Number(!!(Number(!!((Number(C.int((C.deref(C.ptrAdd(C.objects, (otmp).otyp, "struct objclass"), "struct objclass")).oc_material) == C.IRON)) || C.is_flammable(otmp))) || C.is_rottable(otmp))) || (Number(!!(Number(C.int((C.deref(C.ptrAdd(C.objects, (otmp).otyp, "struct objclass"), "struct objclass")).oc_material) == C.COPPER) || Number(C.int((C.deref(C.ptrAdd(C.objects, (otmp).otyp, "struct objclass"), "struct objclass")).oc_material) == C.IRON)))))) || (Number(!!(Number(C.int((C.deref(C.ptrAdd(C.objects, ((otmp)).otyp, "struct objclass"), "struct objclass")).oc_material) == C.GLASS) && Number(((otmp)).oclass == C.ARMOR_CLASS))))))));
}

/* format a corpse name (xname() omits monster type; doname() calls us);
   eatcorpse() also uses us for death reason when eating tainted glob */
export function corpse_xname(otmp, adjective, cxn_flags) /* bitmask of CXN_xxx values */
{
    otmp = C.argument(otmp, "struct obj *");
    adjective = C.argument(adjective, "const char *");
    cxn_flags = C.argument(cxn_flags, "unsigned int");
    let nambuf;
    let omndx = (otmp).corpsenm;
    let ignore_quan = C.char(Number((C.uint((cxn_flags & C.CXN_SINGULAR))) != C.uint(0)));
    let no_prefix = C.char(Number((C.uint((cxn_flags & C.CXN_NO_PFX))) != C.uint(0)));
    let the_prefix = C.char(Number((C.uint((cxn_flags & C.CXN_PFX_THE))) != C.uint(0)));
    let any_prefix = C.char(Number((C.uint((cxn_flags & C.CXN_ARTICLE))) != C.uint(0)));
    let omit_corpse = C.char(Number((C.uint((cxn_flags & C.CXN_NOCORPSE))) != C.uint(0)));
    let possessive = (C.char(0));
    let glob = C.char((Number(!!(Number((otmp).otyp != C.CORPSE) && C.int((otmp).globby)))));
/* suppress "the" from "the unique monster corpse" */
/* include "the" for "the woodchuck corpse */
/* include "an" for "an ogre corpse */
/* leave off suffix (do_name() appends "corpse" itself) */
    let mnam;
/* some callers [aobjnam()] rely on prefix area that xname() sets aside */
    ((C.gx).xnamep = nextobuf());
    (nambuf = C.ptrAdd((C.gx).xnamep, C.PREFIX, "char"));
    if (glob) {
        (mnam = ((C.deref(C.ptrAdd(C.obj_descr, ((C.deref(C.ptrAdd(C.objects, (otmp).otyp, "struct objclass"), "struct objclass"))).oc_name_idx, "struct objdescr"), "struct objdescr")).oc_name));
/* "glob of <monster>" */
    }
    else if (Number(omndx == C.NON_PM)) {
/* paranoia */
        (mnam = C.literal("thing"));
    }
    else {
        (mnam = C.obj_pmname(otmp));
        if (Number(!!(C.callLocal(the_unique_pm, C.ptrAdd(C.mons, omndx, "struct permonst")) || (Number((C.ulong((((C.ptrAdd(C.mons, omndx, "struct permonst"))).mflags2 & C.ulong(524288n)))) != C.ulong(0n)))))) {
            (mnam = C.s_suffix(mnam));
            (possessive = (C.char(1)));
/* don't precede personal name like "Medusa" with an article */
            if ((Number((C.ulong((((C.ptrAdd(C.mons, omndx, "struct permonst"))).mflags2 & C.ulong(524288n)))) != C.ulong(0n)))) (no_prefix = (C.char(1)));
            else /* always precede non-personal unique monster name like
               "Oracle" with "the" unless explicitly overridden */
            if (Number(!!(C.callLocal(the_unique_pm, C.ptrAdd(C.mons, omndx, "struct permonst")) && Number(!(no_prefix))))) (the_prefix = (C.char(1)));
        }
    }
    if (no_prefix) (the_prefix = (any_prefix = (C.char(0))));
    else if (the_prefix) (any_prefix = (C.char(0)));
/* mutually exclusive */
    C.store(nambuf, "char", C.char(0));
/* can't use the() the way we use an() below because any capitalized
       Name causes it to assume a personal name and return Name as-is;
       that's usually the behavior wanted, but here we need to force "the"
       to precede capitalized unique monsters (pnames are handled above) */
    if (the_prefix) C.strcat(nambuf, C.literal("the "));
/* note: over time, various instances of the(mon_name()) have crept
       into the code, so the() has been modified to deal with capitalized
       monster names; we could switch to using it below like an() */
    if (Number(!!(Number(!(adjective)) || Number(!(C.deref(adjective, "const char")))))) {
/* normal case:  newt corpse */
        C.strcat(nambuf, mnam);
    }
    else {
/* adjective positioning depends upon format of monster name */
        if (possessive) /* Medusa's cursed partly eaten corpse */
        C.sprintf(C.eos(nambuf), C.literal("%s %s"), mnam, adjective, "pp");
        else /* cursed partly eaten troll corpse */
        C.sprintf(C.eos(nambuf), C.literal("%s %s"), adjective, mnam, "pp");
/* in case adjective has a trailing space, squeeze it out */
        C.mungspaces(nambuf);
/* doname() might include a count in the adjective argument;
           if so, don't prepend an article */
        if (C.digit(C.deref(adjective, "const char"))) (any_prefix = (C.char(0)));
    }
    if (glob) {
        ;
/* omit_corpse doesn't apply; quantity is always 1 */
    }
    else if (Number(!(omit_corpse))) {
        C.strcat(nambuf, C.literal(" corpse"));
/* makeplural(nambuf) => append "s" to "corpse" */
        if (Number(!!(Number((otmp).quan > 1n) && Number(!(ignore_quan))))) {
            C.strcat(nambuf, C.literal("s"));
            (any_prefix = (C.char(0)));
/* avoid "a newt corpses" */
        }
    }
/* it's safe to overwrite our nambuf[] after an() has copied its
       old value into another buffer; and once _that_ has been copied,
       the obuf[] returned by an() can be made available for re-use */
    if (any_prefix) {
        let obufp;
        C.strcpy(nambuf, (obufp = an(nambuf)));
        releaseobuf(obufp);
    }
    return nambuf;
}

/* xname doesn't include monster type for "corpse"; cxname does */
export function cxname(obj) {
    obj = C.argument(obj, "struct obj *");
    if (Number((obj).otyp == C.CORPSE)) return C.callLocal(corpse_xname, obj, 0, C.CXN_NORMAL);
    return xname(obj);
}

/* like cxname, but ignores quantity */
export function cxname_singular(obj) {
    obj = C.argument(obj, "struct obj *");
    if (Number((obj).otyp == C.CORPSE)) return C.callLocal(corpse_xname, obj, 0, C.CXN_SINGULAR);
    return C.callLocal(xname_flags, obj, C.CXN_SINGULAR);
}

/* treat an object as fully ID'd when it might be used as reason for death */
export function killer_xname(obj) {
    obj = C.argument(obj, "struct obj *");
    const save_obj = C.recordLocal("struct obj", 0);
    let save_ocknown;
    let buf;
    let save_ocuname;
    let save_oname = 0;
/* bypass object twiddling for artifacts */
    if ((obj).oartifact) return bare_artifactname(obj);
/* remember original settings for core of the object;
       oextra structs other than oname don't matter here--since they
       aren't modified they don't need to be saved and restored */
    C.store(save_obj, "struct obj", C.deref(obj, "struct obj"));
    if ((Number(!!(((obj)).oextra && ((((obj)).oextra).oname))))) (save_oname = ((((obj)).oextra).oname));
/* killer name should be more specific than general xname; however, exact
       info like blessed/cursed and rustproof makes things be too verbose; set
       dknown (not observe_object) because dead characters don't observe */
    ((obj).known = ((obj).dknown = C.uint(1)));
    ((obj).bknown = ((obj).rknown = ((obj).greased = C.uint(0))));
/* if character is a priest[ess], bknown will get toggled back on */
    if (Number((obj).otyp != C.POT_WATER)) ((obj).blessed = ((obj).cursed = C.uint(0)));
    else ((obj).bknown = C.uint(1));
/* describe holy/unholy water as such */
/* "killed by poisoned <obj>" would be misleading when poison is
       not the cause of death and "poisoned by poisoned <obj>" would
       be redundant when it is, so suppress "poisoned" prefix */
    ((obj).opoisoned = C.uint(0));
/* strip user-supplied name; artifacts keep theirs */
    if (Number(!!(Number(!((obj).oartifact)) && save_oname))) ((((obj)).oextra).oname = 0);
/* temporarily identify the type of object */
    (save_ocknown = (C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_name_known);
    ((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_name_known = C.uint(1));
    (save_ocuname = (C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_uname);
    ((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_uname = 0);
/* avoid "foo called bar" */
/* format the object */
    if (Number((obj).otyp == C.CORPSE)) {
        (buf = C.callLocal(corpse_xname, obj, 0, C.CXN_NORMAL));
    }
    else if (Number((obj).otyp == C.SLIME_MOLD)) {
/* concession to "most unique deaths competition" in the annual
           devnull tournament, suppress player supplied fruit names because
           those can be used to fake other objects and dungeon features */
        (buf = nextobuf());
        C.sprintf(buf, C.literal("deadly slime mold%s"), ((((Number(((obj).quan) == C.long(1)))) ? C.literal("") : C.literal("s"))), "p");
    }
    else {
        (buf = xname(obj));
    }
/* apply an article if appropriate; caller should always use KILLED_BY */
    if (Number(!!(Number(!!(Number((obj).quan == 1n) && Number(!(C.strstri(buf, C.literal("'s ")))))) && Number(!(C.strstri(buf, C.literal("s' "))))))) (buf = (((Number(!!(obj_is_pname(obj) || the_unique_obj(obj))))) ? C.callLocal(the, buf) : an(buf)));
    ((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_name_known = save_ocknown);
    ((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_uname = save_ocuname);
    C.store(obj, "struct obj", save_obj);
/* restore object's core settings */
    if (Number(!!(Number(!((obj).oartifact)) && save_oname))) ((((obj)).oextra).oname = save_oname);
    return buf;
}

/* xname,doname,&c with long results reformatted to omit some stuff */
export function short_oname(obj, func, altfunc, lenlimit) /* main formatting routine */
/* alternate for shortest result */
{
    obj = C.argument(obj, "struct obj *");
    func = C.argument(func, "char *(*)(struct obj *)");
    altfunc = C.argument(altfunc, "char *(*)(struct obj *)");
    lenlimit = C.argument(lenlimit, "unsigned int");
    const save_obj = C.recordLocal("struct obj", 0);
    const unamebuf = C.localArray("char[12]", 0);
    const onamebuf = C.localArray("char[12]", 0);
    let save_oname;
    let save_uname;
    let outbuf;
    (outbuf = C.callFormatter((C.deref(func, "char *(struct obj *)")), obj));
    if (Number(C.uint(C.strlen(outbuf)) <= lenlimit)) return outbuf;
/* shorten called string to fairly small amount */
    (save_uname = (C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_uname);
    if (Number(!!(save_uname && Number(C.strlen(save_uname) >= BigInt(C.sizeof("char[12]")))))) {
        C.strncpy(unamebuf, save_uname, C.ulong((BigInt(C.sizeof("char[12]")) - C.ulong(4))));
        C.strcpy(C.ptrAdd(C.ptrAdd(unamebuf, BigInt(C.sizeof("char[12]")), "char"), -(4), "char"), C.literal("..."));
        ((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_uname = unamebuf);
        releaseobuf(outbuf);
        (outbuf = C.callFormatter((C.deref(func, "char *(struct obj *)")), obj));
        ((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_uname = save_uname);
/* restore called string */
        if (Number(C.uint(C.strlen(outbuf)) <= lenlimit)) return outbuf;
    }
/* shorten named string to fairly small amount */
    (save_oname = (((Number(!!(((obj)).oextra && ((((obj)).oextra).oname))))) ? ((((obj)).oextra).oname) : 0));
    if (Number(!!(save_oname && Number(C.strlen(save_oname) >= BigInt(C.sizeof("char[12]")))))) {
        C.strncpy(onamebuf, save_oname, C.ulong((BigInt(C.sizeof("char[12]")) - C.ulong(4))));
        C.strcpy(C.ptrAdd(C.ptrAdd(onamebuf, BigInt(C.sizeof("char[12]")), "char"), -(4), "char"), C.literal("..."));
        ((((obj)).oextra).oname = onamebuf);
        releaseobuf(outbuf);
        (outbuf = C.callFormatter((C.deref(func, "char *(struct obj *)")), obj));
        ((((obj)).oextra).oname = save_oname);
/* restore named string */
        if (Number(C.uint(C.strlen(outbuf)) <= lenlimit)) return outbuf;
    }
/* shorten both called and named strings;
       unamebuf and onamebuf have both already been populated */
    if (Number(!!(Number(!!(Number(!!(save_uname && Number(C.strlen(save_uname) >= BigInt(C.sizeof("char[12]"))))) && save_oname)) && Number(C.strlen(save_oname) >= BigInt(C.sizeof("char[12]")))))) {
        ((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_uname = unamebuf);
        ((((obj)).oextra).oname = onamebuf);
        releaseobuf(outbuf);
        (outbuf = C.callFormatter((C.deref(func, "char *(struct obj *)")), obj));
        if (Number(C.uint(C.strlen(outbuf)) <= lenlimit)) {
            ((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_uname = save_uname);
            ((((obj)).oextra).oname = save_oname);
            return outbuf;
        }
    }
/* still long; strip several name-lengthening attributes;
       called and named strings are still in truncated form */
    C.store(save_obj, "struct obj", C.deref(obj, "struct obj"));
    ((obj).bknown = ((obj).rknown = ((obj).greased = C.uint(0))));
    ((obj).oeroded = ((obj).oeroded2 = C.uint(0)));
    releaseobuf(outbuf);
    (outbuf = C.callFormatter((C.deref(func, "char *(struct obj *)")), obj));
    if (Number(!!(altfunc && Number(C.uint(C.strlen(outbuf)) > lenlimit)))) {
/* still long; use the alternate function (usually one of
           the jackets around minimal_xname()) */
        releaseobuf(outbuf);
        (outbuf = C.callFormatter((C.deref(altfunc, "char *(struct obj *)")), obj));
    }
/* restore the object */
    C.store(obj, "struct obj", save_obj);
    if (save_oname) ((((obj)).oextra).oname = save_oname);
    if (save_uname) ((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_uname = save_uname);
/* use whatever we've got, whether it's too long or not */
    return outbuf;
}

/*
 * Used if only one of a collection of objects is named (e.g. in eat.c).
 */
export function singular(otmp, func) {
    otmp = C.argument(otmp, "struct obj *");
    func = C.argument(func, "char *(*)(struct obj *)");
    let savequan;
    let nam;
/* using xname for corpses does not give the monster type */
    if (Number(!!(Number((otmp).otyp == C.CORPSE) && C.ptrCompare(func, C.callback("xname", xname), "==")))) (func = C.callback("cxname", cxname));
    (savequan = (otmp).quan);
    ((otmp).quan = 1n);
    (nam = C.callFormatter((C.deref(func, "char *(struct obj *)")), otmp));
    ((otmp).quan = savequan);
    return nam;
}

/* pick "", "a ", or "an " as article for 'str'; used by an() and doname() */
export function just_an(outbuf, str) {
    outbuf = C.argument(outbuf, "char *");
    str = C.argument(str, "const char *");
    let c0;
    C.store(outbuf, "char", C.char(0));
    (c0 = C.lowc(C.deref(str, "const char")));
    if (Number(!!(Number(!(C.deref(C.ptrAdd(str, 1, "const char"), "const char"))) || Number(C.deref(C.ptrAdd(str, 1, "const char"), "const char") == 32)))) {
/* single letter; might be used for named fruit or a musical note */
        C.strcpy(outbuf, ((C.strchr(C.literal("aefhilmnosx"), c0)) ? C.literal("an ") : C.literal("a ")));
    }
    else if (Number(!!(Number(!!(Number(!!(Number(!(C.strncmpi(str, C.literal("the "), 4))) || Number(!(C.strncmpi((str), (C.literal("molten lava")), C.int((-1))))))) || Number(!(C.strncmpi((str), (C.literal("iron bars")), C.int((-1))))))) || Number(!(C.strncmpi((str), (C.literal("ice")), C.int((-1)))))))) /* these probably shouldn't be handled here because doing so
                  impacts inventory when using them for named fruit */
{
        ;
/* no article */
    }
    else {
/* normal case is "an <vowel>" or "a <consonant>" */
        if (Number(!!((Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(C.strchr(C.vowels, c0) && (Number(!!(C.strncmpi(str, C.literal("one"), 3) || (Number(!!(C.deref(C.ptrAdd(str, 3, "const char"), "const char") && Number(!(C.strchr(C.literal("-_ "), C.deref(C.ptrAdd(str, 3, "const char"), "const char")))))))))))) && C.strncmpi(str, C.literal("eu"), 2))) && C.strncmpi(str, C.literal("uke"), 3))) && C.strncmpi(str, C.literal("ukulele"), 7))) && C.strncmpi(str, C.literal("unicorn"), 7))) && C.strncmpi(str, C.literal("uranium"), 7))) && C.strncmpi(str, C.literal("useful"), 6)))) || (Number(!!(Number(c0 == 120) && Number(!(C.strchr(C.vowels, C.lowc(C.deref(C.ptrAdd(str, 1, "const char"), "const char"))))))))))) /* some exceptions warranting "a <vowel>" */
/* 'wun' initial sound */
/* long 'u' initial sound */
/* "eucalyptus leaf" */
/* "useful tool" */
        C.strcpy(outbuf, C.literal("an "));
        else C.strcpy(outbuf, C.literal("a "));
    }
    return outbuf;
}

export function an(str) {
    str = C.argument(str, "const char *");
    let buf = nextobuf();
    if (Number(!!(Number(!(str)) || Number(!(C.deref(str, "const char")))))) {
        C.impossible(C.literal("Alphabet soup: 'an(%s)'."), ((str) ? C.literal("\"\"") : C.literal("<null>")), "p");
        return C.strcpy(buf, C.literal("an []"));
    }
    just_an(buf, str);
    return C.strncat(buf, str, C.ulong(C.uint((C.uint(C.int((C.BUFSZ - 1))) - C.Strlen_(buf, C.literal("an"), 2154)))));
}

export function An(str) {
    str = C.argument(str, "const char *");
    let tmp = an(str);
    C.store(tmp, "char", C.highc(C.deref(tmp, "char")));
    return tmp;
}

/*
 * Prepend "the" if necessary; assumes str is a subject derived from xname.
 * Use type_is_pname() for monster names, not the().  the() is idempotent.
 */
export function the(str) {
    str = C.argument(str, "const char *");
    let aname;
    let buf = nextobuf();
    let insert_the = (C.char(0));
    if (Number(!!(Number(!(str)) || Number(!(C.deref(str, "const char")))))) {
        C.impossible(C.literal("Alphabet soup: 'the(%s)'."), ((str) ? C.literal("\"\"") : C.literal("<null>")), "p");
        return C.strcpy(buf, C.literal("the []"));
    }
    if (Number(!(C.strncmpi(str, C.literal("the "), 4)))) {
        C.store(C.ptrAdd(buf, 0, "char"), "char", C.lowc(C.deref(str, "const char")));
        C.strcpy(C.ptrAdd(buf, 1, "char"), C.ptrAdd(str, 1, "const char"));
        return buf;
    }
    else if (Number(!!(Number(!!(Number(!!(Number(C.deref(str, "const char") < 65) || Number(C.deref(str, "const char") > 90))) || C.CapitalMon(str))) || (Number(!!(C.callLocal(fruit_from_name, str, (C.char(1)), 0) && (Number(!!(C.ptrCompare(((aname = C.artifact_name(str, 0, (C.char(0))))), 0, "==") || Number(C.strncmpi(aname, C.literal("the "), 4) == 0)))))))))) /* some capitalized monster names want "the", others don't */
/* treat named fruit as not a proper name, even if player
                  has assigned a capitalized proper name as his/her fruit,
                  unless it matches an artifact name */
{
/* not a proper name, needs an article */
        (insert_the = (C.char(1)));
    }
    else {
/* Probably a proper name, might not need an article */
        let named;
        let called;
        let tmp;
        let l;
/* some objects have capitalized adjectives in their names */
        if (Number(!!((Number(!!(C.ptrCompare(((tmp = C.strrchr(str, 32))), 0, "!=") || C.ptrCompare(((tmp = C.strrchr(str, 45))), 0, "!=")))) && (Number(!!(Number(C.deref(C.ptrAdd(tmp, 1, "const char"), "const char") < 65) || Number(C.deref(C.ptrAdd(tmp, 1, "const char"), "const char") > 90))))))) {
/* insert "the" unless we have an apostrophe (where we assume
               we're dealing with "Unique's corpse" when "Unique" wasn't
               caught by CapitalMon() above) */
            (insert_the = C.char(Number(!(C.strchr(str, 39)))));
        }
        else if (Number(!!(tmp && C.ptrCompare(C.strchr(str, 32), C.castPointer(tmp, "char *"), "<")))) {
/* has spaces */
/* it needs an article if the name contains "of" */
            (tmp = C.strstri(str, C.literal(" of ")));
            (named = C.strstri(str, C.literal(" named ")));
            (called = C.strstri(str, C.literal(" called ")));
            if (Number(!!(called && (Number(!!(Number(!(named)) || C.ptrCompare(called, named, "<"))))))) (named = called);
            if (Number(!!(tmp && (Number(!!(Number(!(named)) || C.ptrCompare(tmp, C.castPointer(named, "char *"), "<"))))))) /* found an "of" */
            (insert_the = (C.char(1)));
            else /* stupid special case: lacks "of" but needs "the" */
            if (Number(!!(Number(!!(Number(!(named)) && Number(((l = C.int(C.Strlen_(str, C.literal("the"), 2220)))) >= 31))) && Number(!(C.strcmp(C.ptrAdd(str, C.int((l - 31)), "const char"), C.literal("Platinum Yendorian Express Card"))))))) (insert_the = (C.char(1)));
        }
    }
    if (insert_the) C.strcpy(buf, C.literal("the "));
    else C.store(C.ptrAdd(buf, 0, "char"), "char", C.char(0));
    return C.strncat(buf, str, C.ulong(C.uint((C.uint(C.int((C.BUFSZ - 1))) - C.Strlen_(buf, C.literal("the"), 2230)))));
}

export function The(str) {
    str = C.argument(str, "const char *");
    let tmp = C.callLocal(the, str);
    C.store(tmp, "char", C.highc(C.deref(tmp, "char")));
    return tmp;
}

/* returns "count cxname(otmp)" or just cxname(otmp) if count == 1 */
export function aobjnam(otmp, verb) {
    otmp = C.argument(otmp, "struct obj *");
    verb = C.argument(verb, "const char *");
    const prefix = C.localArray("char[80]", 0);
    let bp = cxname(otmp);
    if (Number((otmp).quan != 1n)) {
        C.sprintf(prefix, C.literal("%ld "), (otmp).quan, "l");
        (bp = strprepend(bp, prefix));
    }
    if (verb) {
        C.strcat(bp, C.literal(" "));
        C.strcat(bp, otense(otmp, verb));
    }
    return bp;
}

/* combine yname and aobjnam eg "your count cxname(otmp)" */
export function yobjnam(obj, verb) {
    obj = C.argument(obj, "struct obj *");
    verb = C.argument(verb, "const char *");
    let s = C.callLocal(aobjnam, obj, verb);
/* leave off "your" for most of your artifacts, but prepend
     * "your" for unique objects and "foo of bar" quest artifacts */
    if (Number(!!(Number(!!(Number(!((Number(((obj)).where == 3)))) || Number(!(obj_is_pname(obj))))) || Number((obj).oartifact >= C.ART_ORB_OF_DETECTION)))) {
        let outbuf = C.shk_your(nextobuf(), obj);
        let space_left = C.int(C.uint((C.uint(C.int((C.BUFSZ - 1))) - C.Strlen_(outbuf, C.literal("yobjnam"), 2271))));
        (s = C.strncat(outbuf, s, C.ulong(space_left)));
    }
    return s;
}

/* combine Yname2 and aobjnam eg "Your count cxname(otmp)" */
export function Yobjnam2(obj, verb) {
    obj = C.argument(obj, "struct obj *");
    verb = C.argument(verb, "const char *");
    let s = yobjnam(obj, verb);
    C.store(s, "char", C.highc(C.deref(s, "char")));
    return s;
}

/* like aobjnam, but prepend "The", not count, and use xname */
export function Tobjnam(otmp, verb) {
    otmp = C.argument(otmp, "struct obj *");
    verb = C.argument(verb, "const char *");
    let bp = The(xname(otmp));
    if (verb) {
        C.strcat(bp, C.literal(" "));
        C.strcat(bp, otense(otmp, verb));
    }
    return bp;
}

/* capitalized variant of doname() */
export function Doname2(obj) {
    obj = C.argument(obj, "struct obj *");
    let s = doname(obj);
    C.store(s, "char", C.highc(C.deref(s, "char")));
    return s;
}

/* doname() for itemized buying of 'obj' from a shop */
export function paydoname(obj) {
    obj = C.argument(obj, "struct obj *");
    C.declareStatic("paydoname.and_contents", "const char[18]", C.literal(" and its contents"));
    let p;
    let save_cknown = (obj).cknown;
    let save_wizweight = (C.iflags).wizweight;
    if ((C.ptrCompare(((obj)).cobj, 0, "!="))) ((obj).cknown = C.uint(0));
/* avoid showing item weights to unclutter billing's pay-menu a bit */
    ((C.iflags).wizweight = (C.char(0)));
/* suppress invent-style price; caller will add billing-style price */
    C.bump(C.fieldRef(C.iflags, "suppress_price"), 1, true, "int");
    (p = C.callLocal(doname_base, obj, 0));
    C.bump(C.fieldRef(C.iflags, "suppress_price"), -1, true, "int");
    ((C.iflags).wizweight = save_wizweight);
    if ((C.ptrCompare(((obj)).cobj, 0, "!="))) {
/* buy_container() sets no_charge for a container that has just
           been purchased so that when paydoname() is called by
           shk_names_obj(), we'll provide "a/an <container>" instead of
           "your <container>" */
        if (Number(!((obj).no_charge))) {
            if (Number(!(C.strncmp(p, C.literal("a "), C.ulong(2))))) (p = C.ptrAdd(p, 2, "char"));
            else if (Number(!(C.strncmp(p, C.literal("an "), C.ulong(3))))) (p = C.ptrAdd(p, 3, "char"));
            (p = strprepend(p, ((C.int((obj).unpaid)) ? C.literal("an unpaid ") : C.literal("your "))));
        }
        if (Number(!((obj).cknown))) {
            if ((obj).unpaid) {
                if (Number(C.ulong((C.ulong((C.ulong(C.int(C.strlen(p))) + BigInt(C.sizeof("const char[18]")))) - C.ulong(1))) < C.ulong(C.int((C.BUFSZ - C.PREFIX))))) C.strcat(p, C.staticCell("paydoname.and_contents").value);
            }
            else {
                (p = strprepend(p, C.literal("the contents of ")));
            }
        }
    }
    ((obj).cknown = save_cknown);
    return p;
}

/* returns "[your ]xname(obj)" or "Foobar's xname(obj)" or "the xname(obj)" */
export function yname(obj) {
    obj = C.argument(obj, "struct obj *");
    let s = cxname(obj);
/* leave off "your" for most of your artifacts, but prepend
     * "your" for unique objects and "foo of bar" quest artifacts */
    if (Number(!!(Number(!!(Number(!((Number(((obj)).where == 3)))) || Number(!(obj_is_pname(obj))))) || Number((obj).oartifact >= C.ART_ORB_OF_DETECTION)))) {
        let outbuf = C.shk_your(nextobuf(), obj);
        let space_left = C.int(C.uint((C.uint(C.int((C.BUFSZ - 1))) - C.Strlen_(outbuf, C.literal("yname"), 2368))));
        (s = C.strncat(outbuf, s, C.ulong(space_left)));
    }
    return s;
}

/* capitalized variant of yname() */
export function Yname2(obj) {
    obj = C.argument(obj, "struct obj *");
    let s = yname(obj);
    C.store(s, "char", C.highc(C.deref(s, "char")));
    return s;
}

/* returns "your minimal_xname(obj)"
 * or "Foobar's minimal_xname(obj)"
 * or "the minimal_xname(obj)"
 */
export function ysimple_name(obj) {
    obj = C.argument(obj, "struct obj *");
    let outbuf = nextobuf();
    let s = C.shk_your(outbuf, obj);
/* assert( s == outbuf ); */
    let space_left = C.int(C.uint((C.uint(C.int((C.BUFSZ - 1))) - C.Strlen_(s, C.literal("ysimple_name"), 2395))));
    return C.strncat(s, C.callLocal(minimal_xname, obj), C.ulong(space_left));
}

/* capitalized variant of ysimple_name() */
export function Ysimple_name2(obj) {
    obj = C.argument(obj, "struct obj *");
    let s = ysimple_name(obj);
    C.store(s, "char", C.highc(C.deref(s, "char")));
    return s;
}

/*
     * FIXME:
     *  simpleonames(), ansimpleoname(), and thesimpleoname() need to
     *  know the beginning of the obuf[] they use so that they can
     *  guard against buffer overflow when pluralizing (is that an
     *  actual word?) or inserting "an" or "the".
     *
     *  minimal_xname() returns a call to xname() which writes into
     *  the middle of its obuf[] then backs up to accomodate a prefix,
     *  so BUFSZ is not a reliable limit for the length of the result.
     *
     *  [Overflow likely moot.  Since the formatted object name has
     *  user-supplied name suppressed, the length is sure to be short
     *  enough to added plural suffix or "an" or "the" prefix.]
     */
/* "scroll" or "scrolls" */
export function simpleonames(obj) {
    obj = C.argument(obj, "struct obj *");
    let obufp;
    let simpleoname = C.callLocal(minimal_xname, obj);
    if (Number((obj).quan != 1n)) {
/* 'simpleoname' points to an obuf; makeplural() will allocate
           another one and only that one can be explicitly released for
           re-use, so this is slightly convoluted to cope with that;
           makeplural() will be fully evaluated and done with its input
           argument before strcpy() touches its output argument */
        C.strcpy(simpleoname, (obufp = makeplural(simpleoname)));
        releaseobuf(obufp);
    }
    return simpleoname;
}

/* "a scroll" or "scrolls"; "a silver bell" or "the Bell of Opening" */
export function ansimpleoname(obj) {
    obj = C.argument(obj, "struct obj *");
    let obufp;
    let simpleoname = simpleonames(obj);
    let otyp = (obj).otyp;
/* prefix with "the" if a unique item, or a fake one imitating same,
       has been formatted with its actual name (we let minimal_xname() handle
       any `known' and `dknown' checking necessary) */
    if (Number(otyp == C.FAKE_AMULET_OF_YENDOR)) (otyp = C.AMULET_OF_YENDOR);
    if (Number(!!(Number(!!(C.int((C.deref(C.ptrAdd(C.objects, otyp, "struct objclass"), "struct objclass")).oc_unique) && ((C.deref(C.ptrAdd(C.obj_descr, ((C.deref(C.ptrAdd(C.objects, otyp, "struct objclass"), "struct objclass"))).oc_name_idx, "struct objdescr"), "struct objdescr")).oc_name))) && Number(!(C.strcmp(simpleoname, ((C.deref(C.ptrAdd(C.obj_descr, ((C.deref(C.ptrAdd(C.objects, otyp, "struct objclass"), "struct objclass"))).oc_name_idx, "struct objdescr"), "struct objdescr")).oc_name))))))) {
/* the() will allocate another obuf[]; we want to avoid using two */
        (obufp = C.callLocal(the, simpleoname));
        C.strcpy(simpleoname, obufp);
        releaseobuf(obufp);
    }
    else if (Number((obj).quan == 1n)) {
/* simpleoname[] is singular if quan==1, plural otherwise;
           an() will allocate another obuf[]; we want to avoid using two */
        (obufp = an(simpleoname));
        C.strcpy(simpleoname, obufp);
        releaseobuf(obufp);
    }
    return simpleoname;
}

/* "the scroll" or "the scrolls" */
export function thesimpleoname(obj) {
    obj = C.argument(obj, "struct obj *");
    let obufp;
    let simpleoname = simpleonames(obj);
/* the() will allocate another obuf[]; we want to avoid using two */
    (obufp = C.callLocal(the, simpleoname));
    C.strcpy(simpleoname, obufp);
    releaseobuf(obufp);
    return simpleoname;
}

/* basic name of obj, as if it has been discovered; for some types of
   items, we can't just use OBJ_NAME() because it doesn't always include
   the class (for instance "light" when we want "spellbook of light");
   minimal_xname() uses xname() to get that */
export function actualoname(obj) {
    obj = C.argument(obj, "struct obj *");
    let res;
    ((C.iflags).override_ID = (C.char(1)));
    (res = C.callLocal(minimal_xname, obj));
    ((C.iflags).override_ID = (C.char(0)));
    return res;
}

/* artifact's name without any object type or known/dknown/&c feedback */
export function bare_artifactname(obj) {
    obj = C.argument(obj, "struct obj *");
    let outbuf;
    if ((obj).oartifact) {
        (outbuf = nextobuf());
        C.strcpy(outbuf, C.artiname((obj).oartifact));
        if (Number(!(C.strncmp(outbuf, C.literal("The "), C.ulong(4))))) C.store(C.ptrAdd(outbuf, 0, "char"), "char", C.lowc(C.deref(C.ptrAdd(outbuf, 0, "char"), "char")));
    }
    else {
        (outbuf = xname(obj));
    }
    return outbuf;
}

export const wrp = [
    "wand",   "ring",      "potion",     "scroll", "gem",
    "amulet", "spellbook", "spell book",
    /* for non-specific wishes */
    "weapon", "armor",     "tool",       "food",   "comestible",
];

export const wrpsym = [ "WAND_CLASS",   "RING_CLASS",   "POTION_CLASS",
                               "SCROLL_CLASS", "GEM_CLASS",    "AMULET_CLASS",
                               "SPBOOK_CLASS", "SPBOOK_CLASS", "WEAPON_CLASS",
                               "ARMOR_CLASS",  "TOOL_CLASS",   "FOOD_CLASS",
                               "FOOD_CLASS" ];

/* return form of the verb (input plural) if xname(otmp) were the subject */
export function otense(otmp, verb) {
    otmp = C.argument(otmp, "struct obj *");
    verb = C.argument(verb, "const char *");
    let buf;
/*
     * verb is given in plural (without trailing s).  Return as input
     * if the result of xname(otmp) would be plural.  Don't bother
     * recomputing xname(otmp) at this time.
     */
    if (Number(!((Number(!!(Number(((otmp)).quan != 1n) || (Number(!!(Number(((otmp)).oartifact == C.ART_EYES_OF_THE_OVERWORLD) && Number(!(C.undiscovered_artifact(C.short(C.ART_EYES_OF_THE_OVERWORLD))))))))))))) return vtense(0, verb);
    (buf = nextobuf());
    C.strcpy(buf, verb);
    return buf;
}

/* various singular words that vtense would otherwise categorize as plural;
   also used by makesingular() to catch some special cases */
export const special_subjs = [
    "erinys",  "manes", /* this one is ambiguous */
    "Cyclops", "Hippocrates",     "Pelias",    "aklys",
    "amnesia", "detect monsters", "paralysis", "shape changers",
    "nemesis", 0
    /* note: "detect monsters" and "shape changers" are normally
       caught via "<something>(s) of <whatever>", but they can be
       wished for using the shorter form, so we include them here
       to accommodate usage by makesingular during wishing */
];

/* return form of the verb (input plural) for present tense 3rd person subj */
export function vtense(subj, verb) {
    subj = C.argument(subj, "const char *");
    verb = C.argument(verb, "const char *");
    let buf = nextobuf();
    let bspot;
    let len;
    let ltmp;
    let sp;
    let spot;
    let spec;
/*
     * verb is given in plural (without trailing s).  Return as input
     * if subj appears to be plural.  Add special cases as necessary.
     * Many hard cases can already be handled by using otense() instead.
     * If this gets much bigger, consider decomposing makeplural.
     * Note: monster names are not expected here (except before corpse).
     *
     * Special case: allow null sobj to get the singular 3rd person
     * present tense form so we don't duplicate this code elsewhere.
     */
    sing: {
    if (subj) {
        if (Number(!!(Number(!(C.strncmpi(subj, C.literal("a "), 2))) || Number(!(C.strncmpi(subj, C.literal("an "), 3)))))) break sing;
        (spot = 0);
        for ((sp = subj); C.ptrCompare(((sp = C.strchr(sp, 32))), 0, "!="); (sp = C.ptrAdd(sp, 1, "char"))) {
            if (Number(!!(Number(!!(Number(!!(Number(!!(Number(!(C.strncmpi(sp, C.literal(" of "), 4))) || Number(!(C.strncmpi(sp, C.literal(" from "), 6))))) || Number(!(C.strncmpi(sp, C.literal(" called "), 8))))) || Number(!(C.strncmpi(sp, C.literal(" named "), 7))))) || Number(!(C.strncmpi(sp, C.literal(" labeled "), 9)))))) {
                if (C.ptrCompare(sp, subj, "!=")) (spot = C.ptrAdd(sp, -(1), "const char"));
                break;
            }
        }
        (len = C.int(C.strlen(subj)));
        if (Number(!(spot))) (spot = C.ptrAdd(C.ptrAdd(subj, len, "const char"), -(1), "const char"));
/*
         * plural: anything that ends in 's', but not '*us' or '*ss'.
         * Guess at a few other special cases that makeplural creates.
         */
        if (Number(!!(Number(!!(Number(!!(Number(!!((Number(!!(Number(!!(Number(C.lowc(C.deref(spot, "const char")) == 115) && C.ptrCompare(spot, subj, "!="))) && Number(!(C.strchr(C.literal("us"), C.lowc(C.deref((C.ptrAdd(spot, -(1), "const char")), "const char")))))))) || Number(!((Number(!!(C.ptrCompare((C.ptrAdd(spot, -(3), "const char")), subj, "<") || C.strncmpi((C.ptrAdd(spot, -(3), "const char")), C.literal("eeth"), 4)))))))) || Number(!((Number(!!(C.ptrCompare((C.ptrAdd(spot, -(3), "const char")), subj, "<") || C.strncmpi((C.ptrAdd(spot, -(3), "const char")), C.literal("feet"), 4)))))))) || Number(!((Number(!!(C.ptrCompare((C.ptrAdd(spot, -(1), "const char")), subj, "<") || C.strncmpi((C.ptrAdd(spot, -(1), "const char")), C.literal("ia"), 2)))))))) || Number(!((Number(!!(C.ptrCompare((C.ptrAdd(spot, -(1), "const char")), subj, "<") || C.strncmpi((C.ptrAdd(spot, -(1), "const char")), C.literal("ae"), 2))))))))) {
/* check for special cases to avoid false matches */
            (len = C.int((C.int((C.ptrDiff(spot, subj, "const char"))) + 1)));
            for ((spec = C.special_subjs); C.deref(spec, "const char *const"); ((spec = C.ptrAdd(spec, 1, "char *")), C.ptrAdd(spec, -1, "char *"))) {
                (ltmp = C.int(C.Strlen_(C.deref(spec, "const char *const"), C.literal("vtense"), 2610)));
                if (Number(!!(Number(len == ltmp) && Number(!(C.strncmpi(C.deref(spec, "const char *const"), subj, len)))))) break sing;
/* also check for <prefix><space><special_subj>
                   to catch things like "the invisible erinys" */
                if (Number(!!(Number(!!(Number(len > ltmp) && Number(C.deref((C.ptrAdd(spot, -(ltmp), "const char")), "const char") == 32))) && Number(!(C.strncmpi(C.deref(spec, "const char *const"), C.ptrAdd(C.ptrAdd(spot, -(ltmp), "const char"), 1, "const char"), ltmp)))))) break sing;
            }
            return C.strcpy(buf, verb);
        }
/*
         * 3rd person plural doesn't end in telltale 's';
         * 2nd person singular behaves as if plural.
         */
        if (Number(!!(Number(!(C.strncmpi((subj), (C.literal("they")), C.int((-1))))) || Number(!(C.strncmpi((subj), (C.literal("you")), C.int((-1)))))))) return C.strcpy(buf, verb);
    }
    } // sing
    C.strcpy(buf, verb);
    (len = C.int(C.strlen(buf)));
    (bspot = C.ptrAdd(C.ptrAdd(buf, len, "char"), -(1), "char"));
    if (Number(!(C.strncmpi((buf), (C.literal("are")), C.int((-1)))))) {
        C.strcasecpy(buf, C.literal("is"));
    }
    else if (Number(!(C.strncmpi((buf), (C.literal("have")), C.int((-1)))))) {
        C.strcasecpy(C.ptrAdd(bspot, -(1), "char"), C.literal("s"));
    }
    else if (Number(!!(Number(!!(C.strchr(C.literal("zxs"), C.lowc(C.deref(bspot, "char"))) || (Number(!!(Number(!!(Number(len >= 2) && Number(C.lowc(C.deref(bspot, "char")) == 104))) && C.strchr(C.literal("cs"), C.lowc(C.deref((C.ptrAdd(bspot, -(1), "char")), "char")))))))) || (Number(!!(Number(len == 2) && Number(C.lowc(C.deref(bspot, "char")) == 111))))))) {
/* Ends in z, x, s, ch, sh; add an "es" */
        C.strcasecpy(C.ptrAdd(bspot, 1, "char"), C.literal("es"));
    }
    else if (Number(!!(Number(C.lowc(C.deref(bspot, "char")) == 121) && Number(!(C.strchr(C.vowels, C.lowc(C.deref((C.ptrAdd(bspot, -(1), "char")), "char")))))))) {
/* like "y" case in makeplural */
        C.strcasecpy(bspot, C.literal("ies"));
    }
    else {
        C.strcasecpy(C.ptrAdd(bspot, 1, "char"), C.literal("s"));
    }
    return buf;
}

/* word pairs that don't fit into formula-based transformations;
   also some suffices which have very few--often one--matches or
   which aren't systematically reversible (knives, staves) */
export const one_off = [
    {sing: "child", plur: "children"},      /* (for wise guys who give their food funny names) */
    {sing: "cubus", plur: "cubi"}, /* in-/suc-cubus */
    {sing: "culus", plur: "culi"}, /* homunculus */
    {sing: "Cyclops", plur: "Cyclopes"},
    {sing: "djinni", plur: "djinn"},
    {sing: "erinys", plur: "erinyes"},
    {sing: "foot", plur: "feet"},
    {sing: "fungus", plur: "fungi"},
    {sing: "goose", plur: "geese"},
    {sing: "knife", plur: "knives"},
    {sing: "labrum", plur: "labra"}, /* candelabrum */
    {sing: "louse", plur: "lice"},
    {sing: "mouse", plur: "mice"},
    {sing: "mumak", plur: "mumakil"},
    {sing: "nemesis", plur: "nemeses"},
    {sing: "ovum", plur: "ova"},
    {sing: "ox", plur: "oxen"},
    {sing: "passerby", plur: "passersby"},
    {sing: "rtex", plur: "rtices"}, /* vortex */
    {sing: "serum", plur: "sera"},
    {sing: "staff", plur: "staves"},
    {sing: "tooth", plur: "teeth"},
    {sing: 0, plur: 0}
];

export const as_is = [
    /* makesingular() leaves these plural due to how they're used */
    "boots",   "shoes",     "gloves",    "lenses",   "scales",
    "eyes",    "gauntlets", "iron bars",
    /* both singular and plural are spelled the same */
    "bison",   "deer",      "elk",       "fish",      "fowl",
    "tuna",    "yaki",      "-hai",      "krill",     "manes",
    "moose",   "ninja",     "sheep",     "ronin",     "roshi",
    "shito",   "tengu",     "ki-rin",    "Nazgul",    "gunyoki",
    "piranha", "samurai",   "shuriken",  "haggis",    "Bordeaux",
    0,
    /* Note:  "fish" and "piranha" are collective plurals, suitable
       for "wiped out all <foo>".  For "3 <foo>", they should be
       "fishes" and "piranhas" instead.  We settle for collective
       variant instead of attempting to support both. */
];

/* singularize/pluralize decisions common to both makesingular & makeplural */
export function singplur_lookup(basestr, endstring, to_plural, alt_as_is) /* base string, pointer to eos(string) */
/* true => makeplural, false => makesingular */
/* another set like as_is[] */
{
    basestr = C.argument(basestr, "char *");
    endstring = C.argument(endstring, "char *");
    to_plural = C.argument(to_plural, "boolean");
    alt_as_is = C.argument(alt_as_is, "const char *const *");
    let sp;
    let same;
    let other;
    let as;
    let al;
    let baselen = C.int(C.Strlen_(basestr, C.literal("singplur_lookup"), 2716));
    for ((as = C.as_is); C.deref(as, "const char *const"); (as = C.ptrAdd(as, 1, "char *"))) {
        (al = C.int(C.strlen(C.deref(as, "const char *const"))));
        if (Number(!((Number(!!(C.ptrCompare((C.ptrAdd(endstring, -(al), "char")), basestr, "<") || C.strncmpi(((C.ptrAdd(endstring, -(al), "char"))), (C.deref(as, "const char *const")), C.int((-1))))))))) return (C.char(1));
    }
    if (alt_as_is) {
        for ((as = alt_as_is); C.deref(as, "const char *const"); (as = C.ptrAdd(as, 1, "char *"))) {
            (al = C.int(C.strlen(C.deref(as, "const char *const"))));
            if (Number(!((Number(!!(C.ptrCompare((C.ptrAdd(endstring, -(al), "char")), basestr, "<") || C.strncmpi(((C.ptrAdd(endstring, -(al), "char"))), (C.deref(as, "const char *const")), C.int((-1))))))))) return (C.char(1));
        }
    }
/* Leave "craft" as a suffix as-is (aircraft, hovercraft);
      "craft" itself is (arguably) not included in our likely context */
    if (Number(!!((Number(baselen > 5)) && (Number(!((Number(!!(C.ptrCompare((C.ptrAdd(endstring, -(5), "char")), basestr, "<") || C.strncmpi(((C.ptrAdd(endstring, -(5), "char"))), (C.literal("craft")), C.int((-1)))))))))))) return (C.char(1));
/* avoid false hit on one_off[].plur == "lice" or .sing == "goose";
       if more of these turn up, one_off[] entries will need to flagged
       as to which are whole words and which are matchable as suffices
       then matching in the loop below will end up becoming more complex */
    if (Number(!!(Number(!(C.strncmpi((basestr), (C.literal("slice")), C.int((-1))))) || Number(!(C.strncmpi((basestr), (C.literal("mongoose")), C.int((-1)))))))) {
        if (to_plural) C.strcasecpy(endstring, C.literal("s"));
        return (C.char(1));
    }
/* skip "ox" -> "oxen" entry when pluralizing "<something>ox"
       unless it is muskox */
    if (Number(!!(Number(!!(Number(!!(to_plural && Number(baselen > 2))) && Number(!(C.strncmpi((C.ptrAdd(endstring, -(2), "char")), (C.literal("ox")), C.int((-1))))))) && Number(!((Number(!!(Number(baselen > 5) && Number(!(C.strncmpi((C.ptrAdd(endstring, -(6), "char")), (C.literal("muskox")), C.int((-1))))))))))))) {
/* "fox" -> "foxes" */
        C.strcasecpy(endstring, C.literal("es"));
        return (C.char(1));
    }
    if (to_plural) {
        if (Number(!!(Number(!!(Number(baselen > 2) && Number(!(C.strncmpi((C.ptrAdd(endstring, -(3), "char")), (C.literal("man")), C.int((-1))))))) && badman(basestr, to_plural)))) {
            C.strcasecpy(endstring, C.literal("s"));
            return (C.char(1));
        }
    }
    else {
        if (Number(!!(Number(!!(Number(baselen > 2) && Number(!(C.strncmpi((C.ptrAdd(endstring, -(3), "char")), (C.literal("men")), C.int((-1))))))) && badman(basestr, to_plural)))) return (C.char(1));
    }
    for ((sp = C.one_off); (sp).sing; ((sp = C.ptrAdd(sp, 1, "struct sing_plur")), C.ptrAdd(sp, -1, "struct sing_plur"))) {
/* check whether endstring already matches */
        (same = ((to_plural) ? (sp).plur : (sp).sing));
        (al = C.int(C.strlen(same)));
        if (Number(!((Number(!!(C.ptrCompare((C.ptrAdd(endstring, -(al), "char")), basestr, "<") || C.strncmpi(((C.ptrAdd(endstring, -(al), "char"))), (same), C.int((-1))))))))) return (C.char(1));
/* use as-is */
/* check whether it matches the inverse; if so, transform it */
        (other = ((to_plural) ? (sp).sing : (sp).plur));
        (al = C.int(C.strlen(other)));
        if (Number(!((Number(!!(C.ptrCompare((C.ptrAdd(endstring, -(al), "char")), basestr, "<") || C.strncmpi(((C.ptrAdd(endstring, -(al), "char"))), (other), C.int((-1))))))))) {
            C.strcasecpy(C.ptrAdd(endstring, -(al), "char"), same);
            return (C.char(1));
/* one_off[] transformation */
        }
    }
    return (C.char(0));
}

/* searches for common compounds, ex. lump of royal jelly */
export function singplur_compound(str) {
    str = C.argument(str, "char *");
/* if new entries are added, be sure to keep compound_start[] in sync */
    C.declareStatic("singplur_compound.compounds", "const char *const[18]", [C.literal(" of "), C.literal(" labeled "), C.literal(" called "), C.literal(" named "), C.literal(" above"), C.literal(" versus "), C.literal(" from "), C.literal(" in "), C.literal(" on "), C.literal(" a la "), C.literal(" with"), C.literal(" de "), C.literal(" d'"), C.literal(" du "), C.literal(" au "), C.literal("-in-"), C.literal("-at-"), 0]);
    C.declareStatic("singplur_compound.compound_start", "const char[3]", C.literal(" -"));
/* lurkers above */
/* " with "? */
/* list of first characters for all compounds[] entries */
    let cmpd;
    let p;
    for ((p = str); C.deref(p, "char"); (p = C.ptrAdd(p, 1, "char"))) {
/* substring starting at p can only match if *p is found
           within compound_start[] */
        if (Number(!(C.strchr(C.staticCell("singplur_compound.compound_start").value, C.deref(p, "char"))))) continue;
/* check current substring against all words in the compound[] list */
        for ((cmpd = C.staticCell("singplur_compound.compounds").value); C.deref(cmpd, "const char *const"); (cmpd = C.ptrAdd(cmpd, 1, "char *"))) if (Number(!(C.strncmpi(p, C.deref(cmpd, "const char *const"), C.int(C.strlen(C.deref(cmpd, "const char *const"))))))) return p;
    }
/* wasn't recognized as a compound phrase */
    return 0;
}

/* Plural routine; once upon a time it may have been chiefly used for
 * user-defined fruits, but it is now used extensively throughout the
 * program.
 *
 * For fruit, we have to try to account for everything reasonable the
 * player has; something unreasonable can still break the code.
 * However, it's still a lot more accurate than "just add an 's' at the
 * end", which Rogue uses...
 *
 * Also used for plural monster names ("Wiped out all homunculi." or the
 * vanquished monsters list) and body parts.  A lot of unique monsters have
 * names which get mangled by makeplural and/or makesingular.  They're not
 * genocidable, and vanquished-mon handling does its own special casing
 * (for uniques who've been revived and re-killed), so we don't bother
 * trying to get those right here.
 *
 * Also misused by muse.c to convert 1st person present verbs to 2nd person.
 * 3.6.0: made case-insensitive.
 */
export function makeplural(oldstr) {
    oldstr = C.argument(oldstr, "const char *");
    let spot;
    let lo_c;
    let str = nextobuf();
    let excess = 0;
    let len;
    let i;
    bottom: {
    if (oldstr) while (Number(C.deref(oldstr, "const char") == 32)) ((oldstr = C.ptrAdd(oldstr, 1, "char")), C.ptrAdd(oldstr, -1, "char"));
    if (Number(!!(Number(!(oldstr)) || Number(!(C.deref(oldstr, "const char")))))) {
        C.impossible(C.literal("plural of null?"), "");
        C.strcpy(str, C.literal("s"));
        return str;
    }
/* makeplural() is sometimes used on monsters rather than objects
       and sometimes pronouns are used for monsters, so check those;
       unfortunately, "her" (which matches genders[1].him and [1].his)
       and "it" (which matches genders[2].he and [2].him) are ambiguous;
       we'll live with that; caller can fix things up if necessary */
    C.store(str, "char", C.char(0));
    for ((i = 0); Number(i <= 2); (++i)) {
        if (Number(!(C.strncmpi(((C.deref(C.ptrAdd(C.genders, i, "const struct Gender"), "const struct Gender")).he), (oldstr), C.int((-1)))))) C.strcpy(str, (C.deref(C.ptrAdd(C.genders, 3, "const struct Gender"), "const struct Gender")).he);
        else /* "they" */
        if (Number(!(C.strncmpi(((C.deref(C.ptrAdd(C.genders, i, "const struct Gender"), "const struct Gender")).him), (oldstr), C.int((-1)))))) C.strcpy(str, (C.deref(C.ptrAdd(C.genders, 3, "const struct Gender"), "const struct Gender")).him);
        else /* "them" */
        if (Number(!(C.strncmpi(((C.deref(C.ptrAdd(C.genders, i, "const struct Gender"), "const struct Gender")).his), (oldstr), C.int((-1)))))) C.strcpy(str, (C.deref(C.ptrAdd(C.genders, 3, "const struct Gender"), "const struct Gender")).his);
/* "their" */
        if (C.deref(str, "char")) {
            if (Number(C.deref(C.ptrAdd(oldstr, 0, "const char"), "const char") == C.highc(C.deref(C.ptrAdd(oldstr, 0, "const char"), "const char")))) C.store(C.ptrAdd(str, 0, "char"), "char", C.highc(C.deref(C.ptrAdd(str, 0, "char"), "char")));
            return str;
        }
    }
    C.strcpy(str, oldstr);
/*
     * Skip changing "pair of" to "pairs of".  According to Webster, usual
     * English usage is use pairs for humans, e.g. 3 pairs of dancers,
     * and pair for objects and non-humans, e.g. 3 pair of boots.  We don't
     * refer to pairs of humans in this game so just skip to the bottom.
     */
    if (Number(!(C.strncmpi(str, C.literal("pair of "), 8)))) break bottom;
/* look for "foo of bar" so that we can focus on "foo" */
    if (C.ptrCompare(((spot = singplur_compound(str))), 0, "!=")) {
        (excess = C.ptrAdd(oldstr, C.int((C.ptrDiff(spot, str, "char"))), "const char"));
        C.store(spot, "char", C.char(0));
    }
    else (spot = C.eos(str));
    ((spot = C.ptrAdd(spot, -1, "char")), C.ptrAdd(spot, 1, "char"));
    while (Number(!!(C.ptrCompare(spot, str, ">") && Number(C.deref(spot, "char") == 32)))) ((spot = C.ptrAdd(spot, -1, "char")), C.ptrAdd(spot, 1, "char"));
/* Strip blanks from end */
    C.store((C.ptrAdd(spot, 1, "char")), "char", C.char(0));
/* Now spot is the last character of the string */
    (len = C.int(C.Strlen_(str, C.literal("makeplural"), 2895)));
/* Single letters */
    if (Number(!!(Number(len == 1) || Number(!(C.letter(C.deref(spot, "char"))))))) {
        C.strcpy(C.ptrAdd(spot, 1, "char"), C.literal("'s"));
        break bottom;
    }
/* dispense with some words which don't need pluralization */
{
        C.declareStatic("makeplural.already_plural", "const char *const[4]", [C.literal("ae"), C.literal("eaux"), C.literal("matzot"), 0]);
/* algae, larvae, &c */
/* chateaux, gateaux */
/* spot+1: synch up with makesingular's usage */
        if (singplur_lookup(str, C.ptrAdd(spot, 1, "char"), (C.char(1)), C.staticCell("makeplural.already_plural").value)) break bottom;
/* more of same, but not suitable for blanket loop checking */
        if (Number(!!((Number(!!(Number(len == 2) && Number(!(C.strncmpi((str), (C.literal("ya")), C.int((-1)))))))) || (Number(!!(Number(len >= 3) && Number(!(C.strncmpi((C.ptrAdd(spot, -(2), "char")), (C.literal(" ya")), C.int((-1))))))))))) break bottom;
    }
/* man/men ("Wiped out all cavemen.") */
    if (Number(!!(Number(!!(Number(len >= 3) && Number(!(C.strncmpi((C.ptrAdd(spot, -(2), "char")), (C.literal("man")), C.int((-1))))))) && Number(!(badman(str, (C.char(1)))))))) /* exclude shamans and humans etc */
{
        C.strcasecpy(C.ptrAdd(spot, -(1), "char"), C.literal("en"));
        break bottom;
    }
    if (Number(C.lowc(C.deref(spot, "char")) == 102)) {
/* (staff handled via one_off[]) */
        (lo_c = C.lowc(C.deref((C.ptrAdd(spot, -(1), "char")), "char")));
        if (Number(!!(Number(len >= 3) && Number(!(C.strncmpi((C.ptrAdd(spot, -(2), "char")), (C.literal("erf")), C.int((-1)))))))) {
/* avoid "nerf" -> "nerves", "serf" -> "serves" */
            ;
/* fall through to default (append 's') */
        }
        else if (Number(!!(C.strchr(C.literal("lr"), lo_c) || C.strchr(C.vowels, lo_c)))) {
/* [aeioulr]f to [aeioulr]ves */
            C.strcasecpy(spot, C.literal("ves"));
            break bottom;
        }
    }
/* ium/ia (mycelia, baluchitheria) */
    if (Number(!!(Number(len >= 3) && Number(!(C.strncmpi((C.ptrAdd(spot, -(2), "char")), (C.literal("ium")), C.int((-1)))))))) {
        C.strcasecpy(C.ptrAdd(spot, -(2), "char"), C.literal("ia"));
        break bottom;
    }
/* algae, larvae, hyphae (another fungus part) */
    if (Number(!!(Number(!!(Number(!!((Number(!!(Number(len >= 4) && Number(!(C.strncmpi((C.ptrAdd(spot, -(3), "char")), (C.literal("alga")), C.int((-1)))))))) || (Number(!!(Number(len >= 5) && (Number(!!(Number(!(C.strncmpi((C.ptrAdd(spot, -(4), "char")), (C.literal("hypha")), C.int((-1))))) || Number(!(C.strncmpi((C.ptrAdd(spot, -(4), "char")), (C.literal("larva")), C.int((-1))))))))))))) || (Number(!!(Number(len >= 6) && Number(!(C.strncmpi((C.ptrAdd(spot, -(5), "char")), (C.literal("amoeba")), C.int((-1)))))))))) || (Number(!!(Number(len >= 8) && (Number(!(C.strncmpi((C.ptrAdd(spot, -(7), "char")), (C.literal("vertebra")), C.int((-1)))))))))))) {
/* a to ae */
        C.strcasecpy(C.ptrAdd(spot, 1, "char"), C.literal("e"));
        break bottom;
    }
/* fungus/fungi, homunculus/homunculi, but buses, lotuses, wumpuses */
    if (Number(!!(Number(!!(Number(len > 3) && Number(!(C.strncmpi((C.ptrAdd(spot, -(1), "char")), (C.literal("us")), C.int((-1))))))) && Number(!((Number(!!((Number(!!(Number(len >= 5) && Number(!(C.strncmpi((C.ptrAdd(spot, -(4), "char")), (C.literal("lotus")), C.int((-1)))))))) || (Number(!!(Number(len >= 6) && Number(!(C.strncmpi((C.ptrAdd(spot, -(5), "char")), (C.literal("wumpus")), C.int((-1)))))))))))))))) {
        C.strcasecpy(C.ptrAdd(spot, -(1), "char"), C.literal("i"));
        break bottom;
    }
/* sis/ses (nemesis) */
    if (Number(!!(Number(len >= 3) && Number(!(C.strncmpi((C.ptrAdd(spot, -(2), "char")), (C.literal("sis")), C.int((-1)))))))) {
        C.strcasecpy(C.ptrAdd(spot, -(1), "char"), C.literal("es"));
        break bottom;
    }
/* -eau/-eaux (gateau, chapeau...) */
    if (Number(!!(Number(!!(Number(len >= 3) && Number(!(C.strncmpi((C.ptrAdd(spot, -(2), "char")), (C.literal("eau")), C.int((-1))))))) && (Number(!!(C.ptrCompare((C.ptrAdd(spot, -(5), "char")), str, "<") || C.strncmpi(((C.ptrAdd(spot, -(5), "char"))), (C.literal("bureau")), C.int((-1))))))))) /* 'bureaus' is the more common plural of 'bureau' */
{
        C.strcasecpy(C.ptrAdd(spot, 1, "char"), C.literal("x"));
        break bottom;
    }
/* matzoh/matzot, possible food name */
    if (Number(!!(Number(len >= 6) && (Number(!!(Number(!(C.strncmpi((C.ptrAdd(spot, -(5), "char")), (C.literal("matzoh")), C.int((-1))))) || Number(!(C.strncmpi((C.ptrAdd(spot, -(5), "char")), (C.literal("matzah")), C.int((-1))))))))))) {
        C.strcasecpy(C.ptrAdd(spot, -(1), "char"), C.literal("ot"));
/* oh/ah -> ot */
        break bottom;
    }
    if (Number(!!(Number(len >= 5) && (Number(!!(Number(!(C.strncmpi((C.ptrAdd(spot, -(4), "char")), (C.literal("matzo")), C.int((-1))))) || Number(!(C.strncmpi((C.ptrAdd(spot, -(4), "char")), (C.literal("matza")), C.int((-1))))))))))) {
        C.strcasecpy(spot, C.literal("ot"));
/* o/a -> ot */
        break bottom;
    }
/* note: ox/oxen, VAX/VAXen, goose/geese */
    (lo_c = C.lowc(C.deref(spot, "char")));
/* codex/spadix/neocortex and the like */
    if (Number(!!(Number(!!(Number(len >= 5) && (Number(!!(Number(!!(Number(!(C.strncmpi((C.ptrAdd(spot, -(2), "char")), (C.literal("dex")), C.int((-1))))) || Number(!(C.strncmpi((C.ptrAdd(spot, -(2), "char")), (C.literal("dix")), C.int((-1))))))) || Number(!(C.strncmpi((C.ptrAdd(spot, -(2), "char")), (C.literal("tex")), C.int((-1)))))))))) && (Number(C.strncmpi((C.ptrAdd(spot, -(4), "char")), (C.literal("index")), C.int((-1))) != 0))))) /* indices would have been ok too, but stick with indexes */
{
        C.strcasecpy(C.ptrAdd(spot, -(1), "char"), C.literal("ices"));
/* ex|ix -> ices */
        break bottom;
    }
/* Ends in z, x, s, ch, sh; add an "es" */
    if (Number(!!(Number(!!(Number(!!(C.strchr(C.literal("zxs"), lo_c) || (Number(!!(Number(!!(Number(!!(Number(len >= 2) && Number(lo_c == 104))) && C.strchr(C.literal("cs"), C.lowc(C.deref((C.ptrAdd(spot, -(1), "char")), "char"))))) && Number(!((Number(!!(Number(!!(Number(len >= 4) && Number(C.lowc(C.deref((C.ptrAdd(spot, -(1), "char")), "char")) == 99))) && ch_ksound(str))))))))))) || (Number(!!(Number(len >= 4) && Number(!(C.strncmpi((C.ptrAdd(spot, -(2), "char")), (C.literal("ato")), C.int((-1)))))))))) || (Number(!!(Number(len >= 5) && Number(!(C.strncmpi((C.ptrAdd(spot, -(4), "char")), (C.literal("dingo")), C.int((-1))))))))))) /* 21st century k-sound */
/* Kludge to get "tomatoes" and "potatoes" right */
{
        C.strcasecpy(C.ptrAdd(spot, 1, "char"), C.literal("es"));
/* append es */
        break bottom;
    }
/* Ends in y preceded by consonant (note: also "qu") change to "ies" */
    if (Number(!!(Number(lo_c == 121) && Number(!(C.strchr(C.vowels, C.lowc(C.deref((C.ptrAdd(spot, -(1), "char")), "char")))))))) {
        C.strcasecpy(spot, C.literal("ies"));
/* y -> ies */
        break bottom;
    }
/* Default: append an 's' */
    C.strcasecpy(C.ptrAdd(spot, 1, "char"), C.literal("s"));
    } // bottom
    if (excess) C.strcat(str, excess);
    return str;
}

/*
 * Singularize a string the user typed in; this helps reduce the complexity
 * of readobjnam, and is also used in pager.c to singularize the string
 * for which help is sought.
 *
 * "Manes" is ambiguous: monster type (keep s), or horse body part (drop s)?
 * Its inclusion in as_is[]/special_subj[] makes it get treated as the former.
 *
 * A lot of unique monsters have names ending in s; plural, or singular
 * from plural, doesn't make much sense for them so we don't bother trying.
 * 3.6.0: made case-insensitive.
 */
export function makesingular(oldstr) {
    oldstr = C.argument(oldstr, "const char *");
    let p;
    let bp;
    let excess = 0;
    let str = nextobuf();
    bottom: {
    if (oldstr) while (Number(C.deref(oldstr, "const char") == 32)) ((oldstr = C.ptrAdd(oldstr, 1, "char")), C.ptrAdd(oldstr, -1, "char"));
    if (Number(!!(Number(!(oldstr)) || Number(!(C.deref(oldstr, "const char")))))) {
        C.impossible(C.literal("singular of null?"), "");
        C.store(C.ptrAdd(str, 0, "char"), "char", C.char(0));
        return str;
    }
/* makeplural() of pronouns isn't reversible but at least we can
       force a singular value */
    C.store(str, "char", C.char(0));
    if (Number(!(C.strncmpi(((C.deref(C.ptrAdd(C.genders, 3, "const struct Gender"), "const struct Gender")).he), (oldstr), C.int((-1)))))) /* "they" */
    C.strcpy(str, (C.deref(C.ptrAdd(C.genders, 2, "const struct Gender"), "const struct Gender")).he);
    else /* "it" */
    if (Number(!(C.strncmpi(((C.deref(C.ptrAdd(C.genders, 3, "const struct Gender"), "const struct Gender")).him), (oldstr), C.int((-1)))))) /* "them" */
    C.strcpy(str, (C.deref(C.ptrAdd(C.genders, 2, "const struct Gender"), "const struct Gender")).him);
    else /* also "it" */
    if (Number(!(C.strncmpi(((C.deref(C.ptrAdd(C.genders, 3, "const struct Gender"), "const struct Gender")).his), (oldstr), C.int((-1)))))) /* "their" */
    C.strcpy(str, (C.deref(C.ptrAdd(C.genders, 2, "const struct Gender"), "const struct Gender")).his);
/* "its" */
    if (C.deref(str, "char")) {
        if (Number(C.deref(C.ptrAdd(oldstr, 0, "const char"), "const char") == C.highc(C.deref(C.ptrAdd(oldstr, 0, "const char"), "const char")))) C.store(C.ptrAdd(str, 0, "char"), "char", C.highc(C.deref(C.ptrAdd(str, 0, "char"), "char")));
        return str;
    }
    (bp = C.strcpy(str, oldstr));
/* check for "foo of bar" so that we can focus on "foo" */
    if (C.ptrCompare(((p = singplur_compound(bp))), 0, "!=")) {
        (excess = C.ptrAdd(oldstr, C.int((C.ptrDiff(p, bp, "char"))), "const char"));
        C.store(p, "char", C.char(0));
    }
    else (p = C.eos(bp));
/* dispense with some words which don't need singularization */
    if (singplur_lookup(bp, p, (C.char(0)), C.special_subjs)) break bottom;
/* remove -s or -es (boxes) or -ies (rubies) */
    if (Number(!!(C.ptrCompare(p, C.ptrAdd(bp, 1, "char"), ">=") && Number(C.lowc(C.deref(C.ptrAdd(p, C.int((-1)), "char"), "char")) == 115)))) {
        mins: {
        if (Number(!!(C.ptrCompare(p, C.ptrAdd(bp, 2, "char"), ">=") && Number(C.lowc(C.deref(C.ptrAdd(p, C.int((-2)), "char"), "char")) == 101)))) {
            if (Number(!!(C.ptrCompare(p, C.ptrAdd(bp, 3, "char"), ">=") && Number(C.lowc(C.deref(C.ptrAdd(p, C.int((-3)), "char"), "char")) == 105)))) {
/* "ies" */
                if (Number(!!(Number(!!(Number(!!(Number(!!(Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(7), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(7), "char"))), (C.literal("cookies")), C.int((-1)))))))) || (Number(!!(Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(4), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(4), "char"))), (C.literal("pies")), C.int((-1)))))))) && (Number(!!(C.ptrCompare(C.ptrAdd(p, -(4), "char"), bp, "==") || Number(C.deref(C.ptrAdd(p, C.int((-5)), "char"), "char") == 32))))))))) || (Number(!!(Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(6), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(6), "char"))), (C.literal("genies")), C.int((-1)))))))) && (Number(!!(C.ptrCompare(C.ptrAdd(p, -(6), "char"), bp, "==") || Number(C.deref(C.ptrAdd(p, C.int((-7)), "char"), "char") == 32))))))))) || Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(5), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(5), "char"))), (C.literal("mbies")), C.int((-1)))))))))) || Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(5), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(5), "char"))), (C.literal("yries")), C.int((-1))))))))))) /* avoid false match for "harpies" */
/* alternate djinni/djinn spelling; not really needed */
/* avoid false match for "progenies" */
/* zombie */
/* valkyrie */
                break mins;
                C.strcasecpy(C.ptrAdd(p, -(3), "char"), C.literal("y"));
/* ies -> y */
                break bottom;
            }
/* wolves, but f to ves isn't fully reversible */
            if (Number(!!(Number(!!(C.ptrCompare(C.ptrAdd(p, -(4), "char"), bp, ">=") && (Number(!!(C.strchr(C.literal("lr"), C.lowc(C.deref((C.ptrAdd(p, -(4), "char")), "char"))) || C.strchr(C.vowels, C.lowc(C.deref((C.ptrAdd(p, -(4), "char")), "char")))))))) && Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(3), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(3), "char"))), (C.literal("ves")), C.int((-1))))))))))) {
                if (Number(!!(Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(6), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(6), "char"))), (C.literal("cloves")), C.int((-1)))))))) || Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(6), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(6), "char"))), (C.literal("nerves")), C.int((-1))))))))))) break mins;
                C.strcasecpy(C.ptrAdd(p, -(3), "char"), C.literal("f"));
/* ves -> f */
                break bottom;
            }
/* note: nurses, axes but boxes, wumpuses */
            if (Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(4), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(4), "char"))), (C.literal("eses")), C.int((-1)))))))) || Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(4), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(4), "char"))), (C.literal("oxes")), C.int((-1)))))))))) || Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(4), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(4), "char"))), (C.literal("nxes")), C.int((-1)))))))))) || Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(4), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(4), "char"))), (C.literal("ches")), C.int((-1)))))))))) || Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(4), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(4), "char"))), (C.literal("uses")), C.int((-1)))))))))) || Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(4), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(4), "char"))), (C.literal("shes")), C.int((-1)))))))))) || Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(4), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(4), "char"))), (C.literal("sses")), C.int((-1)))))))))) || Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(5), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(5), "char"))), (C.literal("atoes")), C.int((-1)))))))))) || Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(7), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(7), "char"))), (C.literal("dingoes")), C.int((-1)))))))))) || Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(7), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(7), "char"))), (C.literal("Aleaxes")), C.int((-1))))))))))) /* boxes, foxes */
/* lynxes */
/* lotuses */
/* splashes [of venom] */
/* priestesses */
/* tomatoes */
{
                C.store((C.ptrAdd(p, -(2), "char")), "char", C.char(0));
/* drop es */
                break bottom;
            }
/* else fall through to mins */
/* ends in 's' but not 'es' */
        }
        else if (Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(2), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(2), "char"))), (C.literal("us")), C.int((-1))))))))) {
/* lotus, fungus... */
            if (Number(!!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(6), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(6), "char"))), (C.literal("tengus")), C.int((-1)))))) && (Number(!!(C.ptrCompare((C.ptrAdd(p, -(7), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(7), "char"))), (C.literal("hezrous")), C.int((-1))))))))) /* but not these... */
            break bottom;
        }
        else if (Number(!!(Number(!!(Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(2), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(2), "char"))), (C.literal("ss")), C.int((-1)))))))) || Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(5), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(5), "char"))), (C.literal(" lens")), C.int((-1)))))))))) || (Number(!!(C.ptrCompare(C.ptrAdd(p, -(4), "char"), bp, "==") && Number(!(C.strncmpi((C.ptrAdd(p, -(4), "char")), (C.literal("lens")), C.int((-1))))))))))) {
            break bottom;
        }
        } // mins
        C.store((C.ptrAdd(p, -(1), "char")), "char", C.char(0));
/* drop s */
    }
    else {
/* input doesn't end in 's' */
        if (Number(!!(Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(3), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(3), "char"))), (C.literal("men")), C.int((-1)))))))) && Number(!(badman(bp, (C.char(0)))))))) {
            C.strcasecpy(C.ptrAdd(p, -(2), "char"), C.literal("an"));
            break bottom;
        }
/* matzot -> matzo, algae -> alga */
        if (Number(!!(Number(!!(Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(6), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(6), "char"))), (C.literal("matzot")), C.int((-1)))))))) || Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(2), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(2), "char"))), (C.literal("ae")), C.int((-1)))))))))) || Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(4), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(4), "char"))), (C.literal("eaux")), C.int((-1))))))))))) {
            C.store((C.ptrAdd(p, -(1), "char")), "char", C.char(0));
/* drop t/e/x */
            break bottom;
        }
/* balactheria -> balactherium */
        if (Number(!!(Number(!!(Number(!!(C.ptrCompare(C.ptrAdd(p, -(4), "char"), bp, ">=") && Number(!(C.strncmpi((C.ptrAdd(p, -(2), "char")), (C.literal("ia")), C.int((-1))))))) && C.strchr(C.literal("lr"), C.lowc(C.deref((C.ptrAdd(p, -(3), "char")), "char"))))) && Number(C.lowc(C.deref((C.ptrAdd(p, -(4), "char")), "char")) == 101)))) {
            C.strcasecpy(C.ptrAdd(p, -(1), "char"), C.literal("um"));
/* a -> um */
        }
/* here we cannot find the plural suffix */
    }
    } // bottom
/* if we stripped off a suffix (" of bar" from "foo of bar"),
       put it back now [strcat() isn't actually 100% safe here...] */
    if (excess) C.strcat(bp, excess);
    return bp;
}

export function ch_ksound(basestr) {
    basestr = C.argument(basestr, "const char *");
/* these are some *ch words/suffixes that make a k-sound. They pluralize by
       adding 's' rather than 'es' */
    C.declareStatic("ch_ksound.ch_k", "const char *const[19]", [C.literal("monarch"), C.literal("poch"), C.literal("tech"), C.literal("mech"), C.literal("stomach"), C.literal("psych"), C.literal("amphibrach"), C.literal("anarch"), C.literal("atriarch"), C.literal("azedarach"), C.literal("broch"), C.literal("gastrotrich"), C.literal("isopach"), C.literal("loch"), C.literal("oligarch"), C.literal("peritrich"), C.literal("sandarach"), C.literal("sumach"), C.literal("symposiarch")]);
    let i;
    let al;
    let endstr;
    if (Number(!!(Number(!(basestr)) || Number(C.strlen(basestr) < C.ulong(4))))) return (C.char(0));
    (endstr = C.eos(basestr));
    for ((i = 0); Number(i < C.int((C.ulong((BigInt(C.sizeof("const char *const[19]")) / BigInt(C.sizeof("const char *const"))))))); (i++)) {
        (al = C.int(C.strlen(C.deref(C.ptrAdd(C.staticCell("ch_ksound.ch_k").value, i, "const char *const"), "const char *const"))));
        if (Number(!((Number(!!(C.ptrCompare((C.ptrAdd(endstr, -(al), "const char")), basestr, "<") || C.strncmpi(((C.ptrAdd(endstr, -(al), "const char"))), (C.deref(C.ptrAdd(C.staticCell("ch_ksound.ch_k").value, i, "const char *const"), "const char *const")), C.int((-1))))))))) return (C.char(1));
    }
    return (C.char(0));
}

export function badman(basestr, to_plural) /* True: makeplural, False: makesingular */
{
    basestr = C.argument(basestr, "const char *");
    to_plural = C.argument(to_plural, "boolean");
/* these are all the prefixes for *man that don't have a *men plural */
    C.declareStatic("badman.no_men", "const char *const[36]", [C.literal("albu"), C.literal("antihu"), C.literal("anti"), C.literal("ata"), C.literal("auto"), C.literal("bildungsro"), C.literal("cai"), C.literal("cay"), C.literal("ceru"), C.literal("corner"), C.literal("decu"), C.literal("des"), C.literal("dura"), C.literal("fir"), C.literal("hanu"), C.literal("het"), C.literal("infrahu"), C.literal("inhu"), C.literal("nonhu"), C.literal("otto"), C.literal("out"), C.literal("prehu"), C.literal("protohu"), C.literal("subhu"), C.literal("superhu"), C.literal("talis"), C.literal("unhu"), C.literal("sha"), C.literal("hu"), C.literal("un"), C.literal("le"), C.literal("re"), C.literal("so"), C.literal("to"), C.literal("at"), C.literal("a")]);
/* these are all the prefixes for *men that don't have a *man singular */
    C.declareStatic("badman.no_man", "const char *const[31]", [C.literal("abdo"), C.literal("acu"), C.literal("agno"), C.literal("ceru"), C.literal("cogno"), C.literal("cycla"), C.literal("fleh"), C.literal("grava"), C.literal("hegu"), C.literal("preno"), C.literal("sonar"), C.literal("speci"), C.literal("dai"), C.literal("exa"), C.literal("fla"), C.literal("sta"), C.literal("teg"), C.literal("tegu"), C.literal("vela"), C.literal("da"), C.literal("hy"), C.literal("lu"), C.literal("no"), C.literal("nu"), C.literal("ra"), C.literal("ru"), C.literal("se"), C.literal("vi"), C.literal("ya"), C.literal("o"), C.literal("a")]);
    let i;
    let al;
    let endstr;
    let spot;
    if (Number(!!(Number(!(basestr)) || Number(C.strlen(basestr) < C.ulong(4))))) return (C.char(0));
    (endstr = C.eos(basestr));
    if (to_plural) {
        for ((i = 0); Number(i < C.int((C.ulong((BigInt(C.sizeof("const char *const[36]")) / BigInt(C.sizeof("const char *const"))))))); (i++)) {
            (al = C.int(C.strlen(C.deref(C.ptrAdd(C.staticCell("badman.no_men").value, i, "const char *const"), "const char *const"))));
            (spot = C.ptrAdd(endstr, -((C.int((al + 3)))), "const char"));
            if (Number(!!(Number(!((Number(!!(C.ptrCompare((spot), basestr, "<") || C.strncmpi((spot), C.deref(C.ptrAdd(C.staticCell("badman.no_men").value, i, "const char *const"), "const char *const"), al)))))) && (Number(!!(C.ptrCompare(spot, basestr, "==") || Number(C.deref((C.ptrAdd(spot, -(1), "const char")), "const char") == 32))))))) return (C.char(1));
        }
    }
    else {
        for ((i = 0); Number(i < C.int((C.ulong((BigInt(C.sizeof("const char *const[31]")) / BigInt(C.sizeof("const char *const"))))))); (i++)) {
            (al = C.int(C.strlen(C.deref(C.ptrAdd(C.staticCell("badman.no_man").value, i, "const char *const"), "const char *const"))));
            (spot = C.ptrAdd(endstr, -((C.int((al + 3)))), "const char"));
            if (Number(!!(Number(!((Number(!!(C.ptrCompare((spot), basestr, "<") || C.strncmpi((spot), C.deref(C.ptrAdd(C.staticCell("badman.no_man").value, i, "const char *const"), "const char *const"), al)))))) && (Number(!!(C.ptrCompare(spot, basestr, "==") || Number(C.deref((C.ptrAdd(spot, -(1), "const char")), "const char") == 32))))))) return (C.char(1));
        }
    }
    return (C.char(0));
}

/* compare user string against object name string using fuzzy matching */
export function wishymatch(u_str, o_str, retry_inverted) /* from user, so might be variant spelling */
/* from objects[], so is in canonical form */
/* optional extra "of" handling */
{
    u_str = C.argument(u_str, "const char *");
    o_str = C.argument(o_str, "const char *");
    retry_inverted = C.argument(retry_inverted, "boolean");
    C.declareStatic("wishymatch.detect_SP", "const char[8]", C.literal("detect "));
    C.declareStatic("wishymatch.SP_detection", "const char[11]", C.literal(" detection"));
    let p;
    const buf = C.localArray("char[256]", 0);
/* ignore spaces & hyphens and upper/lower case when comparing */
    if (C.fuzzymatch(u_str, o_str, C.literal(" -"), (C.char(1)))) return (C.char(1));
    if (retry_inverted) {
        let u_of;
        let o_of;
/* when just one of the strings is in the form "foo of bar",
           convert it into "bar foo" and perform another comparison */
        (u_of = C.strstri(u_str, C.literal(" of ")));
        (o_of = C.strstri(o_str, C.literal(" of ")));
        if (Number(!!(u_of && Number(!(o_of))))) {
            C.strcpy(buf, C.ptrAdd(u_of, 4, "const char"));
            C.copynchars(C.eos(C.strcat(buf, C.literal(" "))), u_str, C.int((C.ptrDiff(u_of, u_str, "const char"))));
            if (C.fuzzymatch(buf, o_str, C.literal(" -"), (C.char(1)))) return (C.char(1));
        }
        else if (Number(!!(o_of && Number(!(u_of))))) {
            C.strcpy(buf, C.ptrAdd(o_of, 4, "const char"));
            C.copynchars(C.eos(C.strcat(buf, C.literal(" "))), o_str, C.int((C.ptrDiff(o_of, o_str, "const char"))));
            if (C.fuzzymatch(u_str, buf, C.literal(" -"), (C.char(1)))) return (C.char(1));
        }
    }
/* [note: if something like "elven speed boots" ever gets added, these
       special cases should be changed to call wishymatch() recursively in
       order to get the "of" inversion handling] */
    if (Number(!(C.strncmp(o_str, C.literal("dwarvish "), C.ulong(9))))) {
        if (Number(!(C.strncmpi(u_str, C.literal("dwarven "), 8)))) return C.fuzzymatch(C.ptrAdd(u_str, 8, "const char"), C.ptrAdd(o_str, 9, "const char"), C.literal(" -"), (C.char(1)));
    }
    else if (Number(!(C.strncmp(o_str, C.literal("elven "), C.ulong(6))))) {
        if (Number(!(C.strncmpi(u_str, C.literal("elvish "), 7)))) return C.fuzzymatch(C.ptrAdd(u_str, 7, "const char"), C.ptrAdd(o_str, 6, "const char"), C.literal(" -"), (C.char(1)));
        else if (Number(!(C.strncmpi(u_str, C.literal("elfin "), 6)))) return C.fuzzymatch(C.ptrAdd(u_str, 6, "const char"), C.ptrAdd(o_str, 6, "const char"), C.literal(" -"), (C.char(1)));
    }
    else if (Number(!!(C.strstri(o_str, C.literal("helm")) && C.strstri(u_str, C.literal("helmet"))))) {
        C.copynchars(buf, u_str, C.int((C.int(BigInt(C.sizeof("char[256]"))) - 1)));
        C.strsubst(buf, C.literal("helmet"), C.literal("helm"));
        return C.callLocal(wishymatch, buf, o_str, (C.char(1)));
    }
    else if (Number(!!(C.strstri(o_str, C.literal("gauntlets")) && C.strstri(u_str, C.literal("gloves"))))) {
/* -3: room to replace shorter "gloves" with longer "gauntlets" */
        C.copynchars(buf, u_str, C.int((C.int((C.int(BigInt(C.sizeof("char[256]"))) - 1)) - 3)));
        C.strsubst(buf, C.literal("gloves"), C.literal("gauntlets"));
        return C.callLocal(wishymatch, buf, o_str, (C.char(1)));
    }
    else if (Number(!(C.strncmp(o_str, C.staticCell("wishymatch.detect_SP").value, C.ulong((BigInt(C.sizeof("const char[8]")) - C.ulong(1))))))) {
/* check for "detect <foo>" vs "<foo> detection" */
        if (Number(!!(C.ptrCompare(((p = C.strstri(u_str, C.staticCell("wishymatch.SP_detection").value))), 0, "!=") && Number(!(C.deref((C.ptrAdd(C.ptrAdd(p, BigInt(C.sizeof("const char[11]")), "char"), -(1), "char")), "char")))))) {
/* convert "<foo> detection" into "detect <foo>" */
            C.store(p, "char", C.char(0));
            C.strcat(C.strcpy(buf, C.staticCell("wishymatch.detect_SP").value), u_str);
/* "detect monster" -> "detect monsters" */
            if (Number(!(C.strncmpi((u_str), (C.literal("monster")), C.int((-1)))))) C.strcat(buf, C.literal("s"));
            C.store(p, "char", C.char(32));
            return C.fuzzymatch(buf, o_str, C.literal(" -"), (C.char(1)));
        }
    }
    else if (C.strstri(o_str, C.staticCell("wishymatch.SP_detection").value)) {
/* and the inverse, "<foo> detection" vs "detect <foo>" */
        if (Number(!(C.strncmpi(u_str, C.staticCell("wishymatch.detect_SP").value, C.int(C.ulong((BigInt(C.sizeof("const char[8]")) - C.ulong(1)))))))) {
/* convert "detect <foo>s" into "<foo> detection" */
            (p = makesingular(C.ptrAdd(C.ptrAdd(u_str, BigInt(C.sizeof("const char[8]")), "const char"), -(1), "const char")));
            C.strcat(C.strcpy(buf, p), C.staticCell("wishymatch.SP_detection").value);
/* caller may be looping through objects[], so avoid
               churning through all the obufs */
            releaseobuf(p);
            return C.fuzzymatch(buf, o_str, C.literal(" -"), (C.char(1)));
        }
    }
    else if (C.strstri(o_str, C.literal("ability"))) {
/* when presented with "foo of bar", makesingular() used to
           singularize both foo & bar, but now only does so for foo */
/* catch "{potion(s),ring} of {gain,restore,sustain} abilities" */
        if (Number(!!(C.ptrCompare(((p = C.strstri(u_str, C.literal("abilities")))), 0, "!=") && Number(!(C.deref((C.ptrAdd(C.ptrAdd(p, BigInt(C.sizeof("char[10]")), "char"), -(1), "char")), "char")))))) {
            C.strncpy(buf, u_str, C.ulong(C.uint((C.ptrDiff(p, u_str, "char")))));
            C.strcpy(C.ptrAdd(buf, (C.ptrDiff(p, u_str, "char")), "char"), C.literal("ability"));
            return C.fuzzymatch(buf, o_str, C.literal(" -"), (C.char(1)));
        }
    }
    else if (Number(!(C.strcmp(o_str, C.literal("aluminum"))))) {
/* this special case doesn't really fit anywhere else... */
/* (note that " wand" will have been stripped off by now) */
        if (Number(!(C.strncmpi((u_str), (C.literal("aluminium")), C.int((-1)))))) return C.fuzzymatch(C.ptrAdd(u_str, 9, "const char"), C.ptrAdd(o_str, 8, "const char"), C.literal(" -"), (C.char(1)));
    }
    return (C.char(0));
}

/* wishable subranges of objects */
export const o_ranges = [
    {name: "bag", oclass: "TOOL_CLASS", f_o_range: "SACK", l_o_range: "BAG_OF_TRICKS"},
    {name: "lamp", oclass: "TOOL_CLASS", f_o_range: "OIL_LAMP", l_o_range: "MAGIC_LAMP"},
    {name: "candle", oclass: "TOOL_CLASS", f_o_range: "TALLOW_CANDLE", l_o_range: "WAX_CANDLE"},
    {name: "horn", oclass: "TOOL_CLASS", f_o_range: "TOOLED_HORN", l_o_range: "HORN_OF_PLENTY"},
    {name: "shield", oclass: "ARMOR_CLASS", f_o_range: "SMALL_SHIELD", l_o_range: "SHIELD_OF_REFLECTION"},
    {name: "hat", oclass: "ARMOR_CLASS", f_o_range: "FEDORA", l_o_range: "DUNCE_CAP"},
    {name: "helm", oclass: "ARMOR_CLASS", f_o_range: "ELVEN_LEATHER_HELM", l_o_range: "HELM_OF_TELEPATHY"},
    {name: "gloves", oclass: "ARMOR_CLASS", f_o_range: "LEATHER_GLOVES", l_o_range: "GAUNTLETS_OF_DEXTERITY"},
    {name: "gauntlets", oclass: "ARMOR_CLASS", f_o_range: "LEATHER_GLOVES", l_o_range: "GAUNTLETS_OF_DEXTERITY"},
    {name: "boots", oclass: "ARMOR_CLASS", f_o_range: "LOW_BOOTS", l_o_range: "LEVITATION_BOOTS"},
    {name: "shoes", oclass: "ARMOR_CLASS", f_o_range: "LOW_BOOTS", l_o_range: "IRON_SHOES"},
    {name: "cloak", oclass: "ARMOR_CLASS", f_o_range: "MUMMY_WRAPPING", l_o_range: "CLOAK_OF_DISPLACEMENT"},
    {name: "shirt", oclass: "ARMOR_CLASS", f_o_range: "HAWAIIAN_SHIRT", l_o_range: "T_SHIRT"},
    {name: "dragon scales", oclass: "ARMOR_CLASS", f_o_range: "GRAY_DRAGON_SCALES", l_o_range: "YELLOW_DRAGON_SCALES"},
    {name: "dragon scale mail", oclass: "ARMOR_CLASS", f_o_range: "GRAY_DRAGON_SCALE_MAIL", l_o_range: "YELLOW_DRAGON_SCALE_MAIL"},
    {name: "sword", oclass: "WEAPON_CLASS", f_o_range: "SHORT_SWORD", l_o_range: "KATANA"},
    {name: "venom", oclass: "VENOM_CLASS", f_o_range: "BLINDING_VENOM", l_o_range: "ACID_VENOM"},
    {name: "gray stone", oclass: "GEM_CLASS", f_o_range: "LUCKSTONE", l_o_range: "FLINT"},
    {name: "grey stone", oclass: "GEM_CLASS", f_o_range: "LUCKSTONE", l_o_range: "FLINT"},
];

/* alternate spellings; if the difference is only the presence or
   absence of spaces and/or hyphens (such as "pickaxe" vs "pick axe"
   vs "pick-axe") then there is no need for inclusion in this list;
   likewise for ``"of" inversions'' ("boots of speed" vs "speed boots") */
export const spellings = [
    {sp: "pickax", ob: "PICK_AXE"},
    {sp: "whip", ob: "BULLWHIP"},
    {sp: "saber", ob: "SILVER_SABER"},
    {sp: "silver sabre", ob: "SILVER_SABER"},
    {sp: "smooth shield", ob: "SHIELD_OF_REFLECTION"},
    {sp: "grey dragon scale mail", ob: "GRAY_DRAGON_SCALE_MAIL"},
    {sp: "grey dragon scales", ob: "GRAY_DRAGON_SCALES"},
    {sp: "iron ball", ob: "HEAVY_IRON_BALL"},
    {sp: "lantern", ob: "BRASS_LANTERN"},
    {sp: "mattock", ob: "DWARVISH_MATTOCK"},
    {sp: "amulet of poison resistance", ob: "AMULET_VERSUS_POISON"},
    {sp: "amulet of protection", ob: "AMULET_OF_GUARDING"},
    {sp: "amulet of telepathy", ob: "AMULET_OF_ESP"},
    {sp: "helm of esp", ob: "HELM_OF_TELEPATHY"},
    {sp: "gauntlets of ogre power", ob: "GAUNTLETS_OF_POWER"},
    {sp: "gauntlets of giant strength", ob: "GAUNTLETS_OF_POWER"},
    {sp: "elven chain mail", ob: "ELVEN_MITHRIL_COAT"},
    {sp: "silver shield", ob: "SHIELD_OF_REFLECTION"},
    {sp: "potion of sleep", ob: "POT_SLEEPING"},
    {sp: "scroll of recharging", ob: "SCR_CHARGING"},
    {sp: "recharging", ob: "SCR_CHARGING"},
    {sp: "stone", ob: "ROCK"},
    {sp: "camera", ob: "EXPENSIVE_CAMERA"},
    {sp: "tee shirt", ob: "T_SHIRT"},
    {sp: "can", ob: "TIN"},
    {sp: "can opener", ob: "TIN_OPENER"},
    {sp: "kelp", ob: "KELP_FROND"},
    {sp: "eucalyptus", ob: "EUCALYPTUS_LEAF"},
    {sp: "lembas", ob: "LEMBAS_WAFER"},
    {sp: "tripe", ob: "TRIPE_RATION"},
    {sp: "cookie", ob: "FORTUNE_COOKIE"},
    {sp: "pie", ob: "CREAM_PIE"},
    {sp: "huge meatball", ob: "ENORMOUS_MEATBALL"}, /* likely conflated name */
    {sp: "huge chunk of meat", ob: "ENORMOUS_MEATBALL"}, /* original name */
    {sp: "marker", ob: "MAGIC_MARKER"},
    {sp: "hook", ob: "GRAPPLING_HOOK"},
    {sp: "grappling iron", ob: "GRAPPLING_HOOK"},
    {sp: "grapnel", ob: "GRAPPLING_HOOK"},
    {sp: "grapple", ob: "GRAPPLING_HOOK"},
    {sp: "protection from shape shifters", ob: "RIN_PROTECTION_FROM_SHAPE_CHAN"},
    {sp: "accuracy", ob: "RIN_INCREASE_ACCURACY"},
    /* if we ever add other sizes, move this to o_ranges[] with "bag" */
    {sp: "box", ob: "LARGE_BOX"},
    /* normally we wouldn't have to worry about unnecessary <space>, but
       " stone" will get stripped off, preventing a wishymatch; that actually
       lets "flint stone" be a match, so we also accept bogus "flintstone" */
    {sp: "luck stone", ob: "LUCKSTONE"},
    {sp: "load stone", ob: "LOADSTONE"},
    {sp: "touch stone", ob: "TOUCHSTONE"},
    {sp: "flintstone", ob: "FLINT"},
    {sp: 0, ob: 0},
];

export function rnd_otyp_by_wpnskill(skill) {
    skill = C.argument(skill, "schar");
    let i;
    let n = 0;
    let otyp = C.short(C.STRANGE_OBJECT);
    for ((i = C.deref(C.ptrAdd((C.svb).bases, C.WEAPON_CLASS, "int"), "int")); Number(!!(Number(i < C.NUM_OBJECTS) && Number((C.deref(C.ptrAdd(C.objects, i, "struct objclass"), "struct objclass")).oc_class == C.WEAPON_CLASS))); (i++)) if (Number((C.deref(C.ptrAdd(C.objects, i, "struct objclass"), "struct objclass")).oc_skill == skill)) {
        (n++);
        (otyp = C.short(i));
    }
    if (Number(n > 0)) {
        (n = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("objnam.c"), 3444, C.literal("rnd_otyp_by_wpnskill")), C.rn2(n))) : C.rn2(n))));
        for ((i = C.deref(C.ptrAdd((C.svb).bases, C.WEAPON_CLASS, "int"), "int")); Number(!!(Number(i < C.NUM_OBJECTS) && Number((C.deref(C.ptrAdd(C.objects, i, "struct objclass"), "struct objclass")).oc_class == C.WEAPON_CLASS))); (i++)) if (Number((C.deref(C.ptrAdd(C.objects, i, "struct objclass"), "struct objclass")).oc_skill == skill)) if (Number((--n) < 0)) return C.short(i);
    }
    return otyp;
}

export function rnd_otyp_by_namedesc(name, oclass, xtra_prob) /* add to item's chance of being chosen; non-zero causes
                    * 0% random generation items to also be considered */
{
    name = C.argument(name, "const char *");
    oclass = C.argument(oclass, "char");
    xtra_prob = C.argument(xtra_prob, "int");
    let i;
    let n = 0;
    const validobjs = C.localArray("short[481]", 0);
    let zn;
    let of;
    let check_of;
    let lo;
    let hi;
    let minglob;
    let maxglob;
    let prob;
    let maxprob = 0;
    if (Number(!!(Number(!(name)) || Number(!(C.deref(name, "const char")))))) return C.short(C.STRANGE_OBJECT);
/* only skip "foo of" for "foo of bar" if target doesn't contain " of " */
    (check_of = C.char((C.ptrCompare(C.strstri(name, C.literal(" of ")), 0, "=="))));
    (minglob = C.GLOB_OF_GRAY_OOZE);
    (maxglob = C.GLOB_OF_BLACK_PUDDING);
    C.memset(C.castPointer(validobjs, "void *"), 0, BigInt(C.sizeof("short[481]")));
    if (oclass) {
        (lo = C.deref(C.ptrAdd((C.svb).bases, C.uchar(oclass), "int"), "int"));
        (hi = C.int((C.deref(C.ptrAdd((C.svb).bases, C.int((C.uchar(oclass) + 1)), "int"), "int") - 1)));
    }
    else {
        (lo = C.MAXOCLASSES);
/* STRANGE_OBJECT + 1; */
        (hi = C.int((C.NUM_OBJECTS - 1)));
    }
/* FIXME:
     * When this spans classes (the !oclass case), the item
     * probabilities are not very useful because they don't take
     * the class generation probability into account.  [If 10%
     * of spellbooks were blank and 1% of scrolls were blank,
     * "blank" would have 10/11 chance to yield a book even though
     * scrolls are supposed to be much more common than books.]
     */
    for ((i = lo); Number(i <= hi); (++i)) {
/* don't match extra descriptions (w/o real name) */
        if (C.ptrCompare(((zn = ((C.deref(C.ptrAdd(C.obj_descr, ((C.deref(C.ptrAdd(C.objects, i, "struct objclass"), "struct objclass"))).oc_name_idx, "struct objdescr"), "struct objdescr")).oc_name))), 0, "==")) continue;
        if (Number(!!(Number(!!(Number(!!(Number(!!(C.callLocal(wishymatch, name, zn, (C.char(1))) || (Number(!!(Number(!!(Number(!!(Number(!!(check_of && Number(i != C.BELL_OF_OPENING))) && (Number(!!(Number(i < minglob) || Number(i > maxglob)))))) && C.ptrCompare(((of = C.strstri(zn, C.literal(" of ")))), 0, "!="))) && C.callLocal(wishymatch, name, C.ptrAdd(of, 4, "const char"), (C.char(0)))))))) || (Number(!!(C.ptrCompare(((zn = ((C.deref(C.ptrAdd(C.obj_descr, ((C.deref(C.ptrAdd(C.objects, i, "struct objclass"), "struct objclass"))).oc_descr_idx, "struct objdescr"), "struct objdescr")).oc_descr))), 0, "!=") && C.callLocal(wishymatch, name, zn, (C.char(0)))))))) || (Number(!!(Number(!!(Number(!!(zn && check_of)) && C.ptrCompare(((of = C.strstri(zn, C.literal(" of ")))), 0, "!="))) && C.callLocal(wishymatch, name, C.ptrAdd(of, 4, "const char"), (C.char(0)))))))) || (Number(!!(C.ptrCompare(((zn = (C.deref(C.ptrAdd(C.objects, i, "struct objclass"), "struct objclass")).oc_uname)), 0, "!=") && C.callLocal(wishymatch, name, zn, (C.char(0))))))))) /* objects[] name */
/* let "<bar>" match "<foo> of <bar>" (already does if foo is
               an object class, but this is for lump of royal jelly,
               clove of garlic, bag of tricks, &c) with a few exceptions:
               for "opening", don't match "bell of opening"; for monster
               type ooze/pudding/slime don't match glob of same since that
               ought to match "corpse/egg/figurine of type" too but won't */
/* partial name */
/* objects[] description */
/* "cloth" should match "piece of cloth"; there's only one
               description containing " of " so no special case handling */
/* partial description */
/* user-called name */
{
            C.store(C.ptrAdd(validobjs, (n++), "short"), "short", C.short(i));
            (maxprob = C.int((maxprob + (C.int(((C.deref(C.ptrAdd(C.objects, i, "struct objclass"), "struct objclass")).oc_prob + xtra_prob))))));
        }
    }
    if (Number(!!(Number(n > 0) && maxprob))) {
        (prob = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("objnam.c"), 3522, C.literal("rnd_otyp_by_namedesc")), C.rn2(maxprob))) : C.rn2(maxprob))));
        for ((i = 0); Number(i < C.int((n - 1))); (i++)) if (Number(((prob = C.int((prob - (C.int(((C.deref(C.ptrAdd(C.objects, C.deref(C.ptrAdd(validobjs, i, "short"), "short"), "struct objclass"), "struct objclass")).oc_prob + xtra_prob))))))) < 0)) break;
        return C.deref(C.ptrAdd(validobjs, i, "short"), "short");
    }
    return C.short(C.STRANGE_OBJECT);
}

export function shiny_obj(oclass) {
    oclass = C.argument(oclass, "char");
    return C.int(C.callLocal(rnd_otyp_by_namedesc, C.literal("shiny"), oclass, 0));
}

/* set wall under hero undiggable/unphaseable from string */
export function set_wallprop_from_str(bp) {
    bp = C.argument(bp, "char *");
    let wall_prop = 0;
    if (Number(!!(C.strstr(bp, C.literal("undiggable ")) || C.strstr(bp, C.literal("nondiggable "))))) (wall_prop = C.int((wall_prop | C.W_NONDIGGABLE)));
    if (Number(!!(C.strstr(bp, C.literal("unphaseable ")) || C.strstr(bp, C.literal("nonpasswall "))))) (wall_prop = C.int((wall_prop | C.W_NONPASSWALL)));
/* |= because wall_info (aka flags) is overloaded with other stuff */
    if (wall_prop) ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, (C.u).ux, "struct rm[21]"), "struct rm[21]"), (C.u).uy, "struct rm"), "struct rm")).wall_info = C.uint(((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, (C.u).ux, "struct rm[21]"), "struct rm[21]"), (C.u).uy, "struct rm"), "struct rm")).wall_info | wall_prop)));
}

/* in wizard mode, readobjnam() can accept wishes for traps and terrain */
export function wizterrainwish(d) {
    d = C.argument(d, "struct _readobjnam_data *");
    let lev;
    let madeterrain = (C.char(0));
    let badterrain = (C.char(0));
    let is_dbridge;
    let trap;
    let oldtyp;
    let ltyp;
    let x = (C.u).ux;
    let y = (C.u).uy;
    let bp = (d).bp;
    let p;
    for ((trap = C.int((C.NO_TRAP + 1))); Number(trap < C.TRAPNUM); (trap++)) {
        let t;
        let tname;
        (tname = C.trapname(trap, (C.char(1))));
        if (Number(!(C.str_start_is(bp, tname, (C.char(1)))))) continue;
/* found it; avoid stupid mistakes */
        if (Number(!!((Number(!!(Number((trap) == C.HOLE) || Number((trap) == C.TRAPDOOR)))) && Number(!(C.Can_fall_thru(C.fieldRef(C.u, "uz"))))))) (trap = C.ROCKTRAP);
        if (C.ptrCompare(((t = C.maketrap(x, y, trap))), 0, "!=")) {
            (trap = C.int((t).ttyp));
            (tname = C.trapname(trap, (C.char(1))));
            C.pline(C.literal("%s%s."), An(tname), (((Number(trap != C.MAGIC_PORTAL))) ? C.literal("") : C.literal(" to nowhere")), "pp");
        }
        else {
            C.pline(C.literal("Creation of %s failed."), an(tname), "p");
        }
        return C.hands_obj;
    }
/* furniture and terrain (use at your own risk; can clobber stairs
       or place furniture on existing traps which shouldn't be allowed) */
    (lev = C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, x, "struct rm[21]"), "struct rm[21]"), y, "struct rm"));
    (oldtyp = C.uint((lev).typ));
    (is_dbridge = C.char((Number(!!(Number(oldtyp == C.uint(C.DRAWBRIDGE_DOWN)) || Number(oldtyp == C.uint(C.DRAWBRIDGE_UP)))))));
    (p = C.eos(bp));
    if (Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(8), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(8), "char"))), (C.literal("fountain")), C.int((-1))))))))) {
        ((lev).typ = C.char(C.FOUNTAIN));
        if (Number(oldtyp != C.uint(C.FOUNTAIN))) C.bump(C.fieldRef(((C.svl).level).flags, "nfountains"), 1, true, "unsigned char");
        ((lev).looted = C.uint((((d).looted) ? C.F_LOOTED : 0)));
/* overlays 'flags' */
        ((lev).blessedftn = C.uint(Number(!!((d).blessed || Number(!(C.strncmpi(bp, C.literal("magic "), 6)))))));
        C.pline(C.literal("A %sfountain."), ((C.int((lev).blessedftn)) ? C.literal("magic ") : C.literal("")), "p");
        (madeterrain = (C.char(1)));
    }
    else if (Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(6), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(6), "char"))), (C.literal("throne")), C.int((-1))))))))) {
        ((lev).typ = C.char(C.THRONE));
        ((lev).looted = C.uint((((d).looted) ? C.T_LOOTED : 0)));
/* overlays 'flags' */
        C.pline(C.literal("A throne."), "");
        (madeterrain = (C.char(1)));
    }
    else if (Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(4), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(4), "char"))), (C.literal("sink")), C.int((-1))))))))) {
        ((lev).typ = C.char(C.SINK));
        if (Number(oldtyp != C.uint(C.SINK))) C.bump(C.fieldRef(((C.svl).level).flags, "nsinks"), 1, true, "unsigned char");
        ((lev).looted = C.uint((((d).looted) ? (C.int((C.int((C.S_LPUDDING | C.S_LDWASHER)) | C.S_LRING))) : 0)));
        C.pline(C.literal("A sink."), "");
        (madeterrain = (C.char(1)));
/* ("water" matches "potion of water" rather than terrain) */
    }
    else if (Number(!!(Number(!!(Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(4), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(4), "char"))), (C.literal("pool")), C.int((-1)))))))) || Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(4), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(4), "char"))), (C.literal("moat")), C.int((-1)))))))))) || Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(13), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(13), "char"))), (C.literal("wall of water")), C.int((-1))))))))))) {
        let save_prop;
        let new_water;
        (ltyp = C.uint(((Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(4), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(4), "char"))), (C.literal("pool")), C.int((-1))))))))) ? C.POOL : ((Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(4), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(4), "char"))), (C.literal("moat")), C.int((-1))))))))) ? C.MOAT : C.WATER))));
        if (Number(!(is_dbridge))) {
            ((lev).typ = C.char(ltyp));
            ((lev).flags = C.uint(0));
        }
        else {
/* drawbridgemask overloads flags */
            ((lev).drawbridgemask = C.uint(((lev).drawbridgemask & C.int((~C.DB_UNDER)))));
            ((lev).drawbridgemask = C.uint(((lev).drawbridgemask | C.DB_MOAT)));
        }
        C.del_engr_at(x, y);
        if (Number(!(is_dbridge))) {
            (save_prop = (C.deref(C.ptrAdd((C.u).uprops, C.HALLUC_RES, "struct prop"), "struct prop")).extrinsic);
            ((C.deref(C.ptrAdd((C.u).uprops, C.HALLUC_RES, "struct prop"), "struct prop")).extrinsic = C.long(1));
            (new_water = C.waterbody_name(x, y));
            ((C.deref(C.ptrAdd((C.u).uprops, C.HALLUC_RES, "struct prop"), "struct prop")).extrinsic = save_prop);
            C.pline(C.literal("%s."), An(new_water), "p");
/* Must manually make kelp! */
        }
        else {
            dbterrainmesg(C.literal("Moat"), x, y);
        }
        C.water_damage_chain(C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).objects, x, "struct obj *[21]"), "struct obj *[21]"), y, "struct obj *"), "struct obj *"), (C.char(1)));
        (madeterrain = (C.char(1)));
/* also matches "molten lava" */
    }
    else if (Number(!!(Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(4), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(4), "char"))), (C.literal("lava")), C.int((-1)))))))) || Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(12), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(12), "char"))), (C.literal("wall of lava")), C.int((-1))))))))))) {
        (ltyp = C.uint(((Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(12), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(12), "char"))), (C.literal("wall of lava")), C.int((-1))))))))) ? C.LAVAWALL : C.LAVAPOOL)));
        if (Number(!(is_dbridge))) {
            ((lev).typ = C.char(ltyp));
            ((lev).flags = C.uint(0));
        }
        else {
/* drawbridgemask overloads flags */
            ((lev).drawbridgemask = C.uint(((lev).drawbridgemask & C.int((~C.DB_UNDER)))));
            ((lev).drawbridgemask = C.uint(((lev).drawbridgemask | C.DB_LAVA)));
        }
        C.del_engr_at(x, y);
        if (Number(!(is_dbridge))) {
            C.pline(C.literal("A %s of molten lava."), (((Number((lev).typ == C.LAVAPOOL))) ? C.literal("pool") : C.literal("wall")), "p");
            if (Number(!!(Number(!((Number(!!((Number(!!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.LEVITATION, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.LEVITATION, "struct prop"), "struct prop")).extrinsic))) && Number(!((C.deref(C.ptrAdd((C.u).uprops, C.LEVITATION, "struct prop"), "struct prop")).blocked))))) || (Number(!!((Number(!!(Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.FLYING, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.FLYING, "struct prop"), "struct prop")).extrinsic)) || (Number(!!((C.u).usteed && (Number((C.ulong((((((C.u).usteed).data)).mflags1 & C.ulong(1n)))) != C.ulong(0n))))))))) && Number(!((C.deref(C.ptrAdd((C.u).uprops, C.FLYING, "struct prop"), "struct prop")).blocked)))))))))) || Number((lev).typ == C.LAVAWALL)))) C.pooleffects((C.char(0)));
        }
        else {
            dbterrainmesg(C.literal("Lava"), x, y);
        }
        C.fire_damage_chain(C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).objects, x, "struct obj *[21]"), "struct obj *[21]"), y, "struct obj *"), "struct obj *"), (C.char(1)), (C.char(1)), x, y);
        (madeterrain = (C.char(1)));
    }
    else if (Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(3), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(3), "char"))), (C.literal("ice")), C.int((-1))))))))) {
        if (Number(!(is_dbridge))) {
            ((lev).typ = C.char(C.ICE));
/* icedpool overloads flags; specifies what ice will melt into */
            ((lev).icedpool = C.uint((((Number(oldtyp == C.uint(C.ROOM)))) ? C.ICED_POOL : C.ICED_MOAT)));
        }
        else {
/* drawbridgemask overloads flags */
            ((lev).drawbridgemask = C.uint(((lev).drawbridgemask & C.int((~C.DB_UNDER)))));
            ((lev).drawbridgemask = C.uint(((lev).drawbridgemask | C.DB_ICE)));
        }
        C.del_engr_at(x, y);
        if (Number(!(C.strncmpi(bp, C.literal("melting "), 8)))) C.start_melt_ice_timeout(x, y, 0n);
        if (Number(!(is_dbridge))) {
            const icebuf = C.localArray("char[40]", 0);
            C.pline(C.literal("%s."), C.upstart(C.ice_descr(x, y, icebuf)), "p");
        }
        else {
            dbterrainmesg(C.literal("Ice"), x, y);
        }
        (madeterrain = (C.char(1)));
    }
    else if (Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(5), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(5), "char"))), (C.literal("altar")), C.int((-1))))))))) {
        let al;
        ((lev).typ = C.char(C.ALTAR));
        if (Number(!(C.strncmpi(bp, C.literal("chaotic "), 8)))) (al = C.A_CHAOTIC);
        else if (Number(!(C.strncmpi(bp, C.literal("neutral "), 8)))) (al = C.A_NEUTRAL);
        else if (Number(!(C.strncmpi(bp, C.literal("lawful "), 7)))) (al = C.A_LAWFUL);
        else if (Number(!(C.strncmpi(bp, C.literal("unaligned "), 10)))) (al = C.A_NONE);
        else /* -1 - A_CHAOTIC, 0 - A_NEUTRAL, 1 - A_LAWFUL */
        (al = C.char(((Number(!((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("objnam.c"), 3702, C.literal("wizterrainwish")), C.rn2(6))) : C.rn2(6)))))) ? C.A_NONE : (C.int(((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("objnam.c"), 3702, C.literal("wizterrainwish")), C.rn2(C.int((1 + 2))))) : C.rn2(C.int((1 + 2))))) - 1))))));
        ((lev).altarmask = (C.uint(((((Number((al) == (C.int((-128)))))) ? 0 : (((Number((al) == 1))) ? 4 : (C.int(((al) + 2)))))))));
/* overlays 'flags' */
        C.pline(C.literal("%s altar."), An(C.align_str(al)), "p");
        (madeterrain = (C.char(1)));
    }
    else if (Number(!!(Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(5), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(5), "char"))), (C.literal("grave")), C.int((-1)))))))) || Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(9), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(9), "char"))), (C.literal("headstone")), C.int((-1))))))))))) {
        C.make_grave(x, y, 0);
        if ((Number(((lev).typ) == C.GRAVE))) {
            ((lev).looted = C.uint(0));
/* overlays 'flags' */
            ((lev).disturbed = C.uint((((d).looted) ? 1 : 0)));
            C.pline(C.literal("A %sgrave."), ((C.int((lev).disturbed)) ? C.literal("disturbed ") : C.literal("")), "p");
            (madeterrain = (C.char(1)));
        }
        else {
            C.pline(C.literal("Can't place a grave here."), "");
            (badterrain = (C.char(1)));
        }
    }
    else if (Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(4), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(4), "char"))), (C.literal("tree")), C.int((-1))))))))) {
        ((lev).typ = C.char(C.TREE));
        ((lev).looted = C.uint((((d).looted) ? (C.int((C.TREE_LOOTED | C.TREE_SWARM))) : 0)));
        set_wallprop_from_str(bp);
        C.pline(C.literal("A tree."), "");
        (madeterrain = (C.char(1)));
    }
    else if (Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(4), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(4), "char"))), (C.literal("bars")), C.int((-1))))))))) {
        ((lev).typ = C.char(C.IRONBARS));
        ((lev).flags = C.uint(0));
        set_wallprop_from_str(bp);
/* [FIXME: if this isn't a wall or door location where 'horizontal'
            is already set up, that should be calculated for this spot.
            Unfortunately, it can be tricky; placing one in open space
            and then another adjacent might need to recalculate first one.] */
        C.pline(C.literal("Iron bars."), "");
        (madeterrain = (C.char(1)));
    }
    else if (Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(5), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(5), "char"))), (C.literal("cloud")), C.int((-1))))))))) {
        ((lev).typ = C.char(C.CLOUD));
        ((lev).flags = C.uint(0));
        C.pline(C.literal("A cloud."), "");
        C.del_engr_at(x, y);
        (madeterrain = (C.char(1)));
    }
    else if (Number(!!(Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(4), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(4), "char"))), (C.literal("door")), C.int((-1)))))))) || (Number(!!((d).doorless && Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(7), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(7), "char"))), (C.literal("doorway")), C.int((-1)))))))))))))) {
        const dbuf = C.localArray("char[40]", 0);
        let old_wall_info;
        let secret = C.char(Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(11), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(11), "char"))), (C.literal("secret door")), C.int((-1)))))))));
/* require door or wall so that the 'horizontal' flag will
           already have the correct value; player might choose to put
           DOOR on top of existing DOOR or SDOOR on top of existing SDOOR
           to control its trapped state; iron bars are surrogate walls;
           a previously dug wall looks like corridor but is actually a
           doorless doorway so will be acceptable here */
        if (Number(!!(Number(!!(Number(!!(Number((lev).typ == C.DOOR) || Number((lev).typ == C.SDOOR))) || (Number(!!((Number(!!(((lev).typ) && Number(((lev).typ) <= C.DBWALL)))) && Number((lev).typ != C.DBWALL)))))) || Number((lev).typ == C.IRONBARS)))) {
/* remember previous wall info [is this right for iron bars?] */
            (old_wall_info = C.uint((((Number((lev).typ != C.DOOR))) ? C.int((lev).wall_info) : 0)));
/* set the new terrain type */
            ((lev).typ = C.char(((secret) ? C.SDOOR : C.DOOR)));
            ((lev).wall_info = C.uint(0));
/* overlays 'flags' */
/* lev->horizontal stays as-is */
            if (((Number(!!((Number(!!(((C.fieldRef((C.svd).dungeon_topology, "d_rogue_level"))).dlevel || ((C.fieldRef((C.svd).dungeon_topology, "d_rogue_level"))).dnum))) && C.on_level(C.fieldRef(C.u, "uz"), C.fieldRef((C.svd).dungeon_topology, "d_rogue_level"))))))) {
/* all doors on the rogue level are doorless; locking magic
                   there converts them into walls rather than closed doors */
                ((d).doorless = 1);
                ((d).locked = ((d).closed = ((d).open = ((d).broken = 0))));
            }
/* if not locked, secret doors are implicitly closed but
               mustn't be set that way explicitly because they use both
               doormask and wall_info which both overload rm[x][y].flags
               (CLOSED overlaps wall_info bits, LOCKED and TRAPPED don't);
               conversion from SDOOR to DOOR changes NODOOR to CLOSED */
            ((lev).doormask = C.uint((((d).locked) ? C.D_LOCKED : (((Number(!!((d).doorless || secret)))) ? C.D_NODOOR : (((d).open) ? C.D_ISOPEN : (((d).broken) ? C.D_BROKEN : C.D_CLOSED))))));
/* SDOOR uses wall_info, restore relevant bits.
             * FIXME? if we're changing a regular door into a secret door,
             * old_wall_info bits will be 0 instead of being set properly.
             * Probably only matters if player uses Passes_walls and a wish
             * to turn a T- or cross-wall into a door, losing wall info,
             * and then another wish to turn that door into a secret door. */
            if (secret) ((lev).wall_info = C.uint(((lev).wall_info | (C.uint((old_wall_info & C.WM_MASK))))));
/* set up trapped flag; open door states aren't eligible */
            if (Number(!!(Number((d).trapped == 2) || (Number(!!(Number((C.int((C.int((lev).doormask) & (C.int((C.D_LOCKED | C.D_CLOSED)))))) == 0) && Number(!(secret)))))))) /* 2: wish includes explicit "untrapped" */
/* D_CLOSED is implicit for secret doors */
            ((d).trapped = 0);
            if ((d).trapped) ((lev).doormask = C.uint(((lev).doormask | C.D_TRAPPED)));
/* feedback */
            C.store(C.ptrAdd(dbuf, 0, "char"), "char", C.char(0));
            if (C.int((C.int((lev).doormask) & C.D_TRAPPED))) C.strcat(dbuf, C.literal("trapped "));
            if (C.int((C.int((lev).doormask) & C.D_LOCKED))) C.strcat(dbuf, C.literal("locked "));
            if (Number((lev).typ == C.SDOOR)) {
                C.strcat(dbuf, C.literal("secret door"));
            }
            else {
/* these should be mutually exclusive but we describe them
                   as if they're independent to maybe catch future bugs... */
                if (C.int((C.int((lev).doormask) & C.D_CLOSED))) C.strcat(dbuf, C.literal("closed "));
                if (C.int((C.int((lev).doormask) & C.D_ISOPEN))) C.strcat(dbuf, C.literal("open "));
                if (C.int((C.int((lev).doormask) & C.D_BROKEN))) C.strcat(dbuf, C.literal("broken "));
                if (Number((C.int((C.int((lev).doormask) & C.int((~C.D_TRAPPED))))) == C.D_NODOOR)) C.strcat(dbuf, C.literal("doorless doorway"));
                else C.strcat(dbuf, C.literal("door"));
            }
            C.pline(C.literal("%s."), C.upstart(an(dbuf)), "p");
            (madeterrain = (C.char(1)));
        }
        else {
            C.strcpy(dbuf, ((secret) ? C.literal("secret door") : C.literal("door")));
            C.pline(C.literal("%s requires door or wall location."), C.upstart(dbuf), "p");
            (badterrain = (C.char(1)));
        }
    }
    else if (Number(!!(Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(4), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(4), "char"))), (C.literal("wall")), C.int((-1)))))))) && (Number(!!(C.ptrCompare(bp, C.ptrAdd(p, -(4), "char"), "==") || Number(C.deref(C.ptrAdd(p, C.int((-5)), "char"), "char") == 32))))))) {
        let wall = C.char(C.HWALL);
        if (Number(!!((Number(!!(C.isok((C.u).ux, C.short(C.int(((C.u).uy - 1)))) && (Number(!!(((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, (C.u).ux, "struct rm[21]"), "struct rm[21]"), C.int(((C.u).uy - 1)), "struct rm"), "struct rm")).typ) && Number(((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, (C.u).ux, "struct rm[21]"), "struct rm[21]"), C.int(((C.u).uy - 1)), "struct rm"), "struct rm")).typ) <= C.DBWALL))))))) || (Number(!!(C.isok((C.u).ux, C.short(C.int(((C.u).uy + 1)))) && (Number(!!(((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, (C.u).ux, "struct rm[21]"), "struct rm[21]"), C.int(((C.u).uy + 1)), "struct rm"), "struct rm")).typ) && Number(((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, (C.u).ux, "struct rm[21]"), "struct rm[21]"), C.int(((C.u).uy + 1)), "struct rm"), "struct rm")).typ) <= C.DBWALL)))))))))) (wall = C.char(C.VWALL));
        (madeterrain = (C.char(1)));
        ((lev).typ = wall);
        ((lev).flags = C.uint(0));
        set_wallprop_from_str(bp);
        C.fix_wall_spines(C.short((((Number((0) > (C.int(((C.u).ux - 1))))) ? (0) : (C.int(((C.u).ux - 1)))))), C.short((((Number((0) > (C.int(((C.u).uy - 1))))) ? (0) : (C.int(((C.u).uy - 1)))))), C.short((((Number((80) < (C.int(((C.u).ux + 1))))) ? (80) : (C.int(((C.u).ux + 1)))))), C.short((((Number((21) < (C.int(((C.u).uy + 1))))) ? (21) : (C.int(((C.u).uy + 1)))))));
        C.pline(C.literal("A wall."), "");
    }
    else if (Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(15), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(15), "char"))), (C.literal("secret corridor")), C.int((-1))))))))) {
        if (Number((lev).typ == C.CORR)) {
            ((lev).typ = C.char(C.SCORR));
/* neither CORR nor SCORR uses 'flags' or 'horizontal' */
            C.pline(C.literal("Secret corridor."), "");
            (madeterrain = (C.char(1)));
        }
        else {
            C.pline(C.literal("Secret corridor requires corridor location."), "");
            (badterrain = (C.char(1)));
        }
    }
    else if (Number(!!(Number(!!(Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(4), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(4), "char"))), (C.literal("room")), C.int((-1)))))))) || Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(5), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(5), "char"))), (C.literal("floor")), C.int((-1)))))))))) || Number(!((Number(!!(C.ptrCompare((C.ptrAdd(p, -(6), "char")), bp, "<") || C.strncmpi(((C.ptrAdd(p, -(6), "char"))), (C.literal("ground")), C.int((-1))))))))))) {
        if (Number(!!(Number(!!(Number(!!(Number(oldtyp == C.uint(C.ROOM)) || (Number(!!((Number(!!(Number((oldtyp) >= C.uint(C.STAIRS)) && Number((oldtyp) <= C.uint(C.ALTAR))))) && (Number(!!((C.iflags).debug_overwrite_stairs || Number(!((Number(!!(Number((oldtyp) == C.uint(C.LADDER)) || Number((oldtyp) == C.uint(C.STAIRS))))))))))))))) || Number(oldtyp == C.uint(C.ICE)))) || C.is_pool_or_lava(x, y)))) {
            let t;
            ((lev).typ = C.char(C.ROOM));
            C.pline(C.literal("Room floor."), "");
            if ((Number(!!(Number((oldtyp) >= C.uint(C.STAIRS)) && Number((oldtyp) <= C.uint(C.ALTAR)))))) C.count_level_features();
            if (Number(!!(C.ptrCompare(((t = C.t_at(x, y))), 0, "!=") && Number(C.int((t).ttyp) != C.MAGIC_PORTAL)))) C.deltrap(t);
            (madeterrain = (C.char(1)));
        }
        else if (is_dbridge) {
            ((lev).drawbridgemask = C.uint(((lev).drawbridgemask & C.int((~C.DB_UNDER)))));
            ((lev).drawbridgemask = C.uint(((lev).drawbridgemask | C.DB_FLOOR)));
            dbterrainmesg(C.literal("Floor"), x, y);
            (madeterrain = (C.char(1)));
        }
        else {
            C.pline(C.literal("Room|floor|ground not allowed here."), "");
            (badterrain = (C.char(1)));
        }
    }
    if (madeterrain) {
        C.feel_newsym(x, y);
/* map the spot where the wish occurred */
/* hero started at <x,y> but might not be there anymore (create
           lava, decline to die, and get teleported away to safety) */
        if (Number(!!(C.int((C.u).uinwater) && Number(!(C.is_pool((C.u).ux, (C.u).uy)))))) {
            C.set_uinwater(0);
/* u.uinwater = 0; leave the water */
            C.docrt();
/* [block/unblock_point handled by docrt -> vision_recalc] */
        }
        else {
            if (Number(!!(Number(!!((C.u).utrap && Number((C.u).utraptype == C.uint(C.TT_LAVA)))) && Number(!(C.is_lava((C.u).ux, (C.u).uy)))))) C.reset_utrap((C.char(0)));
            C.recalc_block_point(x, y);
        }
/* fixups for replaced terrain that aren't handled above */
        if (Number(!!((Number((oldtyp) == C.uint(C.FOUNTAIN))) || (Number((oldtyp) == C.uint(C.SINK)))))) C.count_level_features();
/* update level.flags.nfountains,nsinks */
        if (Number(!(C.is_ice(x, y)))) C.spot_stop_timers(x, y, C.short(C.MELT_ICE_AWAY));
/* horizontal is overlaid by fountain->blessedftn, grave->disturbed */
        if (Number(!!(Number(!!(Number(!!(Number(!!(Number(!!((Number((oldtyp) == C.uint(C.FOUNTAIN))) || (Number((oldtyp) == C.uint(C.GRAVE))))) || (Number(!!((oldtyp) && Number((oldtyp) <= C.uint(C.DBWALL))))))) || Number(oldtyp == C.uint(C.IRONBARS)))) || (Number((oldtyp) == C.uint(C.DOOR))))) || Number(oldtyp == C.uint(C.SDOOR))))) {
/* when new terrain is a fountain, 'blessedftn' was explicitly
               set above; likewise for grave and 'disturbed'; when it's a
               door, the old type was a wall or a door and we retain the
               'horizontal' value from those */
            if (Number(!!(Number(!!(Number(!!(Number(!((Number(((lev).typ) == C.FOUNTAIN)))) && Number(!((Number(((lev).typ) == C.GRAVE)))))) && Number(!((Number(((lev).typ) == C.DOOR)))))) && Number((lev).typ != C.SDOOR)))) ((lev).horizontal = C.uint(0));
/* also clears blessedftn, disturbed */
        }
/* note: lev->lit and lev->nondiggable retain their values even
           though those might not make sense with the new terrain */
/* might have changed terrain from something that blocked
           levitation and flying to something that doesn't (levitating
           while in xorn form and replacing solid stone with furniture) */
        C.switch_terrain();
    }
    if (Number(!!(madeterrain || badterrain))) return C.hands_obj;
    return 0;
}

/* message common to several wizterrainwish() results */
export function dbterrainmesg(newtype, x, y) {
    newtype = C.argument(newtype, "const char *");
    x = C.argument(x, "coordxy");
    y = C.argument(y, "coordxy");
    C.pline(C.literal("%s %s the drawbridge."), newtype, (((Number((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, x, "struct rm[21]"), "struct rm[21]"), y, "struct rm"), "struct rm")).typ == C.DRAWBRIDGE_UP))) ? C.literal("in front of") : C.literal("under")), "pp");
}

export function readobjnam_init(bp, d) {
    bp = C.argument(bp, "char *");
    d = C.argument(d, "struct _readobjnam_data *");
    ((d).otmp = 0);
    ((d).cnt = ((d).spe = ((d).spesgn = ((d).typ = 0))));
    ((d).very = ((d).rechrg = ((d).blessed = ((d).uncursed = ((d).iscursed = ((d).ispoisoned = ((d).isgreased = ((d).eroded = ((d).eroded2 = ((d).erodeproof = ((d).halfeaten = ((d).islit = ((d).unlabeled = ((d).ishistoric = ((d).isdiluted = ((d).trapped = ((d).locked = ((d).unlocked = ((d).broken = ((d).open = ((d).closed = ((d).doorless = ((d).looted = ((d).real = ((d).fake = 0)))))))))))))))))))))))));
/* statues, potions */
/* box/chest and wizard mode door */
/* wizard mode door */
/* wizard mode fountain/sink/throne/tree and grave */
/* Amulet */
    ((d).tvariety = C.RANDOM_TIN);
    ((d).mgend = C.int((-1)));
/* not specified, aka random */
    ((d).mntmp = C.NON_PM);
    ((d).contents = C.TIN_UNDEFINED);
    ((d).oclass = C.char(0));
    ((d).actualn = ((d).dn = ((d).un = 0)));
    ((d).wetness = 0);
    ((d).gsize = 0);
    ((d).zombify = (C.char(0)));
    ((d).bp = ((d).origbp = bp));
    ((d).p = 0);
    ((d).name = 0);
    ((d).ftype = ((C.svc).context).current_fruit);
    C.memset(C.castPointer((d).globbuf, "void *"), 0, BigInt(C.sizeof("char[256]")));
    C.memset(C.castPointer((d).fruitbuf, "void *"), 0, BigInt(C.sizeof("char[256]")));
}

/* return 1 if d->bp is empty or contains only various qualifiers like
   "blessed", "rustproof", and so on, or 0 if anything else is present */
export function readobjnam_preparse(d) {
    d = C.argument(d, "struct _readobjnam_data *");
    let save_bp = 0;
    let more_l = 0;
    let res = 1;
    for (; ; ) {
        let l;
        if (Number(!!(Number(!((d).bp)) || Number(!(C.deref((d).bp, "char")))))) break;
        (res = 0);
        if (Number(!!(Number(!(C.strncmpi((d).bp, C.literal("an "), (l = 3)))) || Number(!(C.strncmpi((d).bp, C.literal("a "), (l = 2))))))) {
            ((d).cnt = 1);
        }
        else if (Number(!(C.strncmpi((d).bp, C.literal("the "), (l = 4))))) {
            ;
/* just increment `bp' by `l' below */
        }
        else if (Number(!!(Number(!!(Number(!((d).cnt)) && C.digit(C.deref((d).bp, "char")))) && C.strcmp((d).bp, C.literal("0"))))) {
            ((d).cnt = C.atoi((d).bp));
            while (C.digit(C.deref((d).bp, "char"))) C.bump(C.fieldRef(d, "bp"), 1, true, "char *");
            while (Number(C.deref((d).bp, "char") == 32)) C.bump(C.fieldRef(d, "bp"), 1, true, "char *");
            (l = 0);
        }
        else if (Number(!!(Number(C.deref((d).bp, "char") == 43) || Number(C.deref((d).bp, "char") == 45)))) {
            ((d).spesgn = (((Number(C.deref(C.bump(C.fieldRef(d, "bp"), 1, true, "char *"), "char") == 43))) ? 1 : C.int((-1))));
            ((d).spe = C.atoi((d).bp));
            while (C.digit(C.deref((d).bp, "char"))) C.bump(C.fieldRef(d, "bp"), 1, true, "char *");
            while (Number(C.deref((d).bp, "char") == 32)) C.bump(C.fieldRef(d, "bp"), 1, true, "char *");
            (l = 0);
        }
        else if (Number(!!(Number(!(C.strncmpi((d).bp, C.literal("blessed "), (l = 8)))) || Number(!(C.strncmpi((d).bp, C.literal("holy "), (l = 5))))))) {
            (((d).blessed = 1), ((d).uncursed = ((d).iscursed = 0)));
        }
        else if (Number(!!(Number(!(C.strncmpi((d).bp, C.literal("cursed "), (l = 7)))) || Number(!(C.strncmpi((d).bp, C.literal("unholy "), (l = 7))))))) {
            (((d).iscursed = 1), ((d).blessed = ((d).uncursed = 0)));
        }
        else if (Number(!(C.strncmpi((d).bp, C.literal("uncursed "), (l = 9))))) {
            (((d).uncursed = 1), ((d).blessed = ((d).iscursed = 0)));
        }
        else if (Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!(C.strncmpi((d).bp, C.literal("rustproof "), (l = 10)))) || Number(!(C.strncmpi((d).bp, C.literal("erodeproof "), (l = 11)))))) || Number(!(C.strncmpi((d).bp, C.literal("corrodeproof "), (l = 13)))))) || Number(!(C.strncmpi((d).bp, C.literal("fixed "), (l = 6)))))) || Number(!(C.strncmpi((d).bp, C.literal("fireproof "), (l = 10)))))) || Number(!(C.strncmpi((d).bp, C.literal("rotproof "), (l = 9)))))) || Number(!(C.strncmpi((d).bp, C.literal("tempered "), (l = 9)))))) || Number(!(C.strncmpi((d).bp, C.literal("crackproof "), (l = 11))))))) {
            ((d).erodeproof = 1);
        }
        else if (Number(!!(Number(!(C.strncmpi((d).bp, C.literal("lit "), (l = 4)))) || Number(!(C.strncmpi((d).bp, C.literal("burning "), (l = 8))))))) {
            ((d).islit = 1);
        }
        else if (Number(!!(Number(!(C.strncmpi((d).bp, C.literal("unlit "), (l = 6)))) || Number(!(C.strncmpi((d).bp, C.literal("extinguished "), (l = 13))))))) {
            ((d).islit = 0);
/* "wet" and "moist" are only applicable for towels */
        }
        else if (Number(!!(Number(!(C.strncmpi((d).bp, C.literal("moist "), (l = 6)))) || Number(!(C.strncmpi((d).bp, C.literal("wet "), (l = 4))))))) {
            if (Number(!(C.strncmpi((d).bp, C.literal("wet "), 4)))) ((d).wetness = C.int((3 + (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("objnam.c"), 4025, C.literal("readobjnam_preparse")), C.rn2(3))) : C.rn2(3))))));
            else /* 3..5 */
            ((d).wetness = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("objnam.c"), 4027, C.literal("readobjnam_preparse")), C.rnd(2))) : C.rnd(2))));
/* 1..2 */
/* "unlabeled" and "blank" are synonymous */
        }
        else if (Number(!!(Number(!!(Number(!(C.strncmpi((d).bp, C.literal("unlabeled "), (l = 10)))) || Number(!(C.strncmpi((d).bp, C.literal("unlabelled "), (l = 11)))))) || Number(!(C.strncmpi((d).bp, C.literal("blank "), (l = 6))))))) {
            ((d).unlabeled = 1);
        }
        else if (Number(!(C.strncmpi((d).bp, C.literal("poisoned "), (l = 9))))) {
            ((d).ispoisoned = 1);
/* "trapped" recognized but not honored outside wizard mode */
        }
        else if (Number(!(C.strncmpi((d).bp, C.literal("trapped "), (l = 8))))) {
            ((d).trapped = 0);
/* undo any previous "untrapped" */
            if ((C.flags).debug) ((d).trapped = 1);
        }
        else if (Number(!(C.strncmpi((d).bp, C.literal("untrapped "), (l = 10))))) {
            ((d).trapped = 2);
/* not trapped */
/* locked, unlocked, broken: box/chest lock states, also door states;
           open, closed, doorless: additional door states */
        }
        else if (Number(!(C.strncmpi((d).bp, C.literal("locked "), (l = 7))))) {
            (((d).locked = ((d).closed = 1)), ((d).unlocked = ((d).broken = ((d).open = ((d).doorless = 0)))));
        }
        else if (Number(!(C.strncmpi((d).bp, C.literal("unlocked "), (l = 9))))) {
            (((d).unlocked = ((d).closed = 1)), ((d).locked = ((d).broken = ((d).open = ((d).doorless = 0)))));
        }
        else if (Number(!(C.strncmpi((d).bp, C.literal("broken "), (l = 7))))) {
            (((d).broken = 1), ((d).locked = ((d).unlocked = ((d).open = ((d).closed = ((d).doorless = 0))))));
        }
        else if (Number(!(C.strncmpi((d).bp, C.literal("open "), (l = 5))))) {
            (((d).open = 1), ((d).closed = ((d).locked = ((d).broken = ((d).doorless = 0)))));
        }
        else if (Number(!(C.strncmpi((d).bp, C.literal("closed "), (l = 7))))) {
            (((d).closed = 1), ((d).open = ((d).locked = ((d).broken = ((d).doorless = 0)))));
        }
        else if (Number(!(C.strncmpi((d).bp, C.literal("doorless "), (l = 9))))) {
            (((d).doorless = 1), ((d).open = ((d).closed = ((d).locked = ((d).unlocked = ((d).broken = 0))))));
/* looted: fountain/sink/throne/tree; disturbed: grave */
        }
        else if (Number(!!(Number(!(C.strncmpi((d).bp, C.literal("looted "), (l = 7)))) || Number(!(C.strncmpi((d).bp, C.literal("disturbed "), (l = 10))))))) /* overload disturbed grave with looted fountain here
                      even though they're separate in struct rm */
{
            ((d).looted = 1);
        }
        else if (Number(!(C.strncmpi((d).bp, C.literal("greased "), (l = 8))))) {
            ((d).isgreased = 1);
        }
        else if (Number(!(C.strncmpi((d).bp, C.literal("zombifying "), (l = 11))))) {
            ((d).zombify = (C.char(1)));
        }
        else if (Number(!(C.strncmpi((d).bp, C.literal("very "), (l = 5))))) {
/* very rusted very heavy iron ball */
            ((d).very = 1);
        }
        else if (Number(!(C.strncmpi((d).bp, C.literal("thoroughly "), (l = 11))))) {
            ((d).very = 2);
        }
        else if (Number(!!(Number(!!(Number(!!(Number(!!(Number(!(C.strncmpi((d).bp, C.literal("rusty "), (l = 6)))) || Number(!(C.strncmpi((d).bp, C.literal("rusted "), (l = 7)))))) || Number(!(C.strncmpi((d).bp, C.literal("burnt "), (l = 6)))))) || Number(!(C.strncmpi((d).bp, C.literal("burned "), (l = 7)))))) || Number(!(C.strncmpi((d).bp, C.literal("cracked "), (l = 8))))))) {
            ((d).eroded = C.int((1 + (d).very)));
            ((d).very = 0);
        }
        else if (Number(!!(Number(!(C.strncmpi((d).bp, C.literal("corroded "), (l = 9)))) || Number(!(C.strncmpi((d).bp, C.literal("rotted "), (l = 7))))))) {
            ((d).eroded2 = C.int((1 + (d).very)));
            ((d).very = 0);
        }
        else if (Number(!!(Number(!(C.strncmpi((d).bp, C.literal("partly eaten "), (l = 13)))) || Number(!(C.strncmpi((d).bp, C.literal("partially eaten "), (l = 16))))))) {
            ((d).halfeaten = 1);
        }
        else if (Number(!(C.strncmpi((d).bp, C.literal("historic "), (l = 9))))) {
            ((d).ishistoric = 1);
        }
        else if (Number(!(C.strncmpi((d).bp, C.literal("diluted "), (l = 8))))) {
            ((d).isdiluted = 1);
        }
        else if (Number(!(C.strncmpi((d).bp, C.literal("empty "), (l = 6))))) {
            ((d).contents = C.TIN_EMPTY);
        }
        else if (Number(!(C.strncmpi((d).bp, C.literal("small "), (l = 6))))) {
/* glob sizes */
/* "small" might be part of monster name (mimic, if wishing
               for its corpse) rather than prefix for glob size; when
               used for globs, it might be either "small glob of <foo>" or
               "small <foo> glob" and user might add 's' even though plural
               doesn't accomplish anything because globs don't stack */
            if (Number(!!(C.strncmpi(C.ptrAdd((d).bp, l, "char"), C.literal("glob"), 4) && Number(!(C.strstri(C.ptrAdd((d).bp, l, "char"), C.literal(" glob"))))))) break;
            ((d).gsize = 1);
        }
        else if (Number(!(C.strncmpi((d).bp, C.literal("medium "), (l = 7))))) {
/* 5.0: in 3.6, "medium" was only used during wishing and the
               mid-size glob had no adjective when formatted, but as of
               5.0, "medium" has become an explicit part of the name for
               combined globs of at least 5 individual ones (owt >= 100)
               and less than 15 (owt < 300) */
            ((d).gsize = 2);
        }
        else if (Number(!(C.strncmpi((d).bp, C.literal("large "), (l = 6))))) {
/* "large" might be part of monster name (dog, cat, kobold,
               mimic) or object name (box, round shield) rather than
               prefix for glob size */
            if (Number(!!(C.strncmpi(C.ptrAdd((d).bp, l, "char"), C.literal("glob"), 4) && Number(!(C.strstri(C.ptrAdd((d).bp, l, "char"), C.literal(" glob"))))))) break;
/* "very large " had "very " peeled off on previous iteration */
            ((d).gsize = (((Number((d).very != 1))) ? 3 : 4));
        }
        else if (Number(!(C.strncmpi((d).bp, C.literal("real "), (l = 5))))) {
/* accept "real Amulet of Yendor" with "blessed" or "cursed"
               or useless "erodeproof" before or after "real" ... */
            ((d).real = 1);
/* don't negate 'fake' here; "real fake amulet" and
                       * "fake real amulet" will both yield fake amulet
                       * (so will "real amulet" outside of wizard mode) */
        }
        else if (Number(!(C.strncmpi((d).bp, C.literal("fake "), (l = 5))))) {
/* ... and "fake Amulet of Yendor" likewise */
            (((d).fake = 1), ((d).real = 0));
/* ['real' isn't actually needed (unless we someday add
               "real gem" for random non-glass, non-stone)] */
        }
        else if (Number(!(C.strncmpi((d).bp, C.literal("female "), (l = 7))))) {
            ((d).mgend = C.FEMALE);
/* if after "corpse/statue/figurine of", remove from string */
            if (save_bp) (C.strsubst((d).bp, C.literal("female "), C.literal("")), (l = 0));
        }
        else if (Number(!(C.strncmpi((d).bp, C.literal("male "), (l = 5))))) {
            ((d).mgend = C.MALE);
            if (save_bp) (C.strsubst((d).bp, C.literal("male "), C.literal("")), (l = 0));
        }
        else if (Number(!(C.strncmpi((d).bp, C.literal("neuter "), (l = 7))))) {
            ((d).mgend = C.NEUTRAL);
            if (save_bp) (C.strsubst((d).bp, C.literal("neuter "), C.literal("")), (l = 0));
/*
         * Corpse/statue/figurine gender hack:  in order to accept
         * "statue of a female gnome ruler" for gnome queen we need
         * to recognize and skip over "statue of [a ]".  Otherwise
         * we would only accept "female gnome ruler statue" and the
         * viable but silly "female statue of a gnome ruler".
         */
        }
        else if (Number(!!((Number(!!(Number(!!(Number(!(C.strncmpi((d).bp, C.literal("corpse "), (l = 7)))) || Number(!(C.strncmpi((d).bp, C.literal("statue "), (l = 7)))))) || Number(!(C.strncmpi((d).bp, C.literal("figurine "), (l = 9))))))) && Number(!(C.strncmpi(C.ptrAdd((d).bp, l, "char"), C.literal("of "), (more_l = 3))))))) {
            (save_bp = (d).bp);
/* we'll backtrack to here later */
            ((l = C.int((l + more_l))), (more_l = 0));
            if (Number(!!(Number(!!(Number(!(C.strncmpi(C.ptrAdd((d).bp, l, "char"), C.literal("a "), (more_l = 2)))) || Number(!(C.strncmpi(C.ptrAdd((d).bp, l, "char"), C.literal("an "), (more_l = 3)))))) || Number(!(C.strncmpi(C.ptrAdd((d).bp, l, "char"), C.literal("the "), (more_l = 4))))))) (l = C.int((l + more_l)));
        }
        else {
            break;
        }
        ((d).bp = C.ptrAdd((d).bp, l, "char"));
    }
    if (save_bp) ((d).bp = save_bp);
    return res;
}

export function readobjnam_parse_charges(d) {
    d = C.argument(d, "struct _readobjnam_data *");
    if (Number(!!(Number(C.strlen((d).bp) > C.ulong(1)) && C.ptrCompare((((d).p = C.strrchr((d).bp, 40))), 0, "!=")))) {
        let keeptrailingchars = (C.char(1));
        let idx = 0;
        if (Number(!!(C.ptrCompare((d).p, (d).bp, ">") && Number(C.deref(C.ptrAdd((d).p, C.int((-1)), "char"), "char") == 32)))) (idx = C.int((-1)));
        C.store(C.ptrAdd((d).p, idx, "char"), "char", C.char(0));
/* terminate bp */
        C.bump(C.fieldRef(d, "p"), 1, false, "char *");
/* advance past '(' */
        if (Number(!(C.strncmpi((d).p, C.literal("lit)"), 4)))) {
            ((d).islit = 1);
            ((d).p = C.ptrAdd((d).p, C.int((4 - 1)), "char"));
/* point at ')' */
        }
        else {
            ((d).spe = C.atoi((d).p));
            while (C.digit(C.deref((d).p, "char"))) C.bump(C.fieldRef(d, "p"), 1, true, "char *");
            if (Number(C.deref((d).p, "char") == 58)) {
                C.bump(C.fieldRef(d, "p"), 1, true, "char *");
                ((d).rechrg = (d).spe);
                ((d).spe = C.atoi((d).p));
                while (C.digit(C.deref((d).p, "char"))) C.bump(C.fieldRef(d, "p"), 1, true, "char *");
            }
            if (Number(C.deref((d).p, "char") != 41)) {
                ((d).spe = ((d).rechrg = 0));
/* mis-matched parentheses; rest of string will be ignored
                 * [probably we should restore everything back to '('
                 * instead since it might be part of "named ..."]
                 */
                (keeptrailingchars = (C.char(0)));
            }
            else {
                ((d).spesgn = 1);
            }
        }
        if (keeptrailingchars) {
            let pp = C.eos((d).bp);
/* 'pp' points at 'pb's terminating '\0',
               'p' points at ')' and will be incremented past it */
            do {
                C.store(((pp = C.ptrAdd(pp, 1, "char")), C.ptrAdd(pp, -1, "char")), "char", C.deref(C.bump(C.fieldRef(d, "p"), 1, false, "char *"), "char"));
            }
            while (C.deref((d).p, "char"));
        }
    }
/*
     * otmp->spe is type schar, so we don't want spe to be any bigger or
     * smaller.  Also, spe should always be positive --some cheaters may
     * try to confuse atoi().
     */
    if (Number((d).spe < 0)) {
        ((d).spesgn = C.int((-1)));
/* cheaters get what they deserve */
        ((d).spe = C.abs((d).spe));
    }
/* cap on obj->spe is independent of (and less than) SCHAR_LIM */
    if (Number((d).spe > C.SPE_LIM)) ((d).spe = C.SPE_LIM);
/* slime mold uses d.ftype, so not affected */
    if (Number(!!(Number((d).rechrg < 0) || Number((d).rechrg > 7)))) ((d).rechrg = 7);
/* recharge_limit */
}

export function readobjnam_postparse1(d) {
    d = C.argument(d, "struct _readobjnam_data *");
    let i;
/* now we have the actual name, as delivered by xname, say
     *  green potions called whisky
     *  scrolls labeled "QWERTY"
     *  egg
     *  fortune cookies
     *  very heavy iron ball named hoei
     *  wand of wishing
     *  elven cloak
     */
    if (C.ptrCompare((((d).p = C.strstri((d).bp, C.literal(" named ")))), 0, "!=")) {
        C.store((d).p, "char", C.char(0));
/* note: if 'name' is too long, oname() will truncate it */
        ((d).name = C.ptrAdd((d).p, 7, "char"));
    }
    if (C.ptrCompare((((d).p = C.strstri((d).bp, C.literal(" called ")))), 0, "!=")) {
        C.store((d).p, "char", C.char(0));
/* note: if 'un' is too long, obj lookup just won't match anything */
        ((d).un = C.ptrAdd((d).p, 8, "char"));
/* "helmet called telepathy" is not "helmet" (a specific type)
         * "shield called reflection" is not "shield" (a general type)
         */
        for ((i = 0); Number(i < C.int((C.ulong((BigInt(C.sizeof("const struct o_range[19]")) / BigInt(C.sizeof("const struct o_range"))))))); (i++)) if (Number(!(C.strncmpi(((d).bp), ((C.deref(C.ptrAdd(C.o_ranges, i, "const struct o_range"), "const struct o_range")).name), C.int((-1)))))) {
            ((d).oclass = (C.deref(C.ptrAdd(C.o_ranges, i, "const struct o_range"), "const struct o_range")).oclass);
            return 1;
/*goto srch;*/
        }
    }
    if (C.ptrCompare((((d).p = C.strstri((d).bp, C.literal(" labeled ")))), 0, "!=")) {
        C.store((d).p, "char", C.char(0));
        ((d).dn = C.ptrAdd((d).p, 9, "char"));
    }
    else if (C.ptrCompare((((d).p = C.strstri((d).bp, C.literal(" labelled ")))), 0, "!=")) {
        C.store((d).p, "char", C.char(0));
        ((d).dn = C.ptrAdd((d).p, 10, "char"));
    }
    if (C.ptrCompare((((d).p = C.strstri((d).bp, C.literal(" of spinach")))), 0, "!=")) {
        C.store((d).p, "char", C.char(0));
        ((d).contents = C.TIN_SPINACH);
    }
/* real vs fake is only useful for wizard mode but we'll accept its
       parsing in normal play (result is never real Amulet for that case) */
    if (Number(!!(C.ptrCompare((((d).p = C.strstri((d).bp, ((C.deref(C.ptrAdd(C.obj_descr, ((C.deref(C.ptrAdd(C.objects, C.AMULET_OF_YENDOR, "struct objclass"), "struct objclass"))).oc_descr_idx, "struct objdescr"), "struct objdescr")).oc_descr)))), 0, "!=") && (Number(!!(C.ptrCompare((d).p, (d).bp, "==") || Number(C.deref(C.ptrAdd((d).p, C.int((-1)), "char"), "char") == 32))))))) {
        let s = (d).bp;
/* "Amulet of Yendor" matches two items, name of real Amulet
           and description of fake one; player can explicitly specify
           "real" to disambiguate, but not specifying "fake" achieves
           the same thing; "real" and "fake" are parsed above with other
           prefixes so that combinations like "blessed real" and "real
           blessed" work as expected; also accept partial specification
           of the full name of the fake; unlike the prefix recognition
           loop above, these have to be in the right order when more
           than one is present (similar to worthless glass gems below) */
        if (Number(!(C.strncmpi(s, C.literal("cheap "), 6)))) (((d).fake = 1), (s = C.ptrAdd(s, 6, "char")));
        if (Number(!(C.strncmpi(s, C.literal("plastic "), 8)))) (((d).fake = 1), (s = C.ptrAdd(s, 8, "char")));
        if (Number(!(C.strncmpi(s, C.literal("imitation "), 10)))) (((d).fake = 1), (s = C.ptrAdd(s, 10, "char")));
        ((s));
/* suppress potential assigned-but-not-used complaint */
/* when 'fake' is True, it overrides 'real' if both were given;
           when it is False, force 'real' whether that was specified or not */
        ((d).real = Number(!((d).fake)));
        ((d).typ = (((d).real) ? C.AMULET_OF_YENDOR : C.FAKE_AMULET_OF_YENDOR));
        return 2;
/*goto typfnd;*/
    }
/*
     * Skip over "pair of ", "pairs of", "set of" and "sets of".
     *
     * Accept "3 pair of boots" as well as "3 pairs of boots".  It is
     * valid English either way.  See makeplural() for more on pair/pairs.
     *
     * We should only double count if the object in question is not
     * referred to as a "pair of".  E.g. We should double if the player
     * types "pair of spears", but not if the player types "pair of
     * lenses".  Luckily (?) all objects that are referred to as pairs
     * -- boots, gloves, and lenses -- are also not mergeable, so cnt is
     * ignored anyway.
     */
    if (Number(!(C.strncmpi((d).bp, C.literal("pair of "), 8)))) {
        ((d).bp = C.ptrAdd((d).bp, 8, "char"));
        ((d).cnt = C.int(((d).cnt * 2)));
    }
    else if (Number(!(C.strncmpi((d).bp, C.literal("pairs of "), 9)))) {
        ((d).bp = C.ptrAdd((d).bp, 9, "char"));
        if (Number((d).cnt > 1)) ((d).cnt = C.int(((d).cnt * 2)));
    }
    else if (Number(!(C.strncmpi((d).bp, C.literal("set of "), 7)))) {
        ((d).bp = C.ptrAdd((d).bp, 7, "char"));
    }
    else if (Number(!(C.strncmpi((d).bp, C.literal("sets of "), 8)))) {
        ((d).bp = C.ptrAdd((d).bp, 8, "char"));
    }
/* Intercept pudding globs here; they're a valid wish target,
     * but we need them to not get treated like a corpse.
     * If a count is specified, it will be used to magnify weight
     * rather than to specify quantity (which is always 1 for globs).
     */
    (i = C.int(C.strlen((d).bp)));
    ((d).p = 0);
/* check for "glob", "<foo> glob", and "glob of <foo>" */
    if (Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!(C.strncmpi(((d).bp), (C.literal("glob")), C.int((-1))))) || Number(!((Number(!!(C.ptrCompare((C.ptrAdd(C.ptrAdd((d).bp, i, "char"), -(5), "char")), (d).bp, "<") || C.strncmpi(((C.ptrAdd(C.ptrAdd((d).bp, i, "char"), -(5), "char"))), (C.literal(" glob")), C.int((-1)))))))))) || Number(!(C.strncmpi(((d).bp), (C.literal("globs")), C.int((-1))))))) || Number(!((Number(!!(C.ptrCompare((C.ptrAdd(C.ptrAdd((d).bp, i, "char"), -(6), "char")), (d).bp, "<") || C.strncmpi(((C.ptrAdd(C.ptrAdd((d).bp, i, "char"), -(6), "char"))), (C.literal(" globs")), C.int((-1)))))))))) || C.ptrCompare((((d).p = C.strstri((d).bp, C.literal("glob of ")))), 0, "!="))) || C.ptrCompare((((d).p = C.strstri((d).bp, C.literal("globs of ")))), 0, "!=")))) {
        ((d).mntmp = C.name_to_mon(((Number(!((d).p))) ? (d).bp : (C.ptrAdd(C.strstri((d).p, C.literal(" of ")), 4, "char"))), 0));
/* if we didn't recognize monster type, pick a valid one at random */
        if (Number((d).mntmp == C.NON_PM)) ((d).mntmp = (C.int(((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("objnam.c"), 4354, C.literal("readobjnam_postparse1")), C.rn2(C.int((C.PM_BLACK_PUDDING - C.PM_GRAY_OOZE))))) : C.rn2(C.int((C.PM_BLACK_PUDDING - C.PM_GRAY_OOZE))))) + (C.PM_GRAY_OOZE)))));
/* normally this would be done when makesingular() changes the value
           but canonical form here is already singular so that won't happen */
        if (Number(!!(Number((d).cnt < 2) && C.strstri((d).bp, C.literal("globs"))))) ((d).cnt = 2);
/* affects otmp->owt but not otmp->quan for globs */
/* construct canonical spelling in case name_to_mon() recognized a
           variant (grey ooze) or player used inverted syntax (<foo> glob);
           if player has given a valid monster type but not valid glob type,
           object name lookup won't find it and wish attempt will fail */
        C.sprintf((d).globbuf, C.literal("glob of %s"), C.deref(C.ptrAdd((C.deref(C.ptrAdd(C.mons, (d).mntmp, "struct permonst"), "struct permonst")).pmnames, C.NEUTRAL, "const char *"), "const char *"), "p");
        ((d).bp = (d).globbuf);
        ((d).mntmp = C.NON_PM);
/* not useful for "glob of <foo>" object lookup */
        ((d).oclass = C.char(C.FOOD_CLASS));
        (((d).actualn = (d).bp), ((d).dn = 0));
        return 1;
/*goto srch;*/
    }
    else {
/*
         * Find corpse type using "of" (figurine of an orc, tin of orc meat)
         * Don't check if it's a wand or spellbook.
         * (avoid "wand/finger of death" confusion).
         * Don't match "ogre" or "giant" monster name inside alternate item
         * names "gauntlets of ogre power" and "gauntlets of giant strength"
         * (or the alternate spelling of those, "gloves of ...").
         */
        if (Number(!!(Number(!!(Number(!!(Number(!!(Number(!(C.strstri((d).bp, C.literal("wand ")))) && Number(!(C.strstri((d).bp, C.literal("spellbook ")))))) && Number(!(C.strstri((d).bp, C.literal("gauntlets ")))))) && Number(!(C.strstri((d).bp, C.literal("gloves ")))))) && Number(!(C.strstri((d).bp, C.literal("finger "))))))) {
            if (C.ptrCompare((((d).p = C.strstri((d).bp, C.literal("tin of ")))), 0, "!=")) {
                if (Number(!(C.strncmpi((C.ptrAdd((d).p, 7, "char")), (C.literal("spinach")), C.int((-1)))))) {
                    ((d).contents = C.TIN_SPINACH);
                    ((d).mntmp = C.NON_PM);
                }
                else {
                    ((d).tmp = C.tin_variety_txt(C.ptrAdd((d).p, 7, "char"), C.fieldRef(d, "tinv")));
                    ((d).tvariety = (d).tinv);
                    ((d).mntmp = C.name_to_mon(C.ptrAdd(C.ptrAdd((d).p, 7, "char"), (d).tmp, "char"), C.fieldRef(d, "mgend")));
                }
                ((d).typ = C.TIN);
                return 2;
/*goto typfnd;*/
            }
            else if (Number(!!(C.ptrCompare((((d).p = C.strstri((d).bp, C.literal(" of ")))), 0, "!=") && (Number((((d).mntmp = C.name_to_mon(C.ptrAdd((d).p, 4, "char"), C.fieldRef(d, "mgend")))) >= C.LOW_PM))))) C.store((d).p, "char", C.char(0));
        }
    }
/* Find corpse type w/o "of" (red dragon scale mail, yeti corpse) */
    if (Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(C.strncmpi((d).bp, C.literal("samurai sword"), 13) && C.strncmpi((d).bp, C.literal("wizard lock"), 11))) && C.strncmpi((d).bp, C.literal("death wand"), 10))) && C.strncmpi((d).bp, C.literal("master key"), 10))) && C.strncmpi((d).bp, C.literal("ninja-to"), 8))) && C.strncmpi((d).bp, C.literal("magenta"), 7)))) /* not the "samurai" monster! */
/* not the "wizard" monster! */
/* 'of inversion', not Rider */
/* not the "master" rank */
/* not the "ninja" rank */
{
/* not the "mage" rank */
        const rest = C.scalarLocal("const char *", 0);
        if (Number(!!(Number(!!(Number((d).mntmp < C.LOW_PM) && Number(C.strlen((d).bp) > C.ulong(2)))) && (Number((((d).mntmp = C.name_to_monplus((d).bp, rest, C.fieldRef(d, "mgend")))) >= C.LOW_PM))))) {
            let obp = (d).bp;
/* 'rest' is a pointer past the matching portion; if that was
               an alternate name or a rank title rather than the canonical
               monster name we wouldn't otherwise know how much to skip */
            ((d).bp = rest.value);
/* cast away const */
            if (Number(C.deref((d).bp, "char") == 32)) {
                C.bump(C.fieldRef(d, "bp"), 1, true, "char *");
            }
            else if (Number(!!(Number(!(C.strncmpi((d).bp, C.literal("s "), 2))) || (Number(!!(C.ptrCompare((d).bp, (d).origbp, ">") && Number(!(C.strncmpi(C.ptrAdd((d).bp, -(1), "char"), C.literal("s' "), 3))))))))) {
                ((d).bp = C.ptrAdd((d).bp, 2, "char"));
            }
            else if (Number(!!(Number(!(C.strncmpi((d).bp, C.literal("es "), 3))) || Number(!(C.strncmpi((d).bp, C.literal("'s "), 3)))))) {
                ((d).bp = C.ptrAdd((d).bp, 3, "char"));
            }
            else if (Number(!!(Number(!!(Number(!!(Number(!!(Number(!(C.deref((d).bp, "char"))) && Number(!((d).actualn)))) && Number(!((d).dn)))) && Number(!((d).un)))) && Number(!((d).oclass))))) {
/* no referent; they don't really mean a monster type */
                ((d).bp = obp);
                ((d).mntmp = C.NON_PM);
            }
        }
    }
/* first change to singular if necessary */
    if (Number(!!(Number(!!(C.deref((d).bp, "char") && C.strncmpi(((d).bp), (C.literal("tricks")), C.int((-1))))) && C.strncmpi(((d).bp), (C.literal("clothes")), C.int((-1)))))) /* we want "tricks" to match "bag of tricks" [rnd_otyp_by_namedesc()]
           but that wouldn't work if it gets singularized to "trick"
           ["tricks bag" matches whether or not this exception is present
           because singularize operates on "bag" and wishymatch()'s
           'of inversion' finds a match] */
/* an odd potential wish; fail rather than get a false match with
           "cloth" because it might yield a "cloth spellbook" rather than
           a "piece of cloth" cloak [maybe we should give random armor?] */
{
        let sng = makesingular((d).bp);
        if (C.strcmp((d).bp, sng)) {
            if (Number((d).cnt == 1)) ((d).cnt = 2);
            C.strcpy((d).bp, sng);
        }
    }
/* Alternate spellings (pick-ax, silver sabre, &c) */
{
        let as = C.spellings;
        while ((as).sp) {
            if (C.callLocal(wishymatch, (d).bp, (as).sp, (C.char(1)))) {
                ((d).typ = (as).ob);
                return 2;
/*goto typfnd;*/
            }
            ((as = C.ptrAdd(as, 1, "struct alt_spellings")), C.ptrAdd(as, -1, "struct alt_spellings"));
        }
/* can't use spellings list for this one due to shuffling */
        if (Number(!(C.strncmpi((d).bp, C.literal("grey spell"), 10)))) C.store((C.ptrAdd((d).bp, 2, "char")), "char", C.char(97));
        if (C.ptrCompare((((d).p = C.strstri((d).bp, C.literal("armour")))), 0, "!=")) {
/* skip past "armo", then copy remainder beyond "u" */
            ((d).p = C.ptrAdd((d).p, 4, "char"));
            while (Number((C.store((d).p, "char", C.deref((C.ptrAdd((d).p, 1, "char")), "char"))) != 0)) C.bump(C.fieldRef(d, "p"), 1, false, "char *");
/* self terminating */
        }
    }
/* dragon scales - assumes order of dragons */
    if (Number(!!(Number(!!(Number(!(C.strncmpi(((d).bp), (C.literal("scales")), C.int((-1))))) && Number((d).mntmp >= C.PM_GRAY_DRAGON))) && Number((d).mntmp <= C.PM_YELLOW_DRAGON)))) {
        ((d).typ = C.int((C.int((C.GRAY_DRAGON_SCALES + (d).mntmp)) - C.PM_GRAY_DRAGON)));
        ((d).mntmp = C.NON_PM);
/* no monster */
        return 2;
/*goto typfnd;*/
    }
    ((d).p = C.eos((d).bp));
    if (Number(!((Number(!!(C.ptrCompare((C.ptrAdd((d).p, -(10), "char")), (d).bp, "<") || C.strncmpi(((C.ptrAdd((d).p, -(10), "char"))), (C.literal("holy water")), C.int((-1))))))))) {
/* this isn't needed for "[un]holy water" because adjective parsing
           handles holy==blessed and unholy==cursed and leaves "water" for
           the object type, but it is needed for "potion of [un]holy water"
           since that parsing stops when it reaches "potion"; also, neither
           "holy water" nor "unholy water" is an actual type of potion */
        if (Number(!((Number(!!(C.ptrCompare((C.ptrAdd(C.ptrAdd((d).p, -(10), "char"), -(2), "char")), (d).bp, "<") || C.strncmpi((C.ptrAdd(C.ptrAdd((d).p, -(10), "char"), -(2), "char")), C.literal("un"), 2))))))) (((d).iscursed = 1), ((d).blessed = ((d).uncursed = 0)));
        else /* unholy water */
        (((d).blessed = 1), ((d).iscursed = ((d).uncursed = 0)));
/* holy water */
        ((d).typ = C.POT_WATER);
        return 2;
/*goto typfnd;*/
    }
/* accept "paperback" or "paperback book", reject "paperback spellbook" */
    if (Number(!(C.strncmpi((d).bp, C.literal("paperback"), 9)))) {
        let dbp = C.ptrAdd((d).bp, 9, "char");
/* just past "paperback" */
        if (Number(!!(Number(!(C.deref(dbp, "char"))) || Number(!(C.strncmpi(dbp, C.literal(" book"), 5)))))) {
            ((d).typ = C.SPE_NOVEL);
            return 2;
/*goto typfnd;*/
        }
        else {
            ((d).otmp = 0);
            return 3;
        }
    }
    if (Number(!!((d).unlabeled && Number(!((Number(!!(C.ptrCompare((C.ptrAdd((d).p, -(6), "char")), (d).bp, "<") || C.strncmpi(((C.ptrAdd((d).p, -(6), "char"))), (C.literal("scroll")), C.int((-1))))))))))) {
        ((d).typ = C.SCR_BLANK_PAPER);
        return 2;
/*goto typfnd;*/
    }
    if (Number(!!((d).unlabeled && Number(!((Number(!!(C.ptrCompare((C.ptrAdd((d).p, -(9), "char")), (d).bp, "<") || C.strncmpi(((C.ptrAdd((d).p, -(9), "char"))), (C.literal("spellbook")), C.int((-1))))))))))) {
        ((d).typ = C.SPE_BLANK_PAPER);
        return 2;
/*goto typfnd;*/
    }
/* specific food rather than color of gem/potion/spellbook[/scales] */
    if (Number(!!(Number(!((Number(!!(C.ptrCompare((C.ptrAdd((d).p, -(6), "char")), (d).bp, "<") || C.strncmpi(((C.ptrAdd((d).p, -(6), "char"))), (C.literal("orange")), C.int((-1)))))))) && Number((d).mntmp == C.NON_PM)))) {
        ((d).typ = C.ORANGE);
        return 2;
/*goto typfnd;*/
    }
/*
     * NOTE: Gold pieces are handled as objects nowadays, and therefore
     * this section should probably be reconsidered as well as the entire
     * gold/money concept.  Maybe we want to add other monetary units as
     * well in the future. (TH)
     */
    if (Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!((Number(!!(C.ptrCompare((C.ptrAdd((d).p, -(10), "char")), (d).bp, "<") || C.strncmpi(((C.ptrAdd((d).p, -(10), "char"))), (C.literal("gold piece")), C.int((-1)))))))) || Number(!((Number(!!(C.ptrCompare((C.ptrAdd((d).p, -(7), "char")), (d).bp, "<") || C.strncmpi(((C.ptrAdd((d).p, -(7), "char"))), (C.literal("zorkmid")), C.int((-1)))))))))) || Number(!(C.strncmpi(((d).bp), (C.literal("gold")), C.int((-1))))))) || Number(!(C.strncmpi(((d).bp), (C.literal("money")), C.int((-1))))))) || Number(!(C.strncmpi(((d).bp), (C.literal("coin")), C.int((-1))))))) || Number(C.deref((d).bp, "char") == C.GOLD_SYM)))) {
        if (Number(!!(Number((d).cnt > 5000) && Number(!((C.flags).debug))))) ((d).cnt = 5000);
        else if (Number((d).cnt < 1)) ((d).cnt = 1);
        ((d).otmp = C.mksobj(C.GOLD_PIECE, (C.char(0)), (C.char(0))));
        (((d).otmp).quan = C.long((d).cnt));
        (((d).otmp).owt = C.uint(C.weight((d).otmp)));
        ((C.disp).botl = (C.char(1)));
        return 3;
/*return otmp;*/
    }
/* check for single character object class code ("/" for wand, &c) */
    if (Number(!!(Number(!!(Number(!!(Number(C.strlen((d).bp) == C.ulong(1)) && Number(((i = C.def_char_to_objclass(C.deref((d).bp, "char")))) < C.MAXOCLASSES))) && Number(i > C.ILLOBJ_CLASS))) && (Number(!!(Number(i != C.VENOM_CLASS) || (C.flags).debug)))))) {
        ((d).oclass = C.char(i));
        return 4;
/*goto any;*/
    }
/* Search for class names: XXXXX potion, scroll of XXXXX.
       Avoid false hits on, e.g., rings for "ring mail". */
    if (Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(C.strncmpi((d).bp, C.literal("enchant "), 8) && C.strncmpi((d).bp, C.literal("destroy "), 8))) && C.strncmpi((d).bp, C.literal("detect food"), 11))) && C.strncmpi((d).bp, C.literal("food detection"), 14))) && C.strncmpi((d).bp, C.literal("ring mail"), 9))) && C.strncmpi((d).bp, C.literal("studded leather armor"), 21))) && C.strncmpi((d).bp, C.literal("leather armor"), 13))) && C.strncmpi((d).bp, C.literal("tooled horn"), 11))) && C.strncmpi((d).bp, C.literal("food ration"), 11))) && C.strncmpi((d).bp, C.literal("meat ring"), 9)))) for ((i = 0); Number(i < C.int((BigInt(C.sizeof("const char[13]"))))); (i++)) {
        let j = C.int(C.Strlen_(C.deref(C.ptrAdd(C.wrp, i, "const char *const"), "const char *const"), C.literal("readobjnam_postparse1"), 4568));
/* check for "<class> [ of ] something" */
        if (Number(!(C.strncmpi((d).bp, C.deref(C.ptrAdd(C.wrp, i, "const char *const"), "const char *const"), j)))) {
            ((d).oclass = C.deref(C.ptrAdd(C.wrpsym, i, "const char"), "const char"));
            if (Number((d).oclass != C.AMULET_CLASS)) {
                ((d).bp = C.ptrAdd((d).bp, j, "char"));
                if (Number(!(C.strncmpi((d).bp, C.literal(" of "), 4)))) ((d).actualn = C.ptrAdd((d).bp, 4, "char"));
/* else if(*bp) ?? */
            }
            else ((d).actualn = (d).bp);
            return 1;
/*goto srch;*/
        }
/* check for "something <class>" */
        if (Number(!((Number(!!(C.ptrCompare((C.ptrAdd((d).p, -(j), "char")), (d).bp, "<") || C.strncmpi(((C.ptrAdd((d).p, -(j), "char"))), (C.deref(C.ptrAdd(C.wrp, i, "const char *const"), "const char *const")), C.int((-1))))))))) {
            ((d).oclass = C.deref(C.ptrAdd(C.wrpsym, i, "const char"), "const char"));
/* for "foo amulet", leave the class name so that
                   wishymatch() can do "of inversion" to try matching
                   "amulet of foo"; other classes don't include their
                   class name in their full object names (where
                   "potion of healing" is just "healing", for instance) */
            if (Number((d).oclass != C.AMULET_CLASS)) {
                ((d).p = C.ptrAdd((d).p, -(j), "char"));
                C.store((d).p, "char", C.char(0));
                if (Number(!!(C.ptrCompare((d).p, (d).bp, ">") && Number(C.deref(C.ptrAdd((d).p, C.int((-1)), "char"), "char") == 32)))) C.store(C.ptrAdd((d).p, C.int((-1)), "char"), "char", C.char(0));
            }
            else {
                let k;
                let l;
                const amubuf = C.localArray("char[256]", 0);
/* amulet without "of"; convoluted wording but better a
                       special case that's handled than one that's missing */
                if (Number(!(C.strncmpi((d).bp, C.literal("versus poison "), 14)))) {
                    ((d).typ = C.AMULET_VERSUS_POISON);
                    return 2;
/*goto typfnd;*/
                }
/* check for "<shape> amulet"; strip off trailing
                       " amulet" for that w/o changing contents of d->bp */
                (l = C.int((C.int(C.strlen((d).bp)) - j)));
                if (Number(!!(Number(l > 0) && Number(C.deref(C.ptrAdd((d).bp, C.int((l - 1)), "char"), "char") == 32)))) (l = C.int((l - 1)));
                C.copynchars(amubuf, (d).bp, (((Number((l) < (C.int((C.int(BigInt(C.sizeof("char[256]"))) - 1))))) ? (l) : (C.int((C.int(BigInt(C.sizeof("char[256]"))) - 1))))));
                (k = C.callLocal(rnd_otyp_by_namedesc, amubuf, C.char(C.AMULET_CLASS), 0));
                if (Number(k != C.STRANGE_OBJECT)) {
                    ((d).typ = k);
                    return 2;
/*goto typfnd;*/
                }
            }
            ((d).actualn = ((d).dn = (d).bp));
            return 1;
/*goto srch;*/
        }
    }
/* Wishing in wizard mode can create traps and furniture.
     * Part I:  distinguish between trap and object for the two
     * types of traps which have corresponding objects:  bear trap
     * and land mine.  "beartrap" (object) and "bear trap" (trap)
     * have a difference in spelling which we used to exploit by
     * adding a special case in wishymatch(), but "land mine" is
     * spelled the same either way so needs different handing.
     * Since we need something else for land mine, we've dropped
     * the bear trap hack so that both are handled exactly the
     * same.  To get an armed trap instead of a disarmed object,
     * the player can prefix either the object name or the trap
     * name with "trapped " (which ordinarily applies to chests
     * and tins), or append something--anything at all except for
     * " object", but " trap" is suggested--to either the trap
     * name or the object name.
     */
    if (Number(!!((C.flags).debug && (Number(!!(Number(!(C.strncmpi((d).bp, C.literal("bear"), 4))) || Number(!(C.strncmpi((d).bp, C.literal("land"), 4))))))))) {
        let beartrap = C.char((Number(C.lowc(C.deref((d).bp, "char")) == 98)));
        let zp = C.ptrAdd((d).bp, 4, "char");
/* skip "bear"/"land" */
        if (Number(C.deref(zp, "char") == 32)) (zp = C.ptrAdd(zp, 1, "char"));
/* embedded space is optional */
        if (Number(!(C.strncmpi(zp, ((beartrap) ? C.literal("trap") : C.literal("mine")), 4)))) {
            (zp = C.ptrAdd(zp, 4, "char"));
            if (Number(!!(Number((d).trapped == 2) || Number(!(C.strncmpi((zp), (C.literal(" object")), C.int((-1)))))))) {
/* "untrapped <foo>" or "<foo> object" */
                ((d).typ = ((beartrap) ? C.BEARTRAP : C.LAND_MINE));
                return 2;
/*goto typfnd;*/
            }
            else if (Number(!!(Number((d).trapped == 1) || Number(C.deref(zp, "char") != 0)))) {
/* "trapped <foo>" or "<foo> trap" (actually "<foo>*") */
/* use canonical trap spelling, skip object matching */
                C.strcpy((d).bp, C.trapname(((beartrap) ? C.BEAR_TRAP : C.LANDMINE), (C.char(1))));
                return 5;
/*goto wiztrap;*/
            }
/* [no prefix or suffix; we're going to end up matching
               the object name and getting a disarmed trap object] */
        }
    }
    return 0;
}

export function readobjnam_postparse2(d) {
    d = C.argument(d, "struct _readobjnam_data *");
    let i;
/* "grey stone" check must be before general "stone" */
    for ((i = 0); Number(i < C.int((C.ulong((BigInt(C.sizeof("const struct o_range[19]")) / BigInt(C.sizeof("const struct o_range"))))))); (i++)) if (Number(!(C.strncmpi(((d).bp), ((C.deref(C.ptrAdd(C.o_ranges, i, "const struct o_range"), "const struct o_range")).name), C.int((-1)))))) {
        ((d).typ = rnd_class((C.deref(C.ptrAdd(C.o_ranges, i, "const struct o_range"), "const struct o_range")).f_o_range, (C.deref(C.ptrAdd(C.o_ranges, i, "const struct o_range"), "const struct o_range")).l_o_range));
        return 2;
/*goto typfnd;*/
    }
    if (Number(!!(Number(!((Number(!!(C.ptrCompare((C.ptrAdd((d).p, -(6), "char")), (d).bp, "<") || C.strncmpi(((C.ptrAdd((d).p, -(6), "char"))), (C.literal(" stone")), C.int((-1)))))))) || Number(!((Number(!!(C.ptrCompare((C.ptrAdd((d).p, -(4), "char")), (d).bp, "<") || C.strncmpi(((C.ptrAdd((d).p, -(4), "char"))), (C.literal(" gem")), C.int((-1))))))))))) {
        C.store(C.ptrAdd((d).p, ((Number(!(C.strncmpi((C.ptrAdd((d).p, -(4), "char")), (C.literal(" gem")), C.int((-1)))))) ? C.int((-4)) : C.int((-6))), "char"), "char", C.char(0));
        ((d).oclass = C.char(C.GEM_CLASS));
        ((d).dn = ((d).actualn = (d).bp));
        return 1;
/*goto srch;*/
    }
    else if (Number(!(C.strncmpi(((d).bp), (C.literal("looking glass")), C.int((-1)))))) {
        ;
/* avoid false hit on "* glass" */
    }
    else if (Number(!!(Number(!((Number(!!(C.ptrCompare((C.ptrAdd((d).p, -(6), "char")), (d).bp, "<") || C.strncmpi(((C.ptrAdd((d).p, -(6), "char"))), (C.literal(" glass")), C.int((-1)))))))) || Number(!(C.strncmpi(((d).bp), (C.literal("glass")), C.int((-1)))))))) {
        let s = (d).bp;
/* treat "broken glass" as a non-existent item; since "broken" is
           also a chest/box prefix it might have been stripped off above */
        if (Number(!!((d).broken || C.strstri(s, C.literal("broken"))))) {
            ((d).otmp = 0);
            return 3;
/* return otmp */
        }
        if (Number(!(C.strncmpi(s, C.literal("worthless "), 10)))) (s = C.ptrAdd(s, 10, "char"));
        if (Number(!(C.strncmpi(s, C.literal("piece of "), 9)))) (s = C.ptrAdd(s, 9, "char"));
        if (Number(!(C.strncmpi(s, C.literal("colored "), 8)))) (s = C.ptrAdd(s, 8, "char"));
        else if (Number(!(C.strncmpi(s, C.literal("coloured "), 9)))) (s = C.ptrAdd(s, 9, "char"));
        if (Number(!(C.strncmpi((s), (C.literal("glass")), C.int((-1)))))) {
/* choose random color */
/* 9 different kinds */
            ((d).typ = C.int((C.FIRST_GLASS_GEM + (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("objnam.c"), 4705, C.literal("readobjnam_postparse2")), C.rn2(C.NUM_GLASS_GEMS))) : C.rn2(C.NUM_GLASS_GEMS))))));
            if (Number((C.deref(C.ptrAdd(C.objects, (d).typ, "struct objclass"), "struct objclass")).oc_class == C.GEM_CLASS)) return 2;
            else /*goto typfnd;*/
            ((d).typ = 0);
/* somebody changed objects[]? punt */
        }
        else {
/* try to construct canonical form */
            const tbuf = C.localArray("char[256]", 0);
            C.strcpy(tbuf, C.literal("worthless piece of "));
            C.strcat(tbuf, s);
/* assume it starts with the color */
            C.strcpy((d).bp, tbuf);
        }
    }
    ((d).actualn = (d).bp);
    if (Number(!((d).dn))) ((d).dn = (d).actualn);
/* ex. "skull cap" */
    return 0;
}

export function readobjnam_postparse3(d) {
    d = C.argument(d, "struct _readobjnam_data *");
    let i;
/* check real names of gems first */
    if (Number(!!(Number(!((d).oclass)) && (d).actualn))) {
        for ((i = C.deref(C.ptrAdd((C.svb).bases, C.GEM_CLASS, "int"), "int")); Number(i <= C.LAST_REAL_GEM); (i++)) {
            let zn;
            if (Number(!!(C.ptrCompare(((zn = ((C.deref(C.ptrAdd(C.obj_descr, ((C.deref(C.ptrAdd(C.objects, i, "struct objclass"), "struct objclass"))).oc_name_idx, "struct objdescr"), "struct objdescr")).oc_name))), 0, "!=") && Number(!(C.strncmpi(((d).actualn), (zn), C.int((-1)))))))) {
                ((d).typ = i);
                return 2;
/*goto typfnd;*/
            }
        }
/* "tin of foo" would be caught above, but plain "tin" has
           a random chance of yielding "tin wand" unless we do this */
        if (Number(!(C.strncmpi(((d).actualn), (C.literal("tin")), C.int((-1)))))) {
            ((d).typ = C.TIN);
            return 2;
/*goto typfnd;*/
        }
    }
    if (Number(!!(Number(!!(Number(!!((Number((((d).typ = C.callLocal(rnd_otyp_by_namedesc, (d).actualn, (d).oclass, 1))) != C.STRANGE_OBJECT)) || (Number(!!(C.ptrCompare((d).dn, (d).actualn, "!=") && (Number((((d).typ = C.callLocal(rnd_otyp_by_namedesc, (d).dn, (d).oclass, 1))) != C.STRANGE_OBJECT))))))) || (Number((((d).typ = C.callLocal(rnd_otyp_by_namedesc, (d).un, (d).oclass, 1))) != C.STRANGE_OBJECT)))) || (Number(!!(C.ptrCompare((d).origbp, (d).actualn, "!=") && (Number((((d).typ = C.callLocal(rnd_otyp_by_namedesc, (d).origbp, (d).oclass, 1))) != C.STRANGE_OBJECT)))))))) return 2;
/*goto typfnd;*/
    ((d).typ = 0);
    if ((d).actualn) {
        let j = C.Japanese_items;
        while ((j).item) {
            if (Number(!(C.strncmpi(((d).actualn), ((j).name), C.int((-1)))))) {
                ((d).typ = (j).item);
                return 2;
/*goto typfnd;*/
            }
            ((j = C.ptrAdd(j, 1, "struct Jitem")), C.ptrAdd(j, -1, "struct Jitem"));
        }
    }
/* if we've stripped off "armor" and failed to match anything
       in objects[], append "mail" and try again to catch misnamed
       requests like "plate armor" and "yellow dragon scale armor" */
    if (Number(!!(Number((d).oclass == C.ARMOR_CLASS) && Number(!(C.strstri((d).bp, C.literal("mail"))))))) {
/* modifying bp's string is ok; we're about to resort
           to random armor if this also fails to match anything */
        C.strcat((d).bp, C.literal(" mail"));
        return 6;
/*goto retry;*/
    }
    if (Number(!(C.strncmpi(((d).bp), (C.literal("spinach")), C.int((-1)))))) {
        ((d).contents = C.TIN_SPINACH);
        ((d).typ = C.TIN);
        return 2;
/*goto typfnd;*/
    }
/* Fruits must not mess up the ability to wish for real objects (since
     * you can leave a fruit in a bones file and it will be added to
     * another person's game), so they must be checked for last, after
     * stripping all the possible prefixes and seeing if there's a real
     * name in there.  So we have to save the full original name.  However,
     * it's still possible to do things like "uncursed burnt Alaska",
     * or worse yet, "2 burned 5 course meals", so we need to loop to
     * strip off the prefixes again, this time stripping only the ones
     * possible on food.
     * We could get even more detailed so as to allow food names with
     * prefixes that _are_ possible on food, so you could wish for
     * "2 3 alarm chilis".  Currently this isn't allowed; options.c
     * automatically sticks 'candied' in front of such names.
     */
/* Note: not strcmpi.  2 fruits, one capital, one not, are possible.
       Also not strncmp.  We used to ignore trailing text with it, but
       that resulted in "grapefruit" matching "grape" if the latter came
       earlier than the former in the fruit list. */
{
        let fp;
        let l;
        let cntf;
        let blessedf;
        let iscursedf;
        let uncursedf;
        let halfeatenf;
        let f;
        (blessedf = (iscursedf = (uncursedf = (halfeatenf = 0))));
        (cntf = 0);
        (fp = (d).fruitbuf);
        for (; ; ) {
            if (Number(!!(Number(!(fp)) || Number(!(C.deref(fp, "char")))))) break;
            if (Number(!!(Number(!(C.strncmpi(fp, C.literal("an "), (l = 3)))) || Number(!(C.strncmpi(fp, C.literal("a "), (l = 2))))))) {
                (cntf = 1);
            }
            else if (Number(!!(Number(!(cntf)) && C.digit(C.deref(fp, "char"))))) {
                (cntf = C.atoi(fp));
                while (C.digit(C.deref(fp, "char"))) ((fp = C.ptrAdd(fp, 1, "char")), C.ptrAdd(fp, -1, "char"));
                while (Number(C.deref(fp, "char") == 32)) ((fp = C.ptrAdd(fp, 1, "char")), C.ptrAdd(fp, -1, "char"));
                (l = 0);
            }
            else if (Number(!(C.strncmpi(fp, C.literal("blessed "), (l = 8))))) {
                (blessedf = 1);
            }
            else if (Number(!(C.strncmpi(fp, C.literal("cursed "), (l = 7))))) {
                (iscursedf = 1);
            }
            else if (Number(!(C.strncmpi(fp, C.literal("uncursed "), (l = 9))))) {
                (uncursedf = 1);
            }
            else if (Number(!!(Number(!(C.strncmpi(fp, C.literal("partly eaten "), (l = 13)))) || Number(!(C.strncmpi(fp, C.literal("partially eaten "), (l = 16))))))) {
                (halfeatenf = 1);
            }
            else break;
            (fp = C.ptrAdd(fp, l, "char"));
        }
        for ((f = (C.gf).ffruit); f; (f = (f).nextf)) {
/* match type: 0=none, 1=exact, 2=singular, 3=plural */
            let ftyp = 0;
            if (Number(!(C.strcmp(fp, (f).fname)))) (ftyp = 1);
            else if (Number(!(C.strcmp(fp, makesingular((f).fname))))) (ftyp = 2);
            else if (Number(!(C.strcmp(fp, makeplural((f).fname))))) (ftyp = 3);
            if (ftyp) {
                ((d).typ = C.SLIME_MOLD);
                ((d).blessed = blessedf);
                ((d).iscursed = iscursedf);
                ((d).uncursed = uncursedf);
                ((d).halfeaten = halfeatenf);
/* adjust count if user explicitly asked for
                   singular amount (can't happen unless fruit
                   has been given an already pluralized name)
                   or for plural amount */
                if (Number(!!(Number(ftyp == 2) && Number(!(cntf))))) (cntf = 1);
                else if (Number(!!(Number(ftyp == 3) && Number(!(cntf))))) (cntf = 2);
                ((d).cnt = cntf);
                ((d).ftype = (f).fid);
                return 2;
/*goto typfnd;*/
            }
        }
    }
    if (Number(!!(Number(!((d).oclass)) && (d).actualn))) {
        const objtyp = C.scalarLocal("short");
/* Perhaps it's an artifact specified by name, not type */
        ((d).name = C.artifact_name((d).actualn, objtyp, (C.char(1))));
        if ((d).name) {
            ((d).typ = objtyp.value);
            return 2;
/*goto typfnd;*/
        }
    }
/* got a class, but not specific type;
       check alternate spellings of items with matching classes */
    if (Number(!!((d).oclass && Number(!((d).typ))))) {
        let as = C.spellings;
        while ((as).sp) {
            if (Number(!!(Number((C.deref(C.ptrAdd(C.objects, (as).ob, "struct objclass"), "struct objclass")).oc_class == (d).oclass) && C.callLocal(wishymatch, (d).bp, (as).sp, (C.char(1)))))) {
                ((d).typ = (as).ob);
                return 2;
/*goto typfnd;*/
            }
            ((as = C.ptrAdd(as, 1, "struct alt_spellings")), C.ptrAdd(as, -1, "struct alt_spellings"));
        }
    }
    return 0;
}

/*
 * Return something wished for.  Specifying a null pointer for
 * the user request string results in a random object.  Otherwise,
 * if asking explicitly for "nothing" (or "nil") return no_wish;
 * if not an object return &hands_obj; if an error (no matching object),
 * return null.
 */
export function readobjnam(bp, no_wish) {
    bp = C.argument(bp, "char *");
    no_wish = C.argument(no_wish, "struct obj *");
    const d = C.recordLocal("struct _readobjnam_data", 0);
    readobjnam_init(bp, d);
    let parse_label = "start";
    typfnd: {
    any: {
    wiztrap: {
    retry: for (;;) {
    srch: {
    if (parse_label === "srch") break srch;
    if (parse_label === "start") {
    if (Number(!(bp))) break any;
/* first, remove extra whitespace they may have typed */
    C.mungspaces(bp);
/* allow wishing for "nothing" to preserve wishless conduct...
       [now requires "wand of nothing" if that's what was really wanted] */
    if (Number(!!(Number(!!(Number(!(C.strncmpi((bp), (C.literal("nothing")), C.int((-1))))) || Number(!(C.strncmpi((bp), (C.literal("nil")), C.int((-1))))))) || Number(!(C.strncmpi((bp), (C.literal("none")), C.int((-1)))))))) return no_wish;
/* save the [nearly] unmodified choice string */
    C.strcpy((d).fruitbuf, bp);
    if (readobjnam_preparse(d)) break any;
    if (Number(!((d).cnt))) ((d).cnt = 1);
/* will be changed to 2 if makesingular() changes string */
    readobjnam_parse_charges(d);
    switch (C.callLocal(readobjnam_postparse1, d)) {
        default:
            case (0):
                break;
        case (1):
            break srch;
        case (2):
            break typfnd;
        case (3):
            return (d).otmp;
        case (4):
            break any;
        case (5):
            break wiztrap;
    }
    }
    switch (C.callLocal(readobjnam_postparse2, d)) {
        default:
            case (0):
                break;
        case (1):
            break srch;
        case (2):
            break typfnd;
        case (3):
            return (d).otmp;
        case (4):
            break any;
        case (5):
            break wiztrap;
    }
    } // srch
    switch (C.callLocal(readobjnam_postparse3, d)) {
        default:
            case (0):
                break;
        case (1):
            { parse_label = "srch"; continue retry; }
        case (2):
            break typfnd;
        case (3):
            return (d).otmp;
        case (4):
            break any;
        case (5):
            break wiztrap;
        case (6):
            { parse_label = "retry"; continue retry; }
    }
/*
     * Let wizards wish for traps and furniture.
     * Must come after objects check so wizards can still wish for
     * trap objects like beartraps.
     * Disallow such topology tweaks for WIZKIT startup wishes.
     */
    break retry;
    } // retry
    } // wiztrap
    if (Number(!!(Number(!!((C.flags).debug && Number(!((C.program_state).wizkit_wishing)))) && Number(!((d).oclass))))) {
/* [inline code moved to separate routine to unclutter readobjnam] */
        if (C.ptrCompare((((d).otmp = C.callLocal(wizterrainwish, d))), 0, "!=")) return (d).otmp;
    }
    if (Number(!!(Number(!((d).oclass)) && Number(!((d).typ))))) {
        if (Number(!(C.strncmpi((d).bp, C.literal("polearm"), 7)))) {
            ((d).typ = rnd_otyp_by_wpnskill(C.char(C.P_POLEARMS)));
            break typfnd;
        }
        else if (Number(!(C.strncmpi((d).bp, C.literal("hammer"), 6)))) {
            ((d).typ = rnd_otyp_by_wpnskill(C.char(C.P_HAMMER)));
            break typfnd;
        }
    }
    if (Number(!((d).oclass))) return (0);
    } // any
    if (Number(!((d).oclass))) ((d).oclass = C.deref(C.ptrAdd(C.wrpsym, (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("objnam.c"), 4996, C.literal("readobjnam")), C.rn2(C.int(BigInt(C.sizeof("const char[13]")))))) : C.rn2(C.int(BigInt(C.sizeof("const char[13]")))))), "const char"), "const char"));
    } // typfnd
    if ((d).typ) ((d).oclass = (C.deref(C.ptrAdd(C.objects, (d).typ, "struct objclass"), "struct objclass")).oc_class);
/* handle some objects that are only allowed in wizard mode */
    if (Number(!!((d).typ && Number(!((C.flags).debug))))) {
        switch ((d).typ) {
            case (C.AMULET_OF_YENDOR):
                ((d).typ = C.FAKE_AMULET_OF_YENDOR);
            break;
            case (C.CANDELABRUM_OF_INVOCATION):
                ((d).typ = rnd_class(C.TALLOW_CANDLE, C.WAX_CANDLE));
            break;
            case (C.BELL_OF_OPENING):
                ((d).typ = C.BELL);
            break;
            case (C.SPE_BOOK_OF_THE_DEAD):
                ((d).typ = C.SPE_BLANK_PAPER);
            break;
            case (C.MAGIC_LAMP):
                ((d).typ = C.OIL_LAMP);
            break;
            default:
/* catch any other non-wishable objects (venom) */
                if ((C.deref(C.ptrAdd(C.objects, (d).typ, "struct objclass"), "struct objclass")).oc_nowish) return 0;
            break;
        }
    }
/* if asking for corpse of a monster which leaves behind a glob, give
       glob instead of rejecting the monster type to create random corpse */
    if (Number(!!(Number(!!(Number((d).typ == C.CORPSE) && Number((d).mntmp >= C.LOW_PM))) && Number((C.deref(C.ptrAdd(C.mons, (d).mntmp, "struct permonst"), "struct permonst")).mlet == C.S_PUDDING)))) {
        ((d).typ = C.int((C.GLOB_OF_GRAY_OOZE + (C.int(((d).mntmp - C.PM_GRAY_OOZE))))));
        ((d).mntmp = C.NON_PM);
/* not used for globs */
    }
/*
     * Create the object, then fine-tune it.
     */
    ((d).otmp = (((d).typ) ? C.mksobj((d).typ, (C.char(1)), (C.char(0))) : C.mkobj((d).oclass, (C.char(0)))));
    (((d).typ = ((d).otmp).otyp), ((d).oclass = ((d).otmp).oclass));
/* what we actually got */
/* if player specified a reasonable count, maybe honor it;
       quantity for gold is handled elsewhere and d.cnt is 0 for it here */
    if (((d).otmp).globby) {
/* for globs, calculate weight based on gsize, then multiply by cnt;
           asking for 2 globs or for 2 small globs produces 1 small glob
           weighing 40au instead of normal 20au; asking for 5 medium globs
           might produce 1 very large glob weighing 600au */
        (((d).otmp).quan = 1n);
/* always 1 for globs */
        (((d).otmp).owt = C.uint(C.weight((d).otmp)));
/* gsize 0: unspecified => small;
           1: small (1..5) => keep default owt for 1, yielding 20;
           2: medium (6..15) => use weight for 6, yielding 120;
           3: large (16..25) => 320; 4: very large (26+) => 520 */
        if (Number((d).gsize > 1)) (((d).otmp).owt = C.uint((((d).otmp).owt + (C.uint((C.uint((C.int((5 + C.int(((C.int(((d).gsize - 2))) * 10)))))) * ((d).otmp).owt))))));
/* 20 + {5|15|25} times 20 */
/* limit overall weight which limits shrink-away time which in turn
           affects how long some of it will remain available to be eaten */
        if (Number((d).cnt > 1)) {
            let rn1cnt = (C.int(((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("objnam.c"), 5059, C.literal("readobjnam")), C.rn2(5))) : C.rn2(5))) + (2))));
/* 2..6 */
            if (Number(rn1cnt > C.int((6 - (d).gsize)))) (rn1cnt = C.int((6 - (d).gsize)));
            if (Number(!!(Number((d).cnt > rn1cnt) && (Number(!!(Number(!!(Number(!((C.flags).debug)) || (C.program_state).wizkit_wishing)) || Number(C.yn_function(C.literal("Override glob weight limit?"), C.ynchars, C.char(110), (C.char(1))) != 121))))))) ((d).cnt = rn1cnt);
            (((d).otmp).owt = C.uint((((d).otmp).owt * C.uint((d).cnt))));
        }
/* note: the owt assignment below will not change glob's weight */
        ((d).cnt = 0);
    }
    else if (Number((d).cnt > 0)) {
        if (Number(!!(C.int((C.deref(C.ptrAdd(C.objects, (d).typ, "struct objclass"), "struct objclass")).oc_merge) && (Number(!!(Number(!!(Number(!!((C.flags).debug || Number((d).cnt < (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("objnam.c"), 5077, C.literal("readobjnam")), C.rnd(6))) : C.rnd(6)))))) || (Number(!!(Number((d).cnt <= 7) && (Number(!!(Number(((d).otmp).otyp == C.TALLOW_CANDLE) || Number(((d).otmp).otyp == C.WAX_CANDLE))))))))) || (Number(!!(Number((d).cnt <= 20) && (Number(!!(Number(!!(Number(!!(Number((d).typ == C.ROCK) || Number((d).typ == C.FLINT))) || (Number(!!(Number(!!((Number(!!(Number(((d).otmp).oclass == C.WEAPON_CLASS) || Number(((d).otmp).oclass == C.TOOL_CLASS)))) && Number((C.deref(C.ptrAdd(C.objects, ((d).otmp).otyp, "struct objclass"), "struct objclass")).oc_subtyp >= C.int((-C.P_BOOMERANG))))) && Number((C.deref(C.ptrAdd(C.objects, ((d).otmp).otyp, "struct objclass"), "struct objclass")).oc_subtyp <= C.int((-C.P_DART)))))))) || (Number(!!(Number((d).oclass == C.WEAPON_CLASS) && (Number(!!(Number(!!((Number(!!(Number(((d).otmp).oclass == C.WEAPON_CLASS) || Number(((d).otmp).oclass == C.GEM_CLASS)))) && Number((C.deref(C.ptrAdd(C.objects, ((d).otmp).otyp, "struct objclass"), "struct objclass")).oc_subtyp >= C.int((-C.P_CROSSBOW))))) && Number((C.deref(C.ptrAdd(C.objects, ((d).otmp).otyp, "struct objclass"), "struct objclass")).oc_subtyp <= C.int((-C.P_BOW))))))))))))))))))))) /* quantity isn't restricted when debugging */
/* note: in normal play, explicitly asking for 1 might
                   fail the 'cnt < rnd(6)' test and could produce more
                   than 1 if mksobj() creates the item that way */
/* WEAPON_CLASS test excludes gems, gray stones */
        (((d).otmp).quan = C.long((d).cnt));
    }
    if (Number(!!((d).islit && (Number(!!(Number(!!(Number(!!(Number(!!(Number((d).typ == C.OIL_LAMP) || Number((d).typ == C.MAGIC_LAMP))) || Number((d).typ == C.BRASS_LANTERN))) || (Number(!!(Number(((d).otmp).otyp == C.TALLOW_CANDLE) || Number(((d).otmp).otyp == C.WAX_CANDLE)))))) || Number((d).typ == C.POT_OIL))))))) {
        C.place_object((d).otmp, (C.u).ux, (C.u).uy);
/* make it viable light source */
        C.begin_burn((d).otmp, (C.char(0)));
        C.obj_extract_self((d).otmp);
/* now release it for caller's use */
    }
    if (Number((d).spesgn == 0)) {
/* spe not specified; retain the randomly assigned value */
        ((d).spe = ((d).otmp).spe);
    }
    else if ((C.flags).debug) {
        ;
/* no restrictions except SPE_LIM */
    }
    else if (Number(!!(Number(!!(Number(!!(Number((d).oclass == C.ARMOR_CLASS) || Number((d).oclass == C.WEAPON_CLASS))) || (Number(!!(Number((((d).otmp)).oclass == C.TOOL_CLASS) && Number((C.deref(C.ptrAdd(C.objects, (((d).otmp)).otyp, "struct objclass"), "struct objclass")).oc_subtyp != C.P_NONE)))))) || (Number(!!(Number((d).oclass == C.RING_CLASS) && C.int((C.deref(C.ptrAdd(C.objects, (d).typ, "struct objclass"), "struct objclass")).oc_charged))))))) {
        if (Number(!!(Number((d).spe > (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("objnam.c"), 5102, C.literal("readobjnam")), C.rnd(5))) : C.rnd(5)))) && Number((d).spe > ((d).otmp).spe)))) ((d).spe = 0);
        if (Number(!!(Number((d).spe > 2) && Number((C.int(((C.u).uluck + (C.u).moreluck))) < 0)))) ((d).spesgn = C.int((-1)));
    }
    else {
/* crystal ball cancels like a wand, to (n:-1) */
        if (Number(!!(Number((d).oclass == C.WAND_CLASS) || Number((d).typ == C.CRYSTAL_BALL)))) {
            if (Number(!!(Number((d).spe > 1) && Number((d).spesgn == C.int((-1)))))) ((d).spe = 1);
        }
        else {
            if (Number(!!(Number((d).spe > 0) && Number((d).spesgn == C.int((-1)))))) ((d).spe = 0);
        }
        if (Number((d).spe > ((d).otmp).spe)) ((d).spe = ((d).otmp).spe);
    }
    if (Number((d).spesgn == C.int((-1)))) ((d).spe = C.int((-(d).spe)));
/* set otmp->spe.  This may, or may not, use d.spe... */
    switch ((d).typ) {
        case (C.TIN):
            (((d).otmp).spe = C.char(0));
/* default: not spinach */
        if (Number((d).contents == C.TIN_EMPTY)) {
            (((d).otmp).corpsenm = C.NON_PM);
        }
        else if (Number((d).contents == C.TIN_SPINACH)) {
            (((d).otmp).corpsenm = C.NON_PM);
            (((d).otmp).spe = C.char(1));
/* spinach after all */
        }
        break;
        case (C.TOWEL):
            if ((d).wetness) (((d).otmp).spe = C.char((d).wetness));
        break;
        case (C.SLIME_MOLD):
            (((d).otmp).spe = C.char((d).ftype));
        ;
/* FALLTHRU */
        case (C.SKELETON_KEY):
            case (C.CHEST):
                case (C.LARGE_BOX):
                    case (C.HEAVY_IRON_BALL):
                        case (C.IRON_CHAIN):
                            break;
        case (C.STATUE):
/* otmp->cobj already done in mksobj() */
            case (C.FIGURINE):
                case (C.CORPSE):
{
                        let P = ((((Number(!!(Number(((d).mntmp) >= C.LOW_PM) && Number(((d).mntmp) < C.NUMMONS)))))) ? C.ptrAdd(C.mons, (d).mntmp, "struct permonst") : 0);
                        (((d).otmp).spe = C.char(((Number(!(P))) ? C.CORPSTAT_RANDOM : (((Number((C.ulong((((P)).mflags2 & C.ulong(262144n)))) != C.ulong(0n)))) ? C.CORPSTAT_NEUTER : (((Number(!!(Number((d).mgend == C.FEMALE) && Number(!((Number((C.ulong((((P)).mflags2 & C.ulong(65536n)))) != C.ulong(0n))))))))) ? C.CORPSTAT_FEMALE : (((Number(!!(Number((d).mgend == C.MALE) && Number(!((Number((C.ulong((((P)).mflags2 & C.ulong(131072n)))) != C.ulong(0n))))))))) ? C.CORPSTAT_MALE : C.CORPSTAT_RANDOM))))));
/* if neuter, force neuter regardless of wish request */
/* not neuter, honor wish unless it conflicts */
/* unspecified or wish conflicts */
                        if (Number(!!(P && Number(((d).otmp).spe == C.CORPSTAT_RANDOM)))) (((d).otmp).spe = C.char((((Number((C.ulong((((P)).mflags2 & C.ulong(65536n)))) != C.ulong(0n)))) ? C.CORPSTAT_MALE : (((Number((C.ulong((((P)).mflags2 & C.ulong(131072n)))) != C.ulong(0n)))) ? C.CORPSTAT_FEMALE : (((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("objnam.c"), 5163, C.literal("readobjnam")), C.rn2(2))) : C.rn2(2)))) ? C.CORPSTAT_MALE : C.CORPSTAT_FEMALE)))));
                        if (Number(!!((d).ishistoric && Number((d).typ == C.STATUE)))) (((d).otmp).spe = C.char((((d).otmp).spe | C.CORPSTAT_HISTORIC)));
                        break;
                    }
        ;
/* scroll of mail:  0: delivered in-game via external event (or randomly
       for fake mail); 1: from bones or wishing; 2: written with marker */
        case (C.SCR_MAIL):
            (((d).otmp).spe = C.char(1));
        break;
/* splash of venom:  0: normal, and transitory; 1: wishing */
        case (C.ACID_VENOM):
            case (C.BLINDING_VENOM):
                (((d).otmp).spe = C.char(1));
        break;
        case (C.WAN_WISHING):
            if (Number(!((C.flags).debug))) {
                (((d).otmp).spe = C.char(((((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("objnam.c"), 5182, C.literal("readobjnam")), C.rn2(10))) : C.rn2(10)))) ? C.int((-1)) : 0))));
                break;
            }
        ;
/*FALLTHRU*/
        default:
            (((d).otmp).spe = C.char((d).spe));
    }
/* set otmp->corpsenm or dragon scale [mail] */
    if ((Number(!!(Number(((d).mntmp) >= C.LOW_PM) && Number(((d).mntmp) < C.NUMMONS))))) {
        let humanwere;
        if (Number((d).mntmp == C.PM_LONG_WORM_TAIL)) ((d).mntmp = C.PM_LONG_WORM);
/* werecreatures in beast form are all flagged no-corpse so for
           corpses and tins, switch to their corresponding human form;
           for figurines, override the can't-be-human restriction instead */
        if (Number(!!(Number(!!(Number(!!(Number((d).typ != C.FIGURINE) && (Number((C.ulong((((C.ptrAdd(C.mons, (d).mntmp, "struct permonst"))).mflags2 & C.ulong(4n)))) != C.ulong(0n))))) && Number((C.int(((C.deref(C.ptrAdd((C.svm).mvitals, (d).mntmp, "struct mvitals"), "struct mvitals")).mvflags & C.G_NOCORPSE))) != 0))) && Number(((humanwere = C.counter_were((d).mntmp))) != C.NON_PM)))) ((d).mntmp = humanwere);
        switch ((d).typ) {
            case (C.TIN):
                if (C.dead_species((d).mntmp, (C.char(0)))) {
                    (((d).otmp).corpsenm = C.NON_PM);
/* it's empty */
                }
                else if (Number(!!(Number(!!((Number(!!(Number(!((C.int(((C.deref(C.ptrAdd(C.mons, (d).mntmp, "struct permonst"), "struct permonst")).geno & C.G_UNIQ))))) || (C.flags).debug))) && Number(!((C.int(((C.deref(C.ptrAdd((C.svm).mvitals, (d).mntmp, "struct mvitals"), "struct mvitals")).mvflags & C.G_NOCORPSE))))))) && Number((C.deref(C.ptrAdd(C.mons, (d).mntmp, "struct permonst"), "struct permonst")).cnutrit != 0)))) {
                    (((d).otmp).corpsenm = (d).mntmp);
                }
            break;
            case (C.CORPSE):
                if (Number(!!((Number(!!(Number(!((C.int(((C.deref(C.ptrAdd(C.mons, (d).mntmp, "struct permonst"), "struct permonst")).geno & C.G_UNIQ))))) || (C.flags).debug))) && Number(!((C.int(((C.deref(C.ptrAdd((C.svm).mvitals, (d).mntmp, "struct mvitals"), "struct mvitals")).mvflags & C.G_NOCORPSE)))))))) {
                    if (Number((C.deref(C.ptrAdd(C.mons, (d).mntmp, "struct permonst"), "struct permonst")).msound == C.MS_GUARDIAN)) ((d).mntmp = C.genus((d).mntmp, 1));
                    C.set_corpsenm((d).otmp, (d).mntmp);
                }
            if (Number(!!((d).zombify && C.zombie_form(C.ptrAdd(C.mons, (d).mntmp, "struct permonst"))))) {
                C.start_timer(C.long((C.int(((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("objnam.c"), 5223, C.literal("readobjnam")), C.rn2(5))) : C.rn2(5))) + (10))))), C.short(C.TIMER_OBJECT), C.short(C.ZOMBIFY_MON), C.obj_to_any((d).otmp));
            }
            break;
            case (C.EGG):
                ((d).mntmp = C.can_be_hatched((d).mntmp));
/* this also sets hatch timer if appropriate */
            C.set_corpsenm((d).otmp, (d).mntmp);
            break;
            case (C.FIGURINE):
                if (Number(!!(Number(!!(Number(!((C.int(((C.deref(C.ptrAdd(C.mons, (d).mntmp, "struct permonst"), "struct permonst")).geno & C.G_UNIQ))))) && (Number(!!(Number(!((Number((C.ulong((((C.ptrAdd(C.mons, (d).mntmp, "struct permonst"))).mflags2 & C.ulong(8n)))) != C.ulong(0n))))) || (Number((C.ulong((((C.ptrAdd(C.mons, (d).mntmp, "struct permonst"))).mflags2 & C.ulong(4n)))) != C.ulong(0n)))))))) && Number((d).mntmp != C.PM_MAIL_DAEMON)))) (((d).otmp).corpsenm = (d).mntmp);
            break;
            case (C.STATUE):
                (((d).otmp).corpsenm = (d).mntmp);
            if (Number(!!((C.ptrCompare((((d).otmp)).cobj, 0, "!=")) && (Number(((C.ptrAdd(C.mons, (d).mntmp, "struct permonst"))).msize < 1))))) C.delete_contents((d).otmp);
/* no spellbook */
            break;
            case (C.SCALE_MAIL):
/* Dragon mail - depends on the order of objects & dragons. */
                if (Number(!!(Number((d).mntmp >= C.PM_GRAY_DRAGON) && Number((d).mntmp <= C.PM_YELLOW_DRAGON)))) (((d).otmp).otyp = C.short(C.int((C.int((C.GRAY_DRAGON_SCALE_MAIL + (d).mntmp)) - C.PM_GRAY_DRAGON))));
            break;
        }
    }
/* set blessed/cursed -- setting the fields directly is safe
     * since weight() is called below and addinv() will take care
     * of luck */
    if ((d).iscursed) {
        C.curse((d).otmp);
    }
    else if ((d).uncursed) {
        (((d).otmp).blessed = C.uint(0));
        (((d).otmp).cursed = C.uint((Number(!!(Number((C.int(((C.u).uluck + (C.u).moreluck))) < 0) && Number(!((C.flags).debug)))))));
    }
    else if ((d).blessed) {
        (((d).otmp).blessed = C.uint((Number(!!(Number((C.int(((C.u).uluck + (C.u).moreluck))) >= 0) || (C.flags).debug)))));
        (((d).otmp).cursed = C.uint((Number(!!(Number((C.int(((C.u).uluck + (C.u).moreluck))) < 0) && Number(!((C.flags).debug)))))));
    }
    else if (Number((d).spesgn < 0)) {
        C.curse((d).otmp);
    }
/* set eroded and erodeproof */
    if (erosion_matters((d).otmp)) {
/* wished-for item shouldn't be eroded unless specified */
        (((d).otmp).oeroded = (((d).otmp).oeroded2 = C.uint(0)));
        if (Number(!!((d).eroded && (Number(!!(Number(!!(C.is_flammable((d).otmp) || (Number(C.int((C.deref(C.ptrAdd(C.objects, ((d).otmp).otyp, "struct objclass"), "struct objclass")).oc_material) == C.IRON)))) || (Number(!!(Number(C.int((C.deref(C.ptrAdd(C.objects, (((d).otmp)).otyp, "struct objclass"), "struct objclass")).oc_material) == C.GLASS) && Number((((d).otmp)).oclass == C.ARMOR_CLASS)))))))))) (((d).otmp).oeroded = C.uint((d).eroded));
        if (Number(!!((d).eroded2 && (Number(!!((Number(!!(Number(C.int((C.deref(C.ptrAdd(C.objects, ((d).otmp).otyp, "struct objclass"), "struct objclass")).oc_material) == C.COPPER) || Number(C.int((C.deref(C.ptrAdd(C.objects, ((d).otmp).otyp, "struct objclass"), "struct objclass")).oc_material) == C.IRON)))) || C.is_rottable((d).otmp))))))) (((d).otmp).oeroded2 = C.uint((d).eroded2));
/*
         * 3.6.1: earlier versions included `&& !eroded && !eroded2' here,
         * but damageproof combined with damaged is feasible (eroded
         * armor modified by confused reading of cursed destroy armor)
         * so don't prevent player from wishing for such a combination.
         */
        if (Number(!!((d).erodeproof && (Number(!!((Number(!!(Number(!!(Number(!!(Number(!!((Number(C.int((C.deref(C.ptrAdd(C.objects, ((d).otmp).otyp, "struct objclass"), "struct objclass")).oc_material) == C.IRON)) || C.is_flammable((d).otmp))) || C.is_rottable((d).otmp))) || (Number(!!(Number(C.int((C.deref(C.ptrAdd(C.objects, ((d).otmp).otyp, "struct objclass"), "struct objclass")).oc_material) == C.COPPER) || Number(C.int((C.deref(C.ptrAdd(C.objects, ((d).otmp).otyp, "struct objclass"), "struct objclass")).oc_material) == C.IRON)))))) || (Number(!!(Number(C.int((C.deref(C.ptrAdd(C.objects, (((d).otmp)).otyp, "struct objclass"), "struct objclass")).oc_material) == C.GLASS) && Number((((d).otmp)).oclass == C.ARMOR_CLASS))))))) || Number(((d).otmp).otyp == C.CRYSKNIFE))))))) (((d).otmp).oerodeproof = C.uint((Number(!!(Number((C.int(((C.u).uluck + (C.u).moreluck))) >= 0) || (C.flags).debug)))));
    }
/* set otmp->recharged */
    if (Number((d).oclass == C.WAND_CLASS)) {
/* prevent wishing abuse */
        if (Number(!!(Number(((d).otmp).otyp == C.WAN_WISHING) && Number(!((C.flags).debug))))) ((d).rechrg = 1);
        (((d).otmp).recharged = C.uint((d).rechrg));
    }
/* set poisoned */
    if ((d).ispoisoned) {
        if ((Number(!!((Number(!!(Number(!!(Number(((d).otmp).oclass == C.WEAPON_CLASS) && Number((C.deref(C.ptrAdd(C.objects, ((d).otmp).otyp, "struct objclass"), "struct objclass")).oc_subtyp >= C.int((-C.P_SHURIKEN))))) && Number((C.deref(C.ptrAdd(C.objects, ((d).otmp).otyp, "struct objclass"), "struct objclass")).oc_subtyp <= C.int((-C.P_BOW)))))) || C.permapoisoned((d).otmp))))) (((d).otmp).opoisoned = C.uint((Number((C.int(((C.u).uluck + (C.u).moreluck))) >= 0))));
        else if (Number((d).oclass == C.FOOD_CLASS)) /* try to taint by making it as old as possible */
        (((d).otmp).age = 1n);
    }
/* and [un]trapped */
    if ((d).trapped) {
        if (Number(!!((Number(!!(Number((((d).otmp)).otyp == C.LARGE_BOX) || Number((((d).otmp)).otyp == C.CHEST)))) || Number((d).typ == C.TIN)))) (((d).otmp).otrapped = C.uint((Number((d).trapped == 1))));
    }
/* empty for containers rather than for tins */
    if (Number((d).contents == C.TIN_EMPTY)) {
        if (Number(!!(Number(((d).otmp).otyp == C.BAG_OF_TRICKS) || Number(((d).otmp).otyp == C.HORN_OF_PLENTY)))) {
            if (Number(((d).otmp).spe > 0)) (((d).otmp).spe = C.char(0));
        }
        else if ((C.ptrCompare((((d).otmp)).cobj, 0, "!="))) {
/* this assumes that artifacts can't be randomly generated
               inside containers */
            C.delete_contents((d).otmp);
            (((d).otmp).owt = C.uint(C.weight((d).otmp)));
        }
    }
/* set locked/unlocked/broken */
    if ((Number(!!(Number((((d).otmp)).otyp == C.LARGE_BOX) || Number((((d).otmp)).otyp == C.CHEST))))) {
        if ((d).locked) {
            ((((d).otmp).olocked = C.uint(1)), (((d).otmp).obroken = C.uint(0)));
        }
        else if ((d).unlocked) {
            ((((d).otmp).olocked = C.uint(0)), (((d).otmp).obroken = C.uint(0)));
        }
        else if ((d).broken) {
            ((((d).otmp).olocked = C.uint(0)), (((d).otmp).obroken = C.uint(1)));
        }
        if (((d).otmp).obroken) (((d).otmp).otrapped = C.uint(0));
    }
    if ((d).isgreased) (((d).otmp).greased = C.uint(1));
    if (Number(!!((d).isdiluted && Number(((d).otmp).oclass == C.POTION_CLASS)))) (((d).otmp).odiluted = C.uint((Number(((d).otmp).otyp != C.POT_WATER))));
/* set tin variety */
    if (Number(!!(Number(!!(Number(((d).otmp).otyp == C.TIN) && Number((d).tvariety >= 0))) && (Number(!!((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("objnam.c"), 5343, C.literal("readobjnam")), C.rn2(4))) : C.rn2(4))) || (C.flags).debug)))))) C.set_tin_variety((d).otmp, (d).tvariety);
    if ((d).name) {
        let aname;
        let novelname;
        const objtyp = C.scalarLocal("short");
/* an artifact name might need capitalization fixing */
        (aname = C.artifact_name((d).name, objtyp, (C.char(1))));
        if (Number(!!(aname && Number(objtyp.value == ((d).otmp).otyp)))) ((d).name = aname);
/* 3.6 tribute - fix up novel */
        if (Number(!!(Number(((d).otmp).otyp == C.SPE_NOVEL) && C.ptrCompare(((novelname = C.lookup_novel((d).name, C.fieldRef((d).otmp, "novelidx")))), 0, "!=")))) ((d).name = novelname);
        ((d).otmp = C.oname((d).otmp, (d).name, C.ONAME_WISH));
/* name==aname => wished for artifact (otmp->oartifact => got it) */
        if (Number(!!(((d).otmp).oartifact || C.ptrCompare((d).name, aname, "==")))) {
            (((d).otmp).quan = 1n);
            C.bump(C.fieldRef((C.u).uconduct, "wisharti"), 1, true, "long");
/* KMH, conduct */
        }
    }
    if (C.permapoisoned((d).otmp)) (((d).otmp).opoisoned = C.uint(1));
/* more wishing abuse: don't allow wishing for certain artifacts */
/* and make them pay; charge them for the wish anyway! */
    if (Number(!!((Number(!!(C.is_quest_artifact((d).otmp) || (Number(!!(((d).otmp).oartifact && Number((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("objnam.c"), 5374, C.literal("readobjnam")), C.rn2(C.nartifact_exist()))) : C.rn2(C.nartifact_exist()))) > 1))))))) && Number(!((C.flags).debug))))) {
        C.artifact_exists((d).otmp, C.safe_oname((d).otmp), (C.char(0)), C.ONAME_NO_FLAGS);
        C.obfree((d).otmp, 0);
        ((d).otmp = C.hands_obj);
        C.pline(C.literal("For a moment, you feel %s in your %s, but it disappears!"), (C.c_common_strings).c_something, makeplural(C.body_part(C.HAND)), "pp");
        return (d).otmp;
    }
    if (Number(!!((d).halfeaten && Number(((d).otmp).oclass == C.FOOD_CLASS)))) {
        let nut = C.obj_nutrition((d).otmp);
/* do this adjustment before setting up object's weight; skip
           "partly eaten" for food with 0 nutrition (wraith corpse) or for
           anything that couldn't take more than one bite (1 nutrition;
           ought to check for one-bite instead but that's complicated) */
        if (Number(nut > C.uint(1))) {
            (((d).otmp).oeaten = nut);
            C.consume_oeaten((d).otmp, 1);
        }
    }
    (((d).otmp).owt = C.uint(C.weight((d).otmp)));
    if (Number(!!((d).very && Number(((d).otmp).otyp == C.HEAVY_IRON_BALL)))) (((d).otmp).owt = C.uint((((d).otmp).owt + C.uint(C.WT_IRON_BALL_INCR))));
    return (d).otmp;
}

export function rnd_class(first, last) {
    first = C.argument(first, "int");
    last = C.argument(last, "int");
    let i;
    let x;
    let sum = 0;
    if (Number(last > first)) {
        for ((i = first); Number(i <= last); (i++)) (sum = C.int((sum + (C.deref(C.ptrAdd(C.objects, i, "struct objclass"), "struct objclass")).oc_prob)));
        if (Number(!(sum))) /* all zero, so equal probability */
        return (C.int(((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("objnam.c"), 5411, C.literal("rnd_class")), C.rn2(C.int((C.int((last - first)) + 1))))) : C.rn2(C.int((C.int((last - first)) + 1))))) + (first))));
        (x = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("objnam.c"), 5413, C.literal("rnd_class")), C.rnd(sum))) : C.rnd(sum))));
        for ((i = first); Number(i <= last); (i++)) if (Number(((x = C.int((x - (C.deref(C.ptrAdd(C.objects, i, "struct objclass"), "struct objclass")).oc_prob)))) <= 0)) return i;
    }
    return (((Number(first == last))) ? first : C.STRANGE_OBJECT);
}

export function Japanese_item_name(i, ordinaryname) {
    i = C.argument(i, "int");
    ordinaryname = C.argument(ordinaryname, "const char *");
    let j = C.Japanese_items;
    while ((j).item) {
        if (Number(i == (j).item)) return (j).name;
        ((j = C.ptrAdd(j, 1, "struct Jitem")), C.ptrAdd(j, -1, "struct Jitem"));
    }
    return ordinaryname;
}

export function armor_simple_name(armor) {
    armor = C.argument(armor, "struct obj *");
    let result = 0;
    let armcat = C.uint((C.deref(C.ptrAdd(C.objects, (armor).otyp, "struct objclass"), "struct objclass")).oc_armcat);
    switch (armcat) {
        case C.uint((C.ARM_SUIT)):
            (result = suit_simple_name(armor));
        break;
        case C.uint((C.ARM_CLOAK)):
            (result = cloak_simple_name(armor));
        break;
        case C.uint((C.ARM_HELM)):
            (result = helm_simple_name(armor));
        break;
        case C.uint((C.ARM_GLOVES)):
            (result = C.callLocal(gloves_simple_name, armor));
        break;
        case C.uint((C.ARM_BOOTS)):
            (result = C.callLocal(boots_simple_name, armor));
        break;
        case C.uint((C.ARM_SHIELD)):
            (result = shield_simple_name(armor));
        break;
        case C.uint((C.ARM_SHIRT)):
            (result = shirt_simple_name(armor));
        break;
        default:
            (result = simpleonames(armor));
        C.impossible(C.literal("unknown armor category (%s => %u)"), result, armcat, "pu");
        break;
    }
    return result;
}

export function suit_simple_name(suit) {
    suit = C.argument(suit, "struct obj *");
    let suitnm;
    let esuitp;
    if (suit) {
        if ((Number(!!(Number(((suit)).otyp >= C.GRAY_DRAGON_SCALE_MAIL) && Number(((suit)).otyp <= C.YELLOW_DRAGON_SCALE_MAIL))))) return C.literal("dragon mail");
        else /* <color> dragon scale mail */
        if ((Number(!!(Number(((suit)).otyp >= C.GRAY_DRAGON_SCALES) && Number(((suit)).otyp <= C.YELLOW_DRAGON_SCALES))))) return C.literal("dragon scales");
        (suitnm = ((C.deref(C.ptrAdd(C.obj_descr, ((C.deref(C.ptrAdd(C.objects, (suit).otyp, "struct objclass"), "struct objclass"))).oc_name_idx, "struct objdescr"), "struct objdescr")).oc_name));
        (esuitp = C.eos(suitnm));
        if (Number(!!(Number(C.strlen(suitnm) > C.ulong(5)) && Number(!(C.strcmp(C.ptrAdd(esuitp, -(5), "const char"), C.literal(" mail"))))))) return C.literal("mail");
        else /* most suits fall into this category */
        if (Number(!!(Number(C.strlen(suitnm) > C.ulong(7)) && Number(!(C.strcmp(C.ptrAdd(esuitp, -(7), "const char"), C.literal(" jacket"))))))) return C.literal("jacket");
/* leather jacket */
    }
/* "suit" is lame but "armor" is ambiguous and "body armor" is absurd */
    return C.literal("suit");
}

export function cloak_simple_name(cloak) {
    cloak = C.argument(cloak, "struct obj *");
    if (cloak) {
        switch ((cloak).otyp) {
            case (C.ROBE):
                return C.literal("robe");
            case (C.MUMMY_WRAPPING):
                return C.literal("wrapping");
            case (C.ALCHEMY_SMOCK):
                return (((Number(!!(C.int((C.deref(C.ptrAdd(C.objects, (cloak).otyp, "struct objclass"), "struct objclass")).oc_name_known) && C.int((cloak).dknown))))) ? C.literal("smock") : C.literal("apron"));
            default:
                break;
        }
    }
    return C.literal("cloak");
}

/* helm vs hat for messages */
export function helm_simple_name(helmet) {
    helmet = C.argument(helmet, "struct obj *");
/*
     *  There is some wiggle room here; the result has been chosen
     *  for consistency with the "protected by hard helmet" messages
     *  given for various bonks on the head:  headgear that provides
     *  such protection is a "helm", that which doesn't is a "hat".
     *
     *      elven leather helm / leather hat    -> hat
     *      dwarvish iron helm / hard hat       -> helm
     *  The rest are completely straightforward:
     *      fedora, cornuthaum, dunce cap       -> hat
     *      all other types of helmets          -> helm
     */
    return ((Number(!(C.hard_helmet(helmet)))) ? C.literal("hat") : C.literal("helm"));
}

/* gloves vs gauntlets; depends upon discovery state */
export function gloves_simple_name(gloves) {
    gloves = C.argument(gloves, "struct obj *");
    C.declareStatic("gloves_simple_name.gauntlets", "const char[10]", C.literal("gauntlets"));
    if (Number(!!(gloves && C.int((gloves).dknown)))) {
        let otyp = (gloves).otyp;
        let ocl = C.ptrAdd(C.objects, otyp, "struct objclass");
        let actualn = ((C.deref(C.ptrAdd(C.obj_descr, ((C.deref(ocl, "struct objclass"))).oc_name_idx, "struct objdescr"), "struct objdescr")).oc_name);
        let descrpn = ((C.deref(C.ptrAdd(C.obj_descr, ((C.deref(ocl, "struct objclass"))).oc_descr_idx, "struct objdescr"), "struct objdescr")).oc_descr);
        if (C.strstri(((C.int((C.deref(C.ptrAdd(C.objects, otyp, "struct objclass"), "struct objclass")).oc_name_known)) ? actualn : descrpn), C.staticCell("gloves_simple_name.gauntlets").value)) return C.staticCell("gloves_simple_name.gauntlets").value;
    }
    return C.literal("gloves");
}

/* boots vs shoes; depends upon discovery state */
export function boots_simple_name(boots) {
    boots = C.argument(boots, "struct obj *");
    C.declareStatic("boots_simple_name.shoes", "const char[6]", C.literal("shoes"));
    if (Number(!!(boots && C.int((boots).dknown)))) {
        let otyp = (boots).otyp;
        let ocl = C.ptrAdd(C.objects, otyp, "struct objclass");
        let actualn = ((C.deref(C.ptrAdd(C.obj_descr, ((C.deref(ocl, "struct objclass"))).oc_name_idx, "struct objdescr"), "struct objdescr")).oc_name);
        let descrpn = ((C.deref(C.ptrAdd(C.obj_descr, ((C.deref(ocl, "struct objclass"))).oc_descr_idx, "struct objdescr"), "struct objdescr")).oc_descr);
        if (Number(!!(C.strstri(descrpn, C.staticCell("boots_simple_name.shoes").value) || (Number(!!(C.int((C.deref(C.ptrAdd(C.objects, otyp, "struct objclass"), "struct objclass")).oc_name_known) && C.strstri(actualn, C.staticCell("boots_simple_name.shoes").value))))))) return C.staticCell("boots_simple_name.shoes").value;
    }
    return C.literal("boots");
}

/* simplified shield for messages */
export function shield_simple_name(shield) {
    shield = C.argument(shield, "struct obj *");
    if (shield) {
/* xname() describes unknown (unseen) reflection as smooth */
        if (Number((shield).otyp == C.SHIELD_OF_REFLECTION)) return ((C.int((shield).dknown)) ? C.literal("silver shield") : C.literal("smooth shield"));
/*
         * We might distinguish between wooden vs metallic or
         * light vs heavy to give small benefit to spell casters.
         * Fighter types probably care more about the former for
         * vulnerability to fire or rust.
         *
         * We could do that both ways: light wooden shield, light
         * metallic shield (there aren't any), heavy wooden shield,
         * and heavy metallic shield but that's getting away from
         * "simple name" which is intended to be shorter as well
         * as less detailed than xname().
         */
/* spellcasting uses a division like this */
// Configured-inactive #if 0 source:
// return (weight(shield) > (int) objects[SMALL_SHIELD].oc_weight)
//        ? "heavy shield" : "light shield";
    }
    return C.literal("shield");
}

/* for completeness */
export function shirt_simple_name(shirt) {
    shirt = C.argument(shirt, "struct obj *");
    return C.literal("shirt");
}

export function mimic_obj_name(mtmp) {
    mtmp = C.argument(mtmp, "struct monst *");
    if (Number((C.int((((mtmp)).m_ap_type & 7))) == C.M_AP_OBJECT)) {
        if (Number((mtmp).mappearance == C.uint(C.GOLD_PIECE))) return C.literal("gold");
        if (Number((mtmp).mappearance != C.uint(C.STRANGE_OBJECT))) return simple_typename(C.int((mtmp).mappearance));
    }
    return C.literal("whatcha-may-callit");
}

/*
 * Construct a query prompt string, based around an object name, which is
 * guaranteed to fit within [QBUFSZ].  Takes an optional prefix, three
 * choices for filling in the middle (two object formatting functions and a
 * last resort literal which should be very short), and an optional suffix.
 */
export function safe_qbuf(qbuf, qprefix, qsuffix, obj, func, altfunc, lastR) /* output buffer */
{
    qbuf = C.argument(qbuf, "char *");
    qprefix = C.argument(qprefix, "const char *");
    qsuffix = C.argument(qsuffix, "const char *");
    obj = C.argument(obj, "struct obj *");
    func = C.argument(func, "char *(*)(struct obj *)");
    altfunc = C.argument(altfunc, "char *(*)(struct obj *)");
    lastR = C.argument(lastR, "const char *");
    let bufp;
    let endp;
/* convert size_t (or int for ancient systems) to ordinary unsigned */
    let len;
    let lenlimit;
    let len_qpfx = C.uint((((qprefix) ? C.strlen(qprefix) : C.ulong(0))));
    let len_qsfx = C.uint((((qsuffix) ? C.strlen(qsuffix) : C.ulong(0))));
    let len_lastR = C.uint(C.strlen(lastR));
    (lenlimit = C.uint(C.int((C.QBUFSZ - 1))));
    (endp = C.ptrAdd(qbuf, lenlimit, "char"));
    ((Number(!!((C.ptrCompare(endp, C.castPointer((0), "char *"), "!=")) || ((C.__assert_fail(C.literal("endp != NULL"), C.literal("objnam.c"), 5642, C.literal("safe_qbuf")), 0))))));
/* workaround for static analyzer issue */
/* sanity check, aimed mainly at paniclog (it's conceivable for
       the result of short_oname() to be shorter than the length of
       the last resort string, but we ignore that possibility here) */
    if (Number(len_qpfx > lenlimit)) C.impossible(C.literal("safe_qbuf: prefix too long (%u characters)."), len_qpfx, "u");
    else if (Number(C.uint((len_qpfx + len_qsfx)) > lenlimit)) C.impossible(C.literal("safe_qbuf: suffix too long (%u + %u characters)."), len_qpfx, len_qsfx, "uu");
    else if (Number(C.uint((C.uint((len_qpfx + len_lastR)) + len_qsfx)) > lenlimit)) C.impossible(C.literal("safe_qbuf: filler too long (%u + %u + %u characters)."), len_qpfx, len_lastR, len_qsfx, "uuu");
/* the output buffer might be the same as the prefix if caller
       has already partially filled it */
    if (C.ptrCompare(qbuf, C.castPointer(qprefix, "char *"), "==")) {
/* prefix is already in the buffer */
        C.store(endp, "char", C.char(0));
    }
    else if (qprefix) {
/* put prefix into the buffer */
        C.strncpy(qbuf, qprefix, C.ulong(lenlimit));
        C.store(endp, "char", C.char(0));
    }
    else {
/* no prefix; output buffer starts out empty */
        C.store(C.ptrAdd(qbuf, 0, "char"), "char", C.char(0));
    }
    (len = C.uint(C.strlen(qbuf)));
    if (Number(C.uint((C.uint((len + len_lastR)) + len_qsfx)) > lenlimit)) {
/* too long; skip formatting, last resort output is truncated */
        if (Number(len < lenlimit)) {
            C.strncpy(C.ptrAdd(qbuf, len, "char"), lastR, C.ulong(C.uint((lenlimit - len))));
            C.store(endp, "char", C.char(0));
            (len = C.uint(C.strlen(qbuf)));
            if (Number(!!(qsuffix && Number(len < lenlimit)))) {
                C.strncpy(C.ptrAdd(qbuf, len, "char"), qsuffix, C.ulong(C.uint((lenlimit - len))));
                C.store(endp, "char", C.char(0));
/* len = (unsigned) strlen(qbuf); */
            }
        }
    }
    else {
/* suffix and last resort are guaranteed to fit */
        (len = C.uint((len + len_qsfx)));
/* include the pending suffix */
/* format the object */
        (bufp = C.callLocal(short_oname, obj, func, altfunc, C.uint((lenlimit - len))));
        if (Number(C.ulong((C.ulong(len) + C.strlen(bufp))) <= C.ulong(lenlimit))) C.strcat(qbuf, bufp);
        else /* formatted name fits */
        C.strcat(qbuf, lastR);
/* use last resort */
        releaseobuf(bufp);
        if (qsuffix) C.strcat(qbuf, qsuffix);
    }
/* assert( strlen(qbuf) < QBUFSZ ); */
    return qbuf;
}

/*objnam.c*/
