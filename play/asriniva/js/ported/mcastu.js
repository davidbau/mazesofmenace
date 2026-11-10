/* NetHack 5.0	mcastu.c	$NHDT-Date: 1770949988 2026/02/12 18:33:08 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.111 $ */
import { C } from './c-runtime.js';

/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2011. */
/* NetHack may be freely redistributed.  See license for details. */



export const MCAST_PSI_BOLT = 0;
export const MCAST_OPEN_WOUNDS = 1;
export const MCAST_CURE_SELF = 2;
export const MCAST_HASTE_SELF = 3;
export const MCAST_CONFUSE_YOU = 4;
export const MCAST_STUN_YOU = 5;
export const MCAST_DISAPPEAR = 6;
export const MCAST_PARALYZE = 7;
export const MCAST_BLIND_YOU = 8;
export const MCAST_WEAKEN_YOU = 9;
export const MCAST_DESTRY_ARMR = 10;
export const MCAST_INSECTS = 11;
export const MCAST_CURSE_ITEMS = 12;
export const MCAST_LIGHTNING = 13;
export const MCAST_FIRE_PILLAR = 14;
export const MCAST_GEYSER = 15;
export const MCAST_AGGRAVATION = 16;
export const MCAST_SUMMON_MONS = 17;
export const MCAST_CLONE_WIZ = 18;
export const MCAST_DEATH_TOUCH = 19;

export const mcast_data = [
    {level: 0, flags: ['MCF_HOSTILE', 'MCF_SIGHT']}, // MCAST_PSI_BOLT
    {level: 0, flags: ['MCF_HOSTILE', 'MCF_SIGHT']}, // MCAST_OPEN_WOUNDS
    {level: 1, flags: ['MCF_INDIRECT']}, // MCAST_CURE_SELF
    {level: 2, flags: ['MCF_INDIRECT']}, // MCAST_HASTE_SELF
    {level: 2, flags: ['MCF_HOSTILE', 'MCF_SIGHT']}, // MCAST_CONFUSE_YOU
    {level: 3, flags: ['MCF_HOSTILE', 'MCF_SIGHT']}, // MCAST_STUN_YOU
    {level: 4, flags: ['MCF_INDIRECT']}, // MCAST_DISAPPEAR
    {level: 4, flags: ['MCF_HOSTILE', 'MCF_SIGHT']}, // MCAST_PARALYZE
    {level: 6, flags: ['MCF_HOSTILE', 'MCF_SIGHT']}, // MCAST_BLIND_YOU
    {level: 6, flags: ['MCF_HOSTILE', 'MCF_SIGHT']}, // MCAST_WEAKEN_YOU
    {level: 8, flags: ['MCF_HOSTILE', 'MCF_SIGHT']}, // MCAST_DESTRY_ARMR
    {level: 8, flags: ['MCF_HOSTILE', 'MCF_INDIRECT', 'MCF_SIGHT']}, // MCAST_INSECTS
    {level: 10, flags: ['MCF_HOSTILE', 'MCF_SIGHT']}, // MCAST_CURSE_ITEMS
    {level: 11, flags: ['MCF_HOSTILE', 'MCF_SIGHT']}, // MCAST_LIGHTNING
    {level: 12, flags: ['MCF_HOSTILE', 'MCF_SIGHT']}, // MCAST_FIRE_PILLAR
    {level: 13, flags: ['MCF_HOSTILE', 'MCF_SIGHT']}, // MCAST_GEYSER
    {level: 13, flags: ['MCF_INDIRECT', 'MCF_HOSTILE', 'MCF_SIGHT']}, // MCAST_AGGRAVATION
    {level: 15, flags: ['MCF_HOSTILE', 'MCF_INDIRECT', 'MCF_SIGHT']}, // MCAST_SUMMON_MONS
    {level: 18, flags: ['MCF_HOSTILE', 'MCF_INDIRECT', 'MCF_SIGHT']}, // MCAST_CLONE_WIZ
    {level: 20, flags: ['MCF_HOSTILE', 'MCF_SIGHT']}, // MCAST_DEATH_TOUCH
];

/* spell lists for specific monster casters */
/* the spells in the list should be in ascending level order */
export const mon_cleric_spells = [
    'MCAST_OPEN_WOUNDS', 'MCAST_CURE_SELF', 'MCAST_CONFUSE_YOU', 'MCAST_PARALYZE',
    'MCAST_BLIND_YOU', 'MCAST_INSECTS', 'MCAST_CURSE_ITEMS', 'MCAST_LIGHTNING',
    'MCAST_FIRE_PILLAR', 'MCAST_GEYSER'
];
export const mon_wizard_spells = [
    'MCAST_PSI_BOLT', 'MCAST_CURE_SELF', 'MCAST_HASTE_SELF', 'MCAST_STUN_YOU',
    'MCAST_DISAPPEAR', 'MCAST_WEAKEN_YOU', 'MCAST_DESTRY_ARMR', 'MCAST_CURSE_ITEMS',
    'MCAST_AGGRAVATION', 'MCAST_SUMMON_MONS', 'MCAST_CLONE_WIZ', 'MCAST_DEATH_TOUCH'
];
























