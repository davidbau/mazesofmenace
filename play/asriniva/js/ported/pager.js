/* NetHack 5.0	pager.c	$NHDT-Date: 1774846177 2026/03/29 20:49:37 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.296 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2018. */
/* NetHack may be freely redistributed.  See license for details. */

/*
 * This file contains the command routines dowhatis() and dohelp() and
 * a few other help related facilities such as data.base lookup.
 */


import { C } from './c-runtime.js';

const checkfileflags = {
    chkfilNone: 0,
    chkfilUsrTyped: 1,
    chkfilDontAsk: 2,
    chkfilIaCheck: 4,
};
const {chkfilNone,chkfilUsrTyped,chkfilDontAsk,chkfilIaCheck}=checkfileflags;

 /* for clairvoyance */

/* Returns "true" for characters that could represent a monster's stomach. */
export function is_swallow_sym(c)
{
    let i;

    for (i = C.S_sw_tl; i <= C.S_sw_br; i++)
        if (C.gs.showsyms[i] == c)
            return C.TRUE;
    return C.FALSE;
}

/* Append " or "+new_str to the end of buf if new_str doesn't already exist
   as a substring of buf.  Return 1 if the string was appended, 0 otherwise.
   It is expected that buf is of size BUFSZ. */
export function append_str(buf, new_str)
{
    const sep = C.staticString("append_str.sep", " or ");
    let oldlen, space_left;

    if (C.strstri(buf, new_str))
        return 0; /* already present */

    oldlen = C.strlen(buf);
    if (oldlen >= C.BUFSZ - 1) {
        if (oldlen > C.BUFSZ - 1)
            C.impossible("append_str: 'buf' contains %lu characters.",
                       BigInt(oldlen));
        return 0; /* no space available */
    }

    /* some space available, but not necessarily enough for full append */
    space_left = C.BUFSZ - 1 - oldlen;  /* space remaining in buf */
    C.strncat(buf, sep, space_left);
    if (space_left > (5) - 1)
        C.strncat(buf, new_str, space_left - ((5) - 1));
    return 1; /* something was appended, possibly just part of " or " */
}

/* shared by monster probing (via query_objlist!) as well as lookat() */
export function self_lookat(outbuf)
{
    const race = C.automaticBuffer("self_lookat.race", C.QBUFSZ); const trapbuf = C.automaticBuffer("self_lookat.trapbuf", C.QBUFSZ);

    /* include race with role unless polymorphed */
    C.storeCharAt(race, 0, 0);
    if (!C.Upolyd)
        C.Sprintf(race, "%s ", C.gu.urace.adj);
    C.Sprintf(outbuf, "%s%s%s called %s",
            /* being blinded may hide invisibility from self */
            (C.Invis && (C.senseself() || !C.Blind)) ? "invisible " : "", race,
            C.pmname(C.mons[C.u.umonnum], C.Ugender), C.svp.plname);
    if (C.u.usteed)
        C.Sprintf(C.eos(outbuf), ", mounted on %s", C.y_monnam(C.u.usteed));
    if (C.u.uundetected || (C.Upolyd && C.U_AP_TYPE)
        || C.visible_region_at(C.u.ux, C.u.uy))
        C.callLocal(mhidden_description, C.gy.youmonst,
                            C.MHID_PREFIX | C.MHID_ARTICLE | C.MHID_REGION,
                            C.eos(outbuf));
    if (C.Punished)
        C.Sprintf(C.eos(outbuf), ", chained to %s",
                C.uball ? C.ansimpleoname(C.uball) : "nothing?");
    if (C.u.utrap) /* bear trap, pit, web, in-floor, in-lava, tethered */
        C.Sprintf(C.eos(outbuf), ", %s", C.trap_predicament(trapbuf, 0, C.FALSE));
    return outbuf;
}

/* format a description of 'mon's health for look_at_monster(), done_in_by();
   result isn't Healer-specific (not trained for arbitrary creatures) */
export function monhealthdescr(mon, addspace, outbuf)
{


















    C.nhUse(mon);
    C.nhUse(addspace);
    C.storeCharAt(outbuf, 0);

    return outbuf;
}

/* copy a trap's description into outbuf[] */
export function trap_description(outbuf, tnum, x, y)
{
    /*
     * Trap detection used to display a bear trap at locations having
     * a trapped door or trapped container or both.  They're semi-real
     * traps now (defined trap types but not part of ftrap chain).
     */
    if (C.trapped_chest_at(tnum, x, y))
        C.Strcpy(outbuf, "trapped chest"); /* might actually be a large box */
    else if (C.trapped_door_at(tnum, x, y))
        C.Strcpy(outbuf, "trapped door"); /* not "trap door"... */
    else
        C.Strcpy(outbuf, C.trapname(tnum, C.FALSE));
    return;
}

/* describe a hidden monster; used for look_at during extended monster
   detection and for probing; also when looking at self and camera feedback */
export function mhidden_description(mon, mhid_flags, outbuf)
/* hidden monster to describe */
/* controls optional aspects of description */
/* output buffer */
{
    const otmp = C.cell("object");
    let what;
    let reg;
    let buflen;
    let incl_prefix = (mhid_flags & C.MHID_PREFIX) != 0,
            incl_article = (mhid_flags & C.MHID_ARTICLE) != 0,
            show_altmon = (mhid_flags & C.MHID_ALTMON) != 0,
            force_region = (mhid_flags & C.MHID_REGION) != 0;
    let fakeobj, isyou = (mon == C.gy.youmonst);
    let x = C.short(isyou ? C.u.ux : mon.mx), y = C.short(isyou ? C.u.uy : mon.my);
    let glyph = (C.svl.level.flags.hero_memory && !isyou) ? C.levl[x][y].glyph
                                                       : C.glyph_at(x, y);

    C.storeCharAt(outbuf, 0);
    objfrommap: for (let objfrommap_jump = false; ; objfrommap_jump = true) {
    if (objfrommap_jump || C.M_AP_TYPE(mon) == C.M_AP_FURNITURE
        || C.M_AP_TYPE(mon) == C.M_AP_OBJECT) {
        if (!objfrommap_jump && incl_prefix)
            C.Strcpy(outbuf, ", mimicking ");
        if (!objfrommap_jump && C.M_AP_TYPE(mon) == C.M_AP_FURNITURE) {
            what = C.defsyms[mon.mappearance].explanation;
            if (incl_article)
                what = C.an(what);
            C.Strcat(outbuf, what);
        } else if (objfrommap_jump || (C.M_AP_TYPE(mon) == C.M_AP_OBJECT
                   /* remembered glyph, not glyph_at() which is 'mon' */
                   && C.glyph_is_object(glyph))) {
            otmp.value = 0;
            fakeobj = C.callLocal(object_from_map, glyph, x, y, otmp);
            what = (otmp.value && otmp.value.otyp != C.STRANGE_OBJECT)
                   ? C.simpleonames(otmp.value)
                   : C.obj_descr[C.STRANGE_OBJECT].oc_name;
            if (incl_article && (!otmp.value || otmp.value.quan == 1n))
                what = C.an(what);
            C.Strcat(outbuf, what);

            if (fakeobj && otmp.value) {
                otmp.value.where = C.OBJ_FREE; /* object_from_map set to OBJ_FLOOR */
                C.dealloc_obj(otmp.value); /* has no contents */
            }
        } else {
            C.Strcat(outbuf, C.something);
        }
    } else if (C.M_AP_TYPE(mon) == C.M_AP_MONSTER) {
        if (show_altmon) {
            if (incl_prefix)
                C.Strcat(outbuf, ", masquerading as ");
            what = C.pmname(C.mons[mon.mappearance], C.Mgender(mon));
            if (incl_prefix)
                what = C.an(what);
            C.Strcat(outbuf, what);
        }
    } else if (isyou ? C.u.uundetected : mon.mundetected) {
        C.Strcpy(outbuf, ", hiding");
        if (C.hides_under(mon.data)) {
            C.Strcat(outbuf, " under ");
            /* remembered glyph, not glyph_at() which is 'mon' */
            if (C.glyph_is_object(glyph))
                continue objfrommap;
            C.Strcat(outbuf, C.something);
        } else if (C.is_hider(mon.data)) {
            C.Sprintf(C.eos(outbuf), " on the %s",
                    C.ceiling_hider(mon.data) ? "ceiling"
                       : C.surface(x, y)); /* trapper */
        } else {
            if (mon.data.mlet == C.S_EEL && C.is_pool(x, y))
                C.Strcat(outbuf, " in murky water");
        }
    }

    break;
    }

    /* FIXME: <x,y> isn't right when looking at long worm tails */
    if ((reg = C.visible_region_at(x, y)) != 0
        && (buflen = C.strlen(outbuf)) < C.BUFSZ - 1) {
        let r = (C.u.xray_range > 1) ? C.u.xray_range : 1;

        /* at present, hero must be next to the monster; being able to see
           from the hero's spot to the monster's spot would be much better,
           but a visible region marks all its spots as can't-be-seen, so
           this monster's spot is !cansee and !couldsee [maybe we need an
           additional vision bit for "hero's side of edge of gas cloud"?] */
        if (C.distu(x, y) <= r * (r + 1) || force_region) {
            let rglyph = reg.glyph;
            let poison_gas = (C.glyph_is_cmap(rglyph)
                                  && C.glyph_to_cmap(rglyph) == C.S_poisoncloud);

            C.Snprintf("mhidden_description", 277, C.eos(outbuf), C.BUFSZ - buflen, ", in a cloud of %s",
                     poison_gas ? "poison gas" : "vapor");
        }
    }
}

/* extracted from lookat(); also used by namefloorobj() */
export function object_from_map(glyph, x, y, obj_p)
{
    let fakeobj = C.FALSE, mimic_obj = C.FALSE;
    let mtmp;
    let otmp;
    let glyphotyp = C.glyph_is_object(glyph) ? C.glyph_to_obj(glyph)
                    /* if not an object, probably a detected chest trap */
                    : C.glyph_is_cmap(glyph) /* assume trapped chest|door */
                      ? (C.sobj_at(C.CHEST, x, y) ? C.CHEST : C.LARGE_BOX)
                      : C.STRANGE_OBJECT;

    obj_p.value = 0;
    /* TODO: check inside containers in case glyph came from detection */
    if ((otmp = C.sobj_at(glyphotyp, x, y)) == 0)
        for (otmp = C.svl.level.buriedobjlist; otmp; otmp = otmp.nobj)
            if (otmp.ox == x && otmp.oy == y && otmp.otyp == glyphotyp)
                break;

    /* there might be a mimic here posing as an object */
    mtmp = C.m_at(x, y);
    if (mtmp && C.is_obj_mappear(mtmp, (glyphotyp >>> 0))) {
        otmp = 0;
        mimic_obj = C.TRUE;
    } else
        mtmp = 0;

    if (!otmp || otmp.otyp != glyphotyp) {
        /* this used to exclude STRANGE_OBJECT; now caller deals with it */
        if (C.OBJ_NAME(C.objects[glyphotyp])) {
            /* map shows a regular object, but one that's not actually here */
            otmp = C.mksobj(glyphotyp, C.FALSE, C.FALSE);
        } else {
            /* map shows a non-item that holds an extra object type (shown
               on map due to hallucination) for a name which might have been
               shuffled into play but wasn't (or was shuffled out of play);
               pick another item that is a regular one in same object class */
            otmp = C.mkobj(C.objects[glyphotyp].oc_class, C.FALSE);
            /* mkobj() doesn't provide any no-init option; however, there
               aren't any extra tool items (or statues) so we won't get here
               for tools and don't need to check for and delete container
               contents or extinguish lights on the temporary object */
        }
        /* even though we pass False for mksobj()'s 'init' arg, corpse-rot,
           egg-hatch, and figurine-transform timers get initialized */
        if (otmp.timed)
            C.obj_stop_timers(otmp);
        fakeobj = C.TRUE;
        if (otmp.oclass == C.COIN_CLASS)
            otmp.quan = 2n; /* to force pluralization */
        else if (otmp.otyp == C.SLIME_MOLD)
            otmp.spe = C.svc.context.current_fruit; /* give it a type */
        if (mtmp && C.has_mcorpsenm(mtmp)) { /* mimic as corpse/statue */
            if (otmp.otyp == C.SLIME_MOLD)
                /* override svc.context.current_fruit to avoid
                     look, use 'O' to make new named fruit, look again
                   giving different results when current_fruit changes */
                otmp.spe = C.MCORPSENM(mtmp);
            else
                otmp.corpsenm = C.MCORPSENM(mtmp);
        } else if (otmp.otyp == C.CORPSE && C.glyph_is_body(glyph)) {
            otmp.corpsenm = C.glyph_to_body_corpsenm(glyph);
        } else if (otmp.otyp == C.STATUE && C.glyph_is_statue(glyph)) {
            otmp.corpsenm = C.glyph_to_statue_corpsenm(glyph);
        }
        if (otmp.otyp == C.LEASH)
            otmp.leashmon = 0;
        /* extra fields needed for shop price with doname() formatting */
        otmp.where = C.OBJ_FLOOR;
        otmp.ox = x, otmp.oy = y;
        otmp.no_charge = (otmp.otyp == C.STRANGE_OBJECT && C.costly_spot(x, y));
    }
    /* if located at adjacent spot, mark it as having been seen up close
       (corpse type will be known even if dknown is 0, so we don't need a
       touch check for cockatrice corpse--we're looking without touching) */
    if (otmp && C.next2u(x, y) && !C.Blind && !C.Hallucination
        /* redundant: we only look for an object which matches current
           glyph among floor and buried objects; when !Blind, any buried
           object's glyph will have been replaced by whatever is present
           on the surface as soon as we moved next to its spot */
        && (fakeobj || otmp.where == C.OBJ_FLOOR) /* not buried */
        /* terrain mode views what's already known, doesn't learn new stuff */
        && !C.iflags.terrainmode) /* so don't set dknown when in terrain mode */
        C.observe_object(otmp); /* if a pile, clearly see the top item only */
    if (fakeobj && mtmp && mimic_obj
        && (otmp.dknown || (C.M_AP_FLAG(mtmp) & C.M_AP_F_DKNOWN))) {
        mtmp.m_ap_type |= C.M_AP_F_DKNOWN;
        C.observe_object(otmp);
    }
    obj_p.value = otmp;
    return fakeobj; /* when True, caller needs to dealloc *obj_p */
}

