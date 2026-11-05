// artifact.js — C ref: artifact.c.
import { ART_NONARTIFACT, arti_cary_adtyp, arti_cspfx, arti_defn_adtyp, arti_inv_prop, arti_spfx, confers_luck as confers_luck_real, exercise, get_artifact, spec_m2 } from './attrib.js';
import { AD_COLD_ART, AD_DISN_ART, AD_DRLI_ART, AD_DRST_ART, AD_ELEC_ART, AD_FIRE_ART, AD_MAGM_ART, ART_SUNSWORD, BLND_RES_ART, CRYSTAL_BALL_OTYP, DEADMONSTER, ENERGY_REGENERATION_ART, GETOBJ_EXCLUDE, GETOBJ_SUGGEST, HALF_PHDAM_ART, HALF_SPDAM_ART, LAST_PROP_ART, MS_NEMESIS, OTYP_ARROW, PROTECTION_ART, REGENERATION_ART, Role_if, SPFX_EREGEN_ART, SPFX_ESP_ART, SPFX_HALRES_ART, SPFX_HPHDAM_ART, SPFX_HSPDAM_ART, SPFX_PROTECT_ART, SPFX_REFLECT_ART, SPFX_REGEN_ART, SPFX_SEARCH_ART, SPFX_STLTH_ART, SPFX_TCTRL_ART, SPFX_WARN_ART, SPFX_XRAY_ART, W_WEP_C, Your, _Blind_cmd, _IA_BELL_OF_OPENING_OTYP, _You_feel, _hero_Blind, _is_demon, _ld_carried, _retouch_ag, _retouch_dmg, _uprop_active, do_blinding_ray, enlightenment_menu, getObjFromGetobj, invocation_pos, ledger_no_cmd, level_tele, spelleffects, tty_menu_pick_one_ext, untrap_at, use_crystal_ball, verbalize } from './cmd.js';
import { ANTIMAGIC, A_CON, BLINDED, COLD_RES, CONFLICT, DISINT_RES, DRAIN_RES, ECMD_CANCEL, ECMD_OK, ECMD_TIME, FIRE_RES, GETOBJ_ALLOWCNT, GETOBJ_PROMPT, HALLUC, INVIS, I_SPECIAL, In_endgame, In_quest, KILLED_BY, LEVITATION, MAGICENLIGHTENMENT, MIGR_RANDOM, POISON_RES, REFLECTING, SEARCHING, SHOCK_RES, SICK, SICK_ALL, SLIMED, STEALTH, TELEPAT, TELEPORT_CONTROL, TIMEOUT, Upolyd, WARNING, WARN_OF_MON, W_ART, W_ARTI as W_ARTI_FW, isok, nothing_seems_to_happen } from './const.js';
import * as _PROPIDS from './const.js';
import { force_more, newsym, see_monsters } from './display.js';
import { pline } from './pline.js';
import { goto_level } from './do.js';
import { xname, yname } from './do_wear.js';
import { recalc_telepat_range } from './worn.js';
import { float_down, float_up } from './trap.js';
import { mdrop_special_objs, migrate_to_level, unstuck } from './dog.js';
import { losehp } from './hack.js';
import { throwit } from './dothrow.js';
import { game } from './gstate.js';
import { depth } from './dungeon.js';
import { hold_another_object } from './invent.js';
import { update_inventory } from './inventory_refresh.js';
import { spoteffects } from './hack.js';
import { getdir } from './lock.js';
import { Inhell } from './makemon.js';
import { bcsign, mksobj } from './mklev.js';
import { getrumor } from './rumors.js';
import { On_stairs } from './stairs.js';
import { Tobjnam as _objnam_Tobjnam, aobjnam, killer_xname, otense, the } from './objnam.js';
import { impossible as real_impossible } from './pline.js';
import { PM_GREMLIN, PM_TOURIST } from './pm.generated.js';
import { make_hallucinated, make_sick, make_slimed } from './potion.js';
import { charge_ok, litroom, recharge, seffects } from './read.js';
import { d, rn2, rnd, rnz } from './rng.js';
import { spell_skilltype } from './spell.js';
import { remove_worn_item as _remove_worn_item_thrown } from './steal.js';
import { next_to_u as next_to_u_real, u_teleport_mon } from './teleport.js';
import { couldsee } from './vision.js';
import { weight } from './weight.js';
import { bane_applies_hero, touch_artifact_youmonst } from './wizcmds.js';
import { BlindedTimeout, flashburn, lightdamage, make_blinded } from './zap.js';
import { ONAME_BONES, ONAME_GIFT, ONAME_LEVEL_DEF, ONAME_RANDOM, ONAME_VIA_DIP, ONAME_VIA_NAMING, ONAME_WISH } from './const.js'; // relocate-fns
import { ARTILIST, _arti_exists_bit, _artiexist, _artifact_origin, _startsWithThe } from './objnam.js';
import { fuzzymatch } from './hacklib.js'; // relocate-fns
import { OC_COST } from './oc_cost_data.js'; // relocate-fns
import { MKOBJ_OC_OPROP } from './mkobj_erosion_meta.js'; // relocate-fns

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

export function confers_luck(obj) {
    return confers_luck_real(obj);
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
