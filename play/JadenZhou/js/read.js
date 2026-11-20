// read.js — scroll/spellbook reading; wizard mode monster creation.
// C ref: read.c
//
// Ported so far: the candy wrapper helpers, create_particular() with
// create_particular_parse() and create_particular_creation() (used by
// #wizgenesis, ^G), and cant_revive(). The scroll effects are not ported
// yet.

import { rn2 } from './rng.js';
import { CANDY_BAR } from './objects.js';
import { game } from './gstate.js';
import {
    NEUTRAL, MALE, FEMALE, MM_FEMALE, MM_MALE, MM_MINVIS, MM_NOEXCLAM,
    NO_MM_FLAGS, NON_PM, ROWNO, COLNO, ismnum,
} from './const.js';
import { mons, G_UNIQ, PM_GUARD, PM_SHOPKEEPER, PM_HIGH_CLERIC,
         PM_ALIGNED_CLERIC, PM_ANGEL, PM_LONG_WORM_TAIL, PM_LONG_WORM,
         PM_HUMAN_ZOMBIE, PM_DOPPELGANGER } from './monsters.js';
import { pline } from './display.js';
import { tty_getlin } from './wintty.js';
import { mungspaces, strstri, strncmpi } from './hacklib.js';
import { name_to_mon } from './mondata.js';
import { makemon, makemon_flush_msg } from './makemon.js';

// C ref: read.c candy_wrappers[]
const candy_wrappers = [
    '',                         /* (none -- should never happen) */
    'Apollo',                   /* Lost */
    'Moon Crunchy',             /* South Park */
    'Snacky Cake',    'Chocolate Nuggie', 'The Small Bar',
    'Crispy Yum Yum', 'Nilla Crunchie',   'Berry Bar',
    'Choco Nummer',   'Om-nom', /* Cat Macro */
    'Fruity Oaty',              /* Serenity */
    'Wonka Bar',                /* Charlie and the Chocolate Factory */
];

// C ref: read.c candy_wrapper_text()
/* return the text of a candy bar's wrapper */
export function candy_wrapper_text(obj) {
    /* modulo operation is just bullet proofing; 'spe' is already in range */
    return candy_wrappers[obj.spe % candy_wrappers.length];
}

// C ref: read.c assign_candy_wrapper()
/* assign a wrapper to a candy bar stack */
export function assign_candy_wrapper(obj) {
    if (obj.otyp === CANDY_BAR) {
        /* skips candy_wrappers[0] */
        obj.spe = 1 + rn2(candy_wrappers.length - 1);
    }
    return;
}

/* C ref: read.c struct _create_particular_data */
function new_create_particular_data() {
    return {
        quan: 0, which: 0, fem: 0, genderconf: 0, monclass: 0,
        randmonst: false, maketame: false, makepeaceful: false,
        makehostile: false, sleeping: false, saddled: false,
        invisible: false, hidden: false,
    };
}

/* C ref: monsters.h MAXMCLASSES */
const MAXMCLASSES = 61;

/* C ref: mondata.h is_male(), is_female(), unique_corpstat() */
function is_male(ptr) { return (ptr.mflags2 & 0x00010000) !== 0; }   /* M2_MALE */
function is_female(ptr) { return (ptr.mflags2 & 0x00020000) !== 0; } /* M2_FEMALE */
function unique_corpstat(ptr) { return (ptr.geno & G_UNIQ) !== 0; }

// C ref: read.c cant_revive()
/* some creatures have special data structures that only make sense in their
 * normal locations -- if the player tries to create one elsewhere, or to
 * revive one, the disoriented creature becomes a zombie
 * (JS: mtype is { v }) */
export function cant_revive(mtype, revival, from_obj) {
    /* SHOPKEEPERS can be revived now */
    if (mtype.v === PM_GUARD || (mtype.v === PM_SHOPKEEPER && !revival)
        || mtype.v === PM_HIGH_CLERIC || mtype.v === PM_ALIGNED_CLERIC
        || mtype.v === PM_ANGEL) {
        mtype.v = PM_HUMAN_ZOMBIE;
        return true;
    } else if (mtype.v === PM_LONG_WORM_TAIL) { /* for create_particular() */
        mtype.v = PM_LONG_WORM;
        return true;
    } else if (unique_corpstat(mons[mtype.v])
               && (!from_obj || !from_obj.oextra?.omonst)) {
        /* unique corpses (from bones or wizard mode wish) or
           statues (bones or any wish) end up as shapechangers */
        mtype.v = PM_DOPPELGANGER;
        return true;
    }
    return false;
}

