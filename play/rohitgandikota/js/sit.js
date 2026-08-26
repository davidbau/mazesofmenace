// sit.js — the #sit command and its consequences.
// C ref: src/sit.c
//
// dosit(), rndcurse(), and attrcurse() are here. The terrain arms whose
// subsystems are missing (throne effects, altar
// wrath, egg laying, gremlin splitting, water damage) record themselves; the
// common floor/object/trap arms run for real. Sitting always costs the turn
// (ECMD_TIME) except for the can't-sit early outs, exactly as the C returns.

import { game } from './gstate.js';
import { rn2, rnd, rn1, d } from './rng.js';
import { pline } from './display.js';
import { You, You_cant, You_feel, Your, There, pline_The } from './pline.js';
import { Monnam, mon_nam } from './do_name.js';
import { pronoun_gender } from './mondata.js';
import { genders } from './role_data.js';
import { PRONOUN_HALLU } from './const.js';

/* src/mondata.c mhis() — via pronoun_gender, as js/mhitu.js does */
const mhis = (mtmp) => genders[pronoun_gender(mtmp, PRONOUN_HALLU)].his;
import { t_at, is_pool, is_lava } from './mon.js';
import { is_ice } from './dbridge.js';
import { can_reach_floor } from './pickup.js';
import { is_hider, humanoid, sticks, slithy, amorphous, lays_eggs,
         is_swimmer, likes_lava } from './mondata.js';
import { Levitation, Flying, Underwater, Fire_resistance } from './youprop.js';
import { losehp } from './hack.js';
import { surface, In_sokoban } from './dungeon.js';
import { dotrap, uteetering_at_seen_pit, uescaped_shaft } from './trap.js';
import { exercise } from './attrib.js';
import { body_part } from './polyself.js';
import { the, xname, Tobjnam } from './objnam.js';
import { useupf, update_inventory } from './invent.js';
import { curse, unbless } from './mkobj.js';
import { get_artifact } from './artifact.js';
import { ART_MAGICBANE } from './artilist_data.js';
import { defsyms, cmap_names } from './drawing_data.js';
import { ECMD_OK, ECMD_TIME, OBJ_AT, STAIRS, LADDER, DRAWBRIDGE_DOWN,
         IS_SINK, IS_ALTAR, IS_GRAVE, IS_THRONE, FOUNTAIN,
         TT_BEARTRAP, TT_PIT, TT_WEB, TT_LAVA, TT_INFLOOR, TT_BURIEDBALL,
         SPIKED_PIT, VIASITTING, A_WIS, A_STR, FOOT, INTRINSIC,
         Is_waterlevel, Upolyd, KILLED_BY } from './const.js';
import { ONAMES, MATERIALS, OCLASSES } from './objects_data.js';
import { MONSYMS, PMNAMES } from './monst_data.js';
import { money_cnt } from './invent.js';

/* include/mondata.h:78 eggs_in_water() */
function eggs_in_water(ptr) {
    return lays_eggs(ptr) && ptr.mlet === MONSYMS.S_EEL && is_swimmer(ptr);
}

function note_unported_sit(what) {
    (game.unported ||= new Set()).add('sit:' + what);
}

// src/sit.c:569 rndcurse() and :644 attrcurse().
const SPFX_INTEL = 0x04;

export async function rndcurse() {
    const u = game.u;
    const antimagic = !!(u.uprops?.ANTIMAGIC || u.uprops?.MAGIC_RES);
    const halfSpellDamage = !!u.uprops?.HALF_SPDAM;

    if (u.uwep?.oartifact === ART_MAGICBANE && rn2(20)) {
        await You('feel a malignant aura surround the magic-absorbing blade.');
        return;
    }
    if (antimagic)
        note_unported_sit('rndcurse:shieldeff');
    await You('feel a malignant aura surround you.');

    const inventory = game.invent.filter(
        (obj) => obj.oclass !== OCLASSES.COIN_CLASS);
    let count = rnd(Math.trunc(6 / (Number(antimagic)
                                   + Number(halfSpellDamage) + 1)));
    while (inventory.length && count-- > 0) {
        const obj = inventory[rnd(inventory.length) - 1];
        if (!obj || obj.cursed)
            continue;
        if (obj.oartifact && (get_artifact(obj).spfx & SPFX_INTEL)
            && rn2(10) < 8) {
            await pline(`${Tobjnam(obj, 'resist')}!`);
            continue;
        }
        if (obj.blessed)
            unbless(obj);
        else
            curse(obj);
    }
    if (inventory.length)
        update_inventory();

    /* The steed saddle arm depends on naming and blindness details that are
       separate from the inventory curse loop. */
    if (u.usteed)
        note_unported_sit('rndcurse:saddle');
}

