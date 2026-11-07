// explode.js — C ref: explode.c.
import { exercise } from './attrib.js';
import { ACID_RES, A_STR, BURNING_OIL, COLD_RES, DISINT_RES, EXPL_DARK, EXPL_FIERY, EXPL_FROSTY, EXPL_MAGICAL, EXPL_NOXIOUS, FEMALE, FIRE_RES, INVULNERABLE, KILLED_BY, KILLED_BY_AN, LOST_EXPLODING, MALE, MAXEXPCHARS, MON_EXPLODE, M_AP_TYPE, PLNMSG_CAUGHT_IN_EXPLOSION, PLNMSG_TOWER_OF_FLAME, POISON_RES, SHOCK_RES, TRAP_EXPLODE, Upolyd, engulfing_u, isok, u_at } from './const.js';
import { DISP_BEAM, DISP_CHANGE, DISP_END, _more_never_dismissed, _topline_more_pending, canspotmon, explode_shield_effect, flush_pending_messages, flush_screen, map_invisible, tmp_at, unmap_invisible } from './display.js';
import { sticks } from './dog.js';
import { deadhero, pending_death_is_final } from './end.js';
import { drain_pending_death_in_place } from './fastforward.js';
import { game } from './gstate.js';
import { dist2, lowc } from './hacklib.js';
import { is_demon, monPmname, nonliving, nonlivingMon } from './makemon.js';
import { Monnam, cvt_adtyp_to_mseenres, monstseesu, monstunseesu } from './mcastu.js';
import { is_youmonst, s_suffix, seemimic, ugolemeffects } from './mhitm.js';
import { ignite_items } from './mhitu.js';
import { Soundeffect, mondead as mondead_zap, setmangry, wake_nearto } from './mon.js';
import { Resists_Elem, resists_magm } from './mondata.js';
import { You_hear, impossible, pline, pline_The } from './pline.js';
import { PM_HEALER, PM_KNIGHT, PM_MONK } from './pm.generated.js';
import { rehumanize as rehumanize_real } from './polyself.js';
import { rndmonnam } from './priest.js';
import { d } from './rng.js';
import { pay_for_damage } from './shk.js';
import { end_burn } from './timeout.js';
import { burnarmor, monkilled_trap } from './trap.js';
import { XKILL_GIVEMSG, XKILL_NOCONDUCT, XKILL_NOCORPSE, XKILL_NOMSG, golemeffects, m_at, xkilled } from './uhitm.js';
import { cansee } from './vision.js';
import { AD_ACID, AD_COLD, AD_DISN, AD_DRST, AD_ELEC, AD_FIRE, AD_MAGM, AD_RBRE, DEADMONSTER, NO_KILLER_PREFIX_ZAP, PHYS_EXPL_TYPE, PM_WIZARD, POT_OIL, RAY, SCROLL_CLASS, SCR_FIRE, WAND_CLASS, WAN_DIGGING, WAN_MAGIC_MISSILE, WAN_SLEEP, _Halluc, _ZAP_HALF_PHDAM, _cm_Antimagic, _completely_burns, _expl_deaf, _expl_digests, _expl_is_vampshifter, _expl_mon_moving, _expl_uhim, _expl_uhis, _wand_Role_if, _zp_burn_away_slime, destroy_items, destroy_items_mon, oc_dir_of, resist, zap_over_floor } from './zap.js';
import { nomul, stop_occupation } from './allmain.js'; // relocate-fns
import { obj_extract_self_general } from './cmd.js'; // relocate-fns
import { IS_SINK, LARGEST_INT, MAY_DESTROY, MAY_FRACTURE, MAY_HITMON, MAY_HITYOU, N_DIRS, SHOPBASE, STATUE_TRAP, STONE, ZAP_POS, xdir, ydir } from './const.js'; // relocate-fns
import { newsym } from './display.js'; // relocate-fns
import { flooreffects } from './do.js'; // relocate-fns
import { _KO_BOULDER_OTYP, _KO_COIN_CLASS, _KO_EGG_OTYP, _KO_GLASS_MATERIAL, _dk_Maybe_Half_Phys, _km_bigmonst } from './dokick.js'; // relocate-fns
import { breaks } from './dothrow.js'; // relocate-fns
import { sobj_at } from './invent.js'; // relocate-fns
import { splitobj } from './makemon.js'; // relocate-fns
import { ohitmon } from './mhitu.js'; // relocate-fns
import { STATUE, place_object } from './mklev.js'; // relocate-fns
import { MKOBJ_OC_MATERIAL } from './mkobj_erosion_meta.js'; // relocate-fns
import { hideunder, maybe_unhide_at } from './mon.js'; // relocate-fns
import { closed_door } from './monmove.js'; // relocate-fns
import { thitu } from './mthrowu.js'; // relocate-fns
import { Tobjnam } from './objnam.js'; // relocate-fns
import { unpunish } from './read.js'; // relocate-fns
import { rn2, rnd } from './rng.js'; // relocate-fns
import { addtobill as shk_addtobill, costly_spot as shk_costly_spot, shop_keeper } from './shk.js';
import { in_rooms } from './hack.js'; // relocate-fns
import { credit_report } from './shk_credit.js'; // relocate-fns
import { stackobj } from './sp_lev.js'; // relocate-fns
import { deltrap, t_at } from './trap.js'; // relocate-fns
import { dmgval } from './uhitm.js'; // relocate-fns
import { break_statue, fracture_rock } from './zap.js'; // relocate-fns

/* pm.generated.js's generator dropped this one as a "duplicate" of PM_PRIEST
 * (275, the temple NPC) — the role player-character monster ("priest,
 * priestess, cleric", monsters.h) sits at index 337, between PM_MONK (336)
 * and PM_RANGER (338), which is what C's `you.h` PM_CLERIC macro names.
 * Verified by counting monsters.h's MON() role block in file order.
 * (PM_WIZARD (343) is NOT re-imported here — it already exists as a local
 * const below, in the same value, for is_mplayer's PM_ARCHEOLOGIST..
 * PM_WIZARD bound; reuse it rather than collide with a second binding.) */
const PM_CLERIC_ZAP = 337;

/* C monattk.h:42-78 — the damage types this file names. */
const AD_PHYS = 0;

const AD_SPC2 = 10;

const AD_DREN = 16;

const AD_DRDX = 30;

const AD_DRCO = 31;