/* feedback when frustrated monster couldn't cast a spell */
export function cursetxt(mtmp, undirected)
{
    undirected = C.boolean(undirected);
    if (C.canseemon(mtmp) && C.couldsee(mtmp.mx, mtmp.my)) {
        let point_msg; /* spellcasting monsters are impolite */

        if (undirected)
            point_msg = "all around, then curses";
        else if ((C.Invis && !C.perceives(mtmp.data)
                  && (mtmp.mux != C.u.ux || mtmp.muy != C.u.uy))
                 || C.is_obj_mappear(C.gy.youmonst, C.STRANGE_OBJECT)
                 || C.u.uundetected)
            point_msg = "and curses in your general direction";
        else if (C.Displaced && (mtmp.mux != C.u.ux || mtmp.muy != C.u.uy))
            point_msg = "and curses at your displaced image";
        else
            point_msg = "at you, then curses";

        C.pline_mon(mtmp, "%s points %s.", C.Monnam(mtmp), point_msg);
    } else if ((!(C.svm.moves % 4n) || !C.rn2(4, 81, 'cursetxt'))) {
        if (!C.Deaf)
            C.Norep("You hear a mumbled curse.");   /* Deaf-aware */
    }
}

/* choose a spell for monster to cast */
export function choose_monster_spell(mtmp, adtyp)
{
    adtyp = C.int(adtyp);
    let list = 0;
    let i, spellval, len = 0;
    let maxlev;

    /* which spell list to use? */
    if (adtyp == C.AD_SPEL) {
        list = C.mon_wizard_spells;
        len = C.mon_wizard_spells.length;
    } else if (adtyp == C.AD_CLRC) {
        list = C.mon_cleric_spells;
        len = C.mon_cleric_spells.length;
    }

    if (!list || len < 1)
        return C.MCAST_PSI_BOLT;

    /* max spell level in this monster spell list */
    maxlev = C.mcast_data[list[len - 1]].level;

    /* which level spell to cast? */
    spellval = C.rn2(mtmp.m_lev, 111, 'choose_monster_spell');
    if (spellval > maxlev && C.rn2(maxlev, 112, 'choose_monster_spell'))
        spellval = C.rn2(maxlev, 113, 'choose_monster_spell');

    /* find the highest spell in the list we could cast */
    for (i = len-1; i >= 0; i--)
        if (C.mcast_data[list[i]].level <= spellval
            && !spell_would_be_useless(mtmp, list[i]))
            return list[i];

    /* or return the first spell in the list */
    return list[0];
}

/* return values:
 * 1: successful spell
 * 0: unsuccessful spell
 */
