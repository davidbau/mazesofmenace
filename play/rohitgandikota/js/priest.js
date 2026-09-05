// priest.js — temple priests.
// C ref: src/priest.c
//
// Temple creation, entry, movement, chat, donations, roaming minions, and
// anger are implemented here.

import { ATTKS } from './monst_data.js';
import { BZ_OFS_AD } from './const.js';
import { IS_DOOR } from './const.js';
import { u_at } from './const.js';
import { EPRI } from './const.js';
import { sgn } from './hacklib.js';
import { s_suffix } from './hacklib.js';
import { buzz } from './zap.js';
import { linedup } from './mthrowu.js';
import { a_gname_at, halu_gname } from './pray.js';
import { game } from './gstate.js';
import { rn2, rn1, d } from './rng.js';
import { makemon, remove_monster, place_monster,
         set_malign, mongets } from './makemon.js';
import { ONAMES } from './objects_data.js';
import { mpickobj } from './steal.js';
import { mkobj, curse, SPBOOK_no_NOVEL, splitobj } from './mkobj.js';
import { pm_good_location } from './sp_lev.js';
import { PMNAMES, MMFLAGS } from './monst_data.js';
import { ROOMOFFSET, W_ARMC, IS_ROOM, NOTONL, ALLOW_M,
         ALLOW_ROCK, SPINE, AM_MASK, AM_SHRINE, IS_ALTAR,
         In_endgame, A_WIS, FROMOUTSIDE, INTRINSIC, OBJ_FREE,
         PRONOUN_HALLU, TEMPLE, TIMEOUT } from './const.js';
import { mfndpos, mon_allowflags, m_at, setmangry, wakeup, m_next2u } from './mon.js';
import { monnear, m_canseeu, histemple_at, inhishop,
         inhistemple } from './monmove.js';
import { dist2, online2 } from './hacklib.js';
import { newsym, canseemon, canspotmon, pline } from './display.js';
import { Invis, Deaf, Hallucination } from './youprop.js';
import { You, You_feel } from './pline.js';
import { Monnam, mon_nam, mon_pmname, rndmonnam, bogon_is_pname } from './do_name.js';
import { just_an } from './objnam.js';
import { ARTICLE_NONE, ARTICLE_A, ARTICLE_THE, ARTICLE_YOUR,
         Is_astralevel, A_NONE, A_LAWFUL, A_CHAOTIC, A_NEUTRAL } from './const.js';
import { helpless } from './monst.js';
import { adjalign, exercise } from './attrib.js';
import { in_rooms } from './hack.js';
import { pronoun_gender } from './mondata.js';
import { genders } from './role_data.js';

const xdir = [-1, -1, 0, 1, 1, 1, 0, -1];
const ydir = [0, -1, -1, -1, 0, 1, 1, 1];

function note_unported_priest(what) {
    (game.unported ||= new Set()).add('priest:' + what);
}