const AD_DISE = 33;

const AD_PEST = 38;

const AD_SPEL = 241;

const AD_ENCH = 41;

/* C defsym.h:239-247 PCHAR2 rows S_expl_tl..S_expl_br. */
const S_expl_tl = 96, S_expl_tc = 97, S_expl_tr = 98;

const S_expl_ml = 99, S_expl_mc = 100, S_expl_mr = 101;

const S_expl_bl = 102, S_expl_bc = 103, S_expl_br = 104;

/* C explode.c:10-14 — "Arrays are column first, while the screen is row first". */
const _explosion_cmap = [
    [S_expl_tl, S_expl_ml, S_expl_bl],
    [S_expl_tc, S_expl_mc, S_expl_bc],
    [S_expl_tr, S_expl_mr, S_expl_br],
];

/* C explode.c:17-22 enum explode_action. */
const EXPL_NONE = 0, EXPL_MON = 1, EXPL_HERO = 2, EXPL_SKIP = 4;

/* C sndprocs.h:144-148 enum sound_effect_entries — seffects.h ordinals
 * (se_zero_invalid = 0 first), the convention js/mon.js:2137 uses.  The
 * Soundeffect() these feed is the empty no-soundlib macro (sndprocs.h:274). */
const se_blast = 15, se_chain_shatters = 35, se_stone_breaking = 183, se_stone_crumbling = 184;

/* C monst.h:272-273 resists_fire / resists_cold macros */
const resists_fire = (mon) => Resists_Elem(mon, FIRE_RES);
const resists_cold = (mon) => Resists_Elem(mon, COLD_RES);

const POTION_CLASS = 8; /* objclass.h POTION_CLASS */

/* C display.h:527 GLYPH_EXPLODE_DARK_OFF — js/glyphs.js:74 carries the same
 * 7157 as the base of the explosion glyph block. */
const GLYPH_EXPLODE_DARK_OFF = 7157;

/* C youprop.h:73 Invulnerable — u.uprops[INVULNERABLE].intrinsic. */
function _expl_invulnerable() {
    return !!(game.u?.uprops?.[INVULNERABLE]?.intrinsic | 0);
}

/* C display.h:586-592 explosion_to_glyph(expltyp, idx).  The ternary chain
 * selects GLYPH_EXPLODE_<TYPE>_OFF; display.h:527-534 makes those enum values
 * consecutive multiples of MAXEXPCHARS from the DARK base in EXPL_* order, and
 * every type the chain does not name falls through to EXPL_FIERY. */
function explosion_to_glyph(expltyp, idx) {
    const t = (expltyp >= EXPL_DARK && expltyp <= EXPL_FROSTY) ? expltyp : EXPL_FIERY;
    return (idx - S_expl_tl) + GLYPH_EXPLODE_DARK_OFF + MAXEXPCHARS * t;
}

/* C explode.c:26-113 explosionmask(m, adtyp, olet) — does this target need a
 * shield-effect flash?  AD_PHYS is the FIRST case on both the hero side and the
 * monster side and it leaves the result at EXPL_NONE, which is why a gas spore
 * blast has no shield animation and why hero and monster both take FULL damage
 * (the EXPL_HERO / EXPL_MON bits are exactly what divert to the items-only and
 * golemeffects arms further down).  The other arms read hero properties and
 * monster mresists; unreachable from mon_explodes' gas-spore call. */
/* C youprop.h:26-51 the hero-side *_resistance macros explosionmask's hero
 * switch reads DIRECTLY — u.uprops[propidx].intrinsic || .extrinsic, with NO
 * further artifact/worn-item scan (unlike Resists_Elem, which the MONSTER
 * side of this same switch calls and which DOES walk wielded/worn items).
 * Porting the hero arm with Resists_Elem(youmonst, ...) would be a DIFFERENT,
 * broader check than C's — a real behavioural divergence, not a shortcut. */
function _expl_hero_resist(propidx) {
    const p = game.u?.uprops?.[propidx];
    return !!((p?.intrinsic | 0) || (p?.extrinsic | 0));
}

/* C explode.c:26-113 explosionmask(m, adtyp, olet) — does this target need a
 * shield-effect flash?  Two parallel switches (hero vs monster) on the same
 * adtyp values; the hero arm reads the plain *_resistance macros (uprops
 * only), the monster arm calls the full resists_*(m) family (uprops +
 * mon_resistancebits + wielded-artifact + worn/carried items).  NO RNG on
 * either side. */
async function explosionmask(m, adtyp, olet) {
    const is_you = is_youmonst(m);
    if (is_you) {
        switch (adtyp) {
        case AD_PHYS:
            return EXPL_NONE; /* C explode.c:33-36 */
        case AD_MAGM:
            return _cm_Antimagic() ? EXPL_HERO : EXPL_NONE;
        case AD_FIRE:
            return _expl_hero_resist(FIRE_RES) ? EXPL_HERO : EXPL_NONE;
        case AD_COLD:
            return _expl_hero_resist(COLD_RES) ? EXPL_HERO : EXPL_NONE;
        case AD_DISN: {
            const md = m ? m.data : null;
            const hit = (olet === WAND_CLASS)
                ? (nonliving(md) || is_demon(md))
                : _expl_hero_resist(DISINT_RES);
            return hit ? EXPL_HERO : EXPL_NONE;
        }
        case AD_ELEC:
            return _expl_hero_resist(SHOCK_RES) ? EXPL_HERO : EXPL_NONE;
        case AD_DRST:
            return _expl_hero_resist(POISON_RES) ? EXPL_HERO : EXPL_NONE;
        case AD_ACID:
            return _expl_hero_resist(ACID_RES) ? EXPL_HERO : EXPL_NONE;
        default:
            await impossible('explosion type %d?', adtyp);
            return EXPL_NONE;
        }
    } else {
        switch (adtyp) {
        case AD_PHYS:
            return EXPL_NONE; /* C explode.c:75-76 */
        case AD_MAGM:
            return resists_magm(m) ? EXPL_MON : EXPL_NONE;
        case AD_FIRE:
            return Resists_Elem(m, FIRE_RES) ? EXPL_MON : EXPL_NONE;
        case AD_COLD:
            return Resists_Elem(m, COLD_RES) ? EXPL_MON : EXPL_NONE;
        case AD_DISN: {
            const md = m ? m.data : null;
            const hit = (olet === WAND_CLASS)
                ? (nonliving(md) || is_demon(md) || _expl_is_vampshifter(m))
                : !!Resists_Elem(m, DISINT_RES);
            return hit ? EXPL_MON : EXPL_NONE;
        }
        case AD_ELEC:
            return Resists_Elem(m, SHOCK_RES) ? EXPL_MON : EXPL_NONE;
        case AD_DRST:
            return Resists_Elem(m, POISON_RES) ? EXPL_MON : EXPL_NONE;
        case AD_ACID:
            return Resists_Elem(m, ACID_RES) ? EXPL_MON : EXPL_NONE;
        default:
            await impossible('explosion type %d?', adtyp);
            return EXPL_NONE;
        }
    }
}