export function castmu(mtmp, mattk, thinks_it_foundyou, foundyou)
/* caster */
/* caster's current attack */
/* might be mistaken if displaced */
/* knows hero's precise location */
{
    thinks_it_foundyou = C.boolean(thinks_it_foundyou);
    foundyou = C.boolean(foundyou);
    let dmg, ml = mtmp.m_lev;
    let ret;
    let spellnum = 0;

    /* Three cases:
     * -- monster is attacking you.  Search for a useful spell.
     * -- monster thinks it's attacking you.  Search for a useful spell,
     *    without checking for undirected.  If the spell found is directed,
     *    it fails with cursetxt() and loss of mspec_used.
     * -- monster isn't trying to attack.  Select a spell once.  Don't keep
     *    searching; if that spell is not useful (or if it's directed),
     *    return and do something else.
     * Since most spells are directed, this means that a monster that isn't
     * attacking casts spells only a small portion of the time that an
     * attacking monster does.
     */
    if ((mattk.adtyp == C.AD_SPEL || mattk.adtyp == C.AD_CLRC) && ml) {
        let cnt = 40;

        do {
            spellnum = choose_monster_spell(mtmp, mattk.adtyp);
            /* not trying to attack?  don't allow directed spells */
            if (!thinks_it_foundyou) {
                if (!is_undirected_spell(spellnum)
                    || spell_would_be_useless(mtmp, spellnum)) {
                    if (foundyou)
                        C.impossible(
                       "spellcasting monster found you and doesn't know it?");
                    return C.M_ATTK_MISS;
                }
                break;
            }
        } while (--cnt > 0
                 && spell_would_be_useless(mtmp, spellnum));
        if (cnt == 0)
            return C.M_ATTK_MISS;
    }

    /* monster unable to cast spells? */
    if (mtmp.mcan || mtmp.mspec_used || !ml
        || C.m_seenres(mtmp, C.cvt_adtyp_to_mseenres(mattk.adtyp))) {
        cursetxt(mtmp, is_undirected_spell(spellnum));
        return C.M_ATTK_MISS;
    }

    if (C.debugcore("mcastu.c", 1)) {
        let save_plnmsg = C.iflags.last_msg;
        C.pline("castmu:%s,lvl:%i,spell:%i", C.noit_Monnam(mtmp), ml, spellnum);
        C.iflags.last_msg = save_plnmsg;
    }

    if (mattk.adtyp == C.AD_SPEL || mattk.adtyp == C.AD_CLRC) {
        /* monst->m_lev is unsigned (uchar), monst->mspec_used is int */
        mtmp.mspec_used = C.int((mtmp.m_lev < 8) ? (10 - mtmp.m_lev) : 2);
    }

    /* Monster can cast spells, but is casting a directed spell at the
     * wrong place?  If so, give a message, and return.
     * Do this *after* penalizing mspec_used.
     *
     * FIXME?
     *  Shouldn't wall of lava have a case similar to wall of water?
     *  And should cold damage hit water or lava instead of missing
     *  even when the caster has targeted the wrong spot?  Likewise
     *  for fire mis-aimed at ice.
     */
    if (!foundyou && thinks_it_foundyou
        && !is_undirected_spell(spellnum)) {
        C.pline_mon(mtmp, "%s casts a spell at %s!",
                 C.canseemon(mtmp) ? C.Monnam(mtmp) : "Something",
                 C.is_waterwall(mtmp.mux, mtmp.muy) ? "empty water"
                                                    : "thin air");
        return C.M_ATTK_MISS;
    }

    C.nomul(0);
    if (C.rn2(ml * 10, 208, 'castmu') < (mtmp.mconf ? 100 : 20)) { /* fumbled attack */
        /* Soundeffect(se_air_crackles, 60); -- inactive configured macro */
        if (C.canseemon(mtmp) && !C.Deaf) {
            C.set_msg_xy(mtmp.mx, mtmp.my);
            C.pline_The("air crackles around %s.", C.mon_nam(mtmp));
        }
        return C.M_ATTK_MISS;
    }
    if (C.canspotmon(mtmp) || !is_undirected_spell(spellnum)) {
        C.pline_mon(mtmp, "%s casts a spell%s!",
                 C.canspotmon(mtmp) ? C.Monnam(mtmp) : "Something",
                 is_undirected_spell(spellnum) ? ""
                 : (C.Invis && !C.perceives(mtmp.data)
                    && !C.u_at(mtmp.mux, mtmp.muy))
                   ? " at a spot near you"
                   : (C.Displaced && !C.u_at(mtmp.mux, mtmp.muy))
                     ? " at your displaced image"
                     : " at you");
    }

    /*
     * As these are spells, the damage is related to the level
     * of the monster casting the spell.
     */
    if (!foundyou) {
        dmg = 0;
        if (mattk.adtyp != C.AD_SPEL && mattk.adtyp != C.AD_CLRC) {
            C.impossible(
              "%s casting non-hand-to-hand version of hand-to-hand spell %d?",
                       C.Monnam(mtmp), mattk.adtyp);
            return C.M_ATTK_MISS;
        }
    } else if (mattk.damd)
        dmg = C.d(C.int(Math.trunc(ml / 2) + mattk.damn), C.int(mattk.damd), 241, 'castmu');
    else
        dmg = C.d(C.int(Math.trunc(ml / 2) + 1), 6, 243, 'castmu');
    if (C.Half_spell_damage)
        dmg = Math.trunc(C.int(dmg + 1) / 2);

    ret = C.M_ATTK_HIT;
    /*
     * FIXME: none of these hit the steed when hero is riding, nor do
     *  they inflict damage on carried items.
     */
    switch (mattk.adtyp) {
    case C.AD_FIRE:
        C.pline("You're enveloped in flames.");
        if (C.Fire_resistance) {
            C.shieldeff(C.u.ux, C.u.uy);
            C.pline("But you resist the effects.");
            C.monstseesu(C.M_SEEN_FIRE);
            dmg = 0;
        } else {
            C.monstunseesu(C.M_SEEN_FIRE);
        }
        C.burn_away_slime();
        /* burn up flammable items on the floor, melt ice terrain */
        C.mon_spell_hits_spot(mtmp, C.AD_FIRE, C.u.ux, C.u.uy);
        break;
    case C.AD_COLD:
        C.pline("You're covered in frost.");
        if (C.Cold_resistance) {
            C.shieldeff(C.u.ux, C.u.uy);
            C.pline("But you resist the effects.");
            C.monstseesu(C.M_SEEN_COLD);
            dmg = 0;
        } else {
            C.monstunseesu(C.M_SEEN_COLD);
        }
        /* freeze water or lava terrain */
        /* FIXME: mon_spell_hits_spot() uses zap_over_floor(); unlike with
         * fire, it does not target susceptible floor items with cold */
        C.mon_spell_hits_spot(mtmp, C.AD_COLD, C.u.ux, C.u.uy);
        break;
    case C.AD_MAGM:
        C.You("are hit by a shower of missiles!");
        if (C.Antimagic) {
            C.shieldeff(C.u.ux, C.u.uy);
            C.pline_The("missiles bounce off!");
            C.monstseesu(C.M_SEEN_MAGR);
            dmg = 0;
        } else {
            dmg = C.d(Math.trunc(C.int(mtmp.m_lev) / 2) + 1, 6, 290, 'castmu');
            C.monstunseesu(C.M_SEEN_MAGR);
        }
        /* shower of magic missiles scuffs an engraving */
        C.mon_spell_hits_spot(mtmp, C.AD_MAGM, C.u.ux, C.u.uy);
        break;
    case C.AD_SPEL: /* wizard spell */
    case C.AD_CLRC: /* clerical spell */
        mcast_spell(mtmp, dmg, spellnum);
        dmg = 0; /* done by the spell casting functions */
        break;
    } /* switch */
    if (dmg)
        C.mdamageu(mtmp, dmg);
    return ret;
}

export function m_cure_self(mtmp, dmg)
{
    dmg = C.int(dmg);
    if (mtmp.mhp < mtmp.mhpmax) {
        if (C.canseemon(mtmp))
            C.pline_mon(mtmp, "%s looks better.", C.Monnam(mtmp));
        /* note: player healing does 6d4; this used to do 1d8 */
        C.healmon(mtmp, C.d(3, 6, 314, 'm_cure_self'), 0);
        dmg = 0;
    }
    return dmg;
}

