/* NetHack 5.0	mthrowu.c	$NHDT-Date: 1737392015 2025/01/20 08:53:35 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.173 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Pasi Kallinen, 2016. */
/* NetHack may be freely redistributed.  See license for details. */

// #include "hack.h"











export function URETREATING(x, y) { return (+(distmin(u.ux, u.uy, x, y) > distmin(u.ux0, u.uy0, x, y))); }


/*
 * Keep consistent with breath weapons in zap.c, and AD_* in monattk.h.
 */
const breathwep = static_array("breathwep", ptr_to(char), null, [
    _("fragments"), _("fire"), _("frost"), _("sleep gas"), _("a disintegration blast"),
    _("lightning"), _("poison gas"), _("acid"), _("strange breath #8"),
    _("strange breath #9")
]);

/* hallucinatory ray types */
const hallublasts = static_array("hallublasts", ptr_to(char), null, [
    _("asteroids"), _("beads"), _("bubbles"), _("butterflies"), _("champagne"), _("chaos"),
    _("coins"), _("cotton candy"), _("crumbs"), _("dark matter"), _("darkness"), _("data"),
    _("dust specks"), _("emoticons"), _("emotions"), _("entropy"), _("flowers"), _("foam"),
    _("fog"), _("gamma rays"), _("gelatin"), _("gemstones"), _("ghosts"), _("glass shards"),
    _("glitter"), _("good vibes"), _("gravel"), _("gravity"), _("gravy"), _("grawlixes"),
    _("holy light"), _("hornets"), _("hot air"), _("hyphens"), _("hypnosis"), _("infrared"),
    _("insects"), _("jargon"), _("laser beams"), _("leaves"), _("lightening"), _("logic gates"),
    _("magma"), _("marbles"), _("mathematics"), _("megabytes"), _("metal shavings"),
    _("metapatterns"), _("meteors"), _("mist"), _("mud"), _("music"), _("nanites"), _("needles"),
    _("noise"), _("nostalgia"), _("oil"), _("paint"), _("photons"), _("pixels"), _("plasma"),
    _("polarity"), _("powder"), _("powerups"), _("prismatic light"), _("pure logic"),
    _("purple"), _("radio waves"), _("rainbows"), _("rock music"), _("rocket fuel"), _("rope"),
    _("sadness"), _("salt"), _("sand"), _("scrolls"), _("sludge"), _("smileys"), _("snowflakes"),
    _("sparkles"), _("specularity"), _("spores"), _("stars"), _("steam"), _("tetrahedrons"),
    _("text"), _("the past"), _("tornadoes"), _("toxic waste"), _("ultraviolet light"),
    _("viruses"), _("water"), _("waveforms"), _("wind"), _("X-rays"), _("zorkmids")
]);

/* Return a random hallucinatory blast. */
export function /* const char * */
rnd_hallublast()
{
    return ROLL_FROM(hallublasts);
}

export function /* boolean */
m_has_launcher_and_ammo(mtmp)
{
    let mwep = MON_WEP(mtmp);

    if (mwep && is_launcher(mwep)) {
        let otmp;

        for (otmp = mtmp.minvent; otmp; otmp = otmp.nobj)
            if (ammo_and_launcher(otmp, mwep))
                return TRUE;
    }
    return FALSE;
}

/* hero is hit by something other than a monster (though it could be a
   missile thrown or shot by a monster) */
export function /* int */
thitu(
    tlev,
    dam,
    objp,
    name) /* if null, then format `*objp' */
{ const $frame = stack_frame(); try {
    let obj = objp ? objp[0] : null;
    let onm, knm;
    let is_acid, named = (+(name != 0));
    let kprefix = KILLED_BY_AN, dieroll;
    let onmbuf = stack_array(char, BUFSZ), knmbuf = stack_array(char, BUFSZ);

    if (!name) {
        if (!obj)
            panic(_("thitu: name & obj both null?"));
        name = strcpy(onmbuf,
                      (obj.quan > 1) ? doname(obj) : mshot_xname(obj));
        knm = strcpy(knmbuf, killer_xname(obj));
        kprefix = KILLED_BY; /* killer_name supplies "an" if warranted */
    } else {
        knm = name;
        /* [perhaps ought to check for plural here too] */
        if (!strncmpi(name, _("the "), 4) || !strncmpi(name, _("an "), 3)
            || !strncmpi(name, _("a "), 2))
            kprefix = KILLED_BY;
    }
    onm = (obj && obj_is_pname(obj)) ? the(name)
          : (obj && obj.quan > 1) ? name
            : an(name);
    is_acid = (((obj && obj.otyp == ACID_VENOM) ? 1 : 0));

    if (u.uac + tlev <= (dieroll = rnd(20))) {
        ++gm.mesg_given;
        if (Blind() || !flags.verbose) {
            pline(_("It misses."));
        } else if (u.uac + tlev <= dieroll - 2) {
            if (onm != onmbuf)
                void strcpy(onmbuf, onm); /* [modifiable buffer for upstart()] */
            pline(_("%s %s you."), upstart(onmbuf), vtense(onmbuf, _("miss")));
        } else
            You(_("are almost hit by %s."), onm);
        return 0;
    } else {
        if (Blind() || !flags.verbose)
            You(_("are hit%s"), exclam(dam));
        else
            You(_("are hit by %s%s"), onm, exclam(dam));

        if (is_acid && Acid_resistance()) {
            pline(_("It doesn't seem to hurt you."));
            monstseesu(M_SEEN_ACID);
        } else if (obj && stone_missile(obj)
                   && passes_rocks(gy.youmonst.data)) {
            /* use 'named' as an approximation for "hitting from above";
               we avoid "passes through you" for horizontal flight path
               because missile stops and that wording would suggest that
               it should keep going */
            pline(_("It %s you."),
                  named ? _("passes harmlessly through") : _("doesn't harm"));
        } else if (obj && obj.oclass == POTION_CLASS) {
            /* an explosion which scatters objects might hit hero with one
               (potions deliberately thrown at hero are handled by m_throw) */
            potionhit(gy.youmonst, obj, POTHIT_OTHER_THROW);
            objp[0] = obj = null; /* potionhit() uses up the potion */
        } else {
            if (obj && objects[obj.otyp].oc_material == SILVER
                && Hate_silver()) {
                /* extra damage already applied by dmgval() */
                pline_The(_("silver sears your flesh!"));
                exercise(A_CON, FALSE);
            }
            if (is_acid) {
                pline(_("It burns!"));
                monstunseesu(M_SEEN_ACID);
            }
            losehp(dam, knm, kprefix); /* acid damage */
            exercise(A_STR, FALSE);
        }
        return 1;
    }
} finally { stack_pop($frame); } }

/* Be sure this corresponds with what happens to player-thrown objects in
 * dothrow.c (for consistency). --KAA
 * Returns FALSE if object still exists (not destroyed).
 */
function /* boolean */
drop_throw(
    obj,
    ohit,
    x,
    y)
{
    let broken;

    if (obj.otyp == CREAM_PIE || obj.oclass == VENOM_CLASS
        || (ohit && obj.otyp == EGG)) {
        broken = TRUE;
    } else {
        broken = (((ohit && should_mulch_missile(obj)) ? 1 : 0));
    }

    if (broken) {
        delobj(obj);
    } else {
        if (down_gate(x, y) != -1)
            broken = ship_object(obj, x, y, FALSE);
        if (!broken) {
            let mtmp = m_at(x, y);
            if (!(broken = flooreffects(obj, x, y, _("fall")))) {
                place_object(obj, x, y);
                if (!mtmp && u_at(x, y))
                    mtmp = gy.youmonst;
                if (mtmp && ohit)
                    passive_obj(mtmp, obj, null);
                stackobj(obj);
            }
        }
    }
    gt.thrownobj = null;
    return broken;
}

/* calculate multishot volley count for mtmp throwing otmp (if not ammo) or
   shooting otmp with mwep (if otmp is ammo and mwep appropriate launcher) */
function /* int */
monmulti(
    mtmp,
    otmp, mwep)
{
    let multishot = 1;

    if (otmp.quan > 1 /* no point checking if there's only 1 */
        /* ammo requires corresponding launcher be wielded */
        && (is_ammo(otmp)
               ? matching_launcher(otmp, mwep)
               /* otherwise any stackable (non-ammo) weapon */
               : otmp.oclass == WEAPON_CLASS)
        && !mtmp.mconf) {
        /* Assumes lords are skilled, princes are expert */
        if (is_prince(mtmp.data))
            multishot += 2;
        else if (is_lord(mtmp.data))
            multishot++;
        /* fake players treated as skilled (regardless of role limits) */
        else if (is_mplayer(mtmp.data))
            multishot++;

        /* this portion is different from hero multishot; from slash'em?
         */
        /* Elven Craftsmanship makes for light, quick bows */
        if (otmp.otyp == ELVEN_ARROW && !otmp.cursed)
            multishot++;
        /* for arrow, we checked bow&arrow when entering block, but for
           bow, so far we've only validated that otmp is a weapon stack;
           need to verify that it's a stack of arrows rather than darts */
        if (mwep && mwep.otyp == ELVEN_BOW && ammo_and_launcher(otmp, mwep)
            && !mwep.cursed)
            multishot++;
        /* 1/3 of launcher enchantment */
        if (ammo_and_launcher(otmp, mwep) && mwep.spe > 1)
            multishot += rounddiv(mwep.spe, 3);
        /* Some randomness */
        multishot = rnd(multishot);

        /* class bonus */
        multishot += multishot_class_bonus(monsndx(mtmp.data), otmp, mwep);

        /* racial bonus */
        if ((is_elf(mtmp.data) && otmp.otyp == ELVEN_ARROW
             && mwep && mwep.otyp == ELVEN_BOW)
            || (is_orc(mtmp.data) && otmp.otyp == ORCISH_ARROW
                && mwep && mwep.otyp == ORCISH_BOW)
            || (is_gnome(mtmp.data) && otmp.otyp == CROSSBOW_BOLT
                && mwep && mwep.otyp == CROSSBOW))
            multishot++;
    }

    if (otmp.quan < multishot)
        multishot = int(otmp.quan);
    if (multishot < 1)
        multishot = 1;
    return multishot;
}

