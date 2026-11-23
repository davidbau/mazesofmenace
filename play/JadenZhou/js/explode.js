// explode.js -- explosions.
// C ref: explode.c
//
// Ported: explode() (scatter() and splatter_burning_oil()/explode_oil()
// aren't ported yet), explosionmask(), engulfer_explosion_msg(),
// adtyp_to_expltype(), mon_explodes().

import { game } from './gstate.js';
import { pline, You, pline_The, map_invisible, unmap_invisible, canspotmon,
         tmp_at, DISP_BEAM, DISP_CHANGE, DISP_END, explosion_to_glyph,
         Hallucination } from './display.js';
import { You_hear } from './sounds.js';
import { cansee } from './vision.js';
import { m_at } from './makemon.js';
import { isok, u_at, engulfing_u, PHYS_EXPL_TYPE, KILLED_BY_AN,
         KILLED_BY, NO_KILLER_PREFIX, DIED, BURNING, A_STR, ANTIMAGIC,
         FIRE_RES, COLD_RES, DISINT_RES, SHOCK_RES, POISON_RES, ACID_RES,
         INVULNERABLE, DEAF, PLNMSG_CAUGHT_IN_EXPLOSION,
         PLNMSG_TOWER_OF_FLAME, XKILL_GIVEMSG, XKILL_NOMSG, XKILL_NOCORPSE,
         XKILL_NOCONDUCT, EXPL_MAGICAL, EXPL_FIERY, EXPL_FROSTY,
         EXPL_NOXIOUS } from './const.js';
import { objects, WAND_CLASS, SCROLL_CLASS, RAY, WAN_DIGGING, WAN_SLEEP,
         WAN_MAGIC_MISSILE, POT_OIL, SCR_FIRE, BURNING_OIL, MON_EXPLODE,
         TRAP_EXPLODE } from './objects.js';
import { AD_PHYS, AD_MAGM, AD_FIRE, AD_COLD, AD_DISN, AD_ELEC, AD_DRST,
         AD_ACID, AD_SPEL, AD_DREN, AD_ENCH, AD_DRDX, AD_DRCO, AD_DISE,
         AD_PEST, AD_SPC2, AD_RBRE, AD_DGST, AT_ENGL, PM_CLERIC, PM_MONK,
         PM_WIZARD, PM_HEALER, PM_KNIGHT } from './monsters.js';
import { resists_magm, resists_fire, resists_cold, resists_disint,
         resists_elec, resists_poison, resists_acid, is_demon,
         is_vampshifter } from './mondata.js';
import { nonliving } from './makemon.js';
import { Monnam, rndmonnam, pmname } from './do_name.js';
import { s_suffix, lowc, strstri } from './hacklib.js';
import { seemimic, xkilled, monkilled, setmangry, wake_nearto, mondead,
         completelyburns, golemeffects } from './mon.js';
import { destroy_items, zap_over_floor, resist_async } from './zap.js';
import { burnarmor, Maybe_Half_Phys, ignite_items } from './trap.js';
import { burn_away_slime } from './potion.js';
import { ugolemeffects } from './mhitu.js';
import { monstseesu, monstunseesu } from './uhitm.js';
import { cvt_adtyp_to_mseenres } from './mondata.js';
import { exercise } from './attrib.js';
import { killer } from './topten.js';
import { done } from './end.js';
import { d } from './rng.js';

