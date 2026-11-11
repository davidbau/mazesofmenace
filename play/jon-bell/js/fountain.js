// fountain.js — C ref: fountain.c.
import { discover_artifact } from './artifact.js';
import { acurr, adjattrib, exercise, losestr } from './attrib.js';
import { body_part, body_part as body_part_cmd, enlightenment_menu, in_town, mbodypart, surface, useup, water_damage_chain } from './cmd.js';
import { money_cnt } from './hack.js';
import { ARM, A_CON, A_DEX, A_STR, A_WIS, BLINDED, DEAF, ER_GREASED, ER_NOTHING, FACE, FIRE_RES, FOUNTAIN, FROMOUTSIDE, GLIB, G_GONE, HAND, HEAD, INVIS, IS_FOUNTAIN, KILLED_BY, KILLED_BY_AN, LEVITATION, LL_ARTIFACT, MAGICENLIGHTENMENT, MM_NOMSG, M_SEEN_FIRE, ONAME_KNOW_ARTI, ONAME_VIA_DIP, POLY_NOFLAGS, POOL, ROOM, SEE_INVIS, S_LRING, TT_INFLOOR, TT_LAVA, nothing_seems_to_happen, u_at } from './const.js';
import { canspotmon, flush_screen, force_more_pages, newsym } from './display.js';
import { trycall as trycall_cmd } from './do.js';
import { rndmonnam } from './do_name.js';
import { fingers_or_gloves } from './do_wear.js';
import { obfree } from './dokick.js';
import { delobj } from './invent.js';
import { losehp } from './hack.js';
import { morehungry, newuhs } from './eat.js';
import { game, wizard } from './gstate.js';
import { distmin } from './hacklib.js';
import { mhe, monflee } from './makemon.js';
import { Amonnam, a_monnam, hcolor, hliquid, monstunseesu, update_inventory } from './mhitm.js';
import { mhis_mon } from './mhitu.js';
import { del_engr_at, makemon, mkgold, mkobj, mkobj_at, mksobj_at, rnd_class } from './mklev.js';
import { sobj_at } from './invent.js';
import { level_difficulty } from './dungeon.js';
import { set_levltyp } from './mkmaze.js';
import { curse, uncurse } from './mkobj.js';
import { nexttodoor } from './mkroom.js';
import { angry_guards, get_iter_mons, minliquid } from './mon.js';
import { observe_object } from './o_init.js';
import { fruitname, getObjDescr, makeplural as makeplural_objnam, oname, the, xname } from './objnam.js';
import { artiname, exist_artifact } from './artifact.js';
import { You_hear, You_see, livelog_printf, pline } from './pline.js';
import { PM_SEWER_RAT, PM_WATCHMAN as PM_WATCHMAN_POT, PM_WATCH_CAPTAIN as PM_WATCH_CAPTAIN_POT, PM_WATER_DEMON, PM_WATER_ELEMENTAL, PM_WATER_MOCCASIN, PM_WATER_NYMPH } from './pm.generated.js';
import { polyself } from './polyself.js';
import { COIN_CLASS, POTION_CLASS, POT_ACID, POT_FRUIT_JUICE, POT_GAIN_ENERGY, POT_GAIN_LEVEL, POT_LEVITATION, POT_MONSTER_DETECTION, POT_OBJECT_DETECTION, POT_OIL, POT_POLYMORPH, POT_WATER, Poison_resistance, You_feel, _C_ATTR_TO_DISP, _getAbase, _getAexe, _getAmax, _gush_m_at, _hallucination, _mongrantswish, _potion_Blind, _potion_Deaf, _potion_Hallucination, _prop_active, _unchanging, _uprop, breathless, dopotion_unported, haseyes, make_glib, makeplural, monster_detect, polymorph_sink, potionbreathe, vomit, y_n } from './potion.js';
import { monstseesu } from './mondata.js';
import { create_gas_cloud, gas_cloud_at } from './region.js';
import { rn1, rn2, rnd } from './rng.js';
import { somegold } from './steal.js';
import { delfloortrap, mintrap, t_at, water_damage } from './trap.js';
import { more_experienced, newexplevel } from './uhitm.js';
import { cansee, couldsee, do_clear_area_async } from './vision.js';
import { encumber_msg } from './weight.js';

/* objclass.h RING_CLASS (used by drinksink's ring-discovery arm). */
const RING_CLASS = 4;

/* C objects.h BOULDER — objects.h is an X-macro file, so the id is verified
 * against js/oc_name_data.js OC_NAME[475] === 'boulder', not grepped. */
const BOULDER = 475;

function _getAbon(u) {
    if (!u.abon)
        u.abon = { a: [0, 0, 0, 0, 0, 0] };
    if (!u.abon.a)
        u.abon.a = [0, 0, 0, 0, 0, 0];
    return u.abon.a;
}

function _getAtemp(u) {
    if (!u.atemp)
        u.atemp = { a: [0, 0, 0, 0, 0, 0] };
    if (!u.atemp.a)
        u.atemp.a = [0, 0, 0, 0, 0, 0];
    return u.atemp.a;
}

const _RACE_ATTRMAX = [
    /* hum */ [118, 18, 18, 18, 18, 18],
    /* elf */ [18, 20, 20, 18, 16, 18],
    /* dwa */ [118, 16, 16, 20, 20, 16],
    /* gno */ [68, 19, 18, 18, 18, 18],
    /* orc */ [68, 16, 16, 18, 18, 16],
];

const _RACE_ATTRMIN = 3;

function _attrmax(u, i) {
    /* i is a C constant; RACE_ATTRMAX rows are in C constant order — correct */
    const ir = (game.flags?.initrace ?? -1) | 0;
    const row = (ir >= 0 && ir < _RACE_ATTRMAX.length) ? _RACE_ATTRMAX[ir] : _RACE_ATTRMAX[0];
    return row[i];
}

