// priest.js — Temple entry + priest location helpers (partial).
// C ref: priest.c temple_occupied / findpriest / has_shrine / intemple.
// Named omissions: mapseen_temple; SetVoice; forget_temple_entry callers;
// priest_talk; inhistemple callers beyond findpriest; full poly body_part.

import { game } from './gstate.js';
import { rn2, d } from './rng.js';
import {
    EPRI, TEMPLE, ROOMOFFSET, SPINE, MM_NOMSG, IS_ALTAR, AM_SHRINE,
    Amask2align, ACH_TMPL, In_endgame,
} from './const.js';
import { pline, You_feel, canseemon, canspotmon, verbalize } from './display.js';
import { makemon, set_malign } from './makemon.js';
import { mons } from './monsters.js';
import { monsterNames } from './generated/monsters_data.js';
import { in_rooms, nomul } from './hack.js';

const PM_GHOST = monsterNames.indexOf('PM_GHOST');
const PM_HIGH_CLERIC = monsterNames.indexOf('PM_HIGH_CLERIC');

/** Local to priest.c in C. */
const ALGN_SINNED = -4;
const ALGN_DEVOUT = 14;

/** C: helpless — msleeping || !mcanmove */
function helpless(mtmp) {
    return !!(mtmp?.msleeping || mtmp?.mcanmove === 0);
}

/** C ref: dungeon.c on_level */
function on_level(a, b) {
    return !!a && !!b
        && (a.dnum | 0) === (b.dnum | 0)
        && (a.dlevel | 0) === (b.dlevel | 0);
}

/** C ref: mondata.c body_part — SPINE only for intemple untended msg. */
function body_part(part) {
    if (part === SPINE) return 'spine';
    return 'body';
}

/**
 * C ref: priest.c temple_occupied — first TEMPLE room char in occupancy string.
 */
export function temple_occupied(array) {
    const rooms = game.level?.rooms;
    if (!array || !rooms) return '\0';
    for (let i = 0; i < array.length; i++) {
        const c = array.charCodeAt(i);
        const rm = rooms[c - ROOMOFFSET];
        if (rm && (rm.rtype | 0) === TEMPLE) return array[i];
    }
    return '\0';
}

/**
 * C ref: priest.c histemple_at — priest on shrine level inside temple room.
 */
function histemple_at(priest, x, y) {
    if (!priest || !priest.ispriest) return false;
    const epri = EPRI(priest);
    if (!epri) return false;
    const rooms = in_rooms(x, y, TEMPLE);
    if (!rooms || (rooms.charCodeAt(0) | 0) !== (epri.shroom | 0)) return false;
    return on_level(epri.shrlevel, game.u?.uz);
}

/**
 * C ref: priest.c has_shrine — altar at shrpos still shrine + matching align.
 */
export function has_shrine(pri) {
    if (!pri || !pri.ispriest) return false;
    const epri = EPRI(pri);
    if (!epri?.shrpos) return false;
    const lev = game.level?.at(epri.shrpos.x | 0, epri.shrpos.y | 0);
    if (!lev || !IS_ALTAR(lev.typ) || !(lev.altarmask & AM_SHRINE)) return false;
    return (epri.shralign | 0)
        === (Amask2align((lev.altarmask | 0) & ~AM_SHRINE) | 0);
}

/** C ref: priest.c p_coaligned — shrine align matches hero. */
function p_coaligned(priest) {
    const shralign = EPRI(priest)?.shralign;
    const algn = shralign != null
        ? (shralign | 0)
        : (priest?.data?.maligntyp | 0);
    return (game.u?.ualign?.type | 0) === (algn | 0);
}

/**
 * C ref: priest.c findpriest — living ispriest with matching shroom in temple.
 */
export function findpriest(roomno) {
    const want = roomno | 0;
    for (const mtmp of game.fmon || []) {
        if ((mtmp.mhp | 0) <= 0) continue;
        if (!mtmp.ispriest) continue;
        if ((EPRI(mtmp)?.shroom | 0) !== want) continue;
        if (histemple_at(mtmp, mtmp.mx | 0, mtmp.my | 0)) return mtmp;
    }
    return null;
}

/** Stub: C insight/achieve record_achievement ACH_TMPL. */
function record_achievement(_ach) {}

/**
 * C ref: priest.c intemple — enter TEMPLE room (from check_special_room).
 * Named omissions: mapseen_temple; SetVoice pitch; sanctum Is_sanctum
 * (treated false unless In_endgame High Cleric path matters).
 */