// src/priest.c:219 priestini() — exclusively for mktemple()/shrine altars.
export function priestini(lvl, sroom, sx, sy, sanctum) {
    game.p_coaligned = p_coaligned;
    const si = rn2(8);
    const prim = game.mons[sanctum ? PMNAMES.PM_HIGH_CLERIC
                                   : PMNAMES.PM_ALIGNED_CLERIC];
    let px = 0, py = 0, i;
    for (i = 0; i < 8; i++) {
        const k = (i + si) & 7;      /* DIR_CLAMP */
        px = sx + xdir[k];
        py = sy + ydir[k];
        if (pm_good_location(px, py, prim))
            break;
    }
    if (i === 8) {
        px = sx;
        py = sy;
    }

    const squatter = game.level?.monAt?.get(`${px},${py}`);
    if (squatter)
        note_unported_priest('priestini:rloc squatter');

    const priest = makemon(prim, px, py, MMFLAGS.MM_EPRI);
    if (priest) {
        priest.epri = {
            shroom: ((sroom.roomnoidx ?? game.level.rooms.indexOf(sroom))
                     + ROOMOFFSET),
            shralign: Amask2align(game.level.at(sx, sy)?.altarmask ?? 0),
            shrpos: { x: sx, y: sy },
            shrlevel: { dnum: lvl.dnum, dlevel: lvl.dlevel },
        };
        priest.ispriest = 1;
        priest.isminion = 0;
        priest.mpeaceful = 1;
        priest.msleeping = 0;
        /* mon_learns_traps, set_malign: state only */

        /* now his/her goodies... src/priest.c:260 — the high priest of
           Moloch carries the real Amulet, but only on the sanctum level
           itself (fake towers pass sanctum=FALSE) */
        {
            const sl = game.special_levels?.sanctum_level;
            if (sanctum && priest.epri.shralign === 0
                && sl && game.u.uz.dnum === sl.dnum
                && game.u.uz.dlevel === sl.dlevel)
                mongets(priest, ONAMES.AMULET_OF_YENDOR);
        }
        /* 2 to 4 spellbooks */
        for (let cnt = rn1(3, 2); cnt > 0; --cnt)
            mpickobj(priest, mkobj(SPBOOK_no_NOVEL, false));
        /* robe [via makemon()] */
        if (rn2(2)) {
            const robe = (priest.minvent || [])
                .find(o => (o.owornmask ?? 0) & W_ARMC);
            if (robe)
                curse(robe);   /* Moloch's priest is never co-aligned */
        }
    }
}

/* include/align.h Amask2align() */
function Amask2align(amask) {
    const AM_LAWFUL = 4, AM_NEUTRAL = 2, AM_CHAOTIC = 1;
    return (amask & AM_LAWFUL) ? 1 : (amask & AM_NEUTRAL) ? 0
         : (amask & AM_CHAOTIC) ? -1 : 0 /* A_NONE-ish */;
}

// src/priest.c:280 mon_aligntyp(); special alignments override the species.
export function mon_aligntyp(mon) {
    const alignment = mon.ispriest
        ? (mon.epri || mon.mextra.epri).shralign
        : mon.isminion ? (mon.emin || mon.mextra.emin).min_align : mon.data.maligntyp;
    return alignment === A_NONE ? A_NONE
        : alignment > 0 ? A_LAWFUL : alignment < 0 ? A_CHAOTIC : A_NEUTRAL;
}

// src/priest.c:302 priestname(); priests, roaming clerics and aligned minions.
export function priestname(mon, article, reveal_high_priest) {
    const do_hallu = Hallucination();
    const aligned_priest = mon.data === game.mons[PMNAMES.PM_ALIGNED_CLERIC];
    const high_priest = mon.data === game.mons[PMNAMES.PM_HIGH_CLERIC];
    const whatcode = { code: '' };
    let what = do_hallu ? rndmonnam(whatcode) : mon_pmname(mon);
    if (!mon.ispriest && !mon.isminion)
        return what;
    if (mon.ispriest || aligned_priest || high_priest)
        what = do_hallu ? 'poohbah' : mon.female ? 'priestess' : 'priest';
    let name = '';
    if (article !== ARTICLE_NONE && (!do_hallu || !bogon_is_pname(whatcode.code))) {
        if (article === ARTICLE_YOUR || (article === ARTICLE_A && high_priest))
            article = ARTICLE_THE;
        name = article === ARTICLE_THE ? 'the ' : what === 'Angel' ? 'an ' : just_an(what);
    }
    if (mon.minvis) {
        if (name === 'a ')
            name = 'an ';
        name += 'invisible ';
    }
    if (mon.isminion && (mon.emin || mon.mextra.emin).renegade) {
        if (name === 'an ' && !mon.minvis)
            name = 'a ';
        name += 'renegade ';
    }
    if (mon.ispriest || aligned_priest) {
        if (high_priest)
            name += do_hallu ? 'grand ' : 'high ';
    } else if (mon.mtame && what.toLowerCase() === 'angel') {
        name += 'guardian ';
    }
    name += what;
    if (do_hallu || !high_priest || reveal_high_priest
        || !Is_astralevel(game.u.uz) || m_next2u(mon) || game.program_state_gameover)
        name += ' of ' + halu_gname(mon_aligntyp(mon));
    return name;
}

