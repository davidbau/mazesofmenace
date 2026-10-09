// @ts-nocheck
import { credit_report } from './shk_credit.js';
// dokick.js — Kicking non-door terrain handler.
// C ref: nethack-c/src/dokick.c:972-1253 kick_nondoor()
//        nethack-c/src/dokick.c:863-878 kick_dumb()
//        nethack-c/src/dokick.c:880-906 kick_ouch()
//
// W cadence-1: port kick_nondoor (22 RNG sites) preserving C RNG ordering.
// RNG sites depend on terrain type and Luck/state; all inline rn2/rnd/rn1/rnl calls
// mirror C's exact call ordering.
import { game } from './gstate.js';
import { abuse_dog } from './dog.js';
import { Is_juiblex_level as Is_juiblex_level_real } from './const.js';
import { rn2, rnd, rn1, rnl } from './rng.js';
import { pline, newsym, You_hear, flush_pending_messages, canseemon } from './display.js';
function strchr(str, ch) {
    if (str == null) return false;
    const want = typeof ch === 'number' ? ch : String(ch);
    if (typeof str !== 'string') return Array.from(str).includes(ch);
    return Array.from(str).some(c => c === String(want)
        || (typeof want === 'number' && c.charCodeAt(0) === want));
}
/* `cansee` was used by ship_object (dokick.c:1099 `if (cansee(x, y))
 * otransit_msg(...)`) but never imported, so the first monster whose thrown
 * object shipped off the level killed the run with a ReferenceError. */
import { recalc_block_point, unblock_point, cansee } from './vision.js';
import { exercise, acurr, change_luck } from './attrib.js';
import { HALLUC, SHOPBASE, SDOOR, SCORR, CORR, ROOM, STAIRS, LADDER, IRONBARS, DOOR, D_NODOOR, D_ISOPEN, D_BROKEN, D_TRAPPED, D_LOCKED, IS_THRONE, IS_ALTAR, IS_FOUNTAIN, IS_GRAVE, IS_SINK, IS_TREE, IS_STWALL, IS_DOOR, ECMD_TIME, ECMD_CANCEL, ECMD_OK, POOL, MOAT, WATER, DRAWBRIDGE_UP, DRAWBRIDGE_DOWN, LAVAPOOL, LAVAWALL, DBWALL, A_STR, A_DEX, A_CON, A_WIS, A_LAWFUL, KILLED_BY, G_GONE, T_LOOTED, TREE_LOOTED, TREE_SWARM, S_LPUDDING, S_LDWASHER, LA_DOWN, MM_NOMSG, MM_MALE, MM_FEMALE, MM_ANGRY, DB_UNDER, DB_ICE, DB_LAVA, DB_MOAT, STONE, ICE, IS_WATERWALL, IS_DRAWBRIDGE, IS_WALL, W_NONDIGGABLE, isok, DB_DIR, DB_WEST, DB_EAST, DB_SOUTH, DB_NORTH, NON_PM, MIGR_NOWHERE, MIGR_RANDOM, MIGR_APPROX_XY, MIGR_EXACT_XY, MIGR_STAIRS_UP, MIGR_STAIRS_DOWN, MIGR_LADDER_UP, MIGR_LADDER_DOWN, MIGR_SSTAIRS, MIGR_PORTAL, MIGR_WITH_HERO, MIGR_NOBREAK, MIGR_NOSCATTER, MIGR_TO_SPECIES, ONAME, has_oname, has_mgivenname, In_mines, Is_stronghold, In_endgame, Is_botlevel, Has_contents, N_DIRS, xdir, ydir,
is_hole, } from './const.js';
/* prop.h BLINDED — the live key for the Blind macro (see _Blind_dk below). */
import { BLINDED as DK_BLINDED } from './const.js';
/* prop.h LEVITATION, rm.h IS_OBSTRUCTED, and the youprop.h Is_airlevel(uz)
 * macro — needed by dokick.c:1354's bracing check (see Levitation_dk below). */
import { LEVITATION as LEVITATION_PROP_DK, IS_OBSTRUCTED, Is_airlevel } from './const.js';
import { TELEPORT, SEE_INVIS, POISON_RES, COLD_RES, SHOCK_RES, FIRE_RES,
         SLEEP_RES, DISINT_RES, TELEPORT_CONTROL, STEALTH, FAST, INVIS,
         INTRINSIC, DEAF } from './const.js';
import { OC_COST } from './oc_cost_data.js';
import { PM_SOLDIER, PM_SERGEANT, PM_LIEUTENANT, PM_CAPTAIN } from './pm.generated.js';
import { wakeup } from './mhitm.js';
import { finish_meating } from './dogmove.js';
import { verbalize } from './cmd.js';
import { money_cnt } from './com_pager.js';
import { hidden_gold } from './vault.js';
import { miss } from './zap.js';
import { mhis_mon } from './mhitu.js';
import { PM_KILLER_BEE, PM_BLACK_PUDDING, PM_ARCHEOLOGIST, PM_SAMURAI, PM_WIZARD, PM_VALKYRIE, PM_ELF, } from './pm.generated.js';
/* decl.h:17 NH_BLACK = c_color_names.c_black = "black" (a color-name string,
 * not the CLR_BLACK terminal-attribute int) — the SINK arm's C call
 * hcolor(NH_BLACK) is just hcolor("black").  hcolor() is the one
 * js/mhitm.js body (do_name.c host); PM_AMOROUS_DEMON is not in
 * pm.generated.js (a 3.7-vs-5.0 role-swap name, see js/mhitu.js's own
 * PM_AMOROUS_DEMON_MU local const for the identical reason) so it is a local
 * constant here too, matching mnum 290 used consistently elsewhere in js/. */
import { hcolor, You } from './mhitm.js';
const PM_AMOROUS_DEMON_DK = 290;
import { m_at, do_attack, overexertion } from './uhitm.js';
import { wipe_engr_at, maybe_unhide_at, place_object, makemon, mkgold, wake_nearto } from './mklev.js';
import { stackobj } from './sp_lev.js';
import { newmextra } from './makemon.js';
import { book_disappears as spell_book_disappears } from './spell.js';
/* C mkobj.c:458-503 splitobj(obj, num) — the one body lives in js/makemon.js
 * (this repo's mkobj.c splitobj/nextoid host); scatter()'s object-stack
 * splitting loop needs it. */
import { splitobj, attacktype_fordmg } from './makemon.js';
/* C mon.c:3997 maybe_mnexto() and mon.c noteleport_level() — kick_monster's
 * dodge arm (dokick.c:268-283). */
import { maybe_mnexto } from './teleport.js';
import { set_apparxy } from './monmove.js';
import { m_in_out_region } from './region.js';
import { noteleport_level } from './makemon.js';
import { permonstTemplate, monflee } from './makemon.js';
import { enexto_out } from './teleport.js';
// C shk.c:1166 is_unpaid() — the ONE implementation lives in js/shk.js, which
// is this repo's shk.c host module and the module the auto-generated replay
// used to carry a second, throwing copy of the name, which made the local call
// at dokick.js:937 (ship_object's `unpaid` test) throw at runtime; re-exported
// rather than re-implemented so there is no second body to drift.
import { obfree, is_unpaid, in_rooms, shop_keeper, add_damage, pay_for_damage, oid_price_adjustment, costly_spot as shk_costly_spot, Shknam as shk_Shknam, hot_pursuit as shk_hot_pursuit, billable, get_cost, get_pricing_units, onbill, addtobill as shk_addtobill, delete_contents as shk_delete_contents, add_to_billobjs } from './shk.js';
import { stairway_at } from './mklev.js';
import { remove_worn_item, rloco } from './steal.js';
import { ismnum } from './const.js';
import { MKOBJ_OC_MATERIAL } from './mkobj_erosion_meta.js';
/* C dokick.c:1912-1935 otransit_msg's namers.  Imported by name from
 * js/objnam.js (this repo's objnam.c host module) rather than re-spelled here:
 * js/sit.js also exports a `Tobjnam` that returns the literal "It", and a
 * file-local copy of any of these would shadow the real body the same way the
 * rndorcname stub below used to. */
import { Tobjnam, corpse_xname, otense, CXN_PFX_THE } from './objnam.js';
/* objects.h FOOD() CORPSE -- the otyp corpse_xname()/cxname() switch on. */
const CORPSE_DK = 265;
import { dealloc_obj, add_to_minv } from './mklev.js';
import { food_disappears } from './eat.js';
import { t_at } from './trap.js';
import { deadhero, do_death_sequence } from './end.js';
import { set_wounded_legs, ok_to_quest, breaktest, breakmsg, breakobj, altar_wrath, _delobj_useupf as delobj_core, currency as cmd_currency, snuff_candle, thitmonst } from './cmd.js';
import { hurtle, showdamage, body_part } from './cmd.js';
import { RIGHT_SIDE } from './const.js';
import { UNCHANGING } from './const.js';
import { rehumanize } from './polyself.js';
import { end_running } from './look.js';
/* ── the monster-kick arm's dependencies (see maybe_kick_monster below) ── */
import { FUMBLING, W_ARMF, P_NONE, P_MARTIAL_ARTS, NATTK,
         ARTICLE_A, SUPPRESS_SADDLE, M_AP_TYPE, Upolyd } from './const.js';
import { PM_SHADE } from './pm.generated.js';
import { canspotmon, map_invisible, unmap_invisible, glyph_is_invisible_at } from './display.js';
import { attack_checks, mon_nam, special_dmgval, use_skill } from './uhitm.js';
import { passive, killed, seemimic, check_caitiff, x_monnam, wakeup_attack } from './mhitm.js';
/* rndorcname — the one real port (do_name.c:1538-1555); replaces the local
 * no-RNG stub that used to shadow it.  See the note above christen_orc(). */
import { rndorcname } from './mhitm.js';
/* The two mkobj.c migration constructors; see the re-export note further down. */
import { add_to_migration, mksobj_migr_to_species, stairway_find_from as stairway_find_from_real } from './mklev.js';
import { setmangry, angry_guards as mklev_angry_guards } from './mklev.js';
import { weight_cap, inv_weight, weight } from './weight.js';
import { goodpos, chest_trap, activate_statue_trap, mintrap } from './trap.js';
import { closed_door } from './look.js';
import { hero_breaks, find_trap, impact_disturbs_zombies } from './cmd.js';
import { breakchestlock } from './lock.js';
import { find_objowner } from './shk.js';
import { doname, singular } from './objnam.js';
import { LEG, TT_PIT, is_pit, WEB, STATUE_TRAP, ZAP_POS } from './const.js';
import { obj_resists } from './zap.js';
import { useup } from './cmd.js';
export { is_unpaid, in_rooms, shop_keeper };
import { mksobj_at, mksobj, mpickobj, obj_extract_self } from './mklev.js';
/* C mkobj.c:1977-1987 rnd_treefruit_at(x, y) — the one real body lives in
 * js/dig.js (a monster-digs-near-a-tree caller already exercises it), which
 * used to keep it file-local; exported there rather than re-derived here so
 * there is only one ROLL_FROM(treefruits) draw site in the tree. */
import { rnd_treefruit_at, unpunish, cvt_sdoor_to_door } from './dig.js';
import { feel_newsym } from './display.js';
import { flooreffects } from './cmd.js';
/* Historical alias, identical to the shared mkobj extraction above. */
import { obj_extract_self_general } from './cmd.js';
/* C mthrowu.c:325-431 ohitmon(mtmp, otmp, range, verbose) — thrown/scattered
 * object hits a MONSTER.  The one body lives in js/mhitu.js. */
import { ohitmon } from './mhitu.js';
/* C mthrowu.c:74-146 thitu(tlev, dam, objp, name) — thrown/scattered object
 * hits the HERO.  The one body lives in js/trap.js (ported for the dart/arrow
 * trap-missile call sites; its own note says the general "plain hit" tail it
 * implements is exactly what a non-acid/non-stone/non-potion/non-silver
 * scattered object (a tree fruit) takes too). */
import { thitu, fall_through } from './trap.js';
/* C weapon.c:262-... dmgval(otmp, mon) — the one body lives in js/uhitm.js. */
import { dmgval } from './uhitm.js';
/* C objnam.c xname(obj) / An(str) — the one bodies live in js/objnam.js;
 * js/shk.js's own `xname` is a wrong twin (xname_flags_shk with a different
 * arg), so import by explicit path rather than trust an ambient name. */
import { xname, An } from './objnam.js';
/* C objnam.c:347-408 distant_name(obj, func) / objnam.c:2233-2239 The(str).
 * distant_name is NOT optional sugar: on its far branch it brackets the
 * formatter call with ++gd.distantname / --gd.distantname (objnam.c:401-403),
 * which is the only thing that stops xname_flags's
 * `if (!Blind && !gd.distantname) observe_object(obj);` (objnam.c:627) from
 * setting obj->dknown on an object the hero only saw from across the room. */
import { distant_name, The } from './objnam.js';
/* C hack.h:1339-1344 scatter() scflags bits. */
import { MAY_HITMON, MAY_HITYOU, MAY_HIT, MAY_DESTROY, MAY_FRACTURE, VIS_EFFECTS } from './const.js';
/* C const.js u_at(x,y) — the hero-at-square predicate. */
import { u_at, HALF_PHDAM } from './const.js';
/* C mon.c hideunder(mtmp) — the one body lives in js/mklev.js. */
import { hideunder, shkname_halluc_pick } from './mklev.js';
/* C allmain.c nomul(nval) / stop_occupation() — the one bodies. */
import { nomul, stop_occupation } from './allmain.js';
export { ok_to_quest };
// C mon.c:4687 maybe_unhide_at() — the ONE implementation lives in js/mklev.js
// (this repo's mon.c host module, alongside hideunder/can_hide_under_obj).
// Re-exported here because js/makemon.js:45 imports the name from THIS module
// and js/makemon.js is outside this task's write scope; the local throwing stub
// it used to resolve to made js/makemon.js:3473 and js/dokick.js:967 both throw
// at runtime.
export { maybe_unhide_at };

/* C ref: hack.h:76 — cost of a destroyed shop door. */
const SHOP_DOOR_COST = 400;

/* C ref: dbridge.c:84-95 is_pool(x,y) — POOL/MOAT/WATER or is_moat(). */
function is_pool(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    const t = loc.typ | 0;
    return t === POOL || t === MOAT || t === WATER || is_moat(x, y);
}
function Is_juiblex_level(uz) { return Is_juiblex_level_real(uz); }
/* C ref: dbridge.c:99-114 is_moat(x,y) — MOAT or DRAWBRIDGE_UP over DB_MOAT,
   except on Juiblex level (always false there). */
export function is_moat(x, y) {
    if (!isok(x, y))
        return false;
    const loc = game.level.at(x, y);
    const ltyp = loc.typ | 0;
    if (!Is_juiblex_level(game.u.uz)
        && (ltyp === MOAT
            || (ltyp === DRAWBRIDGE_UP
                && ((loc.drawbridgemask | 0) & DB_UNDER) === DB_MOAT)))
        return true;
    return false;
}
/* C ref: dbridge.c:84-95 is_ice(x,y) — ICE, or DRAWBRIDGE_UP over DB_ICE.
 * Same host module and shape as is_moat above; needed by really_kick_object's
 * slide check (dokick.c:588). */
export function is_ice(x, y) {
    if (!isok(x, y))
        return false;
    const loc = game.level.at(x, y);
    const ltyp = loc.typ | 0;
    if (ltyp === ICE
        || (ltyp === DRAWBRIDGE_UP
            && ((loc.drawbridgemask | 0) & DB_UNDER) === DB_ICE))
        return true;
    return false;
}
/* C ref: mkobj.c svl.level.objects[x][y] — per-tile object chain head. */
function obj_at(x, y) {
    return (game.level?.levelObjects?.[x]?.[y]) ?? null;
}
/* C ref: youprop.h:240 Levitation = (HLevitation || ELevitation) && !BLevitation
 * — HLevitation/ELevitation/BLevitation = u.uprops[LEVITATION].{intrinsic,
 * extrinsic,blocked}.  Local to this file (see the "uprops has three
 * spellings, one live" lesson): reads the NUMERIC index directly, matching
 * do_wear.js's Levitation() live accessor. */
