// priest.js — Temple entry + priest location helpers (partial).
// C ref: priest.c temple_occupied / findpriest / has_shrine / intemple /
//   in_your_sanctuary / reset_hostility / priest_talk / inhistemple /
//   clearpriests (D-1812; priest.c :918–929; really_done).
// Named omissions: mapseen_temple; SetVoice pitch in intemple.

import { game } from './gstate.js';
import { rn2, rn1, d } from './rng.js';
import {
    EPRI, EMIN, TEMPLE, ROOMOFFSET, SPINE, MM_NOMSG, IS_ALTAR, AM_SHRINE,
    Amask2align, ACH_TMPL, In_endgame,
    CLAIRVOYANT, PROTECTION, FROMOUTSIDE, INTRINSIC, LL_CONDUCT,
} from './const.js';
import { pline, You_feel, canseemon, canspotmon, verbalize, newsym, Hallucination } from './display.js';
import { makemon, set_malign } from './makemon.js';
import { mongone } from './mon.js';
import { mons, is_rider } from './monsters.js';
import { monsterNames } from './generated/monsters_data.js';
import { in_rooms, nomul } from './hack.js';
import { body_part } from './polyself.js';
import { SetVoice } from './sndprocs.js';
import { livelog_printf } from './pline.js';
import { adjalign, exercise, A_WIS } from './attrib.js';
import { money_cnt, money2u } from './shk.js';
import { bribe } from './minion.js';
import { incr_itimeout } from './potion.js';
import { currency } from './invent.js';
import { mhis } from './mondata.js';
import { Monnam, mon_nam } from './do_name.js';

const PM_GHOST = monsterNames.indexOf('PM_GHOST');
const PM_HIGH_CLERIC = monsterNames.indexOf('PM_HIGH_CLERIC');
const PM_ALIGNED_CLERIC = monsterNames.indexOf('PM_ALIGNED_CLERIC');
const PM_ANGEL = monsterNames.indexOf('PM_ANGEL');

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

/**
 * C ref: priest.c forget_temple_entry `:545–555` — zero shrine chatter
 * timestamps. Leaving the level then returning yields a fresh start.
 * Callers: savemonchn (ordinary WRITING|FREEING leave), save_mtraits.
 * C skips this on cant_go_back FREEING (endgame/tutorial teardown).
 * @param {object} priest
 */
