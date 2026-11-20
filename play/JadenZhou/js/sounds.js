// sounds.js — ambient level sounds.
// C ref: sounds.c
//
// Ported so far: mon_in_room(), throne_mon_sound(), beehive_mon_sound(),
// morgue_mon_sound(), zoo_mon_sound(), dosounds().  temple_priest_sound()
// and oracle_sound() are only partly ported (see their comments).

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { pline } from './display.js';
import {
    DEAF, HALLUC, HALLUC_RES, ROOMOFFSET, VAULT, ANY_SHOP, ANY_TYPE, OROOM,
    SHOPBASE, COURT, BEEHIVE, MORGUE, ZOO, BARRACKS,
    Is_astralevel, Is_oracle_level,
} from './const.js';
import { M1_ANIMAL, M2_LORD, M2_PRINCE, M2_MERC, S_ANT, PM_ORACLE,
         mons } from './monsters.js';
import { GOLD_PIECE } from './objects.js';
import { is_flyer, is_undead, is_vampshifter } from './mondata.js';

/* C ref: mondata.h predicates */
function is_lord(ptr) { return (ptr.mflags2 & M2_LORD) !== 0; }
function is_prince(ptr) { return (ptr.mflags2 & M2_PRINCE) !== 0; }
function is_animal(ptr) { return (ptr.mflags1 & M1_ANIMAL) !== 0; }
function is_mercenary(ptr) { return (ptr.mflags2 & M2_MERC) !== 0; }
/* C ref: monst.h DEADMONSTER() */
function DEADMONSTER(mon) { return mon.mhp < 1; }

/* C ref: youprop.h Hallucination */
function Hallucination() {
    const P = game.u.uprops;
    return !!(P[HALLUC].intrinsic
              && !(P[HALLUC_RES].intrinsic || P[HALLUC_RES].extrinsic));
}

/* C ref: pline.c You_hear() -- the "You hear" prefix; the hearing-
   while-asleep/unconscious variant ("You dream that you hear") isn't
   ported yet */
async function You_hear(msg) {
    await pline(`You hear ${msg}`);
}

// C ref: sounds.c mon_in_room()
function mon_in_room(mon, rmtyp) {
    const rno = game.level.at(mon.mx, mon.my).roomno;
    if (rno >= ROOMOFFSET)
        return game.level.rooms[rno - ROOMOFFSET].rtype === rmtyp;
    return false;
}

// C ref: sounds.c throne_mon_sound()
async function throne_mon_sound(mtmp) {
    if ((mtmp.msleeping || is_lord(mtmp.data)
         || is_prince(mtmp.data)) && !is_animal(mtmp.data)
        && mon_in_room(mtmp, COURT)) {
        const throne_msg = [
            "the tones of courtly conversation.",
            "a sceptre pounded in judgment.",
            "Someone shouts \"Off with %s head!\"",
            "Queen Beruthiel's cats!",
        ];
        const which = rn2(3) + (Hallucination() ? 1 : 0);

        if (which !== 2) {
            await You_hear(throne_msg[which]);
        } else {
            /* uhis() */
            const uhis = game.flags.female ? "her" : "his";
            await pline(throne_msg[2].replace('%s', uhis));
        }
        return true;
    }
    return false;
}

// C ref: sounds.c beehive_mon_sound()
async function beehive_mon_sound(mtmp) {
    if ((mtmp.data.mlet === S_ANT && is_flyer(mtmp.data))
        && mon_in_room(mtmp, BEEHIVE)) {
        const hallu = Hallucination() ? 1 : 0;

        switch (rn2(2) + hallu) {
        case 0:
            await You_hear("a low buzzing.");
            break;
        case 1:
            await You_hear("an angry drone.");
            break;
        case 2:
            await You_hear(`bees in your ${game.uarmh ? "" : "(nonexistent) "}bonnet!`);
            break;
        }
        return true;
    }
    return false;
}

// C ref: sounds.c morgue_mon_sound()
async function morgue_mon_sound(mtmp) {
    if ((is_undead(mtmp.data) || is_vampshifter(mtmp))
        && mon_in_room(mtmp, MORGUE)) {
        const hallu = Hallucination() ? 1 : 0;
        /* body_part(HAIR) etc. aren't ported yet; humanoid wording */
        switch (rn2(2) + hallu) {
        case 0:
            await pline("You suddenly realize it is unnaturally quiet.");
            break;
        case 1:
            await pline("The hair on the back of your neck stands up.");
            break;
        case 2:
            await pline("The hair on your head seems to stand up.");
            break;
        }
        return true;
    }
    return false;
}

