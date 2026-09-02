// sit.js — the #sit command and its consequences.
// C ref: src/sit.c

import { game } from './gstate.js';
import { rn2, rnd, rn1, d } from './rng.js';
import { pline, newsym, map_background, newsym_force, shieldeff,
         see_monsters, set_mimic_blocking } from './display.js';
import { You, You_cant, You_feel, Your, There, pline_The, verbalize }
    from './pline.js';
import { Monnam, mon_nam, hcolor, hliquid } from './do_name.js';
import { pronoun_gender, is_hider, humanoid, sticks, slithy, amorphous,
         lays_eggs, likes_lava, eggs_in_water, is_prince, is_vampire,
         eyecount } from './mondata.js';
import { genders } from './role_data.js';
import { t_at, is_pool, is_lava, delobj, egg_type_from_parent } from './mon.js';
import { is_ice } from './dbridge.js';
import { can_reach_floor } from './pickup.js';
import { Levitation, Flying, Underwater, Fire_resistance, Cold_resistance,
         Shock_resistance, Acid_resistance, Drain_resistance, Antimagic,
         Blind, Deaf, Hallucination, See_invisible } from './youprop.js';
import { losehp } from './hack.js';
import { surface, find_hell } from './dungeon.js';
import { dotrap, uteetering_at_seen_pit, uescaped_shaft, water_damage }
    from './trap.js';
import { exercise, adjattrib, change_luck } from './attrib.js';
import { body_part, polyself } from './polyself.js';
import { the, xname, Tobjnam, Yobjnam2, makeplural, vtense } from './objnam.js';
import { useupf, update_inventory, money_cnt, identify_pack, weight,
         stackobj } from './invent.js';
import { curse, unbless, mksobj, set_corpsenm } from './mkobj.js';
import { u_wield_art, spec_ability } from './artifact.js';
import { ART_MAGICBANE } from './artilist_data.js';
import { defsyms, cmap_names } from './drawing_data.js';
import { ECMD_OK, ECMD_TIME, OBJ_AT, STAIRS, LADDER, DRAWBRIDGE_DOWN, ROOM,
         IS_SINK, IS_ALTAR, IS_GRAVE, IS_THRONE, FOUNTAIN,
         TT_BEARTRAP, TT_PIT, TT_WEB, TT_LAVA, TT_INFLOOR, TT_BURIEDBALL,
         SPIKED_PIT, VIASITTING, A_WIS, A_STR, A_CON, A_MAX, FOOT, EYE, HEAD,
         INTRINSIC, TIMEOUT, FROMOUTSIDE, Is_waterlevel, Upolyd, KILLED_BY,
         KILLED_BY_AN, In_V_tower, NO_MM_FLAGS, SICK_ALL, UTOTYPE_NONE,
         POLY_NOFLAGS, W_SADDLE, NH_BLACK, PRONOUN_HALLU,
         FIRE_RES, TELEPORT, POISON_RES, TELEPAT, COLD_RES, INVIS, SEE_INVIS,
         FAST, STEALTH, PROTECTION, AGGRAVATE_MONSTER } from './const.js';
import { ONAMES, MATERIALS, OCLASSES } from './objects_data.js';
import { MONSYMS, PMNAMES } from './monst_data.js';
import { Is_box } from './obj.js';
import { remove_worn_item } from './steal.js';
import { getlin } from './cmd.js';
import { tty_yn_function } from './tty/topl.js';
import { make_blinded, make_sick, make_confused, make_glib, split_mon }
    from './potion.js';
import { heal_legs, schedule_goto, dropy } from './do.js';
import { makewish } from './zap.js';
import { courtmon } from './mkroom.js';
import { makemon } from './makemon.js';
import { do_genocide, seffects } from './read.js';
import { do_mapping } from './detect.js';
import { aggravate } from './wizard.js';
import { tele } from './teleport.js';
import { losexp } from './exper.js';
import { msummon } from './minion.js';
import { burn_away_slime } from './timeout.js';
import { dryup } from './fountain.js';
import { altar_wrath } from './pray.js';
import { which_armor } from './worn.js';
import { observe_object } from './o_init.js';
import { morehungry } from './eat.js';
import { cansee } from './vision.js';