// src/priest.c:382 p_coaligned() and :388 has_shrine().
export function p_coaligned(priest) {
    return game.u.ualign.type === mon_aligntyp(priest);
}

function has_shrine(priest) {
    const epri = priest?.epri;
    if (!priest?.ispriest || !epri)
        return false;
    const lev = game.level.at(epri.shrpos.x, epri.shrpos.y);
    return !!lev && IS_ALTAR(lev.typ) && !!(lev.altarmask & AM_SHRINE)
           && epri.shralign === Amask2align(lev.altarmask & ~AM_SHRINE);
}

async function money2u(mon, amount) {
    const { addinv } = await import('./invent.js');
    const minvent = mon.minvent || [];
    const gold = minvent.find(obj => obj.otyp === ONAMES.GOLD_PIECE);
    if (!gold || amount <= 0 || gold.quan < amount)
        return;

    const paid = gold.quan > amount ? splitobj(gold, amount) : gold;
    if (paid === gold)
        minvent.splice(minvent.indexOf(gold), 1);
    paid.where = OBJ_FREE;
    paid.ocarry = null;
    await addinv(paid);
    (game.disp ||= {}).botl = true;
}

async function money2mon(mon, amount) {
    const { freeinv } = await import('./invent.js');
    const gold = (game.invent || [])
        .find(obj => obj.otyp === ONAMES.GOLD_PIECE);
    if (!gold || amount <= 0 || gold.quan < amount)
        return 0;

    const paid = gold.quan > amount ? splitobj(gold, amount) : gold;
    freeinv(paid);
    paid.where = OBJ_FREE;
    paid.ocarry = null;
    mpickobj(mon, paid);
    (game.disp ||= {}).botl = true;
    return amount;
}

async function bribe(mon, prompt) {
    const [{ getlin }, { currency, money_cnt }]
        = await Promise.all([import('./cmd.js'), import('./invent.js')]);
    const umoney = money_cnt(game.invent || []);
    let offer = Number.parseInt(await getlin(prompt), 10);
    if (!Number.isFinite(offer))
        offer = 0;

    if (offer < 0) {
        await You(`try to shortchange ${mon_nam(mon)}, but fumble.`);
        return 0;
    }
    if (offer === 0) {
        await You('refuse.');
        return 0;
    }
    if (offer >= umoney) {
        await You(`give ${mon_nam(mon)} all your gold.`);
        offer = umoney;
    } else {
        await You(`give ${mon_nam(mon)} ${offer} ${currency(offer)}.`);
    }
    await money2mon(mon, offer);
    (game.disp ||= {}).botl = true;
    return offer;
}

function incr_intrinsic_timeout(name, increment) {
    const intrinsic = (game.u.intrinsic ||= {});
    const old = intrinsic[name] || 0;
    const timeout = Math.min(TIMEOUT,
                             (old & TIMEOUT) + Math.max(0, increment));
    intrinsic[name] = (old & ~TIMEOUT) | timeout;
}

