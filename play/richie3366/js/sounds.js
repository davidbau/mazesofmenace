// sounds.js — Ambient sounds and #chat.
// C ref: sounds.c — dosounds / dotalk / dochat / domonnoise (MS_BARK subset).

import { game } from './gstate.js';
import { pline } from './display.js';
import { getdir } from './lock.js';
import { mon_at } from './uhitm.js';
import { Monnam } from './do_name.js';
import { objects_at } from './mkobj.js';
import { objectNames } from './generated/objects_data.js';
import { rn2 } from './rng.js';
import { dist2 } from './hacklib.js';
import {
    is_animal, is_flyer, is_lord, is_prince, is_mercenary, is_undead,
    monsterNames,
} from './monsters.js';
import {
    ECMD_OK, ECMD_TIME, ECMD_CANCEL, isok, IS_WALL, SDOOR, SIZE,
    ANY_SHOP, ANY_TYPE, OROOM, SHOPBASE, ROOMOFFSET, VAULT,
    COURT, BEEHIVE, MORGUE, BARRACKS, ZOO,
    ESHK, EGD, Is_astralevel, Is_oracle_level,
} from './const.js';

const STATUE = objectNames.indexOf('STATUE');
const PM_ORACLE = monsterNames.indexOf('PM_ORACLE');

/**
 * C ref: mkroom.c search_special — first room/subroom matching type.
 * Sentinel: rooms terminated by hx < 0.
 */
function search_special(type) {
    const lists = [game.level?.rooms, game.level?.subrooms];
    for (const rooms of lists) {
        if (!rooms) continue;
        for (const croom of rooms) {
            if (!croom || (croom.hx | 0) < 0) break;
            const rt = croom.rtype | 0;
            if ((type === ANY_TYPE && rt !== OROOM)
                || (type === ANY_SHOP && rt >= SHOPBASE)
                || rt === type) {
                return croom;
            }
        }
    }
    return null;
}

/** C ref: sounds.c mon_in_room */
function mon_in_room(mon, rmtyp) {
    const loc = game.level?.at?.(mon.mx, mon.my);
    const rno = loc?.roomno | 0;
    if (rno >= ROOMOFFSET) {
        const room = game.level.rooms[rno - ROOMOFFSET];
        return !!(room && (room.rtype | 0) === rmtyp);
    }
    return false;
}

/**
 * C ref: mon.c get_iter_mons — first living on-map mon where bfunc is true.
 * Named omission: mon_offmap edge cases beyond mx/my null.
 */
function get_iter_mons(bfunc) {
    for (const mtmp of game.fmon || []) {
        if (!mtmp || mtmp.mx == null || mtmp.my == null) continue;
        if ((mtmp.mhp | 0) < 1) continue;
        if (bfunc(mtmp)) return mtmp;
    }
    return null;
}

/** C ref: shk.c inhishop — roomno match stand-in (full in_rooms deferred). */
function inhishop(shkp) {
    const eshk = ESHK(shkp);
    if (!eshk || shkp.mx == null) return false;
    const loc = game.level?.at?.(shkp.mx, shkp.my);
    return !!loc && ((loc.roomno | 0) === (eshk.shoproom | 0));
}

/** C ref: shk.c tended_shop */
function tended_shop(sroom) {
    const mtmp = sroom?.resident;
    return !!(mtmp && inhishop(mtmp));
}

/** C ref: shk.c noisy_shop / mon.c wake_nearto (zombie strat deferred). */
function wake_nearto(x, y, distance) {
    for (const mtmp of game.fmon || []) {
        if (!mtmp || mtmp.mx == null) continue;
        if (distance === 0 || dist2(mtmp.mx, mtmp.my, x, y) < distance) {
            mtmp.msleeping = 0;
        }
    }
}

function noisy_shop(sroom) {
    const mtmp = sroom?.resident;
    if (mtmp && inhishop(mtmp)) {
        wake_nearto(mtmp.mx, mtmp.my, 11 * 11);
    }
}

/** Hero occupancy of shop room — C strchr(u.ushops, ROOM_INDEX+ROOMOFFSET). */
function hero_in_shop(sroom) {
    const rooms = game.level?.rooms || [];
    const idx = rooms.indexOf(sroom);
    if (idx < 0) return false;
    const ch = String.fromCharCode(idx + ROOMOFFSET);
    const ushops = game.u?.ushops || '';
    return ushops.includes(ch);
}

