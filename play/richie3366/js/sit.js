// sit.js — #sit command (floor / fountain / OBJ_AT subset) + attrcurse /
// rndcurse + throne_sit_effect / special_throne_effect (D-1033/D-1034) +
// dosit trap-before-throne (D-1039) + take_gold remove_worn_item (D-1049)
// + water/pool/gremlin sit (D-1055/D-1056) + furniture sit_message
// (D-1057: sink/altar/grave/stairs/ladder) + lava/ice/DRAWBRIDGE_DOWN
// sit (D-1058; terrain, not trap TT_LAVA; D-1060 Fire/Cold
// youprop.h uprops[FIRE_RES]/[COLD_RES] intrinsic||extrinsic).
// C ref: sit.c dosit / throne_sit_effect / special_throne_effect /
// take_gold / attrcurse / rndcurse; dungeon.c surface (fountain branch);
// potion.c split_mon / mhitu.c cloneu (locals — sit cannot import
// potion.js/mhitu.js: eat←potion, zap←mhitu cycles).
//
// Branch envelope: reachable floor (Levitation only), OBJ_AT picnic body
// (dragon/towel/slithy/sit+comfort/squishy/cream-pie), trap-before-throne
// (D-1039: already-trapped sit / dotrap VIASITTING), water/pool/gremlin
// (D-1055: early goto in_water for pool !Underwater and gremlin
// fountain/pool; Underwater/waterlevel cushions/mud; in_water sit +
// split_mon+dryup / rn2(10) water_damage uarm twice; D-1056: C
// youprop.h Underwater ≡ u.uinwater), IS_SINK/IS_ALTAR/IS_GRAVE/STAIRS/
// LADDER sit_message (D-1057; sink humanoid rump vs underside; altar
// altar_wrath via dynamic import — pray.js already imports sit.js),
// lava WWalking sit_message + burn_away_slime + likes_lava warm vs
// d((Fire_resistance?2:10),10) "sitting on lava" (D-1058;
// D-1060 Fire_resistance/Cold_resistance read uprops[] like
// youprop.h, not H||E flats alone), ice sit_message +
// !Cold_resistance "ice feels cold", DRAWBRIDGE_DOWN
// sit_message "drawbridge" (before IS_THRONE; trap TT_LAVA is D-1039),
// IS_THRONE sit + special_throne_effect (wish/drain/grease/attrcurse/
// VS-goto/msummon/ confused remove-curse HConfusion-only D-1048 /
// poly/acid/shuffle) + ordinary throne_sit_effect 1–13 (adjattrib/shock/
// heal/take_gold/luck-wish/courtmon/genocide/ curse/see-invis mapping/
// aggravate-tele/identify/pretzel), default having-fun; attrcurse
// rnd(11) INTRINSIC strip (D-0945); rndcurse invent + Magicbane /
// Antimagic / Half_spell_damage / SPFX_INTEL resist / steed saddle
// (D-0969).
// Deferred: steed name, hider, can_reach_floor full, ustuck, uteetering/
// uescaped_shaft gate, wizard getlin / Analyze y_n,
// lay_an_egg, money_cnt meager coil; clone_mon monster split_mon;
// shieldeff; update_inventory redraw; Hallucination hcolor synonyms;
// Yobjnam2 shk_your/pname polish; SetVoice; eyecount poly; hero
// pit/hole dotrap bodies still named-omit in trap.js. take_gold calls
// steal.c remove_worn_item (D-1049); armor *_off / unpunish / setnotworn
// pointer-walk still named on that helper. D-0956: set_mimic_blocking
// on SEE_INVIS attrcurse arm. D-1058 uses shared hack.js is_lava
// (LAVAPOOL/LAVAWALL); DRAWBRIDGE_UP+DB_LAVA under still named there.

import { game } from './gstate.js';
import {
    pline, You_feel, newsym, see_monsters, map_background, newsym_force,
    verbalize,
} from './display.js';
import { set_mimic_blocking, cansee } from './vision.js';
import { rnd, rn2, rn1, d } from './rng.js';
import {
    ECMD_OK, ECMD_TIME,
    IS_FOUNTAIN, IS_AIR, IS_ALTAR, IS_GRAVE, IS_ROOM, IS_WALL, IS_DOOR,
    IS_THRONE, IS_SINK, In_V_tower, ROOM, CLOUD, FOUNTAIN, STAIRS, LADDER,
    ICE, DRAWBRIDGE_DOWN, DRAWBRIDGE_UP, DB_UNDER, DB_ICE,
    Is_waterlevel,
    G_EXTINCT, NO_MINVENT, MM_EDOG, MM_NOMSG,
    INTRINSIC, TIMEOUT, FROMOUTSIDE, W_SADDLE, W_WEAPONS, W_BALL, W_CHAIN,
    FIRE_RES, COLD_RES, POISON_RES, TELEPAT, TELEPORT, INVIS, SEE_INVIS,
    FAST, STEALTH, PROTECTION, AGGRAVATE_MONSTER,
    KILLED_BY, KILLED_BY_AN, UTOTYPE_NONE, POLY_NOFLAGS, Upolyd, SICK_ALL,
    NO_MM_FLAGS,
    EYE, HEAD, FOOT,
    TT_BEARTRAP, TT_PIT, TT_WEB, TT_LAVA, TT_INFLOOR, TT_BURIEDBALL,
    SPIKED_PIT, VIASITTING,
} from './const.js';
import { objects_at, delobj, curse, unbless } from './mkobj.js';
import { objectNames, COIN_CLASS, SPBOOK_CLASS } from './objects.js';
import { xname, the, The, vtense, makeplural } from './objnam.js';
import {
    amorphous, mons, M1_SLITHY, is_prince, is_vampire, eggs_in_water,
    humanoid, likes_lava, monsterNames,
} from './monsters.js';
import { get_artifact, SPFX_INTEL } from './artifact.js';
import { ART_MAGICBANE } from './generated/artifacts_data.js';
import { A_MAX, A_CON, A_STR, A_WIS, adjattrib, exercise, change_luck } from './attrib.js';
import { losexp } from './exper.js';
import { find_hell } from './dungeon.js';
import { yn_function } from './getline.js';
import { t_at, dotrap, water_damage } from './trap.js';
import { losehp, finish_maybe_wail, is_pool, is_lava } from './hack.js';
import { uwepgone, uswapwepgone, uqwepgone } from './wield.js';
import { burn_away_slime } from './timeout.js';
import { hliquid, christen_monst } from './do_name.js';

