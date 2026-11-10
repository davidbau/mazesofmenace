import { C } from './c-runtime.js';

/* NetHack 5.0	bones.c	$NHDT-Date: 1701500709 2023/12/02 07:05:09 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.129 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985,1993. */
/*-Copyright (c) Robert Patrick Rankin, 2012. */
/* NetHack may be freely redistributed.  See license for details. */





export function no_bones_level(lev)
{
    let sptr;

    if (C.ledger_no(C.gs.save_dlevel))
        C.assign_level(lev, C.gs.save_dlevel);

    return (((sptr = C.Is_special(lev)) != 0 && !sptr.boneid)
                      || !C.svd.dungeons[lev.dnum].boneid
                      /* no bones on the last or multiway branch levels
                         in any dungeon (level 1 isn't multiway) */
                      || C.Is_botlevel(lev)
                      || (C.Is_branchlev(lev) && lev.dlevel > 1)
                      /* no bones in the invocation level */
                      || (C.In_hell(lev)
                          && lev.dlevel == C.dunlevs_in_dungeon(lev) - 1));
}

/* Call this function for each fruit object saved in the bones level: it marks
 * that particular type of fruit as existing (the marker is that that type's
 * ID is positive instead of negative).  This way, when we later save the
 * chain of fruit types, we know to only save the types that exist.
 */
export function goodfruit(id)
{
    let f = C.fruit_from_indx(-id);

    if (f)
        f.fid = id;
}