/* C ref: hacklib.c digit() */
function digit(c) { return c >= '0' && c <= '9'; }

// C ref: read.c create_particular_parse()
function create_particular_parse(str, d) {
    const gender_name_var = { v: NEUTRAL };
    let bufp = str;
    let tmpp;

    d.quan = 1 + ((game.multi > 0) ? game.multi : 0);
    d.monclass = MAXMCLASSES;
    d.which = game.urole.mnum; /* an arbitrary index into mons[] */
    d.fem = -1;     /* gender not specified */
    d.genderconf = -1;  /* no confusion on which gender to assign */
    d.randmonst = false;
    d.maketame = d.makepeaceful = d.makehostile = false;
    d.sleeping = d.saddled = d.invisible = d.hidden = false;

    /* quantity */
    if (digit(bufp[0] || '')) {
        d.quan = parseInt(bufp, 10);
        while (digit(bufp[0] || ''))
            bufp = bufp.slice(1);
        while (bufp[0] === ' ')
            bufp = bufp.slice(1);
    }
    const QUAN_LIMIT = (ROWNO * (COLNO - 1));
    /* maximum possible quantity is one per cell: (0..ROWNO-1) x (1..COLNO-1)
       [21*79==1659 for default map size; could subtract 1 for hero's spot] */
    if (d.quan < 1 || d.quan > QUAN_LIMIT)
        throw new Error('create_particular_parse(): monster_census() not ported yet');
    /* gear -- extremely limited number of possibilities supported;
       memset(tmpp, ' ', ...) blanks out the word */
    const blank = (word) => {
        if ((tmpp = strstri(bufp, word)) >= 0) {
            bufp = bufp.slice(0, tmpp) + ' '.repeat(word.length)
                   + bufp.slice(tmpp + word.length);
            return true;
        }
        return false;
    };
    if (blank("saddled "))
        d.saddled = true;
    /* state -- limited number of possibilities supported */
    if (blank("sleeping "))
        d.sleeping = true;
    if (blank("invisible "))
        d.invisible = true;
    if (blank("hidden "))
        d.hidden = true;
    /* check "female" before "male" to avoid false hit mid-word */
    if (blank("female "))
        d.fem = 1;
    if (blank("male "))
        d.fem = 0;
    bufp = mungspaces(bufp); /* after potential memset(' ') */
    /* allow the initial disposition to be specified */
    if (!strncmpi(bufp, "tame ", 5)) {
        bufp = bufp.slice(5);
        d.maketame = true;
    } else if (!strncmpi(bufp, "peaceful ", 9)) {
        bufp = bufp.slice(9);
        d.makepeaceful = true;
    } else if (!strncmpi(bufp, "hostile ", 8)) {
        bufp = bufp.slice(8);
        d.makehostile = true;
    }
    /* decide whether a valid monster was chosen */
    if (game.flags?.debug && (bufp === "*" || bufp === "random")) {
        d.randmonst = true;
        return true;
    }
    d.which = name_to_mon(bufp, gender_name_var);
    /*
     * With the introduction of male and female monster names
     * in 5.0, preserve that detail.
     *
     * If d->fem is already set to MALE or FEMALE at this juncture, it means
     * one of those terms was explicitly specified.
     */
    if (d.fem === MALE || d.fem === FEMALE) {     /* explicitly expressed */
        if ((gender_name_var.v !== NEUTRAL) && (d.fem !== gender_name_var.v)) {
            /* apparent selection incompatibility */
            d.genderconf = gender_name_var.v;        /* resolve later */
        }
        /* otherwise keep the value of d->fem, as it's okay */
    } else {  /* no explicit gender term was specified */
        d.fem = gender_name_var.v;
    }
    if (ismnum(d.which))
        return true; /* got one */
    if (!bufp)
        return false; /* name_to_monclass() of empty input returns 0 */
    throw new Error('create_particular_parse(): name_to_monclass() not ported yet');
}

