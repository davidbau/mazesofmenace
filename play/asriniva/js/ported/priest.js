/* NetHack 5.0	priest.c	$NHDT-Date: 1764567778 2025/11/30 21:42:58 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.106 $ */
/* Copyright (c) Izchak Miller, Steve Linhart, 1989.              */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from '../c-runtime/context.js';


/* these match the categorizations shown by enlightenment */
export const ALGN_SINNED = (-4);
/* worse than strayed (-1..-3) */
export const ALGN_DEVOUT = 14;
/* better than fervent (9..13) */




export function newepri(mtmp) 
{
    if (!mtmp.mextra)
        mtmp.mextra = C.mextra(C.newmextra());
    if (!C.EPRI(mtmp)) {
        mtmp.mextra.epri = C.epri(C.alloc(C.epriSize));
        C.memset(C.EPRI(mtmp), 0, C.epriSize);
        C.EPRI(mtmp).parentmid = mtmp.m_id;
    }
}

export function free_epri(mtmp) 
{
    if (mtmp.mextra && C.EPRI(mtmp)) {
        C.free(C.EPRI(mtmp));
        mtmp.mextra.epri = 0;
    }
    mtmp.ispriest = 0;
}

/*
 * Move for priests and shopkeepers.  Called from shk_move() and pri_move().
 * Valid returns are  1: moved  0: didn't  -1: let m_move do it  -2: died.
 */
export function move_special(mtmp, in_his_shop, appr, uondoor, avoid, omx, omy, ggx, ggy) 
{
    ggy = C.coordxy(ggy);
    ggx = C.coordxy(ggx);
    omy = C.coordxy(omy);
    omx = C.coordxy(omx);
    avoid = C.boolean(avoid);
    uondoor = C.boolean(uondoor);
    appr = C.char(appr);
    in_his_shop = C.boolean(in_his_shop);
    let nx, ny, nix, niy;
    let i;
    let chcnt, cnt;
    let mfp = C.mfndposLocal();
    let ninfo = 0n;
    let allowflags;
/* dead code; see below */

    if (omx == ggx && omy == ggy)
        return 0;
    if (mtmp.mconf) {
        avoid = 0;
        appr = 0;
    }

    nix = omx;
    niy = omy;
    allowflags = C.mon_allowflags(mtmp);
    cnt = C.char(C.mfndpos(mtmp, mfp, allowflags));

 pick_move: {
    if (mtmp.isshk && avoid && uondoor) { /* perhaps we cannot avoid him */
        for (i = 0; i < cnt; i = C.char(i + 1))
            if (!(mfp.info[i] & C.NOTONL))
                break pick_move;
        avoid = 0;
    }

    }
 pick_move_retry: for (;;) {
    chcnt = 0;
    for (i = 0; i < cnt; i = C.char(i + 1)) {
        nx = mfp.poss[i].x;
        ny = mfp.poss[i].y;
        if (C.IS_ROOM(C.levl[nx][ny].typ)
            || (mtmp.isshk && (!in_his_shop || C.ESHK(mtmp).following))) {
            if (avoid && (mfp.info[i] & C.NOTONL) && !(mfp.info[i] & C.ALLOW_M))
                continue;
            if ((!appr && !C.rn2(chcnt = C.char(chcnt + 1), 85, 0))
                || (appr && C.dist2(nx, ny, ggx, ggy) < C.dist2(nix, niy, ggx, ggy))
                || (mfp.info[i] & C.ALLOW_M)) {
                nix = nx;
                niy = ny;
                ninfo = mfp.info[i];
            }
        }
    }
    if (mtmp.ispriest && avoid && nix == omx && niy == omy
        && C.onlineu(omx, omy)) {
        /* might as well move closer as long it's going to stay
         * lined up */
        avoid = 0;
        continue pick_move_retry;
    }

    break;
    }

    if (nix != omx || niy != omy) {

        if (ninfo & C.ALLOW_ROCK) {
            C.m_break_boulder(mtmp, nix, niy);
            return 1;
        } else if (ninfo & C.ALLOW_M) {
            /* mtmp is deciding it would like to attack this turn.
             * Returns from m_move_aggress don't correspond to the same things
             * as this function should return, so we need to translate. */
            switch (C.m_move_aggress(mtmp, nix, niy)) {
            case 2:
                return -2; /* died making the attack */
            case 3:
                return 1; /* attacked and spent this move */
            }
        }

        if (C.MON_AT(nix, niy) || C.u_at(nix, niy))
            return 0;
        C.remove_monster(omx, omy);
        C.place_monster(mtmp, nix, niy);
        C.newsym(nix, niy);
        if (mtmp.isshk && !in_his_shop && C.inhishop(mtmp))
            C.check_special_room(0);
/* dead code; maybe someday someone will track down why... */
        return 1;
    }
    return 0;
}

