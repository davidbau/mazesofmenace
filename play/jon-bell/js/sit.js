// @ts-nocheck
/* js/sit.js — Throne sit effects.
 * C ref: nethack-c/src/sit.c:38  throne_sit_effect()
 *        nethack-c/src/sit.c:394 dosit()
 *
 * W(cadence-1): port throne_sit_effect() with bit-exact RNG ordering.
 * RNG call sequence (up to 16 calls, path-dependent):
 *   1.  rnd(6)              — outer branch: >4 means effect fires
 *   2.  rnd(13)             — which of 13 effects (only if outer fires)
 *  Effect-specific RNG (only one branch fires per call):
 *   case 1: rn2(A_MAX=6), rn1(4,3), rnd(10)   — 3 calls
 *   case 2: rn2(A_MAX=6)                        — 1 call
 *   case 3: rnd(6) or rnd(30)                   — 1 call (Shock_resistance)
 *          + exercise(A_CON,FALSE) rn2(2)       — 1 call (unless abs(AEXE)>=AVAL)
 *   case 6: rn2(5)                              — 1 call (luck branch only)
 *   case 7: rnd(10), [rn2(60)+rn2(3*difficulty)] per monster  — ≥2 calls
 *   case 9: rn1(100,250), optionally rnd(2)     — 1–2 calls (Luck>0)
 *  case 10: rnd(30)  (nommap+Luck<0 path)       — 1 call
 *  case 12: rn2(5)                              — 1 call
 *  case 13: rn1(7,16)                           — 1 call
 *   special_throne (Vlad's tower cases):
 *   case 6:  rn1(101,100)                       — 1 call
 *  case 12: rnd(16) or rnd(80)                  — 1 call
 *  case 13: rn2(5) × A_MAX                      — 6 calls
 *   Removal check: rn2(3)                       — 1 call (if !special_throne)
 *
 * @ts-nocheck — js sibling imports; ambient game types not declared.
 */
import { game, wizard } from './gstate.js';
import { Blind } from './vision.js';
import { EYE, HEAD, FROMOUTSIDE } from './const.js';
import { PM_CYCLOPS, PM_FLOATING_EYE } from './pm.generated.js';
import { body_part } from './cmd.js';
import { vtense } from './objnam.js';
import { PM_NINJA } from './pm.generated.js';
import { block_point, unblock_point, cansee } from './vision.js';
import { rn2, rnd, rn1 } from './rng.js';
import { In_V_tower, NON_PM, MAGIC_PORTAL, EMIN, CONFUSION, HALLUC, HALLUC_RES, ACID_RES, SHOCK_RES, DRAIN_RES, BLINDED, SEE_INVIS as SEE_INVIS_PROP, TELEPAT as TELEPAT_PROP, TIMEOUT, MM_ANGRY, MM_EMIN, MM_NOMSG, G_GONE, G_GENOD, LOW_PM, G_EXTINCT, NO_MINVENT, A_NONE, A_CON } from './const.js';
import { PM_WATER_DEMON, PM_AIR_ELEMENTAL, PM_WATER_ELEMENTAL, PM_FOG_CLOUD, PM_ICE_VORTEX, PM_FREEZING_SPHERE, PM_STEAM_VORTEX, PM_ENERGY_VORTEX, PM_SHOCKING_SPHERE, PM_EARTH_ELEMENTAL, PM_DUST_VORTEX, PM_FIRE_ELEMENTAL, PM_FIRE_VORTEX, PM_FLAMING_SPHERE, PM_YELLOW_LIGHT, NUMMONS, PM_ARCHON, PM_ANGEL, PM_BONE_DEVIL, PM_JUIBLEX, PM_YEENOGHU, PM_ORCUS, PM_DEMOGORGON, PM_WIZARD_OF_YENDOR, PM_SKELETON, PM_SAMURAI, PM_HIGH_PRIEST } from './pm.generated.js';

function _hero_resists(prop) {
    const p = game.u?.uprops?.[prop];
    return !!((p?.intrinsic | 0) || (p?.extrinsic | 0));
}
/* make_confused's C home is potion.c:88; the file-local copy below it replaced
 * was an empty body, so neither throne arm could confuse the hero. */
import { make_confused, make_glib, make_sick } from './potion.js';
import { mkclass, mkclassAligned, newmextra, name_to_mon, name_to_monclass, permonstTemplate, is_ndemon, monPmname } from './makemon.js';
import { pline, canseemon, canspotmon, map_background, newsym, newsym_force, see_monsters, force_more, livelog_printf, Deaf, urgent_pline } from './display.js';
import { LL_CONDUCT, LL_GENOCIDE, UNCHANGING, POLY_REVERT } from './const.js';
import { PM_VAMPIRE, PM_VAMPIRE_LORD as PM_VAMPIRE_LEADER, PM_VLAD_THE_IMPALER } from './pm.generated.js';
import { identify_pack, do_mapping } from './read.js';
/* rndcurse()'s leaves, each from the file that holds its one real body.  The
 * aliases exist because this file already carries same-named LOCAL stubs
 * (`function You(_msg) {}` at :581 and `export function Tobjnam()` returning the
 * literal "It" at :580) that throne_sit_effect() still depends on; repointing
 * those is a separate, wider change, so rndcurse names the real ones explicitly
 * rather than quietly inheriting the stubs. */
/* C sit.c:582 uses You()->pline immediately; the deferred eat.js You()
 * leaves the aura in _resultMessage and paints it on a later frame. */
import { You as You_rc } from './do_wear.js';
import { Tobjnam as Tobjnam_rc, Yobjnam2, makeplural, quest_info, an } from './objnam.js';
import { curse, unbless } from './mkobj.js';
import { spec_ability, adjattrib, change_luck, exercise } from './attrib.js';
import { hcolor, Amonnam } from './mhitm.js';
import { update_inventory } from './mhitm.js';
import { which_armor } from './makemon.js';
import { shieldeff as shieldeff_rc, aggravate, Monnam } from './mcastu.js';
import { show_transient_light, transient_light_cleanup } from './light.js';
/* tele's C home is teleport.c:840. */
import { tele } from './teleport.js';
/* makewish's C home is wizcmds.c:38; the throne sources are sit.c:110/251. */
import { makewish } from './wizcmds.js';
import { getlin } from './wizcmds.js';
import { rndmonst } from './makemon.js';
import { adjalign as adjalign_sit } from './attrib.js';
import { verbalize, list_genocided } from './cmd.js';
import { DEAF } from './const.js';
/* makemon's C home is makemon.c:1338; the real port lives in js/mklev.js
 * (NOT js/makemon.js — that file only has makemonDomesticSaddle). */
import { makemon, courtmon as courtmon_real, kill_genocided_monsters, upstart, mongone } from './mklev.js';
import { heal_legs as heal_legs_real, y_n_default } from './cmd.js';
/* polyself's C home is polyself.c:1306. */
import { polyself } from './polyself.js';
/* seffects's C home is read.c:2166. */
import { seffects } from './read.js';
/* Your — C pline.c:380 Your(const char *, ...), identical to You() with the
 * "Your " prefix.  js/do_wear.js's copy is the one that shares pline's own
 * _plineVFmt formatter instead of re-deriving one; js/shk.js's is NOT
 * exported and is arity-broken (`function Your(_fmt, _a)` takes only ONE
 * variadic arg); js/read.js's and js/cmd.js's are file-local, not exported.
 * do_wear.js's is the real, general-purpose, exported one. */
import { Your, You } from './do_wear.js';
import { W_SADDLE } from './const.js';
/* make_blinded's C home is potion.c:267.  js/mhitu.js also carries a
 * same-named `export function make_blinded(_dur, _vis) { }`, verified NOT
 * real by reading it (empty body) — js/zap.js's is the one real, sync body. */
import { make_blinded } from './zap.js';
/* losehp's C home is hack.c:4219.  js/potion.js used to carry a throwing
 * local stub for it too, since fixed to import this same body. */
import { losehp, delobj } from './dokick.js';
/* exper.c:212 losexp() — use the canonical experience-drain implementation
 * for the throne's permanent-drain arm. */
import { losexp as losexp_real } from './exper.js';
/* schedule_goto's C home is do.c:2076.  js/cmd.js owns file js/cmd.js but its
 * export is fine to import (only editing js/cmd.js is off limits here). */
import { schedule_goto } from './cmd.js';
import { remove_worn_item } from './steal.js';
import { done, delayed_killer } from './end.js';
import { GENOCIDED, POLYMORPH } from './const.js';
import { ROOM } from './const.js';
import { rehumanize, udeadinside } from './polyself.js';
import monsPack from './makemon_mons.json' with { type: 'json' };
/* ---------------------------------------------------------------------------
 * A_MAX — total number of base attributes (C: attrib.h A_MAX = 6)
 * ---------------------------------------------------------------------------
 */
const A_MAX = 6;
/* ---------------------------------------------------------------------------
 * KILLED_BY_AN / KILLED_BY — death cause flags (C: hack.h)
 * ---------------------------------------------------------------------------
 */
