// wizard.js — Wizard of Yendor harassment from wizard.c.
// C ref: wizard.c resurrect (new-Wizard makemon arm); aggravate; clonewiz;
//         choose_stairs (D-1733; also shk.c call_kops);
//         nasty / pick_nasty (pick_nasty lives in makemon.js for newcham).

import { game } from './gstate.js';
import { makemon, set_malign, pick_nasty, mpickobj } from './makemon.js';
import {
    mons, is_covetous, is_minion, M3_WANTSAMUL, M3_WANTSBELL, M3_WANTSBOOK,
    M3_WANTSCAND, M3_WANTSARTI,
} from './monsters.js';
import { monsterNames } from './generated/monsters_data.js';
import { ART_ORB_OF_DETECTION } from './generated/artifacts_data.js';
import { objectNames } from './objects.js';
import { add_to_minv, mksobj, obj_extract_self } from './mkobj.js';
import {
    MM_NOWAIT, MM_NOMSG, NO_MM_FLAGS, STRAT_WAITMASK, STRAT_WAITFORU,
    STRAT_APPEARMSG, STRAT_NONE, STRAT_HEAL, STRAT_PLAYER, STRAT_GROUND,
    STRAT_MONSTR, STRAT_STRATMASK, STRAT_GOAL, RLOC_MSG, In_endgame,
    M_AP_MONSTER, EMIN, BOLT_LIM, isok, u_at, Is_astralevel, MAGIC_PORTAL,
} from './const.js';
import { rndcurse } from './sit.js';
import { pline, verbalize, Norep, newsym, You_feel } from './display.js';
import { Monnam, hcolor } from './do_name.js';
import { distant_name, doname, Tobjnam } from './objnam.js';
import { rn1, rn2, rnd } from './rng.js';
import { noteleport_level, enexto, is_lminion, rloc, rloc_to } from './teleport.js';
import { mnexto, wake_nearto, mnearto, healmon, monnear, m_at } from './mon.js';
import { SetVoice } from './sndprocs.js';
import { com_pager } from './questpgr.js';
import { inhishop } from './shk.js';
import { inhistemple } from './priest.js';
import { In_W_tower } from './dungeon.js';
import { mon_has_amulet } from './apply.js';
import { expels } from './mhitu.js';
import { cansee } from './vision.js';
import { msummon, monster_census, Inhell } from './minion.js';
import { builds_up, dist2 } from './hacklib.js';
import { stairway_find_type_dir } from './mklev.js';

const AMULET_OF_YENDOR = objectNames.indexOf('AMULET_OF_YENDOR');
const BELL_OF_OPENING = objectNames.indexOf('BELL_OF_OPENING');
const CANDELABRUM_OF_INVOCATION = objectNames.indexOf('CANDELABRUM_OF_INVOCATION');
const SPE_BOOK_OF_THE_DEAD = objectNames.indexOf('SPE_BOOK_OF_THE_DEAD');
const PM_WIZARD_OF_YENDOR = monsterNames.indexOf('PM_WIZARD_OF_YENDOR');
const PM_ARCH_LICH = monsterNames.indexOf('PM_ARCH_LICH');
const PM_ARCHON = monsterNames.indexOf('PM_ARCHON');
// C ref: wizard.c wizapp[] — clonewiz disguise pool
const wizapp = [
    'PM_HUMAN', 'PM_WATER_DEMON', 'PM_VAMPIRE', 'PM_RED_DRAGON',
    'PM_TROLL', 'PM_UMBER_HULK', 'PM_XORN', 'PM_XAN',
    'PM_COCKATRICE', 'PM_FLOATING_EYE', 'PM_GUARDIAN_NAGA', 'PM_TRAPPER',
].map((n) => monsterNames.indexOf(n));
const AT_MAGC = 255; // monattk.h
const MAXNASTIES = 10;

function sgn(n) {
    return (n > 0) ? 1 : (n < 0) ? -1 : 0;
}

/** C ref: mondata.h attacktype — any mattk slot with aatyp. */
function attacktype(ptr, aatyp) {
    const slots = ptr?.mattk;
    if (!slots) return false;
    for (let i = 0; i < slots.length; i++) {
        if (slots[i]?.aatyp === aatyp) return true;
    }
    return false;
}

/**
 * C ref: wizard.c nasty — summon nasties aligned with caster (or neutral
 * when summoner is null / late-game harassment).
 * Envelope: Inhell `!rn2(10)` → msummon(null); else rnd(ulevel/3) outer ×
 * pick_nasty / enexto / makemon loop with difcap + demon↔angel reject.
 * Named omissions: full unmakemon (born/extinct/discard_minvent) — reject
 * path sets mhp=0 so census skips; rogue/juvenile polish is in pick_nasty.
 *
 * @param {object|null} summoner
 * @returns {Promise<number>} census delta (created count)
 */
