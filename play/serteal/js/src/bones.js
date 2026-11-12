/* NetHack 5.0	bones.c	$NHDT-Date: 1701500709 2023/12/02 07:05:09 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.129 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985,1993. */
/*-Copyright (c) Robert Patrick Rankin, 2012. */
/* NetHack may be freely redistributed.  See license for details. */

// #include "hack.h"










function /* boolean */
no_bones_level(lev)
{
    let sptr;

    if (ledger_no(gs.save_dlevel))
        assign_level(lev, gs.save_dlevel);

    return (((((sptr = Is_special(lev)) != null && !sptr.boneid)
                      || !elt(svd.dungeons, lev.dnum).boneid
                      /* no bones on the last or multiway branch levels
                         in any dungeon (level 1 isn't multiway) */
                      || Is_botlevel(lev)
                      || (Is_branchlev(lev) && lev.dlevel > 1)
                      /* no bones in the invocation level */
                      || (In_hell(lev)
                          && lev.dlevel == dunlevs_in_dungeon(lev) - 1)) ? 1 : 0));
}

/* Call this function for each fruit object saved in the bones level: it marks
 * that particular type of fruit as existing (the marker is that that type's
 * ID is positive instead of negative).  This way, when we later save the
 * chain of fruit types, we know to only save the types that exist.
 */
function /* void */
goodfruit(id)
{
    let f = fruit_from_indx(-id);

    if (f)
        f.fid = id;
}

function /* void */
resetobjs(ochain, restore)
{ const $frame = stack_frame(); try {
    let otmp, nobj;

    for (otmp = ochain; otmp; otmp = nobj) {
        nobj = otmp.nobj;
        if (otmp.cobj)
            resetobjs(otmp.cobj, restore);
        if (otmp.in_use) {
            obj_extract_self(otmp);
            dealloc_obj(otmp);
            continue;
        }

        if (restore) {
            /* artifact bookkeeping needs to be done during
               restore; other fixups are done while saving */
            if (otmp.oartifact) {
                if (exist_artifact(otmp.otyp, safe_oname(otmp))
                    || is_quest_artifact(otmp)) {
                    /* prevent duplicate--revert to ordinary obj */
                    otmp.oartifact = 0;
                    if (has_oname(otmp))
                        free_oname(otmp);
                } else {
                    artifact_exists(otmp, safe_oname(otmp), TRUE,
                                    ONAME_BONES);
                }
            } else if (has_oname(otmp)) {
                sanitize_name(ONAME(otmp));
            }
            /* 3.6.3: set no_charge for partly eaten food in shop;
               all other items become goods for sale if in a shop */
            if (otmp.oclass == FOOD_CLASS && otmp.oeaten) {
                let top;
                let p;
                let ox = stack_var(coordxy), oy = stack_var(coordxy);

                for (top = otmp; top.where == OBJ_CONTAINED;
                     top = top.v.v_ocontainer)
                    continue;
                otmp.no_charge = (((top.where == OBJ_FLOOR
                                   && get_obj_location(top, ox, oy, 0)
                                   /* can't use costly_spot() since its
                                      result depends upon hero's location */
                                   && inside_shop(ox[0], oy[0])
                                   && chars[(p = in_rooms(ox[0], oy[0], SHOPBASE))]
                                 && tended_shop(elt(svr.rooms, chars[p] - ROOMOFFSET))) ? 1 : 0));
            }
        } else { /* saving */
            /* do not zero out o_ids for ghost levels anymore */

            if (objects[otmp.otyp].oc_uses_known)
                otmp.known = 0;
            otmp.dknown = otmp.bknown = 0;
            otmp.rknown = 0;
            otmp.lknown = 0;
            otmp.cknown = 0;
            otmp.tknown = 0;
            otmp.invlet = 0;
            otmp.no_charge = 0;
            otmp.how_lost = LOST_NONE;

            /* strip user-supplied names */
            /* Statue and some corpse names are left intact,
               presumably in case they came from score file.
               [TODO: this ought to be done differently--names
               which came from such a source or came from any
               stoned or killed monster should be flagged in
               some manner; then we could just check the flag
               here and keep "real" names (dead pets, &c) while
               discarding player notes attached to statues.] */
            if (has_oname(otmp)
                && !(otmp.oartifact || otmp.otyp == STATUE
                     || otmp.otyp == SPE_NOVEL
                     || (otmp.otyp == CORPSE
                         && otmp.corpsenm >= SPECIAL_PM))) {
                free_oname(otmp);
            }

            if (otmp.otyp == SLIME_MOLD) {
                goodfruit(otmp.spe);

            } else if (otmp.otyp == SCR_MAIL) {
                /* 0: delivered in-game via external event;
                   1: from bones or wishing; 2: written with marker */
                if (otmp.spe == 0)
                    otmp.spe = 1;

            } else if (otmp.otyp == EGG) {
                otmp.spe = 0; /* not "laid by you" in next game */
            } else if (otmp.otyp == TIN) {
                /* make tins of unique monster's meat be empty */
                if (ismnum(otmp.corpsenm)
                    && unique_corpstat(mons[otmp.corpsenm]))
                    otmp.corpsenm = NON_PM;
            } else if (otmp.otyp == CORPSE || otmp.otyp == STATUE) {
                let mnum = stack_var(int, otmp.corpsenm);

                /* Discard incarnation details of unique monsters
                   (by passing null instead of otmp for object),
                   shopkeepers (by passing false for revival flag),
                   temple priests, and vault guards in order to
                   prevent corpse revival or statue reanimation. */
                if (has_omonst(otmp)
                    && cant_revive(mnum, FALSE, null)) {
                    free_omonst(otmp);
                    /* mnum is now either human_zombie or doppelganger;
                       for corpses of uniques, we need to force the
                       transformation now rather than wait until a
                       revival attempt, otherwise eating this corpse
                       would behave as if it remains unique */
                    if (mnum[0] == PM_DOPPELGANGER && otmp.otyp == CORPSE)
                        set_corpsenm(otmp, mnum[0]);
                }
            } else if (is_mines_prize(otmp) || is_soko_prize(otmp)) {
                /* achievement tracking; in case prize was moved off its
                   original level (which is always a no-bones level) */
                otmp.nomerge = 0;
            } else if (otmp.otyp == AMULET_OF_YENDOR) {
                /* no longer the real Amulet */
                otmp.otyp = FAKE_AMULET_OF_YENDOR;
                curse(otmp);
            } else if (otmp.otyp == CANDELABRUM_OF_INVOCATION) {
                if (otmp.lamplit)
                    end_burn(otmp, TRUE);
                otmp.otyp = WAX_CANDLE;
                otmp.age = 50; /* assume used */
                if (otmp.spe > 0)
                    otmp.quan = otmp.spe;
                otmp.spe = 0;
                otmp.owt = unsigned(weight(otmp));
                curse(otmp);
            } else if (otmp.otyp == BELL_OF_OPENING) {
                otmp.otyp = BELL;
                curse(otmp);
            } else if (otmp.otyp == SPE_BOOK_OF_THE_DEAD) {
                otmp.otyp = SPE_BLANK_PAPER;
                curse(otmp);
            }
        }
    }
} finally { stack_pop($frame); } }

