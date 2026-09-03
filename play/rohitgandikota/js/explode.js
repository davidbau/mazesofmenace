// explode.js, explosions.
// C ref: src/explode.c
import { game } from './gstate.js';
import { d, rn2, rnd } from './rng.js';
import { isok, dist2, distu, s_suffix } from './hacklib.js';
import { ATTKS, PMNAMES, MFLAGS } from './monst_data.js';
import { OCLASSES, ONAMES, MATERIALS } from './objects_data.js';
import { A_STR, BURNING_OIL, KILLED_BY_AN, KILLED_BY, NO_KILLER_PREFIX,
         LOST_EXPLODING, XKILL_GIVEMSG, XKILL_NOCORPSE, XKILL_NOMSG,
         XKILL_NOCONDUCT, MON_EXPLODE, TRAP_EXPLODE, PHYS_EXPL_TYPE,
         EXPL_NOXIOUS, EXPL_MAGICAL, EXPL_FIERY, EXPL_FROSTY,
         PLNMSG_CAUGHT_IN_EXPLOSION, PLNMSG_TOWER_OF_FLAME, BURNING, DIED,
         RAY, MAY_FRACTURE, MAY_DESTROY, MAY_HITMON, MAY_HITYOU, VIS_EFFECTS,
         LARGEST_INT, N_DIRS, ZAP_POS, IS_SINK, STONE, xdir, ydir, u_at,
         engulfing_u, Upolyd, Mgender, STATUE_TRAP, SHOPBASE, DISP_BEAM,
         DISP_CHANGE, DISP_END } from './const.js';
import { Fire_resistance, Cold_resistance, Shock_resistance, Antimagic,
         Disint_resistance, Poison_resistance, Acid_resistance, Deaf,
         Hallucination } from './youprop.js';
import { nonliving, is_demon, resists_magm, resists_fire, resists_cold,
         resists_disint, resists_elec, resists_poison, resists_acid, digests,
         sticks, completelyburns, hides_under, monstseesu, monstunseesu,
         cvt_adtyp_to_mseenres } from './mondata.js';
import { is_vampshifter, DEADMONSTER } from './monst.js';
import { m_at, t_at, setmangry, wake_nearto, xkilled, monkilled, mondead,
         seemimic, maybe_unhide_at } from './mon.js';
import { cansee } from './vision.js';
import { display_cmap_at, newsym, pline, map_invisible, unmap_invisible,
         canspotmon, flush_screen } from './display.js';
import { You, You_hear, pline_The } from './pline.js';
import { Monnam, rndmonnam, pmname } from './do_name.js';
import { exercise } from './attrib.js';
import { cmap_names } from './drawing_data.js';
import { CLR_BLACK, CLR_GREEN, CLR_BROWN, CLR_BLUE, CLR_MAGENTA, CLR_ORANGE,
         CLR_WHITE, CLR_BRIGHT_BLUE } from './terminal.js';
import { zap_over_floor, destroy_items, resist, fracture_rock, break_statue }
    from './zap.js';
import { burnarmor, ignite_items, deltrap, thitu } from './trap.js';
import { golemeffects } from './uhitm.js';
import { ugolemeffects, rehumanize } from './polyself.js';
import { burn_away_slime, end_burn } from './timeout.js';
import { done } from './end.js';
import { pay_for_damage, shop_keeper, costly_spot, credit_report, addtobill }
    from './shk.js';
import { in_rooms, nomul } from './hack.js';
import { uhim, uhis } from './mhitu.js';
import { unpunish } from './read.js';
import { splitobj, place_object } from './mkobj.js';
import { obj_extract_self, sobj_at, stackobj } from './invent.js';
import { Tobjnam } from './objnam.js';
import { breaks } from './dothrow.js';
import { closed_door } from './cmd.js';
import { ohitmon } from './mthrowu.js';
import { dmgval } from './weapon.js';
import { flooreffects } from './do.js';
import { hideunder } from './makemon.js';
import { stop_occupation } from './allmain.js';

function note_unported_explode(what) {
    (game.unported ||= new Set()).add('explode:' + what);
}

/* src/explode.c:26 explosion[][] */
const explosion = [
    [cmap_names.S_expl_tl, cmap_names.S_expl_ml, cmap_names.S_expl_bl],
    [cmap_names.S_expl_tc, cmap_names.S_expl_mc, cmap_names.S_expl_bc],
    [cmap_names.S_expl_tr, cmap_names.S_expl_mr, cmap_names.S_expl_br],
];

/* src/display.c:2670 explodecolors[], indexed by EXPL_xxx */
const explodecolors = [
    CLR_BLACK, CLR_GREEN, CLR_BROWN, CLR_BLUE, CLR_MAGENTA, CLR_ORANGE,
    CLR_WHITE,
];