const KILLED_BY_AN = 0;
const KILLED_BY = 1;
/* ---------------------------------------------------------------------------
 * Stub helpers — side-effects not yet ported; no RNG inside these stubs
 * unless explicitly noted.  All side-effect helpers here are zero-RNG shims;
 * every RNG call is performed inline in throne_sit_effect() to preserve order.
 * ---------------------------------------------------------------------------
 */
/* adjattrib: LOCAL EMPTY STUB DELETED — re-pointed to js/attrib.js's real,
 * sync body (attrib.c:117 adjattrib()). */
/* losehp: LOCAL EMPTY STUB DELETED — see import above. */
/* C sit.c:14-35 take_gold() — remove every coin object from inventory. */
export async function take_gold() {
    let lost_money = false;
    for (let obj = game.invent; obj;) {
        const next = obj.nobj || null;
        if ((obj.oclass | 0) === 12 /* COIN_CLASS */) {
            lost_money = true;
            await remove_worn_item(obj, false); /* C sit.c:23 */
            await delobj(obj);                  /* C sit.c:24 (obj_resists draw, invent.c:1446) */
        }
        obj = next;
    }
    if (lost_money) {
        You('notice you have no gold!');
        SET_BOTL();
    } else {
        You_feel('a strange sensation.');
    }
}
/* change_luck: LOCAL EMPTY STUB DELETED — re-pointed to js/attrib.js's real,
 * sync body (attrib.c:410 change_luck()).  js/mhitm.js also carries a
 * same-named `export function change_luck(_n) { }`, but THAT one is also an
 * empty stub — verified by reading it, not by filename. */
/* makewish: LOCAL EMPTY STUB DELETED — see import above. */
/* makemon: LOCAL EMPTY STUB DELETED — see import above. */

/* C read.c:2638 do_class_genocide().  Reached from seffect_genocide when the
 * scroll is blessed (read.c:1735); js/read.js must call this (out of file).
 * Includes conduct logging and polymorphed self-genocide (read.c:2674-2816). */
export async function do_class_genocide() {
    const G_GENO = 0x20, G_NOCORPSE = 0x10, G_UNIQ = 0x1000;
    const MS_LEADER = 36, MS_NEMESIS = 37, MS_GUARDIAN = 38;
    const mvitals = (game.mvitals ||= []);
    const vit = (i) => (mvitals[i] ||= { born: 0, died: 0, mvflags: 0 });
    const roleM = game.urole?.mnum | 0, raceM = game.urace?.mnum | 0;
    let gameover = false;
    let feel_dead = 0, ll_done = 0;
    for (let j = 0; ; j++) {
        if (j >= 5) {
            await pline("That's enough tries!");
            return;
        }
        let prompt = 'What class of monsters do you want to genocide?';
        if (j > 0)
            prompt += game.iflags?.cmdassist === false
                ? " [enter '?' to see previous genocides]"
                : " [enter the symbol or name representing a class, or '?']";
        let buf = String(await getlin(prompt));
        buf = buf.replace(/\s+/g, ' ').trim();
        if (!buf) {
            await pline('%s.', (j + 1 < 5)
                ? 'Type letter (or punctuation) or name used for a class of monsters or \'none\''
                : 'No class of monsters specified');
            continue;
        }
        if (buf[0] === '\x1b' || /^(?:none|'none'|nothing)$/i.test(buf)) {
            livelog_printf(LL_GENOCIDE, 'declined to perform class genocide');
            return;
        }
        /* C read.c:2678-2682: "?" runs #genocided, then re-prompts */
        if (buf === '?' || buf === "'?'") {
            await list_genocided(0x67 /* 'g' */, false);
            --j; /* don't count this iteration as one of the tries */
            continue;
        }
        let cls = name_to_monclass(buf, null);
        cls = (cls && typeof cls === 'object') ? (cls.mclass ?? cls.class ?? 0) : (cls | 0);
        let i;
        if (cls === 0 && (i = name_to_mon(buf, -1)?.mntmp ?? NON_PM) !== NON_PM)
            cls = permonstTemplate(i).mlet;
        let immunecnt = 0, gonecnt = 0, goodcnt = 0;
        for (i = LOW_PM; i < NUMMONS; i++) {
            const t = permonstTemplate(i);
            if (t.mlet === cls) {
                if (!(t.geno & G_GENO)) immunecnt++;
                else if (vit(i).mvflags & G_GENOD) gonecnt++;
                else goodcnt++;
            }
        }
        if (!goodcnt && cls !== permonstTemplate(roleM)?.mlet
            && cls !== permonstTemplate(raceM)?.mlet) {
            if (gonecnt) await pline('All such monsters are already nonexistent.');
            else if (immunecnt || cls === 35 /* S_invisible */)
                await You("aren't permitted to genocide such monsters.");
            else if (wizard() && buf[0] === '*') {
                /* C read.c:2706-2717 */
                let n = 0;
                for (let mtmp = game.fmon, nx; mtmp; mtmp = nx) {
                    nx = mtmp.nmon;
                    if ((mtmp.mhp | 0) < 1) continue;
                    await mongone(mtmp);
                    n++;
                }
                await pline('Eliminated %d monster%s.', n, n === 1 ? '' : 's');
                return;
            } else
                await pline('That %s does not represent any monster.',
                    buf.length === 1 ? 'symbol' : 'response');
            continue;
        }
        for (i = LOW_PM; i < NUMMONS; i++) {
            const t = permonstTemplate(i);
            if (t.mlet !== cls) continue;
            const nam = makeplural(t.pmnames[2]);
            if (i === roleM || i === raceM
                || ((t.geno & G_GENO) && !(vit(i).mvflags & G_GENOD))) {
                if (!ll_done++) {
                    const sym = '?abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@ \'&;:~]'[cls];
                    const prior = Object.entries(mvitals).some(([n, v]) => n >= LOW_PM && n < NUMMONS && (v?.mvflags & G_GENOD));
                    if (!prior) livelog_printf(LL_CONDUCT | LL_GENOCIDE, 'performed %s first genocide (class %c)', game.flags?.female ? 'her' : 'his', sym);
                    else livelog_printf(LL_GENOCIDE, 'genocided class %c', sym);
                }
                vit(i).mvflags |= (G_GENOD | G_NOCORPSE);
                await kill_genocided_monsters();
                update_inventory();
                await pline('Wiped out all %s.', nam);
                const hero = game.youmonst;
                if (Upolyd(game.u) && [PM_VAMPIRE, PM_VAMPIRE_LEADER, PM_VLAD_THE_IMPALER].includes(hero?.cham)
                    && hero.data.mlet !== 48 && (i === game.u.umonnum || i === hero.cham))
                    await polyself(POLY_REVERT);
                if (Upolyd(game.u) && i === game.u.umonnum) {
                    game.u.mh = -1;
                    if (_hero_resists(UNCHANGING)) {
                        if (!feel_dead++) await urgent_pline('You die.');
                        gameover = true;
                    } else await rehumanize();
                }
                if (i === roleM || i === raceM) {
                    game.u.uhp = -1;
                    if (Upolyd(game.u)) {
                        if (!feel_dead++) await pline('You feel %s inside.', udeadinside());
                    } else {
                        if (!feel_dead++) await urgent_pline('You die.');
                        gameover = true;
                    }
                }
            } else if (vit(i).mvflags & G_GENOD) {
                if (!gameover) await pline('%s are already nonexistent.', upstart(nam));
            } else if (!gameover) {
                const snd = t.msound;
                if ((snd !== MS_LEADER || quest_info(MS_LEADER) === i)
                    && (snd !== MS_NEMESIS || quest_info(MS_NEMESIS) === i)
                    && (snd !== MS_GUARDIAN || quest_info(MS_GUARDIAN) === i)
                    && (i !== PM_NINJA || game.urole?.mnum === PM_SAMURAI)) {
                    const named = !!(t.mflags2 & 0x00080000); /* M2_PNAME */
                    const uniq = !!(t.geno & G_UNIQ) && i !== PM_HIGH_PRIEST;
                    await You("aren't permitted to genocide %s%s.",
                        (uniq && !named) ? 'the ' : '',
                        (uniq || named) ? t.pmnames[2] : nam);
                }
            }
        }
        if (gameover || game.u.uhp === -1) {
            game.__bridge__ ||= {};
            game.__bridge__['killer.name'] = 'scroll of genocide';
            const killer = (game.svk ||= {}).killer ||= { id: 0, format: 0, name: '', next: null };
            killer.format = KILLED_BY_AN;
            killer.name = 'scroll of genocide';
            if (gameover) await done(GENOCIDED);
        }
        return;
    }
}

/* C read.c:2826 do_genocide().  The class menu is a separate C helper; this
 * covers the ordinary type-selection path used by scrolls and thrones. */