export async function nasty(summoner) {
    const u = game.u || {};
    const mmflags = summoner ? MM_NOMSG : NO_MM_FLAGS;
    const census = monster_census(false);
    let count = 0;

    if (!rn2(10) && Inhell()) {
        // C: msummon((struct monst *) 0) — WoY-like demon help
        count = await msummon(null);
    } else {
        count = 0;
        const s_cls = summoner ? (summoner.data?.mlet || 0) : 0;
        let difcap = summoner ? (summoner.data?.difficulty | 0) : 0;
        const castalign = summoner ? sgn(summoner.data?.maligntyp | 0) : 0;
        let tmp = ((u.ulevel | 0) > 3) ? Math.trunc((u.ulevel | 0) / 3) : 1;
        const bypos = { x: u.ux | 0, y: u.uy | 0 };

        for (let i = rnd(tmp); i > 0 && count < MAXNASTIES; --i) {
            jloop: for (let j = 0; j < 20; j++) {
                let trylimit = 10 + 1;
                let makeindex;
                let m_cls;
                do {
                    if (!--trylimit) continue jloop; // C: goto nextj
                    makeindex = pick_nasty(difcap);
                    m_cls = mons(makeindex)?.mlet;
                } while ((difcap > 0
                        && (mons(makeindex)?.difficulty | 0) >= difcap
                        && attacktype(mons(makeindex), AT_MAGC))
                    || (s_cls === 'S_DEMON' && m_cls === 'S_ANGEL')
                    || (s_cls === 'S_ANGEL' && m_cls === 'S_DEMON'));

                if (summoner && !enexto(
                    bypos,
                    summoner.mux | 0,
                    summoner.muy | 0,
                    mons(makeindex),
                )) {
                    continue;
                }

                let mtmp = makemon(mons(makeindex), bypos.x, bypos.y, mmflags);
                if (mtmp) {
                    mtmp.msleeping = 0;
                    mtmp.mpeaceful = 0;
                    mtmp.mtame = 0;
                    set_malign(mtmp);
                } else {
                    // Random substitute for geno'd selection
                    mtmp = makemon(null, bypos.x, bypos.y, mmflags);
                    if (mtmp) {
                        m_cls = mtmp.data?.mlet;
                        if ((difcap > 0
                                && (mtmp.data?.difficulty | 0) >= difcap
                                && rn2(In_endgame(u.uz) ? 3 : 7)
                                && attacktype(mtmp.data, AT_MAGC))
                            || (s_cls === 'S_DEMON' && m_cls === 'S_ANGEL')
                            || (s_cls === 'S_ANGEL' && m_cls === 'S_DEMON')) {
                            // Named omission: unmakemon — mark dead for census
                            mtmp.mhp = 0;
                            mtmp = null;
                        }
                    }
                }

                if (mtmp) {
                    if (mtmp.data === mons(PM_ARCH_LICH)
                        || mtmp.data === mons(PM_ARCHON)) {
                        tmp = Math.min(
                            mons(PM_ARCHON)?.difficulty | 0,
                            mons(PM_ARCH_LICH)?.difficulty | 0,
                        );
                        if (!difcap || difcap > tmp) difcap = tmp;
                    }
                    mtmp.mspec_used = rnd(4);

                    if (++count >= MAXNASTIES
                        || (mtmp.data?.maligntyp | 0) === 0
                        || sgn(mtmp.data?.maligntyp | 0) === castalign) {
                        break;
                    }
                }
            } // for j
        } // for i
    }

    if (count) count = monster_census(false) - census;
    return count;
}

/**
 * C ref: wizard.c has_aggravatables :472–490 — are there any monsters mon
 * could aggravate? Caster and hero must share a W-tower side; then any
 * live same-side monster waiting for the hero or helpless counts.
 */
export function has_aggravatables(mon) {
    const u = game.u || {};
    const in_w_tower = In_W_tower(mon.mx, mon.my, u.uz);

    if (in_w_tower !== In_W_tower(u.ux, u.uy, u.uz)) return false;

    for (const mtmp of game.fmon || []) {
        if (!mtmp || (mtmp.mhp | 0) <= 0) continue; // C DEADMONSTER
        if (in_w_tower !== In_W_tower(mtmp.mx, mtmp.my, u.uz)) continue;
        // C you.h helpless: msleeping || !mcanmove
        if (((mtmp.mstrategy | 0) & STRAT_WAITFORU) !== 0
            || mtmp.msleeping || !(mtmp.mcanmove ?? 1)) {
            return true;
        }
    }
    return false;
}