export async function attrcurse() {
    const intr = game.u.intrinsic ||= {};
    const remove = async (key, message, owner = You_feel) => {
        if (!((intr[key] | 0) & INTRINSIC))
            return false;
        intr[key] = (intr[key] | 0) & ~INTRINSIC;
        await owner(message);
        return true;
    };

    switch (rnd(11)) {
    case 1:
        if (await remove('HFire_resistance', 'warmer.')) return 1;
    case 2:
        if (await remove('HTeleportation', 'less jumpy.')) return 2;
    case 3:
        if (await remove('HPoison_resistance', 'a little sick!')) return 3;
    case 4:
        if (await remove('HTelepat', 'senses fail!', Your)) return 4;
    case 5:
        if (await remove('HCold_resistance', 'cooler.')) return 5;
    case 6:
        if (await remove('HInvis', 'paranoid.')) return 6;
    case 7:
        if (await remove('HSee_invisible', game.u.uprops?.HALLUC
                         ? 'tawt you taw a puttie tat!'
                         : 'thought you saw something', You)) return 7;
    case 8:
        if (await remove('HFast', 'slower.')) return 8;
    case 9:
        if (await remove('HStealth', 'clumsy.')) return 9;
    case 10:
        if (await remove('HProtection', 'vulnerable.')) return 10;
    case 11:
        if (await remove('HAggravate_monster', 'less attractive.')) return 11;
    default:
        return 0;
    }
}

// src/sit.c:400 dosit() — the #sit command.
export async function dosit() {
    const sit_message = (what) => You(`sit on the ${what}.`);
    const trap = t_at(game.u.ux, game.u.uy);
    const typ = game.level.at(game.u.ux, game.u.uy).typ;

    if (game.u.usteed) {
        await You(`are already sitting on ${mon_nam(game.u.usteed)}.`);
        return ECMD_OK;
    }
    if (game.u.uundetected && is_hider(game.youmonst.data)
        && game.u.umonnum !== PMNAMES.PM_TRAPPER)
        game.u.uundetected = 0; /* no longer on the ceiling */

    if (!can_reach_floor(false)) {
        if (game.u.uswallow)
            await There('are no seats in here!');
        else if (Levitation())
            await You('tumble in place.');
        else
            await You('are sitting on air.');
        return ECMD_OK;
    } else if (game.u.ustuck && !sticks(game.youmonst.data)) {
        if (humanoid(game.u.ustuck.data ?? game.mons[game.u.ustuck.mnum]))
            await pline(`${Monnam(game.u.ustuck)} won't offer ${mhis(game.u.ustuck)} lap.`);
        else
            await pline(`${Monnam(game.u.ustuck)} has no lap.`);
        return ECMD_OK;
    }

    /* gremlin fountain split and water-walk sit share the in_water arm */
    let in_water = is_pool(game.u.ux, game.u.uy) && !Underwater();

    if (!in_water && OBJ_AT(game.u.ux, game.u.uy)
        /* ensure we're not standing on the precipice */
        && !(uteetering_at_seen_pit(trap) || uescaped_shaft(trap))) {
        /* C reads svl.level.objects[x][y] — the head of the per-square
           chain; place_object() PREPENDS, so the first flat-list match is
           the same object. */
        const obj = (game.level?.objects || [])
            .find(o => o.ox === game.u.ux && o.oy === game.u.uy);
        await sit_on_object(obj);
    } else if (!in_water
               && (trap != null
                   || (game.u.utrap && game.u.utraptype >= TT_LAVA))) {
        if (game.u.utrap) {
            exercise(A_WIS, false); /* you're getting stuck longer */
            if (game.u.utraptype === TT_BEARTRAP) {
                await You_cant(`sit down with your ${body_part(FOOT)} in the bear trap.`);
                game.u.utrap++;
            } else if (game.u.utraptype === TT_PIT) {
                if (trap && trap.ttyp === SPIKED_PIT) {
                    await You('sit down on a spike.  Ouch!');
                    await losehp(1, 'sitting on an iron spike', KILLED_BY);
                    exercise(A_STR, false);
                } else {
                    await You('sit down in the pit.');
                }
                game.u.utrap += rn2(5);
            } else if (game.u.utraptype === TT_WEB) {
                await You('sit in the spider web and get entangled further!');
                game.u.utrap += rn1(10, 5);
            } else if (game.u.utraptype === TT_LAVA) {
                await You('sit in the lava!');
                note_unported_sit('lava_slime');
                game.u.utrap += rnd(4);
                await losehp(d(2, 10), 'sitting in lava', KILLED_BY);
            } else if (game.u.utraptype === TT_INFLOOR
                       || game.u.utraptype === TT_BURIEDBALL) {
                await You_cant('maneuver to sit!');
                game.u.utrap++;
            }
        } else {
            await You(`${Flying() ? 'land' : 'sit down'}.`);
            await dotrap(trap, VIASITTING);
        }
    } else if (!in_water
               && (Underwater() || Is_waterlevel(game.u.uz))
               && !eggs_in_water(game.youmonst.data)) {
        if (Is_waterlevel(game.u.uz))
            await There('are no cushions floating nearby.');
        else
            await You('sit down on the muddy bottom.');
    } else if ((in_water || is_pool(game.u.ux, game.u.uy))
               && !eggs_in_water(game.youmonst.data)) {
        await You('sit in the water.');
        if (Upolyd(game.u) && game.u.umonnum === PMNAMES.PM_GREMLIN) {
            note_unported_sit('gremlin_split');
        } else {
            if (!rn2(10) && game.u.uarm)
                note_unported_sit('water_damage_armor');
            if (!rn2(10) && game.u.uarmf
                && game.u.uarmf.otyp !== ONAMES.WATER_WALKING_BOOTS)
                note_unported_sit('water_damage_boots');
        }
    } else if (IS_SINK(typ)) {
        await sit_message(defsyms[cmap_names.S_sink].explain);
        await Your(`${humanoid(game.youmonst.data) ? 'rump' : 'underside'} gets wet.`);
    } else if (IS_ALTAR(typ)) {
        await sit_message(defsyms[cmap_names.S_altar].explain);
        note_unported_sit('altar_wrath');
    } else if (IS_GRAVE(typ)) {
        await sit_message(defsyms[cmap_names.S_grave].explain);
    } else if (typ === STAIRS) {
        await sit_message('stairs');
    } else if (typ === LADDER) {
        await sit_message('ladder');
    } else if (is_lava(game.u.ux, game.u.uy)) {
        /* must be WWalking */
        await sit_message('lava');
        note_unported_sit('lava_slime');
        if (likes_lava(game.youmonst.data)) {
            await pline_The('lava feels warm.');
            return ECMD_TIME;
        }
        await pline_The('lava burns you!');
        await losehp(d(Fire_resistance() ? 2 : 10, 10),
                     'sitting on lava', KILLED_BY);
    } else if (is_ice(game.u.ux, game.u.uy)) {
        await sit_message(defsyms[cmap_names.S_ice].explain);
        if (!game.u.uprops?.COLD_RES)
            await pline_The('ice feels cold.');
    } else if (typ === DRAWBRIDGE_DOWN) {
        await sit_message('drawbridge');
    } else if (IS_THRONE(typ)) {
        await sit_message(defsyms[cmap_names.S_throne].explain);
        note_unported_sit('throne_sit_effect');
    } else if (lays_eggs(game.youmonst.data)) {
        note_unported_sit('lay_an_egg');
        return ECMD_TIME;
    } else {
        await pline(`Having fun sitting on the ${surface(game.u.ux, game.u.uy)}?`);
    }
    return ECMD_TIME;
}