export function look_at_object(buf, x, y, glyph)
/* output buffer */
{
    const otmp = C.cell("object",0);
    let fakeobj = C.callLocal(object_from_map, glyph, x, y, otmp);

    if (otmp.value) {
        C.Strcpy(buf, (otmp.value.otyp != C.STRANGE_OBJECT)
                     ? C.distant_name(otmp.value, otmp.value.dknown ? C.functionAddress("doname_with_price")
                                                       : C.functionAddress("doname_vague_quan"))
                     : C.obj_descr[C.STRANGE_OBJECT].oc_name);
        if (fakeobj) {
            otmp.value.where = C.OBJ_FREE; /* object_from_map set it to OBJ_FLOOR */
            C.dealloc_obj(otmp.value), otmp.value = C.NULL; /* has no contents */
        }
    } else {
        C.Strcpy(buf, C.something); /* sanity precaution */
    }

    if (otmp.value && otmp.value.where == C.OBJ_BURIED)
        C.Strcat(buf, " (buried)");
    /* check TREE before STONE due to level.flags.arboreal */
    else if (C.IS_TREE(C.levl[x][y].typ))
        /* "dangling": "hanging" could imply that it's growing on this tree */
        C.Snprintf("look_at_object", 407, C.eos(buf), C.BUFSZ - C.strlen(buf), " %s in a tree",
                 (otmp.value && C.is_treefruit(otmp.value)) ? "dangling" : "stuck");
    else if (C.levl[x][y].typ == C.STONE || C.levl[x][y].typ == C.SCORR)
        C.Strcat(buf, " embedded in stone");
    else if (C.IS_WALL(C.levl[x][y].typ) || C.levl[x][y].typ == C.SDOOR)
        C.Strcat(buf, " embedded in a wall");
    else if (C.closed_door(x, y))
        C.Strcat(buf, " embedded in a door");
    else if (C.is_pool(x, y))
        C.Strcat(buf, " in water");
    else if (C.is_lava(x, y))
        C.Strcat(buf, " in molten lava"); /* [can this ever happen?] */
    return;
}

export function look_at_monster(buf, monbuf, mtmp, x, y)
/* buf: output, monbuf: optional output */
{
    let name; const monnambuf = C.automaticBuffer("look_at_monster.monnambuf", C.BUFSZ); const healthbuf = C.automaticBuffer("look_at_monster.healthbuf", C.BUFSZ);
    let accurate = !C.Hallucination;

    name = (mtmp.data == C.mons[C.PM_COYOTE] && accurate)
              ? C.coyotename(mtmp, monnambuf)
              : C.distant_monnam(mtmp, C.ARTICLE_NONE, monnambuf);
    C.Sprintf(buf, "%s%s%s%s",
            (mtmp.mx != x || mtmp.my != y)
                ? ((mtmp.isshk && accurate) ? "tail of " : "tail of a ")
                : "",
            accurate ? C.callLocal(monhealthdescr, mtmp, C.TRUE, healthbuf) : "",
            (mtmp.mtame && accurate)
                ? "tame "
                : (mtmp.mpeaceful && accurate)
                    ? "peaceful "
                    : "",
            name);
    if (C.u.ustuck == mtmp) {
        if (C.u.uswallow || C.iflags.save_uswallow) /* monster detection */
            C.Strcat(buf, C.digests(mtmp.data) ? ", swallowing you"
                                            : ", engulfing you");
        else
            C.Strcat(buf, (C.Upolyd && C.sticks(C.gy.youmonst.data))
                          ? ", being held" : ", holding you");
    }
    /* if mtmp isn't able to move (other than because it is a type of
       monster that never moves), say so [excerpt from mstatusline() for
       stethoscope or wand of probing] */
    if (mtmp.mfrozen)
        /* unfortunately mfrozen covers temporary sleep and being busy
           (donning armor, for instance) as well as paralysis */
        C.Strcat(buf, ", can't move (paralyzed or sleeping or busy)");
    else if (mtmp.msleeping)
        /* sleeping for an indeterminate duration */
        C.Strcat(buf, ", asleep");
    else if ((mtmp.mstrategy & C.STRAT_WAITMASK) != 0)
        /* arbitrary reason why it isn't moving */
        C.Strcat(buf, ", meditating");

    if (mtmp.mleashed)
        C.Strcat(buf, ", leashed to you");
    if (mtmp.mtrapped && C.cansee(mtmp.mx, mtmp.my)) {
        let t = C.t_at(mtmp.mx, mtmp.my);
        let tt = t ? t.ttyp : C.NO_TRAP;

        /* newsym lets you know of the trap, so mention it here */
        if (tt == C.BEAR_TRAP || C.is_pit(tt) || tt == C.WEB) {
            C.Sprintf(C.eos(buf), ", trapped in %s", C.an(C.trapname(tt, C.FALSE)));
            t.tseen = 1;
        }
    }

    /* we know the hero sees a monster at this location, but if it's shown
       due to persistent monster detection he might remember something else */
    if (mtmp.mundetected || C.M_AP_TYPE(mtmp) || C.visible_region_at(x, y))
        C.callLocal(mhidden_description, mtmp, C.MHID_PREFIX | C.MHID_ARTICLE | C.MHID_REGION,
                            C.eos(buf));

    if (monbuf) {
        let how_seen = C.howmonseen(mtmp);

        C.storeCharAt(monbuf, 0, 0);
        if (how_seen != 0 && how_seen != C.MONSEEN_NORMAL) {
            if (how_seen & C.MONSEEN_NORMAL) {
                C.Strcat(monbuf, "normal vision");
                how_seen &= ~C.MONSEEN_NORMAL;
                /* how_seen can't be 0 yet... */
                if (how_seen)
                    C.Strcat(monbuf, ", ");
            }
            if (how_seen & C.MONSEEN_SEEINVIS) {
                C.Strcat(monbuf, "see invisible");
                how_seen &= ~C.MONSEEN_SEEINVIS;
                if (how_seen)
                    C.Strcat(monbuf, ", ");
            }
            if (how_seen & C.MONSEEN_INFRAVIS) {
                C.Strcat(monbuf, "infravision");
                how_seen &= ~C.MONSEEN_INFRAVIS;
                if (how_seen)
                    C.Strcat(monbuf, ", ");
            }
            if (how_seen & C.MONSEEN_TELEPAT) {
                C.Strcat(monbuf, "telepathy");
                how_seen &= ~C.MONSEEN_TELEPAT;
                if (how_seen)
                    C.Strcat(monbuf, ", ");
            }
            if (how_seen & C.MONSEEN_XRAYVIS) {
                /* Eyes of the Overworld */
                C.Strcat(monbuf, "astral vision");
                how_seen &= ~C.MONSEEN_XRAYVIS;
                if (how_seen)
                    C.Strcat(monbuf, ", ");
            }
            if (how_seen & C.MONSEEN_DETECT) {
                C.Strcat(monbuf, "monster detection");
                how_seen &= ~C.MONSEEN_DETECT;
                if (how_seen)
                    C.Strcat(monbuf, ", ");
            }
            if (how_seen & C.MONSEEN_WARNMON) {
                if (C.Hallucination) {
                    C.Strcat(monbuf, "paranoid delusion");
                } else {
                    let mW = (C.svc.context.warntype.obj
                                        | C.svc.context.warntype.polyd),
                                  m2 = mtmp.data.mflags2;
                    let whom = ((mW & C.M2_HUMAN & m2) ? "human"
                                        : (mW & C.M2_ELF & m2) ? "elf"
                                          : (mW & C.M2_ORC & m2) ? "orc"
                                            : (mW & C.M2_DEMON & m2) ? "demon"
                                              : C.pmname(mtmp.data,
                                                       C.Mgender(mtmp)));

                    C.Sprintf(C.eos(monbuf), "warned of %s", C.makeplural(whom));
                }
                how_seen &= ~C.MONSEEN_WARNMON;
                if (how_seen)
                    C.Strcat(monbuf, ", ");
            }
            /* should have used up all the how_seen bits by now */
            if (how_seen) {
                C.impossible("lookat: unknown method of seeing monster");
                C.Sprintf(C.eos(monbuf), "(%u)", how_seen);
            }
        } /* seen by something other than normal vision */
    } /* monbuf is non-null */
}

/* describe a pool location's contents; might return a static buffer so
   caller should use it or copy it before calling waterbody_name() again
   [5.0: moved here from mkmaze.c] */
export function waterbody_name(x, y)
{
    const pooltype = C.staticBuffer("waterbody_name.pooltype");
    let ltyp;
    let hallucinate = C.Hallucination && !C.program_state.gameover;

    if (!C.isok(x, y))
        return "drink"; /* should never happen */
    ltyp = C.char(C.SURFACE_AT(x, y));

    if (ltyp == C.LAVAPOOL) {
        C.Snprintf("waterbody_name", 572, pooltype, (40), "molten %s", C.hliquid("lava"));
        return pooltype;
    } else if (ltyp == C.ICE) {
        if (!hallucinate)
            return "ice";
        C.Snprintf("waterbody_name", 577, pooltype, (40), "frozen %s", C.hliquid("water"));
        return pooltype;
    } else if (ltyp == C.POOL) {
        C.Snprintf("waterbody_name", 580, pooltype, (40), "pool of %s", C.hliquid("water"));
        return pooltype;
    } else if (ltyp == C.MOAT) {
        /* a bit of extra flavor over general moat */
        if (hallucinate) {
            C.Snprintf("waterbody_name", 585, pooltype, (40), "deep %s", C.hliquid("water"));
            return pooltype;
        } else if (C.Is_medusa_level(C.u.uz)) {
            /* somewhat iffy since ordinary stairs can take you beneath,
               but previous generic "water" was rather anti-climactic */
            return "shallow sea";
        } else if (C.Is_juiblex_level(C.u.uz)) {
            return "swamp";
        } else if (C.Role_if(C.PM_SAMURAI) && C.Is_qstart(C.u.uz)) {
            /* samurai quest home level has two isolated moat spots;
               they sound silly if farlook describes them as such */
            return "pond";
        } else {
            return "moat";
        }
    } else if (C.IS_WATERWALL(ltyp)) {
        if (C.Is_waterlevel(C.u.uz))
            return "limitless water"; /* even if hallucinating */
        C.Snprintf("waterbody_name", 603, pooltype, (40), "wall of %s", C.hliquid("water"));
        return pooltype;
    } else if (ltyp == C.LAVAWALL) {
        C.Snprintf("waterbody_name", 606, pooltype, (40), "wall of %s", C.hliquid("lava"));
        return pooltype;
    }
    /* default; should be unreachable */
    return "water"; /* don't hallucinate this as some other liquid */
}

export function ice_descr(x, y, outbuf)
{
    const icetyp = C.staticStrings("ice_descr.icetyp", [
        "solid",    /* 0: not melting */
        "sturdy",   /* 1: more than 1000 turns left */
        "steady",   /* 2: 101..1000 turns left */
        "unsteady", /* 3:  51..100 turns left */
        "thin",     /* 4:  15..50 turns left */
        "slushy",   /* 5:   1..14 turns left; matches Warning on ice */
    ]);
    /* same formula as is used in distant_name() for objects */
    let r = (C.u.xray_range > 2) ? C.u.xray_range : 2,
        neardist = (r * r) * 2 - r; /* same as r*r + r*(r-1) */

    C.iflags.ice_rating = -1; /* secondary output, for 'mention_decor' */
    if (C.SURFACE_AT(x, y) != C.ICE) {
        C.Sprintf(outbuf, "[ice:%d?]", C.levl[x][y].typ);
    } else if ((C.distu(x, y) > neardist
                || (!C.cansee(x, y) && (!C.u_at(x, y) || C.Levitation)))
               && !C.gd.decor_levitate_override) { /* probe_decor(pickup.c) */
        C.Strcpy(outbuf, C.callLocal(waterbody_name, x, y)); /* "ice" or "frozen <liquid>" */
    } else {
        let time_left = C.spot_time_left(x, y, C.MELT_ICE_AWAY);

        /* other, real ice thickness/strength terminology exists but seems
           to be too unfamiliar for nethack's use */
        C.iflags.ice_rating = !time_left ? 0                /* solid */
                            : (time_left > 1000n) ? 1     /* sturdy */
                              : (time_left > 100n) ? 2    /* steady */
                                : (time_left > 50n) ? 3   /* unsteady */
                                  : (time_left > 14n) ? 4 /* thin */
                                    : 5;                  /* slushy */
        C.Sprintf(outbuf, "%s %s", icetyp[C.iflags.ice_rating],
                C.callLocal(waterbody_name, x, y));
    }
    return outbuf;
}

/*
 * Return the name of the glyph found at (x,y).
 * If not hallucinating and the glyph is a monster, also monster data.
 */
