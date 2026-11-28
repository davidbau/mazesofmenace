// sounds.js — ambient level sounds.
// C ref: sounds.c
//
// Ported so far: mon_in_room(), throne_mon_sound(), beehive_mon_sound(),
// morgue_mon_sound(), zoo_mon_sound(), temple_priest_sound(), oracle_sound(),
// dosounds(); domonnoise() except the cases its default: stop lists.

import { DEADMONSTER } from './mon.js';
import { g_at, vault_occupied, findgd } from './vault.js';
import { helpless } from './monmove.js';
import { game } from './gstate.js';
import { rn2, ROLL_FROM } from './rng.js';
import { canseemon, verbalize, You_hear } from './display.js';
import { vtense } from './objnam.js';
import { wake_nearto } from './mon.js';
import { tended_shop, noisy_shop } from './shk.js';
import { nomul } from './hack.js';
import { pline } from './display.js';
import {
    DEAF, HALLUC, HALLUC_RES, ROOMOFFSET, VAULT, ANY_SHOP, ANY_TYPE, OROOM,
    SHOPBASE, COURT, BEEHIVE, MORGUE, ZOO, BARRACKS,
    Is_astralevel, Is_oracle_level, Is_sanctum, STRANGLED, BLINDED, FULL_MOON, IS_WALL,
    SDOOR, M_AP_FURNITURE, M_AP_OBJECT, STRAT_WAITMASK, isok, ECMD_OK,
    ECMD_TIME, ECMD_CANCEL, PLNMSG_GROWL,
} from './const.js';
import { M1_ANIMAL, M2_LORD, M2_PRINCE, M2_MERC, S_ANT, PM_ORACLE,
         mons, M1_HUMANOID, PM_GECKO, PM_DINGO, PM_RAVEN, PM_DEATH,
         MS_SILENT, MS_BARK, MS_MEW, MS_ROAR, MS_BELLOW, MS_GROWL, MS_SQEEK,
         MS_SQAWK, MS_CHIRP, MS_HISS, MS_BUZZ, MS_GRUNT, MS_NEIGH, MS_MOO,
         MS_WAIL, MS_GURGLE, MS_BURBLE, MS_ANIMAL, MS_LAUGH, MS_MUMBLE,
         MS_IMITATE, MS_ORC, MS_LEADER, MS_NEMESIS, MS_GUARDIAN, MS_SELL,
         MS_GROAN } from './monsters.js';
import { quest_chat } from './quest.js';
import { GOLD_PIECE, STATUE } from './objects.js';
import { canspotmon, vobj_at, map_invisible } from './display.js';
import { m_at } from './makemon.js';
import { Monnam, mon_nam, rndmonnam } from './do_name.js';
import { night } from './calendar.js';
import * as MM from './monsters.js';
import { p_coaligned } from './priest.js';
import { inhistemple, temple_occupied } from './priest.js';
import { halu_gname } from './pray.js';
import { letter } from './hacklib.js';
import { cansee as cansee_tp } from './vision.js';
import { EPRI } from './const.js';
import { getdir } from './cmd.js';
import { is_flyer, is_undead, is_vampshifter, same_race, is_animal,
         is_mercenary, is_silent, is_lord, is_prince } from './mondata.js';
import { Blind, Strangled, Hallucination, Deaf, Unaware } from './youprop.js';
import { S_NYMPH as S_NYMPH_SN } from './monsters.js';
import { could_seduce as could_seduce_sn, doseduce as doseduce_sn } from './mhitu.js';
import { M1_HUMANOID as M1_HUMANOID_SN } from './monsters.js';
import { mhis as mhis_sn } from './mhitu.js';
import { In_endgame as In_endgame_sn, Role_if as Role_if_sn } from './const.js';
import { is_mplayer as is_mplayer_sn, is_elf as is_elf_sn, is_dwarf as is_dwarf_sn,
         likes_magic as likes_magic_sn, is_gnome as is_gnome_sn,
         monsndx as monsndx_sn } from './mondata.js';
import { t_at as t_at_sn } from './trap.js';
import { demon_talk as demon_talk_sn } from './minion.js';
import { cuss as cuss_sn } from './wizard.js';
import { is_lminion as is_lminion_sn } from './makemon.js';
import { WEAPON_CLASS as WEAPON_CLASS_SN, is_weptool as is_weptool_sn } from './objects.js';
import { money_cnt as money_cnt_sn } from './u_init.js';
import { aggravate as aggravate_sn } from './potion.js';
import { You as You_sn } from './display.js';
import { midnight as midnight_sn } from './calendar.js';
import { body_part as body_part_sn } from './insight.js';
import { an as an_sn } from './objnam.js';
import { pmname as pmname_sn } from './do_name.js';
import { Upolyd as Upolyd_sn, BLOOD as BLOOD_SN, FEMALE as FEMALE_SN, MALE as MALE_SN } from './const.js';
import { poly_gender } from './polyself.js';

/* C ref: mondata.h predicates */


// C ref: sounds.c mon_in_room()
function mon_in_room(mon, rmtyp) {
    const rno = game.level.at(mon.mx, mon.my).roomno;
    if (rno >= ROOMOFFSET)
        return game.level.rooms[rno - ROOMOFFSET].rtype === rmtyp;
    return false;
}

// C ref: sounds.c throne_mon_sound()
async function throne_mon_sound(mtmp) {
    if ((mtmp.msleeping || is_lord(mtmp.data)
         || is_prince(mtmp.data)) && !is_animal(mtmp.data)
        && mon_in_room(mtmp, COURT)) {
        const throne_msg = [
            "the tones of courtly conversation.",
            "a sceptre pounded in judgment.",
            "Someone shouts \"Off with %s head!\"",
            "Queen Beruthiel's cats!",
        ];
        const which = rn2(3) + (Hallucination() ? 1 : 0);

        if (which !== 2) {
            await You_hear(throne_msg[which]);
        } else {
            /* uhis() */
            const uhis = game.flags.female ? "her" : "his";
            await pline(throne_msg[2].replace('%s', uhis));
        }
        return true;
    }
    return false;
}