const CORPSE = objectNames.indexOf('CORPSE');
const TOWEL = objectNames.indexOf('TOWEL');
const CREAM_PIE = objectNames.indexOf('CREAM_PIE');
const LARGE_BOX = objectNames.indexOf('LARGE_BOX');
const CHEST = objectNames.indexOf('CHEST');
const SPE_REMOVE_CURSE = objectNames.indexOf('SPE_REMOVE_CURSE');
const WATER_WALKING_BOOTS = objectNames.indexOf('WATER_WALKING_BOOTS');
const PM_GREMLIN = monsterNames.indexOf('PM_GREMLIN');
const CLOTH = 6; // objclass.h obj_material_types

/** C youprop.h:279 `#define Underwater (u.uinwater)`. */
function Underwater() {
    return !!(game.u?.uinwater);
}

/** C youprop.h Blind — HBlinded TIMEOUT or flat Blind. */
function Blind() {
    const u = game.u || {};
    return !!((u.Blind) || ((u.HBlinded | 0) & TIMEOUT));
}

/** C youprop.h Blind_telepat — HTelepat || ETelepat. */
function Blind_telepat() {
    const u = game.u || {};
    return !!((u.HTelepat | 0) || (u.ETelepat | 0) || u.Blind_telepat);
}

/** C youprop.h See_invisible. */
function See_invisible() {
    const u = game.u || {};
    return !!((u.HSee_invisible | 0) || (u.ESee_invisible | 0)
        || u.See_invisible);
}

/** C youprop.h Antimagic. */
function Antimagic() {
    const u = game.u || {};
    return !!(u.Antimagic || u.HAntimagic || u.EAntimagic);
}

/** C youprop.h Half_spell_damage. */
function Half_spell_damage() {
    const u = game.u || {};
    return !!(u.Half_spell_damage || u.HHalf_spell_damage
        || u.EHalf_spell_damage);
}

/** C youprop.h Hallucination. */
function Hallucination() {
    const u = game.u || {};
    if (u.Halluc_resistance) return false;
    return !!((u.Hallucination)
        || ((u.HHallucination | 0) & TIMEOUT));
}

/** C ref: obj.h u_wield_art — is_art(uwep, art). */
function u_wield_art(art) {
    const uwep = game.u?.uwep;
    return !!(uwep && (uwep.oartifact | 0) === (art | 0));
}

/** C ref: worn.c which_armor — first minvent obj with owornmask bit. */
function which_armor(mtmp, mask) {
    for (const o of mtmp?.minvent || []) {
        if ((o.owornmask || 0) & mask) return o;
    }
    return null;
}

/** C ref: potion.c hcolor — Hallucination synonym deferred. */
function hcolor(colorword) {
    return colorword || 'odd';
}

/** C ref: objnam.c Tobjnam — The(xname) + otense verb. */
function Tobjnam(otmp, verb) {
    const nam = The(xname(otmp));
    if (!verb) return nam;
    return `${nam} ${vtense(xname(otmp), verb)}`;
}

/** C ref: objnam.c Yobjnam2 — "Your <xname> <verb>". */
function Yobjnam2(obj, verb) {
    const nam = xname(obj);
    return `Your ${nam} ${vtense(nam, verb)}`;
}

/**
 * C ref: steal.c remove_worn_item(obj, unchain_ball).
 * take_gold / cursed_book pass FALSE. Gold is worn as W_WEAPONS
 * (quiver — pickup.c / shk.c); C then uwepgone/uswapwepgone/uqwepgone.
 * Named omit: donning/cancel_don; in_use; Armor_off/Cloak_off/Boots_off/
 * Gloves_off/Helmet_off/Shield_off/Shirt_off; Amulet_off; Ring_gone;
 * Blindf_off; unpunish; do.js setnotworn pointer-walk (COIN_CLASS never
 * occupies those slots). sit cannot import steal.js (hack→eat cycle).
 */
function remove_worn_item(obj, unchain_ball) {
    if (!obj) return;
    // C: if (donning(obj)) cancel_don();
    if (!obj.owornmask) return;

    const u = game.u || {};
    // C: oldinuse = obj->in_use; obj->in_use = 1; restore at end
    if (obj.owornmask & W_WEAPONS) {
        if (obj === u.uwep) uwepgone();
        if (obj === u.uswapwep) uswapwepgone();
        if (obj === u.uquiver) uqwepgone();
    }
    if (obj.owornmask & (W_BALL | W_CHAIN)) {
        if (unchain_ball) {
            // C unpunish() — take_gold passes FALSE
        }
    } else if (obj.owornmask) {
        // C catchall setnotworn(obj) — weapon slots already *gone
        obj.owornmask = 0;
    }
}

/**
 * C ref: sit.c take_gold — strip COIN_CLASS from invent.
 * C: remove_worn_item(otmp, FALSE) then delobj. JS invent[] splice
 * stays: obj_extract_self still omits OBJ_INVENT (mkobj.js).
 */