/* src/mondata.c mhis() — via pronoun_gender, as js/mhitu.js does */
const mhis = (mtmp) => genders[pronoun_gender(mtmp, PRONOUN_HALLU)].his;
/* include/youprop.h */
const Half_physical_damage = () =>
    !!(game.u.intrinsic?.HHalf_physical_damage || game.u.uprops?.HALF_PHDAM);
const Half_spell_damage = () =>
    !!(game.u.intrinsic?.HHalf_spell_damage || game.u.uprops?.HALF_SPDAM);
const Slimed = () => !!(game.u.intrinsic?.HSlimed);
const Blind_telepat = () =>
    !!(game.u.intrinsic?.HTelepat || game.u.uprops?.TELEPAT);
const BlindedTimeout = () => ((game.u.intrinsic?.HBlinded | 0) & TIMEOUT);
/* include/you.h:464 Luck */
const Luck = () => (game.u.uluck | 0) + (game.u.moreluck | 0);
/* include/artifact.h SPFX_INTEL */
const SPFX_INTEL = 0x04;

// src/sit.c:14 take_gold()
export async function take_gold() {
    let lost_money = 0;

    for (const otmp of [...(game.invent || [])]) {
        if (otmp.oclass === OCLASSES.COIN_CLASS) {
            lost_money = 1;
            await remove_worn_item(otmp, false);
            delobj(otmp);
        }
    }
    if (!lost_money) {
        await You_feel('a strange sensation.');
    } else {
        await You('notice you have no gold!');
        (game.disp ||= {}).botl = true;
    }
}

