// priest_talk_hero.js — C sounds.c dochat + priest.c priest_talk subset (temple donation / bribe).
// C refs: sounds.c dochat(); priest.c priest_talk(); minion.c bribe().

import { pline, flush_screen } from './display.js';
import { nhgetch } from './input.js';
import { readDirIntoU } from './dir_input.js';
import { isok, TEMPLE, EPRI, A_WIS } from './const.js';
import { rn1, rn2 } from './rng.js';
import { exercise } from './attrib.js';
import { adjalignLikeC } from './dig_grave.js';
import { inRoomsTypewantedRoomnos, moneyCntInventLikeC, moneyCntMinventLikeC, money2monDeductHeroLikeC } from './shop.js';
import {
    hasShrineMonsterLikeC,
    inhistempleMonsterLikeC,
    pCoalignedMonsterLikeC,
} from './distfleeck_mon.js';
import {
    applyPriestDonationUblessedLoopLikeC,
    ensureHProtectionIntrinsicForPriestDonationLikeC,
} from './divine_protection.js';
import { findAc } from './u_init_find_ac.js';

/** C: priest.c **`ALGN_SINNED`** gate for **`adjalign(1)`** after clairvoyance tier. */
const ALGN_SINNED = -4;

/** @param {import('./gstate.js').game} g */
function markBotlFindAc(g) {
    g.disp = g.disp || {};
    g.disp.botl = true;
    findAc(g);
}

/** @param {Record<string, unknown>} mtmp */
function monNam(mtmp) {
    const n = mtmp?.monnam || mtmp?.data?.mname || 'monster';
    const s = String(n);
    return /^the /i.test(s) ? s : `the ${s}`;
}

/** @param {Record<string, unknown>} mtmp */
function monMonnamLikeC(mtmp) {
    const n = mtmp?.monnam || mtmp?.data?.mname || 'monster';
    const s = String(n);
    if (/^[A-Z]/.test(s)) return s;
    return s.length ? s[0].toUpperCase() + s.slice(1) : 'Monster';
}

/** C: mon.c **`helpless`** subset for **`dochat`** sleeping branch (**`msleeping`/`mfrozen`/`mcanmove`**). */
function helplessMonsterChatLikeC(mtmp) {
    if (!mtmp) return false;
    if ((mtmp.msleeping | 0) !== 0) return true;
    if ((mtmp.mfrozen | 0) > 0) return true;
    return (mtmp.mcanmove | 0) === 0;
}

/**
 * C: minion.c **`bribe`** — **`getlin`** + **`sscanf`** + **`money2mon`** (hero deduct only in JS).
 * @returns {Promise<number>} offer zorkmids (0 if refused / parse fail / cancel)
 */
async function bribeMonsterLikeC(g, mtmp, prompt) {
    const umoney = moneyCntInventLikeC(g);
    await pline(prompt);
    g._retainMessageAfterCommand = true;
    await flush_screen(1);
    let buf = '';
    for (;;) {
        const c = await nhgetch();
        if (c === 27) {
            buf = '';
            break;
        }
        if (c === 10 || c === 13) break;
        buf += String.fromCharCode(c);
        if (buf.length > 200) break;
    }
    let offer = 0;
    const m = buf.trim().match(/^(-?\d+)/);
    if (m) offer = Number(m[1]);
    if (offer < 0) {
        await pline(`You try to shortchange ${monNam(mtmp)}, but fumble.`);
        return 0;
    }
    if (offer === 0) {
        await pline('You refuse.');
        return 0;
    }
    if (offer >= umoney) {
        await pline(`You give ${monNam(mtmp)} all your gold.`);
        offer = umoney;
    } else {
        await pline(`You give ${monNam(mtmp)} ${offer} zorkmids.`);
    }
    money2monDeductHeroLikeC(g, offer);
    markBotlFindAc(g);
    return offer;
}

/**
 * C: priest.c **`priest_talk`** — temple donation / **`bribe`** / Protection + **`u.ublessed`** loop.
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} priest
 */
