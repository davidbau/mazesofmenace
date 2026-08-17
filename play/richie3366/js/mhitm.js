// mhitm.js — Monster vs monster combat (minimal RNG-faithful peel).
// C ref: mhitm.c — mdisplacem, mattackm, passivemm, mdamagem;
//         worn.c find_mac (re-export); uhitm.c mhitm_knockback (RNG order only).

import { rn2, rnd, d } from './rng.js';
import { distmin, m_at, record_mvitals_died, undead_to_corpse, monnear, seemimic } from './mon.js';
import { game } from './gstate.js';
import { pline, newsym, canspotmon, canseemon, map_invisible, unmap_object, glyph_is_invisible, You_feel, flush_screen } from './display.js';
import { cansee } from './vision.js';
import { dist2 } from './hacklib.js';
import { resist_conflict } from './mondata.js';
import { MON_WEP, mon_wield_item, hitval } from './weapon.js';
import { find_mac, which_armor } from './worn.js';
import { update_monster_region } from './region.js';
import { remove_worm, place_worm_tail_randomly } from './worm.js';
import {
    M_ATTK_MISS,
    M_ATTK_HIT,
    M_ATTK_DEF_DIED,
    M_ATTK_AGR_DIED,
    CORPSTAT_INIT,
    CORPSTAT_FEMALE,
    CORPSTAT_MALE,
    CORPSTAT_NONE,
    CORPSTAT_HISTORIC,
    W_ARMOR,
    W_ARMG,
    TAINT_AGE,
    NORMAL_SPEED,
    engulfing_u,
    NEED_WEAPON,
    NEED_HTH_WEAPON,
    MON_DETACH,
    LOW_PM,
    NON_PM,
    ismnum,
    has_mgivenname,
    MGIVENNAME,
    ONAME_NO_FLAGS,
    G_GENOD,
    POLY_NOFLAGS,
    ARTICLE_A,
    SUPPRESS_NAME,
    SUPPRESS_IT,
    SUPPRESS_INVISIBLE,
    TELL,
    RLOC_MSG,
    XKILL_GIVEMSG,
    XKILL_NOCORPSE,
    nothing_happens,
    AD_RBRE,
    STRAT_WAITMASK,
    M_AP_TYPE,
    M_AP_MONSTER,
} from './const.js';
import {
    verysmall, G_FREQ, G_NOCORPSE, G_UNIQ, is_neuter, nonliving,
    bigmonst, is_golem, is_mplayer, is_rider, monsterNames, mons,
    is_animal, M1_SEE_INVIS, is_vampshifter, MZ_TINY, amorphous,
    is_flyer, MR_STONE, MALE, FEMALE, NEUTRAL, can_teleport,
    touch_petrifies, poly_when_stoned, resists_ston, humanoid,
} from './monsters.js';
import { objectNames } from './objects.js';
import {
    relobj_on_death, mkcorpstat, stackobj, mksobj_at, obj_nexto,
    obj_meld, pudding_merge_message, place_object, add_to_container,
    weight,
} from './mkobj.js';
import { Monnam, mon_nam, oname, pmname, x_monnam } from './do_name.js';
import { an } from './objnam.js';
import { mon_explodes } from './explode.js';
import { newcham, pm_to_cham } from './makemon.js';
import { polyself } from './polyself.js';
import { you_were, you_unwere } from './were.js';
import { rloc, tele_restrict, tele } from './teleport.js';

const CORPSE = objectNames.indexOf('CORPSE');
const STATUE = objectNames.indexOf('STATUE');
const ROCK = objectNames.indexOf('ROCK');
const BOULDER = objectNames.indexOf('BOULDER');
const GLOB_OF_BLACK_PUDDING = objectNames.indexOf('GLOB_OF_BLACK_PUDDING');
const PM_GRAY_OOZE = monsterNames.indexOf('PM_GRAY_OOZE');
const PM_BROWN_PUDDING = monsterNames.indexOf('PM_BROWN_PUDDING');
const PM_GREEN_SLIME = monsterNames.indexOf('PM_GREEN_SLIME');
const PM_BLACK_PUDDING = monsterNames.indexOf('PM_BLACK_PUDDING');
const PM_LIZARD = monsterNames.indexOf('PM_LIZARD');
const PM_AMOROUS_DEMON = monsterNames.indexOf('PM_AMOROUS_DEMON');
const PM_SHADE = monsterNames.indexOf('PM_SHADE');
const PM_STONE_GOLEM = monsterNames.indexOf('PM_STONE_GOLEM');
const PM_GRID_BUG = monsterNames.indexOf('PM_GRID_BUG');

const NATTK = 6;
// C ref: monattk.h — AT_SPIT is 10; AT_WEAP/AT_MAGC are 254/255 (not 10).
const AT_NONE = 0;
const AT_CLAW = 1;
const AT_BITE = 2;
const AT_KICK = 3;
const AT_BUTT = 4;
const AT_TUCH = 5;
const AT_STNG = 6;
const AT_HUGS = 7;
const AT_SPIT = 10;
const AT_ENGL = 11;
const AT_BREA = 12;
const AT_EXPL = 13;
const AT_BOOM = 14;
const AT_GAZE = 15;
const AT_TENT = 16;
const AT_WEAP = 254;
const AT_MAGC = 255;
const AD_PHYS = 0;
const AD_FIRE = 2;
const AD_COLD = 3;
const AD_ELEC = 6;
const AD_DRST = 7; /* drains str (poison) — monattk.h */
const AD_ACID = 8; /* acid damage — monattk.h (was wrongly AD_DRDX=8) */
const AD_STCK = 19;
const AD_SITM = 21; /* steals item (nymphs) — monattk.h */
const AD_SEDU = 22; /* seduces & steals multiple items */
const AD_DRDX = 30; /* drains dexterity (quasit) — monattk.h */
const AD_DRCO = 31; /* drains constitution — monattk.h */
const AD_SSEX = 35; /* Succubus seduction (extended) */
const AD_POLY = 43; /* polymorph target (genetic engineer) — monattk.h */
const MR_FIRE = 0x01;
const MR_COLD = 0x02;
const MR_ELEC = 0x10;
const MR_ACID = 0x40;

const NO_ATTK = { aatyp: AT_NONE, adtyp: AD_PHYS, damn: 0, damd: 0 };

/** Per-attack visibility; set in mattackm like C gv.vis. */
let _mm_vis = false;

/** C ref: monmove.c / muse.c mdistu — squared distance to hero. */
function mdistu(mtmp) {
    const u = game.u;
    if (!u || mtmp?.mx == null) return 0;
    return dist2(mtmp.mx, mtmp.my, u.ux, u.uy);
}

/**
 * C ref: pline.c You_hear — acoustics/Deaf gate; Unaware/Underwater deferred.
 * Local copy for mhitm; trap.js has its own until shared export.
 */
async function You_hear(line) {
    const u = game.u || {};
    if (u.Deaf || game.flags?.acoustics === false) return;
    await pline(`You hear ${line}`);
}