// src/sit.c:39 throne_sit_effect()
async function throne_sit_effect() {
    const u = game.u;
    const intr = (u.intrinsic ||= {});
    const tx = u.ux, ty = u.uy;

    const special_throne = !!In_V_tower(u.uz);

    if (rnd(6) > 4) { /* [why so convoluted? it's the same as '!rn2(3)'] */
        let effect = rnd(13);

        if (game.wizard && !game.iflags?.debug_fuzzer) {
            let which;

            const buf = await getlin('Throne sit effect (1..13) [0=random]');
            if (buf.charAt(0) === '\x1b') {
                await pline('Never mind.');
                return; /* caller will still cause a move to elapse */
            }
            which = parseInt(buf, 10) || 0; /* atoi */
            if (which >= 1 && which <= 13)
                effect = which;
        }

        if (special_throne) {
            await special_throne_effect(effect);
            return;
        }

        switch (effect) {
        case 1:
            await adjattrib(rn2(A_MAX), -rn1(4, 3), false);
            await losehp(rnd(10), 'cursed throne', KILLED_BY_AN);
            break;
        case 2:
            await adjattrib(rn2(A_MAX), 1, false);
            break;
        case 3:
            await pline(`A${(Shock_resistance()) ? 'n' : ' massive'} electric shock shoots through your body!`);
            await losehp(Shock_resistance() ? rnd(6) : rnd(30), 'electric chair',
                         KILLED_BY_AN);
            exercise(A_CON, false);
            break;
        case 4:
            await You_feel('much, much better!');
            if (Upolyd(u)) {
                if (u.mh >= (u.mhmax - 5))
                    u.mhmax += 4;
                u.mh = u.mhmax;
            }
            if (u.uhp >= (u.uhpmax - 5)) {
                u.uhpmax += 4;
                if (u.uhpmax > (u.uhppeak | 0))
                    u.uhppeak = u.uhpmax;
            }
            u.uhp = u.uhpmax;
            u.ucreamed = 0;
            await make_blinded(0, true);
            await make_sick(0, null, false, SICK_ALL);
            await heal_legs(0);
            (game.disp ||= {}).botl = true;
            break;
        case 5:
            await take_gold();
            break;
        case 6:
            if ((u.uluck | 0) + rn2(5) < 0) {
                await You_feel('your luck is changing.');
                change_luck(1);
            } else
                await makewish();
            break;
        case 7:
            {
                let cnt = rnd(10);

                /* Magical voice not affected by deafness */
                await pline('A voice echoes:');
                /* SetVoice((struct monst *) 0, 0, 80, voice_throne) */
                await verbalize(`Thine audience hath been summoned, ${game.flags.female ? 'Dame' : 'Sire'}!`);
                while (cnt--)
                    makemon(courtmon(), tx, ty, NO_MM_FLAGS);
                break;
            }
        case 8:
            /* Magical voice not affected by deafness */
            await pline('A voice echoes:');
            /* SetVoice((struct monst *) 0, 0, 80, voice_throne) */
            await verbalize(`By thine Imperious order, ${game.flags.female ? 'Dame' : 'Sire'}...`);
            await do_genocide(5); /* REALLY|ONTHRONE, see do_genocide() */
            break;
        case 9:
            /* Magical voice not affected by deafness */
            await pline('A voice echoes:');
            /* SetVoice((struct monst *) 0, 0, 80, voice_throne) */
            await verbalize('A curse upon thee for sitting upon this most holy throne!');
            if (Luck() > 0) {
                await make_blinded(BlindedTimeout() + rn1(100, 250), true);
                change_luck((Luck() > 1) ? -rnd(2) : -1);
            } else
                await rndcurse();
            break;
        case 10:
            if (Luck() < 0 || ((intr.HSee_invisible | 0) & INTRINSIC)) {
                if (game.level.flags?.nommap) {
                    await pline('A terrible drone fills your head!');
                    await make_confused(((intr.HConfusion | 0) & TIMEOUT) + rnd(30),
                                        false);
                } else {
                    await pline('An image forms in your mind.');
                    await do_mapping();
                }
            } else {
                /* avoid "vision clears" if hero can't see */
                if (!Blind()) {
                    await Your('vision becomes clear.');
                } else {
                    const num_of_eyes = eyecount(game.youmonst.data);
                    let eye = body_part(EYE);

                    /* note: 1 eye case won't actually happen--can't
                       sit on throne when poly'd into always-levitating
                       floating eye and can't polymorph into Cyclops */
                    switch (num_of_eyes) { /* 2, 1, or 0 */
                    default:
                    case 2: /* more than 1 eye */
                        eye = makeplural(eye);
                        /*FALLTHRU*/
                    case 1: /* one eye (Cyclops, floating eye) */
                        await Your(`${eye} ${vtense(eye, 'tingle')}...`);
                        break;
                    case 0: /* no eyes */
                        await You(`have a very strange feeling in your ${body_part(HEAD)}.`);
                        break;
                    }
                }
                intr.HSee_invisible = (intr.HSee_invisible | 0) | FROMOUTSIDE;
                newsym(u.ux, u.uy);
            }
            break;
        case 11:
            if (Luck() < 0) {
                await You_feel('threatened.');
                aggravate();
            } else {
                await You_feel('a wrenching sensation.');
                await tele(); /* teleport him */
            }
            break;
        case 12:
            await You('are granted an insight!');
            if (game.invent && game.invent.length) {
                /* rn2(5) agrees w/seffects() */
                await identify_pack(rn2(5), false);
            }
            break;
        case 13:
            await Your('mind turns into a pretzel!');
            await make_confused(((intr.HConfusion | 0) & TIMEOUT) + rn1(7, 16),
                                false);
            break;
        default:
            /* impossible("throne effect") */
            break;
        }
    } else {
        if (is_prince(game.youmonst.data) || u.uevent?.uhand_of_elbereth)
            await You_feel('very comfortable here.');
        else
            await You_feel('somehow out of place...');
    }

    /* 5.0: when the random chance for removal is hit, ask for confirmation
       if in wizard mode, and remove the throne even if hero was teleported
       away from it.  [This used to remove a throne at hero's current
       location if there happened to be one, so for the teleport case that
       only happened when teleporting back to the same point where hero
       started from.]  "Analyzing a throne" doesn't really make any sense
       but if the answer is yes than it will vanish in a puff of logic. */
    if (!special_throne
        && !rn2(3)
        && (!game.wizard
            || (await tty_yn_function('Analyze throne?', 'yn', 'n')) === 'y')) {
        const loc = game.level.at(tx, ty);
        loc.typ = ROOM, loc.flags = 0;
        map_background(tx, ty, false);
        newsym_force(tx, ty);
        /* "[God] promptly vanishes in a puff of logic" is from
           Douglas Adams' _The_Hitchhiker's_Guide_to_the_Galaxy_. */
        await pline_The(`throne ${cansee(tx, ty) ? 'vanishes' : 'has vanished'} in a puff of logic.`);
    }
}

