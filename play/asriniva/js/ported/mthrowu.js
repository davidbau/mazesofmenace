import {C} from '../c-runtime/context.js';
/* NetHack 5.0	mthrowu.c	$NHDT-Date: 1737392015 2025/01/20 08:53:35 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.173 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Pasi Kallinen, 2016. */
/* NetHack may be freely redistributed.  See license for details. */














/*
 * Keep consistent with breath weapons in zap.c, and AD_* in monattk.h.
 */
export const breathwep = [
    "fragments", "fire", "frost", "sleep gas", "a disintegration blast",
    "lightning", "poison gas", "acid", "strange breath #8",
    "strange breath #9"
];

/* hallucinatory ray types */
export const hallublasts = [
    "asteroids", "beads", "bubbles", "butterflies", "champagne", "chaos",
    "coins", "cotton candy", "crumbs", "dark matter", "darkness", "data",
    "dust specks", "emoticons", "emotions", "entropy", "flowers", "foam",
    "fog", "gamma rays", "gelatin", "gemstones", "ghosts", "glass shards",
    "glitter", "good vibes", "gravel", "gravity", "gravy", "grawlixes",
    "holy light", "hornets", "hot air", "hyphens", "hypnosis", "infrared",
    "insects", "jargon", "laser beams", "leaves", "lightening", "logic gates",
    "magma", "marbles", "mathematics", "megabytes", "metal shavings",
    "metapatterns", "meteors", "mist", "mud", "music", "nanites", "needles",
    "noise", "nostalgia", "oil", "paint", "photons", "pixels", "plasma",
    "polarity", "powder", "powerups", "prismatic light", "pure logic",
    "purple", "radio waves", "rainbows", "rock music", "rocket fuel", "rope",
    "sadness", "salt", "sand", "scrolls", "sludge", "smileys", "snowflakes",
    "sparkles", "specularity", "spores", "stars", "steam", "tetrahedrons",
    "text", "the past", "tornadoes", "toxic waste", "ultraviolet light",
    "viruses", "water", "waveforms", "wind", "X-rays", "zorkmids"
];

/* Return a random hallucinatory blast. */
export function rnd_hallublast()
{
    return hallublasts[C.rn2(hallublasts.length, "rnd_hallublast", 54)];
}

export function m_has_launcher_and_ammo(mtmp)
{
    let mwep = C.MON_WEP(mtmp);

    if (mwep && C.is_launcher(mwep)) {
    let otmp;

        for (otmp = mtmp.minvent; otmp; otmp = otmp.nobj)
            if (C.ammo_and_launcher(otmp, mwep))
                return 1;
    }
    return 0;
}

/* hero is hit by something other than a monster (though it could be a
   missile thrown or shot by a monster) */
/* pseudo-level used when deciding whether to hit hero's AC */
/* if null, then format `*objp' */
export function thitu(tlev, dam, objp, name)
{
    let obj = objp ? objp.value : 0;
    let onm, knm;
    let is_acid, named = (name != 0);
    let kprefix = C.KILLED_BY_AN, dieroll;
    const onmbuf = C.stackAlloc(C.BUFSZ), knmbuf = C.stackAlloc(C.BUFSZ);

    if (!name) {
        if (!obj)
            C.panic("thitu: name & obj both null?");
        name = C.strcpy(onmbuf,
                      (obj.quan > 1n) ? C.doname(obj) : C.mshot_xname(obj));
        knm = C.strcpy(knmbuf, C.killer_xname(obj));
        kprefix = C.KILLED_BY; /* killer_name supplies "an" if warranted */
    } else {
        knm = name;
        /* [perhaps ought to check for plural here too] */
        if (!C.strncmpi(name, "the ", 4) || !C.strncmpi(name, "an ", 3)
            || !C.strncmpi(name, "a ", 2))
            kprefix = C.KILLED_BY;
    }
    onm = (obj && C.obj_is_pname(obj)) ? C.the(name)
          : (obj && obj.quan > 1n) ? name
            : C.an(name);
    is_acid = (obj && obj.otyp == C.ACID_VENOM);

    if (C.u.uac + tlev <= (dieroll = C.rnd(20, "thitu", 106))) {
        ++C.gm.mesg_given;
        if (C.Blind || !C.flags.verbose) {
            C.pline("It misses.");
        } else if (C.u.uac + tlev <= dieroll - 2) {
            if (onm != onmbuf)
                C.Strcpy(onmbuf, onm); /* [modifiable buffer for upstart()] */
            C.pline("%s %s you.", C.upstart(onmbuf), C.vtense(onmbuf, "miss"));
        } else
            C.You("are almost hit by %s.", onm);
        return 0;
    } else {
        if (C.Blind || !C.flags.verbose)
            C.You("are hit%s", C.exclam(dam));
        else
            C.You("are hit by %s%s", onm, C.exclam(dam));

        if (is_acid && C.Acid_resistance) {
            C.pline("It doesn't seem to hurt you.");
            C.monstseesu(C.M_SEEN_ACID);
        } else if (obj && C.stone_missile(obj)
                   && C.passes_rocks(C.gy.youmonst.data)) {
            /* use 'named' as an approximation for "hitting from above";
               we avoid "passes through you" for horizontal flight path
               because missile stops and that wording would suggest that
               it should keep going */
            C.pline("It %s you.",
                  named ? "passes harmlessly through" : "doesn't harm");
        } else if (obj && obj.oclass == C.POTION_CLASS) {
            /* an explosion which scatters objects might hit hero with one
               (potions deliberately thrown at hero are handled by m_throw) */
            C.potionhit(C.gy.youmonst, obj, C.POTHIT_OTHER_THROW);
            objp.value = obj = 0; /* potionhit() uses up the potion */
        } else {
            if (obj && C.objects[obj.otyp].oc_material == C.SILVER
                && C.Hate_silver) {
                /* extra damage already applied by dmgval() */
                C.pline_The("silver sears your flesh!");
                C.exercise(C.A_CON, 0);
            }
            if (is_acid) {
                C.pline("It burns!");
                C.monstunseesu(C.M_SEEN_ACID);
            }
            C.losehp(dam, knm, kprefix); /* acid damage */
            C.exercise(C.A_STR, 0);
        }
        return 1;
    }
}

/* Be sure this corresponds with what happens to player-thrown objects in
 * dothrow.c (for consistency). --KAA
 * Returns FALSE if object still exists (not destroyed).
 */
export function drop_throw(obj, ohit, x, y)
{
    let broken;

    if (obj.otyp == C.CREAM_PIE || obj.oclass == C.VENOM_CLASS
        || (ohit && obj.otyp == C.EGG)) {
        broken = 1;
    } else {
        broken = (ohit && C.should_mulch_missile(obj)) ? 1 : 0;
    }

    if (broken) {
        C.delobj(obj);
    } else {
        if (C.down_gate(x, y) != -1)
            broken = C.ship_object(obj, x, y, 0);
        if (!broken) {
    let mtmp = C.m_at(x, y);
            if (!(broken = C.flooreffects(obj, x, y, "fall"))) {
                C.place_object(obj, x, y);
                if (!mtmp && C.u_at(x, y))
                    mtmp = C.gy.youmonst;
                if (mtmp && ohit)
                    C.passive_obj(mtmp, obj, 0);
                C.stackobj(obj);
            }
        }
    }
    C.gt.thrownobj = 0;
    return broken;
}

/* calculate multishot volley count for mtmp throwing otmp (if not ammo) or
   shooting otmp with mwep (if otmp is ammo and mwep appropriate launcher) */