// C ref: sounds.c beehive_mon_sound()
async function beehive_mon_sound(mtmp) {
    if ((mtmp.data.mlet === S_ANT && is_flyer(mtmp.data))
        && mon_in_room(mtmp, BEEHIVE)) {
        const hallu = Hallucination() ? 1 : 0;

        switch (rn2(2) + hallu) {
        case 0:
            await You_hear("a low buzzing.");
            break;
        case 1:
            await You_hear("an angry drone.");
            break;
        case 2:
            await You_hear(`bees in your ${game.uarmh ? "" : "(nonexistent) "}bonnet!`);
            break;
        }
        return true;
    }
    return false;
}

// C ref: sounds.c morgue_mon_sound()
async function morgue_mon_sound(mtmp) {
    if ((is_undead(mtmp.data) || is_vampshifter(mtmp))
        && mon_in_room(mtmp, MORGUE)) {
        const hallu = Hallucination() ? 1 : 0;
        /* body_part(HAIR) etc. aren't ported yet; humanoid wording */
        switch (rn2(2) + hallu) {
        case 0:
            await pline("You suddenly realize it is unnaturally quiet.");
            break;
        case 1:
            await pline("The hair on the back of your neck stands up.");
            break;
        case 2:
            await pline("The hair on your head seems to stand up.");
            break;
        }
        return true;
    }
    return false;
}

// C ref: sounds.c zoo_mon_sound()
async function zoo_mon_sound(mtmp) {
    if ((mtmp.msleeping || is_animal(mtmp.data))
        && mon_in_room(mtmp, ZOO)) {
        const hallu = Hallucination() ? 1 : 0, selection = rn2(2) + hallu;
        const zoo_msg = [
            "a sound reminiscent of an elephant stepping on a peanut.",
            "a sound reminiscent of a seal barking.", "Doctor Dolittle!",
        ];
        await You_hear(zoo_msg[selection]);
        return true;
    }
    return false;
}

// C ref: sounds.c temple_priest_sound()
async function temple_priest_sound(mtmp) {
    if (mtmp.ispriest && inhistemple(mtmp)
        /* priest must be active */
        && !helpless(mtmp)
        /* hero must be outside this temple */
        && temple_occupied(game.u.urooms || '')
           !== String.fromCharCode(EPRI(mtmp).shroom)) {
        /* Generic temple messages; no attempt to match topic or tone
           to the pantheon involved, let alone to the specific deity.
           These are assumed to be coming from the attending priest;
           asterisk means that the priest must be capable of speech;
           pound sign (octathorpe,&c--don't go there) means that the
           priest and the altar must not be directly visible (we don't
           care if telepathy or extended detection reveals that the
           priest is not currently standing on the altar; he's mobile). */
        const temple_msg = [
            "*someone praising %s.", "*someone beseeching %s.",
            "#an animal carcass being offered in sacrifice.",
            "*a strident plea for donations.",
        ];
        let msg;
        const hallu = Hallucination() ? 1 : 0;
        let trycount = 0;
        const ax = EPRI(mtmp).shrpos.x,
            ay = EPRI(mtmp).shrpos.y;
        const speechless = (mtmp.data.msound <= MS_ANIMAL),
            in_sight = canseemon(mtmp) || cansee_tp(ax, ay);

        do {
            msg = temple_msg[rn2(temple_msg.length - 1 + hallu)];
            if (msg.includes('*') && speechless)
                continue;
            if (msg.includes('#') && in_sight)
                continue;
            break; /* msg is acceptable */
        } while (++trycount < 50);
        while (!letter(msg[0]))
            msg = msg.slice(1); /* skip control flags */
        if (msg.includes('%')) {
            await You_hear(msg.replace('%s', halu_gname(EPRI(mtmp).shralign)));
        } else
            await You_hear(msg); /* You_hear1() */
        return true;
    }
    return false;
}

// C ref: sounds.c oracle_sound()
async function oracle_sound(mtmp) {
    if (mtmp.data !== mons[PM_ORACLE])
        return false;

    /* and don't produce silly effects when she's clearly visible */
    if (Hallucination() || !canseemon(mtmp)) {
        const hallu = Hallucination() ? 1 : 0;
        const ora_msg = [
            "a strange wind.",     /* Jupiter at Dodona */
            "convulsive ravings.", /* Apollo at Delphi */
            "snoring snakes.",     /* AEsculapius at Epidaurus */
            "someone say \"No more woodchucks!\"",
            "a loud ZOT!" /* both rec.humor.oracle */
        ];
        await You_hear(ora_msg[rn2(3) + hallu * 2]); /* You_hear1() */
    }
    return true;
}

// C ref: mon.c get_iter_mons()
/* iterate all living monsters on the level until bfunc returns TRUE */
export async function get_iter_mons(bfunc) {
    let mtmp, mtmp2;

    for (mtmp = game.fmon; mtmp; mtmp = mtmp2) {
        mtmp2 = mtmp.nmon;
        /* mon_offmap(): migrating monsters aren't on fmon in the JS port */
        if (DEADMONSTER(mtmp))
            continue;
        if (await bfunc(mtmp))
            break;
    }
    return mtmp;
}

// C ref: mon.c get_iter_mons_xy()
/* iterate all living monsters on the level until bfunc returns TRUE;
   bfunc gets the monster and the x, y passed in */
export async function get_iter_mons_xy(bfunc, x, y) {
    let mtmp, mtmp2;

    for (mtmp = game.fmon; mtmp; mtmp = mtmp2) {
        mtmp2 = mtmp.nmon;
        /* mon_offmap(): migrating monsters aren't on fmon in the JS port */
        if (DEADMONSTER(mtmp))
            continue;
        if (await bfunc(mtmp, x, y))
            break;
    }
    return mtmp;
}

// C ref: mkroom.c search_special()
export function search_special(type) {
    const rooms = game.level.rooms;
    let i;

    for (i = 0; rooms[i] && rooms[i].hx >= 0; i++) {
        const croom = rooms[i];
        if ((type === ANY_TYPE && croom.rtype !== OROOM)
            || (type === ANY_SHOP && croom.rtype >= SHOPBASE)
            || croom.rtype === type)
            return croom;
    }
    const subrooms = game.level.subrooms || [];
    for (i = 0; subrooms[i] && subrooms[i].hx >= 0; i++) {
        const croom = subrooms[i];
        if ((type === ANY_TYPE && croom.rtype !== OROOM)
            || (type === ANY_SHOP && croom.rtype >= SHOPBASE)
            || croom.rtype === type)
            return croom;
    }
    return null;
}