export function lookat(x, y, buf, monbuf)
{
    let mtmp = 0;
    let pm = 0;
    let glyph;

    C.storeCharAt(buf, 0, C.storeCharAt(monbuf, 0, 0));
    glyph = C.glyph_at(x, y);
    if (C.u_at(x, y) && C.canspotself()
        && !(C.iflags.save_uswallow
             && glyph == C.mon_to_glyph(C.u.ustuck, C.functionAddress("rn2_on_display_rng")))
        && (!C.iflags.terrainmode || (C.iflags.terrainmode & C.TER_MON) != 0)) {
        /* fill in buf[] */
        C.callLocal(self_lookat, buf);

        /* file lookup can't distinguish between "gnomish wizard" monster
           and correspondingly named player character, always picking the
           former; force it to find the general "wizard" entry instead */
        if (C.Role_if(C.PM_WIZARD) && C.Race_if(C.PM_GNOME) && !C.Upolyd)
            pm = C.mons[C.PM_WIZARD];

        /* When you see yourself normally, no explanation is appended
           (even if you could also see yourself via other means).
           Sensing self while blind or swallowed is treated as if it
           were by normal vision (cf canseeself()). */
        if ((C.Invisible || C.u.uundetected) && !C.Blind
            && !(C.u.uswallow || C.iflags.save_uswallow)) {
            let how = 0;

            if (C.Infravision)
                how |= 1;
            if (C.Unblind_telepat)
                how |= 2;
            if (C.Detect_monsters)
                how |= 4;

            if (how)
                C.Sprintf(C.eos(buf), " [seen: %s%s%s%s%s]",
                        (how & 1) ? "infravision" : "",
                        /* add comma if telep and infrav */
                        ((how & 3) > 2) ? ", " : "",
                        (how & 2) ? "telepathy" : "",
                        /* add comma if detect and (infrav or telep or both) */
                        ((how & 7) > 4) ? ", " : "",
                        (how & 4) ? "monster detection" : "");
        }
    } else if (C.u.uswallow) {
        /* when swallowed, we're only called for spots adjacent to hero,
           and blindness doesn't prevent hero from feeling what holds him */
        C.Sprintf(buf, "interior of %s", C.mon_nam(C.u.ustuck));
        pm = C.u.ustuck.data;
    } else if (C.glyph_is_monster(glyph)) {
        if ((mtmp = C.m_at(x, y)) != 0) {
            C.callLocal(look_at_monster, buf, monbuf, mtmp, x, y);
            pm = mtmp.data;
        } else if (C.Hallucination) {
            /* 'monster' must actually be a statue */
            C.Strcpy(buf, C.rndmonnam(0));
        }
    } else if (C.glyph_is_object(glyph)) {
        C.callLocal(look_at_object, buf, x, y, glyph); /* fill in buf[] */
    } else if (C.glyph_is_trap(glyph)) {
        let tnum = C.glyph_to_trap(glyph);

        C.callLocal(trap_description, buf, tnum, x, y);
    } else if (C.glyph_is_warning(glyph)) {
        let warnindx = C.glyph_to_warning(glyph);

        C.Strcpy(buf, C.def_warnsyms[warnindx].explanation);
    } else if (C.glyph_is_invisible(glyph)) {
        C.Strcpy(buf, C.invisexplain); /* redundant; handled by caller */
    } else if (C.glyph_is_nothing(glyph)) {
        C.Strcpy(buf, "dark part of a room");
    } else if (C.glyph_is_unexplored(glyph)) {
        if (C.Underwater && !C.Is_waterlevel(C.u.uz)) {
            /* "unknown" == previously mapped but not visible when
               submerged; better terminology appreciated... */
            C.Strcpy(buf, (C.next2u(x, y)) ? "land" : "unknown");
        } else {
            C.Strcpy(buf, "unexplored area");
        }
    } else if (C.glyph_is_cmap(glyph)) {
        let amsk;
        let algn;
        let symidx = C.glyph_to_cmap(glyph);

        switch (symidx) {
        case C.S_altar:
            amsk = C.altarmask_at(x, y);
            algn = C.Amask2align(amsk & C.AM_MASK);
            C.Sprintf(buf, "%s %saltar",
                    /* like endgame high priests, endgame high altars
                       are only recognizable when immediately adjacent */
                    (C.Is_astralevel(C.u.uz) && !C.next2u(x, y)
                     && (amsk & C.AM_SANCTUM))
                        ? "aligned"
                        : C.align_str(algn),
                    (amsk & C.AM_SANCTUM) ? "high " : "");
            break;
        case C.S_ndoor:
            if (C.is_drawbridge_wall(x, y) >= 0)
                C.Strcpy(buf, "open drawbridge portcullis");
            else if ((C.levl[x][y].doormask & ~C.D_TRAPPED) == C.D_BROKEN)
                C.Strcpy(buf, "broken door");
            else
                C.Strcpy(buf, "doorway");
            break;
        case C.S_cloud:
            C.Strcpy(buf,
                   C.Is_airlevel(C.u.uz) ? "cloudy area" : "fog/vapor cloud");
            break;
        case C.S_pool:
        case C.S_water: /* was Plane of Water, now that or "wall of water" */
        case C.S_lava:
        case C.S_lavawall:
        case C.S_ice: /* for hallucination; otherwise defsyms[] would be fine */
            C.Strcpy(buf, C.callLocal(waterbody_name, x, y));
            break;
        case C.S_engroom:
        case C.S_engrcorr:
            C.Strcpy(buf, "engraving");
            break;
        case C.S_stone:
            if (!C.levl[x][y].seenv) {
                C.Strcpy(buf, "unexplored");
                break;
            } else if (C.Underwater && !C.Is_waterlevel(C.u.uz)) {
                /* "unknown" == previously mapped but not visible when
                   submerged; better terminology appreciated... */
                C.Strcpy(buf, (C.next2u(x, y)) ? "land" : "unknown");
                break;
            } else if (C.levl[x][y].typ == C.STONE || C.levl[x][y].typ == C.SCORR) {
                C.Strcpy(buf, "stone");
                break;
            }
            
            /*FALLTHRU*/
        default:
            C.Strcpy(buf, C.defsyms[symidx].explanation);
            break;
        }
    } else { /* not mon, obj, trap, or cmap */
        C.Strcpy(buf, "unexplored area");
    }
    return (pm && !C.Hallucination) ? pm : 0;
}

/* used to decide whether the context-sensitive inventory action menu for
   item 'otmp' should include the "/ - look up this item" choice */
export function ia_checkfile(otmp)
{
    const itemnam = C.automaticBuffer("ia_checkfile.itemnam", C.BUFSZ);

    /* singular() of xname() of otmp is what "/i" looks up */
    C.Strcpy(itemnam, C.singular(otmp, C.functionAddress("xname")));
    return C.callLocal(checkfile, itemnam, 0,
                     chkfilIaCheck | chkfilDontAsk, 0);
}

/*
 * Look in the "data" file for more info.  Called if the user typed in the
 * whole name (user_typed_name == TRUE), or we've found a possible match
 * with a character/glyph and flags.help is TRUE.
 *
 * NOTE: when (user_typed_name == FALSE), inp is considered read-only and
 *       must not be changed directly, e.g. via lcase(). We want to force
 *       lcase() for data.base lookup so that we can have a clean key.
 *       Therefore, we create a copy of inp _just_ for data.base lookup.
 *
 * Returns True if an entry is found, False otherwise.
 */
export function checkfile(inp, pm, chkflags, supplemental_name)
/* string to look up */
/* monster type to look up (overrides 'inp') */
{
    let fp;
    const buf = C.automaticBuffer("checkfile.buf", C.BUFSZ); const newstr = C.automaticBuffer("checkfile.newstr", C.BUFSZ); const givenname = C.automaticBuffer("checkfile.givenname", C.BUFSZ);
    let ep, dbase_str;
    let user_typed_name = (chkflags & chkfilUsrTyped) != 0,
            without_asking = (chkflags & chkfilDontAsk) != 0,
            ia_checking = (chkflags & chkfilIaCheck) != 0;
    const txt_offset = C.cell("ulong",0n);
    let datawin = C.WIN_ERR;
    let res = C.FALSE;

    fp = C.dlb_fopen(C.DATAFILE, "r");
    if (!fp) {
        C.pline("Cannot open 'data' file!");
        return res;
    }
    checkfile_done: {
    bad_data_file: {
    /* If someone passed us garbage, prevent fault. */
    if (!inp || C.strlen(inp) > (C.BUFSZ - 1)) {
        C.impossible("bad do_look buffer passed (%s)!",
                   !inp ? "null" : "too long");
        break checkfile_done;
    }

    /* To prevent the need for entries in data.base like *ngel to account
     * for Angel and angel, make the lookup string the same for both
     * user_typed_name and picked name.
     */
    if (pm != 0 && !user_typed_name)
        dbase_str = C.strcpy(newstr, pm.pmnames[C.NEUTRAL]);
    else
        dbase_str = C.strcpy(newstr, inp);
    C.lcase(dbase_str);

    /*
     * TODO:
     * The switch from xname() to doname_vague_quan() in look_at_obj()
     * had the unintended side-effect of making names picked from
     * pointing at map objects become harder to simplify for lookup.
     * We should split the prefix and suffix handling used by wish
     * parsing and also wizmode monster generation out into separate
     * routines and use those routines here.  This currently lacks
     * erosion handling and probably lots of other bits and pieces
     * that wishing already understands and most of this duplicates
     * stuff already done for wish handling or monster generation.
     */
    if (!C.strncmp(dbase_str, "interior of ", 12))
        dbase_str += 12;
    if (!C.strncmp(dbase_str, "a ", 2))
        dbase_str += 2;
    else if (!C.strncmp(dbase_str, "an ", 3))
        dbase_str += 3;
    else if (!C.strncmp(dbase_str, "the ", 4))
        dbase_str += 4;
    else if (!C.strncmp(dbase_str, "some ", 5))
        dbase_str += 5;
    else if (C.digit(C.loadChar(dbase_str))) {
        /* remove count prefix ("2 ya") which can come from looking at map */
        while (C.digit(C.loadChar(dbase_str)))
            ++dbase_str;
        if (C.loadChar(dbase_str) == 32)
            ++dbase_str;
    }
    if (!C.strncmp(dbase_str, "pair of ", 8))
        dbase_str += 8;
    if (!C.strncmp(dbase_str, "tame ", 5))
        dbase_str += 5;
    else if (!C.strncmp(dbase_str, "peaceful ", 9))
        dbase_str += 9;
    if (!C.strncmp(dbase_str, "invisible ", 10))
        dbase_str += 10;
    if (!C.strncmp(dbase_str, "saddled ", 8))
        dbase_str += 8;
    if (!C.strncmp(dbase_str, "blessed ", 8))
        dbase_str += 8;
    else if (!C.strncmp(dbase_str, "uncursed ", 9))
        dbase_str += 9;
    else if (!C.strncmp(dbase_str, "cursed ", 7))
        dbase_str += 7;
    if (!C.strncmp(dbase_str, "empty ", 6))
        dbase_str += 6;
    if (!C.strncmp(dbase_str, "partly used ", 12))
        dbase_str += 12;
    else if (!C.strncmp(dbase_str, "partly eaten ", 13))
        dbase_str += 13;
    if (!C.strncmp(dbase_str, "statue of ", 10))
        C.storeCharAt(dbase_str, 6, 0);
    else if (!C.strncmp(dbase_str, "figurine of ", 12))
        C.storeCharAt(dbase_str, 8, 0);
    /* remove enchantment ("+0 aklys"); [for 3.6.0 and earlier, this wasn't
       needed because looking at items on the map used xname() rather than
       doname() hence known enchantment was implicitly suppressed] */
    if (C.loadChar(dbase_str) && C.strchr("+-", C.loadChar(dbase_str, 0)) && C.digit(C.loadChar(dbase_str, 1))) {
        ++dbase_str; /* skip sign */
        while (C.digit(C.loadChar(dbase_str)))
            ++dbase_str;
        if (C.loadChar(dbase_str) == 32)
            ++dbase_str;
    }
    /* "towel", "wet towel", and "moist towel" share one data.base entry;
       for "wet towel", we keep prefix so that the prompt will ask about
       "wet towel"; for "moist towel", we also want to ask about "wet towel".
       (note: strncpy() only terminates output string if the specified
       count is bigger than the length of the substring being copied) */
    if (!C.strncmp(dbase_str, "moist towel", 11))
        C.memcpy(dbase_str += 2, "wet", 3); /* skip "mo" replace "ist" */

    /* Make sure the name is non-empty. */
    if (C.loadChar(dbase_str)) {
        let pass1offset = -1n;
        let chk_skip, pass = 1;
        let yes_to_moreinfo, found_in_file, pass1found_in_file,
                skipping_entry;
        let sp, ap, alt = 0; /* alternate description */

        /* adjust the input to remove "named " and "called " */
        if ((ep = C.strstri(dbase_str, " named ")) != 0) {
            alt = ep + 7;
            if ((ap = C.strstri(dbase_str, " called ")) != 0 && ap < ep)
                ep = ap; /* "named" is alt but truncate at "called" */
        } else if ((ep = C.strstri(dbase_str, " called ")) != 0) {
            C.copynchars(givenname, ep + 8, C.BUFSZ - 1);
            alt = givenname;
            if (supplemental_name && (sp = C.strstri(inp, " called ")) != 0)
                C.copynchars(supplemental_name, sp + 8, C.BUFSZ - 1);
        } else
            ep = C.strstri(dbase_str, ", ");
        if (ep && ep > dbase_str)
            C.storeCharAt(ep, 0);
        /* remove article from 'alt' name ("a pair of lenses named
           The Eyes of the Overworld" simplified above to "lenses named
           The Eyes of the Overworld", now reduced to "The Eyes of the
           Overworld", skip "The" as with base name processing) */
        if (alt && (!C.strncmpi(alt, "a ", 2)
                    || !C.strncmpi(alt, "an ", 3)
                    || !C.strncmpi(alt, "the ", 4)))
            alt = C.strchr(alt, 32) + 1;
        /* remove charges or "(lit)" or wizmode "(N aum)" */
        if ((ep = C.strstri(dbase_str, " (")) != 0 && ep > dbase_str)
            C.storeCharAt(ep, 0);
        if (alt && (ap = C.strstri(alt, " (")) != 0 && ap > alt)
            C.storeCharAt(ap, 0);

        /* If the object's name matches the player-specified fruitname,
           then "fruit" is the alternate description. We do this here so that
           if the fruit name is an extant object, looking at the fruit yields
           that object's description. */
        if (!alt && C.fruit_from_name(dbase_str, C.TRUE, 0))
            alt = C.strcpy(newstr, C.obj_descr[C.SLIME_MOLD].oc_name);
        /*
         * If the object is named, then the name is the alternate description;
         * otherwise, the result of makesingular() applied to the name is.
         * This isn't strictly optimal, but named objects of interest to the
         * user will usually be found under their name, rather than under
         * their object type, so looking for a singular form is pointless.
         */
        else if (!alt)
            alt = C.makesingular(dbase_str);

        pass1found_in_file = C.FALSE;
        for (pass = !C.strcmp(alt, dbase_str) ? 0 : 1; pass >= 0; --pass) {
            found_in_file = skipping_entry = C.FALSE;
            txt_offset.value = 0n;
            if (C.dlb_fseek(fp, txt_offset.value, C.SEEK_SET) < 0 ) {
                C.impossible("can't get to start of 'data' file");
                break checkfile_done;
            }
            /* skip first record; read second */
            if (!C.dlb_fgets(buf, C.BUFSZ, fp) || !C.dlb_fgets(buf, C.BUFSZ, fp)) {
                C.impossible("can't read 'data' file");
                break checkfile_done;
            } else if (C.sscanf(buf, "%8lx\n", txt_offset) < 1
                       || txt_offset.value == 0n)
                break bad_data_file;

            /* look for the appropriate entry */
            while (C.dlb_fgets(buf, C.BUFSZ, fp)) {
                if (C.loadChar(buf) == 46)
                    break; /* we passed last entry without success */

                if (C.digit(C.loadChar(buf))) {
                    /* a number indicates the end of current entry */
                    skipping_entry = C.FALSE;
                } else if (!skipping_entry) {
                    if (!(ep = C.strchr(buf, 10)))
                        break bad_data_file;
                    C.strip_newline((ep > buf) ? ep - 1 : ep);
                    /* if we match a key that begins with "~", skip
                       this entry */
                    chk_skip = (C.loadChar(buf) == 126) ? 1 : 0;
                    if ((pass == 0 && C.pmatch((buf + (chk_skip)), dbase_str))
                        || (pass == 1 && alt && C.pmatch((buf + (chk_skip)), alt))) {
                        if (chk_skip) {
                            skipping_entry = C.TRUE;
                            continue;
                        } else {
                            found_in_file = C.TRUE;
                            if (pass == 1)
                                pass1found_in_file = C.TRUE;
                            break;
                        }
                    }
                }
            }
            if (found_in_file) {
                const entry_offset = C.cell("long"); let  fseekoffset;
                const entry_count = C.cell("int");
                let i;

                /* skip over other possible matches for the info */
                do {
                    if (!C.dlb_fgets(buf, C.BUFSZ, fp))
                        break bad_data_file;
                } while (!C.digit(C.loadChar(buf)));
                if (C.sscanf(buf, "%ld,%d\n", entry_offset, entry_count) < 2)
                    break bad_data_file;
                fseekoffset = BigInt.asIntN(64, txt_offset.value) + entry_offset.value;
                if (pass == 1)
                    pass1offset = fseekoffset;
                else if (fseekoffset == pass1offset)
                    break checkfile_done;

                yes_to_moreinfo = C.FALSE;
                if (!user_typed_name && !without_asking) {
                    let entrytext = pass ? alt : dbase_str;
                    const question = C.automaticBuffer("checkfile.question", C.QBUFSZ);

                    C.Strcpy(question, "More info about \"");
                    /* +2 => length of "\"?" */
                    C.copynchars(C.eos(question), entrytext,
                               ((C.QBUFSZ) - 1
                                      - (C.strlen(question) + 2)));
                    C.Strcat(question, "\"?");
                    if (C.y_n(question) == 121)
                        yes_to_moreinfo = C.TRUE;
                }

                if (user_typed_name || without_asking || yes_to_moreinfo) {
                    if (C.dlb_fseek(fp, fseekoffset, C.SEEK_SET) < 0) {
                        C.pline("? Seek error on 'data' file!");
                        break checkfile_done;
                    }
                    res = C.TRUE;
                    if (ia_checking)
                        break checkfile_done;

                    datawin = C.create_nhwindow(C.NHW_MENU);
                    for (i = 0; i < entry_count.value; i++) {
                        /* room for 1-tab or 8-space prefix + BUFSZ-1 + \0 */
                        const tabbuf = C.automaticBuffer("checkfile.tabbuf", C.BUFSZ + 8); let tp;

                        if (!C.dlb_fgets(tabbuf, C.BUFSZ, fp))
                            break bad_data_file;
                        tp = tabbuf;
                        if (!C.strchr(tp, 10))
                            break bad_data_file;
                        C.strip_newline(tp);
                        /* text in this file is indented with one tab but
                           someone modifying it might use spaces instead */
                        if (C.loadChar(tp) == 9) {
                            ++tp;
                        } else if (C.loadChar(tp) == 32) {
                            /* remove up to 8 spaces (we expect 8-column
                               tab stops but user might have them set at
                               something else so we don't require it) */
                            do {
                                ++tp;
                            } while (tp < (tabbuf + (8)) && C.loadChar(tp) == 32);
                        } else if (C.loadChar(tp)) { /* empty lines are ok */
                            break bad_data_file;
                        }
                        /* if a tab after the leading one is found,
                           convert tabs into spaces; the attributions
                           at the end of quotes typically have them */
                        if (C.strchr(tp, 9) != 0)
                            C.tabexpand(tp);
                        C.putstr(datawin, 0, tp);
                    }
                    C.display_nhwindow(datawin, C.FALSE);
                    C.destroy_nhwindow(datawin), datawin = C.WIN_ERR;
                }
            } else if (user_typed_name && pass == 0 && !pass1found_in_file) {
                C.pline("You don't have any information on those things.");
            }
        }
    }
    break checkfile_done; /* skip error feedback */

    }
    C.impossible("'data' file in wrong format or corrupted");
    }
    if (datawin != C.WIN_ERR)
        C.destroy_nhwindow(datawin);
    C.dlb_fclose(fp);
    return res;
}

