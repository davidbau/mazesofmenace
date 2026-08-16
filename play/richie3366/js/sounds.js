// sounds.js — Ambient sounds and #chat.
// C ref: sounds.c — dosounds / dotalk / dochat / domonnoise (MS_BARK subset)
//         + yelp / growl (pet abuse; D-0836).

import { game } from './gstate.js';
import { pline, canseemon } from './display.js';
import { getdir } from './lock.js';
import { mon_at } from './uhitm.js';
import { Monnam } from './do_name.js';
import { objects_at } from './mkobj.js';
import { objectNames } from './generated/objects_data.js';
import { COIN_CLASS } from './objects.js';
import { rn2 } from './rng.js';
import { dist2 } from './hacklib.js';
import { vtense } from './objnam.js';
import { nomul } from './hack.js';
import {
    is_animal, is_flyer, is_lord, is_prince, is_mercenary, is_undead,
    monsterNames, G_UNIQ,
} from './monsters.js';
import {
    ECMD_OK, ECMD_TIME, ECMD_CANCEL, isok, IS_WALL, SDOOR, SIZE,
    ANY_SHOP, ANY_TYPE, OROOM, SHOPBASE, ROOMOFFSET, VAULT,
    COURT, BEEHIVE, MORGUE, BARRACKS, ZOO,
    ESHK, Is_astralevel, Is_oracle_level, STRAT_WAITMASK,
} from './const.js';
import { vault_occupied, findgd } from './vault.js';

const STATUE = objectNames.indexOf('STATUE');
const PM_ORACLE = monsterNames.indexOf('PM_ORACLE');

/** C ref: pline.c You_hear — acoustics/Deaf; Unaware/Underwater deferred. */
async function You_hear(line) {
    const u = game.u || {};
    if (u.Deaf || game.flags?.acoustics === false) return;
    await pline(`You hear ${line}`);
}

/** C ref: invent.c g_at — first COIN_CLASS on pile (local for vault gold scan). */
function gold_at(x, y) {
    for (let obj = objects_at(x, y); obj; obj = obj.nexthere) {
        if (obj.oclass === COIN_CLASS) return obj;
    }
    return null;
}

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

/**
 * C ref: mon.c wake_nearto / wake_nearto_core (zombie/petcall deferred).
 * Clears msleeping + non-G_UNIQ STRAT_WAITMASK inside dist2 < distance.
 * wake_msg via dynamic import (avoids sounds↔mon↔uhitm static cycle).
 */
async function wake_nearto(x, y, distance) {
    const { wake_msg } = await import('./mon.js');
    for (const mtmp of game.fmon || []) {
        if (!mtmp || mtmp.mx == null || (mtmp.mhp | 0) <= 0) continue;
        if (distance === 0 || dist2(mtmp.mx, mtmp.my, x, y) < distance) {
            await wake_msg(mtmp, false);
            mtmp.msleeping = 0;
            if (!((mtmp.data?.geno | 0) & G_UNIQ) && mtmp.mstrategy != null) {
                mtmp.mstrategy &= ~STRAT_WAITMASK;
            }
        }
    }
}

