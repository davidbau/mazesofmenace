/* NetHack 5.0	topten.c	$NHDT-Date: 1606009004 2020/11/22 01:36:44 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.74 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2012. */
/* NetHack may be freely redistributed.  See license for details. */

// #include "hack.h"
// #include "dlb.h"









/*
 * Updating in place can leave junk at the end of the file in some
 * circumstances (if it shrinks and the OS doesn't have a straightforward
 * way to truncate it).  The trailing junk is harmless and the code
 * which reads the scores will ignore it.
 */




export function done_stopprint() { return program_state.stopprint; }

export function newttentry() { return view_of(struct_toptenentry, addr_of(alloc(sizeof(struct_toptenentry)))); }
export function dealloc_ttentry(ttent) { return free(addr_of((ttent))); }

/* Changing NAMSZ can break your existing record/logfile */
export const NAMSZ = 10;

export const DTHSZ = 100;
export const ROLESZ = 3;

const struct_toptenentry = struct("struct_toptenentry", {
    tt_next: ptr_to("struct_toptenentry"),



    points: long,
    deathdnum: int, deathlev: int,
    maxlvl: int, hp: int, maxhp: int, deaths: int,
    ver_major: int, ver_minor: int, patchlevel: int,
    deathdate: long, birthdate: long,
    uid: int,
    plrole: array_of(char, ROLESZ + 1),
    plrace: array_of(char, ROLESZ + 1),
    plgend: array_of(char, ROLESZ + 1),
    plalign: array_of(char, ROLESZ + 1),
    name: array_of(char, NAMSZ + 1),
    death: array_of(char, DTHSZ + 1),
});
const tt_head = static_var("tt_head", ptr_to(struct_toptenentry));
/* size big enough to read in all the string fields at once; includes
   room for separating space or trailing newline plus string terminator */
export const SCANBUFSZ = (4 * (ROLESZ + 1) + (NAMSZ + 1) + (DTHSZ + 1) + 1);

const zerott = static_struct("zerott", struct_toptenentry);


























/* "killed by",&c ["an"] 'svk.killer.name' */
export function /* void */
formatkiller(
    buf,
    siz,
    how,
    incl_helpless)
{
    let killed_by_prefix = static_array("formatkiller.killed_by_prefix", ptr_to(char), null, [
        /* DIED, CHOKING, POISONING, STARVING, */
        _("killed by "), _("choked on "), _("poisoned by "), _("died of "),
        /* DROWNING, BURNING, DISSOLVED, CRUSHING, */
        _("drowned in "), _("burned by "), _("dissolved in "), _("crushed to death by "),
        /* STONING, TURNED_SLIME, GENOCIDED, */
        _("petrified by "), _("turned to slime by "), _("killed by "),
        /* PANICKED, TRICKED, QUIT, ESCAPED, ASCENDED */
        _(""), _(""), _(""), _(""), _("")
    ]);
    let l;
    let c, kname = svk.killer.name;

    chars[buf + 0] = ord('\0'); /* lint suppression */
    switch (svk.killer.format) {
    default:
        impossible(_("bad killer format? (%d)"), svk.killer.format);
        /* FALLTHROUGH */;
        /*FALLTHRU*/
    case NO_KILLER_PREFIX:
        break;
    case KILLED_BY_AN:
        kname = an(kname);
        /* FALLTHROUGH */;
        /*FALLTHRU*/
    case KILLED_BY:
        void strncat(buf, killed_by_prefix[how], unsigned(unsigned(siz - 1)));
        l = Strlen(buf);
        buf += l, siz = unsigned(siz - l);
        break;
    }
    /* Copy kname into buf[].
     * Object names and named fruit have already been sanitized, but
     * monsters can have "called 'arbitrary text'" attached to them,
     * so make sure that that text can't confuse field splitting when
     * record, logfile, or xlogfile is re-read at some later point.
     */
    while (--siz > 0) {
        c = chars[kname++];
        if (!c)
            break;
        else if (c == ord(','))
            c = ord(';');
        /* 'xlogfile' doesn't really need protection for '=', but
           fixrecord.awk for corrupted 3.6.0 'record' does (only
           if using xlogfile rather than logfile to repair record) */
        else if (c == ord('='))
            c = ord('_');
        /* tab is not possible due to use of mungspaces() when naming;
           it would disrupt xlogfile parsing if it were present */
        else if (c == ord('\t'))
            c = ord(' ');
        chars[buf++] = c;
    }
    chars[buf] = ord('\0');

    if (incl_helpless && gm.multi < 0) {
        /* X <= siz: 'sizeof "string"' includes 1 for '\0' terminator */
        if (gm.multi_reason
            && unsigned(strlen(gm.multi_reason) + sizeof_string(", while ")) <= siz)
            void sprintf(buf, _(", while %s"), gm.multi_reason);
        /* either gm.multi_reason wasn't specified or wouldn't fit */
        else if (sizeof_string(", while helpless") <= siz)
            void strcpy(buf, _(", while helpless"));
        /* else extra death info won't fit, so leave it out */
    }
}

function /* void */
topten_print(x)
{
    if (gt.toptenwin == WIN_ERR)
        raw_print()(x);
    else
        putstr()(gt.toptenwin, ATR_NONE, x);
}

function /* void */
topten_print_bold(x)
{
    if (gt.toptenwin == WIN_ERR)
        raw_print_bold()(x);
    else
        putstr()(gt.toptenwin, ATR_BOLD, x);
}

export function /* int */
observable_depth(lev)
{


















    return depth(lev);
}

/* throw away characters until current record has been entirely consumed */
function /* void */
discardexcess(rfile)
{
    let c;

    do {
        c = fgetc(rfile);
    } while (c != ord('\n') && c != EOF);
}