/* C ref: youprop.h property tests used here */
function uprop(p) {
    return game.u.uprops[p] || { intrinsic: 0, extrinsic: 0, blocked: 0 };
}
function uhave(p) { const q = uprop(p); return !!(q.intrinsic || q.extrinsic); }
function Deaf() { return uhave(DEAF) || !!game.u.uroleplay?.deaf; }
function Upolyd() { return game.u.umonnum !== game.u.umonster; }
function Invulnerable() { return !!uprop(INVULNERABLE).intrinsic; }
/* C ref: mondata.h digests(), sticks() */
function digests(ptr) {
    return (ptr.mattk || []).some(a => a.aatyp === AT_ENGL && a.adtyp === AD_DGST);
}
/* C ref: you.h uhim(), uhis() */
function uhim() { return game.flags.female ? "her" : "him"; }
function uhis() { return game.flags.female ? "her" : "his"; }
/* C ref: hack.h next2u() */
function next2u(x, y) {
    return Math.abs(x - game.u.ux) <= 1 && Math.abs(y - game.u.uy) <= 1;
}
function DEADMONSTER(mon) { return mon.mhp < 1; }
/* C ref: monst.h monstseesu_ad(), monstunseesu_ad() */
function monstseesu_ad(adtyp) { monstseesu(cvt_adtyp_to_mseenres(adtyp)); }
function monstunseesu_ad(adtyp) { monstunseesu(cvt_adtyp_to_mseenres(adtyp)); }

/* Note: Arrays are column first, while the screen is row first
   (S_expl_tl..S_expl_br as 0..8) */
const explosion = [
    [ 0 /* S_expl_tl */, 3 /* S_expl_ml */, 6 /* S_expl_bl */ ],
    [ 1 /* S_expl_tc */, 4 /* S_expl_mc */, 7 /* S_expl_bc */ ],
    [ 2 /* S_expl_tr */, 5 /* S_expl_mr */, 8 /* S_expl_br */ ] ];

/* what to do at [x+i][y+j] for i=-1,0,1 and j=-1,0,1 */
const EXPL_NONE = 0, /* not specified yet or no shield effect needed */
    EXPL_MON = 1,    /* monster is affected */
    EXPL_HERO = 2,   /* hero is affected */
    EXPL_SKIP = 4;   /* don't apply shield effect (out of bounds) */

// C ref: explode.c explosionmask()
/* check if shield effects are needed for location affected by explosion */
function explosionmask(
    m,      /* target monster (might be youmonst) */
    adtyp,  /* damage type */
    olet) { /* object class (only matters for AD_DISN) */
    let res = EXPL_NONE;

    if (m === game.youmonst) {
        switch (adtyp) {
        case AD_PHYS:
            /* leave 'res' with EXPL_NONE */
            break;
        case AD_MAGM:
            if (uhave(ANTIMAGIC))
                res = EXPL_HERO;
            break;
        case AD_FIRE:
            if (uhave(FIRE_RES))
                res = EXPL_HERO;
            break;
        case AD_COLD:
            if (uhave(COLD_RES))
                res = EXPL_HERO;
            break;
        case AD_DISN:
            if ((olet === WAND_CLASS)
                ? (nonliving(m.data) || is_demon(m.data))
                : uhave(DISINT_RES))
                res = EXPL_HERO;
            break;
        case AD_ELEC:
            if (uhave(SHOCK_RES))
                res = EXPL_HERO;
            break;
        case AD_DRST:
            if (uhave(POISON_RES))
                res = EXPL_HERO;
            break;
        case AD_ACID:
            if (uhave(ACID_RES))
                res = EXPL_HERO;
            break;
        default:
            /* impossible("explosion type %d?", adtyp) */
            break;
        }

    } else {
        /* 'm' is a monster */
        switch (adtyp) {
        case AD_PHYS:
            break;
        case AD_MAGM:
            if (resists_magm(m))
                res = EXPL_MON;
            break;
        case AD_FIRE:
            if (resists_fire(m))
                res = EXPL_MON;
            break;
        case AD_COLD:
            if (resists_cold(m))
                res = EXPL_MON;
            break;
        case AD_DISN:
            if ((olet === WAND_CLASS)
                ? (nonliving(m.data) || is_demon(m.data)
                   || is_vampshifter(m))
                : !!resists_disint(m))
                res = EXPL_MON;
            break;
        case AD_ELEC:
            if (resists_elec(m))
                res = EXPL_MON;
            break;
        case AD_DRST:
            if (resists_poison(m))
                res = EXPL_MON;
            break;
        case AD_ACID:
            if (resists_acid(m))
                res = EXPL_MON;
            break;
        default:
            /* impossible("explosion type %d?", adtyp) */
            break;
        }
    }
    return res;
}