export function monmulti(mtmp, otmp, mwep)
{
    let multishot = 1;

    if (otmp.quan > 1n /* no point checking if there's only 1 */
        /* ammo requires corresponding launcher be wielded */
        && (C.is_ammo(otmp)
               ? C.matching_launcher(otmp, mwep)
               /* otherwise any stackable (non-ammo) weapon */
               : otmp.oclass == C.WEAPON_CLASS)
        && !mtmp.mconf) {
        /* Assumes lords are skilled, princes are expert */
        if (C.is_prince(mtmp.data))
            multishot += 2;
        else if (C.is_lord(mtmp.data))
            multishot++;
        /* fake players treated as skilled (regardless of role limits) */
        else if (C.is_mplayer(mtmp.data))
            multishot++;

        /* this portion is different from hero multishot; from slash'em?
         */
        /* Elven Craftsmanship makes for light, quick bows */
        if (otmp.otyp == C.ELVEN_ARROW && !otmp.cursed)
            multishot++;
        /* for arrow, we checked bow&arrow when entering block, but for
           bow, so far we've only validated that otmp is a weapon stack;
           need to verify that it's a stack of arrows rather than darts */
        if (mwep && mwep.otyp == C.ELVEN_BOW && C.ammo_and_launcher(otmp, mwep)
            && !mwep.cursed)
            multishot++;
        /* 1/3 of launcher enchantment */
        if (C.ammo_and_launcher(otmp, mwep) && mwep.spe > 1)
            multishot += C.rounddiv(mwep.spe, 3);
        /* Some randomness */
        multishot = C.rnd(multishot, "monmulti", 238);

        /* class bonus */
        multishot += C.multishot_class_bonus(C.monsndx(mtmp.data), otmp, mwep);

        /* racial bonus */
        if ((C.is_elf(mtmp.data) && otmp.otyp == C.ELVEN_ARROW
             && mwep && mwep.otyp == C.ELVEN_BOW)
            || (C.is_orc(mtmp.data) && otmp.otyp == C.ORCISH_ARROW
                && mwep && mwep.otyp == C.ORCISH_BOW)
            || (C.is_gnome(mtmp.data) && otmp.otyp == C.CROSSBOW_BOLT
                && mwep && mwep.otyp == C.CROSSBOW))
            multishot++;
    }

    if (otmp.quan < multishot)
        multishot = C.int(otmp.quan);
    if (multishot < 1)
        multishot = 1;
    return multishot;
}

/* mtmp throws otmp, or shoots otmp with mwep, at hero or at monster mtarg */
export function monshoot(mtmp, otmp, mwep)
{
    let mtarg = C.gm.mtarget;
    let dm = C.distmin(mtmp.mx, mtmp.my,
                     mtarg ? mtarg.mx : mtmp.mux,
                     mtarg ? mtarg.my : mtmp.muy),
        multishot = monmulti(mtmp, otmp, mwep);

    /*
     * Caller must have called linedup() to set up <gt.tbx, gt.tby>.
     */

    if (C.canseemon(mtmp)) {
    let onm;
        const onmbuf = C.stackAlloc(C.BUFSZ), trgbuf = C.stackAlloc(C.BUFSZ);

        if (multishot > 1) {
            /* "N arrows"; multishot > 1 implies otmp->quan > 1, so
               xname()'s result will already be pluralized */
            C.Sprintf(onmbuf, "%d %s", multishot, C.xname(otmp));
            onm = onmbuf;
        } else {
            /* "an arrow" */
            onm = C.singular(otmp, C.xname);
            onm = C.obj_is_pname(otmp) ? C.the(onm) : C.an(onm);
        }
        C.gm.m_shot.s = C.ammo_and_launcher(otmp, mwep) ? 1 : 0;
        C.Strcpy(trgbuf, mtarg ? C.some_mon_nam(mtarg) : "");
        C.set_msg_xy(mtmp.mx, mtmp.my);
        C.pline("%s %s %s%s%s!", C.Monnam(mtmp),
              C.gm.m_shot.s ? "shoots" : "throws", onm,
              mtarg ? " at " : "", trgbuf);
        C.gm.m_shot.o = otmp.otyp;
    } else {
        C.gm.m_shot.o = C.STRANGE_OBJECT; /* don't give multishot feedback */
    }
    C.gm.m_shot.n = multishot;
    for (C.gm.m_shot.i = 1; C.gm.m_shot.i <= C.gm.m_shot.n; C.gm.m_shot.i++) {
        C.callLocal(m_throw, mtmp, mtmp.mx, mtmp.my, C.sgn(C.gt.tbx), C.sgn(C.gt.tby), dm, otmp);
        /* conceptually all N missiles are in flight at once, but
           if mtmp gets killed (shot kills adjacent gas spore and
           triggers explosion, perhaps), inventory will be dropped
           and otmp might go away via merging into another stack */
        if (C.DEADMONSTER(mtmp) && C.gm.m_shot.i < C.gm.m_shot.n)
            /* cancel pending shots (perhaps ought to give a message here
               since we gave one above about throwing/shooting N missiles) */
            break; /* endmultishot(FALSE); */
    }
    /* reset 'gm.m_shot' */
    C.gm.m_shot.n = C.gm.m_shot.i = 0;
    C.gm.m_shot.o = C.STRANGE_OBJECT;
    C.gm.m_shot.s = 0;
}

/* an object launched by someone/thing other than player attacks a monster;
   return 1 if the object has stopped moving (hit or its range used up);
   can anger the monster, if this happened due to hero (eg. exploding
   bag of holding throwing the items) */
/* accidental target, located at <gb.bhitpos.x,.y> */
/* missile; might be destroyed by drop_throw */
/* how much farther will object travel if it misses;
                         * use -1 to signify to keep going even after hit,
                         * unless it's gone (for rolling_boulder_traps) */