/**
 * C ref: wizard.c aggravate :492–510 — wake/unfreeze monsters on the
 * hero's W-tower side.
 */
export function aggravate() {
    const u = game.u || {};
    const in_w_tower = In_W_tower(u.ux, u.uy, u.uz);

    for (const mtmp of game.fmon || []) {
        if (!mtmp || (mtmp.mhp | 0) <= 0) continue;
        if (in_w_tower !== In_W_tower(mtmp.mx, mtmp.my, u.uz)) continue;
        mtmp.mstrategy = (mtmp.mstrategy | 0)
            & ~(STRAT_WAITFORU | STRAT_APPEARMSG);
        mtmp.msleeping = 0;
        if (!mtmp.mcanmove && !rn2(5)) {
            mtmp.mfrozen = 0;
            mtmp.mcanmove = 1;
        }
    }
}

function Protection_from_shape_changers() {
    const u = game.u || {};
    return !!(u.HProtection_from_shape_changers
        || u.EProtection_from_shape_changers
        || u.Protection_from_shape_changers);
}

/** C ref: wizard.c clonewiz — Double Trouble; caller checks no_of_wizards==1. */
export function clonewiz() {
    const u = game.u || {};
    const mtmp2 = makemon(mons(PM_WIZARD_OF_YENDOR), u.ux, u.uy, MM_NOWAIT);
    if (mtmp2) {
        mtmp2.msleeping = mtmp2.mtame = mtmp2.mpeaceful = 0;
        if (!u.uhave?.amulet && rn2(2)) {
            const fake = objectNames.indexOf('FAKE_AMULET_OF_YENDOR');
            add_to_minv(mtmp2, mksobj(fake, true, false));
        }
        if (!Protection_from_shape_changers()) {
            mtmp2.m_ap_type = M_AP_MONSTER;
            mtmp2.mappearance = wizapp[rn2(wizapp.length)];
        }
        newsym(mtmp2.mx, mtmp2.my);
    }
}

/**
 * C ref: wizard.c which_arti `:141–157` — covetous mask to invocation
 * object type. Default 0 signifies the quest artifact (M3_WANTSARTI and
 * any combined mask fall here, as in C's switch).
 */
export function which_arti(mask) {
    switch (mask | 0) {
    case M3_WANTSAMUL:
        return AMULET_OF_YENDOR;
    case M3_WANTSBELL:
        return BELL_OF_OPENING;
    case M3_WANTSCAND:
        return CANDELABRUM_OF_INVOCATION;
    case M3_WANTSBOOK:
        return SPE_BOOK_OF_THE_DEAD;
    default:
        break; /* 0 signifies quest artifact */
    }
    return 0;
}

/**
 * C ref: wizard.c mon_has_arti `:164–177` — minvent holds otyp, or (otyp
 * 0) any quest artifact. obj.h any_quest_artifact: oartifact at or above
 * ART_ORB_OF_DETECTION.
 */
export function mon_has_arti(mtmp, otyp) {
    for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
        if (otyp) {
            if ((otmp.otyp | 0) === (otyp | 0)) return 1;
        } else if ((otmp.oartifact | 0) >= ART_ORB_OF_DETECTION) {
            return 1;
        }
    }
    return 0;
}

/**
 * C ref: wizard.c other_mon_has_arti `:183–195` — first other monster
 * holding otyp (or any quest artifact when otyp is 0), else null.
 * C walks fmon with no DEADMONSTER check (the dead carry nothing);
 * game.fmon is the JS array side of that list.
 */
export function other_mon_has_arti(mtmp, otyp) {
    for (const mtmp2 of game.fmon || []) {
        /* no need for !DEADMONSTER check here since they have no inventory */
        if (mtmp2 !== mtmp && mon_has_arti(mtmp2, otyp)) return mtmp2;
    }
    return null;
}

/**
 * C ref: wizard.c on_ground `:201–213` — first floor object of otyp,
 * or (otyp 0) of any quest artifact, else null. game.fobj is the JS
 * head of the floor chain.
 */
export function on_ground(otyp) {
    for (let otmp = game.fobj; otmp; otmp = otmp.nobj) {
        if (otyp) {
            if ((otmp.otyp | 0) === (otyp | 0)) return otmp;
        } else if ((otmp.oartifact | 0) >= ART_ORB_OF_DETECTION) {
            return otmp;
        }
    }
    return null;
}