/* mtmp throws otmp, or shoots otmp with mwep, at hero or at monster mtarg */
function /* void */
monshoot(mtmp, otmp, mwep)
{ const $frame = stack_frame(); try {
    let mtarg = gm.mtarget;
    let dm = distmin(mtmp.mx, mtmp.my,
                     mtarg ? mtarg.mx : mtmp.mux,
                     mtarg ? mtarg.my : mtmp.muy),
        multishot = monmulti(mtmp, otmp, mwep);

    /*
     * Caller must have called linedup() to set up <gt.tbx, gt.tby>.
     */

    if (canseemon(mtmp)) {
        let onm;
        let onmbuf = stack_array(char, BUFSZ), trgbuf = stack_array(char, BUFSZ);

        if (multishot > 1) {
            /* "N arrows"; multishot > 1 implies otmp->quan > 1, so
               xname()'s result will already be pluralized */
            void sprintf(onmbuf, _("%d %s"), multishot, xname(otmp));
            onm = onmbuf;
        } else {
            /* "an arrow" */
            onm = singular(otmp, xname);
            onm = obj_is_pname(otmp) ? the(onm) : an(onm);
        }
        gm.m_shot.s = ammo_and_launcher(otmp, mwep) ? TRUE : FALSE;
        void strcpy(trgbuf, mtarg ? some_mon_nam(mtarg) : _(""));
        set_msg_xy(mtmp.mx, mtmp.my);
        pline(_("%s %s %s%s%s!"), Monnam(mtmp),
              gm.m_shot.s ? _("shoots") : _("throws"), onm,
              mtarg ? _(" at ") : _(""), trgbuf);
        gm.m_shot.o = otmp.otyp;
    } else {
        gm.m_shot.o = STRANGE_OBJECT; /* don't give multishot feedback */
    }
    gm.m_shot.n = multishot;
    for (gm.m_shot.i = 1; gm.m_shot.i <= gm.m_shot.n; gm.m_shot.i++) {
        m_throw(mtmp, mtmp.mx, mtmp.my, sgn(gt.tbx), sgn(gt.tby), dm, otmp);
        /* conceptually all N missiles are in flight at once, but
           if mtmp gets killed (shot kills adjacent gas spore and
           triggers explosion, perhaps), inventory will be dropped
           and otmp might go away via merging into another stack */
        if (DEADMONSTER(mtmp) && gm.m_shot.i < gm.m_shot.n)
            /* cancel pending shots (perhaps ought to give a message here
               since we gave one above about throwing/shooting N missiles) */
            break; /* endmultishot(FALSE); */
    }
    /* reset 'gm.m_shot' */
    gm.m_shot.n = gm.m_shot.i = 0;
    gm.m_shot.o = STRANGE_OBJECT;
    gm.m_shot.s = FALSE;
} finally { stack_pop($frame); } }

/* an object launched by someone/thing other than player attacks a monster;
   return 1 if the object has stopped moving (hit or its range used up);
   can anger the monster, if this happened due to hero (eg. exploding
   bag of holding throwing the items) */
export function /* boolean */
ohitmon(
    mtmp,
    otmp,
    range,


    verbose) /* give messages even when you can't see what happened */
{ const $frame = stack_frame(); try {
    let damage, tmp;
    let vis, ismimic, objgone;
    let mon_launcher = gm.marcher ? MON_WEP(gm.marcher) : null;

    /* assert(otmp != NULL); */
    gn.notonhead = (+(gb.bhitpos.x != mtmp.mx || gb.bhitpos.y != mtmp.my));
    ismimic = ((M_AP_TYPE(mtmp) && M_AP_TYPE(mtmp) != M_AP_MONSTER) ? 1 : 0);
    vis = cansee(gb.bhitpos.x, gb.bhitpos.y);
    if (vis)
        observe_object(otmp);

    tmp = 5 + find_mac(mtmp) + omon_adj(mtmp, otmp, FALSE);
    /* High level monsters will be more likely to hit */
    /* This check applies only if this monster is the target
     * the archer was aiming at. */
    if (gm.marcher && gm.mtarget == mtmp) {
        if (gm.marcher.m_lev > 5)
            tmp += gm.marcher.m_lev - 5;
        if (mon_launcher && mon_launcher.oartifact)
            tmp += spec_abon(mon_launcher, mtmp);
    }
    if (tmp < rnd(20)) {
        if (!ismimic) {
            if (vis)
                miss(distant_name(otmp, mshot_xname), mtmp);
            else if (verbose && !gm.mtarget)
                pline(_("It is missed."));
        }
        if (!range) { /* Last position; object drops */
            void drop_throw(otmp, 0, mtmp.mx, mtmp.my);
            return 1;
        }
    } else if (otmp.oclass == POTION_CLASS) {
        if (ismimic)
            seemimic(mtmp);
        mtmp.msleeping = 0;
        /* probably thrown by a monster rather than 'other', but the
           distinction only matters when hitting the hero */
        potionhit(mtmp, otmp, POTHIT_OTHER_THROW);
        return 1;
    } else {
        let material = objects[otmp.otyp].oc_material;
        let harmless = (+(stone_missile(otmp) && passes_rocks(mtmp.data)));

        damage = dmgval(otmp, mtmp);
        if (otmp.otyp == ACID_VENOM && resists_acid(mtmp))
            damage = 0;




        if (ismimic)
            seemimic(mtmp);
        mtmp.msleeping = 0;
         ;
        if (vis) {
            if (otmp.otyp == EGG) {
                pline(_("Splat!  %s is hit with %s egg!"), Monnam(mtmp),
                      otmp.known ? an(mons[otmp.corpsenm].pmnames[NEUTRAL])
                                  : _("an"));
            } else {
                let how = stack_array(char, BUFSZ);

                if (!harmless)
                    void strcpy(how, exclam(damage)); /* "!" or "." */
                else
                    void sprintf(how, _(" but passes harmlessly through %.9s."), mhim(mtmp))
;
                hit(distant_name(otmp, mshot_xname), mtmp, how);
            }
        } else if (verbose && !gm.mtarget)
            pline(_("%s%s is hit%s"), (otmp.otyp == EGG) ? _("Splat!  ") : _(""),
                  Monnam(mtmp), exclam(damage));

        if (otmp.otrapped && is_poisonable(otmp)) {
            if (resists_poison(mtmp)) {
                if (vis)
                    pline_The(_("poison doesn't seem to affect %s."),
                              mon_nam(mtmp));
            } else {
                if (rn2(30)) {
                    damage += rnd(6);
                } else {
                    if (vis)
                        pline_The(_("poison was deadly..."));
                    damage = mtmp.mhp;
                }
            }
        }
        if (material == SILVER && mon_hates_silver(mtmp)) {
            let flesh = (+(!noncorporeal(mtmp.data)
                             && !amorphous(mtmp.data)));

            /* note: extra silver damage is handled by dmgval() */
            if (vis) {
                let m_name = mon_nam(mtmp);

                if (flesh) /* s_suffix returns a modifiable buffer */
                    m_name = strcat(s_suffix(m_name), _(" flesh"));
                pline_The(_("silver sears %s!"), m_name);
            } else if (verbose && !gm.mtarget) {
                pline(_("%s is seared!"), flesh ? _("Its flesh") : _("It"));
            }
        }
        if (otmp.otyp == ACID_VENOM && cansee(mtmp.mx, mtmp.my)) {
            if (resists_acid(mtmp)) {
                if (vis || (verbose && !gm.mtarget))
                    pline(_("%s is unaffected."), Monnam(mtmp));
            } else {
                if (vis)
                    pline_The(_("%s burns %s!"), hliquid(_("acid")), mon_nam(mtmp));
                else if (verbose && !gm.mtarget)
                    pline(_("It is burned!"));
            }
        }
        if (otmp.otyp == EGG && touch_petrifies(mons[otmp.corpsenm])) {
            if (!munstone(mtmp, FALSE))
                minstapetrify(mtmp, FALSE);
            if (resists_ston(mtmp))
                damage = 0;
        }

        /* might already be dead (if petrified) */
        if (!harmless && !DEADMONSTER(mtmp)) {
            mtmp.mhp -= damage;
            if (DEADMONSTER(mtmp)) {
                if (vis || (verbose && !gm.mtarget))
                    pline(_("%s is %s!"), Monnam(mtmp),
                          (nonliving(mtmp.data) || is_vampshifter(mtmp)
                           || !canspotmon(mtmp)) ? _("destroyed") : _("killed"));
                /* don't blame hero for unknown rolling boulder trap */
                if (!svc.context.mon_moving
                   && (otmp.otyp != BOULDER || range >= 0 || otmp.otrapped))
                    xkilled(mtmp, XKILL_NOMSG);
                else
                    mondied(mtmp);
            }
        }

        /* blinding venom and cream pie do 0 damage, but verify
           that the target is still alive anyway */
        if (!DEADMONSTER(mtmp)
            && can_blnd(null, mtmp,
                        ((otmp.otyp == BLINDING_VENOM) ? AT_SPIT
                                                                : AT_WEAP),
                        otmp)) {
            if (vis && mtmp.mcansee)
                /* shorten object name to reduce redundancy in the
                   two message [first via hit() above] sequence:
                   "The {splash of venom,cream pie} hits <mon>."
                   "<Mon> is blinded by the {venom,pie}." */
                pline(_("%s is blinded by %s."), Monnam(mtmp),
                      the((otmp.oclass == VENOM_CLASS) ? _("venom")
                          : (otmp.otyp == CREAM_PIE) ? _("pie")
                            : xname(otmp))); /* catchall; not used */
            mtmp.mcansee = 0;
            tmp = mtmp.mblinded + rnd(25) + 20;
            if (tmp > 127)
                tmp = 127;
            mtmp.mblinded = unsigned(tmp);
        }

        if (!DEADMONSTER(mtmp) && !svc.context.mon_moving)
            setmangry(mtmp, TRUE);

        objgone = drop_throw(otmp, 1, gb.bhitpos.x, gb.bhitpos.y);
        if (!objgone && range == -1) { /* special case */
            obj_extract_self(otmp);    /* free it for motion again */
            return FALSE;
        }
        return TRUE;
    }
    return FALSE;
} finally { stack_pop($frame); } }