/* give messages even when you can't see what happened */
export function ohitmon(mtmp, otmp, range, verbose)
{
    let damage, tmp;
    let vis, ismimic, objgone;
    let mon_launcher = C.gm.marcher ? C.MON_WEP(C.gm.marcher) : 0;

    /* assert(otmp != NULL); */
    C.gn.notonhead = (C.gb.bhitpos.x != mtmp.mx || C.gb.bhitpos.y != mtmp.my);
    ismimic = C.M_AP_TYPE(mtmp) && C.M_AP_TYPE(mtmp) != C.M_AP_MONSTER;
    vis = C.cansee(C.gb.bhitpos.x, C.gb.bhitpos.y);
    if (vis)
        C.observe_object(otmp);

    tmp = 5 + C.find_mac(mtmp) + C.omon_adj(mtmp, otmp, 0);
    /* High level monsters will be more likely to hit */
    /* This check applies only if this monster is the target
     * the archer was aiming at. */
    if (C.gm.marcher && C.gm.mtarget == mtmp) {
        if (C.gm.marcher.m_lev > 5)
            tmp += C.gm.marcher.m_lev - 5;
        if (mon_launcher && mon_launcher.oartifact)
            tmp += C.spec_abon(mon_launcher, mtmp);
    }
    if (tmp < C.rnd(20, "ohitmon", 350)) {
        if (!ismimic) {
            if (vis)
                C.miss(C.distant_name(otmp, C.mshot_xname), mtmp);
            else if (verbose && !C.gm.mtarget)
                C.pline("It is missed.");
        }
        if (!range) { /* Last position; object drops */
            drop_throw(otmp, 0, mtmp.mx, mtmp.my);
            return 1;
        }
    } else if (otmp.oclass == C.POTION_CLASS) {
        if (ismimic)
            C.seemimic(mtmp);
        mtmp.msleeping = 0;
        /* probably thrown by a monster rather than 'other', but the
           distinction only matters when hitting the hero */
        C.potionhit(mtmp, otmp, C.POTHIT_OTHER_THROW);
        return 1;
    } else {
    let material = C.objects[otmp.otyp].oc_material;
    let harmless = (C.stone_missile(otmp) && C.passes_rocks(mtmp.data));

        damage = C.dmgval(otmp, mtmp);
        if (otmp.otyp == C.ACID_VENOM && C.resists_acid(mtmp))
            damage = 0;
/* can't use this because we don't have the attacker */
        if (ismimic)
            C.seemimic(mtmp);
        mtmp.msleeping = 0;
        
        if (vis) {
            if (otmp.otyp == C.EGG) {
                C.pline("Splat!  %s is hit with %s egg!", C.Monnam(mtmp),
                      otmp.known ? C.an(C.mons[otmp.corpsenm].pmnames[C.NEUTRAL])
                                  : "an");
            } else {
                const how = C.stackAlloc(C.BUFSZ);

                if (!harmless)
                    C.Strcpy(how, C.exclam(damage)); /* "!" or "." */
                else
                    C.Sprintf(how, " but passes harmlessly through %.9s.",
                            C.mhim(mtmp));
                C.hit(C.distant_name(otmp, C.mshot_xname), mtmp, how);
            }
        } else if (verbose && !C.gm.mtarget)
            C.pline("%s%s is hit%s", (otmp.otyp == C.EGG) ? "Splat!  " : "",
                  C.Monnam(mtmp), C.exclam(damage));

        if (otmp.opoisoned && C.is_poisonable(otmp)) {
            if (C.resists_poison(mtmp)) {
                if (vis)
                    C.pline_The("poison doesn't seem to affect %s.",
                              C.mon_nam(mtmp));
            } else {
                if (C.rn2(30, "ohitmon", 409)) {
                    damage += C.rnd(6, "ohitmon", 410);
                } else {
                    if (vis)
                        C.pline_The("poison was deadly...");
                    damage = mtmp.mhp;
                }
            }
        }
        if (material == C.SILVER && C.mon_hates_silver(mtmp)) {
    let flesh = (!C.noncorporeal(mtmp.data)
                             && !C.amorphous(mtmp.data));

            /* note: extra silver damage is handled by dmgval() */
            if (vis) {
    let m_name = C.mon_nam(mtmp);

                if (flesh) /* s_suffix returns a modifiable buffer */
                    m_name = C.strcat(C.s_suffix(m_name), " flesh");
                C.pline_The("silver sears %s!", m_name);
            } else if (verbose && !C.gm.mtarget) {
                C.pline("%s is seared!", flesh ? "Its flesh" : "It");
            }
        }
        if (otmp.otyp == C.ACID_VENOM && C.cansee(mtmp.mx, mtmp.my)) {
            if (C.resists_acid(mtmp)) {
                if (vis || (verbose && !C.gm.mtarget))
                    C.pline("%s is unaffected.", C.Monnam(mtmp));
            } else {
                if (vis)
                    C.pline_The("%s burns %s!", C.hliquid("acid"), C.mon_nam(mtmp));
                else if (verbose && !C.gm.mtarget)
                    C.pline("It is burned!");
            }
        }
        if (otmp.otyp == C.EGG && C.touch_petrifies(C.mons[otmp.corpsenm])) {
            if (!C.munstone(mtmp, 0))
                C.minstapetrify(mtmp, 0);
            if (C.resists_ston(mtmp))
                damage = 0;
        }

        /* might already be dead (if petrified) */
        if (!harmless && !C.DEADMONSTER(mtmp)) {
            mtmp.mhp -= damage;
            if (C.DEADMONSTER(mtmp)) {
                if (vis || (verbose && !C.gm.mtarget))
                    C.pline("%s is %s!", C.Monnam(mtmp),
                          (C.nonliving(mtmp.data) || C.is_vampshifter(mtmp)
                           || !C.canspotmon(mtmp)) ? "destroyed" : "killed");
                /* don't blame hero for unknown rolling boulder trap */
                if (!C.svc.context.mon_moving
                   && (otmp.otyp != C.BOULDER || range >= 0 || otmp.otrapped))
                    C.xkilled(mtmp, C.XKILL_NOMSG);
                else
                    C.mondied(mtmp);
            }
        }

        /* blinding venom and cream pie do 0 damage, but verify
           that the target is still alive anyway */
        if (!C.DEADMONSTER(mtmp)
            && C.can_blnd(0, mtmp,
                        ((otmp.otyp == C.BLINDING_VENOM) ? C.AT_SPIT
                                                                : C.AT_WEAP),
                        otmp)) {
            if (vis && mtmp.mcansee)
                /* shorten object name to reduce redundancy in the
                   two message [first via hit() above] sequence:
                   "The {splash of venom,cream pie} hits <mon>."
                   "<Mon> is blinded by the {venom,pie}." */
                C.pline("%s is blinded by %s.", C.Monnam(mtmp),
                      C.the((otmp.oclass == C.VENOM_CLASS) ? "venom"
                          : (otmp.otyp == C.CREAM_PIE) ? "pie"
                            : C.xname(otmp))); /* catchall; not used */
            mtmp.mcansee = 0;
            tmp = mtmp.mblinded + C.rnd(25, "ohitmon", 485) + 20;
            if (tmp > 127)
                tmp = 127;
            mtmp.mblinded = tmp;
        }

        if (!C.DEADMONSTER(mtmp) && !C.svc.context.mon_moving)
            C.setmangry(mtmp, 1);

        objgone = drop_throw(otmp, 1, C.gb.bhitpos.x, C.gb.bhitpos.y);
        if (!objgone && range == -1) { /* special case */
            C.obj_extract_self(otmp);    /* free it for motion again */
            return 0;
        }
        return 1;
    }
    return 0;
}

/* hero catches gem thrown by mon iff poly'd into unicorn; might drop it */
/* caller has verified gem->oclass */
export function ucatchgem(gem, mon)
{
    /* won't catch rock or gray stone; catch (then drop) worthless glass */
    if (gem.otyp <= C.LAST_GLASS_GEM && C.is_unicorn(C.gy.youmonst.data)) {
    let gem_xname = C.xname(gem), mon_s_name = C.s_suffix(C.mon_nam(mon));

        if (gem.otyp >= C.FIRST_GLASS_GEM) {
            C.You("catch the %s.", gem_xname);
            C.You("are not interested in %s junk.", mon_s_name);
            C.makeknown(gem.otyp);
            C.dropy(gem);
        } else {
            C.You("accept %s gift in the spirit in which it was intended.",
                mon_s_name);
            C.hold_another_object(gem, "You catch, but drop, %s.",
                                       gem_xname, "You catch:");
        }
        return 1;
    }
    return 0;
}

/* hero may catch thrown obj. it is added to inventory, if possible */
export function u_catch_thrown_obj(otmp)
{
    let catch_chance = 100 - C.ACURR(C.A_DEX)
                       - ((C.Role_if(C.PM_MONK) || C.Role_if(C.PM_ROGUE)) ? 20 : 0);

    if (!C.Blind && !C.Confusion && !C.Stunned && !C.Fumbling
        && otmp.oclass != C.VENOM_CLASS
        && !C.nohands(C.gy.youmonst.data) && C.freehand()
        && C.calc_capacity(otmp.owt) <= C.SLT_ENCUMBER && !C.rn2(catch_chance, "u_catch_thrown_obj", 541)) {
        const buf = C.stackAlloc(C.BUFSZ);

        C.Snprintf(buf, C.BUFSZ, "You catch the %s!", C.simpleonames(otmp));
        C.hold_another_object(otmp, "You catch, but drop, the %s.",
                                   C.simpleonames(otmp), buf);
        return 1;
    }
    return 0;
}

/* missile hits edge of screen */
/* missile hits the wall */
/* missile hit closed door */
/* missile might hit iron bars */
/* the random chance for small objects hitting bars is */
/* skipped when reaching them at point blank range */
/* Thrown objects "sink" */
/* launching monster */
/* launch point */
/* direction */
/* maximum distance */
/* missile (or stack providing it) */