/**
 * C ref: wizard.c wizdeadorgone `:813–822` — Wizard gone (killed or left
 * alive): drop the census count and, until demigod, set udemigod with a
 * rn1(250, 50) doom clock. Caller: mon.c mongone/mondead.
 */
export function wizdeadorgone() {
    if (!game.context) game.context = {};
    game.context.no_of_wizards = (game.context.no_of_wizards | 0) - 1;
    const u = game.u || {};
    if (!u.uevent) u.uevent = {};
    if (!u.uevent.udemigod) {
        u.uevent.udemigod = 1;
        u.udg_cnt = rn1(250, 50);
    }
}

/**
 * C ref: wizard.c you_have `:216–233` — hero holds the invocation target
 * for mask (C static; insight.c has an unrelated same-named macro).
 */
function you_have(mask) {
    switch (mask | 0) {
    case M3_WANTSAMUL:
        return !!game.u?.uhave?.amulet;
    case M3_WANTSBELL:
        return !!game.u?.uhave?.bell;
    case M3_WANTSCAND:
        return !!game.u?.uhave?.menorah;
    case M3_WANTSBOOK:
        return !!game.u?.uhave?.book;
    case M3_WANTSARTI:
        return !!game.u?.uhave?.questart;
    default:
        break;
    }
    return false;
}

/**
 * C ref: wizard.c target_on `:236–267` — covetous pursuit goal for mask
 * (C static): the `:139` M_Wants gate (mflags3 & mask) is inlined; hero
 * holds it → STRAT_PLAYER at the hero; on the ground → STRAT_GROUND;
 * another monster holds it → STRAT_MONSTR (Amulet skips the Wizard and
 * temple priests, to protect Moloch's high priest); else mgoal zeroed
 * + STRAT_NONE. mgoal is ensured here — makemon leaves it unset while
 * the C struct always carries it.
 */
function target_on(mask, mtmp) {
    if (!((mtmp.data?.mflags3 ?? 0) & (mask | 0))) {
        return STRAT_NONE;
    }
    const otyp = which_arti(mask);
    if (!mon_has_arti(mtmp, otyp)) {
        if (you_have(mask)) {
            if (!mtmp.mgoal) mtmp.mgoal = { x: 0, y: 0 };
            mtmp.mgoal.x = game.u?.ux | 0;
            mtmp.mgoal.y = game.u?.uy | 0;
            return STRAT_PLAYER | (mask | 0);
        }
        const otmp = on_ground(otyp);
        if (otmp) {
            if (!mtmp.mgoal) mtmp.mgoal = { x: 0, y: 0 };
            mtmp.mgoal.x = otmp.ox;
            mtmp.mgoal.y = otmp.oy;
            return STRAT_GROUND | (mask | 0);
        }
        const mtmp2 = other_mon_has_arti(mtmp, otyp);
        /* when seeking the Amulet, avoid targeting the Wizard
           or temple priests (to protect Moloch's high priest) */
        if (mtmp2
            && (otyp !== AMULET_OF_YENDOR
                || (!mtmp2.iswiz && !inhistemple(mtmp2)))) {
            if (!mtmp.mgoal) mtmp.mgoal = { x: 0, y: 0 };
            mtmp.mgoal.x = mtmp2.mx;
            mtmp.mgoal.y = mtmp2.my;
            return STRAT_MONSTR | (mask | 0);
        }
    }
    if (!mtmp.mgoal) mtmp.mgoal = { x: 0, y: 0 };
    mtmp.mgoal.x = mtmp.mgoal.y = 0;
    return STRAT_NONE;
}

/**
 * C ref: wizard.c strategy `:270–327` — HP band + covetous/shop/temple
 * gates, then target_on(M3_WANTS*) pursuit: the Amulet once made, then
 * ARTI→BOOK→BELL→CAND after the Invocation else BOOK→BELL→CAND→ARTI.
 * Bands 2–3 set dstrat (HEAL/NONE) and fall into the pursuit; band 1
 * falls through only for the Wizard of Yendor. Complete vs C.
 */