// C ref: vault.c gd_sound()
/* the guard can be heard if the hero isn't in the vault and no guard
   is around */
function gd_sound() {
    return !(vault_occupied(game.u.urooms) || findgd());
}

/* C ref: shk.c tended_shop(), noisy_shop() -- in shk.js */

// C ref: sounds.c dosounds()
export async function dosounds() {
    const g = game;
    const u = g.u;
    const lf = g.level.flags;
    let sroom, hallu, vx, vy, mtmp;

    /* C ref: youprop.h Deaf, Underwater */
    const Deaf = u.uprops[DEAF].intrinsic || u.uprops[DEAF].extrinsic
                 || u.uroleplay.deaf;
    if (Deaf || !g.flags.acoustics || u.uswallow || u.uinwater)
        return;

    hallu = Hallucination() ? 1 : 0;

    if (lf.nfountains && !rn2(400)) {
        const fountain_msg = [
            "bubbling water.", "water falling on coins.",
            "the splashing of a naiad.", "a soda fountain!",
        ];
        await You_hear(fountain_msg[rn2(3) + hallu]);
    }
    if (lf.nsinks && !rn2(300)) {
        const sink_msg = [
            "a slow drip.", "a gurgling noise.", "dishes being washed!",
        ];
        await You_hear(sink_msg[rn2(2) + hallu]);
    }
    if (lf.has_court && !rn2(200)) {
        if (await get_iter_mons(throne_mon_sound))
            return;
    }
    if (lf.has_swamp && !rn2(200)) {
        const swamp_msg = [
            "hear mosquitoes!", "smell marsh gas!", /* so it's a smell...*/
            "hear Donald Duck!",
        ];
        await pline(`You ${swamp_msg[rn2(2) + hallu]}`);
        return;
    }
    if (lf.has_vault && !rn2(200)) {
        if (!(sroom = search_special(VAULT))) {
            /* strange ... */
            lf.has_vault = 0;
            return;
        }
        if (gd_sound()) {
            let which = rn2(2) + hallu;
            if (which === 1) {
                let gold_in_vault = false;

                for (vx = sroom.lx; vx <= sroom.hx; vx++)
                    for (vy = sroom.ly; vy <= sroom.hy; vy++)
                        if (g_at(vx, vy))
                            gold_in_vault = true;
                if (vault_occupied(u.urooms)
                    !== (sroom.roomnoidx + ROOMOFFSET)) {
                    if (gold_in_vault) {
                        await You_hear(!hallu
                                     ? "someone counting gold coins."
                                     : "the quarterback calling the play.");
                    } else {
                        await You_hear("someone searching.");
                    }
                } else {
                    which = 0; /* FALLTHROUGH */
                }
            }
            if (which === 0)
                await You_hear("the footsteps of a guard on patrol.");
            else if (which === 2)
                await You_hear("Ebenezer Scrooge!");
        }
        return;
    }
    if (lf.has_beehive && !rn2(200)) {
        if (await get_iter_mons(beehive_mon_sound))
            return;
    }
    if (lf.has_morgue && !rn2(200)) {
        if (await get_iter_mons(morgue_mon_sound))
            return;
    }
    if (lf.has_barracks && !rn2(200)) {
        const barracks_msg = [
            "blades being honed.", "loud snoring.", "dice being thrown.",
            "General MacArthur!",
        ];
        let count = 0;

        for (mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
            if (DEADMONSTER(mtmp))
                continue;
            if (is_mercenary(mtmp.data)
                && mon_in_room(mtmp, BARRACKS)
                /* sleeping implies not-yet-disturbed (usually) */
                && (mtmp.msleeping || ++count > 5)) {
                await You_hear(barracks_msg[rn2(3) + hallu]);
                return;
            }
        }
    }
    if (lf.has_zoo && !rn2(200)) {
        if (await get_iter_mons(zoo_mon_sound))
            return;
    }
    if (lf.has_shop && !rn2(200)) {
        if (!(sroom = search_special(ANY_SHOP))) {
            /* strange... */
            lf.has_shop = 0;
            return;
        }
        if (tended_shop(sroom)
            && !(u.ushops || '').includes(String.fromCharCode(sroom.roomnoidx + ROOMOFFSET))) {
            const shop_msg = [
                "someone cursing shoplifters.",
                "the chime of a cash register.", "Neiman and Marcus arguing!",
            ];
            await You_hear(shop_msg[rn2(2) + hallu]);
            await noisy_shop(sroom);
        }
        return;
    }
    if (lf.has_temple && !rn2(200)
        && !(Is_astralevel(u.uz) || Is_sanctum(u.uz))) {
        if (await get_iter_mons(temple_priest_sound))
            return;
    }
    if (Is_oracle_level(u.uz) && !rn2(400)) {
        if (await get_iter_mons(oracle_sound))
            return;
    }
}

// ── C ref: sounds.c #chat: dotalk(), dochat(), domonnoise() (the animal
//    noises and other simple cases; the talking monsters aren't ported) ──

/* C ref: sounds.c h_sounds[] */
const h_sounds = [
    "beep",   "boing",   "sing",   "belche", "creak",   "cough",
    "rattle", "ululate", "pop",    "jingle", "sniffle", "tinkle",
    "eep",    "clatter", "hum",    "sizzle", "twitter", "wheeze",
    "rustle", "honk",    "lisp",   "yodel",  "coo",     "burp",
    "moo",    "boom",    "murmur", "oink",   "quack",   "rumble",
    "twang",  "toot",    "gargle", "hoot",    "warble"
];

// C ref: sounds.c growl_sound()
export function growl_sound(mtmp) {
    let ret;

    switch (mtmp.data.msound) {
    case MS_MEW:
    case MS_HISS:
        ret = "hiss";
        break;
    case MS_BARK:
    case MS_GROWL:
        ret = "growl";
        break;
    case MS_ROAR:
        ret = "roar";
        break;
    case MS_BELLOW:
        ret = "bellow";
        break;
    case MS_BUZZ:
        ret = "buzz";
        break;
    case MS_SQEEK:
        ret = "squeal";
        break;
    case MS_SQAWK:
        ret = "screech";
        break;
    case MS_NEIGH:
        ret = "neigh";
        break;
    case MS_WAIL:
        ret = "wail";
        break;
    case MS_GROAN:
        ret = "groan";
        break;
    case MS_MOO:
        ret = "low";
        break;
    case MS_SILENT:
        ret = "commotion";
        break;
    default:
        ret = "scream";
    }
    return ret;
}