// src/sit.c:438 — the object arm of dosit(), split out only because the JS
// object-pile accessor differs from C's svl.level.objects[x][y] chain walk.
async function sit_on_object(obj) {
    if (!obj) {
        await pline(`Having fun sitting on the ${surface(game.u.ux, game.u.uy)}?`);
        return;
    }
    if (game.youmonst.data.mlet === MONSYMS.S_DRAGON
        && obj.oclass === OCLASSES.COIN_CLASS) {
        const hoard = obj.quan + money_cnt(game.invent);
        await You(`coil up around your ${hoard < game.u.ulevel * 1000 ? 'meager ' : ''}hoard.`);
    } else if (obj.otyp === ONAMES.TOWEL) {
        await pline("It's probably not a good time for a picnic...");
    } else {
        if (slithy(game.youmonst.data))
            await You(`coil up around ${the(xname(obj))}.`);
        else
            await You(`sit on ${the(xname(obj))}.`);
        if (obj.otyp === ONAMES.CORPSE && amorphous(game.mons[obj.corpsenm]))
            await pline("It's squishy...");
        else if (obj.otyp === ONAMES.CREAM_PIE) {
            await pline('Squelch!');
            useupf(obj, obj.quan);
        } else if (!(obj.otyp === ONAMES.LARGE_BOX || obj.otyp === ONAMES.CHEST
                     || obj.otyp === ONAMES.ICE_BOX /* Is_box */
                     || game.objects[obj.otyp].oc_material === MATERIALS.CLOTH))
            await pline("It's not very comfortable...");
    }
}
