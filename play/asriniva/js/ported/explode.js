/* NetHack 5.0	explode.c	$NHDT-Date: 1736530208 2025/01/10 09:30:08 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.122 $ */
/*      Copyright (C) 1990 by Ken Arromdee */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from './c-runtime.js';



/* Note: Arrays are column first, while the screen is row first */
const S_expl_tl = 96, S_expl_tc = 97, S_expl_tr = 98,
      S_expl_ml = 99, S_expl_mc = 100, S_expl_mr = 101,
      S_expl_bl = 102, S_expl_bc = 103, S_expl_br = 104;
const explosion = [
        [ S_expl_tl, S_expl_ml, S_expl_bl ],
        [ S_expl_tc, S_expl_mc, S_expl_bc ],
        [ S_expl_tr, S_expl_mr, S_expl_br ] ];

/* what to do at [x+i][y+j] for i=-1,0,1 and j=-1,0,1 */
const 
    EXPL_NONE = 0, /* not specified yet or no shield effect needed */
    EXPL_MON  = 1, /* monster is affected */
    EXPL_HERO = 2, /* hero is affected */
    EXPL_SKIP = 4  /* don't apply shield effect (out of bounds) */;

/* check if shield effects are needed for location affected by explosion */
export function explosionmask(m, adtyp, olet)
/* target monster (might be youmonst) */
/* damage type */
/* object class (only matters for AD_DISN) */
{
    let res = EXPL_NONE;

    if (C.samePtr(m, C.gy.youmonst)) {
        switch (adtyp) {
        case C.AD_PHYS:
            /* leave 'res' with EXPL_NONE */
            break;
        case C.AD_MAGM:
            if (C.Antimagic)
                res = EXPL_HERO;
            break;
        case C.AD_FIRE:
            if (C.Fire_resistance)
                res = EXPL_HERO;
            break;
        case C.AD_COLD:
            if (C.Cold_resistance)
                res = EXPL_HERO;
            break;
        case C.AD_DISN:
            if ((olet == C.WAND_CLASS)
                ? (C.nonliving(m.data) || C.is_demon(m.data))
                : C.Disint_resistance)
                res = EXPL_HERO;
            break;
        case C.AD_ELEC:
            if (C.Shock_resistance)
                res = EXPL_HERO;
            break;
        case C.AD_DRST:
            if (C.Poison_resistance)
                res = EXPL_HERO;
            break;
        case C.AD_ACID:
            if (C.Acid_resistance)
                res = EXPL_HERO;
            break;
        default:
            C.impossible("explosion type %d?", adtyp);
            break;
        }

    } else {
        /* 'm' is a monster */
        switch (adtyp) {
        case C.AD_PHYS:
            break;
        case C.AD_MAGM:
            if (C.resists_magm(m))
                res = EXPL_MON;
            break;
        case C.AD_FIRE:
            if (C.resists_fire(m))
                res = EXPL_MON;
            break;
        case C.AD_COLD:
            if (C.resists_cold(m))
                res = EXPL_MON;
            break;
        case C.AD_DISN:
            if ((olet == C.WAND_CLASS)
                ? (C.nonliving(m.data) || C.is_demon(m.data)
                   || C.is_vampshifter(m))
                : !!C.resists_disint(m))
                res = EXPL_MON;
            break;
        case C.AD_ELEC:
            if (C.resists_elec(m))
                res = EXPL_MON;
            break;
        case C.AD_DRST:
            if (C.resists_poison(m))
                res = EXPL_MON;
            break;
        case C.AD_ACID:
            if (C.resists_acid(m))
                res = EXPL_MON;
            break;
        default:
            C.impossible("explosion type %d?", adtyp);
            break;
        }
    }
    return res;
}

export function engulfer_explosion_msg(adtyp, olet)
{
    let adj =  0;

    if (C.digests(C.u.ustuck.data)) {
        switch (adtyp) {
        case C.AD_FIRE:
            adj = "heartburn";
            break;
        case C.AD_COLD:
            adj = "chilly";
            break;
        case C.AD_DISN:
            if (olet == C.WAND_CLASS)
                adj = "irradiated by pure energy";
            else
                adj = "perforated";
            break;
        case C.AD_ELEC:
            adj = "shocked";
            break;
        case C.AD_DRST:
            adj = "poisoned";
            break;
        case C.AD_ACID:
            adj = "an upset stomach";
            break;
        default:
            adj = "fried";
            break;
        }
        C.pline("%s gets %s!", C.Monnam(C.u.ustuck), adj);
    } else {
        switch (adtyp) {
        case C.AD_FIRE:
            adj = "toasted";
            break;
        case C.AD_COLD:
            adj = "chilly";
            break;
        case C.AD_DISN:
            if (olet == C.WAND_CLASS)
                adj = "overwhelmed by pure energy";
            else
                adj = "perforated";
            break;
        case C.AD_ELEC:
            adj = "shocked";
            break;
        case C.AD_DRST:
            adj = "intoxicated";
            break;
        case C.AD_ACID:
            adj = "burned";
            break;
        default:
            adj = "fried";
            break;
        }
        C.pline("%s gets slightly %s!", C.Monnam(C.u.ustuck), adj);
    }
}