/** C ref: vault.c vault_occupied — first urooms entry whose rtype is VAULT. */
function vault_occupied(array) {
    const rooms = game.level?.rooms || [];
    const s = array || '';
    for (let i = 0; i < s.length; i++) {
        const ch = s.charCodeAt(i);
        const idx = ch - ROOMOFFSET;
        if (idx >= 0 && idx < rooms.length
            && (rooms[idx]?.rtype | 0) === VAULT) {
            return ch;
        }
    }
    return 0;
}

/**
 * C ref: vault.c findgd — first isgd on fmon for this level.
 * Named omission: migrating_mons park-at-<0,0> arm; mx/gddone heal.
 */
function findgd() {
    const uz = game.u?.uz;
    for (const mtmp of game.fmon || []) {
        if (!mtmp?.isgd) continue;
        const gdlevel = EGD(mtmp)?.gdlevel;
        if (gdlevel
            && ((gdlevel.dnum | 0) !== (uz?.dnum | 0)
                || (gdlevel.dlevel | 0) !== (uz?.dlevel | 0))) {
            continue;
        }
        return mtmp;
    }
    return null;
}

/**
 * C ref: vault.c gd_sound — true when ambient vault messages are allowed.
 * False if hero occupies a vault room or a guard already exists.
 */
function gd_sound() {
    return !(vault_occupied(game.u?.urooms) || findgd());
}

/** C ref: sounds.c throne_mon_sound — RNG only; messages deferred. */
function throne_mon_sound(mtmp) {
    if ((mtmp.msleeping || is_lord(mtmp.data) || is_prince(mtmp.data))
        && !is_animal(mtmp.data)
        && mon_in_room(mtmp, COURT)) {
        rn2(3); // which = rn2(3)+hallu; hallu deferred
        return true;
    }
    return false;
}

/** C ref: sounds.c beehive_mon_sound — RNG only. */
function beehive_mon_sound(mtmp) {
    if (mtmp.data?.mlet === 'S_ANT' && is_flyer(mtmp.data)
        && mon_in_room(mtmp, BEEHIVE)) {
        rn2(2); // +hallu deferred
        return true;
    }
    return false;
}

/** C ref: sounds.c morgue_mon_sound — undead only; vampshifter deferred. */
function morgue_mon_sound(mtmp) {
    if (is_undead(mtmp.data) && mon_in_room(mtmp, MORGUE)) {
        rn2(2);
        return true;
    }
    return false;
}

/** C ref: sounds.c zoo_mon_sound — RNG only. */
function zoo_mon_sound(mtmp) {
    if ((mtmp.msleeping || is_animal(mtmp.data)) && mon_in_room(mtmp, ZOO)) {
        rn2(2);
        return true;
    }
    return false;
}

/**
 * C ref: sounds.c temple_priest_sound — body deferred (inhistemple/altar).
 * Always false until priest temple wiring exists; gate still burns.
 */
function temple_priest_sound(_mtmp) {
    return false;
}

/**
 * C ref: sounds.c oracle_sound — PM_ORACLE hear; canseemon/Hallu gate.
 * Named omission: always takes hear path (canseemon deferred); may over-burn
 * rn2 when oracle is clearly visible and !Hallucination.
 */
function oracle_sound(mtmp) {
    if ((mtmp.data?.mndx | 0) !== PM_ORACLE) return false;
    rn2(3); // C: ora_msg[rn2(3)+hallu*2] when Hallu || !canseemon
    return true;
}

/**
 * C ref: sounds.c dosounds — ambient feature rolls each EOT.
 * Branch envelope: fountain/sink/court/swamp/vault/beehive/morgue/
 * barracks/zoo/shop/temple/oracle gates; vault body search_special+
 * gd_sound+rn2(2); shop body search_special+tended_shop+rn2(2)+
 * noisy_shop; mon_sound helpers RNG-only when match.
 * Named omissions: You_hear plines; gold_in_vault / vault_occupied
 * urooms maintenance; findgd migrating_mons; vampshifter morgue;
 * temple_priest body; oracle canseemon; Is_sanctum; Hallu index.
 */