function strategy(mtmp) {
    if (!is_covetous(mtmp.data)
        /* perhaps a shopkeeper has been polymorphed into a master
           lich; we don't want it teleporting to the stairs to heal
           because that will leave its shop untended */
        || (mtmp.isshk && inhishop(mtmp))
        /* likewise for temple priests */
        || (mtmp.ispriest && inhistemple(mtmp))) {
        return STRAT_NONE;
    }
    const hpmax = mtmp.mhpmax | 0;
    const band = hpmax > 0 ? (((mtmp.mhp | 0) * 3) / hpmax) | 0 : 0;
    let dstrat;
    let strat;
    switch (band) {
    default:
    case 0: /* panic time - mtmp is almost snuffed */
        return STRAT_HEAL;
    case 1: /* the wiz is less cautious */
        if (mtmp.data !== mons(PM_WIZARD_OF_YENDOR)) {
            return STRAT_HEAL;
        }
        /* FALLTHRU */
        // falls through
    case 2:
        dstrat = STRAT_HEAL;
        break;
    case 3:
        dstrat = STRAT_NONE;
        break;
    }

    if (game.context?.made_amulet) {
        strat = target_on(M3_WANTSAMUL, mtmp);
        if (strat !== STRAT_NONE) return strat;
    }

    if (game.u?.uevent?.invoked) { /* priorities change once gate opened */
        strat = target_on(M3_WANTSARTI, mtmp);
        if (strat !== STRAT_NONE) return strat;
        strat = target_on(M3_WANTSBOOK, mtmp);
        if (strat !== STRAT_NONE) return strat;
        strat = target_on(M3_WANTSBELL, mtmp);
        if (strat !== STRAT_NONE) return strat;
        strat = target_on(M3_WANTSCAND, mtmp);
        if (strat !== STRAT_NONE) return strat;
    } else {
        strat = target_on(M3_WANTSBOOK, mtmp);
        if (strat !== STRAT_NONE) return strat;
        strat = target_on(M3_WANTSBELL, mtmp);
        if (strat !== STRAT_NONE) return strat;
        strat = target_on(M3_WANTSCAND, mtmp);
        if (strat !== STRAT_NONE) return strat;
        strat = target_on(M3_WANTSARTI, mtmp);
        if (strat !== STRAT_NONE) return strat;
    }
    return dstrat;
}

/**
 * C ref: wizard.c choose_stairs `:330–364` — pick stair/ladder coord for
 * Kops (call_kops) and covetous heal. Leaves sx,sy as-is when none found
 * (portal-only levels). dir True = forward, False = backtrack.
 */
export function choose_stairs(coord, dir) {
    const uz = game.u?.uz;
    const stdir = builds_up(uz) ? !!dir : !dir;
    let stway = stairway_find_type_dir(false, stdir);
    if (!stway) {
        stway = stairway_find_type_dir(true, stdir);
        if (!stway) {
            const dnum = uz?.dnum | 0;
            for (stway = game.stairs; stway; stway = stway.next) {
                if ((stway.tolev?.dnum | 0) !== dnum) break;
            }
            if (!stway) {
                stway = stairway_find_type_dir(false, !stdir);
                if (!stway) stway = stairway_find_type_dir(true, !stdir);
            }
        }
    }
    if (stway && coord) {
        coord.sx = stway.sx;
        coord.sy = stway.sy;
    }
}

/**
 * C ref: wizard.c tactics `:369–468` — covetous special move before
 * distfleeck. STRAT_HEAL holes up on/near the stairs (choose_stairs by
 * m_id parity), teleports out (W-tower rloc, stair mnearto with an
 * rloc_to fallback), casts healmon out of BOLT_LIM range, then
 * FALLTHROUGHs to the STRAT_NONE harass (rn2/mnexto) exactly as C does
 * (healmon returns 1 first). Default arm pursues mgoal: player-held →
 * mnearto beside the hero; ground → rloc_to + pickup (Monnam /
 * distant_name pline, obj_extract_self, mpickobj) or harass-if-occupied;
 * monster-held → mnearto beside it. No behavior delta where C is not
 * yet ported: every callee here is live (mnearto/mon_leaving_level in
 * mon.js, same SCC).
 */