// src/sit.c:238 special_throne_effect(); the throne in Vlad's tower
async function special_throne_effect(effect) {
    const u = game.u;
    const tx = u.ux, ty = u.uy;

    switch (effect) {
    case 1:
    case 2:
    case 3:
    case 4:
        /* 4 chances of a wish, but then the throne disappears.

           This is the only way the throne can disappear from sitting
           on it, so if you sit on it enough (enduring the negative
           effects) you are guaranteed an eventual wish. */
        await makewish();
        {
            const loc = game.level.at(tx, ty);
            loc.typ = ROOM, loc.flags = 0;
        }
        map_background(tx, ty, false);
        newsym_force(tx, ty);
        await pline_The('throne disintegrates, having spent its power.');
        break;
    case 5:
        /* permanent level drain */
        await pline('Sitting on the throne was a terrible experience.');
        if (!Drain_resistance()) {
            await losexp('a bad experience sitting on a throne');
            if (u.ulevelmax > u.ulevel)
                u.ulevelmax -= 1;
        }
        break;
    case 6:
    {
        /* grease hands and inventory

           Same rules for which items can be affected as grease_ok in apply.c */
        await pline('A greasy liquid sprays all over you!');
        for (const otmp of game.invent || [])
            if (otmp.oclass !== OCLASSES.COIN_CLASS)
                otmp.greased = 1;
        make_glib(rn1(101, 100));
        update_inventory();
        break;
    }
    case 7:
        /* lose an intrinsic */
        await attrcurse();
        await pline_The('throne somehow seems to be amused.');
        break;
    case 8:
    {
        /* level teleport to Vibrating Square level */
        const vs_level = { dnum: 0, dlevel: 0 };
        find_hell(vs_level);
        vs_level.dlevel = game.dungeons[vs_level.dnum].num_dunlevs - 1;
        if (u.uhave?.amulet)
            await You_feel('extremely disoriented for a moment.');
        else
            schedule_goto(vs_level, UTOTYPE_NONE, null,
                          'You feel extremely out of place.');
        break;
    }
    case 9:
    {
        /* summon demons; a NULL argument to msummon summons demons as
           though they were summoned by the Wizard of Yendor */
        await pline_The('throne seeems to be calling for help!');
        await msummon(null);
        await msummon(null);
        await msummon(null);
        break;
    }
    case 10:
    {
        /* confused blessed remove curse effect */
        const intr = (u.intrinsic ||= {});
        const save_confusion = intr.HConfusion;
        /* fake_spellbook = cg.zeroobj; then the fields below */
        const fake_spellbook = { otyp: ONAMES.SPE_REMOVE_CURSE,
                                 oclass: OCLASSES.SPBOOK_CLASS, blessed: 1,
                                 cursed: 0, quan: 1, spe: 0, dknown: 0,
                                 known: 0, o_id: 0 };

        intr.HConfusion = 1;
        await seffects(fake_spellbook);
        intr.HConfusion = save_confusion;
        break;
    }
    case 11:
        /* polymorph effect (not blocked by magic resistance, but other things
           that protect from polymorphs work) */
        if (is_vampire(game.youmonst.data)) {
            await You_feel('unworthy.');
        } else {
            await pline('This throne was not meant for those such as you!');
            await You_feel('a change coming over you.');
            await polyself(POLY_NOFLAGS);
        }
        break;
    case 12:
        /* acid damage */
        await pline('The throne is covered in acid!');
        await losehp(Acid_resistance() ? rnd(16) : rnd(80), 'acidic chair',
                     KILLED_BY_AN);
        exercise(A_CON, false);
        break;
    case 13:
    {
        /* ability shuffle */
        let ability;
        await pline('As you sit on the throne, your body and mind start to warp.');
        for (ability = 0; ability < A_MAX; ++ability) {
            await adjattrib(ability, rn2(5) - 2, -1);
        }
        break;
    }
    }
}