/* while loading bones, strip out text possibly supplied by old player
   that might accidentally or maliciously disrupt new player's display */
export function /* void */
sanitize_name(namebuf)
{
    let c;
    let strip_8th_bit = (+(((windowprocs.wp_id == wp_tty))
                             && !iflags.wc_eight_bit_input));

    /* it's tempting to skip this for single-user platforms, since
       only the current player could have left these bones--except
       things like "hearse" and other bones exchange schemes make
       that assumption false */
    while (chars[namebuf]) {
        c = chars[namebuf] & 0o177;
        if (c < ord(' ') || c == ord('\x7f')) {
            /* non-printable or undesirable */
            chars[namebuf] = ord('.');
        } else if (c != chars[namebuf]) {
            /* expected to be printable if user wants such things */
            if (strip_8th_bit)
                chars[namebuf] = ord('_');
        }
        ++namebuf;
    }
}

/* Give object to a random object-liking monster on or adjacent to x,y
   but skipping hero's location.
   If no such monster, place object on floor at x,y. */
function /* void */
give_to_nearby_mon(otmp, x, y)
{
    let mtmp;
    let selected = null;
    let nmon = 0, xx, yy;

    for (xx = x - 1; xx <= x + 1; ++xx) {
        for (yy = y - 1; yy <= y + 1; ++yy) {
            if (!isok(xx, yy))
                continue;
            if (u_at(xx, yy))
                continue;
            if (!(mtmp = m_at(xx, yy)))
                continue;
            /* This doesn't do any checks on otmp to see that it matches the
             * likes_* property, intentionally. Assume that the monster is
             * rifling through and taking things that look interesting. */
            if (!(likes_gold(mtmp.data) || likes_gems(mtmp.data)
                  || likes_objs(mtmp.data) || likes_magic(mtmp.data)))
                continue;
            nmon++;
            if (!rn2(nmon))
                selected = mtmp;
        }
    }
    if (selected && can_carry(selected, otmp))
        add_to_minv(selected, otmp);
    else
        place_object(otmp, x, y);
}

/* called by savebones(); also by finish_paybill(shk.c) */
export function /* void */
drop_upon_death(
    mtmp,
    cont,
    x, y)
{
    let otmp;

    /* when dual-wielding, the second weapon gets dropped rather than
       welded if it becomes cursed; ensure that that won't happen here
       by ending dual-wield */
    u.twoweap = FALSE; /* bypass set_twoweap() */

    /* all inventory is dropped (for the normal case), even non-droppable
       things like worn armor and accessories, welded weapon, or cursed
       loadstones */
    while ((otmp = gi.invent) != null) {
        obj_extract_self(otmp);
        /* when turning into green slime, all gear remains held;
           other types "arise from the dead" do aren't holding
           equipment during their brief interval as a corpse */
        if (!mtmp || is_undead(mtmp.data))
            obj_no_longer_held(otmp);

        /* lamps don't go out when dropped */
        if ((cont || artifact_light(otmp)) && obj_is_burning(otmp))
            end_burn(otmp, TRUE); /* smother in statue */
        otmp.owornmask = 0;

        if (otmp.otyp == SLIME_MOLD)
            goodfruit(otmp.spe);

        if (rn2(5))
            curse(otmp);
        if (mtmp)
            void add_to_minv(mtmp, otmp);
        else if (cont)
            void add_to_container(cont, otmp);
        else if (!rn2(8))
            give_to_nearby_mon(otmp, x, y);
        else
            place_object(otmp, x, y);
    }
    if (cont)
        cont.owt = unsigned(weight(cont));
}

