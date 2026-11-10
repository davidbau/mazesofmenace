/* NetHack 5.0	topten.c	$NHDT-Date: 1606009004 2020/11/22 01:36:44 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.74 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2012. */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from './c-runtime.js';


/* We don't want to rewrite the whole file, because that entails
   creating a new version which requires that the old one be deletable.
   [Write and Delete are separate permissions on VMS.  'record' should
   be writable but not deletable there.]  */

/*
 * Updating in place can leave junk at the end of the file in some
 * circumstances (if it shrinks and the OS doesn't have a straightforward
 * way to truncate it).  The trailing junk is harmless and the code
 * which reads the scores will ignore it.
 */
/* [note: do not move this to the 'g' struct] */



const newttentry = () => C.entry(C.alloc(C.entrySize));
const dealloc_ttentry = ttent => C.free(ttent);
/* Changing NAMSZ can break your existing record/logfile */
const NAMSZ = 10;
const DTHSZ = 100;
const ROLESZ = 3;



/* size big enough to read in all the string fields at once; includes
   room for separating space or trailing newline plus string terminator */
const SCANBUFSZ = (4 * (ROLESZ + 1) + (NAMSZ + 1) + (DTHSZ + 1) + 1);





















/* "killed by",&c ["an"] 'svk.killer.name' */
export function formatkiller(buf, siz, how, incl_helpless)

{
    const killed_by_prefix = [
        /* DIED, CHOKING, POISONING, STARVING, */
        "killed by ", "choked on ", "poisoned by ", "died of ",
        /* DROWNING, BURNING, DISSOLVED, CRUSHING, */
        "drowned in ", "burned by ", "dissolved in ", "crushed to death by ",
        /* STONING, TURNED_SLIME, GENOCIDED, */
        "petrified by ", "turned to slime by ", "killed by ",
        /* PANICKED, TRICKED, QUIT, ESCAPED, ASCENDED */
        "", "", "", "", ""
    ];
    let l;
    let c, kname = C.svk.killer.name;

    C.storeChar(buf + (0), 0); /* lint suppression */
    switch (C.svk.killer.format) {
    default:
        C.impossible("bad killer format? (%d)", C.svk.killer.format);

        /*FALLTHRU*/
    case C.NO_KILLER_PREFIX:
        break;
    case C.KILLED_BY_AN:
        kname = C.an(kname);

        /*FALLTHRU*/
    case C.KILLED_BY:
        C.strncat(buf, killed_by_prefix[how], siz - 1);
        l = C.Strlen(buf, 123, "formatkiller");
        buf += l, siz = (siz - l) >>> 0;
        break;
    }
    /* Copy kname into buf[].
     * Object names and named fruit have already been sanitized, but
     * monsters can have "called 'arbitrary text'" attached to them,
     * so make sure that that text can't confuse field splitting when
     * record, logfile, or xlogfile is re-read at some later point.
     */
    while ((siz = (siz - 1) >>> 0) > 0) {
        c = C.loadChar(kname++);
        if (!c)
            break;
        else if (c == 44)
            c = 59;
        /* 'xlogfile' doesn't really need protection for '=', but
           fixrecord.awk for corrupted 3.6.0 'record' does (only
           if using xlogfile rather than logfile to repair record) */
        else if (c == 61)
            c = 95;
        /* tab is not possible due to use of mungspaces() when naming;
           it would disrupt xlogfile parsing if it were present */
        else if (c == 9)
            c = 32;
        C.storeChar(buf++, c);
    }
    C.storeChar(buf, 0);

    if (incl_helpless && C.gm.multi < 0) {
        /* X <= siz: 'sizeof "string"' includes 1 for '\0' terminator */
        if (C.gm.multi_reason
            && C.strlen(C.gm.multi_reason) + 9 <= siz)
            C.Sprintf(buf, ", while %s", C.gm.multi_reason);
        /* either gm.multi_reason wasn't specified or wouldn't fit */
        else if (17 <= siz)
            C.Strcpy(buf, ", while helpless");
        /* else extra death info won't fit, so leave it out */
    }
}

export function topten_print(x)

{
    if (C.gt.toptenwin == C.WIN_ERR)
        C.raw_print(x);
    else
        C.putstr(C.gt.toptenwin, C.ATR_NONE, x);
}

export function topten_print_bold(x)

{
    if (C.gt.toptenwin == C.WIN_ERR)
        C.raw_print_bold(x);
    else
        C.putstr(C.gt.toptenwin, C.ATR_BOLD, x);
}

export function observable_depth(lev)

{
/* if we ever randomize the order of the elemental planes, we
       must use a constant external representation in the record file */
/* ? */
    return C.depth(lev);
}

/* throw away characters until current record has been entirely consumed */
export function discardexcess(rfile)

{
    let c;

    do {
        c = C.fgetc(rfile);
    } while (c != 10 && c != C.EOF);
}


export function readentry(rfile, tt)

