// do_name.js — naming things.
// C ref: src/do_name.c
//
// rndghostname() and the common path of x_monnam(). It DRAWS twice on the common path and makemon()
// calls it for every PM_GHOST, which the "Ghost of an Adventurer" themeroom
// creates, so skipping it left two calls unspent in the middle of level
// generation.

import { tty_create_nhwindow, tty_start_menu, tty_add_menu, tty_end_menu,
         tty_select_menu, tty_destroy_nhwindow } from './tty/wintty.js';
import { docrt } from './display.js';
import { discover_object } from './o_init.js';
import { an, xname } from './objnam.js';
import { NHW_MENU, MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE,
         PICK_ONE, ECMD_OK } from './const.js';
import { ATR_NONE, NO_COLOR } from './terminal.js';
import { game } from './gstate.js';
import { rn2, rn2_on_display_rng } from './rng.js';
import { Hallucination } from './youprop.js';
import { PMNAMES, MFLAGS } from './monst_data.js';
import { ARTICLE_NONE, ARTICLE_THE, ARTICLE_A, ARTICLE_YOUR,
         M_AP_TYPE, M_AP_MONSTER, PRONOUN_HALLU,
         SUPPRESS_SADDLE, SUPPRESS_IT, SUPPRESS_INVISIBLE,
         SUPPRESS_HALLUCINATION, MD_PAD_BOGONS,
         has_mgivenname, MGIVENNAME, W_SADDLE } from './const.js';
import { humanoid, is_animal, mindless, pronoun_gender, type_is_pname } from './mondata.js';
import { canspotmon } from './display.js';
import { ONAME_SKIP_INVUPD } from './const.js';
import { exist_artifact, artifact_exists } from './artifact.js';
import { carried } from './obj.js';
import { update_inventory } from './invent.js';
import { get_rnd_text } from './rumors.js';

// src/do_name.c:759 ghostnames[] — 34 entries.
const ghostnames = [
    'Adri', 'Andries', 'Andreas', 'Bert', 'David', 'Dirk',
    'Emile', 'Frans', 'Fred', 'Greg', 'Hether', 'Jay',
    'John', 'Jon', 'Karnov', 'Kay', 'Kenny', 'Kevin',
    'Maud', 'Michiel', 'Mike', 'Peter', 'Robert', 'Ron',
    'Tom', 'Wilmar', 'Nick Danger', 'Phoenix', 'Jiro', 'Mizue',
    'Stephan', 'Lance Braccus', 'Shadowhawk', 'Murphy',
];

// src/do_name.c:772 rndghostname()
//
//     return rn2(7) ? ROLL_FROM(ghostnames) : (const char *) svp.plname;
//
// Six times in seven a name is rolled from the table, which is a SECOND draw,
// rn2(34); the seventh time the ghost wears the hero's own name and no second
// draw happens. ROLL_FROM is include/hack.h:1493, array[rn2(SIZE(array))].
export function rndghostname() {
    return rn2(7) ? ghostnames[rn2(ghostnames.length)] : game.plname;
}

// src/do_name.c:1389 rndmonnam(), choose a display-only hallucinated monster
// name. Real monsters use a second display-RNG draw for gender. Bogus names
// use the same random byte-offset lookup as C's BOGUSMONFILE.
function rndmonnam_with_code() {
    const special = PMNAMES.SPECIAL_PM;
    let name;

    do {
        name = rn2_on_display_rng(special + 100);
    } while (name < special
             && (type_is_pname(game.mons[name])
                 || (game.mons[name].geno & MFLAGS.G_NOGEN)));

    if (name >= special) {
        let bogus = get_rnd_text('bogusmon', rn2_on_display_rng,
                                 MD_PAD_BOGONS) || 'bogon';
        let code = '';
        if ('-_+|='.includes(bogus[0])) {
            code = bogus[0];
            bogus = bogus.slice(1);
        }
        return {
            name: bogus,
            name_at_start: code !== '' && '-+='.includes(code),
        };
    }
    return {
        name: pmname(game.mons[name], rn2_on_display_rng(2)),
        name_at_start: false,
    };
}