// src/priest.c:558 priest_talk(), including ordinary temple donations.
export async function priest_talk(priest) {
    const { currency, money_cnt } = await import('./invent.js');
    const coaligned = p_coaligned(priest);
    const strayed = game.u.ualign.record < 0;
    const epri = priest.epri || null;

    game.u.uconduct ||= {};
    game.u.uconduct.gnostic = (game.u.uconduct.gnostic || 0) + 1;

    if (priest.mflee || (!priest.ispriest && coaligned && strayed)) {
        await pline(`${Monnam(priest)} doesn't want anything to do with you!`);
        priest.mpeaceful = 0;
        return;
    }

    if (!inhistemple(priest) || !priest.mpeaceful || helpless(priest)) {
        const cranky = [
            "Thou wouldst have words, eh?  I'll give thee a word or two!",
            'Talk?  Here is what I have to say!',
            'Pilgrim, I would speak no longer with thee.',
        ];
        if (helpless(priest)) {
            const his = genders[pronoun_gender(priest, PRONOUN_HALLU)].his;
            await pline(`${Monnam(priest)} breaks out of ${his} reverie!`);
            priest.mfrozen = 0;
            priest.msleeping = 0;
            priest.mcanmove = 1;
        }
        priest.mpeaceful = 0;
        await pline(`"${cranky[rn2(3)]}"`);
        return;
    }

    if (priest.mpeaceful
        && in_rooms(priest.mx, priest.my, TEMPLE)
        && !has_shrine(priest)) {
        await pline('"Begone!  Thou desecratest this holy place with thy presence."');
        priest.mpeaceful = 0;
        return;
    }

    if (!money_cnt(game.invent || [])) {
        if (coaligned && !strayed) {
            const pmoney = money_cnt(priest.minvent || []);
            if (pmoney > 0) {
                const bits = Hallucination() ? currency(pmoney)
                           : pmoney === 1 ? 'bit' : 'bits';
                await pline(`${Monnam(priest)} gives you ${
                    pmoney === 1 ? 'one ' : 'two '}${bits} for an ale.`);
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

    const cheapskate = epri?.cheapskate_count || 0;
    const suggested = (game.u.ulevelpeak || 1)
        * rn1(101, 150 + cheapskate * 40);
    const money = money_cnt(game.invent || []);
    const quan = Math.max(1, Math.trunc(money / (suggested * 3)));
    const prompt = `How much will you offer (suggested: ${
        suggested * quan} or ${suggested * quan * 2})?`;

    await pline(game.wizard
        ? `${Monnam(priest)} asks you for a contribution for the temple (base ${suggested}).`
        : `${Monnam(priest)} asks you for a contribution for the temple.`);
    const offer = await bribe(priest, prompt);

    if (offer === 0) {
        await pline('"Thou shalt regret thine action!"');
        if (coaligned)
            adjalign(-1);
        if (epri)
            epri.cheapskate_count = cheapskate + 1;
    } else if (offer < suggested * quan) {
        if (money_cnt(game.invent || []) > offer * 2) {
            await pline('"Cheapskate."');
            if (epri)
                epri.cheapskate_count = cheapskate + 1;
        } else {
            await pline('"I thank thee for thy contribution."');
            exercise(A_WIS, true);
        }
    } else if (offer < suggested * quan * 2) {
        await pline('"Thou art indeed a pious individual."');
        if (money_cnt(game.invent || []) < offer * 2
            && coaligned && game.u.ualign.record <= -4)
            adjalign(1);
        await pline('"I bestow upon thee a blessing."');
        const base = Math.trunc(500 * offer / suggested);
        incr_intrinsic_timeout('HClairvoyant', rn1(base, base));
    } else if (offer < suggested * quan * 3) {
        const intrinsic = (game.u.intrinsic ||= {});
        let original = game.u.ublessed || 0;
        if (!((intrinsic.HProtection || 0) & INTRINSIC)) {
            intrinsic.HProtection = (intrinsic.HProtection || 0)
                | FROMOUTSIDE;
            original = -1;
        }
        for (let reward = offer; reward >= 2 * suggested;
             reward -= 2 * suggested) {
            if (!game.u.ublessed)
                game.u.ublessed = rn1(3, 2);
            else if (game.u.ublessed < 20
                     && (game.u.ublessed < 9 || !rn2(game.u.ublessed)))
                game.u.ublessed++;
        }
        await pline(game.u.ublessed > original
            ? '"Thou hast been rewarded for thy devotion."'
            : '"Thy selfless generosity is deeply appreciated."');
    } else {
        await pline('"Thy selfless generosity is deeply appreciated."');
        if (money_cnt(game.invent || []) < offer * 2 && coaligned) {
            if (strayed && (game.moves - (game.u.ucleansed || 0)) > 5000) {
                game.u.ualign.record = 0;
                game.u.ucleansed = game.moves;
            } else {
                adjalign(2);
            }
        }
    }
}

// src/priest.c:414 intemple(), temple entry feedback.
export async function intemple(roomno) {
    game.p_coaligned = p_coaligned;
    /* Re-entering while already touching the temple does nothing. */
    for (const ch of game.u.urooms0 || '') {
        if (game.level?.rooms?.[ch.charCodeAt(0) - ROOMOFFSET]?.rtype === 10)
            return;
    }

    const priest = (game.level?.monsters || []).find(mtmp =>
        mtmp.mhp > 0 && mtmp.ispriest && mtmp.epri?.shroom === roomno
        && histemple_at(mtmp, mtmp.mx, mtmp.my));
    if (priest) {
        const epri = priest.epri;
        const shrined = has_shrine(priest);
        const sanctumLevel = game.special_levels?.sanctum_level;
        const isSanctum = !!sanctumLevel
            && game.u.uz.dnum === sanctumLevel.dnum
            && game.u.uz.dlevel === sanctumLevel.dlevel;
        const sanctum = priest.mnum === PMNAMES.PM_HIGH_CLERIC
                        && (isSanctum || In_endgame(game.u.uz));
        const canSpeak = !helpless(priest);

        if (canSpeak && !Deaf()
            && game.moves >= (epri.intone_time ?? 0)) {
            const savePriest = priest.ispriest;
            if (sanctum && !Hallucination())
                priest.ispriest = 0;
            await pline(`${canseemon(priest) ? Monnam(priest)
                                              : 'A nearby voice'} intones:`);
            priest.ispriest = savePriest;
            epri.intone_time = game.moves + d(10, 500);
            epri.enter_time = 0;
        }

        let msg1 = null, msg2 = null;
        if (sanctum && isSanctum) {
            if (priest.mpeaceful) {
                msg1 = "Infidel, you have entered Moloch's Sanctum!";
                msg2 = 'Be gone!';
                priest.mpeaceful = 0;
                set_malign(priest);
            } else {
                msg1 = 'You desecrate this place by your presence!';
            }
        } else if (game.moves >= (epri.enter_time ?? 0)) {
            msg1 = `Pilgrim, you enter a ${shrined ? 'sacred'
                                                   : 'desecrated'} place!`;
        }
        if (msg1 && canSpeak && !Deaf()) {
            await pline(`"${msg1}"`);
            if (msg2)
                await pline(`"${msg2}"`);
            epri.enter_time = game.moves + d(10, 100);
        }

        if (!sanctum) {
            let line, timeKey, otherKey;
            if (!shrined || !p_coaligned(priest)
                || game.u.ualign.record <= -4) {
                line = `have a${(!shrined || !p_coaligned(priest))
                    ? '' : ' strange'} forbidding feeling...`;
                timeKey = 'hostile_time';
                otherKey = 'peaceful_time';
            } else {
                line = `experience ${game.u.ualign.record >= 14
                    ? 'a' : 'an unusual'} sense of peace.`;
                timeKey = 'peaceful_time';
                otherKey = 'hostile_time';
            }
            const thisTime = epri[timeKey] ?? 0;
            const otherTime = epri[otherKey] ?? 0;
            if (game.moves >= thisTime || otherTime >= thisTime) {
                await You(line);
                epri[timeKey] = game.moves + d(10, 20);
                if (epri[timeKey] <= otherTime)
                    epri[otherKey] = epri[timeKey] - 1;
            }
        }
        return;
    }

    switch (rn2(4)) {
    case 0:
        await You('have an eerie feeling...');
        break;
    case 1:
        await You_feel('like you are being watched.');
        break;
    case 2: {
        const { body_part } = await import('./polyself.js');
        await pline(`A shiver runs down your ${body_part(SPINE)}.`);
        break;
    }
    default:
        break;
    }

    if (!rn2(5)) {
        const ghost = await makemon(game.mons[PMNAMES.PM_GHOST], game.u.ux,
                              game.u.uy, MMFLAGS.MM_NOMSG);
        if (ghost) {
            const ngen = game.mvitals?.[PMNAMES.PM_GHOST]?.born ?? 0;
            if (canspotmon(ghost))
                await pline(`A${ngen < 5 ? 'n enormous' : ''} ghost appears next to you${ngen < 10 ? '!' : '.'}`);
            else
                await You('sense a presence close by!');
            ghost.mpeaceful = 0;
            set_malign(ghost);
            if (game.flags?.verbose !== false)
                await You('are frightened to death, and unable to move.');
            const { nomul } = await import('./hack.js');
            nomul(-3);
            game.multi_reason = 'being terrified of a ghost';
            game.nomovemsg = 'You regain your composure.';
        }
    }
}

/* ------------------------------------------------------------------ *
 * Movement: move_special() serves shopkeepers and priests (and C's
 * vault guards go through their own gd_move).
 * ------------------------------------------------------------------ */

// src/priest.c:42 move_special() — the constrained walk shopkeepers and
// priests use: head for a goal square, stay on ROOM squares, optionally
// avoid standing on a line with the hero.
export async function move_special(mtmp, in_his_shop, appr, uondoor, avoid,
                                   omx, omy, ggx, ggy) {
    let nix, niy;
    let chcnt, cnt;
    const mfp = {};
    let ninfo = 0;

    if (omx === ggx && omy === ggy)
        return 0;
    if (mtmp.mconf) {
        avoid = false;
        appr = 0;
    }

    nix = omx;
    niy = omy;
    const allowflags = mon_allowflags(mtmp);
    cnt = mfndpos(mtmp, mfp, allowflags);

    let pick = true;
    if (mtmp.isshk && avoid && uondoor) { /* perhaps we cannot avoid him */
        pick = false;
        for (let i = 0; i < cnt; i++)
            if (!(mfp.info[i] & NOTONL)) {
                pick = true;
                break;
            }
        if (!pick) {
            avoid = false;
            pick = true;
        }
    }

    const GDIST = (x, y) => dist2(x, y, ggx, ggy);
    for (;;) {
        chcnt = 0;
        for (let i = 0; i < cnt; i++) {
            const nx = mfp.poss[i].x;
            const ny = mfp.poss[i].y;
            if (IS_ROOM(game.level.at(nx, ny)?.typ)
                || (mtmp.isshk && (!in_his_shop || mtmp.eshk?.following))) {
                if (avoid && (mfp.info[i] & NOTONL)
                    && !(mfp.info[i] & ALLOW_M))
                    continue;
                if ((!appr && !rn2(++chcnt))
                    || (appr && GDIST(nx, ny) < GDIST(nix, niy))
                    || (mfp.info[i] & ALLOW_M)) {
                    nix = nx;
                    niy = ny;
                    ninfo = mfp.info[i];
                }
            }
        }
        if (mtmp.ispriest && avoid && nix === omx && niy === omy
            && online2(omx, omy, game.u.ux, game.u.uy)) {
            /* might as well move closer as long it's going to stay
             * lined up */
            avoid = false;
            continue;
        }
        break;
    }

    if (nix !== omx || niy !== omy) {
        if (ninfo & ALLOW_ROCK) {
            /* m_break_boulder(): no shk/priest has reached a boulder yet */
            note_unported_priest('move_special:m_break_boulder');
            return 1;
        } else if (ninfo & ALLOW_M) {
            /* m_move_aggress(): monster-vs-monster attack from the walk */
            note_unported_priest('move_special:m_move_aggress');
            return 0;
        }

        if (m_at(nix, niy) || (nix === game.u.ux && niy === game.u.uy))
            return 0;
        remove_monster(omx, omy);
        place_monster(mtmp, nix, niy);
        newsym(nix, niy);
        if (mtmp.isshk && !in_his_shop && inhishop(mtmp)) {
            /* check_special_room(FALSE): shop re-entry bookkeeping is not
               ported yet (js/hack.js spoteffects notes the same gap) */
            note_unported_priest('move_special:check_special_room');
        }
        return 1;
    }
    return 0;
}

// src/priest.c:144 pri_move() — temple priest's turn: mill around the
// altar, or chase/attack when angry.
export async function pri_move(priest) {
    let avoid = true;

    const omx = priest.mx;
    const omy = priest.my;

    if (!histemple_at(priest, omx, omy))
        return -1;

    let ggx = priest.epri.shrpos.x;
    let ggy = priest.epri.shrpos.y;

    ggx += rn1(3, -1); /* mill around the altar */
    ggy += rn1(3, -1);

    if (!priest.mpeaceful /* || Conflict: no source of it yet */) {
        if (monnear(priest, game.u.ux, game.u.uy)) {
            /* Displaced image message needs displacement, unreached */
            const { mattacku } = await import('./mhitu.js');
            await mattacku(priest);
            return 0;
        } else if ((game.u.urooms || '')
                   .includes(String.fromCharCode(priest.epri.shroom))) {
            /* chase player if inside temple & can see him */
            if ((priest.mcansee ?? 1) && m_canseeu(priest)) {
                ggx = game.u.ux;
                ggy = game.u.uy;
            }
            avoid = false;
        }
    } else if (Invis()) {
        avoid = false;
    }

    return move_special(priest, false, 1, false, avoid, omx, omy, ggx, ggy);
}

// src/priest.c:724 mk_roamer() — an aligned wandering minion (aligned
// cleric, angel) made by des.monster() with an explicit alignment.
export function mk_roamer(ptr, alignment, x, y, peaceful) {
    const coaligned = (game.u.ualign.type === alignment);

    if (m_at(x, y))
        note_unported_priest('mk_roamer:rloc squatter');

    const roamer = makemon(ptr, x, y, MMFLAGS.MM_ADJACENTOK
                                      | MMFLAGS.MM_EMIN | MMFLAGS.MM_NOMSG);
    const finishCreation = (roamer) => {
        if (!roamer)
            return null;

        roamer.emin = { min_align: alignment,
                        renegade: !!(coaligned && !peaceful) };
        roamer.ispriest = 0;
        roamer.isminion = 1;
        /* mon_learns_traps(roamer, ALL_TRAPS) — mtrapseen = ~0L, state only */
        roamer.mtrapseen = ~0;
        roamer.mpeaceful = peaceful ? 1 : 0;
        roamer.msleeping = 0;
        set_malign(roamer); /* peaceful may have changed */

        return roamer;
    };
    return roamer instanceof Promise ? roamer.then(finishCreation)
                                      : finishCreation(roamer);
}

// src/priest.c:755 reset_hostility() — on the Astral Plane the placeholder
// alignments the level script gave its clerics and Angels resolve against
// the hero's actual alignment.
export function reset_hostility(roamer) {
    if (!roamer.isminion)
        return;
    if (roamer.data !== game.mons[PMNAMES.PM_ALIGNED_CLERIC]
        && roamer.data !== game.mons[PMNAMES.PM_ANGEL])
        return;

    if ((roamer.emin?.min_align) !== game.u.ualign.type) {
        roamer.mpeaceful = roamer.mtame = 0;
        set_malign(roamer);
    }
    newsym(roamer.mx, roamer.my);
}

// src/priest.c:877 angry_priest() -- anger the cleric for the temple the
// hero currently occupies. A destroyed or converted shrine releases that
// cleric as a roaming minion of the shrine's former alignment.
export async function angry_priest() {
    const occupied = new Set([...(game.u.urooms || ''),
                              ...(game.u.urooms0 || '')]);
    const priest = (game.level?.monsters || []).find((mon) =>
        mon.mhp > 0 && mon.ispriest && mon.epri
        && occupied.has(String.fromCharCode(mon.epri.shroom)));
    if (!priest)
        return;

    await wakeup(priest, false);
    await setmangry(priest, false);

    const epri = priest.epri;
    const shrine = game.level?.at(epri.shrpos.x, epri.shrpos.y);
    if (!shrine || !IS_ALTAR(shrine.typ)
        || Amask2align(shrine.altarmask & AM_MASK) !== epri.shralign) {
        const emin = { min_align: epri.shralign, renegade: false };
        priest.emin = emin;
        priest.mextra ||= {};
        priest.mextra.emin = emin;
        delete priest.mextra.epri;
        delete priest.epri;
        priest.ispriest = 0;
        priest.isminion = 1;
    }
}

// src/priest.c:142 temple_occupied(); the first room in the hero's room
// list that is a temple, as its room character
function temple_occupied(array) {
    for (const ch of array || '')
        if (game.level.rooms[ch.charCodeAt(0) - ROOMOFFSET]?.rtype === TEMPLE)
            return ch;
    return '';
}

/* include/hack.h:1486 BZ_M_SPELL() */
const BZ_M_SPELL = (bztyp) => (-10 - (bztyp));

// src/priest.c ghod_hitsu(); the temple's god retaliates against a hero
// who hits its priest
export async function ghod_hitsu(priest) {
    let troom;
    let oldbuzzer;
    let oldcurrwand;
    let x, y, ax, ay;
    const roomno = temple_occupied(game.u.urooms);

    if (!roomno || !has_shrine(priest))
        return;

    const epri = priest.epri || EPRI(priest);
    ax = x = epri.shrpos.x;
    ay = y = epri.shrpos.y;
    troom = game.level.rooms[roomno.charCodeAt(0) - ROOMOFFSET];

    if (u_at(x, y) || !linedup(game.u.ux, game.u.uy, x, y, 1)) {
        if (IS_DOOR(game.level.at(game.u.ux, game.u.uy).typ)) {
            if (game.u.ux === troom.lx - 1) {
                x = troom.hx;
                y = game.u.uy;
            } else if (game.u.ux === troom.hx + 1) {
                x = troom.lx;
                y = game.u.uy;
            } else if (game.u.uy === troom.ly - 1) {
                x = game.u.ux;
                y = troom.hy;
            } else if (game.u.uy === troom.hy + 1) {
                x = game.u.ux;
                y = troom.ly;
            }
        } else {
            switch (rn2(4)) {
            case 0:
                x = game.u.ux;
                y = troom.ly;
                break;
            case 1:
                x = game.u.ux;
                y = troom.hy;
                break;
            case 2:
                x = troom.lx;
                y = game.u.uy;
                break;
            default:
                x = troom.hx;
                y = game.u.uy;
                break;
            }
        }
        if (!linedup(game.u.ux, game.u.uy, x, y, 1))
            return;
    }

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
    oldcurrwand = game.current_wand;
    game.current_wand = null;
    oldbuzzer = game.buzzer;
    game.buzzer = null;
    await buzz(BZ_M_SPELL(BZ_OFS_AD(ATTKS.AD_ELEC)), 6, x, y, sgn(game.tbx), sgn(game.tby));
    game.buzzer = oldbuzzer;
    game.current_wand = oldcurrwand;
    exercise(A_WIS, false);
}