/* hero catches gem thrown by mon iff poly'd into unicorn; might drop it */
function /* boolean */
ucatchgem(
    gem,
    mon)
{
    /* won't catch rock or gray stone; catch (then drop) worthless glass */
    if (gem.otyp <= LAST_GLASS_GEM && is_unicorn(gy.youmonst.data)) {
        let gem_xname = xname(gem),
             mon_s_name = s_suffix(mon_nam(mon));

        if (gem.otyp >= FIRST_GLASS_GEM) {
            You(_("catch the %s."), gem_xname);
            You(_("are not interested in %s junk."), mon_s_name);
            makeknown(gem.otyp);
            dropy(gem);
        } else {
            You(_("accept %s gift in the spirit in which it was intended."),
                mon_s_name);
            void hold_another_object(gem, _("You catch, but drop, %s."),
                                       gem_xname, _("You catch:"));
        }
        return TRUE;
    }
    return FALSE;
}

/* hero may catch thrown obj. it is added to inventory, if possible */
function /* boolean */
u_catch_thrown_obj(otmp)
{ const $frame = stack_frame(); try {
    let catch_chance = 100 - ACURR(A_DEX)
                       - ((Role_if(PM_MONK) || Role_if(PM_ROGUE)) ? 20 : 0);

    if (!Blind() && !Confusion() && !Stunned() && !Fumbling()
        && otmp.oclass != VENOM_CLASS
        && !nohands(gy.youmonst.data) && freehand()
        && calc_capacity(int(otmp.owt)) <= SLT_ENCUMBER && !rn2(catch_chance)) {
        let buf = stack_array(char, BUFSZ);

        Snprintf(buf, BUFSZ, _("You catch the %s!"), simpleonames(otmp));
        void hold_another_object(otmp, _("You catch, but drop, the %s."),
                                   simpleonames(otmp), buf);
        return TRUE;
    }
    return FALSE;
} finally { stack_pop($frame); } }




