/* extracted from do_screen_description() */
export function add_cmap_descr(found, idx, glyph, article, cc, x_str, prefix, hit_trap, firstmatch, out_str)
/* number of matching descriptions so far */
/* cmap index into defsyms[] */
/* map glyph of screen symbol being described;
                         * anything other than NO_GLYPH implies 'looked' */
/* 0: (none), 1: a/an, 2: the */
/* map location */
/* description of defsyms[idx] */
/* text to insert in front of first match */
/* input/output: True if a trap has been described */
/* output: pointer to 1st matching description */
/* input/output: current description gets appended */
{
    let mbuf = C.NULL;
    let p;
    let absidx = C.abs(idx);

    if (glyph == C.NO_GLYPH) {
        /* use x_str [almost] as-is */
        if (!C.strcmp(x_str, "water")) {
            /* duplicate some transformations performed by waterbody_name() */
            if (idx == C.S_pool)
                x_str = "pool of water";
            else if (idx == C.S_water)
                x_str = !C.Is_waterlevel(C.u.uz) ? "wall of water"
                                              : "limitless water";
        }
        if (absidx == C.S_pool)
            idx = C.S_pool;
    } else if (absidx == C.S_pool || idx == C.S_water
               || idx == C.S_lava || idx == C.S_lavawall || idx == C.S_ice) {
        /* replace some descriptions (x_str) with waterbody_name() */
        let save_ltyp = C.levl[cc.x][cc.y].typ;
        let save_prop = C.EHalluc_resistance;

        /* grab a scratch buffer we can safely return (via *firstmatch
           when applicable) */
        mbuf = C.mon_nam(C.gy.youmonst);

        if (absidx == C.S_pool) {
            C.levl[cc.x][cc.y].typ = (idx == C.S_pool) ? C.POOL : C.MOAT;
            idx = C.S_pool; /* force fake negative moat value to be positive */
        } else {
            /* we might be examining a pool location but trying to match
               water or lava; override the terrain with what we're matching
               because that's what waterbody_name() bases its result on;
               it's not pool so must be one of water/lava/ice to get here */
            C.levl[cc.x][cc.y].typ = (idx == C.S_water) ? C.WATER
                                   : (idx == C.S_lava) ? C.LAVAPOOL
                                     : (idx == C.S_lavawall) ? C.LAVAWALL
                                       : C.ICE;
        }
        C.EHalluc_resistance = 1n;
        C.Strcpy(mbuf, C.callLocal(waterbody_name, cc.x, cc.y));
        C.EHalluc_resistance = save_prop;
        C.levl[cc.x][cc.y].typ = save_ltyp;

        /* shorten the feedback for farlook/quicklook: "pool or ..." */
        if (!C.strcmp(mbuf, "pool of water"))
            C.storeCharAt(mbuf, 4, 0);
        else if (!C.strcmp(mbuf, "molten lava"))
            C.Strcpy(mbuf, "lava");
        x_str = mbuf;
        /* avoid "an ice" and so forth; "a pool", "a moat", and
           "a wall of ..." are grammatically correct but make
           "a pool or a moat or a wall of water" become too verbose */
        article = !(!C.strncmp(x_str, "water", 5)
                    || !C.strncmp(x_str, "ice", 3)
                    || !C.strncmp(x_str, "pool", 4)
                    || !C.strncmp(x_str, "moat", 4)
                    || !C.strncmp(x_str, "lava", 4)
                    || !C.strncmp(x_str, "swamp", 5)
                    || !C.strncmp(x_str, "molten", 6)
                    || !C.strncmp(x_str, "shallow", 7)
                    || !C.strncmp(x_str, "limitless", 9)
                    || !C.strncmp(x_str, "wall of lava", 12)
                    || !C.strncmp(x_str, "wall of water", 13)
                    /* ice while hallucinating */
                    || !C.strncmp(x_str, "frozen", 6)
                    /* thawing ice ("solid ice", "thin ice", &c) */
                    || ((p = C.strchr(x_str, 32)) != 0 && !C.strcmpi(p, " ice"))
                    );
    }

    if (!found) {
        /* this is the first match */
        if (C.is_cmap_trap(idx) && idx != C.S_vibrating_square) {
            C.Sprintf(out_str, "%sa trap", prefix);
            hit_trap.value = C.TRUE;
        } else {
            C.Sprintf(out_str, "%s%s", prefix, (article == 2) ? C.the(x_str)
                                             : (article == 1) ? C.an(x_str)
                                               : x_str);
        }
        firstmatch.value = x_str;
        found = 1;
    } else if (!(hit_trap.value && C.is_cmap_trap(idx))
               && !(found >= 3 && C.is_cmap_drawbridge(idx))
               /* don't mention vibrating square outside of Gehennom
                  unless this happens to be one (hallucination?) */
               && (idx != C.S_vibrating_square || C.Inhell
                   || (C.glyph_is_trap(glyph)
                       && C.glyph_to_trap(glyph) == C.VIBRATING_SQUARE))) {
        /* append unless out_str already contains the string to append */
        found += C.callLocal(append_str, out_str, (article == 2) ? C.the(x_str)
                                     : (article == 1) ? C.an(x_str)
                                       : x_str);
        if (C.is_cmap_trap(idx) && idx != C.S_vibrating_square)
            hit_trap.value = C.TRUE;
    }
    return found;
}

