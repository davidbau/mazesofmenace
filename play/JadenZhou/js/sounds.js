// sounds.js — ambient level sounds.
// C ref: sounds.c
//
// Ported so far: mon_in_room(), throne_mon_sound(), beehive_mon_sound(),
// morgue_mon_sound(), zoo_mon_sound(), dosounds().  temple_priest_sound()
// and oracle_sound() are only partly ported (see their comments).

import { game } from './gstate.js';
import { rn2, ROLL_FROM } from './rng.js';
import { canseemon } from './display.js';
import { vtense } from './objnam.js';
import { wake_nearto } from './mon.js';
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
         MS_IMITATE, MS_ORC, MS_LEADER, MS_GUARDIAN, MS_SELL,
         MS_GROAN } from './monsters.js';
import { GOLD_PIECE, STATUE } from './objects.js';
import { canspotmon, vobj_at } from './display.js';
import { m_at } from './makemon.js';
import { Monnam, mon_nam } from './do_name.js';
import { night } from './calendar.js';
import { getdir } from './cmd.js';
import { is_flyer, is_undead, is_vampshifter } from './mondata.js';

/* C ref: mondata.h predicates */
function is_lord(ptr) { return (ptr.mflags2 & M2_LORD) !== 0; }
function is_prince(ptr) { return (ptr.mflags2 & M2_PRINCE) !== 0; }
function is_animal(ptr) { return (ptr.mflags1 & M1_ANIMAL) !== 0; }
function is_mercenary(ptr) { return (ptr.mflags2 & M2_MERC) !== 0; }
/* C ref: monst.h DEADMONSTER() */
function DEADMONSTER(mon) { return mon.mhp < 1; }

/* C ref: youprop.h Hallucination */
function Hallucination() {
    const P = game.u.uprops;
    return !!(P[HALLUC].intrinsic
              && !(P[HALLUC_RES].intrinsic || P[HALLUC_RES].extrinsic));
}

/* C ref: pline.c You_hear() -- the "You hear" prefix; the hearing-
   while-asleep/unconscious variant ("You dream that you hear") isn't
   ported yet */
export async function You_hear(msg) {
    await pline(`You hear ${msg}`);
}

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
/* not ported yet: temple priests (EPRI, inhistemple(), canseemon()) are
   not created by the JS port yet, so no monster passes the first test */
async function temple_priest_sound(mtmp) {
    if (mtmp.ispriest && mtmp.epri)
        throw new Error('temple_priest_sound(): not ported yet');
    return false;
}

// C ref: sounds.c oracle_sound()
async function oracle_sound(mtmp) {
    if (mtmp.data !== mons[PM_ORACLE])
        return false;
    /* canseemon() isn't ported yet */
    throw new Error('oracle_sound(): canseemon() not ported yet');
}

// C ref: mon.c get_iter_mons()
/* iterate all living monsters on the level until bfunc returns TRUE */
async function get_iter_mons(bfunc) {
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

// C ref: mkroom.c search_special()
function search_special(type) {
    const rooms = game.level.rooms;
    let i;

    for (i = 0; rooms[i] && rooms[i].hx >= 0; i++) {
        const croom = rooms[i];
        if ((type === ANY_TYPE && croom.rtype !== OROOM)
            || (type === ANY_SHOP && croom.rtype >= SHOPBASE)
            || croom.rtype === type)
            return croom;
    }
    /* gs.subrooms[]: subrooms aren't kept in a global list in the JS
       port yet */
    return null;
}

// C ref: vault.c vault_occupied()
function vault_occupied(array) {
    for (const ch of array || '') {
        const r = ch.charCodeAt(0);
        if (game.level.rooms[r - ROOMOFFSET].rtype === VAULT)
            return r;
    }
    return 0;
}

// C ref: vault.c findgd()
function findgd() {
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER(mtmp))
            continue;
        if (mtmp.isgd && mtmp.egd && mtmp.egd.gdlevel
            && mtmp.egd.gdlevel.dnum === game.u.uz.dnum
            && mtmp.egd.gdlevel.dlevel === game.u.uz.dlevel)
            return mtmp;
    }
    return null;
}

