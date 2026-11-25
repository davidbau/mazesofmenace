// mcastu.js — monster spellcasting: castmu(), buzzmu() and the wizard and
// cleric spells they cast.
// C ref: mcastu.c.  Every function here is a faithful port; paths that
// would need large unported code (rehumanize(),
// msummon() for summoners in Gehennom) throw a 'not ported yet' stop.

import { rehumanize } from './polyself.js';
import { is_obj_mappear } from './pager.js';
import { game } from './gstate.js';
import { rn2, rnd, d } from './rng.js';
import { couldsee, cansee } from './vision.js';
import {
    pline, You, Your, pline_The, You_feel, Norep, canseemon, canspotmon,
    tp_sensemon, map_invisible
} from './display.js';
import { You_hear } from './sounds.js';
import { nomul } from './hack.js';
import { Monnam, mon_nam, pmname, bogusmon, pronoun_gender,
         PRONOUN_HALLU } from './do_name.js';
import { an, makeplural, makesingular, vtense, the_unique_pm } from './objnam.js';
import { perceives, is_demon, haseyes,
         cvt_adtyp_to_mseenres } from './mondata.js';
import { m_seenres } from './muse.js';
import { monstseesu, monstunseesu } from './uhitm.js';
import { mdamageu, mhe } from './mhitu.js';
import { healmon } from './mon.js';
import { mon_adjust_speed, mon_set_minvis } from './worn.js';
import { aggravate, make_stunned, make_confused, make_blinded,
         burn_away_slime } from './potion.js';
import { destroy_arm } from './do_wear.js';
import { losestr, ACURR, minuhpmax, setuhpmax, adjuhploss } from './attrib.js';
import { losehp } from './trap.js';
import { done } from './end.js';
import { killer } from './topten.js';
import { flashburn, buzz, flash_str, mon_spell_hits_spot } from './zap.js';
import { lined_up } from './monmove.js';
import { mkclass, makemon, set_malign, nonliving } from './makemon.js';
import { enexto } from './teleport.js';
import { body_part } from './insight.js';
import { genders } from './role.js';
import { rndcurse } from './sit.js';
import { nasty, clonewiz, has_aggravatables } from './wizard.js';
import { monster_census } from './minion.js';
import * as M from './monsters.js';
import { mons, AD_SPEL, AD_CLRC, AD_FIRE, AD_COLD, AD_MAGM, AD_SPC2, AD_ELEC,
         S_ANT, S_SNAKE } from './monsters.js';
import { M_ATTK_MISS, M_ATTK_HIT, M_SEEN_MAGR, M_SEEN_FIRE, M_SEEN_COLD,
         M_SEEN_ELEC, M_SEEN_REFL, MCF_INDIRECT, MCF_SIGHT, MCF_HOSTILE,
         MFAST, MM_ANGRY, MM_NOMSG, M_AP_OBJECT, WATER, TIMEOUT, KILLED_BY,
         DIED, HEAD, EYE, A_DEX, ANTIMAGIC, HALF_SPDAM, HALF_PHDAM,
         FREE_ACTION, FIRE_RES, COLD_RES, SHOCK_RES, STUNNED, CONFUSION, BLINDED,
         INVIS, DISPLACED, SEE_INVIS, DEAF, DETECT_MONSTERS,
         REFLECTING, W_ARMS, W_WEP, W_AMUL, W_ARM } from './const.js';
import { STRANGE_OBJECT, SHIELD_OF_REFLECTION,
         AMULET_OF_REFLECTION } from './objects.js';
import { discover_object } from './o_init.js';
import {
    Antimagic, Half_spell_damage, Half_physical_damage, Free_action, Fire_resistance,
    Cold_resistance, Shock_resistance, HStun, Stunned, HConfusion, Confusion, Blinded, Invis,
    Displaced, See_invisible, Deaf, Detect_monsters, Unaware, Blind, Hallucination
} from './youprop.js';
import { Upolyd, u_at } from './const.js';
import { uprop } from './youprop.js';
import { burnarmor, ignite_items } from './trap.js';
import { destroy_items } from './zap.js';

/* C ref: mcastu.h MONSPELL() list -- enum mcast_spells */
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

/* C ref: mcastu.c mcast_data[] (mcastu.h MCASTU_INIT) */
const mcast_data = [
    { level: 0, flags: MCF_HOSTILE | MCF_SIGHT },                 /* PSI_BOLT */
    { level: 0, flags: MCF_HOSTILE | MCF_SIGHT },                 /* OPEN_WOUNDS */
    { level: 1, flags: MCF_INDIRECT },                            /* CURE_SELF */
    { level: 2, flags: MCF_INDIRECT },                            /* HASTE_SELF */
    { level: 2, flags: MCF_HOSTILE | MCF_SIGHT },                 /* CONFUSE_YOU */
    { level: 3, flags: MCF_HOSTILE | MCF_SIGHT },                 /* STUN_YOU */
    { level: 4, flags: MCF_INDIRECT },                            /* DISAPPEAR */
    { level: 4, flags: MCF_HOSTILE | MCF_SIGHT },                 /* PARALYZE */
    { level: 6, flags: MCF_HOSTILE | MCF_SIGHT },                 /* BLIND_YOU */
    { level: 6, flags: MCF_HOSTILE | MCF_SIGHT },                 /* WEAKEN_YOU */
    { level: 8, flags: MCF_HOSTILE | MCF_SIGHT },                 /* DESTRY_ARMR */
    { level: 8, flags: MCF_HOSTILE | MCF_INDIRECT | MCF_SIGHT },  /* INSECTS */
    { level: 10, flags: MCF_HOSTILE | MCF_SIGHT },                /* CURSE_ITEMS */
    { level: 11, flags: MCF_HOSTILE | MCF_SIGHT },                /* LIGHTNING */
    { level: 12, flags: MCF_HOSTILE | MCF_SIGHT },                /* FIRE_PILLAR */
    { level: 13, flags: MCF_HOSTILE | MCF_SIGHT },                /* GEYSER */
    { level: 13, flags: MCF_INDIRECT | MCF_HOSTILE | MCF_SIGHT }, /* AGGRAVATION */
    { level: 15, flags: MCF_HOSTILE | MCF_INDIRECT | MCF_SIGHT }, /* SUMMON_MONS */
    { level: 18, flags: MCF_HOSTILE | MCF_INDIRECT | MCF_SIGHT }, /* CLONE_WIZ */
    { level: 20, flags: MCF_HOSTILE | MCF_SIGHT },                /* DEATH_TOUCH */
];