// C ref: explode.c engulfer_explosion_msg()
async function engulfer_explosion_msg(adtyp, olet) {
    let adj = null;
    const ustuck = game.u.ustuck;

    if (digests(ustuck.data)) {
        switch (adtyp) {
        case AD_FIRE:
            adj = "heartburn";
            break;
        case AD_COLD:
            adj = "chilly";
            break;
        case AD_DISN:
            if (olet === WAND_CLASS)
                adj = "irradiated by pure energy";
            else
                adj = "perforated";
            break;
        case AD_ELEC:
            adj = "shocked";
            break;
        case AD_DRST:
            adj = "poisoned";
            break;
        case AD_ACID:
            adj = "an upset stomach";
            break;
        default:
            adj = "fried";
            break;
        }
        await pline(`${Monnam(ustuck)} gets ${adj}!`);
    } else {
        switch (adtyp) {
        case AD_FIRE:
            adj = "toasted";
            break;
        case AD_COLD:
            adj = "chilly";
            break;
        case AD_DISN:
            if (olet === WAND_CLASS)
                adj = "overwhelmed by pure energy";
            else
                adj = "perforated";
            break;
        case AD_ELEC:
            adj = "shocked";
            break;
        case AD_DRST:
            adj = "intoxicated";
            break;
        case AD_ACID:
            adj = "burned";
            break;
        default:
            adj = "fried";
            break;
        }
        await pline(`${Monnam(ustuck)} gets slightly ${adj}!`);
    }
}

// C ref: explode.c explode()
/* Note: anything with a AT_BOOM AD_PHYS attack uses PHYS_EXPL_TYPE for type.
 *
 * Important note about Half_physical_damage:
 *      Unlike losehp(), explode() makes the Half_physical_damage adjustments
 *      itself, so the caller should never have done that ahead of time.
 */