export function dosounds() {
    const lf = game.level?.flags;
    if (!lf) return;
    if (game.u?.Deaf || game.flags?.acoustics === false
        || game.u?.uswallow || game.u?.Underwater) {
        return;
    }

    const hallu = game.u?.Hallucination ? 1 : 0;

    if (lf.nfountains && !rn2(400)) {
        rn2(3); // fountain_msg index; +hallu deferred in prior peels
    }
    if (lf.nsinks && !rn2(300)) {
        rn2(2); // sink_msg
    }
    if (lf.has_court && !rn2(200)) {
        if (get_iter_mons(throne_mon_sound)) return;
    }
    if (lf.has_swamp && !rn2(200)) {
        rn2(2); // swamp_msg; C returns after
        return;
    }
    if (lf.has_vault && !rn2(200)) {
        if (!search_special(VAULT)) {
            lf.has_vault = false;
            return;
        }
        // C: if (gd_sound()) switch (rn2(2) + hallu) { You_hear… }
        // gold_in_vault / vault_occupied message arms — plines deferred
        if (gd_sound()) {
            rn2(2) + hallu;
        }
        return;
    }
    if (lf.has_beehive && !rn2(200)) {
        if (get_iter_mons(beehive_mon_sound)) return;
    }
    if (lf.has_morgue && !rn2(200)) {
        if (get_iter_mons(morgue_mon_sound)) return;
    }
    if (lf.has_barracks && !rn2(200)) {
        let count = 0;
        for (const mtmp of game.fmon || []) {
            if (!mtmp || (mtmp.mhp | 0) < 1) continue;
            if (is_mercenary(mtmp.data)
                && mon_in_room(mtmp, BARRACKS)
                && (mtmp.msleeping || ++count > 5)) {
                rn2(3); // barracks_msg
                return;
            }
        }
    }
    if (lf.has_zoo && !rn2(200)) {
        if (get_iter_mons(zoo_mon_sound)) return;
    }
    if (lf.has_shop && !rn2(200)) {
        const sroom = search_special(ANY_SHOP);
        if (!sroom) {
            lf.has_shop = false;
            return;
        }
        if (tended_shop(sroom) && !hero_in_shop(sroom)) {
            rn2(2); // shop_msg; hallu index deferred
            noisy_shop(sroom);
        }
        return;
    }
    if (lf.has_temple && !rn2(200) && !Is_astralevel(game.u?.uz)) {
        // Is_sanctum deferred (always false → gate may open on sanctum)
        if (get_iter_mons(temple_priest_sound)) return;
    }
    if (Is_oracle_level(game.u?.uz) && !rn2(400)) {
        if (get_iter_mons(oracle_sound)) return;
    }
}

/** C ref: sounds.c dochat Hallucination walltalk[]. */
const WALLTALK = [
    'gripes about its job.',
    'tells you a funny joke!',
    'insults your heritage!',
    'chuckles.',
    'guffaws merrily!',
    'deprecates your exploration efforts.',
    'suggests a stint of rehab...',
    "doesn't seem to be interested.",
];

/** C ref: monflag.h MS_BARK — dogs/canines (mlet S_DOG). */
const MS_BARK = 1;

/**
 * Infer msound when generated tables omit it.
 * S_DOG → MS_BARK (little dog / dog / wolf / …).
 */
function mon_msound(mtmp) {
    const ptr = mtmp?.data;
    if (!ptr) return 0;
    if (ptr.msound != null) return ptr.msound | 0;
    if (ptr.mlet === 'S_DOG') return MS_BARK;
    return 0; // MS_SILENT — other sounds deferred
}

/**
 * C ref: sounds.c domonnoise — MS_BARK tame/peaceful bark path.
 * Other MS_* named omitted in C-JS-MAP; unknown → ECMD_OK (silent).
 * FULL_MOON howl needs night() — deferred; falls through to bark.
 */
