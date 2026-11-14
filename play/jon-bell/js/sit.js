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
import { EYE, HEAD, FROMOUTSIDE, SEE_INVIS } from './const.js';
import { PM_CYCLOPS, PM_FLOATING_EYE } from './pm.generated.js';
import { body_part } from './polyself.js';
import { vtense } from './objnam.js';
import { PM_NINJA } from './pm.generated.js';
import { block_point, unblock_point, cansee } from './vision.js';
import { rn1 } from './rng.js';
import { rn2, rnd } from './rnd.js';
import { In_V_tower, NON_PM, MAGIC_PORTAL, EMIN, CONFUSION, HALLUC, HALLUC_RES, ACID_RES, SHOCK_RES, DRAIN_RES, BLINDED, SEE_INVIS as SEE_INVIS_PROP, TELEPAT as TELEPAT_PROP, TIMEOUT, MM_ANGRY, MM_EMIN, MM_NOMSG, G_GONE, G_GENOD, LOW_PM, G_EXTINCT, NO_MINVENT, A_NONE, A_CON, A_NEUTRAL, A_CHAOTIC } from './const.js';
import { PM_WATER_DEMON, PM_AIR_ELEMENTAL, PM_WATER_ELEMENTAL, PM_FOG_CLOUD, PM_ICE_VORTEX, PM_FREEZING_SPHERE, PM_STEAM_VORTEX, PM_ENERGY_VORTEX, PM_SHOCKING_SPHERE, PM_EARTH_ELEMENTAL, PM_DUST_VORTEX, PM_FIRE_ELEMENTAL, PM_FIRE_VORTEX, PM_FLAMING_SPHERE, PM_YELLOW_LIGHT, NUMMONS, PM_ARCHON, PM_ANGEL, PM_BONE_DEVIL, PM_JUIBLEX, PM_YEENOGHU, PM_ORCUS, PM_DEMOGORGON, PM_WIZARD_OF_YENDOR, PM_SKELETON, PM_SAMURAI, PM_HIGH_PRIEST as PM_HIGH_CLERIC } from './pm.generated.js';

function _hero_resists(prop) {
    const p = game.u?.uprops?.[prop];
    return !!((p?.intrinsic | 0) || (p?.extrinsic | 0));
}
/* make_confused's C home is potion.c:88; the file-local copy below it replaced
 * was an empty body, so neither throne arm could confuse the hero. */
import { make_confused, make_glib, make_sick } from './potion.js';
import { mkclass, mkclassAligned, newmextra, permonstTemplate, is_ndemon, monPmname } from './makemon.js';
import { name_to_mon, name_to_monclass } from './mondata.js';
import { canseemon, canspotmon, map_background, newsym, newsym_force, see_monsters, force_more, Deaf } from './display.js';
import { pline, livelog_printf, urgent_pline } from './pline.js';
import { LL_CONDUCT, LL_GENOCIDE, UNCHANGING, POLY_REVERT, POLY_NOFLAGS, UTOTYPE_NONE, SICK_ALL } from './const.js';
/* C objclass.h COIN_CLASS / SPBOOK_CLASS; objects.h SPE_REMOVE_CURSE
 * (js/spell.js:130); monsym.h S_VAMPIRE; sndprocs.h:165 voice_throne. */
const COIN_CLASS = 12, SPBOOK_CLASS = 10, SPE_REMOVE_CURSE = 395;
const S_VAMPIRE = 48, voice_throne = 0x0010;
/* C mondata.h:213 is_vampire(ptr) */
function is_vampire(ptr) { return (ptr.mlet | 0) === S_VAMPIRE; }
import { PM_VAMPIRE, PM_VAMPIRE_LORD as PM_VAMPIRE_LEADER, PM_VLAD_THE_IMPALER } from './pm.generated.js';
import { do_mapping } from './detect.js';
import { identify_pack } from './invent.js';
/* rndcurse()'s leaves, each from the file that holds its one real body.  The
 * aliases exist because this file already carries same-named LOCAL stubs
 * (`function You(_msg) {}` at :581 and `export function Tobjnam()` returning the
 * literal "It" at :580) that throne_sit_effect() still depends on; repointing
 * those is a separate, wider change, so rndcurse names the real ones explicitly
 * rather than quietly inheriting the stubs. */