export function resetobjs(ochain, restore)
{
    let otmp, nobj;

    for (otmp = ochain; otmp; otmp = nobj) {
        nobj = otmp.nobj;
        if (otmp.cobj)
            resetobjs(otmp.cobj, restore);
        if (otmp.in_use) {
            C.obj_extract_self(otmp);
            C.dealloc_obj(otmp);
            continue;
        }

        if (restore) {
            /* artifact bookkeeping needs to be done during
               restore; other fixups are done while saving */
            if (otmp.oartifact) {
                if (C.exist_artifact(otmp.otyp, C.safe_oname(otmp))
                    || C.is_quest_artifact(otmp)) {
                    /* prevent duplicate--revert to ordinary obj */
                    otmp.oartifact = 0;
                    if (C.has_oname(otmp))
                        C.free_oname(otmp);
                } else {
                    C.artifact_exists(otmp, C.safe_oname(otmp), 1,
                                    C.ONAME_BONES);
                }
            } else if (C.has_oname(otmp)) {
                sanitize_name(C.ONAME(otmp));
            }
            /* 3.6.3: set no_charge for partly eaten food in shop;
               all other items become goods for sale if in a shop */
            if (otmp.oclass == C.FOOD_CLASS && otmp.oeaten) {
                let top;
                let p;
                let ox, oy;

                for (top = otmp; top.where == C.OBJ_CONTAINED;
                     top = top.ocontainer)
                    continue;
                otmp.no_charge = (top.where == C.OBJ_FLOOR
                                   && C.get_obj_location(top, C.reference("Int16", () => ox, value => ox = value), C.reference("Int16", () => oy, value => oy = value), 0)
                                   /* can't use costly_spot() since its
                                      result depends upon hero's location */
                                   && C.inside_shop(ox, oy)
                                   && C.loadChar(p = C.in_rooms(ox, oy, C.SHOPBASE))
                                 && C.tended_shop(C.svr.rooms[C.loadChar(p) - C.ROOMOFFSET]));
            }
        } else { /* saving */
            /* do not zero out o_ids for ghost levels anymore */

            if (C.objects[otmp.otyp].oc_uses_known)
                otmp.known = 0;
            otmp.dknown = otmp.bknown = 0;
            otmp.rknown = 0;
            otmp.lknown = 0;
            otmp.cknown = 0;
            otmp.tknown = 0;
            otmp.invlet = 0;
            otmp.no_charge = 0;
            otmp.how_lost = C.LOST_NONE;

            /* strip user-supplied names */
            /* Statue and some corpse names are left intact,
               presumably in case they came from score file.
               [TODO: this ought to be done differently--names
               which came from such a source or came from any
               stoned or killed monster should be flagged in
               some manner; then we could just check the flag
               here and keep "real" names (dead pets, &c) while
               discarding player notes attached to statues.] */
            if (C.has_oname(otmp)
                && !(otmp.oartifact || otmp.otyp == C.STATUE
                     || otmp.otyp == C.SPE_NOVEL
                     || (otmp.otyp == C.CORPSE
                         && otmp.corpsenm >= C.SPECIAL_PM))) {
                C.free_oname(otmp);
            }

            if (otmp.otyp == C.SLIME_MOLD) {
                goodfruit(otmp.spe);

            } else if (otmp.otyp == C.SCR_MAIL) {
                /* 0: delivered in-game via external event;
                   1: from bones or wishing; 2: written with marker */
                if (otmp.spe == 0)
                    otmp.spe = 1;

            } else if (otmp.otyp == C.EGG) {
                otmp.spe = 0; /* not "laid by you" in next game */
            } else if (otmp.otyp == C.TIN) {
                /* make tins of unique monster's meat be empty */
                if (C.ismnum(otmp.corpsenm)
                    && C.unique_corpstat(C.mons[otmp.corpsenm]))
                    otmp.corpsenm = C.NON_PM;
            } else if (otmp.otyp == C.CORPSE || otmp.otyp == C.STATUE) {
                let mnum = otmp.corpsenm;

                /* Discard incarnation details of unique monsters
                   (by passing null instead of otmp for object),
                   shopkeepers (by passing false for revival flag),
                   temple priests, and vault guards in order to
                   prevent corpse revival or statue reanimation. */
                if (C.has_omonst(otmp)
                    && C.cant_revive(C.reference("Int32", () => mnum, value => mnum = value), 0, 0)) {
                    C.free_omonst(otmp);
                    /* mnum is now either human_zombie or doppelganger;
                       for corpses of uniques, we need to force the
                       transformation now rather than wait until a
                       revival attempt, otherwise eating this corpse
                       would behave as if it remains unique */
                    if (mnum == C.PM_DOPPELGANGER && otmp.otyp == C.CORPSE)
                        C.set_corpsenm(otmp, mnum);
                }
            } else if (C.is_mines_prize(otmp) || C.is_soko_prize(otmp)) {
                /* achievement tracking; in case prize was moved off its
                   original level (which is always a no-bones level) */
                otmp.nomerge = 0;
            } else if (otmp.otyp == C.AMULET_OF_YENDOR) {
                /* no longer the real Amulet */
                otmp.otyp = C.FAKE_AMULET_OF_YENDOR;
                C.curse(otmp);
            } else if (otmp.otyp == C.CANDELABRUM_OF_INVOCATION) {
                if (otmp.lamplit)
                    C.end_burn(otmp, 1);
                otmp.otyp = C.WAX_CANDLE;
                otmp.age = 50n; /* assume used */
                if (otmp.spe > 0)
                    otmp.quan = BigInt(otmp.spe);
                otmp.spe = 0;
                otmp.owt = C.weight(otmp);
                C.curse(otmp);
            } else if (otmp.otyp == C.BELL_OF_OPENING) {
                otmp.otyp = C.BELL;
                C.curse(otmp);
            } else if (otmp.otyp == C.SPE_BOOK_OF_THE_DEAD) {
                otmp.otyp = C.SPE_BLANK_PAPER;
                C.curse(otmp);
            }
        }
    }
}

/* while loading bones, strip out text possibly supplied by old player
   that might accidentally or maliciously disrupt new player's display */
export function sanitize_name(namebuf)
{
    let c;
    let strip_8th_bit = (C.WINDOWPORT_tty
                             && !C.iflags.wc_eight_bit_input);

    /* it's tempting to skip this for single-user platforms, since
       only the current player could have left these bones--except
       things like "hearse" and other bones exchange schemes make
       that assumption false */
    while (C.loadChar(namebuf)) {
        c = C.loadChar(namebuf) & 0o177;
        if (c < 32 || c == 127) {
            /* non-printable or undesirable */
            C.storeChar(namebuf, 46);
        } else if (c != C.loadChar(namebuf)) {
            /* expected to be printable if user wants such things */
            if (strip_8th_bit)
                C.storeChar(namebuf, 95);
        }
        ++namebuf;
    }
}

