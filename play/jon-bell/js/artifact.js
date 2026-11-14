// artifact.js — C ref: artifact.c.
import { ART_NONARTIFACT, arti_cary_adtyp, arti_cspfx, arti_defn_adtyp, arti_inv_prop, arti_spfx, exercise, LUCKSTONE, SPFX_LUCK } from './attrib.js';
import { AD_COLD_ART, AD_DISN_ART, AD_DRLI_ART, AD_DRST_ART, AD_ELEC_ART, AD_FIRE_ART, AD_MAGM_ART, ART_SUNSWORD, BLND_RES_ART, CRYSTAL_BALL_OTYP, DEADMONSTER, ENERGY_REGENERATION_ART, GETOBJ_EXCLUDE, GETOBJ_SUGGEST, HALF_PHDAM_ART, HALF_SPDAM_ART, LAST_PROP_ART, MS_NEMESIS, OTYP_ARROW, PROTECTION_ART, REGENERATION_ART, Role_if, SPFX_EREGEN_ART, SPFX_ESP_ART, SPFX_HALRES_ART, SPFX_HPHDAM_ART, SPFX_HSPDAM_ART, SPFX_PROTECT_ART, SPFX_REFLECT_ART, SPFX_REGEN_ART, SPFX_SEARCH_ART, SPFX_STLTH_ART, SPFX_TCTRL_ART, SPFX_WARN_ART, SPFX_XRAY_ART, W_WEP_C, Your, _Blind_cmd, _IA_BELL_OF_OPENING_OTYP, _You_feel, _hero_Blind, _is_demon, _ld_carried, _retouch_ag, _retouch_dmg, _uprop_active, enlightenment_menu, getObjFromGetobj, ledger_no_cmd, spelleffects, tty_menu_pick_one_ext, untrap_at, verbalize } from './cmd.js';
import { invocation_pos } from './hack.js';
import { do_blinding_ray } from './apply.js';
import { level_tele } from './teleport.js';
import { use_crystal_ball } from './detect.js';
import { ANTIMAGIC, A_CON, BLINDED, COLD_RES, CONFLICT, DISINT_RES, DRAIN_RES, ECMD_CANCEL, ECMD_OK, ECMD_TIME, FIRE_RES, GETOBJ_ALLOWCNT, GETOBJ_PROMPT, HALLUC, INVIS, I_SPECIAL, In_endgame, In_quest, KILLED_BY, LEVITATION, MAGICENLIGHTENMENT, MIGR_RANDOM, POISON_RES, REFLECTING, SEARCHING, SHOCK_RES, SICK, SICK_ALL, SLIMED, STEALTH, TELEPAT, TELEPORT_CONTROL, TIMEOUT, Upolyd, WARNING, WARN_OF_MON, W_ART, W_ARTI as W_ARTI_FW, isok, nothing_seems_to_happen } from './const.js';
import * as _PROPIDS from './const.js';
import { force_more, newsym, see_monsters } from './display.js';
import { pline } from './pline.js';
import { goto_level } from './do.js';
import { xname } from './objnam.js';
import { yname } from './objnam.js';
import { recalc_telepat_range } from './worn.js';
import { float_down, float_up } from './trap.js';
import { mdrop_special_objs, migrate_to_level } from './dog.js';
import { unstuck } from './mon.js';
import { losehp } from './hack.js';
import { throwit } from './dothrow.js';
import { game } from './gstate.js';
import { depth } from './dungeon.js';
import { hold_another_object } from './invent.js';
import { update_inventory } from './invent.js';
import { spoteffects } from './hack.js';
import { getdir } from './cmd.js';
import { Inhell } from './makemon.js';
import { bcsign, mksobj } from './mkobj.js';
import { getrumor } from './rumors.js';
import { On_stairs } from './stairs.js';
import { Tobjnam as _objnam_Tobjnam, aobjnam, killer_xname, otense, the } from './objnam.js';
import { impossible as real_impossible } from './pline.js';
import { PM_GREMLIN, PM_TOURIST } from './pm.generated.js';
import { make_hallucinated, make_sick, make_slimed } from './potion.js';
import { charge_ok, litroom, recharge, seffects } from './read.js';
import { d, rn2, rnd, rnz } from './rnd.js';
import { spell_skilltype } from './spell.js';
import { remove_worn_item as _remove_worn_item_thrown } from './steal.js';
import { u_teleport_mon } from './teleport.js';
import { next_to_u as next_to_u_real } from './apply.js';
import { couldsee } from './vision.js';
import { weight } from './weight.js';
import { bane_applies_hero, touch_artifact_youmonst } from './wizcmds.js';
import { BlindedTimeout, flashburn, lightdamage, make_blinded } from './zap.js';
import { ONAME_BONES, ONAME_GIFT, ONAME_LEVEL_DEF, ONAME_RANDOM, ONAME_VIA_DIP, ONAME_VIA_NAMING, ONAME_WISH } from './const.js'; // relocate-fns
import { ARTILIST, _arti_exists_bit, _artiexist, _artifact_origin, _startsWithThe } from './objnam.js';
import { fuzzymatch } from './hacklib.js'; // relocate-fns
import { OC_COST } from './oc_cost_data.js'; // relocate-fns
import { MKOBJ_OC_OPROP } from './mkobj_erosion_meta.js'; // relocate-fns
import { ARTILIST_MTYPE } from './attrib.js'; // relocate-fns
import { _ARTI_GIFT_INFO, _mk_artifact_by_align } from './cmd.js'; // relocate-fns
import { is_youmonst } from './mhitm.js'; // relocate-fns
import { A_NONE, ONAME_NO_FLAGS, touch_artifact_mon, uroleMnum } from './mklev.js'; // relocate-fns
import { ARTI_GEN_SPE, ARTI_NOGEN } from './objnam.js';
import { oname } from './do_name.js'; // relocate-fns
import { ARTI_PROPS } from './wizcmds.js'; // relocate-fns
import { _Levitation } from './cmd.js'; // relocate-fns
import { GOLD_DRAGON_SCALES, GOLD_DRAGON_SCALE_MAIL } from './light.js'; // relocate-fns
import { nomul } from './hack.js'; // relocate-fns
import { body_part, mbodypart } from './cmd.js'; // relocate-fns
import { CONFUSION, STONE_RES, STUNNED, engulfing_u, ismnum } from './const.js'; // relocate-fns
import { canspotmon, map_invisible, shieldeff } from './display.js'; // relocate-fns
import { Monnam, hcolor, mon_nam } from './do_name.js'; // relocate-fns
import { sticks } from './dog.js'; // relocate-fns
import { losexp } from './exper.js'; // relocate-fns
import { s_suffix, upstart } from './hacklib.js'; // relocate-fns
import { monhp_per_lvl, nonlivingMon, permonstTemplate } from './makemon.js'; // relocate-fns
import { healmon, set_ustuck, wake_nearto } from './mon.js'; // relocate-fns
import { Resists_Elem, attacktype, defended, resists_drli } from './mondata.js'; // relocate-fns
import { monflee } from './monmove.js'; // relocate-fns
import { observe_object } from './o_init.js'; // relocate-fns
import { The, distant_name, vtense } from './objnam.js'; // relocate-fns
import { You, pline_The } from './pline.js'; // relocate-fns
import { PM_JABBERWOCK as PM_JABBERWOCK_UH, PM_WATER_ELEMENTAL } from './pm.generated.js'; // relocate-fns
import { healup, make_confused, make_stunned } from './potion.js'; // relocate-fns
import { impossible } from './steed.js'; // relocate-fns
import { burn_away_slime as burn_away_slime_real } from './timeout.js'; // relocate-fns
import { ignite_items as ignite_items_real } from './trap.js'; // relocate-fns
import { AD_DRLI_UH, AD_PHYS_UH, AD_STON_UH, ARTI_SPEC, AT_MAGC_UH, Antimagic_uh, M2_UNDEAD, M2_WERE_UH, MZ_LARGE, SHADE_GLARE_SILVER_MAT, _AC_ART_STORMBRINGER, _hero_resists, _uh_Blind, _xk_hallu, resists_poison_uh, sh_resists_ston, sr_oc_material } from './uhitm.js'; // relocate-fns
import { cansee } from './vision.js'; // relocate-fns
import { artifact_alignment } from './wizcmds.js'; // relocate-fns
import { cancel_monst, destroy_items_mon as destroy_items_mon_zap, destroy_items as destroy_items_zap, probe_monster, resist } from './zap.js'; // relocate-fns
import { clr2colorname } from './coloratt.js'; // relocate-fns
import { DISMOUNT_THROWN, D_TRAPPED, IS_DOOR, LAST_PROP, W_ARTI, W_BALL, W_QUIVER, W_SADDLE, W_SWAPWEP } from './const.js'; // relocate-fns
import { GLYPHCLS_TRAP, _disp_Blind, retouch_object_hero, vobj_at } from './display.js'; // relocate-fns
import { maybe_lvltport_feedback as _rt_maybe_lvltport_feedback } from './do.js'; // relocate-fns
import { uncurse as _rt_uncurse } from './mkobj.js'; // relocate-fns
import { bare_artifactname } from './objnam.js'; // relocate-fns
import { dismount_steed as _rt_dismount_steed } from './steed.js'; // relocate-fns
import { CLR_BRIGHT_BLUE, CLR_RED, NO_COLOR } from './terminal.js'; // relocate-fns
import { selftouch as _rt_selftouch, t_at } from './trap.js'; // relocate-fns
import { bypass_obj as _rt_bypass_obj, clear_bypasses as _rt_clear_bypasses, nxt_unbypassed_obj as _rt_nxt_unbypassed_obj, which_armor as _rt_which_armor } from './worn.js'; // relocate-fns

/* C ref: artifact.c:2275-2293 arti_speak() — a speaking artifact (SPFX_SPEAK) whispers
 * a rumor.  doapply's tail (apply.c:4421-4423) calls it for any applied artifact. */
export async function arti_speak(obj) {
    const art = (obj && (obj.oartifact | 0)) || 0;
    if (!art || !(arti_spfx(art) & 0x00000008 /* SPFX_SPEAK */))
        return ECMD_OK;
    let line = await getrumor(bcsign(obj), true);
    if (!line) line = 'NetHack rumors file closed for renovation.';
    await pline(`${_objnam_Tobjnam(obj, 'whisper')}:`);
    await verbalize('%s', line);
    return ECMD_TIME;
}

/* C obj.h:439 is_art(o,art): (o) && (o)->oartifact == (art). */
export function is_art(obj, art) {
    return !!(obj && (obj.oartifact | 0) === art);
}

const FAKE_AMULET_OF_YENDOR_OTYP = 212;

const SCR_TAMING_OTYP = 330; /* objects.h; js/read.js:4571 */

/* C ref: artifact.h:63-77 — the invoke-power enum, which continues past
 * prop.h's LAST_PROP (= LIFESAVED = 68) so that arti_invoke can tell a
 * PROPERTY toggle (inv_prop <= LAST_PROP) from a SPECIAL POWER
 * (inv_prop > LAST_PROP) with one comparison. */
const ARTI_LAST_PROP    = 68;

const ARTI_TAMING       = 69;

const ARTI_HEALING      = 70;

const ARTI_ENERGY_BOOST = 71;

const ARTI_UNTRAP       = 72;

const ARTI_CHARGE_OBJ   = 73;

const ARTI_LEV_TELE     = 74;

const ARTI_CREATE_PORTAL= 75;

const ARTI_ENLIGHTENING = 76;

const ARTI_CREATE_AMMO  = 77;

const ARTI_BANISH       = 78;

const ARTI_FLING_POISON = 79;

const ARTI_FIRESTORM    = 80;

const ARTI_SNOWSTORM    = 81;

const ARTI_BLINDING_RAY = 82;

/* C ref: include/artilist.h artilist[].inv_prop, the 9th A() argument.
 * Extracted mechanically from the 5.0 header by parsing the A(...) calls (the
 * `#if 0` Palantir block is excluded there exactly as it is from the compiled
 * table, so these indices line up with js/wizcmds.js ARTI_PROPS and with the
 * oartifact value js/objnam.js stamps on a wished-for artifact).
 * INVIS / LEVITATION / CONFLICT are prop.h property indices and come from
 * js/const.js rather than being re-spelled here. */