export async function intemple(roomno) {
    const u = game.u;
    if (!u) return;

    // don't do anything if hero is already in the room
    if (temple_occupied(u.urooms0) !== '\0') return;

    const priest = findpriest(roomno | 0);
    if (priest) {
        /* tended */
        record_achievement(ACH_TMPL);
        const epri = EPRI(priest);
        if (!epri) return;
        if (epri.intone_time == null) epri.intone_time = 0;
        if (epri.enter_time == null) epri.enter_time = 0;
        if (epri.peaceful_time == null) epri.peaceful_time = 0;
        if (epri.hostile_time == null) epri.hostile_time = 0;

        const shrined = has_shrine(priest);
        const sanctum = (priest.data === mons(PM_HIGH_CLERIC)
            || (priest.mnum | 0) === PM_HIGH_CLERIC)
            && In_endgame(u.uz); // Is_sanctum deferred → endgame High Cleric only
        const can_speak = !helpless(priest);
        const Deaf = !!(u.Deaf || u.HDeaf);
        const moves = game.moves | 0;

        if (can_speak && !Deaf && moves >= (epri.intone_time | 0)) {
            const save_priest = priest.ispriest;
            if (sanctum && !u.Hallucination) priest.ispriest = 0;
            // C: canseemon (not canspotmon) — ESP alone → "A nearby voice"
            const who = canseemon(priest)
                ? (await import('./do_name.js')).Monnam(priest)
                : 'A nearby voice';
            await pline(`${who} intones:`);
            priest.ispriest = save_priest;
            epri.intone_time = moves + d(10, 500);
            epri.enter_time = 0;
        }

        let msg1 = null;
        let msg2 = null;
        if (sanctum) {
            if (priest.mpeaceful) {
                msg1 = "Infidel, you have entered Moloch's Sanctum!";
                msg2 = 'Be gone!';
                priest.mpeaceful = 0;
                set_malign(priest);
            } else {
                msg1 = 'You desecrate this place by your presence!';
            }
        } else if (moves >= (epri.enter_time | 0)) {
            msg1 = `Pilgrim, you enter a ${!shrined ? 'desecrated' : 'sacred'} place!`;
        }
        if (msg1 && can_speak && !Deaf) {
            await verbalize(msg1);
            if (msg2) await verbalize(msg2);
            epri.enter_time = moves + d(10, 100);
        }
        if (!sanctum) {
            let this_key;
            let other_key;
            let feelMsg;
            if (!shrined || !p_coaligned(priest)
                || (u.ualign?.record | 0) <= ALGN_SINNED) {
                const mid = (!shrined || !p_coaligned(priest)) ? '' : ' strange';
                feelMsg = `have a${mid} forbidding feeling...`;
                this_key = 'hostile_time';
                other_key = 'peaceful_time';
            } else {
                const mid = ((u.ualign?.record | 0) >= ALGN_DEVOUT)
                    ? 'a' : 'an unusual';
                feelMsg = `experience ${mid} sense of peace.`;
                this_key = 'peaceful_time';
                other_key = 'hostile_time';
            }
            if (moves >= (epri[this_key] | 0)
                || (epri[other_key] | 0) >= (epri[this_key] | 0)) {
                await pline(`You ${feelMsg}`);
                epri[this_key] = moves + d(10, 20);
                if ((epri[this_key] | 0) <= (epri[other_key] | 0)) {
                    epri[other_key] = (epri[this_key] | 0) - 1;
                }
            }
        }
        // mapseen_temple deferred
    } else {
        /* untended */
        switch (rn2(4)) {
        case 0:
            await pline('You have an eerie feeling...');
            break;
        case 1:
            await You_feel('like you are being watched.');
            break;
        case 2:
            await pline(`A shiver runs down your ${body_part(SPINE)}.`);
            break;
        default:
            break;
        }
        if (!rn2(5)) {
            const mtmp = makemon(mons(PM_GHOST), u.ux | 0, u.uy | 0, MM_NOMSG);
            if (mtmp) {
                const ngen = game.mvitals?.[PM_GHOST]?.born | 0;
                if (canspotmon(mtmp)) {
                    await pline(
                        `A${ngen < 5 ? 'n enormous' : ''} ghost appears next to you${
                            ngen < 10 ? '!' : '.'
                        }`,
                    );
                } else {
                    await pline('You sense a presence close by!');
                }
                mtmp.mpeaceful = 0;
                set_malign(mtmp);
                if (game.flags?.verbose) {
                    await pline(
                        'You are frightened to death, and unable to move.',
                    );
                }
                nomul(-3);
                game.multi_reason = 'being terrified of a ghost';
                game.nomovemsg = 'You regain your composure.';
            }
        }
    }
}
