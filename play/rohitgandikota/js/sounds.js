// sounds.js — ambient level noises.
// C ref: src/sounds.c
//
// dosounds() runs once per turn and its draws are gated on what the level
// contains, in a fixed order: fountains first, then sinks. A level with
// fountains but no sinks draws rn2(400); one with sinks but no fountains draws
// rn2(300); one with both draws rn2(400) and then, only if that missed, still
// draws rn2(300) — the tests are independent `if`s, not a chain.

import { game } from './gstate.js';
import { MFLAGS, MONSYMS, PMNAMES } from './monst_data.js';
import { canseemon } from './display.js';
import { helpless, DEADMONSTER } from './monst.js';
import { rn2 } from './rng.js';
import { ECMD_OK, ECMD_TIME, IS_WALL, SDOOR, isok, M_AP_TYPE,
         M_AP_FURNITURE, M_AP_OBJECT, STRAT_WAITMASK,
         ANY_SHOP, ROOMOFFSET, VAULT } from './const.js';
import { ONAMES } from './objects_data.js';
import { search_special } from './mkroom.js';
import { tended_shop, noisy_shop } from './shk.js';
import { MSOUND } from './monst_data.js';
import { canspotmon } from './display.js';
import { getdir } from './cmd.js';
import { m_at } from './mon.js';
import { Deaf, Hallucination } from './youprop.js';
import { pline_The, You, You_hear } from './pline.js';
import { pline } from './display.js';
import { Monnam } from './do_name.js';
import { vtense } from './objnam.js';
import { wake_nearto } from './mon.js';
import { nomul } from './hack.js';
import { poly_gender } from './polyself.js';

// src/sounds.c:202 dosounds()
export async function dosounds() {
    const u = game.u;
    if (Deaf() || u.uswallow || u.Underwater)
        return;
    if (game.flags?.acoustics === false)
        return;

    const f = game.level?.flags || {};
    const hallu = Hallucination() ? 1 : 0;

    if (f.nfountains && !rn2(400)) {
        const fountain_msg = [
            'bubbling water.', 'water falling on coins.',
            'the splashing of a naiad.', 'a soda fountain!',
        ];
        await You_hear(fountain_msg[rn2(3) + hallu]);
    }
    if (f.nsinks && !rn2(300)) {
        const sink_msg = [
            'a slow drip.', 'a gurgling noise.', 'dishes being washed!',
        ];
        await You_hear(sink_msg[rn2(2) + hallu]);
    }
    if (f.has_court && !rn2(200)) {
        note_unported('dosounds throne room');
    }
    if (f.has_swamp && !rn2(200)) {
        const swamp_msg = [
            'hear mosquitoes!', 'smell marsh gas!', 'hear Donald Duck!',
        ];
        await You(swamp_msg[rn2(2) + hallu]);
        return;
    }
    if (f.has_vault && !rn2(200)) {
        const sroom = search_special(VAULT);
        if (!sroom) {
            f.has_vault = 0;
            return;
        }
        if (!vault_occupied(game.u.urooms) && !findgd()) {
            switch (rn2(2) + hallu) {
            case 1: {
                let gold_in_vault = false;
                for (let x = sroom.lx; x <= sroom.hx; x++) {
                    for (let y = sroom.ly; y <= sroom.hy; y++) {
                        if ((game.level?.objects || []).some(
                                obj => obj.ox === x && obj.oy === y
                                    && obj.otyp === ONAMES.GOLD_PIECE))
                            gold_in_vault = true;
                    }
                }
                const roomno = game.level.rooms.indexOf(sroom) + ROOMOFFSET;
                if (vault_occupied(game.u.urooms) !== roomno) {
                    if (gold_in_vault) {
                        await You_hear(hallu
                            ? 'the quarterback calling the play.'
                            : 'someone counting gold coins.');
                    } else {
                        await You_hear('someone searching.');
                    }
                    break;
                }
            }
            case 0:
                await You_hear('the footsteps of a guard on patrol.');
                break;
            case 2:
                await You_hear('Ebenezer Scrooge!');
                break;
            }
        }
        return;
    }
    if (f.has_beehive && !rn2(200)) {
        note_unported('dosounds beehive');
    }
    if (f.has_morgue && !rn2(200)) {
        note_unported('dosounds morgue');
    }
    if (f.has_barracks && !rn2(200)) {
        note_unported('dosounds barracks');
    }
    if (f.has_zoo && !rn2(200)) {
        note_unported('dosounds zoo');
    }
    if (f.has_shop && !rn2(200)) {
        const sroom = search_special(ANY_SHOP);
        if (!sroom) {
            /* strange... */
            f.has_shop = 0;
            return;
        }
        if (tended_shop(sroom)
            && !(game.u.ushops || '')
                .includes(String.fromCharCode(
                    game.level.rooms.indexOf(sroom) + ROOMOFFSET))) {
            const shop_msg = [
                'someone cursing shoplifters.',
                'the chime of a cash register.', 'Neiman and Marcus arguing!',
            ];
            await You_hear(shop_msg[rn2(2) + hallu]);
            noisy_shop(sroom);
        }
        return;
    }
    if (f.has_temple && !rn2(200)) {
        /* temple_priest_sound needs the priest records (EPRI shrine
           position); with no priest on the list, C's get_iter_mons finds
           nothing and falls through without drawing */
        note_unported('dosounds temple');
    }
    if (Is_oracle_level() && !rn2(400)) {
        /* src/sounds.c:180 oracle_sound() via get_iter_mons */
        for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
            if (DEADMONSTER(mtmp) || mtmp.mnum !== PMNAMES.PM_ORACLE)
                continue;
            /* don't produce silly effects when she's clearly visible */
            if (!canseemon(mtmp)) {
                const ora_msg = [
                    'a strange wind.',     /* Jupiter at Dodona */
                    'convulsive ravings.', /* Apollo at Delphi */
                    'snoring snakes.',     /* AEsculapius at Epidaurus */
                ];
                await You_hear(ora_msg[rn2(3)]);
            }
            break;
        }
    }
}

