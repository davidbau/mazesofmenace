import {C} from './c-runtime.js';

/* NetHack 5.0	sounds.c	$NHDT-Date: 1736530208 2025/01/10 09:30:08 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.165 $ */
/*      Copyright (c) 1989 Janet Walz, Mike Threepoint */
/* NetHack may be freely redistributed.  See license for details. */



/* this easily could be a macro, but it might overtax dumb compilers */
export function mon_in_room(mon, rmtyp)
{
    rmtyp = C.int(rmtyp);
    let rno = C.levl[mon.mx][mon.my].roomno;
    if (rno >= C.ROOMOFFSET)
        return C.svr.rooms[rno - C.ROOMOFFSET].rtype == rmtyp;
    return 0;
}


export function throne_mon_sound(mtmp)
{
    if ((mtmp.msleeping || C.is_lord(mtmp.data)
         || C.is_prince(mtmp.data)) && !C.is_animal(mtmp.data)
        && mon_in_room(mtmp, C.COURT)) {
        const throne_msg = [
            "the tones of courtly conversation.",
            "a sceptre pounded in judgment.",
            "Someone shouts \"Off with %s head!\"",
            "Queen Beruthiel's cats!",
        ];
        let which = C.rn2(3, 41, 'throne_mon_sound') + (C.Hallucination ? 1 : 0);

        if (which != 2) {
            if (which == 0) {
                /* Soundeffect(se_courtly_conversation, 30); */
            } else if (which == 1) {
                /* Soundeffect(se_sceptor_pounding, 100); */
            }
            C.You_hear1(throne_msg[which]);
        } else {

            C.pline(throne_msg[2], C.uhis());

        }
        return 1;
    }
    return 0;
}


export function beehive_mon_sound(mtmp)
{
    if ((mtmp.data.mlet == C.S_ANT && C.is_flyer(mtmp.data))
        && mon_in_room(mtmp, C.BEEHIVE)) {
        let hallu = C.Hallucination ? 1 : 0;

        switch (C.rn2(2, 68, 'beehive_mon_sound') + hallu) {
        case 0:
            /* Soundeffect(se_low_buzzing, 30); */
            C.You_hear("a low buzzing.");
            break;
        case 1:
            /* Soundeffect(se_angry_drone, 100); */
            C.You_hear("an angry drone.");
            break;
        case 2:
            /* Soundeffect(se_bees, 100); */
            C.You_hear("bees in your %sbonnet!",
                     C.uarmh ? "" : "(nonexistent) ");
            break;
        }
        return 1;
    }
    return 0;
}

export function morgue_mon_sound(mtmp)
{
    if ((C.is_undead(mtmp.data) || C.is_vampshifter(mtmp))
        && mon_in_room(mtmp, C.MORGUE)) {
        let hallu = C.Hallucination ? 1 : 0;
        let hair = C.body_part(C.HAIR); /* hair/fur/scales */

        switch (C.rn2(2, 96, 'morgue_mon_sound') + hallu) {
        case 0:
            C.You("suddenly realize it is unnaturally quiet.");
            break;
        case 1:
            C.pline_The("%s on the back of your %s %s up.", hair,
                      C.body_part(C.NECK), C.vtense(hair, "stand"));
            break;
        case 2:
            C.pline_The("%s on your %s %s to stand up.", hair,
                      C.body_part(C.HEAD), C.vtense(hair, "seem"));
            break;
        }
        return 1;
    }
    return 0;
}

export function zoo_mon_sound(mtmp)
{
    if ((mtmp.msleeping || C.is_animal(mtmp.data))
        && mon_in_room(mtmp, C.ZOO)) {
        let hallu = C.Hallucination ? 1 : 0, selection = C.rn2(2, 119, 'zoo_mon_sound') + hallu;
        const zoo_msg = [
            "a sound reminiscent of an elephant stepping on a peanut.",
            "a sound reminiscent of a seal barking.", "Doctor Dolittle!",
        ];
        C.You_hear1(zoo_msg[selection]);
        return 1;
    }
    return 0;
}

export function temple_priest_sound(mtmp)
{
    if (mtmp.ispriest && C.inhistemple(mtmp)
        /* priest must be active */
        && !C.helpless(mtmp)
        /* hero must be outside this temple */
        && C.temple_occupied(C.u.urooms) != C.EPRI(mtmp).shroom) {
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
        let hallu = C.Hallucination ? 1 : 0;
        let trycount = 0,
            ax = C.EPRI(mtmp).shrpos.x,
            ay = C.EPRI(mtmp).shrpos.y;
        let speechless = (mtmp.data.msound <= C.MS_ANIMAL),
            in_sight = C.canseemon(mtmp) || C.cansee(ax, ay);

        do {
            msg = C.charPointer(temple_msg[C.rn2(C.SIZE(temple_msg) - 1 + hallu, 160, 'temple_priest_sound')]);
            if (C.strchr(msg, '*'.charCodeAt(0)) && speechless)
                continue;
            if (C.strchr(msg, '#'.charCodeAt(0)) && in_sight)
                continue;
            break; /* msg is acceptable */
        } while (++trycount < 50);
        while (!C.letter(C.loadChar(msg)))
            ++msg; /* skip control flags */
        if (C.strchr(msg, '%'.charCodeAt(0))) {

            C.You_hear(msg, C.halu_gname(C.EPRI(mtmp).shralign));

        } else
            C.You_hear1(msg);
        return 1;
    }
    return 0;
}

export function oracle_sound(mtmp)
{
    if (!C.samePtr(mtmp.data, C.mons[C.PM_ORACLE]))
        return 0;

    /* and don't produce silly effects when she's clearly visible */
    if (C.Hallucination || !C.canseemon(mtmp)) {
        let hallu = C.Hallucination ? 1 : 0;
        const ora_msg = [
            "a strange wind.",     /* Jupiter at Dodona */
            "convulsive ravings.", /* Apollo at Delphi */
            "snoring snakes.",     /* AEsculapius at Epidaurus */
            "someone say \"No more woodchucks!\"",
            "a loud ZOT!" /* both rec.humor.oracle */
        ];
        C.You_hear1(ora_msg[C.rn2(3, 196, 'oracle_sound') + hallu * 2]);
    }
    return 1;
}

