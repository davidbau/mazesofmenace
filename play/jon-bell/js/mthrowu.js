// mthrowu.js — C ref: mthrowu.c.
import { exercise } from './attrib.js';
import { ACID_RES, A_CON, A_STR, IS_OBSTRUCTED, KILLED_BY_AN, LAVAWALL, OBJ_DELETED, W_WEP, isok } from './const.js';
import { losehp } from './hack.js';
import { game } from './gstate.js';
import { distmin } from './hacklib.js';
import { hates_silver as hates_silver_thitu } from './mondata.js';
import { obfree } from './shk.js';
import { sobj_at } from './invent.js';
import { MKOBJ_OC_MATERIAL, MKOBJ_OC_SKILL } from './mkobj_erosion_meta.js';
import { killer_xname as _thitu_killer_xname, an, doname, mshot_xname, obj_is_pname, the, vtense } from './objnam.js';
import { pline, pline_The } from './pline.js';
import { potionhit as potionhit_thitu } from './potion.js';
import { rn2, rnd } from './rnd.js';
import { closed_door } from './monmove.js';
import { BOLT_LIM, BOULDER, Blind_thitu, _gp_is_waterwall, _lo_hero_monst, _monstseesu_stub, _monstunseesu_stub, _thitu_stone_missile, _tr_passes_rocks, sgn, upstart_local } from './trap.js';
import { clear_path, couldsee } from './vision.js';
import { weight } from './weight.js';
import { extract_from_minvent } from './worn.js';
import { M_AP_MONSTER, M_AP_NOTHING, M_AP_TYPMASK, Upolyd } from './const.js'; // relocate-fns
import { WAN_STRIKING, throws_rocks } from './makemon.js'; // relocate-fns
import { nomul as nomul_dm } from './hack.js'; // relocate-fns
import { is_pole as is_pole_dm } from './cmd.js'; // relocate-fns
import { M_ATTK_HIT } from './const.js'; // relocate-fns
import { MON_WEP_dm, NEED_WEAPON$, distmin_dogmove } from './dogmove.js'; // relocate-fns
import { M_ATTK_MISS } from './const.js';
import { dist2 } from './hacklib.js'; // relocate-fns
import { ammo_and_launcher as ammo_and_launcher_dm } from './hold_another_object.js'; // relocate-fns
import './mhitu.js'; // relocate-fns
import { mon_wield_item, select_rwep } from './weapon.js'; // relocate-fns

/* C ref: mthrowu.c:1403 m_carrying — check if a monster is carrying an item of a particular type */
export function m_carrying(mtmp, type) {
    /* Determine the inventory chain: player (youmonst, m_id==0) uses g.invent,
     * monsters use mtmp->minvent. */
    const inv = ((mtmp.m_id | 0) === 0) ? game.invent : mtmp.minvent;
    /* Walk the object chain looking for a matching type. */
    for (let otmp = inv; otmp; otmp = otmp.nobj) {
        if ((otmp.otyp | 0) === (type | 0)) {
            return otmp;
        }
    }
    /* No matching object found. */
    return null;
}

const _LAUNCH_WEAPON_CLASS = 2; /* C objclass.h WEAPON_CLASS */

const _LAUNCH_GEM_CLASS = 13;   /* C objclass.h GEM_CLASS   */

const _P_BOW = 20, _P_CROSSBOW = 22; /* C skills.h:43,45 */

/* C obj.h:235 is_launcher(otmp):
 *   oclass == WEAPON_CLASS && oc_skill >= P_BOW && oc_skill <= P_CROSSBOW */
function is_launcher(otmp) {
    if (!otmp) return false;
    const sk = MKOBJ_OC_SKILL[otmp.otyp | 0] | 0;
    return (otmp.oclass | 0) === _LAUNCH_WEAPON_CLASS && sk >= _P_BOW && sk <= _P_CROSSBOW;
}

/* C obj.h:238 is_ammo(otmp):
 *   (oclass == WEAPON_CLASS || oclass == GEM_CLASS)
 *   && oc_skill >= -P_CROSSBOW && oc_skill <= -P_BOW
 * The GEM_CLASS arm is what carries sling ammo (rocks, flint, gems). */
function is_ammo(otmp) {
    if (!otmp) return false;
    const oc = otmp.oclass | 0;
    const sk = MKOBJ_OC_SKILL[otmp.otyp | 0] | 0;
    return (oc === _LAUNCH_WEAPON_CLASS || oc === _LAUNCH_GEM_CLASS)
        && sk >= -_P_CROSSBOW && sk <= -_P_BOW;
}

/* C obj.h:242 matching_launcher(a, l): l && oc_skill[a] == -oc_skill[l]
 * C obj.h:244 ammo_and_launcher(a, l): is_ammo(a) && matching_launcher(a, l) */
function ammo_and_launcher_mthrowu(ammo, launcher) {
    if (!ammo || !launcher) return false;
    return is_ammo(ammo)
        && (MKOBJ_OC_SKILL[ammo.otyp | 0] | 0) === -(MKOBJ_OC_SKILL[launcher.otyp | 0] | 0);
}

/* C ref: mthrowu.c:58-71 m_has_launcher_and_ammo — check if monster has launcher and matching ammo */
export function m_has_launcher_and_ammo(mtmp) {
    if (!mtmp) return false;
    /* Get monster's wielded weapon by walking minvent for W_WEP */
    let mwep = null;
    for (let o = mtmp.minvent; o; o = o.nobj) {
        if (((o.owornmask | 0) & W_WEP) !== 0) {
            mwep = o;
            break;
        }
    }
    /* If wielded and it's a launcher, check inventory for matching ammo */
    if (mwep && is_launcher(mwep)) {
        for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
            if (ammo_and_launcher_mthrowu(otmp, mwep))
                return true;
        }
    }
    return false;
}

const ACID_VENOM = 480; /* C objects.h ACID_VENOM */
const M_SEEN_ACID = 0x0080; /* C hack.h M_SEEN_ACID */
const POTION_CLASS = 8; /* C objclass.h POTION_CLASS */
const POTHIT_OTHER_THROW = 3; /* C obj.h POTHIT_OTHER_THROW */
const SILVER = 14; /* C objclass.h SILVER */
const monstseesu = _monstseesu_stub;
const monstunseesu = _monstunseesu_stub;

/* C ref: mthrowu.c:75-155 thitu — hero is hit by something other than a monster
 * (though it could be a missile thrown or shot by a monster).
 *   if (u.uac + tlev <= (dieroll = rnd(20))) { ...miss plines...; return 0; }
 *   else { ...hit plines...; post-hit arms (acid, stone, potion, silver, losehp, exercise A_STR); return 1; }
 * RNG: rnd(20) always; exercise(A_CON/A_STR, FALSE) → rn2(2) on the corresponding hit arms. */
export async function thitu(tlev, dam, otmp, name) {
    const u = game.u;
    const uac = u.uac | 0;
    const named = !!name;
    const onm = await _thitu_onm(otmp, name);
    const knm = _thitu_killer_name(otmp, name); /* C mthrowu.c:90-100, before rnd */
    const is_acid = !!otmp && (otmp.otyp | 0) === ACID_VENOM; /* C mthrowu.c:104 */
    const dieroll = rnd(20);
    if (uac + (tlev | 0) <= dieroll) {
        /* MISS — C: "It misses." / "<onm> misses you." / "You are almost hit
         * by <onm>." depending on Blind/verbose and the 2-point margin.  Verbose
         * default with sight: the <2 margin → almost-hit, else <onm> misses you.
         * No RNG on any miss branch. */
        /* C mthrowu.c:107 ++gm.mesg_given — m_throw's end-of-path "<The
         * missile> misses." arm reads this to avoid a duplicate message. */
        const gm = game.gm || (game.gm = {});
        gm.mesg_given = (gm.mesg_given | 0) + 1;
        if (Blind_thitu() || !(game.flags?.verbose ?? true)) {
            await pline('It misses.');
        } else if (uac + (tlev | 0) <= dieroll - 2) {
            await pline(`${upstart_local(onm)} ${vtense(onm, 'miss')} you.`);
        } else {
            await pline(`You are almost hit by ${onm}.`);
        }
        return 0;
    }
    /* HIT — C mthrowu.c:118-121: Blind || !verbose → the anonymous form. */
    if (Blind_thitu() || !(game.flags?.verbose ?? true))
        await pline(`You are hit${exclam_local(dam)}`);
    else
        await pline(`You are hit by ${onm}${exclam_local(dam)}`);
    /* C mthrowu.c:123-152 — the post-hit arms, in C order. */
    const _up = (i) => { const p = u.uprops && u.uprops[i];
        return !!p && !!((p.intrinsic | 0) || (p.extrinsic | 0)); };
    if (is_acid && _up(ACID_RES)) {
        await pline("It doesn't seem to hurt you.");
        monstseesu(M_SEEN_ACID);
        return 1;
    } else if (otmp && _thitu_stone_missile(otmp)
               && _tr_passes_rocks(_lo_hero_monst().data)) {
        /* C mthrowu.c:128-133: C uses `named` (name != 0) to select
         * "passes harmlessly through" vs "doesn't harm". */
        await pline(`It ${named ? 'passes harmlessly through' : "doesn't harm"} you.`);
        return 1;
    } else if (otmp && (otmp.oclass | 0) === POTION_CLASS) {
        await potionhit_thitu(game.youmonst, otmp, POTHIT_OTHER_THROW);
        otmp = null; /* C mthrowu.c:138 *objp = obj = 0; scatter() caller in js/explode.js:1048 clears stmp.obj */
        return 1;
    }
    if (otmp && (MKOBJ_OC_MATERIAL[otmp.otyp | 0] | 0) === SILVER) {
        const hs = ((u.ulycn ?? -1) | 0) >= 0
            || (game.youmonst && game.youmonst.data
                && !!hates_silver_thitu(game.youmonst.data));
        if (hs) {
            await pline_The('silver sears your flesh!');
            exercise(A_CON, false);
        }
    }
    if (is_acid) {
        await pline('It burns!');
        monstunseesu(M_SEEN_ACID);
    }
    /* C mthrowu.c:150 `losehp(dam, knm, kprefix);` — the WHOLE call, not an
     * inline `u.uhp -= dam`.  knm/kprefix are C's: killer_xname(obj) already
     * applies the article for a quan==1 object (KILLED_BY). */
    if (u && u.uhp !== undefined) {
        await losehp((dam | 0), knm,
                     name && !/^(the |an? )/i.test(name) ? KILLED_BY_AN : KILLED_BY_THITU);
    }
    /* C mthrowu.c:151 `exercise(A_STR, FALSE);` follows only when done() returns.
     * losehp now awaits do_death_sequence: a terminal death reaches really_done()
     * and throws the replay's termination sentinel, while lifesaving or a declined
     * wizard/explore death returns here just as C's done() does.  Consequently no
     * pending-death flag is a reliable postcondition at this point, and the normal
     * exercise remains on the returning paths. */
    exercise(A_STR, false); /* rn2(2) */
    return 1;
}

const KILLED_BY_THITU = 1; /* C hack.h KILLED_BY */

/* C mthrowu.c:90-95: knm = killer_xname(obj) when thitu names the object itself
 * (type identified: "orcish dagger", not "crude dagger"); a caller-supplied name is knm. */
function _thitu_killer_name(otmp, name) {
    if (name) return name;
    if (!otmp)
        return name || '';
    return _thitu_killer_xname(otmp);
}

/* C ref: mthrowu.c:88-98 — thitu's missile name.
 *   if (!name) name = (obj->quan > 1L) ? doname(obj) : mshot_xname(obj);
 *   onm = obj_is_pname(obj) ? the(name) : (obj->quan > 1L) ? name : an(name);
 * A caller-supplied `name` (trap.c's "little dart" etc.) skips doname but
 * still goes through the same the/an step, with obj NULL. */
async function _thitu_onm(otmp, name) {
    let nm = name;
    if (!nm) {
        if (!otmp) return 'something'; /* C panics; nothing reaches this */
        nm = (((otmp.quan ?? 1) | 0) > 1) ? (await doname(otmp)) : mshot_xname(otmp);
    }
    if (otmp && obj_is_pname(otmp)) return the(nm);
    if (otmp && ((otmp.quan ?? 1) | 0) > 1) return nm;
    return an(nm);
}

/* C ref: zap.c:3546 exclam(force) — `(force < 0) ? "?" : (force <= 4) ? "." :
 * "!"`.  This read `dam > 4 ? '!' : dam > 2 ? '!' : '.'`, i.e. it said "!" for
 * 3 and 4 points of damage where C says ".". */