/* Note: I had to choose one of three possible kinds of "type" when writing
 * this function: a wand type (like in zap.c), an adtyp, or an object type.
 * Wand types get complex because they must be converted to adtyps for
 * determining such things as fire resistance.  Adtyps get complex in that
 * they don't supply enough information--was it a player or a monster that
 * did it, and with a wand, spell, or breath weapon?  Object types share both
 * these disadvantages....
 *
 * Note: anything with a AT_BOOM AD_PHYS attack uses PHYS_EXPL_TYPE for type.
 *
 * Important note about Half_physical_damage:
 *      Unlike losehp(), explode() makes the Half_physical_damage adjustments
 *      itself, so the caller should never have done that ahead of time.
 *      It has to be done this way because the damage value is applied to
 *      things beside the player. Care is taken within explode() to ensure
 *      that Half_physical_damage only affects the damage applied to the hero.
 */
export function explode(x, y, type, dam, olet, expltype)
/* explosion's location;
                           * adjacent spots are also affected */
/* same as in zap.c; -(wand typ) for some WAND_CLASS */
/* damage amount */
/* object class or BURNING_OIL or MON_EXPLODE */
/* explosion type: controls color of explosion glyphs */
{
    let i, j, k, damu = dam;
    let starting = 1;
    let visible, any_shield;
    let uhurt = 0; /* 0=unhurt, 1=items damaged, 2=you and items damaged */
    let str =  0;
    let mtmp, mdef = 0;
    let adtyp;
    let explmask = [[0,0,0],[0,0,0],[0,0,0]]; /* 0=normal explosion, 1=do shieldeff, 2=do nothing */
    let xx, yy;
    let shopdamage = C.booleanLocal(C.FALSE), generic = C.FALSE,
            do_hallu = C.FALSE, inside_engulfer, grabbed, grabbing;
    let grabxy = {x:0,y:0};
    let hallu_buf = C.stackAlloc(C.BUFSZ), killr_buf = C.stackAlloc(C.BUFSZ);
    let exploding_wand_typ = 0;
    let you_exploding = (olet == C.MON_EXPLODE && type >= 0);
    let didmsg = C.FALSE;

    if (olet == C.WAND_CLASS) { /* retributive strike */
        /* 'type' is passed as (wand's object type * -1); save
           object type and convert 'type' itself to zap-type */
        if (type < 0) {
            type = -type;
            exploding_wand_typ = C.coordxy(type);
            /* most attack wands produce specific explosions;
               other types produce a generic magical explosion */
            if (C.objects[type].oc_dir == C.RAY
                && type != C.WAN_DIGGING && type != C.WAN_SLEEP) {
                type -= C.WAN_MAGIC_MISSILE;
                if (type < 0 || type > 9) {
                    C.impossible("explode: wand has bad zap type (%d).", type);
                    type = 0;
                }
            } else
                type = 0;
        }
        switch (C.Role_switch) {
        case C.PM_CLERIC:
        case C.PM_MONK:
        case C.PM_WIZARD:
            damu = C.int(Math.trunc(damu / 5));
            break;
        case C.PM_HEALER:
        case C.PM_KNIGHT:
            damu = C.int(Math.trunc(damu / 2));
            break;
        default:
            break;
        }
    } else if (olet == C.BURNING_OIL) {
        /* used to provide extra information to zap_over_floor() */
        exploding_wand_typ = C.POT_OIL;
    } else if (olet == C.SCROLL_CLASS) {
        /* ditto */
        exploding_wand_typ = C.SCR_FIRE;
    } else if (olet == C.TRAP_EXPLODE) {
        type = 0; /* hardcoded to generic magic explosion */
    }
    /* muse_unslime: SCR_FIRE */
    if (expltype < 0) {
        /* hero gets credit/blame for killing this monster, not others */
        mdef = C.m_at(x, y);
        expltype = -expltype;
    }
    /* if hero is engulfed and caused the explosion, only hero and
       engulfer will be affected */
    inside_engulfer = (C.u.uswallow && type >= 0);
    /* held but not engulfed implies holder is reaching into second spot
       so might get hit by double damage */
    grabbed = grabbing = C.FALSE;
    if (C.u.ustuck && !C.u.uswallow) {
        if (C.Upolyd && C.sticks(C.gy.youmonst.data))
            grabbing = C.TRUE;
        else
            grabbed = C.TRUE;
        grabxy.x = C.u.ustuck.mx;
        grabxy.y = C.u.ustuck.my;
    } else
        grabxy.x = grabxy.y = 0; /* lint suppression */
    /* FIXME:
     *  It is possible for a grabber to be outside the explosion
     *  radius and reaching inside to hold the hero.  If so, it ought
     *  to take damage (the extra half of double damage).  It is also
     *  possible for poly'd hero to be outside the radius and reaching
     *  in to hold a monster.  Hero should take damage in that situation.
     *
     *  Probably the simplest way to handle this would be to expand
     *  the radius used when collecting targets but exclude everything
     *  beyond the regular radius which isn't reaching inside.  Then
     *  skip harm to gear of any extended targets when inflicting damage.
     */

    if (olet == C.MON_EXPLODE && !you_exploding) {
        /* when explode() is called recursively, svk.killer.name might change
           so retain a copy of the current value for this explosion */
        str = C.strcpy(killr_buf, C.svk.killer.name);
        do_hallu = (C.Hallucination
                    && (C.strstri(str, "'s explosion")
                        || C.strstri(str, "s' explosion")));
    }
    if (type == C.PHYS_EXPL_TYPE) {
        /* currently only gas spores */
        adtyp = C.AD_PHYS;
    } else {
        /* If str is e.g. "flaming sphere's explosion" from above, we want to
         * still assign adtyp appropriately, but not replace str. */
        let adstr = 0;

        switch (C.abs(type) % 10) {
        case 0:
            adstr = "magical blast";
            adtyp = C.AD_MAGM;
            break;
        case 1:
            adstr = (olet == C.BURNING_OIL) ? "burning oil"
                     : (olet == C.SCROLL_CLASS) ? "tower of flame" : "fireball";
            /* fire damage, not physical damage */
            adtyp = C.AD_FIRE;
            break;
        case 2:
            adstr = "ball of cold";
            adtyp = C.AD_COLD;
            break;
        case 4:
            adstr = (olet == C.WAND_CLASS) ? "death field"
                                         : "disintegration field";
            adtyp = C.AD_DISN;
            break;
        case 5:
            adstr = "ball of lightning";
            adtyp = C.AD_ELEC;
            break;
        case 6:
            adstr = "poison gas cloud";
            adtyp = C.AD_DRST;
            break;
        case 7:
            adstr = "splash of acid";
            adtyp = C.AD_ACID;
            break;
        default:
            C.impossible("explosion base type %d?", type);
            return;
        }
        if (!str)
            str = adstr;
    }

    any_shield = visible = C.FALSE;
    for (i = 0; i < 3; i++)
        for (j = 0; j < 3; j++) {
            xx = C.coordxy(x + i - 1);
            yy = C.coordxy(y + j - 1);
            if (!C.isok(xx, yy)) {
                explmask[i][j] = EXPL_SKIP;
                continue;
            }
            explmask[i][j] = EXPL_NONE;

            if (C.u_at(xx, yy)) {
                explmask[i][j] = explosionmask(C.gy.youmonst, adtyp, olet);
            }
            /* can be both you and mtmp if you're swallowed or riding */
            mtmp = C.m_at(xx, yy);
            if (!mtmp && C.u_at(xx, yy))
                mtmp = C.u.usteed;
            if (mtmp && C.DEADMONSTER(mtmp))
                mtmp = 0;
            if (mtmp) {
                explmask[i][j] |= explosionmask(mtmp, adtyp, olet);
            }

            if (mtmp && C.cansee(xx, yy) && !C.canspotmon(mtmp))
                C.map_invisible(xx, yy);
            else if (!mtmp)
                C.unmap_invisible(xx, yy);
            if (C.cansee(xx, yy))
                visible = C.TRUE;
            if ((explmask[i][j] & (EXPL_MON | EXPL_HERO)) != 0)
                any_shield = C.TRUE;
        }

    if (visible) {
        /* Start the explosion */
        for (i = 0; i < 3; i++)
            for (j = 0; j < 3; j++) {
                if (explmask[i][j] == EXPL_SKIP)
                    continue;
                xx = C.coordxy(x + i - 1);
                yy = C.coordxy(y + j - 1);
                C.tmp_at(starting ? C.DISP_BEAM : C.DISP_CHANGE,
                       C.explosion_to_glyph(expltype, explosion[i][j]));
                C.tmp_at(xx, yy);
                starting = 0;
            }
        C.curs_on_u(); /* will flush screen and output */

        if (any_shield && C.flags.sparkle) { /* simulate shield effect */
            for (k = 0; k < C.SHIELD_COUNT; k++) {
                for (i = 0; i < 3; i++)
                    for (j = 0; j < 3; j++) {
                        xx = C.coordxy(x + i - 1);
                        yy = C.coordxy(y + j - 1);
                        if ((explmask[i][j] & (EXPL_MON | EXPL_HERO)) != 0)
                            /*
                             * Bypass tmp_at() and send the shield glyphs
                             * directly to the buffered screen.  tmp_at()
                             * will clean up the location for us later.
                             */
                            C.show_glyph(xx, yy,
                                       C.cmap_to_glyph(C.shield_static[k]));
                    }
                C.curs_on_u(); /* will flush screen and output */
                C.nh_delay_output();
            }

            /* Cover last shield glyph with blast symbol. */
            for (i = 0; i < 3; i++)
                for (j = 0; j < 3; j++) {
                    xx = C.coordxy(x + i - 1);
                    yy = C.coordxy(y + j - 1);
                    if ((explmask[i][j] & (EXPL_MON | EXPL_HERO)) != 0)
                        C.show_glyph(xx, yy,
                                   C.explosion_to_glyph(expltype,
                                                      explosion[i][j]));
                }

        } else { /* delay a little bit. */
            C.nh_delay_output();
            C.nh_delay_output();
        }

        C.tmp_at(C.DISP_END, 0); /* clear the explosion */
    } else {
        if (olet == C.MON_EXPLODE || olet == C.TRAP_EXPLODE) {
            str = "explosion";
            generic = C.TRUE;
        }
        if (!C.Deaf && olet != C.SCROLL_CLASS) {
            C.Soundeffect(C.se_blast, 75);
            C.You_hear("a blast.");
            didmsg = C.TRUE;
        }
    }

    if (!C.Deaf && !didmsg)
        C.pline("Boom!");

    /* apply effects to monsters and floor objects first, in case the
       damage to the hero is fatal and leaves bones */
    if (dam) {
        for (i = 0; i < 3; i++) {
            for (j = 0; j < 3; j++) {
                let itemdmg = 0;

                if (explmask[i][j] == EXPL_SKIP)
                    continue;
                xx = C.coordxy(x + i - 1);
                yy = C.coordxy(y + j - 1);
                if (C.u_at(xx, yy)) {
                    uhurt = ((explmask[i][j] & EXPL_HERO) != 0) ? 1 : 2;
                    /* If the player is attacking via polyself into something
                     * with an explosion attack, leave them (and their gear)
                     * unharmed, to avoid punishing them from using such
                     * polyforms creatively */
                    if (!C.svc.context.mon_moving && you_exploding)
                        uhurt = 0;
                } else if (inside_engulfer) {
                    /* for inside_engulfer, only <u.ux,u.uy> is affected */
                    continue;
                }

                /* Affect the floor unless the player caused the explosion
                 * from inside their engulfer. */
                if (!(C.u.uswallow && !C.svc.context.mon_moving))
                    C.zap_over_floor(xx, yy, type,
                                          shopdamage, C.FALSE,
                                          exploding_wand_typ);

                mtmp = C.m_at(xx, yy);
                if (!mtmp && C.u_at(xx, yy))
                    mtmp = C.u.usteed;
                if (!mtmp)
                    continue;
                if (do_hallu) {
                    let tryct = 0;

                    /* replace "gas spore" with a different description
                       for each target (we can't distinguish personal names
                       like "Barney" here in order to suppress "the" below,
                       so avoid any which begins with a capital letter) */
                    do {
                        C.Sprintf(hallu_buf, "%s explosion",
                                C.s_suffix(C.rndmonnam( 0)));
                    } while (C.loadChar(hallu_buf) != C.lowc(C.loadChar(hallu_buf)) && ++tryct < 20);
                    str = hallu_buf;
                }
                if (C.engulfing_u(mtmp)) {
                    engulfer_explosion_msg(adtyp, olet);
                } else if (C.cansee(xx, yy)) {
                    if (mtmp.m_ap_type)
                        C.seemimic(mtmp);
                    C.pline("%s is caught in the %s!", C.Monnam(mtmp), str);
                }

                itemdmg = C.destroy_items(mtmp,  adtyp, dam);
                if (adtyp == C.AD_FIRE) {
                    C.burnarmor(mtmp);
                    C.ignite_items(mtmp.minvent);
                }

                if ((explmask[i][j] & EXPL_MON) != 0) {
                    /* Damage from ring/wand explosion isn't itself
                     * electrical in nature, nor is damage from freezing
                     * potion really cold in nature, nor is damage from
                     * boiling potion or exploding oil; only burning items
                     * damage is the "same type" as the explosion.  Because
                     * this is imperfect and marginal (burning items only
                     * deal 1 damage), ignore it for golemeffects(). */
                    C.golemeffects(mtmp,  adtyp, dam);
                    mtmp.mhp -= itemdmg; /* item destruction dmg */
                } else {
                    /* Call resist with 0 and do damage manually so 1) we can
                     * get out the message before doing the damage, and 2) we
                     * can call mondied, not killed, if it's not your blast.
                     */
                    let mdam = dam;

                    if (C.resist(mtmp, olet, 0, C.FALSE)) {
                        /* inside_engulfer: <xx,yy> == <u.ux,u.uy> */
                        if (C.cansee(xx, yy) || inside_engulfer)
                            C.pline("%s resists the %s!", C.Monnam(mtmp), str);
                        mdam = Math.trunc(C.int(dam + 1) / 2);
                    }
                    /* if grabber is reaching into hero's spot and
                       hero's spot is within explosion radius, grabber
                       gets hit by double damage */
                    if (grabbed && C.samePtr(mtmp, C.u.ustuck) && C.next2u(x, y))
                        mdam = C.int(mdam * 2);
                    /* being resistant to opposite type of damage makes
                       target more vulnerable to current type of damage
                       (when target is also resistant to current type,
                       we won't get here) */
                    if (C.resists_cold(mtmp) && adtyp == C.AD_FIRE)
                        mdam = C.int(mdam * 2);
                    else if (C.resists_fire(mtmp) && adtyp == C.AD_COLD)
                        mdam = C.int(mdam * 2);
                    mtmp.mhp -= mdam + itemdmg;
                }
                if (C.DEADMONSTER(mtmp)) {
                    let xkflg = ((adtyp == C.AD_FIRE
                                  && C.completelyburns(mtmp.data))
                                 ? C.XKILL_NOCORPSE : 0);

                    if (!C.svc.context.mon_moving) {
                        C.xkilled(mtmp, C.XKILL_GIVEMSG | xkflg);
                    } else if (mdef && C.samePtr(mtmp, mdef)) {
                        /* 'mdef' killed self trying to cure being turned
                         * into slime due to some action by the player.
                         * Hero gets the credit (experience) and most of
                         * the blame (possible loss of alignment and/or
                         * luck and/or telepathy depending on mtmp) but
                         * doesn't break pacifism.  xkilled()'s message
                         * would be "you killed <mdef>" so give our own.
                         */
                        if (C.cansee(mtmp.mx, mtmp.my) || C.canspotmon(mtmp))
                            C.pline("%s is %s!", C.Monnam(mtmp),
                                  xkflg ? "burned completely"
                                        : C.nonliving(mtmp.data) ? "destroyed"
                                                                : "killed");
                        C.xkilled(mtmp, C.XKILL_NOMSG | C.XKILL_NOCONDUCT | xkflg);
                    } else {
                        if (xkflg)
                            adtyp = C.AD_RBRE; /* no corpse */
                        C.monkilled(mtmp, "",  adtyp);
                    }
                } else if (!C.svc.context.mon_moving) {
                    /* all affected monsters, even if mdef is set */
                    C.setmangry(mtmp, C.TRUE);
                }
            }
        }
    }

    /* Do your injury last */
    if (uhurt) {
        /* give message for any monster-induced explosion
           or player-induced one other than scroll of fire */
        if (C.flags.verbose && (type < 0 || olet != C.SCROLL_CLASS)) {
            if (do_hallu) { /* (see explanation above) */
                do {
                    C.Sprintf(hallu_buf, "%s explosion",
                            C.s_suffix(C.rndmonnam( 0)));
                } while (C.loadChar(hallu_buf) != C.lowc(C.loadChar(hallu_buf)));
                str = hallu_buf;
            }
            C.You("are caught in the %s!", str);
            C.iflags.last_msg = C.PLNMSG_CAUGHT_IN_EXPLOSION;
        }
        /* do property damage first, in case we end up leaving bones */
        if (adtyp == C.AD_FIRE)
            C.burn_away_slime();
        if (C.Invulnerable) {
            damu = 0;
            C.You("are unharmed!");
        } else if (adtyp == C.AD_PHYS || adtyp == C.AD_ACID)
            damu = C.Maybe_Half_Phys(damu);
        if (adtyp == C.AD_FIRE) {
            C.burnarmor(C.gy.youmonst);
            C.ignite_items(C.gi.invent);
        }
        C.destroy_items(C.gy.youmonst,  adtyp, dam);

        C.ugolemeffects( adtyp, damu);
        if (uhurt == 2) {
            /* if poly'd hero is grabbing another victim, hero takes
               double damage (note: don't rely on u.ustuck here because
               that victim might have been killed when hit by the blast) */
            if (grabbing && C.dist2( grabxy.x,  grabxy.y, x, y) <= 2)
                damu = C.int(damu * 2);
            /* hero does not get same fire-resistant vs cold and
               cold-resistant vs fire double damage as monsters [why not?] */
            if (C.Upolyd)
                C.u.mh -= damu;
            else
                C.u.uhp -= damu;
            C.disp.botl = C.TRUE;
        }

        /* You resisted the damage, lets not keep that to ourselves */
        if (uhurt == 1)
            C.monstseesu_ad(adtyp);
        else
            C.monstunseesu_ad(adtyp);

        if (C.u.uhp <= 0 || (C.Upolyd && C.u.mh <= 0)) {
            if (C.Upolyd) {
                C.rehumanize();
            } else {
                if (olet == C.MON_EXPLODE) {
                    if (generic) /* explosion was unseen; str=="explosion", */
                        ; /* svk.killer.name=="gas spore's explosion". */
                    else if (!C.samePtr(str, C.svk.killer.name) && !C.samePtr(str, hallu_buf))
                        C.Strcpy(C.svk.killer.name, str);
                    C.svk.killer.format = C.KILLED_BY_AN;
                } else if (olet == C.TRAP_EXPLODE) {
                    C.svk.killer.format = C.NO_KILLER_PREFIX;
                    C.Snprintf(C.svk.killer.name, C.killerNameSize,
                             "caught %sself in a %s", C.uhim(),
                             str, 0, 653);
                } else if (type >= 0 && olet != C.SCROLL_CLASS) {
                    C.svk.killer.format = C.NO_KILLER_PREFIX;
                    C.Snprintf(C.svk.killer.name, C.killerNameSize,
                             "caught %sself in %s own %s", C.uhim(),
                             C.uhis(), str, 658);
                } else {
                    C.svk.killer.format = (!C.strcmpi(str, "tower of flame")
                                     || !C.strcmpi(str, "fireball"))
                                        ? C.KILLED_BY_AN
                                        : C.KILLED_BY;
                    C.Strcpy(C.svk.killer.name, str);
                }
                if (C.iflags.last_msg == C.PLNMSG_CAUGHT_IN_EXPLOSION
                    || C.iflags.last_msg == C.PLNMSG_TOWER_OF_FLAME) /*seffects()*/
                    C.pline("It is fatal.");
                else
                    C.pline_The("%s is fatal.", str);
                /* Known BUG: BURNING suppresses corpse in bones data,
                   but done does not handle killer reason correctly */
                C.done((adtyp == C.AD_FIRE) ? C.BURNING : C.DIED);
            }
        }
        C.exercise(C.A_STR, C.FALSE);
    }

    if (shopdamage.value) {
        C.pay_for_damage((adtyp == C.AD_FIRE) ? "burn away"
                          : (adtyp == C.AD_COLD) ? "shatter"
                             : (adtyp == C.AD_DISN) ? "disintegrate"
                                : "destroy",
                       C.FALSE);
    }

    /* explosions are noisy */
    i = Math.imul(dam, dam);
    if (i < 50)
        i = 50; /* in case random damage is very small */
    if (inside_engulfer)
        i = Math.trunc(C.int(i + 3) / 4);
    C.wake_nearto(x, y, i);
}