export function do_screen_description(cc, looked, sym, out_str, firstmatch, for_supplement)
{
    const mon_interior = C.staticString("do_screen_description.mon_interior", "the interior of a monster"),
          unreconnoitered = C.staticString("do_screen_description.unreconnoitered", "unreconnoitered");
    const look_buf = C.staticBuffer("do_screen_description.look_buf");
    const prefix = C.automaticBuffer("do_screen_description.prefix", C.BUFSZ);
    let i, j, alt_i, glyph = C.NO_GLYPH,
        skipped_venom = 0, found = 0; /* count of matching syms found */
    const hit_trap = C.cell("boolean"); let  need_to_look = C.FALSE,
            submerged = (C.Underwater && !C.Is_waterlevel(C.u.uz)),
            hallucinate = (C.Hallucination && !C.program_state.gameover);
    let x_str;
    let tmpsym;
    const glyphinfo = C.localGlyphInfo(); C.copyGlyphInfo(glyphinfo, C.nul_glyphinfo);

    if (looked) {
        glyph = C.glyph_at(cc.x, cc.y);
        /* Convert glyph at selected position to a symbol for use below. */
        C.map_glyphinfo(cc.x, cc.y, glyph, 0, glyphinfo);
        sym = glyphinfo.ttychar;
        C.Sprintf(prefix, "%s        ", C.encglyph(glyphinfo.glyph));
    } else
        C.Sprintf(prefix, "%c        ", sym);

    /*
     * Check all the possibilities, saving all explanations in a buffer.
     * When all have been checked then the string is printed.
     */

    /*
     * Handle restricted vision range (limited to adjacent spots when
     * swallowed or underwater) cases first.
     *
     * 3.6.0 listed anywhere on map, other than self, as "interior
     * of a monster" when swallowed, and non-adjacent water or
     * non-water anywhere as "dark part of a room" when underwater.
     * "unreconnoitered" is an attempt to convey "even if you knew
     * what was there earlier, you don't know what is there in the
     * current circumstance".
     *
     * (Note: 'self' will always be visible when swallowed so we don't
     * need special swallow handling for <ux,uy>.
     * Another note: for '#terrain' without monsters, u.uswallow and
     * submerged will always both be False and skip this code.)
     */
    didlook: {
    x_str = 0;
    if (!looked) {
        ; /* skip special handling */
    } else if (((C.u.uswallow || submerged) && !C.next2u(cc.x, cc.y))
               /* detection showing some category, so mostly background */
               || ((C.iflags.terrainmode & (C.TER_DETECT | C.TER_MAP)) == C.TER_DETECT
                   && glyph == C.cmap_to_glyph(C.S_stone))) {
        x_str = unreconnoitered;
        need_to_look = C.FALSE;
    } else if (C.callLocal(is_swallow_sym, sym)) {
        x_str = mon_interior;
        need_to_look = C.TRUE; /* for specific monster type */
    }
    if (x_str) {
        /* we know 'found' is zero here, but guard against some other
           special case being inserted ahead of us someday */
        if (!found) {
            C.Sprintf(out_str, "%s%s", prefix, x_str);
            firstmatch.value = x_str;
            found++;
        } else {
            found += C.callLocal(append_str, out_str, x_str); /* not 'an(x_str)' */
        }
        /* for is_swallow_sym(), we want to list the current symbol's
           other possibilities (wand for '/', throne for '\\', &c) so
           don't jump to the end for the x_str==mon_interior case */
        if (x_str == unreconnoitered)
            break didlook;
    }

    check_monsters: for (;;) {
    /* Check for monsters */
    if (!C.iflags.terrainmode || (C.iflags.terrainmode & C.TER_MON) != 0) {
        for (i = 1; i < C.MAXMCLASSES; i++) {
            if (i == C.S_invisible)  /* avoid matching on this */
                continue;
            if (sym == (looked ? C.gs.showsyms[i + C.SYM_OFF_M]
                               : C.def_monsyms[i].sym)
                && C.def_monsyms[i].explain && C.loadChar(C.def_monsyms[i].explain)) {
                need_to_look = C.TRUE;
                if (!found) {
                    C.Sprintf(out_str, "%s%s",
                            prefix, C.an(C.def_monsyms[i].explain));
                    firstmatch.value = C.def_monsyms[i].explain;
                    found++;
                } else {
                    found += C.callLocal(append_str, out_str, C.an(C.def_monsyms[i].explain));
                }
            }
        }
        /* handle '@' as a special case if it refers to you and you're
           playing a character which isn't normally displayed by that
           symbol; firstmatch is assumed to already be set for '@' */
        if ((looked ? (sym == C.gs.showsyms[C.S_HUMAN + C.SYM_OFF_M]
                       && C.u_at(cc.x, cc.y))
                    : (sym == C.def_monsyms[C.S_HUMAN].sym && !C.flags.showrace))
            && !(C.Race_if(C.PM_HUMAN) || C.Race_if(C.PM_ELF)) && !C.Upolyd)
            found += C.callLocal(append_str, out_str, "you"); /* tack on "or you" */
    }

    /* Now check for objects */
    if (!C.iflags.terrainmode || (C.iflags.terrainmode & C.TER_OBJ) != 0) {
        let oc_ptr;
        let bouldersym;

        j = C.SYM_BOULDER + C.SYM_OFF_X;
        bouldersym = C.Is_rogue_level(C.u.uz) ? C.go.ov_rogue_syms[j]
                                           : C.go.ov_primary_syms[j];
        if (!bouldersym)
            bouldersym = C.def_oc_syms[C.ROCK_CLASS].sym;

        for (i = 1; i < C.MAXOCLASSES; i++) {
            if ((i != C.ROCK_CLASS)
                ? (sym == (looked ? C.gs.showsyms[i + C.SYM_OFF_O]
                                  : C.def_oc_syms[i].sym))
                /* ROCK_CLASS is complicated; statues are displayed as the
                   monster they depict rather than as S_rock; boulders might
                   be displayed as a custom symbol rather than as S_rock */
                : (C.glyph_is_statue(glyph) || sym == bouldersym)) {
                oc_ptr = C.def_oc_syms[i].explain;
                /* for added fun, engravings are shown with the same symbol
                   as S_rock which is why we want to shorten this */
                if (i == C.ROCK_CLASS && !C.strcmp(oc_ptr, "boulder or statue")) {
                    if (sym == bouldersym)
                        oc_ptr = "boulder"; /* discard "or statue" */
                    else if (C.glyph_is_statue(glyph))
                        oc_ptr = "statue"; /* discard "boulder or" */
                    else if (looked)
                        continue; /* discard both */
                }
                need_to_look = C.TRUE;
                if (looked && i == C.VENOM_CLASS) {
                    skipped_venom++;
                    continue;
                }
                if (!found) {
                    C.Sprintf(out_str, "%s%s", prefix, C.an(oc_ptr));
                    /* note: if the value assigned to *firstmatch ever
                       becomes dynamically constructed, it will need to be
                       copied into a static buffer; as of now, all alternate
                       values are string literals and implicitly static */
                    firstmatch.value = oc_ptr;
                    found++;
                } else {
                    found += C.callLocal(append_str, out_str, C.an(oc_ptr));
                }
            }
        }
    }

    if (sym == C.DEF_INVISIBLE) {
        /* for active clairvoyance, use alternate "unseen creature" */
        let usealt = (C.EDetect_monsters & C.I_SPECIAL) != 0n;
        let unseen_explain = (usealt || C.Blind) ? C.altinvisexplain
                                                       : C.invisexplain;

        if (!found) {
            C.Sprintf(out_str, "%s%s", prefix, C.an(unseen_explain));
            firstmatch.value = unseen_explain;
            found++;
        } else {
            found += C.callLocal(append_str, out_str, C.an(unseen_explain));
        }
    }
    if ((glyph && C.glyph_is_nothing(glyph))
        || (looked && sym == C.gs.showsyms[C.SYM_NOTHING + C.SYM_OFF_X])) {
        x_str = "the dark part of a room";
        if (!found) {
            C.Sprintf(out_str, "%s%s", prefix, x_str);
            firstmatch.value = x_str;
            found++;
        } else {
            found += C.callLocal(append_str, out_str, x_str);
        }
    }
    if ((glyph && C.glyph_is_unexplored(glyph))
        || (looked && sym == C.gs.showsyms[C.SYM_UNEXPLORED + C.SYM_OFF_X])) {
        x_str = "unexplored";
        if (submerged)
            x_str = "land"; /* replace "unexplored" */
        if (!found) {
            C.Sprintf(out_str, "%s%s", prefix, x_str);
            firstmatch.value = x_str;
            found++;
        } else {
            found += C.callLocal(append_str, out_str, x_str);
        }
    }
    /* Now check for graphics symbols */
    for (hit_trap.value = C.FALSE, i = 0; i < C.MAXPCHARS; i++) {
        /*
         * Index hackery:  we want
         *   "pool or moat or wall of water or lava or wall of lava"
         * rather than
         *   "pool or moat or lava or wall of lava or wall of water"
         * but S_lava comes before S_water so 'i' reaches it sooner.
         * Use 'alt_i' for the rest of the loop to behave as if their
         * places were swapped.
         * This was much simpler when it just exchanged water and lava.
         * Now it rotates water to the first of (lava, lavawall, water)
         * lava to the middle of (lava, lavawall, water), and lavawall
         * to last of (lava, lavawall, water); other values are used
         * as-is.
         * If S_water (and corresponding tile) were renumbered, this
         * hackery could go away.
         */
        alt_i = (i == C.S_lava) ? C.S_water /* do water first (of these 3) */
                : (i == C.S_lavawall) ? C.S_lava /* process lava second */
                  : (i == C.S_water) ? C.S_lavawall /* and wall of lava third */
                    : i; /* other; handle in defsyms[] order */
        x_str = C.defsyms[alt_i].explanation;
        /* cmap includes beams, shield effects, swallow boundaries, and
           explosions; skip all of those */
        if (!C.loadChar(x_str))
            continue;

        if (sym == (looked ? C.gs.showsyms[alt_i] : C.defsyms[alt_i].sym)) {
            let article; /* article==2 => "the", 1 => "an", 0 => (none) */

            /* check if dark part of a room was already included above */
            if (alt_i == C.S_darkroom && glyph && C.glyph_is_nothing(glyph))
                continue;

            /* avoid "an unexplored", "an stone", "an air",
               "a floor of a room", "a dark part of a room" */
            article = C.strstri(x_str, " of a room") ? 2
                      : !(alt_i == C.S_stone
                          || C.strcmp(x_str, "air") == 0
                          || C.strcmp(x_str, "land") == 0);

            found = C.callLocal(add_cmap_descr, found, alt_i, glyph, article,
                                   cc, x_str, prefix,
                                   hit_trap, firstmatch, out_str);
            if (alt_i == C.S_pool) {
                /* "pool of water" and "moat" use the same symbol and glyph
                   but have different descriptions; when handling pool, add
                   it a second time for moat but pass an alternate symbol;
                   skip incrementing 'found' to avoid "can be many things" */
                C.callLocal(add_cmap_descr, found, -C.S_pool, glyph, 1,
                                      cc, "moat", prefix,
                                      hit_trap, firstmatch, out_str);
                need_to_look = C.TRUE;
            }

            if (alt_i == C.S_altar || C.is_cmap_trap(alt_i)
                || (hallucinate && (alt_i == C.S_water /* S_pool already done */
                                    || alt_i == C.S_lava
                                    || alt_i == C.S_lavawall
                                    || alt_i == C.S_ice))
                || alt_i == C.S_engroom || alt_i == C.S_engrcorr
                || alt_i == C.S_grave) /* 'need_to_look' to report engraving */
                need_to_look = C.TRUE;
        }
    }

    /* Now check for warning symbols */
    for (i = 1; i < C.WARNCOUNT; i++) {
        x_str = C.def_warnsyms[i].explanation;
        if (sym == (looked ? C.gw.warnsyms[i] : C.def_warnsyms[i].sym)) {
            if (!found) {
                C.Sprintf(out_str, "%s%s", prefix, x_str);
                firstmatch.value = x_str;;
                found++;
            } else {
                found += C.callLocal(append_str, out_str, x_str);
            }
            /* Kludge: warning trumps boulders on the display.
               Reveal the boulder too or player can get confused */
            if (looked && C.sobj_at(C.BOULDER, cc.x, cc.y))
                C.Strcat(out_str, " co-located with a boulder");
            break; /* out of for loop*/
        }
    }

    /* if we ignored venom and list turned out to be short, put it back */
    if (skipped_venom && found < 2) {
        x_str = C.def_oc_syms[C.VENOM_CLASS].explain;
        if (!found) {
            C.Sprintf(out_str, "%s%s", prefix, C.an(x_str));
            firstmatch.value = x_str;
            found++;
        } else {
            found += C.callLocal(append_str, out_str, C.an(x_str));
        }
    }

    /* Finally, handle some optional overriding symbols */
    for (j = C.SYM_OFF_X; j < C.SYM_MAX; ++j) {
        if (j == C.SYM_INVISIBLE + C.SYM_OFF_X || j == C.SYM_BOULDER + C.SYM_OFF_X)
            continue;       /* already handled above */
        tmpsym = C.Is_rogue_level(C.u.uz) ? C.go.ov_rogue_syms[j]
                                       : C.go.ov_primary_syms[j];
        if (tmpsym && sym == tmpsym) {
            switch (j) {














            case C.SYM_PET_OVERRIDE + C.SYM_OFF_X:
                if (looked) {
                    /* convert to symbol without override in effect */
                    C.map_glyphinfo(cc.x, cc.y, glyph, C.MG_FLAG_NOOVERRIDE,
                                  glyphinfo);
                    sym = glyphinfo.ttychar;
                    continue check_monsters;
                }
                break;
            case C.SYM_HERO_OVERRIDE + C.SYM_OFF_X:
                sym = C.gs.showsyms[C.S_HUMAN + C.SYM_OFF_M];
                continue check_monsters;
            }
        }
    }

    /*
     * If we are looking at the screen, follow multiple possibilities or
     * an ambiguous explanation by something more detailed.
     */

    if (found > 4)
        /* 3.6.3: this used to be "That can be many things" (without prefix)
           which turned it into a sentence that lacked its terminating period;
           we could add one below but reinstating the prefix here is better */
        C.Sprintf(out_str, "%scan be many things", prefix);

    break;
    }
    }
    if (looked) {
        let pm = 0;

        if (found > 1 || need_to_look) {
            const monbuf = C.automaticBuffer("do_screen_description.monbuf", C.BUFSZ);
            const temp_buf = C.automaticBuffer("do_screen_description.temp_buf", C.BUFSZ);

            pm = C.callLocal(lookat, cc.x, cc.y, look_buf, monbuf);
            if (pm && for_supplement)
                for_supplement.value = pm;
            if (!C.strcmp(look_buf, "ice"))
                C.callLocal(ice_descr, cc.x, cc.y, look_buf);
            if (!C.strcmp(look_buf, "staircase down")
                && C.on_level(C.u.uz, C.qstart_level) && !C.ok_to_quest())
                C.Strcpy(look_buf, "blocked staircase down");

            if (look_buf[0] != 0)
                firstmatch.value = look_buf;
            if (C.loadChar(firstmatch.value)) {
                C.Sprintf(temp_buf, " (%s", firstmatch.value);
                C.callLocal(add_quoted_engraving, cc.x, cc.y, temp_buf, C.FALSE);
                C.Strcat(temp_buf, ")");
                C.strncat(out_str, temp_buf,
                               C.BUFSZ - C.strlen(out_str) - 1);
                found = 1; /* we have something to look up */
            }
            if (C.loadChar(monbuf, 0)) {
                C.Snprintf("do_screen_description", 1619, temp_buf, (C.BUFSZ), " [seen: %s]", monbuf);
                C.strncat(out_str, temp_buf,
                               C.BUFSZ - C.strlen(out_str) - 1);
            }
        }
    }

    return found;
}

/* when farlook is reporting on an engraving, include its text */
export function add_quoted_engraving(x, y, buf, force)
/* True: '/e' or '/E', False: '//' or ';' */
{
    const temp_buf = C.automaticBuffer("add_quoted_engraving.temp_buf", C.BUFSZ);
    let ep = C.engr_at(x, y);
    let floorengr = !C.strcmp(buf, " (engraving"),
            headstone = !C.strcmp(buf, " (grave");

    /*
     * If there is no engraving here, there's nothing to do; just return.
     *
     * When buf[] is " (engraving" or " (grave" then we're looking at an
     * engraving and we'll add its text.  Caller supplies the closing paren.
     *
     * If buf[] contains anything else, we're looking at something (monster
     * or object) that happens to be on top of an engraving, so we won't
     * append the engraving text.
     */
    if (!ep)
        return C.FALSE;

    if (!floorengr && !headstone && !force)
        return C.FALSE;

    if (ep.eread)
        C.Snprintf("add_quoted_engraving", 1660, temp_buf, (C.BUFSZ), " with %s: \"%s\"",
                 headstone ? "headstone reading" : "remembered text",
                 ep.engr_txt[C.remembered_text]);
    else
        C.Snprintf("add_quoted_engraving", 1663, temp_buf, (C.BUFSZ), " %s you haven't read",
                 headstone ? "whose headstone" : "that");

    C.strncat(buf, temp_buf, C.BUFSZ - C.strlen(buf) - 1);
    return C.TRUE;
}

/* also used by getpos hack in getpos.c */
export const what_is_a_location = "a monster, object or location";

