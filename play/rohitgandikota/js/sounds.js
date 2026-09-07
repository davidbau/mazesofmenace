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
import { canseemon, map_invisible } from './display.js';
import { helpless, DEADMONSTER } from './monst.js';
import { rn2 } from './rng.js';
import { ECMD_OK, ECMD_TIME, IS_WALL, SDOOR, isok, M_AP_TYPE,
         M_AP_FURNITURE, M_AP_OBJECT, STRAT_WAITMASK,
         ANY_SHOP, ROOMOFFSET, VAULT, COURT, PLNMSG_GROWL,
         BEEHIVE, MORGUE, BARRACKS, ZOO, TEMPLE, W_ARMH, HAIR, NECK, HEAD,
         BLOOD, Upolyd, In_endgame, Is_astralevel, Is_sanctum,
         A_LAWFUL } from './const.js';
import { is_animal, is_undead, is_flyer, is_elf, is_dwarf, is_gnome,
         is_lord, is_prince, is_mplayer, mhis, carnivorous, herbivorous, is_silent } from './mondata.js';
import { is_vampshifter } from './monst.js';
import { get_iter_mons, m_at, t_at, wake_nearto } from './mon.js';
import { body_part } from './polyself.js';
import { worn } from './do_wear.js';
import { OCLASSES, ONAMES } from './objects_data.js';
import { is_weptool } from './mkobj.js';
import { search_special } from './mkroom.js';
import { tended_shop, noisy_shop } from './shk.js';
import { MSOUND } from './monst_data.js';
import { canspotmon } from './display.js';
import { getdir } from './cmd.js';
import { Deaf, Hallucination, Underwater } from './youprop.js';
import { pline_The, You, You_hear, verbalize } from './pline.js';
import { pline } from './display.js';
import { Monnam, noveltitle, pmname } from './do_name.js';
import { an, vtense } from './objnam.js';
import { nomul } from './hack.js';
import { poly_gender } from './polyself.js';
import { midnight, night } from './calendar.js';
import { cansee } from './vision.js';


