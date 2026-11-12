/* NetHack 5.0	sit.c	$NHDT-Date: 1718136168 2024/06/11 20:02:48 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.95 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2012. */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from '../c-runtime/context.js';



/* take away the hero's money */
export function take_gold()
{
    let otmp, nobj;
    let lost_money = 0;

    for (otmp = C.gi.invent; otmp; otmp = nobj) {
        nobj = otmp.nobj;
        if (otmp.oclass == C.COIN_CLASS) {
            lost_money = 1;
            C.remove_worn_item(otmp, 0);
            C.delobj(otmp);
        }
    }
    if (!lost_money) {
        C.You_feel("a strange sensation.");
    } else {
        C.You("notice you have no gold!");
        C.disp.botl = 1;
    }
}


/* maybe do something when hero sits on a throne */
export function throne_sit_effect()
{
    let tx = C.u.ux, ty = C.u.uy;

    let special_throne = !!C.In_V_tower(C.u.uz);

    if (C.rnd(6, 45, 0) > 4) { /* [why so convoluted? it's the same as '!rn2(3)'] */
        let effect = C.rnd(13, 46, 0);

        if (C.wizard && !C.iflags.debug_fuzzer) {
            let buf = C.stackAlloc(C.BUFSZ);
            let which;

            C.HEAP8[buf] = '\0'.charCodeAt(0);
            C.getlin("Throne sit effect (1..13) [0=random]", buf);
            if (C.HEAP8[buf] == '\x1b'.charCodeAt(0)) {
                C.pline("%s", C.Never_mind);
                return; /* caller will still cause a move to elapse */
            }
            which = C.atoi(buf);
            if (which >= 1 && which <= 13)
                effect = which;
        }

        if (special_throne) {
            special_throne_effect(effect);
            return;
        }

        switch (effect) {
        case 1:
            C.adjattrib(C.rn2(C.A_MAX, 70, 0), -(C.rn2(4, 70, 0) + 3), 0);
            C.losehp(C.rnd(10, 71, 0), "cursed throne", C.KILLED_BY_AN);
            break;
        case 2:
            C.adjattrib(C.rn2(C.A_MAX, 74, 0), 1, 0);
            break;
        case 3:
            C.pline("A%s electric shock shoots through your body!",
                  (C.Shock_resistance) ? "n" : " massive");
            C.losehp(C.Shock_resistance ? C.rnd(6, 79, 0) : C.rnd(30, 79, 0), "electric chair",
                   C.KILLED_BY_AN);
            C.exercise(C.A_CON, 0);
            break;
        case 4:
            C.You_feel("much, much better!");
            if (C.Upolyd) {
                if (C.u.mh >= (C.int(C.u.mhmax - 5)))
                    C.u.mhmax += 4;
                C.u.mh = C.u.mhmax;
            }
            if (C.u.uhp >= (C.int(C.u.uhpmax - 5))) {
                C.u.uhpmax += 4;
                if (C.u.uhpmax > C.u.uhppeak)
                    C.u.uhppeak = C.u.uhpmax;
            }
            C.u.uhp = C.u.uhpmax;
            C.u.ucreamed = 0;
            C.make_blinded(0n, 1);
            C.make_sick(0n, 0, 0, C.SICK_ALL);
            C.heal_legs(0);
            C.disp.botl = 1;
            break;
        case 5:
            take_gold();
            break;
        case 6:
            if (C.u.uluck + C.rn2(5, 106, 0) < 0) {
                C.You_feel("your luck is changing.");
                C.change_luck(1);
            } else
                C.makewish();
            break;
        case 7:
            {
                let cnt = C.rnd(10, 114, 0);

                /* Magical voice not affected by deafness */
                C.pline("A voice echoes:");
                // C.SetVoice(0, 0, 80, voice_throne) (inactive configured macro)
                C.verbalize("Thine audience hath been summoned, %s!",
                          C.flags.female ? "Dame" : "Sire");
                while (cnt--)
                    C.makemon(C.courtmon(), tx, ty, C.NO_MM_FLAGS);
                break;
            }
        case 8:
            /* Magical voice not affected by deafness */
            C.pline("A voice echoes:");
            // C.SetVoice(0, 0, 80, voice_throne) (inactive configured macro)
            C.verbalize("By thine Imperious order, %s...",
                      C.flags.female ? "Dame" : "Sire");
            C.do_genocide(5); /* REALLY|ONTHRONE, see do_genocide() */
            break;
        case 9:
            /* Magical voice not affected by deafness */
            C.pline("A voice echoes:");
            // C.SetVoice(0, 0, 80, voice_throne) (inactive configured macro)
            C.verbalize(
                 "A curse upon thee for sitting upon this most holy throne!");
            if (C.Luck > 0) {
                C.make_blinded(C.BlindedTimeout + C.long((C.rn2(100, 140, 0) + 250)), 1);
                C.change_luck((C.Luck > 1) ? -C.rnd(2, 141, 0) : -1);
            } else
                rndcurse();
            break;
        case 10:
            if (C.Luck < 0 || (C.HSee_invisible & C.INTRINSIC)) {
                if (C.svl.level.flags.nommap) {
                    C.pline("A terrible drone fills your head!");
                    C.make_confused((C.HConfusion & C.TIMEOUT) + C.long(C.rnd(30, 149, 0)),
                                  0);
                } else {
                    C.pline("An image forms in your mind.");
                    C.do_mapping();
                }
            } else {
                /* avoid "vision clears" if hero can't see */
                if (!C.Blind) {
                    C.Your("vision becomes clear.");
                } else {
                    let num_of_eyes = C.eyecount(C.gy.youmonst.data);
                    let eye = C.body_part(C.EYE);

                    /* note: 1 eye case won't actually happen--can't
                       sit on throne when poly'd into always-levitating
                       floating eye and can't polymorph into Cyclops */
                    switch (num_of_eyes) { /* 2, 1, or 0 */
                    default:
                    case 2: /* more than 1 eye */
                        eye = C.makeplural(eye);
                        // FALLTHROUGH;
                        /*FALLTHRU*/
                    case 1: /* one eye (Cyclops, floating eye) */
                        C.Your("%s %s...", eye, C.vtense(eye, "tingle"));
                        break;
                    case 0: /* no eyes */
                        C.You("have a very strange feeling in your %s.",
                            C.body_part(C.HEAD));
                        break;
                    }
                }
                C.HSee_invisible |= C.FROMOUTSIDE;
                C.newsym(C.u.ux, C.u.uy);
            }
            break;
        case 11:
            if (C.Luck < 0) {
                C.You_feel("threatened.");
                C.aggravate();
            } else {
                C.You_feel("a wrenching sensation.");
                C.tele(); /* teleport him */
            }
            break;
        case 12:
            C.You("are granted an insight!");
            if (C.gi.invent) {
                /* rn2(5) agrees w/seffects() */
                C.identify_pack(C.rn2(5, 198, 0), 0);
            }
            break;
        case 13:
            C.Your("mind turns into a pretzel!");
            C.make_confused((C.HConfusion & C.TIMEOUT) + C.long((C.rn2(7, 203, 0) + 16)),
                          0);
            break;
        default:
            C.impossible("throne effect");
            break;
        }
    } else {
        if (C.is_prince(C.gy.youmonst.data) || C.u.uevent.uhand_of_elbereth)
            C.You_feel("very comfortable here.");
        else
            C.You_feel("somehow out of place...");
    }

    /* 5.0: when the random chance for removal is hit, ask for confirmation
       if in wizard mode, and remove the throne even if hero was teleported
       away from it.  [This used to remove a throne at hero's current
       location if there happened to be one, so for the teleport case that
       only happened when teleporting back to the same point where hero
       started from.]  "Analyzing a throne" doesn't really make any sense
       but if the answer is yes than it will vanish in a puff of logic. */
    if (!special_throne &&
        !C.rn2(3, 225, 0) && (!C.wizard || C.y_n("Analyze throne?") == 'y'.charCodeAt(0))) {
        C.levl[tx][ty].typ = C.ROOM, C.levl[tx][ty].flags = 0;
        C.map_background(tx, ty, 0);
        C.newsym_force(tx, ty);
        /* "[God] promptly vanishes in a puff of logic" is from
           Douglas Adams' _The_Hitchhiker's_Guide_to_the_Galaxy_. */
        C.pline_The("throne %s in a puff of logic.",
                  C.cansee(tx, ty) ? "vanishes" : "has vanished");
    }
}