function exclam_local(dam) {
    const f = dam | 0;
    return (f < 0) ? '?' : (f <= 4) ? '.' : '!';
}

/* ---------------------------------------------------------------------------
 * linedup — check if two positions are lined up (for ranged attacks)
 * C ref: nethack-c/src/mthrowu.c:1328-1372
 *   boolean linedup(coordxy ax, coordxy ay, coordxy bx, coordxy by, int boulderhandling)
 *
 * Returns TRUE if position (ax,ay) and (bx,by) are on the same line
 * (orthogonal or diagonal), within BOLT_LIM distance, and have line of sight
 * (or have sight blocked only by boulders, depending on boulderhandling).
 *
 * Sets gt.tbx = ax - bx, gt.tby = ay - by for use by caller after return.
 *
 * boulderhandling: 0=block on boulders, 1=ignore boulders, 2=conditionally allow
 *
 * RNG: calls rn2(2 + boulderspots) when boulderhandling==2 and line goes through boulders.
 * ---------------------------------------------------------------------------
 */
export function linedup(ax, ay, bx, by, boulderhandling) {
    /* C gt.tbx/gt.tby are GLOBALS: mthrowu.c's thrwmu/thrwmm and zap.c's
     * buzzmu read them after linedup() returns.  `game.gt || {}` published
     * them into a throwaway object whenever game.gt had not been created yet
     * (nothing initialises it at game start — js/cmd.js does `if (!g.gt)
     * g.gt = {}` at four call sites and that is all), so the caller read
     * undefined and aimed a missile along direction (0,0). */
    const gt = game.gt || (game.gt = {});

    // Set tbx and tby for use after return
    gt.tbx = (ax - bx) | 0;
    gt.tby = (ay - by) | 0;

    // Same position: prevent throwing at self
    if (!gt.tbx && !gt.tby) return false;

    // Check if on same line (orthogonal or diagonal) within BOLT_LIM distance
    if ((!gt.tbx || !gt.tby || Math.abs(gt.tbx) === Math.abs(gt.tby))
        && distmin(gt.tbx, gt.tby, 0, 0) < BOLT_LIM) {

        // Check for clear line of sight
        const u_at_ax_ay = (ax === (game.u?.ux ?? -1)) && (ay === (game.u?.uy ?? -1));
        const has_sight = u_at_ax_ay ? couldsee(bx, by) : clear_path(ax, ay, bx, by);

        if (has_sight) return true;

        // Don't have line of sight; check if blocked only by boulders
        if (boulderhandling === 0) return false;

        // Walk from (bx,by) to (ax,ay) in the direction of the vector
        const dx = sgn(ax - bx);
        const dy = sgn(ay - by);
        let boulderspots = 0;

        // Iterate until we reach (ax,ay)
        do {
            bx += dx;
            by += dy;
            // Check for blocking terrain
            if (blocking_terrain(bx, by)) return false;
            // Count boulders in the path
            if (sobj_at(BOULDER, bx, by)) boulderspots++;
        } while (bx !== ax || by !== ay);

        // Reached target without terrain blocking it
        // Allow if ignoring boulders or if chance passes
        if (boulderhandling === 1 || rn2(2 + boulderspots) < 2)
            return true;
    }

    return false;
}

/* C ref: mthrowu.c:1280-1287 blocking_terrain(x, y) — does the terrain at
 * <x,y> block a linedup() sight line?  RNG-free.
 *   if (!isok(x,y) || IS_OBSTRUCTED(levl[x][y].typ) || closed_door(x,y)
 *       || is_waterwall(x,y) || levl[x][y].typ == LAVAWALL) return TRUE;
 * closed_door is the real monmove.c:2204 port (js/monmove.js); the waterwall
 * test reuses trap.js's _gp_is_waterwall (dbridge.c:37). */
export function blocking_terrain(x, y) {
    if (!isok(x, y))
        return true;
    const typ = game.level?.at(x, y)?.typ | 0;
    if (IS_OBSTRUCTED(typ))
        return true;
    if (closed_door(x, y))
        return true;
    if (_gp_is_waterwall(x, y))
        return true;
    return typ === LAVAWALL;
}

/* m_useup — C ref: nethack-c/src/mthrowu.c:1160.  Remove one instance of an
 * item from a monster's inventory: decrement quan (recomputing owt) when the
 * stack has more than one, otherwise destroy the whole stack via m_useupall. */
export async function m_useup(mon, obj) {
    if (obj.quan > 1) {
        obj.quan--;
        obj.owt = weight(obj);
    } else {
        await m_useupall(mon, obj);
    }
}

/* m_useupall — C ref: nethack-c/src/mthrowu.c:1153-1158:
 *     extract_from_minvent(mon, obj, TRUE, FALSE);
 *     obfree(obj, (struct obj *) 0);
 * obfree() must precede deallocation: even an unbilled object triggers the
 * current shop's lookup (shk.c:1214-1217), applying an angry keeper's surcharge.
 * Billed objects instead remain on billobjs. Update the bridge deletion count
 * only when obfree actually queued the object for deletion. */
export async function m_useupall(mon, obj) {
    await extract_from_minvent(mon, obj, true, false);
    await obfree(obj, null);
    if (obj.where !== OBJ_DELETED) return;
    const store = game.__bridge__ || (game.__bridge__ = {});
    const key = 'objs_deleted.count';
    const cur = store[key] !== undefined ? Number(store[key]) : 0;
    store[key] = String(cur + 1);
}

export function lined_up(mtmp) {
    return m_lined_up(game.youmonst, mtmp) ? true : false;
}

export function m_lined_up(mtarg, mtmp) {
    const utarget = (mtarg === game.youmonst);
    const tx = utarget ? mtmp.mux : mtarg.mx;
    const ty = utarget ? mtmp.muy : mtarg.my;
    const ignore_boulders = utarget && (throws_rocks(mtmp.data)
                                        || m_carrying(mtmp, WAN_STRIKING));

    /* hero concealment usually trumps monst awareness of being lined up */
    /* C youprop.h Upolyd = (u.umonnum != u.umonster).  The old spelling here
     * read `game.urole.mnum`, which this port does not define — every live
     * call to m_lined_up threw before it could reach linedup().
     * js/const.js:2882 Upolyd(player) is the shared reader. */
    const polymorphed = Upolyd(game.u);
    /* C decl.c gy.youmonst is always a live struct; this port has no global
     * hero-monst record (js/polyself.js creates a bare object on demand), so
     * an absent one reads as m_ap_type 0 == M_AP_NOTHING, which is what a
     * non-mimicking hero has.  C short-circuits on !Upolyd before reaching
     * U_AP_TYPE at all, so this is only consulted when polymorphed. */
    const U_AP_TYPE = ((game.youmonst?.m_ap_type | 0) & M_AP_TYPMASK);
    if (utarget && polymorphed && rn2(25)
        && (game.u.uundetected || (U_AP_TYPE !== M_AP_NOTHING
                                   && U_AP_TYPE !== M_AP_MONSTER)))
        return 0;

    /* [no callers care about the 1 vs 2 situation any more] */
    return linedup(tx, ty, mtmp.mx, mtmp.my,
                   utarget ? (ignore_boulders ? 1 : 2) : 0) ? 1 : 0;
}

/* C mthrowu.c:31-48 hallublasts[] — hallucinatory blast flavour text, drawn
 * by rnd_hallublast() (mthrowu.c:51-55) via rn2(SIZE(hallublasts)). */
const HALLUBLASTS = [
    'asteroids', 'beads', 'bubbles', 'butterflies', 'champagne', 'chaos',
    'coins', 'cotton candy', 'crumbs', 'dark matter', 'darkness', 'data',
    'dust specks', 'emoticons', 'emotions', 'entropy', 'flowers', 'foam',
    'fog', 'gamma rays', 'gelatin', 'gemstones', 'ghosts', 'glass shards',
    'glitter', 'good vibes', 'gravel', 'gravity', 'gravy', 'grawlixes',
    'holy light', 'hornets', 'hot air', 'hyphens', 'hypnosis', 'infrared',
    'insects', 'jargon', 'laser beams', 'leaves', 'lightening', 'logic gates',
    'magma', 'marbles', 'mathematics', 'megabytes', 'metal shavings',
    'metapatterns', 'meteors', 'mist', 'mud', 'music', 'nanites', 'needles',
    'noise', 'nostalgia', 'oil', 'paint', 'photons', 'pixels', 'plasma',
    'polarity', 'powder', 'powerups', 'prismatic light', 'pure logic',
    'purple', 'radio waves', 'rainbows', 'rock music', 'rocket fuel', 'rope',
    'sadness', 'salt', 'sand', 'scrolls', 'sludge', 'smileys', 'snowflakes',
    'sparkles', 'specularity', 'spores', 'stars', 'steam', 'tetrahedrons',
    'text', 'the past', 'tornadoes', 'toxic waste', 'ultraviolet light',
    'viruses', 'water', 'waveforms', 'wind', 'X-rays', 'zorkmids',
];

/* C mthrowu.c:51-55 rnd_hallublast(void): return ROLL_FROM(hallublasts) =
 * hallublasts[rn2(SIZE(hallublasts))]. */
export function rnd_hallublast() {
    return HALLUBLASTS[rn2(HALLUBLASTS.length)];
}

/* C ref: mthrowu.c:969-1012 thrwmm() — monster throws item at another monster */
export async function thrwmm(mtmp, mtarg) {
    /* Polearms won't be applied by monsters against other monsters */
    if (mtmp.weapon_check === NEED_WEAPON$ || !MON_WEP_dm(mtmp)) {
        mtmp.weapon_check = NEED_RANGED_WEAPON_DM;
        /* mon_wield_item resets weapon_check as appropriate */
        if (await mon_wield_item(mtmp) !== 0)
            return M_ATTK_MISS;
    }
    const otmp = await select_rwep(mtmp);
    if (!otmp)
        return M_ATTK_MISS;
    const ispole = is_pole_dm(otmp);
    const x = mtmp.mx, y = mtmp.my;
    const mwep = MON_WEP_dm(mtmp);
    if (!ispole && m_lined_up(mtarg, mtmp)) {
        const chance = Math.max(BOLT_LIM_DM - distmin_dogmove(x, y, mtarg.mx, mtarg.my), 1);
        if (!mtarg.mflee || !rn2(chance)) {
            if (ammo_and_launcher_dm(otmp, mwep)
                && dist2(mtmp.mx, mtmp.my, mtarg.mx, mtarg.my) > PET_MISSILE_RANGE2_DM)
                return M_ATTK_MISS; /* Out of range */
            const gm = game.gm || (game.gm = {});
            gm.mtarget = mtarg;
            gm.marcher = mtmp;
            await monshoot(mtmp, otmp, mwep);
            gm.marcher = gm.mtarget = null;
            nomul_dm(0);
            return M_ATTK_HIT;
        }
    }
    return M_ATTK_MISS;
}

const NEED_RANGED_WEAPON_DM = 2; /* monst.h wpn_chk_flags */

const BOLT_LIM_DM = 8;

const PET_MISSILE_RANGE2_DM = 36;