async function priestTalkLikeC(g, priest) {
    const u = g.u;
    if (!u) return;

    const coaligned = pCoalignedMonsterLikeC(g, priest);
    const strayed = (u.ualign?.record | 0) < 0;
    const epri = EPRI(priest);
    const cheapskateRef = epri || null;

    if ((priest.mflee | 0) || (!(priest.ispriest | 0) && coaligned && strayed)) {
        await pline(`${monMonnamLikeC(priest)} doesn't want anything to do with you!`);
        priest.mpeaceful = 0;
        return;
    }

    if (!inhistempleMonsterLikeC(g, priest) || !(priest.mpeaceful | 0) || helplessMonsterChatLikeC(priest)) {
        const cranky = [
            'Thou wouldst have words, eh?  I\'ll give thee a word or two!',
            'Talk?  Here is what I have to say!',
            'Pilgrim, I would speak no longer with thee.',
        ];
        if (helplessMonsterChatLikeC(priest)) {
            await pline(`${monMonnamLikeC(priest)} breaks out of a reverie!`);
            priest.mfrozen = 0;
            priest.msleeping = 0;
            priest.mcanmove = 1;
        }
        priest.mpeaceful = 0;
        await pline(`"${cranky[rn2(3)]}"`);
        return;
    }

    const mx = priest.mx | 0;
    const my = priest.my | 0;
    const tins = inRoomsTypewantedRoomnos(g, mx, my, TEMPLE);
    if ((priest.mpeaceful | 0) && (tins[0] | 0) !== 0 && !hasShrineMonsterLikeC(g, priest)) {
        await pline('"Begone!  Thou desecratest this holy place with thy presence."');
        priest.mpeaceful = 0;
        return;
    }

    const invGold = moneyCntInventLikeC(g);
    if (!invGold) {
        if (coaligned && !strayed) {
            const pmoney = moneyCntMinventLikeC(priest);
            if (pmoney > 0) {
                const bits = u.Hallucination ? 'zorkmids' : pmoney === 1 ? 'bit' : 'bits';
                await pline(
                    `${monMonnamLikeC(priest)} gives you ${pmoney === 1 ? 'one ' : 'two '}${bits} for an ale.`,
                );
                /* C: money2u — not ported; messaging only */
            } else await pline(`${monMonnamLikeC(priest)} preaches the virtues of poverty.`);
            exercise(A_WIS, true);
        } else await pline(`${monMonnamLikeC(priest)} is not interested.`);
        return;
    }

    const ulevelpeak = (u.ulevelpeak | 0) || (u.ulevel | 0) || 1;
    const cheapN = cheapskateRef ? cheapskateRef.cheapskate_count | 0 : 0;
    const suggested =
        ulevelpeak * rn1(101, 150 + (cheapskateRef ? cheapN : 0) * 40);
    let quan = Math.trunc(moneyCntInventLikeC(g) / (suggested * 3));
    if (quan < 1) quan = 1;

    const sugLo = suggested * quan;
    const sugHi = suggested * quan * 2;
    const prompt = `How much will you offer (suggested: ${sugLo} or ${sugHi})?`;

    if (g.flags?.debug) {
        await pline(`${monMonnamLikeC(priest)} asks you for a contribution for the temple (base ${suggested}).`);
    } else {
        await pline(`${monMonnamLikeC(priest)} asks you for a contribution for the temple.`);
    }

    const offer0 = await bribeMonsterLikeC(g, priest, prompt);
    if (offer0 === 0) {
        await pline('"Thou shalt regret thine action!"');
        if (coaligned) adjalignLikeC(g, -1);
        if (cheapskateRef) cheapskateRef.cheapskate_count = (cheapskateRef.cheapskate_count | 0) + 1;
        return;
    }
    let offer = offer0 | 0;
    const sugQ = suggested * quan;

    if (offer < sugQ) {
        if (moneyCntInventLikeC(g) > offer * 2) {
            await pline('"Cheapskate."');
            if (cheapskateRef) cheapskateRef.cheapskate_count = (cheapskateRef.cheapskate_count | 0) + 1;
        } else {
            await pline('"I thank thee for thy contribution."');
            exercise(A_WIS, true);
        }
    } else if (offer < sugQ * 2) {
        await pline('"Thou art indeed a pious individual."');
        if (moneyCntInventLikeC(g) < offer * 2) {
            if (coaligned && (u.ualign?.record | 0) <= ALGN_SINNED) adjalignLikeC(g, 1);
        }
        await pline('"I bestow upon thee a blessing."');
        const base = Math.trunc((500 * offer) / suggested);
        const hi = rn1(base, base);
        u.HClairvoyant = (u.HClairvoyant | 0) + hi;
        markBotlFindAc(g);
    } else if (offer < sugQ * 3) {
        const hadNoIntrinsic = ensureHProtectionIntrinsicForPriestDonationLikeC(g);
        const origForMsg = hadNoIntrinsic ? -1 : origUblessed;
        applyPriestDonationUblessedLoopLikeC(g, offer, suggested);
        if ((u.ublessed | 0) > origForMsg) {
            await pline('"Thou hast been rewarded for thy devotion."');
        } else {
            await pline('"Thy selfless generosity is deeply appreciated."');
        }
    } else {
        await pline('"Thy selfless generosity is deeply appreciated."');
        if (moneyCntInventLikeC(g) < offer * 2 && coaligned) {
            if (strayed && ((g.moves | 0) - (u.ucleansed | 0)) > 5000) {
                u.ualign.record = 0;
                u.ucleansed = g.moves | 0;
            } else {
                adjalignLikeC(g, 2);
            }
        }
    }
}