/* possibly restore oracle's room and/or put her back inside it; returns
   False if she's on the wrong level and should be removed, True otherwise */
function /* boolean */
fixuporacle(oracle)
{ const $frame = stack_frame(); try {
    let cc = stack_struct(struct_nhcoord);
    let ridx, o_ridx;

    /* oracle doesn't move, but knight's joust or monk's staggering blow
       could push her onto a hole in the floor; at present, traps don't
       activate in such situation hence she won't fall to another level;
       however, that could change so be prepared to cope with such things */
    if (!Is_oracle_level(u.uz))
        return FALSE;

    oracle.mpeaceful = 1; /* for behavior toward next character */
    o_ridx = levl()[oracle.mx][oracle.my].roomno - ROOMOFFSET;
    if (o_ridx >= 0 && svr.rooms[o_ridx].rtype == DELPHI)
        return TRUE; /* no fixup needed */

    /*
     * The Oracle isn't in DELPHI room.  Either hero entered her chamber
     * and got the one-time welcome message, converting it into an
     * ordinary room, or she got teleported out, or both.  Try to put
     * her back inside her room, if necessary, and restore its type.
     */

    /* find original delphi chamber; should always succeed */
    for (ridx = 0; ridx < SIZE(svr.rooms); ++ridx)
        if (svr.rooms[ridx].orig_rtype == DELPHI)
            break;

    if (o_ridx != ridx && ridx < SIZE(svr.rooms)) {
        /* room found and she's not in it, so try to move her there */
        cc.x = Math.trunc((svr.rooms[ridx].lx + svr.rooms[ridx].hx) / 2);
        cc.y = Math.trunc((svr.rooms[ridx].ly + svr.rooms[ridx].hy) / 2);
        if (enexto(cc, cc.x, cc.y, oracle.data)) {
            rloc_to(oracle, cc.x, cc.y);
            o_ridx = levl()[oracle.mx][oracle.my].roomno - ROOMOFFSET;
        }
        /* [if her room is already full, she might end up outside;
           that's ok, next hero just won't get any welcome message,
           same as used to happen before this fixup was introduced] */
    }
    if (ridx == o_ridx) /* if she's in her room, mark it as such */
        svr.rooms[ridx].rtype = DELPHI;
    return TRUE; /* keep oracle in new bones file */
} finally { stack_pop($frame); } }

/* check whether bones are feasible */
export function /* boolean */
can_make_bones()
{
    let ttmp;

    if (!flags.bones)
        return FALSE;
    if (ledger_no(u.uz) <= 0 || ledger_no(u.uz) > maxledgerno())
        return FALSE;
    if (no_bones_level(u.uz))
        return FALSE; /* no bones for specific levels */
    if (u.uswallow) {
        return FALSE; /* no bones when swallowed */
    }
    if (!Is_branchlev(u.uz)) {
        /* no bones on non-branches with portals */
        for (ttmp = gf.ftrap; ttmp; ttmp = ttmp.ntrap)
            if (ttmp.ttyp == MAGIC_PORTAL)
                return FALSE;
    }

    if (depth(u.uz) <= 0                 /* bulletproofing for endgame */
        || (!rn2(1 + (depth(u.uz) >> 2)) /* fewer ghosts on low levels */
            && !wizard()))
        return FALSE;
    /* don't let multiple restarts generate multiple copies of objects
       in bones files */
    if (discover())
        return FALSE;
    return TRUE;
}

/* monster might need to be removed before saving a bones file,
   in case these characters are not in their home bases */
function /* void */
remove_mon_from_bones(mtmp)
{
    let mptr = mtmp.data;

    if (mtmp.iswiz || mptr == mons[PM_MEDUSA]
        || mptr.msound == MS_NEMESIS || mptr.msound == MS_LEADER
        || is_Vlad(mtmp) /* mptr == &mons[VLAD_THE_IMPALER] || cham == VLAD */
        || (mptr == mons[PM_ORACLE] && !fixuporacle(mtmp)))
        mongone(mtmp);
}