// src/sit.c:358 lay_an_egg(); hero lays an egg
async function lay_an_egg() {
    const u = game.u;
    let uegg;

    if (!game.flags.female) {
        await pline(`${Hallucination()
                      ? 'You may think you are a platypus, but a male still'
                      : 'Males'} can't lay eggs!`);
        return ECMD_OK;
    } else if (u.uhunger < game.objects[ONAMES.EGG].oc_nutrition) {
        await You("don't have enough energy to lay an egg.");
        return ECMD_OK;
    } else if (eggs_in_water(game.youmonst.data)) {
        if (!(Underwater() || Is_waterlevel(u.uz))) {
            await pline('A splash tetra you are not.');
            return ECMD_OK;
        }
        if (Upolyd(u)
            && (game.youmonst.data === game.mons[PMNAMES.PM_GIANT_EEL]
                || game.youmonst.data === game.mons[PMNAMES.PM_ELECTRIC_EEL])) {
            await You('yearn for the Sargasso Sea.');
            return ECMD_OK;
        }
    }
    uegg = mksobj(ONAMES.EGG, false, false);
    uegg.spe = 1;
    uegg.quan = 1;
    uegg.owt = weight(uegg);
    /* this sets hatch timers if appropriate */
    set_corpsenm(uegg, egg_type_from_parent(u.umonnum, false));
    uegg.known = 1;
    observe_object(uegg);
    await You(`${eggs_in_water(game.youmonst.data) ? 'spawn' : 'lay'} an egg.`);
    await dropy(uegg);
    stackobj(uegg);
    await morehungry(game.objects[ONAMES.EGG].oc_nutrition);
    return ECMD_TIME;
}

