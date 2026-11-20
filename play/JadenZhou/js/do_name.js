// do_name.js -- monster naming (C ref: do_name.c).
//
// Ported so far: christen_monst(), rndghostname(), noveltitle(), the x_monnam()
// family.

import { game } from './gstate.js';
import { rn2, ROLL_FROM } from './rng.js';
import { canspotmon } from './display.js';
import { highc } from './hacklib.js';
import { just_an } from './objnam.js';
import { is_neuter } from './mondata.js';
import { M1_HUMANOID } from './monsters.js';
import { MALE, FEMALE, NEUTRAL, NUM_MGENDERS, M_AP_MONSTER, W_SADDLE,
         HALLUC, BLINDED } from './const.js';
import { mons, M2_PNAME, G_UNIQ, PM_GHOST, PM_WIZARD_OF_YENDOR,
         PM_ARCHEOLOGIST, PM_WIZARD } from './monsters.js';

import { getobj } from './invent.js';
import { name_ok, call_ok } from './iactions.js';
import { xname } from './objnam.js';
import { You } from './display.js';
import { tty_create_nhwindow, tty_start_menu, tty_add_menu, tty_end_menu,
         tty_select_menu, tty_destroy_nhwindow } from './wintty.js';
import { NHW_MENU, MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE, PICK_ONE,
         GETOBJ_PROMPT, GETOBJ_NOFLAGS, ECMD_OK } from './const.js';
import { NO_COLOR, ATR_NONE } from './terminal.js';

const PL_PSIZ = 63; /* global.h */

// C ref: do_name.c docallcmd() -- #call / #name command to give a name
// to a monster, an object or an object type
export async function docallcmd() {
    let obj;
    let ch = '\0';
    /* if player wants a,b,c instead of i,o when looting, do that here too */
    const abc = !!game.flags?.lootabc;
    const clr = NO_COLOR;

    if (game.cmdq?.length) {
        const cq = game.cmdq.shift();
        if (cq.typ === 'key')
            ch = cq.key;
        else
            game.cmdq = []; /* cmdq_clear(CQ_CANNED) */
    } else {
        const win = tty_create_nhwindow(NHW_MENU);
        tty_start_menu(win, MENU_BEHAVE_STANDARD);
        /* any.a_char = 'm'; group accelerator 'C' */
        tty_add_menu(win, null, 'm', abc ? 0 : 'm', 'C', ATR_NONE, clr,
                     "a monster", MENU_ITEMFLAGS_NONE);
        if (game.invent) {
            /* we use y and n as accelerators so that we can accept user's
               response keyed to old "name an individual object?" prompt */
            tty_add_menu(win, null, 'i', abc ? 0 : 'i', 'y', ATR_NONE, clr,
                         "a particular object in inventory",
                         MENU_ITEMFLAGS_NONE);
            tty_add_menu(win, null, 'o', abc ? 0 : 'o', 'n', ATR_NONE, clr,
                         "the type of an object in inventory",
                         MENU_ITEMFLAGS_NONE);
        }
        tty_add_menu(win, null, 'f', abc ? 0 : 'f', ',', ATR_NONE, clr,
                     "the type of an object upon the floor",
                     MENU_ITEMFLAGS_NONE);
        tty_add_menu(win, null, 'd', abc ? 0 : 'd', '\\', ATR_NONE, clr,
                     "the type of an object on discoveries list",
                     MENU_ITEMFLAGS_NONE);
        tty_add_menu(win, null, 'a', abc ? 0 : 'a', 'l', ATR_NONE, clr,
                     "record an annotation for the current level",
                     MENU_ITEMFLAGS_NONE);
        tty_end_menu(win, "What do you want to name?");
        const res = await tty_select_menu(win, PICK_ONE);
        if (res.n > 0)
            ch = res.selected[0].item;
        else
            ch = 'q';
        await tty_destroy_nhwindow(win);
    }

    /* docallcmd: */
    switch (ch) {
    default:
    case 'q':
        break;
    case 'm': /* name a visible monster */
        throw new Error('docallcmd(): do_mgivenname() not ported yet');
    case 'i': /* name an individual object in inventory */
        obj = await getobj("name", name_ok, GETOBJ_PROMPT);
        if (obj)
            throw new Error('docallcmd(): do_oname() not ported yet');
        break;
    case 'o': /* name a type of object in inventory */
        obj = await getobj("call", call_ok, GETOBJ_NOFLAGS);
        if (obj) {
            /* behave as if examining it in inventory;
               this might set dknown if it was picked up
               while blind and the hero can now see */
            xname(obj);

            if (!obj.dknown) {
                await You("would never recognize another one.");
            } else {
                throw new Error('docallcmd(): docall() not ported yet');
            }
        }
        break;
    case 'f': /* name a type of object visible on the floor */
        throw new Error('docallcmd(): namefloorobj() not ported yet');
    case 'd': /* name a type of object on the discoveries list */
        throw new Error('docallcmd(): rename_disco() not ported yet');
    case 'a': /* annotate level */
        throw new Error('docallcmd(): donamelevel() not ported yet');
    }
    return ECMD_OK;
}