export function do_look(mode, click_cc)
{
    let quick = (mode == 1); /* use cursor; don't search for "more info" */
    let clicklook = (mode == 2); /* right mouse-click method */
    const out_str = C.automaticBuffer("do_look.out_str", C.BUFSZ); C.zeroBuffer(out_str, C.BUFSZ);
    const cq = C.localCommandQueue(); let cmdq;
    const firstmatch = C.cell("pointer",0);
    let pm = 0; const supplemental_pm = C.cell("permonst",0);
    let i = 0, ans = 0;
    let sym;              /* typed symbol or converted glyph */
    let found;            /* count of matching syms found */
    const cc = C.localCoord();             /* screen pos of unknown glyph */
    let save_verbose; /* saved value of flags.verbose */
    let from_screen;  /* question from the screen */
    let clr = C.NO_COLOR;

    cc.x = 0;
    cc.y = 0;

    dowhatiscmd: {
    if ((cmdq = C.cmdq_pop()) != 0) {
        C.copyCommandQueue(cq, cmdq);
        C.free(cmdq);
        if (cq.typ == C.CMDQ_KEY)
            i = cq.key;
        else
            C.cmdq_clear(C.CQ_CANNED);
        break dowhatiscmd;
    }

    if (!clicklook) {
        if (quick) {
            i = 121;
        } else {
            const pick_list = C.cell("menu",0);
            let win;
            const any = C.localAnything();

            C.copyAnything(any, C.cg.zeroany);
            win = C.create_nhwindow(C.NHW_MENU);
            C.start_menu(win, C.MENU_BEHAVE_STANDARD);

            /*
             * Originally this was just a y|n question about whether to
             * use the cursor or to type a word.  When other choices were
             * added, it was changed to be a menu.  Using 'y' and 'n' as
             * unshown accelerators keeps backwards compatibility with
             * the old y|n behavior.
             *
             * Initially the menu included a third choice and always used
             * 'a', 'b', and 'c'.  Then it was changed to be controlled by
             * the 'lootabc' option instead, defaulting to '/', 'i', '?'
             * when that's false.  Eventually additional entries have been
             * introduced.
             *
             * When lootabc is set, abandon the 'y'|'n' compatibility in
             * favor of newer '/' and '?' compatibility instead.
             */

            any.a_char = 47;
            C.add_menu(win, C.nul_glyphinfo, any,
                     C.flags.lootabc ? 0 : any.a_char,
                     C.flags.lootabc ? 47 : 121, C.ATR_NONE,
                     clr, "something on the map", C.MENU_ITEMFLAGS_NONE);
            any.a_char = 105;
            C.add_menu(win, C.nul_glyphinfo, any,
                     /* [don't use 'i' as lootabc group accelerator because
                        it will make the regular 'i' choice inaccessible] */
                     C.flags.lootabc ? 0 : any.a_char, 0, C.ATR_NONE,
                     clr, "something you're carrying", C.MENU_ITEMFLAGS_NONE);
            any.a_char = 63;
            C.add_menu(win, C.nul_glyphinfo, any,
                     C.flags.lootabc ? 0 : any.a_char,
                     C.flags.lootabc ? 63 : 110, C.ATR_NONE,
                     clr, "something else (by symbol or name)",
                     C.MENU_ITEMFLAGS_NONE);
            if (!C.u.uswallow && !C.Hallucination) {
                C.copyAnything(any, C.cg.zeroany);
                C.add_menu_str(win, "");
                /* these options work sensibly for swallowed case, but
                   there's no reason for player to use them then because
                   the swallowed display hides all applicable targets;
                   objects work fine when hallucinating, but screen
                   symbol/monster class letter doesn't match up with
                   bogus monster type, so suppress when hallucinating */
                any.a_char = 109;
                C.add_menu(win, C.nul_glyphinfo, any,
                         C.flags.lootabc ? 0 : any.a_char,
                         C.flags.lootabc ? any.a_char : 0, C.ATR_NONE,
                         clr, "nearby monsters", C.MENU_ITEMFLAGS_NONE);
                any.a_char = 77;
                C.add_menu(win, C.nul_glyphinfo, any,
                         C.flags.lootabc ? 0 : any.a_char,
                         C.flags.lootabc ? any.a_char : 0, C.ATR_NONE,
                         clr, "all monsters shown on map",
                         C.MENU_ITEMFLAGS_NONE);
                any.a_char = 111;
                C.add_menu(win, C.nul_glyphinfo, any,
                         C.flags.lootabc ? 0 : any.a_char,
                         C.flags.lootabc ? any.a_char : 0, C.ATR_NONE,
                         clr, "nearby objects", C.MENU_ITEMFLAGS_NONE);
                any.a_char = 79;
                C.add_menu(win, C.nul_glyphinfo, any,
                         C.flags.lootabc ? 0 : any.a_char,
                         C.flags.lootabc ? any.a_char : 0, C.ATR_NONE,
                         clr, "all objects shown on map",
                         C.MENU_ITEMFLAGS_NONE);
                any.a_char = 116;
                C.add_menu(win, C.nul_glyphinfo, any,
                         C.flags.lootabc ? 0 : any.a_char,
                         C.flags.lootabc ? any.a_char : 94, C.ATR_NONE,
                         clr, "nearby traps", C.MENU_ITEMFLAGS_NONE);
                any.a_char = 84;
                C.add_menu(win, C.nul_glyphinfo, any,
                         C.flags.lootabc ? 0 : any.a_char,
                         C.flags.lootabc ? any.a_char : 34, C.ATR_NONE,
                         clr, "all seen or remembered traps",
                         C.MENU_ITEMFLAGS_NONE);
                any.a_char = 101;
                C.add_menu(win, C.nul_glyphinfo, any,
                         C.flags.lootabc ? 0 : any.a_char,
                         /* [don't use 'e' as lootabc group accelerator] */
                         C.flags.lootabc ? 0 : 96, C.ATR_NONE,
                         clr, "nearby engravings", C.MENU_ITEMFLAGS_NONE);
                any.a_char = 69;
                C.add_menu(win, C.nul_glyphinfo, any,
                         C.flags.lootabc ? 0 : any.a_char,
                         C.flags.lootabc ? any.a_char : 124, C.ATR_NONE,
                         clr, "all seen or remembered engravings",
                         C.MENU_ITEMFLAGS_NONE);
            }
            C.end_menu(win, "What do you want to look at:");
            if (C.select_menu(win, C.PICK_ONE, pick_list) > 0) {
                i = pick_list.value.item.a_char;
                C.free(pick_list.value);
            }
            C.destroy_nhwindow(win);
        }

    }
    }
    if (!clicklook || cmdq) {
        switch (i) {
        default:
        case 113:
            return C.ECMD_OK;
        case 121:
        case 47:
            from_screen = C.TRUE;
            sym = 0;
            cc.x = C.u.ux;
            cc.y = C.u.uy;
            break;
        case 105:
          {
            let invlet;
            let invobj;

            invlet = C.char(C.display_inventory(0, C.TRUE));
            if (!invlet || invlet == 27)
                return C.ECMD_OK;
            C.storeCharAt(out_str, 0);
            for (invobj = C.gi.invent; invobj; invobj = invobj.nobj)
                if (invobj.invlet == invlet) {
                    C.Strcpy(out_str, C.singular(invobj, C.functionAddress("xname")));
                    break;
                }
            if (C.loadChar(out_str))
                C.callLocal(checkfile, out_str, pm, chkfilUsrTyped | chkfilDontAsk,
                                 0);
            return C.ECMD_OK;
          }
        case 63:
            from_screen = C.FALSE;
            C.getlin("Specify what? (type the word)", out_str);
            if (C.strcmp(out_str, " ")) /* keep single space as-is */
                /* remove leading and trailing whitespace and
                   condense consecutive internal whitespace */
                C.mungspaces(out_str);
            if (C.loadChar(out_str, 0) == 0 || C.loadChar(out_str, 0) == 27)
                return C.ECMD_OK;

            if (C.loadChar(out_str, 1)) { /* user typed in a complete string */
                C.callLocal(checkfile, out_str, pm,  chkfilUsrTyped | chkfilDontAsk,
                                 0);
                return C.ECMD_OK;
            }
            sym = C.loadChar(out_str, 0);
            break;
        case 109:
            C.callLocal(look_all, C.TRUE, C.TRUE); /* list nearby monsters */
            return C.ECMD_OK;
        case 77:
            C.callLocal(look_all, C.FALSE, C.TRUE); /* list all monsters */
            return C.ECMD_OK;
        case 111:
            C.callLocal(look_all, C.TRUE, C.FALSE); /* list nearby objects */
            return C.ECMD_OK;
        case 79:
            C.callLocal(look_all, C.FALSE, C.FALSE); /* list all objects */
            return C.ECMD_OK;
        case 116:
            C.callLocal(look_traps, C.TRUE); /* list nearby traps */
            return C.ECMD_OK;
        case 84:
            C.callLocal(look_traps, C.FALSE); /* list all traps (visible or remembered) */
            return C.ECMD_OK;
        case 101:
            C.callLocal(look_engrs, C.TRUE); /* list nearby engravings */
            return C.ECMD_OK;
        case 69:
            C.callLocal(look_engrs, C.FALSE); /* list all engravings (visible|remembered) */
            return C.ECMD_OK;
        }
    } else { /* clicklook */
        cc.x = click_cc.x;
        cc.y = click_cc.y;
        sym = 0;
        from_screen = C.FALSE;
    }

    /* Save the verbose flag, we change it later. */
    save_verbose = C.flags.verbose;
    C.flags.verbose = C.flags.verbose && !quick;
    /*
     * The user typed one letter, or we're identifying from the screen.
     */
    do {
        /* Reset some variables. */
        pm = 0;
        C.storeCharAt(out_str, 0, 0);

        if (from_screen || clicklook) {
            if (from_screen) {
                if (C.flags.verbose)
                    C.pline("Please move the cursor to %s.",
                          C.what_is_a_location);
                else
                    C.pline("Pick %s.", C.what_is_a_location);

                ans = C.getpos(cc, quick, C.what_is_a_location);
                if (ans < 0 || cc.x < 0)
                    break; /* done */
                C.flags.verbose = C.FALSE; /* only print long question once */
            }
        }

        found = C.callLocal(do_screen_description, cc, (from_screen || clicklook), sym,
                                      out_str, firstmatch, supplemental_pm);

        /* Finally, print out our explanation. */
        if (found) {
            /* use putmixed() because there may be an encoded glyph present */
            C.putmixed(C.WIN_MESSAGE, 0, out_str);

            {
                const dmpbuf = C.automaticBuffer("do_look.dmpbuf", C.BUFSZ);

                /* putmixed() bypasses pline() so doesn't write to DUMPLOG;
                   tty puts it into ^P recall, so it ought to be there;
                   DUMPLOG is plain text, so override graphics character;
                   at present, force space, but we ought to use defsyms[]
                   value for the glyph the graphics character came from */
                C.decode_mixed(dmpbuf, out_str);
                if (C.loadChar(dmpbuf, 0) < 32 || C.loadChar(dmpbuf, 0) >= 127) /* ASCII isprint() */
                    C.storeCharAt(dmpbuf, 0, 32);
                C.dumplogmsg(dmpbuf);
            }


            /* check the data file for information about this thing */
            if (found == 1 && ans != C.LOOK_QUICK && ans != C.LOOK_ONCE
                && (ans == C.LOOK_VERBOSE || (C.flags.help && !quick))
                && !clicklook) {
                const temp_buf = C.automaticBuffer("do_look.temp_buf", C.BUFSZ); const supplemental_name = C.automaticBuffer("do_look.supplemental_name", C.BUFSZ);

                C.storeCharAt(supplemental_name, 0, 0);
                C.Strcpy(temp_buf, firstmatch.value);
                C.callLocal(checkfile, temp_buf, pm,
                                 (ans == C.LOOK_VERBOSE) ? chkfilDontAsk
                                                       : chkfilNone,
                                 supplemental_name);
                if (supplemental_pm.value)
                    C.callLocal(do_supplemental_info, supplemental_name, supplemental_pm.value,
                                         Number(ans == C.LOOK_VERBOSE));
            }
        } else {
            C.pline("I've never heard of such things.");
        }
    } while (from_screen && !quick && ans != C.LOOK_ONCE && !clicklook);

    C.flags.verbose = save_verbose;
    return C.ECMD_OK;
}

export function look_region_nearby(lo_x, lo_y, hi_x, hi_y, nearby)
{
    lo_y.value = nearby ? C.max(C.u.uy - C.BOLT_LIM, 0) : 0;
    lo_x.value = nearby ? C.max(C.u.ux - C.BOLT_LIM, 1) : 1;
    hi_y.value = nearby ? C.min(C.u.uy + C.BOLT_LIM, C.ROWNO - 1) : C.ROWNO - 1;
    hi_x.value = nearby ? C.min(C.u.ux + C.BOLT_LIM, C.COLNO - 1) : C.COLNO - 1;
}

 /* RESTORE is after do_supplemental_info() */

export function look_all(nearby, do_mons)
/* True => within BOLTLIM, False => entire map */
/* True => monsters, False => objects */
{
    let win;
    let glyph, count = 0;
    let x, y; const lo_x = C.cell("coord"); const lo_y = C.cell("coord"); const hi_x = C.cell("coord"); const hi_y = C.cell("coord");
    const lookbuf = C.automaticBuffer("look_all.lookbuf", C.BUFSZ); const outbuf = C.automaticBuffer("look_all.outbuf", C.BUFSZ);

    win = C.create_nhwindow(C.NHW_TEXT);
    C.callLocal(look_region_nearby, lo_x, lo_y, hi_x, hi_y, nearby);
    for (y = C.short(lo_y.value); y <= hi_y.value; y++) {
        for (x = C.short(lo_x.value); x <= hi_x.value; x++) {
            C.storeCharAt(lookbuf, 0, 0);
            glyph = C.glyph_at(x, y);
            if (do_mons) {
                if (C.glyph_is_monster(glyph)) {
                    let mtmp;

                    if (C.u_at(x, y) && C.canspotself()) {
                        C.callLocal(self_lookat, lookbuf);
                        ++count;
                    } else if ((mtmp = C.m_at(x, y)) != 0) {
                        C.callLocal(look_at_monster, lookbuf, 0, mtmp, x, y);
                        ++count;
                    }
                } else if (C.glyph_is_invisible(glyph)) {
                    /* remembered, unseen, creature */
                    C.Strcpy(lookbuf, C.invisexplain);
                    ++count;
                } else if (C.glyph_is_warning(glyph)) {
                    let warnindx = C.glyph_to_warning(glyph);

                    C.Strcpy(lookbuf, C.def_warnsyms[warnindx].explanation);
                    ++count;
                }
            } else { /* !do_mons */
                if (C.glyph_is_object(glyph)) {
                    C.callLocal(look_at_object, lookbuf, x, y, glyph);
                    ++count;
                }
            }
            if (C.loadChar(lookbuf)) {
                const coordbuf = C.automaticBuffer("look_all.coordbuf", 20); const which = C.automaticBuffer("look_all.which", 12); let cmode;

                cmode = C.char((C.iflags.getpos_coords != C.GPCOORDS_NONE)
                           ? C.iflags.getpos_coords : C.GPCOORDS_MAP);
                if (count == 1) {
                    C.Strcpy(which, do_mons ? "monsters" : "objects");
                    if (nearby)
                        C.Sprintf(outbuf, "%s currently shown near %s:",
                                C.upstart(which),
                                (cmode != C.GPCOORDS_COMPASS)
                                  ? C.coord_desc(C.u.ux, C.u.uy, coordbuf, cmode)
                                  : !C.canspotself() ? "your position" : "you");
                    else
                        C.Sprintf(outbuf, "All %s currently shown on the map:",
                                which);
                    C.putstr(win, 0, outbuf);
                    /* hack alert! Qt watches a text window for any line
                       with 4 consecutive spaces and renders the window
                       in a fixed-width font it if finds at least one */
                    C.putstr(win, 0, "    "); /* separator */
                }
                C.coord_desc(x, y, coordbuf, cmode);
                /* this format wrinkle makes the commas of <x,y> line up;
                   it isn't needed when all the y values have same number
                   of digits but looks better when there is a mixture of 1
                   and 2 digit values; done unconditionally because we
                   would need two passes over the map to determine whether
                   y width is uniform or a mixture; x width is not a factor
                   because the result gets right-justified by %8s; adding
                   a trailing space effectively pushes non-space text left */
                if (cmode == C.GPCOORDS_MAP && y < 10)
                    C.strkitten(coordbuf, 32);
                /* prefix: "coords  C  " where 'C' is mon or obj symbol */
                C.Sprintf(outbuf, (cmode == C.GPCOORDS_SCREEN) ? "%s  "
                                  : (cmode == C.GPCOORDS_MAP) ? "%8s  "
                                      : "%12s  ",
                        coordbuf);
                C.Sprintf(C.eos(outbuf), "%s  ", C.encglyph(glyph));
                /* guard against potential overflow */
                C.storeCharAt(lookbuf, (C.BUFSZ) - 1 - C.strlen(outbuf), 0);
                C.Strcat(outbuf, lookbuf);
                C.putmixed(win, 0, outbuf);
            }
        }
    }
    if (count)
        C.display_nhwindow(win, C.TRUE);
    else
        C.pline("No %s are currently shown %s.",
              do_mons ? "monsters" : "objects",
              nearby ? "nearby" : "on the map");
    C.destroy_nhwindow(win);
}