/* include/dungeon.h Is_oracle_level() */
function Is_oracle_level() {
    const o = game.special_levels?.oracle_level;
    return !!(o && game.u.uz.dnum === o.dnum && game.u.uz.dlevel === o.dlevel);
}

// src/vault.c:244 vault_occupied() and :1272 gd_sound().
function vault_occupied(urooms) {
    for (const ch of urooms || '') {
        const roomno = ch.charCodeAt(0);
        if (game.level?.rooms?.[roomno - ROOMOFFSET]?.rtype === VAULT)
            return roomno;
    }
    return 0;
}

function findgd() {
    return (game.level?.monsters || []).find(
        mon => mon.isgd && !DEADMONSTER(mon)) || null;
}

function note_unported(what) {
    (game.unported ||= new Set()).add(what);
}

// src/sounds.c:1257 dochat() — the 'c' command.
//
// Its one input read is getdir("Talk to whom?"), so chatting costs TWO keys:
// the command and the direction. Leaving it unhandled ran the direction key as
// a movement command, the same failure that made an unhandled 'f' walk the hero
// a square east.
//
// The early exits above getdir — polymorphed mute, strangled, swallowed,
// underwater, standing on shop merchandise — all return before reading
// anything, and none is reachable for an ordinary hero on an ordinary level.
export async function dochat() {
    if (!await getdir('Talk to whom? (in what direction)'))
        return ECMD_OK; /* ECMD_CANCEL */

    /* src/sounds.c — chatting downward, at yourself, or at empty air all
       return without a turn; only domonnoise() on a real monster can take one,
       and that needs the monster-sound tables. */
    if (game.u.dz)
        return ECMD_OK;
    if (game.u.dx === 0 && game.u.dy === 0)
        return ECMD_OK;

    const tx = game.u.ux + game.u.dx, ty = game.u.uy + game.u.dy;
    if (!isok(tx, ty))
        return ECMD_OK;

    const mtmp = m_at(tx, ty);

    if (!mtmp || mtmp.mundetected) {
        /* src/sounds.c:1335 — a statue at the target: recorded (vobj_at plus
           the hallucination monster name). */
        const loc = game.level.at(tx, ty);
        if (!Deaf() && (IS_WALL(loc.typ) || loc.typ === SDOOR)) {
            /* Talking to a wall; a secret door remains hidden by behaving
               like a wall. The Blind arm needs lastseentyp and is recorded. */
            /* this tree tracks blindness as game.u.ublind */
            if (game.u?.ublind) {
                note_unported_sounds('dochat:blind_wall');
            } else if (!Hallucination()) {
                await pline("It's like talking to a wall.");
            } else {
                const walltalk = [
                    "gripes about its job.",
                    "tells you a funny joke!",
                    "insults your heritage!",
                    "chuckles.",
                    "guffaws merrily!",
                    "deprecates your exploration efforts.",
                    "suggests a stint of rehab...",
                    "doesn't seem to be interested.",
                ];
                let idx = rn2(10);

                if (idx >= walltalk.length)
                    idx = walltalk.length - 1;
                await pline_The(`wall ${walltalk[idx]}`);
            }
            return ECMD_OK;
        }
    }

    if (!mtmp || mtmp.mundetected
        || M_AP_TYPE(mtmp) === M_AP_FURNITURE
        || M_AP_TYPE(mtmp) === M_AP_OBJECT)
        return ECMD_OK; /* "talking to thin air" */

    /* sleeping monsters won't talk, except priests (who wake up) */
    if (helpless(mtmp) && !mtmp.ispriest) {
        if (canspotmon(mtmp))
            await pline(`${Monnam(mtmp)} seems not to notice you.`);
        return ECMD_OK;
    }

    /* if this monster is waiting for something, prod it into action */
    mtmp.mstrategy &= ~STRAT_WAITMASK;

    if (!Deaf() && mtmp.mtame && mtmp.meating) {
        await pline(`${Monnam(mtmp)} is eating noisily.`);
        return ECMD_OK;
    }
    if (Deaf()) {
        note_unported_sounds('dochat:deaf');
        return ECMD_OK;
    }

    return await domonnoise(mtmp);
}