export function temple_occupied(array) 
{
    let ptr;

    for (ptr = array; C.loadChar(ptr); ptr++)
        if (C.svr.rooms[C.loadChar(ptr) - C.ROOMOFFSET].rtype == C.TEMPLE)
            return C.loadChar(ptr);
    return '\0'.charCodeAt(0);
}

export function histemple_at(priest, x, y) 
{
    y = C.coordxy(y);
    x = C.coordxy(x);
    return (priest && priest.ispriest
                      && (C.EPRI(priest).shroom == C.loadChar(C.in_rooms(x, y, C.TEMPLE)))
                      && C.on_level(C.EPRI(priest).shrlevel, C.u.uz));
}

export function inhistemple(priest) 
{
    /* make sure we have a priest */
    if (!priest || !priest.ispriest)
        return 0;
    /* priest must be on right level and in right room */
    if (!histemple_at(priest, priest.mx, priest.my))
        return 0;
    /* temple room must still contain properly aligned altar */
    return has_shrine(priest);
}

/*
 * pri_move: return 1: moved  0: didn't  -1: let m_move do it  -2: died
 */
export function pri_move(priest) 
{
    let ggx, ggy, omx, omy;
    let temple;
    let avoid = 1;

    omx = priest.mx;
    omy = priest.my;

    if (!histemple_at(priest, omx, omy))
        return -1;

    temple = C.EPRI(priest).shroom;

    ggx = C.EPRI(priest).shrpos.x;
    ggy = C.EPRI(priest).shrpos.y;

    ggx = C.coordxy(ggx + C.rn1(3, -1, 194, 1)); /* mill around the altar */
    ggy = C.coordxy(ggy + C.rn1(3, -1, 195, 1));

    if (!priest.mpeaceful
        || (C.Conflict && !C.resist_conflict(priest))) {
        if (C.monnear(priest, C.u.ux, C.u.uy)) {
            if (C.Displaced)
                C.Your("displaced image doesn't fool %s!", C.mon_nam(priest));
            C.mattacku(priest);
            return 0;
        } else if (C.strchr(C.u.urooms, temple)) {
            /* chase player if inside temple & can see him */
            if (priest.mcansee && C.m_canseeu(priest)) {
                ggx = C.u.ux;
                ggy = C.u.uy;
            }
            avoid = 0;
        }
    } else if (C.Invis)
        avoid = 0;

    return C.callLocal(move_special, priest, 0, 1, 0, avoid, omx, omy, ggx, ggy);
}

/* exclusively for mktemple() */
export function priestini(lvl, sroom, sx, sy, sanctum) /* is it the seat of the high priest? */

{
    sanctum = C.boolean(sanctum);
    sy = C.int(sy);
    sx = C.int(sx);
    let priest;
    let otmp;
    let cnt;
    let px = 0, py = 0, i, si = C.rn2(C.N_DIRS, 229, 2);
    let prim = C.mons[sanctum ? C.PM_HIGH_CLERIC
                                          : C.PM_ALIGNED_CLERIC];

    for (i = 0; i < C.N_DIRS; i++) {
        px = sx + C.xdir[C.DIR_CLAMP(i+si)];
        py = sy + C.ydir[C.DIR_CLAMP(i+si)];
        if (C.pm_good_location(px, py, prim))
            break;
    }
    if (i == C.N_DIRS)
        px = sx, py = sy;

    if (C.MON_AT(px, py))
        C.rloc(C.m_at(px, py), C.RLOC_NOMSG); /* insurance */

    priest = C.makemon(prim, px, py, C.MM_EPRI);
    if (priest) {
        C.EPRI(priest).shroom = C.char(C.roomIndex(sroom) + C.ROOMOFFSET);
        C.EPRI(priest).shralign = C.Amask2align(C.levl[sx][sy].altarmask);
        C.EPRI(priest).shrpos.x = sx;
        C.EPRI(priest).shrpos.y = sy;
        C.assign_level(C.EPRI(priest).shrlevel, lvl);
        C.mon_learns_traps(priest, C.ALL_TRAPS); /* traps are known */
        priest.mpeaceful = 1;
        priest.ispriest = 1;
        priest.isminion = 0;
        priest.msleeping = 0;
        C.set_malign(priest); /* mpeaceful may have changed */

        /* now his/her goodies... */
        if (sanctum && C.EPRI(priest).shralign == C.A_NONE
            && C.on_level(C.sanctum_level, C.u.uz)) {
            C.mongets(priest, C.AMULET_OF_YENDOR);
        }
        /* 2 to 4 spellbooks */
        for (cnt = C.rn1(3, 2, 265, 2); cnt > 0; --cnt) {
            C.mpickobj(priest, C.mkobj(C.SPBOOK_no_NOVEL, 0));
        }
        /* robe [via makemon()] */
        if (C.rn2(2, 269, 2) && (otmp = C.which_armor(priest, C.W_ARMC)) != 0) {
            if (p_coaligned(priest))
                C.uncurse(otmp);
            else
                C.curse(otmp);
        }
    }
}