/**
 * C ref: mhitm.c noises — out-of-sight m-vs-m combat feedback.
 * Rate-limited via gf.far_noise / gn.noisetime (stored on game).
 * Named omission: explmm AT_EXPL path shares this helper when wired.
 */
async function noises(magr, mattk) {
    const farq = mdistu(magr) > 15;
    const far_noise = !!game.far_noise;
    const noisetime = game.noisetime | 0;
    const moves = game.moves | 0;
    if (!game.u?.Deaf && (farq !== far_noise || moves - noisetime > 10)) {
        game.far_noise = farq;
        game.noisetime = moves;
        const what = (mattk?.aatyp | 0) === AT_EXPL ? 'an explosion' : 'some noises';
        await You_hear(`${what}${farq ? ' in the distance' : ''}.`);
    }
}

/** C ref: youprop.h Cold_resistance — intrinsic/extrinsic cold resist. */
function Cold_resistance() {
    const u = game.u || {};
    return !!(u.Cold_resistance || u.HCold_resistance || u.ECold_resistance);
}

/** C ref: mondata.c resists_cold — MR_COLD on data / intrinsics / extrinsics. */
function resists_cold(mon) {
    if (!mon) return false;
    const bits = (mon.data?.mresists | 0) | (mon.mextrinsics | 0)
        | (mon.mintrinsics | 0);
    return !!(bits & MR_COLD);
}

function is_you_defender(mdef) {
    // null = hero (mattacku / mgc convention); undefined = skip arm
    return mdef === null || mdef === game.youmonst || !!(mdef && mdef._youmonst);
}

/**
 * C ref: mhitu.c getmattk — base mptr->mattk[indx] + live substitutions.
 * Uses extracted monsters_data mattks (mons().mattk), not a hand table.
 * Optional mdef enables defender-dependent arms (lich cold→PHYS). Omit mdef
 * to skip those (aatyp-only scans).
 * Named omissions: SEDUCE=0 SSEX→c_sa_no/DRLI; consecutive DISE/PEST/FAMN→STUN;
 * AD_DREN energy scaling; cancelled/artifact AT_WEAP→PHYS;
 * home-elemental damn*2; prev_result disease-stun chain.
 */
export function get_mattk(magr, i, mdef = undefined) {
    if (i < 0 || i >= NATTK) return { ...NO_ATTK };
    const slots = magr?.data?.mattk;
    if (!slots || !slots[i]) return { ...NO_ATTK };
    const a = slots[i];
    const attk = {
        aatyp: a.aatyp | 0,
        adtyp: a.adtyp | 0,
        damn: a.damn | 0,
        damd: a.damd | 0,
        // C getmattk returns &mptr->mattk[indx] when unsubstitued — hitmsg
        // uses pointer+1 for "again" (D-0840).
        _slot: a,
        _indx: i,
    };

    // C: holders/engulfers with mspec_used cannot re-hold; switch to simpler attack
    if ((magr.mspec_used | 0)
        && (attk.aatyp === AT_ENGL || attk.aatyp === AT_HUGS
            || attk.adtyp === AD_STCK || attk.adtyp === AD_POLY)) {
        const wimpy = attk.damd === 0; // lichen, violet fungus
        if (attk.adtyp === AD_ACID || attk.adtyp === AD_ELEC
            || attk.adtyp === AD_COLD || attk.adtyp === AD_FIRE) {
            attk.aatyp = AT_TUCH;
        } else {
            attk.aatyp = AT_CLAW;
            attk.adtyp = AD_PHYS;
        }
        attk.damn = 1;
        attk.damd = 6;
        if (wimpy && attk.aatyp === AT_CLAW) {
            attk.aatyp = AT_TUCH;
            attk.damn = 0;
            attk.damd = 0;
        }
        // C: alt_attk_buf — not &mattk[indx]; "again" pointer+1 must fail
        attk._slot = null;
    } else if (mdef !== undefined && i === 0
        && attk.aatyp === AT_TUCH && attk.adtyp === AD_COLD) {
        // C: lich cold touch vs cold-resistant target → weaker PHYS
        // master 3d6→2d6; arch 5d6→3d6; lich 1d10→1d6; demi 3d4→2d4
        const udefend = is_you_defender(mdef);
        const cold_ok = udefend ? Cold_resistance() : resists_cold(mdef);
        const mndx = mdef?.data?.mndx ?? mdef?.mnum ?? -1;
        if (cold_ok && mndx !== PM_SHADE) {
            attk.adtyp = AD_PHYS;
            attk.damn = ((attk.damn | 0) + 1) >> 1;
            if (attk.damd === 10) attk.damd = 6;
            attk._slot = null;
        }
    }

    return attk;
}

/** C ref: youprop.h Antimagic — H || E flat. */
function Antimagic(u = game.u || {}) {
    return !!(u.Antimagic || u.HAntimagic || u.EAntimagic);
}

/** C ref: youprop.h Unchanging — H || E flat. */
function Unchanging(u = game.u || {}) {
    return !!(u.Unchanging || u.HUnchanging || u.EUnchanging);
}

/**
 * C ref: mondata.c resists_magm — dmgtype AD_MAGM / baby gray / AD_RBRE.
 * Named omit: wielded/worn/carried ANTIMAGIC artifact scan.
 */
function resists_magm(mon) {
    if (!mon) return false;
    const ptr = mon.data;
    if (!ptr) return false;
    if (dmgtype(ptr, 1 /* AD_MAGM */)) return true;
    const mndx = ptr.mndx ?? ptr.mnum;
    if (mndx === monsterNames.indexOf('PM_BABY_GRAY_DRAGON')) return true;
    if (dmgtype(ptr, AD_RBRE)) return true;
    return false;
}

/**
 * C ref: zap.c resist — WAND_CLASS alev=12; tell/shield polish deferred.
 * @returns {boolean} true if resisted
 */
function resist_poly(mtmp, _tell) {
    const alev = 12; // WAND_CLASS
    let dlev = mtmp.m_lev | 0;
    if (dlev > 50) dlev = 50;
    else if (dlev < 1) dlev = 1;
    const mr = mtmp.data?.mr | 0;
    return rn2(100 + alev - dlev) < mr;
}

function is_youmonst(m) {
    return m == null || m === game.youmonst || !!(m && m._youmonst);
}

/**
 * C ref: mhitm.c mon_poly — AD_POLY metamorphosis.
 * Ported: youmonst lycanthropy/polyself (D-1004) + monster-defender
 * resists_magm/resist/system-shock/newcham/tele follow-up (D-1006).
 * Named omissions: shieldeff / shieldeff_mon flash; ANTIMAGIC gear scan
 * in resists_magm; TELL resist pline polish.
 * @returns {Promise<number>} remaining damage (0 when shape-change applied)
 */