export async function take_gold() {
    let lost_money = false;
    const invent = game.invent || [];
    for (const otmp of [...invent]) {
        if (otmp?.oclass !== COIN_CLASS) continue;
        lost_money = true;
        remove_worn_item(otmp, false);
        const idx = invent.indexOf(otmp);
        if (idx >= 0) invent.splice(idx, 1);
        delobj(otmp);
    }
    if (!lost_money) {
        await You_feel('a strange sensation.');
    } else {
        await pline('You notice you have no gold!');
        if (game.flags) game.flags.botl = true;
        if (game.disp) game.disp.botl = true;
        if (game._goldCount != null) game._goldCount = 0;
    }
}

/**
 * C ref: sit.c rndcurse — curse random invent (and maybe steed saddle).
 * Branch envelope: Magicbane absorb; Antimagic shield (flash deferred);
 * invent non-COIN sample; SPFX_INTEL resist; bless→unbless else curse;
 * steed W_SADDLE 1/4.
 * Named omissions: shieldeff; update_inventory redraw; Hallucination
 * hcolor; Yobjnam2 article polish.
 */
export async function rndcurse() {
    const u = game.u || (game.u = {});

    if (u_wield_art(ART_MAGICBANE) && rn2(20)) {
        // C: You(mal_aura, "the magic-absorbing blade")
        await You_feel('a malignant aura surround the magic-absorbing blade.');
        return;
    }

    if (Antimagic()) {
        // shieldeff(u.ux, u.uy) deferred
    }

    await You_feel('a malignant aura surround you.');

    const invent = game.invent || [];
    let nobj = 0;
    for (const otmp of invent) {
        if (otmp.oclass === COIN_CLASS) continue;
        nobj++;
    }
    let cnt = rnd(6 / ((Antimagic() ? 1 : 0) + (Half_spell_damage() ? 1 : 0) + 1));
    if (nobj) {
        for (; cnt > 0; cnt--) {
            let onum = rnd(nobj);
            let otmp = null;
            for (const cand of invent) {
                if (cand.oclass === COIN_CLASS) continue;
                if (--onum === 0) {
                    otmp = cand;
                    break;
                }
            }
            if (!otmp || otmp.cursed) continue;

            if (otmp.oartifact) {
                const oart = get_artifact(otmp);
                if (oart && ((oart.spfx | 0) & SPFX_INTEL) && rn2(10) < 8) {
                    await pline(`${Tobjnam(otmp, 'resist')}!`);
                    continue;
                }
            }

            if (otmp.blessed) unbless(otmp);
            else curse(otmp);
        }
        // update_inventory deferred
    }

    // steed saddle as extended invent
    if (u.usteed && !rn2(4)) {
        const otmp = which_armor(u.usteed, W_SADDLE);
        if (otmp && !otmp.cursed) {
            if (otmp.blessed) unbless(otmp);
            else curse(otmp);
            if (!Blind()) {
                await pline(
                    `${Yobjnam2(otmp, 'glow')} ${hcolor(otmp.cursed ? 'black' : 'brown')}.`,
                );
                otmp.bknown = Hallucination() ? 0 : 1;
            } else {
                otmp.bknown = 0;
            }
        }
    }
}

/**
 * C ref: sit.c attrcurse — strip one random INTRINSIC ability.
 * Returns the prop index removed, or 0 if none matched the rnd(11) fallthrough.
 * Named omissions: none for SEE_INVIS light-block (D-0956).
 */
export async function attrcurse() {
    const u = game.u || (game.u = {});
    let ret = 0;

    switch (rnd(11)) {
    case 1:
        if ((u.HFire_resistance | 0) & INTRINSIC) {
            u.HFire_resistance = (u.HFire_resistance | 0) & ~INTRINSIC;
            await You_feel('warmer.');
            ret = FIRE_RES;
            break;
        }
        // FALLTHROUGH
    case 2:
        if ((u.HTeleportation | 0) & INTRINSIC) {
            u.HTeleportation = (u.HTeleportation | 0) & ~INTRINSIC;
            await You_feel('less jumpy.');
            ret = TELEPORT;
            break;
        }
        // FALLTHROUGH
    case 3:
        if ((u.HPoison_resistance | 0) & INTRINSIC) {
            u.HPoison_resistance = (u.HPoison_resistance | 0) & ~INTRINSIC;
            await You_feel('a little sick!');
            ret = POISON_RES;
            break;
        }
        // FALLTHROUGH
    case 4:
        if ((u.HTelepat | 0) & INTRINSIC) {
            u.HTelepat = (u.HTelepat | 0) & ~INTRINSIC;
            if (Blind() && !Blind_telepat()) see_monsters();
            await pline('Your senses fail!');
            ret = TELEPAT;
            break;
        }
        // FALLTHROUGH
    case 5:
        if ((u.HCold_resistance | 0) & INTRINSIC) {
            u.HCold_resistance = (u.HCold_resistance | 0) & ~INTRINSIC;
            await You_feel('cooler.');
            ret = COLD_RES;
            break;
        }
        // FALLTHROUGH
    case 6:
        if ((u.HInvis | 0) & INTRINSIC) {
            u.HInvis = (u.HInvis | 0) & ~INTRINSIC;
            await You_feel('paranoid.');
            ret = INVIS;
            break;
        }
        // FALLTHROUGH
    case 7:
        if ((u.HSee_invisible | 0) & INTRINSIC) {
            u.HSee_invisible = (u.HSee_invisible | 0) & ~INTRINSIC;
            if (!See_invisible()) {
                set_mimic_blocking();
                see_monsters();
                newsym(u.ux | 0, u.uy | 0);
            }
            await pline(Hallucination()
                ? 'You tawt you taw a puttie tat!'
                : 'You thought you saw something!');
            ret = SEE_INVIS;
            break;
        }
        // FALLTHROUGH
    case 8:
        if ((u.HFast | 0) & INTRINSIC) {
            u.HFast = (u.HFast | 0) & ~INTRINSIC;
            await You_feel('slower.');
            ret = FAST;
            break;
        }
        // FALLTHROUGH
    case 9:
        if ((u.HStealth | 0) & INTRINSIC) {
            u.HStealth = (u.HStealth | 0) & ~INTRINSIC;
            await You_feel('clumsy.');
            ret = STEALTH;
            break;
        }
        // FALLTHROUGH
    case 10:
        if ((u.HProtection | 0) & INTRINSIC) {
            u.HProtection = (u.HProtection | 0) & ~INTRINSIC;
            await You_feel('vulnerable.');
            ret = PROTECTION;
            break;
        }
        // FALLTHROUGH
    case 11:
        if ((u.HAggravate_monster | 0) & INTRINSIC) {
            u.HAggravate_monster = (u.HAggravate_monster | 0) & ~INTRINSIC;
            await You_feel('less attractive.');
            ret = AGGRAVATE_MONSTER;
            break;
        }
        // FALLTHROUGH
    default:
        break;
    }
    return ret;
}