/* get a monster's alignment type without caller needing EPRI & EMIN */
export function mon_aligntyp(mon) 
{
    let algn = mon.ispriest ? C.EPRI(mon).shralign
                                  : mon.isminion ? C.EMIN(mon).min_align
                                                  : mon.data.maligntyp;

    if (algn == C.A_NONE)
        return C.A_NONE; /* negative but differs from chaotic */
    return (algn > 0) ? C.A_LAWFUL : (algn < 0) ? C.A_CHAOTIC : C.A_NEUTRAL;
}

/*
 * Specially aligned monsters are named specially.
 *      - aligned priests with ispriest and high priests have shrines
 *              they retain ispriest and epri when polymorphed
 *      - aligned priests without ispriest are roamers
 *              they have isminion set and use emin rather than epri
 *      - minions do not have ispriest but have isminion and emin
 *      - caller needs to inhibit Hallucination if it wants to force
 *              the true name even when under that influence
 */
export function priestname(mon, article, reveal_high_priest, pname) /* caller-supplied output buffer */

{
    reveal_high_priest = C.boolean(reveal_high_priest);
    article = C.int(article);
    let do_hallu = C.Hallucination,
            aligned_priest = mon.data.address == C.mons[C.PM_ALIGNED_CLERIC].address,
            high_priest = mon.data.address == C.mons[C.PM_HIGH_CLERIC].address;
    let whatcode = C.charLocal();
    whatcode.value = 0;
    let what = do_hallu ? C.rndmonnam(whatcode) : C.mon_pmname(mon);

    if (!mon.ispriest && !mon.isminion) /* should never happen...  */
        return C.strcpy(pname, what);       /* caller must be confused */

    /* for high priest(ess), "high" (or "grand" for poohbah) will be inserted
       [this was done near the end but we want 'what' to be updated sooner] */
    if (mon.ispriest || aligned_priest || high_priest)
        what = do_hallu ? "poohbah" : mon.female ? "priestess" : "priest";

    C.storeChar(pname, 0);
    if (article != C.ARTICLE_NONE && (!do_hallu || !C.bogon_is_pname(whatcode.value))) {
        if (article == C.ARTICLE_YOUR || (article == C.ARTICLE_A && high_priest))
            article = C.ARTICLE_THE;
        if (article == C.ARTICLE_THE) {
            C.Strcpy(pname, "the ");
        } else if (!C.strcmp(what, "Angel")) {
            /* bypass just_an(); it would yield "" due to treating capital A
               as indicating a personal name */
            C.Strcpy(pname, "an ");
        } else {
            C.just_an(pname, what);
        }
    }
    /* pname[] contains "" or {"a ","an ","the "} */
    if (mon.minvis) {
        /* avoid "a invisible priest" */
        if (!C.strcmp(pname, "a "))
            C.Strcpy(pname, "an ");
        C.Strcat(pname, "invisible ");
    }
    if (mon.isminion && C.EMIN(mon).renegade) {
        /* avoid "an renegade Angel" */
        if (!C.strcmp(pname, "an ") && !mon.minvis)
            C.Strcpy(pname, "a ");
        C.Strcat(pname, "renegade ");
    }

    if (mon.ispriest || aligned_priest) {
        if (high_priest)
            C.Strcat(pname, do_hallu ? "grand " : "high ");
    } else {
        if (mon.mtame && !C.strcmpi(what, "Angel"))
            C.Strcat(pname, "guardian ");
    }

    C.Strcat(pname, what);
    /* same as distant_monnam(), more or less... */
    if (do_hallu || !high_priest || reveal_high_priest
        || !C.Is_astralevel(C.u.uz)
        || C.m_next2u(mon) || C.program_state.gameover) {
        C.Strcat(pname, " of ");
        C.Strcat(pname, C.halu_gname(mon_aligntyp(mon)));
    }
    return pname;
}