/* C explode.c:986-1012 adtyp_to_expltype(adtyp) — damage type to the explosion
 * type that colours the blast glyphs. */
export async function adtyp_to_expltype(adtyp) {
    switch (adtyp) {
    case AD_ELEC: /* "Electricity isn't magical ... Magical is the next best" */
    case AD_SPEL:
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
        await impossible('adtyp_to_expltype: bad explosion type %d', adtyp);
        return EXPL_FIERY;
    }
}

/* C monst.h:92-93 monst{,un}seesu_ad(adtyp) — record/forget that onlookers saw
 * the hero resist this damage type.  mondata.c:1522-1536 maps AD_PHYS to
 * M_SEEN_NOTHING, and mondata.c:1562/1576 return immediately on M_SEEN_NOTHING,
 * so a gas-spore blast records nothing.  RNG-free for every adtyp. */
function _expl_monstseesu_ad(adtyp, saw_resist) {
    const seenres = cvt_adtyp_to_mseenres(adtyp);
    if (saw_resist)
        monstseesu(seenres);
    else
        monstunseesu(seenres);
}

/* C explode.c:117-179 engulfer_explosion_msg(adtyp, olet).  Called only when
 * the current target IS u.ustuck (engulfing_u(mtmp) at the call site), so it
 * reads u.ustuck directly, matching C's use of the global. */
async function _expl_engulfer_msg(adtyp, olet) {
    const u = game.u || {};
    let adj;
    if (_expl_digests(u.ustuck)) {
        switch (adtyp) {
        case AD_FIRE: adj = 'heartburn'; break;
        case AD_COLD: adj = 'chilly'; break;
        case AD_DISN:
            adj = (olet === WAND_CLASS) ? 'irradiated by pure energy' : 'perforated';
            break;
        case AD_ELEC: adj = 'shocked'; break;
        case AD_DRST: adj = 'poisoned'; break;
        case AD_ACID: adj = 'an upset stomach'; break;
        default: adj = 'fried'; break;
        }
        await pline(`${Monnam(u.ustuck)} gets ${adj}!`);
    } else {
        switch (adtyp) {
        case AD_FIRE: adj = 'toasted'; break;
        case AD_COLD: adj = 'chilly'; break;
        case AD_DISN:
            adj = (olet === WAND_CLASS) ? 'overwhelmed by pure energy' : 'perforated';
            break;
        case AD_ELEC: adj = 'shocked'; break;
        case AD_DRST: adj = 'intoxicated'; break;
        case AD_ACID: adj = 'burned'; break;
        default: adj = 'fried'; break;
        }
        await pline(`${Monnam(u.ustuck)} gets slightly ${adj}!`);
    }
}

