// @ts-nocheck
// C apply.c:495-687 — magic whistle and its pet relocation summary.
import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { can_blow, seemimic, y_monnam } from './mhitm.js';
import { mnexto, teleds, teleok } from './teleport.js';
import { wake_nearby } from './mklev.js';
import { dist2 } from './hacklib.js';
import { noteleport_level } from './makemon.js';
import { fill_pit, mintrap } from './trap.js';
import { canspotmon, pline, newsym, Deaf } from './display.js';
import { discover_object } from './o_init.js';
import { change_luck } from './attrib.js';
import { ECMD_TIME, HALLUC, HALLUC_RES, isok, MON_FLOOR, RLOC_MSG,
    RLOC_NONE, NO_TRAP_FLAGS, TELEDS_TELEPORT,
    M_AP_TYPMASK, PLNMSG_MON_TAKES_OFF_ITEM } from './const.js';

/* flag.h's terminal last_msg enumerator, after PLNMSG_MON_TAKES_OFF_ITEM. */
const PLNMSG_ENUM = PLNMSG_MON_TAKES_OFF_ITEM + 1;
const TRAP_KILLED_MON = 2; /* trap.h Trap_Killed_Mon */

/* C teleport.c:814-838.  Reservoir selection consumes one rn2(count) for
 * each live on-map tame monster, before the adjacent placement rolls. */
export async function tele_to_rnd_pet() {
    const u = game.u || {};
    if (noteleport_level(game.youmonst)) return;
    let pet = null, count = 0;
    for (let mon = game.fmon; mon; mon = mon.nmon) {
        if ((mon.mhp | 0) <= 0 || !mon.mtame || (mon.mstate | 0) !== MON_FLOOR)
            continue;
        ++count;
        if (rn2(count) === 0) pet = mon;
    }
    if (!pet || dist2(pet.mx | 0, pet.my | 0, u.ux | 0, u.uy | 0) <= 2)
        return;
    const x = (pet.mx | 0) + rn2(3) - 1;
    const y = (pet.my | 0) + rn2(3) - 1;
    if (isok(x, y) && teleok(x, y, false))
        await teleds(x, y, TELEDS_TELEPORT);
}

function how_many(n) {
    return n < 2 ? 'sqrt(-1)' : n === 2 ? 'two' : n === 3 ? 'three'
        : n === 4 ? 'four' : n <= 7 ? 'several' : 'many';
}

/* C apply.c:518-687. */
export async function magic_whistled(obj) {
    if ((game.level?.flags?.stasis_until | 0) >= (game.moves | 0)) return;

    const known = !!game._oc_name_known?.[obj?.otyp | 0];
    let shift = 0, appear = 0, disappear = 0, trapped = 0;
    let shift_name = '', appear_name = '', disappear_name = '';

    for (let mon = game.fmon, next; mon; mon = next) {
        next = mon.nmon; /* mintrap can kill it */
        if ((mon.mhp | 0) <= 0 || !mon.mtame || mon === game.u?.usteed)
            continue;
        if (mon.mtrapped) {
            mon.mtrapped = 0;
            await fill_pit(mon.mx | 0, mon.my | 0);
        }
        const old_seen = canspotmon(mon);
        const old_name = old_seen ? y_monnam(mon) : '';
        const old_x = mon.mx | 0, old_y = mon.my | 0;
        if ((mon.m_ap_type | 0) & M_AP_TYPMASK) seemimic(mon);
        await mnexto(mon, known ? RLOC_NONE : RLOC_MSG);
        if ((mon.mx | 0) === old_x && (mon.my | 0) === old_y) continue;
        if (mon.mundetected) {
            mon.mundetected = 0;
            newsym(mon.mx | 0, mon.my | 0);
        }
        (game.iflags ||= {}).last_msg = PLNMSG_ENUM;
        if (await mintrap(mon, NO_TRAP_FLAGS) === TRAP_KILLED_MON)
            change_luck(-1);
        if (game.iflags.last_msg !== PLNMSG_ENUM) {
            ++trapped;
            continue;
        }
        const new_seen = (mon.mhp | 0) > 0 && canspotmon(mon);
        if (new_seen) {
            const name = y_monnam(mon);
            if (old_seen) {
                if (++shift === 1) shift_name = `${name} shifts location`;
            } else if (++appear === 1) {
                appear_name = `${name} appears`;
            }
        } else if (old_seen && ++disappear === 1) {
            disappear_name = `${old_name} disappears`;
        }
    }

    if (!known) {
        if (shift + appear + trapped > 0)
            discover_object(obj.otyp | 0, true, true, true);
        return;
    }

    let text = '';
    if (shift)
        text = shift > 1 ? `${how_many(shift)} creatures shift locations` : shift_name;
    if (appear) {
        const part = appear > 1
            ? `${how_many(appear)} ${shift === 0 ? 'creatures'
                : shift === 1 ? 'other creatures' : 'others'} appear`
            : appear_name;
        text = shift ? `${text}${disappear ? ',' : ' and'} ${part}` : part;
    }
    if (disappear) {
        const part = disappear > 1
            ? `${how_many(disappear)} ${!shift && !appear ? 'creatures'
                : shift < 2 && appear < 2 ? 'other creatures' : 'others'} disappear`
            : disappear_name;
        text = shift || appear ? `${text}${shift && appear ? ',' : ''} and ${part}` : part;
    }
    if (text)
        await pline(`${text[0].toUpperCase()}${text.slice(1)}.`);
}

/* C apply.c:495-514. */
export async function use_magic_whistle(obj) {
    if (!can_blow(game.youmonst)) {
        await pline('You are incapable of using the whistle.');
    } else if (obj?.cursed && rn2(2) === 0) {
        await pline(`You produce a ${game.u?.uinwater ? 'very ' : ''}high-${Deaf() ? 'frequency vibration' : 'pitched humming noise'}.`);
        await wake_nearby(true);
        if (rn2(2) === 0 && !noteleport_level(game.youmonst))
            await tele_to_rnd_pet();
    } else {
        const u = game.u || {};
        const hallu = !!(u.uprops?.[HALLUC]?.intrinsic | 0)
            && !((u.uprops?.[HALLUC_RES]?.intrinsic | 0)
                 || (u.uprops?.[HALLUC_RES]?.extrinsic | 0));
        const pitch = hallu ? 'normal'
            : u.uinwater && !Deaf() ? 'strange, high-pitched' : 'strange';
        await pline(Deaf() ? `You produce a ${pitch}, sharp vibration.`
            : `You produce a ${pitch} whistling sound.`);
        await magic_whistled(obj);
    }
    return ECMD_TIME;
}
