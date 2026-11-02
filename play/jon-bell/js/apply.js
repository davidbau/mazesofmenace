// apply.js — C ref: apply.c.
import { BOULDER } from './dig.js';
import { boulder_hits_pool } from './do.js';
import { game } from './gstate.js';
import { is_pool_or_lava } from './look.js';
import { update_inventory } from './mhitm.js';
import { obj_extract_self } from './mklev.js';
import { sobj_at } from './invent.js';
import { change_luck } from './attrib.js'; // relocate-fns
import { BUFSZ, ECMD_TIME, HALLUC, HALLUC_RES, M_AP_TYPMASK, NO_TRAP_FLAGS, PLNMSG_MON_TAKES_OFF_ITEM, RLOC_MSG, RLOC_NONE } from './const.js'; // relocate-fns
import { Deaf, canspotmon, newsym } from './display.js'; // relocate-fns
import { upstart } from './hacklib.js'; // relocate-fns
import { tele_to_rnd_pet } from './teleport.js'; // relocate-fns
import { noteleport_level } from './teleport.js'; // relocate-fns
import { seemimic, y_monnam } from './mhitm.js'; // relocate-fns
import { wake_nearby } from './mon.js'; // relocate-fns
import { can_blow } from './mondata.js'; // relocate-fns
import { discover_object } from './o_init.js'; // relocate-fns
import { pline } from './pline.js'; // relocate-fns
import { rn2 } from './rng.js'; // relocate-fns
import { mnexto } from './teleport.js'; // relocate-fns
import { fill_pit, mintrap } from './trap.js'; // relocate-fns
import { canseemon } from './display.js'; // relocate-fns
import { pline_mon } from './dog.js'; // relocate-fns
import { Monnam } from './mcastu.js'; // relocate-fns
import { pronoun_gender } from './mondata.js'; // relocate-fns
import { _cnutritE } from './eat.js'; // relocate-fns

// C ref: apply.c:3895-3905 maybe_dunk_boulders(x,y) — while x,y has lava or
// water, dunk any boulder sitting there into it.  RNG-free (obj_extract_self
// and boulder_hits_pool draw nothing of their own for the plain-splash case).
// Defined in apply.c, not dig.c, but exported from here: it is the last of
// the do_break_wand WAN_DIGGING arm's (apply.c:4034-4056, js/cmd.js) callees
// this file was missing, alongside dig_check_/fillholetyp_/liquid_flow_/
// digactualhole_ above (fill_pit and recalc_block_point, the arm's other two
// callees, already have js/ homes: js/trap.js and js/vision.js respectively).
// Exporting adds no new caller in THIS file, so this file's own behaviour and
export async function maybe_dunk_boulders(x, y) {
    let otmp;
    while (is_pool_or_lava(x, y) && (otmp = sobj_at(BOULDER, x, y))) {
        obj_extract_self(otmp);
        await boulder_hits_pool(otmp, x, y, false);
    }
}

/* C apply.c:711-724 — an about-to-be-destroyed leash releases its monster. */
export function o_unleash(otmp) {
    if (!otmp) return;
    const leashmon = otmp.leashmon | 0;
    if (leashmon) {
        for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
            if ((mtmp.m_id | 0) === leashmon) {
                mtmp.mleashed = 0;
                break;
            }
        }
    }
    otmp.leashmon = 0;
    update_inventory();
}

/* flag.h's terminal last_msg enumerator, after PLNMSG_MON_TAKES_OFF_ITEM. */
const PLNMSG_ENUM = PLNMSG_MON_TAKES_OFF_ITEM + 1;

const TRAP_KILLED_MON = 2; /* trap.h Trap_Killed_Mon */

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
        text = upstart(shift > 1 ? `${how_many(shift)} creatures shift locations`
            : shift_name).split(/[\0\n]/, 1)[0];
    if (appear) {
        const part = appear > 1
            ? `${how_many(appear)} ${shift === 0 ? 'creatures'
                : shift === 1 ? 'other creatures' : 'others'} appear`
            : appear_name;
        text = shift ? `${text}${disappear ? ',' : ' and'} ${part}`
            : upstart(part).split(/[\0\n]/, 1)[0];
    }
    if (disappear) {
        const part = disappear > 1
            ? `${how_many(disappear)} ${!shift && !appear ? 'creatures'
                : shift < 2 && appear < 2 ? 'other creatures' : 'others'} disappear`
            : disappear_name;
        text = shift || appear ? `${text}${shift && appear ? ',' : ''} and ${part}`
            : upstart(part).split(/[\0\n]/, 1)[0];
    }
    // C copynchars() stops at newline; Snprintf() appends within buf[BUFSZ].
    text = text.slice(0, BUFSZ - 1);
    if (text)
        await pline(`${text}.`);
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

/* C apply.c:726-743 — release one monster from its inventory leash.  The
 * leash object stores the monster id; clear that link and the monster flag.
 * Return the feedback's paging promise for callers which can await it. */
export function m_unleash(mtmp, force) {
    if (!mtmp)
        return;
    const feedback = !force ? undefined : canseemon(mtmp)
        ? pline_mon(mtmp, '%s pulls free of %s leash!', Monnam(mtmp),
                    ['his', 'her', 'its', 'their'][pronoun_gender(mtmp, 2)])
        : pline('Your leash falls slack.');
    const mid = mtmp.m_id | 0;
    for (let otmp = game.invent; otmp; otmp = otmp.nobj) {
        if ((otmp.otyp | 0) === 236 /* LEASH */ && (otmp.leashmon | 0) === mid) {
            otmp.leashmon = 0;
            update_inventory();
            break;
        }
    }
    mtmp.mleashed = 0;
    return feedback;
}

export function tinnable(corpse) {
    if (corpse.oeaten | 0)
        return false;
    if (!_cnutritE(corpse.corpsenm | 0))
        return false;
    return true;
}

/* C apply.c:746-756: release both ends before dropping the hero's inventory. */
export function unleash_all() {
    for (let obj = game.invent; obj; obj = obj.nobj)
        if (obj.otyp === 236 /* LEASH */) obj.leashmon = 0;
    for (let mon = game.fmon; mon; mon = mon.nmon)
        mon.mleashed = 0;
}