function _acurr(u, i) {
    /* i is a C constant; translate to display index for array access */
    const di = _C_ATTR_TO_DISP[i] ?? i;
    const abase = _getAbase(u);
    const abon = _getAbon(u);
    const atemp = _getAtemp(u);
    const tmp = (abon[di] | 0) + (atemp[di] | 0) + (abase[di] | 0);
    if (tmp >= 25)
        return 25;
    if (tmp <= 3)
        return 3;
    return tmp;
}

export async function floating_above(what) {
    const u = game.u || {};
    let umsg = `are floating high above the ${what}.`;
    if (u.utrap && (u.utraptype === TT_INFLOOR || u.utraptype === TT_LAVA)) {
        umsg = `are trapped in the ${surface(u.ux, u.uy)}.`;
    }
    await pline(`You ${umsg}`);
}

/* ---------------------------------------------------------------------------
 * dryup(x, y, isyou) — C ref: fountain.c:201 dryup().
 * Checks fountain depletion. RNG: rn2(3) or FOUNTAIN_IS_WARNED check.
 * ---------------------------------------------------------------------------
 */
/* C mondata.h:53 nolimbs(ptr) — ((mflags1 & M1_NOLIMBS) == M1_NOLIMBS) */
const _M1_NOLIMBS = 0x00006000;
function _mon_nolimbs(ptr) {
    return (((ptr?.mflags1) | 0) & _M1_NOLIMBS) === _M1_NOLIMBS;
}

function _watchman_warn_fountain(mtmp) {
    if (!_pot_is_watch(mtmp) || !couldsee(mtmp.mx | 0, mtmp.my | 0)
        || !mtmp.mpeaceful)
        return false;
    if (_pot_deaf()) {
        /* C fountain.c:186-194 — Deaf hero: watchman gestures instead of yelling.
         * Watchman's limbs determine whether the monster shakes head or waves arms. */
        const limbless = _mon_nolimbs(mtmp?.data);
        const verb = limbless ? 'shakes' : 'waves';
        const his = mhis_mon(mtmp);
        const part = limbless ? mbodypart(mtmp, HEAD) : makeplural_objnam(mbodypart(mtmp, ARM));
        void pline(`${Amonnam(mtmp)} earnestly ${verb} ${his} ${part}!`);
        return true;
    }
    /* C: pline("%s yells:", Amonnam(mtmp)); verbalize("Hey, stop using that fountain!"); */
    void pline(`${Amonnam(mtmp)} yells:`);
    void pline(`"Hey, stop using that fountain!"`);
    return true;
}

/* C mondata.h:159 is_watch(ptr) — watchman or watch captain. */
function _pot_is_watch(mtmp) {
    const ix = (mtmp?.data?.pmidx ?? mtmp?.mndx ?? mtmp?.mnum ?? -1) | 0;
    return ix === PM_WATCHMAN_POT || ix === PM_WATCH_CAPTAIN_POT;
}

/* C youprop.h Deaf = (HDeaf || EDeaf || u.uroleplay.deaf). */
function _pot_deaf() {
    const u = game.u || {};
    const p = u.uprops?.[DEAF];
    return !!((p?.intrinsic | 0) || (p?.extrinsic | 0) || (u.HDeaf | 0)
              || (u.uroleplay?.deaf ? 1 : 0));
}

export async function dryup(x, y, isyou) {
    const g = game;
    const loc = g.level?.at(x, y);
    if (!loc)
        return;
    const F_WARNED = 2;
    /* C: IS_FOUNTAIN(levl[x][y].typ) && (!rn2(3) || FOUNTAIN_IS_WARNED(x,y)) */
    if (!IS_FOUNTAIN(loc.typ))
        return;
    if (rn2(3) && !(loc.flags & F_WARNED))
        return;
    if (isyou && in_town(x, y) && !(loc.flags & F_WARNED)) {
        /* SET_FOUNTAIN_WARNED */
        loc.flags |= F_WARNED;
        /* Warn about future fountain use. */
        const mtmp = get_iter_mons(_watchman_warn_fountain);
        /* You can see or hear this effect */
        if (!mtmp)
            await pline('The flow reduces to a trickle.');
        return;
    }
    if (isyou && wizard()) {
        /* y_n() in this file is async (it flushes the prompt, then nhgetch);
         * the un-awaited call compared a Promise to 'n', which is never equal,
         * so wizard mode always fell through as if the player had said yes AND
         * the prompt's keystroke was never read. */
        if (await y_n('Dry up fountain?') === 'n')
            return;
    }
    /* FIXME: sight-blocking clouds should use block_point() when
       being created and unblock_point() when going away, then this
       glyph hackery wouldn't be necessary
       [C's own comment, fountain.c:220-222]
       C reads gg.gbuf[y][x] via glyph_at() (fountain.c:224-227) and
       suppresses the message when that square is currently showing S_cloud
       (!glyph_is_cmap(glyph) || glyph_to_cmap(glyph) != S_cloud).
       In JS, gas_cloud_at(x, y) checks for a visible S_cloud region at (x, y),
       mirroring C's suppression under a cloud while cansee(x, y) checks visibility. */
    if (cansee(x, y) && !gas_cloud_at(x, y))
        await pline('The fountain dries up!');
    set_levltyp(x, y, ROOM); /* updates level.flags.nfountains */
    loc.flags = 0;
    loc.blessedftn = 0;
    /* The location is seen if the hero/monster is invisible
       or felt if the hero is blind. */
    newsym(x, y);
    if (isyou && in_town(x, y))
        await angry_guards(false);
}