export function dosounds()
{
    let sroom;
    let hallu, vx, vy;
    let mtmp;

    if (C.Deaf || !C.flags.acoustics || C.u.uswallow || C.Underwater)
        return;

    hallu = C.Hallucination ? 1 : 0;

    if (C.svl.level.flags.nfountains && !C.rn2(400, 213, 'dosounds')) {
        const fountain_msg = [
            "bubbling water.", "water falling on coins.",
            "the splashing of a naiad.", "a soda fountain!",
        ];
        C.You_hear1(fountain_msg[C.rn2(3, 218, 'dosounds') + hallu]);
    }
    if (C.svl.level.flags.nsinks && !C.rn2(300, 220, 'dosounds')) {
        const sink_msg = [
            "a slow drip.", "a gurgling noise.", "dishes being washed!",
        ];
        C.You_hear1(sink_msg[C.rn2(2, 224, 'dosounds') + hallu]);
    }
    if (C.svl.level.flags.has_court && !C.rn2(200, 226, 'dosounds')) {
        if (C.get_iter_mons(throne_mon_sound))
            return;
    }
    if (C.svl.level.flags.has_swamp && !C.rn2(200, 230, 'dosounds')) {
        const swamp_msg = [
            "hear mosquitoes!", "smell marsh gas!", /* so it's a smell...*/
            "hear Donald Duck!",
        ];
        C.You1(swamp_msg[C.rn2(2, 235, 'dosounds') + hallu]);
        return;
    }
    if (C.svl.level.flags.has_vault && !C.rn2(200, 238, 'dosounds')) {
        if (!(sroom = C.search_special(C.VAULT))) {
            /* strange ... */
            C.svl.level.flags.has_vault = 0;
            return;
        }
        if (C.gd_sound())
            switch (C.rn2(2, 245, 'dosounds') + hallu) {
            case 1: {
                let gold_in_vault = 0;

                for (vx = sroom.lx; vx <= sroom.hx; vx++)
                    for (vy = sroom.ly; vy <= sroom.hy; vy++)
                        if (C.g_at(vx, vy))
                            gold_in_vault = 1;
                if (C.vault_occupied(C.u.urooms)
                    != (C.ROOM_INDEX(sroom) + C.long(C.ROOMOFFSET))) {
                    if (gold_in_vault) {
                        C.You_hear(!hallu
                                     ? "someone counting gold coins."
                                     : "the quarterback calling the play.");
                    } else {
                        /* Soundeffect(se_someone_searching, 30); */
                        C.You_hear("someone searching.");
                    }
                    break;
                }
            }
            
                /*FALLTHRU*/
            case 0:
                /* Soundeffect(se_guards_footsteps, 30); */
                C.You_hear("the footsteps of a guard on patrol.");
                break;
            case 2:
                C.You_hear("Ebenezer Scrooge!");
                break;
            }
        return;
    }
    if (C.svl.level.flags.has_beehive && !C.rn2(200, 278, 'dosounds')) {
        if (C.get_iter_mons(beehive_mon_sound))
            return;
    }
    if (C.svl.level.flags.has_morgue && !C.rn2(200, 282, 'dosounds')) {
        if (C.get_iter_mons(morgue_mon_sound))
            return;
    }
    if (C.svl.level.flags.has_barracks && !C.rn2(200, 286, 'dosounds')) {
        const barracks_msg = [
            "blades being honed.", "loud snoring.", "dice being thrown.",
            "General MacArthur!",
        ];
        let count = 0;

        for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon) {
            if (C.DEADMONSTER(mtmp))
                continue;
            if (C.is_mercenary(mtmp.data)
                && mon_in_room(mtmp, C.BARRACKS)
                /* sleeping implies not-yet-disturbed (usually) */
                && (mtmp.msleeping || ++count > 5)) {
                C.You_hear1(barracks_msg[C.rn2(3, 304, 'dosounds') + hallu]);
                return;
            }
        }
    }
    if (C.svl.level.flags.has_zoo && !C.rn2(200, 309, 'dosounds')) {
        if (C.get_iter_mons(zoo_mon_sound))
            return;
    }
    if (C.svl.level.flags.has_shop && !C.rn2(200, 313, 'dosounds')) {
        if (!(sroom = C.search_special(C.ANY_SHOP))) {
            /* strange... */
            C.svl.level.flags.has_shop = 0;
            return;
        }
        if (C.tended_shop(sroom)
            && !C.strchr(C.u.ushops, C.int(C.ROOM_INDEX(sroom) + C.long(C.ROOMOFFSET)))) {
            const shop_msg = [
                "someone cursing shoplifters.",
                "the chime of a cash register.", "Neiman and Marcus arguing!",
            ];
            C.You_hear1(shop_msg[C.rn2(2, 325, 'dosounds') + hallu]);
            C.noisy_shop(sroom);
        }
        return;
    }
    if (C.svl.level.flags.has_temple && !C.rn2(200, 330, 'dosounds')
        && !(C.Is_astralevel(C.u.uz) || C.Is_sanctum(C.u.uz))) {
        if (C.get_iter_mons(temple_priest_sound))
            return;
    }
    if (C.Is_oracle_level(C.u.uz) && !C.rn2(400, 335, 'dosounds')) {
        if (C.get_iter_mons(oracle_sound))
            return;
    }
}

export const h_sounds = [
    "beep",   "boing",   "sing",   "belche", "creak",   "cough",
    "rattle", "ululate", "pop",    "jingle", "sniffle", "tinkle",
    "eep",    "clatter", "hum",    "sizzle", "twitter", "wheeze",
    "rustle", "honk",    "lisp",   "yodel",  "coo",     "burp",
    "moo",    "boom",    "murmur", "oink",   "quack",   "rumble",
    "twang",  "toot",    "gargle", "hoot",    "warble"
];

export function growl_sound(mtmp)
{
    let ret;

    switch (mtmp.data.msound) {
    case C.MS_MEW:
    case C.MS_HISS:
        ret = "hiss";
        break;
    case C.MS_BARK:
    case C.MS_GROWL:
        ret = "growl";
        break;
    case C.MS_ROAR:
        ret = "roar";
        break;
    case C.MS_BELLOW:
        ret = "bellow";
        break;
    case C.MS_BUZZ:
        ret = "buzz";
        break;
    case C.MS_SQEEK:
        ret = "squeal";
        break;
    case C.MS_SQAWK:
        ret = "screech";
        break;
    case C.MS_NEIGH:
        ret = "neigh";
        break;
    case C.MS_WAIL:
        ret = "wail";
        break;
    case C.MS_GROAN:
        ret = "groan";
        break;
    case C.MS_MOO:
        ret = "low";
        break;
    case C.MS_SILENT:
        ret = "commotion";
        break;
    default:
        ret = "scream";
    }
    return ret;
}

/* the sounds of a seriously abused pet, including player attacking it */
export function growl(mtmp)
{
    let growl_verb = 0;

    if (C.helpless(mtmp) || mtmp.data.msound == C.MS_SILENT)
        return;

    /* presumably nearness and soundok checks have already been made */
    if (C.Hallucination)
        growl_verb = h_sounds[C.rn2(h_sounds.length, 411, 'growl')];
    else
        growl_verb = growl_sound(mtmp);
    if (growl_verb) {
        if (C.canseemon(mtmp) || !C.Deaf) {
            C.pline("%s %s!", C.Monnam(mtmp), C.vtense(0, growl_verb));
            C.iflags.last_msg = C.PLNMSG_GROWL;
            if (C.svc.context.run)
                C.nomul(0);
        }
        C.wake_nearto(mtmp.mx, mtmp.my, mtmp.data.mlevel * 18);
    }
}

/* the sounds of mistreated pets */
export function yelp(mtmp)
{
    let yelp_verb = 0;
    let se = C.se_yelp;

    if (C.helpless(mtmp) || !mtmp.data.msound)
        return;

    /* presumably nearness and soundok checks have already been made */
    if (C.Hallucination)
        yelp_verb = h_sounds[C.rn2(h_sounds.length, 437, 'yelp')];
    else
        switch (mtmp.data.msound) {
        case C.MS_MEW:
            se = C.se_feline_yelp;
            yelp_verb = (!C.Deaf) ? "yowl" : "arch";
            break;
        case C.MS_BARK:
        case C.MS_GROWL:
            se = C.se_canine_yelp;
            yelp_verb = (!C.Deaf) ? "yelp" : "recoil";
            break;
        case C.MS_ROAR:
            yelp_verb = (!C.Deaf) ? "snarl" : "bluff";
            break;
        case C.MS_SQEEK:
            se = C.se_squeal;
            yelp_verb = (!C.Deaf) ? "squeal" : "quiver";
            break;
        case C.MS_SQAWK:
            se = C.se_avian_screak;
            yelp_verb = (!C.Deaf) ? "screak" : "thrash";
            break;
        case C.MS_WAIL:
            se = C.se_wail;
            yelp_verb = (!C.Deaf) ? "wail" : "cringe";
            break;
        }
    if (yelp_verb) {
        /* Soundeffect(se, 70); */  /* Soundeffect() handles Deaf or not Deaf */
        C.pline("%s %s!", C.Monnam(mtmp), C.vtense(0, yelp_verb));
        if (C.svc.context.run)
            C.nomul(0);
        C.wake_nearto(mtmp.mx, mtmp.my, mtmp.data.mlevel * 12);
    }
    /* nhUse(se); */
}