import { registerStaticReset } from './statics.js';
import { stop_occupation } from './allmain.js';
import { nomul } from './hack.js'; // relocate-fns
import { permapoisoned as _permapoisoned_mu } from './artifact.js'; // relocate-fns
import { acurr } from './attrib.js'; // relocate-fns
import { bhp_is_lava as bhp_is_lava_mu, thit_is_unicorn as is_unicorn, mbodypart as mbodypart_mu } from './cmd.js';
import { rounddiv } from './hack.js';
import { snuff_candle as snuff_candle_mu } from './apply.js'; // relocate-fns
import { ARM, A_DEX, BACKTRACK as BACKTRACK_MU, CONFUSION, EYE as EYE_MU, FACE as FACE_MU, FOOT as FOOT_MU, FUMBLING, HAND as HAND_MU, M_SEEN_REFL, SINK as SINK_MU, SLEEP_RES as SLEEP_RES_MU, STUNNED, W_WEP as W_WEP_MU, isok as isok_mu, u_at as u_at_mu } from './const.js'; // relocate-fns
import { DISP_END, DISP_FLASH, DISP_FREEMEM, DISP_TETHER, _topline_more_pending, canseemon as canseemon_mu, canspotmon as canspotmon_disp, newsym, obj_to_glyph, tmp_at } from './display.js'; // relocate-fns
import { dropy, flooreffects as flooreffects_real_mu } from './do.js'; // relocate-fns
import { Monnam, hliquid as hliquid_mu, some_mon_nam } from './do_name.js'; // relocate-fns
import { xname } from './do_wear.js'; // relocate-fns
import { extract_from_minvent_dm, mondied_dm } from './dogmove.js'; // relocate-fns
import { add_to_minv, down_gate, ship_object } from './dokick.js'; // relocate-fns
import { omon_adj as omon_adj_mu } from './dothrow.js'; // relocate-fns
import { pending_death_is_final } from './end.js'; // relocate-fns
import { freehand } from './engrave.js'; // relocate-fns
import { calc_capacity } from './hack.js'; // relocate-fns
import { s_suffix } from './hacklib.js'; // relocate-fns
import { ENV } from './hostenv.js'; // relocate-fns
import { delobj as delobj_mu, hold_another_object, stackobj } from './invent.js'; // relocate-fns
import { obj_is_burning } from './light.js'; // relocate-fns
import { is_pool as is_pool_mu } from './look.js'; // relocate-fns
import { monPmname as monPmname_mu, nonliving as nonliving_mu, splitobj } from './makemon.js'; // relocate-fns
import { BOULDER_MU, Blind, Blind_mu, Deaf, Deaf_mu, Hallucination, KILLED_BY, M2_ELF_MU, M2_GNOME_MU, MHU_NEED_RANGED_WEAPON, MHU_NEED_WEAPON, MON_WEP, OCLASS_TOOL_MHU, OCLASS_WEAPON_MHU, P_BOW_MHU, P_SPEAR_MHU, SILVER_MU, Soundeffect, Stone_resistance, Your1, _Underwater_mu, _hero_monst_mu, _hero_permonst_mu, _mf2, _uprop_on_mu, amorphous_mu, haseyes_pu, is_orc_mu, is_pole_mhu, is_vampshifter, je_Monnam, m_seenres, maybe_half_phys_mu, mdistu, mhis, mswings_verb, mt_flightcheck, noncorporeal_mu, poisoned_u, resists_acid_mu, s_suffix_mu, se_cough, se_dry_throat_rattle, se_splat_egg, touch_petrifies_mk, youmonst_data } from './mhitu.js'; // relocate-fns
import { resists_ston as resists_ston_mu } from './mklev.js'; // relocate-fns
import { clear_dknown, is_flammable as is_flammable_mu, mksobj, obj_extract_self, place_object, remove_object } from './mkobj.js'; // relocate-fns
import { MKOBJ_OC_MAGIC } from './mkobj_erosion_meta.js'; // relocate-fns
import { seemimic as seemimic_real, setmangry as setmangry_mu } from './mon.js'; // relocate-fns
import { can_blnd as can_blnd_mu, cvt_adtyp_to_mseenres, get_atkdam_type, mon_hates_silver as mon_hates_silver_mu, poly_when_stoned, pronoun_gender as pronoun_gender_nit_mu_real } from './mondata.js'; // relocate-fns
import { munstone as munstone_mu } from './muse.js'; // relocate-fns
import { discover_object as discover_object_ds, observe_object as observe_object_mu } from './o_init.js'; // relocate-fns
import { LAST_GLASS_GEM, LAST_REAL_GEM } from './objclass_ranges.js'; // relocate-fns
import { The as The_mu, Tobjnam, distant_name as distant_name_mu, killer_xname as killer_xname_mu, makeplural, otense as otense_mu, simpleonames as simpleonames_mu, singular } from './objnam.js'; // relocate-fns
import { You_hear, impossible as impossible_breath, pline_mon, set_msg_xy as set_msg_xy_mu } from './pline.js'; // relocate-fns
import { PM_CYCLOPS as PM_CYCLOPS_MU, PM_FLOATING_EYE as PM_FLOATING_EYE_MU, PM_STONE_GOLEM } from './pm.generated.js'; // relocate-fns
import { polymon } from './polyself.js'; // relocate-fns
import { make_blinded as make_blinded_real_mu, make_stoned, potionhit } from './potion.js'; // relocate-fns
import { pushRngLogEntry } from './rng.js';
import { rnl } from './rnd.js'; // relocate-fns
import { minstapetrify as minstapetrify_mu, monkilled_trap as monkilled_mu } from './trap.js'; // relocate-fns
import { XKILL_NOMSG as XKILL_NOMSG_UH, mon_nam as mon_nam_uh, passive_obj, shade_miss as shade_miss_mu, m_at as uhitm_m_at, mon_nam as uhitm_mon_nam } from './uhitm.js';
import { xkilled as xkilled_uh } from './mon.js';
import { autoreturn_weapon, dmgval, setmnotwielded } from './weapon.js';
import { artifact_hit, spec_abon } from './artifact.js'; // relocate-fns
import { cansee as cansee_mu, couldsee as couldsee_mu } from './vision.js'; // relocate-fns
import { weight as weight_mu } from './weight.js'; // relocate-fns
import { mwelded } from './wield.js'; // relocate-fns
import { find_mac as find_mac_mu } from './worn.js'; // relocate-fns
import { BlindedTimeout as BlindedTimeout_mu, dobuzz, exclam as exclam_mu, hit as hit_mu, miss as miss_mu } from './zap.js'; // relocate-fns
/* C mthrowu.c:883 `static long do_not_annoy = 0;` — a FUNCTION-STATIC that
 * throttles the "returns to <its> hand!" message to once per 500 moves.  It is
 * process lifetime in C, so it is module state here. */
let _mtoss_do_not_annoy = 0;
/* Each recorded segment is a fresh C process (statics.js), so the static
 * starts again at its initialiser of 0. */
registerStaticReset('mhitu.js: return_from_mtoss do_not_annoy (mthrowu.c:883)', () => {
    _mtoss_do_not_annoy = 0;
});

/* je_Monnam (mcastu.js Monnam) and VENOM_CLASS_MU are ALREADY bound in this
 * file (:66 and :1369) — re-importing either is a duplicate-declaration
 * SyntaxError, which is how this edit first failed `node --check`. */
function seemimic_mu(mtmp) { return seemimic_real(mtmp); }

async function flooreffects_mu(obj, x, y, verb) {
    return await flooreffects_real_mu(obj, x, y, verb);
}

/* C mondata.h:48 eyecount(ptr) — decides singular vs plural only, so "more
 * than 2" does not need distinguishing.  Same local-macro-copy convention as
 * haseyes_pu above (js/mcastu.js's eyecount_mc is not exported either).
 * Takes the hero-as-monster record, mirroring C's eyecount(gy.youmonst.data)
 * at mthrowu.c:770. */
function eyecount_mu(mon) {
    const ptr = mon && mon.data;
    if (!haseyes_pu(ptr))
        return 0;
    const mndx = (ptr && (ptr.pmidx ?? ptr.mnum)) | 0;
    return (mndx === PM_CYCLOPS_MU || mndx === PM_FLOATING_EYE_MU) ? 1 : 2;
}

/* C objects.h VENOM() rows (mirrors js/mhitm.js:3514 and js/cmd.js:23206). */
const BLINDING_VENOM_MU = 479;

const ACID_VENOM_MU = 480;

const AD_DRST_MU = 7;    /* monattk.h:49 */

const AD_ACID_MU = 8;    /* monattk.h:50 */

const AD_BLND_MU = 11;   /* monattk.h:53 */

const BOLT_LIM_MU = 8;   /* hack.h:49 */

/* C sndprocs.h sound-effect constants and no-op hook (Unix/MacOS port). */
const se_splash = 46;

const poisoned = poisoned_u;

const mondied = mondied_dm;

const monkilled = monkilled_mu;

const eyecount = eyecount_mu;

const ammo_and_launcher = ammo_and_launcher_mu;

const obj_sheds_light = obj_is_burning;

export async function spitmm(mtmp, mattk, mtarg) {
    /* C mthrowu.c:1020-1032 — a cancelled spitter just rattles.  RNG-free. */
    if (mtmp.mcan | 0) {
        if (!Deaf(game) && mdistu(mtmp) < BOLT_LIM_MU * BOLT_LIM_MU) {
            if (canspotmon_disp(mtmp))
                await pline(`A dry rattle comes from ${s_suffix_mu(uhitm_mon_nam(mtmp))} throat.`);
            else {
                Soundeffect(se_dry_throat_rattle, 50);
                await You_hear('a dry rattle nearby.');
            }
        }
        return M_ATTK_MISS;
    }
    /* C mthrowu.c:1033 m_lined_up(mtarg, mtmp); for a hero target that is
     * lined_up(mtmp), which also publishes gt.tbx/gt.tby. */
    const utarg = (mtarg === null || mtarg === game.youmonst);
    if (utarg ? lined_up(mtmp) : m_lined_up(mtarg, mtmp)) {
        const tx = (utarg ? mtmp.mux : mtarg.mx) | 0;
        const ty = (utarg ? mtmp.muy : mtarg.my) | 0;

        /* C mthrowu.c:1038-1048 — the venom object.  AD_BLND/AD_DRST spit
         * blinding venom, everything else acid venom (C's default arm is an
         * impossible() that falls through to AD_ACID). */
        const adtyp = (mattk.adtyp | 0);
        const venom_otyp = (adtyp === AD_BLND_MU || adtyp === AD_DRST_MU)
            ? BLINDING_VENOM_MU
            : (void (adtyp !== AD_ACID_MU && await impossible_breath('bad attack type in spitmm')),
               ACID_VENOM_MU);
        const otmp = await mksobj(venom_otyp, true, false);

        /* C mthrowu.c:1050 — the farther the spitter, the likelier the spit (1/(BOLT_LIM - dist) chance). */
        const dist = distmin(mtmp.mx | 0, mtmp.my | 0, tx, ty);
        if (!rn2(BOLT_LIM_MU - dist)) {
            /* C mthrowu.c:1051-1052 — note the REAL canseemon, not this file's
             * `canseemon() { return false; }` stub two hundred lines up. */
            if (canseemon_mu(mtmp))
                await pline(`${je_Monnam(mtmp)} spits venom!`);
            /* C mthrowu.c:1055 — m_throw(mtmp, mx, my, sgn(gt.tbx), sgn(gt.tby),
             * distmin(...), otmp).  linedup() published gt.tbx/gt.tby. */
            const gt = game.gt || {};
            const gm = game.gm ||= {};
            if (!utarg) gm.mtarget = mtarg;
            await m_throw(mtmp, mtmp.mx | 0, mtmp.my | 0,
                       sgn_mu(gt.tbx | 0), sgn_mu(gt.tby | 0), dist, otmp);
            gm.mtarget = null;
            nomul(0);
            /* C mthrowu.c:1059-1066: successful spitting makes pets hungry. */
            if (mtmp.mtame && !mtmp.isminion) {
                const dog = mtmp.mextra?.edog ?? mtmp.edog;
                if (dog.hungrytime > 1) dog.hungrytime -= 5;
            }
            return M_ATTK_HIT;
        }
        /* C mthrowu.c:1071-1072: queue unused venom for object deletion. */
        obj_extract_self(otmp);
        await obfree(otmp, null);
    }
    return M_ATTK_MISS;
}

/* C ref: mthrowu.c:24-28 breathwep[] — the breath-weapon names, indexed by
 * BZ_OFS_AD(adtyp). */
const BREATHWEP_MU = [
    'fragments', 'fire', 'frost', 'sleep gas', 'a disintegration blast',
    'lightning', 'poison gas', 'acid', 'strange breath #8',
    'strange breath #9',
];

/* C ref: mthrowu.c:31-48 hallublasts[] + :51-55 rnd_hallublast() =
 * ROLL_FROM(hallublasts) = hallublasts[rn2(SIZE(hallublasts))].  The draw is
 * real: a hallucinating hero who can see the breather makes C roll here. */