export function rndmonnam() {
    return rndmonnam_with_code().name;
}

// src/mondata.h pmname() — pick from pmnames[male, female, neutral]. The
// neutral form is index 2 and is the fallback when a gendered entry is null.
export function pmname(ptr, gender) {
    const n = ptr?.pmnames;
    if (!n) return '';
    return n[gender] || n[2] || n[0] || '';
}

// src/do_name.c:827 x_monnam() — build a monster's name.
//
// 205 lines in C with 396 call sites; this is its COMMON PATH only. Ported:
// the hero ("you"), the ARTICLE_YOUR downgrade, the plain permonst name, an
// optional adjective, and the final article prefix.
//
// Recorded and NOT ported: hallucination, invisibility ("invisible foo"),
// saddled steeds, mimic appearances, priests and minions (C routes those to
// priestname entirely), shopkeeper naming, given names via has_mgivenname,
// the unseen-monster "it" arm (needs canspotmon), and the G_UNIQ promotion
// of ARTICLE_A to ARTICLE_THE.
//
// The ARTICLE_YOUR downgrade is the arm that must not be skipped: C turns
// ARTICLE_YOUR into ARTICLE_THE for any monster that is NOT tame, so a
// peaceful-but-untamed monster reads "the jackal" and never "your jackal".
// The pet-swap message depends on the opposite case surviving -- a tame
// monster keeps ARTICLE_YOUR and prints "your little dog".
export function x_monnam(mtmp, article, adjective, suppress, called) {
    if (mtmp === game.youmonst)
        return 'you';               /* ignores article, "invisible", &c */

    if (article === ARTICLE_YOUR && !mtmp.mtame)
        article = ARTICLE_THE;

    const is_engulfer = game.u.uswallow && game.u.ustuck === mtmp;
    if (is_engulfer) {
        article = ARTICLE_THE;
        suppress = (suppress || 0) | SUPPRESS_INVISIBLE;
    }

    const do_hallu = Hallucination()
        && !((suppress || 0) & SUPPRESS_HALLUCINATION);

    const mdat = game.mons[mtmp.mnum];
    /* src/do_name.c mon_pmname(), ordinary monster names use Mgender(),
       with pmname() falling back to the neutral slot when that sex has no
       distinct spelling. The sex is already settled by makemon(). */
    const pm_name = pmname(mdat, mtmp.female ? 1 : 0);

    if (mtmp.ispriest || mtmp.isminion)
        note_do_name_unported('x_monnam:priestname');
    if (M_AP_TYPE(mtmp) === M_AP_MONSTER)
        note_do_name_unported('x_monnam:mappearance');
    if (mtmp.isshk && !Hallucination() && !M_AP_TYPE(mtmp)) {
        const raw = mtmp.shknam || mtmp.eshk?.shknam
            || mtmp.mextra?.eshk?.shknam;
        if (raw) {
            const shkname = /^[-+_|]/.test(raw) ? raw.slice(1) : raw;
            if (mtmp.data === game.mons[PMNAMES.PM_SHOPKEEPER]
                && !mtmp.minvis)
                return shkname;
            note_do_name_unported('x_monnam:unusual_shopkeeper');
        } else {
            note_do_name_unported('x_monnam:shkname');
        }
    }
    if (mtmp.minvis)
        note_do_name_unported('x_monnam:invisible');
    /* src/do_name.c:875 — unseen monsters read as "it". do_it is guarded on
       ARTICLE_YOUR too, so a pet is still named even when unseen, and on
       usteed and engulfer for the same reason. SUPPRESS_IT and AUGMENT_IT
       are not modelled, so augment_it is false and the "someone"/"something"
       arm cannot fire -- that arm's rn2(2) under Hallucination is therefore
       not spent, which matches C only while Hallucination is unported. */
    const do_it = !canspotmon(mtmp) && article !== ARTICLE_YOUR
                  && mtmp !== game.u.usteed && !is_engulfer
                  && !((suppress || 0) & SUPPRESS_IT);
    if (do_it) {
        note_do_name_unported('x_monnam:augment_it');
        return 'it';
    }

    /* Put the adjectives in the buffer; the invisible state is recorded
       above. src/do_name.c:943 — "saddled" is appended for a steed wearing
       its saddle unless SUPPRESS_SADDLE, Blind or Hallucination. */
    let buf = adjective ? adjective + ' ' : '';
    const do_saddle = !((suppress || 0) & SUPPRESS_SADDLE);
    if (do_saddle && ((mtmp.misc_worn_check || 0) & W_SADDLE)
        && !game.u.ublind && !game.u.uprops?.HALLUC)
        buf += 'saddled ';
    const has_adjectives = buf !== '';

    /* src/do_name.c:930 — the actual name or type. A given name replaces
       the species and, standing alone, suppresses the article entirely:
       "You swap places with Hachi.", never "your Hachi". */
    let name_at_start;
    if (do_hallu) {
        const hallu_name = rndmonnam_with_code();
        buf += hallu_name.name;
        name_at_start = hallu_name.name_at_start;
    } else if (has_mgivenname(mtmp)) {
        const name = MGIVENNAME(mtmp);
        if (mtmp.mnum === PMNAMES.PM_GHOST) {
            buf += `${name}'s ghost`;
            name_at_start = true;
        } else if (called) {
            buf += `${pm_name} called ${name}`;
            name_at_start = type_is_pname(mdat);
        } else {
            /* the mplayer "<name> the <rank>" arm needs is_mplayer */
            buf += name;
            name_at_start = true;
        }
    } else {
        buf += pm_name;
        name_at_start = type_is_pname(mdat);
    }

    if (name_at_start && (article === ARTICLE_YOUR || !has_adjectives)) {
        article = (mtmp.mnum === PMNAMES.PM_WIZARD_OF_YENDOR)
                  ? ARTICLE_THE : ARTICLE_NONE;
    } else if ((mdat.geno & MFLAGS.G_UNIQ) !== 0 && article === ARTICLE_A) {
        article = ARTICLE_THE;
    }

    switch (article) {
    case ARTICLE_YOUR: return 'your ' + buf;
    case ARTICLE_THE:  return 'the ' + buf;
    case ARTICLE_A:    return just_an(buf);
    case ARTICLE_NONE:
    default:           return buf;
    }
}