{
    let inbuf = C.charLocal(SCANBUFSZ), s1 = C.charLocal(SCANBUFSZ), s2 = C.charLocal(SCANBUFSZ), s3 = C.charLocal(SCANBUFSZ),
         s4 = C.charLocal(SCANBUFSZ), s5 = C.charLocal(SCANBUFSZ), s6 = C.charLocal(SCANBUFSZ);

/* Version_ Pts DgnLevs_ Hp___ Died__Born id */
    const fmt = "%d.%d.%d %ld %d %d %d %d %d %d %ld %ld %d ";
    const fmt32 = "%c%c %[^,],%[^\n]%*c";
    const fmt33 = "%s %s %s %s %[^,],%[^\n]%*c";

/* note: input below must read the record's terminating newline */
const TTFIELDS = 13;
    if (C.fscanf(rfile, fmt, C.entryField(tt, "ver_major"), C.entryField(tt, "ver_minor"), C.entryField(tt, "patchlevel"),
               C.entryField(tt, "points"), C.entryField(tt, "deathdnum"), C.entryField(tt, "deathlev"), C.entryField(tt, "maxlvl"),
               C.entryField(tt, "hp"), C.entryField(tt, "maxhp"), C.entryField(tt, "deaths"), C.entryField(tt, "deathdate"),
               C.entryField(tt, "birthdate"), C.entryField(tt, "uid")) != TTFIELDS) {

        tt.points = 0;
        discardexcess(rfile);
    } else {
        /* load remainder of record into a local buffer;
           this imposes an implicit length limit of SCANBUFSZ
           on every string field extracted from the buffer */
        if (!C.fgets(inbuf, SCANBUFSZ, rfile)) {
            /* sscanf will fail and tt->points will be set to 0 */
            C.storeChar(inbuf, 0);
        } else if (!C.strchr(inbuf, 10)) {
            C.Strcpy(inbuf + SCANBUFSZ - 2, "\n");
            discardexcess(rfile);
        }
        /* Check for backwards compatibility */
        if (tt.ver_major < 3 || (tt.ver_major == 3 && tt.ver_minor < 3)) {
            let i;

            if (C.sscanf(inbuf, fmt32, tt.plrole, tt.plgend, s1, s2) == 4) {
                tt.plrole[1] = tt.plgend[1] = 0; /* read via %c */
                C.copynchars(tt.name, s1, (NAMSZ + 1) - 1);
                C.copynchars(tt.death, s2, (DTHSZ + 1) - 1);
            } else
                tt.points = 0;
            tt.plrole[1] = 0;
            if ((i = C.str2role(tt.plrole)) >= 0)
                C.Strcpy(tt.plrole, C.roles[i].filecode);
            C.Strcpy(tt.plrace, "?");
            C.Strcpy(tt.plgend, (tt.plgend[0] == 77) ? "Mal" : "Fem");
            C.Strcpy(tt.plalign, "?");
        } else if (C.sscanf(inbuf, fmt33, s1, s2, s3, s4, s5, s6) == 6) {
            C.copynchars(tt.plrole, s1, (ROLESZ + 1) - 1);
            C.copynchars(tt.plrace, s2, (ROLESZ + 1) - 1);
            C.copynchars(tt.plgend, s3, (ROLESZ + 1) - 1);
            C.copynchars(tt.plalign, s4, (ROLESZ + 1) - 1);
            C.copynchars(tt.name, s5, (NAMSZ + 1) - 1);
            C.copynchars(tt.death, s6, (DTHSZ + 1) - 1);
        } else
            tt.points = 0;
    }

    /* check old score entries for Y2K problem and fix whenever found */
    if (tt.points > 0) {
        if (tt.birthdate < 19000000n)
            tt.birthdate += 19000000n;
        if (tt.deathdate < 19000000n)
            tt.deathdate += 19000000n;
    }
}

export function writeentry(rfile, tt)

{
    const fmt32 = "%c%c ";        /* role,gender */
    const fmt33 = "%s %s %s %s "; /* role,race,gndr,algn */
    const fmt0 = "%d.%d.%d %ld %d %d %d %d %d %d %ld %ld %d ";
    const fmtX = "%s,%s\n";
/* NO_SCAN_BRACK */

    C.fprintf(rfile, fmt0, tt.ver_major, tt.ver_minor, tt.patchlevel,
                   tt.points, tt.deathdnum, tt.deathlev, tt.maxlvl,
                   tt.hp, tt.maxhp, tt.deaths, tt.deathdate,
                   tt.birthdate, tt.uid);
    if (tt.ver_major < 3 || (tt.ver_major == 3 && tt.ver_minor < 3))
        C.fprintf(rfile, fmt32, tt.plrole[0], tt.plgend[0]);
    else
        C.fprintf(rfile, fmt33, tt.plrole, tt.plrace, tt.plgend,
                       tt.plalign);
    C.fprintf(rfile, fmtX, C.onlyspace(tt.name) ? "_" : tt.name,
                   tt.death);

}


/* as tab is never used in eg. svp.plname or death, no need to mangle those. */
export function writexlentry(rfile, tt, how)

{

const XLOG_SEP = 9; /* xlogfile field separator. */
    let buf = C.charLocal(C.BUFSZ), tmpbuf = C.charLocal(DTHSZ + 1);
    let achbuf = C.charLocal(C.N_ACH * 40);

    C.Sprintf(buf, "version=%d.%d.%d", tt.ver_major, tt.ver_minor,
            tt.patchlevel);
    C.Sprintf(C.eos(buf), "%cpoints=%ld%cdeathdnum=%d%cdeathlev=%d", XLOG_SEP,
            tt.points, XLOG_SEP, tt.deathdnum, XLOG_SEP, tt.deathlev);
    C.Sprintf(C.eos(buf), "%cmaxlvl=%d%chp=%d%cmaxhp=%d", XLOG_SEP, tt.maxlvl,
            XLOG_SEP, tt.hp, XLOG_SEP, tt.maxhp);
    C.Sprintf(C.eos(buf), "%cdeaths=%d%cdeathdate=%ld%cbirthdate=%ld%cuid=%d",
            XLOG_SEP, tt.deaths, XLOG_SEP, tt.deathdate, XLOG_SEP,
            tt.birthdate, XLOG_SEP, tt.uid);
    C.fprintf(rfile, "%s", buf);
    C.Sprintf(buf, "%crole=%s%crace=%s%cgender=%s%calign=%s", XLOG_SEP,
            tt.plrole, XLOG_SEP, tt.plrace, XLOG_SEP, tt.plgend, XLOG_SEP,
            tt.plalign);
    /* make a copy of death reason that doesn't include ", while helpless" */
    formatkiller(tmpbuf, DTHSZ + 1, how, C.FALSE);
    C.fprintf(rfile, "%s%cname=%s%cdeath=%s",
            buf, /* (already includes separator) */
            XLOG_SEP, C.svp.plname, XLOG_SEP, tmpbuf);
    if (C.gm.multi < 0)
        C.fprintf(rfile, "%cwhile=%s", XLOG_SEP,
                C.gm.multi_reason ? C.gm.multi_reason : "helpless");
    C.fprintf(rfile, "%cconduct=0x%lx%cturns=%ld%cachieve=0x%lx", XLOG_SEP,
            encodeconduct(), XLOG_SEP, C.svm.moves, XLOG_SEP,
            encodeachieve(C.FALSE));
    C.fprintf(rfile, "%cachieveX=%s", XLOG_SEP,
            C.callLocal(encode_extended_achievements, achbuf));
    C.fprintf(rfile, "%cconductX=%s", XLOG_SEP,
            encode_extended_conducts(buf)); /* reuse 'buf[]' */
    C.fprintf(rfile, "%crealtime=%ld%cstarttime=%ld%cendtime=%ld", XLOG_SEP,
            C.urealtime.realtime, XLOG_SEP,
            C.timet_to_seconds(C.ubirthday), XLOG_SEP,
            C.timet_to_seconds(C.urealtime.finish_time));
    C.fprintf(rfile, "%cgender0=%s%calign0=%s", XLOG_SEP,
            C.genders[C.flags.initgend].filecode, XLOG_SEP,
            C.aligns[1 - C.u.ualignbase[C.A_ORIGINAL]].filecode);
    C.fprintf(rfile, "%cflags=0x%lx", XLOG_SEP, encodexlogflags());
    C.fprintf(rfile, "%cgold=%ld", XLOG_SEP,
            C.money_cnt(C.gi.invent) + C.hidden_gold(C.TRUE));
    C.fprintf(rfile, "%cwish_cnt=%ld", XLOG_SEP, C.u.uconduct.wishes);
    C.fprintf(rfile, "%carti_wish_cnt=%ld", XLOG_SEP, C.u.uconduct.wisharti);
    C.fprintf(rfile, "%cbones=%ld", XLOG_SEP, C.u.uroleplay.numbones);
    C.fprintf(rfile, "%crerolls=%ld", XLOG_SEP, C.u.uroleplay.numrerolls);
    C.fprintf(rfile, "\n");

}