/* special throne in Vlad's tower: effect is 1 to 13 inclusive */
export function special_throne_effect(effect)
{
    let tx = C.u.ux, ty = C.u.uy;

    switch (effect) {
    case 1:
    case 2:
    case 3:
    case 4:
        /* 4 chances of a wish, but then the throne disappears.

           This is the only way the throne can disappear from sitting
           on it, so if you sit on it enough (enduring the negative
           effects) you are guaranteed an eventual wish. */
        C.makewish();
        C.levl[tx][ty].typ = C.ROOM, C.levl[tx][ty].flags = 0;
        C.map_background(tx, ty, 0);
        C.newsym_force(tx, ty);
        C.pline_The("throne disintegrates, having spent its power.");
        break;
    case 5:
        /* permanent level drain */
        C.pline("Sitting on the throne was a terrible experience.");
        if (!C.Drain_resistance) {
            C.losexp("a bad experience sitting on a throne");
            if (C.u.ulevelmax > C.u.ulevel)
                C.u.ulevelmax -= 1;
        }
        break;
    case 6:
    {
        /* grease hands and inventory

           Same rules for which items can be affected as grease_ok in apply.c */
        let otmp;

        C.pline("A greasy liquid sprays all over you!");
        for (otmp = C.gi.invent; otmp; otmp = otmp.nobj)
            if (otmp.oclass != C.COIN_CLASS)
                otmp.greased = 1;
        C.make_glib((C.rn2(101, 277, 1) + 100));
        C.update_inventory();
        break;
    }
    case 7:
        /* lose an intrinsic */
        attrcurse();
        C.pline_The("throne somehow seems to be amused.");
        break;
    case 8:
    {
        /* level teleport to Vibrating Square level */
        let vs_level = C.levelLocal();
        C.find_hell(vs_level);
        vs_level.dlevel = C.svd.dungeons[vs_level.dnum].num_dunlevs - 1;
        if (C.u.uhave.amulet)
            C.You_feel("extremely disoriented for a moment.");
        else
            C.schedule_goto(
                vs_level, C.UTOTYPE_NONE, 0,
                "You feel extremely out of place.");
        break;
    }
    case 9:
    {
        /* summon demons; a NULL argument to msummon summons demons as
           though they were summoned by the Wizard of Yendor */
        C.pline_The("throne seeems to be calling for help!");
        C.msummon(0);
        C.msummon(0);
        C.msummon(0);
        break;
    }
    case 10:
    {
        /* confused blessed remove curse effect */
        let fake_spellbook;
        let save_confusion = C.HConfusion;

        fake_spellbook = C.objectLocalCopy(C.cg.zeroobj);
        fake_spellbook.otyp = C.SPE_REMOVE_CURSE;
        fake_spellbook.oclass = C.SPBOOK_CLASS;
        fake_spellbook.blessed = 1;
        C.HConfusion = 1n;
        C.seffects(fake_spellbook);
        C.HConfusion = save_confusion;
        break;
    }
    case 11:
        /* polymorph effect (not blocked by magic resistance, but other things
           that protect from polymorphs work) */
        if (C.is_vampire(C.gy.youmonst.data)) {
            C.You_feel("unworthy.");
        } else {
            C.pline("This throne was not meant for those such as you!");
            C.You_feel("a change coming over you.");
            C.polyself(C.POLY_NOFLAGS);
        }
        break;
    case 12:
        /* acid damage */
        C.pline("The throne is covered in acid!");
        C.losehp(C.Acid_resistance ? C.rnd(16, 339, 1) : C.rnd(80, 339, 1), "acidic chair",
               C.KILLED_BY_AN);
        C.exercise(C.A_CON, 0);
        break;
    case 13:
    {
        /* ability shuffle */
        let ability;
        C.pline("As you sit on the throne, your body and mind start to warp.");
        for (ability = 0; ability < C.A_MAX; ++ability) {
            C.adjattrib(ability, C.rn2(5, 349, 1) - 2, -1);
        }
        break;
    }
    }
}

