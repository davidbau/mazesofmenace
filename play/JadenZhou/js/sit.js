// sit.js — the #sit command (M-s).
// C ref: sit.c dosit()

import { game } from './gstate.js';
import { pline, You, There, Your, You_cant, pline_The, vobj_at } from './display.js';
import { mon_nam, Monnam } from './do_name.js';
import { mhis } from './mhitu.js';
import { t_at, dotrap } from './trap.js';
import { can_reach_floor, sticks, uteetering_at_seen_pit,
         uescaped_shaft } from './engrave.js';
import { is_pool, is_lava } from './makemon.js';
import { is_ice } from './dig.js';
import { the, surface } from './iactions.js';
import { xname } from './objnam.js';
import { OBJ_AT, IS_SINK, IS_ALTAR, IS_GRAVE, IS_THRONE, Is_waterlevel,
         STAIRS, LADDER, FOUNTAIN, DRAWBRIDGE_DOWN, TT_LAVA, VIASITTING,
         LEVITATION, FLYING, COLD_RES, ECMD_OK, ECMD_TIME } from './const.js';
import { objects, CLOTH, COIN_CLASS, LARGE_BOX, CHEST, TOWEL, CORPSE,
         CREAM_PIE } from './objects.js';
import { mons, S_DRAGON, S_EEL, M1_HIDE, M1_HUMANOID, M1_SLITHY, M1_AMORPHOUS,
         M1_OVIPAROUS, M1_SWIM, PM_TRAPPER, PM_GREMLIN } from './monsters.js';
import { curse, unbless } from './mkobj.js';
import { spec_ability, SPFX_INTEL } from './artifact.js';
import { ART_MAGICBANE } from './artilist.js';
import { Tobjnam, Yobjnam2 } from './objnam.js';
import { hcolor } from './do_name.js';
import { which_armor } from './worn.js';
import { rn2, rnd } from './rng.js';
import { ANTIMAGIC, HALF_SPDAM, W_SADDLE } from './const.js';
import * as C from './const.js';
import { You_feel, see_monsters, newsym } from './display.js';
import { set_mimic_blocking } from './potion.js';
import {
    Cold_resistance, Antimagic, Blind, Hallucination, Levitation, Flying, Half_spell_damage
} from './youprop.js';
import { money_cnt } from './u_init.js';
import { useupf } from './invent.js';
import { hliquid, split_mon } from './potion.js';
import { dryup } from './fountain.js';
import { water_damage } from './trap.js';
import { WATER_WALKING_BOOTS } from './objects.js';
import { Deaf } from './youprop.js';
import { humanoid, slithy, amorphous, is_hider,
         is_swimmer } from './mondata.js';

/* C ref: mondata.h macros used here */
const lays_eggs = (ptr) => (ptr.mflags1 & M1_OVIPAROUS) !== 0;
const eggs_in_water = (ptr) => (lays_eggs(ptr) && ptr.mlet === S_EEL && is_swimmer(ptr));
/* C ref: obj.h Is_box() */
const Is_box = (o) => (o.otyp === LARGE_BOX || o.otyp === CHEST);
/* C ref: youprop.h Levitation, Flying, Underwater, Cold_resistance */
const Underwater = () => !!game.u.uinwater;
const Upolyd = () => (game.u.mtimedone !== 0);