// src/sounds.c:679 domonnoise() — what the monster says. The animal arms
// live here (bark, mew, neigh, growl, moo); the speaking-monster arms
// (shopkeeper, priest, quest, vampire, humanoid smalltalk) sit on unported
// subsystems and record themselves. Always costs the turn.
export async function domonnoise(mtmp) {
    const ptr = game.mons[mtmp.mnum];
    let msound = ptr.msound;
    let pline_msg = null, verbl_msg = null;

    /* presumably nearness and sleep checks have already been made */
    if (Deaf())
        return ECMD_OK;
    if (msound === MSOUND.MS_SILENT && !mtmp.isshk)
        return ECMD_OK;

    if (mtmp.isshk)
        msound = MSOUND.MS_SELL;
    else if (msound === MSOUND.MS_MOO && !mtmp.mtame)
        msound = MSOUND.MS_BELLOW;

    if (!canspotmon(mtmp))
        note_unported_sounds('domonnoise:map_invisible');

    const edog = mtmp.edog || {};
    switch (msound) {
    case MSOUND.MS_BARK:
        if (game.flags?.moonphase === 4 /* FULL_MOON */ && night_snd()) {
            pline_msg = 'howls.';
        } else if (mtmp.mpeaceful) {
            if (mtmp.mtame
                && (mtmp.mconf || mtmp.mflee || mtmp.mtrapped
                    || game.moves > (edog.hungrytime || 0)
                    || mtmp.mtame < 5))
                pline_msg = 'whines.';
            else if (mtmp.mtame
                     && (edog.hungrytime || 0) > game.moves + 1000)
                pline_msg = 'yips.';
            else if (mtmp.mnum !== PMNAMES.PM_DINGO)
                pline_msg = 'barks.';
        } else {
            pline_msg = 'growls.';
        }
        break;
    case MSOUND.MS_MEW:
        if (mtmp.mtame) {
            if (mtmp.mconf || mtmp.mflee || mtmp.mtrapped
                || mtmp.mtame < 5)
                pline_msg = 'yowls.';
            else if (game.moves > (edog.hungrytime || 0))
                pline_msg = 'meows.';
            else if ((edog.hungrytime || 0) > game.moves + 1000)
                pline_msg = 'purrs.';
            else
                pline_msg = 'mews.';
            break;
        }
        /* FALLTHRU */
    case MSOUND.MS_GROWL:
        pline_msg = mtmp.mpeaceful ? 'snarls.' : 'growls!';
        break;
    case MSOUND.MS_NEIGH:
        if (mtmp.mtame < 5)
            pline_msg = 'neighs.';
        else if (game.moves > (edog.hungrytime || 0))
            pline_msg = 'whinnies.';
        else
            pline_msg = 'whickers.';
        break;
    case MSOUND.MS_MOO:
        pline_msg = 'moos.';
        break;
    case MSOUND.MS_SEDUCE:
        if (ptr.mlet !== MONSYMS.S_NYMPH) {
            /* Succubi and incubi can enter the full seduction interaction. */
            note_unported_sounds('domonnoise:doseduce');
            break;
        }
        switch (poly_gender() !== (mtmp.female | 0) ? rn2(3) : 0) {
        case 2:
            verbl_msg = 'Hello, sailor.';
            break;
        case 1:
            pline_msg = 'comes on to you.';
            break;
        default:
            pline_msg = 'cajoles you.';
            break;
        }
        break;
    case MSOUND.MS_LEADER:
    case MSOUND.MS_NEMESIS:
    case MSOUND.MS_GUARDIAN: {
        const { quest_chat } = await import('./quest.js');
        await quest_chat(mtmp);
        break;
    }
    default:
        note_unported_sounds(`domonnoise:msound=${msound}`);
        break;
    }

    if (pline_msg)
        await pline(`${Monnam(mtmp)} ${pline_msg}`);
    else if (verbl_msg)
        await pline(`"${verbl_msg}"`);
    return ECMD_TIME;
}