export async function do_genocide(flags = 1) {
    const really = (flags & 1) !== 0;
    const onThrone = (flags & 4) !== 0;
    // C read.c:2838-2843: confused reading selects the base hero type
    // directly, even while polymorphed, without asking for a monster name.
    let selected = (flags & 2) ? game.u.umonster : null;
    let killPlayer0 = (flags & 2) !== 0;
    for (let i = 0; selected === null; i++) {
        if (i >= 5) {
            /* cursed effect => no free pass (unless rndmonst() fails) */
            if (!really) {
                const r = rndmonst();
                if (r != null) { selected = r; break; }
            }
            await pline("That's enough tries!");
            return false;
        }
        let prompt = 'What type of monster do you want to genocide?';
        if (i > 0)
            prompt += ` [enter ${game.iflags?.cmdassist === false
                ? "'?' to see previous genocides"
                : "the name of a type of monster, or '?'"}]`;
        const buf = String(await getlin(prompt)).replace(/\s+/g, ' ').trim();
        if (!buf) {
            await pline('%s.', (i + 1 < 5)
                ? "Type the name of a type of monster or 'none'"
                : 'No type of monster specified');
            continue;
        }
        if (buf[0] === '\x1b' || /^(?:none|'none'|nothing)$/i.test(buf)) {
            if (!really) {
                const r = rndmonst();
                if (r != null) { selected = r; break; }
            }
            livelog_printf(LL_GENOCIDE, 'declined to perform genocide');
            return false;
        }
        if (buf === '?' || buf === "'?'") {
            await list_genocided(0x67 /* 'g' */, false);
            --i;
            continue;
        }
        const result = name_to_mon(buf, -1);
        const mndx = result?.mntmp ?? NON_PM;
        const vital0 = mndx >= LOW_PM && mndx < NUMMONS ? (game.mvitals ||= [])[mndx] : null;
        if (mndx < LOW_PM || mndx >= NUMMONS || (vital0 && (vital0.mvflags & G_GENOD))) {
            await pline('Such creatures %s exist in this world.',
                (mndx < LOW_PM || mndx >= NUMMONS) ? 'do not' : 'no longer');
            continue;
        }
        const ptr0 = permonstTemplate(mndx);
        // C read.c:2897-2900: revert a vampire's shifted form first.
        const hero = game.youmonst;
        if (Upolyd(game.u) && [PM_VAMPIRE, PM_VAMPIRE_LEADER, PM_VLAD_THE_IMPALER].includes(hero?.cham)
            && hero?.data?.mlet !== 48 /* S_VAMPIRE */
            && (mndx === game.u.umonnum || mndx === hero.cham))
            await polyself(POLY_REVERT);
        if (mndx === (game.urole?.mnum | 0) || mndx === (game.urace?.mnum | 0)) {
            killPlayer0 = true;
            selected = mndx;
            break;
        }
        const aln = Math.sign(game.u?.ualign?.type | 0);
        if ((ptr0.mflags2 & 0x8) !== 0) adjalign_sit(-aln);
        if ((ptr0.mflags2 & 0x100) !== 0) adjalign_sit(aln);
        if (!(ptr0.geno & 0x20)) {
            if (!Deaf()) {
                if (game.flags?.verbose !== false)
                    await pline('A thunderous voice booms through the caverns:');
                await verbalize('No, mortal!  That will not be done.');
            }
            continue;
        }
        if (_hero_resists(UNCHANGING) && mndx === game.u.umonnum) killPlayer0 = true;
        selected = mndx;
        break;
    }

    const data = permonstTemplate(selected);
    if (!really) {
        /* C read.c:2985-3004 — cursed scroll: no genocide, create monsters */
        let cnt = 0;
        const census0 = monster_census(false);
        const v0 = (game.mvitals ||= [])[selected] ||= { born: 0, died: 0, mvflags: 0 };
        if (!(data.geno & 0x1000) && !(v0.mvflags & (G_GENOD | G_EXTINCT))) {
            for (let n = rn1(3, 4); n > 0; n--) {
                if (!await makemon(selected, game.u.ux | 0, game.u.uy | 0, NO_MINVENT | MM_NOMSG))
                    break;
                ++cnt;
                if (v0.mvflags & G_EXTINCT) break;
            }
        }
        if (cnt) {
            cnt = monster_census(false) - census0;
            let nm = data.pmnames[2];
            if ((game.u?.uprops?.[HALLUC]?.intrinsic | 0) && !_hero_resists(HALLUC_RES)) {
                const roleName = game.urole.name;
                nm = Upolyd(game.u) ? monPmname(game.u.umonnum, game.flags?.female ? 1 : 0)
                    : ((game.flags?.female && roleName.f) || roleName.m).replace(/^./, c => c.toLowerCase());
            }
            await pline('Sent in %s%s.', (cnt > 1) ? 'some ' : '',
                (cnt > 1) ? makeplural(nm) : an(nm));
        } else {
            await pline('Nothing happens.');
        }
        return true;
    }
    /* C permits genocide of the player's role or race, and of the current
     * polymorph form; Unchanging makes genocide of that form fatal. */
    const current = game.youmonst?.data?.pmidx ?? game.u?.umonnum;
    const killPlayer = killPlayer0;
    // C read.c:2955-2961: count existing genocides before setting G_GENOD.
    if (!Object.entries(game.mvitals || {}).some(([i, v]) => i >= LOW_PM && i < NUMMONS && (v?.mvflags | 0) & G_GENOD))
        livelog_printf(LL_CONDUCT | LL_GENOCIDE, 'performed %s first genocide (%s)',
            game.flags?.female ? 'her' : 'his', makeplural(data.pmnames[2]));
    else
        livelog_printf(LL_GENOCIDE, 'genocided %s', makeplural(data.pmnames[2]));
    const vital = game.mvitals[selected] ||= { born: 0, died: 0, mvflags: 0 };
    vital.mvflags |= G_GENOD | 0x10; /* G_NOCORPSE */
    /* C read.c:2936-2966: which/buf selection, then makeplural unless the
     * prefix starts with 'a' ("all "). */
    let which = 'all ';
    let buf;
    if ((game.u?.uprops?.[HALLUC]?.intrinsic | 0) && !_hero_resists(HALLUC_RES)) {
        if (Upolyd(game.u)) {
            buf = monPmname(game.u.umonnum, game.flags?.female ? 1 : 0);
        } else {
            const nm = game.urole?.name;
            buf = (game.flags?.female && nm?.f) ? nm.f : nm?.m;
            buf = buf ? buf.charAt(0).toLowerCase() + buf.slice(1) : buf;
        }
    } else {
        buf = data?.pmnames?.[2] || 'such monsters';
        if ((data.geno & 0x1000) && selected !== PM_HIGH_PRIEST)
            which = !((data.mflags2 >>> 0) & 0x00080000) ? 'the ' : '';
    }
    await pline('Wiped out %s%s.', which, (which.charAt(0) !== 'a') ? buf : makeplural(buf));
    // C read.c:2967-2995: resolve hero death before monster/inventory cleanup.
    if (killPlayer) {
        game.u.uhp = -1;
        game.svk ||= {};
        const killer = game.svk.killer ||= { id: 0, format: 0, name: '', next: null };
        killer.format = (flags & 2) ? KILLED_BY : KILLED_BY_AN;
        killer.name = (flags & 2) ? 'genocidal confusion'
            : onThrone ? 'imperious order' : 'scroll of genocide';
        if (Upolyd(game.u) && selected !== current) {
            delayed_killer(POLYMORPH, killer.format, killer.name);
            await pline('You feel %s inside.', udeadinside());
        } else {
            await done(GENOCIDED);
        }
    } else if (selected === current) {
        await rehumanize();
    }
    await kill_genocided_monsters();
    update_inventory();
    return true;
}
/* make_blinded: LOCAL EMPTY STUB DELETED — see import above. */
/* `function rndcurse() { }` — LOCAL EMPTY STUB DELETED.  sit.c:143's throne
 * effect and mcastu.c:833's MCAST_CURSE_ITEMS are the SAME C function, and this
 * file held a silent no-op for it while js/mcastu.js held a throwing one.  The
 * real body is at the bottom of this file; the throne arm below now awaits it. */
/* do_mapping: LOCAL EMPTY STUB DELETED — re-pointed to js/read.js's real,
 * async body (detect.c:1423 do_mapping()). */
/* aggravate: LOCAL EMPTY STUB DELETED — see import above (mcastu.c/minion.c
 * aggravate(), real body wakes and de-strategises every monster on the
 * hero's side of a Vlad's-tower boundary; has its own internal RNG). */
/* tele: LOCAL EMPTY STUB DELETED — see import above. */
/* identify_pack: LOCAL EMPTY STUB DELETED — re-pointed to js/read.js's real,
 * async body (invent.c:2711 identify_pack()). */
/* make_sick: LOCAL EMPTY STUB DELETED — re-pointed to js/potion.js's real,
 * async body (potion.c:136 make_sick()).  js/uhitm.js also carries a
 * same-named `function make_sick(...) { /* no-op *\/ }`, verified NOT real
 * by reading it — potion.js's is the one real body. */
export 
function SET_BOTL() {
    if (game.disp) game.disp.botl = 1;
}
/* newsym / newsym_force: LOCAL EMPTY STUBS DELETED — re-pointed to the real
 * bodies in js/display.js (newsym display.c:925, newsym_force is newsym plus
 * the forced-redraw bookkeeping display.c:2325-ish). */