export function m_throw(mon, x, y, dx, dy, range, obj)
{
    let mtmp;
    const singleobj = C.objectLocal();
    let forcehit;
    let sym = obj.oclass;
    let hitu = 0, oldumort, blindinc = 0;
    let arw = C.autoreturn_weapon(obj);
    let tethered_weapon =
                (obj == C.MON_WEP(mon) && arw && arw.tethered != 0),
            return_flightpath = 0;

    C.gb.bhitpos.x = x;
    C.gb.bhitpos.y = y;
    C.gn.notonhead = 0; /* reset potentially stale value */

    if (obj.quan == 1n) {
        /*
         * Remove object from minvent.  This cannot be done later on;
         * what if the player dies before then, leaving the monster
         * with 0 daggers?  (This caused the infamous 2^32-1 orcish
         * dagger bug).
         *
         * VENOM is not in minvent--it should already be OBJ_FREE.
         * The extract below does nothing.
         */

        /* not possibly_unwield(), which checks the object's location,
           not its existence */
        if (C.MON_WEP(mon) == obj)
            C.setmnotwielded(mon, obj);
        C.obj_extract_self(obj);
        singleobj.value = obj;
        obj = 0;
    } else {
        singleobj.value = C.splitobj(obj, 1n);
        C.obj_extract_self(singleobj.value);
    }
    /* global pointer for missile object in OBJ_FREE state */
    C.gt.thrownobj = singleobj.value;

    singleobj.value.owornmask = 0n; /* threw one of multiple weapons in hand? */
    if (!C.canseemon(mon))
        C.clear_dknown(singleobj.value); /* singleobj->dknown = 0; */

    if ((singleobj.value.cursed || singleobj.value.greased) && (dx || dy) && !C.rn2(7, "m_throw", 622)) {
        if (C.canseemon(mon) && C.flags.verbose) {
            if (C.is_ammo(singleobj.value))
                C.pline("%s misfires!", C.Monnam(mon));
            else
                C.pline("%s as %s throws it!", C.Tobjnam(singleobj.value, "slip"),
                      C.mon_nam(mon));
        }
        dx = C.rn2(3, "m_throw", 630) - 1;
        dy = C.rn2(3, "m_throw", 631) - 1;
        /* check validity of new direction */
        if (!dx && !dy) {
            drop_throw(singleobj.value, 0, C.gb.bhitpos.x, C.gb.bhitpos.y);
            return;
        }
    }

    if (    (                                 
     !C.isok(C.gb.bhitpos.x + dx, C.gb.bhitpos.y + dy)                       
                                            
     || C.IS_OBSTRUCTED(C.terrain(C.gb.bhitpos.x + dx, C.gb.bhitpos.y + dy).typ)  
                                          
     || C.closed_door(C.gb.bhitpos.x + dx, C.gb.bhitpos.y + dy)              
                                      
              
                  
     || (C.terrain(C.gb.bhitpos.x + dx, C.gb.bhitpos.y + dy).typ == C.IRONBARS    
         && hits_bars(singleobj,                                      
                      C.gb.bhitpos.x, C.gb.bhitpos.y,                      
                      C.gb.bhitpos.x + dx, C.gb.bhitpos.y + dy,            
                      (1 ? 0 : 0), 0))                      
                                            
     || (!1 && C.IS_SINK(C.terrain(C.gb.bhitpos.x, C.gb.bhitpos.y).typ))      
     )) {
        drop_throw(singleobj.value, 0, C.gb.bhitpos.x, C.gb.bhitpos.y);
        return;
    }
    C.gm.mesg_given = 0; /* a 'missile misses' message has not yet been shown */

    /* Note: drop_throw may destroy singleobj.  Since obj must be destroyed
     * early to avoid the dagger bug, anyone who modifies this code should
     * be careful not to use either one after it's been freed.
     */
    if (sym) {
        if (!tethered_weapon) {
            C.tmp_at(C.DISP_FLASH, C.obj_to_glyph(singleobj.value, C.rn2_on_display_rng));
        } else {
            C.tmp_at(C.DISP_TETHER, C.obj_to_glyph(singleobj.value, C.rn2_on_display_rng));
            /*
             * Considerations for a tethered object based on throwit()/bhit() :
             * - wall of water/lava will stop items, and triggers return.
             * - iron bars will stop items, and triggers return.
             * - pass harmlessly through shades.
             * X stops forward motion at hit monster/hero, triggers return.
             * - closed door will stop item's forward motion, triggers return.
             * - sinks stop forward motion, triggers fall, then return.
             * - object can get tangled in a web, no return (tether snaps?).
             * On return:
             * X rn2(100) chance of returning to thrower's location.
             * X if impaired and rn2(100) == 0,
             *      -50/50 chance of landing on the ground.
             *      -50/50 chance of hitting the thrower and causing
             *       rnd(3) damage.
             *
             */
        }
    }
    while (range-- > 0) { /* Actually the loop is always exited by break */
        singleobj.value.ox = C.gb.bhitpos.x += dx;
        singleobj.value.oy = C.gb.bhitpos.y += dy;
        if (C.cansee(C.gb.bhitpos.x, C.gb.bhitpos.y))
            C.observe_object(singleobj.value);

        mtmp = C.m_at(C.gb.bhitpos.x, C.gb.bhitpos.y);
        if (mtmp && C.shade_miss(mon, mtmp, singleobj.value, 1, 1)) {
            /* if mtmp is a shade and missile passes harmlessly through it,
               give message and skip it in order to keep going */
            mtmp = 0;
        } else if (mtmp) {
            if (ohitmon(mtmp, singleobj.value, range, 1))
                break;
        } else if (C.u_at(C.gb.bhitpos.x, C.gb.bhitpos.y)) {
            if (C.gm.multi)
                C.nomul(0);

            /* hero might be poly'd into a unicorn */
            if (singleobj.value.oclass == C.GEM_CLASS && ucatchgem(singleobj.value, mon))
                break;

            if (!tethered_weapon && C.callLocal(u_catch_thrown_obj, singleobj.value))
                break;

            if (singleobj.value.oclass == C.POTION_CLASS) {
                C.potionhit(C.gy.youmonst, singleobj.value, C.POTHIT_MONST_THROW);
                break;
            }
            oldumort = C.u.umortality;

            switch (singleobj.value.otyp) {
            case C.EGG:
                if (!C.touch_petrifies(C.mons[singleobj.value.corpsenm])) {
                    C.impossible("monster throwing egg type %d",
                               singleobj.value.corpsenm);
                    hitu = 0;
                    break;
                }
                
                /*FALLTHRU*/
            case C.CREAM_PIE:
            case C.BLINDING_VENOM:
                hitu = C.callLocal(thitu, 8, 0, singleobj, 0);
                break;
            default:
                {
    let dam, hitv;

                    dam = C.dmgval(singleobj.value, C.gy.youmonst);
                    hitv = 3 - C.distmin(C.u.ux, C.u.uy, mon.mx, mon.my);
                    if (hitv < -4)
                        hitv = -4;
                    /* [elves get a shooting bonus, orcs don't...] */
                    if (C.is_elf(mon.data)
                        && C.objects[singleobj.value.otyp].oc_skill == -C.P_BOW) {
                        hitv++;
                        if (C.MON_WEP(mon) && C.MON_WEP(mon).otyp == C.ELVEN_BOW)
                            hitv++;
                        if (singleobj.value.otyp == C.ELVEN_ARROW)
                            dam++;
                    }
                    if (C.bigmonst(C.gy.youmonst.data))
                        hitv++;
                    hitv += 8 + singleobj.value.spe;
                    if (dam < 1)
                        dam = 1;
                    if (singleobj.value.otyp != C.ACID_VENOM)
                        dam = (C.Half_physical_damage ? Math.trunc((dam + 1) / 2) : dam);
                    hitu = C.callLocal(thitu, hitv, dam, singleobj, 0);
                }
            }
            if (hitu && singleobj.value.opoisoned && C.is_poisonable(singleobj.value)) {
                const onmbuf = C.stackAlloc(C.BUFSZ), knmbuf = C.stackAlloc(C.BUFSZ);

                C.Strcpy(onmbuf, C.xname(singleobj.value));
                C.Strcpy(knmbuf, C.killer_xname(singleobj.value));
                C.poisoned(onmbuf, C.A_STR, knmbuf,
                         /* if damage triggered life-saving,
                            poison is limited to attrib loss */
                         (C.u.umortality > oldumort) ? 0 : 10, 1);
            }
            if (hitu && C.can_blnd(0, C.gy.youmonst,
                                 ((singleobj.value.otyp == C.BLINDING_VENOM)
                                             ? C.AT_SPIT
                                             : C.AT_WEAP),
                                 singleobj.value)) {
                blindinc = C.rnd(25, "m_throw", 760);
                if (singleobj.value.otyp == C.CREAM_PIE) {
                    if (!C.Blind)
                        C.pline("Yecch!  You've been creamed.");
                    else
                        C.pline("There's %s sticky all over your %s.",
                              C.something, C.body_part(C.FACE));
                } else if (singleobj.value.otyp == C.BLINDING_VENOM) {
    let eyes = C.body_part(C.EYE);

                    if (C.eyecount(C.gy.youmonst.data) != 1)
                        eyes = C.makeplural(eyes);
                    /* venom in the eyes */
                    if (!C.Blind)
                        C.pline_The("venom blinds you.");
                    else
                        C.Your("%s %s.", eyes, C.vtense(eyes, "sting"));
                }
            }
            if (hitu && singleobj.value.otyp == C.EGG) {
                if (!C.Stoned && !C.Stone_resistance
                    && !(C.poly_when_stoned(C.gy.youmonst.data)
                         && C.polymon(C.PM_STONE_GOLEM))) {
                    C.make_stoned(5n, 0, C.KILLED_BY, "");
                }
            }
            C.stop_occupation();
            if (hitu) {
                if (!tethered_weapon) {
                    drop_throw(singleobj.value, hitu, C.u.ux, C.u.uy);
                } else {
                    /* ready for return journey */
                    return_flightpath = 1;
                }
                break;
            }
        }

        forcehit = !C.rn2(5, "m_throw", 798);
        if (!range ||     (                                 
     !C.isok(C.gb.bhitpos.x + dx, C.gb.bhitpos.y + dy)                       
                                            
     || C.IS_OBSTRUCTED(C.terrain(C.gb.bhitpos.x + dx, C.gb.bhitpos.y + dy).typ)  
                                          
     || C.closed_door(C.gb.bhitpos.x + dx, C.gb.bhitpos.y + dy)              
                                      
              
                  
     || (C.terrain(C.gb.bhitpos.x + dx, C.gb.bhitpos.y + dy).typ == C.IRONBARS    
         && hits_bars(singleobj,                                      
                      C.gb.bhitpos.x, C.gb.bhitpos.y,                      
                      C.gb.bhitpos.x + dx, C.gb.bhitpos.y + dy,            
                      (0 ? 0 : forcehit), 0))                      
                                            
     || (!0 && C.IS_SINK(C.terrain(C.gb.bhitpos.x, C.gb.bhitpos.y).typ))      
     )) {
            /* end of path or blocked */
            if (singleobj.value) { /* hits_bars might have destroyed it */
                /* note: pline(The(missile)) rather than pline_The(missile)
                   in order to get "Grimtooth" rather than "The Grimtooth" */
                if (range && C.cansee(C.gb.bhitpos.x, C.gb.bhitpos.y)
                    && C.IS_SINK(C.terrain(C.gb.bhitpos.x, C.gb.bhitpos.y).typ))
                    C.pline("%s %s onto the sink.", C.The(C.mshot_xname(singleobj.value)),
                          C.otense(singleobj.value, C.Hallucination ? "plop" : "drop"));
                else if (C.gm.m_shot.n > 1
                         && (!C.gm.mesg_given
                             || C.gb.bhitpos.x != C.u.ux || C.gb.bhitpos.y != C.u.uy)
                         && (C.cansee(C.gb.bhitpos.x, C.gb.bhitpos.y)
                             || (C.gm.marcher && C.canseemon(C.gm.marcher))))
                    C.pline("%s misses.", C.The(C.mshot_xname(singleobj.value)));
                if (!tethered_weapon) {
                    drop_throw(singleobj.value, 0,
                                      C.gb.bhitpos.x, C.gb.bhitpos.y);
                } else {
                    /*ready for return journey */
                    return_flightpath = 1;
                }
            }
            break;
        }
        C.tmp_at(C.gb.bhitpos.x, C.gb.bhitpos.y);
        C.nh_delay_output();
    }
    C.tmp_at(C.gb.bhitpos.x, C.gb.bhitpos.y);
    C.nh_delay_output();
    if (arw && return_flightpath)
        C.callLocal(return_from_mtoss, mon, singleobj.value, tethered_weapon);
        /* mon could be DEADMONSTER now */
    else
        C.tmp_at(C.DISP_END, 0);
    C.gm.mesg_given = 0; /* reset */

    if (blindinc) {
        C.u.ucreamed += blindinc;
        C.make_blinded(C.BlindedTimeout + BigInt(blindinc), 0);
        if (!C.Blind)
            C.Your1(C.vision_clears);
    }
    /* note: all early returns follow drop_throw() which clears thrownobj */
    C.gt.thrownobj = 0;
    return;
}