/** C ref: obj.h Is_box */
function Is_box(obj) {
    return obj && (obj.otyp === LARGE_BOX || obj.otyp === CHEST);
}

/** C ref: mondata.h slithy */
function slithy(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_SLITHY);
}

/**
 * C ref: dungeon.c surface — enough for fountain / room floor.
 */
function surface(x, y) {
    const loc = game.level?.at(x, y);
    const typ = loc?.typ ?? 0;
    if (IS_AIR(typ)) return typ === CLOUD ? 'cloud' : 'air';
    if (IS_FOUNTAIN(typ)) return 'fountain';
    if (IS_ALTAR(typ)) return 'altar';
    if (IS_GRAVE(typ)) return 'headstone';
    if (IS_WALL(typ)) return 'wall';
    if (IS_DOOR(typ)) return 'doorway';
    if (IS_ROOM(typ)) return 'floor';
    return 'ground';
}

/** C ref: you.h Luck — u.uluck + u.moreluck. */
function Luck() {
    const u = game.u || {};
    return (u.uluck | 0) + (u.moreluck | 0);
}

/** C youprop.h Shock_resistance — H || E. */
function Shock_resistance() {
    const u = game.u || {};
    return !!((u.HShock_resistance | 0) || (u.EShock_resistance | 0)
        || u.Shock_resistance);
}

/** C youprop.h BlindedTimeout — HBlinded & TIMEOUT. */
function BlindedTimeout() {
    const u = game.u || {};
    return (u.HBlinded | 0) & TIMEOUT;
}

/** C ref: mondata.c body_part — EYE/HEAD/FOOT; poly table deferred. */
function body_part(part) {
    if ((part | 0) === EYE) return 'eye';
    if ((part | 0) === HEAD) return 'head';
    if ((part | 0) === FOOT) return 'foot';
    return 'body';
}

/** C youprop.h Flying — HFlying || EFlying || u.Flying. */
function Flying() {
    const u = game.u || {};
    return !!((u.Flying) || (u.HFlying | 0) || (u.EFlying | 0));
}

/**
 * C youprop.h Fire_resistance — HFire_resistance || EFire_resistance
 * ≡ uprops[FIRE_RES].intrinsic || uprops[FIRE_RES].extrinsic.
 * confer_oc_oprop writes FIRE_RES only to uprops (EFire unmirrored).
 * Keep H/E flats for eat/poly/adjabil (invent.js hero_Fire_resistance).
 */
function Fire_resistance() {
    const u = game.u || {};
    const e = u.uprops?.[FIRE_RES];
    return !!((u.HFire_resistance | 0) || (u.EFire_resistance | 0)
        || u.Fire_resistance
        || (e?.intrinsic | 0) || (e?.extrinsic | 0));
}

/**
 * C youprop.h Cold_resistance — H || E via uprops[COLD_RES]
 * (worn ring; confer_oc_oprop does not mirror ECold).
 */
function Cold_resistance() {
    const u = game.u || {};
    const e = u.uprops?.[COLD_RES];
    return !!((u.HCold_resistance | 0) || (u.ECold_resistance | 0)
        || u.Cold_resistance
        || (e?.intrinsic | 0) || (e?.extrinsic | 0));
}

/**
 * C ref: dbridge.c is_ice — ICE or DRAWBRIDGE_UP with DB_ICE under.
 * Local: sit cannot import zap.js is_ice (sit already dynamic-imports
 * zap for makewish; keep the static DAG lean).
 */
function is_ice(x, y) {
    const lev = game.level?.at(x, y);
    if (!lev) return false;
    if ((lev.typ | 0) === ICE) return true;
    return (lev.typ | 0) === DRAWBRIDGE_UP
        && ((lev.drawbridgemask | 0) & DB_UNDER) === DB_ICE;
}

/** C youprop.h Half_physical_damage. */
function Half_physical_damage() {
    const u = game.u || {};
    return !!((u.Half_physical_damage)
        || (u.HHalf_physical_damage | 0)
        || (u.EHalf_physical_damage | 0));
}

/**
 * C hack.c losehp then maybe_wail / done(DIED). Returns true if fatal.
 */
async function sit_losehp(n, knam, k_format) {
    losehp(n, knam, k_format);
    await finish_maybe_wail();
    if (game._losehp_needs_done) {
        const { finish_losehp_done } = await import('./end.js');
        await finish_losehp_done();
        return true;
    }
    return false;
}

/** C ref: mondata.c eyecount — poly forms deferred (humanoid 2). */
function eyecount(_data) {
    return 2;
}