// src/objnam.c just_an() — "a " or "an ". C also handles a leading vowel that
// sounds like a consonant and single letters; only the vowel rule is here.
function just_an(str) {
    if (!str) return str;
    note_do_name_unported('just_an:special_cases');
    return ('aeiou'.includes(str[0].toLowerCase()) ? 'an ' : 'a ') + str;
}

// src/do_name.c:1152 a_monnam() — ARTICLE_A.
// The SUPPRESS_SADDLE when the monster has a given name is not decoration:
// x_monnam appends "saddled" otherwise, and a named steed would read
// "a saddled Fido" instead of "a Fido".
export const Amonnam = (mtmp) => upstart(a_monnam(mtmp));

export const a_monnam = (mtmp) =>
    x_monnam(mtmp, ARTICLE_A, null, has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0,
             false);

// src/do_name.c:1052 christen_monst() — give a monster its name.
// C stores it in mextra and truncates to PL_PSIZ-1 (31); the ghost rename
// arm (a christened ghost keeps "X's ghost" form) lives in x_monnam.
export function christen_monst(mtmp, name) {
    mtmp.mgivenname = String(name).slice(0, 31);
    return mtmp;
}

// src/do_name.c mon_nam() — ARTICLE_THE, no adjective.
export const mon_nam = (mtmp) =>
    x_monnam(mtmp, ARTICLE_THE, null,
             has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0, false);