export function /* void */
m_throw(
    mon,
    x, y,
    dx, dy,
    range,
    obj)        /* missile (or stack providing it) */
{ const $frame = stack_frame(); try {
    let mtmp;
    let singleobj = stack_var(ptr_to(struct_obj));
    let forcehit;
    let sym = obj.oclass;
    let hitu = 0, oldumort, blindinc = 0;
    let arw = autoreturn_weapon(obj);
    let tethered_weapon = (((obj == MON_WEP(mon) && arw && arw.tethered != 0) ? 1 : 0)),
            return_flightpath = FALSE;


    gb.bhitpos.x = x;
    gb.bhitpos.y = y;
    gn.notonhead = FALSE; /* reset potentially stale value */

    if (obj.quan == 1) {
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
        if (MON_WEP(mon) == obj)
            setmnotwielded(mon, obj);
        obj_extract_self(obj);
        singleobj[0] = obj;
        obj = null;
    } else {
        singleobj[0] = splitobj(obj, 1);
        obj_extract_self(singleobj[0]);
    }
    /* global pointer for missile object in OBJ_FREE state */
    gt.thrownobj = singleobj[0];

    singleobj[0].owornmask = 0; /* threw one of multiple weapons in hand? */
    if (!canseemon(mon))
        clear_dknown(singleobj[0]); /* singleobj->dknown = 0; */

    if ((singleobj[0].cursed || singleobj[0].greased) && (dx || dy) && !rn2(7)) {
        if (canseemon(mon) && flags.verbose) {
            if (is_ammo(singleobj[0]))
                pline(_("%s misfires!"), Monnam(mon));
            else
                pline(_("%s as %s throws it!"), Tobjnam(singleobj[0], _("slip")),
                      mon_nam(mon));
        }
        dx = rn2(3) - 1;
        dy = rn2(3) - 1;
        /* check validity of new direction */
        if (!dx && !dy) {
            void drop_throw(singleobj[0], 0, gb.bhitpos.x, gb.bhitpos.y);
            return;
        }
    }

    if ((((((!isok((gb.bhitpos.x + dx), (gb.bhitpos.y + dy)) || IS_OBSTRUCTED(levl()[(gb.bhitpos.x + dx)][(gb.bhitpos.y + dy)].typ)) || closed_door((gb.bhitpos.x + dx), (gb.bhitpos.y + dy))) || (((levl()[(gb.bhitpos.x + dx)][(gb.bhitpos.y + dy)].typ == IRONBARS) && hits_bars(singleobj, gb.bhitpos.x, gb.bhitpos.y, (gb.bhitpos.x + dx), (gb.bhitpos.y + dy), (((TRUE) ? 0 : 0)), 0)))) || ((!(TRUE) && IS_SINK(levl()[gb.bhitpos.x][gb.bhitpos.y].typ)))))) {
        void drop_throw(singleobj[0], 0, gb.bhitpos.x, gb.bhitpos.y);
        return;
    }
    gm.mesg_given = 0; /* a 'missile misses' message has not yet been shown */

    /* Note: drop_throw may destroy singleobj.  Since obj must be destroyed
     * early to avoid the dagger bug, anyone who modifies this code should
     * be careful not to use either one after it's been freed.
     */
    if (sym) {
        if (!tethered_weapon) {
            tmp_at(DISP_FLASH, obj_to_glyph(singleobj[0], rn2_on_display_rng));
        } else {
            tmp_at(DISP_TETHER, obj_to_glyph(singleobj[0], rn2_on_display_rng));
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
        singleobj[0].ox = gb.bhitpos.x += dx;
        singleobj[0].oy = gb.bhitpos.y += dy;
        if (cansee(gb.bhitpos.x, gb.bhitpos.y))
            observe_object(singleobj[0]);

        mtmp = m_at(gb.bhitpos.x, gb.bhitpos.y);
        if (mtmp && shade_miss(mon, mtmp, singleobj[0], TRUE, TRUE)) {
            /* if mtmp is a shade and missile passes harmlessly through it,
               give message and skip it in order to keep going */
            mtmp = null;
        } else if (mtmp) {
            if (ohitmon(mtmp, singleobj[0], range, TRUE))
                break;
        } else if (u_at(gb.bhitpos.x, gb.bhitpos.y)) {
            if (gm.multi)
                nomul(0);

            /* hero might be poly'd into a unicorn */
            if (singleobj[0].oclass == GEM_CLASS && ucatchgem(singleobj[0], mon))
                break;

            if (!tethered_weapon && u_catch_thrown_obj(singleobj[0]))
                break;

            if (singleobj[0].oclass == POTION_CLASS) {
                potionhit(gy.youmonst, singleobj[0], POTHIT_MONST_THROW);
                break;
            }
            oldumort = u.umortality;

            switch (singleobj[0].otyp) {
            case EGG:
                if (!touch_petrifies(mons[singleobj[0].corpsenm])) {
                    impossible(_("monster throwing egg type %d"),
                               singleobj[0].corpsenm);
                    hitu = 0;
                    break;
                }
                /* FALLTHROUGH */;
                /*FALLTHRU*/
            case CREAM_PIE:
            case BLINDING_VENOM:
                hitu = thitu(8, 0, singleobj, 0);
                break;
            default:
                {
                    let dam, hitv;

                    dam = dmgval(singleobj[0], gy.youmonst);
                    hitv = 3 - distmin(u.ux, u.uy, mon.mx, mon.my);
                    if (hitv < -4)
                        hitv = -4;
                    /* [elves get a shooting bonus, orcs don't...] */
                    if (is_elf(mon.data)
                        && objects[singleobj[0].otyp].oc_subtyp == -P_BOW) {
                        hitv++;
                        if (MON_WEP(mon) && MON_WEP(mon).otyp == ELVEN_BOW)
                            hitv++;
                        if (singleobj[0].otyp == ELVEN_ARROW)
                            dam++;
                    }
                    if (bigmonst(gy.youmonst.data))
                        hitv++;
                    hitv += 8 + singleobj[0].spe;
                    if (dam < 1)
                        dam = 1;
                    if (singleobj[0].otyp != ACID_VENOM)
                        dam = Maybe_Half_Phys(dam);
                    hitu = thitu(hitv, dam, singleobj, 0);
                }
            }
            if (hitu && singleobj[0].otrapped && is_poisonable(singleobj[0])) {
                let onmbuf = stack_array(char, BUFSZ), knmbuf = stack_array(char, BUFSZ);

                void strcpy(onmbuf, xname(singleobj[0]));
                void strcpy(knmbuf, killer_xname(singleobj[0]));
                poisoned(onmbuf, A_STR, knmbuf,
                         /* if damage triggered life-saving,
                            poison is limited to attrib loss */
                         (u.umortality > oldumort) ? 0 : 10, TRUE);
            }
            if (hitu && can_blnd(null, gy.youmonst,
                                 ((singleobj[0].otyp == BLINDING_VENOM)
                                             ? AT_SPIT
                                             : AT_WEAP),
                                 singleobj[0])) {
                blindinc = rnd(25);
                if (singleobj[0].otyp == CREAM_PIE) {
                    if (!Blind())
                        pline(_("Yecch!  You've been creamed."));
                    else
                        pline(_("There's %s sticky all over your %s."),
                              something(), body_part(FACE));
                } else if (singleobj[0].otyp == BLINDING_VENOM) {
                    let eyes = body_part(EYE);

                    if (eyecount(gy.youmonst.data) != 1)
                        eyes = makeplural(eyes);
                    /* venom in the eyes */
                    if (!Blind())
                        pline_The(_("venom blinds you."));
                    else
                        Your(_("%s %s."), eyes, vtense(eyes, _("sting")));
                }
            }
            if (hitu && singleobj[0].otyp == EGG) {
                if (!Stoned() && !Stone_resistance()
                    && !(poly_when_stoned(gy.youmonst.data)
                         && polymon(PM_STONE_GOLEM))) {
                    make_stoned(5, 0, KILLED_BY, _(""));
                }
            }
            stop_occupation();
            if (hitu) {
                if (!tethered_weapon) {
                    void drop_throw(singleobj[0], hitu, u.ux, u.uy);
                } else {
                    /* ready for return journey */
                    return_flightpath = TRUE;
                }
                break;
            }
        }

        forcehit = +!rn2(5);
        if (!range || (((((!isok((gb.bhitpos.x + dx), (gb.bhitpos.y + dy)) || IS_OBSTRUCTED(levl()[(gb.bhitpos.x + dx)][(gb.bhitpos.y + dy)].typ)) || closed_door((gb.bhitpos.x + dx), (gb.bhitpos.y + dy))) || (((levl()[(gb.bhitpos.x + dx)][(gb.bhitpos.y + dy)].typ == IRONBARS) && hits_bars(singleobj, gb.bhitpos.x, gb.bhitpos.y, (gb.bhitpos.x + dx), (gb.bhitpos.y + dy), (((FALSE) ? 0 : forcehit)), 0)))) || ((!(FALSE) && IS_SINK(levl()[gb.bhitpos.x][gb.bhitpos.y].typ)))))) {
            /* end of path or blocked */
            if (singleobj[0]) { /* hits_bars might have destroyed it */
                /* note: pline(The(missile)) rather than pline_The(missile)
                   in order to get "Grimtooth" rather than "The Grimtooth" */
                if (range && cansee(gb.bhitpos.x, gb.bhitpos.y)
                    && IS_SINK(levl()[gb.bhitpos.x][gb.bhitpos.y].typ))
                    pline(_("%s %s onto the sink."), The(mshot_xname(singleobj[0])),
                          otense(singleobj[0], Hallucination() ? _("plop") : _("drop")));
                else if (gm.m_shot.n > 1
                         && (!gm.mesg_given
                             || gb.bhitpos.x != u.ux || gb.bhitpos.y != u.uy)
                         && (cansee(gb.bhitpos.x, gb.bhitpos.y)
                             || (gm.marcher && canseemon(gm.marcher))))
                    pline(_("%s misses."), The(mshot_xname(singleobj[0])));
                if (!tethered_weapon) {
                    void drop_throw(singleobj[0], 0,
                                      gb.bhitpos.x, gb.bhitpos.y);
                } else {
                    /*ready for return journey */
                    return_flightpath = TRUE;
                }
            }
            break;
        }
        tmp_at(gb.bhitpos.x, gb.bhitpos.y);
        nh_delay_output()();
    }
    tmp_at(gb.bhitpos.x, gb.bhitpos.y);
    nh_delay_output()();
    if (arw && return_flightpath)
        return_from_mtoss(mon, singleobj[0], tethered_weapon);
        /* mon could be DEADMONSTER now */
    else
        tmp_at(DISP_END, 0);
    gm.mesg_given = 0; /* reset */

    if (blindinc) {
        u.ucreamed += unsigned(blindinc);
        make_blinded(BlindedTimeout() + blindinc, FALSE);
        if (!Blind())
            Your1(vision_clears());
    }
    /* note: all early returns follow drop_throw() which clears thrownobj */
    gt.thrownobj = null;
    return;
} finally { stack_pop($frame); } }



function /* void */
return_from_mtoss(
    magr,
    otmp,
    tethered_weapon)
{ const $frame = stack_frame(); try {
    let impaired = (((magr.mconf || magr.mstun || magr.mblinded) ? 1 : 0)),
            notcaught = FALSE, hits_thrower = FALSE;
    let x = gb.bhitpos.x, y = gb.bhitpos.y;
    let made_it_back = rn2(100), dmg = stack_var(int, 0);

    if (otmp && made_it_back) {
        /* it made it back to thrower's location */
        if (tethered_weapon) {
            tmp_at(DISP_END, BACKTRACK);
        } else {
            let dx = sgn(x - magr.mx),
                dy = sgn(y - magr.my);

            if (x != magr.mx || y != magr.my) {
                tmp_at(DISP_FLASH, obj_to_glyph(otmp, rn2_on_display_rng));
                while (isok(x, y) && (x != magr.mx || y != magr.my)) {
                    tmp_at(x, y);
                    nh_delay_output()();
                    x -= dx;
                    y -= dy;
                }
                tmp_at(DISP_END, 0);
            }
        }
        x = magr.mx;
        y = magr.my;
        if (!impaired && rn2(100)) {
            /* FIXME: this should be moved to struct g (gd these days) */
            let do_not_annoy = static_var("return_from_mtoss.do_not_annoy", long, 0);

            if (!do_not_annoy[0] || (svm.moves - do_not_annoy[0]) > 500) {
                pline(_("%s to %s %s!"), Tobjnam(otmp, _("return")),
                      s_suffix(mon_nam(magr)), mbodypart(magr, HAND));
                do_not_annoy[0] = svm.moves;
            }
            if (otmp) {
                add_to_minv(magr, otmp);
                if (tethered_weapon) {
                    magr.mw = otmp;
                    otmp.owornmask = or64(otmp.owornmask, W_WEP);
                }
            }
            if (cansee(x, y))
                newsym(x, y);
        } else {
            let mlevitating = FALSE;  /* msg future-proofing only */

            dmg[0] = rn2(2);
            if (!dmg[0]) {
                if (canseemon(magr)) {
                    pline(_("%s back to %s, landing %s %s %s."),
                          Tobjnam(otmp, _("return")), mon_nam(magr),
                          mlevitating ? _("beneath") : _("at"), mhis(magr),
                          makeplural(mbodypart(magr, FOOT)));
                } else if (!Deaf()) {
                    You_hear(_("%s land near %s."), Something(), mon_nam(magr));
                }
            } else {
                dmg[0] += rnd(3);
                if (canseemon(magr)) {
                    pline(_("%s back toward %s, hitting %s %s!"),
                          Tobjnam(otmp, _("fly")), mon_nam(magr),
                          mhis(magr), body_part(ARM));
                } else if (!Deaf()) {
                    You_hear(_("%s hit %s with a thud!"), something(),
                             mon_nam(magr));
                }
                hits_thrower = TRUE;
            }
            notcaught = TRUE;
        }
    } else {
        /* it didn't make it back to thrower's location */
        if (tethered_weapon)
            tmp_at(DISP_END, 0);
        You_hear(_("a loud snap!"));
        notcaught = TRUE;
    }
    if (otmp) {
        if (hits_thrower) {
            if (otmp.oartifact)
                void artifact_hit(null, magr, otmp, dmg, 0);
            magr.mhp -= dmg[0];
            if (DEADMONSTER(magr))
                monkilled(magr, canspotmon(magr) ? _("") : 0, AD_PHYS);
        }
        if (notcaught) {
            void snuff_candle(otmp);
            if (!ship_object(otmp, x, y, FALSE)) {
                if (flooreffects(otmp, x, y, _("drop"))) {
                    if (cansee(x, y))
                        newsym(x, y);
                    return;
                }
                place_object(otmp, x, y);
                stackobj(otmp);
            }
            if (!Deaf() && !Underwater()) {
                /* Some sound effects when item lands in water or lava */
                if (is_pool(x, y) || (is_lava(x, y) && !is_flammable(otmp))) {
                     ;
                    pline((weight(otmp) > 9) ? _("Splash!") : _("Plop!"));
                }
            }
            if (obj_sheds_light(otmp))
                gv.vision_full_recalc = 1;
        }
    }
    if (cansee(x, y))
        newsym(x, y);
} finally { stack_pop($frame); } }

/* Monster throws item at another monster */
export function /* int */
thrwmm(mtmp, mtarg)
{
    let otmp, mwep;
    let x, y;
    let ispole;

    /* Polearms won't be applied by monsters against other monsters */
    if (mtmp.weapon_check == NEED_WEAPON || !MON_WEP(mtmp)) {
        mtmp.weapon_check = NEED_RANGED_WEAPON;
        /* mon_wield_item resets weapon_check as appropriate */
        if (mon_wield_item(mtmp) != 0)
            return M_ATTK_MISS;
    }

    /* Pick a weapon */
    otmp = select_rwep(mtmp);
    if (!otmp)
        return M_ATTK_MISS;
    ispole = is_pole(otmp);

    x = mtmp.mx;
    y = mtmp.my;

    mwep = MON_WEP(mtmp); /* wielded weapon */

    if (!ispole && m_lined_up(mtarg, mtmp)) {
        let chance = max(BOLT_LIM - distmin(x, y, mtarg.mx, mtarg.my), 1);

        if (!mtarg.mflee || !rn2(chance)) {
            if (ammo_and_launcher(otmp, mwep)
                && dist2(mtmp.mx, mtmp.my, mtarg.mx, mtarg.my)
                   > PET_MISSILE_RANGE2)
                return M_ATTK_MISS; /* Out of range */
            /* Set target monster */
            gm.mtarget = mtarg;
            gm.marcher = mtmp;
            monshoot(mtmp, otmp, mwep); /* multishot shooting or throwing */
            gm.marcher = gm.mtarget = null;
            nomul(0);
            return M_ATTK_HIT;
        }
    }
    return M_ATTK_MISS;
}

/* monster spits substance at monster */
export function /* int */
spitmm(mtmp, mattk, mtarg)
{
    let otmp;

    if (mtmp.mcan) {
        if (!Deaf() && mdistu(mtmp) < BOLT_LIM * BOLT_LIM) {
            if (canspotmon(mtmp)) {
                pline(_("A dry rattle comes from %s throat."),
                      s_suffix(mon_nam(mtmp)));
            } else {
                 ;
                You_hear(_("a dry rattle nearby."));
            }
        }
        return M_ATTK_MISS;
    }
    if (m_lined_up(mtarg, mtmp)) {
        let utarg = (+(mtarg == gy.youmonst));
        let tx = utarg ? mtmp.mux : mtarg.mx;
        let ty = utarg ? mtmp.muy : mtarg.my;

        switch (mattk.adtyp) {
        case AD_BLND:
        case AD_DRST:
            otmp = mksobj(BLINDING_VENOM, TRUE, FALSE);
            break;
        default:
            impossible(_("bad attack type in spitmm"));
            /* FALLTHROUGH */;
            /*FALLTHRU*/
        case AD_ACID:
            otmp = mksobj(ACID_VENOM, TRUE, FALSE);
            break;
        }
        if (!rn2(BOLT_LIM-distmin(mtmp.mx,mtmp.my,tx,ty))) {
            if (canseemon(mtmp))
                pline(_("%s spits venom!"), Monnam(mtmp));
            if (!utarg)
                gm.mtarget = mtarg;
            m_throw(mtmp, mtmp.mx, mtmp.my, sgn(gt.tbx), sgn(gt.tby),
                    distmin(mtmp.mx,mtmp.my,tx,ty), otmp);
            gm.mtarget = null;
            nomul(0);

            /* If this is a pet, it'll get hungry. Minions and
             * spell beings won't hunger */
            if (mtmp.mtame && !mtmp.isminion) {
                let dog = EDOG(mtmp);

                /* Hunger effects will catch up next move */
                if (dog.hungrytime > 1)
                    dog.hungrytime -= 5;
            }

            return M_ATTK_HIT;
        } else {
            obj_extract_self(otmp);
            obfree(otmp, null);
        }
    }
    return M_ATTK_MISS;
}

/* Return the name of a breath weapon. If the player is hallucinating, return
 * a silly name instead.
 * typ is AD_MAGM, AD_FIRE, etc */
function /* const char * */
breathwep_name(typ)
{
    if (Hallucination())
        return rnd_hallublast();

    return breathwep[BZ_OFS_AD(typ)];
}

/* monster breathes at monster (ranged) */
export function /* int */
breamm(mtmp, mattk, mtarg)
{
    let typ = get_atkdam_type(mattk.adtyp);
    let utarget = (+(mtarg == gy.youmonst));

    if (m_lined_up(mtarg, mtmp)) {
        if (mtmp.mcan) {
            if (!Deaf()) {
                if (canseemon(mtmp)) {
                    pline(_("%s coughs."), Monnam(mtmp));
                } else {
                     ;
                    You_hear(_("a cough."));
                }
            }
            return M_ATTK_MISS;
        }

        /* if we've seen the actual resistance, don't bother, or
           if we're close by and they reflect, just jump the player */
        if (utarget && (m_seenres(mtmp, cvt_adtyp_to_mseenres(uchar(typ)))
                        || (((mtmp).seen_resistance & (M_SEEN_REFL)))))
            return M_ATTK_HIT;

        if (!mtmp.mspec_used && rn2(3)) {
            if (BZ_VALID_ADTYP(typ)) {
                if (canseemon(mtmp))
                    pline(_("%s breathes %s!"),
                          Monnam(mtmp), breathwep_name(typ));
                gb.buzzer = mtmp;
                dobuzz(BZ_M_BREATH(BZ_OFS_AD(typ)), mattk.damn,
                       mtmp.mx, mtmp.my, sgn(gt.tbx), sgn(gt.tby),
                       utarget, utarget, FALSE);
                gb.buzzer = null;
                nomul(0);
                /* breath runs out sometimes. Also, give monster some
                 * cunning; don't breath if the target fell asleep.
                 */
                if (!utarget || !rn2(3))
                    mtmp.mspec_used = 8 + rn2(18);
                if (utarget && typ == AD_SLEE && !Sleep_resistance())
                    mtmp.mspec_used += rnd(20);

                /* If this is a pet, it'll get hungry. Minions and
                 * spell beings won't hunger */
                if (mtmp.mtame && !mtmp.isminion) {
                    let dog = EDOG(mtmp);

                    /* Hunger effects will catch up next move */
                    if (dog.hungrytime >= 10)
                        dog.hungrytime -= 10;
                }
            } else impossible(_("Breath weapon %d used"), typ-1);
        } else
            return M_ATTK_MISS;
    }
    return M_ATTK_HIT;
}

/* remove an entire item from a monster's inventory; destroy that item */
export function /* void */
m_useupall(mon, obj)
{
    extract_from_minvent(mon, obj, TRUE, FALSE);
    obfree(obj, null);
}

/* remove one instance of an item from a monster's inventory */
export function /* void */
m_useup(mon, obj)
{
    if (obj.quan > 1) {
        obj.quan--;
        obj.owt = unsigned(weight(obj));
    } else {
        m_useupall(mon, obj);
    }
}

/* monster attempts ranged weapon attack against player */
export function /* void */
thrwmu(mtmp)
{ const $frame = stack_frame(); try {
    let otmp = stack_var(ptr_to(struct_obj)), mwep;
    let x, y;
    let onm;
    let rang;
    let arw;
    let always_toss = FALSE;

    /* Rearranged beginning so monsters can use polearms not in a line */
    if (mtmp.weapon_check == NEED_WEAPON || !MON_WEP(mtmp)) {
        mtmp.weapon_check = NEED_RANGED_WEAPON;
        /* mon_wield_item resets weapon_check as appropriate */
        if (mon_wield_item(mtmp) != 0)
            return;
    }

    /* Pick a weapon */
    otmp[0] = select_rwep(mtmp);
    if (!otmp[0])
        return;

    if (is_pole(otmp[0])) {
        let dam, hitv;

        if (otmp[0] != MON_WEP(mtmp))
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
        rang = dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy);
        if (rang > MON_POLE_DIST || !couldsee(mtmp.mx, mtmp.my))
            return; /* Out of range, or intervening wall */

        if (canseemon(mtmp)) {
            onm = xname(otmp[0]);
            pline_mon(mtmp, _("%s %s %s."), Monnam(mtmp),
                  /* "thrusts" or "swings", or "bashes with" if adjacent */
                  mswings_verb(otmp[0], (rang <= 2) ? TRUE : FALSE),
                  obj_is_pname(otmp[0]) ? the(onm) : an(onm));
        }

        dam = dmgval(otmp[0], gy.youmonst);
        hitv = 3 - distmin(u.ux, u.uy, mtmp.mx, mtmp.my);
        if (hitv < -4)
            hitv = -4;
        if (bigmonst(gy.youmonst.data))
            hitv++;
        hitv += 8 + otmp[0].spe;
        if (dam < 1)
            dam = 1;

        void thitu(hitv, Maybe_Half_Phys(dam), otmp, 0);
        stop_occupation();
        return;
    } else if ((arw = autoreturn_weapon(otmp[0])) != null && !mwelded(otmp[0])) {
        rang = dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy);
        if (rang > arw.range || !couldsee(mtmp.mx, mtmp.my))
            return; /* Out of range, or intervening wall */
        always_toss = TRUE;
    }

    x = mtmp.mx;
    y = mtmp.my;
    /* If you are coming toward the monster, the monster
     * should try to soften you up with missiles.  If you are
     * going away, you are probably hurt or running.  Give
     * chase, but if you are getting too far away, throw.
     */
    if (!lined_up(mtmp)
        || (URETREATING(x, y)
            && (!always_toss
                && rn2(BOLT_LIM - distmin(x, y, mtmp.mux, mtmp.muy)))))
        return;

    mwep = MON_WEP(mtmp); /* wielded weapon */
    monshoot(mtmp, otmp[0], mwep); /* multishot shooting or throwing */
    nomul(0);
} finally { stack_pop($frame); } }