export async function mon_poly(magr, mdef, dmg) {
    const oldform = mdef?.data;
    const isyou = is_youmonst(mdef);
    if (isyou) {
        const u = game.u || {};
        if (Antimagic(u)) {
            // shieldeff(u.ux, u.uy) deferred
        } else if (Unchanging(u)) {
            // just take a little damage
        } else if ((u.ulycn | 0) === NON_PM) {
            await pline('You are subjected to a freakish metamorphosis.');
            await polyself(POLY_NOFLAGS);
            dmg = 0;
        } else if ((u.umonnum | 0) !== (u.ulycn | 0)) {
            await You_feel('an unnatural urge coming on.');
            await you_were();
            dmg = 0;
        } else {
            await You_feel('a natural urge coming on.');
            await you_unwere(false);
            dmg = 0;
        }
    } else {
        const Before = Monnam(mdef);
        const vis = _mm_vis
            || is_youmonst(magr)
            || (canspotmon(mdef) && cansee(mdef.mx | 0, mdef.my | 0));
        if (resists_magm(mdef)) {
            // shieldeff_mon deferred
        } else if (resist_poly(mdef, TELL)) {
            // general resistance to magic — TELL pline deferred
        } else if (!rn2(25) && (mdef.cham ?? NON_PM) === NON_PM
                   && (mdef.mcan
                       || pm_to_cham(mdef.data?.mndx ?? mdef.mnum ?? NON_PM)
                           !== NON_PM)) {
            // system shock — half max HP rather than kill outright
            if (vis) await pline(`${Before} shudders!`);
            dmg += Math.trunc(((mdef.mhpmax | 0) + 1) / 2);
            mdef.mhp = (mdef.mhp | 0) - (dmg | 0);
            dmg = 0;
            if (deadmonster(mdef)) {
                if (is_youmonst(magr)) {
                    const { xkilled } = await import('./uhitm.js');
                    await xkilled(mdef, XKILL_GIVEMSG | XKILL_NOCORPSE);
                } else {
                    await monkilled(mdef, '', AD_RBRE);
                }
            }
        } else if (newcham(mdef, null, 0)) {
            if (vis) {
                const was_seen = Before.toLowerCase() !== 'it';
                const verbosely = game.flags?.verbose !== false || !was_seen;
                const freaky = ' undergoes a freakish metamorphosis';
                if (canspotmon(mdef)) {
                    const into = x_monnam(
                        mdef, ARTICLE_A, null,
                        SUPPRESS_NAME | SUPPRESS_IT | SUPPRESS_INVISIBLE,
                        false,
                    );
                    await pline(
                        `${Before}${verbosely ? freaky : ''}`
                        + `${verbosely ? ' and' : ''} turns into ${into}.`,
                    );
                } else if (was_seen || is_youmonst(magr)) {
                    await pline(
                        `${Before}${freaky}`
                        + `${!was_seen ? '' : ' and disappears'}.`,
                    );
                }
            }
            dmg = 0;
            if (can_teleport(magr?.data)) {
                if (is_youmonst(magr)) {
                    await tele();
                } else if (!(await tele_restrict(magr))) {
                    await rloc(magr, RLOC_MSG);
                }
            }
        } else if (vis && game.flags?.verbose !== false) {
            await pline(nothing_happens);
        }
    }
    // when a transformation has happened, can't attack again for poly
    // effect during next turn or two; not enforced for poly'd hero
    if (mdef?.data !== oldform && magr && !is_youmonst(magr)) {
        magr.mspec_used = (magr.mspec_used | 0) + rnd(2);
    }
    return dmg | 0;
}

/**
 * C ref: uhitm.c mhitm_ad_poly — mhitm (mon→mon) and uhitm (you→mon) arms.
 * Named omissions: uhitm weaponless poly'd-hero path (damageum); shieldeff.
 */
export async function mhitm_ad_poly(magr, mattk, mdef, mhm) {
    void mattk;
    const negated = (await mhitm_mgc_atk_negated(magr, mdef, false))
        || !!(magr?.mspec_used);
    if (is_youmonst(magr)) {
        // uhitm: require weaponless + dmg < mhp
        const uwep = game.u?.uwep;
        if (!uwep && (mhm.damage | 0) < (mdef.mhp | 0)) {
            if (negated) {
                await pline(`${Monnam(mdef)} is not transformed.`);
            } else {
                mhm.damage = await mon_poly(magr, mdef, mhm.damage | 0);
                if (deadmonster(mdef)) mhm.hitflags |= M_ATTK_DEF_DIED;
                mhm.hitflags |= M_ATTK_HIT;
                mhm.done = true;
            }
        }
    } else if (is_youmonst(mdef)) {
        // mhitu arm lives in mhitu.js mhitm_ad_poly_u
    } else {
        // mhitm
        if ((mhm.damage | 0) < (mdef.mhp | 0) && !negated) {
            mhm.damage = await mon_poly(magr, mdef, mhm.damage | 0);
            if (deadmonster(mdef)) mhm.hitflags |= M_ATTK_DEF_DIED;
            mhm.hitflags |= M_ATTK_HIT;
            mhm.done = true;
        }
    }
}

export {
    AT_NONE, AT_CLAW, AT_BITE, AT_KICK, AT_BUTT, AT_TUCH, AT_STNG, AT_HUGS,
    AT_SPIT, AT_ENGL, AT_BREA, AT_EXPL, AT_BOOM, AT_GAZE, AT_TENT,
    AT_WEAP, AT_MAGC, AD_PHYS, AD_FIRE, AD_COLD, AD_ELEC, AD_DRST, AD_ACID,
    AD_DRDX, AD_DRCO, AD_SITM, AD_SEDU, AD_SSEX, AD_POLY,
    could_seduce,
};

function deadmonster(m) {
    return !m || (m.mhp != null && m.mhp < 1);
}

/** C ref: mondata.h dmgtype — any mattk slot matches adtyp. */
function dmgtype(ptr, adtyp) {
    const slots = ptr?.mattk;
    if (!slots) return false;
    for (const a of slots) {
        if ((a.adtyp | 0) === (adtyp | 0)) return true;
    }
    return false;
}

/** C ref: mondata.h perceives — M1_SEE_INVIS. */
function perceives(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_SEE_INVIS);
}

/** C ref: mondata.c gender — 0 male / 1 female / 2 none. */
function gender(mtmp) {
    if (is_neuter(mtmp?.data)) return 2;
    return mtmp?.female ? 1 : 0;
}

/**
 * C ref: polyself.c poly_gender — 0/1 ≡ flags.female, 2=none.
 * Named omission: is_neuter non-humanoid → 2.
 */
function poly_gender() {
    return game.flags?.female ? 1 : 0;
}

/** C ref: youprop.h See_invisible. */
function See_invisible() {
    const u = game.u || {};
    return !!((u.HSee_invisible | 0) || (u.ESee_invisible | 0) || u.See_invisible);
}

/** C ref: sys.h SYSOPT_SEDUCE — runtime seduce option. */
function SYSOPT_SEDUCE() {
    return !!(game.sysopt?.seduce);
}