/* hero lays an egg */
export function lay_an_egg()
{
    let uegg;

    if (!C.flags.female) {
        C.pline("%s can't lay eggs!",
              C.Hallucination
              ? "You may think you are a platypus, but a male still"
              : "Males");
        return C.ECMD_OK;
    } else if (C.u.uhunger < C.int(C.objects[C.EGG].oc_nutrition)) {
        C.You("don't have enough energy to lay an egg.");
        return C.ECMD_OK;
    } else if (C.eggs_in_water(C.gy.youmonst.data)) {
        if (!(C.Underwater || C.Is_waterlevel(C.u.uz))) {
            C.pline("A splash tetra you are not.");
            return C.ECMD_OK;
        }
        if (C.Upolyd
            && (C.gy.youmonst.data.address == C.mons[C.PM_GIANT_EEL].address
                || C.gy.youmonst.data.address == C.mons[C.PM_ELECTRIC_EEL].address)) {
            C.You("yearn for the Sargasso Sea.");
            return C.ECMD_OK;
        }
    }
    uegg = C.mksobj(C.EGG, 0, 0);
    uegg.spe = 1;
    uegg.quan = 1n;
    uegg.owt = C.weight(uegg);
    /* this sets hatch timers if appropriate */
    C.set_corpsenm(uegg, C.egg_type_from_parent(C.u.umonnum, 0));
    uegg.known = 1;
    C.observe_object(uegg);
    C.You("%s an egg.", C.eggs_in_water(C.gy.youmonst.data) ? "spawn" : "lay");
    C.dropy(uegg);
    C.stackobj(uegg);
    C.morehungry(C.int(C.objects[C.EGG].oc_nutrition));
    return C.ECMD_TIME;
}