const ARTI_INV_PROP = [
    0,                    /*  0 (dummy, ART_NONARTIFACT)          */
    0,                    /*  1 Excalibur                         */
    0,                    /*  2 Stormbringer                      */
    0,                    /*  3 Mjollnir                          */
    0,                    /*  4 Cleaver                           */
    ARTI_FLING_POISON,    /*  5 Grimtooth                         */
    0,                    /*  6 Orcrist                           */
    0,                    /*  7 Sting                             */
    0,                    /*  8 Magicbane                         */
    ARTI_SNOWSTORM,       /*  9 Frost Brand                       */
    ARTI_FIRESTORM,       /* 10 Fire Brand                        */
    0,                    /* 11 Dragonbane                        */
    ARTI_BANISH,          /* 12 Demonbane                         */
    0,                    /* 13 Werebane                          */
    0,                    /* 14 Grayswandir                       */
    0,                    /* 15 Giantslayer                       */
    0,                    /* 16 Ogresmasher                       */
    0,                    /* 17 Trollsbane                        */
    0,                    /* 18 Vorpal Blade                      */
    0,                    /* 19 Snickersnee                       */
    ARTI_BLINDING_RAY,    /* 20 Sunsword                          */
    _PROPIDS.INVIS,       /* 21 The Orb of Detection              */
    _PROPIDS.LEVITATION,  /* 22 The Heart of Ahriman              */
    _PROPIDS.CONFLICT,    /* 23 The Sceptre of Might              */
    ARTI_HEALING,         /* 24 The Staff of Aesculapius          */
    0,                    /* 25 The Magic Mirror of Merlin        */
    ARTI_ENLIGHTENING,    /* 26 The Eyes of the Overworld         */
    ARTI_ENERGY_BOOST,    /* 27 The Mitre of Holiness             */
    ARTI_CREATE_AMMO,     /* 28 The Longbow of Diana              */
    ARTI_UNTRAP,          /* 29 The Master Key of Thievery        */
    0,                    /* 30 The Tsurugi of Muramasa           */
    ARTI_CHARGE_OBJ,      /* 31 The Platinum Yendorian Express Card */
    ARTI_LEV_TELE,        /* 32 The Orb of Fate                   */
    ARTI_CREATE_PORTAL,   /* 33 The Eye of the Aethiopica         */
];

/* C ref: artifact.c:1727 invoke_ok(struct obj *obj) — getobj's classifier for
 * the `#invoke' command.
 *   if (!obj) return GETOBJ_EXCLUDE;
 *   if (obj->oartifact || objects[obj->otyp].oc_unique
 *       || (obj->otyp == FAKE_AMULET_OF_YENDOR && !obj->known))
 *       return GETOBJ_SUGGEST;
 *   if (obj->otyp == CRYSTAL_BALL) return GETOBJ_SUGGEST;
 *   return GETOBJ_EXCLUDE;
 * There is no DOWNPLAY arm, so `altlets` is always empty for #invoke and the
 * '?' menu is restricted to the same letters the prompt bracket lists. */
function invoke_ok(obj) {
    if (!obj)
        return GETOBJ_EXCLUDE;

    const otyp = obj.otyp | 0;
    const oc_unique = !!(game._oc_unique && game._oc_unique[otyp]);
    if ((obj.oartifact | 0) || oc_unique
        || (otyp === FAKE_AMULET_OF_YENDOR_OTYP && !obj.known))
        return GETOBJ_SUGGEST;

    if (otyp === CRYSTAL_BALL_OTYP)
        return GETOBJ_SUGGEST;

    return GETOBJ_EXCLUDE;
}

/* C ref: artifact.c:2091 arti_invoke_cost_pw() — Pw cost of invoking, or -1 if
 * it cannot be paid with Pw.  SPELL_LEV_PW(5) = 25 (spell.h:36). */
function arti_invoke_cost_pw(obj) {
    const inv_prop = ARTI_INV_PROP[obj.oartifact | 0] | 0;
    if (inv_prop === ARTI_FLING_POISON || inv_prop === ARTI_BLINDING_RAY)
        return 25;
    return -1;
}

/* C ref: artifact.c:2105 arti_invoke_cost() — TRUE if the invoke cost can be
 * paid (and pay it). */
async function arti_invoke_cost(obj) {
    const u = game.u;
    if ((obj.age | 0) > (game.moves | 0)) {
        const pw_cost = arti_invoke_cost_pw(obj);
        if (pw_cost < 0 || (u.uen | 0) < pw_cost) {
            await _You_feel(`that ${the(xname(obj))} ${otense(obj, 'are')} ignoring you.`);
            obj.age = (obj.age | 0) + d(3, 10);
            return false;
        }
        await _You_feel('drained...'); /* artifact.c:2120 */
        u.uen -= pw_cost;
        game.disp.botl = true;
    } else {
        obj.age = (game.moves | 0) + rnz(100);
    }
    return true;
}

/* C ref: artifact.c:1762 nothing_special() — silent unless carried (a dropped
 * artifact reaches here from set_artifact_intrinsic via freeinv). */
async function nothing_special(obj) {
    if (!_ld_carried(obj)) return;
    await _You_feel('a surge of power, but nothing seems to happen.');
}

/* C ref: artifact.c:1780 invoke_healing() */
async function invoke_healing(obj) {
    const u = game.u;
    const prop = (p) => (u.uprops && u.uprops[p]) || {};
    const creamed = u.ucreamed | 0;
    let healamt = Upolyd(u)
        ? Math.trunc(((u.mhmax | 0) + 1 - (u.mh | 0)) / 2)
        : Math.trunc(((u.uhpmax | 0) + 1 - (u.uhp | 0)) / 2);
    const Sick = !!((prop(SICK).intrinsic | 0) || (prop(SICK).extrinsic | 0));
    const Slimed = !!((prop(SLIMED).intrinsic | 0) || (prop(SLIMED).extrinsic | 0));
    const bt = BlindedTimeout() | 0;
    // C youprop.h:92: Blinded is boolean HBlinded && !BBlinded, distinct
    // from the timeout: the Eyes of the Overworld block only the first test.
    const Blinded = !!(prop(BLINDED).intrinsic | 0) && !(prop(BLINDED).blocked | 0);
    if (healamt || Sick || Slimed || Blinded > creamed)
        await _You_feel('better.');
    if (healamt || Sick || Slimed || bt > creamed)
        await _You_feel(`${(!healamt && !Sick && !Slimed
            && ((prop(BLINDED).intrinsic | 0) & ~TIMEOUT) !== 0) ? 'slightly ' : ''}better.`);
    else {
        await nothing_special(obj);
        return ECMD_TIME;
    }
    if (healamt > 0) {
        if (Upolyd(u)) u.mh += healamt;
        else u.uhp += healamt;
    }
    if (Sick)
        await make_sick(0, null, false, SICK_ALL);
    if (Slimed)
        await make_slimed(0, null);
    if (bt > creamed)
        make_blinded(creamed, false);
    game.disp.botl = true;
    return ECMD_TIME;
}

/* C ref: artifact.c:1848-1867 invoke_charge_obj(struct obj *obj).
 * The Platinum Yendorian Express Card is the only CHARGE_OBJ artifact and its
 * artilist row has role NON_PM, so C's b_effect (blessed && role matches) is
 * simply blessed here. */
async function invoke_charge_obj(obj) {
    const otmp = await getObjFromGetobj('charge', charge_ok, GETOBJ_PROMPT | GETOBJ_ALLOWCNT);
    if (!otmp) {
        obj.age = 0;
        return ECMD_CANCEL;
    }
    /* artifact.c:1856-1857: oart->role is PM_TOURIST for the Platinum
     * Yendorian Express Card (artilist.h:294), the only CHARGE_OBJ artifact. */
    const b_effect = !!obj.blessed && Role_if(PM_TOURIST);
    await recharge(otmp, b_effect ? 1 : obj.cursed ? -1 : 0);
    update_inventory();
    return ECMD_TIME;
}

/* C ref: artifact.c:1963-2020 invoke_banish() — demons/imps the hero can see go
 * to a random Gehennom level (or teleport about inside Gehennom); no RNG if none. */
async function invoke_banish() {
    const g = game;
    let nvanished = 0, nstayed = 0, mtmp2 = null;
    const dest = { dnum: (g.valley_level?.dnum | 0), dlevel: (g.valley_level?.dlevel | 0) }; /* find_hell */
    for (let mtmp = g.fmon; mtmp; mtmp = mtmp2) {
        let chance = 1;
        mtmp2 = mtmp.nmon;
        if (DEADMONSTER(mtmp) || !isok(mtmp.mx, mtmp.my)) continue;
        if (!_is_demon(mtmp.data) && (mtmp.data?.mlet | 0) !== 9 /* S_IMP */) continue;
        if (!couldsee(mtmp.mx, mtmp.my) || (mtmp.data.msound | 0) === MS_NEMESIS) continue;
        if (In_quest(g.u.uz) && !g.svq?.quest_status?.killed_nemesis) chance += 10;
        if (_is_demon(mtmp.data) && (mtmp.data.mflags2 & 0x00000800)) chance += 2; /* is_dprince */
        if (_is_demon(mtmp.data) && (mtmp.data.mflags2 & 0x00000400)) chance++;    /* is_dlord */
        mtmp.msleeping = 0; mtmp.mtame = 0; mtmp.mpeaceful = 0;
        if (chance > 1 && rn2(chance) !== 0) { nstayed++; continue; }
        if (!Inhell()) {
            nvanished++;
            dest.dlevel = rn2(g.dungeons?.[dest.dnum]?.num_dunlevs | 0); /* MIGR_RANDOM */
            if (mtmp.mx) { await unstuck(mtmp); await mdrop_special_objs(mtmp); }
            await migrate_to_level(mtmp, ledger_no_cmd(dest), MIGR_RANDOM, null);
        } else await u_teleport_mon(mtmp, false);
    }
    if (nvanished)
        await pline(`${nstayed ? (nvanished > nstayed ? 'Most of the' : 'Some of the') : 'The'} ${nvanished === 1 ? 'demon disappears' : 'demons disappear'} in a cloud of brimstone!`);
    return ECMD_TIME;
}

/* C ref: artifact.c:1768-1777 invoke_taming() — a pseudo scroll of taming,
 * pseudo = cg.zeroobj: oclass 0 (not SCROLL_CLASS, so resist() uses the
 * default alev), neither blessed nor cursed. */
async function invoke_taming(obj) {
    const pseudo = { otyp: SCR_TAMING_OTYP, oclass: 0, blessed: 0, cursed: 0,
                     spe: 0, quan: 0, owt: 0, oartifact: 0, corpsenm: 0 };
    await seffects(pseudo);
    return ECMD_TIME;
}

/* C artifact.c:2054-2087 invoke_blinding_ray(). */
async function invoke_blinding_ray(obj) {
    const u = game.u;
    if (await getdir(null)) {
        if (u.dx || u.dy) {
            await do_blinding_ray(obj);
        } else if (u.dz) {
            await litroom(true, obj);
            const loc = game.level.locations[u.ux][u.uy];
            await pline(!_hero_Blind() && loc.lit && !loc.waslit
                ? 'It is lit here now.' : nothing_seems_to_happen);
        } else {
            const vulnerable = u.umonnum === PM_GREMLIN;
            const damg = obj.blessed ? 15 : !obj.cursed ? 10 : 5;
            if (vulnerable)
                await lightdamage(obj, true, 2 * damg);
            if (!await flashburn(damg + rnd(damg), false) && !vulnerable)
                await pline(nothing_seems_to_happen);
        }
    } else {
        await pline('Never mind.');
        obj.age = game.moves | 0;
        return ECMD_CANCEL;
    }
    return ECMD_TIME;
}