export function encodexlogflags()

{
    let e = 0n;

    if (C.wizard)
        e |= 1n << BigInt(0);
    if (C.discover)
        e |= 1n << BigInt(1);
    if (!C.u.uroleplay.numbones)
        e |= 1n << BigInt(2);
    if (C.u.uroleplay.reroll)
        e |= 1n << BigInt(3);

    return e;
}

export function encodeconduct()

{
    let e = 0n;

    if (!C.u.uconduct.food)
        e |= 1n << BigInt(0);
    if (!C.u.uconduct.unvegan)
        e |= 1n << BigInt(1);
    if (!C.u.uconduct.unvegetarian)
        e |= 1n << BigInt(2);
    if (!C.u.uconduct.gnostic)
        e |= 1n << BigInt(3);
    if (!C.u.uconduct.weaphit)
        e |= 1n << BigInt(4);
    if (!C.u.uconduct.killer)
        e |= 1n << BigInt(5);
    if (!C.u.uconduct.literate)
        e |= 1n << BigInt(6);
    if (!C.u.uconduct.polypiles)
        e |= 1n << BigInt(7);
    if (!C.u.uconduct.polyselfs)
        e |= 1n << BigInt(8);
    if (!C.u.uconduct.wishes)
        e |= 1n << BigInt(9);
    if (!C.u.uconduct.wisharti)
        e |= 1n << BigInt(10);
    if (!C.num_genocides())
        e |= 1n << BigInt(11);
    /* one bit isn't really adequate for sokoban conduct:
       reporting "obeyed sokoban rules" is misleading if sokoban wasn't
       completed or at least attempted; however, suppressing that when
       sokoban was never entered, as we do here, risks reporting
       "violated sokoban rules" when no such thing occurred; this can
       be disambiguated in xlogfile post-processors by testing the
       entered-sokoban bit in the 'achieve' field */
    if (!C.u.uconduct.sokocheat && C.sokoban_in_play())
        e |= 1n << BigInt(12);
    if (!C.u.uconduct.pets)
        e |= 1n << BigInt(13);

    return e;
}

export function encodeachieve(secondlong) /* False: handle achievements 1..31, True: 32..62 */
{
    let i, achidx, offset;
    let r = 0n;

    /*
     * 32: portable limit for 'long'.
     * Force 32 even on configurations that are using 64 bit longs.
     *
     * We use signed long and limit ourselves to 31 bits since tools
     * that post-process xlogfile might not be able to cope with
     * 'unsigned long'.
     */
    offset = secondlong ? (32 - 1) : 0;
    for (i = 0; C.u.uachieved[i]; ++i) {
        achidx = C.u.uachieved[i] - offset;
        if (achidx > 0 && achidx < 32) /* value 1..31 sets bit 0..30 */
            r |= 1n << BigInt(achidx - 1);
    }
    return r;
}

/* add the achievement or conduct comma-separated to string */
export function add_achieveX(buf, achievement, condition)

{
    if (condition) {
        if (C.loadChar(buf) != 0) {
            C.Strcat(buf, ",");
        }
        C.Strcat(buf, achievement);
    }
}

export function encode_extended_achievements(buf)

{
    let rnkbuf = C.charLocal(40);
    let achievement = 0;
    let i, achidx, absidx;

    C.storeChar(buf + (0), 0);
    for (i = 0; C.u.uachieved[i]; i++) {
        achidx = C.u.uachieved[i];
        absidx = C.abs(achidx);
        switch (absidx) {
        case C.ACH_UWIN:
            achievement = "ascended";
            break;
        case C.ACH_ASTR:
            achievement = "entered_astral_plane";
            break;
        case C.ACH_ENDG:
            achievement = "entered_elemental_planes";
            break;
        case C.ACH_AMUL:
            achievement = "obtained_the_amulet_of_yendor";
            break;
        case C.ACH_INVK:
            achievement = "performed_the_invocation_ritual";
            break;
        case C.ACH_BOOK:
            achievement = "obtained_the_book_of_the_dead";
            break;
        case C.ACH_BELL:
            achievement = "obtained_the_bell_of_opening";
            break;
        case C.ACH_CNDL:
            achievement = "obtained_the_candelabrum_of_invocation";
            break;
        case C.ACH_HELL:
            achievement = "entered_gehennom";
            break;
        case C.ACH_MEDU:
            achievement = "defeated_medusa";
            break;
        case C.ACH_MINE_PRIZE:
            achievement = "obtained_the_luckstone_from_the_mines";
            break;
        case C.ACH_SOKO_PRIZE:
            achievement = "obtained_the_sokoban_prize";
            break;
        case C.ACH_ORCL:
            achievement = "consulted_the_oracle";
            break;
        case C.ACH_NOVL:
            achievement = "read_a_discworld_novel";
            break;
        case C.ACH_MINE:
            achievement = "entered_the_gnomish_mines";
            break;
        case C.ACH_TOWN:
            achievement = "entered_mine_town";
            break;
        case C.ACH_SHOP:
            achievement = "entered_a_shop";
            break;
        case C.ACH_TMPL:
            achievement = "entered_a_temple";
            break;
        case C.ACH_SOKO:
            achievement = "entered_sokoban";
            break;
        case C.ACH_BGRM:
            achievement = "entered_bigroom";
            break;
        case C.ACH_TUNE:
            achievement = "learned_castle_drawbridge_tune";
            break;
        /* rank 0 is the starting condition, not an achievement; 8 is Xp 30 */
        case C.ACH_RNK1: case C.ACH_RNK2: case C.ACH_RNK3: case C.ACH_RNK4:
        case C.ACH_RNK5: case C.ACH_RNK6: case C.ACH_RNK7: case C.ACH_RNK8:
            C.Sprintf(rnkbuf, "attained_the_rank_of_%s",
                    C.rank_of(C.rank_to_xlev(absidx - (C.ACH_RNK1 - 1)),
                            C.Role_switch, (achidx < 0) ? C.TRUE : C.FALSE));
            C.strNsubst(rnkbuf, " ", "_", 0); /* replace every ' ' with '_' */
            achievement = C.lcase(rnkbuf);
            break;
        default:
            continue;
        }
        add_achieveX(buf, achievement, C.TRUE);
    }

    return buf;
}