// src/do_name.c:1117 y_monnam() — ARTICLE_YOUR, which x_monnam downgrades
// to THE for anything not tame. "saddled" is redundant when mounted, so the
// steed also suppresses it.
export const y_monnam = (mtmp) =>
    x_monnam(mtmp, mtmp.mtame ? ARTICLE_YOUR : ARTICLE_THE, null,
             (has_mgivenname(mtmp) || mtmp === game.u.usteed)
                 ? SUPPRESS_SADDLE : 0, false);

// src/do_name.c:1054 noit_mon_nam() — ARTICLE_YOUR with "it" suppressed, so
// an unseen pet still reads as "your kitten" rather than "it".
export const noit_mon_nam = (mtmp) =>
    x_monnam(mtmp, ARTICLE_YOUR, null,
             has_mgivenname(mtmp) ? (SUPPRESS_SADDLE | SUPPRESS_IT)
                                  : SUPPRESS_IT,
             false);

// src/do_name.c Monnam() / YMonnam() — the capitalised forms.
export const Monnam  = (mtmp) => upstart(mon_nam(mtmp));
export const YMonnam = (mtmp) => upstart(y_monnam(mtmp));
export const noit_Monnam = (mtmp) => upstart(noit_mon_nam(mtmp));

// src/do_name.c:1191 mon_nam_too() — name `mon`, except that when it IS
// `other_mon` the reflexive pronoun is used instead.
//
// This is what makes a monster-vs-monster message read "The jackal bites
// itself" rather than "The jackal bites the jackal". hitmm and missmm both
// pass the attacker as other_mon, so the case fires whenever a monster's
// attack lands on itself (confusion, a bounced ray).
//
// C allocates from nextmbuf(), a rotating static buffer, because two of these
// can be live in one pline() call; we return plain strings, so that machinery
// has no counterpart here.
//
// Note the pronoun_gender() call passes PRONOUN_HALLU, so this is an RNG draw
// while hallucinating.
export function mon_nam_too(mon, other_mon) {
    if (mon !== other_mon)
        return mon_nam(mon);

    switch (pronoun_gender(mon, PRONOUN_HALLU)) {
    case 0:
        return 'himself';
    case 1:
        return 'herself';
    case 3: /* could happen when hallucinating */
        return 'themselves';
    default:
    case 2:
        return 'itself';
    }
}