/* src/display.c shield_static[], SHIELD_COUNT frames of the shield effect */
const shield_static = [
    cmap_names.S_ss1, cmap_names.S_ss2, cmap_names.S_ss3, cmap_names.S_ss2,
    cmap_names.S_ss1, cmap_names.S_ss2, cmap_names.S_ss4,
    cmap_names.S_ss1, cmap_names.S_ss2, cmap_names.S_ss3, cmap_names.S_ss2,
    cmap_names.S_ss1, cmap_names.S_ss2, cmap_names.S_ss4,
    cmap_names.S_ss1, cmap_names.S_ss2, cmap_names.S_ss3, cmap_names.S_ss2,
    cmap_names.S_ss1, cmap_names.S_ss2, cmap_names.S_ss4,
];
const SHIELD_COUNT = shield_static.length;

/* src/explode.c:33 enum explode_action */
const EXPL_NONE = 0, /* not specified yet or no shield effect needed */
      EXPL_MON  = 1, /* monster is affected */
      EXPL_HERO = 2, /* hero is affected */
      EXPL_SKIP = 4; /* don't apply shield effect (out of bounds) */

/* include/youprop.h:341 Half_physical_damage, include/hack.h:1236
   Maybe_Half_Phys() */
const Half_physical_damage = () => !!(game.u.intrinsic?.HHalf_physical_damage
                                      || game.u.uprops?.HALF_PHDAM);
const Maybe_Half_Phys = (dmg) =>
    (Half_physical_damage() ? Math.trunc((dmg + 1) / 2) : dmg);
/* include/hack.h next2u(), include/mondata.h bigmonst() */
const next2u = (px, py) => distu(px, py) <= 2;
const bigmonst = (ptr) => ptr.msize >= MFLAGS.MZ_LARGE;

// src/explode.c:41 explosionmask(), does the target shrug the blast off?
function explosionmask(m, adtyp, olet) {
    let res = EXPL_NONE;

    if (m === game.youmonst) {
        switch (adtyp) {
        case ATTKS.AD_PHYS:
            break;
        case ATTKS.AD_MAGM:
            if (Antimagic())
                res = EXPL_HERO;
            break;
        case ATTKS.AD_FIRE:
            if (Fire_resistance())
                res = EXPL_HERO;
            break;
        case ATTKS.AD_COLD:
            if (Cold_resistance())
                res = EXPL_HERO;
            break;
        case ATTKS.AD_DISN:
            if ((olet === OCLASSES.WAND_CLASS)
                ? (nonliving(m.data) || is_demon(m.data))
                : Disint_resistance())
                res = EXPL_HERO;
            break;
        case ATTKS.AD_ELEC:
            if (Shock_resistance())
                res = EXPL_HERO;
            break;
        case ATTKS.AD_DRST:
            if (Poison_resistance())
                res = EXPL_HERO;
            break;
        case ATTKS.AD_ACID:
            if (Acid_resistance())
                res = EXPL_HERO;
            break;
        default:
            /* impossible("explosion type %d?", adtyp); */
            break;
        }
    } else {
        switch (adtyp) {
        case ATTKS.AD_PHYS:
            break;
        case ATTKS.AD_MAGM:
            if (resists_magm(m))
                res = EXPL_MON;
            break;
        case ATTKS.AD_FIRE:
            if (resists_fire(m))
                res = EXPL_MON;
            break;
        case ATTKS.AD_COLD:
            if (resists_cold(m))
                res = EXPL_MON;
            break;
        case ATTKS.AD_DISN:
            if ((olet === OCLASSES.WAND_CLASS)
                ? (nonliving(m.data) || is_demon(m.data)
                   || is_vampshifter(m))
                : !!resists_disint(m))
                res = EXPL_MON;
            break;
        case ATTKS.AD_ELEC:
            if (resists_elec(m))
                res = EXPL_MON;
            break;
        case ATTKS.AD_DRST:
            if (resists_poison(m))
                res = EXPL_MON;
            break;
        case ATTKS.AD_ACID:
            if (resists_acid(m))
                res = EXPL_MON;
            break;
        default:
            /* impossible("explosion type %d?", adtyp); */
            break;
        }
    }
    return res;
}