// C ref: sounds.c maybe_gasp()
/* hero has attacked a peaceful monster within 'mon's view */
export function maybe_gasp(mon) {
    const Exclam = [
        "Gasp!", "Uh-oh.", "Oh my!", "What?", "Why?",
    ];
    const mptr = mon.data;
    let msound = mptr.msound;
    let dogasp = false;

    /* other roles' guardians and cross-aligned priests don't gasp */
    if ((msound === MM.MS_GUARDIAN && mptr !== MM.mons[game.urole.guardnum])
        || (msound === MM.MS_PRIEST && !p_coaligned(mon)))
        msound = MM.MS_SILENT;
    /* co-aligned angels do gasp */
    else if (msound === MM.MS_CUSS && mon.emin /* has_emin() */
             && (p_coaligned(mon) ? !mon.emin.renegade
                                  : mon.emin.renegade))
        msound = MM.MS_HUMANOID;

    /*
     * Only called for humanoids so animal noise handling is ignored.
     */
    switch (msound) {
    case MM.MS_HUMANOID:
    case MM.MS_ARREST: /* Kops */
    case MM.MS_SOLDIER: /* solider, watchman */
    case MM.MS_GUARD: /* vault guard */
    case MM.MS_NURSE:
    case MM.MS_SEDUCE: /* nymph, succubus/incubus */
    case MM.MS_LEADER: /* quest leader */
    case MM.MS_GUARDIAN: /* leader's guards */
    case MM.MS_SELL: /* shopkeeper */
    case MM.MS_ORACLE:
    case MM.MS_PRIEST: /* temple priest, roaming aligned priest (not mplayer) */
    case MM.MS_BOAST: /* giants */
    case MM.MS_IMITATE: /* doppelganger, leocrotta, Aleax */
        dogasp = true;
        break;
    /* issue comprehensible word(s) if hero is similar type of creature */
    case MM.MS_ORC: /* used to be synonym for MS_GRUNT */
    case MM.MS_GRUNT: /* ogres, trolls, gargoyles, one or two others */
    case MM.MS_LAUGH: /* leprechaun, gremlin */
    case MM.MS_ROAR: /* dragon, xorn, owlbear */
    case MM.MS_BELLOW: /* crocodile */
    /* capable of speech but only do so if hero is similar type */
    case MM.MS_DJINNI:
    case MM.MS_VAMPIRE: /* vampire in its own form */
    case MM.MS_WERE: /* lycanthrope in human form */
    case MM.MS_SPELL: /* titan, barrow wight, Nazgul, nalfeshnee */
        dogasp = (mptr.mlet === game.youmonst.data.mlet);
        break;
    /* capable of speech but don't care if you attack peacefuls */
    case MM.MS_BRIBE:
    case MM.MS_CUSS:
    case MM.MS_RIDER:
    case MM.MS_NEMESIS:
    /* can't speak */
    case MM.MS_SILENT:
    default:
        break;
    }
    if (dogasp) {
        return ROLL_FROM(Exclam); /* [mon->m_id % SIZE(Exclam)]; */
    }
    return null;
}

// C ref: sounds.c growl()
/* the sounds of a seriously abused pet, including player attacking it */
export async function growl(mtmp) {
    let growl_verb = null;

    if (helpless(mtmp) || mtmp.data.msound === MS_SILENT)
        return;

    /* presumably nearness and soundok checks have already been made */
    if (Hallucination())
        growl_verb = ROLL_FROM(h_sounds);
    else
        growl_verb = growl_sound(mtmp);
    if (growl_verb) {
        if (canseemon(mtmp) || !Deaf()) {
            await pline(`${Monnam(mtmp)} ${vtense(null, growl_verb)}!`);
            game.iflags.last_msg = PLNMSG_GROWL;
            if (game.context.run)
                nomul(0);
        }
        await wake_nearto(mtmp.mx, mtmp.my, mtmp.data.mlevel * 18);
    }
}

// C ref: sounds.c yelp()
/* the sounds of mistreated pets */
export async function yelp(mtmp) {
    let yelp_verb = null;

    if (helpless(mtmp) || !mtmp.data.msound)
        return;

    /* presumably nearness and soundok checks have already been made */
    if (Hallucination())
        yelp_verb = ROLL_FROM(h_sounds);
    else
        switch (mtmp.data.msound) {
        case MS_MEW:
            yelp_verb = (!Deaf()) ? "yowl" : "arch";
            break;
        case MS_BARK:
        case MS_GROWL:
            yelp_verb = (!Deaf()) ? "yelp" : "recoil";
            break;
        case MS_ROAR:
            yelp_verb = (!Deaf()) ? "snarl" : "bluff";
            break;
        case MS_SQEEK:
            yelp_verb = (!Deaf()) ? "squeal" : "quiver";
            break;
        case MS_SQAWK:
            yelp_verb = (!Deaf()) ? "screak" : "thrash";
            break;
        case MS_WAIL:
            yelp_verb = (!Deaf()) ? "wail" : "cringe";
            break;
        }
    if (yelp_verb) {
        /* Soundeffect(se, 70): no sound interface */
        await pline(`${Monnam(mtmp)} ${vtense(null, yelp_verb)}!`);
        if (game.context.run)
            nomul(0);
        await wake_nearto(mtmp.mx, mtmp.my, mtmp.data.mlevel * 12);
    }
}