// C ref: sit.c dosit() -- #sit command
export async function dosit() {
    const sit_message = (what) => `sit on the ${what}.`;
    const u = game.u;
    const youmonst = game.youmonst;
    const trap = t_at(u.ux, u.uy);
    const typ = game.level.at(u.ux, u.uy).typ;

    if (u.usteed) {
        await You(`are already sitting on ${mon_nam(u.usteed)}.`);
        return ECMD_OK;
    }
    if (u.uundetected && is_hider(youmonst.data)
        && u.umonnum !== PM_TRAPPER) /* trapper can stay hidden on floor */
        u.uundetected = 0; /* no longer on the ceiling */

    if (!can_reach_floor(false)) {
        if (u.uswallow)
            await There("are no seats in here!");
        else if (Levitation())
            await You("tumble in place.");
        else
            await You("are sitting on air.");
        return ECMD_OK;
    } else if (u.ustuck && !sticks(youmonst.data)) {
        /* holding monster is next to hero rather than beneath, but
           hero is in no condition to actually sit at has/her own spot */
        if (humanoid(u.ustuck.data))
            await pline(`${Monnam(u.ustuck)} won't offer ${mhis(u.ustuck)} lap.`);
        else
            await pline(`${Monnam(u.ustuck)} has no lap.`);
        return ECMD_OK;
    } else if (is_pool(u.ux, u.uy) && !Underwater()) { /* water walking */
        return await in_water();
    } else if (Upolyd() && u.umonnum === PM_GREMLIN
               && (typ === FOUNTAIN || is_pool(u.ux, u.uy))) {
        return await in_water();
    }

    if (OBJ_AT(u.ux, u.uy)
        /* ensure we're not standing on the precipice */
        && !(uteetering_at_seen_pit(trap) || uescaped_shaft(trap))) {
        const obj = vobj_at(u.ux, u.uy); /* svl.level.objects[u.ux][u.uy] */

        if (youmonst.data.mlet === S_DRAGON && obj.oclass === COIN_CLASS) {
            await You(`coil up around your ${
                (obj.quan + money_cnt(game.invent) < u.ulevel * 1000)
                ? "meager " : ""}hoard.`);
        } else if (obj.otyp === TOWEL) {
            await pline("It's probably not a good time for a picnic...");
        } else {
            if (slithy(youmonst.data))
                await You(`coil up around ${the(xname(obj))}.`);
            else
                await You(`sit on ${the(xname(obj))}.`);
            if (obj.otyp === CORPSE && amorphous(mons[obj.corpsenm]))
                await pline("It's squishy...");
            else if (obj.otyp === CREAM_PIE) {
                if (!Deaf()) {
                    /* Soundeffect(se_squelch, 30) */
                    await pline("Squelch!");
                }
                await useupf(obj, obj.quan);
            } else if (!(Is_box(obj)
                       || objects[obj.otyp].oc_material === CLOTH))
                await pline("It's not very comfortable...");
        }
    } else if (trap || (u.utrap && (u.utraptype >= TT_LAVA))) {
        if (u.utrap) {
            /* exercise(A_WIS, FALSE) and the bear trap, pit, web, lava
               and in-floor cases */
            throw new Error('dosit(): sitting while trapped (u.utrap) not ported yet');
        } else {
            /* when flying, "you land" might need some refinement; it sounds
               as if you're staying on the ground but you will immediately
               take off again unless you become stuck in a holding trap */
            await You(`${Flying() ? "land" : "sit down"}.`);
            await dotrap(trap, VIASITTING);
        }
    } else if ((Underwater() || Is_waterlevel(u.uz))
               && !eggs_in_water(youmonst.data)) {
        if (Is_waterlevel(u.uz))
            await There("are no cushions floating nearby.");
        else
            await You("sit down on the muddy bottom.");
    } else if (is_pool(u.ux, u.uy) && !eggs_in_water(youmonst.data)) {
        return await in_water();
    } else if (IS_SINK(typ)) {
        await You(sit_message("sink")); /* defsyms[S_sink].explanation */
        await Your(`${humanoid(youmonst.data) ? "rump" : "underside"} gets wet.`);
    } else if (IS_ALTAR(typ)) {
        await You(sit_message("altar")); /* defsyms[S_altar].explanation */
        throw new Error('dosit(): altar_wrath() not ported yet');
    } else if (IS_GRAVE(typ)) {
        await You(sit_message("grave")); /* defsyms[S_grave].explanation */
    } else if (typ === STAIRS) {
        await You(sit_message("stairs"));
    } else if (typ === LADDER) {
        await You(sit_message("ladder"));
    } else if (is_lava(u.ux, u.uy)) {
        /* must be WWalking; hliquid(), burn_away_slime(), losehp() */
        throw new Error('dosit(): sitting on lava not ported yet');
    } else if (is_ice(u.ux, u.uy)) {
        await You(sit_message("ice")); /* defsyms[S_ice].explanation */
        if (!Cold_resistance())
            await pline_The("ice feels cold.");
    } else if (typ === DRAWBRIDGE_DOWN) {
        await You(sit_message("drawbridge"));
    } else if (IS_THRONE(typ)) {
        await You(sit_message("opulent throne")); /* defsyms[S_throne].explanation */
        throw new Error('dosit(): throne_sit_effect() not ported yet');
    } else if (lays_eggs(youmonst.data)) {
        throw new Error('dosit(): lay_an_egg() not ported yet');
    } else {
        await pline(`Having fun sitting on the ${surface(u.ux, u.uy)}?`);
    }
    return ECMD_TIME;
}