/* monster spits substance at you */
export function /* int */
spitmu(mtmp, mattk)
{
    return spitmm(mtmp, mattk, gy.youmonst);
}

/* monster breathes at you (ranged) */
export function /* int */
breamu(mtmp, mattk)
{
    return breamm(mtmp, mattk, gy.youmonst);
}

/* return TRUE if terrain at x,y blocks linedup checks */
function /* boolean */
blocking_terrain(x, y)
{
    if (!isok(x, y) || IS_OBSTRUCTED(levl()[x][y].typ) || closed_door(x, y)
        || is_waterwall(x, y) || levl()[x][y].typ == LAVAWALL)
        return TRUE;
    return FALSE;
}

/* Move from (ax,ay) to (bx,by), but only if distance is up to BOLT_LIM
   and only in straight line or diagonal, calling fnc for each step.
   Stops if fnc return TRUE, or if step was blocked by wall or closed door.
   Returns TRUE if fnc returned TRUE. */
export function /* boolean */
linedup_callback(
    ax,
    ay,
    bx,
    by,
    fnc)
{
    let dx, dy;

    /* These two values are set for use after successful return. */
    gt.tbx = ax - bx;
    gt.tby = ay - by;

    /* sometimes displacement makes a monster think that you're at its
       own location; prevent it from throwing and zapping in that case */
    if (!gt.tbx && !gt.tby)
        return FALSE;

    /* straight line, orthogonal to the map or diagonal */
    if ((!gt.tbx || !gt.tby || abs(gt.tbx) == abs(gt.tby))
        && distmin(gt.tbx, gt.tby, 0, 0) < BOLT_LIM) {
        dx = sgn(ax - bx), dy = sgn(ay - by);
        do {
            /* <bx,by> is guaranteed to eventually converge with <ax,ay> */
            bx += dx, by += dy;
            if (blocking_terrain(bx, by))
                return FALSE;
            if ((fnc)(bx, by))
                return TRUE;
        } while (bx != ax || by != ay);
    }
    return FALSE;
}