// C ref: sounds.c whimper()
/* the sounds of distressed pets */
export async function whimper(mtmp) {
    let whimper_verb = null;

    if (helpless(mtmp) || !mtmp.data.msound)
        return;

    /* presumably nearness and soundok checks have already been made */
    if (Hallucination())
        whimper_verb = ROLL_FROM(h_sounds);
    else
        switch (mtmp.data.msound) {
        case MS_MEW:
        case MS_GROWL:
            whimper_verb = "whimper";
            break;
        case MS_BARK:
            whimper_verb = "whine";
            break;
        case MS_SQEEK:
            whimper_verb = "squeal";
            break;
        }
    if (whimper_verb) {
        /* Soundeffect(se, 50): no sound interface */
        await pline(`${Monnam(mtmp)} ${vtense(null, whimper_verb)}.`);
        if (game.context.run)
            nomul(0);
        await wake_nearto(mtmp.mx, mtmp.my, mtmp.data.mlevel * 6);
    }
}

// C ref: sounds.c cry_sound()
/* hatchling's cry; used by hatch_egg() */
export function cry_sound(mtmp) {
    let ret = null;
    const ptr = mtmp.data;

    /* a relatively small subset of MS_ sound values are used by oviparous
       species so we don't try to supply something for every MS_ type */
    switch (ptr.msound) {
    default:
    case MS_SILENT: /* insects, arthropods, worms, sea creatures */
        /* "chitter": have silent critters make some noise
           or the mommy/daddy gag when hatching doesn't work */
        ret = (ptr.mlet === MM.S_EEL) ? "gurgle" : "chitter";
        break;
    case MM.MS_HISS: /* chickatrice, pyrolisk, snakes */
        ret = "hiss";
        break;
    case MM.MS_ROAR: /* baby dragons; have them growl instead of roar */
    case MM.MS_GROWL: /* (none) */
        ret = "growl";
        break;
    case MM.MS_CHIRP: /* adult crocodiles bellow, babies chirp */
        ret = "chirp";
        break;
    case MM.MS_BUZZ: /* killer bees */
        ret = "buzz";
        break;
    case MM.MS_SQAWK: /* ravens */
        ret = "screech";
        break;
    case MM.MS_GRUNT: /* gargoyles */
        ret = "grunt";
        break;
    case MM.MS_MUMBLE: /* naga hatchlingss */
        ret = "mumble";
        break;
    }
    return ret;
}