/* src/hacklib.c night() — hour outside 06..21; the recorder's fixed
   datetime makes this deterministic. */
function night_snd() {
    const hh = Math.trunc((game.datetime_hhmmss ?? 90000) / 10000);
    return hh < 6 || hh > 21;
}

function note_unported_sounds(what) {
    (game.unported ||= new Set()).add(what);
}

// src/sounds.c h_sounds[]. Hallucinated pet noises use one gameplay RNG draw.
const h_sounds = [
    'beep', 'boing', 'sing', 'belche', 'creak', 'cough',
    'rattle', 'ululate', 'pop', 'jingle', 'sniffle', 'tinkle',
    'eep', 'clatter', 'hum', 'sizzle', 'twitter', 'wheeze',
    'rustle', 'honk', 'lisp', 'yodel', 'coo', 'burp',
    'moo', 'boom', 'murmur', 'oink', 'quack', 'rumble',
    'twang', 'toot', 'gargle', 'hoot', 'warble',
];

// src/sounds.c growl() — the monster makes a noise.
//
// The early return is on helpless() OR msound == MS_SILENT, so a sleeping,
// paralysed or genuinely mute monster is silent and costs nothing.
//
// The structure below the verb lookup is the part worth keeping exactly:
// the pline and the run-interrupt are inside `canseemon(mtmp) || !Deaf`,
// but wake_nearto() is OUTSIDE it, inside only `if (growl_verb)`. The noise
// wakes nearby monsters whether or not YOU hear it. Folding wake_nearto in
// with the message -- they read as one event -- would make a deaf hero's
// growls silent to the whole level.
//
// The radius is mlevel * 18, so a bigger monster wakes a wider circle.
//
// ROLL_FROM(h_sounds) is a draw but only under Hallucination. growl_sound
// (a table lookup on msound) and wake_nearto are recorded.
// src/sounds.c growl_sound() — the verb for a growl, by msound class.
function growl_sound(mtmp) {
    let ret;

    switch (game.mons[mtmp.mnum].msound) {
    case MFLAGS.MS_MEW:
    case MFLAGS.MS_HISS:
        ret = "hiss";
        break;
    case MFLAGS.MS_BARK:
    case MFLAGS.MS_GROWL:
        ret = "growl";
        break;
    case MFLAGS.MS_ROAR:
        ret = "roar";
        break;
    case MFLAGS.MS_BELLOW:
        ret = "bellow";
        break;
    case MFLAGS.MS_BUZZ:
        ret = "buzz";
        break;
    case MFLAGS.MS_SQEEK:
        ret = "squeal";
        break;
    case MFLAGS.MS_SQAWK:
        ret = "screech";
        break;
    case MFLAGS.MS_NEIGH:
        ret = "neigh";
        break;
    case MFLAGS.MS_WAIL:
        ret = "wail";
        break;
    case MFLAGS.MS_GROAN:
        ret = "groan";
        break;
    case MFLAGS.MS_MOO:
        ret = "low";
        break;
    case MFLAGS.MS_SILENT:
        ret = "commotion";
        break;
    default:
        ret = "scream";
    }
    return ret;
}