export function p_coaligned(priest) 
{
    return (C.u.ualign.type == mon_aligntyp(priest));
}

export function has_shrine(pri) 
{
    let lev;
    let epri_p;

    if (!pri || !pri.ispriest)
        return 0;
    epri_p = C.EPRI(pri);
    lev = C.levl[epri_p.shrpos.x][epri_p.shrpos.y];
    if (!C.IS_ALTAR(lev.typ) || !(lev.altarmask & C.AM_SHRINE))
        return 0;
    return (epri_p.shralign
                      == (C.Amask2align(lev.altarmask & ~C.AM_SHRINE)));
}

export function findpriest(roomno) 
{
    roomno = C.char(roomno);
    let mtmp;

    for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon) {
        if (C.DEADMONSTER(mtmp))
            continue;
        if (mtmp.ispriest && (C.EPRI(mtmp).shroom == roomno)
            && histemple_at(mtmp, mtmp.mx, mtmp.my))
            return mtmp;
    }
    return 0;
}



/* called from check_special_room() when the player enters the temple room */
export function intemple(roomno) 
{
    roomno = C.int(roomno);
    let priest, mtmp;
    let epri_p;
    let shrined, sanctum, can_speak;
    let this_time, other_time;
    let msg1, msg2;
    let buf = C.stackAlloc(C.BUFSZ);

    /* don't do anything if hero is already in the room */
    if (temple_occupied(C.u.urooms0))
        return;

    if ((priest = findpriest(C.char(roomno))) != 0) {
        /* tended */
        C.record_achievement(C.ACH_TMPL);

        epri_p = C.EPRI(priest);
        shrined = has_shrine(priest);
        sanctum = (priest.data.address == C.mons[C.PM_HIGH_CLERIC].address
                   && (C.Is_sanctum(C.u.uz) || C.In_endgame(C.u.uz)));
        can_speak = !C.helpless(priest);
        if (can_speak && !C.Deaf && C.svm.moves >= epri_p.intone_time) {
            let save_priest = priest.ispriest;

            /* don't reveal the altar's owner upon temple entry in
               the endgame; for the Sanctum, the next message names
               Moloch so suppress the "of Moloch" for him here too */
            if (sanctum && !C.Hallucination)
                priest.ispriest = 0;
            C.pline("%s intones:",
                  C.canseemon(priest) ? C.Monnam(priest) : "A nearby voice");
            priest.ispriest = save_priest;
            epri_p.intone_time = C.long(C.svm.moves + C.long(C.d(10, 500, 443, 3))); /* ~2505 */
            /* make sure that we don't suppress entry message when
               we've just given its "priest intones" introduction */
            epri_p.enter_time = 0n;
        }
        msg1 = msg2 = 0;
        if (sanctum && C.Is_sanctum(C.u.uz)) {
            if (priest.mpeaceful) {
                /* first time inside */
                msg1 = "Infidel, you have entered Moloch's Sanctum!";
                msg2 = "Be gone!";
                priest.mpeaceful = 0;
                /* became angry voluntarily; no penalty for attacking him */
                C.set_malign(priest);
            } else {
                /* repeat visit, or attacked priest before entering */
                msg1 = "You desecrate this place by your presence!";
            }
        } else if (C.svm.moves >= epri_p.enter_time) {
            C.Sprintf(buf, "Pilgrim, you enter a %s place!",
                    !shrined ? "desecrated" : "sacred");
            msg1 = buf;
        }
        if (msg1 && can_speak && !C.Deaf) {
            // C.SetVoice(priest, 0, 80, 0); (inactive configured macro)
            C.verbalize1(msg1);
            if (msg2)
                C.verbalize1(msg2);
            epri_p.enter_time = C.long(C.svm.moves + C.long(C.d(10, 100, 471, 3))); /* ~505 */
        }
        if (!sanctum) {
            if (!shrined || !p_coaligned(priest)
                || C.u.ualign.record <= ALGN_SINNED) {
                msg1 = "have a%s forbidding feeling...";
                msg2 = (!shrined || !p_coaligned(priest)) ? "" : " strange";
                this_time = C.longRef(epri_p, "hostile_time");
                other_time = C.longRef(epri_p, "peaceful_time");
            } else {
                msg1 = "experience %s sense of peace.";
                msg2 = (C.u.ualign.record >= ALGN_DEVOUT) ? "a" : "an unusual";
                this_time = C.longRef(epri_p, "peaceful_time");
                other_time = C.longRef(epri_p, "hostile_time");
            }
            /* give message if we haven't seen it recently or
               if alignment update has caused it to switch from
               forbidding to sense-of-peace or vice versa */
            if (C.svm.moves >= this_time.value || other_time.value >= this_time.value) {
                C.You(msg1, msg2);
                this_time.value = C.long(C.svm.moves + C.long(C.d(10, 20, 491, 3))); /* ~55 */
                /* avoid being tricked by the RNG:  switch might have just
                   happened and previous random threshold could be larger */
                if (this_time.value <= other_time.value)
                    other_time.value = C.long(this_time.value - 1n);
            }
        }
        /* recognize the Valley of the Dead and Moloch's Sanctum
           once hero has encountered the temple priest on those levels */
        C.mapseen_temple(priest);
    } else {
        /* untended */

        switch (C.rn2(4, 504, 3)) {
        case 0:
            C.You("have an eerie feeling...");
            break;
        case 1:
            C.You_feel("like you are being watched.");
            break;
        case 2:
            C.pline("A shiver runs down your %s.", C.body_part(C.SPINE));
            break;
        default:
            break; /* no message; unfortunately there's no
                      EPRI(priest)->eerie_time available to
                      make sure we give one the first time */
        }
        if (!C.rn2(5, 519, 3)
            && (mtmp = C.makemon(C.mons[C.PM_GHOST], C.u.ux, C.u.uy, C.MM_NOMSG))
                   != 0) {
            let ngen = C.svm.mvitals[C.PM_GHOST].born;
            if (C.canspotmon(mtmp))
                C.pline("A%s ghost appears next to you%c",
                      ngen < 5 ? "n enormous" : "",
                      ngen < 10 ? '!'.charCodeAt(0) : '.'.charCodeAt(0));
            else
                C.You("sense a presence close by!");
            mtmp.mpeaceful = 0;
            C.set_malign(mtmp);
            if (C.flags.verbose)
                C.You("are frightened to death, and unable to move.");
            C.nomul(-3);
            C.gm.multi_reason = C.literal("being terrified of a ghost");
            C.gn.nomovemsg = C.literal("You regain your composure.");
        }
    }
}