/* C sit.c:582 uses You()->pline immediately; the deferred eat.js You()
 * leaves the aura in _resultMessage and paints it on a later frame. */
import { You as You_rc } from './pline.js';
import { Tobjnam, Tobjnam as Tobjnam_rc, Yobjnam2, makeplural, an } from './objnam.js';
import { quest_info } from './questpgr.js';
import { curse, unbless } from './mkobj.js';
import { spec_ability, adjattrib, change_luck, exercise } from './attrib.js';
import { hcolor } from './mhitm.js';
import { Amonnam } from './do_name.js';
import { update_inventory } from './invent.js';
import { which_armor } from './worn.js';
import { shieldeff as shieldeff_rc, is_lminion } from './mcastu.js';
import { Monnam } from './do_name.js';
import { aggravate } from './wizard.js';
import { show_transient_light, transient_light_cleanup } from './light.js';
/* tele's C home is teleport.c:840. */
import { tele } from './teleport.js';
/* makewish's C home is wizcmds.c:38; the throne sources are sit.c:110/251. */
import { makewish } from './zap.js';
import { getlin } from './windows.js';
import { rndmonst } from './makemon.js';
import { adjalign as adjalign_sit } from './attrib.js';
import { verbalize, SetVoice } from './cmd.js';
import { list_genocided } from './insight.js';
import { DEAF } from './const.js';

import { G_UNIQ } from './read.js';
const M2_DEMON = 0x00000100;
/* makemon's C home is makemon.c:1338; the real port lives in js/mklev.js
 * (NOT js/makemon.js — that file only has makemonDomesticSaddle). */
import { makemon } from './makemon.js';
import { courtmon as courtmon_real } from './mkroom.js';
import { upstart } from './hacklib.js';
import { kill_genocided_monsters, mongone } from './mon.js';
import { y_n_default } from './cmd.js';
import { heal_legs as heal_legs_real } from './do.js';
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
import { Your, You } from './pline.js';
import { W_SADDLE } from './const.js';
/* make_blinded's C home is potion.c:267.  js/mhitu.js also carries a
 * same-named `export function make_blinded(_dur, _vis) { }`, verified NOT
 * real by reading it (empty body) — js/zap.js's is the one real, sync body. */
import { make_blinded } from './zap.js';
/* losehp's C home is hack.c:4219.  js/potion.js used to carry a throwing
 * local stub for it too, since fixed to import this same body. */
import { delobj } from './invent.js';
import { losehp } from './hack.js';
/* exper.c:212 losexp() — use the canonical experience-drain implementation
 * for the throne's permanent-drain arm. */
import { losexp as losexp_real } from './exper.js';
/* schedule_goto's C home is do.c:2076.  js/cmd.js owns file js/cmd.js but its
 * export is fine to import (only editing js/cmd.js is off limits here). */
