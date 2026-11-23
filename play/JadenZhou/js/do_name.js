// do_name.js -- monster naming (C ref: do_name.c).
//
// Ported so far: christen_monst(), rndghostname(), noveltitle(), the x_monnam()
// family.

import { set_artifact_intrinsic_sync } from './artifact.js';
import { livelog_printf } from './display.js';
import { LL_CONDUCT, LL_ARTIFACT } from './const.js';
import { ansimpleoname, bare_artifactname } from './iactions.js';
import { W_WEP } from './const.js';
import { game } from './gstate.js';
import { rn2, ROLL_FROM, rn2_on_display_rng } from './rng.js';
import { canspotmon } from './display.js';
import { highc, s_suffix, dist2 } from './hacklib.js';
import { just_an, vtense, makeplural } from './objnam.js';
import { genders } from './role.js';
import { is_neuter } from './mondata.js';
import { M1_HUMANOID, M1_ANIMAL, M1_MINDLESS, G_NOGEN, LOW_PM, SPECIAL_PM,
         PM_SHOPKEEPER, PM_ALIGNED_CLERIC, PM_HIGH_CLERIC } from './monsters.js';
import { MALE, FEMALE, NEUTRAL, NUM_MGENDERS, M_AP_MONSTER, W_SADDLE,
         HALLUC, HALLUC_RES, BLINDED, In_endgame, Is_astralevel,
         engulfing_u } from './const.js';
import { mons, M2_PNAME, G_UNIQ, PM_GHOST, PM_WIZARD_OF_YENDOR,
         PM_ARCHEOLOGIST, PM_WIZARD } from './monsters.js';
import { get_rnd_text, BOGUSMONFILE, MD_PAD_BOGONS } from './rumors.js';
import { shkname } from './shknam.js';
import { halu_gname } from './pray.js';
import { rank_of } from './botl.js';

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
            await do_oname(obj);
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
        await donamelevel();
        break;
    }
    return ECMD_OK;
}