/* reset the move counters used to limit temple entry feedback;
   leaving the level and then returning yields a fresh start */
export function forget_temple_entry(priest) 
{
    let epri_p = priest.ispriest ? C.EPRI(priest) : 0;

    if (!epri_p) {
        C.impossible("attempting to manipulate shrine data for non-priest?");
        return;
    }
    epri_p.intone_time = epri_p.enter_time = epri_p.peaceful_time =
        epri_p.hostile_time = 0n;
}

export function priest_talk(priest) 
{
    let coaligned = p_coaligned(priest);
    let strayed = (C.u.ualign.record < 0);
    let cheapskate = 0;
    if (C.EPRI(priest)) cheapskate = C.uintRef(C.EPRI(priest), "cheapskate_count");

    /*
     * Note: we won't be called if hero is Deaf [since dochat() will
     * return before calling domonnoise()], so we don't need to check
     * for that before the various calls to verbalize() here.
     */

    /* KMH, conduct */
    if (!C.u.uconduct.gnostic++)
        C.livelog_printf(C.LL_CONDUCT,
                       "rejected atheism by consulting with %s",
                       C.mon_nam(priest));

    if (priest.mflee || (!priest.ispriest && coaligned && strayed)) {
        C.pline("%s doesn't want anything to do with you!", C.Monnam(priest));
        priest.mpeaceful = 0;
        return;
    }

    /* priests don't chat unless peaceful and in their own temple */
    if (!inhistemple(priest) || !priest.mpeaceful || C.helpless(priest)) {
        const cranky_msg = [
            "Thou wouldst have words, eh?  I'll give thee a word or two!",
            "Talk?  Here is what I have to say!",
            "Pilgrim, I would speak no longer with thee."
        ];

        if (C.helpless(priest)) {
            C.pline("%s breaks out of %s reverie!", C.Monnam(priest),
                  C.mhis(priest));
            priest.mfrozen = priest.msleeping = 0;
            priest.mcanmove = 1;
        }
        priest.mpeaceful = 0;
        // C.SetVoice(priest, 0, 80, 0); (inactive configured macro)
        C.verbalize1(cranky_msg[C.rn2(3, 599, 4)]);
        return;
    }

    /* you desecrated the temple and now you want to chat? */
    if (priest.mpeaceful && C.loadChar(C.in_rooms(priest.mx, priest.my, C.TEMPLE))
        && !has_shrine(priest)) {
        // C.SetVoice(priest, 0, 80, 0); (inactive configured macro)
        C.verbalize(
              "Begone!  Thou desecratest this holy place with thy presence.");
        priest.mpeaceful = 0;
        return;
    }
    if (!C.money_cnt(C.gi.invent)) {
        if (coaligned && !strayed) {
            let pmoney = C.money_cnt(priest.minvent);
            if (pmoney > 0n) {
                let bits;
                bits = (C.Hallucination) ? C.currency(pmoney)
                                       : (pmoney == 1n) ? "bit" : "bits";
                /* Note: two bits is actually 25 cents.  Hmm. */
                C.pline("%s gives you %s%s for an ale.", C.Monnam(priest),
                      (pmoney == 1n) ? "one " : "two ", bits);
                C.money2u(priest, pmoney > 1n ? 2 : 1);
            } else
                C.pline("%s preaches the virtues of poverty.", C.Monnam(priest));
            C.exercise(C.A_WIS, 1);
        } else
            C.pline("%s is not interested.", C.Monnam(priest));
        return;
    } else {
        /* there's now some randomization in how much you need to donate, but
           you are given suggested donation values that will guarantee
           clairvoyance and protection respectively; with more gold visible
           you need to donate more but get a greater effect; and if you
           cheapskate out to rerandomize the donation amounts they will be
           higher next time */
        let offer;
        let suggested = C.long(C.uint(BigInt(C.u.ulevelpeak ? C.u.ulevelpeak : 1) *
            BigInt(C.uint(C.rn1(101, C.uint(150 + C.uint((cheapskate ? cheapskate.value : 0) * 40)), 638, 4)))));
        let quan = C.money_cnt(C.gi.invent) / (C.long(suggested * 3n));
        let buf = C.stackAlloc(C.BUFSZ);

        if (quan < 1n)
            quan = 1n;

        C.Sprintf(buf, "How much will you offer (suggested: %ld or %ld)?",
                C.long(suggested * quan), C.long(C.long(suggested * quan) * 2n));

        if (C.flags.debug)
            C.pline("%s asks you for a contribution for the temple (base %ld).",
                  C.Monnam(priest), suggested);
        else
            C.pline("%s asks you for a contribution for the temple.",
                  C.Monnam(priest));
        if ((offer = C.bribe(priest, buf)) == 0) {
            // C.SetVoice(priest, 0, 80, 0); (inactive configured macro)
            C.verbalize("Thou shalt regret thine action!");
            if (coaligned)
                C.adjalign(-1);
            if (cheapskate) ++cheapskate.value;
        } else if (offer < C.long(suggested * quan)) {
            if (C.money_cnt(C.gi.invent) > (C.long(offer * 2n))) {
                // C.SetVoice(priest, 0, 80, 0); (inactive configured macro)
                C.verbalize("Cheapskate.");
                if (cheapskate) ++cheapskate.value;
            } else {
                // C.SetVoice(priest, 0, 80, 0); (inactive configured macro)
                C.verbalize("I thank thee for thy contribution.");
                /* give player some token */
                C.exercise(C.A_WIS, 1);
            }
        } else if (offer < C.long(C.long(suggested * quan) * 2n)) {
            // C.SetVoice(priest, 0, 80, 0); (inactive configured macro)
            C.verbalize("Thou art indeed a pious individual.");
            if (C.money_cnt(C.gi.invent) < (C.long(offer * 2n))) {
                if (coaligned && C.u.ualign.record <= ALGN_SINNED)
                    C.adjalign(1);
            }
            C.verbalize("I bestow upon thee a blessing.");
            C.incr_itimeout(C.propertyRef(C.CLAIRVOYANT), C.rn1(C.long(500n * offer) / suggested,
                                             C.long(500n * offer) / suggested, 680, 4));
        } else if (offer < C.long(C.long(suggested * quan) * 3n)) {
            let orig_ublessed = C.u.ublessed;

            /* u.ublessed is only active when Protection is enabled via
               something other than worn gear (theft by gremlin clears the
               intrinsic but not its former magnitude, making it
               recoverable) */
            if (!(C.HProtection & C.INTRINSIC)) {
                C.HProtection |= C.FROMOUTSIDE;
                orig_ublessed = -1; /* force "rewarded" message */
            }

            for (; offer >= (C.long(2n * suggested)); offer = C.long(offer - C.long(2n * suggested))) {
                if (!C.u.ublessed)
                    C.u.ublessed = C.rn1(3, 2, 695, 4);
                else if (C.u.ublessed < 20 &&
                         (C.u.ublessed < 9 || !C.rn2(C.u.ublessed, 697, 4)))
                    C.u.ublessed++;
            }
            // C.SetVoice(priest, 0, 80, 0); (inactive configured macro)
            if (C.u.ublessed > orig_ublessed) {
                C.verbalize("Thou hast been rewarded for thy devotion.");
            } else {
                C.verbalize("Thy selfless generosity is deeply appreciated.");
            }
        } else {
            // C.SetVoice(priest, 0, 80, 0); (inactive configured macro)
            C.verbalize("Thy selfless generosity is deeply appreciated.");
            /* money_cnt check is preserved for futureproofing but probably
               can't fail in the current code */
            if (C.money_cnt(C.gi.invent) < (C.long(offer * 2n)) && coaligned) {
                if (strayed && (C.long(C.svm.moves - C.u.ucleansed)) > 5000n) {
                    C.u.ualign.record = 0; /* cleanse thee */
                    C.u.ucleansed = C.svm.moves;
                } else {
                    C.adjalign(2);
                }
            }
        }
    }
}