/**
 * C ref: do_name.c mon_nam_too — mon_nam unless mon==other → him/her/itself.
 * Named omission: Hallu pronoun_gender rn2(4) → themselves.
 */
function mon_nam_too(mon, other_mon) {
    if (mon !== other_mon) return mon_nam(mon);
    if (is_neuter(mon?.data)) return 'itself';
    return mon?.female ? 'herself' : 'himself';
}

/**
 * C ref: mhitu.c could_seduce — 0 refuse, 1 opposite gender,
 * 2 same-gender nymph. Null mattk → capability from dmgtype.
 */
function could_seduce(magr, mdef, mattk) {
    if (!magr?.data || is_animal(magr.data)) return 0;

    const youmonst = game.youmonst;
    let pagr;
    let agrinvis;
    let genagr;
    if (magr === youmonst) {
        pagr = youmonst?.data;
        agrinvis = !!(game.u?.Invis);
        genagr = poly_gender();
    } else {
        pagr = magr.data;
        agrinvis = !!magr.minvis;
        genagr = gender(magr);
    }

    let defperc;
    let gendef;
    if (mdef === youmonst) {
        defperc = See_invisible();
        gendef = poly_gender();
    } else {
        defperc = perceives(mdef?.data);
        gendef = gender(mdef);
    }

    let adtyp = mattk
        ? (mattk.adtyp | 0)
        : dmgtype(pagr, AD_SSEX) ? AD_SSEX
            : dmgtype(pagr, AD_SEDU) ? AD_SEDU
                : AD_PHYS;
    if (adtyp === AD_SSEX && !SYSOPT_SEDUCE()) adtyp = AD_SEDU;

    if (agrinvis && !defperc && adtyp === AD_SEDU) return 0;

    const mndx = pagr?.mndx ?? pagr?.mnum ?? -1;
    if ((pagr?.mlet !== 'S_NYMPH' && mndx !== PM_AMOROUS_DEMON)
        || (adtyp !== AD_SEDU && adtyp !== AD_SSEX && adtyp !== AD_SITM)) {
        return 0;
    }

    return (genagr === 1 - gendef) ? 1 : (pagr.mlet === 'S_NYMPH') ? 2 : 0;
}

function helpless(m) {
    return !!(m.msleeping || !m.mcanmove);
}

/**
 * C ref: you.h mhis → genders[pronoun_gender(mtmp, PRONOUN_HALLU)].his.
 * Hallu uses core rn2(4) (mondata.c), not the display stream.
 * type_is_pname still named (uniq/humanoid cover most vis displace msgs).
 */
function mhis_disp(mtmp) {
    if (game.u?.Hallucination) {
        return ['his', 'her', 'its', 'their'][rn2(4)];
    }
    const ptr = mtmp?.data;
    if (is_neuter(ptr)) return 'its';
    if (humanoid(ptr) || ((ptr?.geno | 0) & G_UNIQ)) {
        return mtmp?.female ? 'her' : 'his';
    }
    return 'its';
}

/**
 * C ref: mhitm.c mdisplacem — swap magr onto mdef's cell.
 * update_monster_region both after both place_monster and the
 * defender's worm tail (mhitm.c:251–257, D-1174). Not rloc_to
 * (that updates the relocating mon before tail, D-1161).
 * dogmove caller / should_displace / dbridge still named.
 */
export async function mdisplacem(magr, mdef, quietly) {
    if (!magr || !mdef || magr === mdef) return M_ATTK_MISS;
    const pa = magr.data;
    const pd = mdef.data;
    const tx = mdef.mx | 0, ty = mdef.my | 0; /* destination */
    const fx = magr.mx | 0, fy = magr.my | 0; /* current location */
    if (m_at(fx, fy) !== magr || m_at(tx, ty) !== mdef) return M_ATTK_MISS;

    // C: 1-in-7 miss matches do_attack pet displacement
    if (!rn2(7)) return M_ATTK_MISS;

    if ((pa?.mndx | 0) === PM_GRID_BUG && magr.mx !== mdef.mx
        && magr.my !== mdef.my) {
        return M_ATTK_MISS;
    }

    if (mdef.mundetected) mdef.mundetected = 0;
    if (M_AP_TYPE(mdef) && M_AP_TYPE(mdef) !== M_AP_MONSTER) {
        seemimic(mdef);
    }
    mdef.msleeping = 0;
    mdef.mstrategy = (mdef.mstrategy | 0) & ~STRAT_WAITMASK;
    // C finish_meating — dogmove.js export would cycle; mimic AP named there
    mdef.meating = 0;

    const vis = !!(canspotmon(magr) && canspotmon(mdef));

    if (touch_petrifies(pd) && !resists_ston(magr)) {
        if (!which_armor(magr, W_ARMG)) {
            if (poly_when_stoned(pa, game.mvitals)) {
                await mon_to_stone(magr);
                return M_ATTK_HIT;
            }
            if (!quietly && canspotmon(magr)) {
                if (vis) {
                    const whose = is_rider(pa) ? 'the' : mhis_disp(magr);
                    await pline(
                        `${Monnam(magr)} tries to move ${mon_nam(mdef)} out of ${whose} way.`,
                    );
                }
                await pline(`${Monnam(magr)} turns to stone!`);
            }
            await monstone(magr);
            if ((magr.mhp | 0) > 0) return M_ATTK_HIT;
            if (magr.mtame && !vis) {
                await pline(
                    'You have a peculiarly sad feeling for a moment, then it passes.',
                );
            }
            return M_ATTK_AGR_DIED;
        }
    }

    // JS occupancy is mx/my (C remove_monster clears level.monsters[][]).
    magr.mx = 0;
    magr.my = 0;
    if (mdef.wormno) {
        remove_worm(mdef);
    } else {
        mdef.mx = 0;
        mdef.my = 0;
    }
    magr.mx = tx;
    magr.my = ty;
    mdef.mx = fx;
    mdef.my = fy;
    if (mdef.wormno) {
        place_worm_tail_randomly(mdef, fx, fy);
    }
    // C: after both places + defender tail — not rloc's before-tail
    update_monster_region(magr);
    update_monster_region(mdef);

    if (vis && !quietly) {
        const whose = is_rider(pa) ? 'the' : mhis_disp(magr);
        await pline(
            `${Monnam(magr)} moves ${mon_nam(mdef)} out of ${whose} way!`,
        );
    }
    newsym(fx, fy);
    newsym(tx, ty);
    await flush_screen(0);

    return M_ATTK_HIT;
}

// C ref: worn.c find_mac — body lives in worn.js (minvent ARM_BONUS).
export { find_mac };