export function encode_extended_conducts(buf)

{
    C.storeChar(buf + (0), 0);
    add_achieveX(buf, "foodless",     !C.u.uconduct.food);
    add_achieveX(buf, "vegan",        !C.u.uconduct.unvegan);
    add_achieveX(buf, "vegetarian",   !C.u.uconduct.unvegetarian);
    add_achieveX(buf, "atheist",      !C.u.uconduct.gnostic);
    add_achieveX(buf, "weaponless",   !C.u.uconduct.weaphit);
    add_achieveX(buf, "pacifist",     !C.u.uconduct.killer);
    add_achieveX(buf, "illiterate",   !C.u.uconduct.literate);
    add_achieveX(buf, "polyless",     !C.u.uconduct.polypiles);
    add_achieveX(buf, "polyselfless", !C.u.uconduct.polyselfs);
    add_achieveX(buf, "wishless",     !C.u.uconduct.wishes);
    add_achieveX(buf, "artiwishless", !C.u.uconduct.wisharti);
    add_achieveX(buf, "genocideless", !C.num_genocides());
    if (C.sokoban_in_play())
        add_achieveX(buf, "sokoban",  !C.u.uconduct.sokocheat);
    add_achieveX(buf, "blind",        C.u.uroleplay.blind);
    add_achieveX(buf, "deaf",         C.u.uroleplay.deaf);
    add_achieveX(buf, "nudist",       C.u.uroleplay.nudist);
    add_achieveX(buf, "pauper",       C.u.uroleplay.pauper);
    add_achieveX(buf, "bonesless",    !C.flags.bones);
    add_achieveX(buf, "petless",      !C.u.uconduct.pets);
    add_achieveX(buf, "unrerolled",   !C.u.uroleplay.reroll);

    return buf;
}

/* XLOGFILE */

export function free_ttlist(tt)

{
    let ttnext;

    while (tt.points > 0) {
        ttnext = tt.tt_next;
        dealloc_ttentry(tt);
        tt = ttnext;
    }
    dealloc_ttentry(tt);
}

export function topten(how, when)