/** C ref: youprop.h Drain_resistance — H || E. */
function Drain_resistance() {
    const u = game.u || {};
    return !!((u.HDrain_resistance | 0) || (u.EDrain_resistance | 0)
        || u.Drain_resistance);
}

/** C ref: youprop.h Acid_resistance — H || E. */
function Acid_resistance() {
    const u = game.u || {};
    return !!((u.HAcid_resistance | 0) || (u.EAcid_resistance | 0)
        || u.Acid_resistance);
}

/** C flag.h `#define wizard flags.debug`. */
function wizard_mode() {
    return !!(game.flags?.debug || game.flags?.wizard);
}

/**
 * C ref: sit.c throne vanish — typ=ROOM, flags=0, map_background, newsym_force.
 */
function throne_to_room(tx, ty) {
    const loc = game.level?.at(tx, ty);
    if (loc) {
        loc.typ = ROOM;
        loc.flags = 0;
    }
    map_background(tx, ty, false);
    newsym_force(tx, ty);
}

/**
 * C ref: sit.c special_throne_effect — Vlad's tower throne (effect 1..13).
 * Case 6 grease spray uses the same COIN_CLASS skip as apply.c grease_ok.
 * Case 10: HConfusion only (D-1048; C Confusion ≡ HConfusion).
 * Named omit: update_inventory; losexp Upolyd/level-1 done; Punished
 * unpunish in seffects; SetVoice.
 */
export async function special_throne_effect(effect) {
    const u = game.u || (game.u = {});
    const tx = u.ux | 0;
    const ty = u.uy | 0;

    switch (effect | 0) {
    case 1:
    case 2:
    case 3:
    case 4: {
        const { makewish } = await import('./zap.js');
        await makewish();
        throne_to_room(tx, ty);
        await pline('The throne disintegrates, having spent its power.');
        break;
    }
    case 5:
        await pline('Sitting on the throne was a terrible experience.');
        if (!Drain_resistance()) {
            await losexp('a bad experience sitting on a throne');
            if ((u.ulevelmax | 0) > (u.ulevel | 0)) {
                u.ulevelmax = (u.ulevelmax | 0) - 1;
            }
        }
        break;
    case 6: {
        // grease hands and inventory — same COIN skip as grease_ok
        const { make_glib } = await import('./potion.js');
        await pline('A greasy liquid sprays all over you!');
        for (const otmp of game.invent || []) {
            if (otmp.oclass !== COIN_CLASS) otmp.greased = 1;
        }
        make_glib(rn1(101, 100));
        // update_inventory deferred
        break;
    }
    case 7:
        await attrcurse();
        await pline('The throne somehow seems to be amused.');
        break;
    case 8: {
        const vs_level = { dnum: 0, dlevel: 0 };
        find_hell(vs_level);
        const dun = game.dungeons?.[vs_level.dnum | 0];
        vs_level.dlevel = (dun?.num_dunlevs | 0) - 1;
        if (u.uhave?.amulet || u.uhave_amulet) {
            await You_feel('extremely disoriented for a moment.');
        } else {
            const { schedule_goto } = await import('./do.js');
            schedule_goto(
                vs_level, UTOTYPE_NONE, null,
                'You feel extremely out of place.',
            );
        }
        break;
    }
    case 9: {
        // C typo "seeems" is upstream sit.c
        const { msummon } = await import('./minion.js');
        await pline('The throne seeems to be calling for help!');
        await msummon(null);
        await msummon(null);
        await msummon(null);
        break;
    }
    case 10: {
        // C sit.c: long save_confusion = HConfusion; HConfusion = 1L;
        // seffects(&fake); HConfusion = save_confusion.
        // C youprop.h: #define Confusion HConfusion — no separate flat
        // flag (D-1048). seffect_remove_curse reads HConfusion.
        const save_confusion = u.HConfusion;
        u.HConfusion = 1;
        const { seffects } = await import('./read.js');
        await seffects({
            otyp: SPE_REMOVE_CURSE,
            oclass: SPBOOK_CLASS,
            blessed: 1,
            cursed: 0,
        });
        u.HConfusion = save_confusion;
        break;
    }
    case 11:
        if (is_vampire(game.youmonst?.data)) {
            await You_feel('unworthy.');
        } else {
            const { polyself } = await import('./polyself.js');
            await pline('This throne was not meant for those such as you!');
            await You_feel('a change coming over you.');
            await polyself(POLY_NOFLAGS);
        }
        break;
    case 12: {
        const { losehp } = await import('./hack.js');
        await pline('The throne is covered in acid!');
        losehp(
            Acid_resistance() ? rnd(16) : rnd(80),
            'acidic chair',
            KILLED_BY_AN,
        );
        exercise(A_CON, false);
        break;
    }
    case 13:
        await pline('As you sit on the throne, your body and mind start to warp.');
        for (let ability = 0; ability < A_MAX; ++ability) {
            await adjattrib(ability, rn2(5) - 2, -1);
        }
        break;
    default:
        break;
    }
}

/**
 * C ref: sit.c throne_sit_effect — rnd(6)>4 then rnd(13); Vlad special
 * returns before vanish. Wizard getlin deferred.
 */