/* #sit command */
export function dosit()
{
    const sit_message = "sit on the %s.";
    let trap = C.t_at(C.u.ux, C.u.uy);
    let typ = C.levl[C.u.ux][C.u.uy].typ;

    let _sit_path = 0;
 in_water: {
    if (C.u.usteed) {
        C.You("are already sitting on %s.", C.mon_nam(C.u.usteed));
        return C.ECMD_OK;
    }
    if (C.u.uundetected && C.is_hider(C.gy.youmonst.data)
        && C.u.umonnum != C.PM_TRAPPER) /* trapper can stay hidden on floor */
        C.u.uundetected = 0; /* no longer on the ceiling */

    if (!C.can_reach_floor(0)) {
        if (C.u.uswallow)
            C.There("are no seats in here!");
        else if (C.Levitation)
            C.You("tumble in place.");
        else
            C.You("are sitting on air.");
        return C.ECMD_OK;
    } else if (C.u.ustuck && !C.sticks(C.gy.youmonst.data)) {
        /* holding monster is next to hero rather than beneath, but
           hero is in no condition to actually sit at has/her own spot */
        if (C.humanoid(C.u.ustuck.data))
            C.pline("%s won't offer %s lap.", C.Monnam(C.u.ustuck), C.mhis(C.u.ustuck));
        else
            C.pline("%s has no lap.", C.Monnam(C.u.ustuck));
        return C.ECMD_OK;
    } else if (C.is_pool(C.u.ux, C.u.uy) && !C.Underwater) { /* water walking */
        { _sit_path = 2; break in_water; }
    } else if (C.Upolyd && C.u.umonnum == C.PM_GREMLIN
               && (C.levl[C.u.ux][C.u.uy].typ == C.FOUNTAIN || C.is_pool(C.u.ux, C.u.uy))) {
        { _sit_path = 2; break in_water; }
    }

    if (C.OBJ_AT(C.u.ux, C.u.uy)
        /* ensure we're not standing on the precipice */
        && !(C.uteetering_at_seen_pit(trap) || C.uescaped_shaft(trap))) {
        let obj;

        obj = C.svl.level.objects[C.u.ux][C.u.uy];
        if (C.gy.youmonst.data.mlet == C.S_DRAGON && obj.oclass == C.COIN_CLASS) {
            C.You("coil up around your %shoard.",
                (C.long(obj.quan + C.money_cnt(C.gi.invent)) < C.int(C.u.ulevel * 1000))
                ? "meager " : "");
        } else if (obj.otyp == C.TOWEL) {
            C.pline("It's probably not a good time for a picnic...");
        } else {
            if (C.slithy(C.gy.youmonst.data))
                C.You("coil up around %s.", C.the(C.xname(obj)));
            else
                C.You("sit on %s.", C.the(C.xname(obj)));
            if (obj.otyp == C.CORPSE && C.amorphous(C.mons[obj.corpsenm]))
                C.pline("It's squishy...");
            else if (obj.otyp == C.CREAM_PIE) {
                 if (!C.Deaf) {
                   // C.Soundeffect(se_squelch, 30) (inactive configured macro)
                   C.pline("Squelch!");
                }
                C.useupf(obj, obj.quan);
            } else if (!(C.Is_box(obj)
                         || C.objects[obj.otyp].oc_material == C.CLOTH))
                C.pline("It's not very comfortable...");
        }
        _sit_path = 1;
    } else if (trap != 0 || (C.u.utrap && (C.u.utraptype >= C.TT_LAVA))) {
        if (C.u.utrap) {
            C.exercise(C.A_WIS, 0); /* you're getting stuck longer */
            if (C.u.utraptype == C.TT_BEARTRAP) {
                C.You_cant("sit down with your %s in the bear trap.",
                         C.body_part(C.FOOT));
                C.u.utrap++;
            } else if (C.u.utraptype == C.TT_PIT) {
                if (trap && trap.ttyp == C.SPIKED_PIT) {
                    C.You("sit down on a spike.  Ouch!");
                    C.losehp(C.Half_physical_damage ? C.rn2(2, 476, 2) : 1,
                           "sitting on an iron spike", C.KILLED_BY);
                    C.exercise(C.A_STR, 0);
                } else
                    C.You("sit down in the pit.");
                C.u.utrap += C.rn2(5, 481, 2);
            } else if (C.u.utraptype == C.TT_WEB) {
                C.You("sit in the spider web and get entangled further!");
                C.u.utrap += (C.rn2(10, 484, 2) + 5);
            } else if (C.u.utraptype == C.TT_LAVA) {
                /* Must have fire resistance or they'd be dead already */
                C.You("sit in the %s!", C.hliquid("lava"));
                if (C.Slimed)
                    C.burn_away_slime();
                C.u.utrap += C.rnd(4, 490, 2);
                C.losehp(C.d(2, 10, 491, 2), "sitting in lava",
                       C.KILLED_BY); /* lava damage */
            } else if (C.u.utraptype == C.TT_INFLOOR
                       || C.u.utraptype == C.TT_BURIEDBALL) {
                C.You_cant("maneuver to sit!");
                C.u.utrap++;
            }
        } else {
            /* when flying, "you land" might need some refinement; it sounds
               as if you're staying on the ground but you will immediately
               take off again unless you become stuck in a holding trap */
            C.You("%s.", C.Flying ? "land" : "sit down");
            C.dotrap(trap, C.VIASITTING);
        }
        _sit_path = 1;
    } else if ((C.Underwater || C.Is_waterlevel(C.u.uz))
                && !C.eggs_in_water(C.gy.youmonst.data)) {
        if (C.Is_waterlevel(C.u.uz))
            C.There("are no cushions floating nearby.");
        else
            C.You("sit down on the muddy bottom.");
        _sit_path = 1;
    } else if (C.is_pool(C.u.ux, C.u.uy) && !C.eggs_in_water(C.gy.youmonst.data)) {
        _sit_path = 2;
    }
    }
    if (_sit_path == 1)
        return C.ECMD_TIME;
    if (_sit_path == 2) {
        C.You("sit in the %s.", C.hliquid("water"));
        if (C.Upolyd && C.u.umonnum == C.PM_GREMLIN) {
            if (C.split_mon(C.gy.youmonst, 0)) {
                if (C.levl[C.u.ux][C.u.uy].typ == C.FOUNTAIN)
                    C.dryup(C.u.ux, C.u.uy, 1);
            }
            /* splitting--or failing to do so--protects gear from the water */
        } else {
            if (!C.rn2(10, 521, 2) && C.uarm)
                C.water_damage(C.uarm, "armor", 1);
            if (!C.rn2(10, 523, 2) && C.uarmf && C.uarmf.otyp != C.WATER_WALKING_BOOTS)
                C.water_damage(C.uarm, "armor", 1);
        }
    } else if (C.IS_SINK(typ)) {
        C.You(sit_message, C.defsyms[C.S_sink].explanation);
        C.Your("%s gets wet.",
             C.humanoid(C.gy.youmonst.data) ? "rump" : "underside");
    } else if (C.IS_ALTAR(typ)) {
        C.You(sit_message, C.defsyms[C.S_altar].explanation);
        C.altar_wrath(C.u.ux, C.u.uy);
    } else if (C.IS_GRAVE(typ)) {
        C.You(sit_message, C.defsyms[C.S_grave].explanation);
    } else if (typ == C.STAIRS) {
        C.You(sit_message, "stairs");
    } else if (typ == C.LADDER) {
        C.You(sit_message, "ladder");
    } else if (C.is_lava(C.u.ux, C.u.uy)) {
        /* must be WWalking */
        C.You(sit_message, C.hliquid("lava"));
        C.burn_away_slime();
        if (C.likes_lava(C.gy.youmonst.data)) {
            C.pline_The("%s feels warm.", C.hliquid("lava"));
            return C.ECMD_TIME;
        }
        C.pline_The("%s burns you!", C.hliquid("lava"));
        C.losehp(C.d((C.Fire_resistance ? 2 : 10), 10, 548, 2), /* lava damage */
               "sitting on lava", C.KILLED_BY);
    } else if (C.is_ice(C.u.ux, C.u.uy)) {
        C.You(sit_message, C.defsyms[C.S_ice].explanation);
        if (!C.Cold_resistance)
            C.pline_The("ice feels cold.");
    } else if (typ == C.DRAWBRIDGE_DOWN) {
        C.You(sit_message, "drawbridge");
    } else if (C.IS_THRONE(typ)) {
        C.You(sit_message, C.defsyms[C.S_throne].explanation);
        throne_sit_effect();
    } else if (C.lays_eggs(C.gy.youmonst.data)) {
        return lay_an_egg();
    } else {
        C.pline("Having fun sitting on the %s?", C.surface(C.u.ux, C.u.uy));
    }
    return C.ECMD_TIME;
}