/* ---------------------------------------------------------------------------
 * dofindgem() — C ref: fountain.c:163-177 dofindgem().
 * "Find a gem in the sparkling waters." — drinkfountain()'s fate==27 arm and
 * dipfountain()'s rnd(30)==24 arm, both guarded by !FOUNTAIN_IS_LOOTED.
 * RNG (in C order, all inside this body):
 *   rnd_class(DILITHIUM_CRYSTAL, LUCKSTONE-1) → rnd(862)   [sum of oc_prob
 *       over otyp 439..469; verified against js/mkobj_data.js]
 *   mksobj_at(..., init=FALSE, artif=FALSE) → next_ident() rnd(2)
 *       (init is FALSE, so mksobj_init's per-class quan/blessorcurse rolls
 *        do NOT fire — the gem is a bare quan==1 object)
 *   exercise(A_WIS, TRUE) → rn2(19)
 * C evaluates the rnd_class argument before entering mksobj_at, so the
 * rnd(862) precedes the rnd(2); keep them in that order.
 * ---------------------------------------------------------------------------
 */
async function dofindgem() {
    const g = game;
    const u = g.u;
    /* C objects.h — same pair js/dokick.js:281-282 and js/makemon.js:1753 use */
    const DILITHIUM_CRYSTAL = 439, LUCKSTONE = 470;
    /* C rm.h:256 */
    const F_LOOTED = 1;
    /* C fountain.c:166-169 */
    if (!_blind())
        await pline('You spot a gem in the sparkling waters!');
    else
        await You_feel('a gem here!');
    /* C fountain.c:170-171 */
    await mksobj_at(rnd_class(DILITHIUM_CRYSTAL, LUCKSTONE - 1), u.ux, u.uy,
              false, false);
    /* C fountain.c:172 SET_FOUNTAIN_LOOTED(u.ux, u.uy) — rm.h:261 aliases
     * `looted` onto struct rm's `flags`, which is what js/ stores it in
     * (js/potion.js:553 and js/sp_lev.js:6351 already read/write it there). */
    const loc = g.level?.at(u.ux, u.uy);
    if (loc)
        loc.flags |= F_LOOTED;
    /* C fountain.c:173 */
    newsym(u.ux, u.uy);
    /* C fountain.c:174 — exercise(A_WIS, TRUE); "a discovery!" */
    await exercise(A_WIS, true);
}

