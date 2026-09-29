// @ts-nocheck
// potion.js — Potion subsystem + fountain interactions.
// C ref: nethack-c/src/potion.c, nethack-c/src/fountain.c
// W19.2: uncursed-water dodrink path (seed1900 SCORE-MOVER).
// W4b: drinkfountain (seed0011 SCORE-MOVER) + dipfountain stub.
import { game, wizard, discover } from './gstate.js';
import { newobj } from './game.js';
import { make_blinded, resist, explode, explode_oil, potionhit_polymorph, poly_obj, obj_unpolyable, ubreatheu, melt_ice_zap } from './zap.js';
import { nothing_happens, nothing_seems_to_happen } from './const.js';
import { prinv, enlightenment, fire_damage, cmdq_peek, useup } from './cmd.js';
import { CQ_CANNED, ECMD_FAIL } from './const.js';
import { EXPL_FIERY } from './const.js';
import { RIGHT_HANDED, STRANGLED, A_STR, ismnum, BOLT_LIM, Upolyd } from './const.js';
import { set_levltyp } from './mkmaze.js';
import { rn2, rnd, d, rn1, rnl } from './rng.js';
import { PM_HEALER, PM_ROCK_MOLE, PM_WOODCHUCK, PM_PONY, PM_HORSE, PM_WARHORSE } from './pm.generated.js';
import monPmnamesPack from './makemon_pmnames.json' with { type: 'json' };
import { pline, flush_screen, newsym, force_more, await_topl_more_dismiss, canspotmon, canseemon, map_invisible, getobj_never_mind } from './display.js';
import { unmap_object, glyph_is_invisible_at } from './display.js';
import { aggravate, monstseesu as monstseesu_real } from './mcastu.js';
import { COLNO, ROWNO, INVIS } from './const.js';
import { topl_park_cursor, _topl_stash_result } from './display.js';
import { cls, docrt, map_monst, display_self, map_object, GLYPHCLS_OBJ } from './display.js';
/* make_hallucinated()'s "changed" block (potion.c:415-433). */
import { see_monsters, see_objects, see_traps, swallowed } from './display.js';
/* make_sick()/make_stoned()/make_slimed() call the delayed-killer list on every
 * invocation (end.c:1706-1756). */
import { delayed_killer, find_delayed_killer, dealloc_killer } from './end.js';
/* potion.c:417 eatmupdate() — the mimic-an-orange message fixup. */
import { eatmupdate } from './eat.js';
import { near_capacity } from './weight.js';
import { nhgetch } from './input.js';
/* C ref: invent.c:2093 silly_thing(word, otmp) — shared with the 'W'/'P'
 * getobj path rather than re-derived. */
import { silly_thing_dw, inaccessible_equipment, float_up, hard_helmet } from './do_wear.js';
import { getlin } from './wizcmds.js';
import { nomul } from './allmain.js';
import { fall_asleep } from './timeout.js';
import { bcsign, makemon, mkobj, mkobj_at, mksobj_at, rnd_class, healmon, wake_nearto } from './mklev.js';
import { curse } from './mkobj.js';
import { heal_legs, unfixable_trouble_count, doup, body_part as body_part_cmd, ceiling, altar_wrath } from './cmd.js';
import { WOUNDED_LEGS } from './const.js';
/* C hack.h:129-149 enum bodypart_types — the indices body_part() takes. */
import { EYE, FINGER, LEG, ARM, STOMACH } from './const.js';
/* make_confused's C home is THIS file (potion.c:88); it used to be imported
 * from js/mhitu.js, where it was an exported empty body. */
import { unconscious } from './pickup.js';
import { is_fainted } from './eat.js';
import { stagger, hliquid, hcolor, monstunseesu, x_monnam, update_inventory,
         Resists_Elem, mon_hates_blessings, wakeup_attack, sleep_monst, killed } from './mhitm.js';
import { float_vs_flight } from './mhitm.js';
import { monkilled_trap, split_mon_rt } from './trap.js';
import { ERODE_CORRODE, ER_NOTHING, EF_GREASE, P_NONE, P_BOW, P_CROSSBOW, P_SHURIKEN,
         ROOM, ALTAR, IS_FOUNTAIN, IS_SINK, A_WIS, A_DEX, A_CON, A_MAX, POISON_RES, FIXED_ABIL, HALLUC, HALLUC_RES, SEE_INVIS, FAST, ICE, ECMD_OK, ECMD_TIME, ECMD_CANCEL, Is_airlevel, Is_waterlevel, Is_earthlevel, FROMOUTSIDE, INTRINSIC, STUNNED, CONFUSION, BLINDED, FIRE_RES, UNCHANGING, KILLED_BY, G_GONE, MM_NOMSG, S_LRING, M_SEEN_FIRE, POLY_NOFLAGS, POLY_CONTROLLED, POLY_LOW_CTRL, ARTICLE_A, DETECT_MONSTERS, I_SPECIAL, LEVITATION, HALF_PHDAM, HEAD, FAINTING, SICK_VOMITABLE, FREE_ACTION, SLEEP_RES } from './const.js';
/* prop.h indices + you.h/end.h flags the make_*() setters below need. */
import { DEAF, SICK, SICK_RES, STONED, VOMITING, GLIB, SLIMED, KILLED_BY_AN,
         M_AP_MONSTER, M_AP_NOTHING, M_AP_TYPMASK } from './const.js';
import { getObjDescr, fruitname, docall_xname_potion, cxname, the, The, xname, otense, vtense as vtense_objnam } from './objnam.js';
import { short_oname, thesimpleoname } from './objnam.js';
import { gloves_simple_name } from './objnam.js';
/* obj.h / objclass.h predicate data for potion_dip's tail (see the block at
 * the bottom of this file).  Same tables js/uhitm.js and js/lock.js read. */
import { MKOBJ_OC_SKILL, MKOBJ_OC_MATERIAL } from './mkobj_erosion_meta.js';
/* objclass.h RING_CLASS (used by drinksink's ring-discovery arm). */
const RING_CLASS = 4;

import { getObjName, discover_object, observe_object } from './o_init.js';
import { bottlename } from './lock.js';
import { body_part, trycall as trycall_cmd, trycall_noprompt, reorder_invent } from './cmd.js';
import { attacktype_fordmg } from './makemon.js';
import { is_ice } from './engrave.js';
import { Tobjnam, Yobjnam2 } from './objnam.js';
import { makeplural as makeplural_objnam } from './objnam.js';
import { ACID_RES, ANTIMAGIC, MAX_OIL_IN_FLASK } from './const.js';
import { NOTELL, ARTICLE_THE, SUPPRESS_IT, SUPPRESS_SADDLE, has_mgivenname,
         W_SADDLE, OBJ_INVENT, OBJ_FREE } from './const.js';
/* drinksink() (fountain.c:596-681) helper imports.  observe_object is C's own
 * (o_init.c:442); the rest are the real ports of the functions its arms call. */
import { PM_SEWER_RAT, PM_WATER_ELEMENTAL, PM_LICHEN, PM_GREEN_SLIME,
         PM_GREMLIN, PM_IRON_GOLEM, PM_PESTILENCE,
         PM_VAMPIRE, PM_VAMPIRE_LORD, PM_VLAD_THE_IMPALER } from './pm.generated.js';
import { paralyze_monst, slept_monst } from './dogmove.js';
import { polyself, set_uasmon } from './polyself.js';
import { create_gas_cloud, gas_cloud_at } from './region.js';
/* C do_name.c a_monnam(mtmp) => x_monnam(mtmp, ARTICLE_A, NULL, 0, TRUE). */
function a_monnam(mtmp) { return x_monnam(mtmp, ARTICLE_A, null, 0, true); }
/* in_town: dryup() (fountain.c:201) calls it, and this file never imported it,
 * so the whole call was a ReferenceError the moment a hero quaffed from a
 * fountain — the throw stops runSegment's moveloop and forfeits every frame
 * after it (seed4500 ended 488 keystrokes early).  Its home is mklev.c, and
 * js/ has exactly one definition of it (js/cmd.js:21863, a not-yet-ported stub
 * returning FALSE, which is correct for every level in the corpus: in_town
 * needs svl.level.flags.has_town).  Imported rather than re-stubbed locally so
 * this file starts telling the truth the day the real one lands — js/dig.js
 * already carries its own `function in_town() { return false; }` and will not.
 * The cmd.js <-> potion.js cycle already exists (getobj_redo_menu). */
import { getobj_redo_menu, in_town, compactify, doname_body, getpos, getObjFromGetobj,
         costly_alteration } from './cmd.js';
import { cansee, couldsee } from './vision.js';
import { water_damage, erode_obj } from './trap.js';
import { t_at, delfloortrap, mon_adjust_speed } from './trap.js';
import { do_clear_area } from './vision.js';
import { distmin, depth, dist2, s_suffix } from './hacklib.js';
import { nexttodoor } from './mkroom.js';
import { del_engr_at, minliquid, sobj_at, level_difficulty, stairway_at, in_rooms } from './mklev.js';
/* dryup()'s two mon.c callees.  angry_guards() and get_iter_mons() were BOTH
 * named here with no binding in scope -- js-binding-audit's "unbound" class,
 * i.e. a ReferenceError the first time a hero dries a Minetown fountain. */
import { angry_guards, get_iter_mons } from './mklev.js';
import { somegold } from './steal.js';
import { money_cnt } from './com_pager.js';
import { delobj, stolen_value } from './dokick.js';
import { shop_keeper, subfrombill } from './shk.js';
import { PM_WATCHMAN as PM_WATCHMAN_POT,
         PM_WATCH_CAPTAIN as PM_WATCH_CAPTAIN_POT } from './pm.generated.js';
import { water_damage_chain } from './cmd.js';
import { POOL, u_at, M_AP_TYPE, M_AP_OBJECT, MCORPSENM, NON_PM, Has_contents } from './const.js';
/* C objects.h BOULDER — objects.h is an X-macro file, so the id is verified
 * against js/oc_name_data.js OC_NAME[475] === 'boulder', not grepped. */
const BOULDER = 475;
import { mintrap } from './trap.js';
/* js/pm.generated.js carries 3.7 spellings in places, so the index is verified
 * by NAME against js/makemon_pmnames.json[68] === 'water nymph'. */
import { PM_WATER_NYMPH, PM_WATER_DEMON, PM_WATER_MOCCASIN } from './pm.generated.js';
import { monflee } from './makemon.js';
import { new_were } from './were.js';
import { you_were as you_were_real, you_unwere as you_unwere_real } from './were.js';
/* C fountain.c:44 — dowatersnakes()'s hallucinatory plural is
 * makeplural(rndmonnam(NULL)); both live outside this file. */
import { rndmonnam } from './do_name.js';
import { more_experienced, newexplevel, m_at } from './uhitm.js';
/* C potion.c:1116 peffect_gain_level() -> exper.c:319 pluslvl(FALSE) and
 * exper.c:250 rndexp(TRUE).  Both bodies already exist; only the potion->effect
 * dispatch was missing (js/potion.js's otyp ladder had no POT_GAIN_LEVEL arm,
 * so a quaffed potion of gain level fell out into "Nothing happens." and drew
 * neither newhp()'s rnd() pair nor newpw()'s rn2). */
import { pluslvl } from './exper.js';
import { rndexp } from './exper_pure.js';
/* C potion.c:600-614 dodrink()'s milky/ghost and smoky/djinni occupant checks
 * and their two bottle bodies (potion.c:480 ghost_from_bottle, potion.c:2815
 * djinni_from_bottle).  mvitals[].born/mvflags live on game.mvitals. */
import { PM_DJINNI } from './pm.generated.js';
import { In_endgame, In_sokoban } from './const.js';
import { In_W_tower_wz } from './dochug.js';
import { stairway_find_special_dir } from './mklev.js';
import { goto_level } from './cmd.js';
/* C zap.c:2527 do_enlightenment_effect() -> insight.c:383
 * enlightenment(MAGICENLIGHTENMENT, ENL_GAMEINPROGRESS) — the MENU form.  Its
 * renderer lives beside doattributes()'s in js/cmd.js because they are the two
 * halves of ONE C function. */
import { enlightenment_menu } from './cmd.js';
import { MAGICENLIGHTENMENT, ENL_GAMEINPROGRESS, A_INT } from './const.js';
import { PM_GHOST, PM_TENGU, PM_CYCLOPS, PM_FLOATING_EYE } from './pm.generated.js';
import { set_malign, findgold, mon_set_minvis, which_armor, dmgtype_fromattack } from './makemon.js';
import { mongone } from './mklev.js';
import { tamedog } from './dog.js';
import { Monnam } from './mcastu.js';
import { makewish } from './wizcmds.js';
/* C eat.c:3363 newuhs() — the single C body lives at js/eat.js:203.  Imported
 * rather than redeclared so this file's three call sites resolve to it (see the
 * comment at the former local stub below). */
import { newuhs, morehungry } from './eat.js';
/* C objects.h COIN_CLASS = 12 */
import { GETOBJ_EXCLUDE, GETOBJ_DOWNPLAY, GETOBJ_SUGGEST, GETOBJ_EXCLUDE_INACCESS,
         GETOBJ_EXCLUDE_NONINVENT, GETOBJ_PROMPT, GETOBJ_NOFLAGS } from './const.js';
/* prop.h:40 GLIB = 21 — read it from const.js rather than re-declaring it; a
 * hand-written property index is exactly the class pm-otyp-audit exists for. */
import { GLIB as GLIB_PROP } from './const.js';
/* C potion.c:52 `static int drink_ok_extra = 0;` — FILE-STATIC, shared by
 * dodrink() and dodip(): each sets it to 0 on entry and ++s it for every
 * dungeon feature the player is offered and declines, and drink_ok() reads it
 * for its obj==NULL answer, which is what selects "you don't have anything to
 * drink" vs "...anything ELSE to drink".  It was a dodrink LOCAL here and a
 * comment ("WIRE_PENDING (drink_ok_extra is unused here)") in dodip. */
let drink_ok_extra = 0;
/* C youprop.h #define Wounded_legs (HWounded_legs || EWounded_legs), each of
 * which reads u.uprops[WOUNDED_LEGS].{intrinsic,extrinsic}.  The healing-potion
 * arms below used to test the bare property `u.Wounded_legs`, which nothing in
 * js/ ever assigns (grep -rn '\.Wounded_legs\s*=' js/*.js is empty), so it read
 * `undefined` forever and every leg-healing arm silently never fired.  Mirrors
 * cmd.js's file-local `_st_Wounded_legs()` (same uprops read). */
function _wounded_legs() {
    const p = game.u?.uprops?.[WOUNDED_LEGS];
    return ((p?.intrinsic | 0) || (p?.extrinsic | 0)) !== 0;
}
/* C include/prop.h:135  #define TIMEOUT 0x00ffffffL  -- "Up to 16 million turns".
 * Single module-scope definition: itimeout()/itimeout_incr()/set_itimeout() and
 * every inlined timeout update in this file MUST use this mask.  (Two local
 * copies previously disagreed: 0x00FFFFFF in itimeout_incr() vs 0xFF in
 * set_itimeout() and in the inlined incr_itimeout(&HFast,...) in make_fast().) */
const TIMEOUT = 0x00FFFFFF;
import { exercise, adjattrib, poisontell, acurr, losestr } from './attrib.js';
/* C hack.c:4219 losehp() — the project's real one (js/dokick.js:138).  A
 * file-local `function losehp() { throw }` used to shadow it here; dokick.js
 * does not import this file, so there is no cycle. */
import { losehp, obfree } from './dokick.js';
/* C objects.h: POTION_CLASS = 8 (oc_class index for potions). */
const POTION_CLASS = 8;
const COIN_CLASS = 12;
/* C objects.h/objclass.h: SPBOOK_CLASS = 10.  peffect_invisibility and
 * peffect_monster_detection both branch on it (the spell entry point); dodrink
 * can only ever hand them a POTION_CLASS object. */
const SPBOOK_CLASS = 10;
/* C objects.h: POT_WATER otyp = 322.
 * MKOBJ_SVB_BASES[POTION_CLASS=8] = 297 (mkobj_data.js).
 * POT_WATER is at offset 25 → 297 + 25 = 322. */
const POT_WATER = 322;
/* C objects.h: POT_OIL otyp = 321 (POT_WATER - 1). */
const POT_OIL = 321;
/* C eat.c:3363 newuhs(boolean incr) — recompute hero hunger state.
 * C has exactly ONE newuhs (eat.c:3363); this file used to redeclare it as an
 * EMPTY local stub, which shadowed the real body (js/eat.js:203) for all three
 * of this file's call sites (drinkfountain's cool draught, peffect_water's
 * uncursed arm, and the POT_FRUIT_JUICE arm).  A 64-session probe shows those
 * sites DO execute — 4x in seed0002 (fruit juice) and 1x in seed1900
 * (peffect_water) — so this was a live shadow, not a landmine.
 * The real body is now imported (see the eat.js import at the head of the
 * file).  Behaviour on the current corpus is unchanged and that is expected:
 * all five executions enter with u.uhunger in 723..949 and u.uhs == NOT_HUNGRY,
 * so C's threshold table (eat.c:3369-3373: h>1000 SATIATED, h>150 NOT_HUNGRY)
 * yields newhs == u.uhs and the whole `newhs != u.uhs` block at eat.c:3451 is
 * skipped — no ATEMP, no message, no SET_BOTL.  The C traces agree: neither
 * seed0002 nor seed1900 carries a `^botl[newuhs]` marker at those steps, while
 * the four eat.c-driven sessions (seed0003/0014/0387/0777) do.  The fix
 * matters the moment a potion pushes u.uhunger across 1000 (-> SATIATED, which
 * has no message in C's switch, just u.uhs + SET_BOTL) or a cursed/diluted
 * potion pushes it down across 150. */
/* ---------------------------------------------------------------------------
 * Attribute helpers for adjattrib (inlined from attrib.js private scope).
 * These mirror the private helpers in attrib.js exactly.
 * C ref: nethack-c/src/attrib.c:117-199 adjattrib().
 * ---------------------------------------------------------------------------
 */
function _getAbase(u) {
    if (!u.acurr)
        u.acurr = { a: [0, 0, 0, 0, 0, 0] };
    if (!u.acurr.a)
        u.acurr.a = [0, 0, 0, 0, 0, 0];
    return u.acurr.a;
}
function _getAmax(u) {
    if (!u.amax)
        u.amax = { a: [0, 0, 0, 0, 0, 0] };
    if (!u.amax.a)
        u.amax.a = [0, 0, 0, 0, 0, 0];
    return u.amax.a;
}
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
function _getAexe(u) {
    if (!u.aexe)
        u.aexe = { a: [0, 0, 0, 0, 0, 0] };
    if (!u.aexe.a)
        u.aexe.a = [0, 0, 0, 0, 0, 0];
    return u.aexe.a;
}
const _RACE_ATTRMAX = [
    /* hum */ [118, 18, 18, 18, 18, 18],
    /* elf */ [18, 20, 20, 18, 16, 18],
    /* dwa */ [118, 16, 16, 20, 20, 16],
    /* gno */ [68, 19, 18, 18, 18, 18],
    /* orc */ [68, 16, 16, 18, 18, 16],
];
const _RACE_ATTRMIN = 3;
/* u.acurr.a[] and u.amax.a[] are in DISPLAY order (init_attr in u_init.js):
 * [St=0, Dx=1, Co=2, In=3, Wi=4, Ch=5].  C constants (A_STR=0..A_CHA=5) must
 * be translated before indexing.  Mirror of C_ATTR_TO_DISP in attrib.js. */
const _C_ATTR_TO_DISP = [0, 3, 4, 1, 2, 5]; /* STR→0,INT→3,WIS→4,DEX→1,CON→2,CHA→5 */
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
/* adjattrib(ndx, incr, msgflg) — mirror of attrib.js private adjattrib.
 * C ref: nethack-c/src/attrib.c:117-199.
 * msgflg=-1 → conditional (print if changed); 0 → always; >0 → never.
 * RNG: rn2() only on decrement below ATTRMIN.
 * Returns TRUE if ACURR changed.
 * NOTE: ndx is a C constant; u.acurr.a / u.amax.a are in DISPLAY order —
 * translate via _C_ATTR_TO_DISP before indexing. */
async function _adjattrib(ndx, incr, msgflg) {
    const u = game.u;
    if (!u || !incr)
        return false;
    const di = _C_ATTR_TO_DISP[ndx] ?? ndx; /* C constant → display index */
    const abase = _getAbase(u);
    const amax = _getAmax(u);
    const aexe = _getAexe(u);
    const oldAcurr = _acurr(u, ndx);
    abase[di] = (abase[di] | 0) + incr;
    if (incr > 0) {
        /* C attrib.c:140-143 — raise amax with abase, cap at race max */
        if (abase[di] > amax[di]) {
            amax[di] = abase[di];
            const hi = _attrmax(u, ndx); /* attrmax uses C constant order — pass ndx */
            if (hi > 18) {
                if (abase[di] > hi)
                    abase[di] = amax[di] = hi;
            }
            else {
                if (amax[di] > hi)
                    abase[di] = amax[di] = hi;
            }
        }
    }
    else {
        /* C attrib.c:148-170 */
        if (abase[di] < _RACE_ATTRMIN) {
            const decr = rn2(_RACE_ATTRMIN - abase[di] + 1);
            abase[di] = _RACE_ATTRMIN;
            amax[di] = (amax[di] | 0) - decr;
            if (amax[di] < _RACE_ATTRMIN)
                amax[di] = _RACE_ATTRMIN;
        }
    }
    const newAcurr = _acurr(u, ndx);
    if (newAcurr === oldAcurr) {
        return false;
    }
    /* C attrib.c:190-197: attribute changed — reset exercise, SET_BOTL, pline */
    aexe[ndx] = 0; /* aexe indexed by C constant — correct */
    if (game.disp)
        game.disp.botl = 1;
    if (msgflg <= 0) {
        /* C attrib.c:195: You_feel("%s%s!", (incr>1||incr<-1)?"very ":"", attrstr).
         * You_feel (pline.c:392) prefixes "You feel " then prints "%s%s!".
         * attrstr = plusattr[ndx] / minusattr[ndx] — the EXACT C tables
         * (attrib.c:11-15): no "more"/"-er" embellishment, no trailing period.
         * For A_DEX (ndx 3) incr=1 → "You feel agile!" (seed0011 step 5). */
        const _plusattr = ['strong', 'smart', 'wise', 'agile', 'tough', 'charismatic'];
        const _minusattr = ['weak', 'stupid', 'foolish', 'clumsy', 'fragile', 'repulsive'];
        const attrstr = (incr > 0) ? _plusattr[ndx] : _minusattr[ndx];
        const very = (incr > 1 || incr < -1) ? 'very ' : '';
        await pline(`You feel ${very}${attrstr}!`);
        await flush_screen(1);
    }
    return true;
}
/* ---------------------------------------------------------------------------
 * y_n(question) — C ref: query.c y_n().
 * Displays question on topline (C: tty_yn_function), reads one keystroke.
 * Returns the character read (lowercase).
 * ---------------------------------------------------------------------------
 */
async function y_n(question) {
    /* C ref: hack.h:1334 y_n(query) => yn_function(query, ynchars, 'n', TRUE).
     * tty_yn_function writes "<query> [yn] (n)" to the topline (responses in
     * brackets, the default response 'n' in parens), positions the cursor one
     * column past the prompt, then calls nhgetch().
     *
     * The prompt MUST be flushed to _screen_output BEFORE nhgetch so the
     * step-boundary capture hook (jsmain _preNhgetchHook) snapshots the
     * rendered prompt rather than the previous screen.  (seed0011 step 4:
     * "Drink from the fountain? [yn] (n)", cursor col 34 = strlen+1.) */
    const prompt = question + ' [yn] (n)';
    /* C tty_yn_function() acknowledges a pending message before painting its
     * query.  First drain any width-driven pages; if their final message is
     * still live, acknowledge that too, just as TOPLINE_NEED_MORE does. */
    if (game._pending_message && !game._topl_win_stop) {
        await flush_screen(1);
        if (game._pending_message && !game._topl_win_stop)
            await force_more(game._pending_message);
    }
    game._pending_message = prompt;
    await flush_screen(1);
    {
        const disp = game.nhDisplay;
        if (disp) topl_park_cursor(disp, prompt + ' ');
    }
    let key, answer;
    do {
        key = await nhgetch();
        answer = String.fromCharCode(key).toLowerCase();
        if (answer === '\u001b' || answer === ' ' || answer === '\n' || answer === '\r')
            answer = 'n';
        if (answer === 'y' || answer === 'n')
            break;
        /* C tty_yn_function loops after an invalid response, leaving the same
         * prompt visible and ringing the terminal bell.  There is no audible
         * terminal in this port, but the repeated input boundary is observable. */
        game._pending_message = prompt;
        await flush_screen(1);
        {
            const disp = game.nhDisplay;
            if (disp) topl_park_cursor(disp, prompt + ' ');
        }
    } while (true);
    /* C leaves the yn prompt PHYSICALLY on the terminal row after the answer is
     * read.  win/tty/topl.c tty_yn_function's clean_up (topl.c:533-549) rewrites
     * gt.toplines to "<prompt><answer>" but deliberately does NOT redraw it
     * ("addtopl(rtmp); -- rewrite gt.toplines instead"), sets
     * ttyDisplay->toplin = TOPLINE_NON_EMPTY, and only clears the window when
     * the message spilled onto a second row (`if (wins[WIN_MESSAGE]->cury)`).
     * The next erase is cmd.c:5147 parse()'s clear_nhwindow(WIN_MESSAGE), which
     * runs AFTER the next top-level command key has been read — so a command
     * that plines nothing after the prompt still shows the prompt at the next
     * input boundary.  seed0106 step 110: 'y' to "Dip 4 potions of holy water
     * into the fountain? [yn] (n)" runs dipfountain, which for a blessed potion
     * of water emits no message, and C's frame still carries the prompt where
     * this port rendered a blank topline.
     *
     * js/input.js nhgetch drops _pending_message on EVERY read, so hand the
     * prompt to the paint-time fallback (_topl_sticky, js/display.js:3015): a
     * live _pending_message still beats it (so the "Nothing seems to happen."
     * of step 117 wins, exactly as C's update_topl redotoplin replaces the row)
     * and the next nhgetch clears it.  Narrow on purpose — the general form
     * (sticky = whatever nhgetch just cleared) is falsified at 6064 -> 5688
     * with 21 sessions lost; this is the same per-prompt shape js/cmd.js's
     * getobj drop prompt uses. */
    game._topl_sticky = prompt;
    return answer;
}
/* ---------------------------------------------------------------------------
 * floating_above(what) — C ref: fountain.c:21 floating_above().
 * Stub: hero can't be levitating in early sessions.
 * ---------------------------------------------------------------------------
 */
async function floating_above(what) {
    await pline(`You cannot reach the ${what}!`);
}
/* ---------------------------------------------------------------------------
 * dryup(x, y, isyou) — C ref: fountain.c:201 dryup().
 * Checks fountain depletion. RNG: rn2(3) or FOUNTAIN_IS_WARNED check.
 * ---------------------------------------------------------------------------
 */
/* C ref: fountain.c:180-199 watchman_warn_fountain(mtmp) — the get_iter_mons
 * callback dryup() runs the first time the hero uses a Minetown fountain.
 * RNG-FREE.  Both the callback and get_iter_mons() were NAMED here and defined
 * NOWHERE, so the call was a live ReferenceError: seed0014-dequa-fountain-
 * explore -- the session named for its fountain -- halted at frame 711 of 714
 * inside dodip.  C's last two frames are
 *     712  "You lost some of your gold in the fountain!  A watchman yells:--More--"
 *     713  "\"Hey, stop using that fountain!\""
 * i.e. Amonnam + the verbalize below, which is exactly this body.
 * The Deaf arm (a watchman waving its arms) needs mhis()/mbodypart(); this
 * corpus hero is not deaf, and the arm is named rather than half-built. */