/* Give object to a random object-liking monster on or adjacent to x,y
   but skipping hero's location.
   If no such monster, place object on floor at x,y. */
export function give_to_nearby_mon(otmp, x, y)
{
    let mtmp;
    let selected = 0;
    let nmon = 0, xx, yy;

    for (xx = x - 1; xx <= x + 1; ++xx) {
        for (yy = y - 1; yy <= y + 1; ++yy) {
            if (!C.isok(xx, yy))
                continue;
            if (C.u_at(xx, yy))
                continue;
            if (!(mtmp = C.m_at(xx, yy)))
                continue;
            /* This doesn't do any checks on otmp to see that it matches the
             * likes_* property, intentionally. Assume that the monster is
             * rifling through and taking things that look interesting. */
            if (!(C.likes_gold(mtmp.data) || C.likes_gems(mtmp.data)
                  || C.likes_objs(mtmp.data) || C.likes_magic(mtmp.data)))
                continue;
            nmon++;
            if (!C.rn2(nmon, 0))
                selected = mtmp;
        }
    }
    if (selected && C.can_carry(selected, otmp))
        C.add_to_minv(selected, otmp);
    else
        C.place_object(otmp, x, y);
}

/* called by savebones(); also by finish_paybill(shk.c) */
export function drop_upon_death(mtmp, /* monster if hero rises as one (non ghost) */
    cont,   /* container if hero is turned into a statue */
    x, y)
{
    let otmp;

    /* when dual-wielding, the second weapon gets dropped rather than
       welded if it becomes cursed; ensure that that won't happen here
       by ending dual-wield */
    C.u.twoweap = 0; /* bypass set_twoweap() */

    /* all inventory is dropped (for the normal case), even non-droppable
       things like worn armor and accessories, welded weapon, or cursed
       loadstones */
    while ((otmp = C.gi.invent) != 0) {
        C.obj_extract_self(otmp);
        /* when turning into green slime, all gear remains held;
           other types "arise from the dead" do aren't holding
           equipment during their brief interval as a corpse */
        if (!mtmp || C.is_undead(mtmp.data))
            C.obj_no_longer_held(otmp);

        /* lamps don't go out when dropped */
        if ((cont || C.artifact_light(otmp)) && C.obj_is_burning(otmp))
            C.end_burn(otmp, 1); /* smother in statue */
        otmp.owornmask = 0n;

        if (otmp.otyp == C.SLIME_MOLD)
            goodfruit(otmp.spe);

        if (C.rn2(5, 1))
            C.curse(otmp);
        if (mtmp)
            C.add_to_minv(mtmp, otmp);
        else if (cont)
            C.add_to_container(cont, otmp);
        else if (!C.rn2(8, 2))
            give_to_nearby_mon(otmp, x, y);
        else
            C.place_object(otmp, x, y);
    }
    if (cont)
        cont.owt = C.weight(cont);
}

/* possibly restore oracle's room and/or put her back inside it; returns
   False if she's on the wrong level and should be removed, True otherwise */