{
    let t0, tprev;
    let t1;
    let rfile;
    let lfile;
    let xlfile;
    let uid = C.int(C.getuid());
    let rank, rank0 = -1, rank1 = 0;
    let occ_cnt = C.sysopt.persmax;
    let flg = 0;
    let t0_used, skip_scores;

    /* If we are in the midst of a panic, cut out topten entirely.
     * topten uses alloc() several times, which will lead to
     * problems if the panic was the result of an alloc() failure.
     */
    if (C.program_state.panicking)
        return;

    if (C.iflags.toptenwin) {
        C.gt.toptenwin = C.create_nhwindow(C.NHW_TEXT);
    }



/* make sure the screen is black on white */
    /* create a new 'topten' entry */
    t0_used = C.FALSE;
    t0 = newttentry();
    C.copyEntry(t0, C.zeroEntry);
    t0.ver_major = C.VERSION_MAJOR;
    t0.ver_minor = C.VERSION_MINOR;
    t0.patchlevel = C.PATCHLEVEL;
    t0.points = C.u.urexp;
    t0.deathdnum = C.u.uz.dnum;
    /* deepest_lev_reached() is in terms of depth(), and reporting the
     * deepest level reached in the dungeon death occurred in doesn't
     * seem right, so we have to report the death level in depth() terms
     * as well (which also seems reasonable since that's all the player
     * sees on the screen anyway)
     */
    t0.deathlev = observable_depth(C.u.uz);
    t0.maxlvl = C.deepest_lev_reached(C.TRUE);
    t0.hp = C.u.uhp;
    t0.maxhp = C.u.uhpmax;
    t0.deaths = C.u.umortality;
    t0.uid = uid;
    C.copynchars(t0.plrole, C.gu.urole.filecode, ROLESZ);
    C.copynchars(t0.plrace, C.gu.urace.filecode, ROLESZ);
    C.copynchars(t0.plgend, C.genders[C.flags.female].filecode, ROLESZ);
    C.copynchars(t0.plalign, C.aligns[1 - C.u.ualign.type].filecode, ROLESZ);
    C.copynchars(t0.name, C.svp.plname, NAMSZ);
    formatkiller(t0.death, DTHSZ + 1, how, C.TRUE);
    t0.birthdate = C.yyyymmdd(C.ubirthday);
    t0.deathdate = C.yyyymmdd(when);
    t0.tt_next = 0;

/* used for debugging (who dies of what, where) */
    if (C.lock_file(C.LOGFILE, C.SCOREPREFIX, 10)) {
        if (!(lfile = C.fopen_datafile(C.LOGFILE, "a", C.SCOREPREFIX))) {
            if (!C.program_state.done_hup) C.raw_print("Cannot open log file!");
        } else {
            writeentry(lfile, t0);
            C.fclose(lfile);
        }
        C.unlock_file(C.LOGFILE);
    }
/* LOGFILE */
    if (C.lock_file(C.XLOGFILE, C.SCOREPREFIX, 10)) {
        if (!(xlfile = C.fopen_datafile(C.XLOGFILE, "a", C.SCOREPREFIX))) {
            if (!C.program_state.done_hup) C.raw_print("Cannot open extended log file!");
        } else {
            C.callLocal(writexlentry, xlfile, t0, how);
            C.fclose(xlfile);
        }
        C.unlock_file(C.XLOGFILE);
    }
/* XLOGFILE */

    destroywin: {
    showwin: {
    if (C.wizard || C.discover) {
        if (how != C.PANICKED)
            if (!C.program_state.done_hup) {
                const automatic_scope = C.stackSave();
                try {
                let pbuf = C.charLocal(C.BUFSZ);

                topten_print("");
                C.Sprintf(pbuf,
             "Since you were in %s mode, the score list will not be checked.",
                        C.wizard ? "wizard" : "discover");
                topten_print(pbuf);
            } finally { C.stackRestore(automatic_scope); }
            }
        break showwin;
    }

    if (!C.lock_file(C.RECORD, C.SCOREPREFIX, 60))
        break destroywin;

    rfile = C.fopen_datafile(C.RECORD, "r", C.SCOREPREFIX);

    if (!rfile) {
        if (!C.program_state.done_hup) C.raw_print("Cannot open record file!");
        C.unlock_file(C.RECORD);
        break destroywin;
    }

    if (!C.program_state.done_hup) topten_print("");

    /* assure minimum number of points */
    if (t0.points < C.sysopt.pointsmin)
        t0.points = 0;

    t1 = C.tt_head = newttentry();
    tprev = 0;
    /* rank0: -1 undefined, 0 not_on_list, n n_th on list */
    for (rank = 1; ; ) {
        C.callLocal(readentry, rfile, t1);
        if (t1.points < C.sysopt.pointsmin)
            t1.points = 0;
        if (rank0 < 0 && t1.points < t0.points) {
            rank0 = rank++;
            if (tprev == 0)
                C.tt_head = t0;
            else
                tprev.tt_next = t0;
            t0.tt_next = t1;
/* insert here */
            t0_used = C.TRUE;
            occ_cnt--;
            flg++; /* ask for a rewrite */
        } else
            tprev = t1;

        if (t1.points == 0)
            break;
        if ((C.sysopt.pers_is_uid ? t1.uid == t0.uid
                                : C.strncmp(t1.name, t0.name, NAMSZ) == 0)
            && !C.strncmp(t1.plrole, t0.plrole, ROLESZ) && --occ_cnt <= 0) {
            if (rank0 < 0) {
                rank0 = 0;
                rank1 = rank;
                if (!C.program_state.done_hup) {
                    const automatic_scope = C.stackSave();
                try {
                let pbuf = C.charLocal(C.BUFSZ);

                    C.Sprintf(pbuf,
                         "You didn't beat your previous score of %ld points.",
                            t1.points);
                    topten_print(pbuf);
                    topten_print("");
                } finally { C.stackRestore(automatic_scope); }
            }
            }
            if (occ_cnt < 0) {
                flg++;
                continue;
            }
        }
        if (rank <= C.sysopt.entrymax) {
            t1.tt_next = newttentry();
            t1 = t1.tt_next;
            rank++;
        }
        if (rank > C.sysopt.entrymax) {
            t1.points = 0;
            break;
        }
    }
    if (flg) { /* rewrite record file */
        C.fclose(rfile);
        if (!(rfile = C.fopen_datafile(C.RECORD, "w", C.SCOREPREFIX))) {
            if (!C.program_state.done_hup) C.raw_print("Cannot write record file");
            C.unlock_file(C.RECORD);
            free_ttlist(C.tt_head);
            break destroywin;
        }
/* UPDATE_RECORD_IN_PLACE */
        if (!C.program_state.stopprint)
            if (rank0 > 0) {
                if (rank0 <= 10) {
                    topten_print("You made the top ten list!");
                } else {
                    const automatic_scope = C.stackSave();
                try {
                let pbuf = C.charLocal(C.BUFSZ);

                    C.Sprintf(pbuf,
                            "You reached the %d%s place on the top %d list.",
                            rank0, C.ordin(rank0), C.sysopt.entrymax);
                    topten_print(pbuf);
                } finally { C.stackRestore(automatic_scope); }
            }
                topten_print("");
            }
    }
    skip_scores = !C.flags.end_top && !C.flags.end_around && !C.flags.end_own;
    if (rank0 == 0)
        rank0 = rank1;
    if (rank0 <= 0)
        rank0 = rank;
    if (!skip_scores && !C.program_state.stopprint)
        C.callLocal(outheader);
    for (t1 = C.tt_head, rank = 1; t1.points != 0; t1 = t1.tt_next, ++rank) {
        if (flg
            )
            writeentry(rfile, t1);
        if (skip_scores || C.program_state.stopprint)
            continue;
        if (rank <= C.flags.end_top
            || (rank >= rank0 - C.flags.end_around
                && rank <= rank0 + C.flags.end_around)
            || (C.flags.end_own && (C.sysopt.pers_is_uid
                                  ? t1.uid == t0.uid
                                  : !C.strncmp(t1.name, t0.name, NAMSZ)))) {
            if (rank == rank0 - C.flags.end_around
                && rank0 > C.flags.end_top + C.flags.end_around + 1
                && !C.flags.end_own)
                topten_print("");

            if (rank != rank0) {
                C.callLocal(outentry, rank, t1, C.FALSE);
            } else if (!rank1) {
                C.callLocal(outentry, rank, t1, C.TRUE);
            } else {
                C.callLocal(outentry, rank, t1, C.TRUE);
                C.callLocal(outentry, 0, t0, C.TRUE);
            }
        }
    }
    if (rank0 >= rank)
        if (!skip_scores && !C.program_state.stopprint)
            C.callLocal(outentry, 0, t0, C.TRUE);
/* if a reasonable way to truncate a file exists, use it */
/* use sentinel record rather than relying on truncation */
/* [redundant] terminates file when read back in */
/* end of data */
/* note: there might be junk (if file has shrunk due to shorter
           entries supplanting longer ones) after this dummy entry, but
           reading and/or updating will ignore it */
/* TRUNCATE_FILE */
/* UPDATE_RECORD_IN_PLACE */
    C.fclose(rfile);
    C.unlock_file(C.RECORD);
    free_ttlist(C.tt_head);

    }
    if (!C.program_state.stopprint) {
        if (C.iflags.toptenwin) {
            C.display_nhwindow(C.gt.toptenwin, C.TRUE);
        } else {
            /* when not a window, we need something comparable to more()
               but can't use it directly because we aren't dealing with
               the message window */
            ;
        }
    }
    }
    if (!t0_used)
        dealloc_ttentry(t0);
    if (C.iflags.toptenwin) {
        C.destroy_nhwindow(C.gt.toptenwin);
        C.gt.toptenwin = C.WIN_ERR;
    }
}

export function outheader()