export function mk_roamer(ptr, alignment, x, y, peaceful) 
{
    peaceful = C.boolean(peaceful);
    y = C.coordxy(y);
    x = C.coordxy(x);
    alignment = C.char(alignment);
    let roamer;
    let coaligned = (C.u.ualign.type == alignment);

/* this was due to permonst's pxlth field which is now gone */

    if (C.MON_AT(x, y))
        C.rloc(C.m_at(x, y), C.RLOC_NOMSG); /* insurance */

    if (!(roamer = C.makemon(ptr, x, y, C.MM_ADJACENTOK | C.MM_EMIN | C.MM_NOMSG)))
        return 0;

    C.EMIN(roamer).min_align = alignment;
    C.EMIN(roamer).renegade = (coaligned && !peaceful);
    roamer.ispriest = 0;
    roamer.isminion = 1;
    C.mon_learns_traps(roamer, C.ALL_TRAPS); /* traps are known */
    roamer.mpeaceful = peaceful;
    roamer.msleeping = 0;
    C.set_malign(roamer); /* peaceful may have changed */

    /* MORE TO COME */
    return roamer;
}

export function reset_hostility(roamer) 
{
    if (!roamer.isminion)
        return;
    if (roamer.data.address != C.mons[C.PM_ALIGNED_CLERIC].address
        && roamer.data.address != C.mons[C.PM_ANGEL].address)
        return;

    if (C.EMIN(roamer).min_align != C.u.ualign.type) {
        roamer.mpeaceful = roamer.mtame = 0;
        C.set_malign(roamer);
    }
    C.newsym(roamer.mx, roamer.my);
}