// src/explode.c:118 engulfer_explosion_msg(), the engulfer takes the blast.
async function engulfer_explosion_msg(adtyp, olet) {
    let adj = null;

    if (digests(game.u.ustuck.data)) {
        switch (adtyp) {
        case ATTKS.AD_FIRE:
            adj = 'heartburn';
            break;
        case ATTKS.AD_COLD:
            adj = 'chilly';
            break;
        case ATTKS.AD_DISN:
            if (olet === OCLASSES.WAND_CLASS)
                adj = 'irradiated by pure energy';
            else
                adj = 'perforated';
            break;
        case ATTKS.AD_ELEC:
            adj = 'shocked';
            break;
        case ATTKS.AD_DRST:
            adj = 'poisoned';
            break;
        case ATTKS.AD_ACID:
            adj = 'an upset stomach';
            break;
        default:
            adj = 'fried';
            break;
        }
        await pline(`${Monnam(game.u.ustuck)} gets ${adj}!`);
    } else {
        switch (adtyp) {
        case ATTKS.AD_FIRE:
            adj = 'toasted';
            break;
        case ATTKS.AD_COLD:
            adj = 'chilly';
            break;
        case ATTKS.AD_DISN:
            if (olet === OCLASSES.WAND_CLASS)
                adj = 'overwhelmed by pure energy';
            else
                adj = 'perforated';
            break;
        case ATTKS.AD_ELEC:
            adj = 'shocked';
            break;
        case ATTKS.AD_DRST:
            adj = 'intoxicated';
            break;
        case ATTKS.AD_ACID:
            adj = 'burned';
            break;
        default:
            adj = 'fried';
            break;
        }
        await pline(`${Monnam(game.u.ustuck)} gets slightly ${adj}!`);
    }
}