function Levitation_dk(u) {
    const p = u?.uprops?.[LEVITATION_PROP_DK];
    if (!p) return false;
    return !!((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0);
}
/* C ref: attrib.c:1235 acurrstr() — ACURR(A_STR) massaged to 3..25. */
export function acurrstr(u) {
    const str = acurr(u, A_STR) | 0;
    if (str <= 18) return Math.max(str, 3);
    if (str <= 121) return 19 + Math.trunc(str / 50);
    return Math.min(str, 125) - 100;
}

function martial() {
    const g = game;
    const u = g.u || {};
    const initrole = (g.flags?.initrole ?? -1) | 0;
    const martial_bonus = (initrole === 5 || initrole === 9); /* Monk || Samurai */
    /* uarmf->otyp == KICKING_BOOTS — uarmf otyp tracking present; KICKING_BOOTS
     * otyp constant not surfaced in const.js yet (WIRE_PENDING). */
    /* dokick.c:8-10 — uarmf && uarmf->otyp == KICKING_BOOTS */
    const boots = u.uarmf ?? null;
    return martial_bonus || !!(boots && (boots.otyp | 0) === _KM_KICKING_BOOTS);
}
/* C ref: dokick.c:863-878 kick_dumb(x, y) — no-leverage kick at empty space.
 * RNG: rn2(3) — maybe kick at empty space vs. strain a muscle.
 *      rnd(5)  — wounded legs duration if strained.
 *      rn2(2)  — hurtle direction (if Is_airlevel || Levitation). */
async function kick_dumb(x, y) {
    const g = game;
    const u = g.u || {};
    /* C: exercise(A_DEX, FALSE) — consumes rn2(2) (the AEXE decrement roll) */
    exercise(A_DEX, false);
    const dex = acurr(u, A_DEX) | 0;
    if (martial() || dex >= 16 || rn2(3)) {
        /* C: You("kick at empty space."); if (Blind) feel_location(x,y) — no RNG */
        void pline("You kick at empty space.");
    }
    else {
        /* Dumb move: strain a muscle */
        void pline("Dumb move!  You strain a muscle.");
        exercise(A_STR, false);
        /* C: set_wounded_legs(RIGHT_SIDE, 5 + rnd(5)) */
        set_wounded_legs(RIGHT_SIDE, 5 + rnd(5));
    }
    const airlevel = Is_airlevel(u.uz);
    const Levitation = Levitation_dk(u);
    if ((airlevel || Levitation) && rn2(2)) {
        await hurtle(-(u.dx | 0), -(u.dy | 0), 1, true);
    }
}
/* C ref: hack.c:4219 losehp(n, knam, k_format) — apply hit-point loss to the
 * current monster form or the hero's ordinary HP, then resolve rehumanization
 * or death before returning to the caller. */
export async function losehp(n, knam, k_format) {
    const u = game.u;
    if (!u)
        return;
    n |= 0;
    // C's preceding pline has completed update_topl/more before losehp starts.
    // Drain the port's queued pages while they still show the pre-damage HP.
    await flush_pending_messages();
    (game.disp ||= {}).botl = 1;
    end_running(true);
    if (Upolyd(u)) {
        u.mh = (u.mh | 0) - (n | 0);
        showdamage(n); /* C hack.c:4269 */
        if ((u.mhmax | 0) < (u.mh | 0)) u.mhmax = u.mh;
        if ((u.mh | 0) < 1) {
            await rehumanize();
        } else {
            const p = u.uprops?.[UNCHANGING];
            if ((n | 0) > 0 && (u.mh | 0) * 10 < (u.mhmax | 0)
                && ((p?.intrinsic | 0) || (p?.extrinsic | 0))) await maybe_wail();
        }
        return;
    }
    u.uhp = (u.uhp | 0) - (n | 0);
    showdamage(n); /* C hack.c:4280 */
    if ((u.uhp | 0) > (u.uhpmax | 0))
        u.uhpmax = u.uhp; /* perhaps n was negative */
    if ((u.uhp | 0) < 1) {
        /* C hack.c:4248-4250 writes svk.killer, which is the struct
         * formatkiller() (topten.c:172) reads for the tombstone and the score
         * line.  This wrote a DIFFERENT object, `game.killer`, that nothing
         * reads — so a hero killed by a falling rock or a thrown potion got an
         * empty killer name on the stone. */
        if (!game.svk) game.svk = {};
        if (!game.svk.killer)
            game.svk.killer = { id: 0, format: 0, name: '', next: null };
        game.svk.killer.format = k_format | 0;
        game.svk.killer.name = knam || '';
        /* Preserve hack.c:4287's source-specific urgent death line across the
         * port's deferred async death boundary. */
        deadhero(0 /* DIED */, { urgentDeathLine: true });
        await do_death_sequence({ inPlace: true });
    } else if ((n | 0) > 0 && (u.uhp | 0) * 10 < (u.uhpmax | 0)) {
        await maybe_wail();
    }
}

/* ══ C hack.c:4210-4241 maybe_wail() ═════════════════════════════════════════
 * The "you are nearly dead" warning, fired by losehp() once the hero drops
 * below a tenth of max HP.  RNG-FREE.
 *
 * gw.wailmsg is a global that throttles it to once per 50 moves; this port had
 * no such field, so it is introduced here under C's name on `game`.  The
 * powers[] list and the >= 4 threshold are C's, verbatim; the intrinsic test is
 * `u.uprops[powers[i]].intrinsic & INTRINSIC` (youprop.h), the same uprops
 * spelling js/ writes elsewhere (see the note in js/const.js). */
const _WAIL_POWERS = [TELEPORT, SEE_INVIS, POISON_RES, COLD_RES, SHOCK_RES,
                      FIRE_RES, SLEEP_RES, DISINT_RES, TELEPORT_CONTROL,
                      STEALTH, FAST, INVIS];
async function maybe_wail() {
    const g = game, u = g.u;
    /* C hack.c:4217-4220 */
    if ((g.moves | 0) <= ((g.wailmsg | 0) + 50))
        return;
    g.wailmsg = g.moves | 0;
    /* C you.h:240/290 Role_if/Race_if — gu.urole.mnum / gu.urace.mnum, the same
     * readers js/cmd.js:254 and js/cmd.js:11131 use. */
    const role = (g.urole && g.urole.mnum) | 0;
    const race = (g.urace && g.urace.mnum) | 0;
    const isWiz = role === PM_WIZARD, isValk = role === PM_VALKYRIE;
    if (isWiz || race === PM_ELF || isValk) {
        /* C hack.c:4221-4237 */
        const who = (isWiz || isValk) ? (g.urole?.name?.m ?? 'Wizard') : 'Elf';
        if ((u.uhp | 0) === 1) {
            await pline(`${who} is about to die.`);
        } else {
            let powercnt = 0;
            for (const pw of _WAIL_POWERS)
                if (((u.uprops?.[pw]?.intrinsic | 0) & INTRINSIC) !== 0)
                    ++powercnt;
            await pline(powercnt >= 4
                ? `${who}, all your powers will be lost...`
                : `${who}, your life force is running out.`);
        }
        return;
    }
    /* C hack.c:4238-4241 — You_hear(...), the whole call.  The guard and both
     * prefixes used to be hand-inlined here; the copy read u.uprops[DEAF] (a
     * slot nothing in js/ writes, so its guard could never fire) and hardcoded
     * `unaware = false` because "unconscious()/is_fainted() are not ported
     * here".  Both ARE ported and js/display.js's You_hear calls them. */
    const what = (u.uhp | 0) === 1 ? 'the wailing of the Banshee...'
                                   : 'the howling of the CwnAnnwn...';
    await You_hear(what);
}

/* C ref: dokick.c:880-906 kick_ouch(x, y, kickobjnam) — painful kick failure.
 * RNG: rn2(3)             — maybe set wounded legs.
 *      rnd(con>15 ? 3 : 5) — damage.
 *      rn1(2, 4)          — hurtle distance (only if Is_airlevel || Levitation). */
async function kick_ouch(x, y, kickobjnam) {
    const g = game;
    const u = g.u || {};
    /* C: pline("Ouch!  That hurts!"); exercise(A_DEX/STR FALSE) */
    void pline("Ouch!  That hurts!");
    exercise(A_DEX, false);
    exercise(A_STR, false);
    /* C: isok check, feel_location, is_drawbridge_wall, wake_nearto — no RNG */
    /* C: if (!rn2(3)) set_wounded_legs(RIGHT_SIDE, 5 + rnd(5)) */
    if (!rn2(3)) {
        set_wounded_legs(RIGHT_SIDE, 5 + rnd(5));
    }
    /* C: dmg = rnd(ACURR(A_CON) > 15 ? 3 : 5) */
    const con = acurr(u, A_CON) | 0;
    const dmg = rnd(con > 15 ? 3 : 5); /* consume RNG */
    await losehp(dmg, "kicking something", KILLED_BY);
    /* C: if (Is_airlevel || Levitation) hurtle(-u.dx, -u.dy, rn1(2,4), TRUE)
     * Levitation now reads the real uprop (Levitation_dk, dokick.js:153) —
     * see kick_dumb's identical fix above (import-note "CHECKED, NOT
     * ASSUMED").  kick_door's own Levitation arm (dokick.c:920-924, "not
     * enough leverage to kick open doors while levitating") routes straight
     * here, so any levitating door-kick with the door actually CLOSED/LOCKED
     * (not this board's D_NODOOR doorways, which go to kick_dumb instead)
     * would land on this call. */
    const airlevel = Is_airlevel(u.uz);
    const Levitation = Levitation_dk(u);
    if (airlevel || Levitation) {
        const range = rn1(2, 4);
        await hurtle(-(u.dx | 0), -(u.dy | 0), range, true);
    }
}
/* C ref: dokick.c:972-1253 kick_nondoor(x, y, avrg_attrib)
 * 22 RNG sites across all branches; mirrors C control flow exactly. */
export async function kick_nondoor(x, y, avrg_attrib) {
    const g = game;
    const u = g.u || {};
    const maploc = g.level?.at(x, y); /* C: gm.maploc */
    if (!maploc) {
        await kick_ouch(x, y, "");
        return ECMD_TIME;
    }
    /* C: Levitation macro (youprop.h:240) — reads the real uprop
     * (Levitation_dk, dokick.js:153).  `u._levitation` was a dead field: no
     * writer anywhere in js/, so every branch below always read FALSE. */
    const Levitation = Levitation_dk(u);
    /* C: Blind macro */
    const Blind = _Blind_dk();
    /* C: Luck = u.uluck + u.moreluck */
    const Luck = ((u.uluck | 0) + (u.moreluck | 0)) | 0;
    /* ── SDOOR ── C ref: dokick.c:976-1001 */
    if (maploc.typ === SDOOR) {
        if (!Levitation && rn2(30) < avrg_attrib) {
            /* C: cvt_sdoor_to_door(gm.maploc) — converts SDOOR → DOOR */
            cvt_sdoor_to_door(maploc);
            /* C: Soundeffect(se_crash_door, 40) — no RNG */
            /* C: pline("Crash!  %s a secret door!", ...) */
            const locked_only = (maploc.doormask & (D_LOCKED | D_TRAPPED)) === D_LOCKED;
            void pline(`Crash!  ${locked_only ? "Your kick uncovers" : "You kick open"} a secret door!`);
            exercise(A_DEX, true);
            if (maploc.doormask & D_TRAPPED) {
                maploc.doormask = D_NODOOR;
                /* b_trapped("door", FOOT) — WIRE_PENDING (may consume RNG) */
            }
            else if (maploc.doormask !== D_NODOOR
                && !(maploc.doormask & D_LOCKED)) {
                maploc.doormask = D_ISOPEN;
            }
            feel_newsym(x, y); /* we know it's gone */
            if (maploc.doormask === D_ISOPEN || maploc.doormask === D_NODOOR)
                unblock_point(x, y); /* vision */
            return ECMD_TIME;
        }
        else {
            await kick_ouch(x, y, "");
            return ECMD_TIME;
        }
    }
    /* ── SCORR ── C ref: dokick.c:1002-1015 */
    if (maploc.typ === SCORR) {
        if (!Levitation && rn2(30) < avrg_attrib) {
            /* C: Soundeffect(se_crash_door, 40) — no RNG */
            void pline("Crash!  You kick open a secret passage!");
            exercise(A_DEX, true);
            maploc.typ = CORR;
            feel_newsym(x, y); /* we know it's gone */
            unblock_point(x, y);
            return ECMD_TIME;
        }
        else {
            await kick_ouch(x, y, "");
            return ECMD_TIME;
        }
    }
    /* ── THRONE ── C ref: dokick.c:1016-1064 */
    if (IS_THRONE(maploc.typ)) {
        let i;
        if (Levitation) {
            await kick_dumb(x, y);
            return ECMD_TIME;
        }
        /* C: if ((Luck < 0 || gm.maploc->looted) && !rn2(3)) */
        if ((Luck < 0 || maploc.looted) && !rn2(3)) {
            maploc.looted = 0;
            maploc.typ = ROOM;
            /* C: mkgold((long) rnd(200), x, y) — rnd(200) consumes RNG */
            const _gold_amt = rnd(200); /* consume RNG */
            await mkgold(_gold_amt, x, y);
            /* C: Soundeffect(se_crash_throne_destroyed, 60) — no RNG */
            if (Blind) {
                void pline("CRASH!  You destroy it.");
            }
            else {
                void pline("CRASH!  You destroy the throne.");
                newsym(x, y);
            }
            exercise(A_DEX, true);
            return ECMD_TIME;
        }
        else if (Luck > 0 && !rn2(3) && !maploc.looted) {
            /* C: mkgold((long) rn1(201, 300), x, y) */
            const _gold_amt2 = rn1(201, 300); /* consume RNG */
            await mkgold(_gold_amt2, x, y);
            i = Luck + 1;
            if (i > 6)
                i = 6;
            /* C: while (i--) mksobj_at(rnd_class(DILITHIUM_CRYSTAL, LUCKSTONE-1), x, y, FALSE, TRUE) */
            const DILITHIUM_CRYSTAL = 439; /* C ref: objects.h */
            const LUCKSTONE = 470; /* C ref: objects.h */
            while (i--) {
                /* C: rnd_class calls rnd(sum) or rn1(range, first) — consume RNG */
                _rnd_class(DILITHIUM_CRYSTAL, LUCKSTONE - 1);
                /* mksobj_at stub — WIRE_PENDING */
            }
            if (Blind) {
                /* You("kick %s loose!", something) — no RNG */
            }
            else {
                /* You("kick loose some ornamental coins and gems!") */
                newsym(x, y);
            }
            maploc.looted = T_LOOTED;
            return ECMD_TIME;
        }
        else if (!rn2(4)) {
            /* C: dunlev(&u.uz) < dunlevs_in_dungeon(&u.uz) */
            const uz = u.uz || { dnum: 0, dlevel: 1 };
            const dungeon = g.dungeons?.[uz.dnum | 0];
            const dunlev = uz.dlevel | 0;
            const dunlevs = dungeon?.num_dunlevs ?? 30;
            if (dunlev < dunlevs) {
                /* C dokick.c:1055 fall_through(FALSE, 0) */
                await fall_through(false, 0);
                return ECMD_TIME;
            }
            else {
                await kick_ouch(x, y, "");
                return ECMD_TIME;
            }
        }
        await kick_ouch(x, y, "");
        return ECMD_TIME;
    }
    /* ── ALTAR ── C ref: dokick.c:1065-1078 */
    if (IS_ALTAR(maploc.typ)) {
        if (Levitation) {
            await kick_dumb(x, y);
            return ECMD_TIME;
        }
        /* C dokick.c:1071-1074 — kicking an altar invokes the canonical
         * prayer-side wrath logic before the independent 1-in-3 kick injury
         * roll.  altar_wrath() owns its alignment, voice, luck, and RNG arms. */
        void pline(`You kick ${Blind ? 'something' : 'the altar'}.`);
        await altar_wrath(x, y);
        if (!rn2(3)) {
            await kick_ouch(x, y, "");
            return ECMD_TIME;
        }
        exercise(A_DEX, true);
        return ECMD_TIME;
    }
    /* ── FOUNTAIN ── C ref: dokick.c:1079-1097 */
    if (IS_FOUNTAIN(maploc.typ)) {
        if (Levitation) {
            await kick_dumb(x, y);
            return ECMD_TIME;
        }
        /* C: You("kick %s.", (Blind ? something : "the fountain")) — no RNG */
        void pline(`You kick ${Blind ? 'something' : 'the fountain'}.`);
        if (!rn2(3)) {
            await kick_ouch(x, y, "");
            return ECMD_TIME;
        }
        /* C: if (uarmf && rn2(3)) — uarmf = footwear */
        const uarmf = u.uarmf ?? null;
        if (uarmf && rn2(3)) {
            /* water_damage(uarmf, "metal boots", TRUE) — WIRE_PENDING */
            /* if ER_NOTHING: Your("boots get wet.") */
        }
        exercise(A_DEX, true);
        return ECMD_TIME;
    }
    /* ── GRAVE ── C ref: dokick.c:1098-1130 */
    if (IS_GRAVE(maploc.typ)) {
        if (Levitation) {
            await kick_dumb(x, y);
        }
        else if (rn2(4)) {
            /* minor injury */
            await kick_ouch(x, y, "");
        }
        else if (!maploc.horizontal /* C: !gm.maploc->disturbed — maps to horizontal */ && !rn2(2)) {
            /* disturb the grave: summon a ghoul */
            /* disturb_grave stub — WIRE_PENDING */
        }
        else {
            /* destroy the headstone */
            exercise(A_WIS, false);
            /* C: Role_if(PM_ARCHEOLOGIST) || Role_if(PM_SAMURAI) || lawful check */
            const roleMnum = (g.urole?.mnum ?? g.u?.umonnum ?? -1) | 0;
            if (roleMnum === PM_ARCHEOLOGIST || roleMnum === PM_SAMURAI
                || (((u.ualign?.type ?? 0) | 0) === A_LAWFUL
                    && ((u.ualign?.record ?? 0) | 0) > -10)) {
                /* adjalign(-sgn(u.ualign.type)) — WIRE_PENDING */
            }
            maploc.typ = ROOM;
            maploc.flags = 0; /* C: gm.maploc->emptygrave = 0 (flags alias) */
            maploc.horizontal = false; /* C: gm.maploc->disturbed = 0 (horizontal alias) */
            /* mksobj_at(ROCK, x, y, TRUE, FALSE) stub — WIRE_PENDING */
            /* del_engr_at(x, y) stub — WIRE_PENDING */
            if (Blind) {
                void pline("Crack!  It broke!"); /* C: "Crack!  %s broke!", Something */
            }
            else {
                void pline("The headstone topples over and breaks!"); /* C: pline_The(...) */
                newsym(x, y);
            }
        }
        return ECMD_TIME;
    }
    /* ── IRONBARS ── C ref: dokick.c:1131-1134 */
    if (maploc.typ === IRONBARS) {
        await kick_ouch(x, y, "");
        return ECMD_TIME;
    }
    /* ── TREE ── C ref: dokick.c:1135-1193 */
    if (IS_TREE(maploc.typ)) {
        /* C: if (rn2(3)) — nothing, 75% chance */
        if (rn2(3)) {
            /* C: if (!rn2(6) && !(svm.mvitals[PM_KILLER_BEE].mvflags & G_GONE)) */
            if (!rn2(6) && !((g.mvitals?.[PM_KILLER_BEE]?.mvflags | 0) & G_GONE)) {
                /* You_hear("a low buzzing.") — no RNG */
            }
            await kick_ouch(x, y, "");
            return ECMD_TIME;
        }
        /* C: if (rn2(15) && !(gm.maploc->looted & TREE_LOOTED) && (treefruit = rnd_treefruit_at(x, y))) */
        if (rn2(15) && !(maploc.looted & TREE_LOOTED)) {
            /* C dokick.c:1146 rnd_treefruit_at() "never returns Null", so the
             * short-circuit && always continues once the first two conditions
             * pass — no branch on its result. */
            const treefruit = await rnd_treefruit_at(x, y);
            const frtype = treefruit.otyp;
            /* C: long nfruit = 8L - rnl(7), nfall; */
            const nfruit = 8 - rnl(7);
            treefruit.quan = nfruit;
            treefruit.owt = weight(treefruit);
            /* C: is_plural(treefruit) — treefruit is never an artifact, so
             * this reduces to quan != 1 (see the full macro's artifact arm,
             * obj.h:421, which cannot apply here). */
            if ((treefruit.quan | 0) !== 1)
                pline(`Some ${xname(treefruit)} fall from the tree!`);
            else
                pline(`${An(xname(treefruit))} falls from the tree!`);
            const nfall = await scatter(x, y, 2, MAY_HIT, treefruit);
            if (nfall !== nfruit) {
                /* scatter left some in the tree, but treefruit may not refer
                 * to the correct object */
                const leftover = await mksobj(frtype, true, false);
                leftover.quan = nfruit - nfall;
                pline(`${nfruit - nfall} ${xname(leftover)} got caught in the branches.`);
                await dealloc_obj(leftover);
            }
            exercise(A_DEX, true);
            exercise(A_WIS, true);
            newsym(x, y);
            maploc.looted |= TREE_LOOTED;
            return ECMD_TIME;
        }
        else if (!(maploc.looted & TREE_SWARM)) {
            let cnt = rnl(4) + 2;
            let made = 0;
            let mmx = x, mmy = y;
            const beeTemplate = permonstTemplate(PM_KILLER_BEE);
            while (cnt--) {
                /* C: if (enexto(&mm, mm.x, mm.y, &mons[PM_KILLER_BEE])
                 *     && makemon(&mons[PM_KILLER_BEE], mm.x, mm.y, MM_ANGRY|MM_NOMSG))
                 *         made++;
                 * C's `mm` is ONE struct reused as both enexto's search-center
                 * input and its coordinate output — a failed enexto() leaves it
                 * unwritten, so the NEXT iteration retries from the same
                 * center; a successful one re-centers subsequent bees on the
                 * square just placed.  enexto_out returns {x,y} or null (C's
                 * cc out-param / FALSE) rather than mutating an out-param. */
                const mm = enexto_out(mmx, mmy, beeTemplate);
                if (mm) {
                    mmx = mm.x; mmy = mm.y;
                    if (await makemon(beeTemplate, mm.x, mm.y, MM_ANGRY | MM_NOMSG))
                        made++;
                }
            }
            if (made) {
                void pline("You've attracted the tree's former occupants!");
            }
            else {
                void pline("You smell stale honey.");
            }
            maploc.looted |= TREE_SWARM;
            return ECMD_TIME;
        }
        await kick_ouch(x, y, "");
        return ECMD_TIME;
    }
    /* ── SINK ── C ref: dokick.c:1194-1241 */
    if (IS_SINK(maploc.typ)) {
        /* C: int gend = poly_gender() — no RNG */
        const gend = 0; /* stub: poly_gender — WIRE_PENDING */
        if (Levitation) {
            await kick_dumb(x, y);
            return ECMD_TIME;
        }
        /* C: if (rn2(5)) — 80% chance klunk */
        if (rn2(5)) {
            /* C: Soundeffect(se_klunk_pipe, 60) — no RNG */
            void pline(_Deaf_dk() ? "Klunk!" : "Klunk!  The pipes vibrate noisily.");
            exercise(A_DEX, true);
            return ECMD_TIME;
        }
        else if (!(maploc.looted & S_LPUDDING) && !rn2(3)
            && !((g.mvitals?.[PM_BLACK_PUDDING]?.mvflags | 0) & G_GONE)) {
            /* C: Soundeffect(se_gushing_sound, 100) — no RNG
             * C: if (Blind) { if (!Deaf) You_hear("a gushing sound."); }
             *    else pline("A %s ooze gushes up from the drain!", hcolor("black"));
             * makemon(&mons[PM_BLACK_PUDDING], x, y, MM_NOMSG) is a real,
             * already-exported js/mklev.js body — see the tree-swarm arm's
             * import note above for why this was a WIRE_PENDING no-op. */
            if (_Blind_dk()) {
                if (!_Deaf_dk()) void You_hear("a gushing sound.");
            }
            else {
                void pline(`A ${hcolor("black")} ooze gushes up from the drain!`);
            }
            await makemon(permonstTemplate(PM_BLACK_PUDDING), x, y, MM_NOMSG);
            exercise(A_DEX, true);
            newsym(x, y);
            maploc.looted |= S_LPUDDING;
            return ECMD_TIME;
        }
        else if (!(maploc.looted & S_LDWASHER) && !rn2(3)) {
            /* C: pline("%s returns!", (Blind ? Something : "The dish washer")) — no RNG
             * C: makemon(..., MM_NOMSG | (gend==1||(gend==2&&rn2(2)) ? MM_MALE : MM_FEMALE)) */
            /* rn2(2) only fires when gend == 2 */
            let mmflags = MM_NOMSG;
            if (gend === 1 || (gend === 2 && rn2(2))) {
                mmflags |= MM_MALE;
            }
            else {
                mmflags |= MM_FEMALE;
            }
            void pline(`${_Blind_dk() ? "Something" : "The dish washer"} returns!`);
            const demon = await makemon(permonstTemplate(PM_AMOROUS_DEMON_DK), x, y, mmflags);
            if (demon) newsym(x, y);
            maploc.looted |= S_LDWASHER;
            exercise(A_DEX, true);
            return ECMD_TIME;
        }
        else if (!rn2(3)) {
            /* C: sink_backs_up(x, y) — may consume RNG; WIRE_PENDING */
            return ECMD_TIME;
        }
        await kick_ouch(x, y, "");
        return ECMD_TIME;
    }
    /* ── STAIRS / LADDER / STWALL ── C ref: dokick.c:1242-1250 */
    if (maploc.typ === STAIRS || maploc.typ === LADDER
        || IS_STWALL(maploc.typ)) {
        /* C: if (!IS_STWALL(maploc.typ) && maploc.ladder == LA_DOWN) */
        if (!IS_STWALL(maploc.typ) && maploc.ladder === LA_DOWN) {
            await kick_dumb(x, y);
            return ECMD_TIME;
        }
        await kick_ouch(x, y, "");
        return ECMD_TIME;
    }
    /* ── fallthrough ── C ref: dokick.c:1251-1252 */
    await kick_dumb(x, y);
    return ECMD_TIME;
}
/* C ref: dokick.c:909-971 kick_door(x, y, avrg_attrib) — kick a closed/locked door.
 * RNG sites: rnl(35) (success roll), rn2(5) (shatter vs crash-open),
 *            rn2(3) (Thwack vs Whammm).  All mirror C ordering. */
async function kick_door(x, y, avrg_attrib) {
    const g = game;
    const u = g.u || {};
    const maploc = g.level?.at(x, y);
    if (!maploc) return;
    const Levitation = Levitation_dk(u);
    /* C: if (doormask == D_ISOPEN || D_BROKEN || D_NODOOR) kick_dumb; return */
    if (maploc.doormask === D_ISOPEN || maploc.doormask === D_BROKEN
        || maploc.doormask === D_NODOOR) {
        await kick_dumb(x, y);
        return;
    }
    /* C: if (Levitation) { kick_ouch; return; } */
    if (Levitation) {
        await kick_ouch(x, y, "");
        return;
    }
    exercise(A_DEX, true);
    /* C: doorbuster = Upolyd && is_giant(youmonst.data) — FALSE for normal hero */
    const doorbuster = false; /* WIRE_PENDING: Upolyd && is_giant */
    /* C: rnl(35) < avrg_attrib + (!martial() ? 0 : ACURR(A_DEX)) */
    const bonus = martial() ? (acurr(u, A_DEX) | 0) : 0;
    if (doorbuster || (rnl(35) < avrg_attrib + bonus)) {
        /* C dokick.c:931 — shopdoor = *in_rooms(x, y, SHOPBASE) ? TRUE : FALSE.
         * Evaluated here, INSIDE the success branch and BEFORE the shatter
         * test, exactly as C does: the rn2(5) above it is drawn first because
         * C's `&&` chain puts !shopdoor last, so a shop door still burns the
         * roll it can never use. */
        const shopdoor = in_rooms(x, y, SHOPBASE).length ? true : false;
        /* break the door */
        if (maploc.doormask & D_TRAPPED) {
            void pline("You kick the door.");
            exercise(A_STR, false);
            maploc.doormask = D_NODOOR;
            /* b_trapped("door", FOOT) — WIRE_PENDING (may consume RNG) */
        }
        else if ((acurr(u, A_STR) | 0) > 18 && !rn2(5) && !shopdoor) {
            void pline("As you kick the door, it shatters to pieces!");
            exercise(A_STR, true);
            maploc.doormask = D_NODOOR;
        }
        else {
            void pline("As you kick the door, it crashes open!");
            exercise(A_STR, true);
            maploc.doormask = D_BROKEN;
        }
        newsym(x, y);
        /* C: feel_newsym(x, y); recalc_block_point(x, y) — vision must learn the
         * door is now passable so couldsee()/view_from raycast through it.  The
         * call is RNG-free at this site but has downstream RNG consequences
         * (e.g. dog_goal's couldsee(dog)/in_masters_sight branch). */
        recalc_block_point(x, y);
        /* C dokick.c:952-953 — a broken shop door is billable damage: record it
         * and let the shopkeeper react (which relocates them to the doorway and
         * puts them on the war path). */
        if (shopdoor) {
            add_damage(x, y, SHOP_DOOR_COST);
            await pay_for_damage("break", false);
        }
        /* C dokick.c:955-956 — in_town(x,y) → get_iter_mons(watchman_thief_arrest).
         * in_town() requires svl.level.flags.has_town, which no level in scope
         * sets; the Watch is not ported. */
    }
    else {
        exercise(A_STR, true);
        /* C: pline("%s!!", (Deaf || !rn2(3)) ? "Thwack" : "Whammm") */
        void pline(`${(!rn2(3)) ? "Thwack" : "Whammm"}!!`);
        /* watchman_door_damage (in_town) — WIRE_PENDING */
    }
}
const _KM_AT_KICK = 3;              /* monattk.h AT_KICK */
const _KM_S_EEL = 57;               /* defsym.h MONSYM(57, ';', EEL, S_EEL) */
const _KM_KICKING_BOOTS = 170;      /* objects[] index of "kicking boots" */
const _KM_M1_FLY = 0x00000001;      /* monflag.h:85 */
const _KM_M1_NOLIMBS = 0x00006000;  /* monflag.h:99 */
const _KM_M1_SLITHY = 0x00080000;   /* monflag.h:104 */
const _KM_M1_TPORT = 0x02000000;    /* monflag.h:110 */
const _KM_S_EYE = 5;                /* defsym.h MONSYM(5, 'e', EYE, S_EYE) */
const _KM_S_LIGHT = 25;             /* defsym.h MONSYM(25, 'y', LIGHT, S_LIGHT) */
const _KM_M1_NOEYES = 0x00001000;   /* monflag.h:97 */
const _KM_M1_NOHANDS = 0x00002000;  /* monflag.h:98 */
const _KM_M1_THICK_HIDE = 0x00200000; /* monflag.h:106 */
const _KM_MZ_SMALL = 1;             /* monflag.h:178 */
const _KM_MZ_LARGE = 3;             /* monflag.h:181 */
const _KM_M_AP_MONSTER = 1;         /* monst.h M_AP_MONSTER */

/* mondata.h — the flag tests kick_monster's long guard needs. */
function _km_bigmonst(ptr) { return ((ptr?.msize | 0) >= _KM_MZ_LARGE); }
function _km_verysmall(ptr) { return ((ptr?.msize | 0) < _KM_MZ_SMALL); }
function _km_thick_skinned(ptr) { return !!(((ptr?.mflags1) | 0) & _KM_M1_THICK_HIDE); }
function _km_haseyes(ptr) { return !(((ptr?.mflags1) | 0) & _KM_M1_NOEYES); }
function _km_nohands(ptr) { return !!(((ptr?.mflags1) | 0) & _KM_M1_NOHANDS); }
function _km_is_flyer(ptr) { return !!(((ptr?.mflags1) | 0) & _KM_M1_FLY); }
/* mondata.h:82 can_teleport, :20 is_floater, :53 nolimbs (an ALL-bits test —
 * M1_NOLIMBS is 0x6000, i.e. NOHANDS|0x4000), :67 slithy.  The dodge-verb
 * ladder in kick_monster is their only caller here. */
function _km_can_teleport(ptr) { return !!(((ptr?.mflags1) | 0) & _KM_M1_TPORT); }
function _km_is_floater(ptr) { const l = (ptr?.mlet | 0); return l === _KM_S_EYE || l === _KM_S_LIGHT; }
function _km_nolimbs(ptr) { return (((ptr?.mflags1) | 0) & _KM_M1_NOLIMBS) === _KM_M1_NOLIMBS; }
function _km_slithy(ptr) { return !!(((ptr?.mflags1) | 0) & _KM_M1_SLITHY); }
/* C mon.h DEADMONSTER(mon) := ((mon)->mhp < 1). */
function _km_deadmonster(mon) { return ((mon?.mhp | 0) < 1); }
function _km_fumbling() {
    const p = game.u?.uprops?.[FUMBLING];
    return !!(p && (((p.intrinsic | 0)) || ((p.extrinsic | 0))));
}
/* C do_name.c:1073 Monnam() -- mon_nam() with highc() on the first letter. */
function _km_Monnam(mtmp) {
    const bp = mon_nam(mtmp);
    if (!bp) return bp;
    let c = bp.charCodeAt(0);
    if (0x61 <= c && c <= 0x7a) c &= ~0x20;
    return String.fromCharCode(c) + bp.slice(1);
}
/* C do_name.c:1048 a_monnam() -- x_monnam(mtmp, ARTICLE_A, ...). */
function _km_a_monnam(mtmp) {
    return x_monnam(mtmp, ARTICLE_A, null,
                    has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0, false);
}
/* C mondata.h attacktype(ptr, atyp) -- attacktype_fordmg(ptr, atyp, AD_ANY). */
function _km_attacktype(ptr, atyp) {
    const a = ptr?.mattk;
    if (!a) return false;
    for (let i = 0; i < NATTK; i++)
        if (((a[i]?.aatyp) | 0) === atyp)
            return true;
    return false;
}
/* C objclass.h objects[otyp].oc_bulky -- the ARMOR() macro's `blk` column, and
 * this port carries no oc_bulky data.  It is NOT "every suit": objects.h sets
 * blk only on the DRGN_ARMR rows (the ten dragon scale mails and the ten
 * dragon scales, objects.h:497-553) and on plate / crystal plate / bronze plate
 * / splint / banded mail (objects.h:556-570).  Chain mail, the mithril-coats,
 * scale mail, ring mail, studded leather, leather armour and the leather jacket
 * are NOT bulky.  Getting this wrong is an RNG defect, not a cosmetic one: the
 * caller is `uarm && oc_bulky && ACURR(A_DEX) < rnd(25)`, so a wrong TRUE draws
 * an rnd(25) C never draws.  Contiguous run 101..125 in objects.h order. */
function _km_oc_bulky(uarm) {
    const otyp = (uarm?.otyp | 0);
    return otyp >= 101 && otyp <= 125;
}

/* C ref: dokick.c:125-143 maybe_kick_monster() -- returns FALSE when the kick
 * is called off (hidden monster revealed, peaceful declined, hero passed out).
 * svc.context.move stays 1 unless the player declined a peaceful monster. */
async function maybe_kick_monster(mon, x, y) {
    if (mon) {
        const g = game;
        g.context = g.context || {};
        const save_forcefight = g.context.forcefight;
        /* C dokick.c:130-131 -- attack_checks() reads gb.bhitpos, and its
         * cannot-see arm calls map_invisible() with it. */
        (g.gb || (g.gb = {})).bhitpos = { x: x | 0, y: y | 0 };
        if (!mon.mpeaceful || !canspotmon(mon))
            g.context.forcefight = true; /* attack even if invisible */
        /* C dokick.c:138 `if (attack_checks(mon, NULL) || overexertion())`.
         * The `||` SHORT-CIRCUITS: when attack_checks aborts the kick (the
         * player declined "Really attack %s?"), overexertion() -- and with it
         * gethungry's rn2(20) -- is NEVER called.  attack_checks is async since
         * it can now raise that prompt. */
        if (await attack_checks(mon, null) || await overexertion())
            mon = null; /* don't kick after all */
        g.context.forcefight = save_forcefight;
    }
    return !!mon;
}

/* C ref: dokick.c:33-121 kickdmg(mon, clumsy) -- kicking damage when not
 * poly'd into a form with a kick attack. */
async function kickdmg(mon, clumsy) {
    const g = game;
    const u = g.u || {};
    const uarmf = u.uarmf ?? null;
    let dmg = Math.trunc((acurrstr(u) + (acurr(u, A_DEX) | 0)
                          + (acurr(u, A_CON) | 0)) / 15);
    let kick_skill = P_NONE;
    /* C dokick.c:36 — this flag is set when martial knockback kills the
     * target in a trap; it must remain mutable across the damage sequence. */
    let trapkilled = false;

    if (uarmf && (uarmf.otyp | 0) === _KM_KICKING_BOOTS)
        dmg += 5;
    /* excessive wt affects dex, so it affects dmg */
    if (clumsy)
        dmg = Math.trunc(dmg / 2);
    /* kicking a dragon or an elephant will not harm it */
    if (_km_thick_skinned(mon.data))
        dmg = 0;
    /* C dokick.c:52-54 -- attacking a shade is normally useless.  PM_SHADE has
     * no const in this port; the mndx test below is the same comparison C makes
     * with &mons[PM_SHADE]. */
    const isShade = ((mon.mndx ?? mon.mnum ?? -1) | 0) === PM_SHADE;
    if (isShade)
        dmg = 0;

    const specialdmg = special_dmgval(g.youmonst, mon, W_ARMF, null) | 0;

    if (isShade && !specialdmg) {
        void pline('The kick passes harmlessly through it.');
        /* doesn't exercise skill or abuse alignment or frighten pet,
           and shades have no passive counterattack */
        return;
    }

    if (M_AP_TYPE(mon))
        seemimic(mon);

    check_caitiff(mon);

    /* C dokick.c:70-77 -- kicking a pet first lowers its tameness, then
     * makes it flee (or clears an already-lost pet's flee state).  abuse_dog
     * owns the C rn2(m tame) sound choice, so invoke it before the damage
     * roll exactly where dokick.c does. */
    if (mon.mtame) {
        abuse_dog(mon);
        if (mon.mtame)
            await monflee(mon, dmg ? rnd(dmg) : 1, false, false);
        else
            mon.mflee = 0;
    }

    if (dmg > 0) {
        /* convert potential damage to actual damage */
        dmg = rnd(dmg);
        if (martial()) {
            if (dmg > 1)
                kick_skill = P_MARTIAL_ARTS;
            dmg += rn2(Math.trunc((acurr(u, A_DEX) | 0) / 2) + 1);
        }
        /* a good kick exercises your dex */
        exercise(A_DEX, true);
    }
    dmg += specialdmg;              /* for blessed (or silver) boots */
    if (uarmf)
        dmg += (uarmf.spe | 0);
    dmg += (u.udaminc | 0);         /* ring(s) of increase damage */
    if (dmg > 0)
        mon.mhp = (mon.mhp | 0) - dmg;

    if (!_km_deadmonster(mon) && martial() && !_km_bigmonst(mon.data) && !rn2(3)
        && (mon.mcanmove | 0) && mon !== u.ustuck && !(mon.mtrapped | 0)) {
        /* C dokick.c:98-111 -- martial-arts knockback.  The JS level
         * representation finds monsters by fmon coordinates, so changing
         * mx/my is the equivalent of remove_monster/place_monster here. */
        const mdx = (mon.mx | 0) + (u.dx | 0);
        const mdy = (mon.my | 0) + (u.dy | 0);
        if (goodpos(mdx, mdy, mon, 0) && m_in_out_region(mon, mdx, mdy)) {
            const oldx = mon.mx | 0;
            const oldy = mon.my | 0;
            await pline(`${_km_Monnam(mon)} reels from the blow.`);
            mon.mx = mdx;
            mon.my = mdy;
            newsym(oldx, oldy);
            newsym(mdx, mdy);
            set_apparxy(mon);
            if (await mintrap(mon, 0) === 2 /* Trap_Killed_Mon */)
                trapkilled = true;
        }
    }

    await passive(mon, uarmf, true, !_km_deadmonster(mon), _KM_AT_KICK, false);
    if (_km_deadmonster(mon) && !trapkilled)
        await killed(mon);

    /* may bring up a dialog, so put this after all messages */
    if (kick_skill !== P_NONE)
        await use_skill(kick_skill, 1);
}

/* C ref: dokick.c:146-289 kick_monster(mon, x, y). */
async function kick_monster(mon, x, y) {
    const g = game;
    const u = g.u || {};
    const uarmf = u.uarmf ?? null;
    let clumsy = false;
    let doit = false;

    /* anger target even if wild miss will occur */
    await setmangry(mon, true);

    const Levitation = Levitation_dk(u);
    if (Levitation && !rn2(3) && _km_verysmall(mon.data) && !_km_is_flyer(mon.data)) {
        void pline('Floating in the air, you miss wildly!');
        exercise(A_DEX, false);
        await passive(mon, uarmf, false, 1, _KM_AT_KICK, false);
        return;
    }

    /* C dokick.c:163-176 -- reveal a hidden target even if the kick misses. */
    if ((mon.mundetected | 0)
        || (M_AP_TYPE(mon) && M_AP_TYPE(mon) !== _KM_M_AP_MONSTER)) {
        if (M_AP_TYPE(mon))
            seemimic(mon);
        mon.mundetected = 0;
        if (!canspotmon(mon))
            map_invisible(x, y);
        else
            newsym(x, y);
        void pline(`There is ${canspotmon(mon) ? _km_a_monnam(mon) : 'something hidden'} here.`);
    }

    /* C dokick.c:184-223 -- a poly'd hero with its own AT_KICK attacks kicks
     * with damageum()/find_roll_to_hit(), neither of which this port has for
     * AT_KICK.  Surfaced rather than mis-drawn. */
    /* C dokick.c:183 -- `if (Upolyd && attacktype(gy.youmonst.data, AT_KICK))`.
     * The macro has no receiver; it always reads the global u.  Passing
     * g.youmonst made this read youmonst.umonnum/umonster (and, before the
     * predicate was corrected, youmonst.mtimedone) -- fields that object does
     * not carry, so the guard was unconditionally false. */
    if (Upolyd(g.u) && _km_attacktype(g.youmonst?.data, _KM_AT_KICK)) {
        /* C dokick.c:184-223 enters hmonas(), the same polymorphed attack
         * loop used by ordinary attacks.  Reuse its canonical dispatcher so
         * every form-specific attack, damage, and passive effect stays in one
         * implementation. */
        await do_attack(mon);
        return;
    }

    const i = -inv_weight();
    const j = weight_cap();

    /* If you are over 70% of carrying capacity, you go through a "deal no
     * damage" check, and if that fails, a "clumsy kick" check. */
    if (i < Math.trunc((j * 3) / 10)) {
        if (!rn2((i < Math.trunc(j / 10)) ? 2 : (i < Math.trunc(j / 5)) ? 3 : 4)) {
            if (martial()) {
                doit = true;
            } else {
                void pline('Your clumsy kick does no damage.');
                await passive(mon, uarmf, false, 1, _KM_AT_KICK, false);
                return;
            }
        }
        if (!doit) {
            if (i < Math.trunc(j / 10))
                clumsy = true;
            else if (!rn2((i < Math.trunc(j / 5)) ? 2 : 3))
                clumsy = true;
        }
    }

    if (!doit) {
        if (_km_fumbling())
            clumsy = true;
        else if (u.uarm && _km_oc_bulky(u.uarm) && (acurr(u, A_DEX) | 0) < rnd(25))
            clumsy = true;
    }
    /* doit: */
    void pline(`You kick ${mon_nam(mon)}.`);
    if (!rn2(clumsy ? 3 : 4) && (clumsy || !_km_bigmonst(mon.data))
        && (mon.mcansee | 0) && !(mon.mtrapped | 0) && !_km_thick_skinned(mon.data)
        && ((mon.data?.mlet | 0) !== _KM_S_EEL) && _km_haseyes(mon.data)
        && (mon.mcanmove | 0) && !(mon.mstun | 0) && !(mon.mconf | 0)
        && !(mon.msleeping | 0) && ((mon.data?.mmove | 0) >= 12)) {
        if (!_km_nohands(mon.data) && !rn2(martial() ? 5 : 3)) {
            void pline(`${_km_Monnam(mon)} blocks your ${clumsy ? 'clumsy ' : ''}kick.`);
            await passive(mon, uarmf, false, 1, _KM_AT_KICK, false);
            return;
        }
        /* C dokick.c:267-285 — the else arm: maybe_mnexto() lets the target
         * dodge, and the caller detects the dodge by re-reading mon->mx/my.
         * maybe_mnexto (C mon.c:3997) now lives in js/teleport.js next to
         * enexto_out/rloc_to.  It is RNG-BEARING — each of its up-to-20 tries
         * re-runs enexto, which shuffles collect_coords' rings — so the
         * previous throwing stub was the honest shape while it was absent;
         * a silent skip would have been a fabricated "it never dodges".
         * Reached only when the block roll above came up 0. */
        await maybe_mnexto(mon);
        if ((mon.mx | 0) !== x || (mon.my | 0) !== y) {
            void unmap_invisible(x, y);
            /* C's four-way verb ladder, in C's order: teleports / floats /
             * swoops / slides, defaulting to "jumps". */
            const verb = (_km_can_teleport(mon.data) && !noteleport_level(mon))
                ? 'teleports'
                : _km_is_floater(mon.data)
                    ? 'floats'
                    : _km_is_flyer(mon.data)
                        ? 'swoops'
                        : (_km_nolimbs(mon.data) || _km_slithy(mon.data))
                            ? 'slides'
                            : 'jumps';
            void pline(`${_km_Monnam(mon)} ${verb}, ${clumsy ? 'easily' : 'nimbly'}`
                + ` evading your ${clumsy ? 'clumsy ' : ''}kick.`);
            await passive(mon, uarmf, false, 1, _KM_AT_KICK, false);
            return;
        }
    }
    await kickdmg(mon, clumsy);
}

/* ── kick_object / really_kick_object — the OBJ_AT(x,y) arm of dokick() ──
 * C ref: dokick.c:487-504 kick_object (jacket), :507-790 really_kick_object.
 * Object-type numerics local to this block (no shared table in this port). */
const _KO_BOULDER_OTYP = 475;
const _KO_COIN_CLASS = 12;
const _KO_LARGE_BOX = 214, _KO_CHEST = 215, _KO_BAG_OF_HOLDING = 219,
      _KO_BAG_OF_TRICKS = 220;
const _KO_ART_MJOLLNIR = 3; /* artilist.h ARTI_ENUM index; see uhitm.js/attrib.js "3 Mjollnir" rows */
const _KO_GLASS_MATERIAL = 19; /* objclass.h MAT_GLASS -- see MKOBJ_OC_MATERIAL */
const _KO_EGG_OTYP = 266, _KO_MIRROR_OTYP = 230;
const _KO_GEM_CLASS = 13;
function _ko_Is_container(o) { const t = o.otyp | 0; return t >= _KO_LARGE_BOX && t <= _KO_BAG_OF_TRICKS; }
function _ko_Is_box(o) { const t = o.otyp | 0; return t === _KO_LARGE_BOX || t === _KO_CHEST; }
function _ko_Is_mbag(o) { const t = o.otyp | 0; return t === _KO_BAG_OF_HOLDING || t === _KO_BAG_OF_TRICKS; }
function _ko_is_art_mjollnir(o) { return !!(o && (o.oartifact | 0) === _KO_ART_MJOLLNIR); }

export async function container_impact_dmg(obj, x, y) {
    if (!_ko_Is_container(obj) || !Has_contents(obj) || _ko_Is_mbag(obj))
        return;
    let wchange = false;
    let otmp = obj.cobj;
    while (otmp) {
        const otmp2 = otmp.nobj;
        let result = null;
        if (MKOBJ_OC_MATERIAL[otmp.otyp | 0] === _KO_GLASS_MATERIAL
            && (otmp.oclass | 0) !== _KO_GEM_CLASS
            && !obj_resists(otmp, 33, 100)) {
            result = 'shatter';
        } else if ((otmp.otyp | 0) === _KO_EGG_OTYP && !rn2(3)) {
            result = 'cracking';
        }
        if (result) {
            if ((otmp.otyp | 0) === _KO_MIRROR_OTYP)
                change_luck(-2);
            if ((otmp.otyp | 0) === _KO_EGG_OTYP && (otmp.spe | 0) && ismnum(otmp.corpsenm))
                change_luck(-1);
            await You_hear(`a muffled ${result}.`);
            if ((otmp.quan | 0) > 1) {
                await useup(otmp);
            } else {
                obj_extract_self_general(otmp);
                await obfree(otmp, null);
            }
            obj.cknown = 0;
            wchange = true;
        }
        otmp = otmp2;
    }
    if (wchange)
        obj.owt = weight(obj);
}

/* C dokick.c:293-347 ghitm() -- return TRUE if caught (the gold taken care of),
 * FALSE otherwise.  The gold object is not attached to the fobj chain. */
async function ghitm(mtmp, gold) {
    const g = game;
    const u = g.u;
    let msg_given = false;
    const mflags2 = (mtmp.data?.mflags2 ?? mtmp.mflags2 ?? 0) | 0;
    const likesGold = (mflags2 & 0x10000000) !== 0; /* M2_GREEDY */
    const mercenary = (mflags2 & 0x00000200) !== 0; /* M2_MERC */

    if (!likesGold && !mtmp.isshk && !mtmp.ispriest && !mtmp.isgd && !mercenary) {
        await wakeup(mtmp, true);
    } else if (!(mtmp.mcanmove | 0)) {
        /* too light to do real damage */
        if (canseemon(mtmp)) {
            await pline(`${The(xname(gold))} harmlessly ${otense(gold, 'hit')} ${mon_nam(mtmp)}.`);
            msg_given = true;
        }
    } else {
        const was_sleeping = mtmp.msleeping | 0;
        const value = (gold.quan | 0) * (OC_COST[gold.otyp | 0] | 0);

        mtmp.msleeping = 0;
        finish_meating(mtmp);
        if (!mtmp.isgd && !rn2(4))
            await setmangry(mtmp, true);
        /* greedy monsters catch gold */
        if (cansee(mtmp.mx | 0, mtmp.my | 0))
            await pline(`${_km_Monnam(mtmp)} ${was_sleeping ? 'awakens and ' : ''}catches the gold.`);
        await mpickobj(mtmp, gold);
        if (mtmp.isshk) {
            const eshk = ESHK(mtmp);
            let robbed = eshk.robbed | 0;
            if (robbed) {
                robbed -= value;
                if (robbed < 0) robbed = 0;
                await pline(`The amount ${!robbed ? '' : 'partially '}covers ${mhis_mon(mtmp)} recent losses.`);
                eshk.robbed = robbed;
                /* make_happy_shk(mtmp, FALSE) when !robbed: no real body in js/ */
            } else if (mtmp.mpeaceful) {
                eshk.credit = (eshk.credit | 0) + value;
                await pline(`You have ${eshk.credit} ${currency(eshk.credit)} in credit.`);
            } else
                await verbalize('Thanks, scum!');
        } else if (mtmp.ispriest) {
            await verbalize(mtmp.mpeaceful ? 'Thank you for your contribution.' : 'Thanks, scum!');
        } else if (mtmp.isgd) {
            const umoney = money_cnt(u.invent);
            await verbalize(umoney ? 'Drop the rest and follow me.'
                : hidden_gold(true) ? 'You still have hidden gold.  Drop it now.'
                : mtmp.mpeaceful ? "I'll take care of that; please move along."
                : "I'll take that; now get moving.");
        } else if (mercenary) {
            const was_angry = !mtmp.mpeaceful;
            let goldreqd = 0;
            const mn = (mtmp.data?.mnum ?? mtmp.mnum);
            if (mn === PM_SOLDIER) goldreqd = 100;
            else if (mn === PM_SERGEANT) goldreqd = 250;
            else if (mn === PM_LIEUTENANT) goldreqd = 500;
            else if (mn === PM_CAPTAIN) goldreqd = 750;

            if (goldreqd && rn2(3)) {
                const umoney = money_cnt(u.invent);
                goldreqd += Math.trunc((umoney + (u.ulevel | 0) * rn2(5)) / (acurr(u, 5) | 0));
                if (value > goldreqd)
                    mtmp.mpeaceful = 1;
            }
            if (!mtmp.mpeaceful) {
                await verbalize(goldreqd ? "That's not enough, coward!"
                    : "I don't take bribes from scum like you!");
            } else if (was_angry) {
                await verbalize('That should do.  Now beat it!');
            } else {
                await verbalize(`Thanks for the tip, ${u.female || g.flags?.female ? 'lady' : 'buddy'}.`);
            }
        }
        return true;
    }

    if (!msg_given)
        miss(xname(gold), mtmp);
    return false;
}

/* C ref: dokick.c:487-504 kick_object(x, y, kickobjnam) — jacket around
 * really_kick_object() that sets/clears gk.kickedobj (game.kickedobj here,
 * the slot js/cmd.js's thitmonst and js/mklev.js's obj-free path already
 * read/clear). kickobjnam is unused by any caller in this port (kick_ouch is
 * always invoked with "" below, matching kick_ouch's own established
 * signature), so it is dropped rather than threaded through as an out-param. */
async function kick_object(x, y) {
    const kickedobj = obj_at(x, y);
    if (!kickedobj)
        return 0;
    game.kickedobj = kickedobj;
    const res = await really_kick_object(x, y, kickedobj);
    game.kickedobj = null;
    return res;
}

/* C dokick.c:697-701 — the static flyingcoinmsg[] table really_kick_object
 * rolls with ROLL_FROM() when a gold stack scatters.  Kept in C's order; the
 * index is what the rn2(3) draw selects. */
const _KO_FLYINGCOINMSG = [
    'scatter the coins',
    'knock coins all over the place',
    'send coins flying in all directions',
];
/* C ref: dokick.c:507-790 really_kick_object(x, y) — guts of kick_object.
 * 12+ RNG sites depending on branch; mirrors C control flow and short-circuit
 * ordering exactly.  Returns 1 (kick resolved, whether or not the object
 * moved) or 0 (kick failed outright -> caller falls through to kick_ouch). */
async function really_kick_object(x, y, kickedobj) {
    const g = game, u = g.u || {};

    if (!kickedobj || (kickedobj.otyp | 0) === _KO_BOULDER_OTYP
        || kickedobj === u.uball || kickedobj === u.uchain)
        return 0;

    const trap = t_at(x, y);
    if (trap) {
        if ((is_pit(trap.ttyp | 0) && !false)
            || (trap.ttyp | 0) === WEB) {
            if (!trap.tseen)
                await find_trap(trap);
            const halluc = !!(u.uprops?.[HALLUC]?.intrinsic | 0) || !!(u.uprops?.[HALLUC]?.extrinsic | 0);
            void pline(`You can't kick something that's in a ${
                halluc ? 'tizzy' : (trap.ttyp | 0) === WEB ? 'web' : 'pit'}!`);
            return 1;
        }
        if ((trap.ttyp | 0) === STATUE_TRAP) {
            await activate_statue_trap(trap, x, y, false);
            return 1;
        }
    }

    if (_km_fumbling() && !rn2(3)) {
        void pline('Your clumsy kick missed.');
        return 1;
    }


    const isgold = (kickedobj.oclass | 0) === _KO_COIN_CLASS;
    let k_owt = weight(kickedobj);
    if ((kickedobj.quan | 0) > 1 && !isgold) {
        const save_quan = kickedobj.quan;
        kickedobj.quan = 1;
        k_owt = weight(kickedobj);
        kickedobj.quan = save_quan;
    }
    let range = Math.trunc(acurrstr(u) / 2) - Math.trunc(k_owt / 40);

    if (martial())
        range += rnd(3);

    let slide = false;
    if (is_pool(x, y)) {
        range = Math.trunc(range / 3) + 1;
    } else if (false) {
        range += rnd(3);
    } else {
        if (is_ice(x, y)) { range += rnd(3); slide = true; }
        if (kickedobj.greased) { range += rnd(3); slide = true; }
    }

    /* Mjollnir is magically too heavy to kick. */
    if (_ko_is_art_mjollnir(kickedobj))
        range = 1;

    /* see if the object has a place to move into */
    const dxTo = (u.dx | 0), dyTo = (u.dy | 0);
    const destOk = isok(x + dxTo, y + dyTo);
    const destLoc = destOk ? g.level.at(x + dxTo, y + dyTo) : null;
    if (!destOk || !destLoc || !ZAP_POS(destLoc.typ | 0) || closed_door(x + dxTo, y + dyTo))
        range = 1;

    const shkp = await find_objowner(kickedobj, x, y);
    const costly = !!(shkp && costly_spot(x, y));

    void pline(`You kick ${!isgold ? (await singular(kickedobj, doname)) : (await doname(kickedobj))}.`);

    const hereLoc = g.level.at(x, y);
    if (IS_OBSTRUCTED(hereLoc.typ | 0) || closed_door(x, y)) {
        const heroLoc = g.level.at(u.ux | 0, u.uy | 0);
        if ((!martial() && rn2(20) > (acurr(u, A_DEX) | 0))
            || IS_OBSTRUCTED(heroLoc.typ | 0) || closed_door(u.ux | 0, u.uy | 0)) {
            const Blind = _Blind_dk();
            /* C dokick.c:618-623 —
             *   if (Blind)
             *       pline("It doesn't come loose.");
             *   else
             *       pline("%s %sn't come loose.",
             *             The(distant_name(gk.kickedobj, xname)),
             *             otense(gk.kickedobj, "do"));
             * Three fabrications fixed here: the formatter is xname (not
             * doname, which would prepend the count/BUC/enchantment), the
             * result is wrapped in The(), and the verb agrees via otense --
             * so a stack renders "The arrows don't come loose." where this
             * port rendered "2 arrows doesn't come loose.".  Routing through
             * distant_name() also keeps a far kicked object undknown. */
            void pline(Blind ? "It doesn't come loose."
                              : `${The((await distant_name(kickedobj, xname)))} ${otense(kickedobj, 'do')}n't come loose.`);
            return (!rn2(3) || martial()) ? 1 : 0;
        }
        const Blind2 = _Blind_dk();
        /* C dokick.c:626-630 —
         *   if (Blind)
         *       pline("It comes loose.");
         *   else
         *       pline("%s %s loose.", The(distant_name(gk.kickedobj, xname)),
         *             otense(gk.kickedobj, "come")); */
        void pline(Blind2 ? 'It comes loose.'
                          : `${The((await distant_name(kickedobj, xname)))} ${otense(kickedobj, 'come')} loose.`);
        obj_extract_self(kickedobj);
        newsym(x, y);
        if (costly && !(costly_spot(u.ux | 0, u.uy | 0)
                        && in_rooms(u.ux | 0, u.uy | 0, SHOPBASE)[0] === in_rooms(x, y, SHOPBASE)[0])) {
            if (!kickedobj.no_charge)
                add_damage(u.ux | 0, u.uy | 0, 0); /* addtobill stub: WIRE_PENDING */
            else
                kickedobj.no_charge = 0;
        }
        if (!await flooreffects(kickedobj, u.ux | 0, u.uy | 0, 'fall')) {
            place_object(kickedobj, u.ux | 0, u.uy | 0);
            impact_disturbs_zombies(kickedobj, true);
            await stackobj(kickedobj);
            newsym(u.ux | 0, u.uy | 0);
        }
        return 1;
    }

    /* a box gets a chance of breaking open here */
    if (_ko_Is_box(kickedobj)) {
        const otrp = !!kickedobj.otrapped;
        if (range < 2)
            void pline('THUD!');
        await container_impact_dmg(kickedobj, x, y);
        if (kickedobj.olocked) {
            if (!rn2(5) || (martial() && !rn2(2))) {
                void pline('You break open the lock!');
                await breakchestlock(kickedobj, false);
                if (otrp)
                    await chest_trap(kickedobj, LEG, false);
                return 1;
            }
        } else {
            if (!rn2(3) || (martial() && !rn2(2))) {
                void pline('The lid slams open, then falls shut.');
                kickedobj.lknown = 1;
                if (otrp)
                    await chest_trap(kickedobj, LEG, false);
                return 1;
            }
        }
        if (range < 2)
            return 1;
        /* else fall through to the general cases below */
    }

    /* fragile objects should not be kicked */
    if (await hero_breaks(kickedobj, kickedobj.ox | 0, kickedobj.oy | 0, 0))
        return 1;

    /* too heavy to move: range == 2 means it may move up to one square */
    if (range < 2) {
        if (!_ko_Is_box(kickedobj))
            void pline('Thump!');
        return (!rn2(3) || martial()) ? 1 : 0;
    }

    if ((kickedobj.quan | 0) > 1) {
        if (!isgold) {
            /* C dokick.c:694 gk.kickedobj = splitobj(gk.kickedobj, 1L);  splitobj()
             * returns the SPLIT-OFF single item and leaves the original as the
             * quan-1 remainder, so C goes on to kick the one item, not the pile.
             * game.kickedobj is gk.kickedobj: js/cmd.js:3379 thitmonst reads it
             * to pick HMON_KICKED and js/mklev.js:15217 obfree clears it, so it
             * must follow the C assignment, not just the local. */
            kickedobj = (await splitobj(kickedobj, 1));
            game.kickedobj = kickedobj;
        } else {
            if (rn2(20)) {
                /* C dokick.c:697-706.  ROLL_FROM(array) is
                 * array[rn2(SIZE(array))] (hack.h:1493) and flyingcoinmsg holds
                 * three strings, so C DRAWS rn2(3) here -- between the rn2(20)
                 * above and the rnd(3) below, both of which this port already
                 * made.  Omitting it desynchronised every gold-stack kick by one
                 * draw (Cardinal Rule 2) and picked the wrong message 2 times
                 * in 3. */
                if (!_Deaf_dk())
                    void pline('Thwwpingg!');
                void pline(`You ${_KO_FLYINGCOINMSG[rn2(3)]}!`);
                void await scatter(x, y, rnd(3), VIS_EFFECTS | MAY_HIT, kickedobj);
                newsym(x, y);
                return 1;
            }
            if ((kickedobj.quan | 0) > 300) {
                void pline('Thump!');
                return (!rn2(3) || martial()) ? 1 : 0;
            }
        }
    }

    if (slide && !_Blind_dk())
        void pline('Whee!  It slides across the floor.');

    obj_extract_self(kickedobj);
    await snuff_candle(kickedobj);
    newsym(x, y);

    let bx = x, by = y, bRange = range - 1, mon = null;
    while (bRange-- > 0) {
        const nx = bx + dxTo, ny = by + dyTo;
        if (!isok(nx, ny))
            break;
        bx = nx; by = ny;
        const bloc = g.level.at(bx, by);
        if (IS_WATERWALL(bloc.typ | 0) || (bloc.typ | 0) === LAVAWALL)
            break;
        mon = m_at(bx, by);
        if (mon)
            break;
        /* C zap.c:4076-4080 bhit(): a wall/stone or closed door stops the
         * object and bhitpos backs up one square. */
        if (!ZAP_POS(bloc.typ | 0) || closed_door(bx, by)) {
            bx -= dxTo; by -= dyTo;
            break;
        }
    }
    g.gb = g.gb || {};
    g.gb.bhitpos = { x: bx, y: by };

    if (mon) {
        if (mon.isshk && (kickedobj.where | 0) === 4 /* OBJ_MINVENT */
            && kickedobj.ocarry === mon)
            return 1; /* alert shk caught it */
        g.notonhead = ((bx | 0) !== (mon.mx | 0) || (by | 0) !== (mon.my | 0));
        if (isgold) {
            if (await ghitm(mon, kickedobj))
                return 1; /* gold was caught */
        } else if (await thitmonst(mon, kickedobj))
            return 1;
    }

    if ((kickedobj.where | 0) === 5 /* OBJ_MIGRATING */)
        return 1;

    if (await flooreffects(kickedobj, bx, by, 'fall'))
        return 1;
    place_object(kickedobj, bx, by);
    impact_disturbs_zombies(kickedobj, true);
    await stackobj(kickedobj);
    newsym(bx, by);
    return 1;
}

export async function dokick_resolve() {
    const g = game;
    const u = g.u || {};
    const dx = (u.dx | 0), dy = (u.dy | 0);
    const x = (u.ux | 0) + dx;
    const y = (u.uy | 0) + dy;
    /* C ref: dokick.c:1325 — gk.kickedloc.x = x, gk.kickedloc.y = y. Records the
     * square the hero kicked so this turn's movemon lets pets avoid it
     * (m_avoid_kicked_loc, monmove.c:1323). gk.kickedloc is a real struct field
     * (decl.c:436, init {0,0} in newgame); reset to (0,0) at end of domove
     * (hack.c:2717) and by the next non-kick time-consuming command (cmd.c:4497). */
    g.kickedloc.x = x; g.kickedloc.y = y;
    /* C: avrg_attrib = (uarmf==KICKING_BOOTS) ? 99
     *                : (ACURRSTR + ACURR(A_DEX) + ACURR(A_CON)) / 3 */
    let avrg_attrib;
    const uarmf = u.uarmf ?? null;
    /* KICKING_BOOTS otyp not surfaced; treat as non-kicking-boots (WIRE_PENDING). */
    if (uarmf && (uarmf.otyp | 0) === _KM_KICKING_BOOTS) {
        avrg_attrib = 99;
    }
    else {
        avrg_attrib = Math.trunc((acurrstr(u) + (acurr(u, A_DEX) | 0)
            + (acurr(u, A_CON) | 0)) / 3);
    }
    /* C dokick.c:1339-1352 — swallowed: rn2(3) picks the flavour message;
     * case 1 falls through to the default arm unless the engulfer digests
     * (mondata.h digests() = AT_ENGL/AD_DGST).  Pit: Passes_walls hero only. */
    if (u.uswallow) {
        switch (rn2(3)) {
        case 0:
            await pline(`You can't move your ${body_part(LEG)}!`);
            break;
        case 1:
            if (attacktype_fordmg(u.ustuck.data, 11, 26)) {
                await pline(`${_km_Monnam(u.ustuck)} burps loudly.`);
                break;
            }
            /* FALLTHRU */
        default:
            await pline('Your feeble kick has no effect.');
            break;
        }
        return ECMD_TIME;
    } else if (u.utrap && (u.utraptype | 0) === TT_PIT) {
        await pline('You kick at the side of the pit.');
        return ECMD_TIME;
    }
    if (Levitation_dk(u)) {
        const xx = (u.ux | 0) - dx;
        const yy = (u.uy | 0) - dy;
        const behind = isok(xx, yy) ? g.level?.at(xx, yy) : null;
        if (isok(xx, yy) && behind
            && !IS_OBSTRUCTED(behind.typ | 0)
            && !IS_DOOR(behind.typ | 0)
            && (!Is_airlevel(u.uz) || !obj_at(xx, yy))) {
            void pline('You have nothing to brace yourself against.');
            return ECMD_OK;
        }
    }
    const isokTarget = (x >= 0 && x < 80 && y >= 0 && y < 21);
    const mtmp = isokTarget ? m_at(x, y) : null;
    /* C dokick.c:1370-1378 -- "might not kick monster if it is hidden and
     * becomes revealed, if it is peaceful and player declines to attack, or if
     * the hero passes out due to encumbrance with low hp; svc.context.move will
     * be 1 unless player declines to kick peaceful monster". */
    let oldInvis = false;
    if (mtmp) {
        oldInvis = glyph_is_invisible_at(x, y);
        if (!await maybe_kick_monster(mtmp, x, y))
            return (g.context.move ? ECMD_TIME : ECMD_OK);
        /* A TAME target that survives maybe_kick_monster goes on to
         * kick_monster like any other (dokick.c:1383 onward); kickdmg's pet arm
         * is abuse_dog() (dog.c:1381), and yelp()/m_unleash() are real bodies
         * now (js/mhitm.js yelp, js/dog.js m_unleash). */
    }
    /* C dokick.c:1383 — wake_nearby(FALSE), before the engraving is wiped. */
    {
        const u = game.u || {};
        wake_nearto(u.ux | 0, u.uy | 0, (u.ulevel | 0) * 20);
    }
    u_wipe_engr(2);
    if (!isokTarget) {
        await kick_ouch(x, y, "");
        return ECMD_TIME;
    }
    const maploc = g.level?.at(x, y);
    /* C dokick.c:1404-1442 -- the first of the five ordered tests: monsters. */
    if (mtmp) {
        await kick_monster(mtmp, x, y);
        /* see comment in attack_checks() */
        if ((mtmp.mhp | 0) < 1) {
            /* C dokick.c:1411-1417 -- if we mapped an invisible monster and
             * immediately killed it, we don't want to forget what we thought
             * was there before the kick.  C compares glyph_at() before and
             * after and calls show_glyph(x, y, oldglyph); js/ has no
             * glyph_at()/show_glyph(x,y,glyph) pair, and the channel the marker
             * actually lives in is loc.remembered_glyph, so the same question
             * is "did THIS kick plant the 'I'?" and the same undo is
             * unmap_invisible(), which restores the remembered square. */
            if (!oldInvis && glyph_is_invisible_at(x, y))
                unmap_invisible(x, y);
        } else if (!canspotmon(mtmp)
                   /* check <x,y>; monster that evades kick by jumping
                      to an unseen square doesn't leave an I behind */
                   && (mtmp.mx | 0) === x && (mtmp.my | 0) === y
                   && !glyph_is_invisible_at(x, y)
                   && !((u.uswallow | 0) && u.ustuck === mtmp)) {
            map_invisible(x, y);
        }
        /* C dokick.c:1427-1440 -- recoil if floating */
        if ((Is_airlevel(u.uz) || Levitation_dk(u)) && g.context.move) {
            let range = ((g.youmonst?.data?.cwt | 0) + (weight_cap() + inv_weight()));
            if (range < 1)
                range = 1; /* divide by zero avoidance */
            range = Math.trunc((3 * (mtmp.data?.cwt | 0)) / range);
            if (range < 1)
                range = 1;
            await hurtle(-(u.dx | 0), -(u.dy | 0), range, true);
        }
        return ECMD_TIME;
    }
    unmap_invisible(x, y);
    /* C: pools/lava splash (XOR u.uinwater) */
    if ((is_pool(x, y) || (maploc && maploc.typ === LAVAWALL))
        && !(u.uinwater)) {
        void pline(`You splash some ${is_pool(x, y) ? "water" : "lava"} around.`);
        return ECMD_TIME;
    }
    const objHere = obj_at(x, y);
    if (objHere) {
        let hasBoulder = false;
        for (let o = objHere; o; o = o.nexthere)
            if ((o.otyp | 0) === _KO_BOULDER_OTYP) { hasBoulder = true; break; }
        if (!Levitation_dk(u) || Is_airlevel(u.uz) || hasBoulder) {
            if (await kick_object(x, y)) {
                if (Is_airlevel(u.uz)) {
                    /* hurtle(-u.dx, -u.dy, 1, TRUE) -- WIRE_PENDING, same
                     * hurtle gap as kick_dumb/kick_ouch above. */
                }
                return ECMD_TIME;
            }
            await kick_ouch(x, y, "");
            return ECMD_TIME;
        }
    }
    /* C: IS_DOOR → kick_door; else kick_nondoor */
    if (maploc && IS_DOOR(maploc.typ)) {
        await kick_door(x, y, avrg_attrib);
        return ECMD_TIME;
    }
    return await kick_nondoor(x, y, avrg_attrib);
}
function u_wipe_engr(cnt) {
    const u = game.u || {};
    if (can_reach_floor(true))
        wipe_engr_at(u.ux | 0, u.uy | 0, cnt, false);
}
function can_reach_floor(_check_pit) {
    const u = game.u || {};
    if (u.uswallow || u.usteed || u.uundetected) return false;
    return true;
}

/* C ref: dbridge.c:169-173 is_db_wall(x, y) — verify drawbridge wall is UP.
 * RNG: none. Return boolean (drawbridge wall typ). */
export function is_db_wall(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    return (loc.typ | 0) === DBWALL;
}
/* C ref: objnam.c:5400-5417 rnd_class(first, last) — weighted random object type.
 * RNG: rnd(sum) if sum != 0, else rn1(last-first+1, first).
 * Inlined locally because objnam.js is not yet ported.
 * WIRE_PENDING: replace with import from objnam.js when ported. */
function _rnd_class(first, last) {
    if (last > first) {
        /* C: compute sum of oc_prob for range — objects table not available yet.
         * Assume sum = 0 (equal probability fallback: rn1(last-first+1, first)). */
        /* WIRE_PENDING: import objects[] table and compute sum properly */
        return rn1(last - first + 1, first);
    }
    return (first === last) ? first : 0; /* STRANGE_OBJECT = 0 */
}
/* C ref: dokick.c:1510-1631 impact_drop(missile, x, y, dlev)
 * Player or missile impacts location, causing objects to fall down.
 * RNG: rn2(obj->otyp == BOULDER ? 30 : 3) for each object in pile. */
export async function impact_drop(missile, x, y, dlev) {
    const g = game;
    const u = g.u || {};

    /* Constants from C */
    const ROCK = 474;
    const BOULDER = 475;
    const COIN_CLASS = 12;
    /* MIGR_WITH_HERO now comes from ./const.js (=9, dungeon.h:156).  A local
     * `= 8` copy here was MIGR_PORTAL's value.  A local `SHOPBASE = 12` copy
     * sat here too; mkroom.h:66 has SHOPBASE = 14, and const.js already
     * exports the right value, so the shadow is gone. */
    const PL_NSIZ = 32;

    if (!obj_at(x, y))
        return;

    let toloc = down_gate(x, y);
    let cc = { x: 0, y: 0 };
    drop_to(cc, toloc, x, y); /* drop_to fills cc via side-effect */
    /* C's obj_delivery() destination remains valid for a falling call even
     * when the replay bridge lacks dungeon-topology metadata and drop_to()
     * conservatively treats the level as a bottom level. */
    if (!cc.y && dlev && toloc === MIGR_RANDOM) {
        cc.x = u.uz?.dnum ?? 0;
        cc.y = u.uz?.dlevel ?? 0;
    }
    if (!cc.y)
        return;

    if (dlev) {
        /* send objects next to player falling through trap door.
         * checked in obj_delivery(). */
        toloc = MIGR_WITH_HERO;
        cc.y = dlev;
    }

    let costly = costly_spot(x, y);
    let price = 0, debit = 0, robbed = 0;
    let angry = false;
    let shkp = null;
    /* if 'costly', we must keep a record of ESHK(shkp) before
     * it undergoes changes through the calls to stolen_value.
     * the angry bit must be reset, if needed, in this fn, since
     * stolen_value is called under the 'silent' flag to avoid
     * unsavory pline repetitions. */
    if (costly) {
        let roomno = in_rooms(x, y, SHOPBASE);
        shkp = shop_keeper(roomno); /* C: shop_keeper(*in_rooms(...)) */
        if (shkp) {
            let eshk = shkp.mextra?.eshk;
            if (eshk) {
                debit = eshk.debit || 0;
                robbed = eshk.robbed || 0;
            }
            angry = !shkp.mpeaceful;
        }
    }

    let isrock = (missile && missile.otyp === ROCK);
    let oct = 0, dct = 0;
    let obj = obj_at(x, y);
    while (obj) {
        let obj2 = obj.nexthere;
        if (obj === missile) {
            obj = obj2;
            continue;
        }
        /* number of objects in the pile */
        oct += obj.quan;
        if (obj === u.uball || obj === u.uchain) {
            obj = obj2;
            continue;
        }
        /* boulders can fall too, but rarely & never due to rocks */
        if ((isrock && obj.otyp === BOULDER)
            || rn2(obj.otyp === BOULDER ? 30 : 3)) {
            obj = obj2;
            continue;
        }
        obj_extract_self_general(obj);

        if (costly) {
            /* C: stolen_value(obj, x, y,
             *     (costly_spot(u.ux, u.uy)
             *      && strchr(u.urooms, *in_rooms(x, y, SHOPBASE))),
             *     TRUE); */
            let in_shop = (costly_spot(u.ux, u.uy)
                           && strchr(u.urooms, in_rooms(x, y, SHOPBASE)));
            price += (await stolen_value(obj, x, y, in_shop, true));
            /* set obj->no_charge to 0 */
            if (Has_contents(obj))
                picked_container(obj); /* does the right thing */
            if (obj.oclass !== COIN_CLASS)
                obj.no_charge = 0;
        }

        add_to_migration(obj);
        obj.ox = cc.x;
        obj.oy = cc.y;
        obj.owornmask = toloc;

        /* number of fallen objects */
        dct += obj.quan;

        obj = obj2;
    }

    if (dct && cansee(x, y)) { /* at least one object fell */
        let what = (dct === 1 ? "object falls" : "objects fall");

        if (missile) {
            let prefix = (dct === oct ? "the " : dct === 1 ? "an" : "");
            await pline("From the impact, %sother %s.", prefix, what);
        } else if (oct === dct) {
            await pline("%s adjacent %s %s.",
                  dct === 1 ? "The" : "All the", what,
                  g.gg?.gate_str);
        } else {
            await pline("%s adjacent %s %s.",
                  dct === 1 ? "One of the" : "Some of the",
                  dct === 1 ? "objects falls" : what, g.gg?.gate_str);
        }
    }

    if (costly && shkp && price) {
        let eshk = shkp.mextra?.eshk;
        if (eshk) {
            if (eshk.robbed > robbed) {
                await pline("You removed %ld %s worth of goods!", price, currency(price));
                if (cansee(shkp.mx, shkp.my)) {
                    if ((eshk.customer || "")[0] === undefined || (eshk.customer || "").charCodeAt(0) === 0) {
                        /* C: strncpy(ESHK(shkp)->customer, svp.plname, PL_NSIZ) */
                        eshk.customer = (u.plname || "").slice(0, PL_NSIZ);
                    }
                    if (angry)
                        await pline("%s is infuriated!", Shknam(shkp));
                    else
                        await pline("\"%s, you are a thief!\"", u.plname);
                } else {
                    await You_hear("a scream, \"Thief!\"");
                }
                hot_pursuit(shkp);
                await mklev_angry_guards(false);
                return;
            }
            if (eshk.debit > debit) {
                let amt = eshk.debit - debit;
                await pline("You owe %s %ld %s for goods lost.", shkname(shkp), amt,
                    currency(amt));
            }
        }
    }
}

function on_level(a, b) {
    return a && b && a.dnum === b.dnum && a.dlevel === b.dlevel;
}
export function down_gate(x, y) {
    const g = game;
    const u = g.u || {};
    /* MIGR_* all come from ./const.js, which mirrors dungeon.h:149-163 exactly
     * (NOWHERE -1, RANDOM 0, STAIRS_UP 3, LADDER_UP 5, SSTAIRS 7).  The local
     * copies here used a private renumbering (RANDOM 1 / STAIRS_UP 2 /
     * LADDER_UP 3 / SSTAIRS 4) that ship_object()'s own MIGR_NOWHERE = 0
     * disagreed with. */
    const TRAPDOOR = 14;
    g.gg = g.gg || {};
    g.gg.gate_str = null;
    /* this matches the player restriction in goto_level() */
    if (on_level(u.uz, g.qstart_level) && !ok_to_quest()) {
        return MIGR_NOWHERE;
    }
    let stway = stairway_at(x, y);
    if (stway && !stway.up && !stway.isladder) {
        g.gg.gate_str = "down the stairs";
        return (stway.tolev.dnum === u.uz.dnum) ? MIGR_STAIRS_UP : MIGR_SSTAIRS;
    }
    if (stway && !stway.up && stway.isladder) {
        g.gg.gate_str = "down the ladder";
        return MIGR_LADDER_UP;
    }
    let ttmp = t_at(x, y);
    if (ttmp && ttmp.tseen && is_hole(ttmp.ttyp)) {
        g.gg.gate_str = (ttmp.ttyp === TRAPDOOR) ? "through the trap door" : "through the hole";
        return MIGR_RANDOM;
    }
    return MIGR_NOWHERE;
}
function drop_to(cc, loc, x, y) {
    const g = game;
    const u = g.u || {};
    let stway = stairway_at(x, y);
    switch (loc) {
    case MIGR_RANDOM: /* trap door or hole */
        /* C dokick.c:1477-1491.  Only the Is_stronghold and In_endgame ||
         * Is_botlevel arms `break`; every other level FALLS THROUGH into the
         * stairs cases below.  The old code broke unconditionally with (0,0),
         * so ship_object()'s `if (!cc.y) return FALSE` fired on every trap
         * door / hole and objects never shipped down one. */
        if (Is_stronghold(u.uz)) {
            /* C hack.h:396 valley_level — set in dungeon_rng.js:520 */
            const vl = g.valley_level;
            cc.x = vl ? vl.dnum : 0;
            cc.y = vl ? vl.dlevel : 0;
            break;
        } else if (In_endgame(u.uz) || Is_botlevel(u.uz)) {
            cc.y = cc.x = 0;
            break;
        }
    /* FALLTHRU */
    case MIGR_STAIRS_UP:
    case MIGR_LADDER_UP:
    case MIGR_SSTAIRS:
        if (stway) {
            cc.x = stway.tolev.dnum;
            cc.y = stway.tolev.dlevel;
        } else {
            cc.x = u.uz.dnum;
            cc.y = u.uz.dlevel + 1;
        }
        break;
    default:
    case MIGR_NOWHERE: /* C dokick.c:1501-1503 — y==0 means "nowhere" */
        cc.y = cc.x = 0;
        break;
    }
}

export async function ship_object(otmp, x, y, shop_floor_obj) {
    const g = game;
    const u = g.u || {};
    /* SHOPBASE comes from const.js (mkroom.h:66 = 14); the local `= 12` copy
     * that used to be declared here shadowed it with a wrong value. */
    const BOULDER = 475, COIN_CLASS = 12;
    /* C dokick.c:1717-1723 tests `objects[otyp].oc_material == GLASS`,
     * `otyp == EXPENSIVE_CAMERA`, `otyp == MIRROR` and `otyp == EGG`.  All four
     * values here were from a stale index space, so the whole crash/splat
     * branch below was mis-wired: */
    const MIRROR = 230,           /* objects.h TOOL() MIRROR;            was 68  = BILL_GUISARME */
        EXPENSIVE_CAMERA = 229,   /* objects.h TOOL() EXPENSIVE_CAMERA;  was 224 = TALLOW_CANDLE */
        EGG = 266,                /* objects.h FOOD() EGG;               was 274 = GLOB_OF_BLACK_PUDDING */
        GLASS = 19;               /* objclass.h obj_material_types GLASS — a MATERIAL id, not an
                                   * otyp (this is an oc_material comparison);  was 4 = FLESH */

    if (!otmp)
        return false;

    let toloc = down_gate(x, y);
    if (toloc === MIGR_NOWHERE)
        return false;

    let cc = { x: 0, y: 0 };
    drop_to(cc, toloc, x, y);
    if (!cc.y)
        return false;

    let nodrop = (otmp === u.uball) || (otmp === u.uchain)
                 || (toloc !== MIGR_LADDER_UP && rn2(3));

    let container = Has_contents(otmp);
    let unpaid = is_unpaid(otmp);

    let impact = false, chainthere = false, n = 0;

    if (obj_at(x, y)) {
        let obj = obj_at(x, y);
        while (obj) {
            if (obj === u.uchain)
                chainthere = true;
            else if (obj !== otmp)
                n += obj.quan;
            obj = obj.nexthere;
        }
        if (n)
            impact = true;
    }

    let t = t_at(x, y);
    if (otmp.otyp === BOULDER && t && is_hole(t.ttyp)) {
        if (impact)
            await impact_drop(otmp, x, y, 0);
        return false;
    }

    if (cansee(x, y))
        otransit_msg(otmp, nodrop, chainthere, n);

    if (nodrop) {
        if (impact) {
            await impact_drop(otmp, x, y, 0);
            maybe_unhide_at(x, y);
        }
        return false;
    }

    if (unpaid || shop_floor_obj) {
        if (unpaid) {
            void (await stolen_value(otmp, u.ux, u.uy, true, false));
        } else {
            let ox = otmp.ox, oy = otmp.oy;
            void (await stolen_value(
                otmp, ox, oy,
                (costly_spot(u.ux, u.uy)
                 && strchr(u.urooms, in_rooms(ox, oy, SHOPBASE))),
                false));
        }
        if (container)
            picked_container(otmp);
        if (otmp.oclass !== COIN_CLASS)
            otmp.no_charge = 0;
    }

    if (otmp.owornmask)
        await remove_worn_item(otmp, true);

    if (breaktest(otmp)) {
        let result;
        if ((MKOBJ_OC_MATERIAL[otmp.otyp] | 0) === GLASS
            || otmp.otyp === EXPENSIVE_CAMERA) {
            if (otmp.otyp === MIRROR)
                change_luck(-2);
            result = "crash";
        } else {
            if (otmp.otyp === EGG && otmp.spe && ismnum(otmp.corpsenm))
                change_luck(-Math.min(otmp.quan, 5));
            result = "splat";
        }
        if (otmp.otyp === EGG)
            Soundeffect(se_egg_splatting, 25);
        else
            Soundeffect(se_glass_crashing, 25);
        await You_hear("a muffled %s.", result);
        obj_extract_self(otmp);
        await obfree(otmp, null);
        return true;
    }

    add_to_migration(otmp);
    otmp.ox = cc.x;
    otmp.oy = cc.y;
    otmp.owornmask = toloc;

    if (otmp.otyp === BOULDER)
        otmp.otrapped = 0;

    if (impact) {
        await impact_drop(otmp, x, y, 0);
        newsym(x, y);
    }
    return true;
}

/* Unported helper stubs — these must throw; stubbing with no-op breaks state invariants. */
export { obj_extract_self } from './mklev.js';
export { add_to_minv } from './mklev.js';
function upstart(s) { if (s && s.length > 0) { const c = s.charCodeAt(0); return ((c >= 97 && c <= 122) ? String.fromCharCode(c - 32) : s.charAt(0)) + s.slice(1); } return s; }
/* christen_monst — C ref: nethack-c/src/do_name.c:30-46 new_mgivenname
 * (inlined) + nethack-c/src/do_name.c:132-153 christen_monst. Local copy
 * (this file's existing pattern for rndorcname/upstart above — stubs kept
 * local rather than shared across files), NOT a duplicate of the flat
 * `mtmp.mname` write this replaces: 3.7 renamed mname to
 * mextra->mgivenname, and C's new_mgivenname allocates mextra/MGIVENNAME
 * unconditionally when lth>0 — that allocation, not the string content,
 * is what flips has_mgivenname/mextra_present. */
function christen_monst(mtmp, name) {
    const PL_PSIZ = 63;
    let lth = (name && name.length > 0) ? (name.length + 1) : 0;
    if (lth > PL_PSIZ) {
        lth = PL_PSIZ;
        name = name.substring(0, PL_PSIZ - 1);
    }
    if (lth) {
        /* new_mgivenname: allocate mextra if necessary */
        if (!mtmp.mextra)
            mtmp.mextra = newmextra();
        mtmp.mextra.mgivenname = name; /* C: Strcpy(MGIVENNAME(mtmp), name) */
    } else if (has_mgivenname(mtmp) && mtmp.mextra) {
        mtmp.mextra.mgivenname = null;
    }
    return mtmp;
}

export function christen_orc(mtmp, gang, other) {
    const BUFSZ = 256;
    /* C do_name.c:1560 `orcname = rndorcname(buf2)` — a `char buf2[BUFSZ]`,
     * i.e. non-NULL, so the name-building loop always runs.  js/mhitm.js's port
     * tests `s !== null && s !== undefined` (an empty C buffer is ""), so the
     * argument is load-bearing: calling it bare skips the loop and drops
     * 2*iend-1 draws. */
    let orcname = rndorcname("");
    let sz = orcname.length;
    if (gang)
        sz += gang.length + 4; /* sizeof " of " - sizeof "" = 4 */
    else if (other)
        sz += other.length;

    if (sz < BUFSZ) {
        let nameit = false;
        let buf;
        if (gang) {
            buf = upstart(orcname) + " of " + upstart(gang);
            nameit = true;
        } else if (other) {
            buf = upstart(orcname) + other;
            nameit = true;
        }
        if (nameit)
            mtmp = christen_monst(mtmp, buf);
    }
    return mtmp;
}
export function free_oname(otmp) {
    if (otmp.oextra)
        otmp.oextra.oname = null;
    if (Object.prototype.hasOwnProperty.call(otmp, 'oextra_oname_present'))
        otmp.oextra_oname_present = 0;
    otmp.oname = null;
    otmp.oxlth = 0;
}
export function Shknam(shkp) { return shk_Shknam(shkp); }
/* add_to_migration (C mkobj.c:2697-2717) and mksobj_migr_to_species
 * (C mkobj.c:252-266) live in js/mklev.js, this port's mkobj.c host — next to
 * mksobj(), which they are built out of.  They used to be throwing stubs HERE
 * because this file owns the rest of the migration machinery (obj_extract_self,
 * deliver_obj_to_mon, add_to_minv); re-exported so this file's own callers
 * (the kick-to-another-level path above) and js/mkmaze.js both resolve the ONE
 * body.  Same convention as is_unpaid / maybe_unhide_at below. */
export { add_to_migration, mksobj_migr_to_species };
/* mon.c:5710 angry_guards — expose the canonical mklev implementation rather
 * than retaining a throwing shadow for external callers. */
export async function angry_guards(flag) { return await mklev_angry_guards(flag); }
export function costly_spot(x, y) {
    return shk_costly_spot(x, y);
}
export function currency(amt) { return cmd_currency(amt); }
export function hot_pursuit(shkp) { return shk_hot_pursuit(shkp); }
/* is_unpaid (C shk.c:1166) and maybe_unhide_at (C mon.c:4687) are re-exported
 * at the top of this file from js/shk.js and js/mklev.js respectively, which
 * hold the single real ports.  The throwing stubs that used to sit here were
 * SHADOWS: they made this file's own calls (dokick.js:937, dokick.js:967) and
 * js/makemon.js:3473 throw even though the functions were already ported. */
/* C shk.c owns the single disposal body; retain this public alias. */
export { obfree } from './shk.js';
/* C sounds.h Soundeffect(se, vol) -- audio only; it touches no game state and
 * draws no RNG, so a no-op IS the port.  Same reading as js/were.js:222,
 * js/dig.js:918 and js/mklev.js:14512.  The two ids are the ones ship_object's
 * break arm passes (sounds.h se_egg_splatting / se_glass_crashing); they are
 * opaque enum members and never compared, so their VALUES are unobservable --
 * they exist only so the call keeps C's shape. */
const se_egg_splatting = 0, se_glass_crashing = 0;
function Soundeffect(senum, vol) { /* audio only -- no state, no RNG */ }

/* C pline.c:436 You_hear(line, ...)
 *
 *     if ((Deaf && !Unaware) || !flags.acoustics) return;
 *     Underwater ? "You barely hear " : Unaware ? "You dream that you hear "
 *                                               : "You hear "
 *
 * Imported from js/display.js now.  The closing line of the note that used to
 * sit here read "There is no shared You_hear export in the tree; six modules
 * each carry a local one, and this is the seventh (see fleet feedback)."  There
 * were eleven by the time they were counted; there is one.
 */

export function otransit_msg(otmp, nodrop, chainthere, num) {
    const g = game;
    let optr, obuf, xbuf;

    if (otmp.otyp === CORPSE_DK) {
        /* Tobjnam() calls xname() and would yield "The corpse";
           we want more specific "The newt corpse" or "Medusa's corpse" */
        optr = upstart(corpse_xname(otmp, null, CXN_PFX_THE));
    } else {
        optr = Tobjnam(otmp, null);
    }
    obuf = optr;

    if (num || chainthere) {
        /* As of 3.6.2: use a separate buffer for the suffix to avoid risk of
           overrunning obuf[] (let pline() handle truncation if necessary) */
        if (num) { /* means: other objects are impacted */
            xbuf = " " + otense(otmp, "hit") + " "
                   + ((num === 1) ? "another" : "other") + " object"
                   + ((num > 1) ? "s" : "");
        } else { /* chain-only msg */
            xbuf = " " + otense(otmp, "rattle") + " your chain";
        }
        if (nodrop)
            xbuf += ".";
        else
            xbuf += " and " + otense(otmp, "fall") + " " + g.gg.gate_str + ".";
        pline("%s%s", obuf, xbuf);
    } else if (!nodrop)
        pline("%s %s %s.", obuf, otense(otmp, "fall"), g.gg.gate_str);
}
/* C ref: shk.c:3084-3100 picked_container(struct obj *obj)
 *
 *     for (otmp = obj->cobj; otmp; otmp = otmp->nobj) {
 *         if (otmp->oclass == COIN_CLASS) continue;
 *         if (otmp->no_charge) otmp->no_charge = 0;
 *         if (Has_contents(otmp)) picked_container(otmp);
 *     }
 *
 * "the top container is treated in the calling fn" — this clears the
 * shop no_charge flag on the CONTENTS only, recursively.  RNG-free, no
 * messages.  It was a throw stub, which made dog.c:733 mon_leave()
 * unlandable: mon_leave walks a departing monster's minvent and calls this
 * for every container it carries, so a migrating monster with a sack would
 * have halted the replay instead of leaving the level. */
export function picked_container(obj) {
    const COIN_CLASS_PC = 12; /* objclass.h COIN_CLASS */
    for (let otmp = obj?.cobj; otmp; otmp = otmp.nobj) {
        if ((otmp.oclass | 0) === COIN_CLASS_PC)
            continue;
        if (otmp.no_charge)
            otmp.no_charge = 0;
        if (Has_contents(otmp))
            picked_container(otmp);
    }
}
/* C ref: shknam.c:855-897 shkname(mtmp) — the shopkeeper's own name from
 * ESHK(mtmp)->shknam, with any non-letter prefix character stripped (the
 * leading '-'/'+'/'=' markers that flag a player-name-derived shk name).
 * The Hallucination arm draws rn2 twice (random shop type, random name from
 * its list); it is not ported, so it throws rather than silently returning the
 * true name and skipping two RNG draws. */
export function shkname(mtmp) {
    /* C shknam.c:874-890: Hallucination (HHallucination && !Halluc_resistance)
     * and not gameover picks a random shop type, then a random name from its
     * list (two rn2 draws, js/mklev.js shkname_halluc_pick). */
    const hp = game.u?.uprops?.[HALLUC];
    const hr = game.u?.uprops?.[24]; /* HALLUC_RES */
    let shknm = mtmp?.mextra?.eshk?.shknam;
    if (hp && (hp.intrinsic | 0) && !((hr?.intrinsic | 0) || (hr?.extrinsic | 0))
        && !game.program_state?.gameover) {
        const pick = shkname_halluc_pick();
        if (pick)
            shknm = pick;
    }
    if (typeof shknm !== 'string' || !shknm.length) {
        /* C shknam.c:867-868 panics here ("shopkeeper lacks 'eshk' data").
         * A corrupt-state panic is not worth discarding a whole replay for;
         * fall back to the generic name x_monnam would otherwise produce. */
        return 'the shopkeeper';
    }
    /* C: if (!letter(*shknm)) ++shknm; — hacklib.c letter() is alpha only. */
    return /^[A-Za-z]/.test(shknm) ? shknm : shknm.slice(1);
}
export async function stolen_value(obj, x, y, in_shop, silent) {
    /* C shk.c:3755-3850.  Kick paths reach the ordinary billable-object arm:
     * settle the object's charge against the shopkeeper's debit when the
     * hero remains in the shop, or record it as robbed after it leaves. */
    if (!obj)
        return 0;
    const rooms = in_rooms(x, y, SHOPBASE);
    const roomno = rooms.length ? rooms[0] : 0;
    const shkpBox = { value: null };
    let value = 0;
    const bpShkp = roomno ? shop_keeper(roomno) : null;
    const existing = bpShkp ? (await onbill(obj, bpShkp, true)) : null;
    if (existing) {
        value = (existing.bquan | 0) * (existing.price | 0);
    } else if ((await billable(shkpBox, obj, roomno, true))) {
        const shkp = shkpBox.value;
        if ((obj.oclass | 0) === _KO_COIN_CLASS)
            value = obj.quan | 0;
        else
            value = get_pricing_units(obj) * get_cost(obj, shkp);
        if (value > 0) {
            const eshk = shkp.mextra?.eshk
                || ((shkp.mextra ||= {}).eshk = {});
            if (in_shop)
                eshk.debit = (eshk.debit | 0) + value;
            else
                eshk.robbed = (eshk.robbed | 0) + value;
        }
    }
    /* C's messages are asynchronous in this port; billing state is the
     * observable part needed by the surrounding kick/migration path. */
    void silent;
    return value;
}

/* C ref: dokick.c:1853-1906 deliver_obj_to_mon(mtmp, cnt, deliverflags)
 * Deliver migrating objects to a monster if they match the species.
 * RNG: rnd(cnt) — if DF_RANDOM and cnt > 1
 *      rn2(2)  — orc name theft random decision
 * Walks gm.migrating_objs chain, filters by MIGR_TO_SPECIES + mflags2 match,
 * and delivers matching objects to mtmp's inventory via add_to_minv. */
export async function deliver_obj_to_mon(mtmp, cnt, deliverflags) {
    const g = game;
    const u = g.u;

    /* M2_* monster flag constants for DELIVER_PM bitmask */
    const M2_UNDEAD = 0x00000002;
    const M2_WERE = 0x00000004;
    const M2_HUMAN = 0x00000008;
    const M2_ELF = 0x00000010;
    const M2_DWARF = 0x00000020;
    const M2_GNOME = 0x00000040;
    const M2_ORC = 0x00000080;
    const M2_DEMON = 0x00000100;
    const M2_GIANT = 0x00002000;

    const DF_RANDOM = 0x01;
    const DF_ALL = 0x04;
    const DELIVER_PM = M2_UNDEAD | M2_WERE | M2_HUMAN | M2_ELF | M2_DWARF
                    | M2_GNOME | M2_ORC | M2_DEMON | M2_GIANT;

    let maxobj = 1;
    let at_crime_scene = In_mines(u.uz);

    if ((deliverflags & DF_RANDOM) && cnt > 1)
        maxobj = rnd(cnt);
    else if (deliverflags & DF_ALL)
        maxobj = 0;
    else
        maxobj = 1;

    cnt = 0;
    let otmp = g.gm.migrating_objs;
    while (otmp) {
        const otmp2 = otmp.nobj;
        const where = (otmp.owornmask | 0) & 0x7FFF;

        if ((where & MIGR_TO_SPECIES) === 0) {
            otmp = otmp2;
            continue;
        }

        if (otmp.migr_species !== NON_PM
            && ((mtmp.data.mflags2 | 0) & DELIVER_PM)
                === (otmp.migr_species | 0)) {
            obj_extract_self(otmp);
            otmp.owornmask = 0;
            otmp.ox = 0;
            otmp.oy = 0;

            /* special treatment for orcs and their kind */
            if (((otmp.corpsenm | 0) & M2_ORC) !== 0 && has_oname(otmp)) {
                if (!has_mgivenname(mtmp)) {
                    if (at_crime_scene || !rn2(2))
                        mtmp = christen_orc(mtmp,
                                            at_crime_scene ? ONAME(otmp)
                                                           : null,
                                            " the Fence");
                }
                free_oname(otmp);
            }
            otmp.migr_species = NON_PM;
            otmp.omigr_from_dnum = 0;
            otmp.omigr_from_dlevel = 0;
            await add_to_minv(mtmp, otmp);
            cnt++;
            if (maxobj && cnt >= maxobj)
                break;
        }

        otmp = otmp2;
    }
}
/* C ref: dbridge.c:115-128 db_under_typ(mask) — get terrain under a drawbridge.
 * RNG: none. Return schar (terrain type: ICE, LAVAPOOL, MOAT, or STONE). */
export function db_under_typ(mask) {
    const m = (mask & DB_UNDER) | 0;
    switch (m) {
    case DB_ICE:
        return ICE;
    case DB_LAVA:
        return LAVAPOOL;
    case DB_MOAT:
        return MOAT;
    default:
        return STONE;
    }
}
/* C ref: dbridge.c:37-43 is_waterwall(x, y) — check if location is a waterwall.
 * RNG: none. Return boolean. */
export function is_waterwall(x, y) {
    if (isok(x, y)) {
        const loc = game.level?.at(x, y);
        if (loc && IS_WATERWALL(loc.typ)) {
            return true;
        }
    }
    return false;
}
/* C ref: dbridge.c:136-162 is_drawbridge_wall(x, y) — check if location is a drawbridge wall.
 * RNG: none. Return int (direction of drawbridge or -1 if not a valid wall). */
export function is_drawbridge_wall(x, y) {
    if (!isok(x, y)) {
        return -1;
    }
    const lev = game.level?.at(x, y);
    if (!lev || (lev.typ !== DOOR && lev.typ !== DBWALL)) {
        return -1;
    }
    /* Check all four cardinal directions for drawbridge walls */
    if (isok(x + 1, y)) {
        const adj = game.level?.at(x + 1, y);
        if (adj && IS_DRAWBRIDGE(adj.typ) && ((adj.drawbridgemask & DB_DIR) | 0) === DB_WEST) {
            return DB_WEST;
        }
    }
    if (isok(x - 1, y)) {
        const adj = game.level?.at(x - 1, y);
        if (adj && IS_DRAWBRIDGE(adj.typ) && ((adj.drawbridgemask & DB_DIR) | 0) === DB_EAST) {
            return DB_EAST;
        }
    }
    if (isok(x, y - 1)) {
        const adj = game.level?.at(x, y - 1);
        if (adj && IS_DRAWBRIDGE(adj.typ) && ((adj.drawbridgemask & DB_DIR) | 0) === DB_SOUTH) {
            return DB_SOUTH;
        }
    }
    if (isok(x, y + 1)) {
        const adj = game.level?.at(x, y + 1);
        if (adj && IS_DRAWBRIDGE(adj.typ) && ((adj.drawbridgemask & DB_DIR) | 0) === DB_NORTH) {
            return DB_NORTH;
        }
    }
    return -1;
}

/* C ref: dbridge.c:179-206 find_drawbridge(x, y) — locate drawbridge from wall or bridge.
 * RNG: none. Return boolean; mutates *x,*y to point to drawbridge if found. */
export function find_drawbridge(x, y) {
    if (IS_DRAWBRIDGE((game.level?.at(x.value, y.value)?.typ | 0)))
        return true;
    const dir = is_drawbridge_wall(x.value, y.value);
    if (dir >= 0) {
        switch (dir) {
        case DB_NORTH:
            y.value++;
            break;
        case DB_SOUTH:
            y.value--;
            break;
        case DB_EAST:
            x.value--;
            break;
        case DB_WEST:
            x.value++;
            break;
        }
        return true;
    }
    return false;
}

/* C ref: dbridge.c:234-284 create_drawbridge(x, y, dir, flag)
 * RNG: none. Return boolean. */
export function create_drawbridge(x, y, dir, flag) {
    let x2 = x;
    let y2 = y;
    let horiz;
    const lava = (game.level?.at(x, y)?.typ | 0) === LAVAPOOL;

    switch (dir) {
    case DB_NORTH:
        horiz = true;
        y2--;
        break;
    case DB_SOUTH:
        horiz = true;
        y2++;
        break;
    case DB_EAST:
        horiz = false;
        x2++;
        break;
    default:
        /* impossible("bad direction in create_drawbridge"); */
        /*FALLTHRU*/
    case DB_WEST:
        horiz = false;
        x2--;
        break;
    }
    if (!IS_WALL((game.level?.at(x2, y2)?.typ | 0)))
        return false;
    if (flag) {
        game.level.at(x, y).typ = DRAWBRIDGE_DOWN;
        game.level.at(x2, y2).typ = DOOR;
        game.level.at(x2, y2).doormask = D_NODOOR;
    } else {
        game.level.at(x, y).typ = DRAWBRIDGE_UP;
        game.level.at(x2, y2).typ = DBWALL;
        game.level.at(x2, y2).wall_info = W_NONDIGGABLE;
    }
    game.level.at(x, y).horizontal = !horiz;
    game.level.at(x2, y2).horizontal = horiz;
    game.level.at(x, y).drawbridgemask = dir;
    if (lava)
        game.level.at(x, y).drawbridgemask |= DB_LAVA;
    return true;
}

/* C ref: dokick.c:1769-1849 obj_delivery(near_hero)
 * RNG: rnd(2) — scatter direction
 * Delivers migrating objects: hero-bound (near_hero=false) or non-hero (near_hero=true). */
export async function obj_delivery(near_hero) {
    const g = game;
    const u = g.u || {};

    /* MIGR destination codes come from ./const.js, mirroring dungeon.h:149-163.
     * The local copies here were all wrong: RANDOM 1/0, STAIRS_UP 2/3,
     * LADDER_UP 3/5, SSTAIRS 4/7, WITH_HERO 8/9, NOBREAK 0x10/1024,
     * NOSCATTER 0x20/2048 (js-copy/C).  The bitmask ones matter most: with
     * NOBREAK = 0x10 the `where & MIGR_NOBREAK` test read bit 4 of the
     * destination code instead of the real don't-break flag. */

    /* IS_SOFT: true for non-solid terrain (C rm.h) */
    function IS_SOFT(t) {
        return t === POOL || t === MOAT || t === WATER || t === LAVAPOOL;
    }

    let otmp = g.gm?.migrating_objs ?? null;
    while (otmp) {
        const otmp2 = otmp.nobj;

        if ((otmp.ox | 0) !== (u.uz?.dnum | 0) || (otmp.oy | 0) !== (u.uz?.dlevel | 0)) {
            otmp = otmp2;
            continue;
        }

        let where = (otmp.owornmask | 0) & 0x7FFF; /* destination code */
        if ((where & MIGR_TO_SPECIES) !== 0) {
            otmp = otmp2;
            continue;
        }

        const nobreak = (where & MIGR_NOBREAK) !== 0;
        const noscatter = (where & MIGR_WITH_HERO) !== 0; /* C uses MIGR_WITH_HERO, not MIGR_NOSCATTER */
        where &= ~(MIGR_NOBREAK | MIGR_NOSCATTER);

        if (!near_hero ^ (where === MIGR_WITH_HERO)) {
            otmp = otmp2;
            continue;
        }

        obj_extract_self(otmp);
        otmp.owornmask = 0;
        const fromdlev = {
            dnum: otmp.omigr_from_dnum | 0,
            dlevel: otmp.omigr_from_dlevel | 0
        };

        let isladder = false;
        let nx = 0, ny = 0;

        switch (where) {
        case MIGR_LADDER_UP:
            isladder = true;
            /* FALLTHROUGH */
        case MIGR_STAIRS_UP:
        case MIGR_SSTAIRS: {
            const stway = stairway_find_from_real(fromdlev, isladder);
            if (stway) {
                nx = stway.sx | 0;
                ny = stway.sy | 0;
            }
            break;
        }
        case MIGR_WITH_HERO:
            nx = u.ux | 0;
            ny = u.uy | 0;
            break;
        default:
        case MIGR_RANDOM:
            nx = 0;
            ny = 0;
            break;
        }

        otmp.omigr_from_dnum = 0;
        otmp.omigr_from_dlevel = 0;

        if (nx > 0) {
            place_object(otmp, nx, ny);
            if (!nobreak && !IS_SOFT((game.level?.at(nx, ny)?.typ | 0))) {
                if (where === MIGR_WITH_HERO) {
                    if (await breaks(otmp, nx, ny)) {
                        otmp = otmp2;
                        continue;
                    }
                } else if (breaktest(otmp)) {
                    /* assume it broke before player arrived, no messages */
                    await delobj(otmp);
                    otmp = otmp2;
                    continue;
                }
            }
            await stackobj(otmp);
            if (!noscatter)
                await scatter(nx, ny, rnd(2), 0, otmp);
            else
                newsym(nx, ny);
        } else { /* random location */
            /* set dummy coordinates because there's no
               current position for rloco() to update */
            otmp.ox = 0;
            otmp.oy = 0;
            if (await rloco(otmp) && !nobreak && breaktest(otmp)) {
                /* assume it broke before player arrived, no messages */
                await delobj(otmp);
            }
        }

        otmp = otmp2;
    }
}

/* Unported helper stubs for obj_delivery */
/* C dothrow.c:2445-2456 breaks(obj, x, y): announce and dispose of an object
 * that breaks for a non-hero reason.  The message and destruction bodies are
 * canonical cmd.js implementations; this wrapper supplies the missing
 * visibility/test sequencing. */
export async function breaks(otmp, nx, ny) {
    const blind = _Blind_dk();
    const inView = !blind && !!cansee(nx, ny);
    if (!breaktest(otmp)) return 0;
    await breakmsg(otmp, inView);
    return await breakobj(otmp, nx, ny, false, false) ? 1 : 0;
}
/* C invent.c:1430 delobj() — use the canonical object extraction/deallocation
 * path, including resistance, map redraw, and nested-container cleanup. */
export async function delobj(otmp) {
    return await delobj_core(otmp);
}
function _dk_Maybe_Half_Phys(dmg) {
    const p = game.u?.uprops?.[HALF_PHDAM];
    const active = !!(p && ((p.intrinsic | 0) || (p.extrinsic | 0)));
    return active ? Math.trunc((dmg + 1) / 2) : dmg;
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

    /* C:738-741 shop_origin = shop_keeper(*in_rooms(sx,sy,SHOPBASE)) != 0 &&
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
            await pline('The chain shatters!');
            await unpunish();
            if (wasChain)
                continue;
        }
        if ((otmp.quan | 0) > 1) {
            let qtmp = (otmp.quan | 0) - 1;
            qtmp = rnd(qtmp);
            otmp = (await splitobj(otmp, qtmp));
        } else {
            obj = null; /* all used */
        }
        obj_extract_self_general(otmp);

        /* C explode.c:766-807 — boulders fracture into rocks and statues
         * crumble in place on a 9-in-10 roll. */
        if (mayFracture
            && ((otmp.otyp | 0) === _KO_BOULDER_OTYP || (otmp.otyp | 0) === 476)
            && rn2(10)) {
            if ((otmp.otyp | 0) === _KO_BOULDER_OTYP) {
                otmp.otyp = 474; /* ROCK */
                otmp.oclass = _KO_GEM_CLASS;
                otmp.quan = rn1(60, 7);
                otmp.owt = weight(otmp);
            } else {
                await breakobj(otmp, sx | 0, sy | 0, false, false);
            }
            place_object(otmp, sx | 0, sy | 0);
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
                    /* thitu() here is js/trap.js's port, scoped to the "plain
                     * hit" tail (non-acid/stone/potion/silver); it never nulls
                     * its object arg (see the call's own note there), which
                     * matches C for a FOOD_CLASS object like a tree fruit —
                     * only the potion/acid/silver arms this port doesn't model
                     * would null or specially damage it. */
                    const hitu = await thitu(hitvalu, _dk_Maybe_Half_Phys(dam), stmp.obj, null);
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
/* stairway_find_from: LOCAL throwing stub DELETED — use mklev.js's canonical
 * stairs lookup at the migration call site above. */

function _Blind_dk() {
    const u = game.u;
    if (!u) return false;
    const bp = u.uprops && u.uprops[DK_BLINDED];
    return !!bp && !!((bp.intrinsic | 0) || (bp.extrinsic | 0))
            && !(bp.blocked | 0);
}
function _Deaf_dk() {
    const u = game.u;
    if (!u) return false;
    const dp = u.uprops && u.uprops[DEAF];
    return !!dp && !!((dp.intrinsic | 0) || (dp.extrinsic | 0)) && !(dp.blocked | 0);
}
export { ghitm };