export async function explode(
    x, y,       /* explosion's location; adjacent spots are also affected */
    type,       /* same as in zap.c; -(wand typ) for some WAND_CLASS */
    dam,        /* damage amount */
    olet,       /* object class or BURNING_OIL or MON_EXPLODE */
    expltype) { /* explosion type: controls color of explosion glyphs */
    const g = game;
    const u = g.u;
    let i, j, damu = dam;
    let starting = true;
    let visible, any_shield;
    let uhurt = 0; /* 0=unhurt, 1=items damaged, 2=you and items damaged */
    let str = null;
    let mtmp, mdef = null;
    let adtyp;
    const explmask = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    let xx, yy;
    const shopdamage = { v: false };
    let generic = false, do_hallu = false, grabbed, grabbing;
    const grabxy = { x: 0, y: 0 };
    let hallu_buf = null;
    let exploding_wand_typ = 0;
    const you_exploding = (olet === MON_EXPLODE && type >= 0);
    let didmsg = false;

    if (olet === WAND_CLASS) { /* retributive strike */
        /* 'type' is passed as (wand's object type * -1); save
           object type and convert 'type' itself to zap-type */
        if (type < 0) {
            type = -type;
            exploding_wand_typ = type;
            /* most attack wands produce specific explosions;
               other types produce a generic magical explosion */
            if (objects[type].oc_dir === RAY
                && type !== WAN_DIGGING && type !== WAN_SLEEP) {
                type -= WAN_MAGIC_MISSILE;
                if (type < 0 || type > 9) {
                    /* impossible("explode: wand has bad zap type (%d).") */
                    type = 0;
                }
            } else
                type = 0;
        }
        switch (g.urole.mnum) { /* Role_switch */
        case PM_CLERIC:
        case PM_MONK:
        case PM_WIZARD:
            damu = Math.trunc(damu / 5);
            break;
        case PM_HEALER:
        case PM_KNIGHT:
            damu = Math.trunc(damu / 2);
            break;
        default:
            break;
        }
    } else if (olet === BURNING_OIL) {
        /* used to provide extra information to zap_over_floor() */
        exploding_wand_typ = POT_OIL;
    } else if (olet === SCROLL_CLASS) {
        /* ditto */
        exploding_wand_typ = SCR_FIRE;
    } else if (olet === TRAP_EXPLODE) {
        type = 0; /* hardcoded to generic magic explosion */
    }
    /* muse_unslime: SCR_FIRE */
    if (expltype < 0) {
        /* hero gets credit/blame for killing this monster, not others */
        mdef = m_at(x, y);
        expltype = -expltype;
    }
    /* if hero is engulfed and caused the explosion, only hero and
       engulfer will be affected */
    const inside_engulfer = (!!u.uswallow && type >= 0);
    /* held but not engulfed implies holder is reaching into second spot
       so might get hit by double damage */
    grabbed = grabbing = false;
    if (u.ustuck && !u.uswallow) {
        if (Upolyd() && sticks_ex(g.youmonst.data))
            grabbing = true;
        else
            grabbed = true;
        grabxy.x = u.ustuck.mx;
        grabxy.y = u.ustuck.my;
    } else
        grabxy.x = grabxy.y = 0; /* lint suppression */

    if (olet === MON_EXPLODE && !you_exploding) {
        /* when explode() is called recursively, svk.killer.name might change
           so retain a copy of the current value for this explosion */
        str = killer().name;
        do_hallu = (Hallucination()
                    && (strstri(str, "'s explosion") >= 0
                        || strstri(str, "s' explosion") >= 0));
    }
    if (type === PHYS_EXPL_TYPE) {
        /* currently only gas spores */
        adtyp = AD_PHYS;
    } else {
        /* If str is e.g. "flaming sphere's explosion" from above, we want to
         * still assign adtyp appropriately, but not replace str. */
        let adstr = null;

        switch (Math.abs(type) % 10) {
        case 0:
            adstr = "magical blast";
            adtyp = AD_MAGM;
            break;
        case 1:
            adstr = (olet === BURNING_OIL) ? "burning oil"
                     : (olet === SCROLL_CLASS) ? "tower of flame" : "fireball";
            /* fire damage, not physical damage */
            adtyp = AD_FIRE;
            break;
        case 2:
            adstr = "ball of cold";
            adtyp = AD_COLD;
            break;
        case 4:
            adstr = (olet === WAND_CLASS) ? "death field"
                                          : "disintegration field";
            adtyp = AD_DISN;
            break;
        case 5:
            adstr = "ball of lightning";
            adtyp = AD_ELEC;
            break;
        case 6:
            adstr = "poison gas cloud";
            adtyp = AD_DRST;
            break;
        case 7:
            adstr = "splash of acid";
            adtyp = AD_ACID;
            break;
        default:
            /* impossible("explosion base type %d?", type) */
            return;
        }
        if (!str)
            str = adstr;
    }

    any_shield = visible = false;
    for (i = 0; i < 3; i++)
        for (j = 0; j < 3; j++) {
            xx = x + i - 1;
            yy = y + j - 1;
            if (!isok(xx, yy)) {
                explmask[i][j] = EXPL_SKIP;
                continue;
            }
            explmask[i][j] = EXPL_NONE;

            if (u_at(xx, yy)) {
                explmask[i][j] = explosionmask(g.youmonst, adtyp, olet);
            }
            /* can be both you and mtmp if you're swallowed or riding */
            mtmp = m_at(xx, yy);
            if (!mtmp && u_at(xx, yy))
                mtmp = u.usteed;
            if (mtmp && DEADMONSTER(mtmp))
                mtmp = null;
            if (mtmp) {
                explmask[i][j] |= explosionmask(mtmp, adtyp, olet);
            }

            if (mtmp && cansee(xx, yy) && !canspotmon(mtmp))
                map_invisible(xx, yy);
            else if (!mtmp)
                unmap_invisible(xx, yy);
            if (cansee(xx, yy))
                visible = true;
            if ((explmask[i][j] & (EXPL_MON | EXPL_HERO)) !== 0)
                any_shield = true;
        }

    if (visible) {
        /* Start the explosion */
        for (i = 0; i < 3; i++)
            for (j = 0; j < 3; j++) {
                if (explmask[i][j] === EXPL_SKIP)
                    continue;
                xx = x + i - 1;
                yy = y + j - 1;
                tmp_at(starting ? DISP_BEAM : DISP_CHANGE,
                       explosion_to_glyph(expltype, explosion[i][j]));
                tmp_at(xx, yy);
                starting = false;
            }
        /* curs_on_u(): will flush screen and output */

        /* if (any_shield && flags.sparkle): the shield effect glyphs are
           shown and then covered by the blast symbols again; transient
           display only, (no input is read while they show) */
        void any_shield;
        /* else nh_delay_output() twice */

        tmp_at(DISP_END, 0); /* clear the explosion */
    } else {
        if (olet === MON_EXPLODE || olet === TRAP_EXPLODE) {
            str = "explosion";
            generic = true;
        }
        if (!Deaf() && olet !== SCROLL_CLASS) {
            /* Soundeffect(se_blast, 75) */
            await You_hear("a blast.");
            didmsg = true;
        }
    }

    if (!Deaf() && !didmsg)
        await pline("Boom!");

    /* apply effects to monsters and floor objects first, in case the
       damage to the hero is fatal and leaves bones */
    if (dam) {
        for (i = 0; i < 3; i++) {
            for (j = 0; j < 3; j++) {
                let itemdmg = 0;

                if (explmask[i][j] === EXPL_SKIP)
                    continue;
                xx = x + i - 1;
                yy = y + j - 1;
                if (u_at(xx, yy)) {
                    uhurt = ((explmask[i][j] & EXPL_HERO) !== 0) ? 1 : 2;
                    /* If the player is attacking via polyself into something
                     * with an explosion attack, leave them (and their gear)
                     * unharmed, to avoid punishing them from using such
                     * polyforms creatively */
                    if (!g.context.mon_moving && you_exploding)
                        uhurt = 0;
                } else if (inside_engulfer) {
                    /* for inside_engulfer, only <u.ux,u.uy> is affected */
                    continue;
                }

                /* Affect the floor unless the player caused the explosion
                 * from inside their engulfer. */
                if (!(u.uswallow && !g.context.mon_moving))
                    await zap_over_floor(xx, yy, type, shopdamage, false,
                                         exploding_wand_typ);

                mtmp = m_at(xx, yy);
                if (!mtmp && u_at(xx, yy))
                    mtmp = u.usteed;
                if (!mtmp)
                    continue;
                if (do_hallu) {
                    let tryct = 0;

                    /* replace "gas spore" with a different description
                       for each target (we can't distinguish personal names
                       like "Barney" here in order to suppress "the" below,
                       so avoid any which begins with a capital letter) */
                    do {
                        hallu_buf = `${s_suffix(rndmonnam(null))} explosion`;
                    } while (hallu_buf[0] !== lowc(hallu_buf[0]) && ++tryct < 20);
                    str = hallu_buf;
                }
                if (engulfing_u(mtmp)) {
                    await engulfer_explosion_msg(adtyp, olet);
                } else if (cansee(xx, yy)) {
                    if (mtmp.m_ap_type)
                        seemimic(mtmp);
                    await pline(`${Monnam(mtmp)} is caught in the ${str}!`);
                }

                itemdmg = await destroy_items(mtmp, adtyp, dam);
                if (adtyp === AD_FIRE) {
                    await burnarmor(mtmp);
                    await ignite_items(mtmp.minvent);
                }

                if ((explmask[i][j] & EXPL_MON) !== 0) {
                    /* Damage from ring/wand explosion isn't itself
                     * electrical in nature, nor is damage from freezing
                     * potion really cold in nature, nor is damage from
                     * boiling potion or exploding oil; only burning items
                     * damage is the "same type" as the explosion.  Because
                     * this is imperfect and marginal (burning items only
                     * deal 1 damage), ignore it for golemeffects(). */
                    await golemeffects(mtmp, adtyp, dam);
                    mtmp.mhp -= itemdmg; /* item destruction dmg */
                } else {
                    /* Call resist with 0 and do damage manually so 1) we can
                     * get out the message before doing the damage, and 2) we
                     * can call mondied, not killed, if it's not your blast.
                     */
                    let mdam = dam;

                    if (await resist_async(mtmp, olet, 0, false)) {
                        /* inside_engulfer: <xx,yy> == <u.ux,u.uy> */
                        if (cansee(xx, yy) || inside_engulfer)
                            await pline(`${Monnam(mtmp)} resists the ${str}!`);
                        mdam = Math.trunc((dam + 1) / 2);
                    }
                    /* if grabber is reaching into hero's spot and
                       hero's spot is within explosion radius, grabber
                       gets hit by double damage */
                    if (grabbed && mtmp === u.ustuck && next2u(x, y))
                        mdam *= 2;
                    /* being resistant to opposite type of damage makes
                       target more vulnerable to current type of damage
                       (when target is also resistant to current type,
                       we won't get here) */
                    if (resists_cold(mtmp) && adtyp === AD_FIRE)
                        mdam *= 2;
                    else if (resists_fire(mtmp) && adtyp === AD_COLD)
                        mdam *= 2;
                    mtmp.mhp -= mdam + itemdmg;
                }
                if (DEADMONSTER(mtmp)) {
                    const xkflg = ((adtyp === AD_FIRE
                                    && completelyburns(mtmp.data))
                                   ? XKILL_NOCORPSE : 0);

                    if (!g.context.mon_moving) {
                        await xkilled(mtmp, XKILL_GIVEMSG | xkflg);
                    } else if (mdef && mtmp === mdef) {
                        /* 'mdef' killed self trying to cure being turned
                         * into slime due to some action by the player.
                         * Hero gets the credit (experience) and most of
                         * the blame (possible loss of alignment and/or
                         * luck and/or telepathy depending on mtmp) but
                         * doesn't break pacifism.  xkilled()'s message
                         * would be "you killed <mdef>" so give our own.
                         */
                        if (cansee(mtmp.mx, mtmp.my) || canspotmon(mtmp))
                            await pline(`${Monnam(mtmp)} is ${
                                xkflg ? "burned completely"
                                : nonliving(mtmp.data) ? "destroyed"
                                  : "killed"}!`);
                        await xkilled(mtmp, XKILL_NOMSG | XKILL_NOCONDUCT | xkflg);
                    } else {
                        if (xkflg)
                            adtyp = AD_RBRE; /* no corpse */
                        await monkilled(mtmp, "", adtyp);
                    }
                } else if (!g.context.mon_moving) {
                    /* all affected monsters, even if mdef is set */
                    await setmangry(mtmp, true);
                }
            }
        }
    }

    /* Do your injury last */
    if (uhurt) {
        /* give message for any monster-induced explosion
           or player-induced one other than scroll of fire */
        if ((g.flags.verbose ?? true) && (type < 0 || olet !== SCROLL_CLASS)) {
            if (do_hallu) { /* (see explanation above) */
                do {
                    hallu_buf = `${s_suffix(rndmonnam(null))} explosion`;
                } while (hallu_buf[0] !== lowc(hallu_buf[0]));
                str = hallu_buf;
            }
            await You(`are caught in the ${str}!`);
            g.iflags.last_msg = PLNMSG_CAUGHT_IN_EXPLOSION;
        }
        /* do property damage first, in case we end up leaving bones */
        if (adtyp === AD_FIRE)
            await burn_away_slime();
        if (Invulnerable()) {
            damu = 0;
            await You("are unharmed!");
        } else if (adtyp === AD_PHYS || adtyp === AD_ACID)
            damu = Maybe_Half_Phys(damu);
        if (adtyp === AD_FIRE) {
            await burnarmor(g.youmonst);
            await ignite_items(g.invent);
        }
        await destroy_items(g.youmonst, adtyp, dam);

        await ugolemeffects(adtyp, damu);
        if (uhurt === 2) {
            /* if poly'd hero is grabbing another victim, hero takes
               double damage (note: don't rely on u.ustuck here because
               that victim might have been killed when hit by the blast) */
            if (grabbing && dist2_ex(grabxy.x, grabxy.y, x, y) <= 2)
                damu *= 2;
            /* hero does not get same fire-resistant vs cold and
               cold-resistant vs fire double damage as monsters [why not?] */
            if (Upolyd())
                u.mh -= damu;
            else
                u.uhp -= damu;
            g.disp_botl = true;
        }

        /* You resisted the damage, lets not keep that to ourselves */
        if (uhurt === 1)
            monstseesu_ad(adtyp);
        else
            monstunseesu_ad(adtyp);

        if (u.uhp <= 0 || (Upolyd() && u.mh <= 0)) {
            if (Upolyd()) {
                throw new Error('explode(): rehumanize() not ported yet');
            } else {
                if (olet === MON_EXPLODE) {
                    if (generic) /* explosion was unseen; str=="explosion", */
                        ; /* svk.killer.name=="gas spore's explosion". */
                    else if (str !== killer().name && str !== hallu_buf)
                        killer().name = str;
                    killer().format = KILLED_BY_AN;
                } else if (olet === TRAP_EXPLODE) {
                    killer().format = NO_KILLER_PREFIX;
                    killer().name = `caught ${uhim()}self in a ${str}`;
                } else if (type >= 0 && olet !== SCROLL_CLASS) {
                    killer().format = NO_KILLER_PREFIX;
                    killer().name = `caught ${uhim()}self in ${uhis()} own ${str}`;
                } else {
                    killer().format = (str.toLowerCase() === "tower of flame"
                                       || str.toLowerCase() === "fireball")
                                      ? KILLED_BY_AN : KILLED_BY;
                    killer().name = str;
                }
                if (g.iflags.last_msg === PLNMSG_CAUGHT_IN_EXPLOSION
                    || g.iflags.last_msg === PLNMSG_TOWER_OF_FLAME) /*seffects()*/
                    await pline("It is fatal.");
                else
                    await pline_The(`${str} is fatal.`);
                /* Known BUG: BURNING suppresses corpse in bones data,
                   but done does not handle killer reason correctly */
                await done((adtyp === AD_FIRE) ? BURNING : DIED);
            }
        }
        exercise(A_STR, false);
    }

    if (shopdamage.v) {
        throw new Error('explode(): pay_for_damage() not ported yet');
    }

    /* explosions are noisy */
    i = dam * dam;
    if (i < 50)
        i = 50; /* in case random damage is very small */
    if (inside_engulfer)
        i = Math.trunc((i + 3) / 4);
    await wake_nearto(x, y, i);
}