function /* void */
readentry(rfile, tt)
{ const $frame = stack_frame(); try {
    let inbuf = stack_array(char, SCANBUFSZ), s1 = stack_array(char, SCANBUFSZ), s2 = stack_array(char, SCANBUFSZ), s3 = stack_array(char, SCANBUFSZ),
         s4 = stack_array(char, SCANBUFSZ), s5 = stack_array(char, SCANBUFSZ), s6 = stack_array(char, SCANBUFSZ);






    let fmt = init_string(static_array("readentry.fmt", char, sizeof_string("%d.%d.%d %lld %d %d %d %d %d %d %lld %lld %d ")), _("%d.%d.%d %lld %d %d %d %d %d %d %lld %lld %d "), true);
    let fmt32 = init_string(static_array("readentry.fmt32", char, sizeof_string("%c%c %[^,],%[^\n]%*c")), _("%c%c %[^,],%[^\n]%*c"), true);
    let fmt33 = init_string(static_array("readentry.fmt33", char, sizeof_string("%s %s %s %s %[^,],%[^\n]%*c")), _("%s %s %s %s %[^,],%[^\n]%*c"), true);







    if (fscanf(rfile, fmt, ref_of(tt, "ver_major"), ref_of(tt, "ver_minor"), ref_of(tt, "patchlevel"),
               ref_of(tt, "points"), ref_of(tt, "deathdnum"), ref_of(tt, "deathlev"), ref_of(tt, "maxlvl"),
               ref_of(tt, "hp"), ref_of(tt, "maxhp"), ref_of(tt, "deaths"), ref_of(tt, "deathdate"),
               ref_of(tt, "birthdate"), ref_of(tt, "uid")) != TTFIELDS) {

        tt.points = 0;
        discardexcess(rfile);
    } else {
        /* load remainder of record into a local buffer;
           this imposes an implicit length limit of SCANBUFSZ
           on every string field extracted from the buffer */
        if (!fgets(inbuf, sizeof(array_of(char, SCANBUFSZ)), rfile)) {
            /* sscanf will fail and tt->points will be set to 0 */
            chars[inbuf] = ord('\0');
        } else if (!strchr(inbuf, ord('\n'))) {
            void strcpy(inbuf + (sizeof(array_of(char, SCANBUFSZ)) - 2), _("\n"));
            discardexcess(rfile);
        }
        /* Check for backwards compatibility */
        if (tt.ver_major < 3 || (tt.ver_major == 3 && tt.ver_minor < 3)) {
            let i;

            if (sscanf(inbuf, fmt32, tt.plrole, tt.plgend, s1, s2) == 4) {
                chars[tt.plrole + 1] = chars[tt.plgend + 1] = ord('\0'); /* read via %c */
                copynchars(tt.name, s1, (sizeof_member(tt, "name")) - 1);
                copynchars(tt.death, s2, (sizeof_member(tt, "death")) - 1);
            } else
                tt.points = 0;
            chars[tt.plrole + 1] = ord('\0');
            if ((i = str2role(tt.plrole)) >= 0)
                void strcpy(tt.plrole, roles[i].filecode);
            void strcpy(tt.plrace, _("?"));
            void strcpy(tt.plgend, (chars[tt.plgend + 0] == ord('M')) ? _("Mal") : _("Fem"));
            void strcpy(tt.plalign, _("?"));
        } else if (sscanf(inbuf, fmt33, s1, s2, s3, s4, s5, s6) == 6) {
            copynchars(tt.plrole, s1, (sizeof_member(tt, "plrole")) - 1);
            copynchars(tt.plrace, s2, (sizeof_member(tt, "plrace")) - 1);
            copynchars(tt.plgend, s3, (sizeof_member(tt, "plgend")) - 1);
            copynchars(tt.plalign, s4, (sizeof_member(tt, "plalign")) - 1);
            copynchars(tt.name, s5, (sizeof_member(tt, "name")) - 1);
            copynchars(tt.death, s6, (sizeof_member(tt, "death")) - 1);
        } else
            tt.points = 0;






    }

    /* check old score entries for Y2K problem and fix whenever found */
    if (tt.points > 0) {
        if (tt.birthdate < 19000000)
            tt.birthdate += 19000000;
        if (tt.deathdate < 19000000)
            tt.deathdate += 19000000;
    }
} finally { stack_pop($frame); } } export const TTFIELDS = 13;

function /* void */
writeentry(rfile, tt)
{
    let fmt32 = init_string(static_array("writeentry.fmt32", char, sizeof_string("%c%c ")), _("%c%c "), true);        /* role,gender */
    let fmt33 = init_string(static_array("writeentry.fmt33", char, sizeof_string("%s %s %s %s ")), _("%s %s %s %s "), true); /* role,race,gndr,algn */

    let fmt0 = init_string(static_array("writeentry.fmt0", char, sizeof_string("%d.%d.%d %lld %d %d %d %d %d %d %lld %lld %d ")), _("%d.%d.%d %lld %d %d %d %d %d %d %lld %lld %d "), true);
    let fmtX = init_string(static_array("writeentry.fmtX", char, sizeof_string("%s,%s\n")), _("%s,%s\n"), true);








    void fprintf(rfile, fmt0, tt.ver_major, tt.ver_minor, tt.patchlevel,
                   tt.points, tt.deathdnum, tt.deathlev, tt.maxlvl,
                   tt.hp, tt.maxhp, tt.deaths, tt.deathdate,
                   tt.birthdate, tt.uid);
    if (tt.ver_major < 3 || (tt.ver_major == 3 && tt.ver_minor < 3))
        void fprintf(rfile, fmt32, chars[tt.plrole + 0], chars[tt.plgend + 0]);
    else
        void fprintf(rfile, fmt33, tt.plrole, tt.plrace, tt.plgend,
                       tt.plalign);
    void fprintf(rfile, fmtX, onlyspace(tt.name) ? _("_") : tt.name,
                   tt.death);





}





/* as tab is never used in eg. svp.plname or death, no need to mangle those. */
function /* void */
writexlentry(rfile, tt, how)
{ const $frame = stack_frame(); try {


    let buf = stack_array(char, BUFSZ), tmpbuf = stack_array(char, DTHSZ + 1);
    let achbuf = stack_array(char, N_ACH * 40);

    void sprintf(buf, _("version=%d.%d.%d"), tt.ver_major, tt.ver_minor, tt.patchlevel)
;
    void sprintf(eos(buf), _("%cpoints=%lld%cdeathdnum=%d%cdeathlev=%d"), XLOG_SEP, tt.points, XLOG_SEP, tt.deathdnum, XLOG_SEP, tt.deathlev)
;
    void sprintf(eos(buf), _("%cmaxlvl=%d%chp=%d%cmaxhp=%d"), XLOG_SEP, tt.maxlvl, XLOG_SEP, tt.hp, XLOG_SEP, tt.maxhp)
;
    void sprintf(eos(buf), _("%cdeaths=%d%cdeathdate=%lld%cbirthdate=%lld%cuid=%d"), XLOG_SEP, tt.deaths, XLOG_SEP, tt.deathdate, XLOG_SEP, tt.birthdate, XLOG_SEP, tt.uid)

;
    void fprintf(rfile, _("%s"), buf);
    void sprintf(buf, _("%crole=%s%crace=%s%cgender=%s%calign=%s"), XLOG_SEP, tt.plrole, XLOG_SEP, tt.plrace, XLOG_SEP, tt.plgend, XLOG_SEP, tt.plalign)

;
    /* make a copy of death reason that doesn't include ", while helpless" */
    formatkiller(tmpbuf, sizeof(array_of(char, DTHSZ + 1)), how, FALSE);
    void fprintf(rfile, _("%s%cname=%s%cdeath=%s"), buf, XLOG_SEP, svp.plname, XLOG_SEP, tmpbuf)

;
    if (gm.multi < 0)
        void fprintf(rfile, _("%cwhile=%s"), XLOG_SEP, gm.multi_reason ? gm.multi_reason : _("helpless"))
;
    void fprintf(rfile, _("%cconduct=0x%llx%cturns=%lld%cachieve=0x%llx"), XLOG_SEP, encodeconduct(), XLOG_SEP, svm.moves, XLOG_SEP, encodeachieve(FALSE))

;
    void fprintf(rfile, _("%cachieveX=%s"), XLOG_SEP, encode_extended_achievements(achbuf))
;
    void fprintf(rfile, _("%cconductX=%s"), XLOG_SEP, encode_extended_conducts(buf))
; /* reuse 'buf[]' */
    void fprintf(rfile, _("%crealtime=%lld%cstarttime=%lld%cendtime=%lld"), XLOG_SEP, urealtime.realtime, XLOG_SEP, timet_to_seconds(ubirthday), XLOG_SEP, timet_to_seconds(urealtime.finish_time))


;
    void fprintf(rfile, _("%cgender0=%s%calign0=%s"), XLOG_SEP, genders[flags.initgend].filecode, XLOG_SEP, aligns[1 - chars[u.ualignbase + A_ORIGINAL]].filecode)

;
    void fprintf(rfile, _("%cflags=0x%llx"), XLOG_SEP, encodexlogflags());
    void fprintf(rfile, _("%cgold=%lld"), XLOG_SEP, money_cnt(gi.invent) + hidden_gold(TRUE))
;
    void fprintf(rfile, _("%cwish_cnt=%lld"), XLOG_SEP, u.uconduct.wishes);
    void fprintf(rfile, _("%carti_wish_cnt=%lld"), XLOG_SEP, u.uconduct.wisharti);
    void fprintf(rfile, _("%cbones=%lld"), XLOG_SEP, u.uroleplay.numbones);
    void fprintf(rfile, _("%crerolls=%lld"), XLOG_SEP, u.uroleplay.numrerolls);
    void fprintf(rfile, _("\n"));

} finally { stack_pop($frame); } } export const XLOG_SEP = ord('\t');