export function fixuporacle(oracle)
{
    const cc = C.coordLocal();
    let ridx, o_ridx;

    /* oracle doesn't move, but knight's joust or monk's staggering blow
       could push her onto a hole in the floor; at present, traps don't
       activate in such situation hence she won't fall to another level;
       however, that could change so be prepared to cope with such things */
    if (!C.Is_oracle_level(C.u.uz))
        return 0;

    oracle.mpeaceful = 1; /* for behavior toward next character */
    o_ridx = C.levl[oracle.mx][oracle.my].roomno - C.ROOMOFFSET;
    if (o_ridx >= 0 && C.svr.rooms[o_ridx].rtype == C.DELPHI)
        return 1; /* no fixup needed */

    /*
     * The Oracle isn't in DELPHI room.  Either hero entered her chamber
     * and got the one-time welcome message, converting it into an
     * ordinary room, or she got teleported out, or both.  Try to put
     * her back inside her room, if necessary, and restore its type.
     */

    /* find original delphi chamber; should always succeed */
    for (ridx = 0; ridx < C.roomCount; ++ridx)
        if (C.svr.rooms[ridx].orig_rtype == C.DELPHI)
            break;

    if (o_ridx != ridx && ridx < C.roomCount) {
        /* room found and she's not in it, so try to move her there */
        cc.x = Math.trunc((C.svr.rooms[ridx].lx + C.svr.rooms[ridx].hx) / 2);
        cc.y = Math.trunc((C.svr.rooms[ridx].ly + C.svr.rooms[ridx].hy) / 2);
        if (C.enexto(cc, cc.x, cc.y, oracle.data)) {
            C.rloc_to(oracle, cc.x, cc.y);
            o_ridx = C.levl[oracle.mx][oracle.my].roomno - C.ROOMOFFSET;
        }
        /* [if her room is already full, she might end up outside;
           that's ok, next hero just won't get any welcome message,
           same as used to happen before this fixup was introduced] */
    }
    if (ridx == o_ridx) /* if she's in her room, mark it as such */
        C.svr.rooms[ridx].rtype = C.DELPHI;
    return 1; /* keep oracle in new bones file */
}

/* check whether bones are feasible */
export function can_make_bones()
{
    let ttmp;

    if (!C.flags.bones)
        return 0;
    if (C.ledger_no(C.u.uz) <= 0 || C.ledger_no(C.u.uz) > C.maxledgerno())
        return 0;
    if (no_bones_level(C.u.uz))
        return 0; /* no bones for specific levels */
    if (C.u.uswallow) {
        return 0; /* no bones when swallowed */
    }
    if (!C.Is_branchlev(C.u.uz)) {
        /* no bones on non-branches with portals */
        for (ttmp = C.gf.ftrap; ttmp; ttmp = ttmp.ntrap)
            if (ttmp.ttyp == C.MAGIC_PORTAL)
                return 0;
    }

    if (C.depth(C.u.uz) <= 0                 /* bulletproofing for endgame */
        || (!C.rn2(() => 1 + (C.depth(C.u.uz) >> 2), 3) /* fewer ghosts on low levels */
            && !C.wizard))
        return 0;
    /* don't let multiple restarts generate multiple copies of objects
       in bones files */
    if (C.discover)
        return 0;
    return 1;
}

/* monster might need to be removed before saving a bones file,
   in case these characters are not in their home bases */
export function remove_mon_from_bones(mtmp)
{
    let mptr = mtmp.data;

    if (mtmp.iswiz || mptr == C.mons[C.PM_MEDUSA]
        || mptr.msound == C.MS_NEMESIS || mptr.msound == C.MS_LEADER
        || C.is_Vlad(mtmp) /* mptr == &mons[VLAD_THE_IMPALER] || cham == VLAD */
        || (mptr == C.mons[C.PM_ORACLE] && !fixuporacle(mtmp)))
        C.mongone(mtmp);
}