/* C explode.c:199-716 explode(x, y, type, dam, olet, expltype). */
export async function explode(x, y, type, dam, olet, expltype) {
    let i, j, damu = dam;
    let starting = true;
    let visible = false, any_shield = false;
    let uhurt = 0; /* 0=unhurt, 1=items damaged, 2=you and items damaged */
    let str = null;
    let mtmp, mdef = null;
    let adtyp;
    const explmask = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    let xx, yy;
    const expl_shopdamage = { v: false }; /* C explode.c:216 `boolean shopdamage` */
    let generic = false, do_hallu = false;
    let exploding_wand_typ = 0;
    const you_exploding = (olet === MON_EXPLODE && type >= 0);
    let didmsg = false;
    const u = game.u || {};

    /* C explode.c:224-262 — the olet dispatch. */
    if (olet === WAND_CLASS) {
        if (type < 0) {
            type = -type;
            exploding_wand_typ = type;
            /* C explode.c:230-238 — most attack wands produce their own
               specific explosion type; WAN_DIGGING and WAN_SLEEP are RAY
               too but have no explosion slot of their own, so they (and
               every non-RAY wand: light, detect, create monster, wishing,
               stasis, ...) fall back to the generic magical explosion. */
            if (oc_dir_of(type) === RAY && type !== WAN_DIGGING && type !== WAN_SLEEP) {
                type -= WAN_MAGIC_MISSILE;
                if (type < 0 || type > 9) {
                    /* C explode.c:236-237: impossible("explode: wand has bad
                       zap type (%d).", type); type = 0. No known wand otyp
                       can reach this (verified: every RAY wand's otyp - 429
                       lands in 0..9), so this is a defensive no-op mirror. */
                    type = 0;
                }
            } else {
                type = 0;
            }
        }
        /* C explode.c:242-251 — the hero's own share of the blast (damu) is
           quintered for the three "smart" caster roles, halved for the two
           physically-hardy ones, and untouched otherwise.  `dam` itself
           (everything else caught in the blast) is never touched. */
        if (_wand_Role_if(PM_CLERIC_ZAP) || _wand_Role_if(PM_MONK) || _wand_Role_if(PM_WIZARD)) {
            damu = Math.trunc(damu / 5);
        } else if (_wand_Role_if(PM_HEALER) || _wand_Role_if(PM_KNIGHT)) {
            damu = Math.trunc(damu / 2);
        }
    } else if (olet === BURNING_OIL) {
        exploding_wand_typ = POT_OIL;
    } else if (olet === SCROLL_CLASS) {
        exploding_wand_typ = SCR_FIRE;
    } else if (olet === TRAP_EXPLODE) {
        type = 0; /* hardcoded to generic magic explosion */
    }
    /* C explode.c:263-267 — muse_unslime passes a negative expltype meaning
       "hero gets credit/blame for killing THIS monster, not the others". */
    if (expltype < 0) {
        mdef = m_at(x, y);
        expltype = -expltype;
    }
    /* C explode.c:268-270 */
    const inside_engulfer = (!!u.uswallow && type >= 0);
    /* C explode.c:271-284 — a grabber reaching into the blast takes double. */
    let grabbed = false, grabbing = false;
    const grabxy = { x: 0, y: 0 };
    if (u.ustuck && !u.uswallow) {
        if (Upolyd(u) && sticks(game.youmonst?.data))
            grabbing = true;
        else
            grabbed = true;
        grabxy.x = u.ustuck.mx | 0;
        grabxy.y = u.ustuck.my | 0;
    }

    /* C explode.c:296-303 — a recursive explode() can overwrite svk.killer.name,
       so keep a copy; do_hallu re-rolls the blamed species per target. */
    if (olet === MON_EXPLODE && !you_exploding) {
        str = String(game.svk?.killer?.name || '');
        do_hallu = (_Halluc()
                    && (str.indexOf("'s explosion") >= 0
                        || str.indexOf("s' explosion") >= 0));
    }
    if (type === PHYS_EXPL_TYPE) {
        adtyp = AD_PHYS; /* C explode.c:304-307 — currently only gas spores */
    } else {
        /* C explode.c:308-347 — the abs(type)%10 adstr/adtyp table.  If `str` is
           e.g. "flaming sphere's explosion" from the MON_EXPLODE copy above we
           still assign adtyp, but do not replace str. */
        let adstr = null;

        switch (Math.abs(type) % 10) {
        case 0:
            adstr = 'magical blast';
            adtyp = AD_MAGM;
            break;
        case 1:
            adstr = (olet === BURNING_OIL) ? 'burning oil'
                    : (olet === SCROLL_CLASS) ? 'tower of flame' : 'fireball';
            adtyp = AD_FIRE; /* fire damage, not physical damage */
            break;
        case 2:
            adstr = 'ball of cold';
            adtyp = AD_COLD;
            break;
        case 4:
            adstr = (olet === WAND_CLASS) ? 'death field' : 'disintegration field';
            adtyp = AD_DISN;
            break;
        case 5:
            adstr = 'ball of lightning';
            adtyp = AD_ELEC;
            break;
        case 6:
            adstr = 'poison gas cloud';
            adtyp = AD_DRST;
            break;
        case 7:
            adstr = 'splash of acid';
            adtyp = AD_ACID;
            break;
        default:
            return;
        }
        if (!str)
            str = adstr;
    }

    /* C explode.c:349-379 — the 3x3 mask pass. */
    for (i = 0; i < 3; i++)
        for (j = 0; j < 3; j++) {
            xx = x + i - 1;
            yy = y + j - 1;
            if (!isok(xx, yy)) {
                explmask[i][j] = EXPL_SKIP;
                continue;
            }
            explmask[i][j] = EXPL_NONE;

            if (u_at(xx, yy))
                explmask[i][j] = await explosionmask(game.youmonst, adtyp, olet);
            /* can be both you and mtmp if you're swallowed or riding */
            mtmp = m_at(xx, yy);
            if (!mtmp && u_at(xx, yy))
                mtmp = u.usteed;
            if (mtmp && DEADMONSTER(mtmp))
                mtmp = null;
            if (mtmp)
                explmask[i][j] |= await explosionmask(mtmp, adtyp, olet);

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
        /* C explode.c:381-393 — start the explosion.  The DISP_BEAM run records
           every covered square and the DISP_END below newsym()s each one back;
           that erase pass is what repaints the exploded monster's square before
           the pline that follows can page. */
        for (i = 0; i < 3; i++)
            for (j = 0; j < 3; j++) {
                if (explmask[i][j] === EXPL_SKIP)
                    continue;
                xx = x + i - 1;
                yy = y + j - 1;
                tmp_at(starting ? DISP_BEAM : DISP_CHANGE,
                       explosion_to_glyph(expltype, _explosion_cmap[i][j]));
                tmp_at(xx, yy);
                starting = false;
            }

        if (any_shield) {
            /* C explode.c:396-425 — the SHIELD_COUNT shield-flash loop, entered
               only when some target RESISTED (and flags.sparkle).  The AD_PHYS
               mask never sets a shield bit, so a gas spore cannot reach it.
               Per resisting CELL, not at the centre, and with no cansee(). */
            const shieldCells = [];
            for (i = 0; i < 3; i++)
                for (j = 0; j < 3; j++)
                    if ((explmask[i][j] & (EXPL_MON | EXPL_HERO)) !== 0)
                        shieldCells.push({ x: x + i - 1, y: y + j - 1,
                            glyph: explosion_to_glyph(expltype, _explosion_cmap[i][j]) });
            explode_shield_effect(shieldCells);
        }
        /* C explode.c:427-430 else: two nh_delay_output() calls — pure pacing. */

        tmp_at(DISP_END, 0); /* clear the explosion */
    } else {
        /* C explode.c:432-442 */
        if (olet === MON_EXPLODE || olet === TRAP_EXPLODE) {
            str = 'explosion';
            generic = true;
        }
        if (!_expl_deaf() && olet !== SCROLL_CLASS) {
            Soundeffect(se_blast, 75);
            await You_hear('a blast.');
            didmsg = true;
        }
    }

    if (!_expl_deaf() && !didmsg)
        await pline('Boom!'); /* C explode.c:444-445 */

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
                    /* a poly'd hero attacking INTO its own explosion attack
                       keeps its skin and its gear (C explode.c:461-467) */
                    if (!_expl_mon_moving() && you_exploding)
                        uhurt = 0;
                } else if (inside_engulfer) {
                    continue; /* only <u.ux,u.uy> is affected */
                }

                if (!(u.uswallow && !_expl_mon_moving()))
                    await zap_over_floor(xx, yy, type, expl_shopdamage, false,
                                         exploding_wand_typ);

                mtmp = m_at(xx, yy);
                if (!mtmp && u_at(xx, yy))
                    mtmp = u.usteed;
                if (!mtmp)
                    continue;
                if (do_hallu) {
                    /* C explode.c:489-503 — a fresh rndmonnam() per target, and
                       rndmonnam DRAWS (display rng), so this is a named stop,
                       not a skip.  "we can't distinguish personal names like
                       'Barney' here in order to suppress 'the' below, so avoid
                       any which begins with a capital letter" — retry up to 20
                       draws for a lowercase-first result. */
                    let hallu_buf, tryct = 0;
                    do {
                        hallu_buf = `${s_suffix(rndmonnam())} explosion`;
                    } while (hallu_buf[0] !== lowc(hallu_buf[0]) && ++tryct < 20);
                    str = hallu_buf;
                }
                if (engulfing_u(mtmp)) {
                    /* C explode.c:504-505 engulfer_explosion_msg */
                    await _expl_engulfer_msg(adtyp, olet);
                } else if (cansee(xx, yy)) {
                    if (M_AP_TYPE(mtmp)) {
                        /* C explode.c:506-507 seemimic(mtmp) */
                        seemimic(mtmp);
                    }
                    await pline(`${Monnam(mtmp)} is caught in the ${str}!`);
                }

                itemdmg = (await destroy_items_mon(mtmp, adtyp, dam));
                if (adtyp === AD_FIRE) {
                    await burnarmor(mtmp);
                    await ignite_items(mtmp.minvent);
                }

                if ((explmask[i][j] & EXPL_MON) !== 0) {
                    /* C explode.c:512-526 — the target resisted: only item
                       destruction damage lands, plus the golem effect. Damage
                       from a ring/wand/potion explosion isn't itself of the
                       "same type" as the explosion, so C ignores that for
                       golemeffects() and mixes in the item-destruction damage
                       directly below (imperfect and marginal per its own
                       comment; ported as-is). */
                    await _expl_golemeffects(mtmp, adtyp, dam);
                    mtmp.mhp = (mtmp.mhp | 0) - itemdmg;
                } else {
                    /* C explode.c:527-552 — resist() called with damage 0 so the
                       message can precede the damage and so mondied() (not
                       killed()) can be used when the blast is not the hero's. */
                    let mdam = dam;

                    if (await resist(mtmp, olet, 0, false)) {
                        if (cansee(xx, yy) || inside_engulfer)
                            await pline(`${Monnam(mtmp)} resists the ${str}!`);
                        mdam = Math.trunc((mdam + 1) / 2);
                    }
                    if (grabbed && mtmp === u.ustuck && dist2(x, y, u.ux | 0, u.uy | 0) <= 2)
                        mdam *= 2;
                    /* C explode.c:545-551 — being resistant to the OPPOSITE
                       type of damage makes the target MORE vulnerable to the
                       current type (when the target also resists the
                       current type, explmask[i][j] already routed it to the
                       golemeffects arm above and this branch is never
                       reached, matching C's own parenthetical). RNG-free:
                       Resists_Elem walks uprops + mon_resistancebits +
                       artifact/worn items, no draws. */
                    if (resists_cold(mtmp) && adtyp === AD_FIRE)
                        mdam *= 2;
                    else if (resists_fire(mtmp) && adtyp === AD_COLD)
                        mdam *= 2;
                    mtmp.mhp = (mtmp.mhp | 0) - (mdam + itemdmg);
                }
                if (DEADMONSTER(mtmp)) {
                    /* C explode.c:553-580 */
                    const xkflg = (adtyp === AD_FIRE && _completely_burns(mtmp))
                                  ? XKILL_NOCORPSE : 0;

                    if (!_expl_mon_moving()) {
                        await xkilled(mtmp, XKILL_GIVEMSG | xkflg);
                    } else if (mdef && mtmp === mdef) {
                        if (cansee(mtmp.mx | 0, mtmp.my | 0) || canspotmon(mtmp))
                            await pline(`${Monnam(mtmp)} is ${xkflg ? 'burned completely' : nonlivingMon((mtmp.mndx ?? mtmp.mnum) | 0) ? 'destroyed' : 'killed'}!`);
                        await xkilled(mtmp, XKILL_NOMSG | XKILL_NOCONDUCT | xkflg);
                    } else {
                        /* C: monkilled(mtmp, "", adtyp).  monkilled is unported;
                           monkilled_trap is this tree's monster-death-without-
                           hero-credit body, and is where resist() already routes
                           C's monkilled(mtmp, "", AD_RBRE). */
                        if (xkflg)
                            adtyp = AD_RBRE; /* no corpse (explode.c:579) */
                        await monkilled_trap(mtmp);
                    }
                } else if (!_expl_mon_moving()) {
                    await setmangry(mtmp, true); /* C explode.c:581-584 */
                }
            }
        }
    }

    /* C explode.c:589-679 — "Do your injury last". */
    if (uhurt) {
        if (game.flags?.verbose && (type < 0 || olet !== SCROLL_CLASS)) {
            if (do_hallu) {
                /* C explode.c:592-596 — same rndmonnam retry, but unbounded
                   (no tryct cap) for the hero's own explosion message. */
                let hallu_buf;
                do {
                    hallu_buf = `${s_suffix(rndmonnam())} explosion`;
                } while (hallu_buf[0] !== lowc(hallu_buf[0]));
                str = hallu_buf;
            }
            await pline(`You are caught in the ${str}!`);
            if (game.iflags) game.iflags.last_msg = PLNMSG_CAUGHT_IN_EXPLOSION;
            /* C topl.c update_topl() more() BLOCKS inside this pline when it does
             * not fit beside the unacknowledged topline; with no dismiss key left
             * C never reaches destroy_items() below (explode.c:617). */
            if (_topline_more_pending() && _more_never_dismissed())
                await flush_pending_messages();
        }
        /* property damage first, in case we end up leaving bones */
        if (adtyp === AD_FIRE)
            await _zp_burn_away_slime();
        if (_expl_invulnerable()) {
            damu = 0;
            await pline('You are unharmed!');
        } else if (adtyp === AD_PHYS || adtyp === AD_ACID) {
            /* C hack.h Maybe_Half_Phys(dmg).  Half_physical_damage is not a
               property this port writes; js/uhitm.js reads the same spelling. */
            if (game.u?.uprops?.[_ZAP_HALF_PHDAM]
                && ((game.u.uprops[_ZAP_HALF_PHDAM].intrinsic | 0)
                    || (game.u.uprops[_ZAP_HALF_PHDAM].extrinsic | 0)))
                damu = Math.trunc((damu + 1) / 2);
        }
        if (adtyp === AD_FIRE) {
            await burnarmor(game.youmonst);
            await ignite_items(game.invent);
        }
        await destroy_items(true, adtyp, dam);

        ugolemeffects(adtyp, damu);
        if (uhurt === 2) {
            /* a poly'd hero grabbing another victim takes double damage */
            if (grabbing && dist2(grabxy.x, grabxy.y, x, y) <= 2)
                damu *= 2;
            if (Upolyd(u))
                u.mh = (u.mh | 0) - damu;
            else
                u.uhp = (u.uhp | 0) - damu;
            if (game.disp) game.disp.botl = 1;
        }

        /* "You resisted the damage, lets not keep that to ourselves" */
        _expl_monstseesu_ad(adtyp, uhurt === 1);

        if ((u.uhp | 0) <= 0 || (Upolyd(u) && (u.mh | 0) <= 0)) {
            if (Upolyd(u)) {
                await rehumanize_real();
            } else {
                /* svk.killer is a static struct in C (decl.c); this port creates it lazily,
                   and the guards below would skip every killer write when it is absent. */
                if (!game.svk) game.svk = {};
                if (!game.svk.killer) game.svk.killer = { id: 0, format: 0, name: '', next: null };
                if (olet === MON_EXPLODE) {
                    /* generic: the blast was unseen, so str=="explosion" while
                       svk.killer.name is still "<mon>'s explosion" */
                    if (!generic && game.svk?.killer)
                        game.svk.killer.name = str;
                    if (game.svk?.killer)
                        game.svk.killer.format = KILLED_BY_AN;
                } else if (olet === TRAP_EXPLODE) {
                    /* C explode.c:643-646. */
                    if (game.svk?.killer) {
                        game.svk.killer.format = NO_KILLER_PREFIX_ZAP;
                        game.svk.killer.name = `caught ${_expl_uhim()}self in a ${str}`;
                    }
                } else if (type >= 0 && olet !== SCROLL_CLASS) {
                    /* C explode.c:647-650 — WAND_CLASS retributive strike (and
                       any other olet reaching here with a non-negative,
                       already-converted type) blames the hero's own device. */
                    if (game.svk?.killer) {
                        game.svk.killer.format = NO_KILLER_PREFIX_ZAP;
                        game.svk.killer.name =
                            `caught ${_expl_uhim()}self in ${_expl_uhis()} own ${str}`;
                    }
                } else {
                    /* C explode.c:651-657 — BURNING_OIL, SCROLL_CLASS, or a
                       negative `type` (a monster-thrown wand/breath) not
                       already covered above. */
                    const strLower = String(str).toLowerCase();
                    if (game.svk?.killer) {
                        game.svk.killer.format =
                            (strLower === 'tower of flame' || strLower === 'fireball')
                                ? KILLED_BY_AN : KILLED_BY;
                        game.svk.killer.name = str;
                    }
                }
                if (game.iflags?.last_msg === PLNMSG_CAUGHT_IN_EXPLOSION
                    || game.iflags?.last_msg === PLNMSG_TOWER_OF_FLAME)
                    await pline('It is fatal.');
                else
                    await pline_The('%s is fatal.', str);
                /* If the fatal line overflowed the destruction message, C is
                 * blocked inside this pline before entering done().  Page that
                 * older line now; the fatal line left behind is freshly drawn
                 * and must be allowed to join done()'s lifesaving text. */
                let _deathRemainderFresh = false;
                if (_topline_more_pending()) {
                    await flush_screen(1);
                    _deathRemainderFresh = true;
                }
                /* C explode.c:675 `done((adtyp == AD_FIRE) ? BURNING : DIED)` —
                 * this port had hard-coded DIED, missing the AD_FIRE arm. */
                const _deathBeforeExpl = game._pendingDeath || null;
                /* C explode.c:674-675 reaches done() directly after the
                 * source-specific "It is fatal." / "The ... is fatal."
                 * line.  It does not pass through done_in_by() or losehp(),
                 * so there is no additional "You die..." message.  Mark that
                 * distinction explicitly for the shared death driver; the
                 * manufactured extra page otherwise consumes the keystrokes
                 * C uses for the wizard-mode "Die?" query. */
                deadhero((adtyp === AD_FIRE) ? 5 /* BURNING */ : 0 /* DIED */,
                         { noDeathLine: true,
                           remainderIsFresh: _deathRemainderFresh });
                if (game._pendingDeath && game._pendingDeath !== _deathBeforeExpl)
                    await drain_pending_death_in_place();
                if (pending_death_is_final())
                    return;
            }
        }
        exercise(A_STR, false);
    }

    if (expl_shopdamage.v)
        await pay_for_damage('destroy', false);

    /* C explode.c:707-715 — explosions are noisy. */
    let noise = dam * dam;
    if (noise < 50)
        noise = 50; /* in case random damage is very small */
    if (inside_engulfer)
        noise = Math.trunc((noise + 3) / 4);
    wake_nearto(x, y, noise);
}

