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
import { Blind, Hallucination } from './display.js';
import { rn2, rnd } from './rng.js';
import { ANTIMAGIC, HALF_SPDAM, W_SADDLE } from './const.js';

/* C ref: mondata.h macros used here */
const is_hider = (ptr) => (ptr.mflags1 & M1_HIDE) !== 0;
const humanoid = (ptr) => (ptr.mflags1 & M1_HUMANOID) !== 0;
const slithy = (ptr) => (ptr.mflags1 & M1_SLITHY) !== 0;
const amorphous = (ptr) => (ptr.mflags1 & M1_AMORPHOUS) !== 0;
const lays_eggs = (ptr) => (ptr.mflags1 & M1_OVIPAROUS) !== 0;
const is_swimmer = (ptr) => (ptr.mflags1 & M1_SWIM) !== 0;
const eggs_in_water = (ptr) => (lays_eggs(ptr) && ptr.mlet === S_EEL && is_swimmer(ptr));
/* C ref: obj.h Is_box() */
const Is_box = (o) => (o.otyp === LARGE_BOX || o.otyp === CHEST);
/* C ref: youprop.h Levitation, Flying, Underwater, Cold_resistance */
function uprop(p) { return game.u.uprops?.[p] || {}; }
function Levitation() {
    const p = uprop(LEVITATION);
    return !!((p.intrinsic || p.extrinsic) && !p.blocked);
}
function Flying() {
    const p = uprop(FLYING);
    return !!(p.intrinsic || p.extrinsic); /* BFlying isn't ported */
}
function Cold_resistance() {
    const p = uprop(COLD_RES);
    return !!(p.intrinsic || p.extrinsic);
}
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
            throw new Error('dosit(): coiling up around a hoard (money_cnt()) not ported yet');
        } else if (obj.otyp === TOWEL) {
            await pline("It's probably not a good time for a picnic...");
        } else {
            if (slithy(youmonst.data))
                await You(`coil up around ${the(xname(obj))}.`);
            else
                await You(`sit on ${the(xname(obj))}.`);
            if (obj.otyp === CORPSE && amorphous(mons[obj.corpsenm]))
                await pline("It's squishy...");
            else if (obj.otyp === CREAM_PIE)
                throw new Error('dosit(): sitting on a cream pie (Soundeffect(), useupf()) not ported yet');
            else if (!(Is_box(obj)
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
    /* You("sit in the %s.", hliquid("water")); gremlin split_mon(), the
       water_damage() rolls */
    throw new Error('dosit(): sitting in water (hliquid(), water_damage()) not ported yet');
}

/* C ref: youprop.h Antimagic, Half_spell_damage */
function Antimagic() {
    const p = uprop(ANTIMAGIC);
    return !!(p.intrinsic || p.extrinsic);
}
function Half_spell_damage() {
    const p = uprop(HALF_SPDAM);
    return !!(p.intrinsic || p.extrinsic);
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