// C ref: do_name.c christen_monst()
export function christen_monst(mtmp, name) {
    let lth;

    /* dogname & catname are PL_PSIZ arrays; object names have same limit */
    lth = (name && name.length) ? (name.length + 1) : 0;
    if (lth > PL_PSIZ) {
        lth = PL_PSIZ;
        name = name.slice(0, PL_PSIZ - 1);
    }
    /* new_mgivenname(mtmp, lth): removes old name if one is present */
    mtmp.mgivenname = lth ? name : '';
    /* if 'mtmp' is leashed, persistent inventory window needs updating:
       update_inventory() -- leashes aren't ported yet */
    return mtmp;
}

import { exist_artifact, artifact_exists } from './artifact.js';
import { ONAME_VIA_NAMING, ONAME_SKIP_INVUPD } from './const.js';

// C ref: do_name.c oname()
export function oname(
    obj,   /* item to assign name to */
    name,  /* name to assign */
    oflgs) /* flags, mostly for artifact creation */
{
    let lth;
    const via_naming = (oflgs & ONAME_VIA_NAMING) !== 0,
          skip_inv_update = (oflgs & ONAME_SKIP_INVUPD) !== 0;

    lth = name ? (name.length + 1) : 0;
    if (lth > PL_PSIZ) {
        lth = PL_PSIZ;
        name = name.slice(0, PL_PSIZ - 1);
    }
    /* If named artifact exists in the game, do not create another.
       Also trying to create an artifact shouldn't de-artifact
       it (e.g. Excalibur from prayer). In this case the object
       will retain its current name. */
    if (obj.oartifact || (lth && exist_artifact(obj.otyp, name)))
        return obj;

    /* new_oname(obj, lth): removes old name if one is present */
    if (!obj.oextra)
        obj.oextra = {};
    obj.oextra.oname = lth ? name : '';

    if (lth)
        artifact_exists(obj, name, true, oflgs);
    if (obj.oartifact) {
        /* can't dual-wield with artifact as secondary weapon */
        if (obj === game.uswapwep)
            throw new Error('oname(): untwoweapon() is not ported yet');
        /* activate warning if you've just named your weapon "Sting" */
        if (obj === game.uwep)
            throw new Error('oname(): set_artifact_intrinsic() is not ported yet');
        /* if obj is owned by a shop, increase your bill */
        if (obj.unpaid)
            throw new Error('oname(): alter_cost() is not ported yet');
        if (via_naming) {
            /* violate illiteracy conduct since successfully wrote arti-name */
            const literate = game.u.uconduct.literate || 0;
            game.u.uconduct.literate = literate + 1;
            if (!literate) {
                /* livelog_printf(): no livelog */
            }
        }
    }
    /* if (carried(obj) && !skip_inv_update) update_inventory():
       no persistent inventory window */
    void skip_inv_update;
    return obj;
}

const ghostnames = [
    /* these names should have length < PL_NSIZ */
    /* Capitalize the names for aesthetics -dgk */
    "Adri",    "Andries",       "Andreas",     "Bert",    "David",  "Dirk",
    "Emile",   "Frans",         "Fred",        "Greg",    "Hether", "Jay",
    "John",    "Jon",           "Karnov",      "Kay",     "Kenny",  "Kevin",
    "Maud",    "Michiel",       "Mike",        "Peter",   "Robert", "Ron",
    "Tom",     "Wilmar",        "Nick Danger", "Phoenix", "Jiro",   "Mizue",
    "Stephan", "Lance Braccus", "Shadowhawk",  "Murphy",
];