/* C mon.c:5678-5704 golemeffects(struct monst *mon, int damtype, int dam) —
 * "damage type X heals/slows this specific golem breed"; RNG-free. Called
 * from explode()'s resisted-monster arm (explode.c:525) and from three
 * mhitm.js sites (magr taking its own elemental damage back); this port is
 * shared with js/uhitm.js's C-faithful golemeffects implementation. */
async function _expl_golemeffects(mon, damtype, dam) {
    return golemeffects(mon, damtype, dam);
}

/* C explode.c:960-967 splatter_burning_oil(coordxy x, coordxy y, boolean
 * diluted_oil):
 *     int dmg = d(diluted_oil ? 3 : 4, 4);
 *     explode(x, y, ZT_SPELL_O_FIRE, dmg, BURNING_OIL, EXPL_FIERY);
 * ZT_SPELL(ZT_FIRE) = ZT_SPELL(AD_FIRE-1) = 10+(2-1) = 11 — explode.c's own
 * comment kludges the value directly rather than importing the zap.c macro,
 * so this port does the same. Exported: js/potion.js's potionhit (POT_OIL,
 * isyou arm) is the second call site alongside dothrow's break path. */
const ZT_SPELL_O_FIRE = 11;

export async function splatter_burning_oil(x, y, diluted_oil) {
    const dmg = d(diluted_oil ? 3 : 4, 4);
    await explode(x, y, ZT_SPELL_O_FIRE, dmg, BURNING_OIL, EXPL_FIERY);
}