export async function tactics(mtmp) {
    const u = game.u || {};
    const strat = strategy(mtmp);
    mtmp.mstrategy = ((mtmp.mstrategy | 0) & (STRAT_WAITMASK | STRAT_APPEARMSG))
        | strat;

    switch (strat) {
    case STRAT_HEAL: /* hide and recover */ {
        let mx = mtmp.mx, my = mtmp.my;

        if (u.uswallow && u.ustuck === mtmp) {
            await expels(mtmp, mtmp.data, true);
        }

        /* if wounded, hole up on or near the stairs (to block them) */
        const stair = { sx: 0, sy: 0 };
        choose_stairs(stair, ((mtmp.m_id | 0) % 2) !== 0);
        const sx = stair.sx | 0, sy = stair.sy | 0;
        mtmp.mavenge = 1; /* covetous monsters attack while fleeing */
        if (In_W_tower(mx, my, u.uz)
            || (mtmp.iswiz && !sx && !mon_has_amulet(mtmp))) {
            if (!noteleport_level(mtmp)
                && !rn2(3 + (((mtmp.mhp | 0) / 10) | 0))) {
                await rloc(mtmp, RLOC_MSG);
            }
        } else if (sx && (mx !== sx || my !== sy)) {
            if (!noteleport_level(mtmp)
                && !(await mnearto(mtmp, sx, sy, true, RLOC_MSG))) {
                /* couldn't move to the target spot for some reason,
                   so stay where we are (don't actually need rloc_to()
                   because mtmp is still on the map at <mx,my>... */
                await rloc_to(mtmp, mx, my);
                return 0;
            }
            mx = mtmp.mx, my = mtmp.my; /* update cached location */
        }
        /* if you're not around, cast healing spells */
        if (dist2(mx, my, u.ux, u.uy) > (BOLT_LIM * BOLT_LIM)) {
            if ((mtmp.mhp | 0) <= (mtmp.mhpmax | 0) - 8) {
                healmon(mtmp, rnd(8), 0);
                return 1;
            }
        }
        /*FALLTHRU*/
    }
    // falls through
    case STRAT_NONE: /* harass */
        if (!noteleport_level(mtmp) && !rn2(!mtmp.mflee ? 5 : 33)) {
            await mnexto(mtmp, RLOC_MSG);
        }
        return 0;
    default: /* kill, maim, pillage! */ {
        const where = strat & STRAT_STRATMASK;
        const tx = mtmp.mgoal?.x | 0, ty = mtmp.mgoal?.y | 0;
        const targ = strat & STRAT_GOAL;

        if (!targ || !isok(tx, ty)) { /* simply wants you to close */
            return 0;
        }
        if (noteleport_level(mtmp) && !monnear(mtmp, tx, ty)) {
            return 0;
        }
        if (u_at(tx, ty) || where === STRAT_PLAYER) {
            /* player is standing on it (or has it) */
            const mx = mtmp.mx, my = mtmp.my;
            if (noteleport_level(mtmp)
                || !(await mnearto(mtmp, tx, ty, false, RLOC_MSG))) {
                await rloc_to(mtmp, mx, my); /* no room? stay put */
            }
            return 0;
        }
        if (where === STRAT_GROUND) {
            /* MON_AT (rm.h grid read) is m_at under the port's grid
               discipline (heads on fmon, segs on _level_monsters;
               steed/dead/off-map absent from the C grid too — D-1565) */
            if (!m_at(tx, ty) || (mtmp.mx === tx && mtmp.my === ty)) {
                /* teleport to it and pick it up */
                await rloc_to(mtmp, tx, ty); /* clean old pos */

                const otmp = on_ground(which_arti(targ));
                if (otmp) {
                    if (cansee(mtmp.mx, mtmp.my)) {
                        await pline(`${Monnam(mtmp)} picks up ${distant_name(otmp, doname)}.`);
                    }
                    obj_extract_self(otmp);
                    mpickobj(mtmp, otmp);
                    return 1;
                }
                return 0;
            }
            /* a monster is standing on it - cause some trouble */
            if (!rn2(5) && !noteleport_level(mtmp)) {
                await mnexto(mtmp, RLOC_MSG);
            }
            return 0;
        }
        /* a monster has it - 'port beside it. */
        const mx = mtmp.mx, my = mtmp.my;
        if (!noteleport_level(mtmp)
            && !(await mnearto(mtmp, tx, ty, false, RLOC_MSG))) {
            await rloc_to(mtmp, mx, my); /* no room? stay put */
        }
        return 0;
    }
    }
    /*NOTREACHED*/
    return 0;
}

/**
 * C ref: wizard.c resurrect — confront hero with Wizard on endgame entry.
 * Envelope: no_of_wizards==0 → makemon(PM_WIZARD, ux,uy, MM_NOWAIT) +
 * mrevived; clear WAITMASK; hostile + set_malign; voice pline.
 * Named omissions: migrating-Wizard mon_arrive(Wiz_arrive) path when
 * no_of_wizards>0; SetVoice; Deaf-aware acoustics polish.
 */