const HALLUBLASTS_MU = [
    'asteroids', 'beads', 'bubbles', 'butterflies', 'champagne', 'chaos',
    'coins', 'cotton candy', 'crumbs', 'dark matter', 'darkness', 'data',
    'dust specks', 'emoticons', 'emotions', 'entropy', 'flowers', 'foam',
    'fog', 'gamma rays', 'gelatin', 'gemstones', 'ghosts', 'glass shards',
    'glitter', 'good vibes', 'gravel', 'gravity', 'gravy', 'grawlixes',
    'holy light', 'hornets', 'hot air', 'hyphens', 'hypnosis', 'infrared',
    'insects', 'jargon', 'laser beams', 'leaves', 'lightening', 'logic gates',
    'magma', 'marbles', 'mathematics', 'megabytes', 'metal shavings',
    'metapatterns', 'meteors', 'mist', 'mud', 'music', 'nanites', 'needles',
    'noise', 'nostalgia', 'oil', 'paint', 'photons', 'pixels', 'plasma',
    'polarity', 'powder', 'powerups', 'prismatic light', 'pure logic',
    'purple', 'radio waves', 'rainbows', 'rock music', 'rocket fuel', 'rope',
    'sadness', 'salt', 'sand', 'scrolls', 'sludge', 'smileys', 'snowflakes',
    'sparkles', 'specularity', 'spores', 'stars', 'steam', 'tetrahedrons',
    'text', 'the past', 'tornadoes', 'toxic waste', 'ultraviolet light',
    'viruses', 'water', 'waveforms', 'wind', 'X-rays', 'zorkmids',
];

/* C ref: mthrowu.c:1079-1089 breathwep_name(typ). */
function breathwep_name_mu(typ) {
    if (Hallucination(game))
        return HALLUBLASTS_MU[rn2(HALLUBLASTS_MU.length)];
    return BREATHWEP_MU[BZ_OFS_AD_MU(typ)];
}

/* C hack.h:1474-1488 — the buzz-type encoding.
 *   BZ_VALID_ADTYP(adtyp) ((adtyp) >= AD_MAGM && (adtyp) <= AD_SPC2)
 *   BZ_OFS_AD(adtyp)      (abs((adtyp) - AD_MAGM) % 10)
 *   BZ_M_BREATH(bztyp)    (-20 - (bztyp))          / * -29..-20 * /  */
const AD_MAGM_MU = 1, AD_SPC2_MU = 10, AD_SLEE_MU = 4;

function BZ_VALID_ADTYP_MU(adtyp) { return adtyp >= AD_MAGM_MU && adtyp <= AD_SPC2_MU; }

function BZ_OFS_AD_MU(adtyp) { return Math.abs(adtyp - AD_MAGM_MU) % 10; }

function BZ_M_BREATH_MU(bztyp) { return -20 - bztyp; }

export async function breamm(mtmp, mattk, mtarg) {
    const typ = get_atkdam_type(mattk.adtyp | 0);
    const utarget = (mtarg === null);

    /* C mthrowu.c:1098 — m_lined_up(mtarg, mtmp); for a hero target that is
     * js/mthrowu.js's lined_up(mtmp), which publishes gt.tbx/gt.tby. */
    if (utarget ? lined_up(mtmp) : (m_lined_up(mtarg, mtmp) ? true : false)) {
        /* C mthrowu.c:1099-1109 — a cancelled breather just coughs.  RNG-free. */
        if (mtmp.mcan | 0) {
            if (!Deaf(game)) {
                if (canseemon_mu(mtmp))
                    await pline(`${je_Monnam(mtmp)} coughs.`);
                else {
                    Soundeffect(se_cough, 100);
                    await You_hear('a cough.');
                }
            }
            return M_ATTK_MISS;
        }

        /* C mthrowu.c:1113-1115 — "if we've seen the actual resistance, don't
         * bother, or if we're close by and they reflect, just jump the player". */
        if (utarget && (m_seenres(mtmp, cvt_adtyp_to_mseenres(typ))
                        || m_seenres(mtmp, M_SEEN_REFL)))
            return M_ATTK_HIT;

        if (!(mtmp.mspec_used | 0) && rn2(3)) {
            if (BZ_VALID_ADTYP_MU(typ)) {
                if (canseemon_mu(mtmp))
                    await pline(`${je_Monnam(mtmp)} breathes ${breathwep_name_mu(typ)}!`);
                const gb = (game.gb ||= {});
                const gt = game.gt || {};
                gb.buzzer = mtmp;
                await dobuzz(BZ_M_BREATH_MU(BZ_OFS_AD_MU(typ)), mattk.damn | 0,
                             mtmp.mx | 0, mtmp.my | 0,
                             sgn_mu(gt.tbx | 0), sgn_mu(gt.tby | 0),
                             utarget, utarget, false);
                gb.buzzer = 0;
                nomul(0);
                /* C mthrowu.c:1128-1135 — "breath runs out sometimes.  Also,
                 * give monster some cunning; don't breath if the target fell
                 * asleep." */
                if (!utarget || !rn2(3))
                    mtmp.mspec_used = 8 + rn2(18);
                if (utarget && typ === AD_SLEE_MU && !_uprop_on_mu(SLEEP_RES_MU))
                    mtmp.mspec_used = (mtmp.mspec_used | 0) + rnd(20);

                /* C mthrowu.c:1137-1144 — a breathing pet gets hungry. */
                if ((mtmp.mtame | 0) && !(mtmp.isminion | 0)) {
                    const dog = mtmp.mextra?.edog ?? mtmp.edog ?? null;
                    if (dog && (dog.hungrytime | 0) >= 10)
                        dog.hungrytime = (dog.hungrytime | 0) - 10;
                }
            } else {
                await impossible_breath('Breath weapon %d used', typ - 1);
            }
        } else
            return M_ATTK_MISS;
    }
    return M_ATTK_HIT;
}

/* C ref: mthrowu.c:1274-1278 breamu(mtmp, mattk) = breamm(mtmp, mattk,
 * &gy.youmonst) — "monster breathes at you (ranged)". */
export async function breamu(mtmp, mattk) {
    return breamm(mtmp, mattk, null);
}

const VENOM_CLASS_MU = 17;  /* objclass.h */

export async function thrwmu(mtmp) {
    if (ENV.FF_MATTACK_TRACE === '1')
        pushRngLogEntry(`^thrwmu_enter[id=${mtmp.m_id|0} pos=${mtmp.mx|0},${mtmp.my|0} target=${mtmp.mux|0},${mtmp.muy|0}]`);
    const u = game.u || (game.u = {});
    /* C mthrowu.c:1183-1189 — "Rearranged beginning so monsters can use
     * polearms not in a line". */
    if ((mtmp.weapon_check | 0) === MHU_NEED_WEAPON || !MON_WEP(mtmp)) {
        mtmp.weapon_check = MHU_NEED_RANGED_WEAPON;
        /* mon_wield_item resets weapon_check as appropriate */
        if (await mon_wield_item(mtmp) !== 0)
            return;
    }

    /* C mthrowu.c:1192-1194: otmp = select_rwep(mtmp); if (!otmp) return; */
    const otmp = await select_rwep(mtmp);
    if (!otmp)
        return;

    let always_toss = false;
    let rang;

    if (is_pole_mhu(otmp)) {
        /* C mthrowu.c:1198-1240 — polearm/lance thrust at MON_POLE_DIST. */
        if (otmp !== MON_WEP(mtmp))
            return; /* polearm, aklys must be wielded */
        rang = dist2(mtmp.mx | 0, mtmp.my | 0, mtmp.mux | 0, mtmp.muy | 0);
        if (rang > MON_POLE_DIST_MU || !couldsee_mu(mtmp.mx | 0, mtmp.my | 0))
            return; /* Out of range, or intervening wall */

        if (canseemon_mu(mtmp)) {
            const onm = xname(otmp);
            await pline_mon(mtmp, `${je_Monnam(mtmp)} ${mswings_verb(otmp, rang <= 2)} `
                  + `${obj_is_pname(otmp) ? the(onm) : an(onm)}.`);
        }

        let dam = dmgval(otmp, _hero_monst_mu());
        let hitv = 3 - distmin_mu(u.ux | 0, u.uy | 0, mtmp.mx | 0, mtmp.my | 0);
        if (hitv < -4)
            hitv = -4;
        if (bigmonst_mu(_hero_permonst_mu()))
            hitv++;
        hitv += 8 + (otmp.spe | 0);
        if (dam < 1)
            dam = 1;
        await thitu(hitv, maybe_half_phys_mu(dam), otmp, null);
        await stop_occupation();
        return;
    } else {
        /* C mthrowu.c:1241-1247 — an aklys/boomerang-class returning weapon
         * is tossed even when the hero is running away. */
        const arw = autoreturn_weapon(otmp);
        if (arw && !mwelded(otmp)) {
            rang = dist2(mtmp.mx | 0, mtmp.my | 0, mtmp.mux | 0, mtmp.muy | 0);
            if (rang > (arw.range | 0) || !couldsee_mu(mtmp.mx | 0, mtmp.my | 0))
                return; /* Out of range, or intervening wall */
            always_toss = true;
        }
    }

    const x = mtmp.mx | 0, y = mtmp.my | 0;
    /* C mthrowu.c:1249-1258 — "If you are coming toward the monster, the
     * monster should try to soften you up with missiles.  If you are going
     * away, you are probably hurt or running.  Give chase, but if you are
     * getting too far away, throw."
     * lined_up() is what publishes gt.tbx/gt.tby for monshoot's m_throw. */
    if (!lined_up(mtmp)
        || (URETREATING_MU(x, y)
            && (!always_toss
                && rn2(BOLT_LIM_MU - distmin_mu(x, y, mtmp.mux | 0, mtmp.muy | 0)))))
        return;

    const mwep = MON_WEP(mtmp); /* wielded weapon */
    await monshoot(mtmp, otmp, mwep); /* multishot shooting or throwing */
    nomul(0);
}

/* C hack.h:1435 MON_POLE_DIST — how far monsters can use pole-weapons. */
const MON_POLE_DIST_MU = 5;

/* C mthrowu.c:18 URETREATING(x,y) — is the hero moving away from <x,y>? */
function URETREATING_MU(x, y) {
    const u = game.u || {};
    return distmin_mu(u.ux | 0, u.uy | 0, x, y)
         > distmin_mu(u.ux0 | 0, u.uy0 | 0, x, y);
}

/* C mondata.h:12 bigmonst(ptr) = ptr->msize >= MZ_LARGE (monflag.h MZ_LARGE=3). */
function bigmonst_mu(ptr) { return !!ptr && (ptr.msize | 0) >= 3; }

function monmulti(mtmp, otmp, mwep) {
    let multishot = 1;
    const quan = (otmp.quan ?? 1) | 0;

    if (quan > 1
        && (is_ammo_mu(otmp)
                ? matching_launcher_mu(otmp, mwep)
                : (otmp.oclass | 0) === OCLASS_WEAPON_MHU)
        && !(mtmp.mconf | 0)) {
        const ptr = mtmp.data;
        /* Assumes lords are skilled, princes are expert */
        if (is_prince_mu(ptr))
            multishot += 2;
        else if (is_lord_mu(ptr))
            multishot++;
        else if (is_mplayer_mu(ptr))
            multishot++;

        /* Elven Craftsmanship makes for light, quick bows */
        if ((otmp.otyp | 0) === ELVEN_ARROW_MU && !(otmp.cursed | 0))
            multishot++;
        if (mwep && (mwep.otyp | 0) === ELVEN_BOW_MU
            && ammo_and_launcher_mu(otmp, mwep) && !(mwep.cursed | 0))
            multishot++;
        /* 1/3 of launcher enchantment */
        if (ammo_and_launcher_mu(otmp, mwep) && (mwep.spe | 0) > 1)
            multishot += rounddiv_mu(mwep.spe | 0, 3);
        /* Some randomness */
        multishot = rnd(multishot);

        /* class bonus */
        multishot += multishot_class_bonus_mu(mtmp, otmp, mwep);

        /* racial bonus */
        if ((is_elf_mu(ptr) && (otmp.otyp | 0) === ELVEN_ARROW_MU
             && mwep && (mwep.otyp | 0) === ELVEN_BOW_MU)
            || (is_orc_mu(ptr) && (otmp.otyp | 0) === ORCISH_ARROW_MU
                && mwep && (mwep.otyp | 0) === ORCISH_BOW_MU)
            || (is_gnome_mu(ptr) && (otmp.otyp | 0) === CROSSBOW_BOLT_MU
                && mwep && (mwep.otyp | 0) === CROSSBOW_MU))
            multishot++;
    }

    if (quan < multishot)
        multishot = quan;
    if (multishot < 1)
        multishot = 1;
    if (ENV.FF_MATTACK_TRACE === '1')
        pushRngLogEntry(`^monmulti[id=${mtmp.m_id|0} obj=${otmp.otyp|0} quan=${quan} launcher=${mwep?.otyp ?? -1} shots=${multishot}]`);
    return multishot;
}