export async function drinkfountain() {
    const g = game;
    const u = g.u;
    const loc = g.level?.at(u.ux, u.uy);
    /* C fountain.c:246: mgkftn = (levl[u.ux][u.uy].blessedftn == 1) */
    const mgkftn = !!(loc && loc.blessedftn === 1);
    /* C fountain.c:247: int fate = rnd(30) — MUST fire before any branch */
    const fate = rnd(30);
    /* C fountain.c:249-252: Levitation check */
    if (_prop_active(LEVITATION)) {
        await floating_above('fountain');
        return;
    }
    if (mgkftn && (u.uluck | 0) >= 0 && fate >= 10) {
        /* C fountain.c:254-276: Blessed magical fountain Wow! path */
        const A_MAX = 6;
        const littleluck = ((u.uluck | 0) < 4);
        /* C fountain.c:257 */
        await pline('Wow!  This makes you feel great!');
        /* C fountain.c:258-262: blessed restore ability (ABASE → AMAX for each attr).
         * Restores any drained attributes. No RNG.
         * NOTE: ii is a C constant; abase/amax are display-order arrays — translate. */
        {
            const abase = _getAbase(u);
            const amax = _getAmax(u);
            for (let ii = 0; ii < A_MAX; ii++) {
                const dii = _C_ATTR_TO_DISP[ii] ?? ii;
                if ((abase[dii] | 0) < (amax[dii] | 0)) {
                    abase[dii] = amax[dii];
                    if (g.disp)
                        g.disp.botl = 1;
                }
            }
        }
        /* C fountain.c:264: i = rn2(A_MAX) — random starting attribute */
        let i = rn2(A_MAX);
        /* C fountain.c:265-270: adjattrib loop — try to gain one attribute */
        for (let ii = 0; ii < A_MAX; ii++) {
            const msgflg = littleluck ? -1 : 0;
            if (adjattrib(i, 1, msgflg) && littleluck)
                break;
            if (++i >= A_MAX)
                i = 0;
        }
        /* C fountain.c:271: display_nhwindow(WIN_MESSAGE, FALSE) — More prompt */
        /* In JS: flush pending message with --More-- then wait for dismiss key. */
        await _display_nhwindow_message();
        /* C fountain.c:272-275 */
        await pline('A wisp of vapor escapes the fountain...');
        await exercise(A_WIS, true);
        /* C fountain.c:275: levl[u.ux][u.uy].blessedftn = 0 */
        if (loc)
            loc.blessedftn = 0;
        /* C fountain.c:276: return (no dryup on blessed path) */
        return;
    }
    if (fate < 10) {
        /* C fountain.c:279-284: cool draught */
        await pline('The cool draught refreshes you.');
        u.uhunger = (u.uhunger | 0) + rnd(10);
        await newuhs(false);
        if (mgkftn)
            return;
        /* falls through to dryup */
    }
    else {
        /* C fountain.c:286-387: switch(fate) */
        switch (fate) {
            case 19: /* C fountain.c:289-294 — self-knowledge */
                await You_feel('self-knowledgeable...');
                /* C fountain.c:289-290: display_nhwindow(WIN_MESSAGE, FALSE)
                 * blocks on the message before enlightenment opens its menu.
                 * Use the same message-window flush as the blessed-fountain
                 * arm above; without it the menu replaces the topline and the
                 * recorded page-dismiss keys are consumed by the menu. */
                await _display_nhwindow_message();
                /* C insight.c:383 selects the NHW_MENU form when final is
                 * ENL_GAMEINPROGRESS.  The MAGIC-only window fits as a right
                 * corner overlay; enlightenment() is this port's game-over
                 * text-window renderer and incorrectly clears the map. */
                await enlightenment_menu(MAGICENLIGHTENMENT);
                await exercise(A_WIS, true);
                await pline('The feeling subsides.');
                break;
            case 20: /* C fountain.c:295-299 — Foul water */
                await pline('The water is foul!  You gag and vomit.');
                await morehungry(rn1(20, 11));
                await vomit();
                break;
            case 21: /* C fountain.c:300-311 — Poisonous */
                await pline('The water is contaminated!');
                if (Poison_resistance()) {
                    await pline(`Perhaps it is runoff from the nearby ${fruitname(false)} farm.`);
                    await losehp(rnd(4), 'unrefrigerated sip of juice', KILLED_BY_AN);
                    break;
                }
                {
                    const _strloss = rn1(4, 3);
                    const _pdmg = rnd(10);
                    await losestr(_strloss, 'contaminated water', KILLED_BY);
                    await losehp(_pdmg, 'contaminated water', KILLED_BY);
                }
                await exercise(A_CON, false);
                break;
            case 22: /* C fountain.c:310-312 — Fountain of snakes! */
                await dowatersnakes();
                break;
            case 23: /* C fountain.c:311-313 — Water demon */
                await dowaterdemon();
                break;
            case 24: /* C fountain.c:325-337 — foul water curses inventory */
                await pline('This water\'s no good!');
                await morehungry(rn1(20, 11));
                await exercise(A_CON, false);
                {
                    let buc_changed = false;
                    for (let otmp = g.invent; otmp; otmp = otmp.nobj) {
                        /* C fountain.c:331 — obj->oclass != COIN_CLASS && !obj->cursed
                         * && !rn2(5): already-cursed objects short-circuit
                         * BEFORE the rn2(5) draw. */
                        if ((otmp.oclass | 0) === COIN_CLASS || otmp.cursed
                            || rn2(5))
                            continue;
                        await curse(otmp);
                        buc_changed = true;
                    }
                    if (buc_changed)
                        update_inventory();
                }
                break;
            case 25: /* C fountain.c:338-347 — see invisible */
                {
                    const invp = _uprop(INVIS);
                    const seep = _uprop(SEE_INVIS);
                    const Blind = _potion_Blind();
                    const Invisible = !!(((invp.intrinsic | 0) || (invp.extrinsic | 0))
                                          && !(invp.blocked | 0)
                                          && !((seep.intrinsic | 0) || (seep.extrinsic | 0)));
                    if (Blind) {
                        if (Invisible)
                            await pline('You feel transparent.');
                        else {
                            await pline('You feel very self-conscious.');
                            await pline('Then it passes.');
                        }
                    } else {
                        await You_see('an image of someone stalking you.');
                        await pline('But it disappears.');
                    }
                    seep.intrinsic = (seep.intrinsic | FROMOUTSIDE) >>> 0;
                    newsym(u.ux, u.uy);
                    await exercise(A_WIS, true);
                }
                break;
            case 26: /* C fountain.c:349-353 — See Monsters */
                /* if (monster_detect((struct obj *) 0, 0))
                 *     pline_The("%s tastes like nothing.", hliquid("water")); */
                if (await monster_detect(null, 0))
                    await pline(`The ${hliquid('water')} tastes like nothing.`);
                await exercise(A_WIS, true);
                break;
            case 27: /* C fountain.c:355-361 — find a gem in the sparkling waters */
                /* C: if (!FOUNTAIN_IS_LOOTED(u.ux,u.uy)) { dofindgem(); break; }
                 * else FALLTHROUGH to case 28 (water nymph). */
                {
                    const F_LOOTED = 1;
                    const floc = g.level?.at(u.ux, u.uy);
                    if (!(((floc && floc.flags) | 0) & F_LOOTED)) {
                        await dofindgem();
                        break;
                    }
                }
            /* FALLTHROUGH */
            case 28: /* C fountain.c:362-364 — Water Nymph */
                await dowaternymph();
                break;
            case 29: /* Scare — bad breath, monflee all monsters */
                {
                    /* C fountain.c:368-378 */
                    await pline(`This ${hliquid('water')} gives you bad breath!`);
                    for (let mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
                        if ((mtmp.mhp | 0) >= 1)
                            await monflee(mtmp, 0, false, false);
                    }
                    break;
                }
            case 30: /* C fountain.c:379-381 — gushing forth in this room */
                await dogushforth(true);
                break;
            default:
                await pline(`This tepid ${hliquid('water')} is tasteless.`);
                break;
        }
    }
    /* C fountain.c:389: dryup(u.ux, u.uy, TRUE) */
    await dryup(u.ux, u.uy, true);
}

/* ---------------------------------------------------------------------------
 * _display_nhwindow_message() — C ref: winprocs.c display_nhwindow(WIN_MESSAGE,FALSE).
 * In tty C: triggers more() if topline has content → nhgetch for "--More--".
 * Mirrors the step boundary between pline messages and the next pline.
 * ---------------------------------------------------------------------------
 */
async function _display_nhwindow_message() {
    /* C topl.c:262-274 pages overflowing plines before display_nhwindow
     * acknowledges the final topline (wintty.c:1873-1879). Drain those joins
     * before appending the explicit --More--, which has no pline boundary. */
    /* tty_display_nhwindow -> more() never calls bot(): a status change made
     * since the last pline flush (fountain.c:258-262 restore ability sets
     * disp.botl) stays unpainted on the --More-- frame. */
    const _d = game.disp, _botl = _d?.botl, _botlx = _d?.botlx;
    if (_d) { _d.botl = 0; _d.botlx = 0; }
    try { await flush_screen(1); }
    finally { if (_d) { _d.botl = _botl; _d.botlx = _botlx; } }
    /* wintty.c:1865: WIN_CANCELLED (WIN_STOP) skips the window display. */
    if (game._topl_win_stop || game._topl_win_stop_armed) {
        game._topl_win_stop_armed = false;
        game._topl_win_stop = true;
        return;
    }
    /* If there's a pending message, append --More-- and wait for dismiss. */
    const msg = game._pending_message || '';
    if (msg) {
        /* C topl.c:262-274 pages overflowing plines before wintty.c:1873-1879
         * acknowledges the final message. Preserve those page boundaries. */
        await force_more_pages(msg);
        game._pending_message = '';
        /* topl.c more():232-235 — display_nhwindow raises this page itself, not
         * an owner pline's update_topl, so ESC's WIN_STOP is live at once for
         * every following message. */
        /* topl.c more():232-235 — ESC sets WIN_STOP, so every later pline of
         * this turn is swallowed until the next tty_nhgetch clears it. */
        if (game._topl_win_stop_armed) {
            game._topl_win_stop_armed = false;
            game._topl_win_stop = true;
        }
    }
}

