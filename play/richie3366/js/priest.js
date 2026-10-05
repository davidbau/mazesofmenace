// priest.js — Temple entry + priest location helpers (partial).
// C ref: priest.c temple_occupied / findpriest / has_shrine / intemple /
//   in_your_sanctuary / reset_hostility / priest_talk / inhistemple /
//   clearpriests (D-1812; priest.c :918–929; really_done).
// Named omissions: mapseen_temple; SetVoice pitch in intemple.

import { game } from './gstate.js';
import { rn2, rn1, d, rn2_on_display_rng } from './rng.js';
import {
    EPRI, EMIN, TEMPLE, ROOMOFFSET, SPINE, MM_NOMSG, IS_ALTAR, AM_SHRINE, AM_MASK,
    Amask2align, ACH_TMPL, In_endgame, Is_sanctum,
    CLAIRVOYANT, PROTECTION, FROMOUTSIDE, INTRINSIC, LL_CONDUCT,
    IS_DOOR, u_at, BZ_OFS_AD, BZ_M_SPELL,
    ARTICLE_NONE, ARTICLE_THE, ARTICLE_A, ARTICLE_YOUR,
    A_NONE, A_LAWFUL, A_CHAOTIC, A_NEUTRAL, Is_astralevel,
} from './const.js';
import { pline, You_feel, canseemon, canspotmon, verbalize, newsym, Hallucination, impossible } from './display.js';
import { makemon, set_malign, newemin } from './makemon.js';
import { mongone, wakeup, setmangry, m_next2u } from './mon.js';
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
import { Monnam, mon_nam, s_suffix, rndmonnam, mon_pmname, bogon_is_pname, Hallucination as do_name_Hallucination } from './do_name.js';
import { linedup } from './mthrowu.js';
import { buzz } from './zap.js';
import { just_an } from './objnam.js';
import { align_gname, roles } from './roles.js';
import { HALU_GODS } from './pray.js';
import { assign_level } from './do.js';
import { on_level } from './dungeon.js';

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

/**
 * C ref: priest.c forget_temple_entry `:545–555` — zero shrine chatter
 * timestamps. Leaving the level then returning yields a fresh start.
 * Callers: savemonchn (ordinary WRITING|FREEING leave), save_mtraits.
 * C skips this on cant_go_back FREEING (endgame/tutorial teardown).
 * @param {object} priest
 */