/* save bones and possessions of a deceased adventurer */
export function /* void */
savebones(how, when, corpse)
{ const $frame = stack_frame(); try {
    var x, y;
    var ttmp;
    var mtmp;
    var f;
    var newbones;
    var c = stack_var(char), bonesid = stack_var(ptr_to(char));
    var whynot = stack_array(char, BUFSZ);
    var nhfp;

    /* caller has already checked `can_make_bones()' */

    clear_bypasses();
    nhfp = open_bonesfile(u.uz, bonesid);
    make_bones: { if (nhfp) {
        close_nhfile(nhfp);
        if (wizard()) {
            if (y_n(_("Bones file already exists.  Replace it?")) == ord('y')) {
                if (delete_bonesfile(u.uz))
                    break make_bones;
                else
                    pline(_("Cannot unlink old bones."));
            }
        }
        /* compression can change the file's name, so must
           wait until after any attempt to delete this file */
        compress_bonesfile();
        return;
    }

 }
    unleash_all();
    /* new ghost or other undead isn't punished even if hero was;
       end-of-game disclosure has already had a chance to report the
       Punished status so we don't need to preserve it any further */
    if (Punished())
        unpunish(); /* unwear uball, destroy uchain */
    /* in case dismounting kills steed [is that even possible?], do so
       before cleaning up dead monsters */
    if (u.usteed)
        dismount_steed(DISMOUNT_BONES);

    iter_mons(remove_mon_from_bones); /* send various unique monsters away, */
    dmonsfree();                      /* then discard dead or gone monsters */

    forget_engravings(); /* next hero won't have read any engravings yet */
    /* mark all named fruits as nonexistent; if/when we come to instances
       of any of them we'll mark those as existing (using goodfruit()) */
    for (f = gf.ffruit; f; f = f.nextf)
        f.fid = -f.fid;

    set_ghostly_objlist(gi.invent);
    /* dispose of your possessions, usually cursed */
    if (ismnum(u.ugrave_arise)) {
        /* give your possessions to the monster you become */
        gi.in_mklev = TRUE; /* use <u.ux,u.uy> as-is */
        mtmp = makemon(mons[u.ugrave_arise], u.ux, u.uy, NO_MINVENT);
        gi.in_mklev = FALSE;
        if (!mtmp) { /* arise-type might have been genocided */
            drop_upon_death(null, null, u.ux, u.uy);
            u.ugrave_arise = NON_PM; /* in case caller cares */
            return;
        }
        give_u_to_m_resistances(mtmp);
        mtmp = christen_monst(mtmp, svp.plname);
        newsym(u.ux, u.uy);
        /* ["Your body rises from the dead as an <mname>..." used
           to be given here, but it has been moved to done() so that
           it gets delivered even when savebones() isn't called] */
        drop_upon_death(mtmp, null, u.ux, u.uy);
        /* 'mtmp' now has hero's inventory; if 'mtmp' is a mummy, give it
           a wrapping unless already carrying one */
        if (mtmp.data.mlet == S_MUMMY && !m_carrying(mtmp, MUMMY_WRAPPING))
            void mongets(mtmp, MUMMY_WRAPPING);
        m_dowear(mtmp, TRUE);
    } else if (u.ugrave_arise == LEAVESTATUE) {
        var otmp;

        /* embed your possessions in your statue */
        otmp = mk_named_object(STATUE, mons[u.umonnum], u.ux, u.uy,
                               svp.plname);

        drop_upon_death(null, otmp, u.ux, u.uy);
        if (!otmp)
            return; /* couldn't make statue */
        mtmp = null;
    } else { /* u.ugrave_arise < LEAVESTATUE */
        /* drop everything */
        drop_upon_death(null, null, u.ux, u.uy);
        /* trick makemon() into allowing monster creation
         * on your location
         */
        gi.in_mklev = TRUE;
        mtmp = makemon(mons[PM_GHOST], u.ux, u.uy, MM_NONAME);
        gi.in_mklev = FALSE;
        if (!mtmp)
            return;
        mtmp = christen_monst(mtmp, svp.plname);
        if (corpse)
            void obj_attach_mid(corpse, mtmp.m_id);
    }
    if (mtmp) {
        var i;

        mtmp.m_lev = uchar((u.ulevel ? u.ulevel : 1));
        mtmp.mhp = mtmp.mhpmax = u.uhpmax;
        mtmp.female = unsigned(flags.female);
        mtmp.msleeping = 1;

        if (!has_ebones(mtmp))
            newebones(mtmp);
        if (has_ebones(mtmp)) {
            for (i = 0; i <= NUM_ROLES; ++i) {
                if (!strcmp(gu.urole.name.m, roles[i].name.m)) {
                    EBONES(mtmp).role = uchar(i);
                    break;
                }
                /* impossible("savebones: bad gu.urole.name.m \"%s\"",
                              gu.urole.name.m); */
            }
            for (i = 0; i <= NUM_RACES; ++i) {
                if (!strcmp(gu.urace.noun, races[i].noun)) {
                    EBONES(mtmp).race = uchar(i);
                    break;
                }
                /* impossible("savebones: bad gu.urace.noun \"%s\"",
                              gu.urace.noun); */
            }
            struct_assign(EBONES(mtmp).oldalign, u.ualign);
            EBONES(mtmp).deathlevel = uchar(u.ulevel);
            EBONES(mtmp).luck = u.uluck; /* moreluck not included */
            EBONES(mtmp).mnum = Role_switch();
            EBONES(mtmp).female = unsigned(flags.female);
            EBONES(mtmp).demigod = u.uevent.udemigod;
            EBONES(mtmp).crowned = u.uevent.uhand_of_elbereth;
        }
    }
    for (mtmp = fmon(); mtmp; mtmp = mtmp.nmon) {
        set_ghostly_objlist(mtmp.minvent);
        resetobjs(mtmp.minvent, FALSE);
        /* do not zero out m_ids for bones levels any more */
        mtmp.mlstmv = 0;
        if (mtmp.mtame)
            mtmp.mtame = mtmp.mpeaceful = 0;
        /* observations about the current hero won't apply to future game */
        mtmp.seen_resistance = M_SEEN_NOTHING;
    }
    for (ttmp = gf.ftrap; ttmp; ttmp = ttmp.ntrap) {
        ttmp.madeby_u = 0;
        ttmp.tseen = unhideable_trap(ttmp.ttyp);
    }
    set_ghostly_objlist(fobj());
    resetobjs(fobj(), FALSE);
    set_ghostly_objlist(svl.level.buriedobjlist);
    resetobjs(svl.level.buriedobjlist, FALSE);

    /* Hero is no longer on the map. */
    u.ux0 = u.ux, u.uy0 = u.uy;
    u.ux = u.uy = 0;

    /* Clear all memory from the level. */
    for (x = 1; x < COLNO; x++)
        for (y = 0; y < ROWNO; y++) {
            levl()[x][y].seenv = 0;
            levl()[x][y].waslit = 0;
            levl()[x][y].glyph = GLYPH_UNEXPLORED;
            chars[svl.lastseentyp[x] + y] = 0;
        }

    /* Attach bones info to the current level before saving. */
    newbones = view_of(struct_cemetery, addr_of(alloc(sizeof(struct_cemetery))));
    /* entries are '\0' terminated but have fixed length allocations,
       so pre-fill with spaces to initialize any excess room */
    void memset(addr_of(newbones), ord(' '), sizeof(struct_cemetery));
    /* format name+role,&c, death reason, and date+time;
       gender and alignment reflect final values rather than what the
       character started out as, same as topten and logfile entries */
    void sprintf(newbones.who, _("%s-%.3s-%.3s-%.3s-%.3s"), svp.plname, gu.urole.filecode, gu.urace.filecode, genders[flags.female].filecode, aligns[1 - u.ualign.type].filecode)


;
    formatkiller(newbones.how, sizeof_member(newbones, "how"), how, TRUE);
    void strcpy(newbones.when, yyyymmddhhmmss(when));
    /* final resting place, used to decide when bones are discovered */
    newbones.frpx = u.ux0, newbones.frpy = u.uy0;
    newbones.bonesknown = FALSE;
    /* if current character died on a bones level, the cemetery list
       will have multiple entries, most recent (this dead hero) first */
    newbones.next = svl.level.bonesinfo;
    svl.level.bonesinfo = newbones;
    /* flag these bones if they are being created in wizard mode;
       they might already be flagged as such, even when we're playing
       in normal mode, if this level came from a previous bones file */
    if (wizard())
        svl.level.flags.wizard_bones = 1;

    nhfp = create_bonesfile(u.uz, bonesid, whynot);
    if (!nhfp) {
        if (wizard())
            pline1(whynot);
        /* bones file creation problems are silent to the player.
         * Keep it that way, but place a clue into the paniclog.
         */
        paniclog(_("savebones"), whynot);
        return;
    }
    c[0] = char((unsigned(strlen(bonesid[0]) + 1)));

    nhfp.mode = WRITING;
    store_version(nhfp);
    Sfo_char(nhfp, svn.nhuuid + 0, _("ancestor-nhuuid"), sizeof_member(svn, "nhuuid"));
    /* if a bones pool digit is in use, it precedes the bonesid
       string and isn't recorded in the file */
    Sfo_char(nhfp, addr_of(c), _("bones_count"), 1);
    Sfo_char(nhfp, bonesid[0], _("bonesid"), (c[0]));       /* DD.nnn */
    savefruitchn(nhfp);
    update_mlstmv(); /* update monsters for eventual restoration */
    savelev(nhfp, ledger_no(u.uz));
    close_nhfile(nhfp);
    commit_bonesfile(u.uz);
    compress_bonesfile();
} finally { stack_pop($frame); } }