async function dowatersnakes() {
    const g = game, u = g.u;
    let num = rn1(5, 2);

    if (!((g.mvitals?.[PM_WATER_MOCCASIN]?.mvflags | 0) & G_GONE)) {
        if (!_blind()) {
            const what = _potion_Hallucination()
                ? makeplural(rndmonnam()) : 'snakes';
            await pline(`An endless stream of ${what} pours forth!`);
        } else {
            await You_hear('something hissing!');
        }
        while (num-- > 0) {
            const mtmp = await makemon(PM_WATER_MOCCASIN, u.ux, u.uy, MM_NOMSG);
            if (mtmp && t_at(mtmp.mx, mtmp.my))
                await mintrap(mtmp, 0 /* NO_TRAP_FLAGS */);
        }
    } else {
        await pline('The fountain bubbles furiously for a moment, then calms.');
    }
}

async function dowaterdemon() {
    const g = game, u = g.u;

    if (!((g.mvitals?.[PM_WATER_DEMON]?.mvflags | 0) & G_GONE)) {
        const mtmp = await makemon(PM_WATER_DEMON, u.ux, u.uy, MM_NOMSG);
        if (mtmp) {
            if (!_blind())
                await pline(`You unleash ${a_monnam(mtmp)}!`);
            else
                await You_feel('the presence of evil.');

            /* C fountain.c:76-78 — "Give those on low levels a (slightly)
               better chance of survival". */
            if (rnd(100) > (80 + level_difficulty())) {
                // C fountain.c:79-80: announce the wish before removing the demon.
                await pline(`Grateful for ${mhis_mon(mtmp)} release, ${mhe(mtmp)} grants you a wish!`);
                await _mongrantswish(mtmp);
            } else if (t_at(mtmp.mx, mtmp.my)) {
                await mintrap(mtmp, 0 /* NO_TRAP_FLAGS */);
            }
        }
    } else {
        await pline('The fountain bubbles furiously for a moment, then calms.');
    }
}

async function dowaternymph() {
    const g = game, u = g.u;
    let mtmp = null;

    if (!((g.mvitals?.[PM_WATER_NYMPH]?.mvflags | 0) & G_GONE))
        mtmp = await makemon(PM_WATER_NYMPH, u.ux, u.uy, MM_NOMSG);
    if (mtmp) {
        if (!_blind())
            await pline(`You attract ${a_monnam(mtmp)}!`);
        else
            await You_hear('a seductive voice.');
        mtmp.msleeping = 0;
        if (t_at(mtmp.mx, mtmp.my))
            await mintrap(mtmp, 0 /* NO_TRAP_FLAGS */);
    } else if (!_blind()) {
        await pline('A large bubble rises to the surface and pops.');
    } else {
        await You_hear('a loud pop.');
    }
}

/* C fountain.c:118-131 — void dogushforth(int drinking)
 *
 *   int madepool = 0;
 *   do_clear_area(u.ux, u.uy, 7, gush, (genericptr_t) &madepool);
 *   if (!madepool) {
 *       if (drinking) Your("thirst is quenched.");
 *       else pline("Water sprays all over you.");
 *   }
 *
 * `madepool` is C's out-param; JS passes a one-element box so gush() can
 * post-increment it exactly as C does. */
/* gush() is async (water_damage_chain/minliquid await): C's do_clear_area
 * callback runs to completion before the next square, so the walk must await
 * each callback (do_clear_area_async) or later squares' rn2 draws interleave
 * with the first pile's water_damage chain. */
export async function dogushforth(drinking) {
    const madepool = { n: 0 };

    const _was = game._inGushforth;
    game._inGushforth = true;
    try {
        await do_clear_area_async(game.u.ux, game.u.uy, 7, gush, madepool);
    } finally {
        game._inGushforth = _was;
    }
    if (!madepool.n) {
        if (drinking)
            await pline('Your thirst is quenched.');
        else
            await pline('Water sprays all over you.');
    }
}

async function gush(x, y, poolcnt) {
    const u = game.u;

    if (((x + y) % 2) || u_at(x, y)
        || (rn2(1 + distmin(u.ux, u.uy, x, y))) || (lev_typ_at(x, y) !== ROOM)
        || (sobj_at(BOULDER, x, y)) || nexttodoor(x, y))
        return;

    const ttmp = t_at(x, y);
    if (ttmp && !(await delfloortrap(ttmp)))
        return;

    /* C:147-148 `if (!((*(int *) poolcnt)++)) pline(...)` — the message fires on
     * the FIRST pool only, and the counter increments either way.
     * do_clear_area_async() awaits each step so async gush() executes sequentially. */
    if (!(poolcnt.n++))
        await pline('Water gushes forth from the overflowing fountain!');

    /* Put a pool at x, y */
    set_levltyp(x, y, POOL);
    const loc = game.level?.at(x, y);
    if (loc)
        loc.flags = 0;
    /* No kelp! */
    del_engr_at(x, y);
    await water_damage_chain(game.level?.levelObjects?.[x]?.[y] ?? null, true);

    const mtmp = _gush_m_at(x, y);
    if (mtmp)
        await minliquid(mtmp);
    else
        newsym(x, y);
}

