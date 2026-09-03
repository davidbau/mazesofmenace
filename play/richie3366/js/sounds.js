// sounds.js — Ambient sounds and #chat.
// C ref: sounds.c — dosounds / dotalk / dochat / domonnoise (MS_BARK
//         subset + MS_HUMANOID D-1618 / mplayer_talk D-1606 /
//         MS_BOAST D-1626 / MS_RIDER Death tribute D-1653) + yelp /
//         growl (pet abuse; D-0836);
//         set_voice (D-1752; !SND_SPEECH no-op). SetVoice is sndprocs.h.
//         sound_speak (D-1761; !SND_SPEECH no-op). SoundSpeak is sndprocs.h.
//         maybe_gasp (D-1762); beg (D-1763).

import { game } from './gstate.js';
import {
    pline, canseemon, canspotmon, verbalize, Hallucination, map_invisible,
} from './display.js';
import { getdir } from './lock.js';
import { mon_at } from './uhitm.js';
import { Monnam } from './do_name.js';
import { objects_at, noveltitle } from './mkobj.js';
import { Death_quote } from './files.js';
import { u_have_novel } from './invent.js';
import { objectNames } from './generated/objects_data.js';
import { COIN_CLASS } from './objects.js';
import { rn2 } from './rng.js';
import { dist2, ucase } from './hacklib.js';
import { vtense } from './objnam.js';
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
    STRAT_WAITMASK, PLNMSG_GROWL,
} from './const.js';
import { mplayer_talk } from './mplayer.js';
import { vault_occupied, findgd } from './vault.js';
import { t_at } from './trap.js';
import { same_race } from './mondata.js';
import { mhis } from './fountain.js';
import { could_seduce, SYSOPT_SEDUCE } from './mhitm.js';
import { doseduce } from './mhitu.js';
import { SetVoice, voice_death } from './sndprocs.js';
import { p_coaligned } from './priest.js';

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

/**
 * C ref: sounds.c domonnoise — MS_BARK + MS_SEDUCE + MS_LEADER +
 * MS_HUMANOID (D-1618 peaceful + hostile "threatens you.";
 * D-1606 endgame mplayer_talk) + MS_BOAST hostile giants
 * (D-1626; peaceful FALLTHROUGH into MS_HUMANOID) + MS_RIDER
 * Death tribute (D-1653; u_have_novel / Death_quote / ucase
 * pline). Other MS_* named omitted in C-JS-MAP; unknown →
 * ECMD_OK (silent). FULL_MOON howl needs night() — deferred;
 * falls through to bark. MS_PRIEST priest_talk deferred
 * (non-leader temple priests).
 */
export async function domonnoise(mtmp) {
    if (!mtmp) return ECMD_OK;
    if (game.u?.Deaf) return ECMD_OK;
    let msound = mon_msound(mtmp);
    const ptr = mtmp.data;
    // C: leader_m_id && msound > MS_ANIMAL → MS_LEADER (poly-safe).
    const qs = game.quest_status;
    if (qs?.leader_m_id
        && (mtmp.m_id | 0) === (qs.leader_m_id | 0)
        && msound > MS_ANIMAL) {
        msound = MS_LEADER;
    } else if (msound === MS_ORC
        && (same_race(ptr, game.youmonst?.data)
            || same_race(ptr, mons(game.urace?.mnum))
            || Hallucination())) {
        // C :705–709: orc/gnome speech when same race or Hallu.
        msound = MS_HUMANOID;
    }
    if (msound === 0 && !mtmp.isshk) return ECMD_OK;

    let pline_msg = null;
    let verbl_msg = null;
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
    // Other msound cases deferred (guardian/isshk/gecko remaps named)

    // C :1222–1241 pline_msg then mcan verbl_msg_mcan then verbl_msg.
    // verbl_msg_mcan still named (no cancelled-speech arm).
    if (pline_msg) {
        await pline(`${Monnam(mtmp)} ${pline_msg}`);
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