export async function arti_invoke(obj) {
    if (!obj) {
        await real_impossible('arti_invoke without obj');
        return ECMD_OK;
    }
    const arti = (obj && (obj.oartifact | 0)) || 0;
    const inv_prop = ARTI_INV_PROP[arti] | 0;

    if (!arti || !inv_prop) {
        if ((obj.otyp | 0) === CRYSTAL_BALL_OTYP) {
            /* C artifact.c:2143 use_crystal_ball(&obj) (detect.c:1078). */
            await use_crystal_ball(obj);
        } else {
            await pline("Nothing happens.");
        }
        return ECMD_TIME;
    }

    if (inv_prop > ARTI_LAST_PROP) {
        if (!await arti_invoke_cost(obj)) /* artifact.c:2159 */
            return ECMD_TIME;
        if (inv_prop === ARTI_TAMING) /* artifact.c:2155 case TAMING */
            return await invoke_taming(obj);
        if (inv_prop === ARTI_CHARGE_OBJ) /* artifact.c:2159 case CHARGE_OBJ */
            return await invoke_charge_obj(obj);
        if (inv_prop === ARTI_HEALING)
            return await invoke_healing(obj);
        if (inv_prop === ARTI_ENERGY_BOOST) {
            /* C artifact.c:1823-1841 invoke_energy_boost() */
            const u = game.u;
            let epboost = Math.trunc(((u.uenmax | 0) + 1 - (u.uen | 0)) / 2);
            if (epboost > 120)
                epboost = 120; /* arbitrary */
            else if (epboost < 12)
                epboost = (u.uenmax | 0) - (u.uen | 0);
            if (epboost) {
                u.uen += epboost;
                game.disp.botl = true;
                await _You_feel('re-energized.');
            } else
                await nothing_special(obj);
            return ECMD_TIME;
        }
        if (inv_prop === ARTI_BLINDING_RAY)
            return await invoke_blinding_ray(obj);
        if (inv_prop === ARTI_LEV_TELE) {
            /* C artifact.c:2160 case LEV_TELE: level_tele(); res = ECMD_TIME.
             * The prompt opens inside the command, before movemon runs. */
            await level_tele();
            return ECMD_TIME;
        }
        if (inv_prop === ARTI_ENLIGHTENING) {
            /* C artifact.c:2162-2165 enlightenment(MAGICENLIGHTENMENT,
             * ENL_GAMEINPROGRESS); res = ECMD_TIME. */
            await enlightenment_menu(MAGICENLIGHTENMENT);
            return ECMD_TIME;
        }
        if (inv_prop === ARTI_CREATE_PORTAL)
            return await invoke_create_portal(obj); /* artifact.c:2161 */
        if (inv_prop === ARTI_FLING_POISON) {
            /* C artifact.c:2022-2039 invoke_fling_poison() */
            if (await getdir(null)) {
                const venom = rn2(2) ? 479 /* BLINDING_VENOM */ : 480 /* ACID_VENOM */;
                const otmp = await mksobj(venom, true, false);
                otmp.spe = 1; /* the poison is yours */
                await throwit(otmp, 0, false, null);
                return ECMD_TIME;
            }
            await pline('Never mind.');
            obj.age = game.moves | 0;
            return ECMD_CANCEL;
        }
        if (inv_prop === ARTI_UNTRAP) {
            /* C artifact.c:1838-1845 invoke_untrap */
            if (!await untrap_at(0, 0, null, true)) {
                obj.age = 0; /* don't charge for changing their mind */
                return ECMD_CANCEL;
            }
            return ECMD_TIME;
        }
        if (inv_prop === ARTI_CREATE_AMMO)
            return await invoke_create_ammo(obj); /* artifact.c:2166 */
        if (inv_prop === ARTI_BANISH) return await invoke_banish(); /* artifact.c:2167 */
        if (inv_prop === ARTI_SNOWSTORM || inv_prop === ARTI_FIRESTORM)
            return await invoke_storm_spell(obj);   /* artifact.c:2181-2183 */
    }

    else {
        /* C artifact.c:2198-2228 — property toggle (CONFLICT, LEVITATION, INVIS). */
        const up = game.u.uprops[inv_prop];
        const eprop = (up.extrinsic ^= W_ARTI_FW);
        const iprop = up.intrinsic;
        const on = (eprop & W_ARTI_FW) !== 0;
        /* C artifact.c:951,2198-2205: restore the blast after the toggle so
         * the next pline can join it when tty update_topl() has room, or page
         * it with the post-toggle status (win/tty/topl.c:261-274). */
        const heldBlast = game._arti_blast_held;
        game._arti_blast_held = null;
        if (on && (obj.age | 0) > (game.moves | 0)) {
            up.extrinsic ^= W_ARTI_FW;
            if (heldBlast) await pline(heldBlast);
            await _You_feel(`that ${the(xname(obj))} ${otense(obj, 'are')} ignoring you.`);
            obj.age = (obj.age | 0) + d(3, 10);
            return ECMD_TIME;
        } else if (!on) {
            obj.age = (game.moves | 0) + rnz(100);
        }
        if (heldBlast) await pline(heldBlast);
        if ((eprop & ~W_ARTI_FW) || iprop) {
            await nothing_special(obj);
            return ECMD_TIME;
        }
        switch (inv_prop) {
        case CONFLICT:
            await _You_feel(on ? 'like a rabble-rouser.' : 'the tension decrease around you.');
            break;
        case LEVITATION:
            if (on) {
                await float_up();
                await spoteffects(false);
            } else
                await float_down(I_SPECIAL | TIMEOUT, W_ARTI_FW);
            break;
        case INVIS:
            if ((up.blocked | 0) || _Blind_cmd()) {
                await nothing_special(obj);
                return ECMD_TIME;
            }
            await newsym(game.u.ux, game.u.uy);
            if (on)
                await Your(`body takes on a ${(((game.u?.uprops?.[HALLUC]?.intrinsic | 0) && !_uprop_active('HALLUC_RES'))) ? 'normal' : 'strange'} transparency...`);
            else
                await Your('body seems to unfade...');
            break;
        }
        return ECMD_TIME;
    }

    await real_impossible('Unknown invoke power %d.', inv_prop);
    return ECMD_OK;
}

/* C ref: artifact.c:1933-1960 invoke_create_ammo() — the Longbow of Diana. */
async function invoke_create_ammo(obj) {
    const otmp = await mksobj(OTYP_ARROW, true, false);
    if (!otmp) {
        await nothing_special(obj);
        return ECMD_TIME;
    }
    otmp.blessed = obj.blessed;
    otmp.cursed = obj.cursed;
    otmp.bknown = obj.bknown;
    otmp.oeroded = otmp.oeroded2 = 0;
    if (obj.blessed) {
        if (otmp.spe < 0)
            otmp.spe = 0;
        otmp.quan += rnd(10);
    } else if (obj.cursed) {
        if (otmp.spe > 0)
            otmp.spe = 0;
    } else
        otmp.quan += rnd(5);
    otmp.owt = weight(otmp);
    await hold_another_object(otmp, 'Suddenly %s out.',
                              await aobjnam(otmp, 'fall'), null);
    return ECMD_TIME;
}

/* C ref: artifact.c:1867-1925 invoke_create_portal.  select_menu (more than one
 * reachable dungeon) is not ported and stays uncomputable. */
async function invoke_create_portal(obj) {
    const g = game;
    const u = g.u;
    let num_ok = 0, last_ok = 0;
    const entries = [], idx = {};
    const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < (g.dungeons || []).length; i++) {
        if (!g.dungeons[i].dunlev_ureached || i === g.tutorial_dnum) continue;
        const acc = letters[num_ok];
        entries.push({ acc, text: g.dungeons[i].dname });
        idx[acc] = i;
        num_ok++;
        last_ok = i;
    }
    if (num_ok > 1) {
        /* artifact.c:1894-1903 select_menu(PICK_ONE).  getobj's answered
         * query was cleared off the message row (tty yn/getobj clears it). */
        g._topl_sticky = '';
        const picked = await tty_menu_pick_one_ext(entries,
            'Open a portal to which dungeon?');
        if (picked === null) {
            await nothing_special(obj);
            return ECMD_TIME;
        }
        last_ok = idx[picked];
    }
    const dg = g.dungeons[last_ok];
    const newlev = { dnum: last_ok, dlevel: dg.depth_start >= depth(u.uz)
        ? dg.entry_lev : dg.dunlev_ureached };
    if (u.uhave?.amulet || In_endgame(u.uz) || In_endgame(newlev)
        || newlev.dnum === u.uz.dnum || !(await next_to_u_real())) {
        await _You_feel('very disoriented for a moment.');
    } else {
        if (!_hero_Blind())
            await pline('You are surrounded by a shimmering sphere!');
        else
            await _You_feel('weightless for a moment.');
        await goto_level(newlev, false, false, false);
    }
    return ECMD_TIME;
}

/* C ref: artifact.c:2040-2052 invoke_storm_spell — casts fireball/cone of cold
 * as if the hero were Expert in the attack school. */
async function invoke_storm_spell(obj) {
    const storm = (ARTI_INV_PROP[obj.oartifact | 0] | 0) === ARTI_SNOWSTORM
        ? 369 /* SPE_CONE_OF_COLD */ : 368 /* SPE_FIREBALL */;
    const skill = spell_skilltype(storm);
    const u = game.u;
    if (!u.weapon_skills) u.weapon_skills = [];
    const row = u.weapon_skills[skill]
        || (u.weapon_skills[skill] = { skill: 0, max_skill: 0, advance: 0 });
    const expertise = row.skill;
    row.skill = 4; /* P_EXPERT */
    await spelleffects(storm, false, true);
    row.skill = expertise;
    return ECMD_TIME;
}