/* spell lists for specific monster casters */
/* the spells in the list should be in ascending level order */
const mon_cleric_spells = [
    MCAST_OPEN_WOUNDS, MCAST_CURE_SELF, MCAST_CONFUSE_YOU, MCAST_PARALYZE,
    MCAST_BLIND_YOU, MCAST_INSECTS, MCAST_CURSE_ITEMS, MCAST_LIGHTNING,
    MCAST_FIRE_PILLAR, MCAST_GEYSER,
];
const mon_wizard_spells = [
    MCAST_PSI_BOLT, MCAST_CURE_SELF, MCAST_HASTE_SELF, MCAST_STUN_YOU,
    MCAST_DISAPPEAR, MCAST_WEAKEN_YOU, MCAST_DESTRY_ARMR, MCAST_CURSE_ITEMS,
    MCAST_AGGRAVATION, MCAST_SUMMON_MONS, MCAST_CLONE_WIZ, MCAST_DEATH_TOUCH,
];

/* C ref: hack.c unconscious() */
function unconscious() {
    if (game.multi >= 0)
        return false;
    return !!(game.u.usleep
              || (game.nomovemsg
                  && (game.nomovemsg.startsWith("You awake")
                      || game.nomovemsg.startsWith("You regain con")
                      || game.nomovemsg.startsWith("You are consci"))));
}
/* C ref: eat.c is_fainted() */
function is_fainted() { return game.u.uhs === 5; /* FAINTED */ }
/* C ref: rm.h IS_WATERWALL(), is_waterwall() */
function is_waterwall(x, y) { return game.level.at(x, y).typ === WATER; }
/* C ref: mondata.h eyecount() */
function eyecount(ptr) {
    return !haseyes(ptr) ? 0
           : (ptr === mons[M.PM_CYCLOPS] || ptr === mons[M.PM_FLOATING_EYE]) ? 1
             : 2;
}
/* C ref: mondata.h type_is_pname() */
function type_is_pname(ptr) { return (ptr.mflags2 & M.M2_PNAME) !== 0; }
/* C ref: hacklib.c plur() */
function plur(x) { return (x === 1) ? "" : "s"; }
/* C ref: hacklib.c upstart() */
function upstart(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
/* C ref: hack.h sgn() */
function sgn(x) { return x > 0 ? 1 : x < 0 ? -1 : 0; }
/* C ref: pline.c verbalize() -- SetVoice() only matters for speech
   output, which the tty doesn't do */
async function verbalize(line) {
    if (Deaf())
        return; /* vpline(): PLINE_VERBALIZE is dropped when Deaf */
    await pline(`"${line}"`);
}
/* C ref: hack.h makeknown() */
function makeknown(otyp) { discover_object(otyp, true, true, true); }
/* C ref: potion.c vision_clears[] */
const vision_clears = "vision quickly clears.";

// C ref: muse.c ureflects()
/* Check from outermost to innermost objects; fmt has two %s: str and
   the reflecting item */
export async function ureflects(fmt, str) {
    const ERefl = uprop(REFLECTING).extrinsic || 0;
    const msg = (what) => fmt.replace("%s", str).replace("%s", what);

    if (ERefl & W_ARMS) {
        if (fmt && str !== null) {
            await pline(msg("shield"));
            makeknown(SHIELD_OF_REFLECTION);
        }
        return true;
    } else if (ERefl & W_WEP) {
        /* Due to wielded artifact weapon */
        if (fmt && str !== null)
            await pline(msg("weapon"));
        return true;
    } else if (ERefl & W_AMUL) {
        if (fmt && str !== null) {
            await pline(msg("medallion"));
            makeknown(AMULET_OF_REFLECTION);
        }
        return true;
    } else if (ERefl & W_ARM) {
        if (fmt && str !== null)
            await pline(msg(game.uskin ? "luster" : "armor"));
        return true;
    } else if (game.youmonst.data === mons[M.PM_SILVER_DRAGON]) {
        if (fmt && str !== null)
            await pline(msg("scales"));
        return true;
    }
    return false;
}

// C ref: mcastu.c cursetxt()
/* feedback when frustrated monster couldn't cast a spell */
async function cursetxt(mtmp, undirected) {
    const u = game.u;

    if (canseemon(mtmp) && couldsee(mtmp.mx, mtmp.my)) {
        let point_msg; /* spellcasting monsters are impolite */

        if (undirected)
            point_msg = "all around, then curses";
        else if ((Invis() && !perceives(mtmp.data)
                  && (mtmp.mux !== u.ux || mtmp.muy !== u.uy))
                 || is_obj_mappear(game.youmonst, STRANGE_OBJECT)
                 || u.uundetected)
            point_msg = "and curses in your general direction";
        else if (Displaced() && (mtmp.mux !== u.ux || mtmp.muy !== u.uy))
            point_msg = "and curses at your displaced image";
        else
            point_msg = "at you, then curses";

        await pline(`${Monnam(mtmp)} points ${point_msg}.`); /* pline_mon() */
    } else if ((!(game.moves % 4) || !rn2(4))) {
        if (!Deaf())
            await Norep("You hear a mumbled curse."); /* Deaf-aware */
    }
}

// C ref: mcastu.c choose_monster_spell()
/* choose a spell for monster to cast */
function choose_monster_spell(mtmp, adtyp) {
    let list = null;
    let i, spellval, len = 0;
    let maxlev;

    /* which spell list to use? */
    if (adtyp === AD_SPEL) {
        list = mon_wizard_spells;
        len = mon_wizard_spells.length;
    } else if (adtyp === AD_CLRC) {
        list = mon_cleric_spells;
        len = mon_cleric_spells.length;
    }

    if (!list || len < 1)
        return MCAST_PSI_BOLT;

    /* max spell level in this monster spell list */
    maxlev = mcast_data[list[len - 1]].level;

    /* which level spell to cast? */
    spellval = rn2(mtmp.m_lev);
    if (spellval > maxlev && rn2(maxlev))
        spellval = rn2(maxlev);

    /* find the highest spell in the list we could cast */
    for (i = len - 1; i >= 0; i--)
        if (mcast_data[list[i]].level <= spellval
            && !spell_would_be_useless(mtmp, list[i]))
            return list[i];

    /* or return the first spell in the list */
    return list[0];
}

// C ref: mcastu.c castmu()
/* return values:
 * 1: successful spell
 * 0: unsuccessful spell
 */
export async function castmu(
    mtmp,               /* caster */
    mattk,              /* caster's current attack */
    thinks_it_foundyou, /* might be mistaken if displaced */
    foundyou)           /* knows hero's precise location */
{
    const u = game.u;
    let dmg;
    const ml = mtmp.m_lev;
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
    if ((mattk.adtyp === AD_SPEL || mattk.adtyp === AD_CLRC) && ml) {
        let cnt = 40;

        do {
            spellnum = choose_monster_spell(mtmp, mattk.adtyp);
            /* not trying to attack?  don't allow directed spells */
            if (!thinks_it_foundyou) {
                if (!is_undirected_spell(spellnum)
                    || spell_would_be_useless(mtmp, spellnum)) {
                    /* if (foundyou) impossible("spellcasting monster found
                       you and doesn't know it?") */
                    return M_ATTK_MISS;
                }
                break;
            }
        } while (--cnt > 0
                 && spell_would_be_useless(mtmp, spellnum));
        if (cnt === 0)
            return M_ATTK_MISS;
    }

    /* monster unable to cast spells? */
    if (mtmp.mcan || mtmp.mspec_used || !ml
        || m_seenres(mtmp, cvt_adtyp_to_mseenres(mattk.adtyp))) {
        await cursetxt(mtmp, is_undirected_spell(spellnum));
        return M_ATTK_MISS;
    }

    /* debugpline3("castmu:%s,lvl:%i,spell:%i", ...) */

    if (mattk.adtyp === AD_SPEL || mattk.adtyp === AD_CLRC) {
        /* monst->m_lev is unsigned (uchar), monst->mspec_used is int */
        mtmp.mspec_used = (mtmp.m_lev < 8) ? (10 - mtmp.m_lev) : 2;
    }

    /* Monster can cast spells, but is casting a directed spell at the
     * wrong place?  If so, give a message, and return.
     * Do this *after* penalizing mspec_used.
     */
    if (!foundyou && thinks_it_foundyou
        && !is_undirected_spell(spellnum)) {
        await pline(`${canseemon(mtmp) ? Monnam(mtmp) : "Something"} casts a spell at ${
            is_waterwall(mtmp.mux, mtmp.muy) ? "empty water"
                                             : "thin air"}!`); /* pline_mon() */
        return M_ATTK_MISS;
    }

    nomul(0);
    if (rn2(ml * 10) < (mtmp.mconf ? 100 : 20)) { /* fumbled attack */
        /* Soundeffect(se_air_crackles, 60) */
        if (canseemon(mtmp) && !Deaf()) {
            /* set_msg_xy(mtmp->mx, mtmp->my): accessibility only */
            await pline_The(`air crackles around ${mon_nam(mtmp)}.`);
        }
        return M_ATTK_MISS;
    }
    if (canspotmon(mtmp) || !is_undirected_spell(spellnum)) {
        await pline(`${canspotmon(mtmp) ? Monnam(mtmp) : "Something"} casts a spell${
            is_undirected_spell(spellnum) ? ""
            : (Invis() && !perceives(mtmp.data)
               && !u_at(mtmp.mux, mtmp.muy))
              ? " at a spot near you"
              : (Displaced() && !u_at(mtmp.mux, mtmp.muy))
                ? " at your displaced image"
                : " at you"}!`); /* pline_mon() */
    }

    /*
     * As these are spells, the damage is related to the level
     * of the monster casting the spell.
     */
    if (!foundyou) {
        dmg = 0;
        if (mattk.adtyp !== AD_SPEL && mattk.adtyp !== AD_CLRC) {
            /* impossible("%s casting non-hand-to-hand version of
               hand-to-hand spell %d?", ...) */
            return M_ATTK_MISS;
        }
    } else if (mattk.damd)
        dmg = d(Math.trunc(ml / 2) + mattk.damn, mattk.damd);
    else
        dmg = d(Math.trunc(ml / 2) + 1, 6);
    if (Half_spell_damage())
        dmg = Math.trunc((dmg + 1) / 2);

    ret = M_ATTK_HIT;
    /*
     * FIXME: none of these hit the steed when hero is riding, nor do
     *  they inflict damage on carried items.
     */
    switch (mattk.adtyp) {
    case AD_FIRE:
        await pline("You're enveloped in flames.");
        if (Fire_resistance()) {
            /* shieldeff(u.ux, u.uy): transient display only */
            await pline("But you resist the effects.");
            monstseesu(M_SEEN_FIRE);
            dmg = 0;
        } else {
            monstunseesu(M_SEEN_FIRE);
        }
        await burn_away_slime();
        /* burn up flammable items on the floor, melt ice terrain */
        await mon_spell_hits_spot(mtmp, AD_FIRE, u.ux, u.uy);
        break;
    case AD_COLD:
        await pline("You're covered in frost.");
        if (Cold_resistance()) {
            /* shieldeff(u.ux, u.uy) */
            await pline("But you resist the effects.");
            monstseesu(M_SEEN_COLD);
            dmg = 0;
        } else {
            monstunseesu(M_SEEN_COLD);
        }
        /* freeze water or lava terrain */
        await mon_spell_hits_spot(mtmp, AD_COLD, u.ux, u.uy);
        break;
    case AD_MAGM:
        await You("are hit by a shower of missiles!");
        if (Antimagic()) {
            /* shieldeff(u.ux, u.uy) */
            await pline_The("missiles bounce off!");
            monstseesu(M_SEEN_MAGR);
            dmg = 0;
        } else {
            dmg = d(Math.trunc(mtmp.m_lev / 2) + 1, 6);
            monstunseesu(M_SEEN_MAGR);
        }
        /* shower of magic missiles scuffs an engraving */
        await mon_spell_hits_spot(mtmp, AD_MAGM, u.ux, u.uy);
        break;
    case AD_SPEL: /* wizard spell */
    case AD_CLRC: /* clerical spell */
        await mcast_spell(mtmp, dmg, spellnum);
        dmg = 0; /* done by the spell casting functions */
        break;
    } /* switch */
    if (dmg)
        await mdamageu(mtmp, dmg);
    return ret;
}

// C ref: mcastu.c m_cure_self()
async function m_cure_self(mtmp, dmg) {
    if (mtmp.mhp < mtmp.mhpmax) {
        if (canseemon(mtmp))
            await pline(`${Monnam(mtmp)} looks better.`); /* pline_mon() */
        /* note: player healing does 6d4; this used to do 1d8 */
        healmon(mtmp, d(3, 6), 0);
        dmg = 0;
    }
    return dmg;
}

// C ref: mcastu.c touch_of_death()
/* unlike the finger of death spell which behaves like a wand of death,
   this monster spell only attacks the hero */
export async function touch_of_death(mtmp) {
    const u = game.u;
    let dmg = 50 + d(8, 6);
    const drain = Math.trunc(dmg / 2);

    /* if we get here, we know that hero isn't magic resistant and isn't
       poly'd into an undead or demon */
    await You_feel("drained...");
    const kbuf = death_inflicted_by("the touch of death", mtmp);

    if (Upolyd()) {
        u.mh = 0;
        await rehumanize(); /* fatal iff Unchanging */
    } else if (drain >= u.uhpmax) {
        killer().format = KILLED_BY;
        killer().name = kbuf;
        await done(DIED);
    } else {
        /* HP manipulation similar to poisoned(attrib.c) */
        const olduhp = u.uhp,
            uhpmin = minuhpmax(3),
            newuhpmax = u.uhpmax - drain;

        setuhpmax(Math.max(newuhpmax, uhpmin), false);
        dmg = adjuhploss(dmg, olduhp); /* reduce pending damage if uhp has
                                        * already been reduced due to drop
                                        * in uhpmax */
        await losehp(dmg, kbuf, KILLED_BY);
    }
    killer().name = ''; /* not killed if we get here... */
}

// C ref: mcastu.c death_inflicted_by()
/* give a reason for death by some monster spells; returns the text C
   writes into outbuf */
export function death_inflicted_by(
    deathreason, /* cause of death */
    mtmp)        /* monster who caused it */
{
    let outbuf = deathreason;
    if (mtmp) {
        const mptr = mtmp.data,
            champtr = (mtmp.cham >= M.LOW_PM && mtmp.cham < M.NUMMONS) /* ismnum() */
                ? mons[mtmp.cham] : mptr;
        const mgend = mtmp.female ? 1 : 0; /* Mgender() */
        let realnm = pmname(champtr, mgend);
        const fakenm = pmname(mptr, mgend);

        /* greatly simplified extract from done_in_by(), primarily for
           reason for death due to 'touch of death' spell; if mtmp is
           shape changed, it won't be a vampshifter or mimic since they
           can't cast spells */
        if (!type_is_pname(champtr) && !the_unique_pm(mptr))
            realnm = an(realnm);
        outbuf += ` inflicted by ${the_unique_pm(mptr) ? "the " : ""}${realnm}`;
        if (champtr !== mptr)
            outbuf += ` imitating ${an(fakenm)}`;
    }
    return outbuf;
}

/*
 * Monster wizard and cleric spellcasting functions.
 */

// C ref: mcastu.c mcast_death_touch()
async function mcast_death_touch(mtmp) {
    await pline(`Oh no, ${mhe(mtmp)}'s using the touch of death!`);
    if (nonliving(game.youmonst.data) || is_demon(game.youmonst.data)) {
        await You("seem no deader than before.");
    } else if (!Antimagic() && rn2(mtmp.m_lev) > 12) {
        if (Hallucination()) {
            await You("have an out of body experience.");
        } else {
            await touch_of_death(mtmp);
        }
        monstunseesu(M_SEEN_MAGR);
    } else {
        if (Antimagic()) {
            /* shieldeff(u.ux, u.uy) */
            monstseesu(M_SEEN_MAGR);
        }
        await pline("Lucky for you, it didn't work!");
    }
}

// C ref: mcastu.c mcast_clone_wiz()
async function mcast_clone_wiz(mtmp) {
    if (mtmp.iswiz && game.context.no_of_wizards === 1) {
        await pline("Double Trouble...");
        clonewiz();
    } /* else impossible("bad wizard cloning?") */
}

// C ref: mcastu.c mcast_summon_mons()
async function mcast_summon_mons(mtmp) {
    const u = game.u;
    const count = nasty(mtmp);

    if (!count) {
        ; /* nothing was created? */
    } else if (mtmp.iswiz) {
        /* SetVoice(mtmp, 0, 80, 0) */
        await verbalize(`Destroy the thief, my pet${plur(count)}!`);
    } else {
        const one = (count === 1);
        const mappear = one ? "A monster appears"
                            : "Monsters appear";

        /* messages not quite right if plural monsters created but
           only a single monster is seen */
        if (Invis() && !perceives(mtmp.data)
            && (mtmp.mux !== u.ux || mtmp.muy !== u.uy))
            await pline(`${mappear} ${one ? "at" : "around"} a spot near you!`);
        else if (Displaced() && (mtmp.mux !== u.ux || mtmp.muy !== u.uy))
            await pline(`${mappear} ${one ? "by" : "around"} your displaced image!`);
        else
            await pline(`${mappear} from nowhere!`);
    }
}

// C ref: mcastu.c mcast_destroy_armor()
async function mcast_destroy_armor() {
    if (Antimagic()) {
        /* shieldeff(u.ux, u.uy) */
        monstseesu(M_SEEN_MAGR);
        await pline("A field of force surrounds you!");
    } else if (!await destroy_arm()) {
        await Your("skin itches.");
    } else {
        /* monsters only realize you aren't magic-protected if armor is
           actually destroyed */
        monstunseesu(M_SEEN_MAGR);
    }
}

// C ref: mcastu.c mcast_weaken_you()
async function mcast_weaken_you(mtmp, dmg) {
    if (Antimagic()) {
        /* shieldeff(u.ux, u.uy) */
        monstseesu(M_SEEN_MAGR);
        await You_feel("momentarily weakened.");
    } else {
        await You("suddenly feel weaker!");
        dmg = mtmp.m_lev - 6;
        if (dmg < 1) /* paranoia since only chosen when m_lev is high */
            dmg = 1;
        if (Half_spell_damage())
            dmg = Math.trunc((dmg + 1) / 2);
        await losestr(rnd(dmg),
                      death_inflicted_by("strength loss", mtmp),
                      KILLED_BY);
        killer().name = ''; /* not killed if we get here... */
        monstunseesu(M_SEEN_MAGR);
    }
}

// C ref: mcastu.c mcast_disappear()
async function mcast_disappear(mtmp) {
    if (!mtmp.minvis && !mtmp.invis_blkd) {
        if (canseemon(mtmp))
            await pline(`${Monnam(mtmp)} suddenly ${
                !See_invisible() ? "disappears" : "becomes transparent"}!`); /* pline_mon() */
        mon_set_minvis(mtmp, false);
        if (cansee(mtmp.mx, mtmp.my) && !canspotmon(mtmp))
            map_invisible(mtmp.mx, mtmp.my);
    } /* else impossible("no reason for monster to cast disappear spell?") */
}

// C ref: mcastu.c mcast_stun_you()
async function mcast_stun_you(dmg) {
    if (Antimagic() || Free_action()) {
        /* shieldeff(u.ux, u.uy) */
        monstseesu(M_SEEN_MAGR);
        if (!Stunned())
            await You_feel("momentarily disoriented.");
        await make_stunned(1, false);
    } else {
        await You(Stunned() ? "struggle to keep your balance." : "reel...");
        dmg = d(ACURR(A_DEX) < 12 ? 6 : 4, 4);
        if (Half_spell_damage())
            dmg = Math.trunc((dmg + 1) / 2);
        await make_stunned((HStun() & TIMEOUT) + dmg, false);
        monstunseesu(M_SEEN_MAGR);
    }
}

// C ref: mcastu.c mcast_geyser()
async function mcast_geyser(dmg) {
    /* this is physical damage (force not heat),
     * not magical damage or fire damage
     */
    await pline("A sudden geyser slams into you from nowhere!");
    dmg = d(8, 6);
    if (Half_physical_damage())
        dmg = Math.trunc((dmg + 1) / 2);
    return dmg;
}

// C ref: mcastu.c mcast_fire_pillar()
async function mcast_fire_pillar(mtmp, dmg) {
    let orig_dmg;

    await pline("A pillar of fire strikes all around you!");
    orig_dmg = dmg = d(8, 6);
    if (Fire_resistance()) {
        /* shieldeff(u.ux, u.uy) */
        monstseesu(M_SEEN_FIRE);
        dmg = 0;
    } else {
        monstunseesu(M_SEEN_FIRE);
    }
    if (Half_spell_damage())
        dmg = Math.trunc((dmg + 1) / 2);
    await burn_away_slime();
    await burnarmor(game.youmonst);
    /* item destruction dmg */
    await destroy_items(game.youmonst, AD_FIRE, orig_dmg);
    await ignite_items(game.invent);
    /* burn up flammable items on the floor, melt ice terrain */
    await mon_spell_hits_spot(mtmp, AD_FIRE, game.u.ux, game.u.uy);
    return dmg;
}

// C ref: mcastu.c mcast_lightning()
async function mcast_lightning(mtmp, dmg) {
    let orig_dmg;

    /* Soundeffect(se_bolt_of_lightning, 80) */
    await pline("A bolt of lightning strikes down at you from above!");
    const reflects = await ureflects("It bounces off your %s%s.", "");
    orig_dmg = dmg = d(8, 6);
    if (reflects || Shock_resistance()) {
        /* shieldeff(u.ux, u.uy) */
        dmg = 0;
        if (reflects) {
            monstseesu(M_SEEN_REFL);
            return dmg;
        }
        monstunseesu(M_SEEN_REFL);
        monstseesu(M_SEEN_ELEC);
    } else {
        monstunseesu(M_SEEN_ELEC | M_SEEN_REFL);
    }
    if (Half_spell_damage())
        dmg = Math.trunc((dmg + 1) / 2);
    await destroy_items(game.youmonst, AD_ELEC, orig_dmg);
    /* lightning might destroy iron bars if hero is on such a spot;
       reflection protects terrain here [execution won't get here due
       to 'if (reflects) break' above] but hero resistance doesn't;
       do this before maybe blinding the hero via flashburn() */
    await mon_spell_hits_spot(mtmp, AD_ELEC, game.u.ux, game.u.uy);
    /* blind hero; no effect if already blind */
    await flashburn(rnd(100), true);
    return dmg;
}

// C ref: mcastu.c mcast_psi_bolt()
async function mcast_psi_bolt(dmg) {
    /* prior to 3.4.0 Antimagic was setting the damage to 1--this
       made the spell virtually harmless to players with magic res. */
    if (Antimagic()) {
        /* shieldeff(u.ux, u.uy) */
        monstseesu(M_SEEN_MAGR);
        dmg = Math.trunc((dmg + 1) / 2);
    } else {
        monstunseesu(M_SEEN_MAGR);
    }
    if (dmg <= 5)
        await You(`get a slight ${body_part(HEAD)}ache.`);
    else if (dmg <= 10)
        await Your("brain is on fire!");
    else if (dmg <= 20)
        await Your(`${body_part(HEAD)} suddenly aches painfully!`);
    else
        await Your(`${body_part(HEAD)} suddenly aches very painfully!`);
    return dmg;
}

// C ref: mcastu.c mcast_open_wounds()
async function mcast_open_wounds(dmg) {
    if (Antimagic()) {
        /* shieldeff(u.ux, u.uy) */
        monstseesu(M_SEEN_MAGR);
        dmg = Math.trunc((dmg + 1) / 2);
    } else {
        monstunseesu(M_SEEN_MAGR);
    }
    if (dmg <= 5)
        await Your("skin itches badly for a moment.");
    else if (dmg <= 10)
        await pline("Wounds appear on your body!");
    else if (dmg <= 20)
        await pline("Severe wounds appear on your body!");
    else
        await Your("body is covered with painful wounds!");
    return dmg;
}

// C ref: mcastu.c mcast_insects()
async function mcast_insects(mtmp) {
    const u = game.u;
    /* Try for insects, and if there are none
       left, go for (sticks to) snakes.  -3. */
    let pm = mkclass(S_ANT, 0);
    let mtmp2 = null;
    const let_ = (pm ? S_ANT : S_SNAKE);
    let success = false, seecaster;
    let i, quan, oldseen, newseen;
    const bypos = { x: 0, y: 0 };
    let fmt, what, whatbuf = '';

    oldseen = monster_census(true);
    quan = (mtmp.m_lev < 2) ? 1 : rnd(Math.trunc(mtmp.m_lev / 2));
    if (quan < 3)
        quan = 3;
    for (i = 0; i <= quan; i++) {
        if (!enexto(bypos, mtmp.mux, mtmp.muy, mtmp.data))
            return;
        if ((pm = mkclass(let_, 0)) !== null
            && (mtmp2 = makemon(pm, bypos.x, bypos.y, MM_ANGRY | MM_NOMSG))
            !== null) {
            success = true;
            mtmp2.msleeping = mtmp2.mpeaceful = mtmp2.mtame = 0;
            set_malign(mtmp2);
        }
    }
    newseen = monster_census(true);

    /* not canspotmon() which includes unseen things sensed via warning */
    seecaster = canseemon(mtmp) || tp_sensemon(mtmp) || Detect_monsters();
    what = (let_ === S_SNAKE) ? "snakes" : "insects";
    let what_is_whatbuf = false;
    if (Hallucination()) {
        whatbuf = bogusmon(null);
        what = makeplural(whatbuf);
    }

    fmt = null;
    if (!seecaster) {
        if (newseen <= oldseen || Unaware()) {
            /* unseen caster fails or summons unseen critters,
               or unconscious hero ("You dream that you hear...") */
            await You_hear(`someone summoning ${what}.`);
        } else {
            let arg;

            if (!what_is_whatbuf) {
                whatbuf = what;
                what_is_whatbuf = true;
            }
            /* unseen caster summoned seen critter(s) */
            arg = (newseen === oldseen + 1) ? an(makesingular(what))
                                            : whatbuf;
            if (!Deaf()) {
                /* Soundeffect(se_someone_summoning, 100) */
                await You_hear(`someone summoning something, and ${arg} ${
                    vtense(arg, "appear")}.`);
            } else {
                await pline(`${upstart(arg)} ${vtense(arg, "appear")}.`);
            }
        }

        /* seen caster, possibly producing unseen--or just one--critters;
           hero is told what the caster is doing and doesn't necessarily
           observe complete accuracy of that caster's results (in other
           words, no need to fuss with visibility or singularization;
           player is told what's happening even if hero is unconscious) */
    } else if (!success) {
        fmt = (m, w) => `${m} casts at a clump of sticks, but nothing happens.${w}`;
        what = "";
    } else if (let_ === S_SNAKE) {
        fmt = (m, w) => `${m} transforms a clump of sticks into ${w}!`;
    } else if (Invis() && !perceives(mtmp.data)
               && (mtmp.mux !== u.ux || mtmp.muy !== u.uy)) {
        fmt = (m, w) => `${m} summons ${w} around a spot near you!`;
    } else if (Displaced() && (mtmp.mux !== u.ux || mtmp.muy !== u.uy)) {
        fmt = (m, w) => `${m} summons ${w} around your displaced image!`;
    } else {
        fmt = (m, w) => `${m} summons ${w}!`;
    }
    if (fmt) {
        await pline(fmt(Monnam(mtmp), what)); /* pline_mon() */
    }
}

// C ref: mcastu.c mcast_blind_you()
async function mcast_blind_you() {
    /* note: resists_blnd() doesn't apply here */
    if (!Blinded()) {
        const num_eyes = eyecount(game.youmonst.data);

        await pline(`Scales cover your ${(num_eyes === 1)
                                         ? body_part(EYE)
                                         : makeplural(body_part(EYE))}!`);
        await make_blinded(Half_spell_damage() ? 100 : 200, false);
        if (!Blind())
            await Your(vision_clears);
    } /* else impossible("no reason for monster to cast blindness spell?") */
}

// C ref: mcastu.c mcast_paralyze()
async function mcast_paralyze(mtmp) {
    let dmg = 0;

    if (Antimagic() || Free_action()) {
        /* shieldeff(u.ux, u.uy) */
        monstseesu(M_SEEN_MAGR);
        if (game.multi >= 0)
            await You("stiffen briefly.");
        dmg = 1; /* to produce nomul(-1), not actual damage */
    } else {
        if (game.multi >= 0)
            await You("are frozen in place!");
        dmg = 4 + mtmp.m_lev;
        if (Half_spell_damage())
            dmg = Math.trunc((dmg + 1) / 2);
        monstunseesu(M_SEEN_MAGR);
    }
    nomul(-dmg);
    game.multi_reason = "paralyzed by a monster";
    game.nomovemsg = null; /* C: (char *) 0 -- "You can move again." */
    return dmg;
}

// C ref: mcastu.c mcast_confuse_you()
async function mcast_confuse_you(mtmp) {
    if (Antimagic()) {
        /* shieldeff(u.ux, u.uy) */
        monstseesu(M_SEEN_MAGR);
        await You_feel("momentarily dizzy.");
    } else {
        const oldprop = Confusion();
        let dmg = mtmp.m_lev;

        if (Half_spell_damage())
            dmg = Math.trunc((dmg + 1) / 2);
        await make_confused(HConfusion() + dmg, true);
        if (Hallucination())
            await You_feel(`${oldprop ? "trippier" : "trippy"}!`);
        else
            await You_feel(`${oldprop ? "more " : ""}confused!`);
        monstunseesu(M_SEEN_MAGR);
    }
}

// C ref: mcastu.c mcast_spell()
/*
   If dmg is zero, then the monster is not casting at you.
   If the monster is intentionally not casting at you, we have previously
   called spell_would_be_useless() and spellnum should always be a valid
   undirected spell.
   If you modify either of these, be sure to change is_undirected_spell()
   and spell_would_be_useless().
 */
async function mcast_spell(mtmp, dmg, spellnum) {
    if (dmg < 0) {
        /* impossible("monster cast spell (%d) with negative dmg (%d)?") */
        return;
    }
    if (dmg === 0 && !is_undirected_spell(spellnum)) {
        /* impossible("cast directed wizard spell (%d) with dmg=0?") */
        return;
    }

    switch (spellnum) {
    case MCAST_DEATH_TOUCH:
        await mcast_death_touch(mtmp);
        dmg = 0;
        break;
    case MCAST_CLONE_WIZ:
        await mcast_clone_wiz(mtmp);
        dmg = 0;
        break;
    case MCAST_SUMMON_MONS:
        await mcast_summon_mons(mtmp);
        dmg = 0;
        break;
    case MCAST_AGGRAVATION:
        await You_feel("that monsters are aware of your presence.");
        aggravate();
        dmg = 0;
        break;
    case MCAST_CURSE_ITEMS:
        await You_feel("as if you need some help.");
        await rndcurse();
        dmg = 0;
        break;
    case MCAST_DESTRY_ARMR:
        await mcast_destroy_armor();
        dmg = 0;
        break;
    case MCAST_WEAKEN_YOU: /* drain strength */
        await mcast_weaken_you(mtmp, dmg);
        dmg = 0;
        break;
    case MCAST_DISAPPEAR: /* makes self invisible */
        await mcast_disappear(mtmp);
        dmg = 0;
        break;
    case MCAST_STUN_YOU:
        await mcast_stun_you(dmg);
        dmg = 0;
        break;
    case MCAST_HASTE_SELF:
        await mon_adjust_speed(mtmp, 1, null);
        dmg = 0;
        break;
    case MCAST_CURE_SELF:
        dmg = await m_cure_self(mtmp, dmg);
        break;
    case MCAST_PSI_BOLT:
        dmg = await mcast_psi_bolt(dmg);
        break;
    case MCAST_GEYSER:
        dmg = await mcast_geyser(dmg);
        break;
    case MCAST_FIRE_PILLAR:
        dmg = await mcast_fire_pillar(mtmp, dmg);
        break;
    case MCAST_LIGHTNING:
        dmg = await mcast_lightning(mtmp, dmg);
        break;
    case MCAST_INSECTS:
        await mcast_insects(mtmp);
        dmg = 0;
        break;
    case MCAST_BLIND_YOU:
        await mcast_blind_you();
        dmg = 0;
        break;
    case MCAST_PARALYZE:
        dmg = await mcast_paralyze(mtmp);
        break;
    case MCAST_CONFUSE_YOU:
        await mcast_confuse_you(mtmp);
        dmg = 0;
        break;
    case MCAST_OPEN_WOUNDS:
        dmg = await mcast_open_wounds(dmg);
        break;
    default:
        /* impossible("mcastu: invalid magic spell (%d)", spellnum) */
        dmg = 0;
        break;
    }

    if (dmg)
        await mdamageu(mtmp, dmg);
}

// C ref: mcastu.c is_undirected_spell()
function is_undirected_spell(spellnum) {
    if ((mcast_data[spellnum].flags & MCF_INDIRECT) !== 0)
        return true;
    return false;
}

// C ref: mcastu.c spell_would_be_useless()
/* Some spells are useless under some circumstances. */
function spell_would_be_useless(mtmp, spellnum) {
    /* Some spells don't require the player to really be there and can be cast
     * by the monster when you're invisible, yet still shouldn't be cast when
     * the monster doesn't even think you're there.
     * This check isn't quite right because it always uses your real position.
     * We really want something like "if the monster could see mux, muy".
     */

    /* spell is only cast by hostile monsters */
    if ((mcast_data[spellnum].flags & MCF_HOSTILE) !== 0) {
        if (mtmp.mpeaceful)
            return true;
    }

    /* spell needs the monster to see hero */
    if ((mcast_data[spellnum].flags & MCF_SIGHT) !== 0) {
        const mcouldseeu = couldsee(mtmp.mx, mtmp.my);

        if (!mcouldseeu)
            return true;
    }

    switch (spellnum) {
    case MCAST_DEATH_TOUCH:
        if ((Antimagic() || Hallucination()) && !rn2(2))
            return true;
        break;
    case MCAST_GEYSER:
        if (!rn2(5))
            return true;
        break;
    case MCAST_CLONE_WIZ:
        /* only the Wizard is allowed to clone himself */
        if (!mtmp.iswiz || game.context.no_of_wizards > 1)
            return true;
        break;
    case MCAST_AGGRAVATION:
        /* aggravation (global wakeup) when everyone is already active */
        /* if nothing needs to be awakened then this spell is useless
           but caster might not realize that [chance to pick it then
           must be very small otherwise caller's many retry attempts
           will eventually end up picking it too often] */
        if (!has_aggravatables(mtmp))
            return rn2(100) ? true : false;
        break;
    case MCAST_HASTE_SELF:
        /* haste self when already fast */
        if (mtmp.permspeed === MFAST)
            return true;
        break;
    case MCAST_DISAPPEAR:
        /* invisibility when already invisible */
        if (mtmp.minvis || mtmp.invis_blkd)
            return true;
        /* peaceful monster won't cast invisibility if you can't see
           invisible,
           same as when monsters drink potions of invisibility.  This doesn't
           really make a lot of sense, but lets the player avoid hitting
           peaceful monsters by mistake */
        if (mtmp.mpeaceful && !See_invisible())
            return true;
        break;
    case MCAST_CURE_SELF:
        /* healing when already healed */
        if (mtmp.mhp === mtmp.mhpmax)
            return true;
        break;
    case MCAST_BLIND_YOU:
        if (Blinded())
            return true;
        break;
    default:
        break;
    }
    return false;
}

// C ref: mcastu.c buzzmu()
/* monster uses spell (ranged) */
export async function buzzmu(mtmp, mattk) {
    /* don't print constant stream of curse messages for 'normal'
       spellcasting monsters at range */
    if (!(mattk.adtyp >= AD_MAGM && mattk.adtyp <= AD_SPC2)) /* BZ_VALID_ADTYP() */
        return M_ATTK_MISS;

    if (mtmp.mcan || m_seenres(mtmp, cvt_adtyp_to_mseenres(mattk.adtyp))) {
        await cursetxt(mtmp, false);
        return M_ATTK_MISS;
    }
    if (lined_up(mtmp) && rn2(3)) {
        const ofs = Math.abs(mattk.adtyp - AD_MAGM) % 10; /* BZ_OFS_AD() */

        nomul(0);
        if (canseemon(mtmp))
            await pline(`${Monnam(mtmp)} zaps you with a ${
                flash_str(ofs, false)}!`); /* pline_mon() */
        game.buzzer = mtmp;
        await buzz(-10 - ofs /* BZ_M_SPELL() */, mattk.damn,
                   mtmp.mx, mtmp.my, sgn(game.tbx), sgn(game.tby));
        game.buzzer = null;
        return M_ATTK_HIT;
    }
    return M_ATTK_MISS;
}