/* C explode.c:970-979 explode_oil(struct obj *obj, coordxy x, coordxy y) —
 * "lit potion of oil is exploding; extinguish it as a light source before
 * possibly killing the hero and attempting to save bones":
 *     boolean diluted_oil = obj->odiluted;
 *     if (!obj->lamplit) impossible("exploding unlit oil");
 *     end_burn(obj, TRUE);
 *     obj->how_lost = LOST_EXPLODING;
 *     splatter_burning_oil(x, y, diluted_oil);
 * Both call sites (potionhit's isyou arm, potion.c:1684; dothrow's breakobj
 * POT_OIL arm, dothrow.c:2500-2501) already check obj->lamplit before
 * calling, so the impossible() guard is C-unreachable from js/ and is not
 * ported (matches this file's own convention for unreachable impossible()s
 * elsewhere). */
export async function explode_oil(obj, x, y) {
    const diluted_oil = !!obj.odiluted;
    if (!obj.lamplit)
        await impossible('exploding unlit oil');
    end_burn(obj, true);
    obj.how_lost = LOST_EXPLODING;
    await splatter_burning_oil(x, y, diluted_oil);
}

/* C explode.c:1013-1067 mon_explodes(mon, mattk) — "a monster explodes in a way
 * that produces a real explosion (e.g. a sphere or gas spore, not a yellow
 * light or similar)".  `mattk` is one permonst mattk row: {aatyp, adtyp, damn,
 * damd}, as js/makemon_mattk.json stores it. */
