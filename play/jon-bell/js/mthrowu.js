// mthrowu.js — C ref: mthrowu.c.
import { exercise } from './attrib.js';
import { ACID_RES, A_CON, A_STR, IS_OBSTRUCTED, KILLED_BY_AN, LAVAWALL, OBJ_DELETED, W_WEP, isok } from './const.js';
import { losehp } from './hack.js';
import { game } from './gstate.js';
import { distmin } from './hacklib.js';
import { hates_silver as hates_silver_thitu } from './makemon.js';
import { obfree } from './shk.js';
import { sobj_at } from './invent.js';
import { MKOBJ_OC_MATERIAL, MKOBJ_OC_SKILL } from './mkobj_erosion_meta.js';
import { killer_xname as _thitu_killer_xname, an, doname, mshot_xname, obj_is_pname, the, vtense } from './objnam.js';
import { pline, pline_The } from './pline.js';
import { potionhit as potionhit_thitu } from './potion.js';
import { rn2, rnd } from './rng.js';
import { BOLT_LIM, BOULDER, Blind_thitu, _gp_closed_door, _gp_is_waterwall, _lo_hero_monst, _monstseesu_stub, _monstunseesu_stub, _thitu_stone_missile, _tr_passes_rocks, sgn, upstart_local } from './trap.js';
import { clear_path, couldsee } from './vision.js';
import { weight } from './weight.js';
import { extract_from_minvent } from './worn.js';
import { M_AP_MONSTER, M_AP_NOTHING, M_AP_TYPMASK, Upolyd } from './const.js'; // relocate-fns
import { WAN_STRIKING, throws_rocks } from './makemon.js'; // relocate-fns

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
function ammo_and_launcher(ammo, launcher) {
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
            if (ammo_and_launcher(otmp, mwep))
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
 * Reuses this file's own goodpos() helpers for the closed-door and waterwall
 * tests (_gp_closed_door / _gp_is_waterwall), which are already C-faithful
 * ports of monmove.c:2204 and dbridge.c:37. */
export function blocking_terrain(x, y) {
    if (!isok(x, y))
        return true;
    const typ = game.level?.at(x, y)?.typ | 0;
    if (IS_OBSTRUCTED(typ))
        return true;
    if (_gp_closed_door(x, y))
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