export function /* boolean */
linedup(
    ax,
    ay,
    bx,
    by,
    boulderhandling) /* 0=block, 1=ignore, 2=conditionally block */
{
    let dx, dy, boulderspots;

    /* These two values are set for use after successful return. */
    gt.tbx = ax - bx;
    gt.tby = ay - by;

    /* sometimes displacement makes a monster think that you're at its
       own location; prevent it from throwing and zapping in that case */
    if (!gt.tbx && !gt.tby)
        return FALSE;

    /* straight line, orthogonal to the map or diagonal */
    if ((!gt.tbx || !gt.tby || abs(gt.tbx) == abs(gt.tby))
        && distmin(gt.tbx, gt.tby, 0, 0) < BOLT_LIM) {
        if (u_at(ax, ay) ? couldsee(bx, by)
                         : clear_path(ax, ay, bx, by))
            return TRUE;
        /* don't have line of sight, but might still be lined up
           if that lack of sight is due solely to boulders */
        if (boulderhandling == 0)
            return FALSE;
        dx = sgn(ax - bx), dy = sgn(ay - by);
        boulderspots = 0;
        do {
            /* <bx,by> is guaranteed to eventually converge with <ax,ay> */
            bx += dx, by += dy;
            if (blocking_terrain(bx, by))
                return FALSE;
            if (sobj_at(BOULDER, bx, by))
                ++boulderspots;
        } while (bx != ax || by != ay);
        /* reached target position without encountering obstacle */
        if (boulderhandling == 1 || rn2(2 + boulderspots) < 2)
            return TRUE;
    }
    return FALSE;
}

function /* int */
m_lined_up(mtarg, mtmp)
{
    let utarget = (+(mtarg == gy.youmonst));
    let tx = utarget ? mtmp.mux : mtarg.mx;
    let ty = utarget ? mtmp.muy : mtarg.my;
    let ignore_boulders = ((utarget && (throws_rocks(mtmp.data)
                                          || m_carrying(mtmp, WAN_STRIKING))) ? 1 : 0);

    /* hero concealment usually trumps monst awareness of being lined up */
    if (utarget && Upolyd() && rn2(25)
        && (u.uundetected || (U_AP_TYPE() != M_AP_NOTHING
                              && U_AP_TYPE() != M_AP_MONSTER)))
        return FALSE;

    /* [no callers care about the 1 vs 2 situation any more] */
    return linedup(tx, ty, mtmp.mx, mtmp.my,
                   utarget ? (ignore_boulders ? 1 : 2) : 0);
}


/* is mtmp in position to use ranged attack on hero? */
export function /* boolean */
lined_up(mtmp)
{
    return m_lined_up(gy.youmonst, mtmp) ? TRUE : FALSE;
}

/* check if a monster is carrying an item of a particular type */
export function /* struct obj * */
m_carrying(mtmp, type)
{
    let otmp;

    for (otmp = (mtmp == gy.youmonst) ? gi.invent : mtmp.minvent; otmp;
         otmp = otmp.nobj)
        if (otmp.otyp == type)
            break;
    return otmp;
}

export function /* void */
hit_bars(
    objp,
    objx, objy,
    barsx, barsy,
    breakflags)  /* breakage control */
{
    let otmp = objp[0];
    let obj_type = otmp.otyp;
    let nodissolve = +((levl()[barsx][barsy].flags & W_NONDIGGABLE) != 0),
            your_fault = +((breakflags & BRK_BY_HERO) != 0),
            melee_attk = +((breakflags & BRK_MELEE) != 0);
    let noise = 0;

    if (your_fault
        ? hero_breaks(otmp, objx, objy, breakflags)
        : breaks(otmp, objx, objy)) {
        objp[0] = null; /* object is now gone */
        /* breakage makes its own noises */
        if (obj_type == POT_ACID) {
            if (cansee(barsx, barsy) && !nodissolve) {
                pline_The(_("iron bars are dissolved!"));
            } else {
                 ;
                You_hear(Hallucination() ? _("angry snakes!")
                                       : _("a hissing noise."));
            }
            if (!nodissolve)
                dissolve_bars(barsx, barsy);
        }
    } else {
        if (!Deaf()) {
            let se = static_array("hit_bars.se", unsigned, null, [
                se_zero_invalid,
                se_bars_whang, se_bars_whap, se_bars_flapp,
                se_bars_clink, se_bars_clonk
            ]);
            let barsounds = static_array("hit_bars.barsounds", ptr_to(char), null, [
                _(""), _("Whang"), _("Whap"), _("Flapp"), _("Clink"), _("Clonk")
            ]);
            let bsindx = (obj_type == BOULDER || obj_type == HEAVY_IRON_BALL)
                         ? 1
                         : harmless_missile(otmp) ? 2
                         : is_flimsy(otmp) ? 3
                         : (otmp.oclass == COIN_CLASS
                            || objects[obj_type].oc_material == GOLD
                            || objects[obj_type].oc_material == SILVER)
                           ? 4
                           : SIZE(barsounds) - 1;

             ;
            pline(_("%s!"), barsounds[bsindx]);
            (void (se[bsindx]));
        }
        if (!(harmless_missile(otmp) || is_flimsy(otmp)))
            noise = 4 * 4;

        if (your_fault && (otmp.otyp == WAR_HAMMER
                           || otmp.otyp == HEAVY_IRON_BALL)) {
            /* iron ball isn't a weapon or wep-tool so doesn't use obj->spe;
               weight is normally 480 but can be increased by increments
               of 160 (scrolls of punishment read while already punished) */
            let spe = ((otmp.otyp == HEAVY_IRON_BALL) /* 3+ for iron ball */
                       ? (Math.trunc(int(otmp.owt) / WT_IRON_BALL_INCR))
                       : otmp.spe);
            /* chance: used in saving throw for the bars; more likely to
               break those when 'chance' is _lower_; acurrstr(): 3..25 */
            let chance = (melee_attk ? 40 : 60) - acurrstr() - spe;

            if (!rn2(max(2, chance))) {
                You(_("break the bars apart!"));
                dissolve_bars(barsx, barsy);
                noise = noise * 2;
            }
        }

        if (noise)
            wake_nearto(barsx, barsy, noise);
    }
}