// C ref: do_name.c safe_oname()
export function safe_oname(obj) {
    if (obj.oextra?.oname) /* has_oname(obj) */
        return obj.oextra.oname; /* ONAME(obj) */
    return "";
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

import { exist_artifact, artifact_exists, artifact_name,
         restrict_name } from './artifact.js';
import { donamelevel } from './dungeon.js';
import { ONAME_VIA_NAMING, ONAME_SKIP_INVUPD, ONAME_KNOW_ARTI, QBUFSZ,
         HAND } from './const.js';
import { safe_qbuf } from './pickup.js';
import { simpleonames } from './iactions.js';
import { mungspaces, strncmpi } from './hacklib.js';
import { tty_getlin, tty_display_nhwindow } from './wintty.js';
import { wipeout_text } from './engrave.js';
import { rnd_on_display_rng } from './rng.js';
import { pline } from './display.js';
import { body_part } from './insight.js';
import { SPE_NOVEL } from './objects.js';

// C ref: do_name.c name_from_player() -- get a name for a monster or an
// object from player; truncate if longer than PL_PSIZ, then return it
// (null for no name); the !EDIT_GETLIN build ignores defres
async function name_from_player(prompt, defres) {
    void defres;
    let outbuf = await tty_getlin(prompt);
    if (!outbuf || outbuf[0] === '\x1b')
        return null;

    /* strip leading and trailing spaces, condense internal sequences */
    outbuf = mungspaces(outbuf);
    if (outbuf.length >= PL_PSIZ)
        outbuf = outbuf.slice(0, PL_PSIZ - 1);
    return outbuf;
}

// C ref: do_name.c do_oname() -- name an individual object
async function do_oname(obj) {
    let bufp, buf, bufcpy, qbuf;
    let aname;
    const objtyp = { otyp: 0 /* STRANGE_OBJECT */ };

    /* Do this now because there's no point in even asking for a name */
    if (obj.otyp === SPE_NOVEL)
        throw new Error('do_oname(): Ysimple_name2() for a novel not ported yet');

    /* is_plural(): quan != 1 (the Eyes of the Overworld case aside) */
    qbuf = `What do you want to name ${(obj.quan !== 1) ? "these" : "this"} `;
    qbuf = safe_qbuf(qbuf, "?", obj, xname, "item");
    /* use getlin() to get a name string from the player */
    if ((buf = await name_from_player(qbuf, safe_oname(obj))) === null)
        return;

    /*
     * We don't violate illiteracy conduct here, although it is
     * arguable that we should for anything other than "X".  Doing so
     * would make attaching player's notes to hero's inventory have an
     * in-game effect, which may or may not be the correct thing to do.
     *
     * We do violate illiteracy in oname() if player creates Sting or
     * Orcrist, clearly being literate (no pun intended...).
     */

    if (obj.oartifact) {
        /* this used to give "The artifact seems to resist the attempt."
           but resisting is definite, no "seems to" about it */
        await pline(`${obj.oextra?.oname ? obj.oextra.oname
                                         : "The artifact"} resists the attempt.`);
        return;
    }

    /* relax restrictions over proper capitalization for artifacts */
    if ((aname = artifact_name(buf, objtyp, true)) !== null
        && (restrict_name(obj, aname) || exist_artifact(obj.otyp, aname))) {
        /* substitute canonical spelling before slippage */
        buf = aname;
        /* the hand slip scuffs one or two letters as if the text had
           been trodden upon */
        bufcpy = buf;
        /* for "the Foo of Bar", only scuff "Foo of Bar" part */
        const off = !strncmpi(buf, "the ", 4) ? 4 : 0;
        do {
            bufp = buf.slice(off);
            buf = buf.slice(0, off) + wipeout_text(bufp, rnd_on_display_rng(2), 0);
        } while (buf === bufcpy);
        await pline(`While engraving, your ${body_part(HAND)} slips.`);
        await tty_display_nhwindow(game.WIN_MESSAGE, false);
        await You(`engrave: "${buf}".`);
        /* violate illiteracy conduct since hero attempted to write
           a valid artifact name */
        game.u.uconduct.literate = (game.u.uconduct.literate || 0) + 1;
    } else if (obj.otyp === objtyp.otyp) {
        /* artifact_name() found a match and restrict_name() didn't reject
           it; since 'obj' is the right type, naming will change it into an
           artifact so use canonical capitalization (Sting or Orcrist) */
        buf = aname;
    }

    obj = oname(obj, buf, ONAME_VIA_NAMING | ONAME_KNOW_ARTI);
}


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
            set_artifact_intrinsic_sync(obj, true, W_WEP);
        /* if obj is owned by a shop, increase your bill */
        if (obj.unpaid)
            throw new Error('oname(): alter_cost() is not ported yet');
        if (via_naming) {
            /* violate illiteracy conduct since successfully wrote arti-name */
            if (!game.u.uconduct.literate++)
                livelog_printf(LL_CONDUCT | LL_ARTIFACT,
                               `became literate by naming ${bare_artifactname(obj)}`);
            else
                livelog_printf(LL_ARTIFACT,
                               `chose ${ansimpleoname(obj)} to be named "${bare_artifactname(obj)}"`);
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
export function pmname(pm, mgender) {
    if ((mgender >= MALE && mgender < NUM_MGENDERS) && pm.pmnames[mgender])
        return pm.pmnames[mgender];
    return pm.pmnames[NEUTRAL];
}
export function mon_pmname(mon) {
    return pmname(mon.data, mon.female ? FEMALE : MALE);
}
function uhave(prop) {
    const p = game.u?.uprops?.[prop];
    return !!(p && (p.intrinsic || p.extrinsic));
}

/* C ref: you.h Hallucination -- HHallucination && !Halluc_resistance */
function Hallucination() {
    return uhave(HALLUC) && !uhave(HALLUC_RES);
}
/* C ref: do_name.c Mgender() */
export function Mgender(mtmp) {
    let mgender = MALE;

    if (mtmp === game.youmonst) {
        if ((game.u.umonnum !== game.u.umonster) ? game.u.mfemale
                                                 : game.flags?.female)
            mgender = FEMALE;
    } else if (mtmp.female) {
        mgender = FEMALE;
    }
    return mgender;
}
/* C ref: mondata.h humanoid(), is_animal(), mindless() */
function humanoid(ptr) { return (ptr.mflags1 & M1_HUMANOID) !== 0; }
function is_animal(ptr) { return (ptr.mflags1 & M1_ANIMAL) !== 0; }
function mindless(ptr) { return (ptr.mflags1 & M1_MINDLESS) !== 0; }
/* C ref: you.h m_next2u() */
function m_next2u(m) {
    return dist2(m.mx, m.my, game.u.ux, game.u.uy) <= 2;
}

// C ref: do_name.c bogon_codes[]
const bogon_codes = "-_+|="; /* see dat/bonusmon.txt */

// C ref: do_name.c bogusmon()
/* fake monsters used to be in a hard-coded array, now in a data file;
   'code' is an object { c } (or null) that gets the prefix code */
export function bogusmon(code) {
    const buf = { s: '' };
    let mnam;

    if (code)
        code.c = '';
    /* might fail (return empty buf[]) if the file isn't available */
    get_rnd_text(BOGUSMONFILE, buf, rn2_on_display_rng, MD_PAD_BOGONS);
    mnam = buf.s;
    if (!mnam) {
        mnam = "bogon";
    } else if (bogon_codes.includes(mnam[0])) { /* strip prefix if present */
        if (code)
            code.c = mnam[0];
        mnam = mnam.slice(1);
    }
    return mnam;
}

// C ref: do_name.c rndmonnam()
/* return a random monster name, for hallucination */
export function rndmonnam(code) {
    let mnam;
    let name;
    const BOGUSMONSIZE = 100; /* arbitrary */

    if (code)
        code.c = '';

    do {
        name = rn2_on_display_rng(SPECIAL_PM + BOGUSMONSIZE - LOW_PM) + LOW_PM;
    } while (name < SPECIAL_PM
             && (type_is_pname(mons[name]) || (mons[name].geno & G_NOGEN)));

    if (name >= SPECIAL_PM) {
        mnam = bogusmon(code);
    } else {
        mnam = pmname(mons[name], rn2_on_display_rng(2));
    }
    return mnam;
}

// C ref: do_name.c bogon_is_pname()
/* check bogusmon prefix to decide whether it's a personal name */
export function bogon_is_pname(code) {
    if (!code)
        return false;
    return "-+=".includes(code);
}

// C ref: priest.c priestname()
/* 'Hallucination' is passed in as do_hallu_in by x_monnam(), which blocks
   it via EHalluc_resistance when the true name is wanted */
export function priestname(mon, article, reveal_high_priest) {
    const do_hallu = Hallucination(),
          aligned_priest = mon.data === mons[PM_ALIGNED_CLERIC],
          high_priest = mon.data === mons[PM_HIGH_CLERIC];
    const whatcode = { c: '' };
    let what = do_hallu ? rndmonnam(whatcode) : mon_pmname(mon);
    let pname;

    if (!mon.ispriest && !mon.isminion) /* should never happen...  */
        return what;                    /* caller must be confused */

    /* for high priest(ess), "high" (or "grand" for poohbah) will be inserted
       [this was done near the end but we want 'what' to be updated sooner] */
    if (mon.ispriest || aligned_priest || high_priest)
        what = do_hallu ? "poohbah" : mon.female ? "priestess" : "priest";

    pname = '';
    if (article !== ARTICLE_NONE && (!do_hallu || !bogon_is_pname(whatcode.c))) {
        if (article === ARTICLE_YOUR || (article === ARTICLE_A && high_priest))
            article = ARTICLE_THE;
        if (article === ARTICLE_THE) {
            pname = "the ";
        } else if (what === "Angel") {
            /* bypass just_an(); it would yield "" due to treating capital A
               as indicating a personal name */
            pname = "an ";
        } else {
            pname = just_an(what);
        }
    }
    /* pname[] contains "" or {"a ","an ","the "} */
    if (mon.minvis) {
        /* avoid "a invisible priest" */
        if (pname === "a ")
            pname = "an ";
        pname += "invisible ";
    }
    if (mon.isminion && mon.emin?.renegade) {
        /* avoid "an renegade Angel" */
        if (pname === "an " && !mon.minvis)
            pname = "a ";
        pname += "renegade ";
    }

    if (mon.ispriest || aligned_priest) {
        if (high_priest)
            pname += do_hallu ? "grand " : "high ";
    } else {
        if (mon.mtame && what.toLowerCase() === "angel")
            pname += "guardian ";
    }

    pname += what;
    /* same as distant_monnam(), more or less... */
    if (do_hallu || !high_priest || reveal_high_priest
        || !Is_astralevel(game.u.uz)
        || m_next2u(mon) || game.program_state?.gameover) {
        pname += " of ";
        pname += halu_gname(mon_aligntyp(mon));
    }
    return pname;
}

/* C ref: mondata.c mon_aligntyp() */
function mon_aligntyp(mon) {
    const ptr = mon.data;
    const algn = (mon.ispriest && mon.epri) ? mon.epri.shralign
                 : (mon.isminion && mon.emin) ? mon.emin.min_align
                 : ptr.maligntyp;
    if (algn === -128) /* A_NONE */
        return -128;
    return (algn > 0) ? 1 : (algn < 0) ? -1 : 0; /* sgn() */
}

// C ref: do_name.c x_monnam()
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
        /*
         * This monster has become important, for the moment anyway.
         * As the hero's consumer, it is worthy of ARTICLE_THE.
         * Also, suppress invisible as that particular characteristic
         * is unimportant now and you can see its interior anyway.
         */
        article = ARTICLE_THE;
        suppress |= SUPPRESS_INVISIBLE;
    }
    const do_hallu = Hallucination() && !(suppress & SUPPRESS_HALLUCINATION);
    const do_invis = mtmp.minvis && !(suppress & SUPPRESS_INVISIBLE);
    const do_it = !canspotmon(mtmp) && article !== ARTICLE_YOUR
            && !game.program_state?.gameover && mtmp !== u.usteed
            && !engulfing_u(mtmp) && !(suppress & SUPPRESS_IT);
    const do_saddle = !(suppress & SUPPRESS_SADDLE);
    const do_mappear = mappear_as_mon && !(suppress & SUPPRESS_MAPPEARANCE);
    const do_exact = (suppress & EXACT_NAME) === EXACT_NAME;
    const do_name = !(suppress & SUPPRESS_NAME) || type_is_pname(mdat);
    const augment_it = (suppress & AUGMENT_IT) !== 0;

    /* unseen monsters, etc.; usually "it" but sometimes more specific;
       when hallucinating, the more specific values might be inverted */
    if (do_it) {
        /* !is_animal excludes all Y; !mindless excludes Z, M, \' */
        const s_one = humanoid(mdat) && !is_animal(mdat) && !mindless(mdat);

        return !augment_it ? "it"
               : (!do_hallu ? s_one : !rn2(2)) ? "someone"
                 : "something";
    }

    /* priests and minions: don't even use this function */
    if ((mtmp.ispriest || mtmp.isminion) && !do_mappear) {
        let name;
        const hres = (u.uprops[HALLUC_RES] ||= { intrinsic: 0, extrinsic: 0 });
        const save_prop = hres.extrinsic;
        const save_invis = mtmp.minvis;

        /* when true name is wanted, explicitly block Hallucination */
        if (!do_hallu)
            hres.extrinsic = 1;
        if (!do_invis)
            mtmp.minvis = 0;
        /* EXACT_NAME will force "of <deity>" on the Astral Plane */
        name = priestname(mtmp, article, do_exact);
        hres.extrinsic = save_prop;
        mtmp.minvis = save_invis;
        if (article === ARTICLE_NONE && name.startsWith("the "))
            name = name.slice(4);
        return name;
    }

    /* 'pm_name' is the base part of most names */
    if (do_mappear) {
        /*assert(ismnum(mtmp->mappearance));*/
        pm_name = pmname(mons[mtmp.mappearance], Mgender(mtmp));
    } else {
        pm_name = mon_pmname(mtmp);
    }

    /* Shopkeepers: use shopkeeper name.  For normal shopkeepers, just
     * "Asidonhopo"; for unusual ones, "Asidonhopo the invisible
     * shopkeeper" or "Asidonhopo the blue dragon".  If hallucinating,
     * none of this applies.
     */
    if (mtmp.isshk && !do_hallu && !do_mappear) {
        if (adjective && article === ARTICLE_THE) {
            /* pathological case: "the angry Asidonhopo the blue dragon"
               sounds silly */
            buf = "the ";
            buf += adjective + " ";
            buf += shkname(mtmp);
        } else {
            buf += shkname(mtmp);
            if (mdat !== mons[PM_SHOPKEEPER] || do_invis) {
                buf += " the ";
                if (do_invis)
                    buf += "invisible ";
                buf += pm_name;
            }
        }
        return buf;
    }

    /* Put the adjectives in the buffer */
    if (adjective)
        buf += adjective + " ";
    if (do_invis)
        buf += "invisible ";
    /* Blind: only the BLINDED property is checked so far */
    if (do_saddle && ((mtmp.misc_worn_check ?? 0) & W_SADDLE)
        && !uhave(BLINDED) && !Hallucination())
        buf += "saddled ";
    has_adjectives = (buf !== '');

    /* Put the actual monster name or type into the buffer now.
       Remember whether the buffer starts with a personal name. */
    if (do_hallu) {
        const rnamecode = { c: '' };
        const rname = rndmonnam(rnamecode);

        buf += rname;
        name_at_start = bogon_is_pname(rnamecode.c);
    } else if (do_name && has_mgivenname(mtmp)) {
        const name = mtmp.mgivenname;
        let bp;

        if (mdat === mons[PM_GHOST]) {
            buf += `${s_suffix(name)} ghost`;
            name_at_start = true;
        } else if (called) {
            buf += `${pm_name} called ${name}`;
            name_at_start = type_is_pname(mdat);
        } else if (is_mplayer(mdat)
                   && (bp = name.toLowerCase().indexOf(" the ")) >= 0) {
            /* <name> the <adjective> <invisible> <saddled> <rank> */
            let pbuf = name.slice(0, bp + 5); /* adjectives right after " the " */
            if (has_adjectives)
                pbuf += buf;
            pbuf += name.slice(bp + 5); /* append the rest of the name */
            buf = pbuf;
            article = ARTICLE_NONE;
            name_at_start = true;
        } else {
            buf += name;
            name_at_start = true;
        }
    } else if (is_mplayer(mdat) && !In_endgame(u.uz)) {
        const pbuf = rank_of(mtmp.m_lev, mons.indexOf(mdat), !!mtmp.female);
        buf += pbuf.toLowerCase(); /* lcase() */
        name_at_start = false;
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

// C ref: do_name.c l_monnam()
export function l_monnam(mtmp) {
    return x_monnam(mtmp, ARTICLE_NONE, null,
                    has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0, true);
}

// C ref: do_name.c some_mon_nam()
/* in between noit_mon_nam() and mon_nam(); if the latter would pick "it",
   use "someone" (for humanoids) or "something" (for others) instead */
export function some_mon_nam(mtmp) {
    return x_monnam(mtmp, ARTICLE_THE, null,
                    has_mgivenname(mtmp) ? (SUPPRESS_SADDLE | AUGMENT_IT)
                                         : AUGMENT_IT,
                    false);
}

// C ref: do_name.c Some_Monnam()
export function Some_Monnam(mtmp) {
    const bp = some_mon_nam(mtmp);
    return highc(bp[0]) + bp.slice(1);
}

// C ref: do_name.c noname_monnam()
/* return "a dog" rather than "Fido", honoring hallucination and visibility */
export function noname_monnam(mtmp, article) {
    return x_monnam(mtmp, article, null, SUPPRESS_NAME, false);
}

// C ref: do_name.c Adjmonnam()
export function Adjmonnam(mtmp, adj) {
    const bp = x_monnam(mtmp, ARTICLE_THE, adj,
                        has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0, false);
    return highc(bp[0]) + bp.slice(1);
}

// C ref: do_name.c distant_monnam()
/* used for monster ID by the '/', ';', and 'C' commands to block remote
   identification of the endgame altars via their attending priests */
export function distant_monnam(mon,
                               article) /* only ARTICLE_NONE and ARTICLE_THE
                                           are handled here */ {
    let outbuf;

    /* high priest(ess)'s identity is concealed on the Astral Plane,
       unless you're adjacent (overridden for hallucination which does
       its own obfuscation) */
    if (mon.data === mons[PM_HIGH_CLERIC] && !Hallucination()
        && Is_astralevel(game.u.uz) && !m_next2u(mon)) {
        outbuf = article === ARTICLE_THE ? "the " : "";
        outbuf += mon.female ? "high priestess" : "high priest";
    } else {
        outbuf = x_monnam(mon, article, null, 0, true);
    }
    return outbuf;
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

// C ref: do_name.c monverbself()
/* construct "<monnamtext> <verb> <othertext> {him|her|it}self" which might
   be distorted by Hallu; if that's plural, adjust monnamtext and verb */
export function monverbself(mon, monnamtext, verb, othertext) {
    /* "himself"/"herself"/"itself", maybe "themselves" if hallucinating */
    const selfbuf = mon_nam_too(mon, mon);
    /* verb starts plural; this will yield singular except for "themselves" */
    const verbs = vtense(selfbuf, verb);
    if (verb === verbs) { /* a match indicates that it stayed plural */
        monnamtext = makeplural(monnamtext);
        /* for "it", makeplural() produces "them" but we want "they" */
        if (monnamtext.toLowerCase() === genders[3].he.toLowerCase()) {
            const capitaliz = (monnamtext[0] === highc(monnamtext[0]));

            monnamtext = genders[3].him;
            if (capitaliz)
                monnamtext = highc(monnamtext[0]) + monnamtext.slice(1);
        }
    }
    monnamtext += " " + verbs;
    if (othertext)
        monnamtext += " " + othertext;
    monnamtext += " " + selfbuf;
    return monnamtext;
}

// C ref: do_name.c hcolors[]
const hcolors = [
    "ultraviolet", "infrared", "bluish-orange", "reddish-green", "dark white",
    "light black", "sky blue-pink", "pinkish-cyan", "indigo-chartreuse",
    "salty", "sweet", "sour", "bitter", "umami", /* basic tastes */
    "striped", "spiral", "swirly", "plaid", "checkered", "argyle", "paisley",
    "blotchy", "guernsey-spotted", "polka-dotted", "square", "round",
    "triangular", "cabernet", "sangria", "fuchsia", "wisteria", "lemon-lime",
    "strawberry-banana", "peppermint", "romantic", "incandescent",
    "octarine", /* Discworld: the Colour of Magic */
    "excitingly dull", "mauve", "electric",
    "neon", "fluorescent", "phosphorescent", "translucent", "opaque",
    "psychedelic", "iridescent", "rainbow-colored", "polychromatic",
    "colorless", "colorless green",
    "dancing", "singing", "loving", "loudy", "noisy", "clattery", "silent",
    "apocyan", "infra-pink", "opalescent", "violant", "tuneless",
    "viridian", "aureolin", "cinnabar", "purpurin", "gamboge", "madder",
    "bistre", "ecru", "fulvous", "tekhelet", "selective yellow",
];

// C ref: do_name.c hcolor()
export function hcolor(colorpref) {
    return (Hallucination_dn() || !colorpref)
        ? hcolors[rn2_on_display_rng(hcolors.length)]
        : colorpref;
}

/* C ref: youprop.h Hallucination */
function Hallucination_dn() {
    const p = game.u.uprops;
    return !!(p[HALLUC_DN].intrinsic
              && !(p[HALLUC_RES_DN].intrinsic || p[HALLUC_RES_DN].extrinsic));
}
import { HALLUC as HALLUC_DN, HALLUC_RES as HALLUC_RES_DN } from './const.js';