function /* long long */
encodexlogflags()
{
    let e = 0;

    if (wizard())
        e = or64(e, shl64(1, 0));
    if (discover())
        e = or64(e, shl64(1, 1));
    if (!u.uroleplay.numbones)
        e = or64(e, shl64(1, 2));
    if (u.uroleplay.reroll)
        e = or64(e, shl64(1, 3));

    return e;
}

function /* long long */
encodeconduct()
{
    let e = 0;

    if (!u.uconduct.food)
        e = or64(e, shl64(1, 0));
    if (!u.uconduct.unvegan)
        e = or64(e, shl64(1, 1));
    if (!u.uconduct.unvegetarian)
        e = or64(e, shl64(1, 2));
    if (!u.uconduct.gnostic)
        e = or64(e, shl64(1, 3));
    if (!u.uconduct.weaphit)
        e = or64(e, shl64(1, 4));
    if (!u.uconduct.killer)
        e = or64(e, shl64(1, 5));
    if (!u.uconduct.literate)
        e = or64(e, shl64(1, 6));
    if (!u.uconduct.polypiles)
        e = or64(e, shl64(1, 7));
    if (!u.uconduct.polyselfs)
        e = or64(e, shl64(1, 8));
    if (!u.uconduct.wishes)
        e = or64(e, shl64(1, 9));
    if (!u.uconduct.wisharti)
        e = or64(e, shl64(1, 10));
    if (!num_genocides())
        e = or64(e, shl64(1, 11));
    /* one bit isn't really adequate for sokoban conduct:
       reporting "obeyed sokoban rules" is misleading if sokoban wasn't
       completed or at least attempted; however, suppressing that when
       sokoban was never entered, as we do here, risks reporting
       "violated sokoban rules" when no such thing occurred; this can
       be disambiguated in xlogfile post-processors by testing the
       entered-sokoban bit in the 'achieve' field */
    if (!u.uconduct.sokocheat && sokoban_in_play())
        e = or64(e, shl64(1, 12));
    if (!u.uconduct.pets)
        e = or64(e, shl64(1, 13));

    return e;
}

function /* long long */
encodeachieve(
    secondlong) /* False: handle achievements 1..31, True: 32..62 */
{
    let i, achidx, offset;
    let r = 0;

    /*
     * 32: portable limit for 'long'.
     * Force 32 even on configurations that are using 64 bit longs.
     *
     * We use signed long and limit ourselves to 31 bits since tools
     * that post-process xlogfile might not be able to cope with
     * 'unsigned long'.
     */
    offset = secondlong ? (32 - 1) : 0;
    for (i = 0; chars[u.uachieved + i]; ++i) {
        achidx = chars[u.uachieved + i] - offset;
        if (achidx > 0 && achidx < 32) /* value 1..31 sets bit 0..30 */
            r = or64(r, shl64(1, (achidx - 1)));
    }
    return r;
}

/* add the achievement or conduct comma-separated to string */
function /* void */
add_achieveX(buf, achievement, condition)
{
    if (condition) {
        if (chars[buf + 0] != ord('\0')) {
            void strcat(buf, _(","));
        }
        void strcat(buf, achievement);
    }
}

function /* char * */
encode_extended_achievements(buf)
{ const $frame = stack_frame(); try {
    let rnkbuf = stack_array(char, 40);
    let achievement = 0;
    let i, achidx, absidx;

    chars[buf + 0] = ord('\0');
    for (i = 0; chars[u.uachieved + i]; i++) {
        achidx = chars[u.uachieved + i];
        absidx = abs(achidx);
        switch (absidx) {
        case ACH_UWIN:
            achievement = _("ascended");
            break;
        case ACH_ASTR:
            achievement = _("entered_astral_plane");
            break;
        case ACH_ENDG:
            achievement = _("entered_elemental_planes");
            break;
        case ACH_AMUL:
            achievement = _("obtained_the_amulet_of_yendor");
            break;
        case ACH_INVK:
            achievement = _("performed_the_invocation_ritual");
            break;
        case ACH_BOOK:
            achievement = _("obtained_the_book_of_the_dead");
            break;
        case ACH_BELL:
            achievement = _("obtained_the_bell_of_opening");
            break;
        case ACH_CNDL:
            achievement = _("obtained_the_candelabrum_of_invocation");
            break;
        case ACH_HELL:
            achievement = _("entered_gehennom");
            break;
        case ACH_MEDU:
            achievement = _("defeated_medusa");
            break;
        case ACH_MINE_PRIZE:
            achievement = _("obtained_the_luckstone_from_the_mines");
            break;
        case ACH_SOKO_PRIZE:
            achievement = _("obtained_the_sokoban_prize");
            break;
        case ACH_ORCL:
            achievement = _("consulted_the_oracle");
            break;
        case ACH_NOVL:
            achievement = _("read_a_discworld_novel");
            break;
        case ACH_MINE:
            achievement = _("entered_the_gnomish_mines");
            break;
        case ACH_TOWN:
            achievement = _("entered_mine_town");
            break;
        case ACH_SHOP:
            achievement = _("entered_a_shop");
            break;
        case ACH_TMPL:
            achievement = _("entered_a_temple");
            break;
        case ACH_SOKO:
            achievement = _("entered_sokoban");
            break;
        case ACH_BGRM:
            achievement = _("entered_bigroom");
            break;
        case ACH_TUNE:
            achievement = _("learned_castle_drawbridge_tune");
            break;
        /* rank 0 is the starting condition, not an achievement; 8 is Xp 30 */
        case ACH_RNK1: case ACH_RNK2: case ACH_RNK3: case ACH_RNK4:
        case ACH_RNK5: case ACH_RNK6: case ACH_RNK7: case ACH_RNK8:
            void sprintf(rnkbuf, _("attained_the_rank_of_%s"), rank_of(rank_to_xlev(absidx - (ACH_RNK1 - 1)),
                            Role_switch(), (achidx < 0) ? TRUE : FALSE))
;
            strNsubst(rnkbuf, _(" "), _("_"), 0); /* replace every ' ' with '_' */
            achievement = lcase(rnkbuf);
            break;
        default:
            continue;
        }
        add_achieveX(buf, achievement, TRUE);
    }

    return buf;
} finally { stack_pop($frame); } }