/* curse a few inventory items at random! */
export function rndcurse()
{
    let nobj = 0;
    let cnt, onum;
    let otmp;
    const mal_aura = "feel a malignant aura surround %s.";

    if (C.u_wield_art(C.ART_MAGICBANE) && C.rn2(20, 576, 3)) {
        C.You(mal_aura, "the magic-absorbing blade");
        return;
    }

    if (C.Antimagic) {
        C.shieldeff(C.u.ux, C.u.uy);
    }

    C.You(mal_aura, "you");

    for (otmp = C.gi.invent; otmp; otmp = otmp.nobj) {
        /* gold isn't subject to being cursed or blessed */
        if (otmp.oclass == C.COIN_CLASS)
            continue;
        nobj++;
    }
    cnt = C.rnd(6 / ((!!C.Antimagic) + (!!C.Half_spell_damage) + 1), 593, 3);
    if (nobj) {
        for (; cnt > 0; cnt--) {
            onum = C.rnd(nobj, 596, 3);
            for (otmp = C.gi.invent; otmp; otmp = otmp.nobj) {
                /* as above */
                if (otmp.oclass == C.COIN_CLASS)
                    continue;
                if (--onum == 0)
                    break; /* found the target */
            }
            /* the !otmp case should never happen; picking an already
               cursed item happens--avoid "resists" message in that case */
            if (!otmp || otmp.cursed)
                continue; /* next target */

            if (otmp.oartifact && C.spec_ability(otmp, C.SPFX_INTEL)
                && C.rn2(10, 610, 3) < 8) {
                C.pline("%s!", C.Tobjnam(otmp, "resist"));
                continue;
            }

            if (otmp.blessed)
                C.unbless(otmp);
            else
                C.curse(otmp);
        }
        C.update_inventory();
    }

    /* treat steed's saddle as extended part of hero's inventory */
    if (C.u.usteed && !C.rn2(4, 624, 3) && (otmp = C.which_armor(C.u.usteed, C.W_SADDLE)) != 0
        && !otmp.cursed) { /* skip if already cursed */
        if (otmp.blessed)
            C.unbless(otmp);
        else
            C.curse(otmp);
        if (!C.Blind) {
            C.pline("%s %s.", C.Yobjnam2(otmp, "glow"),
                  C.hcolor(otmp.cursed ? C.NH_BLACK : "brown"));
            otmp.bknown = C.Hallucination ? 0 : 1; /* bypass set_bknown() */
        } else {
            otmp.bknown = 0; /* bypass set_bknown() */
        }
    }
}

