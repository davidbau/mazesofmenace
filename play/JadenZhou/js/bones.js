// bones.js — bones files.
// C ref: bones.c
//
// Ported: no_bones_level(), goodfruit(), resetobjs(), sanitize_name(),
// give_to_nearby_mon(), drop_upon_death(), fixuporacle(), can_make_bones(),
// remove_mon_from_bones(), savebones(), getbones(), bones_include_name(),
// set_ghostly_objlist(), fix_ghostly_obj(), newebones(), free_ebones().
// The bones file goes through files.js (create/commit/open/delete_bonesfile)
// into the contest storage, like the save file.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import {
    Is_botlevel, MAGIC_PORTAL, NON_PM, LEAVESTATUE, ismnum, isok, u_at,
    Is_oracle_level, ROOMOFFSET, DELPHI, SHOPBASE, M_SEEN_NOTHING,
    LOST_NONE, ONAME_BONES, NO_MINVENT, MM_NONAME, DEFUNCT_MONSTER, HOLE,
} from './const.js';
import {
    ledger_no, assign_level, Is_special, Is_branchlev, In_hell,
    dunlevs_in_dungeon, maxledgerno, depth,
} from './dungeon.js';
import { open_bonesfile, create_bonesfile, commit_bonesfile, delete_bonesfile,
         compress_bonesfile, store_version, validate } from './files.js';
import { Sfo, Sfi, close_nhfile } from './sfbase.js';
import * as O from './objects.js';
import { objects } from './objects.js';
import { mons, PM_GHOST, PM_MEDUSA, PM_ORACLE, PM_VLAD_THE_IMPALER,
         PM_DOPPELGANGER, MS_NEMESIS, MS_LEADER, S_MUMMY, AT_WEAP,
         M2_GREEDY, M2_JEWELS, M2_COLLECT, M2_MAGIC,
         SPECIAL_PM, G_UNIQ } from './monsters.js';
import { fruit_from_indx } from './objnam.js';
import { obj_extract_self, add_to_minv, add_to_container, place_object,
         curse, weight, set_corpsenm } from './mkobj.js';
import { obj_no_longer_held } from './do.js';
import { can_carry } from './dogmove.js';
import { m_at, makemon, mongets } from './makemon.js';
import { is_undead, give_u_to_m_resistances, likes_gems, likes_gold,
         likes_magic, unique_corpstat, likes_objs } from './mondata.js';
import { christen_monst, safe_oname } from './do_name.js';
import { obj_attach_mid, mk_named_object } from './mkobj.js';
import { end_burn } from './timeout.js';
import { obj_is_burning } from './light.js';
import { newsym, pline, You } from './display.js';
import { mongone, dmonsfree } from './mon.js';
import { enexto, rloc_to } from './teleport.js';
import { clear_bypasses, m_dowear } from './worn.js';
import { forget_engravings, sanitize_engravings } from './engrave.js';
import { roles, races, genders, aligns } from './role.js';
import { formatkiller } from './topten.js';
import { yyyymmddhhmmss } from './calendar.js';
import { savefruitchn, savelev } from './save.js';
import { getlev, trickery } from './restore.js';
import { update_mlstmv } from './dog.js';
import { exist_artifact, artifact_exists,
         artifact_light } from './artifact.js';
import { is_quest_artifact } from './questpgr.js';
import { cant_revive } from './read.js';
import { unpunish } from './read.js';
import { inside_shop, tended_shop, get_obj_location, fix_shop_damage } from './shk.js';
import { in_rooms } from './hack.js';
import { xname } from './objnam.js';
import { the } from './iactions.js';
import { tty_yn_function } from './wintty.js';
import { m_carrying } from './mthrowu.js';

/* mondata.h */
/* mondata.h is_Vlad() */
function is_Vlad(mtmp) {
    return mtmp.data === mons[PM_VLAD_THE_IMPALER]
           || mtmp.cham === PM_VLAD_THE_IMPALER;
}
/* obj.h is_mines_prize(), is_soko_prize() */
function is_mines_prize(o) {
    return !!game.context?.achieveo && o.o_id === game.context.achieveo.mines_prize_oid;
}
function is_soko_prize(o) {
    return !!game.context?.achieveo && o.o_id === game.context.achieveo.soko_prize_oid;
}
/* trap.h unhideable_trap() */
function unhideable_trap(ttyp) { return ttyp === HOLE; } /* visible traps */