import { schedule_goto } from './do.js';
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
import { KILLED_BY, KILLED_BY_AN } from './const.js';
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
        if ((obj.oclass | 0) === COIN_CLASS) {
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
import { You_feel, pline_The } from './pline.js';
import { find_hell } from './dungeon.js'; // relocate-fns

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
/* C mondata.c:1449 msummon_environ */
const _ENV = (n, c, w) => n.forEach(k => { _ENV_T[k] = [c, w]; });
const _ENV_T = {};
_ENV([PM_WATER_DEMON, PM_AIR_ELEMENTAL, PM_WATER_ELEMENTAL, PM_FOG_CLOUD, PM_ICE_VORTEX, PM_FREEZING_SPHERE], 'cloud', 'vapor');
_ENV([PM_STEAM_VORTEX], 'cloud', 'steam'); _ENV([PM_ENERGY_VORTEX, PM_SHOCKING_SPHERE], 'shower', 'sparks');
_ENV([PM_EARTH_ELEMENTAL, PM_DUST_VORTEX], 'cloud', 'dust'); _ENV([PM_FIRE_ELEMENTAL, PM_FIRE_VORTEX, PM_FLAMING_SPHERE], 'ball', 'flame');
_ENV([PM_ANGEL, PM_YELLOW_LIGHT], 'flash', 'light');
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
                if (otmp.oclass !== COIN_CLASS)
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
                schedule_goto(vs_level, UTOTYPE_NONE, null, "You feel extremely out of place.");
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
                otyp: SPE_REMOVE_CURSE,
                oclass: SPBOOK_CLASS,
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
            if (is_vampire(game.gy?.youmonst?.data || permonstTemplate(u.umonnum)))
                await You_feel("unworthy.");
            else {
                await pline("This throne was not meant for those such as you!");
                await You_feel("a change coming over you.");
                await polyself(POLY_NOFLAGS);
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
    /* C cmd.c:5459-5460: the query menu logs the answer, then clears
     * WIN_MESSAGE. Only tty_yn_function leaves a painted prompt behind. */
    if (!(game.iflags?.query_menu && game.iflags?.window_inited))
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
                if (Upolyd_sit(u)) {
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
                await make_sick(0, null, false, SICK_ALL);
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
                SetVoice(null, 0, 80, voice_throne);
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
                SetVoice(null, 0, 80, voice_throne);
                await verbalize('By thine Imperious order, %s...',
                    game.flags?.female ? 'Dame' : 'Sire');
                await do_genocide(5); /* REALLY|ONTHRONE */
                break;
            case 9: {
                /* C sit.c:133-143: announce the curse once, then apply it. */
                await pline('A voice echoes:');
                SetVoice(null, 0, 80, voice_throne);
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
 * Upolyd_sit — C you.h:554 macro: (u.umonnum != u.umonster).  NOT u.mtimedone,
 * which is you.h:422, the poly TIMER; potion.c:1326 tests both together.
 * ---------------------------------------------------------------------------
 */
function Upolyd_sit(u) {
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
import { S_DEMON } from './minion.js'; /* C monsym.h S_DEMON */
const M2_PRINCE = 0x00000800;

import { AMULET_OF_YENDOR } from './wizard.js'; /* C objects.h — unique amulet otyp */
/* C ref: wizard.c:105 mon_has_amulet(mtmp) — forwarded to canonical js/wizard.js body */
export { mon_has_amulet } from './wizard.js';

/* ---------------------------------------------------------------------------
 * Unported helpers (stubs)
 * ---------------------------------------------------------------------------
 */
/* You: LOCAL EMPTY STUB DELETED — re-pointed to js/do_wear.js's real, async
 * body (pline.c:372 You()), the general-purpose immediate-pline copy that
 * shares pline's own _plineVFmt formatter.  js/eat.js's copy (imported above
 * as You_rc for rndcurse) routes through a different, deferred
 * command-result channel deliberately chosen for THAT call site — this one
 * (attrcurse/amulet) wants an immediate pline instead, matching C's plain
 * You() -> pline() shape. */
import { DEADMONSTER } from './wizard.js';
import { monster_census, msummon } from './minion.js'; // relocate-fns
import { set_mimic_blocking } from './display.js'; // relocate-fns
import { do_genocide } from './read.js'; // relocate-fns
import { COIN_CLASS_C, Is_box, _Cold_resistance, _Deaf, _Fire_resistance, _Flying, _Levitation, _There, _Underwater, _dryup, _eprop, _hero_youmonst, _hliquid, _hprop, _is_hider_mndx, _is_lava, _is_pool, _levlAt, _likes_lava, _oc_material, _plineVFmt, _split_mon, _sticks, _the_str, _uprop_active } from './cmd.js';
import { useupf } from './invent.js'; // relocate-fns
import { ALTAR, A_STR, A_WIS, DRAWBRIDGE_DOWN, ECMD_OK, ECMD_TIME, FOOT, FOUNTAIN, GRAVE, IS_ALTAR, Is_waterlevel, LADDER, SINK, SPIKED_PIT, STAIRS, THRONE, TT_BEARTRAP, TT_BURIEDBALL, TT_INFLOOR, TT_LAVA, TT_PIT, TT_WEB, Upolyd, VIASITTING } from './const.js'; // relocate-fns
import { is_ice as _is_ice } from './dbridge.js'; // relocate-fns
import { DEFSYM_EXPLANATION } from './defsym_data.js'; // relocate-fns
import { dropy } from './do.js'; // relocate-fns
import { xname } from './do_wear.js'; // relocate-fns
import { surface } from './dungeon.js'; // relocate-fns
import { morehungry } from './eat.js'; // relocate-fns
import { can_reach_floor } from './engrave.js'; // relocate-fns
import { oc_nutrition } from './food_props.js'; // relocate-fns
import { money_cnt } from './hack.js'; // relocate-fns
import { stackobj } from './invent.js'; // relocate-fns
import { mhis_mon } from './mhitu.js'; // relocate-fns
import { mksobj, set_corpsenm } from './mkobj.js'; // relocate-fns
import { egg_type_from_parent } from './mon.js'; // relocate-fns
import { observe_object } from './o_init.js'; // relocate-fns
import { You_cant } from './pline.js'; // relocate-fns
import { PM_ELECTRIC_EEL, PM_GIANT_EEL, PM_GREMLIN, PM_TRAPPER } from './pm.generated.js'; // relocate-fns
import { make_slimed } from './potion.js'; // relocate-fns
import { altar_wrath } from './pray.js'; // relocate-fns
import { d } from './rnd.js'; // relocate-fns
import { dotrap, t_at, uescaped_shaft, uteetering_at_seen_pit, water_damage } from './trap.js'; // relocate-fns
import { mon_nam } from './uhitm.js'; // relocate-fns
import { weight } from './weight.js'; // relocate-fns
export { Upolyd_sit, _hero_resists }; // relocate-fns
export { amulet } from './wizard.js'; // relocate-fns
export { lminion, monster_census, ndemon, newemin } from './minion.js'; // relocate-fns
export { M2_DEMON, M2_PRINCE, _ENV_T }; // relocate-fns





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

/* was `return false`, ignoring its argument entirely — C: mondata.h:65
 * humanoid(ptr) = ((ptr->mflags1 & M1_HUMANOID) != 0).  Two call shapes in
 * this file: humanoid(u.ustuck->data) (another monster's permonst) and
 * humanoid(gy.youmonst.data) (the hero's own, at the no-arg call site) —
 * `_hero_youmonst()` (this file, ~line 15475) is the established helper for
 * the latter. */
function _humanoid(data) {
    const M1_HUMANOID_SIT = 0x00020000; /* monflag.h M1_HUMANOID */
    const ym = data || _hero_youmonst().data;
    return !!ym && ((ym.mflags1 | 0) & M1_HUMANOID_SIT) !== 0;
}

function _mhis(mtmp) { return mhis_mon(mtmp); }

/* was `return 0` — a file-local stub shadowing the real port, so the dosit
 * dragon-hoard line (sit.c) always read "meager ". */
function _money_cnt(invent) { return money_cnt(invent); }

/* was `return false` — C: mondata.h:67 slithy(ptr) = ((ptr->mflags1 &
 * M1_SLITHY) != 0), called here with no arg == slithy(gy.youmonst.data). */
function _slithy() {
    const M1_SLITHY_SIT = 0x00080000; /* monflag.h M1_SLITHY */
    const ym = _hero_youmonst().data;
    return !!ym && ((ym.mflags1 | 0) & M1_SLITHY_SIT) !== 0;
}

/* C sndprocs.h:272 Soundeffect(seid, vol) — compiled empty without
 * SND_LIB_INTEGRATED; seffects.h enum (se_zero_invalid = 0 first). */
const se_squelch = 182;

function _Soundeffect(se, vol) { }

function _Is_box(o) { return Is_box(o); }

/* was `return false` — C: youprop.h:341 Half_physical_damage =
 * (HHalf_physical_damage || EHalf_physical_damage), u.uprops[HALF_PHDAM].
 * This file already reads the identical macro this way elsewhere
 * (`_uprop_active('HALF_PHDAM')`, the dmgval halving helper) — same prop id,
 * exported by const.js; this just wires the dosit-local copy the same way. */
function _Half_physical_damage() { return _uprop_active('HALF_PHDAM'); }

function _Slimed() { return _uprop_active('SLIMED'); }

/* C timeout.c:448-452 burn_away_slime().  Fire and lava effects call this
 * before applying their other side effects; when the hero is becoming slime,
 * clear that timeout immediately and preserve C's feedback text.  The local
 * command helper used to be a silent no-op, which left Slimed set after #sit
 * on lava and after sitting on a lava surface. */
async function _burn_away_slime() {
    if (_Slimed())
        await make_slimed(0, "The slime that covers you is burned away!");
}

/* was `return false` — C: mondata.h:78 eggs_in_water(ptr) = (lays_eggs(ptr)
 * && ptr->mlet == S_EEL && is_swimmer(ptr)), is_swimmer(ptr) = ((ptr->mflags1
 * & M1_SWIM) != 0). Called here with no arg == eggs_in_water(gy.youmonst.data). */
function _eggs_in_water() {
    const M1_OVIPAROUS_SIT = 0x00400000; /* monflag.h M1_OVIPAROUS */
    const M1_SWIM_SIT = 0x00000002;      /* monflag.h M1_SWIM */
    const S_EEL_SIT = 57;                /* defsym.h MONSYM(57,...,S_EEL) */
    const ym = _hero_youmonst().data;
    if (!ym) return false;
    const mf1 = ym.mflags1 | 0;
    return (mf1 & M1_OVIPAROUS_SIT) !== 0
        && (ym.mlet | 0) === S_EEL_SIT
        && (mf1 & M1_SWIM_SIT) !== 0;
}

/* C: defsyms[S_x].explanation (defsym.h) — S_altar=33, S_grave=34, S_throne=35,
 * S_sink=36, S_ice=39.  The throne reads "opulent throne" (sit.c:557). */
const _DEFSYM_EXPL_IDX = { altar: 33, grave: 34, throne: 35, sink: 36, ice: 39 };

function _defsym_expl(name) { return DEFSYM_EXPLANATION[_DEFSYM_EXPL_IDX[name]] ?? name; }

/* was an empty body — a file-local stub shadowing the real port, same class
 * as the money_cnt/hliquid re-points above.  Real body: js/sit.js:420
 * throne_sit_effect() (172 lines: attribute swings, level drain, wishes,
 * teleport, polymorph, monster summons, curses, throne removal).  It is
 * `async` (awaits pline/makewish/tele/polyself/etc via its own leaves), so
 * this wrapper is too and the dosit call site below now awaits it. */
async function _throne_sit_effect() { return throne_sit_effect(); }

/* was `return false` — C: mondata.h:77 lays_eggs(ptr) = ((ptr->mflags1 &
 * M1_OVIPAROUS) != 0), called here with no arg == lays_eggs(gy.youmonst.data). */
function _lays_eggs() {
    const M1_OVIPAROUS_SIT = 0x00400000; /* monflag.h M1_OVIPAROUS */
    const ym = _hero_youmonst().data;
    return !!ym && ((ym.mflags1 | 0) & M1_OVIPAROUS_SIT) !== 0;
}

/* C sit.c:358-393 — lay_an_egg().  The old ECMD_TIME placeholder skipped the
 * female/energy/water guards and all object creation, including the hatch
 * timer setup performed by set_corpsenm(). */
async function _lay_an_egg() {
    const g = game;
    const u = g.u || {};
    const EGG = 266;
    const nutrition = oc_nutrition(EGG);
    if (!g.flags?.female) {
        const male = _hprop(HALLUC) && !(_hprop(HALLUC_RES) || _eprop(HALLUC_RES))
            ? 'You may think you are a platypus, but a male still'
            : 'Males';
        await pline("%s can't lay eggs!", male);
        return ECMD_OK;
    }
    if ((u.uhunger | 0) < nutrition) {
        await You("don't have enough energy to lay an egg.");
        return ECMD_OK;
    }
    const waterEgg = _eggs_in_water();
    if (waterEgg) {
        if (!_Underwater() && !Is_waterlevel(u.uz)) {
            await pline('A splash tetra you are not.');
            return ECMD_OK;
        }
        if (Upolyd(u) && ((u.umonnum | 0) === PM_GIANT_EEL
                       || (u.umonnum | 0) === PM_ELECTRIC_EEL)) {
            await You('yearn for the Sargasso Sea.');
            return ECMD_OK;
        }
    }
    const egg = await mksobj(EGG, false, false);
    egg.spe = 1;
    egg.quan = 1;
    egg.owt = weight(egg);
    set_corpsenm(egg, egg_type_from_parent(u.umonnum | 0, false));
    egg.known = 1;
    observe_object(egg);
    await You('%s an egg.', waterEgg ? 'spawn' : 'lay');
    await dropy(egg);
    await stackobj(egg);
    await morehungry(nutrition);
    return ECMD_TIME;
}

/* C ref: sit.c:396 dosit() — the #sit command. */
export async function dosit() {
    const g = game;
    const u = g.u || (g.u = {});
    const CREAM_PIE_SIT = 287, WATER_WALKING_BOOTS_SIT = 167;
    /* C monsym.h S_DRAGON (js/polyself.js:167); objects.h TOOL() TOWEL
     * (js/engrave.js:73, js/potion.js:2248). */
    const S_DRAGON_SIT = 30, TOWEL_SIT = 234;
    const sit_message = "sit on the %s.";

    const trap = t_at(u.ux | 0, u.uy | 0);
    const loc = _levlAt(u.ux | 0, u.uy | 0);
    const typ = loc ? (loc.typ | 0) : 0;

    if (u.usteed) {
        await You("are already sitting on %s.", mon_nam(u.usteed));
        g.context.move = 0;
        return ECMD_OK;
    }

    /* C sit.c:410-412: only ceiling hiders descend; hiding under objects persists. */
    if (u.uundetected && _is_hider_mndx(u.umonnum | 0)
        && (u.umonnum | 0) !== PM_TRAPPER) {
        u.uundetected = 0;
    }

    if (!can_reach_floor(false)) {
        if (u.uswallow) {
            await _There("are no seats in here!");
        } else if (_Levitation()) {
            await You("tumble in place.");
        } else {
            await You("are sitting on air.");
        }
        g.context.move = 0;
        return ECMD_OK;
    } else if (u.ustuck && !_sticks()) {
        if (_humanoid(u.ustuck?.data)) {
            await pline("%s won't offer %s lap.", Monnam(u.ustuck), _mhis(u.ustuck));
        } else {
            await pline("%s has no lap.", Monnam(u.ustuck));
        }
        g.context.move = 0;
        return ECMD_OK;
    } else if (_is_pool(u.ux | 0, u.uy | 0) && !_Underwater()) {
        await You("sit in the %s.", _hliquid("water"));
        if (Upolyd(u) && (u.umonnum | 0) === PM_GREMLIN) {
            if (await _split_mon()) {
                if ((loc && (loc.typ | 0) === FOUNTAIN)) {
                    await _dryup(u.ux | 0, u.uy | 0, true);
                }
            }
        } else {
            if (!rn2(10) && u.uarm) {
                await water_damage(u.uarm, "armor", true);
            }
            if (!rn2(10) && u.uarmf && (u.uarmf.otyp | 0) !== WATER_WALKING_BOOTS_SIT) {
                await water_damage(u.uarm, "armor", true);
            }
        }
        g.context.move = 1;
        return ECMD_TIME;
    } else if (Upolyd(u) && (u.umonnum | 0) === PM_GREMLIN
               && ((loc && (loc.typ | 0) === FOUNTAIN) || _is_pool(u.ux | 0, u.uy | 0))) {
        await You("sit in the %s.", _hliquid("water"));
        if (await _split_mon()) {
            if ((loc && (loc.typ | 0) === FOUNTAIN)) {
                await _dryup(u.ux | 0, u.uy | 0, true);
            }
        }
        g.context.move = 1;
        return ECMD_TIME;
    }

    const objAt = g.level?.levelObjects?.[u.ux | 0]?.[u.uy | 0];
    if (objAt && !(uteetering_at_seen_pit(trap) || uescaped_shaft(trap))) {
        const obj = objAt;
        if ((_hero_youmonst().data?.mlet | 0) === S_DRAGON_SIT && (obj.oclass | 0) === COIN_CLASS_C) {
            await You("coil up around your %shoard.",
                ((obj.quan | 0) + _money_cnt(g.invent || null) < (u.ulevel | 0) * 1000)
                ? "meager " : "");
        } else if ((obj.otyp | 0) === TOWEL_SIT) {
            await pline("It's probably not a good time for a picnic...");
        } else {
            /* C sit.c:450-452 — `the(xname(obj))`, and xname() deliberately
             * does NOT include the monster type for a corpse ("xname doesn't
             * include monster type for 'corpse'; cxname does", objnam.c:1925),
             * so C reads "You sit on the corpse."  This called cmd.js's local
             * partial namer _cxname_base(), whose hand-maintained otyp tables
             * have no CORPSE row, so it rendered the `object#<otyp>` fallback:
             * "You sit on the object#265."  js/objnam.js's xname() is the real
             * body — use it. */
            if (_slithy()) {
                await You("coil up around %s.", _the_str(xname(obj)));
            } else {
                await You("sit on %s.", _the_str(xname(obj)));
            }
            const M1_AMORPHOUS_SIT = 0x00000004; /* C monflag.h M1_AMORPHOUS */
            const _sitCorpsePm = (obj.corpsenm != null) ? (obj.corpsenm | 0) : -1;
            const _sitCorpseData = ((obj.otyp | 0) === 265 && _sitCorpsePm >= 0)
                ? permonstTemplate(_sitCorpsePm) : null;
            if ((obj.otyp | 0) === 265 && _sitCorpseData
                && ((_sitCorpseData.mflags1 >>> 0) & M1_AMORPHOUS_SIT) !== 0) {
                await pline("It's squishy...");
            } else if ((obj.otyp | 0) === CREAM_PIE_SIT) {
                if (!_Deaf()) {
                    _Soundeffect(se_squelch, 30);
                    await pline("Squelch!");
                }
                await useupf(obj, obj.quan | 0);
            } else if (!(_Is_box(obj)
                         /* C sit.c:462 — objects[otyp].oc_material == CLOTH (6) */
                         || _oc_material(obj.otyp | 0) === 6)) {
                await pline("It's not very comfortable...");
            }
        }
    } else if (trap || (u.utrap && (u.utraptype | 0) >= TT_LAVA)) {
        if (u.utrap) {
            exercise(A_WIS, false);
            const traptype = u.utraptype | 0;
            if (traptype === TT_BEARTRAP) {
                /* C ref: sit.c:465-466 — the bear-trap message uses
                 * body_part(FOOT), not LEG (the old enum's now-fixed value
                 * for `1` was an accidental match for this literal, not a
                 * deliberate reference — see body_part enum notes above). */
                await You_cant("sit down with your %s in the bear trap.",
                    body_part(FOOT));
                u.utrap = (u.utrap | 0) + 1;
            } else if (traptype === TT_PIT) {
                if (trap && (trap.ttyp | 0) === SPIKED_PIT) {
                    await You("sit down on a spike.  Ouch!");
                    await losehp(_Half_physical_damage() ? rn2(2) : 1,
                           "sitting on an iron spike", KILLED_BY);
                    exercise(A_STR, false);
                } else {
                    await You("sit down in the pit.");
                }
                u.utrap = (u.utrap | 0) + rn2(5);
            } else if (traptype === TT_WEB) {
                await You("sit in the spider web and get entangled further!");
                u.utrap = (u.utrap | 0) + rn1(10, 5);
            } else if (traptype === TT_LAVA) {
                await You("sit in the %s!", _hliquid("lava"));
                if (_Slimed()) {
                    await _burn_away_slime();
                }
                u.utrap = (u.utrap | 0) + rnd(4);
                await losehp(d(2, 10), "sitting in lava", KILLED_BY);
            } else if (traptype === TT_INFLOOR || traptype === TT_BURIEDBALL) {
                await You_cant("maneuver to sit!");
                u.utrap = (u.utrap | 0) + 1;
            }
        } else {
            await You("%s.", _Flying() ? "land" : "sit down");
            // C sit.c:503: sitting activates the trap with VIASITTING.
            await dotrap(trap, VIASITTING);
        }
    } else if ((_Underwater() || Is_waterlevel(u.uz))
                && !_eggs_in_water()) {
        if (Is_waterlevel(u.uz)) {
            await _There("are no cushions floating nearby.");
        } else {
            await You("sit down on the muddy bottom.");
        }
    } else if (_is_pool(u.ux | 0, u.uy | 0) && !_eggs_in_water()) {
        await You("sit in the %s.", _hliquid("water"));
        if (Upolyd(u) && (u.umonnum | 0) === PM_GREMLIN) {
            if (await _split_mon()) {
                if ((loc && (loc.typ | 0) === FOUNTAIN)) {
                    await _dryup(u.ux | 0, u.uy | 0, true);
                }
            }
        } else {
            if (!rn2(10) && u.uarm) {
                await water_damage(u.uarm, "armor", true);
            }
            if (!rn2(10) && u.uarmf && (u.uarmf.otyp | 0) !== WATER_WALKING_BOOTS_SIT) {
                await water_damage(u.uarm, "armor", true);
            }
        }
    } else if (typ === SINK) {
        await You(sit_message, _defsym_expl("sink"));
        await Your("%s gets wet.",
            _humanoid() ? "rump" : "underside");
    } else if (typ === ALTAR || IS_ALTAR(typ)) {
        await You(sit_message, _defsym_expl("altar"));
        await altar_wrath(u.ux | 0, u.uy | 0);
    } else if (typ === GRAVE) {
        await You(sit_message, _defsym_expl("grave"));
    } else if (typ === STAIRS) {
        await You(sit_message, "stairs");
    } else if (typ === LADDER) {
        await You(sit_message, "ladder");
    } else if (_is_lava(u.ux | 0, u.uy | 0)) {
        await You(sit_message, _hliquid("lava"));
        await _burn_away_slime();
        if (_likes_lava()) {
            await pline(_plineVFmt("The %s feels warm.", [_hliquid("lava")]));
            g.context.move = 1;
            return ECMD_TIME;
        }
        await pline(_plineVFmt("The %s burns you!", [_hliquid("lava")]));
        await losehp(d(_Fire_resistance() ? 2 : 10, 10),
               "sitting on lava", KILLED_BY);
    } else if (_is_ice(u.ux | 0, u.uy | 0)) {
        await You(sit_message, _defsym_expl("ice"));
        if (!_Cold_resistance()) {
            await pline("The ice feels cold.");
        }
    } else if (typ === DRAWBRIDGE_DOWN) {
        await You(sit_message, "drawbridge");
    } else if (typ === THRONE) {
        await You(sit_message, _defsym_expl("throne"));
        await _throne_sit_effect();
    } else if (_lays_eggs()) {
        const eggResult = await _lay_an_egg();
        g.context.move = (eggResult & ECMD_TIME) ? 1 : 0;
        return eggResult;
    } else {
        await pline(_plineVFmt("Having fun sitting on the %s?", [surface(u.ux | 0, u.uy | 0)]));
    }

    g.context.move = 1;
    return ECMD_TIME;
}