// C ref: sounds.c domonnoise()
async function domonnoise(mtmp) {
    let pline_msg = null, /* Monnam(mtmp) will be prepended */
        verbl_msg = null,           /* verbalize() */
        verbl_msg_mcan = null;      /* verbalize() if cancelled */
    const ptr = mtmp.data;
    let msound = ptr.msound;

    /* presumably nearness and sleep checks have already been made */
    if (Deaf())
        return ECMD_OK;
    /* shk_chat can handle nonverbal monsters */
    if (is_silent(ptr) && !mtmp.isshk)
        return ECMD_OK;

    /* leader might be poly'd; if he can still speak, give leader speech */
    if (game.quest_status?.leader_m_id
        && mtmp.m_id === game.quest_status.leader_m_id && msound > MS_ANIMAL)
        msound = MS_LEADER;
    /* make sure it's your role's quest guardian; adjust if not */
    else if (msound === MS_GUARDIAN && ptr !== mons[game.urole.guardnum])
        throw new Error('domonnoise(): genus() for a foreign guardian not ported yet');
    /* even polymorphed, shopkeepers retain their minds and capitalist bent */
    else if (mtmp.isshk)
        msound = MS_SELL;
    /* some normally non-speaking types can/will speak if hero is similar */
    else if (msound === MS_ORC
             && ((same_race(ptr, game.youmonst.data)           /* current form, */
                  || same_race(ptr, mons[game.urace.mnum])) /* unpoly'd form (Race_switch) */
                 || Hallucination()))
        msound = MM.MS_HUMANOID;
    else if (msound === MS_MOO && !mtmp.mtame)
        msound = MS_BELLOW;
    /* silliness: Hallucination && mon_is_gecko() */
    else if (Hallucination() && ptr === mons[PM_GECKO])
        msound = MS_SELL;

    /* be sure to do this before talking; the monster might teleport away, in
     * which case we want to check its pre-teleport position
     */
    if (!canspotmon(mtmp))
        map_invisible(mtmp.mx, mtmp.my);

    switch (msound) {
    case MS_LEADER:
    case MS_NEMESIS:
    case MS_GUARDIAN:
        await quest_chat(mtmp);
        break;
    case MM.MS_VAMPIRE: {
        /* vampire messages are varied by tameness, peacefulness, and time of
           night */
        const u = game.u;
        const isnight = night();
        const kindred = (Upolyd_sn() && (u.umonnum === MM.PM_VAMPIRE
                                         || u.umonnum === MM.PM_VAMPIRE_LEADER));
        const nightchild = (Upolyd_sn() && (u.umonnum === MM.PM_WOLF
                                            || u.umonnum === MM.PM_WINTER_WOLF
                                            || u.umonnum === MM.PM_WINTER_WOLF_CUB));
        const racenoun = (game.flags.female && game.urace.individual.f)
                         ? game.urace.individual.f
                         : (game.urace.individual.m)
                           ? game.urace.individual.m
                           : game.urace.noun;

        if (mtmp.mtame) {
            if (kindred) {
                verbl_msg = `Good ${isnight ? "evening" : "day"} to you Master${
                    isnight ? "!" : ".  Why do we not rest?"}`;
            } else {
                verbl_msg = `${nightchild ? "Child of the night, " : ""}${
                    midnight_sn()
                     ? "I can stand this craving no longer!"
                     : isnight
                      ? "I beg you, help me satisfy this growing craving!"
                      : "I find myself growing a little weary."}`;
            }
        } else if (mtmp.mpeaceful) {
            if (kindred && isnight) {
                verbl_msg = `Good feeding ${game.flags.female ? "sister" : "brother"}!`;
            } else if (nightchild && isnight) {
                verbl_msg = "How nice to hear you, child of the night!";
            } else
                verbl_msg = "I only drink... potions.";
        } else {
            const vampmsg = [
                /* These first two (0 and 1) are specially handled below */
                "I vant to suck your %s!",
                "I vill come after %s without regret!",
                /* other famous vampire quotes can follow here if desired */
            ];
            let vampindex;

            if (kindred) {
                verbl_msg = "This is my hunting ground"
                            + " that you dare to prowl!";
            } else if (game.youmonst.data === mons[MM.PM_SILVER_DRAGON]
                       || game.youmonst.data === mons[MM.PM_BABY_SILVER_DRAGON]) {
                /* Silver dragons are silver in color, not made of silver */
                verbl_msg = `${(game.youmonst.data === mons[MM.PM_SILVER_DRAGON])
                                ? "Fool"
                                : "Young Fool"}!  Your silver sheen does not frighten me!`;
            } else {
                vampindex = rn2(vampmsg.length);
                if (vampindex === 0) {
                    verbl_msg = vampmsg[vampindex].replace('%s', body_part_sn(BLOOD_SN));
                } else if (vampindex === 1) {
                    verbl_msg = vampmsg[vampindex].replace('%s',
                            Upolyd_sn() ? an_sn(pmname_sn(mons[u.umonnum],
                                                          game.flags.female ? FEMALE_SN : MALE_SN))
                                        : an_sn(racenoun));
                } else
                    verbl_msg = vampmsg[vampindex];
            }
        }
        break;
    }
    case MM.MS_WERE:
        if (game.flags.moonphase === FULL_MOON
            && ((night() ? 1 : 0) ^ (!rn2(13) ? 1 : 0))) {
            await pline(`${Monnam(mtmp)} throws back ${mhis_sn(mtmp)} head and lets out a blood curdling ${
                (ptr === mons[MM.PM_HUMAN_WERERAT]) ? "shriek" : "howl"}!`);
            /* Soundeffect(se_scream or se_canine_howl, 80) */
            await wake_nearto(mtmp.mx, mtmp.my, 11 * 11);
        } else {
            pline_msg =
                "whispers inaudibly.  All you can make out is \"moon\".";
        }
        break;
    case MS_BARK:
        if (game.flags.moonphase === FULL_MOON && night()) {
            pline_msg = "howls.";
        } else if (mtmp.mpeaceful) {
            if (mtmp.mtame
                && (mtmp.mconf || mtmp.mflee || mtmp.mtrapped
                    || game.moves > mtmp.edog.hungrytime || mtmp.mtame < 5))
                pline_msg = "whines.";
            else if (mtmp.mtame && mtmp.edog.hungrytime > game.moves + 1000)
                pline_msg = "yips.";
            else {
                if (ptr !== mons[PM_DINGO]) /* dingos do not actually bark */
                    pline_msg = "barks.";
            }
        } else {
            pline_msg = "growls.";
        }
        break;
    case MS_MEW:
        if (mtmp.mtame) {
            if (mtmp.mconf || mtmp.mflee || mtmp.mtrapped
                || mtmp.mtame < 5) {
                pline_msg = "yowls.";
            } else if (game.moves > mtmp.edog.hungrytime) {
                pline_msg = "meows.";
            } else if (mtmp.edog.hungrytime > game.moves + 1000) {
                pline_msg = "purrs.";
            } else {
                pline_msg = "mews.";
            }
            break;
        }
        /*FALLTHRU*/
    case MS_GROWL:
        pline_msg = mtmp.mpeaceful ? "snarls." : "growls!";
        break;
    case MS_ROAR:
        pline_msg = mtmp.mpeaceful ? "snarls." : "roars!";
        break;
    case MS_SQEEK:
        pline_msg = "squeaks.";
        break;
    case MS_SQAWK:
        if (ptr === mons[PM_RAVEN] && !mtmp.mpeaceful) {
            verbl_msg = "Nevermore!";
        } else {
            pline_msg = "squawks.";
        }
        break;
    case MS_HISS:
        if (!mtmp.mpeaceful) {
            pline_msg = "hisses!";
        } else {
            return ECMD_OK; /* no sound */
        }
        break;
    case MS_BUZZ:
        pline_msg = mtmp.mpeaceful ? "drones." : "buzzes angrily.";
        break;
    case MS_GRUNT:
        pline_msg = "grunts.";
        break;
    case MS_NEIGH:
        if (mtmp.mtame < 5) {
            pline_msg = "neighs.";
        } else if (game.moves > mtmp.edog.hungrytime) {
            pline_msg = "whinnies.";
        } else {
            pline_msg = "whickers.";
        }
        break;
    case MS_MOO:
        pline_msg = "moos.";
        break;
    case MS_BELLOW:
        pline_msg = "bellows!";
        break;
    case MS_CHIRP:
        pline_msg = "chirps.";
        break;
    case MS_WAIL:
        pline_msg = "wails mournfully.";
        break;
    case MS_GROAN:
        if (!rn2(3)) {
            pline_msg = "groans.";
        }
        break;
    case MS_GURGLE:
        pline_msg = "gurgles.";
        break;
    case MS_BURBLE:
        pline_msg = "burbles.";
        break;
    case MM.MS_TRUMPET:
        /* Soundeffect(se_elephant_trumpet, 60) */
        pline_msg = "trumpets!";
        await wake_nearto(mtmp.mx, mtmp.my, 11 * 11);
        break;
    case MM.MS_SHRIEK:
        /* Soundeffect(se_shriek, 60) */
        pline_msg = "shrieks.";
        aggravate_sn();
        break;
    case MS_IMITATE:
        pline_msg = "imitates you.";
        break;
    case MM.MS_BONES:
        /* Soundeffect(se_bone_rattle, 60) */
        await pline(`${Monnam(mtmp)} rattles noisily.`);
        await You_sn("freeze for a moment.");
        nomul(-2);
        game.multi_reason = "scared by rattling";
        game.nomovemsg = null;
        break;
    case MS_LAUGH: {
        const laugh_msg = [
            "giggles.", "chuckles.", "snickers.", "laughs.",
        ];
        pline_msg = laugh_msg[rn2(4)];
        break;
    }
    case MS_MUMBLE:
        pline_msg = "mumbles incomprehensibly.";
        break;
    case MS_ORC: /* this used to be an alias for grunt, now it is distinct */
        /* Soundeffect(se_orc_grunt, 60) */
        pline_msg = "grunts.";
        break;
    case MM.MS_DJINNI:
        if (mtmp.mtame) {
            verbl_msg = "Sorry, I'm all out of wishes.";
        } else if (mtmp.mpeaceful) {
            if (ptr === mons[MM.PM_WATER_DEMON])
                pline_msg = "gurgles.";
            else
                verbl_msg = "I'm free!";
        } else {
            if (ptr !== mons[MM.PM_PRISONER])
                verbl_msg = "This will teach you not to disturb me!";
            else /* vague because prisoner might already be out of cell */
                verbl_msg = "Get me out of here.";
        }
        break;
    case MM.MS_BOAST: /* giants */
    case MM.MS_HUMANOID:
        if (msound === MM.MS_BOAST && !mtmp.mpeaceful) {
            switch (rn2(4)) {
            case 0:
                await pline(`${Monnam(mtmp)} boasts about ${mhis_sn(mtmp)} gem collection.`);
                break;
            case 1:
                pline_msg = "complains about a diet of mutton.";
                break;
            default:
                pline_msg = "shouts \"Fee Fie Foe Foo!\" and guffaws.";
                await wake_nearto(mtmp.mx, mtmp.my, 7 * 7);
                break;
            }
            break;
        }
        /* FALLTHRU (MS_BOAST, peaceful) */
        if (!mtmp.mpeaceful) {
            if (In_endgame_sn(game.u.uz) && is_mplayer_sn(ptr))
                throw new Error('domonnoise(): mplayer_talk() not ported yet');
            else
                pline_msg = "threatens you.";
            break;
        }
        /* Generic peaceful humanoid behavior. */
        if (mtmp.mflee)
            pline_msg = "wants nothing to do with you.";
        else if (mtmp.mhp < Math.trunc(mtmp.mhpmax / 4))
            pline_msg = "moans.";
        else if (mtmp.mconf || mtmp.mstun)
            verbl_msg = !rn2(3) ? "Huh?" : rn2(2) ? "What?" : "Eh?";
        else if (!mtmp.mcansee)
            verbl_msg = "I can't see!";
        else if (mtmp.mtrapped) {
            const t = t_at_sn(mtmp.mx, mtmp.my);

            if (t)
                t.tseen = 1;
            verbl_msg = "I'm trapped!";
        } else if (mtmp.mhp < Math.trunc(mtmp.mhpmax / 2))
            pline_msg = "asks for a potion of healing.";
        else if (mtmp.mtame && !mtmp.isminion
                 && game.moves > mtmp.edog.hungrytime)
            verbl_msg = "I'm hungry.";
        /* Specific monsters' interests */
        else if (is_elf_sn(ptr))
            pline_msg = "curses orcs.";
        else if (is_dwarf_sn(ptr))
            pline_msg = "talks about mining.";
        else if (likes_magic_sn(ptr))
            pline_msg = "talks about spellcraft.";
        else if (ptr.mlet === MM.S_CENTAUR)
            pline_msg = "discusses hunting.";
        else if (is_gnome_sn(ptr)) {
            let gnomeplan;
            if (Hallucination() && (gnomeplan = rn2(4)) % 2) {
                /* skipped for rn2(4) result of 0 or 2; the South Park
                   "Gnomes" three-step business plan */
                verbl_msg = (gnomeplan === 1)
                            ? "Phase one, collect underpants."
                            : "Phase three, profit!";
            } else {
                verbl_msg = "Many enter the dungeon,"
                            + " and few return to the sunlit lands.";
            }
        } else
            switch (monsndx_sn(ptr)) {
            case MM.PM_HOBBIT:
                /* 5.0: the 'complains' message used to be given if the
                   hobbit's current hit points were at 10 below max or
                   less, but their max is normally less than 10 so it
                   would almost never occur */
                pline_msg = (mtmp.mhp < mtmp.mhpmax
                             && (mtmp.mhpmax <= 10
                                 || mtmp.mhp <= mtmp.mhpmax - 10))
                            ? "complains about unpleasant dungeon conditions."
                            : "asks you about the One Ring.";
                break;
            case MM.PM_ARCHEOLOGIST:
                pline_msg =
                "describes a recent article in \"Spelunker Today\" magazine.";
                break;
            case MM.PM_TOURIST:
                verbl_msg = "Aloha.";
                break;
            default:
                pline_msg = "discusses dungeon exploration.";
                break;
            }
        break;
    case MM.MS_ARREST:
        if (mtmp.mpeaceful) {
            /* SetVoice(mtmp, 0, 80, 0) */
            await verbalize(`Just the facts, ${game.flags.female ? "Ma'am" : "Sir"}.`);
        } else {
            const arrest_msg = [
                "Anything you say can be used against you.",
                "You're under arrest!", "Stop in the name of the Law!",
            ];
            verbl_msg = arrest_msg[rn2(3)];
        }
        break;
    case MM.MS_BRIBE:
    case MM.MS_CUSS:
        if (msound === MM.MS_BRIBE && mtmp.mpeaceful && !mtmp.mtame) {
            await demon_talk_sn(mtmp);
            break;
        }
        /* FALLTHRU (MS_BRIBE) */
        if (!mtmp.mpeaceful)
            await cuss_sn(mtmp);
        else if (is_lminion_sn(mtmp))
            verbl_msg = "It's not too late.";
        else
            verbl_msg = "We're all doomed.";
        break;
    case MM.MS_SPELL:
        /* deliberately vague, since it's not actually casting any spell */
        pline_msg = "seems to mutter a cantrip.";
        break;
    case MM.MS_NURSE: {
        const uwep = game.uwep;
        verbl_msg_mcan = "I hate this job!";
        if (uwep && (uwep.oclass === WEAPON_CLASS_SN || is_weptool_sn(uwep)))
            verbl_msg = "Put that weapon away before you hurt someone!";
        else if (game.uarmc || game.uarm || game.uarmh || game.uarms
                 || game.uarmg || game.uarmf)
            verbl_msg = Role_if_sn(MM.PM_HEALER)
                            ? "Doc, I can't help you unless you cooperate."
                            : "Please undress so I can examine you.";
        else if (game.uarmu)
            verbl_msg = "Take off your shirt, please.";
        else
            verbl_msg = "Relax, this won't hurt a bit.";
        break;
    }
    case MM.MS_GUARD:
        if (money_cnt_sn(game.invent))
            verbl_msg = "Please drop that gold and follow me.";
        else
            verbl_msg = "Please follow me.";
        break;
    case MM.MS_SOLDIER: {
        const soldier_foe_msg = [
                "Resistance is useless!", "You're dog meat!", "Surrender!",
            ],
            soldier_pax_msg = [
                "What lousy pay we're getting here!",
                "The food's not fit for Orcs!",
                "My feet hurt, I've been on them all day!",
            ];
        verbl_msg = mtmp.mpeaceful ? soldier_pax_msg[rn2(3)]
                                   : soldier_foe_msg[rn2(3)];
        break;
    }
    case 31 /* MS_SEDUCE */: {
        let swval;

        if (true /* SYSOPT_SEDUCE: on in the recorded games */) {
            if (ptr.mlet !== S_NYMPH_SN
                && (could_seduce_sn(mtmp, game.youmonst, null) === 1)) {
                await doseduce_sn(mtmp);
                break;
            }
            swval = ((poly_gender() !== (mtmp.female ? 1 : 0)) ? rn2(3) : 0);
        } else
            swval = ((poly_gender() === 0) ? rn2(3) : 0);
        switch (swval) {
        case 2:
            verbl_msg = "Hello, sailor.";
            break;
        case 1:
            pline_msg = "comes on to you.";
            break;
        default:
            pline_msg = "cajoles you.";
        }
        break;
    }
    default:
        /* MS_ORACLE, MS_PRIEST, MS_SELL (shopkeepers) and MS_RIDER
           aren't ported yet */
        throw new Error(`domonnoise(): msound ${msound} not ported yet`);
    }

    if (pline_msg) {
        await pline(`${Monnam(mtmp)} ${pline_msg}`);
    } else if (mtmp.mcan && verbl_msg_mcan) {
        await verbalize(verbl_msg_mcan); /* verbalize1() */
    } else if (verbl_msg) {
        if (ptr === mons[PM_DEATH])
            throw new Error('domonnoise(): Death speech not ported yet');
        await verbalize(verbl_msg); /* verbalize1() */
    }
    return ECMD_TIME;
}