// C ref: mondata.c max_passive_dmg() — AT_NONE/AT_BOOM passives × magr hits.
// Elemental AD_ACID/FIRE/COLD/ELEC + AD_PHYS; complete-burn/rot/rust deferred.
function max_passive_dmg(mdef, magr) {
    const md = mdef?.data;
    if (!md) return 0;
    let multi2 = 0;
    for (let i = 0; i < NATTK; i++) {
        const a = get_mattk(magr, i).aatyp;
        // C: CLAR/BITE/KICK/BUTT/TUCH/STNG/HUGS/ENGL/TENT/WEAP
        if (a === AT_CLAW || a === AT_BITE || a === AT_KICK || a === AT_BUTT
            || a === AT_TUCH || a === AT_STNG || a === AT_HUGS || a === AT_ENGL
            || a === AT_TENT || a === AT_WEAP) {
            multi2++;
        }
    }
    const mres = (magr?.data?.mresists | 0)
        | (magr?.mextrinsics | 0)
        | (magr?.mintrinsics | 0);
    let dmg = 0;
    for (let i = 0; i < NATTK; i++) {
        const at = get_mattk(mdef, i);
        if (at.aatyp !== AT_NONE && at.aatyp !== AT_BOOM) continue;
        const adtyp = at.adtyp | 0;
        // Named omission: completelyburns/rots/rusts → dmg = magr.mhp
        if ((adtyp === AD_ACID && !(mres & MR_ACID))
            || (adtyp === AD_COLD && !(mres & MR_COLD))
            || (adtyp === AD_FIRE && !(mres & MR_FIRE))
            || (adtyp === AD_ELEC && !(mres & MR_ELEC))
            || adtyp === AD_PHYS) {
            dmg = at.damn | 0;
            if (!dmg) dmg = (md.mlevel | 0) + 1;
            dmg *= at.damd | 0;
        }
        dmg *= multi2;
        break;
    }
    return dmg;
}

export { max_passive_dmg };

// C ref: mhitm.c passivemm() — always burns rn2(3) when defender alive
function passivemm(magr, mdef, mhitb, mdead) {
    const mhit = mhitb ? M_ATTK_HIT : M_ATTK_MISS;
    // Find AT_NONE slot (NO_ATTK for jackal/lichen at i>=1)
    let i = 0;
    for (;; i++) {
        if (i >= NATTK) return mdead | mhit;
        const mattk = get_mattk(mdef, i);
        if (mattk.aatyp === AT_NONE) break;
    }
    const mattk = get_mattk(mdef, i);
    void mattk;
    if (mdead || deadmonster(mdef)) return mdead | mhit;
    // C always rolls rn2(3) for passives even when AT_NONE does nothing
    rn2(3);
    return mdead | mhit;
}

/**
 * C ref: mhitu.c magic_negation — worn armor a_can max for hero.
 * Amulet/extrinsic Protection bumps deferred (same as invent subset).
 */
function magic_negation_you() {
    let mc = 0;
    for (const o of game.invent || []) {
        if (((o.owornmask || 0) & W_ARMOR) !== 0) {
            const armpro = game.objects?.[o.otyp]?.oc_level ?? 0;
            if (armpro > mc) mc = armpro;
        }
    }
    return mc;
}

/**
 * C ref: uhitm.c mhitm_mgc_atk_negated — cancellation / MC gate.
 * Always burns rn2(10) unless attacker is cancelled (mcan → TRUE, no roll).
 * mdef null = hero (&gy.youmonst). Verbose pline only when thwarted.
 */
export async function mhitm_mgc_atk_negated(magr, mdef, verbosely) {
    // C: magr != &youmonst && magr->mcan → TRUE (no message)
    if (magr != null && magr.mcan) return true;

    const armpro = (mdef == null) ? magic_negation_you() : 0;
    // Named omission: monster-defender magic_negation (minvent a_can) —
    // not needed until m-vs-m elemental peels call this with mdef set.
    const negated = !(rn2(10) >= 3 * armpro);
    if (negated) {
        if (verbosely) {
            if (mdef == null) await pline('You avoid harm.');
            // mon-visible "avoids harm" deferred
        }
        return true;
    }
    return false;
}

// C ref: uhitm.c mhitm_knockback — burn RNG in C order; hurtle body deferred.
// Called from mhitu hitmu, mhitm mdamagem, and uhitm hmon (maybe_knockback).
export function mhitm_knockback(magr, mdef, mattk, hitflags, weapon_used) {
    // C: knockdistance = rn2(3) ? 1 : 2; then if (rn2(chance)) return
    // (chance=6 unless ART_OGRESMASHER; artifact arm deferred)
    rn2(3);
    rn2(6);
    if (!(mattk.aatyp === AT_CLAW || mattk.aatyp === AT_KICK
            || mattk.aatyp === AT_BUTT || mattk.aatyp === AT_WEAP)) {
        return false;
    }
    void magr;
    void mdef;
    void weapon_used;
    void hitflags;
    // Named omission: size/weapon/steadfast gates + hurtle/mhurtle body
    return false;
}

/**
 * C ref: mon.c corpse_chance() — AT_BOOM then always-TRUE arms then !rn2(tmp).
 * Named omissions: Vlad/lich dust; swallowed boom; LEVEL_SPECIFIC_NOCORPSE.
 */
async function corpse_chance(mon) {
    const mdat = mon.data;
    if (!mdat) return false;
    const slots = mdat.mattk;
    if (slots) {
        for (let i = 0; i < NATTK; i++) {
            const at = slots[i];
            if (!at || (at.aatyp | 0) !== AT_BOOM) continue;
            if (at.damn) d(at.damn | 0, at.damd | 0);
            else if (at.damd) d((mdat.mlevel | 0) + 1, at.damd | 0);
            await mon_explodes(mon, at);
            return false;
        }
    }
    if ((((bigmonst(mdat) || (mdat.mndx ?? -1) === PM_LIZARD) && !mon.mcloned)
        || is_golem(mdat) || is_mplayer(mdat) || is_rider(mdat) || mon.isshk)) {
        return true;
    }
    let tmp = 2 + (((mdat.geno ?? 0) & G_FREQ) < 2 ? 1 : 0)
        + (verysmall(mdat) ? 1 : 0);
    return !rn2(tmp);
}