function /* char * */
encode_extended_conducts(buf)
{
    chars[buf + 0] = ord('\0');
    add_achieveX(buf, _("foodless"),     +!u.uconduct.food);
    add_achieveX(buf, _("vegan"),        +!u.uconduct.unvegan);
    add_achieveX(buf, _("vegetarian"),   +!u.uconduct.unvegetarian);
    add_achieveX(buf, _("atheist"),      +!u.uconduct.gnostic);
    add_achieveX(buf, _("weaponless"),   +!u.uconduct.weaphit);
    add_achieveX(buf, _("pacifist"),     +!u.uconduct.killer);
    add_achieveX(buf, _("illiterate"),   +!u.uconduct.literate);
    add_achieveX(buf, _("polyless"),     +!u.uconduct.polypiles);
    add_achieveX(buf, _("polyselfless"), +!u.uconduct.polyselfs);
    add_achieveX(buf, _("wishless"),     +!u.uconduct.wishes);
    add_achieveX(buf, _("artiwishless"), +!u.uconduct.wisharti);
    add_achieveX(buf, _("genocideless"), +!num_genocides());
    if (sokoban_in_play())
        add_achieveX(buf, _("sokoban"),  +!u.uconduct.sokocheat);
    add_achieveX(buf, _("blind"),        u.uroleplay.blind);
    add_achieveX(buf, _("deaf"),         u.uroleplay.deaf);
    add_achieveX(buf, _("nudist"),       u.uroleplay.nudist);
    add_achieveX(buf, _("pauper"),       u.uroleplay.pauper);
    add_achieveX(buf, _("bonesless"),    +!flags.bones);
    add_achieveX(buf, _("petless"),      +!u.uconduct.pets);
    add_achieveX(buf, _("unrerolled"),   +!u.uroleplay.reroll);

    return buf;
}



function /* void */
free_ttlist(tt)
{
    let ttnext;

    while (tt.points > 0) {
        ttnext = tt.tt_next;
        dealloc_ttentry(tt);
        tt = ttnext;
    }
    dealloc_ttentry(tt);
}