/* C ref: mthrowu.c:262 monshoot(mtmp, otmp, mwep) — mtmp throws otmp, or shoots
 * otmp with mwep, at the hero (gm.mtarget == 0 on the thrwmu path) or at mtarg.
 * Caller must have called lined_up() to set up <gt.tbx, gt.tby>. */
const STRANGE_OBJECT = 0; /* objects.h:80 */

export async function monshoot(mtmp, otmp, mwep) {
    const g = game;
    const gm = g.gm || (g.gm = {});
    const mtarg = gm.mtarget || null;
    const dm = distmin(mtmp.mx | 0, mtmp.my | 0,
                       mtarg ? (mtarg.mx | 0) : (mtmp.mux | 0),
                       mtarg ? (mtarg.my | 0) : (mtmp.muy | 0));
    const multishot = monmulti(mtmp, otmp, mwep);

    gm.m_shot = gm.m_shot || { i: 0, n: 0, o: STRANGE_OBJECT, s: false };
    if (canseemon_mu(mtmp)) {
        let onm;
        if (multishot > 1) {
            /* "N arrows"; multishot > 1 implies otmp->quan > 1, so xname()'s
               result will already be pluralized */
            onm = `${multishot} ${xname(otmp)}`;
        } else {
            /* "an arrow" */
            onm = (await singular(otmp, xname));
            onm = obj_is_pname(otmp) ? the(onm) : an(onm);
        }
        gm.m_shot.s = ammo_and_launcher(otmp, mwep) ? true : false;
        /* C:288 Strcpy(trgbuf, mtarg ? some_mon_nam(mtarg) : "") — the thrwmu
         * path always has mtarg == 0, and the monster-vs-monster caller
         * (thrwmm) is not wired to monshoot in this port. */
        const trgbuf = mtarg ? some_mon_nam(mtarg) : '';
        set_msg_xy_mu(mtmp.mx, mtmp.my); /* C mthrowu.c:289 */
        pline(`${je_Monnam(mtmp)} ${gm.m_shot.s ? 'shoots' : 'throws'} ${onm}`
              + `${mtarg ? ' at ' : ''}${trgbuf}!`);
        gm.m_shot.o = otmp.otyp | 0;
    } else {
        gm.m_shot.o = STRANGE_OBJECT; /* don't give multishot feedback */
    }
    gm.m_shot.n = multishot;
    const gt = g.gt || (g.gt = {});
    for (gm.m_shot.i = 1; gm.m_shot.i <= gm.m_shot.n; gm.m_shot.i++) {
        if (ENV.FF_MATTACK_TRACE === '1')
            pushRngLogEntry(`^monshoot_shot[id=${mtmp.m_id|0} i=${gm.m_shot.i|0} n=${gm.m_shot.n|0} hp=${mtmp.mhp|0}]`);
        await m_throw(mtmp, mtmp.mx | 0, mtmp.my | 0,
                sgn_mu(gt.tbx | 0), sgn_mu(gt.tby | 0), dm, otmp);
        if (ENV.FF_MATTACK_TRACE === '1')
            pushRngLogEntry(`^monshoot_done[id=${mtmp.m_id|0} i=${gm.m_shot.i|0} n=${gm.m_shot.n|0} hp=${mtmp.mhp|0} pending=${game._pendingDeath ? 1 : 0}]`);
        if (ENV.FF_MATTACK_TRACE === '1')
            pushRngLogEntry(`^monshoot_page_probe[id=${mtmp.m_id|0} i=${gm.m_shot.i|0} more=${_topline_more_pending() ? 1 : 0} force=${game._topl_force_breaks?.length|0} topl=${encodeURIComponent(String(game._pending_message || '').slice(-100))}]`);
        /* C:299-306 — cancel pending shots if the thrower died mid-volley. */
        if ((mtmp.mhp | 0) <= 0 && gm.m_shot.i < gm.m_shot.n)
            break;
    }
    /* reset 'gm.m_shot' */
    gm.m_shot.n = gm.m_shot.i = 0;
    gm.m_shot.o = STRANGE_OBJECT;
    gm.m_shot.s = false;
}

/* C obj.h:238/242/244/245 — is_ammo / matching_launcher / ammo_and_launcher /
 * is_missile, off MKOBJ_OC_SKILL (the same table is_pole_mhu reads).
 * skills.h: P_BOW=20, P_CROSSBOW=22, P_DART=23, P_BOOMERANG=25. */
const OCLASS_GEM_MU = 13;

function is_ammo_mu(otmp) {
    const oc = otmp.oclass | 0, sk = MKOBJ_OC_SKILL[otmp.otyp | 0] | 0;
    return (oc === OCLASS_WEAPON_MHU || oc === OCLASS_GEM_MU)
        && sk >= -22 && sk <= -20;
}

function matching_launcher_mu(a, l) {
    return !!l && (MKOBJ_OC_SKILL[a.otyp | 0] | 0)
                   === -(MKOBJ_OC_SKILL[l.otyp | 0] | 0);
}

function ammo_and_launcher_mu(a, l) {
    return is_ammo_mu(a) && matching_launcher_mu(a, l);
}

function is_missile_mu(otmp) {
    const oc = otmp.oclass | 0, sk = MKOBJ_OC_SKILL[otmp.otyp | 0] | 0;
    return (oc === OCLASS_WEAPON_MHU || oc === OCLASS_TOOL_MHU)
        && sk >= -25 && sk <= -23;
}

const M2_LORD_MU = 0x00000400, M2_PRINCE_MU = 0x00000800;

/* C mondata.h:157-158 is_mplayer(ptr) is NOT a flag test at all —
 *     (((ptr) >= &mons[PM_ARCHEOLOGIST]) && ((ptr) <= &mons[PM_WIZARD]))
 * i.e. a monster-index RANGE over the thirteen fake-player entries.  The
 * M2_MPLAYER bit this file invented (0x00800000) is M2_WANDER in 5.0, so the
 * predicate answered "is a wanderer".  Indices verified by name against
 * js/makemon_pmnames.json (archeologist 331 .. wizard 343). */
const PM_ARCHEOLOGIST_MU = 331, PM_WIZARD_MU = 343;

function _mndx_of(ptr) {
    const i = (ptr && (ptr.pmidx ?? ptr.mndx ?? ptr.mnum));
    return (i == null) ? -1 : (i | 0);
}

function is_lord_mu(ptr) { return (_mf2(ptr) & M2_LORD_MU) !== 0; }

function is_prince_mu(ptr) { return (_mf2(ptr) & M2_PRINCE_MU) !== 0; }

function is_mplayer_mu(ptr) {
    const i = _mndx_of(ptr);
    return i >= PM_ARCHEOLOGIST_MU && i <= PM_WIZARD_MU;
}

function is_elf_mu(ptr) { return (_mf2(ptr) & M2_ELF_MU) !== 0; }

function is_gnome_mu(ptr) { return (_mf2(ptr) & M2_GNOME_MU) !== 0; }

/* C hack.c:4551 rounddiv(x, y) — one port, js/cmd.js rounddiv. */
function rounddiv_mu(x, y) { return rounddiv(x, y); }

const ELVEN_ARROW_MU = 19, ORCISH_ARROW_MU = 20, CROSSBOW_BOLT_MU = 23,
      ELVEN_BOW_MU = 84, ORCISH_BOW_MU = 85, CROSSBOW_MU = 88;

/* C ref: dothrow.c:39-83 multishot_class_bonus(pm, ammo, launcher) — pm is the
 * MONSTER index (monsndx), so the role-named arms match fake players and the
 * quest ninja.  Indices from js/makemon_pmnames.json; skills per skills.h.
 * (js/cmd.js's copy is keyed on hero role indices and is not interchangeable.)
 * RNG-free. */
function multishot_class_bonus_mu(mtmp, otmp, mwep) {
    const PM_CAVE_DWELLER = 333, PM_MONK = 336, PM_RANGER = 338,
          PM_ROGUE = 339, PM_SAMURAI = 340, PM_NINJA = 378;
    const P_DAGGER = 1, P_SLING = 21, P_DART = 23, P_SHURIKEN = 24;
    const YA = 22, YUMI = 86;
    let multishot = 0;
    const skill = MKOBJ_OC_SKILL[otmp.otyp | 0] | 0;
    switch (_mndx_of(mtmp.data)) {
    case PM_CAVE_DWELLER:
        if (skill === -P_SLING || skill === P_SPEAR_MHU) multishot++;
        break;
    case PM_MONK:
        if (skill === -P_SHURIKEN) multishot++;
        break;
    case PM_RANGER:
        if (skill !== P_DAGGER) multishot++;
        break;
    case PM_ROGUE:
        if (skill === P_DAGGER) multishot++;
        break;
    case PM_NINJA:
        if (skill === -P_SHURIKEN || skill === -P_DART) multishot++;
        /* FALLTHRU */
    case PM_SAMURAI:
        if ((otmp.otyp | 0) === YA && mwep && (mwep.otyp | 0) === YUMI) multishot++;
        break;
    default:
        break;
    }
    return multishot;
}

function gm0_take_gone() {
    const g = game.gm;
    if (!g || !g._mt_obj_gone) return false;
    g._mt_obj_gone = false;
    return true;
}

export async function drop_throw(obj, ohit, x, y) {
    /* JS otyps: CREAM_PIE 287 (js/cmd.js:24621, js/m_initweap.js:144),
     * EGG 266 (js/cmd.js:9233). */
    const CREAM_PIE_MU = 287, EGG_MU = 266;
    let broken;
    if ((obj.otyp | 0) === CREAM_PIE_MU || (obj.oclass | 0) === VENOM_CLASS_MU
        || (ohit && (obj.otyp | 0) === EGG_MU)) {
        broken = true;
    } else {
        broken = !!(ohit && should_mulch_missile_mu(obj));
    }

    if (broken) {
        /* C mthrowu.c:178 delobj(obj) -> delobj_core: obj_resists rn2(100), then
         * obj_extract_self + obfree (which stops the egg's hatch timer). */
        await delobj_mu(obj);
    } else {
        if (down_gate(x, y) !== -1)
            broken = !!(await ship_object(obj, x, y, false));
        if (!broken) {
            let mtmp = uhitm_m_at(x, y);
            broken = !!await flooreffects_mu(obj, x, y, 'fall');
            if (!broken) {
                place_object(obj, x, y);
                if (!mtmp && (x === (game.u?.ux | 0)) && (y === (game.u?.uy | 0)))
                    mtmp = _hero_monst_mu();
                if (mtmp && ohit)
                    await passive_obj(mtmp, obj, null);
                await stackobj(obj);
            }
        }
    }
    game.thrownobj = null;
    if (game.gt) game.gt.thrownobj = null;
    return broken;
}

/* C ref: dothrow.c should_mulch_missile(obj) — only ammo (excluding magic
 * stones) or missiles break.  Ported locally rather than imported from
 * js/cmd.js:23073 to keep this file off the cmd.js import cycle; the two
 * bodies must stay in step (both are transcriptions of the same C function). */
/* C objects[].oc_tough: GEM_CLASS entries whose HARDGEM(mohs) is true
 * (objects.h:1516-1525, HARDGEM >= 8). */
const TOUGH_GEMS_MU = new Set([440, 441, 442, 443, 444, 445, 448, 450]);

function should_mulch_missile_mu(obj) {
    if (!obj || !(is_ammo_mu(obj) || is_missile_mu(obj)))
        return false;
    const BOOMERANG_MU = 26; /* js otyp (js/m_initweap.js:52) */
    if ((obj.otyp | 0) === BOOMERANG_MU)
        return false;
    /* C dothrow.c:1987 — magical sling stones pass is_ammo_mu() by oc_skill,
     * then return here before any breakage or survival RNG. */
    if (MKOBJ_OC_MAGIC[obj.otyp | 0])
        return false;
    const chance = 3 + Math.max(obj.oeroded | 0, obj.oeroded2 | 0) - (obj.spe | 0);
    let broken = chance > 1 ? !!rn2(chance) : !rn2(4);
    if (obj.blessed) {
        const mon_moving = !!(game.context && game.context.mon_moving);
        if (mon_moving ? !rn2(3) : !rnl(4))
            broken = false;
    }
    const FLINT_MU = 473;
    const otyp = obj.otyp | 0;
    if (((obj.oclass | 0) === OCLASS_GEM_MU && TOUGH_GEMS_MU.has(otyp)
            || otyp === FLINT_MU)
        && !rn2(2))
        broken = false;
    return broken;
}