import { sticks as sticks_ex } from './engrave.js';
import { dist2 as dist2_ex } from './hacklib.js';
import { OBJ_AT as OBJ_AT_ex } from './const.js';
import { newsym as newsym_ex } from './display.js';
import { M1_CONCEAL as M1_CONCEAL_ex } from './monsters.js';
import { maybe_unhide_at as maybe_unhide_at_ex } from './mon.js';

// C ref: explode.c scatter()
/*
 * Scatter objects at a location in random directions.  Returns the
 * number of objects that moved.  Only the case where there is nothing
 * at <sx,sy> to scatter is ported; moving objects throws a stop.
 * (shop_origin/credit_report() only matter for objects that get
 * scattered out of a shop.)
 */
export async function scatter(sx, sy, /* location of objects to scatter */
                              blastforce, /* force behind the scattering */
                              scflags,
                              obj) { /* only scatter this obj */
    const u = game.u;
    const individual_object = obj ? true : false;
    const total = 0;
    let mtmp;
    void blastforce; void scflags;

    if (individual_object ? obj : OBJ_AT_ex(sx, sy))
        throw new Error('scatter(): scattering objects not ported yet');

    newsym_ex(sx, sy);
    if (u_at(sx, sy) && u.uundetected
        && (game.youmonst.data.mflags1 & M1_CONCEAL_ex) !== 0) /* hides_under() */
        throw new Error('scatter(): hideunder() not ported yet');
    if ((mtmp = m_at(sx, sy)) != null && mtmp.mtrapped)
        mtmp.mtrapped = 0;
    maybe_unhide_at_ex(sx, sy);
    return total;
}