// C ref: sit.c dosit() in_water: label
async function in_water() {
    const u = game.u;

    await You(`sit in the ${hliquid("water")}.`);
    if (Upolyd() && u.umonnum === PM_GREMLIN) {
        if (await split_mon(game.youmonst, null)) {
            if (game.level.at(u.ux, u.uy).typ === FOUNTAIN)
                await dryup(u.ux, u.uy, true);
        }
        /* splitting--or failing to do so--protects gear from the water */
    } else {
        if (!rn2(10) && game.uarm)
            await water_damage(game.uarm, "armor", true);
        if (!rn2(10) && game.uarmf && game.uarmf.otyp !== WATER_WALKING_BOOTS)
            await water_damage(game.uarm, "armor", true);
    }
    return ECMD_TIME;
}

/* C ref: artifact.h u_wield_art() */
function u_wield_art(art) { return !!game.uwep && game.uwep.oartifact === art; }
/* C ref: color.h NH_BLACK */
const NH_BLACK = "black";

// C ref: sit.c rndcurse()
/* curse a few inventory items at random! */
export async function rndcurse() {
    let nobj = 0;
    let cnt, onum;
    let otmp;
    const mal_aura = (s) => `feel a malignant aura surround ${s}.`;

    if (u_wield_art(ART_MAGICBANE) && rn2(20)) {
        await You(mal_aura("the magic-absorbing blade"));
        return;
    }

    if (Antimagic()) {
        /* shieldeff(u.ux, u.uy): transient display only */
    }

    await You(mal_aura("you"));

    for (otmp = game.invent; otmp; otmp = otmp.nobj) {
        /* gold isn't subject to being cursed or blessed */
        if (otmp.oclass === COIN_CLASS)
            continue;
        nobj++;
    }
    cnt = rnd(Math.trunc(6 / ((Antimagic() ? 1 : 0)
                              + (Half_spell_damage() ? 1 : 0) + 1)));
    if (nobj) {
        for (; cnt > 0; cnt--) {
            onum = rnd(nobj);
            for (otmp = game.invent; otmp; otmp = otmp.nobj) {
                /* as above */
                if (otmp.oclass === COIN_CLASS)
                    continue;
                if (--onum === 0)
                    break; /* found the target */
            }
            /* the !otmp case should never happen; picking an already
               cursed item happens--avoid "resists" message in that case */
            if (!otmp || otmp.cursed)
                continue; /* next target */

            if (otmp.oartifact && spec_ability(otmp, SPFX_INTEL)
                && rn2(10) < 8) {
                await pline(`${Tobjnam(otmp, "resist")}!`);
                continue;
            }

            if (otmp.blessed)
                unbless(otmp);
            else
                curse(otmp);
        }
        /* update_inventory(): no perm_invent window */
    }

    /* treat steed's saddle as extended part of hero's inventory */
    if (game.u.usteed && !rn2(4)
        && (otmp = which_armor(game.u.usteed, W_SADDLE)) && !otmp.cursed) {
        /* skip if already cursed */
        if (otmp.blessed)
            unbless(otmp);
        else
            curse(otmp);
        if (!Blind()) {
            await pline(`${Yobjnam2(otmp, "glow")} ${
                hcolor(otmp.cursed ? NH_BLACK : "brown")}.`);
            otmp.bknown = Hallucination() ? 0 : 1; /* bypass set_bknown() */
        } else {
            otmp.bknown = 0; /* bypass set_bknown() */
        }
    }
}