/* unlike the finger of death spell which behaves like a wand of death,
   this monster spell only attacks the hero */
export function touch_of_death(mtmp)
{
    let kbuf = C.stackAlloc(C.BUFSZ);
    let dmg = 50 + C.d(8, 6, 326, 'touch_of_death');
    let drain = Math.trunc(dmg / 2);

    /* if we get here, we know that hero isn't magic resistant and isn't
       poly'd into an undead or demon */
    C.You_feel("drained...");
    death_inflicted_by(kbuf, "the touch of death", mtmp);

    if (C.Upolyd) {
        C.u.mh = 0;
        C.rehumanize(); /* fatal iff Unchanging */
    } else if (drain >= C.u.uhpmax) {
        C.svk.killer.format = C.KILLED_BY;
        C.Strcpy(C.svk.killer.name, kbuf);
        C.done(C.DIED);
    } else {
        /* HP manipulation similar to poisoned(attrib.c) */
        let olduhp = C.u.uhp,
            uhpmin = C.minuhpmax(3),
            newuhpmax = C.u.uhpmax - drain;

        C.setuhpmax(C.max(newuhpmax, uhpmin), 0);
        dmg = C.adjuhploss(dmg, olduhp); /* reduce pending damage if uhp has
                                        * already been reduced due to drop
                                        * in uhpmax */
        C.losehp(dmg, kbuf, C.KILLED_BY);
    }
    C.storeChar(C.svk.killer.name, 0); /* not killed if we get here... */
}

/* give a reason for death by some monster spells */
export function death_inflicted_by(outbuf, deathreason, mtmp)
/* assumed big enough; pm_names are short */
/* cause of death */
/* monster who caused it */
{
    C.Strcpy(outbuf, deathreason);
    if (mtmp) {
        let mptr = mtmp.data, champtr = (C.ismnum(mtmp.cham)) ? C.mons[mtmp.cham] : mptr;
        let realnm = C.pmname(champtr, C.Mgender(mtmp)), fakenm = C.pmname(mptr, C.Mgender(mtmp));

        /* greatly simplified extract from done_in_by(), primarily for
           reason for death due to 'touch of death' spell; if mtmp is
           shape changed, it won't be a vampshifter or mimic since they
           can't cast spells */
        if (!C.type_is_pname(champtr) && !C.the_unique_pm(mptr))
            realnm = C.an(realnm);
        C.Sprintf(C.eos(outbuf), " inflicted by %s%s",
                C.the_unique_pm(mptr) ? "the " : "", realnm);
        if (!C.samePtr(champtr, mptr))
            C.Sprintf(C.eos(outbuf), " imitating %s", C.an(fakenm));
    }
    return outbuf;
}

/*
 * Monster wizard and cleric spellcasting functions.
 */

export function mcast_death_touch(mtmp)
{
    C.pline("Oh no, %s's using the touch of death!", C.mhe(mtmp));
    if (C.nonliving(C.gy.youmonst.data) || C.is_demon(C.gy.youmonst.data)) {
        C.You("seem no deader than before.");
    } else if (!C.Antimagic && C.rn2(mtmp.m_lev, 394, 'mcast_death_touch') > 12) {
        if (C.Hallucination) {
            C.You("have an out of body experience.");
        } else {
            C.callLocal(touch_of_death, mtmp);
        }
        C.monstunseesu(C.M_SEEN_MAGR);
    } else {
        if (C.Antimagic) {
            C.shieldeff(C.u.ux, C.u.uy);
            C.monstseesu(C.M_SEEN_MAGR);
        }
        C.pline("Lucky for you, it didn't work!");
    }
}

export function mcast_clone_wiz(mtmp)
{
    if (mtmp.iswiz && C.svc.context.no_of_wizards == 1) {
        C.pline("Double Trouble...");
        C.clonewiz();
    } else
        C.impossible("bad wizard cloning?");
}

export function mcast_summon_mons(mtmp)
{
    let count = C.nasty(mtmp);

    if (!count) {
        ; /* nothing was created? */
    } else if (mtmp.iswiz) {
        /* SetVoice(mtmp, 0, 80, 0); -- inactive configured macro */
        C.verbalize("Destroy the thief, my pet%s!", C.plur(count));
    } else {
        let one = (count == 1);
        let mappear = one ? "A monster appears"
                                  : "Monsters appear";

        /* messages not quite right if plural monsters created but
           only a single monster is seen */
        if (C.Invis && !C.perceives(mtmp.data)
            && (mtmp.mux != C.u.ux || mtmp.muy != C.u.uy))
            C.pline("%s %s a spot near you!", mappear,
                  one ? "at" : "around");
        else if (C.Displaced && (mtmp.mux != C.u.ux || mtmp.muy != C.u.uy))
            C.pline("%s %s your displaced image!", mappear,
                  one ? "by" : "around");
        else
            C.pline("%s from nowhere!", mappear);
    }
}