{
    let linebuf = C.charLocal(C.BUFSZ);
    let bp;

    C.Strcpy(linebuf, " No  Points     Name");
    bp = C.eos(linebuf);
    while (bp < linebuf + C.COLNO - 9)
        C.storeChar(bp++, 32);
    C.Strcpy(bp, "Hp [max]");
    topten_print(linebuf);
}


/* so>0: standout line; so=0: ordinary line */
export function outentry(rank, t1, so)

{
    let second_line = C.TRUE;
    let linebuf = C.charLocal(C.BUFSZ);
    let bp, hpbuf = C.charLocal(24), linebuf3 = C.charLocal(C.BUFSZ);
    let hppos, lngr;

    C.storeChar(linebuf + (0), 0);
    if (rank)
        C.Sprintf(C.eos(linebuf), "%3d", rank);
    else
        C.Strcat(linebuf, "   ");

    C.Sprintf(C.eos(linebuf), " %10ld  %.10s", t1.points ? t1.points : C.u.urexp,
            t1.name);
    C.Sprintf(C.eos(linebuf), "-%s", t1.plrole);
    if (t1.plrace[0] != 63)
        C.Sprintf(C.eos(linebuf), "-%s", t1.plrace);
    /* Printing of gender and alignment is intentional.  It has been
     * part of the NetHack Geek Code, and illustrates a proper way to
     * specify a character from the command line.
     */
    C.Sprintf(C.eos(linebuf), "-%s", t1.plgend);
    if (t1.plalign[0] != 63)
        C.Sprintf(C.eos(linebuf), "-%s ", t1.plalign);
    else
        C.Strcat(linebuf, " ");
    if (!C.strncmp("escaped", t1.death, 7)) {
        C.Sprintf(C.eos(linebuf), "escaped the dungeon %s[max level %d]",
                !C.strncmp(" (", t1.death + 7, 2) ? t1.death + 7 + 2 : "",
                t1.maxlvl);
        /* fixup for closing paren in "escaped... with...Amulet)[max..." */
        if ((bp = C.strchr(linebuf, 41)) != 0)
            C.storeChar(bp, (t1.deathdnum == C.astral_level.dnum) ? 0 : 32);
        second_line = C.FALSE;
    } else if (!C.strncmp("ascended", t1.death, 8)) {
        C.Sprintf(C.eos(linebuf), "ascended to demigod%s-hood",
                (t1.plgend[0] == 70) ? "dess" : "");
        second_line = C.FALSE;
    } else {
        if (!C.strncmp(t1.death, "quit", 4)) {
            C.Strcat(linebuf, "quit");
            second_line = C.FALSE;
        } else if (!C.strncmp(t1.death, "died of st", 10)) {
            C.Strcat(linebuf, "starved to death");
            second_line = C.FALSE;
        } else if (!C.strncmp(t1.death, "choked", 6)) {
            C.Sprintf(C.eos(linebuf), "choked on h%s food",
                    (t1.plgend[0] == 70) ? "er" : "is");
        } else if (!C.strncmp(t1.death, "poisoned", 8)) {
            C.Strcat(linebuf, "was poisoned");
        } else if (!C.strncmp(t1.death, "crushed", 7)) {
            C.Strcat(linebuf, "was crushed to death");
        } else if (!C.strncmp(t1.death, "petrified by ", 13)) {
            C.Strcat(linebuf, "turned to stone");
        } else
            C.Strcat(linebuf, "died");

        if (t1.deathdnum == C.astral_level.dnum) {
            let arg, fmt = " on the Plane of %s";

            switch (t1.deathlev) {
            case -5:
                fmt = " on the %s Plane";
                arg = "Astral";
                break;
            case -4:
                arg = "Water";
                break;
            case -3:
                arg = "Fire";
                break;
            case -2:
                arg = "Air";
                break;
            case -1:
                arg = "Earth";
                break;
            default:
                arg = "Void";
                break;
            }
            C.Sprintf(C.eos(linebuf), fmt, arg);
        } else {
            C.Sprintf(C.eos(linebuf), " in %s", C.svd.dungeons[t1.deathdnum].dname);
            if (t1.deathdnum != C.knox_level.dnum)
                C.Sprintf(C.eos(linebuf), " on level %d", t1.deathlev);
            if (t1.deathlev != t1.maxlvl)
                C.Sprintf(C.eos(linebuf), " [max %d]", t1.maxlvl);
        }

        /* kludge for "quit while already on Charon's boat" */
        if (!C.strncmp(t1.death, "quit ", 5))
            C.Strcat(linebuf, t1.death + 4);
    }
    C.Strcat(linebuf, ".");

    /* Quit, starved, ascended, and escaped contain no second line */
    if (second_line) {
        bp = C.eos(linebuf);
        C.Sprintf(bp, "  %c%s.", C.highc(C.loadChar(t1.death)), t1.death + 1);
        /* fix up "Killed by Mr. Asidonhopo; the shopkeeper"; that starts
           with a comma but has it changed to semi-colon to keep the comma
           out of 'record'; change it back for display */
        C.strsubst(bp, "; the ", ", the ");
    }

    lngr = C.strlen(linebuf);
    if (t1.hp <= 0)
        C.storeChar(hpbuf + (0), 45), C.storeChar(hpbuf + (1), 0);
    else
        C.Sprintf(hpbuf, "%d", t1.hp);
    /* beginning of hp column after padding (not actually padded yet) */
    hppos = C.COLNO - (11 - 1);
    while (lngr >= hppos) {
        for (bp = C.eos(linebuf); !(C.loadChar(bp) == 32 && bp - linebuf < hppos); bp--)
            ;
        /* special case: word is too long, wrap in the middle */
        if (linebuf + 15 >= bp)
            bp = linebuf + hppos - 1;
        /* special case: if about to wrap in the middle of maximum
           dungeon depth reached, wrap in front of it instead */
        if (bp > linebuf + 5 && !C.strncmp(bp - 5, " [max", 5))
            bp -= 5;
        if (C.loadChar(bp) != 32)
            C.Strcpy(linebuf3, bp);
        else
            C.Strcpy(linebuf3, bp + 1);
        C.storeChar(bp, 0);
        if (so) {
            while (bp < linebuf + (C.COLNO - 1))
                C.storeChar(bp++, 32);
            C.storeChar(bp, 0);
            topten_print_bold(linebuf);
        } else
            topten_print(linebuf);
        C.Snprintf(1082, linebuf, C.BUFSZ, "%15s %s", "", linebuf3);
        lngr = C.Strlen(linebuf, 1083, "outentry");
    }
    /* beginning of hp column not including padding */
    hppos = C.COLNO - 7 - C.strlen(hpbuf);
    bp = C.eos(linebuf);

    if (bp <= linebuf + hppos) {
        /* pad any necessary blanks to the hit point entry */
        while (bp < linebuf + hppos)
            C.storeChar(bp++, 32);
        C.Strcpy(bp, hpbuf);
        C.Sprintf(C.eos(bp), " %s[%d]",
                (t1.maxhp < 10) ? "  " : (t1.maxhp < 100) ? " " : "",
                t1.maxhp);
    }

    if (so) {
        bp = C.eos(linebuf);
        while (bp < linebuf + (C.COLNO - 1))
            C.storeChar(bp++, 32);
        C.storeChar(bp, 0);
        topten_print_bold(linebuf);
    } else
        topten_print(linebuf);
}