export function forget_temple_entry(priest) {
    const epri_p = priest?.ispriest ? EPRI(priest) : null;
    if (!epri_p) return;
    epri_p.intone_time = epri_p.enter_time =
        epri_p.peaceful_time = epri_p.hostile_time = 0;
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

/** C ref: priest.c inhistemple `:160–171`. */
export function inhistemple(priest) {
    if (!priest || !priest.ispriest) return false;
    if (!histemple_at(priest, priest.mx, priest.my)) return false;
    return has_shrine(priest);
}

/**
 * C ref: priest.c reset_hostility `:754–768`.
 * Caller do.c final_level via iter_mons. isminion aligned cleric/angel
 * whose emin.min_align != u.ualign.type becomes hostile
 * (`mpeaceful = mtame = 0`) then set_malign; newsym after those
 * checks. JS `mons()` allocates a fresh permonst so mndx/mnum, not
 * pointer equality (same as mplayer_talk).
 */
export function reset_hostility(roamer) {
    if (!roamer.isminion) return;
    const mndx = roamer.data?.mndx ?? (roamer.mnum | 0);
    if (mndx !== PM_ALIGNED_CLERIC && mndx !== PM_ANGEL) return;

    const emin = EMIN(roamer);
    if (emin && (emin.min_align | 0) !== (game.u?.ualign?.type | 0)) {
        roamer.mpeaceful = 0;
        roamer.mtame = 0;
        set_malign(roamer);
    }
    newsym(roamer.mx | 0, roamer.my | 0);
}

/** C ref: priest.c p_coaligned — shrine align matches hero. */
export function p_coaligned(priest) {
    const shralign = EPRI(priest)?.shralign;
    const algn = shralign != null
        ? (shralign | 0)
        : (priest?.data?.maligntyp | 0);
    return (game.u?.ualign?.type | 0) === (algn | 0);
}

/**
 * C ref: priest.c findpriest — living ispriest with matching shroom in temple.
 * `roomno` may be a numeric shroom or a temple occupancy char (charCode).
 */
export function findpriest(roomno) {
    const want = typeof roomno === 'string'
        ? (roomno.charCodeAt(0) | 0)
        : (roomno | 0);
    for (const mtmp of game.fmon || []) {
        if ((mtmp.mhp | 0) <= 0) continue;
        if (!mtmp.ispriest) continue;
        if ((EPRI(mtmp)?.shroom | 0) !== want) continue;
        if (histemple_at(mtmp, mtmp.mx | 0, mtmp.my | 0)) return mtmp;
    }
    return null;
}

/**
 * C ref: priest.c in_your_sanctuary — hero's coaligned tended shrine temple.
 * When `mon` is non-null, uses mon.mx/my (minion/rider never sanctuary).
 * Named: Is_sanctum / astral Moloch arms live in intemple, not here.
 */
export function in_your_sanctuary(mon, x = 0, y = 0) {
    if (mon) {
        const ptr = mon.data;
        // C: is_minion || is_rider
        if (((ptr?.mflags2 ?? 0) & 0x00001000 /* M2_MINION */) || is_rider(ptr)) {
            return false;
        }
        x = mon.mx | 0;
        y = mon.my | 0;
    }
    const u = game.u;
    if (!u) return false;
    if ((u.ualign?.record | 0) <= ALGN_SINNED) return false;
    const roomno = temple_occupied(u.urooms);
    if (!roomno || roomno === '\0') return false;
    const trooms = in_rooms(x, y, TEMPLE);
    if (!trooms || trooms[0] !== roomno) return false;
    const priest = findpriest(roomno);
    if (!priest) return false;
    return !!(has_shrine(priest) && p_coaligned(priest) && priest.mpeaceful);
}

import { record_achievement } from './insight.js';

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

const CRANKY_MSG = [
    "Thou wouldst have words, eh?  I'll give thee a word or two!",
    'Talk?  Here is what I have to say!',
    'Pilgrim, I would speak no longer with thee.',
];

/** C ref: priest.c priest_talk `:557–721`. Caller sounds.c MS_PRIEST. */
export async function priest_talk(priest) {
    const coaligned = p_coaligned(priest);
    const strayed = (game.u?.ualign?.record | 0) < 0;
    const epri = EPRI(priest);
    const u = game.u || (game.u = {});
    if (!u.uconduct) u.uconduct = {};
    if (!(u.uconduct.gnostic | 0)) {
        livelog_printf(LL_CONDUCT, 'rejected atheism by consulting with %s',
            mon_nam(priest));
    }
    u.uconduct.gnostic = (u.uconduct.gnostic | 0) + 1;

    if (priest.mflee || (!priest.ispriest && coaligned && strayed)) {
        await pline(`${Monnam(priest)} doesn't want anything to do with you!`);
        priest.mpeaceful = 0;
        return;
    }

    if (!inhistemple(priest) || !priest.mpeaceful || helpless(priest)) {
        if (helpless(priest)) {
            await pline(`${Monnam(priest)} breaks out of ${mhis(priest)} reverie!`);
            priest.mfrozen = 0;
            priest.msleeping = 0;
            priest.mcanmove = 1;
        }
        priest.mpeaceful = 0;
        SetVoice(priest, 0, 80, 0);
        await verbalize(CRANKY_MSG[rn2(3)]);
        return;
    }

    const rooms = in_rooms(priest.mx, priest.my, TEMPLE);
    if (priest.mpeaceful && rooms && (rooms.charCodeAt(0) | 0)
        && !has_shrine(priest)) {
        SetVoice(priest, 0, 80, 0);
        await verbalize(
            'Begone!  Thou desecratest this holy place with thy presence.',
        );
        priest.mpeaceful = 0;
        return;
    }
    if (!money_cnt(game.invent)) {
        if (coaligned && !strayed) {
            const pmoney = money_cnt(priest.minvent);
            if (pmoney > 0) {
                const bits = Hallucination()
                    ? currency(pmoney)
                    : (pmoney === 1 ? 'bit' : 'bits');
                await pline(`${Monnam(priest)} gives you ${pmoney === 1 ? 'one ' : 'two '}${bits} for an ale.`);
                await money2u(priest, pmoney > 1 ? 2 : 1);
            } else {
                await pline(`${Monnam(priest)} preaches the virtues of poverty.`);
            }
            exercise(A_WIS, true);
        } else {
            await pline(`${Monnam(priest)} is not interested.`);
        }
        return;
    }

    const cheap = epri ? (epri.cheapskate_count | 0) : 0;
    const peak = (u.ulevelpeak | 0) ? (u.ulevelpeak | 0) : 1;
    const suggested = peak * rn1(101, 150 + cheap * 40);
    let quan = Math.trunc(money_cnt(game.invent) / (suggested * 3));
    if (quan < 1) quan = 1;
    const buf = `How much will you offer (suggested: ${suggested * quan} or ${suggested * quan * 2})?`;
    if (game.flags?.debug) {
        await pline(`${Monnam(priest)} asks you for a contribution for the temple (base ${suggested}).`);
    } else {
        await pline(`${Monnam(priest)} asks you for a contribution for the temple.`);
    }
    const offer = await bribe(priest, buf);
    if (offer === 0) {
        SetVoice(priest, 0, 80, 0);
        await verbalize('Thou shalt regret thine action!');
        if (coaligned) adjalign(-1);
        if (epri) epri.cheapskate_count = (epri.cheapskate_count | 0) + 1;
    } else if (offer < suggested * quan) {
        if (money_cnt(game.invent) > offer * 2) {
            SetVoice(priest, 0, 80, 0);
            await verbalize('Cheapskate.');
            if (epri) epri.cheapskate_count = (epri.cheapskate_count | 0) + 1;
        } else {
            SetVoice(priest, 0, 80, 0);
            await verbalize('I thank thee for thy contribution.');
            exercise(A_WIS, true);
        }
    } else if (offer < suggested * quan * 2) {
        SetVoice(priest, 0, 80, 0);
        await verbalize('Thou art indeed a pious individual.');
        if (money_cnt(game.invent) < offer * 2) {
            if (coaligned && (u.ualign?.record | 0) <= ALGN_SINNED) {
                adjalign(1);
            }
        }
        await verbalize('I bestow upon thee a blessing.');
        if (!u.uprops) u.uprops = {};
        const clair = u.uprops[CLAIRVOYANT] || (u.uprops[CLAIRVOYANT] = {
            intrinsic: 0, extrinsic: 0, blocked: 0,
        });
        const span = Math.trunc((500 * offer) / suggested);
        incr_itimeout(clair, rn1(span, span));
        u.HClairvoyant = clair.intrinsic;
    } else if (offer < suggested * quan * 3) {
        let orig_ublessed = u.ublessed | 0;
        if (!u.uprops) u.uprops = {};
        const prot = u.uprops[PROTECTION] || (u.uprops[PROTECTION] = {
            intrinsic: 0, extrinsic: 0, blocked: 0,
        });
        if (!((prot.intrinsic | 0) & INTRINSIC)) {
            prot.intrinsic |= FROMOUTSIDE;
            orig_ublessed = -1;
        }
        u.HProtection = prot.intrinsic;
        let remain = offer;
        for (; remain >= (2 * suggested); remain -= (2 * suggested)) {
            if (!(u.ublessed | 0)) {
                u.ublessed = rn1(3, 2);
            } else if ((u.ublessed | 0) < 20
                && ((u.ublessed | 0) < 9 || !rn2(u.ublessed | 0))) {
                u.ublessed = (u.ublessed | 0) + 1;
            }
        }
        SetVoice(priest, 0, 80, 0);
        if ((u.ublessed | 0) > orig_ublessed) {
            await verbalize('Thou hast been rewarded for thy devotion.');
        } else {
            await verbalize('Thy selfless generosity is deeply appreciated.');
        }
    } else {
        SetVoice(priest, 0, 80, 0);
        await verbalize('Thy selfless generosity is deeply appreciated.');
        if (money_cnt(game.invent) < offer * 2 && coaligned) {
            if (strayed && ((game.moves | 0) - (u.ucleansed | 0)) > 5000) {
                if (!u.ualign) u.ualign = { type: 0, record: 0, abuse: 0 };
                u.ualign.record = 0;
                u.ucleansed = game.moves | 0;
            } else {
                adjalign(2);
            }
        }
    }
}

/**
 * C ref: priest.c clearpriests `:918–929`. Gameover: drop off-level
 * temple priests from fmon so they are not written into bones.
 * Snapshot the list because mongone splices fmon (D-1789 shape).
 */
export async function clearpriests() {
    const u = game.u || {};
    for (const mtmp of [...(game.fmon || [])]) {
        if ((mtmp.mhp | 0) < 1) continue;
        if (mtmp.ispriest && !on_level(EPRI(mtmp)?.shrlevel, u.uz)) {
            await mongone(mtmp);
        }
    }
}