export async function doinvoke() {
    const obj = await getObjFromGetobj('invoke', invoke_ok, GETOBJ_PROMPT); /* artifact.c:1753 */
    if (!obj)
        return ECMD_CANCEL;
    /* C artifact.c:2514-2516 retouch_object's invocation ritual exception. */
    if (obj.otyp === _IA_BELL_OF_OPENING_OTYP
        && invocation_pos(game.u.ux, game.u.uy)
        && !On_stairs(game.u.ux, game.u.uy)) return await arti_invoke(obj);

    /* C artifact.c:1755 retouch_object(&obj, FALSE) — 0 means the hero cannot
     * handle it, and C still spends the turn. */
    const _uhpBefore = game.u.uhp, _mhBefore = game.u.mh;
    const _botlPaintSeqBefore = game._botlPaintSeq | 0;
    const touched = await touch_artifact_youmonst(obj);
    /* C artifact.c:2526-2548 retouch_object: touch_artifact passed but
     * ag (silver && Hate_silver) or bane_applies(hero) still refuses. */
    if (touched && (_retouch_ag(obj) || bane_applies_hero(obj.oartifact | 0))) {
        const _bl = game._touch_artifact_blast_msg;
        game._touch_artifact_blast_msg = null;
        if (_bl) await pline(_bl);
        await pline(`You can't handle ${yname(obj)}${obj.owornmask ? ' anymore' : ''}!`);
        /* C artifact.c:2535 `if (!touch_blasted)` — the static, not the held
         * blast message (maybe_wail clears the message, not the static). */
        if (!game._touch_blasted) {
            await losehp(_retouch_dmg(obj), `handling ${killer_xname(obj)}`, KILLED_BY);
            exercise(A_CON, false);
        }
        if (obj.owornmask) await _remove_worn_item_thrown(obj, false);
        return ECMD_TIME;
    }
    /* C artifact.c:951's You("are blasted by %s power!") is on the topline
     * when touch_artifact returns.  Refused (0): nothing follows it, so it just
     * sits there.  Accepted (1, e.g. a self-willed artifact of a neutral hero's
     * own alignment but another role): arti_invoke's next pline more()s it, with
     * the status line already showing the post-losehp HP — same contract as
     * dowield's ready_weapon above (js/wizcmds.js sets the carried message). */
    const _blastMsg = game._touch_artifact_blast_msg;
    if (_blastMsg) {
        game._touch_artifact_blast_msg = null;
        if (!touched) {
            await pline(_blastMsg);
            /* C artifact.c:2558-2568 retouch_object's owornmask arm */
            if (obj.owornmask) await _remove_worn_item_thrown(obj, false);
            return ECMD_TIME;
        }
        const _invProp = ARTI_INV_PROP[obj.oartifact | 0] | 0;
        if (_invProp === ARTI_CREATE_PORTAL
            && (game.dungeons || []).filter((dg, i) => dg.dunlev_ureached
                && i !== game.tutorial_dnum).length <= 1) {
            /* C artifact.c:1871-1922: the one-dungeon menu is never shown, so
             * the blast pages behind the portal's own pline (post-damage HP).
             * With more than one reachable dungeon, artifact.c:1894's
             * select_menu is the next output: the menu arm below. */
            await pline(_blastMsg);
        } else if (_invProp === ARTI_BANISH) {
            /* C artifact.c:2167 invoke_banish(): prints nothing unless a demon
             * vanishes, so the blast line is the only topline message here. */
            await pline(_blastMsg);
        } else if (_invProp === ARTI_CREATE_AMMO) {
            await pline(_blastMsg);
        } else if ((obj.oartifact | 0) && _invProp > ARTI_LAST_PROP
            && _invProp !== ARTI_HEALING && _invProp !== ARTI_ENERGY_BOOST
            && !((obj.age | 0) > (game.moves | 0))) {
            const _uhpAfter = game.u.uhp, _mhAfter = game.u.mh;
            game.u.uhp = _uhpBefore; game.u.mh = _mhBefore; /* losehp drains u.mh while polymorphed (hack.c:4268) */
            try { await force_more(_blastMsg); } finally { game.u.uhp = _uhpAfter; game.u.mh = _mhAfter; }
            /* artifact.c:1894 select_menu draws its overlay over the status row
             * that last bot() painted (windows.c:1859 bot_disabled spans it), so
             * the menu frame keeps the pre-damage HP until the next bot(). */
            if (_invProp === ARTI_CREATE_PORTAL && game._botlStaleHp === undefined) {
                const _poly = (game.u.umonnum | 0) !== (game.u.umonster | 0);
                const _painted = (game._botlPaintSeq | 0) !== _botlPaintSeqBefore
                    ? game._lastPaintedBotl : null;
                game._botlStaleHp = _painted
                    ? (_poly ? _painted.mh | 0 : _painted.uhp | 0)
                    : (_poly ? _mhBefore | 0 : _uhpBefore | 0);
                game._botlStaleHpmax = _painted
                    ? (_poly ? _painted.mhmax | 0 : _painted.uhpmax | 0)
                    : (_poly ? game.u.mhmax | 0 : game.u.uhpmax | 0);
            }
        } else if (_invProp > 0 && _invProp <= ARTI_LAST_PROP) {
            game._arti_blast_held = _blastMsg;
        } else if (!_invProp && (obj.otyp | 0) !== CRYSTAL_BALL_OTYP) {
            /* artifact.c:2137 pline1(nothing_happens) is the next output: tty
             * update_topl joins it with the blast line instead of paging. */
            await pline(_blastMsg);
        } else if (_invProp === ARTI_ENERGY_BOOST && !((obj.age | 0) > (game.moves | 0))) {
            /* artifact.c:1829 invoke_energy_boost() raises u.uen, then its
             * You_feel("re-energized.") flush_screen repaints bot() before
             * more()ing the blast line: the --More-- shows the POST-boost Pw. */
            await pline(_blastMsg);
        } else
        await force_more(_blastMsg);
    }
    if (!_blastMsg && touched && (obj.oartifact | 0)
        && (ARTI_INV_PROP[obj.oartifact | 0] | 0) === ARTI_CREATE_PORTAL
        && !((obj.age | 0) > (game.moves | 0))
        && (game.dungeons || []).filter((dg, i) => dg.dunlev_ureached
            && i !== game.tutorial_dnum).length > 1
        && game._botlStaleHp === undefined) {
        /* An 80+ column blast line was already paged by tty update_topl inside
         * touch_artifact (js/wizcmds.js), so no line is held here.  losehp's
         * disp.botl is still unflushed when artifact.c:1894 select_menu opens
         * (bot_disabled, windows.c:1859): the menu frame keeps the pre-damage HP. */
        const _poly = (game.u.umonnum | 0) !== (game.u.umonster | 0);
        const _painted = (game._botlPaintSeq | 0) !== _botlPaintSeqBefore
            ? game._lastPaintedBotl : null;
        if (_poly ? (game.u.mh | 0) !== (_mhBefore | 0) : (game.u.uhp | 0) !== (_uhpBefore | 0)) {
            game._botlStaleHp = _painted
                ? (_poly ? _painted.mh | 0 : _painted.uhp | 0)
                : (_poly ? _mhBefore | 0 : _uhpBefore | 0);
            game._botlStaleHpmax = _painted
                ? (_poly ? _painted.mhmax | 0 : _painted.uhpmax | 0)
                : (_poly ? game.u.mhmax | 0 : game.u.uhpmax | 0);
        }
    }
    if (!touched) {
        if (obj.owornmask) await _remove_worn_item_thrown(obj, false); /* artifact.c:2558 */
        return ECMD_TIME;
    }

    return await arti_invoke(obj);
}

/* C artifact.c:515-522 spec_ability(struct obj *otmp, unsigned long abil)
 * Every spfx value is < 2^31, so JS's signed 32-bit `&` is exact here. */
export function spec_ability(otmp, abil) {
    const arti = get_artifact(otmp);

    return (arti !== ART_NONARTIFACT
            && (arti_spfx(arti) & abil) !== 0);
}

/* C artifact.c:525-533 confers_luck(struct obj *obj) */
export function confers_luck(obj) {
    /* might as well check for this too */
    if (obj.otyp === LUCKSTONE)
        return true;

    return !!(obj.oartifact && spec_ability(obj, SPFX_LUCK));
}

export function set_artifact_intrinsic(otmp, on, wp_mask) {
    let pending;
    const g = game;
    const u = g.u || (g.u = {});
    let maskProp = 0;
    const oart = get_artifact(otmp);

    if (oart === ART_NONARTIFACT)
        return;

    /* effects from the defn field */
    const dtyp = (wp_mask !== W_ART) ? arti_defn_adtyp(oart) : arti_cary_adtyp(oart);

    if (dtyp === AD_FIRE_ART) maskProp = FIRE_RES;
    else if (dtyp === AD_COLD_ART) maskProp = COLD_RES;
    else if (dtyp === AD_ELEC_ART) maskProp = SHOCK_RES;
    else if (dtyp === AD_MAGM_ART) maskProp = ANTIMAGIC;
    else if (dtyp === AD_DISN_ART) maskProp = DISINT_RES;
    else if (dtyp === AD_DRST_ART) maskProp = POISON_RES;
    else if (dtyp === AD_DRLI_ART) maskProp = DRAIN_RES;

    if (maskProp && wp_mask === W_ART && !on) {
        /* find out if some other artifact also confers this intrinsic;
           if so, leave the mask alone */
        for (let obj = u.invent || g.invent; obj; obj = obj.nobj) {
            if (obj !== otmp && obj.oartifact) {
                const art = get_artifact(obj);
                if (art !== ART_NONARTIFACT && arti_cary_adtyp(art) === dtyp) {
                    maskProp = 0;
                    break;
                }
            }
        }
    }
    if (maskProp)
        _sai_set(maskProp, on, wp_mask);

    /* intrinsics from the spfx field; there could be more than one */
    let spfx = (wp_mask !== W_ART) ? arti_spfx(oart) : arti_cspfx(oart);
    if (spfx && wp_mask === W_ART && !on) {
        /* don't change any spfx also conferred by other artifacts */
        for (let obj = u.invent || g.invent; obj; obj = obj.nobj)
            if (obj !== otmp && obj.oartifact) {
                const art = get_artifact(obj);
                if (art !== ART_NONARTIFACT)
                    spfx &= ~arti_cspfx(art);
            }
    }

    if (spfx & SPFX_SEARCH_ART)
        _sai_set(SEARCHING, on, wp_mask);
    if (spfx & SPFX_HALRES_ART) {
        pending = make_hallucinated(on ? 0 : 1, !g.program_state?.restoring, wp_mask);
    }
    if (spfx & SPFX_ESP_ART) {
        _sai_set(TELEPAT, on, wp_mask);
        recalc_telepat_range();
        see_monsters();
    }
    if (spfx & SPFX_STLTH_ART)
        _sai_set(STEALTH, on, wp_mask);
    if (spfx & SPFX_REGEN_ART)
        _sai_set(REGENERATION_ART, on, wp_mask);
    if (spfx & SPFX_TCTRL_ART)
        _sai_set(TELEPORT_CONTROL, on, wp_mask);
    if (spfx & SPFX_WARN_ART) {
        const m2 = spec_m2(otmp);
        if (m2) {
            _sai_set(WARN_OF_MON, on, wp_mask);
            const wt = (g.context ||= {}).warntype ||= { obj: 0, polyd: 0, speciesidx: 0 };
            if (on)
                wt.obj = (wt.obj | 0) | m2;
            else
                wt.obj = (wt.obj | 0) & ~m2;
            see_monsters();
        } else {
            _sai_set(WARNING, on, wp_mask);
        }
    }
    if (spfx & SPFX_EREGEN_ART)
        _sai_set(ENERGY_REGENERATION_ART, on, wp_mask);
    if (spfx & SPFX_HSPDAM_ART)
        _sai_set(HALF_SPDAM_ART, on, wp_mask);
    if (spfx & SPFX_HPHDAM_ART)
        _sai_set(HALF_PHDAM_ART, on, wp_mask);
    if (spfx & SPFX_XRAY_ART) {
        /* this assumes that no one else is using xray_range */
        u.xray_range = on ? 3 : -1;
        g.vision_full_recalc = 1;
    }
    if ((spfx & SPFX_REFLECT_ART) && (wp_mask & W_WEP_C))
        _sai_set(REFLECTING, on, wp_mask);
    if (spfx & SPFX_PROTECT_ART)
        _sai_set(PROTECTION_ART, on, wp_mask);

    if (wp_mask === W_ART && !on && arti_inv_prop(oart)) {
        /* might have to turn off invoked power too */
        const ip = arti_inv_prop(oart);
        if (ip <= LAST_PROP_ART
            && (((u.uprops?.[ip]?.extrinsic) | 0) & W_ARTI_FW))
            pending = arti_invoke(otmp);
    }

    if (wp_mask === W_WEP_C && is_art(otmp, ART_SUNSWORD))
        _sai_set(BLND_RES_ART, on, wp_mask);
    return pending;
}

/* u.uprops[p].extrinsic |= / &= ~wp_mask, with worn.c's BSS-zero-init shape. */
function _sai_set(propidx, on, wp_mask) {
    const u = game.u || (game.u = {});
    if (!u.uprops)
        u.uprops = {};
    if (!u.uprops[propidx])
        u.uprops[propidx] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    const p = u.uprops[propidx];
    p.extrinsic = on ? ((p.extrinsic | 0) | wp_mask) : ((p.extrinsic | 0) & ~wp_mask);
}

/* C artifact.c:1113 discover_artifact().  artidisco is a compact discovery
 * order list; retaining the order also matches the discoveries window. */
export function discover_artifact(art) {
    art |= 0;
    if (!art) return;
    const list = game.artidisco || (game.artidisco = []);
    if (!list.includes(art)) list.push(art);
}

// C artifact.c:artiname and arti_cost, shared by scoring and shop pricing.
export function artiname(artinum) {
    if (artinum <= 0 || artinum > ARTILIST.length)
        return '';
    return ARTILIST[artinum - 1].name;
}

export function arti_cost(otmp) {
    if (!otmp.oartifact)
        return BigInt(OC_COST[otmp.otyp]);
    else if (ARTILIST[otmp.oartifact - 1].cost)
        return ARTILIST[otmp.oartifact - 1].cost;
    else
        return 100n * BigInt(OC_COST[otmp.otyp]);
}