// C ref: sounds.c zoo_mon_sound()
async function zoo_mon_sound(mtmp) {
    if ((mtmp.msleeping || is_animal(mtmp.data))
        && mon_in_room(mtmp, ZOO)) {
        const hallu = Hallucination() ? 1 : 0, selection = rn2(2) + hallu;
        const zoo_msg = [
            "a sound reminiscent of an elephant stepping on a peanut.",
            "a sound reminiscent of a seal barking.", "Doctor Dolittle!",
        ];
        await You_hear(zoo_msg[selection]);
        return true;
    }
    return false;
}

// C ref: sounds.c temple_priest_sound()
/* not ported yet: temple priests (EPRI, inhistemple(), canseemon()) are
   not created by the JS port yet, so no monster passes the first test */
async function temple_priest_sound(mtmp) {
    if (mtmp.ispriest && mtmp.epri)
        throw new Error('temple_priest_sound(): not ported yet');
    return false;
}

// C ref: sounds.c oracle_sound()
async function oracle_sound(mtmp) {
    if (mtmp.data !== mons[PM_ORACLE])
        return false;
    /* canseemon() isn't ported yet */
    throw new Error('oracle_sound(): canseemon() not ported yet');
}

// C ref: mon.c get_iter_mons()
/* iterate all living monsters on the level until bfunc returns TRUE */
async function get_iter_mons(bfunc) {
    let mtmp, mtmp2;

    for (mtmp = game.fmon; mtmp; mtmp = mtmp2) {
        mtmp2 = mtmp.nmon;
        /* mon_offmap(): migrating monsters aren't on fmon in the JS port */
        if (DEADMONSTER(mtmp))
            continue;
        if (await bfunc(mtmp))
            break;
    }
    return mtmp;
}

// C ref: mkroom.c search_special()
function search_special(type) {
    const rooms = game.level.rooms;
    let i;

    for (i = 0; rooms[i] && rooms[i].hx >= 0; i++) {
        const croom = rooms[i];
        if ((type === ANY_TYPE && croom.rtype !== OROOM)
            || (type === ANY_SHOP && croom.rtype >= SHOPBASE)
            || croom.rtype === type)
            return croom;
    }
    /* gs.subrooms[]: subrooms aren't kept in a global list in the JS
       port yet */
    return null;
}

// C ref: vault.c vault_occupied()
function vault_occupied(array) {
    for (const ch of array || '') {
        const r = ch.charCodeAt(0);
        if (game.level.rooms[r - ROOMOFFSET].rtype === VAULT)
            return r;
    }
    return 0;
}

// C ref: vault.c findgd()
function findgd() {
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER(mtmp))
            continue;
        if (mtmp.isgd && mtmp.egd && mtmp.egd.gdlevel
            && mtmp.egd.gdlevel.dnum === game.u.uz.dnum
            && mtmp.egd.gdlevel.dlevel === game.u.uz.dlevel)
            return mtmp;
    }
    return null;
}

// C ref: vault.c gd_sound()
/* the guard can be heard if the hero isn't in the vault and no guard
   is around */
function gd_sound() {
    return !(vault_occupied(game.u.urooms) || findgd());
}

// C ref: invent.c g_at()
function g_at(x, y) {
    for (const o of game.level.objects || [])
        if (o.otyp === GOLD_PIECE && o.ox === x && o.oy === y)
            return o;
    return null;
}

// C ref: shk.c tended_shop()
function tended_shop(sroom) {
    const mtmp = sroom.resident;

    /* inhishop(): shopkeepers aren't created by the JS port yet */
    if (mtmp)
        throw new Error('tended_shop(): inhishop() not ported yet');
    return false;
}