// C ref: sit.c attrcurse()
/* remove a random INTRINSIC ability from hero.
   returns the intrinsic property which was removed,
   or 0 if nothing was removed. */
export async function attrcurse() {
    const u = game.u;
    const P = u.uprops;
    let ret = 0;
    /* the C switch falls through from case n to case n+1 until a held
       intrinsic is found */
    const step = async (n) => {
        switch (n) {
        case 1:
            if (P[C.FIRE_RES].intrinsic & C.INTRINSIC) {
                P[C.FIRE_RES].intrinsic &= ~C.INTRINSIC;
                await You_feel("warmer.");
                return C.FIRE_RES;
            }
            return 0;
        case 2:
            if (P[C.TELEPORT].intrinsic & C.INTRINSIC) {
                P[C.TELEPORT].intrinsic &= ~C.INTRINSIC;
                await You_feel("less jumpy.");
                return C.TELEPORT;
            }
            return 0;
        case 3:
            if (P[C.POISON_RES].intrinsic & C.INTRINSIC) {
                P[C.POISON_RES].intrinsic &= ~C.INTRINSIC;
                await You_feel("a little sick!");
                return C.POISON_RES;
            }
            return 0;
        case 4:
            if (P[C.TELEPAT].intrinsic & C.INTRINSIC) {
                P[C.TELEPAT].intrinsic &= ~C.INTRINSIC;
                if (Blind() && !(P[C.TELEPAT].intrinsic || P[C.TELEPAT].extrinsic))
                    see_monsters(); /* Can't sense mons anymore! */
                await Your("senses fail!");
                return C.TELEPAT;
            }
            return 0;
        case 5:
            if (P[C.COLD_RES].intrinsic & C.INTRINSIC) {
                P[C.COLD_RES].intrinsic &= ~C.INTRINSIC;
                await You_feel("cooler.");
                return C.COLD_RES;
            }
            return 0;
        case 6:
            if (P[C.INVIS].intrinsic & C.INTRINSIC) {
                P[C.INVIS].intrinsic &= ~C.INTRINSIC;
                await You_feel("paranoid.");
                return C.INVIS;
            }
            return 0;
        case 7:
            if (P[C.SEE_INVIS].intrinsic & C.INTRINSIC) {
                P[C.SEE_INVIS].intrinsic &= ~C.INTRINSIC;
                if (!((P[C.SEE_INVIS].intrinsic || P[C.SEE_INVIS].extrinsic)
                      && !P[C.SEE_INVIS].blocked)) { /* !See_invisible */
                    set_mimic_blocking();
                    see_monsters();
                    /* might not be able to see self anymore */
                    newsym(u.ux, u.uy);
                }
                await You(`${Hallucination() ? "tawt you taw a puttie tat"
                                             : "thought you saw something"}!`);
                return C.SEE_INVIS;
            }
            return 0;
        case 8:
            if (P[C.FAST].intrinsic & C.INTRINSIC) {
                P[C.FAST].intrinsic &= ~C.INTRINSIC;
                await You_feel("slower.");
                return C.FAST;
            }
            return 0;
        case 9:
            if (P[C.STEALTH].intrinsic & C.INTRINSIC) {
                P[C.STEALTH].intrinsic &= ~C.INTRINSIC;
                await You_feel("clumsy.");
                return C.STEALTH;
            }
            return 0;
        case 10:
            /* intrinsic protection is just disabled, not set back to 0 */
            if (P[C.PROTECTION].intrinsic & C.INTRINSIC) {
                P[C.PROTECTION].intrinsic &= ~C.INTRINSIC;
                await You_feel("vulnerable.");
                return C.PROTECTION;
            }
            return 0;
        case 11:
            if (P[C.AGGRAVATE_MONSTER].intrinsic & C.INTRINSIC) {
                P[C.AGGRAVATE_MONSTER].intrinsic &= ~C.INTRINSIC;
                await You_feel("less attractive.");
                return C.AGGRAVATE_MONSTER;
            }
            return 0;
        default:
            return 0;
        }
    };

    for (let n = rnd(11); n <= 11 && !ret; n++)
        ret = await step(n);
    return ret;
}