// C ref: mon.c make_corpse — undead specials before G_NOCORPSE; pudding globs;
// else default_1. Named omission: dragon scales, unicorn horn, worm tooth,
// golem drops, lich dust, and other pre-G_NOCORPSE switch arms (D-0271
// undead; D-0993 pudding merge).
export function make_corpse(mtmp) {
    const mdat = mtmp.data;
    const mndx = mtmp.mnum ?? mdat?.mndx;
    const x = mtmp.mx, y = mtmp.my;
    if (mndx == null || mndx < 0) return null;

    let corpstatflags = CORPSTAT_NONE;
    if (mtmp.female) corpstatflags |= CORPSTAT_FEMALE;
    else if (!is_neuter(mdat)) corpstatflags |= CORPSTAT_MALE;

    // C: zombie/mummy/vampire arms precede G_NOCORPSE (geno has G_NOCORPSE
    // so wishes cannot create those corpses, but kills still leave a mapped
    // living-species corpse via undead_to_corpse).
    const living = undead_to_corpse(mndx);
    if (living !== mndx) {
        corpstatflags |= CORPSTAT_INIT;
        // C: always pass mtmp for undead (not KEEPTRAITS)
        const obj = mkcorpstat(CORPSE, mtmp, living, x, y, corpstatflags);
        if (obj) {
            obj.age = (obj.age | 0) - (TAINT_AGE + 1);
            stackobj(obj);
            newsym(x, y);
        }
        return obj;
    }

    // C: gray ooze / brown pudding / green slime / black pudding → GLOB
    if (mndx === PM_GRAY_OOZE || mndx === PM_BROWN_PUDDING
        || mndx === PM_GREEN_SLIME || mndx === PM_BLACK_PUDDING) {
        // C: GLOB_OF_BLACK_PUDDING - (PM_BLACK_PUDDING - mndx)
        const gtyp = GLOB_OF_BLACK_PUDDING - (PM_BLACK_PUDDING - mndx);
        let obj = mksobj_at(gtyp, x, y, true, false);
        while (obj) {
            const otmp = obj_nexto(obj);
            if (!otmp) break;
            void pudding_merge_message(obj, otmp);
            const r1 = { obj };
            const r2 = { obj: otmp };
            obj = obj_meld(r1, r2);
        }
        // free_mgivenname deferred
        newsym(x, y);
        return obj;
    }

    if ((game.mvitals?.[mndx]?.mvflags ?? 0) & G_NOCORPSE) return null;

    corpstatflags |= CORPSTAT_INIT;
    // C: KEEPTRAITS — shk/tame/unique/reviver/quest-leader/seduce
    const keep = !!(mtmp.isshk || mtmp.mtame
        || ((mdat?.geno | 0) & G_UNIQ)
        || (mdat && (is_rider(mdat) || mdat.mlet === 'S_TROLL'))
        || ((mtmp.m_id | 0) === (game.quest_status?.leader_m_id | 0)
            && (game.quest_status?.leader_m_id | 0))
        || dmgtype(mdat, AD_SEDU) || dmgtype(mdat, AD_SSEX));
    const obj = mkcorpstat(CORPSE, keep ? mtmp : null, mdat, x, y, corpstatflags);
    if (obj) {
        stackobj(obj);
        newsym(x, y);
    }
    return obj;
}

/**
 * C ref: mon.c mon_to_stone — golem → stone golem via newcham.
 * Call only when poly_when_stoned is true.
 */
export async function mon_to_stone(mtmp) {
    if (!mtmp?.data || !is_golem(mtmp.data)) {
        return;
    }
    if (canseemon(mtmp)) {
        await pline(`${Monnam(mtmp)} solidifies...`);
    }
    if (newcham(mtmp, mons(PM_STONE_GOLEM), 0)) {
        if (canseemon(mtmp)) {
            const g = mtmp.female ? FEMALE : MALE;
            await pline(`Now it's ${an(pmname(mtmp.data, g))}.`);
        }
    } else if (canseemon(mtmp)) {
        await pline('... and returns to normal.');
    }
}

/**
 * C ref: mon.c vamp_stone — vampshifter / stone-immune cham revert.
 * Named omissions: expels; closed_door enexto rloc; set_mon_min_mhpmax
 * polish; full lapidifying / rises plines; display_nhwindow.
 * @returns {boolean} true if petrification should continue
 */
export async function vamp_stone(mtmp) {
    if (!mtmp) return true;
    if (is_vampshifter(mtmp)) {
        const mndx = mtmp.cham ?? NON_PM;
        const cur = mtmp.data?.mndx ?? NON_PM;
        if (mndx >= LOW_PM && mndx !== cur
            && !((game.mvitals?.[mndx]?.mvflags ?? 0) & G_GENOD)) {
            mtmp.mcanmove = 1;
            mtmp.mfrozen = 0;
            if ((mtmp.mhpmax | 0) < 10) mtmp.mhpmax = 10;
            mtmp.mhp = mtmp.mhpmax | 0;
            // expels / door-rloc deferred
            newcham(mtmp, mons(mndx), 0);
            if ((mtmp.data?.mndx | 0) === (mndx | 0)) mtmp.cham = NON_PM;
            else mtmp.cham = mndx;
            if (mtmp.mx > 0) newsym(mtmp.mx, mtmp.my);
            return false;
        }
    } else if (ismnum(mtmp.cham)
        && ((mons(mtmp.cham)?.mresists | 0) & MR_STONE)) {
        mtmp.mcanmove = 1;
        mtmp.mfrozen = 0;
        if ((mtmp.mhpmax | 0) < 10) mtmp.mhpmax = 10;
        mtmp.mhp = mtmp.mhpmax | 0;
        newcham(mtmp, mons(mtmp.cham), 0); // NC_SHOW_MSG deferred
        if (mtmp.mx > 0) newsym(mtmp.mx, mtmp.my);
        return false;
    }
    void amorphous;
    void is_flyer;
    return true;
}

/**
 * C ref: zap.c obj_resists(obj,0,0) — invocation tools only (no rn2);
 * ordinary objects burn rn2(100) then fail with ochance 0.
 */
function obj_resists_00(obj) {
    if (!obj) return false;
    const n = objectNames[obj.otyp];
    if (n === 'AMULET_OF_YENDOR'
        || n === 'SPE_BOOK_OF_THE_DEAD'
        || n === 'CANDELABRUM_OF_INVOCATION'
        || n === 'BELL_OF_OPENING'
        || (n === 'CORPSE' && is_rider(mons(obj.corpsenm)))) {
        return true;
    }
    rn2(100); // C always consumes for ordinary
    return false;
}

/**
 * C ref: mon.c monstone — statue or rock + mondead.
 * Named omissions: lifesaved_monster; flooreffects on ejected boulder;
 * end_burn lamplit; engulfing_u digests pline; free_mgivenname.
 */
export async function monstone(mdef) {
    if (!(await vamp_stone(mdef))) return;

    const x = mdef.mx | 0;
    const y = mdef.my | 0;
    mdef.mhp = 0;
    // lifesaved_monster deferred
    if ((mdef.mhp | 0) > 0) return;

    mdef.mtrapped = 0;

    let otmp;
    const msize = mdef.data?.msize ?? 0;
    const geno = mdef.data?.geno ?? 0;
    if (msize > MZ_TINY
        || !rn2(2 + (((geno & G_FREQ) > 2) ? 1 : 0))) {
        let oldminvent = null;
        while (mdef.minvent) {
            const obj = mdef.minvent;
            mdef.minvent = obj.nobj;
            obj.nobj = null;
            obj.owornmask = 0;
            obj.ocarry = null;
            if (obj.otyp === BOULDER || obj_resists_00(obj)) {
                // flooreffects deferred — place on floor
                place_object(obj, x, y);
            } else {
                // end_burn deferred
                obj.nobj = oldminvent;
                oldminvent = obj;
            }
        }
        mdef.mw = null;
        let corpstatflags = CORPSTAT_NONE;
        if (mdef.female) corpstatflags |= CORPSTAT_FEMALE;
        else if (!is_neuter(mdef.data)) corpstatflags |= CORPSTAT_MALE;
        if ((mdef.data?.geno | 0) & G_UNIQ) corpstatflags |= CORPSTAT_HISTORIC;
        otmp = mkcorpstat(STATUE, mdef, mdef.data, x, y, corpstatflags);
        if (has_mgivenname(mdef) && otmp) {
            otmp = oname(otmp, MGIVENNAME(mdef), ONAME_NO_FLAGS);
        }
        while (oldminvent) {
            const obj = oldminvent;
            oldminvent = obj.nobj;
            obj.nobj = null;
            if (otmp) add_to_container(otmp, obj);
        }
        if (otmp) otmp.owt = weight(otmp);
    } else {
        otmp = mksobj_at(ROCK, x, y, true, false);
    }

    if (otmp) stackobj(otmp);
    if (x > 0 && glyph_is_invisible(game.level?.at?.(x, y))) {
        unmap_object(x, y);
    }
    if (x > 0 && cansee(x, y)) newsym(x, y);
    mondead(mdef);
}