export async function resurrect() {
    const u = game.u;
    if (!u) return;

    if (!game.context) game.context = {};
    let mtmp = null;
    let verb = 'kill';

    if (!(game.context.no_of_wizards | 0)) {
        // C: make a new Wizard
        verb = 'kill';
        mtmp = makemon(
            mons(PM_WIZARD_OF_YENDOR),
            u.ux | 0,
            u.uy | 0,
            MM_NOWAIT,
        );
        if (mtmp) mtmp.mrevived = 1;
    } else {
        // Migrating-Wizard search / mon_arrive(Wiz_arrive) deferred
        verb = 'elude';
        return;
    }

    if (mtmp) {
        mtmp.mstrategy = (mtmp.mstrategy | 0) & ~STRAT_WAITMASK;
        mtmp.mtame = 0;
        mtmp.mpeaceful = 0;
        set_malign(mtmp);
        // C: makemon !in_mklev !MM_NOMSG appear Norep (D-0559) — before voice.
        // Envelope: canseemon/sensemon + mimic arms deferred; Wizard is visible.
        {
            const ux = u.ux | 0;
            const uy = u.uy | 0;
            const dx = Math.abs((mtmp.mx | 0) - ux);
            const dy = Math.abs((mtmp.my | 0) - uy);
            const next2u = dx <= 1 && dy <= 1 && (dx || dy);
            const where = next2u ? ' next to you'
                : ((dx * dx + dy * dy) <= 64) ? ' close by' : '';
            await Norep(`${Monnam(mtmp)} suddenly appears${where}!`);
        }
        if (!u.Deaf) {
            await pline('A voice booms out...');
            await verbalize(`So thou thought thou couldst ${verb} me, fool.`);
        }
    }
}

/**
 * C ref: wizard.c random_insult `:824–833` — WoY cuss noun pool (28).
 * ROLL_FROM (`hack.h :1493`) picks `array[rn2(SIZE(array))]`; callers
 * use `.length` for the same bound.
 */
const random_insult = [
    'antic', 'blackguard', 'caitiff', 'chucklehead',
    'coistrel', 'craven', 'cretin', 'cur',
    'dastard', 'demon fodder', 'dimwit', 'dolt',
    'fool', 'footpad', 'imbecile', 'knave',
    'maledict', 'miscreant', 'niddering', 'poltroon',
    'rattlepate', 'reprobate', 'scapegrace', 'varlet',
    'villein', /* (sic.) */
    'wittol', 'worm', 'wretch',
];

/**
 * C ref: wizard.c random_malediction `:835–843` — WoY cuss opener pool
 * (11). Same ROLL_FROM bound convention as random_insult.
 */
const random_malediction = [
    'Hell shall soon claim thy remains,', 'I chortle at thee, thou pathetic',
    'Prepare to die, thou', 'Resistance is useless,',
    'Surrender or die, thou', 'There shall be no mercy, thou',
    'Thou shalt repent of thy cunning,', 'Thou art as a flea to me,',
    'Thou art doomed,', 'Thy fate is sealed,',
    'Verily, thou shalt be one dead',
];

/**
 * C ref: wizard.c cuss `:845–883` — insult/intimidate behind MS_CUSS
 * (`sounds.c :1146–1156`) and monmove retaliation. Deaf silence;
 * iswiz amulet/panic/parthian/malediction arms (clang L→R: the message
 * rn2 burns before the ROLL_FROM insult); co-aligned-minion angel
 * pager; minion-gated aspersions vs demon pager; always
 * wake_nearto(5*5). Async: pline/verbalize/com_pager/wake_nearto await.
 */
export async function cuss(mtmp) {
    const u = game.u || {};
    const Deaf = !!((u.HDeaf | 0) || (u.EDeaf | 0)
        || u.uroleplay?.deaf || u.Deaf);
    if (Deaf) {
        return;
    }
    if (mtmp.iswiz) {
        if (!rn2(5)) { /* typical bad guy action */
            await pline(`${Monnam(mtmp)} laughs fiendishly.`);
        } else if (u.uhave?.amulet && !rn2(random_insult.length)) {
            SetVoice(mtmp, 0, 80, 0);
            await verbalize(`Relinquish the amulet, ${random_insult[rn2(random_insult.length)]}!`);
        } else if ((u.uhp | 0) < 5 && !rn2(2)) { /* Panic */
            SetVoice(mtmp, 0, 80, 0);
            const ebbs = rn2(2);
            const insult = random_insult[rn2(random_insult.length)];
            await verbalize(ebbs
                ? `Even now thy life force ebbs, ${insult}!`
                : `Savor thy breath, ${insult}, it be thy last!`);
        } else if ((mtmp.mhp | 0) < 5 && !rn2(2)) { /* Parthian shot */
            SetVoice(mtmp, 0, 80, 0);
            await verbalize(rn2(2) ? 'I shall return.' : "I'll be back.");
        } else {
            SetVoice(mtmp, 0, 80, 0);
            await verbalize(`${random_malediction[rn2(random_malediction.length)]} ${random_insult[rn2(random_insult.length)]}!`);
        }
    } else if (is_lminion(mtmp)
        && !(mtmp.isminion && EMIN(mtmp)?.renegade)) {
        await com_pager('angel_cuss'); /* TODO: the Hallucination msg */
        /*com_pager(rn2(QTN_ANGELIC - 1 + (Hallucination ? 1 : 0))
          + QT_ANGELIC);*/
    } else {
        if (!rn2(is_minion(mtmp.data) ? 100 : 5)) {
            await pline(`${Monnam(mtmp)} casts aspersions on your ancestry.`);
        } else {
            await com_pager('demon_cuss');
        }
    }
    await wake_nearto(mtmp.mx, mtmp.my, 5 * 5);
}