async function throne_sit_effect() {
    const u = game.u || (game.u = {});
    const tx = u.ux | 0;
    const ty = u.uy | 0;
    const special_throne = !!In_V_tower(u.uz);

    if (rnd(6) > 4) {
        let effect = rnd(13);
        // wizard getlin "Throne sit effect (1..13)" deferred
        if (special_throne) {
            await special_throne_effect(effect);
            return;
        }
        switch (effect | 0) {
        case 1: {
            const { losehp } = await import('./hack.js');
            await adjattrib(rn2(A_MAX), -rn1(4, 3), 0);
            losehp(rnd(10), 'cursed throne', KILLED_BY_AN);
            break;
        }
        case 2:
            await adjattrib(rn2(A_MAX), 1, 0);
            break;
        case 3: {
            const { losehp } = await import('./hack.js');
            await pline(
                `A${Shock_resistance() ? 'n' : ' massive'} electric shock shoots through your body!`,
            );
            losehp(
                Shock_resistance() ? rnd(6) : rnd(30),
                'electric chair',
                KILLED_BY_AN,
            );
            exercise(A_CON, false);
            break;
        }
        case 4: {
            await You_feel('much, much better!');
            if (Upolyd(u)) {
                if ((u.mh | 0) >= ((u.mhmax | 0) - 5)) u.mhmax = (u.mhmax | 0) + 4;
                u.mh = u.mhmax | 0;
            }
            if ((u.uhp | 0) >= ((u.uhpmax | 0) - 5)) {
                u.uhpmax = (u.uhpmax | 0) + 4;
                if ((u.uhpmax | 0) > (u.uhppeak | 0)) u.uhppeak = u.uhpmax | 0;
            }
            u.uhp = u.uhpmax | 0;
            u.ucreamed = 0;
            const { make_blinded } = await import('./do.js');
            const { make_sick } = await import('./potion.js');
            const { heal_legs } = await import('./trap.js');
            await make_blinded(0, true);
            await make_sick(0, null, false, SICK_ALL);
            await heal_legs(0);
            if (game.flags) game.flags.botl = true;
            if (game.disp) game.disp.botl = true;
            break;
        }
        case 5:
            await take_gold();
            break;
        case 6:
            if ((u.uluck | 0) + rn2(5) < 0) {
                await You_feel('your luck is changing.');
                change_luck(1);
            } else {
                const { makewish } = await import('./zap.js');
                await makewish();
            }
            break;
        case 7: {
            let cnt = rnd(10);
            await pline('A voice echoes:');
            // SetVoice deferred
            await verbalize(
                `Thine audience hath been summoned, ${game.flags?.female ? 'Dame' : 'Sire'}!`,
            );
            const { courtmon } = await import('./mklev.js');
            const { makemon } = await import('./makemon.js');
            while (cnt--) {
                makemon(courtmon(), tx, ty, NO_MM_FLAGS);
            }
            break;
        }
        case 8: {
            await pline('A voice echoes:');
            // SetVoice deferred
            await verbalize(
                `By thine Imperious order, ${game.flags?.female ? 'Dame' : 'Sire'}...`,
            );
            const { do_genocide } = await import('./read.js');
            await do_genocide(5); // REALLY|ONTHRONE
            break;
        }
        case 9: {
            await pline('A voice echoes:');
            // SetVoice deferred
            await verbalize(
                'A curse upon thee for sitting upon this most holy throne!',
            );
            if (Luck() > 0) {
                const { make_blinded } = await import('./do.js');
                await make_blinded(BlindedTimeout() + rn1(100, 250), true);
                change_luck((Luck() > 1) ? -rnd(2) : -1);
            } else {
                await rndcurse();
            }
            break;
        }
        case 10:
            if (Luck() < 0 || ((u.HSee_invisible | 0) & INTRINSIC)) {
                if (game.level?.flags?.nommap) {
                    await pline('A terrible drone fills your head!');
                    const { make_confused } = await import('./potion.js');
                    await make_confused(
                        ((u.HConfusion | 0) & TIMEOUT) + rnd(30),
                        false,
                    );
                } else {
                    await pline('An image forms in your mind.');
                    const { do_mapping } = await import('./detect.js');
                    do_mapping();
                }
            } else {
                if (!Blind()) {
                    await pline('Your vision becomes clear.');
                } else {
                    const num_of_eyes = eyecount(game.youmonst?.data);
                    let eye = body_part(EYE);
                    switch (num_of_eyes) {
                    default:
                    case 2:
                        eye = makeplural(eye);
                        // FALLTHROUGH
                    case 1:
                        await pline(`Your ${eye} ${vtense(eye, 'tingle')}...`);
                        break;
                    case 0:
                        await pline(
                            `You have a very strange feeling in your ${body_part(HEAD)}.`,
                        );
                        break;
                    }
                }
                u.HSee_invisible = (u.HSee_invisible | 0) | FROMOUTSIDE;
                newsym(u.ux | 0, u.uy | 0);
            }
            break;
        case 11:
            if (Luck() < 0) {
                await You_feel('threatened.');
                const { aggravate } = await import('./wizard.js');
                aggravate();
            } else {
                await You_feel('a wrenching sensation.');
                const { tele } = await import('./teleport.js');
                await tele();
            }
            break;
        case 12: {
            await pline('You are granted an insight!');
            if (game.invent && game.invent.length) {
                const { identify_pack } = await import('./invent.js');
                await identify_pack(rn2(5), false);
            }
            break;
        }
        case 13: {
            await pline('Your mind turns into a pretzel!');
            const { make_confused } = await import('./potion.js');
            await make_confused(
                ((u.HConfusion | 0) & TIMEOUT) + rn1(7, 16),
                false,
            );
            break;
        }
        default:
            break;
        }
    } else if (is_prince(game.youmonst?.data) || u.uevent?.uhand_of_elbereth) {
        await You_feel('very comfortable here.');
    } else {
        await You_feel('somehow out of place...');
    }

    if (!special_throne && !rn2(3)
        && (!wizard_mode()
            || (await yn_function('Analyze throne?', 'yn', 'n')) === 'y')) {
        throne_to_room(tx, ty);
        await pline(`The throne ${cansee(tx, ty) ? 'vanishes' : 'has vanished'} in a puff of logic.`);
    }
}

/**
 * C ref: mhitu.c cloneu. Local: sit cannot import mhitu.js
 * (mhitu→zap→potion→eat→sit). clone_mon named omit.
 */