// ── artifact_name (nethack-c/src/artifact.c:328-353) ─────────────────────────
// Returns the full (display) name of an artifact named `name` if one exists,
// plus its base object type via the returned record's `otyp`.  Returns null if
// no match.  `fuzzy` allows extra/omitted spaces or dashes (fuzzymatch " -").
// C strips a leading "the " from both the player string and each artifact name
// before comparing.
export function artifact_name(name, fuzzy) {
    if (_startsWithThe(name))
        name = name.slice(4);
    for (let m = 0; m < ARTILIST.length; m++) {
        const a = ARTILIST[m];
        let aname = a.name;
        if (_startsWithThe(aname))
            aname = aname.slice(4);
        const matched = !fuzzy
            ? (name.toLowerCase() === aname.toLowerCase())
            : fuzzymatch(name, aname, " -", true);
        if (matched)
            return { name: a.name, otyp: a.otyp, arti: m + 1 };
    }
    return null;
}

/* C objects.h RIN_INCREASE_DAMAGE — the one artifact base type whose spe is
 * reset by artifact_exists() (js/do_wear.js:2258 has the same constant). */
const RIN_INCREASE_DAMAGE_OTYP = 177;

// C artifact.c:461-471 nartifact_exist — count artifacts whose .exists bit is set.
export function nartifact_exist() {
    const ae = _artiexist();
    let a = 0;
    for (const k in ae)
        if (_arti_exists_bit(k)) ++a;
    return a;
}

/* C artifact.c:340-352 exist_artifact(int otyp, const char *name) — has the
 * artifact with this EXACT name and base type already been created?  Note C
 * uses strcmp, not the fuzzy/"the "-stripping match artifact_name() uses. */
export function exist_artifact(otyp, name) {
    if (otyp && name) {
        for (let m = 0; m < ARTILIST.length; m++)
            if (ARTILIST[m].otyp === otyp && ARTILIST[m].name === name)
                return _arti_exists_bit(m + 1);
    }
    return false;
}

/* C artifact.c:355-390 artifact_exists(otmp, name, mod, flgs) — an artifact has
 * just been created (mod=TRUE) or is being un-created (mod=FALSE).  RNG-free. */
export function artifact_exists(otmp, name, mod, flgs) {
    if (otmp && name) {
        for (let m = 0; m < ARTILIST.length; m++) {
            const a = ARTILIST[m];
            if (a.otyp === otmp.otyp && a.name === name) {
                const idx = m + 1;
                otmp.oartifact = mod ? idx : 0;
                otmp.age = 0;
                if (otmp.otyp === RIN_INCREASE_DAMAGE_OTYP)
                    otmp.spe = 0;
                if (mod) { /* means being created rather than un-created */
                    /* one--and only one--of these should always be set */
                    if ((flgs & (ONAME_VIA_NAMING | ONAME_WISH | ONAME_GIFT
                                 | ONAME_VIA_DIP | ONAME_LEVEL_DEF
                                 | ONAME_BONES | ONAME_RANDOM)) === 0)
                        flgs |= ONAME_RANDOM; /* the default origin */
                    _artifact_origin(otmp, flgs);
                } else { /* uncreate */
                    _artiexist()[idx] = false; /* zero_artiexist */
                }
                break;
            }
        }
    }
}

/* C artifact.c:2837 permapoisoned(obj) — currently only Grimtooth
 * (artilist order: NONARTIFACT, EXCALIBUR, STORMBRINGER, MJOLLNIR, CLEAVER,
 * GRIMTOOTH => 5). */
export function permapoisoned(obj) {
    return !!obj && (obj.oartifact | 0) === 5;
}

export function defends_when_carried(adtyp, obj) {
    const a = obj ? (obj.oartifact | 0) : 0;
    return !!a && arti_cary_adtyp(a) === (adtyp | 0);
}

const PROTECTION_PROP = 59;      /* C prop.h:82 */

const SPFX_PROTECT = 0x08000000; /* C artifact.h:43 */

export function protects(otmp, being_worn) {
    if (being_worn && (MKOBJ_OC_OPROP[otmp.otyp | 0] | 0) === PROTECTION_PROP)
        return true;
    const arti = get_artifact(otmp);
    if (arti === ART_NONARTIFACT)
        return false;
    return ((arti_cspfx(arti) & SPFX_PROTECT) !== 0
            || (being_worn && (arti_spfx(arti) & SPFX_PROTECT) !== 0));
}

/* C artifact.h — the ART_ enum terminator; artilist[] indices run 0..33. */
const AFTER_LAST_ARTIFACT = 34;

/* C artifact.c:513 spec_m2(otmp) — artilist[oartifact].mtype, 0 for a
 * non-artifact.  (C dereferences get_artifact()'s always-non-NULL return, so
 * the dummy row's 0 is what a non-artifact yields.) */
export function spec_m2(otmp) {
    return ARTILIST_MTYPE[get_artifact(otmp)] | 0;
}

/* C ref: nethack-c/src/artifact.c:180-193 get_artifact(struct obj *obj)
 *   if (obj) { int artidx = (int) obj->oartifact;
 *              if (artidx > 0 && artidx < AFTER_LAST_ARTIFACT)
 *                  return &artilist[artidx]; }
 *   return &artilist[ART_NONARTIFACT];
 * C returns a pointer; JS returns the INDEX, so callers compare against
 * ART_NONARTIFACT exactly where C compares against &artilist[ART_NONARTIFACT]. */
export function get_artifact(obj) {
    if (obj) {
        const artidx = obj.oartifact | 0;
        /* skip 0, 1st artifact at 1 */
        if (artidx > 0 && artidx < AFTER_LAST_ARTIFACT)
            return artidx;
    }
    return ART_NONARTIFACT;
}

function mka_poison_tail(o) {
    if (o && permapoisoned(o))
        o.opoisoned = 1;
    return o;
}

export async function mk_artifact(otmp, alignment, max_giftvalue, adjust_spe) {
    const by_align = (alignment !== A_NONE);
    if (by_align)
        return _mk_artifact_by_align(alignment, max_giftvalue, otmp, adjust_spe);
    const o_typ = otmp ? (otmp.otyp | 0) : 0;
    /* C: unique = !by_align && otmp && objects[o_typ].oc_unique.  An oc_unique
     * base type suppresses the whole eligible scan.  game._oc_unique is the
     * same table js/eat.js:2014 reads; absent means "not unique", which is
     * correct for every weapon/armor otyp these call sites can produce. */
    const unique = !!(otmp && game._oc_unique && game._oc_unique[o_typ]);

    /* C artifact.c:190-251 — gather eligible artifacts.  On the !by_align path
     * the loop body reduces to the three skips plus `a->otyp == o_typ`; the
     * alignment/race/Role_if half is by_align-only, and the
     * `a->gift_value > max_giftvalue && !Role_if(a->role)` skip is dead here
     * because every call site passes max_giftvalue = 99 and the largest
     * gift_value in artilist.h is 12. */
    const eligible = [];
    for (let m = 1; m <= ARTILIST.length; m++) {
        if (_arti_exists_bit_local(m))
            continue;
        if (ARTI_NOGEN.has(m) || unique)
            continue;
        if (_ARTI_GIFT_INFO[m][3] > max_giftvalue
            && _ARTI_GIFT_INFO[m][1] !== uroleMnum())
            continue;
        if (ARTILIST[m - 1].otyp === o_typ)
            eligible.push(m);
    }

    if (!eligible.length)
        return mka_poison_tail(otmp); /* C:299-310 — nothing appropriate; return the original */

    /* C artifact.c:259 — m = eligible[rn2(n)] */
    const m = eligible[rn2(eligible.length)];
    const a = ARTILIST[m - 1];
    /* C:280 — prevent erosion from generating */
    otmp.oeroded = otmp.oeroded2 = 0;
    /* C:281-284 — oname() promotes it (artifact_exists -> artifact_origin with
     * the ONAME_RANDOM default), then C re-asserts oartifact and re-runs
     * artifact_origin(otmp, ONAME_RANDOM), including when oname returns early. */
    await oname(otmp, a.name, ONAME_NO_FLAGS);
    otmp.oartifact = m;
    _artifact_origin(otmp, ONAME_RANDOM);
    if (adjust_spe) {
        /* C:285-297 — clamped into the "normal" range. */
        const new_spe = (otmp.spe | 0) + (ARTI_GEN_SPE[m] | 0);
        if (new_spe >= -10 && new_spe < 10)
            otmp.spe = new_spe;
    }
    return mka_poison_tail(otmp);
}

/* C artifact.c:344 artiexist[m].exists, via the same game._artiexist store
 * js/objnam.js writes (an entry is either the legacy `true` or a full origin
 * record; both mean "exists"). */
function _arti_exists_bit_local(m) {
    const e = (game._artiexist || {})[m];
    return !!e && (e === true || !!e.exists);
}

export async function touch_artifact(otmp, mtmp) {
    const arti = (otmp && (otmp.oartifact | 0)) || 0;
    /* C artifact.c:910-915 get_artifact(obj); ART_NONARTIFACT → return 1. */
    if (!arti) return true;
    const oart = ARTI_PROPS[arti];
    if (!oart) return true;

    /* C artifact.c:917 yours = (mon == &gy.youmonst). */
    if (is_youmonst(mtmp))
        return !!await touch_artifact_youmonst(otmp);

    return touch_artifact_mon(otmp, mtmp);
}

/* C artifact.c:2243 finesse_ahriman(obj): will freeing this object from
 * inventory cause levitation to end?  Probes ahead on a copy of the
 * LEVITATION prop, restoring it before returning. */
export function finesse_ahriman(obj) {
    const u = game.u;
    const oart = get_artifact(obj);
    const p = u.uprops?.[LEVITATION];
    if (!_Levitation() || oart === ART_NONARTIFACT
        || arti_inv_prop(oart) !== LEVITATION || !((p.extrinsic | 0) & W_ARTI_FW))
        return false;
    const save = { intrinsic: p.intrinsic, extrinsic: p.extrinsic, blocked: p.blocked };
    /* arti_invoke(off) -> float_down() clears I_SPECIAL|TIMEOUT & W_ARTI */
    p.intrinsic = (p.intrinsic | 0) & ~(I_SPECIAL | TIMEOUT);
    p.extrinsic = (p.extrinsic | 0) & ~W_ARTI_FW;
    const result = !_Levitation();
    Object.assign(p, save);
    return result;
}

/* C ref: artifact.c defends(adtyp, otmp) / defends_when_carried(adtyp, otmp).
 * Both are one line over get_artifact(otmp), which is
 *   ((obj && obj->oartifact) ? &artilist[(int) obj->oartifact] : 0)
 * so a non-artifact answers FALSE without consulting any table.  The two adtyp
 * columns come from js/attrib.js, which parsed them out of
 * nethack-c-v5/upstream/include/artilist.h's A() X-macro and validated the
 * parse against the compiled spfx column — see the provenance note there.
 *
 * These were throw-stubs; resists_prop() below calls BOTH of them, guarded only
 * by obj->oartifact, so a hero wielding or carrying ANY artifact and asked for
 * a resistance halted the run.  No RNG on either side. */
export function defends(adtyp, obj) {
    const a = obj ? (obj.oartifact | 0) : 0;
    if (a)
        return arti_defn_adtyp(a) === (adtyp | 0);
    /* C artifact.c:644-681 if (Is_dragon_armor(otmp)): Is_dragon_mail
     * (GRAY_DRAGON_SCALE_MAIL 101..YELLOW 110) converts to scales
     * (GRAY_DRAGON_SCALES 111..YELLOW 120; shimmering is #if 0 in v5
     * objects.h).  AD_MAGM 1 -> gray, AD_HALU 36 -> GOLD_DRAGON_SCALES,
     * AD_FIRE 2 -> RED_DRAGON_SCALES, ... per monattk.h. */
    let otyp = obj ? (obj.otyp | 0) : 0;
    if (otyp >= 101 && otyp <= 110)
        otyp += 10;
    else if (otyp < 111 || otyp > 120)
        return false;
    switch (adtyp | 0) {
    case 1:  return otyp === 111;
    case 36: return otyp === 112;
    case 2:  return otyp === 114;
    case 3:  return otyp === 115;
    case 7:
    case 33: return otyp === 119;
    case 4:
    case 14: return otyp === 116;
    case 5:
    case 15: return otyp === 117;
    case 6:
    case 13: return otyp === 118;
    case 8:
    case 18: return otyp === 120;
    default: return false;
    }
}