export function score_wanted(current_ver, rank, t1, playerct, players, uid)

{
    let arg, nxt;
    let i;

    if (current_ver && (t1.ver_major != C.VERSION_MAJOR
                        || t1.ver_minor != C.VERSION_MINOR
                        || t1.patchlevel != C.PATCHLEVEL))
        return 0;

    if (C.sysopt.pers_is_uid && !playerct && t1.uid == uid)
        return 1;

    /*
     * FIXME:
     *  This selection produces a union (OR) of criteria rather than
     *  an intersection (AND).  So
     *    nethack -s -u igor -p Cav -r Hum
     *  will list all entries for name igor regardless of role or race
     *  plus all entries for cave dwellers regardless of name or race
     *  plus all entries for humans regardless of name or role.
     *
     *  It would be more useful if it only chose human cave dwellers
     *  named igor.  That would be pretty straightforward if only one
     *  instance of each of the criteria were possible, but
     *    nethack -s -u igor -u ayn -p Cav -p Pri -r Hum -r Dwa
     *  should list human cave dwellers named igor and human cave
     *  dwellers named ayn plus dwarven cave dwellers named igor and
     *  dwarven cave dwellers named ayn plus human priest[esse]s named
     *  igor and human priest[esse]s named ayn (the combination of
     *  dwarven priest[esse]s doesn't occur but the selection can test
     *  entries without being aware of such; it just won't find any
     *  matches for that).  An extra initial pass of the command line
     *  to collect all criteria before testing any entry is needed to
     *  accomplish this.  And we might need to drop support for
     *  pre-3.3.0 entries (old elf role) depending on how the criteria
     *  matching is performed.
     *
     *  It also ought to extended to handle
     *    nethack -s -u igor-Cav-Hum
     *  Alignment and gender could be useful too but no one has ever
     *  clamored for them.  Presumably if they care they postprocess
     *  with some custom tool.
     */

    for (i = 0; i < playerct; i++) {
        arg = players[i];
        if (C.loadChar(arg + (0)) == 45 && C.loadChar(arg + (1)) == 117 && C.loadChar(arg + (2)) != 0)
            arg += 2; /* handle '-uname' */

        if (C.loadChar(arg + (0)) == 45 && C.strchr("pru", C.loadChar(arg + (1))) && !C.loadChar(arg + (2))
            && i + 1 < playerct) {
            nxt = players[i + 1];
            if ((C.loadChar(arg + (1)) == 112 && C.str2role(nxt) == C.str2role(t1.plrole))
                || (C.loadChar(arg + (1)) == 114 && C.str2race(nxt) == C.str2race(t1.plrace))
                /* handle '-u name' */
                || (C.loadChar(arg + (1)) == 117 && (!C.strcmp(nxt, "all")
                                      || !C.strncmp(t1.name, nxt, NAMSZ))))
                return 1;
            i++;
        } else if (!C.strcmp(arg, "all")
                   || !C.strncmp(t1.name, arg, NAMSZ)
                   || (C.loadChar(arg + (0)) == 45 && C.loadChar(arg + (1)) == t1.plrole[0] && !C.loadChar(arg + (2)))
                   || (C.digit(C.loadChar(arg + (0))) && rank <= C.atoi(arg)))
            return 1;
    }
    return 0;
}

/*
 * print selected parts of score list.
 * argc >= 2, with argv[0] untrustworthy (directory names, et al.),
 * and argv[1] starting with "-s".
 * caveat: some shells might allow argv elements to be arbitrarily long.
 */
export function prscore(argc, argv)