/* save bones and possessions of a deceased adventurer */
export function savebones(how, when, corpse)
{
    let x, y;
    let ttmp;
    let mtmp;
    let f;
    let newbones;
    let c, bonesid;
    const whynot = C.stackAlloc(C.BUFSZ);
    let nhfp;

    /* caller has already checked `can_make_bones()' */

    C.clear_bypasses();
    nhfp = C.open_bonesfile(C.u.uz, C.reference("Pointer", () => bonesid, value => bonesid = value));
    make_bones: {
    if (nhfp) {
        C.close_nhfile(nhfp);
        if (C.wizard) {
            if (C.y_n("Bones file already exists.  Replace it?") == 121) {
                if (C.delete_bonesfile(C.u.uz))
                    break make_bones;
                else
                    C.pline("Cannot unlink old bones.");
            }
        }
        /* compression can change the file's name, so must
           wait until after any attempt to delete this file */
        C.compress_bonesfile();
        return;
    }

    }
    C.unleash_all();
    /* new ghost or other undead isn't punished even if hero was;
       end-of-game disclosure has already had a chance to report the
       Punished status so we don't need to preserve it any further */
    if (C.Punished)
        C.unpunish(); /* unwear uball, destroy uchain */
    /* in case dismounting kills steed [is that even possible?], do so
       before cleaning up dead monsters */
    if (C.u.usteed)
        C.dismount_steed(C.DISMOUNT_BONES);

    C.iter_mons(remove_mon_from_bones); /* send various unique monsters away, */
    C.dmonsfree();                      /* then discard dead or gone monsters */

    C.forget_engravings(); /* next hero won't have read any engravings yet */
    /* mark all named fruits as nonexistent; if/when we come to instances
       of any of them we'll mark those as existing (using goodfruit()) */
    for (f = C.gf.ffruit; f; f = f.nextf)
        f.fid = -f.fid;

    set_ghostly_objlist(C.gi.invent);
    /* dispose of your possessions, usually cursed */
    if (C.ismnum(C.u.ugrave_arise)) {
        /* give your possessions to the monster you become */
        C.gi.in_mklev = 1; /* use <u.ux,u.uy> as-is */
        mtmp = C.makemon(C.mons[C.u.ugrave_arise], C.u.ux, C.u.uy, C.NO_MINVENT);
        C.gi.in_mklev = 0;
        if (!mtmp) { /* arise-type might have been genocided */
            drop_upon_death(0, 0, C.u.ux, C.u.uy);
            C.u.ugrave_arise = C.NON_PM; /* in case caller cares */
            return;
        }
        C.give_u_to_m_resistances(mtmp);
        mtmp = C.christen_monst(mtmp, C.svp.plname);
        C.newsym(C.u.ux, C.u.uy);
        /* ["Your body rises from the dead as an <mname>..." used
           to be given here, but it has been moved to done() so that
           it gets delivered even when savebones() isn't called] */
        drop_upon_death(mtmp, 0, C.u.ux, C.u.uy);
        /* 'mtmp' now has hero's inventory; if 'mtmp' is a mummy, give it
           a wrapping unless already carrying one */
        if (mtmp.data.mlet == C.S_MUMMY && !C.m_carrying(mtmp, C.MUMMY_WRAPPING))
            C.mongets(mtmp, C.MUMMY_WRAPPING);
        C.m_dowear(mtmp, 1);
    } else if (C.u.ugrave_arise == C.LEAVESTATUE) {
        let otmp;

        /* embed your possessions in your statue */
        otmp = C.mk_named_object(C.STATUE, C.mons[C.u.umonnum], C.u.ux, C.u.uy,
                               C.svp.plname);

        drop_upon_death(0, otmp, C.u.ux, C.u.uy);
        if (!otmp)
            return; /* couldn't make statue */
        mtmp = 0;
    } else { /* u.ugrave_arise < LEAVESTATUE */
        /* drop everything */
        drop_upon_death(0, 0, C.u.ux, C.u.uy);
        /* trick makemon() into allowing monster creation
         * on your location
         */
        C.gi.in_mklev = 1;
        mtmp = C.makemon(C.mons[C.PM_GHOST], C.u.ux, C.u.uy, C.MM_NONAME);
        C.gi.in_mklev = 0;
        if (!mtmp)
            return;
        mtmp = C.christen_monst(mtmp, C.svp.plname);
        if (corpse)
            C.obj_attach_mid(corpse, mtmp.m_id);
    }
    if (mtmp) {
        let i;

        mtmp.m_lev = (C.u.ulevel ? C.u.ulevel : 1);
        mtmp.mhp = mtmp.mhpmax = C.u.uhpmax;
        mtmp.female = C.flags.female;
        mtmp.msleeping = 1;

        if (!C.has_ebones(mtmp))
            newebones(mtmp);
        if (C.has_ebones(mtmp)) {
            for (i = 0; i <= C.NUM_ROLES; ++i) {
                if (!C.strcmp(C.gu.urole.name.m, C.roles[i].name.m)) {
                    C.EBONES(mtmp).role = i;
                    break;
                }
                /* impossible("savebones: bad gu.urole.name.m \"%s\"",
                              gu.urole.name.m); */
            }
            for (i = 0; i <= C.NUM_RACES; ++i) {
                if (!C.strcmp(C.gu.urace.noun, C.races[i].noun)) {
                    C.EBONES(mtmp).race = i;
                    break;
                }
                /* impossible("savebones: bad gu.urace.noun \"%s\"",
                              gu.urace.noun); */
            }
            C.copyAlign(C.EBONES(mtmp).oldalign, C.u.ualign);
            C.EBONES(mtmp).deathlevel = C.u.ulevel;
            C.EBONES(mtmp).luck = C.u.uluck; /* moreluck not included */
            C.EBONES(mtmp).mnum = C.Role_switch;
            C.EBONES(mtmp).female = C.flags.female;
            C.EBONES(mtmp).demigod = C.u.uevent.udemigod;
            C.EBONES(mtmp).crowned = C.u.uevent.uhand_of_elbereth;
        }
    }
    for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon) {
        set_ghostly_objlist(mtmp.minvent);
        resetobjs(mtmp.minvent, 0);
        /* do not zero out m_ids for bones levels any more */
        mtmp.mlstmv = 0n;
        if (mtmp.mtame)
            mtmp.mtame = mtmp.mpeaceful = 0;
        /* observations about the current hero won't apply to future game */
        mtmp.seen_resistance = C.M_SEEN_NOTHING;
    }
    for (ttmp = C.gf.ftrap; ttmp; ttmp = ttmp.ntrap) {
        ttmp.madeby_u = 0;
        ttmp.tseen = C.unhideable_trap(ttmp.ttyp);
    }
    set_ghostly_objlist(C.fobj);
    resetobjs(C.fobj, 0);
    set_ghostly_objlist(C.svl.level.buriedobjlist);
    resetobjs(C.svl.level.buriedobjlist, 0);

    /* Hero is no longer on the map. */
    C.u.ux0 = C.u.ux, C.u.uy0 = C.u.uy;
    C.u.ux = C.u.uy = 0;

    /* Clear all memory from the level. */
    for (x = 1; x < C.COLNO; x++)
        for (y = 0; y < C.ROWNO; y++) {
            C.levl[x][y].seenv = 0;
            C.levl[x][y].waslit = 0;
            C.levl[x][y].glyph = C.GLYPH_UNEXPLORED;
            C.svl.lastseentyp[x][y] = 0;
        }

    /* Attach bones info to the current level before saving. */
    newbones = C.cemetery(C.alloc(C.cemeterySize));
    /* entries are '\0' terminated but have fixed length allocations,
       so pre-fill with spaces to initialize any excess room */
    C.memset(newbones, 32, C.cemeterySize);
    /* format name+role,&c, death reason, and date+time;
       gender and alignment reflect final values rather than what the
       character started out as, same as topten and logfile entries */
    C.Sprintf(newbones.who, "%s-%.3s-%.3s-%.3s-%.3s",
            C.svp.plname, C.gu.urole.filecode,
            C.gu.urace.filecode, C.genders[C.flags.female].filecode,
            C.aligns[1 - C.u.ualign.type].filecode);
    C.formatkiller(newbones.how, C.cemeteryHowSize, how, 1);
    C.Strcpy(newbones.when, C.yyyymmddhhmmss(when));
    /* final resting place, used to decide when bones are discovered */
    newbones.frpx = C.u.ux0, newbones.frpy = C.u.uy0;
    newbones.bonesknown = 0;
    /* if current character died on a bones level, the cemetery list
       will have multiple entries, most recent (this dead hero) first */
    newbones.next = C.svl.level.bonesinfo;
    C.svl.level.bonesinfo = newbones;
    /* flag these bones if they are being created in wizard mode;
       they might already be flagged as such, even when we're playing
       in normal mode, if this level came from a previous bones file */
    if (C.wizard)
        C.svl.level.flags.wizard_bones = 1;

    nhfp = C.create_bonesfile(C.u.uz, C.reference("Pointer", () => bonesid, value => bonesid = value), whynot);
    if (!nhfp) {
        if (C.wizard)
            C.pline1(whynot);
        /* bones file creation problems are silent to the player.
         * Keep it that way, but place a clue into the paniclog.
         */
        C.paniclog("savebones", whynot);
        return;
    }
    c = C.char(C.strlen(bonesid) + 1);

    nhfp.mode = C.WRITING;
    C.store_version(nhfp);
    C.Sfo_char(nhfp, C.svn.nhuuid, "ancestor-nhuuid", C.nhuuidSize);
    /* if a bones pool digit is in use, it precedes the bonesid
       string and isn't recorded in the file */
    C.Sfo_char(nhfp, C.reference("Int8", () => c, value => c = value), "bones_count", 1);
    C.Sfo_char(nhfp, bonesid, "bonesid", c);       /* DD.nnn */
    C.savefruitchn(nhfp);
    C.update_mlstmv(); /* update monsters for eventual restoration */
    C.savelev(nhfp, C.ledger_no(C.u.uz));
    C.close_nhfile(nhfp);
    C.commit_bonesfile(C.u.uz);
    C.compress_bonesfile();
}

 /* !SFCTOOL */