export async function mon_explodes(mon, mattk) {
    let dmg, type;

    if (mattk.damn)
        dmg = d(mattk.damn | 0, mattk.damd | 0);        /* C explode.c:1025-1026 */
    else if (mattk.damd)
        dmg = d((mon.data?.mlevel | 0) + 1, mattk.damd | 0);
    else
        dmg = 0;

    if ((mattk.adtyp | 0) === AD_PHYS) {
        type = PHYS_EXPL_TYPE;
    } else if ((mattk.adtyp | 0) >= AD_MAGM && (mattk.adtyp | 0) <= AD_SPC2) {
        /* C explode.c:1036-1040 — the -1,+20,*-1 math sets it up as a 'monster
           breath' type for the explosions. */
        type = -(((mattk.adtyp | 0) - 1) + 20);
    } else {
        await impossible('unknown type for mon_explode %d', mattk.adtyp | 0);
        return;
    }

    /* C explode.c:1046-1051 — kill it now so it won't appear to be caught in its
       own explosion.  Already dead when this arrives from an AT_BOOM attack upon
       death, which is corpse_chance()'s caller. */
    if (!DEADMONSTER(mon))
        await mondead_zap(mon);

    /* C explode.c:1053-1058 — killer name; explode() also prints it. */
    if (!game.svk) game.svk = {};
    if (!game.svk.killer)
        game.svk.killer = { id: 0, format: 0, name: '', next: null };
    game.svk.killer.name =
        s_suffix(monPmname((mon.mndx ?? mon.mnum) | 0, mon.female ? FEMALE : MALE))
        + ' explosion';
    game.svk.killer.format = KILLED_BY_AN;

    await explode(mon.mx | 0, mon.my | 0, type, dmg, MON_EXPLODE,
                  await adtyp_to_expltype(mattk.adtyp | 0));

    game.svk.killer.name = ''; /* C explode.c:1066 — reset killer */
}

/* C mondata.h:35 hides_under(ptr) = ((ptr)->mflags1 & M1_CONCEAL) != 0.
 * M1_CONCEAL is monflag.h 0x00000080 (see js/dig.js's identical note, which
 * caught a DIFFERENT file's wrong 0x08000000 value for the same macro). */
function _dk_hides_under(ptr) {
    return !!ptr && ((ptr.mflags1 | 0) & 0x00000080) !== 0;
}

/* C explode.c:700-976 scatter. Each object is extracted before flight;
 * shop credit is snapshotted before the first object and reported after all
 * landing and billing operations complete. */