export async function ohitmon(mtmp, otmp, range, verbose) {
    let damage, tmp;
    const gm = game.gm || (game.gm = {});
    const gn = game.gn || (game.gn = {});
    const gb = game.bhitpos || (game.bhitpos = { x: 0, y: 0 });
    const bx = gb.x | 0, by = gb.y | 0;

    /* C:331 */
    const mon_launcher = gm.marcher ? MON_WEP(gm.marcher) : null;
    /* C:334 — a long worm hit on a tail segment rather than the head. */
    gn.notonhead = (bx !== (mtmp.mx | 0) || by !== (mtmp.my | 0));
    /* C:335 — M_AP_TYPE(mtmp) && M_AP_TYPE(mtmp) != M_AP_MONSTER */
    const ismimic = !!M_AP_TYPE_MU(mtmp) && M_AP_TYPE_MU(mtmp) !== M_AP_MONSTER_MU;
    const vis = cansee_mu(bx, by);
    if (vis)
        observe_object_mu(otmp);

    /* C:340 */
    tmp = 5 + find_mac_mu(mtmp) + omon_adj_mu(mtmp, otmp, false);
    /* C:344-348 — high level archers hit more often, but only against the
     * monster they were actually aiming at. */
    if (gm.marcher && gm.mtarget === mtmp) {
        if ((gm.marcher.m_lev | 0) > 5)
            tmp += (gm.marcher.m_lev | 0) - 5;
        if (mon_launcher && (mon_launcher.oartifact | 0))
            tmp += spec_abon(mon_launcher, mtmp);
    }

    if (tmp < rnd(20)) {
        /* ── MISS ── C:349-360 */
        if (!ismimic) {
            if (vis)
                miss_mu((await distant_name_mu(otmp, mshot_xname)), mtmp);
            else if (verbose && !gm.mtarget)
                pline('It is missed.');
        }
        if (!range) { /* C:356 last position; object drops */
            await drop_throw(otmp, 0, mtmp.mx | 0, mtmp.my | 0);
            return true;
        }
    } else if ((otmp.oclass | 0) === POTION_CLASS_MU) {
        /* C mthrowu.c:361-370 — a thrown potion hitting a MONSTER:
         *   if (ismimic) seemimic(mtmp);
         *   mtmp->msleeping = 0;
         *   potionhit(mtmp, otmp, POTHIT_OTHER_THROW);
         *   return 1;
         * potionhit's monster-target arms live in js/potion.js. */
        if (ismimic) seemimic_mu(mtmp);
        mtmp.msleeping = 0;
        await potionhit(mtmp, otmp, POTHIT_OTHER_THROW_MU);
        return true;
    } else {
        /* ── HIT ── C:371-500 */
        const material = MKOBJ_OC_MATERIAL[otmp.otyp | 0] | 0;
        const harmless = (stone_missile_mu(otmp) && passes_rocks_mu(mtmp.data));

        damage = dmgval(otmp, mtmp);
        if ((otmp.otyp | 0) === ACID_VENOM_MU && resists_acid_mu(mtmp))
            damage = 0;
        if (ismimic) seemimic_mu(mtmp);
        mtmp.msleeping = 0;
        /* C:383 */
        Soundeffect(se_splat_egg, 35);
        if (vis) {
            if ((otmp.otyp | 0) === EGG_OHITMON_MU) {
                /* C:385-389 */
                pline(`Splat!  ${je_Monnam(mtmp)} is hit with `
                      + `${otmp.known ? an(monPmname_mu(otmp.corpsenm | 0)) : 'an'} egg!`);
            } else {
                /* C:391-398 */
                let how;
                if (!harmless)
                    how = exclam_mu(damage); /* "!" or "." */
                else
                    how = ` but passes harmlessly through ${String(mhim_mu(mtmp)).slice(0, 9)}.`;
                hit_mu((await distant_name_mu(otmp, mshot_xname)), mtmp, how);
            }
        } else if (verbose && !gm.mtarget) {
            /* C:399-401 */
            pline(`${((otmp.otyp | 0) === EGG_OHITMON_MU) ? 'Splat!  ' : ''}`
                  + `${je_Monnam(mtmp)} is hit${exclam_mu(damage)}`);
        }

        /* C:403-417 — poison.  DRAWS: rn2(30), then rnd(6) on the common arm. */
        if ((otmp.opoisoned | 0) && is_poisonable_mu(otmp)) {
            if (resists_poison_mu(mtmp)) {
                if (vis)
                    pline_The(`poison doesn't seem to affect ${uhitm_mon_nam(mtmp)}.`);
            } else {
                if (rn2(30)) {
                    damage += rnd(6);
                } else {
                    if (vis)
                        pline_The('poison was deadly...');
                    damage = mtmp.mhp | 0;
                }
            }
        }

        /* C:418-432 — silver sears a silver-hating monster.  RNG-free (the
         * extra damage itself is already inside dmgval). */
        if (material === SILVER_MU && mon_hates_silver_mu(mtmp)) {
            const flesh = (!noncorporeal_mu(mtmp.data) && !amorphous_mu(mtmp.data));
            if (vis) {
                let m_name = uhitm_mon_nam(mtmp);
                if (flesh)
                    m_name = s_suffix_mu(m_name) + ' flesh';
                pline_The(`silver sears ${m_name}!`);
            } else if (verbose && !gm.mtarget) {
                pline(`${flesh ? 'Its flesh' : 'It'} is seared!`);
            }
        }

        /* C:433-443 — acid venom.  RNG-free. */
        if ((otmp.otyp | 0) === ACID_VENOM_MU && cansee_mu(mtmp.mx | 0, mtmp.my | 0)) {
            if (resists_acid_mu(mtmp)) {
                if (vis || (verbose && !gm.mtarget))
                    pline(`${je_Monnam(mtmp)} is unaffected.`);
            } else {
                if (vis)
                    pline_The(`${hliquid_mu('acid')} burns ${uhitm_mon_nam(mtmp)}!`);
                else if (verbose && !gm.mtarget)
                    pline('It is burned!');
            }
        }

        /* C:444-449 — a thrown cockatrice EGG petrifies its target. */
        if ((otmp.otyp | 0) === EGG_OHITMON_MU && touch_petrifies_mk(otmp.corpsenm)) {
            if (!(await munstone_mu(mtmp, false)))
                await minstapetrify_mu(mtmp, false);
            if (resists_ston_mu(mtmp))
                damage = 0;
        }

        /* C:452-466 — apply the damage. */
        if (!harmless && (mtmp.mhp | 0) >= 1) {
            mtmp.mhp = (mtmp.mhp | 0) - damage;
            if ((mtmp.mhp | 0) < 1) {
                if (vis || (verbose && !gm.mtarget))
                    pline(`${je_Monnam(mtmp)} is `
                          + `${(nonliving_mu(mtmp.data)
                              /* C mthrowu.c:457 is_vampshifter(mtmp) (monst.h) */
                              || is_vampshifter(mtmp)
                              || !canspotmon_disp(mtmp))
                              ? 'destroyed' : 'killed'}!`);
                /* C mthrowu.c:462-465
                 *     if (!svc.context.mon_moving
                 *         && (otmp->otyp != BOULDER || range >= 0
                 *             || otmp->otrapped))
                 *         xkilled(mtmp, XKILL_NOMSG);
                 *     else
                 *         mondied(mtmp);
                 * "don't blame hero for unknown rolling boulder trap". */
                if (!mon_moving_mu()
                    && ((otmp.otyp | 0) !== BOULDER_MU || (range | 0) >= 0
                        || otmp.otrapped))
                    await xkilled_uh(mtmp, XKILL_NOMSG_UH);
                else
                    await mondied(mtmp);
            }
        }

        /* C:470-489 — blinding venom / cream pie.  DRAWS rnd(25). */
        if ((mtmp.mhp | 0) >= 1
            && can_blnd_mu(null, mtmp,
                           ((otmp.otyp | 0) === BLINDING_VENOM_MU) ? AT_SPIT_MU : AT_WEAP_MU,
                           otmp)) {
            if (vis && (mtmp.mcansee | 0))
                pline(`${je_Monnam(mtmp)} is blinded by `
                      + `${the((otmp.oclass | 0) === VENOM_CLASS_MU ? 'venom'
                               : ((otmp.otyp | 0) === CREAM_PIE_OHITMON_MU ? 'pie'
                                  : xname(otmp)))}.`);
            mtmp.mcansee = 0;
            tmp = (mtmp.mblinded | 0) + rnd(25) + 20;
            if (tmp > 127) tmp = 127;
            mtmp.mblinded = tmp;
        }

        /* C:490-491 — the thrower angers the target only when the HERO is
         * responsible; on a monster's own turn context.mon_moving is set. */
        if ((mtmp.mhp | 0) >= 1 && !mon_moving_mu())
            await setmangry_mu(mtmp, true);

        /* C:494-499 */
        const objgone = await drop_throw(otmp, 1, bx, by);
        if (!objgone && range === -1) { /* special case: rolling boulder */
            remove_object(otmp);
            return false;
        }
        return true;
    }
    return false;
}

/* ── ohitmon's leaf helpers ──────────────────────────────────────────────────
 * Constants and one-line macros, each cited to its C definition.  The `_MU`
 * suffix is this file's existing convention for a name that must not be
 * shadowed by one of mhitu.js's older file-local stubs. */
/* monst.h:130-131 M_AP_NOTHING 0 / M_AP_FURNITURE 1 / M_AP_OBJECT 2 /
 * M_AP_MONSTER 3 */
const M_AP_MONSTER_MU = 3;

function M_AP_TYPE_MU(mon) { return mon?.m_ap_type ?? 0; }

/* objclass indices — defsym.h:468-484 OBJCLASS(): WEAPON 2, RING 4, POTION 8,
 * GEM 13, VENOM 17.  VENOM_CLASS_MU is already declared in this file (:1369). */
const POTION_CLASS_MU = 8;

/* otyps, matching drop_throw's copies at the top of this file. */
const EGG_OHITMON_MU = 266, CREAM_PIE_OHITMON_MU = 287;

const AT_WEAP_MU = 254;

const AT_SPIT_MU = 10;

/* mondata.h:208 passes_rocks(ptr) = passes_walls(ptr) && !unsolid(ptr) */
function passes_rocks_mu(ptr) {
    if (!ptr) return false;
    /* monflag.h:88 M1_WALLWALK 0x08, :105 M1_UNSOLID 0x00100000 */
    const M1_WALLWALK = 0x00000008, M1_UNSOLID = 0x00100000;
    return ((ptr.mflags1 | 0) & M1_WALLWALK) !== 0
        && ((ptr.mflags1 | 0) & M1_UNSOLID) === 0;
}

/* obj.h:274 stone_missile(o) — objclass.h:33-34 GEMSTONE 20 / MINERAL 21
 * material, and defsym.h:470 RING_CLASS 4. */
function stone_missile_mu(o) {
    const GEMSTONE = 20, MINERAL = 21, RING_CLASS = 4;
    const m = MKOBJ_OC_MATERIAL[o.otyp | 0] | 0;
    return (m === GEMSTONE || m === MINERAL) && (o.oclass | 0) !== RING_CLASS;
}

/* obj.h:264-268 is_poisonable(otmp): multigen weapons or permapoisoned
 * artifacts (artifact.c:2837-2839, Grimtooth). */
function is_poisonable_mu(otmp) {
    if (_permapoisoned_mu(otmp)) return true;
    const WEAPON_CLASS = 2, NEG_P_SHURIKEN = -24, NEG_P_BOW = -20;
    if ((otmp.oclass | 0) === WEAPON_CLASS) {
        const sk = MKOBJ_OC_SKILL[otmp.otyp | 0] | 0;
        if (sk >= NEG_P_SHURIKEN && sk <= NEG_P_BOW) return true;
    }
    return _permapoisoned_mu(otmp); /* obj.h:268 || permapoisoned(otmp) */
}

/* monst.h:277 resists_poison(mon) = Resists_Elem(mon, POISON_RES), i.e.
 * mon_resistancebits(mon) & MR_POISON (js/mhitm.js:3246 builds the same OR). */
function resists_poison_mu(mon) {
    const MR_POISON = 0x20;
    const bits = ((mon.data ? (mon.data.mresists | 0) : 0)
                  | (mon.mextrinsics | 0) | (mon.mintrinsics | 0));
    return (bits & MR_POISON) !== 0;
}