// C ref: sounds.c dosounds()
export async function dosounds() {
    const g = game;
    const u = g.u;
    const lf = g.level.flags;
    let sroom, hallu, vx, vy, mtmp;

    /* C ref: youprop.h Deaf, Underwater */
    const Deaf = u.uprops[DEAF].intrinsic || u.uprops[DEAF].extrinsic
                 || u.uroleplay.deaf;
    if (Deaf || !g.flags.acoustics || u.uswallow || u.uinwater)
        return;

    hallu = Hallucination() ? 1 : 0;

    if (lf.nfountains && !rn2(400)) {
        const fountain_msg = [
            "bubbling water.", "water falling on coins.",
            "the splashing of a naiad.", "a soda fountain!",
        ];
        await You_hear(fountain_msg[rn2(3) + hallu]);
    }
    if (lf.nsinks && !rn2(300)) {
        const sink_msg = [
            "a slow drip.", "a gurgling noise.", "dishes being washed!",
        ];
        await You_hear(sink_msg[rn2(2) + hallu]);
    }
    if (lf.has_court && !rn2(200)) {
        if (await get_iter_mons(throne_mon_sound))
            return;
    }
    if (lf.has_swamp && !rn2(200)) {
        const swamp_msg = [
            "hear mosquitoes!", "smell marsh gas!", /* so it's a smell...*/
            "hear Donald Duck!",
        ];
        await pline(`You ${swamp_msg[rn2(2) + hallu]}`);
        return;
    }
    if (lf.has_vault && !rn2(200)) {
        if (!(sroom = search_special(VAULT))) {
            /* strange ... */
            lf.has_vault = 0;
            return;
        }
        if (gd_sound()) {
            let which = rn2(2) + hallu;
            if (which === 1) {
                let gold_in_vault = false;

                for (vx = sroom.lx; vx <= sroom.hx; vx++)
                    for (vy = sroom.ly; vy <= sroom.hy; vy++)
                        if (g_at(vx, vy))
                            gold_in_vault = true;
                if (vault_occupied(u.urooms)
                    !== (sroom.roomnoidx + ROOMOFFSET)) {
                    if (gold_in_vault) {
                        await You_hear(!hallu
                                     ? "someone counting gold coins."
                                     : "the quarterback calling the play.");
                    } else {
                        await You_hear("someone searching.");
                    }
                } else {
                    which = 0; /* FALLTHROUGH */
                }
            }
            if (which === 0)
                await You_hear("the footsteps of a guard on patrol.");
            else if (which === 2)
                await You_hear("Ebenezer Scrooge!");
        }
        return;
    }
    if (lf.has_beehive && !rn2(200)) {
        if (await get_iter_mons(beehive_mon_sound))
            return;
    }
    if (lf.has_morgue && !rn2(200)) {
        if (await get_iter_mons(morgue_mon_sound))
            return;
    }
    if (lf.has_barracks && !rn2(200)) {
        const barracks_msg = [
            "blades being honed.", "loud snoring.", "dice being thrown.",
            "General MacArthur!",
        ];
        let count = 0;

        for (mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
            if (DEADMONSTER(mtmp))
                continue;
            if (is_mercenary(mtmp.data)
                && mon_in_room(mtmp, BARRACKS)
                /* sleeping implies not-yet-disturbed (usually) */
                && (mtmp.msleeping || ++count > 5)) {
                await You_hear(barracks_msg[rn2(3) + hallu]);
                return;
            }
        }
    }
    if (lf.has_zoo && !rn2(200)) {
        if (await get_iter_mons(zoo_mon_sound))
            return;
    }
    if (lf.has_shop && !rn2(200)) {
        if (!(sroom = search_special(ANY_SHOP))) {
            /* strange... */
            lf.has_shop = 0;
            return;
        }
        if (tended_shop(sroom)
            && !(u.ushops || '').includes(String.fromCharCode(sroom.roomnoidx + ROOMOFFSET))) {
            const shop_msg = [
                "someone cursing shoplifters.",
                "the chime of a cash register.", "Neiman and Marcus arguing!",
            ];
            await You_hear(shop_msg[rn2(2) + hallu]);
            /* noisy_shop(sroom): wake_nearto() not ported yet */
        }
        return;
    }
    if (lf.has_temple && !rn2(200)
        && !(Is_astralevel(u.uz) || false /* Is_sanctum(): not ported yet */)) {
        if (await get_iter_mons(temple_priest_sound))
            return;
    }
    if (Is_oracle_level(u.uz) && !rn2(400)) {
        if (await get_iter_mons(oracle_sound))
            return;
    }
}
