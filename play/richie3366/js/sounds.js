// sounds.js — Ambient sounds and #chat.
// C ref: sounds.c — dosounds / dotalk / dochat / domonnoise (MS_BARK
//         subset + MS_HUMANOID D-1618 / mplayer_talk D-1606 /
//         MS_BOAST D-1626 / MS_RIDER Death tribute D-1653) + yelp /
//         growl (pet abuse; D-0836);
//         set_voice (D-1752; !SND_SPEECH no-op). SetVoice is sndprocs.h.
//         sound_speak (D-1761; !SND_SPEECH no-op). SoundSpeak is sndprocs.h.
//         maybe_gasp (D-1762); beg (D-1763);
//         maybe_play_sound (D-1807; USER_SOUNDS compiled out);
//         domonnoise remaps + MS_ORACLE/PRIEST/SELL (D-1808) +
//         MS_WERE/BARK FULL_MOON + animal MS_MEW..MS_ORC (D-1969) +
//         MS_VAMPIRE / MS_DJINNI / MS_ARREST / MS_SOLDIER (D-1977) +
//         MS_BRIBE / MS_CUSS / MS_SPELL (D-1978) +
//         MS_NURSE / MS_GUARD (this D).

import { game } from './gstate.js';
import {
    pline, canseemon, canspotmon, verbalize, Hallucination, map_invisible,
    glyph_at, glyph_to_mon,
} from './display.js';
import { getdir } from './lock.js';
import { mon_at } from './uhitm.js';
import { Monnam, pmname } from './do_name.js';
import { objects_at, noveltitle } from './mkobj.js';
import { Death_quote } from './files.js';
import { u_have_novel, currency } from './invent.js';
import { objectNames } from './generated/objects_data.js';
import { COIN_CLASS, WEAPON_CLASS } from './objects.js';
import { rn2 } from './rng.js';
import { dist2, ucase } from './hacklib.js';
import { vtense, an } from './objnam.js';
import { nomul } from './hack.js';
import {
    is_animal, is_flyer, is_lord, is_prince, is_mercenary, is_undead,
    is_mplayer, is_elf, is_dwarf, is_gnome, likes_magic, monsterNames,
    mons, G_UNIQ, carnivorous, herbivorous,
} from './monsters.js';
import {
    ECMD_OK, ECMD_TIME, ECMD_CANCEL, isok, IS_WALL, SDOOR, SIZE,
    ANY_SHOP, ANY_TYPE, OROOM, SHOPBASE, ROOMOFFSET, VAULT,
    COURT, BEEHIVE, MORGUE, BARRACKS, ZOO,
    ESHK, EMIN, has_emin, Is_astralevel, Is_oracle_level, In_endgame,
    STRAT_WAITMASK, PLNMSG_GROWL, FULL_MOON, Upolyd, BLOOD,
    FEMALE, MALE,
} from './const.js';
import { body_part } from './polyself.js';
import { night, midnight } from './calendar.js';
import { aggravate, cuss } from './wizard.js';
import { is_lminion } from './teleport.js';
import { mplayer_talk } from './mplayer.js';
import { vault_occupied, findgd } from './vault.js';
import { t_at } from './trap.js';
import { same_race } from './mondata.js';
import { mhis } from './fountain.js';
import { could_seduce, SYSOPT_SEDUCE } from './mhitm.js';
import { doseduce } from './mhitu.js';
import { SetVoice, voice_death } from './sndprocs.js';
import { p_coaligned, priest_talk } from './priest.js';
import { genus } from './mon.js';
import { doconsult } from './rumors.js';
import { shk_chat, money_cnt } from './shk.js';
import { is_weptool } from './wield.js';
import { PM_HEALER } from './generated/monsters_data.js';

/**
 * C ref: sounds.c set_voice `:2160–2182`. Body is `#ifdef SND_SPEECH`;
 * contest C has no SND_SPEECH (`SPEECHONLY UNUSED`), so this is a
 * no-op. Direct callers: shk.c `u_entered_shop` welcome / `addtobill`
 * quotes. `SetVoice` (sndprocs.h) does not call this without SND_LIB.
 */
export function set_voice(mtmp, tone, volume, moreinfo) {
    void mtmp;
    void tone;
    void volume;
    void moreinfo;
}

/**
 * C ref: sounds.c maybe_play_sound `:1658–1673` (`#ifdef USER_SOUNDS`).
 * macosx-minimal has no `-DUSER_SOUNDS`, so C `vpline` does not call
 * this. When USER_SOUNDS is on, the first check is
 * `soundprocs.sound_play_usersound`; contest has no SND_LIB so that
 * pointer is null and the soundmap regex walk never runs.
 * Named: SOUND= / `add_sound_mapping` / `sound_matches_message`.
 */
export function maybe_play_sound(msg) {
    void msg;
}

/**
 * C ref: sounds.c sound_speak `:2184–2220`. Body is `#ifdef SND_SPEECH`;
 * contest C has no SND_SPEECH, so this is a no-op. Direct caller:
 * `domonnoise` MS_RIDER Death after `SetVoice` (`:1235`; tmpbuf is the
 * ucased line already passed to `pline1`). `cmd.c` yn_function
 * `sound_speak(query)` is `#ifdef SND_SPEECH` (compiled out).
 * `SoundSpeak` (sndprocs.h `:275`) does not call this without SND_LIB.
 */