// C ref: read.c create_particular_creation()
async function create_particular_creation(d) {
    let whichpm = null;
    let i, firstchoice = NON_PM;
    let mtmp;
    let madeany = false;

    if (!d.randmonst) {
        firstchoice = d.which;
        const mtype = { v: d.which };
        const r = cant_revive(mtype, false, null);
        d.which = mtype.v;
        if (r && firstchoice !== PM_LONG_WORM_TAIL)
            throw new Error('create_particular_creation(): "Creating %s instead; force %s?" (y_n) not ported yet');
        whichpm = mons[d.which];
    }
    for (i = 0; i < d.quan; i++) {
        let mmflags = NO_MM_FLAGS;

        if (d.monclass !== MAXMCLASSES)
            throw new Error('create_particular_creation(): mkclass() not ported yet');
        else if (d.randmonst)
            throw new Error('create_particular_creation(): rndmonst() not ported yet');
        if (d.genderconf === -1) {
            /* no conflict exists between explicit gender term and
               the specified monster name */
            if (d.fem !== -1 && (!whichpm || (!is_male(whichpm)
                                              && !is_female(whichpm))))
                mmflags |= (d.fem === FEMALE) ? MM_FEMALE
                               : (d.fem === MALE) ? MM_MALE : 0;
            /* no surprise; "<mon> appears." rather than "<mon> appears!" */
            mmflags |= MM_NOEXCLAM;
        } else {
            /* conundrum alert: an explicit gender term conflicts with an
               explicit gender-tied naming term (i.e. male cavewoman) */

            /* option chosen: let the explicit gender term (male or female)
               override the gender-tied naming term, so leave d->fem as-is */

            mmflags |= (d.fem === FEMALE) ? MM_FEMALE
                           : (d.fem === MALE) ? MM_MALE : 0;
        }
        if (d.invisible)
            mmflags |= MM_MINVIS;

        mtmp = makemon(whichpm, game.u.ux, game.u.uy, mmflags);
        await makemon_flush_msg();
        if (!mtmp) {
            /* quit trying if creation failed and is going to repeat */
            if (d.monclass === MAXMCLASSES && !d.randmonst)
                break;
            /* otherwise try again */
            continue;
        }
        if (d.maketame) {
            throw new Error('create_particular_creation(): tamedog() not ported yet');
        } else if (d.makepeaceful || d.makehostile) {
            throw new Error('create_particular_creation(): set_malign() for peaceful/hostile not ported yet');
        }
        if (d.saddled)
            throw new Error('create_particular_creation(): put_saddle_on_mon() not ported yet');
        if (d.hidden)
            throw new Error('create_particular_creation(): hidden monsters not ported yet');
        if (d.sleeping)
            mtmp.msleeping = 1;
        /* if asking for 'hidden', show location of every created monster
           that can't be seen--whether that's due to successfully hiding
           or vision issues (line-of-sight, invisibility, blindness) */
        if (d.invisible)
            throw new Error('create_particular_creation(): flash_mon() not ported yet');

        madeany = true;
        /* in case we got a doppelganger instead of what was asked
           for, make it start out looking like what was asked for */
        if (mtmp.cham !== NON_PM && firstchoice !== NON_PM
            && mtmp.cham !== firstchoice)
            throw new Error('create_particular_creation(): newcham() not ported yet');
    }
    return madeany;
}

// C ref: read.c create_particular()
/*
 * Make a new monster with the type controlled by the user.
 *
 * Note:  when creating a monster by class letter, specifying the
 * "strange object" (']') symbol produces a random monster rather
 * than a mimic.  This behavior quirk is useful so don't "fix" it
 * (use 'm'--or "mimic"--to create a random mimic).
 *
 * Used in wizard mode only (for ^G command and for scroll or spell
 * of create monster).  Once upon a time, an earlier incarnation of
 * this code was also used for the scroll/spell in explore mode.
 */
export async function create_particular() {
    const CP_TRYLIM = 5;
    const d = new_create_particular_data();
    let bufp, buf;
    let prompt;
    let tryct = CP_TRYLIM, altmsg = 0;

    buf = ''; /* for EDIT_GETLIN */
    prompt = "Create what kind of monster?";
    do {
        buf = await tty_getlin(prompt);
        bufp = mungspaces(buf);
        if (bufp[0] === '\x1b')
            return false;

        if (create_particular_parse(bufp, d))
            break;

        /* no good; try again... */
        if (bufp || altmsg || tryct < 2) {
            await pline("I've never heard of such monsters.");
        } else {
            await pline("Try again (type * for random, ESC to cancel).");
            ++altmsg;
        }
        /* when a second try is needed, expand the prompt */
        if (tryct === CP_TRYLIM)
            prompt += " [type name or symbol]";
    } while (--tryct > 0);

    if (!tryct)
        await pline("That's enough tries!");
    else
        return await create_particular_creation(d);

    return false;
}