export function return_from_mtoss(magr, otmp, tethered_weapon)
{
    let impaired = (magr.mconf || magr.mstun || magr.mblinded),
            notcaught = 0, hits_thrower = 0;
    let x = C.gb.bhitpos.x, y = C.gb.bhitpos.y;
    let made_it_back = C.rn2(100, "return_from_mtoss", 858);
    const dmg = C.intLocal(0);

    if (otmp && made_it_back) {
        /* it made it back to thrower's location */
        if (tethered_weapon) {
            C.tmp_at(C.DISP_END, C.BACKTRACK);
        } else {
    let dx = C.sgn(x - magr.mx),
                dy = C.sgn(y - magr.my);

            if (x != magr.mx || y != magr.my) {
                C.tmp_at(C.DISP_FLASH, C.obj_to_glyph(otmp, C.rn2_on_display_rng));
                while (C.isok(x, y) && (x != magr.mx || y != magr.my)) {
                    C.tmp_at(x, y);
                    C.nh_delay_output();
                    x -= dx;
                    y -= dy;
                }
                C.tmp_at(C.DISP_END, 0);
            }
        }
        x = magr.mx;
        y = magr.my;
        if (!impaired && C.rn2(100, "return_from_mtoss", 881)) {
            /* FIXME: this should be moved to struct g (gd these days) */
            

            if (!C.do_not_annoy || (C.svm.moves - C.do_not_annoy) > 500n) {
                C.pline("%s to %s %s!", C.Tobjnam(otmp, "return"),
                      C.s_suffix(C.mon_nam(magr)), C.mbodypart(magr, C.HAND));
                C.do_not_annoy = C.svm.moves;
            }
            if (otmp) {
                C.add_to_minv(magr, otmp);
                if (tethered_weapon) {
                    magr.mw = otmp;
                    otmp.owornmask |= C.W_WEP;
                }
            }
            if (C.cansee(x, y))
                C.newsym(x, y);
        } else {
    let mlevitating = 0;  /* msg future-proofing only */

            dmg.value = C.rn2(2, "return_from_mtoss", 902);
            if (!dmg.value) {
                if (C.canseemon(magr)) {
                    C.pline("%s back to %s, landing %s %s %s.",
                          C.Tobjnam(otmp, "return"), C.mon_nam(magr),
                          mlevitating ? "beneath" : "at", C.mhis(magr),
                          C.makeplural(C.mbodypart(magr, C.FOOT)));
                } else if (!C.Deaf) {
                    C.You_hear("%s land near %s.", C.Something, C.mon_nam(magr));
                }
            } else {
                dmg.value += C.rnd(3, "return_from_mtoss", 913);
                if (C.canseemon(magr)) {
                    C.pline("%s back toward %s, hitting %s %s!",
                          C.Tobjnam(otmp, "fly"), C.mon_nam(magr),
                          C.mhis(magr), C.body_part(C.ARM));
                } else if (!C.Deaf) {
                    C.You_hear("%s hit %s with a thud!", C.something,
                             C.mon_nam(magr));
                }
                hits_thrower = 1;
            }
            notcaught = 1;
        }
    } else {
        /* it didn't make it back to thrower's location */
        if (tethered_weapon)
            C.tmp_at(C.DISP_END, 0);
        C.You_hear("a loud snap!");
        notcaught = 1;
    }
    if (otmp) {
        if (hits_thrower) {
            if (otmp.oartifact)
                C.artifact_hit(0, magr, otmp, dmg.address, 0);
            magr.mhp -= dmg.value;
            if (C.DEADMONSTER(magr))
                C.monkilled(magr, C.canspotmon(magr) ? "" : 0, C.AD_PHYS);
        }
        if (notcaught) {
            C.snuff_candle(otmp);
            if (!C.ship_object(otmp, x, y, 0)) {
                if (C.flooreffects(otmp, x, y, "drop")) {
                    if (C.cansee(x, y))
                        C.newsym(x, y);
                    return;
                }
                C.place_object(otmp, x, y);
                C.stackobj(otmp);
            }
            if (!C.Deaf && !C.Underwater) {
                /* Some sound effects when item lands in water or lava */
                if (C.is_pool(x, y) || (C.is_lava(x, y) && !C.is_flammable(otmp))) {
                    
                    C.pline((C.weight(otmp) > 9) ? "Splash!" : "Plop!");
                }
            }
            if (C.obj_sheds_light(otmp))
                C.gv.vision_full_recalc = 1;
        }
    }
    if (C.cansee(x, y))
        C.newsym(x, y);
}