async function cloneu() {
    const u = game.u || {};
    if ((u.mh | 0) <= 1) return null;
    const mndx = game.youmonst?.data?.mndx | 0;
    if (((game.mvitals?.[mndx]?.mvflags ?? 0) & G_EXTINCT) !== 0) {
        return null;
    }
    const { makemon } = await import('./makemon.js');
    const { initedog } = await import('./dog.js');
    const mon = makemon(
        game.youmonst?.data, u.ux, u.uy,
        NO_MINVENT | MM_EDOG | MM_NOMSG,
    );
    if (!mon) return null;
    mon.mcloned = 1;
    christen_monst(mon, game.plname || '');
    initedog(mon, true);
    mon.m_lev = game.youmonst?.data?.mlevel | 0;
    mon.mhpmax = u.mhmax | 0;
    mon.mhp = Math.trunc((u.mh | 0) / 2);
    u.mh = (u.mh | 0) - (mon.mhp | 0);
    if (!game.flags) game.flags = {};
    game.flags.botl = true;
    return mon;
}

/**
 * C ref: potion.c split_mon. Hero path for dosit gremlin; clone_mon
 * monster arm named omit (returns null).
 */
async function split_mon(mon, mtmp) {
    let reason = '';
    if (mtmp) {
        // C: the_your[1]=="your" when attacker is youmonst; else
        // s_suffix(mon_nam(mtmp)). dosit passes NULL.
        reason = ` from ${mtmp === game.youmonst ? 'your' : 'its'} heat`;
    }
    if (mon === game.youmonst) {
        const u = game.u || {};
        if ((u.mh | 0) > (u.mhmax | 0)) u.mh = u.mhmax | 0;
        const mtmp2 = ((u.mh | 0) > 1) ? await cloneu() : null;
        if (mtmp2) {
            mtmp2.mhpmax = Math.trunc((u.mhmax | 0) / 2);
            u.mhmax = (u.mhmax | 0) - (mtmp2.mhpmax | 0);
            if (!game.flags) game.flags = {};
            game.flags.botl = true;
            await pline(`You multiply${reason}!`);
        }
        return mtmp2;
    }
    return null;
}

/**
 * C ref: sit.c dosit in_water (~512–525).
 * Second water_damage uses uarm, not uarmf (pinned C).
 */
async function dosit_in_water() {
    const u = game.u || {};
    await pline(`You sit in the ${hliquid('water')}.`);
    if (Upolyd(u) && (u.umonnum | 0) === PM_GREMLIN) {
        if (await split_mon(game.youmonst, null)) {
            const ftyp = game.level?.at(u.ux, u.uy)?.typ ?? 0;
            if (ftyp === FOUNTAIN) {
                const { dryup } = await import('./fountain.js');
                await dryup(u.ux, u.uy, true);
            }
        }
    } else {
        if (!rn2(10) && u.uarm) {
            await water_damage(u.uarm, 'armor', true);
        }
        if (!rn2(10) && u.uarmf
            && (u.uarmf.otyp | 0) !== WATER_WALKING_BOOTS) {
            await water_damage(u.uarm, 'armor', true);
        }
    }
}

/**
 * C ref: sit.c dosit — static const char sit_message[] = "sit on the %s.";
 * You(sit_message, …) → "You sit on the %s."
 */
async function You_sit_message(what) {
    await pline(`You sit on the ${what}.`);
}

/**
 * C ref: sit.c dosit — #sit
 */