// src/sit.c:400 dosit() — the #sit command
export async function dosit() {
    const u = game.u;
    const sit_message = (what) => You(`sit on the ${what}.`);
    const trap = t_at(u.ux, u.uy);
    const typ = game.level.at(u.ux, u.uy).typ;
    let in_water = false;

    if (u.usteed) {
        await You(`are already sitting on ${mon_nam(u.usteed)}.`);
        return ECMD_OK;
    }
    if (u.uundetected && is_hider(game.youmonst.data)
        && u.umonnum !== PMNAMES.PM_TRAPPER) /* trapper can stay hidden on floor */
        u.uundetected = 0; /* no longer on the ceiling */

    if (!can_reach_floor(false)) {
        if (u.uswallow)
            await There('are no seats in here!');
        else if (Levitation())
            await You('tumble in place.');
        else
            await You('are sitting on air.');
        return ECMD_OK;
    } else if (u.ustuck && !sticks(game.youmonst.data)) {
        /* holding monster is next to hero rather than beneath, but
           hero is in no condition to actually sit at has/her own spot */
        if (humanoid(u.ustuck.data))
            await pline(`${Monnam(u.ustuck)} won't offer ${mhis(u.ustuck)} lap.`);
        else
            await pline(`${Monnam(u.ustuck)} has no lap.`);
        return ECMD_OK;
    } else if (is_pool(u.ux, u.uy) && !Underwater()) { /* water walking */
        in_water = true; /* goto in_water */
    } else if (Upolyd(u) && u.umonnum === PMNAMES.PM_GREMLIN
               && (game.level.at(u.ux, u.uy).typ === FOUNTAIN || is_pool(u.ux, u.uy))) {
        in_water = true; /* goto in_water */
    }

    if (!in_water && OBJ_AT(u.ux, u.uy)
        /* ensure we're not standing on the precipice */
        && !(uteetering_at_seen_pit(trap) || uescaped_shaft(trap))) {
        /* C reads svl.level.objects[x][y], the head of the per-square
           chain; place_object() prepends, so the first flat-list match is
           the same object. */
        const obj = (game.level?.objects || [])
            .find(o => o.ox === u.ux && o.oy === u.uy);
        if (game.youmonst.data.mlet === MONSYMS.S_DRAGON && obj.oclass === OCLASSES.COIN_CLASS) {
            await You(`coil up around your ${
                (obj.quan + money_cnt(game.invent) < u.ulevel * 1000)
                ? 'meager ' : ''}hoard.`);
        } else if (obj.otyp === ONAMES.TOWEL) {
            await pline("It's probably not a good time for a picnic...");
        } else {
            if (slithy(game.youmonst.data))
                await You(`coil up around ${the(xname(obj))}.`);
            else
                await You(`sit on ${the(xname(obj))}.`);
            if (obj.otyp === ONAMES.CORPSE && amorphous(game.mons[obj.corpsenm]))
                await pline("It's squishy...");
            else if (obj.otyp === ONAMES.CREAM_PIE) {
                if (!Deaf()) {
                    /* Soundeffect(se_squelch, 30) */
                    await pline('Squelch!');
                }
                await useupf(obj, obj.quan);
            } else if (!(Is_box(obj)
                         || game.objects[obj.otyp].oc_material === MATERIALS.CLOTH))
                await pline("It's not very comfortable...");
        }
    } else if (!in_water
               && (trap != null || (u.utrap && (u.utraptype >= TT_LAVA)))) {
        if (u.utrap) {
            exercise(A_WIS, false); /* you're getting stuck longer */
            if (u.utraptype === TT_BEARTRAP) {
                await You_cant(`sit down with your ${body_part(FOOT)} in the bear trap.`);
                u.utrap++;
            } else if (u.utraptype === TT_PIT) {
                if (trap && trap.ttyp === SPIKED_PIT) {
                    await You('sit down on a spike.  Ouch!');
                    await losehp(Half_physical_damage() ? rn2(2) : 1,
                                 'sitting on an iron spike', KILLED_BY);
                    exercise(A_STR, false);
                } else
                    await You('sit down in the pit.');
                u.utrap += rn2(5);
            } else if (u.utraptype === TT_WEB) {
                await You('sit in the spider web and get entangled further!');
                u.utrap += rn1(10, 5);
            } else if (u.utraptype === TT_LAVA) {
                /* Must have fire resistance or they'd be dead already */
                await You(`sit in the ${hliquid('lava')}!`);
                if (Slimed())
                    await burn_away_slime();
                u.utrap += rnd(4);
                await losehp(d(2, 10), 'sitting in lava',
                             KILLED_BY); /* lava damage */
            } else if (u.utraptype === TT_INFLOOR
                       || u.utraptype === TT_BURIEDBALL) {
                await You_cant('maneuver to sit!');
                u.utrap++;
            }
        } else {
            /* when flying, "you land" might need some refinement; it sounds
               as if you're staying on the ground but you will immediately
               take off again unless you become stuck in a holding trap */
            await You(`${Flying() ? 'land' : 'sit down'}.`);
            await dotrap(trap, VIASITTING);
        }
    } else if (!in_water
               && (Underwater() || Is_waterlevel(u.uz))
               && !eggs_in_water(game.youmonst.data)) {
        if (Is_waterlevel(u.uz))
            await There('are no cushions floating nearby.');
        else
            await You('sit down on the muddy bottom.');
    } else if (in_water
               || (is_pool(u.ux, u.uy) && !eggs_in_water(game.youmonst.data))) {
 /* in_water: */
        await You(`sit in the ${hliquid('water')}.`);
        if (Upolyd(u) && u.umonnum === PMNAMES.PM_GREMLIN) {
            if (await split_mon(game.youmonst, null)) {
                if (game.level.at(u.ux, u.uy).typ === FOUNTAIN)
                    await dryup(u.ux, u.uy, true);
            }
            /* splitting--or failing to do so--protects gear from the water */
        } else {
            if (!rn2(10) && u.uarm)
                await water_damage(u.uarm, 'armor', true);
            if (!rn2(10) && u.uarmf && u.uarmf.otyp !== ONAMES.WATER_WALKING_BOOTS)
                await water_damage(u.uarm, 'armor', true);
        }
    } else if (IS_SINK(typ)) {
        await sit_message(defsyms[cmap_names.S_sink].explain);
        await Your(`${humanoid(game.youmonst.data) ? 'rump' : 'underside'} gets wet.`);
    } else if (IS_ALTAR(typ)) {
        await sit_message(defsyms[cmap_names.S_altar].explain);
        await altar_wrath(u.ux, u.uy);
    } else if (IS_GRAVE(typ)) {
        await sit_message(defsyms[cmap_names.S_grave].explain);
    } else if (typ === STAIRS) {
        await sit_message('stairs');
    } else if (typ === LADDER) {
        await sit_message('ladder');
    } else if (is_lava(u.ux, u.uy)) {
        /* must be WWalking */
        await sit_message(hliquid('lava'));
        await burn_away_slime();
        if (likes_lava(game.youmonst.data)) {
            await pline_The(`${hliquid('lava')} feels warm.`);
            return ECMD_TIME;
        }
        await pline_The(`${hliquid('lava')} burns you!`);
        await losehp(d((Fire_resistance() ? 2 : 10), 10), /* lava damage */
                     'sitting on lava', KILLED_BY);
    } else if (is_ice(u.ux, u.uy)) {
        await sit_message(defsyms[cmap_names.S_ice].explain);
        if (!Cold_resistance())
            await pline_The('ice feels cold.');
    } else if (typ === DRAWBRIDGE_DOWN) {
        await sit_message('drawbridge');
    } else if (IS_THRONE(typ)) {
        await sit_message(defsyms[cmap_names.S_throne].explain);
        await throne_sit_effect();
    } else if (lays_eggs(game.youmonst.data)) {
        return await lay_an_egg();
    } else {
        await pline(`Having fun sitting on the ${surface(u.ux, u.uy)}?`);
    }
    return ECMD_TIME;
}