/* C pline.c:386 You_feel(line) — preserve the throne-effect feedback. */
import { You_feel, pline_The } from './display.js';
/* stub: Your — side-effect only */
/* Your: LOCAL EMPTY STUB DELETED — see import above. */
/* see_monsters: LOCAL EMPTY STUB DELETED — re-pointed to js/display.js's real
 * body (display.c:1520 see_monsters()). */
/* C display.c:1582 set_mimic_blocking — refresh light blocking for invisible
 * mimics when See_invisible changes. */
export function set_mimic_blocking() {
    const u = game.u || {};
    const p = u.uprops?.[SEE_INVIS];
    const seeInvisible = !!p && !!((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0);
    for (let mon = game.fmon; mon; mon = mon.nmon) {
        if (!mon.minvis) continue;
        const apType = (mon.m_ap_type | 0) & 7;
        const app = mon.mappearance | 0;
        const blocker = (apType === 2 && app === 475)
            || (apType === 1 && (app === 16 || app === 15 || app < 12 || app === 18));
        if (blocker) {
            if (seeInvisible) block_point(mon.mx | 0, mon.my | 0);
            else unblock_point(mon.mx | 0, mon.my | 0);
        }
    }
}

/* C prop.h INTRINSIC — (TIMEOUT_RAW|FROMEXPER|FROMRACE) == 0x07000000. */
const INTRINSIC = 0x07000000;

/* C prop.h property numbers.  attrcurse() returns one of these, and returns 0
 * for "nothing removed" — which is only unambiguous because C numbers the
 * properties from 1.  The old local 0..10 renumbering put FIRE_RES at 0, so a
 * successfully removed fire resistance reported as "nothing removed". */
const FIRE_RES = 1;
const TELEPORT = 46;
const POISON_RES = 6;
const TELEPAT = 30;
const COLD_RES = 2;
const INVIS = 40;
const SEE_INVIS = 29;
const FAST = 64;
const STEALTH = 42;
const PROTECTION = 59;
const AGGRAVATE_MONSTER = 43;

/* remove a random INTRINSIC ability from hero.
   returns the intrinsic property which was removed,
   or 0 if nothing was removed. */
const _ATTRCURSE_PROPS = [[FIRE_RES, 'HFire_resistance'], [TELEPORT, 'HTeleportation'],
    [POISON_RES, 'HPoison_resistance'], [TELEPAT, 'HTelepat'], [COLD_RES, 'HCold_resistance'],
    [INVIS, 'HInvis'], [SEE_INVIS, 'HSee_invisible'], [STEALTH, 'HStealth'],
    [PROTECTION, 'HProtection'], [AGGRAVATE_MONSTER, 'HAggravate_monster']];
/* HFoo aliases u.uprops[FOO].intrinsic (youprop.h:26-46).  Refresh the
 * scalars from that slot: OR-ing an old mirror back in restores intrinsics
 * removed elsewhere, such as role abilities lost by adjabil (attrib.c:1055). */
function _attrcurse_sync(u) {
    for (const [prop, name] of _ATTRCURSE_PROPS) {
        const p = u.uprops?.[prop];
        if (p && u[name] != null) p.intrinsic = (p.intrinsic | 0) & ~(INTRINSIC & ~(u[name] | 0));
    }
}
export async function attrcurse() {
    const u = game.u || {};
    const r = await _attrcurse_body(u);
    _attrcurse_sync(u);
    return r;
}
async function _attrcurse_body(u) {
    for (const [prop, name] of _ATTRCURSE_PROPS)
        u[name] = u.uprops?.[prop]?.intrinsic | 0;
    let ret = 0;

    switch (rnd(11)) {
    case 1:
        if ((u.HFire_resistance | 0) & INTRINSIC) {
            u.HFire_resistance = (u.HFire_resistance | 0) & ~INTRINSIC;
            await You_feel("warmer.");
            ret = FIRE_RES;
            break;
        }
        /*FALLTHRU*/
    case 2:
        if ((u.HTeleportation | 0) & INTRINSIC) {
            u.HTeleportation = (u.HTeleportation | 0) & ~INTRINSIC;
            await You_feel("less jumpy.");
            ret = TELEPORT;
            break;
        }
        /*FALLTHRU*/
    case 3:
        if ((u.HPoison_resistance | 0) & INTRINSIC) {
            u.HPoison_resistance = (u.HPoison_resistance | 0) & ~INTRINSIC;
            await You_feel("a little sick!");
            ret = POISON_RES;
            break;
        }
        /*FALLTHRU*/
    case 4:
        if ((u.HTelepat | 0) & INTRINSIC) {
            u.HTelepat = (u.HTelepat | 0) & ~INTRINSIC;
            _attrcurse_sync(u); /* HTelepat aliases the prop; Blind_telepat must see the removal */
            if (Blind() && !_hero_resists(TELEPAT_PROP))
                see_monsters(); /* Can't sense mons anymore! */
            await Your("senses fail!");
            ret = TELEPAT;
            break;
        }
        /*FALLTHRU*/
    case 5:
        if ((u.HCold_resistance | 0) & INTRINSIC) {
            u.HCold_resistance = (u.HCold_resistance | 0) & ~INTRINSIC;
            await You_feel("cooler.");
            ret = COLD_RES;
            break;
        }
        /*FALLTHRU*/
    case 6:
        if ((u.HInvis | 0) & INTRINSIC) {
            u.HInvis = (u.HInvis | 0) & ~INTRINSIC;
            await You_feel("paranoid.");
            ret = INVIS;
            break;
        }
        /*FALLTHRU*/
    case 7:
        if ((u.HSee_invisible | 0) & INTRINSIC) {
            u.HSee_invisible = (u.HSee_invisible | 0) & ~INTRINSIC;
            _attrcurse_sync(u); /* HSee_invisible aliases the prop; See_invisible must see the removal */
            if (!_hero_resists(SEE_INVIS_PROP)) {
                set_mimic_blocking();
                see_monsters();
                /* might not be able to see self anymore */
                newsym(u.ux, u.uy);
            }
            /* C youprop.h:120: only the timeout hallucinates, and resistance suppresses it. */
            if ((u.uprops?.[HALLUC]?.intrinsic | 0) && !_hero_resists(HALLUC_RES))
                await You("tawt you taw a puttie tat!");
            else
                await You("thought you saw something!");
            ret = SEE_INVIS;
            break;
        }
        /*FALLTHRU*/
    case 8:
        if ((u.uprops?.[FAST]?.intrinsic | 0) & INTRINSIC) {
            u.uprops[FAST].intrinsic = (u.uprops[FAST].intrinsic | 0) & ~INTRINSIC;
            await You_feel("slower.");
            ret = FAST;
            break;
        }
        /*FALLTHRU*/
    case 9:
        if ((u.HStealth | 0) & INTRINSIC) {
            u.HStealth = (u.HStealth | 0) & ~INTRINSIC;
            await You_feel("clumsy.");
            ret = STEALTH;
            break;
        }
        /*FALLTHRU*/
    case 10:
        /* intrinsic protection is just disabled, not set back to 0 */
        if ((u.HProtection | 0) & INTRINSIC) {
            u.HProtection = (u.HProtection | 0) & ~INTRINSIC;
            await You_feel("vulnerable.");
            ret = PROTECTION;
            break;
        }
        /*FALLTHRU*/
    case 11:
        if ((u.HAggravate_monster | 0) & INTRINSIC) {
            u.HAggravate_monster = (u.HAggravate_monster | 0) & ~INTRINSIC;
            await You_feel("less attractive.");
            ret = AGGRAVATE_MONSTER;
            break;
        }
        /*FALLTHRU*/
    default:
        break;
    }
    return ret;
}
/* losexp: LOCAL EMPTY STUB DELETED — see import above. */
/* schedule_goto: LOCAL EMPTY STUB DELETED — see import above. */
/* C dungeon.c:1943 — valley_level is initialized by dungeon generation and
 * mirrored on game for level-teleport callers. */
function find_hell(lvl) {
    const v = game.valley_level || { dnum: 1, dlevel: 1 };
    if (lvl) {
        lvl.dnum = v.dnum | 0;
        lvl.dlevel = v.dlevel | 0;
    }
    return lvl;
}
/* C minion.c:391-439.  These selectors deliberately retain their retry loops:
 * mkclass_aligned and the gone/alignment checks each consume RNG in C. */
function dprince(atyp) {
    const inEndgame = !!(game.u?.uz && game.astral_level
                          && game.u.uz.dnum === game.astral_level.dnum);
    for (let tries = inEndgame ? 0 : 20; tries > 0; --tries) {
        const pm = PM_ORCUS + rn1(PM_DEMOGORGON + 1 - PM_ORCUS, 0);
        const v = game.mvitals?.[pm];
        const d = permonstTemplate(pm);
        if (!((v?.mvflags | 0) & G_GONE) /* C minion.c:396 */
            && (atyp === -128 || Math.sign(d.maligntyp | 0) === Math.sign(atyp)))
            return pm;
    }
    return dlord(atyp);
}
export function dlord(atyp) {
    const inEndgame = !!(game.u?.uz && game.astral_level
                          && game.u.uz.dnum === game.astral_level.dnum);
    for (let tries = inEndgame ? 0 : 20; tries > 0; --tries) {
        const pm = PM_JUIBLEX + rn1(PM_YEENOGHU + 1 - PM_JUIBLEX, 0);
        const v = game.mvitals?.[pm];
        const d = permonstTemplate(pm);
        if (!((v?.mvflags | 0) & G_GONE)
            && (atyp === -128 || Math.sign(d.maligntyp | 0) === Math.sign(atyp)))
            return pm;
    }
    return ndemon(atyp);
}
export function lminion() {
    for (let tries = 0; tries < 20; ++tries) {
        const pm = mkclass(27, 0); /* S_ANGEL */
        if (pm !== null && pm !== NON_PM
            && !(permonstTemplate(pm).mflags2 & M2_LORD))
            return pm;
    }
    return NON_PM;
}
function _is_lminion(mon, d) {
    if (!d || !(d.mflags2 & 0x1000)) return false; /* M2_MINION */
    const a = mon?.ispriest && mon.mextra?.epri ? mon.mextra.epri.shralign
        : mon?.isminion && mon.mextra?.emin ? mon.mextra.emin.min_align
        : d.maligntyp;
    return Math.sign(a | 0) === 1;
}
/* C mondata.c:1449 msummon_environ */
const _ENV = (n, c, w) => n.forEach(k => { _ENV_T[k] = [c, w]; });
const _ENV_T = {};
_ENV([PM_WATER_DEMON, PM_AIR_ELEMENTAL, PM_WATER_ELEMENTAL, PM_FOG_CLOUD, PM_ICE_VORTEX, PM_FREEZING_SPHERE], 'cloud', 'vapor');
_ENV([PM_STEAM_VORTEX], 'cloud', 'steam'); _ENV([PM_ENERGY_VORTEX, PM_SHOCKING_SPHERE], 'shower', 'sparks');
_ENV([PM_EARTH_ELEMENTAL, PM_DUST_VORTEX], 'cloud', 'dust'); _ENV([PM_FIRE_ELEMENTAL, PM_FIRE_VORTEX, PM_FLAMING_SPHERE], 'ball', 'flame');
_ENV([PM_ANGEL, PM_YELLOW_LIGHT], 'flash', 'light');
export async function msummon(mon) {
    const ptr = mon?.data || permonstTemplate(PM_WIZARD_OF_YENDOR);
    const ART_DEMONBANE = 12;
    /* C minion.c:69-74: Demonbane prevents summoning before any RNG. */
    if (mon && game.u.uwep?.oartifact === ART_DEMONBANE && (ptr.mflags2 & M2_DEMON)) {
        if (canseemon(mon)) await pline('%s looks puzzled for a moment.', Monnam(mon));
        return 0;
    }
    /* C minion.c:76-82: a priest or minion carries its own alignment; any
     * other species keeps A_NONE (the Wizard), which dprince()/dlord() read
     * as "any alignment".  Math.sign(A_NONE) is -1 and would reject every
     * prince of the other sign. */
    const atyp = (mon?.ispriest && mon.mextra?.epri) ? mon.mextra.epri.shralign
        : (mon?.isminion && mon.mextra?.emin) ? mon.mextra.emin.min_align
        : ptr.maligntyp === A_NONE ? A_NONE : Math.sign(ptr.maligntyp | 0);
    let dtype = NON_PM, cnt = 0;
    const princeOrWizard = ((ptr.mflags2 & M2_DEMON) && (ptr.mflags2 & M2_PRINCE))
        || ptr.pmidx === PM_WIZARD_OF_YENDOR;
    if (princeOrWizard) {
        dtype = !rn2(20) ? dprince(atyp) : !rn2(4) ? dlord(atyp) : ndemon(atyp);
        cnt = dtype !== NON_PM && !rn2(4) && is_ndemon(permonstTemplate(dtype)) ? 2 : 1;
    } else if ((ptr.mflags2 & M2_DEMON) && (ptr.mflags2 & M2_LORD)) {
        dtype = !rn2(50) ? dprince(atyp) : !rn2(20) ? dlord(atyp) : ndemon(atyp);
        cnt = dtype !== NON_PM && !rn2(4) && is_ndemon(permonstTemplate(dtype)) ? 2 : 1;
    } else if ((ptr.pmidx | 0) === PM_BONE_DEVIL) {
        dtype = PM_SKELETON; cnt = 1;
    } else if (is_ndemon(ptr)) {
        dtype = !rn2(20) ? dlord(atyp) : !rn2(6) ? ndemon(atyp) : (ptr.pmidx | 0);
        cnt = 1;
    } else if (_is_lminion(mon, ptr)) {
        dtype = (ptr.mflags2 & M2_LORD) && !rn2(20) ? (game.mvitals?.[PM_ARCHON]?.mvflags & G_GONE ? lminion() : PM_ARCHON)
            : ((ptr.mflags2 & M2_LORD) || !rn2(6)) ? lminion() : (ptr.pmidx | 0);
        cnt = dtype !== NON_PM && !rn2(4) && !(permonstTemplate(dtype).mflags2 & M2_LORD) ? 2 : 1;
    } else if ((ptr.pmidx | 0) === PM_ANGEL) {
        if (rn2(6)) dtype = PM_ANGEL;
        else if (atyp === 0)
            dtype = [PM_AIR_ELEMENTAL, PM_FIRE_ELEMENTAL, PM_EARTH_ELEMENTAL, PM_WATER_ELEMENTAL][rn2(4)];
        else if (atyp === -1 || atyp === A_NONE) dtype = ndemon(atyp);
        cnt = dtype !== NON_PM && !rn2(4) && !(permonstTemplate(dtype).mflags2 & M2_LORD) ? 2 : 1;
    }
    if (dtype === NON_PM) return 0;
    /* C minion.c:137-148 — sanity checks */
    if (cnt > 1 && (permonstTemplate(dtype).geno & 0x1000 /* G_UNIQ */)) cnt = 1;
    if ((game.mvitals?.[dtype]?.mvflags & G_GONE) !== 0) {
        dtype = ndemon(atyp);
        if (dtype === NON_PM) return 0;
    }
    /* C:152 — "some candidates can generate a group of monsters, so simple
       count of non-null makemon() result is not sufficient" */
    const census = monster_census(false);
    let result = 0, xlight = false;
    while (cnt-- > 0) {
        const m = await makemon(dtype, game.u.ux | 0, game.u.uy | 0, MM_EMIN | MM_NOMSG);
        if (m) {
            result++;
            /* C:159-167 — an angel's alignment should match the summoner */
            if (dtype === PM_ANGEL) {
                m.isminion = 1;
                newemin(m);
                m.mextra.emin.min_align = atyp;
                m.mextra.emin.renegade = ((atyp !== game.u.ualign.type) ^ !m.mpeaceful) ? 1 : 0;
            }
            if (m.data.mlet === 27 && !Blind()) { /* C minion.c:162-170 */
                await show_transient_light(null, m.mx, m.my);
                xlight = true;
            }
            if (cnt === 0 && canseemon(m)) {
                const d = m.data, k = d.mlet === 27 ? PM_ANGEL : d.mlet === 26 ? PM_YELLOW_LIGHT : (d.pmidx | 0);
                const [cloud, what] = _ENV_T[k] || ['cloud', 'smoke'];
                await pline(`${Amonnam(m)} appears in a ${cloud} of ${what}!`);
            }
        }
    }
    if (xlight) await transient_light_cleanup(); /* C minion.c:183-188 */
    /* C:196-197 */
    if (result) result = monster_census(false) - census;
    return result;
}
/* seffects: LOCAL EMPTY STUB DELETED — see import above.  Its call site
 * (special_throne_effect case 10) needs a real `fake_spellbook` argument now,
 * built below — see that case for the C reference. */
/* polyself: LOCAL EMPTY STUB DELETED — see import above. */
/* make_glib: re-exported from js/potion.js (its C home) — see the import note. */
export { make_glib };
/* ---------------------------------------------------------------------------
 * special_throne_effect — Vlad's Tower throne effects (effects 1-13).
 * C ref: nethack-c-v5/upstream/src/sit.c:238 special_throne_effect(int effect)
 *
 * RNG calls (path-dependent):
 *   cases 1-4:  makewish() — no RNG here (wish has own RNG sequence)
 *   case 5:     no RNG
 *   case 6:     rn1(101,100)  — greasy hands duration
 *   case 7:     no RNG
 *   case 8:     no RNG (schedule_goto side-effect)
 *   case 9:     no RNG (msummon×3 have own RNG sequences)
 *   case 10:    no RNG here (seffects has own RNG)
 *   case 11:    no RNG here (polyself has own RNG)
 *   case 12:    rnd(16) or rnd(80)  — acid damage
 *   case 13:    rn2(5) × A_MAX  — ability shuffle (6 calls)
 * ---------------------------------------------------------------------------
 */
async function special_throne_effect(effect) {
    const u = game.u || {};
    const tx = u.ux, ty = u.uy;
    switch (effect) {
        case 1:
        case 2:
        case 3:
        case 4:
            /* 4 chances of a wish; throne then disappears */
            await makewish();
            const tloc = game.level.at(tx, ty);
            tloc.typ = ROOM;
            tloc.flags = 0;
            map_background(tx, ty, false);
            newsym_force(tx, ty);
            await pline_The("throne disintegrates, having spent its power.");
            break;
        case 5:
            await pline("Sitting on the throne was a terrible experience.");
            /* permanent level drain — no RNG call */
            /* C: if (!Drain_resistance) losexp(...) */
            if (!_hero_resists(DRAIN_RES)) {
                await losexp_real("a bad experience sitting on a throne");
                if ((u.ulevelmax | 0) > (u.ulevel | 0))
                    u.ulevelmax = (u.ulevelmax | 0) - 1;
            }
            break;
        case 6: {
            await pline("A greasy liquid sprays all over you!");
            /* grease hands and inventory */
            /* C: make_glib(rn1(101, 100)) */
            for (let otmp = game.invent; otmp; otmp = otmp.nobj) {
                if (otmp.oclass !== /* COIN_CLASS */ 12)
                    otmp.greased = 1;
            }
            make_glib(rn1(101, 100));
            update_inventory();
            break;
        }
        case 7:
            /* lose an intrinsic — attrcurse() has own logic but no RNG here */
            await attrcurse();
            await pline_The("throne somehow seems to be amused.");
            break;
        case 8: {
            /* level teleport to Vibrating Square level — no RNG */
            const vs_level = {};
            find_hell(vs_level);
            vs_level.dlevel = game.dungeons[vs_level.dnum].num_dunlevs - 1;
            if (u.uhave?.amulet)
                await You_feel("extremely disoriented for a moment.");
            else
                schedule_goto(vs_level, 0, null, "You feel extremely out of place.");
            break;
        }
        case 9:
            await pline_The("throne seeems to be calling for help!");
            /* summon demons × 3 — msummon() has its own RNG sequences */
            await msummon(null);
            await msummon(null);
            await msummon(null);
            break;
        case 10: {
            /* confused blessed remove curse — seffects() has its own RNG.
             * C sit.c:293-303:
             *     fake_spellbook = cg.zeroobj;
             *     fake_spellbook.otyp = SPE_REMOVE_CURSE;
             *     fake_spellbook.oclass = SPBOOK_CLASS;
             *     fake_spellbook.blessed = 1;
             *     HConfusion = 1L;
             *     (void) seffects(&fake_spellbook);
             *     HConfusion = save_confusion;
             * The old `seffects(null)` here predates this repoint and would
             * have thrown the instant the real seffects (which reads
             * sobj.otyp) was reached — build the C-shaped argument instead. */
            const fake_spellbook = {
                otyp: /* SPE_REMOVE_CURSE */ 395,
                oclass: /* SPBOOK_CLASS */ 10,
                blessed: 1,
            };
            if (!u.uprops) u.uprops = {};
            if (!u.uprops[CONFUSION]) u.uprops[CONFUSION] = {};
            const save_confusion = u.uprops[CONFUSION].intrinsic | 0;
            u.uprops[CONFUSION].intrinsic = 1;
            await seffects(fake_spellbook);
            u.uprops[CONFUSION].intrinsic = save_confusion;
            break;
        }
        case 11:
            /* polymorph — polyself() has its own RNG */
            if ((game.gy?.youmonst?.data || permonstTemplate(u.umonnum)).mlet === 48 /* S_VAMPIRE, mondata.h:213 */)
                await You_feel("unworthy.");
            else {
                await pline("This throne was not meant for those such as you!");
                await You_feel("a change coming over you.");
                await polyself(0);
            }
            break;
        case 12: {
            await pline("The throne is covered in acid!");
            /* acid damage */
            /* C: losehp(Acid_resistance ? rnd(16) : rnd(80), ...) */
            const acid_res = _hero_resists(ACID_RES);
            const dmg = acid_res ? rnd(16) : rnd(80); /* RNG: rnd(16) or rnd(80) */
            await losehp(dmg, "acidic chair", KILLED_BY_AN);
            exercise(A_CON, false);
            break;
        }
        case 13: {
            await pline("As you sit on the throne, your body and mind start to warp.");
            /* ability shuffle: rn2(5) − 2 for each of A_MAX attributes */
            for (let ability = 0; ability < A_MAX; ++ability) {
                const delta = rn2(5) - 2; /* RNG: rn2(5) × 6 */
                adjattrib(ability, delta, -1);
            }
            break;
        }
        default:
            break;
    }
}
/* ---------------------------------------------------------------------------
 * throne_sit_effect — maybe do something when hero sits on a throne.
 * C ref: nethack-c/src/sit.c:38
 *
 * Exported so dosit (when ported) can call it directly.
 *
 * RNG call sequence (see module header for full count).
 * ---------------------------------------------------------------------------
 */
/* C tty leaves the answered prompt on the topline until the next key read
 * (topl.c:257-266), so stash it for the post-rhack wipe in js/allmain.js. */
async function analyze_throne() {
    /* The wish's prinv/encumber lines wait in the command-result channel;
     * tty_yn_function's more() (topl.c:390) pages them before the prompt, over
     * the status as of the prinv flush (encumber_msg's SET_BOTL comes later). */
    if (!game._pending_message && game._resultMessage) {
        const msg = game._resultMessage;
        const pep = game._pickupEncPreFrame;
        const saved = game._paintedSnapshot;
        if (pep)
            game._paintedSnapshot = { cells: pep.cells, moves: pep.moves | 0,
                                      cap: pep.cap | 0, botl: pep.botl || null };
        try {
            await force_more(msg);
        } finally {
            game._paintedSnapshot = saved;
        }
        game._resultMessage = '';
        game._pickupEncPreFrame = null;
        game._pickupEncMorePending = null;
    }
    const ans = await y_n_default("Analyze throne?", 'n');
    game._resultMessage = game._ynStaleTopline = "Analyze throne? [yn] (n)";
    return ans;
}
export async function throne_sit_effect() {
    const u = game.u || {};
    const gi = game.gi || {};
    const gy = game.gy || {};
    /* C reads the map through `levl[][]`, i.e. svl.level.locations.  Nothing in
     * js/ has ever assigned `.svl`, so the old `game.svl || {}` was always the
     * empty object: the nommap arm below was permanently false and the throne
     * removal below silently wrote nothing.  This port's level lives at
     * game.level (cells via game.level.at(x,y)). */
    const lvl = game.level || null;
    const tx = u.ux | 0;
    const ty = u.uy | 0;
    const special_throne = !!In_V_tower(u.uz);
    /* RNG 1: outer branch — rnd(6) > 4  ≡  rnd(6) is 5 or 6  ≡  !rn2(3) */
    if (rnd(6) > 4) {
        /* RNG 2: which effect (1..13) */
        let effect = rnd(13);
        /* C sit.c:49 — the fuzzer must not stop for an effect prompt. */
        if (wizard() && !game.iflags?.debug_fuzzer) {
            const buf = String(await getlin("Throne sit effect (1..13) [0=random]"));
            if (buf[0] === '\x1b') {
                await pline("%s", "Never mind.");
                return; /* caller will still cause a move to elapse */
            }
            const which = parseInt(buf, 10) || 0; /* atoi */
            if (which >= 1 && which <= 13)
                effect = which;
        }

        if (special_throne) {
            await special_throne_effect(effect);
            /* special throne never removes itself from sitting — return now */
            return;
        }
        switch (effect) {
            case 1:
                /* RNG: rn2(A_MAX), rn1(4,3), rnd(10) */
                adjattrib(rn2(A_MAX), -(rn1(4, 3)), false);
                await losehp(rnd(10), "cursed throne", KILLED_BY_AN);
                break;
            case 2:
                /* RNG: rn2(A_MAX) */
                adjattrib(rn2(A_MAX), 1, false);
                break;
            case 3: {
                /* RNG: rnd(6) or rnd(30) — Shock_resistance determines range */
                const shock_res = _hero_resists(SHOCK_RES);
                /* C sit.c:76-77 — the pline comes BEFORE the damage draw */
                await pline("A%s electric shock shoots through your body!",
                            shock_res ? "n" : " massive");
                const dmg = shock_res ? rnd(6) : rnd(30);
                await losehp(dmg, "electric chair", KILLED_BY_AN);
                /* C sit.c:79 — exercise(A_CON, FALSE): draws rn2(2) when
                 * abs(AEXE(A_CON)) < AVAL; runs after a declined wizard
                 * death too, since done() returns to losehp's caller. */
                exercise(A_CON, false);
                break;
            }
            case 4:
                /* No RNG — full heal + status effects */
                await You_feel("much, much better!"); /* C sit.c:84 */
                if (Upolyd(u)) {
                    if ((u.mh | 0) >= (u.mhmax | 0) - 5)
                        u.mhmax = (u.mhmax | 0) + 4;
                    u.mh = u.mhmax;
                }
                if ((u.uhp | 0) >= (u.uhpmax | 0) - 5) {
                    u.uhpmax = (u.uhpmax | 0) + 4;
                    if ((u.uhpmax | 0) > (u.uhppeak | 0))
                        u.uhppeak = u.uhpmax;
                }
                u.uhp = u.uhpmax;
                u.ucreamed = 0;
                make_blinded(0, true);
                await make_sick(0, null, false, /* SICK_ALL */ 3);
                heal_legs_real(0);
                SET_BOTL();
                break;
            case 5:
                /* No RNG — take_gold() side-effects only */
                await take_gold();
                break;
            case 6: {
                /* RNG: rn2(5) — only on the luck branch; makewish has own RNG */
                /* C sit.c:106 tests base luck, excluding luckstone bonuses. */
                const luck = u.uluck | 0;
                if (luck + rn2(5) < 0) {
                    await You_feel("your luck is changing.");
                    change_luck(1);
                }
                else {
                    await makewish();
                }
                break;
            }
            case 7: {
                /* RNG: rnd(10) for cnt; then courtmon() calls per monster.
                 * C sit.c:105-122: magical voice, then the summons line. */
                const cnt = rnd(10);
                /* Magical voice not affected by deafness (sit.c:114-117) */
                await pline('A voice echoes:');
                await verbalize('Thine audience hath been summoned, %s!',
                                game.flags?.female ? 'Dame' : 'Sire');
                for (let i = cnt; i > 0; --i) {
                    await makemon(courtmon_real(), tx, ty, /* NO_MM_FLAGS */ 0);
                }
                break;
            }
            case 8:
                /* C sit.c:125-131: magical voice, not affected by deafness.
                 * No RNG here — do_genocide() has its own RNG. */
                await pline('A voice echoes:');
                await verbalize('By thine Imperious order, %s...',
                    game.flags?.female ? 'Dame' : 'Sire');
                await do_genocide(5); /* REALLY|ONTHRONE */
                break;
            case 9: {
                /* C sit.c:133-143: announce the curse once, then apply it. */
                await pline('A voice echoes:');
                await verbalize('A curse upon thee for sitting upon this most holy throne!');
                const luck = (u.uluck | 0) + (u.moreluck | 0);
                if (luck > 0) {
                    const blindTimeout = (u.uprops?.[BLINDED]?.intrinsic | 0) & TIMEOUT;
                    make_blinded(/* BlindedTimeout */ blindTimeout + rn1(100, 250), true);
                    const luck_delta = (luck > 1) ? -(rnd(2)) : -1;
                    change_luck(luck_delta);
                }
                else {
                    await rndcurse();
                }
                break;
            }
            case 10: {
                /* RNG: rnd(30) on the nommap path */
                const luck = (u.uluck | 0) + (u.moreluck | 0);
                const sip = u.uprops?.[SEE_INVIS_PROP];
                const see_invis = !!((sip?.intrinsic | 0) & INTRINSIC);
                const nommap = !!(lvl && lvl.flags && lvl.flags.nommap);
                if (luck < 0 || see_invis) {
                    if (nommap) {
                        await pline("A terrible drone fills your head!");
                        /* RNG: rnd(30) confused duration */
                        /* C HConfusion == u.uprops[CONFUSION].intrinsic
                         * (youprop.h:83); `u.hconfusion_timeout` is a spelling
                         * nothing in js/ assigns. */
                        const cdur = ((u.uprops?.[CONFUSION]?.intrinsic | 0) & TIMEOUT) + rnd(30);
                        make_confused(cdur, false);
                    }
                    else {
                        await pline("An image forms in your mind.");
                        await do_mapping();
                    }
                }
                else {
                    /* C sit.c:156-184: feedback precedes the permanent grant. */
                    if (!Blind()) {
                        await Your("vision becomes clear.");
                    } else {
                        const data = game.youmonst?.data || permonstTemplate(u.umonnum | 0);
                        const eyes = (data.mflags1 & 0x00001000 /* M1_NOEYES, monflag.h:97 */) ? 0
                            : (data.pmidx === PM_CYCLOPS || data.pmidx === PM_FLOATING_EYE) ? 1 : 2;
                        if (eyes) {
                            const eye = eyes === 1 ? body_part(EYE) : makeplural(body_part(EYE));
                            await Your("%s %s...", eye, vtense(eye, "tingle"));
                        } else {
                            await You("have a very strange feeling in your %s.", body_part(HEAD));
                        }
                    }
                    u.uprops[SEE_INVIS_PROP] ||= { intrinsic: 0, extrinsic: 0, blocked: 0 };
                    u.uprops[SEE_INVIS_PROP].intrinsic |= FROMOUTSIDE;
                    newsym(u.ux, u.uy);
                }
                break;
            }
            case 11: {
                /* No RNG here — tele() / aggravate() have own RNG */
                const luck = (u.uluck | 0) + (u.moreluck | 0);
                if (luck < 0) {
                    await You_feel("threatened.");
                    aggravate();
                }
                else {
                    await You_feel("a wrenching sensation.");
                    await tele();
                }
                break;
            }
            case 12: {
                /* C sit.c:199 — the insight message precedes the identify */
                await You("are granted an insight!");
                if (game.invent) {
                    await identify_pack(rn2(5), false);
                }
                break;
            }
            case 13: {
                /* C sit.c:202 */
                await Your("mind turns into a pretzel!");
                /* RNG: rn1(7,16) — confusion duration */
                const cdur = ((u.uprops?.[CONFUSION]?.intrinsic | 0) & TIMEOUT) + rn1(7, 16);
                make_confused(cdur, false);
                break;
            }
            default:
                break; /* impossible("throne effect") */
        }
    }
    else {
        /* C sit.c:211-214 — no RNG; is_prince(gy.youmonst.data) reads mons[u.umonnum] */
        const ymd = permonstTemplate(u.umonnum | 0);
        if (((ymd?.mflags2 | 0) & M2_PRINCE) !== 0 || u.uevent?.uhand_of_elbereth)
            await You_feel("very comfortable here.");
        else
            await You_feel("somehow out of place...");
    }
    /* Throne removal: !special_throne && !rn2(3) */
    /* C sit.c:224-225 — wizard mode asks y_n("Analyze throne?") after rn2(3) hits */
    if (!special_throne && !rn2(3) /* RNG: rn2(3) */
        && (!wizard() || (await analyze_throne()) === 'y')) {
        /* Remove throne tile and redraw */
        /* C sit.c:226 — levl[tx][ty].typ = ROOM, levl[tx][ty].flags = 0; */
        const tloc = lvl ? lvl.at(tx, ty) : null;
        if (tloc) {
            tloc.typ = ROOM;
            tloc.flags = 0;
        }
        map_background(tx, ty, false);
        newsym_force(tx, ty);
        /* C sit.c:231 — the answered prompt is dead topline text (topl.c:257-266
         * only joins while toplin == NEED_MORE), so this pline overwrites it. */
        if (wizard() && game._resultMessage === game._ynStaleTopline) {
            game._resultMessage = '';
            game._ynStaleTopline = null;
        }
        await pline_The("throne %s in a puff of logic.",
                        cansee(tx, ty) ? "vanishes" : "has vanished");
    }
}
/* ---------------------------------------------------------------------------
 * Upolyd — C you.h:554 macro: (u.umonnum != u.umonster).  NOT u.mtimedone,
 * which is you.h:422, the poly TIMER; potion.c:1326 tests both together.
 * ---------------------------------------------------------------------------
 */
function Upolyd(u) {
    return !!u && (u.umonnum | 0) !== (u.umonster | 0);
}

/* ---------------------------------------------------------------------------
 * ndemon — pick a correctly aligned demon
 * C ref: nethack-c/src/minion.c:443 ndemon(aligntyp atyp)
 *
 * Calls mkclass_aligned(S_DEMON, 0, atyp) → permonst index; returns it if it is
 * a regular demon (is_ndemon: demon but not lord or prince), else NON_PM.
 *   is_ndemon(ptr) = is_demon(ptr) && !(mflags2 & (M2_LORD | M2_PRINCE))
 *   is_demon(ptr)  = (mflags2 & M2_DEMON) != 0
 * mflags2 is MONS[ptr][7] (permonst row column map; see js/makemon.js).
 * ---------------------------------------------------------------------------
 */
const S_DEMON = 56;          /* C monsym.h S_DEMON */
const M2_DEMON = 0x00000100; /* C monflag.h */
const M2_LORD = 0x00000400;
const M2_PRINCE = 0x00000800;
const MONS = /** @type {any[]} */ (monsPack.mons);
export function ndemon(atyp) {
    const ptr = mkclassAligned(S_DEMON, 0, atyp);
    if (ptr === null || ptr === NON_PM)
        return NON_PM;
    const mflags2 = MONS[ptr][7] | 0;
    const is_demon = (mflags2 & M2_DEMON) !== 0;
    const is_lord = (mflags2 & M2_LORD) !== 0;
    const is_prince = (mflags2 & M2_PRINCE) !== 0;
    if (is_demon && !is_lord && !is_prince)
        return ptr;
    return NON_PM;
}

const AMULET_OF_YENDOR = 213; /* C objects.h — unique amulet otyp */
/* ---------------------------------------------------------------------------
 * mon_has_amulet — check if a monster carries the Amulet of Yendor.
 * C ref: nethack-c/src/wizard.c:105 mon_has_amulet(struct monst *mtmp)
 *
 * Iterates through the monster's minvent (carried objects), returns 1 if
 * any object has otyp == AMULET_OF_YENDOR, else 0.
 * ---------------------------------------------------------------------------
 */
export function mon_has_amulet(mtmp) {
    for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
        if ((otmp.otyp | 0) === AMULET_OF_YENDOR)
            return 1;
    }
    return 0;
}