// src/sounds.c:202 dosounds()
export async function dosounds() {
    const u = game.u;
    if (Deaf() || u.uswallow || Underwater())
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
        if (await get_iter_mons(throne_mon_sound))
            return;
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
        if (await get_iter_mons(beehive_mon_sound))
            return;
    }
    if (f.has_morgue && !rn2(200)) {
        if (await get_iter_mons(morgue_mon_sound))
            return;
    }
    if (f.has_barracks && !rn2(200)) {
        const barracks_msg = [
            'blades being honed.', 'loud snoring.', 'dice being thrown.',
            'General MacArthur!',
        ];
        let count = 0;
        for (const mtmp of (game.level?.monsters || [])) {
            if (DEADMONSTER(mtmp))
                continue;
            if (is_mercenary(game.mons[mtmp.mnum])
                && mon_in_room(mtmp, BARRACKS)
                /* sleeping implies not-yet-disturbed (usually) */
                && (mtmp.msleeping || ++count > 5)) {
                await You_hear(barracks_msg[rn2(3) + hallu]);
                return;
            }
        }
    }
    if (f.has_zoo && !rn2(200)) {
        if (await get_iter_mons(zoo_mon_sound))
            return;
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
            await noisy_shop(sroom);
        }
        return;
    }
    if (f.has_temple && !rn2(200)
        && !(Is_astralevel(game.u.uz) || Is_sanctum(game.u.uz))) {
        if (await get_iter_mons(temple_priest_sound))
            return;
    }
    if (Is_oracle_level() && !rn2(400)) {
        if (await get_iter_mons(oracle_sound))
            return;
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

    /* src/sounds.c:1309/:1321, neither direction consumes a turn. */
    if (game.u.dz) {
        await pline(`They won't hear you ${game.u.dz < 0 ? 'up' : 'down'} there.`);
        return ECMD_OK;
    }
    if (game.u.dx === 0 && game.u.dy === 0) {
        await pline('Talking to yourself is a bad habit for a dungeoneer.');
        return ECMD_OK;
    }

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

// src/sounds.c:519 beg() — a hungry pet asks for food
export async function beg(mtmp) {
    const ptr = game.mons[mtmp.mnum];

    if (helpless(mtmp)
        || !(carnivorous(ptr) || herbivorous(ptr)))
        return;

    /* presumably nearness and soundok checks have already been made */
    if (!is_silent(ptr) && ptr.msound <= MSOUND.MS_ANIMAL) {
        await domonnoise(mtmp);
    } else if (ptr.msound >= MSOUND.MS_HUMANOID) {
        if (!canspotmon(mtmp))
            map_invisible(mtmp.mx, mtmp.my);
        await verbalize("I'm hungry.");
    } else {
        /* this is pretty lame but is better than leaving out the block
           of speech types between animal and humanoid; this covers
           MS_SILENT too (if caller lets that get this far) since it's
           excluded by the first two cases */
        if (canspotmon(mtmp))
            await pline(`${Monnam(mtmp)} seems famished.`);
        /* looking famished will be a good trick for a tame skeleton... */
    }
}

export async function domonnoise(mtmp) {
    const ptr = game.mons[mtmp.mnum];
    let msound = ptr.msound;
    let pline_msg = null, verbl_msg = null, verbl_msg_mcan = null;

    /* presumably nearness and sleep checks have already been made */
    if (Deaf())
        return ECMD_OK;
    if (msound === MSOUND.MS_SILENT && !mtmp.isshk)
        return ECMD_OK;

    if (mtmp.m_id === game.quest_status?.leader_m_id
        && msound > MSOUND.MS_ANIMAL)
        msound = MSOUND.MS_LEADER;
    else if (msound === MSOUND.MS_GUARDIAN
             && mtmp.mnum !== role_guardian_num())
        msound = guardian_role_sound(mtmp.mnum);
    else if (mtmp.isshk)
        msound = MSOUND.MS_SELL;
    else if (msound === MSOUND.MS_ORC
             && (same_chat_race(ptr, game.youmonst.data)
                 || same_chat_race(ptr, unpolymorphed_race())
                 || Hallucination()))
        msound = MSOUND.MS_HUMANOID;
    else if (msound === MSOUND.MS_MOO && !mtmp.mtame)
        msound = MSOUND.MS_BELLOW;

    if (!canspotmon(mtmp))
        map_invisible(mtmp.mx, mtmp.my);

    const edog = mtmp.edog || {};
    switch (msound) {
    case MSOUND.MS_ORACLE:
        note_unported_sounds('domonnoise:doconsult');
        break;
    case MSOUND.MS_PRIEST: {
        const { priest_talk } = await import('./priest.js');
        await priest_talk(mtmp);
        break;
    }
    case MSOUND.MS_SELL:
        if (!Hallucination() || ptr.msound === MSOUND.MS_SILENT
            || (mtmp.isshk && !rn2(2))) {
            note_unported_sounds('domonnoise:shk_chat');
        } else {
            const { currency } = await import('./invent.js');
            verbl_msg = `15 minutes could save you 15 ${currency(15)}.`;
        }
        break;
    case MSOUND.MS_BARK:
        if (game.flags?.moonphase === 4 /* FULL_MOON */ && night()) {
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
    case MSOUND.MS_ROAR:
        pline_msg = mtmp.mpeaceful ? 'snarls.' : 'roars!';
        break;
    case MSOUND.MS_SQEEK:
        pline_msg = 'squeaks.';
        break;
    case MSOUND.MS_SQAWK:
        if (mtmp.mnum === PMNAMES.PM_RAVEN && !mtmp.mpeaceful)
            verbl_msg = 'Nevermore!';
        else
            pline_msg = 'squawks.';
        break;
    case MSOUND.MS_HISS:
        if (!mtmp.mpeaceful)
            pline_msg = 'hisses!';
        else
            return ECMD_OK;
        break;
    case MSOUND.MS_BUZZ:
        pline_msg = mtmp.mpeaceful ? 'drones.' : 'buzzes angrily.';
        break;
    case MSOUND.MS_GRUNT:
        pline_msg = 'grunts.';
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
    case MSOUND.MS_BELLOW:
        pline_msg = 'bellows!';
        break;
    case MSOUND.MS_CHIRP:
        pline_msg = 'chirps.';
        break;
    case MSOUND.MS_WAIL:
        pline_msg = 'wails mournfully.';
        break;
    case MSOUND.MS_GROAN:
        if (!rn2(3))
            pline_msg = 'groans.';
        break;
    case MSOUND.MS_GURGLE:
        pline_msg = 'gurgles.';
        break;
    case MSOUND.MS_BURBLE:
        pline_msg = 'burbles.';
        break;
    case MSOUND.MS_TRUMPET:
        pline_msg = 'trumpets!';
        wake_nearto(mtmp.mx, mtmp.my, 11 * 11);
        break;
    case MSOUND.MS_SHRIEK: {
        pline_msg = 'shrieks.';
        const { aggravate } = await import('./wizard.js');
        aggravate();
        break;
    }
    case MSOUND.MS_IMITATE:
        pline_msg = 'imitates you.';
        break;
    case MSOUND.MS_BONES:
        await pline(`${Monnam(mtmp)} rattles noisily.`);
        await You('freeze for a moment.');
        nomul(-2);
        game.multi_reason = 'scared by rattling';
        game.nomovemsg = null;
        break;
    case MSOUND.MS_LAUGH:
        pline_msg = ['giggles.', 'chuckles.', 'snickers.', 'laughs.'][rn2(4)];
        break;
    case MSOUND.MS_MUMBLE:
        pline_msg = 'mumbles incomprehensibly.';
        break;
    case MSOUND.MS_ORC:
        pline_msg = 'grunts.';
        break;
    case MSOUND.MS_VAMPIRE: {
        const isnight = !!night();
        const kindred = Upolyd(game.u)
            && (game.u.umonnum === PMNAMES.PM_VAMPIRE
                || game.u.umonnum === PMNAMES.PM_VAMPIRE_LEADER);
        const nightchild = Upolyd(game.u)
            && (game.u.umonnum === PMNAMES.PM_WOLF
                || game.u.umonnum === PMNAMES.PM_WINTER_WOLF
                || game.u.umonnum === PMNAMES.PM_WINTER_WOLF_CUB);
        const racenoun = (game.flags?.female && game.urace?.individual?.f)
            ? game.urace.individual.f
            : game.urace?.individual?.m || game.urace?.noun || 'human';

        if (mtmp.mtame) {
            if (kindred) {
                verbl_msg = `Good ${isnight ? 'evening' : 'day'} to you Master${
                    isnight ? '!' : '.  Why do we not rest?'}`;
            } else {
                verbl_msg = `${nightchild ? 'Child of the night, ' : ''}${
                    midnight()
                        ? 'I can stand this craving no longer!'
                        : isnight
                            ? 'I beg you, help me satisfy this growing craving!'
                            : 'I find myself growing a little weary.'}`;
            }
        } else if (mtmp.mpeaceful) {
            if (kindred && isnight)
                verbl_msg = `Good feeding ${game.flags?.female ? 'sister' : 'brother'}!`;
            else if (nightchild && isnight)
                verbl_msg = 'How nice to hear you, child of the night!';
            else
                verbl_msg = 'I only drink... potions.';
        } else if (kindred) {
            verbl_msg = 'This is my hunting ground that you dare to prowl!';
        } else if (game.youmonst.data === game.mons[PMNAMES.PM_SILVER_DRAGON]
                   || game.youmonst.data === game.mons[PMNAMES.PM_BABY_SILVER_DRAGON]) {
            verbl_msg = `${game.youmonst.data === game.mons[PMNAMES.PM_SILVER_DRAGON]
                ? 'Fool' : 'Young Fool'}!  Your silver sheen does not frighten me!`;
        } else if (rn2(2) === 0) {
            verbl_msg = `I vant to suck your ${body_part(BLOOD)}!`;
        } else {
            verbl_msg = `I vill come after ${Upolyd(game.u)
                ? an(pmname(game.youmonst.data, game.flags?.female ? 1 : 0))
                : an(racenoun)} without regret!`;
        }
        break;
    }
    case MSOUND.MS_WERE:
        if (game.flags?.moonphase === 4
            && (!!night() !== (rn2(13) === 0))) {
            const cry = mtmp.mnum === PMNAMES.PM_HUMAN_WERERAT
                ? 'shriek' : 'howl';
            await pline(`${Monnam(mtmp)} throws back ${mhis(mtmp)} head and lets out a blood curdling ${cry}!`);
            wake_nearto(mtmp.mx, mtmp.my, 11 * 11);
        } else {
            pline_msg = 'whispers inaudibly.  All you can make out is "moon".';
        }
        break;
    case MSOUND.MS_BOAST:
        if (!mtmp.mpeaceful) {
            switch (rn2(4)) {
            case 0:
                await pline(`${Monnam(mtmp)} boasts about ${mhis(mtmp)} gem collection.`);
                break;
            case 1:
                pline_msg = 'complains about a diet of mutton.';
                break;
            default:
                pline_msg = 'shouts "Fee Fie Foe Foo!" and guffaws.';
                wake_nearto(mtmp.mx, mtmp.my, 7 * 7);
                break;
            }
            break;
        }
        /* FALLTHRU */
    case MSOUND.MS_HUMANOID:
        if (!mtmp.mpeaceful) {
            if (In_endgame(game.u.uz) && is_mplayer(ptr)) {
                const { mplayer_talk } = await import('./mplayer.js');
                await mplayer_talk(mtmp);
            } else {
                pline_msg = 'threatens you.';
            }
            break;
        }
        if (mtmp.mflee)
            pline_msg = 'wants nothing to do with you.';
        else if (mtmp.mhp < Math.trunc(mtmp.mhpmax / 4))
            pline_msg = 'moans.';
        else if (mtmp.mconf || mtmp.mstun)
            verbl_msg = !rn2(3) ? 'Huh?' : rn2(2) ? 'What?' : 'Eh?';
        else if (!mtmp.mcansee)
            verbl_msg = "I can't see!";
        else if (mtmp.mtrapped) {
            const trap = t_at(mtmp.mx, mtmp.my);
            if (trap)
                trap.tseen = true;
            verbl_msg = "I'm trapped!";
        } else if (mtmp.mhp < Math.trunc(mtmp.mhpmax / 2))
            pline_msg = 'asks for a potion of healing.';
        else if (mtmp.mtame && !mtmp.isminion
                 && game.moves > (edog.hungrytime || 0))
            verbl_msg = "I'm hungry.";
        else if (is_elf(ptr))
            pline_msg = 'curses orcs.';
        else if (is_dwarf(ptr))
            pline_msg = 'talks about mining.';
        else if (ptr.mflags2 & MFLAGS.M2_MAGIC)
            pline_msg = 'talks about spellcraft.';
        else if (ptr.mlet === MONSYMS.S_CENTAUR)
            pline_msg = 'discusses hunting.';
        else if (is_gnome(ptr)) {
            const plan = Hallucination() ? rn2(4) : 0;
            verbl_msg = plan === 1
                ? 'Phase one, collect underpants.'
                : plan === 3
                    ? 'Phase three, profit!'
                    : 'Many enter the dungeon, and few return to the sunlit lands.';
        } else if (mtmp.mnum === PMNAMES.PM_HOBBIT) {
            pline_msg = (mtmp.mhp < mtmp.mhpmax
                         && (mtmp.mhpmax <= 10
                             || mtmp.mhp <= mtmp.mhpmax - 10))
                ? 'complains about unpleasant dungeon conditions.'
                : 'asks you about the One Ring.';
        } else if (mtmp.mnum === PMNAMES.PM_ARCHEOLOGIST) {
            pline_msg = 'describes a recent article in "Spelunker Today" magazine.';
        } else if (mtmp.mnum === PMNAMES.PM_TOURIST) {
            verbl_msg = 'Aloha.';
        } else {
            pline_msg = 'discusses dungeon exploration.';
        }
        break;
    case MSOUND.MS_SEDUCE:
        if (ptr.mlet !== MONSYMS.S_NYMPH) {
            const { could_seduce, doseduce } = await import('./mhitu.js');
            if (could_seduce(mtmp, game.youmonst, null) === 1) {
                await doseduce(mtmp);
                break;
            }
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
    case MSOUND.MS_ARREST:
        if (mtmp.mpeaceful)
            verbl_msg = `Just the facts, ${game.flags?.female ? "Ma'am" : 'Sir'}.`;
        else
            verbl_msg = [
                'Anything you say can be used against you.',
                "You're under arrest!",
                'Stop in the name of the Law!',
            ][rn2(3)];
        break;
    case MSOUND.MS_BRIBE:
        if (mtmp.mpeaceful && !mtmp.mtame) {
            note_unported_sounds('domonnoise:demon_talk');
            break;
        }
        /* FALLTHRU */
    case MSOUND.MS_CUSS:
        if (!mtmp.mpeaceful) {
            const { cuss } = await import('./wizard.js');
            await cuss(mtmp);
        } else if (is_lawful_minion(mtmp)) {
            verbl_msg = "It's not too late.";
        } else {
            verbl_msg = "We're all doomed.";
        }
        break;
    case MSOUND.MS_SPELL:
        pline_msg = 'seems to mutter a cantrip.';
        break;
    case MSOUND.MS_NURSE:
        verbl_msg_mcan = 'I hate this job!';
        if (game.u.uwep
            && (game.u.uwep.oclass === OCLASSES.WEAPON_CLASS
                || is_weptool(game.u.uwep, game.objects)))
            verbl_msg = 'Put that weapon away before you hurt someone!';
        else if (game.u.uarmc || game.u.uarm || game.u.uarmh
                 || game.u.uarms || game.u.uarmg || game.u.uarmf)
            verbl_msg = game.urole?.mnum === PMNAMES.PM_HEALER
                ? "Doc, I can't help you unless you cooperate."
                : 'Please undress so I can examine you.';
        else if (game.u.uarmu)
            verbl_msg = 'Take off your shirt, please.';
        else
            verbl_msg = "Relax, this won't hurt a bit.";
        break;
    case MSOUND.MS_GUARD: {
        const { money_cnt } = await import('./invent.js');
        verbl_msg = money_cnt(game.invent) ? 'Please drop that gold and follow me.'
                                          : 'Please follow me.';
        break;
    }
    case MSOUND.MS_SOLDIER:
        verbl_msg = (mtmp.mpeaceful ? [
            "What lousy pay we're getting here!",
            "The food's not fit for Orcs!",
            "My feet hurt, I've been on them all day!",
        ] : [
            'Resistance is useless!',
            "You're dog meat!",
            'Surrender!',
        ])[rn2(3)];
        break;
    case MSOUND.MS_DJINNI:
        if (mtmp.mtame)
            verbl_msg = "Sorry, I'm all out of wishes.";
        else if (mtmp.mpeaceful) {
            if (mtmp.mnum === PMNAMES.PM_WATER_DEMON)
                pline_msg = 'gurgles.';
            else
                verbl_msg = "I'm free!";
        } else if (mtmp.mnum !== PMNAMES.PM_PRISONER)
            verbl_msg = 'This will teach you not to disturb me!';
        else
            verbl_msg = 'Get me out of here.';
        break;
    case MSOUND.MS_RIDER: {
        const notice = mtmp.mnum === PMNAMES.PM_DEATH
            ? death_novel_notice() : null;
        if (notice) {
            verbl_msg = notice;
        } else if (mtmp.mnum === PMNAMES.PM_DEATH && rn2(3)) {
            verbl_msg = death_quote();
        } else if (mtmp.mnum === PMNAMES.PM_DEATH && !rn2(10)) {
            pline_msg = 'is busy reading a copy of Sandman #8.';
        } else {
            verbl_msg = 'Who do you think you are, War?';
        }
        break;
    }
    default:
        note_unported_sounds(`domonnoise:msound=${msound}`);
        break;
    }

    if (pline_msg)
        await pline(`${Monnam(mtmp)} ${pline_msg}`);
    else if (mtmp.mcan && verbl_msg_mcan)
        await pline(`"${verbl_msg_mcan}"`);
    else if (verbl_msg)
        await pline(mtmp.mnum === PMNAMES.PM_DEATH
            ? verbl_msg.toUpperCase() : `"${verbl_msg}"`);
    return ECMD_TIME;
}

function role_guardian_num() {
    const raw = game.urole?.guardnum;
    return typeof raw === 'string' ? PMNAMES[raw] : raw;
}

function guardian_role_sound(mnum) {
    const roles = new Map([
        [PMNAMES.PM_STUDENT, PMNAMES.PM_ARCHEOLOGIST],
        [PMNAMES.PM_CHIEFTAIN, PMNAMES.PM_BARBARIAN],
        [PMNAMES.PM_NEANDERTHAL, PMNAMES.PM_CAVE_DWELLER],
        [PMNAMES.PM_ATTENDANT, PMNAMES.PM_HEALER],
        [PMNAMES.PM_PAGE, PMNAMES.PM_KNIGHT],
        [PMNAMES.PM_ABBOT, PMNAMES.PM_MONK],
        [PMNAMES.PM_ACOLYTE, PMNAMES.PM_CLERIC],
        [PMNAMES.PM_HUNTER, PMNAMES.PM_RANGER],
        [PMNAMES.PM_THUG, PMNAMES.PM_ROGUE],
        [PMNAMES.PM_ROSHI, PMNAMES.PM_SAMURAI],
        [PMNAMES.PM_GUIDE, PMNAMES.PM_TOURIST],
        [PMNAMES.PM_APPRENTICE, PMNAMES.PM_WIZARD],
        [PMNAMES.PM_WARRIOR, PMNAMES.PM_VALKYRIE],
    ]);
    return game.mons[roles.get(mnum) ?? mnum]?.msound
        ?? MSOUND.MS_SILENT;
}

function is_lawful_minion(mtmp) {
    if (!(game.mons[mtmp.mnum].mflags2 & MFLAGS.M2_MINION))
        return false;
    const alignment = mtmp.isminion
        ? (mtmp.emin?.min_align ?? mtmp.mextra?.emin?.min_align)
        : game.mons[mtmp.mnum].maligntyp;
    return alignment === A_LAWFUL;
}

function death_novel_notice() {
    const tribute = ((game.context ||= {}).tribute ||= {});
    if (tribute.Deathnotice)
        return false;
    const book = (game.invent || []).find((obj) => obj.otyp === ONAMES.SPE_NOVEL);
    if (!book)
        return false;
    const box = { idx: book.novelidx };
    const title = noveltitle(box);
    book.novelidx = box.idx;
    tribute.Deathnotice = true;
    const misquoted = title.toLowerCase() !== 'snuff'
        && title.toLowerCase() !== 'the wee free men';
    return `Ah, so you have a copy of /${title}/.${
        misquoted ? '  I may have been misquoted there.' : ''}`;
}

const death_quotes = [
    'WHERE THE FIRST PRIMAL CELL WAS, THERE WAS I ALSO.  WHERE MAN IS, THERE AM I.  WHEN THE LAST LIFE CRAWLS UNDER FREEZING STARS, THERE WILL I BE.',
    'I AM DEATH, NOT TAXES.  /I/ TURN UP ONLY ONCE.',
    'THINK OF IT MORE AS BEING ... DIMENSIONALLY DISADVANTAGED.',
    'I MAY HAVE ALLOWED MYSELF SOME FLICKER OF EMOTION IN THE RECENT PAST, BUT I CAN GIVE IT UP ANY TIME I LIKE.',
    'HAVE YOU SPOKEN TO RONNIE LATELY?',
    'PLEASE DO NOT PANIC.  YOU ARE MERELY DEAD.',
    'THERE IS A LITTLE CONFUSION AT FIRST.  IT IS ONLY TO BE EXPECTED.',
    'THERE IS ALWAYS TIME FOR ANOTHER LAST MINUTE.',
    'MUSTARD IS ALWAYS TRICKY.',
    "PICKLES OF ALL SORTS DON'T SEEM TO MAKE IT.  I'M SORRY.",
    "IT WON'T HURT A BIT.",
    'SHALL WE GO?',
    'I HAVE COME FOR THEE.',
    "DARK IN HERE, ISN'T IT?",
    'THERE IS NO GOING BACK.  THERE IS NO GOING BACK.',
    "I HAVEN'T GOT ALL DAY, YOU KNOW.",
    'LIFE IS FOR THE LIVING.',
    'NO-ONE EVER WANTED TO TALK TO ME BEFORE.',
    "I HAVEN'T GOT A SINGLE FRIEND.  EVEN CATS FIND ME AMUSING.",
    "YOU'RE ONLY PUTTING OFF THE INEVITABLE.",
    "I SAID WAS.  IT'S CALLED THE PAST TENSE.  YOU'LL SOON GET USED TO IT.",
    "DON'T LET IT UPSET YOU.",
    'I CAN SEE THAT YOU HAVE GOT A LOT TO THINK ABOUT.',
    "PERHAPS IT'S TIME TO CALL IT A DAY.",
    "I KNOW WHEN EVERYONE'S HAD ENOUGH.",
    'I HAVE ALWAYS DONE MY DUTY AS I SAW FIT.',
    'I AM NOT KNOWN FOR MY SENSE OF FUN.',
    'I MEAN THAT THERE IS A TIME FOR EVERYONE TO DIE.',
    "JUST BECAUSE SOMETHING IS A METAPHOR DOESN'T MEAN IT CAN'T BE REAL.",
    'I AM ALWAYS ALONE.  BUT JUST NOW I WANT TO BE ALONE BY MYSELF.',
    'I HAD AN APPOINTMENT WITH YOU TONIGHT.',
];

/* src/files.c choose_passage() plus Death_quote(). Death uses object id 1 and
   samples thirty of the thirty-one quotes when initializing its reservoir. */
function death_quote() {
    const novel = (game.context.novel ||= { id: 0, count: 0, pasg: [] });
    if (novel.id !== 1 || novel.count === 0) {
        let idx = 0, range = death_quotes.length, limit = 30;
        novel.id = 1;
        novel.count = 30;
        novel.pasg = Array(30).fill(0);
        for (let i = 0; i < death_quotes.length; i++, range--) {
            if (range > 0 && rn2(range) < limit) {
                novel.pasg[idx++] = i + 1;
                limit--;
            }
        }
    }
    const idx = rn2(novel.count);
    const result = novel.pasg[idx];
    novel.count--;
    novel.pasg[idx] = novel.pasg[novel.count];
    return death_quotes[result - 1];
}

/* src/mondata.c same_race(), restricted to the player races which can turn
   an MS_ORC speaker into MS_HUMANOID here. */
function same_chat_race(pm1, pm2) {
    if (!pm1 || !pm2)
        return false;
    if (pm1 === pm2)
        return true;
    for (const flag of [MFLAGS.M2_HUMAN, MFLAGS.M2_ELF, MFLAGS.M2_DWARF,
                        MFLAGS.M2_GNOME, MFLAGS.M2_ORC]) {
        if (pm1.mflags2 & flag)
            return !!(pm2.mflags2 & flag);
    }
    return false;
}

function unpolymorphed_race() {
    const raw = game.flags?.female ? game.urace?.femalenum
                                   : game.urace?.malenum;
    const pm = typeof raw === 'string' ? PMNAMES[raw] : raw;
    return game.mons[pm] || null;
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
export function growl_sound(mtmp) {
    let ret;

    switch (game.mons[mtmp.mnum].msound) {
    case MSOUND.MS_MEW:
    case MSOUND.MS_HISS:
        ret = "hiss";
        break;
    case MSOUND.MS_BARK:
    case MSOUND.MS_GROWL:
        ret = "growl";
        break;
    case MSOUND.MS_ROAR:
        ret = "roar";
        break;
    case MSOUND.MS_BELLOW:
        ret = "bellow";
        break;
    case MSOUND.MS_BUZZ:
        ret = "buzz";
        break;
    case MSOUND.MS_SQEEK:
        ret = "squeal";
        break;
    case MSOUND.MS_SQAWK:
        ret = "screech";
        break;
    case MSOUND.MS_NEIGH:
        ret = "neigh";
        break;
    case MSOUND.MS_WAIL:
        ret = "wail";
        break;
    case MSOUND.MS_GROAN:
        ret = "groan";
        break;
    case MSOUND.MS_MOO:
        ret = "low";
        break;
    case MSOUND.MS_SILENT:
        ret = "commotion";
        break;
    default:
        ret = "scream";
    }
    return ret;
}

// src/sounds.c:617 cry_sound() -- the small sound vocabulary used when an
// egg recognizes its parent. The caller adds the "ing" suffix.
export function cry_sound(mtmp) {
    const ptr = mtmp.data || game.mons[mtmp.mnum];
    switch (ptr.msound) {
    default:
    case MSOUND.MS_SILENT:
        return ptr.mlet === MONSYMS.S_EEL ? 'gurgle' : 'chitter';
    case MSOUND.MS_HISS:
        return 'hiss';
    case MSOUND.MS_ROAR:
    case MSOUND.MS_GROWL:
        return 'growl';
    case MSOUND.MS_CHIRP:
        return 'chirp';
    case MSOUND.MS_BUZZ:
        return 'buzz';
    case MSOUND.MS_SQAWK:
        return 'screech';
    case MSOUND.MS_GRUNT:
        return 'grunt';
    case MSOUND.MS_MUMBLE:
        return 'mumble';
    }
}

// src/sounds.c:544 maybe_gasp(). The first rn2(5) belongs to the caller;
// this function draws only when the observer's sound class can speak.
export function maybe_gasp(mon) {
    const exclamations = ['Gasp!', 'Uh-oh.', 'Oh my!', 'What?', 'Why?'];
    const ptr = game.mons[mon.mnum];
    let msound = ptr.msound;
    const rawGuard = game.urole?.guardnum;
    const guardnum = typeof rawGuard === 'string' ? PMNAMES[rawGuard] : rawGuard;

    if ((msound === MSOUND.MS_GUARDIAN && mon.mnum !== guardnum)
        || (msound === MSOUND.MS_PRIEST && !game.p_coaligned?.(mon))) {
        msound = MSOUND.MS_SILENT;
    } else if (msound === MSOUND.MS_CUSS && mon.mextra?.emin) {
        const minAlign = mon.emin?.min_align
            ?? mon.mextra.emin.min_align ?? ptr.maligntyp;
        const coaligned = minAlign === game.u.ualign.type;
        if (coaligned ? !mon.mextra.emin.renegade
                      : !!mon.mextra.emin.renegade)
            msound = MSOUND.MS_HUMANOID;
    }

    const always = new Set([
        MSOUND.MS_HUMANOID, MSOUND.MS_ARREST, MSOUND.MS_SOLDIER,
        MSOUND.MS_GUARD, MSOUND.MS_NURSE, MSOUND.MS_SEDUCE,
        MSOUND.MS_LEADER, MSOUND.MS_GUARDIAN, MSOUND.MS_SELL,
        MSOUND.MS_ORACLE, MSOUND.MS_PRIEST, MSOUND.MS_BOAST,
        MSOUND.MS_IMITATE,
    ]);
    const sameKind = new Set([
        MSOUND.MS_ORC, MSOUND.MS_GRUNT, MSOUND.MS_LAUGH,
        MSOUND.MS_ROAR, MSOUND.MS_BELLOW, MSOUND.MS_DJINNI,
        MSOUND.MS_VAMPIRE, MSOUND.MS_WERE, MSOUND.MS_SPELL,
    ]);
    const canGasp = always.has(msound)
        || (sameKind.has(msound)
            && ptr.mlet === (game.youmonst?.data?.mlet
                              ?? game.mons[game.u.umonnum]?.mlet));
    return canGasp ? exclamations[rn2(exclamations.length)] : null;
}

export async function growl(mtmp) {
    let growl_verb = 0;

    if (helpless(mtmp) || game.mons[mtmp.mnum].msound === MSOUND.MS_SILENT)
        return;

    /* presumably nearness and soundok checks have already been made */
    if (Hallucination())
        growl_verb = h_sounds[rn2(h_sounds.length)];
    else
        growl_verb = growl_sound(mtmp);
    if (growl_verb) {
        if (canseemon(mtmp) || !Deaf()) {
            await pline(`${Monnam(mtmp)} ${vtense(null, growl_verb)}!`);
            (game.iflags ||= {}).last_msg = PLNMSG_GROWL;
            if (game.context?.run)
                nomul(0);
        }
        /* OUTSIDE the canseemon check on purpose */
        await wake_nearto(
            mtmp.mx, mtmp.my, game.mons[mtmp.mnum].mlevel * 18);
    }
}

// src/sounds.c yelp() — a pet's yelp when abused. The Soundeffect() calls
// are audio-only and leave no terminal output.
export async function yelp(mtmp) {
    let yelp_verb = 0;

    if (helpless(mtmp) || game.mons[mtmp.mnum].msound === MSOUND.MS_SILENT)
        return;

    /* presumably nearness and soundok checks have already been made */
    if (Hallucination())
        yelp_verb = h_sounds[rn2(h_sounds.length)];
    else
        switch (game.mons[mtmp.mnum].msound) {
        case MSOUND.MS_MEW:
            yelp_verb = !Deaf() ? "yowl" : "arch";
            break;
        case MSOUND.MS_BARK:
        case MSOUND.MS_GROWL:
            yelp_verb = !Deaf() ? "yelp" : "recoil";
            break;
        case MSOUND.MS_ROAR:
            yelp_verb = !Deaf() ? "snarl" : "bluff";
            break;
        case MSOUND.MS_SQEEK:
            yelp_verb = !Deaf() ? "squeal" : "quiver";
            break;
        case MSOUND.MS_SQAWK:
            yelp_verb = !Deaf() ? "screak" : "thrash";
            break;
        case MSOUND.MS_WAIL:
            yelp_verb = !Deaf() ? "wail" : "cringe";
            break;
        }
    if (yelp_verb) {
        await pline(`${Monnam(mtmp)} ${vtense(null, yelp_verb)}!`);
        if (game.context?.run)
            nomul(0);
        await wake_nearto(
            mtmp.mx, mtmp.my, game.mons[mtmp.mnum].mlevel * 12);
    }
}

// src/sounds.c:479 whimper(), the quieter distressed-pet reaction.
export async function whimper(mtmp) {
    let whimper_verb = 0;

    if (helpless(mtmp) || game.mons[mtmp.mnum].msound === MSOUND.MS_SILENT)
        return;

    if (Hallucination())
        whimper_verb = h_sounds[rn2(h_sounds.length)];
    else
        switch (game.mons[mtmp.mnum].msound) {
        case MSOUND.MS_MEW:
        case MSOUND.MS_GROWL:
            whimper_verb = 'whimper';
            break;
        case MSOUND.MS_BARK:
            whimper_verb = 'whine';
            break;
        case MSOUND.MS_SQEEK:
            whimper_verb = 'squeal';
            break;
        }
    if (whimper_verb) {
        await pline(`${Monnam(mtmp)} ${vtense(null, whimper_verb)}.`);
        if (game.context?.run)
            nomul(0);
        await wake_nearto(
            mtmp.mx, mtmp.my, game.mons[mtmp.mnum].mlevel * 6);
    }
}

const note_sounds_unported = (w) => {
    (game.unported ||= new Set()).add('sounds:' + w);
    return 0;
};

// src/sounds.c:33 mon_in_room()
function mon_in_room(mon, rmtyp) {
    const rno = game.level.at(mon.mx, mon.my)?.roomno ?? 0;
    if (rno >= ROOMOFFSET)
        return game.level?.rooms?.[rno - ROOMOFFSET]?.rtype === rmtyp;
    return false;
}

// src/sounds.c:42 throne_mon_sound()
async function throne_mon_sound(mtmp) {
    const ptr = game.mons[mtmp.mnum];
    if ((mtmp.msleeping || is_lord(ptr) || is_prince(ptr))
        && !is_animal(ptr) && mon_in_room(mtmp, COURT)) {
        const throne_msg = [
            'the tones of courtly conversation.',
            'a sceptre pounded in judgment.',
            null,
            "Queen Beruthiel's cats!",
        ];
        const which = rn2(3) + (Hallucination() ? 1 : 0);

        if (which !== 2)
            await You_hear(throne_msg[which]);
        else
            await pline(`Someone shouts "Off with ${game.flags?.female ? 'her' : 'his'} head!"`);
        return true;
    }
    return false;
}

/* include/mondata.h is_mercenary() */
const is_mercenary = (ptr) => (ptr.mflags2 & MFLAGS.M2_MERC) !== 0;

// src/sounds.c:73 beehive_mon_sound()
async function beehive_mon_sound(mtmp) {
    const ptr = game.mons[mtmp.mnum];
    if ((ptr.mlet === MONSYMS.S_ANT && is_flyer(ptr))
        && mon_in_room(mtmp, BEEHIVE)) {
        const hallu = Hallucination() ? 1 : 0;
        switch (rn2(2) + hallu) {
        case 0:
            await You_hear('a low buzzing.');
            break;
        case 1:
            await You_hear('an angry drone.');
            break;
        case 2:
            await You_hear(`bees in your ${worn(W_ARMH) ? '' : '(nonexistent) '}bonnet!`);
            break;
        }
        return true;
    }
    return false;
}

// src/sounds.c:97 morgue_mon_sound()
async function morgue_mon_sound(mtmp) {
    const ptr = game.mons[mtmp.mnum];
    if ((is_undead(ptr) || is_vampshifter(mtmp))
        && mon_in_room(mtmp, MORGUE)) {
        const hallu = Hallucination() ? 1 : 0;
        const hair = body_part(HAIR); /* hair/fur/scales */
        switch (rn2(2) + hallu) {
        case 0:
            await You('suddenly realize it is unnaturally quiet.');
            break;
        case 1:
            await pline_The(`${hair} on the back of your ${body_part(NECK)} ${vtense(hair, 'stand')} up.`);
            break;
        case 2:
            await pline_The(`${hair} on your ${body_part(HEAD)} ${vtense(hair, 'seem')} to stand up.`);
            break;
        }
        return true;
    }
    return false;
}

// src/sounds.c:115 zoo_mon_sound()
async function zoo_mon_sound(mtmp) {
    const ptr = game.mons[mtmp.mnum];
    if ((mtmp.msleeping || is_animal(ptr))
        && mon_in_room(mtmp, ZOO)) {
        const hallu = Hallucination() ? 1 : 0, selection = rn2(2) + hallu;
        const zoo_msg = [
            'a sound reminiscent of an elephant stepping on a peanut.',
            'a sound reminiscent of a seal barking.', 'Doctor Dolittle!',
        ];
        await You_hear(zoo_msg[selection]);
        return true;
    }
    return false;
}

// src/sounds.c:130 temple_priest_sound()
async function temple_priest_sound(mtmp) {
    const epri = mtmp.epri ?? mtmp.mextra?.epri;
    if (!mtmp.ispriest || !epri)
        return false;
    const { inhistemple } = await import('./monmove.js');
    if (inhistemple(mtmp) && !helpless(mtmp)
        && temple_occupied(game.u.urooms) !== epri.shroom) {
        const temple_msg = [
            '*someone praising %s.', '*someone beseeching %s.',
            '#an animal carcass being offered in sacrifice.',
            '*a strident plea for donations.',
        ];
        const hallu = Hallucination() ? 1 : 0;
        const speechless = game.mons[mtmp.mnum].msound <= MSOUND.MS_ANIMAL;
        const in_sight = canseemon(mtmp)
            || cansee(epri.shrpos.x, epri.shrpos.y);
        let msg;
        let trycount = 0;
        do {
            msg = temple_msg[rn2(3 + hallu)];
            if (msg.includes('*') && speechless)
                continue;
            if (msg.includes('#') && in_sight)
                continue;
            break;
        } while (++trycount < 50);

        msg = msg.replace(/^[^A-Za-z]*/, '');
        if (msg.includes('%')) {
            const { halu_gname } = await import('./pray.js');
            await You_hear(msg.replace('%s', halu_gname(epri.shralign)));
        } else {
            await You_hear(msg);
        }
        return true;
    }
    return false;
}

// src/priest.c:142 temple_occupied()
function temple_occupied(urooms) {
    for (const ch of urooms || '') {
        if (game.level?.rooms?.[ch.charCodeAt(0) - ROOMOFFSET]?.rtype
            === TEMPLE)
            return ch.charCodeAt(0);
    }
    return 0;
}

// src/sounds.c:180 oracle_sound()
async function oracle_sound(mtmp) {
    if (mtmp.mnum !== PMNAMES.PM_ORACLE)
        return false;

    if (Hallucination() || !canseemon(mtmp)) {
        const hallu = Hallucination() ? 1 : 0;
        const ora_msg = [
            'a strange wind.',
            'convulsive ravings.',
            'snoring snakes.',
            'someone say "No more woodchucks!"',
            'a loud ZOT!',
        ];
        await You_hear(ora_msg[rn2(3) + hallu * 2]);
    }
    return true;
}