// src/sit.c:569 rndcurse(); curse a few inventory items at random!
export async function rndcurse() {
    const u = game.u;
    let nobj = 0;
    let cnt, onum;
    let otmp;
    const mal_aura = 'feel a malignant aura surround %s.';

    if (u_wield_art(ART_MAGICBANE) && rn2(20)) {
        await You(mal_aura.replace('%s', 'the magic-absorbing blade'));
        return;
    }

    if (Antimagic()) {
        await shieldeff(u.ux, u.uy);
    }

    await You(mal_aura.replace('%s', 'you'));

    for (otmp of game.invent || []) {
        /* gold isn't subject to being cursed or blessed */
        if (otmp.oclass === OCLASSES.COIN_CLASS)
            continue;
        nobj++;
    }
    cnt = rnd(Math.trunc(6 / ((Antimagic() ? 1 : 0) + (Half_spell_damage() ? 1 : 0) + 1)));
    if (nobj) {
        for (; cnt > 0; cnt--) {
            onum = rnd(nobj);
            otmp = null;
            for (const o of game.invent || []) {
                /* as above */
                if (o.oclass === OCLASSES.COIN_CLASS)
                    continue;
                if (--onum === 0) {
                    otmp = o;
                    break; /* found the target */
                }
            }
            /* the !otmp case should never happen; picking an already
               cursed item happens--avoid "resists" message in that case */
            if (!otmp || otmp.cursed)
                continue; /* next target */

            if (otmp.oartifact && spec_ability(otmp, SPFX_INTEL)
                && rn2(10) < 8) {
                await pline(`${Tobjnam(otmp, 'resist')}!`);
                continue;
            }

            if (otmp.blessed)
                unbless(otmp);
            else
                curse(otmp);
        }
        update_inventory();
    }

    /* treat steed's saddle as extended part of hero's inventory */
    if (u.usteed && !rn2(4) && (otmp = which_armor(u.usteed, W_SADDLE)) != null
        && !otmp.cursed) { /* skip if already cursed */
        if (otmp.blessed)
            unbless(otmp);
        else
            curse(otmp);
        if (!Blind()) {
            await pline(`${Yobjnam2(otmp, 'glow')} ${hcolor(otmp.cursed ? NH_BLACK : 'brown')}.`);
            otmp.bknown = Hallucination() ? 0 : 1; /* bypass set_bknown() */
        } else {
            otmp.bknown = 0; /* bypass set_bknown() */
        }
    }
}