/* the members of an object chain (JS keeps some as arrays, invent as a
   nobj list) */
function chain_members(ochain) {
    if (!ochain) return [];
    if (Array.isArray(ochain)) return ochain.slice();
    const list = [];
    for (let o = ochain; o; o = o.nobj) list.push(o);
    return list;
}

// C ref: bones.c no_bones_level()
function no_bones_level(lev) {
    const g = game;
    let sptr;
    const save_dlevel = g.save_dlevel || { dnum: 0, dlevel: 0 };

    if (ledger_no(save_dlevel))
        assign_level(lev, save_dlevel);

    return (((sptr = Is_special(lev)) !== null && !sptr.boneid)
            || !g.dungeons[lev.dnum].boneid
            /* no bones on the last or multiway branch levels
               in any dungeon (level 1 isn't multiway) */
            || Is_botlevel(lev)
            || (Is_branchlev(lev) && lev.dlevel > 1)
            /* no bones in the invocation level */
            || (In_hell(lev)
                && lev.dlevel === dunlevs_in_dungeon(lev) - 1)) ? true : false;
}

// C ref: bones.c goodfruit()
/* Call this function for each fruit object saved in the bones level: it marks
 * that particular type of fruit as existing (the marker is that that type's
 * ID is positive instead of negative).  This way, when we later save the
 * chain of fruit types, we know to only save the types that exist.
 */
function goodfruit(id) {
    const f = fruit_from_indx(-id);

    if (f)
        f.fid = id;
}

// C ref: bones.c resetobjs()
function resetobjs(ochain, restore) {
    const g = game;

    for (const otmp of chain_members(ochain)) {
        if (otmp.cobj)
            resetobjs(otmp.cobj, restore);
        if (otmp.in_use) {
            obj_extract_self(otmp);
            /* dealloc_obj(otmp): garbage collected */
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
                    if (otmp.oextra?.oname) /* has_oname() */
                        delete otmp.oextra.oname; /* free_oname() */
                } else {
                    artifact_exists(otmp, safe_oname(otmp), true,
                                    ONAME_BONES);
                }
            } else if (otmp.oextra?.oname) { /* has_oname() */
                otmp.oextra.oname = sanitize_name(otmp.oextra.oname);
            }
            /* 3.6.3: set no_charge for partly eaten food in shop;
               all other items become goods for sale if in a shop */
            if (otmp.oclass === O.FOOD_CLASS && otmp.oeaten) {
                let top;
                let p, oxy;

                for (top = otmp; top.where === 'OBJ_CONTAINED';
                     top = top.ocontainer)
                    continue;
                otmp.no_charge = (top.where === 'OBJ_FLOOR'
                                  && (oxy = get_obj_location(top, 0)) !== null
                                  /* can't use costly_spot() since its
                                     result depends upon hero's location */
                                  && inside_shop(oxy[0], oxy[1])
                                  && (p = in_rooms(oxy[0], oxy[1], SHOPBASE)).length
                                  && tended_shop(g.level.rooms[p.charCodeAt(0) - ROOMOFFSET]))
                                 ? 1 : 0;
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
            if (otmp.oextra?.oname /* has_oname() */
                && !(otmp.oartifact || otmp.otyp === O.STATUE
                     || otmp.otyp === O.SPE_NOVEL
                     || (otmp.otyp === O.CORPSE
                         && otmp.corpsenm >= SPECIAL_PM))) {
                delete otmp.oextra.oname; /* free_oname() */
            }

            if (otmp.otyp === O.SLIME_MOLD) {
                goodfruit(otmp.spe);
            } else if (otmp.otyp === O.SCR_MAIL) {
                /* MAIL_STRUCTURES */
                /* 0: delivered in-game via external event;
                   1: from bones or wishing; 2: written with marker */
                if (otmp.spe === 0)
                    otmp.spe = 1;
            } else if (otmp.otyp === O.EGG) {
                otmp.spe = 0; /* not "laid by you" in next game */
            } else if (otmp.otyp === O.TIN) {
                /* make tins of unique monster's meat be empty */
                if (ismnum(otmp.corpsenm)
                    && unique_corpstat(mons[otmp.corpsenm]))
                    otmp.corpsenm = NON_PM;
            } else if (otmp.otyp === O.CORPSE || otmp.otyp === O.STATUE) {
                const mnum = { v: otmp.corpsenm };

                /* Discard incarnation details of unique monsters
                   (by passing null instead of otmp for object),
                   shopkeepers (by passing false for revival flag),
                   temple priests, and vault guards in order to
                   prevent corpse revival or statue reanimation. */
                if (otmp.oextra?.omonst /* has_omonst() */
                    && cant_revive(mnum, false, null)) {
                    delete otmp.oextra.omonst; /* free_omonst() */
                    /* mnum is now either human_zombie or doppelganger;
                       for corpses of uniques, we need to force the
                       transformation now rather than wait until a
                       revival attempt, otherwise eating this corpse
                       would behave as if it remains unique */
                    if (mnum.v === PM_DOPPELGANGER && otmp.otyp === O.CORPSE)
                        set_corpsenm(otmp, mnum.v);
                }
            } else if (is_mines_prize(otmp) || is_soko_prize(otmp)) {
                /* achievement tracking; in case prize was moved off its
                   original level (which is always a no-bones level) */
                otmp.nomerge = 0;
            } else if (otmp.otyp === O.AMULET_OF_YENDOR) {
                /* no longer the real Amulet */
                otmp.otyp = O.FAKE_AMULET_OF_YENDOR;
                curse(otmp);
            } else if (otmp.otyp === O.CANDELABRUM_OF_INVOCATION) {
                if (otmp.lamplit)
                    end_burn(otmp, true);
                otmp.otyp = O.WAX_CANDLE;
                otmp.age = 50; /* assume used */
                if (otmp.spe > 0)
                    otmp.quan = otmp.spe;
                otmp.spe = 0;
                otmp.owt = weight(otmp);
                curse(otmp);
            } else if (otmp.otyp === O.BELL_OF_OPENING) {
                otmp.otyp = O.BELL;
                curse(otmp);
            } else if (otmp.otyp === O.SPE_BOOK_OF_THE_DEAD) {
                otmp.otyp = O.SPE_BLANK_PAPER;
                curse(otmp);
            }
        }
    }
}