function mhim_mu(mon) {
    /* C do_name.c mhim(): genders[pronoun_gender(mon, PRONOUN_HALLU)].him */
    return ['him', 'her', 'it', 'them'][pronoun_gender_nit_mu_real(mon, 2)];
}

/* C mon.c:3253 mondied's caller-side "is it still alive" test is
 * DEADMONSTER(mon) == mon->mhp < 1 (monst.h:214); written inline above. */
function mon_moving_mu() {
    return !!game.context?.mon_moving;
}

/* C ref: mthrowu.c:582 m_throw(mon, x, y, dx, dy, range, obj) — fly a monster's
 * missile from <x,y> along <dx,dy> for up to `range` squares.
 *
 * The C control flow and its RNG order are preserved:
 *   per loop iteration, AFTER the square is resolved: forcehit = !rn2(5)
 *   on reaching a monster: ohitmon(mtmp, singleobj, range, TRUE)
 *   on reaching the hero:  thitu(...)                   -> rnd(20)
 *   at end of path:        drop_throw(obj, 0, ...)      -> rn2(100)
 *   or return flight:      return_from_mtoss(...)       -> rn2(100)
 */
export async function m_throw(mon, x, y, dx, dy, range, obj) {
    let singleobj;
    let blindinc = 0;
    let bx = x, by = y;

    /* C mthrowu.c:589-591 — gb.bhitpos tracks the missile, and ohitmon()/hit()/
     * miss() all read it rather than taking coordinates.  This port carried the
     * flight position only in the locals bx/by, so those three read whatever
     * bhitpos a previous zap/apply had left behind. */
    const gb = game.bhitpos || (game.bhitpos = { x: 0, y: 0 });
    /* C mthrowu.c:589-590 updates the same gb.bhitpos that mattackm's
     * next-attack guard reads (mhitm.c:381). Keep both port spellings shared. */
    (game.gb ||= {}).bhitpos = gb;
    gb.x = x;
    gb.y = y;
    (game.gn || (game.gn = {})).notonhead = false; /* C:591 reset stale value */

    /* C mthrowu.c:593-594 — a wielded aklys/boomerang comes back on a tether. */
    const arw = autoreturn_weapon(obj);
    const tethered_weapon = (obj === MON_WEP(mon) && !!arw && !!(arw.tethered | 0));
    let return_flightpath = false;

    /* C mthrowu.c:604-618 — remove the missile from the thrower's inventory
     * NOW ("the infamous 2^32-1 orcish dagger bug"); a stack of >1 is split
     * first.  For a VENOM the extraction is a documented no-op (it is already
     * OBJ_FREE, C's comment at mthrowu.c:605). */
    if (((obj.quan ?? 1) | 0) === 1) {
        if (MON_WEP(mon) === obj)
            setmnotwielded(mon, obj);
        extract_from_minvent_dm(mon, obj);
        singleobj = obj;
        obj = null;
    } else {
        singleobj = (await splitobj(obj, 1));
        extract_from_minvent_dm(mon, singleobj);
    }
    game.thrownobj = singleobj;
    if (game.gt) game.gt.thrownobj = singleobj;
    singleobj.owornmask = 0;
    /* C mthrowu.c:619-620: unobserve by class; non-merging boulders and
     * statues retain dknown (mkobj.c:835-848), even when thrown unseen. */
    if (!canseemon_mu(mon))
        clear_dknown(singleobj);

    if (((singleobj.cursed | 0) || (singleobj.greased | 0)) && (dx || dy)
        && !rn2(7)) {
        /* C:623-629 */
        if (canseemon_mu(mon) && (game.flags?.verbose ?? true)) {
            if (is_ammo_mu(singleobj))
                await pline(`${Monnam(mon)} misfires!`);
            else
                await pline(`${Tobjnam(singleobj, 'slip')} as ${mon_nam_uh(mon)} throws it!`);
        }
        /* C:630-631 */
        dx = rn2(3) - 1;
        dy = rn2(3) - 1;
        /* C:632-636 — check validity of new direction */
        if (!dx && !dy) {
            await drop_throw(singleobj, 0, bx, by);
            return;
        }
    }

    /* C mthrowu.c:639-642 — blocked before it even starts. */
    if (await mt_flightcheck(bx, by, dx, dy, true, false, singleobj)) {
        if (!gm0_take_gone())
            await drop_throw(singleobj, 0, bx, by);
        return;
    }
    const gm = game.gm || (game.gm = {});
    gm.mesg_given = 0; /* C:648 — no 'missile misses' message shown yet */

    if (obj_sym_mu(singleobj)) {
        if (!tethered_weapon)
            tmp_at(DISP_FLASH, obj_to_glyph(singleobj));
        else
            tmp_at(DISP_TETHER, obj_to_glyph(singleobj));
    }

    while (range-- > 0) {
        /* C mthrowu.c:674-675 `singleobj->ox = gb.bhitpos.x += dx` */
        bx += dx; by += dy;
        gb.x = bx; gb.y = by;
        singleobj.ox = bx; singleobj.oy = by;
        if (cansee_mu(bx, by))
            observe_object_mu(singleobj);

        let mtmp = uhitm_m_at(bx, by);
        /* C mthrowu.c:680-683 — a shade lets the missile pass harmlessly
         * through; the flight then continues as if the square were empty. */
        if (mtmp && shade_miss_mu(mon, mtmp, singleobj, true, true))
            mtmp = null;
        if (mtmp) {
            /* C mthrowu.c:684-686 */
            if (await ohitmon(mtmp, singleobj, range, true))
                break;
        } else if (u_at_mu(bx, by)) {
            if (game.multi) nomul(0);

            if ((singleobj.oclass | 0) === OCLASS_GEM_MU
                && await ucatchgem(singleobj, mon))
                break;

            if (!tethered_weapon && await u_catch_thrown_obj(singleobj))
                break;

            /* C mthrowu.c:725-728 — a thrown POTION never rolls to-hit; it
             * always crashes on the hero:
             *   if (singleobj->oclass == POTION_CLASS) {
             *       potionhit(&gy.youmonst, singleobj, POTHIT_MONST_THROW);
             *       break;
             *   }
             * potionhit() consumes the object (obfree), so the `break` skips
             * the drop_throw/flight tail entirely. */
            if ((singleobj.oclass | 0) === POTION_CLASS_MU) {
                await potionhit(_hero_monst_mu(), singleobj, POTHIT_MONST_THROW_MU);
                break;
            }

            let hitu;
            const oldumort = (game.u?.umortality | 0); /* C mthrowu.c:702 */
            /* C mthrowu.c:704-739 — EGG / CREAM_PIE / BLINDING_VENOM take the
             * flat thitu(8, 0, ...) arm; everything else takes `default:`. */
            if ((singleobj.otyp | 0) === BLINDING_VENOM_MU
                || (singleobj.otyp | 0) === CREAM_PIE_M_THROW_MU
                || (singleobj.otyp | 0) === EGG_M_THROW_MU) {
                if ((singleobj.otyp | 0) === EGG_M_THROW_MU && !touch_petrifies_mk(singleobj.corpsenm)) {
                    await impossible_breath('monster throwing egg type %d', singleobj.corpsenm);
                    hitu = 0;
                } else
                    hitu = await thitu(8, 0, singleobj, null);
            } else {
                /* C mthrowu.c:715-738 default: */
                let dam = dmgval(singleobj, _hero_monst_mu());
                let hitv = 3 - distmin((game.u?.ux | 0), (game.u?.uy | 0),
                                       mon.mx | 0, mon.my | 0);
                if (hitv < -4)
                    hitv = -4;
                /* C:721-728 — elves get a shooting bonus, orcs don't. */
                if (is_elf_mu(mon.data)
                    && (MKOBJ_OC_SKILL[singleobj.otyp | 0] | 0) === -P_BOW_MHU) {
                    hitv++;
                    const mw = MON_WEP(mon);
                    if (mw && (mw.otyp | 0) === ELVEN_BOW_MU)
                        hitv++;
                    if ((singleobj.otyp | 0) === ELVEN_ARROW_MU)
                        dam++;
                }
                if (bigmonst_mu(_hero_permonst_mu()))
                    hitv++;
                hitv += 8 + (singleobj.spe | 0);
                if (dam < 1)
                    dam = 1;
                if ((singleobj.otyp | 0) !== ACID_VENOM_MU)
                    dam = maybe_half_phys_mu(dam);
                hitu = await thitu(hitv, dam, singleobj, null);
            }
            /* C mthrowu.c:741-753 — a poisoned missile that hit the hero. */
            if (hitu && (singleobj.opoisoned | 0) && is_poisonable_mu(singleobj)) {
                const onmbuf = await xname(singleobj);
                const knmbuf = await killer_xname_mu(singleobj);
                await poisoned(onmbuf, 0 /* A_STR */, knmbuf,
                               ((game.u?.umortality | 0) > oldumort) ? 0 : 10, true);
            }
            if (ENV.FF_MATTACK_TRACE === '1')
                pushRngLogEntry(`^mthrow_hit[id=${mon.m_id|0} otyp=${singleobj.otyp|0} hit=${hitu ? 1 : 0} mesg=${gm.mesg_given|0} hp=${game.u?.uhp|0}]`);
            /* C mthrowu.c:754-777 — the hero-targeted BLINDING_VENOM / CREAM_PIE
             * arm spends rnd(25) after thitu succeeds.  C defers applying the
             * blindness until the flight cleanup below, after the missile's
             * display effect closes. */
            if (hitu && can_blnd_mu(null, _hero_monst_mu(),
                                    ((singleobj.otyp | 0) === BLINDING_VENOM_MU)
                                        ? AT_SPIT_MU : AT_WEAP_MU,
                                    singleobj)) {
                blindinc = rnd(25);
                if ((singleobj.otyp | 0) === CREAM_PIE_OHITMON_MU) {
                    if (!Blind(game))
                        await pline("Yecch!  You've been creamed.");
                    else
                        await pline(`There's something sticky all over your ${mbodypart_mu(_hero_monst_mu(), FACE_MU)}.`);
                } else if ((singleobj.otyp | 0) === BLINDING_VENOM_MU) {
                    let eyes = mbodypart_mu(_hero_monst_mu(), EYE_MU);
                    if (eyecount(_hero_monst_mu()) !== 1)
                        eyes = makeplural(eyes);
                    /* venom in the eyes */
                    if (!Blind(game))
                        await pline_The('venom blinds you.');
                    else
                        await pline(`Your ${eyes} ${vtense(eyes, 'sting')}.`);
                }
            }
            /* C mthrowu.c:779 onward is NOT REACHED when the missile killed the
             * hero: thitu -> losehp -> done() does not return in C, so the whole
             * tail below — stop_occupation, drop_throw and drop_throw's
             * breaktest -> obj_resists / should_mulch_missile — is code C never
             * runs.  Breaking out runs the display-only, RNG-free tail so
             * tmp_at(DISP_FREEMEM, 0) unwinds the effect stack cleanly. */
            if (game._pendingDeath)
                break;
            /* C mthrowu.c:779-785 — any egg that hits starts delayed stoning. */
            if (hitu && (singleobj.otyp | 0) === EGG_M_THROW_MU) {
                const pst = game.u?.uprops?.[18];
                if (!(pst?.intrinsic | 0) && !Stone_resistance(game)
                    && !(poly_when_stoned(youmonst_data(game))
                         && await polymon(PM_STONE_GOLEM)))
                    await make_stoned(5, null, KILLED_BY, "");
            }
            await stop_occupation();
            if (hitu) {
                /* C mthrowu.c:788-793 — a TETHERED weapon is not dropped where
                 * it struck; it is queued for the return journey. */
                if (!tethered_weapon)
                    await drop_throw(singleobj, hitu, (game.u?.ux | 0), (game.u?.uy | 0));
                else
                    return_flightpath = true;
                break;
            }
        }

        /* C mthrowu.c:798 — forcehit is rolled every iteration that did not
         * already break out. */
        const forcehit = !rn2(5);
        if (!range || await mt_flightcheck(bx, by, dx, dy, false, forcehit, singleobj)) {
            if (gm0_take_gone())
                break;
            /* C mthrowu.c:810-814 — "<The missile> misses." when a multishot
             * volley overshoots in view. */
            /* no 'range &&' here: C's range test guards only the sink arm; the
             * 'misses' arm also fires when the volley ran out of range. */
            if (range && cansee_mu(bx, by)
                && ((game.level?.at(bx, by)?.typ | 0) === SINK_MU))
                /* C mthrowu.c:803-806 — a missile stopped by a sink. */
                await pline(`${The_mu(mshot_xname(singleobj))} ${otense_mu(singleobj, Hallucination(game) ? 'plop' : 'drop')} onto the sink.`);
            else if (gm.m_shot && (gm.m_shot.n | 0) > 1
                && (!gm.mesg_given || bx !== (game.u?.ux | 0) || by !== (game.u?.uy | 0))
                && (cansee_mu(bx, by) || (gm.marcher && canseemon_mu(gm.marcher))))
                await pline(`${The_mu(mshot_xname(singleobj))} misses.`);
            /* C mthrowu.c:814-820 — same fork as the hit case above. */
            if (!tethered_weapon)
                await drop_throw(singleobj, 0, bx, by);
            else
                return_flightpath = true;
            break;
        }
        /* C mthrowu.c:824-825 — advance the flash one square. */
        tmp_at(bx, by);
        nh_delay_output_mu();
    }
    if (pending_death_is_final()) {
        tmp_at(DISP_FREEMEM, 0);
    } else {
        tmp_at(bx, by);
        nh_delay_output_mu();
        /* C mthrowu.c:829-833
         *     if (arw && return_flightpath)
         *         return_from_mtoss(mon, singleobj, tethered_weapon);
         *     else
         *         tmp_at(DISP_END, 0);
         * return_from_mtoss closes the effect stack itself (DISP_END/BACKTRACK
         * on the tethered arm, plain DISP_END on the others). */
        if (arw && return_flightpath)
            await return_from_mtoss(mon, singleobj, tethered_weapon);
        else
            tmp_at(DISP_END, 0);
    }
    gm.mesg_given = 0; /* C:835 reset */
    /* C mthrowu.c:836-839 — apply the deferred hero blindness after the
     * missile flight has ended.  ucreamed is separate from HBlinded because
     * timeout decay removes the cream contribution independently. */
    if (blindinc) {
        const u = game.u || (game.u = {});
        u.ucreamed = (u.ucreamed | 0) + blindinc;
        make_blinded_real_mu(BlindedTimeout_mu() + blindinc, false);
        if (!Blind(game))
            Your1('vision quickly clears.');
    }
    if (!game._pendingDeath) {
        game.thrownobj = null;
        if (game.gt) game.gt.thrownobj = null;
    }
}