export function forget_temple_entry(priest) {
    const epri_p = priest?.ispriest ? EPRI(priest) : null;
    if (!epri_p) {
        /* C priest.c:550 — unreachable by construction: both C callers
         * (mkobj.c:2159 save_mtraits, save.c:893 savemonchn) and both JS
         * call sites (do.js savemonchn, lev_json.js serMon) guard with
         * ispriest. `void` keeps the sync signature (in-file precedent). */
        void impossible('attempting to manipulate shrine data for non-priest?');
        return;
    }
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
 * C ref: priest.c histemple_at `:153–158` — priest on shrine level inside
 * temple room. Canonical export (C home): shk.js pri_move and teleport.js
 * inhistemple are rewired here; their identical clones deleted.
 */
export function histemple_at(priest, x, y) {
    if (!priest || !priest.ispriest) return false;
    const epri = EPRI(priest);
    if (!epri) return false;
    const rooms = in_rooms(x, y, TEMPLE);
    if (!rooms || (rooms.charCodeAt(0) | 0) !== (epri.shroom | 0)) return false;
    // C priest.c:157 histemple_at — live on_level (js/dungeon.js).
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

/**
 * C ref: priest.c mon_aligntyp `:280–289` — ispriest ? EPRI shralign
 * : isminion ? EMIN min_align : data.maligntyp; A_NONE passthrough,
 * else sign → LAWFUL/CHAOTIC/NEUTRAL. Canonical export (C home):
 * replaces the insight.js, do_name.js (mon_aligntyp_nam) and
 * teleport.js (ex D-1110 cycle-avoidance) clones. C callers:
 * artifact.c:933 (artifact.js touch_artifact), insight.c:3277
 * (insight.js mstatusline), priest.c:364 (priestname, below),
 * priest.c:372 (p_coaligned, below),
 * monst.h:282 is_lminion (teleport.js clone).
 * JS `?? 0` guards: C derefs EPRI/EMIN directly (non-null when set).
 */
export function mon_aligntyp(mon) {
    const algn = mon?.ispriest ? (EPRI(mon)?.shralign ?? 0)
        : mon?.isminion ? (EMIN(mon)?.min_align ?? 0)
            : (mon?.data?.maligntyp ?? 0);
    if (algn === A_NONE) return A_NONE; /* negative but differs from chaotic */
    return (algn > 0) ? A_LAWFUL : (algn < 0) ? A_CHAOTIC : A_NEUTRAL;
}

/**
 * C ref: priest.c priestname `:302–367` — aligned priest / minion name
 * with `" of "` + `halu_gname(mon_aligntyp)`. Canonical export (C home):
 * replaces the do_name.js clone. Sole C caller do_name.c:898
 * (x_monnam; js/do_name.js) — wired via import.
 * Hallu reader is do_name's sticky-first `Hallucination` (aliased import),
 * not display's youprop reader: preserves the clone and honors x_monnam's
 * `EHalluc_resistance` suppression around the call.
 * `halu_gname` tail: sync mirror of the pray.js halu_gname Hallu arm
 * (C pray.c:2577–2619) — same draw sequence (`rn2_on_display_rng` role
 * loop + `rn2_on_display_rng(9)` slot over the shared HALU_GODS table);
 * the live halu_gname is async-only via unreachable impossible()s,
 * unwirable from the sync x_monnam path (`void impossible` precedent:
 * do_name.js `obj_pmname`, trap.js, rumors.js getrumor).
 * `m_next2u` is the live mon.js export (3×3 square, as the clone's
 * distmin≤1 inline); `pname` buffer returns become string returns.
 */
export function priestname(mon, article, reveal_high_priest) {
    const do_hallu = do_name_Hallucination();
    const mndx = mon?.data?.mndx ?? (mon?.mnum | 0);
    const aligned_priest = mndx === PM_ALIGNED_CLERIC;
    const high_priest = mndx === PM_HIGH_CLERIC;
    const whatcode = { c: '' };
    let what = do_hallu ? rndmonnam(whatcode) : mon_pmname(mon);

    if (!mon.ispriest && !mon.isminion) return what;

    if (mon.ispriest || aligned_priest || high_priest) {
        what = do_hallu ? 'poohbah' : (mon.female ? 'priestess' : 'priest');
    }

    let pname = '';
    if (article !== ARTICLE_NONE && (!do_hallu || !bogon_is_pname(whatcode.c))) {
        if (article === ARTICLE_YOUR || (article === ARTICLE_A && high_priest)) {
            article = ARTICLE_THE;
        }
        if (article === ARTICLE_THE) {
            pname = 'the ';
        } else if (what === 'Angel') {
            pname = 'an ';
        } else {
            pname = just_an(what);
        }
    }
    if (mon.minvis) {
        if (pname === 'a ') pname = 'an ';
        pname += 'invisible ';
    }
    if (mon.isminion && EMIN(mon)?.renegade) {
        if (pname === 'an ' && !mon.minvis) pname = 'a ';
        pname += 'renegade ';
    }

    if (mon.ispriest || aligned_priest) {
        if (high_priest) pname += do_hallu ? 'grand ' : 'high ';
    } else if (mon.mtame && what.toLowerCase() === 'angel') {
        pname += 'guardian ';
    }

    pname += what;
    if (do_hallu || !high_priest || reveal_high_priest
        || !Is_astralevel(game.u?.uz) || m_next2u(mon)
        || game.program_state?.gameover) {
        pname += ' of ';
        const algn = mon_aligntyp(mon); /* C: halu_gname(mon_aligntyp(mon)) arg */
        if (!do_hallu) {
            pname += align_gname(game.urole, algn);
        } else {
            /* C pray.c halu_gname Hallu arm — sync mirror, same draw order. */
            let which;
            do {
                which = rn2_on_display_rng(roles.length);
            } while (!roles[which]?.lgod);
            let gnam;
            switch (rn2_on_display_rng(9)) {
            case 0:
            case 1:
                gnam = roles[which].lgod;
                break;
            case 2:
            case 3:
                gnam = roles[which].ngod;
                break;
            case 4:
            case 5:
                gnam = roles[which].cgod;
                break;
            case 6:
            case 7:
                gnam = HALU_GODS[rn2_on_display_rng(HALU_GODS.length)];
                break;
            case 8:
                gnam = 'Moloch'; // C: static Moloch (pray.c:58)
                break;
            default:
                void impossible('rn2 broken in halu_gname?!?');
                break;
            }
            if (!gnam) {
                void impossible('No random god name?');
                gnam = 'your Friend the Computer'; // C: Paranoia fallback
            }
            if (gnam.charAt(0) === '_') gnam = gnam.slice(1);
            pname += gnam;
        }
    }
    return pname;
}

/**
 * C ref: priest.c p_coaligned `:370–373` — hero align equals
 * mon_aligntyp(priest). Canonical export (C home): the raw-shralign
 * compare skipped mon_aligntyp's isminion branch, A_NONE passthrough
 * and sign normalization; the mklev.js priestini clone is rewired here.
 * C callers: mon.c:3697/3699 (xkilled), mon.c:4298 (setmangry),
 * pray.c:1684, priest.c:270 (priestini), priest.c:474/477 (intemple),
 * priest.c:560 (priest_talk), priest.c:790 (in_your_sanctuary),
 * sounds.c:557/561 (maybe_gasp).
 */
export function p_coaligned(priest) {
    return (game.u?.ualign?.type | 0) === mon_aligntyp(priest);
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
 * C ref: priest.c free_epri `:28–37` — release priest shrine memory.
 * GC frees the struct; JS nulls the slot. ispriest cleared (C sets it
 * again even though the caller already did).
 * @param {object} mtmp
 */
export function free_epri(mtmp) {
    if (mtmp?.mextra && EPRI(mtmp)) {
        mtmp.mextra.epri = null;
    }
    if (mtmp) mtmp.ispriest = 0;
}

/** C: monattk.h AD_ELEC (local-const idiom, cf. mhitu.js AD_DREN). */
const AD_ELEC = 6;

/** C: hacklib.h sgn — mirrors mthrowu.js local. */
function sgn(n) {
    return n < 0 ? -1 : n > 0 ? 1 : 0;
}

/**
 * C ref: priest.c ghod_hitsu `:795–874` — god smites the hero for striking
 * a temple priest: pick a bolt origin (shrine, else a temple edge lined up
 * with the hero), speak one of three anger lines, then fire an unspecified-
 * monster lightning bolt and exercise WIS.
 * Callers: mon.c wakeup (priest in temple), uhitm.c hmon (priest struck).
 */
export async function ghod_hitsu(priest) {
    const u = game.u;
    if (!u) return;
    // C: int roomno = (int) temple_occupied(u.urooms) (room char code)
    const roomch = temple_occupied(u.urooms);
    if (!roomch || roomch === '\0' || !has_shrine(priest)) return;
    const epri = EPRI(priest);
    let ax = epri.shrpos.x | 0;
    let ay = epri.shrpos.y | 0;
    let x = ax;
    let y = ay;
    // C: svr.rooms[roomno - ROOMOFFSET] (bones.js charCodeAt idiom)
    const troom = game.level.rooms[(roomch.charCodeAt(0) | 0) - ROOMOFFSET];
    // C short-circuit: hero on the shrine square skips the first linedup
    if (u_at(x, y) || !linedup(u.ux, u.uy, x, y, 1)) {
        if (IS_DOOR(game.level.at(u.ux, u.uy)?.typ)) {
            if (u.ux === ((troom.lx | 0) - 1)) {
                x = troom.hx | 0;
                y = u.uy;
            } else if (u.ux === ((troom.hx | 0) + 1)) {
                x = troom.lx | 0;
                y = u.uy;
            } else if (u.uy === ((troom.ly | 0) - 1)) {
                x = u.ux;
                y = troom.hy | 0;
            } else if (u.uy === ((troom.hy | 0) + 1)) {
                x = u.ux;
                y = troom.ly | 0;
            }
        } else {
            switch (rn2(4)) {
            case 0:
                x = u.ux;
                y = troom.ly | 0;
                break;
            case 1:
                x = u.ux;
                y = troom.hy | 0;
                break;
            case 2:
                x = troom.lx | 0;
                y = u.uy;
                break;
            default:
                x = troom.hx | 0;
                y = u.uy;
                break;
            }
        }
        if (!linedup(u.ux, u.uy, x, y, 1)) return;
    }
    // C: pray.c extern (extern.h:2570); dynamic import avoids a
    // priest↔pray static cycle (imports.mjs CHECK; mon.js hot_pursuit idiom)
    const { a_gname_at } = await import('./pray.js');
    switch (rn2(3)) {
    case 0:
        await pline(`${a_gname_at(ax, ay)} roars in anger:  "Thou shalt suffer!"`);
        break;
    case 1:
        await pline(`${s_suffix(a_gname_at(ax, ay))} voice booms:  "How darest thou harm my servant!"`);
        break;
    default:
        await pline(`${a_gname_at(ax, ay)} roars:  "Thou dost profane my shrine!"`);
        break;
    }
    /* bolt of lightning cast by unspecified monster */
    const oldcurrwand = game.current_wand;
    game.current_wand = null;
    const oldbuzzer = game.buzzer;
    game.buzzer = null;
    try {
        await buzz(BZ_M_SPELL(BZ_OFS_AD(AD_ELEC)), 6, x, y,
            sgn(game._tbx || 0), sgn(game._tby || 0));
    } finally {
        game.buzzer = oldbuzzer;
        game.current_wand = oldcurrwand;
    }
    exercise(A_WIS, false);
}

/**
 * C ref: priest.c angry_priest `:876–911` — anger the priest of the
 * hero's current temple (wake + hostile), and when its shrine altar is
 * gone or converted, release it as a roaming minion keeping its old
 * shrine alignment (non-renegade).
 * Callers: dig.c pickaxe altar dig; pray.c conversion glow,
 * sacrifice_your_race stain/vanish arms.
 */
export async function angry_priest() {
    const priest = findpriest(temple_occupied(game.u?.urooms));
    if (!priest) return;
    const eprip = EPRI(priest);

    await wakeup(priest, false);
    await setmangry(priest, false);
    /*
     * If the altar has been destroyed or converted, let the
     * priest run loose.
     * (When it's just a conversion and there happens to be
     * a fresh corpse nearby, the priest ought to have an
     * opportunity to try converting it back; maybe someday...)
     */
    const lev = game.level?.at(eprip?.shrpos?.x | 0, eprip?.shrpos?.y | 0);
    if (!lev || !IS_ALTAR(lev.typ)
        || (Amask2align((lev.altarmask | 0) & AM_MASK) | 0) !== (eprip?.shralign | 0)) {
        if (!EMIN(priest)) newemin(priest);
        priest.ispriest = 0; /* now a roaming minion */
        priest.isminion = 1;
        EMIN(priest).min_align = eprip?.shralign;
        EMIN(priest).renegade = false;
        /* discard priest's memory of his former shrine;
           if we ever implement the re-conversion mentioned
           above, this will need to be removed */
        free_epri(priest);
    }
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
 * C ref: priest.c intemple `:410–538` — enter TEMPLE room (from
 * check_special_room). Whole (SetVoice `:467` kept as a C-order no-op).
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
        // C `:430–432` — mons() allocates fresh, so mndx/mnum only (never ===).
        const sanctum = (priest.mnum | 0) === PM_HIGH_CLERIC
            && (Is_sanctum(u.uz) || In_endgame(u.uz));
        const can_speak = !helpless(priest);
        const Deaf = !!((u.HDeaf | 0) || (u.EDeaf | 0) || u.uroleplay?.deaf); // C youprop.h:125 (u.Deaf flat unwritten)
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
        if (sanctum && Is_sanctum(u.uz)) { // C `:452`
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
            // C `:467` — SetVoice is a !SND_LIB no-op (sndprocs.h);
            // the call is kept for C order (cf. prisoner_speaks).
            SetVoice(priest, 0, 80, 0);
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
        // C priest.c:500 — flag the valley/sanctum overview node once
        // the temple priest is met (priest arg UNUSED in C).
        const { mapseen_temple } = await import('./dungeon.js');
        mapseen_temple(priest);
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
        // C priest.c:926 clearpriests — live on_level (js/dungeon.js).
        if (mtmp.ispriest && !on_level(EPRI(mtmp)?.shrlevel, u.uz)) {
            await mongone(mtmp);
        }
    }
}

/**
 * C ref: priest.c restpriest `:933–939` — ghostly bones priest keeps the
 * current level as its shrine level. C caller restore.c:449 (binary
 * save/restore, by-design — no live JS caller; live export for wiring).
 * `assign_level` is the live do.js export; the `shrlevel` guard is
 * JS-null-safety (C derefs EPRI directly on ispriest mons).
 */
export function restpriest(mtmp, ghostly) {
    const uz = game.u?.uz;
    if ((uz?.dlevel | 0)) {
        if (ghostly) {
            const shrlevel = EPRI(mtmp)?.shrlevel;
            if (shrlevel) assign_level(shrlevel, uz);
        }
    }
}