export function getbones()
{
    let ok;
    let nhfp = 0;
    let c = 0, bonesid;
    const oldbonesid = C.stackAlloc(40); C.memset(oldbonesid, 0, 40); /* was [10]; more should be safer */
    const ancestor_nhuuid = C.stackAlloc(C.nhuuidSize);


    if (C.discover) /* save bones files for real games */
        return 0;

    if (!C.flags.bones)
        return 0;
    /* wizard check added by GAN 02/05/87 */
    if (C.rn2(3, 4) /* only once in three times do we find bones */
        && !C.wizard)
        return 0;
    if (no_bones_level(C.u.uz))
        return 0;
 /* !SFCTOOL */

    nhfp = C.open_bonesfile(C.u.uz, C.reference("Pointer", () => bonesid, value => bonesid = value));
    if (!nhfp)
        return 0;
    if (nhfp && nhfp.structlevel && nhfp.fd < 0)
        return 0;
    if (nhfp && nhfp.fieldlevel) {
        if (nhfp.style.deflt && !nhfp.fpdef)
        return 0;
    }

    C.program_state.reading_bonesfile = 1;
    if (C.validate(nhfp, C.gb.bones, 0) != C.SF_UPTODATE) {
        if (!C.wizard)
            C.pline("Discarding unusable bones; no need to panic...");
        ok = 0;
        C.program_state.reading_bonesfile = 0;
    } else {
        ok = 1;
        if (C.wizard) {
            if (C.y_n("Get bones?") == 110) {
                C.close_nhfile(nhfp);
                C.compress_bonesfile();
                C.program_state.reading_bonesfile = 0;
                return 0;
            }
        }
        C.Sfi_char(nhfp, ancestor_nhuuid, "ancestor-nhuuid",
                 C.nhuuidSize);
        C.Sfi_char(nhfp, C.reference("Int8", () => c, value => c = value), "bones_count", 1); /* length incl. '\0' */
            if (C.unsigned(c) <= 40) {
                C.Sfi_char(nhfp, oldbonesid, "bonesid", c);
            } else {
                if (C.wizard)
                    C.debugpline2("Abandoning bones , %u > %u.",
                                C.unsigned(c), 40);
                C.close_nhfile(nhfp);
                C.compress_bonesfile();
                /* ToDo: maybe unlink these problematic bones? */
                C.program_state.reading_bonesfile = 0;
                return 0;
            }
        if (C.strcmp(bonesid, oldbonesid) != 0) {
            const errbuf = C.stackAlloc(C.BUFSZ);

            C.Sprintf(errbuf, "This is bones level '%s', not '%s'!",
                    oldbonesid, bonesid);
            if (C.wizard) {
                C.pline1(errbuf);
                ok = 0; /* won't die of trickery */
            }
            C.program_state.reading_bonesfile = 0;
            C.trickery(errbuf);
        } else {
            let mtmp;

            C.getlev(nhfp, 0, 0);

            /* Note that getlev() now keeps tabs on unique
             * monsters such as demon lords, and tracks the
             * birth counts of all species just as makemon()
             * does.  If a bones monster is extinct or has been
             * subject to genocide, their mhpmax will be
             * set to the magic DEFUNCT_MONSTER cookie value.
             */
            for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon) {
                if (C.has_mgivenname(mtmp))
                    sanitize_name(C.MGIVENNAME(mtmp));
                if (mtmp.mhpmax == C.DEFUNCT_MONSTER) {
                    if (C.wizard) {
                        C.debugpline1("Removing defunct monster %s from bones.",
                                    mtmp.data.pmnames[C.NEUTRAL]);
                    }
                    C.mongone(mtmp);
                } else
                    /* to correctly reset named artifacts on the level */
                    resetobjs(mtmp.minvent, 1);
            }
            resetobjs(C.fobj, 1);
            resetobjs(C.svl.level.buriedobjlist, 1);
            C.fix_shop_damage();
        }
    }
    C.close_nhfile(nhfp);
    C.program_state.reading_bonesfile = 0;
    C.sanitize_engravings();
    C.u.uroleplay.numbones++;

    if (C.wizard) {
        if (C.y_n("Unlink bones?") == 110) {
            C.compress_bonesfile();
            return ok;
        }
    }
    if (!C.delete_bonesfile(C.u.uz)) {
        /* When N games try to simultaneously restore the same
         * bones file, N-1 of them will fail to delete it
         * (the first N-1 under AmigaDOS, the last N-1 under UNIX).
         * So no point in a mysterious message for a normal event
         * -- just generate a new level for those N-1 games.
         */
        /* pline("Cannot unlink bones."); */
        return 0;
    }
    return ok;
}



