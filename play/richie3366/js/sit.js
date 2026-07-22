// sit.js — #sit command (floor / fountain / OBJ_AT subset) + attrcurse /
// rndcurse.
// C ref: sit.c dosit / attrcurse / rndcurse; dungeon.c surface (fountain
// branch).
//
// Branch envelope: reachable floor (Levitation only), OBJ_AT picnic body
// (dragon/towel/slithy/sit+comfort/squishy/cream-pie), default having-fun;
// attrcurse rnd(11) INTRINSIC strip (D-0945); rndcurse invent + Magicbane
// / Antimagic / Half_spell_damage / SPFX_INTEL resist / steed saddle
// (D-0969).
// Deferred: steed name, hider, can_reach_floor full, ustuck, uteetering/
// uescaped_shaft gate, traps, water/gremlin, sink/altar/grave/stairs/
// ladder/lava/ice/drawbridge/throne, lay_an_egg, money_cnt meager coil;
// shieldeff; update_inventory redraw; Hallucination hcolor synonyms;
// Yobjnam2 shk_your/pname polish.
// D-0956: set_mimic_blocking on SEE_INVIS attrcurse arm.

import { game } from './gstate.js';
import { pline, You_feel, newsym, see_monsters } from './display.js';
import { set_mimic_blocking } from './vision.js';
import { rnd, rn2 } from './rng.js';
import {
    ECMD_OK, ECMD_TIME,
    IS_FOUNTAIN, IS_AIR, IS_ALTAR, IS_GRAVE, IS_ROOM, IS_WALL, IS_DOOR,
    CLOUD,
    INTRINSIC, TIMEOUT, W_SADDLE,
    FIRE_RES, COLD_RES, POISON_RES, TELEPAT, TELEPORT, INVIS, SEE_INVIS,
    FAST, STEALTH, PROTECTION, AGGRAVATE_MONSTER,
} from './const.js';
import { objects_at, delobj, curse, unbless } from './mkobj.js';
import { objectNames, COIN_CLASS } from './objects.js';
import { xname, the, The, vtense } from './objnam.js';
import { amorphous, mons, M1_SLITHY } from './monsters.js';
import { get_artifact, SPFX_INTEL } from './artifact.js';
import { ART_MAGICBANE } from './generated/artifacts_data.js';

const CORPSE = objectNames.indexOf('CORPSE');
const TOWEL = objectNames.indexOf('TOWEL');
const CREAM_PIE = objectNames.indexOf('CREAM_PIE');
const LARGE_BOX = objectNames.indexOf('LARGE_BOX');
const CHEST = objectNames.indexOf('CHEST');
const CLOTH = 6; // objclass.h obj_material_types

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
    // can_reach_floor / uswallow / ustuck / pool / gremlin deferred

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

    // trap / pool / sink / altar / … specials deferred → default
    await pline(`Having fun sitting on the ${surface(u.ux, u.uy)}?`);
    return ECMD_TIME;
}