/* give a /M style display of discovered traps, even when they're covered */
export function look_traps(nearby)
{
    let win;
    let t;
    let glyph, tnum, count = 0;
    let x, y; const lo_x = C.cell("coord"); const lo_y = C.cell("coord"); const hi_x = C.cell("coord"); const hi_y = C.cell("coord");
    const lookbuf = C.automaticBuffer("look_traps.lookbuf", C.BUFSZ); const outbuf = C.automaticBuffer("look_traps.outbuf", C.BUFSZ);

    win = C.create_nhwindow(C.NHW_TEXT);
    C.callLocal(look_region_nearby, lo_x, lo_y, hi_x, hi_y, nearby);
    for (y = C.short(lo_y.value); y <= hi_y.value; y++) {
        for (x = C.short(lo_x.value); x <= hi_x.value; x++) {
            C.storeCharAt(lookbuf, 0, 0);
            glyph = C.glyph_at(x, y);
            if (C.glyph_is_trap(glyph)) {
                tnum = C.glyph_to_trap(glyph);
                C.callLocal(trap_description, lookbuf, tnum, x, y);
                ++count;
            } else if ((t = C.t_at(x, y)) != 0 && t.tseen
                       /* can't use /" to track traps moved by bubbles or
                          clouds except when hero has direct line of sight */
                       && ((!C.Is_waterlevel(C.u.uz) && !C.Is_airlevel(C.u.uz))
                           || C.couldsee(x, y))) {
                C.Strcpy(lookbuf, C.trapname(t.ttyp, C.FALSE));
                C.Sprintf(C.eos(lookbuf), ", obscured by %s", C.encglyph(glyph));
                glyph = C.trap_to_glyph(t);
                ++count;
            }
            if (C.loadChar(lookbuf)) {
                const coordbuf = C.automaticBuffer("look_traps.coordbuf", 20); let cmode;

                cmode = C.char((C.iflags.getpos_coords != C.GPCOORDS_NONE)
                           ? C.iflags.getpos_coords : C.GPCOORDS_MAP);
                if (count == 1) {
                    C.Sprintf(outbuf, "%sseen or remembered traps%s:",
                            nearby ? "nearby " : "",
                            nearby ? "" : " on this level");
                    C.putstr(win, 0, C.upstart(outbuf));
                    /* hack alert! Qt watches a text window for any line
                       with 4 consecutive spaces and renders the window
                       in a fixed-width font it if finds at least one */
                    C.putstr(win, 0, "    "); /* separator */
                }
                /* prefix: "coords  C  " where 'C' is trap symbol */
                C.Sprintf(outbuf, (cmode == C.GPCOORDS_SCREEN) ? "%s  "
                                  : (cmode == C.GPCOORDS_MAP) ? "%8s  "
                                      : "%12s  ",
                        C.coord_desc(x, y, coordbuf, cmode));
                C.Sprintf(C.eos(outbuf), "%s  ", C.encglyph(glyph));
                /* guard against potential overflow */
                C.storeCharAt(lookbuf, (C.BUFSZ) - 1 - C.strlen(outbuf), 0);
                C.Strcat(outbuf, lookbuf);
                C.putmixed(win, 0, outbuf);
            }
        }
    }
    if (count)
        C.display_nhwindow(win, C.TRUE);
    else
        C.pline("No traps seen or remembered%s.", nearby ? " nearby" : "");
    C.destroy_nhwindow(win);
}

/* display of discovered engravings including headstones, even when they're
   covered provided they've been read */
export function look_engrs(nearby)
{
    let win;
    let e;
    const lookbuf = C.automaticBuffer("look_engrs.lookbuf", C.BUFSZ); const outbuf = C.automaticBuffer("look_engrs.outbuf", C.BUFSZ);
    let x, y; const lo_x = C.cell("coord"); const lo_y = C.cell("coord"); const hi_x = C.cell("coord"); const hi_y = C.cell("coord");
    let is_headstone;
    let sym;
    let glyph, count = 0;

    win = C.create_nhwindow(C.NHW_TEXT);
    C.callLocal(look_region_nearby, lo_x, lo_y, hi_x, hi_y, nearby);
    /*assert(lo_x >= 1 && lo_y >= 0 && hi_x < MAXCO && hi_y < MAXLI);*/
    for (y = C.short(lo_y.value); y <= hi_y.value; y++) {
        for (x = C.short(lo_x.value); x <= hi_x.value; x++) {
            C.storeCharAt(lookbuf, 0, 0);
            if (!C.levl[x][y].seenv)
                continue;
            /* this won't find remembered engravings which aren't there
               anymore (in case the hero is unaware that they're gone;
               scuffed away by monster movement or deleted during shop
               or vault wall repair); not sure what to do about that */
            e = C.engr_at(x, y);
            if (!e)
                continue;
            is_headstone = C.IS_GRAVE(C.svl.lastseentyp[x][y]);
            C.Sprintf(lookbuf, " (%s", is_headstone ? "grave" : "engraving");
            C.callLocal(add_quoted_engraving, x, y, lookbuf, C.TRUE);
            /* the paren is used by farlook and add_quoted_engraving()
               expected to see it; we don't want it here */
            if (is_headstone) {
                C.strsubst(lookbuf, "(grave with ", "");
                C.strsubst(lookbuf, "(grave whose ", "");
            } else {
                C.strsubst(lookbuf, "(engraving with ", "");
                C.strsubst(lookbuf, "(engraving ", "engraving ");
            }

            glyph = C.glyph_at(x, y);
            sym = C.glyph_is_cmap(glyph) ? C.glyph_to_cmap(glyph) : C.SYM_NOTHING;
            if (C.is_cmap_engraving(sym) || sym == C.S_grave) {
                /* engraving or grave+headstone shown on the map */
                ++count;
            } else {
                /* engraving or grave covered by object(s) */
                C.Snprintf("look_engrs", 2190, C.eos(lookbuf), (C.BUFSZ) - C.strlen(lookbuf),
                         ", obscured by %s", C.encglyph(glyph));
                glyph = is_headstone ? C.cmap_to_glyph(C.S_grave)
                                     : C.engraving_to_glyph(e);
                ++count;
            }
            if (C.loadChar(lookbuf)) { /* (redundant) */
                const coordbuf = C.automaticBuffer("look_engrs.coordbuf", 20); let cmode;

                cmode = C.char((C.iflags.getpos_coords != C.GPCOORDS_NONE)
                           ? C.iflags.getpos_coords : C.GPCOORDS_MAP);
                if (count == 1) {
                    C.Sprintf(outbuf, "%sseen or remembered engravings%s:",
                            nearby ? "nearby " : "",
                            nearby ? "" : " on this level");
                    C.putstr(win, 0, C.upstart(outbuf));
                    /* hack alert! Qt watches a text window for any line
                       with 4 consecutive spaces and renders the window
                       in a fixed-width font it if finds at least one */
                    C.putstr(win, 0, "    "); /* separator */
                }
                /* prefix: "coords  C  " where 'C' is engrvng|grave symbol */
                C.Sprintf(outbuf, (cmode == C.GPCOORDS_SCREEN) ? "%s  "
                                  : (cmode == C.GPCOORDS_MAP) ? "%8s  "
                                      : "%12s  ",
                        C.coord_desc(x, y, coordbuf, cmode));
                C.Sprintf(C.eos(outbuf), "%s ", C.encglyph(glyph));
                /* guard against potential overflow */
                C.storeCharAt(lookbuf, (C.BUFSZ) - 1 - C.strlen(outbuf), 0);
                C.Strcat(outbuf, lookbuf);
                C.putmixed(win, 0, outbuf);
            }
        }
    }
    if (count)
        C.display_nhwindow(win, C.TRUE);
    else
        C.pline("No engravings seen or remembered%s.", nearby ? " nearby" : "");
    C.destroy_nhwindow(win);
}

const suptext1 = [
    "%s is a member of a marauding horde of orcs",
    "rumored to have brutally attacked and plundered",
    "the ordinarily sheltered town that is located ",
    "deep within The Gnomish Mines.",
    "",
    "The members of that vicious horde proudly and ",
    "defiantly acclaim their allegiance to their",
    "leader %s in their names.",
    0,
];

const suptext2 = [
    "\"%s\" is the common dungeon name of",
    "a nefarious orc who is known to acquire property",
    "from thieves and sell it off for profit.",
    "",
    "The perpetrator was last seen hanging around the",
    "stairs leading to the Gnomish Mines.",
    0,
];

export function do_supplemental_info(name, pm, without_asking)
{
    let textp;
    let datawin = C.WIN_ERR;
    let entrytext = name, bp = 0, bp2 = 0;
    const question = C.automaticBuffer("do_supplemental_info.question", C.QBUFSZ);
    let yes_to_moreinfo = C.FALSE;
    let is_marauder = C.is_orc(pm);

    /*
     * Provide some info on some specific things
     * meant to support in-game mythology, and not
     * available from data.base or other sources.
     */
    if (is_marauder && (C.strlen(name) < (C.BUFSZ - 1))) {
        const fullname = C.automaticBuffer("do_supplemental_info.fullname", C.BUFSZ);

        bp = C.strstri(name, " of ");
        bp2 = C.strstri(name, " the Fence");

        if (bp || bp2) {
            C.Strcpy(fullname, name);
            if (!without_asking) {
                C.Strcpy(question, "More info about \"");
                /* +2 => length of "\"?" */
                C.copynchars(C.eos(question), entrytext,
                        ((C.QBUFSZ) - 1 - (C.strlen(question) + 2)));
                C.Strcat(question, "\"?");
                if (C.y_n(question) == 121)
                yes_to_moreinfo = C.TRUE;
            }
            if (yes_to_moreinfo) {
                let i, subs = 0;
                let gang = 0;

                if (bp) {
                    textp = C.staticStrings("suptext1", suptext1);
                    gang = bp + 4;
                    C.storeCharAt(bp, 0);
                } else {
                    textp = C.staticStrings("suptext2", suptext2);
                    gang = "";
                }
                datawin = C.create_nhwindow(C.NHW_MENU);
                for (i = 0; textp[i]; i++) {
                    const buf = C.automaticBuffer("do_supplemental_info.buf", C.BUFSZ);
                    let txt;

                    if (C.strstri(textp[i], "%s") != 0) {
                        C.Sprintf(buf, textp[i], subs++ ? gang : fullname);
                        txt = buf;
                    } else
                        txt = textp[i];
                    C.putstr(datawin, 0, txt);
                }
                C.display_nhwindow(datawin, C.FALSE);
                C.destroy_nhwindow(datawin), datawin = C.WIN_ERR;
            }
        }
    }
}



/* the #whatis command */
export function dowhatis()
{
    return C.callLocal(do_look, 0, 0);
}

/* the #glance command */
export function doquickwhatis()
{
    return C.callLocal(do_look, 1, 0);
}

/* the #showtrap command */
export function doidtrap()
{
    let trap;
    let tt, glyph;
    let x, y;

    if (!C.getdir("^"))
        return C.ECMD_CANCEL;
    x = C.short(C.u.ux + C.u.dx);
    y = C.short(C.u.uy + C.u.dy);

    /* trapped doors and chests used to be shown as fake bear traps;
       they have their own trap types now but aren't part of the ftrap
       chain; usually they revert to normal door or chest when the hero
       sees them but player might be using '^' while the hero is blind */
    glyph = C.glyph_at(x, y);
    if (C.glyph_is_trap(glyph)
        && ((tt = C.glyph_to_trap(glyph)) == C.BEAR_TRAP
            || tt == C.TRAPPED_DOOR || tt == C.TRAPPED_CHEST)) {
        let chesttrap = C.trapped_chest_at(tt, x, y);

        if (chesttrap || C.trapped_door_at(tt, x, y)) {
            C.pline("That is a trapped %s.", chesttrap ? "chest" : "door");
            return C.ECMD_OK; /* trap ID'd, but no time elapses */
        }
    }

    for (trap = C.gf.ftrap; trap; trap = trap.ntrap)
        if (trap.tx == x && trap.ty == y) {
            if (!trap.tseen)
                break;
            tt = trap.ttyp;
            if (C.u.dz) {
                if (C.u.dz < 0 ? C.is_hole(tt) : tt == C.ROCKTRAP)
                    break;
            }
            C.pline("That is %s%s%s.",
                  C.an(C.trapname(tt, C.FALSE)),
                  !trap.madeby_u
                     ? ""
                     : (tt == C.WEB)
                        ? " woven"
                        /* trap doors & spiked pits can't be made by
                           player, and should be considered at least
                           as much "set" as "dug" anyway */
                        : (tt == C.HOLE || tt == C.PIT)
                           ? " dug"
                           : " set",
                  !trap.madeby_u ? "" : " by you");
            return C.ECMD_OK;
        }
    C.pline("I can't see a trap there.");
    return C.ECMD_OK;
}