const LIGHT_W_ARM = 0x00000001; /* prop.h W_ARM */

export function artifact_light(obj) {
    if (obj && ((obj.otyp | 0) === GOLD_DRAGON_SCALE_MAIL
                || (obj.otyp | 0) === GOLD_DRAGON_SCALES)
        && ((obj.owornmask | 0) & LIGHT_W_ARM) !== 0)
        return true;

    return !!obj && (obj.oartifact | 0) === ART_SUNSWORD;
}

/* C artifact.c:626 attacks() — use the attack column, not the defense or
 * carried-resistance column. get_artifact supplies the non-artifact sentinel. */
export function attacks(adtyp, otmp) {
    const weap = get_artifact(otmp);
    if (weap !== ART_NONARTIFACT)
        return ARTI_SPEC[weap].adtyp === adtyp;
    return false;
}

/* C artifact.h:21,35-40 */
const SPFX_ATTK_UH   = 0x00000040;

const SPFX_DMONS_UH  = 0x00100000;

const SPFX_DCLAS_UH  = 0x00200000;

const SPFX_DFLAG1_UH = 0x00400000;

const SPFX_DFLAG2_UH = 0x00800000;

const SPFX_DALIGN_UH = 0x01000000;

const SPFX_DBONUS_UH = 0x01F00000;

/* C monattk.h:42-58.  AD_PHYS_UH / AD_DRLI_UH / AD_STON_UH are already declared
 * further down this file (the mhitm_ad_* block) and are reused here. */
const AD_MAGM_UH = 1, AD_FIRE_UH = 2, AD_COLD_UH = 3,
      AD_ELEC_UH = 6, AD_DRST_UH = 7, AD_STUN_UH = 12;

/* C align.h — A_NONE is the "no alignment" sentinel artilist[] uses. */
const A_NONE_UH = -128;

/* C ref: artifact.c:1009-1064 spec_applies(weap, mtmp).  `mtmp === null` is
 * this file's existing convention for "the defender is the hero"
 * (js/mhitu.js:4028 calls hitval that way), i.e. C's `mtmp == &gy.youmonst`,
 * and `mndx` is then u.umonnum. */
function spec_applies(arti, mtmp, mndx) {
    const spfx = arti.spfx | 0;

    if (!(spfx & (SPFX_DBONUS_UH | SPFX_ATTK_UH)))
        return (arti.adtyp | 0) === AD_PHYS_UH;

    const yours = !mtmp || is_youmonst(mtmp);
    const ptr = mtmp?.data || (yours ? permonstTemplate(mndx ?? game.u.umonnum) : null);
    if (!ptr)
        return false;

    if (spfx & SPFX_DMONS_UH) {
        return (ptr.pmidx | 0) === (arti.mtype | 0);
    } else if (spfx & SPFX_DCLAS_UH) {
        return (arti.mtype | 0) === (ptr.mlet | 0);
    } else if (spfx & SPFX_DFLAG1_UH) {
        return (((ptr.mflags1 >>> 0) & (arti.mtype >>> 0)) !== 0);
    } else if (spfx & SPFX_DFLAG2_UH) {
        /* C artifact.c:1027-1030 and role.c races[].selfmask. */
        const selfmask = [0x8, 0x10, 0x20, 0x40, 0x80][game.flags?.initrace ?? 0] || 0;
        return (((ptr.mflags2 >>> 0) & (arti.mtype >>> 0)) !== 0)
               || (yours && ((!Upolyd(game.u) && (selfmask & arti.mtype) !== 0)
                   || (((arti.mtype & M2_WERE_UH) !== 0)
                       && ismnum(game.u.ulycn))));
    } else if (spfx & SPFX_DALIGN_UH) {
        return yours ? ((game.u?.ualign?.type | 0) !== artifact_alignment(ARTI_SPEC.indexOf(arti)))
                     : ((ptr.maligntyp | 0) === A_NONE_UH
                        || Math.sign(ptr.maligntyp | 0) !== artifact_alignment(ARTI_SPEC.indexOf(arti)));
    } else if (spfx & SPFX_ATTK_UH) {
        if (defended(yours ? game.youmonst : mtmp, arti.adtyp | 0))
            return false;

        switch (arti.adtyp | 0) {
        case AD_FIRE_UH:
            return !(yours ? _hero_resists(FIRE_RES) : Resists_Elem(mtmp, FIRE_RES));
        case AD_COLD_UH:
            return !(yours ? _hero_resists(COLD_RES) : Resists_Elem(mtmp, COLD_RES));
        case AD_MAGM_UH:
        case AD_STUN_UH:
            /* THE ONE RNG DRAW IN THIS FUNCTION (artifact.c:1049). */
            return !(yours ? Antimagic_uh() : (rn2(100) < (ptr.mr | 0)));
        case AD_ELEC_UH:
            return !(yours ? _hero_resists(SHOCK_RES) : Resists_Elem(mtmp, SHOCK_RES));
        case AD_DRST_UH:
            /* artifact.c:1050 `resists_poison(mtmp)` = monst.h:277
             * Resists_Elem(mon, POISON_RES); resists_poison_uh below is
             * exactly that call (mondata.c:129 full body, worn/carried/
             * wielded arms included). */
            return !(yours ? _hero_resists(POISON_RES) : resists_poison_uh(mtmp));
        case AD_DRLI_UH:
            return !(yours ? _hero_resists(DRAIN_RES) : resists_drli(mtmp));
        case AD_STON_UH:
            /* artifact.c:1054 `resists_ston(mtmp)` = monst.h:279
             * Resists_Elem(mon, STONE_RES); sh_resists_ston forwards to
             * js/mklev.js resists_ston, which is exactly that call. */
            return !(yours ? _hero_resists(STONE_RES) : sh_resists_ston(mtmp));
        default:
            impossible("Weird weapon special attack.");
        }
    }
    return false;
}

/* C ref: artifact.c:1075-1088 spec_abon(otmp, mon) — "special attack bonus".
 *   const struct artifact *weap = get_artifact(otmp);
 *   if (weap != &artilist[ART_NONARTIFACT]
 *       && weap->attk.damn && spec_applies(weap, mon))
 *       return rnd((int) weap->attk.damn);
 *   return 0;
 * The `weap->attk.damn &&` short-circuit matters: it keeps spec_applies (and
 * its rn2(100)) from running at all for an artifact with no to-hit die. */
export function spec_abon(otmp, mtmp, mndx) {
    const artidx = (otmp?.oartifact | 0);
    if (artidx <= 0 || artidx >= ARTI_SPEC.length)
        return 0;
    const weap = ARTI_SPEC[artidx];
    if (weap.damn && spec_applies(weap, mtmp, mndx))
        return rnd(weap.damn | 0);
    return 0;
}

let gs_spec_dbon_applies = false;

/* artilist[] ordinal of Grimtooth, the one artifact whose damage bonus
 * deliberately bypasses spec_applies() (artifact.c:1099-1102). */
const ART_GRIMTOOTH_UH = 5;

export function spec_dbon(otmp, mtmp, mndx, tmp) {
    const artidx = (otmp?.oartifact | 0);
    const weap = (artidx > 0 && artidx < ARTI_SPEC.length)
        ? ARTI_SPEC[artidx] : null;

    if (!weap
        || ((weap.adtyp | 0) === AD_PHYS_UH && (weap.damn | 0) === 0
            && (weap.damd | 0) === 0))
        gs_spec_dbon_applies = false;
    else if (artidx === ART_GRIMTOOTH_UH)
        gs_spec_dbon_applies = true;
    else
        gs_spec_dbon_applies = spec_applies(weap, mtmp, mndx);

    if (gs_spec_dbon_applies)
        return (weap.damd | 0) ? rnd(weap.damd | 0) : Math.max(tmp | 0, 1);
    return 0;
}

/* C ref: artifact.c:626-634 attacks(adtyp, otmp) and artifact.c:515-523
 * spec_ability(otmp, abil) — both are "get_artifact(), then read one column",
 * and both answer FALSE for a non-artifact. */
function arti_attacks(adtyp, otmp) {
    const artidx = (otmp?.oartifact | 0);
    if (artidx <= 0 || artidx >= ARTI_SPEC.length)
        return false;
    return (ARTI_SPEC[artidx].adtyp | 0) === (adtyp | 0);
}

/* C artifact.h:22,24 */
const SPFX_DRLI_UH   = 0x00000100;

const SPFX_BEHEAD_UH = 0x00000400;