/* TRUE iff thrown/kicked/rolled object doesn't pass through iron bars */
export function /* boolean */
hits_bars(
    obj_p,
    x, y,
    barsx, barsy,
    always_hit,

    whodidit)         /* 1==hero, 0=other, -1==just check whether it
                           * will pass through */
{
    let otmp = obj_p[0];
    let obj_type = otmp.otyp;
    let hits = always_hit;

    if (!hits)
        switch (otmp.oclass) {
        case WEAPON_CLASS: {
            let oskill = objects[obj_type].oc_subtyp;

            hits = (+(oskill != -P_BOW && oskill != -P_CROSSBOW
                    && oskill != -P_DART && oskill != -P_SHURIKEN
                    && oskill != P_SPEAR
                    && oskill != P_KNIFE)); /* but not dagger */
            break;
        }
        case ARMOR_CLASS:
            hits = (+(objects[obj_type].oc_subtyp != ARM_GLOVES));
            break;
        case TOOL_CLASS:
            hits = (+(obj_type != SKELETON_KEY && obj_type != LOCK_PICK
                    && obj_type != CREDIT_CARD && obj_type != TALLOW_CANDLE
                    && obj_type != WAX_CANDLE && obj_type != LENSES
                    && obj_type != TIN_WHISTLE && obj_type != MAGIC_WHISTLE));
            break;
        case ROCK_CLASS: /* includes boulder */
            if (obj_type != STATUE || mons[otmp.corpsenm].msize > MZ_TINY)
                hits = TRUE;
            break;
        case FOOD_CLASS:
            if (obj_type == CORPSE && mons[otmp.corpsenm].msize > MZ_TINY)
                hits = TRUE;
            else
                hits = (+(obj_type == MEAT_STICK
                        || obj_type == ENORMOUS_MEATBALL));
            break;
        case SPBOOK_CLASS:
        case WAND_CLASS:
        case BALL_CLASS:
        case CHAIN_CLASS:
            hits = TRUE;
            break;
        default:
            break;
        }

    if (hits && whodidit != -1) {
        hit_bars(obj_p, x, y, barsx, barsy,
                 (whodidit == 1) ? BRK_BY_HERO : 0);
    }

    return hits;
}