/* check whether current level contains bones from a particular player */
export function bones_include_name(name)
{
    let bp;
    let len;
    const buf = C.stackAlloc(C.BUFSZ);

    /* prepare buffer by appending terminal hyphen to name, to avoid partial
     * matches producing false positives */
    C.Strcpy(buf, name);
    C.Strcat(buf, "-");
    len = C.strlen(buf);

    for (bp = C.svl.level.bonesinfo; bp; bp = bp.next) {
        if (!C.strncmp(bp.who, buf, len))
            return 1;
    }

    return 0;
}

/* set the ghostly bit in a list of objects */
export function set_ghostly_objlist(objchain)
{
    while (objchain) {
        objchain.ghostly = 1;
        objchain = objchain.nobj;
    }
}

/* This is called when a marked object from a bones file is picked-up.
   Some could result in a message, and the obj->ghostly flag is always
   cleared. obj->ghostly has no other usage at this time. */
export function fix_ghostly_obj(obj)
{
    if (!obj.ghostly)
        return;
    switch(obj.otyp) {
        /* asymmetrical weapons */
        case C.BOW:
        case C.ELVEN_BOW:
        case C.ORCISH_BOW:
        case C.YUMI:
        case C.BOOMERANG:
            C.You("make adjustments to %s to suit your %s hand.",
                C.the(C.xname(obj)),
                C.URIGHTY ? "right" : "left");
            break;
        default:
            break;
    }
    obj.ghostly = 0;
}

export function newebones(mtmp)
{
    if (!mtmp.mextra)
        mtmp.mextra = C.mextra(C.newmextra());
    if (!C.EBONES(mtmp)) {
        C.setEBONES(mtmp, C.ebones(C.alloc(
            C.ebonesSize)));
        C.memset(C.EBONES(mtmp), 0,
                      C.ebonesSize);
        C.EBONES(mtmp).parentmid = mtmp.m_id;
    }
}

/* this is not currently used */
export function free_ebones(mtmp)
{
    if (mtmp.mextra && C.EBONES(mtmp)) {
        C.free(C.EBONES(mtmp));
        C.setEBONES(mtmp, 0);
    }
}

 /* SFCTOOL */

/*bones.c*/