// C ref: mon.c mondead → m_detach(due_to_death) → relobj(mtmp, 1, FALSE)
// Dead mons stay on fmon until dmonsfree (mon.c) — do not splice here.
export function mondead(mtmp) {
    mtmp.mhp = 0;
    const mx = mtmp.mx, my = mtmp.my;
    // C: after cham/were restore — mvitals[monsndx].died++
    record_mvitals_died(mtmp.mnum ?? mtmp.data?.mndx);
    mtmp.mstate = (mtmp.mstate | 0) | MON_DETACH;
    // Keep mx/my for drop + make_corpse (C mon_leaving_level).
    relobj_on_death(mtmp);
    // C mon.c mondead: glyph_is_invisible → unmap_object before detach display
    if (mx > 0 && glyph_is_invisible(game.level?.at?.(mx, my))) {
        unmap_object(mx, my);
    }
    if (mx > 0) newsym(mx, my);
}

/**
 * C ref: mon.c mondied() — mondead + maybe make_corpse (no kill pline).
 * Named omission: accessible||is_pool gate (floor tiles always attempt).
 */
export async function mondied(mdef) {
    mondead(mdef);
    if ((mdef.mhp | 0) > 0) return; /* lifesaved */
    if (await corpse_chance(mdef)) make_corpse(mdef);
}

/**
 * C ref: mon.c monkilled — pline then mondied (or mondead if disintegested).
 * Named omissions: worm_known; AD_DGST/-AD_RBRE/FIRE completelyburns
 * disintegested → mondead; pet roast pline.
 */
export async function monkilled(mdef, fltxt, _how) {
    const txt = fltxt || '';
    if (cansee(mdef.mx, mdef.my)) {
        const verb = nonliving(mdef.data) ? 'destroyed' : 'killed';
        await pline(
            `${Monnam(mdef)} is ${verb}${txt ? ' by the ' : ''}${txt}!`,
        );
    } else if (mdef.mtame) {
        game.iflags = game.iflags || {};
        game.iflags.sad_feeling = true;
    }
    // disintegested → mondead-only deferred; ordinary path uses mondied
    await mondied(mdef);
}

// C ref: makemon.c grow_up() — HP gain from kill; transform later
function grow_up(mtmp, victim) {
    if (deadmonster(mtmp)) return null;
    if (!victim) {
        const gain = rnd(8);
        mtmp.mhpmax += gain;
        mtmp.mhp += gain;
        return mtmp.data;
    }
    let hp_threshold = (mtmp.m_lev || 0) * 8;
    if (!mtmp.m_lev) hp_threshold = 4;
    let max_increase = rnd((victim.m_lev || 0) + 1);
    if (mtmp.mhpmax + max_increase > hp_threshold + 1) {
        max_increase = Math.max((hp_threshold + 1) - mtmp.mhpmax, 0);
    }
    const cur_increase = max_increase > 1 ? rn2(max_increase) : 0;
    mtmp.mhpmax += max_increase;
    mtmp.mhp += cur_increase;
    if (mtmp.mhpmax <= hp_threshold) return mtmp.data;
    mtmp.m_lev = (mtmp.m_lev || 0) + 1;
    return mtmp.data;
}

// C ref: mhitm.c pre_mm_attack — reveal + map_invisible when gv.vis
// Named omission: seemimic / mundetected clear + showit newsym arms
function pre_mm_attack(magr, mdef) {
    if (!_mm_vis) return;
    if (!canspotmon(magr)) map_invisible(magr.mx, magr.my);
    if (!canspotmon(mdef)) map_invisible(mdef.mx, mdef.my);
}

/**
 * C ref: mhitm.c missmm — pline when gv.vis; else noises().
 * Seduce: "pretends to be friendly to" when could_seduce && !mcan.
 */
async function missmm(magr, mdef, mattk) {
    pre_mm_attack(magr, mdef);
    if (_mm_vis) {
        const verb = (magr.mcan || !could_seduce(magr, mdef, mattk))
            ? 'misses'
            : 'pretends to be friendly to';
        await pline(`${Monnam(magr)} ${verb} ${mon_nam_too(mdef, magr)}.`);
    } else {
        await noises(magr, mattk);
    }
}

// C ref: mhitm.c mdamagem() — physical bite damage + AD_POLY + knockback RNG
async function mdamagem(magr, mdef, mattk, mwep, dieroll) {
    let damage = d(mattk.damn || 0, mattk.damd || 0);
    let hitflags = M_ATTK_MISS;
    void dieroll;

    if (mattk.adtyp === AD_STCK) {
        damage = 0;
    }

    // C: mhitm_adtyping → mhitm_ad_poly for AD_POLY (D-1006)
    if ((mattk.adtyp | 0) === AD_POLY) {
        const mhm = {
            damage,
            hitflags: M_ATTK_MISS,
            done: false,
        };
        await mhitm_ad_poly(magr, mattk, mdef, mhm);
        mhitm_knockback(magr, mdef, mattk, mhm.hitflags, !!mwep);
        if (mhm.done) return mhm.hitflags;
        damage = mhm.damage | 0;
        hitflags = mhm.hitflags | 0;
        if (!damage) return hitflags;
        mdef.mhp -= damage;
        if (mdef.mhp < 1) {
            mdef.mhp = 0;
            await monkilled(mdef, '', mattk.adtyp | 0);
            const grew = grow_up(magr, mdef);
            return M_ATTK_DEF_DIED | (grew ? 0 : M_ATTK_AGR_DIED);
        }
        return hitflags || M_ATTK_HIT;
    }

    mhitm_knockback(magr, mdef, mattk, hitflags, !!mwep);

    if (!damage) return hitflags === M_ATTK_AGR_DIED ? M_ATTK_AGR_DIED : M_ATTK_HIT;

    mdef.mhp -= damage;
    if (mdef.mhp < 1) {
        mdef.mhp = 0;
        // C: mdamagem → monkilled(mdef, "", mattk->adtyp)
        await monkilled(mdef, '', mattk.adtyp | 0);
        const grew = grow_up(magr, mdef);
        return M_ATTK_DEF_DIED | (grew ? 0 : M_ATTK_AGR_DIED);
    }
    return M_ATTK_HIT;
}