{
    let players, player0 = C.stringPointerLocal();
    let i, playerct, rank;
    let t1;
    let rfile;
    let pbuf = C.charLocal(C.BUFSZ), p;
    let ln;
    let uid = -1;
    let current_ver = C.TRUE, init_done = C.FALSE, match_found = C.FALSE;

    /* expect "-s" or "--scores"; "-s<anything> is accepted */
    ln = (argc < 2) ? 0
         : ((p = C.strchr(argv[1], 32)) != 0) ? (p - argv[1])
           : C.Strlen(argv[1], 1208, "prscore");
    if (ln < 2 || (C.strncmp(argv[1], "-s", 2)
                   && C.strcmp(argv[1], "--scores"))) {
        C.raw_printf("prscore: bad arguments (%d)", argc);
        return;
    }

    rfile = C.fopen_datafile(C.RECORD, "r", C.SCOREPREFIX);
    if (!rfile) {
        C.raw_print("Cannot open record file!");
        return;
    }


    /* If the score list isn't after a game, we never went through
     * initialization. */
    if (C.wiz1_level.dlevel == 0) {
        C.dlb_init();
        C.init_dungeons();
        init_done = C.TRUE;
    }

    /* to get here, argv[1] either starts with "-s" or is "--scores" without
       trailing stuff; for "-s<anything>" treat <anything> as separate arg */
    if (C.loadChar(argv[1] + (1)) == 45 || !C.loadChar(argv[1] + (2))) {
        argc--;
        argv = C.stringArray(C.address(argv) + C.pointerSize);
    } else { /* concatenated arg string; use up "-s" but keep argc,argv */
        argv[1] += 2;
    }
    /* -v doesn't take a version number arg; it means 'all versions present
       in the file' instead of the default of only the current version;
       unlike -s, we don't accept "-v<anything>" for non-empty <anything> */
    if (argc > 1 && !C.strcmp(argv[1], "-v")) {
        current_ver = C.FALSE;
        argc--;
        argv = C.stringArray(C.address(argv) + C.pointerSize);
    }

    if (argc <= 1) {
        if (C.sysopt.pers_is_uid) {
            uid = C.int(C.getuid());
            playerct = 0;
            players =  0;
        } else {
            player0.value = C.svp.plname;
            if (!C.loadChar(player0.value))
                player0.value = "all"; /* if no plname[], show all scores
                                  * (possibly filtered by '-v') */
            playerct = 1;
            players = C.stringArray(C.address(player0));
        }
    } else {
        playerct = --argc;
        players =  (argv = C.stringArray(C.address(argv) + C.pointerSize));
    }
    C.raw_print("");

    t1 = C.tt_head = newttentry();
    for (rank = 1; ; rank++) {
        C.callLocal(readentry, rfile, t1);
        if (t1.points == 0)
            break;
        if (!match_found
            && score_wanted(current_ver, rank, t1, playerct, players, uid))
            match_found = C.TRUE;
        t1.tt_next = newttentry();
        t1 = t1.tt_next;
    }

    C.fclose(rfile);
    if (init_done) {
        C.free_dungeons();
        C.dlb_cleanup();
    }

    if (match_found) {
        C.callLocal(outheader);
        t1 = C.tt_head;
        for (rank = 1; t1.points != 0; rank++, t1 = t1.tt_next) {
            if (score_wanted(current_ver, rank, t1, playerct, players, uid))
                C.callLocal(outentry, rank, t1, C.FALSE);
        }
    } else {
        C.Sprintf(pbuf, "Cannot find any %sentries for ",
                current_ver ? "current " : "");
        if (playerct < 1) {
            C.Strcat(pbuf, "you");
        } else {
            /* minor bug: 'nethack -s -u ziggy' will say "any of"
               even though the '-u' doesn't indicate multiple names */
            if (playerct > 1)
                C.Strcat(pbuf, "any of ");
            for (i = 0; i < playerct; i++) {
                /* accept '-u name' and '-uname' as well as just 'name'
                   so skip '-u' for the none-found feedback */
                if (!C.strncmp(players[i], "-u", 2)) {
                    if (!C.loadChar(players[i] + (2)))
                        continue;
                    players[i] += 2;
                }
                /* stop printing players if there are too many to fit */
                if (C.strlen(pbuf) + C.strlen(players[i]) + 2 >= C.BUFSZ) {
                    if (C.strlen(pbuf) < C.BUFSZ - 4)
                        C.Strcat(pbuf, "...");
                    else
                        C.Strcpy(pbuf + C.strlen(pbuf) - 4, "...");
                    break;
                }
                C.Strcat(pbuf, players[i]);
                if (i < playerct - 1) {
                    if (C.loadChar(players[i] + (0)) == 45 && C.strchr("pr", C.loadChar(players[i] + (1)))
                        && C.loadChar(players[i] + (2)) == 0)
                        C.Strcat(pbuf, " ");
                    else
                        C.Strcat(pbuf, ":");
                }
            }
        }
        /* append end-of-sentence punctuation if there is room */
        if (C.strlen(pbuf) < C.BUFSZ - 1)
            C.Strcat(pbuf, ".");
        C.raw_print(pbuf);
        C.raw_printf("Usage: %s -s [-v] <playertypes> [maxrank] [playernames]",
                   C.gh.hname);
        C.raw_printf("Player types are: [-p role] [-r race]");
    }
    free_ttlist(C.tt_head);
}

export function classmon(plch)

{
    let i;

    /* Look for this role in the role table */
    for (i = 0; C.roles[i].name.m; i++) {
        if (!C.strncmp(plch, C.roles[i].filecode, ROLESZ)) {
            if (C.roles[i].mnum != C.NON_PM)
                return C.roles[i].mnum;
            else
                return C.PM_HUMAN;
        }
    }
    /* this might be from a 3.2.x score for former Elf class */
    if (!C.strcmp(plch, "E"))
        return C.PM_RANGER;

    C.impossible("What weird role is this? (%s)", plch);
    return  C.PM_HUMAN_MUMMY;
}

/*
 * Get a random player name and class from the high score list,
 */
export function get_rnd_toptenentry()

{
    let rank, i;
    let rfile;
    let tt;
    const tt_buf = C.staticEntry();

    rfile = C.fopen_datafile(C.RECORD, "r", C.SCOREPREFIX);
    if (!rfile) {
        C.impossible("Cannot open record file!");
        return 0;
    }

    tt = tt_buf;
    rank = C.rnd(C.sysopt.tt_oname_maxrank, 1395, "get_rnd_toptenentry");
    pickentry: for (;;) {
    for (i = rank; i; i--) {
        C.callLocal(readentry, rfile, tt);
        if (tt.points == 0)
            break;
    }

    if (tt.points == 0) {
        if (rank > 1) {
            rank = 1;
            C.rewind(rfile);
            continue pickentry;
        }
        tt = 0;
    }

    break pickentry;
    }
    C.fclose(rfile);
    return tt;
}


/*
 * Attach random player name and class from high score list
 * to an object (for statues or morgue corpses).
 */
export function tt_oname(otmp)

{
    let tt;
    if (!otmp)
        return  0;

    tt = get_rnd_toptenentry();

    if (!tt)
        return  0;

    C.set_corpsenm(otmp, classmon(tt.plrole));
    if (tt.plgend[0] == 70)
        otmp.spe = C.CORPSTAT_FEMALE;
    else if (tt.plgend[0] == 77)
        otmp.spe = C.CORPSTAT_MALE;
    otmp = C.oname(otmp, tt.name, C.ONAME_NO_FLAGS);

    return otmp;
}

/* Randomly select a topten entry to mimic */
export function tt_doppel(mon)

{
    let tt = C.rn2(13, 1446, "tt_doppel") ? get_rnd_toptenentry() : 0;
    let ret;

    if (!tt)
        ret = C.rn1(C.PM_WIZARD - C.PM_ARCHEOLOGIST + 1, C.PM_ARCHEOLOGIST, 1450, "tt_doppel");
    else {
        if (tt.plgend[0] == 70)
            mon.female = 1;
        else if (tt.plgend[0] == 77)
            mon.female = 0;
        ret = classmon(tt.plrole);
        /* Only take on a name if the player can see
           the doppelganger, otherwise we end up with
           named monsters spoiling the fun - Kes */
        if (C.canseemon(mon))
            C.christen_monst(mon, tt.name);
    }
    return ret;
}

/* Lattice scanf isn't up to reading the scorefile.  What */
/* follows deals with that; I admit it's ugly. (KL) */
/* Now generally available (KL) */
/* NO_SCAN_BRACK */

/*topten.c*/