// src/sit.c:644 attrcurse(); remove a random INTRINSIC ability from hero.
// returns the intrinsic property which was removed, or 0 if nothing was
// removed.
export async function attrcurse() {
    const intr = (game.u.intrinsic ||= {});
    let ret = 0;

    switch (rnd(11)) {
    case 1:
        if ((intr.HFire_resistance | 0) & INTRINSIC) {
            intr.HFire_resistance &= ~INTRINSIC;
            await You_feel('warmer.');
            ret = FIRE_RES;
            break;
        }
        /*FALLTHRU*/
    case 2:
        if ((intr.HTeleportation | 0) & INTRINSIC) {
            intr.HTeleportation &= ~INTRINSIC;
            await You_feel('less jumpy.');
            ret = TELEPORT;
            break;
        }
        /*FALLTHRU*/
    case 3:
        if ((intr.HPoison_resistance | 0) & INTRINSIC) {
            intr.HPoison_resistance &= ~INTRINSIC;
            await You_feel('a little sick!');
            ret = POISON_RES;
            break;
        }
        /*FALLTHRU*/
    case 4:
        if ((intr.HTelepat | 0) & INTRINSIC) {
            intr.HTelepat &= ~INTRINSIC;
            if (Blind() && !Blind_telepat())
                see_monsters(); /* Can't sense mons anymore! */
            await Your('senses fail!');
            ret = TELEPAT;
            break;
        }
        /*FALLTHRU*/
    case 5:
        if ((intr.HCold_resistance | 0) & INTRINSIC) {
            intr.HCold_resistance &= ~INTRINSIC;
            await You_feel('cooler.');
            ret = COLD_RES;
            break;
        }
        /*FALLTHRU*/
    case 6:
        if ((intr.HInvis | 0) & INTRINSIC) {
            intr.HInvis &= ~INTRINSIC;
            await You_feel('paranoid.');
            ret = INVIS;
            break;
        }
        /*FALLTHRU*/
    case 7:
        if ((intr.HSee_invisible | 0) & INTRINSIC) {
            intr.HSee_invisible &= ~INTRINSIC;
            if (!See_invisible()) {
                set_mimic_blocking();
                see_monsters();
                /* might not be able to see self anymore */
                newsym(game.u.ux, game.u.uy);
            }
            await You(`${Hallucination() ? 'tawt you taw a puttie tat'
                                         : 'thought you saw something'}!`);
            ret = SEE_INVIS;
            break;
        }
        /*FALLTHRU*/
    case 8:
        if ((intr.HFast | 0) & INTRINSIC) {
            intr.HFast &= ~INTRINSIC;
            await You_feel('slower.');
            ret = FAST;
            break;
        }
        /*FALLTHRU*/
    case 9:
        if ((intr.HStealth | 0) & INTRINSIC) {
            intr.HStealth &= ~INTRINSIC;
            await You_feel('clumsy.');
            ret = STEALTH;
            break;
        }
        /*FALLTHRU*/
    case 10:
        /* intrinsic protection is just disabled, not set back to 0 */
        if ((intr.HProtection | 0) & INTRINSIC) {
            intr.HProtection &= ~INTRINSIC;
            await You_feel('vulnerable.');
            ret = PROTECTION;
            break;
        }
        /*FALLTHRU*/
    case 11:
        if ((intr.HAggravate_monster | 0) & INTRINSIC) {
            intr.HAggravate_monster &= ~INTRINSIC;
            await You_feel('less attractive.');
            ret = AGGRAVATE_MONSTER;
            break;
        }
        /*FALLTHRU*/
    default:
        break;
    }
    return ret;
}