async function noisy_shop(sroom) {
    const mtmp = sroom?.resident;
    if (mtmp && inhishop(mtmp)) {
        await wake_nearto(mtmp.mx, mtmp.my, 11 * 11);
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
 * barracks/zoo/shop/temple/oracle gates; vault body + You_hear
 * (gd_sound / gold_in_vault / vault_occupied FALLTHROUGH); shop body
 * search_special+tended_shop+You_hear(shop_msg)+noisy_shop;
 * mon_sound RNG-only.
 * Named omissions: swamp You1; barracks/court You_hear plines;
 * findgd migrating_mons; vampshifter morgue; temple_priest body;
 * oracle canseemon; Is_sanctum; Soundeffect.
 */
export async function dosounds() {
    const lf = game.level?.flags;
    if (!lf) return;
    const u = game.u || {};
    // C youprop.h Deaf ≡ HDeaf|EDeaf|uroleplay.deaf (plus u.Deaf flag)
    const Deaf = !!((u.HDeaf | 0) || (u.EDeaf | 0) || u.uroleplay?.deaf || u.Deaf);
    if (Deaf || game.flags?.acoustics === false
        || u.uswallow || u.Underwater) {
        return;
    }

    const hallu = game.u?.Hallucination ? 1 : 0;

    // C: fountain_msg[rn2(3)+hallu] → You_hear1
    if (lf.nfountains && !rn2(400)) {
        const fountain_msg = [
            'bubbling water.', 'water falling on coins.',
            'the splashing of a naiad.', 'a soda fountain!',
        ];
        await You_hear(fountain_msg[rn2(3) + hallu]);
    }
    // C: sink_msg[rn2(2)+hallu] → You_hear1
    if (lf.nsinks && !rn2(300)) {
        const sink_msg = [
            'a slow drip.', 'a gurgling noise.', 'dishes being washed!',
        ];
        await You_hear(sink_msg[rn2(2) + hallu]);
    }
    if (lf.has_court && !rn2(200)) {
        if (get_iter_mons(throne_mon_sound)) return;
    }
    if (lf.has_swamp && !rn2(200)) {
        rn2(2); // swamp_msg; C returns after; You1 deferred
        return;
    }
    if (lf.has_vault && !rn2(200)) {
        const sroom = search_special(VAULT);
        if (!sroom) {
            lf.has_vault = false;
            return;
        }
        // C: if (gd_sound()) switch (rn2(2) + hallu) { You_hear… }
        if (gd_sound()) {
            let which = rn2(2) + hallu;
            if (which === 1) {
                let gold_in_vault = false;
                for (let vx = sroom.lx | 0; vx <= (sroom.hx | 0); vx++) {
                    for (let vy = sroom.ly | 0; vy <= (sroom.hy | 0); vy++) {
                        if (gold_at(vx, vy)) gold_in_vault = true;
                    }
                }
                const rooms = game.level?.rooms || [];
                const roomId = rooms.indexOf(sroom) + ROOMOFFSET;
                if (vault_occupied(game.u?.urooms) !== roomId) {
                    if (gold_in_vault) {
                        await You_hear(!hallu
                            ? 'someone counting gold coins.'
                            : 'the quarterback calling the play.');
                    } else {
                        await You_hear('someone searching.');
                    }
                    return;
                }
                which = 0; // C FALLTHROUGH into case 0
            }
            if (which === 0) {
                await You_hear('the footsteps of a guard on patrol.');
            } else if (which === 2) {
                await You_hear('Ebenezer Scrooge!');
            }
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
            // C: You_hear1(shop_msg[rn2(2)+hallu]); noisy_shop(sroom)
            const shop_msg = [
                'someone cursing shoplifters.',
                'the chime of a cash register.',
                'Neiman and Marcus arguing!',
            ];
            await You_hear(shop_msg[rn2(2) + hallu]);
            await noisy_shop(sroom);
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

/** C ref: monflag.h enum ms_sounds — must match extractor msounds[]. */
const MS_SILENT = 0;
const MS_BARK = 1;
const MS_MEW = 2;
const MS_ROAR = 3;
const MS_BELLOW = 4;
const MS_GROWL = 5;
const MS_SQEEK = 6;
const MS_SQAWK = 7;
const MS_CHIRP = 8;
const MS_HISS = 9;
const MS_BUZZ = 10;
const MS_GRUNT = 11;
const MS_NEIGH = 12;
const MS_MOO = 13;
const MS_WAIL = 14;
const MS_ANIMAL = 17;
const MS_MUMBLE = 21;
const MS_SEDUCE = 31;
const MS_LEADER = 36;
const MS_GROAN = 44;

/**
 * C ref: sounds.c h_sounds[] — Hallucination verb pool (SIZE 35).
 * Used by growl / yelp / whimper ROLL_FROM.
 */
const H_SOUNDS = [
    'beep', 'boing', 'sing', 'belche', 'creak', 'cough',
    'rattle', 'ululate', 'pop', 'jingle', 'sniffle', 'tinkle',
    'eep', 'clatter', 'hum', 'sizzle', 'twitter', 'wheeze',
    'rustle', 'honk', 'lisp', 'yodel', 'coo', 'burp',
    'moo', 'boom', 'murmur', 'oink', 'quack', 'rumble',
    'twang', 'toot', 'gargle', 'hoot', 'warble',
];

/**
 * C ref: permonst.msound (monflag.h). Tables extract SIZ sound.
 * Stub data without msound still infers dog/feline/nymph.
 */
export function mon_msound(mtmp) {
    const ptr = mtmp?.data;
    if (!ptr) return 0;
    if (ptr.msound != null) return ptr.msound | 0;
    if (ptr.mlet === 'S_DOG') return MS_BARK;
    if (ptr.mlet === 'S_FELINE') return MS_MEW;
    if (ptr.mlet === 'S_NYMPH') return MS_SEDUCE;
    return 0;
}

/**
 * C ref: sounds.c cry_sound — gerund stem for hatch_egg mommy/daddy gag.
 * ptr.msound is C monflag.h via generated msounds[].
 */
export function cry_sound(mtmp) {
    const ptr = mtmp?.data;
    const ms = ptr?.msound | 0;
    switch (ms) {
    default:
    case MS_SILENT:
        return ptr?.mlet === 'S_EEL' ? 'gurgle' : 'chitter';
    case MS_HISS:
        return 'hiss';
    case MS_ROAR:
    case MS_GROWL:
        return 'growl';
    case MS_CHIRP:
        return 'chirp';
    case MS_BUZZ:
        return 'buzz';
    case MS_SQAWK:
        return 'screech';
    case MS_GRUNT:
        return 'grunt';
    case MS_MUMBLE:
        return 'mumble';
    }
}

/** C ref: mondata.h helpless — msleeping || !mcanmove. */
function helpless(mtmp) {
    return !!(mtmp?.msleeping || !mtmp?.mcanmove);
}

/**
 * C ref: sounds.c growl_sound — non-Hallu growl verb from msound.
 */
function growl_sound(mtmp) {
    switch (mon_msound(mtmp)) {
    case MS_MEW:
    case MS_HISS:
        return 'hiss';
    case MS_BARK:
    case MS_GROWL:
        return 'growl';
    case MS_ROAR:
        return 'roar';
    case MS_BELLOW:
        return 'bellow';
    case MS_BUZZ:
        return 'buzz';
    case MS_SQEEK:
        return 'squeal';
    case MS_SQAWK:
        return 'screech';
    case MS_NEIGH:
        return 'neigh';
    case MS_WAIL:
        return 'wail';
    case MS_GROAN:
        return 'groan';
    case MS_MOO:
        return 'low';
    case MS_SILENT:
        return 'commotion';
    default:
        return 'scream';
    }
}

/**
 * C ref: sounds.c growl — seriously abused pet (incl. hero attacking).
 * Hallucination → ROLL_FROM(h_sounds) rn2(35). Named omission:
 * iflags.last_msg PLNMSG_GROWL.
 */
export async function growl(mtmp) {
    if (!mtmp || helpless(mtmp) || mon_msound(mtmp) === MS_SILENT) return;
    let growl_verb = null;
    if (game.u?.Hallucination) {
        growl_verb = H_SOUNDS[rn2(H_SOUNDS.length)];
    } else {
        growl_verb = growl_sound(mtmp);
    }
    if (growl_verb) {
        const Deaf = !!(game.u?.Deaf || game.u?.HDeaf || game.u?.EDeaf);
        if (canseemon(mtmp) || !Deaf) {
            await pline(`${Monnam(mtmp)} ${vtense(null, growl_verb)}!`);
            if (game.context?.run) nomul(0);
        }
        // C: wake_nearto(mx, my, mlevel * 18) after growl pline
        if (mtmp.mx) {
            await wake_nearto(mtmp.mx, mtmp.my, (mtmp.data?.mlevel | 0) * 18);
        }
    }
}

/**
 * C ref: sounds.c whimper — leash-pull / mistreat soft pet sound.
 * Hallucination → ROLL_FROM(h_sounds). Named omit: Soundeffect; wake_msg.
 */
export async function whimper(mtmp) {
    if (!mtmp || helpless(mtmp) || mon_msound(mtmp) === MS_SILENT) return;
    let whimper_verb = null;
    if (game.u?.Hallucination) {
        whimper_verb = H_SOUNDS[rn2(H_SOUNDS.length)];
    } else {
        switch (mon_msound(mtmp)) {
        case MS_MEW:
        case MS_BARK:
            whimper_verb = 'whimper';
            break;
        case MS_ROAR:
            whimper_verb = 'whine';
            break;
        case MS_SQEEK:
            whimper_verb = 'squeal';
            break;
        default:
            break;
        }
    }
    if (whimper_verb) {
        await pline(`${Monnam(mtmp)} ${vtense(null, whimper_verb)}.`);
        if (game.context?.run) nomul(0);
        // C: wake_nearto(mx, my, mlevel * 6)
        if (mtmp.mx) {
            await wake_nearto(mtmp.mx, mtmp.my, (mtmp.data?.mlevel | 0) * 6);
        }
    }
}

/**
 * C ref: sounds.c yelp — mistreated pet sound.
 * Hallucination → ROLL_FROM(h_sounds) rn2(35). Named omissions:
 * Soundeffect; feline/canine se_* variants (pline only); wake_msg.
 */
export async function yelp(mtmp) {
    if (!mtmp || helpless(mtmp) || !mon_msound(mtmp)) return;
    let yelp_verb = null;
    const Deaf = !!(game.u?.Deaf || game.u?.HDeaf || game.u?.EDeaf);
    if (game.u?.Hallucination) {
        yelp_verb = H_SOUNDS[rn2(H_SOUNDS.length)];
    } else {
        switch (mon_msound(mtmp)) {
        case MS_MEW:
            yelp_verb = !Deaf ? 'yowl' : 'arch';
            break;
        case MS_BARK:
        case MS_GROWL:
            yelp_verb = !Deaf ? 'yelp' : 'recoil';
            break;
        case MS_ROAR:
            yelp_verb = !Deaf ? 'snarl' : 'bluff';
            break;
        case MS_SQEEK:
            yelp_verb = !Deaf ? 'squeal' : 'quiver';
            break;
        case MS_SQAWK:
            yelp_verb = !Deaf ? 'screak' : 'thrash';
            break;
        case MS_WAIL:
            yelp_verb = !Deaf ? 'wail' : 'cringe';
            break;
        default:
            break;
        }
    }
    if (yelp_verb) {
        await pline(`${Monnam(mtmp)} ${vtense(null, yelp_verb)}!`);
        if (game.context?.run) nomul(0);
        // C: wake_nearto(mx, my, mlevel * 12)
        if (mtmp.mx) {
            await wake_nearto(mtmp.mx, mtmp.my, (mtmp.data?.mlevel | 0) * 12);
        }
    }
}

/**
 * C ref: polyself.c poly_gender — 0/1 ≡ flags.female, 2=none.
 * Named omission: is_neuter non-humanoid → 2 (poly forms deferred).
 */
function poly_gender() {
    const u = game.u || {};
    return game.flags?.female ? 1 : 0;
}

/**
 * C ref: sounds.c domonnoise — MS_BARK + MS_SEDUCE + MS_LEADER.
 * Other MS_* named omitted in C-JS-MAP; unknown → ECMD_OK (silent).
 * FULL_MOON howl needs night() — deferred; falls through to bark.
 * MS_PRIEST priest_talk deferred (non-leader temple priests).
 * MS_SEDUCE doseduce (SYSOPT non-nymph) deferred.
 */
export async function domonnoise(mtmp) {
    if (!mtmp) return ECMD_OK;
    if (game.u?.Deaf) return ECMD_OK;
    let msound = mon_msound(mtmp);
    // C: leader_m_id && msound > MS_ANIMAL → MS_LEADER (poly-safe).
    const qs = game.quest_status;
    if (qs?.leader_m_id
        && (mtmp.m_id | 0) === (qs.leader_m_id | 0)
        && msound > MS_ANIMAL) {
        msound = MS_LEADER;
    }
    if (msound === 0 && !mtmp.isshk) return ECMD_OK;

    let pline_msg = null;
    let verbl_msg = null;
    const ptr = mtmp.data;
    const moves = game.moves | 0;
    const hungrytime = mtmp.edog?.hungrytime | 0;

    if (msound === MS_LEADER) {
        // C: MS_LEADER/NEMESIS/GUARDIAN → quest_chat; then ECMD_TIME
        const { quest_chat } = await import('./quest.js');
        await quest_chat(mtmp);
        return ECMD_TIME;
    }

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
    } else if (msound === MS_SEDUCE) {
        // C sounds.c MS_SEDUCE — nymph chat; doseduce non-nymph deferred.
        // SYSOPT_SEDUCE: opposite-gender rn2(3); else male-only rn2(3).
        // Same-gender / female under !SEDUCE → swval 0 → "cajoles you."
        let swval;
        const seduce = !!(game.sysopt?.seduce);
        if (seduce) {
            // could_seduce + doseduce for non-nymph deferred
            swval = (poly_gender() !== (mtmp.female | 0)) ? rn2(3) : 0;
        } else {
            swval = (poly_gender() === 0) ? rn2(3) : 0;
        }
        if (swval === 2) verbl_msg = 'Hello, sailor.';
        else if (swval === 1) pline_msg = 'comes on to you.';
        else pline_msg = 'cajoles you.';
    }
    // Other msound cases deferred

    if (verbl_msg) {
        await pline(`${Monnam(mtmp)} says: "${verbl_msg}"`);
        return ECMD_TIME;
    }
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