export function in_your_sanctuary(mon, x, y) /* if non-null, <mx,my> overrides <x,y> */ 
{
    y = C.coordxy(y);
    x = C.coordxy(x);
    let roomno;
    let priest;

    if (mon) {
        if (C.is_minion(mon.data) || C.is_rider(mon.data))
            return 0;
        x = mon.mx, y = mon.my;
    }
    if (C.u.ualign.record <= ALGN_SINNED) /* sinned or worse */
        return 0;
    if ((roomno = temple_occupied(C.u.urooms)) == 0
        || roomno != C.loadChar(C.in_rooms(x, y, C.TEMPLE)))
        return 0;
    if ((priest = findpriest(roomno)) == 0)
        return 0;
    return (has_shrine(priest) && p_coaligned(priest)
                      && priest.mpeaceful);
}

/* when attacking "priest" in his temple */
export function ghod_hitsu(priest) 
{
    let troom;
    let oldbuzzer;
    let oldcurrwand;
    let x, y, ax, ay;
    let roomno = C.int(temple_occupied(C.u.urooms));

    if (!roomno || !has_shrine(priest))
        return;

    ax = x = C.EPRI(priest).shrpos.x;
    ay = y = C.EPRI(priest).shrpos.y;
    troom = C.svr.rooms[roomno - C.ROOMOFFSET];

    if (C.u_at(x, y) || !C.linedup(C.u.ux, C.u.uy, x, y, 1)) {
        if (C.IS_DOOR(C.levl[C.u.ux][C.u.uy].typ)) {
            if (C.u.ux == troom.lx - 1) {
                x = troom.hx;
                y = C.u.uy;
            } else if (C.u.ux == troom.hx + 1) {
                x = troom.lx;
                y = C.u.uy;
            } else if (C.u.uy == troom.ly - 1) {
                x = C.u.ux;
                y = troom.hy;
            } else if (C.u.uy == troom.hy + 1) {
                x = C.u.ux;
                y = troom.ly;
            }
        } else {
            switch (C.rn2(4, 827, 5)) {
            case 0:
                x = C.u.ux;
                y = troom.ly;
                break;
            case 1:
                x = C.u.ux;
                y = troom.hy;
                break;
            case 2:
                x = troom.lx;
                y = C.u.uy;
                break;
            default:
                x = troom.hx;
                y = C.u.uy;
                break;
            }
        }
        if (!C.linedup(C.u.ux, C.u.uy, x, y, 1))
            return;
    }

    switch (C.rn2(3, 850, 5)) {
    case 0:
        C.pline("%s roars in anger:  \"Thou shalt suffer!\"",
              C.a_gname_at(ax, ay));
        break;
    case 1:
        C.pline("%s voice booms:  \"How darest thou harm my servant!\"",
              C.s_suffix(C.a_gname_at(ax, ay)));
        break;
    default:
        C.pline("%s roars:  \"Thou dost profane my shrine!\"",
              C.a_gname_at(ax, ay));
        break;
    }

    /* bolt of lightning cast by unspecified monster */
    oldcurrwand = C.gc.current_wand;
    C.gc.current_wand = 0;
    oldbuzzer = C.gb.buzzer;
    C.gb.buzzer = 0;
    C.buzz(C.BZ_M_SPELL(C.BZ_OFS_AD(C.AD_ELEC)), 6, x, y, C.sgn(C.gt.tbx), C.sgn(C.gt.tby));
    C.gb.buzzer = oldbuzzer;
    C.gc.current_wand = oldcurrwand;
    C.exercise(C.A_WIS, 0);
}