/* pointer to next scatter item */
/* pointer to the object        */
/* location of                  */
/*      item                    */
/* direction of                 */
/*      travel                  */
/* range of object              */
/* flag for in-motion/stopped   */

/*
 * scflags:
 *      VIS_EFFECTS     Add visual effects to display
 *      MAY_HITMON      Objects may hit monsters
 *      MAY_HITYOU      Objects may hit hero
 *      MAY_HIT         Objects may hit you or monsters
 *      MAY_DESTROY     Objects may be destroyed at random
 *      MAY_FRACTURE    Stone objects can be fractured (statues, boulders)
 */

/* returns number of scattered objects */
export function scatter(sx, sy, blastforce, scflags, obj)
/* location of objects to scatter */
/* force behind the scattering */
/* only scatter this obj */
{
    let otmp;
    let tmp;
    let farthest = 0;
    let typ;
    let qtmp;
    let used_up;
    let individual_object = obj ? C.TRUE : C.FALSE;
    let shop_origin, lostgoods = C.FALSE;
    let mtmp, shkp = 0;
    let stmp, stmp2 = 0;
    let schain =  0;
    let total = 0n;

    if (individual_object && (obj.ox != sx || obj.oy != sy))
        C.impossible("scattered object <%d,%d> not at scatter site <%d,%d>",
                   obj.ox, obj.oy, sx, sy);

    shop_origin = ((shkp = C.shop_keeper(C.loadChar(C.in_rooms(sx, sy, C.SHOPBASE)))) != 0
                && C.costly_spot(sx, sy));
    if (shop_origin)
        C.credit_report(shkp, 0, C.TRUE);   /* establish baseline, without msgs */

    while ((otmp = (individual_object ? obj
                                      : C.svl.level.objects[sx][sy])) != 0) {
        if (C.samePtr(otmp, C.uball) || C.samePtr(otmp, C.uchain)) {
            let waschain = (C.samePtr(otmp, C.uchain));

            C.Soundeffect(C.se_chain_shatters, 25);
            C.pline_The("chain shatters!");
            C.unpunish();
            if (waschain)
                continue;
        }
        if (otmp.quan > 1n) {
            qtmp = otmp.quan - 1n;
            if (qtmp > BigInt(C.LARGEST_INT))
                qtmp = BigInt(C.LARGEST_INT);
            qtmp = BigInt(C.rnd(Number(qtmp), 764, 'scatter'));
            otmp = C.splitobj(otmp, qtmp);
        } else {
            obj =  0; /* all used */
        }
        C.obj_extract_self(otmp);
        used_up = C.FALSE;

        /* 9 in 10 chance of fracturing boulders or statues */
        if ((scflags & C.MAY_FRACTURE) != 0
            && (otmp.otyp == C.BOULDER || otmp.otyp == C.STATUE)
            && C.rn2(10, 775, 'scatter')) {
            if (otmp.otyp == C.BOULDER) {
                if (C.cansee(sx, sy)) {
                    C.pline("%s apart.", C.Tobjnam(otmp, "break"));
                } else {
                    C.Soundeffect(C.se_stone_breaking, 100);
                    C.You_hear("stone breaking.");
                }
                C.fracture_rock(otmp);
                C.place_object(otmp, sx, sy);
                if ((otmp = C.sobj_at(C.BOULDER, sx, sy)) != 0) {
                    /* another boulder here, restack it to the top */
                    C.obj_extract_self(otmp);
                    C.place_object(otmp, sx, sy);
                }
            } else {
                let trap;

                if ((trap = C.t_at(sx, sy)) && trap.ttyp == C.STATUE_TRAP)
                    C.deltrap(trap);
                if (C.cansee(sx, sy)) {
                    C.pline("%s.", C.Tobjnam(otmp, "crumble"));
                } else {
                    C.Soundeffect(C.se_stone_crumbling, 100);
                    C.You_hear("stone crumbling.");
                }
                C.break_statue(otmp);
                C.place_object(otmp, sx, sy); /* put fragments on floor */
            }
            C.newsym(sx, sy); /* in case it's beyond radius of 'farthest' */
            used_up = C.TRUE;

            /* 1 in 10 chance of destruction of obj; glass, egg destruction */
        } else if ((scflags & C.MAY_DESTROY) != 0
                   && (!C.rn2(10, 809, 'scatter') || (C.objects[otmp.otyp].oc_material == C.GLASS
                                    || otmp.otyp == C.EGG))) {
            if (C.breaks(otmp, sx, sy))
                used_up = C.TRUE;
        }

        if (!used_up) {
            stmp = C.scatterChain(C.alloc(C.scatterChainSize));
            stmp.next =  0;
            stmp.obj = otmp;
            stmp.ox = sx;
            stmp.oy = sy;
            tmp = C.rn2(C.N_DIRS, 821, 'scatter'); /* get the direction */
            stmp.dx = C.xdir[tmp];
            stmp.dy = C.ydir[tmp];
            tmp = C.int(blastforce - Math.trunc(otmp.owt / 40));
            if (tmp < 1)
                tmp = 1;
            stmp.range = C.rnd(tmp, 827, 'scatter'); /* anywhere up to that determ. by wt */
            if (farthest < stmp.range)
                farthest = stmp.range;
            stmp.stopped = C.FALSE;
            if (!schain)
                schain = stmp;
            else
                stmp2.next = stmp;
            stmp2 = stmp;
        }
    }

    while (farthest-- > 0) {
        for (stmp = schain; stmp; stmp = stmp.next) {
            if ((stmp.range-- > 0) && (!stmp.stopped)) {
                C.gt.thrownobj = stmp.obj; /* mainly in case it kills hero */
                C.gb.bhitpos.x = stmp.ox + stmp.dx;
                C.gb.bhitpos.y = stmp.oy + stmp.dy;
                if (C.isok(C.gb.bhitpos.x, C.gb.bhitpos.y))
                    typ = C.levl[C.gb.bhitpos.x][C.gb.bhitpos.y].typ & 255;
                else
                    typ = C.STONE & 255;
                if (!C.isok(C.gb.bhitpos.x, C.gb.bhitpos.y)) {
                    C.gb.bhitpos.x -= stmp.dx;
                    C.gb.bhitpos.y -= stmp.dy;
                    stmp.stopped = C.TRUE;
                } else if (!C.ZAP_POS(typ)
                           || C.closed_door(C.gb.bhitpos.x, C.gb.bhitpos.y)) {
                    C.gb.bhitpos.x -= stmp.dx;
                    C.gb.bhitpos.y -= stmp.dy;
                    stmp.stopped = C.TRUE;
                } else if ((mtmp = C.m_at(C.gb.bhitpos.x, C.gb.bhitpos.y)) != 0) {
                    if (scflags & C.MAY_HITMON) {
                        stmp.range--;
                        if (C.ohitmon(mtmp, stmp.obj, 1, C.FALSE)) {
                            stmp.obj =  0;
                            stmp.stopped = C.TRUE;
                        }
                    }
                } else if (C.u_at(C.gb.bhitpos.x, C.gb.bhitpos.y)) {
                    if (scflags & C.MAY_HITYOU) {
                        let dam, hitvalu, hitu;

                        if (C.gm.multi)
                            C.nomul(0);
                        dam = C.dmgval(stmp.obj, C.gy.youmonst);
                        hitvalu = 8 + stmp.obj.spe;
                        if (C.bigmonst(C.gy.youmonst.data))
                            hitvalu++;
                        hitu = C.thitu(hitvalu, C.Maybe_Half_Phys(dam),
                                     C.objectField(stmp, 'obj'),  0);
                        if (!stmp.obj)
                            stmp.stopped = C.TRUE;
                        if (hitu) {
                            stmp.range -= 3;
                            C.stop_occupation();
                        }
                    }
                } else {
                    if (scflags & C.VIS_EFFECTS) {
                        /* tmp_at(gb.bhitpos.x, gb.bhitpos.y); */
                        /* nh_delay_output(); */
                    }
                }
                stmp.ox = C.gb.bhitpos.x;
                stmp.oy = C.gb.bhitpos.y;
                if (C.IS_SINK(C.levl[stmp.ox][stmp.oy].typ))
                    stmp.stopped = C.TRUE;
                C.gt.thrownobj =  0;
            }
        }
    }
    for (stmp = schain; stmp; stmp = stmp2) {
        let x, y;
        let obj_left_shop = C.FALSE;

        stmp2 = stmp.next;
        x = stmp.ox;
        y = stmp.oy;
        if (stmp.obj) {
            if (x != sx || y != sy) {
                total += stmp.obj.quan;
                obj_left_shop = (shop_origin && !C.costly_spot(x, y));
            }
            if (!C.flooreffects(stmp.obj, x, y, "land")) {
                if (obj_left_shop
                    && C.strchr(C.u.urooms, C.loadChar(C.in_rooms(C.u.ux, C.u.uy, C.SHOPBASE)))) {
                    /* At the moment this only takes on gold. While it is
                       simple enough to call addtobill for other items that
                       leave the shop due to scatter(), by default the hero
                       will get billed for the full shopkeeper asking-price
                       on the object's way out of shop. That can leave the
                       hero in a pickle. Even if the hero then manages to
                       retrieve the item and drop it back inside the shop,
                       the owed charges will only be reduced at that point
                       by the lesser shopkeeper buying-price.
                       The non-gold situation will likely get adjusted
                       further.
                     */
                    if (stmp.obj.otyp == C.GOLD_PIECE) {
                        C.addtobill(stmp.obj, C.FALSE, C.FALSE, C.TRUE);
                        lostgoods = C.TRUE;
                    }
                }
                C.place_object(stmp.obj, x, y);
                C.stackobj(stmp.obj);
            }
        }
        C.free( stmp);
        C.newsym(x, y);
    }
    C.newsym(sx, sy);
    if (C.u_at(sx, sy) && C.u.uundetected && C.hides_under(C.gy.youmonst.data))
        C.hideunder(C.gy.youmonst);
    if (((mtmp = C.m_at(sx, sy)) != 0) && mtmp.mtrapped)
        mtmp.mtrapped = 0;
    C.maybe_unhide_at(sx, sy);
    if (lostgoods) /* implies shop_origin and therefore shkp valid */
        C.credit_report(shkp, 1, C.FALSE);
    return total;
}