/* remove a random INTRINSIC ability from hero.
   returns the intrinsic property which was removed,
   or 0 if nothing was removed. */
export function attrcurse()
{
    let ret = 0;

    switch (C.rnd(11, 648, 4)) {
    case 1:
        if (C.HFire_resistance & C.INTRINSIC) {
            C.HFire_resistance &= ~C.INTRINSIC;
            C.You_feel("warmer.");
            ret = C.FIRE_RES;
            break;
        }
        // FALLTHROUGH;
        /*FALLTHRU*/
    case 2:
        if (C.HTeleportation & C.INTRINSIC) {
            C.HTeleportation &= ~C.INTRINSIC;
            C.You_feel("less jumpy.");
            ret = C.TELEPORT;
            break;
        }
        // FALLTHROUGH;
        /*FALLTHRU*/
    case 3:
        if (C.HPoison_resistance & C.INTRINSIC) {
            C.HPoison_resistance &= ~C.INTRINSIC;
            C.You_feel("a little sick!");
            ret = C.POISON_RES;
            break;
        }
        // FALLTHROUGH;
        /*FALLTHRU*/
    case 4:
        if (C.HTelepat & C.INTRINSIC) {
            C.HTelepat &= ~C.INTRINSIC;
            if (C.Blind && !C.Blind_telepat)
                C.see_monsters(); /* Can't sense mons anymore! */
            C.Your("senses fail!");
            ret = C.TELEPAT;
            break;
        }
        // FALLTHROUGH;
        /*FALLTHRU*/
    case 5:
        if (C.HCold_resistance & C.INTRINSIC) {
            C.HCold_resistance &= ~C.INTRINSIC;
            C.You_feel("cooler.");
            ret = C.COLD_RES;
            break;
        }
        // FALLTHROUGH;
        /*FALLTHRU*/
    case 6:
        if (C.HInvis & C.INTRINSIC) {
            C.HInvis &= ~C.INTRINSIC;
            C.You_feel("paranoid.");
            ret = C.INVIS;
            break;
        }
        // FALLTHROUGH;
        /*FALLTHRU*/
    case 7:
        if (C.HSee_invisible & C.INTRINSIC) {
            C.HSee_invisible &= ~C.INTRINSIC;
            if (!C.See_invisible) {
                C.set_mimic_blocking();
                C.see_monsters();
                /* might not be able to see self anymore */
                C.newsym(C.u.ux, C.u.uy);
            }
            C.You("%s!", C.Hallucination ? "tawt you taw a puttie tat"
                                     : "thought you saw something");
            ret = C.SEE_INVIS;
            break;
        }
        // FALLTHROUGH;
        /*FALLTHRU*/
    case 8:
        if (C.HFast & C.INTRINSIC) {
            C.HFast &= ~C.INTRINSIC;
            C.You_feel("slower.");
            ret = C.FAST;
            break;
        }
        // FALLTHROUGH;
        /*FALLTHRU*/
    case 9:
        if (C.HStealth & C.INTRINSIC) {
            C.HStealth &= ~C.INTRINSIC;
            C.You_feel("clumsy.");
            ret = C.STEALTH;
            break;
        }
        // FALLTHROUGH;
        /*FALLTHRU*/
    case 10:
        /* intrinsic protection is just disabled, not set back to 0 */
        if (C.HProtection & C.INTRINSIC) {
            C.HProtection &= ~C.INTRINSIC;
            C.You_feel("vulnerable.");
            ret = C.PROTECTION;
            break;
        }
        // FALLTHROUGH;
        /*FALLTHRU*/
    case 11:
        if (C.HAggravate_monster & C.INTRINSIC) {
            C.HAggravate_monster &= ~C.INTRINSIC;
            C.You_feel("less attractive.");
            ret = C.AGGRAVATE_MONSTER;
            break;
        }
        // FALLTHROUGH;
        /*FALLTHRU*/
    default:
        break;
    }
    return ret;
}

/*sit.c*/