/* C rm.h levl[x][y].typ. */
function lev_typ_at(x, y) {
    const loc = game.level?.at(x, y);
    return loc ? loc.typ : 0;
}

export async function dipfountain(obj) {
    const g = game;
    const u = g.u;
    /* C fountain.c:399-402: return before any RNG while levitating. */
    if (_prop_active(LEVITATION)) {
        await floating_above('fountain');
        return;
    }
    /* C fountain.c:410-444: the Excalibur arm.  The rn2() is only drawn when
     * the earlier && terms hold (LONG_SWORD, ulevel >= 5). */
    const LONG_SWORD_OTYP = 54;
    const _knight = (g.flags && g.flags.initrole != null)
        ? (g.flags.initrole | 0) === 4 /* roles[] index of PM_KNIGHT */
        : ((g.urole && g.urole.mnum != null) ? (g.urole.mnum | 0) : -1) === 335 /* PM_KNIGHT */;
    if (obj && obj.otyp === LONG_SWORD_OTYP && u.ulevel >= 5
        && !rn2(_knight ? 6 : 30)
        && obj.quan === 1 && !obj.oartifact
        && !exist_artifact(LONG_SWORD_OTYP, artiname(1 /* ART_EXCALIBUR */))) {
        if (u.ualign.type !== 1 /* A_LAWFUL */) {
            /* Ha!  Trying to cheat her. */
            await pline("A freezing mist rises from the %s and envelopes the sword.",
                  hliquid("water"));
            await pline("The fountain disappears!");
            await curse(obj);
            if (obj.spe > -6 && !rn2(3))
                obj.spe--;
            obj.oerodeproof = false;
            exercise(A_WIS, false);
            livelog_printf(LL_ARTIFACT, 'was denied %s!  The %s has deemed %s unworthy',
                artiname(1 /* ART_EXCALIBUR */), 'Lady of the Lake', g.flags.female ? 'her' : 'him');
        } else {
            /* The lady of the lake acts! - Eric Backus */
            await pline("From the murky depths, a hand reaches up to bless the sword.");
            await pline("As the hand retreats, the fountain disappears!");
            obj = await oname(obj, artiname(1 /* ART_EXCALIBUR */),
                        ONAME_VIA_DIP | ONAME_KNOW_ARTI);
            discover_artifact(1 /* ART_EXCALIBUR */); // C fountain.c:433
            obj.cursed = false;
            obj.blessed = true;
            obj.oeroded = obj.oeroded2 = 0;
            obj.oerodeproof = true;
            exercise(A_WIS, true);
            livelog_printf(LL_ARTIFACT, 'was given %s by the %s',
                artiname(1 /* ART_EXCALIBUR */), 'Lady of the Lake');
        }
        update_inventory();
        set_levltyp(u.ux, u.uy, ROOM);
        const _l = g.level?.at(u.ux, u.uy);
        if (_l) _l.flags = 0;
        newsym(u.ux, u.uy);
        if (in_town(u.ux, u.uy)) /* fountain.c:445 */
            await angry_guards(false);
        return;
    }
    const ER_NOTHING = 0;
    const ER_DESTROYED = 3;
    let er;
    const _is_hands = !!obj && Object.hasOwn(obj, 'hands') && !!obj.hands;
    if (obj && (_is_hands || obj === u.uarmg)) {
        er = await wash_hands();
    } else {
        er = await water_damage(obj, null, true);
    }
    /* C fountain.c:454-456: if destroyed or (not nothing && !rn2(2)) → return */
    if (er === ER_DESTROYED || (er !== ER_NOTHING && !rn2(2))) {
        return;
    }
    /* C fountain.c:458: switch (rnd(30)) */
    const F_LOOTED = 1;
    const loc = g.level?.at(u.ux, u.uy);
    const _r30 = rnd(30);
    switch (_r30) {
        case 16: /* Curse the item */
            if (obj && !_is_hands && obj.oclass !== COIN_CLASS && !obj.cursed) {
                await curse(obj);
            }
            break;
        case 17:
        case 18:
        case 19:
        case 20: /* Uncurse */
            if (obj && !_is_hands && obj.cursed) {
                if (!_potion_Blind())
                    await pline('The %s glows for a moment.', hliquid('water'));
                await uncurse(obj);
            }
            else {
                await pline('A feeling of loss comes over you.');
            }
            break;
        case 21: /* C fountain.c:475-477 — Water Demon */
            await dowaterdemon();
            break;
        case 22: /* C fountain.c:478-480 — water nymph */
            await dowaternymph();
            break;
        case 23: /* C fountain.c:481-483 — an Endless Stream of Snakes */
            await dowatersnakes();
            break;
        case 24: /* C fountain.c:498-503 — find gem */
            if (!(((loc && loc.flags) | 0) & F_LOOTED)) {
                await dofindgem();
                break;
            }
        /* FALLTHROUGH */
        case 25: /* C fountain.c:492-494 — water gushes forth */
            await dogushforth(false);
            break;
        case 26:
            await pline('A strange tingling runs up your %s.', body_part(ARM));
            break;
        case 27:
            await You_feel('a sudden chill.');
            break;
        case 28: /* Bath / lose gold — not ported (TODO) */
            await pline('An urge to take a bath overwhelms you.');
            {
                let money = money_cnt(g.invent) | 0;
                const _goldShownBeforeLoss = money;
                if (money > 10) {
                    /* "Amount to lose.  Might get rounded up as fountains
                     * don't pay change..." */
                    money = Math.trunc(somegold(money) / 10);
                    for (let otmp = g.invent, nextobj; otmp && money > 0;
                         otmp = nextobj) {
                        nextobj = otmp.nobj;
                        if ((otmp.oclass | 0) === COIN_CLASS) {
                            /* objects.h:1512 COIN("gold piece", 1000, GOLD, 1,
                             * GOLD_PIECE) — worth (oc_cost) is 1, and gold is
                             * the only coin in the game. */
                            const denomination = 1;
                            let coin_loss = Math.trunc(
                                (money + denomination - 1) / denomination);
                            coin_loss = Math.min(coin_loss, otmp.quan | 0);
                            otmp.quan = (otmp.quan | 0) - coin_loss;
                            money -= coin_loss * denomination;
                            if (!otmp.quan)
                                await delobj(otmp); /* UNPORTED-CALLEE, C's own call */
                        }
                    }
                    g._botlGoldStale = _goldShownBeforeLoss;
                    await pline('You lost some of your gold in the fountain!');
                    if (loc)
                        loc.flags &= ~F_LOOTED; /* CLEAR_FOUNTAIN_LOOTED */
                    await exercise(A_WIS, false);
                }
            }
            break;
        case 29: /* See coins — not ported (TODO) */
            if (loc && (loc.flags & F_LOOTED))
                break;
            if (loc)
                loc.flags |= F_LOOTED;
            /* C fountain.c:526-535: mkgold(rnd((dunlevs_in_dungeon - dunlev + 1) * 2) + 5) */
            await mkgold(rnd(((g.dungeons?.[u.uz?.dnum | 0]?.num_dunlevs | 0)
                              - (u.uz?.dlevel | 0) + 1) * 2) + 5, u.ux, u.uy);
            if (!_potion_Blind())
                await pline(`Far below you, you see coins glistening in the ${hliquid('water')}.`);
            await exercise(A_WIS, true);
            if (loc)
                newsym(u.ux, u.uy);
            break;
        default:
            if (er === ER_NOTHING)
                await pline('Nothing seems to happen.');
            break;
    }
    /* C fountain.c:552: update_inventory() */
    update_inventory();
    /* C fountain.c:553: dryup(u.ux, u.uy, TRUE) */
    await dryup(u.ux, u.uy, true);
}