/* ---------------------------------------------------------------------------
 * Unported helpers (stubs)
 * ---------------------------------------------------------------------------
 */
export function Tobjnam(obj, verb) { return Tobjnam_rc(obj, verb); }
/* You: LOCAL EMPTY STUB DELETED — re-pointed to js/do_wear.js's real, async
 * body (pline.c:372 You()), the general-purpose immediate-pline copy that
 * shares pline's own _plineVFmt formatter.  js/eat.js's copy (imported above
 * as You_rc for rndcurse) routes through a different, deferred
 * command-result channel deliberately chosen for THAT call site — this one
 * (attrcurse/amulet) wants an immediate pline instead, matching C's plain
 * You() -> pline() shape. */
function DEADMONSTER(mtmp) { return (mtmp.mhp | 0) < 1; }
function distu(x, y) {
    const u = game.u || {};
    const dx = (u.ux | 0) - (x | 0);
    const dy = (u.uy | 0) - (y | 0);
    return dx * dx + dy * dy;
}
function m_next2u(mtmp) {
    const u = game.u || {};
    return Math.abs((mtmp.mx | 0) - (u.ux | 0)) <= 1
        && Math.abs((mtmp.my | 0) - (u.uy | 0)) <= 1;
}

/* ---------------------------------------------------------------------------
 * amulet — If you've found the Amulet, make the Wizard appear after some time.
 * Also, give hints about portal locations, if amulet is worn/wielded.
 * C ref: nethack-c/src/wizard.c:60
 * ---------------------------------------------------------------------------
 */