export function angry_priest() 
{
    let priest;
    let lev;

    if ((priest = findpriest(temple_occupied(C.u.urooms))) != 0) {
        let eprip = C.EPRI(priest);

        C.wakeup(priest, 0);
        C.setmangry(priest, 0);
        /*
         * If the altar has been destroyed or converted, let the
         * priest run loose.
         * (When it's just a conversion and there happens to be
         * a fresh corpse nearby, the priest ought to have an
         * opportunity to try converting it back; maybe someday...)
         */
        lev = C.levl[eprip.shrpos.x][eprip.shrpos.y];
        if (!C.IS_ALTAR(lev.typ)
            || (C.Amask2align(lev.altarmask & C.AM_MASK)
                != eprip.shralign)) {
            if (!C.EMIN(priest))
                C.newemin(priest);
            priest.ispriest = 0; /* now a roaming minion */
            priest.isminion = 1;
            C.assert(C.has_emin(priest));
            C.EMIN(priest).min_align = eprip.shralign;
            C.EMIN(priest).renegade = 0;
            /* discard priest's memory of his former shrine;
               if we ever implement the re-conversion mentioned
               above, this will need to be removed */
            free_epri(priest);
        }
    }
}

/*
 * When saving bones, find priests that aren't on their shrine level,
 * and remove them.  This avoids big problems when restoring bones.
 * [Perhaps we should convert them into roamers instead?]
 */
export function clearpriests() 
{
    let mtmp;

    for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon) {
        if (C.DEADMONSTER(mtmp))
            continue;
        if (mtmp.ispriest && !C.on_level(C.EPRI(mtmp).shrlevel, C.u.uz))
            C.mongone(mtmp);
    }
}

/* munge priest-specific structure when restoring -dlc */
export function restpriest(mtmp, ghostly) 
{
    ghostly = C.boolean(ghostly);
    if (C.u.uz.dlevel) {
        if (ghostly)
            C.assign_level(C.EPRI(mtmp).shrlevel, C.u.uz);
    }
}


/*priest.c*/