export async function growl(mtmp) {
    let growl_verb = 0;

    if (helpless(mtmp) || game.mons[mtmp.mnum].msound === MFLAGS.MS_SILENT)
        return;

    /* presumably nearness and soundok checks have already been made */
    if (Hallucination())
        growl_verb = h_sounds[rn2(h_sounds.length)];
    else
        growl_verb = growl_sound(mtmp);
    if (growl_verb) {
        if (canseemon(mtmp) || !Deaf()) {
            await pline(`${Monnam(mtmp)} ${vtense(null, growl_verb)}!`);
            /* C sets iflags.last_msg = PLNMSG_GROWL; nothing reads it here */
            if (game.context?.run)
                nomul(0);
        }
        /* OUTSIDE the canseemon check on purpose */
        wake_nearto(mtmp.mx, mtmp.my, game.mons[mtmp.mnum].mlevel * 18);
    }
}

// src/sounds.c yelp() — a pet's yelp when abused. The Soundeffect() calls
// are audio-only and leave no terminal output.
export async function yelp(mtmp) {
    let yelp_verb = 0;

    if (helpless(mtmp) || game.mons[mtmp.mnum].msound === MFLAGS.MS_SILENT)
        return;

    /* presumably nearness and soundok checks have already been made */
    if (Hallucination())
        yelp_verb = h_sounds[rn2(h_sounds.length)];
    else
        switch (game.mons[mtmp.mnum].msound) {
        case MFLAGS.MS_MEW:
            yelp_verb = !Deaf() ? "yowl" : "arch";
            break;
        case MFLAGS.MS_BARK:
        case MFLAGS.MS_GROWL:
            yelp_verb = !Deaf() ? "yelp" : "recoil";
            break;
        case MFLAGS.MS_ROAR:
            yelp_verb = !Deaf() ? "snarl" : "bluff";
            break;
        case MFLAGS.MS_SQEEK:
            yelp_verb = !Deaf() ? "squeal" : "quiver";
            break;
        case MFLAGS.MS_SQAWK:
            yelp_verb = !Deaf() ? "screak" : "thrash";
            break;
        case MFLAGS.MS_WAIL:
            yelp_verb = !Deaf() ? "wail" : "cringe";
            break;
        }
    if (yelp_verb) {
        await pline(`${Monnam(mtmp)} ${vtense(null, yelp_verb)}!`);
        if (game.context?.run)
            nomul(0);
        wake_nearto(mtmp.mx, mtmp.my, game.mons[mtmp.mnum].mlevel * 12);
    }
}

const note_sounds_unported = (w) => {
    (game.unported ||= new Set()).add('sounds:' + w);
    return 0;
};