export async function domonnoise(mtmp) {
    if (!mtmp) return ECMD_OK;
    if (game.u?.Deaf) return ECMD_OK;
    const msound = mon_msound(mtmp);
    if (msound === 0 && !mtmp.isshk) return ECMD_OK;

    let pline_msg = null;
    const ptr = mtmp.data;
    const moves = game.moves | 0;
    const hungrytime = mtmp.edog?.hungrytime | 0;

    if (msound === MS_BARK) {
        // C: FULL_MOON && night() → "howls." — night() deferred
        if (mtmp.mpeaceful) {
            if (mtmp.mtame
                && (mtmp.mconf || mtmp.mflee || mtmp.mtrapped
                    || moves > hungrytime || (mtmp.mtame | 0) < 5)) {
                pline_msg = 'whines.';
            } else if (mtmp.mtame && hungrytime > moves + 1000) {
                pline_msg = 'yips.';
            } else if (ptr?.name !== 'PM_DINGO') {
                pline_msg = 'barks.';
            }
        } else {
            pline_msg = 'growls.';
        }
    }
    // Other msound cases deferred

    if (pline_msg) {
        await pline(`${Monnam(mtmp)} ${pline_msg}`);
        return ECMD_TIME;
    }
    return ECMD_OK;
}

/**
 * C ref: sounds.c dochat — getdir; statue; wall/SDOOR talk;
 * adjacent monster → domonnoise.
 * Named omissions: is_silent/Strangled/uswallow/Underwater;
 * shop price_quote; usteed; priest wake; Deaf response; Hallu
 * statue rndmonnam.
 */
async function dochat() {
    // is_silent(you) / Strangled / uswallow / Underwater deferred
    if (!(await getdir('Talk to whom? (in what direction)'))) {
        return ECMD_CANCEL;
    }

    const u = game.u || {};
    if (u.dz) {
        await pline(
            `They won't hear you ${u.dz < 0 ? 'up' : 'down'} there.`,
        );
        return ECMD_OK;
    }
    if ((u.dx | 0) === 0 && (u.dy | 0) === 0) {
        await pline('Talking to yourself is a bad habit for a dungeoneer.');
        return ECMD_OK;
    }

    const tx = (u.ux | 0) + (u.dx | 0);
    const ty = (u.uy | 0) + (u.dy | 0);
    if (!isok(tx, ty)) return ECMD_OK;

    const mtmp = mon_at(tx, ty);
    if (!mtmp || mtmp.mundetected) {
        // C: vobj_at STATUE → "The statue seems not to notice you."
        const otmp = objects_at(tx, ty);
        if (otmp && (otmp.otyp | 0) === STATUE) {
            if (!u.Blind && !u.ublind) {
                await pline('The statue seems not to notice you.');
            }
            return ECMD_OK;
        }
        // C: !Deaf && (IS_WALL || SDOOR) — secret door stays wall-like
        const typ = game.level?.locations?.[tx]?.[ty]?.typ | 0;
        if (!u.Deaf && (IS_WALL(typ) || typ === SDOOR)) {
            const blind = !!(u.Blind || u.ublind);
            const seenTyp = game.lastseentyp?.[tx]?.[ty] | 0;
            if (blind && !IS_WALL(seenTyp)) {
                // Blind + unmapped wall: silent
            } else if (!u.Hallucination) {
                await pline("It's like talking to a wall.");
            } else {
                // C: rn2(10); clamp to last walltalk[] entry
                let idx = rn2(10);
                if (idx >= SIZE(WALLTALK)) idx = SIZE(WALLTALK) - 1;
                await pline(`The wall ${WALLTALK[idx]}`);
            }
            return ECMD_OK;
        }
        return ECMD_OK;
    }
    // M_AP furniture/object deferred
    if (mtmp.m_ap_type === 1 || mtmp.m_ap_type === 2) return ECMD_OK;

    // helpless non-priest → notice pline; deferred body uses canspot
    if ((mtmp.mfrozen || mtmp.msleeping) && !mtmp.ispriest) {
        await pline(`${Monnam(mtmp)} seems not to notice you.`);
        return ECMD_OK;
    }

    // C: mtmp->mstrategy &= ~STRAT_WAITMASK (CLOSE|WAITFORU)
    if (mtmp.mstrategy != null) {
        mtmp.mstrategy &= ~(0x10000000 | 0x20000000);
    }

    if (mtmp.mtame && mtmp.meating) {
        await pline(`${Monnam(mtmp)} is eating noisily.`);
        return ECMD_OK;
    }

    return domonnoise(mtmp);
}

/** C ref: sounds.c dotalk — #chat entry. */
export async function dotalk() {
    return dochat();
}