// src/explode.c:199 explode(), a 3x3 explosion at <x,y>.  type is a zap
// type as in zap.c, or -(wand typ) for a retributive strike; olet is the
// object class or BURNING_OIL or MON_EXPLODE; expltype picks the colors.
export async function explode(x, y, type, dam, olet, expltype) {
    let i, j, k, damu = dam;
    let starting = true;
    let visible, any_shield;
    let uhurt = 0; /* 0=unhurt, 1=items damaged, 2=you and items damaged */
    let str = null;
    let mtmp, mdef = null;
    let adtyp;
    const explmask = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    let xx, yy;
    const shopdamage = { v: false };
    let generic = false,
        do_hallu = false, inside_engulfer, grabbed, grabbing;
    const grabxy = { x: 0, y: 0 };
    let hallu_buf = '';
    let exploding_wand_typ = 0;
    const you_exploding = (olet === MON_EXPLODE && type >= 0);
    let didmsg = false;
    const u = game.u;

    if (olet === OCLASSES.WAND_CLASS) { /* retributive strike */
        /* 'type' is passed as (wand's object type * -1); save
           object type and convert 'type' itself to zap-type */
        if (type < 0) {
            type = -type;
            exploding_wand_typ = type;
            /* most attack wands produce specific explosions;
               other types produce a generic magical explosion */
            if (game.objects[type].oc_dir === RAY
                && type !== ONAMES.WAN_DIGGING && type !== ONAMES.WAN_SLEEP) {
                type -= ONAMES.WAN_MAGIC_MISSILE;
                if (type < 0 || type > 9) {
                    /* impossible("explode: wand has bad zap type (%d).") */
                    type = 0;
                }
            } else
                type = 0;
        }
        switch (game.urole?.mnum) {
        case PMNAMES.PM_CLERIC:
        case PMNAMES.PM_MONK:
        case PMNAMES.PM_WIZARD:
            damu = Math.trunc(damu / 5);
            break;
        case PMNAMES.PM_HEALER:
        case PMNAMES.PM_KNIGHT:
            damu = Math.trunc(damu / 2);
            break;
        default:
            break;
        }
    } else if (olet === BURNING_OIL) {
        /* used to provide extra information to zap_over_floor() */
        exploding_wand_typ = ONAMES.POT_OIL;
    } else if (olet === OCLASSES.SCROLL_CLASS) {
        /* ditto */
        exploding_wand_typ = ONAMES.SCR_FIRE;
    } else if (olet === TRAP_EXPLODE) {
        type = 0; /* hardcoded to generic magic explosion */
    }
    /* muse_unslime: SCR_FIRE */
    if (expltype < 0) {
        mdef = m_at(x, y);
        expltype = -expltype;
    }
    /* if hero is engulfed and caused the explosion, only hero and
       engulfer will be affected */
    inside_engulfer = (u.uswallow && type >= 0);
    /* being grabbed or holding a grabber doesn't prevent effects but
       can make the hero be treated as if adjacent to the explosion,
       so might get hit by double damage */
    grabbed = grabbing = false;
    if (u.ustuck && !u.uswallow) {
        if (Upolyd(u) && sticks(game.youmonst.data))
            grabbing = true;
        else
            grabbed = true;
        grabxy.x = u.ustuck.mx;
        grabxy.y = u.ustuck.my;
    } else
        grabxy.x = grabxy.y = 0; /* lint suppression */
    /* a monster's explosion sets killer.name; killing another monster
       in the explosion could overwrite it via done_in_by()
       so retain a copy of the current value for this explosion */
    if (olet === MON_EXPLODE && !you_exploding) {
        str = (game.killer?.name ?? '');
        do_hallu = (Hallucination()
                    && (str.toLowerCase().includes("'s explosion")
                        || str.toLowerCase().includes("s' explosion")));
    }
    if (type === PHYS_EXPL_TYPE) {
        adtyp = ATTKS.AD_PHYS;
    } else {
        let adstr = null;

        switch (Math.abs(type) % 10) {
        case 0:
            adstr = 'magical blast';
            adtyp = ATTKS.AD_MAGM;
            break;
        case 1:
            adstr = (olet === BURNING_OIL) ? 'burning oil'
                     : (olet === OCLASSES.SCROLL_CLASS) ? 'tower of flame'
                       : 'fireball';
            adtyp = ATTKS.AD_FIRE;
            break;
        case 2:
            adstr = 'ball of cold';
            adtyp = ATTKS.AD_COLD;
            break;
        case 4:
            adstr = (olet === OCLASSES.WAND_CLASS) ? 'death field'
                                                   : 'disintegration field';
            adtyp = ATTKS.AD_DISN;
            break;
        case 5:
            adstr = 'ball of lightning';
            adtyp = ATTKS.AD_ELEC;
            break;
        case 6:
            adstr = 'poison gas cloud';
            adtyp = ATTKS.AD_DRST;
            break;
        case 7:
            adstr = 'splash of acid';
            adtyp = ATTKS.AD_ACID;
            break;
        default:
            /* impossible("explosion base type %d?", type); */
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
                explmask[i][j] = explosionmask(game.youmonst, adtyp, olet);
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
        /* Start the explosion.  tmp_at(DISP_BEAM) then one glyph per
           cell; the JS display paints the transient cmap directly. */
        for (i = 0; i < 3; i++)
            for (j = 0; j < 3; j++) {
                if (explmask[i][j] === EXPL_SKIP)
                    continue;
                xx = x + i - 1;
                yy = y + j - 1;
                display_cmap_at(explosion[i][j], xx, yy,
                                explodecolors[expltype], 'explosion');
                starting = false;
            }
        await flush_screen(1); /* curs_on_u(): will flush screen and output */

        if (any_shield && game.flags?.sparkle !== false) { /* simulate shield effect */
            for (k = 0; k < SHIELD_COUNT; k++) {
                for (i = 0; i < 3; i++)
                    for (j = 0; j < 3; j++) {
                        xx = x + i - 1;
                        yy = y + j - 1;
                        if ((explmask[i][j] & (EXPL_MON | EXPL_HERO)) !== 0)
                            display_cmap_at(shield_static[k], xx, yy,
                                            CLR_BRIGHT_BLUE, 'shield');
                    }
                await flush_screen(1); /* will flush screen and output */
                if (game.animationFrame)
                    await game.animationFrame(); /* nh_delay_output() */
            }

            /* Cover last shield glyph with blast symbol. */
            for (i = 0; i < 3; i++)
                for (j = 0; j < 3; j++) {
                    xx = x + i - 1;
                    yy = y + j - 1;
                    if ((explmask[i][j] & (EXPL_MON | EXPL_HERO)) !== 0)
                        display_cmap_at(explosion[i][j], xx, yy,
                                        explodecolors[expltype], 'explosion');
                }

        } else { /* delay a little bit. */
            if (game.animationFrame) {
                await game.animationFrame();
                await game.animationFrame();
            }
        }

        /* tmp_at(DISP_END, 0): clear the explosion */
        for (i = 0; i < 3; i++)
            for (j = 0; j < 3; j++) {
                if (explmask[i][j] === EXPL_SKIP)
                    continue;
                newsym(x + i - 1, y + j - 1);
            }
    } else {
        if (olet === MON_EXPLODE || olet === TRAP_EXPLODE) {
            str = 'explosion';
            generic = true;
        }
        if (!Deaf() && olet !== OCLASSES.SCROLL_CLASS) {
            await You_hear('a blast.');
            didmsg = true;
        }
    }
    if (!Deaf() && !didmsg)
        await pline('Boom!');

    /* do damage to monsters first, then damage to hero, so that a
       fatal explosion won't leave dead monsters behind when damage
       to the hero is fatal and leaves bones */
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
                     * that can explode, leave them (mostly) alone. */
                    if (!game.context?.mon_moving && you_exploding)
                        uhurt = 0;
                } else if (inside_engulfer) {
                    /* when swallowed, only the swallower gets affected */
                    continue;
                }
                /* for inside_engulfer, only <u.ux,u.uy> is affected */
                if (!(u.uswallow && !game.context?.mon_moving))
                    await zap_over_floor(xx, yy, type,
                                         shopdamage, false,
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
                        hallu_buf = `${s_suffix(rndmonnam())} explosion`;
                    } while (hallu_buf[0] !== hallu_buf[0].toLowerCase()
                             && ++tryct < 20);
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
                if (adtyp === ATTKS.AD_FIRE) {
                    await burnarmor(mtmp);
                    await ignite_items(mtmp.minvent || []);
                }
                if ((explmask[i][j] & EXPL_MON) !== 0) {
                    await golemeffects(mtmp, adtyp, dam);
                    mtmp.mhp -= itemdmg; /* item destruction dmg */
                } else {
                    let mdam = dam;

                    if (await resist(mtmp, olet, 0, false)) {
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
                    if (resists_cold(mtmp) && adtyp === ATTKS.AD_FIRE)
                        mdam *= 2;
                    else if (resists_fire(mtmp) && adtyp === ATTKS.AD_COLD)
                        mdam *= 2;
                    mtmp.mhp -= mdam + itemdmg;
                }
                if (DEADMONSTER(mtmp)) {
                    const xkflg = ((adtyp === ATTKS.AD_FIRE
                                    && completelyburns(mtmp.data))
                                   ? XKILL_NOCORPSE : 0);

                    if (!game.context?.mon_moving) {
                        await xkilled(mtmp, XKILL_GIVEMSG | xkflg);
                    } else if (mdef && mtmp === mdef) {
                        if (cansee(mtmp.mx, mtmp.my) || canspotmon(mtmp))
                            await pline(`${Monnam(mtmp)} is ${
                                        xkflg ? 'burned completely'
                                        : nonliving(mtmp.data) ? 'destroyed'
                                          : 'killed'}!`);
                        await xkilled(mtmp, XKILL_NOMSG | XKILL_NOCONDUCT | xkflg);
                    } else {
                        if (xkflg)
                            adtyp = ATTKS.AD_RBRE; /* no corpse */
                        await monkilled(mtmp, '', adtyp);
                    }
                } else if (!game.context?.mon_moving) {
                    /* all affected monsters, even if mdef is set */
                    await setmangry(mtmp, true);
                }
            }
        }
    }

    /* Do your injury last */
    if (uhurt) {
        /* [ALI] game.iflags.last_msg only used by seffects() for a scroll
           or player-induced one other than scroll of fire */
        if (game.flags?.verbose !== false
            && (type < 0 || olet !== OCLASSES.SCROLL_CLASS)) {
            if (do_hallu) { /* (see explanation above) */
                do {
                    hallu_buf = `${s_suffix(rndmonnam())} explosion`;
                } while (hallu_buf[0] !== hallu_buf[0].toLowerCase());
                str = hallu_buf;
            }
            await You(`are caught in the ${str}!`);
            (game.iflags ||= {}).last_msg = PLNMSG_CAUGHT_IN_EXPLOSION;
        }
        /* do property damage first, in case we end up leaving bones */
        if (adtyp === ATTKS.AD_FIRE)
            await burn_away_slime();
        if (u.uinvulnerable) {
            damu = 0;
            await You('are unharmed!');
        } else if (adtyp === ATTKS.AD_PHYS || adtyp === ATTKS.AD_ACID)
            damu = Maybe_Half_Phys(damu);
        if (adtyp === ATTKS.AD_FIRE) {
            await burnarmor(game.youmonst);
            await ignite_items(game.invent);
        }
        await destroy_items(game.youmonst, adtyp, dam);
        await ugolemeffects(adtyp, damu);

        if (uhurt === 2) {
            /* if hero was grabbed and grabber was hit by the explosion,
               hero gets hit by double damage (note: don't rely on
               u.ustuck here because that victim might have been killed
               when hit by the blast) */
            if (grabbing && dist2(grabxy.x, grabxy.y, x, y) <= 2)
                damu *= 2;
            /* [note: this assumes that `dam' and `damu' are the same;
               monsters are damaged by `dam' but hero by `damu'; hero
               doesn't get the fire-resistant vs cold double damage or
               cold-resistant vs fire double damage as monsters [why not?] */
            if (Upolyd(u))
                u.mh -= damu;
            else
                u.uhp -= damu;
            (game.disp ||= {}).botl = true;
        }
        if (uhurt === 1)
            monstseesu(cvt_adtyp_to_mseenres(adtyp));
        else
            monstunseesu(cvt_adtyp_to_mseenres(adtyp));

        if (u.uhp <= 0 || (Upolyd(u) && u.mh <= 0)) {
            if (Upolyd(u)) {
                await rehumanize();
            } else {
                const killer = (game.killer ||= { format: 0, name: '' });

                if (olet === MON_EXPLODE) {
                    if (generic) /* explosion was unseen; str=="explosion", */
                        ; /* killer.name=="gas spore's explosion". */
                    else if (str !== killer.name && str !== hallu_buf)
                        killer.name = str;
                    killer.format = KILLED_BY_AN;
                } else if (olet === TRAP_EXPLODE) {
                    killer.format = NO_KILLER_PREFIX;
                    killer.name = `caught ${uhim()}self in a ${str}`;
                } else if (type >= 0 && olet !== OCLASSES.SCROLL_CLASS) {
                    killer.format = NO_KILLER_PREFIX;
                    killer.name = `caught ${uhim()}self in ${uhis()} own ${str}`;
                } else {
                    killer.format = (str.toLowerCase() === 'tower of flame'
                                     || str.toLowerCase() === 'fireball')
                                        ? KILLED_BY_AN
                                        : KILLED_BY;
                    killer.name = str;
                }
                if (game.iflags?.last_msg === PLNMSG_CAUGHT_IN_EXPLOSION
                    || game.iflags?.last_msg === PLNMSG_TOWER_OF_FLAME) /*seffects()*/
                    await pline('It is fatal.');
                else
                    await pline_The(`${str} is fatal.`);
                /* Known BUG: BURNING suppresses corpse in bones data,
                   but done does not handle killer reason correctly */
                await done((adtyp === ATTKS.AD_FIRE) ? BURNING : DIED);
            }
        }
        exercise(A_STR, false);
    }

    if (shopdamage.v) {
        await pay_for_damage((adtyp === ATTKS.AD_FIRE) ? 'burn away'
                             : (adtyp === ATTKS.AD_COLD) ? 'shatter'
                               : (adtyp === ATTKS.AD_DISN) ? 'disintegrate'
                                 : 'destroy',
                             false);
    }

    /* explosions are noisy */
    i = dam * dam;
    if (i < 50)
        i = 50; /* in case random damage is very small */
    if (inside_engulfer)
        i = Math.trunc((i + 3) / 4);
    await wake_nearto(x, y, i);
}