export function sound_speak(text) {
    void text;
}

const STATUE = objectNames.indexOf('STATUE');
const PM_ORACLE = monsterNames.indexOf('PM_ORACLE');
const PM_HOBBIT = monsterNames.indexOf('PM_HOBBIT');
const PM_ARCHEOLOGIST = monsterNames.indexOf('PM_ARCHEOLOGIST');
const PM_TOURIST = monsterNames.indexOf('PM_TOURIST');
const PM_DEATH = monsterNames.indexOf('PM_DEATH');
const PM_GECKO = monsterNames.indexOf('PM_GECKO');
const PM_LONG_WORM = monsterNames.indexOf('PM_LONG_WORM');
const PM_HUMAN_WERERAT = monsterNames.indexOf('PM_HUMAN_WERERAT');
const PM_DINGO = monsterNames.indexOf('PM_DINGO');
const PM_RAVEN = monsterNames.indexOf('PM_RAVEN');
const PM_VAMPIRE = monsterNames.indexOf('PM_VAMPIRE');
const PM_VAMPIRE_LEADER = monsterNames.indexOf('PM_VAMPIRE_LEADER');
const PM_WOLF = monsterNames.indexOf('PM_WOLF');
const PM_WINTER_WOLF = monsterNames.indexOf('PM_WINTER_WOLF');
const PM_WINTER_WOLF_CUB = monsterNames.indexOf('PM_WINTER_WOLF_CUB');
const PM_SILVER_DRAGON = monsterNames.indexOf('PM_SILVER_DRAGON');
const PM_BABY_SILVER_DRAGON = monsterNames.indexOf('PM_BABY_SILVER_DRAGON');
const PM_WATER_DEMON = monsterNames.indexOf('PM_WATER_DEMON');
const PM_PRISONER = monsterNames.indexOf('PM_PRISONER');

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
 * Async (fountain.js/dokick.js precedent): bfunc may print (zoo_msg).
 * Named omission: mon_offmap edge cases beyond mx/my null.
 * @param {(mtmp: object) => Promise<boolean>|boolean} bfunc
 */