// src/hacklib.c upstart() — capitalise the first letter.
export function upstart(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

function note_do_name_unported(what) {
    (game.unported ||= new Set()).add('do_name:' + what);
    return false;
}

function note_unported_do_name(what) {
    (game.unported ||= new Set()).add('do_name:' + what);
}

// src/do_name.c:61 new_oname() — allocate space for an object's name;
// removes old name if there is one. JS keeps the name as obj.oname, so
// allocation reduces to clearing the old value.
export function new_oname(obj, lth) {
    if (lth) {
        ;   /* ONAME(obj) storage; assigned by the caller */
    } else {
        /* zero length: the new name is empty; get rid of the old name */
        if (obj.oname != null)
            delete obj.oname;
    }
}

// include/global.h:404 PL_PSIZ
const PL_PSIZ = 63;

// src/do_name.c:372 oname() — assign a name to an object, creating the
// artifact when the name matches one whose base type fits.
export function oname(obj, name, oflgs) {
    const skip_inv_update = (oflgs & ONAME_SKIP_INVUPD) !== 0;

    let lth = name ? name.length + 1 : 0;
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

    new_oname(obj, lth); /* removes old name if one is present */
    if (lth)
        obj.oname = name;

    if (lth)
        artifact_exists(obj, name, true, oflgs);
    if (obj.oartifact) {
        /* can't dual-wield with artifact as secondary weapon */
        if (obj === game.uswapwep)
            note_unported_do_name('oname:untwoweapon');
        /* activate warning if you've just named your weapon "Sting" */
        if (obj === game.uwep)
            note_unported_do_name('oname:set_artifact_intrinsic');
        /* if obj is owned by a shop, increase your bill */
        if (obj.unpaid)
            note_unported_do_name('oname:alter_cost');
        /* ONAME_VIA_NAMING literacy conduct + livelog are out-of-band */
    }
    if (carried(obj) && !skip_inv_update)
        update_inventory();
    return obj;
}

// src/do_name.c:499 docallcmd() — the #call / #name command: player can name a
// monster, an object, or a type of object.
//
// The menu and the cancel path are complete. Every switch arm's worker
// (do_mgivenname, do_oname via getobj, docall, namefloorobj, rename_disco,
// donamelevel) is unported and recorded, so picking one records and returns.
// C's cmdq_pop arm services a queued key from a scripted command; this port
// has no queue producer yet, which in C is the empty-queue fallthrough, so no
// marker fires for it.
export async function docallcmd() {
    let ch = 0;
    /* if player wants a,b,c instead of i,o when looting, do that here too */
    const abc = !!game.flags.lootabc;

    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    tty_add_menu(win, null, 'm', abc ? 0 : 'm', 'C',
                 ATR_NONE, NO_COLOR, "a monster", MENU_ITEMFLAGS_NONE);
    if ((game.invent || []).length) {
        /* we use y and n as accelerators so that we can accept user's
           response keyed to old "name an individual object?" prompt */
        tty_add_menu(win, null, 'i', abc ? 0 : 'i', 'y',
                     ATR_NONE, NO_COLOR, "a particular object in inventory",
                     MENU_ITEMFLAGS_NONE);
        tty_add_menu(win, null, 'o', abc ? 0 : 'o', 'n',
                     ATR_NONE, NO_COLOR, "the type of an object in inventory",
                     MENU_ITEMFLAGS_NONE);
    }
    tty_add_menu(win, null, 'f', abc ? 0 : 'f', ',',
                 ATR_NONE, NO_COLOR, "the type of an object upon the floor",
                 MENU_ITEMFLAGS_NONE);
    tty_add_menu(win, null, 'd', abc ? 0 : 'd', '\\',
                 ATR_NONE, NO_COLOR, "the type of an object on discoveries list",
                 MENU_ITEMFLAGS_NONE);
    tty_add_menu(win, null, 'a', abc ? 0 : 'a', 'l',
                 ATR_NONE, NO_COLOR, "record an annotation for the current level",
                 MENU_ITEMFLAGS_NONE);
    tty_end_menu(win, "What do you want to name?");
    const picks = await tty_select_menu(win, PICK_ONE);
    ch = picks.length > 0 ? picks[0] : 'q';
    tty_destroy_nhwindow(win);
    await docrt(); /* restore the map underneath, as the show_* callers do */

    switch (ch) {
    default:
    case 'q':
        break;
    case 'm': /* name a visible monster */
        note_unported_do_name('docallcmd:do_mgivenname');
        break;
    case 'i': /* name an individual object in inventory */
        note_unported_do_name('docallcmd:do_oname');
        break;
    case 'o': /* name a type of object in inventory */
        note_unported_do_name('docallcmd:docall');
        break;
    case 'f': /* name a type of object visible on the floor */
        note_unported_do_name('docallcmd:namefloorobj');
        break;
    case 'd': /* name a type of object on the discoveries list */
        note_unported_do_name('docallcmd:rename_disco');
        break;
    case 'a': /* annotate level */
        note_unported_do_name('docallcmd:donamelevel');
        break;
    }
    return ECMD_OK;
}

// src/do_name.c:636 docall() — "Call a <object>:" after using an unidentified
// item. The name is stored on the object TYPE (objects[otyp].oc_uname), so it
// shows on every future one of that kind.
//
// The sink-water kludge (obj->fromsink) and the EDIT_GETLIN default response
// are not reached by anything ported.
export async function docall(obj) {
    if (!obj.dknown)
        return; /* probably blind */

    /* safe_qbuf(qbuf, "Call ", ":", obj, docall_xname, simpleonames, "thing")
       — docall_xname() strips quantity and BUC so the prompt names the TYPE,
       not this particular item. */
    const qbuf = `Call ${docall_xname(obj)}:`;
    const { getlin } = await import('./cmd.js');
    const buf = await getlin(qbuf);
    if (buf === null || buf === '' || buf === '\x1b')
        return;

    const oc = game.objects[obj.otyp];
    const had_name = !!oc.oc_uname;
    /* mungspaces(): all-spaces uncalls the item */
    const name = buf.trim().replace(/\s+/g, ' ');
    if (!name) {
        if (had_name) {
            oc.oc_uname = null;
            note_undiscover(obj.otyp);
        }
    } else {
        oc.oc_uname = name;
        discover_object(obj.otyp, false, true, true);
    }
}

/* src/do_name.c docall_xname() — the object named as its type: one of them,
   no blessed/cursed prefix. */
function docall_xname(obj) {
    const otemp = { ...obj, quan: 1, blessed: 0, cursed: 0, oextra: null };
    return an(xname(otemp));
}

// src/do.c:395 trycall() — offer to name a type the hero has just used and
// still cannot identify.
export async function trycall(obj) {
    const oc = game.objects[obj.otyp];
    if (!oc.oc_name_known && !oc.oc_uname)
        await docall(obj);
}

/* src/o_init.c undiscover_object() — drop a type from the discoveries list
   when its player-given name is cleared. Not ported; recorded. */
function note_undiscover(otyp) {
    (game.unported ||= new Set()).add('do_name:undiscover_object');
}

/* src/do_name.c:1441 hcolors[] — the hallucinatory colour list. */
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

// src/do_name.c:1460 hcolor() — `colorpref`, or a hallucinatory colour.
//
// The draw goes to the DISPLAY rng, not the core one, so this costs no scored
// draw however often it is called. Hallucination is the full macro
// (intrinsic OR extrinsic), the same convention botl.js uses.
export function hcolor(colorpref) {
    const Hallucination = game.u?.intrinsic?.HHallucination
                          || game.u?.uprops?.HALLUC;
    return (Hallucination || !colorpref)
        ? hcolors[rn2_on_display_rng(hcolors.length)]
        : colorpref;
}

/* src/do_name.c:1478 hliquids[] */
const hliquids = [
    "yoghurt", "oobleck", "clotted blood", "diluted water", "purified water",
    "instant coffee", "tea", "herbal infusion", "liquid rainbow",
    "creamy foam", "mulled wine", "bouillon", "nectar", "grog", "flubber",
    "ketchup", "slow light", "oil", "vinaigrette", "liquid crystal", "honey",
    "caramel sauce", "ink", "aqueous humour", "milk substitute",
    "fruit juice", "glowing lava", "gastric acid", "mineral water",
    "cough syrup", "quicksilver", "sweet vitriol", "grey goo", "pink slime",
    "cosmic latte", "bone oil", "custard", "lard", "vinegar", "creosote",
];

// src/do_name.c:1493 hliquid() — a random liquid when hallucinating.
// The index comes from the DISPLAY rng, not the game stream.
export function hliquid(liquidpref) {
    const hallucinate = Hallucination() && !game.program_state_gameover;

    if (hallucinate || !liquidpref) {
        let count = hliquids.length;
        if (liquidpref)
            ++count;
        const indx = rn2_on_display_rng(count);
        if (indx >= 0 && indx < hliquids.length)
            return hliquids[indx];
    }
    return liquidpref;
}

// src/do_name.c:1591 — Discworld novel titles, in publication order.
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
    "Raising Steam", "The Shepherd's Crown",
];

// src/do_name.c:1611 noveltitle() — the rn2 over the title table fires even
// when a fixed novidx overrides the pick. `box` stands in for C's int*: pass
// { idx } and read the possibly-updated idx back.
export function noveltitle(box) {
    const k = sir_Terry_novels.length;
    let j = rn2(k);
    if (box) {
        if (box.idx === -1)
            box.idx = j;
        else if (box.idx >= 0 && box.idx < k)
            j = box.idx;
    }
    return sir_Terry_novels[j];
}