export async function amulet() {
    const u = game.u || {};
    const gf = game;

    /* Check if the amulet is worn or wielded */
    let amu = u.uamul;
    if (!amu || (amu.otyp | 0) !== AMULET_OF_YENDOR) {
        amu = u.uwep;
        if (!amu || (amu.otyp | 0) !== AMULET_OF_YENDOR)
            amu = null;
    }
    if (amu && !rn2(15)) {
        for (let ttmp = gf.ftrap; ttmp; ttmp = ttmp.ntrap) {
            if (ttmp.ttyp === MAGIC_PORTAL) {
                let du = distu(ttmp.tx, ttmp.ty);
                if (du <= 9)
                    pline("%s hot!", Tobjnam(amu, "feel"));
                else if (du <= 64)
                    pline("%s very warm.", Tobjnam(amu, "feel"));
                else if (du <= 144)
                    pline("%s warm.", Tobjnam(amu, "feel"));
                /* else, the amulet feels normal */
                break;
            }
        }
    }

    /* C wizard.c:89 — `if (!svc.context.no_of_wizards) return;`.  In js/ the
     * C svc.context.no_of_wizards counter lives on game.context (makemon +1,
     * wizdeadorgone -1); game.svc.context is a different mirror object
     * (current_fruit, made_amulet, ...) that never carries it, so reading it
     * here returned early every turn and the wizard-wake rn2(40) (wizard.c:95)
     * was never drawn once a sleeping Wizard reached the hero's level. */
    if (!gf.context || !gf.context.no_of_wizards)
        return;
    /* find Wizard, and wake him if necessary */
    for (let mtmp = gf.fmon; mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER(mtmp))
            continue;
        if (mtmp.iswiz && mtmp.msleeping && !rn2(40)) {
            mtmp.msleeping = 0;
            if (!m_next2u(mtmp))
                await You(
      "get the creepy feeling that somebody noticed your taking the Amulet.");
            return;
        }
    }
}