/*mthrowu.c*/
import { A_CON } from "./attrib.h.js";
import { A_DEX } from "./attrib.h.js";
import { A_STR } from "./attrib.h.js";
import { ACURR } from "./attrib.h.macros.js";
import { Something } from "./decl.h.macros.js";
import { something } from "./decl.h.macros.js";
import { vision_clears } from "./decl.h.macros.js";
import { ARMOR_CLASS } from "./defsym.h.js";
import { BALL_CLASS } from "./defsym.h.js";
import { CHAIN_CLASS } from "./defsym.h.js";
import { COIN_CLASS } from "./defsym.h.js";
import { FOOD_CLASS } from "./defsym.h.js";
import { GEM_CLASS } from "./defsym.h.js";
import { POTION_CLASS } from "./defsym.h.js";
import { ROCK_CLASS } from "./defsym.h.js";
import { SPBOOK_CLASS } from "./defsym.h.js";
import { TOOL_CLASS } from "./defsym.h.js";
import { VENOM_CLASS } from "./defsym.h.js";
import { WAND_CLASS } from "./defsym.h.js";
import { WEAPON_CLASS } from "./defsym.h.js";
import { BACKTRACK } from "./display.h.js";
import { DISP_END } from "./display.h.js";
import { DISP_FLASH } from "./display.h.js";
import { DISP_TETHER } from "./display.h.js";
import { canspotmon } from "./display.h.macros.js";
import { obj_to_glyph } from "./display.h.macros.js";
import { BUFSZ } from "./global.h.js";
import { FALSE } from "./global.h.js";
import { TRUE } from "./global.h.js";
import { ARM } from "./hack.h.js";
import { BOLT_LIM } from "./hack.h.js";
import { BRK_BY_HERO } from "./hack.h.js";
import { BRK_MELEE } from "./hack.h.js";
import { EYE } from "./hack.h.js";
import { FACE } from "./hack.h.js";
import { FOOT } from "./hack.h.js";
import { HAND } from "./hack.h.js";
import { KILLED_BY } from "./hack.h.js";
import { KILLED_BY_AN } from "./hack.h.js";
import { MON_POLE_DIST } from "./hack.h.js";
import { PET_MISSILE_RANGE2 } from "./hack.h.js";
import { SLT_ENCUMBER } from "./hack.h.js";
import { XKILL_NOMSG } from "./hack.h.js";
import { BZ_M_BREATH } from "./hack.h.macros.js";
import { BZ_OFS_AD } from "./hack.h.macros.js";
import { BZ_VALID_ADTYP } from "./hack.h.macros.js";
import { Maybe_Half_Phys } from "./hack.h.macros.js";
import { ROLL_FROM } from "./hack.h.macros.js";
import { Your1 } from "./hack.h.macros.js";
import { makeknown } from "./hack.h.macros.js";
import { max } from "./hack.h.macros.js";
import { mdistu } from "./hack.h.macros.js";
import { Snprintf } from "./hacklib.h.macros.js";
import { EDOG } from "./mextra.h.macros.js";
import { AD_ACID } from "./monattk.h.js";
import { AD_BLND } from "./monattk.h.js";
import { AD_DRST } from "./monattk.h.js";
import { AD_PHYS } from "./monattk.h.js";
import { AD_SLEE } from "./monattk.h.js";
import { AT_SPIT } from "./monattk.h.js";
import { AT_WEAP } from "./monattk.h.js";
import { M_ATTK_HIT } from "./monattk.h.js";
import { M_ATTK_MISS } from "./monattk.h.js";
import { amorphous } from "./mondata.h.macros.js";
import { bigmonst } from "./mondata.h.macros.js";
import { eyecount } from "./mondata.h.macros.js";
import { is_elf } from "./mondata.h.macros.js";
import { is_gnome } from "./mondata.h.macros.js";
import { is_lord } from "./mondata.h.macros.js";
import { is_mplayer } from "./mondata.h.macros.js";
import { is_orc } from "./mondata.h.macros.js";
import { is_prince } from "./mondata.h.macros.js";
import { is_unicorn } from "./mondata.h.macros.js";
import { monsndx } from "./mondata.h.macros.js";
import { nohands } from "./mondata.h.macros.js";
import { noncorporeal } from "./mondata.h.macros.js";
import { nonliving } from "./mondata.h.macros.js";
import { passes_rocks } from "./mondata.h.macros.js";
import { throws_rocks } from "./mondata.h.macros.js";
import { touch_petrifies } from "./mondata.h.macros.js";
import { MZ_TINY } from "./monflag.h.js";
import { NEUTRAL } from "./monflag.h.js";
import { M_AP_MONSTER } from "./monst.h.js";
import { M_AP_NOTHING } from "./monst.h.js";
import { M_SEEN_ACID } from "./monst.h.js";
import { M_SEEN_REFL } from "./monst.h.js";
import { NEED_RANGED_WEAPON } from "./monst.h.js";
import { NEED_WEAPON } from "./monst.h.js";
import { DEADMONSTER } from "./monst.h.macros.js";
import { MON_WEP } from "./monst.h.macros.js";
import { M_AP_TYPE } from "./monst.h.macros.js";
import { U_AP_TYPE } from "./monst.h.macros.js";
import { is_vampshifter } from "./monst.h.macros.js";
import { m_seenres } from "./monst.h.macros.js";
import { resists_acid } from "./monst.h.macros.js";
import { resists_poison } from "./monst.h.macros.js";
import { resists_ston } from "./monst.h.macros.js";
import { PM_MONK } from "./monsters.h.js";
import { PM_ROGUE } from "./monsters.h.js";
import { PM_STONE_GOLEM } from "./monsters.h.js";
import { POTHIT_MONST_THROW } from "./obj.h.js";
import { POTHIT_OTHER_THROW } from "./obj.h.js";
import { struct_obj } from "./obj.h.js";
import { ammo_and_launcher } from "./obj.h.macros.js";
import { is_ammo } from "./obj.h.macros.js";
import { is_flimsy } from "./obj.h.macros.js";
import { is_launcher } from "./obj.h.macros.js";
import { is_poisonable } from "./obj.h.macros.js";
import { is_pole } from "./obj.h.macros.js";
import { matching_launcher } from "./obj.h.macros.js";
import { stone_missile } from "./obj.h.macros.js";
import { ARM_GLOVES } from "./objclass.h.js";
import { GOLD } from "./objclass.h.js";
import { SILVER } from "./objclass.h.js";
import { ACID_VENOM } from "./objects.h.js";
import { BLINDING_VENOM } from "./objects.h.js";
import { BOULDER } from "./objects.h.js";
import { CORPSE } from "./objects.h.js";
import { CREAM_PIE } from "./objects.h.js";
import { CREDIT_CARD } from "./objects.h.js";
import { CROSSBOW } from "./objects.h.js";
import { CROSSBOW_BOLT } from "./objects.h.js";
import { EGG } from "./objects.h.js";
import { ELVEN_ARROW } from "./objects.h.js";
import { ELVEN_BOW } from "./objects.h.js";
import { ENORMOUS_MEATBALL } from "./objects.h.js";
import { FIRST_GLASS_GEM } from "./objects.h.js";
import { HEAVY_IRON_BALL } from "./objects.h.js";
import { LAST_GLASS_GEM } from "./objects.h.js";
import { LENSES } from "./objects.h.js";
import { LOCK_PICK } from "./objects.h.js";
import { MAGIC_WHISTLE } from "./objects.h.js";
import { MEAT_STICK } from "./objects.h.js";
import { ORCISH_ARROW } from "./objects.h.js";
import { ORCISH_BOW } from "./objects.h.js";
import { POT_ACID } from "./objects.h.js";
import { SKELETON_KEY } from "./objects.h.js";
import { STATUE } from "./objects.h.js";
import { STRANGE_OBJECT } from "./objects.h.js";
import { TALLOW_CANDLE } from "./objects.h.js";
import { TIN_WHISTLE } from "./objects.h.js";
import { WAN_STRIKING } from "./objects.h.js";
import { WAR_HAMMER } from "./objects.h.js";
import { WAX_CANDLE } from "./objects.h.js";
import { W_WEP } from "./prop.h.js";
import { IRONBARS } from "./rm.h.js";
import { LAVAWALL } from "./rm.h.js";
import { W_NONDIGGABLE } from "./rm.h.js";
import { IS_OBSTRUCTED } from "./rm.h.macros.js";
import { IS_SINK } from "./rm.h.macros.js";
import { levl } from "./rm.h.macros.js";
import { m_at } from "./rm.h.macros.js";
import { se_bars_clink } from "./seffects.h.js";
import { se_bars_clonk } from "./seffects.h.js";
import { se_bars_flapp } from "./seffects.h.js";
import { se_bars_whang } from "./seffects.h.js";
import { se_bars_whap } from "./seffects.h.js";
import { se_zero_invalid } from "./seffects.h.js";
import { P_BOW } from "./skills.h.js";
import { P_CROSSBOW } from "./skills.h.js";
import { P_DART } from "./skills.h.js";
import { P_KNIFE } from "./skills.h.js";
import { P_SHURIKEN } from "./skills.h.js";
import { P_SPEAR } from "./skills.h.js";
import { cansee } from "./vision.h.macros.js";
import { couldsee } from "./vision.h.macros.js";
import { WT_IRON_BALL_INCR } from "./weight.h.js";
import { nh_delay_output } from "./winprocs.h.macros.js";
import { Role_if } from "./you.h.macros.js";
import { Upolyd } from "./you.h.macros.js";
import { mhim } from "./you.h.macros.js";
import { mhis } from "./you.h.macros.js";
import { u_at } from "./you.h.macros.js";
import { Acid_resistance } from "./youprop.h.macros.js";
import { Blind } from "./youprop.h.macros.js";
import { BlindedTimeout } from "./youprop.h.macros.js";
import { Confusion } from "./youprop.h.macros.js";
import { Deaf } from "./youprop.h.macros.js";
import { Fumbling } from "./youprop.h.macros.js";
import { Hallucination } from "./youprop.h.macros.js";
import { Hate_silver } from "./youprop.h.macros.js";
import { Sleep_resistance } from "./youprop.h.macros.js";
import { Stone_resistance } from "./youprop.h.macros.js";
import { Stoned } from "./youprop.h.macros.js";
import { Stunned } from "./youprop.h.macros.js";
import { Underwater } from "./youprop.h.macros.js";
import { SIZE } from "../rt/cmacros.js";
import { char } from "../rt/ctypes.js";
import { int } from "../rt/ctypes.js";
import { long } from "../rt/ctypes.js";
import { uchar } from "../rt/ctypes.js";
import { unsigned } from "../rt/ctypes.js";
import { stack_frame } from "../rt/heap.js";
import { stack_pop } from "../rt/heap.js";
import { or64 } from "../rt/int64.js";
import { abs } from "../rt/libc.js";
import { sprintf } from "../rt/libc.js";
import { strcat } from "../rt/libc.js";
import { strcpy } from "../rt/libc.js";
import { stack_array } from "../rt/locals.js";
import { stack_var } from "../rt/locals.js";
import { static_array } from "../rt/locals.js";
import { static_var } from "../rt/locals.js";
import { _ } from "../rt/strings.js";
import { ptr_to } from "../rt/struct.js";
import { stop_occupation } from "./allmain.js";
import { snuff_candle } from "./apply.js";
import { artifact_hit } from "./artifact.js";
import { spec_abon } from "./artifact.js";
import { acurrstr } from "./attrib.js";
import { exercise } from "./attrib.js";
import { poisoned } from "./attrib.js";
import { isok } from "./cmd.js";
import { is_lava } from "./dbridge.js";
import { is_pool } from "./dbridge.js";
import { is_waterwall } from "./dbridge.js";
import { flags } from "./decl.js";
import { gb } from "./decl.js";
import { gi } from "./decl.js";
import { gm } from "./decl.js";
import { gn } from "./decl.js";
import { gt } from "./decl.js";
import { gv } from "./decl.js";
import { gy } from "./decl.js";
import { svc } from "./decl.js";
import { svm } from "./decl.js";
import { u } from "./decl.js";
import { canseemon } from "./display.js";
import { newsym } from "./display.js";
import { tmp_at } from "./display.js";
import { dropy } from "./do.js";
import { flooreffects } from "./do.js";
import { Monnam } from "./do_name.js";
import { hliquid } from "./do_name.js";
import { mon_nam } from "./do_name.js";
import { some_mon_nam } from "./do_name.js";
import { down_gate } from "./dokick.js";
import { ship_object } from "./dokick.js";
import { breaks } from "./dothrow.js";
import { harmless_missile } from "./dothrow.js";
import { hero_breaks } from "./dothrow.js";
import { multishot_class_bonus } from "./dothrow.js";
import { omon_adj } from "./dothrow.js";
import { should_mulch_missile } from "./dothrow.js";
import { panic } from "./end.js";
import { freehand } from "./engrave.js";
import { calc_capacity } from "./hack.js";
import { losehp } from "./hack.js";
import { nomul } from "./hack.js";
import { rounddiv } from "./hack.js";
import { dist2 } from "./hacklib.js";
import { distmin } from "./hacklib.js";
import { s_suffix } from "./hacklib.js";
import { sgn } from "./hacklib.js";
import { strncmpi } from "./hacklib.js";
import { upstart } from "./hacklib.js";
import { delobj } from "./invent.js";
import { hold_another_object } from "./invent.js";
import { sobj_at } from "./invent.js";
import { stackobj } from "./invent.js";
import { obj_sheds_light } from "./light.js";
import { mswings_verb } from "./mhitu.js";
import { add_to_minv } from "./mkobj.js";
import { clear_dknown } from "./mkobj.js";
import { is_flammable } from "./mkobj.js";
import { mksobj } from "./mkobj.js";
import { obj_extract_self } from "./mkobj.js";
import { place_object } from "./mkobj.js";
import { splitobj } from "./mkobj.js";
import { weight } from "./mkobj.js";
import { mondied } from "./mon.js";
import { monkilled } from "./mon.js";
import { seemimic } from "./mon.js";
import { setmangry } from "./mon.js";
import { wake_nearto } from "./mon.js";
import { xkilled } from "./mon.js";
import { can_blnd } from "./mondata.js";
import { cvt_adtyp_to_mseenres } from "./mondata.js";
import { get_atkdam_type } from "./mondata.js";
import { mon_hates_silver } from "./mondata.js";
import { monstseesu } from "./mondata.js";
import { monstunseesu } from "./mondata.js";
import { poly_when_stoned } from "./mondata.js";
import { closed_door } from "./monmove.js";
import { dissolve_bars } from "./monmove.js";
import { mons } from "./monst.js";
import { munstone } from "./muse.js";
import { observe_object } from "./o_init.js";
import { objects } from "./objects.js";
import { The } from "./objnam.js";
import { Tobjnam } from "./objnam.js";
import { an } from "./objnam.js";
import { distant_name } from "./objnam.js";
import { doname } from "./objnam.js";
import { killer_xname } from "./objnam.js";
import { makeplural } from "./objnam.js";
import { mshot_xname } from "./objnam.js";
import { obj_is_pname } from "./objnam.js";
import { otense } from "./objnam.js";
import { simpleonames } from "./objnam.js";
import { singular } from "./objnam.js";
import { the } from "./objnam.js";
import { vtense } from "./objnam.js";
import { xname } from "./objnam.js";
import { You } from "./pline.js";
import { You_hear } from "./pline.js";
import { Your } from "./pline.js";
import { impossible } from "./pline.js";
import { pline } from "./pline.js";
import { pline_The } from "./pline.js";
import { pline_mon } from "./pline.js";
import { set_msg_xy } from "./pline.js";
import { body_part } from "./polyself.js";
import { mbodypart } from "./polyself.js";
import { polymon } from "./polyself.js";
import { make_blinded } from "./potion.js";
import { make_stoned } from "./potion.js";
import { potionhit } from "./potion.js";
import { rn2 } from "./rnd.js";
import { rn2_on_display_rng } from "./rnd.js";
import { rnd } from "./rnd.js";
import { obfree } from "./shk.js";
import { minstapetrify } from "./trap.js";
import { passive_obj } from "./uhitm.js";
import { shade_miss } from "./uhitm.js";
import { clear_path } from "./vision.js";
import { autoreturn_weapon } from "./weapon.js";
import { dmgval } from "./weapon.js";
import { mon_wield_item } from "./weapon.js";
import { select_rwep } from "./weapon.js";
import { setmnotwielded } from "./weapon.js";
import { mwelded } from "./wield.js";
import { extract_from_minvent } from "./worn.js";
import { find_mac } from "./worn.js";
import { dobuzz } from "./zap.js";
import { exclam } from "./zap.js";
import { hit } from "./zap.js";
import { miss } from "./zap.js";