/* Monster throws item at another monster */
export function thrwmm(mtmp, mtarg)
{
    let otmp, mwep;
    let x, y;
    let ispole;

    /* Polearms won't be applied by monsters against other monsters */
    if (mtmp.weapon_check == C.NEED_WEAPON || !C.MON_WEP(mtmp)) {
        mtmp.weapon_check = C.NEED_RANGED_WEAPON;
        /* mon_wield_item resets weapon_check as appropriate */
        if (C.mon_wield_item(mtmp) != 0)
            return C.M_ATTK_MISS;
    }

    /* Pick a weapon */
    otmp = C.select_rwep(mtmp);
    if (!otmp)
        return C.M_ATTK_MISS;
    ispole = C.is_pole(otmp);

    x = mtmp.mx;
    y = mtmp.my;

    mwep = C.MON_WEP(mtmp); /* wielded weapon */

    if (!ispole && m_lined_up(mtarg, mtmp)) {
    let chance = C.max(C.BOLT_LIM - C.distmin(x, y, mtarg.mx, mtarg.my), 1);

        if (!mtarg.mflee || !C.rn2(chance, "thrwmm", 997)) {
            if (C.ammo_and_launcher(otmp, mwep)
                && C.dist2(mtmp.mx, mtmp.my, mtarg.mx, mtarg.my)
                   > C.PET_MISSILE_RANGE2)
                return C.M_ATTK_MISS; /* Out of range */
            /* Set target monster */
            C.gm.mtarget = mtarg;
            C.gm.marcher = mtmp;
            C.callLocal(monshoot, mtmp, otmp, mwep); /* multishot shooting or throwing */
            C.gm.marcher = C.gm.mtarget = 0;
            C.nomul(0);
            return C.M_ATTK_HIT;
        }
    }
    return C.M_ATTK_MISS;
}

/* monster spits substance at monster */
export function spitmm(mtmp, mattk, mtarg)
{
    let otmp;

    if (mtmp.mcan) {
        if (!C.Deaf && C.mdistu(mtmp) < C.BOLT_LIM * C.BOLT_LIM) {
            if (C.canspotmon(mtmp)) {
                C.pline("A dry rattle comes from %s throat.",
                      C.s_suffix(C.mon_nam(mtmp)));
            } else {
                
                C.You_hear("a dry rattle nearby.");
            }
        }
        return C.M_ATTK_MISS;
    }
    if (m_lined_up(mtarg, mtmp)) {
    let utarg = (mtarg == C.gy.youmonst);
    let tx = utarg ? mtmp.mux : mtarg.mx;
    let ty = utarg ? mtmp.muy : mtarg.my;

        switch (mattk.adtyp) {
        case C.AD_BLND:
        case C.AD_DRST:
            otmp = C.mksobj(C.BLINDING_VENOM, 1, 0);
            break;
        default:
            C.impossible("bad attack type in spitmm");
            
            /*FALLTHRU*/
        case C.AD_ACID:
            otmp = C.mksobj(C.ACID_VENOM, 1, 0);
            break;
        }
        if (!C.rn2(C.BOLT_LIM-C.distmin(mtmp.mx,mtmp.my,tx,ty), "spitmm", 1050)) {
            if (C.canseemon(mtmp))
                C.pline("%s spits venom!", C.Monnam(mtmp));
            if (!utarg)
                C.gm.mtarget = mtarg;
            C.callLocal(m_throw, mtmp, mtmp.mx, mtmp.my, C.sgn(C.gt.tbx), C.sgn(C.gt.tby),
                    C.distmin(mtmp.mx,mtmp.my,tx,ty), otmp);
            C.gm.mtarget = 0;
            C.nomul(0);

            /* If this is a pet, it'll get hungry. Minions and
             * spell beings won't hunger */
            if (mtmp.mtame && !mtmp.isminion) {
    let dog = C.EDOG(mtmp);

                /* Hunger effects will catch up next move */
                if (dog.hungrytime > 1)
                    dog.hungrytime -= 5n;
            }

            return C.M_ATTK_HIT;
        } else {
            C.obj_extract_self(otmp);
            C.obfree(otmp, 0);
        }
    }
    return C.M_ATTK_MISS;
}

/* Return the name of a breath weapon. If the player is hallucinating, return
 * a silly name instead.
 * typ is AD_MAGM, AD_FIRE, etc */
export function breathwep_name(typ)
{
    if (C.Hallucination)
        return rnd_hallublast();

    return breathwep[C.BZ_OFS_AD(typ)];
}

/* monster breathes at monster (ranged) */
export function breamm(mtmp, mattk, mtarg)
{
    let typ = C.get_atkdam_type(mattk.adtyp);
    let utarget = (mtarg == C.gy.youmonst);

    if (m_lined_up(mtarg, mtmp)) {
        if (mtmp.mcan) {
            if (!C.Deaf) {
                if (C.canseemon(mtmp)) {
                    C.pline("%s coughs.", C.Monnam(mtmp));
                } else {
                    
                    C.You_hear("a cough.");
                }
            }
            return C.M_ATTK_MISS;
        }

        /* if we've seen the actual resistance, don't bother, or
           if we're close by and they reflect, just jump the player */
        if (utarget && (C.m_seenres(mtmp, C.cvt_adtyp_to_mseenres(typ))
                        || C.m_seenres(mtmp, C.M_SEEN_REFL)))
            return C.M_ATTK_HIT;

        if (!mtmp.mspec_used && C.rn2(3, "breamm", 1117)) {
            if (C.BZ_VALID_ADTYP(typ)) {
                if (C.canseemon(mtmp))
                    C.pline("%s breathes %s!",
                          C.Monnam(mtmp), breathwep_name(typ));
                C.gb.buzzer = mtmp;
                C.dobuzz(C.BZ_M_BREATH(C.BZ_OFS_AD(typ)), mattk.damn,
                       mtmp.mx, mtmp.my, C.sgn(C.gt.tbx), C.sgn(C.gt.tby),
                       utarget, utarget, 0);
                C.gb.buzzer = 0;
                C.nomul(0);
                /* breath runs out sometimes. Also, give monster some
                 * cunning; don't breath if the target fell asleep.
                 */
                if (!utarget || !C.rn2(3, "breamm", 1131))
                    mtmp.mspec_used = 8 + C.rn2(18, "breamm", 1132);
                if (utarget && typ == C.AD_SLEE && !C.Sleep_resistance)
                    mtmp.mspec_used += C.rnd(20, "breamm", 1134);

                /* If this is a pet, it'll get hungry. Minions and
                 * spell beings won't hunger */
                if (mtmp.mtame && !mtmp.isminion) {
    let dog = C.EDOG(mtmp);

                    /* Hunger effects will catch up next move */
                    if (dog.hungrytime >= 10)
                        dog.hungrytime -= 10n;
                }
            } else C.impossible("Breath weapon %d used", typ-1);
        } else
            return C.M_ATTK_MISS;
    }
    return C.M_ATTK_HIT;
}