/**
 * C: sounds.c **`dochat`** subset — **`getdir`** + **`m_at`** + **`domonnoise`** **`MS_PRIEST`** → **`priest_talk`**.
 * Omits: **`shop_object`** price quote, statue / wall talk, **`Deaf`** before **`domonnoise`**, steed **`dz`**, tame eating.
 * @param {import('./gstate.js').game} g
 */
export async function runDochatExtcmdFlowLikeC(g) {
    const u = g.u;
    if (!u || !g.level) {
        await pline('Nothing happens.');
        g._retainMessageAfterCommand = true;
        await flush_screen(1);
        return;
    }

    if ((u.Strangled | 0) !== 0) {
        await pline("You can't speak.  You're choking!");
        g._retainMessageAfterCommand = true;
        await flush_screen(1);
        return;
    }
    if ((u.uswallow | 0) !== 0) {
        await pline("They won't hear you out there.");
        g._retainMessageAfterCommand = true;
        await flush_screen(1);
        return;
    }
    if ((u.Underwater | 0) !== 0) {
        await pline('Your speech is unintelligible underwater.');
        g._retainMessageAfterCommand = true;
        await flush_screen(1);
        return;
    }

    await pline('Talk to whom? (in what direction)');
    g._retainMessageAfterCommand = true;
    await flush_screen(1);
    if (!(await readDirIntoU(g))) {
        await pline('Never mind.');
        g._retainMessageAfterCommand = true;
        await flush_screen(1);
        return;
    }

    if ((u.dz | 0) !== 0) {
        await pline(`They won't hear you ${u.dz < 0 ? 'up' : 'down'} there.`);
        g._retainMessageAfterCommand = true;
        await flush_screen(1);
        return;
    }

    const dx = u.dx | 0;
    const dy = u.dy | 0;
    if (dx === 0 && dy === 0) {
        await pline('Talking to yourself is a bad habit for a dungeoneer.');
        g._retainMessageAfterCommand = true;
        await flush_screen(1);
        return;
    }

    const tx = (u.ux | 0) + dx;
    const ty = (u.uy | 0) + dy;
    if (!isok(tx, ty)) {
        g._retainMessageAfterCommand = true;
        await flush_screen(1);
        return;
    }

    const mtmp = g.level.monsters?.find((m) => (m.mx | 0) === tx && (m.my | 0) === ty) ?? null;
    if (!mtmp || (mtmp.mundetected | 0) !== 0) {
        g._retainMessageAfterCommand = true;
        await flush_screen(1);
        return;
    }

    if (helplessMonsterChatLikeC(mtmp) && !(mtmp.ispriest | 0)) {
        await pline(`${monMonnamLikeC(mtmp)} seems not to notice you.`);
        g.context.move = 1;
        g._retainMessageAfterCommand = true;
        await flush_screen(1);
        return;
    }

    const deaf = (u.timed?.deaf ?? 0) > 0;
    if (deaf) {
        await pline(`Any response from ${monNam(mtmp)} falls on deaf ears.`);
        g.context.move = 1;
        g._retainMessageAfterCommand = true;
        await flush_screen(1);
        return;
    }

    if (mtmp.ispriest | 0) {
        await priestTalkLikeC(g, mtmp);
        g.context.move = 1;
        g._retainMessageAfterCommand = true;
        await flush_screen(1);
        return;
    }

    g._retainMessageAfterCommand = true;
    await flush_screen(1);
}