// C ref: vault.c gd_sound()
/* the guard can be heard if the hero isn't in the vault and no guard
   is around */
function gd_sound() {
    return !(vault_occupied(game.u.urooms) || findgd());
}

// C ref: invent.c g_at()
function g_at(x, y) {
    for (const o of game.level.objects || [])
        if (o.otyp === GOLD_PIECE && o.ox === x && o.oy === y)
            return o;
    return null;
}

// C ref: shk.c tended_shop()
function tended_shop(sroom) {
    const mtmp = sroom.resident;

    /* inhishop(): shopkeepers aren't created by the JS port yet */
    if (mtmp)
        throw new Error('tended_shop(): inhishop() not ported yet');
    return false;
}

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
            /* noisy_shop(sroom): wake_nearto() not ported yet */
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

/* C ref: mondata.h is_silent() */
function is_silent(ptr) { return ptr.msound === MS_SILENT; }
/* C ref: monst.h helpless() */
function helpless(mon) { return !!(mon.msleeping || !mon.mcanmove); }
/* C ref: youprop.h Deaf, Blind, Strangled, Underwater */
function uprop(prop) {
    const p = game.u.uprops[prop];
    return !!(p && (p.intrinsic || p.extrinsic));
}
function Deaf() { return uprop(DEAF); }

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
function growl_sound(mtmp) {
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
    else if (msound === MS_ORC)
        throw new Error('domonnoise(): MS_ORC same_race() check not ported yet');
    else if (msound === MS_MOO && !mtmp.mtame)
        msound = MS_BELLOW;
    /* silliness: Hallucination && mon_is_gecko() */
    else if (Hallucination() && ptr === mons[PM_GECKO])
        msound = MS_SELL;

    /* be sure to do this before talking; the monster might teleport away, in
     * which case we want to check its pre-teleport position
     */
    if (!canspotmon(mtmp))
        throw new Error('domonnoise(): map_invisible() not ported yet');

    switch (msound) {
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
    case MS_IMITATE:
        pline_msg = "imitates you.";
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
    default:
        /* the talking monsters (MS_TRUMPET's wake_nearto(), MS_SHRIEK's
           aggravate(), MS_BONES, MS_HUMANOID, shopkeepers, priests, the
           quest, ...) aren't ported yet */
        throw new Error(`domonnoise(): msound ${msound} not ported yet`);
    }

    if (pline_msg) {
        await pline(`${Monnam(mtmp)} ${pline_msg}`);
    } else if (mtmp.mcan && verbl_msg_mcan) {
        await pline(`"${verbl_msg_mcan}"`); /* verbalize1() */
    } else if (verbl_msg) {
        if (ptr === mons[PM_DEATH])
            throw new Error('domonnoise(): Death speech not ported yet');
        await pline(`"${verbl_msg}"`); /* verbalize1() */
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
    if (uprop(STRANGLED)) {
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
    if (!Deaf() && !uprop(BLINDED) && game.u.ushops && game.u.ushops.length)
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
            if (!uprop(BLINDED)) {
                if (Hallucination())
                    throw new Error('dochat(): rndmonnam() not ported yet');
                await pline("The statue seems not to notice you."); /* pline_The() */
            }
            return ECMD_OK;
        }
        const typ = game.level.at(tx, ty).typ;
        if (!Deaf() && (IS_WALL(typ) || typ === SDOOR)) {
            /* Talking to a wall; secret door remains hidden by behaving
               like a wall */
            if (uprop(BLINDED))
                throw new Error('dochat(): blind wall talk (lastseentyp) not ported yet');
            else if (!Hallucination()) {
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
            throw new Error('dochat(): map_invisible() not ported yet');
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