export function /* int */
getbones()
{ const $frame = stack_frame(); try {
    let ok;
    let nhfp = null;
    let c = stack_var(char, 0), bonesid = stack_var(ptr_to(char)),
         oldbonesid = init_list(stack_array(char, 40), [ 0 ]); /* was [10]; more should be safer */
    let ancestor_nhuuid = stack_array(char, (Math.trunc((sizeof_member(svn, "nhuuid") / sizeof(char)))));


    if (discover()) /* save bones files for real games */
        return 0;

    if (!flags.bones)
        return 0;
    /* wizard check added by GAN 02/05/87 */
    if (rn2(3) /* only once in three times do we find bones */
        && !wizard())
        return 0;
    if (no_bones_level(u.uz))
        return 0;


    nhfp = open_bonesfile(u.uz, bonesid);
    if (!nhfp)
        return 0;
    if (nhfp && nhfp.structlevel && nhfp.fd < 0)
        return 0;
    if (nhfp && nhfp.fieldlevel) {
        if (nhfp.style.deflt && !nhfp.fpdef)
        return 0;
    }

    program_state.reading_bonesfile = 1;
    if (validate(nhfp, gb.bones, FALSE) != SF_UPTODATE) {
        if (!wizard())
            pline(_("Discarding unusable bones; no need to panic..."));
        ok = FALSE;
        program_state.reading_bonesfile = 0;
    } else {
        ok = TRUE;
        if (wizard()) {
            if (y_n(_("Get bones?")) == ord('n')) {
                close_nhfile(nhfp);
                compress_bonesfile();
                program_state.reading_bonesfile = 0;
                return 0;
            }
        }
        Sfi_char(nhfp, ancestor_nhuuid + 0, _("ancestor-nhuuid"),
                 sizeof(array_of(char, (Math.trunc((sizeof_member(svn, "nhuuid") / sizeof(char)))))));
        Sfi_char(nhfp, addr_of(c), _("bones_count"), 1); /* length incl. '\0' */
            if (unsigned((c[0])) <= sizeof(array_of(char, 40))) {
                Sfi_char(nhfp, oldbonesid, _("bonesid"), (c[0]));
            } else {
                if (wizard())
                    debugpline2(_("Abandoning bones , %u > %u."),
                                unsigned((c[0])), sizeof(array_of(char, 40)), __FILE__);
                close_nhfile(nhfp);
                compress_bonesfile();
                /* ToDo: maybe unlink these problematic bones? */
                program_state.reading_bonesfile = 0;
                return 0;
            }
        if (strcmp(bonesid[0], oldbonesid) != 0) {
            let errbuf = stack_array(char, BUFSZ);

            void sprintf(errbuf, _("This is bones level '%s', not '%s'!"), oldbonesid, bonesid[0])
;
            if (wizard()) {
                pline1(errbuf);
                ok = FALSE; /* won't die of trickery */
            }
            program_state.reading_bonesfile = 0;
            trickery(errbuf);
        } else {
            let mtmp;

            getlev(nhfp, 0, 0);

            /* Note that getlev() now keeps tabs on unique
             * monsters such as demon lords, and tracks the
             * birth counts of all species just as makemon()
             * does.  If a bones monster is extinct or has been
             * subject to genocide, their mhpmax will be
             * set to the magic DEFUNCT_MONSTER cookie value.
             */
            for (mtmp = fmon(); mtmp; mtmp = mtmp.nmon) {
                if (has_mgivenname(mtmp))
                    sanitize_name(MGIVENNAME(mtmp));
                if (mtmp.mhpmax == DEFUNCT_MONSTER) {
                    if (wizard()) {
                        do { if (showdebug(_(__FILE__))) { let save_plnmsg = iflags.last_msg; pline(_("Removing defunct monster %s from bones."), mtmp.data.pmnames[NEUTRAL]); iflags.last_msg = save_plnmsg; } } while (0)
;
                    }
                    mongone(mtmp);
                } else
                    /* to correctly reset named artifacts on the level */
                    resetobjs(mtmp.minvent, TRUE);
            }
            resetobjs(fobj(), TRUE);
            resetobjs(svl.level.buriedobjlist, TRUE);
            fix_shop_damage();
        }
    }
    close_nhfile(nhfp);
    program_state.reading_bonesfile = 0;
    sanitize_engravings();
    u.uroleplay.numbones++;

    if (wizard()) {
        if (y_n(_("Unlink bones?")) == ord('n')) {
            compress_bonesfile();
            return ok;
        }
    }
    if (!delete_bonesfile(u.uz)) {
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
} finally { stack_pop($frame); } }



/* check whether current level contains bones from a particular player */
export function /* boolean */
bones_include_name(name)
{ const $frame = stack_frame(); try {
    let bp;
    let len;
    let buf = stack_array(char, BUFSZ);

    /* prepare buffer by appending terminal hyphen to name, to avoid partial
     * matches producing false positives */
    void strcpy(buf, name);
    void strcat(buf, _("-"));
    len = strlen(buf);

    for (bp = svl.level.bonesinfo; bp; bp = bp.next) {
        if (!strncmp(bp.who, buf, len))
            return TRUE;
    }

    return FALSE;
} finally { stack_pop($frame); } }

/* set the ghostly bit in a list of objects */
function /* void */
set_ghostly_objlist(objchain)
{
    while (objchain) {
        objchain.ghostly = 1;
        objchain = objchain.nobj;
    }
}

/* This is called when a marked object from a bones file is picked-up.
   Some could result in a message, and the obj->ghostly flag is always
   cleared. obj->ghostly has no other usage at this time. */
export function /* void */
fix_ghostly_obj(obj)
{
    if (!obj.ghostly)
        return;
    switch(obj.otyp) {
        /* asymmetrical weapons */
        case BOW:
        case ELVEN_BOW:
        case ORCISH_BOW:
        case YUMI:
        case BOOMERANG:
            You(_("make adjustments to %s to suit your %s hand."),
                the(xname(obj)),
                URIGHTY() ? _("right") : _("left"));
            break;
        default:
            break;
    }
    obj.ghostly = 0;
}

export function /* void */
newebones(mtmp)
{
    if (!mtmp.mextra)
        mtmp.mextra = newmextra();
    if (!EBONES(mtmp)) {
        ((mtmp).mextra.ebones) = view_of(struct_ebones, addr_of(alloc(
            sizeof(struct_ebones))));
        void memset(addr_of(EBONES(mtmp)), 0,
                      sizeof(struct_ebones));
        EBONES(mtmp).parentmid = mtmp.m_id;
    }
}

/* this is not currently used */
export function /* void */
free_ebones(mtmp)
{
    if (mtmp.mextra && EBONES(mtmp)) {
        free(addr_of(EBONES(mtmp)));
        ((mtmp).mextra.ebones) = null;
    }
}



/*bones.c*/
import { struct_nhcoord } from "./coord.h.js";
import { FOOD_CLASS } from "./defsym.h.js";
import { S_MUMMY } from "./defsym.h.js";
import { GLYPH_UNEXPLORED } from "./display.h.js";
import { Is_oracle_level } from "./dungeon.h.macros.js";
import { discover } from "./flag.h.macros.js";
import { wizard } from "./flag.h.macros.js";
import { BUFSZ } from "./global.h.js";
import { COLNO } from "./global.h.js";
import { FALSE } from "./global.h.js";
import { ROWNO } from "./global.h.js";
import { TRUE } from "./global.h.js";
import { coordxy } from "./global.h.js";
import { DEFUNCT_MONSTER } from "./hack.h.js";
import { DISMOUNT_BONES } from "./hack.h.js";
import { MM_NONAME } from "./hack.h.js";
import { NO_MINVENT } from "./hack.h.js";
import { NUM_RACES } from "./hack.h.js";
import { NUM_ROLES } from "./hack.h.js";
import { ONAME_BONES } from "./hack.h.js";
import { SF_UPTODATE } from "./hack.h.js";
import { WRITING } from "./hack.h.js";
import { pline1 } from "./hack.h.macros.js";
import { y_n } from "./hack.h.macros.js";
import { debugpline2 } from "./lint.h.macros.js";
import { showdebug } from "./lint.h.macros.js";
import { struct_ebones } from "./mextra.h.js";
import { EBONES } from "./mextra.h.macros.js";
import { MGIVENNAME } from "./mextra.h.macros.js";
import { has_ebones } from "./mextra.h.macros.js";
import { has_mgivenname } from "./mextra.h.macros.js";
import { DELPHI } from "./mkroom.h.js";
import { ROOMOFFSET } from "./mkroom.h.js";
import { SHOPBASE } from "./mkroom.h.js";
import { is_undead } from "./mondata.h.macros.js";
import { likes_gems } from "./mondata.h.macros.js";
import { likes_gold } from "./mondata.h.macros.js";
import { likes_magic } from "./mondata.h.macros.js";
import { likes_objs } from "./mondata.h.macros.js";
import { unique_corpstat } from "./mondata.h.macros.js";
import { MS_LEADER } from "./monflag.h.js";
import { MS_NEMESIS } from "./monflag.h.js";
import { NEUTRAL } from "./monflag.h.js";
import { M_SEEN_NOTHING } from "./monst.h.js";
import { is_Vlad } from "./monst.h.macros.js";
import { ismnum } from "./monst.h.macros.js";
import { LEAVESTATUE } from "./monsters.h.js";
import { NON_PM } from "./monsters.h.js";
import { PM_DOPPELGANGER } from "./monsters.h.js";
import { PM_GHOST } from "./monsters.h.js";
import { PM_MEDUSA } from "./monsters.h.js";
import { PM_ORACLE } from "./monsters.h.js";
import { SPECIAL_PM } from "./monsters.h.js";
import { LOST_NONE } from "./obj.h.js";
import { OBJ_CONTAINED } from "./obj.h.js";
import { OBJ_FLOOR } from "./obj.h.js";
import { ONAME } from "./obj.h.macros.js";
import { has_omonst } from "./obj.h.macros.js";
import { has_oname } from "./obj.h.macros.js";
import { is_mines_prize } from "./obj.h.macros.js";
import { is_soko_prize } from "./obj.h.macros.js";
import { AMULET_OF_YENDOR } from "./objects.h.js";
import { BELL } from "./objects.h.js";
import { BELL_OF_OPENING } from "./objects.h.js";
import { BOOMERANG } from "./objects.h.js";
import { BOW } from "./objects.h.js";
import { CANDELABRUM_OF_INVOCATION } from "./objects.h.js";
import { CORPSE } from "./objects.h.js";
import { EGG } from "./objects.h.js";
import { ELVEN_BOW } from "./objects.h.js";
import { FAKE_AMULET_OF_YENDOR } from "./objects.h.js";
import { MUMMY_WRAPPING } from "./objects.h.js";
import { ORCISH_BOW } from "./objects.h.js";
import { SCR_MAIL } from "./objects.h.js";
import { SLIME_MOLD } from "./objects.h.js";
import { SPE_BLANK_PAPER } from "./objects.h.js";
import { SPE_BOOK_OF_THE_DEAD } from "./objects.h.js";
import { SPE_NOVEL } from "./objects.h.js";
import { STATUE } from "./objects.h.js";
import { TIN } from "./objects.h.js";
import { WAX_CANDLE } from "./objects.h.js";
import { YUMI } from "./objects.h.js";
import { struct_cemetery } from "./rm.h.js";
import { fmon } from "./rm.h.macros.js";
import { fobj } from "./rm.h.macros.js";
import { levl } from "./rm.h.macros.js";
import { m_at } from "./rm.h.macros.js";
import { Sfi_char } from "./savefile.h.macros.js";
import { Sfo_char } from "./savefile.h.macros.js";
import { MAGIC_PORTAL } from "./trap.h.js";
import { unhideable_trap } from "./trap.h.macros.js";
import { wp_tty } from "./winprocs.h.js";
import { Role_switch } from "./you.h.macros.js";
import { URIGHTY } from "./you.h.macros.js";
import { u_at } from "./you.h.macros.js";
import { Punished } from "./youprop.h.macros.js";
import { SIZE } from "../rt/cmacros.js";
import { char } from "../rt/ctypes.js";
import { int } from "../rt/ctypes.js";
import { ord } from "../rt/ctypes.js";
import { sizeof } from "../rt/ctypes.js";
import { uchar } from "../rt/ctypes.js";
import { unsigned } from "../rt/ctypes.js";
import { chars } from "../rt/heap.js";
import { stack_frame } from "../rt/heap.js";
import { stack_pop } from "../rt/heap.js";
import { free } from "../rt/libc.js";
import { memset } from "../rt/libc.js";
import { sprintf } from "../rt/libc.js";
import { strcat } from "../rt/libc.js";
import { strcmp } from "../rt/libc.js";
import { strcpy } from "../rt/libc.js";
import { strlen } from "../rt/libc.js";
import { strncmp } from "../rt/libc.js";
import { init_list } from "../rt/locals.js";
import { stack_array } from "../rt/locals.js";
import { stack_struct } from "../rt/locals.js";
import { stack_var } from "../rt/locals.js";
import { _ } from "../rt/strings.js";
import { addr_of } from "../rt/struct.js";
import { array_of } from "../rt/struct.js";
import { elt } from "../rt/struct.js";
import { ptr_to } from "../rt/struct.js";
import { sizeof_member } from "../rt/struct.js";
import { struct_assign } from "../rt/struct.js";
import { view_of } from "../rt/struct.js";
import { alloc } from "./alloc.js";
import { unleash_all } from "./apply.js";
import { artifact_exists } from "./artifact.js";
import { artifact_light } from "./artifact.js";
import { exist_artifact } from "./artifact.js";
import { yyyymmddhhmmss } from "./calendar.js";
import { isok } from "./cmd.js";
import { flags } from "./decl.js";
import { gb } from "./decl.js";
import { gf } from "./decl.js";
import { gi } from "./decl.js";
import { gs } from "./decl.js";
import { gu } from "./decl.js";
import { iflags } from "./decl.js";
import { program_state } from "./decl.js";
import { svd } from "./decl.js";
import { svl } from "./decl.js";
import { svn } from "./decl.js";
import { svp } from "./decl.js";
import { svr } from "./decl.js";
import { u } from "./decl.js";
import { newsym } from "./display.js";
import { obj_no_longer_held } from "./do.js";
import { christen_monst } from "./do_name.js";
import { free_oname } from "./do_name.js";
import { safe_oname } from "./do_name.js";
import { update_mlstmv } from "./dog.js";
import { In_hell } from "./dungeon.js";
import { Is_botlevel } from "./dungeon.js";
import { Is_branchlev } from "./dungeon.js";
import { Is_special } from "./dungeon.js";
import { assign_level } from "./dungeon.js";
import { depth } from "./dungeon.js";
import { dunlevs_in_dungeon } from "./dungeon.js";
import { ledger_no } from "./dungeon.js";
import { maxledgerno } from "./dungeon.js";
import { forget_engravings } from "./engrave.js";
import { sanitize_engravings } from "./engrave.js";
import { close_nhfile } from "./files.js";
import { commit_bonesfile } from "./files.js";
import { compress_bonesfile } from "./files.js";
import { create_bonesfile } from "./files.js";
import { delete_bonesfile } from "./files.js";
import { open_bonesfile } from "./files.js";
import { paniclog } from "./files.js";
import { in_rooms } from "./hack.js";
import { obj_is_burning } from "./light.js";
import { makemon } from "./makemon.js";
import { mongets } from "./makemon.js";
import { newmextra } from "./makemon.js";
import { add_to_container } from "./mkobj.js";
import { add_to_minv } from "./mkobj.js";
import { curse } from "./mkobj.js";
import { dealloc_obj } from "./mkobj.js";
import { free_omonst } from "./mkobj.js";
import { mk_named_object } from "./mkobj.js";
import { obj_attach_mid } from "./mkobj.js";
import { obj_extract_self } from "./mkobj.js";
import { place_object } from "./mkobj.js";
import { set_corpsenm } from "./mkobj.js";
import { weight } from "./mkobj.js";
import { can_carry } from "./mon.js";
import { dmonsfree } from "./mon.js";
import { iter_mons } from "./mon.js";
import { mongone } from "./mon.js";
import { give_u_to_m_resistances } from "./mondata.js";
import { mons } from "./monst.js";
import { m_carrying } from "./mthrowu.js";
import { objects } from "./objects.js";
import { fruit_from_indx } from "./objnam.js";
import { the } from "./objnam.js";
import { xname } from "./objnam.js";
import { You } from "./pline.js";
import { pline } from "./pline.js";
import { is_quest_artifact } from "./questpgr.js";
import { cant_revive } from "./read.js";
import { unpunish } from "./read.js";
import { getlev } from "./restore.js";
import { trickery } from "./restore.js";
import { rn2 } from "./rnd.js";
import { aligns } from "./role.js";
import { genders } from "./role.js";
import { races } from "./role.js";
import { roles } from "./role.js";
import { savefruitchn } from "./save.js";
import { savelev } from "./save.js";
import { fix_shop_damage } from "./shk.js";
import { inside_shop } from "./shk.js";
import { tended_shop } from "./shk.js";
import { dismount_steed } from "./steed.js";
import { enexto } from "./teleport.js";
import { rloc_to } from "./teleport.js";
import { end_burn } from "./timeout.js";
import { formatkiller } from "./topten.js";
import { store_version } from "./version.js";
import { validate } from "./version.js";
import { windowprocs } from "./windows.js";
import { clear_bypasses } from "./worn.js";
import { m_dowear } from "./worn.js";
import { get_obj_location } from "./zap.js";
const __FILE__ = "bones.c";