// C ref: do_name.c rndghostname()
/* ghost names formerly set by x_monnam(), now by makemon() instead */
export function rndghostname() {
    return rn2(7) ? ROLL_FROM(ghostnames)
                  : game.plname;
}

// C ref: do_name.c sir_Terry_novels[]
/* Discworld novel titles, in the order that they were published; a subset
   of them have index macros used for variant spellings; if the titles are
   reordered for some reason, make sure that those get renumbered to match */
const sir_Terry_novels = [
    "The Colour of Magic", "The Light Fantastic", "Equal Rites", "Mort",
    "Sourcery", "Wyrd Sisters", "Pyramids", "Guards! Guards!", "Eric",
    "Moving Pictures", "Reaper Man", "Witches Abroad", "Small Gods",
    "Lords and Ladies", "Men at Arms", "Soul Music", "Interesting Times",
    "Maskerade", "Feet of Clay", "Hogfather", "Jingo", "The Last Continent",
    "Carpe Jugulum", "The Fifth Elephant", "The Truth", "Thief of Time",
    "The Last Hero", "The Amazing Maurice and His Educated Rodents",
    "Night Watch", "The Wee Free Men", "Monstrous Regiment",
    "A Hat Full of Sky", "Going Postal", "Thud!", "Wintersmith",
    "Making Money", "Unseen Academicals", "I Shall Wear Midnight", "Snuff",
    "Raising Steam", "The Shepherd's Crown"
];

// C ref: do_name.c noveltitle()
/* 'novidx' is the C int *novidx: an object { v } (or null); a -1 index is
   set to the title picked */
export function noveltitle(novidx) {
    let j;
    const k = sir_Terry_novels.length;

    j = rn2(k);
    if (novidx) {
        if (novidx.v === -1)
            novidx.v = j;
        else if (novidx.v >= 0 && novidx.v < k)
            j = novidx.v;
    }
    return sir_Terry_novels[j];
}

/* C ref: hack.h ARTICLE_* and the x_monnam() suppress flags */
export const ARTICLE_NONE = 0;
export const ARTICLE_THE = 1;
export const ARTICLE_A = 2;
export const ARTICLE_YOUR = 3;
export const SUPPRESS_IT = 0x01;
export const SUPPRESS_INVISIBLE = 0x02;
export const SUPPRESS_HALLUCINATION = 0x04;
export const SUPPRESS_SADDLE = 0x08;
export const SUPPRESS_MAPPEARANCE = 0x10;
export const EXACT_NAME = 0x1F;
export const SUPPRESS_NAME = 0x20;
export const AUGMENT_IT = 0x40;

/* C ref: monst.h has_mgivenname(); mondata.h type_is_pname(),
   is_mplayer() */
function has_mgivenname(mtmp) { return !!mtmp.mgivenname; }
function type_is_pname(ptr) { return (ptr.mflags2 & M2_PNAME) !== 0; }
function is_mplayer(ptr) {
    const n = mons.indexOf(ptr);
    return n >= PM_ARCHEOLOGIST && n <= PM_WIZARD;
}
/* C ref: mondata.c pmname(); mondata.h mon_pmname() */
function pmname(pm, mgender) {
    if ((mgender >= MALE && mgender < NUM_MGENDERS) && pm.pmnames[mgender])
        return pm.pmnames[mgender];
    return pm.pmnames[NEUTRAL];
}
function mon_pmname(mon) {
    return pmname(mon.data, mon.female ? FEMALE : MALE);
}
function uhave(prop) {
    const p = game.u?.uprops?.[prop];
    return !!(p && (p.intrinsic || p.extrinsic));
}