// C ref: bones.c sanitize_name()
/* while loading bones, strip out text possibly supplied by old player
   that might accidentally or maliciously disrupt new player's display
   (C modifies 'namebuf' in place; JS returns the sanitized copy) */
export function sanitize_name(namebuf) {
    /* WINDOWPORT(tty) && !iflags.wc_eight_bit_input */
    const strip_8th_bit = !game.iflags?.wc_eight_bit_input;
    let out = '';

    /* it's tempting to skip this for single-user platforms, since
       only the current player could have left these bones--except
       things like "hearse" and other bones exchange schemes make
       that assumption false */
    for (const ch of namebuf) {
        const code = ch.charCodeAt(0);
        const c = code & 0o177;
        if (c < 0x20 || c === 0o177) {
            /* non-printable or undesirable */
            out += '.';
        } else if (c !== code) {
            /* expected to be printable if user wants such things */
            out += strip_8th_bit ? '_' : ch;
        } else {
            out += ch;
        }
    }
    return out;
}

// C ref: bones.c give_to_nearby_mon()
/* Give object to a random object-liking monster on or adjacent to x,y
   but skipping hero's location.
   If no such monster, place object on floor at x,y. */
function give_to_nearby_mon(otmp, x, y) {
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

// C ref: bones.c drop_upon_death()
/* called by savebones(); also by finish_paybill(shk.c) */
export function drop_upon_death(
    mtmp, /* monster if hero rises as one (non ghost) */
    cont, /* container if hero is turned into a statue */
    x, y)
{
    const g = game;
    let otmp;

    /* when dual-wielding, the second weapon gets dropped rather than
       welded if it becomes cursed; ensure that that won't happen here
       by ending dual-wield */
    g.u.twoweap = 0; /* bypass set_twoweap() */

    /* all inventory is dropped (for the normal case), even non-droppable
       things like worn armor and accessories, welded weapon, or cursed
       loadstones */
    while ((otmp = g.invent) !== null && otmp !== undefined) {
        obj_extract_self(otmp);
        /* when turning into green slime, all gear remains held;
           other types "arise from the dead" do aren't holding
           equipment during their brief interval as a corpse */
        if (!mtmp || is_undead(mtmp.data))
            obj_no_longer_held(otmp);

        /* lamps don't go out when dropped */
        if ((cont || artifact_light(otmp)) && obj_is_burning(otmp))
            end_burn(otmp, true); /* smother in statue */
        otmp.owornmask = 0;

        if (otmp.otyp === O.SLIME_MOLD)
            goodfruit(otmp.spe);

        if (rn2(5))
            curse(otmp);
        if (mtmp)
            add_to_minv(mtmp, otmp);
        else if (cont)
            add_to_container(cont, otmp);
        else if (!rn2(8))
            give_to_nearby_mon(otmp, x, y);
        else
            place_object(otmp, x, y);
    }
    if (cont)
        cont.owt = weight(cont);
}

// C ref: bones.c fixuporacle()
/* possibly restore oracle's room and/or put her back inside it; returns
   False if she's on the wrong level and should be removed, True otherwise */
async function fixuporacle(oracle) {
    const g = game;
    const cc = { x: 0, y: 0 };
    let ridx, o_ridx;
    const rooms = g.level.rooms;

    /* oracle doesn't move, but knight's joust or monk's staggering blow
       could push her onto a hole in the floor; at present, traps don't
       activate in such situation hence she won't fall to another level;
       however, that could change so be prepared to cope with such things */
    if (!Is_oracle_level(g.u.uz))
        return false;

    oracle.mpeaceful = 1; /* for behavior toward next character */
    o_ridx = g.level.at(oracle.mx, oracle.my).roomno - ROOMOFFSET;
    if (o_ridx >= 0 && rooms[o_ridx]?.rtype === DELPHI)
        return true; /* no fixup needed */

    /*
     * The Oracle isn't in DELPHI room.  Either hero entered her chamber
     * and got the one-time welcome message, converting it into an
     * ordinary room, or she got teleported out, or both.  Try to put
     * her back inside her room, if necessary, and restore its type.
     */

    /* find original delphi chamber; should always succeed */
    const NROOMS = rooms.length; /* SIZE(svr.rooms) */
    for (ridx = 0; ridx < NROOMS; ++ridx)
        if (rooms[ridx] && rooms[ridx].orig_rtype === DELPHI)
            break;

    if (o_ridx !== ridx && ridx < NROOMS) {
        /* room found and she's not in it, so try to move her there */
        cc.x = Math.trunc((rooms[ridx].lx + rooms[ridx].hx) / 2);
        cc.y = Math.trunc((rooms[ridx].ly + rooms[ridx].hy) / 2);
        if (enexto(cc, cc.x, cc.y, oracle.data)) {
            await rloc_to(oracle, cc.x, cc.y);
            o_ridx = g.level.at(oracle.mx, oracle.my).roomno - ROOMOFFSET;
        }
        /* [if her room is already full, she might end up outside;
           that's ok, next hero just won't get any welcome message,
           same as used to happen before this fixup was introduced] */
    }
    if (ridx === o_ridx) /* if she's in her room, mark it as such */
        rooms[ridx].rtype = DELPHI;
    return true; /* keep oracle in new bones file */
}

// C ref: bones.c can_make_bones()
/* check whether bones are feasible */
export function can_make_bones() {
    const g = game;
    const u = g.u;
    const wizard = !!g.flags.debug, discover = !!g.flags.explore;

    if (!g.flags.bones)
        return false;
    if (ledger_no(u.uz) <= 0 || ledger_no(u.uz) > maxledgerno())
        return false;
    if (no_bones_level(u.uz))
        return false; /* no bones for specific levels */
    if (u.uswallow) {
        return false; /* no bones when swallowed */
    }
    if (!Is_branchlev(u.uz)) {
        /* no bones on non-branches with portals */
        for (const ttmp of g.level.traps || [])
            if (ttmp.ttyp === MAGIC_PORTAL)
                return false;
    }

    if (depth(u.uz) <= 0                 /* bulletproofing for endgame */
        || (!rn2(1 + (depth(u.uz) >> 2)) /* fewer ghosts on low levels */
            && !wizard))
        return false;
    /* don't let multiple restarts generate multiple copies of objects
       in bones files */
    if (discover)
        return false;
    return true;
}

// C ref: bones.c remove_mon_from_bones()
/* monster might need to be removed before saving a bones file,
   in case these characters are not in their home bases */
async function remove_mon_from_bones(mtmp) {
    const mptr = mtmp.data;

    if (mtmp.iswiz || mptr === mons[PM_MEDUSA]
        || mptr.msound === MS_NEMESIS || mptr.msound === MS_LEADER
        || is_Vlad(mtmp) /* mptr == &mons[VLAD_THE_IMPALER] || cham == VLAD */
        || (mptr === mons[PM_ORACLE] && !(await fixuporacle(mtmp))))
        mongone(mtmp);
}

// C ref: bones.c savebones()
/* save bones and possessions of a deceased adventurer */
export async function savebones(how, when, corpse) {
    const g = game;
    const u = g.u;
    const flags = g.flags;
    const wizard = !!flags.debug;
    let mtmp;
    let nhfp;
    const whynot = { v: '' };

    /* caller has already checked `can_make_bones()' */

    clear_bypasses();
    nhfp = open_bonesfile(u.uz);
    if (nhfp) {
        let make_bones = false;

        close_nhfile(nhfp);
        if (wizard) {
            if (await tty_yn_function("Bones file already exists.  Replace it?",
                                      "yn", 'n') === 'y') { /* y_n() */
                if (delete_bonesfile(u.uz))
                    make_bones = true; /* goto make_bones */
                else
                    await pline("Cannot unlink old bones.");
            }
        }
        if (!make_bones) {
            /* compression can change the file's name, so must
               wait until after any attempt to delete this file */
            compress_bonesfile();
            return;
        }
    }

    /* make_bones: */
    /* unleash_all() */
    for (let otmp = g.invent; otmp; otmp = otmp.nobj)
        if (otmp.otyp === O.LEASH)
            otmp.leashmon = 0;
    for (let m = g.fmon; m; m = m.nmon)
        m.mleashed = 0;
    /* new ghost or other undead isn't punished even if hero was;
       end-of-game disclosure has already had a chance to report the
       Punished status so we don't need to preserve it any further */
    if (g.uball) /* Punished */
        await unpunish(); /* unwear uball, destroy uchain */
    /* in case dismounting kills steed [is that even possible?], do so
       before cleaning up dead monsters */
    if (u.usteed)
        throw new Error('savebones(): dismount_steed(DISMOUNT_BONES) not ported yet');

    /* iter_mons(remove_mon_from_bones): send various unique monsters away, */
    for (let m = g.fmon; m; m = m.nmon)
        if (!(m.mhp <= 0)) /* !DEADMONSTER() */
            await remove_mon_from_bones(m);
    dmonsfree();                      /* then discard dead or gone monsters */

    forget_engravings(); /* next hero won't have read any engravings yet */
    /* mark all named fruits as nonexistent; if/when we come to instances
       of any of them we'll mark those as existing (using goodfruit()) */
    for (let f = g.ffruit; f; f = f.nextf)
        f.fid = -f.fid;

    set_ghostly_objlist(g.invent);
    /* dispose of your possessions, usually cursed */
    if (ismnum(u.ugrave_arise)) {
        /* give your possessions to the monster you become */
        g.in_mklev = true; /* use <u.ux,u.uy> as-is */
        mtmp = makemon(mons[u.ugrave_arise], u.ux, u.uy, NO_MINVENT);
        g.in_mklev = false;
        if (!mtmp) { /* arise-type might have been genocided */
            drop_upon_death(null, null, u.ux, u.uy);
            u.ugrave_arise = NON_PM; /* in case caller cares */
            return;
        }
        give_u_to_m_resistances(mtmp);
        mtmp = christen_monst(mtmp, g.plname);
        newsym(u.ux, u.uy);
        /* ["Your body rises from the dead as an <mname>..." used
           to be given here, but it has been moved to done() so that
           it gets delivered even when savebones() isn't called] */
        drop_upon_death(mtmp, null, u.ux, u.uy);
        /* 'mtmp' now has hero's inventory; if 'mtmp' is a mummy, give it
           a wrapping unless already carrying one */
        if (mtmp.data.mlet === S_MUMMY && !m_carrying(mtmp, O.MUMMY_WRAPPING))
            mongets(mtmp, O.MUMMY_WRAPPING);
        m_dowear(mtmp, true);
    } else if (u.ugrave_arise === LEAVESTATUE) {
        /* embed your possessions in your statue */
        const otmp = mk_named_object(O.STATUE, mons[u.umonnum], u.ux, u.uy,
                                     g.plname);

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
        g.in_mklev = true;
        mtmp = makemon(mons[PM_GHOST], u.ux, u.uy, MM_NONAME);
        g.in_mklev = false;
        if (!mtmp)
            return;
        mtmp = christen_monst(mtmp, g.plname);
        if (corpse)
            obj_attach_mid(corpse, mtmp.m_id);
    }
    if (mtmp) {
        let i;

        mtmp.m_lev = (u.ulevel ? u.ulevel : 1);
        mtmp.mhp = mtmp.mhpmax = u.uhpmax;
        mtmp.female = flags.female ? 1 : 0;
        mtmp.msleeping = 1;

        if (!mtmp.mextra?.ebones) /* !has_ebones(mtmp) */
            newebones(mtmp);
        if (mtmp.mextra?.ebones) {
            const ebones = mtmp.mextra.ebones;
            const NUM_ROLES = roles.length - 1, NUM_RACES = races.length - 1;

            for (i = 0; i <= NUM_ROLES; ++i) {
                if (g.urole.name.m === roles[i].name.m) {
                    ebones.role = i;
                    break;
                }
                /* impossible("savebones: bad gu.urole.name.m \"%s\"",
                              gu.urole.name.m); */
            }
            for (i = 0; i <= NUM_RACES; ++i) {
                if (g.urace.noun === races[i].noun) {
                    ebones.race = i;
                    break;
                }
                /* impossible("savebones: bad gu.urace.noun \"%s\"",
                              gu.urace.noun); */
            }
            ebones.oldalign = { ...u.ualign };
            ebones.deathlevel = u.ulevel;
            ebones.luck = u.uluck; /* moreluck not included */
            ebones.mnum = g.urole.mnum; /* Role_switch */
            ebones.female = flags.female ? 1 : 0;
            ebones.demigod = u.uevent.udemigod ? 1 : 0;
            ebones.crowned = u.uevent.uhand_of_elbereth || 0;
        }
    }
    for (mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
        set_ghostly_objlist(mtmp.minvent);
        resetobjs(mtmp.minvent, false);
        /* do not zero out m_ids for bones levels any more */
        mtmp.mlstmv = 0;
        if (mtmp.mtame)
            mtmp.mtame = mtmp.mpeaceful = 0;
        /* observations about the current hero won't apply to future game */
        mtmp.seen_resistance = M_SEEN_NOTHING;
    }
    for (const ttmp of g.level.traps || []) {
        ttmp.madeby_u = 0;
        ttmp.tseen = unhideable_trap(ttmp.ttyp) ? 1 : 0;
    }
    set_ghostly_objlist(g.level.objects);
    resetobjs(g.level.objects, false);
    set_ghostly_objlist(g.level.buriedobjlist);
    resetobjs(g.level.buriedobjlist, false);

    /* Hero is no longer on the map. */
    u.ux0 = u.ux, u.uy0 = u.uy;
    u.ux = u.uy = 0;

    /* Clear all memory from the level. */
    for (let x = 1; x < g.level.locations.length; x++)
        for (let y = 0; y < g.level.locations[x].length; y++) {
            const lev = g.level.at(x, y);
            lev.seenv = 0;
            lev.waslit = false;
            lev.remembered_glyph = undefined; /* glyph = GLYPH_UNEXPLORED */
            if (g.level.lastseentyp)
                g.level.lastseentyp[x][y] = 0;
        }

    /* Attach bones info to the current level before saving. */
    const newbones = {};
    /* format name+role,&c, death reason, and date+time;
       gender and alignment reflect final values rather than what the
       character started out as, same as topten and logfile entries */
    newbones.who = `${g.plname}-${g.urole.filecode.slice(0, 3)}-${
                    g.urace.filecode.slice(0, 3)}-${
                    genders[flags.female ? 1 : 0].filecode.slice(0, 3)}-${
                    aligns[1 - u.ualign.type].filecode.slice(0, 3)}`;
    newbones.how = formatkiller(100 /* sizeof newbones->how */, how, true);
    newbones.when = yyyymmddhhmmss(when);
    /* final resting place, used to decide when bones are discovered */
    newbones.frpx = u.ux0, newbones.frpy = u.uy0;
    newbones.bonesknown = false;
    /* if current character died on a bones level, the cemetery list
       will have multiple entries, most recent (this dead hero) first */
    newbones.next = g.level.bonesinfo || null;
    g.level.bonesinfo = newbones;
    /* flag these bones if they are being created in wizard mode;
       they might already be flagged as such, even when we're playing
       in normal mode, if this level came from a previous bones file */
    if (wizard)
        g.level.flags.wizard_bones = 1;

    nhfp = create_bonesfile(u.uz, whynot);
    if (!nhfp) {
        if (wizard)
            await pline(whynot.v);
        /* bones file creation problems are silent to the player.
         * Keep it that way, but place a clue into the paniclog.
         */
        /* paniclog("savebones", whynot): no paniclog */
        return;
    }
    const bonesid = g.bonesid;
    const c = bonesid.length + 1;

    nhfp.mode = 0x2; /* WRITING */
    store_version(nhfp);
    Sfo(nhfp, g.nhuuid || '', "ancestor-nhuuid");
    /* if a bones pool digit is in use, it precedes the bonesid
       string and isn't recorded in the file */
    Sfo(nhfp, c, "bones_count");
    Sfo(nhfp, bonesid, "bonesid");       /* DD.nnn */
    savefruitchn(nhfp);
    update_mlstmv(); /* update monsters for eventual restoration */
    savelev(nhfp, ledger_no(u.uz));
    close_nhfile(nhfp);
    commit_bonesfile(u.uz);
    compress_bonesfile();
}

// C ref: bones.c getbones()
export async function getbones() {
    const g = game;
    const flags = g.flags;
    const wizard = !!flags.debug, discover = !!flags.explore;
    let ok;
    let nhfp = null;
    let c = 0;
    let oldbonesid = '';

    if (discover) /* save bones files for real games */
        return 0;

    if (!flags.bones)
        return 0;
    /* wizard check added by GAN 02/05/87 */
    if (rn2(3) /* only once in three times do we find bones */
        && !wizard)
        return 0;
    if (no_bones_level(g.u.uz))
        return 0;

    nhfp = open_bonesfile(g.u.uz);
    if (!nhfp)
        return 0;
    const bonesid = g.bonesid;

    g.program_state.reading_bonesfile = 1;
    if (validate(nhfp) !== 0 /* SF_UPTODATE */) {
        if (!wizard)
            await pline("Discarding unusable bones; no need to panic...");
        ok = false;
        g.program_state.reading_bonesfile = 0;
    } else {
        ok = true;
        if (wizard) {
            if (await tty_yn_function("Get bones?", "yn", 'n') === 'n') { /* y_n() */
                close_nhfile(nhfp);
                compress_bonesfile();
                g.program_state.reading_bonesfile = 0;
                return 0;
            }
        }
        Sfi(nhfp, "ancestor-nhuuid");
        c = Sfi(nhfp, "bones_count"); /* length incl. '\0' */
        if (c <= 40 /* sizeof oldbonesid */) {
            oldbonesid = Sfi(nhfp, "bonesid");
        } else {
            /* if (wizard) debugpline2("Abandoning bones , %u > %u.", ...) */
            close_nhfile(nhfp);
            compress_bonesfile();
            /* ToDo: maybe unlink these problematic bones? */
            g.program_state.reading_bonesfile = 0;
            return 0;
        }
        if (bonesid !== oldbonesid) {
            const errbuf = `This is bones level '${oldbonesid}', not '${bonesid}'!`;

            if (wizard) {
                await pline(errbuf);
                ok = false; /* won't die of trickery */
            }
            g.program_state.reading_bonesfile = 0;
            await trickery(errbuf);
        } else {
            await getlev(nhfp, 0, 0);

            /* Note that getlev() now keeps tabs on unique
             * monsters such as demon lords, and tracks the
             * birth counts of all species just as makemon()
             * does.  If a bones monster is extinct or has been
             * subject to genocide, their mhpmax will be
             * set to the magic DEFUNCT_MONSTER cookie value.
             */
            for (let mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
                if (mtmp.mgivenname) /* has_mgivenname() */
                    mtmp.mgivenname = sanitize_name(mtmp.mgivenname);
                if (mtmp.mhpmax === DEFUNCT_MONSTER) {
                    /* if (wizard) debugpline1("Removing defunct monster
                       %s from bones.", ...) */
                    mongone(mtmp);
                } else
                    /* to correctly reset named artifacts on the level */
                    resetobjs(mtmp.minvent, true);
            }
            resetobjs(g.level.objects, true);
            resetobjs(g.level.buriedobjlist, true);
            await fix_shop_damage();
        }
    }
    close_nhfile(nhfp);
    g.program_state.reading_bonesfile = 0;
    sanitize_engravings();
    g.u.uroleplay.numbones = (g.u.uroleplay.numbones || 0) + 1;

    if (wizard) {
        if (await tty_yn_function("Unlink bones?", "yn", 'n') === 'n') { /* y_n() */
            compress_bonesfile();
            return ok ? 1 : 0;
        }
    }
    if (!delete_bonesfile(g.u.uz)) {
        /* When N games try to simultaneously restore the same
         * bones file, N-1 of them will fail to delete it
         * (the first N-1 under AmigaDOS, the last N-1 under UNIX).
         * So no point in a mysterious message for a normal event
         * -- just generate a new level for those N-1 games.
         */
        /* pline("Cannot unlink bones."); */
        return 0;
    }
    return ok ? 1 : 0;
}

// C ref: bones.c bones_include_name()
/* check whether current level contains bones from a particular player */
export function bones_include_name(name) {
    /* prepare buffer by appending terminal hyphen to name, to avoid partial
     * matches producing false positives */
    const buf = `${name}-`;

    for (let bp = game.level.bonesinfo; bp; bp = bp.next) {
        if (bp.who.startsWith(buf))
            return true;
    }

    return false;
}

// C ref: bones.c set_ghostly_objlist()
/* set the ghostly bit in a list of objects */
function set_ghostly_objlist(objchain) {
    for (const o of chain_members(objchain))
        o.ghostly = 1;
}

// C ref: bones.c fix_ghostly_obj()
/* This is called when a marked object from a bones file is picked-up.
   Some could result in a message, and the obj->ghostly flag is always
   cleared. obj->ghostly has no other usage at this time. */
export async function fix_ghostly_obj(obj) {
    if (!obj.ghostly)
        return;
    switch (obj.otyp) {
    /* asymmetrical weapons */
    case O.BOW:
    case O.ELVEN_BOW:
    case O.ORCISH_BOW:
    case O.YUMI:
    case O.BOOMERANG:
        await You(`make adjustments to ${the(xname(obj))} to suit your ${
                  !game.u.uhandedness /* URIGHTY */ ? "right" : "left"} hand.`);
        break;
    default:
        break;
    }
    obj.ghostly = 0;
}

// C ref: bones.c newebones()
export function newebones(mtmp) {
    if (!mtmp.mextra)
        mtmp.mextra = {}; /* newmextra() */
    if (!mtmp.mextra.ebones) {
        mtmp.mextra.ebones = {
            parentmid: mtmp.m_id, role: 0, race: 0, oldalign: null,
            deathlevel: 0, luck: 0, mnum: 0, female: 0, demigod: 0,
            crowned: 0,
        };
    }
}

// C ref: bones.c free_ebones()
/* this is not currently used */
export function free_ebones(mtmp) {
    if (mtmp.mextra && mtmp.mextra.ebones)
        mtmp.mextra.ebones = null;
}