// C ref: do_name.c NH_BLACK — hcolor pref, not an index.
const NH_BLACK = 'black';

/** C ref: youprop.h Blind ≡ (HBlinded || EBlinded) && !BBlinded (D-0716). */
function Blind() {
    const u = game.u || {};
    if (u.uroleplay?.blind) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}

/** C ref: you.h m_next2u — squared distu ≤ 2. */
function m_next2u(mtmp) {
    const u = game.u || {};
    const dx = (mtmp.mx | 0) - (u.ux | 0);
    const dy = (mtmp.my | 0) - (u.uy | 0);
    return dx * dx + dy * dy <= 2;
}

/**
 * C ref: wizard.c amulet `:61–103` — worn/wielded-Amulet portal hint plus
 * wake-the-Wizard. Branch/short-circuit order: the `!rn2(15)` hint roll
 * runs only when `uamul`/`uwep` holds the Amulet (clang L→R over the
 * `||`); the portal walk stops at the first MAGIC_PORTAL; the Wizard
 * scan skips DEADMONSTER and returns after the first sleeping Wizard
 * woken by `!rn2(40)`.
 */
export async function amulet() {
    const u = game.u || {};
    let amu = u.uamul;
    if (!amu || (amu.otyp | 0) !== AMULET_OF_YENDOR) {
        amu = u.uwep;
        if (!amu || (amu.otyp | 0) !== AMULET_OF_YENDOR) amu = null;
    }
    if (amu && !rn2(15)) {
        const traps = game.ftrap ?? game.level?.traps;
        const visit = async (ttmp) => {
            const du = dist2(u.ux | 0, u.uy | 0, ttmp.tx | 0, ttmp.ty | 0);
            if (du <= 9) await pline(`${Tobjnam(amu, 'feel')} hot!`);
            else if (du <= 64) await pline(`${Tobjnam(amu, 'feel')} very warm.`);
            else if (du <= 144) await pline(`${Tobjnam(amu, 'feel')} warm.`);
            /* else, the amulet feels normal */
        };
        if (Array.isArray(traps)) {
            for (const ttmp of traps) {
                if (!ttmp || (ttmp.ttyp | 0) !== MAGIC_PORTAL) continue;
                await visit(ttmp);
                break;
            }
        } else {
            for (let ttmp = traps; ttmp; ttmp = ttmp.ntrap) {
                if ((ttmp.ttyp | 0) !== MAGIC_PORTAL) continue;
                await visit(ttmp);
                break;
            }
        }
    }

    if (!(game.context?.no_of_wizards | 0)) return;
    /* find Wizard, and wake him if necessary */
    for (const mtmp of game.fmon || []) {
        if (!mtmp || (mtmp.mhp | 0) <= 0) continue; // DEADMONSTER
        if (mtmp.iswiz && mtmp.msleeping && !rn2(40)) {
            mtmp.msleeping = 0;
            if (!m_next2u(mtmp)) {
                await pline('You get the creepy feeling that somebody noticed your taking the Amulet.');
            }
            return;
        }
    }
}

/**
 * C ref: wizard.c intervene `:785–810` — udemigod harassment. `which` is
 * `rnd(4)` (1–4) on the Astral level so cases 0 and 5 never run there,
 * else `rn2(6)`. Case 2 paints the glow only when !Blind but always
 * runs rndcurse; case 4 summons with a null caster; case 5 resurrects.
 */
export async function intervene() {
    const u = game.u || {};
    const which = Is_astralevel(u.uz) ? rnd(4) : rn2(6);

    /* cases 0 and 5 don't apply on the Astral level */
    switch (which) {
    case 0:
    case 1:
        await You_feel('vaguely nervous.');
        break;
    case 2:
        if (!Blind()) {
            await pline(`You notice a ${hcolor(NH_BLACK)} glow surrounding you.`);
        }
        await rndcurse();
        break;
    case 3:
        aggravate();
        break;
    case 4:
        await nasty(null);
        break;
    case 5:
        await resurrect();
        break;
    }
}