export function mcast_destroy_armor()
{
    if (C.Antimagic) {
        C.shieldeff(C.u.ux, C.u.uy);
        C.monstseesu(C.M_SEEN_MAGR);
        C.pline("A field of force surrounds you!");
    } else if (!C.destroy_arm()) {
        C.Your("skin itches.");
    } else {
        /* monsters only realize you aren't magic-protected if armor is
           actually destroyed */
        C.monstunseesu(C.M_SEEN_MAGR);
    }
}

export function mcast_weaken_you(mtmp, dmg)
{
    dmg = C.int(dmg);
    if (C.Antimagic) {
        C.shieldeff(C.u.ux, C.u.uy);
        C.monstseesu(C.M_SEEN_MAGR);
        C.You_feel("momentarily weakened.");
    } else {
        let kbuf = C.stackAlloc(C.BUFSZ);

        C.You("suddenly feel weaker!");
        dmg = mtmp.m_lev - 6;
        if (dmg < 1) /* paranoia since only chosen when m_lev is high */
            dmg = 1;
        if (C.Half_spell_damage)
            dmg = Math.trunc(C.int(dmg + 1) / 2);
        C.losestr(C.rnd(dmg, 481, 'mcast_weaken_you'),
                death_inflicted_by(kbuf, "strength loss", mtmp),
                C.KILLED_BY);
        C.storeChar(C.svk.killer.name, 0); /* not killed if we get here... */
        C.monstunseesu(C.M_SEEN_MAGR);
    }
}

export function mcast_disappear(mtmp)
{
    if (!mtmp.minvis && !mtmp.invis_blkd) {
        if (C.canseemon(mtmp))
            C.pline_mon(mtmp, "%s suddenly %s!", C.Monnam(mtmp),
                      !C.See_invisible ? "disappears" : "becomes transparent");
        C.mon_set_minvis(mtmp, 0);
        if (C.cansee(mtmp.mx, mtmp.my) && !C.canspotmon(mtmp))
            C.map_invisible(mtmp.mx, mtmp.my);
    } else
        C.impossible("no reason for monster to cast disappear spell?");
}

export function mcast_stun_you(dmg)
{
    dmg = C.int(dmg);
    if (C.Antimagic || C.Free_action) {
        C.shieldeff(C.u.ux, C.u.uy);
        C.monstseesu(C.M_SEEN_MAGR);
        if (!C.Stunned)
            C.You_feel("momentarily disoriented.");
        C.make_stunned(1n, 0);
    } else {
        C.You(C.Stunned ? "struggle to keep your balance." : "reel...");
        dmg = C.d(C.ACURR(C.A_DEX) < 12 ? 6 : 4, 4, 514, 'mcast_stun_you');
        if (C.Half_spell_damage)
            dmg = Math.trunc(C.int(dmg + 1) / 2);
        C.make_stunned(C.long((C.HStun & C.TIMEOUT) + C.long(dmg)), 0);
        C.monstunseesu(C.M_SEEN_MAGR);
    }
}

export function mcast_geyser(dmg)
{
    dmg = C.int(dmg);
    /* this is physical damage (force not heat),
     * not magical damage or fire damage
     */
    C.pline("A sudden geyser slams into you from nowhere!");
    dmg = C.d(8, 6, 529, 'mcast_geyser');
    if (C.Half_physical_damage)
        dmg = Math.trunc(C.int(dmg + 1) / 2);
/* since inventory items aren't affected, don't include this */
/* make floor items wet */
    return dmg;
}

export function mcast_fire_pillar(mtmp, dmg)
{
    dmg = C.int(dmg);
    let orig_dmg;

    C.pline("A pillar of fire strikes all around you!");
    orig_dmg = dmg = C.d(8, 6, 545, 'mcast_fire_pillar');
    if (C.Fire_resistance) {
        C.shieldeff(C.u.ux, C.u.uy);
        C.monstseesu(C.M_SEEN_FIRE);
        dmg = 0;
    } else {
        C.monstunseesu(C.M_SEEN_FIRE);
    }
    if (C.Half_spell_damage)
        dmg = Math.trunc(C.int(dmg + 1) / 2);
    C.burn_away_slime();
    C.burnarmor(C.gy.youmonst);
    /* item destruction dmg */
    C.destroy_items(C.gy.youmonst, C.AD_FIRE, orig_dmg);
    C.ignite_items(C.gi.invent);
    /* burn up flammable items on the floor, melt ice terrain */
    C.mon_spell_hits_spot(mtmp, C.AD_FIRE, C.u.ux, C.u.uy);
    return dmg;
}

export function mcast_lightning(mtmp, dmg)
{
    dmg = C.int(dmg);
    let orig_dmg;
    let reflects;

    /* Soundeffect(se_bolt_of_lightning, 80); -- inactive configured macro */
    C.pline("A bolt of lightning strikes down at you from above!");
    reflects = C.ureflects("It bounces off your %s%s.", "");
    orig_dmg = dmg = C.d(8, 6, 574, 'mcast_lightning');
    if (reflects || C.Shock_resistance) {
        C.shieldeff(C.u.ux, C.u.uy);
        dmg = 0;
        if (reflects) {
            C.monstseesu(C.M_SEEN_REFL);
            return dmg;
        }
        C.monstunseesu(C.M_SEEN_REFL);
        C.monstseesu(C.M_SEEN_ELEC);
    } else {
        C.monstunseesu(C.M_SEEN_ELEC | C.M_SEEN_REFL);
    }
    if (C.Half_spell_damage)
        dmg = Math.trunc(C.int(dmg + 1) / 2);
    C.destroy_items(C.gy.youmonst, C.AD_ELEC, orig_dmg);
    /* lightning might destroy iron bars if hero is on such a spot;
       reflection protects terrain here [execution won't get here due
       to 'if (reflects) break' above] but hero resistance doesn't;
       do this before maybe blinding the hero via flashburn() */
    C.mon_spell_hits_spot(mtmp, C.AD_ELEC, C.u.ux, C.u.uy);
    /* blind hero; no effect if already blind */
    C.flashburn(C.long(C.rnd(100, 596, 'mcast_lightning')), 1);
    return dmg;
}