// src/explode.c:721 scatter(), fling the objects at <sx,sy> (or just obj)
// outward with blastforce; returns the total quantity that moved.
export async function scatter(sx, sy, blastforce, scflags, obj) {
    let otmp;
    let tmp;
    let farthest = 0;
    let typ;
    let qtmp;
    let used_up;
    const individual_object = obj ? true : false;
    let shop_origin, lostgoods = false;
    let mtmp, shkp = null;
    let stmp;
    const schain = [];
    let total = 0;
    const u = game.u;

    /* if individual_object is set, we expect obj to be at <sx,sy>,
       otherwise we've been called to scatter whatever objects are there */
    /* if (individual_object && (obj.ox !== sx || obj.oy !== sy))
           impossible("scattered object <%d,%d> not at scatter site <%d,%d>"); */

    shop_origin = ((shkp = shop_keeper((in_rooms(sx, sy, SHOPBASE) || '\0')
                                        .charCodeAt(0))) != null
                   && costly_spot(sx, sy));
    if (shop_origin)
        credit_report(shkp, 0, true);   /* establish baseline, without msgs */

    /* svl.level.objects[sx][sy]: the top of the pile at <sx,sy> */
    const level_objects_at = (x, y) =>
        (game.level.objects || []).find(o => o.ox === x && o.oy === y) ?? null;

    while ((otmp = (individual_object ? obj
                                      : level_objects_at(sx, sy))) != null) {
        if (otmp === u.uball || otmp === u.uchain) {
            const waschain = (otmp === u.uchain);

            await pline_The('chain shatters!');
            unpunish();
            if (waschain)
                continue;
        }
        if (otmp.quan > 1) {
            qtmp = otmp.quan - 1;
            if (qtmp > LARGEST_INT)
                qtmp = LARGEST_INT;
            qtmp = rnd(qtmp);
            otmp = splitobj(otmp, qtmp);
        } else {
            obj = null; /* all used */
        }
        obj_extract_self(otmp);
        used_up = false;

        /* 9 in 10 chance of fracturing boulders or statues */
        if ((scflags & MAY_FRACTURE) !== 0
            && (otmp.otyp === ONAMES.BOULDER || otmp.otyp === ONAMES.STATUE)
            && rn2(10)) {
            if (otmp.otyp === ONAMES.BOULDER) {
                if (cansee(sx, sy)) {
                    await pline(`${Tobjnam(otmp, 'break')} apart.`);
                } else {
                    await You_hear('stone breaking.');
                }
                await fracture_rock(otmp);
                place_object(otmp, sx, sy);
                if ((otmp = sobj_at(ONAMES.BOULDER, sx, sy)) != null) {
                    /* another boulder here, restack it to the top */
                    obj_extract_self(otmp);
                    place_object(otmp, sx, sy);
                }
            } else {
                let trap;

                if ((trap = t_at(sx, sy)) && trap.ttyp === STATUE_TRAP)
                    deltrap(trap);
                if (cansee(sx, sy)) {
                    await pline(`${Tobjnam(otmp, 'crumble')}.`);
                } else {
                    await You_hear('stone crumbling.');
                }
                await break_statue(otmp);
                place_object(otmp, sx, sy); /* put fragments on floor */
            }
            newsym(sx, sy); /* in case it's beyond radius of 'farthest' */
            used_up = true;

        /* 1 in 10 chance of destruction of obj; glass, egg destruction */
        } else if ((scflags & MAY_DESTROY) !== 0
                   && (!rn2(10) || (game.objects[otmp.otyp].oc_material === MATERIALS.GLASS
                                    || otmp.otyp === ONAMES.EGG))) {
            if (await breaks(otmp, sx, sy))
                used_up = true;
        }

        if (!used_up) {
            stmp = { obj: otmp, ox: sx, oy: sy, dx: 0, dy: 0, range: 0,
                     stopped: false };
            tmp = rn2(N_DIRS); /* get the direction */
            stmp.dx = xdir[tmp];
            stmp.dy = ydir[tmp];
            tmp = blastforce - Math.trunc((otmp.owt | 0) / 40);
            if (tmp < 1)
                tmp = 1;
            stmp.range = rnd(tmp); /* anywhere up to that determ. by wt */
            if (farthest < stmp.range)
                farthest = stmp.range;
            schain.push(stmp);
        }
    }

    while (farthest-- > 0) {
        for (stmp of schain) {
            if ((stmp.range-- > 0) && (!stmp.stopped)) {
                game.thrownobj = stmp.obj; /* mainly in case it kills hero */
                game.bhitpos = { x: stmp.ox + stmp.dx, y: stmp.oy + stmp.dy };
                if (isok(game.bhitpos.x, game.bhitpos.y))
                    typ = game.level.at(game.bhitpos.x, game.bhitpos.y).typ;
                else
                    typ = STONE;
                if (!isok(game.bhitpos.x, game.bhitpos.y)) {
                    game.bhitpos.x -= stmp.dx;
                    game.bhitpos.y -= stmp.dy;
                    stmp.stopped = true;
                } else if (!ZAP_POS(typ)
                           || closed_door(game.bhitpos.x, game.bhitpos.y)) {
                    game.bhitpos.x -= stmp.dx;
                    game.bhitpos.y -= stmp.dy;
                    stmp.stopped = true;
                } else if ((mtmp = m_at(game.bhitpos.x, game.bhitpos.y)) != null) {
                    if (scflags & MAY_HITMON) {
                        stmp.range--;
                        if (await ohitmon(mtmp, stmp.obj, 1, false)) {
                            stmp.obj = null;
                            stmp.stopped = true;
                        }
                    }
                } else if (u_at(game.bhitpos.x, game.bhitpos.y)) {
                    if (scflags & MAY_HITYOU) {
                        let dam, hitvalu, hitu;

                        if (game.multi)
                            nomul(0);
                        dam = dmgval(stmp.obj, game.youmonst);
                        hitvalu = 8 + stmp.obj.spe;
                        if (bigmonst(game.youmonst.data))
                            hitvalu++;
                        const objp = { o: stmp.obj };
                        hitu = await thitu(hitvalu, Maybe_Half_Phys(dam),
                                           objp, null);
                        stmp.obj = objp.o;
                        if (!stmp.obj)
                            stmp.stopped = true;
                        if (hitu) {
                            stmp.range -= 3;
                            await stop_occupation();
                        }
                    }
                } else {
                    if (scflags & VIS_EFFECTS) {
                        /* tmp_at(bhitpos.x, bhitpos.y); */
                        /* delay_output(); */
                    }
                }
                stmp.ox = game.bhitpos.x;
                stmp.oy = game.bhitpos.y;
                if (IS_SINK(game.level.at(stmp.ox, stmp.oy).typ))
                    stmp.stopped = true;
                game.thrownobj = null;
            }
        }
    }

    for (stmp of schain) {
        let x, y;
        let obj_left_shop = false;

        x = stmp.ox;
        y = stmp.oy;
        if (stmp.obj) {
            if (x !== sx || y !== sy) {
                total += stmp.obj.quan;
                obj_left_shop = (shop_origin && !costly_spot(x, y));
            }
            if (!(await flooreffects(stmp.obj, x, y, 'land'))) {
                if (obj_left_shop
                    && (u.urooms || '').includes((in_rooms(u.ux, u.uy, SHOPBASE) || '\0')[0])) {
                    /* At the moment this only addresses gold. It would be
                       simple enough to call addtobill for other items that
                       leave the shop due to scatter(), by default the hero
                       will get billed for the full shopkeeper asking-price
                       on the object's way out of shop. That can leave the
                       hero in a pickle. Even if the hero then manages to
                       retrieve the item and drop it back inside the shop,
                       the owed charges will only be reduced at that point
                       by the lesser shopkeeper buying-price.
                       The non-gold situation will likely get adjusted
                       further. */
                    if (stmp.obj.otyp === ONAMES.GOLD_PIECE) {
                        await addtobill(stmp.obj, false, false, true);
                        lostgoods = true;
                    }
                }
                place_object(stmp.obj, x, y);
                stackobj(stmp.obj);
            }
        }
        newsym(x, y);
    }
    newsym(sx, sy);
    if (u_at(sx, sy) && u.uundetected && hides_under(game.youmonst.data))
        hideunder(game.youmonst);
    if (((mtmp = m_at(sx, sy)) != null) && mtmp.mtrapped)
        mtmp.mtrapped = 0;
    maybe_unhide_at(sx, sy);
    if (lostgoods) /* implies shop_origin and therefore shkp valid */
        await credit_report(shkp, 1, false);

    return total;
}