/* ---------------------------------------------------------------------------
 * newemin — allocate and init emin (minion extended data)
 * C ref: nethack-c-v5/upstream/src/minion.c:17-26
 * ---------------------------------------------------------------------------
 */
export function newemin(mtmp) {
    if (!mtmp.mextra)
        mtmp.mextra = newmextra();
    if (!EMIN(mtmp)) {
        mtmp.mextra.emin = { min_align: 0, renegade: 0, parentmid: mtmp.m_id };
    }
}

export function monster_census(spotted) {
    let count = 0;

    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER(mtmp))
            continue;
        if (mtmp.isgd && mtmp.mx === 0)
            continue;
        if (spotted && !canspotmon(mtmp))
            continue;
        ++count;
    }
    return count;
}


/* youprop.h property indices, read the one spelling js/ actually writes
 * (u.uprops[NUMERIC]); same helper js/mcastu.js:99 uses. */
const _RC_ANTIMAGIC = 12, _RC_HALF_SPDAM = 55;
function _rc_propOn(id) {
    const p = game.u?.uprops?.[id];
    return !!(p && (p.intrinsic || p.extrinsic));
}
const _RC_COIN_CLASS = 12;     /* objclass.h COIN_CLASS */
const _RC_SPFX_INTEL = 0x00000004; /* artifact.h:17 */
const _RC_ART_MAGICBANE = 8;   /* artilist.h ARTI_ENUM ordinal (js/makemon.js:2808) */
const _RC_MAL_AURA = 'feel a malignant aura surround %s.';