export function mcast_psi_bolt(dmg)
{
    dmg = C.int(dmg);
    /* prior to 3.4.0 Antimagic was setting the damage to 1--this
       made the spell virtually harmless to players with magic res. */
    if (C.Antimagic) {
        C.shieldeff(C.u.ux, C.u.uy);
        C.monstseesu(C.M_SEEN_MAGR);
        dmg = Math.trunc(C.int(dmg + 1) / 2);
    } else {
        C.monstunseesu(C.M_SEEN_MAGR);
    }
    if (dmg <= 5)
        C.You("get a slight %sache.", C.body_part(C.HEAD));
    else if (dmg <= 10)
        C.Your("brain is on fire!");
    else if (dmg <= 20)
        C.Your("%s suddenly aches painfully!", C.body_part(C.HEAD));
    else
        C.Your("%s suddenly aches very painfully!", C.body_part(C.HEAD));
    return dmg;
}

export function mcast_open_wounds(dmg)
{
    dmg = C.int(dmg);
    if (C.Antimagic) {
        C.shieldeff(C.u.ux, C.u.uy);
        C.monstseesu(C.M_SEEN_MAGR);
        dmg = Math.trunc(C.int(dmg + 1) / 2);
    } else {
        C.monstunseesu(C.M_SEEN_MAGR);
    }
    if (dmg <= 5)
        C.Your("skin itches badly for a moment.");
    else if (dmg <= 10)
        C.pline("Wounds appear on your body!");
    else if (dmg <= 20)
        C.pline("Severe wounds appear on your body!");
    else
        C.Your("body is covered with painful wounds!");
    return dmg;
}

export function mcast_insects(mtmp)
{
    /* Try for insects, and if there are none
       left, go for (sticks to) snakes.  -3. */
    let pm = C.mkclass(C.S_ANT, 0);
    let mtmp2 = 0;
    let whatbuf = C.stackAlloc(C.QBUFSZ), let_ = (pm ? C.S_ANT : C.S_SNAKE);
    let success = 0, seecaster;
    let i, quan, oldseen, newseen;
    let bypos = C.coordLocal();
    let fmt, what;

    oldseen = C.monster_census(1);
    quan = (mtmp.m_lev < 2) ? 1 : C.rnd(Math.trunc(C.int(mtmp.m_lev) / 2), 658, 'mcast_insects');
    if (quan < 3)
        quan = 3;
    for (i = 0; i <= quan; i++) {
        if (!C.enexto(bypos, mtmp.mux, mtmp.muy, mtmp.data))
            return;
        if ((pm = C.mkclass(let_, 0)) != 0
            && (mtmp2 = C.makemon(pm, bypos.x, bypos.y, C.MM_ANGRY | C.MM_NOMSG))
            != 0) {
            success = 1;
            mtmp2.msleeping = mtmp2.mpeaceful = mtmp2.mtame = 0;
            C.set_malign(mtmp2);
        }
    }
    newseen = C.monster_census(1);

    /* not canspotmon() which includes unseen things sensed via warning */
    seecaster = C.canseemon(mtmp) || C.tp_sensemon(mtmp) || C.Detect_monsters;
    what = C.literal((let_ == C.S_SNAKE) ? "snakes" : "insects");
    if (C.Hallucination)
        what = C.makeplural(C.bogusmon(whatbuf, 0));

    fmt = 0;
    if (!seecaster) {
        if (newseen <= oldseen || C.Unaware) {
            /* unseen caster fails or summons unseen critters,
               or unconscious hero ("You dream that you hear...") */
            C.You_hear("someone summoning %s.", what);
        } else {
            let arg;

            if (what != whatbuf)
                what = C.strcpy(whatbuf, what);
            /* unseen caster summoned seen critter(s) */
            arg = (newseen == oldseen + 1) ? C.an(C.makesingular(what))
                                           : whatbuf;
            if (!C.Deaf) {
                /* Soundeffect(se_someone_summoning, 100); -- inactive configured macro */
                C.You_hear("someone summoning something, and %s %s.", arg,
                         C.vtense(arg, "appear"));
            } else {
                C.pline("%s %s.", C.upstart(arg), C.vtense(arg, "appear"));
            }
        }

        /* seen caster, possibly producing unseen--or just one--critters;
           hero is told what the caster is doing and doesn't necessarily
           observe complete accuracy of that caster's results (in other
           words, no need to fuss with visibility or singularization;
           player is told what's happening even if hero is unconscious) */
    } else if (!success) {
        fmt = "%s casts at a clump of sticks, but nothing happens.%s";
        what = C.literal("");
    } else if (let_ == C.S_SNAKE) {
        fmt = "%s transforms a clump of sticks into %s!";
    } else if (C.Invis && !C.perceives(mtmp.data)
               && (mtmp.mux != C.u.ux || mtmp.muy != C.u.uy)) {
        fmt = "%s summons %s around a spot near you!";
    } else if (C.Displaced && (mtmp.mux != C.u.ux || mtmp.muy != C.u.uy)) {
        fmt = "%s summons %s around your displaced image!";
    } else {
        fmt = "%s summons %s!";
    }
    if (fmt) {
        
        C.pline_mon(mtmp, fmt, C.Monnam(mtmp), what);
        
    }
}