export async function scatter(sx, sy, blastforce, scflags, obj) {
    const individual_object = !!obj;
    const mayFracture = (scflags & MAY_FRACTURE) !== 0;

    /* C explode.c:740-742: diagnose a misplaced individual object. */
    if (individual_object && (obj.ox !== sx || obj.oy !== sy))
        await impossible('scattered object <%d,%d> not at scatter site <%d,%d>',
                         obj.ox, obj.oy, sx, sy);

    /* C:744-745 shop_origin = shop_keeper(*in_rooms(sx,sy,SHOPBASE)) != 0 &&
     * costly_spot(sx,sy).  RNG-free query; safe to always compute. */
    const _sc_rooms = in_rooms(sx, sy, SHOPBASE);
    const _sc_shkp = shop_keeper(_sc_rooms.length ? _sc_rooms[0] : 0);
    const shop_origin = !!_sc_shkp && shk_costly_spot(sx, sy);
    if (shop_origin) await credit_report(_sc_shkp, 0, true);
    let lostgoods = false;

    /* ── build the scatter chain, splitting stacks as C's while-loop does ── */
    const schain = [];
    let total = 0;
    for (;;) {
        let otmp = individual_object ? obj : (game.level?.levelObjects?.[sx]?.[sy] ?? null);
        if (otmp == null)
            break;
        if (otmp === game.u?.uball || otmp === game.u?.uchain) {
            /* C explode.c:751-760 — the chain shatters before scattering;
             * unpunish() clears the worn linkage and removes the chain.  A
             * ball then continues through the normal scatter loop, while a
             * chain starts the next object. */
            const wasChain = otmp === game.u?.uchain;
            Soundeffect(se_chain_shatters, 25);
            await pline_The('chain shatters!');
            await unpunish();
            if (wasChain)
                continue;
        }
        if (otmp.quan > 1) {
            let qtmp = Math.min(otmp.quan - 1, LARGEST_INT);
            qtmp = rnd(qtmp);
            otmp = (await splitobj(otmp, qtmp));
        } else {
            obj = null; /* all used */
        }
        obj_extract_self_general(otmp);

        /* C explode.c:766-807 — boulders fracture into rocks and statues
         * crumble in place on a 9-in-10 roll. */
        if (mayFracture
            && ((otmp.otyp | 0) === _KO_BOULDER_OTYP || (otmp.otyp | 0) === STATUE)
            && rn2(10)) {
            if ((otmp.otyp | 0) === _KO_BOULDER_OTYP) {
                if (cansee(sx, sy)) await pline('%s apart.', Tobjnam(otmp, 'break'));
                else {
                    Soundeffect(se_stone_breaking, 100);
                    await You_hear('stone breaking.');
                }
                await fracture_rock(otmp);
                place_object(otmp, sx, sy);
                otmp = sobj_at(_KO_BOULDER_OTYP, sx, sy);
                if (otmp) {
                    obj_extract_self_general(otmp);
                    place_object(otmp, sx, sy);
                }
            } else {
                const trap = t_at(sx, sy);
                if (trap && trap.ttyp === STATUE_TRAP) deltrap(trap);
                if (cansee(sx, sy)) await pline('%s.', Tobjnam(otmp, 'crumble'));
                else {
                    Soundeffect(se_stone_crumbling, 100);
                    await You_hear('stone crumbling.');
                }
                await break_statue(otmp);
                place_object(otmp, sx, sy);
            }
            newsym(sx | 0, sy | 0);
            continue;
        }

        /* C evaluates the random destruction roll before the glass/egg
         * exceptions, even when either exception guarantees a break test. */
        const destroy_roll = (scflags & MAY_DESTROY)
            && (!rn2(10)
                || (MKOBJ_OC_MATERIAL[otmp.otyp | 0] | 0) === _KO_GLASS_MATERIAL
                || (otmp.otyp | 0) === _KO_EGG_OTYP);
        if (destroy_roll) {
            if (await breaks(otmp, sx, sy))
                continue;
        }

        const dirIdx = rn2(N_DIRS);
        let rangeBase = (blastforce | 0) - Math.trunc((otmp.owt | 0) / 40);
        if (rangeBase < 1)
            rangeBase = 1;
        schain.push({
            obj: otmp, ox: sx, oy: sy,
            dx: xdir[dirIdx], dy: ydir[dirIdx],
            range: rnd(rangeBase),
            stopped: false,
        });
    }

    let farthest = 0;
    for (const s of schain)
        if (s.range > farthest) farthest = s.range;

    /* ── the flight loop: each un-stopped piece advances one square/round ── */
    while (farthest-- > 0) {
        for (const stmp of schain) {
            const oldRange = stmp.range;
            stmp.range = oldRange - 1;
            if (!(oldRange > 0 && !stmp.stopped))
                continue;
            game.thrownobj = stmp.obj;
            if (game.gt) game.gt.thrownobj = stmp.obj;
            let bx = stmp.ox + stmp.dx, by = stmp.oy + stmp.dy;
            const typ = isok(bx, by) ? ((game.level?.at(bx, by)?.typ) ?? STONE) : STONE;
            game.bhitpos = { x: bx, y: by };
            let mtmp;
            if (!isok(bx, by)) {
                game.bhitpos.x -= stmp.dx; game.bhitpos.y -= stmp.dy;
                stmp.stopped = true;
            } else if (!ZAP_POS(typ) || closed_door(game.bhitpos.x, game.bhitpos.y)) {
                game.bhitpos.x -= stmp.dx; game.bhitpos.y -= stmp.dy;
                stmp.stopped = true;
            } else if ((mtmp = m_at(game.bhitpos.x, game.bhitpos.y))) {
                if (scflags & MAY_HITMON) {
                    stmp.range -= 1;
                    if (await ohitmon(mtmp, stmp.obj, 1, false)) {
                        stmp.obj = null;
                        stmp.stopped = true;
                    }
                }
            } else if (u_at(game.bhitpos.x, game.bhitpos.y)) {
                if (scflags & MAY_HITYOU) {
                    if (game.multi) nomul(0);
                    const dam = dmgval(stmp.obj, game.youmonst);
                    let hitvalu = 8 + (stmp.obj.spe | 0);
                    if (_km_bigmonst(game.youmonst?.data)) hitvalu++;
                    const hitu = await thitu(hitvalu, _dk_Maybe_Half_Phys(dam), stmp.obj, null);
                    /* C explode.c:878 `if (!stmp->obj) stmp->stopped = TRUE;`
                       — thitu() takes &stmp->obj; in C, its only `*objp = 0` is
                       mthrowu.c:137-139 (potionhit on hit with POTION_CLASS).
                       Because JS thitu() takes stmp.obj by value, clear stmp.obj
                       when consumed by potionhit, then mirror C's check. */
                    if (hitu && (stmp.obj.oclass | 0) === POTION_CLASS)
                        stmp.obj = null;
                    if (!stmp.obj)
                        stmp.stopped = true;
                    if (hitu) {
                        stmp.range -= 3;
                        await stop_occupation();
                    }
                }
            }
            /* else: VIS_EFFECTS branch — no-op, see the doc comment above. */
            stmp.ox = game.bhitpos.x;
            stmp.oy = game.bhitpos.y;
            if (stmp.obj && IS_SINK((game.level?.at(stmp.ox, stmp.oy)?.typ) ?? STONE))
                stmp.stopped = true;
            game.thrownobj = null;
            if (game.gt) game.gt.thrownobj = null;
        }
    }

    /* ── landing: place whatever's left where it stopped ── */
    for (const stmp of schain) {
        const x = stmp.ox, y = stmp.oy;
        if (stmp.obj) {
            if (x !== sx || y !== sy)
                total += (stmp.obj.quan | 0);
            if (!await flooreffects(stmp.obj, x, y, 'land')) {
                /* C explode.c:916-938 — gold scattered out of a shop is
                 * added to the bill when the hero is still in that shop. */
                const heroShop = in_rooms(game.u.ux, game.u.uy, SHOPBASE)[0] || 0;
                if (shop_origin && (x !== sx || y !== sy)
                    && !shk_costly_spot(x, y)
                    && (!heroShop || game.u.urooms?.includes(String.fromCharCode(heroShop)))
                    && (stmp.obj.oclass | 0) === _KO_COIN_CLASS) {
                    await shk_addtobill(stmp.obj, false, false, true);
                    lostgoods = true;
                }
                place_object(stmp.obj, x, y);
                await stackobj(stmp.obj);
            }
        }
        newsym(x, y);
    }
    newsym(sx, sy);
    if (u_at(sx, sy) && game.u?.uundetected && _dk_hides_under(game.youmonst?.data))
        hideunder(game.youmonst);
    {
        const mtmp = m_at(sx, sy);
        if (mtmp && mtmp.mtrapped)
            mtmp.mtrapped = 0;
    }
    maybe_unhide_at(sx, sy);
    if (lostgoods) await credit_report(_sc_shkp, 1, false);
    return total;
}