export async function artifact_hit(magr, mdef, otmp, dmg, dieroll, mdefMndx = -1) {
    /* C artifact.c:1454-1455. Legacy nulls denote the hero, except a null
     * attacker against the hero is an unattended weapon (dothrow.c).
     * Also accept the actual youmonst used by other combat helpers. */
    const youdefend = !mdef || is_youmonst(mdef);
    const youattack = is_youmonst(magr) || (!magr && !youdefend);
    mdefMndx = mdef?.data?.pmidx ?? (youdefend ? game.u.umonnum : mdefMndx);
    if (youattack) magr = null;
    if (youdefend) mdef = null;
    const vis = (!youattack && magr && cansee(magr.mx | 0, magr.my | 0))
        || (!youdefend && mdef && cansee(mdef.mx | 0, mdef.my | 0))
        || (youattack && engulfing_u(mdef) && !_uh_Blind());
    const realizesDamage = youdefend || vis
        || (youattack && mdef === game.u?.ustuck);
    const hittee = youdefend ? 'you' : mon_nam(mdef);

    /* artifact.c:1470 — "The following takes care of most of the damage".
     * Runs BEFORE every arm below, including the ones that return early.
     * `mdefMndx` is the hero's u.umonnum when mdef is null (youdefend). */
    dmg = (dmg | 0) + spec_dbon(otmp, mdef, mdefMndx, dmg | 0);

    if (youattack && youdefend) {
        impossible('attacking yourself with weapon?');
        return { dmg, special: false };
    }
    if (arti_attacks(AD_FIRE_UH, otmp)) {
        if (realizesDamage) {
            const verb = !gs_spec_dbon_applies ? 'hits'
                : ((mdefMndx | 0) === PM_WATER_ELEMENTAL
                   ? 'vaporizes part of' : 'burns');
            await pline_The("fiery blade %s %s%c", verb, hittee,
                            !gs_spec_dbon_applies ? '.' : '!');
        }
        if (!rn2(4)) {
            const itemdmg = youdefend
                ? await destroy_items_zap(true, AD_FIRE_UH, dmg)
                : (await destroy_items_mon_zap(mdef, AD_FIRE_UH, dmg));
            if (!youdefend)
                dmg += itemdmg;
            // C artifact.c:1495 uses mdef->minvent even for youmonst;
            // the hero's carried inventory is a separate chain (gi.invent).
            await ignite_items_real(youdefend ? game.youmonst?.minvent : mdef.minvent);
        }
        if (youdefend)
            await burn_away_slime_real();
        return { dmg, special: realizesDamage };
    }
    if (arti_attacks(AD_COLD_UH, otmp)) {
        if (realizesDamage)
            await pline_The("ice-cold blade %s %s%c",
                            !gs_spec_dbon_applies ? 'hits' : 'freezes', hittee,
                            !gs_spec_dbon_applies ? '.' : '!');
        if (!rn2(4)) {
            const itemdmg = youdefend
                ? await destroy_items_zap(true, AD_COLD_UH, dmg)
                : (await destroy_items_mon_zap(mdef, AD_COLD_UH, dmg));
            if (!youdefend)
                dmg += itemdmg;
        }
        return { dmg, special: realizesDamage };
    }
    if (arti_attacks(AD_ELEC_UH, otmp)) {
        if (realizesDamage)
            await pline_The("massive hammer hits%s %s%c",
                            !gs_spec_dbon_applies ? '' : '!  Lightning strikes',
                            hittee, !gs_spec_dbon_applies ? '.' : '!');
        if (gs_spec_dbon_applies) {
            const wakeTarget = youdefend ? game.u : mdef;
            wake_nearto(wakeTarget.ux ?? wakeTarget.mx,
                        wakeTarget.uy ?? wakeTarget.my, 4 * 4);
        }
        if (!rn2(5)) {
            const itemdmg = youdefend
                ? await destroy_items_zap(true, AD_ELEC_UH, dmg)
                : (await destroy_items_mon_zap(mdef, AD_ELEC_UH, dmg));
            if (!youdefend)
                dmg += itemdmg;
        }
        return { dmg, special: realizesDamage };
    }
    if (arti_attacks(AD_MAGM_UH, otmp)) {
        /* artifact.c:1527-1535 */
        if (realizesDamage)
            await pline_The("imaginary widget hits%s %s%c",
                            !gs_spec_dbon_applies
                                ? '' : '!  A hail of magic missiles strikes',
                            hittee, !gs_spec_dbon_applies ? '.' : '!');
        return { dmg, special: realizesDamage };
    }

    /* artifact.c:1538-1541 */
    if (arti_attacks(AD_STUN_UH, otmp) && dieroll <= MB_MAX_DIEROLL_UH) {
        const mb = await Mb_hit(magr, mdef, otmp, dmg, dieroll, vis, hittee);
        return { dmg: mb.dmg, special: mb.result };
    }

    if (!gs_spec_dbon_applies)
        return { dmg, special: false };

    /* artifact.c:1550-1644 — "We really want 'on a natural 20' but Nethack does
     * it in reverse from AD&D."  Tsurugi 30, Vorpal Blade 18 (artilist index). */
    if (spec_ability(otmp, SPFX_BEHEAD_UH)) {
        const M1_NOHEAD_UH = 0x00008000, M1_AMORPHOUS_UH = 0x00000004;
        const S_GHOST_UH = 54;
        const hasHead = (ptr) => !((ptr.mflags1 | 0) & M1_NOHEAD_UH);
        const noncorpAmorph = (ptr) => (ptr.mlet | 0) === S_GHOST_UH
            || !!((ptr.mflags1 | 0) & M1_AMORPHOUS_UH);
        const notonhead = !!(game.gn && game.gn.notonhead);
        const uhp = () => (Upolyd(game.u) ? game.u.mh : game.u.uhp) | 0;
        let wepdesc;
        if (is_art(otmp, 30) && (dieroll | 0) === 1) {
            wepdesc = 'The razor-sharp blade';
            if (youattack && engulfing_u(mdef)) {
                await pline(`You slice ${mon_nam(mdef)} wide open!`);
                return { dmg: 2 * (mdef.mhp | 0) + FATAL_DAMAGE_MODIFIER_UH, special: true };
            }
            if (!youdefend) {
                /* allow normal cutworm() call to add extra damage */
                if (notonhead)
                    return { dmg, special: false };
                if ((mdef.data.msize | 0) >= MZ_LARGE) {
                    if (youattack)
                        await pline(`You slice deeply into ${mon_nam(mdef)}!`);
                    else if (vis)
                        await pline(`${Monnam(magr)} cuts deeply into ${hittee}!`);
                    return { dmg: dmg * 2, special: true };
                }
                dmg = 2 * (mdef.mhp | 0) + FATAL_DAMAGE_MODIFIER_UH;
                await pline(`${wepdesc} cuts ${mon_nam(mdef)} in half!`);
                observe_object(otmp);
                return { dmg, special: true };
            }
            const ydata = game.youmonst.data;
            if ((ydata.msize | 0) >= MZ_LARGE) {
                await pline(`${magr ? Monnam(magr) : wepdesc} cuts deeply into you!`);
                return { dmg: dmg * 2, special: true };
            }
            dmg = 2 * uhp() + FATAL_DAMAGE_MODIFIER_UH;
            await pline(`${wepdesc} cuts you in half!`);
            observe_object(otmp);
            return { dmg, special: true };
        } else if (is_art(otmp, 18)
                   && ((dieroll | 0) === 1
                       || (mdefMndx | 0) === PM_JABBERWOCK_UH)) {
            const behead_msg = ['%s beheads %s!', '%s decapitates %s!'];
            if (youattack && engulfing_u(mdef))
                return { dmg, special: false };
            wepdesc = 'Vorpal Blade';
            if (!youdefend) {
                if (!hasHead(mdef.data) || notonhead || game.u.uswallow) {
                    if (youattack)
                        await pline(`Somehow, you miss ${mon_nam(mdef)} wildly.`);
                    else if (vis)
                        await pline(`Somehow, ${mon_nam(magr)} misses wildly.`);
                    return { dmg: 0, special: !!(youattack || vis) };
                }
                if (noncorpAmorph(mdef.data)) {
                    await pline(`${wepdesc} slices through ${s_suffix(mon_nam(mdef))} ${mbodypart(mdef, 11 /* NECK */)}.`);
                    return { dmg, special: true };
                }
                dmg = 2 * (mdef.mhp | 0) + FATAL_DAMAGE_MODIFIER_UH;
                const fmt = behead_msg[rn2(2)]; /* ROLL_FROM(behead_msg) */
                await pline(fmt.replace('%s', wepdesc).replace('%s', mon_nam(mdef)));
                if (_xk_hallu() && !game.flags?.female)
                    await pline("Good job Henry, but that wasn't Anne.");
                observe_object(otmp);
                return { dmg, special: true };
            }
            const ydata = game.youmonst.data;
            if (!hasHead(ydata)) {
                await pline(`Somehow, ${magr ? mon_nam(magr) : wepdesc} misses you wildly.`);
                return { dmg: 0, special: true };
            }
            if (noncorpAmorph(ydata)) {
                await pline(`${wepdesc} slices through your ${body_part(11 /* NECK */)}.`);
                return { dmg, special: true };
            }
            dmg = 2 * uhp() + FATAL_DAMAGE_MODIFIER_UH;
            const fmt = behead_msg[rn2(2)];
            await pline(fmt.replace('%s', wepdesc).replace('%s', 'you'));
            observe_object(otmp);
            return { dmg, special: true };
        }
    }

    if (spec_ability(otmp, SPFX_DRLI_UH)) {
        /* artifact.c:1645-1720. `life` names the message noun; nonliving
         * targets (golems, vortices) get "animating force" instead. */
        const life = nonlivingMon(mdefMndx) ? 'animating force' : 'life';

        if (!youdefend) {
            const m_lev = mdef.m_lev | 0;
            const mhpmax0 = mdef.mhpmax | 0;
            let drain = monhp_per_lvl(mdef); /* usually 1d8 */

            /* "stop draining HP if it drops too low (still drains level;
             * also caller still inflicts regular weapon damage)" */
            if (mhpmax0 - drain <= m_lev)
                drain = (mhpmax0 > m_lev) ? (mhpmax0 - (m_lev + 1)) : 0;

            if (vis) {
                /* call distant_name() for possible side-effects even if the
                 * result won't be printed, exactly as C's comment says. */
                const otmpname = await distant_name(otmp, xname);
                if (is_art(otmp, _AC_ART_STORMBRINGER))
                    await pline_The('%s blade draws the %s from %s!',
                               hcolor(NH_BLACK_UH), life, mon_nam(mdef));
                else
                    await pline('%s draws the %s from %s!', The(otmpname), life,
                          mon_nam(mdef));
            }
            if ((mdef.m_lev | 0) === 0) {
                /* losing a level when at 0 is fatal */
                dmg = 2 * (mdef.mhp | 0) + FATAL_DAMAGE_MODIFIER_UH;
            } else {
                dmg += drain;
                mdef.mhpmax = mhpmax0 - drain;
                mdef.m_lev = m_lev - 1;
            }

            if (drain > 0) {
                /* drain: was target's damage, now heal attacker by half */
                drain = ((drain + 1) / 2) | 0; /* drain/2 rounded up */
                if (youattack)
                    healup(drain, 0, false, false);
                else
                    healmon(magr, drain, 0);
            }
            return { dmg, special: vis };
        } else { /* youdefend — not reached from do_attack's call site */
            const oldhpmax = game.u.uhpmax | 0;

            if (_uh_Blind()) {
                await pline('You feel an %s drain your %s!',
                            is_art(otmp, _AC_ART_STORMBRINGER)
                                ? 'unholy blade' : 'object', life);
            } else {
                const otmpname = await distant_name(otmp, xname);
                if (is_art(otmp, _AC_ART_STORMBRINGER))
                    await pline_The('%s blade drains your %s!',
                                    hcolor(NH_BLACK_UH), life);
                else
                    await pline('%s drains your %s!', The(otmpname), life);
            }
            /* C artifact.c:1708 — finish level loss (including death or life
             * saving at level 1) before artifact_hit returns to its caller. */
            await losexp('life drainage');
            if (magr && (magr.mhp | 0) < (magr.mhpmax | 0))
                healmon(magr, (Math.abs(oldhpmax - (game.u.uhpmax | 0)) + 1) / 2 | 0, 0);
            return { dmg, special: true };
        }
    }

    /* artifact.c:1721 */
    return { dmg, special: false };
}

/* C ref: artifact.c:1252-1440 Mb_hit(magr, mdef, mb, dmgptr, dieroll, vis,
 * hittee) — Magicbane's special effects.  `dmg` is C's *dmgptr, returned in
 * `{dmg, result}`.  probe_monster() (zap.c:626) is unported: its
 * non-empty-minvent arm throws rather than guessing. */
async function Mb_hit(magr, mdef, mb, dmg, dieroll, vis, hittee) {
    const youdefend = !mdef;
    const youattack = !magr && !youdefend;
    const u = game.u;
    let resisted = false, do_stun, do_confuse, result = false;
    let scare_dieroll = (MB_MAX_DIEROLL_UH / 2) | 0;
    const spe = mb.spe | 0;

    if (spe >= 3)
        scare_dieroll = (scare_dieroll / (1 << ((spe / 3) | 0))) | 0;
    if (!gs_spec_dbon_applies)
        dieroll += 1;

    do_stun = (Math.max(spe, 0) < rn2(gs_spec_dbon_applies ? 11 : 7));

    let attack_indx = 0; /* MB_INDEX_PROBE */
    dmg += rnd(4);
    if (do_stun) {
        attack_indx = 1; /* STUN */
        dmg += rnd(4);
    }
    if (dieroll <= scare_dieroll) {
        attack_indx = 2; /* SCARE */
        dmg += rnd(4);
    }
    if (dieroll <= ((scare_dieroll / 2) | 0)) {
        attack_indx = 3; /* CANCEL */
        dmg += rnd(4);
    }

    const MB_VERB = [["probe", "stun", "scare", "cancel"],
                     ["prod", "amaze", "tickle", "purge"]];
    const verb = MB_VERB[_xk_hallu() ? 1 : 0][attack_indx];
    if (youattack || youdefend || vis) {
        result = true;
        await pline_The("magic-absorbing blade %s %s!",
                        vtense(null, verb), hittee);
        if (attack_indx === 0 && !canspotmon(youdefend ? game.youmonst : mdef))
            map_invisible(youdefend ? u.ux : mdef.mx, youdefend ? u.uy : mdef.my);
    }

    switch (attack_indx) {
    case 3: { /* CANCEL */
        const old_mdat = youdefend ? game.youmonst.data : mdef.data;
        if (!await cancel_monst(youdefend ? game.youmonst : mdef, mb,
                                youattack, false, false)) {
            resisted = true;
        } else {
            do_stun = false;
            if (youdefend) {
                if (game.youmonst.data !== old_mdat)
                    dmg = 0; /* rehumanized, so no more damage */
                if ((u.uenmax | 0) > 0) {
                    u.uenmax--;
                    if ((u.uen | 0) > 0)
                        u.uen--;
                    game.disp && (game.disp.botl = true);
                    await You("lose magical energy!");
                }
            } else {
                if (mdef.data !== old_mdat)
                    hittee = mon_nam(mdef);
                if ((mdef.data?.pmidx | 0) === PM_CLAY_GOLEM_UH)
                    mdef.mhp = 1; /* cancelled clay golems will die */
                if (youattack && attacktype(mdef.data, AT_MAGC_UH)) {
                    u.uenmax++;
                    if (u.uenmax > u.uenpeak)
                        u.uenpeak = u.uenmax;
                    u.uen++;
                    game.disp && (game.disp.botl = true);
                    await You("absorb magical energy!");
                }
            }
        }
        break;
    }
    case 2: /* SCARE */
        if (youdefend) {
            if (Antimagic_uh()) {
                resisted = true;
            } else {
                nomul(-3);
                game.multi_reason = "being scared stiff";
                game.nomovemsg = "";
                if (magr && magr === u.ustuck && sticks(game.youmonst.data)) {
                    set_ustuck(null);
                    await You("release %s!", mon_nam(magr));
                }
            }
        } else {
            if (rn2(2) && await resist(mdef, WEAPON_CLASS_UH, 0, NOTELL_UH))
                resisted = true;
            else
                await monflee(mdef, 3, false, (mdef.mhp | 0) > dmg);
        }
        if (!resisted)
            do_stun = false;
        break;
    case 1: /* STUN */
        do_stun = true;
        break;
    case 0: /* PROBE */
        if (youattack && (spe === 0 || !rn2(3 * Math.abs(spe)))) {
            await pline_The("%s is insightful.", verb);
            await probe_monster(mdef);
        }
        break;
    }
    if (do_stun) {
        if (youdefend) {
            const ps = u.uprops[STUNNED] || (u.uprops[STUNNED] = { intrinsic: 0, extrinsic: 0, blocked: 0 });
            make_stunned(((ps.intrinsic | 0) & TIMEOUT) + 3, false);
        } else
            mdef.mstun = 1;
        if (attack_indx === 1)
            do_stun = false;
    }
    do_confuse = !rn2(12);
    if (do_confuse) {
        if (youdefend) {
            const pc = u.uprops[CONFUSION] || (u.uprops[CONFUSION] = { intrinsic: 0, extrinsic: 0, blocked: 0 });
            make_confused(((pc.intrinsic | 0) & TIMEOUT) + 4, false);
        } else
            mdef.mconf = 1;
    }

    const fakename = youdefend ? "You" : "Someone"; /* decl.c c_fakename */
    if (youattack || youdefend || vis) {
        hittee = upstart(hittee);
        if (resisted) {
            await pline("%s %s!", hittee, vtense(fakename, "resist"));
            shieldeff(youdefend ? u.ux : mdef.mx, youdefend ? u.uy : mdef.my);
        }
        if ((do_stun || do_confuse) && (game.flags?.verbose ?? true)) {
            let buf = '';
            if (do_stun)
                buf += "stunned";
            if (do_stun && do_confuse)
                buf += " and ";
            if (do_confuse)
                buf += "confused";
            await pline("%s %s %s%s", hittee, vtense(fakename, "are"), buf,
                        (do_stun && do_confuse) ? '!' : '.');
        }
    }
    return { dmg, result };
}