export function mcast_blind_you()
{
    /* note: resists_blnd() doesn't apply here */
    if (!C.Blinded) {
        let num_eyes = C.eyecount(C.gy.youmonst.data);

        C.pline("Scales cover your %s!", (num_eyes == 1)
                                       ? C.body_part(C.EYE)
                                       : C.makeplural(C.body_part(C.EYE)));
        C.make_blinded(C.Half_spell_damage ? 100n : 200n, 0);
        if (!C.Blind)
            C.Your1(C.vision_clears);
    } else
        C.impossible("no reason for monster to cast blindness spell?");
}

export function mcast_paralyze(mtmp)
{
    let dmg = 0;

    if (C.Antimagic || C.Free_action) {
        C.shieldeff(C.u.ux, C.u.uy);
        C.monstseesu(C.M_SEEN_MAGR);
        if (C.gm.multi >= 0)
            C.You("stiffen briefly.");
        dmg = 1; /* to produce nomul(-1), not actual damage */
    } else {
        if (C.gm.multi >= 0)
            C.You("are frozen in place!");
        dmg = 4 + C.int(mtmp.m_lev);
        if (C.Half_spell_damage)
            dmg = Math.trunc(C.int(dmg + 1) / 2);
        C.monstunseesu(C.M_SEEN_MAGR);
    }
    C.nomul(-dmg);
    C.gm.multi_reason = "paralyzed by a monster";
    C.gn.nomovemsg = 0;
    return dmg;
}

export function mcast_confuse_you(mtmp)
{
    if (C.Antimagic) {
        C.shieldeff(C.u.ux, C.u.uy);
        C.monstseesu(C.M_SEEN_MAGR);
        C.You_feel("momentarily dizzy.");
    } else {
        let oldprop = !!C.Confusion;
        let dmg = C.int(mtmp.m_lev);

        if (C.Half_spell_damage)
            dmg = Math.trunc(C.int(dmg + 1) / 2);
        C.make_confused(C.long(C.HConfusion + C.long(dmg)), 1);
        if (C.Hallucination)
            C.You_feel("%s!", oldprop ? "trippier" : "trippy");
        else
            C.You_feel("%sconfused!", oldprop ? "more " : "");
        C.monstunseesu(C.M_SEEN_MAGR);
    }
}

/*
   If dmg is zero, then the monster is not casting at you.
   If the monster is intentionally not casting at you, we have previously
   called spell_would_be_useless() and spellnum should always be a valid
   undirected spell.
   If you modify either of these, be sure to change is_undirected_spell()
   and spell_would_be_useless().
 */
export function mcast_spell(mtmp, dmg, spellnum)
{
    dmg = C.int(dmg);
    spellnum = C.int(spellnum);
    if (dmg < 0) {
        C.impossible("monster cast spell (%d) with negative dmg (%d)?",
                   spellnum, dmg);
        return;
    }
    if (dmg == 0 && !is_undirected_spell(spellnum)) {
        C.impossible("cast directed wizard spell (%d) with dmg=0?", spellnum);
        return;
    }

    switch (spellnum) {
    case C.MCAST_DEATH_TOUCH:
        mcast_death_touch(mtmp);
        dmg = 0;
        break;
    case C.MCAST_CLONE_WIZ:
        mcast_clone_wiz(mtmp);
        dmg = 0;
        break;
    case C.MCAST_SUMMON_MONS:
        mcast_summon_mons(mtmp);
        dmg = 0;
        break;
    case C.MCAST_AGGRAVATION:
        C.You_feel("that monsters are aware of your presence.");
        C.aggravate();
        dmg = 0;
        break;
    case C.MCAST_CURSE_ITEMS:
        C.You_feel("as if you need some help.");
        C.rndcurse();
        dmg = 0;
        break;
    case C.MCAST_DESTRY_ARMR:
        mcast_destroy_armor();
        dmg = 0;
        break;
    case C.MCAST_WEAKEN_YOU: /* drain strength */
        C.callLocal(mcast_weaken_you, mtmp, dmg);
        dmg = 0;
        break;
    case C.MCAST_DISAPPEAR: /* makes self invisible */
        mcast_disappear(mtmp);
        dmg = 0;
        break;
    case C.MCAST_STUN_YOU:
        mcast_stun_you(dmg);
        dmg = 0;
        break;
    case C.MCAST_HASTE_SELF:
        C.mon_adjust_speed(mtmp, 1, 0);
        dmg = 0;
        break;
    case C.MCAST_CURE_SELF:
        dmg = m_cure_self(mtmp, dmg);
        break;
    case C.MCAST_PSI_BOLT:
        dmg = mcast_psi_bolt(dmg);
        break;
    case C.MCAST_GEYSER:
        dmg = mcast_geyser(dmg);
        break;
    case C.MCAST_FIRE_PILLAR:
        dmg = mcast_fire_pillar(mtmp, dmg);
        break;
    case C.MCAST_LIGHTNING:
        dmg = mcast_lightning(mtmp, dmg);
        break;
    case C.MCAST_INSECTS:
        C.callLocal(mcast_insects, mtmp);
        dmg = 0;
        break;
    case C.MCAST_BLIND_YOU:
        mcast_blind_you();
        dmg = 0;
        break;
    case C.MCAST_PARALYZE:
        dmg = mcast_paralyze(mtmp);
        break;
    case C.MCAST_CONFUSE_YOU:
        mcast_confuse_you(mtmp);
        dmg = 0;
        break;
    case C.MCAST_OPEN_WOUNDS:
        dmg = mcast_open_wounds(dmg);
        break;
    default:
        C.impossible("mcastu: invalid magic spell (%d)", spellnum);
        dmg = 0;
        break;
    }

    if (dmg)
        C.mdamageu(mtmp, dmg);
}