/*
    Implements a rudimentary if/elif/else/endif interpreter and use
    conditionals in dat/cmdhelp to describe what command each keystroke
    currently invokes, so that there isn't a lot of "(debug mode only)"
    and "(if number_pad is off)" cluttering the feedback that the user
    sees.  (The conditionals add quite a bit of clutter to the raw data
    but users don't see that.  number_pad produces a lot of conditional
    commands:  basic letters vs digits, 'g' vs 'G' for '5', phone
    keypad vs normal layout of digits, and QWERTZ keyboard swap between
    y/Y/^Y/M-y/M-Y/M-^Y and z/Z/^Z/M-z/M-Z/M-^Z.)

    The interpreter understands
     '&#' for comment,
     '&? option' for 'if' (also '&? !option'
                           or '&? option=value[,value2,...]'
                           or '&? !option=value[,value2,...]'),
     '&: option' for 'elif' (with argument variations same as 'if';
                             any number of instances for each 'if'),
     '&:' for 'else' (also '&: #comment';
                      0 or 1 instance for a given 'if'), and
     '&.' for 'endif' (also '&. #comment'; required for each 'if').

    The option handling is a bit of a mess, with no generality for
    which options to deal with and only a comma separated list of
    integer values for the '=value' part.  number_pad is the only
    supported option that has a value; the few others (wizard/debug,
    rest_on_space, #if SHELL, #if SUSPEND) are booleans.
*/

export function whatdoes_help()
{
    let fp;
    let p; const buf = C.automaticBuffer("whatdoes_help.buf", C.BUFSZ);
    let tmpwin;

    fp = C.dlb_fopen(C.KEYHELP, "r");
    if (!fp) {
        C.pline("Cannot open \"%s\" data file!", C.KEYHELP);
        C.display_nhwindow(C.WIN_MESSAGE, C.TRUE);
        return;
    }
    tmpwin = C.create_nhwindow(C.NHW_TEXT);
    while (C.dlb_fgets(buf, (C.BUFSZ), fp)) {
        if (C.loadChar(buf) == 35)
            continue;
        for (p = buf; C.loadChar(p); p++)
            if (C.loadChar(p) != 32 && C.loadChar(p) != 9)
                break;
        C.putstr(tmpwin, 0, p);
    }
    C.dlb_fclose(fp);
    C.display_nhwindow(tmpwin, C.TRUE);
    C.destroy_nhwindow(tmpwin);
}


































































































































export function dowhatdoes_core(q, cbuf)
{
    const buf = C.automaticBuffer("dowhatdoes_core.buf", C.BUFSZ);






    let ec_desc;

    if ((ec_desc = C.key2extcmddesc(q)) != C.NULL) {
        const keybuf = C.automaticBuffer("dowhatdoes_core.keybuf", C.QBUFSZ);

        /* note: if "%-8s" gets changed, the "%8.8s" in dowhatdoes() will
           need a comparable change */
        C.Sprintf(buf, "%-8s%s.", C.key2txt(q, keybuf), ec_desc);
        C.Strcpy(cbuf, buf);
        return cbuf;
    }
    return 0;

























































}

/* the whatdoes command */
export function dowhatdoes()
{
    
    const bufr = C.automaticBuffer("dowhatdoes.bufr", C.BUFSZ);
    let q, reslt;

    if (!C.pagerState.once) {
        C.pline("Ask about '&' or '?' to get more info.%s",

              C.iflags.altmeta ? "  (For ESC, type it twice.)" :

              "");
        C.pagerState.once = C.TRUE;
    }

    C.introff(); /* disables ^C but not ^\ */

    q = C.char(C.yn_function("What command?", 0, 0, C.TRUE));

    if (q == 27 && C.iflags.altmeta) {
        /* in an ideal world, we would know whether another keystroke
           was already pending, but this is not an ideal world...
           if user typed ESC, we'll essentially hang until another
           character is typed */
        q = C.char(C.yn_function("]", 0, 0, C.TRUE));
        if (q != 27)
            q = C.char(C.char(C.unsignedChar(q) | 128));
    }


    C.intron(); /* reenables ^C */

    reslt = C.callLocal(dowhatdoes_core, q, bufr);
    if (reslt) {
        let p = C.strchr(reslt, 10); /* 'm' prefix has two lines of output */

        if (q == 38 || q == 63)
            C.callLocal(whatdoes_help, );
        if (!p) {
            /* normal usage; 'reslt' starts with key, some indentation, and
               then explanation followed by '.' for sentence punctuation */
            C.pline("%s", reslt);
        } else {
            /* for 'm' prefix, where 'reslt' has an embedded newline to
               indicate and separate two lines of output; we add a comma to
               first line so that the combination is a complete sentence */
            C.storeCharAt(p, 0); /* replace embedded newline with end of first line */
            C.pline("%s,", reslt);
            /* cheat by knowing how dowhatdoes_core() handles key portion */
            C.pline("%8.8s%s", reslt, p + 1);
        }
    } else {
        C.pline("No such command '%s', char code %d (0%03o or 0x%02x).",
              C.visctrl(q), C.unsignedChar(q), C.unsignedChar(q), C.unsignedChar(q));
    }
    return C.ECMD_OK;
}

export function docontact()
{
    let cwin = C.create_nhwindow(C.NHW_TEXT);
    const buf = C.automaticBuffer("docontact.buf", C.BUFSZ);

    if (C.sysopt.support) {
        /*XXX overflow possibilities*/
        C.Sprintf(buf, "To contact local support, %s", C.sysopt.support);
        C.putstr(cwin, 0, buf);
        C.putstr(cwin, 0, "");
    } else if (C.sysopt.fmtd_wizard_list) { /* formatted SYSCF WIZARDS */
        C.Sprintf(buf, "To contact local support, contact %s.",
                C.sysopt.fmtd_wizard_list);
        C.putstr(cwin, 0, buf);
        C.putstr(cwin, 0, "");
    }
    C.putstr(cwin, 0, "To contact the NetHack development team directly,");
    /*XXX overflow possibilities*/
    C.Sprintf(buf, "see the 'Contact' form on our website or email <%s>.",
            C.DEVTEAM_EMAIL);
    C.putstr(cwin, 0, buf);
    C.putstr(cwin, 0, "");
    C.putstr(cwin, 0, "For more information on NetHack, or to report a bug,");
    C.Sprintf(buf, "visit our website \"%s\".", C.DEVTEAM_URL);
    C.putstr(cwin, 0, buf);
    C.display_nhwindow(cwin, C.FALSE);
    C.destroy_nhwindow(cwin);
}

export function dispfile_help()
{
    C.display_file(C.HELP, C.TRUE);
}

export function dispfile_shelp()
{
    C.display_file(C.SHELP, C.TRUE);
}

export function dispfile_optionfile()
{
    C.display_file(C.OPTIONFILE, C.TRUE);
}

export function dispfile_optmenu()
{
    C.display_file(C.OPTMENUHELP, C.TRUE);
}

export function dispfile_license()
{
    C.display_file(C.LICENSE, C.TRUE);
}

export function dispfile_debughelp()
{
    C.display_file(C.DEBUGHELP, C.TRUE);
}

export function dispfile_usagehelp()
{
    C.display_file(C.USAGEHELP, C.TRUE);
}

export function hmenu_doextversion()
{
    C.doextversion();
}

export function hmenu_dohistory()
{
    C.callLocal(dohistory, );
}

export function hmenu_dowhatis()
{
    C.callLocal(dowhatis, );
}

export function hmenu_dowhatdoes()
{
    C.callLocal(dowhatdoes, );
}

export function hmenu_doextlist()
{
    C.doextlist();
}

export function domenucontrols()
{
    let cwin = C.create_nhwindow(C.NHW_TEXT);

    C.show_menu_controls(cwin, C.FALSE);
    C.display_nhwindow(cwin, C.FALSE);
    C.destroy_nhwindow(cwin);
}

/* data for dohelp() */
const help_menu_items = [
    { f: "hmenu_doextversion", text: "About NetHack (version information)." },
    { f: "dispfile_help", text: "Long description of the game and commands." },
    { f: "dispfile_shelp", text: "List of game commands." },
    { f: "hmenu_dohistory", text: "Concise history of NetHack." },
    { f: "hmenu_dowhatis", text: "Info on a character in the game display." },
    { f: "hmenu_dowhatdoes", text: "Info on what a given key does." },
    { f: "option_help", text: "List of game options." },
    { f: "dispfile_optionfile", text: "Longer explanation of game options." },
    { f: "dispfile_optmenu", text: "Using the %s command to set options." },
    { f: "dokeylist", text: "Full list of keyboard commands." },
    { f: "hmenu_doextlist", text: "List of extended commands." },
    { f: "domenucontrols", text: "List menu control keys." },
    { f: "dispfile_usagehelp", text: "Description of NetHack's command line." },
    { f: "dispfile_license", text: "The NetHack license." },
    { f: "docontact", text: "Support information." },



    { f: "dispfile_debughelp", text: "List of wizard-mode commands." },
    { f: 0, text: 0 }
];



/* the #help command */
export function dohelp()
{
    let tmpwin = C.create_nhwindow(C.NHW_MENU);
    const helpbuf = C.automaticBuffer("dohelp.helpbuf", C.QBUFSZ); const tmpbuf = C.automaticBuffer("dohelp.tmpbuf", C.QBUFSZ);
    let i, n;
    const selected = C.cell("menu");
    const any = C.localAnything();
    let sel;
    let clr = C.NO_COLOR;

    C.copyAnything(any, C.cg.zeroany); /* zero all bits */
    C.start_menu(tmpwin, C.MENU_BEHAVE_STANDARD);

    for (i = 0; help_menu_items[i].text; i++) {
        if (!C.wizard && C.functionAddress(help_menu_items[i].f) == C.functionAddress("dispfile_debughelp"))
            continue;
        if (C.sysopt.hideusage && C.functionAddress(help_menu_items[i].f) == C.functionAddress("dispfile_usagehelp"))
            continue;

        if (C.loadChar(C.literal(help_menu_items[i].text)) == 37) {
            C.Sprintf(helpbuf, help_menu_items[i].text, C.PORT_ID);
        } else if (C.functionAddress(help_menu_items[i].f) == C.functionAddress("dispfile_optmenu")) {
            C.Sprintf(helpbuf, help_menu_items[i].text, C.callLocal(setopt_cmd, tmpbuf));
        } else {
            C.Strcpy(helpbuf, help_menu_items[i].text);
        }
        any.a_int = i + 1;
        C.add_menu(tmpwin, C.nul_glyphinfo, any, 0, 0, C.ATR_NONE, clr,
                 helpbuf, C.MENU_ITEMFLAGS_NONE);
    }
    C.end_menu(tmpwin, "Select one item:");
    n = C.select_menu(tmpwin, C.PICK_ONE, selected);
    C.destroy_nhwindow(tmpwin);
    if (n > 0) {
        sel = selected.value[0].item.a_int - 1;
        C.free(selected.value);
        C.callHelp(C.functionAddress(help_menu_items[sel].f));
    }
    return C.ECMD_OK;
}



/* format the key or extended command name of command used to set options;
   normally 'O' but could be bound to something else, or not bound at all;
   with the implementation of a simple options subset, now need 'mO' to get
   the full options command; format it as 'm O' */
export function setopt_cmd(outbuf)
{
    const cmdbuf = C.automaticBuffer("setopt_cmd.cmdbuf", C.QBUFSZ);
    let cmdnm;
    let key;

    C.Strcpy(outbuf, "\'");
    /* #optionsfull */
    key = C.char(C.cmd_from_func(C.functionAddress("doset")));
    if (key) {
        C.Strcat(outbuf, C.visctrl(key));
    } else {
        /* extended command name, with leading "#" */
        cmdnm = C.cmdname_from_func(C.functionAddress("doset"), cmdbuf, C.TRUE);
        if (!cmdnm) /* paranoia */
            cmdnm = "optionsfull";
        C.Sprintf(C.eos(outbuf), "%s%.31s", (C.loadChar(cmdnm) != 35) ? "#" : "", cmdnm);

        /* since there's no key bound to #optionsfull, include 'm O' */
        C.Strcat(outbuf, "\' or \'");
        /* m prefix plus #options */
        key = C.char(C.cmd_from_func(C.functionAddress("do_reqmenu")));
        if (key) {
            /* key for 'm' prefix */
            C.Strcat(outbuf, C.visctrl(key));
        } else {
            /* extended command name for 'm' prefix */
            cmdnm = C.cmdname_from_func(C.functionAddress("do_reqmenu"), cmdbuf, C.TRUE);
            if (!cmdnm)
                cmdnm = "reqmenu";
            C.Sprintf(C.eos(outbuf), "%s%.31s", (C.loadChar(cmdnm) != 35) ? "#" : "", cmdnm);
        }
        /* this is slightly iffy because the user shouldn't type <space> to
           get the command we're describing, but it improves readability */
        C.Strcat(outbuf, " ");
        /* now #options, normally 'O' */
        key = C.char(C.cmd_from_func(C.functionAddress("doset_simple")));
        if (key) {
            C.Strcat(outbuf, C.visctrl(key));
        } else {
            /* extended command name */
            cmdnm = C.cmdname_from_func(C.functionAddress("doset_simple"), cmdbuf, C.TRUE);
            if (!cmdnm) /* paranoia */
                cmdnm = "options";
            C.Sprintf(C.eos(outbuf), "%s%.31s", (C.loadChar(cmdnm) != 35) ? "#" : "", cmdnm);
        }
    }
    C.Strcat(outbuf, "\'");
    return outbuf;
}

/* the 'V' command; also a choice for '?' */
export function dohistory()
{
    C.display_file(C.HISTORY, C.TRUE);
    return C.ECMD_OK;
}

/*pager.c*/

/* lookat() can return Null */

/* [disable this for the time being] */

/* bullet proofing */

/* lint suppression */

/* we have a value specified */

/* handle a space before or after (or both) '=' (or ':') */

/* end of keyword in buf[] */

/* terminate keyword, advance to start of value */

/* convert internal encoding (separate yes/no and 0..3)
                   back to user-visible one (-1..4) */

/* 1..4 */

/* -1..0 */

/* == wizard */

/* should we also check sysopt.shellers? */

/* sysopt.shellers is also used for dosuspend()... */

/* this works for number_pad too: &? !number_pad:-1,0
           would be true for 1..4 after negation */

/* comment */

/* endif */

/* else or elif */

/* so that stack[*depth - 1] is a valid access */

/* if */

/* 0 */

/* NUL -> '@', ^A -> 'A', ... ^Z -> 'Z', ^[ -> '[', ... */

/*ALTMETA*/