/* the sounds of distressed pets */
export function whimper(mtmp)
{
    let whimper_verb = 0;
    let se = C.se_canine_whine;
    if (C.helpless(mtmp) || !mtmp.data.msound)
        return;

    /* presumably nearness and soundok checks have already been made */
    if (C.Hallucination)
        whimper_verb = h_sounds[C.rn2(h_sounds.length, 488, 'whimper')];
    else
        switch (mtmp.data.msound) {
        case C.MS_MEW:
        case C.MS_GROWL:
            whimper_verb = "whimper";
            break;
        case C.MS_BARK:
            whimper_verb = "whine";
            break;
        case C.MS_SQEEK:
            se = C.se_squeal;
            whimper_verb = "squeal";
            break;
        }
    if (whimper_verb) {
        if (!C.Hallucination) {
            /* Soundeffect(se, 50); */
        }
        C.pline("%s %s.", C.Monnam(mtmp), C.vtense(0, whimper_verb));
        if (C.svc.context.run)
            C.nomul(0);
        C.wake_nearto(mtmp.mx, mtmp.my, mtmp.data.mlevel * 6);
    }
    /* nhUse(se); */
}

/* pet makes "I'm hungry" noises */
export function beg(mtmp)
{
    if (C.helpless(mtmp)
        || !(C.carnivorous(mtmp.data) || C.herbivorous(mtmp.data)))
        return;

    /* presumably nearness and soundok checks have already been made */
    if (!C.is_silent(mtmp.data) && mtmp.data.msound <= C.MS_ANIMAL) {
        C.callLocal(domonnoise, mtmp);
    } else if (mtmp.data.msound >= C.MS_HUMANOID) {
        if (!C.canspotmon(mtmp))
            C.map_invisible(mtmp.mx, mtmp.my);
        /* SetVoice(mtmp, 0, 80, 0); */
        C.verbalize("I'm hungry.");
    } else {
        /* this is pretty lame but is better than leaving out the block
           of speech types between animal and humanoid; this covers
           MS_SILENT too (if caller lets that get this far) since it's
           excluded by the first two cases */
        if (C.canspotmon(mtmp))
            C.pline("%s seems famished.", C.Monnam(mtmp));
        /* looking famished will be a good trick for a tame skeleton... */
    }
}

/* hero has attacked a peaceful monster within 'mon's view */
export function maybe_gasp(mon)
{
    const Exclam = [
        "Gasp!", "Uh-oh.", "Oh my!", "What?", "Why?",
    ];
    let mptr = mon.data;
    let msound = mptr.msound;
    let dogasp = 0;

    /* other roles' guardians and cross-aligned priests don't gasp */
    if ((msound == C.MS_GUARDIAN && !C.samePtr(mptr, C.mons[C.gu.urole.guardnum]))
        || (msound == C.MS_PRIEST && !C.p_coaligned(mon)))
        msound = C.MS_SILENT;
    /* co-aligned angels do gasp */
    else if (msound == C.MS_CUSS && C.has_emin(mon)
           && (C.p_coaligned(mon) ? !C.EMIN(mon).renegade : C.EMIN(mon).renegade))
        msound = C.MS_HUMANOID;

    /*
     * Only called for humanoids so animal noise handling is ignored.
     */
    switch (msound) {
    case C.MS_HUMANOID:
    case C.MS_ARREST: /* Kops */
    case C.MS_SOLDIER: /* solider, watchman */
    case C.MS_GUARD: /* vault guard */
    case C.MS_NURSE:
    case C.MS_SEDUCE: /* nymph, succubus/incubus */
    case C.MS_LEADER: /* quest leader */
    case C.MS_GUARDIAN: /* leader's guards */
    case C.MS_SELL: /* shopkeeper */
    case C.MS_ORACLE:
    case C.MS_PRIEST: /* temple priest, roaming aligned priest (not mplayer) */
    case C.MS_BOAST: /* giants */
    case C.MS_IMITATE: /* doppelganger, leocrotta, Aleax */
        dogasp = 1;
        break;
    /* issue comprehensible word(s) if hero is similar type of creature */
    case C.MS_ORC: /* used to be synonym for MS_GRUNT */
    case C.MS_GRUNT: /* ogres, trolls, gargoyles, one or two others */
    case C.MS_LAUGH: /* leprechaun, gremlin */
    case C.MS_ROAR: /* dragon, xorn, owlbear */
    case C.MS_BELLOW: /* crocodile */
    /* capable of speech but only do so if hero is similar type */
    case C.MS_DJINNI:
    case C.MS_VAMPIRE: /* vampire in its own form */
    case C.MS_WERE: /* lycanthrope in human form */
    case C.MS_SPELL: /* titan, barrow wight, Nazgul, nalfeshnee */
        dogasp = (mptr.mlet == C.gy.youmonst.data.mlet);
        break;
    /* capable of speech but don't care if you attack peacefuls */
    case C.MS_BRIBE:
    case C.MS_CUSS:
    case C.MS_RIDER:
    case C.MS_NEMESIS:
    /* can't speak */
    case C.MS_SILENT:
    default:
        break;
    }
    if (dogasp) {
        return Exclam[C.rn2(Exclam.length, 607, 'maybe_gasp')]; /* [mon->m_id % SIZE(Exclam)]; */
    }
    return 0;
}

/* for egg hatching; caller will apply "ing" suffix
   [the old message when a carried egg hatches was
   "its cries sound like {mommy,daddy}"
   regardless of what type of sound--if any--the creature made] */
export function cry_sound(mtmp)
{
    let ret = 0;
    let ptr = mtmp.data;

    /* a relatively small subset of MS_ sound values are used by oviparous
       species so we don't try to supply something for every MS_ type */
    switch (ptr.msound) {
    default:
    case C.MS_SILENT: /* insects, arthropods, worms, sea creatures */
        /* "chitter": have silent critters make some noise
           or the mommy/daddy gag when hatching doesn't work */
        ret = (ptr.mlet == C.S_EEL) ? "gurgle" : "chitter";
        break;
    case C.MS_HISS: /* chickatrice, pyrolisk, snakes */
        ret = "hiss";
        break;
    case C.MS_ROAR: /* baby dragons; have them growl instead of roar */
    case C.MS_GROWL: /* (none) */
        ret = "growl";
        break;
    case C.MS_CHIRP: /* adult crocodiles bellow, babies chirp */
        ret = "chirp";
        break;
    case C.MS_BUZZ: /* killer bees */
        ret = "buzz";
        break;
    case C.MS_SQAWK: /* ravens */
        ret = "screech";
        break;
    case C.MS_GRUNT: /* gargoyles */
        ret = "grunt";
        break;
    case C.MS_MUMBLE: /* naga hatchlingss */
        ret = "mumble";
        break;
    }
    return ret;
}

/* return True if mon is a gecko or seems to look like one (hallucination) */
export function mon_is_gecko(mon)
{
    let glyph;

    /* return True if it is actually a gecko */
    if (C.samePtr(mon.data, C.mons[C.PM_GECKO]))
        return 1;
    /* return False if it is a long worm; we might be chatting to its tail
       (not strictly needed; long worms are MS_SILENT so won't get here) */
    if (C.samePtr(mon.data, C.mons[C.PM_LONG_WORM]))
        return 0;
    /* result depends upon whether map spot shows a gecko, which will
       be due to hallucination or to mimickery since mon isn't one */
    glyph = C.glyph_at(mon.mx, mon.my);
    return C.boolean(C.glyph_to_mon(glyph) == C.PM_GECKO);
}