export function is_undirected_spell(spellnum)
{
    spellnum = C.int(spellnum);
    if ((C.mcast_data[spellnum].flags & C.MCF_INDIRECT) != 0)
        return 1;
    return 0;
}

/* Some spells are useless under some circumstances. */
export function spell_would_be_useless(mtmp, spellnum)
{
    spellnum = C.int(spellnum);
    /* Some spells don't require the player to really be there and can be cast
     * by the monster when you're invisible, yet still shouldn't be cast when
     * the monster doesn't even think you're there.
     * This check isn't quite right because it always uses your real position.
     * We really want something like "if the monster could see mux, muy".
     */

    /* spell is only cast by hostile monsters */
    if ((C.mcast_data[spellnum].flags & C.MCF_HOSTILE) != 0) {
        if (mtmp.mpeaceful)
            return 1;
    }

    /* spell needs the monster to see hero */
    if ((C.mcast_data[spellnum].flags & C.MCF_SIGHT) != 0) {
        let mcouldseeu = C.couldsee(mtmp.mx, mtmp.my);

        if (!mcouldseeu)
            return 1;
    }

    switch (spellnum) {
    case C.MCAST_DEATH_TOUCH:
        if ((C.Antimagic || C.Hallucination) && !C.rn2(2, 934, 'spell_would_be_useless'))
            return 1;
        break;
    case C.MCAST_GEYSER:
        if (!C.rn2(5, 938, 'spell_would_be_useless'))
            return 1;
        break;
    case C.MCAST_CLONE_WIZ:
        /* only the Wizard is allowed to clone himself */
        if (!mtmp.iswiz || C.svc.context.no_of_wizards > 1)
            return 1;
        break;
    case C.MCAST_AGGRAVATION:
        /* aggravation (global wakeup) when everyone is already active */
        /* if nothing needs to be awakened then this spell is useless
           but caster might not realize that [chance to pick it then
           must be very small otherwise caller's many retry attempts
           will eventually end up picking it too often] */
        if (!C.has_aggravatables(mtmp))
            return C.rn2(100, 953, 'spell_would_be_useless') ? 1 : 0;
        break;
    case C.MCAST_HASTE_SELF:
        /* haste self when already fast */
        if (mtmp.permspeed == C.MFAST)
            return 1;
        break;
    case C.MCAST_DISAPPEAR:
        /* invisibility when already invisible */
        if (mtmp.minvis || mtmp.invis_blkd)
            return 1;
        /* peaceful monster won't cast invisibility if you can't see
           invisible,
           same as when monsters drink potions of invisibility.  This doesn't
           really make a lot of sense, but lets the player avoid hitting
           peaceful monsters by mistake */
        if (mtmp.mpeaceful && !C.See_invisible)
            return 1;
        break;
    case C.MCAST_CURE_SELF:
        /* healing when already healed */
        if (mtmp.mhp == mtmp.mhpmax)
            return 1;
        break;
    case C.MCAST_BLIND_YOU:
        if (C.Blinded)
            return 1;
        break;
    default:
        break;
    }
    return 0;
}

/* monster uses spell (ranged) */
export function buzzmu(mtmp, mattk)
{
    /* don't print constant stream of curse messages for 'normal'
       spellcasting monsters at range */
    if (!C.BZ_VALID_ADTYP(mattk.adtyp))
        return C.M_ATTK_MISS;

    if (mtmp.mcan || C.m_seenres(mtmp, C.cvt_adtyp_to_mseenres(mattk.adtyp))) {
        cursetxt(mtmp, 0);
        return C.M_ATTK_MISS;
    }
    if (C.lined_up(mtmp) && C.rn2(3, 1000, 'buzzmu')) {
        C.nomul(0);
        if (C.canseemon(mtmp))
            C.pline_mon(mtmp, "%s zaps you with a %s!", C.Monnam(mtmp),
                  C.flash_str(C.BZ_OFS_AD(mattk.adtyp), 0));
        C.gb.buzzer = mtmp;
        C.buzz(C.BZ_M_SPELL(C.BZ_OFS_AD(mattk.adtyp)), C.int(mattk.damn),
             mtmp.mx, mtmp.my, C.sgn(C.gt.tbx), C.sgn(C.gt.tby));
        C.gb.buzzer = 0;
        return C.M_ATTK_HIT;
    }
    return C.M_ATTK_MISS;
}

/*mcastu.c*/