/* remove an entire item from a monster's inventory; destroy that item */
export function m_useupall(mon, obj)
{
    C.extract_from_minvent(mon, obj, 1, 0);
    C.obfree(obj, 0);
}

/* remove one instance of an item from a monster's inventory */
export function m_useup(mon, obj)
{
    if (obj.quan > 1n) {
        obj.quan--;
        obj.owt = C.weight(obj);
    } else {
        m_useupall(mon, obj);
    }
}

/* monster attempts ranged weapon attack against player */
export function thrwmu(mtmp)
{
    const otmp = C.objectLocal();
    let mwep;
    let x, y;
    let onm;
    let rang;
    let arw;
    let always_toss = 0;

    /* Rearranged beginning so monsters can use polearms not in a line */
    if (mtmp.weapon_check == C.NEED_WEAPON || !C.MON_WEP(mtmp)) {
        mtmp.weapon_check = C.NEED_RANGED_WEAPON;
        /* mon_wield_item resets weapon_check as appropriate */
        if (C.mon_wield_item(mtmp) != 0)
            return;
    }

    /* Pick a weapon */
    otmp.value = C.select_rwep(mtmp);
    if (!otmp.value)
        return;

    if (C.is_pole(otmp.value)) {
    let dam, hitv;

        if (otmp.value != C.MON_WEP(mtmp))
            return; /* polearm, aklys must be wielded */

        /*
         * MON_POLE_DIST encompasses knight's move range (5): two spots
         * away provided it's not on a straight diagonal, same as skilled
         * hero.  Using polearm while adjacent is allowed but the verb
         * is adjusted from "thrusts" to "bashes", where the hero would
         * have to switch from applying a polearm to ordinary melee attack
         * to accomplish that.
         *
         *  .545.
         *  52125
         *  41014
         *  52125
         *  .545.
         */
        rang = C.dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy);
        if (rang > C.MON_POLE_DIST || !C.couldsee(mtmp.mx, mtmp.my))
            return; /* Out of range, or intervening wall */

        if (C.canseemon(mtmp)) {
            onm = C.xname(otmp.value);
            C.pline_mon(mtmp, "%s %s %s.", C.Monnam(mtmp),
                  /* "thrusts" or "swings", or "bashes with" if adjacent */
                  C.mswings_verb(otmp.value, (rang <= 2) ? 1 : 0),
                  C.obj_is_pname(otmp.value) ? C.the(onm) : C.an(onm));
        }

        dam = C.dmgval(otmp.value, C.gy.youmonst);
        hitv = 3 - C.distmin(C.u.ux, C.u.uy, mtmp.mx, mtmp.my);
        if (hitv < -4)
            hitv = -4;
        if (C.bigmonst(C.gy.youmonst.data))
            hitv++;
        hitv += 8 + otmp.value.spe;
        if (dam < 1)
            dam = 1;

        C.callLocal(thitu, hitv, (C.Half_physical_damage ? Math.trunc((dam + 1) / 2) : dam), otmp, 0);
        C.stop_occupation();
        return;
    } else if ((arw = C.autoreturn_weapon(otmp.value)) != 0 && !C.mwelded(otmp.value)) {
        rang = C.dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy);
        if (rang > arw.range || !C.couldsee(mtmp.mx, mtmp.my))
            return; /* Out of range, or intervening wall */
        always_toss = 1;
    }

    x = mtmp.mx;
    y = mtmp.my;
    /* If you are coming toward the monster, the monster
     * should try to soften you up with missiles.  If you are
     * going away, you are probably hurt or running.  Give
     * chase, but if you are getting too far away, throw.
     */
    if (!lined_up(mtmp)
        || ((C.distmin(C.u.ux, C.u.uy, x, y) > C.distmin(C.u.ux0, C.u.uy0, x, y))
            && (!always_toss
                && C.rn2(C.BOLT_LIM - C.distmin(x, y, mtmp.mux, mtmp.muy), "thrwmu", 1258))))
        return;

    mwep = C.MON_WEP(mtmp); /* wielded weapon */
    C.callLocal(monshoot, mtmp, otmp.value, mwep); /* multishot shooting or throwing */
    C.nomul(0);
}

/* monster spits substance at you */
export function spitmu(mtmp, mattk)
{
    return spitmm(mtmp, mattk, C.gy.youmonst);
}

/* monster breathes at you (ranged) */
export function breamu(mtmp, mattk)
{
    return breamm(mtmp, mattk, C.gy.youmonst);
}

/* return TRUE if terrain at x,y blocks linedup checks */
export function blocking_terrain(x, y)
{
    if (!C.isok(x, y) || C.IS_OBSTRUCTED(C.terrain(x, y).typ) || C.closed_door(x, y)
        || C.is_waterwall(x, y) || C.terrain(x, y).typ == C.LAVAWALL)
        return 1;
    return 0;
}

/* Move from (ax,ay) to (bx,by), but only if distance is up to BOLT_LIM
   and only in straight line or diagonal, calling fnc for each step.
   Stops if fnc return TRUE, or if step was blocked by wall or closed door.
   Returns TRUE if fnc returned TRUE. */
export function linedup_callback(ax, ay, bx, by, fnc)
{
    let dx, dy;

    /* These two values are set for use after successful return. */
    C.gt.tbx = ax - bx;
    C.gt.tby = ay - by;

    /* sometimes displacement makes a monster think that you're at its
       own location; prevent it from throwing and zapping in that case */
    if (!C.gt.tbx && !C.gt.tby)
        return 0;

    /* straight line, orthogonal to the map or diagonal */
    if ((!C.gt.tbx || !C.gt.tby || C.abs(C.gt.tbx) == C.abs(C.gt.tby))
        && C.distmin(C.gt.tbx, C.gt.tby, 0, 0) < C.BOLT_LIM) {
        dx = C.sgn(ax - bx), dy = C.sgn(ay - by);
        do {
            /* <bx,by> is guaranteed to eventually converge with <ax,ay> */
            bx += dx, by += dy;
            if (blocking_terrain(bx, by))
                return 0;
            if (C.invokeLineCallback(fnc, bx, by))
                return 1;
        } while (bx != ax || by != ay);
    }
    return 0;
}

/* 0=block, 1=ignore, 2=conditionally block */
export function linedup(ax, ay, bx, by, boulderhandling)
{
    let dx, dy, boulderspots;

    /* These two values are set for use after successful return. */
    C.gt.tbx = ax - bx;
    C.gt.tby = ay - by;

    /* sometimes displacement makes a monster think that you're at its
       own location; prevent it from throwing and zapping in that case */
    if (!C.gt.tbx && !C.gt.tby)
        return 0;

    /* straight line, orthogonal to the map or diagonal */
    if ((!C.gt.tbx || !C.gt.tby || C.abs(C.gt.tbx) == C.abs(C.gt.tby))
        && C.distmin(C.gt.tbx, C.gt.tby, 0, 0) < C.BOLT_LIM) {
        if (C.u_at(ax, ay) ? C.couldsee(bx, by)
                         : C.clear_path(ax, ay, bx, by))
            return 1;
        /* don't have line of sight, but might still be lined up
           if that lack of sight is due solely to boulders */
        if (boulderhandling == 0)
            return 0;
        dx = C.sgn(ax - bx), dy = C.sgn(ay - by);
        boulderspots = 0;
        do {
            /* <bx,by> is guaranteed to eventually converge with <ax,ay> */
            bx += dx, by += dy;
            if (blocking_terrain(bx, by))
                return 0;
            if (C.sobj_at(C.BOULDER, bx, by))
                ++boulderspots;
        } while (bx != ax || by != ay);
        /* reached target position without encountering obstacle */
        if (boulderhandling == 1 || C.rn2(2 + boulderspots, "linedup", 1369) < 2)
            return 1;
    }
    return 0;
}