/* C hacklib.c sgn(). */
function sgn_mtoss(x) { return (x > 0) ? 1 : (x < 0) ? -1 : 0; }

/* C ref: mthrowu.c:845-961 return_from_mtoss(magr, otmp, tethered_weapon) —
 * the return journey of a monster's thrown-and-returning weapon.  C's whole
 * arwep[] table is one row, the AKLYS (weapon.c:512-517), so in practice this
 * is a monster throwing its wielded thonged club and getting it back.
 */
async function return_from_mtoss(magr, otmp, tethered_weapon) {
    const impaired = !!((magr.mconf | 0) || (magr.mstun | 0)
                        || (magr.mblinded | 0));
    let notcaught = false, hits_thrower = false;
    const gb = game.bhitpos || (game.bhitpos = { x: 0, y: 0 });
    let x = gb.x | 0, y = gb.y | 0;
    /* C:854 */
    const made_it_back = rn2(100);
    let dmg = 0;

    if (otmp && made_it_back) {
        /* C:856-874 — it made it back to the thrower's location. */
        if (tethered_weapon) {
            tmp_at(DISP_END, BACKTRACK_MU);
        } else {
            const sdx = sgn_mtoss(x - (magr.mx | 0)),
                  sdy = sgn_mtoss(y - (magr.my | 0));
            if (x !== (magr.mx | 0) || y !== (magr.my | 0)) {
                tmp_at(DISP_FLASH, obj_to_glyph(otmp));
                while (isok_mu(x, y)
                       && (x !== (magr.mx | 0) || y !== (magr.my | 0))) {
                    tmp_at(x, y);
                    nh_delay_output_mu();
                    x -= sdx;
                    y -= sdy;
                }
                tmp_at(DISP_END, 0);
            }
        }
        x = magr.mx | 0;
        y = magr.my | 0;
        /* C:877 */
        if (!impaired && rn2(100)) {
            /* C:881-885 */
            if (!_mtoss_do_not_annoy
                || ((game.moves | 0) - _mtoss_do_not_annoy) > 500) {
                await pline(`${Tobjnam(otmp, 'return')} to `
                      + `${s_suffix(mon_nam_uh(magr))} `
                      + `${mbodypart_mu(magr, HAND_MU)}!`);
                _mtoss_do_not_annoy = game.moves | 0;
            }
            /* C:886-892 */
            await add_to_minv(magr, otmp);
            if (tethered_weapon) {
                magr.mw = otmp;
                otmp.owornmask = (otmp.owornmask | 0) | W_WEP_MU;
            }
            if (cansee_mu(x, y))
                newsym(x, y);
        } else {
            /* C:895-921 — it came back but the thrower failed to catch it. */
            dmg = rn2(2);
            if (!dmg) {
                if (canseemon_mu(magr)) {
                    /* C:901-904, with mlevitating hardcoded FALSE ("msg
                     * future-proofing only", C:896). */
                    await pline(`${Tobjnam(otmp, 'return')} back to `
                          + `${mon_nam_uh(magr)}, landing at ${mhis(magr)} `
                          + `${makeplural(mbodypart_mu(magr, FOOT_MU))}.`);
                } else if (!Deaf_mu()) {
                    await You_hear(`Something land near ${mon_nam_uh(magr)}.`);
                }
            } else {
                dmg += rnd(3);
                if (canseemon_mu(magr)) {
                    await pline(`${Tobjnam(otmp, 'fly')} back toward `
                          + `${mon_nam_uh(magr)}, hitting ${mhis(magr)} ${mbodypart_mu(_hero_monst_mu(), ARM)}!`);
                } else if (!Deaf_mu()) {
                    await You_hear(`something hit ${mon_nam_uh(magr)} with a thud!`);
                }
                hits_thrower = true;
            }
            notcaught = true;
        }
    } else {
        /* C:922-928 — it didn't make it back. */
        if (tethered_weapon)
            tmp_at(DISP_END, 0);
        await You_hear('a loud snap!');
        notcaught = true;
    }
    if (otmp) {
        if (hits_thrower) {
            if (otmp.oartifact)
                dmg = (await artifact_hit(null, magr, otmp, dmg, 0)).dmg;
            magr.mhp = (magr.mhp | 0) - dmg;
            if ((magr.mhp | 0) <= 0) {
                /* C:935 monkilled(magr, canspotmon(magr) ? "" : NULL, AD_PHYS)
                 * NULL suppresses the death message for an unseen thrower. */
                await monkilled(magr, canspotmon_disp(magr) ? '' : null);
            }
        }
        if (notcaught) {
            /* C:938-947 */
            await snuff_candle_mu(otmp);
            if (!(await ship_object(otmp, x, y, false))) {
                if (await flooreffects_mu(otmp, x, y, 'drop')) {
                    if (cansee_mu(x, y))
                        newsym(x, y);
                    return;
                }
                place_object(otmp, x, y);
                await stackobj(otmp);
            }
            /* C:948-956 sound effects when the item lands in water or lava */
            if (!Deaf_mu() && !_Underwater_mu()) {
                if (is_pool_mu(x, y)
                    || (bhp_is_lava_mu(x, y) && !is_flammable_mu(otmp))) {
                    Soundeffect(se_splash, 50);
                    await pline((weight_mu(otmp) > 9) ? 'Splash!' : 'Plop!');
                }
            }
            if (obj_sheds_light(otmp)) game.vision_full_recalc = 1;
        }
    }
    /* C:959-960 */
    if (cansee_mu(x, y))
        newsym(x, y);
}

/* C mthrowu.c:604 `char sym = obj->oclass` — the animation is opened only when
 * the object has a display class at all (always true for a real object). */
function obj_sym_mu(obj) { return (obj.oclass | 0) !== 0; }

/* C's nh_delay_output — a no-op in this port (js/display.js:4958 says the same). */
function nh_delay_output_mu() { }

/* JS otyps used by m_throw's flat-thitu arm — see drop_throw's copies. */
const CREAM_PIE_M_THROW_MU = 287, EGG_M_THROW_MU = 266;

/* C obj.h:477 POTHIT_MONST_THROW (POTION_CLASS_MU is declared at :2516). */
const POTHIT_MONST_THROW_MU = 2;

const POTHIT_OTHER_THROW_MU = 3;

/* C mthrowu.c:506-529: unicorns catch gems, but reject glass after identifying it. */
async function ucatchgem(gem, mon) {
    const ptr = _hero_permonst_mu();
    if (gem.otyp <= LAST_GLASS_GEM && is_unicorn(ptr)) {
        const gem_xname = await xname(gem);
        const mon_s_name = s_suffix(mon_nam_uh(mon));
        if (gem.otyp > LAST_REAL_GEM) {
            await pline(`You catch the ${gem_xname}.`);
            await pline(`You are not interested in ${mon_s_name} junk.`);
            discover_object_ds(gem.otyp, true, true, true);
            await dropy(gem);
        } else {
            await pline(`You accept ${mon_s_name} gift in the spirit in which it was intended.`);
            await hold_another_object(gem, 'You catch, but drop, %s.',
                                      gem_xname, 'You catch:');
        }
        return true;
    }
    return false;
}

async function u_catch_thrown_obj(otmp) {
    const u = game.u || {};
    /* attrib.h A_DEX == 3 (js/const.js:241).  acurr() translates the C
     * constant into the display-ordered u.acurr.a slot itself. */
    const catch_chance = 100 - (acurr(u, A_DEX) | 0)
        - ((_Role_if_mu(PM_MONK_MU) || _Role_if_mu(PM_ROGUE_MU)) ? 20 : 0);
    const SLT_ENCUMBER = 1; /* hack.h */

    if (!Blind_mu() && !Confusion_mu() && !Stunned_mu() && !Fumbling_mu()
        && (otmp.oclass | 0) !== VENOM_CLASS_MU
        && !nohands_mu(_hero_permonst_mu()) && freehand()
        && calc_capacity(otmp.owt | 0) <= SLT_ENCUMBER
        && !rn2(catch_chance)) {
        const nm = simpleonames_mu(otmp);
        await hold_another_object(otmp, 'You catch, but drop, the %s.', nm,
                            `You catch the ${nm}!`);
        return true;
    }
    return false;
}

/* Hero-property shims for u_catch_thrown_obj.  Each names the C macro it
 * stands for; the underlying property plumbing lives in js/const.js's uprops
 * numbering (see js/mhitu.js's own Blind handling above). */
const PM_MONK_MU = 5, PM_ROGUE_MU = 7;

function _Role_if_mu(role_idx) {
    const ir = (game.flags && game.flags.initrole != null)
        ? (game.flags.initrole | 0) : -1;
    if (ir >= 0) return ir === role_idx;
    return ((game.urole && game.urole.mnum != null)
        ? (game.urole.mnum | 0) : -1) === role_idx;
}

function Confusion_mu() { return _uprop_on_mu(CONFUSION); }

function Stunned_mu() { return _uprop_on_mu(STUNNED); }

function Fumbling_mu() { return _uprop_on_mu(FUMBLING); }

/* C mondata.h:52 nohands(ptr) = (ptr->mflags1 & M1_NOHANDS) != 0.  Absent
 * permonst defaults to "has hands" (the same convention as js/cmd.js:5332). */
function nohands_mu(ptr) {
    const M1_NOHANDS = 0x00002000;
    return !!ptr && ((ptr.mflags1 | 0) & M1_NOHANDS) !== 0;
}

/* C ref: mthrowu.c:1268 spitmu(mtmp, mattk) = spitmm(mtmp, mattk, &youmonst).
 * The hero-monst is passed as null because this port has no global youmonst
 * record; spitmm reads that as "the target is the hero". */
export async function spitmu(mtmp, mattk) {
    return await spitmm(mtmp, mattk, null);
}

/* C hacklib.c sgn(n) — -1 / 0 / 1. */
function sgn_mu(n) { return (n | 0) < 0 ? -1 : ((n | 0) > 0 ? 1 : 0); }

/* C hack.h distmin(x0,y0,x1,y1) = max(|x0-x1|, |y0-y1|). */
function distmin_mu(x0, y0, x1, y1) {
    return Math.max(Math.abs(x0 - x1), Math.abs(y0 - y1));
}