// C ref: do_name.c x_monnam() -- the cases reached so far; hallucinatory
// names, priests/minions, shopkeepers, mimic appearances, ghost and
// player-monster names and ARTICLE_A are not ported yet
export function x_monnam(mtmp, article, adjective, suppress, called) {
    const u = game.u;
    const mdat = mtmp.data;
    let pm_name;
    let name_at_start, has_adjectives, insertbuf2;
    const mappear_as_mon = (mtmp.m_ap_type === M_AP_MONSTER);
    let buf = '', buf2 = '';

    if (mtmp === game.youmonst)
        return "you"; /* ignore article, "invisible", &c */
    if (game.program_state?.gameover)
        suppress |= SUPPRESS_HALLUCINATION;
    if (article === ARTICLE_YOUR && !mtmp.mtame)
        article = ARTICLE_THE;
    if (u.uswallow && mtmp === u.ustuck) {
        article = ARTICLE_THE;
        suppress |= SUPPRESS_INVISIBLE;
    }
    const do_hallu = uhave(HALLUC) && !(suppress & SUPPRESS_HALLUCINATION);
    const do_invis = mtmp.minvis && !(suppress & SUPPRESS_INVISIBLE);
    const do_it = !canspotmon(mtmp) && article !== ARTICLE_YOUR
            && !game.program_state?.gameover && mtmp !== u.usteed
            /* && !engulfing_u(mtmp) */ && !(suppress & SUPPRESS_IT);
    const do_saddle = !(suppress & SUPPRESS_SADDLE);
    const do_mappear = mappear_as_mon && !(suppress & SUPPRESS_MAPPEARANCE);
    const do_name = !(suppress & SUPPRESS_NAME) || type_is_pname(mdat);
    const augment_it = (suppress & AUGMENT_IT) !== 0;

    /* unseen monsters, etc.; usually "it" but sometimes more specific */
    if (do_it) {
        if (!augment_it)
            return "it";
        throw new Error('x_monnam(): AUGMENT_IT not ported yet');
    }

    /* priests and minions: don't even use this function */
    if ((mtmp.ispriest || mtmp.isminion) && !do_mappear)
        throw new Error('x_monnam(): priestname() not ported yet');

    /* 'pm_name' is the base part of most names */
    if (do_mappear)
        throw new Error('x_monnam(): mimic appearance not ported yet');
    pm_name = mon_pmname(mtmp);

    /* Shopkeepers: use shopkeeper name */
    if (mtmp.isshk && !do_hallu && !do_mappear)
        throw new Error('x_monnam(): shkname() not ported yet');

    /* Put the adjectives in the buffer */
    if (adjective)
        buf += adjective + " ";
    if (do_invis)
        buf += "invisible ";
    /* Blind: only the BLINDED property is checked so far */
    if (do_saddle && ((mtmp.misc_worn_check ?? 0) & W_SADDLE)
        && !uhave(BLINDED) && !uhave(HALLUC))
        buf += "saddled ";
    has_adjectives = (buf !== '');

    /* Put the actual monster name or type into the buffer now.
       Remember whether the buffer starts with a personal name. */
    if (do_hallu) {
        throw new Error('x_monnam(): rndmonnam() not ported yet');
    } else if (do_name && has_mgivenname(mtmp)) {
        const name = mtmp.mgivenname;

        if (mdat === mons[PM_GHOST]) {
            throw new Error('x_monnam(): ghost names not ported yet');
        } else if (called) {
            buf += `${pm_name} called ${name}`;
            name_at_start = type_is_pname(mdat);
        } else if (is_mplayer(mdat) && name.includes(" the ")) {
            throw new Error('x_monnam(): player-monster names not ported yet');
        } else {
            buf += name;
            name_at_start = true;
        }
    } else if (is_mplayer(mdat) /* && !In_endgame(&u.uz) */) {
        throw new Error('x_monnam(): rank_of() not ported yet');
    } else {
        buf += pm_name;
        name_at_start = type_is_pname(mdat);
    }

    if (name_at_start && (article === ARTICLE_YOUR || !has_adjectives)) {
        if (mdat === mons[PM_WIZARD_OF_YENDOR])
            article = ARTICLE_THE;
        else
            article = ARTICLE_NONE;
    } else if ((mdat.geno & G_UNIQ) !== 0 && article === ARTICLE_A) {
        article = ARTICLE_THE;
    }

    insertbuf2 = true;
    switch (article) {
    case ARTICLE_YOUR:
        buf2 = "your ";
        break;
    case ARTICLE_THE:
        buf2 = "the ";
        break;
    case ARTICLE_A:
        /* avoid an() here */
        buf2 = just_an(buf); /* copy "a " or "an " into buf2[] */
        break;
    case ARTICLE_NONE:
    default:
        insertbuf2 = false;
        break;
    }
    if (insertbuf2)
        buf = buf2 + buf;
    return buf;
}