export function m_lined_up(mtarg, mtmp)
{
    let utarget = (mtarg == C.gy.youmonst);
    let tx = utarget ? mtmp.mux : mtarg.mx;
    let ty = utarget ? mtmp.muy : mtarg.my;
    let ignore_boulders = utarget && (C.throws_rocks(mtmp.data)
                                          || m_carrying(mtmp, C.WAN_STRIKING));

    /* hero concealment usually trumps monst awareness of being lined up */
    if (utarget && C.Upolyd && C.rn2(25, "m_lined_up", 1385)
        && (C.u.uundetected || (C.U_AP_TYPE != C.M_AP_NOTHING
                              && C.U_AP_TYPE != C.M_AP_MONSTER)))
        return 0;

    /* [no callers care about the 1 vs 2 situation any more] */
    return linedup(tx, ty, mtmp.mx, mtmp.my,
                   utarget ? (ignore_boulders ? 1 : 2) : 0);
}


/* is mtmp in position to use ranged attack on hero? */
export function lined_up(mtmp)
{
    return m_lined_up(C.gy.youmonst, mtmp) ? 1 : 0;
}

/* check if a monster is carrying an item of a particular type */
export function m_carrying(mtmp, type)
{
    let otmp;

    for (otmp = (mtmp == C.gy.youmonst) ? C.gi.invent : mtmp.minvent; otmp;
         otmp = otmp.nobj)
        if (otmp.otyp == type)
            break;
    return otmp;
}

/* *objp will be set to NULL if object breaks */
/* hero's (when wielded) or missile's spot */
/* adjacent spot where bars are located */
/* breakage control */
export function hit_bars(objp, objx, objy, barsx, barsy, breakflags)
{
    let otmp = objp.value;
    let obj_type = otmp.otyp;
    let nodissolve = (C.terrain(barsx, barsy).wall_info & C.W_NONDIGGABLE) != 0,
            your_fault = (breakflags & C.BRK_BY_HERO) != 0,
            melee_attk = (breakflags & C.BRK_MELEE) != 0;
    let noise = 0;

    if (your_fault
        ? C.hero_breaks(otmp, objx, objy, breakflags)
        : C.breaks(otmp, objx, objy)) {
        objp.value = 0; /* object is now gone */
        /* breakage makes its own noises */
        if (obj_type == C.POT_ACID) {
            if (C.cansee(barsx, barsy) && !nodissolve) {
                C.pline_The("iron bars are dissolved!");
            } else {
                
                C.You_hear(C.Hallucination ? "angry snakes!"
                                       : "a hissing noise.");
            }
            if (!nodissolve)
                C.dissolve_bars(barsx, barsy);
        }
    } else {
        if (!C.Deaf) {
            const se = [
                C.se_zero_invalid,
                C.se_bars_whang, C.se_bars_whap, C.se_bars_flapp,
                C.se_bars_clink, C.se_bars_clonk
            ];
            const barsounds = [
                "", "Whang", "Whap", "Flapp", "Clink", "Clonk"
            ];
    let bsindx = (obj_type == C.BOULDER || obj_type == C.HEAVY_IRON_BALL)
                         ? 1
                         : C.harmless_missile(otmp) ? 2
                         : C.is_flimsy(otmp) ? 3
                         : (otmp.oclass == C.COIN_CLASS
                            || C.objects[obj_type].oc_material == C.GOLD
                            || C.objects[obj_type].oc_material == C.SILVER)
                           ? 4
                           : barsounds.length - 1;

            
            C.pline("%s!", barsounds[bsindx]);
            C.nhUse(se[bsindx]);
        }
        if (!(C.harmless_missile(otmp) || C.is_flimsy(otmp)))
            noise = 4 * 4;

        if (your_fault && (otmp.otyp == C.WAR_HAMMER
                           || otmp.otyp == C.HEAVY_IRON_BALL)) {
            /* iron ball isn't a weapon or wep-tool so doesn't use obj->spe;
               weight is normally 480 but can be increased by increments
               of 160 (scrolls of punishment read while already punished) */
    let spe = ((otmp.otyp == C.HEAVY_IRON_BALL) /* 3+ for iron ball */
                       ? (C.int(otmp.owt) / C.WT_IRON_BALL_INCR)
                       : otmp.spe);
            /* chance: used in saving throw for the bars; more likely to
               break those when 'chance' is _lower_; acurrstr(): 3..25 */
    let chance = (melee_attk ? 40 : 60) - C.acurrstr() - spe;

            if (!C.rn2(C.max(2, chance), "hit_bars", 1485)) {
                C.You("break the bars apart!");
                C.dissolve_bars(barsx, barsy);
                noise = noise * 2;
            }
        }

        if (noise)
            C.wake_nearto(barsx, barsy, noise);
    }
}

/* TRUE iff thrown/kicked/rolled object doesn't pass through iron bars */
/* *obj_p will be set to NULL if object breaks */
/* caller can force a hit for items which would
                           * fit through */
/* 1==hero, 0=other, -1==just check whether it
                           * will pass through */
export function hits_bars(obj_p, x, y, barsx, barsy, always_hit, whodidit)
{
    let otmp = obj_p.value;
    let obj_type = otmp.otyp;
    let hits = C.boolean(always_hit);

    if (!hits)
        switch (otmp.oclass) {
        case C.WEAPON_CLASS: {
    let oskill = C.objects[obj_type].oc_skill;

            hits = (oskill != -C.P_BOW && oskill != -C.P_CROSSBOW
                    && oskill != -C.P_DART && oskill != -C.P_SHURIKEN
                    && oskill != C.P_SPEAR
                    && oskill != C.P_KNIFE); /* but not dagger */
            break;
        }
        case C.ARMOR_CLASS:
            hits = (C.objects[obj_type].oc_armcat != C.ARM_GLOVES);
            break;
        case C.TOOL_CLASS:
            hits = (obj_type != C.SKELETON_KEY && obj_type != C.LOCK_PICK
                    && obj_type != C.CREDIT_CARD && obj_type != C.TALLOW_CANDLE
                    && obj_type != C.WAX_CANDLE && obj_type != C.LENSES
                    && obj_type != C.TIN_WHISTLE && obj_type != C.MAGIC_WHISTLE);
            break;
        case C.ROCK_CLASS: /* includes boulder */
            if (obj_type != C.STATUE || C.mons[otmp.corpsenm].msize > C.MZ_TINY)
                hits = 1;
            break;
        case C.FOOD_CLASS:
            if (obj_type == C.CORPSE && C.mons[otmp.corpsenm].msize > C.MZ_TINY)
                hits = 1;
            else
                hits = (obj_type == C.MEAT_STICK
                        || obj_type == C.ENORMOUS_MEATBALL);
            break;
        case C.SPBOOK_CLASS:
        case C.WAND_CLASS:
        case C.BALL_CLASS:
        case C.CHAIN_CLASS:
            hits = 1;
            break;
        default:
            break;
        }

    if (hits && whodidit != -1) {
        hit_bars(obj_p, x, y, barsx, barsy,
                 (whodidit == 1) ? C.BRK_BY_HERO : 0);
    }

    return hits;
}

/*mthrowu.c*/