// C ref: explode.c adtyp_to_expltype()
/* Convert an adtyp into an explosion type. */
export function adtyp_to_expltype(adtyp) {
    switch (adtyp) {
    case AD_ELEC:
        /* Electricity isn't magical, but there currently isn't an electric
         * explosion type. Magical is the next best thing. */
    case AD_SPEL: // eslint-disable-line no-fallthrough
    case AD_DREN:
    case AD_ENCH:
        return EXPL_MAGICAL;
    case AD_FIRE:
        return EXPL_FIERY;
    case AD_COLD:
        return EXPL_FROSTY;
    case AD_DRST:
    case AD_DRDX:
    case AD_DRCO:
    case AD_DISE:
    case AD_PEST:
    case AD_PHYS: /* gas spore */
        return EXPL_NOXIOUS;
    default:
        /* impossible("adtyp_to_expltype: bad explosion type %d", adtyp) */
        return EXPL_FIERY;
    }
}

// C ref: explode.c mon_explodes()
/* A monster explodes in a way that produces a real explosion (e.g. a sphere
 * or gas spore, not a yellow light or similar).
 * This is some common code between explmu() and explmm().
 */
export async function mon_explodes(mon, mattk) {
    let dmg;
    let type;
    if (mattk.damn) {
        dmg = d(mattk.damn, mattk.damd);
    } else if (mattk.damd) {
        dmg = d(mon.data.mlevel + 1, mattk.damd);
    } else {
        dmg = 0;
    }

    if (mattk.adtyp === AD_PHYS) {
        type = PHYS_EXPL_TYPE;
    } else if (mattk.adtyp >= AD_MAGM && mattk.adtyp <= AD_SPC2) {
        /* The -1, +20, *-1 math is to set it up as a 'monster breath' type
         * for the explosions (it isn't, but this is the closest analogue). */
        type = -((mattk.adtyp - 1) + 20);
    } else {
        /* impossible("unknown type for mon_explode %d", mattk->adtyp) */
        return;
    }

    /* Kill it now so it won't appear to be caught in its own explosion.
     * Must check to see if already dead - which happens if this is called
     * from an AT_BOOM attack upon death. */
    if (!DEADMONSTER(mon)) {
        await mondead(mon);
    }

    /* This might end up killing you, too; you never know...
     * also, it is used in explode() messages */
    killer().name = `${s_suffix(pmname(mon.data, mon.female ? 1 : 0))} explosion`;
    killer().format = KILLED_BY_AN;

    await explode(mon.mx, mon.my, type, dmg, MON_EXPLODE,
                  adtyp_to_expltype(mattk.adtyp));

    /* reset killer */
    killer().name = '';
}