export async function rndcurse() {
    const g = game;
    const u = g.u = g.u || {};
    let nobj = 0;
    let cnt, onum;
    let otmp;

    /* C:573-576 — obj.h:441 u_wield_art(art) = is_art(uwep, art)
     *             obj.h:439 is_art(o, art) = ((o) && (o)->oartifact == (art)) */
    if (u.uwep && (u.uwep.oartifact | 0) === _RC_ART_MAGICBANE && rn2(20)) {
        await You_rc(_RC_MAL_AURA, 'the magic-absorbing blade');
        return;
    }

    if (_rc_propOn(_RC_ANTIMAGIC))
        shieldeff_rc(u.ux, u.uy);                        /* C:578-580 */

    await You_rc(_RC_MAL_AURA, 'you');                   /* C:582 */

    /* C:584-589 — gold isn't subject to being cursed or blessed. */
    for (otmp = g.invent; otmp; otmp = otmp.nobj) {
        if ((otmp.oclass | 0) === _RC_COIN_CLASS)
            continue;
        nobj++;
    }
    /* C:590 — rnd(6 / ((!!Antimagic) + (!!Half_spell_damage) + 1)); C integer
     * division truncates, and the divisor is at least 1 so rnd() is never
     * called with 0. */
    const _div = (_rc_propOn(_RC_ANTIMAGIC) ? 1 : 0)
        + (_rc_propOn(_RC_HALF_SPDAM) ? 1 : 0) + 1;
    cnt = rnd(Math.trunc(6 / _div));
    if (nobj) {
        for (; cnt > 0; cnt--) {
            onum = rnd(nobj);                            /* C:593 */
            for (otmp = g.invent; otmp; otmp = otmp.nobj) {
                if ((otmp.oclass | 0) === _RC_COIN_CLASS)
                    continue;
                if (--onum === 0)
                    break;                               /* found the target */
            }
            /* C:600-603 — the !otmp case should never happen; picking an
             * already cursed item happens — avoid "resists" in that case. */
            if (!otmp || otmp.cursed)
                continue;

            if (otmp.oartifact && spec_ability(otmp, _RC_SPFX_INTEL)
                && rn2(10) < 8) {                        /* C:605-609 */
                await pline(`${Tobjnam_rc(otmp, 'resist')}!`);
                continue;
            }

            if (otmp.blessed)                            /* C:611-614 */
                await unbless(otmp);
            else
                await curse(otmp);
        }
        update_inventory();                              /* C:616 */
    }

    if (u.usteed && !rn2(4) && (otmp = which_armor(u.usteed, W_SADDLE)) != null
        && !otmp.cursed) {
        if (otmp.blessed)
            await unbless(otmp);
        else
            await curse(otmp);
        if (!Blind()) {
            await pline(`${Yobjnam2(otmp, 'glow')} ${
                hcolor(otmp.cursed ? 'black' : 'brown')}.`);
            /* C youprop.h:120: only intrinsic HALLUC, suppressed by resistance. */
            otmp.bknown = u.uprops?.[HALLUC]?.intrinsic
                && !_rc_propOn(HALLUC_RES) ? 0 : 1; /* bypass set_bknown() */
        } else {
            otmp.bknown = 0;                              /* bypass set_bknown() */
        }
    }
}