export function /* void */
topten(how, when)
{ const $frame = stack_frame(); try {
    var t0, tprev;
    var t1;
    var rfile;

    var lfile;


    var xlfile;

    var uid = int(getuid());
    var rank, rank0 = -1, rank1 = 0;
    var occ_cnt = sysopt.persmax;
    var flg = 0;
    var t0_used, skip_scores;




    /* If we are in the midst of a panic, cut out topten entirely.
     * topten uses alloc() several times, which will lead to
     * problems if the panic was the result of an alloc() failure.
     */
    if (program_state.panicking)
        return;

    if (iflags.toptenwin) {
        gt.toptenwin = create_nhwindow()(NHW_TEXT);
    }










    /* create a new 'topten' entry */
    t0_used = FALSE;
    t0 = newttentry();
    struct_assign(t0, zerott);
    t0.ver_major = VERSION_MAJOR;
    t0.ver_minor = VERSION_MINOR;
    t0.patchlevel = PATCHLEVEL;
    t0.points = u.urexp;
    t0.deathdnum = u.uz.dnum;
    /* deepest_lev_reached() is in terms of depth(), and reporting the
     * deepest level reached in the dungeon death occurred in doesn't
     * seem right, so we have to report the death level in depth() terms
     * as well (which also seems reasonable since that's all the player
     * sees on the screen anyway)
     */
    t0.deathlev = observable_depth(u.uz);
    t0.maxlvl = deepest_lev_reached(TRUE);
    t0.hp = u.uhp;
    t0.maxhp = u.uhpmax;
    t0.deaths = u.umortality;
    t0.uid = uid;
    copynchars(t0.plrole, gu.urole.filecode, ROLESZ);
    copynchars(t0.plrace, gu.urace.filecode, ROLESZ);
    copynchars(t0.plgend, genders[flags.female].filecode, ROLESZ);
    copynchars(t0.plalign, aligns[1 - u.ualign.type].filecode, ROLESZ);
    copynchars(t0.name, svp.plname, NAMSZ);
    formatkiller(t0.death, sizeof_member(t0, "death"), how, TRUE);
    t0.birthdate = yyyymmdd(ubirthday);
    t0.deathdate = yyyymmdd(when);
    t0.tt_next = null;





    if (lock_file(_(LOGFILE), SCOREPREFIX, 10)) {
        if (!(lfile = fopen_datafile(_(LOGFILE), _("a"), SCOREPREFIX))) {
            if (!program_state.done_hup) raw_print()(_("Cannot open log file!"));;
        } else {
            writeentry(lfile, t0);
            void fclose(lfile);
        }
        unlock_file(_(LOGFILE));
    }


    if (lock_file(_(XLOGFILE), SCOREPREFIX, 10)) {
        if (!(xlfile = fopen_datafile(_(XLOGFILE), _("a"), SCOREPREFIX))) {
            if (!program_state.done_hup) raw_print()(_("Cannot open extended log file!"));;
        } else {
            writexlentry(xlfile, t0, how);
            void fclose(xlfile);
        }
        unlock_file(_(XLOGFILE));
    }


    destroywin: { showwin: { if (wizard() || discover()) {
        if (how != PANICKED)
            if (!program_state.done_hup) {
                var pbuf = stack_array(char, BUFSZ);

                topten_print(_(""));
                void sprintf(pbuf, _("Since you were in %s mode, the score list will not be checked."), wizard() ? _("wizard") : _("discover"))

;
                topten_print(pbuf);
            }
        break showwin;
    }

    if (!lock_file(_(RECORD), SCOREPREFIX, 60))
        break destroywin;;




    rfile = fopen_datafile(_(RECORD), _("r"), SCOREPREFIX);


    if (!rfile) {
        if (!program_state.done_hup) raw_print()(_("Cannot open record file!"));;
        unlock_file(_(RECORD));
        break destroywin;
    }

    if (!program_state.done_hup) topten_print(_(""));;

    /* assure minimum number of points */
    if (t0.points < sysopt.pointsmin)
        t0.points = 0;

    t1 = tt_head[0] = newttentry();
    tprev = null;
    /* rank0: -1 undefined, 0 not_on_list, n n_th on list */
    for (rank = 1; ; ) {
        readentry(rfile, t1);
        if (t1.points < sysopt.pointsmin)
            t1.points = 0;
        if (rank0 < 0 && t1.points < t0.points) {
            rank0 = rank++;
            if (tprev == null)
                tt_head[0] = t0;
            else
                tprev.tt_next = t0;
            t0.tt_next = t1;



            t0_used = TRUE;
            occ_cnt--;
            flg++; /* ask for a rewrite */
        } else
            tprev = t1;

        if (t1.points == 0)
            break;
        if ((sysopt.pers_is_uid ? t1.uid == t0.uid
                                : strncmp(t1.name, t0.name, NAMSZ) == 0)
            && !strncmp(t1.plrole, t0.plrole, ROLESZ) && --occ_cnt <= 0) {
            if (rank0 < 0) {
                rank0 = 0;
                rank1 = rank;
                if (!program_state.done_hup) {
                    var pbuf = stack_array(char, BUFSZ);

                    void sprintf(pbuf, _("You didn't beat your previous score of %lld points."), t1.points)

;
                    topten_print(pbuf);
                    topten_print(_(""));
                }
            }
            if (occ_cnt < 0) {
                flg++;
                continue;
            }
        }
        if (rank <= sysopt.entrymax) {
            t1.tt_next = newttentry();
            t1 = t1.tt_next;
            rank++;
        }
        if (rank > sysopt.entrymax) {
            t1.points = 0;
            break;
        }
    }
    if (flg) { /* rewrite record file */



        void fclose(rfile);
        if (!(rfile = fopen_datafile(_(RECORD), _("w"), SCOREPREFIX))) {
            if (!program_state.done_hup) raw_print()(_("Cannot write record file"));;
            unlock_file(_(RECORD));
            free_ttlist(tt_head[0]);
            break destroywin;
        }

        if (!done_stopprint())
            if (rank0 > 0) {
                if (rank0 <= 10) {
                    topten_print(_("You made the top ten list!"));
                } else {
                    var pbuf = stack_array(char, BUFSZ);

                    void sprintf(pbuf, _("You reached the %d%s place on the top %d list."), rank0, ordin(rank0), sysopt.entrymax)

;
                    topten_print(pbuf);
                }
                topten_print(_(""));
            }
    }
    skip_scores = +(!flags.end_top && !flags.end_around && !flags.end_own);
    if (rank0 == 0)
        rank0 = rank1;
    if (rank0 <= 0)
        rank0 = rank;
    if (!skip_scores && !done_stopprint())
        outheader();
    for (t1 = tt_head[0], rank = 1; t1.points != 0; t1 = t1.tt_next, ++rank) {
        if (flg



            )
            writeentry(rfile, t1);
        if (skip_scores || done_stopprint())
            continue;
        if (rank <= flags.end_top
            || (rank >= rank0 - flags.end_around
                && rank <= rank0 + flags.end_around)
            || (flags.end_own && (sysopt.pers_is_uid
                                  ? t1.uid == t0.uid
                                  : !strncmp(t1.name, t0.name, NAMSZ)))) {
            if (rank == rank0 - flags.end_around
                && rank0 > flags.end_top + flags.end_around + 1
                && !flags.end_own)
                topten_print(_(""));

            if (rank != rank0) {
                outentry(rank, t1, FALSE);
            } else if (!rank1) {
                outentry(rank, t1, TRUE);
            } else {
                outentry(rank, t1, TRUE);
                outentry(0, t0, TRUE);
            }
        }
    }
    if (rank0 >= rank)
        if (!skip_scores && !done_stopprint())
            outentry(0, t0, TRUE);





















    void fclose(rfile);
    unlock_file(_(RECORD));
    free_ttlist(tt_head[0]);

 }
    if (!done_stopprint()) {
        if (iflags.toptenwin) {
            display_nhwindow()(gt.toptenwin, TRUE);
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
    if (iflags.toptenwin) {
        destroy_nhwindow()(gt.toptenwin);
        gt.toptenwin = WIN_ERR;
    }
} finally { stack_pop($frame); } }

function /* void */
outheader()
{ const $frame = stack_frame(); try {
    let linebuf = stack_array(char, BUFSZ);
    let bp;

    void strcpy(linebuf, _(" No  Points     Name"));
    bp = eos(linebuf);
    while (bp < linebuf + COLNO - 9)
        chars[bp++] = ord(' ');
    void strcpy(bp, _("Hp [max]"));
    topten_print(linebuf);
} finally { stack_pop($frame); } }



/* so>0: standout line; so=0: ordinary line */
function /* void */
outentry(rank, t1, so)
{ const $frame = stack_frame(); try {
    let second_line = TRUE;
    let linebuf = stack_array(char, BUFSZ);
    let bp, hpbuf = stack_array(char, 24), linebuf3 = stack_array(char, BUFSZ);
    let hppos, lngr;

    chars[linebuf + 0] = ord('\0');
    if (rank)
        void sprintf(eos(linebuf), _("%3d"), rank);
    else
        void strcat(linebuf, _("   "));

    void sprintf(eos(linebuf), _(" %10lld  %.10s"), t1.points ? t1.points : u.urexp, t1.name)
;
    void sprintf(eos(linebuf), _("-%s"), t1.plrole);
    if (chars[t1.plrace + 0] != ord('?'))
        void sprintf(eos(linebuf), _("-%s"), t1.plrace);
    /* Printing of gender and alignment is intentional.  It has been
     * part of the NetHack Geek Code, and illustrates a proper way to
     * specify a character from the command line.
     */
    void sprintf(eos(linebuf), _("-%s"), t1.plgend);
    if (chars[t1.plalign + 0] != ord('?'))
        void sprintf(eos(linebuf), _("-%s "), t1.plalign);
    else
        void strcat(linebuf, _(" "));
    if (!strncmp(_("escaped"), t1.death, 7)) {
        void (sprintf(eos(linebuf), _("escaped the dungeon %s[max level %d]"), !strncmp(_(" ("), t1.death + 7, 2) ? t1.death + 7 + 2 : _(""), t1.maxlvl))

;
        /* fixup for closing paren in "escaped... with...Amulet)[max..." */
        if ((bp = strchr(linebuf, ord(')'))) != 0)
            chars[bp] = (t1.deathdnum == astral_level().dnum) ? ord('\0') : ord(' ');
        second_line = FALSE;
    } else if (!strncmp(_("ascended"), t1.death, 8)) {
        void sprintf(eos(linebuf), _("ascended to demigod%s-hood"), (chars[t1.plgend + 0] == ord('F')) ? _("dess") : _(""))
;
        second_line = FALSE;
    } else {
        if (!strncmp(t1.death, _("quit"), 4)) {
            void strcat(linebuf, _("quit"));
            second_line = FALSE;
        } else if (!strncmp(t1.death, _("died of st"), 10)) {
            void strcat(linebuf, _("starved to death"));
            second_line = FALSE;
        } else if (!strncmp(t1.death, _("choked"), 6)) {
            void sprintf(eos(linebuf), _("choked on h%s food"), (chars[t1.plgend + 0] == ord('F')) ? _("er") : _("is"))
;
        } else if (!strncmp(t1.death, _("poisoned"), 8)) {
            void strcat(linebuf, _("was poisoned"));
        } else if (!strncmp(t1.death, _("crushed"), 7)) {
            void strcat(linebuf, _("was crushed to death"));
        } else if (!strncmp(t1.death, _("petrified by "), 13)) {
            void strcat(linebuf, _("turned to stone"));
        } else
            void strcat(linebuf, _("died"));

        if (t1.deathdnum == astral_level().dnum) {
            let arg, fmt = _(" on the Plane of %s");

            switch (t1.deathlev) {
            case -5:
                fmt = _(" on the %s Plane");
                arg = _("Astral");
                break;
            case -4:
                arg = _("Water");
                break;
            case -3:
                arg = _("Fire");
                break;
            case -2:
                arg = _("Air");
                break;
            case -1:
                arg = _("Earth");
                break;
            default:
                arg = _("Void");
                break;
            }
            void sprintf(eos(linebuf), fmt, arg);
        } else {
            void sprintf(eos(linebuf), _(" in %s"), svd.dungeons[t1.deathdnum].dname);
            if (t1.deathdnum != knox_level().dnum)
                void sprintf(eos(linebuf), _(" on level %d"), t1.deathlev);
            if (t1.deathlev != t1.maxlvl)
                void sprintf(eos(linebuf), _(" [max %d]"), t1.maxlvl);
        }

        /* kludge for "quit while already on Charon's boat" */
        if (!strncmp(t1.death, _("quit "), 5))
            void strcat(linebuf, t1.death + 4);
    }
    void strcat(linebuf, _("."));

    /* Quit, starved, ascended, and escaped contain no second line */
    if (second_line) {
        bp = eos(linebuf);
        void sprintf(bp, _("  %c%s."), highc(chars[(t1.death)]), t1.death + 1);
        /* fix up "Killed by Mr. Asidonhopo; the shopkeeper"; that starts
           with a comma but has it changed to semi-colon to keep the comma
           out of 'record'; change it back for display */
        void strsubst(bp, _("; the "), _(", the "));
    }

    lngr = int(strlen(linebuf));
    if (t1.hp <= 0)
        chars[hpbuf + 0] = ord('-'), chars[hpbuf + 1] = ord('\0');
    else
        void sprintf(hpbuf, _("%d"), t1.hp);
    /* beginning of hp column after padding (not actually padded yet) */
    hppos = COLNO - (sizeof_string("  Hp [max]") - sizeof_string(""));
    while (lngr >= hppos) {
        for (bp = eos(linebuf); !(chars[bp] == ord(' ') && bp - linebuf < hppos); bp--)
            ;
        /* special case: word is too long, wrap in the middle */
        if (linebuf + 15 >= bp)
            bp = linebuf + hppos - 1;
        /* special case: if about to wrap in the middle of maximum
           dungeon depth reached, wrap in front of it instead */
        if (bp > linebuf + 5 && !strncmp(bp - 5, _(" [max"), 5))
            bp -= 5;
        if (chars[bp] != ord(' '))
            void strcpy(linebuf3, bp);
        else
            void strcpy(linebuf3, bp + 1);
        chars[bp] = ord('\0');
        if (so) {
            while (bp < linebuf + (COLNO - 1))
                chars[bp++] = ord(' ');
            chars[bp] = ord('\0');
            topten_print_bold(linebuf);
        } else
            topten_print(linebuf);
        Snprintf(linebuf, sizeof(array_of(char, BUFSZ)), _("%15s %s"), _(""), linebuf3);
        lngr = int(Strlen(linebuf));
    }
    /* beginning of hp column not including padding */
    hppos = COLNO - 7 - int(strlen(hpbuf));
    bp = eos(linebuf);

    if (bp <= linebuf + hppos) {
        /* pad any necessary blanks to the hit point entry */
        while (bp < linebuf + hppos)
            chars[bp++] = ord(' ');
        void strcpy(bp, hpbuf);
        void sprintf(eos(bp), _(" %s[%d]"), (t1.maxhp < 10) ? _("  ") : (t1.maxhp < 100) ? _(" ") : _(""), t1.maxhp)

;
    }

    if (so) {
        bp = eos(linebuf);
        while (bp < linebuf + (COLNO - 1))
            chars[bp++] = ord(' ');
        chars[bp] = ord('\0');
        topten_print_bold(linebuf);
    } else
        topten_print(linebuf);
} finally { stack_pop($frame); } }



function /* int */
score_wanted(
    current_ver,
    rank,
    t1,
    playerct,
    players,
    uid)
{
    let arg, nxt;
    let i;

    if (current_ver && (t1.ver_major != VERSION_MAJOR
                        || t1.ver_minor != VERSION_MINOR
                        || t1.patchlevel != PATCHLEVEL))
        return 0;

    if (sysopt.pers_is_uid && !playerct && t1.uid == uid)
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
        if (chars[arg + 0] == ord('-') && chars[arg + 1] == ord('u') && chars[arg + 2] != ord('\0'))
            arg += 2; /* handle '-uname' */

        if (chars[arg + 0] == ord('-') && strchr(_("pru"), chars[arg + 1]) && !chars[arg + 2]
            && i + 1 < playerct) {
            nxt = players[i + 1];
            if ((chars[arg + 1] == ord('p') && str2role(nxt) == str2role(t1.plrole))
                || (chars[arg + 1] == ord('r') && str2race(nxt) == str2race(t1.plrace))
                /* handle '-u name' */
                || (chars[arg + 1] == ord('u') && (!strcmp(nxt, _("all"))
                                      || !strncmp(t1.name, nxt, NAMSZ))))
                return 1;
            i++;
        } else if (!strcmp(arg, _("all"))
                   || !strncmp(t1.name, arg, NAMSZ)
                   || (chars[arg + 0] == ord('-') && chars[arg + 1] == chars[t1.plrole + 0] && !chars[arg + 2])
                   || (digit(chars[arg + 0]) && rank <= atoi(arg)))
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
export function /* void */
prscore(argc, argv)
{ const $frame = stack_frame(); try {
    let players, player0 = stack_var(ptr_to(char));
    let i, playerct, rank;
    let t1;
    let rfile;
    let pbuf = stack_array(char, BUFSZ), p;
    let ln;
    let uid = -1;
    let current_ver = TRUE, init_done = FALSE, match_found = FALSE;

    /* expect "-s" or "--scores"; "-s<anything> is accepted */
    ln = (argc < 2) ? 0
         : ((p = strchr(argv[1], ord(' '))) != 0) ? unsigned((p - argv[1]))
           : Strlen(argv[1]);
    if (ln < 2 || (strncmp(argv[1], _("-s"), 2)
                   && strcmp(argv[1], _("--scores")))) {
        raw_printf(_("prscore: bad arguments (%d)"), argc);
        return;
    }

    rfile = fopen_datafile(_(RECORD), _("r"), SCOREPREFIX);
    if (!rfile) {
        raw_print()(_("Cannot open record file!"));
        return;
    }










    /* If the score list isn't after a game, we never went through
     * initialization. */
    if (wiz1_level().dlevel == 0) {
        ;
        init_dungeons();
        init_done = TRUE;
    }

    /* to get here, argv[1] either starts with "-s" or is "--scores" without
       trailing stuff; for "-s<anything>" treat <anything> as separate arg */
    if (chars[argv[1] + 1] == ord('-') || !chars[argv[1] + 2]) {
        argc--;
        argv = argv.subarray(1);
    } else { /* concatenated arg string; use up "-s" but keep argc,argv */
        argv[1] += 2;
    }
    /* -v doesn't take a version number arg; it means 'all versions present
       in the file' instead of the default of only the current version;
       unlike -s, we don't accept "-v<anything>" for non-empty <anything> */
    if (argc > 1 && !strcmp(argv[1], _("-v"))) {
        current_ver = FALSE;
        argc--;
        argv = argv.subarray(1);
    }

    if (argc <= 1) {
        if (sysopt.pers_is_uid) {
            uid = int(getuid());
            playerct = 0;
            players = null;
        } else {
            player0[0] = svp.plname;
            if (!chars[player0[0]])
                player0[0] = _("all"); /* if no plname[], show all scores
                                  * (possibly filtered by '-v') */
            playerct = 1;
            players = player0;
        }
    } else {
        playerct = --argc;
        players = (argv = ref_add(argv, 1));
    }
    raw_print()(_(""));

    t1 = tt_head[0] = newttentry();
    for (rank = 1; ; rank++) {
        readentry(rfile, t1);
        if (t1.points == 0)
            break;
        if (!match_found
            && score_wanted(current_ver, rank, t1, playerct, players, uid))
            match_found = TRUE;
        t1.tt_next = newttentry();
        t1 = t1.tt_next;
    }

    void fclose(rfile);
    if (init_done) {
        free_dungeons();
        ;
    }

    if (match_found) {
        outheader();
        t1 = tt_head[0];
        for (rank = 1; t1.points != 0; rank++, t1 = t1.tt_next) {
            if (score_wanted(current_ver, rank, t1, playerct, players, uid))
                void outentry(rank, t1, FALSE);
        }
    } else {
        void sprintf(pbuf, _("Cannot find any %sentries for "), current_ver ? _("current ") : _(""))
;
        if (playerct < 1) {
            void strcat(pbuf, _("you"));
        } else {
            /* minor bug: 'nethack -s -u ziggy' will say "any of"
               even though the '-u' doesn't indicate multiple names */
            if (playerct > 1)
                void strcat(pbuf, _("any of "));
            for (i = 0; i < playerct; i++) {
                /* accept '-u name' and '-uname' as well as just 'name'
                   so skip '-u' for the none-found feedback */
                if (!strncmp(players[i], _("-u"), 2)) {
                    if (!chars[players[i] + 2])
                        continue;
                    players[i] += 2;
                }
                /* stop printing players if there are too many to fit */
                if (unsigned(unsigned(strlen(pbuf) + strlen(players[i])) + 2) >= BUFSZ) {
                    if (strlen(pbuf) < BUFSZ - 4)
                        void strcat(pbuf, _("..."));
                    else
                        void strcpy(pbuf + strlen(pbuf) - 4, _("..."));
                    break;
                }
                void strcat(pbuf, players[i]);
                if (i < playerct - 1) {
                    if (chars[players[i] + 0] == ord('-') && strchr(_("pr"), chars[players[i] + 1])
                        && chars[players[i] + 2] == 0)
                        void strcat(pbuf, _(" "));
                    else
                        void strcat(pbuf, _(":"));
                }
            }
        }
        /* append end-of-sentence punctuation if there is room */
        if (strlen(pbuf) < BUFSZ - 1)
            void strcat(pbuf, _("."));
        raw_print()(pbuf);
        raw_printf(_("Usage: %s -s [-v] <playertypes> [maxrank] [playernames]"),
                   gh.hname);
        raw_printf(_("Player types are: [-p role] [-r race]"));
    }
    free_ttlist(tt_head[0]);









} finally { stack_pop($frame); } }

function /* int */
classmon(plch)
{
    let i;

    /* Look for this role in the role table */
    for (i = 0; roles[i].name.m; i++) {
        if (!strncmp(plch, roles[i].filecode, ROLESZ)) {
            if (roles[i].mnum != NON_PM)
                return roles[i].mnum;
            else
                return PM_HUMAN;
        }
    }
    /* this might be from a 3.2.x score for former Elf class */
    if (!strcmp(plch, _("E")))
        return PM_RANGER;

    impossible(_("What weird role is this? (%s)"), plch);
    return  PM_HUMAN_MUMMY;
}

/*
 * Get a random player name and class from the high score list,
 */
export function /* struct toptenentry * */
get_rnd_toptenentry()
{
    var rank, i;
    var rfile;
    var tt;
    var tt_buf = static_struct("get_rnd_toptenentry.tt_buf", struct_toptenentry);

    rfile = fopen_datafile(_(RECORD), _("r"), SCOREPREFIX);
    if (!rfile) {
        impossible(_("Cannot open record file!"));
        return null;
    }

    tt = tt_buf;
    rank = rnd(sysopt.tt_oname_maxrank);
 pickentry: for (;;) {
    for (i = rank; i; i--) {
        readentry(rfile, tt);
        if (tt.points == 0)
            break;
    }

    if (tt.points == 0) {
        if (rank > 1) {
            rank = 1;
            rewind(rfile);
            continue pickentry;
        }
        tt = null;
    } break; }

    void fclose(rfile);
    return tt;
}


/*
 * Attach random player name and class from high score list
 * to an object (for statues or morgue corpses).
 */
export function /* struct obj * */
tt_oname(otmp)
{
    let tt;
    if (!otmp)
        return null;

    tt = get_rnd_toptenentry();

    if (!tt)
        return null;

    set_corpsenm(otmp, classmon(tt.plrole));
    if (chars[tt.plgend + 0] == ord('F'))
        otmp.spe = CORPSTAT_FEMALE;
    else if (chars[tt.plgend + 0] == ord('M'))
        otmp.spe = CORPSTAT_MALE;
    otmp = oname(otmp, tt.name, ONAME_NO_FLAGS);

    return otmp;
}

/* Randomly select a topten entry to mimic */
export function /* int */
tt_doppel(mon) {
    let tt = rn2(13) ? get_rnd_toptenentry() : null;
    let ret;

    if (!tt)
        ret = rn1(PM_WIZARD - PM_ARCHEOLOGIST + 1, PM_ARCHEOLOGIST);
    else {
        if (chars[tt.plgend + 0] == ord('F'))
            mon.female = 1;
        else if (chars[tt.plgend + 0] == ord('M'))
            mon.female = 0;
        ret = classmon(tt.plrole);
        /* Only take on a name if the player can see
           the doppelganger, otherwise we end up with
           named monsters spoiling the fun - Kes */
        if (canseemon(mon))
            christen_monst(mon, tt.name);
    }
    return ret;
}






















/*topten.c*/
import { LOGFILE } from "./config.h.js";
import { XLOGFILE } from "./config.h.js";
import { discover } from "./flag.h.macros.js";
import { wizard } from "./flag.h.macros.js";
import { BUFSZ } from "./global.h.js";
import { COLNO } from "./global.h.js";
import { FALSE } from "./global.h.js";
import { RECORD } from "./global.h.js";
import { TRUE } from "./global.h.js";
import { Strlen } from "./global.h.macros.js";
import { CORPSTAT_FEMALE } from "./hack.h.js";
import { CORPSTAT_MALE } from "./hack.h.js";
import { KILLED_BY } from "./hack.h.js";
import { KILLED_BY_AN } from "./hack.h.js";
import { NO_KILLER_PREFIX } from "./hack.h.js";
import { ONAME_NO_FLAGS } from "./hack.h.js";
import { PANICKED } from "./hack.h.js";
import { SCOREPREFIX } from "./hack.h.js";
import { astral_level } from "./hack.h.macros.js";
import { knox_level } from "./hack.h.macros.js";
import { rn1 } from "./hack.h.macros.js";
import { wiz1_level } from "./hack.h.macros.js";
import { Snprintf } from "./hacklib.h.macros.js";
import { NON_PM } from "./monsters.h.js";
import { PM_ARCHEOLOGIST } from "./monsters.h.js";
import { PM_HUMAN } from "./monsters.h.js";
import { PM_HUMAN_MUMMY } from "./monsters.h.js";
import { PM_RANGER } from "./monsters.h.js";
import { PM_WIZARD } from "./monsters.h.js";
import { PATCHLEVEL } from "./patchlevel.h.js";
import { VERSION_MAJOR } from "./patchlevel.h.js";
import { VERSION_MINOR } from "./patchlevel.h.js";
import { create_nhwindow } from "./winprocs.h.macros.js";
import { destroy_nhwindow } from "./winprocs.h.macros.js";
import { display_nhwindow } from "./winprocs.h.macros.js";
import { putstr } from "./winprocs.h.macros.js";
import { raw_print } from "./winprocs.h.macros.js";
import { raw_print_bold } from "./winprocs.h.macros.js";
import { ATR_BOLD } from "./wintype.h.js";
import { ATR_NONE } from "./wintype.h.js";
import { NHW_TEXT } from "./wintype.h.js";
import { WIN_ERR } from "./wintype.h.js";
import { ACH_AMUL } from "./you.h.js";
import { ACH_ASTR } from "./you.h.js";
import { ACH_BELL } from "./you.h.js";
import { ACH_BGRM } from "./you.h.js";
import { ACH_BOOK } from "./you.h.js";
import { ACH_CNDL } from "./you.h.js";
import { ACH_ENDG } from "./you.h.js";
import { ACH_HELL } from "./you.h.js";
import { ACH_INVK } from "./you.h.js";
import { ACH_MEDU } from "./you.h.js";
import { ACH_MINE } from "./you.h.js";
import { ACH_MINE_PRIZE } from "./you.h.js";
import { ACH_NOVL } from "./you.h.js";
import { ACH_ORCL } from "./you.h.js";
import { ACH_RNK1 } from "./you.h.js";
import { ACH_RNK2 } from "./you.h.js";
import { ACH_RNK3 } from "./you.h.js";
import { ACH_RNK4 } from "./you.h.js";
import { ACH_RNK5 } from "./you.h.js";
import { ACH_RNK6 } from "./you.h.js";
import { ACH_RNK7 } from "./you.h.js";
import { ACH_RNK8 } from "./you.h.js";
import { ACH_SHOP } from "./you.h.js";
import { ACH_SOKO } from "./you.h.js";
import { ACH_SOKO_PRIZE } from "./you.h.js";
import { ACH_TMPL } from "./you.h.js";
import { ACH_TOWN } from "./you.h.js";
import { ACH_TUNE } from "./you.h.js";
import { ACH_UWIN } from "./you.h.js";
import { A_ORIGINAL } from "./you.h.js";
import { N_ACH } from "./you.h.js";
import { Role_switch } from "./you.h.macros.js";
import { char } from "../rt/ctypes.js";
import { int } from "../rt/ctypes.js";
import { long } from "../rt/ctypes.js";
import { ord } from "../rt/ctypes.js";
import { sizeof } from "../rt/ctypes.js";
import { sizeof_string } from "../rt/ctypes.js";
import { unsigned } from "../rt/ctypes.js";
import { chars } from "../rt/heap.js";
import { stack_frame } from "../rt/heap.js";
import { stack_pop } from "../rt/heap.js";
import { or64 } from "../rt/int64.js";
import { shl64 } from "../rt/int64.js";
import { EOF } from "../rt/libc.js";
import { abs } from "../rt/libc.js";
import { atoi } from "../rt/libc.js";
import { fclose } from "../rt/libc.js";
import { fgetc } from "../rt/libc.js";
import { fgets } from "../rt/libc.js";
import { fprintf } from "../rt/libc.js";
import { free } from "../rt/libc.js";
import { fscanf } from "../rt/libc.js";
import { getuid } from "../rt/libc.js";
import { rewind } from "../rt/libc.js";
import { sprintf } from "../rt/libc.js";
import { sscanf } from "../rt/libc.js";
import { strcat } from "../rt/libc.js";
import { strchr } from "../rt/libc.js";
import { strcmp } from "../rt/libc.js";
import { strcpy } from "../rt/libc.js";
import { strlen } from "../rt/libc.js";
import { strncat } from "../rt/libc.js";
import { strncmp } from "../rt/libc.js";
import { init_string } from "../rt/locals.js";
import { stack_array } from "../rt/locals.js";
import { stack_var } from "../rt/locals.js";
import { static_array } from "../rt/locals.js";
import { static_struct } from "../rt/locals.js";
import { static_var } from "../rt/locals.js";
import { _ } from "../rt/strings.js";
import { addr_of } from "../rt/struct.js";
import { array_of } from "../rt/struct.js";
import { ptr_to } from "../rt/struct.js";
import { ref_add } from "../rt/struct.js";
import { ref_of } from "../rt/struct.js";
import { sizeof_member } from "../rt/struct.js";
import { struct } from "../rt/struct.js";
import { struct_assign } from "../rt/struct.js";
import { view_of } from "../rt/struct.js";
import { timet_to_seconds } from "./allmain.js";
import { alloc } from "./alloc.js";
import { rank_of } from "./botl.js";
import { rank_to_xlev } from "./botl.js";
import { yyyymmdd } from "./calendar.js";
import { flags } from "./decl.js";
import { gh } from "./decl.js";
import { gi } from "./decl.js";
import { gm } from "./decl.js";
import { gt } from "./decl.js";
import { gu } from "./decl.js";
import { iflags } from "./decl.js";
import { program_state } from "./decl.js";
import { svd } from "./decl.js";
import { svk } from "./decl.js";
import { svm } from "./decl.js";
import { svp } from "./decl.js";
import { u } from "./decl.js";
import { urealtime } from "./decl.js";
import { canseemon } from "./display.js";
import { christen_monst } from "./do_name.js";
import { oname } from "./do_name.js";
import { deepest_lev_reached } from "./dungeon.js";
import { depth } from "./dungeon.js";
import { init_dungeons } from "./dungeon.js";
import { fopen_datafile } from "./files.js";
import { lock_file } from "./files.js";
import { unlock_file } from "./files.js";
import { money_cnt } from "./hack.js";
import { copynchars } from "./hacklib.js";
import { digit } from "./hacklib.js";
import { eos } from "./hacklib.js";
import { highc } from "./hacklib.js";
import { lcase } from "./hacklib.js";
import { onlyspace } from "./hacklib.js";
import { ordin } from "./hacklib.js";
import { strNsubst } from "./hacklib.js";
import { strsubst } from "./hacklib.js";
import { num_genocides } from "./insight.js";
import { sokoban_in_play } from "./insight.js";
import { set_corpsenm } from "./mkobj.js";
import { an } from "./objnam.js";
import { impossible } from "./pline.js";
import { raw_printf } from "./pline.js";
import { rn2 } from "./rnd.js";
import { rnd } from "./rnd.js";
import { aligns } from "./role.js";
import { genders } from "./role.js";
import { roles } from "./role.js";
import { str2race } from "./role.js";
import { str2role } from "./role.js";
import { free_dungeons } from "./save.js";
import { sysopt } from "./sys.js";
import { hidden_gold } from "./vault.js";