const PM_CLAY_GOLEM_UH = 256; /* pm.generated.js PM_CLAY_GOLEM */

const WEAPON_CLASS_UH = 2; /* objclass.h WEAPON_CLASS */

const NOTELL_UH = 0; /* const.js NOTELL */

/* C artifact.c:63 FATAL_DAMAGE_MODIFIER — enough to guarantee xkilled(). */
const FATAL_DAMAGE_MODIFIER_UH = 200;

/* C decl.c:17 c_color_names.c_black. */
const NH_BLACK_UH = 'black';

/* C artifact.c:1241 — "rolls above this aren't magical". */
const MB_MAX_DIEROLL_UH = 8;

export function shade_glare(obj) {
    if (!obj)
        return false;
    /* C artifact.c:560-561: any silver object is effective */
    if (sr_oc_material(obj.otyp | 0) === SHADE_GLARE_SILVER_MAT)
        return true;
    /* C artifact.c:563-566: non-silver artifacts with bonus against undead */
    const arti = get_artifact(obj);
    if (arti !== ART_NONARTIFACT && (arti_spfx(arti) & SPFX_DFLAG2_UH) && (spec_m2(obj) === M2_UNDEAD))
        return true;
    return false;
}

// C artifact.c:2427-2462; artilist.h gives only these three artifacts a color.
export function glow_color(arti) {
    const color = arti === 5 ? CLR_RED
        : (arti === 6 || arti === 7) ? CLR_BRIGHT_BLUE : NO_COLOR;
    return hcolor(clr2colorname(color));
}

export function glow_verb(count, ingsfx) {
    const verb = count > 12 ? 'gleam' : count > 4 ? 'glimmer'
        : count > 0 ? 'flicker' : 'quiver';
    return verb + (ingsfx ? 'ing' : '');
}

export function Sting_effects(cnt) {
    /* C artifact.c:2466-2507.  Sting, Orcrist, and Grimtooth all use the
     * weapon's warning intrinsic.  Messages track blindness toggles and
     * strength changes across C's three thresholds (1, 5, 13 monsters).
     * This is display-only and consumes no scored RNG. */
    const wep = game.u?.uwep;
    const arti = wep?.oartifact | 0;
    if (arti !== 5 && arti !== 6 && arti !== 7)
        return;

    const oldCount = game.warn_obj_cnt | 0;
    const oldStrength = oldCount > 12 ? 3 : oldCount > 4 ? 2 : oldCount > 0 ? 1 : 0;
    const newStrength = cnt > 12 ? 3 : cnt > 4 ? 2 : cnt > 0 ? 1 : 0;
    const name = bare_artifactname(wep);
    const pluralVerb = (verb) => otense(wep, verb);

    if (cnt === -1 && oldCount > 0) {
        /* Blindness toggled: continue the existing glow, with quiver while
         * blind, so the eventual stop message has the matching verb. */
        void pline(`${name} is ${glow_verb(_disp_Blind() ? 0 : oldCount, true)}.`);
    } else if (newStrength > 0 && newStrength !== oldStrength) {
        /* C artifact.c:2482 — goto_level() -> docrt() -> see_monsters() ->
         * Sting_effects(): deliver a pending "You materialize on a different
         * level" first so the start-glowing message comes after it. */
        void _rt_maybe_lvltport_feedback();
        if (!_disp_Blind()) {
            // C artifact.c:2487-2490 only chooses a glow color when sighted.
            const color = glow_color(arti);
            const punctuation = newStrength > oldStrength ? '!' : '.';
            void pline(`${name} ${pluralVerb(glow_verb(cnt, false))} ${color}${punctuation}`);
        } else if (oldStrength === 0) {
            void pline(`${name} ${pluralVerb(glow_verb(0, false))} slightly.`);
        }
    } else if (cnt === 0 && oldCount > 0) {
        void pline(`${name} stops ${glow_verb(_disp_Blind() ? 0 : oldCount, true)}.`);
    }
}

/* C artifact.c:2709-2749 count_surround_traps(): count locations, including
 * the hero's square, but ignore traps already shown in the glyph buffer. */
function count_surround_traps(x, y) {
    let count = 0;
    for (let dx = x - 1; dx < x + 2; ++dx) {
        for (let dy = y - 1; dy < y + 2; ++dy) {
            if (!isok(dx, dy)) continue;
            const loc = game.level.at(dx, dy);
            // C glyph_is_trap(glyph_at(dx, dy)): inspect the displayed class.
            if (loc.disp_cls === GLYPHCLS_TRAP) continue;
            if (t_at(dx, dy)) {
                ++count;
                continue;
            }
            if (IS_DOOR(loc.typ) && (loc.doormask & D_TRAPPED)) {
                ++count;
                continue;
            }
            for (let o = vobj_at(dx, dy); o; o = o.nexthere) {
                // C obj.h Is_container: LARGE_BOX through BAG_OF_TRICKS.
                if (o.otyp >= 214 && o.otyp <= 220 && o.otrapped) {
                    ++count;
                    break;
                }
            }
        }
    }
    return count;
}

/* C artifact.c:2753-2770 mkot_trap_warn(), called at allmain.c:351. */
const ART_MASTER_KEY_OF_THIEVERY = 29;

function u_wield_art(art) {
    return !!(game.u?.uwep && (game.u.uwep.oartifact | 0) === art);
}

export async function mkot_trap_warn() {
    const u = game.u;
    if (!u.uarmg && u_wield_art(ART_MASTER_KEY_OF_THIEVERY)) {
        const heat = ['cool', 'slightly warm', 'warm', 'very warm',
                      'hot', 'very hot', 'like fire'];
        const ntraps = count_surround_traps(u.ux, u.uy);
        if (ntraps !== (game.mkot_trap_warn_count || 0))
            await pline(`The Key feels ${heat[Math.min(ntraps, heat.length - 1)]}${ntraps > 3 ? '!' : '.'}`);
        game.mkot_trap_warn_count = ntraps;
    } else {
        game.mkot_trap_warn_count = 0;
    }
}

const TOOL_CLASS = 6;

const LEASH = 236;

const LARGE_BOX = 214;

const BAG_OF_TRICKS = 220;

const _Is_container = (o) => ((o.otyp | 0) >= LARGE_BOX && (o.otyp | 0) <= BAG_OF_TRICKS);

const _Has_contents = (o) => !!o.cobj;

/* C artifact.c:2596-2635 untouchable(). */
async function untouchable_hero(obj, drop) {
    const u = game.u;
    const wearmask = ~(W_QUIVER | (u.twoweap ? 0 : W_SWAPWEP) | W_BALL);
    if (!obj) return false;
    /* C artifact.c:2608-2613: some items in use don't have any wornmask setting */
    const beingworn = (obj.owornmask & wearmask) !== 0
        || ((obj.oclass | 0) === TOOL_CLASS
            && (!!obj.lamplit
                || ((obj.otyp | 0) === LEASH && !!obj.leashmon)
                || (_Is_container(obj) && _Has_contents(obj))));
    /* carryeffect/invoked: get_artifact(obj) != ART_NONARTIFACT, artifact.c:2610-2616 */
    const art = obj.oartifact | 0;
    const carryeffect = art > 0 && (arti_cary_adtyp(art) !== 0 || arti_cspfx(art) !== 0);
    const ip = art > 0 ? arti_inv_prop(art) : 0;
    const invoked = ip > 0 && ip <= LAST_PROP
        && ((u.uprops?.[ip]?.extrinsic | 0) & W_ARTI) !== 0;
    if (!(beingworn || carryeffect || invoked)) return false;
    if (await retouch_object_hero(obj, drop)) return false;
    /* C artifact.c:2630-2631: reverse invocation if retouch left the object
     * carried.  Dropping it already reverses invocation through freeinv(). */
    if (invoked) {
        for (let carried = game.invent; carried; carried = carried.nobj) {
            if (carried === obj) {
                await arti_invoke(obj);
                break;
            }
        }
    }
    return true;
}

/* C artifact.c:2640-2705 retouch_equipment(dropflag): 0 none, 1 all, 2 weapon. */
export async function retouch_equipment(dropflag) {
    const u = game.u;
    const had_gloves = !!u.uarmg;
    const had_rings = Number(!!u.uleft) + Number(!!u.uright);
    if (!_rt_nesting++) _rt_clear_bypasses();
    let dropit = dropflag > 0;
    try {
        if (u.twoweap && u.uswapwep) { _rt_bypass_obj(u.uswapwep); await untouchable_hero(u.uswapwep, dropit); }
        if (u.uwep) { _rt_bypass_obj(u.uwep); await untouchable_hero(u.uwep, dropit); }
        // C artifact.c:2674-2680: a saddle is checked without dropping it.
        const saddle = u.usteed && _rt_which_armor(u.usteed, W_SADDLE);
        if (saddle && await untouchable_hero(saddle, false))
            await _rt_dismount_steed(DISMOUNT_THROWN);
        dropit = dropflag === 1;
        let obj;
        while ((obj = _rt_nxt_unbypassed_obj(game.invent)) !== null && obj !== undefined)
            await untouchable_hero(obj, dropit);
        if (had_rings !== Number(!!u.uleft) + Number(!!u.uright)
            && u.uarmg && u.uarmg.cursed)
            _rt_uncurse(u.uarmg);
        if (had_gloves && !u.uarmg)
            await _rt_selftouch('After losing your gloves, you');
    } finally {
        if (!--_rt_nesting) _rt_clear_bypasses();
    }
}

let _rt_nesting = 0;