/* C fountain.c:581-593 — convert a sink into a fountain. */
export async function breaksink(x, y) {
    const loc = game.level?.at(x, y);
    if (cansee(x, y) || u_at(x, y))
        await pline('The pipes break!  Water spurts out!');
    set_levltyp(x, y, FOUNTAIN);
    if (loc) {
        loc.flags = 1; /* SET_FOUNTAIN_LOOTED */
        loc.blessedftn = 0;
    }
    newsym(x, y);
}

function _blind() { return _prop_active(BLINDED); }

function _fire_resistance() { return _prop_active(FIRE_RES); }

export async function drinksink() {
    const g = game;
    const u = g.u;
    /* C fountain.c:601-604 */
    if (_prop_active(LEVITATION)) {
        await floating_above('sink');
        return;
    }
    switch (rn2(20)) {
    case 0:
        /* C:606 */
        await pline(`You take a sip of very cold ${hliquid('water')}.`);
        break;
    case 1:
        /* C:609 */
        await pline(`You take a sip of very warm ${hliquid('water')}.`);
        break;
    case 2:
        /* C:612-621 */
        await pline(`You take a sip of scalding hot ${hliquid('water')}.`);
        if (_fire_resistance()) {
            await pline('It seems quite tasty.');
            monstseesu(M_SEEN_FIRE);
        } else {
            /* boiling water burns considered fire damage */
            await losehp(rnd(6), 'sipping boiling water', KILLED_BY);
            monstunseesu(M_SEEN_FIRE);
        }
        break;
    case 3:
        /* C:623-632 */
        if ((g.mvitals?.[PM_SEWER_RAT]?.mvflags | 0) & G_GONE) {
            await pline('The sink seems quite dirty.');
        } else {
            const mtmp = await makemon(PM_SEWER_RAT, u.ux, u.uy, MM_NOMSG);
            if (mtmp)
                await pline(`Eek!  There's ${(_blind() || !canspotmon(mtmp))
                    ? 'something squirmy' : a_monnam(mtmp)} in the sink!`);
        }
        break;
    case 4: {
        /* C:634-649 — pull potions until one is not water, then quaff it. */
        let otmp;
        for (;;) {
            otmp = (await mkobj(POTION_CLASS, false));
            if (otmp.otyp !== POT_WATER)
                break;
            /* reject water and try again */
            await obfree(otmp, null);
        }
        otmp.cursed = otmp.blessed = 0;
        await pline(`Some ${_blind() ? 'odd'
            : hcolor(getObjDescr(otmp.otyp))} liquid flows from the faucet.`);
        if (!(_blind() || _hallucination()))
            observe_object(otmp);
        otmp.quan = (otmp.quan | 0) + 1; /* Avoid panic upon useup() */
        otmp.fromsink = 1;               /* kludge for docall() */
        await dopotion_unported(otmp);
        await obfree(otmp, null);
        break;
    }
    case 5: {
        /* C:651-660 */
        const loc = g.level.at(u.ux, u.uy);
        if (!((loc.looted | 0) & S_LRING)) {
            await pline('You find a ring in the sink!');
            await mkobj_at(RING_CLASS, u.ux, u.uy, true);
            loc.looted = (loc.looted | 0) | S_LRING;
            exercise(A_WIS, true);
            newsym(u.ux, u.uy);
        } else {
            await pline(`Some dirty ${hliquid('water')} backs up in the drain.`);
        }
        break;
    }
    case 6:
        /* C:662 */
        await breaksink(u.ux, u.uy);
        break;
    case 7:
        /* C:664-668 */
        await pline(`The ${hliquid('water')} moves as though of its own will!`);
        if (((g.mvitals?.[PM_WATER_ELEMENTAL]?.mvflags | 0) & G_GONE)
            || !(await makemon(PM_WATER_ELEMENTAL, u.ux, u.uy, MM_NOMSG)))
            await pline('But it quiets down.');
        break;
    case 8:
        /* C:670-673 */
        await pline(`Yuk, this ${hliquid('water')} tastes awful.`);
        more_experienced(1, 0);
        await newexplevel();
        break;
    case 9:
        /* C:675-678 */
        await pline('Gaggg... this tastes like sewage!  You vomit.');
        await morehungry(rn1(30 - acurr(u, A_CON), 11));
        await vomit();
        break;
    case 10:
        /* C:680-685 */
        await pline(`This ${hliquid('water')} contains toxic wastes!`);
        if (!_unchanging()) {
            await pline('You undergo a freakish metamorphosis!');
            await polyself(POLY_NOFLAGS);
        }
        break;
    /* more odd messages --JJB */
    case 11:
        /* C:688-690 — Soundeffect() is not a scored channel. */
        await You_hear('clanking from the pipes...');
        break;
    case 12:
        /* C:692-694 */
        await You_hear('snatches of song from among the sewers...');
        break;
    case 13:
        /* C:696-698 */
        await pline('Ew, what a stench!');
        create_gas_cloud(u.ux, u.uy, 1, 4);
        break;
    case 19:
        /* C:700-704 */
        if (_hallucination()) {
            await pline('From the murky drain, a hand reaches up... --oops--');
            break;
        }
        /* FALLTHROUGH — C:705-706 */
    default:
        /* C:708-711 */
        await pline(`You take a sip of ${rn2(3) ? (rn2(2) ? 'cold' : 'warm') : 'hot'
            } ${hliquid('water')}.`);
    }
}