/**
 * C ref: mhitm.c hitmm — hit pline when gv.vis; else noises().
 * Seduce: smiles/talks + engagingly/seductively when could_seduce && !mcan.
 * Named omissions: shade_miss; AT_TENT/HUGS verbs; silver sear; artifact wep.
 */
async function hitmm(magr, mdef, mattk, mwep, dieroll) {
    pre_mm_attack(magr, mdef);

    // C: compat = !magr->mcan ? could_seduce(...) : 0; shade_miss if !compat
    const compat = !magr.mcan ? could_seduce(magr, mdef, mattk) : 0;
    // shade_miss deferred

    if (_mm_vis) {
        if (compat) {
            const smile = mdef.mcansee ? 'smiles at' : 'talks to';
            const how = (compat === 2) ? 'engagingly' : 'seductively';
            await pline(
                `${Monnam(magr)} ${smile} ${mon_nam(mdef)} ${how}.`,
            );
        } else {
            let verb = 'hits';
            if (mattk.aatyp === AT_BITE) verb = 'bites';
            else if (mattk.aatyp === AT_STNG) verb = 'stings';
            else if (mattk.aatyp === AT_BUTT) verb = 'butts';
            else if (mattk.aatyp === AT_TUCH) verb = 'touches';
            await pline(
                `${Monnam(magr)} ${verb} ${mon_nam_too(mdef, magr)}.`,
            );
        }
    } else {
        await noises(magr, mattk);
    }
    return mdamagem(magr, mdef, mattk, mwep, dieroll);
}

/**
 * C ref: mhitm.c mattackm()
 * Returns M_ATTK_* bitmask. Async: combat pline may await --More--.
 */
export async function mattackm(magr, mdef) {
    if (!magr || !mdef) return M_ATTK_MISS;
    if (helpless(magr)) return M_ATTK_MISS;

    let tmp = find_mac(mdef) + (magr.m_lev || 0);
    if (mdef.mconf || helpless(mdef)) {
        tmp += 4;
        mdef.msleeping = 0;
    }

    // C: gv.vis — see attacker or defender (canspotmon)
    _mm_vis = ((cansee(magr.mx, magr.my) && canspotmon(magr))
        || (cansee(mdef.mx, mdef.my) && canspotmon(mdef)));

    // C ref: mhitm.c mattackm — out-of-sequence attack still counts as move
    magr.mlstmv = game.moves | 0;

    let struck = 0;
    const res = new Array(NATTK).fill(M_ATTK_MISS);

    for (let i = 0; i < NATTK; i++) {
        res[i] = M_ATTK_MISS;
        if (i > 0 && (m_at(mdef.mx, mdef.my) !== mdef
            || deadmonster(magr) || deadmonster(mdef))) {
            continue;
        }

        const mattk = get_mattk(magr, i, mdef);
        let mwep = null;
        let attk = 1;
        let strike = 0;

        switch (mattk.aatyp) {
            case AT_WEAP: {
                // C ref: mhitm.c mattackm AT_WEAP — ranged thrwmm deferred;
                // mon_wield_item spends the attack (return M_ATTK_MISS).
                if (distmin(magr.mx, magr.my, mdef.mx, mdef.my) > 1) {
                    // thrwmm deferred → treat as miss
                    strike = 0;
                    break;
                }
                if ((magr.weapon_check | 0) === NEED_WEAPON || !MON_WEP(magr)) {
                    magr.weapon_check = NEED_HTH_WEAPON;
                    if ((await mon_wield_item(magr)) !== 0) {
                        return M_ATTK_MISS;
                    }
                }
                // possibly_unwield / mswingsm deferred
                mwep = MON_WEP(magr);
                if (mwep) tmp += hitval(mwep, mdef);
                // FALLTHROUGH to melee hit roll
            }
            // falls through
            case AT_CLAW:
            case AT_KICK:
            case AT_BITE:
            case AT_STNG:
            case AT_TUCH:
            case AT_BUTT: {
                if (distmin(magr.mx, magr.my, mdef.mx, mdef.my) > 1) continue;
                const dieroll = rnd(20 + i);
                strike = tmp > dieroll ? 1 : 0;
                if (mwep) tmp -= hitval(mwep, mdef);
                if (strike) {
                    res[i] = await hitmm(magr, mdef, mattk, mwep, dieroll);
                } else {
                    await missmm(magr, mdef, mattk);
                }
                break;
            }
            // AT_SPIT/AT_BREA: spitmm/breamm live in mthrowu; mon-mon spit
            // deferred to avoid mhitm↔mthrowu import cycle (hero spitmu wired
            // in mhitu). Same point-blank skip as C when near.
            default:
                strike = 0;
                attk = 0;
                break;
        }

        if (attk && !(res[i] & M_ATTK_AGR_DIED)
            && distmin(magr.mx, magr.my, mdef.mx, mdef.my) <= 1) {
            res[i] = passivemm(magr, mdef, strike,
                (res[i] & M_ATTK_DEF_DIED), mwep);
        }

        if (res[i] & M_ATTK_DEF_DIED) return res[i];
        if (res[i] & M_ATTK_AGR_DIED) return res[i];
        if (res[i] & M_ATTK_HIT) struck = 1;
    }

    return struck ? M_ATTK_HIT : M_ATTK_MISS;
}

/**
 * C ref: mhitm.c fightm — Conflict-induced mon-vs-mon.
 * Always rolls resist_conflict first. ustuck/itsstuck release deferred.
 * Returns 1 if mtmp made an attack (movemon skips dochug); 0 otherwise.
 */
export async function fightm(mtmp) {
    if (resist_conflict(mtmp)) return 0;

    // C: u.ustuck == mtmp → itsstuck / maybe release — deferred
    const has_u_swallowed = engulfing_u(mtmp);
    const fmon = game.fmon || [];

    for (let i = 0; i < fmon.length; i++) {
        const mon = fmon[i];
        if (!mon || mon === mtmp || (mon.mhp | 0) < 1) continue;
        if (!monnear(mtmp, mon.mx, mon.my)) continue;

        // C: grabber release rn2(4) when mtmp == ustuck && !uswallow — deferred
        const result = await mattackm(mtmp, mon);
        if (result & M_ATTK_AGR_DIED) return 1;
        if (has_u_swallowed) return 0;

        // allow attacked monsters a chance to hit back
        if ((result & (M_ATTK_HIT | M_ATTK_DEF_DIED)) === M_ATTK_HIT
            && rn2(4)
            && (mon.movement | 0) > rn2(NORMAL_SPEED)) {
            if ((mon.movement | 0) > NORMAL_SPEED) mon.movement -= NORMAL_SPEED;
            else mon.movement = 0;
            await mattackm(mon, mtmp);
        }
        return (result & M_ATTK_HIT) ? 1 : 0;
    }
    return 0;
}