// C ref: do_name.c mon_nam()
export function mon_nam(mtmp) {
    return x_monnam(mtmp, ARTICLE_THE, null,
                    has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0, false);
}

// C ref: do_name.c Monnam()
export function Monnam(mtmp) {
    const bp = mon_nam(mtmp);
    return highc(bp[0]) + bp.slice(1);
}

// C ref: do_name.c y_monnam() -- pet name: "your little dog"
export function y_monnam(mtmp) {
    const prefix = mtmp.mtame ? ARTICLE_YOUR : ARTICLE_THE;
    const suppression_flag = (has_mgivenname(mtmp)
                              /* "saddled" is redundant when mounted */
                              || mtmp === game.u.usteed)
                                 ? SUPPRESS_SADDLE : 0;
    return x_monnam(mtmp, prefix, null, suppression_flag, false);
}

// C ref: do_name.c YMonnam() -- y_monnam() for start of sentence
export function YMonnam(mtmp) {
    const bp = y_monnam(mtmp);
    return highc(bp[0]) + bp.slice(1);
}

// C ref: do_name.c noit_mon_nam() -- the same as mon_nam(), but never "it"
export function noit_mon_nam(mtmp) {
    return x_monnam(mtmp, ARTICLE_YOUR, null,
                    has_mgivenname(mtmp) ? (SUPPRESS_SADDLE | SUPPRESS_IT)
                                         : SUPPRESS_IT,
                    false);
}

// C ref: do_name.c noit_Monnam()
export function noit_Monnam(mtmp) {
    const bp = noit_mon_nam(mtmp);
    return highc(bp[0]) + bp.slice(1);
}

// C ref: do_name.c m_monnam() -- monster's own name, with no article
// or "invisible"/"saddled" adjectives
export function m_monnam(mtmp) {
    return x_monnam(mtmp, ARTICLE_NONE, null, EXACT_NAME, false);
}

// C ref: do_name.c a_monnam()
export function a_monnam(mtmp) {
    return x_monnam(mtmp, ARTICLE_A, null,
                    has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0, false);
}

// C ref: do_name.c Amonnam()
export function Amonnam(mtmp) {
    const bp = a_monnam(mtmp);
    return highc(bp[0]) + bp.slice(1);
}

/* C ref: mondata.h PRONOUN_NO_IT, PRONOUN_HALLU */
export const PRONOUN_NO_IT = 1;
export const PRONOUN_HALLU = 2;

// C ref: mondata.c pronoun_gender()
/* pg_flags&1: 'no it' unless neuter, pg_flags&2: random if hallucinating */
export function pronoun_gender(mtmp, pg_flags) {
    const override_vis = (pg_flags & PRONOUN_NO_IT) !== 0,
          hallu_rand = (pg_flags & PRONOUN_HALLU) !== 0;

    if (hallu_rand && uhave(HALLUC))
        return rn2(4); /* 0..3 */
    if (!override_vis && !canspotmon(mtmp))
        return 2;
    if (is_neuter(mtmp.data))
        return 2;
    return ((mtmp.data.mflags1 & M1_HUMANOID) !== 0
            || (mtmp.data.geno & G_UNIQ) !== 0
            || type_is_pname(mtmp.data)) ? (mtmp.female ? 1 : 0) : 2;
}

// C ref: do_name.c mon_nam_too() -- mon_nam(), or a reflexive pronoun
// when mon is other_mon
export function mon_nam_too(mon, other_mon) {
    if (mon !== other_mon)
        return mon_nam(mon);
    switch (pronoun_gender(mon, PRONOUN_HALLU)) {
    case 0:
        return "himself";
    case 1:
        return "herself";
    default:
    case 2:
        return "itself";
    case 3: /* could happen when hallucinating */
        return "themselves";
    }
}