/*
 * Splatter burning oil from x,y to the surrounding area.
 *
 * This routine should really take a how and direction parameters.
 * The how is how it was caused, e.g. kicked verses thrown.  The
 * direction is which way to spread the flaming oil.  Different
 * "how"s would give different dispersal patterns.  For example,
 * kicking a burning flask will splatter differently from a thrown
 * flask hitting the ground.
 *
 * For now, just perform a "regular" explosion.
 */
export function splatter_burning_oil(x, y, diluted_oil)
{
    let dmg = C.d(diluted_oil ? 3 : 4, 4, 964, 'splatter_burning_oil');

/* ZT_SPELL(ZT_FIRE) = ZT_SPELL(AD_FIRE-1) = 10+(2-1) = 11 */
const ZT_SPELL_O_FIRE = 11; /* value kludge, see zap.c */
    explode(x, y, ZT_SPELL_O_FIRE, dmg, C.BURNING_OIL, C.EXPL_FIERY);
}

/* lit potion of oil is exploding; extinguish it as a light source before
   possibly killing the hero and attempting to save bones */
export function explode_oil(obj, x, y)
{
    let diluted_oil = obj.odiluted;

    if (!obj.lamplit)
        C.impossible("exploding unlit oil");
    C.end_burn(obj, C.TRUE);
    obj.how_lost = C.LOST_EXPLODING;
    splatter_burning_oil(x, y, diluted_oil);
}