export function domonnoise(mtmp)
/* check calls to this */
{
    const verbuf = C.stackAlloc(C.BUFSZ);
    let pline_msg = 0, /* Monnam(mtmp) will be prepended */
        verbl_msg = 0,                 /* verbalize() */
        verbl_msg_mcan = 0;            /* verbalize() if cancelled */
    let ptr = mtmp.data;
    let msound = ptr.msound, gnomeplan = 0;

    /* presumably nearness and sleep checks have already been made */
    if (C.Deaf)
        return C.ECMD_OK;
    /* shk_chat can handle nonverbal monsters */
    if (C.is_silent(ptr) && !mtmp.isshk)
        return C.ECMD_OK;

    /* leader might be poly'd; if he can still speak, give leader speech */
    if (mtmp.m_id == C.svq.quest_status.leader_m_id && msound > C.MS_ANIMAL)
        msound = C.MS_LEADER;
    /* make sure it's your role's quest guardian; adjust if not */
    else if (msound == C.MS_GUARDIAN && !C.samePtr(ptr, C.mons[C.gu.urole.guardnum]))
        msound = C.mons[C.genus(C.monsndx(ptr), 1)].msound;
    /* even polymorphed, shopkeepers retain their minds and capitalist bent */
    else if (mtmp.isshk)
        msound = C.MS_SELL;
    /* some normally non-speaking types can/will speak if hero is similar */
    else if (msound == C.MS_ORC
             && ((C.same_race(ptr, C.gy.youmonst.data)        /* current form, */
                  || C.same_race(ptr, C.mons[C.Race_switch])) /* unpoly'd form */
                 || C.Hallucination))
        msound = C.MS_HUMANOID;
    else if (msound == C.MS_MOO && !mtmp.mtame)
        msound = C.MS_BELLOW;
    /* silliness; formerly had a slight chance to interfere with shopping */
    else if (C.Hallucination && mon_is_gecko(mtmp))
        msound = C.MS_SELL;

    /* be sure to do this before talking; the monster might teleport away, in
     * which case we want to check its pre-teleport position
     */
    if (!C.canspotmon(mtmp))
        C.map_invisible(mtmp.mx, mtmp.my);

    switch (msound) {
    case C.MS_ORACLE:
        return C.doconsult(mtmp); /* check this */
    case C.MS_PRIEST:
        C.priest_talk(mtmp);
        break;
    case C.MS_LEADER:
    case C.MS_NEMESIS:
    case C.MS_GUARDIAN:
        C.quest_chat(mtmp);
        break;
    case C.MS_SELL: /* pitch, pay, total */
        if (!C.Hallucination || C.is_silent(ptr) || (mtmp.isshk && !C.rn2(2, 734, 'domonnoise'))) {
            C.shk_chat(mtmp);
        } else {
            /* approximation of GEICO's advertising slogan (it actually
               concludes with "save you 15% or more on car insurance.") */
            C.Sprintf(verbuf, "15 minutes could save you 15 %s.",
                    C.currency(15n)); /* "zorkmids" */
            verbl_msg = verbuf;
        }
        break;
    case C.MS_VAMPIRE: {
        /* vampire messages are varied by tameness, peacefulness, and time of
           night */
        let isnight = C.night();
        let kindred = (C.Upolyd && (C.u.umonnum == C.PM_VAMPIRE
                                      || C.u.umonnum == C.PM_VAMPIRE_LEADER));
        let nightchild = (C.Upolyd && (C.u.umonnum == C.PM_WOLF
                                         || C.u.umonnum == C.PM_WINTER_WOLF
                                         || C.u.umonnum == C.PM_WINTER_WOLF_CUB));
        let racenoun = (C.flags.female && C.gu.urace.individual.f)
                               ? C.gu.urace.individual.f
                               : (C.gu.urace.individual.m)
                                 ? C.gu.urace.individual.m
                                 : C.gu.urace.noun;

        if (mtmp.mtame) {
            if (kindred) {
                C.Sprintf(verbuf, "Good %s to you Master%s",
                        isnight ? "evening" : "day",
                        isnight ? "!" : ".  Why do we not rest?");
                verbl_msg = verbuf;
            } else {
                C.Sprintf(verbuf, "%s%s",
                        nightchild ? "Child of the night, " : "",
                        C.midnight()
                         ? "I can stand this craving no longer!"
                         : isnight
                          ? "I beg you, help me satisfy this growing craving!"
                          : "I find myself growing a little weary.");
                verbl_msg = verbuf;
            }
        } else if (mtmp.mpeaceful) {
            if (kindred && isnight) {
                C.Sprintf(verbuf, "Good feeding %s!",
                        C.flags.female ? "sister" : "brother");
                verbl_msg = verbuf;
            } else if (nightchild && isnight) {
                C.Sprintf(verbuf, "How nice to hear you, child of the night!");
                verbl_msg = verbuf;
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
                verbl_msg = "This is my hunting ground that you dare to prowl!";
            } else if (C.samePtr(C.gy.youmonst.data, C.mons[C.PM_SILVER_DRAGON])
                       || C.samePtr(C.gy.youmonst.data, C.mons[C.PM_BABY_SILVER_DRAGON])) {
                /* Silver dragons are silver in color, not made of silver */
                C.Sprintf(verbuf,
                        "%s!  Your silver sheen does not frighten me!",
                        (C.samePtr(C.gy.youmonst.data, C.mons[C.PM_SILVER_DRAGON]))
                            ? "Fool"
                            : "Young Fool");
                verbl_msg = verbuf;
            } else {
                vampindex = C.rn2(C.SIZE(vampmsg), 807, 'domonnoise');
                if (vampindex == 0) {
                    C.Sprintf(verbuf, vampmsg[vampindex], C.body_part(C.BLOOD));
                    verbl_msg = verbuf;
                } else if (vampindex == 1) {
                    C.Sprintf(verbuf, vampmsg[vampindex],
                            C.Upolyd ? C.an(C.pmname(C.mons[C.u.umonnum],
                                               C.flags.female ? C.FEMALE : C.MALE))
                                   : C.an(racenoun));
                    verbl_msg = verbuf;
                } else
                    verbl_msg = vampmsg[vampindex];
            }
        }
        break;
    }
    case C.MS_WERE:
        if (C.flags.moonphase == C.FULL_MOON && (C.night() ^ !C.rn2(13, 824, 'domonnoise'))) {
            C.pline("%s throws back %s head and lets out a blood curdling %s!",
                  C.Monnam(mtmp), C.mhis(mtmp),
                  (C.samePtr(ptr, C.mons[C.PM_HUMAN_WERERAT])) ? "shriek" : "howl");
            /* Soundeffect((ptr == &mons[PM_HUMAN_WERERAT]) ? se_scream
                                                         : se_canine_howl,
                        80); */
            C.wake_nearto(mtmp.mx, mtmp.my, 11 * 11);
        } else {
            pline_msg =
                "whispers inaudibly.  All you can make out is \"moon\".";
        }
        break;
    case C.MS_BARK:
        if (C.flags.moonphase == C.FULL_MOON && C.night()) {
            pline_msg = "howls.";
        } else if (mtmp.mpeaceful) {
            if (mtmp.mtame
                && (mtmp.mconf || mtmp.mflee || mtmp.mtrapped
                    || C.svm.moves > C.EDOG(mtmp).hungrytime || mtmp.mtame < 5))
                pline_msg = "whines.";
            else if (mtmp.mtame && C.EDOG(mtmp).hungrytime > C.long(C.svm.moves + 1000n))
                pline_msg = "yips.";
            else {
                if (!C.samePtr(ptr, C.mons[C.PM_DINGO])) /* dingos do not actually bark */
                    pline_msg = "barks.";
            }
        } else {
            pline_msg = "growls.";
        }
        break;
    case C.MS_MEW:
        if (mtmp.mtame) {
            if (mtmp.mconf || mtmp.mflee || mtmp.mtrapped
                || mtmp.mtame < 5) {
                /* Soundeffect(se_feline_yowl, 80); */
                pline_msg = "yowls.";
            } else if (C.svm.moves > C.EDOG(mtmp).hungrytime) {
                /* Soundeffect(se_feline_meow, 80); */
                pline_msg = "meows.";
            } else if (C.EDOG(mtmp).hungrytime > C.long(C.svm.moves + 1000n)) {
                /* Soundeffect(se_feline_purr, 40); */
                pline_msg = "purrs.";
            } else {
                /* Soundeffect(se_feline_mew, 60); */
                pline_msg = "mews.";
            }
            break;
        }
        
        /*FALLTHRU*/
    case C.MS_GROWL:
        /* Soundeffect((mtmp->mpeaceful ? se_snarl : se_growl), 80); */
        pline_msg = mtmp.mpeaceful ? "snarls." : "growls!";
        break;
    case C.MS_ROAR:
        /* Soundeffect((mtmp->mpeaceful ? se_snarl : se_roar), 80); */
        pline_msg = mtmp.mpeaceful ? "snarls." : "roars!";
        break;
    case C.MS_SQEEK:
        /* Soundeffect(se_squeak, 80); */
        pline_msg = "squeaks.";
        break;
    case C.MS_SQAWK:
        if (C.samePtr(ptr, C.mons[C.PM_RAVEN]) && !mtmp.mpeaceful) {
            verbl_msg = "Nevermore!";
        } else {
            /* Soundeffect(se_squawk, 80); */
            pline_msg = "squawks.";
        }
        break;
    case C.MS_HISS:
        if (!mtmp.mpeaceful) {
            /* Soundeffect(se_hiss, 80); */
            pline_msg = "hisses!";
        } else {
            return C.ECMD_OK; /* no sound */
        }
        break;
    case C.MS_BUZZ:
        /* Soundeffect((mtmp->mpeaceful ? se_buzz : se_angry_drone), 80); */
        pline_msg = mtmp.mpeaceful ? "drones." : "buzzes angrily.";
        break;
    case C.MS_GRUNT:
        /* Soundeffect(se_grunt, 60); */
        pline_msg = "grunts.";
        break;
    case C.MS_NEIGH:
        if (mtmp.mtame < 5) {
            /* Soundeffect(se_equine_neigh, 60); */
            pline_msg = "neighs.";
        } else if (C.svm.moves > C.EDOG(mtmp).hungrytime) {
            /* Soundeffect(se_equine_whinny, 60); */
            pline_msg = "whinnies.";
        } else {
            /* Soundeffect(se_equine_whicker, 60); */
            pline_msg = "whickers.";
        }
        break;
    case C.MS_MOO:
        /* Soundeffect(se_bovine_moo, 80); */
        pline_msg = "moos.";
        break;
    case C.MS_BELLOW:
        /* Soundeffect((ptr->mlet == S_QUADRUPED) ? se_bovine_bellow
                                               : se_croc_bellow,
                    80); */
        pline_msg = "bellows!";
        break;
    case C.MS_CHIRP:
        /* Soundeffect(se_chirp, 60); */
        pline_msg = "chirps.";
        break;
    case C.MS_WAIL:
        /* Soundeffect(se_sad_wailing, 60); */
        pline_msg = "wails mournfully.";
        break;
    case C.MS_GROAN:
        if (!C.rn2(3, 942, 'domonnoise')) {
            /* Soundeffect(se_groan, 60); */
            pline_msg = "groans.";
        }
        break;
    case C.MS_GURGLE:
        /* Soundeffect(se_gurgle, 60); */
        pline_msg = "gurgles.";
        break;
    case C.MS_BURBLE:
        /* Soundeffect(se_jabberwock_burble, 60); */
        pline_msg = "burbles.";
        break;
    case C.MS_TRUMPET:
        /* Soundeffect(se_elephant_trumpet, 60); */
        pline_msg = "trumpets!";
        C.wake_nearto(mtmp.mx, mtmp.my, 11 * 11);
        break;
    case C.MS_SHRIEK:
        /* Soundeffect(se_shriek, 60); */
        pline_msg = "shrieks.";
        C.aggravate();
        break;
    case C.MS_IMITATE:
        pline_msg = "imitates you.";
        break;
    case C.MS_BONES:
        /* Soundeffect(se_bone_rattle, 60); */
        C.pline("%s rattles noisily.", C.Monnam(mtmp));
        C.You("freeze for a moment.");
        C.nomul(-2);
        C.gm.multi_reason = "scared by rattling";
        C.gn.nomovemsg = 0;
        break;
    case C.MS_LAUGH: {
        const laugh_msg = [
            "giggles.", "chuckles.", "snickers.", "laughs.",
        ];
        /* Soundeffect(se_laughter, 60); */
        pline_msg = laugh_msg[C.rn2(4, 981, 'domonnoise')];
        break;
    }
    case C.MS_MUMBLE:
        pline_msg = "mumbles incomprehensibly.";
        break;
    case C.MS_ORC: /* this used to be an alias for grunt, now it is distinct */
        /* Soundeffect(se_orc_grunt, 60); */
        pline_msg = "grunts.";
        break;
    case C.MS_DJINNI:
        if (mtmp.mtame) {
            verbl_msg = "Sorry, I'm all out of wishes.";
        } else if (mtmp.mpeaceful) {
            if (C.samePtr(ptr, C.mons[C.PM_WATER_DEMON]))
                pline_msg = "gurgles.";
            else
                verbl_msg = "I'm free!";
        } else {
            if (!C.samePtr(ptr, C.mons[C.PM_PRISONER]))
                verbl_msg = "This will teach you not to disturb me!";
            else /* vague because prisoner might already be out of cell */
                verbl_msg = "Get me out of here.";
        }
        break;
    case C.MS_BOAST: /* giants */
        if (!mtmp.mpeaceful) {
            switch (C.rn2(4, 1008, 'domonnoise')) {
            case 0:
                C.pline("%s boasts about %s gem collection.", C.Monnam(mtmp),
                      C.mhis(mtmp));
                break;
            case 1:
                pline_msg = "complains about a diet of mutton.";
                break;
            default:
                pline_msg = "shouts \"Fee Fie Foe Foo!\" and guffaws.";
                C.wake_nearto(mtmp.mx, mtmp.my, 7 * 7);
                break;
            }
            break;
        }
        
        /*FALLTHRU*/
    case C.MS_HUMANOID:
        if (!mtmp.mpeaceful) {
            if (C.In_endgame(C.u.uz) && C.is_mplayer(ptr))
                C.mplayer_talk(mtmp);
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
            verbl_msg = !C.rn2(3, 1039, 'domonnoise') ? "Huh?" : C.rn2(2, 1039, 'domonnoise') ? "What?" : "Eh?";
        else if (!mtmp.mcansee)
            verbl_msg = "I can't see!";
        else if (mtmp.mtrapped) {
            let t = C.t_at(mtmp.mx, mtmp.my);

            if (t)
                t.tseen = 1;
            verbl_msg = "I'm trapped!";
        } else if (mtmp.mhp < Math.trunc(mtmp.mhpmax / 2))
            pline_msg = "asks for a potion of healing.";
        else if (mtmp.mtame && !mtmp.isminion
                 && C.svm.moves > C.EDOG(mtmp).hungrytime)
            verbl_msg = "I'm hungry.";
        /* Specific monsters' interests */
        else if (C.is_elf(ptr))
            pline_msg = "curses orcs.";
        else if (C.is_dwarf(ptr))
            pline_msg = "talks about mining.";
        else if (C.likes_magic(ptr))
            pline_msg = "talks about spellcraft.";
        else if (ptr.mlet == C.S_CENTAUR)
            pline_msg = "discusses hunting.";
        else if (C.is_gnome(ptr)) {
            if (C.Hallucination && (gnomeplan = C.rn2(4, 1063, 'domonnoise')) % 2) {
                /* skipped for rn2(4) result of 0 or 2;
                   gag from an early episode of South Park called "Gnomes";
                   initially, Tweek (introduced in that episode) is the only
                   one aware of the tiny gnomes after spotting them sneaking
                   about; they are embarked upon a three-step business plan;
                   a diagram of the plan shows:
                               Phase 1         Phase 2      Phase 3
                         Collect underpants       ?          Profit
                   and they never verbalize step 2 so we don't either */
                verbl_msg = (gnomeplan == 1)
                            ? "Phase one, collect underpants."
                            : "Phase three, profit!";
            } else {
                verbl_msg = "Many enter the dungeon, and few return to the sunlit lands.";
            }
        } else
            switch (C.monsndx(ptr)) {
            case C.PM_HOBBIT:
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
            case C.PM_ARCHEOLOGIST:
                pline_msg =
                "describes a recent article in \"Spelunker Today\" magazine.";
                break;
            case C.PM_TOURIST:
                verbl_msg = "Aloha.";
                break;
            default:
                pline_msg = "discusses dungeon exploration.";
                break;
            }
        break;
    case C.MS_SEDUCE: {
        let swval;

        if (C.SYSOPT_SEDUCE) {
            if (ptr.mlet != C.S_NYMPH
                && (C.could_seduce(mtmp, C.gy.youmonst, 0)
                    == 1)) {
                C.doseduce(mtmp);
                break;
            }
            swval = ((C.poly_gender() != C.int(mtmp.female)) ? C.rn2(3, 1115, 'domonnoise') : 0);
        } else
            swval = ((C.poly_gender() == 0) ? C.rn2(3, 1117, 'domonnoise') : 0);
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
    } break;
    case C.MS_ARREST:
        if (mtmp.mpeaceful) {
            /* SetVoice(mtmp, 0, 80, 0); */
            C.verbalize("Just the facts, %s.", C.flags.female ? "Ma'am" : "Sir");
        } else {
            const arrest_msg = [
                "Anything you say can be used against you.",
                "You're under arrest!", "Stop in the name of the Law!",
            ];
            verbl_msg = arrest_msg[C.rn2(3, 1138, 'domonnoise')];
        }
        break;
    case C.MS_BRIBE:
        if (mtmp.mpeaceful && !mtmp.mtame) {
            C.demon_talk(mtmp);
            break;
        }
        
        /* FALLTHRU */
    case C.MS_CUSS:
        if (!mtmp.mpeaceful)
            C.cuss(mtmp);
        else if (C.is_lminion(mtmp))
            verbl_msg = "It's not too late.";
        else
            verbl_msg = "We're all doomed.";
        break;
    case C.MS_SPELL:
        /* deliberately vague, since it's not actually casting any spell */
        pline_msg = "seems to mutter a cantrip.";
        break;
    case C.MS_NURSE:
        verbl_msg_mcan = "I hate this job!";
        if (C.uwep && (C.uwep.oclass == C.WEAPON_CLASS || C.is_weptool(C.uwep)))
            verbl_msg = "Put that weapon away before you hurt someone!";
        else if (C.uarmc || C.uarm || C.uarmh || C.uarms || C.uarmg || C.uarmf)
            verbl_msg = C.Role_if(C.PM_HEALER)
                            ? "Doc, I can't help you unless you cooperate."
                            : "Please undress so I can examine you.";
        else if (C.uarmu)
            verbl_msg = "Take off your shirt, please.";
        else
            verbl_msg = "Relax, this won't hurt a bit.";
        break;
    case C.MS_GUARD:
        if (C.money_cnt(C.gi.invent))
            verbl_msg = "Please drop that gold and follow me.";
        else
            verbl_msg = "Please follow me.";
        break;
    case C.MS_SOLDIER: {
        const soldier_foe_msg = [
                "Resistance is useless!", "You're dog meat!", "Surrender!",
            ], soldier_pax_msg = [
                "What lousy pay we're getting here!",
                "The food's not fit for Orcs!",
                "My feet hurt, I've been on them all day!",
            ];
        verbl_msg = mtmp.mpeaceful ? soldier_pax_msg[C.rn2(3, 1189, 'domonnoise')]
                                    : soldier_foe_msg[C.rn2(3, 1190, 'domonnoise')];
        break;
    }
    case C.MS_RIDER: {
        let tribtitle;
        let book = 0;
        let ms_Death = (C.samePtr(ptr, C.mons[C.PM_DEATH]));

        /* 3.6 tribute */
        if (ms_Death && !C.svc.context.tribute.Deathnotice
            && (book = C.u_have_novel()) != 0) {
            if ((tribtitle = C.noveltitle(C.intReference(book, "novelidx"))) != 0) {
                C.Sprintf(verbuf, "Ah, so you have a copy of /%s/.", tribtitle);
                /* no Death featured in these two, so exclude them */
                if (C.strcmpi(tribtitle, "Snuff")
                    && C.strcmpi(tribtitle, "The Wee Free Men"))
                    C.Strcat(verbuf, "  I may have been misquoted there.");
                verbl_msg = verbuf;
            }
            C.svc.context.tribute.Deathnotice = 1;
        } else if (ms_Death && C.rn2(3, 1210, 'domonnoise') && C.Death_quote(verbuf, C.BUFSZ)) {
            verbl_msg = verbuf;
        /* end of tribute addition */

        } else if (ms_Death && !C.rn2(10, 1214, 'domonnoise')) {
            pline_msg = "is busy reading a copy of Sandman #8.";
        } else
            verbl_msg = "Who do you think you are, War?";
        break;
    } /* case MS_RIDER */
    } /* switch */

    if (pline_msg) {
        C.pline("%s %s", C.Monnam(mtmp), pline_msg);
    } else if (mtmp.mcan && verbl_msg_mcan) {
        /* SetVoice(mtmp, 0, 80, 0); */
        C.verbalize1(verbl_msg_mcan);
    } else if (verbl_msg) {
        /* more 3.6 tribute */
        if (C.samePtr(ptr, C.mons[C.PM_DEATH])) {
            /* Death talks in CAPITAL LETTERS
               and without quotation marks */
            const tmpbuf = C.stackAlloc(C.BUFSZ);
            C.pline1(C.ucase(C.strcpy(tmpbuf, verbl_msg)));
            /* SetVoice((struct monst *) 0, 0, 80, voice_death); */
            sound_speak(tmpbuf);
        } else {
            /* SetVoice(mtmp, 0, 80, 0); */
            C.verbalize1(verbl_msg);
        }
    }
    return C.ECMD_TIME;
}

/* #chat command */
export function dotalk()
{
    let result;

    result = C.callLocal(dochat);
    return result;
}

export function dochat()
{
    let mtmp;
    let tx, ty;
    let otmp;

    if (C.is_silent(C.gy.youmonst.data)) {
        C.pline("As %s, you cannot speak.",
              C.an(C.pmname(C.gy.youmonst.data, C.flags.female ? C.FEMALE : C.MALE)));
        return C.ECMD_OK;
    }
    if (C.Strangled) {
        C.You_cant("speak.  You're choking!");
        return C.ECMD_OK;
    }
    if (C.u.uswallow) {
        C.pline("They won't hear you out there.");
        return C.ECMD_OK;
    }
    if (C.Underwater) {
        C.Your("speech is unintelligible underwater.");
        return C.ECMD_OK;
    }
    if (!C.Deaf && !C.Blind && (otmp = C.shop_object(C.u.ux, C.u.uy)) != 0) {
        /* standing on something in a shop and chatting causes the shopkeeper
           to describe the price(s).  This can inhibit other chatting inside
           a shop, but that shouldn't matter much.  shop_object() returns an
           object iff inside a shop and the shopkeeper is present and willing
           (not angry) and able (not asleep) to speak and the position
           contains any objects other than just gold.
        */
        C.price_quote(otmp);
        return C.ECMD_TIME;
    }

    if (!C.getdir("Talk to whom? (in what direction)")) {
        /* decided not to chat */
        return C.ECMD_CANCEL;
    }

    if (C.u.usteed && C.u.dz > 0) {
        if (C.helpless(C.u.usteed)) {
            C.pline("%s seems not to notice you.", C.Monnam(C.u.usteed));
            return C.ECMD_TIME;
        } else
            return C.callLocal(domonnoise, C.u.usteed);
    }

    if (C.u.dz) {
        C.pline("They won't hear you %s there.", C.u.dz < 0 ? "up" : "down");
        return C.ECMD_OK;
    }

    if (C.u.dx == 0 && C.u.dy == 0) {
        /*
         * Let's not include this.
         * It raises all sorts of questions: can you wear
         * 2 helmets, 2 amulets, 3 pairs of gloves or 6 rings as a marilith,
         * etc...  --KAA
        if (u.umonnum == PM_ETTIN) {
            You("discover that your other head makes boring conversation.");
            return 1;
        }
         */
        C.pline("Talking to yourself is a bad habit for a dungeoneer.");
        return C.ECMD_OK;
    }

    tx = C.u.ux + C.u.dx;
    ty = C.u.uy + C.u.dy;

    if (!C.isok(tx, ty))
        return C.ECMD_OK;

    mtmp = C.m_at(tx, ty);

    if (!mtmp || mtmp.mundetected) {
        if ((otmp = C.vobj_at(tx, ty)) != 0 && otmp.otyp == C.STATUE) {
            /* Talking to a statue */
            if (!C.Blind)
                C.pline_The("%s seems not to notice you.",
                          /* if hallucinating, you can't tell it's a statue */
                          C.Hallucination ? C.rndmonnam(0) : "statue");
            return C.ECMD_OK;
        }
        if (!C.Deaf && (C.IS_WALL(C.levl[tx][ty].typ)
                      || C.levl[tx][ty].typ == C.SDOOR)) {
            /* Talking to a wall; secret door remains hidden by behaving
               like a wall; IS_WALL() test excludes solid rock even when
               that serves as a wall bordering a corridor */
            if (C.Blind && !C.IS_WALL(C.svl.lastseentyp[tx][ty])) {
                /* when blind, you can only talk to a wall if it has
                   already been mapped as a wall */
                ;
            } else if (!C.Hallucination) {
                C.pline("It's like talking to a wall.");
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
                let idx = C.rn2(10, 1364, 'dochat');

                if (idx >= C.SIZE(walltalk))
                    idx = C.SIZE(walltalk) - 1;
                C.pline_The("wall %s", walltalk[idx]);
            }
            return C.ECMD_OK;
        }
    }

    if (!mtmp || mtmp.mundetected
        || C.M_AP_TYPE(mtmp) == C.M_AP_FURNITURE
        || C.M_AP_TYPE(mtmp) == C.M_AP_OBJECT)
        return C.ECMD_OK;

    /* sleeping monsters won't talk, except priests (who wake up) */
    if (C.helpless(mtmp) && !mtmp.ispriest) {
        /* If it is unseen, the player can't tell the difference between
           not noticing him and just not existing, so skip the message. */
        if (C.canspotmon(mtmp))
            C.pline("%s seems not to notice you.", C.Monnam(mtmp));
        return C.ECMD_OK;
    }

    /* if this monster is waiting for something, prod it into action */
    mtmp.mstrategy &= ~C.STRAT_WAITMASK;

    if (!C.Deaf && mtmp.mtame && mtmp.meating) {
        if (!C.canspotmon(mtmp))
            C.map_invisible(mtmp.mx, mtmp.my);
        C.pline("%s is eating noisily.", C.Monnam(mtmp));
        return C.ECMD_OK;
    }
    if (C.Deaf) {
        let xresponse = C.humanoid(C.gy.youmonst.data)
                    ? "falls on deaf ears"
                    : "is inaudible";

        C.pline("Any response%s%s %s.",
              C.canspotmon(mtmp) ? " from " : "",
              C.canspotmon(mtmp) ? C.mon_nam(mtmp) : "",
              xresponse);
        return C.ECMD_OK;
    }
    return C.callLocal(domonnoise, mtmp);
}

/* is there a monster at <x,y> that can see the hero and react? */
export function responsive_mon_at(x, y)
{
    x = C.int(x); y = C.int(y);
    let mtmp = C.isok(x, y) ? C.m_at(x, y) : 0;

    if (mtmp && (C.helpless(mtmp) /* immobilized monst */
                 || !mtmp.mcansee || !C.haseyes(mtmp.data) /* blind monst */
                 || (C.Invis && !C.perceives(mtmp.data)) /* unseen hero */
                 || (x != mtmp.mx || y != mtmp.my))) /* worm tail */
        mtmp = 0;
    return mtmp;
}

/* player chose 'uarmh' for #tip (pickup.c); visual #chat, sort of... */
export function tiphat()
{
    let mtmp;
    let otmp;
    let x, y, range, glyph, vismon, unseen, statue, res;

    if (!C.uarmh) /* can't get here from there */
        return 0;

    res = C.uarmh.bknown ? 0 : 1;
    if (C.cursed(C.uarmh)) /* "You can't.  It is cursed." */
        return res; /* if learned of curse, use a move */

    /* might choose a position, but dealing with direct lines is simpler */
    if (!C.getdir("At whom? (in what direction)")) /* bail on ESC */
        return res; /* iffy; now know it's not cursed for sure (since we got
                     * past prior test) but might have already known that */
    res = 1; /* physical action is going to take place */

    /* most helmets have a short wear/take-off delay and we could set
       'multi' to account for that, but we'll pretend that no extra time
       beyond the current move is necessary */
    C.You("briefly doff your %s.", C.helm_simple_name(C.uarmh));

    if (!C.u.dx && !C.u.dy) {
        if (C.u.usteed && C.u.dz > 0) {
            if (C.helpless(C.u.usteed))
                C.pline("%s doesn't notice.", C.Monnam(C.u.usteed));
            else
                C.callLocal(domonnoise, C.u.usteed);
        } else if (C.u.dz) {
            C.pline("There's no one %s there.", (C.u.dz < 0) ? "up" : "down");
        } else {
            C.pline_The("lout here doesn't acknowledge you...");
        }
        return res;
    }

    mtmp = 0;
    vismon = unseen = statue = 0, glyph = C.GLYPH_MON_OFF;
    x = C.u.ux, y = C.u.uy;
    for (range = 1; range <= C.BOLT_LIM + 1; ++range) {
        x += C.u.dx, y += C.u.dy;
        if (!C.isok(x, y) || (range > 1 && !C.couldsee(x, y))) {
            /* switch back to coordinates for previous iteration's 'mtmp' */
            x -= C.u.dx, y -= C.u.dy;
            break;
        }
        mtmp = C.m_at(x, y);
        vismon = (mtmp && C.canseemon(mtmp));
        glyph = C.glyph_at(x, y);
        unseen = C.glyph_is_invisible(glyph);
        statue = (C.glyph_is_statue(glyph) /* mimic or hallucinatory statue */
                  || (!vismon && !unseen && (otmp = C.vobj_at(x, y)) != 0
                      && otmp.otyp == C.STATUE)); /* or actual statue */
        if (vismon && (C.M_AP_TYPE(mtmp) == C.M_AP_FURNITURE
                       || C.M_AP_TYPE(mtmp) == C.M_AP_OBJECT))
            vismon = 0, mtmp = 0;
        if (vismon || unseen || (statue && C.Hallucination)
            /* unseen adjacent monster will respond if able */
            || (range == 1 && mtmp && responsive_mon_at(x, y)
                && !C.is_silent(mtmp.data))
            /* we check accessible() after m_at() in case there's a
               visible monster phazing through a wall here */
            || !(C.accessible(x, y) || C.levl[x][y].typ == C.IRONBARS))
            break;
    }

    done: {
    nada: {
    if (unseen || (statue && C.Hallucination)) {
        C.pline("That %screature is ignoring you!", unseen ? "unseen " : "");
    } else if (!mtmp || !responsive_mon_at(x, y)) {
        if (vismon) /* 'vismon' is only True when 'mtmp' is non-Null */
            C.pline("%s seems not to notice you.", C.Monnam(mtmp));
        else
            break nada;
    } else { /* 'mtmp' is guaranteed to be non-Null if we get here */
        /* if this monster is waiting for something, prod it into action */
        mtmp.mstrategy &= ~C.STRAT_WAITMASK;

        if (vismon && C.humanoid(mtmp.data) && mtmp.mpeaceful && !C.Conflict) {
            if ((otmp = C.which_armor(mtmp, C.W_ARMH)) == 0) {
                C.pline("%s waves.", C.Monnam(mtmp));
            } else if (otmp.cursed) {
                C.pline("%s grasps %s %s but can't remove it.", C.Monnam(mtmp),
                      C.mhis(mtmp), C.helm_simple_name(otmp));
                otmp.bknown = 1;
            } else {
                C.pline("%s tips %s %s in response.", C.Monnam(mtmp),
                      C.mhis(mtmp), C.helm_simple_name(otmp));
            }
        } else if (vismon && C.humanoid(mtmp.data)) {
            const reaction = [
                "curses", "gestures rudely", "gestures offensively",
            ];
            let which = !C.Deaf ? C.rn2(3, 1521, 'tiphat') : C.rn1(2, 1, 1521, 'tiphat'),
                twice = (C.Deaf || which > 0 || C.rn2(3, 1522, 'tiphat')) ? 0 : C.rn1(2, 1, 1522, 'tiphat');

            C.pline("%s %s%s%s at you...", C.Monnam(mtmp), reaction[which],
                  twice ? " and " : "", twice ? reaction[twice] : "");
        } else if (C.next2u(x, y) && !C.Deaf && C.callLocal(domonnoise, mtmp)) {
            if (!vismon)
                C.map_invisible(x, y);
        } else if (vismon) {
            C.pline("%s doesn't respond.", C.Monnam(mtmp));
        } else {
            break nada;
        }
    }
    break done;
    }
    C.pline("%s", C.nothing_happens);
    }
    return res;
}





export const nosound_procs = {soundname:"nosound", soundlib_id:"soundlib_nosound", sound_triggers:0n,
    sound_init_nhsound:0, sound_exit_nhsound:0, sound_achievement:0,
    sound_soundeffect:0, sound_hero_playnotes:0, sound_play_usersound:0,
    sound_ambience:0, sound_verbal:0};
/* init_nhsound   */
/* exit_nhsound   */
/* achievement    */
/* sound effect   */
/* hero_playnotes */
/* play_usersound */
/* ambience       */
/* verbal */

/* The order of these array entries must match the
   order of the enum soundlib_ids in sndprocs.h */

export const soundlib_choices = [{sndprocs:nosound_procs}];

export function activate_chosen_soundlib()
{
    let idx = C.gc.chosen_soundlib;

    if (!C.IndexOk(idx, C.soundlib_choices))
        C.panic("activate_chosen_soundlib: invalid soundlib (%d)", idx);

    if (C.ga.active_soundlib != C.soundlib_nosound || idx != C.soundlib_nosound) {
        if (C.soundprocs.sound_exit_nhsound)
            C.callExit(C.soundprocs.sound_exit_nhsound, "assigning a new sound library");
    }
    C.soundprocs = C.soundlib_choices[idx].sndprocs;
    if (C.soundprocs.sound_init_nhsound)
        C.callInit(C.soundprocs.sound_init_nhsound);
    C.ga.active_soundlib = C.soundprocs.soundlib_id;
    C.gc.chosen_soundlib = C.ga.active_soundlib;
}

export function assign_soundlib(idx)
{
    idx = C.int(idx);
    if (!C.IndexOk(idx, C.soundlib_choices))
        C.panic("assign_soundlib: invalid soundlib (%d)", idx);

    C.gc.chosen_soundlib
        = C.soundlib_choices[idx].sndprocs.soundlib_id;
}


/* copy up to maxlen-1 characters; 'dest' must be able to hold maxlen;
   treat comma as alternate end of 'src' */
export function get_soundlib_name(dest, maxlen)
{
    maxlen = C.int(maxlen);
    let count, idx;
    let src;

    idx = C.ga.active_soundlib;
    if (!C.IndexOk(idx, C.soundlib_choices))
        C.panic("get_soundlib_name: invalid active_soundlib (%d)", idx);

    src = C.soundlib_choices[idx].sndprocs.soundname;
    for (count = 1; count < maxlen; count++) {
        if (C.loadChar(src) == ','.charCodeAt(0) || C.loadChar(src) == '\0'.charCodeAt(0))
            break; /*exit on \0 terminator*/
        C.storeChar(dest++, C.loadChar(src++));
    }
    C.storeChar(dest, '\0'.charCodeAt(0));
}

export function soundlib_id_from_opt(op)
{
    let idx;
    let defproc = C.nosound_procs, sp = 0;

    for (idx = 0; idx < C.SIZE(C.soundlib_choices); ++idx) {
        sp = C.soundlib_choices[idx].sndprocs;
        if (!C.strcmp(sp.soundname, op))
            return sp.soundlib_id;
    }
    return defproc.soundlib_id;
}

/*
 * The default sound interface
 *
 * 3rd party sound_procs should be placed in ../sound/x
 * and build procedures should reference them there.
 */



export function base_soundname_to_filename(basename, buf, bufsz, approach)
{
    bufsz = C.size_t(bufsz); approach = C.int(approach);
    const suffix = ".wav";
    let consumes = 0n, baselen = 0n, existinglen = 0n;
    let cp = buf;
    let needslash = 1;

    if (!buf)
        return 0;

    baselen = C.strlen(basename);
    consumes = baselen;

    if (approach == C.sff_havedir_append_rest) {
        /* consumes += (sizeof suffix - 1); */
        existinglen = C.strlen(buf);
        if (existinglen > 0) {
            cp = C.ptrAdd(buf, existinglen); /* points at trailing NUL */
            cp--;                   /* points at last character */
            if (C.loadChar(cp) == '/'.charCodeAt(0) || C.loadChar(cp) == '\\'.charCodeAt(0))
                needslash = 0;
            cp++;                   /* points back at trailing NUL */
        }
        if (needslash)
            consumes++;  /* for '/' */
        consumes = C.size_t(consumes + existinglen);
        consumes = C.size_t(consumes + (C.stringSize(suffix) - 1n));
    }
    consumes = C.size_t(consumes + 1n); /* for trailing NUL */
    /* existinglen could be >= bufsz if caller didn't initialize buf
     * to properly include a trailing NUL */
    if (!baselen || consumes > bufsz || existinglen >= bufsz)
        return 0;

    if (approach == C.sff_havedir_append_rest) {
        if (needslash) {
            C.storeChar(cp, '/'.charCodeAt(0));
            cp++;
            C.storeChar(cp, '\0'.charCodeAt(0));
            existinglen++;
        }
        C.Snprintf(cp, C.size_t(bufsz - C.size_t(existinglen + 1n)) , "%s%s",
                 basename, suffix, 0);
    } else if (approach == C.sff_base_only) {
        C.Snprintf(buf, bufsz, "%s", basename, 1);
    } else {
        return 0;
    }
    return buf;
}


export function set_voice(mtmp, tone, volume, moreinfo)
{
}

export function sound_speak(text)
{
}

/*sounds.c*/

/* don't bother excluding these */

/* set in files.c */

/* adds a sound file mapping, returns 0 on failure, 1 on success */

/* we do this check here first, in order to completely
     * avoid doing the regex search when there won't be a
     * sound anyway, despite a match.
     */

/* USER_SOUNDS */

/* default, built-in */

/* The code below here mimics that in windows.c error handling
       for choosing Window type */

/* 50: arbitrary, no real soundlib names are anywhere near that long;
       used to prevent potential raw_printf() overflow if user supplies a
       very long string (on the order of 1200 chars) on the command line
       (config file options can't get that big; they're truncated at 1023) */

/*, tmps = 0*/

/* prototype in case a build defines staticfn to nothing */

/* to avoid things getting out of sequence; seid an index to the name */

/*    enum sound_effect_entries seid = (enum sound_effect_entries) seidint; */

/* sounddir would get set in files.c */

/* 1 for '/' */

/* SND_SOUNDEFFECTS_AUTOMAP */

/* last non-NUL */

/* cp1 -> 1st, cp2 -> last non-nul) */