// src/explode.c:962 splatter_burning_oil(), burning oil goes off at <x,y>.
export async function splatter_burning_oil(x, y, diluted_oil) {
    const dmg = d(diluted_oil ? 3 : 4, 4);
    const ZT_SPELL_O_FIRE = 11; /* value kludge, see zap.c */

    await explode(x, y, ZT_SPELL_O_FIRE, dmg, BURNING_OIL, EXPL_FIERY);
}

// src/explode.c:974 explode_oil(), a lit potion of oil goes off,
// possibly killing the hero and attempting to save bones.
export async function explode_oil(obj, x, y) {
    const diluted_oil = !!obj.odiluted;

    /* if (!obj->lamplit) impossible("exploding unlit oil"); */
    await end_burn(obj, true);
    obj.how_lost = LOST_EXPLODING;
    await splatter_burning_oil(x, y, diluted_oil);
}

// src/explode.c:987 adtyp_to_expltype(), explosion colors by damage type.
export function adtyp_to_expltype(adtyp) {
    switch (adtyp) {
    case ATTKS.AD_ELEC:
    case ATTKS.AD_SPEL:
    case ATTKS.AD_DREN:
    case ATTKS.AD_ENCH:
        return EXPL_MAGICAL;
    case ATTKS.AD_FIRE:
        return EXPL_FIERY;
    case ATTKS.AD_COLD:
        return EXPL_FROSTY;
    case ATTKS.AD_DRST:
    case ATTKS.AD_DRDX:
    case ATTKS.AD_DRCO:
    case ATTKS.AD_DISE:
    case ATTKS.AD_PEST:
    case ATTKS.AD_PHYS: /* gas spore */
        return EXPL_NOXIOUS;
    default:
        /* impossible("adtyp_to_expltype: bad explosion type %d", adtyp); */
        return EXPL_FIERY;
    }
}

// src/explode.c:1019 mon_explodes(), a monster with an AT_BOOM or AT_EXPL
// attack goes off.
export async function mon_explodes(mon, mattk) {
    let dmg;
    let type;

    if (mattk[2]) {
        dmg = d(mattk[2], mattk[3]);
    } else if (mattk[3]) {
        dmg = d(mon.data.mlevel + 1, mattk[3]);
    } else {
        dmg = 0;
    }

    if (mattk[1] === ATTKS.AD_PHYS) {
        type = PHYS_EXPL_TYPE;
    } else if (mattk[1] >= ATTKS.AD_MAGM && mattk[1] <= ATTKS.AD_SPC2) {
        type = -((mattk[1] - 1) + 20);
    } else {
        /* impossible("unknown type for mon_explode %d", mattk->adtyp); */
        return;
    }
    if (!DEADMONSTER(mon)) {
        await mondead(mon);
    }
    (game.killer ||= { format: 0, name: '' });
    game.killer.name = `${s_suffix(pmname(mon.data, Mgender(mon)))} explosion`;
    game.killer.format = KILLED_BY_AN;

    await explode(mon.mx, mon.my, type, dmg, MON_EXPLODE,
                  adtyp_to_expltype(mattk[1]));
    game.killer.name = '';
}