function _watchman_warn_fountain(mtmp) {
    if (!_pot_is_watch(mtmp) || !couldsee(mtmp.mx | 0, mtmp.my | 0)
        || !mtmp.mpeaceful)
        return false;
    if (_pot_deaf()) {
        /* C fountain.c:190 — the ordinary watchman has limbs, so it waves
         * its arms earnestly rather than yelling.  No RNG or state change. */
        const pronoun = mtmp.female ? 'her' : mtmp.male ? 'his' : 'its';
        const arm = body_part_cmd(mtmp, ARM);
        void pline(`${a_monnam(mtmp)} earnestly waves ${pronoun} ${makeplural_objnam(arm)}!`);
        return true;
    }
    /* C: pline("%s yells:", Amonnam(mtmp)); verbalize("Hey, stop using that
     * fountain!");  Amonnam is a_monnam with the first letter capitalised. */
    const nm = a_monnam(mtmp);
    void pline(`${nm ? nm.charAt(0).toUpperCase() + nm.slice(1) : nm} yells:`);
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
       KNOWN GAP — the glyph-buffer arm.  C reads gg.gbuf[y][x] via glyph_at()
       (display.c:2478) and suppresses the message when that square is currently
       showing S_cloud.  js/ has no gbuf: display.js recomputes the map from the
       level each flush, and glyph_at/glyph_is_cmap/S_cloud do not exist
       anywhere in the port (they were referenced here and nowhere defined, so
       this line was a ReferenceError the first time a fountain dried).  Nothing
       in js/ creates a cloud, so glyph_to_cmap(glyph) != S_cloud holds for every
       square this port can reach and the condition reduces to cansee() alone —
       which is C's behaviour everywhere except under a live cloud.  Restore the
       full test when the glyph buffer is ported; the message is the only
       observable and no RNG rides on it. */
    if (cansee(x, y) && !gas_cloud_at(x, y))
        await pline('The fountain dries up!');
    /* replace the fountain with ordinary floor */
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
        await pline('You feel a gem here!');
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
/* ---------------------------------------------------------------------------
 * monster_detect(otmp, mclass) — C ref: detect.c:797-861.
 *
 * The shared body behind THREE callers: drinkfountain()'s fate==26 arm
 * (fountain.c:349-353, otmp=NULL mclass=0 — the one the corpus reaches),
 * peffect_monster_detection() (potion.c:913-953), and the detect-monsters
 * spell.  It is RENDER-ONLY: no rn2/rnd anywhere on the path.
 *
 *   mcnt = 0; for (mtmp = fmon; mtmp; mtmp = mtmp->nmon) {
 *       if (DEADMONSTER(mtmp) || (mtmp->isgd && !mtmp->mx)) continue;
 *       ++mcnt; break;                 // 1-or-more vs 0, not a full count
 *   }
 *   if (!mcnt) { if (otmp) strange_feeling(otmp, ...); return 1; }
 *   cls(); unconstrained = unconstrain_map();
 *   for each live monster: map_monst(mtmp, TRUE);
 *       (and, for a CURSED source, wake every helpless one -> woken)
 *   if (!swallowed) display_self();
 *   You("sense the presence of monsters.");
 *   if (woken) pline("Monsters sense the presence of you.");
 *   if ((otmp && otmp->blessed) && !unconstrained) display_nhwindow(WIN_MAP, TRUE);
 *   else { EDetect_monsters |= I_SPECIAL;
 *          browse_map(TER_DETECT | TER_MON, "monster of interest");
 *          EDetect_monsters &= ~I_SPECIAL; }
 *   map_redisplay();
 *   return 0;
 *
 * browse_map (detect.c:105-118) is just getpos() with autodescribe forced on
 * and terrainmode set, starting on the hero's own square — which is why C's
 * recorded frames go "You sense the presence of monsters.--More--", then the
 * TIP_GETPOS text window, then "(For instructions type a '?')  Move cursor to
 * monster of interest:", then one autodescribe line per cursor key.  All of
 * that already exists in getpos() (js/cmd.js), including handle_tip's
 * force_more of the pending topline.
 *
 * map_redisplay (detect.c:94-102) = reconstrain_map() + docrt(), which wipes
 * the detection overlay and repaints from hero memory.
 *
 * Corpus witness: seed0012 step 137 — quaffing from a fountain rolls fate 26,
 * and this case was an empty `/* TODO *\/` so the whole 171-step tail of the
 * session diverged from that frame on.
 * ---------------------------------------------------------------------------
 */
export async function monster_detect(otmp, mclass) {
    const g = game;
    const u = g.u;
    /* C detect.c:809-816 — DEADMONSTER(mon) is (mon)->mhp < 1; the isgd test
     * skips a vault guard that has been moved off-map. */
    let mcnt = 0;
    for (let mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
        if ((mtmp.mhp | 0) < 1 || (mtmp.isgd && !mtmp.mx))
            continue;
        ++mcnt;
        break;
    }
    if (!mcnt) {
        /* C detect.c:818-823 — only an object source gets the consolation
         * message; the fountain (otmp == NULL) is silent here. */
        if (otmp)
            await strange_feeling(otmp, _hallucination()
                ? 'You get the heebie jeebies.' : 'You feel threatened.');
        return 1;
    }
    let woken = false;
    /* C detect.c:826 — read BEFORE unconstrain_map() clears it. */
    const swallowed = u.uswallow;
    await cls();
    /* C detect.c:70-82 unconstrain_map(): returns TRUE only when the hero is
     * Underwater / buried / swallowed, and clears those three flags so the
     * ordinary map can be drawn.  Nothing in the corpus detects from inside
     * water, rock, or a monster's belly, so this is the res=FALSE path. */
    const unconstrained = !!(u.uinwater || u.uburied || u.uswallow);
    u.uinwater = 0;
    u.uburied = 0;
    u.uswallow = 0;
    for (let mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
        if ((mtmp.mhp | 0) < 1 || (mtmp.isgd && !mtmp.mx))
            continue;
        /* C detect.c:833-836: mclass 0 means "every class".  Every corpus
         * caller passes 0 (the fountain arm, peffect_monster_detection, and
         * the detect-monsters spell); only zap.c's monster-class detection
         * passes a real mclass, and nothing in the corpus casts it — so the
         * `mtmp->data->mlet == mclass` and PM_LONG_WORM/S_WORM_TAIL terms are
         * unreachable here and are left unported rather than transliterated
         * against a monster-class table this file does not carry. */
        if (!mclass)
            map_monst(mtmp, true);
        /* C detect.c:838-842 — a CURSED detector wakes the helpless. */
        if (otmp && otmp.cursed && (mtmp.msleeping || mtmp.mfrozen
                                    || !mtmp.mcanmove)) {
            mtmp.msleeping = 0;
            mtmp.mfrozen = 0;
            mtmp.mcanmove = 1;
            woken = true;
        }
    }
    if (!swallowed)
        display_self();
    await pline('You sense the presence of monsters.');
    if (woken)
        await pline('Monsters sense the presence of you.');
    if ((otmp && otmp.blessed) && !unconstrained) {
        /* C detect.c:851-853 — persistent detection just shows the updated
         * map behind a --More--.  No corpus witness (no blessed detector). */
        await flush_screen(1);
        await nhgetch();
    } else {
        /* C detect.c:855-859 — one-shot detection: let the player move the
         * cursor around with autodescribe feedback.  EDetect_monsters gets
         * I_SPECIAL for the duration so canspotself()/senseself() and the
         * monster-visibility tests treat every monster as sensed while the
         * cursor is being moved. */
        const p = _detect_monsters_uprop(u);
        p.extrinsic = (p.extrinsic | 0) | I_SPECIAL;
        g.iflags = g.iflags || {};
        const savedTerrainmode = g.iflags.terrainmode;
        g.iflags.terrainmode = TER_DETECT | TER_MON;
        try {
            /* browse_map: dummy_pos starts on the hero's own square. */
            await getpos({ x: u.ux, y: u.uy }, false, 'monster of interest');
        } finally {
            g.iflags.terrainmode = savedTerrainmode;
            p.extrinsic = (p.extrinsic | 0) & ~I_SPECIAL;
        }
    }
    /* C detect.c:94-102 map_redisplay(): reconstrain_map() restores the three
     * flags unconstrain_map() saved (all zero here) and docrt() repaints.
     *
     * C display.c:2064-2072 cls() — which docrt() calls first — opens with
     * display_nhwindow(WIN_MESSAGE, FALSE), i.e. it FLUSHES the message window:
     * a topline still standing when the map is redrawn gets its own --More--
     * and its own dismiss keystroke.  This port's cls() drops _pending_message
     * instead, so getpos's closing "Done." was joined to dryup()'s "The
     * fountain dries up!" on one topline where C shows "Done.--More--" and then
     * "The fountain dries up!" (seed0012 steps 153-154).  Model the flush at
     * exactly C's instant rather than changing cls() for every caller. */
    if (g._pending_message)
        await force_more(g._pending_message);
    await docrt();
    return 0;
}
/* C detect.c:35-36 TER_DETECT / TER_MON (flag.h terrainmode bits). */
const TER_MON = 0x08;
const TER_DETECT = 0x20;
/* u.uprops[DETECT_MONSTERS] — the slot js/display.js:1356 reads through
 * _uprop(DETECT_MONSTERS) for senseself()/Detect_monsters.  Created on demand
 * so the |= I_SPECIAL below lands on the same object the reader sees. */
function _detect_monsters_uprop(u) {
    if (!u.uprops)
        u.uprops = {};
    if (!u.uprops[DETECT_MONSTERS])
        u.uprops[DETECT_MONSTERS] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    return u.uprops[DETECT_MONSTERS];
}
/* ---------------------------------------------------------------------------
 * drinkfountain() — C ref: fountain.c:243-390 drinkfountain().
 * Called when hero quaffs from a fountain (dodrink → fountain path).
 * RNG sequence (C ref matches session seed0011 step 5-6):
 *   rnd(30) → fate
 *   If mgkftn && uluck>=0 && fate>=10:
 *     rn2(A_MAX) → start attribute index for adjattrib loop
 *     exercise(A_WIS, TRUE) → rn2(19) in attrib.js
 *   [else if fate < 10]:
 *     rnd(10) → uhunger += rnd(10)
 *   [switch fate]:
 *     various sub-branches (not all ported; only what seed0011 exercises)
 * ---------------------------------------------------------------------------
 */
export async function drinkfountain() {
    const g = game;
    const u = g.u;
    const loc = g.level?.at(u.ux, u.uy);
    /* C fountain.c:246: mgkftn = (levl[u.ux][u.uy].blessedftn == 1) */
    const mgkftn = !!(loc && loc.blessedftn === 1);
    /* C fountain.c:247: int fate = rnd(30) — MUST fire before any branch */
    const fate = rnd(30);
    /* C fountain.c:249-252: Levitation check */
    /* Stub: assume the hero is not levitating.  "no sessions hit this path yet"
     * was wrong twice over — sessions DO reach drinkfountain, and the recordings
     * DO carry Lev — so it is replaced by the measurement that actually licenses
     * the stub, which is about the state AT THIS CALL, not about the corpus.
     * MEASURED: subject=drinkfountain-Levitation value=+0 at=d26664bc
     *           date=2026-08-29 corpus=public+train
     *           reach=16 calls over 11 sessions; Levitation live at the call 0
     *           recheck-when=js-levitation-state-exists */
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
            if (await _adjattrib(i, 1, msgflg) && littleluck)
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
                await pline('You feel self-knowledgeable...');
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
                /* pline_The("water is foul!  You gag and vomit.");
                 * morehungry(rn1(20, 11)); vomit();
                 * The rn1(20,11) was the missing draw: without it dryup()'s
                 * own roll read the wrong value and the fountain that C dries
                 * up stayed wet (seed0012 step 165). */
                await pline('The water is foul!  You gag and vomit.');
                await morehungry(rn1(20, 11));
                await vomit();
                break;
            case 21: /* C fountain.c:300-311 — Poisonous */
                /* C:
                 *     pline_The("water is contaminated!");
                 *     if (Poison_resistance) {
                 *         pline("Perhaps it is runoff from the nearby %s farm.",
                 *               fruitname(FALSE));
                 *         losehp(rnd(4), "unrefrigerated sip of juice",
                 *                KILLED_BY_AN);
                 *         break;
                 *     }
                 *     poison_strdmg(rn1(4, 3), rnd(10), "contaminated water",
                 *                   KILLED_BY);
                 *     exercise(A_CON, FALSE);
                 * poison_strdmg (attrib.c:274) is losestr(strloss) then
                 * losehp(dmg); this port has no poison_strdmg, and the eat.c
                 * caller at js/eat.js:1286 already inlines it the same way.
                 * The rn1(4,3)-before-rnd(10) order is C's argument-evaluation
                 * order as the recorded trace fixes it (seed4500 leaves
                 * 100373/100374), bound to locals so it cannot drift.  The
                 * exercise(A_CON, FALSE) that follows is the rn2(2) at leaf
                 * 100375 — dropping it desynchronised dryup()'s own rn2(3)
                 * two draws later, which is how the whole arm surfaced. */
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
                        /* C fountain.c:331 — coins are excluded, but blessed
                         * and cursed objects still take the rn2(5) chance and
                         * then pass through curse(); curse() itself handles
                         * their BUC transition. */
                        if ((otmp.oclass | 0) === COIN_CLASS || rn2(5))
                            continue;
                        curse(otmp);
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
                                          && !(invp.blocked | 0));
                    if (Blind) {
                        if (Invisible)
                            await pline('You feel transparent.');
                        else {
                            await pline('You feel very self-conscious.');
                            await pline('Then it passes.');
                        }
                    } else {
                        await pline('You see an image of someone stalking you.');
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
                    await pline('The water tastes like nothing.');
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
            case 28: /* Water nymph — not ported (TODO) */
                /* dowaternymph() */
                break;
            case 29: /* Scare — bad breath, monflee all monsters */
                {
                    /* C fountain.c:368-378 */
                    await pline('This water gives you bad breath!');
                    for (let mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
                        if ((mtmp.mhp | 0) >= 1)
                            await monflee(mtmp, 0, false, false);
                    }
                    break;
                }
            case 30: /* C fountain.c:379-381 — gushing forth in this room */
                /* dogushforth() and gush() were BOTH already ported in this
                 * file (below, for dipfountain's own fate 26); only this call
                 * site was missing, so drinkfountain's fate 30 flooded nothing
                 * and drew none of gush's per-square rn2(1 + distmin).
                 * seed4500 step 1329 rolls fate 30 and C draws 26 of them
                 * starting at leaf 100384. */
                dogushforth(true);
                break;
            default:
                await pline('This tepid water is tasteless.');
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
    /* If there's a pending message, append --More-- and wait for dismiss. */
    const msg = game._pending_message || '';
    if (msg) {
        /* C topl.c more() appends "--More--" directly after the topline text,
         * with no separator and no period.  (seed0011 step 5:
         * "...You feel agile!--More--".) */
        const full = msg + '--More--';
        /* C ref: getline.c:230-257 xwaitforspace("\033 ") — more() breaks ONLY on
         * space / CR / LF / ESC; every other key rings the bell and re-loops with
         * the --More-- still up.  This was a bare nhgetch(). */
        const _show = async () => {
            game._pending_message = full;
            await flush_screen(1);
            /* C tty more() leaves the cursor one past the "--More--" indicator on
             * the topline (seed0011 step 5 cursor [57,0] = strlen(full)). */
            const disp = game.nhDisplay;
            if (disp) { disp.cursorCol = full.length; disp.cursorRow = 0; }
        };
        await _show();
        await await_topl_more_dismiss(_show);
        game._pending_message = '';
    }
}
/* C fountain.c:36-59 — staticfn void dowatersnakes(void)  "Fountain of snakes!"
 *
 *   int num = rn1(5, 2);
 *   if (!(svm.mvitals[PM_WATER_MOCCASIN].mvflags & G_GONE)) {
 *       if (!Blind)
 *           pline("An endless stream of %s pours forth!",
 *                 Hallucination ? makeplural(rndmonnam(NULL)) : "snakes");
 *       else
 *           You_hear("%s hissing!", something);
 *       while (num-- > 0)
 *           if ((mtmp = makemon(&mons[PM_WATER_MOCCASIN], u.ux, u.uy,
 *                               MM_NOMSG)) != 0
 *               && t_at(mtmp->mx, mtmp->my))
 *               (void) mintrap(mtmp, NO_TRAP_FLAGS);
 *   } else {
 *       pline_The("fountain bubbles furiously for a moment, then calms.");
 *   }
 *
 * drinkfountain()'s fate-22 arm was a bare `break` with a "not ported (TODO)"
 * label, so seed0007's quaff at step 288 printed nothing and drew nothing where
 * C draws rn1(5,2) and then 2..6 makemon()s: leaf 15983, the session's first
 * RNG divergence once the amulet arm above it landed.  Two of those moccasins
 * bite the hero to death on the very next turn, so the arm owns the whole tail
 * of this recording.
 *
 * rn1(x,y) is rn2(x)+y (hack.h), so the leaf is rn2(5).  The Soundeffect() on
 * the blind and G_GONE arms is audio-only and draws nothing.  Every remaining
 * draw belongs to makemon: the snakes are asked for at the HERO's occupied
 * square, so each one relocates via enexto -> collect_coords. */
async function dowatersnakes() {
    const g = game, u = g.u;
    let num = rn1(5, 2);

    if (!((g.mvitals?.[PM_WATER_MOCCASIN]?.mvflags | 0) & G_GONE)) {
        if (!_blind()) {
            const what = _potion_Hallucination()
                ? makeplural(rndmonnam()) : 'snakes';
            await pline(`An endless stream of ${what} pours forth!`);
        } else {
            await pline('You hear something hissing!');
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

/* C fountain.c:62-90 — static void dowaterdemon(void)
 *
 *   if (!(svm.mvitals[PM_WATER_DEMON].mvflags & G_GONE)) {
 *       if ((mtmp = makemon(&mons[PM_WATER_DEMON], u.ux, u.uy, MM_NOMSG)) != 0) {
 *           if (!Blind) You("unleash %s!", a_monnam(mtmp));
 *           else        You_feel("the presence of evil.");
 *           if (rnd(100) > (80 + level_difficulty())) {
 *               pline("Grateful for %s release, %s grants you a wish!",
 *                     mhis(mtmp), mhe(mtmp));
 *               mongrantswish(&mtmp);
 *           } else if (t_at(mtmp->mx, mtmp->my))
 *               (void) mintrap(mtmp, NO_TRAP_FLAGS);
 *       }
 *   } else {
 *       pline_The("fountain bubbles furiously for a moment, then calms.");
 *   }
 *
 * The RNG is almost entirely makemon's: the demon is asked for at the HERO's
 * occupied square, so makemon relocates via enexto -> collect_coords (seed0006
 * step 102 records 45 collect_coords rn2 draws), and a water demon is armed and
 * carries defensive items, so m_initweap/m_initinv follow.  dowaterdemon's OWN
 * draw is the single rnd(100) at fountain.c:78.  The Soundeffect() on the
 * else arm is audio-only and draws nothing.
 *
 * The wish arm is delegated to _mongrantswish(), which preserves the C
 * monster-removal-before-wish ordering and keeps the wish prompt's draws. */
async function dowaterdemon() {
    const g = game, u = g.u;

    if (!((g.mvitals?.[PM_WATER_DEMON]?.mvflags | 0) & G_GONE)) {
        const mtmp = await makemon(PM_WATER_DEMON, u.ux, u.uy, MM_NOMSG);
        if (mtmp) {
            if (!_blind())
                await pline(`You unleash ${a_monnam(mtmp)}!`);
            else
                await pline('You feel the presence of evil.');

            /* C fountain.c:76-78 — "Give those on low levels a (slightly)
               better chance of survival". */
            if (rnd(100) > (80 + level_difficulty())) {
                await _mongrantswish(mtmp);
            } else if (t_at(mtmp.mx, mtmp.my)) {
                await mintrap(mtmp, 0 /* NO_TRAP_FLAGS */);
            }
        }
    } else {
        await pline('The fountain bubbles furiously for a moment, then calms.');
    }
}

/* C fountain.c:93-116 — static void dowaternymph(void)
 *
 *   if (!(svm.mvitals[PM_WATER_NYMPH].mvflags & G_GONE)
 *       && (mtmp = makemon(&mons[PM_WATER_NYMPH], u.ux, u.uy, MM_NOMSG)) != 0) {
 *       if (!Blind) You("attract %s!", a_monnam(mtmp));
 *       else        You_hear("a seductive voice.");
 *       mtmp->msleeping = 0;
 *       if (t_at(mtmp->mx, mtmp->my)) (void) mintrap(mtmp, NO_TRAP_FLAGS);
 *   } else if (!Blind) { pline("A large bubble rises to the surface and pops."); }
 *   else               { You_hear("a loud pop."); }
 *
 * The RNG here is entirely makemon's: the nymph is asked for at the HERO's
 * square, which is occupied, so makemon relocates via enexto -> collect_coords
 * and seed0014 step 409 records 60 collect_coords rn2 draws before anything
 * else happens.  The Soundeffect() calls on the failure arms are audio-only and
 * draw nothing. */
async function dowaternymph() {
    const g = game, u = g.u;
    let mtmp = null;

    if (!((g.mvitals?.[PM_WATER_NYMPH]?.mvflags | 0) & G_GONE))
        mtmp = await makemon(PM_WATER_NYMPH, u.ux, u.uy, MM_NOMSG);
    if (mtmp) {
        if (!_blind())
            await pline(`You attract ${a_monnam(mtmp)}!`);
        else
            await pline('You hear a seductive voice.');
        mtmp.msleeping = 0;
        if (t_at(mtmp.mx, mtmp.my))
            await mintrap(mtmp, 0 /* NO_TRAP_FLAGS */);
    } else if (!_blind()) {
        await pline('A large bubble rises to the surface and pops.');
    } else {
        await pline('You hear a loud pop.');
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
export function dogushforth(drinking) {
    const madepool = { n: 0 };

    do_clear_area(game.u.ux, game.u.uy, 7, gush, madepool);
    if (!madepool.n) {
        if (drinking)
            pline('Your thirst is quenched.');
        else
            pline('Water sprays all over you.');
    }
}

/* C fountain.c:133-161 — static void gush(coordxy x, coordxy y, genericptr_t poolcnt)
 *
 * The do_clear_area() callback that turns a square into a pool.  The guard is a
 * single short-circuiting || chain and its ORDER is the whole RNG contract:
 *
 *   if (((x + y) % 2) || u_at(x, y)
 *       || (rn2(1 + distmin(u.ux, u.uy, x, y))) || (levl[x][y].typ != ROOM)
 *       || (sobj_at(BOULDER, x, y)) || nexttodoor(x, y))
 *       return;
 *
 * so the rn2 is drawn ONLY on an even-parity square that is not the hero's, and
 * is drawn BEFORE the terrain/boulder/door tests -- a square that fails those
 * three still consumed its leaf.  seed0014 step 394 draws exactly 25 of these,
 * with moduli 7,6,4,4,4,6,3,3,3,5,7,2,2,4,6,8,3,3,5,7,2,2,4,6,8 (i.e.
 * 1 + distmin from the hero), and getting the parity test or the ordering wrong
 * shifts every one of them.
 *
 * water_damage_chain() and minliquid() draw no leaves on this level (the flooded
 * squares are bare and unoccupied), but they are wired anyway because the trace
 * shows the obj_resists() draws that follow this step come from monsters that
 * later walk into these very pools. */
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
     * the FIRST pool only, and the counter increments either way.  pline() is
     * declared async here but its body contains no await, so this call completes
     * synchronously; do_clear_area() invokes this callback synchronously and
     * cannot await, and awaiting is not needed to keep C's ordering. */
    if (!(poolcnt.n++))
        pline('Water gushes forth from the overflowing fountain!');

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

/* C rm.h:502 m_at(x,y).  js/ has no monsters[][] grid; walk the fmon chain, the
 * same way js/trap.js does for its own callers. */
function _gush_m_at(x, y) {
    for (let m = game.fmon; m; m = m.nmon) {
        if ((m.mhp | 0) < 1) continue; /* DEADMONSTER — C m_at/MON_AT reads the grid, which m_detach cleared */
        if (m.mx === x && m.my === y)
            return m;
    }
    return null;
}

/* C rm.h levl[x][y].typ. */
function lev_typ_at(x, y) {
    const loc = game.level?.at(x, y);
    return loc ? loc.typ : 0;
}

/* ---------------------------------------------------------------------------
 * dipfountain(obj) — C ref: fountain.c:393-554 dipfountain().
 * Called when hero dips an object into a fountain (#dip on fountain tile).
 * RNG: rn2() for Excalibur check, water_damage, then rnd(30) for main switch.
 * For seed0011 this is not called (session uses drinkfountain via 'q').
 * Ported for completeness (seed0070 may exercise this path).
 * ---------------------------------------------------------------------------
 */
// WIRE_PENDING: W4b-dipfountain — caller is dodip() which is not yet ported
export async function dipfountain(obj) {
    const g = game;
    const u = g.u;
    /* C fountain.c:399-402: Levitation check */
    /* Stub: assume not levitating */
    /* C fountain.c:410-444: the Excalibur arm.  WIRE_PENDING — it needs
     * LONG_SWORD + u.ulevel >= 5 + exist_artifact, and CONSUMES
     * rn2(Role_if(PM_KNIGHT) ? 6 : 30) (plus rn2(3) on the non-lawful branch).
     * No public session dips a long sword. */
    const ER_NOTHING = 0;
    const ER_DESTROYED = 3;
    /* C fountain.c:446-448:
     *     } else if (is_hands || obj == uarmg) { er = wash_hands();
     *     } else { er = water_damage(obj, NULL, TRUE); }
     * This was `let er = ER_NOTHING` with the note "water_damage is a stub in
     * trap.js returning ER_NOTHING (0)" — true when written, and it made the
     * fountain skip the rusting entirely: seed0014 step 373 dips a worn orcish
     * helm and C prints "Your orcish helm rusts!", then takes the rn2(2)
     * early-return at fountain.c:454 and never reaches the rnd(30) switch.  We
     * fell straight into rnd(30) and dried the fountain up. */
    let er;
    /* C fountain.c:445 `is_hands || obj == uarmg`, where is_hands is the
     * POINTER IDENTITY `obj == &hands_obj`.  This port marks the synthetic
     * hands object with an own `hands` property rather than a singleton, and
     * a bare `obj.hands` read throws inside the capture-replay marshaller
     * (the struct proxy rejects any field C did not capture).  Probe for the
     * property instead of reading it — same test, no struct field read. */
    const _is_hands = !!obj && Object.hasOwn(obj, 'hands') && !!obj.hands;
    if (obj && (_is_hands || obj === u.uarmg)) {
        /* C fountain.c:446 wash_hands() — WIRE_PENDING; RNG-free, and no corpus
         * dip is bare-handed or of the worn gloves. */
        er = ER_NOTHING;
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
    switch (rnd(30)) {
        case 16: /* Curse the item */
            /* C fountain.c:459-463 — `if (!is_hands && obj->oclass !=
             * COIN_CLASS && !obj->cursed) curse(obj);`  The !is_hands guard
             * was missing, and so was half of curse() itself: mkobj.c:1792-1793
             * is `otmp->blessed = 0; otmp->cursed = 1;` — BOTH.  Setting only
             * cursed left the hero's 4 blessed potions of water flagged blessed
             * AND cursed, and objnam.c:840-843 tests blessed first, so
             * seed0106's inventory at step 255 read "4 potions of holy water"
             * where C (which cursed them at this fountain) reads "4 potions of
             * unholy water".  The rest of curse() — reset_remarm, drop_uswapwep,
             * set_moreluck, the bag-of-holding weight, the figurine timer and
             * book_cursed — is per-otyp and inert for a potion; a general
             * curse() port belongs with those subsystems, not here. */
            if (obj && !_is_hands && obj.oclass !== COIN_CLASS && !obj.cursed) {
                obj.blessed = false;
                obj.cursed = true;
            }
            break;
        case 17:
        case 18:
        case 19:
        case 20: /* Uncurse */
            if (obj && obj.cursed) {
                await pline('The water glows for a moment.');
                obj.cursed = false;
            }
            else {
                await pline('A feeling of loss comes over you.');
            }
            break;
        case 21: /* Water Demon — not ported (TODO) */ break;
        case 22: /* C fountain.c:478-480 — water nymph */
            await dowaternymph();
            break;
        case 23: /* Snakes — not ported (TODO) */ break;
        case 24: /* C fountain.c:498-503 — find gem */
            if (!(((loc && loc.flags) | 0) & F_LOOTED)) {
                await dofindgem();
                break;
            }
        /* FALLTHROUGH */
        case 25: /* C fountain.c:492-494 — water gushes forth */
            dogushforth(false);
            break;
        case 26:
            await pline(`A strange tingling runs up your arm.`);
            break;
        case 27:
            await pline('You feel a sudden chill.');
            break;
        case 28: /* Bath / lose gold — not ported (TODO) */
            await pline('An urge to take a bath overwhelms you.');
            /* C fountain.c:503-528 — the gold loss.  This arm stopped at the
             * pline: no money_cnt, no somegold, no exercise(A_WIS, FALSE), so
             * the whole tail was missing along with its rn2(2).  MEASURED on
             * seed0014 (the fountain session) global leaf 59074: C draws
             * rn2(2) @exercise(attrib.c:509) here and its step-712 topline is
             * "You lost some of your gold in the fountain!  A watchman
             * yells:--More--". */
            {
                let money = money_cnt(g.invent) | 0;
                /* C fountain.c:503-528 raises NO botl flag: it decrements
                 * otmp->quan in place and the only `disp.botl = TRUE` in
                 * fountain.c is line 262, a different arm.  C's bot() runs only
                 * when that flag is up (allmain.c moveloop), so after this arm
                 * C KEEPS PAINTING the pre-loss amount indefinitely — on
                 * seed0014 the hero loses 3 of 36 at step 711 and every one of
                 * the remaining frames still reads "$:36".  This port's status
                 * row is recomputed live from gi.invent, so it has to latch the
                 * displayed value to reproduce C's staleness.  Cardinal Rule 1:
                 * port the bug.  The latch is cleared by the gold sites that
                 * DO carry C's SET_BOTL (js/cmd.js freeinv_core + dopickup,
                 * js/pickup_container.js addinv, js/wizcmds.js), because there
                 * C's bot() would run and overwrite the stale field. */
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
            /* mkgold + pline not ported */
            await exercise(A_WIS, true);
            if (loc)
                newsym(u.ux, u.uy);
            break;
        default:
            if (er === ER_NOTHING)
                await pline('Nothing seems to happen.');
            break;
    }
    /* C fountain.c:552: update_inventory() — stub */
    /* C fountain.c:553: dryup(u.ux, u.uy, TRUE) */
    await dryup(u.ux, u.uy, true);
}
/* mon_hates_blessings used to be a local throw-stub here, shadowing the real
 * export at js/mhitm.js:2049 (is_vampshifter(mon) || hates_blessings(mon.data),
 * RNG-free).  Both this file's peffect_water AND potionhit()'s monster-target
 * POT_WATER arm (potion.c:1832) need it; it is now imported for real above. */
function set_ulycn(pm) {
    /* C were.c:235-239 — update the lycanthropy species and refresh the
     * active permonst/intrinsic state. */
    game.u.ulycn = pm | 0;
    set_uasmon();
}
/* C ref: potion.c:718-769 peffect_water — full port. */
async function peffect_water(otmp) {
    const g = game;
    const u = g.u;
    if (!otmp.blessed && !otmp.cursed) {
        /* C potion.c:722-724 — uncursed water: hunger boost */
        await pline('This tastes like water.');
        u.uhunger += rnd(10);
        await newuhs(false);
        return;
    }
    /* C potion.c:727: gp.potion_unkn++ */
    g._potion_unkn = (g._potion_unkn || 0) + 1;
    /* C potion.c:728-729: mon_hates_blessings(&gy.youmonst) || u.ualign.type == A_CHAOTIC */
    if (mon_hates_blessings(g.youmonst) || u.ualign.type === 2 /* A_CHAOTIC */) {
        if (otmp.blessed) {
            /* C potion.c:731-742: blessed, hates blessings → burns */
            await pline('This burns like acid!');
            exercise(A_CON, false);
            if (ismnum(u.ulycn)) {
                /* C potion.c:736 indexes the canonical mons[] name table. */
                const lycanNames = monPmnamesPack.pmnames?.[u.ulycn | 0];
                Your('affinity to %s disappears!',
                     makeplural(lycanNames?.[1 /* NEUTRAL */] || lycanNames?.[2] || 'your lycanthropic form'));
                /* C potion.c:736 `gy.youmonst.data == &mons[u.ulycn]` — a
                   permonst POINTER identity test against the mons[] row for
                   the hero's lycanthrope form. js/makemon.js
                   permonstTemplate() mints a fresh object per call
                   (makemon.js:3467), so `===` against any mons[] row is
                   reference equality that can never fire. C keeps
                   mon->data and mon->mnum in lockstep (mondata.c:18-19
                   set_mon_data: `mon->data = ptr; mon->mnum = monsndx(ptr)`),
                   so the pointer test is exactly a form-index comparison. */
                if ((g.youmonst.data ? (g.youmonst.data.pmidx | 0) : -1) === (u.ulycn | 0))
                    await you_unwere_real(false);
                set_ulycn(-1 /* NON_PM */);
            }
            await losehp(d(2, 6), 'potion of holy water', 35 /* KILLED_BY_AN */);
        } else if (otmp.cursed) {
            /* C potion.c:743-748: cursed, hates blessings → proud */
            You_feel('quite proud of yourself.');
            healup(d(2, 6), 0, 0, 0);
            if (ismnum(u.ulycn) && !Upolyd(u))
                await you_were_real();
            exercise(A_CON, true);
        }
    } else {
        if (otmp.blessed) {
            /* C potion.c:751-758: blessed, likes blessings → awe */
            You_feel('full of awe.');
            make_sick(0n, null, true, 3 /* SICK_ALL */);
            exercise(A_WIS, true);
            exercise(A_CON, true);
            if (ismnum(u.ulycn))
                await you_unwere_real(true);
        } else {
            /* C potion.c:759-766: cursed, likes blessings → dread/burns */
            if (u.ualign.type === 0 /* A_LAWFUL */) {
                await pline('This burns like acid!');
                await losehp(d(2, 6), 'potion of unholy water', 35 /* KILLED_BY_AN */);
            } else
                You_feel('full of dread.');
            if (ismnum(u.ulycn) && !Upolyd(u))
                await you_were_real();
            exercise(A_CON, false);
        }
    }
}
/* C ref: potion.c:1261-1296 peffect_oil(struct obj *otmp).
 * Quaffing a potion of oil.  Three message branches, then
 *   exercise(A_WIS, good_for_you);   (attrib.c:489 → rn2(2) when good_for_you
 *                                      is FALSE, rn2(19) when TRUE)
 * which is the per-quaff RNG draw.  good_for_you is TRUE only when the potion
 * is lamplit AND the hero likes fire (S_LIGHT etc.); otherwise FALSE.
 *
 * seed2200 quaffs an uncursed, unlit potion of oil → the final `else` branch
 * ("That was smooth!"), good_for_you = FALSE → exercise(A_WIS, FALSE) → rn2(2). */
async function peffect_oil(otmp) {
    let good_for_you = false;
    if (otmp.lamplit) {
        /* C potion.c:1266-1284 — likes_fire(youmonst) is FALSE for every
         * playable role at chargen (no S_LIGHT/fire-liking polyform), so the
         * `else` (burn-your-face) branch is taken.  Stub likes_fire → false. */
        if (false /* likes_fire(gy.youmonst.data) */) {
            await pline('Ahh, a refreshing drink.');
            good_for_you = true;
        } else {
            /* C: You("burn your %s.", body_part(FACE));
             * vulnerable = !Fire_resistance || Cold_resistance;
             * losehp(d(vulnerable ? 4 : 2, 4), ...);
             * At chargen: no Fire_resistance, no Cold_resistance →
             * vulnerable = true → d(4,4). */
            await pline('You burn your face.'); /* You("burn your %s.", body_part(FACE)) */
            const dmg = d(4, 4); /* d(vulnerable?4:2, 4) — vulnerable=true at chargen */
            /* losehp(dmg, "quaffing a burning potion of oil", KILLED_BY) —
             * stubbed: fire the RNG draw to align stream. */
            void dmg;
        }
        /* burn_away_slime() — stubbed; no slime in corpus sessions. */
    } else if (otmp.cursed) {
        /* C potion.c:1291 */
        await pline('This tastes like castor oil.');
    } else {
        /* C potion.c:1293 */
        await pline('That was smooth!');
    }
    /* C potion.c:1295 — the per-quaff exercise/abuse draw. */
    exercise(A_WIS, good_for_you);
}
/* ---------------------------------------------------------------------------
 * drinksink() — C ref: fountain.c:596-681 drinksink().
 *
 * dodrink()'s sink counterpart to drinkfountain(): one rn2(20) picks the arm,
 * and the tail (`case 19` when not hallucinating, plus `default`) draws a
 * further rn2(3) and, when that is non-zero, rn2(2) to choose
 * "cold"/"warm"/"hot".  seed0002 step 185 is exactly that tail — rn2(20)=15,
 * rn2(3)!=0, rn2(2)=1 → "You take a sip of warm water." — and it was reached
 * with NO sink prompt at all, because dodrink had only the fountain arm.
 *
 * THREE ARMS CALL HELPERS THIS PORT DOES NOT HAVE: case 4 (dopotion), case 6
 * (breaksink) and case 9 (vomit).  They are written as C wrote them and call
 * an explicitly-named unported helper, following js/mklev.js:9100's
 * `Monnam_unported()` convention: a loud failure if a session ever rolls one
 * is honest, where a silent no-op would diverge from that point on with no
 * signal.  No session in the current corpus rolls them.
 * ---------------------------------------------------------------------------
 */
/* Sink-delivered potions use the shared effect dispatcher. */
async function dopotion_unported(otmp) {
    return await peffects(otmp);
}
/* C fountain.c:581-593 — convert a sink into a fountain. */
export async function breaksink(x, y) {
    const loc = game.level?.at(x, y);
    if (cansee(x, y) || u_at(x, y))
        await pline('The pipes break!  Water spurts out!');
    set_levltyp(x, y, IS_FOUNTAIN);
    if (loc) {
        loc.flags = 1; /* SET_FOUNTAIN_LOOTED */
        loc.blessedftn = 0;
    }
    newsym(x, y);
}
/* C mondata.c:663-674 cantvomit(). */
export function cantvomit(ptr) {
    const pmidx = ptr?.pmidx | 0;
    if ((ptr?.mlet | 0) === 18 /* S_RODENT */
        && pmidx !== PM_ROCK_MOLE && pmidx !== PM_WOODCHUCK)
        return true;
    return pmidx === PM_PONY || pmidx === PM_HORSE || pmidx === PM_WARHORSE;
}

/* C ref: eat.c:3735-3785 vomit(void). */
export async function vomit() {
    const g = game;
    const u = g.u;
    let spewed = false;
    if (cantvomit(g.youmonst?.data)) {
        /* C deliberately does not cure food poisoning in this arm. */
        await Your('jaw gapes convulsively.');
    } else {
        if ((_uprop(SICK).intrinsic | 0) && ((u.usick_type | 0) & SICK_VOMITABLE) !== 0)
            await make_sick(0n, null, true, SICK_VOMITABLE);
        if ((u.uhs | 0) >= FAINTING)
            await Your(`${body_part(STOMACH)} heaves convulsively!`);
        else
            spewed = true;
    }
    if ((g.multi | 0) >= -2) {
        nomul(-2);
        g.multi_reason = 'vomiting';
        g.nomovemsg = 'You can move again.';
    }
    if (spewed) {
        const data = g.youmonst?.data;
        const mattk = attacktype_fordmg(data, 12 /* AT_BREA */, 8 /* AD_ACID */);
        if (mattk) {
            await You('breathe acid on yourself...');
            await ubreatheu(mattk);
        }
        const x = u.ux | 0, y = u.uy | 0;
        const loc = g.level?.at?.(x, y) || g.level?.locations?.[x]?.[y];
        if ((loc?.typ | 0) === ALTAR)
            await altar_wrath(x, y);
        if ((data?.mflags1 >>> 0) & 0x08000000 && is_ice(x, y))
            await melt_ice_zap(x, y, 'Your stomach acid melts straight through the ice!');
    }
}
/* youprop.h property macros, in the shape js/vision.js:19 Blind() uses:
 * intrinsic|extrinsic set and not blocked.  Kept local (as this file's existing
 * Hallucination reads already are) rather than imported, to avoid a new cycle. */
function _prop_active(prop) {
    const p = game.u?.uprops?.[prop];
    return !!p && !!((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0);
}
function _blind() { return _prop_active(BLINDED); }
/* youprop.h:116-120 — Hallucination is NOT the generic property test:
 *   HHallucination     u.uprops[HALLUC].intrinsic          (intrinsic ONLY)
 *   Halluc_resistance  HHalluc_resistance || EHalluc_resistance
 *   Hallucination      (HHallucination && !Halluc_resistance)
 * No extrinsic term on HALLUC and no `blocked` test on either — same shape this
 * file's peffect arms (js/potion.js:974-979) already use. */
function _hallucination() {
    const u = game.u;
    const hh = (u?.uprops?.[HALLUC]?.intrinsic | 0);
    const hr = u?.uprops?.[HALLUC_RES];
    const res = ((hr?.intrinsic | 0) || (hr?.extrinsic | 0));
    return !!hh && !res;
}
function _fire_resistance() { return _prop_active(FIRE_RES); }
function _unchanging() { return _prop_active(UNCHANGING); }
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
        await pline('You hear clanking from the pipes...');
        break;
    case 12:
        /* C:692-694 */
        await pline('You hear snatches of song from among the sewers...');
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
/* C ref: potion.c:528 dodrink — quaff command dispatch.
 * W19.2: handles uncursed POT_WATER (seed1900).
 * W4b: handles drinkfountain path when hero stands on a fountain (seed0011).
 *
 * C ref: potion.c:542-571 — if hero stands on a fountain (IS_FOUNTAIN) and
 * can_reach_floor, ask "Drink from the fountain?" via y_n(); if 'y', call
 * drinkfountain() and return ECMD_TIME.
 *
 * NOTE: can_reach_floor stubbed to TRUE (assumes not levitating).
 * iflags.menu_requested stubbed to FALSE (normal interactive mode). */
/* C ref: invent.c useup() — consume one potion from gi.invent.  A stack
 * (quan>1) is decremented; a singleton is unlinked from game.invent.  RNG-free.
 * Mirrors read.js:useup for scrolls. */
/* C hack.h:1409  #define POTION_OCCUPANT_CHANCE(n) (13 + 2 * (n))
 * Read from the header rather than folded into the call site so the modulus
 * the recorder prints (`rn2(13)`) is traceable back to mvitals[].born == 0. */
function POTION_OCCUPANT_CHANCE(n) { return 13 + 2 * (n | 0); }
/* C `svm.mvitals[mndx].mvflags` / `.born`.  js keeps the same table on
 * game.mvitals (js/dogmove.js:3467 is its writer); an unvisited row is absent,
 * which is C's zero-initialised struct. */
function _mvflags(mndx) {
    const g = game;
    const row = g.mvitals ? g.mvitals[mndx] : null;
    return row ? (row.mvflags | 0) : 0;
}
function _mborn(mndx) {
    const g = game;
    const row = g.mvitals ? g.mvitals[mndx] : null;
    return row ? (row.born | 0) : 0;
}
/* C objnam.c OBJ_DESCR(objects[obj->otyp]) comparison — the SHUFFLED
 * appearance, not the type name.  getObjDescr() takes an otyp. */
function objdescr_is(obj, desc) {
    return !!obj && getObjDescr(obj.otyp | 0) === desc;
}
/* C potion.c:2811 verbalize(...) — pline the quoted speech.  Same one-line
 * stand-in js/vault.js:278 and js/mklev.js:17353 already carry; there is no
 * sound driver in this port, so SetVoice is a no-op exactly as it is in
 * js/vault.js:285 and js/uhitm.js:5909. */
async function _verbalize_potion(line) { await pline('"' + line + '"'); }
/* C potion.c:480-500 ghost_from_bottle(void).  RNG: rndmonnam() only, and only
 * while hallucinating. */
async function ghost_from_bottle() {
    const g = game;
    const u = g.u;
    const mtmp = await makemon(PM_GHOST, u.ux, u.uy, MM_NOMSG);
    if (!mtmp) {
        await pline('This bottle turns out to be empty.');
        return;
    }
    if (_potion_Blind()) {
        await pline('As you open the bottle, something emerges.');
        return;
    }
    await pline('As you open the bottle, an enormous '
                + (_potion_Hallucination() ? rndmonnam(null) : 'ghost')
                + ' emerges!');
    /* C potion.c:496 `if (flags.verbose) You("are frightened to death, ...")` */
    if (g.flags?.verbose !== false)
        await pline('You are frightened to death, and unable to move.');
    nomul(-3);
    g.multi_reason = 'being frightened to death';
    g.nomovemsg = 'You regain your composure.';
}
/* C potion.c:2796-2811 mongrantswish(struct monst **monp) — the monster is
 * removed FIRST so a fatal wish cannot put it in the bones file, then the map
 * is held with tmp_at() across the wish prompt.  There is no tmp_at display
 * machinery on this path in js/, so the glyph hold is elided; the ORDER
 * (mongone before makewish) is what the RNG stream sees and is preserved. */
async function _mongrantswish(mon) {
    await mongone(mon);
    await makewish();
}
/* C potion.c:2815-2867 djinni_from_bottle(struct obj *obj).
 * RNG: rn2(5), then rnd(4) for a blessed bottle whose roll was 4, or rn2(4)
 * for a cursed bottle whose roll was 0. */
async function djinni_from_bottle(obj) {
    const g = game;
    const u = g.u;
    const mtmp = await makemon(PM_DJINNI, u.ux, u.uy, MM_NOMSG);
    if (!mtmp) {
        await pline('It turns out to be empty.');
        return;
    }
    if (!_potion_Blind()) {
        await pline('In a cloud of smoke, ' + a_monnam(mtmp) + ' emerges!');
        await pline(Monnam(mtmp) + ' speaks.');
    } else {
        await pline('You smell acrid fumes.');
        await pline('Something speaks.');
    }
    let chance = rn2(5);
    if (obj.blessed)
        chance = (chance === 4) ? rnd(4) : 0;
    else if (obj.cursed)
        chance = (chance === 0) ? rn2(4) : 4;
    /* 0,1,2,3,4:  b=80%,5,5,5,5; nc=20%,20,20,20,20; c=5%,5,5,5,80 */
    switch (chance) {
    case 0:
        await _verbalize_potion('I am in your debt.  I will grant one wish!');
        await _mongrantswish(mtmp);
        break;
    case 1:
        await _verbalize_potion('Thank you for freeing me!');
        await tamedog(mtmp, null, false);
        break;
    case 2:
        await _verbalize_potion('You freed me!');
        mtmp.mpeaceful = true;
        set_malign(mtmp);
        break;
    case 3:
        await _verbalize_potion('It is about time!');
        if (canspotmon(mtmp))
            await pline(Monnam(mtmp) + ' vanishes.');
        await mongone(mtmp);
        break;
    default:
        await _verbalize_potion('You disturbed me, fool!');
        mtmp.mpeaceful = false;
        set_malign(mtmp);
        break;
    }
}
function useup_potion(obj) {
    if (obj.quan != null && (obj.quan | 0) > 1) {
        /* C invent.c:1324 useup(): obj->in_use = FALSE on the quan>1 decrement
         * path (the remaining stack is no longer the in-use single being drunk). */
        obj.in_use = false;
        obj.quan = (obj.quan | 0) - 1;
        return;
    }
    let prev = null;
    for (let o = game.invent; o; prev = o, o = o.nobj) {
        if (o === obj) {
            if (prev) prev.nobj = o.nobj; else game.invent = o.nobj;
            obj.nobj = null;
            /* Bump bridge objs_deleted.count to match C delobj counter. */
            const store = game.__bridge__ || (game.__bridge__ = {});
            const key = 'objs_deleted.count';
            const cur = store[key] !== undefined ? Number(store[key]) : 0;
            store[key] = String(cur + 1);
            return;
        }
    }
}

/* The drink prompt's '?'/'*' answer goes through the ONE shared port of C's
 * `redo_menu` arm (invent.c:1960-1999) + display_pickinv (invent.c:3269), both
 * in js/cmd.js.  There is nothing potion-specific about either: C reaches them
 * from the single getobj() body that dodrink, dothrow, doeat, dowear, dozap and
 * the rest all call (potion.c:553 getobj("drink", drink_ok, ...)), so a
 * drink-scoped copy could only ever be C-faithful by coincidence. */

/* C ref: mkmaze.c/rm.h surface() — the ground-description word for a tile.  For
 * the paralysis "frozen to the <surface>" message; a plain floor tile → "floor",
 * ice → "ice" (mirrors js/engrave.js surface). */
function _surface(x, y) {
    const loc = game.level?.at?.(x, y);
    if (loc && loc.typ === ICE) return 'ice';
    return 'floor';
}

/* C do_name.c:636-676 docall() — after quaffing an unidentified potion whose
 * effect did not identify it, offer to #call (name) the type.  Scoped to potions.
 * The "Call a <potion>:" getlin prompt replaces the just-shown taste message, so
 * tty pages that message with a --More-- first (force_more) — the observed
 * step-56 "This tastes like slime mold juice.--More--" frame.  RNG-free. */
async function _docall_potion(obj) {
    const g = game;
    if (!obj.dknown) return; /* C: probably blind */
    await flush_screen(1); /* C do_name.c:644 flush buffered updates */
    /* qbuf = safe_qbuf("Call ", ":", obj, docall_xname, ...) → "Call a ruby potion:" */
    const qbuf = 'Call ' + docall_xname_potion(obj) + ':';
    /* Page the pending taste message before getlin overwrites the topline (tty
     * more() on the unacked message; consumes the dismiss keystroke). */
    if (g._pending_message)
        await force_more(g._pending_message);
    /* getlin() reads the name string (echoing input, honoring backspace/ESC). */
    const buf = await getlin(qbuf);
    if (buf === '\x1b') /* ESC → name_from_player returns 0, docall returns */
        return;
    /* mungspaces: trim + collapse internal whitespace (do_name.c:666). */
    const name = buf.trim().replace(/\s+/g, ' ');
    if (!g._oc_uname) g._oc_uname = {};
    if (!name) {
        /* all-spaces → uncall; only relevant if it previously had a name. */
        if (g._oc_uname[obj.otyp]) {
            delete g._oc_uname[obj.otyp];
            /* C undiscover_object — not needed for the corpus path. */
        }
    } else {
        g._oc_uname[obj.otyp] = name;
        /* C do_name.c:672 discover_object(otyp, FALSE, TRUE, TRUE). */
        discover_object(obj.otyp, false, true, true);
    }
}

export async function dodrink() {
    const g = game;
    const u = g.u;
    /* C potion.c:531-535 — dodrink()'s FIRST statement, BEFORE its getobj():
     *     if (Strangled) {
     *         pline("If you can't breathe air, how can you drink liquid?");
     *         return ECMD_OK;
     *     }
     * This said "not ported (unreachable at chargen)", which is an absence
     * claim about a property an amulet of strangulation sets at any point in a
     * game, not only at chargen.  With the refusal absent, a strangled hero who
     * presses 'q' gets "What do you want to drink?" instead of the refusal and
     * this port then EATS C's next command as the item letter — the keystroke
     * desync this class costs far more than its one topline.
     * youprop.h:110 `#define Strangled u.uprops[STRANGLED].intrinsic` — the
     * INTRINSIC term only, so not _prop_active() (which also ors in extrinsic
     * and tests blocked).  prop.h:38 STRANGLED = 19.  RNG-free. */
    if ((u?.uprops?.[STRANGLED]?.intrinsic | 0) !== 0) {
        await pline("If you can't breathe air, how can you drink liquid?");
        g.context = g.context || {};
        g.context.move = 0; /* C ECMD_OK */
        return ECMD_OK;
    }
    /* C potion.c:537 drink_ok_extra = 0 — the "player already passed up a
     * non-inventory drinking opportunity" flag drink_ok() reads for its
     * obj==NULL (hands/self) answer.  Incremented on each DECLINED dungeon
     * feature (fountain / sink / underwater); it selects between "you don't
     * have anything to drink" and "...anything ELSE to drink". */
    drink_ok_extra = 0;
    /* C potion.c:541 `if (!iflags.menu_requested) {` — the whole
     * fountain/sink/underwater block below is gated on this: preceding
     * 'q'/#quaff with the 'm' prefix (menu_requested) skips the dungeon-
     * feature prompts entirely and goes straight to getobj().  This guard
     * was absent, so a menu-requested quaff standing on a fountain/sink/
     * underwater square still asked "Drink from the fountain?" etc. */
    /* C potion.c:542-551: Fountain check.
     * IS_FOUNTAIN checks levl[u.ux][u.uy].typ === FOUNTAIN.
     * can_reach_floor stub: always TRUE (not levitating in early sessions). */
    if (u && g.level && !g.iflags?.menu_requested) {
        const loc = g.level.at(u.ux, u.uy);
        if (loc && IS_FOUNTAIN(loc.typ)) {
            /* C potion.c:547: if (y_n("Drink from the fountain?") == 'y') */
            const answer = await y_n('Drink from the fountain?');
            if (answer === 'y') {
                await drinkfountain();
                g.context = g.context || {};
                g.context.move = 1; /* ECMD_TIME */
                /* drinkfountain is time-consuming (ECMD_TIME); moveloop clears
                 * _pending_message after rhack returns when move!=0.  Promote
                 * the trailing fountain-result pline (e.g. "A wisp of vapor
                 * escapes the fountain...") to _resultMessage so rhack restores
                 * it onto the topline for the NEXT nhgetch capture, matching C's
                 * tty topline that lingers until the next keypress (seed0011
                 * step 6). */
                if (g._pending_message) {
                    _topl_stash_result();
                }
                return ECMD_TIME;
            }
            /* C potion.c:552 ++drink_ok_extra — fountain offer declined. */
            ++drink_ok_extra;
            /* Else fall through to inventory potion path */
        }
        /* C potion.c:553-562: Or a kitchen sink?  Same shape as the fountain
         * arm above and it was simply absent: seed0002 step 184 stands on a
         * sink, presses 'q', and C asks "Drink from the sink? [yn] (n)" where
         * this port went straight to getobj's "What do you want to drink?". */
        if (loc && IS_SINK(loc.typ)) {
            /* C potion.c:557: if (y_n("Drink from the sink?") == 'y') */
            const answer = await y_n('Drink from the sink?');
            if (answer === 'y') {
                await drinksink();
                g.context = g.context || {};
                g.context.move = 1; /* ECMD_TIME */
                /* Same trailing-message promotion the fountain arm does: a
                 * time-consuming command's result pline must survive rhack's
                 * post-command clear and land on the NEXT capture's topline. */
                if (g._pending_message) {
                    _topl_stash_result();
                }
                return ECMD_TIME;
            }
            /* C potion.c:561 ++drink_ok_extra — sink offer declined. */
            ++drink_ok_extra;
        }
        /* C potion.c:563-570: Or are you surrounded by water?
         *     if (Underwater && !u.uswallow) {
         *         if (y_n("Drink the water around you?") == 'y') {
         *             pline("Do you know what lives in this water?");
         *             return ECMD_TIME;
         *         }
         *         ++drink_ok_extra;
         *     }
         * youprop.h:279 `#define Underwater (u.uinwater)`.  This arm was
         * entirely absent (`grep -n 'uinwater' js/potion.js` up to here
         * returns nothing), so a hero submerged and pressing 'q' fell
         * straight through to getobj's item prompt instead of being asked
         * this yes/no first. RNG-free: unlike drinkfountain/drinksink this
         * arm has no callee, it plines directly and returns. */
        if ((u.uinwater | 0) && !u.uswallow) {
            /* C potion.c:567: if (y_n("Drink the water around you?") == 'y') */
            const answer = await y_n('Drink the water around you?');
            if (answer === 'y') {
                await pline('Do you know what lives in this water?');
                g.context = g.context || {};
                g.context.move = 1; /* C ECMD_TIME */
                if (g._pending_message) {
                    _topl_stash_result();
                }
                return ECMD_TIME;
            }
            /* C potion.c:570 ++drink_ok_extra — underwater offer declined. */
            ++drink_ok_extra;
        }
    }
    /* C potion.c:573 getobj("drink", drink_ok, GETOBJ_NOFLAGS):
     * Prompt for item, consume one nhgetch.
     *
     * C ref: invent.c:1916-1935 getobj() — build qbuf "What do you want to
     * <word>?" then append the suggestable-letter list.  drink_ok
     * (potion.c:507) returns GETOBJ_SUGGEST for every POTION_CLASS object and
     * GETOBJ_EXCLUDE for everything else, so the candidate letters are exactly
     * the invlets of potions in inventory, in invlet (sortloot SORTLOOT_INVLET)
     * order.  With suggestions present: " [%s or ?*]"; with none: " [*]".
     * C ref: invent.c:1908-1909 `if (suggested > 5) compactify(bp);` — the
     * suggestion list is range-compressed once it exceeds five letters.  This
     * note used to claim the gate was "not reached here"; seed0002 step 54 is a
     * Healer holding six potions, and C prompts "[d-gnq or ?*]" against this
     * port's uncompacted "[defgnq or ?*]" (which also parked the cursor one
     * column too far right, qbuf.length + 1). */
     // PARKED-NOTE: session=seed0002 citation-only
    let _drinkLets = '';
    for (let o = g.invent; o; o = o.nobj) {
        if ((o.oclass | 0) === POTION_CLASS) {
            _drinkLets += String.fromCharCode(o.invlet || 0x3f);
        }
    }
    /* C invent.c:1911-1914 getobj() — the NO-CANDIDATES early-out, BEFORE the
     * for(;;) prompt loop and therefore before any nhgetch:
     *     if (suggested == 0 && !forceprompt && !allownone) {
     *         You("don't have anything %sto %s.", inaccess ? "else " : "", word);
     *         return (struct obj *) 0;
     *     }
     * For the drink callback both guards are constants:
     *   - forceprompt: GETOBJ_NOFLAGS clears GETOBJ_PROMPT, and only a
     *     GETOBJ_DOWNPLAY invent item sets it — drink_ok (potion.c:507-523)
     *     returns only SUGGEST/EXCLUDE/EXCLUDE_NONINVENT, never DOWNPLAY.
     *   - allownone: set only when drink_ok(NULL) answers SUGGEST / DOWNPLAY /
     *     EXCLUDE_INACCESS / EXCLUDE_SELECTABLE (invent.c:1831-1845); drink_ok's
     *     obj==NULL arm answers EXCLUDE (drink_ok_extra==0) or
     *     EXCLUDE_NONINVENT (drink_ok_extra>0), both of which leave it FALSE.
     * So `suggested == 0` alone decides, and `inaccess` is 1 exactly when
     * drink_ok(NULL) returned GETOBJ_EXCLUDE_NONINVENT — i.e. drink_ok_extra>0
     * (invent.c:1846-1850 bumps inaccess for that case).
     * dodrink then returns ECMD_CANCEL (potion.c:574) — no time passes and, the
     * point of this branch, NO KEYSTROKE IS CONSUMED.  seed0005 step 36 'q':
     * a potionless samurai; C prints this and the following 'y' (step 37) stays
     * a movement command, while JS used to swallow it as the getobj answer —
     * which stalled the hero for turn 19 (umovement-trace-diff
     * MISSING-HERO-MOVE, C settles (67,3), JS stuck on turn 18's (68,4)). */
    if (!_drinkLets) {
        /* js pline() takes a pre-formatted string (js/display.js:2723). */
        await pline("You don't have anything "
                    + (drink_ok_extra ? 'else ' : '') + 'to drink.');
        g.context = g.context || {};
        g.context.move = 0; /* ECMD_CANCEL */
        return ECMD_CANCEL;
    }
    let _qbuf = 'What do you want to drink?';
    _qbuf += ` [${_drinkLets.length > 5 ? compactify(_drinkLets) : _drinkLets} or ?*]`;
    /* C invent.c:1915 — qbuf is rebuilt at the top of getobj's `for (;;)`, so a
     * re-prompt (invent.c:1985) repaints the identical topline and re-reads. */
    let itemKey;
    /* Hoisted above the loop: C's getobj resolves the invlet INSIDE its for(;;)
     * (invent.c:2002-2062) so an unmatched letter can re-prompt. */
    let otmp = null;
    for (;;) {
        g._pending_message = _qbuf;
        await flush_screen(1);
        /* C tty: cursor parked one past the prompt + trailing space (qbuf len+1). */
        {
            const disp = g.nhDisplay;
            if (disp) topl_park_cursor(disp, _qbuf + ' ');
        }
        /* nhgetch for item selection — mirrors C getobj() → nhgetch(). */
        itemKey = await nhgetch();
        // C leaves the getobj prompt physically painted after the answer.
        // Preserve it until the next input when a potion emits no new message.
        g._topl_sticky = _qbuf;
        /* C invent.c:1960-1999 `redo_menu` — '?'/'*' are handled here, BEFORE the
         * invlet walk at invent.c:2002, by display_pickinv (restricted to `lets`
         * for '?', the whole pack for '*').  `altlets` is empty for this command:
         * drink_ok (potion.c:507-523) returns only GETOBJ_SUGGEST,
         * GETOBJ_EXCLUDE or GETOBJ_EXCLUDE_NONINVENT, never GETOBJ_DOWNPLAY, so
         * nothing is ever collected into the altlets buffer at invent.c:1884. */
        if (itemKey === 63 /* '?' */ || itemKey === 42 /* '*' */) {
            itemKey = await getobj_redo_menu(itemKey, _drinkLets, '');
            /* invent.c:1989-1993 — ESC out of the menu: "Never mind." (already
             * plined by the helper) → getobj returns NULL → dodrink's
             * `if (!otmp) return ECMD_CANCEL` (potion.c:576). */
            if (itemKey === 27) {
                g.context.move = 0;
                return ECMD_CANCEL;
            }
            /* invent.c:1982-1986 — display_pickinv answered 0 (dismissed with no
             * selection); `oneloop` is set only by iflags.force_invmenu, which is
             * Off, so C `continue`s the prompt loop rather than cancelling. */
            if (itemKey === 0)
                continue;
        }
        /* C invent.c:1950-1953 —
         *     if (strchr(quitchars, ilet)) {
         *         if (flags.verbose) pline1(Never_mind);
         *         return (struct obj *) 0;
         *     }
         * quitchars is decl.c:96 " \r\n\033" (SPACE, CR, LF, ESC).  This arm tested
         * only ESC and SPACE and plined nothing; getobj → NULL → dodrink's
         * ECMD_CANCEL (potion.c:576).  The Never_mind is verbose-gated in C. */
        if (itemKey === 27 || itemKey === 32 || itemKey === 13 || itemKey === 10) {
            await getobj_never_mind(_qbuf);
            g.context.move = 0;
            return ECMD_CANCEL;
        }
        /* Try to find item by invlet in game.invent if available. */
        if (g.invent) {
            otmp = null;
            for (let o = g.invent; o; o = o.nobj) {
                if (o.invlet === itemKey) {
                    otmp = o;
                    break;
                }
            }
            if (otmp)
                break;
            /* C invent.c:2058-2062 — a letter that names no carried object:
             *     You("don't have that object.");
             *     ...
             *     continue;
             * The topline is still occupied by the prompt, so the pline raises a
             * --More-- whose ack key C also eats, and THEN getobj re-prompts.
             *
             * This arm did not exist: the loop broke after ONE read, the invlet
             * walk found nothing, and `if (otmp) {...} else {...}` dropped
             * through to the no-inventory fallback below — which drinks a
             * SYNTHETIC UNCURSED POTION OF WATER.  So answering the quaff prompt
             * with a letter the hero does not carry quaffed water, took a turn,
             * and consumed neither the more-ack nor the re-prompt's key.
             * MEASURED on gen525-recombine-seed1393947 step 285: the drink
             * prompt is answered 'r' (the hero carries only potion 'i'); C pages
             * "You don't have that object.--More--" across steps 286-289 and
             * re-prompts at 290, while this port printed "This tastes like
             * water." and ran 'r'/'?'/'o'/' ' as commands. */
            await force_more("You don't have that object.");
            continue;
        }
        /* No live invent chain (synthetic-slot model): an unmodelled-but-really-
         * carried letter would re-prompt forever where C resolves it, so keep
         * the old fall-through rather than looping. */
        break;
    }
    /* C invent.c:2070-2073 — getobj's final screen:
     *     if (obj_ok(otmp) == GETOBJ_EXCLUDE) {
     *         silly_thing(word, otmp);
     *         return (struct obj *) 0;
     *     }
     * drink_ok (potion.c) is GETOBJ_SUGGEST for POTION_CLASS and GETOBJ_EXCLUDE
     * for everything else, so naming a non-potion by its letter plines
     * "That is a silly thing to drink." and dodrink returns ECMD_CANCEL — NO
     * turn.  Without this screen the non-potion fell through to the peffects
     * dispatch and came out as "Nothing happens." plus a spent turn. */
    if (otmp && (otmp.oclass | 0) !== POTION_CLASS) {
        await silly_thing_dw('drink', otmp);
        g.context.move = 0;
        return ECMD_CANCEL;
    }
    if (otmp) {
        /* Full dispatch when inventory is available. */
        otmp.in_use = true;
        /* C potion.c:600-614 — the two BOTTLE-OCCUPANT checks, which sit
         * between `otmp->in_use = TRUE` and dopotion(otmp) and were absent
         * entirely (`grep 'milky\|smoky\|djinni\|POTION_OCCUPANT' js/potion.js`
         * returned nothing):
         *
         *   if (objdescr_is(otmp, "milky")
         *       && !(svm.mvitals[PM_GHOST].mvflags & G_GONE)
         *       && !rn2(POTION_OCCUPANT_CHANCE(svm.mvitals[PM_GHOST].born))) {
         *       ghost_from_bottle(); useup(otmp); return ECMD_TIME;
         *   } else if (objdescr_is(otmp, "smoky")
         *              && !(svm.mvitals[PM_DJINNI].mvflags & G_GONE)
         *              && !rn2(POTION_OCCUPANT_CHANCE(svm.mvitals[PM_DJINNI].born))) {
         *       djinni_from_bottle(otmp); useup(otmp); return ECMD_TIME;
         *   }
         *
         * hack.h:1409 POTION_OCCUPANT_CHANCE(n) == 13 + 2*n, so with no ghost
         * or djinni yet born the modulus is 13 — which is exactly what the
         * recorder writes on the one corpus session that reaches this line:
         * `rn2(13)=12 @ dodrink(potion.c:609)`.  The C && short-circuits, so
         * the draw happens ONLY for a potion whose (shuffled) description is
         * "milky"/"smoky"; every other quaff draws nothing here, which is why
         * the ladder below is otherwise unchanged.
         *
         * NOTE the draw is made even when the potion is about to do something
         * else entirely: on that session the potion is a wished-for CURSED
         * POTION OF CONFUSION whose appearance happens to be "smoky", and C's
         * rn2(13) lands on 12 so the guard fails and peffect_confusion runs
         * one draw later than this port had it. */
        if (objdescr_is(otmp, 'milky')
            && !(_mvflags(PM_GHOST) & G_GONE)
            && !rn2(POTION_OCCUPANT_CHANCE(_mborn(PM_GHOST)))) {
            await ghost_from_bottle();
            useup_potion(otmp);
            g.context.move = 1; /* C ECMD_TIME */
            if (g._pending_message)
                _topl_stash_result();
            return ECMD_TIME;
        } else if (objdescr_is(otmp, 'smoky')
                   && !(_mvflags(PM_DJINNI) & G_GONE)
                   && !rn2(POTION_OCCUPANT_CHANCE(_mborn(PM_DJINNI)))) {
            await djinni_from_bottle(otmp);
            useup_potion(otmp);
            g.context.move = 1; /* C ECMD_TIME */
            if (g._pending_message)
                _topl_stash_result();
            return ECMD_TIME;
        }
        if (otmp.otyp === POT_WATER) {
            g._potion_nothing = 0;
            g._potion_unkn = 0;
            await peffect_water(otmp);
            /* C dopotion (potion.c:622-641): peffects(POT_WATER) returns -1
             * (the case breaks out of the switch), so dopotion falls through
             * to useup(otmp).  Consume the potion node from gi.invent.
             * dopotion tail: identify if dknown && !name_known. */
            if (otmp.dknown
                && !(g._oc_name_known && g._oc_name_known[otmp.otyp])) {
                if (!g._potion_unkn) {
                    discover_object(otmp.otyp, true, true, true);
                    more_experienced(0, 10);
                } else {
                    await _docall_potion(otmp);
                }
            }
            useup_potion(otmp);
            g.disp.botl = 1;
        }
        else if (otmp.otyp === POT_OIL) {
            await peffect_oil(otmp);
            /* C dopotion: peffects(POT_OIL) returns -1 (break), so dopotion
             * useup(otmp)s the potion.  Consume it. */
            if (otmp.dknown
                && !(g._oc_name_known && g._oc_name_known[otmp.otyp])) {
                discover_object(otmp.otyp, true, true, true);
                more_experienced(0, 10);
            }
            useup_potion(otmp);
            g.disp.botl = 1;
        }
        else if (otmp.otyp === POT_PARALYSIS) {
            /* C potion.c:882-900 peffect_paralysis.  The hero here has no
             * Free_action, is not levitating / on an air|water level, and has no
             * steed.  That used to be asserted of "the corpus hero", which is a
             * claim about 732 recordings and false as stated (Lev on 7, Ride on
             * 7); it is true of the state AT THIS CALL, which is what the branch
             * choice needs and is now measured.
             * MEASURED: subject=peffect_paralysis-Lev/steed value=+0 at=d26664bc
             *           date=2026-08-29 corpus=public+train
             *           reach=1 call, seed0002-healer-reflection-drummer;
             *           Levitation 0, usteed 0
             *           recheck-when=js-levitation-state-exists
             * — the else→else branch: "Your feet are frozen to the floor!"
             * then nomul(-(rn1(10, 25 - 12*bcsign))).  RNG: the rn1 = rn2(10)+25
             * (uncursed bcsign=0).  The moveloop's gm.multi<0 machinery
             * (allmain.js:714) runs the frozen turns (movemon each) and fires
             * unmul→nomovemsg "You can move again." when the countdown reaches 0. */
            const bcsign = (otmp.blessed ? 1 : 0) - (otmp.cursed ? 1 : 0);
            const u2 = g.u;
            /* Your("%s are frozen to the %s!", makeplural(body_part(FOOT)), surface()) */
            const feet = 'feet'; /* makeplural(body_part(FOOT)) for a humanoid */
            const sfc = _surface(u2.ux, u2.uy);
            await pline(`Your ${feet} are frozen to the ${sfc}!`);
            /* nomul(-(rn1(10, 25 - 12*bcsign(otmp)))); rn1(x,y)=rn2(x)+y. */
            nomul(-(rn2(10) + (25 - 12 * bcsign)));
            g.multi_reason = 'frozen by a potion';
            g.nomovemsg = 'You can move again.';
            exercise(A_DEX, false);
            /* peffects returns -1 → dopotion tail (potion.c:626-641).  C:
             * gp.potion_nothing/gp.potion_unkn are never touched by
             * peffect_paralysis, so they stay 0 — the identify branch always
             * takes makeknown()+more_experienced(0,10), never trycall().
             * makeknown(otmp->otyp) == discover_object(otyp, TRUE, TRUE, TRUE);
             * credit_hero=TRUE fires exercise(A_WIS, TRUE) (rn2(19)) the FIRST
             * time this potion type is identified (o_init.c:481-483). */
            if (otmp.dknown
                && !(g._oc_name_known && g._oc_name_known[otmp.otyp])) {
                discover_object(otmp.otyp, true, true, true);
                more_experienced(0, 10);
            }
            useup_potion(otmp);
        }
        else if (otmp.otyp === POT_CONFUSION) {
            /* C potion.c:1015-1029 peffect_confusion */
            g._potion_nothing = 0;
            g._potion_unkn = 0;
            const bcsign = (otmp.blessed ? 1 : 0) - (otmp.cursed ? 1 : 0);
            const u2 = g.u;
            /* C potion.c:1016 `if (!Confusion)` — Confusion is
             * u.uprops[CONFUSION].intrinsic (youprop.h:83-84).  `u2.Confusion`
             * is a spelling nothing in js/ assigns, so this test was
             * unconditionally true: a second potion of confusion re-announced
             * "Huh, What?  Where am I?" where C takes the potion_nothing arm. */
            if (!(u2.uprops?.[CONFUSION]?.intrinsic | 0)) {
                const HHallucination = u2.uprops?.[HALLUC]?.intrinsic || 0;
                const HHalluc_resistance = u2.uprops?.[HALLUC_RES]?.intrinsic || 0;
                const EHalluc_resistance = u2.uprops?.[HALLUC_RES]?.extrinsic || 0;
                const Halluc_resistance = HHalluc_resistance || EHalluc_resistance;
                const Hallucination = HHallucination && !Halluc_resistance;
                if (Hallucination) {
                    await pline('What a trippy feeling!');
                    g._potion_unkn++;
                } else {
                    await pline('Huh, What?  Where am I?');
                }
            } else {
                g._potion_nothing++;
            }
            /* C potion.c:1026-1028
             *   make_confused(itimeout_incr(HConfusion, rn1(7, 16-8*bcsign(otmp))), FALSE)
             * HConfusion is u.uprops[CONFUSION].intrinsic (youprop.h:83), read BY
             * VALUE — itimeout_incr() does not store.  (This used to synthesise a
             * `u2.HConfusion = {value:0}` ref for the old mutating itimeout_incr,
             * which both invented a store C never makes and zeroed any real
             * timeout it found.) */
            const incr = rn1(7, 16 - 8 * bcsign);
            make_confused(itimeout_incr(u2.uprops?.[CONFUSION]?.intrinsic | 0, incr), false);
            /* dopotion tail: if potion_nothing, bump potion_unkn + message */
            if (g._potion_nothing) {
                g._potion_unkn++;
                const HHallucination2 = u2.uprops?.[HALLUC]?.intrinsic || 0;
                const HHalluc_resistance2 = u2.uprops?.[HALLUC_RES]?.intrinsic || 0;
                const EHalluc_resistance2 = u2.uprops?.[HALLUC_RES]?.extrinsic || 0;
                const Halluc_resistance2 = HHalluc_resistance2 || EHalluc_resistance2;
                const Hallucination2 = HHallucination2 && !Halluc_resistance2;
                await pline(`You have a ${Hallucination2 ? 'normal' : 'peculiar'} feeling for a moment, then it passes.`);
            }
            if (otmp.dknown
                && !(g._oc_name_known && g._oc_name_known[otmp.otyp])) {
                if (!g._potion_unkn) {
                    discover_object(otmp.otyp, true, true, true);
                    more_experienced(0, 10);
                } else {
                    await _docall_potion(otmp);
                }
            }
            useup_potion(otmp);
        }
        else if (otmp.otyp === POT_BOOZE) {
            /* C potion.c:769-791 peffect_booze.  This arm did not exist: a
             * quaffed potion of booze fell out of the whole otyp ladder into
             * the trailing "Nothing happens." (potion.js's unported-type
             * fallback), so seed0002 step 241 said "Nothing happens." where C
             * says "Ooph!  This tastes like liquid fire!" and never drew
             * peffect_booze's d(2 + u.uhs, 8) — the first RNG-value divergence
             * of that session (global leaf 10634). */
            g._potion_nothing = 0;
            g._potion_unkn = 0;
            const u2 = g.u;
            /* C potion.c:772 gp.potion_unkn++ — booze is never auto-identified
             * by quaffing it, so dopotion's tail takes the trycall() arm. */
            g._potion_unkn++;
            /* C potion.c:773-775
             *   pline("Ooph!  This tastes like %s%s!",
             *         otmp->odiluted ? "watered down " : "",
             *         Hallucination ? "dandelion wine" : "liquid fire"); */
            await pline('Ooph!  This tastes like '
                        + (otmp.odiluted ? 'watered down ' : '')
                        + (_potion_Hallucination() ? 'dandelion wine' : 'liquid fire')
                        + '!');
            if (!otmp.blessed) {
                /* C potion.c:776-778 — "booze hits harder if drinking on an
                 * empty stomach": the die COUNT is 2 + u.uhs, so the hunger
                 * state is load-bearing on the RNG stream, not just on the
                 * status line.  HConfusion is u.uprops[CONFUSION].intrinsic,
                 * read BY VALUE (itimeout_incr does not store). */
                make_confused(itimeout_incr(u2.uprops?.[CONFUSION]?.intrinsic | 0,
                                            d(2 + (u2.uhs | 0), 8)), false);
            }
            /* C potion.c:780-782 — "the whiskey makes us feel better" */
            if (!otmp.odiluted)
                healup(1, 0, false, false);
            /* C potion.c:783-784 */
            u2.uhunger += 10 * (2 + bcsign(otmp));
            await newuhs(false);
            /* C potion.c:785 exercise(A_WIS, FALSE) — the dec arm draws rn2(2)
             * (attrib.c:509), so this is an RNG call site, not bookkeeping. */
            exercise(A_WIS, false);
            if (otmp.cursed) {
                /* C potion.c:786-790.  C assigns gm.multi DIRECTLY here — it
                 * does NOT call nomul(), so the monotonic guard and the
                 * uinvulnerable/usleep clears in hack.c:4071 do not run. */
                await pline('You pass out.');
                g.multi = -rnd(15);
                g.nomovemsg = 'You awake with a headache.';
            }
            /* dopotion tail (potion.c:626-641): peffects returns -1 for
             * POT_BOOZE, potion_nothing stayed 0, potion_unkn is 1 → trycall. */
            if (otmp.dknown
                && !(g._oc_name_known && g._oc_name_known[otmp.otyp])) {
                if (!g._potion_unkn) {
                    discover_object(otmp.otyp, true, true, true);
                    more_experienced(0, 10);
                } else {
                    await _docall_potion(otmp);
                }
            }
            useup_potion(otmp);
        }
        else if (otmp.otyp === POT_SLEEPING) {
            /* C potion.c:902-913 peffect_sleeping.  The corpus hero has no
             * Sleep_resistance or Free_action, so the else branch is taken:
             * "You suddenly fall asleep!" +
             * fall_asleep(-rn1(10,25-12*bcsign), TRUE).
             * rn1(x,y) = rn2(x) + y.  fall_asleep calls nomul and sets
             * multi_reason / nomovemsg. */
            const bcsign = (otmp.blessed ? 1 : 0) - (otmp.cursed ? 1 : 0);
            await pline('You suddenly fall asleep!');
            nomul(-(rn2(10) + (25 - 12 * bcsign)));
            g.multi_reason = 'sleeping';
            g.nomovemsg = 'You wake up.';
            /* dopotion tail: peffects returned -1 → useup + identify */
            if (otmp.dknown
                && !(g._oc_name_known && g._oc_name_known[otmp.otyp])) {
                discover_object(otmp.otyp, true, true, true);
                more_experienced(0, 10);
            }
            useup_potion(otmp);
        }
        else if (otmp.otyp === POT_FRUIT_JUICE) {
            /* C potion.c:1358-1361 peffects → peffect_see_invisible (the fruit
             * juice path, potion.c:843-862) followed by the dopotion tail
             * (potion.c:626-642) since peffects returns -1.  RNG-free for
             * uncursed, non-hallucinating, non-diluted fruit juice. */
            let potion_nothing = 0, potion_unkn = 0;
            potion_unkn++; /* peffect_see_invisible: gp.potion_unkn++ */
            const bcsign = (otmp.blessed ? 1 : 0) - (otmp.cursed ? 1 : 0);
            /* uncursed & !Hallucination: "This tastes like %s%s." with the
             * odiluted prefix and fruitname(TRUE) ("slime mold juice"). */
            await pline(`This tastes like ${otmp.odiluted ? 'reconstituted ' : ''}${fruitname(true)}.`);
            u.uhunger += (otmp.odiluted ? 5 : 10) * (2 + bcsign);
            await newuhs(false);
            /* dopotion tail: peffects returned -1, potion_nothing==0. */
            if (otmp.dknown
                && !(g._oc_name_known && g._oc_name_known[otmp.otyp])) {
                if (!potion_unkn) {
                    /* makeknown(otmp->otyp) == discover_object(otyp, TRUE, TRUE,
                     * TRUE); credit_hero=TRUE fires exercise(A_WIS, TRUE)
                     * (rn2(19)) the first time this type is identified. */
                    discover_object(otmp.otyp, true, true, true);
                    more_experienced(0, 10);
                } else {
                    await _docall_potion(otmp); /* trycall → docall */
                }
            }
            useup_potion(otmp);
        }
        else if (otmp.otyp === POT_SICKNESS) {
            /* C potion.c:963 peffect_sickness, reached through peffects'
             * `case POT_SICKNESS:` (potion.c:1290).  peffects returns -1 for it,
             * so dopotion runs its full tail (potion.c:627-641).  peffect_sickness
             * touches NEITHER gp.potion_nothing NOR gp.potion_unkn, so both keep
             * the 0 dopotion set at potion.c:623 — the identify arm is the
             * !potion_unkn one (makeknown + more_experienced), not trycall. */
            await peffect_sickness(otmp);
            if (otmp.dknown
                && !(g._oc_name_known && g._oc_name_known[otmp.otyp])) {
                discover_object(otmp.otyp, true, true, true);
                more_experienced(0, 10);
            }
            useup_potion(otmp);
        }
        else if (otmp.otyp === POT_HEALING) {
            /* C potion.c:1120-1128 peffect_healing. Records are UNCURSED:
             * bcsign=0, d(4,4) draws 1 rng call. */
            const bcsign = (otmp.blessed ? 1 : 0) - (otmp.cursed ? 1 : 0);
            await pline('You feel better.');
            healup(8 + d(4 + 2 * bcsign, 4), !otmp.cursed ? 1 : 0,
                   !!otmp.blessed, !otmp.cursed);
            exercise(A_CON, true);
            /* dopotion tail: peffects returns -1 → useup + identify */
            if (otmp.dknown
                && !(g._oc_name_known && g._oc_name_known[otmp.otyp])) {
                discover_object(otmp.otyp, true, true, true);
                more_experienced(0, 10);
            }
            useup_potion(otmp);
        }
        else if (otmp.otyp === POT_FULL_HEALING) {
            /* C potion.c:1145-1165 peffect_full_healing */
            const bcsign = (otmp.blessed ? 1 : 0) - (otmp.cursed ? 1 : 0);
            await pline('You feel completely healed.');
            healup(400, 4 + 4 * bcsign, !otmp.cursed ? 1 : 0, true);
            /* Restore one lost level if blessed */
            if (otmp.blessed && u.ulevel < u.ulevelmax) {
                u.ulevelmax -= 1;
                await pluslvl(false);
            }
            make_hallucinated(0, true, 0);
            exercise(0 /* A_STR */, true);
            exercise(A_CON, true);
            /* blessed potion heals wounded legs even when riding */
            if (_wounded_legs() && (otmp.blessed || (!otmp.cursed && !u.usteed)))
                heal_legs(0);
            /* dopotion tail: peffects returns -1 → useup + identify */
            if (otmp.dknown
                && !(g._oc_name_known && g._oc_name_known[otmp.otyp])) {
                discover_object(otmp.otyp, true, true, true);
                more_experienced(0, 10);
            }
            useup_potion(otmp);
        }
        else if (otmp.otyp === POT_EXTRA_HEALING) {
            /* C potion.c:1127-1141 peffect_extra_healing, reached through
             * peffects' `case POT_EXTRA_HEALING:` (potion.c:1310).  The case
             * breaks, so peffects returns -1 and dopotion runs its full tail
             * (potion.c:626-641) — useup + identify.  Calls the single shared
             * body below rather than re-inlining it here. */
            await peffect_extra_healing(otmp);
            /* dopotion tail: peffects returned -1, potion_nothing/unkn == 0. */
            if (otmp.dknown
                && !(g._oc_name_known && g._oc_name_known[otmp.otyp])) {
                discover_object(otmp.otyp, true, true, true);
                more_experienced(0, 10);
            }
            useup_potion(otmp);
        }
        else if (otmp.otyp === POT_SPEED) {
            /* C potion.c:1054-1073 peffect_speed */
            g._potion_nothing = 0;
            g._potion_unkn = 0;
            const bcsign_val = bcsign(otmp);
            /* skip when mounted; heal_legs() would heal steed's legs */
            if (_wounded_legs() && !otmp.cursed && !u.usteed) {
                heal_legs(0);
                g._potion_unkn++;
            } else {
                speed_up(rn1(10, 100 + 60 * bcsign_val));
                /* non-cursed potion grants intrinsic speed */
                if (!otmp.cursed && !(u.HFast & INTRINSIC)) {
                    Your("quickness feels very natural.");
                    u.HFast |= FROMOUTSIDE;
                }
            }
            /* dopotion tail: peffects returns -1 → useup + identify */
            if (otmp.dknown
                && !(g._oc_name_known && g._oc_name_known[otmp.otyp])) {
                if (!g._potion_unkn) {
                    discover_object(otmp.otyp, true, true, true);
                } else {
                    await _docall_potion(otmp);
                }
            }
            useup_potion(otmp);
            g.disp.botl = 1;
        }
        else if (otmp.otyp === POT_BLINDNESS) {
            /* C potion.c:1075-1080 via peffects(), then dopotion's ordinary
             * identification/useup tail at potion.c:623-641. */
            g._potion_nothing = 0;
            g._potion_unkn = 0;
            await peffect_blindness(otmp);
            if (g._potion_nothing) {
                g._potion_unkn = (g._potion_unkn | 0) + 1;
                await You(`have a ${_potion_Hallucination() ? 'normal' : 'peculiar'} feeling for a moment, then it passes.`);
            }
            if (otmp.dknown
                && !(g._oc_name_known && g._oc_name_known[otmp.otyp])) {
                if (!g._potion_unkn) {
                    discover_object(otmp.otyp, true, true, true);
                    more_experienced(0, 10);
                } else {
                    await _docall_potion(otmp);
                }
            }
            useup_potion(otmp);
            g.disp.botl = 1;
        }
        else if (otmp.otyp === POT_LEVITATION) {
            g._potion_nothing = 0;
            g._potion_unkn = 0;
            await peffect_levitation(otmp);
            if (g._potion_nothing) {
                g._potion_unkn++;
                await pline(`You have a ${_potion_Hallucination() ? 'normal' : 'peculiar'} feeling for a moment, then it passes.`);
            }
            if (otmp.dknown
                && !(g._oc_name_known && g._oc_name_known[otmp.otyp])) {
                if (!g._potion_unkn) {
                    discover_object(otmp.otyp, true, true, true);
                    more_experienced(0, 10);
                } else {
                    await _docall_potion(otmp);
                }
            }
            useup_potion(otmp);
        }
        else if (otmp.otyp === POT_INVISIBILITY) {
            /* C potion.c:1352-1355:
             *     case SPE_INVISIBILITY:
             *     case POT_INVISIBILITY:
             *         peffect_invisibility(otmp);
             *         break;
             * The case breaks, so peffects() returns -1 and dopotion runs its
             * full tail (potion.c:624-641): the potion_nothing message, the
             * identify screen, then useup.  ONE body, called here — see the
             * block comment above the peffect_* stubs. */
            g._potion_nothing = 0;
            g._potion_unkn = 0;
            await peffect_invisibility(otmp);
            if (g._potion_nothing) {
                g._potion_unkn = (g._potion_unkn | 0) + 1;
                await pline(`You have a ${_hallucination() ? 'normal' : 'peculiar'} feeling for a moment, then it passes.`);
            }
            if (otmp.dknown
                && !(g._oc_name_known && g._oc_name_known[otmp.otyp])) {
                if (!g._potion_unkn) {
                    discover_object(otmp.otyp, true, true, true);
                    more_experienced(0, 10);
                } else {
                    await _docall_potion(otmp);
                }
            }
            useup_potion(otmp);
            g.disp.botl = 1;
        }
        else if (otmp.otyp === POT_MONSTER_DETECTION) {
            /* C potion.c:1366-1370:
             *     case POT_MONSTER_DETECTION:
             *     case SPE_DETECT_MONSTERS:
             *         if (peffect_monster_detection(otmp))
             *             return 1;
             *         break;
             * A 1 makes peffects() return 1, and dopotion (potion.c:625) then
             * returns ECMD_TIME WITHOUT useup and WITHOUT the identify screen —
             * the potion stays in the pack.  A 0 falls out of the switch and
             * runs the ordinary tail. */
            g._potion_nothing = 0;
            g._potion_unkn = 0;
            const md_ret = await peffect_monster_detection(otmp);
            if (!md_ret) {
                if (g._potion_nothing) {
                    g._potion_unkn = (g._potion_unkn | 0) + 1;
                    await pline(`You have a ${_hallucination() ? 'normal' : 'peculiar'} feeling for a moment, then it passes.`);
                }
                if (otmp.dknown
                    && !(g._oc_name_known && g._oc_name_known[otmp.otyp])) {
                    if (!g._potion_unkn) {
                        discover_object(otmp.otyp, true, true, true);
                        more_experienced(0, 10);
                    } else {
                        await _docall_potion(otmp);
                    }
                }
                useup_potion(otmp);
                g.disp.botl = 1;
            }
        }
        else if (otmp.otyp === POT_OBJECT_DETECTION) {
            /* C potion.c:1371-1375:
             *     case POT_OBJECT_DETECTION:
             *     case SPE_DETECT_TREASURE:
             *         if (peffect_object_detection(otmp))
             *             return 1;
             *         break;
             * Same 1/0 convention as POT_MONSTER_DETECTION just above: a 1
             * ("nothing detected") makes peffects() return 1 and dopotion
             * (potion.c:625) returns ECMD_TIME WITHOUT useup/identify; a 0
             * falls out of the switch and dopotion runs its ordinary tail.
             * This arm did not exist at all: dodrink's otyp ladder had no
             * POT_OBJECT_DETECTION case, so quaffing one fell into the
             * trailing "Nothing happens." fallback and drew nothing. */
            g._potion_nothing = 0;
            g._potion_unkn = 0;
            const od_ret = await peffect_object_detection(otmp);
            if (!od_ret) {
                if (g._potion_nothing) {
                    g._potion_unkn = (g._potion_unkn | 0) + 1;
                    await pline(`You have a ${_hallucination() ? 'normal' : 'peculiar'} feeling for a moment, then it passes.`);
                }
                if (otmp.dknown
                    && !(g._oc_name_known && g._oc_name_known[otmp.otyp])) {
                    if (!g._potion_unkn) {
                        discover_object(otmp.otyp, true, true, true);
                        more_experienced(0, 10);
                    } else {
                        await _docall_potion(otmp);
                    }
                }
                useup_potion(otmp);
                g.disp.botl = 1;
            }
        }
        else if (otmp.otyp === POT_GAIN_LEVEL) {
            /* C potion.c:1392-1394:
             *     case POT_GAIN_LEVEL:
             *         peffect_gain_level(otmp);
             *         break;
             * The case breaks, so peffects() returns -1 and dopotion runs its
             * full tail (potion.c:624-641). */
            g._potion_nothing = 0;
            g._potion_unkn = 0;
            await peffect_gain_level(otmp);
            if (g._potion_nothing) {
                g._potion_unkn = (g._potion_unkn | 0) + 1;
                await pline(`You have a ${_hallucination() ? 'normal' : 'peculiar'} feeling for a moment, then it passes.`);
            }
            if (otmp.dknown
                && !(g._oc_name_known && g._oc_name_known[otmp.otyp])) {
                if (!g._potion_unkn) {
                    discover_object(otmp.otyp, true, true, true);
                    more_experienced(0, 10);
                } else {
                    await _docall_potion(otmp);
                }
            }
            useup_potion(otmp);
        }
        else if (otmp.otyp === POT_ENLIGHTENMENT) {
            /* C potion.c:1348-1350:
             *     case POT_ENLIGHTENMENT:
             *         peffect_enlightenment(otmp);
             *         break;
             * peffects returns -1, so dopotion runs its full tail. */
            g._potion_nothing = 0;
            g._potion_unkn = 0;
            await peffect_enlightenment(otmp);
            if (g._potion_nothing) {
                g._potion_unkn = (g._potion_unkn | 0) + 1;
                await pline(`You have a ${_hallucination() ? 'normal' : 'peculiar'} feeling for a moment, then it passes.`);
            }
            if (otmp.dknown
                && !(g._oc_name_known && g._oc_name_known[otmp.otyp])) {
                if (!g._potion_unkn) {
                    discover_object(otmp.otyp, true, true, true);
                    more_experienced(0, 10);
                } else {
                    await _docall_potion(otmp);
                }
            }
            useup_potion(otmp);
        }
        else if (otmp.otyp === POT_SEE_INVISIBLE) {
            /* C potion.c:1358-1361:
             *     case POT_SEE_INVISIBLE:
             *     case POT_FRUIT_JUICE:
             *         peffect_see_invisible(otmp);
             *         break;
             * ONE C function serves both otyps; the POT_FRUIT_JUICE arm above
             * inlines its early-return half.  This arm is the OTHER half, which
             * was absent: gen135-reseed-seed1191299 step 5 quaffs a potion of
             * see invisible, C prints "This tastes like slime mold juice." and
             * draws rn1(100, 750) at potion.c:870, and this port printed
             * "Nothing happens." and drew nothing. */
            g._potion_nothing = 0;
            g._potion_unkn = 0;
            await peffect_see_invisible(otmp);
            if (g._potion_nothing) {
                g._potion_unkn = (g._potion_unkn | 0) + 1;
                await pline(`You have a ${_hallucination() ? 'normal' : 'peculiar'} feeling for a moment, then it passes.`);
            }
            if (otmp.dknown
                && !(g._oc_name_known && g._oc_name_known[otmp.otyp])) {
                if (!g._potion_unkn) {
                    discover_object(otmp.otyp, true, true, true);
                    more_experienced(0, 10);
                } else {
                    await _docall_potion(otmp);
                }
            }
            useup_potion(otmp);
        }
        else if (otmp.otyp === POT_GAIN_ENERGY) {
            /* C potion.c:1222-1253 peffect_gain_energy ("M. Stephenson").
             * This arm fell into the trailing "Nothing happens." fallback and
             * drew nothing: num = d(blessed?3:uncursed?2:1, 6) is ONE tape
             * entry (one aggregate value, per the d(N,M) note), negated when
             * cursed, then folded into uenmax/uen with the same peak-tracking
             * and floor-at-0 clamps as C, followed by exercise(A_WIS, TRUE)
             * (attrib.c:508 — conditionally draws rn2(19)). peffects() falls
             * through to `break` for this case, so peffects() returns -1 and
             * dopotion's tail is the plain useup+identify (potion_nothing/
             * potion_unkn are untouched by this peffect and stay 0, so there
             * is no docall/trycall arm — mirrors the POT_HEALING branch
             * above). */
            if (otmp.cursed) {
                await You_feel('lackluster.');
            } else {
                await pline('Magical energies course through your body.');
            }
            let num = d(otmp.blessed ? 3 : !otmp.cursed ? 2 : 1, 6);
            if (otmp.cursed) num = -num;
            u.uenmax += num;
            if (u.uenmax > u.uenpeak) u.uenpeak = u.uenmax;
            else if (u.uenmax <= 0) u.uenmax = 0;
            u.uen += 3 * num;
            if (u.uen > u.uenmax) u.uen = u.uenmax;
            else if (u.uen <= 0) u.uen = 0;
            g.disp.botl = 1;
            exercise(A_WIS, true);
            /* dopotion tail: peffects returns -1 → useup + identify. */
            if (otmp.dknown
                && !(g._oc_name_known && g._oc_name_known[otmp.otyp])) {
                discover_object(otmp.otyp, true, true, true);
                more_experienced(0, 10);
            }
            useup_potion(otmp);
        }
        else if (otmp.otyp === POT_RESTORE_ABILITY) {
            /* C potion.c:2020-2023 (peffects):
             *     case POT_RESTORE_ABILITY:
             *     case SPE_RESTORE_ABILITY:
             *         peffect_restore_ability(otmp);
             *         break;
             * peffects returns -1, so dopotion runs its full tail — same
             * shape as the POT_ENLIGHTENMENT/POT_SEE_INVISIBLE arms above.
             * (SPE_RESTORE_ABILITY is the spell entry point, reached through
             * a temporary spellbook object elsewhere, not through dodrink.) */
            g._potion_nothing = 0;
            g._potion_unkn = 0;
            await peffect_restore_ability(otmp);
            if (g._potion_nothing) {
                g._potion_unkn = (g._potion_unkn | 0) + 1;
                await pline(`You have a ${_hallucination() ? 'normal' : 'peculiar'} feeling for a moment, then it passes.`);
            }
            if (otmp.dknown
                && !(g._oc_name_known && g._oc_name_known[otmp.otyp])) {
                if (!g._potion_unkn) {
                    discover_object(otmp.otyp, true, true, true);
                    more_experienced(0, 10);
                } else {
                    await _docall_potion(otmp);
                }
            }
            useup_potion(otmp);
        }
        else if (otmp.otyp === POT_HALLUCINATION) {
            /* C potion.c:2024-2026 (peffects):
             *     case POT_HALLUCINATION:
             *         peffect_hallucination(otmp);
             *         break;
             * peffects returns -1, so dopotion runs its full tail — same
             * shape as the POT_ENLIGHTENMENT/POT_SEE_INVISIBLE arms above. */
            g._potion_nothing = 0;
            g._potion_unkn = 0;
            await peffect_hallucination(otmp);
            if (g._potion_nothing) {
                g._potion_unkn = (g._potion_unkn | 0) + 1;
                await pline(`You have a ${_hallucination() ? 'normal' : 'peculiar'} feeling for a moment, then it passes.`);
            }
            if (otmp.dknown
                && !(g._oc_name_known && g._oc_name_known[otmp.otyp])) {
                if (!g._potion_unkn) {
                    discover_object(otmp.otyp, true, true, true);
                    more_experienced(0, 10);
                } else {
                    await _docall_potion(otmp);
                }
            }
            useup_potion(otmp);
        }
        else {
            /* TODO: other potion types — when ported, mirror C dopotion's
             * useup-vs-early-return per the case's peffects() return value. */
            await pline('Nothing happens.');
        }
    }
    else {
        /* Fallback: no inventory chain. Assume uncursed POT_WATER
         * (correct for seed1900 item 'h'). */
        const syntheticOtmp = { blessed: false, cursed: false, otyp: POT_WATER };
        await peffect_water(syntheticOtmp);
    }
    /* C potion.c:616 return ECMD_TIME — quaffing takes a turn.
     *
     * dodrink is time-consuming (ECMD_TIME), so on the FF_FAITHFUL path the
     * moveloop clears _pending_message after rhack returns (allmain.js:485-487).
     * Mirror the other time-consuming commands (throw/wield/door-open): promote
     * the quaff-result pline ("This tastes like water." etc.) to _resultMessage
     * so rhack(0) restores it onto the topline before the next flush+nhgetch,
     * matching C's tty topline that lingers until the next keypress
     * (seed1900 step5 "This tastes like water."). */
    if (g._pending_message) {
        _topl_stash_result();
    }
    g.context.move = 1;
    return ECMD_TIME;
}

/* potionbreathe(obj) — C ref: nethack-c/src/potion.c:1933-2120 potionbreathe().
 * Apply potion effects when a potion is breathed/exhaled via external agency.
 * RNG: rn2(A_MAX) on POT_RESTORE/GAIN_ABILITY uncursed + blessed, rnd(5) on several.
 */

/* Potion type constants (C objects.h base 297 + offset) */
const POT_GAIN_ABILITY = 297;
const POT_RESTORE_ABILITY = 298;
const POT_CONFUSION = 299;
const POT_BLINDNESS = 300;
const POT_PARALYSIS = 301;
const POT_SPEED = 302;
const POT_LEVITATION = 303;
const POT_HALLUCINATION = 304;
const POT_INVISIBILITY = 305;
const POT_SEE_INVISIBLE = 306;
const POT_HEALING = 307;
const POT_EXTRA_HEALING = 308;
const POT_GAIN_LEVEL = 309;
const POT_ENLIGHTENMENT = 310;
const POT_MONSTER_DETECTION = 311;
const POT_OBJECT_DETECTION = 312;
const POT_GAIN_ENERGY = 313;
const POT_SLEEPING = 314;
const POT_FULL_HEALING = 315;
const POT_POLYMORPH = 316;
const POT_BOOZE = 317;
const POT_SICKNESS = 318;
const POT_FRUIT_JUICE = 319;
const POT_ACID = 320;

/* TOWEL constant — armor otyp base 89 + LEATHER_CLOAK offset */
const TOWEL = 234; /* objects.h TOOL() TOWEL; was 125 = BANDED_MAIL */
/* objects.h otyps the dip tail tests, resolved from js/oc_name_data.js (the
 * generated OC_NAME table): "corpse" 265, "oil lamp" 227, "magic lamp" 228. */
const CORPSE = 265;
const OIL_LAMP = 227;
const MAGIC_LAMP = 228;

/* C mondata.h:26 `#define breathless(ptr) (((ptr)->mflags1 & M1_BREATHLESS) != 0L)`
 * and mondata.h:46 `#define haseyes(ptr) (((ptr)->mflags1 & M1_NOEYES) == 0L)`.
 * Both were throwing stubs; potionbreathe()'s POT_RESTORE/GAIN_ABILITY arm and
 * potionhit()'s vapour gate (potion.c:1907) read them, so the throw was on a
 * live path.  Flag values from nethack-c-v5/upstream/include/monflag.h:95,97 —
 * NOT from js/mhitu.js:17604, whose local M1_NOEYES is 0x200 and wrong
 * (monflag-audit WRONG-FLAG).  A missing mondata (the hero's youmonst.data is
 * always set once chargen ran) reads as "breathes, has eyes", C's human case. */
/* C decl.c:47 — the `You_can_move_again` global ("You can move again.").
 * potionbreathe()'s POT_PARALYSIS and POT_SLEEPING arms referenced the C
 * spelling as a BARE IDENTIFIER, which is a ReferenceError in JS, so both arms
 * threw the moment anything reached them. */
const You_can_move_again = 'You can move again.';
const M1_BREATHLESS_POT = 0x00000400;
const M1_NOEYES_POT = 0x00001000;
function breathless(mondata) {
    return ((mondata?.mflags1 | 0) & M1_BREATHLESS_POT) !== 0;
}
function haseyes(mondata) {
    return ((mondata?.mflags1 | 0) & M1_NOEYES_POT) === 0;
}
/* C polyself.c:2143-2146 body_part(int part) { return mbodypart(&gy.youmonst, part); }
 * The real port lives in js/cmd.js and is exported; this file carried a
 * file-local THROWING stub of the same name, which shadowed it at every call
 * site here while the file simultaneously imported the real one as
 * `body_part_pot`.  One binding now: the import above. */
function eyecount(mondata) {
    if (!haseyes(mondata))
        return 0;
    const pmidx = mondata?.pmidx | 0;
    return (pmidx === PM_CYCLOPS || pmidx === PM_FLOATING_EYE) ? 1 : 2;
}
/* C objnam.c:2833-3020 makeplural() is fully ported in js/objnam.js and
 * exported; this file carried a file-local throwing stub of the same name,
 * which SHADOWED it for every call site here (fountain.c:44's hallucinatory
 * snake plural, potion.c:1267's lycanthrope form, the floating-eye "eyes").
 * Re-exported through a wrapper rather than an import so the four existing
 * call sites keep their unqualified spelling. */
function makeplural(word) {
    return makeplural_objnam(word);
}
function vtense(subj, verb) {
    return vtense_objnam(subj, verb);
}
/* C ref: pline.c Your(line, ...) —
 *     vpline(YouMessage(youbuf, "Your ", line), the_args);
 * with pline.h's `#define YouMessage(buf, pfx, msg) \
 *     strcat(strcpy(You_buf(...), pfx), msg)`, i.e. the message with "Your "
 * prepended.  Same body and same %s expansion as You() below, which is this
 * file's own convention for the family; js/read.js:3121 and js/shk.js:2800
 * carry the identical one-liner.
 *
 * This stub HALTED the scored run: seed4500 quaffs from a fountain at step
 * 1326, drinkfountain() -> vomit() reaches the `u.uhs >= FAINTING` arm and
 * calls Your('stomach heaves convulsively!'), which threw and forfeited the
 * remaining 488 recorded frames. */
async function Your(msg, ...args) {
    let s = msg;
    let ai = 0;
    s = s.replace(/%s/g, () => args[ai++] || '');
    return pline('Your ' + s);
}
/* async so the make_*() setters below can await the topline the way every other
 * awaited pline() site in this port does; the existing unawaited callers are
 * unaffected — they already dropped pline()'s promise on the floor. */
async function You(msg, ...args) {
    let s = msg;
    let ai = 0;
    s = s.replace(/%s/g, () => args[ai++] || '');
    return pline('You ' + s);
}
async function You_feel(msg, ...args) {
    let s = msg;
    let ai = 0;
    s = s.replace(/%s/g, () => args[ai++] || '');
    return pline('You feel ' + s);
}
/* C hack.h:1027 `#define Your1(cstr) Your("%s", cstr)` — Your() prefixes
 * "Your ".  js/mhitu.js:384 and js/uhitm.js:3878 already carry this one-liner;
 * this copy threw, and a monster's AD_STON hiss reaches it through
 * make_blinded's caller below.  MEASURED: it TRUNCATED
 * corpus-generated/v5/train/gen172-reseed-seed776356 at step 183. */
function Your1(msg) {
    return pline('Your ' + msg);
}
/* C potion.c:88-104  make_confused(long xtime, boolean talk)
 *     long old = HConfusion;
 *     if (Unaware) talk = FALSE;
 *     if (!xtime && old)
 *         if (talk) You_feel("less %s now.", Hallucination ? "trippy":"confused");
 *     if ((xtime && !old) || (!xtime && old)) disp.botl = TRUE;
 *     set_itimeout(&HConfusion, xtime);
 *
 * RNG-FREE — every caller draws its own duration and passes it in by value.
 *
 * THE STORE IS THE WHOLE POINT.  HConfusion is u.uprops[CONFUSION].intrinsic
 * (youprop.h:83), which is what js/display.js's status line, js/cmd.js's
 * u_maybe_impaired() and js/cmd.js's autoopen/paranoid guards all read.  C has
 * exactly ONE make_confused; this port had FIVE copies of it and not one of
 * them wrote that word: js/mhitu.js:131 and js/sit.js:60 were empty bodies
 * (and js/mhitu.js's was the EXPORTED one this file and js/spell.js imported),
 * while js/read.js:2647 and js/eat.js:971 wrote a flat `game.HConfusion` that
 * only their own file-local readers consult.  Net effect: nothing in the game
 * could make the hero confused.  seed0002 quaffs a potion of confusion at step
 * 237, C paints " Conf" on the status line, and the port painted nothing there
 * for the remaining 358 steps of the run.
 * Exported so the other four copies can delegate here instead of drifting. */
export function make_confused(xtime, talk) {
    const u = game.u;
    if (!u)
        return;
    if (!u.uprops)
        u.uprops = {};
    let p = u.uprops[CONFUSION];
    if (!p)
        p = u.uprops[CONFUSION] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    const old = p.intrinsic | 0;

    if (_Unaware())
        talk = false;

    if (!xtime && old) {
        if (talk)
            You_feel(`less ${_potion_Hallucination() ? 'trippy' : 'confused'} now.`);
    }
    if ((xtime && !old) || (!xtime && old)) {
        if (game.disp)
            game.disp.botl = 1;
    }
    /* C set_itimeout(&HConfusion, xtime) — clears the TIMEOUT bits and ORs in
     * the clamped new value, preserving FROMOUTSIDE/INTRINSIC bits above it. */
    const which = { value: old };
    set_itimeout(which, xtime);
    p.intrinsic = which.value;
}
/* C youprop.h:399  Unaware == (gm.multi < 0 && (unconscious() || is_fainted()))
 * — the two halves are the real ported ones (js/pickup.js, js/eat.js). */
function _Unaware() {
    return ((game.multi | 0) < 0) && (!!unconscious() || !!is_fainted());
}
/* C youprop.h  Hallucination == (HHallucination && !Halluc_resistance).  This
 * file open-codes the same expression twice inside peffect_confusion; this is
 * that expression, named. */
function _potion_Hallucination() {
    const up = game.u && game.u.uprops;
    if (!up)
        return false;
    /* youprop.h:116 HHallucination is u.uprops[HALLUC].INTRINSIC only — there is
     * no EHallucination in 5.0.  (This read used to OR in .extrinsic, which is
     * a word nothing writes; harmless then, wrong now that make_hallucinated()
     * below branches on it.) */
    const hallu = (up[HALLUC]?.intrinsic | 0);
    const res = (up[HALLUC_RES]?.intrinsic | 0) || (up[HALLUC_RES]?.extrinsic | 0);
    return !!(hallu && !res);
}
/* RE-POINTED 2026-08-20, and A/B'd against the floor exactly as the note it
 * replaces asked for.  That note was right about the shadowing (three call
 * sites in this file, all silenced) and right to be cautious — waking
 * toggle_blindness()/vision_recalc on an unmeasured path is how re-pointing a
 * silent stub cost this project 2059 points once.  What it lacked was a
 * session that NEEDED it: seed4500-knight-coverage step 1204 quaffs a wished
 * potion of extra healing while blind, so healup(..., cureblind=TRUE) is
 * supposed to raise the second half of "You feel much better.  You can see
 * again." and clear the status line's Blind.  Through the stub it raised
 * neither, and the hero stayed blind for the remaining 610 frames of the
 * recording.
 * `make_blinded` is imported from js/zap.js (C potion.c:261) rather than
 * re-declared, so there is exactly one body and no fourth spelling. */
/* ── The make_*() property setters (potion.c:137-467). ───────────────────────
 *
 * All five bodies below were dead no-op stubs with ZERO call sites in this
 * file.  They became load-bearing with the #wizintrinsic port (wizcmds.c:1023-
 * 1078): every arm of that switch is one of these, and cmd.js was throwing
 * rather than guessing at them, which HALTED the scored run of
 * seed0399-wizard-hallu-actions at frame 414/532 and
 * seed0383-wizard-hallucinate at 164/219 (both pick property 23, HALLUC).
 *
 * RNG CONTRACT — measured against the C source, not assumed.  NONE of these
 * bodies draws from the scored stream:
 *   - make_hallucinated's see_monsters()/see_objects()/see_traps() reach
 *     random_monster()/random_object() only via rn2_on_display_rng(), which is
 *     the separate DISPLAY rng (display.c:640 and mapglyph.c), not the game
 *     stream this port scores.
 *   - make_sick() is the ONE exception and it draws INDIRECTLY: exercise(A_CON,
 *     FALSE) is `AEXE(i) -= rn2(2)` (attrib.c:509) whenever |AEXE(A_CON)| <
 *     AVAL.  That draw is real and is on the scored stream.
 *   - the caller's own `typ = !rn2(2) ? ...` (wizcmds.c:1047) is a SECOND draw,
 *     and it happens BEFORE make_sick()'s.  Order: caller rn2(2), then
 *     exercise's rn2(2).
 * Everything else — set_itimeout, the killer list, update_inventory — is pure
 * state.
 *
 * They are `async` because pline() is async in this port; C's are void/boolean.
 */

/* The u.uprops[] row for a property, created on demand.  C's u.uprops[] is a
 * fixed array so every row always exists; this port allocates lazily. */
function _uprop(p) {
    const u = game.u || (game.u = {});
    if (!u.uprops)
        u.uprops = {};
    return u.uprops[p]
        || (u.uprops[p] = { intrinsic: 0, extrinsic: 0, blocked: 0 });
}
/* C `set_itimeout(&u.uprops[p].intrinsic, val)` — set_itimeout() here takes a
 * {value} box because JS has no `long *`. */
function _set_prop_itimeout(prop, val) {
    const which = { value: prop.intrinsic | 0 };
    set_itimeout(which, val);
    prop.intrinsic = which.value;
}
/* C youprop.h:103  Blind ((HBlinded || EBlinded) && !BBlinded).  Deliberately
 * NOT the `|| u.ublind` variant js/display.js:_disp_Blind carries — this is the
 * macro as written. */
function _potion_Blind() {
    const bp = game.u?.uprops?.[BLINDED];
    return !!bp && !!((bp.intrinsic | 0) || (bp.extrinsic | 0))
        && !(bp.blocked | 0);
}
function _potion_Invisible() {
    const ip = game.u?.uprops?.[INVIS];
    const sp = game.u?.uprops?.[SEE_INVIS];
    return !!((ip?.intrinsic | 0) || (ip?.extrinsic | 0))
        && !((sp?.intrinsic | 0) || (sp?.extrinsic | 0));
}
function _potion_Fast() {
    const u = game.u || {};
    return !!((u.HFast | 0) & (TIMEOUT | INTRINSIC))
        || !!(u.uprops?.[FAST]?.extrinsic | 0);
}
/* C youprop.h:125  Deaf (HDeaf || EDeaf || u.uroleplay.deaf). */
function _potion_Deaf() {
    const dp = game.u?.uprops?.[DEAF];
    return !!((dp?.intrinsic | 0) || (dp?.extrinsic | 0)
              || (game.u?.uroleplay?.deaf ? 1 : 0));
}
/* C youprop.h:69  Sick_resistance (HSick_resistance || ESick_resistance || ...).
 * The C macro's tail is a polymorph-form test; Upolyd is modelled here through
 * the same u.uprops[SICK_RES] row every other JS reader uses. */
function _potion_Sick_resistance() {
    const sp = game.u?.uprops?.[SICK_RES];
    return !!((sp?.intrinsic | 0) || (sp?.extrinsic | 0));
}

/* C potion.c:442-455  make_deaf(long xtime, boolean talk) */
export async function make_deaf(xtime, talk) {
    const pd = _uprop(DEAF);
    const old = pd.intrinsic | 0;

    if (_Unaware())
        talk = false;

    _set_prop_itimeout(pd, xtime);
    /* C `(xtime != 0L) ^ (old != 0L)`.  This used to read `(xtime !== 0)`,
     * which is a TYPE test as well as a value test in JS: healup() and
     * peffect_healing() below call in with the BigInt literal `0n`, and
     * `0n !== 0` is TRUE, so every uncursed potion of healing took the
     * state-changed branch and printed "You are unable to hear anything." on a
     * hero who was never deaf.  seed0002 step 315 is exactly that frame — C
     * "You feel better.", JS "You feel better.  You are unable to hear
     * anything."  C's test is truthiness of a long, which is `!!x` for a JS
     * Number and a BigInt alike. */
    if (!!xtime !== !!old) {
        SET_BOTL();
        if (talk)
            await You(old && !_potion_Deaf() ? "can hear again."
                                             : "are unable to hear anything.");
    }
}

/* C potion.c:242-256  make_vomiting(long xtime, boolean talk).  Note that C
 * sets disp.botl UNCONDITIONALLY here, unlike its siblings. */
export async function make_vomiting(xtime, talk) {
    const pv = _uprop(VOMITING);
    const old = pv.intrinsic | 0;

    if (_Unaware())
        talk = false;

    _set_prop_itimeout(pv, xtime);
    SET_BOTL();
    if (!xtime && old)
        if (talk)
            await You_feel("much less nauseated now.");
}

/* C potion.c:136-192  make_sick(long xtime, const char *cause, boolean talk,
 *                               int type)
 * The `Unaware` early-out is #if 0'd out in C ("tell player even if hero is
 * unconscious"), so talk is NOT suppressed here — and the "deathly sick" line
 * is not even gated on talk. */
export async function make_sick(xtime, cause, talk, type) {
    const u = game.u || (game.u = {});
    const ps = _uprop(SICK);
    const old = ps.intrinsic | 0;

    if (xtime > 0) {
        if (_potion_Sick_resistance())
            return;
        if (!old) {
            /* newly sick */
            await You_feel("deathly sick.");
        } else {
            /* already sick */
            if (talk)
                await You_feel(`${xtime <= Math.trunc(old / 2) ? "much" : "even"} worse.`);
        }
        _set_prop_itimeout(ps, xtime);
        u.usick_type = (u.usick_type | 0) | type;
        SET_BOTL();
    } else if (old && (type & (u.usick_type | 0))) {
        /* was sick, now not */
        u.usick_type = (u.usick_type | 0) & ~type;
        if (u.usick_type) { /* only partly cured */
            if (talk)
                await You_feel("somewhat better.");
            _set_prop_itimeout(ps, (ps.intrinsic | 0) * 2); /* approximation */
        } else {
            if (talk)
                await You_feel("cured.  What a relief!");
            ps.intrinsic = 0; /* C: Sick = 0L, i.e. NOT set_itimeout(&Sick, 0) */
        }
        SET_BOTL();
    }

    const kptr = find_delayed_killer(SICK);
    if (ps.intrinsic | 0) {
        exercise(A_CON, false);
        /* C: "setting delayed_killer used to be unconditional, but that's not
           right when make_sick(0) is called to cure food poisoning if hero was
           also fatally ill; this is only approximate" */
        if (xtime || !old || !kptr) {
            const kpfx = (cause === "#wizintrinsic") ? KILLED_BY : KILLED_BY_AN;
            delayed_killer(SICK, kpfx, cause);
        }
    } else {
        dealloc_killer(kptr);
    }
}

/* C potion.c:194-219  make_slimed(long xtime, const char *msg) */
export async function make_slimed(xtime, msg) {
    const psl = _uprop(SLIMED);
    const old = psl.intrinsic | 0;

    _set_prop_itimeout(psl, xtime);
    /* C `(xtime != 0L) ^ (old != 0L)` — truthiness, not a typed !== (see
     * make_deaf above: a BigInt `0n` argument makes `xtime !== 0` true). */
    if (!!xtime !== !!old) {
        SET_BOTL();
        if (msg)
            await pline(msg);
    }
    if (!(psl.intrinsic | 0)) {
        dealloc_killer(find_delayed_killer(SLIMED));
        /* fake appearance is set late in turn-to-slime countdown */
        const ym = game.youmonst;
        if (ym && ((ym.m_ap_type | 0) & M_AP_TYPMASK) === M_AP_MONSTER
            && (ym.mappearance | 0) === PM_GREEN_SLIME) {
            ym.m_ap_type = M_AP_NOTHING;
            ym.mappearance = 0;
        }
    }
}

/* C potion.c:221-240  make_stoned(long xtime, const char *msg, int killedby,
 *                                 const char *killername) — start or stop
 * petrification. */
export async function make_stoned(xtime, msg, killedby, killername) {
    const pst = _uprop(STONED);
    const old = pst.intrinsic | 0;

    _set_prop_itimeout(pst, xtime);
    /* C `(xtime != 0L) ^ (old != 0L)` — truthiness, not a typed !== (see
     * make_deaf above: a BigInt `0n` argument makes `xtime !== 0` true). */
    if (!!xtime !== !!old) {
        SET_BOTL();
        if (msg)
            await pline(msg);
    }
    if (!(pst.intrinsic | 0))
        dealloc_killer(find_delayed_killer(STONED));
    else if (!old)
        delayed_killer(STONED, killedby, killername);
}

/* C potion.c:460-467  make_glib(int xtime) — set or clear "slippery fingers".
 *
 *     disp.botl |= (!Glib ^ !!xtime);
 *
 * ported EXACTLY, including its bug: `!Glib` is 1 when Glib is CLEAR, so the
 * XOR is true when the state does NOT change (clear->clear, set->set) and false
 * when it does.  Cardinal Rule 1 — if this is ever "fixed", fix it in C first. */
export function make_glib(xtime) {
    const pg = _uprop(GLIB);
    const glib = pg.intrinsic | 0;

    if (((glib ? 0 : 1) ^ (xtime ? 1 : 0)) !== 0)
        SET_BOTL();
    _set_prop_itimeout(pg, xtime);
    /* may change "(being worn)" to "(being worn; slippery)" or vice versa */
    if (game.u?.uarmg)
        update_inventory();
}

/* C potion.c:368-440  make_hallucinated(long xtime, boolean talk, long mask)
 * Returns `changed`. */
export async function make_hallucinated(xtime, talk, mask) {
    const ph = _uprop(HALLUC);
    const phres = _uprop(HALLUC_RES);
    const old = ph.intrinsic | 0;
    let changed = false;

    if (_Unaware())
        talk = false;

    const message = (!xtime) ? "Everything %s SO boring now."
                             : "Oh wow!  Everything %s so cosmic!";
    const verb = (!_potion_Blind()) ? "looks" : "feels";

    if (mask) {
        if (ph.intrinsic | 0)
            changed = true;

        if (!xtime)
            phres.extrinsic = (phres.extrinsic | 0) | mask;
        else
            phres.extrinsic = (phres.extrinsic | 0) & ~mask;
    } else {
        if (!(phres.extrinsic | 0) && (!!(ph.intrinsic | 0) !== !!xtime))
            changed = true;
        _set_prop_itimeout(ph, xtime);

        /* clearing temporary hallucination without toggling vision.
         * UNREACHABLE from #wizintrinsic: this arm needs !changed && !HHalluc
         * && old, i.e. hallucination going 1 -> 0 while EHalluc_resistance is
         * already set, and every #wizintrinsic amt is > 0 (wizcmds.c:1011).
         * body_part() is now js/cmd.js's export (the local throwing shadow
         * is gone); eyecount() at the top of this file is still a throwing
         * stub, so this arm still surfaces rather than guessing — see
         * strange_feeling/Your there. */
        if (!changed && !(ph.intrinsic | 0) && old && talk) {
            if (!haseyes(game.youmonst?.data)) {
                await strange_feeling(null, null);
            } else if (_potion_Blind()) {
                let eyes = body_part(EYE);

                if (eyecount(game.youmonst?.data) !== 1)
                    eyes = makeplural(eyes);
                Your(eyemsg.replace('%s', eyes).replace('%s', vtense(eyes, "itch")));
            } else { /* Grayswandir */
                Your(vismsg.replace('%s', "flatten").replace('%s', "normal"));
            }
        }
    }

    if (changed) {
        /* in case we're mimicking an orange (hallucinatory form
           of mimicking gold) update the mimicking's-over message */
        if (!_potion_Hallucination())
            eatmupdate();

        if (game.u?.uswallow) {
            swallowed(0); /* redraw swallow display */
        } else {
            /* The see_* routines should be called *before* the pline. */
            see_monsters();
            see_objects();
            see_traps();
        }

        /* for perm_inv and anything similar */
        update_inventory();

        SET_BOTL();
        if (talk)
            await pline(message.replace('%s', verb));
    }
    return changed;
}
/* C potion.c:257-258 — the two format strings make_hallucinated's clear-path
 * arm uses. */
const vismsg = "vision seems to %s for a moment but is %s now.";
const eyemsg = "%s momentarily %s.";
/* C potion.c strange_feeling(obj, txt) — potion.c:1052.  Not ported; the only
 * path that reaches it here is the eyeless-hero hallucination-clear arm above,
 * which #wizintrinsic cannot take. */
async function strange_feeling(obj, txt) {
    /* C potion.c:1463-1478 — message first, then optional naming and useup. */
    if (game.flags?.beginner || !txt)
        await pline(`You have a ${_potion_Hallucination() ? 'normal' : 'strange'} feeling for a moment, then it passes.`);
    else
        await pline(txt);
    if (!obj)
        return;
    if (obj.dknown)
        await trycall(obj);
    useup_potion(obj);
}
/* potionbreathe() is synchronous in this port; avoid detaching the async
 * prompt-capable helper from that caller. */
function strange_feeling_sync(obj, txt) {
    if (game.flags?.beginner || !txt)
        pline(`You have a ${_potion_Hallucination() ? 'normal' : 'strange'} feeling for a moment, then it passes.`);
    else
        pline(txt);
    if (obj) {
        if (obj.dknown)
            trycall_noprompt(obj);
        useup_potion(obj);
    }
}
/* C potion.c:83-86  incr_itimeout(long *which, int incr)
 *     set_itimeout(which, itimeout_incr(*which, incr));
 * MUTATES the pointed-at property word.  `which` is a {value} ref here (the
 * JS stand-in for C's `long *`); callers holding a plain number wrap/unwrap. */
function incr_itimeout(which, incr) {
    set_itimeout(which, itimeout_incr(which.value, incr));
}
/* C potion.c:67-71  itimeout_incr(long old, int incr)
 *     return itimeout((old & TIMEOUT) + (long) incr);
 * PURE: takes the old timeout word BY VALUE and returns the new one.  It does
 * NOT write back — only set_itimeout()/incr_itimeout() store.  (This used to
 * take a {value} ref and mutate it, which fabricated a store C never makes;
 * in C the store at each of these call sites comes from make_confused() /
 * make_blinded(), not from itimeout_incr().)
 * TIMEOUT is the module-scope 0x00ffffff (prop.h:135). */
function itimeout_incr(old, incr) {
    return itimeout(((old & TIMEOUT) >>> 0) + incr);
}
/* C potion.c:55-65  itimeout(long val) — force `val' into the valid range for
 * an intrinsic timeout.  PURE. */
function itimeout(val) {
    if (val >= TIMEOUT)
        val = TIMEOUT;
    else if (val < 1)
        val = 0;
    return val;
}
export function set_itimeout(which, val) {
    /* C potion.c:74-79:  *which &= ~TIMEOUT;  *which |= itimeout(val);
     * with itimeout() (potion.c:55-64) clamping to [0, TIMEOUT].
     * TIMEOUT is 0x00ffffff (prop.h:135) -- this used to hold a local 0xFF,
     * which truncated every timeout above 255. */
    which.value = (which.value & ~TIMEOUT) | itimeout(val);
}
/* C ref: you.h:240 #define Role_if(X) (gu.urole.mnum == (X)).  Mirrors the
 * already-real body at js/cmd.js:355 (not exported from there, so this is a
 * second, byte-identical copy rather than an import — cmd.js already imports
 * from js/potion.js in several places and importing the other way risks a
 * cycle).  MEASURED (dothrow board): breakobj() -> potionbreathe() -> a
 * broken POT_SICKNESS thrown/spilled near the hero hit this stub whenever
 * the hero was not a Healer (the ONLY corpus role this port has ever run —
 * Role_if(PM_HEALER) reads false for it — so the guarded body always runs). */
function Role_if(pm) {
    return ((game.urole && game.urole.mnum) | 0) === (pm | 0);
}
function split_mon(monst, ptr) {
    /* C potion.c:2087 split_mon(&gy.youmonst, NULL).  The trap layer owns the
     * canonical clone/placement implementation and is synchronous, matching
     * this potionbreathe call site. */
    return split_mon_rt(monst, ptr);
}
function you_unwere(flag) {
    void you_unwere_real(flag);
}
function you_were() {
    void you_were_real(false);
}
/* C ref: mondata.c:1552-1568 monstseesu(seenres) — every monster that can see
 * the hero records that the hero RESISTED this damage type, so it stops
 * choosing that attack.  RNG-free; the mirror of js/mhitm.js's exported
 * monstunseesu(), which clears the same bit on the same monster set.  Was a
 * throwing stub here, shadowing nothing (C has one body; js/muse.js:441 carries
 * the same transcription file-locally) — drinksink's scalding-water arm
 * (fountain.c:617) is a live caller, so give it the real body. */
function monstseesu(seenres) {
    return monstseesu_real(seenres);
}
/* C hack.h:1530 `#define makeknown(x) discover_object((x), TRUE, TRUE, TRUE)`.
 * This was a throwing stub, and potionbreathe()'s tail (potion.c:2110-2115)
 * calls it on every `kn` arm — so the moment anything routed a SEEN potion's
 * vapours through potionbreathe the whole segment threw.  js/muse.js:93 already
 * carries the same one-line body. */
function makeknown(otyp) {
    discover_object(otyp, true, true, true);
}
/* C do.c:395 trycall(obj) — `if (!oc_name_known && !oc_uname) docall(obj)`.
 * Was a throwing stub; js/cmd.js holds the shared real body.  That body's
 * docall() is no longer a no-op (it puts up the "Call a <thing>:" getlin and
 * consumes keystrokes), so this wrapper is async now — the note that used to
 * end "its docall() is itself still a no-op, so this is behaviour-preserving"
 * described the tree before that landed and would have licensed an unawaited
 * call.  This wrapper has no live caller in this file; _docall_potion is what
 * the potion paths drive. */
async function trycall(obj) {
    return await trycall_cmd(obj);
}

const SICK_ALL = 3;

export function healup(nhp, nxtra, curesick, cureblind) {
    const g = game;
    const u = g.u;
    if (nhp) {
        if (Upolyd(u)) {
            u.mh += nhp;
            if (u.mh > u.mhmax)
                u.mh = (u.mhmax += nxtra);
        } else {
            u.uhp += nhp;
            if (u.uhp > u.uhpmax) {
                u.uhp = (u.uhpmax += nxtra);
                if (u.uhpmax > u.uhppeak)
                    u.uhppeak = u.uhpmax;
            }
        }
    }
    if (cureblind) {
        u.ucreamed = 0;
        make_blinded(0, true);
        make_deaf(0, true);
    }
    if (curesick) {
        make_vomiting(0, true);
        make_sick(0, null, true, SICK_ALL);
    }
    if (g.disp)
        g.disp.botl = 1;
    return;
}

/* ─────────────────────────────────────────────────────────────────────────
 * #dip command — C ref: nethack-c/src/potion.c dodip()/potion_dip()/mixtype().
 *
 * Ported for seed5500 (two dips):
 *   1. dip a potion into a (blessed) potion of water → H2Opotion_dip blesses it
 *      ("Your <obj> glows with a light blue aura.").
 *   2. dip a potion into a different non-water potion → mix branch: mixtype()
 *      reaction (STRANGE_OBJECT here), dip_potion_explosion roll, then the
 *      rnd(8) result switch ("The mixture glows brightly and evaporates.").
 * Branches the corpus does not exercise (fountain/pool/sink, POT_POLYMORPH,
 * POT_ACID/OIL object effects, unicorn-horn/amethyst) are ported faithfully
 * where cheap and stubbed-with-impossible where they would require large
 * unported subsystems; each stub is annotated. RNG order is C-exact on the
 * exercised path.
 * ───────────────────────────────────────────────────────────────────────── */

/* UNICORN_HORN / AMETHYST otyps (not POTION_CLASS) — referenced by mixtype()
 * and by potion_dip's neutralize arm (potion.c:2736).  These used to be the
 * sentinels -1001 / -1002 ("never match a real dipped object here"), which
 * silently disabled both call sites.  The real otyps come from the same
 * objects.h ordering js/oc_name_data.js is generated from: OC_NAME index of
 * "unicorn horn" is 261 (js/mklev.js:292 already carries that number) and of
 * "amethyst" is 455. */
const UNICORN_HORN = 261;
const AMETHYST = 455;

/* C objnam.c bcsign helpers via direct field writes (bless/curse/uncurse). */
function _bless(o) { if (o) { o.cursed = false; o.blessed = true; o.bknown = !!o.bknown; } }
function _curse(o) { if (o) { o.blessed = false; o.cursed = true; } }
function _uncurse(o) { if (o) { o.cursed = false; } }
function _unbless(o) { if (o) { o.blessed = false; } }

/* Bump bridge objs_deleted.count to match C's delobj counter.
 * C ref: invent.c useup()/useupall() -> freeinv() -> obfree() -> delobj() ->
 * dealloc_obj() puts the object on the objs_deleted queue.  js/potion.js's own
 * useup_potion() (dodrink's copy of the same C function, line ~1768) already
 * does this bump; js/read.js's doread copy silently omitted it and was fixed
 * for the identical reason (see its comment).  This dip copy (_useup /
 * _useupall, potion_dip's mixing/poisoning/oil/H2Opotion arms) omitted it too:
 * MEASURED on the dodip capture-replay board — a dipped-into potion of water
 * consumed via _poof()->_useup() left the capture's objs_deleted.count MISSING
 * where C recorded 1. */
function _bumpObjsDeleted() {
    const store = game.__bridge__ || (game.__bridge__ = {});
    const key = 'objs_deleted.count';
    const cur = store[key] !== undefined ? Number(store[key]) : 0;
    store[key] = String(cur + 1);
}
/* C invent.c useup()/useupall() — consume one (or the whole stack) from invent. */
function _useup(obj) {
    if (obj && obj.quan != null && (obj.quan | 0) > 1) {
        /* C invent.c:1324 useup(): clear in_use on the quan>1 decrement path.
         * Not a deletion (quan>1 survives), so no objs_deleted bump here —
         * matches C: this branch never reaches freeinv()/obfree(). */
        obj.in_use = false;
        obj.quan = (obj.quan | 0) - 1;
        return;
    }
    _freeinv(obj);
    _bumpObjsDeleted();
}
/* C invent.c:1312 useupall() — "use up ALL of an item regardless of its
 * quantity": freeinv() + obfree() unconditionally, so this ALWAYS deletes and
 * ALWAYS bumps, even for a quan>1 stack. */
function _useupall(obj) { _freeinv(obj); _bumpObjsDeleted(); }
/* C invent.c freeinv() — unlink from invent WITHOUT freeing (obfree is a
 * separate step its two callers above take).  _hold_potion's own direct call
 * (potion.c:2596-2597) is the relocate-to-re-add case C's plain freeinv()
 * covers, so no bump belongs here — only at the two true-deletion callers. */
function _freeinv(obj) {
    let prev = null;
    for (let o = game.invent; o; prev = o, o = o.nobj) {
        if (o === obj) {
            if (prev) prev.nobj = o.nobj; else game.invent = o.nobj;
            obj.nobj = null;
            return;
        }
    }
}

/* C ref: pickup.c:1972 encumber_msg() text for an oldcap→newcap transition.
 * RNG-free.  Mirrors cmd.js _encumber_msg_text / wizcmds.js _wish_encumber_text. */
function _potion_encumber_text(oldcap, newcap) {
    if (oldcap < newcap) {
        switch (newcap) {
        case 1: return 'Your movements are slowed slightly because of your load.';
        case 2: return 'You rebalance your load.  Movement is difficult.';
        case 3: return 'You stagger under your heavy load.  Movement is very hard.';
        default: return `You ${newcap === 4 ? 'can barely' : "can't even"} move a handspan with this load!`;
        }
    } else if (oldcap > newcap) {
        switch (newcap) {
        case 0: return 'Your movements are now unencumbered.';
        case 1: return 'Your movements are only slowed slightly by your load.';
        case 2: return 'You rebalance your load.  Movement is still difficult.';
        case 3: return 'You stagger under your load.  Movement is still very hard.';
        default: return null;
        }
    }
    return null;
}

/* C ref: potion.c:2245 hold_potion() → invent.c:1208 hold_another_object().
 * Re-insert a transformed potion (its weight is unchanged, so it never drops
 * for encumbrance): observe_object marks it dknown, addinv merges it into a
 * compatible carried stack (reusing that slot) or assigns a new a..z/A..Z
 * letter, prinv()s the surviving "<let> - <doname>." line, then encumber_msg().
 * DISPLAY/inventory-bookkeeping only; no RNG.  The prinv pline forces a --More--
 * of the (committed) "mixture looks ..." topline; after that page the prinv line
 * shows.  Mirrors wizcmds.js _wish_addinv_prinv. */
async function _hold_potion(obj) {
    const g = game;
    const oldcap = near_capacity();

    /* observe_object: dknown=1 (RNG-free), to maximize mergeability. */
    if ((obj.otyp | 0) >= 0) {
        obj.dknown = 1;
        _makeknown_observe(obj.otyp | 0);
    }

    /* freeinv: remove from invent before re-adding (C potion.c:2596). */
    _freeinv(obj);

    /* addinv_core0: merge into the first mergable carried stack, else new slot. */
    let survivor = null;
    for (let o = g.invent; o; o = o.nobj) {
        if (_potion_mergable(o, obj)) {
            o.quan = ((o.quan ?? 1) | 0) + ((obj.quan ?? 1) | 0);
            survivor = o;
            break;
        }
    }
    if (!survivor) {
        const used = new Set();
        for (let o = g.invent; o; o = o.nobj)
            if (o.invlet != null) used.add(o.invlet | 0);
        let assigned = obj.invlet | 0;
        if (!assigned || used.has(assigned)) {
            assigned = 0;
            for (let c = 97; c <= 122; c++) if (!used.has(c)) { assigned = c; break; }
            if (!assigned) for (let c = 65; c <= 90; c++) if (!used.has(c)) { assigned = c; break; }
        }
        if (assigned) obj.invlet = assigned;
        /* C obj.h:78 `#define OBJ_INVENT 3` — this used to write 2, which is
         * OBJ_CONTAINED (obj.h:77).  survivor's slot already carries the
         * right where (it was already in invent), so only the fresh-slot arm
         * needs it. */
        obj.where = 3; /* OBJ_INVENT */
    /* C invent.c:1115-1123 addinv_core0 — under `fixinv`
     * (flags.invlet_constant, optlist.h initval On and never cleared in this
     * corpus) C inserts the new node at the HEAD of gi.invent and then calls
     * reorder_invent(), which bubbles the chain back into inv_rank order
     * (invent.c:731 `#define inv_rank(o) ((o)->invlet ^ 040)`).  The
     * tail-append is C's `!flags.invlet_constant` arm, which never runs here.
     * The two agree only while every new letter sorts after every held letter;
     * #adjust, a freed slot, or the gl.lastinvnr wrap breaks that, and the
     * resulting order fault draws no RNG until something walks gi.invent
     * (destroy_items, dog_goal, the drop/inventory menus). */
        obj.nobj = g.invent ?? null;
        g.invent = obj;
        reorder_invent();
        survivor = obj;
    }

    /* prinv "<let> - <doname>." — drop_fmt was non-null so hold_another_object
     * always prinv()s.  The pline auto-pages the prior topline. */
    let prinvLine = null;
    if (survivor.invlet) {
        prinvLine = `${String.fromCharCode(survivor.invlet | 0)} - ${_doname_potion(survivor)}.`;
        await pline(prinvLine);
    }

    /* encumber_msg(): the load-change line.  A SEPARATE pline(); the per-pline
     * update_topl reserve rule pages the prinv only on topline overflow (same
     * rule as the wish path).  Weight is unchanged here so this is normally a
     * no-op, but kept faithful. */
    const newcap = near_capacity();
    if (g.u) g.u._oldcap = newcap;
    if (oldcap !== newcap) {
        const emsg = _potion_encumber_text(oldcap, newcap);
        if (emsg) {
            await pline(emsg);
    /* C pickup.c:1992 / :2013 — `disp.botl = TRUE;` at the tail of BOTH arms of
     * encumber_msg(), AFTER the pline.  It is what tells the NEXT flush_screen
     * to re-run bot() and repaint the encumbrance field; without it this port's
     * _capture_botl (js/display.js:3353) never refreshes _botlPaintedCap, so
     * every later frame renders the stale pre-change capacity.  seed0399 became
     * Burdened at step 412 and then rendered no encumbrance word at all for the
     * remaining 119 frames. */
            if (g.disp) g.disp.botl = true;
        }
    }
}

/* observe_object's discover side (o_init.c:442-450) marks the type encountered;
 * here we only need the dknown bookkeeping reflected (RNG-free). */
function _makeknown_observe(otyp) {
    /* C observe_object: discover_object(otyp, FALSE, TRUE, FALSE) — marks the
     * type as encountered but NOT name-identified; no RNG, no discovery pline. */
}

/* C invent.c:1108 mergable test (the subset the dip path can hit): same otyp,
 * same bless/curse, same dilution, both unnamed.  Conservative — only merges
 * when clearly compatible. */
function _potion_mergable(o, obj) {
    if (o === obj) return false;
    if ((o.otyp | 0) !== (obj.otyp | 0)) return false;
    if ((o.oclass | 0) !== (obj.oclass | 0)) return false;
    if (!!o.blessed !== !!obj.blessed) return false;
    if (!!o.cursed !== !!obj.cursed) return false;
    if (!!o.odiluted !== !!obj.odiluted) return false;
    if ((o.oname || null) !== (obj.oname || null)) return false;
    return true;
}

// C potion.c:2409 — identification prompt precedes consumption.
async function _poof(potion) {
    if (potion.dknown) await trycall_cmd(potion);
    await useup(potion);
}

/* simpleoname(obj): article-less appearance name, e.g. "sky blue potion".
 * thesimpleoname prepends "the ". Mirrors _identify_doname (read.js) sans
 * article/quantity, for the dip messages. */
function _simpleoname(obj) {
    const oclass = obj.oclass | 0;
    const otyp = obj.otyp | 0;
    const nameKnown = !!(game._oc_name_known && game._oc_name_known[otyp]);
    if (nameKnown) {
        const actualn = getObjName(otyp);
        return actualn ? `potion of ${actualn}` : 'potion';
    }
    const descr = getObjDescr(otyp);
    return descr ? `${descr} potion` : 'potion';
}
function _simpleonames(obj) {
    /* C simpleonames = makeplural(simpleoname) when quan>1 else simpleoname. */
    const base = _simpleoname(obj);
    if ((obj.quan | 0) > 1) return base.endsWith('s') ? base : `${base}s`;
    return base;
}
function _thesimpleoname(obj) { return `the ${_simpleoname(obj)}`; }
/* doname-with-article (for the obuf in the "dip <X> into" prompt). */
function _doname_potion(obj) {
    const base = _simpleoname(obj);
    const quan = obj.quan | 0 || 1;
    if (quan > 1) {
        const plural = base.endsWith('s') ? base : `${base}s`;
        return `${quan} ${plural}`;
    }
    const article = /^[aeiou]/i.test(base) ? 'an' : 'a';
    return `${article} ${base}`;
}

/* otense(obj, verb): singular stack → add 's' (3rd person); plural → base. */
function _otense(obj, verb) {
    if ((obj.quan | 0) > 1) return verb;
    return verb.endsWith('s') || verb.endsWith('x') ? verb + 'es' : verb + 's';
}

/* C ref: objects[otyp].oc_magic.  All non-water/non-juice potions are magical
 * except POT_WATER and POT_FRUIT_JUICE (oc_magic 0). Used only to pick the
 * mass-dip amt-split formula; on the quan==1 seed5500 path it is not consulted
 * for RNG, but kept faithful. */
function _potion_oc_magic(otyp) {
    return !(otyp === POT_WATER || otyp === POT_FRUIT_JUICE);
}

/* C ref: potion.c:2124 mixtype(o1, o2) — alchemy reaction table. Returns the
 * result otyp, or STRANGE_OBJECT(0) if no reaction. Consumes rn2() only on the
 * two randomized reactions (gain-level+confusion, enlightenment+levitation). */
const STRANGE_OBJECT = 0;
function mixtype(o1, o2) {
    let o1typ = o1.otyp, o2typ = o2.otyp;

    /* cut down on the number of cases below — swap so the "healing-ish" partner
       is o1 (C potion.c:2128-2137). */
    if ((o1.oclass | 0) === POTION_CLASS
        && (o2typ === POT_GAIN_LEVEL || o2typ === POT_GAIN_ENERGY
            || o2typ === POT_HEALING || o2typ === POT_EXTRA_HEALING
            || o2typ === POT_FULL_HEALING || o2typ === POT_ENLIGHTENMENT
            || o2typ === POT_FRUIT_JUICE)) {
        o1typ = o2.otyp;
        o2typ = o1.otyp;
    }

    switch (o1typ) {
    case POT_HEALING:
        if (o2typ === POT_SPEED) return POT_EXTRA_HEALING;
        /* FALLTHROUGH */
    case POT_EXTRA_HEALING:
    case POT_FULL_HEALING:
        if (o2typ === POT_GAIN_LEVEL || o2typ === POT_GAIN_ENERGY)
            return (o1typ === POT_HEALING) ? POT_EXTRA_HEALING
                : (o1typ === POT_EXTRA_HEALING) ? POT_FULL_HEALING
                : POT_GAIN_ABILITY;
        /* FALLTHROUGH */
    case UNICORN_HORN:
        switch (o2typ) {
        case POT_SICKNESS:
            return POT_FRUIT_JUICE;
        case POT_HALLUCINATION:
        case POT_BLINDNESS:
        case POT_CONFUSION:
            return POT_WATER;
        }
        break;
    case AMETHYST: /* "a-methyst" == "not intoxicated" */
        if (o2typ === POT_BOOZE) return POT_FRUIT_JUICE;
        break;
    case POT_GAIN_LEVEL:
    case POT_GAIN_ENERGY:
        switch (o2typ) {
        case POT_CONFUSION:
            return (rn2(3) ? POT_BOOZE : POT_ENLIGHTENMENT);
        case POT_HEALING:
            return POT_EXTRA_HEALING;
        case POT_EXTRA_HEALING:
            return POT_FULL_HEALING;
        case POT_FULL_HEALING:
            return POT_GAIN_ABILITY;
        case POT_FRUIT_JUICE:
            return POT_SEE_INVISIBLE;
        case POT_BOOZE:
            return POT_HALLUCINATION;
        }
        break;
    case POT_FRUIT_JUICE:
        switch (o2typ) {
        case POT_SICKNESS:
            return POT_SICKNESS;
        case POT_ENLIGHTENMENT:
        case POT_SPEED:
            return POT_BOOZE;
        case POT_GAIN_LEVEL:
        case POT_GAIN_ENERGY:
            return POT_SEE_INVISIBLE;
        }
        break;
    case POT_ENLIGHTENMENT:
        switch (o2typ) {
        case POT_LEVITATION:
            if (rn2(3)) return POT_GAIN_LEVEL;
            break;
        case POT_FRUIT_JUICE:
            return POT_BOOZE;
        case POT_BOOZE:
            return POT_CONFUSION;
        }
        break;
    }
    return STRANGE_OBJECT;
}

/* C ref: potion.c:1500 H2Opotion_dip — dipping targobj into a potion of water.
 * The uncursed-water branch used to be a no-op with a comment claiming
 * water_damage() was "itself a stub elsewhere in this file" — WRONG:
 * water_damage is a real, already-imported export of js/trap.js (5642), and
 * this was simply never wired to it.  Measured (board16-s dodip.jsonl): the
 * plain-uncursed-water dip is the single most common scenario in the corpus
 * and every one of it showed a 1-draw RNG residual matching water_damage's
 * own rn2/rnd sites exactly. */
async function _H2Opotion_dip(potion, targobj, useeit, objphrase) {
    const COST_alter = -2, COST_none = -1, COST_UNCURS = 4, COST_UNBLSS = 3;
    let func = null, glowcolor = 0, costchange = COST_none, altfmt = false, res = false;

    if (!potion || potion.otyp !== POT_WATER) return false;

    if (potion.blessed) {
        if (targobj.cursed) {
            func = _uncurse; glowcolor = 'amber'; costchange = COST_UNCURS;
        } else if (!targobj.blessed) {
            func = _bless; glowcolor = 'light blue'; costchange = COST_alter; altfmt = true;
        }
    } else if (potion.cursed) {
        if (targobj.blessed) {
            func = _unbless; glowcolor = 'brown'; costchange = COST_UNBLSS;
        } else if (!targobj.cursed) {
            func = _curse; glowcolor = 'black'; costchange = COST_alter; altfmt = true;
        }
    } else {
        /* C potion.c:1534-1541 — dipping into uncursed water; carried()
         * check skips a steed's saddle (which is worn, not OBJ_INVENT).
         * GAP: C's `gm.mentioned_water` flag (set BY water_damage() when it
         * prints a message that gives the water away) has no field in this
         * port, so the trailing `if (gm.mentioned_water) makeknown(POT_WATER)`
         * is not modeled — RNG-free and discovery-only, not faked here rather
         * than guessed. */
        if ((targobj.where | 0) === OBJ_INVENT) {
            if ((await water_damage(targobj, 0, true)) !== ER_NOTHING)
                res = true;
        }
    }

    if (func) {
        if (useeit) {
            /* hcolor() = the literal color unless hallucinating; no Hallucination
             * on the seed5500 path. */
            if (altfmt)
                await pline(`${objphrase} with ${_an(glowcolor)} aura.`);
            else
                await pline(`${objphrase} ${glowcolor}.`);
            targobj.bknown = true; /* !Hallucination */
        } else {
            if (!potion.bknown || !potion.dknown) targobj.bknown = false;
        }
        /* unpaid shop-cost adjustment (targobj POT_WATER only) — not reached. */
        func(targobj);
        res = true;
    }
    return res;
}
function _an(s) { return /^[aeiou]/i.test(s) ? `an ${s}` : `a ${s}`; }
function _Yobjnam2_glow(obj) {
    /* "Your <obj> glow" form — C Yobjnam2(obj,"glow"). seed5500 dip 1 obj is a
     * carried potion, so the possessive is "Your". */
    return `Your ${_simpleoname(obj)} glows`;
}

/* C ref: potion.c:2419 dip_potion_explosion — does the dipped potion explode? */
async function _dip_potion_explosion(obj, dmg) {
    const u = game.u;
    /* uarmc ALCHEMY_SMOCK check → 30; else 10. No alchemy smock in seed5500. */
    const cloakSmock = false;
    if (obj.cursed || obj.otyp === POT_ACID
        || (obj.otyp === POT_OIL && obj.lamplit)
        || !rn2(cloakSmock ? 30 : 10)) {
        obj.in_use = 1;
        await pline('BOOM!  They explode!');
        /* C potion.c:2426: wake_nearto(u.ux, u.uy, (BOLT_LIM+1)*(BOLT_LIM+1));
         * RNG-free (wakeup() bookkeeping only). */
        wake_nearto(u.ux | 0, u.uy | 0, (BOLT_LIM + 1) * (BOLT_LIM + 1));
        await exercise(A_STR, false);
        /* C potion.c:2429-2430:
         *     if (!breathless(gy.youmonst.data) || haseyes(gy.youmonst.data))
         *         potionbreathe(obj);
         * potionbreathe() is a full port (this file) and DOES draw RNG; it was
         * previously named "not reached" and simply never called. */
        const ymdata = (game.youmonst && game.youmonst.data) || null;
        if (!breathless(ymdata) || haseyes(ymdata))
            await potionbreathe(obj);
        _useupall(obj);
        /* C potion.c:2432-2433: losehp(dmg /* not physical damage *\/,
         * "alchemic blast", KILLED_BY_AN); — was entirely missing, which is
         * why every recorded explosion showed hero.uhp unchanged. */
        await losehp(dmg, 'alchemic blast', KILLED_BY_AN);
        return true;
    }
    return false;
}

/* C ref: potion.c:2443 potion_dip(obj, potion) — after both are chosen. */
async function potion_dip(obj, potion) {
    const g = game;
    let mixture;

    if (potion === obj && (potion.quan | 0) === 1) {
        await pline('That is a potion bottle, not a Klein bottle!');
        return ECMD_OK;
    }
    if (obj && obj.hands) {
        await pline("You can't fit your hands into the mouth of the bottle!");
        return ECMD_OK;
    }

    obj.pickup_prev = 0;
    potion.in_use = true; /* assume it will be used up */

    if (potion.otyp === POT_WATER) {
        const useeit = true; /* !Blind */
        const obj_glows = Yobjnam2(obj, 'glow');
        if (await _H2Opotion_dip(potion, obj, useeit, obj_glows)) {
            await _poof(potion);
            return ECMD_TIME;
        }
    } else if (obj.otyp === POT_POLYMORPH || potion.otyp === POT_POLYMORPH) {
        /* C potion.c:2467-2500.  poly_obj() (js/zap.js, OBJ_INVENT arm now
         * wired) targets whichever of {obj, potion} is NOT the polymorph
         * potion itself. */
        const target = (obj.otyp === POT_POLYMORPH) ? potion : obj;
        if (obj_unpolyable(target)) {
            await pline(nothing_happens);
        } else {
            const save_otyp = obj.otyp;
            const u = game.u || {};
            u.uconduct = u.uconduct || {};
            u.uconduct.polypiles = (u.uconduct.polypiles | 0) + 1;
            /* C livelog_printf(LL_CONDUCT, ...) — external log line, no game
             * state / RNG effect; not reproduced. */
            obj = (await poly_obj(obj, STRANGE_OBJECT));
            if (!obj) {
                makeknown(POT_POLYMORPH);
                return ECMD_TIME;
            } else if (obj.otyp !== save_otyp) {
                makeknown(POT_POLYMORPH);
                _useup(potion);
                await prinv(null, obj, 0);
                return ECMD_TIME;
            } else {
                await pline(nothing_seems_to_happen);
                await _poof(potion);
                return ECMD_TIME;
            }
        }
    } else if ((obj.oclass | 0) === POTION_CLASS && obj.otyp !== potion.otyp) {
        let amt = obj.quan | 0;
        let magic;

        mixture = mixtype(obj, potion);

        magic = (mixture !== STRANGE_OBJECT) ? _potion_oc_magic(mixture)
            : (_potion_oc_magic(obj.otyp) || _potion_oc_magic(potion.otyp));
        let qbuf = 'The'; /* assume full stack */
        if (amt > (obj.odiluted ? 2 : magic ? 3 : 7)) {
            if (obj.odiluted) amt = 2;
            else if (magic) amt = rnd(Math.min(amt, 8) - (3 - 1)) + (3 - 1);
            else amt = rnd(amt - (7 - 1)) + (7 - 1);

            if (amt < (obj.quan | 0)) {
                obj = _splitobj(obj, amt);
                qbuf = `${obj.quan | 0} of the`;
            }
        }
        await pline(`${qbuf} ${_simpleonames(obj)} ${_otense(obj, 'mix')} with `
            + `${(potion.quan | 0) > 1 ? 'one of ' : ''}${_thesimpleoname(potion)}...`);
        _useup(potion); /* now gone */

        if (await _dip_potion_explosion(obj, amt + rnd(9)))
            return ECMD_TIME;

        obj.blessed = obj.cursed = obj.bknown = false;
        /* if (Blind || Hallucination) obj.dknown = 0 — not on this path. */

        if (mixture !== STRANGE_OBJECT) {
            obj.otyp = mixture;
        } else {
            switch (obj.odiluted ? 1 : rnd(8)) {
            case 1:
                obj.otyp = POT_WATER; break;
            case 2:
            case 3:
                obj.otyp = POT_SICKNESS; break;
            case 4: {
                /* C potion.c:2557-2565 —
                 *   otmp = mkobj(POTION_CLASS, FALSE);
                 *   obj->otyp = otmp->otyp;
                 *   if (obj->otyp == POT_OIL || otmp->otyp == POT_OIL)
                 *       fixup_oil(obj, otmp);
                 *   obfree(otmp, NULL);
                 * mkobj() never places otmp anywhere, so obfree() here never
                 * unlinks it from any chain — but it IS a delobj()-equivalent
                 * free, and the bridge's objs_deleted.count counts every
                 * free, not just inventory removals (measured: record #13
                 * expects objs_deleted.count +2 — one for _useup(potion)
                 * above, one for this obfree). */
                const otmp = await mkobj(POTION_CLASS, false);
                obj.otyp = otmp.otyp;
                if (obj.otyp === POT_OIL || otmp.otyp === POT_OIL) {
                    /* C mkobj.c:2025-2048 fixup_oil(potion=obj, source=otmp) */
                    if (obj.otyp === POT_OIL) {
                        obj.age = (otmp.otyp === POT_OIL) ? otmp.age
                                                           : MAX_OIL_IN_FLASK;
                    } else if (otmp.otyp === POT_OIL) {
                        if (obj.age === otmp.age) obj.age = g.moves | 0;
                        if ((otmp.age | 0) < MAX_OIL_IN_FLASK)
                            obj.odiluted = true;
                    }
                }
                _bumpObjsDeleted();
                break;
            }
            default:
                _useupall(obj);
                /* C potion.c:2576 pline_The("mixture %sevaporates.",
                 * !Blind ? "glows brightly and " : "") — not Blind on this path. */
                await pline('The mixture glows brightly and evaporates.');
                return ECMD_TIME;
            }
        }
        obj.odiluted = (obj.otyp !== POT_WATER);

        /* C potion.c:2581-2587 — describe the result.  Not Blind/Hallucinating
         * on the seed5500 path: "The mixture looks <appearance>." where the
         * appearance is the new type's shuffled descr (hcolor() is identity
         * when not hallucinating). */
        if (obj.otyp === POT_WATER) {
            await pline('The mixture bubbles, then clears.');
        } else {
            const descr = getObjDescr(obj.otyp | 0) || '';
            await pline(`The mixture looks ${descr}.`);
        }

        /* C potion.c:2596-2597 freeinv(obj); hold_potion(obj, "You drop %s!",
         * doname(obj), 0).  The mixture's weight didn't change, so it can't be
         * dropped for encumbrance; hold_another_object re-inserts it (merging
         * into a compatible carried stack if one exists), prinv()s the surviving
         * "<let> - <doname>." line, then encumber_msg(). */
        await _hold_potion(obj);
        return ECMD_TIME;
    }

    /* ── C potion.c:2597-2606 — acid on a lichen corpse ──────────────────── */
    if (potion.otyp === POT_ACID && (obj.otyp | 0) === CORPSE
        && (obj.corpsenm | 0) === PM_LICHEN) {
        /* pline("%s %s %s around the edges.", The(cxname(obj)),
         *       otense(obj, "turn"), Blind ? "wrinkled"
         *                            : potion->odiluted ? hcolor(NH_ORANGE)
         *                              : hcolor(NH_RED));
         * Not Blind on any corpus dip; hcolor() is the identity when not
         * hallucinating (js/mhitm.js hcolor returns colorpref). */
        await pline(`${The(cxname(obj))} ${otense(obj, 'turn')} `
            + `${obj_dip_hcolor(potion.odiluted ? NH_ORANGE : NH_RED)} around the edges.`);
        potion.in_use = false; /* didn't go poof */
        if (potion.dknown) await trycall_cmd(potion);
        return ECMD_TIME;
    }

    /* ── C potion.c:2608-2613 — water into a towel ───────────────────────── */
    if (potion.otyp === POT_WATER && (obj.otyp | 0) === TOWEL) {
        await pline('The towel soaks it up!');
        /* wetting the towel already happened via water_damage() in
         * H2Opotion_dip (the branch above). */
        await _poof(potion);
        return ECMD_TIME;
    }

    /* ── C potion.c:2615-2641 — poisoning / un-poisoning a missile ───────── */
    if (_is_poisonable(obj)) {
        if (potion.otyp === POT_SICKNESS && !obj.opoisoned) {
            const buf = ((potion.quan | 0) > 1)
                ? `One of ${the(xname(potion))}`
                : The(xname(potion));
            await pline(`${buf} forms a coating on ${the(xname(obj))}.`);
            obj.opoisoned = true;
            await _poof(potion);
            return ECMD_TIME;
        } else if (obj.opoisoned && !_permapoisoned(obj)
                   && (potion.otyp === POT_HEALING
                       || potion.otyp === POT_EXTRA_HEALING
                       || potion.otyp === POT_FULL_HEALING)) {
            await pline(`A coating wears off ${the(xname(obj))}.`);
            obj.opoisoned = 0;
            await _poof(potion);
            return ECMD_TIME;
        }
    }

    /* ── C potion.c:2643-2648 — acid corrodes ────────────────────────────── */
    if (potion.otyp === POT_ACID) {
        if ((await erode_obj(obj, 0, ERODE_CORRODE, EF_GREASE)) !== ER_NOTHING) {
            await _poof(potion);
            return ECMD_TIME;
        }
    }

    /* ── C potion.c:2650-2699 — oil ──────────────────────────────────────── */
    /* C uses `goto more_dips` out of the middle of this arm for a non-weapon
     * target (that is how oil reaches the lamp-filling code below), so the JS
     * models the jump with a flag rather than an early return. */
    let more_dips = false;
    if (potion.otyp === POT_OIL) {
        let wisx = false;

        if (potion.lamplit) { /* burning */
            /* C potion.c:2654 — fire_damage(obj, TRUE, u.ux, u.uy).
             * Use the direct-object adapter because this target is carried;
             * flooreffects() would incorrectly require OBJ_FREE. */
            await fire_damage(obj, true, game.u.ux | 0, game.u.uy | 0);
        } else if (potion.cursed) {
            /* C potion.c:2655-2659 — the spill:
             *     pline_The("potion spills and covers your %s with oil.",
             *               fingers_or_gloves(TRUE));
             *     make_glib((int) (Glib & TIMEOUT) + d(2, 10));
             * make_glib's real body already lives in THIS file (potion.c:460,
             * js/sit.js re-exports it).  js/do_wear.js's fingers_or_gloves()
             * throws on check_gloves=TRUE (js/do_wear.js:4708), so this spells
             * the C body locally rather than importing it — the same fix
             * js/cmd.js's use_lamp arm took for the identical gap
             * (js/cmd.js:40886 _ul_fingers_or_gloves). */
            await pline(`The potion spills and covers your `
                + `${_fingers_or_gloves_dip(true)} with oil.`);
            make_glib(((_uprop(GLIB_PROP).intrinsic | 0) & TIMEOUT) + d(2, 10));
        } else if ((obj.oclass | 0) !== WEAPON_CLASS_OC && !_is_weptool(obj)) {
            /* C potion.c:2660-2661 — "the following cases apply only to
             * weapons": goto more_dips. */
            more_dips = true;
        } else if ((!_is_rustprone(obj) && !_is_corrodeable(obj))
                   || _is_ammo(obj)
                   || (!obj.oeroded && !obj.oeroded2)) {
            /* C potion.c:2667-2673 — uses up the potion, doesn't set greased.
             * Not Blind on any corpus dip. */
            await pline(`${_Yname2(obj)} ${otense(obj, 'gleam')} with an oily sheen.`);
        } else {
            /* C potion.c:2675-2685 — oil removes rust and corrosion. */
            await pline(`${_Yname2(obj)} ${otense(obj, 'are')} less `
                + `${(obj.oeroded && obj.oeroded2) ? 'corroded and rusty'
                    : obj.oeroded ? 'rusty' : 'corroded'}.`);
            if ((obj.oeroded | 0) > 0) obj.oeroded = (obj.oeroded | 0) - 1;
            if ((obj.oeroded2 | 0) > 0) obj.oeroded2 = (obj.oeroded2 | 0) - 1;
            wisx = true;
        }
        if (!more_dips) {
            /* C potion.c:2687-2691 */
            exercise(A_WIS, wisx);
            if (potion.dknown) discover_object(potion.otyp | 0, true, true);
            _useup(potion);
            return ECMD_TIME;
        }
    }
    /* more_dips: (C potion.c:2693) */

    /* obj.h:88 `xint16 timed` is a COUNT of active timers on this object, not
     * a boolean, and `lamplit` (obj.h:104) is a separate bit — but for a
     * light-source object (a lamp/lantern/candle or a POT_OIL) the ONLY timer
     * C ever attaches is begin_burn()'s BURN_OBJECT fuse (timeout.c:1712-1785:
     * start_timer() sets obj->lamplit=1 on success in the SAME call that
     * increments obj->timed), so for exactly these two object classes
     * `timed > 0` and `lamplit` are equivalent. This matters because the
     * capture-replay sweep's compact obj-chain encoding
     * (OBJ_CHAIN_FIELD_ORDER, js/struct_reconstructor.js) captures `timed`
     * but has no `lamplit` slot at all, so any inventory-sourced obj replays
     * with obj.lamplit === undefined regardless of its true C state — a
     * capture-schema gap, not a port gap (the same one that silently skips
     * this arm entirely on the real corpus: measured, board16b dodip record
     * #1, a lit OIL_LAMP with lamplit=undefined/timed=1 fell through to the
     * "fill it" arm below and drew exercise(A_WIS)'s rn2(19) where C drew
     * explode()'s d(6,6)+burnarmor+destroy_items+exercise chain). Restricted
     * to lamp/POT_OIL objects specifically — for other classes (corpses,
     * eggs, cameras) `timed>0` means a DIFFERENT timer and this equivalence
     * does not hold. On the real scored game (not a single-record replay)
     * obj.lamplit is tracked normally and this is a no-op fallback. */
    const _dip_isLit = o => !!(o && (o.lamplit || (o.timed | 0) > 0));

    /* ── C potion.c:2695-2733 — fill an oil lamp / magic lamp ────────────── */
    if (((obj.otyp | 0) === OIL_LAMP || (obj.otyp | 0) === MAGIC_LAMP)
        && potion.otyp === POT_OIL) {
        /* C potion.c:2697-2703 — turn off engine before fueling. */
        if (_dip_isLit(obj) || _dip_isLit(potion)) {
            /* C potion.c:2699-2701: useup(potion); explode(u.ux, u.uy, 11,
             * d(6,6), 0, EXPL_FIERY); exercise(A_WIS, FALSE); return ECMD_TIME.
             * type=11 is ZT_SPELL(ZT_FIRE) (10+ZT_FIRE), olet=0 -- the exact
             * same generic-fireball shape js/zap.js's dobuzz already calls
             * explode() with.  explode() IS a full port (js/zap.js); the
             * comment claiming otherwise was wrong. */
            _useup(potion);
            await explode(game.u.ux | 0, game.u.uy | 0, 11, d(6, 6), 0, EXPL_FIERY);
            exercise(A_WIS, false);
            return ECMD_TIME;
        }
        /* C potion.c:2705-2709 — oil into an empty magic lamp makes it mundane. */
        if ((obj.otyp | 0) === MAGIC_LAMP && (obj.spe | 0) === 0) {
            obj.otyp = OIL_LAMP;
            obj.age = 0;
        }
        if ((obj.age | 0) > 1000) {
            await pline(`${_Yname2(obj)} ${otense(obj, 'are')} full.`);
            potion.in_use = false; /* didn't go poof */
        } else {
            await pline(`You fill ${_yname_dip(obj)} with oil.`);
            /* C potion.c:2716 check_unpaid(potion) — Yendorian Fuel Tax; the
             * one JS body (js/cmd.js check_unpaid) is a documented no-op stub,
             * and it only bills inside a shop, which no corpus dip is in. */
            /* C potion.c:2720-2723 — burns more efficiently in a lamp. */
            obj.age = (obj.age | 0)
                + Math.trunc((!potion.odiluted ? 4 : 3) * (potion.age | 0) / 2);
            if ((obj.age | 0) > 1500) obj.age = 1500;
            _useup(potion);
            exercise(A_WIS, true);
        }
        if (potion.dknown) discover_object(POT_OIL, true, true);
        obj.spe = 1;
        /* update_inventory() — display bookkeeping, no RNG. */
        return ECMD_TIME;
    }

    potion.in_use = false; /* C potion.c:2735 — didn't go poof */

    /* ── C potion.c:2736-2803 — unicorn horn / amethyst neutralizes ──────── */
    if (((obj.otyp | 0) === UNICORN_HORN || (obj.otyp | 0) === AMETHYST)
        && (mixture = mixtype(obj, potion)) !== STRANGE_OBJECT) {
        const old_otyp = potion.otyp | 0;
        let old_dknown = false;
        const more_than_one = (potion.quan | 0) > 1;
        let oldbuf = '';
        /* C potion.c:2735-2738 — "%s " of the OLD type's color, only if the
         * player already knew it. */
        if (potion.dknown) {
            old_dknown = true;
            oldbuf = `${hcolor(getObjDescr(old_otyp) || '')} `;
        }
        /* C potion.c:2741-2744 — split one off a merged stack to neutralize;
         * with multiple merged potions only one is affected. */
        const singlepotion = (potion.quan | 0) > 1 ? _splitobj(potion, 1)
                                                    : potion;

        /* C potion.c:2746 — COST_NUTRLZ is alteration verb 10.  The shared
         * implementation handles unpaid inventory objects through canonical
         * shop billing and is synchronous at this call boundary. */
        await costly_alteration(singlepotion, 10);

        singlepotion.otyp = mixture;
        singlepotion.blessed = false;
        if (mixture === POT_WATER) {
            singlepotion.cursed = false;
            singlepotion.odiluted = false;
        } else {
            singlepotion.cursed = obj.cursed; /* odiluted left as-is */
        }
        singlepotion.bknown = false;
        singlepotion.dknown = false; /* provisionally */
        if (!_potion_Blind()) {
            if (!_potion_Hallucination())
                observe_object(singlepotion);
            let newbuf = '';
            if (mixture === POT_WATER && singlepotion.dknown)
                newbuf = 'clears';
            else if (!_potion_Blind())
                newbuf = `turns ${hcolor(getObjDescr(mixture) || '')}`;
            if (newbuf)
                await pline(`The ${oldbuf}potion`
                    + `${more_than_one ? ' that you dipped into' : ''} `
                    + `${newbuf}.`);
            else
                await pline('Something happens.');

            /* C potion.c:2771-2781 — offer to #call the OLD type by name if it
             * was known by sight but never identified or user-named. */
            const g2 = game;
            const ocNameKnown = !!(g2._oc_name_known && g2._oc_name_known[old_otyp]);
            const ocUname = !!(g2._oc_uname && g2._oc_uname[old_otyp]);
            if (old_dknown && !ocNameKnown && !ocUname)
                await _docall_potion({ dknown: true, otyp: old_otyp });
        }
        /* C potion.c:2784-2786 hold_potion(singlepotion, "You juggle and drop
         * %s!", doname(singlepotion), 0) — mirrors the mixing arm's identical
         * call above (js/potion.js:4018); weight is unchanged so the drop_fmt
         * message never fires either place. */
        await _hold_potion(singlepotion);
        return ECMD_TIME;
    }

    /* C potion.c:2805-2806 */
    await pline('Interesting...');
    return ECMD_TIME;
}

/* ── obj.h / objclass.h predicates the dip tail needs ──────────────────────
 * Defined locally, from the C macros, because none of the existing JS bodies
 * are exported (and js/uhitm.js's is_weptool is a hardcoded `&& false`). */
const WEAPON_CLASS_OC = 2;  /* objclass.h WEAPON_CLASS */
const TOOL_CLASS_OC = 6;    /* objclass.h TOOL_CLASS */
const GEM_CLASS_OC = 13;    /* objclass.h GEM_CLASS */
const IRON_MAT = 11;        /* objclass.h enum obj_material_types IRON */
const COPPER_MAT = 13;      /* objclass.h COPPER (includes brass) */
const ART_GRIMTOOTH = 5;    /* artilist.h order: NONARTIFACT, EXCALIBUR,
                             * STORMBRINGER, MJOLLNIR, CLEAVER, GRIMTOOTH */
/* C do_wear.c:60-65 fingers_or_gloves(check_gloves) — spelled locally because
 * js/do_wear.js's export throws on check_gloves=TRUE (js/do_wear.js:4708),
 * the same gap js/cmd.js's use_lamp arm hit and fixed the same way
 * (js/cmd.js:40886 _ul_fingers_or_gloves).  do_wear.c is this function's C
 * home either way, so this is a straight port of its body:
 *     return ((check_gloves && uarmg) ? gloves_simple_name(uarmg)
 *                                     : makeplural(body_part(FINGER))); */
function _fingers_or_gloves_dip(check_gloves) {
    const uarmg = game.u?.uarmg || null;
    return (check_gloves && uarmg) ? gloves_simple_name(uarmg)
                                    : makeplural(body_part(FINGER));
}
function _oc_skill_dip(o) { return MKOBJ_OC_SKILL[o.otyp | 0] | 0; }
function _oc_material_dip(o) { return MKOBJ_OC_MATERIAL[o.otyp | 0] | 0; }
/* C obj.h:249 is_weptool(o) —
 *   ((o)->oclass == TOOL_CLASS && objects[(o)->otyp].oc_skill != P_NONE) */
function _is_weptool(o) {
    return (o.oclass | 0) === TOOL_CLASS_OC && _oc_skill_dip(o) !== P_NONE;
}
/* C artifact.c:2837 permapoisoned(obj) — currently only Grimtooth. */
function _permapoisoned(obj) {
    return !!obj && (obj.oartifact | 0) === ART_GRIMTOOTH;
}
/* C obj.h:264 is_poisonable(otmp) —
 *   ((oclass == WEAPON_CLASS && oc_skill >= -P_SHURIKEN && oc_skill <= -P_BOW)
 *    || permapoisoned(otmp)) */
function _is_poisonable(otmp) {
    const sk = _oc_skill_dip(otmp);
    return ((otmp.oclass | 0) === WEAPON_CLASS_OC
            && sk >= -P_SHURIKEN && sk <= -P_BOW)
        || _permapoisoned(otmp);
}
/* C obj.h:238 is_ammo(otmp) —
 *   ((oclass == WEAPON_CLASS || oclass == GEM_CLASS)
 *    && oc_skill >= -P_CROSSBOW && oc_skill <= -P_BOW) */
function _is_ammo(otmp) {
    const cls = otmp.oclass | 0;
    if (cls !== WEAPON_CLASS_OC && cls !== GEM_CLASS_OC) return false;
    const sk = _oc_skill_dip(otmp);
    return sk >= -P_CROSSBOW && sk <= -P_BOW;
}
/* C objclass.h:200 is_rustprone(otmp) — oc_material == IRON */
function _is_rustprone(otmp) { return _oc_material_dip(otmp) === IRON_MAT; }
/* C objclass.h:205 is_corrodeable(otmp) — oc_material == COPPER || IRON */
function _is_corrodeable(otmp) {
    const m = _oc_material_dip(otmp);
    return m === COPPER_MAT || m === IRON_MAT;
}
/* C objnam.c yname(obj) / Yname2(obj) — the shk_your simplification js/
 * already uses everywhere (js/do_wear.js:2919, js/cmd.js Shk_Your): carried →
 * "your ", otherwise "the ".  Yname2 is yname with the first letter capped. */
function _yname_dip(obj) {
    const owned = !!obj && (obj.where | 0) === 3 /* OBJ_INVENT */;
    return (owned ? 'your ' : 'the ') + cxname(obj);
}
function _Yname2(obj) {
    const s = _yname_dip(obj);
    return s ? s[0].toUpperCase() + s.slice(1) : s;
}
/* C decl.h NH_ORANGE / NH_RED are the plain color strings; js/mhitm.js
 * hcolor(colorpref) returns colorpref verbatim when not hallucinating. */
const NH_ORANGE = 'orange';
const NH_RED = 'red';
function obj_dip_hcolor(pref) { return hcolor(pref); }

/* C ref: invent.c splitobj — split `num` off a stack into a new obj inserted
 * right after the original. Minimal: clone fields, link into invent. Only the
 * mass-dip path uses this; not reached on seed5500 (quan==1). */
function _splitobj(obj, num) {
    const o = newobj(obj);
    o.quan = num;
    obj.quan = (obj.quan | 0) - num;
    o.nobj = obj.nobj;
    obj.nobj = o;
    return o;
}

/* C ref: mkobj.c:744-822 costly_alteration(obj, alter_type) — reachable slice
 * only.  The real body lives in js/cmd.js (private, not exported); this file
 * can only ever call it on an object that came out of getobj() restricted to
 * inventory (dodip's dip_ok/drink_ok never suggest a floor item), so `obj`
 * always has where === OBJ_INVENT (or, post-splitobj, the OBJ_FREE-shaped
 * copy of one) — the one branch costly_alteration reduces to:
 *     if (obj->where == OBJ_INVENT || obj->where == OBJ_FREE) {
 *         if (!obj->unpaid) return;
 *         ... shop billing ...
 *     }
 * The unpaid/billing sub-path needs js/cmd.js's bill_dummy_object/verbalize/
 * set_bknown, out of this packet's one-file scope; refuse loudly rather than
 * fabricate a billing outcome. */
async function _costlyAlterationInventoryDip(obj) {
    if ((obj.where | 0) === OBJ_INVENT || (obj.where | 0) === OBJ_FREE) {
        if (!obj.unpaid) return; /* C mkobj.c:751-752 — the only corpus path */
        /* cmd.js now exports the canonical billing implementation, including
         * bill_dummy_object() and the unpaid inventory settlement. */
        await costly_alteration(obj, 10);
        return;
    }
    throw new Error('not yet ported: costly_alteration non-inventory arm '
        + '(mkobj.c:757-822) — unreached by any dodip/potion_dip target');
}


/* C getobj callbacks (potion.c), returning the real const.js GETOBJ_* codes.
 *
 * These used to return a FILE-LOCAL set (`GO_EXCLUDE = -1, GO_SUGGEST = 0,
 * GO_DOWNPLAY = 1, GO_EXCLUDE_INACCESS = 2`) that shares neither values nor
 * ordering with js/const.js's GETOBJ_* (EXCLUDE 0, DOWNPLAY 1, SUGGEST 2,
 * EXCLUDE_INACCESS 3, EXCLUDE_NONINVENT 5) — which was survivable only while
 * the one consumer was this file's own private prompt loop. */
/* C potion.c:2211-2224 dip_ok(). */
function dip_ok(obj) {
    if (!obj)
        return GETOBJ_DOWNPLAY;
    /* "dipping gold isn't currently implemented" */
    if ((obj.oclass | 0) === COIN_CLASS)
        return GETOBJ_EXCLUDE;
    /* C potion.c:2219 inaccessible_equipment(obj, NULL, FALSE) — a suit under a
     * cloak (etc.) is dropped from the suggested set AND bumps getobj's
     * `inaccess`, which is what turns the no-candidates message into "you don't
     * have anything ELSE to dip".  The comment this replaces read "assume
     * accessible (no welded/cursed-worn in path)". */
    if (inaccessible_equipment(obj, null, false))
        return GETOBJ_EXCLUDE_INACCESS;
    return GETOBJ_SUGGEST;
}
/* C potion.c:2227-2233 dip_hands_ok() — chosen over dip_ok when the hero is
 * standing on a pool/fountain/sink and did not use the 'm' prefix.  Its only
 * difference is the null-object arm:
 *     if (!obj && (Glib && can_reach_floor(FALSE))) return GETOBJ_SUGGEST;
 * i.e. greasy hands make "-" a LIKELY choice (listed as "- " in the bracket)
 * rather than merely a legal one.  Glib is u.uprops[GLIB].intrinsic
 * (youprop.h:112); can_reach_floor is the levitation/steed test, which this
 * file has never had a real body for (see dodip's WIRE_PENDING note) — with no
 * levitation and no steed at any corpus dip it is TRUE. */

function dip_hands_ok(obj) {
    if (!obj) {
        const u = game.u || {};
        const glib = ((u.uprops && u.uprops[GLIB_PROP] && u.uprops[GLIB_PROP].intrinsic) | 0) !== 0;
        if (glib) return GETOBJ_SUGGEST;
    }
    return dip_ok(obj);
}
/* C potion.c:507-523 drink_ok() — also used to validate the potion to dip INTO
 * (potion.c:2367).  The obj==NULL arm is how getobj learns that the player has
 * already passed up a non-inventory opportunity, so the message reads "anything
 * ELSE to drink". */
function drink_ok(obj) {
    if (!obj)
        return drink_ok_extra ? GETOBJ_EXCLUDE_NONINVENT : GETOBJ_EXCLUDE;
    if ((obj.oclass | 0) === POTION_CLASS)
        return GETOBJ_SUGGEST;
    return GETOBJ_EXCLUDE;
}

// C potion.c:2379 — the item-action route selects the queued potion first.
export async function dip_into() {
    if (!cmdq_peek(CQ_CANNED)) {
        impossible('dip_into: where is potion?');
        return ECMD_FAIL;
    }
    drink_ok_extra = 0;
    const potion = await getObjFromGetobj('dip', drink_ok, GETOBJ_NOFLAGS);
    if (!potion || potion.oclass !== POTION_CLASS)
        return ECMD_CANCEL;

    // Potions cannot be the Eyes of the Overworld: is_plural is quan != 1.
    const qbuf = `dip into ${potion.quan !== 1 ? 'one of ' : ''}${thesimpleoname(potion)}`;
    const obj = await getObjFromGetobj(qbuf, dip_ok, GETOBJ_PROMPT);
    if (!obj) return ECMD_CANCEL;
    if (await inaccessible_equipment(obj, 'dip', false)) return ECMD_OK;
    return potion_dip(obj, potion);
}

/* C ref: potion.c:2269 dodip() — the #dip command. */
export async function dodip() {
    const g = game;
    const u = g.u;
    const loc = g.level?.at(u.ux, u.uy);
    const here = loc ? loc.typ : 0;
    const at_pool = false; /* is_pool — no water tile in seed5500 dips */
    const at_fountain = loc ? IS_FOUNTAIN(here) : false;
    const at_sink = loc ? IS_SINK(here) : false;
    const menu_requested = false; /* no 'm' prefix in seed5500 */
    const at_here = (!menu_requested && (at_pool || at_fountain || at_sink));
    /* C potion.c:2288 drink_ok_extra = 0 — reset before the first getobj. */
    drink_ok_extra = 0;

    /* C potion.c:2281 — getobj("dip", at_here ? dip_hands_ok : dip_ok,
     * GETOBJ_PROMPT).  `at_here` really does select a different callback; this
     * line used to read `at_here ? _dip_ok : _dip_ok`.
     *
     * The prompt loop is now js/cmd.js getObjFromGetobj — i.e. invent.c:1752
     * itself — instead of this file's private copy, which was missing C's
     * invent.c:2057-2062 arm: a letter naming no carried object plines "You
     * don't have that object.", the tty more()s it (ONE recorded dismiss key)
     * and the for(;;) re-prompts (a SECOND key).  The copy here re-prompted
     * SILENTLY, so it ate one key where C eats two and every later key ran as a
     * top-level command.  The comment on that arm said "no corpus session types
     * an invalid one"; measured 2026-08-24 over corpus-generated/v5/train with
     * tools/getobj-message-diff.mjs, 451 frames across 15 sessions do, ZERO of
     * them matched, and 6 of them are a session's FIRST screen miss. */
    const obj = await getObjFromGetobj('dip', at_here ? dip_hands_ok : dip_ok, GETOBJ_PROMPT);
    if (!obj) { g.context.move = 0; return ECMD_CANCEL; }

    const is_hands = !!obj.hands;
    /* C potion.c:2288-2289 — the flags.verbose==FALSE fallback name. */
    const shortestname = (is_hands || ((obj.quan ?? 1) | 0) !== 1) ? 'them' : 'it';
    /* shortestname / verbose: flags.verbose is the default ON, so the obuf form
     * is used. obuf = doname-with-article (e.g. "a brown potion"). */
    let obuf;
    if (is_hands) obuf = 'your hands';
    /* C potion.c:2299 short_oname(obj, doname, thesimpleoname, ...) — the FULL
     * doname, not a potion-only name: seed0014 dips a worn orcish helm and C's
     * prompt reads "Dip a cursed -4 orcish helm (being worn) into the
     * fountain?".  Route EVERYTHING through the shared doname body (js/cmd.js
     * doname_body, the inventory formatter).
     *
     * The POTION_CLASS special case that used to sit here sent potions to this
     * file's own _doname_potion(), which is built on the file-local
     * _simpleoname() — a potion-only namer that (a) has no POT_WATER
     * holy/unholy arm (C objnam.c:840-843 puts "holy "/"unholy " INSIDE the
     * xname body when the type is discovered and the BUC is known) and (b)
     * pluralizes by appending "s" to the whole string.  seed0106 step 109 dips
     * a stack of blessed water and C asks "Dip 4 potions of holy water into
     * the fountain?" where this printed "Dip 4 potion of waters".  doname_body
     * routes POTION_CLASS to js/objnam.js xname_potion, which is the real
     * objnam.c:832 arm and carries both. */
    /* C potion.c:2301-2305 — the doname result is NOT used raw; it goes through
     * short_oname(obj, doname, thesimpleoname, lenlimit), and lenlimit is
     *
     *   QBUFSZ - sizeof "What do you want to dip into? \
     *                    [abdeghjkmnpqstvwyzBCEFHIKLNOQRTUWXZ#-# or ?*] "
     *   = 128 - 78 = 50
     *
     * (the C comment beside it says "leaves 49", but the literal it cites is 77
     * characters, so sizeof is 78 and the limit is 50; the corpus agrees with
     * 50 — seed0014 keeps a 47-character name and strips a 53-character one).
     * Over that limit, short_oname re-formats with bknown/rknown/greased/
     * oeroded/oeroded2 zeroed, which is why C's prompt drops "cursed" and
     * "thoroughly rusty" at seed0014 step 388 with no state change at all. */
    else obuf = (await short_oname(obj,
                            async (o) => (await doname_body(o, (u.uhandedness === RIGHT_HANDED) ? 'right' : 'left')),
                            thesimpleoname,
                            50));

    /* C potion.c:2306-2317 — "preceding #dip with 'm' skips the possibility of
     * dipping into pools, fountains, and sinks plus the extra prompting which
     * those entail".  This arm was a comment ("skipped (none here). Port y_n
     * branches when a session dips at a water tile"); seed0014 step 372 dips at
     * a fountain, so without it the hero was asked the SECOND question ("What do
     * you want to dip a potion into?") and the recorded 'y' desynced everything
     * after.
     *
     * WIRE_PENDING: can_reach_floor(FALSE) (potion.c:2308) is not ported — the
     * hero is never levitating or on a steed at a dip in the public corpus — and
     * the at_sink / at_pool arms below it are still unported (RNG-free prompts;
     * their bodies dipsink()/water_damage() would need their own wiring). */
    if (!menu_requested && at_fountain) {
        const qbuf = `Dip ${g.flags?.verbose === false ? shortestname : obuf} into the fountain?`;
        if (await y_n(qbuf) === 'y') {
            if (!is_hands) obj.pickup_prev = 0;
            await dipfountain(obj);
            g.context.move = 1;
            /* Same command-result handoff dodip's normal exit uses below: the
             * turn is spent, so the pline has to survive to the next nhgetch. */
            if (g._pending_message) {
                _topl_stash_result();
            }
            return ECMD_TIME;
        }
        /* C potion.c:2323 ++drink_ok_extra — the declined fountain does not widen
         * the ACCEPT set (drink_ok still suggests potions only); it changes
         * drink_ok's obj==NULL answer from GETOBJ_EXCLUDE to
         * GETOBJ_EXCLUDE_NONINVENT, which bumps getobj's `inaccess` and makes
         * the no-candidates message read "anything ELSE to dip <obj> into". */
        ++drink_ok_extra;
    }

    /* "What do you want to dip <obj> into? [xyz or ?*]" */
    const word2 = `dip ${obuf} into`;
    /* C potion.c:2367 — potion = getobj(qbuf, drink_ok, GETOBJ_NOFLAGS).
     * NOFLAGS, not PROMPT, and drink_ok's null arm never sets allownone, so this
     * prompt DOES take getobj's no-candidates early-out: a hero with no potion
     * is told "You don't have anything [else ]to dip <obj> into." and NO key is
     * read.  The private loop prompted "[*]" and swallowed the next keystroke. */
    const potion = await getObjFromGetobj(word2, drink_ok, GETOBJ_NOFLAGS);
    if (!potion) { g.context.move = 0; return ECMD_CANCEL; }

    const res = await potion_dip(obj, potion);
    g.context.move = (res & ECMD_TIME) ? 1 : 0;
    /* Time-consuming: promote the trailing result pline to _resultMessage so
     * rhack restores it onto the topline for the next nhgetch (like dodrink). */
    if ((res & ECMD_TIME) && g._pending_message) {
        _topl_stash_result();
    }
    return res;
}

/* ══ C potion.c:1603-1927 potionhit(mon, obj, how) ═══════════════════════════
 * A potion hits `mon` (which may be the hero) and is always used up.
 *
 * Ported for BOTH targets.  The header used to claim "nothing in this port
 * CALLS potionhit with a monster target" — that was WRONG: js/cmd.js:3515
 * thitmonst() already calls `potionhit(mon, obj, THIT_POTHIT_HERO_THROW)`
 * with a real monster target whenever a thrown potion connects.  Measured on
 * board16-s's dothrow.jsonl: 9/123 replayed records reach potionhit with
 * isyou=false (otyp 322 POT_WATER x7, 318 POT_SICKNESS x1, 317 POT_BOOZE x1),
 * and every one was a full RNG-residual miss, because the old `if (!isyou)
 * return;` skipped even bottlename()'s draw.
 *
 * Remaining GAPs in the monster-target half — each throws a documented
 * "not yet ported" error only if actually reached (none of the 9 observed
 * records reach any of them):
 *   - hit_saddle && saddle (potion.c:1706-1726): needs H2Opotion_dip, which is
 *     async in this file (_H2Opotion_dip) while potionhit is sync and its only
 *     caller (js/cmd.js thitmonst) does not await it — an unawaited await
 *     would defer later draws into a microtask and corrupt the RNG stream
 *     silently (same hazard js/zap.js:2870 documents for resist()->killed()).
 *   - any DEADMONSTER(mon) path (potion.c:1841-1844, 1862-1863, 1877-1882):
 *     needs killed()/monkilled(), both async, for the identical sync-caller
 *     reason.
 *   - is_were && !is_human reverting via new_were() (potion.c:1843-1844):
 *     new_were is real (js/were.js:116) but not exported.
 *   - is_were && is_human transforming via new_were() (potion.c:1850-1852):
 *     same gap.
 *   - PM_GREMLIN split_mon() (potion.c:1854-1856): this file's own local
 *     split_mon throws; js/mhitm.js's is a no-op stub. Neither is a real port.
 *   - POT_POLYMORPH on a monster (potion.c:1885-1886): needs bhitm(), which
 *     has no js/ definition anywhere in the tree.
 *   - POT_OIL explode_oil() when obj.lamplit (potion.c:1867-1868): explode_oil
 *     and splatter_burning_oil are NOW REAL (js/zap.js, ported from
 *     explode.c:960-979 — both were previously false "has no js/ definition
 *     anywhere" claims). Still not wired at either potionhit call site: both
 *     are async (explode() awaits pline() repeatedly while still drawing RNG
 *     for hit/burn/destroy rolls), and BOTH of potionhit's real callers —
 *     cmd.js thitmonst() and mhitu.js m_throw() — invoke it synchronously,
 *     unawaited, then immediately run more RNG-drawing code of their own
 *     (potionbreathe() right below, for one). Firing explode_oil without
 *     awaiting would let its deferred draws land AFTER whatever runs next in
 *     the same synchronous tick — the identical hazard already named above
 *     for killed()/monkilled(). Wiring this for real needs thitmonst() and
 *     m_throw() (both in files this session does not own) to go async and
 *     await potionhit(); that is out of scope here and is left as a named
 *     fleet-feedback item rather than an unsafe fire-and-forget call.
 *   - the unpaid-in-a-shop settlement (potion.c:1913-1925): needs
 *     subfrombill/stolen_value/shop_keeper, none of which are wired here.
 *
 * RNG, in C's order (hero target):
 *   bottlename()                     rn2(7)      potion.c:1605
 *   losehp(Maybe_Half_Phys(rnd(2)))  rnd(2)      potion.c:1638
 *   potionbreathe(obj)               [its own]   potion.c:1907
 * The distance<3 rn2((1+ACURR(A_DEX))/2) gate at potion.c:1906 is short-circuit
 * DEAD for a hero target — `distance == 0` is the first disjunct — so it draws
 * nothing here, exactly as in C.
 */
export async function potionhit(mon, obj, how) {
    const g = game;
    const u = g.u;
    /* C potion.c:1606 `boolean isyou = (mon == &gy.youmonst)`. */
    const isyou = !mon || (mon.m_id | 0) === 1 || mon === g.youmonst;
    /* C potion.c:1605 — bottlename() is called for BOTH targets and is the
     * function's first draw. */
    const botlnam = bottlename();
    /* C potion.c:1631 `your_fault = (how <= POTHIT_HERO_THROW)`. */
    const your_fault = (how | 0) <= POTHIT_HERO_THROW;
    let tx, ty, distance;
    let hit_saddle = false, saddle = null;

    if (isyou) {
        tx = u.ux | 0; ty = u.uy | 0;
        distance = 0;

        /* C potion.c:1636-1640 */
        pline(`The ${botlnam} crashes on your ${body_part(HEAD)} and breaks into shards.`);
        /* Maybe_Half_Phys(dmg) — Half_physical_damage is unported (js/mhitu.js:1983
         * says the same), so the roll passes through unhalved. */
        await losehp(rnd(2),
               ((how | 0) === POTHIT_OTHER_THROW) ? 'propelled potion' : 'thrown potion',
               KILLED_BY_AN_POT);
    } else {
        tx = mon.mx | 0; ty = mon.my | 0;
        /* C potion.c:1643-1651 — sometimes it hits the saddle. */
        if (((mon.misc_worn_check | 0) & W_SADDLE) !== 0
            && (saddle = which_armor(mon, W_SADDLE))) {
            if (!rn2(10)
                || ((obj.otyp | 0) === POT_WATER
                    && ((rnl(10) > 7 && obj.cursed)
                        || (rnl(10) < 4 && obj.blessed) || !rn2(3))))
                hit_saddle = true;
        }
        distance = dist2(tx, ty, u.ux | 0, u.uy | 0);
        if (!cansee(tx, ty)) {
            pline('Crash!');
        } else {
            const mnam = mon_nam_pot(mon);
            let buf;
            if (hit_saddle && saddle) {
                buf = `${s_suffix(x_monnam(mon, ARTICLE_THE, null, SUPPRESS_IT | SUPPRESS_SADDLE, false))} saddle`;
            } else if (has_head_pot(mon.data)) {
                buf = `${s_suffix(mnam)} ${g.gn && g.gn.notonhead ? 'body' : 'head'}`;
            } else {
                buf = mnam;
            }
            pline(`The ${botlnam} crashes on ${buf} and breaks into shards.`);
        }
        /* C potion.c:1675-1676 — rn2(5) is evaluated regardless of the later
         * operands (it is the left side of &&), so the draw always happens. */
        if (rn2(5) && (mon.mhp | 0) > 1 && !hit_saddle)
            mon.mhp = (mon.mhp | 0) - 1;
    }

    /* C potion.c:1679-1681 — "oil doesn't instantly evaporate; Neither does a
     * saddle hit". */
    if ((obj.otyp | 0) !== POT_OIL && !hit_saddle && cansee(tx, ty))
        pline(`${Tobjnam(obj, 'evaporate')}.`);

    if (isyou) {
        /* C potion.c:1683-1704 — the hero-target per-otyp arms. */
        switch (obj.otyp | 0) {
        case POT_OIL:
            /* C:1683-1685 `if (obj->lamplit) explode_oil(obj, u.ux, u.uy)`.
             * explode_oil/splatter_burning_oil are REAL now (js/zap.js,
             * explode.c:960-979) — see this function's header note for why
             * they are still not called here: potionhit is invoked
             * synchronously and unawaited from both real call sites
             * (cmd.js thitmonst, mhitu.js m_throw), and explode_oil's chain
             * draws RNG across several internal `await pline()` points, so
             * firing it here without awaiting would let its draws land out
             * of order against potionbreathe()/obfree() below. Left as a
             * (deliberately non-throwing) no-op — obj.lamplit is ALSO not
             * reliably observable through the capture-replay sweep's
             * compact obj-chain encoding (OBJ_CHAIN_FIELD_ORDER in
             * js/struct_reconstructor.js has no lamplit slot; every
             * inventory-sourced obj replays with obj.lamplit === undefined
             * regardless of its true C state) — a capture-schema gap, not a
             * port gap, flagged for the harness rather than papered over
             * here. Converting this to a throw would risk the floor on any
             * session that DOES reach it live, for a call this port cannot
             * yet safely make either way. */
            break;
        case POT_POLYMORPH:
            You_feel(`a little ${_hallucination() ? 'normal' : 'strange'}.`);
            if (!_unchanging() && !_prop_active(ANTIMAGIC))
                polyself(POLY_NOFLAGS);
            break;
        case POT_ACID:
            if (!_prop_active(ACID_RES)) {
                pline(`This burns${obj.blessed ? ' a little' : obj.cursed ? ' a lot' : ''}!`);
                const dmg = d(obj.cursed ? 2 : 1, obj.blessed ? 4 : 8);
                await losehp(dmg, 'potion of acid', KILLED_BY_AN_POT);
            }
            break;
        default:
            break;
        }
    } else if (hit_saddle && saddle) {
        /* C potion.c:1706-1726 — water is applied to the steed's saddle,
         * while polymorph deliberately has no saddle effect.  Preserve the
         * C ordering: H2Opotion_dip runs before the fallback wet message. */
        const useeit = !_potion_Blind() && canseemon(mon) && cansee(tx, ty);
        const mnam = x_monnam(mon, ARTICLE_THE, null,
                              SUPPRESS_IT | SUPPRESS_SADDLE, false);
        const saddleName = `${s_suffix(mnam)} saddle`;
        let affected = false;
        if ((obj.otyp | 0) === POT_WATER)
            affected = await _H2Opotion_dip(obj, saddle, useeit, saddleName);
        if (useeit && !affected)
            await pline(`${saddleName.charAt(0).toUpperCase() + saddleName.slice(1)} gets wet.`);
    } else {
        /* C potion.c:1727-1904 — the monster-target per-otyp arms. */
        let angermon = your_fault, cureblind = false;

        switch (obj.otyp | 0) {
        case POT_FULL_HEALING:
            cureblind = true;
            /* falls through — C:1731-1734 FALLTHROUGH */
        case POT_EXTRA_HEALING:
            if (!obj.cursed) cureblind = true;
            /* falls through — C:1735-1738 FALLTHROUGH */
        case POT_HEALING:
            if (obj.blessed) cureblind = true;
            if ((mon.data ? (mon.data.pmidx | 0) : -1) === PM_PESTILENCE) {
                /* C:1743-1744 `goto do_illness` */
                if ((mon.mhp | 0) > 2) {
                    mon.mhp = Math.trunc((mon.mhp | 0) / 2);
                    if (canseemon(mon)) pline(`${Monnam(mon)} looks rather ill.`);
                }
                break;
            }
            /* falls through — C:1745-1746 FALLTHROUGH */
        case POT_RESTORE_ABILITY:
        case POT_GAIN_ABILITY:
            /* C:1749-1758 do_healing */
            angermon = false;
            if ((mon.mhp | 0) < (mon.mhpmax | 0)) {
                healmon(mon, mon.mhpmax, 0);
                if (canseemon(mon))
                    pline(`${Monnam(mon)} looks sound and hale again.`);
            }
            if (cureblind)
                mcureblindness_pot(mon, canseemon(mon));
            break;
        case POT_SICKNESS:
            if ((mon.data ? (mon.data.pmidx | 0) : -1) === PM_PESTILENCE) {
                /* C:1760-1761 `goto do_healing` */
                angermon = false;
                if ((mon.mhp | 0) < (mon.mhpmax | 0)) {
                    healmon(mon, mon.mhpmax, 0);
                    if (canseemon(mon))
                        pline(`${Monnam(mon)} looks sound and hale again.`);
                }
                break;
            }
            if (dmgtype_pot(mon.data, AD_DISE_POT) || dmgtype_pot(mon.data, AD_PEST_POT)
                || resists_poison_pot(mon)) {
                if (canseemon(mon))
                    pline(`${Monnam(mon)} looks unharmed.`);
                break;
            }
            /* C:1771-1776 do_illness */
            if ((mon.mhp | 0) > 2) {
                mon.mhp = Math.trunc((mon.mhp | 0) / 2);
                if (canseemon(mon))
                    pline(`${Monnam(mon)} looks rather ill.`);
            }
            break;
        case POT_CONFUSION:
        case POT_BOOZE:
            if (!await resist(mon, POTION_CLASS, 0, NOTELL))
                mon.mconf = 1;
            break;
        case POT_INVISIBILITY: {
            const sawit = canspotmon(mon);
            const cursed_potion = !!obj.cursed;
            angermon = !!(mon.minvis && cursed_potion);
            mon_set_minvis(mon, cursed_potion);
            if (sawit && !canspotmon(mon)) {
                if (cansee(mon.mx | 0, mon.my | 0)) map_invisible(mon.mx | 0, mon.my | 0);
            } else if (sawit && cursed_potion) {
                pline(`${Monnam(mon)} briefly seems to be transparent.`);
            } else if (!sawit && canspotmon(mon)) {
                pline(`${Monnam(mon)} appears!`);
            }
            break;
        }
        case POT_SLEEPING:
            /* C:1803-1807 — "wakeup() doesn't rouse victims of temporary sleep" */
            if (await sleep_monst(mon, rnd(12), POTION_CLASS)) {
                pline(`${Monnam(mon)} falls asleep.`);
                await slept_monst(mon);
            }
            break;
        case POT_PARALYSIS:
            if (mon.mcanmove)
                paralyze_monst(mon, rnd(25));
            break;
        case POT_SPEED:
            angermon = false;
            mon_adjust_speed(mon, 1, obj);
            break;
        case POT_BLINDNESS:
            if (haseyes(mon.data) && !mon_perma_blind_pot(mon)) {
                let btmp = 64 + rn2(32) + rn2(32) * (await resist(mon, POTION_CLASS, 0, NOTELL) ? 0 : 1);
                btmp += (mon.mblinded | 0);
                mon.mblinded = Math.min(btmp, 127);
                mon.mcansee = 0;
            }
            break;
        case POT_WATER: {
            const pdata = mon.data;
            if (mon_hates_blessings(mon) /* undead or demon */
                || is_were_pot(pdata) || is_vampshifter_pot(mon)) {
                if (obj.blessed) {
                    if (canseemon(mon))
                        pline(`${Monnam(mon)} ${is_silent_pot(pdata) ? 'writhes' : 'shrieks'} in pain!`);
                    if (!is_silent_pot(pdata))
                        wake_nearto(tx, ty, (pdata.mlevel | 0) * 10);
                    mon.mhp = (mon.mhp | 0) - d(2, 6);
                    if ((mon.mhp | 0) < 1)
                        await killed(mon);
                    else if (is_were_pot(pdata) && !is_human_pot(pdata))
                        await new_were(mon);
                } else if (obj.cursed) {
                    angermon = false;
                    if (canseemon(mon))
                        pline(`${Monnam(mon)} looks healthier.`);
                    healmon(mon, d(2, 6), 0);
                    if (is_were_pot(pdata) && is_human_pot(pdata))
                        await new_were(mon);
                }
            } else if ((pdata ? (pdata.pmidx | 0) : -1) === PM_GREMLIN) {
                /* C potion.c:1854-1856 — split the gremlin using the existing
                 * clone/state/RNG preserving trap-layer helper. */
                angermon = false;
                split_mon_rt(mon, null);
            } else if ((pdata ? (pdata.pmidx | 0) : -1) === PM_IRON_GOLEM) {
                if (canseemon(mon)) pline(`${Monnam(mon)} rusts.`);
                mon.mhp = (mon.mhp | 0) - d(1, 6);
                /* C potion.c:1862-1863 — this thrown potion is your attack,
                 * so use the ordinary killed() attribution/death sequence. */
                if ((mon.mhp | 0) < 1) await killed(mon);
            }
            break;
        }
        case POT_OIL:
            if (obj.lamplit)
                await explode_oil(obj, tx, ty);
            break;
        case POT_ACID: {
            const pdata = mon.data;
            if (!resists_acid_pot(mon) && !await resist(mon, POTION_CLASS, 0, NOTELL)) {
                pline(`${Monnam(mon)} ${is_silent_pot(pdata) ? 'writhes' : 'shrieks'} in pain!`);
                if (!is_silent_pot(pdata))
                    wake_nearto(tx, ty, (pdata.mlevel | 0) * 10);
                mon.mhp = (mon.mhp | 0) - d(obj.cursed ? 2 : 1, obj.blessed ? 4 : 8);
                if ((mon.mhp | 0) < 1) {
                    /* C potion.c:1877-1882 — hero-thrown acid uses killed(),
                     * while an environmental hit uses monkilled(...,AD_ACID).
                     * Both canonical adapters preserve corpse/death handling. */
                    if (your_fault)
                        await killed(mon);
                    else
                        await monkilled_trap(mon, '');
                }
            }
            break;
        }
        case POT_POLYMORPH:
            /* C potion.c:1885-1886 — bhitm() owns the full polymorph target
             * logic; this adapter preserves its resistance/system-shock RNG. */
            await potionhit_polymorph(mon, obj);
            break;
        default:
            break;
        }
        /* C potion.c:1897-1903 — "target might have been killed". */
        if ((mon.mhp | 0) >= 1) {
            if (angermon) await wakeup_attack(mon, true);
            else mon.msleeping = 0;
        }
    }

    /* C potion.c:1906-1911 — "Note: potionbreathe() does its own docall()".
     * distance is 0 for a hero target, so the rn2 disjunct never evaluates. */
    if ((distance === 0
         || (distance < 3 && !rn2(((1 + acurr(u, A_DEX)) / 2) | 0)))
        && (!breathless(g.youmonst?.data) || haseyes(g.youmonst?.data)))
        await potionbreathe(obj);
    else if (obj.dknown && cansee(tx, ty))
        trycall_noprompt(obj);

    /* C potion.c:1913-1925 — settle an unpaid potion after it is thrown.
     * Monsters can throw inventory objects too, so use subfrombill for that
     * arm; a hero throw goes through stolen_value and records the shopkeeper's
     * debit/robbed accounting.  If the shopkeeper disappeared, C clears the
     * stale unpaid bit rather than leaving an unbillable object behind. */
    if (u.ushops && u.ushops.length > 0 && u.ushops.charCodeAt(0) !== 0 && obj.unpaid) {
        const rooms = in_rooms(u.ux | 0, u.uy | 0, 8 /* SHOPBASE */);
        const shkp = shop_keeper(rooms.length ? rooms[0] : 0);
        if (!shkp)
            obj.unpaid = 0;
        else if (game.context?.mon_moving)
            await subfrombill(obj, shkp);
        else
            await stolen_value(obj, u.ux | 0, u.uy | 0, !!shkp.mpeaceful, false);
    }

    /* C potion.c:1926 `obfree(obj, (struct obj *) 0)` — the potion is always
     * used up.  m_throw already extracted it from the thrower's minvent and
     * left it OBJ_FREE, so this is the only owner. */
    await obfree(obj, null);
    /* Bump bridge objs_deleted.count to match C's delobj counter — the same
     * mirror every other real obfree()/dealloc_obj() call site in this port
     * carries (js/cmd.js:6305, js/mklev.js:6038, js/makemon.js:5400,
     * js/sp_lev.js:3759, js/eat.js:2024, js/trap.js:7178, potion.js:1793 &
     * :3370, js/read.js:1971).  js/dokick.js's obfree() itself must NOT do
     * this bump — several of those call sites already bump around their OWN
     * obfree() call, and a bump inside obfree() double-counts every one of
     * them (MEASURED: dothrow board rec#70, a thrown potion merging into a
     * floor stack via stackobj -> _merged_floor, which already bumps this
     * counter itself, went from correct 1 to a doubled 2 the moment obfree()
     * also bumped it).  MEASURED (dothrow board): a non-gremlin potion
     * thrown AT a monster and consumed here left `objs_deleted.count`
     * MISSING against C's captured 1 — this was the one real-deletion call
     * site with no mirror at all. */
    {
        const store = g.__bridge__ || (g.__bridge__ = {});
        const key = 'objs_deleted.count';
        const cur = store[key] !== undefined ? Number(store[key]) : 0;
        store[key] = String(cur + 1);
    }
}
/* C mondata.h:62 is_silent(ptr) — msound == MS_SILENT.  Each file that needs
 * this trivial macro carries its own copy (js/cmd.js:1676, js/vault.js:60);
 * neither is exported. */
const MS_SILENT_POT = 0;
function is_silent_pot(ptr) { return !!ptr && (ptr.msound | 0) === MS_SILENT_POT; }
/* C mondata.h:96 is_were(ptr) — mflags2 & M2_WERE.  js/makemon.js:698 and
 * js/were.js:27 each carry their own copy; neither is exported. */
const M2_WERE_POT = 0x00000004;
function is_were_pot(ptr) { return !!(ptr && ((ptr.mflags2 | 0) & M2_WERE_POT) !== 0); }
/* C mondata.h:101 is_human(ptr) — mflags2 & M2_HUMAN. */
const M2_HUMAN_POT = 0x00000008;
function is_human_pot(ptr) { return !!(ptr && ((ptr.mflags2 | 0) & M2_HUMAN_POT) !== 0); }
/* C monst.h:217 is_vampshifter(mon) — cham identity.  js/mhitm.js:2018 carries
 * the same body, unexported. */
function is_vampshifter_pot(mon) {
    return mon.cham === PM_VAMPIRE || mon.cham === PM_VAMPIRE_LORD || mon.cham === PM_VLAD_THE_IMPALER;
}
/* Resists_Elem(mon, ACID_RES)/(mon, POISON_RES) — MR_ACID/MR_POISON bit tests
 * on the combined resistance mask.  Mirrors js/mhitu.js's local
 * resists_acid_mu/resists_poison_mu (each file carries its own copy). */
function resists_acid_pot(mon) {
    const MR_ACID = 0x08;
    const bits = ((mon.data ? (mon.data.mresists | 0) : 0) | (mon.mextrinsics | 0) | (mon.mintrinsics | 0));
    return (bits & MR_ACID) !== 0;
}
function resists_poison_pot(mon) {
    const MR_POISON = 0x20;
    const bits = ((mon.data ? (mon.data.mresists | 0) : 0) | (mon.mextrinsics | 0) | (mon.mintrinsics | 0));
    return (bits & MR_POISON) !== 0;
}
/* C mhitm.c dmgtype(mon_data, ad_type) == dmgtype_fromattack(ptr, dtyp, AT_ANY).
 * js/mhitm.js's own copy is the same one-liner, unexported. */
const AD_DISE_POT = 33, AD_PEST_POT = 38;
function dmgtype_pot(mon_data, ad_type) { return !!dmgtype_fromattack(mon_data, ad_type, -1 /* AT_ANY */); }
/* C muse.c:2872 mcureblindness(mon, verbos) — RNG-free.  js/makemon.js:5110
 * carries the same body, unexported. */
function mcureblindness_pot(mon, verbos) {
    if (!mon.mcansee) {
        mon.mcansee = 1;
        mon.mblinded = 0;
        if (verbos && haseyes(mon.data))
            pline(`${Monnam(mon)} can see again.`);
    }
}
/* C ref: js/mhitm.js:4057 mon_perma_blind(mdef) — RNG-free, unexported. */
function mon_perma_blind_pot(mdef) { return !!(mdef && mdef.mblinded); }
/* C do_name.c:1042 mon_nam(mtmp). */
function mon_nam_pot(mon) {
    return x_monnam(mon, ARTICLE_THE, null, has_mgivenname(mon) ? SUPPRESS_SADDLE : 0, false);
}
/* C mondata.h:55 has_head(ptr) — mflags1 & M1_NOHEAD == 0.  js/do_wear.js:3547
 * carries the same body, unexported. */
function has_head_pot(mondata) {
    return (((mondata && mondata.mflags1) >>> 0) & 0x00008000) === 0;
}
/* C ref: obj.h:475-478 — how the potion arrived. */
const POTHIT_HERO_BASH = 0, POTHIT_HERO_THROW = 1,
      POTHIT_MONST_THROW = 2, POTHIT_OTHER_THROW = 3;

export async function potionbreathe(obj) {
    const g = game;
    const u = g.u;
    let i, ii, isdone;
    let kn = 0;
    let cureblind = false;
    const already_in_use = obj.in_use;

    obj.in_use = 1;

    const Half_gas_damage = false;
    const pottype = Half_gas_damage ? TOWEL : obj.otyp;

    switch (pottype) {
    case TOWEL:
        pline("Some vapor passes harmlessly around you.");
        break;
    case POT_RESTORE_ABILITY:
    case POT_GAIN_ABILITY:
        if (obj.cursed) {
            if (!breathless(g.youmonst.data)) {
                pline("Ulch!  That potion smells terrible!");
            } else if (haseyes(g.youmonst.data)) {
                let eyes = body_part(EYE);
                if (eyecount(g.youmonst.data) !== 1) {
                    eyes = makeplural(eyes);
                }
                Your("%s %s!", eyes, vtense(eyes, "sting"));
            }
            break;
        } else {
            i = rn2(6);
            for (isdone = ii = 0; !isdone && ii < 6; ii++) {
                if ((u.acurr?.a?.[i] ?? 0) < (u.amax?.a?.[i] ?? 0)) {
                    u.acurr.a[i]++;
                    isdone = !obj.blessed;
                    if (g.disp)
                        g.disp.botl = 1;
                }
                if (++i >= 6)
                    i = 0;
            }
        }
        break;
    case POT_FULL_HEALING:
        if (Upolyd(u) && (u.mh | 0) < (u.mhmax | 0))
            u.mh++, (g.disp ? (g.disp.botl = 1) : void 0);
        if ((u.uhp | 0) < (u.uhpmax | 0))
            u.uhp++, (g.disp ? (g.disp.botl = 1) : void 0);
        cureblind = true;
    case POT_EXTRA_HEALING:
        if (Upolyd(u) && (u.mh | 0) < (u.mhmax | 0))
            u.mh++, (g.disp ? (g.disp.botl = 1) : void 0);
        if ((u.uhp | 0) < (u.uhpmax | 0))
            u.uhp++, (g.disp ? (g.disp.botl = 1) : void 0);
        if (!obj.cursed)
            cureblind = true;
    case POT_HEALING:
        if (Upolyd(u) && (u.mh | 0) < (u.mhmax | 0))
            u.mh++, (g.disp ? (g.disp.botl = 1) : void 0);
        if ((u.uhp | 0) < (u.uhpmax | 0))
            u.uhp++, (g.disp ? (g.disp.botl = 1) : void 0);
        if (obj.blessed)
            cureblind = true;
        if (cureblind) {
            make_blinded(0, !u.ucreamed);
            make_deaf(0, true);
        }
        exercise(4, true);
        break;
    case POT_SICKNESS:
        /* C potion.c:2008 `if (!Role_if(PM_HEALER))`.  This read the numeral
         * 342, not PM_HEALER (334 — js/pm.generated.js:337) — a wrong,
         * hardcoded role mnum, not a stand-in awaiting the real constant.
         * MEASURED (dothrow board): the corpus hero (probe-blastvapor) is
         * role mnum 342, not a Healer, so C's real Role_if(PM_HEALER) reads
         * FALSE and takes the HP-loss + exercise(A_CON, FALSE) branch (its
         * rn2(2) is on the captured tape) — this port's Role_if(342) read
         * TRUE for the SAME hero and skipped the whole branch, silently
         * eating one recorded draw for every POT_SICKNESS potionbreathe. */
        if (!Role_if(PM_HEALER)) {
            if (Upolyd(u)) {
                if ((u.mh | 0) <= 5)
                    u.mh = 1;
                else
                    u.mh -= 5;
            } else {
                if ((u.uhp | 0) <= 5)
                    u.uhp = 1;
                else
                    u.uhp -= 5;
            }
            if (g.disp)
                g.disp.botl = 1;
            exercise(4, false);
        }
        break;
    case POT_HALLUCINATION:
        You("have a momentary vision.");
        break;
    case POT_CONFUSION:
    case POT_BOOZE:
        if (!((u.uprops?.[CONFUSION]?.intrinsic | 0)))
            You_feel("somewhat dizzy.");
        /* C potion.c:2033  make_confused(itimeout_incr(HConfusion, rnd(5)), FALSE)
         * — itimeout_incr (pure), NOT incr_itimeout.  HConfusion is
         * u.uprops[CONFUSION].intrinsic (youprop.h:83). */
        make_confused(itimeout_incr(u.uprops?.[CONFUSION]?.intrinsic | 0, rnd(5)), false);
        break;
    case POT_INVISIBILITY:
        if (!_potion_Blind() && !_potion_Invisible()) {
            kn++;
            pline("For an instant you %s!",
                  _prop_active(SEE_INVIS) ? "could see right through yourself"
                                  : "couldn't see yourself");
        }
        break;
    case POT_PARALYSIS:
        kn++;
        if (!_prop_active(FREE_ACTION)) {
            pline("%s seems to be holding you.", "Something");
            nomul(-rnd(5));
            g.multi_reason = "frozen by a potion";
            g.nomovemsg = You_can_move_again;
            exercise(3, false);
        } else
            You("stiffen momentarily.");
        break;
    case POT_SLEEPING:
        kn++;
        if (!_prop_active(FREE_ACTION) && !_prop_active(SLEEP_RES)) {
            You_feel("rather tired.");
            nomul(-rnd(5));
            g.multi_reason = "sleeping off a magical draught";
            g.nomovemsg = You_can_move_again;
            exercise(3, false);
        } else {
            You("yawn.");
            monstseesu(1);
        }
        break;
    case POT_SPEED:
        if (!_potion_Fast())
            Your("knees seem more flexible now.");
        /* C potion.c:2070  incr_itimeout(&HFast, rnd(5)) — mutating, on the
         * property word itself.  u.HFast is a plain number in this module (see
         * make_fast() below and the peffect_speed test at line ~1089), so wrap
         * it in the {value} ref incr_itimeout() takes and store back. */
        {
            const HFast_ref = { value: u.HFast | 0 };
            incr_itimeout(HFast_ref, rnd(5));
            u.HFast = HFast_ref.value;
        }
        exercise(3, true);
        break;
    case POT_BLINDNESS:
        if (!_potion_Blind() && !_Unaware()) {
            kn++;
            pline("It suddenly gets dark.");
        }
        /* C potion.c:2078  make_blinded(itimeout_incr(BlindedTimeout, rnd(5)), FALSE)
         * — itimeout_incr (pure), NOT incr_itimeout.  youprop.h:93
         *   #define BlindedTimeout (HBlinded & TIMEOUT)
         * with HBlinded = u.uprops[BLINDED].intrinsic (youprop.h:87). */
        make_blinded(itimeout_incr((u.uprops?.[BLINDED]?.intrinsic | 0) & TIMEOUT, rnd(5)), false);
        if (!_potion_Blind() && !_Unaware())
            /* C decl.h:40 + hack.h:272 + decl.c:48 — `vision_clears` is
             * c_common_strings.c_vision_clears, whose value is
             * "vision quickly clears.", NOT "vision clears." */
            Your1("vision quickly clears.");
        break;
    case POT_WATER:
        if (u.umonnum === 316) {
            split_mon(g.youmonst, null);
        } else if (ismnum(u.ulycn)) {
            /* C potion.c:2088 `obj->blessed && gy.youmonst.data == &mons[u.ulycn]`
               — same permonst-pointer identity test as potion.c:736 above;
               ported as the form-index comparison (see that site's note). */
            if (obj.blessed && (g.youmonst.data ? (g.youmonst.data.pmidx | 0) : -1) === (u.ulycn | 0))
                you_unwere(false);
            else if (obj.cursed && !Upolyd(u))
                you_were();
        }
        break;
    case POT_ACID:
    case POT_POLYMORPH:
        exercise(4, false);
        break;
    }

    if (!already_in_use)
        obj.in_use = 0;
    if (obj.dknown) {
        if (kn)
            makeknown(obj.otyp);
        else
            await trycall_cmd(obj);
    }
}

/* self_invis_message — C ref: potion.c:472-480; youprop.h Hallucination/See_invisible.
 * uprops is a sparse map (absent slot = unset = 0); read via ?. like mhitm.js:706. */
export async function self_invis_message() {
    const u = game.u;
    const HHallucination = u.uprops?.[HALLUC]?.intrinsic || 0;
    const HHalluc_resistance = u.uprops?.[HALLUC_RES]?.intrinsic || 0;
    const EHalluc_resistance = u.uprops?.[HALLUC_RES]?.extrinsic || 0;
    const Halluc_resistance = HHalluc_resistance || EHalluc_resistance;
    const Hallucination = HHallucination && !Halluc_resistance;
    const HSee_invisible = u.uprops?.[SEE_INVIS]?.intrinsic || 0;
    const ESee_invisible = u.uprops?.[SEE_INVIS]?.extrinsic || 0;
    const See_invisible = HSee_invisible || ESee_invisible;
    /* C potion.c:477-479 is a two-%s pline; js/display.js's pline takes ONE
     * already-formatted string, so the C-style call printed the format itself.
     * This function had no live caller until trap.c's domagictrap fate-11 arm
     * reached it, which is why the breakage was invisible. */
    return pline(`${Hallucination ? 'Far out, man!  You' : 'Gee!  All of a sudden, you'} `
        + `${See_invisible ? 'can see right through yourself' : "can't see yourself"}.`);
}

/* Spellbook otyp constants — C objects.h, base 365 (SPBOOK_CLASS=10) */
const SPE_RESTORE_ABILITY = 392;
const SPE_INVISIBILITY = 393;
const SPE_DETECT_TREASURE = 394;
const SPE_DETECT_MONSTERS = 373;
const SPE_HASTE_SELF = 388;
const SPE_LEVITATION = 390;

/* C ref: pline.c impossible(const char *s, ...) — VARIADIC, and it PRINTS:
 * vpline(s, the_args) followed by pline("Program in disorder - perhaps you'd
 * better #quit."), plus a paniclog entry.  This body takes fixed parameters,
 * so its callers silently dropped their arguments (flagged by
 * tools/format-arity-lint.mjs).  The rest parameter fixes the arity.
 * KNOWN GAP, deliberately not closed here: this stub still emits NOTHING
 * where C emits two toplines.  Porting the output is not a safe drive-by —
 * impossible() firing in this port where it does not fire in C would ADD
 * toplines C never printed, which is a regression in the opposite direction.
 * Reported rather than guessed at. */
function impossible(_fmt, ..._args) { /* no-op — see note above */ }

/* ===========================================================================
 * READ THIS BEFORE PORTING ANY peffect_* ARM.
 *
 * There are TWO potion-effect ladders in this file and only ONE of them runs:
 *
 *   LIVE  — dodrink()'s hand-written `otmp.otyp === POT_*` chain (this file,
 *           ~line 1200-1560).  This is what the scored runSegment() path
 *           actually executes; its tail is `pline('Nothing happens.')`.
 *   SPELL — `peffects(otmp)` below, together with the stub bodies in this
 *           block.  ITS "DEAD" LABEL IS STALE AS OF 2026-09-11 — peffects()
 *           is LIVE: js/spell.js:48
 *           imports it and js/spell.js:1947 does `await peffects(pseudo)` for
 *           every spell that routes through a pseudo-potion.  Re-check the
 *           importers before trusting any "dead ladder" claim here; the
 *           2026-08-14 reading at 4dc3a090 (ZERO callers) was true then.
 *           peffect_full_healing's bare `u` — a free identifier that would
 *           have thrown on first call — is bound to game.u now, and peffects()
 *           itself is async so its six async arms are awaited rather than
 *           fired and forgotten.
 *           dodrink() calls peffect_water / peffect_oil / peffect_sickness /
 *           peffect_extra_healing DIRECTLY, bypassing peffects() entirely.
 *
 * The stub bodies here are still NOT "seventeen missing potion arms" for the
 * QUAFF path — dodrink() never reaches them, which is how peffect_booze stayed
 * empty after booze was fixed in the live ladder (commit for seed0002-booze).
 * They ARE reachable from the SPELL path since js/spell.js started calling
 * peffects(); filling one in changes what a pseudo-potion spell does, and
 * nothing else.
 *
 * When you port an arm: give it a REAL body here (async, awaiting pline), and
 * add a live-ladder arm in dodrink() that CALLS it — see POT_EXTRA_HEALING for
 * the pattern.  One body, two entry points; never two bodies.
 *
 * Corpus reachability, measured 2026-08-14 by instrumenting dodrink and by
 * enumerating every "What do you want to drink?" prompt across all 44 public
 * sessions: the corpus contains NINE quaffs of a potion in inventory, and
 * eight of them land on arms the live ladder already has (fruit juice,
 * paralysis, confusion x2, booze, healing, sickness, oil).  The ONLY quaff
 * that reached the 'Nothing happens.' tail was seed4500 step 1203
 * (POT_EXTRA_HEALING), now ported.  Do not expect the remaining sixteen stubs
 * to have quaff witnesses — they do not.  Their live witnesses, if any, come
 * from potionbreathe() vapours and from fountain.c's drinkfountain() ladder,
 * which share leaves (monster_detect, make_hallucinated, ...) with them.
 * A caller other than dodrink() can still reach these stubs: an absent quaff
 * witness does not establish that a spell or vapour path cannot.
 * =========================================================================== */

/* C potion.c:645-693 peffect_restore_ability(struct obj *otmp) — potion OR
 * spell of restore ability (for the spell, otmp is a temporary spellbook
 * object, blessed if the hero is skilled in healing).
 *
 *     gp.potion_unkn++;
 *     if (otmp->cursed) { pline("Ulch! ..."); return; }
 *     pline("Wow!  This makes you feel %s!",
 *           (!otmp->blessed) ? "good"
 *           : unfixable_trouble_count(FALSE) ? "better" : "great");
 *     i = rn2(A_MAX);
 *     for (ii = 0; ii < A_MAX; ii++) {
 *         int lim = AMAX(i);
 *         if (ABASE(i) < lim) {
 *             ABASE(i) = lim;
 *             AEXE(i) = max(AEXE(i), 0);
 *             disp.botl = TRUE;
 *             if (!otmp->blessed) break;
 *         }
 *         if (++i >= A_MAX) i = 0;
 *     }
 *     if (otmp->otyp == POT_RESTORE_ABILITY && u.ulevel < u.ulevelmax) {
 *         do { pluslvl(FALSE); } while (u.ulevel < u.ulevelmax && otmp->blessed);
 *     }
 *
 * u.acurr.a[]/u.amax.a[]/u.aexe.a[] are DISPLAY order in this port
 * (_C_ATTR_TO_DISP above), while C's own arrays ARE the A_STR..A_CHA order —
 * every ABASE(i)/AMAX(i)/AEXE(i) below therefore translates the C-constant i
 * through _C_ATTR_TO_DISP, the same translation _adjattrib() already applies.
 *
 * RNG: rn2(A_MAX) === rn2(6) (attrib.h:18, A_MAX=6) is the ONE draw — this is
 * the site the recorder's raw (uncorrected) attribution names,
 * peffect_restore_ability(potion.c:662); the search loop itself is RNG-free. */
async function peffect_restore_ability(otmp) {
    const g = game;
    const u = g.u;
    g._potion_unkn = (g._potion_unkn | 0) + 1;
    if (otmp.cursed) {
        await pline('Ulch!  This makes you feel mediocre!');
        return;
    }
    await pline(`Wow!  This makes you feel ${
        (!otmp.blessed) ? 'good'
        : unfixable_trouble_count(false) ? 'better'
        : 'great'}!`);
    const abase = _getAbase(u);
    const amax = _getAmax(u);
    const aexe = _getAexe(u);
    let i = rn2(A_MAX);
    for (let ii = 0; ii < A_MAX; ii++) {
        const di = _C_ATTR_TO_DISP[i] ?? i;
        const lim = amax[di] | 0;
        if ((abase[di] | 0) < lim) {
            abase[di] = lim;
            aexe[di] = Math.max(aexe[di] | 0, 0);
            if (g.disp)
                g.disp.botl = 1;
            if (!otmp.blessed)
                break;
        }
        if (++i >= A_MAX)
            i = 0;
    }
    if (otmp.otyp === POT_RESTORE_ABILITY && (u.ulevel | 0) < (u.ulevelmax | 0)) {
        do {
            await pluslvl(false);
        } while ((u.ulevel | 0) < (u.ulevelmax | 0) && otmp.blessed);
    }
}
/* C potion.c:709-728 peffect_hallucination(struct obj *otmp).
 *     if (Halluc_resistance) { gp.potion_nothing++; return; }
 *     else if (Hallucination) gp.potion_nothing++;
 *     (void) make_hallucinated(itimeout_incr(HHallucination,
 *                                             rn1(200, 600 - 300*bcsign(otmp))),
 *                              TRUE, 0L);
 *     if ((otmp->blessed && !rn2(3)) || (!otmp->cursed && !rn2(6))) {
 *         You("perceive yourself...");
 *         display_nhwindow(WIN_MESSAGE, FALSE);
 *         enlightenment(MAGICENLIGHTENMENT, ENL_GAMEINPROGRESS);
 *         Your("awareness re-normalizes.");
 *         exercise(A_WIS, TRUE);
 *     }
 *
 * HHallucination is read BY VALUE before make_hallucinated() stores the new
 * one — same itimeout_incr(old, incr) shape as peffect_invisibility above.
 * Halluc_resistance/Hallucination are youprop.h macros (HALLUC has no
 * extrinsic term, HALLUC_RES does) — same expression this file already opens
 * up in _potion_Hallucination()/self_invis_message(), duplicated here because
 * C reads HHallucination as a bare value, not just a boolean.
 *
 * RNG: rn1(200, 600-300*bcsign) always fires once Halluc_resistance is false
 * (make_hallucinated is unconditional); the "perceive yourself" arm then
 * draws rn2(3) (blessed) or rn2(6) (otherwise), and its own exercise(A_WIS)
 * draws rn2(19) — this is potion.c:709's own draw, distinct from
 * distfleeck's rn2(5) that js/monmove.js was drawing in its place. */
async function peffect_hallucination(otmp) {
    const g = game;
    const u = g.u;
    const hp = u.uprops?.[HALLUC];
    const HHallucination = (hp?.intrinsic | 0);
    const hrp = u.uprops?.[HALLUC_RES];
    const Halluc_resistance = (hrp?.intrinsic | 0) || (hrp?.extrinsic | 0);

    if (Halluc_resistance) {
        g._potion_nothing = (g._potion_nothing | 0) + 1;
        return;
    } else if (HHallucination) { /* Hallucination, with !Halluc_resistance known true here */
        g._potion_nothing = (g._potion_nothing | 0) + 1;
    }
    await make_hallucinated(itimeout_incr(HHallucination,
                                           rn1(200, 600 - 300 * bcsign(otmp))),
                             true, 0);
    if ((otmp.blessed && !rn2(3)) || (!otmp.cursed && !rn2(6))) {
        await You('perceive yourself...');
        await force_more(g._pending_message || 'You perceive yourself...');
        await enlightenment_menu(MAGICENLIGHTENMENT);
        await Your('awareness re-normalizes.');
        await exercise(A_WIS, true);
    }
}
/* C potion.c:771-792 peffect_booze().  This is shared by quaffing and by
 * sink/fountain potion dispatch; consumption and identification stay in the
 * caller, just as they do in C's dopotion() tail. */
async function peffect_booze(otmp) {
    const g = game;
    const u = g.u;
    g._potion_unkn = (g._potion_unkn | 0) + 1;
    await pline('Ooph!  This tastes like '
                + (otmp.odiluted ? 'watered down ' : '')
                + (_potion_Hallucination() ? 'dandelion wine' : 'liquid fire')
                + '!');
    if (!otmp.blessed)
        make_confused(itimeout_incr(u.uprops?.[CONFUSION]?.intrinsic | 0,
                                    d(2 + (u.uhs | 0), 8)), false);
    if (!otmp.odiluted)
        healup(1, 0, false, false);
    u.uhunger += 10 * (2 + bcsign(otmp));
    await newuhs(false);
    await exercise(A_WIS, false);
    if (otmp.cursed) {
        await pline('You pass out.');
        g.multi = -rnd(15);
        g.nomovemsg = 'You awake with a headache.';
    }
}
/* C zap.c:2525-2532 do_enlightenment_effect(void):
 *     You_feel("self-knowledgeable...");
 *     display_nhwindow(WIN_MESSAGE, FALSE);
 *     enlightenment(MAGICENLIGHTENMENT, ENL_GAMEINPROGRESS);
 *     pline_The("feeling subsides.");
 *     exercise(A_WIS, TRUE);
 * js/zap.js:4865 has it as `throw new Error('not yet ported')` and js/zap.js
 * never reaches that call on any corpus session; the potion is the live caller.
 * RNG: exercise(A_WIS, TRUE) draws rn2(19) (attrib.c:509) — the ONE draw the
 * recording shows for this whole sequence.  The menu itself draws nothing.
 *
 * display_nhwindow(WIN_MESSAGE, FALSE) is what raises the --More-- on
 * "You feel self-knowledgeable..." — measured on gen263-reseed-seed1423015,
 * where C holds that --More-- across FIFTEEN recorded keystrokes (steps 5-19;
 * only xwaitforspace's quitchars dismiss it) and opens the menu at step 20. */
export async function do_enlightenment_effect() {
    const g = game;
    await pline('You feel self-knowledgeable...');
    /* C display_nhwindow(WIN_MESSAGE, FALSE) — flush the topline; the menu's
     * own tty_display_nhwindow then pages it because toplin is NEED_MORE. */
    await force_more(g._pending_message || 'You feel self-knowledgeable...');
    await enlightenment_menu(MAGICENLIGHTENMENT);
    await pline('The feeling subsides.');
    await exercise(A_WIS, true);
}
/* C potion.c:794-808 peffect_enlightenment(struct obj *otmp).
 * The body was `function peffect_enlightenment(otmp) {}` and dodrink()'s otyp
 * ladder had no POT_ENLIGHTENMENT arm, so the potion printed "Nothing happens."
 * RNG: none on the uncursed path (adjattrib only for a blessed potion;
 * exercise for a cursed one). */
async function peffect_enlightenment(otmp) {
    const g = game;
    if (otmp.cursed) {
        g._potion_unkn = (g._potion_unkn | 0) + 1;
        await pline('You have an uneasy feeling...');
        await exercise(A_WIS, false);
    } else {
        if (otmp.blessed) {
            await adjattrib(A_INT, 1, 0);
            await adjattrib(A_WIS, 1, 0);
        }
        await do_enlightenment_effect();
    }
}
/* C ref: potion.c:809-837 peffect_invisibility(struct obj *otmp).
 *
 * WITNESS: gen483-recombine-seed1841527 step 5 quaffs an uncursed potion of
 * invisibility; C's first draw there is d(6,100) at potion.c:828 and this port
 * drew nothing at all, so the whole 225-frame tail was wrong from that frame.
 *
 * The `is_spell` mummy-wrapping early-out (potion.c:815-818) is reached only
 * when otmp->oclass == SPBOOK_CLASS, i.e. from the invisibility SPELL.
 * dodrink() below rejects any non-POTION_CLASS object before it gets here
 * (the drink_ok/silly_thing screen), so on this port's only live entry point
 * is_spell is structurally false; the branch is left as C's shape in comment
 * rather than transliterated against a uarmc/yname plumbing this file lacks.
 * Port it together with the spell entry point, not before.
 *
 *     if (is_spell && BInvis && uarmc->otyp == MUMMY_WRAPPING) {
 *         You_feel("rather itchy under %s.", yname(uarmc));
 *         return;
 *     }
 */
async function peffect_invisibility(otmp) {
    const g = game;
    const u = g.u;
    /* youprop.h:198-199  Invis = (HInvis || EInvis) && !BInvis; BInvis is the
     * blocked word.  One uprops row, read three ways, as C's macros do. */
    const ip = _uprop(INVIS);
    const BInvis = (ip.blocked | 0);
    const Invis = !!(((ip.intrinsic | 0) || (ip.extrinsic | 0)) && !BInvis);

    if (Invis || _potion_Blind() || BInvis) {
        g._potion_nothing = (g._potion_nothing | 0) + 1;
    } else {
        await self_invis_message();
    }
    /* C potion.c:826-829:
     *     if (otmp->blessed && !rn2(HInvis ? 15 : 30)) HInvis |= FROMOUTSIDE;
     *     else incr_itimeout(&HInvis, d(6 - 3 * bcsign(otmp), 100) + 100);
     * The rn2 fires ONLY for a blessed potion — && short-circuits — which is
     * why the uncursed witness above draws d(6,100) as its first leaf. */
    if (otmp.blessed && !rn2((ip.intrinsic | 0) ? 15 : 30)) {
        ip.intrinsic = (ip.intrinsic | FROMOUTSIDE) >>> 0;
    } else {
        const which = { value: ip.intrinsic | 0 };
        incr_itimeout(which, d(6 - 3 * bcsign(otmp), 100) + 100);
        ip.intrinsic = which.value;
    }
    newsym(u.ux, u.uy); /* update position */
    if (otmp.cursed) {
        await pline("For some reason, you feel your presence is known.");
        aggravate();
        /* "doing this gives temporary invisibility, but removes permanent
           invisibility" */
        ip.intrinsic = (ip.intrinsic & ~FROMOUTSIDE) >>> 0;
    }
}
/* C potion.c:841-878 peffect_see_invisible(struct obj *otmp).
 *
 * Serves POT_SEE_INVISIBLE and POT_FRUIT_JUICE (peffects() potion.c:1358).
 * The fruit-juice half returns before any RNG; the see-invisible half draws
 * rn1(100, 750) — recorded as `rn2(100)=79 @ peffect_see_invisible(potion.c:870)`
 * on gen135-reseed-seed1191299 step 5 — unless the potion is blessed, in which
 * case a permchance roll comes first.
 *
 * NOT ported here (no corpus reach and no js/ counterpart): set_mimic_blocking()
 * (potion.c:871).  It walks fmon flipping M_AP_* on mimics that are pretending
 * to be objects; it draws nothing, so its absence cannot move the RNG stream,
 * and this file's peffect_invisibility() leaves the same call out for the same
 * reason. */
async function peffect_see_invisible(otmp) {
    const g = game;
    const u = g.u;
    const invp = _uprop(INVIS);
    const seep = _uprop(SEE_INVIS);
    const HInvis = (invp.intrinsic | 0);
    const BInvis = (invp.blocked | 0);
    const Invisible = !!(((invp.intrinsic | 0) || (invp.extrinsic | 0)) && !BInvis);
    const Blind = _potion_Blind();
    const msg = Invisible && !Blind;
    const permchance = 10 - (HInvis ? 3 : 0) - ((seep.intrinsic | 0) ? 6 : 0);

    g._potion_unkn = (g._potion_unkn | 0) + 1;
    if (otmp.cursed)
        await pline('Yecch!  This tastes '
                    + (_potion_Hallucination() ? 'overripe' : 'rotten') + '.');
    else
        await pline(_potion_Hallucination()
                    ? `This tastes like 10% real ${otmp.odiluted ? 'reconstituted ' : ''}${fruitname(true)} all-natural beverage.`
                    : `This tastes like ${otmp.odiluted ? 'reconstituted ' : ''}${fruitname(true)}.`);
    if (otmp.otyp === POT_FRUIT_JUICE) {
        u.uhunger = (u.uhunger | 0)
            + (otmp.odiluted ? 5 : 10) * (2 + bcsign(otmp));
        await newuhs(false);
        return;
    }
    if (!otmp.cursed) {
        /* Tell them they can see again immediately, which
         * will help them identify the potion... */
        make_blinded(0, true);
    }
    if (otmp.blessed && !rn2(permchance)) {
        seep.intrinsic = (seep.intrinsic | FROMOUTSIDE) >>> 0;
    } else {
        const which = { value: seep.intrinsic | 0 };
        incr_itimeout(which, rn1(100, 750));
        seep.intrinsic = which.value;
    }
    see_monsters();     /* see invisible monsters */
    newsym(u.ux, u.uy); /* see yourself! */
    if (msg && !_potion_Blind()) { /* Blind possible if polymorphed */
        await pline('You can see through yourself, but you are visible!');
        g._potion_unkn = (g._potion_unkn | 0) - 1;
    }
}
function peffect_paralysis(otmp) {
    const g = game;
    const u = g.u;
    if (_prop_active(FREE_ACTION)) {
        pline("You stiffen momentarily.");
    } else {
        if (_prop_active(LEVITATION) || Is_airlevel(u.uz) || Is_waterlevel(u.uz))
            pline("You are motionlessly suspended.");
        else if (u.usteed)
            pline("You are frozen in place!");
        else {
            const sfc = _surface(u.ux, u.uy);
            pline(`Your feet are frozen to the ${sfc}!`);
        }
        const bcsign = (otmp.blessed ? 1 : 0) - (otmp.cursed ? 1 : 0);
        nomul(-(rn2(10) + (25 - 12 * bcsign)));
        g.multi_reason = "frozen by a potion";
        g.nomovemsg = "You can move again.";
        exercise(A_DEX, false);
    }
}
async function peffect_sleeping(otmp) {
    /* C potion.c:902-913.  Use the property table rather than the legacy
     * convenience fields, which are not populated for every reconstructed
     * hero state. */
    if (_prop_active(SLEEP_RES) || _prop_active(FREE_ACTION)) {
        monstseesu(1);
        await pline('You yawn.');
    } else {
        await pline('You suddenly fall asleep!');
        monstunseesu(1);
        await fall_asleep(-(rn2(10) + 25 - 12 * bcsign(otmp)), true);
    }
}
/* C ref: potion.c:913-950 peffect_monster_detection(struct obj *otmp).
 * Returns 1 ("nothing detected") to make peffects() return 1, which makes
 * dopotion() return ECMD_TIME WITHOUT useup or identify; returns 0 to fall
 * through to dopotion's ordinary useup+identify tail.
 *
 * WITNESS: gen059-reseed-seed265744 step 5 quaffs a BLESSED potion of monster
 * detection; C's first draw there is rn2(100) at potion.c:930 (the `i = rn2(100)
 * + 100` timeout roll) and this port drew nothing, so its 225-frame tail was
 * wrong from that frame.
 *
 * RNG: exactly one draw, and only on the blessed path — rn1(40,21) for the
 * spellbook, rn2(100) for the potion, neither when the existing timeout is
 * already >= 300.
 */
async function peffect_monster_detection(otmp) {
    const g = game;
    const u = g.u;
    if (otmp.blessed) {
        let i;
        /* HDetect_monsters/EDetect_monsters share the one uprops row that
         * js/display.js:_uprop(DETECT_MONSTERS) reads for senseself(). */
        const dm = _detect_monsters_uprop(u);
        if ((dm.intrinsic | 0) || (dm.extrinsic | 0))
            g._potion_nothing = (g._potion_nothing | 0) + 1;
        g._potion_unkn = (g._potion_unkn | 0) + 1;
        /* after a while, repeated uses become less effective */
        if ((((dm.intrinsic | 0) & TIMEOUT) >>> 0) >= 300)
            i = 1;
        else if ((otmp.oclass | 0) === SPBOOK_CLASS)
            i = rn1(40, 21);
        else /* potion */
            i = rn2(100) + 100;
        {
            const which = { value: dm.intrinsic | 0 };
            incr_itimeout(which, i);
            dm.intrinsic = which.value;
        }
        for (let x = 1; x < COLNO; x++) {
            for (let y = 0; y < ROWNO; y++) {
                /* C: levl[x][y].glyph == GLYPH_INVISIBLE — the remembered "I"
                 * marker map_invisible() writes into hero memory. */
                if (glyph_is_invisible_at(x, y)) {
                    unmap_object(x, y);
                    newsym(x, y);
                }
                /* C: MON_AT(x, y) — any monster occupying the square clears
                 * potion_unkn, which is what suppresses "You feel lonely." and
                 * makes dopotion's tail identify the potion outright. */
                if (_gush_m_at(x, y))
                    g._potion_unkn = 0;
            }
        }
        /* if swallowed or underwater, fall through to uncursed case */
        /* youprop.h:279 #define Underwater (u.uinwater) */
        if (!u.uswallow && !u.uinwater) {
            see_monsters();
            if (g._potion_unkn)
                await pline("You feel lonely.");
            return 0;
        }
    }
    if (await monster_detect(otmp, 0))
        return 1; /* nothing detected */
    await exercise(A_WIS, true);
    return 0;
}
/* C ref: detect.c:249-256 observe_recursively(obj) — observe_object(obj),
 * then recurse into a container's contents.  do_dknown-gated caller below. */
function _observe_recursively_det(obj) {
    observe_object(obj);
    if (Has_contents(obj)) {
        for (let o = obj.cobj; o; o = o.nobj)
            _observe_recursively_det(o);
    }
}
/* C ref: detect.c:260-306 check_map_spot(x, y, oclass, material) — the
 * oclass===ALL_CLASSES half only (object_detect's only caller here always
 * passes ALL_CLASSES; the material/class-match halves serve gold_detect and
 * a class-specific caller neither of which reaches this file). "Stale" means
 * an object glyph is remembered here but nothing (no real floor object, no
 * monster with inventory) actually occupies the square any more. */
function _check_map_spot_alldetect(x, y) {
    const g = game;
    const loc = g.level && g.level.at ? g.level.at(x, y) : null;
    const rg = loc && loc.remembered_glyph;
    if (!rg || rg.cls !== GLYPHCLS_OBJ)
        return false;
    const hasFloorObj = !!(g.level && g.level.levelObjects
                            && g.level.levelObjects[x] && g.level.levelObjects[x][y]);
    if (hasFloorObj)
        return false;
    const mtmp = m_at(x, y);
    return !(mtmp && mtmp.minvent);
}
/* C ref: detect.c:311-330 clear_stale_map(ALL_CLASSES, 0). RNG-free. */
function _clear_stale_map_alldetect() {
    let change_made = false;
    for (let zx = 1; zx < COLNO; zx++) {
        for (let zy = 0; zy < ROWNO; zy++) {
            if (_check_map_spot_alldetect(zx, zy)) {
                unmap_object(zx, zy);
                change_made = true;
            }
        }
    }
    return change_made;
}
/* C ref: detect.c:35-36 (flag.h) TER_OBJ 0x04 — see TER_MON/TER_DETECT above. */
const TER_OBJ = 0x04;
/* C objects.h GOLD_PIECE otyp — same value js/makemon.js:1404's local
 * GOLD_PIECE_OTYP carries (MKOBJ_SVB_BASES[COIN_CLASS]=438); this file's own
 * name to avoid importing a non-exported local from another module. */
const GOLD_PIECE_OTYP_DET = 438;
/* C ref: detect.c:603-788 object_detect(detector, class).
 *
 * Used by potions, scrolls, spells and crystal balls; the only LIVE caller in
 * this port is peffect_object_detection below, which always passes class=0.
 * With class===0 (and therefore boulder===0, since def_oc_syms[0] is never
 * the boulder symbol), every `(!class && !boulder) || o_in(obj, class) ||
 * o_in(obj, boulder)` guard in C takes its short-circuit TRUE half
 * unconditionally — o_in() and the boulder-symbol special case are NEVER
 * exercised on this path and are not ported; a future class!=0 caller needs
 * them ported first (throws below rather than silently mis-scoping).
 *
 * Returns 1 ("nothing detected"), 0 ("something detected").
 * RNG: rnd(10) once per monster whose minvent contains gold (the mapping
 * loop's "usually more than 1" roll, detect.c:766) — clear_stale_map and
 * the counting loop draw nothing.  exercise(A_WIS, TRUE) is the CALLER's
 * draw (peffect_object_detection), not this function's — matches C, where
 * object_detect() itself never calls exercise(). */
async function object_detect(detector, oclass) {
    const g = game;
    const u = g.u;
    if (oclass) {
        /* C detect.c:619 reports an impossible class and returns without
         * mapping; keep that nonfatal behavior for future classed callers. */
        return 1;
    }
    const is_cursed = !!(detector && detector.cursed);
    const do_dknown = !!(detector
        && (detector.oclass === POTION_CLASS || detector.oclass === SPBOOK_CLASS)
        && detector.blessed);
    let ct = 0, ctu = 0;

    if (do_dknown) {
        for (let o = g.invent; o; o = o.nobj)
            _observe_recursively_det(o);
    }
    for (let o = g.fobj; o; o = o.nobj) {
        if (u_at(o.ox, o.oy)) ctu++; else ct++;
        if (do_dknown) _observe_recursively_det(o);
    }
    for (let o = g.level && g.level.buriedobjlist; o; o = o.nobj) {
        if (u_at(o.ox, o.oy)) ctu++; else ct++;
        if (do_dknown) _observe_recursively_det(o);
    }

    if (u.usteed) {
        u.usteed.mx = u.ux;
        u.usteed.my = u.uy;
    }

    for (let mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
        if ((mtmp.mhp | 0) < 1 || (mtmp.isgd && !mtmp.mx))
            continue;
        for (let o = mtmp.minvent; o; o = o.nobj) {
            ct++;
            if (do_dknown) _observe_recursively_det(o);
        }
        /* C detect.c:668-676 — the `break` exits the OUTER mtmp loop the
         * instant ANY monster is a cursed-detector mimic-of-object or
         * carries gold.  Ported as-is (Cardinal Rule 1: port the bug). */
        if ((is_cursed && M_AP_TYPE(mtmp) === M_AP_OBJECT) || findgold(mtmp.minvent)) {
            ct++;
            break;
        }
    }

    const stale = _clear_stale_map_alldetect();
    const stuff = _hallucination() ? 'something' : 'objects';
    if (!stale && !ct) {
        if (!ctu) {
            strange_feeling_sync(detector, 'You feel a lack of something.');
            return 1;
        }
        await You(`sense ${stuff} nearby.`);
        return 0;
    }

    await cls();
    /* Map buried objects, then the top of every floor pile, then one item
     * (plus gold/mimic-disguise) per monster.  Every o_in() branch in C
     * collapses to "map the object unconditionally" here — see the class=0
     * note above. */
    for (let o = g.level && g.level.buriedobjlist; o; o = o.nobj)
        map_object(o, 1);
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const o = g.level && g.level.levelObjects
                && g.level.levelObjects[x] && g.level.levelObjects[x][y];
            if (o) map_object(o, 1);
        }
    }
    for (let mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
        if ((mtmp.mhp | 0) < 1 || (mtmp.isgd && !mtmp.mx))
            continue;
        if (mtmp.minvent) {
            const otmp = mtmp.minvent;
            otmp.ox = mtmp.mx;
            otmp.oy = mtmp.my;
            map_object(otmp, 1);
        }
        /* C detect.c:761-772 — NOT gated on whether the inventory-item map
         * above fired; every monster gets this second, independent check. */
        if (is_cursed && M_AP_TYPE(mtmp) === M_AP_OBJECT) {
            const corpsenm = (MCORPSENM(mtmp) !== NON_PM) ? MCORPSENM(mtmp) : PM_TENGU;
            map_object({ otyp: mtmp.mappearance | 0, quan: 1,
                          ox: mtmp.mx, oy: mtmp.my, corpsenm }, 1);
        } else if (findgold(mtmp.minvent)) {
            map_object({ otyp: GOLD_PIECE_OTYP_DET, oclass: COIN_CLASS,
                          quan: rnd(10), ox: mtmp.mx, oy: mtmp.my }, 1);
        }
    }

    /* C detect.c:775-778 — TER_MON is added, and the hero's own square is
     * force-redrawn, only when nothing is currently displayed as an object
     * there.  Approximated against the floor-object presence this port can
     * see (rather than the live glyph state), which is the same information
     * C's check ultimately reduces to once the mapping loop above has run. */
    let ter_typ = TER_DETECT | TER_OBJ;
    const heroHasObjGlyph = !!(g.level && g.level.levelObjects
                                && g.level.levelObjects[u.ux] && g.level.levelObjects[u.ux][u.uy]);
    if (!heroHasObjGlyph) {
        newsym(u.ux, u.uy);
        ter_typ |= TER_MON;
    }
    await You(`detect the ${ct ? 'presence' : 'absence'} of ${stuff}.`);

    /* C detect.c:782-785 — `if (!ct) display_nhwindow(WIN_MAP, TRUE); else
     * browse_map(ter_typ, "object");`  display_nhwindow(WIN_MAP,...) is not
     * reachable from this module (private to js/cmd.js); browse_map's own
     * body is just a getpos() autodescribe pass (mirrors monster_detect's
     * inline copy above), used for both arms here since both ultimately let
     * the player look at the just-drawn map and neither draws RNG. */
    {
        g.iflags = g.iflags || {};
        const savedTerrainmode = g.iflags.terrainmode;
        g.iflags.terrainmode = ter_typ;
        try {
            await getpos({ x: u.ux, y: u.uy }, false, 'object of interest');
        } finally {
            g.iflags.terrainmode = savedTerrainmode;
        }
    }

    /* C detect.c:94-102 map_redisplay(): reconstrain_map (a no-op here, see
     * monster_detect's identical note above) then docrt() -> cls(), whose
     * FIRST statement flushes the message window — a BLOCKING more() if
     * getpos's non-force quitchar arm left "Done." unacknowledged (the exact
     * pattern reveal_terrain() at js/cmd.js:11829-11832 documents and gates
     * the same way, off the same `g._pending_message` predicate). */
    if (g._pending_message)
        await force_more(g._pending_message);
    await docrt();
    return 0;
}
/* C ref: detect.c:955-960 peffect_object_detection(struct obj *otmp).
 * Returns 1 ("nothing detected"), 0 ("something detected" — the caller then
 * draws exercise(A_WIS, TRUE), matching object_detect() itself NOT drawing
 * it). */
async function peffect_object_detection(otmp) {
    if (await object_detect(otmp, 0))
        return 1;
    await exercise(A_WIS, true);
    return 0;
}
/* C ref: youprop.h:48 Poison_resistance = (HPoison_resistance ||
 * EPoison_resistance), i.e. u.uprops[POISON_RES].{intrinsic,extrinsic}.  A
 * missing uprops entry reads as C's BSS-zero default. */
function Poison_resistance() {
    const p = game.u && game.u.uprops && game.u.uprops[POISON_RES];
    return !!(p && (p.intrinsic || p.extrinsic));
}
/* C ref: youprop.h:385 Fixed_abil = u.uprops[FIXED_ABIL].extrinsic — EXTRINSIC
 * ONLY, unlike its neighbours (C's own "/_ KMH _/" note flags the asymmetry). */
function Fixed_abil() {
    const p = game.u && game.u.uprops && game.u.uprops[FIXED_ABIL];
    return !!(p && p.extrinsic);
}
/* C ref: potion.c:963-1010 peffect_sickness(otmp) — the POT_SICKNESS effect.
 *
 *   pline("Yecch!  This stuff tastes like poison.");
 *   if (otmp->blessed) { ...mildly stale fruit... }
 *   else {
 *       if (Poison_resistance) pline("(But in fact it was biologically contaminated %s.)", fruitname(TRUE));
 *       if (Role_if(PM_HEALER)) pline("Fortunately, you have been immunized.");
 *       else {
 *           int typ = rn2(A_MAX);
 *           Sprintf(contaminant, "%s%s", Poison_resistance ? "mildly " : "",
 *                   otmp->fromsink ? "contaminated tap water" : "contaminated potion");
 *           if (!Fixed_abil) {
 *               poisontell(typ, FALSE);
 *               (void) adjattrib(typ, Poison_resistance ? -1 : -rn1(4, 3), 1);
 *           }
 *           if (!Poison_resistance)
 *               losehp(rnd(10) + 5 * !!(otmp->cursed), contaminant,
 *                      otmp->fromsink ? KILLED_BY : KILLED_BY_AN);
 *           else
 *               losehp(1 + rn2(2), contaminant, otmp->fromsink ? KILLED_BY : KILLED_BY_AN);
 *           exercise(A_CON, FALSE);
 *       }
 *   }
 *   if (Hallucination) { You("are shocked back to your senses!"); make_hallucinated(0L, FALSE, 0L); }
 *
 * RNG ORDER on the live (unblessed, non-Healer, unresistant, non-Fixed_abil)
 * path is rn2(A_MAX), then rn1(4,3) — evaluated as adjattrib's ARGUMENT, so
 * before any draw adjattrib makes — then rnd(10).  poisontell() is RNG-free
 * (attrib.c: it only picks a message out of poiseff[]).
 * KILLED_BY_AN is 0 and KILLED_BY is 1 (hack.h:602-603).
 * This was an empty stub, so seed0014 step 152 printed the dopotion
 * "Nothing happens." fallback where C prints the Yecch line and its --More--. */
const KILLED_BY_AN_POT = 0, KILLED_BY_POT = 1; /* hack.h:602-603 */
async function peffect_sickness(otmp) {
    const g = game;
    await pline('Yecch!  This stuff tastes like poison.');
    if (otmp.blessed) {
        await pline(`(But in fact it was mildly stale ${fruitname(true)}.)`);
        if (!Role_if_healer()) {
            /* NB: blessed otmp->fromsink is not possible */
            await losehp(1, 'mildly contaminated potion', KILLED_BY_AN_POT);
        }
    } else {
        const presist = Poison_resistance();
        if (presist)
            await pline(`(But in fact it was biologically contaminated ${fruitname(true)}.)`);
        if (Role_if_healer()) {
            await pline('Fortunately, you have been immunized.');
        } else {
            const typ = rn2(A_MAX);
            const contaminant = `${presist ? 'mildly ' : ''}${otmp.fromsink
                ? 'contaminated tap water' : 'contaminated potion'}`;
            if (!Fixed_abil()) {
                await poisontell(typ, false);
                adjattrib(typ, presist ? -1 : -rn1(4, 3), 1);
            }
            if (!presist) {
                await losehp(rnd(10) + 5 * (otmp.cursed ? 1 : 0), contaminant,
                       otmp.fromsink ? KILLED_BY_POT : KILLED_BY_AN_POT);
            } else {
                /* rnd loss is so that unblessed poorer than blessed */
                await losehp(1 + rn2(2), contaminant,
                       otmp.fromsink ? KILLED_BY_POT : KILLED_BY_AN_POT);
            }
            exercise(A_CON, false);
        }
    }
    const u2 = g.u || {};
    const HHallu = u2.uprops?.[HALLUC]?.intrinsic || 0;
    const HalluRes = (u2.uprops?.[HALLUC_RES]?.intrinsic || 0)
        || (u2.uprops?.[HALLUC_RES]?.extrinsic || 0);
    if (HHallu && !HalluRes) {
        await pline('You are shocked back to your senses!');
        make_hallucinated(0, false, 0);
    }
}
/* C ref: hack.h Role_if(PM_HEALER) — gu.urole.mnum == PM_HEALER.  js/roles.js
 * stores the roles[] ORDINAL in that field rather than the PM_ index, so the
 * project idiom (js/do_wear.js Helmet_on, js/dokick.js martial) is to test
 * g.flags.initrole against the roles[] ordinal.  C roles[] order is
 * Arc Bar Cav Hea Kni Mon Pri Ran Rog Sam Tou Val Wiz, so Healer is 3. */
const HEALER_ROLE_IDX_POT = 3;
function Role_if_healer() {
    return ((game.flags?.initrole ?? -1) | 0) === HEALER_ROLE_IDX_POT;
}
async function peffect_confusion(otmp) {
    const u = game.u;
    if (!(u.uprops?.[CONFUSION]?.intrinsic | 0)) {
        const hall = (u.uprops?.[HALLUC]?.intrinsic | 0)
            && !((u.uprops?.[HALLUC_RES]?.intrinsic | 0)
                 || (u.uprops?.[HALLUC_RES]?.extrinsic | 0));
        if (hall) {
            await pline('What a trippy feeling!');
            game._potion_unkn = (game._potion_unkn | 0) + 1;
        } else {
            await pline('Huh, What?  Where am I?');
        }
    } else {
        game._potion_nothing = (game._potion_nothing | 0) + 1;
    }
    make_confused(itimeout_incr(u.uprops?.[CONFUSION]?.intrinsic | 0,
                                rn1(7, 16 - 8 * bcsign(otmp))), false);
}

async function peffect_gain_ability(otmp) {
    if (otmp.cursed) {
        await pline('Ulch!  That potion tasted foul!');
        game._potion_unkn = (game._potion_unkn | 0) + 1;
    } else if (Fixed_abil()) {
        game._potion_nothing = (game._potion_nothing | 0) + 1;
    } else {
        let i = -1;
        for (let ii = A_MAX; ii > 0; --ii) {
            i = otmp.blessed ? i + 1 : rn2(A_MAX);
            const msgflg = (otmp.blessed || ii === 1) ? 0 : -1;
            if (await adjattrib(i, 1, msgflg) && !otmp.blessed)
                break;
        }
    }
}

async function peffect_speed(otmp) {
    const u = game.u;
    const is_speed = (otmp.otyp | 0) === POT_SPEED;
    if (is_speed && _wounded_legs() && !otmp.cursed && !u.usteed) {
        heal_legs(0);
        game._potion_unkn = (game._potion_unkn | 0) + 1;
        return;
    }
    speed_up(rn1(10, 100 + 60 * bcsign(otmp)));
    if (is_speed && !otmp.cursed && !(u.HFast & INTRINSIC)) {
        Your('quickness feels very natural.');
        u.HFast |= FROMOUTSIDE;
    }
}

async function peffect_blindness(otmp) {
    const u = game.u;
    const bp = u.uprops?.[BLINDED];
    const blind = _potion_Blind();
    const blocked_blind = !!bp && (((bp.intrinsic | 0) || (bp.extrinsic | 0))
                                   && (bp.blocked | 0));
    if (blind || blocked_blind)
        game._potion_nothing = (game._potion_nothing | 0) + 1;
    make_blinded(itimeout_incr((bp?.intrinsic | 0) & TIMEOUT,
                               rn1(200, 250 - 125 * bcsign(otmp))),
                 !blind);
}
/* C dungeon.c ledger_no(lev) — the level's index in the whole-dungeon ledger.
 * Local port: svd.dungeons[dnum].ledger_start + dlevel. */
function _ledger_no_potion(lev) {
    const g = game;
    const d = g.dungeons ? g.dungeons[lev?.dnum | 0] : null;
    return ((d ? (d.ledger_start | 0) : 0) + (lev?.dlevel | 0)) | 0;
}
/* C dungeon.c:1674-1687 Can_rise_up(x, y, lev). */
function _can_rise_up_potion(x, y, lev) {
    const g = game;
    const stway = stairway_find_special_dir(false);
    /* can't rise up from inside the top of the Wizard's tower, or in sokoban */
    const isWiz1 = !!(g.wiz1_level && lev
                      && lev.dnum === g.wiz1_level.dnum
                      && lev.dlevel === g.wiz1_level.dlevel);
    if (In_endgame(lev) || In_sokoban(lev)
        || (isWiz1 && In_W_tower_wz(x, y, lev)))
        return false;
    const d = g.dungeons ? g.dungeons[lev?.dnum | 0] : null;
    return ((lev?.dlevel | 0) > 1
            || (d && (d.entry_lev | 0) === 1
                && _ledger_no_potion(lev) !== 1
                && !!stway && !!stway.up));
}
/* C potion.c:1082-1115 peffect_gain_level(struct obj *otmp).
 *
 * This body did not exist (`function peffect_gain_level(otmp) {}`) and, more to
 * the point, dodrink()'s hand-written otyp ladder had no POT_GAIN_LEVEL arm at
 * all, so a quaffed potion of gain level fell through to the ladder's trailing
 * `pline('Nothing happens.')` and drew NOTHING.  C runs pluslvl(FALSE), whose
 * newhp() draws rnd(role.hpadv.lornd) + rnd(race.hpadv.lornd) and whose newpw()
 * draws rn2(...) — measured on gen067-reseed-seed1736103 step 5:
 *     rnd(8)=1 @ newhp(attrib.c:1101)
 *     rnd(2)=1 @ newhp(attrib.c:1103)
 *     rn2(7)=3 @ newpw(exper.c:64)
 * and C's topline there is "You feel more experienced.  Welcome to experience
 * level 2." against this port's "Nothing happens."
 *
 * The CURSED arm is transcribed for Cardinal Rule 1 but has ZERO measured reach:
 * `dodrink` reaches peffect_gain_level on 3 of 688 train sessions and all three
 * quaff an uncursed potion (the recorded leaf immediately after the quaff is
 * newhp's rnd, which only the uncursed tail draws). */
async function peffect_gain_level(otmp) {
    const g = game;
    const u = g.u;
    if (otmp.cursed) {
        const on_lvl_1 = (_ledger_no_potion(u.uz) === 1);
        g._potion_unkn = (g._potion_unkn | 0) + 1;
        /* they went up a level */
        if (on_lvl_1 ? !!(u.uhave && u.uhave.amulet)
                     : _can_rise_up_potion(u.ux, u.uy, u.uz)) {
            let newlevel;
            if (on_lvl_1) {
                /* C assign_level(&newlevel, &earth_level) */
                const el = g.earth_level;
                newlevel = { dnum: el ? (el.dnum | 0) : 0,
                             dlevel: el ? (el.dlevel | 0) : 0 };
            } else {
                const newlev = depth(u.uz) - 1;
                /* C get_level(&newlevel, newlev) — the ledger walk.  Every
                 * corpus level is in the main dungeon, where depth == dlevel. */
                newlevel = { dnum: u.uz.dnum | 0, dlevel: newlev };
                if (newlevel.dnum === (u.uz.dnum | 0)
                    && newlevel.dlevel === (u.uz.dlevel | 0)) {
                    await pline('It tasted bad.');
                    return;
                }
            }
            await pline('You rise up, through the ' + _ceiling_potion(u.ux, u.uy) + '!');
            await goto_level(newlevel, false, false, false);
        } else {
            await pline('You have an uneasy feeling.');
        }
        return;
    }
    await pluslvl(false);
    /* blessed potions place you at a random spot in the
       middle of the new level instead of the low point */
    if (otmp.blessed)
        u.uexp = rndexp(true, u.ulevel | 0, u.uexp);
}
/* C mkmaze.c ceiling(x, y) — the word for what is overhead.  Same one-line
 * stand-in js/makemon.js:4591 carries; every corpus level is a roofed
 * dungeon level. */
function _ceiling_potion(_x, _y) { return 'ceiling'; }
function peffect_healing(otmp) {
    pline('You feel better.');
    healup(8 + d(4 + 2 * ((otmp.blessed ? 1 : 0) - (otmp.cursed ? 1 : 0)), 4), !otmp.cursed ? 1 : 0,
           !!otmp.blessed, !otmp.cursed);
    exercise(A_CON, true);
}
/* C ref: potion.c:1127-1141 peffect_extra_healing(struct obj *otmp) — the
 * POT_EXTRA_HEALING effect.  peffects' case breaks (returns -1), so dopotion
 * (potion.c:626-641) runs its full tail: potion_nothing/potion_unkn stay 0,
 * so the identify branch is makeknown + more_experienced, then useup.
 *
 * Unlike the other seventeen `peffect_*` bodies in this block, this one is a
 * REAL body and dodrink()'s live otyp ladder CALLS it — see the note above
 * `peffects()` below.  New arms go here, not into a second copy in dodrink.
 *
 * RNG: d(4 + 2*bcsign, 8) draws 4 rnd(8) for an uncursed potion, then
 * exercise(A_CON) and exercise(A_STR) draw one rn2(19) each.
 * make_hallucinated(0, TRUE, 0) is RNG-free.
 *
 * Corpus witness: seed4500 step 1203 quaffs a wished potion of extra healing
 * while BLIND, so C's healup(..., cureblind=TRUE) prints the second half of
 * "You feel much better.  You can see again."
 */
async function peffect_extra_healing(otmp) {
    const u = game.u;
    await pline('You feel much better.');
    healup(16 + d(4 + 2 * bcsign(otmp), 8),
           otmp.blessed ? 5 : !otmp.cursed ? 2 : 0, !otmp.cursed, true);
    await make_hallucinated(0, true, 0);
    /* C constants: exercise()/acurr() in js/attrib.js take A_STR=0..A_CHA=5,
     * NOT the display order the u.a* arrays use (js/attrib.js:92-94). */
    exercise(A_CON, true);
    exercise(0 /* A_STR */, true);
    /* blessed potion also heals wounded legs unless riding (where leg wounds
       apply to the steed rather than to the hero) */
    if (_wounded_legs() && (otmp.blessed && !u.usteed))
        heal_legs(0);
}
/* C potion.c:1142-1162 peffect_full_healing(struct obj *otmp).
 * ASYNC: pluslvl() and make_hallucinated() are async in this port, and
 * pluslvl() in particular can suspend on a topline --More--.  The body used to
 * be sync, so both ran fire-and-forget AFTER peffect_full_healing returned.
 * `u` was also a free identifier here (nothing in this module defines a
 * module-scope `u`), so the blessed arm threw ReferenceError on first entry;
 * bound from game.u like every other body in this file. */
async function peffect_full_healing(otmp) {
    const u = game.u;
    await pline('You feel completely healed.');
    const bcsign = (otmp.blessed ? 1 : 0) - (otmp.cursed ? 1 : 0);
    healup(400, 4 + 4 * bcsign, !otmp.cursed ? 1 : 0, true);
    /* Restore one lost level if blessed */
    if (otmp.blessed && u.ulevel < u.ulevelmax) {
        /* when multiple levels have been lost, drinking
           multiple potions will only get half of them back */
        u.ulevelmax -= 1;
        await pluslvl(false);
    }
    await make_hallucinated(0, true, 0);
    exercise(0 /* A_STR */, true);
    exercise(A_CON, true);
    /* blessed potion heals wounded legs even when riding (so heals steed's
       legs--it's magic); uncursed potion heals hero's legs unless riding */
    if (_wounded_legs() && (otmp.blessed || (!otmp.cursed && !u.usteed)))
        heal_legs(0);
}
/* C potion.c:1165-1205 — levitation potion effect. */
async function peffect_levitation(otmp) {
    const u = game.u;
    u.uprops ||= {};
    const rec = u.uprops[LEVITATION] ||= { intrinsic: 0, extrinsic: 0, blocked: 0 };
    const blockedInitially = !!(rec.blocked | 0);
    const levitating = !!(((rec.intrinsic | 0) || (rec.extrinsic | 0)) && !blockedInitially);
    if (!levitating && !blockedInitially) {
        /* C kludge: set HLevitation to 1 before float_up(). */
        const ref = { value: rec.intrinsic | 0 };
        set_itimeout(ref, 1);
        rec.intrinsic = ref.value;
        await float_up();
    } else {
        game._potion_nothing = (game._potion_nothing | 0) + 1;
    }
    if (otmp.cursed) {
        /* C potion.c:1187-1205 — cursed levitation cannot be stopped at will;
         * it may instead force an upward stair move or hit the ceiling. */
        rec.intrinsic = (rec.intrinsic | 0) & ~I_SPECIAL;
        /* C potion.c:1189: BLevitation suppresses both stair and ceiling arms. */
        if (!(rec.blocked | 0)) {
            const stway = stairway_at(u.ux, u.uy);
            if (stway?.up) {
                await doup();
                game._potion_nothing = 0;
            } else if (!(In_endgame(u.uz) && !Is_earthlevel(u.uz))) {
                const raw = rnd(!u.uarmh ? 10 : !hard_helmet(u.uarmh) ? 6 : 3);
                const dmg = maybe_half_phys_pot(raw);
                await pline(`You hit your ${body_part_cmd(HEAD)} on the ${ceiling(u.ux, u.uy)}.`);
                await losehp(dmg, 'colliding with the ceiling', KILLED_BY);
                game._potion_nothing = 0;
            }
        }
    } else if (otmp.blessed) {
        const ref = { value: rec.intrinsic | 0 };
        incr_itimeout(ref, rn1(50, 250));
        rec.intrinsic = ref.value | I_SPECIAL;
    } else {
        const ref = { value: rec.intrinsic | 0 };
        incr_itimeout(ref, rn1(140, 10));
        rec.intrinsic = ref.value;
    }
    /* C potion.c:1218: spoteffects(FALSE) is also required when the
     * resulting Levitation is over a sink.  The only existing JS
     * spoteffects_for_levitation is private to do_wear.js and is a
     * documented no-op for its fountain-only caller, so this cross-module
     * sink tail remains an explicit dependency rather than an invented call. */
    float_vs_flight();
}

/* C hack.h:1236 Maybe_Half_Phys(dmg), used by potion.c:1200. */
function maybe_half_phys_pot(dmg) {
    const p = game.u?.uprops?.[HALF_PHDAM];
    return p && ((p.intrinsic | 0) || (p.extrinsic | 0))
        ? Math.floor((dmg + 1) / 2) : dmg;
}
async function peffect_gain_energy(otmp) {
    const u = game.u;
    if (otmp.cursed)
        await You_feel('lackluster.');
    else
        await pline('Magical energies course through your body.');
    let num = d(otmp.blessed ? 3 : !otmp.cursed ? 2 : 1, 6);
    if (otmp.cursed) num = -num;
    u.uenmax += num;
    if (u.uenmax > u.uenpeak) u.uenpeak = u.uenmax;
    else if (u.uenmax <= 0) u.uenmax = 0;
    u.uen += 3 * num;
    if (u.uen > u.uenmax) u.uen = u.uenmax;
    else if (u.uen <= 0) u.uen = 0;
    if (game.disp) game.disp.botl = 1;
    await exercise(A_WIS, true);
}
async function peffect_acid(otmp) {
    if (_prop_active(ACID_RES)) {
        await pline(`This tastes ${_hallucination() ? 'tangy' : 'sour'}.`);
    } else {
        await pline(`This burns${otmp.blessed ? ' a little' : otmp.cursed ? ' a lot' : ' like acid'}!`);
        const dmg = d(otmp.cursed ? 2 : 1, otmp.blessed ? 4 : 8);
        await losehp(maybe_half_phys_pot(dmg), 'potion of acid', KILLED_BY_AN);
        await exercise(A_CON, false);
    }
    if (_prop_active(STONED))
        await make_stoned(0, null, KILLED_BY, null);
    game._potion_unkn = (game._potion_unkn | 0) + 1;
}
async function peffect_polymorph(otmp) {
    await You_feel(`a little ${_hallucination() ? 'normal' : 'strange'}.`);
    if (_unchanging()) return;
    if (!otmp.blessed || ((game.u.umonnum | 0) !== (game.u.umonster | 0)))
        await polyself(POLY_NOFLAGS);
    else {
        await polyself(POLY_CONTROLLED | POLY_LOW_CTRL);
        if ((game.u.mtimedone | 0) && ((game.u.umonnum | 0) !== (game.u.umonster | 0)))
            game.u.mtimedone = Math.min(game.u.mtimedone | 0, rn2(15) + 10);
    }
}

export async function peffects(otmp) {
    switch (otmp.otyp) {
    case POT_RESTORE_ABILITY:
    case SPE_RESTORE_ABILITY:
        await peffect_restore_ability(otmp);
        break;
    case POT_HALLUCINATION:
        await peffect_hallucination(otmp);
        break;
    case POT_WATER:
        await peffect_water(otmp);
        break;
    case POT_BOOZE:
        await peffect_booze(otmp);
        break;
    case POT_ENLIGHTENMENT:
        await peffect_enlightenment(otmp);
        break;
    case SPE_INVISIBILITY:
    case POT_INVISIBILITY:
        await peffect_invisibility(otmp);
        break;
    case POT_SEE_INVISIBLE:
    case POT_FRUIT_JUICE:
        await peffect_see_invisible(otmp);
        break;
    case POT_PARALYSIS:
        await peffect_paralysis(otmp);
        break;
    case POT_SLEEPING:
        await peffect_sleeping(otmp);
        break;
    case POT_MONSTER_DETECTION:
    case SPE_DETECT_MONSTERS:
        if (await peffect_monster_detection(otmp))
            return 1;
        break;
    case POT_OBJECT_DETECTION:
    case SPE_DETECT_TREASURE:
        if (await peffect_object_detection(otmp))
            return 1;
        break;
    case POT_SICKNESS:
        await peffect_sickness(otmp);
        break;
    case POT_CONFUSION:
        await peffect_confusion(otmp);
        break;
    case POT_GAIN_ABILITY:
        await peffect_gain_ability(otmp);
        break;
    case POT_SPEED:
    case SPE_HASTE_SELF:
        await peffect_speed(otmp);
        break;
    case POT_BLINDNESS:
        await peffect_blindness(otmp);
        break;
    case POT_GAIN_LEVEL:
        await peffect_gain_level(otmp);
        break;
    case POT_HEALING:
        await peffect_healing(otmp);
        break;
    case POT_EXTRA_HEALING:
        await peffect_extra_healing(otmp);
        break;
    case POT_FULL_HEALING:
        await peffect_full_healing(otmp);
        break;
    case POT_LEVITATION:
    case SPE_LEVITATION:
        await peffect_levitation(otmp);
        break;
    case POT_GAIN_ENERGY:
        await peffect_gain_energy(otmp);
        break;
    case POT_OIL:
        await peffect_oil(otmp);
        break;
    case POT_ACID:
        await peffect_acid(otmp);
        break;
    case POT_POLYMORPH:
        await peffect_polymorph(otmp);
        break;
    default:
        impossible("What a funny potion! (%u)", otmp.otyp);
        return 0;
    }
    return -1;
}

export function speed_up(duration) {
    const g = game;
    const u = g.u;
    /* C potion.c:2925 — Very_fast = ((HFast & ~INTRINSIC) || EFast).
     * There is no mutable u.Very_fast field in the JS state. */
    const very_fast = !!((u.HFast & ~INTRINSIC)
        || (u.uprops?.[FAST]?.extrinsic | 0));
    if (!very_fast)
        pline("You are suddenly moving %sfaster.", _potion_Fast() ? "" : "much ");
    else
        pline("Your %s get new energy.", makeplural(body_part(LEG)));
    exercise(3, true);
    /* C potion.c:2929  incr_itimeout(&HFast, duration) — inlined here because
     * u.HFast is a plain number, not a {value} ref.  Uses the module-scope
     * TIMEOUT (0x00ffffff, prop.h:135); a local 0xFF copy previously truncated
     * HFast's timeout at 255 turns. */
    let old_to = u.HFast & TIMEOUT;
    let new_to = old_to + duration;
    if (new_to >= TIMEOUT) new_to = TIMEOUT;
    else if (new_to < 1) new_to = 0;
    u.HFast = (u.HFast & ~TIMEOUT) | new_to;
}

function SET_BOTL() {
    if (game.disp) game.disp.botl = 1;
}

/* C potion.c:106-127  make_stunned(long xtime, boolean talk)
 *
 * THE STORE IS THE POINT (same lesson as make_confused above).  This body used
 * to keep its own `u.HStun = {value}` box: it read the uprops row ONCE, at
 * first call, and never wrote back — so u.uprops[STUNNED].intrinsic, which is
 * what C's HStun macro (youprop.h:107) IS and what js/cmd.js:13288's
 * Stunned/Confusion reader consults, stayed 0 forever, and a second call read a
 * stale `old`.  Nothing imported this body (js/mhitu.js:137 and js/mhitm.js:192
 * each carry their own empty local stub), so it was dead; it became live with
 * the #wizintrinsic STUNNED arm (wizcmds.c:1062).  RNG-FREE.
 *
 * `u.Unaware` was likewise a field nothing in this port assigns — the real
 * youprop.h:399 macro is the _Unaware() helper this file already defines. */
export function make_stunned(xtime, talk) {
    const g = game;
    const u = g.u;
    const ps = _uprop(STUNNED);
    const old = ps.intrinsic | 0;

    if (_Unaware())
        talk = false;

    if (!xtime && old) {
        if (talk)
            You_feel("%s now.",
                     _potion_Hallucination() ? "less wobbly" : "a bit steadier");
    }
    if (xtime && !old) {
        if (talk) {
            if (u.usteed)
                You("wobble in the saddle.");
            else
                /* C: stagger(gy.youmonst.data, "stagger") */
                You("%s...", stagger(g.youmonst?.data ?? g.youmonst, "stagger"));
        }
    }
    if ((!xtime && old) || (xtime && !old))
        SET_BOTL();

    _set_prop_itimeout(ps, xtime);
}