async function get_iter_mons(bfunc) {
    for (const mtmp of game.fmon || []) {
        if (!mtmp || mtmp.mx == null || mtmp.my == null) continue;
        if ((mtmp.mhp | 0) < 1) continue;
        if (await bfunc(mtmp)) return mtmp;
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

/**
 * C ref: sounds.c zoo_mon_sound `:115–128` — (msleeping||animal)+ZOO gate,
 * then selection = rn2(2)+hallu over zoo_msg[3] via You_hear1, TRUE.
 * (No Soundeffect on this arm.)
 */
async function zoo_mon_sound(mtmp) {
    if ((mtmp.msleeping || is_animal(mtmp.data)) && mon_in_room(mtmp, ZOO)) {
        const hallu = Hallucination() ? 1 : 0;
        const zoo_msg = [
            'a sound reminiscent of an elephant stepping on a peanut.',
            'a sound reminiscent of a seal barking.',
            'Doctor Dolittle!',
        ];
        await You_hear(zoo_msg[rn2(2) + hallu]);
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
 * zoo body live (zoo_msg + You_hear); other mon_sound RNG-only.
 * Named omissions: swamp You1; barracks/court/throne/beehive You_hear plines;
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
        if (await get_iter_mons(throne_mon_sound)) return;
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
        if (await get_iter_mons(beehive_mon_sound)) return;
    }
    if (lf.has_morgue && !rn2(200)) {
        if (await get_iter_mons(morgue_mon_sound)) return;
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
        if (await get_iter_mons(zoo_mon_sound)) return;
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
        if (await get_iter_mons(temple_priest_sound)) return;
    }
    if (Is_oracle_level(game.u?.uz) && !rn2(400)) {
        if (await get_iter_mons(oracle_sound)) return;
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
const MS_GURGLE = 15;
const MS_BURBLE = 16;
const MS_TRUMPET = 17;
const MS_ANIMAL = 17;
const MS_SHRIEK = 18;
const MS_BONES = 19;
const MS_LAUGH = 20;
const MS_MUMBLE = 21;
const MS_IMITATE = 22;
const MS_WERE = 23;
const MS_ORC = 24;
const MS_HUMANOID = 25;
const MS_ARREST = 26;
const MS_SOLDIER = 27;
const MS_GUARD = 28;
const MS_DJINNI = 29;
const MS_NURSE = 30;
const MS_SEDUCE = 31;
const MS_VAMPIRE = 32;
const MS_BRIBE = 33;
const MS_CUSS = 34;
const MS_RIDER = 35;
const MS_LEADER = 36;
const MS_NEMESIS = 37;
const MS_GUARDIAN = 38;
const MS_SELL = 39;
const MS_ORACLE = 40;
const MS_PRIEST = 41;
const MS_SPELL = 42;
const MS_BOAST = 43;
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
 * C ref: sounds.c beg `:518–542`. Hungry-pet noise after helpless /
 * diet gate. Caller `dog_hunger` (`dogmove.c` `:383`) is still named
 * omitted from `dog_move`. `is_silent` is the mondata.h one-liner
 * (`msound == MS_SILENT`); do not add a named clone (region.js).
 */
export async function beg(mtmp) {
    if (helpless(mtmp)
        || !(carnivorous(mtmp.data) || herbivorous(mtmp.data))) {
        return;
    }

    /* presumably nearness and soundok checks have already been made */
    const msound = mtmp.data.msound | 0;
    if (msound !== MS_SILENT && msound <= MS_ANIMAL) {
        await domonnoise(mtmp);
    } else if (msound >= MS_HUMANOID) {
        if (!canspotmon(mtmp)) {
            map_invisible(mtmp.mx, mtmp.my);
        }
        SetVoice(mtmp, 0, 80, 0);
        await verbalize("I'm hungry.");
    } else {
        /* this is pretty lame but is better than leaving out the block
           of speech types between animal and humanoid; this covers
           MS_SILENT too (if caller lets that get this far) since it's
           excluded by the first two cases */
        if (canspotmon(mtmp)) {
            await pline(`${Monnam(mtmp)} seems famished.`);
        }
        /* looking famished will be a good trick for a tame skeleton... */
    }
}

/**
 * C ref: sounds.c maybe_gasp `:545–610`. Returns ROLL_FROM(Exclam) or
 * NULL. Caller `peacefuls_respond` (`mon.c` `:4188`, D-1772). JS
 * `mons()` is a fresh permonst so C `mptr != &mons[gu.urole.guardnum]`
 * is mndx (same as `reset_hostility`). Live `p_coaligned` is priest.js
 * (EPRI.shralign / maligntyp; isminion `mon_aligntyp` is that module's
 * body).
 */
export function maybe_gasp(mon) {
    const Exclam = ['Gasp!', 'Uh-oh.', 'Oh my!', 'What?', 'Why?'];
    const mptr = mon?.data;
    if (!mptr) return null;
    let msound = mptr.msound | 0;
    let dogasp = false;

    /* other roles' guardians and cross-aligned priests don't gasp */
    if ((msound === MS_GUARDIAN
            && (mptr.mndx | 0) !== (game.urole?.guardnum | 0))
        || (msound === MS_PRIEST && !p_coaligned(mon))) {
        msound = MS_SILENT;
    } else if (msound === MS_CUSS && has_emin(mon)
        /* co-aligned angels do gasp */
        && (p_coaligned(mon)
            ? !EMIN(mon).renegade : EMIN(mon).renegade)) {
        msound = MS_HUMANOID;
    }

    /*
     * Only called for humanoids so animal noise handling is ignored.
     */
    switch (msound) {
    case MS_HUMANOID:
    case MS_ARREST: /* Kops */
    case MS_SOLDIER: /* solider, watchman */
    case MS_GUARD: /* vault guard */
    case MS_NURSE:
    case MS_SEDUCE: /* nymph, succubus/incubus */
    case MS_LEADER: /* quest leader */
    case MS_GUARDIAN: /* leader's guards */
    case MS_SELL: /* shopkeeper */
    case MS_ORACLE:
    case MS_PRIEST: /* temple priest, roaming aligned priest (not mplayer) */
    case MS_BOAST: /* giants */
    case MS_IMITATE: /* doppelganger, leocrotta, Aleax */
        dogasp = true;
        break;
    /* issue comprehensible word(s) if hero is similar type of creature */
    case MS_ORC: /* used to be synonym for MS_GRUNT */
    case MS_GRUNT: /* ogres, trolls, gargoyles, one or two others */
    case MS_LAUGH: /* leprechaun, gremlin */
    case MS_ROAR: /* dragon, xorn, owlbear */
    case MS_BELLOW: /* crocodile */
    /* capable of speech but only do so if hero is similar type */
    case MS_DJINNI:
    case MS_VAMPIRE: /* vampire in its own form */
    case MS_WERE: /* lycanthrope in human form */
    case MS_SPELL: /* titan, barrow wight, Nazgul, nalfeshnee */
        dogasp = mptr.mlet === game.youmonst?.data?.mlet;
        break;
    /* capable of speech but don't care if you attack peacefuls */
    case MS_BRIBE:
    case MS_CUSS:
    case MS_RIDER:
    case MS_NEMESIS:
    /* can't speak */
    case MS_SILENT:
    default:
        break;
    }
    if (dogasp) {
        return Exclam[rn2(SIZE(Exclam))]; /* [mon->m_id % SIZE(Exclam)]; */
    }
    return null;
}

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
export function growl_sound(mtmp) {
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
 * Hallucination → ROLL_FROM(h_sounds) rn2(35). last_msg PLNMSG_GROWL
 * after the pline (peacefuls_respond exclaimed).
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
            if (!game.iflags) game.iflags = {};
            game.iflags.last_msg = PLNMSG_GROWL;
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

/** C context.h tribute_info.Deathnotice — saved with context. */
function tribute_info() {
    if (!game.context) game.context = {};
    let t = game.context.tribute;
    if (!t) {
        t = { Deathnotice: 0 };
        game.context.tribute = t;
    }
    return t;
}

/** C ref: sounds.c mon_is_gecko `:658–674`. */
function mon_is_gecko(mon) {
    if ((mon?.data?.mndx | 0) === PM_GECKO) return true;
    if ((mon?.data?.mndx | 0) === PM_LONG_WORM) return false;
    return glyph_to_mon(glyph_at(mon.mx, mon.my)) === PM_GECKO;
}

/**
 * C ref: sounds.c domonnoise `:678–1242` (D-1808 remaps + ORACLE/PRIEST/SELL;
 * D-1969 MS_WERE `:823–841` FULL_MOON howl + MS_BARK `:842–860` FULL_MOON
 * fix + animal MS_MEW..MS_ORC `:861–1003` in C order; this D MS_VAMPIRE
 * `:744–821` + MS_DJINNI `:991–1004` + MS_ARREST `:1129–1141` + MS_SOLDIER
 * `:1179–1191` + MS_BRIBE/MS_CUSS `:1142–1156` + MS_SPELL `:1157–1160`
 * in C order (D-1978; demon_talk via minion.js, cuss via wizard.js);
 * this D MS_NURSE `:1160–1172` + MS_GUARD `:1173–1178` in C order.
 * this D epilogue `:1222–1241` incl. the mcan verbl_msg_mcan arm
 * (`:1224–1226`); save-rest oracle_loc lives in rumors.js/save.js.
 * Unknown still ECMD_TIME.
 */
export async function domonnoise(mtmp) {
    if (!mtmp) return ECMD_OK;
    if (game.u?.Deaf) return ECMD_OK;
    const ptr = mtmp.data;
    // C :691–693 is_silent(ptr) && !isshk before remaps (inline
    // mondata.h; do not add a named is_silent clone — region.js).
    if ((ptr?.msound | 0) === MS_SILENT && !mtmp.isshk) return ECMD_OK;

    let msound = ptr?.msound | 0;
    const qs = game.quest_status;
    // C :697–715 remaps: leader, guardian/genus, isshk, orc, moo, gecko.
    if (qs?.leader_m_id
        && (mtmp.m_id | 0) === (qs.leader_m_id | 0)
        && msound > MS_ANIMAL) {
        msound = MS_LEADER;
    } else if (msound === MS_GUARDIAN
        && (ptr?.mndx | 0) !== (game.urole?.guardnum | 0)) {
        msound = mons(genus(ptr.mndx | 0, 1))?.msound | 0;
    } else if (mtmp.isshk) {
        msound = MS_SELL;
    } else if (msound === MS_ORC
        && (same_race(ptr, game.youmonst?.data)
            || same_race(ptr, mons(game.urace?.mnum))
            || Hallucination())) {
        msound = MS_HUMANOID;
    } else if (msound === MS_MOO && !mtmp.mtame) {
        msound = MS_BELLOW;
    } else if (Hallucination() && mon_is_gecko(mtmp)) {
        msound = MS_SELL;
    }

    // C :720–721 before talking (monster may teleport).
    if (!canspotmon(mtmp)) {
        map_invisible(mtmp.mx, mtmp.my);
    }

    let pline_msg = null;
    let verbl_msg = null;
    // C :684 verbl_msg_mcan (cancelled speech). Set by MS_NURSE below;
    // consumed by the `:1224–1226` mcan epilogue arm.
    let verbl_msg_mcan = null;
    const moves = game.moves | 0;
    const hungrytime = mtmp.edog?.hungrytime | 0;

    if (msound === MS_ORACLE) {
        return await doconsult(mtmp);
    }
    if (msound === MS_PRIEST) {
        await priest_talk(mtmp);
        return ECMD_TIME;
    }
    if (msound === MS_LEADER || msound === MS_NEMESIS
        || msound === MS_GUARDIAN) {
        const { quest_chat } = await import('./quest.js');
        await quest_chat(mtmp);
        return ECMD_TIME;
    }

    if (msound === MS_SELL) {
        // C :734–743 Hallu GEICO unless silent or isshk && !rn2(2).
        if (!Hallucination() || (ptr?.msound | 0) === MS_SILENT
            || (mtmp.isshk && !rn2(2))) {
            await shk_chat(mtmp);
        } else {
            verbl_msg = `15 minutes could save you 15 ${currency(15)}.`;
        }
    } else if (msound === MS_VAMPIRE) {
        // C sounds.c MS_VAMPIRE `:744–821` — tame/peaceful/hostile speech
        // varied by night, kindred (Upolyd vampire) and nightchild
        // (Upolyd wolf). night()/midnight() are pure time checks;
        // the only RNG is hostile-stranger rn2(SIZE(vampmsg)) with
        // exactly 2 entries, so the fallthrough third arm is unreachable.
        const isnight = night();
        const umonnum = game.u?.umonnum | 0;
        const upolyd = Upolyd(game.u);
        const kindred = upolyd
            && (umonnum === PM_VAMPIRE || umonnum === PM_VAMPIRE_LEADER);
        const nightchild = upolyd
            && (umonnum === PM_WOLF || umonnum === PM_WINTER_WOLF
                || umonnum === PM_WINTER_WOLF_CUB);
        const urind = game.urace?.individual || {};
        const racenoun = (game.flags?.female && urind.f)
            ? urind.f
            : urind.m
              ? urind.m
              : (game.urace?.noun || 'human');
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
            if (kindred && isnight) {
                verbl_msg = `Good feeding ${game.flags?.female ? 'sister' : 'brother'}!`;
            } else if (nightchild && isnight) {
                verbl_msg = 'How nice to hear you, child of the night!';
            } else {
                verbl_msg = 'I only drink... potions.';
            }
        } else {
            // C compares gy.youmonst.data against &mons[] pointers;
            // JS mons() is fresh per call so compare mndx instead.
            const yomndx = game.youmonst?.data?.mndx | 0;
            if (kindred) {
                verbl_msg = 'This is my hunting ground'
                    + ' that you dare to prowl!';
            } else if (yomndx === PM_SILVER_DRAGON
                    || yomndx === PM_BABY_SILVER_DRAGON) {
                // Silver dragons are silver in color, not made of silver.
                verbl_msg = `${yomndx === PM_SILVER_DRAGON ? 'Fool' : 'Young Fool'}!`
                    + '  Your silver sheen does not frighten me!';
            } else if (rn2(2) === 0) {
                verbl_msg = `I vant to suck your ${body_part(BLOOD)}!`;
            } else {
                verbl_msg = `I vill come after ${
                    upolyd
                        ? an(pmname(mons(umonnum),
                            game.flags?.female ? FEMALE : MALE))
                        : an(racenoun)} without regret!`;
            }
        }
    } else if (msound === MS_MOO) {
        // C :895–897 Soundeffect compiled out.
        pline_msg = 'moos.';
    } else if (msound === MS_BELLOW) {
        // C :898–903 Soundeffect compiled out.
        pline_msg = 'bellows!';
    } else if (msound === MS_WERE) {
        // C sounds.c MS_WERE `:824–841` — FULL_MOON && (night() ^ !rn2(13))
        // immediate howl/shriek pline + wake_nearto(11*11), else whisper.
        // Soundeffect compiled out (no SND_LIB). Short-circuit preserves RNG.
        if (((game.flags?.moonphase | 0) === FULL_MOON)
            && (night() ^ !rn2(13))) {
            await pline(
                `${Monnam(mtmp)} throws back ${mhis(mtmp)} head and lets out a blood curdling ${((ptr?.mndx | 0) === PM_HUMAN_WERERAT) ? 'shriek' : 'howl'}!`,
            );
            await wake_nearto(mtmp.mx, mtmp.my, 11 * 11);
        } else {
            pline_msg = 'whispers inaudibly.  All you can make out is "moon".';
        }
    } else if (msound === MS_BARK) {
        // C sounds.c MS_BARK `:842–860` — FULL_MOON && night() howls;
        // peaceful whines/yips/barks (dingos do not bark), else growls.
        if (((game.flags?.moonphase | 0) === FULL_MOON) && night()) {
            pline_msg = 'howls.';
        } else if (mtmp.mpeaceful) {
            if (mtmp.mtame
                && (mtmp.mconf || mtmp.mflee || mtmp.mtrapped
                    || moves > hungrytime || (mtmp.mtame | 0) < 5)) {
                pline_msg = 'whines.';
            } else if (mtmp.mtame && hungrytime > moves + 1000) {
                pline_msg = 'yips.';
            } else if (((ptr?.mndx | 0) !== PM_DINGO)) {
                pline_msg = 'barks.';
            }
        } else {
            pline_msg = 'growls.';
        }
    } else if (msound === MS_MEW && mtmp.mtame) {
        // C sounds.c MS_MEW `:861–883` tame yowl/meow/purr/mew (Soundeffect
        // compiled out). Untame FALLTHROUGH to GROWL below.
        if (mtmp.mconf || mtmp.mflee || mtmp.mtrapped
            || (mtmp.mtame | 0) < 5) {
            pline_msg = 'yowls.';
        } else if (moves > hungrytime) {
            pline_msg = 'meows.';
        } else if (hungrytime > moves + 1000) {
            pline_msg = 'purrs.';
        } else {
            pline_msg = 'mews.';
        }
    } else if (msound === MS_GROWL || msound === MS_MEW) {
        // C sounds.c MS_GROWL `:884–888` (incl. untame MS_MEW FALLTHROUGH).
        // Soundeffect compiled out.
        pline_msg = mtmp.mpeaceful ? 'snarls.' : 'growls!';
    } else if (msound === MS_ROAR) {
        // C sounds.c MS_ROAR `:889–893`. Soundeffect compiled out.
        pline_msg = mtmp.mpeaceful ? 'snarls.' : 'roars!';
    } else if (msound === MS_SQEEK) {
        // C sounds.c MS_SQEEK `:894–897`. Soundeffect compiled out.
        pline_msg = 'squeaks.';
    } else if (msound === MS_SQAWK) {
        // C sounds.c MS_SQAWK `:898–905` — hostile raven Nevermore, else squawk.
        if (((ptr?.mndx | 0) === PM_RAVEN) && !mtmp.mpeaceful) {
            verbl_msg = 'Nevermore!';
        } else {
            pline_msg = 'squawks.';
        }
    } else if (msound === MS_HISS) {
        // C sounds.c MS_HISS `:906–913` — hostile hisses, peaceful silent ECMD_OK.
        if (!mtmp.mpeaceful) {
            pline_msg = 'hisses!';
        } else {
            return ECMD_OK;
        }
    } else if (msound === MS_BUZZ) {
        // C sounds.c MS_BUZZ `:914–917`. Soundeffect compiled out.
        pline_msg = mtmp.mpeaceful ? 'drones.' : 'buzzes angrily.';
    } else if (msound === MS_GRUNT) {
        // C sounds.c MS_GRUNT `:918–921`. Soundeffect compiled out.
        pline_msg = 'grunts.';
    } else if (msound === MS_NEIGH) {
        // C sounds.c MS_NEIGH `:922–933` — mtame<5 neighs, hungry whinnies,
        // else whickers. Soundeffect compiled out.
        if ((mtmp.mtame | 0) < 5) {
            pline_msg = 'neighs.';
        } else if (moves > hungrytime) {
            pline_msg = 'whinnies.';
        } else {
            pline_msg = 'whickers.';
        }
    } else if (msound === MS_CHIRP) {
        // C sounds.c MS_CHIRP `:941–944`. Soundeffect compiled out.
        pline_msg = 'chirps.';
    } else if (msound === MS_WAIL) {
        // C sounds.c MS_WAIL `:945–948`. Soundeffect compiled out.
        pline_msg = 'wails mournfully.';
    } else if (msound === MS_GROAN) {
        // C sounds.c MS_GROAN `:949–954` — silent unless !rn2(3).
        if (!rn2(3)) {
            pline_msg = 'groans.';
        }
    } else if (msound === MS_GURGLE) {
        // C sounds.c MS_GURGLE `:955–958`. Soundeffect compiled out.
        pline_msg = 'gurgles.';
    } else if (msound === MS_BURBLE) {
        // C sounds.c MS_BURBLE `:959–962`. Soundeffect compiled out.
        pline_msg = 'burbles.';
    } else if (msound === MS_TRUMPET) {
        // C sounds.c MS_TRUMPET `:963–968` — pline_msg then wake_nearto
        // before the epilogue print. Soundeffect compiled out.
        pline_msg = 'trumpets!';
        await wake_nearto(mtmp.mx, mtmp.my, 11 * 11);
    } else if (msound === MS_SHRIEK) {
        // C sounds.c MS_SHRIEK `:969–974` — pline_msg then aggravate()
        // before the epilogue print. Soundeffect compiled out.
        pline_msg = 'shrieks.';
        aggravate();
    } else if (msound === MS_IMITATE) {
        // C sounds.c MS_IMITATE `:975–977`.
        pline_msg = 'imitates you.';
    } else if (msound === MS_BONES) {
        // C sounds.c MS_BONES `:978–988` — immediate rattle pline + You
        // freeze + nomul(-2) + multi_reason, then silent ECMD_TIME.
        // Soundeffect compiled out.
        await pline(`${Monnam(mtmp)} rattles noisily.`);
        await pline('You freeze for a moment.');
        nomul(-2);
        game.multi_reason = 'scared by rattling';
        game.nomovemsg = 0;
        return ECMD_TIME;
    } else if (msound === MS_LAUGH) {
        // C sounds.c MS_LAUGH `:989–996` laugh_msg[rn2(4)].
        // Soundeffect compiled out.
        const laugh_msg = ['giggles.', 'chuckles.', 'snickers.', 'laughs.'];
        pline_msg = laugh_msg[rn2(4)];
    } else if (msound === MS_MUMBLE) {
        // C sounds.c MS_MUMBLE `:997–999`.
        pline_msg = 'mumbles incomprehensibly.';
    } else if (msound === MS_ORC) {
        // C sounds.c MS_ORC `:1000–1003` (distinct from GRUNT since 3.6).
        // Soundeffect compiled out.
        pline_msg = 'grunts.';
    } else if (msound === MS_DJINNI) {
        // C sounds.c MS_DJINNI `:991–1004` — tame out of wishes;
        // peaceful water demon gurgles else freedom; hostile threat
        // unless the prisoner (already vague about its cell).
        if (mtmp.mtame) {
            verbl_msg = "Sorry, I'm all out of wishes.";
        } else if (mtmp.mpeaceful) {
            if ((ptr?.mndx | 0) === PM_WATER_DEMON) {
                pline_msg = 'gurgles.';
            } else {
                verbl_msg = "I'm free!";
            }
        } else if ((ptr?.mndx | 0) !== PM_PRISONER) {
            verbl_msg = 'This will teach you not to disturb me!';
        } else {
            verbl_msg = 'Get me out of here.';
        }
    } else if (msound === MS_SEDUCE) {
        // C sounds.c MS_SEDUCE :1106–1128 — SYSOPT default on;
        // non-nymph could_seduce==1 → doseduce then break (ECMD_TIME).
        let swval;
        if (SYSOPT_SEDUCE()) {
            if (ptr?.mlet !== 'S_NYMPH'
                && could_seduce(mtmp, game.youmonst, null) === 1) {
                await doseduce(mtmp);
                return ECMD_TIME;
            }
            swval = (poly_gender() !== (mtmp.female | 0)) ? rn2(3) : 0;
        } else {
            swval = (poly_gender() === 0) ? rn2(3) : 0;
        }
        if (swval === 2) verbl_msg = 'Hello, sailor.';
        else if (swval === 1) pline_msg = 'comes on to you.';
        else pline_msg = 'cajoles you.';
    } else if (msound === MS_ARREST) {
        // C sounds.c MS_ARREST `:1129–1141` — peaceful states the
        // facts (immediate verbalize in C; the epilogue's
        // SetVoice+verbalize is identical since SetVoice is a
        // !SND_LIB no-op), hostile picks arrest_msg[rn2(3)].
        if (mtmp.mpeaceful) {
            verbl_msg = `Just the facts, ${game.flags?.female ? "Ma'am" : 'Sir'}.`;
        } else {
            const arrest_msg = [
                'Anything you say can be used against you.',
                "You're under arrest!",
                'Stop in the name of the Law!',
            ];
            verbl_msg = arrest_msg[rn2(3)];
        }
    } else if (msound === MS_BRIBE || msound === MS_CUSS) {
        // C sounds.c MS_BRIBE `:1142–1145` — peaceful untame demons
        // haggle via demon_talk, then break; otherwise FALLTHROUGH into
        // MS_CUSS `:1146–1156` — hostile cuss, minion patience, or doom.
        // demon_talk rides a dynamic import like quest_chat above (same
        // 90-module SCC, no new static edge); cuss is the wizard.js
        // export (module already imported for aggravate).
        if (msound === MS_BRIBE && mtmp.mpeaceful && !mtmp.mtame) {
            const { demon_talk } = await import('./minion.js');
            await demon_talk(mtmp);
        } else if (!mtmp.mpeaceful) {
            await cuss(mtmp);
        } else if (is_lminion(mtmp)) {
            verbl_msg = "It's not too late.";
        } else {
            verbl_msg = "We're all doomed.";
        }
    } else if (msound === MS_SPELL) {
        // C sounds.c MS_SPELL `:1157–1160` — deliberately vague, since
        // no spell is actually cast.
        pline_msg = 'seems to mutter a cantrip.';
    } else if (msound === MS_NURSE) {
        // C sounds.c MS_NURSE `:1160–1172` — cancelled line plus the
        // wielded-weapon / worn-armor / shirt / relax ladder. uwep is
        // u.uwep; uarm* are u.uarm* (do_wear.js); Role_if(PM_HEALER) is
        // urole.mnum (potion.js Role_if_healer precedent, local inline
        // to avoid a new static edge); is_weptool is wield.js (hoisted,
        // cycle-safe); verbl_msg_mcan is consumed by the epilogue arm.
        verbl_msg_mcan = 'I hate this job!';
        const uwep = game.u?.uwep;
        const u = game.u || {};
        if (uwep && (uwep.oclass === WEAPON_CLASS || is_weptool(uwep))) {
            verbl_msg = 'Put that weapon away before you hurt someone!';
        } else if (u.uarmc || u.uarm || u.uarmh || u.uarms || u.uarmg || u.uarmf) {
            verbl_msg = ((game.urole?.mnum | 0) === PM_HEALER)
                ? "Doc, I can't help you unless you cooperate."
                : 'Please undress so I can examine you.';
        } else if (u.uarmu) {
            verbl_msg = 'Take off your shirt, please.';
        } else {
            verbl_msg = "Relax, this won't hurt a bit.";
        }
    } else if (msound === MS_GUARD) {
        // C sounds.c MS_GUARD `:1173–1178` — gold-carrying heroes are
        // told to drop it first. money_cnt(game.invent) is shk.js
        // (already imported for shk_chat; first COIN_CLASS quan).
        if (money_cnt(game.invent)) {
            verbl_msg = 'Please drop that gold and follow me.';
        } else {
            verbl_msg = 'Please follow me.';
        }
    } else if (msound === MS_SOLDIER) {
        // C sounds.c MS_SOLDIER `:1179–1191` — foe/pax tables by
        // mpeaceful, each picked with rn2(3).
        const soldier_foe_msg = [
            'Resistance is useless!',
            "You're dog meat!",
            'Surrender!',
        ];
        const soldier_pax_msg = [
            "What lousy pay we're getting here!",
            "The food's not fit for Orcs!",
            "My feet hurt, I've been on them all day!",
        ];
        verbl_msg = mtmp.mpeaceful
            ? soldier_pax_msg[rn2(3)]
            : soldier_foe_msg[rn2(3)];
    } else if (msound === MS_BOAST && !mtmp.mpeaceful) {
        // C sounds.c MS_BOAST :1006–1023 (D-1626). Hostile giants
        // rn2(4): 0 immediate pline gem+mhis (epilogue empty,
        // still ECMD_TIME); 1 mutton; default Fee-Fie +
        // wake_nearto(7*7). Peaceful FALLTHROUGH is HUMANOID.
        switch (rn2(4)) {
        case 0:
            await pline(
                `${Monnam(mtmp)} boasts about ${mhis(mtmp)} gem collection.`,
            );
            return ECMD_TIME;
        case 1:
            pline_msg = 'complains about a diet of mutton.';
            break;
        default:
            pline_msg = 'shouts "Fee Fie Foe Foo!" and guffaws.';
            await wake_nearto(mtmp.mx, mtmp.my, 7 * 7);
            break;
        }
    } else if (msound === MS_HUMANOID || msound === MS_BOAST) {
        // C sounds.c MS_HUMANOID :1025–1104 (D-1618). Hostile
        // endgame is_mplayer is D-1606; else "threatens you." then
        // break so hostiles never fall into peaceful chatter.
        // MS_BOAST peaceful FALLTHROUGH (D-1626).
        if (!mtmp.mpeaceful) {
            if (In_endgame(game.u?.uz) && is_mplayer(ptr)) {
                await mplayer_talk(mtmp);
                return ECMD_TIME;
            }
            pline_msg = 'threatens you.';
        } else if (mtmp.mflee) {
            pline_msg = 'wants nothing to do with you.';
        } else if ((mtmp.mhp | 0) < ((mtmp.mhpmax | 0) / 4 | 0)) {
            pline_msg = 'moans.';
        } else if (mtmp.mconf || mtmp.mstun) {
            // C: !rn2(3) ? Huh : rn2(2) ? What : Eh (clang L→R)
            verbl_msg = !rn2(3) ? 'Huh?' : rn2(2) ? 'What?' : 'Eh?';
        } else if (!mtmp.mcansee) {
            verbl_msg = "I can't see!";
        } else if (mtmp.mtrapped) {
            const t = t_at(mtmp.mx, mtmp.my);
            if (t) t.tseen = 1;
            verbl_msg = "I'm trapped!";
        } else if ((mtmp.mhp | 0) < ((mtmp.mhpmax | 0) / 2 | 0)) {
            pline_msg = 'asks for a potion of healing.';
        } else if (mtmp.mtame && !mtmp.isminion
            && moves > (mtmp.edog?.hungrytime | 0)) {
            verbl_msg = "I'm hungry.";
        } else if (is_elf(ptr)) {
            pline_msg = 'curses orcs.';
        } else if (is_dwarf(ptr)) {
            pline_msg = 'talks about mining.';
        } else if (likes_magic(ptr)) {
            pline_msg = 'talks about spellcraft.';
        } else if (ptr?.mlet === 'S_CENTAUR') {
            pline_msg = 'discusses hunting.';
        } else if (is_gnome(ptr)) {
            let gnomeplan = 0;
            // C: Hallucination && (gnomeplan = rn2(4)) % 2 — skip
            // rn2 when !Hallu; odd 1/3 verbalize, even 0/2 dungeon.
            if (Hallucination() && ((gnomeplan = rn2(4)) % 2)) {
                verbl_msg = (gnomeplan === 1)
                    ? 'Phase one, collect underpants.'
                    : 'Phase three, profit!';
            } else {
                verbl_msg = 'Many enter the dungeon,'
                    + ' and few return to the sunlit lands.';
            }
        } else {
            // C monsndx(ptr) ≡ pmidx; JS mons() uses mndx (D-1549).
            const mndx = ptr?.mndx | 0;
            switch (mndx) {
            case PM_HOBBIT:
                pline_msg = ((mtmp.mhp | 0) < (mtmp.mhpmax | 0)
                    && ((mtmp.mhpmax | 0) <= 10
                        || (mtmp.mhp | 0) <= (mtmp.mhpmax | 0) - 10))
                    ? 'complains about unpleasant dungeon conditions.'
                    : 'asks you about the One Ring.';
                break;
            case PM_ARCHEOLOGIST:
                pline_msg =
                    'describes a recent article in "Spelunker Today" magazine.';
                break;
            case PM_TOURIST:
                verbl_msg = 'Aloha.';
                break;
            default:
                pline_msg = 'discusses dungeon exploration.';
                break;
            }
        }
    } else if (msound === MS_RIDER) {
        // C sounds.c MS_RIDER :1193–1218 (D-1653). Death tribute:
        // !Deathnotice && u_have_novel → title + maybe misquoted;
        // else rn2(3) && Death_quote; else !rn2(10) Sandman; else War.
        // Inline fold, not strcmpi clone #3 (vault/write).
        const ms_Death = (ptr?.mndx | 0) === PM_DEATH;
        const trib = tribute_info();
        const verbuf = { s: '' };
        let book = null;
        if (ms_Death && !trib.Deathnotice
            && (book = u_have_novel()) != null) {
            const tribtitle = noveltitle(book);
            if (tribtitle) {
                let line = `Ah, so you have a copy of /${tribtitle}/.`;
                const tlow = String(tribtitle).toLowerCase();
                if (tlow !== 'snuff' && tlow !== 'the wee free men') {
                    line += '  I may have been misquoted there.';
                }
                verbl_msg = line;
            }
            trib.Deathnotice = 1;
        } else if (ms_Death && rn2(3) && await Death_quote(verbuf)) {
            verbl_msg = verbuf.s;
        } else if (ms_Death && !rn2(10)) {
            pline_msg = 'is busy reading a copy of Sandman #8.';
        } else {
            verbl_msg = 'Who do you think you are, War?';
        }
    }
    // C sounds.c `:1222–1241` epilogue — pline_msg, then the cancelled
    // (`:1224–1226` mtmp->mcan) verbl_msg_mcan arm set only by MS_NURSE
    // (`:1161`), then verbl_msg (Death caps + voice_death below).
    if (pline_msg) {
        await pline(`${Monnam(mtmp)} ${pline_msg}`);
        return ECMD_TIME;
    }
    if (mtmp.mcan && verbl_msg_mcan) {
        SetVoice(mtmp, 0, 80, 0);
        await verbalize(verbl_msg_mcan);
        return ECMD_TIME;
    }
    if (verbl_msg) {
        // C: PM_DEATH talks in CAPITAL LETTERS without quotation marks.
        if ((ptr?.mndx | 0) === PM_DEATH) {
            // C: pline1(ucase(strcpy(tmpbuf, verbl_msg))); then
            // SetVoice(0,0,80,voice_death); sound_speak(tmpbuf).
            const tmpbuf = ucase(verbl_msg);
            await pline(tmpbuf);
            SetVoice(null, 0, 80, voice_death);
            sound_speak(tmpbuf);
        } else {
            SetVoice(mtmp, 0, 80, 0);
            await verbalize(verbl_msg);
        }
        return ECMD_TIME;
    }
    return ECMD_TIME;
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