// C ref: sounds.c dotalk() -- the #chat command
export async function dotalk() {
    const result = await dochat();
    return result;
}

// C ref: sounds.c dochat()
async function dochat() {
    const u = game.u;
    let mtmp, otmp;

    if (is_silent(game.youmonst.data))
        throw new Error('dochat(): silent hero form not ported yet');
    if (Strangled()) {
        await pline("You can't speak.  You're choking!"); /* You_cant() */
        return ECMD_OK;
    }
    if (u.uswallow) {
        await pline("They won't hear you out there.");
        return ECMD_OK;
    }
    if (u.uinwater) { /* Underwater */
        await pline("Your speech is unintelligible underwater."); /* Your() */
        return ECMD_OK;
    }
    /* shop_object()/price_quote(): shopkeepers aren't created yet */
    if (!Deaf() && !Blind() && game.u.ushops && game.u.ushops.length)
        throw new Error('dochat(): shop_object() price quote not ported yet');

    if (!(await getdir("Talk to whom? (in what direction)"))) {
        /* decided not to chat */
        return ECMD_CANCEL;
    }

    if (u.usteed && u.dz > 0) {
        if (helpless(u.usteed)) {
            await pline(`${Monnam(u.usteed)} seems not to notice you.`);
            return ECMD_TIME;
        } else
            return await domonnoise(u.usteed);
    }

    if (u.dz) {
        await pline(`They won't hear you ${u.dz < 0 ? "up" : "down"} there.`);
        return ECMD_OK;
    }

    if (u.dx === 0 && u.dy === 0) {
        await pline("Talking to yourself is a bad habit for a dungeoneer.");
        return ECMD_OK;
    }

    const tx = u.ux + u.dx;
    const ty = u.uy + u.dy;

    if (!isok(tx, ty))
        return ECMD_OK;

    mtmp = m_at(tx, ty);

    if (!mtmp || mtmp.mundetected) {
        if ((otmp = vobj_at(tx, ty)) != null && otmp.otyp === STATUE) {
            /* Talking to a statue */
            if (!Blind()) {
                await pline(`The ${
                    /* if hallucinating, you can't tell it's a statue */
                    Hallucination() ? rndmonnam(null) : "statue"} seems not to notice you.`); /* pline_The() */
            }
            return ECMD_OK;
        }
        const typ = game.level.at(tx, ty).typ;
        if (!Deaf() && (IS_WALL(typ) || typ === SDOOR)) {
            /* Talking to a wall; secret door remains hidden by behaving
               like a wall; IS_WALL() test excludes solid rock even when
               that serves as a wall bordering a corridor */
            if (Blind() && !IS_WALL(game.level.lastseentyp?.[tx]?.[ty] ?? 0)) {
                /* when blind, you can only talk to a wall if it has
                   already been mapped as a wall */
                ;
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
                await pline(`The wall ${walltalk[idx]}`); /* pline_The() */
            }
            return ECMD_OK;
        }
    }

    if (!mtmp || mtmp.mundetected
        || mtmp.m_ap_type === M_AP_FURNITURE
        || mtmp.m_ap_type === M_AP_OBJECT)
        return ECMD_OK;

    /* sleeping monsters won't talk, except priests (who wake up) */
    if (helpless(mtmp) && !mtmp.ispriest) {
        /* If it is unseen, the player can't tell the difference between
           not noticing him and just not existing, so skip the message. */
        if (canspotmon(mtmp))
            await pline(`${Monnam(mtmp)} seems not to notice you.`);
        return ECMD_OK;
    }

    /* if this monster is waiting for something, prod it into action */
    mtmp.mstrategy &= ~STRAT_WAITMASK;

    if (!Deaf() && mtmp.mtame && mtmp.meating) {
        if (!canspotmon(mtmp))
            map_invisible(mtmp.mx, mtmp.my);
        await pline(`${Monnam(mtmp)} is eating noisily.`);
        return ECMD_OK;
    }
    if (Deaf()) {
        const xresponse = (game.youmonst.data.mflags1 & M1_HUMANOID)
                    ? "falls on deaf ears"
                    : "is inaudible";

        await pline(`Any response${canspotmon(mtmp) ? " from " : ""}${
            canspotmon(mtmp) ? mon_nam(mtmp) : ""} ${xresponse}.`);
        return ECMD_OK;
    }
    return await domonnoise(mtmp);
}