/* Convert a damage type into an explosion display type. */
export function adtyp_to_expltype(adtyp)
{
    switch(adtyp) {
    case C.AD_ELEC:
        /* Electricity isn't magical, but there currently isn't an electric
         * explosion type. Magical is the next best thing. */
    case C.AD_SPEL:
    case C.AD_DREN:
    case C.AD_ENCH:
        return C.EXPL_MAGICAL;
    case C.AD_FIRE:
        return C.EXPL_FIERY;
    case C.AD_COLD:
        return C.EXPL_FROSTY;
    case C.AD_DRST:
    case C.AD_DRDX:
    case C.AD_DRCO:
    case C.AD_DISE:
    case C.AD_PEST:
    case C.AD_PHYS: /* gas spore */
        return C.EXPL_NOXIOUS;
    default:
        C.impossible("adtyp_to_expltype: bad explosion type %d", adtyp);
        return C.EXPL_FIERY;
    }
}

/* A monster explodes in a way that produces a real explosion (e.g. a sphere
 * or gas spore, not a yellow light or similar).
 * This is some common code between explmu() and explmm().
 */
export function mon_explodes(mon, mattk)
{
    let dmg;
    let type;
    if (mattk.damn) {
        dmg = C.d(mattk.damn, mattk.damd, 1026, 'mon_explodes');
    }
    else if (mattk.damd) {
        dmg = C.d(mon.data.mlevel + 1, mattk.damd, 1029, 'mon_explodes');
    }
    else {
        dmg = 0;
    }

    if (mattk.adtyp == C.AD_PHYS) {
        type = C.PHYS_EXPL_TYPE;
    }
    else if (mattk.adtyp >= C.AD_MAGM && mattk.adtyp <= C.AD_SPC2) {
        /* The -1, +20, *-1 math is to set it up as a 'monster breath' type
         * for the explosions (it isn't, but this is the closest analogue). */
        /* FIXME: there are macros for kind of thing... */
        type = -((mattk.adtyp - 1) + 20);
    }
    else {
        C.impossible("unknown type for mon_explode %d", mattk.adtyp);
        return;
    }

    /* Kill it now so it won't appear to be caught in its own explosion.
     * Must check to see if already dead - which happens if this is called
     * from an AT_BOOM attack upon death. */
    if (!C.DEADMONSTER(mon)) {
        C.mondead(mon);
    }

    /* This might end up killing you, too; you never know...
     * also, it is used in explode() messages */
    C.Sprintf(C.svk.killer.name, "%s explosion",
            C.s_suffix(C.pmname(mon.data, C.Mgender(mon))));
    C.svk.killer.format = C.KILLED_BY_AN;

    explode(mon.mx, mon.my, type, dmg, C.MON_EXPLODE,
            adtyp_to_expltype(mattk.adtyp));

    /* reset killer */
    C.storeChar(C.svk.killer.name, 0);
}

/*explode.c*/