/* C fountain.c:800-822 sink_backs_up(x, y) — "Flupp! Muddy waste pops up from
 * the drain", then a once-per-sink ring (mkobj_at) if the sink is unlooted. */
export async function sink_backs_up(x, y) {
    const g = game;
    const Blind = _potion_Blind();
    let buf;
    if (!Blind) buf = 'Muddy waste pops up from the drain';
    else if (!_potion_Deaf()) buf = 'You hear a sloshing sound';
    else buf = `Something splashes you in the ${body_part(FACE)}`;
    await pline(`${!_potion_Deaf() ? 'Flupp!  ' : ''}${buf}.`);

    const loc = g.level.at(x, y);
    if (!((loc.looted | 0) & S_LRING)) { /* once per sink */
        if (!Blind) await You_see('a ring shining in its midst.');
        await mkobj_at(RING_CLASS, x, y, true);
        newsym(x, y);
        exercise(A_DEX, true);
        exercise(A_WIS, true); /* a discovery! */
        loc.looted = (loc.looted | 0) | S_LRING;
    }
}

/* C fountain.c:558-577 — wash bare hands or worn gloves before dipping. */
export async function wash_hands() {
    const hands = makeplural_objnam(body_part(HAND));
    let res = ER_NOTHING;
    const was_glib = !!(game.u.uprops[GLIB].intrinsic);
    await pline('You wash your %s%s in the %s.', game.u.uarmg ? 'gloved ' : '',
                hands, hliquid('water'));
    if (game.u.uprops[GLIB].intrinsic) {
        make_glib(0);
        await pline('Your %s are no longer slippery.', fingers_or_gloves(true));
    }
    if (game.u.uarmg)
        res = await water_damage(game.u.uarmg, null, true);
    if (was_glib && res === ER_NOTHING)
        res = ER_GREASED;
    return res;
}

/* C fountain.c:722-799 dipsink(obj) — #dip while standing on a sink. */
export async function dipsink(obj) {
    const g = game;
    const u = g.u;
    const loc = g.level?.at(u.ux, u.uy);
    let try_call = false;
    const not_looted_yet = !((loc?.looted | 0) & S_LRING);
    const is_hands = !!obj && ((Object.hasOwn(obj, 'hands') && !!obj.hands) || obj === u.uarmg);

    if (!rn2(not_looted_yet ? 25 : 15)) {
        await breaksink(u.ux, u.uy);
        if (_prop_active(GLIB) && is_hands)
            await pline(`Your ${fingers_or_gloves(true)} are still slippery.`);
        return;
    } else if (is_hands) {
        await wash_hands();
        return;
    } else if ((obj.oclass | 0) !== 8 /* POTION_CLASS */) {
        await pline(`You hold ${await the(await xname(obj))} under the tap.`);
        if ((await water_damage(obj, null, true)) === 0 /* ER_NOTHING */)
            await pline(nothing_seems_to_happen);
        return;
    }
    await pline(`You pour ${(obj.quan | 0) > 1 ? 'one of ' : ''}${await the(await xname(obj))} down the drain.`);
    switch (obj.otyp | 0) {
    case POT_POLYMORPH:
        await polymorph_sink();
        try_call = true;
        break;
    case POT_OIL:
        if (!_potion_Blind()) {
            await pline('It leaves an oily film on the basin.');
            try_call = true;
        } else await pline(nothing_seems_to_happen);
        break;
    case POT_ACID:
        try_call = true;
        if (!_potion_Blind()) await pline('The drain seems less clogged.');
        else if (!_potion_Deaf()) await You_hear('a sucking sound.');
        else { await pline(nothing_seems_to_happen); try_call = false; }
        break;
    case POT_LEVITATION:
        await sink_backs_up(u.ux, u.uy);
        try_call = true;
        break;
    case POT_OBJECT_DETECTION:
        if (not_looted_yet) {
            await pline('You sense a ring lost down the drain.');
            try_call = true;
            break;
        }
        /* FALLTHRU */
    case POT_GAIN_LEVEL: case POT_GAIN_ENERGY: case POT_MONSTER_DETECTION:
    case POT_FRUIT_JUICE: case POT_WATER:
        await pline(nothing_seems_to_happen);
        break;
    default:
        await pline('A wisp of vapor rises up...');
        if (!breathless(g.youmonst.data) || haseyes(g.youmonst.data))
            await potionbreathe(obj);
        break;
    }
    if (try_call && obj.dknown) await trycall_cmd(obj);
    await useup(obj);
}