export async function dosit() {
    const u = game.u || {};
    if (u.usteed) {
        await pline('You are already sitting on your steed.');
        return ECMD_OK;
    }
    if (u.Levitation) {
        await pline('You tumble in place.');
        return ECMD_OK;
    }
    // can_reach_floor / uswallow / ustuck still deferred
    const trap = t_at(u.ux, u.uy);
    const typ = game.level?.at(u.ux, u.uy)?.typ ?? 0;
    // C: else if (is_pool && !Underwater) goto in_water — skips OBJ_AT/trap
    if (is_pool(u.ux, u.uy) && !Underwater()) {
        await dosit_in_water();
        return ECMD_TIME;
    }
    // C: else if (Upolyd && PM_GREMLIN && (FOUNTAIN || is_pool))
    if (Upolyd(u) && (u.umonnum | 0) === PM_GREMLIN
        && (typ === FOUNTAIN || is_pool(u.ux, u.uy))) {
        await dosit_in_water();
        return ECMD_TIME;
    }

    // C: OBJ_AT && !(uteetering_at_seen_pit || uescaped_shaft) — pit gates deferred
    const obj = objects_at(u.ux, u.uy);
    if (obj) {
        const youdata = game.youmonst?.data;
        if (youdata?.mlet === 'S_DRAGON' && obj.oclass === COIN_CLASS) {
            // money_cnt meager-hoard threshold deferred → always bare "hoard"
            await pline('You coil up around your hoard.');
        } else if (obj.otyp === TOWEL) {
            await pline("It's probably not a good time for a picnic...");
        } else {
            if (slithy(youdata)) {
                await pline(`You coil up around ${the(xname(obj))}.`);
            } else {
                await pline(`You sit on ${the(xname(obj))}.`);
            }
            if (obj.otyp === CORPSE && amorphous(mons(obj.corpsenm))) {
                await pline("It's squishy...");
            } else if (obj.otyp === CREAM_PIE) {
                if (!u.Deaf) await pline('Squelch!');
                // C: useupf(obj, obj->quan) — full floor consume ≡ delobj after resists
                delobj(obj);
            } else if (!(Is_box(obj)
                || (game.objects?.[obj.otyp]?.oc_material ?? 0) === CLOTH)) {
                await pline("It's not very comfortable...");
            }
        }
        return ECMD_TIME;
    }

    // C sit.c dosit: else if (trap != 0 || (u.utrap && utraptype >= TT_LAVA))
    // before water/sink/…/IS_THRONE.
    if (trap || (u.utrap && ((u.utraptype | 0) >= TT_LAVA))) {
        if (u.utrap) {
            exercise(A_WIS, false); // stuck longer
            if ((u.utraptype | 0) === TT_BEARTRAP) {
                await pline(
                    `You can't sit down with your ${body_part(FOOT)} in the bear trap.`,
                );
                u.utrap = (u.utrap | 0) + 1;
            } else if ((u.utraptype | 0) === TT_PIT) {
                if (trap && (trap.ttyp | 0) === SPIKED_PIT) {
                    await pline('You sit down on a spike.  Ouch!');
                    if (await sit_losehp(
                        Half_physical_damage() ? rn2(2) : 1,
                        'sitting on an iron spike',
                        KILLED_BY,
                    )) {
                        return ECMD_TIME;
                    }
                    exercise(A_STR, false);
                } else {
                    await pline('You sit down in the pit.');
                }
                u.utrap = (u.utrap | 0) + rn2(5);
            } else if ((u.utraptype | 0) === TT_WEB) {
                await pline(
                    'You sit in the spider web and get entangled further!',
                );
                u.utrap = (u.utrap | 0) + rn1(10, 5);
            } else if ((u.utraptype | 0) === TT_LAVA) {
                await pline(`You sit in the ${hliquid('lava')}!`);
                if (u.Slimed) await burn_away_slime();
                u.utrap = (u.utrap | 0) + rnd(4);
                if (await sit_losehp(d(2, 10), 'sitting in lava', KILLED_BY)) {
                    return ECMD_TIME;
                }
            } else if ((u.utraptype | 0) === TT_INFLOOR
                || (u.utraptype | 0) === TT_BURIEDBALL) {
                await pline("You can't maneuver to sit!");
                u.utrap = (u.utrap | 0) + 1;
            }
        } else {
            await pline(`You ${Flying() ? 'land' : 'sit down'}.`);
            await dotrap(trap, VIASITTING);
        }
        return ECMD_TIME;
    }

    // C: (Underwater || Is_waterlevel) && !eggs_in_water — after trap,
    // before is_pool in_water / IS_SINK.
    if ((Underwater() || Is_waterlevel(u.uz))
        && !eggs_in_water(game.youmonst?.data)) {
        if (Is_waterlevel(u.uz)) {
            await pline('There are no cushions floating nearby.');
        } else {
            await pline('You sit down on the muddy bottom.');
        }
        return ECMD_TIME;
    }
    if (is_pool(u.ux, u.uy) && !eggs_in_water(game.youmonst?.data)) {
        await dosit_in_water();
        return ECMD_TIME;
    }

    // C sit.c dosit ~526–538: furniture sit_message before lava/ice/
    // DRAWBRIDGE_DOWN and IS_THRONE.
    if (IS_SINK(typ)) {
        // C: You(sit_message, defsyms[S_sink].explanation) — "sink"
        await You_sit_message('sink');
        await pline(
            `Your ${humanoid(game.youmonst?.data) ? 'rump' : 'underside'} gets wet.`,
        );
        return ECMD_TIME;
    }
    if (IS_ALTAR(typ)) {
        // C: You(sit_message, defsyms[S_altar].explanation) then altar_wrath
        await You_sit_message('altar');
        const { altar_wrath } = await import('./pray.js');
        await altar_wrath(u.ux, u.uy);
        return ECMD_TIME;
    }
    if (IS_GRAVE(typ)) {
        // C: You(sit_message, defsyms[S_grave].explanation) — "grave"
        await You_sit_message('grave');
        return ECMD_TIME;
    }
    if (typ === STAIRS) {
        // C: You(sit_message, "stairs") — not defsyms staircase up/down
        await You_sit_message('stairs');
        return ECMD_TIME;
    }
    if (typ === LADDER) {
        // C: You(sit_message, "ladder") — not defsyms ladder up/down
        await You_sit_message('ladder');
        return ECMD_TIME;
    }
    // C sit.c dosit ~539–555: lava (WWalking) / ice / DRAWBRIDGE_DOWN
    // before IS_THRONE. Trap TT_LAVA is the earlier utrap arm (D-1039).
    if (is_lava(u.ux, u.uy)) {
        // C: must be WWalking — sit_message + burn_away_slime always
        await You_sit_message(hliquid('lava'));
        await burn_away_slime();
        if (likes_lava(game.youmonst?.data)) {
            await pline(`The ${hliquid('lava')} feels warm.`);
            return ECMD_TIME;
        }
        await pline(`The ${hliquid('lava')} burns you!`);
        if (await sit_losehp(
            d(Fire_resistance() ? 2 : 10, 10),
            'sitting on lava',
            KILLED_BY,
        )) {
            return ECMD_TIME;
        }
        return ECMD_TIME;
    }
    if (is_ice(u.ux, u.uy)) {
        // C: You(sit_message, defsyms[S_ice].explanation) — "ice"
        await You_sit_message('ice');
        if (!Cold_resistance()) {
            await pline('The ice feels cold.');
        }
        return ECMD_TIME;
    }
    if (typ === DRAWBRIDGE_DOWN) {
        // C: You(sit_message, "drawbridge") — not defsyms lowered/raised
        await You_sit_message('drawbridge');
        return ECMD_TIME;
    }
    if (IS_THRONE(typ)) {
        await pline('You sit on the opulent throne.');
        await throne_sit_effect();
        return ECMD_TIME;
    }

    // lay_an_egg deferred → default
    await pline(`Having fun sitting on the ${surface(u.ux, u.uy)}?`);
    return ECMD_TIME;
}
